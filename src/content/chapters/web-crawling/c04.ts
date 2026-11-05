import type { Chapter } from '../../../types';
import { makeExercises, makeLesson } from './authoring';

const chapterId = 'web-crawling-c04';
const lesson1 = `${chapterId}-l01`;
const lesson2 = `${chapterId}-l02`;
const lesson3 = `${chapterId}-l03`;

const parserLesson = makeLesson({
  id: lesson1,
  title: 'BeautifulSoup 与 lxml：解析器怎么选',
  difficulty: 2,
  goals: [
    '比较 `html.parser`、lxml 与 html5lib 在容错、速度、依赖和可移植性上的取舍。',
    '区分“解析器”“查询语言”和“字段抽取策略”，避免把换库当成修复脆弱规则的万能药。',
    '读懂本地环境里 BeautifulSoup 的 `find`/`select` 与 lxml XPath 示例，并能用标准库复现核心思路。',
    '为项目写出解析器选择记录：输入类型、容错要求、依赖预算、测试夹具和失败回退。',
  ],
  prerequisites: [
    '已能在 DOM 中按容器与字段关系思考，而不是只记选择器语法。',
    '能在本地运行 Python 脚本，不要求站点练习环境安装第三方包。',
    '理解解析器输出的是树或事件流，字段抽取发生在解析之后。',
  ],
  problem:
    '同一个残缺 HTML 在三种解析器里可能得到不同的树：有的补齐结构，有的保持事件式解析；有的依赖 C 库，安装快慢与平台支持也不同。初学者常问“哪个解析器最好”，却忽略真正的风险：选择器是否稳定、缺失字段是否可解释、单位与 URL 是否规范化。解析器选择是工程权衡，不是排行榜。',
  intuition:
    '解析器像把一叠纸质表格转录成数据库的工具。`html.parser` 是随 Python 一起到手的基础工具；lxml 像速度更快的专业扫描仪；html5lib 更努力模拟浏览器容错，但成本更高。每种工具转录出的行结构可能略有差异。真正的业务校验仍要你写：某列是否必填、价格是否带币种、相对链接是否有 base。',
  concepts: `
### 1. 三个常见解析器的边界

| 解析器 | 主要优势 | 主要代价 | 适合场景 |
| --- | --- | --- | --- |
| \`html.parser\` | 标准库、无需安装、可移植 | 容错并非完整浏览器级，复杂树操作需自己维护 | 离线测试、轻量事件抽取、教学项目 |
| lxml | 速度快、XPath 能力强 | 依赖平台二进制包，安装与版本需管理 | 大批量本地解析、复杂谓词 |
| html5lib | 更接近 HTML5 树构建，容错强 | 通常更慢、依赖更多 | 页面残缺且必须模拟浏览器结构 |

这张表解决的是“约束如何影响选型”，不是宣布某个库在所有场景胜出。站内题目只用标准库，是因为浏览器运行环境不等于本地开发环境。

### 2. 解析器、选择器与抽取器是三层

解析器把字节或字符串变成树；选择器在树上定位候选；抽取器把候选元素转成业务字段并验证。换解析器可能改变树和可支持的查询，却无法自动修复“取错了同名价格”或“把空字符串当 0”。测试应分别覆盖三层，失败日志也要说明失败发生在哪一层。

### 3. 文本读取差异

不同 API 的文本读取策略可能不同：有的返回元素内全部文本，有的只收集直接文本节点；空白折叠、实体解码和脚本内容也各有边界。字段规范化必须显式：\`strip\`、合并连续空白、保留必要换行、处理全角数字。不要假设“拿到 text 属性”就等于业务值。

### 4. 本地环境隔离

BeautifulSoup 与 lxml 的代码只在本地项目或探究实验中出现，并明确标注“本地运行，站内不判分”。项目测试优先使用标准库与固定夹具；若真实项目使用了第三方解析器，也应把解析结果适配到同一字段契约，避免下游绑死某个库对象。
`,
  derivation: `
设团队要在三条路线中选型：

- A：\`html.parser\`，0 个额外依赖，100 页样本解析耗时 0.10 秒；
- B：lxml，2 个运行环境相关依赖，耗时 0.03 秒；
- C：html5lib，2 个依赖，耗时 0.16 秒。

如果一次离线任务要处理 100 万页，B 相比 A 可节省约 \`(0.10-0.03)×1,000,000/100 = 700\` 秒，即约 11.7 分钟。这个收益是否值得，取决于依赖部署失败率和 XPath 需求；若稳定性测试发现 A 在 2% 的残缺样本上树结构不正确，而 B 在 0.5% 上失败，还要把错误成本加入。选择记录必须同时写性能、依赖、容错和可维护性，不能只写“B 更快”。
`,
  diagram:
    '| 决策问题 | 若答案是“是” | 若答案是“否” |\n| --- | --- | --- |\n| 必须零额外依赖？ | 优先 `html.parser` | 可评估 lxml |\n| 需要复杂 XPath？ | 评估 lxml | 标准库可能足够 |\n| 样本残缺且要模拟浏览器树？ | 评估 html5lib | 不必为容错付额外成本 |\n| 字段规则未稳定？ | 先补字段契约与夹具 | 再比较解析器性能 |',
  diagramNote:
    '这张决策表把“选库”放回工程约束。先用前三个问题缩小范围，再用同一批夹具测正确率、速度与失败原因。',
  caseStudy:
    '某合成目录站有 300 个本地 HTML 样本，其中 6 个缺少结束标签。团队分别用三种解析器输出“卡片数量、标题文本、价格文本”。`html.parser` 在 2 个嵌套异常样本中把后续兄弟节点推进了上一卡片；lxml 恢复正确但安装包在测试机缺少平台轮子；html5lib 全部恢复但总耗时是基础版 1.6 倍。最终团队保留标准库实现负责线上轻量流程，另把 lxml 作为离线批处理可选加速，并在契约层统一输出为普通字典。换解析器没有改变字段规则，这正是良好分层的证据。',
  codePractice:
    'Demo 用标准库演示“解析事件 → 卡片边界 → 规范化字段”的最小链路。课件另外给出 BeautifulSoup 的本地安装与调用入口，但不会把它嵌入站内计分。你需要记录：本地环境版本、解析器名称、样本数量、正确率、耗时和失败样本 ID。',
  mistakes: [
    '把“解析成功”当作“抽取值正确”：残缺树可能产出结构合理但字段错位的结果。',
    '只在一个正常页面比较速度，不用缺失字段、重复卡片与异常嵌套样本。',
    '把解析器对象直接传到下游业务层，导致存储与测试都依赖第三方类型。',
    '忽略字段规范化差异，比如价格符号、全角数字、HTML 实体与连续空白。',
  ],
  relations:
    '本节承接第 3 章 DOM 与选择器，为列表页到详情页抽取和项目 1 提供选型依据。第 9 章会把抽取结果转成 Schema 与质量指标；没有统一字段层，解析器比较就无法公平进行。',
  summary:
    '解析器选择是约束下的权衡。先确保字段契约与夹具，再比较容错、速度、依赖和可移植性；输出层保持普通数据结构，避免让下游绑死具体库。',
  references: [
    'Beautiful Soup 安装与解析器选择：<https://www.crummy.com/software/BeautifulSoup/bs4/doc/#installing-a-parser>',
    'lxml 官方文档：<https://lxml.de/>',
    'html5lib 官方仓库：<https://github.com/html5lib/html5lib-python>',
    'Python `html.parser`：<https://docs.python.org/3/library/html.parser.html>',
  ],
  lab: [
    '为项目写一张解析器选型记录，列出依赖、样本量、正确率、耗时与回退方案。',
    '构造一个卡片的错误嵌套样本，比较事件式解析和浏览器树构建的思路差异。',
    '把文本规范化实现为独立函数，并为全角数字、空字符串和实体写断言。',
    '选择一个本地可安装的第三方解析器做对照，只比较，不把它加入站内判分。',
  ],
  selfExplanations: [
    '**自我解释一**：为什么“换一个容错更强的解析器”不能自动修复字段选择器抽取错价格的问题？',
    '**自我解释二**：在什么证据出现时，你会认为额外依赖与更大容器是值得的？',
  ],
  predictionPrompt:
    '你预测同一段缺失结束标签的 HTML 在三种解析器中会得到完全相同的卡片数量吗？先写预测，再用样本验证。',
  tips: [
    {
      kind: 'performance',
      text: '性能比较必须用同一批夹具、同一字段输出和相同进程条件；只测下载时间不是解析器比较。',
    },
    {
      kind: 'pitfall',
      text: '不要把第三方解析器对象存进 JSON 或业务模型；先适配成普通字典并完成字段校验。',
    },
    {
      kind: 'note',
      text: '站点练习只用标准库是运行环境约束，不等于 lxml 或 BeautifulSoup 在真实本地项目中没有价值。',
    },
  ],
  demo: {
    title: '解析器之外的字段规范化',
    lang: 'python',
    code: `import re

def normalize_text(value):
    if value is None:
        return None
    text = re.sub(r"\\s+", " ", value).strip()
    return text or None

def parse_price(text):
    if text is None:
        return None
    cleaned = normalize_text(text).replace("￥", "").replace(",", "")
    if not re.fullmatch(r"\\d+(?:\\.\\d{1,2})?", cleaned):
        return None
    return int(round(float(cleaned) * 100))

samples = ["  ￥12.99 ", "￥1,299.00", "", None, "面议"]
print([(s, parse_price(s)) for s in samples])`,
  },
});

