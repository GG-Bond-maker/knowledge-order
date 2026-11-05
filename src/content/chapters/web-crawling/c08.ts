import type { Chapter } from '../../../types';
import { makeExercises, makeLesson } from './authoring';

const chapterId = 'web-crawling-c08';
const lesson1 = `${chapterId}-l01`;
const lesson2 = `${chapterId}-l02`;
const lesson3 = `${chapterId}-l03`;

const renderLesson = makeLesson({
  id: lesson1,
  title: 'SSR、CSR 与何时需要浏览器',
  difficulty: 2,
  goals: [
    '区分服务端渲染、客户端渲染与本机浏览器执行后得到的 DOM。',
    '用 View Source、DevTools Elements 与 Network 判断数据实际来自哪里。',
    '优先发现 JSON 接口或嵌入数据，只有必要时才承担浏览器渲染成本。',
    '把渲染策略选择写成可复查的决策表，而不是凭“页面看起来有内容”猜测。',
  ],
  prerequisites: [
    '理解 HTTP 响应体、状态码与 HTML 文档。',
    '能在浏览器 DevTools 中打开 Elements 和 Network 面板。',
    '知道 DOM 是解析后的树，不等同于服务器返回的原始字节。',
  ],
  problem:
    '同一张商品页在浏览器里能看到价格，但采集脚本拿到的 HTML 只有空壳。原因是价格由 JavaScript 在浏览器执行后写入 DOM，原始响应中并不存在。若立刻引入浏览器，可能绕过了更稳定的 JSON 接口；若坚持只抓 HTML，又会把动态字段全部漏掉。关键不是“能不能渲染”，而是先判断数据在哪一层产生、哪一层最容易验证。',
  intuition:
    '把页面想成餐厅：SSR 像厨房先把菜装盘再送到桌上，原始响应里就有内容；CSR 像先给空桌和菜单，再由服务员现场制作；API 则像直接去后厨窗口取原料。浏览器自动化是最后一层“现场制作”，能力最强，但启动慢、资源多、失败面也最大。',
  concepts: `
### 1. 三个观察面

- **View Source / curl**：服务器原始响应，回答“不执行 JavaScript 时能拿到什么”；
- **Elements**：当前 DOM，包含脚本插入、属性修改和 shadow 内容；
- **Network**：页面运行期间发出的 XHR/fetch、静态资源与响应状态。

三者必须交叉观察。Elements 里存在的节点不代表原始 HTML 存在；Network 里出现 JSON 也不自动意味着它是公开、稳定、允许批量采集的接口。

### 2. SSR、CSR 与混合渲染

SSR 先返回带内容的 HTML，适合直接解析。CSR 返回应用壳，页面在浏览器中请求数据后构建 DOM。混合渲染可能先返回首屏，再在客户端补充推荐、价格或评论。判断时要看具体字段，而不是给整站贴一个标签。搜索引擎文档也强调：JavaScript 生成的链接与内容需要额外的渲染与可发现性检查。

### 3. 找一个更便宜的数据层

优先级通常是：

1. 原始 HTML 中已存在的结构化字段；
2. 页面内嵌的 JSON，如 hydration 数据；
3. 页面主动请求的公开 JSON 接口；
4. 本地授权的浏览器自动化；
5. 人工导出或其他非采集路径。

顺序体现的是成本、稳定性与授权边界。API 可能返回更干净的字段，也可能受认证和条款限制；不能把“找到了接口”当成“可以无限制调用”。

### 4. 渲染成本

浏览器需要进程、内存、字体、脚本执行和网络等待。一次 HTML 解析可能只需几毫秒，而启动无头浏览器和等待应用就绪可能需要数百毫秒到数秒。动态页面的失败还可能是选择器变化、资源超时、动画未结束、懒加载未触发或应用报错。用浏览器之前先记录：哪些字段必须执行 JavaScript，是否有更低成本替代。

### 5. 决策表

| 观察结果 | 首选策略 | 需要保留的证据 |
| --- | --- | --- |
| 原始 HTML 有完整字段 | 静态解析 | 响应体样本、选择器断言 |
| 原始 HTML 有 hydration JSON | 提取嵌入 JSON | 脚本位置、字段 schema |
| Network 有公开 JSON | 受限 API 采集 | 请求参数、响应样本、授权范围 |
| 字段只在交互或脚本后出现 | 本地浏览器自动化 | DOM 标记、条件等待、超时证据 |
| 页面要求登录、验证码或绕过限制 | 停止 | 不实现访问控制绕过 |

决策表的价值在于让“为什么上浏览器”可以被同行复核。若证据无法说明字段只存在于执行后的 DOM，就不应急着增加依赖。

### 6. 动态内容的静态残影

有些页面把初始数据放在 script 标签里，例如带 type=application/json 的 hydration 节点。它们既不是可见文本，也不一定出现在 Network。解析前先检查 script 标签、meta 标签和数据属性，往往能以静态方式获得更稳定的数据。但嵌入结构属于页面实现细节，升级时可能变化，所以仍要保留 schema 校验和回归夹具。
`,
  derivation: `
假设一个页面有三种数据源：

- 原始 HTML 的标题：请求 1 次，解析 5 ms；
- hydration JSON 的价格：同一响应内，解析 2 ms；
- 脚本执行后出现的推荐列表：浏览器启动 400 ms，等待 800 ms，失败重试最多 2 次；
- Network 中的推荐 JSON：额外请求 1 次，解析 3 ms。

若目标是标题与价格，静态路径总成本约为 7 ms，不需要浏览器。若必须获得推荐，API 路径约 3 ms 加一次请求；浏览器路径最坏约 400 + 800×3 = 2800 ms，而且还要占用进程。这个数字不是绝对基准，但足以说明决策顺序。

再计算稳定性：静态字段只要响应格式不变就能复现；浏览器字段还依赖脚本加载、网络空闲条件与动画时序。每增加一个不确定性，就需要一个明确的等待条件和一个失败分类。若两次运行在同一夹具上得到不同条目数，先检查渲染和滚动，而不是把差异归咎于“网站不稳定”。
`,
  diagram: '<Diagram type="crawl-render-timeline" name="ssr" />',
  diagramNote:
    '图把服务器响应、HTML 解析、脚本执行和最终 DOM 放在同一条时间线上；越靠右的内容越依赖运行时条件，也越难测试。',
  caseStudy:
    '合成书店页面首屏包含书名和价格，推荐区由脚本在 300 ms 后插入。静态请求只能看到前三本书；Network 面板显示推荐来自同源 JSON；页面脚本还会根据窗口宽度隐藏部分文本。团队先选择公开 JSON，若授权不允许 API 批量访问，再改用本地夹具上的浏览器路径。两条路径都保留相同的字段契约，最终输出才能比较。',
  codePractice:
    'Demo 用纯 Python 扫描 HTML 中的结构化数据标记，并按证据选择静态、API 或浏览器策略。站内练习不执行 JavaScript，也不导入 Playwright；真实浏览器实验只在本机项目 3 中运行。',
  mistakes: [
    '看到页面有内容就断言原始 HTML 也有，忽略 View Source 与 Elements 的差别。',
    '发现一个内部接口就无限调用，没有检查授权、请求参数与频率边界。',
    '把浏览器启动成功当成数据正确，缺少字段契约和批次数断言。',
    '把固定 sleep 当作等待策略，导致快机器偶发通过、慢机器稳定失败。',
  ],
  relations:
    '本节承接第 2 章 HTTP 与第 3 章 DOM，决定第 8 章后续是否使用浏览器；第 9 章会用同一字段契约校验不同来源，第 12 章则要求把未授权、登录和验证码场景明确排除。',
  summary:
    '先观察原始响应、当前 DOM 和 Network，再按成本从静态字段、嵌入 JSON、公开接口到本地浏览器逐级选择。浏览器是特定字段的最后手段，不是抓取动态页面的默认答案。',
  references: [
    'MDN DOM 入门：<https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction>',
    'Google JavaScript SEO 基础：<https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics>',
    'Playwright Python 文档：<https://playwright.dev/python/docs/intro>',
  ],
  lab: [
    '对一个本地 HTML 同时记录 View Source 与浏览器 Elements 的差异。',
    '在 Network 中找到一条 JSON 请求，写出请求方法、参数和响应字段。',
    '为标题、价格、推荐三个字段分别填写最低成本来源。',
    '说明一次“不应使用浏览器”的判断，并给出证据。',
  ],
  selfExplanations: [
    '**自我解释一**：为什么 Elements 里看到节点，不能证明 curl 得到的原始响应也包含它？',
    '**自我解释二**：在什么证据下，浏览器自动化才比 API 或静态解析更合理？',
  ],
  predictionPrompt:
    '一个页面原始 HTML 只有加载动画，Network 中却有商品 JSON。你预测首选采集路径是什么？先写下理由再看 Demo。',
  tips: [
    {
      kind: 'note',
      text: '先记录证据再选工具：原始 HTML、Elements、Network 三者的差异就是决策依据。',
    },
    {
      kind: 'performance',
      text: '浏览器渲染通常是成本最高的一层；能静态读到的字段不要为了统一而全部交给浏览器。',
    },
    {
      kind: 'leak',
      text: '动态页面不改变授权边界；登录、验证码、付费墙和限流绕过都不属于技术练习范围。',
    },
  ],
  demo: {
    title: '按证据选择渲染策略',
    lang: 'python',
    code: `def choose_strategy(html, api_available=False, interactive_only=False):
    if interactive_only:
        return "browser"
    if api_available:
        return "api"
    markers = ('data-app-state="ready"', '__NEXT_DATA__', 'application/ld+json')
    if any(marker in html for marker in markers):
        return "static"
    return "inspect"

sample = '<main data-app-state="ready"><h1>合成书目</h1></main>'
print(choose_strategy(sample))
print(choose_strategy(sample, api_available=True))
print(choose_strategy(sample, interactive_only=True))`,
  },
});

