import type { Chapter } from '../../../types';
import { makeExercises, makeLesson } from './authoring';

const chapterId = 'web-crawling-c03';
const lesson1 = `${chapterId}-l01`;
const lesson2 = `${chapterId}-l02`;
const lesson3 = `${chapterId}-l03`;

const domLesson = makeLesson({
  id: lesson1,
  title: 'DOM 树：网页结构的骨架',
  difficulty: 2,
  goals: [
    '把 HTML 文本解释为由元素、文本和属性组成的树，而不是一行行字符串。',
    '准确描述父子、兄弟、祖先和后代关系，并说明它们如何影响字段定位。',
    '理解浏览器的 HTML5 容错为什么会产生源码里没有的节点，以及采集时如何避免误判。',
    '用 `html.parser` 维护元素栈，输出可复核的简化 DOM 大纲。',
  ],
  prerequisites: [
    '能读写 Python 列表、字典、函数与异常。',
    '知道 HTML 标签大致长什么样，但不需要背全部标签。',
    '已理解第 2 章的“响应正文只是原始文本”，浏览器会在此之后构建 DOM。',
  ],
  problem:
    '假设列表页中有 12 件商品，每件商品的标题、价格和链接散落在嵌套标签里。若直接对字符串使用 `find("￥")`，页脚的促销文案、评分说明或隐藏模板都可能先被命中。更糟的是，源码里少一个 `</li>` 时，文本扫描器无法知道后续标题已落入上一项。爬虫需要一种能表达“谁包含谁”的结构，而 DOM 正是这种结构。',
  intuition:
    '把 DOM 想成家谱：`div.catalog` 是祖父，`article.product` 是它的若干孩子，`h3` 与 `span.price` 又是 article 的孩子。元素之间的包含关系就是祖先与后代，同一父节点下的元素互称兄弟。文本不是“标签外面的一袋字”，而是挂在相应元素下面的文本节点。选择器和遍历算法实际上都在按这张家谱导航。',
  concepts: `
### 1. 节点不是只有标签

DOM 至少有元素节点、文本节点、注释节点和文档节点。采集字段时通常从元素出发，但真正读到的标题往往是元素里的文本节点。属性挂在元素上而不是另一个子节点，例如 \`data-sku="B001"\` 只属于那个 \`article\`。把“元素、文本、属性”混为一谈，会导致错误地用子元素计数判断文本是否存在。

### 2. 四种关系与遍历方向

- **父与子**：直接包含关系，例如 \`article\` 直接包含 \`h3\`。
- **祖先与后代**：跨层包含，父节点也是祖先。
- **兄弟**：共享同一父元素，前后顺序有意义。
- **文档顺序**：先序深度优先遍历，通常就是源码中开始标签出现的顺序。

选择器只能找到候选元素，字段是否属于当前卡片仍要靠最近的共同祖先约束。若先全局收集所有 \`h3\`、再全局收集所有 \`.price\`，两个列表一旦因缺失字段长度不同，就会把第 3 个标题配给第 4 个价格。正确做法是先定位卡片，再在每张卡片内部抽取。

### 3. HTML5 容错与采集假设

浏览器按 HTML 标准执行错误恢复：未闭合的列表项可能被隐式结束，表格可能补出 \`tbody\`，某些块元素会结束当前段落。这意味着“源码中看到的嵌套”与“浏览器 DOM 中的嵌套”可能不同。\`html.parser\` 是事件式解析器，并不等同于完整浏览器树构建，因此它适合离线抽取，却不能被描述成浏览器。

### 4. 简化 DOM 大纲

维护一个元素栈：遇到开始标签就压栈并输出路径，遇到结束标签就弹出。对常见空元素单独处理，对脚本和样式可以选择跳过正文。这个实验不追求覆盖整个 HTML 标准，而是让你亲眼看到“扁平的字符流如何变成带深度的结构”。
`,
  derivation: `
以一段 2 张卡片、其中第 2 张缺少价格的 HTML 为例：

1. 第 1 次读到 \`div.catalog\`，栈深从 0 变 1；它是当前所有卡片共同祖先。
2. 读到第 1 张 \`article\` 后，栈深变 2；标题、链接、价格都应在这个 article 关闭前读取。
3. 第 1 张 article 结束时弹出，栈回到只含 \`div.catalog\` 的状态。
4. 第 2 张 article 再入栈；若只在全局维护“上一个价格”，它会错误继承第 1 张的价格。
5. 正确的卡片级结果是：记录数 2；完整字段数 4（标题、链接各 2）；价格覆盖 1/2=50%。缺失被显式记为空，而不是用 0 或前一卡片的值填补。

这个推导说明：DOM 结构直接决定了统计口径。字段覆盖率必须相对于“发现了多少候选卡片”计算，而不是相对于最终成功输出的记录数计算，否则错误记录会被掩盖。
`,
  diagram: '<Diagram type="crawl-dom-tree" name="basic" />',
  diagramNote:
    '图中根节点向下展开为列表容器、商品卡片以及卡片内的标题、价格和链接。注意“卡片”是字段的归属边界：标题与价格先绑定到各自卡片，再进入记录列表。',
  caseStudy:
    '某合成书店列表页有两张商品卡。第一张包含标题《Python 数据清洗实战》、价格 ￥12.99 与详情链接；第二张只有标题和链接，模板中的价格节点被后端省略。若抽取器坚持“每个卡片必须找到价格”，它会丢掉整条记录；若抽取器用全局默认值 0，第二件商品会变成免费。课程采用第三种做法：保留候选卡片、把 `price_cents` 标为 `None`、在报告中分别计数 `cards_seen=2`、`records=2`、`price_missing=1`。这样下游能区分“没看到卡片”和“看到了但字段未知”。',
  codePractice:
    'Demo 使用 `HTMLParser` 维护标签栈，只打印普通元素的路径和属性 `data-sku`。实验时刻意放一个没有闭合的 `<li>`，再对比浏览器的开发者工具：你会发现事件式解析器与浏览器树构建器并不完全等价。站内练习只使用固定 HTML 字符串，不访问网络。',
  mistakes: [
    '把正则找标签当成 DOM 解析：嵌套结构、注释和属性中的 `>` 都会破坏简单模式。',
    '先全局匹配标题和价格、再按列表位置相加：缺失字段会造成错位配平。',
    '把 `None`、空字符串和 0 视为同一种“没有”：未知价格不是免费，缺标题也不是空标题。',
    '看到浏览器补出 `tbody` 后误以为服务器原始 HTML 一定包含它；采集要记录实际解析层。',
  ],
  relations:
    '本节是第 4 章字段抽取、第 5 章链接发现和第 9 章数据契约的结构基础。后续的 CSS 选择器与 XPath 都只是遍历 DOM 的不同语言；动态渲染章节则会比较“服务器返回的树”和“浏览器执行脚本后的树”。',
  summary:
    'DOM 把 HTML 变成可导航的节点树。稳定的抽取顺序是“先卡片、后字段、再全局汇总”，缺失值必须显式表达。浏览器与 `html.parser` 都只是解析实现，不能把它们的容错行为混为一谈。',
  references: [
    'WHATWG HTML Standard：<https://html.spec.whatwg.org/>（解析、树构建与容错语义）',
    'Python 官方文档 `html.parser`：<https://docs.python.org/3/library/html.parser.html>',
    'MDN 文档对象模型概览：<https://developer.mozilla.org/zh-CN/docs/Web/API/Document_Object_Model>',
  ],
  lab: [
    '用纸笔画出 Demo 输入对应的一棵 4 层树，标出每张卡片的字段归属边界。',
    '删除第 1 张卡片的结束标签，记录 `html.parser` 的事件序列，并解释它没有做什么。',
    '给第 2 张卡片添加 `data-sku`，写断言验证两个 SKU 都能被提取。',
    '把“卡片数、记录数、缺价格数”加入报告，并写出各自的分子与分母。',
  ],
  selfExplanations: [
    '**自我解释一**：为什么“全局收集标题再全局收集价格”在字段缺失时会制造看似合理但错误的数据？',
    '**自我解释二**：浏览器能容错修复 HTML，为什么这仍不足以证明用字符串搜索就可以替代树结构？',
  ],
  predictionPrompt:
    '若第 1 张卡片缺少结束标签，你预测 `html.parser` 的事件顺序与浏览器 DOM 会完全相同吗？先写下预测，再运行 Demo 找证据。',
  tips: [
    {
      kind: 'pitfall',
      text: '字段必须绑定到最近的候选卡片祖先。全局并列匹配只适合“全页只有一个值”的页面级字段。',
    },
    {
      kind: 'note',
      text: '采集报告要同时保留 cards_seen、records 和字段缺失计数，才能区分“没有候选”与“候选失败”。',
    },
    {
      kind: 'performance',
      text: '大文档优先流式遍历或在卡片边界处理，不必为每一行字段反复扫描整页字符串。',
    },
  ],
  demo: {
    title: '用标签栈观察 DOM 深度',
    lang: 'python',
    code: `from html.parser import HTMLParser

html = """<div class="catalog">
  <article data-sku="B001"><h3>Python 数据清洗实战</h3>
    <span class="price">12.99</span></article>
  <article data-sku="B002"><h3>可观测采集</h3>
</div>"""

class Outline(HTMLParser):
    void = {"br", "img", "meta", "link", "hr", "input"}
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
    def handle_starttag(self, tag, attrs):
        depth = len(self.stack)
        attrs = dict(attrs)
        mark = f" sku={attrs['data-sku']}" if "data-sku" in attrs else ""
        print("  " * depth + f"<{tag}>{mark}")
        if tag not in self.void:
            self.stack.append(tag)
    def handle_endtag(self, tag):
        if tag in self.stack:
            while self.stack:
                current = self.stack.pop()
                if current == tag:
                    break

Outline().feed(html)`,
  },
});

