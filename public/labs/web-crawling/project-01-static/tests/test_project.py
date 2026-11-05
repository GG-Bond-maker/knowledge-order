import csv
import importlib.util
import json
import os
import tempfile
import unittest
from pathlib import Path


PROJECT = Path(__file__).resolve().parents[1]
TARGET = os.environ.get("CRAWL_TARGET", "solution")
MODULE_PATH = PROJECT / f"{TARGET}.py"

spec = importlib.util.spec_from_file_location(f"project01_{TARGET}", MODULE_PATH)
project = importlib.util.module_from_spec(spec)
spec.loader.exec_module(project)


class Project01Tests(unittest.TestCase):
    def test_extract_links_handles_base_relative_and_scheme(self):
        html = project.load_html(PROJECT / "fixtures/list.html")
        links = project.extract_links(html, "https://wrong.test/")
        self.assertEqual(len(links), 7)
        self.assertEqual(links[0], "https://local.test/project-01/detail-01.html")
        self.assertEqual(sum(url.endswith("detail-03.html") for url in links), 2)
        self.assertFalse(any(url.startswith("javascript:") for url in links))

    def test_parse_detail_keeps_missing_price_as_none_text(self):
        html = project.load_html(PROJECT / "fixtures/detail-04.html")
        row = project.parse_detail(
            html, "https://local.test/project-01/detail-04.html"
        )
        self.assertEqual(row["sku"], "B004")
        self.assertIsNone(row["price_text"])
        self.assertEqual(row["stock_text"], "未知")

    def test_normalize_price_stock_and_missing_title(self):
        complete = project.normalize_record(
            {
                "sku": "B005",
                "title": "规范化链接样本",
                "price_text": "￥1,299.00",
                "stock_text": "有货",
                "source_url": "https://local.test/project-01/detail-05.html",
            }
        )
        self.assertEqual(complete["price_cents"], 129900)
        self.assertTrue(complete["available"])
        partial = project.normalize_record(
            {
                "sku": "B006",
                "title": None,
                "price_text": "￥5.00",
                "stock_text": "未知",
                "source_url": "https://local.test/project-01/detail-06.html",
            }
        )
        self.assertIsNone(partial["title"])
        self.assertEqual(partial["price_cents"], 500)
        self.assertIsNone(partial["available"])

    def test_collect_matches_expected_records_and_report(self):
        records, report = project.collect(PROJECT / "fixtures")
        expected_records = [
            json.loads(line)
            for line in (PROJECT / "expected/records.jsonl")
            .read_text(encoding="utf-8")
            .splitlines()
            if line.strip()
        ]
        expected_report = json.loads(
            (PROJECT / "expected/report.json").read_text(encoding="utf-8")
        )
        self.assertEqual(records, expected_records)
        self.assertEqual(report, expected_report)
        self.assertEqual(
            [row["sku"] for row in records],
            sorted(row["sku"] for row in records),
        )

    def test_write_outputs_is_stable_and_csv_round_trips(self):
        records, report = project.collect(PROJECT / "fixtures")
        with tempfile.TemporaryDirectory() as first, tempfile.TemporaryDirectory() as second:
            project.write_outputs(records, report, Path(first))
            project.write_outputs(records, report, Path(second))
            for name in ("records.jsonl", "records.csv", "report.json"):
                self.assertEqual(
                    (Path(first) / name).read_bytes(),
                    (Path(second) / name).read_bytes(),
                )
            with (Path(first) / "records.csv").open(encoding="utf-8", newline="") as handle:
                rows = list(csv.DictReader(handle))
            self.assertEqual([row["sku"] for row in rows], [row["sku"] for row in records])
            self.assertEqual(rows[3]["price_cents"], "")


if __name__ == "__main__":
    unittest.main()
