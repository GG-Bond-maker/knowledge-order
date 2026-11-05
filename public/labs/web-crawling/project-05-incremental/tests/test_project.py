import importlib.util
import json
import os
import sqlite3
import sys
import tempfile
import unittest
from contextlib import closing
from pathlib import Path


PROJECT = Path(__file__).resolve().parents[1]
LAB_ROOT = PROJECT.parent
TARGET = os.environ.get("CRAWL_TARGET", "solution")
MODULE_PATH = PROJECT / f"{TARGET}.py"

sys.path.insert(0, str(LAB_ROOT))
from common.fake_clock import FakeClock

spec = importlib.util.spec_from_file_location(f"project05_{TARGET}", MODULE_PATH)
project = importlib.util.module_from_spec(spec)
spec.loader.exec_module(project)


class SnapshotTransport:
    def __init__(self, fixture_path):
        self.fixture = json.loads(Path(fixture_path).read_text(encoding="utf-8"))
        self.calls = []
        self.clock = FakeClock()
        self.near_threshold = self.fixture["near_threshold"]
        self._retry_used = set()

    def entity_ids(self, snapshot_id):
        return list(self.fixture[snapshot_id]["entities"])

    def fetch(self, snapshot_id, entity_id):
        self.calls.append((snapshot_id, entity_id))
        response = dict(self.fixture[snapshot_id]["entities"][entity_id])
        if (
            snapshot_id == "T2"
            and entity_id == "E7"
            and ("T2", entity_id) not in self._retry_used
        ):
            self._retry_used.add(("T2", entity_id))
            return {
                "status": 503,
                "retry_after": 1,
                "title": None,
                "html": None,
                "source_url": f"https://local.test/{entity_id}",
            }
        response["source_url"] = f"https://local.test/{entity_id}"
        return response


class Project05Tests(unittest.TestCase):
    def setUp(self):
        self.fixture = PROJECT / "fixtures" / "snapshots.json"
        self.temp = tempfile.TemporaryDirectory()
        self.db = Path(self.temp.name) / "versions.sqlite3"

    def tearDown(self):
        self.temp.cleanup()

    def run_snapshot(self, snapshot_id, transport=None):
        transport = transport or SnapshotTransport(self.fixture)
        return project.run(transport, self.db, snapshot_id), transport

    def row_count(self, table="versions"):
        with closing(sqlite3.connect(self.db)) as connection:
            return connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]

    def test_t1_baseline_creates_six_versions(self):
        report, _ = self.run_snapshot("T1")
        self.assertEqual(report["new"], 6)
        self.assertEqual(report["versions_written"], 6)
        self.assertEqual(self.row_count(), 6)

    def test_t2_classifies_changes_and_conditional_hits(self):
        self.run_snapshot("T1")
        report, transport = self.run_snapshot("T2")
        self.assertEqual(report["new"], 1)
        self.assertEqual(report["changed"], 2)
        self.assertEqual(report["near_duplicate"], 1)
        self.assertEqual(report["unchanged"], 1)
        self.assertEqual(report["deleted"], 1)
        self.assertEqual(report["suspect_deleted"], 1)
        self.assertEqual(report["invalid"], 1)
        self.assertEqual(report["conditional_hits"], 1)
        self.assertEqual(report["retries"], 1)
        self.assertEqual(transport.calls.count(("T2", "E7")), 2)

    def test_t3_restores_gone_and_preserves_tombstone(self):
        self.run_snapshot("T1")
        self.run_snapshot("T2")
        report, _ = self.run_snapshot("T3")
        self.assertEqual(report["conditional_hits"], 2)
        self.assertEqual(report["deleted"], 1)
        self.assertEqual(report["restored"], 1)
        self.assertEqual(report["invalid"], 1)
        self.assertEqual(report["near_duplicate"], 1)
        with closing(sqlite3.connect(self.db)) as connection:
            gone = connection.execute(
                "SELECT COUNT(*) FROM versions WHERE entity_key='E6' AND status='gone'"
            ).fetchone()[0]
            restored = connection.execute(
                "SELECT COUNT(*) FROM versions WHERE entity_key='E6' AND change_type='restored'"
            ).fetchone()[0]
        self.assertEqual(gone, 1)
        self.assertEqual(restored, 1)

    def test_t3_rerun_is_idempotent(self):
        self.run_snapshot("T1")
        self.run_snapshot("T2")
        self.run_snapshot("T3")
        before = self.row_count()
        report, transport = self.run_snapshot("T3")
        self.assertEqual(report["versions_written"], 0)
        self.assertEqual(self.row_count(), before)
        self.assertEqual(report["requests"], 8)

    def test_compare_snapshots_handles_status_categories(self):
        previous = [{"id": "A", "content_hash": "a", "simhash": 1, "status": "active"}]
        current = [
            {"id": "A", "content_hash": "a", "simhash": 1, "status": 200, "schema_valid": True},
            {"id": "B", "content_hash": "b", "simhash": 2, "status": 200, "schema_valid": True},
            {"id": "C", "status": 410, "schema_valid": True},
            {"id": "D", "status": 404, "schema_valid": True},
            {"id": "E", "status": 200, "schema_valid": False},
        ]
        result = project.compare_snapshots(previous, current)
        self.assertEqual(result["unchanged"], 1)
        self.assertEqual(result["restored"], 0)
        self.assertEqual(result["deleted"], 1)
        self.assertEqual(result["suspect_deleted"], 1)
        self.assertEqual(result["invalid"], 1)
        self.assertEqual(result["new"], 1)

    def test_normalize_hash_and_hamming_are_deterministic(self):
        text = project.normalize_text("<h1>标题</h1><p>正文</p>")
        self.assertEqual(text, "标题正文")
        self.assertEqual(project.sha256_text(text), project.sha256_text(text))
        self.assertNotEqual(project.sha256_text(text), project.sha256_text("另一段"))
        self.assertEqual(project.hamming_distance(0b1010, 0b0011), 2)


if __name__ == "__main__":
    unittest.main()
