"""项目 5 接口骨架。只使用合成快照，不访问真实网页。"""

from pathlib import Path


def normalize_text(html: str) -> str:
    """去掉 HTML 标签、合并空白并返回可比较文本。"""
    raise NotImplementedError("TODO: 使用标准库 HTMLParser 提取可见文本")


def sha256_text(text: str) -> str:
    """返回 UTF-8 文本的 SHA-256 十六进制摘要。"""
    raise NotImplementedError("TODO: 计算规范化文本摘要")


def simhash64(text: str) -> int:
    """返回固定 64 位 SimHash 指纹。"""
    raise NotImplementedError("TODO: shingle、逐位投票并 mask 到 64 位")


def hamming_distance(a: int, b: int) -> int:
    """返回两个整数签名的不同二进制位数。"""
    raise NotImplementedError("TODO: XOR 后统计 popcount")


def upsert_version(db_path: Path, record: dict) -> str:
    """幂等写入版本，返回 inserted 或 duplicate。"""
    raise NotImplementedError("TODO: 版本唯一键与当前摘要比较")


def compare_snapshots(previous: list[dict], current: list[dict]) -> dict:
    """比较两个记录列表，返回分类计数。"""
    raise NotImplementedError("TODO: 分类 new/changed/unchanged/near/deleted")


def run(transport, db_path: Path, snapshot_id: str) -> dict:
    """执行一个快照并返回增量报告。"""
    raise NotImplementedError("TODO: 条件请求、校验、版本与报告")
