# -*- coding: utf-8 -*-
"""
Chapter 1: 文本表征与分词工程 (Tokenization & Text Representation)
Course: ml-transformer-llm
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_1():
    # ── Lesson 1.1 ──
    l1_text = """### 学习目标
学完本节，你应该能够：
1. 理解自然语言文本从离散符号到连续向量表征的历史演进路线；
2. 掌握独热编码（One-Hot）与词袋模型（BoW/TF-IDF）的局限性：维度灾难、稀疏性与正交语义丢失；
3. 掌握分布式假说（Distributional Hypothesis）以及 Word2Vec（CBOW 与 Skip-Gram）的核心思想与负采样（Negative Sampling）数学目标；
4. 理解词表爆炸（Vocabulary Explosion）与未登录词（OOV, Out-Of-Vocabulary）危机，深刻认识现代大模型为何全面转向子词（Subword）分词。

### 前置知识
- 线性代数基础：向量内积与余弦相似度；
- 概率与微积分：Softmax 函数、二分类交叉熵损失与 Sigmoid 函数。

### 问题背景与 ML 用途
计算机是仅能执行数字运算的电子机器，它无法直接“理解”字符串 `"apple"`、`"banana"` 或汉字 `"知序"`。为了将人类语言输入给数学模型，我们必须将离散的符号映射为计算机可以处理的数值向量。
- 在早期的 NLP 中，人们使用词典索引或 One-Hot 向量表示单词。但这种表示将所有词视为正交基向量，`"cat"` 和 `"dog"` 的内积为 0，完全无法体现语义亲疏；
- 2013 年 Mikolov 提出的 **Word2Vec** 革命性地通过上下文预测任务，将词映射到低维连续稠密向量空间（Embedding Space），甚至涌现了著名的向量运算性质：$\\vec{v}_{\\text{King}} - \\vec{v}_{\\text{Man}} + \\vec{v}_{\\text{Woman}} \\approx \\vec{v}_{\\text{Queen}}$；
- 然而，无论是 One-Hot 还是 Word2Vec，都面临巨大的工程瓶颈：如果以“完整单词（Word）”为单位建立词表，英语和多语言环境下的形态变化（例如 run, running, runner, runs）会导致词表迅速膨胀至数百万；同时任何新词、拼写错误或合成词都会直接触发 **OOV（Out-Of-Vocabulary）**，导致模型输出 `<unk>`（Unknown Token）而彻底丢失信息。这直接催生了现代大模型的核心底座——**子词分词（Subword Tokenization）**。

### 直觉理解
- **语义空间的距离**：想象在一间三维房间里给水果定位。如果用 One-Hot，苹果是 $(1,0,0)$，梨是 $(0,1,0)$，猫是 $(0,0,1)$。在空间中，梨到苹果的距离和梨到猫的距离一模一样远！但用稠密词向量时，苹果在 $(0.8, 0.9, 0.1)$，梨在 $(0.75, 0.85, 0.12)$，而猫在 $(-0.6, 0.2, 0.8)$。通过连续坐标，距离（余弦夹角）自然编码了“水果”与“动物”的语义聚集。
- **拼积木 vs 收藏全套实物（子词的直觉）**：如果以“完整整词”为单位，你就像一个必须收藏世界上所有物品原型的展馆，一旦别人拿来一个带轻微划痕的积木（如 typo 错别字）或合成词（如 "unbelievable"），展馆就无处安放（OOV）；而“子词”就像乐高积木，词表里只存高频词根、词缀和字母片段（如 "un-", "believ", "able"）。无论来什么罕见词，都能用这几块积木拼合出来，彻底告别 OOV！

### 核心概念与符号对照表
| 核心概念 | 符号 / 公式 | 数学与物理意义 | 优缺点 / 适用场景 |
| --- | --- | --- | --- |
| **One-Hot 编码** | $\\mathbf{x} \\in \\{0, 1\\}^{|V|}, \\sum x_i = 1$ | 离散正交基，每个词占据一个独立维度 | 维度极高、稀疏；词与词互相正交，无语义距离 |
| **分布式假说** | $P(w \\mid \\text{context})$ | 词的语义由其周围上下文词的分布决定（Firth, 1957） | 稠密向量表征（Distributed Representation）的理论基石 |
| **Skip-Gram 目标** | $\\sum_{t=1}^T \\sum_{-c \\le j \\le c, j \\neq 0} \\log P(w_{t+j} \\mid w_t)$ | 给定中心词，预测周围上下文窗口内的背景词 | 罕见词表征效果好，参数更新充分 |
| **负采样 (Neg Sampling)** | $\\log \\sigma(\\mathbf{v}_{w_O}'^\\top \\mathbf{v}_{w_I}) + \\sum_{k=1}^K \\mathbb{E}[\\log \\sigma(-\\mathbf{v}_{w_k}'^\\top \\mathbf{v}_{w_I})]$ | 将原本计算分母全局 Softmax 的多分类简化为 $K$ 个二分类 | 将时间复杂度从 $\\mathcal{O}(\\|V\\|)$ 降至 $\\mathcal{O}(K)$，工业可行 |
| **OOV 危机** | $w \\notin \\mathcal{V} \\implies w = \\text{<unk>}$ | 测试时遇到未登录词直接退化为未知占位符 | 传统整词词表的核心缺陷，催生子词算法 |