const listDetailLesson = makeLesson({
  id: lesson2,
  title: '列表页到详情页：完整字段抽取',
  difficulty: 3,
  goals: [
    '说明列表页与详情页各自负责的字段，以及连接两阶段所需的稳定键。',
    '处理重复链接、详情缺失、部分失败、不同来源 URL 与半条记录。',
    '设计“候选 → 抓取 → 抽取 → 规范化 → 合并 → 验证”的流水线。',
    '用固定 HTML 夹具区分完整记录、半条记录与坏记录，并计算各自计数。',
  ],
  prerequisites: [
    '能抽取卡片标题、链接与基础字段。',
    '理解 URL 合并、去重和字段契约。',
    '会写返回 `None` 而非抛出未分类异常的抽取函数。',
  ],
  problem:
    '列表页只提供卡片摘要、链接和少量字段；真正价格、库存、更新时间往往在详情页。若抽取器每遇到一个链接就直接写最终记录，详情请求失败时会产生半条记录；若列表页有重复卡片，又会重复请求；若以页面顺序作为主键，重跑时无法识别同一条记录。项目需要稳定的中间记录，而不是把所有步骤揉在一个函数里。',
  intuition:
    '把列表页当成“候选人名单”，详情页当成“面试记录”。候选卡先获得候选 ID 与来源 URL；详情阶段补全字段；最后按业务键合并并判断是否足够完整。任何阶段失败都保留失败类别，而不是把整批任务回滚或静默丢掉。',
  concepts: `
### 1. 两阶段字段职责

列表页适合发现：候选链接、卡片摘要、列表位置与可能的业务键。详情页适合补全：规范标题、价格、库存、更新时间与结构化脚本。若列表已经提供 SKU 而详情也有 SKU，两者应交叉验证；不一致时进入冲突而不是随意覆盖。

### 2. 中间记录

中间记录至少包含 \`source_url\`、\`candidate_key\`、\`list_title\`、\`depth\`、\`status\` 与 \`fetched_at\`。它让失败可以重试、成功可以幂等写入，也让“列表发现了 6 个候选，详情成功 5 个，合并唯一 SKU 4 个”这样的漏斗有证据。

### 3. 完整、半条与坏记录

- **完整记录**：必填字段齐全，类型和范围通过，来源可追溯。
- **半条记录**：保留了真实字段，但必填字段缺失；不能伪装成完整输出。
- **坏记录**：结构无法识别、业务键冲突或校验失败，应进入错误清单。

不要把“半条”直接抛弃，也不要把它与完整记录混在同一张质量表里。项目报告至少分开 \`complete\`、\`partial\`、\`invalid\` 与 \`duplicate\`。

### 4. 错误归属

链接解析失败属于发现层；请求超时属于传输层；卡片结构缺失属于抽取层；价格格式不合法属于规范化层；业务键重复属于合并层。错误归属决定重试策略：解析失败重试通常无意义，传输超时可能值得有上限地重试。

### 5. 顺序、确定性与可重入

发现顺序可以保留页面顺序，但最终输出应有稳定业务排序。抓取队列若要并发，也必须让检查点与写入顺序不被线程调度偶然性支配。重入时先检查候选状态：已完成详情不再请求，半条记录可按明确策略补抓，坏链接则保持终止原因。状态名不应模糊为 \`done\`；至少区分 \`discovered\`、\`fetched\`、\`complete\`、\`partial\` 与 \`invalid\`，否则重跑无法判断从哪一步继续。
`,
  derivation: `
列表页有 8 张卡片：6 个唯一详情链接、1 个重复链接、1 个非 HTTP 链接。发现层去重后得到 6 个候选，其中 1 个重复和 1 个非法被跳过，所以合法候选率为 6/8=75%。

6 个详情请求中，5 个成功、1 个超时。成功详情中 4 个 SKU 唯一，2 个详情都指向 B003，按业务键合并后为 1 条；另有 1 条成功但缺价格，记为 partial。最终：

- 列表候选 8；
- 唯一合法 URL 6；
- 成功详情 5；
- 唯一完整记录 3；
- 部分记录 1；
- 重复业务键 2 条合并为 1 组；
- 传输失败 1。

这张漏斗说明“抓取成功率 5/6”和“完整产出率 3/8”不是同一个指标。项目报告必须命名清楚分子分母。

另一个常见浪费是重复下载：同一 URL 出现两次时，若第一次已经成功，第二次应只增加去重计数；若第一次失败，第二次是否重试取决于失败类别与预算，而不是“反正又看到了链接”。把候选状态与失败原因写入中间记录后，重跑可以跳过已完成项，只补未完成项，并且不把历史成功覆盖成新的半成品。

为了让失败可定位，日志至少包含候选键、来源 URL、阶段名、错误类别与是否可重试。只打印一整段异常栈而不带记录身份，团队无法知道是哪张卡片失败，也无法在重跑时应用不同策略；这样的日志也不能作为验收证据。
`,
  diagram: '<Diagram type="crawl-pipeline" name="static" />',
  diagramNote:
    '图中从列表卡开始，经过 URL 规范化、候选去重、详情请求、字段抽取、合并与校验，最后分流到完整、部分和错误输出。每条箭头都应能对应日志字段。',
  caseStudy:
    '合成目录项目的列表页有 7 张卡：B001 正常、B002 正常、B003 重复出现两次、B004 缺价格、B005 链接使用相对路径、malformed 使用 `javascript:`、B006 详情缺标题。发现层保留 5 个唯一 HTTP 候选；详情层得到 5 个响应；抽取层把 B004 与 B006 标为 partial；重复 B003 只抓一次，记录 `duplicate_cards=1`；非法链接进入 skipped。最终完整记录 3 条、部分 2 条、坏链接 1 类、重复卡片 1 次。预期输出顺序按 SKU 或首次发现顺序固定，测试不依赖操作系统遍历顺序。',
  codePractice:
    'Demo 先抽取列表卡，再按 SKU 对候选记录去重。练习会要求你规范化价格、按业务键合并详情并生成漏斗报告。所有 HTML 和 URL 都在本地字符串中，不访问站点。',
  mistakes: [
    '列表阶段直接写入最终表，详情失败后留下无法区分“未抓取”和“无字段”的半条记录。',
    '只按 URL 去重却不按业务键检查：不同 URL 可能指向同一 SKU。',
    '详情失败后无上限重试，或在解析失败时也盲目重试。',
    '测试依赖文件系统枚举顺序，却没有在输出前按确定键排序。',
  ],
  relations:
    '本节是项目 1 的核心流程，也为第 5 章 Frontier、第 7 章检查点与幂等、第 9 章数据契约建立中间记录概念。页面链接发现会复用发现层，持久化会复用状态归属。',
  summary:
    '列表页负责发现候选，详情页负责补全字段，中间记录承担状态与证据。按漏斗分别统计发现、请求、抽取和合并，才能解释系统到底在哪一层损失数据。',
  references: [
    'Scrapy Selectors 文档：<https://docs.scrapy.org/en/latest/topics/selectors.html>',
    'Scrapy 架构概览：<https://docs.scrapy.org/en/latest/topics/architecture.html>',
    'Python `urllib.parse`：<https://docs.python.org/3/library/urllib.parse.html>',
  ],
  lab: [
    '画出你的候选记录字段，并说明每个字段由哪一层写入。',
    '构造 6 个详情响应，其中 1 个超时、1 个缺价格、1 个重复 SKU，手工计算漏斗。',
    '把价格规范化写成纯函数，覆盖空、全角、货币符号和非法文本。',
    '让输出按 SKU 稳定排序，连续运行两次并比较文件哈希。',
  ],
  selfExplanations: [
    '**自我解释一**：为什么“成功请求数 / 请求数”不能代表项目的最终数据产出率？',
    '**自我解释二**：为什么重复业务键不应与重复 URL 使用同一个处理动作？',
  ],
  predictionPrompt:
    '如果 6 个详情中 2 个是同一 SKU，你预测最终记录数和抓取数分别会怎样变化？先写漏斗等式再运行。',
  tips: [
    {
      kind: 'pitfall',
      text: '列表发现、详情抓取、字段抽取和业务合并是四种不同成功；报告不要只给一个“成功率”。',
    },
    {
      kind: 'note',
      text: '重复 URL 可以在请求前去重，重复业务键只能在解析或合并阶段识别，两者都需要单独计数。',
    },
    {
      kind: 'performance',
      text: '抓取前先解析并规范化链接，能避免把明显非法或重复请求发送出去，减少浪费与风险。',
    },
  ],
  demo: {
    title: '从列表候选到稳定中间记录',
    lang: 'python',
    code: `from html.parser import HTMLParser
from urllib.parse import urljoin

html = """<ul>
<li><a href="/b/001" data-sku="B001">图书一</a></li>
<li><a href="/b/002" data-sku="B002">图书二</a></li>
<li><a href="/b/001" data-sku="B001">重复图书</a></li>
<li><a href="javascript:void(0)">坏链接</a></li>
</ul>"""

class Candidates(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows, self.current = [], None
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "a":
            self.current = {"href": attrs.get("href"), "sku": attrs.get("data-sku")}
    def handle_data(self, data):
        if self.current and data.strip():
            self.current["title"] = data.strip()
    def handle_endtag(self, tag):
        if tag == "a" and self.current:
            self.rows.append(self.current)
            self.current = None

parser = Candidates(); parser.feed(html)
seen, records = set(), []
for row in parser.rows:
    url = urljoin("https://local.test/catalog/", row["href"] or "")
    if not url.startswith(("http://", "https://")) or not row["sku"]:
        continue
    key = (row["sku"], url)
    if key in seen:
        continue
    seen.add(key)
    records.append({**row, "url": url, "status": "discovered"})
print(records)`,
  },
});