const selectorLesson = makeLesson({
  id: lesson2,
  title: 'CSS 选择器与 XPath：定位目标字段',
  difficulty: 3,
  goals: [
    '读懂类、ID、属性、后代、子元素和结构伪类选择器，并能预测它们命中哪些元素。',
    '区分“定位元素”与“抽取值”，理解文本、属性和链接取值方式不同。',
    '用语义属性、稳定容器和局部作用域设计选择器，主动避开随机 class 与深层位置链。',
    '能在不依赖第三方解析器的站内环境中实现一个小型属性选择器，并用本地 HTML 测试。',
  ],
  prerequisites: [
    '理解 DOM 的祖先、后代和兄弟关系。',
    '能用 Python 处理 HTML 属性字典和字符串规范化。',
    '知道 CSS 与 XPath 是两种不同的查询语言，不需要提前记住完整语法。',
  ],
  problem:
    '页面重构后，`.card > div:nth-child(2) > span` 可能仍然存在，却从价格变成了销量；随机哈希 class 会随构建版本变化；同一个 `.price` 还可能同时出现在推荐区和主商品区。初学者的选择器往往“今天能跑”，下一次部署就悄悄抽错字段。问题不在于选择器语法不够多，而在于没有把稳定性、作用域和失败可见性一起设计。',
  intuition:
    '把选择器看成一条地址规则。优先用页面本来就承诺的语义，例如 `data-sku`、商品详情链接中的稳定路径、`article.product`；把位置条件当作最后手段。先在最近的语义容器中限定范围，再向下寻找字段，等价于先说“这个地址属于哪栋楼”，而不是只说“全国第三个窗户”。',
  concepts: `
### 1. CSS 选择器的四类信号

- **标识型**：ID 与属性值，例如 \`#main\`、\`[data-sku="B001"]\`。
- **语义型**：元素名、类名和 ARIA 角色，例如 \`article.product\`。
- **关系型**：后代空格、直接子元素 \`>\`、相邻兄弟 \`+\`。
- **结构型**：\`:first-child\`、\`:nth-of-type\` 等，对位置和同级元素类型敏感。

越靠下的信号越依赖页面排列；可以用，但必须记录到选择器风险清单。类名不等于语义，构建工具生成的哈希类名几乎没有稳定性证据。

### 2. XPath 的路径与谓词

XPath 用路径表达式导航 XML/HTML 树。\`//article[@data-sku]\` 表示在任意深度查找带属性的 article；\`./h3/text()\` 表示从当前节点取直接子元素 h3 的文本。XPath 表达力强，适合处理相邻节点与复杂谓词，但“能力更强”不意味着应把整条规则写成一条长路径。定位和抽取仍应拆开，以便单独测试。

### 3. 选择器稳定性

稳定的规则需要同时满足：

1. 在样本页面上唯一命中目标，或命中可解释的卡片集合；
2. 重构样式时不容易改变语义；
3. 目标缺失时返回空结果而不是碰到另一个字段；
4. 能通过至少两个结构不同但语义相同的夹具。

优先检查语义属性、稳定路径和 ARIA 标签；避免纯位置链、随机 class、文案精确匹配。文案匹配可抽取“含税价格”等标签，但不适合匹配随时可能变化的商品标题。

### 4. 第三方解析器边界

BeautifulSoup 的 \`select\` 与 lxml 的 XPath 都是本地环境的重要工具。但站点计分环境只预装有限科学计算包，因此课程题用标准库实现最小定位器。学习时应理解“查询语言—候选元素—字段读取—规范化”四层，而不是把某个库的方法名当作知识本身。
`,
  derivation: `
设一个页面有 3 个 \`.price\` 节点：主商品 12.99、推荐商品 8.50、划线原价 19.99。只写 \`.price\` 时得到 3 个候选，若代码取第一个，目前可能正确，但推荐区若被移动到主商品之前就会错。

改为 \`article[data-sku]\` 先定位主商品卡片：候选数从 3 降到 1，作用域包含 1 个目标价格。再在卡片内取 \`[data-role="current-price"]\`：目标数恰好 1。这样规则的可解释性为：

- 容器唯一性：1 张 \`data-sku\` 卡片；
- 字段存在性：1 个 current-price；
- 多候选处理：0 个歧义；
- 缺失表现：空列表，记录为 \`price_missing\`。

若把 \`nth-of-type(2)\` 加入，表面结果可能相同，却新增了“布局顺序”依赖。除非页面没有语义属性且有回归夹具，否则不值得。
`,
  diagram: '<Diagram type="crawl-dom-tree" name="selectors" />',
  diagramNote:
    '图中同一个 DOM 被三条选择器高亮：宽泛类选择器跨出目标卡片，直接子元素链对模板变化敏感，而“语义容器 + 属性字段”限定在正确作用域。',
  caseStudy:
    '某合成商城把商品卡从 `div` 改为 `article`，并在外层增加推荐区。旧规则 `.card div span.price:nth-of-type(1)` 在主商品上仍能命中，但推荐区先出现时抽到了 8.50。新规则 `article[data-sku] [data-role="current-price"]` 会先限定主商品集合，再按字段属性取值；推荐项没有 `data-sku`，因此被排除。团队把旧规则保留在回归用例中，证明它会在新夹具上失败，而不是仅凭肉眼宣称“新选择器更好”。',
  codePractice:
    'Demo 实现一个非常小的 CSS 子集：支持 `tag`、`.class`、`tag.class`、`[attr=value]` 与“空格表示后代”。它故意不支持伪类与组合子，目的是让你观察查询语义，而不是重新实现浏览器。随后练习把“价格必须位于商品卡片内”写入抽取函数。',
  mistakes: [
    '把 `:nth-child` 与 `:nth-of-type` 混用：前者数所有同级元素，后者只数同标签。',
    '用最长路径“看起来精确”，却把样式结构和业务字段绑定在一起。',
    '选择器找到多个元素后静默取第一个；应检测歧义或按明确排序规则处理。',
    '把 XPath 或 CSS 查询成功当成字段有效；仍要校验文本、单位、空值和类型。',
  ],
  relations:
    '本节承接 DOM 关系，直接把第 4 章的解析器选择、第 5 章的链接发现和第 9 章的字段契约连接起来。选择器稳定性也是第 10 章增量重抓的关键：页面结构变化必须能被监控，而不是悄悄产出错误记录。',
  summary:
    '选择器的核心不是语法炫技，而是稳定地缩小候选范围并显式暴露缺失。优先语义容器与数据属性，位置规则作为受控兜底；定位与取值分开测试。',
  references: [
    'MDN CSS 选择器参考：<https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_selectors>',
    'MDN XPath 概览：<https://developer.mozilla.org/en-US/docs/Web/XML/XPath>',
    'Beautiful Soup 官方文档：<https://www.crummy.com/software/BeautifulSoup/bs4/doc/>',
    'lxml 官方文档：<https://lxml.de/>',
  ],
  lab: [
    '为同一张商品卡片写出三种选择器：优先语义、可接受兜底、禁止使用的位置链。',
    '用 Demo 的迷你选择器跑两个夹具，记录命中数、歧义数和缺失数。',
    '把 `nth-child` 与 `nth-of-type` 的差异写成一个最小反例。',
    '设计一个“推荐区插入主商品之前”的回归样本，证明旧规则会抽错。',
  ],
  selfExplanations: [
    '**自我解释一**：为什么“当前能唯一命中”不足以证明选择器稳定？请从页面重构和缺失字段两个方向解释。',
    '**自我解释二**：定位容器与读取字段分开，会给测试和错误报告带来什么具体好处？',
  ],
  predictionPrompt:
    '如果推荐卡片被移动到主商品之前，你预测 `.card .price:first-of-type` 会命中哪一个价格？先画候选顺序，再验证。',
  tips: [
    {
      kind: 'pitfall',
      text: '选择器命中多个元素时必须显式报告歧义；静默取第一个会把页面变化伪装成成功。',
    },
    {
      kind: 'note',
      text: '`:nth-of-type` 按同标签计数，`:nth-child` 按所有元素计数；两者在混合模板中结果经常不同。',
    },
    {
      kind: 'interview',
      text: '面试中比较 CSS 与 XPath，不要只列语法：说明定位能力、稳定性、可读性和解析器支持差异。',
    },
  ],
  demo: {
    title: '一个可解释的迷你 CSS 选择器',
    lang: 'python',
    code: `from html.parser import HTMLParser

html = """<article class="product" data-sku="B1">
  <h3>本地数据清洗</h3><span class="price">12.99</span>
</article>
<aside><span class="price">8.50</span></aside>"""

class Node:
    def __init__(self, tag, attrs):
        self.tag, self.attrs, self.children, self.text = tag, dict(attrs), [], ""

class Tree(HTMLParser):
    def __init__(self):
        super().__init__()
        self.root = Node("root", {})
        self.stack = [self.root]
    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs)
        self.stack[-1].children.append(node)
        self.stack.append(node)
    def handle_endtag(self, tag):
        if len(self.stack) > 1:
            self.stack.pop()
    def handle_data(self, data):
        if data.strip():
            self.stack[-1].text += data.strip()

def matches(node, part):
    if "[" in part:
        tag, expr = part[:-1].split("[", 1)
        key, value = expr.split("=", 1)
        return node.tag == tag and node.attrs.get(key) == value.strip('"')
    if "." in part:
        tag, cls = part.split(".", 1)
        return node.tag == tag and cls in node.attrs.get("class", "").split()
    return node.tag == part

def descendants(node):
    for child in node.children:
        yield child
        yield from descendants(child)

def select(node, selector):
    current = [node]
    for part in selector.split():
        current = [d for item in current for d in descendants(item) if matches(d, part)]
    return current

tree = Tree(); tree.feed(html)
prices = select(tree.root, "article[data-sku=B1] .price")
print([p.text for p in prices])`,
  },
});