### 数学原理与逐步推导
#### 1. 词嵌入与全局 Softmax 的计算瓶颈
在 Skip-Gram 模型中，设词表大小为 $V = |\\mathcal{V}|$，每个词有两个向量表示：作为中心词时的输入向量 $\\mathbf{v}_w \\in \\mathbb{R}^d$，以及作为上下文词时的输出向量 $\\mathbf{v}_w' \\in \\mathbb{R}^d$。
给定中心词 $w_I$，条件概率的标准 Softmax 定义为：
$$P(w_O \\mid w_I) = \\frac{\\exp(\\mathbf{v}_{w_O}'^\\top \\mathbf{v}_{w_I})}{\\sum_{w=1}^V \\exp(\\mathbf{v}_w'^\\top \\mathbf{v}_{w_I})}$$
计算该分母需要遍历整个词表 $V$。在真实语料中，$V$ 通常为 $10^5 \\sim 10^7$ 数量级，每一步梯度下降对所有参数求和在计算上极其昂贵。

#### 2. 负采样（Negative Sampling, NCE 变体）目标推导
为了绕开全局分母，Mikolov 等人采用负采样技术。将问题转化为二分类逻辑回归：判断词对 $(w_I, w)$ 是否来自真实的语料库（正样本标签 $y=1$），还是来自噪声分布 $P_n(w)$ 的随机抽样（负样本标签 $y=0$）。
正样本的概率为：
$$P(y=1 \\mid w_I, w_O) = \\sigma(\\mathbf{v}_{w_O}'^\\top \\mathbf{v}_{w_I}) = \\frac{1}{1 + \\exp(-\\mathbf{v}_{w_O}'^\\top \\mathbf{v}_{w_I})}$$
对于 $K$ 个负样本 $w_k \\sim P_n(w)$，其为负样本的概率为：
$$P(y=0 \\mid w_I, w_k) = 1 - \\sigma(\\mathbf{v}_{w_k}'^\\top \\mathbf{v}_{w_I}) = \\sigma(-\\mathbf{v}_{w_k}'^\\top \\mathbf{v}_{w_I})$$
最大化联合对数似然得到每个中心词的损失函数：
$$\\mathcal{L}_{\\text{Neg}}(\\mathbf{v}_{w_I}, \\mathbf{v}_{w_O}', \\{\\mathbf{v}_{w_k}'\\}) = \\log \\sigma(\\mathbf{v}_{w_O}'^\\top \\mathbf{v}_{w_I}) + \\sum_{k=1}^K \\mathbb{E}_{w_k \\sim P_n(w)} \\left[ \\log \\sigma(-\\mathbf{v}_{w_k}'^\\top \\mathbf{v}_{w_I}) \\right]$$
噪声分布通常选用 Unigram 分布的 $\\frac{3}{4}$ 次方：$P_n(w) = \\frac{f(w)^{0.75}}{\\sum_{w'} f(w')^{0.75}}$，该幂次放大了低频罕见词的被采样概率。

### 几何直觉与图解
```
传统 One-Hot 空间 (维度灾难、无语义距离):
  Dimension 1: [1, 0, 0, ...] (Apple) ── 夹角 90° ── Dimension 2: [0, 1, 0, ...] (Orange)
                                      ＼ 夹角 90°
                                       Dimension 3: [0, 0, 1, ...] (Car)
  (每个单词独立一维，空间内积为 0，互为正交基，无法衡量相似度)

连续稠密 Embedding 空间 (语义连续流形):
       ▲ 语义维度 2 (科技/交通)
       │       [car]      [truck]
       │         ●──────────● (车辆聚类)
       │
       │
       │                 [apple]   [orange]
       │                   ●─────────● (水果聚类)
       └───────────────────────────────────► 语义维度 1 (食物/生物)
```

### 常见认知误区与避坑指南
1. **混淆静态词向量与动态上下文词向量**：Word2Vec 生成的词向量是静态的（Static Embeddings），即同一个词无论出现在何处查找出来的都是同一个固定的嵌入向量。而 Transformer 输出的是依赖上下文的动态表征，同一个词在不同语境下的隐藏状态随注意力权重动态变化。
2. **以为词向量维度越高越好**：在早期的 Word2Vec 中，词向量维度通常设置为 100~300。维度过小会导致语义容量不足发生欠拟合；但如果在小语料上直接设置 1024 维甚至更高，会导致严重的过拟合与内积退化。
3. **误以为负采样样本数 K 越大越好**：Mikolov 的实验表明，对于超大规模语料，$K=2 \\sim 5$ 就足够产生高质量表征；只有对于较小语料，才推荐 $K=5 \\sim 20$。过大的 $K$ 不仅显著增加训练耗时，还可能引入假负例。