const projectLesson = makeLesson({
  id: lesson3,
  title: '项目 1：本地静态目录采集器',
  difficulty: 4,
  goals: [
    '独立完成“列表页发现 → 详情页抽取 → 规范化 → 去重合并 → 报告输出”的离线采集项目。',
    '用固定夹具证明完整记录、半条记录、坏链接、重复 SKU 与条件缺失都能被分类。',
    '生成稳定排序的 JSONL/CSV 与可复核报告，并让重复运行结果一致。',
    '依据验收测试、故障表、Definition of Done 和 rubric 自评，而不是只凭脚本“没有报错”。',
  ],
  prerequisites: [
    '完成本章前两节，能写纯函数抽取与容错。',
    '会用 `pathlib` 读取本地文件和 `json.dumps(..., ensure_ascii=False)`。',
    '理解项目不访问真实网络，也不把缺失值伪造为默认业务值。',
  ],
  problem:
    '现在需要交付第一个可复现的静态采集项目。输入不是实时网页，而是课程提供的 1 个列表页和 6 个详情页；其中包含重复卡片、缺价格、相对链接、缺标题与非法链接。项目必须证明你没把所有步骤写成一团，而是按接口拆分、对坏样本有分类、输出可重复且报告能解释漏斗。只有正常样本能跑通，不算完成。',
  intuition:
    '把项目想成一个小型装配线：发现器只负责候选，详情加载器只负责读本地文件，解析器只负责字段，规范化器只负责单位与类型，收集器负责流程和报告，写出器负责稳定序列化。每一站都有可测试输入输出，因此故障能定位，后续也能替换成真正请求层而不推翻业务规则。',
  concepts: `
### 1. 场景与非目标

本项目的目标是掌握静态 HTML 的端到端数据流，而不是实现并发、限速或真实网络。它不处理 JavaScript 渲染、不绕过访问控制、不采集真实个人数据。夹具均为合成图书目录，链接使用 \`https://local.test\` 语义，但实际读取 \`fixtures/\` 内的文件。

### 2. 文件布局与接口

- \`public/labs/web-crawling/project-01-static/README.md\`：运行、验收、故障排查；
- \`starter.py\`：接口与 TODO，不提供完整答案；
- \`solution.py\`：完成后再对照的参考实现；
- \`fixtures/list.html\` 与 \`detail-01.html\`…\`detail-06.html\`；
- \`expected/records.jsonl\` 与 \`expected/report.json\`；
- \`tests/test_project.py\`：标准库 \`unittest\` 验收。

必须暴露 \`load_html\`、\`extract_links\`、\`parse_detail\`、\`normalize_record\`、\`collect\` 和 \`write_outputs\` 六个接口。函数边界让你能单独测试 URL 解析、字段规范化和报告，不用每次跑整条流水线。

### 3. 四个里程碑

1. **发现**：读取列表页，解析卡片标题与相对链接，规范化到 \`https://local.test/...\`，拒绝非 HTTP scheme 与超出范围的路径。
2. **抽取**：按详情 URL 找到对应本地文件，提取 SKU、标题、价格文本、库存文本和来源 URL。
3. **规范化与合并**：价格转为整数分，未知价格保留 \`None\`；库存转布尔或未知；重复 SKU 只保留一组，冲突进入原因；稳定排序。
4. **输出与报告**：写 JSONL 与 CSV，生成 \`cards_seen\`、\`unique_urls\`、\`complete\`、\`partial\`、\`invalid\`、\`duplicates\`、\`skipped\` 等计数，并验证重跑无差异。

### 4. 故障注入与验收

| 故障 | 预期行为 | 证据 |
| --- | --- | --- |
| 缺价格 | 保留记录，\`price_cents=None\`，标为 partial | 缺失计数 +1 |
| 重复卡片 | 只抓一次，仍报告重复次数 | \`duplicates=1\` |
| 缺标题 | 不伪造标题，标为 partial | 缺字段清单 |
| \`javascript:\` 链接 | 请求前跳过 | \`skipped.invalid_scheme\` |
| 非法价格文本 | 不转 0，标为 invalid 或 partial | 错误原因可定位 |
| 重跑 | 记录、排序与报告一致 | 文件哈希相同 |

这张表是验收的核心：测试必须对每个失败设计断言，而不是只断言“总记录数大于 0”。

项目还应保存每次运行的输入指纹：夹具目录的相对路径、文件数量与内容哈希。若输入改变而报告仍声称“无差异”，问题在证据链，而不在业务代码。验收时同时对输出与输入留痕，才能解释变化究竟来自页面、规则还是程序版本。

最后，先运行 starter 观察清晰的失败点，再逐步实现，不要一开始把 solution 当成复制目标。每完成一个里程碑就运行对应测试，并记录自己为什么选择该接口、该默认值和该错误分类，这些记录会成为答辩与复盘材料。
`,
  derivation: `
设夹具中的漏斗为：

- 列表卡 8 张；
- 唯一合法详情 URL 6 个；
- 详情读取成功 6 个；
- 规范化后完整记录 4 条；
- 部分记录 2 条（1 条缺价格、1 条缺标题）；
- 重复卡片 1 张，非法链接 1 个；
- 其中 2 个 URL 指向同一 SKU，合并后唯一记录减少 1 条。

完整产出率为 \`4 / 8 = 50%\`；候选取用率为 \`6 / 8 = 75%\`；详情完整率为 \`4 / 6 ≈ 66.7%\`。三个分母回答不同问题：页面是否提供候选、候选是否可抓、抓到的详情是否足以下游使用。报告字段必须让读者复算这些比例。

价格 12.99 元转为 1299 分，19.90 元转为 1990 分。未知价格是 None，不是 0；库存“有货”为 True，“缺货”为 False，“未知”为 None，三者不能在 JSON 中混同。
`,
  diagram: '<Diagram type="crawl-pipeline" name="static" />',
  diagramNote:
    '项目图从本地列表页出发，按候选链接定位详情文件，随后规范化、合并并分流输出。实现时给每个阶段一个函数与计数，而不是在一百行脚本里靠注释分隔。',
  caseStudy:
    '学员 A 的脚本能输出 6 条记录，但其中缺价格商品被写成 0，重复卡片请求了两次，第二次运行 CSV 行顺序变化。验收指出三个缺陷：价格语义错误、重复计数缺失、输出不稳定。学员 B 在规范化函数中显式返回 `None`，在发现层按规范化 URL 去重，在写出前按 SKU 排序，并把冲突放入 `report.skipped` 与 `partial`。两次运行的文件哈希一致，坏样本测试全部通过。两者的“成功记录数”接近，但只有 B 的数据可复用、可解释、可回归。',
  codePractice:
    '从接口最小的 `normalize_record` 开始，一次只让一个测试变绿：缺价格、重复 SKU、相对链接、稳定排序。站内练习覆盖这些单元级能力；完整项目在 `public/labs/web-crawling/project-01-static/` 本地运行，不访问真实网络。starter 运行应明确失败，solution 运行应全部通过。',
  mistakes: [
    '为了“看起来完整”把缺失价格填 0、把缺标题填“未知商品”，掩盖了真实缺失。',
    '直接依赖目录枚举顺序，导致 JSONL 行顺序在不同机器上变化。',
    '在列表阶段只按 href 去重，忽略相对 URL 规范化与业务键重复。',
    '测试只验证完整记录，不验证 partial、invalid、duplicate 与 skipped 的原因。',
    '把 report 只写总记录数，无法复核发现、抓取、抽取和合并各层的损失。',
  ],
  relations:
    '项目 1 把第 1–4 章的请求心智、DOM、选择器与字段抽取串成闭环。它产出的中间记录会升级为第 5 章 Frontier 节点；状态与报告会成为第 7 章检查点的原型；字段契约会在第 9 章正式化。',
  summary:
    '完成项目 1 的证据不是“脚本跑过”，而是可重复的接口、稳定输出、每个坏样本的预期分类、完整漏斗报告与通过的标准库测试。通过后再对照 solution，理解接口与决策，而不是复制整段实现。',
  references: [
    '课程项目 1 实验室：<https://local.test/labs/web-crawling/project-01-static/>（站内路径 `/labs/web-crawling/project-01-static/`）',
    'Python `pathlib`：<https://docs.python.org/3/library/pathlib.html>',
    'Python `json`：<https://docs.python.org/3/library/json.html>',
    'Python `unittest`：<https://docs.python.org/3/library/unittest.html>',
  ],
  lab: [
    '阅读 starter 的六个接口，为每个接口写一句输入、输出和失败责任。',
    '先实现价格与空白规范化，运行 4 个单元测试；再实现发现层并验证重复与非法 scheme。',
    '完成详情抽取与稳定输出，分别记录完整的、部分的、无效的、重复的和跳过的计数。',
    '运行 starter 观察预期失败；完成后再用 `CRAWL_TARGET=solution` 运行验收测试。',
    '在 README 中写下 Definition of Done、rubric 自评与至少一个故障排查案例。',
  ],
  selfExplanations: [
    '**自我解释一**：为什么“完整记录数”与“详情请求成功数”需要同时报告？哪一个能说明下游可用性？',
    '**自我解释二**：如果你的第二次运行输出行顺序变化，但记录内容相同，这算不算通过？请从可复现性解释。',
  ],
  predictionPrompt:
    '在你实现之前，预测 8 张列表卡经过重复与非法链接过滤后会有多少候选，以及最终完整记录可能少几个字段。先写漏斗，再用夹具检验。',
  tips: [
    {
      kind: 'pitfall',
      text: '未知价格必须保持 None 并进入 partial；把缺失填 0 会产生看似合法的免费商品。',
    },
    {
      kind: 'performance',
      text: '本项目不访问网络；即使替换为本地 HTTP 服务，也应先规范化与去重，再发请求。',
    },
    {
      kind: 'interview',
      text: '项目演示时先讲字段契约、失败分类和漏斗，再展示代码；只演示快乐路径无法证明工程能力。',
    },
  ],
  demo: {
    title: '项目 1 的规范化与稳定输出核心',
    lang: 'python',
    code: `import json
import re

def price_to_cents(text):
    if text is None:
        return None
    value = re.sub(r"\\s+", "", text).replace("￥", "").replace(",", "")
    if not re.fullmatch(r"\\d+(?:\\.\\d{1,2})?", value):
        return None
    return int(round(float(value) * 100))

def normalize_record(raw):
    price = price_to_cents(raw.get("price_text"))
    title = (raw.get("title") or "").strip() or None
    record = {
        "sku": raw.get("sku") or None,
        "title": title,
        "price_cents": price,
        "available": raw.get("available"),
        "source_url": raw.get("source_url"),
    }
    record["quality"] = (
        "invalid" if not record["sku"] else
        "partial" if None in (record["title"], record["price_cents"]) else
        "complete"
    )
    return record

rows = [
    {"sku":"B001","title":"清洗实战","price_text":"￥12.99","available":True,"source_url":"https://local.test/b/001"},
    {"sku":"B002","title":"观测手册","price_text":"面议","available":None,"source_url":"https://local.test/b/002"},
]
records = sorted((normalize_record(row) for row in rows), key=lambda row: row["sku"])
print(json.dumps(records, ensure_ascii=False, sort_keys=True))`,
  },
});

