import type { Chapter } from '../../types';

/* ============================================================
 *  《数据工程与语料构建》A5
 *
 *  参考：Stanford CS336 L13-L14 (Data)、
 *       The Pile / C4 / RefinedWeb / FineWeb 数据论文、
 *       Lee et al. 2021 (Deduplicating Training Data)
 *
 *  c1 数据来源与采集    c2 清洗与质量过滤
 *  c3 去重             c4 配比、课程与合成数据
 * ============================================================ */

export const llmA5Chapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c1：数据来源与采集
   * ============================================================ */
  {
    id: 'llm-a5-c1',
    title: '数据来源与采集：模型的知识从哪来',
    goal: '了解主流预训练数据集的构成、各来源的价值与风险，理解为什么数据是模型能力的上限。',
    lessons: [
      {
        id: 'llm-a5-c1-l1',
        title: '预训练语料的六大来源',
        content: `
## 数据决定上限

一个被反复验证的结论：**同样的模型结构，数据质量差一点，效果可能差很多。**

Chinchilla 之后大家意识到：**高质量 token 比模型参数更稀缺**。
公开可用的高质量文本快被"挖完"了——这也是合成数据、多模态数据变热的根本原因。

## 六大来源及其定位

| 来源 | 规模 | 质量 | 核心价值 | 主要风险 |
| --- | --- | --- | --- | --- |
| **网页**（Common Crawl） | 数百 TB | 低→中 | 覆盖面最广、最新 | 垃圾多、需重度清洗 |
| **书籍** | 数十 GB | 高 | 长文本、逻辑连贯、叙事能力 | 版权风险 |
| **代码**（GitHub） | 数十 GB | 高 | **提升推理能力** | 许可证混杂、安全漏洞 |
| **学术论文**（arXiv） | 数十 GB | 高 | 专业知识、严谨表达 | 公式排版难处理 |
| **百科**（Wikipedia） | ~20 GB | 很高 | 事实准确、中立 | 规模小、风格单一 |
| **问答社区**（StackExchange/知乎） | 数 GB | 高 | 指令跟随、实用技巧 | 质量参差 |

## 代码数据为什么能提升推理

这是近年最重要的发现之一（Codex、Code Llama、以及后续多篇论文）：

**加入代码数据能显著提升逻辑推理能力，即使目标是自然语言任务。**

**可能的原因**：
1. 代码有严格的**语法结构与层级依赖**，训练模型学习长程结构关系；
2. 代码执行有**确定性结果**，提供了"因果推理"的监督信号；
3. 代码中的**注释与自然语言**形成对照，强化语义对齐；
4. 代码天然要求**精确性**（差一个字符就报错），减少模糊表达。

**实测**：PaLM、LLaMA 系列都在配比中加入 4%~10% 的代码数据。

## LLaMA 的公开配比

| 来源 | 占比 |
| --- | --- |
| Common Crawl | 67% |
| C4 | 15% |
| GitHub | 4.5% |
| Wikipedia | 4.5% |
| Books | 4.5% |
| arXiv | 2.5% |
| StackExchange | 2.0% |

**观察**：网页占绝对主导（82%），但高质量来源（书籍/百科/论文/问答）
虽然只占 17.5%，对模型"说话质量"的影响远超比例。

## 中文语料的特殊性

构建中文模型时，来源需要额外考虑：

| 来源 | 说明 |
| --- | --- |
| 中文网页（Common Crawl 中文子集） | 量大但噪声高，需强过滤 |
| 中文维基/百度百科 | 质量高但规模有限 |
| 中文书籍（公版/授权） | 版权复杂，公版古籍可用 |
| 中文论文（CNKI/万方） | 专业性强，需授权 |
| 中文代码注释 | 相对稀缺 |
| 中文社区（知乎/CSDN） | 有干货也有大量水贴 |

**核心困难**：中文高质量语料规模远小于英文。
这也是中文模型普遍"知识面窄"的客观原因之一。

## 数据集的公开资源

| 数据集 | 规模 | 特点 |
| --- | --- | --- |
| **The Pile**（EleutherAI） | 825 GB | 22 个来源混合，学术研究常用 |
| **C4**（Google） | 750 GB | 清洗后的 Common Crawl |
| **RefinedWeb**（TII） | 600 GB | 更严格的过滤 + 去重 |
| **FineWeb**（HF） | 15 T token | 目前最完善的开放网页语料 |
| **RedPajama**（Together） | 1.2 T token | LLaMA 配比复现 |
| **WuDaoCorpora**（中文） | 200 GB | 中文大规模语料 |

**FineWeb 的意义**：HuggingFace 公开了完整的清洗流水线代码与消融实验，
是学习数据工程最好的实战材料。

<MoleculeGraphDemo />
`,
        tips: [
          {
            kind: 'interview',
            text: '「代码数据为什么能提升推理」：严格语法结构训练长程依赖、确定性执行提供因果信号、注释与代码形成语义对照、精确性要求减少模糊。',
          },
          {
            kind: 'leak',
            text: 'LLaMA 配比：Common Crawl 67% + C4 15% + 其余 18%。高质量来源占比小但对输出质量影响大。',
          },
          {
            kind: 'note',
            text: '中文高质量语料规模远小于英文，这是中文模型知识面窄的客观原因。数据工程对中文模型尤为重要。',
          },
        ],
        demos: [
          {
            title: '数据集规模与训练量估算',
            lang: 'python',
            code: `def tokens_from_gb(size_gb, bytes_per_token=4):
    """粗略估算 GB 文本对应的 token 数。英文约 4 字节/token。"""
    return size_gb * 1024**3 / bytes_per_token

datasets = [
    ("The Pile", 825, "英文学术混合"),
    ("C4", 750, "清洗后网页"),
    ("RefinedWeb", 600, "严格过滤网页"),
    ("FineWeb", 44000, "15T token（已 tokenize）"),
    ("RedPajama", 3500, "LLaMA 配比复现"),
]

print("数据集        | 大小(GB) | 估算 token | 说明")
print("-" * 62)
for name, gb, desc in datasets:
    t = tokens_from_gb(gb)
    print(f"{name:13} | {gb:8} | {t/1e9:8.1f}B | {desc}")

print()
print("=== 训练一个 7B 模型需要多少数据？===")
n_params = 7e9
for ratio, label in [(20, "Chinchilla 最优"), (100, "适度过训"), (300, "LLaMA 风格")]:
    need = n_params * ratio
    print(f"{label:14}: {need/1e12:.2f}T token")
    print(f"                 -> 约需 {need*4/1024**3:.0f} GB 文本（4 字节/token）")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-a5-c1-e1',
        type: 'single',
        difficulty: 2,
        question: '为什么预训练语料中要加入代码数据？',
        options: [
          { value: 'A', text: '为了让模型会写代码' },
          { value: 'B', text: '代码的严格语法结构与确定性执行能显著提升模型的逻辑推理能力' },
          { value: 'C', text: '因为代码数据便宜' },
          { value: 'D', text: '为了减少数据量' },
        ],
        answer: 'B',
        explanation: 'Codex、Code Llama 等研究发现，代码数据能提升推理能力，即使目标是自然语言任务。原因是严格语法训练长程依赖、确定性执行提供因果信号、精确性要求减少模糊。',
        tags: ['数据来源'],
      },
      {
        id: 'llm-a5-c1-e2',
        type: 'judge',
        difficulty: 2,
        question: '预训练数据中高质量来源（书籍、百科、论文）占比很小，所以对模型影响不大。',
        answer: false,
        explanation: 'LLaMA 中这些高质量来源只占 17.5%，但对模型"说话质量"的影响远超比例。数据价值不是线性的，质量高的数据单位贡献更大。',
        tags: ['数据配比'],
      },
      {
        id: 'llm-a5-c1-e3',
        type: 'multiple',
        difficulty: 3,
        question: '下列哪些是预训练语料的主要来源？（多选）',
        options: [
          { value: 'A', text: 'Common Crawl 网页' },
          { value: 'B', text: 'GitHub 代码' },
          { value: 'C', text: '书籍与学术论文' },
          { value: 'D', text: '用户的私人聊天记录' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: 'D 是侵犯隐私且违法的。主流来源是网页、代码、书籍、论文、百科、问答社区。',
        tags: ['数据来源'],
      },
      {
        id: 'llm-a5-c1-e4',
        type: 'fill',
        difficulty: 3,
        question: '目前最完善的开放网页预训练语料是 HuggingFace 发布的 ___，约 15T token，且公开了完整清洗流水线。',
        blanks: [['FineWeb', 'fineweb']],
        explanation: 'FineWeb 公开了数据处理代码与消融实验，是学习数据工程最好的实战材料。它的前身是 RefinedWeb。',
        tags: ['数据集'],
      },
      {
        id: 'llm-a5-c1-e5',
        type: 'code',
        difficulty: 2,
        question: '估算训练所需数据量：`tokens_needed(n_params_b, ratio)`，返回 token 数（浮点）。\n\n同时实现 `gb_needed(n_params_b, ratio, bytes_per_token=4)` 返回 GB 数（保留 1 位小数）。',
        starterCode: `def tokens_needed(n_params_b, ratio):
    return ___

def gb_needed(n_params_b, ratio, bytes_per_token=4):
    t = tokens_needed(n_params_b, ratio)
    return round(___, 1)


tokens_needed(7, 20)
`,
        setupCode: '',
        expectedOutput: '1.4e11 token，约 522 GB',
        tests: `t = tokens_needed(7, 20)
assert abs(t - 1.4e11) < 1e6, f"7B×20 应为 1.4e11，实际 {t}"
g = gb_needed(7, 20)
assert abs(g - 521.5) < 1.0, f"应约 521.5 GB，实际 {g}"
# 比例越大需要越多
assert tokens_needed(7, 100) > t
assert gb_needed(7, 100) > g
# 1B 模型
assert abs(tokens_needed(1, 20) - 2e10) < 1e6
`,
        answer: `def tokens_needed(n_params_b, ratio):
    return n_params_b * 1e9 * ratio

def gb_needed(n_params_b, ratio, bytes_per_token=4):
    t = tokens_needed(n_params_b, ratio)
    return round(t * bytes_per_token / 1024**3, 1)


tokens_needed(7, 20)`,
        explanation:
          '```python\nreturn n_params_b * 1e9 * ratio\n# 以及\nreturn round(t * bytes_per_token / 1024**3, 1)\n```\n\n7B × 20 = 1.4e11 token；按 4 字节/token 换算 = 1.4e11 × 4 / 1024³ ≈ **521.5 GB**。\n\n这个估算让你能判断"要准备多少原始文本"，是数据工程的第一步。',
        tags: ['编程', '数据估算'],
      },
      {
        id: 'llm-a5-c1-e6',
        type: 'judge',
        difficulty: 3,
        question: '中文高质量语料规模与英文相当，所以中文模型不需要特别的数据工程。',
        answer: false,
        explanation: '中文高质量语料规模远小于英文，这是中文模型知识面窄的客观原因。相反，中文模型更需要精细的数据工程（清洗、去重、配比）。',
        tags: ['中文语料'],
      },
      {
        id: 'llm-a5-c1-e7',
        type: 'open',
        difficulty: 4,
        question:
          '如果你要为中文大模型构建预训练语料，与英文相比会遇到哪些额外困难？请从数据规模、质量、来源结构、法律合规四个角度分析，并提出应对策略。',
        referenceAnswer: `**一、数据规模：高质量语料稀缺**

- 英文有 Common Crawl（数百 TB）、Books3、The Pile、arXiv 等大规模公开语料；
- 中文高质量语料（书籍、论文、百科）规模约为英文的 1/5 ~ 1/10；
- 中文网页中"有效信息密度"偏低（营销号、SEO 垃圾、重复转载多）。

**应对**：
- 扩大数据源（论坛、公众号、法律文书、政府公文等垂直领域）；
- 接受"质量优先于规模"，用更严格的过滤换取更高纯度；
- 考虑中英混合训练（英文数据提升通用能力，中文数据提升语言能力）。

**二、质量：中文清洗更难**

- 中文没有空格分词，无法直接用"平均词长"等启发式规则；
- 需处理繁简混杂、拼音夹杂、生僻字、全角/半角混用；
- 中文"标题党""软文"模式与英文不同，需要中文专用的质量分类器。

**应对**：
- 用中文 fastText / 小模型训练质量分类器（以维基、书籍、论文为正例）；
- 建立中文特有的黑名单词表（营销词、模板话术）；
- 人工抽样校准过滤阈值。

**三、来源结构：缺少特定领域**

- 英文有丰富的 Q&A（StackExchange）、代码（GitHub 英文注释）、学术（arXiv）；
- 中文的技术问答、开源代码注释、学术论文开放度都较低。

**应对**：
- 翻译部分高质量英文语料（需注意版权与质量）；
- 与机构合作获取授权数据；
- 强化中文代码注释数据（GitHub 上中文注释项目）。

**四、法律合规：风险更高**

- 中文书籍、新闻、论坛内容的版权归属更复杂；
- 个人信息保护法（PIPL）对个人信息处理有严格要求；
- 部分内容涉及敏感信息，需要合规审查。

**应对**：
- 优先使用开放许可内容（公版古籍、CC 协议内容）；
- 严格 PII 脱敏（姓名、电话、身份证、地址）；
- 建立内容审核流水线，保留数据来源追溯记录。

**五、一个务实策略**

**中英混合 + 高质量优先**：
- 基础能力（推理、世界知识）主要靠英文数据；
- 中文能力（语言流畅度、文化理解）靠中文数据；
- 比例建议 1:1 ~ 1:2（中文:英文），视目标而定。

**关键认知**：中文模型的数据工程不是"把英文方案翻译一遍"，
而是要针对中文的语言特性与数据生态重新设计。`,
        rubric: [
          { point: '指出中文高质量语料规模远小于英文', score: 2 },
          { point: '说明中文清洗的特殊困难（无空格分词、繁简、标题党）', score: 2 },
          { point: '指出来源结构差异（Q&A/代码/论文）', score: 2 },
          { point: '提到版权与 PIPL 合规风险', score: 2 },
          { point: '给出中英混合等务实策略', score: 2 },
        ],
        keywords: ['语料规模', '质量分类器', '繁简混杂', 'PIPL', '中英混合'],
        explanation: '这是中文数据工程的现实问题。能指出"不是把英文方案翻译一遍"这个判断，说明理解了中文场景的特殊性。',
        tags: ['中文语料', '综合分析'],
      },
    ],
  },
];
