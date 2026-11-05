# 网络爬虫课程来源、许可与原创性审计

**审计日期**：2026-11-05
**审计对象**：`web-crawling` 课程、课程设计规格、实验夹具与公开引用
**课程规模**：12 章 · 36 节 · 349 道习题 · 5 个项目 · 72 小时
**结论**：**PASS**；所有当前主引用均有可复核依据，失效链接已替换，未发现复制代码、真实凭据或隐私数据，也未发现绕过访问控制的实现。

---

## 一、结论摘要

| 审计项 | 结果 | 证据 |
| --- | --- | --- |
| 外部来源总数 | **88 个唯一链接** | 课程正文、设计规格、实验说明中的外部引用 |
| HTTP GET 成功 | **82 个** | 最终状态码 `200`；使用 GET，不只发 HEAD |
| 发布商页面被机器人防护拦截 | **4 个** | DOI 解析后的 ACM / Emerald / Cambridge 页面返回 `403`；标题、作者、出版信息已用 Crossref 核验 |
| 网络级超时 | **2 个** | `nlp.stanford.edu` 两个旧入口今日连接超时；未误报为“已失效”，且已改为补充入口 |
| 仍未修复的 404 | **0 个** | 原 Crawlee 扩缩容链接与 Charikar 旧 PDF 已替换为返回 `200` 的页面 |
| 开源许可冲突 | **0 个** | 仅链接引用，没有复制 Scrapy、Playwright、Crawlee、Beautiful Soup、lxml 或 html5lib 的实现 |
| 夹具隐私泄漏 | **0 个** | 只有 `.test` 域名、回环地址、`demo@example.test` 与 `13800138000` 等显式合成值 |
| 法律措辞缺失 | **0 个** | 课程与实验均说明 robots 不是法律授权、公开可见不是无限许可、课程不是法律意见 |
| 代码复制 | **0 处** | 课程算法、练习答案、项目、图示均由本项目原创实现 |

**判定说明**：本次审计把“可访问”“可直接引用正文”和“可复制代码”分开判断。HTTP 200 只证明页面可访问，不自动代表内容进入公有领域；本项目始终只引用事实、术语与机制，不复制教材段落、文档正文、论文全文或仓库代码。

---

## 二、方法与口径

1. 对设计规格、章节正文和实验 README 中的外部 HTTP/HTTPS 链接去重，共得到 **88 个唯一来源**。
2. 使用 PowerShell `Invoke-WebRequest` 发 **GET** 请求，最多跟随 10 次重定向，超时 25 秒，记录输入 URL、最终 URL、状态码、内容类型和页面标题。
3. 对 DOI 页面同时查询 **Crossref REST API**。发布商页面即使返回 `403`，仍依据 Crossref 元数据核对标题、出版方、年份、卷期和页码。
4. 对 Python 包查询 **PyPI JSON API**；对 GitHub 仓库查询 **GitHub REST API**，核对 SPDX 许可证、归档状态和默认分支。
5. 对开放标准页面额外读取页脚许可说明；对无法确认的文档采用更保守的“发布方版权/站点条款，仅链接引用”表述。
6. 对实验目录执行隐私模式扫描；对课程正文执行 robots、授权、公开可见、法律意见、合成数据和绕过技术的措辞扫描。
7. 本次未使用登录、Cookie、验证码、付费墙、访问控制、代理池或限流规避技术。DOI `403` 是发布商机器人防护的观察结果，不是内容失效证据。

**状态口径**

- `200`：GET 成功，且最终页面可读取标题。
- `403`：发布商页面拒绝自动访问；Crossref 元数据核验通过。
- `TIMEOUT`：网络连接超时；不等于 404 或永久下线。
- `补充`：不作为课程事实的主锚点，只提供延伸阅读入口。

---

## 三、学术来源

