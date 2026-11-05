import type { Chapter } from '../../../types';
import { makeExercises, makeLesson } from './authoring';

const chapterId = 'web-crawling-c05';
const lesson1 = `${chapterId}-l01`;
const lesson2 = `${chapterId}-l02`;
const lesson3 = `${chapterId}-l03`;

const canonicalLesson = makeLesson({
  id: lesson1,
  title: '链接发现与 URL 规范化',
  difficulty: 2,
  goals: [
    '从 `<a href>`、`<base>` 与当前页面 URL 正确构造候选链接。',
    '区分 fragment、默认端口、空路径、点段与追踪参数中哪些可以安全规范化。',
    '设计允许 scheme/host/path 的范围规则，避免跨域与不必要参数扩散。',
    '用标准库实现可测试的规范化函数，并记录“错误规范化”的风险。',
  ],
  prerequisites: [
    '能解析 URL 的 scheme、host、path、query 与 fragment。',
    '理解相对链接需要基准 URL，且 `<base>` 可能改变基准。',
    '已能按卡片定位链接节点。',
  ],
  problem:
    '同一详情页可能以 `HTTP://Shop.Test:80/a/../b.html#top`、`https://shop.test/b.html` 和带追踪参数的 URL 出现。若不去重，队列会成倍膨胀；若粗暴删除全部 query，又会把真正决定内容的 `?page=2` 或 `?id=103` 合并成同一页。规范化必须删除“确定无语义”的差异，同时保留业务判断。',
  intuition:
    '规范化像给同一个地址写门牌标准格式：大小写、默认端口与片段展示方式可以统一；但门牌上的房间号（有意义的 query）不能随便撕掉。拿不准的 query 默认保留，并让测试或站点规则明确说明哪些参数已知可删。',
  concepts: `
### 1. 合并与规范化顺序

1. 读取有效 \`<base>\`，没有则用响应最终 URL；
2. 用 \`urljoin\` 合并相对 href；
3. 去掉 fragment；
4. 统一 scheme/host 小写；
5. 删除与 scheme 默认值相同的端口；
6. 处理点段与空路径；
7. 仅按站点规则处理查询参数；
8. 校验 scheme、host、path 范围。

顺序会改变结果。例如先按“当前 URL”合并再读 base，会把相对链接解析到错误目录；先删 query 再解析分页，会丢页面。

### 2. 可以规范化与不可擅自规范化

| 差异 | 通常处理 | 注意 |
| --- | --- | --- |
| fragment | 去掉 | 单页应用可能用 fragment 路由，需独立评估 |
| host 大小写 | 转小写 | IDN 应使用标准库 IDNA 处理 |
| 默认端口 | 去掉 | 非默认端口必须保留 |
| 点段与空路径 | 解析 | 不能跨 host 做字符串替换 |
| 追踪参数 | 仅按已确认规则删除 | 未知 query 默认保留 |
| 参数顺序 | 谨慎排序 | 重复键与签名参数顺序可能敏感 |

这张表要解决“哪些差异可证明等价”。没有证据的删除，是把不同页面错误合并。

对爬虫而言，规范 URL 既是去重键也是范围判断输入。团队应把规则写成可测试函数，并在每次规则变化时重跑候选集合对比；否则一个“清理参数”的小改动，可能让下次增量任务把旧页面全部当成新页面。

规则应返回结构化结果而不仅是字符串：规范 URL、跳过的原因、命中的规则名与规则版本。这样当候选数骤降时，可以按原因聚合，而不是逐条猜日志。
`,
  derivation: `
以请求 URL \`https://Shop.Test/catalog/page.html\` 为例，页面 base 为 \`/catalog/\`：

1. 合并 \`../books/101#reviews\` 得到 \`https://Shop.Test/books/101#reviews\`；
2. host 转小写，得到 \`https://shop.test/books/101#reviews\`；
3. 去掉 fragment，得到 \`https://shop.test/books/101\`；
4. 若还有 \`https://shop.test:443/books/101\`，因 443 是默认端口而合并为同一条；
5. \`https://shop.test/books/101?utm_source=list\` 只有在确认 \`utm_source\` 不改变内容时才删除，否则保留。

假设列表有 20 个链接，其中 4 个只差 fragment、2 个只差默认端口，则规范化后唯一 URL 数为 20-4-2=14。若再错误删除 \`page\` 参数，可能把 3 个分页都合并掉，造成漏抓；因此报告要分别统计 fragment 去重、端口去重与参数保留。
`,
  diagram: '<Diagram type="crawl-canonicalize" name="default" />',
  diagramNote:
    '图中同一路径的原始 URL 经过 base 合并、fragment 去除、host/端口统一与范围校验后进入候选集合。任何“删除 query”的步骤都必须由明确规则触发。',
  caseStudy:
    '合成商城列表页有 12 个链接：`?utm_source=home` 是已知追踪参数，3 个链接只差 `#reviews`，1 个使用 `:443`，2 个是 `javascript:`，还有 2 个分页 `?page=2` 与 `?page=3`。规则删 fragment 与 utm，统一默认端口，保留 page，跳过非 HTTP。最终唯一候选 8 个：7 个商品/分类页加 2 个分页中的唯一性变化，报告同时记录 `query_preserved=2` 与 `invalid_scheme=2`。测试包含“分页不能被合并”的反例，防止未来有人把所有 query 清零。',
  codePractice:
    'Demo 使用 `urljoin`、`urlsplit`、`urlunsplit` 与 `urldefrag` 实现保守规范化：只去 fragment，不删未知 query。练习会要求你增加默认端口规则并输出跳过原因。所有 URL 为合成字符串。',
  mistakes: [
    '把所有 query 删除：分页、搜索词和资源 ID 可能全被合并。',
    '按字符串替换 `/../`：路径可能出现在 query 或编码内容中。',
    '忽略响应重定向后的最终 URL，导致相对链接基准错误。',
    '规范化后不保留原始 URL 与规则版本，出现漏抓时无法追溯。',
  ],
  relations:
    '本节为 Frontier 去重提供键，为第 6 章 robots 匹配提供统一 URL，为第 10 章内容指纹提供稳定标识。规范化规则版本应进入数据血缘。',
  summary:
    '先用正确 base 合并，再保守删除可证明无意义的差异。未知 query 默认保留，范围校验在规范化之后执行，并记录规则版本。',
  references: [
    'RFC 3986 URI 通用语法：<https://www.rfc-editor.org/rfc/rfc3986.html>',
    'WHATWG URL Standard：<https://url.spec.whatwg.org/>',
    'Python `urllib.parse`：<https://docs.python.org/3/library/urllib.parse.html>',
  ],
  lab: [
    '列出 10 个等价与不等价 URL 对，为每个写出规范化动作与依据。',
    '实现保守规范化函数，连续处理 base、fragment、host 与默认端口。',
    '构造一个带分页 query 的夹具，断言它们不会被合并。',
    '输出 `original_url` 与 `canonical_url`，比较规则版本变化前后的候选数。',
  ],
  selfExplanations: [
    '**自我解释一**：为什么“删除全部 query”看起来能减少重复，却可能直接破坏采集完整性？',
    '**自我解释二**：fragment 通常可以删除，但单页应用为什么需要单独评估？',
  ],
  predictionPrompt:
    '列表里三个 URL 只差 fragment、两个只差默认端口，你预测规范化后减少几个候选？先写计数，再运行 Demo。',
  tips: [
    {
      kind: 'pitfall',
      text: '未知 query 默认保留；只有站点规则和回归夹具证明无内容影响时才能删除。',
    },
    {
      kind: 'note',
      text: '保存原文 URL、规范 URL、所用规则版本与跳过原因，才能审计漏抓与误合并。',
    },
    {
      kind: 'performance',
      text: '在发请求前规范化和去重，比下载后再发现相同内容更省带宽，也更礼貌。',
    },
  ],
  demo: {
    title: '保守 URL 规范化',
    lang: 'python',
    code: `from urllib.parse import urljoin, urldefrag, urlsplit, urlunsplit

def canonicalize(base_url, href):
    url, _ = urldefrag(urljoin(base_url, href))
    parts = urlsplit(url)
    if parts.scheme.lower() not in {"http", "https"} or not parts.hostname:
        return None
    host = parts.hostname.lower()
    port = parts.port
    if (parts.scheme.lower(), port) in {("http", 80), ("https", 443)}:
        port = None
    netloc = host if port is None else f"{host}:{port}"
    path = parts.path or "/"
    return urlunsplit((parts.scheme.lower(), netloc, path, parts.query, ""))

base = "https://Shop.Test/catalog/"
raw = ["../b/1?page=2#top", "HTTPS://SHOP.TEST:443/b/1", "javascript:void(0)"]
print([canonicalize(base, item) for item in raw])`,
  },
});

