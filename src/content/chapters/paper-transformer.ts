import type { Chapter } from '../../types';

/* ============================================================
 *  人工智能基础 · 论文导读 · 13 Attention Is All You Need
 *
 *  来源：
 *  - 论文原文：Vaswani et al. (2017), arXiv:1706.03762
 *  - 配套资源：Ojhaharsh/30u30 第 13 篇（CC BY-NC-ND 4.0，仅本地个人使用）
 *  - 本课程内容为原创导读 + 原创习题，代码参考 30u30 的实现思路
 * ============================================================ */

export const paperChapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'paper-transformer-c1',
    title: 'Attention Is All You Need：用注意力取代循环',
    goal: '理解为什么注意力能取代 RNN，掌握缩放点积注意力的计算过程，能手写一个最小的自注意力层。',
    lessons: [
      {
        id: 'paper-transformer-c1-l1',
        title: '从「排队处理」到「同时开会」',
        difficulty: 3,
        content: `
## 论文信息

| 项目 | 内容 |
| --- | --- |
| **标题** | Attention Is All You Need |
| **作者** | Vaswani, Shazeer, Parmar, Uszkoreit, Jones, Gomez, Kaiser, Polosukhin |
| **发表** | NeurIPS 2017 |
| **arXiv** | [1706.03762](https://arxiv.org/abs/1706.03762) |
| **一句话贡献** | 用纯注意力取代循环与卷积，训练速度提升一个数量级 |

**这篇论文改变了什么**：今天所有大模型（GPT、BERT、Claude、Llama）的骨架都来自这里。

## RNN 的根本瓶颈

**RNN/LSTM 的工作方式**：一个词一个词地处理。

    词1 → 词2 → 词3 → ... → 词n

**问题 1：无法并行**

第 5 个词必须等第 4 个词算完。
一句 100 个词的话，就要串行算 100 步。
**GPU 有上万个核，却只能用到 1 个。**

**问题 2：长距离依赖衰减**

第 1 个词的信息要传到第 100 个词，
中间经过 99 次变换，信号已经很弱了。

**问题 3：梯度消失**

反向传播要穿过 100 个时间步，梯度连乘后趋近于 0。

## Transformer 的核心洞察

**不要按顺序处理，让每个词直接"看"所有其他词。**

<SelfAttentionDemo />

**类比：从"传话游戏"到"开圆桌会议"**

| 模式 | 比喻 | 信息传递 |
| --- | --- | --- |
| **RNN** | 传话游戏：A 告诉 B，B 告诉 C | 逐个传递，会失真 |
| **Attention** | 圆桌会议：每个人直接听所有人说话 | 一步直达，无衰减 |

**这就是为什么 Attention 能解决长距离依赖**：
任意两个位置之间的距离都是 **1 步**，不管它们相隔多远。

## 缩放点积注意力：核心公式

    Attention(Q, K, V) = softmax(QK^T / √d_k) · V

**三个矩阵的含义**（用查字典类比）：

| 符号 | 名称 | 含义 | 类比 |
| --- | --- | --- | --- |
| **Q** | Query（查询） | 我想找什么 | 我要查的词 |
| **K** | Key（键） | 我能提供什么 | 字典的索引 |
| **V** | Value（值） | 我实际返回什么 | 字典的释义 |

**计算步骤**：

**① 算相似度**：\`QK^T\`

    每个 Query 与每个 Key 做点积 → 得到 n×n 的相关性矩阵

**点积的含义**：两个向量的点积越大，方向越接近，相关性越高。

**② 缩放**：\`/ √d_k\`

**为什么要缩放**：

    假设 Q、K 的每个分量是独立随机变量，方差为 1
    那么点积（d_k 项求和）的方差 ≈ d_k
    d_k = 64 时，点积的标准差 ≈ 8

**后果**：点积值过大会让 softmax 进入"饱和区"——
一个位置拿到接近 1 的权重，其余全是 0，梯度消失。

**除以 √d_k** 把方差拉回 1，让 softmax 工作在梯度良好的区域。

**③ 归一化**：\`softmax(...)\`

把每行变成概率分布（和为 1）。

**④ 加权求和**：\`· V\`

按权重把 Value 加权混合。

<AttentionMathDemo />

## 为什么叫"自"注意力（Self-Attention）

**Q、K、V 都来自同一个输入序列**，所以叫"自"注意力。

    输入 X (n × d)
      ↓ 三个不同的线性变换
    Q = X·W_Q,  K = X·W_K,  V = X·W_V
      ↓
    Attention(Q, K, V)

**三个 W 是可学习的参数**——模型自己学会"什么该被查询、什么该被匹配、什么该被传递"。

**对比**：如果是"交叉注意力"（Cross-Attention），
Q 来自解码器，K、V 来自编码器（如机器翻译里，Q 是译文，K/V 是原文）。

## 多头注意力：为什么要多个头

**单个注意力头只能学一种"关注模式"**。

但语言里同时存在多种关系：

    "小猫坐在垫子上，它很困"
    → "它" 需要关注 "小猫"（指代关系）
    → "坐" 需要关注 "垫子上"（位置关系）
    → 同时还需要语法、时态等关系

**多头注意力**：把 d_model 维切成 h 份，每份独立算注意力，最后拼接。

    head_i = Attention(Q·W_Qi, K·W_Ki, V·W_Vi)
    MultiHead = Concat(head_1, ..., head_h) · W_O

**类比**：h 个专家各自从不同角度看同一句话，最后汇总意见。

**原论文参数**：h = 8，d_model = 512，所以每个头 d_k = 64。

## 位置编码：Attention 的"盲点"

**关键问题**：Attention 本身**没有顺序概念**。

    "猫追狗" 和 "狗追猫"
    对纯 Attention 来说，是同一个"词袋"

**因为**：\`softmax(QK^T)·V\` 对输入的排列是**等变**的——
打乱顺序，输出也只是跟着打乱，不会产生不同结果。

**解法：位置编码（Positional Encoding）**

    给每个位置加一个独特的向量：
    PE(pos, 2i)   = sin(pos / 10000^(2i/d))
    PE(pos, 2i+1) = cos(pos / 10000^(2i/d))

**为什么用正弦函数**：

| 原因 | 说明 |
| --- | --- |
| **唯一性** | 每个位置有独特编码 |
| **有界** | 值域 [-1, 1]，不会爆炸 |
| **相对位置可推** | PE(pos+k) 可由 PE(pos) 线性表示 |
| **可外推** | 训练没见过的更长序列也能用 |

<PositionalEncodingDemo />

## 完整架构一览

    ┌─────────────── Encoder × 6 ───────────────┐
    │  Multi-Head Self-Attention                │
    │  ↓ Add & Norm                             │
    │  Feed-Forward (d→4d→d)                    │
    │  ↓ Add & Norm                             │
    └───────────────────────────────────────────┘
                      ↓
    ┌─────────────── Decoder × 6 ───────────────┐
    │  Masked Multi-Head Self-Attention         │
    │  ↓ Add & Norm                             │
    │  Cross-Attention (Q=解码器, K/V=编码器)     │
    │  ↓ Add & Norm                             │
    │  Feed-Forward                             │
    │  ↓ Add & Norm                             │
    └───────────────────────────────────────────┘

**三个关键设计**：

| 设计 | 作用 |
| --- | --- |
| **残差连接**（Add） | 让梯度直达底层，支持深层网络 |
| **Layer Norm** | 稳定训练 |
| **Masked Attention** | 解码时不能看到未来的词 |

## 为什么这个架构"吃掉了世界"

| 优势 | 说明 |
| --- | --- |
| **可并行** | 训练速度提升 10 倍以上 |
| **长距离依赖** | 任意两位置距离为 1 |
| **可扩展** | 加层、加宽、加数据，性能持续提升（Scaling Laws） |
| **通用** | 文本、图像、音频、蛋白质……同一套架构 |

**代价**：

| 代价 | 说明 |
| --- | --- |
| **O(n²) 复杂度** | 序列长度翻倍，计算量翻 4 倍 |
| **显存消耗大** | n×n 的注意力矩阵 |
| **没有归纳偏置** | 不像 CNN 有"局部性"先验，需要更多数据 |

**这就是为什么长上下文（100 万 token）是个工程难题**——
需要稀疏注意力、线性注意力、FlashAttention 等优化。

## 动手验证：自注意力的形状变化

下面这段代码可以直接运行，观察每一步的张量形状：

`,
        tips: [
          {
            kind: 'interview',
            text: '「为什么要除以 √d_k」：点积的方差随 d_k 线性增长，d_k=64 时标准差约 8，会让 softmax 饱和（一个位置权重接近 1，其余接近 0），梯度消失。除以 √d_k 把方差拉回 1。',
          },
          {
            kind: 'leak',
            text: '「Attention 为什么能解决长距离依赖」：任意两个位置之间都是 1 步连接，信息不需要逐级传递，因此不会衰减。',
          },
          {
            kind: 'pitfall',
            text: 'Attention 本身对顺序不敏感（等变性），必须靠位置编码注入顺序信息。没有位置编码，"猫追狗"和"狗追猫"对模型是一样的。',
          },
        ],
        demos: [
          {
            title: '最小自注意力实现（纯 numpy，可在浏览器运行）',
            lang: 'python',
            code: `import numpy as np

def softmax(x, axis=-1):
    """数值稳定的 softmax。"""
    x_max = np.max(x, axis=axis, keepdims=True)
    exp_x = np.exp(x - x_max)
    return exp_x / np.sum(exp_x, axis=axis, keepdims=True)

def scaled_dot_product_attention(Q, K, V, mask=None):
    """
    缩放点积注意力。
    
    Q: (..., n_q, d_k)  查询
    K: (..., n_k, d_k)  键
    V: (..., n_k, d_v)  值
    """
    d_k = Q.shape[-1]
    
    # ① 相似度：QK^T
    scores = Q @ K.transpose(-2, -1)      # (..., n_q, n_k)
    print(f"  ① QK^T 形状: {scores.shape}")
    print(f"     原始分数范围: [{scores.min():.2f}, {scores.max():.2f}]")
    
    # ② 缩放
    scores = scores / np.sqrt(d_k)
    print(f"  ② 除以 √{d_k}={np.sqrt(d_k):.2f} 后: [{scores.min():.2f}, {scores.max():.2f}]")
    
    # ③ 可选：掩码（屏蔽不该看的位置）
    if mask is not None:
        scores = np.where(mask, scores, -1e9)
        print(f"  ③ 应用掩码")
    
    # ④ softmax
    weights = softmax(scores, axis=-1)
    print(f"  ④ 注意力权重（每行和为 1）:")
    print(f"     {np.round(weights, 3)}")
    
    # ⑤ 加权求和
    out = weights @ V
    print(f"  ⑤ 输出形状: {out.shape}")
    return out, weights


print("=" * 55)
print("示例：3 个词，每个词用 4 维向量表示")
print("=" * 55)
np.random.seed(42)
n, d = 3, 4
X = np.random.randn(n, d)
print(f"输入 X:\\n{np.round(X, 2)}")
print()

# 三个投影矩阵（实际训练中学习得到）
W_Q = np.random.randn(d, d) * 0.5
W_K = np.random.randn(d, d) * 0.5
W_V = np.random.randn(d, d) * 0.5

Q, K, V = X @ W_Q, X @ W_K, X @ W_V
print(f"Q = X·W_Q:\\n{np.round(Q, 2)}")
print()

out, attn = scaled_dot_product_attention(Q, K, V)
print(f"\\n输出:\\n{np.round(out, 2)}")

print()
print("=" * 55)
print("关键观察")
print("=" * 55)
print(f"注意力矩阵 {attn.shape}: 每个词对其他词的关注度")
print(f"每行和: {np.round(attn.sum(axis=-1), 6)}  <- 都是 1")
print()
print("第 0 个词最关注第", np.argmax(attn[0]), "个词")
print("第 1 个词最关注第", np.argmax(attn[1]), "个词")
print("第 2 个词最关注第", np.argmax(attn[2]), "个词")`,
          },
          {
            title: '为什么要缩放：对比实验',
            lang: 'python',
            code: `import numpy as np

def softmax(x, axis=-1):
    x_max = np.max(x, axis=axis, keepdims=True)
    exp_x = np.exp(x - x_max)
    return exp_x / np.sum(exp_x, axis=axis, keepdims=True)

print("=== 缩放对 softmax 的影响 ===")
print()
print("d_k  | 不缩放: 最大权重 | 缩放后: 最大权重")
print("-" * 52)

np.random.seed(0)
for d_k in [4, 16, 64, 256, 1024]:
    # 模拟 QK^T 的一个分数向量
    scores = np.random.randn(d_k) * np.sqrt(d_k)   # 方差 ≈ d_k
    
    # 不缩放
    w_raw = softmax(scores)
    # 缩放
    w_scaled = softmax(scores / np.sqrt(d_k))
    
    print(f"{d_k:4d} | {w_raw.max():17.4f} | {w_scaled.max():16.4f}")

print()
print("=== 关键结论 ===")
print("d_k 越大，不缩放的 softmax 越'尖'（最大权重趋近 1）")
print("这会导致：")
print("  · 梯度只流向一个位置，其余位置几乎无梯度")
print("  · 模型难以学习（梯度消失）")
print()
print("缩放后，无论 d_k 多大，权重分布都保持在合理范围。")
print()

# 可视化梯度
print("=== softmax 的梯度大小 ===")
for d_k in [4, 64, 1024]:
    scores = np.random.randn(d_k) * np.sqrt(d_k)
    w_raw = softmax(scores)
    w_scaled = softmax(scores / np.sqrt(d_k))
    # softmax 的雅可比对角元素 = w_i(1-w_i)，衡量梯度大小
    grad_raw = (w_raw * (1 - w_raw)).max()
    grad_scaled = (w_scaled * (1 - w_scaled)).max()
    print(f"  d_k={d_k:4d}: 不缩放最大梯度 {grad_raw:.6f}, 缩放后 {grad_scaled:.6f}")`,
          },
          {
            title: '位置编码的可视化',
            lang: 'python',
            code: `import numpy as np
import matplotlib.pyplot as plt

def positional_encoding(max_len, d_model):
    """
    正弦位置编码（原论文公式）。
    
    PE(pos, 2i)   = sin(pos / 10000^(2i/d_model))
    PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))
    """
    pe = np.zeros((max_len, d_model))
    position = np.arange(0, max_len).reshape(-1, 1)
    
    div_term = np.exp(np.arange(0, d_model, 2) * -(np.log(10000.0) / d_model))
    
    pe[:, 0::2] = np.sin(position * div_term)
    pe[:, 1::2] = np.cos(position * div_term)
    return pe

pe = positional_encoding(50, 64)
print(f"位置编码矩阵: {pe.shape}")
print(f"值域: [{pe.min():.3f}, {pe.max():.3f}]")
print()

# 检查唯一性
print("=== 每个位置的编码是否唯一 ===")
unique = len(set(map(tuple, np.round(pe, 6))))
print(f"50 个位置 -> {unique} 个唯一编码: {'✓' if unique == 50 else '✗'}")

# 检查相对位置关系
print()
print("=== 相对位置的可推导性 ===")
print("PE(pos+k) 可以由 PE(pos) 线性变换得到")
print("（这是正弦编码的关键性质，让模型能理解'相对距离'）")
print()

# 绘图
fig, axes = plt.subplots(1, 2, figsize=(12, 4))

axes[0].imshow(pe.T, aspect='auto', cmap='RdBu', origin='lower')
axes[0].set_xlabel('Position')
axes[0].set_ylabel('Dimension')
axes[0].set_title('Positional Encoding Matrix')

axes[1].plot(pe[:20, 0], label='dim 0 (sin)', marker='o', markersize=3)
axes[1].plot(pe[:20, 1], label='dim 1 (cos)', marker='s', markersize=3)
axes[1].plot(pe[:20, 4], label='dim 4 (sin, 高频)', marker='^', markersize=3)
axes[1].set_xlabel('Position')
axes[1].set_ylabel('Value')
axes[1].set_title('Encoding Values by Position')
axes[1].legend()
axes[1].grid(alpha=0.3)

plt.tight_layout()
plt.savefig('positional_encoding.png', dpi=80, bbox_inches='tight')
print("已生成图表: positional_encoding.png")
print()
print("观察：")
print("  · 低维（dim 0,1）变化慢，编码'大范围'位置")
print("  · 高维（dim 4+）变化快，编码'精细'位置")
print("  · 多个频率叠加 -> 每个位置有独特'指纹'")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'paper-transformer-c1-e1',
        type: 'single',
        difficulty: 2,
        question: 'Transformer 相比 RNN 最核心的优势是？',
        options: [
          { value: 'A', text: '参数更少' },
          { value: 'B', text: '可以并行处理所有位置，且任意两位置距离为 1 步' },
          { value: 'C', text: '不需要训练' },
          { value: 'D', text: '只能处理短文本' },
        ],
        answer: 'B',
        explanation:
          'RNN 必须串行（第 n 步依赖第 n-1 步），且长距离信息会衰减。Attention 让所有位置同时计算，任意两位置直接相连，既快又解决长距离依赖。',
        tags: ['核心优势'],
      },
      {
        id: 'paper-transformer-c1-e2',
        type: 'judge',
        difficulty: 2,
        question: 'Attention 机制本身能区分词的顺序，所以不需要位置编码。',
        answer: false,
        explanation:
          '恰恰相反。Attention 对输入排列是等变的——打乱输入顺序，输出只是跟着打乱。没有位置编码，"猫追狗"和"狗追猫"对模型完全一样。必须靠位置编码注入顺序。',
        tags: ['位置编码'],
      },
      {
        id: 'paper-transformer-c1-e3',
        type: 'multiple',
        difficulty: 3,
        question: '缩放点积注意力中除以 √d_k 的作用是？（多选）',
        options: [
          { value: 'A', text: '控制点积的方差，避免 softmax 饱和' },
          { value: 'B', text: '防止梯度消失' },
          { value: 'C', text: '减少参数量' },
          { value: 'D', text: '让权重分布保持在梯度良好的区域' },
        ],
        answer: ['A', 'B', 'D'],
        explanation:
          'C 错误——缩放不改变参数量。点积方差随 d_k 线性增长，d_k=64 时标准差约 8，softmax 会变得极尖（一个位置权重≈1），梯度消失。除以 √d_k 把方差拉回 1。',
        tags: ['缩放'],
      },
      {
        id: 'paper-transformer-c1-e4',
        type: 'fill',
        difficulty: 3,
        question:
          '自注意力中，Q、K、V 三个矩阵都来自同一个输入序列 X，通过三个不同的 ___ 变换得到。',
        blanks: [['线性', 'linear', '矩阵', '权重']],
        explanation:
          'Q = X·W_Q, K = X·W_K, V = X·W_V，三个 W 是可学习参数。"自"注意力的"自"就是指 Q/K/V 同源。',
        tags: ['自注意力'],
      },
      {
        id: 'paper-transformer-c1-e5',
        type: 'single',
        difficulty: 3,
        question: '多头注意力的主要作用是？',
        options: [
          { value: 'A', text: '增加参数量提升性能' },
          { value: 'B', text: '让模型同时学习多种不同的关注模式（指代、位置、语法等）' },
          { value: 'C', text: '减少计算量' },
          { value: 'D', text: '替代位置编码' },
        ],
        answer: 'B',
        explanation:
          '单个注意力头只能学一种关注模式，但语言里同时存在指代、位置、语法等多种关系。多头让 h 个"专家"从不同角度看同一句话，最后拼接汇总。',
        tags: ['多头注意力'],
      },
      {
        id: 'paper-transformer-c1-e6',
        type: 'code',
        difficulty: 2,
        question:
          '实现数值稳定的 softmax：stable_softmax(x)。\n\n要求：减去最大值防止 exp 溢出，保持最后一维归一化（和为 1）。',
        starterCode: `import numpy as np

def stable_softmax(x):
    """数值稳定的 softmax（沿最后一维）。"""
    ___
`,
        setupCode: '',
        expectedOutput: '每行和为 1',
        tests: `import numpy as np
# 普通输入
x = np.array([[1.0, 2.0, 3.0]])
out = stable_softmax(x)
assert out.shape == (1, 3)
assert abs(out.sum() - 1.0) < 1e-9, f"和应为 1，实际 {out.sum()}"
assert abs(out[0, 2] - 0.6652) < 1e-3, f"最大值位置应约 0.665，实际 {out[0,2]}"

# 极大值不应溢出
big = np.array([[1000.0, 1001.0, 1002.0]])
out2 = stable_softmax(big)
assert not np.isnan(out2).any(), "不应产生 NaN"
assert abs(out2.sum() - 1.0) < 1e-9
assert abs(out2[0, 2] - 0.6652) < 1e-3, "结果应与普通输入一致"

# 批量
batch = np.random.randn(4, 5)
out3 = stable_softmax(batch)
assert out3.shape == (4, 5)
assert np.allclose(out3.sum(axis=-1), 1.0)
`,
        answer: `import numpy as np

def stable_softmax(x):
    """数值稳定的 softmax（沿最后一维）。"""
    x_max = np.max(x, axis=-1, keepdims=True)
    exp_x = np.exp(x - x_max)
    return exp_x / np.sum(exp_x, axis=-1, keepdims=True)
`,
        explanation:
          '**`keepdims=True` 是关键**——保持形状以便广播。若不加，`np.max` 会降维，减法时形状不匹配。\n\n**为什么减最大值**：`exp(1000)` 会溢出为 inf，`inf/inf = nan`。减去最大值后最大项变成 `exp(0)=1`，不会溢出，且数学上等价（softmax 对平移不变）。',
        tags: ['编程', 'softmax'],
      },
      {
        id: 'paper-transformer-c1-e7',
        type: 'code',
        difficulty: 3,
        question:
          '实现缩放点积注意力：scaled_dot_product_attention(Q, K, V, mask=None)。\n\n步骤：\n1. scores = Q @ K.T / sqrt(d_k)\n2. 若有 mask，把 mask 为 False 的位置设为 -1e9\n3. weights = softmax(scores)\n4. 返回 (weights @ V, weights)',
        starterCode: `import numpy as np

def softmax(x, axis=-1):
    x_max = np.max(x, axis=axis, keepdims=True)
    exp_x = np.exp(x - x_max)
    return exp_x / np.sum(exp_x, axis=axis, keepdims=True)

def scaled_dot_product_attention(Q, K, V, mask=None):
    d_k = Q.shape[-1]
    scores = ___   # 提示：用 np.swapaxes(K, -2, -1) 兼容 2D/3D
    if mask is not None:
        ___
    weights = ___
    output = ___
    return output, weights
`,
        setupCode: '',
        expectedOutput: '输出与注意力权重',
        tests: `import numpy as np
np.random.seed(0)
Q = np.random.randn(2, 3, 8)
K = np.random.randn(2, 4, 8)
V = np.random.randn(2, 4, 6)

out, w = scaled_dot_product_attention(Q, K, V)
assert out.shape == (2, 3, 6), f"输出形状应为 (2,3,6)，实际 {out.shape}"
assert w.shape == (2, 3, 4), f"权重形状应为 (2,3,4)，实际 {w.shape}"
assert np.allclose(w.sum(axis=-1), 1.0), "权重每行和应为 1"

# 测试 mask（因果掩码：只能看自己和之前）
mask = np.tril(np.ones((3, 3), dtype=bool))
Q2 = np.random.randn(3, 8); K2 = np.random.randn(3, 8); V2 = np.random.randn(3, 6)
out2, w2 = scaled_dot_product_attention(Q2, K2, V2, mask=mask)
assert out2.shape == (3, 6)
# 第 0 行只能看第 0 列
assert abs(w2[0, 1]) < 1e-6, f"位置0不应看到位置1，权重应为0，实际 {w2[0,1]}"
assert abs(w2[0, 0] - 1.0) < 1e-6, "位置0只能看自己，权重应为1"
# 第 2 行能看 0,1,2
assert w2[2, :3].sum() > 0.999
`,
        answer: `import numpy as np

def softmax(x, axis=-1):
    x_max = np.max(x, axis=axis, keepdims=True)
    exp_x = np.exp(x - x_max)
    return exp_x / np.sum(exp_x, axis=axis, keepdims=True)

def scaled_dot_product_attention(Q, K, V, mask=None):
    d_k = Q.shape[-1]
    scores = Q @ np.swapaxes(K, -2, -1) / np.sqrt(d_k)
    if mask is not None:
        scores = np.where(mask, scores, -1e9)
    weights = softmax(scores, axis=-1)
    output = weights @ V
    return output, weights
`,
        explanation:
          '**`K.transpose(-2, -1)`** 把最后两维转置，实现 `QK^T`。用 `-2,-1` 而非固定轴，支持批量。\n\n**掩码用 `-1e9` 而非 `-inf`**：`-inf` 在 softmax 中会得到 `exp(-inf - (-inf)) = nan`，而 `-1e9` 经过 `exp` 后是 0，安全。\n\n**因果掩码 `np.tril`**：下三角为 True，表示每个位置只能看到自己和之前的位置——这是解码器防止"偷看未来"的关键。',
        tags: ['编程', '注意力实现'],
      },
      {
        id: 'paper-transformer-c1-e8',
        type: 'code',
        difficulty: 3,
        question:
          '实现正弦位置编码：positional_encoding(max_len, d_model)。\n\nPE(pos, 2i)   = sin(pos / 10000^(2i/d_model))\nPE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))\n\n返回 (max_len, d_model) 矩阵。',
        starterCode: `import numpy as np

def positional_encoding(max_len, d_model):
    pe = np.zeros((max_len, d_model))
    position = np.arange(0, max_len).reshape(-1, 1)
    div_term = ___
    pe[:, 0::2] = ___
    pe[:, 1::2] = ___
    return pe
`,
        setupCode: '',
        expectedOutput: '位置编码矩阵',
        tests: `import numpy as np
pe = positional_encoding(10, 16)
assert pe.shape == (10, 16), f"形状应为 (10,16)，实际 {pe.shape}"
assert pe.min() >= -1.0 and pe.max() <= 1.0, "值域应在 [-1,1]"

# 位置 0 的编码：sin(0)=0, cos(0)=1
assert np.allclose(pe[0, 0::2], 0.0), "位置0的sin项应为0"
assert np.allclose(pe[0, 1::2], 1.0), "位置0的cos项应为1"

# 每个位置唯一
unique = len(set(map(tuple, np.round(pe, 6))))
assert unique == 10, f"应有10个唯一编码，实际 {unique}"

# 第一维（dim 0）的周期应是 2π
# pos=0 -> 0, pos=1 -> sin(1)≈0.841
assert abs(pe[1, 0] - np.sin(1.0)) < 1e-6, f"pe[1,0] 应为 sin(1)，实际 {pe[1,0]}"
`,
        answer: `import numpy as np

def positional_encoding(max_len, d_model):
    pe = np.zeros((max_len, d_model))
    position = np.arange(0, max_len).reshape(-1, 1)
    div_term = np.exp(np.arange(0, d_model, 2) * -(np.log(10000.0) / d_model))
    pe[:, 0::2] = np.sin(position * div_term)
    pe[:, 1::2] = np.cos(position * div_term)
    return pe
`,
        explanation:
          '**`div_term` 的推导**：\n\n    10000^(2i/d) = exp((2i/d) · ln(10000))\n    1/10000^(2i/d) = exp(-(2i/d) · ln(10000))\n\n用 `np.arange(0, d_model, 2)` 生成偶数索引 `2i`，正好对应 `pe[:, 0::2]` 的位置。\n\n**`0::2` 和 `1::2`** 是 Python 切片，分别取偶数列和奇数列，对应 sin 和 cos。\n\n**为什么用 exp/log 而非直接幂运算**：数值更稳定，且避免大数溢出。',
        tags: ['编程', '位置编码'],
      },
      {
        id: 'paper-transformer-c1-e9',
        type: 'judge',
        difficulty: 4,
        question: 'Transformer 的注意力计算复杂度是 O(n²)，所以序列长度翻倍时计算量也翻倍。',
        answer: false,
        explanation:
          'O(n²) 意味着序列长度翻倍，计算量翻 4 倍（不是 2 倍）。这是 Transformer 处理长上下文的核心瓶颈，也是 FlashAttention、稀疏注意力等优化的动机。',
        tags: ['复杂度'],
      },
      {
        id: 'paper-transformer-c1-e10',
        type: 'open',
        difficulty: 4,
        question:
          '请解释 Transformer 相比 RNN 的三个核心优势，并说明它付出的代价。如果你的任务是处理 100 万 token 的超长文档，会面临什么问题、有哪些解法？',
        referenceAnswer: `**一、三个核心优势**

**① 可并行（训练速度）**

RNN 必须串行：第 n 步依赖第 n-1 步的输出。
一句 100 词的话要 100 个串行步骤，GPU 的上万个核只能用 1 个。

Transformer 的所有位置同时计算：
自注意力是一堆矩阵乘法，天然可并行。

**实测差异**：原论文报告训练时间从数天降到数小时（约 10 倍）。

**② 长距离依赖无衰减**

RNN 中，第 1 个词的信息传到第 100 个词要经过 99 次变换，
信号衰减 + 梯度消失（即使 LSTM 也只能缓解，不能根治）。

Transformer 中，任意两个位置的距离都是 **1 步**（一次注意力）：
信息不需要逐级传递，直接相连。

**③ 可扩展性**

Transformer 可以通过"加层、加宽、加数据"持续提升性能，
这个规律被 Scaling Laws（第 25 篇论文）量化。

RNN 加深会梯度消失，加宽收益递减，难以规模扩展。

---

**二、付出的代价**

| 代价 | 具体表现 |
| --- | --- |
| **O(n²) 复杂度** | 序列长度 n 翻倍，计算量翻 4 倍 |
| **显存消耗** | 注意力矩阵是 n×n，100 万 token 需要 10¹² 个元素 |
| **缺少归纳偏置** | CNN 有"局部性"先验，RNN 有"顺序性"先验，Transformer 什么都没有，需要更多数据才能学会 |
| **位置编码是外挂** | 顺序信息不是内生的，而是额外注入的 |

---

**三、100 万 token 的挑战**

**问题 1：注意力矩阵爆炸**

    100 万 token → 注意力矩阵 10¹² 个元素
    float16 存储需要 2 TB 显存

**问题 2：计算量爆炸**

    10¹² 次点积运算，即使 GPU 也需要数小时

**问题 3：位置编码外推**

标准正弦编码在训练长度外表现下降（虽然比学习式编码好）。

**问题 4：信息稀释**

100 万个 token 里，真正相关的可能只有几个，
softmax 要在 100 万个候选里分配注意力，容易"注意力涣散"。

---

**四、解法（按层次）**

**① 工程层：FlashAttention（最实用）**

不改变数学结果，只优化显存访问：
- 分块计算，避免把完整的 n×n 矩阵写入显存；
- 用在线 softmax 累积，显存从 O(n²) 降到 O(n)。

**效果**：同样显存能处理 4~8 倍长的序列，速度提升 2~4 倍。

**② 稀疏注意力**

只计算部分位置对：

| 方案 | 思路 |
| --- | --- |
| **局部窗口** | 每个 token 只看前后 k 个（Longformer） |
| **全局+局部** | 少量全局 token 看全部，其余看局部（BigBird） |
| **块稀疏** | 按块划分，只计算部分块对 |

复杂度从 O(n²) 降到 O(n·k)。

**③ 线性注意力**

用核函数近似 softmax，把 \`softmax(QK^T)V\` 重排为 \`Q(K^TV)\`，
复杂度降到 O(n)。

**代价**：表达能力下降，长文本任务上质量不如标准注意力。

**④ 检索增强（RAG）**

**这是目前最主流的工程解法**：
不把 100 万 token 全塞进上下文，而是：
1. 把文档切块、向量化、建索引；
2. 查询时只检索最相关的 top-k 块（如 10 块）；
3. 只把这 10 块送进模型。

**优点**：成本与文档长度无关（只与 top-k 有关）
**缺点**：可能漏检（检索没召回就看不到）

**⑤ 状态空间模型（Mamba 等）**

用线性递归替代注意力，复杂度 O(n)，
在超长序列上有优势，但目前生态不如 Transformer 成熟。

---

**五、实践建议**

| 文档长度 | 推荐方案 |
| --- | --- |
| < 32k | 标准 Transformer |
| 32k ~ 200k | FlashAttention + 长上下文模型 |
| 200k ~ 1M | 检索增强（RAG）为主 |
| > 1M | RAG + 分层摘要（先摘要再检索） |

**关键判断**：**不是所有任务都需要"全文进上下文"**。

大部分场景（问答、摘要、检索）用 RAG 就够了，
真正需要全文理解的（如跨章节推理、长代码库分析）才需要长上下文。

**成本对比**：
- 100 万 token 全塞进上下文：每次请求约 $3~15
- RAG（检索 10 块，约 1 万 token）：每次约 $0.03

**差 100~500 倍。**`,
        rubric: [
          { point: '三个优势：可并行、长距离 1 步、可扩展', score: 3 },
          { point: '代价：O(n²)、显存、缺归纳偏置、位置编码外挂', score: 2 },
          { point: '100 万 token 的具体问题（2TB 显存、注意力涣散）', score: 2 },
          { point: '解法分层：FlashAttention / 稀疏 / 线性 / RAG / SSM', score: 2 },
          { point: '指出「不是所有任务都需要全文进上下文」+ 成本对比', score: 1 },
        ],
        keywords: ['O(n²)', 'FlashAttention', 'RAG', '稀疏注意力', '注意力涣散', '成本差 100 倍'],
        explanation:
          '能说清「RAG 是当前最主流的工程解法」以及「100 万 token 全塞上下文贵 100 倍」，就是理解了长上下文的真实权衡。',
        tags: ['综合', '长上下文'],
      },
    ],
  },
];