const structureLesson = makeLesson({
  id: lesson3,
  title: '结构化数据、表格与容错解析',
  difficulty: 3,
  goals: [
    '区分 JSON-LD、Microdata、Open Graph 与普通 HTML 卡片四种数据来源的能力边界。',
    '处理重复卡片、缺失字段、空值、多值与相对链接，并用显式类型表达“不知道”。',
    '处理 `<base>`、嵌套表格和跨行关系，理解它们对 URL 与字段归属的影响。',
    '设计一套可复核的来源优先级与冲突合并规则，避免“后写覆盖前写”的偶然结果。',
  ],
  prerequisites: [
    '能用 DOM 思维定位卡片并读取文本与属性。',
    '会解析 JSON，并理解 `None` 与空字符串不同。',
    '知道相对 URL 需要基准地址，但尚未假设所有页面的基准都等于请求 URL。',
  ],
  problem:
    '同一商品页可能同时包含可视 HTML、JSON-LD、Open Graph 和表格行。它们可能给出不同价格、币种或更新时间；模板改版后普通 HTML 少一个字段，而 JSON-LD 仍然存在。若用一个 `update()` 盲目合并，最终值取决于字典遍历顺序。若来源冲突时不记录证据，数据团队无法判断究竟该相信哪一个。',
  intuition:
    '把每条字段看成一份有出处的证据：JSON-LD 是发布者为机器阅读声明的对象，Open Graph 偏社交展示，HTML 卡片是用户实际看到的内容，表格则把同一行内的关系编码在单元格位置。合并不是“谁最后写谁赢”，而是先定义字段级优先级、验证规则和冲突保留策略。',
  concepts: `
### 1. 四种结构化来源

| 来源 | 优势 | 典型限制 | 适合优先读取的字段 |
| --- | --- | --- | --- |
| JSON-LD | 类型明确、可嵌套 | 可能与可见内容不一致、需要 schema 校验 | SKU、名称、价格、货币 |
| Microdata | 与 HTML 元素绑定 | 标记可能不完整、嵌套复杂 | 商品、评分、面包屑 |
| Open Graph | 页面级元数据稳定 | 面向分享摘要，不一定有完整业务字段 | 页面标题、规范 URL、摘要 |
| HTML 卡片/表格 | 用户实际看到 | 易受模板变化与缺失影响 | 可见价格、库存文案、行内关系 |

这张表要解决的不是“谁最高级”，而是为每个字段说明为什么选择某个来源，以及另一个来源如何提供交叉检查。

### 2. 缺失、空值与未知

- **缺失**：字段节点不存在，或来源没有提供该键，值应为 \`None\`。
- **空字符串**：来源明确提供了节点，但内容为空，通常要进入质量告警。
- **零**：真实数值，例如库存 0 或价格 0（促销），不能自动当作缺值。
- **多值**：作者列表、多个图片 URL 或多行规格；必须与单值字段使用不同契约。

### 3. \`base\` 与链接

\`<base href="https://shop.test/catalog/">\` 会改变页面内相对链接的解析基准。抽取链接时必须先读取第一个合法 base，再用 \`urljoin(base, href)\`；没找到 base 时才以实际请求的最终 URL 为基准。重定向后的最终 URL 与初始 URL 不同，也是常见故障来源。

### 4. 表格与重复卡片

表格的字段归属由行列坐标决定。\`rowspan\`、\`colspan\` 与嵌套表格会改变列索引；只按 \`td\` 出现顺序相加会错位。重复卡片应先以独立容器切分，再逐卡片读取。冲突合并需要至少三个字段：选中值、来源、冲突证据列表；只保留一个值会让问题不可审计。
`,
  derivation: `
设一张商品页有 4 个字段来源：

- JSON-LD 提供 sku=B001、name=“Python 数据清洗实战”、price=12.99、currency=CNY；
- Open Graph 提供 title=“Python 数据清洗实战 | 本地书店”、url=https://shop.test/books/b001；
- HTML 卡片提供可见价 13.50、库存“有货”；
- 表格给出作者与 ISBN，其中 ISBN 行跨 2 行。

先按字段契约合并：sku 只取 JSON-LD；name 优先 JSON-LD；currency 只接受 3 位 ISO 代码；source_url 以 canonical 规则生成；可见价与 JSON-LD 价格冲突时保留两者。覆盖率按契约必填字段计算：若必填 6 个字段，sku/name/currency/author/isbn/source_url 都找到了，则覆盖率 6/6=100%；但质量报告仍列出 1 个价格冲突。覆盖率 100% 不代表语义完全一致，这就是两个指标必须并列的原因。
`,
  diagram:
    '| 字段 | 首选来源 | 兜底来源 | 冲突处理 | 缺失计数 |\n| --- | --- | --- | --- | --- |\n| sku | JSON-LD | HTML `data-sku` | 不同即阻断该记录 | 是 |\n| price | JSON-LD + currency | 可见价格文本 | 两者都保存并告警 | 是 |\n| title | JSON-LD | Open Graph | 不直接拼接 | 是 |\n| author | 规格表 | JSON-LD 数组 | 多值保序 | 是 |',
  diagramNote:
    '这张字段契约表把“去哪里取、缺了怎么办、冲突怎么留证据”固定在字段级。没有这张表，所谓融合只是偶然的字典覆盖。',
  caseStudy:
    '合成页面中，JSON-LD 价格是 12.99 CNY，HTML 可见价是 13.50 CNY。抽取器先验证 JSON-LD 是对象、价格是有限正数、币种为 CNY；随后把 HTML 可见价单独保存为 `display_price`。最终记录同时包含 `price=12.99`、`display_price=13.50`、`warning="price_conflict"`。若 JSON-LD 的价格是字符串“免运费”，验证失败，则记录进入错误清单，而不是把字符串强转成 0。重复卡片按 `data-sku` 去重时保留首次出现顺序；同一 SKU 的两个不同价格进入冲突报告，供人工核查。',
  codePractice:
    'Demo 从 HTML 中提取 `script[type="application/ld+json"]`，解析后做最小 schema 检查。它只接受字典或字典列表，并显式返回错误分类。练习会要求你保留价格冲突，而不是擅自覆盖。真实页面可能含有无效 JSON、HTML 实体和多个脚本；课程把这些问题拆成可断言的小步骤。',
  mistakes: [
    '把 JSON-LD 当成可信数据库：它仍可能过期、错误或与可见内容冲突。',
    '用 `or` 合并 0、False 与空字符串，导致合法值被兜底值替换。',
    '忽略 `<base>` 和重定向后 URL，最终把相对链接解析到错误域名。',
    '只统计成功记录覆盖率，不统计候选卡片总数，掩盖坏样本与冲突。',
  ],
  relations:
    '本节把 DOM 与选择器推进到字段契约，为第 4 章列表页/详情页、第 9 章 Schema 和质量、第 10 章版本比较以及第 12 章安全解析提供输入。安全上还要记住：结构化数据也是不可信输入，解析器必须限制大小与深度。',
  summary:
    '结构化数据是带来源的候选证据，不是自动真相。按字段定义优先级，保留冲突证据，区分缺失、空值和合法零值，并把覆盖率与一致性分别报告。',
  references: [
    'Schema.org 官方文档：<https://schema.org/>',
    'JSON-LD 规范：<https://www.w3.org/TR/json-ld11/>',
    'WHATWG HTML `<base>` 元素：<https://html.spec.whatwg.org/multipage/semantics.html#the-base-element>',
    'Python `json` 文档：<https://docs.python.org/3/library/json.html>',
  ],
  lab: [
    '为 5 个字段写出来源优先级与缺失处理，不允许只写“从页面提取”。',
    '构造一个 JSON-LD 与可见价格冲突的样本，输出两个值和冲突标记。',
    '给同一个链接分别设置 `<base href="/catalog/">` 与绝对 base，验证最终 URL。',
    '用 6 个候选卡片、2 个缺价格、1 个空标题的样本计算卡片覆盖率和字段覆盖率。',
  ],
  selfExplanations: [
    '**自我解释一**：为什么字段覆盖率 100% 仍可能有严重的数据质量冲突？请用语料中的价格示例解释。',
    '**自我解释二**：`None`、空字符串、0 在字段契约中分别代表什么？为什么不能用同一个 `or` 表达式合并？',
  ],
  predictionPrompt:
    '若 JSON-LD 给出 12.99、HTML 可见价给出 13.50，你预测直接 `dict.update` 后的记录能解释差异吗？先写下你会保留哪些证据。',
  tips: [
    {
      kind: 'pitfall',
      text: '结构化数据也必须经过类型、范围、币种和来源校验；合法 JSON 不等于合法业务字段。',
    },
    {
      kind: 'note',
      text: '冲突不是噪声，而是可观测信号。保留主值、次要值与来源，比静默覆盖更利于维护。',
    },
    {
      kind: 'leak',
      text: '结构化脚本、表格与卡片仍可能包含个人数据；只抽取任务必要字段，并设置保留期限。',
    },
  ],
  demo: {
    title: '提取并校验 JSON-LD',
    lang: 'python',
    code: `from html.parser import HTMLParser
import json

html = """<script type="application/ld+json">
{"@type":"Product","sku":"B001","name":"Python 数据清洗实战","offers":{"price":"12.99","priceCurrency":"CNY"}}
</script>"""

class JsonLd(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_ld = False
        self.parts = []
    def handle_starttag(self, tag, attrs):
        self.in_ld = tag == "script" and dict(attrs).get("type") == "application/ld+json"
    def handle_data(self, data):
        if self.in_ld:
            self.parts.append(data)
    def handle_endtag(self, tag):
        if tag == "script":
            self.in_ld = False

parser = JsonLd(); parser.feed(html)
data = json.loads("".join(parser.parts))
offer = data.get("offers", {})
record = {
    "sku": data.get("sku"),
    "name": data.get("name"),
    "price": float(offer["price"]) if str(offer.get("price", "")).replace(".", "", 1).isdigit() else None,
    "currency": offer.get("priceCurrency"),
}
errors = []
if not record["sku"]:
    errors.append("missing_sku")
if record["currency"] not in {"CNY", "USD", "EUR"}:
    errors.append("invalid_currency")
print(record, errors)`,
  },
});

