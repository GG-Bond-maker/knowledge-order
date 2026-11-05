import type { Chapter } from '../../../types';

export const webCrawlingChapters01: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'web-crawling-c01',
    title: '从网页到数据：爬虫是什么',
    goal: '建立浏览器、HTTP、HTML、DOM 与抽取器之间的正确心智模型，完成第一次离线解析，并理解采集边界。',
    lessons: [
      {
        id: 'web-crawling-c01-l01',
        title: '网页、浏览器与数据采集：建立正确心智模型',
        difficulty: 2,
        content: `
## 学习目标

学完本节，你应该能够：

1. 区分**服务器返回的 HTML 字节流**、浏览器构建的**渲染页面**、DOM 树、结构化记录与信息抽取结果；
2. 沿 URL → DNS → TCP/TLS → HTTP 请求 → 响应 → HTML → DOM → 字段的顺序，解释一次网页访问；
3. 面对一个数据需求时，依次判断公开 API、公开数据下载、静态 HTML、浏览器渲染四条路径，而不是条件反射地写爬虫；
4. 用一个简单的请求预算模型说明“页面数、链接数、重复率、重试率”如何共同放大采集负载。

本课程默认你已会 Python 的变量、列表/字典、循环、函数、文件读写和异常处理，但从未写过爬虫。

## 前置知识

- 能读懂 Python 字典和列表：\`{"title": "HTTP 入门", "price": 59.0}\`。
- 知道客户端向服务器发出请求、服务器返回内容这一基本方向。
- 会用浏览器开发者工具打开 Network 面板更好，但本节不要求你先掌握它。

如果这些概念还不稳，不需要先学完整个 Web 开发；本节会先把最重要的边界讲清楚。真正的爬虫工程不是“会某个库”，而是知道自己在请求什么、拿到什么、能对什么负责。

## 问题背景

设想你要为学校整理一份公开书单：页面列出书名、价格和详情链接，最终需要一份可校验的 \`books.json\`。最直觉的做法是复制网页文字，但复制无法稳定重复：100 本书还行，10,000 本就会漏项、错位和重跑。

第二个直觉是“打开网页，然后抓页面”。可是服务器到底返回了什么？浏览器显示的又是什么？如果页面打开后由 JavaScript 再填内容，第一次 HTTP 响应里可能只有空容器。此时把 HTML 当最终页面，就会得到一张“所有字段都为空”的表。

所以第一课不是先学抓取库，而是先建立一个能预测失败的心智模型：**网页是请求与响应的产物，DOM 是解析后的结构，数据记录是你从结构中做出的有证据的决定**。

## 直觉理解

把一次访问想成寄一封可追踪的信：

1. 你写下收件地址（URL）；
2. 邮局把域名翻译成实际地址（DNS）；
3. 双方建立运输通道并确认身份（TCP/TLS）；
4. 你寄出请求，说明要哪份资料（HTTP）；
5. 对方寄回状态、格式说明和正文（响应）；
6. 你把正文按语法拆成目录树（HTML → DOM）；
7. 你从目录树中取出几个格子，填入自己的记录（抽取）。

这七步中任何一步坏了，最终都可能表现成“没有数据”。如果只盯着最后一步的抽取器，就会把 DNS 超时、403、错误编码或空壳页面都误诊成“选择器写错”。

另一个重要区分是“客户端”和“服务器”。浏览器是客户端，它替你做 DNS、连接、HTTP、渲染和脚本执行。爬虫也是客户端，只是把其中一部分动作写进程序。**能被浏览器显示，不代表你的程序自动拥有浏览器能力**；多数 Python 采集程序只发送 HTTP 请求，不会执行页面里的 JavaScript。

## 核心概念与原理详解

### 1. URL、响应与 DOM 不是同一层东西

- **URL** 是资源的定位信息，不等同于文件路径。它包含协议、主机、端口、路径、查询与片段等部分。
- **HTTP 响应** 包含状态码、响应头和正文。状态码 200 只表示服务器成功处理了请求，不保证正文是预期页面，也不保证字段齐全。
- **HTML** 是响应的正文格式之一。它描述元素、属性和文本，但也可能不完整、被压缩、需要特定字符集解码。
- **DOM** 是解析器按文档结构建立的节点树。浏览器的 DOM 还可能被 JavaScript 修改。
- **结构化记录** 是你抽取并规范化后的数据，例如 \`{"title": "HTTP 入门", "price": 59.0, "source_url": "..."}\`。它必须附带来源、时间和抽取版本，才能被复核。

### 2. 四条数据路径，优先级从高到低

| 路径 | 优先判断理由 | 常见边界 |
| --- | --- | --- |
| 公开 API | 字段稳定、分页明确、错误可读，通常比解析页面可靠 | 需要遵守密钥、配额、条款与速率限制 |
| 公开数据下载 | CSV/JSON/压缩包可一次校验，重复成本低 | 文件可能很大，需检查许可与更新时间 |
| 静态 HTML | 无需执行 JavaScript，标准库即可解析 | 结构可能改版，正文可能是空壳 |
| 浏览器渲染 | 仅在必须执行页面脚本时使用 | 启动重、内存高、等待逻辑复杂、可测试性差 |

这不是说 API 永远最好，而是要求你先问“有没有更稳定的数据契约”。爬虫应解决**没有合适接口但仍被允许获取**的问题，而不是绕过所有接口设计。

### 3. 请求预算为什么必须先算

假设有 20 个列表页，每页 30 个详情链接，预计 3% 链接重复，详情请求有 4% 需要一次重试。发现详情链接数为：

$$
20 \\times 30 = 600
$$

去重后的唯一详情数为：

$$
600 \\times (1 - 0.03) = 582
$$

需要重试的数量向上取整：

$$
\\lceil 582 \\times 0.04 \\rceil = \\lceil 23.28 \\rceil = 24
$$

总请求数约等于列表页、唯一详情页与重试之和：

$$
20 + 582 + 24 = 626
$$

如果这个结果远超站点允许的额度，问题不在“重试写得不够聪明”，而在采集范围本身需要缩小。先算预算，再谈实现。

## 逐步推导与计算

把上面的推导拆成可复核的步骤：

1. **发现量**：列表页数量 × 每页链接数 = 20 × 30 = 600。
2. **去重量**：发现量 × 重复比例 = 600 × 0.03 = 18；唯一详情 = 600 − 18 = 582。
3. **重试量**：唯一详情 × 临时失败比例 = 582 × 0.04 = 23.28；请求只能取整数，因此需要准备 24 次重试。
4. **总预算**：20 + 582 + 24 = 626。
5. **压力分配**：如果平均分摊到 10 分钟，约每秒 1.04 个请求；这仍然只是平均值，实际还要配置单主机并发与突发上限。

注意两个常见错误：把重复链接也计入重试分母，会高估；把所有请求都假定成功，会低估。预算模型不必复杂，但假设必须写出来，才能根据真实日志修正。

## 图示与机制图解

下面的图把一次网页访问拆成可诊断的层级。出现“抓不到”时，先按层级定位，不要直接改选择器。

<Diagram type="crawl-http-journey" name="overview" />

图中每一层都有自己的失败方式：DNS 超时、TLS 证书错误、HTTP 4xx/5xx、正文编码错误、HTML 空壳或解析结构改变。它们需要不同的修复，而不是同一种“重试”。

## 完整案例

同一个商品页可能有三种形态：

| 视角 | 你看到的东西 | 合适的采集策略 |
| --- | --- | --- |
| 公开 JSON API | \`{"id":"A17","name":"机械键盘","price":399}\` | 校验 schema、分页和速率，直接保存字段 |
| 服务端渲染 HTML | 标题、价格和链接已出现在响应正文 | 用 HTML 解析器按结构抽取，保留来源 URL |
| 浏览器渲染后的 DOM | 初始 HTML 只有空容器，脚本随后填充 | 先查公开接口；确需执行脚本时才使用浏览器自动化 |

假设你拿到的是第二种形态。你的程序不应该直接“找页面里所有数字”，而应该建立字段映射：标题来自 \`h2\`，价格来自带 \`price\` 类的元素，链接来自 \`a[href]\`。然后把相对链接与页面基础 URL 合并，把价格字符串规范成数字，把缺失价格记为“未知”而不是 0。这样同一份程序才能在结构轻微变化时给出可解释的错误。

## 代码实践

先完成一个最小 work example：只计算请求预算，不访问网络。

~~~python
from math import ceil

def request_budget(listing_pages, links_per_page, duplicate_rate=0.03, retry_rate=0.04):
    discovered = listing_pages * links_per_page
    unique_details = round(discovered * (1 - duplicate_rate))
    retries = ceil(unique_details * retry_rate)
    total = listing_pages + unique_details + retries
    return {
        "discovered": discovered,
        "unique_details": unique_details,
        "retries": retries,
        "total_requests": total,
    }

print(request_budget(20, 30))
~~~

**完整示例的预期输出**：\`{"discovered": 600, "unique_details": 582, "retries": 24, "total_requests": 626}\`。

**淡出练习一**：如果每页只有 15 个链接，其他比例不变，先手算再去掉 \`print\` 验证。

**淡出练习二**：如果详情页有 10% 临时失败，预算会变成多少？先写出公式，再改参数。

**独立练习**：为你的目标站点写一个预算表，至少包含列表页、详情页、重试、预计耗时和停止条件。

**迁移练习**：把“列表页 → 详情页”换成分页 JSON API：页数 × 每页记录数，重复率改为业务主键重复率。公式不变，但字段不同。

## 常见误区与安全风险

1. **把浏览器里看到的页面当成 HTTP 原始响应**。浏览器会执行脚本、应用样式、填充缓存；你的请求不一定发生同样的事。
2. **把 200 当成成功**。登录页、同意页、空壳页面、反爬提示都可能是 200。成功必须由正文结构、字段契约和内容质量共同验证。
3. **直接拼相对链接**。\`"../books/1"\` 与 \`"/books/1"\` 在新旧路径下结果不同，必须使用标准 URL 合并规则。
4. **公开可见就随便采集**。可见性不是授权。课程后续会把授权、隐私、目的限制和 robots.txt 分开讨论。
5. **把“重试”当成解决所有故障**。400、401、403、404 等错误通常不会通过反复请求消失；重试还可能放大对站点的负载。
6. **在代码和日志中保存不必要的个人信息**。采集范围最小化，日志同样需要最小化。

## 与其他知识点的关联

- 下一节将把本节的心智模型落到一个固定 HTML 字符串上，用标准库完成第一次离线解析。
- 第 2 章展开 URL、HTTP 状态码、编码、超时和重试；本节的计算会成为重试预算的起点。
- 第 5 章的 URL 规范化与 Frontier 会把“发现 600 个链接”变成可去重、可排序的队列。
- 第 8 章讨论 SSR、CSR、浏览器渲染和 Playwright；本节的四路径判断可直接迁移。
- 第 12 章会把授权、隐私和 SSRF 纳入系统设计，本节只建立“范围先行”的意识。

## 本节总结

| 必须区分 | 一句话 |
| --- | --- |
| 原始响应 | 服务器返回的字节与头，不等于渲染后的页面 |
| DOM | 解析后的元素树，可能被脚本修改 |
| 抽取记录 | 有字段、来源、时间和校验结果的业务数据 |
| 数据路径 | API、公开下载、静态 HTML、浏览器渲染要按成本和稳定性排序 |
| 请求预算 | 页面数 × 链接数 × 重复率与重试率共同决定负载 |

最重要的结论：**不要从“我要写爬虫”开始，而要从“我需要什么字段、允许用什么来源、哪条路径最稳定”开始。**

## 参考资料与延伸阅读

- [教材] Christopher D. Manning, Prabhakar Raghavan, Hinrich Schütze, *Introduction to Information Retrieval*, Cambridge University Press, 2008；第 20 章讨论 Web 采集与索引。出版社书目：https://doi.org/10.1017/CBO9780511809071；Stanford 在线版（补充链接）：https://nlp.stanford.edu/IR-book/information-retrieval-book.html
- [标准] WHATWG, *HTML Living Standard*：HTML 解析、DOM 与浏览器处理的规范入口。https://html.spec.whatwg.org/
- [标准] IETF RFC 3986, *Uniform Resource Identifier (URI): Generic Syntax*：URL 分层语法与解析规则。https://www.rfc-editor.org/rfc/rfc3986.html
- [工程文档] Python 3 文档，\`html.parser\`：标准库 HTML 解析器。https://docs.python.org/3/library/html.parser.html

## 动手实验

1. 选一个公开的商品或书目页面，只观察不采集，画出 URL → 响应 → DOM → 字段的链路图。
2. 在开发者工具 Network 中找一次 HTML 文档响应，记录状态码、Content-Type、字符集和正文长度。
3. 用本节的预算函数替换成你的目标页面数量，写出停止条件。
4. 设计一个“API 优先”的替代方案：如果站点提供公开 JSON，需要哪些字段和分页信息？

**自我解释一**：为什么“浏览器能看见”不能证明 Python 请求一定能拿到同样的内容？请从脚本执行和 DOM 修改两个角度回答。

**自我解释二**：如果把重试率从 4% 提高到 20%，总请求数为什么不是简单增加 16 个百分点？请指出分母和取整规则的影响。
`,
        tips: [
          {
            kind: 'pitfall',
            text: 'HTTP 200 只表示请求被成功处理，不表示正文就是目标页面。请用结构、字段和内容校验判断“业务成功”。',
          },
          {
            kind: 'note',
            text: '始终把“原始响应、DOM、结构化记录”写成三个不同的对象；混为一谈会让调试变成猜谜。',
          },
          {
            kind: 'performance',
            text: '在写任何抓取代码前先算请求预算。页面数 × 链接数会把小需求迅速放大，重试又会在故障时成倍增加负载。',
          },
        ],
        demos: [
          {
            title: '请求预算的离线计算',
            lang: 'python',
            code: `from math import ceil

def request_budget(listing_pages, links_per_page, duplicate_rate=0.03, retry_rate=0.04):
    discovered = listing_pages * links_per_page
    unique_details = round(discovered * (1 - duplicate_rate))
    retries = ceil(unique_details * retry_rate)
    return {
        "discovered": discovered,
        "unique_details": unique_details,
        "retries": retries,
        "total_requests": listing_pages + unique_details + retries,
    }

print(request_budget(20, 30))
print(request_budget(20, 30, duplicate_rate=0, retry_rate=0))`,
          },
        ],
      },
      {
        id: 'web-crawling-c01-l02',
        title: '第一个离线解析实验：从 HTML 字符串到结构化数据',
        difficulty: 2,
        content: `
## 学习目标

学完本节，你应该能够：

1. 用 Python 标准库 \`html.parser\` 读取一段固定 HTML，而不是靠“找第一个数字”之类的脆弱规则；
2. 解释开始标签、文本、结束标签三个事件如何组合成一棵可遍历的结构；
3. 完成“结构定位 → 字段映射 → 规范化 → 校验”四步抽取，并把缺失值显式表示为未知；
4. 用 \`urllib.parse.urljoin\` 合并相对链接，知道为什么不能用字符串拼接；
5. 为一个解析器写出可重复的固定样本测试，而不是只看一次输出“好像对了”。

## 前置知识

- 会定义类和实例属性。
- 知道字典适合保存一条结构一致的记录。
- 已理解上一节的“响应正文、DOM、结构化记录”分层。
- 愿意先手算一遍预期输出，再让代码验证。

不需要安装 requests、BeautifulSoup 或 lxml。本节所有代码都可以在站内 Pyodide 或本地标准 Python 3 中运行。

## 问题背景

下面是一段真实的 HTML 结构，包含两本书：一本有价格，另一本缺货；详情链接一个是相对路径，一个是根路径。

~~~html
<main>
  <article class="book">
    <h2> 网页采集入门 </h2>
    <span class="price">¥ 59.00</span>
    <a href="../books/101">详情</a>
  </article>
  <article class="book">
    <h2>HTTP 实践</h2>
    <span class="price">缺货</span>
    <a href="/books/102">详情</a>
  </article>
</main>
~~~

如果直接用正则找 \`<h2>(.*)</h2>\` 和 \`<span class="price">(.*)</span>\`，在小样本上也许能跑；一旦标题里嵌套了强调标签、属性里有换行、价格格式变化，规则就会悄悄错位。更糟的是，它可能返回空字符串而不报错。

我们要做的是：把页面看成事件流，在事件流中维护“当前是不是某本书、当前处在哪个字段”的状态。解析成功后，每条记录都必须通过字段校验。

## 直觉理解

HTML 解析器像一位逐字念稿的助理：

- 看到 \`<article class="book">\`，知道“一本新书开始了”，建立临时记录；
- 看到 \`<h2>\`，把“正在读标题”的开关打开；
- 读到普通文字，根据开关把文字放进标题或价格；
- 看到 \`</h2>\`，关闭标题开关；
- 看到 \`</article>\`，把临时记录规范化、校验后放进结果列表。

这段直觉对应三个回调：\`handle_starttag\`、\`handle_data\`、\`handle_endtag\`。所谓“从 DOM 取数据”，本质上也是在做类似的树遍历；只是标准库的 \`HTMLParser\` 给你的是流事件，需要你自己维护状态。

### 一个关键边界：缺失不等于零

“缺货”不是价格 0 元，“没有标注”不是免费。缺失值应保存为 \`None\`，并在质量报告中显示缺失率。把缺失值伪造成 0 会让后续统计、排序和推荐全部失真。

## 核心概念与原理详解

### 1. HTMLParser 的事件模型

\`HTMLParser\` 不要求先安装第三方包。它会在 \`feed()\` 过程中调用你的回调：

| 事件 | 你能获得的信息 | 常见用途 |
| --- | --- | --- |
| starttag | 标签名、属性键值 | 判断卡片、标题、价格、链接开始 |
| data | 标签之间的文字 | 累积字段文本，注意 \`strip()\` |
| endtag | 标签名 | 关闭字段状态，完成卡片 |
| comment / entity | 注释或实体 | 默认实体转换后可得到可读文本 |

它适合教学、小型静态页面和受控环境，但不是完整浏览器。它不会执行 JavaScript，也不保证像浏览器一样修复所有畸形 HTML。因此真实项目仍需根据页面和解析器能力做决策。

### 2. 四步抽取流程

| 步骤 | 问题 | 本节的实现 |
| --- | --- | --- |
| 结构定位 | 哪一段属于一本书？ | \`article.book\` 开始与结束 |
| 字段映射 | 标题、价格、链接分别来自哪里？ | \`h2\`、\`span.price\`、\`a[href]\` |
| 规范化 | 字符串如何变成可比较值？ | 去空白、价格转浮点、相对 URL 合并 |
| 校验 | 什么算一条合格记录？ | 标题非空；价格可为空但类型正确；URL 必须存在 |

### 3. URL 合并的边界

\`urljoin(base_url, href)\` 会处理相对路径、查询和片段。它的结果依赖 \`base_url\`，所以必须在抽取时就保留页面来源。直接写 \`base_url + href\` 会产生 \`https://shop.test/catalog/2026/../books/101\` 这类未经解析的字符串，去重和网络请求都可能出错。

## 逐步推导与计算

以第一本书为例，按事件顺序走一遍：

1. 基础 URL = \`https://shop.test/catalog/2026/\`。
2. 读取 \`<article class="book">\` → 当前记录 = \`{"title": "", "price": "", "url": None}\`。
3. 读取 \`<h2>\` → 打开标题状态。
4. 读取文本 \` 网页采集入门 \` → 去除首尾空白 → 标题变成 \`网页采集入门\`。
5. 读取 \`</h2>\` → 关闭标题状态。
6. 读取 \`<span class="price">\` → 打开价格状态。
7. 读取 \`¥ 59.00\` → 价格草稿为 \`¥ 59.00\`。
8. 读取 \`</span>\` → 关闭价格状态。
9. 读取 \`<a href="../books/101">\` → \`urljoin\` 得到 \`https://shop.test/catalog/books/101\`。
10. 读取 \`</article>\` → 清洗价格，得到 \`59.0\`，标题非空，记录通过校验。

第二本书的价格草稿是 \`缺货\`，数字提取结果为空，因此规范化为 \`None\`。这不是解析失败；它是有效记录中的“未知价格”。如果缺失率突然从 5% 升到 80%，才应报警检查页面结构或抽取器版本。

## 图示与机制图解

下图展示了 DOM 的父子关系。实际挑选字段时，应尽量使用语义节点和属性，不要把“第三个 div”写死。

<Diagram type="crawl-dom-tree" name="basic" />

这张图的用途不是让你背标签，而是提醒你：选择器依赖父子关系和属性。HTMLParser 没有自动提供一棵可查询的树，所以我们必须用状态显式记录“现在在哪里”；这是学习选择器之前的重要一步。

## 完整案例

下面的固定样本包含两个卡片：

| 书 | 原始价格文本 | 规范化价格 | 原始链接 | 规范化链接 |
| --- | --- | --- | --- | --- |
| 网页采集入门 | \`¥ 59.00\` | \`59.0\` | \`../books/101\` | \`https://shop.test/catalog/books/101\` |
| HTTP 实践 | \`缺货\` | \`None\` | \`/books/102\` | \`https://shop.test/books/102\` |

如果你只打印“两条记录”，很容易忽略第二本书的价格是空字符串还是 None。先写预期表、再比较实际输出，是避免“看起来成功”的关键一步。

## 代码实践

### 完整示例

~~~python
from html.parser import HTMLParser
from urllib.parse import urljoin

class BookParser(HTMLParser):
    def __init__(self, base_url):
        super().__init__()
        self.base_url = base_url
        self.books = []
        self.current = None
        self.in_title = False
        self.in_price = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = attrs.get("class", "").split()
        if tag == "article" and "book" in classes:
            self.current = {"title": "", "price": "", "url": None}
        elif self.current is not None and tag == "h2":
            self.in_title = True
        elif self.current is not None and tag == "span" and "price" in classes:
            self.in_price = True
        elif self.current is not None and tag == "a" and attrs.get("href"):
            self.current["url"] = urljoin(self.base_url, attrs["href"])

    def handle_data(self, data):
        if self.current is None:
            return
        text = data.strip()
        if not text:
            return
        if self.in_title:
            self.current["title"] += text
        elif self.in_price:
            self.current["price"] += text

    def handle_endtag(self, tag):
        if tag == "h2":
            self.in_title = False
        elif tag == "span":
            self.in_price = False
        elif tag == "article" and self.current is not None:
            raw_price = self.current["price"]
            digits = "".join(ch for ch in raw_price if ch.isdigit() or ch == ".")
            self.current["price"] = float(digits) if digits else None
            self.current["title"] = self.current["title"].strip()
            self.books.append(self.current)
            self.current = None

def parse_catalog(html, base_url):
    parser = BookParser(base_url)
    parser.feed(html)
    parser.close()
    return parser.books
~~~

### 半成品与淡出

**第一层（修补）**：如果实现里忘记在 \`</span>\` 时关闭价格状态，第二本书的链接文字可能被误加进价格。请先画出事件顺序，再补 \`handle_endtag\` 的分支。

**第二层（独立）**：给每条记录增加 \`source_url\` 与 \`extractor_version\`，但不要把整段 HTML 复制进去。

**第三层（迁移）**：把 \`article.book\` 换成 \`li.product\`，字段换成 \`data-sku\` 和 \`data-price\`，其余状态机结构保持不变。

## 常见误区与安全风险

1. **用空字符串表示未知**。空字符串会被误判为“已经抽取但值为空”，无法区分缺失、格式错误和真实空值。
2. **把 HTMLParser 当成完整浏览器**。它不执行脚本、不渲染 CSS，也不是完整的 HTML5 树构建器；页面结构复杂时应评估专用解析器。
3. **只抓一段页面就宣布解析器稳定**。一个固定样本只能证明“这条路径在输入不变时能工作”，还要准备缺字段、嵌套标签、不同链接和空列表测试。
4. **直接把抓到的 HTML 原样入库**。可能包含个人信息、脚本、凭据、超长内容或恶意标签。只保留完成任务所需的最小字段。
5. **忘记来源 URL 和抽取器版本**。出现错误时无法定位是哪一版规则、哪一页产生的记录。
6. **把相对 URL 当字符串拼接**。请使用 \`urljoin\` 并验证 scheme、host 和最终路径。

## 与其他知识点的关联

- 第 3 章会把这里手写的状态机提升为 DOM 树、CSS 选择器与 XPath，并讨论结构化数据和容错。
- 第 4 章会加入第三方解析器的比较，但本节已经展示了“解析器不是抽取策略”的核心。
- 第 5 章会把 \`source_url\` 变成 URL 规范化与去重的输入。
- 第 9 章会把字段映射升级为数据契约、质量指标与血缘字段。
- 项目 1 将复用本节的“列表卡片 → 详情链接 → 规范化记录”流程，但加入坏样本与验收报告。

## 本节总结

| 结论 | 做法 |
| --- | --- |
| 解析不是找数字 | 用结构事件维护状态 |
| 缺失不是零 | 用 \`None\` 表达未知并在质量报告中统计 |
| 链接必须合并 | 使用 \`urljoin\`，保留来源 URL |
| 解析成功不等于有效 | 加字段校验、来源、版本和固定样本测试 |
| 先完整示例再淡出 | 读懂状态机，再去掉一个关键分支，最后迁移结构 |

**一句话验收标准**：给定同一份 HTML，你的解析器应稳定返回同一组记录；给定缺失价格，它应明确返回未知而不是崩溃或伪造数据。

## 参考资料与延伸阅读

- [官方文档] Python 3 \`html.parser\`：HTMLParser 的回调、实体转换与容错边界。https://docs.python.org/3/library/html.parser.html
- [官方文档] Python 3 \`urllib.parse\`：URL 解析、拆分与 \`urljoin\` 规则。https://docs.python.org/3/library/urllib.parse.html
- [标准] WHATWG, *HTML Living Standard*：解析、DOM 和文档结构规范。https://html.spec.whatwg.org/
- [教材] Christopher D. Manning et al., *Introduction to Information Retrieval*, 第 20 章：采集与结构化信息的关系。出版社书目：https://doi.org/10.1017/CBO9780511809071；Stanford 在线版（补充链接）：https://nlp.stanford.edu/IR-book/information-retrieval-book.html

## 动手实验

1. 把示例 HTML 复制到本地文件，运行完整解析器，打印每条记录的 \`title\`、\`price\`、\`url\`。
2. 删除第一本书的价格，观察结果应变成 \`None\`，而不是程序异常。
3. 把基础 URL 改成 \`https://shop.test/archive/2025/\`，重新计算相对链接。
4. 增加一个空列表样本，验证返回 \`[]\` 而不是报错。
5. 为解析器写 3 条断言：有两条记录、第一条价格是 59.0、第二条价格是 None。

**自我解释一**：为什么只保存价格字符串 \`¥ 59.00\` 不够？请从比较、排序、缺失值三个角度回答。

**自我解释二**：如果删掉 \`handle_endtag\` 中的 \`article\` 分支，记录会在什么时机泄漏到下一张卡片？请按事件顺序说明。
`,
        tips: [
          {
            kind: 'pitfall',
            text: '缺货、未公开、解析失败是三种不同的“无价格”。不要用 0 或空字符串把它们混成一个值。',
          },
          {
            kind: 'pitfall',
            text: '相对链接必须先与页面基础 URL 合并。字符串拼接的结果通常不是合法 URL，也会让去重失效。',
          },
          {
            kind: 'note',
            text: '先写预期表再运行代码。固定样本测试要覆盖完整记录、缺失字段、相对链接和空列表，而不是只验证最顺利的一条。',
          },
        ],
        demos: [
          {
            title: '用标准库解析固定图书卡片',
            lang: 'python',
            code: `from html.parser import HTMLParser
from urllib.parse import urljoin

class BookParser(HTMLParser):
    def __init__(self, base_url):
        super().__init__()
        self.base_url = base_url
        self.books = []
        self.current = None
        self.in_title = False
        self.in_price = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = attrs.get("class", "").split()
        if tag == "article" and "book" in classes:
            self.current = {"title": "", "price": "", "url": None}
        elif self.current is not None and tag == "h2":
            self.in_title = True
        elif self.current is not None and tag == "span" and "price" in classes:
            self.in_price = True
        elif self.current is not None and tag == "a" and attrs.get("href"):
            self.current["url"] = urljoin(self.base_url, attrs["href"])

    def handle_data(self, data):
        if self.current is None:
            return
        text = data.strip()
        if not text:
            return
        if self.in_title:
            self.current["title"] += text
        elif self.in_price:
            self.current["price"] += text

    def handle_endtag(self, tag):
        if tag == "h2":
            self.in_title = False
        elif tag == "span":
            self.in_price = False
        elif tag == "article" and self.current is not None:
            digits = "".join(ch for ch in self.current["price"] if ch.isdigit() or ch == ".")
            self.current["price"] = float(digits) if digits else None
            self.current["title"] = self.current["title"].strip()
            self.books.append(self.current)
            self.current = None

html = """
<main>
  <article class="book">
    <h2> 网页采集入门 </h2>
    <span class="price">¥ 59.00</span>
    <a href="../books/101">详情</a>
  </article>
  <article class="book">
    <h2>HTTP 实践</h2>
    <span class="price">缺货</span>
    <a href="/books/102">详情</a>
  </article>
</main>
"""

parser = BookParser("https://shop.test/catalog/2026/")
parser.feed(html)
parser.close()
for book in parser.books:
    print(book)`,
          },
        ],
      },
      {
        id: 'web-crawling-c01-l03',
        title: '能抓什么、不该抓什么：范围、伦理与法律边界',
        difficulty: 2,
        content: `
## 学习目标

学完本节，你应该能够：

1. 用“授权来源、服务条款、robots.txt、个人数据、用途限制、保存期限、请求影响”七个问题做采集前判断；
2. 准确说明 \`robots.txt\` 是自愿排除协议，不是法律授权、版权许可或隐私同意；
3. 区分“公开可见”与“允许采集、保存、组合、再分发”这几个不同动作；
4. 用加权风险矩阵把模糊的“感觉有风险”拆成可讨论的信号；
5. 在工程中落实最小化、目的限定、日志脱敏、可删除和停止采集。

本节是一般工程教育，不构成法律意见。遇到实际项目、个人信息、商业数据或受限来源时，应咨询相应机构、数据所有者或专业法律人员。

## 前置知识

- 已能区分原始响应、DOM 与结构化记录。
- 知道 HTTP 请求会给对方服务器带来负载。
- 了解基本的个人信息概念：姓名、联系方式、账号、位置、健康信息等。

## 问题背景

收集“公开目录”听起来很安全，但目录里可能混入联系人姓名、邮箱、个人主页地址；页面“公开可见”也可能伴随服务条款限制、访问频率限制、数据库权利或隐私期待。

另一个常见误解是：\`robots.txt\` 写着允许，就代表“什么都能做”。实际上，它只描述自动客户端应按什么路径访问，不授予版权、数据库权、合同许可或个人数据使用同意。把 \`robots.txt\` 当成法律结论，既技术上不准确，也可能造成真实风险。

因此，采集边界不能只靠一个布尔值。我们需要把来源、目的、数据类别和影响分开记录，并把结论变成可审计的代码与流程。

## 直觉理解

把采集前的判断想成过四道门：

1. **来源门**：这份数据从哪里来？是公开 API、授权下载、服务端渲染页面，还是登录后的受限内容？
2. **内容门**：里面有没有个人信息、敏感属性、受限知识产权或凭据？
3. **目的门**：采集它做什么？与来源允许的用途一致吗？是否“先抓再说”？
4. **运营门**：请求量会不会造成影响？保存多久？谁能访问？如何删除和停止？

四道门中任何一道答不清，应当暂停、缩小范围或改用合法来源，而不是用更复杂的技术绕过限制。

## 核心概念与原理详解

### 1. robots.txt 的真实定位

RFC 9309 把 robots.txt 定义为自动客户端访问行为的约定。它描述哪些路径可被哪些 user-agent 访问，通常按路径匹配，较具体的规则优先。它不能替代：

- 版权与数据库权利；
- 服务条款与合同；
- 个人数据保护义务；
- 网站对特定用途的授权；
- 访问控制、登录与付费墙的合法性判断。

**正确表述**：采集器应尊重适用的 robots.txt 规则，但 robots.txt 不是万能的法律许可。**错误表述**：robots.txt 允许，所以我想怎么采集都可以。

### 2. 七个检查问题

| 问题 | 要看什么 | 不能接受的捷径 |
| --- | --- | --- |
| 授权来源 | 公开 API、许可下载、明确允许的页面 | 绕过登录、验证码、付费墙 |
| 服务条款 | 自动化访问、保存、再分发限制 | 认为“没说不能”就是允许 |
| robots.txt | user-agent 分组、Allow/Disallow、请求频率约定 | 把允许误读成法律授权 |
| 个人数据 | 姓名、邮箱、电话、账号、位置、健康等 | 因为“技术上抓得到”就全量保存 |
| 目的限制 | 采集与后续使用是否一致 | 先搭数据湖，再找用途 |
| 保存期限 | 何时删除、谁可访问、如何备份 | 永久保存且无访问控制 |
| 请求影响 | 频率、并发、峰值、重试放大 | 用代理池或随机 UA 逃避限速 |

### 3. 数据最小化不是“少写几列”

最小化意味着只保存完成任务真正需要的字段。如果一个公开职位页面包含公司名称、职位描述和招聘邮箱，而你只需要统计岗位数量，就不应保存邮箱；如果确实需要联系招聘方，也应该有明确用途、访问控制、保存期限和删除路径。

日志同样适用：不要记录完整 Cookie、Authorization 头、查询中的访问令牌或整段含个人信息的正文。日志是为了定位故障，不是绕过业务数据治理的后门。

## 逐步推导与计算

下面用一个加权风险矩阵做工程讨论。分数不是法律结论，只是把假设摆到台面上的方法。

定义四个信号，每个取 0 到 4：

- 授权清晰度不足：0 表示明确允许，4 表示来源受限或不清楚；
- 个人识别风险：0 表示无个人信息，4 表示高度敏感；
- 再分发风险：0 表示仅内部汇总，4 表示可能公开或转售原始数据；
- 运营影响：0 表示低频率小范围，4 表示高并发且可能影响服务。

权重设为 0.30、0.30、0.20、0.20。风险分数：

$$
score = 0.30A + 0.30P + 0.20R + 0.20O
$$

阈值暂定：小于 1.5 为“可继续但需记录”；1.5 到 2.5 为“需人工复核”；大于等于 2.5 为“停止或改源”。

案例一：公开、匿名的商品目录，内部做数量统计。A=0，P=0，R=1，O=1：

$$
0.30 \\times 0 + 0.30 \\times 0 + 0.20 \\times 1 + 0.20 \\times 1 = 0.4
$$

低于 1.5，可继续，但仍应尊重请求频率与来源条款。

案例二：公开论坛评论，含可识别的用户信息，计划做小范围用户画像。A=1（用途可能受条款限制），P=4，R=1，O=1：

$$
0.30 \\times 1 + 0.30 \\times 4 + 0.20 \\times 1 + 0.20 \\times 1 = 1.9
$$

落在复核区。合理动作不是“加代理继续抓”，而是删除联系方式、改做聚合统计、缩小目的或寻找授权数据。

案例三：登录后的医疗问答内容，计划汇总并再分发。A=4，P=4，R=3，O=2：

$$
0.30 \\times 4 + 0.30 \\times 4 + 0.20 \\times 3 + 0.20 \\times 2 = 3.4
$$

高于 2.5，应停止或改用有明确授权的数据来源。

## 图示与机制图解

下面的决策图把“授权、隐私、目的、保存、复核”串成一条可解释的路径。注意它不替代真实法律判断。

<Diagram type="crawl-compliance" name="consent" />

工程上可把每个检查项保存为布尔值或枚举值，记录时间、来源、负责人和复核依据。这样出现争议时，你展示的是决策记录，而不是一句“当时觉得可以”。

## 完整案例

四个来源，按同一组七问判断：

| 来源 | 风险点 | 可接受的处理 |
| --- | --- | --- |
| 学校公开课程目录 | 结构公开，频率低 | 只取课程名与课时，保留来源与更新时间；按 robots 和站点政策访问 |
| 他人个人主页 | 个人信息、非授权收集 | 不抓取；改用本人授权或公开 API |
| 含联系方式的评论区 | 个人信息、二次使用与再分发风险 | 删除联系方式，改为主题聚合统计；目的与保存期限写清 |
| 登录后的内部测试页 | 访问控制、凭据与敏感内容 | 不采集；使用官方测试环境与授权账号 |

**关键洞察**：同样的技术水平可以做一个合规的公开目录统计，也可以做一个越界的个人画像。差别不在 \`requests\` 或 \`BeautifulSoup\`，而在范围、授权、目的与数据治理。

## 代码实践

### 完整示例：把风险信号变成决策记录

~~~python
def risk_decision(authorization, privacy, redistribution, operational, threshold=2.5):
    score = (
        authorization * 0.30
        + privacy * 0.30
        + redistribution * 0.20
        + operational * 0.20
    )
    if score >= threshold:
        level = "stop"
    elif score >= 1.5:
        level = "review"
    else:
        level = "proceed_with_controls"
    return {"score": round(score, 2), "level": level}

print(risk_decision(0, 0, 1, 1))
print(risk_decision(1, 4, 1, 1))
print(risk_decision(4, 4, 3, 2))
~~~

**完整输出**：风险分数依次为 0.4、1.9、3.4，决策依次为可继续、复核、停止。

### 半成品与淡出

**修补版**：把权重改成环境变量或配置表，并加入“数据所有者联系方式”和“复核人”字段。先问：如果没有这些字段，事后如何证明你做过判断？

**独立版**：为一个公开职位页面写决策记录，分别填写“只统计数量”和“保存招聘邮箱”两种目的。比较风险分数变化。

**迁移版**：把矩阵迁移到 API 数据源。授权更清晰不代表可以无限制调用；配额、字段最小化和保存期限仍然需要检查。

## 常见误区与安全风险

1. **“公开就能随便抓”**。公开只是访问状态之一，不等于允许保存、组合、再分发或用于任何目的。
2. **“robots 允许就是合法”**。robots.txt 是技术约定，不是法律授权。
3. **“抓得到联系方式就顺手保存”**。这是最典型的数据最大化；没有明确必要就删除或哈希/聚合。
4. **“用随机 User-Agent 和代理池解决限速”**。这会掩盖而非解决运营影响，也可能违反条款。
5. **“先抓，等业务需要再治理”**。数据一旦收集和扩散，删除成本远高于一开始最小化。
6. **在示例或测试中使用真实个人信息**。应使用合成夹具、匿名标识和无害样本。

## 与其他知识点的关联

- 第 6 章会把 robots.txt 的路径匹配和限速实现成代码；本节先纠正它的边界。
- 第 9 章会把数据契约、质量指标和隐私最小化落到存储字段。
- 第 12 章会继续讨论 SSRF、恶意 HTML、日志脱敏与删除流程。
- 五个项目只使用合成数据；真实站点只作为观察和判断练习，不作为课程测试依赖。

## 本节总结

| 结论 | 工程动作 |
| --- | --- |
| 先判断来源与目的 | 记录七问检查结果与负责人 |
| robots.txt 不是法律授权 | 尊重规则，同时检查条款、隐私与授权 |
| 公开不等于可无限使用 | 按最小字段、目的限制和保存期限设计 |
| 风险要可讨论 | 用透明权重与证据记录，而不是主观口号 |
| 不该抓就停 | 改源、缩小范围、聚合或获得授权 |

**一句话记忆**：技术上做得到，只是实现问题；来源、目的和数据治理上做得对，才是工程问题。

## 参考资料与延伸阅读

- [标准] IETF RFC 9309, *Robots Exclusion Protocol*：robots.txt 的定位、分组与路径匹配规则。https://www.rfc-editor.org/rfc/rfc9309.html
- [安全指南] OWASP Cheat Sheet Series, *Server Side Request Forgery Prevention*：不可信 URL 与出网边界。https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html
- [搜索运营视角] Google Search Central, *Introduction to robots.txt*：常见运营解释，注意它代表特定搜索引擎实践。https://developers.google.com/search/docs/crawling-indexing/robots/intro
- [教材] Christopher D. Manning et al., *Introduction to Information Retrieval*, 第 20 章：搜索引擎采集的规模与礼貌问题。出版社书目：https://doi.org/10.1017/CBO9780511809071；Stanford 在线版（补充链接）：https://nlp.stanford.edu/IR-book/information-retrieval-book.html

## 动手实验

1. 选一个公开站点，只找到它的 robots.txt 并解释一个 Allow/Disallow 决策，不发起采集。
2. 为一个虚构的“公开职位页”写七问表，分别设计“只统计数量”和“保存联系方式”两种方案。
3. 用风险函数计算三个案例，记录每个信号取值的理由。
4. 列出你的项目会保存的字段、保存时间、访问者和删除方式。

**自我解释一**：为什么 robots.txt 可以“技术性遵守”，但仍可能因为用途、个人信息或条款而不应采集？请用七问中的至少三项解释。

**自我解释二**：如果把“公开可见”当作充分条件，哪些个人信息可能在不知不觉中被保存进日志？你会如何修改字段和日志设计？
`,
        tips: [
          {
            kind: 'note',
            text: 'robots.txt 是自愿遵守的自动访问约定，不是法律授权、版权许可或隐私同意。三个概念必须分开。',
          },
          {
            kind: 'pitfall',
            text: '“公开可见”不等于允许保存、组合、再分发或用于任何目的。先把动作与用途写清楚。',
          },
          {
            kind: 'leak',
            text: '日志也可能泄露个人信息：不要记录完整 Cookie、Authorization 头、访问令牌或含联系方式的正文。',
          },
          {
            kind: 'interview',
            text: '合规回答的高分点不是背条款，而是展示来源、目的、最小化、保存期限、访问控制和停止机制。',
          },
        ],
        demos: [
          {
            title: '采集风险矩阵的离线计算',
            lang: 'python',
            code: `def risk_decision(authorization, privacy, redistribution, operational, threshold=2.5):
    score = (
        authorization * 0.30
        + privacy * 0.30
        + redistribution * 0.20
        + operational * 0.20
    )
    if score >= threshold:
        level = "stop"
    elif score >= 1.5:
        level = "review"
    else:
        level = "proceed_with_controls"
    return {"score": round(score, 2), "level": level}

for signals in [(0, 0, 1, 1), (1, 4, 1, 1), (4, 4, 3, 2)]:
    print(signals, risk_decision(*signals))`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'web-crawling-c01-l01-e01',
        type: 'single',
        difficulty: 2,
        relatedLessonId: 'web-crawling-c01-l01',
        question: '下列哪一项最接近“结构化采集记录”，而不是原始响应或渲染页面？',
        options: [
          { value: 'A', text: '服务器返回的一段 HTML 字节流' },
          { value: 'B', text: '浏览器 Elements 面板里看到的节点树' },
          {
            value: 'C',
            text: '包含 title、price、source_url、fetched_at 与校验状态的一条字典记录',
          },
          { value: 'D', text: '页面上的 CSS 装饰和字体资源' },
        ],
        answer: 'C',
        explanation:
          '结构化记录是从响应和结构中抽取、规范化并带上来源与时间等证据的业务数据。A 是原始响应，B 是 DOM 视角，D 是资源。',
        tags: ['心智模型', '数据层'],
      },
      {
        id: 'web-crawling-c01-l01-e02',
        type: 'single',
        difficulty: 2,
        relatedLessonId: 'web-crawling-c01-l01',
        question: '目标站点提供稳定、公开且有分页文档的 JSON 接口，字段恰好满足需求。第一选择应是？',
        options: [
          { value: 'A', text: '先写浏览器自动化，因为页面一定更完整' },
          { value: 'B', text: '优先评估并使用公开 API，在条款与配额内采集' },
          { value: 'C', text: '用正则解析该接口返回的 JSON' },
          { value: 'D', text: '先抓 HTML，再猜测哪个接口存在' },
        ],
        answer: 'B',
        explanation:
          'API 提供明确字段、分页与错误语义，通常比页面解析稳定。仍要遵守条款、鉴权、配额和速率限制。',
        tags: ['API 优先', '路径选择'],
      },
      {
        id: 'web-crawling-c01-l01-e03',
        type: 'judge',
        difficulty: 2,
        relatedLessonId: 'web-crawling-c01-l01',
        question: '只要状态码是 200，就说明响应正文一定是目标商品页且字段完整。',
        answer: false,
        explanation:
          '200 只说明服务器成功处理请求。登录页、空壳页、错误提示或改版页面都可能返回 200；必须校验正文结构与字段契约。',
        tags: ['HTTP', '成功定义'],
      },
      {
        id: 'web-crawling-c01-l01-e04',
        type: 'judge',
        difficulty: 2,
        relatedLessonId: 'web-crawling-c01-l01',
        question: 'URL 片段（fragment，例如 #section）通常不会随 HTTP 请求发送给服务器。',
        answer: true,
        explanation:
          '片段通常由客户端用来定位文档内位置，不会作为请求路径的一部分发送。它仍需在规范化时按规则处理，以防重复 URL。',
        tags: ['URL', '请求生命周期'],
      },
      {
        id: 'web-crawling-c01-l01-e05',
        type: 'fill',
        difficulty: 2,
        relatedLessonId: 'web-crawling-c01-l01',
        question:
          '某站有 20 个列表页，每页 30 个详情链接，发现详情共 ___ 条；预计重复率 3%，去重后唯一详情约 ___ 条。',
        blanks: [['600'], ['582']],
        explanation:
          '发现量为 20 × 30 = 600；去重后为 600 × (1 − 0.03) = 582。下一步还要把重试量加入总请求预算。',
        tags: ['请求预算', '计算'],
      },
      {
        id: 'web-crawling-c01-l01-e06',
        type: 'code',
        difficulty: 2,
        relatedLessonId: 'web-crawling-c01-l01',
        question:
          '实现 request_budget(listing_pages, links_per_page, duplicate_rate=0.03, retry_rate=0.04)。返回字典，包含 discovered、unique_details、retries、total_requests。唯一详情用 round 取整，重试次数用 ceil 向上取整。',
        starterCode: `from math import ceil

def request_budget(listing_pages, links_per_page, duplicate_rate=0.03, retry_rate=0.04):
    discovered = ___
    unique_details = ___
    retries = ___
    total = ___
    return {
        "discovered": discovered,
        "unique_details": unique_details,
        "retries": retries,
        "total_requests": total,
    }
`,
        expectedOutput: '请求预算字典',
        tests: `a = request_budget(20, 30)
assert a["discovered"] == 600, a
assert a["unique_details"] == 582, a
assert a["retries"] == 24, a
assert a["total_requests"] == 626, a

b = request_budget(1, 10, duplicate_rate=0, retry_rate=0)
assert b["unique_details"] == 10, b
assert b["retries"] == 0, b
assert b["total_requests"] == 11, b
`,
        answer: `from math import ceil

def request_budget(listing_pages, links_per_page, duplicate_rate=0.03, retry_rate=0.04):
    discovered = listing_pages * links_per_page
    unique_details = round(discovered * (1 - duplicate_rate))
    retries = ceil(unique_details * retry_rate)
    total = listing_pages + unique_details + retries
    return {
        "discovered": discovered,
        "unique_details": unique_details,
        "retries": retries,
        "total_requests": total,
    }
`,
        explanation:
          '重试是额外请求，不能并入“唯一页面”数。总预算 = 列表页 + 唯一详情页 + 重试。注意 round 与 ceil 的职责不同。',
        tags: ['编程', '请求预算'],
      },
      {
        id: 'web-crawling-c01-l01-e07',
        type: 'open',
        difficulty: 2,
        relatedLessonId: 'web-crawling-c01-l01',
        question:
          '你要采集一个公开课程目录的课程名、课时和链接。站点既有静态 HTML，也有文档化的公开 JSON。请给出路径选择、至少三条判断依据，以及如果使用 HTML 时的失败检查点。',
        referenceAnswer:
          '优先评估公开 JSON：字段明确、分页稳定、错误可读，且可以直接做 schema 校验。若 JSON 不可用或不允许使用，再选择静态 HTML。判断依据可包括：稳定性、授权与条款、维护成本、可测试性、请求负载。HTML 路线要检查状态码、Content-Type、字符集、正文是否为空壳、列表/详情结构、相对链接解析、缺字段以及分页边界。',
        rubric: [
          { point: '识别 API 优先并说明理由', score: 2 },
          { point: '比较静态 HTML 的适用条件与成本', score: 2 },
          { point: '列出响应、结构、链接或字段层面的失败检查点', score: 2 },
          { point: '提到条款、配额或请求影响', score: 1 },
        ],
        keywords: ['API', 'JSON', '静态 HTML', '条款', '字段', '链接'],
        explanation:
          '好答案不是“API 一定更好”，而是能根据稳定性、授权、成本和可测试性做选择，并说明失败时检查什么。',
        tags: ['简答', '路径选择'],
      },
      {
        id: 'web-crawling-c01-l01-e08',
        type: 'multiple',
        difficulty: 2,
        relatedLessonId: 'web-crawling-c01-l01',
        question: '以下哪些情况说明“页面看起来正常”仍不足以宣布采集成功？',
        options: [
          { value: 'A', text: '响应状态为 200，但正文是登录或同意提示' },
          { value: 'B', text: 'HTML 结构存在，但关键价格为“缺货”而非数字' },
          { value: 'C', text: '浏览器能看到数据，但原始 HTML 只有空容器' },
          { value: 'D', text: '解析器返回了字段，但没有来源 URL、时间和校验状态' },
        ],
        answer: ['A', 'B', 'C', 'D'],
        explanation:
          '业务成功需要正文、字段、渲染时机、来源与校验共同支持。四个选项分别对应错误页面、缺失值、脚本渲染和治理信息缺失。',
        tags: ['成功定义', '多选'],
      },
      {
        id: 'web-crawling-c01-l02-e01',
        type: 'single',
        difficulty: 2,
        relatedLessonId: 'web-crawling-c01-l02',
        question:
          '基础 URL 为 https://shop.test/catalog/2026/，链接为 ../books/101。使用标准 URL 合并后，结果应为？',
        options: [
          { value: 'A', text: 'https://shop.test/catalog/2026/../books/101' },
          { value: 'B', text: 'https://shop.test/catalog/books/101' },
          { value: 'C', text: 'https://shop.test/books/101' },
          { value: 'D', text: '../books/101' },
        ],
        answer: 'B',
        explanation:
          '以 /catalog/2026/ 为目录向上退一层到 /catalog/，再进入 books/101。字符串拼接不会消除点段，因此 A 不是规范化结果。',
        tags: ['urljoin', '相对链接'],
      },
      {
        id: 'web-crawling-c01-l02-e02',
        type: 'single',
        difficulty: 2,
        relatedLessonId: 'web-crawling-c01-l02',
        question: '价格位置写着“缺货”。在结构化记录中，最合适的表示是？',
        options: [
          { value: 'A', text: '0，方便后续计算' },
          { value: 'B', text: '空字符串，和缺失完全等价' },
          { value: 'C', text: 'None（未知），并在质量报告中统计缺失' },
          { value: 'D', text: '随机填一个市场平均价' },
        ],
        answer: 'C',
        explanation:
          '“缺货”不是价格 0。None 明确表示未知，质量报告能区分缺失、格式错误和真实值，避免伪造数据。',
        tags: ['缺失值', '数据表达'],
      },
      {
        id: 'web-crawling-c01-l02-e03',
        type: 'judge',
        difficulty: 2,
        relatedLessonId: 'web-crawling-c01-l02',
        question: '解析器返回了一条记录，就说明这条记录一定通过了字段契约校验。',
        answer: false,
        explanation:
          '解析成功只代表结构被识别，不代表字段非空、类型正确、单位一致或来源可信。校验必须单独执行。',
        tags: ['校验', '解析边界'],
      },
      {
        id: 'web-crawling-c01-l02-e04',
        type: 'judge',
        difficulty: 2,
        relatedLessonId: 'web-crawling-c01-l02',
        question: 'Python 标准库 HTMLParser 会像完整浏览器一样执行 JavaScript 并构建最终渲染 DOM。',
        answer: false,
        explanation:
          'HTMLParser 只解析传入的HTML文本并触发事件，不执行脚本、不渲染 CSS，也不是完整浏览器。动态内容需要另行判断。',
        tags: ['HTMLParser', '浏览器边界'],
      },
      {
        id: 'web-crawling-c01-l02-e05',
        type: 'multiple',
        difficulty: 2,
        relatedLessonId: 'web-crawling-c01-l02',
        question: '哪两项最可能在“看起来能跑”的解析器里造成静默错误？',
        options: [
          { value: 'A', text: '把缺失价格保存为 None，并记录缺失率' },
          { value: 'B', text: '忘记在结束标签处关闭字段状态，导致文字串到下一张卡片' },
          { value: 'C', text: '把相对链接直接拼成 base + href，未做 URL 合并' },
          { value: 'D', text: '为解析器准备固定样本与边界测试' },
        ],
        answer: ['B', 'C'],
        explanation:
          '状态未关闭与 URL 拼接都会在部分输入上产生“有结果但错误”的静默故障。A 与 D 是正确做法。',
        tags: ['调试', '静默错误'],
      },
      {
        id: 'web-crawling-c01-l02-e06',
        type: 'fill',
        difficulty: 2,
        relatedLessonId: 'web-crawling-c01-l02',
        question:
          '在 HTMLParser 中，开始标签事件由 ___ 处理；普通文本事件由 ___ 处理；结束标签事件由 ___ 处理。',
        blanks: [['handle_starttag'], ['handle_data'], ['handle_endtag']],
        explanation:
          '三个回调分别对应开始标签、文本与结束标签。状态机需要跨事件维护“当前卡片”和“当前字段”。',
        tags: ['HTMLParser', '回调'],
      },
      {
        id: 'web-crawling-c01-l02-e07',
        type: 'code',
        difficulty: 2,
        relatedLessonId: 'web-crawling-c01-l02',
        question:
          '实现 parse_catalog(html, base_url)。解析 class 含 book 的 article，提取标题、价格和链接。价格只保留数字与小数点并转 float；没有数字时为 None；链接用 urljoin 规范化。返回字典列表。',
        starterCode: `from html.parser import HTMLParser
from urllib.parse import urljoin

class CatalogParser(HTMLParser):
    def __init__(self, base_url):
        super().__init__()
        self.base_url = base_url
        self.books = []
        self.current = None
        self.in_title = False
        self.in_price = False

    def handle_starttag(self, tag, attrs):
        # TODO: 识别卡片、标题、价格和链接
        pass

    def handle_data(self, data):
        # TODO: 根据字段状态累积文本
        pass

    def handle_endtag(self, tag):
        # TODO: 关闭字段状态并完成卡片
        pass

def parse_catalog(html, base_url):
    parser = CatalogParser(base_url)
    parser.feed(html)
    parser.close()
    return parser.books
`,
        expectedOutput: '图书记录列表',
        tests: `html = """
<main>
  <article class="book">
    <h2> 网页采集入门 </h2>
    <span class="price">¥ 59.00</span>
    <a href="../books/101">详情</a>
  </article>
  <article class="book">
    <h2>HTTP 实践</h2>
    <span class="price">缺货</span>
    <a href="/books/102">详情</a>
  </article>
</main>
"""
out = parse_catalog(html, "https://shop.test/catalog/2026/")
assert len(out) == 2, out
assert out[0]["title"] == "网页采集入门", out[0]
assert out[0]["price"] == 59.0, out[0]
assert out[0]["url"] == "https://shop.test/catalog/books/101", out[0]
assert out[1]["title"] == "HTTP 实践", out[1]
assert out[1]["price"] is None, out[1]
assert out[1]["url"] == "https://shop.test/books/102", out[1]
`,
        answer: `from html.parser import HTMLParser
from urllib.parse import urljoin

class CatalogParser(HTMLParser):
    def __init__(self, base_url):
        super().__init__()
        self.base_url = base_url
        self.books = []
        self.current = None
        self.in_title = False
        self.in_price = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = attrs.get("class", "").split()
        if tag == "article" and "book" in classes:
            self.current = {"title": "", "price": "", "url": None}
        elif self.current is not None and tag == "h2":
            self.in_title = True
        elif self.current is not None and tag == "span" and "price" in classes:
            self.in_price = True
        elif self.current is not None and tag == "a" and attrs.get("href"):
            self.current["url"] = urljoin(self.base_url, attrs["href"])

    def handle_data(self, data):
        if self.current is None:
            return
        text = data.strip()
        if not text:
            return
        if self.in_title:
            self.current["title"] += text
        elif self.in_price:
            self.current["price"] += text

    def handle_endtag(self, tag):
        if tag == "h2":
            self.in_title = False
        elif tag == "span":
            self.in_price = False
        elif tag == "article" and self.current is not None:
            digits = "".join(ch for ch in self.current["price"] if ch.isdigit() or ch == ".")
            self.current["price"] = float(digits) if digits else None
            self.current["title"] = self.current["title"].strip()
            self.books.append(self.current)
            self.current = None

def parse_catalog(html, base_url):
    parser = CatalogParser(base_url)
    parser.feed(html)
    parser.close()
    return parser.books
`,
        explanation:
          '关键在于状态：卡片开始时建立记录，标题/价格开始时切字段，结束时关闭字段，article 结束时规范化。价格“缺货”应落为 None，链接必须 urljoin。',
        tags: ['编程', 'HTMLParser', 'urljoin'],
      },
      {
        id: 'web-crawling-c01-l02-e08',
        type: 'open',
        difficulty: 2,
        relatedLessonId: 'web-crawling-c01-l02',
        question:
          '你的解析器在示例页上返回了两条记录，但生产样本中有 30% 的价格为空。请描述一次有步骤的调试，而不是直接改选择器。',
        referenceAnswer:
          '先确认问题范围：空值是全部页面还是部分页面；检查原始 HTML 与渲染 DOM 是否不同，价格是否在脚本后加载。再检查字符集与响应是否完整，然后量出空价格对应的原始片段。用固定样本复现，定位是开始标签未匹配、结束状态未关闭、嵌套标签打断文本，还是页面确实缺货。补一条回归测试并记录抽取器版本与缺失率。若价格来自 JSON 接口，评估改用接口；若页面改版，更新字段映射而不是用更宽泛的正则掩盖问题。',
        rubric: [
          { point: '先区分渲染/响应/字段问题，而不是直接改选择器', score: 2 },
          { point: '用固定样本或原始片段复现并定位状态机', score: 2 },
          { point: '区分真实缺失、解析错误与页面改版', score: 2 },
          { point: '增加回归测试、版本与质量指标', score: 1 },
        ],
        keywords: ['原始 HTML', 'DOM', '固定样本', '缺失率', '回归测试'],
        explanation:
          '调试的目标是缩小失败空间，而不是让当前样本“看起来有值”。区分数据真实缺失与抽取错误尤其关键。',
        tags: ['简答', '调试', '数据质量'],
      },
      {
        id: 'web-crawling-c01-l03-e01',
        type: 'single',
        difficulty: 2,
        relatedLessonId: 'web-crawling-c01-l03',
        question: '关于 robots.txt，下列哪条表述最准确？',
        options: [
          { value: 'A', text: 'robots.txt 允许，就等于获得了版权和隐私授权' },
          { value: 'B', text: 'robots.txt 是自动客户端的访问约定，不能替代授权、条款与法律判断' },
          { value: 'C', text: 'robots.txt 禁止就构成刑事犯罪' },
          { value: 'D', text: '只要更换 User-Agent，就可以忽略所有规则' },
        ],
        answer: 'B',
        explanation:
          'robots.txt 是技术约定和访问信号，不授予版权、隐私或合同权利，也不自动决定法律责任。',
        tags: ['robots.txt', '合规边界'],
      },
      {
        id: 'web-crawling-c01-l03-e02',
        type: 'single',
        difficulty: 2,
        relatedLessonId: 'web-crawling-c01-l03',
        question: '一个公开个人主页无需登录即可访问。最稳妥的判断是？',
        options: [
          { value: 'A', text: '公开可见，所以可以任意保存、组合与再分发' },
          { value: 'B', text: '只要 robots.txt 没写 Disallow，就可以做用户画像' },
          { value: 'C', text: '仍需考虑目的、个人信息、条款与再分发；必要时改用授权来源或不采集' },
          { value: 'D', text: '用代理池访问就不涉及个人数据问题' },
        ],
        answer: 'C',
        explanation:
          '公开可见是一个事实，不是全用途授权。个人信息、目的限制、保存与再分发仍需要判断。',
        tags: ['个人信息', '公开可见'],
      },
      {
        id: 'web-crawling-c01-l03-e03',
        type: 'judge',
        difficulty: 2,
        relatedLessonId: 'web-crawling-c01-l03',
        question: '数据最小化要求只保存完成任务真正需要的字段，日志也应遵循同样原则。',
        answer: true,
        explanation:
          '最小化覆盖业务数据与日志。保存完整 Cookie、令牌或含个人信息的正文，会把风险从页面扩散到运维系统。',
        tags: ['最小化', '日志'],
      },
      {
        id: 'web-crawling-c01-l03-e04',
        type: 'judge',
        difficulty: 2,
        relatedLessonId: 'web-crawling-c01-l03',
        question: 'robots.txt 中的 Disallow 会自动使该行为违法，因此它可以直接替代法律意见。',
        answer: false,
        explanation:
          'robots.txt 是技术约定，不是法律裁判。违法与否取决于适用法律、条款、数据性质和用途等因素，不能由一个文件自动决定。',
        tags: ['robots.txt', '法律边界'],
      },
      {
        id: 'web-crawling-c01-l03-e05',
        type: 'multiple',
        difficulty: 2,
        relatedLessonId: 'web-crawling-c01-l03',
        question: '采集前的七问检查表应包含哪些内容？',
        options: [
          { value: 'A', text: '来源是否有明确授权，服务条款是否允许该用途' },
          { value: 'B', text: '是否含个人信息，能否最小化或聚合' },
          { value: 'C', text: '保存期限、访问者、删除与停止采集方式' },
          { value: 'D', text: '用随机 User-Agent 能否躲过站点限速' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 是用规避代替治理，不是合规检查项。A/B/C 分别对应来源、数据类别和运营治理。',
        tags: ['检查表', '多选'],
      },
      {
        id: 'web-crawling-c01-l03-e06',
        type: 'fill',
        difficulty: 2,
        relatedLessonId: 'web-crawling-c01-l03',
        question:
          '风险信号取 A=1、P=4、R=1、O=1，权重为 0.30、0.30、0.20、0.20。总分 = ___；按阈值 1.5 与 2.5，应归入 ___。',
        blanks: [['1.9'], ['复核', 'review']],
        explanation:
          '0.30×1 + 0.30×4 + 0.20×1 + 0.20×1 = 0.3 + 1.2 + 0.2 + 0.2 = 1.9。落在 1.5–2.5 的复核区。',
        tags: ['风险矩阵', '计算'],
      },
      {
        id: 'web-crawling-c01-l03-e07',
        type: 'code',
        difficulty: 2,
        relatedLessonId: 'web-crawling-c01-l03',
        question:
          '实现 risk_decision(authorization, privacy, redistribution, operational, threshold=2.5)。score 使用权重 0.30、0.30、0.20、0.20；score ≥ 2.5 返回 stop，≥ 1.5 返回 review，否则返回 proceed_with_controls。返回 {"score": 保留两位, "level": 决策}。',
        starterCode: `def risk_decision(authorization, privacy, redistribution, operational, threshold=2.5):
    score = ___
    if ___:
        level = "stop"
    elif ___:
        level = "review"
    else:
        level = "proceed_with_controls"
    return {"score": round(score, 2), "level": level}
`,
        expectedOutput: '风险决策字典',
        tests: `a = risk_decision(0, 0, 1, 1)
assert a == {"score": 0.4, "level": "proceed_with_controls"}, a
b = risk_decision(1, 4, 1, 1)
assert b == {"score": 1.9, "level": "review"}, b
c = risk_decision(4, 4, 3, 2)
assert c == {"score": 3.4, "level": "stop"}, c
d = risk_decision(2, 2, 2, 2, threshold=2.1)
assert d["level"] == "review", d
`,
        answer: `def risk_decision(authorization, privacy, redistribution, operational, threshold=2.5):
    score = (
        authorization * 0.30
        + privacy * 0.30
        + redistribution * 0.20
        + operational * 0.20
    )
    if score >= threshold:
        level = "stop"
    elif score >= 1.5:
        level = "review"
    else:
        level = "proceed_with_controls"
    return {"score": round(score, 2), "level": level}
`,
        explanation:
          '四个信号加权后得到可解释分数。注意阈值边界用 >=；分数只是团队讨论工具，不是法律结论。',
        tags: ['编程', '风险矩阵'],
      },
      {
        id: 'web-crawling-c01-l03-e08',
        type: 'open',
        difficulty: 2,
        relatedLessonId: 'web-crawling-c01-l03',
        question:
          '一个公开论坛的评论页包含用户名、评论正文、邮箱和发帖时间。你只需要分析“讨论主题分布”。请给出数据最小化方案、访问控制、保存期限、日志要求和停止条件。',
        referenceAnswer:
          '只保留主题分类所需的评论正文（或先做本地分类后仅保存主题聚合结果）和必要的来源信息；用户名、邮箱不应进入分析数据集或应不可逆聚合。限制访问者为项目成员，使用最小权限；设置明确保存期限并在期限后删除或再次匿名化。日志不记录完整正文、邮箱、Cookie 或令牌，仅记录计数与错误类别。停止条件包括来源条款变化、robots/站点政策不允许、请求频率造成影响、发现个人数据超出预期或收到删除/停止请求。所有结论记录依据。',
        rubric: [
          { point: '删除或聚合不必要的用户名与邮箱', score: 2 },
          { point: '明确目的、访问控制与保存期限', score: 2 },
          { point: '日志最小化与错误记录设计', score: 1 },
          { point: '列出可执行的停止/删除条件', score: 2 },
          { point: '没有把公开可见当成全用途授权', score: 1 },
        ],
        keywords: ['最小化', '邮箱', '聚合', '保存期限', '停止', '日志'],
        explanation:
          '重点不是“把邮箱加密就好”，而是它根本不需要进入分析数据。最小化优先于脱敏，聚合优先于保留个体。',
        tags: ['简答', '隐私', '数据治理'],
      },
    ],
  },
];
