import type { Chapter } from '../../../types';
import { makeExercises, makeLesson } from './authoring';

const chapterId = 'web-crawling-c10';
const lesson1 = `${chapterId}-l01`;
const lesson2 = `${chapterId}-l02`;
const lesson3 = `${chapterId}-l03`;

const conditionalLesson = makeLesson({
  id: lesson1,
  title: '条件请求：ETag 与 Last-Modified',
  difficulty: 2,
  goals: [
    '理解 ETag、Last-Modified、If-None-Match、If-Modified-Since 与 304 的协作关系。',
    '把条件请求写进可恢复的增量采集流程，而不只是记住两个响应头。',
    '识别缺失、变化、代理改写和服务端验证器不可靠等失败模式。',
    '用本地响应对象验证 200 与 304 分支，不依赖真实站点。',
  ],
  prerequisites: [
    '理解 HTTP 请求头、响应头与状态码。',
    '能在数据库或检查点中保存上次响应元数据。',
    '已完成项目 2，知道重跑与幂等的区别。',
  ],
  problem:
    '每次全量重抓会浪费带宽、增加服务器压力，也让变更比较变难。ETag 与 Last-Modified 允许客户端询问“自上次以来变了吗”，服务器可以返回 304 而不发送正文。但 304 只代表服务器认为没有变化，不代表页面永远正确、验证器没有缺陷或内容真的没有实质差异。条件请求是优化，不是事实保证。',
  intuition:
    '把 ETag 想成文件封条：客户端下次带着封条编号来问，服务器说“还是这封”就返回 304。Last-Modified 像文件修改时间。封条可能丢失、被代理改写、过于粗糙，或者网站更新内容却没换封条。因此 304 更适合减少下载，不适合替代内容哈希、版本记录与质量检查。',
  concepts: `
### 1. 两种验证器

- ETag：服务器给出的实体版本标识，常见强 ETag；客户端下次发送 If-None-Match；
- Last-Modified：资源最后修改时间；客户端发送 If-Modified-Since；
- 两者可同时使用，服务器根据自身规则返回 200 或 304；
- 304 响应通常没有正文，但可带新的缓存/验证器头。

### 2. 一次条件请求

1. 首次请求得到 200、正文与本轮 ETag/Last-Modified；
2. 将验证器与内容哈希、抓取时间一起存入版本表；
3. 下次请求带上 If-None-Match 或 If-Modified-Since；
4. 收到 304 时复用已存内容，记录 conditional_hit；
5. 收到 200 时计算内容哈希，再判断是内容变化还是仅头部/噪声变化；
6. 验证器缺失或响应异常时回退到普通请求，不把 304 当唯一判断。

### 3. 304 的失败模式

- 服务器没有正确实现验证器；
- 代理或 CDN 改写/删除 ETag；
- 内容变化但时间戳精度不足；
- 页面返回个性化内容但 ETag 相同；
- 客户端把旧 ETag 用到了错误 URL。

因此 304 的结果应记录为“服务器声称未修改”，并与内容哈希、抽取结果和版本号交叉验证。若验证器频率异常，质量报告应提示。

### 4. 本地模拟

站内 Demo 不联网，用字典模拟上一次响应和当前响应。条件头构造是纯函数；304 分支只返回缓存记录。真实项目需要注入 HTTP transport，测试仍使用本地响应对象。

### 5. 带宽计算

假设一次正文 200 KB，验证请求只有 2 KB。若 100 个页面中 90 个未变化：

- 全量下载约 100×200 KB=20 MB；
- 条件请求约 10×200 KB + 100×2 KB=2.2 MB；
- 但前提是验证器可靠，90 个 304 都正确。

若验证器缺失导致全部回退为 200，带宽接近全量，只多出请求开销。优化必须带失败回退与成本统计。

还要区分“没有变化”和“没有证据”。304 能说明服务器在当前条件下返回了未修改响应，但客户端若没有保存旧正文、内容哈希或版本号，就无法复用或审计；反之，缺失 ETag 也不代表页面每次都变，只是客户端必须重新获取后才能判断。条件请求的收益应和 conditional_hits、fallback_full、body_bytes_saved、validation_errors 一起报告，避免只展示一个节省百分比而隐藏回退成本。
`,
  derivation: `
设有 100 个已抓 URL：

- 80 个有 ETag，60 个返回 304；
- 10 个没有验证器，必须全量；
- 10 个有验证器但返回 200，其中 7 个内容哈希变化、3 个只是头部变化。

条件命中率为 60/100=60%。实际传输正文的页面为 40 个；如果正文平均 200 KB，则约 8 MB，而不是 20 MB。内容真正变化的 7 个页面需要写新版本；3 个 200 但 hash 相同应记为 header_changed，而不是内容版本。

若只看 304 数，会得到 60% 节省；若只看 200 数，会以为 40% 内容变化。必须同时记录请求状态、哈希与版本动作。一个稳健报告应包含 conditional_requests、conditional_hits、hash_changed、header_only、fallback_full 和 error。
`,
  diagram: '<Diagram type="crawl-recrawl" name="default" />',
  diagramNote:
    '图中首次 200 保存验证器，后续条件请求分成 304 复用与 200 重新校验；异常验证器回到全量分支，不允许静默跳过。',
  caseStudy:
    '项目 5 的 T2 快照中，页面 A 返回 304，页面 B 返回新 ETag 且正文变化，页面 C 没有验证器只能 200。系统对 A 复用旧正文并记录 conditional_hit，对 B 计算新 hash 写入版本，对 C 走全量后比较 hash。三者最终都可审计：304 有缓存证据，200 有新旧哈希，缺失验证器有回退原因。',
  codePractice:
    'Demo 用本地字典模拟 200/304 与条件头；站内练习只测纯函数，不访问网络。真实实现要使用注入 transport，并把验证器与记录版本放在同一事务里。',
  mistakes: [
    '收到 304 就认为页面内容一定没变，不再比较哈希或版本。',
    '首次请求没有保存 ETag，下一次无法发送 If-None-Match。',
    '把 `If-None-Match` 拼成 `If-None-Match: "etag"` 之外的错误格式。',
    '验证器属于旧 URL 却用于新 URL，导致错误 304。',
    '没有验证器时不回退，直接跳过页面。',
  ],
  relations:
    '本节承接第 2 章 HTTP 与第 7 章检查点，是第 10 章版本检测的入口；第 11 章监控条件命中率，第 12 章毕业项目会用 T1/T2/T3 快照证明 304 与变更处理。',
  summary:
    'ETag 和 Last-Modified 让客户端减少重复下载，304 只表示服务器声称未修改。验证器必须与 URL、内容哈希和版本记录一起保存；缺失或异常时回退到全量，而不是把优化当成事实。',
  references: [
    'MDN ETag：<https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag>',
    'MDN 条件请求：<https://developer.mozilla.org/en-US/docs/Web/HTTP/Conditional_requests>',
    'RFC 9110 条件请求：<https://www.rfc-editor.org/rfc/rfc9110#name-conditional-requests>',
  ],
  lab: [
    '为一条旧响应写出 If-None-Match 与 If-Modified-Since 头。',
    '用本地对象模拟 200/304，并记录 conditional_hit。',
    '让验证器缺失，验证系统回退为全量而不是跳过。',
    '计算 100 页、60 个 304 的正文节省量。',
  ],
  selfExplanations: [
    '**自我解释一**：为什么 304 不能替代内容哈希？',
    '**自我解释二**：验证器属于旧 URL 时，为什么可能产生错误 304？',
  ],
  predictionPrompt:
    '一个页面有 ETag，但服务器更新内容后忘记更换 ETag。你预测请求状态与内容哈希会怎样冲突？先写出处理分支。',
  tips: [
    {
      kind: 'pitfall',
      text: '304 是优化信号，不是内容事实；关键数据仍要保留哈希与版本证据。',
    },
    {
      kind: 'note',
      text: '验证器与 URL、抽取器版本一起存储；不要把旧页面的 ETag 带到新地址。',
    },
    {
      kind: 'performance',
      text: '统计条件命中率、回退全量数和正文节省量，才能判断条件请求是否真正有效。',
    },
  ],
  demo: {
    title: '模拟条件请求的 304 分支',
    lang: 'python',
    code: `def conditional_headers(etag=None, last_modified=None):
    headers = {}
    if etag:
        headers["If-None-Match"] = etag
    if last_modified:
        headers["If-Modified-Since"] = last_modified
    return headers

def fetch_local(path, cache, validators):
    headers = conditional_headers(**validators)
    if headers and cache.get(path) and cache[path].get("etag") == validators.get("etag"):
        return 304, headers, None
    return 200, headers, cache[path]["body"]

cache = {"/b1": {"etag": '"v1"', "body": "合成正文"}}
print(fetch_local("/b1", cache, {"etag": '"v1"'}))
print(fetch_local("/b1", cache, {"etag": '"v0"'}))`,
  },
});

