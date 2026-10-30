import type { Chapter } from '../../types';
import { llmA1Extra } from './llm-a1-extra';
import { llmA1C13Chapters } from './llm-a1-c13';
import { llmA1C14Chapters } from './llm-a1-c14';
import { llmA1C15Chapters } from './llm-a1-c15';
import { llmA1C16Chapters } from './llm-a1-c16';
import { llmA1Extra2 } from './llm-a1-extra2';

/** 《从零手写大模型》章节 */
export const llm_a1Chapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'llm-a1-c1',
    title: '大模型全景与从零手写路线',
    goal: '理解大模型的一切输入都是整数 token，掌握分词算法、词向量原理与 embedding 查表，并能估算 token 数量对成本和上下文占用的影响。',
    lessons: [
      {
        id: 'llm-a1-c1-l1',
        title: '从文本到 token：分词的必要性与粒度权衡',
        content: `
### 学习目标

学完本节，你应该能够：
1. 解释模型为什么「看不见」文字：所有计算是矩阵运算，输入必须是整数 ID；
2. 对比字符级/词级/子词级三种分词粒度的词表、序列长度与 OOV 权衡，并复述 BPE 的合并过程；
3. 区分 byte-level BPE、WordPiece、SentencePiece 三条路线的关键差异（字节兜底/似然合并/无预分词）。

### 前置知识

- 本课程第一节，无课内前置；
- 知道矩阵乘法的输入必须是数字即可。

### 问题背景

模型的一切能力都始于「读」——但 Transformer 的全部计算是矩阵乘法与逐元素运算，输入必须是数字。因此所有世界知识都要先被压缩成一条整数 ID 序列：怎么切（分词粒度）、怎么编号（词表）、切不出的怎么办（OOV）、一段文本值多少钱（token 成本），这四个工程决定全部发生在模型第一层之前。中文在英文系 tokenizer 上可能多花一倍 token，上下文、账单、延迟全部翻倍——分词不是预处理细节，而是贯穿成本与能力的第一性约束。

### 直觉理解

把文本想成一堵乐高墙，tokenizer 是一本「拆砖手册」：常见整砖（高频整词）保留完整，稀有形状拆成小砖（子词）再拼装。小砖库（词表）加拆装规则可以砌出任何墙——再怪的新句子也能拼出来，OOV 问题就此消失。编号（ID）只是砖的货号；embedding 查表是按货号取出这块砖的「材质卡」（稠密向量）；而中文砖常被切成两三块，同样的墙要用更多货号——这就是 token 成本差异的来源。

### 核心概念与原理详解

## 为什么模型"看不见"文字

Transformer 的所有计算都是矩阵乘法与逐元素运算，输入必须是**数字**。因此任何语言模型的第一步都是把字符串切成离散单元（token），再把每个单元映射成一个整数 ID。这个过程叫**分词（tokenization）**，执行它的组件叫 tokenizer。

分词粒度的选择会影响整个系统的设计：

| 粒度 | 词表大小 | 序列长度 | 优点 | 缺点 |
| --- | --- | --- | --- | --- |
| 字符级 | 几万 | 极长 | 词表极小、无 OOV | 序列太长，注意力开销爆炸 |
| 词级 | 几十万到几百万 | 短 | 语义单位自然 | 词表巨大、罕见词与拼写变体全成 OOV |
| 子词级（主流） | 3 万 ~ 25 万 | 中等 | 兼顾覆盖率与长度，能拆解未见过的词 | 需要训练合并规则，跨语言行为不一致 |

子词分词的核心思想来自 Sennrich 等人在 2016 年提出的 **BPE（Byte Pair Encoding）**：高频整词保留为一个 token，低频词被拆成更小的片段。这样既控制了词表规模，又保证任何字符串都能被表示出来——OOV 问题基本消失。

## 主流 tokenizer 一览

- **BPE**：从字符（或字节）出发，反复合并出现频次最高的相邻符号对。GPT 系列（tiktoken）、LLaMA 系列、RoBERTa 使用它。LLaMA 采用 **byte-level BPE**：先在 UTF-8 字节层做映射，把 256 个字节映射成可打印字符，因此任意 Unicode 文本都不会 OOV，而中文通常需要 1~3 个 token 一个字。
- **WordPiece**：BERT 使用。与 BPE 一样自底向上合并，但选择合并的标准不是频次，而是**合并后语言模型似然增益**最大；词内续接片段用前缀双井号标记（例如 "##acter"）。这种续接标记让 WordPiece 能准确还原原始空格。
- **SentencePiece / Unigram**：把空格也当作普通符号，直接在原始句子上训练，不依赖预分词（pre-tokenization）。T5、ALBERT、mT5 使用。Unigram 语言模型从大词表出发，**自顶向下**删除贡献最小的 token，因此同一个多语言词表下处理中文、日文更稳。

## 分词流程：规范化 → 预分词 → 子词切分 → ID 映射

以 Hugging Face 的 AutoTokenizer 为例：

\`\`\`python
from transformers import AutoTokenizer

tok = AutoTokenizer.from_pretrained("Qwen/Qwen2.5-7B-Instruct")
ids = tok.encode("大模型的分词", add_special_tokens=False)
print(ids)                                   # 类似 [101581, 101640, 43676]
print(tok.convert_ids_to_tokens(ids))        # ['大', '模型', '的', '分词']
print(tok.decode(ids))                       # 大模型的分词
\`\`\`

四个阶段各有陷阱：

1. **规范化（normalization）**：NFC/NFKC、小写化、去重空白。**大小写信息一旦丢失就不可逆**，"US"（美国）会变成 "us"（我们）。
2. **预分词**：按空白/标点切出"词"。GPT-2 的正则对数字很敏感，会把 "1234" 与 "123456" 切成不同片段。
3. **子词切分**：按合并表做贪心或最长匹配。
4. **特殊 token**：\`<bos>\`、\`<eos>\`、\`<|im_start|>\` 等。这些 ID 通常在词表尾部，且**必须在训练时预留**，否则微调时新增 token 会让 embedding 矩阵行数变化，旧权重无法直接兼容。

## 中英文 token 效率的巨大差异

实测经验值（不同 tokenizer 差异很大）：

| 文本 | 字符数 | GPT-4o（o200k） | LLaMA-3 | 中文优化 tokenizer |
| --- | --- | --- | --- | --- |
| 英文 1000 词 | 约 4500 字符 | 约 1300 token | 约 1400 token | 约 1500 token |
| 中文 1000 字 | 1000 字符 | 约 600~700 token | 约 1200~1500 token | 约 550~700 token |

**同样的中文内容，在英文主导的 tokenizer 上可能消耗 2 倍 token**。这不是学术问题：上下文窗口被浪费、计费翻倍、推理变慢，甚至同一段提示在不同模型上表现不同，只因为截断位置不同。

## 工程实践建议

- 做 RAG 或长文档处理时，**按 token 而不是按字符切分**，用目标模型的 tokenizer 计算长度；
- 存储侧记录 token 数，便于做预算（budget）控制；
- 升级模型等于升级 tokenizer，**旧的 token 数统计必须重新计算**。

<TokenFlow />

### 机制图解

<Diagram type="token" />

上图是 tokenizer 的实际切分效果：同一个句子被切成若干 token，每个 token 对应一个整数 ID。注意中文与英文、常见词与生僻片段的切分粒度完全不同——这就是后面「token 成本预算」的根源。

## 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
from collections import Counter

# ---- 1. 迷你 BPE 训练：反复合并语料中最高频的相邻符号对 ----
corpus = ["low", "lower", "lowest", "newer", "newest", "wide", "wider", "widest"]
words = [list(w) + ["</w>"] for w in corpus]
pairs = Counter()
for w in words:
    for a, b in zip(w, w[1:]):
        pairs[(a, b)] += 1
merges = []
for _ in range(5):
    (a, b), n = pairs.most_common(1)[0]
    merges.append(a + b)
    print(f"merge #{len(merges)}: {a!r}+{b!r} -> {a+b!r} (频次 {n})")
    nxt, pairs = [], Counter()
    for w in words:
        i, w2 = 0, []
        while i < len(w):
            if i < len(w) - 1 and w[i] == a and w[i + 1] == b:
                w2.append(a + b); i += 2
            else:
                w2.append(w[i]); i += 1
        nxt.append(w2)
        for x, y in zip(w2, w2[1:]):
            pairs[(x, y)] += 1
    words, nxt = nxt, None

# ---- 2. 编码：按合并表贪心还原 ----
def encode(word):
    toks = list(word) + ["</w>"]
    for m in merges:
        i = 0
        while i < len(toks) - 1:
            if toks[i] + toks[i + 1] == m:
                toks[i:i + 2] = [m]
            else:
                i += 1
    return toks

for w in ("lowest", "newest"):
    print("encode", w, "->", encode(w))

# ---- 3. 词表与向量：ID 查表得到稠密向量 ----
V, d = 12, 4
rng = np.random.default_rng(0)
E = rng.normal(0, 1, (V, d))
ids = np.array([3, 0, 7])
print("embedding 查表形状:", E[ids].shape, "= one-hot 乘法:", np.allclose(E[ids], np.eye(V)[ids] @ E))

# ---- 4. 中英文 token 成本（经验值）与预算 ----
en_tok, zh_tok_en, zh_tok_zh = 1300, 1300, 620   # 1000 英文词 / 1000 中文字
print(f"英文 1000 词 ≈ {en_tok} tok；中文 1000 字@英文系 ≈ {zh_tok_en} tok，@中文优化 ≈ {zh_tok_zh} tok")
print(f"同内容中文成本差 ≈ {zh_tok_en / zh_tok_zh:.1f}x；4k 上下文 ≈ {int(4000 * 1000 / zh_tok_en)} 中文字（英文系）"[:80])
price = 0.002 / 1000  # $/tok 示例价
print(f"成本模型: 100 万 tok 训练语料 ≈ \${1_000_000 * price:.2f}")\`\`\`

预期输出（实测）：BPE 合并序列：'w'+'e'→'we'(频次4)、'l'+'o'→'lo'(3)、'r'+'</w>'→'r</w>'(3)、's'+'t'→'st'(3)、'st'+'</w>'→'st</w>'(3)；encode lowest → ['lo','we','st</w>']，newest → ['n','e','we','st</w>']（子词既压缩又无 OOV）；embedding 查表形状 (3,4) 且与 one-hot 乘法 allclose=True；英文 1000 词≈1300 tok，中文 1000 字@英文系≈1300 tok、@中文优化≈620 tok（成本差 2.1x）；4k 上下文≈3076 中文字（英文系）；100 万 tok 语料按 $0.002/1k ≈ $2.00。

**常见错误**：编码时逐符号扫描却不做最长匹配，把 'lowest' 切成 l-o-w-e-s-t 而不是 lowest；按字符数而不是 token 数估上下文，中文场景预算直接差一倍以上；微调时新增特殊 token 却不改 embedding 矩阵行数，旧权重加载后 ID 错位全乱。

### 常见误区

1. **token 等于单词**——主流是子词：'unbelievable' 会被拆成 un/believ/able 几块，token 是词表里的条目不是语言学词；\\n2. **词表越大越好**——词表大 embedding 参数与 softmax 计算暴涨，低频 token 学不充分，主流在 3 万～25 万权衡；\\n3. **分词只影响预处理**——它决定序列长度（算力）、OOV（能力边界）、多语言成本（账单），是模型设计的一部分。

### 知识关联

- **向前**：ID 序列进入 c3 嵌入层查表变成向量，本章的「货号」在 c3-l1 变成「材质卡」；
- **向后**：c10 加载权重必须用配套 tokenizer，c11 生成循环的输出 ID 也要 decode 回文本；
- **平行**：llm-a3 的 tokenizer 工程与 RAG 按 token 切分实践，是本章成本观的落地。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 桥梁 | 文本 → 分词 → 整数 ID → embedding 向量，模型只看见数字 |
| 主流算法 | byte-level BPE（GPT/LLaMA）、WordPiece（BERT）、SentencePiece/Unigram（T5） |
| 粒度权衡 | 字符级无 OOV 但序列长，词级短但 OOV 多，子词级兼顾 |
| 中英文成本 | 同内容中文在英文系 tokenizer 上可达 2 倍 token |
| 预算纪律 | 按 token 计量、按目标模型 tokenizer 计算、换模型重算 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Sennrich et al., 2016, arXiv:1508.07909 与 Hugging Face Tokenizers 文档相应章节）
`,
        tips: [
          {
            kind: 'pitfall',
            text: '猜 token 数请用目标模型的 tokenizer 实测。经验公式"中文 1 字约 1.5 token、英文 1 词约 1.3 token"只适合粗估，某些 tokenizer 下中文一个字可能接近 3 个 token。',
          },
          {
            kind: 'interview',
            text: '高频面试题：BPE 与 WordPiece 的区别。要点：两者都是自底向上合并字符；BPE 按相邻对频次合并，WordPiece 按合并后语言模型似然增益合并，并用连续井号标记词内续接片段。',
          },
          {
            kind: 'note',
            text: 'BPE 是**训练阶段**学合并规则、**推理阶段**只查表。所以 tokenizer 的合并表是模型权重的一部分，必须随模型一起版本化发布。',
          },
          {
            kind: 'performance',
            text: '长度截断应发生在 token 层：先 encode 再截断。按字符截断可能切断多字节字符，导致截断后的 token 序列与预期完全不同。',
          },
        ],
        demos: [
          {
            title: '手写 BPE：从字符出发反复合并最高频相邻对',
            lang: 'python',
            code: `from collections import Counter

def train_bpe(words, num_merges):
    """words 是已经按空格切好的语料；返回合并规则与最终分词结果。"""
    merges = []
    tokenized = [list(w) for w in words]
    for _ in range(num_merges):
        pairs = Counter()
        for syms in tokenized:
            for i in range(len(syms) - 1):
                pairs[(syms[i], syms[i + 1])] += 1
        if not pairs:
            break
        pair, freq = max(pairs.items(), key=lambda kv: (kv[1], kv[0]))
        merges.append((pair, freq))
        new = pair[0] + pair[1]
        merged = []
        for syms in tokenized:
            out, i = [], 0
            while i < len(syms):
                if i < len(syms) - 1 and (syms[i], syms[i + 1]) == pair:
                    out.append(new)
                    i += 2
                else:
                    out.append(syms[i])
                    i += 1
            merged.append(out)
        tokenized = merged
    return merges, tokenized

corpus = ["low", "lower", "newest", "widest", "lowest", "newer"]
merges, tokenized = train_bpe(corpus, 8)
for step, (pair, freq) in enumerate(merges, 1):
    print(f"第 {step} 步: 合并 {pair} (频次 {freq}) -> {pair[0] + pair[1]}")
print()
for w, syms in zip(corpus, tokenized):
    print(f"{w:8s} -> {syms}")`,
          },
          {
            title: '按 token 做长度估算与成本预算（不依赖第三方 tokenizer）',
            lang: 'python',
            code: `import re

CJK = chr(0x4E00) + "-" + chr(0x9FFF)   # 汉字区间 4E00-9FFF

def rough_tokens(text):
    """极简模拟 tokenizer：英文按词、中文按字、标点各计一个。"""
    cjk = len(re.findall("[" + CJK + "]", text))
    words = len(re.findall("[A-Za-z]+|[0-9]+", text))
    punct = len(re.findall("[^A-Za-z0-9_" + CJK + "]", text))
    return cjk + words + punct

docs = [
    "Attention is all you need. 注意力就是你所需要的一切。",
    "Retrieval-Augmented Generation (RAG) 把检索结果拼进提示词。",
]

PRICE_PER_MTOK = 2.5   # 美元 / 百万 token，仅作示意
total = 0
for d in docs:
    t = rough_tokens(d)
    total += t
    print(f"{t:4d} token | {d[:24]}...")
print()
print(f"合计 {total} token，成本约 {total / 1_000_000 * PRICE_PER_MTOK:.6f} 美元")
print("生产环境请用目标模型的 tokenizer 精确计数：tok.encode(text)")`,
          },
        ],
      },
      {
        id: 'llm-a1-c1-l2',
        title: 'Embedding：从 one-hot 到稠密词向量',
        content: `
### 学习目标

学完本节，你应该能够：
1. 说明 one-hot 表示的两大缺陷（维数=词表大小、任意两个词向量正交即无相似度）；
2. 对比 Word2Vec（用上下文预测学表示）与 GloVe（直接分解共现矩阵）的建模范式；
3. 区分静态词向量与上下文向量两种 embedding 在工程中的不同用途。

### 前置知识

- 「从文本到 token」（l1）：token ID 的概念；
- 向量内积/余弦相似度衡量「相似」的直觉。

### 问题背景

模型的一切能力都始于「读」——但 Transformer 的全部计算是矩阵乘法与逐元素运算，输入必须是数字。因此所有世界知识都要先被压缩成一条整数 ID 序列：怎么切（分词粒度）、怎么编号（词表）、切不出的怎么办（OOV）、一段文本值多少钱（token 成本），这四个工程决定全部发生在模型第一层之前。中文在英文系 tokenizer 上可能多花一倍 token，上下文、账单、延迟全部翻倍——分词不是预处理细节，而是贯穿成本与能力的第一性约束。

### 直觉理解

把文本想成一堵乐高墙，tokenizer 是一本「拆砖手册」：常见整砖（高频整词）保留完整，稀有形状拆成小砖（子词）再拼装。小砖库（词表）加拆装规则可以砌出任何墙——再怪的新句子也能拼出来，OOV 问题就此消失。编号（ID）只是砖的货号；embedding 查表是按货号取出这块砖的「材质卡」（稠密向量）；而中文砖常被切成两三块，同样的墙要用更多货号——这就是 token 成本差异的来源。

### 核心概念与原理详解

## 从 one-hot 到稠密向量

最朴素的表示是 one-hot：词表大小 V，每个词占一维。它有两个致命问题：

1. **维度等于词表大小**，十万词就是十万维稀疏向量，存储与计算都浪费；
2. **任意两个词的余弦相似度都是 0**，模型无法从表示本身知道 "cat" 和 "kitten" 有关。

分布式假设（distributional hypothesis，Firth 1957）：**一个词的含义由它经常出现的上下文决定**。把这一假设数学化，就得到词向量：用低维（通常 128~4096 维）稠密向量表示词，语义相近的词在空间中距离较近。

## Word2Vec：用预测上下文来学表示

Mikolov 等（2013）提出两种训练方式：

- **CBOW**：用窗口内上下文词的平均向量预测中心词；
- **Skip-gram**：用中心词预测窗口内每个上下文词（小语料上更稳，更常用）。

以 Skip-gram + 负采样为例，单个样本的损失函数为

L = - log sigma(u_o · v_c) - sum_k log sigma(- u_k · v_c)

其中 v_c 是中心词输入向量，u_o 是真实上下文词的输出向量，u_k 是从噪声分布中采样的负样本，sigma 是 sigmoid。可以证明，在最优解处中心词向量与上下文词向量的内积满足

**v_c · u_w 约等于 PMI(c, w) 减去 log K**（K 为负样本数）

这就是词向量"能够编码语义相似度"的理论依据：PMI 高的词组合，其向量内积自然更大。

## GloVe：直接分解共现矩阵

GloVe（Pennington 2014）跳过预测任务，直接对全局共现矩阵 X 拟合：

J = sum_{i,j} f(X_ij) · (w_i · w_j + b_i + b_j - log X_ij)^2

其中 f(x) = min(1, (x / x_max)^0.75) 用于抑制高频词的噪声。相比 Word2Vec 只看局部窗口，GloVe 利用了全局统计量。

## 从静态词向量到上下文向量

Word2Vec / GloVe 的致命局限：**一个词只有一个向量**。多义词 bank（河岸 / 银行）无法区分。Transformer 输出的上下文向量则是每个位置一个向量，由注意力动态汇聚上下文。现代大模型的流程是：

token ID → Embedding 查表（取第 id 行）→ 加位置信息 → L 层 Transformer → 上下文向量

## 两种 embedding 在工程中的不同用途

| 用途 | 用什么 | 典型维度 | 是否上下文相关 |
| --- | --- | --- | --- |
| 模型输入层 | 可训练的 embedding 矩阵 | 4096~8192 | 否 |
| 语义检索（RAG） | 专门训练的文本 embedding 模型（bge、e5 等） | 384~3072 | 是（整段文本一个向量） |

检索用的 embedding 必须做**归一化 + 余弦相似度**，且**建库与查询必须使用同一个模型、同一版本**。

## 权重共享

GPT-2 起，输出层（LM head）与输入 embedding 共享权重矩阵：E 的形状为 [V, d]，logits = h 乘以 E 的转置。这样能省下 V×d 参数（V=15 万、d=4096 时约 6 亿参数），同时让输入和输出处在同一语义空间。

### 机制图解

<Diagram type="tensor" name="one-hot-to-embedding" steps="one-hot 稀疏向量|维度 = 词表大小|Embedding 查表|稠密向量 d 维|语义相近则距离相近" />

上图对比 one-hot 与稠密 embedding：one-hot 的维度等于词表大小（上万维、只有一个 1），而 embedding 只有几百维且每一维都有信息。查表操作本质上就是「用 ID 去矩阵里取一行」。

## 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
from collections import Counter

# ---- 1. 迷你 BPE 训练：反复合并语料中最高频的相邻符号对 ----
corpus = ["low", "lower", "lowest", "newer", "newest", "wide", "wider", "widest"]
words = [list(w) + ["</w>"] for w in corpus]
pairs = Counter()
for w in words:
    for a, b in zip(w, w[1:]):
        pairs[(a, b)] += 1
merges = []
for _ in range(5):
    (a, b), n = pairs.most_common(1)[0]
    merges.append(a + b)
    print(f"merge #{len(merges)}: {a!r}+{b!r} -> {a+b!r} (频次 {n})")
    nxt, pairs = [], Counter()
    for w in words:
        i, w2 = 0, []
        while i < len(w):
            if i < len(w) - 1 and w[i] == a and w[i + 1] == b:
                w2.append(a + b); i += 2
            else:
                w2.append(w[i]); i += 1
        nxt.append(w2)
        for x, y in zip(w2, w2[1:]):
            pairs[(x, y)] += 1
    words, nxt = nxt, None

# ---- 2. 编码：按合并表贪心还原 ----
def encode(word):
    toks = list(word) + ["</w>"]
    for m in merges:
        i = 0
        while i < len(toks) - 1:
            if toks[i] + toks[i + 1] == m:
                toks[i:i + 2] = [m]
            else:
                i += 1
    return toks

for w in ("lowest", "newest"):
    print("encode", w, "->", encode(w))

# ---- 3. 词表与向量：ID 查表得到稠密向量 ----
V, d = 12, 4
rng = np.random.default_rng(0)
E = rng.normal(0, 1, (V, d))
ids = np.array([3, 0, 7])
print("embedding 查表形状:", E[ids].shape, "= one-hot 乘法:", np.allclose(E[ids], np.eye(V)[ids] @ E))

# ---- 4. 中英文 token 成本（经验值）与预算 ----
en_tok, zh_tok_en, zh_tok_zh = 1300, 1300, 620   # 1000 英文词 / 1000 中文字
print(f"英文 1000 词 ≈ {en_tok} tok；中文 1000 字@英文系 ≈ {zh_tok_en} tok，@中文优化 ≈ {zh_tok_zh} tok")
print(f"同内容中文成本差 ≈ {zh_tok_en / zh_tok_zh:.1f}x；4k 上下文 ≈ {int(4000 * 1000 / zh_tok_en)} 中文字（英文系）"[:80])
price = 0.002 / 1000  # $/tok 示例价
print(f"成本模型: 100 万 tok 训练语料 ≈ \${1_000_000 * price:.2f}")\`\`\`

预期输出（实测）：BPE 合并序列：'w'+'e'→'we'(频次4)、'l'+'o'→'lo'(3)、'r'+'</w>'→'r</w>'(3)、's'+'t'→'st'(3)、'st'+'</w>'→'st</w>'(3)；encode lowest → ['lo','we','st</w>']，newest → ['n','e','we','st</w>']（子词既压缩又无 OOV）；embedding 查表形状 (3,4) 且与 one-hot 乘法 allclose=True；英文 1000 词≈1300 tok，中文 1000 字@英文系≈1300 tok、@中文优化≈620 tok（成本差 2.1x）；4k 上下文≈3076 中文字（英文系）；100 万 tok 语料按 $0.002/1k ≈ $2.00。

**常见错误**：编码时逐符号扫描却不做最长匹配，把 'lowest' 切成 l-o-w-e-s-t 而不是 lowest；按字符数而不是 token 数估上下文，中文场景预算直接差一倍以上；微调时新增特殊 token 却不改 embedding 矩阵行数，旧权重加载后 ID 错位全乱。

### 常见误区

1. **token 等于单词**——主流是子词：'unbelievable' 会被拆成 un/believ/able 几块，token 是词表里的条目不是语言学词；\\n2. **词表越大越好**——词表大 embedding 参数与 softmax 计算暴涨，低频 token 学不充分，主流在 3 万～25 万权衡；\\n3. **分词只影响预处理**——它决定序列长度（算力）、OOV（能力边界）、多语言成本（账单），是模型设计的一部分。

### 知识关联

- **向前**：ID 序列进入 c3 嵌入层查表变成向量，本章的「货号」在 c3-l1 变成「材质卡」；
- **向后**：c10 加载权重必须用配套 tokenizer，c11 生成循环的输出 ID 也要 decode 回文本；
- **平行**：llm-a3 的 tokenizer 工程与 RAG 按 token 切分实践，是本章成本观的落地。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 桥梁 | 文本 → 分词 → 整数 ID → embedding 向量，模型只看见数字 |
| 主流算法 | byte-level BPE（GPT/LLaMA）、WordPiece（BERT）、SentencePiece/Unigram（T5） |
| 粒度权衡 | 字符级无 OOV 但序列长，词级短但 OOV 多，子词级兼顾 |
| 中英文成本 | 同内容中文在英文系 tokenizer 上可达 2 倍 token |
| 预算纪律 | 按 token 计量、按目标模型 tokenizer 计算、换模型重算 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Sennrich et al., 2016, arXiv:1508.07909 与 Hugging Face Tokenizers 文档相应章节）
`,
        tips: [
          {
            kind: 'leak',
            text: '检索前把向量归一化（L2 范数为 1），余弦相似度就等价于点积；后者在向量库里能走 SIMD 加速，快很多。',
          },
          {
            kind: 'pitfall',
            text: '换 embedding 模型时必须**全量重建索引**。向量空间不同，混用新旧向量会让相似度完全失去意义，而且这种 bug 通常不报错，只表现为"召回变得很怪"。',
          },
          {
            kind: 'interview',
            text: '常被追问"Word2Vec 为什么能学到语义"。答题线索：负采样目标的最优解满足向量内积与 PMI 成线性关系，而 PMI 度量共现强度，所以向量内积天然编码语义相似度。',
          },
          {
            kind: 'note',
            text: 'Word2Vec 有两个矩阵：输入矩阵与输出矩阵。推理时通常只保留输入矩阵；把两者相加或拼接有时效果更好，但没有统一结论。',
          },
        ],
        demos: [
          {
            title: '用共现矩阵 + PPMI + SVD 复现 Word2Vec 的核心思想',
            lang: 'python',
            code: `import numpy as np

raw = [
    "the king rules the kingdom",
    "the queen rules the kingdom",
    "the man is a king",
    "the woman is a queen",
    "a king wears a crown",
    "a queen wears a crown",
]
corpus = [s.split() for s in raw]

vocab = sorted({w for s in corpus for w in s})
stoi = {w: i for i, w in enumerate(vocab)}
V = len(vocab)

window = 2
C = np.zeros((V, V))
for s in corpus:
    ids = [stoi[w] for w in s]
    for i, ci in enumerate(ids):
        for j in range(max(0, i - window), min(len(ids), i + window + 1)):
            if j != i:
                C[ci, ids[j]] += 1
print("共现矩阵形状:", C.shape, " 非零元素:", int((C > 0).sum()))

total = C.sum()
P = C / total
Pw = P.sum(axis=1, keepdims=True)
Pc = P.sum(axis=0, keepdims=True)
pmi = np.log((P + 1e-12) / (Pw * Pc + 1e-12))
ppmi = np.clip(pmi, 0, None)

U, S, Vt = np.linalg.svd(ppmi, full_matrices=False)
emb = U[:, :3] * np.sqrt(S[:3])

def cos(a, b):
    return float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-12))

print()
print("与 king 最相近的词：")
for w in vocab:
    if w != "king":
        print(f"  {w:8s} cos = {cos(emb[stoi['king']], emb[stoi[w]]):+.3f}")

print()
print("类比任务 king - man + woman 的最近邻：")
q = emb[stoi["king"]] - emb[stoi["man"]] + emb[stoi["woman"]]
cands = [w for w in vocab if w not in ("king", "man", "woman")]
best = max(cands, key=lambda w: cos(q, emb[stoi[w]]))
print("  ->", best)`,
          },
        ],
      },
      {
        id: 'llm-a1-c1-l3',
        title: 'Embedding 查表与数字的"碎片化"表示',
        content: `
### 学习目标

学完本节，你应该能够：
1. 说明 embedding 查表就是矩阵按行取值，与 one-hot 乘法数学等价但 O(1)；
2. 解释输入 embedding 为什么要乘 sqrt(d_model)：抵消方差、与位置编码量级匹配；
3. 识别特殊 token 预留与「len=字符数」长度 bug 两类工程陷阱。

### 前置知识

- 「Embedding：从 one-hot 到稠密词向量」（l2）的稠密表示概念；
- Python 列表按下标取值的经验。

### 问题背景

模型的一切能力都始于「读」——但 Transformer 的全部计算是矩阵乘法与逐元素运算，输入必须是数字。因此所有世界知识都要先被压缩成一条整数 ID 序列：怎么切（分词粒度）、怎么编号（词表）、切不出的怎么办（OOV）、一段文本值多少钱（token 成本），这四个工程决定全部发生在模型第一层之前。中文在英文系 tokenizer 上可能多花一倍 token，上下文、账单、延迟全部翻倍——分词不是预处理细节，而是贯穿成本与能力的第一性约束。

### 直觉理解

把文本想成一堵乐高墙，tokenizer 是一本「拆砖手册」：常见整砖（高频整词）保留完整，稀有形状拆成小砖（子词）再拼装。小砖库（词表）加拆装规则可以砌出任何墙——再怪的新句子也能拼出来，OOV 问题就此消失。编号（ID）只是砖的货号；embedding 查表是按货号取出这块砖的「材质卡」（稠密向量）；而中文砖常被切成两三块，同样的墙要用更多货号——这就是 token 成本差异的来源。

### 核心概念与原理详解

## 查表就是一个矩阵取值

设词表大小 V = 32000，隐藏维度 d = 4096，embedding 矩阵 E 的形状就是 [32000, 4096]。给定 token ID 序列，前向计算的第一层是：

X = E[ids]，形状 [n, d]

数学上等价于把 one-hot 向量左乘 E：X = OneHot(ids) · E。但显式构造 one-hot 既浪费内存又慢，所以所有框架都实现为**按行索引（gather）**。一次查表的时间复杂度是 O(n·d)，与 V 无关。

反向传播时也一样：只有被查到的那些行会收到梯度，其余行梯度为零。这就引出工程上的两个重要推论：

1. **embedding 层是巨大的稀疏参数**，V×d 常常占模型总参数量的 15%~30%；
2. **稀疏梯度需要特殊优化器状态管理**。AdamW 的动量与方差矩阵如果按 V×d 分配，显存会翻三倍。工程上要么对 embedding 使用稀疏更新，要么干脆冻结。

## 为什么 embedding 要乘 sqrt(d_model)

原始 Transformer 论文在 embedding 之后乘以 sqrt(d_model)。原因与量级有关：词向量初始化后元素方差约为 O(1)，与位置编码相加时若不缩放，位置信息相对词向量的影响力会随维度增大而被稀释。后续模型（如 T5、LLaMA）改用 Pre-Norm 后不再需要这个缩放。

## 整数与浮点数的表示问题

LLM 没有原生的数字计算模块。一个整数会被 tokenizer 拆成若干子 token，例如 GPT-2 会把 "12345" 切成 "123" 和 "45"。这带来两个后果：

- "12345 的后三位"这类任务，模型必须知道切分位置才能正确回答；
- 位数越多，成功率越低，这是被广泛研究的 **tokenization 缺陷**。

社区总结的缓解方案：

1. 统一数字格式（补零、统一分隔符），让同一数值总是切成同样的 token；
2. 在提示中要求逐位对齐，或给出中间步骤（Chain-of-Thought）；
3. 业务上把算术外置成工具调用（calculator / code interpreter）——这也是 Agent 场景的重要动机。

## 特殊 token 的预留

\`<pad>\`、\`<bos>\`、\`<eos>\`、对话模板的 \`<|im_start|>\` 都占词表位置。微调时若要新增 token：

\`\`\`python
tok.add_tokens(["<|tool_call|>"])
model.resize_token_embeddings(len(tok))
# 新 token 的 embedding 是随机初始化的，通常需要额外训练才能稳定
\`\`\`

**教训**：新增 token 之后必须重新保存 tokenizer 与模型，并在评测集上确认没有性能回退。

## 一个常见的长度计算 bug

\`\`\`python
# 错误：按字符截断后再 tokenize
text = text[:4000]
ids = tok(text)["input_ids"]

# 正确：按 token 截断
ids = tok(text)["input_ids"][:4000]
\`\`\`

前者无法保证不超过上下文窗口，后者可以。把最大长度写死成"字符数"，是上线后收到"上下文超长"报错的最常见原因之一。

### 机制图解

<Diagram type="tensor" name="embedding-lookup" steps="token ID: 1234|Embedding 矩阵 [vocab, d]|取第 1234 行|[d] 维向量|进入 Transformer" />

上图是 Embedding 查表的完整路径。注意 Embedding 矩阵本身是**可训练参数**（vocab × d），它占据模型相当一部分参数量——小模型里甚至能到 30%。

## 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
from collections import Counter

# ---- 1. 迷你 BPE 训练：反复合并语料中最高频的相邻符号对 ----
corpus = ["low", "lower", "lowest", "newer", "newest", "wide", "wider", "widest"]
words = [list(w) + ["</w>"] for w in corpus]
pairs = Counter()
for w in words:
    for a, b in zip(w, w[1:]):
        pairs[(a, b)] += 1
merges = []
for _ in range(5):
    (a, b), n = pairs.most_common(1)[0]
    merges.append(a + b)
    print(f"merge #{len(merges)}: {a!r}+{b!r} -> {a+b!r} (频次 {n})")
    nxt, pairs = [], Counter()
    for w in words:
        i, w2 = 0, []
        while i < len(w):
            if i < len(w) - 1 and w[i] == a and w[i + 1] == b:
                w2.append(a + b); i += 2
            else:
                w2.append(w[i]); i += 1
        nxt.append(w2)
        for x, y in zip(w2, w2[1:]):
            pairs[(x, y)] += 1
    words, nxt = nxt, None

# ---- 2. 编码：按合并表贪心还原 ----
def encode(word):
    toks = list(word) + ["</w>"]
    for m in merges:
        i = 0
        while i < len(toks) - 1:
            if toks[i] + toks[i + 1] == m:
                toks[i:i + 2] = [m]
            else:
                i += 1
    return toks

for w in ("lowest", "newest"):
    print("encode", w, "->", encode(w))

# ---- 3. 词表与向量：ID 查表得到稠密向量 ----
V, d = 12, 4
rng = np.random.default_rng(0)
E = rng.normal(0, 1, (V, d))
ids = np.array([3, 0, 7])
print("embedding 查表形状:", E[ids].shape, "= one-hot 乘法:", np.allclose(E[ids], np.eye(V)[ids] @ E))

# ---- 4. 中英文 token 成本（经验值）与预算 ----
en_tok, zh_tok_en, zh_tok_zh = 1300, 1300, 620   # 1000 英文词 / 1000 中文字
print(f"英文 1000 词 ≈ {en_tok} tok；中文 1000 字@英文系 ≈ {zh_tok_en} tok，@中文优化 ≈ {zh_tok_zh} tok")
print(f"同内容中文成本差 ≈ {zh_tok_en / zh_tok_zh:.1f}x；4k 上下文 ≈ {int(4000 * 1000 / zh_tok_en)} 中文字（英文系）"[:80])
price = 0.002 / 1000  # $/tok 示例价
print(f"成本模型: 100 万 tok 训练语料 ≈ \${1_000_000 * price:.2f}")\`\`\`

预期输出（实测）：BPE 合并序列：'w'+'e'→'we'(频次4)、'l'+'o'→'lo'(3)、'r'+'</w>'→'r</w>'(3)、's'+'t'→'st'(3)、'st'+'</w>'→'st</w>'(3)；encode lowest → ['lo','we','st</w>']，newest → ['n','e','we','st</w>']（子词既压缩又无 OOV）；embedding 查表形状 (3,4) 且与 one-hot 乘法 allclose=True；英文 1000 词≈1300 tok，中文 1000 字@英文系≈1300 tok、@中文优化≈620 tok（成本差 2.1x）；4k 上下文≈3076 中文字（英文系）；100 万 tok 语料按 $0.002/1k ≈ $2.00。

**常见错误**：编码时逐符号扫描却不做最长匹配，把 'lowest' 切成 l-o-w-e-s-t 而不是 lowest；按字符数而不是 token 数估上下文，中文场景预算直接差一倍以上；微调时新增特殊 token 却不改 embedding 矩阵行数，旧权重加载后 ID 错位全乱。

### 常见误区

1. **token 等于单词**——主流是子词：'unbelievable' 会被拆成 un/believ/able 几块，token 是词表里的条目不是语言学词；\\n2. **词表越大越好**——词表大 embedding 参数与 softmax 计算暴涨，低频 token 学不充分，主流在 3 万～25 万权衡；\\n3. **分词只影响预处理**——它决定序列长度（算力）、OOV（能力边界）、多语言成本（账单），是模型设计的一部分。

### 知识关联

- **向前**：ID 序列进入 c3 嵌入层查表变成向量，本章的「货号」在 c3-l1 变成「材质卡」；
- **向后**：c10 加载权重必须用配套 tokenizer，c11 生成循环的输出 ID 也要 decode 回文本；
- **平行**：llm-a3 的 tokenizer 工程与 RAG 按 token 切分实践，是本章成本观的落地。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 桥梁 | 文本 → 分词 → 整数 ID → embedding 向量，模型只看见数字 |
| 主流算法 | byte-level BPE（GPT/LLaMA）、WordPiece（BERT）、SentencePiece/Unigram（T5） |
| 粒度权衡 | 字符级无 OOV 但序列长，词级短但 OOV 多，子词级兼顾 |
| 中英文成本 | 同内容中文在英文系 tokenizer 上可达 2 倍 token |
| 预算纪律 | 按 token 计量、按目标模型 tokenizer 计算、换模型重算 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Sennrich et al., 2016, arXiv:1508.07909 与 Hugging Face Tokenizers 文档相应章节）
`,
        tips: [
          {
            kind: 'pitfall',
            text: 'embedding 矩阵参数量 V×d 极大。用 Adam 训练时优化器状态会让显存再增 2~3 倍；全参微调前先估算 V×d×4×3 字节是否超过单卡显存。',
          },
          {
            kind: 'performance',
            text: '推理时 embedding 层是访存密集而非计算密集，把 batch 内补位后一次性 gather，比逐条 Python 循环快一个数量级。',
          },
          {
            kind: 'leak',
            text: '微调时输入序列右侧补齐 pad，损失函数必须用 attention_mask 把这些位置屏蔽掉，否则模型会学会"输出 pad"，推理时概率分布会被污染。',
          },
        ],
        demos: [
          {
            title: '手写 embedding 查表（含 batch、缩放与 padding 掩码）',
            lang: 'python',
            code: `import numpy as np

V, d = 12, 5
rng = np.random.default_rng(0)
E = rng.normal(0, 0.02, size=(V, d))

def embed(ids, d_model):
    """ids 为一维或二维整数序列，返回 [B, n, d]。"""
    arr = np.array(ids, dtype=np.int64)
    if arr.ndim == 1:
        arr = arr[None, :]
    return E[arr] * np.sqrt(d_model)

batch = [[1, 4, 7], [2, 5, 0], [3, 6, 8]]
X = embed(batch, d)
print("输入形状:", X.shape)
print("第 0 条序列第 1 个 token 的向量:", np.round(X[0, 1], 3))

onehot = np.zeros((len(batch), 3, V))
for b, seq in enumerate(batch):
    for t, i in enumerate(seq):
        onehot[b, t, i] = 1
Y = onehot @ E * np.sqrt(d)
print("gather 与 one-hot 乘法结果一致:", np.allclose(X, Y))

mask = np.array(batch) != 0
X_masked = X * mask[:, :, None]
print()
print("被屏蔽的 pad 位置行向量全为 0:", bool(np.all(X_masked[1, 1] == 0)))`,
          },
        ],
      },
      {
        id: 'llm-a1-c1-l4',
        title: '词表、OOV 与 token 成本预算',
        content: `
### 学习目标

学完本节，你应该能够：
1. 复述 OOV 的来源（词表封闭性）与词表大小是覆盖率/参数量/算力的权衡结果；
2. 用 token 数（而非字符数）做上下文预算，并写出成本 ≈ token 数 × 单价的估算式；
3. 为长文档场景设计窗口管理策略：按 token 截断、分段映射、成本分级。

### 前置知识

- 「从文本到 token」（l1）的子词词表；
- 「Embedding 查表」（l3）的特殊 token 预留。

### 问题背景

模型的一切能力都始于「读」——但 Transformer 的全部计算是矩阵乘法与逐元素运算，输入必须是数字。因此所有世界知识都要先被压缩成一条整数 ID 序列：怎么切（分词粒度）、怎么编号（词表）、切不出的怎么办（OOV）、一段文本值多少钱（token 成本），这四个工程决定全部发生在模型第一层之前。中文在英文系 tokenizer 上可能多花一倍 token，上下文、账单、延迟全部翻倍——分词不是预处理细节，而是贯穿成本与能力的第一性约束。

### 直觉理解

把文本想成一堵乐高墙，tokenizer 是一本「拆砖手册」：常见整砖（高频整词）保留完整，稀有形状拆成小砖（子词）再拼装。小砖库（词表）加拆装规则可以砌出任何墙——再怪的新句子也能拼出来，OOV 问题就此消失。编号（ID）只是砖的货号；embedding 查表是按货号取出这块砖的「材质卡」（稠密向量）；而中文砖常被切成两三块，同样的墙要用更多货号——这就是 token 成本差异的来源。

### 核心概念与原理详解

## OOV 从何而来

在词级词表中，训练语料未出现的词是 OOV（out-of-vocabulary），通常映射为 \`<unk>\`。子词分词极大缓解了这个问题：任何字符串都能被拆成字节或字符序列，最差情况也不会出现 \`<unk>\`。

但 OOV 只是换了个形式存在，变成了**碎片化**：

- "Transformerization" 被切成 Trans / former / ization，模型需要从碎片组合中推断含义；
- 罕见专有名词、产品代号、代码标识符会消耗大量 token；
- 拼写变体（"PythonAPI" 与 "Python API"）切分结果不同，语义相近但 token 完全不同。

## 词表大小是权衡的结果

| 词表大小 | 优势 | 代价 |
| --- | --- | --- |
| 较小（3 万~5 万） | embedding 参数少，小语料不易欠拟合 | 序列更长，注意力与 KV cache 成本高 |
| 较大（12 万~25 万） | 序列更短、推理更快、多语言覆盖更好 | embedding 与输出层参数占比高，尾部 token 训练不充分 |

LLaMA-2 用 32000，LLaMA-3 扩到 128256 就是为了让中文、代码等内容更省 token；Qwen 系列词表约 15 万。**词表扩容是新一代模型"更便宜更快"的关键改动之一**。

## 中文为什么更"贵"：token 效率的语言差异

这是中文使用者必须知道的一个事实：**同样的内容，中文消耗的 token 往往比英文多**。

原因在训练语料的语言分布：主流 tokenizer（BPE）在英文语料上训练，
高频合并规则天然贴合英文的词形（"ing"、"tion"、"pre" 都是常见合并单元）。
而汉字是**表意字符**，没有词形变化，一个汉字通常要占 1~2 个 token。

一个实测对比（近似值，不同模型差异较大）：

| 内容 | 字符数 | 主流 tokenizer | 比值 |
| --- | --- | --- | --- |
| 英文 \`Hello, how are you today?\` | 25 | 约 7 token | ≈ 0.28 token/字符 |
| 中文「你好，今天过得怎么样？」 | 12 | 约 12~15 token | ≈ 1.0~1.25 token/字符 |
| 中文技术文档一页 | 1500 | 约 1500~2000 token | ≈ 1.0~1.3 token/字符 |

**结论**：同样的信息量，中文的 token 数可能是英文的 **1.5~2.5 倍**。

## 这带来的三个实际影响

**① 费用差异（API 计费公平性）**

按 token 计费的 API，中文用户为"同样内容"付的钱天然更多。
已有研究（"Do All Languages Cost the Same?"）实测发现：
同一段语义的内容，部分语言的费用可达英语的 **2~15 倍**，中文处于中高水平。

这不是厂商"故意歧视"，而是计费单位（token）本身不是语言中立的——
**这被视为当前 LLM 商业化中一个待解决的公平性问题**。

**② 上下文容量打折**

标称 128K 的窗口，中文实际能放的内容量约为英文的 **1/1.5 ~ 1/2**。
选型时如果只按"128K 够不够"判断，中文场景容易低估。

**③ 推理成本与延迟**

token 越多，prefill 越慢、KV Cache 越大、生成越贵。
中文应用的单位内容成本天然高于英文应用。

## 工程上怎么应对

| 策略 | 做法 | 效果 |
| --- | --- | --- |
| **选中文友好的模型** | 优先选词表大、中文语料占比高的模型（Qwen / GLM / DeepSeek / LLaMA-3） | token 数可降 20%~40% |
| **提示词语言要实测** | 中文提示在中文强的模型上更自然；弱模型上英文指令可能更省 | 视模型而定 |
| **结构化输出压到最短** | 键名用短名（\`c\` 而非 \`category\`）、去掉缩进 | 省 10%~20% |
| **按"信息量"而非"字符数"做预算** | 用真实 tokenizer 计数，不用 \`len(text)\` | 避免预算算错 |
| **中文场景优先 Prompt Caching** | 长中文系统提示反复使用时收益更大 | 输入成本降 75%~90% |

## 估算 token 数的正确做法

\`\`\`python
# 错误：按字符数估（中英文误差可达 2 倍）
est = len(text) / 4

# 正确：用真实 tokenizer
from transformers import AutoTokenizer
tok = AutoTokenizer.from_pretrained("Qwen/Qwen2-7B")
n = len(tok.encode(text))
\`\`\`

若无法加载 tokenizer（如纯前端环境），可按经验值近似：
**纯英文 ≈ 字符数 / 4；纯中文 ≈ 字符数 × 1.1；中英混排取加权**。
但这只是应急，正式做成本核算必须用真实 tokenizer。

<TensorFlow steps="中文 12 字|≈ 13 token|英文 25 字符|≈ 7 token|相差 1.9 倍" note="同样信息量下，中文占用的 token 数显著更多" />

## 成本模型

一次 API 调用的费用大致为：

cost = (prompt_tokens × P_in + completion_tokens × P_out) / 1e6 × price_per_Mtok

工程上要关注的不仅是单价，还有：

- **输入与输出单价不同**，输出通常贵 3~4 倍；
- **prompt caching** 可把重复前缀的输入价格降到 10%~25%，长系统提示加 RAG 场景收益巨大；
- **上下文越长，注意力与 KV cache 越大**，延迟呈超线性增长。

## 上下文窗口管理的实务

假设上下文窗口 128K token，需要放入：系统提示（1.5K）、对话历史（若干）、检索到的文档（每篇 2K）、用户问题（0.2K）。可用预算就是

B = 128K - 1.5K - 0.2K - 预留输出（例如 4K）

文档数量上限约为 B / 2K。**先算预算再取文档数**，比"取 top-5 然后祈祷不超长"稳健得多。

## 一个实用的预算函数

\`\`\`python
def budget(window, system_tokens, question_tokens, max_output, avg_doc_tokens, reserve=512):
    left = window - system_tokens - question_tokens - max_output - reserve
    return max(0, left // avg_doc_tokens)
\`\`\`

## 常见误区

1. **按字符估算 token**：中英文混排误差可能 2 倍；
2. **忽略 JSON 结构本身的 token**：键名、引号、缩进都要花 token，结构越深越贵；
3. **把整段对话历史原样塞入**：应做摘要，或只保留最近 N 轮加关键事实；
4. **以为"窗口大就随便放"**：长上下文中部信息的召回率会显著下降（lost in the middle）。

### 机制图解

<Diagram type="contextwindow" />

上图展示上下文窗口的构成：系统提示 + 对话历史 + 当前输入 + 预留输出，全部共享同一个窗口。窗口是硬上限，超了就必须截断或压缩——这直接决定了「一次能喂多少资料」。

## 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
from collections import Counter

# ---- 1. 迷你 BPE 训练：反复合并语料中最高频的相邻符号对 ----
corpus = ["low", "lower", "lowest", "newer", "newest", "wide", "wider", "widest"]
words = [list(w) + ["</w>"] for w in corpus]
pairs = Counter()
for w in words:
    for a, b in zip(w, w[1:]):
        pairs[(a, b)] += 1
merges = []
for _ in range(5):
    (a, b), n = pairs.most_common(1)[0]
    merges.append(a + b)
    print(f"merge #{len(merges)}: {a!r}+{b!r} -> {a+b!r} (频次 {n})")
    nxt, pairs = [], Counter()
    for w in words:
        i, w2 = 0, []
        while i < len(w):
            if i < len(w) - 1 and w[i] == a and w[i + 1] == b:
                w2.append(a + b); i += 2
            else:
                w2.append(w[i]); i += 1
        nxt.append(w2)
        for x, y in zip(w2, w2[1:]):
            pairs[(x, y)] += 1
    words, nxt = nxt, None

# ---- 2. 编码：按合并表贪心还原 ----
def encode(word):
    toks = list(word) + ["</w>"]
    for m in merges:
        i = 0
        while i < len(toks) - 1:
            if toks[i] + toks[i + 1] == m:
                toks[i:i + 2] = [m]
            else:
                i += 1
    return toks

for w in ("lowest", "newest"):
    print("encode", w, "->", encode(w))

# ---- 3. 词表与向量：ID 查表得到稠密向量 ----
V, d = 12, 4
rng = np.random.default_rng(0)
E = rng.normal(0, 1, (V, d))
ids = np.array([3, 0, 7])
print("embedding 查表形状:", E[ids].shape, "= one-hot 乘法:", np.allclose(E[ids], np.eye(V)[ids] @ E))

# ---- 4. 中英文 token 成本（经验值）与预算 ----
en_tok, zh_tok_en, zh_tok_zh = 1300, 1300, 620   # 1000 英文词 / 1000 中文字
print(f"英文 1000 词 ≈ {en_tok} tok；中文 1000 字@英文系 ≈ {zh_tok_en} tok，@中文优化 ≈ {zh_tok_zh} tok")
print(f"同内容中文成本差 ≈ {zh_tok_en / zh_tok_zh:.1f}x；4k 上下文 ≈ {int(4000 * 1000 / zh_tok_en)} 中文字（英文系）"[:80])
price = 0.002 / 1000  # $/tok 示例价
print(f"成本模型: 100 万 tok 训练语料 ≈ \${1_000_000 * price:.2f}")\`\`\`

预期输出（实测）：BPE 合并序列：'w'+'e'→'we'(频次4)、'l'+'o'→'lo'(3)、'r'+'</w>'→'r</w>'(3)、's'+'t'→'st'(3)、'st'+'</w>'→'st</w>'(3)；encode lowest → ['lo','we','st</w>']，newest → ['n','e','we','st</w>']（子词既压缩又无 OOV）；embedding 查表形状 (3,4) 且与 one-hot 乘法 allclose=True；英文 1000 词≈1300 tok，中文 1000 字@英文系≈1300 tok、@中文优化≈620 tok（成本差 2.1x）；4k 上下文≈3076 中文字（英文系）；100 万 tok 语料按 $0.002/1k ≈ $2.00。

**常见错误**：编码时逐符号扫描却不做最长匹配，把 'lowest' 切成 l-o-w-e-s-t 而不是 lowest；按字符数而不是 token 数估上下文，中文场景预算直接差一倍以上；微调时新增特殊 token 却不改 embedding 矩阵行数，旧权重加载后 ID 错位全乱。

### 常见误区

1. **token 等于单词**——主流是子词：'unbelievable' 会被拆成 un/believ/able 几块，token 是词表里的条目不是语言学词；\\n2. **词表越大越好**——词表大 embedding 参数与 softmax 计算暴涨，低频 token 学不充分，主流在 3 万～25 万权衡；\\n3. **分词只影响预处理**——它决定序列长度（算力）、OOV（能力边界）、多语言成本（账单），是模型设计的一部分。

### 知识关联

- **向前**：ID 序列进入 c3 嵌入层查表变成向量，本章的「货号」在 c3-l1 变成「材质卡」；
- **向后**：c10 加载权重必须用配套 tokenizer，c11 生成循环的输出 ID 也要 decode 回文本；
- **平行**：llm-a3 的 tokenizer 工程与 RAG 按 token 切分实践，是本章成本观的落地。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 桥梁 | 文本 → 分词 → 整数 ID → embedding 向量，模型只看见数字 |
| 主流算法 | byte-level BPE（GPT/LLaMA）、WordPiece（BERT）、SentencePiece/Unigram（T5） |
| 粒度权衡 | 字符级无 OOV 但序列长，词级短但 OOV 多，子词级兼顾 |
| 中英文成本 | 同内容中文在英文系 tokenizer 上可达 2 倍 token |
| 预算纪律 | 按 token 计量、按目标模型 tokenizer 计算、换模型重算 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Sennrich et al., 2016, arXiv:1508.07909 与 Hugging Face Tokenizers 文档相应章节）
`,
        tips: [
          {
            kind: 'performance',
            text: '把不变的系统提示放在最前面，能命中 prompt caching。缓存只认"完全一致的请求前缀"，中途插入变量会让缓存全部失效。',
          },
          {
            kind: 'pitfall',
            text: '不要用字符数代替 token 数做截断。中文在部分 tokenizer 上一个字就是 2~3 个 token，按字符截断仍可能超窗口。',
          },
          {
            kind: 'interview',
            text: '被问"如何降低 RAG 的 token 成本"时，可从四个方向回答：文档切分更细更准、重排后只保留 top-k、上下文压缩（抽取式摘要）、prompt caching。',
          },
          {
            kind: 'note',
            text: '子词分词下不存在严格意义的"未登录词"，但低资源语言的字符/字节碎片本质上是另一种 OOV，表现为长序列与高成本。',
          },
        ],
        demos: [
          {
            title: '上下文预算计算器：给定窗口反推可放入多少篇文档',
            lang: 'python',
            code: `import re

CJK = chr(0x4E00) + "-" + chr(0x9FFF)

def rough_tokens(text):
    cjk = len(re.findall("[" + CJK + "]", text))
    words = len(re.findall("[A-Za-z]+|[0-9]+", text))
    punct = len(re.findall("[^A-Za-z0-9_" + CJK + "]", text))
    return cjk + words + punct

system_prompt = "你是一名严谨的技术助手，回答需引用文档编号，不确定时说不确定。"
question = "总结这三篇文档里关于 KV Cache 的要点，并指出它们的分歧。"
doc = "KV Cache 把已生成 token 的 Key 与 Value 缓存下来，把每步 O(n^2) 的注意力降为 O(n)。代价是显存随序列长度线性增长，因此需要分页管理。"

s_t, q_t, d_t = rough_tokens(system_prompt), rough_tokens(question), rough_tokens(doc)
window, max_output, reserve = 8192, 1024, 256

def budget(window, s_t, q_t, d_t, max_output, reserve):
    left = window - s_t - q_t - max_output - reserve
    return max(0, left // d_t), left

n_docs, left = budget(window, s_t, q_t, d_t, max_output, reserve)
print(f"系统提示 {s_t} token，问题 {q_t} token，单文档约 {d_t} token")
print(f"窗口 {window}，预留输出 {max_output} 加安全余量 {reserve}，可分配 {left} token")
print(f"最多可放 {n_docs} 篇文档")
print()
for docs in (1, 3, 5, 30):
    used = s_t + q_t + docs * d_t + max_output
    flag = "未超" if used <= window else "超窗口"
    print(f"  放 {docs:2d} 篇 -> 使用 {used:5d} token [{flag}]")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-a1-c1-e1',
        type: 'single',
        difficulty: 1,
        question: '大语言模型的输入层接收的原始数据类型是？',
        options: [
          { value: 'A', text: 'UTF-8 字节串' },
          { value: 'B', text: '分词后得到的整数 token ID' },
          { value: 'C', text: '每个单词对应的 one-hot 向量' },
          { value: 'D', text: '字符的 Unicode 码点直接作为输入' },
        ],
        answer: 'B',
        explanation:
          '模型第一位操作是 `Embedding` 查表，它需要整数 ID。文本先经 tokenizer 变成 ID 序列，再由 embedding 矩阵映射成 [n, d] 的稠密向量。one-hot 只是数学上等价的视角，实际实现不会真的构造它。',
        relatedLessonId: 'llm-a1-c1-l1',
        tags: ['tokenizer', '输入表示'],
      },
      {
        id: 'llm-a1-c1-e2',
        type: 'judge',
        difficulty: 1,
        question: '使用子词分词（如 BPE、WordPiece）后，模型完全不会再遇到无法表示的词（OOV）问题。',
        answer: true,
        explanation:
          '子词分词的保底单位是字符或字节，任何字符串都能拆成若干已知子单元，因此不会再出现被映射为 `<unk>` 的词。但代价是"碎片化"：罕见词被切成很多小片段，消耗更多 token。',
        relatedLessonId: 'llm-a1-c1-l4',
        tags: ['分词', 'OOV'],
      },
      {
        id: 'llm-a1-c1-e3',
        type: 'multiple',
        difficulty: 2,
        question: '关于 BPE、WordPiece、SentencePiece，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: 'BPE 从字符（或字节）出发，反复合并出现频次最高的相邻符号对' },
          { value: 'B', text: 'WordPiece 选择合并的标准是使训练语料的语言模型似然提升最大' },
          { value: 'C', text: 'SentencePiece 把空格当作普通符号处理，不依赖预分词' },
          { value: 'D', text: '三种方法都必须在推理时重新运行完整算法统计频次' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          '合并规则在训练阶段学好后被固化成表，推理阶段只需按表执行贪心或最长匹配，不会重新统计频次，所以 D 错误。A、B、C 分别是三种算法最核心的特征。',
        relatedLessonId: 'llm-a1-c1-l1',
        tags: ['BPE', 'WordPiece', 'SentencePiece'],
      },
      {
        id: 'llm-a1-c1-e4',
        type: 'fill',
        difficulty: 2,
        question: '补全 BPE 训练时"统计相邻符号对频次"的关键代码（用 `collections.Counter`）：\n\n```python\ndef count_pairs(tokenized):\n    pairs = Counter()\n    for syms in tokenized:\n        for i in range(len(syms) - 1):\n            pairs[___] += 1\n    return pairs\n```',
        blanks: [['(syms[i], syms[i + 1])', '(syms[i], syms[i+1])', '/\\(\\s*syms\\[i\\]\\s*,\\s*syms\\[i\\s*\\+\\s*1\\]\\s*\\)/']],
        explanation:
          '必须以**元组** `(a, b)` 作为键，才能区分顺序（"ab" 与 "ba" 是不同的一对）。若写成 `syms[i] + syms[i + 1]` 拼成字符串，会与真实存在的长 token 混淆，例如 "ab" 既可能是合并产生的新符号，也可能是两个原始符号。',
        relatedLessonId: 'llm-a1-c1-l1',
        tags: ['BPE', '实现'],
      },
      {
        id: 'llm-a1-c1-e5',
        type: 'single',
        difficulty: 2,
        question: 'Word2Vec 的 Skip-gram 加负采样训练，在最优解处中心词向量与上下文词向量的内积近似正比于？',
        options: [
          { value: 'A', text: '两个词在语料中的共现次数' },
          { value: 'B', text: '两个词的点互信息 PMI 减去一个与负采样数有关的常数' },
          { value: 'C', text: '两个词的词频之积' },
          { value: 'D', text: '两个词编辑距离的倒数' },
        ],
        answer: 'B',
        explanation:
          'Levy 与 Goldberg（2014）证明：负采样目标的最优解满足"向量内积约等于 PMI(c, w) 减 log K"，K 为负样本数。这正是词向量能编码语义相似性的理论依据。',
        relatedLessonId: 'llm-a1-c1-l2',
        tags: ['Word2Vec', '理论'],
      },
      {
        id: 'llm-a1-c1-e6',
        type: 'judge',
        difficulty: 2,
        question: 'GloVe 通过分解全局共现矩阵来获得词向量，而 Word2Vec 只利用局部滑动窗口做预测任务。',
        answer: true,
        explanation:
          'GloVe 的目标函数直接拟合 log 共现计数（加权最小二乘），使用全局统计量；Word2Vec 是局部窗口内的预测任务。两者学到的向量性质相似，但计算方式根本不同。',
        relatedLessonId: 'llm-a1-c1-l2',
        tags: ['GloVe', 'Word2Vec'],
      },
      {
        id: 'llm-a1-c1-e7',
        type: 'multiple',
        difficulty: 2,
        question: '关于 embedding 查表操作，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '它在数学上等价于 one-hot 向量乘以 embedding 矩阵' },
          { value: 'B', text: '时间复杂度 O(n·d)，与词表大小 V 无关' },
          { value: 'C', text: '反向传播时只有被查到的行会产生梯度' },
          { value: 'D', text: '每次前向传播都会更新整个 embedding 矩阵的数值' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误：前向传播只做读取，不修改矩阵。只有反向传播时梯度会累加到对应行，未被索引到的行梯度为零（稀疏梯度），这也是优化器状态必须特殊处理的原因。',
        relatedLessonId: 'llm-a1-c1-l3',
        tags: ['embedding', '实现'],
      },
      {
        id: 'llm-a1-c1-e8',
        type: 'fill',
        difficulty: 2,
        question: '实现 embedding 查表，并按 Transformer 论文的惯例缩放，补全代码（`ids` 形状 [B, n]，`E` 形状 [V, d]）：\n\n```python\nimport numpy as np\n\ndef embed(ids, E):\n    d_model = E.shape[1]\n    return E[np.array(ids)] * ___\n```',
        blanks: [['np.sqrt(d_model)', 'np.sqrt(E.shape[1])', 'd_model ** 0.5']],
        explanation:
          '原论文把词向量乘以 sqrt(d_model)，使表示量级与位置编码匹配。实现上就是 `np.sqrt(d_model)`。',
        relatedLessonId: 'llm-a1-c1-l3',
        tags: ['embedding', '缩放'],
      },
      {
        id: 'llm-a1-c1-e9',
        type: 'judge',
        difficulty: 2,
        question: 'RAG 检索库用模型 A 生成的向量，查询时换成模型 B 生成向量，只要两个模型维度相同，余弦相似度仍然可靠。',
        answer: false,
        explanation:
          '不同模型训练的向量空间相互独立，即使维度相同，坐标也没有可比性。一旦更换 embedding 模型，必须全量重建索引。这是线上 RAG 最难排查的故障之一。',
        relatedLessonId: 'llm-a1-c1-l2',
        tags: ['embedding', 'RAG', '工程'],
      },
      {
        id: 'llm-a1-c1-e10',
        relatedLessonId: 'llm-a1-c1-l1',
        type: 'code',
        difficulty: 1,
        question:
          '实现**单步贪心合并**的子词切分器：给定合并规则列表 `merges`，对单词从左到右扫描，若当前位置的两个字符构成合并表中的某一对（例如 "lo" 由 l 与 o 合并而来），就把它们合并成一个 token 并跳过下一个字符；否则当前字符单独成 token。\n\n请实现 `merge_split(word)`，返回 token 列表，并计算 `out = merge_split("lowest")`。\n\n提示：合并表是 `merges`，判断"两个字符能否合并"可以借助 `"" .join([a, b]) in merges` 的等价写法：`(a + b) in merges`。',
        starterCode: `# 合并规则：以下每个字符串都表示一次"把两个字符合并成一个 token"
merges = ["lo", "ow", "es", "st"]

def merge_split(word):
    """从左到右贪心合并，返回子词列表。"""
    tokens = []
    i = 0
    while i < len(word):
        # 若当前位置的两个字符能合并成一个 token，就合并并跳过两个字符
        if ___
            tokens.append(word[i] + word[i + 1])
            i += 2
        else:
            tokens.append(word[i])
            i += 1
    return tokens

out = merge_split("lowest")
`,
        setupCode: '',
        expectedOutput: "['lo', 'w', 'es', 't']",
        tests: `assert context == ["lo", "w", "es", "t"], f"lowest 应切分为 ['lo', 'w', 'es', 't']，实际 {context}"
assert merge_split("low") == ["lo", "w"], f"low 应切分为 ['lo', 'w']，实际 {merge_split('low')}"
assert merge_split("o") == ["o"], "单字符应原样返回"
assert merge_split("zz") == ["z", "z"], "不在合并表中的相邻字符应拆开"
assert merge_split("est") == ["es", "t"], f"est 应为 ['es', 't']，实际 {merge_split('est')}"
assert merge_split("lowlow") == ["lo", "w", "lo", "w"], "同一片段出现多次时应分别处理"
`,
        answer: `merges = ["lo", "ow", "es", "st"]

def merge_split(word):
    tokens = []
    i = 0
    while i < len(word):
        if i + 1 < len(word) and (word[i] + word[i + 1]) in merges:
            tokens.append(word[i] + word[i + 1])
            i += 2
        else:
            tokens.append(word[i])
            i += 1
    return tokens

out = merge_split("lowest")
context = out
`,
        explanation:
          '```python\nif i + 1 < len(word) and (word[i] + word[i + 1]) in merges:\n```\n\n两个易错点：(1) 忘记判断 `i + 1 < len(word)`，单词长度为奇数时最后一个字符会越界；(2) 合并表里同时有 "lo" 和 "ow"，"lowest" 中 l 与 o 先命中 "lo"，于是 o 已经在上一轮被消费掉了，**不可能再与 w 合并**——这正是真实 BPE 需要"多轮迭代（多次扫描整份语料）"的原因，单轮贪心只能得到 "lo" 与 "w"。',
        tags: ['BPE', '分词', '实现'],
      },
      {
        id: 'llm-a1-c1-e11',
        relatedLessonId: 'llm-a1-c1-l4',
        type: 'code',
        difficulty: 1,
        question:
          '实现 token 预算计算：给定上下文窗口 `window`、已用 token 数 `used`（系统提示加问题）、预留输出 `max_output`，计算还能放入多少 token 用于检索文档 `available`，以及最多能放几篇完整文档 `n_docs`。\n\n约束：\n- 额外保留 256 token 的安全余量；\n- 若剩余空间为负，`available` 取 `0`；\n- `n_docs` 必须是整数，向下取整。',
        starterCode: `window = 8192
used = 1500          # 系统提示 + 用户问题
max_output = 1024
doc_tokens = 700

# 1. 计算可用于文档的 token 预算（减去 256 安全余量，且不能为负）
available = ___

# 2. 计算最多能放几篇完整文档（向下取整，得到整数）
n_docs = ___
`,
        setupCode: '',
        expectedOutput: 'available = 5412, n_docs = 7',
        tests: `assert available == 5412, f"available 应为 5412，实际 {available}"
assert n_docs == 7, f"n_docs 应为 7，实际 {n_docs}"
assert isinstance(n_docs, int), "n_docs 应为整数，请用整除"
assert doc_tokens * n_docs <= available, "放入的文档总 token 不能超过预算"
assert doc_tokens * (n_docs + 1) > available, "n_docs 应是能放下的最大篇数"
`,
        answer: `window = 8192
used = 1500
max_output = 1024
doc_tokens = 700

available = max(0, window - used - max_output - 256)
n_docs = available // doc_tokens
`,
        explanation:
          '计算公式：`available = 8192 - 1500 - 1024 - 256 = 5412`；`n_docs = 5412 // 700 = 7`（7 乘 700 = 4900，还剩 512）。工程上这一步应该放在调检索之前，而不是"先取 top-5 再祈祷不超长"。',
        tags: ['上下文预算', 'token', '工程'],
      },
      {
        id: 'llm-a1-c1-e12',
        relatedLessonId: 'llm-a1-c1-l1',
        type: 'code',
        difficulty: 2,
        question:
          '实现 BPE 的**单步合并**：给定分词列表 `word_tokens`（每个元素是一个词的符号序列）与要合并的符号对 `pair`，返回合并后的分词列表 `merged`，以及每个词被合并的次数 `merge_counts`。\n\n规则：从左到右扫描，遇到与 `pair` 相同的**相邻两个**符号就替换为它们的拼接串，然后跳过这两个符号。',
        starterCode: `pair = ("l", "o")
word_tokens = [list("low"), list("lower"), list("newest")]

def merge_pair(tokens, pair):
    out = []
    hits = 0
    i = 0
    # 在这里实现：命中 pair 就拼接并 i += 2，否则保留当前符号并 i += 1
    ___
    return out, hits

merged = []
merge_counts = []
for syms in word_tokens:
    new_syms, hits = merge_pair(syms, pair)
    merged.append(new_syms)
    merge_counts.append(hits)
`,
        setupCode: '',
        expectedOutput: "merged = [['lo','w'], ['lo','w','e','r'], ['n','e','w','e','s','t']], merge_counts = [1, 1, 0]",
        tests: `assert merged[0] == ["lo", "w"], f"low 应为 ['lo', 'w']，实际 {merged[0]}"
assert merged[1] == ["lo", "w", "e", "r"], f"lower 应为 ['lo', 'w', 'e', 'r']，实际 {merged[1]}"
assert merged[2] == ["n", "e", "w", "e", "s", "t"], "未命中 pair 的词应保持原样"
assert merge_counts == [1, 1, 0], f"merge_counts 应为 [1, 1, 0]，实际 {merge_counts}"
assert merge_pair(list("lol"), ("l", "o"))[0] == ["lo", "l"], "lol 应合并首个 lo，剩余 l 单独保留"
`,
        answer: `pair = ("l", "o")
word_tokens = [list("low"), list("lower"), list("newest")]

def merge_pair(tokens, pair):
    out = []
    hits = 0
    i = 0
    while i < len(tokens):
        if i + 1 < len(tokens) and tokens[i] == pair[0] and tokens[i + 1] == pair[1]:
            out.append(tokens[i] + tokens[i + 1])
            hits += 1
            i += 2
        else:
            out.append(tokens[i])
            i += 1
    return out, hits

merged = []
merge_counts = []
context = merged
for syms in word_tokens:
    new_syms, hits = merge_pair(syms, pair)
    merged.append(new_syms)
    merge_counts.append(hits)
`,
        explanation:
          '用 `while` 而非 `for` 循环，因为命中时要一次跳过两个元素。真实 BPE 训练中，这个合并会对整个语料执行一遍，并选择**频次最高的对**；这里把"选哪一对"交给外部，只实现"应用一次合并"，便于把流水线看清。',
        tags: ['BPE', '实现', '循环'],
      },
      {
        id: 'llm-a1-c1-e13',
        relatedLessonId: 'llm-a1-c1-l2',
        type: 'code',
        difficulty: 2,
        question:
          '实现 L2 归一化与余弦相似度检索：给定文档向量矩阵 `docs`（形状 [N, d]）与查询向量 `q`（形状 [d]），返回**归一化后**的文档矩阵 `docs_norm`、归一化后的查询向量 `q_norm`，以及每个文档的相似度得分 `scores`（长度 N）。\n\n要点：`l2norm` 需要同时支持一维与二维输入（沿最后一维求范数）；两个向量都归一化后，余弦相似度就等于点积。',
        starterCode: `import numpy as np

docs = np.array([
    [1.0, 0.0, 1.0],
    [0.0, 2.0, 0.0],
    [1.0, 1.0, 0.0],
], dtype=float)
q = np.array([1.0, 0.0, 0.5])

def l2norm(x):
    # 沿最后一维求范数，再除回去（加 1e-12 防止除零）
    return ___

docs_norm = l2norm(docs)
q_norm = l2norm(q)          # 一维输入也应支持

# 用点积得到余弦相似度
scores = ___
`,
        setupCode: '',
        expectedOutput: 'q_norm 范数为 1，scores 约为 [0.9487, 0.0, 0.6325]',
        tests: `assert docs_norm.shape == (3, 3), "docs_norm 形状应为 (3, 3)"
assert abs(float(np.linalg.norm(docs_norm[0])) - 1.0) < 1e-9, "归一化后每行范数应为 1"
assert q_norm.shape == (3,), f"q_norm 形状应为 (3,)，实际 {q_norm.shape}"
assert abs(float(np.linalg.norm(q_norm)) - 1.0) < 1e-9, "q_norm 的范数应为 1"
assert len(scores) == 3, "scores 长度应为 3"
assert abs(scores[0] - 0.9486833) < 1e-5, f"第 0 个相似度约为 0.9487，实际 {scores[0]}"
assert abs(scores[1] - 0.0) < 1e-9, f"第 1 个相似度应为 0.0，实际 {scores[1]}"
assert abs(scores[2] - 0.6324555) < 1e-5, f"第 2 个相似度约为 0.6325，实际 {scores[2]}"
`,
        answer: `import numpy as np

docs = np.array([
    [1.0, 0.0, 1.0],
    [0.0, 2.0, 0.0],
    [1.0, 1.0, 0.0],
], dtype=float)
q = np.array([1.0, 0.0, 0.5])

def l2norm(x):
    return x / (np.linalg.norm(x, axis=-1, keepdims=True) + 1e-12)

docs_norm = l2norm(docs)
q_norm = l2norm(q)
scores = docs_norm @ q_norm
`,
        explanation:
          '`np.linalg.norm(x, axis=-1, keepdims=True)` 是关键：`axis=-1` 沿最后一维求范数，`keepdims=True` 让结果保持 `[..., 1]` 形状，才能与 `[..., d]` 广播相除。好处是同一个函数既能处理 [N, d] 也能处理 [d]。若省略 keepdims，形状变成 `[...]`，会按错误的轴广播。',
        tags: ['embedding', '余弦相似度', 'numpy', '检索'],
      },
      {
        id: 'llm-a1-c1-e14',
        relatedLessonId: 'llm-a1-c1-l4',
        type: 'code',
        difficulty: 2,
        question:
          '词表统计与 token 成本估算：给定一组文本 `docs`：\n\n1. 把全部文档拼成一段文本并转小写；\n2. 用正则 `[a-z0-9]+` 切出所有 token（自动去掉标点）；\n3. 统计去重并**按字母序**排序的词表 `vocab`、词表大小 `vocab_size`、总 token 数 `total_tokens`；\n4. 额外预留 500 个特殊 token，得到 `final_vocab_size`。',
        starterCode: `import re

docs = [
    "Attention is all you need.",
    "Retrieval augmented generation retrieves, then generates!",
    "Attention over tokens: is that all?",
]

# 1 与 2：拼接 + 小写 + 正则切词
tokens = ___

# 3：词表、词表大小、总 token 数
vocab = ___
vocab_size = ___
total_tokens = ___

# 4：额外预留 500 个特殊 token
final_vocab_size = ___
`,
        setupCode: '',
        expectedOutput: 'vocab_size = 14, total_tokens = 17, final_vocab_size = 514',
        tests: `assert vocab_size == 14, f"vocab_size 应为 14，实际 {vocab_size}"
assert total_tokens == 17, f"total_tokens 应为 17，实际 {total_tokens}"
assert final_vocab_size == 514, f"final_vocab_size 应为 514，实际 {final_vocab_size}"
assert "attention" in vocab and "Attention" not in vocab, "词表应统一小写"
assert "tokens" in vocab and "tokens:" not in vocab, "冒号应被去掉"
assert vocab == sorted(vocab), "vocab 必须按字母序排列"
assert len(vocab) == len(set(vocab)), "vocab 应去重"
`,
        answer: `import re

docs = [
    "Attention is all you need.",
    "Retrieval augmented generation retrieves, then generates!",
    "Attention over tokens: is that all?",
]

tokens = re.findall(r"[a-z0-9]+", " ".join(docs).lower())
vocab = sorted(set(tokens))
vocab_size = len(vocab)
total_tokens = len(tokens)
final_vocab_size = vocab_size + 500
`,
        explanation:
          '`re.findall(r"[a-z0-9]+", text.lower())` 一步完成"小写 + 只保留字母数字"，比手工 strip 各种标点可靠得多。总 token 数为 17（含重复词），去重后词表为 14 个（重复的是 attention、is、all、you 中的一部分）。`set` 会丢失顺序，所以必须 `sorted(...)`。真实 tokenizer 的词表还包括子词片段与特殊 token，这里刻意简化为词级，突出"词表就是去重后的单元集合"这一本质。',
        tags: ['tokenizer', '词表', '正则'],
      },
      {
        id: 'llm-a1-c1-e15',
        type: 'single',
        difficulty: 1,
        question: '关于 token 数量统计，下列说法正确的是？',
        options: [
          { value: 'A', text: 'token 数总等于字符数' },
          { value: 'B', text: '同一段文本在不同 tokenizer 下的 token 数可能相差 1 倍以上' },
          { value: 'C', text: 'token 数总等于空格分开的词数' },
          { value: 'D', text: '中文一个字符永远只占 1 个 token' },
        ],
        answer: 'B',
        explanation:
          'token 数取决于词表与合并规则。英文主导的 tokenizer 处理中文时常常一字 1~3 个 token，而中文优化过的词表可能多个字合成一个 token。因此计费、截断都必须用目标模型自己的 tokenizer 实测。',
        relatedLessonId: 'llm-a1-c1-l4',
        tags: ['tokenizer', '成本'],
      },
      {
        id: 'llm-a1-c1-e16',
        type: 'multiple',
        difficulty: 2,
        question: '在 RAG 系统中使用 embedding 时，下列哪些做法是正确的？（多选）',
        options: [
          { value: 'A', text: '建索引与在线查询使用同一个 embedding 模型及同一版本' },
          { value: 'B', text: '对向量做 L2 归一化后，用内积等价实现余弦相似度' },
          { value: 'C', text: '更换模型时全量重建向量索引' },
          { value: 'D', text: '为了节省存储，把 4096 维向量截断成前 512 维' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 是错误的：稠密向量的维度是联合训练出来的，任意截断会破坏语义结构（除非模型本身使用 Matryoshka 这类可截断表示学习）。A、B、C 都是检索系统的铁律。',
        relatedLessonId: 'llm-a1-c1-l2',
        tags: ['embedding', 'RAG', '工程'],
      },
      {
        id: 'llm-a1-c1-e17',
        type: 'judge',
        difficulty: 1,
        question: '大语言模型能够像计算器一样精确处理任意位数的整数乘法，因为它内部使用浮点运算。',
        answer: false,
        explanation:
          '数字会被 tokenizer 切成若干子 token，模型无法保证逐位对齐，位数越多错误率越高。精确算术应外置为工具调用（calculator 或代码解释器），这也是 Agent 设计的典型动机。',
        relatedLessonId: 'llm-a1-c1-l3',
        tags: ['tokenizer', '数字表示'],
      },
      {
        id: 'llm-a1-c1-e18',
        type: 'fill',
        difficulty: 2,
        question: '计算上下文窗口的文档预算：窗口 128000，系统提示与问题共 3000 token，预留输出 4000 token，安全余量 1000 token，每篇文档 1800 token。\n\n可放文档篇数 = 剩余预算整除单篇大小。先算出剩余预算，再填空：\n\n```python\nleft = 128000 - 3000 - 4000 - 1000\nn = left ___ 1800\n```',
        blanks: [['//']],
        explanation:
          '剩余预算 = 120000，120000 // 1800 = 66（1800 × 66 = 118800，还剩 1200）。必须用整除 `//` 向下取整，绝不能用 `/` 或 `round`：后者会把 66.67 变成 67 篇，直接超窗口。',
        relatedLessonId: 'llm-a1-c1-l4',
        tags: ['上下文预算', '工程'],
      },
      {
        id: 'llm-a1-c1-e19',
        relatedLessonId: 'llm-a1-c1-l3',
        type: 'open',
        difficulty: 2,
        question:
          '某团队做中文知识库问答，所用模型的 tokenizer 主要由英文语料训练而成，实测成本很高且经常超出上下文窗口。请分析原因，并给出至少 3 条可落地的优化建议。',
        referenceAnswer: `**原因分析**

1. **中文字符碎片化**：英文主导的 BPE 词表里中文词几乎都以单字甚至字节碎片为单位，一句话的 token 数可能达到字符数的 1.5~3 倍；
2. **上下文被迅速占满**：同样的 4000 字文档，在中文友好的 tokenizer 上可能是 2500 token，在此模型上要 7000 以上，超出预算被截断，关键信息丢失；
3. **成本与延迟双高**：输入 token 多导致计费增加，注意力与 KV cache 随序列变长而超线性变慢；
4. **截断位置不可控**：按字符截断再 encode，无法保证不超过窗口，线上报上下文超长。

**优化建议**

1. **换 tokenizer 更优的模型**（中文优化词表的模型），或对自有模型做词表扩容并继续预训练；
2. **按 token 切分与截断**：chunking 阶段就用目标 tokenizer 计数，存 token 数元数据；
3. **压缩检索上下文**：提高检索精度只保留 top-k、加重排、对文档做抽取式压缩，或先摘要再问答；
4. **利用 prompt caching**：重复的系统提示放在最前，命中缓存后输入单价大幅下降；
5. **控制输出长度**：设置合理的最大输出 token，并用结构化输出减少冗余；
6. **建立统一的 token 预算服务**：封装"窗口减系统提示减输出预留"的计算，避免各业务线各写一套。`,
        rubric: [
          { point: '指出中文字符在英文 tokenizer 下被碎片化、token 数膨胀', score: 2 },
          { point: '说明成本、延迟、上下文截断三种影响如何传导', score: 2 },
          { point: '给出按 token 切分或统一预算管理这类工程手段', score: 1 },
          { point: '给出换模型、词表扩容、压缩上下文、缓存等系统级建议', score: 1 },
        ],
        keywords: ['token', '碎片', '词表', '上下文', '成本', '截断', '缓存', '压缩'],
        explanation:
          '本题考察"分词 → 成本 → 上下文"的因果链。能从现象（贵、超长）倒推到机制（子词碎片化），再给出系统化方案的回答质量最高。',
        tags: ['tokenizer', '成本优化', '工程'],
      },
      {
        id: 'llm-a1-c1-e20',
        relatedLessonId: 'llm-a1-c1-l2',
        type: 'open',
        difficulty: 2,
        question:
          '请解释为什么 Word2Vec / GloVe 这类静态词向量无法处理一词多义，而 Transformer 可以。并说明在 RAG 检索场景中如何利用这一区别。',
        referenceAnswer: `**静态词向量的局限**

Word2Vec / GloVe 为词表里每个词分配**唯一**一个向量，与上下文无关。
例如 bank 在 river bank 与 bank account 中映射到同一个向量，
这个向量是多种含义的加权平均（多义被"压平"），无法区分。

**Transformer 的上下文表示**

1. 每个位置先由 embedding 查表得到初始向量，再经过多层自注意力；
2. 注意力权重由当前整段上下文动态计算，因此同一个 token 在不同句子里得到**不同的输出向量**（contextual embedding）；
3. 有了上下文向量，指代消解、多义词区分都成为自然结果。

**RAG 场景中的用法**

1. **文档侧用长文本 embedding 模型**：它们是基于 Transformer 的上下文编码器，把整段文本池化为一个向量；
2. **查询改写**：用 LLM 先把模糊问题改写成语义明确的检索式，缓解"查询短、文档长"的语义鸿沟；
3. **混合检索**：embedding 负责语义，BM25 负责关键词与专有名词，两者互补；
4. **重排序**：cross-encoder 把 query 与 passage 一起送入 Transformer，逐 token 交互打分，精度显著高于双塔检索，用于精排 top-50 的结果。`,
        rubric: [
          { point: '说明静态词向量一个词只有一个向量、多义被平均', score: 2 },
          { point: '说明 Transformer 通过注意力产生上下文相关的表示', score: 2 },
          { point: '结合 RAG 说明双塔检索、查询改写或重排的使用方式', score: 2 },
        ],
        keywords: ['一词多义', '上下文', '注意力', 'contextual', 'RAG', '重排', '双塔'],
        explanation:
          '关键对比：静态向量把"词 → 向量"看成一个查表函数，而 Transformer 的"词 → 向量"是当前句子与位置的函数。理解这一点，RAG 的检索、重排、改写三板斧就顺理成章。',
        tags: ['embedding', '上下文', 'RAG'],
      },
    ],
  },
  {
    id: 'llm-a1-c2',
    title: 'Transformer 全景导航：一张图看懂整个 GPT',
    goal: '建立 GPT 的完整结构地图：知道一个 token 从输入到输出要经过哪些零件、每个零件解决什么问题、分别在第几章深入，并理解「先有地图再拆零件」为什么比「逐个零件硬背」更有效。',
    lessons: [
      {
        id: 'llm-a1-c2-l1',
        title: '一张图看懂 GPT：数据流全景与学习路线',
        difficulty: 2,
        content: `
## 学习目标

学完本节，你应该能够：
1. 画出一个 token 从输入到输出的**完整数据流**，并标出每一步的张量形状变化；
2. 说出 GPT 的 7 个核心零件各自「解决什么问题」，并指出它们分别在第几章深入；
3. 解释为什么本课程采用「先看全景地图、再逐个拆零件」的顺序，以及这种顺序对理解复杂系统的价值。

## 前置知识

- 第 1 章：分词、Embedding 与词表（token 怎么变成向量）；
- 会读矩阵乘法的形状标注（如 $[n, d] \\times [d, d] = [n, d]$）。

## 问题背景：为什么大多数人学 Transformer 会卡住

如果你搜「Transformer 原理」，会看到这样的路径：先讲自注意力公式，再讲多头，再讲位置编码，再讲 LayerNorm……每个概念都有一堆公式，但**你不知道它们在整台机器里的位置**。

结果就是：每个零件都「看懂了」，但合起来仍然不知道 GPT 是怎么工作的。这就像拿到一箱汽车零件和 7 份零件说明书，却从没见过整车。

**本课程的处理方式不同**：这一节先给你**整车图**（数据流 + 零件清单 + 学习路线），后面 c3-c12 才是逐个零件的详细拆解。带着地图去看零件，你会发现每个公式都在回答一个你已经知道的问题。

## 直觉理解：装修房子先看户型图

装修时，师傅不会一上来就研究「这颗螺丝怎么拧」。他会先看**户型图**：

- 哪里是承重墙（不能动）；
- 水电走哪条线（顺序不能错）；
- 每个房间干什么用（功能划分）。

然后才讨论「这块瓷砖怎么贴」。

GPT 也一样。**数据流就是户型图**：token 从哪进、经过哪些房间、从哪出。先记住这张图，后面每个零件的细节都会自动挂到图上。

## 核心概念与原理详解

### 完整数据流：一个 token 的一生

假设输入是 \`"今天天气"\`，模型要做的是预测下一个 token。

| 步骤 | 操作 | 形状变化 | 通俗解释 |
| --- | --- | --- | --- |
| ① 分词 | 文本 → token ID | \`"今天天气"\` → \`[1234, 5678]\` | 把文字切成词表里的编号 |
| ② Embedding | ID → 向量 | \`[2]\` → \`[2, 768]\` | 每个编号查表得到 768 维向量 |
| ③ 位置编码 | 加位置信息 | \`[2, 768]\` → \`[2, 768]\` | 告诉模型「谁在前谁在后」 |
| ④ × N 层 Block | 注意力 + FFN | \`[2, 768]\` → \`[2, 768]\` | 核心加工，重复 N 次（GPT-2 是 12 层） |
| ⑤ 最终 LayerNorm | 归一化 | \`[2, 768]\` → \`[2, 768]\` | 稳定数值 |
| ⑥ 输出投影 | 向量 → logits | \`[2, 768]\` → \`[2, 50257]\` | 每个词表 token 一个分数 |
| ⑦ Softmax | logits → 概率 | \`[2, 50257]\` → \`[2, 50257]\` | 变成概率分布，取最后一个位置 |

**关键观察**：形状在第 ④ 步**完全不变**（\`[2, 768]\` 进、\`[2, 768]\` 出）。这就是 Transformer 能「堆很多层」的根本原因——**每层的输入输出形状相同，所以可以无脑叠加**。

### 七个核心零件与它们解决的问题

| # | 零件 | 解决什么问题 | 深入章节 |
| --- | --- | --- | --- |
| 1 | **Embedding** | 离散 ID 无法做数学运算 | c3（嵌入层与位置编码） |
| 2 | **位置编码** | 注意力本身对顺序无感知 | c3-l2 / c3-l3 |
| 3 | **自注意力** | 让每个 token 看到其他 token（上下文） | c4（自注意力机制） |
| 4 | **多头注意力** | 单一注意力只能学一种关系 | c5（多头注意力） |
| 5 | **残差 + LayerNorm** | 深层网络梯度消失、训练不稳定 | c6（残差与归一化） |
| 6 | **FFN** | 注意力只做加权平均，缺非线性变换能力 | c7（FFN 与前馈网络） |
| 7 | **Block 与 Stack** | 怎么把零件组装成整机 | c8 / c9 |

### 一个 Block 的内部结构（这是全课最该记住的图）

现代 GPT 用的是 **Pre-LN** 结构，一个 Block 内部是：

\`\`\`
输入 x  [n, d]
  │
  ├─────────────────┐（残差旁路）
  ↓                 │
LayerNorm           │
  ↓                 │
多头注意力           │
  ↓                 │
  ⊕ ←───────────────┘   x = x + Attention(LN(x))
  │
  ├─────────────────┐（残差旁路）
  ↓                 │
LayerNorm           │
  ↓                 │
FFN                 │
  ↓                 │
  ⊕ ←───────────────┘   x = x + FFN(LN(x))
  │
输出 x  [n, d]   ← 形状与输入完全相同
\`\`\`

两条**残差旁路**（⊕）是深层网络能训起来的关键：梯度可以沿着旁路直接回传，不必穿过所有非线性层。

### 为什么「先地图后零件」

| 学习顺序 | 效果 |
| --- | --- |
| 直接背公式 | 每个公式都孤立，合起来不知道干什么；遇到报错不知道查哪 |
| **先看地图，再拆零件** | 每个公式都能回答「我在解决哪个已知问题」；调试时知道该看哪一步 |

具体好处有三个：

1. **可定位**：代码报错说「shape mismatch at attention」，你立刻知道是第 ④ 步的问题；
2. **可取舍**：知道 FFN 占 2/3 参数，就理解为什么 MoE 要拆 FFN 而不是拆注意力；
3. **可迁移**：LLaMA、Qwen、DeepSeek 都是这张图的变体（换 RoPE、换 RMSNorm、换 SwiGLU），有图就能快速对照。

### 关键术语（中英对照）

| 中文 | 英文 | 本课程口径 |
| --- | --- | --- |
| 分词 | Tokenization | 文本切成 token ID 的过程 |
| 嵌入 | Embedding | ID → 稠密向量的查表 |
| 自注意力 | Self-Attention | 序列内部各位置互相加权 |
| 前馈网络 | FFN / MLP | 逐位置的两层全连接 + 激活 |
| 残差连接 | Residual Connection | \`x + f(x)\`，让梯度直通 |
| 层归一化 | LayerNorm | 逐 token 归一化，稳定训练 |
| 预归一化 | Pre-LN | 归一化放在子层**之前**（现代主流） |
| 层堆叠 | Stacking | 把 N 个 Block 串起来 |

## 机制图解

<Diagram type="arch" name="transformer-block" />

上图就是本节的核心：一个 Block 的数据流。请注意三件事——

1. **两个残差旁路**（虚线）绕过子层，让梯度可以直通；
2. **两个 LayerNorm 都在子层之前**（Pre-LN），这是现代 GPT 的默认做法；
3. **输入输出形状完全相同**（都是 \`[n, d]\`），所以可以堆任意多层。

把这张图和上面的「七步数据流」对照看：④ 就是把这个 Block 重复 N 次。

## 完整案例：GPT-2 Small 的参数账

用这张地图算一遍 GPT-2 Small（12 层、768 维、12 头、词表 50257）的参数分布：

| 零件 | 计算公式 | 参数量 | 占比 |
| --- | --- | --- | --- |
| Embedding | 50257 × 768 | 38.6 M | 28.6% |
| 位置编码 | 1024 × 768 | 0.79 M | 0.6% |
| 每层注意力（QKVO） | 4 × 768 × 768 | 2.36 M | — |
| 每层 FFN | 2 × 768 × 3072 | 4.72 M | — |
| **每层合计** | 2.36 + 4.72 | **7.08 M** | — |
| 12 层合计 | 12 × 7.08 | 84.9 M | 62.9% |
| 最终 LayerNorm | 2 × 768 | 0.0015 M | ≈0% |
| **总计** | | **≈ 124 M** | 100% |

两个读数：

1. **FFN 占每层参数的 2/3**（4.72 / 7.08）。这就是为什么 MoE（把 FFN 拆成多个专家）能大幅扩容而计算量几乎不变——它动的是最大那块。
2. **Embedding 占了近 30%**，但它只做查表，不参与「思考」。所以小模型（如 Qwen3-0.6B）里 Embedding 的占比会更高，而大模型里会被摊薄。

## 代码实践

下面的演示做三件事：

1. 用 numpy 搭一个**只有形状、没有训练**的「空壳 GPT」，把上面七步数据流走一遍，打印每一步的形状；
2. 统计各零件的参数量，验证上面的 2/3 结论；
3. 验证一个关键性质：**Block 的输入输出形状相同**（这是能堆叠的前提）。

这个「空壳模型」是后面所有章节的骨架——c3-c9 会把每一步替换成真实实现。

## 常见误区与安全风险

1. **「位置编码是给 token 加一个位置向量，所以注意力就知道顺序了」**。位置编码只是把位置信息**混进**输入；注意力本身仍是「无序的加权平均」。模型能不能利用位置信息，取决于它是否学到了相应模式（c3-l3 会对比三种方案的差别）。
2. **「层数越多越好」**。层数增加会带来梯度问题与显存问题，需要残差 + 归一化配合（c6 的主题）；而且收益会递减（c9 会给出参数量与效果的关系）。
3. **「注意力是模型里参数最多的部分」**。错。FFN 占每层 2/3 的参数，注意力只占 1/3（见上表）。这个误解会直接导致你在优化时选错方向。
4. **安全提示**：本节代码是「空壳模型」，只有形状没有训练。不要以为跑通它就等于会训 GPT——真正的训练需要反向传播（llm-a2 课程）与数据。

## 与其他知识点的关联

- **向前**：第 1 章的分词与 Embedding 是数据流的第 ①② 步；
- **向后**：c3-c9 逐个拆解本节地图上的零件；c10 加载预训练权重（把「空壳」填成真模型）；c11 文本生成（把 logits 变成文字）；c12 可解释性（看内部在做什么）；
- **再往后**：本课程止步于「搭出基座模型」，而 c13-c16（推理模型）会在这个基座上添加「思考」能力——那里你会用到本节的地图来理解 Qwen3 的结构；
- **平行**：本站《从 GPT-2 到 LLaMA》课程会讲这张图的现代变体（RoPE、RMSNorm、SwiGLU、GQA）；《大模型训练原理》会讲怎么训练它。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 七步数据流 | 分词 → Embedding → 位置 → N×Block → LN → 输出投影 → Softmax |
| 核心性质 | Block 输入输出形状相同（\`[n,d]\`），所以能任意堆叠 |
| 七个零件 | Embedding / 位置 / 自注意力 / 多头 / 残差+LN / FFN / Block |
| 参数分布 | FFN 占每层 2/3，Embedding 占全模型近 30% |
| 学习路线 | 先看地图（本节）→ 拆零件（c3-c9）→ 装成真机（c10-c11）→ 观察内部（c12） |
| 为什么这样学 | 可定位（报错知道查哪）、可取舍（知道哪块最大）、可迁移（LLaMA/Qwen 都是变体） |

## 参考资料与延伸阅读

> **来源类型：权威教材**
> - Vaswani et al. (2017). "Attention Is All You Need." *NeurIPS*——Transformer 原始论文，本课程全部零件的来源。
> - Radford et al. (2019). "Language Models are Unsupervised Multitask Learners."（GPT-2 技术报告）——本课程默认的模型配置（12 层/768 维/12 头/50257 词表）。
>
> **来源类型：权威教材**
> - Raschka, S. *Build a Large Language Model (From Scratch)*. Manning, 2024——本课程的章节顺序与「从零手写」理念参考了该书的结构；代码与示例为自主编写。
>
> **来源类型：原创**
> - 「装修先看户型图」类比、七步数据流表、七个零件对照表、参数账、空壳模型演示、本节全部习题。

## 动手实验

1. **画你自己的图**：不看本节的表，凭记忆画出七步数据流，标出每一步的形状（用 \`[n, d]\` 记法）。画完再对照，看漏了哪步。
2. **改配置算参数**：把 GPT-2 Small 的配置改成 24 层 / 1024 维 / 16 头，用本节的公式重算总参数量，并算出 FFN 的占比是否变化。
3. **找变体**：查一下 LLaMA 或 Qwen 的技术报告，找出它们相对本节这张图改了哪几个零件（提示：位置编码、归一化、激活函数、注意力结构）。

验收标准：你能不看笔记说出七步数据流、指出 FFN 与注意力的参数比例、并解释「为什么 Block 的输入输出形状必须相同」。
`,
        tips: [
          {
            kind: 'pitfall',
            text: '最常见的误解是「注意力是参数最多的部分」。实际上 FFN 占每层参数的 2/3（GPT-2 Small：4.72M vs 2.36M）。这个误解会让你在优化模型时选错方向——MoE 拆的就是 FFN。',
          },
          {
            kind: 'note',
            text: '本节只是地图，不是实现。看不懂某个零件是正常的——c3-c9 会逐个拆解。带着「它在整机哪个位置」的问题去读后面章节，效率会比直接背公式高得多。',
          },
          {
            kind: 'interview',
            text: '面试题：「画一下 Transformer 的结构」。高分答法不是背图，而是先说数据流（七步）、再说「Block 输入输出形状相同所以能堆叠」、最后点出 Pre-LN 与两个残差旁路的作用。',
          },
          {
            kind: 'performance',
            text: '「形状不变」这个性质有个直接工程后果：显存占用随层数线性增长（每层都要存激活值），而计算量也是线性增长。这就是为什么堆层比加宽更容易受显存限制。',
          },
        ],
        demos: [
          {
            title: '空壳 GPT：走一遍七步数据流并算参数账',
            lang: 'python',
            code: `import numpy as np

# ── GPT-2 Small 配置 ──
CFG = dict(vocab=50257, n_pos=1024, d=768, n_head=12, n_layer=12, d_ff=3072)

def shapes_demo():
    print("=== 七步数据流（形状追踪）===")
    n = 4  # 4 个 token
    print(f"  ① 分词:      \\"今天天气\\" -> token IDs, 长度 {n}")
    x = np.random.randn(n, CFG["d"]).astype(np.float32)
    print(f"  ② Embedding: [1,{n}] -> {x.shape}   （查表：每个 ID 变 {CFG['d']} 维向量）")
    print(f"  ③ 位置编码:  {x.shape} + pos -> {x.shape}   （形状不变，只是加上位置信息）")
    for i in range(2):
        y = block_forward(x, CFG)
        print(f"  ④ Block #{i+1}: {x.shape} -> {y.shape}   （形状不变！）")
        x = y
    print(f"  ⑤ 最终 LN:   {x.shape} -> {x.shape}")
    logits = x @ np.random.randn(CFG["d"], CFG["vocab"]).astype(np.float32) * 0.02
    print(f"  ⑥ 输出投影:  {x.shape} -> {logits.shape}   （每个词表 token 一个分数）")
    probs = softmax(logits)
    print(f"  ⑦ Softmax:   {logits.shape} -> {probs.shape}   （最后一维变成概率）")
    print(f"\\n  下一个 token 的预测来自最后一行: argmax = {int(probs[-1].argmax())}")
    return x, logits

def softmax(z):
    z = z - z.max(axis=-1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=-1, keepdims=True)

def ln(x, eps=1e-5):
    mu = x.mean(axis=-1, keepdims=True)
    var = x.var(axis=-1, keepdims=True)
    return (x - mu) / np.sqrt(var + eps)

def block_forward(x, cfg, seed=0):
    """Pre-LN Block：x = x + Attn(LN(x)); x = x + FFN(LN(x))"""
    rng = np.random.default_rng(seed)
    d = cfg["d"]
    # 注意力（用随机权重代替，只看形状）
    h = ln(x)
    attn_out = h @ rng.standard_normal((d, d)).astype(np.float32) * 0.02
    x = x + attn_out
    # FFN
    h = ln(x)
    f1 = h @ rng.standard_normal((d, cfg["d_ff"])).astype(np.float32) * 0.02
    f1 = np.maximum(f1, 0)  # ReLU
    f2 = f1 @ rng.standard_normal((cfg["d_ff"], d)).astype(np.float32) * 0.02
    x = x + f2
    return x

def param_account(cfg):
    print("\\n=== 参数账（验证 FFN 占每层 2/3）===")
    emb = cfg["vocab"] * cfg["d"]
    pos = cfg["n_pos"] * cfg["d"]
    attn = 4 * cfg["d"] * cfg["d"]
    ffn = 2 * cfg["d"] * cfg["d_ff"]
    per_layer = attn + ffn
    total = emb + pos + cfg["n_layer"] * per_layer + 2 * cfg["d"]
    print(f"  Embedding      {emb/1e6:8.2f} M  ({emb/total*100:5.1f}%)")
    print(f"  位置编码        {pos/1e6:8.2f} M  ({pos/total*100:5.1f}%)")
    print(f"  每层注意力      {attn/1e6:8.2f} M  （占每层 {attn/per_layer*100:.1f}%）")
    print(f"  每层 FFN        {ffn/1e6:8.2f} M  （占每层 {ffn/per_layer*100:.1f}%）")
    print(f"  {cfg['n_layer']} 层合计       {cfg['n_layer']*per_layer/1e6:8.2f} M  ({(cfg['n_layer']*per_layer)/total*100:5.1f}%)")
    print(f"  总计            {total/1e6:8.2f} M")
    print(f"\\n  → FFN 占每层 {ffn/per_layer*100:.1f}%，注意力只占 {attn/per_layer*100:.1f}%")
    print(f"  → 这就是 MoE 拆 FFN 而不拆注意力的原因")
    assert ffn > attn * 1.5, "FFN 参数应显著多于注意力"
    return total

x, logits = shapes_demo()
total = param_account(CFG)

# ── 核心性质验证：Block 输入输出形状相同 ──
print("\\n=== 核心性质：Block 形状不变（所以能堆叠）===")
a = np.random.randn(6, CFG["d"]).astype(np.float32)
b = block_forward(a, CFG)
print(f"  输入 {a.shape} → 输出 {b.shape}")
assert a.shape == b.shape, "Block 必须保持形状不变"
print("  [OK] 形状相同 → 可以无脑堆 N 层")
print(f"  [OK] 堆 12 层后参数量 {total/1e6:.1f}M，与 GPT-2 Small 的 124M 吻合")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-a1-c2-e1',
        type: 'single',
        difficulty: 1,
        question: 'GPT 中一个 Block 的输入输出形状关系是？',
        options: [
          { value: 'A', text: '输出比输入多一维（层数）' },
          { value: 'B', text: '输入输出形状完全相同' },
          { value: 'C', text: '输出的序列长度减半' },
          { value: 'D', text: '输出的隐藏维度翻倍' },
        ],
        answer: 'B',
        explanation:
          '形状不变（都是 [n, d]）是 Transformer 能任意堆叠的根本前提。正因为每层进出形状一致，才能把 N 个 Block 串起来而不需要额外的形状适配层。',
        tags: ['K', '架构'],
      },
      {
        id: 'llm-a1-c2-e2',
        type: 'fill',
        difficulty: 2,
        question:
          'GPT 的七步数据流依次是：分词 → ______ → 位置编码 → N×Block → 最终 LayerNorm → ______ → Softmax。',
        blanks: [['Embedding', '嵌入'], ['输出投影', 'output projection', 'lm_head']],
        explanation:
          '这一步序列是全课的骨架。注意「输出投影」把 [n, d] 映射到 [n, vocab]，是整个流程里唯一一次维度大变的地方。',
        tags: ['K', '架构'],
      },
      {
        id: 'llm-a1-c2-e3',
        type: 'judge',
        difficulty: 2,
        question: 'Transformer 中注意力模块的参数量比 FFN 更多。',
        answer: false,
        explanation:
          '反了。GPT-2 Small 中每层注意力约 2.36M、FFN 约 4.72M，FFN 占每层参数的 2/3。这个事实直接解释了为什么 MoE 选择拆 FFN 而不是拆注意力。',
        tags: ['U', '参数量'],
      },
      {
        id: 'llm-a1-c2-e4',
        type: 'multiple',
        difficulty: 2,
        question: '下面哪些零件属于一个标准 Transformer Block？',
        options: [
          { value: 'A', text: '多头自注意力' },
          { value: 'B', text: '前馈网络 FFN' },
          { value: 'C', text: '残差连接' },
          { value: 'D', text: '分词器（Tokenizer）' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          '分词器在模型之外，属于数据预处理（第 1 章）。Block 内部是「注意力 + FFN + 两处残差 + 两处 LayerNorm」。',
        tags: ['K', '架构'],
      },
      {
        id: 'llm-a1-c2-e5',
        type: 'code',
        difficulty: 3,
        question:
          '实现 \`param_account(cfg)\`：给定配置 dict（含 \`vocab\`、\`n_pos\`、\`d\`、\`n_layer\`、\`d_ff\`），返回各零件的参数量 dict，键为 \`embedding\`、\`pos\`、\`attn_per_layer\`、\`ffn_per_layer\`、\`total\`。\n\n公式：Embedding = vocab×d；位置 = n_pos×d；每层注意力 = 4×d×d（QKVO 四个投影）；每层 FFN = 2×d×d_ff；总计 = Embedding + 位置 + n_layer×(注意力+FFN) + 2×d（最终 LN）。',
        starterCode: `def param_account(cfg):
    pass

cfg = dict(vocab=50257, n_pos=1024, d=768, n_layer=12, d_ff=3072)
r = param_account(cfg)
print(r)`,
        expectedOutput: 'embedding≈38.6M, attn_per_layer≈2.36M, ffn_per_layer≈4.72M, total≈124M',
        tests: `cfg = dict(vocab=50257, n_pos=1024, d=768, n_layer=12, d_ff=3072)
r = param_account(cfg)
for k in ("embedding", "pos", "attn_per_layer", "ffn_per_layer", "total"):
    assert k in r, f"缺少键 \\{k\\}"
assert r["embedding"] == 50257 * 768, "Embedding 公式错"
assert r["attn_per_layer"] == 4 * 768 * 768, "注意力公式错"
assert r["ffn_per_layer"] == 2 * 768 * 3072, "FFN 公式错"
assert r["ffn_per_layer"] > r["attn_per_layer"] * 1.5, "FFN 应显著大于注意力"
expect = 50257*768 + 1024*768 + 12*(4*768*768 + 2*768*3072) + 2*768
assert r["total"] == expect, f"总计错：\{r[\'total\']\} vs \{expect\}"
assert 120e6 < r["total"] < 130e6, f"应约 124M，实际 \{r['total']/1e6:.1f\}M"`,
        answer: `def param_account(cfg):
    emb = cfg["vocab"] * cfg["d"]
    pos = cfg["n_pos"] * cfg["d"]
    attn = 4 * cfg["d"] * cfg["d"]
    ffn = 2 * cfg["d"] * cfg["d_ff"]
    total = emb + pos + cfg["n_layer"] * (attn + ffn) + 2 * cfg["d"]
    return dict(embedding=emb, pos=pos, attn_per_layer=attn,
                ffn_per_layer=ffn, total=total)`,
        explanation:
          '注意「4×d×d」是 Q、K、V、O 四个投影矩阵；「2×d×d_ff」是 FFN 的升维与降维两个矩阵。算完之后对比 FFN 与注意力的比值（本配置约 2:1），就能理解 MoE 的设计动机。',
        tags: ['D', '参数量'],
      },
      {
        id: 'llm-a1-c2-e6',
        type: 'open',
        difficulty: 3,
        question:
          '一位同学说：「我把 Transformer 的每个零件都学了一遍——自注意力公式会推、多头会写、位置编码也懂，但拿到一个 GPT 代码还是看不懂。」\n\n请回答：\n① 他卡住的根本原因是什么？\n② 「先看全景地图再拆零件」为什么能解决这个问题？至少给出 3 个具体好处。\n③ 如果你要给他画一张最简地图，你会画哪几层信息？',
        referenceAnswer: `① 根本原因：
- **知识是碎片化的**：每个零件都懂，但不知道它们在整机中的**位置、顺序、接口**；
- **缺少数据流概念**：不知道「一个 token 从输入到输出经过哪些步骤、每步形状怎么变」；
- **缺少「为什么需要它」的问题背景**：公式会推，但不知道这个零件在解决什么问题，所以看到代码里的某一行无法对应到「它在干哪件事」；
- 类比：认识每个汽车零件，但从没见过整车装配图，所以看到发动机舱还是不知道哪根管子接哪。

② 三个具体好处：
- **可定位**：知道七步数据流后，代码报 \`shape mismatch\` 你能立刻判断是第几步的问题（例如 attention 里 \`[n,d]\` 与 \`[d,n]\` 搞反）；
- **可取舍**：知道 FFN 占 2/3 参数，就理解为什么 MoE 拆 FFN；知道 Embedding 占近 30%，就理解为什么小模型词表要压缩；
- **可迁移**：LLaMA/Qwen 都是这张图的变体（RoPE 换位置编码、RMSNorm 换 LayerNorm、SwiGLU 换 FFN），有图就能快速对照差异，而不是从零重学；
- （可加分）**可调试**：知道残差旁路存在，就能理解为什么深层网络梯度不会消失，也能定位「梯度爆炸」可能出在哪。

③ 最简地图应包含三层信息：
- **层 1：数据流**（七步 + 每步形状）——这是骨架；
- **层 2：零件清单**（每个零件解决什么问题 + 对应章节/代码位置）——这是索引；
- **层 3：一个 Block 的内部结构**（Pre-LN、两个残差旁路）——这是最需要记住的细节，因为所有变体都在这里改。
（可选层 4：参数账，用来建立「哪块最大」的直觉。）`,
        rubric: [
          { point: '① 指出「碎片化、缺数据流、缺问题背景」至少两点', score: 3 },
          { point: '② 给出至少 3 个具体好处（可定位/可取舍/可迁移/可调试）', score: 3 },
          { point: '② 好处要具体到可操作的场景（如「报错时知道查哪一步」）', score: 2 },
          { point: '③ 地图含数据流、零件清单、Block 内部结构三层信息', score: 2 },
        ],
        keywords: ['数据流', '碎片化', '可定位', '可迁移', '残差', 'Pre-LN', '形状'],
        explanation:
          '这道题考的是「学习方法」本身。评分重点在②——能不能把「先看地图」这个建议落到具体场景（调试、取舍、迁移），而不是泛泛说「有助于理解」。',
        tags: ['U', '方法论'],
      },
      {
        id: 'llm-a1-c2-e7',
        type: 'fill',
        difficulty: 3,
        question:
          '现代 GPT 使用 Pre-LN 结构，一个 Block 的两条子层公式是：x = x + ______(LN(x)) 与 x = x + ______(LN(x))。两条虚线旁路叫______连接。',
        blanks: [['Attention', '多头注意力', 'attn'], ['FFN', '前馈网络', 'mlp'], ['残差', 'residual']],
        explanation:
          'Pre-LN 的「Pre」指归一化在子层之前。残差连接让梯度沿旁路直通，是深层网络能训练的关键（c6 会详细推导为什么）。',
        tags: ['K', 'Pre-LN'],
      },
      {
        id: 'llm-a1-c2-e8',
        type: 'judge',
        difficulty: 3,
        question: '只要把 Transformer 的层数堆得足够多，模型效果就会一直提升。',
        answer: false,
        explanation:
          '层数增加会遇到梯度消失/爆炸与显存瓶颈（需要残差 + 归一化配合），而且收益递减。真正的容量规划要看数据量、训练步数与 Scaling Laws（《大模型训练原理》课程）。',
        tags: ['U', '误区'],
      },
    ],
  },

  ...llmA1Extra,
  ...llmA1Extra2,
  ...llmA1C13Chapters,
  ...llmA1C14Chapters,
  ...llmA1C15Chapters,
  ...llmA1C16Chapters,
];