const playwrightLesson = makeLesson({
  id: lesson2,
  title: 'Playwright：等待条件、懒加载与无限滚动',
  difficulty: 3,
  goals: [
    '理解 locator、auto-waiting、expect 与 timeout 各自解决什么问题。',
    '用可见内容或 DOM 标记等待，而不是用固定 sleep 猜测页面完成。',
    '为懒加载和有限无限滚动设置停止条件、最大轮数与重复内容检测。',
    '隔离浏览器上下文、限制资源并保留可诊断的超时证据。',
  ],
  prerequisites: [
    '能读懂 HTML 属性、CSS 选择器与 DOM 变化。',
    '理解异步请求、网络延迟和超时的区别。',
    '已完成项目 2，知道状态、检查点和有限重试的重要性。',
  ],
  problem:
    '动态页面不会在 load 事件时立刻拥有全部内容。图片可能懒加载，列表可能每滚动一次追加一批，推荐区可能在数秒后才出现。用固定 sleep 一秒，开发机上可能碰巧成功，慢机器上却读不到第三条。更糟的是，无限滚动没有天然终点，脚本可能一直滚到内存耗尽。稳定自动化的核心是等待“某个可观察条件成立”，同时给等待和滚动都设置明确上限。',
  intuition:
    '等公交车时，你不会闭眼数到六十就认为车到了；你会观察站牌上的到站信息，直到条件成立或超过最晚等待时间。locator 描述“我要找哪辆车”，auto-waiting 不断检查它是否可操作，expect 则表达“直到这条断言成立”。固定 sleep 只是闭眼倒数，无法说明页面究竟准备好了没有。',
  concepts: `
### 1. locator 是查询，不是元素快照

locator 描述如何找到元素，例如按角色、标签、文本或稳定 data 属性。页面重绘后，locator 仍可在下一次操作时重新定位。优先选择语义稳定、与业务相关的属性；不要把深层 CSS 路径、随机 class 或页面位置当作长期契约。

### 2. auto-waiting 与 expect

Playwright 的操作会在超时前等待元素出现、可见、可接收事件且稳定；expect 用于等待断言成立。等待条件应描述业务状态，例如第三条记录的 data-batch 出现，而不是“页面完全没有网络请求”。网络空闲并不等于界面完成，轮询请求或长连接会让它永远不空闲。

### 3. 超时是诊断信息

超时不是“再加一秒”的信号。失败时应保存 URL、等待的选择器、当前条目数、最后一批标记、页面截图或 DOM 摘要。区分资源未加载、应用报错、选择器错误、滚动未触发与数据本身为空。只打印 timeout 字符串，无法定位是哪一层没满足。

### 4. 懒加载

图片与长列表常在接近视口时才加载。滚动到目标附近，然后等待对应条目出现或属性变化；不要滚动到底后立即抽取。若页面使用 IntersectionObserver，容器滚动与窗口滚动可能不同，必须观察真实滚动容器。

### 5. 有限无限滚动

典型停止条件：

1. 达到预期条目数；
2. 连续两轮条目数不变；
3. 出现明确的 “end” 标记；
4. 达到最大滚动轮数；
5. 出现错误或登录提示。

多个条件要保留优先级和最终原因。最大轮数是安全阀，不是正常完成条件；用预算停止时，报告必须说明“未证明到底”，不能伪装成完整采集。

### 6. 浏览器生命周期

每个任务使用独立 context，避免 Cookie、缓存与本地存储互相污染；任务结束关闭 page、context 和 browser。拦截不需要的图片、字体或媒体可减少开销，但不要拦截会影响应用逻辑的关键脚本。并发数要结合本机资源与目标站点限速，浏览器不是绕过限速的工具。

### 7. 本地 Playwright 示例

以下代码仅用于本机合成夹具，不进入站内执行或判分：

\`\`\`python
from playwright.sync_api import sync_playwright, expect

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()
    page.goto("http://127.0.0.1:18080/", wait_until="domcontentloaded")
    expect(page.locator('[data-app-state="ready"]')).to_be_visible(timeout=5000)
    expect(page.locator('article[data-batch="3"]').last).to_be_visible(timeout=5000)
    rows = page.locator("article[data-item-id]").evaluate_all(
        "nodes => nodes.map(n => ({id: n.dataset.itemId, text: n.innerText}))"
    )
    context.close()
    browser.close()
\`\`\`

这段示例没有 sleep。它先等待应用标记，再等待第三批出现，最后一次性读取条目。失败时超时会指向未满足的 locator；若要诊断，可额外记录已出现批次和当前 URL。
`,
  derivation: `
设页面初始 3 条，每次滚动增加 3 条，共 3 批：

- 第一次滚动后 6 条；
- 第二次滚动后 9 条；
- 第三批标记出现，达到预期 9 条；
- 额外滚动一次，条目仍 9 条，连续稳定轮数 1；
- 再滚动，仍 9 条，稳定轮数 2，触发稳定停止。

若最大轮数设为 5，则在第 3 批后不需要耗尽 5 轮。轮数预算是上限，不是必须达到的次数。假设页面每次滚动只增加 1 条且预期 100 条，每轮等待 500 ms，最坏时间约 100×0.5=50 秒；此时应评估降低批次数、增加条件等待或分批保存，而不是无限延长超时。

稳定性可用“连续相同计数”判定，但空页面连续为 0 时不能直接视为成功。应先确认应用 ready 且至少出现一条记录，或明确允许空结果。停止原因必须写入报告，例如 reached_expected、stable_count、end_marker 或 max_rounds。
`,
  diagram: '<Diagram type="crawl-render-timeline" name="playwright" />',
  diagramNote:
    '图从打开页面到应用 ready、批次出现、滚动和停止条件依次展开；每个箭头都应能对应一个 locator、断言或报告字段。',
  caseStudy:
    '本地动态夹具立即返回空壳，300 ms 后插入第一批，随后每次滚动追加一批，共三批。脚本等待 data-app-state=ready，再等待第三批标记；若只滚两次就读取，会少最后 3 条。另一个故障是滚动容器选择错误，窗口在滚动但列表容器未滚，计数始终不变。团队用批次标记、条目数和停止原因三个证据区分“真的到底”和“滚错了元素”。',
  codePractice:
    '站内 Demo 用纯 Python 模拟滚动计数与停止决策；Playwright 代码只在上面的本地说明中运行。项目 3 提供固定 300 ms 延迟、三批 DOM 标记与浏览器冒烟测试，学习者可选安装 Playwright。',
  mistakes: [
    '把 time.sleep 当成同步原语，页面未 ready 时读取空列表。',
    '等待 networkidle，却被轮询请求或长连接永久阻塞。',
    '只滚窗口，没有识别真正的列表滚动容器。',
    '没有最大轮数和连续稳定检测，无限滚动耗尽资源。',
    '用随机 class 或绝对 XPath 定位，页面小改版后全部失效。',
  ],
  relations:
    '本节把第 2 章超时、第 5 章去重和第 7 章状态机带入浏览器环境；项目 3 将用批次标记和停止原因实现本地可复现的动态采集，第 11 章会把同样的资源上限扩展到多 worker。',
  summary:
    'Playwright 的价值是可观察条件和自动等待，不是自动解决所有动态问题。locator 表达目标，expect 表达条件，超时提供诊断，最大轮数与稳定检测保证滚动有终点。',
  references: [
    'Playwright locators：<https://playwright.dev/python/docs/locators>',
    'Playwright actionability：<https://playwright.dev/python/docs/actionability>',
    'Playwright Python API：<https://playwright.dev/python/docs/api/class-playwright>',
  ],
  lab: [
    '把一条固定 sleep 改成等待元素可见或属性成立的断言。',
    '为三批动态列表写出至少三个停止条件和优先级。',
    '构造“窗口滚动但容器未滚”的故障，记录可观察差异。',
    '为一次超时列出 URL、locator、条目数、批次与截图五类证据。',
  ],
  selfExplanations: [
    '**自我解释一**：为什么 networkidle 不能可靠代表“数据已渲染完成”？',
    '**自我解释二**：最大轮数与连续稳定条件分别防止什么错误，为什么不能互相替代？',
  ],
  predictionPrompt:
    '页面每次滚动增加 3 条，共 9 条；你在第 3 批后继续滚一次，计数仍为 9。你预测报告应写 reached_expected 还是 stable_count？先根据条件优先级回答。',
  tips: [
    {
      kind: 'pitfall',
      text: '固定 sleep 无法知道页面是否完成；等待业务标记或可见条目，才能区分慢和失败。',
    },
    {
      kind: 'performance',
      text: '限制浏览器并发、拦截非必要资源并使用独立 context；不要让渲染层成为绕过限速的手段。',
    },
    {
      kind: 'note',
      text: '停止原因要进入报告；max_rounds 结束通常表示未证明完整，不能写成成功到底。',
    },
  ],
  demo: {
    title: '有限滚动的停止决策',
    lang: 'python',
    code: `def scroll_decision(counts, expected, max_rounds):
    if not counts:
        return "start"
    current = counts[-1]
    if current >= expected:
        return "reached_expected"
    stable = len(counts) >= 3 and counts[-1] == counts[-2] == counts[-3]
    if stable and current > 0:
        return "stable_count"
    if len(counts) - 1 >= max_rounds:
        return "max_rounds"
    return "continue"

for counts in ([3], [3, 6], [3, 6, 9], [3, 6, 9, 9, 9]):
    print(counts, scroll_decision(counts, expected=9, max_rounds=5))`,
  },
});