const fingerprintLesson = makeLesson({
  id: lesson2,
  title: '内容哈希、SimHash 与近似重复',
  difficulty: 3,
  goals: [
    '用 SHA-256 识别完全重复，并理解规范化会改变指纹。',
    '理解 shingling、64 位 SimHash、Hamming 距离与阈值的取舍。',
    '手算小样本的指纹距离，解释假阳性与假阴性。',
    '把近似重复用于复核与聚类，而不是直接覆盖业务实体。',
  ],
  prerequisites: [
    '会使用 hashlib 和位运算。',
    '理解集合、词元与文本规范化。',
    '知道完全重复、业务重复和近似重复的差别。',
  ],
  problem:
    '同一商品描述可能只改了标点、空白、价格或一句推荐语。SHA-256 会把任何字节差异都当成不同内容，导致大量近似重复；而按业务键直接合并又会损失真实变更。近似重复检测需要把文本切成特征，再用一个可计算的距离判断“相似到什么程度”，同时保留人工复核和阈值调整空间。',
  intuition:
    'SHA-256 像指纹，要求几乎完全一致；SimHash 像把一篇文本压成 64 个投票结果，每个特征给某些位投正票或负票，最后得到 64 位签名。两个签名相差的位数就是 Hamming 距离。距离越小越相似，但阈值不是自然定律，必须用样本和误判成本校准。',
  concepts: `
### 1. 完全重复

对规范化文本计算 SHA-256。规范化要先定义：是否去首尾空白、合并空白、统一大小写、移除跟踪参数、保留还是删除价格。没有统一定义，两个系统的 hash 不可比较。hash 只回答“输入字节是否相同”，不回答“业务实体是否相同”。

### 2. Shingling

把文本切成连续 n 个词或字符片段，得到特征集合。例如字符 4-gram 把“网络爬虫课程”切成“网络爬虫”“络爬虫课”“爬虫课程”。集合过小容易碰撞，过大对微小改动敏感。中文、英文和代码要分别选择切分方式。

### 3. 64 位 SimHash

对每个特征算一个 64 位 hash，逐位投票：该位为 1 加 1，否则减 1；最后按票数符号组成签名。相同或近似文本应该有少量位不同。实现必须固定 mask=2^64-1，避免 Python 负整数或无界整数破坏距离。

### 4. Hamming 距离

距离 = popcount(a XOR b)。相同为 0，完全不同最多 64。若阈值设为 3，则距离 ≤3 视为近似；阈值提高会增加召回，也增加把不同实体合并的假阳性。

### 5. 阈值取舍

| 距离 | 解释 | 动作 |
| ---: | --- | --- |
| 0 | 签名相同 | 仍需看业务键与内容 |
| 1–3 | 高度相似 | 进入复核或同簇 |
| 4–10 | 可能相关 | 不自动合并 |
| >10 | 通常不同 | 分别处理 |

阈值只是工作假设。标题短、语言不同、模板重复都会影响分布。应保存 hash、距离、样本与阈值版本，允许重新聚类。

### 6. 指纹的生命周期

指纹要跟随抽取器版本和规范化版本。改变去空白规则会让历史距离不可比。对于变更检测，先比较 hash；hash 不同再看 SimHash 距离，最后再由业务规则决定是更新、合并还是标记近似。

实现时还要给相似度实验留下可复现证据：保存原文规范化版本、shingle 宽度、SimHash 位宽、阈值和一组标注样本。只报告“相似”或“不相似”无法解释阈值为何合理。对短标题、目录页和模板页要单独评估，因为它们天然容易产生相同或接近的签名；对长正文则要防止单个高频词淹没其他特征。先用小样本手算距离和 Jaccard，再扩大到 100 条，比较误报与漏报，最后才决定自动聚类还是仅进入人工复核。

如果业务需要稳定解释，最好同时保留一组可读证据：两个标题、规范化预览、距离、阈值、命中的 shingle 数量和复核标签。这样当阈值调整或人工认为误判时，团队能知道是规范化、特征切分还是权重出了问题。指纹系统可以自动化，但它的错误必须能被人类理解和纠正。

复现实验时还必须固定 shingle 宽度、hash 算法、位宽与字符规范化顺序；任何一项变化都可能改变同一对文本的距离，使历史阈值失去可比性。
`,
  derivation: `
取两个四字符 shingle 集合：

- A：{网络, 络爬, 爬虫, 虫课, 课程}
- B：{网络, 络爬, 爬虫, 虫课, 课程, 程设, 设计}

若使用集合 Jaccard，交集 5、并集 7，相似度 5/7≈71.4%。SimHash 不直接等于 Jaccard，它把每个特征映射到 64 位并投票；两个文本特征越重合，签名距离通常越小。

假设签名 a=0b1010、b=0b0011（仅用于演示 4 位），a XOR b=0b1001，popcount=2，距离 2。若阈值 1，则判为不同；阈值 2，则判为近似。4 位玩具不能代表 64 位真实分布，但能说明距离是位差异而非字符差异。

若 100 条文本中 12 条与既有记录距离 ≤3，不能直接删除 12 条；应分别检查业务键、标题、价格与来源。近似重复是“需要复核”的信号，不是“同一实体”的证明。
`,
  diagram: '<Diagram type="crawl-bloom" name="simhash" />',
  diagramNote:
    '图把文本切分、特征 hash、64 位投票、签名和 Hamming 距离串起来；阈值决定进入复核还是独立记录，而不是直接决定删除。',
  caseStudy:
    '同一本书的标题从「合成算法导论」改为「合成算法导论（第二版）」，描述只多了一个标点。SHA-256 不同，SimHash 距离为 2，业务 SKU 仍相同。系统把它标为 near_duplicate，写入版本记录并保留标题差异；如果没有 SKU，就只能进入人工复核，不能自动合并。',
  codePractice:
    'Demo 用标准库 hashlib 与位运算实现 64 位 SimHash；站内练习只处理合成字符串。不要用随机 hash 或第三方相似度服务替代可复现实验。',
  mistakes: [
    '不同规范化规则产生的 SHA-256 直接比较。',
    '把 SimHash 距离当作业务主键，自动删除近似记录。',
    '使用无界 Python 整数投票，导致签名超过 64 位。',
    '只测完全相同文本，不测空白、标点、短文本与模板页。',
    '阈值没有版本，线上误判后无法回溯。',
  ],
  relations:
    '本节承接第 9 章的 content_hash 与去重，是第 10 章变更检测的核心；第 12 章毕业项目会用 SHA-256、SimHash 与版本表共同报告 T2/T3 变化。',
  summary:
    'SHA-256 负责完全重复，shingling 与 64 位 SimHash 负责近似相似，Hamming 距离负责可计算比较。距离阈值只触发复核，不能自动替代业务键和人类判断。',
  references: [
    'Python hashlib：<https://docs.python.org/3/library/hashlib.html>',
    'SimHash 论文条目：<https://www.cs.princeton.edu/courses/archive/spr04/cos598B/bib/CharikarEstim.pdf>',
    'Python 位运算：<https://docs.python.org/3/reference/expressions.html#binary-bitwise-operations>',
  ],
  lab: [
    '对两段只差空白的文本计算 SHA-256，观察是否相同。',
    '用 4-gram shingle 计算 Jaccard 相似度。',
    '手算两个 8 位签名的 Hamming 距离。',
    '说明一个 SimHash 假阳性案例应如何复核。',
  ],
  selfExplanations: [
    '**自我解释一**：为什么 SHA-256 相同仍不能证明业务实体相同？',
    '**自我解释二**：提高 SimHash 相似阈值会增加哪类错误，为什么？',
  ],
  predictionPrompt:
    '标题只多了一个标点，SHA-256 会相同还是不同？SimHash 距离可能为 0 还是小正整数？先写预测再计算。',
  tips: [
    {
      kind: 'pitfall',
      text: '先固定规范化版本再比较 hash；不同空白规则会让历史指纹失去可比性。',
    },
    {
      kind: 'note',
      text: 'SimHash 阈值是业务假设，应保存样本、阈值版本和人工复核结果。',
    },
    {
      kind: 'interview',
      text: '先说完全重复、业务重复、近似重复三种问题，再解释 SHA-256 与 SimHash，能避免工具名堆砌。',
    },
  ],
  demo: {
    title: '64 位 SimHash 与 Hamming 距离',
    lang: 'python',
    code: `import hashlib

MASK = (1 << 64) - 1

def simhash64(text, width=4):
    clean = " ".join(text.split())
    features = [clean[i:i+width] for i in range(max(1, len(clean) - width + 1))]
    votes = [0] * 64
    for feature in features:
        digest = hashlib.sha256(feature.encode("utf-8")).digest()
        value = int.from_bytes(digest[:8], "big")
        for bit in range(64):
            votes[bit] += 1 if (value >> bit) & 1 else -1
    result = 0
    for bit, vote in enumerate(votes):
        if vote >= 0:
            result |= 1 << bit
    return result & MASK

def hamming(a, b):
    return (a ^ b).bit_count()

a = simhash64("网络爬虫课程设计")
b = simhash64("网络爬虫课程设计！")
print(a, b, hamming(a, b))`,
  },
});

