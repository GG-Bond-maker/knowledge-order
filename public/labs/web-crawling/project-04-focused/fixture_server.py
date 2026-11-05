"""Local-only HTTP views of three synthetic focused-crawl origins."""

from __future__ import annotations

import argparse
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit


FIXTURE = Path(__file__).with_name("fixtures") / "pages.json"
DATA = json.loads(FIXTURE.read_text(encoding="utf-8"))
FAULT_STATE: dict[str, int] = {}


def make_handler(origin: str, origin_data: dict):
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            path = urlsplit(self.path).path
            if path == "/robots.txt":
                self._text(200, origin_data["robots"], "text/plain; charset=utf-8")
                return
            if path == "/private/secret":
                self._json(403, {"error": "synthetic_private"})
                return
            page = origin_data["pages"].get(path)
            if page is None:
                self._json(404, {"error": "not_found", "origin": origin})
                return
            full = origin + path
            faults = DATA.get("faults", {}).get(full, [])
            attempt = FAULT_STATE.get(full, 0)
            if attempt < len(faults):
                FAULT_STATE[full] = attempt + 1
                fault = faults[attempt]
                self._json(
                    int(fault["status"]),
                    fault.get("body", {"error": "synthetic_fault"}),
                    headers=fault.get("headers", {}),
                )
                return
            if full in DATA.get("permanent_failures", []):
                self._json(500, {"error": "synthetic_permanent_failure"})
                return
            self._json(200, page)

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
            print(f"[focused-fixture:{urlsplit(origin).port}] {format % args}")

    return Handler


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-port", type=int, default=18081)
    args = parser.parse_args()
    servers = []
    for offset, (origin, data) in enumerate(DATA["origins"].items()):
        port = args.base_port + offset
        host_port = urlsplit(origin).port
        server = ThreadingHTTPServer(("127.0.0.1", host_port), make_handler(origin, data))
        servers.append(server)
        print(f"Synthetic focused origin: http://127.0.0.1:{host_port}/")
    for server in servers:
        thread = Thread(target=server.serve_forever, daemon=True)
        thread.start()
    try:
        while True:
            input("Press Enter to stop the three local servers...\n")
    except (KeyboardInterrupt, EOFError):
        pass
    finally:
        for server in servers:
            server.shutdown()
            server.server_close()


if __name__ == "__main__":
    main()