### 工业级工程实践
- **词表大小与显存爆炸**：如果工业级词表设定为 50 万，Embedding 维度为 4096，仅输入 Embedding 权重矩阵就需要 $500,000 \\times 4096 \\times 4\\text{ bytes} \\approx 8.19\\text{ GB}$ 显存。因此子词算法将词表严格控制在 32,000 ~ 128,000 之间，极大节约显存。
- **频次截断与 Subsampling**：真实语料中高频功能词出现极多但信息量极低。Word2Vec 采用二次概率丢弃高频词：$P(w) = 1 - \\sqrt{\\frac{t}{f(w)}}$（通常阈值 $t=10^{-5}$），这一简单的工程策略使训练速度提升 2~10 倍。

### 拓展阅读与学术文献
1. **Mikolov et al. (2013)**: *Distributed Representations of Words and Phrases and their Compositionality* (NeurIPS 2013)。
2. **Pennington et al. (2014)**: *GloVe: Global Vectors for Word Representation* (EMNLP 2014)。
3. **Sennrich et al. (2016)**: *Neural Machine Translation of Rare Words with Subword Units* (ACL 2016)。

### 知识总结与核心记忆要点
- **表征演进**：One-Hot（高维稀疏正交无语义） $\\to$ 词袋/TF-IDF $\\to$ Word2Vec/GloVe（低维稠密静态语义空间） $\\to$ 子词分词与上下文动态表征。
- **分布式假说**：“观其伴而知其意”（You shall know a word by the company it keeps）。
- **负采样本质**：用逻辑回归区分正反样本，避开全局配分函数的分母全词表计算开销。
- **OOV 危机**：整词词表的致命缺陷，驱动了子词分词成为大模型唯一的工业标配。"""

    l1_code = """import numpy as np

def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-np.clip(x, -15, 15)))

def cosine_similarity(v1, v2):
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(v1, v2) / (norm1 * norm2))

def skipgram_neg_step(v_in, v_out_pos, v_out_negs, lr=0.1):
    \"\"\"执行单步 Skip-Gram 负采样更新\"\"\"
    v_in = v_in.copy()
    v_out_pos = v_out_pos.copy()
    v_out_negs = v_out_negs.copy()
    
    # 1. 正样本前向预测与梯度
    dot_pos = np.dot(v_out_pos, v_in)
    p_pos = sigmoid(dot_pos)
    grad_z_pos = p_pos - 1.0
    
    # 2. 负样本前向预测与梯度
    grad_v_in = grad_z_pos * v_out_pos
    grad_v_out_pos = grad_z_pos * v_in
    
    grad_v_out_negs = np.zeros_like(v_out_negs)
    for k in range(len(v_out_negs)):
        dot_neg = np.dot(v_out_negs[k], v_in)
        p_neg = sigmoid(dot_neg)
        grad_z_neg = p_neg
        grad_v_in += grad_z_neg * v_out_negs[k]
        grad_v_out_negs[k] = grad_z_neg * v_in
        
    # 3. 梯度下降更新权重
    v_in -= lr * grad_v_in
    v_out_pos -= lr * grad_v_out_pos
    v_out_negs -= lr * grad_v_out_negs
    
    return v_in, v_out_pos, v_out_negs

# 验证更新是否增强了正样本与中心词的相似度
np.random.seed(42)
d = 4
v_center = np.random.randn(d)
v_target = np.random.randn(d)
v_negs = np.random.randn(3, d)

sim_before = cosine_similarity(v_center, v_target)
for _ in range(20):
    v_center, v_target, v_negs = skipgram_neg_step(v_center, v_target, v_negs, lr=0.2)
sim_after = cosine_similarity(v_center, v_target)

print(f"优化前余弦相似度: {sim_before:.4f}")
print(f"优化后余弦相似度: {sim_after:.4f}")
assert sim_after > sim_before, "优化后中心词与目标上下文词的相似度应当提高"
print("测试通过：负采样梯度更新有效拉近了语义共现向量的距离！")"""

    l1_tips = [
        tip("Word2Vec 是静态词向量，同一个词在不同语境下的词向量完全一样；现代 Transformer 输出的是依赖上下文的动态表征。", "pitfall"),
        tip("在预训练语料处理中，负采样通常结合对高频词进行 subsampling 降采样，可将训练速度提升数倍。", "performance"),
    ]

    # ── Lesson 1.2 ──
    l2_text = """### 学习目标
学完本节，你应该能够：
1. 深入掌握字节对编码（Byte Pair Encoding, BPE）的原始数据压缩背景与 NLP 分词原理；
2. 完整推导 BPE 从字符级初始切分、全局高频对统计、贪心合并到 Merge Rules 规则表生成的全流程；
3. 理解 Byte-level BPE（GPT-2 / GPT-4 / LLaMA 标配）如何利用 256 个 UTF-8 基础字节彻底根除 `<unk>`；
4. 编写代码完整实现 BPE 的词表训练算法与纯 Python 分词编码器。