const recrawlLesson = makeLesson({
  id: lesson3,
  title: '重抓调度、删除检测与版本记录',
  difficulty: 3,
  goals: [
    '按变化率、重要度、新鲜度和抓取预算计算重抓优先级。',
    '区分 404、410、暂时错误与内容消失，并正确记录 tombstone。',
    '设计保存摘要、版本号和抽取器版本的轻量版本表。',
    '用自动测试证明重复运行、删除与恢复不会产生重复版本或错误复活。',
  ],
  prerequisites: [
    '理解条件请求、内容哈希与近似重复。',
    '能设计 SQLite 主键、唯一约束和状态字段。',
    '知道抓取预算必须有限，不能无限重抓所有页面。',
  ],
  problem:
    '全量重抓既昂贵，又无法说明页面是“没变”“变了”“暂时失败”还是“已经删除”。404 可能来自临时配置错误，410 更明确表示已消失；内容没解析到也可能只是选择器失效。若没有版本与 tombstone，删除页面会在下一次全量时被悄悄恢复，或者旧记录永远留在结果中。',
  intuition:
    '重抓调度像图书馆盘点：热门且常变的书架检查更频繁，稳定参考书隔久一点；书不见了先确认是错架、暂时借出还是正式注销。版本表只保存变更摘要和证据，不必保存每次扫描的完整正文。tombstone 则是注销章，让删除成为有记录的状态。',
  concepts: `
### 1. 重抓优先级

一个可解释的分数：

priority = importance × expected_change_rate × freshness_gap / cost

importance 可来自业务等级，expected_change_rate 来自历史变化频率，freshness_gap 表示已有多久未抓，cost 表示请求与解析预算。公式不是唯一答案，但必须让权重和上限显式。

### 2. 抓取预算

若每轮预算为 100 次请求，先按 priority 排序，再受每 host 限速约束。不要因为预算有剩就抓所有低价值页面；也不要把预算全部给同一 host。记录被预算跳过、被限速跳过和被 robots 拒绝是不同原因。

### 3. 删除与失败

| 观察 | 处理 |
| --- | --- |
| 200，hash 相同 | unchanged |
| 200，hash 不同 | changed，写新版本 |
| 304 | conditional_hit，复用旧内容 |
| 404 | 标记 suspect_deleted，按策略复核 |
| 410 | 明确 gone，写 tombstone |
| 500/503 | 暂时失败，保留旧状态并重试 |
| 解析无字段 | extraction_failed，不等于删除 |

404 可能是重定向配置、地域差异或临时故障，通常需要多次或一定时间窗确认；410 语义更明确，但仍要保留证据。删除不是物理抹除全部历史，而是把当前状态置为 tombstone，并保留版本摘要、时间和原因。

### 4. 版本表

建议字段：entity_key、version、observed_at、http_status、content_hash、title_hash、price_hash、extractor_version、change_type、source_url。保存摘要而不是无限正文，既支持解释变化，也降低隐私和存储风险。

### 5. 复活与误删

若 tombstone 后又收到 200，可能是页面恢复、错误 404 修正或重定向到新地址。不能直接覆盖 tombstone；应新增 restored 版本，保留删除窗口。若同一实体出现两个 URL，先规范化再决定是否同一版本链。

### 6. 幂等与重跑

版本号单调递增，唯一约束为 entity_key + version。重复处理同一快照时，先查 content_hash 与 extractor_version：完全一致就记 unchanged，不新增版本。抽取器升级会改变字段摘要，即使页面未变也可能产生版本，必须标记 reason=extractor_upgrade，不能伪装成内容变化。
`,
  derivation: `
设三个页面的重要度与变化率：

- A：importance 5、变化率 0.2、gap 5 天、cost 1 → 5×0.2×5/1=5.0；
- B：importance 4、变化率 0.05、gap 10 天、cost 1 → 2.0；
- C：importance 3、变化率 0.5、gap 2 天、cost 2 → 1.5。

预算 2 次时先抓 A 与 B，C 明确记为 budget_skipped。若 C 是删除检查且业务要求更高，可调整权重或增加删除复核预算，而不是悄悄超预算。

100 个已存实体在 T3：60 unchanged、20 changed、5 new、3 near_duplicate、2 deleted、1 invalid、9 暂时失败。当前有效实体约 60+20+5=85（去重口径另算），tombstone 2 个，失败 9 个仍未决定。报告不能把 9 个失败算作删除，也不能把 near_duplicate 自动合并。
`,
  diagram:
    '| 先前状态 | 新观察 | 新状态 | 版本动作 |\n+| --- | --- | --- | --- |\n+| active | 200 同 hash | unchanged | 不新增正文版本 |\n+| active | 200 新 hash | changed | 新增版本与摘要 |\n+| active | 304 | unchanged | conditional_hit |\n+| active | 410 | gone | tombstone |\n+| active | 404 | suspect_deleted | 复核计数 |\n+| gone | 200 | restored | 新 restored 版本 |\n+| active | 5xx | retry_pending | 保留旧状态 |',
  diagramNote:
    '状态表把 404、410、5xx 与解析失败分开；只有明确状态才改变当前有效性，失败与近似重复都需要复核。',
  caseStudy:
    'T2 中页面 D 返回 410，系统写 tombstone，保留最后标题摘要和删除时间。T3 中同一 URL 又返回 200，内容哈希与旧版本不同。系统新增 restored 版本，而不是删除 tombstone；报告同时显示删除 1 次、恢复 1 次、最终 active。测试重跑 T3 仍得到相同版本数，证明幂等。',
  codePractice:
    'Demo 用纯函数计算优先级与状态分类；站内练习不访问网络，也不执行真实删除。版本表练习只使用 SQLite 或字典夹具。',
  mistakes: [
    '把所有 404 立即当作永久删除，删除前没有复核窗口。',
    '解析失败时写 tombstone，混淆抽取器故障和页面消失。',
    '重抓没有预算，低价值页面挤占删除检查。',
    '每次运行都新增版本，哪怕 hash 与抽取器版本都相同。',
    '把抽取器升级产生的差异写成内容 changed。',
  ],
  relations:
    '本节把条件请求与内容指纹组合成增量策略，是项目 5 的版本与 tombstone 设计基础；第 11 章会把重抓分数用于分布式队列，第 12 章将把删除、保留与隐私流程放进毕业项目。',
  summary:
    '重抓要有优先级与预算，删除要有状态和证据，版本要幂等且可解释。404、410、5xx 和解析失败不是同一种删除；tombstone 让消失成为可审计事实，而不是静默缺行。',
  references: [
    'MDN 410 Gone：<https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/410>',
    'RFC 9110 方法定义：<https://www.rfc-editor.org/rfc/rfc9110>',
    'SQLite 事务：<https://www.sqlite.org/lang_transaction.html>',
  ],
  lab: [
    '用三个页面计算 priority 并选择预算内任务。',
    '把 404、410、503 与结构解析失败分别映射状态。',
    '设计 entity_key + version 的唯一约束。',
    '模拟一个 tombstone 后恢复的页面，验证不覆盖历史。',
  ],
  selfExplanations: [
    '**自我解释一**：为什么 404 不能像 410 一样立即永久删除？',
    '**自我解释二**：抽取器升级为什么可能产生版本，却不应报告为内容变化？',
  ],
  predictionPrompt:
    'T3 中一个 410 页面又返回 200，你预测应该覆盖 tombstone、删除旧版本，还是新增 restored 版本？先写不变量。',
  tips: [
    {
      kind: 'pitfall',
      text: '404 与解析失败都不能直接写 tombstone；状态分类错误比少抓一页更危险。',
    },
    {
      kind: 'performance',
      text: '版本表保存摘要而非无限正文；按预算重抓，避免高成本低价值页面占满队列。',
    },
    {
      kind: 'leak',
      text: '删除流程要覆盖副本、日志和导出文件；只在主表打 tombstone 不代表个人数据已删除。',
    },
  ],
  demo: {
    title: '重抓优先级与变更分类',
    lang: 'python',
    code: `def priority(importance, change_rate, gap_days, cost):
    return importance * change_rate * gap_days / cost

def classify(status, previous_hash, current_hash, content_present=True):
    if status in (500, 502, 503, 504):
        return "retry_pending"
    if status == 410:
        return "gone"
    if status == 404:
        return "suspect_deleted"
    if not content_present:
        return "extraction_failed"
    if previous_hash == current_hash:
        return "unchanged"
    return "changed"

print(round(priority(5,0.2,5,1),2))
print(classify(200,"a","a"), classify(200,"a","b"), classify(410,None,None), classify(404,None,None))`,
  },
});