| 来源 | 出版方 / 版本 | 审计状态 | 权利与使用方式 | 章节 | 代码复制 |
| --- | --- | --- | --- | --- | --- |
| Manning, Raghavan, Schütze, *Introduction to Information Retrieval*, Ch. 20 | Cambridge University Press，2008，ISBN 9780521865715 | DOI 页面 `403`；Crossref PASS；Stanford 在线版 `TIMEOUT`，列为补充 | 版权教材；仅引用结构与概念，不复制正文 | c01 | 否 |
| Olston & Najork, *Web Crawling* | Emerald / Foundations and Trends in IR，2010，4(3):175–246 | DOI 页面 `403`；Crossref PASS | 版权综述；仅引用 Frontier、礼貌抓取等概念 | c05、c07、c11 | 否 |
| Heydon & Najork, *Mercator: A scalable, extensible Web crawler* | Springer，*World Wide Web*，1999，2(4):219–229 | 解析页 `200` 但显示机器人挑战；Crossref PASS | 版权论文；仅引用架构思想 | c05、c11 | 否 |
| Bloom, *Space/time trade-offs in hash coding with allowable errors* | ACM，*Communications of the ACM*，1970，13(7):422–426 | DOI 页面 `403`；Crossref PASS | 版权论文；仅引用假阳性语义 | c05 | 否 |
| Charikar, *Similarity estimation techniques from rounding algorithms* | ACM，STOC 2002，pp. 380–388 | DOI 页面 `403`；Crossref PASS；Princeton PDF `200` | 版权论文；仅引用 SimHash 的算法思想 | c10 | 否 |

### DOI 核验明细

| DOI | 标题（Crossref） | 出版方 | 年份 | 最终页面 |
| --- | --- | --- | --- | --- |
| `10.1017/CBO9780511809071` | *Introduction to Information Retrieval* | Cambridge University Press | 2008 | `403`，Cambridge Core 机器人防护 |
| `10.1561/1500000017` | *Web Crawling* | Emerald | 2010 | `403`，Emerald 机器人防护 |
| `10.1023/A:1019213109274` | *Mercator: A scalable, extensible Web crawler* | Springer | 1999 | `200`，页面标题为 `Client Challenge`，故以 Crossref 为准 |
| `10.1145/362686.362692` | *Space/time trade-offs in hash coding with allowable errors* | ACM | 1970 | `403`，ACM DL 机器人防护 |
| `10.1145/509907.509965` | *Similarity estimation techniques from rounding algorithms* | ACM | 2002 | `403`，ACM DL 机器人防护 |

**处理决定**：Stanford 在线版在本审计日网络不可达，课程已加入 Cambridge DOI 作为主书目锚点，并把 Stanford 明确标为“补充链接”。不把网络超时描述为论文或教材不存在。

---

## 四、标准、规范与安全框架

| 来源 | 版本 / 状态 | 状态码 | 权利说明 | 章节 | 代码复制 |
| --- | --- | ---: | --- | --- | --- |
| RFC 9309, *Robots Exclusion Protocol* | IETF，2022 | 200 | IETF Trust 标准文本；只引用规范 | c01、c05、c06、c11、c12 | 否 |
| RFC 9110, *HTTP Semantics* | IETF，2022 | 200 | IETF Trust 标准文本；只引用规范 | c02、c06、c10 | 否 |
| RFC 9111, *HTTP Caching* | IETF，2022 | 200 | IETF Trust 标准文本；只引用规范 | c02 | 否 |
| RFC 3986, *URI Generic Syntax* | IETF，2005 | 200 | IETF Trust 标准文本；只引用规范 | c01、c02、c05 | 否 |
| WHATWG HTML Living Standard | Living Standard | 200 | WHATWG 页面许可；链接引用 | c01、c03 | 否 |
| WHATWG URL Standard | Living Standard | 200 | CC BY 4.0；链接引用 | c02、c05 | 否 |
| WHATWG Encoding Standard | Living Standard | 200 | CC BY 4.0；链接引用 | c02 | 否 |
| W3C JSON-LD 1.1 | W3C Recommendation | 200 | W3C 文档许可；链接引用 | c03 | 否 |
| W3C Date and Time Formats | W3C Note | 200 | W3C 文档许可；链接引用 | c09 | 否 |
| NIST Privacy Framework | 当前发布版本 | 200 | NIST 页面条款；只引用治理概念 | c09、c12 | 否 |
| Common Crawl | 持续更新 | 200 | 文档与数据集分别适用 Common Crawl 条款；课程只引用概念，不使用数据 | c09、c12 | 否 |

---

## 五、官方文档与开源项目