const projectLesson = makeLesson({
  id: lesson3,
  title: '项目 3：动态页面采集器',
  difficulty: 4,
  goals: [
    '在本地确定性动态页面上验证应用 ready、三批数据与 DOM 标记。',
    '以条件等待和有限滚动采集 9 条记录，输出批次、等待与停止原因证据。',
    '区分数据未出现、容器滚错、脚本错误与超时预算不足。',
    '交付 Playwright 本地参考实现、标准库夹具测试、浏览器冒烟测试与 README。',
  ],
  prerequisites: [
    '完成本章前两节，能区分 SSR、CSR 与浏览器执行后的 DOM。',
    '会使用 locator、expect 和超时，不使用固定 sleep。',
    '能从项目 2 迁移状态、报告和离线验收思路。',
  ],
  problem:
    '项目 3 的页面初始只有应用壳，300 ms 后出现第一批 3 条，随后两次滚动各追加 3 条。若脚本在 domcontentloaded 后立刻读取，会得到 0 条；若只执行两次滚动，会得到 6 条；若滚动窗口而不是列表容器，计数可能永远不变；若没有超时，第三批缺失时测试会挂起。项目必须用可观察标记和有限循环证明“确实采到第三批”，并在失败时给出诊断。',
  intuition:
    '把动态页面当成一次有明确里程碑的装配：应用 ready 是第一盏灯，batch 1、2、3 是后三盏灯。脚本不是“等几秒后猜全部亮完”，而是逐盏验证；滚动是推动装配的动作，最大轮数是防止机器一直空转的保险丝。',
  concepts: `
### 1. 夹具与离线边界

项目位于 \`public/labs/web-crawling/project-03-dynamic/\`，包含 page.html、app.js、fixture_server.py、starter.py、solution.py 与 tests。页面只使用本地 HTML、CSS 与 JavaScript，不加载外部字体、图片、API 或分析脚本。标准库测试检查 HTTP 与静态外壳；浏览器冒烟测试使用仓库现有 playwright-core，不访问互联网。

### 2. DOM 契约

外壳包含 \`main[data-app-state]\`。应用尚未完成时状态为 loading，第一批插入后变为 ready。每条记录是带 data-item-id 与 data-batch 的 article；每批完成后存在 data-batch 标记。记录身份以 data-item-id 为准，文本只作为字段值，不用序号当唯一键。

### 3. 参考流程

1. 打开本地 URL，等待 DOMContentLoaded；
2. 等待 main 的 data-app-state=ready；
3. 等待 batch=1 至少一条记录；
4. 滚动真实列表容器，等待 batch=2 和 batch=3；
5. 达到 9 条后停止，再滚动一次确认没有新增；
6. 读取 id、title、batch，去重并按 id 排序；
7. 返回记录或抛出带诊断的超时错误。

流程中的每一步都能在测试里断言。不要用整页截图替代数据契约，也不要把“浏览器没有崩溃”当作成功。

### 4. 三批与计数

批 1 有 3 条，批 2 有 3 条，批 3 有 3 条，总 9 条。允许报告 records_seen=9、unique=9、batches=[1,2,3]、scrolls=2、stop_reason=reached_expected。若第三次滚动后仍 9 条，可记录 stable_round=1，但不改变完成原因。

### 5. 失败分类

- app_ready_timeout：应用脚本未执行或标记写错；
- first_batch_timeout：数据未插入或选择器错误；
- scroll_timeout：滚动容器错误或懒加载未触发；
- incomplete_batches：只看到 1 或 2 批；
- duplicate_ids：页面重复插入，需去重并报告；
- browser_unavailable：可选依赖未安装，测试应跳过而不是伪装通过。

### 6. 标准库与可选依赖

fixture_server.py 与 test_fixture.py 只用 Python 标准库。solution.py 需要 Playwright Python，因此不在课程站内判分；安装说明单独列出。smoke_fixture.mjs 使用仓库已有的 playwright-core 启动 Chromium，若浏览器二进制缺失则明确失败并提示安装，不偷偷访问远程页面。

### 7. 验收证据

至少保留：本地服务器启动日志、HTTP 200 与 DOM 外壳、三批标记出现时间、最终 9 条记录、排序后的 ID 列表、两次滚动与停止原因。超时测试应人为禁用 app.js 或移除 batch 3 标记，证明错误信息指向具体阶段。项目不包含登录、验证码、付费墙或第三方站点。

### 8. 失败恢复与可观测性

动态项目不应只在终端打印一行结果。每次运行至少记录开始 URL、浏览器模式、应用 ready 耗时、每批出现耗时、滚动次数、最后计数、停止原因和最终 ID 摘要。若第三批超时，后续运行可以用同一夹具复现，不依赖当时网络。对可重复的页面结构变化，保存最小 DOM 片段而不是整份用户页面；对真实验证，只保留授权允许的诊断信息。

还要把“数据为空”和“等待失败”分开。应用正常 ready 但标签显示暂无记录，应返回空结果并说明来源；应用 ready 标记都没出现，则不是空数据，而是执行失败。二者若共用空列表返回值，报告会把脚本崩溃伪装成合法零结果。实现中应使用不同异常或状态码，并让测试分别覆盖。

浏览器清理同样属于可观测性。page、context、browser 的关闭失败可能掩盖原始错误，因此清理过程应记录但不要吞掉主异常。对批量任务，限制同时打开的 context 数并设置总运行预算；达到预算时停止启动新任务、保存已完成批次，并把未完成项留给下一次恢复。这样项目 3 的经验才能自然过渡到项目 4 的多 worker 调度。
`,
  derivation: `
设每次等待上限 5000 ms，页面 ready 在 300 ms，第一批随 ready 出现，第二次与第三次滚动各在 200 ms 内出现。正常总时间约 300 + 200 + 200 = 700 ms，加上浏览器启动开销。记录数序列为 0 → 3 → 6 → 9。

若脚本等待 1000 ms 固定时间后只滚一次，可能只得到 6 条；若浏览器启动占 1500 ms，固定等待结束得太早。条件等待把“页面是否完成”从机器速度中解耦，只要在预算内出现就成功。

假设 batch 3 永远不出现，最多执行 3 次滚动，每次等待 1 秒，则失败至少需要约 3 秒并保存 counts=[3,6,6]。若没有上限，循环不会结束。稳定两轮可作为“页面表示到底”的证据，但对本项目已知 9 条，reached_expected 更直接。报告应优先记录明确预期，再记录稳定检测，避免把未证明的结束说成完整。
`,
  diagram: '<Diagram type="crawl-render-timeline" name="csr" />',
  diagramNote:
    '图展示空壳、脚本执行、三批插入与滚动触发的先后关系；采集器必须在每个标记出现后推进，而不是在页面打开时一次性读取。',
  caseStudy:
    '学习者先运行 fixture_server，再用标准库测试确认 / 返回 200 和 data-app-state。安装 Playwright 后运行 solution，报告应得到 D001 到 D009 共 9 条、批次 1/2/3、scrolls=2。为验证故障诊断，临时把滚动目标从列表容器改成 window，测试应在 5 秒内以 scroll_timeout 结束，并打印当前计数与目标选择器，而不是无限循环。',
  codePractice:
    '站内练习只实现批次合并、计数与报告纯函数。Playwright 采集在本地项目运行；执行前明确标记 local-only，且不得把真实站点、登录态或第三方接口写入夹具。',
  mistakes: [
    '打开页面立即读取，未等待 app ready 与第一批标记。',
    '滚动 window 而不是列表容器，导致计数始终不变。',
    '把 9 条写成固定常量而不对照 DOM 批次，页面少一批仍报成功。',
    '超时后只打印 “timeout”，没有当前批次、条目数和选择器。',
    '把 Playwright 可选依赖缺失误报成数据失败，或让站内代码尝试联网。',
  ],
  relations:
    '项目 3 将第 7 章的可恢复状态与本章的条件等待结合，是第 9 章字段契约、第 10 章版本比较与第 12 章毕业项目的动态渲染分支。它也为第 11 章资源上限与监控提供浏览器侧指标。',
  summary:
    '动态采集的可靠性来自明确 DOM 契约、逐批条件等待、有限滚动和可诊断超时。浏览器只是执行层，真正可验收的是记录身份、批次证据、停止原因与离线复现。',
  references: [
    'Playwright 测试与断言：<https://playwright.dev/python/docs/test-assertions>',
    'Playwright 浏览器上下文：<https://playwright.dev/python/docs/browser-contexts>',
    'MDN Intersection Observer：<https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API>',
  ],
  lab: [
    '启动本地夹具并记录外壳与三批 DOM 标记。',
    '实现批次合并去重，确保 D001 到 D009 排序稳定。',
    '在 solution 中等待 batch=3，并记录两次滚动的等待结果。',
    '移除 batch 3 标记，确认 5 秒内以聚焦错误失败。',
    '运行标准库夹具测试与 playwright-core 冒烟测试，保存通过证据。',
  ],
  selfExplanations: [
    '**自我解释一**：为什么项目验收必须同时检查 9 条记录和 data-batch 标记，而不能只看条目数？',
    '**自我解释二**：scroll_timeout 与 incomplete_batches 分别指向哪类根因，修复动作有何不同？',
  ],
  predictionPrompt:
    '若滚动容器选错但页面仍能正常显示，你预测条目数序列和最终错误会是什么？先写预测再运行故障实验。',
  tips: [
    {
      kind: 'pitfall',
      text: '等待第三批标记，而不是等待“大概两秒”；时间不是业务状态。',
    },
    {
      kind: 'performance',
      text: '达到明确预期立即停止，额外滚动只用于稳定性确认；不要滚到最大轮数才结束。',
    },
    {
      kind: 'leak',
      text: '项目只访问回环地址与合成页面；不得把真实登录态、Cookie 或受限页面加入夹具。',
    },
  ],
  demo: {
    title: '合并三批记录并生成报告',
    lang: 'python',
    code: `def merge_batches(batches):
    by_id = {}
    for batch in batches:
        for row in batch:
            item_id = row.get("id")
            if not item_id:
                continue
            by_id[item_id] = dict(row)
    return [by_id[key] for key in sorted(by_id)]

rows = merge_batches([
    [{"id":"D001","title":"一","batch":1},{"id":"D002","title":"二","batch":1}],
    [{"id":"D003","title":"三","batch":2}],
    [{"id":"D003","title":"三-更新","batch":3},{"id":"D004","title":"四","batch":3}],
])
print(rows)
print({"records_seen": 5, "unique": len(rows), "batches": [1, 2, 3]})`,
  },
});

