"""项目 5 参考实现：T1/T2/T3 合成快照的增量采集与版本检测。"""

from __future__ import annotations

import hashlib
import json
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path


DEFAULT_THRESHOLD = 12
MAX_RETRIES = 2
MASK = (1 << 64) - 1


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def normalize_text(html: str) -> str:
    class Parser(HTMLParser):
        def __init__(self):
            super().__init__(convert_charrefs=True)
            self.parts = []

        def handle_data(self, data):
            self.parts.append(data)

    parser = Parser()
    parser.feed(html or "")
    return " ".join("".join(parser.parts).split())


def sha256_text(text: str) -> str:
    normalized = " ".join(str(text).split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def simhash64(text: str, width: int = 4) -> int:
    clean = " ".join(str(text).split())
    if not clean:
        return 0
    features = [clean[index : index + width] for index in range(max(1, len(clean) - width + 1))]
    votes = [0] * 64
    for feature in features:
        digest = hashlib.sha256(feature.encode("utf-8")).digest()
        value = int.from_bytes(digest[:8], "big")
        for bit in range(64):
            votes[bit] += 1 if (value >> bit) & 1 else -1
    result = 0
    for bit, vote in enumerate(votes):
        if vote >= 0:
            result |= 1 << bit
    return result & MASK


def hamming_distance(a: int, b: int) -> int:
    return (a ^ b).bit_count()


def _connect(db_path: Path) -> sqlite3.Connection:
    db_path = Path(db_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    return connection


def _init_db(connection: sqlite3.Connection) -> None:
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS items (
            entity_key TEXT PRIMARY KEY,
            status TEXT NOT NULL,
            content_hash TEXT,
            title_hash TEXT,
            simhash TEXT,
            current_version INTEGER NOT NULL,
            source_url TEXT,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS versions (
            entity_key TEXT NOT NULL,
            version INTEGER NOT NULL,
            status TEXT NOT NULL,
            content_hash TEXT,
            title_hash TEXT,
            simhash TEXT,
            extractor_version TEXT NOT NULL,
            change_type TEXT NOT NULL,
            source_url TEXT,
            observed_at TEXT NOT NULL,
            summary_json TEXT NOT NULL,
            PRIMARY KEY(entity_key, version)
        );
        """
    )


def _current(connection: sqlite3.Connection, entity_key: str):
    return connection.execute(
        "SELECT * FROM items WHERE entity_key = ?", (entity_key,)
    ).fetchone()


def upsert_version(db_path: Path, record: dict) -> str:
    entity_key = record["entity_key"]
    status = record.get("status", "active")
    content_hash = record.get("content_hash")
    title_hash = record.get("title_hash")
    simhash = str(int(record.get("simhash", 0)))
    extractor_version = record.get("extractor_version", "books-v1")
    source_url = record.get("source_url")
    observed_at = record.get("observed_at") or _utc_now()
    change_type = record.get("change_type", "changed")
    with closing(_connect(db_path)) as connection:
        _init_db(connection)
        current = _current(connection, entity_key)
        if current is not None:
            same_content = (
                current["status"] == status
                and current["content_hash"] == content_hash
                and current["title_hash"] == title_hash
            )
            if same_content and change_type not in {"restored"}:
                return "duplicate"
            version = int(current["current_version"]) + 1
        else:
            version = 1
        summary = {
            key: value
            for key, value in record.items()
            if key not in {"html", "body", "text"}
        }
        with connection:
            connection.execute(
                """
                INSERT INTO versions(
                    entity_key, version, status, content_hash, title_hash, simhash,
                    extractor_version, change_type, source_url, observed_at, summary_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    entity_key,
                    version,
                    status,
                    content_hash,
                    title_hash,
                    simhash,
                    extractor_version,
                    change_type,
                    source_url,
                    observed_at,
                    json.dumps(summary, ensure_ascii=False, sort_keys=True),
                ),
            )
            connection.execute(
                """
                INSERT INTO items(
                    entity_key, status, content_hash, title_hash, simhash,
                    current_version, source_url, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(entity_key) DO UPDATE SET
                    status=excluded.status,
                    content_hash=excluded.content_hash,
                    title_hash=excluded.title_hash,
                    simhash=excluded.simhash,
                    current_version=excluded.current_version,
                    source_url=excluded.source_url,
                    updated_at=excluded.updated_at
                """,
                (
                    entity_key,
                    status,
                    content_hash,
                    title_hash,
                    simhash,
                    version,
                    source_url,
                    observed_at,
                ),
            )
    return "inserted"


def compare_snapshots(previous: list[dict], current: list[dict]) -> dict:
    old = {row["id"]: row for row in previous if row.get("id")}
    result = {
        "new": 0,
        "changed": 0,
        "unchanged": 0,
        "near_duplicate": 0,
        "deleted": 0,
        "suspect_deleted": 0,
        "restored": 0,
        "invalid": 0,
    }
    for row in current:
        entity_id = row.get("id")
        if not entity_id or not row.get("schema_valid", True):
            result["invalid"] += 1
            continue
        status = int(row.get("status", 200))
        if status == 404:
            result["suspect_deleted"] += 1
            continue
        if status == 410:
            result["deleted"] += 1
            continue
        if status == 304:
            result["unchanged"] += 1
            continue
        previous_row = old.get(entity_id)
        if previous_row is None or previous_row.get("status") == "gone":
            result["restored" if previous_row else "new"] += 1
            continue
        old_hash = previous_row.get("content_hash")
        new_hash = row.get("content_hash")
        if old_hash == new_hash:
            result["unchanged"] += 1
        elif hamming_distance(
            int(previous_row.get("simhash", 0)), int(row.get("simhash", 0))
        ) <= DEFAULT_THRESHOLD:
            result["near_duplicate"] += 1
        else:
            result["changed"] += 1
    return result


def _snapshot_entity_ids(transport, snapshot_id: str) -> list[str]:
    return list(transport.entity_ids(snapshot_id))


def _fetch(transport, clock, snapshot_id: str, entity_id: str, stats: dict):
    attempts = 0
    while True:
        stats["requests"] += 1
        response = transport.fetch(snapshot_id, entity_id)
        status = int(response.get("status", 200))
        if status in {429, 500, 502, 503, 504} and attempts < MAX_RETRIES:
            wait = float(response.get("retry_after", 1))
            if clock is not None:
                clock.sleep(wait)
            stats["retries"] += 1
            attempts += 1
            continue
        return response


def run(transport, db_path: Path, snapshot_id: str) -> dict:
    threshold = int(getattr(transport, "near_threshold", DEFAULT_THRESHOLD))
    clock = getattr(transport, "clock", None)
    stats = {
        "new": 0,
        "changed": 0,
        "unchanged": 0,
        "near_duplicate": 0,
        "deleted": 0,
        "suspect_deleted": 0,
        "restored": 0,
        "invalid": 0,
        "conditional_hits": 0,
        "requests": 0,
        "retries": 0,
        "versions_written": 0,
    }
    with closing(_connect(db_path)) as connection:
        _init_db(connection)
        for entity_id in _snapshot_entity_ids(transport, snapshot_id):
            response = _fetch(transport, clock, snapshot_id, entity_id, stats)
            status = int(response.get("status", 200))
            if status == 304:
                stats["conditional_hits"] += 1
                stats["unchanged"] += 1
                continue
            if status == 404:
                stats["suspect_deleted"] += 1
                continue
            if status == 410:
                stats["deleted"] += 1
                current = _current(connection, entity_id)
                result = upsert_version(
                    db_path,
                    {
                        "entity_key": entity_id,
                        "status": "gone",
                        "content_hash": current["content_hash"] if current else None,
                        "title_hash": current["title_hash"] if current else None,
                        "simhash": int(current["simhash"]) if current else 0,
                        "extractor_version": "snapshot-v1",
                        "change_type": "deleted",
                        "source_url": response.get("source_url"),
                        "observed_at": _utc_now(),
                    },
                )
                if result == "inserted":
                    stats["versions_written"] += 1
                continue
            if status in {429, 500, 502, 503, 504} or status >= 400:
                stats["invalid"] += 1
                continue
            html = response.get("html")
            title = response.get("title")
            if not isinstance(html, str) or not html.strip() or not isinstance(title, str) or not title.strip():
                stats["invalid"] += 1
                continue
            text = normalize_text(html)
            content_hash = sha256_text(text)
            title_hash = sha256_text(title)
            signature = simhash64(text)
            current = _current(connection, entity_id)
            if current is None:
                change_type = "new"
            elif current["status"] == "gone":
                change_type = "restored"
            elif current["content_hash"] == content_hash and current["title_hash"] == title_hash:
                change_type = "unchanged"
            elif hamming_distance(int(current["simhash"]), signature) <= threshold:
                change_type = "near_duplicate"
            else:
                change_type = "changed"
            if change_type == "unchanged":
                stats["unchanged"] += 1
                continue
            result = upsert_version(
                db_path,
                {
                    "entity_key": entity_id,
                    "status": "active",
                    "content_hash": content_hash,
                    "title_hash": title_hash,
                    "simhash": signature,
                    "extractor_version": "snapshot-v1",
                    "change_type": change_type,
                    "source_url": response.get("source_url"),
                    "observed_at": _utc_now(),
                },
            )
            stats[change_type] += 1
            if result == "inserted":
                stats["versions_written"] += 1
    stats["states"] = ["new", "changed", "unchanged", "near_duplicate", "deleted", "invalid"]
    return stats