const parserExercises = makeExercises(chapterId, lesson1, 2, [
  {
    type: 'single',
    question: '若项目要求零第三方依赖且只需轻量离线抽取，最自然的首选解析器是？',
    options: [
      ['A', '`html.parser`'],
      ['B', '依赖最多的解析器'],
      ['C', '必须启动浏览器'],
      ['D', '正则表达式库的 HTML 扩展'],
    ],
    answer: 'A',
    explanation: '标准库 `html.parser` 不需要额外依赖，适合轻量离线抽取；复杂容错可用其他解析器评估。',
    tags: ['解析器选型'],
  },
  {
    type: 'multiple',
    question: '比较解析器时，应该记录哪些维度？',
    options: [
      ['A', '同一批夹具上的字段正确率'],
      ['B', '速度与内存'],
      ['C', '依赖安装与平台支持'],
      ['D', '随机截图颜色'],
    ],
    answer: ['A', 'B', 'C'],
    explanation: '正确率、资源与部署约束回答工程权衡；截图颜色与解析器选择无关。',
    tags: ['选型记录'],
  },
  {
    type: 'fill',
    question: '解析器负责把 HTML 变成 ___，选择器负责定位 ___，抽取器负责生成并校验 ___ 字段。',
    blanks: [['树', 'DOM'], ['候选元素', '元素'], ['业务', '结构化']],
    explanation: '三层职责不同；换解析器不会自动改变业务字段规则。',
    tags: ['分层'],
  },
  {
    type: 'judge',
    question: '只要换用容错更强的解析器，选择器取错同名价格的问题就会自动消失。',
    answer: false,
    explanation: '容错只影响树构建；作用域不清和字段歧义仍是选择器与抽取策略问题。',
    tags: ['解析器边界'],
  },
  {
    type: 'code',
    question:
      '实现 `parse_price_cents(text)`：去掉首尾空白、`￥` 与千位逗号；仅接受最多两位小数的非负数字；合法返回整数分，其他返回 None。空字符串不得变成 0。',
    starterCode: `def parse_price_cents(text):
    pass
`,
    expectedOutput: '整数分或 None',
    tests: `assert parse_price_cents(" ￥12.99 ") == 1299
assert parse_price_cents("￥1,299.00") == 129900
assert parse_price_cents("") is None
assert parse_price_cents("面议") is None
`,
    answer: `import re

def parse_price_cents(text):
    if text is None:
        return None
    value = re.sub(r"\\s+", "", str(text)).replace("￥", "").replace(",", "")
    if not re.fullmatch(r"\\d+(?:\\.\\d{1,2})?", value):
        return None
    return int(round(float(value) * 100))
`,
    explanation: '规范化必须把语法校验放在数值转换之前；空值和非法文本不能偷偷变成 0。',
    tags: ['价格规范化'],
    allowedModules: ['re'],
  },
  {
    type: 'open',
    question:
      '100 个本地样本中，A 解析器耗时 0.10 秒但 2 个树错误；B 耗时 0.03 秒但 5 个树错误。你会怎样做选型决策？',
    referenceAnswer:
      '先比较错误成本与依赖约束，不能只看速度。B 快约 0.07 秒/100 页，但错误多 3 个；若错误可被字段校验捕获且 B 部署稳定，可作为批处理加速；若错误会静默污染数据，应优先 A 或修复夹具。最终记录依赖、正确率、失败类型、回退策略。',
    rubric: [
      { point: '同时考虑速度与错误率', score: 2 },
      { point: '指出错误是否可检测', score: 2 },
      { point: '提出回退或分区选择', score: 2 },
      { point: '用数据而非偏好表达结论', score: 2 },
    ],
    explanation: '速度优势不等于数据质量优势；选型要把失败可观测性和部署成本纳入。',
    tags: ['选型决策', '开放题'],
    keywords: ['错误', '速度', '依赖', '回退'],
  },
  {
    type: 'single',
    question: '为什么项目应把解析器输出适配成普通字典，而不是直接传第三方元素对象？',
    options: [
      ['A', '普通字典不能保存字段'],
      ['B', '减少业务层对库类型和版本的耦合，便于测试与替换'],
      ['C', '字典会自动清洗个人数据'],
      ['D', '第三方对象无法被解析器创建'],
    ],
    answer: 'B',
    explanation: '边界适配让业务逻辑、存储和测试只依赖契约，后续可替换解析器。',
    tags: ['边界适配'],
  },
  {
    type: 'judge',
    question: '同一页面用不同库得到的文本内容一定逐字符相同。',
    answer: false,
    explanation: '实体解码、空白与嵌套文本处理可能不同，必须通过规范化与夹具明确预期。',
    tags: ['文本差异'],
  },
]);

