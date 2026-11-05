"""项目 1 参考实现。完成练习后再对照，不要把它当作唯一正确实现。"""

import csv
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urldefrag, urlsplit


def load_html(path: Path) -> str:
    return path.read_text(encoding="utf-8")


class _ListParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.base_href = None
        self.links = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == "base" and values.get("href") and self.base_href is None:
            self.base_href = values["href"]
        if tag == "a" and values.get("href") is not None:
            self.links.append(values["href"])


def _card_count(list_html: str) -> int:
    class Counter(HTMLParser):
        count = 0

        def handle_starttag(self, tag, attrs):
            if tag == "article" and "book-card" in dict(attrs).get("class", "").split():
                self.count += 1

    parser = Counter()
    parser.feed(list_html)
    return parser.count


def extract_links(list_html: str, base_url: str) -> list[str]:
    parser = _ListParser()
    parser.feed(list_html)
    effective_base = urljoin(base_url, parser.base_href or "")
    links = []
    for href in parser.links:
        url, _ = urldefrag(urljoin(effective_base, href))
        parts = urlsplit(url)
        if parts.scheme in {"http", "https"} and parts.hostname:
            links.append(url)
    return links


class _DetailParser(HTMLParser):
    def __init__(self, source_url):
        super().__init__(convert_charrefs=True)
        self.source_url = source_url
        self.sku = None
        self.title = None
        self.price_text = None
        self.stock_text = None
        self.capture = None
        self.parts = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        classes = values.get("class", "").split()
        if tag == "article" and "book-detail" in classes:
            self.sku = values.get("data-sku")
        if tag == "h1":
            self.capture = "title"
            self.parts = []
        elif "price" in classes:
            self.capture = "price_text"
            self.parts = []
        elif "stock" in classes:
            self.capture = "stock_text"
            self.parts = []

    def handle_data(self, data):
        if self.capture:
            self.parts.append(data)

    def handle_endtag(self, tag):
        if not self.capture:
            return
        value = " ".join("".join(self.parts).split()).strip() or None
        setattr(self, self.capture, value)
        self.capture = None
        self.parts = []


def parse_detail(html: str, source_url: str) -> dict | None:
    parser = _DetailParser(source_url)
    parser.feed(html)
    if not parser.sku:
        return None
    return {
        "sku": parser.sku,
        "title": parser.title,
        "price_text": parser.price_text,
        "stock_text": parser.stock_text,
        "source_url": source_url,
    }


def _price_to_cents(text: str | None) -> int | None:
    if text is None:
        return None
    value = re.sub(r"\s+", "", text).replace("￥", "").replace(",", "")
    if not re.fullmatch(r"\d+(?:\.\d{1,2})?", value):
        return None
    return int(round(float(value) * 100))


def normalize_record(record: dict) -> dict | None:
    sku = (record.get("sku") or "").strip() or None
    source_url = record.get("source_url")
    parts = urlsplit(source_url or "")
    if not sku or parts.scheme not in {"http", "https"} or not parts.hostname:
        return None
    stock = record.get("stock_text")
    available = {"有货": True, "缺货": False}.get(stock)
    return {
        "sku": sku,
        "title": (record.get("title") or "").strip() or None,
        "price_cents": _price_to_cents(record.get("price_text")),
        "available": available,
        "source_url": source_url,
    }


def collect(fixture_dir: Path) -> tuple[list[dict], dict]:
    list_html = load_html(fixture_dir / "list.html")
    base_url = "https://local.test/project-01/"
    links = extract_links(list_html, base_url)
    unique_links = list(dict.fromkeys(links))
    records = []
    invalid = 0
    for url in unique_links:
        filename = Path(urlsplit(url).path).name
        html = load_html(fixture_dir / filename)
        raw = parse_detail(html, url)
        normalized = normalize_record(raw) if raw else None
        if normalized is None:
            invalid += 1
            continue
        records.append(normalized)
    records.sort(key=lambda row: row["sku"])
    complete = sum(
        row["title"] is not None and row["price_cents"] is not None for row in records
    )
    partial = len(records) - complete
    report = {
        "cards_seen": _card_count(list_html),
        "unique_urls": len(unique_links),
        "complete": complete,
        "partial": partial,
        "invalid": invalid,
        "duplicates": len(links) - len(unique_links),
        "skipped": {"invalid_scheme": _card_count(list_html) - len(links)},
        "price_missing": sum(row["price_cents"] is None for row in records),
        "title_missing": sum(row["title"] is None for row in records),
        "complete_rate": complete / _card_count(list_html) if _card_count(list_html) else 0.0,
    }
    return records, report


def write_outputs(records: list[dict], report: dict, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    ordered = sorted(records, key=lambda row: row["sku"])
    jsonl = "".join(
        json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n" for row in ordered
    )
    (out_dir / "records.jsonl").write_text(jsonl, encoding="utf-8")
    fields = ["sku", "title", "price_cents", "available", "source_url"]
    with (out_dir / "records.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(ordered)
    (out_dir / "report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
