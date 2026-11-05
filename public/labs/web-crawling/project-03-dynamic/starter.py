"""项目 3 接口骨架。浏览器采集只在本机夹具上运行。"""

from pathlib import Path


EXPECTED_ITEMS = 9
MAX_SCROLLS = 5


def collect_dynamic(url: str, timeout_ms: int = 5000) -> list[dict]:
    """在本地动态夹具上等待三批记录并返回 id/title/batch。"""
    raise NotImplementedError(
        "TODO: 使用 Playwright locator 等待 ready 与三个批次；只访问本地夹具"
    )
