# 项目 4：礼貌型聚焦爬虫

对三个本地合成 origin 做聚焦采集：规范化链接、检查范围与 robots、按 host 限速、处理 429/503、记录永久失败死信、写入 SQLite 与审计 JSONL，并在重启后跳过已完成记录。

## 文件

```text
project-04-focused/
  fixtures/pages.json
  fixtures/robots.txt
  fixture_server.py
  starter.py
  solution.py
  tests/test_project.py
```

`fixtures/robots.txt` 是人类可读的规则副本；测试配置从 `pages.json` 读取每个 origin 自己的 robots 文本。这避免测试过程中把 robots 请求计入页面指标，同时保留规则可读性。

## 运行

```powershell
$env:CRAWL_TARGET='solution'
python -m unittest discover -s public/labs/web-crawling/project-04-focused/tests -v
Remove-Item Env:CRAWL_TARGET
```

starter 的预期失败：

```powershell
$env:CRAWL_TARGET='starter'
python -m unittest discover -s public/labs/web-crawling/project-04-focused/tests -v
Remove-Item Env:CRAWL_TARGET
```

可选的本地 HTTP 观察（三个回环 origin）：

```powershell
python public/labs/web-crawling/project-04-focused/fixture_server.py --base-port 18081
```

服务器默认绑定 `127.0.0.1:18081`、`18082`、`18083`，只返回合成数据；测试不依赖它。

## 夹具事实

- 3 个 origin，各 3 个允许页面；
- origin B 的 `/docs/a` 首次 429，`Retry-After: 1`；
- origin C 的 `/docs/b` 首次 503，重试后成功；
- origin C 的 `/docs/fail` 永久 500，达到重试上限后进入死信；
- origin A 含重复 fragment、robots 禁止的 `/docs/blocked`、越界 `/private/secret`、跨域链接和外部域名；
- 允许页面最终 8 条 items，死信 1 条。

## 接口

```python
def canonicalize(url: str, base_url: str) -> str | None
def allowed_by_robots(robots_text: str, url: str, user_agent: str) -> bool
def run(transport, clock, config: dict, db_path: Path) -> dict
```

报告键：`requests`、`fetched`、`parsed`、`skipped`、`duplicates`、`robots_denied`、`out_of_scope`、`retries`、`dead_letter`、`rate_wait`、`per_host_requests`、`rows_written`。

## 里程碑

1. 实现 `canonicalize`，先证明 fragment 与跟踪参数不会制造重复。
2. 实现 robots 最长匹配；在 transport 之前过滤禁止路径。
3. 用 fake clock 实现每 host 间隔，注入 429/503 并保留重试证据。
4. 写入 SQLite/JSONL，模拟中断后重跑并证明已完成 URL 不再请求。

## Definition of Done

- robots 禁止与越界链接从未出现在 `transport.calls`；
- 每 host 请求间隔不小于配置值；
- 429/503 有等待、有限重试和审计事件；
- 永久 500 只进入死信，临时失败成功后不进入死信；
- 第二次运行不新增已完成 items；
- 报告由 transport 事件与 SQLite 查询复算；
- 无真实站点、登录态、Cookie、验证码或访问控制绕过。

## rubric

| 维度 | 分值 | 证据 |
| --- | ---: | --- |
| URL 规范化与范围 | 2 | fragment、跟踪参数、跨域测试 |
| robots 与门禁顺序 | 2 | 禁止路径零请求 |
| 每 host 限速 | 2 | fake clock 与 per_host_requests |
| 重试与死信 | 2 | 429/503/永久 500 分类 |
| 持久化与恢复 | 1 | 唯一 items、二次运行零新增 |
| 报告与离线边界 | 1 | 指标可复算、无真实网络 |

## 故障排查

| 现象 | 检查 |
| --- | --- |
| robots 禁止页面仍被请求 | 是否先入队再检查，或把 path 当作完整 URL |
| 同 host 请求过快 | 是否按 netloc 记录 last_at |
| 429 后立即重试 | 是否读取 Retry-After 并推进 fake clock |
| 临时失败污染死信 | 是否在重试上限前就写 dead_letter |
| 重跑重复请求已完成页 | 是否从 items 加载 done 集合并先于 transport 过滤 |
| 报告请求数与事件不一致 | 是否只在成功请求时计数，而失败请求漏计 |