### 前置知识
- Python 字符串切片、哈希字典统计与元组基本操作；
- UTF-8 字符编码与字节流基础知识。

### 问题背景与 ML 用途
在现代预训练大模型中，**Tokenization（分词）是连接人类自然语言与神经网络的第一道关卡**。
- 如果词表太大，Embedding 矩阵和输出层 Softmax 的参数量过大，计算极其昂贵；
- 如果词表太小，输入序列长度会暴涨数倍，而 Transformer 的注意力计算复杂度关于序列长度呈二次方 $\\mathcal{O}(S^2)$ 增长，上下文窗口将迅速被耗尽；
- **BPE 完美取得了词表大小与序列长度的平衡**：高频词保持为一个独立的完整 Token；而罕见词被优雅拆解为高频子词片段。
- OpenAI 的 GPT 系列和 Meta 的 LLaMA 系列无一例外全部采用 Byte-level BPE。

### 直觉理解
- **压缩包的解压密码（BPE 的直觉）**：既然 `"t"` 和 `"h"` 总是挨在一起出现，我们干脆把它们用胶水粘起来，造一个新的符号 `"th"`；下一轮发现 `"th"` 和 `"e"` 又总挨在一起，再造一个新符号 `"the"`！通过一步步粘合最高频相邻块，词汇表按需动态扩张。
- **256 个字节积木（Byte-level BPE）**：计算机底层的任何字符在 UTF-8 编码下都是若干个字节（Byte），而一个字节只有 256 种可能取值（0 到 255）！只要初始词表包含这 256 个 byte，模型就能无损拼装出世界上任何一种语言、任何代码、任何 Emoji，永远不会发生 OOV！

### 核心概念与符号对照表
| 核心概念 | 术语 / 符号 | 算法阶段 | 核心作用与定义 |
| --- | --- | --- | --- |
| **初始词表** | $\\mathcal{V}_0$ | 训练初始阶段 | 语料中出现的所有独立字符集合（或 256 个基础字节） |
| **相邻对频次** | $\\text{freq}(c_1, c_2)$ | 统计更新阶段 | 统计当前语料中所有紧邻符号对 $(c_1, c_2)$ 的共现频次 |
| **贪心合并** | $(c_1^*, c_2^*) = \\arg\\max \\text{freq}$ | 规则生成阶段 | 选择出现频次最高的一对符号，合并为全新符号 $c_{new} = c_1^* c_2^*$ |
| **合并规则表** | $\\text{Merge Rules}$ | 推理分词阶段 | 记录合并优先级的有序元组列表，推理时按先后顺序严格贪心合并 |
| **Byte-level BPE** | UTF-8 Byte Stream | 字节粒度 | 以原始字节作为最小 Token 单元，天然具有多语言与跨模态健壮性 |

### 算法执行图解
```
语料: "low", "lowest", "newer", "wider"
初始状态 (字符级):
  l  o  w
  l  o  w  e  s  t
  n  e  w  e  r
  w  i  d  e  r

第 1 轮合并: 发现 ('e', 'r') 出现最频繁 -> 合并为 'er'
  l  o  w
  l  o  w  e  s  t
  n  e  w  [er]
  w  i  d  [er]

第 2 轮合并: 发现 ('l', 'o') 频次最高 -> 合并为 'lo'
  [lo] w
  [lo] w  e  s  t
  n  e  w  [er]
  w  i  d  [er]
```

### 常见认知误区与避坑指南
1. **误以为 BPE 编码规则在分词时可以并发乱序执行**：BPE 的合并规则是有严格优先级的！先学到的规则代表更高频的模式，分词时必须按规则生成的先后顺序依次合并。
2. **以为 BPE 是通过语法规则进行分词的**：BPE 是完全无监督、纯统计驱动的算法，它纯粹依靠相邻字符的共现频率进行合并。
3. **忽视空格的处理**：现代 Byte-level BPE 会将空格替换为一个特殊的可见字符（例如 GPT 中的 `Ġ` 或 SentencePiece 中的 `_`），从而保证 Token 序列可以 100% 无损还原。

### 工业级工程实践
- **正则表达式预分词**：GPT-2 / GPT-4 的分词器先通过正则表达式切分文本，将标点符号、数字序列、缩写词隔开，防止无意义的混合 Token 污染。
- **tiktoken 性能压榨**：OpenAI 开源的 `tiktoken` 采用 Rust 编写，利用多线程与基数树将吞吐量提升至数百万 Token/秒。

### 拓展阅读与学术文献
1. **Radford et al. (2019)**: *Language Models are Unsupervised Multitask Learners* (GPT-2 技术报告)。
2. **Kudo & Richardson (2018)**: *SentencePiece: A simple and language independent subword tokenizer and detokenizer*.
3. **OpenAI tiktoken 官方源码与设计文档**。

