"""In-memory transport for the paginated JSON project.

The transport never opens a socket. Faults are consumed deterministically so a
test can replay a 503 response without waiting in real time.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlsplit


@dataclass(frozen=True)
class Response:
    status: int
    headers: dict[str, str]
    body: str
    url: str


class FakeTransport:
    """Serve synthetic API pages from a JSON fixture."""

    def __init__(self, fixture_path: Path, repeat_faults: bool = False):
        self.fixture_path = Path(fixture_path)
        fixture = json.loads(self.fixture_path.read_text(encoding="utf-8"))
        self.base_url = fixture["base_url"]
        self.pages = fixture["pages"]
        self._faults = {
            cursor: [dict(item) for item in entries]
            for cursor, entries in fixture.get("faults", {}).items()
        }
        self.repeat_faults = repeat_faults
        self.calls: list[dict[str, Any]] = []

    @property
    def request_count(self) -> int:
        return len(self.calls)

    def get(
        self,
        url: str,
        headers: dict[str, str] | None = None,
        timeout: float = 5.0,
    ) -> Response:
        cursor = self._cursor_from_url(url)
        self.calls.append(
            {
                "url": url,
                "cursor": cursor,
                "headers": dict(headers or {}),
                "timeout": timeout,
            }
        )

        queued_faults = self._faults.get(cursor) or []
        if queued_faults:
            fault = queued_faults[0] if self.repeat_faults else queued_faults.pop(0)
            body = fault.get("body", {"error": "temporarily_unavailable"})
            return Response(
                status=int(fault["status"]),
                headers={key: str(value) for key, value in fault.get("headers", {}).items()},
                body=json.dumps(body, ensure_ascii=False),
                url=url,
            )

        if cursor not in self.pages:
            return Response(
                status=404,
                headers={"Content-Type": "application/json"},
                body=json.dumps({"error": "cursor_not_found", "cursor": cursor}),
                url=url,
            )

        payload = self.pages[cursor]
        return Response(
            status=200,
            headers={"Content-Type": "application/json; charset=utf-8"},
            body=json.dumps(payload, ensure_ascii=False),
            url=url,
        )

    @staticmethod
    def _cursor_from_url(url: str) -> str:
        query = parse_qs(urlsplit(url).query, keep_blank_values=True)
        return query.get("cursor", [""])[0]
