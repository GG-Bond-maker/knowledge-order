import type { Chapter } from '../../types';

/* A5 数据工程 · c2 清洗与质量过滤、c3 去重、c4 配比与合成数据 */

export const llmA5Chapters2: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'llm-a5-c2',
    title: '清洗与质量过滤：把垃圾挡在门外',
    goal: '掌握从 HTML 到可用文本的完整清洗流程，学会用启发式规则与质量分类器两个层次过滤低质内容。',
    lessons: [
      {
        id: 'llm-a5-c2-l1',
        title: '七道清洗流水线',
        content: `
## 从原始 HTML 到训练语料

原始网页是 HTML（含脚本、样式、导航、广告），必须逐层提纯：

\`\`\`
WARC 原始抓取
  ↓ ① 正文提取（trafilatura / readability）
纯文本 + 标题
  ↓ ② 规范化（去多余空白、统一编码、全角半角）
规整文本
  ↓ ③ 语言识别（fastText lid.176）
目标语言文本
  ↓ ④ 启发式质量过滤（长度/符号比/重复行）
初筛文本
  ↓ ⑤ 模型质量打分（分类器）
高质量文本
  ↓ ⑥ 有害内容 + PII 过滤
安全文本
  ↓ ⑦ 去重（见 c3）
最终语料
\`\`\`

## ① 正文提取

**为什么难**：网页结构千差万别，正文可能藏在任何标签里。

**主流工具**：
- **trafilatura**（推荐）：专为语料构建设计，准确率高；
- **readability-lxml**：浏览器「阅读模式」的算法；
- **jusText**：基于文本密度；
- **BeautifulSoup + 手写规则**：可控但维护成本高。

**评估方法**：人工标注 200 个网页的正文区间，计算提取的精确率/召回率。

## ② 规范化

| 处理 | 例子 |
| --- | --- |
| 统一编码 | 全部转 UTF-8 |
| 去控制字符 | 保留换行缩进，删其余 |
| 折叠空白 | 连续空格 → 单个 |
| Unicode 规范化 | NFC 或 NFKC |
| 去重复标点 | 「！！！！」→「！」 |

**注意**：规范化要克制。过度处理会破坏代码块、数学公式、表格结构。

## ④ 启发式质量过滤

不需要模型就能过滤大量垃圾：

| 规则 | 典型阈值 | 过滤什么 |
| --- | --- | --- |
| 文档长度 | < 200 或 > 100000 字符 | 碎片、滚屏页 |
| 平均词长 | > 10 字符 | 乱码、无空格拼接 |
| 符号占比 | > 30% | 代码混淆、表格残骸 |
| 数字占比 | > 30% | 数据表、日志 |
| 重复行比例 | > 30% | 模板页、爬虫陷阱 |
| 停用词比例 | < 15% | 非自然语言 |
| 重复 n-gram 比例 | > 20% | 关键词堆砌（SEO 垃圾） |

**中文特有规则**：
- 中文字符占比 < 50%（中英混排页面可能误伤）；
- 简体/繁体混杂比例异常；
- 拼音、火星文、颜文字占比高；
- 连续重复短句（「点击进入」「查看更多」）。

## ⑤ 质量分类器

启发式规则只能过滤「明显垃圾」，剩下的需要模型判断。

**做法**：把质量判断转化为**二分类问题**。

    # 正例：维基百科、书籍、学术论文（人工确认高质量）
    # 负例：随机网页、被规则标记的低质内容
    # 模型：fastText（快）或小型 Transformer（准）
    # 阈值：保留打分前 60%~70%

**FineWeb 的经验**（值得细读）：
- 用 fastText 训练分类器，正例是 Wikipedia，负例是随机网页；
- 但发现**过度使用会让模型「更像维基」**，损失多样性；
- 最终采用**分桶策略**：按分数分 5 个桶，各桶采样不同比例。

## ⑥ 有害内容与 PII

**PII（个人身份信息）识别**：

| 类型 | 方法 |
| --- | --- |
| 邮箱 | 正则匹配邮箱模式 |
| 手机号（中国） | 1[3-9] 开头的 11 位数字 |
| 身份证 | 17 位数字 + 校验位 |
| 银行卡 | 16~19 位数字 |
| 地址 | NER 模型（人名/地名） |

**处理方式**：替换为占位符（EMAIL、PHONE 等标记），而非直接删除整段。

**有害内容**：色情、暴力、仇恨言论用分类器过滤。
**注意**：过度过滤会让模型「变笨」（缺乏对世界的完整认知），需权衡。

## 清洗的评估：怎么知道做得好不好

| 层次 | 指标 |
| --- | --- |
| 各步骤保留率 | 每步过滤掉多少%（异常值要排查） |
| 人工抽检 | 200 篇，评估通顺度、信息密度、有害性 |
| 小模型验证 | 1B 模型 + 10B token，看 PPL 与下游任务 |
| 多样性 | 主题聚类分布，避免过度集中 |

<DocPipeline />
`,
        tips: [
          {
            kind: 'interview',
            text: '「预训练数据清洗流程」：正文提取 → 规范化 → 语言识别 → 启发式过滤 → 质量分类器 → 有害/PII 过滤 → 去重。',
          },
          {
            kind: 'leak',
            text: '过度过滤会让模型「变笨」。FineWeb 用分桶采样（按质量分 5 桶各取不同比例）而非一刀切，兼顾质量与多样性。',
          },
          {
            kind: 'pitfall',
            text: '规范化要克制：过度处理会破坏代码块、数学公式与表格结构，这些恰恰是高价值内容。',
          },
        ],
        demos: [
          {
            title: '启发式质量过滤器（含中文规则）',
            lang: 'python',
            code: `import re

def chinese_ratio(text):
    cn = sum(1 for c in text if chr(0x4E00) <= c <= chr(0x9FFF))
    return cn / max(len(text), 1)

def quality_filter(text):
    """返回 (是否保留, 原因列表)"""
    reasons = []
    n = len(text)
    if n < 200:
        return False, [f"过短({n})"]
    if n > 100000:
        return False, ["过长"]

    words = re.findall(r"\\w+", text)
    if not words:
        return False, ["无有效词"]
    avg_len = sum(len(w) for w in words) / len(words)
    if avg_len > 10:
        reasons.append(f"平均词长{avg_len:.1f}")

    symbols = sum(1 for c in text if not c.isalnum() and not c.isspace())
    if symbols / n > 0.3:
        reasons.append(f"符号{symbols/n:.0%}")

    lines = [l.strip() for l in text.split("\\n") if l.strip()]
    if len(lines) > 3 and len(set(lines)) / len(lines) < 0.7:
        reasons.append("重复行多")

    if chinese_ratio(text) < 0.5:
        reasons.append(f"中文占比{chinese_ratio(text):.0%}")

    junk = ["lorem ipsum", "点击进入", "查看更多", "请开启JavaScript"]
    hit = [j for j in junk if j in text]
    if hit:
        reasons.append(f"模板词{hit}")

    return len(reasons) == 0, reasons

samples = [
    ("正常中文", "数据分析的完整流程包括理解业务问题、收集数据、清洗数据、分析建模与结论输出。" * 4),
    ("过短", "你好"),
    ("模板页", "点击进入 查看更多 " * 30),
    ("符号堆砌", "|||||=====*****>>>>>" * 20),
]
for name, text in samples:
    keep, reasons = quality_filter(text)
    print(f"{name:8} {'保留' if keep else '过滤'}  {reasons if reasons else ''}")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-a5-c2-e1',
        type: 'single',
        difficulty: 2,
        question: '预训练数据清洗中，「正文提取」这一步的作用是？',
        options: [
          { value: 'A', text: '把 HTML 中的脚本、导航、广告去掉，只保留主要内容' },
          { value: 'B', text: '把中文翻译成英文' },
          { value: 'C', text: '压缩文件大小' },
          { value: 'D', text: '给文档打标签' },
        ],
        answer: 'A',
        explanation: '原始网页是 HTML，含大量非正文内容。正文提取（如 trafilatura）从中分离出真正的文章内容，是清洗的第一步。',
        tags: ['清洗'],
      },
      {
        id: 'llm-a5-c2-e2',
        type: 'judge',
        difficulty: 2,
        question: '数据清洗越彻底越好，过滤掉越多低质内容模型效果越好。',
        answer: false,
        explanation: '过度过滤会让模型「变笨」——缺乏对世界的完整认知、表达多样性下降。FineWeb 的分桶采样就是为兼顾质量与多样性。',
        tags: ['过度过滤'],
      },
      {
        id: 'llm-a5-c2-e3',
        type: 'multiple',
        difficulty: 3,
        question: '下列哪些属于启发式质量过滤规则？（多选）',
        options: [
          { value: 'A', text: '文档长度过短或过长' },
          { value: 'B', text: '符号占比过高' },
          { value: 'C', text: '重复行比例过高' },
          { value: 'D', text: '用 GPT-4 逐篇打分' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: 'D 成本过高且不可控，实际用轻量模型（fastText）或小 Transformer。启发式规则的价值是「零成本过滤明显垃圾」。',
        tags: ['质量过滤'],
      },
      {
        id: 'llm-a5-c2-e4',
        type: 'fill',
        difficulty: 3,
        question: '处理 PII 时，通常把识别到的手机号、邮箱等替换为 ___（如 EMAIL 标记），而不是删除整段。',
        blanks: [['占位符', 'placeholder', '占位', '标记']],
        explanation: '替换为占位符能保留文本结构与上下文，只去掉敏感信息。直接删除整段会损失过多有效内容。',
        tags: ['PII'],
      },
      {
        id: 'llm-a5-c2-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现中文占比计算：`chinese_ratio(text)`，返回中文字符（U+4E00~U+9FFF）占全部字符的比例，保留 4 位小数。空串返回 0。',
        starterCode: `def chinese_ratio(text):
    # 统计中文字符：chr(0x4E00) <= c <= chr(0x9FFF)
    # 返回 cn / len(text)，保留 4 位小数
    pass

chinese_ratio("数据分析 data analysis")
`,
        setupCode: '',
        expectedOutput: '约 0.2222（18 字符中 4 个中文）',
        tests: `assert abs(chinese_ratio("数据分析") - 1.0) < 1e-9, "全中文应为 1"
assert chinese_ratio("abcd") == 0.0, "全英文应为 0"
assert abs(chinese_ratio("中文ab") - 0.5) < 1e-9, f"2/4 应为 0.5，实际 {chinese_ratio('中文ab')}"
assert chinese_ratio("") == 0.0, "空串应返回 0"
assert abs(chinese_ratio("数据分析 data analysis") - 0.2222) < 1e-3
`,
        answer: `def chinese_ratio(text):
    if not text:
        return 0.0
    lo, hi = chr(0x4E00), chr(0x9FFF)
    cn = sum(1 for c in text if lo <= c <= hi)
    return round(cn / len(text), 4)


chinese_ratio("数据分析 data analysis")`,
        explanation:
          '```python\ncn = sum(1 for c in text if "\\u4e00" <= c <= "\\u9fff")\nreturn round(cn / len(text), 4)\n```\n\n中文基本汉字区间是 U+4E00~U+9FFF。注意保护空串（除零）。\n\n这是中文清洗特有的规则——英文清洗没有这一步。',
        tags: ['编程', '中文处理'],
      },
      {
        id: 'llm-a5-c2-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现重复行比例：`dup_line_ratio(text)`，返回重复行数占总行数的比例（忽略空行），保留 4 位小数。',
        starterCode: `def dup_line_ratio(text):
    lines = [l.strip() for l in text.split("\\n") if l.strip()]
    ___

dup_line_ratio("a\\nb\\na\\nc")
`,
        setupCode: '',
        expectedOutput: '0.25',
        tests: `assert abs(dup_line_ratio("a\\nb\\na\\nc") - 0.25) < 1e-9, f"应为 0.25，实际 {dup_line_ratio('a b a c')}"
assert dup_line_ratio("a\\nb\\nc") == 0.0, "无重复应为 0"
assert abs(dup_line_ratio("x\\nx\\nx") - 0.6667) < 1e-3, "3 行中 2 行重复"
assert dup_line_ratio("") == 0.0, "空文本应为 0"
`,
        answer: `def dup_line_ratio(text):
    lines = [l.strip() for l in text.split("\\n") if l.strip()]
    if not lines:
        return 0.0
    dup = len(lines) - len(set(lines))
    return round(dup / len(lines), 4)


dup_line_ratio("a\\nb\\na\\nc")`,
        explanation:
          '```python\nlines = [l.strip() for l in text.split("\\n") if l.strip()]\nif not lines:\n    return 0.0\ndup = len(lines) - len(set(lines))\nreturn round(dup / len(lines), 4)\n```\n\n4 行 [a,b,a,c]，去重后 3 个唯一行，重复 1 行，比例 1/4 = 0.25。\n\n重复行比例高通常意味着模板页或爬虫陷阱。',
        tags: ['编程', '质量规则'],
      },
      {
        id: 'llm-a5-c2-e7',
        type: 'open',
        difficulty: 4,
        question:
          '请设计一个完整的中文网页数据清洗方案，说明每一步的方法、阈值选择依据，以及如何验证清洗效果。',
        referenceAnswer: `**一、完整流水线**

1. **正文提取**：trafilatura（中文准确率较好）+ 人工抽检校准；
2. **规范化**：UTF-8 编码；去控制字符；折叠空白；统一全角半角（中文场景建议保留全角标点）；
3. **语言识别**：fastText lid.176，保留中文占比 > 0.8 的文档；
4. **启发式过滤**：
   - 长度 200~100000 字符；
   - 中文字符占比 > 50%；
   - 符号占比 < 30%；
   - 重复行比例 < 30%；
   - 黑名单模板词命中则过滤。
5. **质量分类器**：以中文维基、公版书籍、论文为正例，随机网页为负例，训练 fastText；保留 Top 65%；
6. **PII 脱敏**：正则匹配手机号/身份证/邮箱/银行卡，NER 识别姓名地址，替换为占位符；
7. **有害内容过滤**：中文色情/暴力/仇恨分类器；
8. **去重**：URL 级 → 文档级 MD5 → 段落级 → MinHash 模糊去重。

**二、阈值选择依据**

- **不靠直觉，靠实验**：每个阈值都用小模型验证（1B 模型 + 10B token 对比）；
- **参考公开工作**：C4、RefinedWeb、FineWeb、ChineseWebText 的公开阈值；
- **保留率监控**：每一步保留率若偏离预期（如质量过滤保留 < 30%），说明阈值过严。

**三、验证方法**

| 层次 | 方法 |
| --- | --- |
| 统计 | 各步保留率、长度分布、主题分布 |
| 人工 | 抽检 200 篇，双人标注一致性 |
| 模型 | 1B 小模型对比训练，看 PPL 与 C-Eval 分数 |
| 泄漏 | 训练集 vs 评测集 n-gram 重叠 < 0.1% |
| 多样性 | 主题聚类熵，避免过度集中 |

**四、关键经验**

1. **质量比数量重要**，但要防过度过滤；
2. **分桶采样**优于一刀切（FineWeb 经验）；
3. **中文特有规则**必须加（繁简、火星文、标题党）；
4. **保留可追溯性**：记录每条数据的来源与处理历史，便于事后排查。`,
        rubric: [
          { point: '完整七步流水线', score: 3 },
          { point: '说明阈值选择依据（实验 + 参考公开工作）', score: 2 },
          { point: '给出多层次验证方法', score: 3 },
          { point: '提到防过度过滤与分桶采样', score: 2 },
        ],
        keywords: ['trafilatura', 'fastText', '质量分类器', 'PII', 'MinHash', '分桶采样'],
        explanation:
          '这是数据清洗的综合设计题。强调「阈值靠实验而非直觉」和「多层次验证」是工程成熟度的体现。',
        tags: ['数据清洗', '系统设计'],
      },
    ],
  },

  {
    id: 'llm-a5-c3',
    title: '去重：性价比最高的数据优化',
    goal: '掌握精确去重、段落级去重与 MinHash/LSH 模糊去重的原理与实现，理解去重为什么比堆数据更有效。',
    lessons: [
      {
        id: 'llm-a5-c3-l1',
        title: '三层去重与 MinHash 原理',
        content: `
## 为什么去重是最划算的操作

**Lee et al. (2021) 的实测结论**：在 C4 上做模糊去重，
去掉约 25% 重复内容后，训练出的模型**效果等同于使用 4 倍数据量**。

**重复数据的三大危害**：
1. 模型在重复内容上**过度训练**，导致记忆与复述（甚至直接背诵训练数据）；
2. 浪费算力——重复 token 不提供新信息；
3. 增加隐私泄露与版权风险。

## 三层去重

| 层级 | 方法 | 抓什么 | 成本 |
| --- | --- | --- | --- |
| **URL 级** | URL 规范化 + 去重 | 同一页面多次抓取 | 极低 |
| **文档级精确** | 整篇哈希（MD5/SHA） | 完全相同的文档 | 低 |
| **段落级** | 按段落哈希 | 跨文档重复段落（转载、引用） | 中 |
| **模糊（近似）** | MinHash + LSH | 「改了几个字」的转载 | 高 |

**顺序很重要**：从便宜到贵，先精确后模糊——大部分重复能被便宜的方法干掉。

## MinHash 的核心

**问题**：如何快速判断两篇文档是否「近似重复」？

**Jaccard 相似度**：

    J(A, B) = |A ∩ B| / |A ∪ B|

其中 A、B 是文档的 **shingle 集合**（连续 k 个词组成的片段，k 通常 5 或 9）。

**直接算 Jaccard 太慢**（要比较所有 shingle）。MinHash 用**随机哈希**近似：

    对集合 S 的每个元素用哈希函数 h 求值，取最小值：
    minhash(S) = min{ h(x) : x ∈ S }

**核心定理**：

    P(minhash(A) == minhash(B)) = J(A, B)

**为什么成立**：A∪B 中哈希值最小的那个元素，
如果它同时属于 A 和 B（即在交集中），则两个集合的 minhash 相同。
而这个概率正好是 |A∩B|/|A∪B| = J(A,B)。

**所以**：用 k 个不同哈希函数得到 k 维签名，
**相同位置的比例**就是 Jaccard 的估计值。

    # 签名 A: [3, 7, 1, 9, 2]
    # 签名 B: [3, 7, 5, 9, 8]
    # 相同 3 个位置 → 估计 J ≈ 0.6

## LSH：把 O(n²) 降到近似 O(n)

上亿文档两两比较不可能。**LSH** 把 k 维签名分成 b 个 band（每 band r 个值，k = b×r）：

    band1: [3, 7]   → 哈希成一个桶 key
    band2: [1, 9]   → 另一个桶 key

**规则**：只要**任意一个 band 完全相同**，两篇文档就是候选重复对。

**参数调节**：
- b 越大 → 越容易撞上 → 召回率高、误判多；
- r 越大 → 越难完全相同 → 精确率高、召不回。

**常用配置**：k=128~256，b=32~64，相似度阈值 0.8。

## 去重必须做的一件事：与评测集去重

**这是最容易被忽略、后果最严重的问题**：

如果评测集（MMLU、C-Eval、GSM8K）的内容出现在训练集中，
模型会「背答案」，指标虚高，且**极难事后发现**。

**做法**：
- 用 n-gram 重叠检测（训练集与评测集之间）；
- 重叠率应小于 0.1%；
- 对数学/代码类评测，用更严格的子串匹配。

<CompressionComplexityDemo />
`,
        tips: [
          {
            kind: 'interview',
            text: '「MinHash 为什么有效」：P(minhash(A)==minhash(B)) = J(A,B)。用 k 个哈希得签名，相同位置比例即为 Jaccard 的无偏估计。',
          },
          {
            kind: 'leak',
            text: '模糊去重实测：去掉 25% 重复内容，效果等同于 4 倍数据量。这是数据工程 ROI 最高的操作。',
          },
          {
            kind: 'pitfall',
            text: '训练集与评测集必须去重，否则指标虚高。用 n-gram 重叠检测，重叠率应小于 0.1%。',
          },
        ],
        demos: [
          {
            title: 'MinHash 完整实现与验证',
            lang: 'python',
            code: `import hashlib

def shingles(text, k=5):
    w = text.split()
    if len(w) < k:
        return set([" ".join(w)])
    return set(" ".join(w[i:i+k]) for i in range(len(w)-k+1))

def minhash(s, n=64):
    sig = []
    for seed in range(n):
        m = min(int(hashlib.md5(f"{seed}:{x}".encode()).hexdigest()[:8], 16) for x in s)
        sig.append(m)
    return sig

def jaccard(a, b):
    return len(a & b) / len(a | b) if (a | b) else 0.0

def sig_sim(sa, sb):
    return sum(1 for x, y in zip(sa, sb) if x == y) / len(sa)

a = "今天 天气 很 好 我们 一起 去 公园 散步 吧"
b = "今天 天气 不错 我们 一起 去 公园 走走 吧"
c = "机器学习 模型 训练 需要 大量 数据"

sa, sb, sc = shingles(a), shingles(b), shingles(c)
ma, mb, mc = minhash(sa), minhash(sb), minhash(sc)

print("        真实Jaccard  MinHash估计")
print(f"A vs B  {jaccard(sa,sb):11.3f}  {sig_sim(ma,mb):11.3f}")
print(f"A vs C  {jaccard(sa,sc):11.3f}  {sig_sim(ma,mc):11.3f}")
print()
print("估计值接近真实值，但只需比较 64 个整数")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-a5-c3-e1',
        type: 'single',
        difficulty: 2,
        question: 'MinHash 能估计 Jaccard 相似度的数学基础是？',
        options: [
          { value: 'A', text: '大数定律' },
          { value: 'B', text: '两个集合 minhash 相同的概率等于它们的 Jaccard 相似度' },
          { value: 'C', text: '中心极限定理' },
          { value: 'D', text: '矩阵分解' },
        ],
        answer: 'B',
        explanation: '这是 MinHash 的核心定理。用 k 个哈希函数得 k 维签名，相同位置比例即为 Jaccard 的无偏估计。',
        tags: ['MinHash'],
      },
      {
        id: 'llm-a5-c3-e2',
        type: 'judge',
        difficulty: 2,
        question: '训练集与评测集之间不需要去重。',
        answer: false,
        explanation: '必须去重！评测集内容出现在训练集中会导致模型「背答案」、指标虚高，且极难事后发现。用 n-gram 重叠检测，重叠率应小于 0.1%。',
        tags: ['数据泄漏'],
      },
      {
        id: 'llm-a5-c3-e3',
        type: 'multiple',
        difficulty: 3,
        question: '去重应按什么顺序执行？（多选，选出所有应包含的层级）',
        options: [
          { value: 'A', text: 'URL 级去重' },
          { value: 'B', text: '文档级精确哈希' },
          { value: 'C', text: 'MinHash 模糊去重' },
          { value: 'D', text: '对每篇文档人工审核' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: 'D 不可行（成本太高）。正确顺序是 URL → 文档精确 → 段落 → 模糊，先便宜后贵。',
        tags: ['去重流程'],
      },
      {
        id: 'llm-a5-c3-e4',
        type: 'fill',
        difficulty: 3,
        question: '把文档切成连续 k 个词的片段用于相似度比较，这些片段叫 ___。',
        blanks: [['shingle', 'Shingle', '瓦片', '词片']],
        explanation:
          'Shingle 是 n-gram 的另一种叫法，k 通常取 5 或 9。近似重复文档的 shingle 集合 Jaccard 通常大于 0.8。',
        tags: ['shingle'],
      },
      {
        id: 'llm-a5-c3-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现 `jaccard(a, b)`，计算两个集合的 Jaccard 相似度，保留 4 位小数，空集返回 0.0。',
        starterCode: `def jaccard(a, b):
    ___

jaccard({1,2,3}, {2,3,4})
`,
        setupCode: '',
        expectedOutput: '0.5',
        tests: `assert abs(jaccard({1,2,3},{2,3,4}) - 0.5) < 1e-9
assert jaccard({1,2},{1,2}) == 1.0
assert jaccard({1,2},{3,4}) == 0.0
assert jaccard(set(), set()) == 0.0
assert abs(jaccard({1,2,3,4},{3,4,5,6}) - 0.3333) < 1e-4
`,
        answer: `def jaccard(a, b):
    u = a | b
    if not u:
        return 0.0
    return round(len(a & b) / len(u), 4)


jaccard({1,2,3}, {2,3,4})`,
        explanation:
          '```python\nu = a | b\nif not u:\n    return 0.0\nreturn round(len(a & b) / len(u), 4)\n```\n\nJaccard 衡量两个集合的重合程度，取值 [0,1]，1 表示完全相同。这是 MinHash 要估计的目标量。',
        tags: ['编程', 'Jaccard'],
      },
      {
        id: 'llm-a5-c3-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现 shingle 切分：`make_shingles(text, k=5)`，按空格切词，返回所有连续 k 词片段的集合；词数不足 k 时返回单元素集合。',
        starterCode: `def make_shingles(text, k=5):
    w = text.split()
    ___

make_shingles("a b c d e f g", 3)
`,
        setupCode: '',
        expectedOutput: '5 个 shingle',
        tests: `assert make_shingles("a b c d e f g", 3) == {"a b c","b c d","c d e","d e f","e f g"}
assert make_shingles("a b c", 5) == {"a b c"}, "不足 k 时返回整体"
assert len(make_shingles("a b c d e", 2)) == 4
assert len(make_shingles("a b c d", 1)) == 4
`,
        answer: `def make_shingles(text, k=5):
    w = text.split()
    if len(w) < k:
        return set([" ".join(w)])
    return set(" ".join(w[i:i+k]) for i in range(len(w)-k+1))


make_shingles("a b c d e f g", 3)`,
        explanation:
          '```python\nw = text.split()\nif len(w) < k:\n    return set([" ".join(w)])\nreturn set(" ".join(w[i:i+k]) for i in range(len(w)-k+1))\n```\n\nn 个词产生 n-k+1 个 shingle。用 set 去重符合集合语义。',
        tags: ['编程', 'shingle'],
      },
      {
        id: 'llm-a5-c3-e7',
        type: 'code',
        difficulty: 4,
        question:
          '实现 LSH 分桶：`lsh_candidates(signatures, bands=8, rows=8)`。\n\n- signatures 是 dict：文档 id → 签名列表\n- 每个签名按 bands 切分，每段作为一个桶 key\n- 返回同一桶内两两组合的文档对（去重、每对保证 a<b、按字典序排序）',
        starterCode: `def lsh_candidates(signatures, bands=8, rows=8):
    buckets = {}
    ___
    pairs = set()
    ___
    return sorted(pairs)


sigs = {"A": [1]*64, "B": [1]*64, "C": [9]*64}
lsh_candidates(sigs)
`,
        setupCode: '',
        expectedOutput: "[('A', 'B')]",
        tests: `sigs = {"A": [1]*64, "B": [1]*64, "C": [9]*64}
out = lsh_candidates(sigs)
assert out == [("A","B")], f"应只有 A-B 一对，实际 {out}"
sigs2 = {"A": [1]*64, "B": [1]*64, "C": [1]*64}
out2 = lsh_candidates(sigs2)
assert len(out2) == 3, f"应 3 对，实际 {len(out2)}"
assert out2 == [("A","B"),("A","C"),("B","C")]
assert lsh_candidates({"A":[1]*64,"B":[2]*64,"C":[3]*64}) == []
assert len(set(out2)) == len(out2)
`,
        answer: `def lsh_candidates(signatures, bands=8, rows=8):
    buckets = {}
    for doc_id, sig in signatures.items():
        for b in range(bands):
            key = (b, tuple(sig[b*rows:(b+1)*rows]))
            buckets.setdefault(key, []).append(doc_id)
    pairs = set()
    for docs in buckets.values():
        if len(docs) < 2:
            continue
        for i in range(len(docs)):
            for j in range(i+1, len(docs)):
                pairs.add(tuple(sorted([docs[i], docs[j]])))
    return sorted(pairs)


sigs = {"A": [1]*64, "B": [1]*64, "C": [9]*64}
lsh_candidates(sigs)`,
        explanation:
          '```python\nfor doc_id, sig in signatures.items():\n    for b in range(bands):\n        key = (b, tuple(sig[b*rows:(b+1)*rows]))\n        buckets.setdefault(key, []).append(doc_id)\n\npairs = set()\nfor docs in buckets.values():\n    if len(docs) < 2: continue\n    for i in range(len(docs)):\n        for j in range(i+1, len(docs)):\n            pairs.add(tuple(sorted([docs[i], docs[j]])))\nreturn sorted(pairs)\n```\n\n**核心**：任一 band 相同即进入同一桶。用 set 去重避免同一对在多个 band 中被重复收集。',
        tags: ['编程', 'LSH'],
      },
      {
        id: 'llm-a5-c3-e8',
        type: 'judge',
        difficulty: 3,
        question: 'LSH 中 band 数量 b 越多，召回率越高但误判也越多。',
        answer: true,
        explanation:
          'b 越大，两篇文档在某个 band 上碰撞的概率越高，因此召回率高；但也会把不相似的文档判为候选（误判多）。需要调节 b 与 r 平衡。',
        tags: ['LSH'],
      },
    ],
  },
];
