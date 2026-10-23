import type { Chapter } from '../../types';
import { llmA1Extra } from './llm-a1-extra';
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
    title: 'Transformer 架构详解',
    goal: '从数学推导出发完整理解自注意力、多头、位置编码、归一化、FFN 与因果掩码，并能用 numpy 亲手实现这些核心模块。',
    lessons: [
      {
        id: 'llm-a1-c2-l1',
        title: '自注意力：QKV、缩放点积与掩码',
        content: `
## 注意力的直觉：带权重的"信息检索"

注意力机制回答的问题是：**当前位置应该从哪些位置读取信息，各读取多少？** Vaswani 等人（2017）给出的答案是软检索（soft lookup）：

Attention(Q, K, V) = softmax(Q 乘以 K 的转置 / sqrt(d_k)) 乘以 V

其中 Q、K、V 三个矩阵由同一个输入 X（形状 [n, d]）线性变换而来：

- Q = X · W_Q：查询，表示当前 token "我在找什么"；
- K = X · W_K：键，表示每个 token "我能提供什么"的索引标签；
- V = X · W_V：值，表示每个 token "我实际提供的信息"。

**必须理解的一点**：Q、K、V 来自**同一组输入**，所以叫"自"注意力。编码器-解码器结构里的交叉注意力则是 Q 来自解码器、K 和 V 来自编码器。

## 为什么除以 sqrt(d_k)

假设 Q、K 各分量独立、均值 0、方差 1，那么两者的点积是 d_k 项之和：

Var(q · k) = sum_i Var(q_i · k_i) = d_k

也就是点积的标准差是 sqrt(d_k)。当 d_k = 64 时，logits 可能落在正负 20 的区间，softmax 之后接近 one-hot，梯度趋近于零，训练会停滞。除以 sqrt(d_k) 把方差归一化回 1，使 softmax 处在"尖锐但不饱和"的工作区间。

这是 Transformer 相比此前加性注意力的核心工程改进之一。

## 注意力复杂度

Q 形状 [n, d_k]、K 形状 [m, d_k]，计算 Q 乘以 K 的转置需要 n·m·d_k 次乘加，softmax 与乘 V 各需 n·m 级别运算。总时间与内存都是 **O(n·m)**，对自注意力 m = n 即 **O(n 的平方)**。这就是"长上下文昂贵"的根本原因，也是 FlashAttention、稀疏注意力、线性注意力等研究方向的出发点。

## 因果掩码（causal mask）

GPT 类模型必须保证位置 t 只能看到小于等于 t 的 token，否则训练时就是"抄答案"。实现方式是在 softmax 之前把上三角位置加一个极大的负数：

- 当 j 小于等于 i 时，M[i][j] = 0；
- 当 j 大于 i 时，M[i][j] = -inf。

masked 注意力 = softmax(QK^T / sqrt(d_k) + M) 乘以 V

由于 exp(-inf) = 0，被屏蔽位置的权重严格为 0。**注意必须用 -1e9 或 -inf，而不是 0**：设为 0 只是让分数保持原值，权重仍会被分配出去。

## 工程细节：padding mask 与 causal mask 的叠加

batch 推理时，序列右侧补齐的 pad 位置也需要屏蔽。最终 mask 是两者的组合：

- causal：形状 [n, n]；
- padding：形状 [n]（哪些 key 位置有效），广播成 [1, n]；
- 合并后：形状 [n, n]，允许位置为 0、禁止位置为 -1e9。

## 手算一个例子

设 n = 2、d_k = 2，Q 为单位阵、K 为单位阵、V 取 [[10, 0], [0, 100]]：

- QK^T 是单位阵，除以 sqrt(2) 得对角 0.707；
- 无掩码时 softmax 每行是 [0.664, 0.336]，第 0 行输出约为 (6.64, 33.6)；
- 加上因果掩码后，第 0 行只剩自身，权重 [1, 0]，输出为 (10, 0)。

**因果掩码会显著改变每个位置的输出**。所以"共用同一份权重、只去掉 mask 就能当编码器用"在实践中行不通——两者学到的表示完全不同。

<SelfAttentionDemo />
`,
        tips: [
          {
            kind: 'pitfall',
            text: 'mask 必须加在 softmax **之前**，且用 -1e9 或负无穷。若用 `scores * mask`（mask 取 0/1）实现，被屏蔽位置分数变成 0，在其余分数为负时反而会拿到更高权重。',
          },
          {
            kind: 'interview',
            text: '为什么 QK 点积要除以 sqrt(d_k)？标准答法：独立同分布下点积方差为 d_k，不缩放会让 softmax 进入饱和区、梯度消失。',
          },
          {
            kind: 'performance',
            text: '朴素实现会完整物化 n×n 的注意力矩阵，显存 O(n 的平方)。FlashAttention 通过分块加在线 softmax 在片上缓存中完成计算，数学结果不变但省显存且更快。',
          },
          {
            kind: 'note',
            text: 'MHA、MQA、GQA 的区别只在 K 与 V 的头数：MQA 所有头共享一份 K 和 V，GQA 按组共享（LLaMA-2 70B、LLaMA-3 采用），精度接近 MHA 而显存大幅下降。',
          },
        ],
        demos: [
          {
            title: '纯 numpy 实现缩放点积注意力（含因果掩码）',
            lang: 'python',
            code: `import numpy as np

def softmax(x, axis=-1):
    x = x - x.max(axis=axis, keepdims=True)
    e = np.exp(x)
    return e / e.sum(axis=axis, keepdims=True)

def attention(q, k, v, causal=False):
    """q: [n, dk], k: [m, dk], v: [m, dv] -> [n, dv]"""
    dk = q.shape[-1]
    scores = q @ k.T / np.sqrt(dk)
    if causal:
        n, m = scores.shape
        mask = np.triu(np.ones((n, m), dtype=bool), k=1)
        scores = np.where(mask, -1e9, scores)
    w = softmax(scores, axis=-1)
    return w @ v, w

rng = np.random.default_rng(42)
n, dk = 4, 8
X = rng.normal(size=(n, dk))
Wq, Wk, Wv = (rng.normal(0, 0.5, size=(dk, dk)) for _ in range(3))
Q, K, V = X @ Wq, X @ Wk, X @ Wv

out_free, w_free = attention(Q, K, V, causal=False)
out_causal, w_causal = attention(Q, K, V, causal=True)

np.set_printoptions(precision=3, suppress=True)
print("无掩码注意力权重:")
print(w_free)
print("因果掩码注意力权重（下三角）:")
print(w_causal)
print("每行权重和:", w_causal.sum(axis=1))
print("被屏蔽位置权重全为 0:", bool(np.all(w_causal[np.triu_indices(n, 1)] == 0)))
print("第 0 个位置的输出仅依赖自身:", np.allclose(out_causal[0], V[0]))`,
          },
          {
            title: '缩放因子实验：为什么必须除以 sqrt(d_k)',
            lang: 'python',
            code: `import numpy as np

def softmax(x):
    x = x - x.max(axis=-1, keepdims=True)
    e = np.exp(x)
    return e / e.sum(axis=-1, keepdims=True)

rng = np.random.default_rng(0)
n = 8
for dk in (8, 64, 256, 1024):
    q = rng.normal(size=(n, dk))
    k = rng.normal(size=(n, dk))
    raw = q @ k.T
    scaled = raw / np.sqrt(dk)
    w_raw = softmax(raw)
    w_scaled = softmax(scaled)
    print(f"d_k={dk:5d}  原始 logits 标准差={raw.std():6.2f}  "
          f"原始最大权重均值={w_raw.max(axis=-1).mean():.3f}  "
          f"缩放后最大权重均值={w_scaled.max(axis=-1).mean():.3f}")

print()
print("结论：缩放后最大权重稳定在 1/n 附近，注意力保持分散，梯度不会饱和。")`,
          },
        ],
      },
      {
        id: 'llm-a1-c2-l2',
        title: '多头注意力：并行的多个子空间',
        content: `
## 单头注意力的问题

如果只用一组 W_Q、W_K、W_V，注意力只能在**一个**表示子空间里做加权平均。但语言中同时存在多种关系：语法依赖、指代、语义相似、位置邻近。单头注意力难以兼顾。

多头注意力的做法：把 d_model 维切成 h 份，每份维度 d_k = d_model / h，并行计算 h 个注意力，再拼接、线性投影。

head_i = Attention(X · W_i^Q, X · W_i^K, X · W_i^V)
MultiHead(X) = Concat(head_1, ..., head_h) · W_O

## 为什么总计算量几乎不变

看似做了 h 次注意力，但每份的维度只有 d_model / h：

- 单头：n·n·d_model；
- 多头：h 乘以 (n·n·d_model/h)，结果仍是 n·n·d_model。

**计算量相同**，但表达能力提升，因为不同的头可以关注不同模式。W_O（形状 [d_model, d_model]）负责把各头的输出融合回原来的空间。

## 头部维度与层数的通用配置

| 模型 | d_model | 头数 h | d_k | 层数 | 备注 |
| --- | --- | --- | --- | --- | --- |
| Transformer-base | 512 | 8 | 64 | 6 | 原论文 |
| GPT-3 175B | 12288 | 96 | 128 | 96 | 密集注意力 |
| LLaMA-2 7B | 4096 | 32 | 128 | 32 | GQA |
| LLaMA-3 8B | 4096 | 32 | 128 | 32 | 8 组 GQA |
| Qwen2.5 7B | 3584 | 28 | 128 | 28 | 4 组 GQA |

规律：**d_k 几乎总是 64 或 128**，头数随 d_model 线性增长。过小的 d_k 表达能力不足，过大的 d_k 在固定 d_model 下会减少头数，损失多样性。

## 形状变换：最容易写错的地方

输入 X 形状 [B, n, d_model]，要变成 [B, h, n, d_k] 才能批量并行。标准做法：

1. 线性投影得到 Q，形状 [B, n, d_model]；
2. reshape 为 [B, n, h, d_k]；
3. transpose 为 [B, h, n, d_k]，把"头"挪到 batch 维度旁边，使每个头独立做矩阵乘法。

注意 **reshape 与 transpose 的顺序不能互换**：先 transpose 再 reshape 会把不同头的维度交错混在一起，产生"头串味"的 bug 而且不会报错。

逆变换（输出侧）必须严格逆序：先 transpose 再 reshape。

## MQA 与 GQA：为 KV cache 减负

推理时每个头都要缓存 K 和 V。h 个头意味着缓存量正比于 h 乘以 d_k 再乘 2，即 2·d_model，并随序列长度线性增长。

- **MQA（Multi-Query）**：所有头共享同一组 K 和 V，缓存降为 1/h，效果略有下降；
- **GQA（Grouped-Query）**：把 h 个头分成 g 组，每组共享一组 K 和 V。g 等于 h 时退化为 MHA，g 等于 1 时退化为 MQA。

LLaMA-2 70B 与 LLaMA-3 8B 都用 8 组 GQA，是精度与显存的最佳折中。

## 多头真的"多样"吗

可解释性研究发现：部分头专门关注相邻 token（局部头），部分头关注句法核心词（如动词到主语），还有大量"重复头"或几乎不活跃的头。这说明多头确实学到了不同功能，但也存在冗余——这为剪枝与蒸馏提供了空间。

<MultiHeadDemo />
`,
        tips: [
          {
            kind: 'pitfall',
            text: 'reshape 与 transpose 的顺序写反是最隐蔽的 bug：形状对得上、loss 也能降，但每个头混入了其他头的维度，效果变差却难以定位。写完立刻做"单头等价性测试"：h=1 时多头应与单头完全一致。',
          },
          {
            kind: 'interview',
            text: 'MHA / MQA / GQA 必考。一句话总结：MQA 全部头共享 K 和 V，GQA 按组共享，目标都是在几乎不损失精度的情况下把 KV cache 从 h 份降到 g 份。',
          },
          {
            kind: 'performance',
            text: '实际实现中不要显式 repeat K 和 V（会复制显存），用 einsum 的广播或按组切分后的循环更省。',
          },
        ],
        demos: [
          {
            title: '多头注意力：拆分、并行计算、再拼接',
            lang: 'python',
            code: `import numpy as np

def softmax(x):
    x = x - x.max(axis=-1, keepdims=True)
    e = np.exp(x)
    return e / e.sum(axis=-1, keepdims=True)

def split_heads(x, h):
    """[B, n, d] -> [B, h, n, d/h]"""
    B, n, d = x.shape
    return x.reshape(B, n, h, d // h).transpose(0, 2, 1, 3)

def mha(X, Wq, Wk, Wv, Wo, h, causal=False):
    B, n, d = X.shape
    Q, K, V = X @ Wq, X @ Wk, X @ Wv
    Q, K, V = split_heads(Q, h), split_heads(K, h), split_heads(V, h)
    dk = d // h
    scores = Q @ K.transpose(0, 1, 3, 2) / np.sqrt(dk)
    if causal:
        mask = np.triu(np.ones((n, n), dtype=bool), k=1)
        scores = np.where(mask, -1e9, scores)
    ctx = softmax(scores) @ V
    ctx = ctx.transpose(0, 2, 1, 3).reshape(B, n, d)
    return ctx @ Wo

rng = np.random.default_rng(1)
B, n, d, h = 2, 5, 16, 4
X = rng.normal(size=(B, n, d))
W = [rng.normal(0, 0.3, size=(d, d)) for _ in range(4)]

out = mha(X, *W, h=h)
print("输入:", X.shape, " 输出:", out.shape)

out1 = mha(X, *W, h=1)
print("h=1 时输出形状:", out1.shape, " （可用来做单头等价性测试）")
print()
print("计算量 B*n*n*d =", B * n * n * d, " 多头并未增加这部分")
print("每个头的维度 d_k =", d // h)`,
          },
          {
            title: 'MHA、GQA、MQA 的 KV cache 体积对比',
            lang: 'python',
            code: `def kv_bytes(batch, seq_len, groups, d_kv, bytes_per=2):
    """KV cache 显存（FP16 每元素 2 字节），K 与 V 各一份。"""
    return batch * seq_len * groups * d_kv * 2 * bytes_per

batch, seq, h, d = 1, 32768, 32, 128
for name, g in (("MHA", h), ("GQA g=8", 8), ("GQA g=4", 4), ("MQA", 1)):
    b = kv_bytes(batch, seq, g, d)
    print(f"{name:10s} 组数={g:2d}  KV cache = {b / 1024**3:6.2f} GiB")

print()
print("注意：模型参数量几乎不变，只是推理时的缓存从 h 份降到 g 份。")
print("这就是 LLaMA-2/3 能支撑长上下文的关键工程手段。")`,
          },
        ],
      },
      {
        id: 'llm-a1-c2-l3',
        title: '位置编码：正弦、可学习与 RoPE',
        content: `
## 为什么需要位置信息

自注意力对输入顺序是**置换等变**的：打乱 token 顺序，输出只是跟着一起打乱。注意力计算中没有任何位置信息。对语言来说这是灾难——"狗咬人"和"人咬狗"不能等价。

解决方案是把位置信息注入表示。

## 方案一：正弦位置编码（原论文）

- 偶数维：PE(pos, 2i) = sin(pos / 10000^(2i/d))
- 奇数维：PE(pos, 2i+1) = cos(pos / 10000^(2i/d))

其中 pos 是位置，i 是维度序号。特点：

1. 不需要学习参数，理论上可外推到训练时未见过的长度；
2. 波长构成等比数列（从 2π 到 10000·2π），类似二进制计数，不同维度有不同分辨率；
3. 有相对位置性质：PE(pos + k) 可以表示为 PE(pos) 的线性变换，且变换矩阵与 pos 无关；
4. 直接与词向量**相加**。

## 方案二：可学习位置编码

BERT、GPT-2 直接把 pos_embedding 作为 [max_len, d] 的参数矩阵，与词向量相加后一起训练。

- 优点：完全自由，实践中效果略好；
- 缺点：**无法外推**，超出 max_len 的位置没有参数。上下文从 512 扩到 2048 就必须重新训练。位置插值（把 [512, d] 的表插值到 [2048, d]）是一种常见的扩展技巧。

## 方案三：RoPE（旋转位置编码）

Su 等人（2021）提出，被 LLaMA、Qwen、GLM 等主流开源模型采用。核心思想：**通过旋转 Q、K 向量来编码位置**。

把 d 维向量按前后半段（或相邻两维）配对，位置 m 的旋转角为 m·theta_i，其中 theta_i = 10000^(-2i/d)：

RoPE(x, m) 的前半段 = x1·cos(m·theta) - x2·sin(m·theta)
RoPE(x, m) 的后半段 = x1·sin(m·theta) + x2·cos(m·theta)

关键性质：两个位置的旋转后向量内积只依赖**相对位置**。

推导（记 R(a) 为角度 a 的旋转矩阵，它是正交矩阵）：

< R(m·theta) q, R(n·theta) k > = q 的转置 乘以 R(m·theta) 的转置 乘以 R(n·theta) 再乘以 k
= q 的转置 乘以 R((n - m)·theta) 再乘以 k

右侧只与 n - m 有关。

RoPE 无需额外参数；外推可通过调整 theta 基数（NTK-aware 插值、YaRN 等）实现。**RoPE 不改变向量范数**，因此与 RMSNorm 配合良好。

## ALiBi：另一种思路

ALiBi 不加位置编码，而是在注意力分数上减去一个与距离成正比的线性惩罚：score 减去 slope 乘以 (i - j)，不同头用不同 slope。这使"越远相关越弱"成为先验，天然支持外推。

## 对比总结

| 方案 | 参数 | 结合方式 | 外推能力 | 使用方 |
| --- | --- | --- | --- | --- |
| 正弦 | 无 | 与表示相加 | 中 | 原论文 |
| 可学习 | max_len 乘 d | 与表示相加 | 无 | BERT、GPT-2 |
| RoPE | 无 | 旋转 Q 和 K | 中（配插值可强） | LLaMA、Qwen |
| ALiBi | 少量 slope | 加在注意力分数上 | 强 | BLOOM、MPT |

## 常见误区

1. **以为位置编码给的是"绝对位置"**——RoPE 与正弦的核心价值在于相对位置；
2. **给 V 也做了 RoPE**——RoPE 只旋转 Q 和 K，V 不旋转；
3. **以为扩大上下文窗口只需改 max_len**——位置编码的外推能力才是瓶颈。

<PositionalEncodingDemo2 />
`,
        tips: [
          {
            kind: 'interview',
            text: 'RoPE 必考推导：旋转矩阵正交，所以 R(m) 的转置乘 R(n) 等于 R(n - m)，内积只含相对位置。答题时强调"旋转不改变范数"。',
          },
          {
            kind: 'pitfall',
            text: '正弦位置编码中频率的指数项是 2i/d，不是 2i/(d/2)。写成后者会让前半数维度频率翻倍，波长分布失衡。',
          },
          {
            kind: 'note',
            text: 'RoPE 有两种实现约定："相邻两维配对"（原论文、LLaMA）与"前后半段配对"（GPT-NeoX 风格）。两者不可混用，否则权重无法正确加载。',
          },
        ],
        demos: [
          {
            title: '正弦位置编码与相对位置性质',
            lang: 'python',
            code: `import numpy as np

def sinusoidal(n, d):
    pos = np.arange(n)[:, None]
    i = np.arange(0, d, 2)[None, :]
    ang = pos / (10000 ** (i / d))
    pe = np.zeros((n, d))
    pe[:, 0::2] = np.sin(ang)
    pe[:, 1::2] = np.cos(ang)
    return pe

pe = sinusoidal(64, 16)
print("形状:", pe.shape, " 前四行范数:", np.round(np.linalg.norm(pe, axis=1)[:4], 4))

def cos_sim(a, b):
    return float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b)))

print()
print("同样的相对距离 delta=5，在不同起点下的相似度几乎相同：")
for start in (0, 10, 20, 40):
    print(f"  cos(PE[{start}], PE[{start + 5}]) = {cos_sim(pe[start], pe[start + 5]):.4f}")

print()
print("位置 0 的编码前两维:", np.round(pe[0, :4], 3), "（sin(0)=0, cos(0)=1）")
print("每行范数恒定:", np.allclose(np.linalg.norm(pe, axis=1), np.linalg.norm(pe[0])))`,
          },
          {
            title: '手写 RoPE：旋转后内积只依赖相对位置',
            lang: 'python',
            code: `import numpy as np

def rope(x, positions, base=10000.0):
    """x: [n, d]，按 positions 旋转（前后半段配对）。"""
    n, d = x.shape
    half = d // 2
    theta = base ** (-np.arange(half) / half)
    ang = positions[:, None] * theta[None, :]
    cos, sin = np.cos(ang), np.sin(ang)
    x1, x2 = x[:, :half], x[:, half:]
    out = np.empty_like(x)
    out[:, :half] = x1 * cos - x2 * sin
    out[:, half:] = x1 * sin + x2 * cos
    return out

rng = np.random.default_rng(7)
d = 8
q = rng.normal(size=(1, d))
k = rng.normal(size=(1, d))

def inner(pos_q, pos_k):
    return float(rope(q, np.array([pos_q])) @ rope(k, np.array([pos_k])).T)

print("绝对位置不同但相对距离相同（delta=3）：")
for pq in (1, 10, 50, 100):
    print(f"  pos_q={pq:3d}, pos_k={pq + 3:3d}  ->  内积 = {inner(pq, pq + 3):+.6f}")

print()
print("相对距离不同（pos_q=10）：")
for delta in (0, 1, 5, 20):
    print(f"  delta={delta:2d}  ->  内积 = {inner(10, 10 + delta):+.6f}")

print()
print("旋转不改变范数:", np.isclose(np.linalg.norm(rope(q, np.array([37]))), np.linalg.norm(q)))`,
          },
        ],
      },
      {
        id: 'llm-a1-c2-l4',
        title: '残差、LayerNorm 与 RMSNorm：训练稳定的支柱',
        content: `
## 残差连接：让梯度直达底层

每个子层（注意力或 FFN）外面都包一层归一化与残差：

- Pre-LN 写法：y = x + Sublayer(Norm(x))；
- Post-LN 写法（原论文）：y = Norm(x + Sublayer(x))。

残差的作用是把"学一个完整映射 H(x)"变成"学残差 F(x) = H(x) - x"。当这一层没有可学的东西时，网络只需把 F 学成 0，恒等映射天然可达。

从梯度角度看，若 y = x + F(x)，则 dy/dx = I + dF/dx。反向传播时梯度沿恒等路径直接回流，不会因连乘而指数衰减。这是能把网络堆到 100 层以上的关键。

## LayerNorm 的数学

LayerNorm 对**每个 token 的 d_model 个特征**做归一化（不是跨 batch，也不是跨 token）：

mu = (1/d) 乘以 sum_i x_i
sigma^2 = (1/d) 乘以 sum_i (x_i - mu)^2
y_i = gamma_i 乘以 (x_i - mu) / sqrt(sigma^2 + eps) + beta_i

其中 gamma、beta 是可学习参数。

**为什么 NLP 用 LayerNorm 而不是 BatchNorm**：

1. 序列长度可变，batch 内特征统计不稳定；
2. 推理时 batch 可能只有 1 条，BatchNorm 依赖的 batch 统计量失效；
3. 自回归生成时每个时刻的分布不同，跨样本统计没有意义。

LayerNorm 与 batch 无关，这是它在序列模型中被采用的核心理由。

## RMSNorm：去掉均值中心化

LLaMA 等模型改用 RMSNorm（Zhang 与 Sennrich，2019）：

RMS(x) = sqrt((1/d) 乘以 sum_i x_i^2)
y_i = gamma_i 乘以 x_i / RMS(x)

相比 LayerNorm 去掉了"减去均值"和"加 beta"，只按均方根缩放。

- 计算更快（少一次求和与广播）；
- 参数更少（没有 beta）；
- **实测效果不差甚至更好**，说明 LayerNorm 的均值中心化在 Transformer 中并非必要。

LLaMA、Qwen、Gemma 等均使用 RMSNorm。

## Pre-LN 与 Post-LN

| 维度 | Post-LN（原论文） | Pre-LN（GPT-2 起主流） |
| --- | --- | --- |
| 形式 | Norm(x + Sublayer(x)) | x + Sublayer(Norm(x)) |
| 训练稳定性 | 需要 warmup，深层易发散 | 很稳定，可不用 warmup |
| 最终性能 | 同规模下略高 | 略低 |
| 残差路径 | 被归一化阻断 | **恒等路径**，梯度直通 |

**关键洞察**：Pre-LN 的残差是纯恒等连接，梯度可以从最后一层直达第一层；Post-LN 每层都要穿过一次归一化，深层网络的梯度传播受阻。

现代做法：Pre-LN 训练，并在最后加一层 Final Norm，否则输出分布不受控。

## 数值细节

- eps 一般取 1e-5 或 1e-6，防止方差为 0 时除零；
- 混合精度训练时 LayerNorm 与 Softmax 通常保持 FP32，因为 FP16 的表示范围在归一化中容易溢出；
- 计算方差时应先算均值再算偏差平方，直接用均值平方减均值方差的写法数值不稳定。

## 常见误区

1. 以为 LayerNorm 需要像 BatchNorm 那样维护滑动平均统计量——它只用当前样本的统计量；
2. 混淆归一化维度：**在特征维 d_model 上归一化**，每个 token 独立；
3. 以为 RMSNorm 需要 beta——它通常没有偏置项。
`,
        tips: [
          {
            kind: 'interview',
            text: '高频对比题：LayerNorm 与 BatchNorm 的区别。答题要落在"归一化维度不同，加上序列模型中 batch 统计不可靠"上，而不是只背公式。',
          },
          {
            kind: 'pitfall',
            text: '实现 LayerNorm 时不要用"均方减均值平方"求方差。当均值远大于标准差时会出现负方差导致 NaN，应先求均值再算平方偏差。',
          },
          {
            kind: 'note',
            text: 'Pre-LN 的最后必须加 Final Norm。LLaMA 的 output_norm 就是干这个的；忘记它会让 logits 尺度随层数漂移。',
          },
          {
            kind: 'performance',
            text: '在 FP16/BF16 混合精度下，LayerNorm 与 softmax 用 FP32 计算再转回，可显著减少训练时偶发的 loss 尖峰。',
          },
        ],
        demos: [
          {
            title: 'LayerNorm、RMSNorm、BatchNorm 的归一化维度对比',
            lang: 'python',
            code: `import numpy as np

np.set_printoptions(precision=3, suppress=True)
X = np.array([
    [1.0, 2.0, 3.0, 4.0],
    [10.0, 12.0, 14.0, 16.0],
    [0.5, -0.5, 0.5, -0.5],
])

def layer_norm(x, g=1.0, b=0.0, eps=1e-5):
    mu = x.mean(axis=-1, keepdims=True)
    var = ((x - mu) ** 2).mean(axis=-1, keepdims=True)
    return g * (x - mu) / np.sqrt(var + eps) + b

def rms_norm(x, g=1.0, eps=1e-6):
    rms = np.sqrt((x ** 2).mean(axis=-1, keepdims=True))
    return g * x / np.sqrt(rms ** 2 + eps)

def batch_norm(x, eps=1e-5):
    mu = x.mean(axis=0, keepdims=True)
    var = ((x - mu) ** 2).mean(axis=0, keepdims=True)
    return (x - mu) / np.sqrt(var + eps)

ln, rn, bn = layer_norm(X), rms_norm(X), batch_norm(X)
print("LayerNorm 每行均值:", ln.mean(axis=1), " 每行方差:", ln.var(axis=1))
print("RMSNorm   每行均值:", rn.mean(axis=1), " 每行均方根:", np.sqrt((rn ** 2).mean(axis=1)))
print("BatchNorm 每列均值:", bn.mean(axis=0))
print()
print("关键差异：LayerNorm 强行使每行均值为 0；RMSNorm 只统一尺度，保留偏移。")
print("BatchNorm 的统计量沿 batch 方向，推理时 batch=1 就无法使用。")`,
          },
          {
            title: '残差连接让梯度直达浅层（对比有无残差）',
            lang: 'python',
            code: `def coef(depth, use_residual, scale=0.9):
    """粗略模拟 L 层线性子层的梯度回传系数。"""
    return (1 + scale) ** depth if use_residual else scale ** depth

for depth in (5, 20, 50, 100):
    a = coef(depth, True)
    b = coef(depth, False)
    print(f"层数={depth:3d}  有残差系数={a:12.3e}   无残差系数={b:10.3e}")

print()
print("无残差时梯度随深度指数衰减，这是 20 层以上网络难以训练的直接原因。")
print("有残差时梯度近似等比例传递；真实网络靠 LayerNorm 与初始化把 (I + F') 的谱范数约束在 1 附近。")`,
          },
        ],
      },
      {
        id: 'llm-a1-c2-l5',
        title: 'FFN、编码器/解码器与一个完整的 Transformer Block',
        content: `
## FFN：逐位置的前馈网络

每个 Transformer Block 里，注意力之后是前馈网络：

FFN(x) = W_2 · act(W_1 · x + b_1) + b_2

- W_1 形状 [d_ff, d_model]，W_2 形状 [d_model, d_ff]，原论文取 d_ff = 4 × d_model；
- 激活函数：原论文用 ReLU，GPT 用 GELU，LLaMA 与 PaLM 用 SwiGLU。

**FFN 是逐位置的**：同一个 MLP 独立作用于每个 token，不混合位置信息。混合位置的任务由注意力完成。这种"注意力混合位置、FFN 变换特征"的交替结构是现代 Transformer 的基本骨架。

## 参数量分布：FFN 才是大头

以 d_model = 4096、d_ff = 4 × 4096 为例：

- 注意力：W_Q、W_K、W_V、W_O 共 4 乘 d 的平方，约 67M 参数；
- FFN：2 乘 d 乘 4d，即 8 乘 d 的平方，约 134M 参数。

**FFN 约占每层参数的三分之二**。这也是 MoE（把 FFN 换成多个专家）能大幅提升总参数量的原因。

## SwiGLU

SwiGLU(x) = Swish(x · W_1) 逐元素乘 (x · W_3)，结果再乘 W_2。

Swish(z) = z 乘以 sigmoid(z) 是门控激活。它需要三个矩阵而非两个，因此实践中把 d_ff 设为约 8/3 × d_model，以保持参数量与标准 FFN 对齐（LLaMA 用的是 11008）。

## 编码器、解码器与编码器-解码器

| 结构 | 代表模型 | 注意力形式 | 训练目标 | 擅长任务 |
| --- | --- | --- | --- | --- |
| Encoder-only | BERT、RoBERTa、bge | 双向（无掩码） | MLM 完形填空 | 理解、分类、检索 embedding |
| Decoder-only | GPT、LLaMA、Qwen | 因果（下三角掩码） | 自回归下一 token | 生成、通用对话、Agent |
| Encoder-Decoder | T5、BART、Whisper | 编码器双向加解码器因果加交叉注意力 | 序列到序列 | 翻译、摘要、语音识别 |

**为什么现在以 Decoder-only 为主**：一个模型加一个训练目标就能以统一方式处理所有任务；推理时所有任务共享同一套 KV cache 机制；工程实现最简单。

## 交叉注意力的形状

解码器交叉注意力中：Q 来自解码器当前表示（形状 [n_dec, d]），K 和 V 来自编码器输出（形状 [n_enc, d]）。注意力矩阵形状 [n_dec, n_enc]。因果掩码作用在 Q 的维度上，保证每个解码位置只看它之前生成的 token。

## 一个完整 Block 的前向流程

1. 输入 X，形状 [B, n, d]；
2. h = X + MultiHeadAttn(Norm(X))；
3. out = h + FFN(Norm(h))；
4. 堆叠 L 层，最后做一次 Final Norm。

每一步的形状都是 [B, n, d]，这条主干被称为"残差流"（residual stream）——可以把它理解成一个共享的、固定宽度的工作记忆，各子层不断地往里读写信息。Anthropic 的可解释性研究就是用这个视角解释 Transformer 内部机制的。

## 常见误区

1. 以为 FFN 会像注意力一样混合不同 token——它逐位置独立；
2. 以为 FFN 扩展比越大越好——常见 4 倍（ReLU/GELU）或约 2.7 倍（SwiGLU），过大在相同参数预算下会削减深度；
3. 忘记 FFN 也需要激活函数——没有激活时两层线性等价于一层；
4. 认为 Decoder-only 不能做双向任务——通过精心构造的提示，它能学到近似的双向行为，只是效率不及编码器。
`,
        tips: [
          {
            kind: 'interview',
            text: '经典问题：为什么大模型普遍用 Decoder-only？答题要点：训练目标统一（下一 token）、推理机制一致（KV cache）、大规模下 in-context learning 能力涌现、工程实现最简单。',
          },
          {
            kind: 'note',
            text: 'Swish(x) = x 乘以 sigmoid(x)。SwiGLU 的门控设计让模型能按 token 动态选择性地传递信息，同等参数下通常优于 GELU。',
          },
          {
            kind: 'pitfall',
            text: '标准 FFN 每层约 12 乘 d 的平方个参数（注意力 4 加 FFN 8）。估算大模型显存时先用这个公式，再乘层数，能快速判断"是否放得下"。',
          },
        ],
        demos: [
          {
            title: '从零拼一个 Pre-LN Transformer Block（纯 numpy）',
            lang: 'python',
            code: `import numpy as np

def softmax(x):
    x = x - x.max(axis=-1, keepdims=True)
    e = np.exp(x)
    return e / e.sum(axis=-1, keepdims=True)

def layer_norm(x, eps=1e-5):
    mu = x.mean(axis=-1, keepdims=True)
    var = ((x - mu) ** 2).mean(axis=-1, keepdims=True)
    return (x - mu) / np.sqrt(var + eps)

def gelu(x):
    return 0.5 * x * (1.0 + np.tanh(np.sqrt(2 / np.pi) * (x + 0.044715 * x ** 3)))

def attn(X, d_model, h, rng, causal=True):
    B, n, _ = X.shape
    dk = d_model // h
    Wq, Wk, Wv, Wo = (rng.normal(0, 0.2, size=(d_model, d_model)) for _ in range(4))
    Q, K, V = X @ Wq, X @ Wk, X @ Wv

    def sp(t):
        return t.reshape(B, n, h, dk).transpose(0, 2, 1, 3)
    Q, K, V = sp(Q), sp(K), sp(V)
    s = Q @ K.transpose(0, 1, 3, 2) / np.sqrt(dk)
    if causal:
        s = np.where(np.triu(np.ones((n, n), bool), 1), -1e9, s)
    c = softmax(s) @ V
    c = c.transpose(0, 2, 1, 3).reshape(B, n, d_model)
    return c @ Wo

def ffn(X, d_model, d_ff, rng):
    W1 = rng.normal(0, 0.2, size=(d_model, d_ff))
    W2 = rng.normal(0, 0.2, size=(d_ff, d_model))
    return gelu(X @ W1) @ W2

rng = np.random.default_rng(0)
B, n, d_model, h, d_ff = 2, 6, 32, 4, 128
X = rng.normal(size=(B, n, d_model))

h1 = X + attn(layer_norm(X), d_model, h, rng)
out = h1 + ffn(layer_norm(h1), d_model, d_ff, rng)
print("输入形状  :", X.shape)
print("注意力后  :", h1.shape)
print("Block 输出:", out.shape, " —— 形状不变，才能堆叠任意层数")`,
          },
          {
            title: '每层参数量估算（注意力与 FFN 的占比）',
            lang: 'python',
            code: `def block_params(d_model, d_ff, ffn="standard"):
    attn = 4 * d_model * d_model
    ffn_w = 2 * d_model * d_ff if ffn == "standard" else 3 * d_model * d_ff
    return attn, ffn_w

models = [
    ("Transformer-base", 512, 2048, "standard"),
    ("GPT-2 small", 768, 3072, "standard"),
    ("LLaMA-2 7B", 4096, 11008, "swiglu"),
    ("GPT-3 175B", 12288, 49152, "standard"),
]
for name, d, ff, kind in models:
    a, f = block_params(d, ff, kind)
    print(f"{name:18s} d={d:6d} d_ff={ff:6d}  注意力占 {a / (a + f):.1%}  "
          f"FFN 占 {f / (a + f):.1%}  每层约 {(a + f) / 1e6:.1f}M")

print()
print("结论：FFN 通常占每层参数的三分之二，这就是 MoE 把 FFN 拆成专家的收益来源。")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-a1-c2-e1',
        type: 'single',
        difficulty: 3,
        question: '缩放点积注意力中除以 `sqrt(d_k)` 的主要目的是？',
        options: [
          { value: 'A', text: '减少注意力矩阵的内存占用' },
          { value: 'B', text: '防止点积随 d_k 增大而方差过大，使 softmax 进入饱和区导致梯度消失' },
          { value: 'C', text: '让注意力权重之和为 1' },
          { value: 'D', text: '保证 Q 与 K 的维度一致' },
        ],
        answer: 'B',
        explanation:
          '若 Q、K 分量独立且方差为 1，点积的方差为 d_k，标准差为 sqrt(d_k)。不缩放时 logits 幅值过大，softmax 近似 one-hot，梯度趋零。权重之和为 1 由 softmax 本身保证（C 错误），内存占用不受缩放影响（A 错误）。',
        relatedLessonId: 'llm-a1-c2-l1',
        tags: ['注意力', '缩放'],
      },
      {
        id: 'llm-a1-c2-e2',
        type: 'judge',
        difficulty: 3,
        question: '在因果自注意力中，把上三角位置在 softmax 前设为 0，即可实现"看不见未来 token"。',
        answer: false,
        explanation:
          '必须设为 -1e9 或负无穷。设为 0 只是让分数保持原值，softmax 仍会为这些位置分配权重，解码器从而"看到"了未来。正确做法是加上负无穷，使 exp 后严格为 0。',
        relatedLessonId: 'llm-a1-c2-l1',
        tags: ['因果掩码', '注意力'],
      },
      {
        id: 'llm-a1-c2-e3',
        type: 'multiple',
        difficulty: 3,
        question: '关于多头注意力，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '多头把 d_model 切分成 h 份，每份维度为 d_model 除以 h' },
          { value: 'B', text: '当 h 与 d_model 固定时，多头总计算量与单头基本相同' },
          { value: 'C', text: '不同头可以关注不同类型的关系（局部、句法、指代等）' },
          { value: 'D', text: '多头注意力能使上下文窗口长度变成 h 倍' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          '上下文窗口由位置编码与训练长度决定，与头数无关（D 错误）。A、B、C 是多头注意力的标准结论：切分维度、计算量不变、表达能力提升。',
        relatedLessonId: 'llm-a1-c2-l2',
        tags: ['多头注意力'],
      },
      {
        id: 'llm-a1-c2-e4',
        type: 'fill',
        difficulty: 3,
        question: '补全多头拆分代码，把 `[B, n, d]` 变成 `[B, h, n, d/h]`：\n\n```python\ndef split_heads(x, h):\n    B, n, d = x.shape\n    return x.reshape(B, n, h, ___).___(0, 2, 1, 3)\n```',
        blanks: [['d // h', 'd//h'], ['transpose']],
        explanation:
          '先把最后一维拆成 `(h, d // h)`，再用 `transpose` 把头维度提到序列维度前面。顺序不能颠倒：先 transpose 再 reshape 会让不同头的特征交错，而且不会报错。',
        relatedLessonId: 'llm-a1-c2-l2',
        tags: ['多头注意力', '形状变换'],
      },
      {
        id: 'llm-a1-c2-e5',
        type: 'code',
        difficulty: 3,
        question:
          '实现带因果掩码的**缩放点积注意力**函数 `sdpa(Q, K, V, causal=True)`。\n\n- Q 形状 [n, d_k]，K 形状 [m, d_k]，V 形状 [m, d_v]；\n- 返回 `(out, weights)`，`out` 形状 [n, d_v]，`weights` 形状 [n, m]；\n- 因果掩码：位置 i 只能关注 j 小于等于 i 的位置（用 -1e9 填充后再 softmax）；\n- softmax 需要做数值稳定处理（先减最大值）。',
        starterCode: `import numpy as np

def softmax(x):
    x = x - x.max(axis=-1, keepdims=True)
    e = np.exp(x)
    return e / e.sum(axis=-1, keepdims=True)

def sdpa(Q, K, V, causal=True):
    d_k = ___
    scores = ___
    if causal:
        n, m = scores.shape
        mask = np.triu(np.ones((n, m), dtype=bool), k=1)
        scores = ___
    weights = softmax(scores)
    out = ___
    return out, weights

rng = np.random.default_rng(0)
Q = rng.normal(size=(4, 8))
K = rng.normal(size=(4, 8))
V = rng.normal(size=(4, 16))
out, weights = sdpa(Q, K, V, causal=True)
`,
        setupCode: '',
        expectedOutput: 'out 形状 (4, 16)，weights 为下三角（上三角全为 0）',
        tests: `assert context.shape == (4, 16), f"输出形状应为 (4, 16)，实际 {context.shape}"
assert weights.shape == (4, 4), f"weights 形状应为 (4, 4)，实际 {weights.shape}"
assert np.allclose(weights.sum(axis=-1), 1.0), "每行注意力权重之和应为 1"
assert np.allclose(weights[np.triu_indices(4, 1)], 0.0), "因果掩码应使上三角权重为 0"
assert np.allclose(weights[0], [1.0, 0.0, 0.0, 0.0]), "第 0 个位置只能关注自己"
assert np.allclose(context[0], V[0]), "第 0 个位置的输出应等于 V 的第 0 行"
assert np.all(np.diag(weights) > 0), "对角线（自身）权重应大于 0"
assert np.allclose(weights.sum(axis=0) > 0, True), "每个位置作为 key 至少会被自己关注"
o2, w2 = sdpa(Q, K, V, causal=False)
assert o2.shape == (4, 16) and np.all(w2 > 0), "非因果时所有权重应为正"
assert np.isclose(w2[0].sum(), 1.0), "非因果时权重也应归一化"
`,
        answer: `import numpy as np

def softmax(x):
    x = x - x.max(axis=-1, keepdims=True)
    e = np.exp(x)
    return e / e.sum(axis=-1, keepdims=True)

def sdpa(Q, K, V, causal=True):
    d_k = Q.shape[-1]
    scores = Q @ K.T / np.sqrt(d_k)
    if causal:
        n, m = scores.shape
        mask = np.triu(np.ones((n, m), dtype=bool), k=1)
        scores = np.where(mask, -1e9, scores)
    weights = softmax(scores)
    out = weights @ V
    return out, weights

rng = np.random.default_rng(0)
Q = rng.normal(size=(4, 8))
K = rng.normal(size=(4, 8))
V = rng.normal(size=(4, 16))
context, weights = sdpa(Q, K, V, causal=True)
`,
        explanation:
          '`np.triu(..., k=1)` 取严格上三角（不含对角线），对应"只能看自己及之前"。用 `np.where(mask, -1e9, scores)` 而不是乘法，是为了让被屏蔽位置在 softmax 中彻底为 0。若把 mask 直接乘到 scores 上，被屏蔽位置的分数变成 0，当其余分数恰好为负时反而会获得更高权重。',
        relatedLessonId: 'llm-a1-c2-l1',
        tags: ['注意力', '因果掩码', 'numpy'],
      },
      {
        id: 'llm-a1-c2-e6',
        type: 'code',
        difficulty: 4,
        question:
          '实现**多头注意力**函数 `mha(X, Wq, Wk, Wv, Wo, h)`：先按头拆分，再对每个头单独做缩放点积注意力，最后拼接并乘输出投影。\n\n- `X` 形状 [n, d]，`Wq, Wk, Wv, Wo` 形状均为 [d, d]（为简化，投影矩阵已包含所有头）；\n- 头数 `h`，每个头维度 `dk = d // h`；\n- 不使用因果掩码。\n\n返回 `out`（[n, d]）与每个头的注意力权重 `weights`（[h, n, n]）。',
        starterCode: `import numpy as np

def softmax(x):
    x = x - x.max(axis=-1, keepdims=True)
    e = np.exp(x)
    return e / e.sum(axis=-1, keepdims=True)

def mha(X, Wq, Wk, Wv, Wo, h):
    n, d = X.shape
    dk = d // h
    Q, K, V = X @ Wq, X @ Wk, X @ Wv

    def split(t):
        # [n, d] -> [h, n, dk]
        return t.reshape(n, h, dk).transpose(1, 0, 2)

    Q, K, V = split(Q), split(K), split(V)

    # 每个头独立计算，形状 [h, n, n]
    scores = ___
    weights = softmax(scores)
    ctx = ___                                     # [h, n, dk]
    ctx = ctx.transpose(1, 0, 2).reshape(n, d)     # 拼回 [n, d]
    out = ctx @ Wo
    return out, weights

rng = np.random.default_rng(2)
n, d, h = 5, 16, 4
X = rng.normal(size=(n, d))
Wq, Wk, Wv, Wo = (rng.normal(0, 0.3, size=(d, d)) for _ in range(4))
out, weights = mha(X, Wq, Wk, Wv, Wo, h)
`,
        setupCode: '',
        expectedOutput: 'out 形状 (5, 16)，weights 形状 (4, 5, 5)',
        tests: `assert context.shape == (5, 16), f"输出形状应为 (5, 16)，实际 {context.shape}"
assert weights.shape == (4, 5, 5), f"weights 形状应为 (4, 5, 5)，实际 {weights.shape}"
assert np.allclose(weights.sum(axis=-1), 1.0), "每个头的权重行和应为 1"
assert not np.allclose(weights[0], weights[1]), "不同头应学到不同的注意力分布"
assert np.allclose(weights.sum(axis=-1), 1.0), "每个头的注意力权重之和应为 1"
o1, w1 = mha(X, Wq, Wk, Wv, Wo, 1)
assert o1.shape == (5, 16) and w1.shape == (1, 5, 5), "h=1 时权重形状应为 (1, 5, 5)"
assert np.allclose(w1[0].sum(axis=-1), 1.0)
`,
        answer: `import numpy as np

def softmax(x):
    x = x - x.max(axis=-1, keepdims=True)
    e = np.exp(x)
    return e / e.sum(axis=-1, keepdims=True)

def mha(X, Wq, Wk, Wv, Wo, h):
    n, d = X.shape
    dk = d // h
    Q, K, V = X @ Wq, X @ Wk, X @ Wv

    def split(t):
        return t.reshape(n, h, dk).transpose(1, 0, 2)

    Q, K, V = split(Q), split(K), split(V)
    scores = Q @ K.transpose(0, 2, 1) / np.sqrt(dk)
    weights = softmax(scores)
    ctx = weights @ V
    ctx = ctx.transpose(1, 0, 2).reshape(n, d)
    out = ctx @ Wo
    return out, weights

rng = np.random.default_rng(2)
n, d, h = 5, 16, 4
X = rng.normal(size=(n, d))
Wq, Wk, Wv, Wo = (rng.normal(0, 0.3, size=(d, d)) for _ in range(4))
context, weights = mha(X, Wq, Wk, Wv, Wo, h)
`,
        explanation:
          '批量化后形状从 [n, n] 升级为 [h, n, n]：`K.transpose(0, 2, 1)` 把每个头的 [n, dk] 转置成 [dk, n]，再做批量矩阵乘法。拼接时的逆变换必须严格是 `transpose(1, 0, 2).reshape(n, d)`，与拆分顺序相反。少写一个 transpose 不会报错，但每个头的片段会交错。',
        relatedLessonId: 'llm-a1-c2-l2',
        tags: ['多头注意力', 'numpy', '形状变换'],
      },
      {
        id: 'llm-a1-c2-e7',
        type: 'code',
        difficulty: 3,
        question:
          '实现**正弦位置编码**函数 `sinusoidal(n, d)`，返回形状 [n, d] 的矩阵：\n\n- 偶数维 PE[pos, 2i] = sin(pos / 10000^(2i/d))；\n- 奇数维 PE[pos, 2i+1] = cos(pos / 10000^(2i/d))；\n- 最后令 `out = PE[0]`。\n\n实现后请检查：位置 0 的偶数维应当是 0（sin(0)），奇数维应当是 1（cos(0)）。',
        starterCode: `import numpy as np

def sinusoidal(n, d):
    pos = np.arange(n)[:, None]              # [n, 1]
    div = ___                                # 波长缩放项，形状 [1, d/2]
    angle = ___                              # [n, d/2]
    pe = np.zeros((n, d))
    pe[:, 0::2] = ___
    pe[:, 1::2] = ___
    return pe

PE = sinusoidal(50, 16)
out = PE[0]
`,
        setupCode: '',
        expectedOutput: 'PE 形状 (50, 16)，位置 0 的偶数维为 0、奇数维为 1',
        tests: `assert PE.shape == (50, 16), f"形状应为 (50, 16)，实际 {PE.shape}"
assert np.allclose(PE[0, 0::2], 0.0), "位置 0 的偶数维应为 sin(0)=0"
assert np.allclose(PE[0, 1::2], 1.0), "位置 0 的奇数维应为 cos(0)=1"
assert np.allclose(PE[1, 0], np.sin(1.0)), "PE[1,0] 应为 sin(1)"
assert np.allclose(PE[1, 1], np.cos(1.0)), "PE[1,1] 应为 cos(1)"
assert np.allclose(PE[2, 0], np.sin(2.0)), "PE[2,0] 应为 sin(2)"
assert np.all(np.abs(PE) <= 1.0 + 1e-12), "正弦与余弦项取值范围都在 [-1, 1]"
assert np.all(np.abs(np.linalg.norm(PE, axis=1) - np.linalg.norm(PE[0])) < 1e-6), "每行范数应相等"
assert context.shape == (16,), f"输出形状应为 (16,)，实际 {context.shape}"
`,
        answer: `import numpy as np

def sinusoidal(n, d):
    pos = np.arange(n)[:, None]
    div = 10000 ** (2 * np.arange(0, d, 2) / d)
    angle = pos / div[None, :]
    pe = np.zeros((n, d))
    pe[:, 0::2] = np.sin(angle)
    pe[:, 1::2] = np.cos(angle)
    return pe

PE = sinusoidal(50, 16)
context = PE[0]
`,
        explanation:
          '注意指数是 2i/d（i 为 0, 1, 2, ...），等价于用 `np.arange(0, d, 2)` 生成偶数列下标再除以 d。波长从 2π 到 10000 乘 2π 呈等比分布：低维快速变化、高维缓慢变化，类似二进制计数。每行范数恒为 sqrt(d/2)，这也是位置编码能与单位尺度词向量直接相加的前提。',
        relatedLessonId: 'llm-a1-c2-l3',
        tags: ['位置编码', 'numpy'],
      },
      {
        id: 'llm-a1-c2-e8',
        type: 'code',
        difficulty: 4,
        question:
          '实现 **RoPE 旋转位置编码**（前后半段配对版）并验证其相对位置性质。\n\n对形状 [n, d] 的输入 x：\n- `half = d // 2`，频率 theta_j = 10000^(-j/half)，j 从 0 到 half-1；\n- 位置 m 的角度为 m 乘以 theta_j；\n- 前半段 out1 = x1 乘 cos 减 x2 乘 sin，后半段 out2 = x1 乘 sin 加 x2 乘 cos。\n\n计算 `out = rope(q, np.array([3]))`（q 为形状 [1, d] 的随机向量）。',
        starterCode: `import numpy as np

def rope(x, positions, base=10000.0):
    """x: [n, d] 到 [n, d]，按 positions 旋转。"""
    n, d = x.shape
    half = ___
    theta = ___                                   # [half]
    ang = ___                                     # [n, half]
    cos, sin = np.cos(ang), np.sin(ang)
    x1, x2 = x[:, :half], x[:, half:]
    out = np.empty_like(x)
    out[:, :half] = ___
    out[:, half:] = ___
    return out

rng = np.random.default_rng(7)
d = 8
q = rng.normal(size=(1, d))
k = rng.normal(size=(1, d))
out = rope(q, np.array([3]))
`,
        setupCode: '',
        expectedOutput: 'out 形状 (1, 8)，旋转不改变范数，内积只依赖相对位置',
        tests: `assert rope(q, np.array([3])).shape == (1, 8), "旋转后的形状应与输入一致"
assert np.isclose(np.linalg.norm(rope(q, np.array([3]))), np.linalg.norm(q)), "RoPE 不应改变向量范数"
assert np.allclose(rope(q, np.array([0])), q), "位置 0 不旋转，应等于原向量"
def _inner(pq, pk):
    return float(rope(q, np.array([pq])) @ rope(k, np.array([pk])).T)
assert np.isclose(_inner(1, 4), _inner(20, 23), atol=1e-6), "相对距离相同的两对内积应相同"
assert np.isclose(_inner(5, 5), _inner(50, 50), atol=1e-6), "自身内积应与绝对位置无关"
assert not np.isclose(_inner(0, 1), _inner(0, 7), atol=1e-6), "相对距离不同时内积应不同"
assert np.isclose(_inner(0, 0), float((q @ k.T)[0, 0])), "位置 0 与 0 的内积应等于原始内积"
`,
        answer: `import numpy as np

def rope(x, positions, base=10000.0):
    n, d = x.shape
    half = d // 2
    theta = base ** (-np.arange(half) / half)
    ang = positions[:, None] * theta[None, :]
    cos, sin = np.cos(ang), np.sin(ang)
    x1, x2 = x[:, :half], x[:, half:]
    out = np.empty_like(x)
    out[:, :half] = x1 * cos - x2 * sin
    out[:, half:] = x1 * sin + x2 * cos
    return out

rng = np.random.default_rng(7)
d = 8
q = rng.normal(size=(1, d))
k = rng.normal(size=(1, d))
context = rope(q, np.array([3]))
`,
        explanation:
          'theta 的指数是 -j/half，与正弦位置编码的 -2i/d 形式一致，都是等比频率。旋转矩阵是正交矩阵，所以范数不变；又因为旋转矩阵的转置等于其逆，两个不同位置的旋转复合后只剩相对角度，内积只与相对位置有关——这正是 RoPE 被主流模型采用的数学原因。本实现采用"前后半段配对"，与 LLaMA 一致。',
        relatedLessonId: 'llm-a1-c2-l3',
        tags: ['RoPE', '位置编码', 'numpy'],
      },
      {
        id: 'llm-a1-c2-e9',
        type: 'code',
        difficulty: 3,
        question:
          '实现 **LayerNorm** 函数 `layer_norm(x, gamma=None, beta=None, eps=1e-5)`：对每个样本（最后一个维度）做归一化，再应用可学习的缩放 gamma 与偏移 beta。\n\n- 均值与方差使用有偏估计（除以 d，而不是 d-1）；\n- 计算 `out = layer_norm(X)`，其中 `X` 为 [3, 4]。',
        starterCode: `import numpy as np

def layer_norm(x, gamma=None, beta=None, eps=1e-5):
    d = x.shape[-1]
    gamma = np.ones(d) if gamma is None else gamma
    beta = np.zeros(d) if beta is None else beta
    mu = ___                                  # [..., 1]
    var = ___                                 # [..., 1]
    x_hat = ___
    return gamma * x_hat + beta

X = np.array([[1.0, 2.0, 3.0, 4.0],
              [10.0, 12.0, 14.0, 16.0],
              [0.5, -0.5, 0.5, -0.5]])
context = layer_norm(X)
`,
        setupCode: '',
        expectedOutput: '每行均值为 0、方差约为 1',
        tests: `assert context.shape == X.shape, "输出形状应与输入一致"
assert np.allclose(context.mean(axis=-1), 0.0, atol=1e-6), "每行均值应为 0"
assert np.allclose(context.var(axis=-1), 1.0, atol=1e-4), "每行方差应约为 1"
assert np.allclose(context[0], [-1.34164, -0.44721, 0.44721, 1.34164], atol=1e-4), "第 0 行归一化结果不正确"
assert np.allclose(context[2], layer_norm(X[2:3])[0]), "逐行归一化结果应与整批一致"
out2 = layer_norm(X, np.ones(4) * 2, np.ones(4) * 0.5)
assert np.allclose(out2, context * 2 + 0.5), "gamma 与 beta 应生效"
`,
        answer: `import numpy as np

def layer_norm(x, gamma=None, beta=None, eps=1e-5):
    d = x.shape[-1]
    gamma = np.ones(d) if gamma is None else gamma
    beta = np.zeros(d) if beta is None else beta
    mu = x.mean(axis=-1, keepdims=True)
    var = ((x - mu) ** 2).mean(axis=-1, keepdims=True)
    x_hat = (x - mu) / np.sqrt(var + eps)
    return gamma * x_hat + beta

X = np.array([[1.0, 2.0, 3.0, 4.0],
              [10.0, 12.0, 14.0, 16.0],
              [0.5, -0.5, 0.5, -0.5]])
context = layer_norm(X)
`,
        explanation:
          '第 0 行均值 2.5、方差 1.25、标准差约 1.118，归一化后约为 [-1.343, -0.448, 0.448, 1.343]（受 eps 影响，测试用 1e-4 容差）。`keepdims=True` 必不可少，否则无法与原矩阵广播。方差要**先减均值再平方**，"平方的均值减均值的平方"在高均值场景会因抵消误差产生负方差。',
        relatedLessonId: 'llm-a1-c2-l4',
        tags: ['LayerNorm', '归一化', 'numpy'],
      },
      {
        id: 'llm-a1-c2-e10',
        type: 'code',
        difficulty: 3,
        question:
          '实现 **RMSNorm** 与 **GELU**：\n\n1. `rms_norm(x, gamma=None, eps=1e-6)`：y = gamma 乘 x 再除以 sqrt(mean(x 的平方) + eps)；\n2. `gelu(x)`：使用 tanh 近似 0.5 乘 x 乘 (1 + tanh(sqrt(2/pi) 乘 (x + 0.044715 乘 x 的立方)))；\n3. 计算 `out = rms_norm(X)` 与 `g = gelu(np.array([-2.0, -1.0, 0.0, 1.0, 2.0]))`。',
        starterCode: `import numpy as np

def rms_norm(x, gamma=None, eps=1e-6):
    d = x.shape[-1]
    gamma = np.ones(d) if gamma is None else gamma
    rms = ___                                  # [..., 1]
    return ___

def gelu(x):
    return ___

X = np.array([[1.0, 2.0, 3.0, 4.0],
              [3.0, 3.0, 3.0, 3.0]])
context = rms_norm(X)
g = gelu(np.array([-2.0, -1.0, 0.0, 1.0, 2.0]))
context = out
`,
        setupCode: '',
        expectedOutput: 'RMSNorm 后每行均方根为 1；gelu 在负区间为小负数',
        tests: `assert context.shape == X.shape, "输出形状应不变"
assert np.allclose(np.sqrt((context ** 2).mean(axis=-1)), 1.0, atol=1e-4), "每行均方根应为 1"
assert np.allclose(context[1], np.ones(4), atol=1e-4), "常数行的 RMSNorm 输出应为全 1"
assert g.shape == (5,), "gelu 输出形状不正确"
assert np.isclose(g[2], 0.0, atol=1e-6), "gelu(0) 应为 0"
assert g[4] > g[3] > 0, "gelu 在正值区间应单调递增"
assert g[0] < 0 and abs(g[0]) < 0.05, "gelu(-2) 应为很小的负数"
assert np.isclose(g[3], 0.84119, atol=1e-4), f"gelu(1) 应约为 0.8412，实际 {g[3]}"
assert np.allclose(rms_norm(X * 2.0), rms_norm(X)), "RMSNorm 对整体正缩放具有不变性"
`,
        answer: `import numpy as np

def rms_norm(x, gamma=None, eps=1e-6):
    d = x.shape[-1]
    gamma = np.ones(d) if gamma is None else gamma
    rms = np.sqrt((x ** 2).mean(axis=-1, keepdims=True) + eps)
    return gamma * x / rms

def gelu(x):
    return 0.5 * x * (1.0 + np.tanh(np.sqrt(2 / np.pi) * (x + 0.044715 * x ** 3)))

X = np.array([[1.0, 2.0, 3.0, 4.0],
              [3.0, 3.0, 3.0, 3.0]])
context = rms_norm(X)
g = gelu(np.array([-2.0, -1.0, 0.0, 1.0, 2.0]))
`,
        explanation:
          'RMSNorm 少了"减均值"，因此对整体正缩放严格不变（最后一条断言验证了这一点），计算量也比 LayerNorm 少。GELU 与 ReLU 的关键差异是**负区间非零且处处可导**，带来更平滑的梯度；tanh 近似与原精确形式（基于误差函数）的误差在 1e-3 量级，足以用于训练。',
        relatedLessonId: 'llm-a1-c2-l4',
        tags: ['RMSNorm', 'GELU', 'numpy'],
      },
      {
        id: 'llm-a1-c2-e11',
        type: 'single',
        difficulty: 3,
        question: 'LLaMA 等模型使用 Pre-LN 结构，即 `x + Sublayer(Norm(x))`，它相比 Post-LN 的主要优势是？',
        options: [
          { value: 'A', text: '参数量更少' },
          { value: 'B', text: '残差是纯恒等路径，梯度可直接回流，深层训练更稳定' },
          { value: 'C', text: '不需要任何归一化层' },
          { value: 'D', text: '推理速度更快' },
        ],
        answer: 'B',
        explanation:
          'Pre-LN 中残差路径不经过任何归一化，梯度沿恒等连接直达底层。Post-LN 最外层是归一化，残差被包在里面，深层网络需要 warmup 才不发散。两者参数量相同，所以 A、C、D 都不成立。',
        relatedLessonId: 'llm-a1-c2-l4',
        tags: ['Pre-LN', '训练稳定性'],
      },
      {
        id: 'llm-a1-c2-e12',
        type: 'multiple',
        difficulty: 4,
        question: '关于位置编码，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '自注意力本身是置换等变的，必须额外注入位置信息' },
          { value: 'B', text: 'RoPE 通过旋转 Q、K 向量，使注意力内积只依赖相对位置' },
          { value: 'C', text: '可学习位置编码无法直接外推到训练时未见过的长度' },
          { value: 'D', text: 'RoPE 会改变向量的范数，因此需要额外的重归一化' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'RoPE 使用正交旋转矩阵，**不改变**向量范数，D 错误。A 是位置编码存在的根本原因；B 是 RoPE 的核心性质；C 是可学习位置编码的固有限制（需要插值等技巧才能扩展）。',
        relatedLessonId: 'llm-a1-c2-l3',
        tags: ['位置编码', 'RoPE'],
      },
      {
        id: 'llm-a1-c2-e13',
        type: 'judge',
        difficulty: 3,
        question: '在 Decoder-only Transformer 中，FFN 层会对同一序列不同位置的 token 做信息混合，这是它捕获长距离依赖的主要来源。',
        answer: false,
        explanation:
          'FFN 是逐位置的：同一个 MLP 独立作用于每个位置，不混合不同 token 的信息。跨位置的信息混合完全由注意力完成。这个误解很常见，面试时常被用来考察对架构的理解。',
        relatedLessonId: 'llm-a1-c2-l5',
        tags: ['FFN', '架构'],
      },
      {
        id: 'llm-a1-c2-e14',
        type: 'fill',
        difficulty: 4,
        question: '补全 Pre-LN Transformer Block 的前向过程（第二个子层同样需要先归一化）：\n\n```python\nh = x + attention(norm(x))\nout = h + ffn(___)\n```',
        blanks: [['norm(h)', 'ln(h)', 'layer_norm(h)', 'rms_norm(h)']],
        explanation:
          'Pre-LN 的形式是 `x + F(Norm(x))`，所以第二个子层也是 `h + FFN(Norm(h))`。整个模型最后还需要一次 Final Norm，否则残差流会持续累积尺度，logits 的量级随层数漂移。',
        relatedLessonId: 'llm-a1-c2-l5',
        tags: ['Transformer Block', 'Pre-LN'],
      },
      {
        id: 'llm-a1-c2-e15',
        type: 'code',
        difficulty: 4,
        question:
          '**相对位置注意力偏置**：在注意力分数上加一个与相对距离有关的偏置，再 softmax。\n\n- `rel_bias` 有 2K+1 项，下标 `i - j + K` 对应相对距离 i - j（i 是查询位置，j 是键位置）；\n- 由于相对距离的范围是 -(n-1) 到 (n-1)，K 必须大于等于 n-1，否则下标会越界；\n- 例如 i=2、j=0 的相对距离是 +2，取下标 2 + K = 5，值为 1.0；i=0、j=2 的相对距离是 -2，取下标 -2 + K = 1，值为 -1.0；\n- 目标：得到 [n, n] 的偏置矩阵 `bias`、注意力权重 `weights` 与输出 `context`。\n\n如果写成 `j - i + K`，中心虽然仍在主对角线上、形状也合法，但"远的过去"会落到下标 0、"远的未来"落到下标 2K，语义与约定完全相反，而且不会报错。',
        starterCode: `import numpy as np

def softmax(x):
    x = x - x.max(axis=-1, keepdims=True)
    e = np.exp(x)
    return e / e.sum(axis=-1, keepdims=True)

n, d_v, K = 4, 3, 3
rng = np.random.default_rng(3)
Q = rng.normal(size=(n, 4))
Kk = rng.normal(size=(n, 4))
V = rng.normal(size=(n, d_v))
rel_bias = np.array([-1.5, -1.0, -0.5, 0.0, 0.5, 1.0, 1.5])   # 下标 0..6 对应距离 -3..3

i = np.arange(n)[:, None]      # 查询位置
j = np.arange(n)[None, :]      # 键位置

# 1. 下标矩阵：相对距离 i - j 整体右移 K，使下标落在 0..2K
idx = ___

# 2. 查表得到 [n, n] 的偏置矩阵
bias = ___

# 3. 注意力分数加偏置
scores = Q @ Kk.T / np.sqrt(Q.shape[-1])
weights = softmax(scores + bias)
context = weights @ V
`,
        setupCode: '',
        expectedOutput: 'bias[i][j] = rel_bias[i - j + K]，中心在主对角线；bias[2][0] = 1.0，bias[0][2] = -1.0',
        tests: `assert bias.shape == (4, 4), f"bias 形状应为 (4, 4)，实际 {bias.shape}"
assert bias[0, 0] == 0.0, "对角线相对距离为 0，偏置应为 0"
assert bias[2, 0] == 1.0, "i=2, j=0 的相对距离为 +2，取下标 5，偏置应为 1.0"
assert bias[0, 2] == -1.0, "i=0, j=2 的相对距离为 -2，取下标 1，偏置应为 -1.0"
assert bias[3, 2] == 0.5, "i=3, j=2 的相对距离为 +1，取下标 4，偏置应为 0.5"
assert np.allclose(weights.sum(axis=-1), 1.0), "注意力权重行和应为 1"
assert context.shape == (4, 3), f"输出形状应为 (4, 3)，实际 {context.shape}"
assert np.allclose(np.diag(bias), 0.0), "对角线偏置应全为 0（相对距离为 0）"
assert np.all(np.isfinite(weights)), "权重不应出现 NaN"
assert np.allclose(context, weights @ V), "输出应等于 权重乘以 V"
`,
        answer: `import numpy as np

def softmax(x):
    x = x - x.max(axis=-1, keepdims=True)
    e = np.exp(x)
    return e / e.sum(axis=-1, keepdims=True)

n, d_v, K = 4, 3, 3
rng = np.random.default_rng(3)
Q = rng.normal(size=(n, 4))
Kk = rng.normal(size=(n, 4))
V = rng.normal(size=(n, d_v))
rel_bias = np.array([-1.5, -1.0, -0.5, 0.0, 0.5, 1.0, 1.5])

i = np.arange(n)[:, None]
j = np.arange(n)[None, :]
idx = i - j + K
bias = rel_bias[idx]

scores = Q @ Kk.T / np.sqrt(Q.shape[-1])
weights = softmax(scores + bias)
context = weights @ V
context
`,
        explanation:
          '偏置矩阵只需一行广播：用查询位置 i 与键位置 j 的差 `i - j` 生成下标矩阵，再整体右移 K 使下标落在 0..2K，最后拿去索引 `rel_bias`。这正是 T5 的 relative position bucket 的简化版。两个关键点：(1) 下标必须在 0..2K 内，所以 K 至少要等于 n-1；(2) 方向约定——i 是查询位置、j 是键位置，`i - j` 越大表示键越靠前（越远），rel_bias 在该处取正值表示鼓励远距离关注，取负值则抑制。若误写成 `j - i + K`，中心仍在主对角线、形状也合法，但远近关系整体反转，且不会报错，这是实现相对位置时最容易踩的坑。',
        relatedLessonId: 'llm-a1-c2-l3',
        tags: ['相对位置', '注意力偏置'],
      },
      {
        id: 'llm-a1-c2-e16',
        type: 'code',
        difficulty: 3,
        question:
          '估算 Transformer 参数量：给定 `d_model`、`n_layers`、`d_ff`，按标准配置计算：\n- 每层注意力参数 = 4 乘 d_model 的平方（Wq、Wk、Wv、Wo）；\n- 每层 FFN 参数 = 2 乘 d_model 乘 d_ff；\n- 忽略 LayerNorm 参数。\n\n求总参数量 `total_params`（整数）、注意力占比 `attn_ratio`（保留 3 位小数）、FFN 占比 `ffn_ratio`（保留 3 位小数）。',
        starterCode: `d_model = 512
n_layers = 6
d_ff = 2048

attn_per_layer = ___
ffn_per_layer = ___
total_params = ___
attn_ratio = ___
ffn_ratio = ___
`,
        setupCode: '',
        expectedOutput: 'total_params = 18874368, attn_ratio = 0.333, ffn_ratio = 0.667',
        tests: `assert total_params == 18874368, f"total_params 应为 18874368，实际 {total_params}"
assert attn_ratio == 0.333, f"attn_ratio 应为 0.333，实际 {attn_ratio}"
assert ffn_ratio == 0.667, f"ffn_ratio 应为 0.667，实际 {ffn_ratio}"
assert abs(attn_ratio + ffn_ratio - 1.0) < 1e-3, "两个占比之和应为 1"
`,
        answer: `d_model = 512
n_layers = 6
d_ff = 2048

attn_per_layer = 4 * d_model ** 2
ffn_per_layer = 2 * d_model * d_ff
total_params = (attn_per_layer + ffn_per_layer) * n_layers
attn_ratio = round(attn_per_layer / (attn_per_layer + ffn_per_layer), 3)
ffn_ratio = round(ffn_per_layer / (attn_per_layer + ffn_per_layer), 3)
`,
        explanation:
          '每层 = 4 乘 512 的平方 + 2 乘 512 乘 2048 = 1,048,576 + 2,097,152 = 3,145,728，乘 6 层得 18,874,368（约 18.9M）。Transformer-base 实际约 65M，差额来自 embedding 与输出层——这提醒你：词表小时 embedding 可以忽视，词表大时它可能是最大单项。注意力恰好占三分之一、FFN 占三分之二，这是 d_ff = 4 乘 d_model 时的通用结论。',
        relatedLessonId: 'llm-a1-c2-l5',
        tags: ['参数量', '工程估算'],
      },
      {
        id: 'llm-a1-c2-e17',
        type: 'single',
        difficulty: 3,
        question: '一个 32 头、`d_model = 4096` 的模型，每个注意力头的维度 `d_k` 是？',
        options: [
          { value: 'A', text: '32' },
          { value: 'B', text: '128' },
          { value: 'C', text: '256' },
          { value: 'D', text: '4096' },
        ],
        answer: 'B',
        explanation: '`d_k = d_model / h = 4096 / 32 = 128`。这与 GPT-3、LLaMA-2 7B 等模型的配置一致——d_k 通常取 64 或 128。',
        relatedLessonId: 'llm-a1-c2-l2',
        tags: ['多头注意力', '配置'],
      },
      {
        id: 'llm-a1-c2-e18',
        type: 'multiple',
        difficulty: 3,
        question: '下列哪些属于 Encoder-Decoder 架构（如 T5、BART）的特点？（多选）',
        options: [
          { value: 'A', text: '编码器可以双向看到完整的输入序列' },
          { value: 'B', text: '解码器通过交叉注意力读取编码器输出' },
          { value: 'C', text: '推理时不需要 KV cache' },
          { value: 'D', text: '输入与输出使用两套不同的注意力计算路径' },
        ],
        answer: ['A', 'B', 'D'],
        explanation:
          'Encoder-Decoder 的解码器同样需要 KV cache 来加速自回归生成（还常缓存编码器输出的 K 和 V 投影），因此 C 错误。A、B、D 是 Seq2Seq 结构的标准特征。',
        relatedLessonId: 'llm-a1-c2-l5',
        tags: ['架构', 'Encoder-Decoder'],
      },
      {
        id: 'llm-a1-c2-e19',
        type: 'open',
        difficulty: 4,
        question:
          '请推导：为什么在 Q、K 各分量独立同分布（均值 0、方差 1）的假设下，点积 q·k 的方差是 d_k？并说明这一结论如何解释了"除以 sqrt(d_k)"的必要性。',
        referenceAnswer: `**推导**

设 q 和 k 各有 d_k 个分量，各分量相互独立、均值 0、方差 1。

点积为 q·k = sum_i q_i k_i。

1. 期望：E[q·k] = sum_i E[q_i]E[k_i] = 0（独立性使乘积期望可拆）；
2. 方差：因为各 k_i 相互独立，交叉项期望为 0，
   所以 Var(q·k) = sum_i Var(q_i k_i)；
3. 单项：E[(q_i k_i) 的平方] = E[q_i 的平方] E[k_i 的平方] = 1，
   且 E[q_i k_i] 的平方 = 0，故 Var(q_i k_i) = 1；
4. 因此 Var(q·k) = d_k，标准差为 sqrt(d_k)。

**为什么需要缩放**

softmax 的输入是 logits，其典型量级为 3 倍标准差，即正负 3 乘 sqrt(d_k)。
当 d_k = 64 时 logits 可达正负 24；d_k = 512 时可达正负 68。此时 softmax 极度接近 one-hot：

- 最大元素权重接近 1，其余接近 0；
- softmax 的雅可比为 p_i 乘 (delta_ij - p_j)，p 接近 one-hot 时梯度几乎为 0；
- 反向传播时注意力权重无法被有效调整，学习停滞。

除以 sqrt(d_k) 后 logits 的标准差回到 1，softmax 保持"分散但有区分度"的分布，梯度处于健康区间。

**补充**：若 Q、K 的实际初始化方差不是 1（例如线性层带增益），缩放因子的最优值需相应调整；但"使 logits 标准差约为 1"这一设计原则不变。`,
        rubric: [
          { point: '利用独立性把方差拆成 d_k 个单项之和', score: 2 },
          { point: '计算单项方差 E[(q_i k_i) 的平方] = 1', score: 2 },
          { point: '指出 logits 量级与 exp 溢出或 softmax 饱和的关系', score: 1 },
          { point: '说明梯度趋零、训练困难这一后果', score: 1 },
        ],
        keywords: ['方差', '独立性', 'sqrt', 'd_k', 'softmax', '饱和', '梯度'],
        explanation:
          '这是一道"数学推导加工程意义"的题。标准答案的关键是"独立同分布，交叉项为 0，方差可加"，以及利用对称性得到 Var(q_i k_i) = E[q_i 的平方] 乘 E[k_i 的平方] = 1。',
        tags: ['注意力', '推导', '面试'],
      },
      {
        id: 'llm-a1-c2-e20',
        type: 'open',
        difficulty: 4,
        question:
          '请对比正弦位置编码、可学习位置编码与 RoPE：分别解释它们如何注入位置信息、是否具备相对位置性质、能否外推到更长上下文，并说明把上下文从 4K 扩展到 128K 时需要做哪些事情。',
        referenceAnswer: `**三种方案对比**

1. **正弦位置编码**：把固定频率的正弦、余弦序列加到词向量上。不同维度有不同波长，波长呈等比数列；通过三角恒等式可证明 PE(pos + k) 是 PE(pos) 的固定线性变换，从而具备相对位置性质。理论上可外推，但经验上对未见长度效果下降，因为注意力从未见过那些角度组合。

2. **可学习位置编码**：pos_embedding 是 [max_len, d] 的可训练矩阵，与词向量相加。没有相对性质保证（是否学到由数据决定）；长度受限，超出 max_len 没有参数，**不能直接外推**。扩展时常用插值（把 512 行的表按比例插值到更长）并配合少量继续训练。

3. **RoPE**：对 Q、K 按位置旋转，内积只依赖相对距离 n - m；无额外参数、不改变范数；与注意力天然兼容。外推可通过调整频率基数（从 10000 提到 1e6 以上）、NTK-aware 插值、YaRN 等方案，并对位置做缩放。

**扩展到 128K 的实务清单**

1. **位置编码适配**：RoPE 基频调整、位置插值（Linear、NTK、YaRN），选一种并固定；
2. **继续训练**：在长文本语料（书籍、代码库、长对话）上做继续预训练，数据长度要覆盖目标长度；
3. **训练效率**：FlashAttention、分块或滑窗注意力、序列并行（Ulysses、Ring Attention）、梯度检查点，否则平方复杂度会直接 OOM；
4. **数据质量**：长文本中的稀疏监督与"针在草堆"（needle-in-a-haystack）评测；
5. **推理侧**：KV cache 分页管理（PagedAttention）、GQA 或 MQA 减少缓存、前缀缓存复用；
6. **评估**：RULER、LongBench、大海捞针测试，检查"中间遗忘"（lost in the middle）现象；
7. **注意**：窗口变大不等于一切变好，有效利用长度通常只在训练分布内可靠。`,
        rubric: [
          { point: '说明三种方案各自的注入方式与是否具备相对位置性质', score: 2 },
          { point: '指正可学习位置编码无法直接外推、RoPE 可通过频率调整外推', score: 2 },
          { point: '给出继续训练与长文本数据这一必要步骤', score: 1 },
          { point: '提及推理侧 KV cache 与评测方法', score: 1 },
        ],
        keywords: ['正弦', '可学习', 'RoPE', '相对位置', '外推', '插值', 'KV cache', '继续训练'],
        explanation:
          '本题是长上下文工程的核心考点。能区分"位置编码适配"与"继续训练"两件事，并能提到 KV cache 与评测方法的回答已达到资深水平。',
        tags: ['位置编码', '长上下文', '工程'],
      },
    ],
  },
  ...llmA1Extra,
  ...llmA1Extra2,
];