const frontierLesson = makeLesson({
  id: lesson2,
  title: 'Frontier：BFS、优先级队列与抓取顺序',
  difficulty: 3,
  goals: [
    '说明 Frontier 中 URL、深度、优先级、状态与来源字段各自解决什么问题。',
    '用 deque 实现 BFS 顺序，用 heapq 实现优先级顺序，并解释稳定性与复杂度。',
    '通过一个小图逐轮模拟入队、去重、访问与深度截断。',
    '为后续礼貌抓取和持久化保留可扩展的队列项契约。',
  ],
  prerequisites: [
    '会使用 Python 集合去重，并理解队列与栈的区别。',
    '知道 URL 规范化是入队键，而不是显示字符串。',
    '能读简单的有向图表示。',
  ],
  problem:
    '发现链接之后，爬虫不能立刻递归到底：深度优先可能在一个大目录里耗尽预算，重复链接会反复入队，高价值页面也可能排到很晚。Frontier 必须把“候选、顺序、状态、范围”集中在可检查的数据结构里，否则不同模块各自维护 visited 集合，迟早出现状态分叉。',
  intuition:
    'BFS 像按楼层扫描先覆盖浅层页面，适合先建立目录全貌；优先级队列像给每张票一个分数，先处理高相关页面。队列项不是裸 URL，而是一张任务卡：去哪里、从哪来、多深、为何优先、当前处于什么状态。',
  concepts: `
### 1. 最小队列项

| 字段 | 作用 | 典型错误 |
| --- | --- | --- |
| url | 规范 URL，队列唯一键 | 用原 URL 去重 |
| depth | 当前路径深度 | 混用请求次数与深度 |
| priority | 排序分数 | 分数不稳定导致抖动 |
| discovered_from | 发现来源，便于追踪 | 丢失来源链 |
| status | queued/fetched/failed | 多模块各存一份状态 |

### 2. BFS 与优先级

\`collections.deque\` 的 \`popleft\` 提供 FIFO；\`heapq.heappush/pop\` 提供最小堆。优先级队列必须加入稳定次级键，例如 \`(priority, sequence, url)\`，否则同分任务的相对顺序可能依赖内部堆结构，测试不稳定。

### 3. 入队与访问时机

常见做法是“发现即入队并标记 queued”，或在弹出时标记 visited。前者能更早减少重复项，后者便于重试。关键是选择一个一致契约，并让状态转换可测试。对需要失败重试的系统，状态应至少包含 queued、processing、done、failed。

### 4. 深度与预算

深度是从种子到当前页的最短或当前路径长度，需要明确。页面预算、请求预算与深度上限是三个独立约束：达到任意一个都要停止入队或处理，但报告原因应不同。
`,
  derivation: `
设有图：S→A、S→B、A→C、B→C、C→D，所有边深度加 1，BFS 序列：

1. 队列 [S]，访问 S；
2. A、B 入队，顺序 [A,B]；
3. 访问 A，C 入队 [B,C]；
4. 访问 B，C 已见，不入队；
5. 访问 C，D 入队 [D]；
6. 访问 D。

结果 S,A,B,C,D；请求 5 页，C 因已见被跳过 1 次。若深度上限为 2，D 的深度 3 超出，不入队，结果是 S,A,B,C 共 4 页。若 A 的优先级为 1、B 为 5、C 为 2，最小堆顺序可能变成 S,A,C,B,D，说明“广度”与“优先级”是不同策略，不能同时声称按深度逐层扫描。

为了让运行可解释，每次弹出任务时记录队列长度、已访问数、当前深度与停止预算。若队列在中途变空，原因是 \`frontier_empty\`；若仍有任务但页面预算已满，原因是 \`page_budget\`。这两种状态对后续补抓完全不同：前者可能已完成，后者只是本轮暂停。优先级方向也要写死并测试，例如约定数值越小越先访问，防止团队对“高优先级”语义产生相反理解。

Frontier 还需要定义同一 URL 再次被发现时的处理方法：若状态为 done，可只增加 discovered_again；若为 failed，应在重试预算允许时重新排队；若为 processing，则可能有另一个 worker 正在处理，不能重复派发。状态检查与入队应尽量在同一原子操作中完成，单机用锁或事务，分布式则用租约。

深度字段也有口径问题：同一 URL 可能从不同路径以不同深度到达。若以最短深度为准，需要允许后续更浅路径更新现有任务；若以首次发现为准，结果依赖发现顺序。课程建议保存当前最短深度，并在更浅发现时更新优先级与深度，同时记录来源变化，避免同一页面在不同运行中得出不同预算结论。

测试至少覆盖：邻接表含环、同一节点多前驱、预算为 0、预算恰好等于节点数四种情况。只有正常 DAG 上能跑通的 BFS，无法证明 Frontier 在真实链接图里不会重复或死循环。

每次修改调度策略，都用固定图和固定种子连接运行两次，比较访问序列、重复计数与剩余队列。
`,
  diagram: '<Diagram type="crawl-frontier" name="bfs" />',
  diagramNote:
    '图中种子进入 Frontier，弹出后检查状态与深度，发现新链接、规范化、去重再入队。访问集合与队列共同决定下一批任务。',
  caseStudy:
    '合成课程目录有 20 个 URL。种子深度 0；分类页深度 1；课程页深度 2；详情页深度 3。预算设置最大深度 2、最多 12 页。BFS 先访问 1 个种子、再访问 4 个分类、最后 7 个课程页，达到 12 页预算时停止，详情页被记为 `budget_exhausted_depth` 而不是“不存在”。若使用固定递归，很可能先深入第一个分类的 30 个详情，导致其他分类完全未覆盖。',
  codePractice:
    'Demo 把相邻表表示为字典，使用 deque 做 BFS，并维护 queued/seen 集合。练习要求返回确定顺序，并在达到预算时记录原因。',
  mistakes: [
    '只用 URL 字符串当任务，没有深度、来源与状态，后续无法恢复或解释顺序。',
    '优先级只有主分数，没有稳定次级键，同分任务顺序不可复现。',
    '入队前不做规范化，`#top` 与默认端口链接占满队列。',
    '把“达到页面预算”误报成“没有更多链接”，掩盖策略导致的未抓内容。',
  ],
  relations:
    'Frontier 承接 URL 规范化与链接发现，为第 6 章按主机限速、第 7 章检查点和第 11 章中心工作队列提供核心状态。项目 2 的分页游标可看成串行化后的 Frontier。',
  summary:
    'Frontier 是带状态的任务集合，不是简单列表。BFS 与优先级队列回答不同抓取顺序；深度、页面与请求预算必须分别记录停止原因。',
  references: [
    'Python `collections.deque`：<https://docs.python.org/3/library/collections.html#collections.deque>',
    'Python `heapq`：<https://docs.python.org/3/library/heapq.html>',
    '《Web Crawling》综述 DOI：<https://doi.org/10.1561/1500000017>',
  ],
  lab: [
    '为 Frontier 定义不少于 6 个字段的队列项，并写状态转换表。',
    '用同一张图分别运行 BFS 与优先级 BFS，记录输出差异。',
    '加入深度上限与页面预算，打印每种停止原因计数。',
    '构造同优先级 3 个任务，证明加入序号后顺序稳定。',
  ],
  selfExplanations: [
    '**自我解释一**：为什么优先级队列需要稳定次级键，而 BFS 不需要额外优先级分数？',
    '**自我解释二**：页面预算耗尽与深度截断都属于“未抓”，为什么报告仍要分开原因？',
  ],
  predictionPrompt:
    '在 S→A、B；A→C；B→C；C→D 的图中，你预测 BFS 入队几次 C、实际访问几次？先写队列快照。',
  tips: [
    {
      kind: 'pitfall',
      text: 'visited 集合必须与队列处于同一个状态契约；不要在多个模块各复制一份。',
    },
    {
      kind: 'performance',
      text: '`heapq` 入队 O(log n)，弹出 O(log n)；`deque` 两端操作 O(1)，不要用列表 `pop(0)` 模拟队列。',
    },
    {
      kind: 'note',
      text: '优先级分数应有可解释来源，例如范围相关度、更新频率或距离；不要随机排序。',
    },
  ],
  demo: {
    title: '确定性 BFS 与队列快照',
    lang: 'python',
    code: `from collections import deque

graph = {
    "S": ["A", "B"],
    "A": ["C"],
    "B": ["C"],
    "C": ["D"],
    "D": [],
}

def bfs(graph, seed, max_pages=10):
    queue = deque([(seed, 0)])
    queued = {seed}
    visited = []
    duplicates = 0
    while queue and len(visited) < max_pages:
        url, depth = queue.popleft()
        if url in visited:
            duplicates += 1
            continue
        visited.append(url)
        for nxt in graph.get(url, []):
            if nxt not in queued:
                queued.add(nxt)
                queue.append((nxt, depth + 1))
        print("visit", url, "depth", depth, "queue", list(queue))
    return {"visited": visited, "duplicates": duplicates, "remaining": list(queue)}

print(bfs(graph, "S"))`,
  },
});

