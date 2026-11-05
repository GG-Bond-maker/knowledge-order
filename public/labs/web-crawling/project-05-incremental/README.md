# 项目 5：增量采集毕业项目

对 T1、T2、T3 三份合成快照执行条件请求、内容哈希、SimHash 近似判断、schema 校验、版本记录、tombstone 与恢复检测，输出可复算的增量报告。

## 文件与运行

```text
project-05-incremental/
  fixtures/snapshots.json
  starter.py
  solution.py
  tests/test_project.py
```

```powershell
$env:CRAWL_TARGET='solution'
python -m unittest discover -s public/labs/web-crawling/project-05-incremental/tests -v
Remove-Item Env:CRAWL_TARGET
```

starter 会以清晰的 `NotImplementedError` 失败，不被算作通过。

## 接口

```python
def normalize_text(html: str) -> str
def sha256_text(text: str) -> str
def simhash64(text: str) -> int
def hamming_distance(a: int, b: int) -> int
def upsert_version(db_path: Path, record: dict) -> str
def compare_snapshots(previous: list[dict], current: list[dict]) -> dict
def run(transport, db_path: Path, snapshot_id: str) -> dict
```

测试注入的 transport 提供 `entity_ids(snapshot_id)` 与 `fetch(snapshot_id, entity_id)`，并带 `FakeClock`。真实网络不在验收范围内。

## 快照事实

- T1 创建 6 个 active 实体；
- T2：1 个 304、2 个 changed、1 个 near_duplicate、1 个 new、1 个 404 suspect、1 个 410 gone、1 个 invalid；
- T2 的 E7 首次 503，使用有限重试后成功；
- T3：E1/E2 条件命中，E3/E7 unchanged，E4 near，E5 gone，E6 从 gone 恢复，E8 invalid；
- T3 重跑不增加版本，tombstone 与 restored 两条历史都保留。

## 版本表

`versions(entity_key, version, status, content_hash, title_hash, simhash, extractor_version, change_type, source_url, observed_at, summary_json)`，主键为 `(entity_key, version)`。`items` 保存当前版本指针与状态。

规则：

1. 304 复用旧版本，不写新正文；
2. 200 且 hash 相同为 unchanged；
3. hash 不同且 SimHash 距离低于阈值标记 near_duplicate；
4. 410 写 gone tombstone；
5. gone 后 200 写 restored，不覆盖旧 tombstone；
6. schema invalid 只计质量失败，不写正文版本；
7. 相同 hash 与 extractor_version 的重跑返回 duplicate。

## 报告与验收

报告至少包含 `new`、`changed`、`unchanged`、`near_duplicate`、`deleted`、`invalid`、`conditional_hits`、`requests`、`retries`、`versions_written`，并额外保留 `suspect_deleted`、`restored`。

DoD：

- T2/T3 分类计数与夹具一致；
- 304 有 conditional_hit，304 不被当作内容变化；
- 404 不立即写 gone，410 写 tombstone；
- tombstone 恢复保留历史；
- T3 重跑版本行数不变；
- 只使用合成 HTML，不含真实个人资料、凭据或外部请求；
- README、设计说明与五分钟演示可复现。

## 五分钟演示清单

1. 展示 T1 baseline 与版本表；
2. 展示 T2 的 304、changed、near、404、410、invalid；
3. 展示 T3 的恢复与 tombstone；
4. 重跑 T3，展示 `versions_written=0`；
5. 用 SQLite 查询证明版本唯一；
6. 说明隐私、日志脱敏、来源与保留边界。

## 故障排查

| 现象 | 检查 |
| --- | --- |
| 304 被算成 changed | 是否先判断 status 再比较 hash |
| 404 与 410 都写 gone | 是否区分 suspect 与明确 gone |
| near 与 changed 重叠 | 是否定义了互斥优先级 |
| 重跑新增版本 | 是否比较 hash、状态和 extractor_version |
| tombstone 被覆盖 | 恢复是否新增 restored 版本而不是删除旧行 |
| invalid 进入 changed | schema 校验是否在 hash 比较前执行 |