const domExercises = makeExercises(chapterId, lesson1, 2, [
  {
    type: 'single',
    question: '在 `<article><h3>标题</h3></article>` 中，`h3` 相对 `article` 的关系是？',
    options: [
      ['A', '父元素'],
      ['B', '子元素'],
      ['C', '兄弟元素'],
      ['D', '属性节点'],
    ],
    answer: 'B',
    explanation: '`article` 直接包含 `h3`，因此 `h3` 是子元素，`article` 是父元素。',
    tags: ['DOM 关系'],
  },
  {
    type: 'judge',
    question: '浏览器按 HTML 标准执行容错后构建的 DOM，可能包含服务器源码中未显式写出的元素。',
    answer: true,
    explanation: 'HTML5 树构建会隐式补全某些元素，例如表格的 `tbody`；因此源码与浏览器 DOM 不能简单画等号。',
    tags: ['HTML 容错'],
  },
  {
    type: 'fill',
    question: '元素 A 直接包含元素 B，则 B 是 A 的 ___；若 C 与 B 共享同一父元素，则 B 与 C 是 ___。',
    blanks: [['子元素', '子节点'], ['兄弟元素', '兄弟节点']],
    explanation: '直接包含是父子关系，共享父元素是兄弟关系。',
    tags: ['DOM 关系'],
  },
  {
    type: 'single',
    question: '为什么字段抽取通常应先定位“卡片容器”再读取卡片内字段？',
    options: [
      ['A', '因为卡片容器加载最快'],
      ['B', '因为这样可以避免缺失字段造成跨卡片错位配平'],
      ['C', '因为所有字段都只能在 article 中出现'],
      ['D', '因为全局选择器一定返回空列表'],
    ],
    answer: 'B',
    explanation: '先限定卡片作用域，字段与记录有明确归属；全局并列列表在缺失项时会错位。',
    tags: ['字段归属'],
  },
  {
    type: 'code',
    question:
      '实现 `first_tag_text(html, tag)`：返回指定标签第一次出现到其结束标签之间的可见文本（去掉首尾空白，内部文本直接连接）。固定 HTML 不含同名嵌套标签。',
    starterCode: `from html.parser import HTMLParser

def first_tag_text(html, tag):
    # TODO: 只收集目标标签内的文本
    pass
`,
    expectedOutput: '第一次命中的目标标签文本',
    tests: `html = "<h1> 主标题 </h1><p>说明</p><h2>副标题</h2>"
assert first_tag_text(html, "h1") == "主标题"
assert first_tag_text(html, "h2") == "副标题"
assert first_tag_text(html, "h3") is None
`,
    answer: `from html.parser import HTMLParser

def first_tag_text(html, tag):
    class Reader(HTMLParser):
        def __init__(self):
            super().__init__(convert_charrefs=True)
            self.depth = 0
            self.found = False
            self.done = False
            self.parts = []
        def handle_starttag(self, current, attrs):
            if self.done:
                return
            if self.depth:
                self.depth += 1
            elif current == tag:
                self.depth = 1
                self.found = True
        def handle_endtag(self, current):
            if self.done or not self.depth:
                return
            if current == tag:
                self.depth -= 1
                if self.depth == 0:
                    self.done = True
            else:
                self.depth = max(0, self.depth - 1)
        def handle_data(self, data):
            if self.depth and not self.done:
                self.parts.append(data)
    reader = Reader()
    reader.feed(html)
    return "".join(reader.parts).strip() if reader.found else None
`,
    explanation: '解析器需要显式记录“是否已进入目标标签”和“是否已结束”，不能把全页文本都收集起来。',
    tags: ['HTMLParser', '文本节点'],
    allowedModules: ['html.parser'],
  },
  {
    type: 'judge',
    question: '在判断 DOM 结构语义时，元素的属性书写顺序通常不应成为字段归属依据。',
    answer: true,
    explanation: 'HTML 属性的顺序不是稳定的业务信号；应读取属性名和值，而不是依赖它们在源码中排第几。',
    tags: ['属性'],
  },
  {
    type: 'multiple',
    question: '以下哪些是“按卡片作用域抽取”应具备的行为？',
    options: [
      ['A', '为每张候选卡建立独立字段容器'],
      ['B', '缺字段时保留记录并显式标记未知'],
      ['C', '把全页所有价格按顺序配给所有标题'],
      ['D', '报告候选卡片数与成功记录数'],
    ],
    answer: ['A', 'B', 'D'],
    explanation: 'A/B/D 保留归属与可观测性；C 正是缺失字段时产生错位数据的反例。',
    tags: ['卡片抽取'],
  },
  {
    type: 'open',
    question:
      '某列表页有 5 张商品卡，其中第 2 张缺价格、第 4 张缺标题。请说明你会如何保留记录、计算覆盖率并避免跨卡片串值。',
    referenceAnswer:
      '先保留 5 张候选卡，逐卡读取字段；缺失字段写 None 并加入缺失清单。记录数仍可保留 5，字段覆盖率按标题 4/5=80%、价格 4/5=80% 计算，并分别报告缺失字段。禁止用上一张卡或全局默认值填充，抽取后用至少两个夹具验证卡片边界。',
    rubric: [
      { point: '保留候选卡并逐卡抽取', score: 2 },
      { point: '区分缺失与默认值', score: 2 },
      { point: '给出正确覆盖率口径', score: 2 },
      { point: '说明避免串值的机制', score: 2 },
    ],
    explanation: '本题考查字段归属和数据口径，不要求特定库；关键是显式记录未知，而不是掩盖。',
    tags: ['字段覆盖', '开放题'],
    keywords: ['卡片', 'None', '覆盖率', '串值'],
  },
]);

