"""项目 4 接口骨架。只在本地合成夹具上练习，不访问真实站点。"""

from pathlib import Path


def canonicalize(url: str, base_url: str) -> str | None:
    """返回 http/https 规范 URL；非法或非网页 scheme 返回 None。"""
    raise NotImplementedError("TODO: 合并相对 URL、去 fragment、检查 scheme/host")


def allowed_by_robots(robots_text: str, url: str, user_agent: str) -> bool:
    """按最长匹配的 Allow/Disallow 规则判断路径是否允许。"""
    raise NotImplementedError("TODO: 解析 user-agent 分组与路径规则")


def run(transport, clock, config: dict, db_path: Path) -> dict:
    """执行本地聚焦采集，返回范围、robots、重试、恢复和每 host 指标。"""
    raise NotImplementedError("TODO: 串联门禁、限速、SQLite、死信与审计日志")