const conditionalExercises = makeExercises(chapterId, lesson1, 2, [
  {
    type: 'single',
    question: '服务器返回 304 的直接含义是？',
    options: [
      ['A', '页面已被永久删除'],
      ['B', '服务器声称资源自客户端条件以来未修改'],
      ['C', '页面一定没有任何内容差异'],
      ['D', '客户端必须重新登录'],
    ],
    answer: 'B',
    explanation: '304 是条件请求的未修改响应；验证器仍可能缺失、错误或粒度不足。',
    tags: ['304 语义'],
  },
  {
    type: 'multiple',
    question: '条件请求可使用的请求头包括？',
    options: [
      ['A', 'If-None-Match'],
      ['B', 'If-Modified-Since'],
      ['C', 'Retry-After'],
      ['D', 'Set-Cookie'],
    ],
    answer: ['A', 'B'],
    explanation: 'If-None-Match 对应 ETag，If-Modified-Since 对应 Last-Modified；后两者不是条件验证头。',
    tags: ['条件头'],
  },
  {
    type: 'judge',
    question: '收到 304 后，客户端可以完全不比较内容哈希与版本。',
    answer: false,
    explanation: '304 只能作为优化和服务器声明，关键数据仍需哈希、版本与质量校验。',
    tags: ['验证器风险'],
  },
  {
    type: 'fill',
    question:
      '首次响应保存 ETag 与 Last-Modified；下次分别发送 ___ 和 ___ 头，304 时复用缓存记录。',
    blanks: [['If-None-Match'], ['If-Modified-Since']],
    explanation: '两个条件头分别对应两类验证器，不能把响应头名直接当作请求头。',
    tags: ['请求头'],
  },
  {
    type: 'code',
    question:
      '实现 `conditional_headers(etag=None, last_modified=None)`：值非空时返回对应条件头，否则不包含该键。',
    starterCode: `def conditional_headers(etag=None, last_modified=None):
    pass
`,
    expectedOutput: '条件请求头字典',
    tests: `assert conditional_headers()=={}
assert conditional_headers('"v1"')=={"If-None-Match":'"v1"'}
assert conditional_headers(None,"Wed, 05 Nov 2026 08:00:00 GMT")=={"If-Modified-Since":"Wed, 05 Nov 2026 08:00:00 GMT"}
`,
    answer: `def conditional_headers(etag=None, last_modified=None):
    headers = {}
    if etag:
        headers["If-None-Match"] = etag
    if last_modified:
        headers["If-Modified-Since"] = last_modified
    return headers
`,
    explanation: '条件头是纯数据构造；不要发送空字符串，也不要混用响应头名称。',
    tags: ['条件头函数'],
  },
  {
    type: 'code',
    question:
      '实现 `classify_conditional(status, previous_hash, current_hash, content_present=True)`：304 返回 unchanged；200 且 hash 相同返回 unchanged；200 且 hash 不同返回 changed；200 但 content_present 为 False 返回 extraction_failed；其他状态返回 error。',
    starterCode: `def classify_conditional(status, previous_hash, current_hash, content_present=True):
    pass
`,
    expectedOutput: '分类字符串',
    tests: `assert classify_conditional(304,"a",None)==\"unchanged\"
assert classify_conditional(200,"a","a")==\"unchanged\"
assert classify_conditional(200,"a","b")==\"changed\"
assert classify_conditional(200,"a",None,False)==\"extraction_failed\"
assert classify_conditional(503,None,None)==\"error\"
`,
    answer: `def classify_conditional(status, previous_hash, current_hash, content_present=True):
    if status == 304:
        return "unchanged"
    if status == 200:
        if not content_present:
            return "extraction_failed"
        if previous_hash == current_hash:
            return "unchanged"
        return "changed"
    return "error"
`,
    explanation: '304、200 与抽取失败分支必须分开，避免把错误空响应算成 unchanged。',
    tags: ['条件分类'],
  },
  {
    type: 'open',
    question:
      '一个网站有 ETag，但 30% 的 304 响应在后续全量检查中显示内容已变。请给出排查与防护方案。',
    referenceAnswer:
      '记录 ETag、URL、请求条件、内容哈希与版本；抽样回查 304 页面；检查 CDN/代理是否改写验证器、是否按用户或语言返回不同内容。防护上把 304 视为缓存命中而非事实，定期用 hash 校验，验证器异常时回退全量并告警。',
    rubric: [
      { point: '保存验证器与哈希证据', score: 2 },
      { point: '抽样回查机制', score: 2 },
      { point: '识别代理/个性化风险', score: 2 },
      { point: '回退与告警', score: 2 },
    ],
    explanation: '304 的可靠性需要被测量，而不是假定。',
    tags: ['验证器失败', '开放题'],
    keywords: ['ETag', 'hash', '抽样', '回退'],
  },
  {
    type: 'single',
    question: '验证器缺失时，合理的增量流程是？',
    options: [
      ['A', '永远跳过该页面'],
      ['B', '回退全量请求后比较内容哈希'],
      ['C', '随机生成 ETag'],
      ['D', '把 404 当成 304'],
    ],
    answer: 'B',
    explanation: '没有验证器不能优化，但仍可全量获取并计算 hash，保证状态正确。',
    tags: ['回退策略'],
  },
]);