const listDetailExercises = makeExercises(chapterId, lesson2, 3, [
  {
    type: 'single',
    question: '列表页到详情页流程中，最适合放在中间记录里的字段是？',
    options: [
      ['A', '页面截图'],
      ['B', '候选 URL、业务键和抓取状态'],
      ['C', '最终报表总数'],
      ['D', '用户浏览器 Cookie'],
    ],
    answer: 'B',
    explanation: '中间记录承载发现与状态，支持重试、去重和幂等写入；敏感 Cookie 不应被保存。',
    tags: ['中间记录'],
  },
  {
    type: 'multiple',
    question: '以下哪些属于不同层的成功指标？',
    options: [
      ['A', '发现到唯一合法 URL 的比例'],
      ['B', '详情请求成功比例'],
      ['C', '完整记录占候选卡的比例'],
      ['D', '页面字体加载速度'],
    ],
    answer: ['A', 'B', 'C'],
    explanation: 'A/B/C 分别覆盖发现、传输和最终数据完整率，不能用一个“成功率”混在一起。',
    tags: ['漏斗'],
  },
  {
    type: 'fill',
    question:
      '8 张列表卡中有 6 个唯一合法 URL，5 个详情成功，则候选取用率为 ___，请求成功率为 ___。',
    blanks: [['75%', '0.75'], ['83.3%', '83.33%', '5/6']],
    explanation: '候选取用率 6/8=75%；在已发出 6 个请求的假设下，请求成功率 5/6≈83.3%。',
    tags: ['漏斗计算'],
  },
  {
    type: 'judge',
    question: '重复 URL 与重复业务 SKU 应在同一个阶段用同一种方式去重。',
    answer: false,
    explanation: 'URL 可在请求前规范化去重；SKU 要到抽取后才能识别，属于合并阶段。',
    tags: ['去重'],
  },
  {
    type: 'code',
    question:
      '实现 `dedupe_candidates(candidates)`：输入字典列表，含 `sku` 与 `url`；按 `(sku, url)` 去重，保留首次出现顺序；缺少 sku 或 url 的项跳过。',
    starterCode: `def dedupe_candidates(candidates):
    pass
`,
    expectedOutput: '去重后的候选列表',
    tests: `rows = [{"sku":"B1","url":"/u1"},{"sku":"B1","url":"/u1"},{"sku":"B2","url":"/u2"},{"sku":None,"url":"/x"}]
assert dedupe_candidates(rows) == [{"sku":"B1","url":"/u1"},{"sku":"B2","url":"/u2"}]
`,
    answer: `def dedupe_candidates(candidates):
    seen = set()
    result = []
    for row in candidates:
        sku, url = row.get("sku"), row.get("url")
        if not sku or not url:
            continue
        key = (sku, url)
        if key not in seen:
            seen.add(key)
            result.append(row)
    return result
`,
    explanation: '去重键必须显式且保持首次顺序；缺少业务键的候选不能被当作正常记录。',
    tags: ['候选去重'],
  },
  {
    type: 'code',
    question:
      '实现 `classify_record(record)`：sku 缺失返回 "invalid"；title 或 price_cents 为 None 返回 "partial"；否则 "complete"。`price_cents=0` 是合法完整价格。',
    starterCode: `def classify_record(record):
    pass
`,
    expectedOutput: '记录分类字符串',
    tests: `assert classify_record({"sku":"B1","title":"A","price_cents":0}) == "complete"
assert classify_record({"sku":"B1","title":None,"price_cents":1}) == "partial"
assert classify_record({"sku":None,"title":"A","price_cents":1}) == "invalid"
`,
    answer: `def classify_record(record):
    if not record.get("sku"):
        return "invalid"
    if record.get("title") is None or record.get("price_cents") is None:
        return "partial"
    return "complete"
`,
    explanation: '用 `is None` 而不是真假判断，确保 0 价格仍是合法完整值。',
    tags: ['记录分类'],
  },
  {
    type: 'single',
    question: '详情请求超时后，最合理的错误归属是？',
    options: [
      ['A', '链接抽取失败'],
      ['B', '传输层失败，可按策略有上限重试'],
      ['C', '价格格式失败'],
      ['D', '业务键冲突'],
    ],
    answer: 'B',
    explanation: '超时发生在请求层；重试受预算与状态码/异常类别约束，解析失败不应混为一类。',
    tags: ['错误归属'],
  },
  {
    type: 'judge',
    question: '部分记录应直接被删除，以免影响最终完整记录数量。',
    answer: false,
    explanation: '部分记录保留真实已见字段与缺失原因，是后续修复和重抓的证据；应与完整记录分开输出。',
    tags: ['部分记录'],
  },
  {
    type: 'open',
    question:
      '6 个详情中 5 个请求成功，4 个完整、1 个缺价格；另有 1 个超时。请写出一份至少四个计数的漏斗报告并解释。',
    referenceAnswer:
      '候选详情 6；传输成功 5、失败 1；抽取完整 4、部分 1；完整产出率 4/6≈66.7%，请求成功率 5/6≈83.3%。部分记录保留缺价格原因，失败详情可按策略重试，不能把其字段伪造为空或 0。',
    rubric: [
      { point: '候选与请求计数正确', score: 2 },
      { point: '完整与部分分流正确', score: 2 },
      { point: '比例分母解释正确', score: 2 },
      { point: '缺失与失败处理合理', score: 2 },
    ],
    explanation: '漏斗计数必须可复核，且不能用最终成功数掩盖传输与字段缺失。',
    tags: ['漏斗报告', '开放题'],
    keywords: ['候选', '成功', '完整', '部分'],
  },
  {
    type: 'single',
    question: '输出前按 SKU 稳定排序的主要收益是？',
    options: [
      ['A', '让价格自动合法'],
      ['B', '使重复运行与跨机器输出更容易比较和回归'],
      ['C', '减少页面标签数量'],
      ['D', '避免所有网络错误'],
    ],
    answer: 'B',
    explanation: '确定性顺序让 JSONL/CSV 与测试可复现，不依赖文件系统枚举顺序。',
    tags: ['稳定输出'],
  },
]);