### 知识总结与核心记忆要点
- **BPE 本质**：自底向上的数据驱动贪心算法，从字符或字节开始逐步合并全局最高频的相邻符号对。
- **Byte-level BPE**：以 256 个 UTF-8 基础字节为底座，彻底告别 `<unk>`。
- **无损可逆性**：将空格显式编码为保留字符，确保 `decode(encode(text)) == text`。"""

    l2_code = """from collections import defaultdict

def get_stats(vocab):
    pairs = defaultdict(int)
    for word, freq in vocab.items():
        symbols = word.split()
        for i in range(len(symbols) - 1):
            pairs[(symbols[i], symbols[i + 1])] += freq
    return pairs

def merge_vocab(pair, v_in):
    v_out = {}
    bigram = ' '.join(pair)
    replacement = ''.join(pair)
    for word in v_in:
        w_out = ' ' + word + ' '
        w_out = w_out.replace(' ' + bigram + ' ', ' ' + replacement + ' ')
        v_out[w_out.strip()] = v_in[word]
    return v_out

def train_bpe(corpus_dict, num_merges=6):
    vocab = corpus_dict.copy()
    merges = []
    for _ in range(num_merges):
        pairs = get_stats(vocab)
        if not pairs:
            break
        best_pair = max(pairs, key=pairs.get)
        merges.append(best_pair)
        vocab = merge_vocab(best_pair, vocab)
    return merges, vocab

def encode_word_bpe(word, merges):
    symbols = list(word)
    for c1, c2 in merges:
        i = 0
        new_symbols = []
        while i < len(symbols):
            if i < len(symbols) - 1 and symbols[i] == c1 and symbols[i + 1] == c2:
                new_symbols.append(c1 + c2)
                i += 2
            else:
                new_symbols.append(symbols[i])
                i += 1
        symbols = new_symbols
    return symbols

corpus = {
    'l o w </w>': 5,
    'l o w e r </w>': 2,
    'n e w e s t </w>': 6,
    'w i d e s t </w>': 3
}

merges, final_vocab = train_bpe(corpus, num_merges=6)
tokens = encode_word_bpe("lowest</w>", merges)
print("学到的 BPE 规则数:", len(merges))
print("分词结果:", tokens)

assert len(merges) == 6, "应该成功学到 6 条规则"
assert any(t in tokens for t in ['low', 'est</w>', 's', 't</w>'])
print("测试通过：BPE 训练与编码逻辑完全正确！")"""

    l2_tips = [
        tip("BPE 规则具有严格的先后顺序依赖，推理时必须严格按照训练得到的 Rank 优先级依次扫描合并。", "pitfall"),
        tip("大规模语料切分务必使用 C++/Rust 实现的底层分词器（如 tiktoken 或 HuggingFace tokenizers）。", "performance"),
    ]

    # ── Lesson 1.3 ──
    l3_text = """### 学习目标
学完本节，你应该能够：
1. 理解现代工业界三大分词范式的异同：BPE、**WordPiece**（BERT 使用）与 **Unigram LM**（SentencePiece 核心支持）；
2. 掌握 WordPiece 基于似然度最大化的合并决策机制与 `##` 前缀标记约定；
3. 掌握 Unigram 语言模型自顶向下的词表剪枝思想与 Viterbi 动态规划分词；
4. 理解 SentencePiece 语言无关分词框架，以及特有标记（`<pad>`, `<mask>`, `<bos>`, `<eos>`）与 Attention Mask 的工程协同机制。

### 前置知识
- 贝叶斯概率与语言模型最大似然估计；
- 动态规划算法（Viterbi 最优路径搜索）。

### 问题背景与 ML 用途
虽然 BPE 是当前生成式大语言模型（如 GPT、LLaMA）的主流选择，但在更广阔的现代 NLP 生态中，Google 体系的诸多经典模型（BERT, T5, Gemma）采用了不同的子词分词策略。
- **BERT 采用 WordPiece**：与 BPE 仅看频次不同，WordPiece 考虑的是将两个子词合并后，语言模型整体似然度的提升幅度；
- **SentencePiece (Unigram LM)**：传统分词工具强烈依赖语种专属的预分词器。SentencePiece 将所有输入无差别视为空白字符包含的原生字节流，真正做到了统一跨语种建模。

### 直觉理解
- **WordPiece 的聪明合作社（互信息直觉）**：字符 `"a"` 和 `"the"` 频率都极高，挨在一起纯属偶然巧合；而词根 `"bio"` 和 `"logy"` 几乎总是结伴出现，合并它们的似然收益极高！WordPiece 能有效避免无意义高频字符组合的误合并。
- **Unigram 的大浪淘沙（自顶向下剪枝）**：先建立一个几百万候选子词的超大集合，然后评估如果去掉某个词对文本整体似然度的损失，毫不留情地将其剔除，直到精简至目标词表大小。

