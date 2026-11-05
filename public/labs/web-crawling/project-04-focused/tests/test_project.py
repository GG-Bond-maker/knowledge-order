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

spec = importlib.util.spec_from_file_location(f"project04_{TARGET}", MODULE_PATH)
project = importlib.util.module_from_spec(spec)
spec.loader.exec_module(project)


class Response:
    def __init__(self, status, headers, body, url):
        self.status = status
        self.headers = headers
        self.body = json.dumps(body, ensure_ascii=False)
        self.url = url


class FocusedTransport:
    def __init__(self, fixture_path):
        self.fixture = json.loads(Path(fixture_path).read_text(encoding="utf-8"))
        self.calls = []
        self.attempts = {}

    def get(self, url, headers=None, timeout=5.0):
        self.calls.append(url)
        self.attempts[url] = self.attempts.get(url, 0) + 1
        faults = self.fixture.get("faults", {}).get(url, [])
        index = self.attempts[url] - 1
        if index < len(faults):
            fault = faults[index]
            return Response(fault["status"], fault.get("headers", {}), fault.get("body", {}), url)
        if url in self.fixture.get("permanent_failures", []):
            return Response(500, {}, {"error": "permanent"}, url)
        for origin, data in self.fixture["origins"].items():
            if url.startswith(origin):
                path = urlsplit(url).path
                page = data["pages"].get(path)
                if page:
                    return Response(200, {}, page, url)
        return Response(404, {}, {"error": "not_found"}, url)


class InterruptAfter:
    def __init__(self, inner, after=2):
        self.inner = inner
        self.after = after
        self.calls = inner.calls

    def get(self, url, headers=None, timeout=5.0):
        if len(self.inner.calls) >= self.after:
            raise RuntimeError("synthetic worker interruption")
        return self.inner.get(url, headers=headers, timeout=timeout)


class Project04Tests(unittest.TestCase):
    def setUp(self):
        self.fixture = PROJECT / "fixtures" / "pages.json"
        self.data = json.loads(self.fixture.read_text(encoding="utf-8"))
        self.temp = tempfile.TemporaryDirectory()
        self.db = Path(self.temp.name) / "focused.sqlite3"
        self.audit = Path(self.temp.name) / "audit.jsonl"
        self.config = {
            "origins": {
                origin: {
                    "allowed_prefix": item["allowed_prefix"],
                    "robots": item["robots"],
                }
                for origin, item in self.data["origins"].items()
            },
            "seed_urls": [f"{origin}/docs/" for origin in self.data["origins"]],
            "min_interval": 0.5,
            "max_retries": 2,
            "user_agent": "course-bot",
            "audit_path": str(self.audit),
        }

    def tearDown(self):
        self.temp.cleanup()

    def test_scope_and_robots_are_checked_before_transport(self):
        transport = FocusedTransport(self.fixture)
        report = project.run(transport, FakeClock(), self.config, self.db)
        self.assertEqual(report["robots_denied"], 1)
        self.assertGreaterEqual(report["out_of_scope"], 2)
        self.assertFalse(any("outside.invalid" in url for url in transport.calls))
        self.assertFalse(any("18099" in url for url in transport.calls))
        self.assertFalse(any("/private/" in url for url in transport.calls))
        self.assertFalse(any("/docs/blocked" in url for url in transport.calls))

    def test_per_host_intervals_and_retry_reports(self):
        transport = FocusedTransport(self.fixture)
        clock = FakeClock()
        report = project.run(transport, clock, self.config, self.db)
        self.assertEqual(report["fetched"], 8)
        self.assertEqual(report["dead_letter"], 1)
        self.assertGreaterEqual(report["retries"], 2)
        self.assertGreaterEqual(report["rate_wait"], 2.0)
        self.assertTrue(all(host.startswith("127.0.0.1:180") for host in report["per_host_requests"]))
        self.assertEqual(sum(report["per_host_requests"].values()), report["requests"])
        self.assertTrue(self.audit.exists())
        self.assertIn("fetched", self.audit.read_text(encoding="utf-8"))

    def test_restart_does_not_duplicate_completed_records(self):
        first = FocusedTransport(self.fixture)
        project.run(first, FakeClock(), self.config, self.db)
        before = self.row_count()
        second = FocusedTransport(self.fixture)
        project.run(second, FakeClock(), self.config, self.db)
        self.assertEqual(self.row_count(), before)
        self.assertEqual(second.calls, [])

    def test_interruption_then_resume_skips_committed_urls(self):
        first = InterruptAfter(FocusedTransport(self.fixture), after=2)
        with self.assertRaises(RuntimeError):
            project.run(first, FakeClock(), self.config, self.db)
        committed = self.row_count()
        self.assertGreaterEqual(committed, 1)
        committed_calls = set(first.calls)
        second = FocusedTransport(self.fixture)
        project.run(second, FakeClock(), self.config, self.db)
        self.assertEqual(self.row_count(), 8)
        self.assertFalse(any(url in committed_calls for url in second.calls))

    def test_canonicalization_and_robots_longest_match(self):
        url = project.canonicalize("../b1?utm_source=x#top", "https://a.test/docs/list")
        self.assertEqual(url, "https://a.test/b1")
        robots = "User-agent: *\nDisallow: /docs\nAllow: /docs/open\n"
        self.assertTrue(project.allowed_by_robots(robots, "https://a.test/docs/open/x", "course-bot"))
        self.assertFalse(project.allowed_by_robots(robots, "https://a.test/docs/private", "course-bot"))

    def row_count(self):
        with closing(sqlite3.connect(self.db)) as connection:
            return connection.execute("SELECT COUNT(*) FROM items").fetchone()[0]


if __name__ == "__main__":
    unittest.main()