const renderExercises = makeExercises(chapterId, lesson1, 2, [
  {
    type: 'single',
    question: 'curl 得到的 HTML 只有加载动画，但浏览器 Elements 中有商品标题。最可能的原因是？',
    options: [
      ['A', 'HTML 不能表达标题'],
      ['B', '标题由脚本执行后写入 DOM'],
      ['C', 'curl 不会发送 User-Agent'],
      ['D', '浏览器自动改写服务器文件'],
    ],
    answer: 'B',
    explanation: 'Elements 展示当前 DOM；脚本可在原始响应之后插入或修改节点。',
    tags: ['SSR 与 CSR'],
  },
  {
    type: 'multiple',
    question: '判断字段来自哪一层时，应交叉观察哪些证据？',
    options: [
      ['A', '原始响应或 View Source'],
      ['B', 'Elements 中的当前 DOM'],
      ['C', 'Network 中的请求与响应'],
      ['D', '仅看页面截图颜色'],
    ],
    answer: ['A', 'B', 'C'],
    explanation: '原始响应、DOM 与网络记录互相补充；截图不能证明数据来自哪一层。',
    tags: ['证据链'],
  },
  {
    type: 'judge',
    question: '只要页面在浏览器中可见，原始 HTML 就一定包含完整数据。',
    answer: false,
    explanation: '客户端脚本、hydrate 或交互都可能改变 DOM，原始响应未必包含最终内容。',
    tags: ['渲染模型'],
  },
  {
    type: 'fill',
    question:
      '按成本从低到高，常见路径是原始 HTML → 嵌入 ___ → 公开 ___ → 本地浏览器自动化。',
    blanks: [['JSON', 'hydration JSON', '结构化数据'], ['JSON 接口', 'API', '数据接口']],
    explanation: '先尝试更便宜且可验证的数据层，只有字段确实依赖运行时再使用浏览器。',
    tags: ['策略顺序'],
  },
  {
    type: 'single',
    question: '以下哪种情况最适合直接停止，而不是增加浏览器自动化？',
    options: [
      ['A', '需要登录且页面有验证码挑战'],
      ['B', '页面有 300 ms 动画'],
      ['C', '列表需要滚动加载'],
      ['D', '价格在 hydration JSON 中'],
    ],
    answer: 'A',
    explanation: '登录、验证码和访问控制不能靠自动化绕过；应回到授权与合规路径。',
    tags: ['安全边界'],
  },
  {
    type: 'open',
    question:
      '一个页面有 SSR 标题、hydration JSON 价格和脚本生成的推荐。请写出三个字段的最低成本来源，并说明浏览器何时才值得使用。',
    referenceAnswer:
      '标题优先读取原始 HTML；价格优先解析 hydration JSON，并校验 schema；推荐先检查 Network 是否有同源公开 JSON。只有字段确实只在浏览器执行后出现，且目标在授权范围内，才使用浏览器；需有 DOM 标记、条件等待与超时证据。',
    rubric: [
      { point: '三个字段分别选源', score: 2 },
      { point: '说明成本与稳定性', score: 2 },
      { point: '说明授权与安全边界', score: 2 },
      { point: '给出必要证据', score: 2 },
    ],
    explanation: '策略选择应能解释为什么不用更便宜的方法，而不是只报工具名。',
    tags: ['渲染决策', '开放题'],
    keywords: ['原始 HTML', 'hydration', 'Network', '授权'],
  },
  {
    type: 'code',
    question:
      '实现 `choose_strategy(html, api_available=False, interactive_only=False)`：交互专属返回 browser；有 API 返回 api；HTML 含 `data-app-state` 或 `__NEXT_DATA__` 返回 static；否则 inspect。',
    starterCode: `def choose_strategy(html, api_available=False, interactive_only=False):
    pass
`,
    expectedOutput: '策略字符串',
    tests: `assert choose_strategy("<main data-app-state='ready'>")=="static"
assert choose_strategy("x",api_available=True)=="api"
assert choose_strategy("x",interactive_only=True)=="browser"
assert choose_strategy("<html></html>")=="inspect"
`,
    answer: `def choose_strategy(html, api_available=False, interactive_only=False):
    if interactive_only:
        return "browser"
    if api_available:
        return "api"
    if "data-app-state" in html or "__NEXT_DATA__" in html:
        return "static"
    return "inspect"
`,
    explanation: '显式优先级让“为什么选择某层”可测试；交互专属是浏览器最强理由。',
    tags: ['策略函数'],
  },
  {
    type: 'code',
    question:
      '实现 `extract_script_json(html, script_id)`：用标准库 HTMLParser 找到指定 id 的 script，返回其文本；不存在返回 None。测试只含简单静态 HTML。',
    starterCode: `def extract_script_json(html, script_id):
    pass
`,
    expectedOutput: '脚本文本或 None',
    tests: `h='<script id="data" type="application/json">{"a": 1}</script>'
assert extract_script_json(h,"data")=='{"a": 1}'
assert extract_script_json(h,"missing") is None
`,
    answer: `from html.parser import HTMLParser

def extract_script_json(html, script_id):
    class Parser(HTMLParser):
        def __init__(self):
            super().__init__(convert_charrefs=True)
            self.found = False
            self.parts = []
        def handle_starttag(self, tag, attrs):
            values = dict(attrs)
            if tag == "script" and values.get("id") == script_id:
                self.found = True
        def handle_data(self, data):
            if self.found:
                self.parts.append(data)
        def handle_endtag(self, tag):
            if tag == "script" and self.found:
                self.found = False
    parser = Parser()
    parser.feed(html)
    return "".join(parser.parts) or None
`,
    explanation: '嵌入 JSON 可以直接静态读取，但仍需后续 schema 校验和升级回归。',
    tags: ['嵌入 JSON'],
  },
]);