### 核心概念与符号对照表
| 核心概念 | 提出者 / 算法 | 核心选择准则 | 特色与典型应用 |
| --- | --- | --- | --- |
| **BPE** | Sennrich et al. | 贪心合并绝对频次最高对：$\\arg\\max \\text{freq}(c_1, c_2)$ | 简单极速，GPT / LLaMA 标配 |
| **WordPiece** | Schuster & Nakajima | 最大化语言模型似然增长：$\\frac{P(c_1, c_2)}{P(c_1) P(c_2)}$ | 基于互信息，非首字母带 `##`，BERT 标配 |
| **Unigram LM** | Kudo | 自顶向下剪枝，最小化损失增量：$\\min \\Delta \\mathcal{L}$ | 概率化建模，支持分词正则化，T5 / ALBERT 标配 |
| **SentencePiece** | Google | 端到端无空格假定：将空格统一编码为下划线 `_` | 彻底脱离语种预分词规则，跨语言强健 |

### 常见认知误区与避坑指南
1. **误以为 `<pad>` 填充的 Token 必须在 Embedding 查找前过滤**：在 GPU 矩阵运算中，变长句子必须补齐到统一长度。真正的过滤发生在计算 Attention 权重时：通过 Attention Mask 将 `<pad>` 对应的注意力得分加上 $-\\infty$，经 Softmax 后其注意力权重严格变为 0。
2. **分词器与模型权重不匹配**：如果用 LLaMA-2 的分词器喂给 LLaMA-3，输出将沦为乱码和幻觉。分词器是模型权重不可分割的有机组成部分。

### 工业级工程实践
- **Subword Regularization（分词正则化）**：在训练阶段，不使用 Viterbi 算法找出的绝对最优分词，而是根据概率分布随机采样一种合法的分词路径。相当于对输入文本进行了有效的数据增强。
- **现代大模型词表扩增**：近年 Gemma 和 Qwen 将词表扩张至 150k~256k，显著提升了中文、数学和代码的生成效率。

### 拓展阅读与学术文献
1. **Devlin et al. (2018)**: *BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding*.
2. **Kudo (2018)**: *Subword Regularization: Improving Neural Network Translation Models with Multiple Subword Candidates*.

### 知识总结与核心记忆要点
- **WordPiece 核心**：基于互信息（PMI）而非纯频次，优先合并超预期共现的子词对。
- **Unigram 核心**：自顶向下全局修剪，基于语言模型边际似然损失剔除贡献最小的词。
- **SentencePiece 核心**：原生端到端将空格当成下划线普通字符处理，无需依赖语种特定规则。
- **协同机制**：变长输入批处理依赖 Padding 对齐，必须配套 Attention Mask 将填充位注意力置零。"""

    l3_code = """import numpy as np

def compute_wordpiece_scores(pair_counts, unigram_counts):
    scores = {}
    for (c1, c2), pair_freq in pair_counts.items():
        denom = unigram_counts.get(c1, 1) * unigram_counts.get(c2, 1)
        scores[(c1, c2)] = pair_freq / denom
    return scores

def build_batch_tensors(tokenized_seqs, pad_token_id=0, max_len=None):
    if max_len is None:
        max_len = max(len(seq) for seq in tokenized_seqs)
    batch_size = len(tokenized_seqs)
    input_ids = np.full((batch_size, max_len), pad_token_id, dtype=np.int64)
    attention_mask = np.zeros((batch_size, max_len), dtype=np.int64)
    for i, seq in enumerate(tokenized_seqs):
        actual_len = min(len(seq), max_len)
        input_ids[i, :actual_len] = seq[:actual_len]
        attention_mask[i, :actual_len] = 1
    return input_ids, attention_mask

unigrams = {'un': 100, 'able': 120, 'the': 5000, 'a': 4500}
pairs = {('un', 'able'): 90, ('a', 'the'): 120}
scores = compute_wordpiece_scores(pairs, unigrams)
print(f"('un', 'able') 互信息得分: {scores[('un', 'able')]:.6f}")
print(f"('a', 'the') 互信息得分:   {scores[('a', 'the')]:.6f}")

samples = [[101, 7592, 2088, 102], [101, 10938, 2003, 12476, 102]]
input_ids, attn_mask = build_batch_tensors(samples, pad_token_id=0, max_len=5)