const fingerprintExercises = makeExercises(chapterId, lesson2, 3, [
  {
    type: 'single',
    question: 'SHA-256 最适合识别哪种重复？',
    options: [
      ['A', '语义近似但文字不同'],
      ['B', '规范化输入完全相同的内容'],
      ['C', '业务主键相同但内容更新'],
      ['D', '所有 URL 的镜像关系'],
    ],
    answer: 'B',
    explanation: 'SHA-256 比较字节/规范化文本；语义近似和业务身份需要别的机制。',
    tags: ['SHA-256'],
  },
  {
    type: 'multiple',
    question: '计算可比较的文本指纹前，应明确哪些规范化规则？',
    options: [
      ['A', '空白与大小写'],
      ['B', '标点与 HTML 实体'],
      ['C', '版本号与阈值'],
      ['D', '浏览器窗口颜色'],
    ],
    answer: ['A', 'B', 'C'],
    explanation: '规范化与阈值版本会影响指纹比较；视觉颜色不参与文本指纹。',
    tags: ['规范化'],
  },
  {
    type: 'judge',
    question: 'SimHash 距离为 0 就证明两条记录一定是同一业务实体。',
    answer: false,
    explanation: '相同签名可能来自相同或高度模板化文本，仍需业务键与人工规则确认。',
    tags: ['近似重复'],
  },
  {
    type: 'fill',
    question:
      '两个 64 位签名的 Hamming 距离等于 `popcount(a ___ b)`，距离越小通常表示越 ___。',
    blanks: [['XOR', '异或', '^'], ['相似', '接近', '类似']],
    explanation: 'XOR 标出不同位，popcount 统计不同位数量。',
    tags: ['Hamming 距离'],
  },
  {
    type: 'code',
    question:
      '实现 `sha256_text(text)`：先合并空白并去除首尾，再用 UTF-8 计算 SHA-256 十六进制字符串。',
    starterCode: `def sha256_text(text):
    pass
`,
    expectedOutput: 'SHA-256 十六进制摘要',
    tests: `assert sha256_text("  合成  文本 ") == sha256_text("合成 文本")
assert len(sha256_text("a"))==64
assert sha256_text("a")!=sha256_text("b")
`,
    answer: `import hashlib

def sha256_text(text):
    normalized = " ".join(str(text).split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()
`,
    explanation: '规范化必须固定；同样的空白规则让不同运行产生相同摘要。',
    tags: ['SHA-256 实现'],
  },
  {
    type: 'code',
    question:
      '实现 `hamming_distance(a, b)`：返回两个非负整数的不同二进制位数；相等返回 0。',
    starterCode: `def hamming_distance(a, b):
    pass
`,
    expectedOutput: '不同位数',
    tests: `assert hamming_distance(0b1010,0b0011)==2
assert hamming_distance(7,7)==0
assert hamming_distance(0,15)==4
`,
    answer: `def hamming_distance(a, b):
    return (a ^ b).bit_count()
`,
    explanation: 'XOR 后 bit_count 直接统计不同位；注意输入应是非负整数。',
    tags: ['位运算'],
  },
  {
    type: 'open',
    question:
      '100 条记录中 12 条与既有记录 SimHash 距离 ≤3。请说明为什么不能直接删除 12 条，并给出复核流程。',
    referenceAnswer:
      'SimHash 只表示近似相似，可能把不同商品或模板页合并。应查看业务键、URL、标题、价格和来源；把候选放入 near_duplicate 队列，人工或规则复核；保留原记录与阈值版本，确认后再合并或建立关系。',
    rubric: [
      { point: '说明假阳性风险', score: 2 },
      { point: '依据业务键与字段', score: 2 },
      { point: '复核队列与证据', score: 2 },
      { point: '不直接删除', score: 2 },
    ],
    explanation: '近似距离是提示，不是删除授权。',
    tags: ['近似复核', '开放题'],
    keywords: ['SimHash', '假阳性', '业务键', '复核'],
  },
  {
    type: 'judge',
    question: '改变空白规范化规则后，历史 SHA-256 与当前 SHA-256 仍可直接精确比较。',
    answer: false,
    explanation: '规范化规则改变会改变输入字节，历史摘要不再与当前规则可比。',
    tags: ['指纹版本'],
  },
  {
    type: 'single',
    question: '阈值从 3 提高到 8，通常会发生什么？',
    options: [
      ['A', '召回增加，假阳性也可能增加'],
      ['B', '所有记录自动变成相同实体'],
      ['C', 'SHA-256 失效'],
      ['D', '请求次数一定下降 50%'],
    ],
    answer: 'A',
    explanation: '更宽松的阈值接纳更多相似项，但也会把更多不同项纳入复核。',
    tags: ['阈值权衡'],
  },
  {
    type: 'open',
    question:
      '请写出一个 64 位 SimHash 实现的四个关键步骤，并说明为什么结果要 mask 到 64 位。',
    referenceAnswer:
      '规范化文本；切分 shingle 特征；对每个特征 hash 后逐位投票；按票数生成签名。mask 到 2^64-1 保证签名固定 64 位，避免 Python 无界整数或负值影响 Hamming 距离。',
    rubric: [
      { point: '四个步骤完整', score: 2 },
      { point: '特征 hash 与投票', score: 2 },
      { point: '固定 64 位', score: 2 },
      { point: '连接距离计算', score: 2 },
    ],
    explanation: '讲清位向量和固定宽度，才能避免把 SimHash 当黑盒。',
    tags: ['SimHash 原理', '开放题'],
    keywords: ['shingle', 'vote', 'mask', '64'],
  },
]);