const selectorExercises = makeExercises(chapterId, lesson2, 3, [
  {
    type: 'single',
    question: '选择器 `article.product [data-role="current-price"]` 表示什么？',
    options: [
      ['A', '页面中所有 data-role 属性'],
      ['B', '带 product 类的 article 内部，data-role 为 current-price 的元素'],
      ['C', '与 article 相邻的价格元素'],
      ['D', 'article 本身的 data-role 属性'],
    ],
    answer: 'B',
    explanation: '空格是后代组合子，因此右侧元素必须位于左侧 article.product 的内部。',
    tags: ['CSS 选择器'],
  },
  {
    type: 'multiple',
    question: '以下哪些信号通常比随机哈希 class 更适合作为稳定定位依据？',
    options: [
      ['A', '稳定的 data-* 属性'],
      ['B', '页面声明的语义容器'],
      ['C', '随构建变化的 class 哈希'],
      ['D', '稳定的规范链接路径'],
    ],
    answer: ['A', 'B', 'D'],
    explanation: '数据属性、语义容器和规范路径都表达业务或接口契约；构建哈希类名缺乏稳定性。',
    tags: ['选择器稳定性'],
  },
  {
    type: 'fill',
    question:
      '在 `<div><p>A</p><span>B</span><p>C</p></div>` 中，第二个 `p` 的 `:nth-of-type(2)` 命中 ___，`:nth-child(3)` 命中 ___。',
    blanks: [['C'], ['C']],
    explanation: '第二个 p 是第二个同类元素，也是父元素的第三个子元素；两种语法在本例都命中 C。关键差异在混合标签与位置变化的其他样本中显现。',
    tags: ['结构伪类'],
  },
  {
    type: 'judge',
    question: '一条很长的 `div > div:nth-child(3) > span` 路径只要当前能命中，就足以证明它比短语义选择器稳定。',
    answer: false,
    explanation: '当前唯一命中只证明一次成功；长位置链通常更依赖模板结构，重构时风险更高。',
    tags: ['选择器风险'],
  },
  {
    type: 'code',
    question:
      '实现 `select_products(html)`：返回列表，每项为 `{"sku": ..., "title": ...}`。只处理 `article` 且带 `data-sku` 的卡片，标题取卡片内第一个 `h3` 的文本；无标题时 title 为 None。',
    starterCode: `from html.parser import HTMLParser

def select_products(html):
    # TODO: 按 article[data-sku] 容器抽取
    pass
`,
    expectedOutput: '商品字典列表',
    tests: `html = '<article data-sku="B1"><h3>Alpha</h3></article><article><h3>No sku</h3></article><article data-sku="B2"></article>'
assert select_products(html) == [{"sku":"B1","title":"Alpha"},{"sku":"B2","title":None}]
`,
    answer: `from html.parser import HTMLParser

def select_products(html):
    class Reader(HTMLParser):
        def __init__(self):
            super().__init__(convert_charrefs=True)
            self.items = []
            self.current = None
            self.in_title = False
            self.parts = []
        def handle_starttag(self, tag, attrs):
            attrs = dict(attrs)
            if tag == "article" and "data-sku" in attrs:
                self.current = {"sku": attrs["data-sku"], "title": None}
                self.items.append(self.current)
            elif tag == "h3" and self.current is not None and self.current["title"] is None:
                self.in_title = True
                self.parts = []
        def handle_data(self, data):
            if self.in_title:
                self.parts.append(data)
        def handle_endtag(self, tag):
            if tag == "h3" and self.in_title:
                self.current["title"] = "".join(self.parts).strip() or None
                self.in_title = False
            elif tag == "article":
                self.current = None
    reader = Reader(); reader.feed(html)
    return reader.items
`,
    explanation: '解析器维护当前卡片作用域；无 SKU 的 article 不进入候选，标题缺失保留 None。',
    tags: ['容器抽取', 'HTMLParser'],
    allowedModules: ['html.parser'],
  },
  {
    type: 'code',
    question:
      '实现 `extract_attr(html, tag, attr)`：返回所有指定标签的指定属性值，保持文档顺序，跳过无该属性的标签。',
    starterCode: `from html.parser import HTMLParser

def extract_attr(html, tag, attr):
    pass
`,
    expectedOutput: '属性值列表',
    tests: `assert extract_attr('<a href="/a">A</a><a>B</a><a href="/c">C</a>', 'a', 'href') == ['/a', '/c']
assert extract_attr('<img src="x"><img>', 'img', 'src') == ['x']
`,
    answer: `from html.parser import HTMLParser

def extract_attr(html, tag, attr):
    class Reader(HTMLParser):
        def __init__(self):
            super().__init__()
            self.values = []
        def handle_starttag(self, current, attrs):
            values = dict(attrs)
            if current == tag and values.get(attr) is not None:
                self.values.append(values[attr])
    reader = Reader(); reader.feed(html)
    return reader.values
`,
    explanation: '`get(attr)` 区分“属性存在且为空”和“属性不存在”；题目要求跳过不存在，因此必须显式判断。',
    tags: ['属性取值'],
    allowedModules: ['html.parser'],
  },
  {
    type: 'single',
    question: 'XPath `//article[@data-sku]/h3/text()` 中最准确的描述是？',
    options: [
      ['A', '所有 h3 的 data-sku'],
      ['B', '任意深度带 data-sku 的 article 的直接 h3 子元素文本'],
      ['C', 'article 的父元素文本'],
      ['D', '带 h3 属性的 article'],
    ],
    answer: 'B',
    explanation: '`//` 表示任意深度，`@data-sku` 是存在性谓词，`/h3/text()` 取直接子元素 h3 的文本。',
    tags: ['XPath'],
  },
  {
    type: 'judge',
    question: '选择器命中多个元素时，直接取第一个总能得到正确字段。',
    answer: false,
    explanation: '多个候选可能表示歧义或作用域过宽；静默取首个会把布局变化变成隐蔽错误。',
    tags: ['歧义检测'],
  },
  {
    type: 'open',
    question:
      '页面改版后推荐区出现在主商品之前。旧选择器 `.card .price:first-of-type` 抽到了 8.50。请分析原因并给出替代规则和回归证据。',
    referenceAnswer:
      '旧规则没有把主商品容器限定住，先出现的推荐区价格成为首个候选。替代方案应先定位带 data-sku 的主商品 article，再在内部读取 data-role=current-price；需要保留一个“推荐区前置”的夹具，断言旧规则错、新规则对，并报告多候选和缺失。',
    rubric: [
      { point: '解释作用域过宽', score: 2 },
      { point: '提出语义容器与字段限定', score: 3 },
      { point: '给出可执行回归样本', score: 3 },
    ],
    explanation: '选择器稳定性必须通过反例与夹具证明，而不是只描述“更语义化”。',
    tags: ['选择器审计', '开放题'],
    keywords: ['作用域', 'data-sku', '回归', '多候选'],
  },
  {
    type: 'single',
    question:
      '页面含 4 个 `.price`，其中 1 个在主商品卡、2 个在推荐区、1 个是划线原价。只写 `.price` 后取第一个，最主要的风险是什么？',
    options: [
      ['A', '解析器会拒绝 class 选择器'],
      ['B', '推荐区或原价可能先出现，导致字段语义错误'],
      ['C', '价格会自动变成整数'],
      ['D', '浏览器不会渲染剩余节点'],
    ],
    answer: 'B',
    explanation: '候选范围跨出了目标字段语义；首个位置不是稳定性证据，布局变化会改变命中对象。',
    tags: ['作用域', '多候选'],
  },
]);