const trapsLesson = makeLesson({
  id: lesson3,
  title: '抓取陷阱、去重与深度控制',
  difficulty: 3,
  goals: [
    '识别无限日历、路径增长、软 404、重复参数与自动跳转等抓取陷阱。',
    '用 URL 规范化、内容指纹、深度/页面/请求预算形成多层防线。',
    '理解 Bloom filter 的假阳性、容量与错误率之间的关系，不用它替代业务键校验。',
    '为停止条件设计可解释指标，区分成功完成、预算耗尽与异常环路。',
  ],
  prerequisites: [
    '理解 Frontier 的队列项和 BFS。',
    '能计算简单比例与概率。',
    '知道 URL 去重和内容去重不是同一件事。',
  ],
  problem:
    '一个日历页每天生成“下一天”链接，路径可以无限延伸；一个筛选页通过参数排列组合生成大量相似页面；服务器对不存在内容返回 200 空壳，使“状态码成功”失去意义。只靠深度上限可能漏掉真正内容，只靠 URL 去重无法识别软 404，只靠 Bloom 又可能把有效页面误判为已抓。',
  intuition:
    '用多层滤网阻止陷阱：规范化先把明显等价合并；业务键和内容指纹再识别不同 URL 的相似页面；深度、页面与请求预算限制最坏情况；监控发现新 URL/有效内容比例突然下降。没有一层能单独解决全部问题。',
  concepts: `
### 1. 常见陷阱

- **无限路径**：日历、目录分页、相对路径不断叠加。
- **参数爆炸**：排序、视图、追踪参数组合产生近乎无限 URL。
- **软 404**：返回 200，但标题是“未找到”或正文极短。
- **重复内容**：规范 URL 不同，正文几乎一致。
- **跳转环**：A→B→A，或刷新元标签循环。

### 2. 多层防御

先用规范化减少等价 URL；再用范围规则阻断跨域与无意义路径；Frontier 维护已见集合；抽取后用内容哈希/SimHash 检测重复；最后用深度与总预算兜底。软 404 需要结构规则和人工样本，不能只靠状态码。

### 3. Bloom filter 的语义

Bloom 用若干哈希位表示“可能见过”。它可能假阳性（未见过却判为可能见过），但不会假阴性（明确说没见过则确实没见过）。设位数组 m、插入 n、哈希函数 k，近似假阳性率约 \`(1-e^{-kn/m})^k\`。如果业务要求不能漏掉有效 URL，Bloom 只能用于前置过滤，最终仍需精确集合或存储查询确认。

### 4. 停止原因

报告至少区分 \`completed_frontier_empty\`、\`depth_limit\`、\`page_budget\`、\`request_budget\`、\`time_budget\` 与 \`error_threshold\`。把预算停止写成“完成”会掩盖未覆盖范围。
`,
  derivation: `
设某日历每天产生 2 个未来链接，深度上限 6，从当天开始。理想树最多约 \`2^0+2^1+...+2^6=127\` 个不同路径，但很多路径会合流到同一天，因此 URL 去重后可能只有 7 个日期。这个对比说明“边数”不等于“唯一页面数”。

若 m=10,000 位、n=1,000 个 URL、k=3，假阳性率近似 \`(1-e^{-3×1000/10000})^3 = (1-e^{-0.3})^3 ≈ 0.259^3 ≈ 0.0174\`，约 1.74%。若 URL 增长到 5,000，参数变为 \`(1-e^{-1.5})^3 ≈ 0.777^3 ≈ 0.469\`，即约 46.9%，已不适用于需要可靠去重的场景。容量估算必须按预期峰值而不是首日数据做。

陷阱检测还应把“停下”与“判定无价值”区分开。一个页面因深度限制没有入队，不代表它已被证明重复或无效；报告中应保存 \`not_enqueued_reason\`。同样，软 404 检测器命中后可以把页面标为低质量，但应保留正文哈希与规则版本，便于将来页面改版后重新评估。把这些判断写进状态与证据，系统才能解释自己为什么没有继续。

预算设计还要防止“预算内也抓不完”的错觉：如果每个页面平均再发现 3 个新 URL，Frontier 会快速增长。监控应同时看唯一 URL 的增长率与新 URL 转化为有效内容的比例。当后者持续下降时，说明范围或内容规则可能过宽，应停下来调整，而不是只延长运行时间。

对于高价值页面，可以用精确集合优先确认 Bloom 的“可能已见”结果，或直接以业务键查询数据库；对低价值、可忍受少量漏抓的页面，才把 Bloom 当作节省内存的前置层。把这种差异化策略写进字段级规则，比全局宣布“启用 Bloom”更符合工程风险控制。

将这些策略写成报告字段后，才能用同一批样本比较“严格模式”和“宽松模式”的覆盖差异，而不是凭感觉调参。

实验记录应保留参数、候选数和停止原因，方便下一轮做出有证据的调整。
`,
  diagram: '<Diagram type="crawl-bloom" name="bloom" />',
  diagramNote:
    '图中 URL 经多个哈希映射到位数组。若任一位为 0，可确定没见过；若全为 1，只能说“可能见过”，仍需精确确认。',
  caseStudy:
    '合成站点的搜索页有 `q`、`sort`、`view` 三个参数，组合出 1,200 个 URL，但实际有效商品只有 40 个。团队保留有业务含义的 q/id，删除已确认无影响的 view 参数，对 sort 只允许两种值，并用正文 SimHash 发现大量空结果页。最终抓取 40 个商品与 6 个有代表性的搜索页，报告记录 `query_variants_skipped=1154` 与 `soft_404=18`。这不是靠一个深度数字解决，而是范围、规范化、内容质量与预算共同作用。',
  codePractice:
    'Demo 检测路径深度、重复段和空壳正文，并返回结构化停止原因。练习会要求你实现范围判断与 Bloom 容量估算；只计算结果，不进行真实采集。',
  mistakes: [
    '只按深度限制，导致宽而浅的低价值页面耗尽预算，或深但唯一的页面被过早截断。',
    '把 Bloom 假阳性当成精确事实，永久跳过尚未抓取的页面。',
    '把软 404 当正常记录，污染数据质量与增量变化。',
    '报告只写“抓取完成”，不区分 Frontier 空与预算耗尽。',
  ],
  relations:
    '本节连接第 6 章限速与重试、第 9 章质量规则和第 10 章近似去重。Bloom 是性能层，不取代第 7 章持久化精确状态；SimHash 的内容相似度与 URL 去重互补。',
  summary:
    '抓取陷阱需要分层防御：规范化、范围、状态、内容质量与预算。Bloom 有可控假阳性，只能作为辅助；停止原因必须如实报告。',
  references: [
    'Bloom 原始论文（Burton H. Bloom, 1970）：<https://doi.org/10.1145/362686.362692>',
    '《Web Crawling》综述 DOI：<https://doi.org/10.1561/1500000017>',
    'RFC 9309 Robots Exclusion Protocol：<https://www.rfc-editor.org/rfc/rfc9309.html>',
  ],
  lab: [
    '列出 5 种抓取陷阱，各设计一个 URL 或内容级检测信号。',
    '用 10,000 位、3 个哈希、1,000 与 5,000 个元素分别计算 Bloom 假阳性率。',
    '构造 6 个 URL 的路径深度与重复段统计，决定哪些进入 Frontier。',
    '让停止原因成为枚举字段，并给每种原因写一个测试断言。',
  ],
  selfExplanations: [
    '**自我解释一**：为什么 Bloom filter 的“假阳性”通常比“假阴性”更适合作为可接受误差？',
    '**自我解释二**：内容指纹解决了 URL 去重无法处理的哪类问题？为什么它仍不能替代业务键？',
  ],
  predictionPrompt:
    '若 Bloom 容量不变而插入 URL 增长五倍，你预测假阳性率会线性增加还是更快？先用公式估一个数量级。',
  tips: [
    {
      kind: 'performance',
      text: 'Bloom 适合大集合的前置过滤；最终写库仍应依赖精确唯一键或 UPSERT。',
    },
    {
      kind: 'pitfall',
      text: '软 404 不能只看状态码；标题、正文长度、结构化标记与历史模式都要参与判断。',
    },
    {
      kind: 'note',
      text: '停止原因是数据，不是日志附言。它决定用户是否能解释抓取覆盖边界。',
    },
  ],
  demo: {
    title: '范围判断、路径陷阱与停止原因',
    lang: 'python',
    code: `from urllib.parse import urlsplit

def inspect(url, allowed_hosts, max_depth=3):
    path = urlsplit(url).path
    parts = [part for part in path.split("/") if part]
    repeated = any(parts[i] == parts[i - 1] for i in range(1, len(parts)))
    reasons = []
    if urlsplit(url).hostname not in allowed_hosts:
        reasons.append("out_of_scope")
    if len(parts) > max_depth:
        reasons.append("depth_limit")
    if repeated:
        reasons.append("repeated_path_segment")
    return {"allowed": not reasons, "reasons": reasons, "depth": len(parts)}

for url in [
    "https://shop.test/books/1",
    "https://other.test/books/1",
    "https://shop.test/a/b/c/d",
    "https://shop.test/a/a/a",
]:
    print(url, inspect(url, {"shop.test"}))`,
  },
});