const playwrightExercises = makeExercises(chapterId, lesson2, 3, [
  {
    type: 'single',
    question: 'Playwright 中 locator 的主要作用是？',
    options: [
      ['A', '保存元素当前快照，永不重新查询'],
      ['B', '描述如何找到元素，操作时重新定位'],
      ['C', '替代 HTTP 状态码'],
      ['D', '自动判断数据是否合法'],
    ],
    answer: 'B',
    explanation: 'locator 是查询描述；页面重绘后仍可重新定位，不应依赖失效的元素引用。',
    tags: ['locator'],
  },
  {
    type: 'multiple',
    question: '可靠的动态页面等待条件包括？',
    options: [
      ['A', '应用 ready 标记出现'],
      ['B', '第三批条目可见'],
      ['C', '固定 sleep 两秒'],
      ['D', '业务断言成立'],
    ],
    answer: ['A', 'B', 'D'],
    explanation: '等待应绑定可观察业务状态；固定 sleep 无法证明页面完成。',
    tags: ['条件等待'],
  },
  {
    type: 'judge',
    question: 'networkidle 出现就说明所有动态内容一定已经渲染完成。',
    answer: false,
    explanation: '轮询、长连接与客户端渲染都可能让网络空闲与界面完成不同步。',
    tags: ['等待陷阱'],
  },
  {
    type: 'fill',
    question:
      '无限滚动的两个安全阀是最大 ___ 和连续 ___ 的条目计数；报告还应保存停止 ___。',
    blanks: [['滚动轮数', '轮数', '次数'], ['相同', '稳定', '不变'], ['原因', '理由', '条件']],
    explanation: '上限防止无限循环，稳定计数识别到底，停止原因让报告可解释。',
    tags: ['滚动终止'],
  },
  {
    type: 'single',
    question: '等待超时后最有助于定位的附加证据是？',
    options: [
      ['A', '只打印 timeout'],
      ['B', 'URL、locator、当前条目数、批次和截图或 DOM 摘要'],
      ['C', '把超时改成一小时'],
      ['D', '删除所有断言'],
    ],
    answer: 'B',
    explanation: '阶段化证据能区分选择器、滚动、资源与应用错误；单纯延长等待只会放大故障。',
    tags: ['超时诊断'],
  },
  {
    type: 'multiple',
    question: '浏览器任务结束时应清理哪些资源？',
    options: [
      ['A', 'page'],
      ['B', 'context'],
      ['C', 'browser'],
      ['D', '用户真实 Cookie 备份到项目仓库'],
    ],
    answer: ['A', 'B', 'C'],
    explanation: '逐层关闭可释放进程与内存；真实 Cookie 不应写入仓库。',
    tags: ['资源隔离'],
  },
  {
    type: 'open',
    question:
      '页面每次滚动增加 3 条，最终 9 条。请写出等待、滚动与停止策略，并说明如何证明不是 6 条或无限循环。',
    referenceAnswer:
      '先等待 app ready 和第一批，再滚动真实列表容器，等待 batch=2、batch=3；记录计数 3→6→9。达到 9 条后立即停止，可再滚一次确认稳定。设置最大轮数和单批超时；失败报告当前批次、计数和选择器。批次标记与最终 ID 集合共同证明三批完整。',
    rubric: [
      { point: '等待两个明确阶段', score: 2 },
      { point: '滚动真实容器', score: 2 },
      { point: '设置双重终止条件', score: 2 },
      { point: '提供批次与 ID 证据', score: 2 },
    ],
    explanation: '完整策略必须同时覆盖推进、终止和证据。',
    tags: ['滚动策略', '开放题'],
    keywords: ['ready', 'batch', '最大轮数', '稳定'],
  },
  {
    type: 'judge',
    question: '最大轮数触发通常应当报告为“完整到底”，因为它已经安全停止了。',
    answer: false,
    explanation: '达到上限只说明预算耗尽，未证明页面到底；报告应说明不完整或待复核。',
    tags: ['终止语义'],
  },
  {
    type: 'code',
    question:
      '实现 `scroll_decision(counts, expected, max_rounds)`：空计数返回 start；达到 expected 返回 reached_expected；连续三次相同且大于 0 返回 stable_count；轮数达到上限返回 max_rounds；否则 continue。',
    starterCode: `def scroll_decision(counts, expected, max_rounds):
    pass
`,
    expectedOutput: '停止决策字符串',
    tests: `assert scroll_decision([],9,5)=="start"
assert scroll_decision([3,6,9],9,5)=="reached_expected"
assert scroll_decision([3,6,6,6],9,9)=="stable_count"
assert scroll_decision([3,6,7,8,9,10],99,5)=="max_rounds"
assert scroll_decision([3],9,5)=="continue"
`,
    answer: `def scroll_decision(counts, expected, max_rounds):
    if not counts:
        return "start"
    if counts[-1] >= expected:
        return "reached_expected"
    if len(counts) >= 3 and counts[-1] == counts[-2] == counts[-3] and counts[-1] > 0:
        return "stable_count"
    if len(counts) - 1 >= max_rounds:
        return "max_rounds"
    return "continue"
`,
    explanation: '决策函数把业务预期放在稳定检测之前，并把预算耗尽保留为显式原因。',
    tags: ['滚动决策'],
  },
  {
    type: 'code',
    question:
      '实现 `stable_tail(counts, window=3)`：仅当最后 window 个非负整数全部相同且大于 0 时返回 True；长度不足返回 False。',
    starterCode: `def stable_tail(counts, window=3):
    pass
`,
    expectedOutput: '布尔值',
    tests: `assert stable_tail([3,6,6,6]) is True
assert stable_tail([0,0,0]) is False
assert stable_tail([3,6,6]) is False
assert stable_tail([3,3,3],window=3) is True
`,
    answer: `def stable_tail(counts, window=3):
    if window < 1 or len(counts) < window:
        return False
    tail = counts[-window:]
    return tail[0] > 0 and all(value == tail[0] for value in tail)
`,
    explanation: '空结果连续为 0 不是“稳定完成”；先要求正计数可避免把加载失败当成到底。',
    tags: ['稳定检测'],
  },
]);

