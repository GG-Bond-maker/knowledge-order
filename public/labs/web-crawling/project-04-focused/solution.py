"""项目 4 参考实现：礼貌型聚焦爬虫，仅使用本地夹具 transport。"""

from __future__ import annotations

import json
import sqlite3
from collections import deque
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urldefrag, urljoin, urlsplit, urlunsplit


DEFAULT_RUN_ID = "focused-v1"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def canonicalize(url: str, base_url: str) -> str | None:
    absolute, _ = urldefrag(urljoin(base_url, url))
    parts = urlsplit(absolute)
    if parts.scheme not in {"http", "https"} or not parts.hostname:
        return None
    scheme = parts.scheme.lower()
    host = parts.hostname.lower()
    port = parts.port
    if port and not ((scheme == "http" and port == 80) or (scheme == "https" and port == 443)):
        host = f"{host}:{port}"
    tracking = {"utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"}
    query = [
        (key, value)
        for key, value in parse_qsl(parts.query, keep_blank_values=True)
        if key.lower() not in tracking
    ]
    path = parts.path or "/"
    return urlunsplit((scheme, host, path, urlencode(query), ""))


def _robots_groups(robots_text: str):
    groups = []
    current_agents = []
    current_rules = []
    for raw in robots_text.splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line or ":" not in line:
            continue
        key, value = [part.strip() for part in line.split(":", 1)]
        key = key.lower()
        if key == "user-agent":
            if current_rules:
                groups.append((current_agents, current_rules))
                current_agents, current_rules = [], []
            current_agents.append(value.lower())
        elif key in {"allow", "disallow"} and current_agents:
            current_rules.append((key, value or "/"))
    if current_agents:
        groups.append((current_agents, current_rules))
    return groups


def allowed_by_robots(robots_text: str, url: str, user_agent: str) -> bool:
    path = urlsplit(url).path or "/"
    agent = user_agent.lower()
    selected = []
    for agents, rules in _robots_groups(robots_text):
        if any(item == "*" or item in agent for item in agents):
            selected.extend(rules)
    if not selected:
        return True
    best = None
    for kind, pattern in selected:
        if not pattern:
            continue
        matches = path.startswith(pattern)
        if not matches:
            continue
        length = len(pattern)
        if best is None or length > best[0] or (length == best[0] and kind == "allow"):
            best = (length, kind)
    return True if best is None else best[1] == "allow"