const canonicalExercises = makeExercises(chapterId, lesson1, 2, [
  {
    type: 'single',
    question: '下列哪一项通常可以安全地从 URL 中去掉，而不改变服务器请求的页面资源？',
    options: [
      ['A', 'fragment'],
      ['B', '决定分页的 page 参数'],
      ['C', '路径中的资源 ID'],
      ['D', '非默认端口'],
    ],
    answer: 'A',
    explanation: 'fragment 通常只由客户端使用，不随 HTTP 请求发送；query、路径与端口可能有语义。',
    tags: ['URL 规范化'],
  },
  {
    type: 'judge',
    question: '未知 query 参数应默认删除，以减少重复 URL。',
    answer: false,
    explanation: '未知参数可能决定内容、排序或权限；只有已确认无语义并有夹具时才能删除。',
    tags: ['query 风险'],
  },
  {
    type: 'fill',
    question:
      '页面地址为 `https://shop.test/catalog/`，`<base href="/books/">`，相对链接 `../b/1#top` 规范化后为 ___。',
    blanks: [['https://shop.test/b/1']],
    explanation: 'base 变为 `https://shop.test/books/`，合并 `../b/1` 得 `/b/1`，再去 fragment。',
    tags: ['base 与 urljoin'],
  },
  {
    type: 'multiple',
    question: '规范化时必须保留或谨慎处理哪些部分？',
    options: [
      ['A', '非默认端口'],
      ['B', '未知查询参数'],
      ['C', '影响内容的路径'],
      ['D', '所有 fragment'],
    ],
    answer: ['A', 'B', 'C'],
    explanation: 'A/B/C 都可能改变资源或请求范围；fragment 通常可去，但单页应用需特殊评估。',
    tags: ['规范化边界'],
  },
  {
    type: 'code',
    question:
      '实现 `canonicalize(base_url, href)`：合并 URL、去 fragment、scheme/host 小写、删除 http:80 与 https:443 默认端口、空路径补 `/`；只允许 http/https，否则返回 None。保留 query 原样。',
    starterCode: `from urllib.parse import urljoin, urldefrag, urlsplit, urlunsplit

def canonicalize(base_url, href):
    pass
`,
    expectedOutput: '规范 URL 或 None',
    tests: `assert canonicalize("https://Shop.Test/c/", "../b/1#x") == "https://shop.test/b/1"
assert canonicalize("https://Shop.Test/", "HTTPS://SHOP.TEST:443/b/1?page=2") == "https://shop.test/b/1?page=2"
assert canonicalize("https://shop.test/", "javascript:void(0)") is None
`,
    answer: `from urllib.parse import urljoin, urldefrag, urlsplit, urlunsplit

def canonicalize(base_url, href):
    url, _ = urldefrag(urljoin(base_url, href))
    parts = urlsplit(url)
    scheme = parts.scheme.lower()
    if scheme not in {"http", "https"} or not parts.hostname:
        return None
    host = parts.hostname.lower()
    port = parts.port
    if (scheme, port) in {("http", 80), ("https", 443)}:
        port = None
    netloc = host if port is None else f"{host}:{port}"
    return urlunsplit((scheme, netloc, parts.path or "/", parts.query, ""))
`,
    explanation: '先合并再去 fragment；query 原样保留，默认端口只在 scheme 匹配时删除。',
    tags: ['规范化', 'urljoin'],
    allowedModules: ['urllib.parse'],
  },
  {
    type: 'single',
    question: '为什么规范化后的 URL 还应保存原始 URL 与规则版本？',
    options: [
      ['A', '为了增加存储空间'],
      ['B', '为了审计漏抓、误合并与规则变更'],
      ['C', '因为原始 URL 会改变服务器内容'],
      ['D', '为了跳过 robots.txt'],
    ],
    answer: 'B',
    explanation: '规范过程可能合并或过滤候选；保留来源与版本才能回溯规则造成的影响。',
    tags: ['可追溯性'],
  },
  {
    type: 'judge',
    question: '直接对整段 URL 做字符串替换 `/../` 是处理点段的稳健方法。',
    answer: false,
    explanation: '字符串可能出现在 query 或编码内容中；应通过标准 URL 解析处理路径。',
    tags: ['路径安全'],
  },
  {
    type: 'open',
    question:
      '一个列表有 20 个链接：3 个只差 fragment、2 个只差默认端口、3 个分页、1 个 javascript。说明你的规范化与统计策略。',
    referenceAnswer:
      '先 base 合并并跳过 javascript；fragment 去重减少 3，默认端口去重减少 2，分页保留 3 个独立候选。若合法链接为 19 个，规范后唯一数按具体重叠计算，但报告应分别给出 fragment、端口、分页保留与非法 scheme 计数，并保留原始 URL。',
    rubric: [
      { point: '跳过非法 scheme', score: 2 },
      { point: '正确去 fragment 与默认端口', score: 2 },
      { point: '明确保留分页 query', score: 2 },
      { point: '给出可复核统计', score: 2 },
    ],
    explanation: '本题考查保守规范化边界，不能把分页当作可删除参数。',
    tags: ['规范化案例', '开放题'],
    keywords: ['fragment', '端口', '分页', 'javascript'],
  },
]);