const projectExercises = makeExercises(chapterId, lesson3, 4, [
  {
    type: 'single',
    question: '项目 3 的夹具中，`main[data-app-state="ready"]` 表示？',
    options: [
      ['A', '应用已完成第一阶段的确定性标记'],
      ['B', '所有页面都允许无限采集'],
      ['C', 'HTTP 返回 304'],
      ['D', '可以直接跳过所有断言'],
    ],
    answer: 'A',
    explanation: 'ready 是本地应用写入的可观察状态，用于条件等待，不代替后续批次断言。',
    tags: ['DOM 契约'],
  },
  {
    type: 'multiple',
    question: '项目 3 的正常验收证据应包括？',
    options: [
      ['A', 'D001–D009 的排序记录'],
      ['B', 'batch 1、2、3 标记'],
      ['C', '滚动次数与停止原因'],
      ['D', '真实登录 Cookie'],
    ],
    answer: ['A', 'B', 'C'],
    explanation: '记录、批次与停止原因是动态采集证据；真实 Cookie 不属于夹具。',
    tags: ['项目验收'],
  },
  {
    type: 'fill',
    question:
      '项目正常采到 ___ 条记录，三次批次各 3 条；达到明确预期后停止原因应记为 ___。',
    blanks: [['9'], ['reached_expected', '达到预期', 'reached expected']],
    explanation: '三批共 9 条；已知预期时优先用 reached_expected，而不是耗尽最大轮数。',
    tags: ['批次计数'],
  },
  {
    type: 'judge',
    question: '只要 Playwright 没有抛异常，即使只看到 6 条也可以判定项目 3 完成。',
    answer: false,
    explanation: '完成需要批次与记录证据；无异常可能意味着滚动不足或提前停止。',
    tags: ['完成判定'],
  },
  {
    type: 'single',
    question: '计数序列 `[3, 6, 6, 6]` 最可能对应哪种结束原因？',
    options: [
      ['A', 'reached_expected 9'],
      ['B', 'stable_count'],
      ['C', 'HTTP 404'],
      ['D', 'batch 1 未出现'],
    ],
    answer: 'B',
    explanation: '连续三个正计数相同，表示滚动已不再产生新条目；但需确认是否真的到底。',
    tags: ['停止原因'],
  },
  {
    type: 'open',
    question:
      '第三批一直不出现时，项目应在 5 秒内怎样失败？请写出至少四类诊断字段和两个可能根因。',
    referenceAnswer:
      '等待 batch=3 超时后抛出聚焦错误，记录 URL、目标 locator、当前条目数、已出现批次、滚动次数、截图或 DOM 摘要。根因可能是滚错容器、batch 3 标记被移除、数据脚本错误或选择器错误。不能无限循环，也不能把 max_rounds 当成功。',
    rubric: [
      { point: '有限时间失败', score: 2 },
      { point: '四类诊断字段', score: 2 },
      { point: '两个根因', score: 2 },
      { point: '不伪装成功', score: 2 },
    ],
    explanation: '动态项目的失败也应可操作，而不是只有一个超时字符串。',
    tags: ['超时诊断', '开放题'],
    keywords: ['batch=3', 'locator', '条目数', '滚动容器'],
  },
  {
    type: 'multiple',
    question: '哪些行为会破坏项目的离线与安全边界？',
    options: [
      ['A', '把真实网站登录态写入夹具'],
      ['B', '在站内代码里导入 Playwright 并联网'],
      ['C', '使用本地回环服务器和合成页面'],
      ['D', '把验证码绕过逻辑加入 solution'],
    ],
    answer: ['A', 'B', 'D'],
    explanation: '真实凭据、站内联网和绕过访问控制都越界；本地合成夹具才是课程范围。',
    tags: ['安全边界'],
  },
  {
    type: 'judge',
    question: '项目 3 的标准库夹具测试可以检查 HTTP 与外壳，但浏览器批次仍需可选的 Playwright 冒烟验证。',
    answer: true,
    explanation: '标准库负责服务器与静态外壳，浏览器冒烟测试负责实际 DOM 批次，两者互补。',
    tags: ['测试分层'],
  },
  {
    type: 'code',
    question:
      '实现 `merge_batches(batches)`：合并多个记录列表，以 id 为唯一键，后出现的记录覆盖前者；跳过缺失或空 id 的行；按 id 排序返回新字典列表。',
    starterCode: `def merge_batches(batches):
    pass
`,
    expectedOutput: '按 id 排序的合并记录',
    tests: `a=[{"id":"D2","x":1},{"id":"D1","x":2}]
b=[{"id":"D2","x":3},{"x":4},{"id":"D3","x":5}]
assert merge_batches([a,b])==[{"id":"D1","x":2},{"id":"D2","x":3},{"id":"D3","x":5}]
assert merge_batches([])==[]
`,
    answer: `def merge_batches(batches):
    by_id = {}
    for batch in batches:
        for row in batch:
            if not isinstance(row, dict):
                continue
            item_id = row.get("id")
            if not isinstance(item_id, str) or not item_id.strip():
                continue
            by_id[item_id] = dict(row)
    return [by_id[key] for key in sorted(by_id)]
`,
    explanation: '列表插入顺序不是身份；以业务 id 合并并排序，后续输出才可比较。',
    tags: ['批次合并'],
  },
  {
    type: 'code',
    question:
      '实现 `dynamic_report(records, batches, scrolls, stop_reason, expected=9)`：返回包含 records_seen、unique、batches、scrolls、stop_reason、complete 的字典；complete 仅当 unique 等于 expected 且 stop_reason 为 reached_expected。',
    starterCode: `def dynamic_report(records, batches, scrolls, stop_reason, expected=9):
    pass
`,
    expectedOutput: '动态采集报告',
    tests: `r=dynamic_report([{"id":"D1"}], [1,2,3], 2, "reached_expected")
assert r["unique"]==1 and r["complete"] is False, r
r2=dynamic_report([{"id":str(i)} for i in range(9)], [1,2,3], 2, "reached_expected")
assert r2["complete"] is True and r2["batches"]==[1,2,3], r2
`,
    answer: `def dynamic_report(records, batches, scrolls, stop_reason, expected=9):
    unique = len({row.get("id") for row in records if row.get("id")})
    return {
        "records_seen": len(records),
        "unique": unique,
        "batches": list(batches),
        "scrolls": scrolls,
        "stop_reason": stop_reason,
        "complete": unique == expected and stop_reason == "reached_expected",
    }
`,
    explanation: 'complete 同时要求数量与结束证据，避免“碰巧 9 条”掩盖未证明的滚动路径。',
    tags: ['项目报告'],
  },
  {
    type: 'open',
    question:
      '请写项目 3 的 Definition of Done，覆盖标准库夹具、三批 DOM、有限滚动、超时诊断和本地-only 边界。',
    referenceAnswer:
      '本地服务器返回 200 与外壳；app ready 和 batch 1/2/3 标记可观察；采集 D001–D009 共 9 条，排序稳定；滚动 2 次，停止原因 reached_expected；移除 batch 3 时 5 秒内以聚焦错误结束并记录 locator、计数与批次；标准库夹具测试通过，浏览器冒烟测试仅在本地运行，不联网、不存真实凭据。',
    rubric: [
      { point: '夹具与外壳', score: 2 },
      { point: '三批与 9 条证据', score: 2 },
      { point: '终止与超时诊断', score: 2 },
      { point: '离线与凭据边界', score: 2 },
    ],
    explanation: 'DoD 要能对应自动测试或可保存的运行证据。',
    tags: ['DoD', '开放题'],
    keywords: ['D001', 'batch', 'reached_expected', 'local-only'],
  },
  {
    type: 'open',
    question:
      '采集报告显示 records_seen=9、unique=9，但 batches=[1,2] 且 stop_reason=max_rounds。请判断是否完整，并给出下一步。',
    referenceAnswer:
      '不能判定完整。unique=9 与 batch 标记相互矛盾；可能第三批标记缺失却插入了记录，或报告 batches 采集错误。应以 DOM 批次标记和最终 ID 集合复核，检查是否滚错容器或选择器；在证明 batch=3 出现前保持未完成状态。',
    rubric: [
      { point: '拒绝只看数量', score: 2 },
      { point: '指出证据冲突', score: 2 },
      { point: '提出 DOM 复核', score: 2 },
      { point: '保持未知状态', score: 2 },
    ],
    explanation: '数量相同不代表路径完整；批次、停止原因与记录必须互相支持。',
    tags: ['证据审计', '开放题'],
    keywords: ['batches', 'max_rounds', 'DOM', '未完成'],
  },
  {
    type: 'single',
    question: '以下哪项不属于项目 3 的“本地-only”边界？',
    options: [
      ['A', '监听 127.0.0.1 的夹具服务器'],
      ['B', '仓库内的 playwright-core 浏览器冒烟测试'],
      ['C', '把真实第三方站点加入默认测试'],
      ['D', '合成 D001 到 D009 记录'],
    ],
    answer: 'C',
    explanation: '默认测试不得依赖真实第三方站点或网络；本地夹具与合成数据才是验收基础。',
    tags: ['local-only'],
  },
]);

export const webCrawlingChapters08: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: chapterId,
    title: 'JavaScript 渲染页面',
    goal: '判断何时需要浏览器，并用 Playwright 的条件等待和有限滚动稳定采集动态页面。',
    lessons: [renderLesson, playwrightLesson, projectLesson],
    exercises: [...renderExercises, ...playwrightExercises, ...projectExercises],
  },
];
