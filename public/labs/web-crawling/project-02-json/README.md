# 项目 2：可恢复的分页 JSON/API 采集器

从本地合成的四页书籍 API 采集记录，处理确定性 503、`Retry-After`、跨页重复 SKU、坏记录、SQLite 幂等写入、检查点与中断恢复。所有数据均为合成内容，项目不会打开网络套接字。

## 目录

```text
project-02-json/
  README.md
  starter.py
  solution.py
  local_server.py
  fixtures/pages.json
  tests/test_project.py
../common/fake_transport.py
../common/fake_clock.py
```

`fake_transport.py` 从夹具返回确定性响应，`fake_clock.py` 记录并推进虚拟等待时间。测试不调用真实 `sleep`，也不需要启动服务器。

## 运行验收

从仓库根目录执行：

```powershell
$env:CRAWL_TARGET='solution'
python -m unittest discover -s public/labs/web-crawling/project-02-json/tests -v
Remove-Item Env:CRAWL_TARGET
```

观察 starter 的预期失败：

```powershell
$env:CRAWL_TARGET='starter'
python -m unittest discover -s public/labs/web-crawling/project-02-json/tests -v
Remove-Item Env:CRAWL_TARGET
```

## 夹具事实

- 四页，每页 3 条，共 `rows_seen=12`；
- `B003` 跨页重复，报告中 `duplicate_skus=1`；
- 页 3 含 1 条缺少 SKU 的坏记录，`invalid_rows=1`；
- 唯一合法记录为 10；
- 页 3 首次返回 503，`Retry-After: 2`，重试一次后成功；
- 正常首跑请求 5 次（4 页 + 1 次重试）；
- 首跑在页 4 请求前中断时，前 3 页已提交，检查点 cursor 为 `p4`；
- 从该检查点恢复只请求页 4，最终仍为 10 行。

## 接口

```python
def fetch_page(transport, cursor: str | None) -> dict
def decode_items(payload: dict) -> list[dict]
def upsert_items(db_path: Path, items: list[dict]) -> int
def save_checkpoint(db_path: Path, cursor: str | None, completed: int) -> None
def run(transport, db_path: Path, clock) -> dict
```

`fetch_page` 返回 `status`、`headers`、`payload` 与 `url`。`decode_items` 仅返回合法记录；`run` 还需统计坏记录与重复 SKU。SQLite 使用 `items(item_key PRIMARY KEY, payload_json, version, source_url, updated_at)` 与 `checkpoints(run_id PRIMARY KEY, cursor, completed, request_count, updated_at)`。

## 四个里程碑

1. 用 `fetch_page` 构造游标 URL，并让首页使用 `cursor=None`。
2. 用 `decode_items` 校验必填字段，坏记录不进入写入但必须计数。
3. 用唯一键 + UPSERT 写入，较早版本不能覆盖较新版本。
4. 用同一事务提交一页 items 与 checkpoint，并在 503 时通过虚拟 clock 等待。

建议先让 `test_decode_items_filters_malformed_rows_without_mutating_payload` 与 UPSERT 测试通过，再接分页与恢复。不要用固定 `time.sleep`，也不要在网络请求期间一直持有写事务。

## Definition of Done

- 正常四页完成，`rows_seen=12`、唯一行 10、invalid 1、duplicate 1；
- 页 3 的 503 遵守 `Retry-After`，虚拟时间为 2 秒，请求数为 5；
- 页 4 前中断后，恢复只请求页 4，不重抓已提交页；
- 第二次完整运行 `requests=0`，行数仍为 10；
- 503 无限持续时最多重试 2 次并保留最后检查点；
- 报告字段可由 transport 事件、检查点和 SQLite 查询交叉复算；
- starter 以清晰 `NotImplementedError` 失败，solution 全部测试通过。

## 报告字段

`status`、`requests`、`retries`、`rate_wait`、`pages_committed`、`rows_seen`、`rows_written`、`duplicate_skus`、`invalid_rows`、`final_cursor`、`completed`、`lifetime_requests`。

`requests`、`retries`、`rate_wait`、`rows_seen`、`duplicate_skus` 与 `invalid_rows` 描述本次运行；`rows_written`、`pages_committed`、`final_cursor` 和 `completed` 来自已提交数据库状态。这样可以区分“本次恢复做了什么”和“累计已经完成什么”。

## 可选本地 HTTP 观察

仅用于观察状态码和 `Retry-After`，验收测试仍使用注入式 transport：

```powershell
python public/labs/web-crawling/project-02-json/local_server.py
```

然后访问 `http://127.0.0.1:8765/api/books`，再用 `?cursor=p2` 等游标继续。服务器只监听回环地址，返回合成数据；第一次访问 `p3` 会得到 503。

## rubric

| 维度 | 分值 | 通过证据 |
| --- | ---: | --- |
| 分页与协议 | 2 | null 结束、cursor 生命周期、循环防护 |
| 有限重试与等待 | 2 | 503、Retry-After、虚拟 clock、尝试上限 |
| SQLite 幂等 | 2 | 唯一键、UPSERT、版本保护、无重复行 |
| 检查点与恢复 | 2 | 原子提交、只补未完成页、请求事件证据 |
| 报告与工程边界 | 2 | 数字可复算、离线夹具、敏感数据不入库 |

## 故障排查

| 现象 | 检查 |
| --- | --- |
| 页 3 一直失败 | FakeTransport 的故障队列是否被新实例重置；上限是否为 2 次重试 |
| 第二次运行重复抓页 1 | checkpoint 是否在同一事务内提交，cursor 是否为 `p4` |
| 行数变成 11 | 是否把坏记录写入；`item_key` 是否使用 SKU 而非自增 id |
| `Retry-After` 没生效 | header 是否按小写读取，是否把虚拟 clock 传给 `run` |
| 恢复后 completed 仍是 3 | 页 4 提交时是否把累计页数写入检查点 |
