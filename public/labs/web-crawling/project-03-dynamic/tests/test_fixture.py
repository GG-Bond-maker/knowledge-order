import sys
import threading
import unittest
import urllib.request
from pathlib import Path


PROJECT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT))

from fixture_server import create_server


class FixtureServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = create_server(0)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def fetch(self, path: str) -> tuple[int, str]:
        with urllib.request.urlopen(self.base + path, timeout=2) as response:
            return response.status, response.read().decode("utf-8")

    def test_shell_is_served_on_root(self):
        status, body = self.fetch("/")
        self.assertEqual(status, 200)
        self.assertIn('data-app-state="loading"', body)
        self.assertIn('data-role="item-list"', body)
        self.assertNotIn("http://", body)

    def test_app_script_contains_deterministic_batches(self):
        status, body = self.fetch("/app.js")
        self.assertEqual(status, 200)
        self.assertIn("window.setTimeout(() => addBatch(1), 300)", body)
        self.assertIn("data-batch-marker", body)
        self.assertIn("D009", body)
        self.assertIn("window.__fixture", body)

    def test_missing_asset_is_404(self):
        with self.assertRaises(urllib.error.HTTPError) as context:
            self.fetch("/missing.js")
        self.assertEqual(context.exception.code, 404)


if __name__ == "__main__":
    unittest.main()
