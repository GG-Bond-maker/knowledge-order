import type { Chapter } from '../../../types';

export const webCrawlingChapters02: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'web-crawling-c02',
    title: 'HTTP、URL 与网络请求',
    goal: '读懂 URL 与一次 HTTP 请求的生命周期，根据状态码、响应头、编码和超时定位采集故障。',
    lessons: [
      {
        id: 'web-crawling-c02-l01',
        title: 'URL 解剖与请求生命周期',
        difficulty: 2,
        content: `
## 学习目标

学完本节，你应该能够：

1. 把 URL 拆成 scheme、authority、path、query、fragment，并说明每部分是否影响服务器请求；
2. 正确使用 \`urllib.parse.urlsplit\`、\`parse_qs\`、\`urljoin\` 与百分号编码，而不靠字符串拼接；
3. 在 DNS、TCP、TLS、HTTP、响应解析五个层位上定位失败；
4. 解释相对 URL、默认端口、空路径、国际化域名和查询参数顺序的边界；
5. 为一个链接集合写出可重复的解析与规范化前置检查。

## 前置知识

- 能在 Python 中导入标准库模块并调用函数。
- 知道域名、路径和查询参数的大致作用。
- 已掌握上一节“原始响应、DOM、记录”的分层。

本节不访问真实网站。所有 URL 操作都可在标准 Python 中运行，网络失败通过记录器和响应对象模拟。

## 问题背景

假设你从页面里读到这些链接：

~~~text
../books/101
/books/102?ref=list
//cdn.example.test/cover.png
https://shop.test/catalog/2026/?page=2#reviews
~~~

它们看起来都叫“链接”，但解析规则不同。\`../\` 要相对当前目录向上退，\`//cdn...\` 会继承当前协议，\`#reviews\` 只影响浏览器定位，通常不会发送给服务器。如果直接拼接字符串，采集器可能请求不存在的路径，或者把同一资源当成两个 URL 重复抓取。

URL 是采集系统的第一层数据契约。把它解析对，后续的无去重、Frontier、限速与缓存才有意义。

## 直觉理解

把一个 URL 想成邮寄信息：

| 部分 | 类比 | 是否影响服务器收到什么 |
| --- | --- | --- |
| scheme | 运输方式 | 是：http 与 https 的连接语义不同 |
| host / port | 收件地址与门牌 | 是：决定连接到哪台服务 |
| path | 要取的资料位置 | 是：通常决定资源 |
| query | 附加筛选条件 | 是：服务器可能据此返回不同内容 |
| fragment | 信封上的便签 | 通常否：浏览器内部定位使用 |

“通常”很重要。某些前端路由可能在客户端读取片段，但标准 HTTP 请求不会把片段作为请求目标发送。采集系统必须先保存原始 URL，再按明确规则规范化，而不是直接丢掉自己不理解的部分。

## 核心概念与原理详解

### 1. 用标准库拆分 URL

~~~python
from urllib.parse import urlsplit, parse_qs, urljoin

url = "https://shop.test:8443/catalog/2026/?page=2&sort=price#reviews"
parts = urlsplit(url)
print(parts.scheme)   # https
print(parts.hostname) # shop.test
print(parts.port)     # 8443
print(parts.path)     # /catalog/2026/
print(parse_qs(parts.query))
print(parts.fragment) # reviews
~~~

\`urlsplit\` 不会主动联网，也不会替你判断 URL 是否允许采集。它只是按语法拆分。主机名、端口、路径和查询必须继续经过允许列表、规范化与安全校验。

### 2. 百分号编码是字节的可逆表示

URL 中不是所有字符都能直接出现。空格通常编码为 \`%20\`；中文路径会按其 UTF-8 字节编码为多个 \`%XX\`。\`quote\`、\`unquote\` 可以完成转换，但不要对整条 URL 无差别编码：保留 \`:\`、\`/\`、\`?\`、\`&\` 等结构字符，否则会把路径分隔符也编码掉。

### 3. 相对链接必须在正确基准上合并

\`urljoin(base, href)\` 依赖 base 的最后一个斜杠。\`https://shop.test/catalog/2026/\` 表示目录，而 \`https://shop.test/catalog/2026\` 表示一个资源。很多“相对链接解析错”的根因不是 \`urljoin\`，而是 base 少了斜杠。

### 4. 生命周期与失败层位

| 层位 | 典型问题 | 可观察信号 |
| --- | --- | --- |
| URL 解析 | 缺 scheme、错误 host、非法端口 | 本地异常或明显异常值 |
| DNS | 域名不存在、解析超时 | \`gaierror\`、解析耗时高 |
| TCP/TLS | 连接拒绝、证书过期、握手失败 | 连接异常、证书错误 |
| HTTP | 404/403/429/5xx、重定向循环 | 状态码、Location、Retry-After |
| 正文解码/解析 | 编码错、压缩坏、空壳页 | Content-Type、解码异常、结构缺失 |

如果把 TLS 证书错误当成 404 重试，或把 DNS 超时当成“选择器失效”，就会浪费请求且掩盖真正问题。

## 逐步推导与计算

以基础 URL \`https://shop.test/catalog/2026/\` 为例：

1. 相对链接 \`../books/101\`：从 \`/catalog/2026/\` 向上一级到 \`/catalog/\`，再拼 \`books/101\`，结果为 \`https://shop.test/catalog/books/101\`。
2. 根路径 \`/books/102?ref=list\`：直接替换路径，结果为 \`https://shop.test/books/102?ref=list\`。
3. 协议相对 \`//cdn.example.test/cover.png\`：继承当前协议，结果为 \`https://cdn.example.test/cover.png\`。
4. 绝对链接 \`https://shop.test/catalog/2026/?page=2#reviews\`：保留绝对地址；片段仍应单独记录，不能作为服务器请求目标。

如果原链接是 \`mailto:test@example.test\`，\`urljoin\` 可能返回非 HTTP scheme。后续网络请求层必须拒绝，而不是假设它仍是网页。

**请求数量推导**：一个列表页有 12 个链接，其中 2 个重复、1 个是 \`#reviews\` 片段链接、1 个是 \`mailto:\`。去重与过滤后，候选页面数不是 12，而是：

$$
12 - 2 - 1 - 1 = 8
$$

先解析、过滤 scheme，再合并链接，最后按规范化键去重。顺序颠倒会导致错误的计数。

## 图示与机制图解

下面的失败变体强调：同一个“抓取失败”可能发生在完全不同的层位。

<Diagram type="crawl-http-journey" name="failure" />

排查时先问“请求有没有到达 HTTP 层”，而不是先改字符串选择器。DNS 和 TLS 错误根本不会产生可解析的 HTML。

## 完整案例

假设采集器从 \`https://shop.test/catalog/2026/\` 读到四个链接：

| 原始链接 | 合并结果 | 处理决定 |
| --- | --- | --- |
| \`../books/101\` | \`https://shop.test/catalog/books/101\` | 保留，下一步检查 host 与路径 |
| \`/books/102?ref=list\` | \`https://shop.test/books/102?ref=list\` | 保留，追踪参数稍后规范化 |
| \`//cdn.example.test/cover.png\` | \`https://cdn.example.test/cover.png\` | 若只允许 shop.test，则拒绝 |
| \`#reviews\` | \`https://shop.test/catalog/2026/#reviews\` | 通常过滤：没有新资源 |

“拒绝”不是丢弃证据。应记录拒绝原因：跨 host、非 HTTP scheme、片段-only、无效端口等，便于后续审计。

## 代码实践

### 完整 worked example

~~~python
from urllib.parse import urljoin, urlsplit

def inspect_links(base_url, hrefs, allowed_hosts):
    accepted = []
    rejected = []
    for href in hrefs:
        absolute = urljoin(base_url, href)
        parts = urlsplit(absolute)
        if parts.scheme not in {"http", "https"}:
            rejected.append((href, "scheme"))
        elif parts.hostname not in allowed_hosts:
            rejected.append((href, "host"))
        elif not parts.path or parts.path == "/" and not parts.query and not parts.fragment:
            accepted.append(absolute)
        else:
            accepted.append(absolute)
    return accepted, rejected
~~~

**淡出版**：增加一个规则，只拒绝 **片段-only** 的链接。这里的“片段-only”应如何判断？需要考虑查询是否存在。

**独立版**：传入 20 个本地链接，输出 accepted/rejected 表和每类原因的数量。

**迁移版**：把结果送入第 5 章的规范化函数。注意不要在 URL 解析阶段就悄悄删除语义查询。

## 常见误区与安全风险

1. **直接字符串拼接相对链接**：会保留 \`..\`、重复斜杠和错误基准，导致错误请求。
2. **把 fragment 当成资源路径**：通常不会发给服务器，会产生无意义的重复抓取。
3. **只校验域名文本**：真正的网络请求要检查解析后的地址，防止私网或重定向绕过。
4. **信任任意 scheme**：\`file:\`、\`data:\` 等不应交给网页采集器。
5. **忽略 base 的斜杠**：目录与资源只差一个字符，合并结果完全不同。
6. **把所有失败都重试**：DNS、TLS、400/401/403 等往往需要改配置或停手，不是继续请求。

## 与其他知识点的关联

- 第 5 章将系统实现 URL 规范化、host/path 范围和 Frontier 去重。
- 第 6 章会在每个 host 上应用限速与 robots 规则。
- 第 12 章的 SSRF 防线要从这里的 scheme/host 解析延伸到 IP 与重定向检查。
- 项目 1 的坏链接样本会复用本节的三层处理：合并、校验、记录拒绝原因。

## 本节总结

| 结论 | 做法 |
| --- | --- |
| URL 是结构，不是字符串 | 用 \`urlsplit\`/urljoin 处理 |
| fragment 通常不是资源 | 记录后按规则过滤 |
| 失败有层位 | DNS、TLS、HTTP、解码、解析分别诊断 |
| scheme/host 必须白名单 | 拒绝非 HTTP 与未授权主机 |
| 计数前先去重与过滤 | 解析 → 过滤 → 合并 → 去重 |

## 参考资料与延伸阅读

- [标准] IETF RFC 3986, *URI Generic Syntax*：authority、path、query、fragment 的正式语法。https://www.rfc-editor.org/rfc/rfc3986.html
- [官方文档] Python \`urllib.parse\`：urlsplit、parse_qs、urljoin、quote 与 unquote。https://docs.python.org/3/library/urllib.parse.html
- [标准] WHATWG URL Standard：浏览器与 Web 平台采用的 URL 解析规则。https://url.spec.whatwg.org/
- [安全指南] OWASP SSRF Prevention Cheat Sheet：为什么 URL 校验必须延伸到解析后的网络目标。https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html

## 动手实验

1. 用 \`urlsplit\` 拆解 5 条包含端口、查询和片段的 URL，填一张组件表。
2. 用 \`urljoin\` 比较 base 末尾有斜杠和无斜杠的差异。
3. 构造一个片段-only 链接，解释它为什么不应增加抓取队列。
4. 写一个拒绝记录表，至少区分 scheme、host 和片段原因。

**自我解释一**：为什么同一个域名下的相对链接仍需要校验 host 和 scheme？请从安全与抓取范围两方面回答。

**自我解释二**：如果你把 DNS 超时当作 404 处理，会对重试预算和故障定位造成什么后果？
`,
        tips: [
          {
            kind: 'pitfall',
            text: 'urljoin 的结果取决于 base 是否带结尾斜杠；把目录当文件会让相对链接解析到错误层级。',
          },
          {
            kind: 'note',
            text: '先保存原始 href，再保存合并后的绝对 URL，最后保存规范化键。三层证据分开，才方便审计与去重。',
          },
          {
            kind: 'interview',
            text: '排查“抓不到”时，先按 URL、DNS、TLS、HTTP、解码/解析分层，而不是直接怀疑选择器。',
          },
        ],
        demos: [
          {
            title: 'URL 拆分与相对链接合并',
            lang: 'python',
            code: `from urllib.parse import urlsplit, urljoin, parse_qs

base = "https://shop.test/catalog/2026/"
hrefs = ["../books/101", "/books/102?ref=list", "//cdn.example.test/cover.png", "#reviews"]

print(urlsplit("https://shop.test:8443/a?page=2#top"))
for href in hrefs:
    absolute = urljoin(base, href)
    parts = urlsplit(absolute)
    print(href, "->", absolute, "query=", parse_qs(parts.query))`,
          },
        ],
      },
      {
        id: 'web-crawling-c02-l02',
        title: 'HTTP 报文、状态码与响应头',
        difficulty: 3,
        content: `
## 学习目标

学完本节，你应该能够：

1. 读出一段 HTTP 响应的状态行、响应头与正文，并区分方法、状态码和头部含义；
2. 按 1xx/2xx/3xx/4xx/5xx 判断语义，而不是只看“成功/失败”；
3. 用 403、404、410、429、500/502/503 设计重试与停止决策；
4. 正确处理 \`Location\`、\`Content-Type\`、\`Content-Length\`、\`Retry-After\` 与缓存相关头；
5. 用本地原始文本构造可测试的响应解析器，不依赖真实网络。

## 前置知识

- 已理解 URL 和请求生命周期。
- 知道 HTTP 头是键值信息，正文可能为空。
- 能写 Python 函数和条件分支。

## 问题背景

一个只检查 \`status == 200\` 的采集器，会把重定向当成失败，把 204 的空正文当成解析错误，还会对 403 反复重试。反过来，把 429 当永久错误又会过早放弃本来可以恢复的任务。

状态码不是“HTTP 版错误码表”，它描述服务器对请求的响应类别。不同站点可能对同一状态码有不同业务含义，但 HTTP 语义提供了共同起点。

## 直觉理解

把响应看成一张快递单：

- **状态行**：包裹处理结果，例如“成功”“找不到”“请求太多”；
- **响应头**：说明包裹类型、长度、跳转地址、缓存或限速要求；
- **正文**：实际内容，可能是 HTML、JSON、空内容或错误页。

采集器应依次读取这三层，而不是先看正文。状态码决定是否值得继续，头决定如何解码与是否重试，正文才进入解析。

## 核心概念与原理详解

### 1. 原始 HTTP 响应

~~~text
HTTP/1.1 429 Too Many Requests
Content-Type: text/html; charset=utf-8
Retry-After: 30
Content-Length: 84
Connection: keep-alive

<html><body>请求过于频繁，请稍后再试。</body></html>
~~~

第一行包含协议版本、状态码和原因短语。原因短语可读但不应作为程序判断依据，程序应使用数值状态码。响应头按冒号拆分，头部名称大小写不敏感；正文长度可能缺失，因为响应可能分块传输或连接关闭。

### 2. 状态族与采集决策

| 状态 | 含义 | 默认动作 |
| --- | --- | --- |
| 200 | 请求成功 | 读取头与正文，继续做内容校验 |
| 204 | 成功但无正文 | 视为空结果，不进入 HTML 解析 |
| 301/302/307/308 | 重定向 | 读取 Location；限制次数并重新做安全校验 |
| 400 | 请求语法或参数错误 | 通常不重试，检查 URL/参数 |
| 401 | 未认证 | 不绕过；确认授权流程或停止 |
| 403 | 禁止访问 | 不通过换 UA/代理硬闯；检查权限与条款 |
| 404 | 资源不存在 | 可记录删除候选，不立即无限重试 |
| 410 | 资源永久消失 | 更明确的删除信号 |
| 429 | 请求过多 | 遵守 Retry-After 或退避，降低速率 |
| 500/502/503/504 | 服务器或网关临时失败 | 有限重试，指标化失败 |

304 属于缓存验证场景，将在增量采集一节展开；它并不表示“页面永远不变”。

### 3. 头部不是装饰

- \`Content-Type\` 决定正文媒体类型和可能的 charset。
- \`Location\` 提供重定向目标，必须与当前 base 合并并再次校验。
- \`Retry-After\` 可能是秒数或 HTTP 日期，优先于自行估算的退避。
- \`Content-Length\` 可能缺失；不要把它当成绝对可信的完整长度。
- 缓存头（\`ETag\`、\`Last-Modified\`、\`Cache-Control\`）是性能与增量信号，不是内容正确性的证明。

## 逐步推导与计算

假设一次采集出现以下序列：

1. 第 1 次请求返回 503，\`Retry-After: 4\`；
2. 等待 4 秒后第 2 次返回 429，\`Retry-After: 8\`；
3. 等待 8 秒后第 3 次返回 503，没有 Retry-After；
4. 第 4 次返回 200。

如果最大尝试次数为 4，则总请求 4 次、成功 1 次、失败 3 次；等待时间至少为：

$$
4 + 8 + 0 = 12\\text{ 秒}
$$

第 3 次的“没有 Retry-After”不能当作零等待立即重试。应采用有上限的指数退避和抖动，并检查是否仍有请求预算。

### 重定向预算

若一次请求最多允许 5 次跳转，而第 5 次 Location 仍指向新地址，应停止并记录 \`too_many_redirects\`。不要在没有上限的情况下跟随循环重定向。

## 图示与机制图解

下面的表是本节的核心视觉锚点：它把状态码、是否重试、是否改配置和记录什么放在一张决策表里。

| 观察 | 可重试？ | 不该做什么 | 推荐记录 |
| --- | --- | --- | --- |
| 429 + Retry-After | 等待后有限重试 | 立即并发重试 | host、等待秒数、尝试次数 |
| 503/502/504 | 有限重试 | 无限循环 | 状态、退避、最终失败 |
| 403 | 通常否 | 伪造身份或绕过 | 权限/条款待查 |
| 404/410 | 不盲目重试 | 无限重放 | 删除候选与确认次数 |
| 301/302 | 跟随但设上限 | 忽略新目标的安全检查 | 链长与最终 URL |
| 200 空壳 | 不按网络错误重试 | 继续解析空正文 | 结构校验失败证据 |

## 完整案例

两个响应看起来都“返回了 HTML”：

~~~text
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8

<html><body><div id="app"></div></body></html>
~~~

~~~text
HTTP/1.1 403 Forbidden
Content-Type: text/html; charset=utf-8
Retry-After: 60

<html><body>Access denied</body></html>
~~~

第一个是成功响应，但正文可能是 JS 渲染空壳；正确动作是检查结构或在允许前提下寻找数据接口，而不是重试 100 次。第二个是禁止访问，即使正文是 HTML 也不应解析成业务数据。两者的共同点只是 Content-Type，修复策略完全不同。

## 代码实践

### 完整示例：解析原始状态行与头

~~~python
def parse_raw_response(raw):
    head, _, body = raw.partition("\\n\\n")
    lines = head.splitlines()
    version, status, *reason = lines[0].split(" ", 2)
    headers = {}
    for line in lines[1:]:
        if ":" in line:
            name, value = line.split(":", 1)
            headers[name.strip().lower()] = value.strip()
    return {
        "version": version,
        "status": int(status),
        "reason": reason[0] if reason else "",
        "headers": headers,
        "body_length": len(body.encode("utf-8")),
    }
~~~

**淡出练习**：不要使用 \`raw.partition("\\n\\n")\`，改成兼容 \`\\r\\n\\r\\n\` 的本地解析器。先写固定样本测试。

**独立练习**：实现 \`retry_policy(status, headers)\`，返回 \`stop\`、\`retry_after\` 或 \`retry_with_backoff\`，并覆盖 403、404、410、429、503 与 200。

**迁移练习**：把 301 的 Location 合并到当前 URL，并检测重定向最大次数。

## 常见误区与安全风险

1. **把 200 当内容有效**：登录页、空壳页与错误提示都可能 200。
2. **对 403 换 UA 或代理重试**：这是规避访问控制，不是工程修复。
3. **把 429 当永久失败**：应当限速并尊重 Retry-After。
4. **无限跟随重定向**：可能形成循环或跳到未授权 host。
5. **把原因短语当判断依据**：不同服务器可能改写文本，数值状态才是稳定信号。
6. **盲目信任 Content-Length**：分块传输和缺少头都很常见。

## 与其他知识点的关联

- 第 6 章会把 429/503 与 token bucket、退避和指标结合。
- 第 7 章把失败状态持久化，避免重启后丢失重试上下文。
- 第 10 章展开 304、ETag 与 Last-Modified。
- 第 12 章把重定向目标纳入 SSRF 检查，不能跟随到私网地址。

## 本节总结

| 结论 | 行动 |
| --- | --- |
| 状态码先于正文 | 先分类，再决定解析或重试 |
| Retry-After 优先 | 没有时再用有上限退避 |
| 403 不是“再试一次” | 检查权限与范围，不绕过 |
| 404/410 是删除候选 | 需确认，不无限重放 |
| 重定向要限次数并复查 | 每次 Location 重新校验 |

## 参考资料与延伸阅读

- [标准] IETF RFC 9110, *HTTP Semantics*：状态码、头部、方法与缓存语义。https://www.rfc-editor.org/rfc/rfc9110.html
- [标准] IETF RFC 9111, *HTTP Caching*：缓存与验证器基础。https://www.rfc-editor.org/rfc/rfc9111.html
- [官方文档] Python \`http.client\`：HTTP 响应对象与头部读取。https://docs.python.org/3/library/http.client.html
- [工程文档] MDN HTTP response status codes：状态码的入门解释。https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status

## 动手实验

1. 手写一段 429 响应，解析状态、Retry-After 和正文长度。
2. 为 403、404、410、429、503 各写一个决策，包含是否重试与记录字段。
3. 设计一个重定向循环样本，给跟随次数设上限。
4. 把 200 空壳页与正常页放入同一结构校验函数，观察差异。

**自我解释一**：为什么“403 不是自动重试信号”？如果提高并发或更换 UA，问题从工程角度发生了什么变化？

**自我解释二**：为什么 404 不能仅凭一次响应就宣布永久删除？需要哪些重复确认或版本信息？
`,
        tips: [
          {
            kind: 'pitfall',
            text: '状态码 200 只说明请求成功处理，不保证正文是目标内容。必须继续检查 Content-Type、正文结构和字段契约。',
          },
          {
            kind: 'note',
            text: '优先遵守 Retry-After；没有时再使用带抖动的指数退避，并同时受最大尝试次数与总时间预算约束。',
          },
          {
            kind: 'leak',
            text: '不要用随机 User-Agent、代理或高并发绕过 403/429。访问受限时应停手、缩小范围或联系数据所有者。',
          },
        ],
        demos: [
          {
            title: '解析本地 HTTP 响应文本并分类',
            lang: 'python',
            code: `raw = """HTTP/1.1 429 Too Many Requests
Content-Type: text/html; charset=utf-8
Retry-After: 30
Content-Length: 24

slow down"""

head, _, body = raw.partition("\\n\\n")
lines = head.splitlines()
version, status, *reason = lines[0].split(" ", 2)
headers = {}
for line in lines[1:]:
    if ":" in line:
        key, value = line.split(":", 1)
        headers[key.strip().lower()] = value.strip()
print(version, status, reason, headers, len(body.encode("utf-8")))`,
          },
        ],
      },
      {
        id: 'web-crawling-c02-l03',
        title: '会话、编码、超时与重试',
        difficulty: 3,
        content: `
## 学习目标

学完本节，你应该能够：

1. 区分 Cookie、连接复用和会话状态，并只保留任务所需的最小状态；
2. 从 Content-Type、meta charset 与字节前缀判断文本编码，不能假设 UTF-8 永远正确；
3. 区分连接超时、读取超时、总预算和 DNS 超时；
4. 用指数退避、抖动、Retry-After 和最大尝试次数设计可测试的重试策略；
5. 手算三次重试的等待序列与总等待时间，并解释为什么重试会放大负载。

## 前置知识

- 已理解 HTTP 状态码与重定向。
- 会读写文本文件与字节串。
- 能写 Python 函数并用断言验证结果。

## 问题背景

“请求失败了就 sleep 1 秒再试”看起来简单，实际上可能制造三种故障：对永久错误重试，耗尽预算；大量 worker 在同一时刻重试，形成重试风暴；页面编码错误却被当成选择器错误，永远解析不出字段。

一个可用的采集器必须把“何时重新请求”“等待多久”“最多等多久”“哪些错误不应重试”分开配置。会话、编码与超时看似边角，实际决定了系统在真实网络下是否稳定。

## 直觉理解

把重试想成有礼貌的追问：

- 对方说“稍后再说”，你应记录它给的等待时间；
- 对方说“你无权访问”，继续问不会改变权限；
- 对方暂时没有响应，应逐步拉长间隔并加入随机性，避免所有人同时敲门；
- 自己每次追问都有时间成本，所以要有总预算。

编码则像拆快递前先看标签：先用 Content-Type 的 charset，再看 HTML 内部声明和字节特征，最后才尝试合理默认。强行用 UTF-8 解码 GBK 内容，可能得到乱码却不报错。

## 核心概念与原理详解

### 1. 会话与 Cookie

会话是服务器用来关联多次请求的状态，常通过 Cookie 保存。采集任务可能只需要：

- 一个匿名会话的短期 Cookie；
- 语言或地区偏好；
- 服务端设置的 CSRF token（若明确允许自动化访问）。

不应保存与任务无关的登录凭证、跟踪标识或第三方广告 Cookie。测试场景应使用本地假响应或合成 Cookie，不读取真实账号。

连接复用可减少 TLS 握手，但连接池越大，资源与故障面也越大。并发与连接数应单独配置，不能只在最后加一个 \`ThreadPoolExecutor(max_workers=100)\`。

### 2. 编码判断顺序

1. 读取 HTTP \`Content-Type\` 的 \`charset\`；
2. 若缺失，检查响应字节前部的 \`<meta charset=...>\` 或 \`http-equiv\`；
3. 尝试候选编码，记录是否出现替换字符 \`�\`；
4. 若仍不确定，保留原始字节和失败原因，不伪造文本。

Python 的 \`decode(errors="replace")\` 可以避免抛错，但会掩盖数据损坏。用来展示或者降级可以，静默当作正确文本不行。

### 3. 四类超时

| 超时 | 含义 | 配置建议 |
| --- | --- | --- |
| DNS 超时 | 解析域名耗时过长 | 记录并限制并发，不要无限等待 |
| 连接超时 | 建立 TCP/TLS 连接太慢 | 单次请求短、可重试 |
| 读取超时 | 已连接但迟迟收不到数据 | 依据页面大小与站点延迟设置 |
| 总预算 | 一次任务从开始到结束的最长时间 | 高于单次超时，防止无限拖住队列 |

### 4. 带抖动的指数退避

定义第 n 次失败后的等待：

$$
wait_n = \\min(cap, base \\times 2^{n-1}) \\times jitter_n
$$

其中 jitter 在 0.5 到 1.5 之间取值，防止并发客户端同时重试。\`cap\` 限制最大间隔，\`base\` 是基准秒数。服务器提供 \`Retry-After\` 时，优先使用服务器值，再考虑本地上限。

## 逐步推导与计算

设 \`base = 1\` 秒、\`cap = 6\` 秒，三次失败的抖动因子分别为 0.8、1.1、0.9：

| 次数 n | 原始等待 min(cap, 1×2^(n−1)) | 抖动 | 实际等待 |
| --- | --- | --- | --- |
| 1 | 1 | 0.8 | 0.8 秒 |
| 2 | 2 | 1.1 | 2.2 秒 |
| 3 | 4 | 0.9 | 3.6 秒 |

总等待：

$$
0.8 + 2.2 + 3.6 = 6.6\\text{ 秒}
$$

如果 100 个任务同时遇到同一故障，最坏会额外产生 100 × 3 = 300 次请求与 660 秒的聚合等待；若没有抖动，它们会同时冲击服务器。限速与重试必须协同。

若服务器返回 \`Retry-After: 30\`，即使本地第 1 次算出 0.8 秒，也应至少等到 30 秒。若任务总预算只有 20 秒，正确动作是停止并记录，而不是假装等待。

## 图示与机制图解

下图显示退避间隔随失败次数增长，并受上限约束。抖动让不同任务错开，但不会改变最大尝试次数和总预算。

<Diagram type="crawl-rate-limit" name="backoff" />

## 完整案例

一个本地响应序列：

| 尝试 | 结果 | 动作 |
| --- | --- | --- |
| 1 | 503，无 Retry-After | 等待 0.8 秒 |
| 2 | 503，无 Retry-After | 等待 2.2 秒 |
| 3 | 429，Retry-After: 10 | 等待 10 秒（不是 3.6 秒） |
| 4 | 200 | 解码正文、解析、校验 |
| 5 | 不再请求 | 达到成功或最大尝试次数 |

如果第 4 次仍失败且达到最大尝试次数，应记录“预算耗尽”，进入失败队列，而不是继续无限循环。失败队列本身也需要上限和人工处理路径。

## 代码实践

### 完整示例：确定性退避计划

~~~python
def retry_schedule(base=1.0, cap=6.0, jitters=(0.8, 1.1, 0.9), retry_after=None):
    waits = []
    for n, jitter in enumerate(jitters, start=1):
        raw = min(cap, base * 2 ** (n - 1))
        wait = raw * jitter
        if retry_after is not None and n == 1:
            wait = max(wait, retry_after)
        waits.append(round(wait, 2))
    return waits

print(retry_schedule())
print(retry_schedule(retry_after=10))
~~~

**淡出练习**：把总等待预算设为 5 秒，写一个函数只返回在预算内的等待列表。

**独立练习**：为 403、404、429、503 各自定义是否重试，并写测试。

**迁移练习**：将抖动源从固定元组改为可注入的随机函数，保证测试可重复。

## 常见误区与安全风险

1. **固定 sleep**：既慢又不适应站点，无法处理 Retry-After。
2. **对 403 重试**：权限问题不会因等待而消失，换 UA 或代理可能是在规避控制。
3. **所有错误共用一个超时**：DNS、连接、读取与总预算职责不同。
4. **错误解码静默通过**：替换字符会让字段校验看似通过但数据已损坏。
5. **Cookie 全量保存**：把无关会话和个人标识带入日志与长期存储。
6. **无上限重试**：把临时故障变成永久负载和无限队列。

## 与其他知识点的关联

- 第 6 章会把退避与 token bucket、并发和每 host 预算结合。
- 第 7 章会把失败任务写入持久化队列，重启后继续但受预算约束。
- 第 9 章会把解码失败与缺失率变成质量指标。
- 第 12 章会把凭证、Cookie 与日志脱敏纳入安全边界。

## 本节总结

| 结论 | 做法 |
| --- | --- |
| 编码有证据顺序 | Content-Type → meta → 字节 → 记录失败 |
| 重试要有纪律 | Retry-After、上限、抖动、总预算 |
| 不同错误不同处理 | 403/404 不盲重试，429/5xx 有界退避 |
| 会话最小化 | 只保存任务必要状态 |
| 测试确定性 | 注入时钟与抖动，不真实 sleep |

| 公式 | 用途 |
| --- | --- |
| \`wait = min(cap, base × 2^(n−1)) × jitter\` | 第 n 次退避 |
| \`total_wait = Σ wait_n\` | 重试预算 |

## 参考资料与延伸阅读

- [标准] IETF RFC 9110, *HTTP Semantics*：Retry-After、超时相关语义与请求方法。https://www.rfc-editor.org/rfc/rfc9110.html
- [官方文档] Python \`urllib.parse\` 与 \`codecs\`：URL 处理与文本编码工具。https://docs.python.org/3/library/codecs.html
- [标准] WHATWG Encoding Standard：浏览器命名与解码标签。https://encoding.spec.whatwg.org/
- [工程文档] MDN HTTP headers, Retry-After：服务器限速提示。https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After

## 动手实验

1. 给同一个字节串分别用 utf-8 与 gbk 解码，记录异常或乱码。
2. 实现 \`retry_schedule(base, cap, jitters)\`，断言输出为 [0.8, 2.2, 3.6]。
3. 加入 Retry-After=10，验证第 1 次等待被提高到 10 秒。
4. 写一个虚拟时钟，统计 3 次失败 + 1 次成功的总耗时与请求数。

**自我解释一**：为什么 \`decode(errors="replace")\` 不能作为“编码正确”的证据？它可能掩盖哪些数据质量问题？

**自我解释二**：指数退避为什么必须与最大尝试次数、总预算和限速一起配置？只加上抖动足够吗？
`,
        tips: [
          {
            kind: 'pitfall',
            text: '不要用固定 sleep 等待页面或重试。对网络重试使用带抖动的退避与总预算；对页面渲染使用条件等待。',
          },
          {
            kind: 'note',
            text: 'Retry-After 优先于本地计算；若它超过任务总预算，应停止并记录，而不是静默超时。',
          },
          {
            kind: 'leak',
            text: 'Cookie 和会话状态只保留任务需要的最小集合；日志中不要输出完整 Cookie、Authorization 或令牌。',
          },
          {
            kind: 'performance',
            text: '重试是额外请求。失败率越高，重试放大越大；必须和并发限制、每主机配额一起设计。',
          },
        ],
        demos: [
          {
            title: '带 Retry-After 的确定性退避计划',
            lang: 'python',
            code: `def retry_schedule(base=1.0, cap=6.0, jitters=(0.8, 1.1, 0.9), retry_after=None):
    waits = []
    for n, jitter in enumerate(jitters, start=1):
        raw = min(cap, base * 2 ** (n - 1))
        wait = raw * jitter
        if retry_after is not None and n == 1:
            wait = max(wait, retry_after)
        waits.append(round(wait, 2))
    return waits

print("普通退避:", retry_schedule())
print("服务端要求:", retry_schedule(retry_after=10))
print("总等待:", round(sum(retry_schedule()), 2), "秒")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'web-crawling-c02-l01-e01',
        type: 'single',
        difficulty: 2,
        relatedLessonId: 'web-crawling-c02-l01',
        question: '在 URL https://shop.test:8443/catalog?page=2#reviews 中，哪一部分通常不会作为 HTTP 请求目标发送？',
        options: [
          { value: 'A', text: '/catalog' },
          { value: 'B', text: 'page=2' },
          { value: 'C', text: '#reviews' },
          { value: 'D', text: 'shop.test' },
        ],
        answer: 'C',
        explanation:
          'fragment 通常用于客户端文档定位，不随 HTTP 请求发送。路径、查询和主机则参与请求目标的确定。',
        tags: ['URL', 'fragment'],
      },
      {
        id: 'web-crawling-c02-l01-e02',
        type: 'single',
        difficulty: 2,
        relatedLessonId: 'web-crawling-c02-l01',
        question: '基础 URL 为 https://shop.test/catalog/2026/，链接为 ../books/101，正确合并结果是什么？',
        options: [
          { value: 'A', text: 'https://shop.test/catalog/2026/../books/101' },
          { value: 'B', text: 'https://shop.test/catalog/books/101' },
          { value: 'C', text: 'https://shop.test/books/101' },
          { value: 'D', text: 'https://shop.test/catalog/2026/books/101' },
        ],
        answer: 'B',
        explanation:
          '基础 URL 的目录是 /catalog/2026/；../ 退一级到 /catalog/，再进入 books/101。字符串拼接不会消除 ..。',
        tags: ['urljoin', 'URL'],
      },
      {
        id: 'web-crawling-c02-l01-e03',
        type: 'judge',
        difficulty: 2,
        relatedLessonId: 'web-crawling-c02-l01',
        question: '百分号编码可以用标准库完成，但不应把整条 URL 无差别编码，否则可能破坏路径分隔符和查询结构。',
        answer: true,
        explanation:
          '编码要针对具体组件或字符集合。把 /、?、& 等结构字符也编码，会改变 URL 语义。',
        tags: ['百分号编码', 'URL'],
      },
      {
        id: 'web-crawling-c02-l01-e04',
        type: 'judge',
        difficulty: 2,
        relatedLessonId: 'web-crawling-c02-l01',
        question: 'TLS 证书错误与 HTTP 404 都属于同一层失败，使用同一个无限重试策略即可。',
        answer: false,
        explanation:
          'TLS 错误发生在建立安全连接阶段，404 是服务器返回的资源不存在。二者修复方式和重试边界不同。',
        tags: ['故障分层', 'TLS'],
      },
      {
        id: 'web-crawling-c02-l01-e05',
        type: 'multiple',
        difficulty: 2,
        relatedLessonId: 'web-crawling-c02-l01',
        question: '链接进入请求队列前，至少应做哪些处理？',
        options: [
          { value: 'A', text: '与正确 base URL 合并' },
          { value: 'B', text: '限制 scheme 与 host 范围' },
          { value: 'C', text: '处理片段并按规范化键去重' },
          { value: 'D', text: '先访问一次再判断是否允许' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 把授权与范围判断推到访问之后，既增加负载又不合规范。A/B/C 是入队前应做的基本处理。',
        tags: ['链接过滤', '多选'],
      },
      {
        id: 'web-crawling-c02-l01-e06',
        type: 'fill',
        difficulty: 2,
        relatedLessonId: 'web-crawling-c02-l01',
        question:
          '基础 URL 为 https://shop.test/a/b/，相对链接 ../c 合并后为 ___；若链接只有 #top，则通常应先归为 ___ 链接。',
        blanks: [['https://shop.test/a/c'], ['片段', 'fragment', '片段-only']],
        explanation:
          '../c 从 /a/b/ 退到 /a/，再进入 c。只有片段而没有新路径或查询的链接通常不增加新的资源请求。',
        tags: ['urljoin', '填空'],
      },
      {
        id: 'web-crawling-c02-l01-e07',
        type: 'code',
        difficulty: 2,
        relatedLessonId: 'web-crawling-c02-l01',
        question:
          '实现 resolve_http_links(base_url, hrefs, allowed_hosts)。用 urljoin 合并，只保留 http/https 且 hostname 在 allowed_hosts 中的链接；返回去重后的列表，保持首次出现顺序，忽略 fragment 对去重的影响。',
        starterCode: `from urllib.parse import urljoin, urlsplit, urldefrag

def resolve_http_links(base_url, hrefs, allowed_hosts):
    result = []
    seen = set()
    for href in hrefs:
        # TODO: 合并、校验 scheme 与 host、去掉 fragment 后去重
        pass
    return result
`,
        expectedOutput: '规范化后的 HTTP URL 列表',
        tests: `out = resolve_http_links(
    "https://shop.test/catalog/2026/",
    ["../books/101", "/books/101#top", "mailto:a@b.test", "https://other.test/x", "//shop.test/books/102"],
    {"shop.test"},
)
assert out == [
    "https://shop.test/catalog/books/101",
    "https://shop.test/books/101",
    "https://shop.test/books/102",
], out
`,
        answer: `from urllib.parse import urljoin, urlsplit, urldefrag

def resolve_http_links(base_url, hrefs, allowed_hosts):
    result = []
    seen = set()
    for href in hrefs:
        absolute = urljoin(base_url, href)
        parts = urlsplit(absolute)
        if parts.scheme not in {"http", "https"}:
            continue
        if parts.hostname not in allowed_hosts:
            continue
        clean, _ = urldefrag(absolute)
        if clean not in seen:
            seen.add(clean)
            result.append(clean)
    return result
`,
        explanation:
          '先合并，再检查 scheme/host，最后去片段并去重。顺序不能省略；否则 mailto 或跨 host 链接可能进入队列。',
        tags: ['编程', 'urljoin', '白名单'],
      },
      {
        id: 'web-crawling-c02-l01-e08',
        type: 'open',
        difficulty: 3,
        relatedLessonId: 'web-crawling-c02-l01',
        question:
          '某采集任务连续失败：第一次抛 DNS 错误，第二次连接被拒绝，第三次收到 TLS 证书错误，第四次返回 404。请按层位写出排查顺序，并说明哪些情况需要重试、哪些应停止或改配置。',
        referenceAnswer:
          '先确认 DNS 是否解析与超时；再检查目标端口和网络连接；TLS 失败要检查证书、主机名与时间设置，不能绕过校验；404 是应用层资源状态，应记录并检查 URL/资源是否已删除或改版。DNS 临时超时可有限重试；连接拒绝可能需要检查服务状态或端口；TLS 配置错误和 404 不应盲目重试。每一步记录指标与证据。',
        rubric: [
          { point: '按 DNS、TCP/TLS、HTTP 层位order排查', score: 2 },
          { point: '区分临时网络错误与配置/资源错误', score: 2 },
          { point: '明确不绕过证书、不无限重试', score: 2 },
          { point: '记录证据与停止条件', score: 1 },
        ],
        keywords: ['DNS', 'TLS', '404', '重试', '证书', '证据'],
        explanation:
          '同一句“失败”背后是不同层位。高分答案会把诊断、重试与安全边界放在一起。',
        tags: ['简答', '故障排查'],
      },
      {
        id: 'web-crawling-c02-l02-e01',
        type: 'single',
        difficulty: 3,
        relatedLessonId: 'web-crawling-c02-l02',
        question: '收到 429 Too Many Requests 且响应头为 Retry-After: 30，最合理的下一步是？',
        options: [
          { value: 'A', text: '立即并发发出同样的请求，争取更快成功' },
          { value: 'B', text: '至少等待 30 秒并降低该 host 的发送速率，再在预算内重试' },
          { value: 'C', text: '更换 User-Agent 后立即重试' },
          { value: 'D', text: '当作永久删除，永远不再访问' },
        ],
        answer: 'B',
        explanation:
          '429 明确要求降低速率。Retry-After 应优先遵守，并同步调整每 host 限速；替换 UA 不是工程修复。',
        tags: ['状态码', '429'],
      },
      {
        id: 'web-crawling-c02-l02-e02',
        type: 'single',
        difficulty: 3,
        relatedLessonId: 'web-crawling-c02-l02',
        question: '403 与 404 的核心区别是？',
        options: [
          { value: 'A', text: '403 表示禁止访问，404 表示资源不存在' },
          { value: 'B', text: '403 可以自动绕过，404 不能' },
          { value: 'C', text: '两者都表示服务器宕机' },
          { value: 'D', text: '两者都必须无限重试' },
        ],
        answer: 'A',
        explanation:
          '403 与权限/访问控制相关，404 与资源定位相关。前者不应绕过，后者可进入删除候选但需要确认。',
        tags: ['状态码', '权限'],
      },
      {
        id: 'web-crawling-c02-l02-e03',
        type: 'judge',
        difficulty: 3,
        relatedLessonId: 'web-crawling-c02-l02',
        question: 'HTTP 的原因短语（例如 Too Many Requests）可以作为程序判断的唯一依据。',
        answer: false,
        explanation:
          '原因短语可读但可被改写，程序应使用数值状态码和头部字段。',
        tags: ['HTTP 报文', '解析'],
      },
      {
        id: 'web-crawling-c02-l02-e04',
        type: 'judge',
        difficulty: 3,
        relatedLessonId: 'web-crawling-c02-l02',
        question: '200 状态码配合空壳 HTML，仍然需要通过正文结构与字段校验判断业务是否成功。',
        answer: true,
        explanation:
          '200 仅表示请求被成功处理。登录页、空容器或异常页面都可能是 200，所以需要结构校验。',
        tags: ['200', '内容校验'],
      },
      {
        id: 'web-crawling-c02-l02-e05',
        type: 'multiple',
        difficulty: 3,
        relatedLessonId: 'web-crawling-c02-l02',
        question: '哪些响应应默认避免盲目立即重试？',
        options: [
          { value: 'A', text: '403 Forbidden' },
          { value: 'B', text: '404 Not Found' },
          { value: 'C', text: '401 Unauthorized' },
          { value: 'D', text: '200 OK' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          '403/401 涉及权限与认证，404 涉及资源定位，都不应以立即重试解决。200 成功响应也不应重试，除非是内容校验失败且有明确策略。',
        tags: ['状态码', '多选'],
      },
      {
        id: 'web-crawling-c02-l02-e06',
        type: 'fill',
        difficulty: 3,
        relatedLessonId: 'web-crawling-c02-l02',
        question:
          '响应为 503 且 Retry-After: 5 时，优先等待 ___ 秒；如果最大尝试次数为 3，已经失败 3 次，则应 ___。',
        blanks: [['5', '五'], ['停止', '进入失败队列', 'stop']],
        explanation:
          'Retry-After 是服务器给出的等待建议；达到最大尝试次数后应停止，记录失败并进入后继处理，而不是无限重试。',
        tags: ['重试', '填空'],
      },
      {
        id: 'web-crawling-c02-l02-e07',
        type: 'code',
        difficulty: 3,
        relatedLessonId: 'web-crawling-c02-l02',
        question:
          '实现 classify_response(status, headers)。200/204 返回 "ok"；404/410 返回 "missing"；403/401 返回 "stop"；429 返回 "retry_after"；500/502/503/504 返回 "retry_backoff"；301/302/307/308 返回 "redirect"；其他返回 "unknown"。headers 键可能为大小写混合。',
        starterCode: `def classify_response(status, headers):
    # TODO: 根据 status 和 headers 返回分类
    pass
`,
        expectedOutput: '响应分类字符串',
        tests: `assert classify_response(200, {}) == "ok"
assert classify_response(204, {}) == "ok"
assert classify_response(404, {}) == "missing"
assert classify_response(410, {}) == "missing"
assert classify_response(403, {}) == "stop"
assert classify_response(401, {}) == "stop"
assert classify_response(429, {"Retry-After": "30"}) == "retry_after"
assert classify_response(503, {}) == "retry_backoff"
assert classify_response(302, {"Location": "/next"}) == "redirect"
assert classify_response(418, {}) == "unknown"
`,
        answer: `def classify_response(status, headers):
    if status in (200, 204):
        return "ok"
    if status in (404, 410):
        return "missing"
    if status in (401, 403):
        return "stop"
    if status == 429:
        return "retry_after"
    if status in (500, 502, 503, 504):
        return "retry_backoff"
    if status in (301, 302, 307, 308):
        return "redirect"
    return "unknown"
`,
        explanation:
          '先按状态族分类，再由上层结合 Retry-After、尝试次数与总预算决定具体等待。分类函数保持纯粹，便于测试。',
        tags: ['编程', '状态码', '分类'],
      },
      {
        id: 'web-crawling-c02-l02-e08',
        type: 'code',
        difficulty: 3,
        relatedLessonId: 'web-crawling-c02-l02',
        question:
          '实现 parse_response_head(raw)。输入以空行分隔头与正文的原始响应文本，返回 dict：status（int）、reason、headers（小写键）、body。兼容 \\n\\n 与 \\r\\n\\r\\n 分隔。',
        starterCode: `def parse_response_head(raw):
    # TODO: 解析状态行、头与正文
    pass
`,
        expectedOutput: '响应头字典',
        tests: `raw = "HTTP/1.1 429 Too Many Requests\\r\\nContent-Type: text/html\\r\\nRetry-After: 30\\r\\n\\r\\nslow"
out = parse_response_head(raw)
assert out["status"] == 429, out
assert out["reason"] == "Too Many Requests", out
assert out["headers"]["retry-after"] == "30", out
assert out["body"] == "slow", out
`,
        answer: `import re

def parse_response_head(raw):
    match = re.search(r"\\r?\\n\\r?\\n", raw)
    if not match:
        head, body = raw, ""
    else:
        head, body = raw[:match.start()], raw[match.end():]
    lines = head.replace("\\r\\n", "\\n").split("\\n")
    version, status, *reason = lines[0].split(" ", 2)
    headers = {}
    for line in lines[1:]:
        if ":" in line:
            key, value = line.split(":", 1)
            headers[key.strip().lower()] = value.strip()
    return {"status": int(status), "reason": reason[0] if reason else "", "headers": headers, "body": body}
`,
        explanation:
          '状态行与头部是结构化信息，正文从第一个空行之后开始。正则只是用来兼容换行差异，头字段仍按冒号拆分。',
        tags: ['编程', 'HTTP 报文', '正则'],
      },
      {
        id: 'web-crawling-c02-l02-e09',
        type: 'open',
        difficulty: 3,
        relatedLessonId: 'web-crawling-c02-l02',
        question:
          '一个采集任务返回 403，但同一路径换成随机 User-Agent 后返回 200。请从 HTTP 语义、合规与工程可靠性三个角度说明为什么不应把这当作解决方案。',
        referenceAnswer:
          '403 表示服务器拒绝当前访问上下文；换 UA 可能绕过站点的访问控制或条款，而不是修复授权问题。工程上，这种方案脆弱且不可审计，无法保证未来仍可用，也让你无法区分真正的权限、限速或页面改版。正确动作是停止采集、检查来源授权与服务条款、联系数据所有者或改用公开 API；若属于误拦截，应通过正式渠道解决。不要把绕过作为“重试策略”。',
        rubric: [
          { point: '识别 403 的权限/访问语义', score: 2 },
          { point: '指出换 UA 的合规风险与不可审计性', score: 2 },
          { point: '给出正式改源、沟通或停止策略', score: 2 },
          { point: '提到工程可靠性和可复现性', score: 1 },
        ],
        keywords: ['403', 'User-Agent', '授权', '条款', '停止'],
        explanation:
          '高分答案不讨论“更隐蔽的绕过技巧”，而是把技术现象连接到授权、可维护性与停止机制。',
        tags: ['简答', '合规', '状态码'],
      },
      {
        id: 'web-crawling-c02-l02-e10',
        type: 'open',
        difficulty: 3,
        relatedLessonId: 'web-crawling-c02-l02',
        question:
          '设计一个状态码决策表，至少覆盖 200、301、403、404、429、503。说明每种状态的业务含义、是否重试、记录字段和停止条件。',
        referenceAnswer:
          '答案应包含：200 成功，进入内容解析与校验；301 允许跟随但设置重定向上限并重新校验目标；403 不重试、记录权限/条款问题并停止；404 作为缺失候选，记录但不立即无限重试；429 遵守 Retry-After 或退避并降低该 host 速率；503 有限重试、记录退避和最终失败。每种状态记录 URL、状态、尝试次数、等待、最终分类与证据。',
        rubric: [
          { point: '覆盖六种状态且语义正确', score: 3 },
          { point: '区分可重试与不可重试', score: 2 },
          { point: '记录重定向/等待/尝试次数', score: 2 },
          { point: '有明确停止条件', score: 1 },
        ],
        keywords: ['200', '301', '403', '404', '429', '503', '停止'],
        explanation:
          '决策表的价值在于让代码和运维说同一种语言，而不是把状态码解释成模糊的“失败”。',
        tags: ['简答', '状态码', '决策表'],
      },
      {
        id: 'web-crawling-c02-l03-e01',
        type: 'single',
        difficulty: 3,
        relatedLessonId: 'web-crawling-c02-l03',
        question: '处理文本响应时，最优先的编码证据通常来自哪里？',
        options: [
          { value: 'A', text: '猜一个最常见的编码' },
          { value: 'B', text: 'Content-Type 的 charset，其次 meta 声明与字节检查' },
          { value: 'C', text: '用户浏览器的界面语言' },
          { value: 'D', text: '文件名的扩展名' },
        ],
        answer: 'B',
        explanation:
          '编码应由响应头、文档声明与可验证字节共同推断；强行使用单一默认会把乱码当成成功数据。',
        tags: ['编码', 'Content-Type'],
      },
      {
        id: 'web-crawling-c02-l03-e02',
        type: 'single',
        difficulty: 3,
        relatedLessonId: 'web-crawling-c02-l03',
        question: 'base=1、cap=6，抖动分别为 0.8、1.1、0.9。三次重试的实际等待序列是？',
        options: [
          { value: 'A', text: '0.8, 1.1, 0.9' },
          { value: 'B', text: '0.8, 2.2, 3.6' },
          { value: 'C', text: '1, 2, 3' },
          { value: 'D', text: '6, 6, 6' },
        ],
        answer: 'B',
        explanation:
          '原始等待为 1、2、4 秒，乘对应抖动后为 0.8、2.2、3.6 秒。',
        tags: ['退避', '计算'],
      },
      {
        id: 'web-crawling-c02-l03-e03',
        type: 'judge',
        difficulty: 3,
        relatedLessonId: 'web-crawling-c02-l03',
        question: 'decode(errors="replace") 能避免异常，因此可以直接证明文本编码和字段内容都正确。',
        answer: false,
        explanation:
          '替换字符只是降级显示，不能证明编码正确。它可能掩盖数据损坏，导致字段校验误判。',
        tags: ['编码', '数据质量'],
      },
      {
        id: 'web-crawling-c02-l03-e04',
        type: 'judge',
        difficulty: 3,
        relatedLessonId: 'web-crawling-c02-l03',
        question: '服务器给出 Retry-After: 30，而本地退避算出 1 秒；若任务预算足够，应至少等待 30 秒。',
        answer: true,
        explanation:
          'Retry-After 表达服务器要求，优先于本地估算。若预算不足以等待，应停止并记录，而不是提前重试。',
        tags: ['Retry-After', '重试'],
      },
      {
        id: 'web-crawling-c02-l03-e05',
        type: 'multiple',
        difficulty: 3,
        relatedLessonId: 'web-crawling-c02-l03',
        question: '一个可测试的重试策略应包含哪些部分？',
        options: [
          { value: 'A', text: '哪些状态或异常可重试' },
          { value: 'B', text: '最大尝试次数与总时间预算' },
          { value: 'C', text: '退避、抖动与 Retry-After 处理' },
          { value: 'D', text: '对 403 自动更换身份' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 是绕过访问控制，不属于重试策略。A/B/C 构成可解释、可测试的策略。',
        tags: ['重试策略', '多选'],
      },
      {
        id: 'web-crawling-c02-l03-e06',
        type: 'fill',
        difficulty: 3,
        relatedLessonId: 'web-crawling-c02-l03',
        question:
          '一次任务最多追加 3 轮重试，首轮有 500 个请求且失败率 20%。按失败率估算，第 1 次重试请求约为 ___ 次；若把每轮都按最坏情况（500 个请求全部重试）预留，3 轮额外请求最多为 ___ 次。',
        blanks: [['100'], ['1500']],
        explanation:
          '按 20% 失败率估算，第 1 次重试量约 500×0.2=100；3 轮重试的最坏请求预算为 3×500=1500。前者用于容量估算，后者用于防止故障时被重试放大拖垮；实际实现必须同时设置最大尝试次数、总时间预算与每主机配额。',
        tags: ['重试预算', '填空'],
      },
      {
        id: 'web-crawling-c02-l03-e07',
        type: 'code',
        difficulty: 3,
        relatedLessonId: 'web-crawling-c02-l03',
        question:
          '实现 retry_schedule(base=1, cap=6, jitters=(0.8, 1.1, 0.9), retry_after=None)。原始等待为 min(cap, base × 2^(n-1))；乘以第 n 个抖动；若 retry_after 传入则第 1 次等待取 max(0.8, retry_after)。返回保留两位小数的列表。',
        starterCode: `def retry_schedule(base=1, cap=6, jitters=(0.8, 1.1, 0.9), retry_after=None):
    waits = []
    # TODO: 生成确定性退避序列
    return waits
`,
        expectedOutput: '等待秒数列表',
        tests: `assert retry_schedule() == [0.8, 2.2, 3.6], retry_schedule()
assert retry_schedule(retry_after=10) == [10.0, 2.2, 3.6], retry_schedule(retry_after=10)
assert retry_schedule(base=2, cap=6) == [1.6, 4.4, 5.4], retry_schedule(base=2, cap=6)
`,
        answer: `def retry_schedule(base=1, cap=6, jitters=(0.8, 1.1, 0.9), retry_after=None):
    waits = []
    for n, jitter in enumerate(jitters, start=1):
        raw = min(cap, base * 2 ** (n - 1))
        wait = raw * jitter
        if retry_after is not None and n == 1:
            wait = max(wait, retry_after)
        waits.append(round(wait, 2))
    return waits
`,
        explanation:
          '退避序列应是纯函数，抖动与 Retry-After 可注入，测试才可重复。第 1 次失败使用 n=1，即 2 的 0 次方。',
        tags: ['编程', '退避', '测试'],
      },
      {
        id: 'web-crawling-c02-l03-e08',
        type: 'code',
        difficulty: 3,
        relatedLessonId: 'web-crawling-c02-l03',
        question:
          '实现 decode_body(raw_bytes, content_type)。如果 content_type 包含 charset=xxx，就用该编码解码；否则先尝试 utf-8，失败再尝试 gbk；都失败则返回 None。返回值是解码后的字符串或 None，不能使用 errors="replace" 掩盖所有失败。',
        starterCode: `def decode_body(raw_bytes, content_type):
    # TODO: 从 content_type 提取 charset，再按候选编码解码
    pass
`,
        expectedOutput: '解码文本或 None',
        tests: `assert decode_body("你好".encode("utf-8"), "text/html; charset=utf-8") == "你好"
assert decode_body("你好".encode("gbk"), "text/html; charset=gbk") == "你好"
assert decode_body("你好".encode("gbk"), "text/html") == "你好"
assert decode_body(b"\\xff\\xfe\\x00", "text/plain") is None
`,
        answer: `def decode_body(raw_bytes, content_type):
    marker = "charset="
    lower = content_type.lower()
    if marker in lower:
        index = lower.index(marker) + len(marker)
        charset = content_type[index:].split(";", 1)[0].strip().strip('"')
        try:
            return raw_bytes.decode(charset)
        except (LookupError, UnicodeDecodeError):
            return None
    for encoding in ("utf-8", "gbk"):
        try:
            return raw_bytes.decode(encoding)
        except UnicodeDecodeError:
            continue
    return None
`,
        explanation:
          '先信任显式 charset，但对其失败仍要返回不可解码而不是伪造文本。无 charset 时尝试候选编码；测试覆盖 UTF-8、GBK 和无效字节。',
        tags: ['编程', '编码', '容错'],
      },
      {
        id: 'web-crawling-c02-l03-e09',
        type: 'open',
        difficulty: 3,
        relatedLessonId: 'web-crawling-c02-l03',
        question:
          '你的 100 个 worker 同时收到 503。写出一个防止重试风暴的策略，涵盖重试状态、等待时间、最大次数、总预算、日志指标和降级动作。',
        referenceAnswer:
          '临时错误进入带尝试次数的失败队列；优先读取 Retry-After；否则使用 base×2^(n−1) 封顶并加抖动的等待；每个任务有最大尝试次数和总耗时预算；按 host 限速与全局并发限制，不能所有 worker 同时重试；记录状态、host、attempt、wait、final_outcome、队列积压；达到上限进入死信/人工处理并降低并发。若持续失败，应熔断该 host 并停止新任务派发。',
        rubric: [
          { point: '区分临时错误并设置尝试次数', score: 2 },
          { point: '包含 Retry-After、退避和抖动', score: 2 },
          { point: '提到并发/每 host 限速与总预算', score: 2 },
          { point: '包含指标、死信与熔断降级', score: 1 },
        ],
        keywords: ['503', 'Retry-After', '退避', '抖动', '并发', '熔断', '死信'],
        explanation:
          '重试策略不是单次 sleep，而是一套有预算、有指标、有停止条件的系统行为。',
        tags: ['简答', '重试', '运维'],
      },
      {
        id: 'web-crawling-c02-l03-e10',
        type: 'open',
        difficulty: 3,
        relatedLessonId: 'web-crawling-c02-l03',
        question:
          '从网页响应中解出一段中文文本时出现乱码。请给出按证据顺序的排查流程，并说明什么情况下应停止并保留原始字节。',
        referenceAnswer:
          '先检查 Content-Type 的 charset，再检查 HTML meta 声明，然后按候选编码对字节解码，观察异常与替换字符；检查响应是否被压缩或截断。若各证据互相冲突或没有可验证的 charset，记录候选、异常和原始字节摘要，停止把乱码当作有效字段。必要时保留少量原始字节/哈希用于复核，但避免长期保存不必要正文。不要把 errors=replace 后的文本直接入库。',
        rubric: [
          { point: '按 Content-Type → meta → 字节顺序排查', score: 2 },
          { point: '识别替换字符、截断或压缩问题', score: 2 },
          { point: '冲突时保留证据并停止伪数据', score: 2 },
          { point: '提到最小化保存原始正文', score: 1 },
        ],
        keywords: ['charset', 'meta', '乱码', '替换字符', '原始字节'],
        explanation:
          '编码问题的核心是证据链。没有证据时宁可标记失败，也不要把乱码当成正确数据。',
        tags: ['简答', '编码', '调试'],
      },
    ],
  },
];