def _init_db(db_path: Path):
    db_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS items (
            item_key TEXT PRIMARY KEY,
            url TEXT NOT NULL,
            title TEXT,
            status INTEGER NOT NULL,
            fetched_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS checkpoints (
            run_id TEXT PRIMARY KEY,
            completed INTEGER NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS dead_letter (
            task_key TEXT PRIMARY KEY,
            url TEXT NOT NULL,
            reason TEXT NOT NULL,
            attempts INTEGER NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS tasks (
            task_key TEXT PRIMARY KEY,
            url TEXT NOT NULL,
            status TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """
    )
    return connection


def _load_done(db_path: Path) -> set[str]:
    with closing(_init_db(db_path)) as connection:
        rows = connection.execute("SELECT url FROM items").fetchall()
        dead = connection.execute("SELECT url FROM dead_letter").fetchall()
    return {row["url"] for row in rows} | {row["url"] for row in dead}


def _load_pending(db_path: Path) -> list[str]:
    with closing(_init_db(db_path)) as connection:
        rows = connection.execute(
            "SELECT url FROM tasks WHERE status = 'pending' ORDER BY rowid"
        ).fetchall()
    return [row["url"] for row in rows]


def _set_task(connection: sqlite3.Connection, url: str, status: str) -> None:
    connection.execute(
        """
        INSERT INTO tasks(task_key, url, status, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(task_key) DO UPDATE SET
            status=excluded.status, updated_at=excluded.updated_at
        """,
        (url, url, status, _utc_now()),
    )


def _audit(path: Path, event: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(event, ensure_ascii=False, sort_keys=True) + "\n")


def _fetch_retry(transport, clock, url: str, max_retries: int, stats: dict):
    attempts = 0
    while True:
        stats["requests"] += 1
        host = urlsplit(url).netloc
        stats["per_host_requests"][host] = stats["per_host_requests"].get(host, 0) + 1
        response = transport.get(
            url,
            headers={"User-Agent": "course-focused-bot/1.0", "Accept": "application/json"},
            timeout=5.0,
        )
        status = int(response.status)
        headers = {str(key).lower(): str(value) for key, value in response.headers.items()}
        if status in {429, 503} and attempts < max_retries:
            wait = float(headers.get("retry-after", "1") or "1")
            clock.sleep(wait)
            stats["rate_wait"] += wait
            stats["retries"] += 1
            attempts += 1
            continue
        if status == 200:
            return response, attempts
        if status in {429, 503, 500}:
            return response, attempts
        return response, attempts


def run(transport, clock, config: dict, db_path: Path) -> dict:
    origins = config["origins"]
    min_interval = float(config.get("min_interval", 0.0))
    max_retries = int(config.get("max_retries", 2))
    audit_path = Path(config.get("audit_path", db_path.with_suffix(".audit.jsonl")))
    run_id = config.get("run_id", DEFAULT_RUN_ID)
    done = _load_done(db_path)
    queue = deque()
    queued = set()
    for seed in config["seed_urls"]:
        normalized = canonicalize(seed, seed)
        if normalized and normalized not in queued:
            queued.add(normalized)
            queue.append(normalized)
    for pending in _load_pending(db_path):
        if pending not in queued and pending not in done:
            queued.add(pending)
            queue.append(pending)

    seen = set(done)
    stats = {
        "requests": 0,
        "fetched": 0,
        "parsed": 0,
        "skipped": 0,
        "duplicates": 0,
        "robots_denied": 0,
        "out_of_scope": 0,
        "retries": 0,
        "dead_letter": 0,
        "rate_wait": 0.0,
        "per_host_requests": {},
    }
    last_at: dict[str, float] = {}
    dead_reasons: list[dict] = []

    with closing(_init_db(db_path)) as connection:
        while queue:
            url = queue.popleft()
            if url in seen:
                stats["duplicates"] += 1
                continue
            seen.add(url)
            origin = next(
                (
                    key
                    for key in origins
                    if urlsplit(url).scheme + "://" + urlsplit(url).netloc == key
                ),
                None,
            )
            if origin is None or not urlsplit(url).path.startswith(
                origins[origin].get("allowed_prefix", "/")
            ):
                stats["out_of_scope"] += 1
                stats["skipped"] += 1
                _set_task(connection, url, "skipped")
                connection.commit()
                continue
            robots = origins[origin].get("robots", "")
            if not allowed_by_robots(robots, url, config.get("user_agent", "course-bot")):
                stats["robots_denied"] += 1
                stats["skipped"] += 1
                _set_task(connection, url, "skipped")
                connection.commit()
                continue
            host = urlsplit(url).netloc
            if host in last_at and clock.time() - last_at[host] < min_interval:
                wait = min_interval - (clock.time() - last_at[host])
                clock.sleep(wait)
                stats["rate_wait"] += wait
            last_at[host] = clock.time()
            response, attempts = _fetch_retry(transport, clock, url, max_retries, stats)
            status = int(response.status)
            if status != 200:
                reason = f"http_{status}"
                stats["dead_letter"] += 1
                stats["skipped"] += 1
                dead_reasons.append({"url": url, "reason": reason})
                connection.execute(
                    """
                    INSERT OR REPLACE INTO dead_letter(task_key, url, reason, attempts, created_at)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (url, url, reason, attempts, _utc_now()),
                )
                _set_task(connection, url, "dead")
                connection.commit()
                _audit(audit_path, {"event": "dead_letter", "url": url, "status": status})
                continue
            stats["fetched"] += 1
            try:
                payload = json.loads(response.body)
            except json.JSONDecodeError:
                payload = {}
            title = payload.get("title")
            if isinstance(title, str) and title:
                stats["parsed"] += 1
                connection.execute(
                    """
                    INSERT INTO items(item_key, url, title, status, fetched_at)
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(item_key) DO UPDATE SET
                        title=excluded.title, status=excluded.status, fetched_at=excluded.fetched_at
                    """,
                    (url, url, title, status, _utc_now()),
                )
                connection.execute(
                    """
                    INSERT INTO checkpoints(run_id, completed, updated_at)
                    VALUES (?, 1, ?)
                    ON CONFLICT(run_id) DO UPDATE SET
                        completed = completed + 1, updated_at = excluded.updated_at
                    """,
                    (run_id, _utc_now()),
                )
                _set_task(connection, url, "done")
                connection.commit()
            _audit(
                audit_path,
                {
                    "event": "fetched",
                    "url": url,
                    "status": status,
                    "host": host,
                    "attempts": attempts,
                },
            )
            for link in payload.get("links", []):
                normalized = canonicalize(str(link), url)
                if normalized is None:
                    continue
                if normalized in queued or normalized in done:
                    stats["duplicates"] += 1
                    continue
                _set_task(connection, normalized, "pending")
                connection.commit()
                queued.add(normalized)
                queue.append(normalized)

    stats["dead_letter_records"] = dead_reasons
    stats["per_host_requests"] = dict(sorted(stats["per_host_requests"].items()))
    stats["rows_written"] = _row_count(db_path)
    return stats


def _row_count(db_path: Path) -> int:
    with closing(_init_db(db_path)) as connection:
        return int(connection.execute("SELECT COUNT(*) FROM items").fetchone()[0])
