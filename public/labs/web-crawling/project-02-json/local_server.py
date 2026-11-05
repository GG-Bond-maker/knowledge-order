"""Optional standard-library HTTP view of the synthetic paginated API."""

from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit


FIXTURE = Path(__file__).with_name("fixtures") / "pages.json"
DATA = json.loads(FIXTURE.read_text(encoding="utf-8"))
ATTEMPTS: dict[str, int] = {}


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parts = urlsplit(self.path)
        if parts.path != "/api/books":
            self._json(404, {"error": "not_found"})
            return
        cursor = parse_qs(parts.query, keep_blank_values=True).get("cursor", [""])[0]
        ATTEMPTS[cursor] = ATTEMPTS.get(cursor, 0) + 1
        faults = DATA.get("faults", {}).get(cursor, [])
        if faults and ATTEMPTS[cursor] == 1:
            fault = faults[0]
            self._json(
                int(fault["status"]),
                fault.get("body", {"error": "temporarily_unavailable"}),
                headers=fault.get("headers", {}),
            )
            return
        payload = DATA["pages"].get(cursor)
        if payload is None:
            self._json(404, {"error": "cursor_not_found", "cursor": cursor})
            return
        self._json(200, payload)

    def _json(self, status: int, payload: dict, headers: dict[str, str] | None = None):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        for key, value in (headers or {}).items():
            self.send_header(str(key), str(value))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        print(f"[local-api] {self.address_string()} {format % args}")


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 8765), Handler)
    print("Synthetic API: http://127.0.0.1:8765/api/books")
    print("This server is local and contains synthetic data only.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
