import importlib.util
import json
import os
import sqlite3
import sys
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from urllib.parse import urlsplit


PROJECT = Path(__file__).resolve().parents[1]
LAB_ROOT = PROJECT.parent
TARGET = os.environ.get("CRAWL_TARGET", "solution")
MODULE_PATH = PROJECT / f"{TARGET}.py"

sys.path.insert(0, str(LAB_ROOT))
from common.fake_clock import FakeClock
from common.fake_transport import FakeTransport

spec = importlib.util.spec_from_file_location(f"project02_{TARGET}", MODULE_PATH)
project = importlib.util.module_from_spec(spec)
spec.loader.exec_module(project)


class SimulatedCrash(RuntimeError):
    pass


class InterruptBeforeCursor:
    def __init__(self, inner, cursor: str):
        self.inner = inner
        self.cursor = cursor
        self.base_url = inner.base_url

    @property
    def calls(self):
        return self.inner.calls

    def get(self, url, headers=None, timeout=5.0):
        cursor = FakeTransport._cursor_from_url(url)
        if cursor == self.cursor:
            raise SimulatedCrash("synthetic process interruption")
        return self.inner.get(url, headers=headers, timeout=timeout)


class AlwaysUnavailable:
    def __init__(self, inner):
        self.inner = inner
        self.base_url = inner.base_url
        self.calls = inner.calls

    def get(self, url, headers=None, timeout=5.0):
        from common.fake_transport import Response

        cursor = FakeTransport._cursor_from_url(url)
        if cursor != "p3":
            return self.inner.get(url, headers=headers, timeout=timeout)
        return Response(
            status=503,
            headers={"Retry-After": "1"},
            body=json.dumps({"error": "temporarily_unavailable"}),
            url=url,
        )


