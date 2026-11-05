"""项目 2 参考实现。完成练习后再对照，不要把它当作唯一正确实现。"""

from __future__ import annotations

import json
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode


API_URL = "https://local.test/api/books"
CHECKPOINT_RUN_ID = "books-v1"
MAX_RETRIES = 2
RETRYABLE_STATUSES = {429, 500, 502, 503, 504}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


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
            item_key TEXT PRIMARY KEY,
            payload_json TEXT NOT NULL,
            version INTEGER NOT NULL,
            source_url TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS checkpoints (
            run_id TEXT PRIMARY KEY,
            cursor TEXT,
            completed INTEGER NOT NULL,
            request_count INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL
        );
        """
    )


def _page_url(cursor: str | None) -> str:
    transport_cursor = "" if cursor is None else str(cursor)
    if not transport_cursor:
        return API_URL
    return f"{API_URL}?{urlencode({'cursor': transport_cursor})}"


def _parse_retry_after(headers: dict[str, str], fallback: float) -> float:
    value = headers.get("retry-after", headers.get("Retry-After"))
    if value is None:
        return fallback
    try:
        return max(0.0, float(value))
    except (TypeError, ValueError):
        return fallback


def fetch_page(transport, cursor: str | None) -> dict:
    response = transport.get(
        _page_url(cursor),
        headers={"Accept": "application/json"},
        timeout=5.0,
    )
    headers = {str(key).lower(): str(value) for key, value in response.headers.items()}
    try:
        payload = json.loads(response.body)
    except (TypeError, json.JSONDecodeError) as exc:
        raise ValueError("response body is not valid JSON") from exc
    if not isinstance(payload, dict):
        raise ValueError("response JSON must be an object")
    return {
        "status": int(response.status),
        "headers": headers,
        "payload": payload,
        "url": response.url,
    }


def _valid_item(item: object) -> bool:
    if not isinstance(item, dict):
        return False
    sku = item.get("sku")
    title = item.get("title")
    price = item.get("price_cents")
    version = item.get("version", 1)
    return (
        isinstance(sku, str)
        and bool(sku.strip())
        and isinstance(title, str)
        and bool(title.strip())
        and isinstance(price, int)
        and not isinstance(price, bool)
        and price >= 0
        and isinstance(version, int)
        and not isinstance(version, bool)
        and version >= 1
    )


def _decode_stats(payload: dict) -> tuple[list[dict], int]:
    rows = payload.get("items")
    if not isinstance(rows, list):
        raise ValueError("payload.items must be a list")
    valid = [dict(row) for row in rows if _valid_item(row)]
    return valid, len(rows) - len(valid)


def decode_items(payload: dict) -> list[dict]:
    valid, _ = _decode_stats(payload)
    return valid


def _write_items(connection: sqlite3.Connection, items: list[dict]) -> int:
    now = _utc_now()
    submitted = set()
    for item in items:
        if not _valid_item(item):
            continue
        sku = item["sku"].strip()
        submitted.add(sku)
        version = int(item.get("version", 1))
        source_url = str(item.get("source_url") or API_URL)
        payload_json = json.dumps(item, ensure_ascii=False, sort_keys=True)
        connection.execute(
            """
            INSERT INTO items(item_key, payload_json, version, source_url, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(item_key) DO UPDATE SET
                payload_json = excluded.payload_json,
                version = excluded.version,
                source_url = excluded.source_url,
                updated_at = excluded.updated_at
            WHERE excluded.version >= items.version
            """,
            (sku, payload_json, version, source_url, now),
        )
    return len(submitted)


def upsert_items(db_path: Path, items: list[dict]) -> int:
    with closing(_connect(db_path)) as connection:
        _init_db(connection)
        with connection:
            return _write_items(connection, items)


def _write_checkpoint(
    connection: sqlite3.Connection,
    cursor: str | None,
    completed: int,
    request_count: int,
) -> None:
    connection.execute(
        """
        INSERT INTO checkpoints(run_id, cursor, completed, request_count, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(run_id) DO UPDATE SET
            cursor = excluded.cursor,
            completed = excluded.completed,
            request_count = excluded.request_count,
            updated_at = excluded.updated_at
        """,
        (CHECKPOINT_RUN_ID, cursor, completed, request_count, _utc_now()),
    )


def save_checkpoint(db_path: Path, cursor: str | None, completed: int) -> None:
    with closing(_connect(db_path)) as connection:
        _init_db(connection)
        current = connection.execute(
            "SELECT request_count FROM checkpoints WHERE run_id = ?",
            (CHECKPOINT_RUN_ID,),
        ).fetchone()
        request_count = int(current["request_count"]) if current else 0
        with connection:
            _write_checkpoint(connection, cursor, completed, request_count)


def _load_checkpoint(db_path: Path) -> dict:
    with closing(_connect(db_path)) as connection:
        _init_db(connection)
        row = connection.execute(
            "SELECT cursor, completed, request_count FROM checkpoints WHERE run_id = ?",
            (CHECKPOINT_RUN_ID,),
        ).fetchone()
    if row is None:
        return {"cursor": None, "completed": 0, "request_count": 0}
    return {
        "cursor": row["cursor"],
        "completed": int(row["completed"]),
        "request_count": int(row["request_count"]),
    }


def _database_count(db_path: Path) -> int:
    with closing(_connect(db_path)) as connection:
        _init_db(connection)
        row = connection.execute("SELECT COUNT(*) AS count FROM items").fetchone()
    return int(row["count"])


def _commit_page(
    db_path: Path,
    items: list[dict],
    cursor: str | None,
    completed: int,
    request_count: int,
) -> None:
    with closing(_connect(db_path)) as connection:
        _init_db(connection)
        with connection:
            _write_items(connection, items)
            _write_checkpoint(connection, cursor, completed, request_count)


def _report(
    status: str,
    stats: dict,
    db_path: Path,
    checkpoint: dict,
    error: str | None = None,
) -> dict:
    report = {
        "status": status,
        "requests": stats["requests"],
        "retries": stats["retries"],
        "rate_wait": stats["rate_wait"],
        "pages_committed": int(checkpoint["completed"]),
        "rows_seen": stats["rows_seen"],
        "rows_written": _database_count(db_path),
        "duplicate_skus": stats["duplicate_skus"],
        "invalid_rows": stats["invalid_rows"],
        "final_cursor": checkpoint["cursor"],
        "completed": int(checkpoint["completed"]),
        "lifetime_requests": int(checkpoint["request_count"]),
    }
    if error:
        report["error"] = error
    return report


def run(transport, db_path: Path, clock) -> dict:
    checkpoint = _load_checkpoint(db_path)
    stats = {
        "requests": 0,
        "retries": 0,
        "rate_wait": 0.0,
        "rows_seen": 0,
        "duplicate_skus": 0,
        "invalid_rows": 0,
    }
    if checkpoint["completed"] > 0 and checkpoint["cursor"] is None:
        return _report("already_complete", stats, db_path, checkpoint)

    cursor = checkpoint["cursor"]
    completed = int(checkpoint["completed"])
    seen_cursors = set()
    seen_skus = set()
    lifetime_requests = int(checkpoint["request_count"])

    while True:
        if cursor in seen_cursors:
            return _report(
                "failed",
                stats,
                db_path,
                checkpoint,
                "pagination cursor cycle detected",
            )
        seen_cursors.add(cursor)

        retries = 0
        while True:
            stats["requests"] += 1
            lifetime_requests += 1
            try:
                response = fetch_page(transport, cursor)
            except (OSError, ValueError) as exc:
                if retries >= MAX_RETRIES:
                    return _report(
                        "failed",
                        stats,
                        db_path,
                        checkpoint,
                        f"transport/format error: {exc}",
                    )
                wait = float(2**retries)
                clock.sleep(wait)
                stats["rate_wait"] += wait
                stats["retries"] += 1
                retries += 1
                continue

            status = response["status"]
            if status not in RETRYABLE_STATUSES:
                break
            if retries >= MAX_RETRIES:
                return _report(
                    "failed",
                    stats,
                    db_path,
                    checkpoint,
                    f"retry budget exhausted at cursor={cursor!r}, status={status}",
                )
            wait = _parse_retry_after(response["headers"], float(2**retries))
            clock.sleep(wait)
            stats["rate_wait"] += wait
            stats["retries"] += 1
            retries += 1

        if status >= 400:
            return _report(
                "failed",
                stats,
                db_path,
                checkpoint,
                f"HTTP {status} at cursor={cursor!r}",
            )

        payload = response["payload"]
        if "next_cursor" not in payload:
            return _report(
                "failed",
                stats,
                db_path,
                checkpoint,
                f"missing next_cursor at cursor={cursor!r}",
            )
        try:
            items, invalid = _decode_stats(payload)
        except ValueError as exc:
            return _report("failed", stats, db_path, checkpoint, str(exc))

        next_cursor = payload["next_cursor"]
        if next_cursor is not None and not isinstance(next_cursor, str):
            return _report(
                "failed",
                stats,
                db_path,
                checkpoint,
                "next_cursor must be a string or null",
            )

        stats["rows_seen"] += len(payload["items"])
        stats["invalid_rows"] += invalid
        for item in items:
            sku = item["sku"].strip()
            if sku in seen_skus:
                stats["duplicate_skus"] += 1
            seen_skus.add(sku)

        completed += 1
        checkpoint = {
            "cursor": next_cursor,
            "completed": completed,
            "request_count": lifetime_requests,
        }
        _commit_page(db_path, items, next_cursor, completed, lifetime_requests)

        if next_cursor is None:
            return _report("complete", stats, db_path, checkpoint)
        cursor = next_cursor