const recrawlExercises = makeExercises(chapterId, lesson3, 3, [
  {
    type: 'single',
    question: '页面返回 410 通常应记录为？',
    options: [
      ['A', 'unchanged'],
      ['B', 'gone / tombstone'],
      ['C', 'cache_hit'],
      ['D', 'near_duplicate'],
    ],
    answer: 'B',
    explanation: '410 明确表示资源已消失，适合记录 tombstone；仍应保留证据与版本。',
    tags: ['删除状态'],
  },
  {
    type: 'multiple',
    question: '重抓优先级可能包含哪些因素？',
    options: [
      ['A', '业务重要度'],
      ['B', '历史变化率'],
      ['C', '距上次抓取时间'],
      ['D', '浏览器主题色'],
    ],
    answer: ['A', 'B', 'C'],
    explanation: '重要度、变化率、新鲜度和成本构成预算依据；主题色无业务关系。',
    tags: ['重抓公式'],
  },
  {
    type: 'judge',
    question: '解析不到标题时，应立即把页面标记为 410 gone。',
    answer: false,
    explanation: '解析失败可能是结构变化或选择器错误，不能当成删除；应先重试/诊断。',
    tags: ['失败分类'],
  },
  {
    type: 'fill',
    question:
      '版本表通常以 entity_key + ___ 唯一，保存观察时间、内容摘要与 ___ 版本；删除可写 ___。',
    blanks: [['version', '版本号'], ['extractor', '抽取器', '抽取'], ['tombstone', '墓碑', '删除标记']],
    explanation: '版本唯一约束保证幂等，抽取器版本区分规则变化，tombstone 保存删除状态。',
    tags: ['版本表'],
  },
  {
    type: 'code',
    question:
      '实现 `recrawl_priority(importance, change_rate, gap_days, cost)`：返回 importance × change_rate × gap_days / cost；cost ≤0 时抛出 ValueError。',
    starterCode: `def recrawl_priority(importance, change_rate, gap_days, cost):
    pass
`,
    expectedOutput: '优先级数值',
    tests: `assert recrawl_priority(5,0.2,5,1)==5.0
assert recrawl_priority(1,0,10,1)==0
try:
    recrawl_priority(1,0.1,1,0)
except ValueError:
    pass
else:
    raise AssertionError("cost 应为正")
`,
    answer: `def recrawl_priority(importance, change_rate, gap_days, cost):
    if cost <= 0:
        raise ValueError("cost must be positive")
    return importance * change_rate * gap_days / cost
`,
    explanation: '公式本身不是真理，但必须固定单位与除零边界，才能在同一预算中比较。',
    tags: ['优先级实现'],
  },
  {
    type: 'code',
    question:
      '实现 `classify_recrawl(status, previous_hash, current_hash, content_present=True)`：500/502/503/504→retry_pending；410→gone；404→suspect_deleted；无内容→extraction_failed；200 同 hash→unchanged；200 不同 hash→changed；其他→error。',
    starterCode: `def classify_recrawl(status, previous_hash, current_hash, content_present=True):
    pass
`,
    expectedOutput: '重抓状态',
    tests: `assert classify_recrawl(503,None,None)=="retry_pending"
assert classify_recrawl(410,None,None)=="gone"
assert classify_recrawl(404,None,None)=="suspect_deleted"
assert classify_recrawl(200,"a","a")=="unchanged"
assert classify_recrawl(200,"a","b")=="changed"
assert classify_recrawl(200,"a",None,False)=="extraction_failed"
`,
    answer: `def classify_recrawl(status, previous_hash, current_hash, content_present=True):
    if status in {500, 502, 503, 504}:
        return "retry_pending"
    if status == 410:
        return "gone"
    if status == 404:
        return "suspect_deleted"
    if not content_present:
        return "extraction_failed"
    if status == 200 and previous_hash == current_hash:
        return "unchanged"
    if status == 200:
        return "changed"
    return "error"
`,
    explanation: '删除、失败与解析失败必须分开；相同 hash 只能代表内容摘要相同。',
    tags: ['状态分类'],
  },
  {
    type: 'open',
    question:
      'T2 有 60 unchanged、20 changed、5 new、2 deleted、1 invalid、12 暂时失败。请解释哪些数字不能合并为“删除”，并给出一个复核动作。',
    referenceAnswer:
      '只有明确删除状态（如 410 或经复核的 404）才能进入 tombstone；12 个暂时失败和 1 个 invalid 不能算删除，5 个 new 也不是删除。对 404 做延迟复核，对 5xx 按退避重试，对 invalid 重新抽取或标记质量失败。',
    rubric: [
      { point: '区分失败与删除', score: 2 },
      { point: '说明 404 复核', score: 2 },
      { point: '处理 5xx 与 invalid', score: 2 },
      { point: '报告状态不混用', score: 2 },
    ],
    explanation: '状态报告必须让失败、删除和新增各自可追踪。',
    tags: ['删除审计', '开放题'],
    keywords: ['tombstone', '404', '5xx', 'invalid'],
  },
  {
    type: 'judge',
    question: '页面从 tombstone 状态恢复为 200 时，应删除所有旧历史并只保留新正文。',
    answer: false,
    explanation: '应新增 restored 版本并保留删除窗口，否则无法审计消失与恢复。',
    tags: ['恢复状态'],
  },
  {
    type: 'single',
    question: '抽取器升级但页面正文未变时，最合适的报告方式是？',
    options: [
      ['A', 'content_changed'],
      ['B', 'extractor_upgrade / metadata_change'],
      ['C', 'gone'],
      ['D', 'robots_denied'],
    ],
    answer: 'B',
    explanation: '抽取器升级可能改变字段摘要，需保留版本并标明原因，不能冒充内容变化。',
    tags: ['抽取器版本'],
  },
  {
    type: 'open',
    question:
      '请写一个含版本与 tombstone 的最小 schema，并解释重复运行同一 T3 快照为什么不应增加版本数。',
    referenceAnswer:
      '例如 versions(entity_key, version, observed_at, status, content_hash, extractor_version, change_type, source_url)，唯一键(entity_key, version)。重跑同快照先查 hash 与 extractor_version；若相同则记录 already_seen/unchanged，不新增版本，或使用唯一约束做幂等插入。',
    rubric: [
      { point: '字段覆盖状态与证据', score: 2 },
      { point: '唯一约束幂等', score: 2 },
      { point: '识别同快照', score: 2 },
      { point: '保留 tombstone 语义', score: 2 },
    ],
    explanation: '版本幂等依赖业务键、版本和内容/规则证据共同判断。',
    tags: ['版本幂等', '开放题'],
    keywords: ['versions', 'UNIQUE', 'hash', 'extractor_version'],
  },
]);

export const webCrawlingChapters10: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: chapterId,
    title: '增量采集与变更检测',
    goal: '使用条件请求、内容指纹、版本记录和重抓调度，识别变化、近似重复与删除。',
    lessons: [conditionalLesson, fingerprintLesson, recrawlLesson],
    exercises: [...conditionalExercises, ...fingerprintExercises, ...recrawlExercises],
  },
];