class Project02Tests(unittest.TestCase):
    def setUp(self):
        self.fixture = PROJECT / "fixtures" / "pages.json"
        self.temp = tempfile.TemporaryDirectory()
        self.db = Path(self.temp.name) / "crawl.sqlite3"

    def tearDown(self):
        self.temp.cleanup()

    def make_transport(self, **kwargs):
        return FakeTransport(self.fixture, **kwargs)

    def row_count(self):
        with closing(sqlite3.connect(self.db)) as connection:
            return connection.execute("SELECT COUNT(*) FROM items").fetchone()[0]

    def checkpoint(self):
        with closing(sqlite3.connect(self.db)) as connection:
            connection.row_factory = sqlite3.Row
            row = connection.execute(
                "SELECT cursor, completed, request_count FROM checkpoints"
            ).fetchone()
        return dict(row)

    def test_baseline_decodes_four_pages_and_reports_retry(self):
        transport = self.make_transport()
        clock = FakeClock()
        report = project.run(transport, self.db, clock)

        self.assertEqual(report["status"], "complete")
        self.assertEqual(report["requests"], 5)
        self.assertEqual(report["retries"], 1)
        self.assertEqual(report["rate_wait"], 2.0)
        self.assertEqual(clock.sleeps, [2.0])
        self.assertEqual(report["pages_committed"], 4)
        self.assertEqual(report["rows_seen"], 12)
        self.assertEqual(report["rows_written"], 10)
        self.assertEqual(report["duplicate_skus"], 1)
        self.assertEqual(report["invalid_rows"], 1)
        self.assertIsNone(report["final_cursor"])
        self.assertEqual(report["completed"], 4)
        self.assertEqual(transport.request_count, 5)
        self.assertEqual(transport.calls[2]["headers"]["Accept"], "application/json")
        self.assertEqual(self.row_count(), 10)

    def test_first_page_then_resume_does_not_refetch_committed_pages(self):
        first_transport = InterruptBeforeCursor(self.make_transport(), "p4")
        first_clock = FakeClock()
        with self.assertRaises(SimulatedCrash):
            project.run(first_transport, self.db, first_clock)

        self.assertEqual(self.checkpoint()["cursor"], "p4")
        self.assertEqual(self.checkpoint()["completed"], 3)
        self.assertEqual(self.row_count(), 7)
        self.assertNotIn("p4", [call["cursor"] for call in first_transport.calls])

        resume_transport = self.make_transport()
        resume_clock = FakeClock()
        report = project.run(resume_transport, self.db, resume_clock)

        self.assertEqual(report["status"], "complete")
        self.assertEqual(report["requests"], 1)
        self.assertEqual(report["pages_committed"], 4)
        self.assertEqual(report["rows_seen"], 3)
        self.assertEqual(report["rows_written"], 10)
        self.assertEqual(report["completed"], 4)
        self.assertEqual([call["cursor"] for call in resume_transport.calls], ["p4"])
        self.assertEqual(resume_clock.sleeps, [])
        self.assertEqual(self.row_count(), 10)

    def test_second_run_is_idempotent_and_makes_no_request(self):
        first = self.make_transport()
        project.run(first, self.db, FakeClock())

        second = self.make_transport()
        report = project.run(second, self.db, FakeClock())

        self.assertEqual(report["status"], "already_complete")
        self.assertEqual(report["requests"], 0)
        self.assertEqual(report["rows_written"], 10)
        self.assertEqual(report["completed"], 4)
        self.assertEqual(second.request_count, 0)
        self.assertEqual(self.row_count(), 10)
        self.assertEqual(self.checkpoint()["cursor"], None)

    def test_retry_budget_is_bounded_and_preserves_last_checkpoint(self):
        transport = AlwaysUnavailable(self.make_transport())
        clock = FakeClock()
        report = project.run(transport, self.db, clock)

        self.assertEqual(report["status"], "failed")
        self.assertEqual(report["requests"], 5)
        self.assertEqual(report["retries"], 2)
        self.assertEqual(report["rate_wait"], 2.0)
        self.assertEqual(clock.sleeps, [1.0, 1.0])
        self.assertEqual(report["completed"], 2)
        self.assertEqual(report["final_cursor"], "p3")
        self.assertEqual(report["rows_written"], 5)
        self.assertEqual(self.row_count(), 5)

    def test_decode_items_filters_malformed_rows_without_mutating_payload(self):
        payload = {
            "items": [
                {"sku": "B100", "title": "合成有效记录", "price_cents": 100},
                {"title": "缺少 SKU", "price_cents": 100},
                {"sku": "B101", "title": "价格类型错误", "price_cents": "100"},
            ],
            "next_cursor": None,
        }
        original = json.loads(json.dumps(payload))
        rows = project.decode_items(payload)
        self.assertEqual([row["sku"] for row in rows], ["B100"])
        self.assertEqual(payload, original)

    def test_upsert_keeps_one_row_for_duplicate_sku_and_newer_version(self):
        project.upsert_items(
            self.db,
            [{"sku": "B200", "title": "旧标题", "price_cents": 1, "version": 1}],
        )
        project.upsert_items(
            self.db,
            [{"sku": "B200", "title": "新标题", "price_cents": 2, "version": 2}],
        )
        project.upsert_items(
            self.db,
            [{"sku": "B200", "title": "迟到旧版本", "price_cents": 3, "version": 1}],
        )
        with closing(sqlite3.connect(self.db)) as connection:
            connection.row_factory = sqlite3.Row
            row = connection.execute(
                "SELECT payload_json, version FROM items WHERE item_key='B200'"
            ).fetchone()
        self.assertEqual(row["version"], 2)
        self.assertEqual(json.loads(row["payload_json"])["title"], "新标题")
        self.assertEqual(self.row_count(), 1)

    def test_unknown_cursor_is_bounded_failure_not_infinite_loop(self):
        class BrokenTransport:
            base_url = "https://local.test/api/books"

            def __init__(self):
                self.calls = []

            def get(self, url, headers=None, timeout=5.0):
                from common.fake_transport import Response

                self.calls.append(url)
                cursor = FakeTransport._cursor_from_url(url)
                return Response(
                    status=200,
                    headers={},
                    body=json.dumps(
                        {
                            "items": [],
                            "next_cursor": cursor or "loop",
                        }
                    ),
                    url=url,
                )

        transport = BrokenTransport()
        report = project.run(transport, self.db, FakeClock())
        self.assertEqual(report["status"], "failed")
        self.assertIn("cursor cycle", report["error"])
        self.assertEqual(len(transport.calls), 2)


if __name__ == "__main__":
    unittest.main()