const frontierExercises = makeExercises(chapterId, lesson2, 3, [
  {
    type: 'single',
    question: 'BFS 使用 `deque.popleft()` 的主要原因是？',
    options: [
      ['A', '从列表中间删除更快'],
      ['B', '从左侧弹出符合先进先出且均摊 O(1)'],
      ['C', '会自动对 URL 去重'],
      ['D', '会把查询参数排序'],
    ],
    answer: 'B',
    explanation: 'deque 双端操作高效，popleft 实现 FIFO；去重仍需独立集合。',
    tags: ['BFS'],
  },
  {
    type: 'multiple',
    question: '一个可恢复的 Frontier 任务卡通常应包含？',
    options: [
      ['A', '规范 URL'],
      ['B', '深度与优先级'],
      ['C', '状态与发现来源'],
      ['D', '用户 Cookie 完整值'],
    ],
    answer: ['A', 'B', 'C'],
    explanation: 'URL、深度、优先级、状态和来源支持调度与恢复；敏感会话值不应进入队列日志。',
    tags: ['任务卡'],
  },
  {
    type: 'fill',
    question:
      '优先级队列用 `(priority, sequence, url)` 排序，其中 `sequence` 用来保证 ___ 顺序稳定，`url` 作为最终 ___ 键。',
    blanks: [['同优先级', '同分', '并列'], ['决胜', '稳定']],
    explanation: '序号让同优先级任务保序，URL 可提供最后确定性；元组比较保证测试可复现。',
    tags: ['优先级队列'],
  },
  {
    type: 'judge',
    question: 'Frontier 的深度上限和总页面预算可以合并成同一个计数。',
    answer: false,
    explanation: '深度限制单条路径，页面预算限制总量；触发条件与报告原因不同。',
    tags: ['预算'],
  },
  {
    type: 'code',
    question:
      '实现 `bfs_order(graph, seed, max_pages)`：graph 为字典，值按给定顺序表示邻居。返回访问顺序；每个 URL 只访问一次；达到 max_pages 停止。',
    starterCode: `from collections import deque

def bfs_order(graph, seed, max_pages):
    pass
`,
    expectedOutput: 'BFS 访问顺序',
    tests: `g={"S":["A","B"],"A":["C"],"B":["C"],"C":["D"],"D":[]}
assert bfs_order(g,"S",10)==["S","A","B","C","D"]
assert bfs_order(g,"S",3)==["S","A","B"]
`,
    answer: `from collections import deque

def bfs_order(graph, seed, max_pages):
    queue = deque([seed])
    queued = {seed}
    visited = []
    while queue and len(visited) < max_pages:
        url = queue.popleft()
        if url in visited:
            continue
        visited.append(url)
        for nxt in graph.get(url, []):
            if nxt not in queued:
                queued.add(nxt)
                queue.append(nxt)
    return visited
`,
    explanation: '入队时标记 queued、弹出时记录 visited，可避免重复任务且保持邻居顺序。',
    tags: ['BFS 实现'],
    allowedModules: ['collections'],
  },
  {
    type: 'code',
    question:
      '实现 `priority_order(tasks, limit)`：tasks 为 `(priority, seq, url)`，用 heapq 按 (priority, seq, url) 弹出；返回前 limit 个 url。',
    starterCode: `import heapq

def priority_order(tasks, limit):
    pass
`,
    expectedOutput: '按优先级访问的 URL 列表',
    tests: `tasks=[(5,2,"b"),(1,3,"a"),(1,1,"c")]
assert priority_order(tasks,2)==["c","a"]
`,
    answer: `import heapq

def priority_order(tasks, limit):
    heap = []
    for priority, seq, url in tasks:
        heapq.heappush(heap, (priority, seq, url))
    result = []
    while heap and len(result) < limit:
        _, _, url = heapq.heappop(heap)
        result.append(url)
    return result
`,
    explanation: '元组按字段依次比较，序号让同优先级顺序由输入决定而稳定。',
    tags: ['heapq'],
    allowedModules: ['heapq'],
  },
  {
    type: 'single',
    question: '若图中共有 5 个唯一页面，但发现边触发 8 次入队尝试，合理的报告是？',
    options: [
      ['A', '页面 5，重复尝试 3'],
      ['B', '页面 8，重复 0'],
      ['C', '无法区分入队与访问'],
      ['D', '必须再请求 3 次'],
    ],
    answer: 'A',
    explanation: '唯一访问 5；额外 3 次被发现但未入队/未重复访问，应计为重复候选。',
    tags: ['计数口径'],
  },
  {
    type: 'judge',
    question: '优先级分数越高代表应先访问还是后访问，应由具体实现约定并写入测试。',
    answer: true,
    explanation: 'heapq 默认最小堆；若业务希望高分先访问，需要取负值或自定义包装，约定必须明确。',
    tags: ['优先级方向'],
  },
  {
    type: 'open',
    question:
      '设计一个 Frontier 预算实验：最大深度 2、最多 10 页、最多 15 次请求。说明如何记录深度截断、页面预算和请求预算。',
    referenceAnswer:
      '每次入队检查深度并记录 depth_limit；每次访问前检查页面数并记录 page_budget；每次请求前检查请求计数并记录 request_budget。三者允许在同一 run 中组合出现，但停止报告应分别计数，Frontier 剩余队列与原因也应保存。',
    rubric: [
      { point: '三个约束分别检查', score: 2 },
      { point: '停止原因可区分', score: 2 },
      { point: '保存剩余任务', score: 2 },
      { point: '报告可复核', score: 2 },
    ],
    explanation: '预算控制不是单一计数器；分层记录才能解释覆盖边界。',
    tags: ['预算设计', '开放题'],
    keywords: ['depth_limit', 'page_budget', 'request_budget', '剩余队列'],
  },
  {
    type: 'single',
    question: '以下哪种情况最适合用优先级 Frontier 而不是纯 BFS？',
    options: [
      ['A', '需要先覆盖所有深度 1 分类页'],
      ['B', '已知少量高价值页面应优先，且范围可控'],
      ['C', '所有页面完全相同'],
      ['D', '不记录抓取状态'],
    ],
    answer: 'B',
    explanation: '优先级适合在有限预算下先处理高价值任务；纯 BFS 更适合均匀覆盖浅层。',
    tags: ['策略选择'],
  },
]);