| 来源组 | 覆盖链接 | 审计日版本 / 状态 | 许可或版权 | 使用章节 | 代码复制 |
| --- | ---: | --- | --- | --- | --- |
| Python Standard Library | 17 | Python 3.15.2 文档页 | PSF License v2；文档示例另有 Zero-Clause BSD 标注 | c01–c12 | 否 |
| MDN Web Docs | 12 | 当前文档 | Mozilla 及贡献者；页面标注 Creative Commons 许可 | c02、c03、c08、c10、c12 | 否 |
| Google Search Central | 3 | 当前文档 | © Google；站点条款 | c01、c06、c08 | 否 |
| Scrapy 文档 | 6 | Scrapy 2.19.0 | © Scrapy developers；仓库 BSD-3-Clause | c04、c06、c07、c11 | 否 |
| Playwright for Python 文档 | 6 | 当前文档 | © Microsoft；仓库 Apache-2.0 | c08 | 否 |
| Crawlee for Python 文档 | 3 | 当前 Python 文档 | © Apify；仓库 Apache-2.0 | c07、c11 | 否 |
| Beautiful Soup 文档 | 1 | 文档页 4.14.3；PyPI 包 4.15.0 | MIT；文档链接引用 | c03、c04 | 否 |
| lxml 文档 | 1 | 当前稳定版；PyPI 6.1.3 | BSD-3-Clause | c03、c04 | 否 |
| html5lib | 1 | PyPI 1.1；仓库活跃 | MIT | c04 | 否 |
| OWASP Cheat Sheet Series | 3 | 当前文档 | CC BY-SA 4.0；只引用安全要点 | c01、c02、c09、c11、c12 | 否 |
| SQLite 文档 | 6 | 当前稳定版文档 | SQLite 为 Public Domain | c07、c09、c10、c11 | 否 |
| Redis 文档 | 1 | 当前文档 | Redis 文档站点条款；只引用命令语义 | c11 | 否 |
| JSON Schema 文档 | 1 | 当前文档 | © JSON Schema；站点条款 | c09 | 否 |
| Schema.org | 1 | 当前词汇表 | Schema.org 页面条款；只引用字段语义 | c03 | 否 |
| Google SRE Book | 1 | 在线版 | © Google；只引用监控概念 | c06 | 否 |

---

## 六、开源许可证复核

**复核日期**：2026-11-05
**复核来源**：PyPI JSON API、GitHub REST API、项目官方主页。

