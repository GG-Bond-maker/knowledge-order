"""项目 1 接口骨架。完成各 TODO 后再运行验收测试，不要直接复制 solution。"""

from pathlib import Path


def load_html(path: Path) -> str:
    """读取 UTF-8 文件，返回文本。"""
    return path.read_text(encoding="utf-8")


def extract_links(list_html: str, base_url: str) -> list[str]:
    """返回所有合法 http/https 详情 URL；保留重复，跳过非法 scheme。"""
    raise NotImplementedError("TODO: 解析 <base> 与 <a href>，用 urljoin 规范化")


def parse_detail(html: str, source_url: str) -> dict | None:
    """返回 sku/title/price_text/stock_text/source_url 的原始字典。"""
    raise NotImplementedError("TODO: 从详情 HTML 抽取原始字段")


def normalize_record(record: dict) -> dict | None:
    """返回 sku/title/price_cents/available/source_url；缺业务键时返回 None。"""
    raise NotImplementedError("TODO: 规范化价格、库存与缺失值")


def collect(fixture_dir: Path) -> tuple[list[dict], dict]:
    """收集 6 个详情，返回稳定排序记录和漏斗报告。"""
    raise NotImplementedError("TODO: 串联发现、抽取、规范和分类")


def write_outputs(records: list[dict], report: dict, out_dir: Path) -> None:
    """写出 records.jsonl、records.csv 与 report.json。"""
    raise NotImplementedError("TODO: 稳定序列化 JSONL、CSV 与报告")