assert scores[('un', 'able')] > scores[('a', 'the')]
assert input_ids[0, 4] == 0 and attn_mask[0, 4] == 0
assert np.all(attn_mask[1] == 1)
print("测试通过：WordPiece 打分与 Attention Mask 批处理对齐完全符合规范！")"""

    l3_tips = [
        tip("变长序列必须补齐到统一长度，Attention Mask 是确保 <pad> 填充位注意力权重严格为 0 的核心机制。", "pitfall"),
    ]

    lessons = [
        lesson("ml-tf-l1-1", "从词袋、Word2Vec 到子词分词的范式演进", l1_text, 2, l1_tips, [demo(code=l1_code, title="Skip-Gram 负采样更新与余弦相似度变化")]),
        lesson("ml-tf-l1-2", "BPE (Byte Pair Encoding) 算法原理与纯 Python 手写实现", l2_text, 3, l2_tips, [demo(code=l2_code, title="从零实现 BPE 词表训练与分词编码器")]),
        lesson("ml-tf-l1-3", "WordPiece, Unigram LM 与 SentencePiece 工业级分词方案", l3_text, 2, l3_tips, [demo(code=l3_code, title="WordPiece 互信息打分与批处理 Attention Mask 生成")]),
    ]

    exercises = [
        single_choice(
            ex_id="ml-tf-c1-ex1",
            question="为什么在现代自然语言处理中，稠密词向量（Dense Word Embeddings）全面取代了 One-Hot 独热编码？",
            options=[
                {"value": "A", "text": "One-Hot 编码计算矩阵乘法速度太慢，而稠密向量不支持 GPU 并行"},
                {"value": "B", "text": "One-Hot 编码将每个词视作相互正交的基向量，无法量化词与词之间的语义相似度，且面临维度灾难"},
                {"value": "C", "text": "稠密词向量必须由人类语言学家手工为每个词赋予 300 个语法属性，质量比模型自动学习更高"},
                {"value": "D", "text": "One-Hot 编码无法表示英语中的标点符号，只能处理大写英文字母"},
            ],
            answer="B",
            explanation="One-Hot 向量之间两两正交，内积均为 0，完全丢失了语义距离；且词表多大维度就有多高，极度稀疏。稠密词向量将词映射到低维连续流形中，使得语义相似的词在几何空间距离更近。",
            difficulty=2,
            related_lesson_id="ml-tf-l1-1",
            tags=["词向量", "One-Hot", "分布式假说", "Word2Vec"],
        ),
        multiple_choice(
            ex_id="ml-tf-c1-ex2",
            question="关于 Word2Vec Skip-Gram 模型中的负采样（Negative Sampling），下列叙述正确的有：",
            options=[
                {"value": "A", "text": "负采样将原本多分类 Softmax 的全局分母求和，简化为针对真实上下文与 K 个负样本的二分类对数似然"},
                {"value": "B", "text": "负样本从噪声分布 P_n(w) 中随机抽取，通常采用词频的 0.75 次方平滑以提升低频词被采样的概率"},
                {"value": "C", "text": "负采样把每步更新的时间复杂度从 O(|V|) 降低到了 O(K)，使得大规模语料训练在工业上成为现实"},
                {"value": "D", "text": "负采样完全消除了模型的随机性，使得每次跑出来的词向量在数值上绝对恒定不变"},
            ],
            answer=["A", "B", "C"],
            explanation="A、B、C 正确描述了负采样的数学转化、噪声分布平滑与复杂度收益。D 项错误，负采样引入了随机负样本采样，且随机初始化词向量，结果具有统计随机性。",
            difficulty=2,
            related_lesson_id="ml-tf-l1-1",
            tags=["负采样", "Skip-Gram", "Word2Vec"],
        ),
        judge(
            ex_id="ml-tf-c1-ex3",
            question="Word2Vec 学到的词向量是上下文敏感的动态向量：单词 'apple' 在 'apple pie' 和 'apple inc' 中会得到完全不同的嵌入向量。",
            answer=False,
            explanation="错误。Word2Vec 是静态词向量（Static Embedding），每个词在查找表中只有唯一的向量表示。只有 ELMo、BERT、GPT 等基于 Transformer 的模型才能产生动态上下文词向量。",
            difficulty=1,
            related_lesson_id="ml-tf-l1-1",
            tags=["静态词向量", "上下文表征"],
        ),
        single_choice(
            ex_id="ml-tf-c1-ex4",
            question="GPT-2、GPT-4 和 LLaMA 采用的 Byte-level BPE 分词算法，之所以能够从根本上消除 <unk>（未知 Token），是因为：",
            options=[
                {"value": "A", "text": "它将词表大小无限扩大，收录了人类历史上所有已知词汇"},
                {"value": "B", "text": "它以 UTF-8 编码的 256 个基础字节作为初始词表底座，任何文本都可以被无损还原为字节序列"},
                {"value": "C", "text": "它在遇到未登录词时会自动调用搜索引擎查询其释义"},
                {"value": "D", "text": "它强制将所有非英文字符直接翻译为英文单词后再分词"},
            ],
            answer="B",
            explanation="任何 Unicode 字符在底层都是合法的 UTF-8 字节。Byte-level BPE 初始词表囊括了 0~255 的全部 256 个字节单元，因此即便遇到从未见过的生僻字、emoji 或代码，最坏情况就是退化为单个 byte tokens，绝不会出现无法表示的 <unk>。",
            difficulty=2,
            related_lesson_id="ml-tf-l1-2",
            tags=["BPE", "Byte-level", "OOV", "分词"],
        ),
        fill(
            ex_id="ml-tf-c1-ex5",
            question="在 BPE 算法的每一轮合并迭代中，算法会在当前语料中统计所有相邻符号对的频次，并贪心选择出现频次最____（填'高'或'低'）的符号对合并为一个新的 Token。",
            blanks=[["高"]],
            explanation="BPE 每一轮都会合并全局统计中出现频次最高的相邻 Pair，从而将最高频的共现模式优先抽象为宏单元。",
            difficulty=1,
            related_lesson_id="ml-tf-l1-2",
            tags=["BPE", "贪心合并"],
        ),
        open_ex(
            ex_id="ml-tf-c1-ex6",
            question="简要说明为什么变长序列批处理（Batch Processing）必须使用 Attention Mask，若丢失 Attention Mask 会对模型计算带来什么危害？",
            reference_answer="原因与危害：\n1. 变长序列为了在 GPU 上进行批矩阵运算，必须通过 <pad> 填充到相同长度；\n2. 若没有 Attention Mask，Softmax 注意力机制会将 <pad> 视作有效的上下文语义 Token 分配注意力权重；\n3. 这会导致真实有效词的注意力分布被无意义的填充占位符稀释，严重破坏语义表示，甚至在自回归生成时导致模型不断生成乱码与死循环。",
            explanation="Attention Mask 是隔离硬件规整批计算与真实变长逻辑语义的关键防护堤。",
            rubric=[
                {"points": 5, "description": "说明变长批处理填充 <pad> 的硬件对齐背景"},
                {"points": 5, "description": "指出缺少 mask 会导致注意力权重被 <pad> 稀释破坏语义"},
            ],
            difficulty=3,
            related_lesson_id="ml-tf-l1-3",
            tags=["AttentionMask", "Padding", "批处理"],
        ),
        # ── Code Exercise 1 ──
        {
            "id": "ml-tf-c1-ex7",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】手写微型 BPE 训练器：\n编写函数 `train_bpe_step(corpus_dict, num_merges=3)`：\n1. `corpus_dict`：形如 `{'l o w </w>': 5, 'l o w e r </w>': 2}` 的词频字典；\n2. `num_merges`：合并轮数；\n3. 每轮统计所有紧邻符号对的频次，贪心选出频次最高的 pair 进行合并；\n4. 返回学到的规则列表 `[(c1, c2), ...]`。\n\n最后一行请以给定的 4 个单词字典和 3 轮合并测试。",
            "starterCode": "from collections import defaultdict\nfrom typing import Dict, List, Tuple\n\ndef train_bpe_step(corpus: Dict[str, int], num_merges: int = 3) -> List[Tuple[str, str]]:\n    \"\"\"训练简易 BPE 并返回合并规则列表\"\"\"\n    # 请在此实现\n    ___\n\ncorpus = {'l o w </w>': 5, 'l o w e r </w>': 2, 'n e w e s t </w>': 6, 'w i d e s t </w>': 3}\nrules = train_bpe_step(corpus, 3)\nprint(len(rules))\n",
            "setupCode": "",
            "expectedOutput": "3",
            "answer": "from collections import defaultdict\nfrom typing import Dict, List, Tuple\n\ndef get_stats(vocab):\n    pairs = defaultdict(int)\n    for word, freq in vocab.items():\n        symbols = word.split()\n        for i in range(len(symbols) - 1):\n            pairs[(symbols[i], symbols[i + 1])] += freq\n    return pairs\n\ndef merge_vocab(pair, v_in):\n    v_out = {}\n    bigram = ' '.join(pair)\n    replacement = ''.join(pair)\n    for word in v_in:\n        w_out = ' ' + word + ' '\n        w_out = w_out.replace(' ' + bigram + ' ', ' ' + replacement + ' ')\n        v_out[w_out.strip()] = v_in[word]\n    return v_out\n\ndef train_bpe_step(corpus: Dict[str, int], num_merges: int = 3) -> List[Tuple[str, str]]:\n    vocab = corpus.copy()\n    merges = []\n    for _ in range(num_merges):\n        pairs = get_stats(vocab)\n        if not pairs:\n            break\n        best_pair = max(pairs, key=pairs.get)\n        merges.append(best_pair)\n        vocab = merge_vocab(best_pair, vocab)\n    return merges\n\ncorpus = {'l o w </w>': 5, 'l o w e r </w>': 2, 'n e w e s t </w>': 6, 'w i d e s t </w>': 3}\nrules = train_bpe_step(corpus, 3)\nprint(len(rules))\n",
            "tests": "corpus_t = {'a b c': 10, 'a b d': 5}\nrules_t = train_bpe_step(corpus_t, 1)\nassert rules_t == [('a', 'b')], f\"测试不匹配: {rules_t}\"\n",
            "explanation": "通过统计相邻符号在全语料中的加权出现频次，选出频次最高者合并并更新语料，迭代生成有序合并规则表。",
            "tags": ["BPE", "分词算法", "统计合并", "算法实战"],
            "related_lesson_id": "ml-tf-l1-2",
        },
    ]

    return chapter(
        chapter_id="ml-tf-c1",
        course_id="ml-transformer-llm",
        order=1,
        title="文本表征与分词工程",
        goal="系统掌握自然语言离散符号到稠密向量的演进历程，深入 BPE、WordPiece、SentencePiece 算法机理与工业实现。",
        lessons=lessons,
        exercises=exercises,
    )