const projectExercises = makeExercises(chapterId, lesson3, 4, [
  {
    type: 'single',
    question: '项目 1 中缺失价格最符合数据契约的处理是？',
    options: [
      ['A', '写成 0，方便计算'],
      ['B', '写 None，记录缺失并标为 partial'],
      ['C', '继承上一商品价格'],
      ['D', '删除整张列表页'],
    ],
    answer: 'B',
    explanation: 'None 表示未知，partial 让下游知道记录可用但不完整；0 会产生错误业务语义。',
    tags: ['缺失价格'],
  },
  {
    type: 'multiple',
    question: '项目验收报告至少应包含哪些独立计数？',
    options: [
      ['A', 'cards_seen 与 unique_urls'],
      ['B', 'complete、partial 与 invalid'],
      ['C', 'duplicates 与 skipped'],
      ['D', '浏览器收藏夹数量'],
    ],
    answer: ['A', 'B', 'C'],
    explanation: '前三组覆盖发现、质量和跳过原因；收藏夹与项目采集无关。',
    tags: ['项目报告'],
  },
  {
    type: 'fill',
    question: '价格 `￥19.90` 规范化为 ___ 分；未知价格应写成 ___ 而不是 0。',
    blanks: [['1990'], ['None', 'null']],
    explanation: '19.90×100=1990；未知不是零价，JSON 中为 null/None。',
    tags: ['价格与缺失'],
  },
  {
    type: 'judge',
    question: '项目 1 的测试只在完整记录上通过，就可以忽略部分记录和坏链接。',
    answer: false,
    explanation: '项目专门设计坏样本，必须断言 partial、invalid、duplicate 与 skipped 的预期分类。',
    tags: ['验收范围'],
  },
  {
    type: 'code',
    question:
      '实现 `normalize_url(base_url, href)`：使用 `urljoin` 合并；只允许 http/https；去掉 fragment；返回字符串或 None。',
    starterCode: `from urllib.parse import urljoin, urldefrag, urlsplit

def normalize_url(base_url, href):
    pass
`,
    expectedOutput: '规范化 URL 或 None',
    tests: `assert normalize_url("https://local.test/catalog/", "../b/001.html#top") == "https://local.test/b/001.html"
assert normalize_url("https://local.test/", "javascript:void(0)") is None
`,
    answer: `from urllib.parse import urljoin, urldefrag, urlsplit

def normalize_url(base_url, href):
    if not href:
        return None
    url, _ = urldefrag(urljoin(base_url, href))
    parts = urlsplit(url)
    if parts.scheme not in {"http", "https"} or not parts.hostname:
        return None
    return url
`,
    explanation: '先合并、再去 fragment，最后校验 scheme/host；顺序错误会放过 javascript 等非 HTTP 链接。',
    tags: ['URL 规范化'],
    allowedModules: ['urllib.parse'],
  },
  {
    type: 'code',
    question:
      '实现 `merge_details(list_rows, detail_rows)`：按 sku 用详情字段覆盖非 None 值，保留列表标题作为 fallback。返回按 sku 升序的列表；无 sku 的行跳过。',
    starterCode: `def merge_details(list_rows, detail_rows):
    pass
`,
    expectedOutput: '合并并排序后的记录',
    tests: `a=[{"sku":"B2","title":"旧二"}]; b=[{"sku":"B2","title":"新二","price_cents":200},{"sku":"B1","title":"一","price_cents":100}]
assert merge_details(a,b) == [{"sku":"B1","title":"一","price_cents":100},{"sku":"B2","title":"新二","price_cents":200}]
`,
    answer: `def merge_details(list_rows, detail_rows):
    merged = {}
    for row in list_rows + detail_rows:
        sku = row.get("sku")
        if not sku:
            continue
        target = merged.setdefault(sku, {"sku": sku})
        for key, value in row.items():
            if key == "sku" or value is None:
                continue
            target[key] = value
    return [merged[sku] for sku in sorted(merged)]
`,
    explanation: '以 SKU 为业务键合并，只覆盖非 None 字段，最后排序保证确定性输出。',
    tags: ['合并', '稳定输出'],
  },
  {
    type: 'code',
    question:
      '实现 `build_report(cards, complete, partial, invalid, duplicates, skipped)`：返回包含这 6 个输入计数以及 `complete_rate`（complete/cards）的报告；cards 为 0 时 complete_rate 为 0.0。',
    starterCode: `def build_report(cards, complete, partial, invalid, duplicates, skipped):
    pass
`,
    expectedOutput: '项目计数报告',
    tests: `r=build_report(8,4,2,1,1,2)
assert r["cards_seen"]==8 and r["complete"]==4 and r["complete_rate"]==0.5, r
assert build_report(0,0,0,0,0,0)["complete_rate"]==0.0
`,
    answer: `def build_report(cards, complete, partial, invalid, duplicates, skipped):
    return {
        "cards_seen": cards,
        "complete": complete,
        "partial": partial,
        "invalid": invalid,
        "duplicates": duplicates,
        "skipped": skipped,
        "complete_rate": complete / cards if cards else 0.0,
    }
`,
    explanation: '报告字段名与分母必须固定；零分母要显式处理，不能除零崩溃。',
    tags: ['报告计数'],
  },
  {
    type: 'single',
    question: '项目要证明“重跑输出稳定”，最直接的证据是？',
    options: [
      ['A', '屏幕截图不同'],
      ['B', '两次输出的排序内容与文件哈希一致'],
      ['C', '运行时间更短'],
      ['D', '记录数量可以不相等'],
    ],
    answer: 'B',
    explanation: '稳定排序、序列化选项与内容一致会产生相同哈希，这是可复现性的直接证据。',
    tags: ['可复现性'],
  },
  {
    type: 'judge',
    question: 'starter 版本应当能直接通过全部验收测试，这样学习者才容易开始。',
    answer: false,
    explanation: 'starter 只提供接口和 TODO，应在明确断言处失败；solution 完成后再对照。',
    tags: ['starter 契约'],
  },
  {
    type: 'fill',
    question:
      '列表卡 8 张、唯一合法 URL 6 个、完整记录 4 条，则候选取用率为 ___，完整产出率为 ___。',
    blanks: [['75%', '0.75'], ['50%', '0.5']],
    explanation: '6/8=75%；4/8=50%。两个比例分母不同含义不能混用。',
    tags: ['项目漏斗'],
  },
  {
    type: 'open',
    question:
      '请为一个 6 详情页项目写 Definition of Done，至少覆盖：正常与坏样本、稳定输出、报告、隐私/网络边界、参考解对照。',
    referenceAnswer:
      'DoD 应包括：6 个详情夹具全部被分类；缺价格/标题与非法链接有断言；记录与报告字段齐全；两次运行哈希一致；只读本地夹具，无真实网络与个人数据；starter 失败、solution 通过；README 运行命令和故障排查可复现。',
    rubric: [
      { point: '覆盖正常与故障样本', score: 2 },
      { point: '覆盖稳定输出与报告', score: 2 },
      { point: '明确离线与隐私边界', score: 2 },
      { point: '写清 starter/solution 验证', score: 2 },
    ],
    explanation: 'DoD 必须可被测试和演示，不是“代码整洁、功能完整”的空泛形容词。',
    tags: ['DoD', '开放题'],
    keywords: ['夹具', '断言', '哈希', '离线', 'solution'],
  },
  {
    type: 'open',
    question:
      '项目 run 两次都不报错，但 CSV 第二行列内容交换了。请给出至少三条排查步骤和一条防回归措施。',
    referenceAnswer:
      '检查是否依赖文件枚举或字典插入顺序；确认写 CSV 前按 SKU 固定排序；对比 JSONL 与 CSV 的字段映射和表头；用两次文件哈希与逐行 diff 验证。防回归：加入稳定排序和双跑哈希一致的测试。',
    rubric: [
      { point: '定位顺序不确定性', score: 2 },
      { point: '检查字段映射', score: 2 },
      { point: '使用哈希或 diff 证据', score: 2 },
      { point: '加入自动回归测试', score: 2 },
    ],
    explanation: '“没有异常”不等于稳定输出；需要确定性与内容级证据。',
    tags: ['故障排查', '稳定输出'],
    keywords: ['排序', '枚举', '字段映射', '哈希'],
  },
  {
    type: 'single',
    question: '项目 1 正确替换为真实请求层时，哪一层最应保持不变？',
    options: [
      ['A', '字段契约与规范化规则'],
      ['B', '所有固定测试字符串'],
      ['C', '文件读取路径'],
      ['D', '离线验收命令'],
    ],
    answer: 'A',
    explanation: '请求层可替换，业务字段契约、分类和报告应稳定；测试需要扩展为网络适配而非丢掉。',
    tags: ['架构边界'],
  },
]);

export const webCrawlingChapters04: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: chapterId,
    title: '静态页面抽取',
    goal: '掌握解析器选择，完成列表页到详情页的字段抽取，并交付第一个可测试的静态采集项目。',
    lessons: [parserLesson, listDetailLesson, projectLesson],
    exercises: [...parserExercises, ...listDetailExercises, ...projectExercises],
  },
];