const structuredExercises = makeExercises(chapterId, lesson3, 3, [
  {
    type: 'single',
    question: 'JSON-LD 与可见 HTML 价格冲突时，最稳妥的工程处理是？',
    options: [
      ['A', '直接相信 JSON-LD，删除可见价'],
      ['B', '保留两个来源的值并记录冲突，按契约选主值'],
      ['C', '把两者相加'],
      ['D', '任意取字典最后一个键'],
    ],
    answer: 'B',
    explanation: '冲突本身是可观测信息；保留来源与两个值才能审计，主值选择应由字段契约决定。',
    tags: ['来源冲突'],
  },
  {
    type: 'multiple',
    question: '哪些字段适合保留为多值而不是强行取第一个？',
    options: [
      ['A', '商品作者列表'],
      ['B', '页面中的多个规格键值'],
      ['C', '唯一 SKU'],
      ['D', '同一商品的多个图片 URL'],
    ],
    answer: ['A', 'B', 'D'],
    explanation: '作者、规格和图片可以合法多值；唯一 SKU 若出现多个则应视为冲突，而不是列表。',
    tags: ['多值字段'],
  },
  {
    type: 'fill',
    question:
      '页面请求 URL 为 `https://shop.test/c/1`，若存在 `<base href="https://shop.test/catalog/">`，相对链接 `../b/2` 应解析为 ___。',
    blanks: [['https://shop.test/b/2']],
    explanation: 'base 改变了合并基准：`https://shop.test/catalog/` 上合并 `../b/2` 得到 `https://shop.test/b/2`。',
    tags: ['base 与 URL'],
  },
  {
    type: 'judge',
    question: '只要 JSON 能被 `json.loads` 成功解析，其中的价格字段就可以直接信任。',
    answer: false,
    explanation: '合法 JSON 只说明语法正确；还需验证类型、范围、币种、来源和与可见内容的一致性。',
    tags: ['结构化校验'],
  },
  {
    type: 'code',
    question:
      '实现 `ld_products(html)`：提取所有 `application/ld+json` 脚本，返回其中 `@type` 为 `Product` 的字典列表；非 Product、无效 JSON 或非对象脚本跳过。',
    starterCode: `from html.parser import HTMLParser
import json

def ld_products(html):
    pass
`,
    expectedOutput: 'Product 字典列表',
    tests: `html = '<script type="application/ld+json">{"@type":"Product","sku":"B1"}</script><script type="application/ld+json">{"@type":"WebPage"}</script><script type="application/ld+json">bad</script>'
assert ld_products(html) == [{"@type":"Product","sku":"B1"}]
`,
    answer: `from html.parser import HTMLParser
import json

def ld_products(html):
    class Reader(HTMLParser):
        def __init__(self):
            super().__init__()
            self.active = False
            self.parts = []
            self.blocks = []
        def handle_starttag(self, tag, attrs):
            if tag == "script" and dict(attrs).get("type") == "application/ld+json":
                self.active = True
                self.parts = []
        def handle_data(self, data):
            if self.active:
                self.parts.append(data)
        def handle_endtag(self, tag):
            if tag == "script" and self.active:
                self.blocks.append("".join(self.parts))
                self.active = False
    reader = Reader(); reader.feed(html)
    products = []
    for block in reader.blocks:
        try:
            data = json.loads(block)
        except (json.JSONDecodeError, TypeError):
            continue
        if isinstance(data, dict) and data.get("@type") == "Product":
            products.append(data)
    return products
`,
    explanation: '解析和对 JSON 有效性的判断分开；无效块跳过，但不能让整页抽取崩溃。',
    tags: ['JSON-LD', '容错'],
    allowedModules: ['html.parser', 'json'],
  },
  {
    type: 'code',
    question:
      '实现 `merge_fields(primary, fallback, fields)`：按 fields 顺序，优先取 primary 中非 None 的值，否则取 fallback 中非 None 的值；返回字典，某字段两边都无值时值为 None。空字符串和 0 是有效值。',
    starterCode: `def merge_fields(primary, fallback, fields):
    pass
`,
    expectedOutput: '合并后的字段字典',
    tests: `out = merge_fields({"price":0,"title":""},{"price":12,"title":"旧标题","sku":"B1"},["price","title","sku"])
assert out == {"price":0,"title":"","sku":"B1"}, out
`,
    answer: `def merge_fields(primary, fallback, fields):
    result = {}
    for field in fields:
        value = primary.get(field)
        if value is None:
            value = fallback.get(field)
        result[field] = value
    return result
`,
    explanation: '必须用 `is None` 判空，不能用 `or`，否则 0 与空字符串会被错误覆盖。',
    tags: ['合并', 'None'],
  },
  {
    type: 'open',
    question:
      '一个页面有 8 张候选卡：3 张缺价格，1 张空标题，1 张 JSON-LD 与可见价冲突。请分别给出记录数、价格覆盖率、标题有效率和冲突率的分母与结果。',
    referenceAnswer:
      '候选记录数为 8。价格覆盖 5/8=62.5%；标题有效 7/8=87.5%（空标题不算有效）；价格冲突 1/8=12.5%。应同时保留候选数、有效数、缺失数、冲突数，不能只用最终成功记录作分母。',
    rubric: [
      { point: '记录候选分母为 8', score: 2 },
      { point: '价格覆盖率计算正确', score: 2 },
      { point: '标题有效率把空字符串视为无效', score: 2 },
      { point: '冲突率并说明可观测性', score: 2 },
    ],
    explanation: '质量指标的关键是可复核的分子和分母；覆盖率不替代一致性。',
    tags: ['质量计算', '开放题'],
    keywords: ['8', '62.5%', '87.5%', '12.5%'],
  },
  {
    type: 'single',
    question: '在表格中处理 `rowspan` 时，为什么不能只按每行 `td` 的顺序一直递增列号？',
    options: [
      ['A', '因为 td 没有文本'],
      ['B', '因为上一行的跨行单元格仍占据后续行的列位置'],
      ['C', '因为 rowspan 会删除表头'],
      ['D', '因为所有表格都必须用 JSON'],
    ],
    answer: 'B',
    explanation: '跨行单元格会占据后续行的逻辑列，简单逐行计数会造成字段错列。',
    tags: ['HTML 表格'],
  },
  {
    type: 'judge',
    question: '`None`、空字符串和数值 0 在数据契约中可以由同一个默认值代替。',
    answer: false,
    explanation: '三者语义不同：None 表示未知，空字符串表示空内容，0 可能是合法数值；必须分别校验。',
    tags: ['缺失与空值'],
  },
  {
    type: 'single',
    question:
      '若列表页有 10 张候选卡，其中 8 条成功输出、2 条因缺必填 SKU 被驳回，则卡片级字段完整率最有意义的分母是？',
    options: [
      ['A', '8，只看成功输出'],
      ['B', '10，所有候选卡'],
      ['C', '2，只看失败记录'],
      ['D', '任意值都可以'],
    ],
    answer: 'B',
    explanation: '以候选卡为分母才能反映发现后的完整率 8/10=80%；只拿成功记录作分母会掩盖被拒样本。',
    tags: ['覆盖率', '分母'],
  },
]);

export const webCrawlingChapters03: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: chapterId,
    title: 'HTML、DOM 与页面结构',
    goal: '从页面外观转向 DOM 结构，使用稳定定位方式抽取字段，并处理不完整或相互冲突的 HTML。',
    lessons: [domLesson, selectorLesson, structureLesson],
    exercises: [...domExercises, ...selectorExercises, ...structuredExercises],
  },
];
