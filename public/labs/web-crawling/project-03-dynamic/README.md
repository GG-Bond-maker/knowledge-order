# 项目 3：本地动态页面与批次采集

这是一个只访问本地回环地址的合成动态页面。页面先显示应用壳，300 ms 后插入第一批 3 条记录；滚动列表容器时再插入第二批和第三批，共 9 条。项目用条件等待、批次标记和有限滚动证明动态采集的完整性。

## 文件与边界

```text
project-03-dynamic/
  page.html
  app.js
  fixture_server.py
  starter.py
  solution.py
  tests/test_fixture.py
  tests/smoke_fixture.mjs
```

页面不加载外部字体、图片、API、分析脚本或 Cookie。所有记录都是 D001–D009 的合成数据。浏览器实验只连接 `127.0.0.1`，不能把真实登录态或第三方站点加入默认测试。

## 标准库夹具测试

不需要安装 Playwright：

```powershell
python -m unittest discover -s public/labs/web-crawling/project-03-dynamic/tests -v
```

测试会在随机回环端口启动 fixture server，检查根路径、`app.js`、批次标记与 404。它不执行 JavaScript，因此不能替代浏览器验收。

## 本地浏览器冒烟测试

先在一个终端启动夹具：

```powershell
python public/labs/web-crawling/project-03-dynamic/fixture_server.py --port 18080
```

再运行浏览器冒烟：

```powershell
node public/labs/web-crawling/project-03-dynamic/tests/smoke_fixture.mjs
```

脚本使用仓库已有的 `playwright-core`，默认寻找 Windows Chrome；可用 `CHROME_PATH` 指定浏览器，用 `FIXTURE_URL` 指定 URL。它先等待 `data-app-state="ready"`，再滚动真实列表容器，直到第三批标记出现，最后断言 9 个唯一 ID。

Python Playwright 采集是可选依赖：

```powershell
python -m pip install playwright
python -m playwright install chromium
python public/labs/web-crawling/project-03-dynamic/solution.py http://127.0.0.1:18080/
```

若未安装可选依赖，`solution.py` 会明确提示这是本地项目，不会在站内判分中伪装通过。

## DOM 契约

| 标记 | 含义 |
| --- | --- |
| `main[data-app-state="loading"]` | 应用壳已返回，数据尚未就绪 |
| `main[data-app-state="ready"]` | 第一批已插入 |
| `main[data-app-state="complete"]` | 第三批已插入 |
| `article[data-item-id]` | 一条合成记录 |
| `article[data-batch="1|2|3"]` | 记录所属批次 |
| `[data-batch-marker="1|2|3"]` | 批次完成标记 |
| `[data-role="item-list"]` | 真正需要滚动的列表容器 |

## 四个里程碑

1. 启动夹具，确认根路径返回 200 且外壳含 `data-app-state`。
2. 在浏览器中等待 ready 与第一批，记录三条记录。
3. 滚动列表容器两次，等待 batch 2 与 batch 3，最终得到 9 条。
4. 删除或隐藏 batch 3 标记，验证 5 秒内出现聚焦超时错误，并保存 locator、计数和批次证据。

## Definition of Done

- 标准库测试通过，且测试没有访问真实网络；
- 浏览器冒烟得到 D001–D009 共 9 条、批次 `[1,2,3]`；
- 使用 `locator`、`expect`、`wait_for_function` 或等价条件，不使用固定 `time.sleep`；
- 滚动目标为 `[data-role="item-list"]`，不是 window；
- 设置最大滚动轮数和每步超时；失败时报告当前条目数、已出现批次与 locator；
- starter 明确失败，solution 或冒烟测试给出可复现证据；
- 不加入登录、验证码、付费墙或访问控制绕过。

## 故障排查

| 现象 | 检查 |
| --- | --- |
| 只得到 3 条 | 是否只等待了 ready，没有滚动列表容器 |
| 只得到 6 条 | 是否滚动了两次但未等待第三次批次标记 |
| 执行很快却为空 | 是否在 `domcontentloaded` 后立即读取，未等待脚本 |
| 一直等待 | 浏览器是否受缓存或扩展影响；查看当前 URL 与批次标记 |
| Chromium 启动失败 | 设置 `CHROME_PATH`，或安装本地 Chrome / Playwright 浏览器 |
| 标准库测试通过但浏览器失败 | 标准库只验证外壳，浏览器验收必须单独运行 |
