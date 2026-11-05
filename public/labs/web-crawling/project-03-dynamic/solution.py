"""项目 3 参考实现：仅访问本地确定性动态夹具。

运行依赖可选的 Playwright Python 与本机 Chromium；站内练习不执行本文件。
"""

from __future__ import annotations

import json
import sys


EXPECTED_ITEMS = 9
MAX_SCROLLS = 5


def collect_dynamic(url: str, timeout_ms: int = 5000) -> list[dict]:
    try:
        from playwright.sync_api import expect, sync_playwright
    except ImportError as exc:
        raise RuntimeError(
            "本机可选依赖 playwright 未安装；这是本地项目，不是站内判分。"
        ) from exc

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            context = browser.new_context()
            page = context.new_page()
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
                expect(page.locator('[data-app-state="ready"]')).to_be_visible(
                    timeout=timeout_ms
                )
                expect(page.locator('article[data-batch="1"]').first).to_be_visible(
                    timeout=timeout_ms
                )
                list_locator = page.locator('[data-role="item-list"]')
                for _ in range(MAX_SCROLLS):
                    count = page.locator("article[data-item-id]").count()
                    if count >= EXPECTED_ITEMS:
                        break
                    list_locator.evaluate(
                        "(element) => element.scrollTo(0, element.scrollHeight)"
                    )
                    page.wait_for_function(
                        "() => document.querySelectorAll('article[data-item-id]').length > "
                        + str(count),
                        timeout=timeout_ms,
                    )
                expect(
                    page.locator('[data-batch-marker="3"]')
                ).to_have_count(1, timeout=timeout_ms)
                rows = page.locator("article[data-item-id]").evaluate_all(
                    """nodes => nodes.map(node => ({
                        id: node.dataset.itemId,
                        title: node.querySelector('h2').textContent.trim(),
                        batch: Number(node.dataset.batch)
                    }))"""
                )
            finally:
                context.close()
                browser.close()
    except Exception as exc:
        raise RuntimeError(f"dynamic fixture collection failed: {exc}") from exc

    deduped = {row["id"]: row for row in rows if row.get("id")}
    ordered = [deduped[key] for key in sorted(deduped)]
    if len(ordered) != EXPECTED_ITEMS:
        raise RuntimeError(
            f"expected {EXPECTED_ITEMS} unique items, got {len(ordered)}"
        )
    return ordered


def main() -> None:
    url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:18080/"
    rows = collect_dynamic(url)
    print(
        json.dumps(
            {"count": len(rows), "batches": sorted({row["batch"] for row in rows})},
            ensure_ascii=False,
        )
    )
    for row in rows:
        print(json.dumps(row, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
