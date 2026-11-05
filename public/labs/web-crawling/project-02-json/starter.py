"""项目 2 接口骨架。完成 TODO 后再运行验收测试，不要直接复制 solution。"""

from pathlib import Path


API_URL = "https://local.test/api/books"
CHECKPOINT_RUN_ID = "books-v1"
MAX_RETRIES = 2


def fetch_page(transport, cursor: str | None) -> dict:
    """请求一页并返回 status、headers、payload 与 url。cursor=None 表示首页。"""
    raise NotImplementedError("TODO: 构造游标 URL、调用 transport.get 并解析 JSON")


def decode_items(payload: dict) -> list[dict]:
    """返回结构合法的记录；坏记录由 run 另行计数。"""
    raise NotImplementedError("TODO: 校验 items 列表和每条记录的业务字段")


def upsert_items(db_path: Path, items: list[dict]) -> int:
    """以 sku 为唯一键写入 SQLite，返回本次处理的唯一记录数。"""
    raise NotImplementedError("TODO: 建立表结构并使用 INSERT ... ON CONFLICT")


def save_checkpoint(db_path: Path, cursor: str | None, completed: int) -> None:
    """保存当前游标与已完成页数；它与页面写入应在同一事务中。"""
    raise NotImplementedError("TODO: 写入 run_id 唯一的检查点")


def run(transport, db_path: Path, clock) -> dict:
    """执行或恢复采集，返回请求、重试、页数、行数和完成状态报告。"""
    raise NotImplementedError("TODO: 串联分页、有限重试、事务提交与恢复")
