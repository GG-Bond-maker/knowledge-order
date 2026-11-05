"""Local-only static server for the dynamic page fixture."""

from __future__ import annotations

import argparse
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        if self.path in {"", "/"}:
            self.path = "/page.html"
        super().do_GET()

    def log_message(self, format, *args):
        print(f"[dynamic-fixture] {format % args}")


def create_server(port: int = 18080, host: str = "127.0.0.1") -> ThreadingHTTPServer:
    return ThreadingHTTPServer((host, port), functools.partial(Handler))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=18080)
    args = parser.parse_args()
    server = create_server(args.port)
    print(f"Synthetic dynamic fixture: http://127.0.0.1:{server.server_port}/")
    print("Local-only synthetic data. Press Ctrl-C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
