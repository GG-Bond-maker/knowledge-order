"""检查 TypeScript 模板字符串中未转义的反引号边界。

默认保持原有行为，只检查 quant-math.ts；也可以传入一个或多个文件或目录：

    python scripts/check_tpl.py
    python scripts/check_tpl.py src/content/chapters/web-crawling
"""

from __future__ import annotations

import argparse
import bisect
import re
import sys
from pathlib import Path


DEFAULT_PATH = Path("src/content/chapters/quant/quant-math.ts")
BACKSLASH = chr(92)
BACKTICK = chr(96)
PLAUSIBLE_CLOSE = re.compile(r"\s*[,;:)\]}]?\s*(?://.*)?$")


def iter_paths(arguments: list[str]) -> tuple[list[Path], list[Path]]:
    requested = [Path(argument) for argument in arguments] if arguments else [DEFAULT_PATH]
    files: list[Path] = []
    missing: list[Path] = []
    for path in requested:
        if path.is_file():
            files.append(path)
        elif path.is_dir():
            files.extend(sorted(path.rglob("*.ts")))
        else:
            missing.append(path)
    return files, missing


class TemplateScanner:
    """足够覆盖课程源文件的轻量 TS 词法扫描器。"""

    def __init__(self, text: str) -> None:
        self.text = text
        self.length = len(text)
        self.line_starts = [0]
        self.line_starts.extend(index + 1 for index, char in enumerate(text) if char == "\n")
        self.bad: list[tuple[int, str]] = []

    def line_number(self, index: int) -> int:
        return bisect.bisect_right(self.line_starts, index)

    def line_text(self, index: int) -> str:
        line_number = self.line_number(index)
        start = self.line_starts[line_number - 1]
        end = self.text.find("\n", start)
        if end < 0:
            end = self.length
        return self.text[start:end].strip()[:120]

    def scan(self) -> list[tuple[int, str]]:
        self.scan_code(0, stop_at_brace=False)
        return self.bad

    def scan_string(self, index: int, quote: str) -> int:
        index += 1
        while index < self.length:
            char = self.text[index]
            if char == BACKSLASH:
                index += 2
            elif char == quote:
                return index + 1
            else:
                index += 1
        return index

    def scan_template(self, index: int) -> int:
        start_line = self.line_number(index)
        index += 1
        while index < self.length:
            char = self.text[index]
            if char == BACKSLASH:
                index += 2
                continue
            if char == "$" and index + 1 < self.length and self.text[index + 1] == "{":
                index = self.scan_code(index + 2, stop_at_brace=True)
                continue
            if char == BACKTICK:
                end_of_line = self.text.find("\n", index)
                if end_of_line < 0:
                    end_of_line = self.length
                remainder = self.text[index + 1 : end_of_line]
                if self.line_number(index) > start_line and not PLAUSIBLE_CLOSE.fullmatch(remainder):
                    self.bad.append((self.line_number(index), self.line_text(index)))
                    index += 1
                    continue
                return index + 1
            index += 1
        return index

    def scan_code(self, index: int, stop_at_brace: bool) -> int:
        brace_depth = 0
        while index < self.length:
            char = self.text[index]
            if char in {"'", '"'}:
                index = self.scan_string(index, char)
                continue
            if char == "/" and index + 1 < self.length:
                next_char = self.text[index + 1]
                if next_char == "/":
                    newline = self.text.find("\n", index + 2)
                    index = self.length if newline < 0 else newline + 1
                    continue
                if next_char == "*":
                    end = self.text.find("*/", index + 2)
                    index = self.length if end < 0 else end + 2
                    continue
            if char == BACKTICK:
                index = self.scan_template(index)
                continue
            if stop_at_brace:
                if char == "{":
                    brace_depth += 1
                elif char == "}":
                    if brace_depth == 0:
                        return index + 1
                    brace_depth -= 1
            index += 1
        return index


def scan_file(path: Path) -> list[tuple[int, str]]:
    return TemplateScanner(path.read_text(encoding="utf-8")).scan()


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "paths",
        nargs="*",
        help="要检查的 .ts 文件或目录；省略时检查 quant-math.ts",
    )
    args = parser.parse_args()

    files, missing = iter_paths(args.paths)
    total = 0
    for path in missing:
        print(f"{path}: 路径不存在")
    for path in files:
        bad = scan_file(path)
        for line_number, text in bad:
            print(f"{path}:{line_number}: {text}")
        print(f"{path}: total bad lines: {len(bad)}")
        total += len(bad)

    print(f"checked files: {len(files)}; total bad lines: {total}")
    return 1 if missing or total else 0


if __name__ == "__main__":
    raise SystemExit(main())