| 项目 | 包版本 | 代码许可证 | 仓库状态 | 许可证据 | 课程使用 |
| --- | --- | --- | --- | --- | --- |
| Scrapy | 2.19.0 | BSD-3-Clause | 活跃，未归档 | [`scrapy/scrapy`](https://github.com/scrapy/scrapy)，API `license.spdx_id` | 只讲架构与限速概念；未复制代码 |
| Playwright for Python | 1.64.1 | Apache-2.0 | 活跃，未归档 | [`microsoft/playwright-python`](https://github.com/microsoft/playwright-python) | 只讲 locator、等待与 context；未复制代码 |
| Crawlee for Python | 1.11.0 | Apache-2.0 | 活跃，未归档 | [`apify/crawlee-python`](https://github.com/apify/crawlee-python) | 只讲请求队列、并发与恢复；未复制代码 |
| Beautiful Soup | 4.15.0 | MIT | PyPI 元数据与官方主页可核验 | [Beautiful Soup 官方文档](https://www.crummy.com/software/BeautifulSoup/bs4/doc/)；PyPI `license` | 只讲解析器选择；未复制代码 |
| lxml | 6.1.3 | BSD-3-Clause | 活跃，未归档 | [`lxml/lxml`](https://github.com/lxml/lxml)，PyPI `license` | 只讲 XPath 与解析权衡；未复制代码 |
| html5lib | 1.1 | MIT | 活跃，未归档 | [`html5lib/html5lib-python`](https://github.com/html5lib/html5lib-python)，PyPI `license` | 只讲容错解析差异；未复制代码 |

**重要更正**

- 旧设计表把 Crawlee 的仓库链接写成了 `apify/crawlee`。这是 JavaScript/TypeScript 仓库；Python 项目的正确仓库是 `apify/crawlee-python`，已更正。
- `wention/BeautifulSoup4` 是归档镜像，不作为官方许可证据；Beautiful Soup 改由 PyPI 元数据与 `crummy.com` 官方文档核验。

**结论**：没有把任何第三方仓库源码复制到课程、夹具、答案或组件中；不存在需要随代码分发的第三方版权头或许可文件。若未来复制片段，必须单独记录版本、许可证、修改说明并复核兼容性。

---

## 七、完整来源清单

**清单说明**

- 下列 88 项是去重后的外部锚点；合成示例域名 `shop.test`、`local.test`、`127.0.0.1` 不计入外部来源。
- 标记 `200` 的行，列出的 URL 就是最终 URL，除非另有“重定向”说明。
- 标记 `403` / `TIMEOUT` 的行在第三节与第八节给出例外说明。
- 所有 88 项均为“否”：没有复制其代码。
- 文档版本按审计日页面；持续更新的 Living Standard 与 `latest` 文档可能在未来变化，发布前应再次抽查。

### A. 学术、标准、隐私与档案来源（22）

| # | 来源 | 章节 | 状态 | 代码复制 | 最终 URL |
| ---: | --- | --- | --- | --- | --- |
| 1 | *Introduction to Information Retrieval*（Cambridge DOI） | c01 | 403 + Crossref PASS | 否 | <https://doi.org/10.1017/CBO9780511809071> |
| 2 | IR Book Stanford 补充入口 | c01 | TIMEOUT（补充） | 否 | <https://nlp.stanford.edu/IR-book/information-retrieval-book.html> |
| 3 | IR Book Stanford 根入口 | c01（规格补充） | TIMEOUT（补充） | 否 | <https://nlp.stanford.edu/IR-book/> |
| 4 | Olston & Najork, *Web Crawling* | c05、c07 | 403 + Crossref PASS | 否 | <https://doi.org/10.1561/1500000017> |
| 5 | Heydon & Najork, *Mercator* | c05、c11 | 200 + Crossref PASS | 否 | <https://doi.org/10.1023/A:1019213109274> |
| 6 | Bloom, *Space/time trade-offs* | c05 | 403 + Crossref PASS | 否 | <https://doi.org/10.1145/362686.362692> |
| 7 | Charikar, *Similarity estimation* | c10 | 403 + Crossref PASS | 否 | <https://doi.org/10.1145/509907.509965> |
| 8 | Charikar 论文 PDF（Princeton） | c10 | 200 | 否 | <https://www.cs.princeton.edu/courses/archive/spr04/cos598B/bib/CharikarEstim.pdf> |
| 9 | RFC 9309（带 `.html`） | c01、c05、c06 | 200 | 否 | <https://www.rfc-editor.org/rfc/rfc9309.html> |
| 10 | RFC 9309（规范短链） | c11、c12 | 200 | 否 | <https://www.rfc-editor.org/rfc/rfc9309> |
| 11 | RFC 9110（带 `.html`） | c02、c06 | 200 | 否 | <https://www.rfc-editor.org/rfc/rfc9110.html> |
| 12 | RFC 9110（规范短链） | c10 | 200 | 否 | <https://www.rfc-editor.org/rfc/rfc9110> |
| 13 | RFC 9111 | c02 | 200 | 否 | <https://www.rfc-editor.org/rfc/rfc9111.html> |
| 14 | RFC 3986 | c01、c02、c05 | 200 | 否 | <https://www.rfc-editor.org/rfc/rfc3986.html> |
| 15 | WHATWG HTML Standard | c01、c03 | 200 | 否 | <https://html.spec.whatwg.org/> |
| 16 | WHATWG HTML 语义章节 | c03 | 200 | 否 | <https://html.spec.whatwg.org/multipage/semantics.html> |
| 17 | WHATWG URL Standard | c02、c05 | 200 | 否 | <https://url.spec.whatwg.org/> |
| 18 | WHATWG Encoding Standard | c02 | 200 | 否 | <https://encoding.spec.whatwg.org/> |
| 19 | W3C JSON-LD 1.1 | c03 | 200 | 否 | <https://www.w3.org/TR/json-ld11/> |
| 20 | W3C Date and Time Formats | c09 | 200 | 否 | <https://www.w3.org/TR/NOTE-datetime> |
| 21 | NIST Privacy Framework | c09、c12 | 200 | 否 | <https://www.nist.gov/privacy-framework> |
| 22 | Common Crawl | c09、c12 | 200 | 否 | <https://commoncrawl.org/> |

### B. Python 标准库文档（17）

| # | 来源 | 章节 | 状态 | 代码复制 | 最终 URL |
| ---: | --- | --- | --- | --- | --- |
| 23 | `codecs` | c02 | 200 | 否 | <https://docs.python.org/3/library/codecs.html> |
| 24 | `collections` | c05 | 200 | 否 | <https://docs.python.org/3/library/collections.html> |
| 25 | `csv` | c09 | 200 | 否 | <https://docs.python.org/3/library/csv.html> |
| 26 | `dataclasses` | c07、c09 | 200 | 否 | <https://docs.python.org/3/library/dataclasses.html> |
| 27 | `hashlib` | c09、c10、c12 | 200 | 否 | <https://docs.python.org/3/library/hashlib.html> |
| 28 | `heapq` | c05 | 200 | 否 | <https://docs.python.org/3/library/heapq.html> |
| 29 | `html.parser` | c01、c03、c04 | 200 | 否 | <https://docs.python.org/3/library/html.parser.html> |
| 30 | `http.client` | c02 | 200 | 否 | <https://docs.python.org/3/library/http.client.html> |
| 31 | `ipaddress` | c12 | 200 | 否 | <https://docs.python.org/3/library/ipaddress.html> |
| 32 | `json` | c03、c04、c09 | 200 | 否 | <https://docs.python.org/3/library/json.html> |
| 33 | `pathlib` | c04 | 200 | 否 | <https://docs.python.org/3/library/pathlib.html> |
| 34 | `queue` | c11 | 200 | 否 | <https://docs.python.org/3/library/queue.html> |
| 35 | `sqlite3` | c07 | 200 | 否 | <https://docs.python.org/3/library/sqlite3.html> |
| 36 | `time` | c06 | 200 | 否 | <https://docs.python.org/3/library/time.html> |
| 37 | `unittest` | c04 | 200 | 否 | <https://docs.python.org/3/library/unittest.html> |
| 38 | `urllib.parse` | c01、c02、c04、c05 | 200 | 否 | <https://docs.python.org/3/library/urllib.parse.html> |
| 39 | Python Expressions（位运算） | c10 | 200 | 否 | <https://docs.python.org/3/reference/expressions.html> |

### C. 安全、浏览器、搜索引擎与框架文档（33）

| # | 来源 | 章节 | 状态 | 代码复制 | 最终 URL |
| ---: | --- | --- | --- | --- | --- |
| 40 | OWASP XSS Prevention | c12 | 200 | 否 | <https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html> |
| 41 | OWASP Logging | c09、c11、c12 | 200 | 否 | <https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html> |
| 42 | OWASP SSRF Prevention | c01、c02、c12 | 200 | 否 | <https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html> |
| 43 | MDN DOM Introduction | c08 | 200 | 否 | <https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction> |
| 44 | MDN Intersection Observer | c08 | 200 | 否 | <https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API> |
| 45 | MDN CSS Selectors（English） | c03 | 200 | 否 | <https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_selectors> |
| 46 | MDN HTTP Conditional Requests | c10 | 200 | 否 | <https://developer.mozilla.org/en-US/docs/Web/HTTP/Conditional_requests> |
| 47 | MDN ETag | c10 | 200 | 否 | <https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag> |
| 48 | MDN HTTP Redirections | c12 | 200 | 否 | <https://developer.mozilla.org/en-US/docs/Web/HTTP/Redirections> |
| 49 | MDN Retry-After | c02 | 200 | 否 | <https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After> |
| 50 | MDN HTTP Status Codes | c02 | 200 | 否 | <https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status> |
| 51 | MDN 410 Gone | c10 | 200 | 否 | <https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/410> |
| 52 | MDN XPath | c03 | 200 | 否 | <https://developer.mozilla.org/en-US/docs/Web/XML/XPath> |
| 53 | MDN DOM（中文） | c03 | 200 | 否 | <https://developer.mozilla.org/zh-CN/docs/Web/API/Document_Object_Model> |
| 54 | MDN CSS Selectors（中文） | c03 | 200 | 否 | <https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_selectors> |
| 55 | Google JavaScript SEO Basics | c08 | 200 | 否 | <https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics> |
| 56 | Google Crawler Overview | c01、c06（规格） | 200 | 否 | <https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers> |
| 57 | Google robots.txt Introduction | c01、c06 | 200 | 否 | <https://developers.google.com/search/docs/crawling-indexing/robots/intro> |
| 58 | Scrapy Documentation 首页 | c04、c07（规格） | 200 | 否 | <https://docs.scrapy.org/en/latest/> |
| 59 | Scrapy Architecture | c04、c07 | 200 | 否 | <https://docs.scrapy.org/en/latest/topics/architecture.html> |
| 60 | Scrapy AutoThrottle | c06 | 200 | 否 | <https://docs.scrapy.org/en/latest/topics/autothrottle.html> |
| 61 | Scrapy Downloader Middleware | c06（规格） | 200 | 否 | <https://docs.scrapy.org/en/latest/topics/downloader-middleware.html> |
| 62 | Scrapy Selectors | c04 | 200 | 否 | <https://docs.scrapy.org/en/latest/topics/selectors.html> |
| 63 | Scrapy Spider Middleware | c11 | 200 | 否 | <https://docs.scrapy.org/en/latest/topics/spider-middleware.html> |
| 64 | Playwright Auto-waiting | c08 | 200 | 否 | <https://playwright.dev/python/docs/actionability> |
| 65 | Playwright API | c08 | 200 | 否 | <https://playwright.dev/python/docs/api/class-playwright> |
| 66 | Playwright Browser Contexts | c08 | 200 | 否 | <https://playwright.dev/python/docs/browser-contexts> |
| 67 | Playwright Installation | c08 | 200 | 否 | <https://playwright.dev/python/docs/intro> |
| 68 | Playwright Locators | c08 | 200 | 否 | <https://playwright.dev/python/docs/locators> |
| 69 | Playwright Assertions | c08 | 200 | 否 | <https://playwright.dev/python/docs/test-assertions> |
| 70 | Crawlee for Python 首页 | c07、c11（规格） | 200 | 否 | <https://crawlee.dev/python/> |
| 71 | Crawlee Python RequestQueue API | c11 | 200 | 否 | <https://crawlee.dev/python/api/class/RequestQueue> |
| 72 | Crawlee Python Scaling Crawlers | c11 | 200 | 否 | <https://crawlee.dev/python/docs/guides/scaling-crawlers> |

### D. 仓库、数据格式与数据库文档（16）

| # | 来源 | 章节 | 状态 | 代码复制 | 最终 URL |
| ---: | --- | --- | --- | --- | --- |
| 73 | `scrapy/scrapy` 仓库 | c04、c06、c07、c11 | 200 | 否 | <https://github.com/scrapy/scrapy> |
| 74 | `microsoft/playwright-python` 仓库 | c08 | 200 | 否 | <https://github.com/microsoft/playwright-python> |
| 75 | `apify/crawlee-python` 仓库 | c07、c11 | 200 | 否 | <https://github.com/apify/crawlee-python> |
| 76 | `html5lib/html5lib-python` 仓库 | c04 | 200 | 否 | <https://github.com/html5lib/html5lib-python> |
| 77 | Beautiful Soup 官方文档 | c03、c04 | 200 | 否 | <https://www.crummy.com/software/BeautifulSoup/bs4/doc/> |
| 78 | lxml 官方文档 | c03、c04 | 200 | 否 | <https://lxml.de/> |
| 79 | JSON Schema 入门 | c09 | 200 | 否 | <https://json-schema.org/learn/getting-started-step-by-step> |
| 80 | Redis Commands | c11 | 200 | 否 | <https://redis.io/docs/latest/commands/> |
| 81 | Schema.org | c03 | 200 | 否 | <https://schema.org/> |
| 82 | Google SRE Book | c06 | 200 | 否 | <https://sre.google/sre-book/table-of-contents/> |
| 83 | SQLite Datatypes | c09 | 200 | 否 | <https://www.sqlite.org/datatype3.html> |
| 84 | SQLite Documentation | c07 | 200 | 否 | <https://www.sqlite.org/docs.html> |
| 85 | SQLite CREATE TABLE | c07 | 200 | 否 | <https://www.sqlite.org/lang_createtable.html> |
| 86 | SQLite Transaction | c07、c10 | 200 | 否 | <https://www.sqlite.org/lang_transaction.html> |
| 87 | SQLite UPSERT | c07 | 200 | 否 | <https://www.sqlite.org/lang_upsert.html> |
| 88 | SQLite WAL | c11 | 200 | 否 | <https://www.sqlite.org/wal.html> |

---

## 八、整改记录

| 问题 | 旧地址 | 处理 | 新地址 / 证据 |
| --- | --- | --- | --- |
| Crawlee 扩缩容链接 404 | `https://crawlee.dev/docs/guides/scaling` | 替换为 Python 文档 | `https://crawlee.dev/python/docs/guides/scaling-crawlers`，200 |
| Charikar PDF 链接 404 | `.../spring04/.../CharikarFingerprinting.pdf` | 替换为同目录有效论文 PDF | `https://www.cs.princeton.edu/courses/archive/spr04/cos598B/bib/CharikarEstim.pdf`，200 |
| Crawlee RequestQueue 链接指向 JavaScript 文档 | `https://crawlee.dev/docs/guides/request-storage` | 替换为 Python API 页面 | `https://crawlee.dev/python/api/class/RequestQueue`，200 |
| 设计矩阵把 Python Crawlee 链接写成 JS 仓库 | `https://github.com/apify/crawlee` | 更正仓库归属 | `https://github.com/apify/crawlee-python`，Apache-2.0，活跃 |
| Stanford 在线教材入口网络超时 | Stanford IR Book | 不误报为失效；加入 Cambridge DOI 主锚点，Stanford 标为补充 | Crossref：`10.1017/CBO9780511809071`，2008 |
| DOI 发布商页面 403 | ACM / Emerald / Cambridge | 使用 Crossref 元数据二次核验 | 5 个 DOI 全部核对标题、出版方、年份、卷期/页码 |

**当前状态**：整改后旧链接在课程源文件与设计规格中均已无残留；`scripts/e2e-web-crawling.mjs` 的最终运行还会扫描渲染页面与图示。

---

## 九、夹具隐私与秘密扫描

### 扫描范围

- `public/labs/web-crawling/` 全部文件
- `src/content/chapters/web-crawling/c01.ts` 至 `c12.ts`
- 实验 README、fixture、starter、solution、tests 与本地服务器

### 扫描模式

- 邮箱、手机号、`Authorization`、`Bearer`、Cookie、password、secret、API key、访问令牌、session ID
- 常见真实域名、真实姓名、私钥、JWT 与云访问密钥前缀
- 真实外网 URL、非回环实验服务器、登录态或凭据字段

### 结果

| 命中类型 | 实际发现 | 判定 |
| --- | --- | --- |
| 示例邮箱 | `demo@example.test` | 合成保留域，PASS |
| 示例手机号 | `13800138000` | 明显用于脱敏练习的合成号码，PASS |
| 实验域名 | `shop.test`、`local.test`、`a.test`、`b.test`、`wrong.test` | `.test` 保留域，PASS |
| 本地服务 | `127.0.0.1` 与随机回环端口 | 仅本机合成服务器，PASS |
| `Cookie` / `Authorization` | 只出现在“不要记录”“不要保存”的课程说明或错误选项 | 不是凭据，PASS |
| `secret` | `/private/secret` 是 P4 中被 robots 与范围门禁拒绝的合成路径 | 不是密钥，PASS |
| 真实姓名 / 私钥 / 云密钥 / JWT | 未发现 | PASS |

**结论**：实验只包含合成数据、`.test` 域名与回环地址；没有真实个人资料、账号、令牌或第三方生产接口。若未来把夹具扩展到真实数据，必须重新做 PII、授权、保留期限与访问控制评估。

---

## 十、法律与合规措辞审计

| 页面 / 文件 | robots 非授权 | 公开不等于无限许可 | 非法律意见 | 合成数据 | 不提供绕过 |
| --- | --- | --- | --- | --- | --- |
| `c01.ts` | 是 | 是 | 是 | 是 | 课程级提醒 |
| `c06.ts` | 是 | 是 | 是（已补明确句） | 是 | 课程级提醒 |
| `c12.ts` | 是 | 是 | 是 | 是 | 是 |
| `public/labs/web-crawling/README.md` | 是 | 是 | 是 | 是 | 是 |
| 项目 README / fixture | 项目中涉及 robots 与隐私的部分均声明合成/本地边界 | 是 | 由课程总则覆盖 | 是 | 是 |
| 课程统一生成的安全段 | 是 | 是 | 由 c01/c06/c12 覆盖 | 是 | 是 |

**发现的措辞**

- `c01`：一般工程教育，不构成法律意见；公开可见不是全用途授权。
- `c06`：robots 是抓取偏好协议，不是许可证；新增“具体项目必须结合适用法律、合同、服务条款与组织政策复核”。
- `c12`：明确“技术上抓得到，不代表允许抓、保存、合并或再分发”，并禁止登录、验证码、付费墙和访问控制绕过。
- 所有 `makeLesson` 生成的课程末尾统一加入合规提醒。
- 实验总 README 新增五项统一边界，覆盖合成数据、`.test` 域名、无真实凭据和无绕过。

---

## 十一、原创性与使用边界

**原创部分**

- 12 章课程结构、36 节正文、349 道练习、5 个项目与验收 rubric。
- 标准库爬虫、URL 规范化、Frontier、令牌桶、SQLite 状态机、SimHash、变更分类和监控示例。
- 全部实验夹具、HTML 页面、JSON 快照、本地服务器、故障注入与测试。
- React/HTML/SVG 图示、页面组件、练习反馈模板与视觉样式。

**未复制部分**

- 未复制教材、大学讲义、论文、标准正文、MDN/OWASP 页面段落。
- 未复制 Scrapy、Playwright、Crawlee、Beautiful Soup、lxml 或 html5lib 的源代码。
- 未从 GitHub 仓库搬运实现、测试或数据文件。
- 未使用第三方截图或受版权保护的网页作为课程图示。

**判断依据**

所有第三方来源仅作为术语、机制、规范或 API 边界的可追溯锚点。示例均重新编写为本地、确定性、可解释的标准库实现；没有把“能跑”建立在某一版本的第三方页面上。

---

## 十二、残余风险与发布建议

| 风险 | 影响 | 处理 |
| --- | --- | --- |
| DOI 发布商持续阻断自动访问 | 无法用浏览器直接抽标题 | Crossref 已核验；发布前可人工打开一次 |
| Stanford 旧教材入口网络不稳定 | 读者可能无法打开补充链接 | Cambridge DOI 为主锚点；报告中明确说明 |
| `latest` 文档随时间更新 | API 名称或页面路径可能变化 | 发版前重新执行来源审计 |
| Beautiful Soup 文档页 4.14.3 与 PyPI 4.15.0 | 版本号不完全同步 | 文档只引用接口概念；包版本单独记录 |
| 真实项目扩展到非合成数据 | 隐私与授权风险上升 | 强制重新做来源、PII、条款、保留和删除审查 |

**发布门槛**：当前主引用、开源许可、隐私夹具、法律措辞与原创性检查均通过。没有把 DOI `403` 或 Stanford `TIMEOUT` 误报成内容不存在；没有发现需要阻断发布的缺陷。

---

## 十三、审计命令与可复核记录

```powershell
# 课程内容结构检查
node scripts/check-web-crawling.mjs

# Python 参考解答与浏览器判题
node scripts/verify-web-crawling-code.mjs
pnpm run verify:course web-crawling

# 浏览器渲染、全部章节、图示与移动端
pnpm run test:web-crawling

# 全站类型、审计、构建与模板检查
pnpm run typecheck
pnpm run audit
pnpm run build
python scripts/check_tpl.py src/content/chapters/web-crawling
```

**最终判定**：**PASS**。本报告的事实核验日期为 **2026-11-05**；以后若外部文档变化，应按第十二节重新审计，而不是沿用旧的 HTTP 结论。