const trapExercises = makeExercises(chapterId, lesson3, 3, [
  {
    type: 'single',
    question: '服务器对不存在页面返回 HTTP 200 和“未找到”正文，这类页面称为？',
    options: [
      ['A', '软 404'],
      ['B', '304'],
      ['C', '重定向链'],
      ['D', '合法详情页'],
    ],
    answer: 'A',
    explanation: '状态码成功但内容表示不存在，是软 404；需要结构或内容规则识别。',
    tags: ['软 404'],
  },
  {
    type: 'multiple',
    question: '针对无限日历陷阱，哪些防线可以组合使用？',
    options: [
      ['A', '路径深度上限'],
      ['B', '日期范围白名单'],
      ['C', '总页面预算'],
      ['D', '关闭所有去重'],
    ],
    answer: ['A', 'B', 'C'],
    explanation: '范围白名单直接限制业务边界，深度和页面预算限制最坏情况；去重仍是必要基础。',
    tags: ['抓取陷阱'],
  },
  {
    type: 'fill',
    question:
      'Bloom filter 的假阳性指“实际未见过但过滤器判断为 ___”；它不会产生假 ___。',
    blanks: [['可能见过', '已见过'], ['阴性']],
    explanation: '全位为 1 只能说明可能见过；若明确说没见过，则一定未插入。',
    tags: ['Bloom'],
  },
  {
    type: 'judge',
    question: 'Bloom filter 判断某 URL 可能已见后，系统可以无条件永久跳过它。',
    answer: false,
    explanation: '可能已见包含假阳性；高价值或强一致场景需用精确集合/数据库确认。',
    tags: ['Bloom 风险'],
  },
  {
    type: 'code',
    question:
      '实现 `path_flags(url, max_segments=3)`：返回字典，键为 `depth`、`too_deep`、`repeated_segment`；路径按 `/` 分割并忽略空段。',
    starterCode: `from urllib.parse import urlsplit

def path_flags(url, max_segments=3):
    pass
`,
    expectedOutput: '路径深度与陷阱标记',
    tests: `assert path_flags("https://s.test/a/b/c/d") == {"depth":4,"too_deep":True,"repeated_segment":False}
assert path_flags("https://s.test/a/a/b") == {"depth":3,"too_deep":False,"repeated_segment":True}
`,
    answer: `from urllib.parse import urlsplit

def path_flags(url, max_segments=3):
    parts = [part for part in urlsplit(url).path.split("/") if part]
    return {
        "depth": len(parts),
        "too_deep": len(parts) > max_segments,
        "repeated_segment": any(parts[i] == parts[i - 1] for i in range(1, len(parts))),
    }
`,
    explanation: '深度是路径段计数；重复段只检查相邻相同，不等同于完整内容重复检测。',
    tags: ['路径陷阱'],
    allowedModules: ['urllib.parse'],
  },
  {
    type: 'code',
    question:
      '实现 `bloom_fp_rate(m, n, k)`：按 `(1 - exp(-k*n/m))**k` 计算假阳性率；m 必须为正，n>=0，k 为正整数。返回浮点数，不做文本格式化。',
    starterCode: `import math

def bloom_fp_rate(m, n, k):
    pass
`,
    expectedOutput: 'Bloom 假阳性率',
    tests: `r=bloom_fp_rate(10000,1000,3)
assert 0.015 < r < 0.02, r
assert bloom_fp_rate(10000,5000,3) > 0.45
`,
    answer: `import math

def bloom_fp_rate(m, n, k):
    if m <= 0 or n < 0 or k <= 0:
        raise ValueError("invalid Bloom parameters")
    return (1 - math.exp(-k * n / m)) ** k
`,
    explanation: '插入越多，位数组越饱和，假阳性率迅速接近 1；参数校验避免无意义计算。',
    tags: ['Bloom 计算'],
    allowedModules: ['math'],
  },
  {
    type: 'single',
    question: '报告写“抓取完成”但实际因页面预算停止，最严重的后果是？',
    options: [
      ['A', '日志变长'],
      ['B', '团队误以为覆盖完整，遗漏内容未被发现'],
      ['C', '价格自动变 0'],
      ['D', 'URL 失去 fragment'],
    ],
    answer: 'B',
    explanation: '停止原因区分完成与预算耗尽，直接影响对覆盖率和数据完整性的判断。',
    tags: ['停止原因'],
  },
  {
    type: 'judge',
    question: '深度限制越大，抓取质量就越高。',
    answer: false,
    explanation: '更深可能覆盖更多页面，也会放大陷阱、预算消耗与低价值内容；应由范围和证据决定。',
    tags: ['深度权衡'],
  },
  {
    type: 'open',
    question:
      '一个筛选页有 sort×view×page 共 1,200 个组合，但有效商品只有 40 个。请设计至少三层处理并说明指标。',
    referenceAnswer:
      '第一层保留白名单参数值并去掉已知无影响参数；第二层用 URL 去重和深度/预算限制组合；第三层用正文长度、空结果标记或 SimHash 识别软 404/重复内容。报告 query_variants_skipped、soft_404、unique_items、duplicates 与停止原因。',
    rubric: [
      { point: '范围与参数规则', score: 2 },
      { point: '去重与预算', score: 2 },
      { point: '内容质量检测', score: 2 },
      { point: '指标可复核', score: 2 },
    ],
    explanation: '参数爆炸需要范围、结构与内容多层处理，不能只加大深度。',
    tags: ['参数爆炸', '开放题'],
    keywords: ['白名单', '预算', 'SimHash', '软 404'],
  },
  {
    type: 'single',
    question: '为什么内容指纹不能完全替代业务键去重？',
    options: [
      ['A', '内容指纹只适用于图片'],
      ['B', '不同商品可能正文相似，而同一商品更新后指纹会变化'],
      ['C', '哈希会保存价格'],
      ['D', '业务键只能用于 URL'],
    ],
    answer: 'B',
    explanation: '内容相似度与实体身份是不同维度，需业务键、URL 与内容指纹共同判断。',
    tags: ['去重层次'],
  },
]);

export const webCrawlingChapters05: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: chapterId,
    title: '链接发现、URL 规范化与 Frontier',
    goal: '理解 URL 等价与抓取顺序，构建带范围、深度和去重约束的待访问队列。',
    lessons: [canonicalLesson, frontierLesson, trapsLesson],
    exercises: [...canonicalExercises, ...frontierExercises, ...trapExercises],
  },
];
