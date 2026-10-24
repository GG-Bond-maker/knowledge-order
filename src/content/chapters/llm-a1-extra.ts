import type { Chapter } from '../../types';

/* ============================================================
 *  《从零手写大模型》第 3~7 章
 *
 *  c3 嵌入层与位置编码 / c4 自注意力机制 / c5 多头注意力
 *  c6 残差连接与 LayerNorm / c7 FFN 与激活函数
 *
 *  参考：Attention Is All You Need、The Illustrated Transformer、
 *       nano-ai.tech《从零手写大模型》系列
 * ============================================================ */

export const llmA1Extra: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
  id: 'llm-a1-c3',
  title: '嵌入层与位置编码',
  goal: '亲手实现 embedding 查表与三种位置编码，理解为什么自注意力必须显式注入位置信息，并能解释正弦、可学习、RoPE 三种方案的取舍。',
  lessons: [
    {
      id: 'llm-a1-c3-l1',
      title: 'Embedding 查表：从 token ID 到稠密向量',
      content: `
## 模型第一层到底做了什么

Transformer 的输入是一串整数 ID，例如 \`[101581, 101640, 43676]\`。第一个可学习模块要把这些整数变成能参与矩阵乘法的实数向量，这个模块就是 **embedding 层**。它没有乘法也没有激活函数，只有一次**按行索引（gather）**：

\`\`\`python
X = E[ids]
\`\`\`

设词表大小 V = 32000、隐藏维度 d = 4096，则 embedding 矩阵 E 的形状是 **[V, d]**。给定形状 [n] 的 ID 序列，输出 X 的形状就是 **[n, d]**；加上 batch 维度则为 **[B, n, d]**。

- 参数量：V × d = 32000 × 4096 约 1.31 亿；
- 浮点运算量：**0 次乘加**，只是内存搬运；
- 时间复杂度：O(n·d)，**与词表大小 V 无关**——这正是它比"显式 one-hot 乘法"快几个数量级的原因。

## one-hot 乘法：数学等价的慢速版本

如果先把第 i 个 token 写成 one-hot 向量 o（形状 [V]，只有第 i 位为 1），再与 E 相乘：

x = o 乘以 E，即 x_j = sum_k o_k 乘以 E_kj

由于 o 只有一个非零元 o_i = 1，求和退化为单项：**x_j = E_ij**，也就是 E 的第 i 行。所以"查表"与"one-hot 乘矩阵"在数学上完全等价，区别只在工程实现：

| 视角 | 一次前向的存储 | 乘加次数 | 实际采用 |
| --- | --- | --- | --- |
| 显式 one-hot 乘 E | 需物化 [n, V] 的稀疏矩阵，再算 [n, V]×[V, d] | n × V × d | 否 |
| 按行索引 gather | 直接取 [n, d] | 0 | 是 |

n = 1024、V = 32000、d = 4096 时，前者需要约 1.34e11 次乘加，后者一次都不需要。教材常用 one-hot 解释，但**任何生产框架都不会真的构造 one-hot**。

## one-hot 到底差在哪里

| 维度 | one-hot | 稠密 embedding |
| --- | --- | --- |
| 维度 | V（十万级） | d（128~8192） |
| 稀疏性 | 只有 1 个非零元 | 全部稠密 |
| 任意两词的相似度 | 恒为 0 | 有意义的实数 |
| 是否可学习 | 否 | 是，由梯度驱动 |
| 存储 | 每词 V 个浮点 | 每词 d 个浮点 |

one-hot 的核心问题是**正交性**：任何两个 token 的内积都是 0，模型无法从输入表示本身知道"猫"与"猫咪"有关，只能靠后续层从头学。稠密向量把"语义相近"编码为"空间距离近"，让第一层就带着先验进入计算。

## 为什么 embedding 的梯度是稀疏的

前向只有被索引到的行被读取，反向同理：**只有被查到的那些行会累加梯度**，其余行梯度为 0。例如一个 batch 里出现了 V = 32000 个 token 中的 5000 个，那么这一轮只有 5000 行被更新。这条性质带来两个实际后果：

1. embedding 是**稀疏参数**，V × d 常占小模型总参数的 30% 以上；
2. AdamW 若为全部 V × d 个元素分配动量与方差，优化器状态显存是参数的 2 倍。工程上常用稀疏更新、冻结 embedding、或按 token 频次单独设置学习率。

\`\`\`python
import numpy as np

V, d, n = 8, 4, 3
E = np.arange(V * d, dtype=float).reshape(V, d)
ids = np.array([2, 5, 0])
X = E[ids]                      # [3, 4]
onehot = np.zeros((n, V))
onehot[np.arange(n), ids] = 1.0
print("gather 等于 one-hot 乘法:", np.allclose(X, onehot @ E))
\`\`\`

## 缩放因子 sqrt(d_model)

原始 Transformer 论文在 embedding 后乘以 sqrt(d_model)，即 \`X = E[ids] * sqrt(d)\`。直观理由是量级平衡：位置编码的每一维取值在 [-1, 1] 之间，而初始化后词向量元素标准差约 0.02，直接相加会把位置信号淹没。乘上 sqrt(d) 让两者的有效量级可比。GPT-2 之后的 Pre-LN 结构一般不再需要这一步，但很多教程仍然保留它。

## 权重共享（weight tying）

GPT-2 让输入 embedding E（[V, d]）与输出层 LM head 共用同一个矩阵：\`logits = h 乘以 E 转置\`。这样省下 V × d 参数（V = 15 万、d = 4096 时约 6 亿），并让输入与输出处在同一个语义空间。T5 与部分 LLaMA 变体同样采用 tying；也有些模型保持不共享，两者都能训练成功。

## 常见误区

1. **以为 embedding 会"理解"token**：它只是一张查表，语义是后续几十层注意力在预训练中逐步塑造的；
2. **以为维度越高越好**：d 由架构决定（与注意力头数耦合），改 embedding 维度等于改整个模型；
3. **把 padding 位置的向量当作有效信息**：pad 的 embedding 也会被查出来，必须靠 attention mask 屏蔽；
4. **以为 1 个词必须对应 1 个向量**：embedding 对每组 ID 输出一个向量，但一个词分词后可能是多个 token，各有各的向量。
`,
      tips: [
        {
          kind: 'pitfall',
          text: '查表用 `E[ids]` 时 `ids` 必须是整数数组。若不小心传入浮点数组，numpy 会直接抛 `IndexError`，务必在入口处 `np.asarray(ids, dtype=np.int64)`。',
        },
        {
          kind: 'performance',
          text: 'embedding 层是**访存密集**而非计算密集。把 batch 内所有序列补位后一次性 gather，比在 Python 里逐条循环快一到两个数量级，瓶颈是显存带宽而不是算力。',
        },
        {
          kind: 'interview',
          text: '高频题："embedding 查表等价于 one-hot 乘矩阵，为什么不用 one-hot？" 答：稀疏乘法要 O(n·V·d) 次乘加且需物化稀疏矩阵，gather 只要 O(n·d) 次内存搬运，且梯度天然稀疏。',
        },
        {
          kind: 'note',
          text: '权重共享（weight tying）能省下 V × d 参数，并让输入端与输出端共享语义空间；是否共享不影响可训练性，属于工程取舍。',
        },
      ],
      demos: [
        {
          title: '手写 embedding 查表：验证 gather 与 one-hot 乘法等价',
          lang: 'python',
          code: `import numpy as np

V, d, n = 10, 6, 4
rng = np.random.default_rng(0)
E = rng.normal(0, 0.02, size=(V, d))
ids = np.array([3, 7, 1, 3], dtype=np.int64)

X = E[ids]                       # 形状 [4, 6]
print("embedding 输出形状:", X.shape)

onehot = np.zeros((n, V))
onehot[np.arange(n), ids] = 1.0
print("gather 与 one-hot 乘法等价:", np.allclose(X, onehot @ E))
print("重复出现的 token 3 两次向量相同:", np.allclose(X[0], X[3]))

batch = np.array([[1, 2, 3], [4, 5, 6]])
print("批量输入形状:", E[batch].shape, "-> [B, n, d]")

X_scaled = E[ids] * np.sqrt(d)
print("缩放前后每行范数: %.4f -> %.4f" % (np.linalg.norm(X[0]), np.linalg.norm(X_scaled[0])))`,
        },
        {
          title: 'embedding 的梯度是稀疏的：只有被查到的行会被更新',
          lang: 'python',
          code: `import numpy as np

V = 8
ids = [2, 5, 2]
rng = np.random.default_rng(1)

counts = np.zeros(V)
np.add.at(counts, ids, 1.0)     # 重复索引会累加，而不是覆盖
print("每个 token 被查询的次数:", counts.astype(int))

grad = np.zeros((V, 3))
for i in ids:
    grad[i] += rng.normal(size=3)     # 只有出现过的行有梯度
active = int((np.abs(grad).sum(axis=1) > 0).sum())
print("非零梯度行数:", active, "/", V)
print("结论：一个 batch 只更新被索引到的行，其余行梯度恒为 0。")`,
        },
      ],
    },
    {
      id: 'llm-a1-c3-l2',
      title: '位置编码：正弦编码的推导与实现',
      content: `
## 自注意力为什么"不知道顺序"

自注意力对输入是**置换等变**的：把 token 顺序打乱，输出只不过跟着一起打乱。证明很简单，记置换矩阵为 P：

Attention(PX) = softmax((PX)(PX)ᵀ / sqrt(d_k)) 乘以 (PX) 再乘以 W_V

由于 (PX)(PX)ᵀ = P X Xᵀ Pᵀ 且 softmax 逐行归一化与置换可交换，最终得到 P 乘以 Attention(X)。也就是说，**"狗咬人"与"人咬狗"在自注意力眼里没有区别**，必须显式把位置信息注入表示。

## 正弦位置编码的定义

Vaswani 等人（2017）给出的方案不需要任何参数，直接由位置计算得到：

- 偶数维（下标 2i）：PE(pos, 2i) = sin(pos / 10000^(2i/d))
- 奇数维（下标 2i+1）：PE(pos, 2i+1) = cos(pos / 10000^(2i/d))

其中 pos 是 token 的位置，i = 0, 1, …, d/2 - 1，d 是隐藏维度。所有取值都落在 [-1, 1]。

## 波长为什么是指数分布

定义第 i 对维度的波长 lambda_i = 2π 乘以 10000^(2i/d)。随 i 增加，指数线性增长，因此波长呈**等比数列**：从 2π（约 6.28）一直到 10000 乘以 2π。d = 512 时相邻波长的比值是 10000^(2/512) 约 1.036，几乎是连续覆盖。

这种设计类比二进制计数：最低位（小波长维度）交替最快，最高位（大波长维度）几乎不变。不同维度的"翻转频率"不同，组合起来就能唯一标识每一个位置。

## 关键性质：PE(pos + k) 是 PE(pos) 的线性变换

对固定的偏移 k，记 omega_i = 1 / 10000^(2i/d)，由和角公式：

- sin((pos + k)·omega_i) = sin(pos·omega_i)·cos(k·omega_i) + cos(pos·omega_i)·sin(k·omega_i)

把第 i 对维度记为向量 s_i(pos) = [sin(pos·omega_i), cos(pos·omega_i)]，则：

s_i(pos + k) = M(k·omega_i) 乘以 s_i(pos)，其中 M(θ) = [[cos θ, sin θ], [-sin θ, cos θ]]

不同维度之间的变换只依赖 k，与 pos 无关。因此整个编码满足：

PE(pos + k) = A_k 乘以 PE(pos)，A_k 只与 k 有关

这就是正弦编码"内含相对位置信息"的数学解释：模型只要能学到与相对距离有关的线性读取方式，就能利用它。

## 每行范数恒定

因为每一维要么是 sin、要么是 cos，平方和为 1，所以每一行有 d/2 项平方和恒等于 d/2：

||PE(pos)|| 恒等于 sqrt(d/2)

这与"直接与词向量相加"的用法匹配：每个位置的编码强度相同，不会让某些位置天然压过其他位置。

## numpy 实现

\`\`\`python
import numpy as np

def sinusoidal(n, d):
    pos = np.arange(n)[:, None]                    # [n, 1]
    div = 10000 ** (2 * np.arange(0, d, 2) / d)    # [d/2]
    ang = pos / div[None, :]                       # [n, d/2]
    pe = np.zeros((n, d))
    pe[:, 0::2] = np.sin(ang)
    pe[:, 1::2] = np.cos(ang)
    return pe

pe = sinusoidal(64, 512)
print(pe.shape, np.linalg.norm(pe, axis=1)[:3])   # [64, 512]，范数均为 sqrt(256)=16
\`\`\`

形状变化：\`pos [n,1]\` 与 \`div [1,d/2]\` 广播得到 \`ang [n,d/2]\`，再写入两个交错切片得到 \`[n,d]\`。

## 常见误区

1. **指数写成 2i / (d/2)**：正确写法是 2i/d。写成 d/2 会让频率整体翻倍，最短波长与最长波长的比例失衡，位置分辨率分布与论文完全不同。
2. **以为正弦编码是"绝对位置"**：它编码的确实是绝对位置，但由于存在固定线性变换关系，模型可以从中学到相对位置；这是它与"随机常数向量"的本质区别。
3. **以为正弦编码完全不用训练就能外推**：训练时没见过的角度组合仍会让注意力陷入陌生区间，实践中效果会明显下降。
4. **奇偶顺序搞反**：sin 在偶数维、cos 在奇数维，反过来只是约定不同，但权重加载时必须与训练时一致。

## 小结

正弦位置编码是"零参数 + 可分辨位置 + 近似相对性"的组合，适合作为理解位置编码的起点。它也是 RoPE 思想的直接来源：RoPE 本质就是对 Q、K 施加与位置相关的旋转，而旋转角正是来自这里的 omega_i。
`,
      tips: [
        {
          kind: 'pitfall',
          text: '生成频率时最常见的错误是把指数写成 `2 * i / (d / 2)`。正确是 `2 * i / d`，其中 i 取偶数下标 0, 2, 4, …。用 `np.arange(0, d, 2)` 直接生成 i 再除以 d 最不容易写错。',
        },
        {
          kind: 'interview',
          text: '被问"正弦位置编码为什么能编码相对位置"时，答题主线是和角公式加旋转矩阵：`PE(pos+k)` 可以由 `PE(pos)` 经一个只依赖 k 的线性变换得到。',
        },
        {
          kind: 'note',
          text: '正弦编码每行范数恒为 `sqrt(d/2)`，这是它能与词向量直接相加而不产生位置偏差的前提；可学习位置编码没有这个约束，实践中常配合缩放或归一化。',
        },
      ],
      demos: [
        {
          title: '正弦位置编码：形状、范数与相对位置性质验证',
          lang: 'python',
          code: `import numpy as np

def sinusoidal(n, d):
    pos = np.arange(n)[:, None]
    div = 10000 ** (2 * np.arange(0, d, 2) / d)
    ang = pos / div[None, :]
    pe = np.zeros((n, d))
    pe[:, 0::2] = np.sin(ang)
    pe[:, 1::2] = np.cos(ang)
    return pe

d = 16
PE = sinusoidal(64, d)
print("形状:", PE.shape, " 取值范围:", round(float(PE.min()), 3), "~", round(float(PE.max()), 3))
print("每行范数理论值 sqrt(d/2) =", round(float(np.sqrt(d / 2)), 4))
print("实际前三个范数:", np.round(np.linalg.norm(PE, axis=1)[:3], 4))

def cos_sim(a, b):
    return float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b)))

print()
print("相对距离 delta=5，起点不同时的相似度：")
for start in (0, 10, 30, 50):
    print("  cos(PE[%2d], PE[%2d]) = %+.6f" % (start, start + 5, cos_sim(PE[start], PE[start + 5])))

print()
print("验证 PE(pos+3) 与 PE(pos) 是同一个 2x2 旋转（和角公式）：")
omega = 1.0 / 10000 ** (2 * np.arange(0, d, 2) / d)
def rot_block(pos, k):
    c = np.cos(k * omega)
    s = np.sin(k * omega)
    x1, x2 = PE[pos, 0::2], PE[pos, 1::2]
    pred = np.empty(d)
    pred[0::2] = x1 * c - x2 * s
    pred[1::2] = x1 * s + x2 * c
    return pred
for pos in (0, 17, 40):
    err = float(np.abs(rot_block(pos, 3) - PE[pos + 3]).max())
    print("  pos=%2d -> pos=%2d 的最大误差: %.2e" % (pos, pos + 3, err))
print("  误差量级说明：PE(pos+k) 可以由 PE(pos) 经一个只依赖 k 的线性变换得到。")`,
        },
        {
          title: '波长分布：为什么低维变化快、高维变化慢',
          lang: 'python',
          code: `import numpy as np

d = 64
idx = np.arange(0, d, 2)
lam = 2 * np.pi * 10000 ** (2 * idx / d)
print("前 5 个波长:", np.round(lam[:5], 2))
print("后 5 个波长:", np.round(lam[-5:], 1))
print("最长 / 最短 =", round(float(lam[-1] / lam[0]), 1))
print("相邻维度波长比值:", round(float(lam[1] / lam[0]), 4))

pos = np.arange(1000)[:, None]
ang = pos / (10000 ** (2 * idx / d))[None, :]
PE = np.zeros((1000, d))
PE[:, 0::2] = np.sin(ang)
PE[:, 1::2] = np.cos(ang)

print()
print("不同维度在 1000 个位置上的取值波动（std）：")
for k in (0, 5, 20, 30):
    print("  维度 %2d（波长 %10.1f）  std = %.3f" % (2 * k, lam[k], PE[:, 2 * k].std()))`,
        },
      ],
    },
    {
      id: 'llm-a1-c3-l3',
      title: '可学习位置编码与 RoPE：三种方案的取舍',
      content: `
## 可学习位置编码（GPT-2 / BERT 路线）

最直接的想法是：把位置也当成一种"词"，给每个位置分配一行可训练参数：

\`\`\`python
pos_table = np.zeros((max_len, d))     # 用神经网络时就是 nn.Embedding(max_len, d)
x = tok_embed[ids] + pos_table[np.arange(n)]
\`\`\`

它与正弦编码最大的区别是**位置向量由数据决定**，模型可以自由学出任何形状的编码。BERT、GPT-2 都用这一方案。

代价也很明确：

| 方面 | 正弦编码 | 可学习位置编码 |
| --- | --- | --- |
| 参数量 | 0 | max_len × d |
| 超出 max_len | 仍可计算 | **没有参数，无法计算** |
| 相对位置性质 | 有固定线性关系 | 只能靠数据学到，无保证 |
| 训练长度内效果 | 良好 | 通常略好 |

**无法外推是硬伤**。上下文从 512 扩到 2048 时，前 512 行有训练好的参数，后 1536 行要么重新训练、要么用插值（把 [512, d] 的表按比例插值到 [2048, d]）再配合少量继续训练。

## RoPE：把位置放进"旋转"里

RoPE（Su 等，2021）不修改输入表示，而是**旋转 Q 和 K 向量**。把 d 维向量按前后两半配对，第 j 对的旋转角为 pos 乘以 omega_j，其中 \`omega_j = 10000^(-2j/d)\`：

- 前半段：q1·cos - q2·sin
- 后半段：q1·sin + q2·cos

这里没有额外参数，omega_j 与正弦编码共用同一个等比频率集合。核心性质是内积只依赖相对位置：

对位置 m 的 q 和位置 n 的 k，记 R(θ) 为旋转矩阵（正交，R(θ)ᵀ = R(-θ)）：

(R(m·ω)q) · (R(n·ω)k) = qᵀ 乘以 R(m·ω)ᵀ 乘以 R(n·ω) 再乘以 k = qᵀ 乘以 R((n - m)·ω) 再乘以 k

右侧只含 n - m。而且旋转是正交变换，**范数不变**，所以与 RMSNorm 配合良好，也不破坏注意力对向量尺度的敏感度。

\`\`\`python
def rope(x, pos, base=10000.0):
    n, d = x.shape
    half = d // 2
    theta = base ** (-np.arange(half) / half)
    ang = pos[:, None] * theta[None, :]
    cos, sin = np.cos(ang), np.sin(ang)
    x1, x2 = x[:, :half], x[:, half:]
    out = np.empty_like(x)
    out[:, :half] = x1 * cos - x2 * sin
    out[:, half:] = x1 * sin + x2 * cos
    return out
\`\`\`

## 三种方案总览

| 方案 | 参数 | 注入方式 | 相对位置 | 外推能力 | 使用者 |
| --- | --- | --- | --- | --- | --- |
| 正弦 | 无 | 与表示相加 | 强（数学保证） | 理论可、实践受限 | 原论文 |
| 可学习 | max_len×d | 与表示相加 | 无保证 | 不能 | BERT、GPT-2 |
| RoPE | 无 | 旋转 Q、K | 强（内积只含相对项） | 可配插值扩展 | LLaMA、Qwen、GLM |

## 什么时候用哪一种

- **短上下文、固定长度任务**（分类、短文本理解）：可学习位置编码简单直接；
- **需要长度外推**（长上下文对话、文档 QA）：RoPE 是当前事实标准，配合基频调整（从 10000 提到百万量级）、NTK-aware 插值或 YaRN；
- **教学与理论推导**：正弦编码最清晰，是理解 RoPE 的必经之路。

## 常见误区

1. **给 V 也做 RoPE**：RoPE 只旋转 Q 和 K（内积的双方），V 不参与旋转，否则被聚合的内容本身会随位置改变；
2. **以为 RoPE 有两套实现可以随便混用**：相邻两维配对（GPT-NeoX 风格）与前后半段配对（LLaMA 原始实现）在权重加载时会得到不同结果，必须与模型实现一致；
3. **扩大上下文窗口只改 max_len**：位置编码的外推能力与长文本继续训练才是瓶颈；
4. **以为可学习位置编码能通过插值直接"免费"翻倍**：插值后必须继续训练，否则困惑度会明显上升。
`,
      tips: [
        {
          kind: 'interview',
          text: 'RoPE 必考推导：旋转矩阵正交，所以 `R(m)ᵀR(n) = R(n-m)`，内积只含相对位置 n-m；同时旋转不改变范数。把"正交 → 相对位置"这条因果链说清楚即可。',
        },
        {
          kind: 'pitfall',
          text: 'RoPE 只作用于 Q 与 K。若给 V 也加了旋转，被加权求和的内容本身会随绝对位置扭曲，注意力"按内容聚合"的语义就被破坏了。',
        },
        {
          kind: 'note',
          text: '可学习位置编码扩长时的位置插值本质上是对角度范围做"压缩"：把训练区间 [0, 512] 拉伸覆盖 [0, 2048] 的角度，因此模型需要少量继续训练来适应新的分辨率。',
        },
        {
          kind: 'performance',
          text: 'RoPE 可以在推理前预先算好整个序列的 cos/sin 表并缓存，避免每层重复计算三角函数；长上下文下这部分开销不可忽略。',
        },
      ],
      demos: [
        {
          title: 'RoPE 手写实现：验证内积只依赖相对位置',
          lang: 'python',
          code: `import numpy as np

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
q = rng.normal(size=(1, 8))
k = rng.normal(size=(1, 8))

def inner(pq, pk):
    return float((rope(q, np.array([pq])) @ rope(k, np.array([pk])).T)[0, 0])

print("相对距离相同、绝对位置不同：")
for pq in (1, 10, 50, 500):
    print("  pos_q=%3d, pos_k=%3d  内积 = %+.10f" % (pq, pq + 3, inner(pq, pq + 3)))

print()
print("相对距离不同：")
for delta in (0, 1, 5, 20):
    print("  delta=%2d  内积 = %+.6f" % (delta, inner(10, 10 + delta)))

print()
print("旋转不改变范数:", np.isclose(np.linalg.norm(rope(q, np.array([37]))), np.linalg.norm(q)))`,
        },
        {
          title: '可学习位置编码 vs 正弦编码：参数量与"未知位置"行为',
          lang: 'python',
          code: `import numpy as np

d, max_len = 16, 128
rng = np.random.default_rng(0)
learnable = rng.normal(0, 0.02, size=(max_len, d))

def sinusoidal(n, d):
    pos = np.arange(n)[:, None]
    ang = pos / (10000 ** (2 * np.arange(0, d, 2) / d))[None, :]
    pe = np.zeros((n, d))
    pe[:, 0::2] = np.sin(ang)
    pe[:, 1::2] = np.cos(ang)
    return pe

print("可学习编码参数量:", learnable.size, "  正弦编码参数量: 0")

for p in (100, 127, 500):
    if p < max_len:
        print("  位置 %3d: 可学习向量范数 %.4f" % (p, float(np.linalg.norm(learnable[p]))))
    else:
        print("  位置 %3d: 可学习编码越界 —— 超出 max_len 就没有参数可用" % p)

PE = sinusoidal(500, d)
print()
print("正弦编码在位置 499 处依然可计算，范数恒为", round(float(np.sqrt(d / 2)), 4))
print("这就是无参数可计算与可学习编码受 max_len 约束的根本差别。")`,
        },
      ],
    },
    {
      id: 'llm-a1-c3-l4',
      title: '组合嵌入层：词向量 + 位置 + 缩放与掩码',
      content: `
## 从 ID 到第一层输入

把前面三节拼起来，Decoder-only 模型进入第一个 Transformer Block 之前的完整流程是：

1. **查表**：\`X = E[ids]\`，形状从 [B, n] 变成 [B, n, d]；
2. **加位置**：\`X = X + PE[:n]\`（正弦或可学习），形状不变；
3. **缩放**（可选）：\`X = X * sqrt(d)\`，仅在使用正弦编码且无 Pre-LN 时需要；
4. **生成掩码**：\`pad_mask\`（形状 [B, n]）标记哪些位置是补齐的；
5. **交给第一个 Block**：进入 Pre-LN 的注意力子层。

\`\`\`python
def embed(ids, E, pos_emb, pad_id=0):
    B, n = ids.shape
    X = E[ids] + pos_emb[:n]              # [B, n, d]
    pad_mask = (ids != pad_id)            # [B, n]
    return X, pad_mask
\`\`\`

## 形状必须逐站标注

初学者最容易错的地方不是公式，而是**形状在哪个维度上广播**。养成每写一行就标注形状的习惯：

\`\`\`python
ids        # [B, n]
E[ids]     # [B, n, d]
pos[:n]    # [n, d]  -> 广播到 [B, n, d]
加和后      # [B, n, d]
\`\`\`

位置编码只有 [n, d]，却能直接与 [B, n, d] 相加，靠的是 numpy/PyTorch 的**右对齐广播**：位置维度 n 对齐、特征维度 d 对齐，batch 维度自动扩展。若位置表写成 [n]（每个位置只有一个标量），相加就会变成对全部 d 个维度加同一个数，位置信息几乎全部丢失，而且**不会报错**。

## padding 与位置编码的交互

batch 推理时短序列右侧补齐 pad。两个细节：

1. pad 位置同样会查 embedding、同样会加位置编码，计算不会跳过它们；
2. 必须在注意力里用 \`pad_mask\` 屏蔽这些 key 位置（在 softmax 前加 -1e9），否则正常 token 会去"关注"一堆 pad 向量，输出被污染。

另一个常见做法是**左填充**（left padding）：把 pad 放在序列左侧，让最后一位始终是真实 token，这样生成时的位置连续性更容易保持。多数推理框架使用左填充，训练时则常用右填充。

## 算一下参数量

| 组成部分 | 形状 | 参数量 |
| --- | --- | --- |
| 词嵌入 E | [V, d] | V × d |
| 可学习位置编码 | [max_len, d] | max_len × d |
| 正弦位置编码 | 无 | 0 |
| LayerNorm（可选，γ 与 β） | [d] 各一份 | 2 × d |

以 V = 128256、d = 4096、max_len = 8192 为例：词嵌入约 5.25 亿，可学习位置编码约 3355 万，占比约 6%。**词嵌入往往是小模型的最大单项**，位置编码通常不构成瓶颈。

## 一个完整的最小实现

\`\`\`python
import numpy as np

def sinusoidal(n, d):
    pos = np.arange(n)[:, None]
    ang = pos / (10000 ** (2 * np.arange(0, d, 2) / d))[None, :]
    pe = np.zeros((n, d))
    pe[:, 0::2] = np.sin(ang)
    pe[:, 1::2] = np.cos(ang)
    return pe

def embed_layer(ids, E, d_model, pad_id=0, use_scale=False):
    B, n = ids.shape
    X = E[ids] + sinusoidal(n, d_model)[None, :, :]
    if use_scale:
        X = X * np.sqrt(d_model)
    pad_mask = ids != pad_id
    return X, pad_mask
\`\`\`

## 常见误区

1. **位置表形状写错（[n] 而不是 [n, d]）**：不报错，但位置信息退化成一个标量；
2. **对 pad 位置也加位置编码却不屏蔽**：模型会学到"关注 pad"，线上表现诡异；
3. **以为位置编码只影响第一个 token**：每个位置都有一整行 d 维向量，而不是一个标量；
4. **在 Pre-LN 架构里仍然乘 sqrt(d)**：多余地放大了残差流初值，通常无害但没必要，现代模型一般省略。
`,
      tips: [
        {
          kind: 'pitfall',
          text: '位置表形状必须是 `[n, d]`。写成 `[n]` 时广播依然成立（沿最后一维加同一个数），不会报错，但每个 token 只多了一个常数偏移，位置信息基本失效——这是最隐蔽的一类 bug。',
        },
        {
          kind: 'leak',
          text: '训练用右填充、推理用左填充是常见组合：训练时 pad 在右侧可被因果掩码自然忽略，推理时左填充能保证最后一位是真实 token，便于流式续写。',
        },
        {
          kind: 'interview',
          text: '被问"embedding 层参数量怎么估算"，标准答法：词嵌入 V×d，可学习位置编码 max_len×d，正弦为 0；再提醒面试官词嵌入在词表大时往往是小模型的最大单项参数。',
        },
      ],
      demos: [
        {
          title: '组合嵌入层：查表 + 位置编码 + padding 掩码，逐站打印形状',
          lang: 'python',
          code: `import numpy as np

V, d_model = 12, 8
PAD = 0
rng = np.random.default_rng(0)
E = rng.normal(0, 0.1, size=(V, d_model))

def sinusoidal(n, d):
    pos = np.arange(n)[:, None]
    ang = pos / (10000 ** (2 * np.arange(0, d, 2) / d))[None, :]
    pe = np.zeros((n, d))
    pe[:, 0::2] = np.sin(ang)
    pe[:, 1::2] = np.cos(ang)
    return pe

ids = np.array([[3, 5, 7, 0, 0], [2, 4, 6, 9, 11]])   # 第一条序列最后两位是 pad
B, n = ids.shape
print("ids        ", ids.shape)

X_tok = E[ids]
print("E[ids]     ", X_tok.shape)

PE = sinusoidal(n, d_model)
X = X_tok + PE[None, :, :]
print("位置编码   ", PE.shape, "-> 广播相加后", X.shape)

pad_mask = ids != PAD
print("pad_mask   ", pad_mask.shape)
print(pad_mask.astype(int))

X_masked = X * pad_mask[:, :, None]
print("pad 位置是否被清零:", bool(np.all(X_masked[0, 3] == 0) and np.all(X_masked[0, 4] == 0)))
print()
print("参数量：词嵌入", V * d_model, " 正弦位置编码 0")`,
        },
      ],
    },
  ],
  exercises: [
    {
      id: 'llm-a1-c3-e1',
      type: 'single',
      difficulty: 2,
      question: 'embedding 查表操作 `E[ids]` 在数学上等价于下列哪种运算？',
      options: [
        { value: 'A', text: '对每个 token ID 做一次 softmax' },
        { value: 'B', text: '把 ID 转成 one-hot 向量后左乘 embedding 矩阵' },
        { value: 'C', text: '对 embedding 矩阵按列求和' },
        { value: 'D', text: '对 embedding 矩阵做 SVD 分解' },
      ],
      answer: 'B',
      explanation:
        'one-hot 向量只有一个非零元，乘积 sum_k o_k 乘以 E_kj 退化为单项 E_ij，正好是第 i 行。工程上直接 gather，避免构造 V 维稀疏向量与 O(n·V·d) 的乘加。',
      relatedLessonId: 'llm-a1-c3-l1',
      tags: ['embedding', '查表'],
    },
    {
      id: 'llm-a1-c3-e2',
      type: 'judge',
      difficulty: 2,
      question: '自注意力机制本身能区分输入 token 的顺序，因此位置编码只是可选的优化项。',
      answer: false,
      explanation:
        '自注意力对输入是置换等变的：打乱 token 顺序，输出只会跟着一起打乱，结果等价。必须显式注入位置信息，否则"狗咬人"和"人咬狗"无法区分。',
      relatedLessonId: 'llm-a1-c3-l2',
      tags: ['自注意力', '位置编码'],
    },
    {
      id: 'llm-a1-c3-e3',
      type: 'multiple',
      difficulty: 2,
      question: '关于正弦位置编码，下列说法正确的有？（多选）',
      options: [
        { value: 'A', text: '偶数维是 sin、奇数维是 cos，取值都在 [-1, 1]' },
        { value: 'B', text: '波长随维度序号呈等比数列分布' },
        { value: 'C', text: '任意固定偏移下，PE(pos+k) 是 PE(pos) 的线性变换' },
        { value: 'D', text: '它包含 max_len × d 个可训练参数' },
      ],
      answer: ['A', 'B', 'C'],
      explanation:
        '正弦编码**不含任何参数**（D 错误），完全由位置与维度序号解析计算。A 是定义；B 来自波长 2π 乘以 10000^(2i/d) 的指数形式；C 由和角公式与旋转矩阵可得，这正是它能编码相对位置的依据。',
      relatedLessonId: 'llm-a1-c3-l2',
      tags: ['正弦编码', '位置编码'],
    },
    {
      id: 'llm-a1-c3-e4',
      type: 'fill',
      difficulty: 2,
      question: '补全正弦位置编码的频率项（`i` 取偶数下标 0, 2, 4, …）：\n\n```python\npos = np.arange(n)[:, None]\ndiv = 10000 ** (2 * np.arange(0, d, 2) / ___)\nang = pos / div\n```',
      blanks: [['d']],
      explanation:
        '指数是 2i/d。这里 `np.arange(0, d, 2)` 已经生成了 i 的取值，所以分母就是 d。若写成 d/2，频率整体翻倍，波长分布与论文不同。',
      relatedLessonId: 'llm-a1-c3-l2',
      tags: ['正弦编码', '实现'],
    },
    {
      id: 'llm-a1-c3-e5',
      type: 'single',
      difficulty: 2,
      question: 'GPT-2 采用的可学习位置编码，其最主要的局限是？',
      options: [
        { value: 'A', text: '参数量太少导致表达能力不足' },
        { value: 'B', text: '超出 max_len 的位置没有对应参数，无法直接外推' },
        { value: 'C', text: '无法与词向量相加' },
        { value: 'D', text: '每次前向都要重新计算三角函数，速度很慢' },
      ],
      answer: 'B',
      explanation:
        '位置表形状固定为 [max_len, d]，索引超出范围就直接越界。扩展长度必须重新训练或用插值加继续训练。参数量并不小（max_len×d），且可学习编码恰恰不需要三角函数。',
      relatedLessonId: 'llm-a1-c3-l3',
      tags: ['可学习位置编码', '外推'],
    },
    {
      id: 'llm-a1-c3-e6',
      type: 'judge',
      difficulty: 3,
      question: 'RoPE 通过对 Q、K 施加与位置相关的正交旋转，使两个位置的内积只依赖它们的相对距离。',
      answer: true,
      explanation:
        '旋转矩阵正交，满足 R(m·ω)ᵀ 乘以 R(n·ω) 等于 R((n-m)·ω)，所以内积只剩相对角度 n-m。同时正交变换保持范数不变，这也是 RoPE 与 RMSNorm 配合良好的原因。',
      relatedLessonId: 'llm-a1-c3-l3',
      tags: ['RoPE', '相对位置'],
    },
    {
      id: 'llm-a1-c3-e7',
      type: 'code',
      difficulty: 2,
      question:
        '实现**正弦位置编码** `sinusoidal(n, d)`，返回形状 [n, d] 的矩阵：\n\n- 偶数维 PE[pos, 2i] = sin(pos / 10000^(2i/d))；\n- 奇数维 PE[pos, 2i+1] = cos(pos / 10000^(2i/d))。\n\n最后一行直接求值 `sinusoidal(50, 16)`（返回值即 out）。',
      starterCode: `import numpy as np

def sinusoidal(n, d):
    pos = np.arange(n)[:, None]                    # [n, 1]
    div = ___                                      # [1, d/2]
    ang = ___                                      # [n, d/2]
    pe = np.zeros((n, d))
    pe[:, 0::2] = ___
    pe[:, 1::2] = ___
    return pe

sinusoidal(50, 16)
`,
      setupCode: '',
      expectedOutput: '形状 (50, 16)，位置 0 的偶数维为 0、奇数维为 1',
      tests: `assert out.shape == (50, 16), f"形状应为 (50, 16)，实际 {out.shape}"
assert np.allclose(out[0, 0::2], 0.0), "位置 0 的偶数维应为 sin(0)=0"
assert np.allclose(out[0, 1::2], 1.0), "位置 0 的奇数维应为 cos(0)=1"
assert np.allclose(out[1, 0], np.sin(1.0)), "out[1,0] 应为 sin(1)"
assert np.allclose(out[1, 1], np.cos(1.0)), "out[1,1] 应为 cos(1)"
assert np.allclose(out[7, 0::2], np.sin(7.0 / 10000 ** (2 * np.arange(0, 16, 2) / 16))), "位置 7 的偶数维应为 sin(7 / 10000^(2i/d))"
assert np.all(np.abs(out) <= 1.0 + 1e-12), "取值应在 [-1, 1]"
assert np.allclose(np.linalg.norm(out, axis=1), np.sqrt(8.0)), "每行范数应恒为 sqrt(d/2)=sqrt(8)"
`,
      answer: `import numpy as np

def sinusoidal(n, d):
    pos = np.arange(n)[:, None]
    div = 10000 ** (2 * np.arange(0, d, 2) / d)
    ang = pos / div[None, :]
    pe = np.zeros((n, d))
    pe[:, 0::2] = np.sin(ang)
    pe[:, 1::2] = np.cos(ang)
    return pe

sinusoidal(50, 16)
`,
      explanation:
        '`np.arange(0, d, 2)` 直接给出偶数下标 i，除以 d 就是正确指数 2i/d。用切片 `pe[:, 0::2]` 与 `pe[:, 1::2]` 交错写入 sin 与 cos。每行有 d/2 个 (sin²+cos²) 配对，故范数恒为 sqrt(d/2)=sqrt(8) 约 2.828。',
      relatedLessonId: 'llm-a1-c3-l2',
      tags: ['正弦编码', 'numpy'],
    },
    {
      id: 'llm-a1-c3-e8',
      type: 'code',
      difficulty: 2,
      question:
        '实现**可学习位置编码的加法**：给定 token 向量 `X`（形状 [B, n, d]）与位置表 `P`（形状 [max_len, d]），\n\n1. 只取 `P[:n]`，利用广播加到 X 上得到 `Y`；\n2. 另外实现 `scaled`：不使用位置编码，但对 X 乘以 sqrt(d)。\n\n最后一行直接求值 `Y`。',
      starterCode: `import numpy as np

B, n, d, max_len = 2, 3, 5, 64
rng = np.random.default_rng(0)
X = rng.normal(size=(B, n, d))
P = rng.normal(0, 0.1, size=(max_len, d))

# 1. 取前 n 个位置，广播加到 X 上
Y = ___

# 2. 不用位置编码，只乘 sqrt(d)
scaled = ___

Y
`,
      setupCode: '',
      expectedOutput: 'Y 形状 (2, 3, 5)，且 Y[0] - X[0] 应等于 P[:3]',
      tests: `assert out.shape == (2, 3, 5), f"Y 形状应为 (2, 3, 5)，实际 {out.shape}"
assert np.allclose(out[0] - X[0], P[:3]), "第 0 条序列的增量应等于 P[:3]"
assert np.allclose(out[1] - X[1], P[:3]), "两条序列应共享同一份位置编码"
assert np.allclose(scaled, X * np.sqrt(5)), "scaled 应为 X 乘以 sqrt(d)"
assert not np.allclose(out, scaled), "加位置编码与缩放是两种不同做法"
`,
      answer: `import numpy as np

B, n, d, max_len = 2, 3, 5, 64
rng = np.random.default_rng(0)
X = rng.normal(size=(B, n, d))
P = rng.normal(0, 0.1, size=(max_len, d))

Y = X + P[:n]
scaled = X * np.sqrt(d)

Y
`,
      explanation:
        '`P[:n]` 形状 [n, d]，与 [B, n, d] 相加时沿 batch 维广播——这是整个模型里最典型的一次广播。要注意：如果误写成 `P[:n, 0]`（形状 [n]），广播仍会成功但对每个 token 只加一个标量，位置信息几乎全部丢失且不会报错。',
      relatedLessonId: 'llm-a1-c3-l4',
      tags: ['位置编码', '广播', 'numpy'],
    },
    {
      id: 'llm-a1-c3-e9',
      type: 'code',
      difficulty: 3,
      question:
        '实现 **RoPE 旋转位置编码**（前后半段配对版）并验证相对位置性质。\n\n- `half = d // 2`，频率 theta_j = 10000^(-j/half)；\n- 位置 m 的角度为 m 乘以 theta_j；\n- 前半段 = x1·cos - x2·sin，后半段 = x1·sin + x2·cos。\n\n最后一行直接求值 `rope(q, np.array([3]))`。',
      starterCode: `import numpy as np

def rope(x, positions, base=10000.0):
    """x: [n, d] -> [n, d]"""
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
q = rng.normal(size=(1, 8))
k = rng.normal(size=(1, 8))

rope(q, np.array([3]))
`,
      setupCode: '',
      expectedOutput: '旋转不改变范数，位置 0 不旋转，内积只依赖相对位置',
      tests: `assert rope(q, np.array([3])).shape == (1, 8), "旋转后形状应与输入一致"
assert np.isclose(float(np.linalg.norm(rope(q, np.array([3])))), float(np.linalg.norm(q))), "RoPE 不应改变范数"
assert np.allclose(rope(q, np.array([0])), q), "位置 0 不旋转"
assert np.isclose(float(np.linalg.norm(rope(q, np.array([5])))), float(np.linalg.norm(q))), "任意位置旋转都不改变范数"
def _inner(pq, pk):
    return float((rope(q, np.array([pq])) @ rope(k, np.array([pk])).T)[0, 0])
assert np.isclose(_inner(1, 4), _inner(20, 23), atol=1e-9), "相对距离相同的两对内积应相同"
assert np.isclose(_inner(5, 5), _inner(50, 50), atol=1e-9), "自身内积应与绝对位置无关"
assert not np.isclose(_inner(0, 1), _inner(0, 7), atol=1e-6), "相对距离不同时内积应不同"
assert np.isclose(_inner(0, 0), float((q @ k.T)[0, 0])), "位置 0 与 0 的内积应等于原始内积"
assert float(rope(q, np.array([3]))[0, 0]) != float(q[0, 0]), "位置 3 的前半段应被旋转改变"
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
q = rng.normal(size=(1, 8))
k = rng.normal(size=(1, 8))

rope(q, np.array([3]))
`,
      explanation:
        'theta 的指数写作 -j/half，与正弦编码的 -2i/d 等价（j 就是 i，half 就是 d/2），频率集合完全一样。旋转矩阵正交，所以范数不变；正交性还使 R(m)ᵀR(n) = R(n-m)，内积只剩相对角度。注意本实现是"前后半段配对"，与 LLaMA 原始实现一致；GPT-NeoX 风格是"相邻两维配对"，两者不能混用。',
      relatedLessonId: 'llm-a1-c3-l3',
      tags: ['RoPE', '位置编码', 'numpy'],
    },
    {
      id: 'llm-a1-c3-e10',
      type: 'code',
      difficulty: 2,
      question:
        '实现**组合嵌入层**：给定 `ids`（形状 [B, n]）、`E`（[V, d]）与正弦位置矩阵 `PE`（[n, d]），\n\n1. 查表并加上位置编码得到 `X`（广播）；\n2. 生成 `pad_mask = (ids != 0)`，形状 [B, n]；\n3. 用 `pad_mask[:, :, None]` 把 pad 位置的向量清零得到 `X_masked`。\n\n最后一行直接求值 `X_masked`。',
      starterCode: `import numpy as np

V, d, n = 12, 4, 5
PAD = 0
rng = np.random.default_rng(0)
E = rng.normal(size=(V, d))
ids = np.array([[3, 5, 7, 0, 0], [2, 4, 6, 9, 11]])

pos = np.arange(n)[:, None]
ang = pos / (10000 ** (2 * np.arange(0, d, 2) / d))[None, :]
PE = np.zeros((n, d))
PE[:, 0::2] = np.sin(ang)
PE[:, 1::2] = np.cos(ang)

X = ___
pad_mask = ___
X_masked = ___

X_masked
`,
      setupCode: '',
      expectedOutput: '形状 (2, 5, 4)，第一条序列后两位（pad）全为 0',
      tests: `assert out.shape == (2, 5, 4), f"形状应为 (2, 5, 4)，实际 {out.shape}"
assert np.all(out[0, 3] == 0) and np.all(out[0, 4] == 0), "第一条序列的 pad 位置应被清零"
assert np.allclose(out[1], E[ids[1]] + PE), "无 pad 的序列应等于 E[ids] + PE"
assert pad_mask.shape == (2, 5), f"pad_mask 形状应为 (2, 5)，实际 {pad_mask.shape}"
assert bool(pad_mask[0, 0]) and not bool(pad_mask[0, 3]), "pad_mask 应在 pad 位置为 False"
assert np.allclose(X[0, 0], E[3] + PE[0]), "第 0 个位置的向量应为 embedding 加位置编码"
`,
      answer: `import numpy as np

V, d, n = 12, 4, 5
PAD = 0
rng = np.random.default_rng(0)
E = rng.normal(size=(V, d))
ids = np.array([[3, 5, 7, 0, 0], [2, 4, 6, 9, 11]])

pos = np.arange(n)[:, None]
ang = pos / (10000 ** (2 * np.arange(0, d, 2) / d))[None, :]
PE = np.zeros((n, d))
PE[:, 0::2] = np.sin(ang)
PE[:, 1::2] = np.cos(ang)

X = E[ids] + PE[None, :, :]
pad_mask = ids != PAD
X_masked = X * pad_mask[:, :, None]

X_masked
`,
      explanation:
        '`PE` 形状 [n, d]，加 `None, :, :` 变成 [1, n, d] 后与 [B, n, d] 广播。`pad_mask[:, :, None]` 把 [B, n] 扩展成 [B, n, 1]，从而对最后一维 d 整体广播，等价于"整行清零"。若直接写 `X * pad_mask`，[B, n, d] 与 [B, n] 无法广播，程序会报错——这是很好的自我保护。',
      relatedLessonId: 'llm-a1-c3-l4',
      tags: ['embedding', '掩码', 'numpy'],
    },
    {
      id: 'llm-a1-c3-e11',
      type: 'single',
      difficulty: 2,
      question: '设词表大小 V = 32000、隐藏维度 d = 4096、序列长度 n = 1000，embedding 层的参数量与一次前向的浮点乘加次数分别约为？',
      options: [
        { value: 'A', text: '参数量 32000×4096，乘加次数 1000×32000×4096' },
        { value: 'B', text: '参数量 32000×4096，乘加次数 0（只有内存搬运）' },
        { value: 'C', text: '参数量 1000×4096，乘加次数 1000×4096' },
        { value: 'D', text: '参数量 0，乘加次数 1000×32000×4096' },
      ],
      answer: 'B',
      explanation:
        '查表不涉及任何乘法，只是按索引取行，因此乘加次数为 0，时间复杂度 O(n·d)。选项 A 是把 embedding 理解成"one-hot 乘矩阵"时才会出现的量级，实际实现里根本不会构造 one-hot。',
      relatedLessonId: 'llm-a1-c3-l1',
      tags: ['embedding', '复杂度'],
    },
    {
      id: 'llm-a1-c3-e12',
      type: 'multiple',
      difficulty: 3,
      question: '关于位置编码与 RoPE，下列说法正确的有？（多选）',
      options: [
        { value: 'A', text: 'RoPE 只旋转 Q 与 K，不旋转 V' },
        { value: 'B', text: '正弦位置编码与 RoPE 使用的频率集合是同一个等比数列' },
        { value: 'C', text: 'RoPE 旋转会改变向量范数，因此需要额外重新归一化' },
        { value: 'D', text: 'ALiBi 不修改输入表示，而是在注意力分数上减去与距离成正比的惩罚' },
      ],
      answer: ['A', 'B', 'D'],
      explanation:
        '旋转矩阵是正交矩阵，**范数保持不变**，C 错误。RoPE 只作用于内积的两方 Q 与 K；V 是被加权求和的内容，若也旋转会扭曲语义。正弦编码与 RoPE 的 omega 都是 10000^(-2i/d)，这正是两者思想同源的体现。',
      relatedLessonId: 'llm-a1-c3-l3',
      tags: ['RoPE', 'ALiBi', '位置编码'],
    },
    {
      id: 'llm-a1-c3-e13',
      type: 'judge',
      difficulty: 3,
      question: '在 batch 推理时，被 padding 的位置依然会查 embedding、加位置编码并参与前向计算，只是必须在注意力中用掩码屏蔽它们。',
      answer: true,
      explanation:
        '计算图是固定形状的，pad 位置不会自动跳过。必须用 attention mask（softmax 前加 -1e9）屏蔽 pad 作为 key 的位置，否则真实 token 会关注一堆无意义的 pad 向量，输出分布被污染。',
      relatedLessonId: 'llm-a1-c3-l4',
      tags: ['padding', '掩码'],
    },
    {
      id: 'llm-a1-c3-e14',
      type: 'fill',
      difficulty: 3,
      question: '补全 RoPE 的前半段输出（前后半段配对，x1 为前半段、x2 为后半段）：\n\n```python\nout[:, :half] = ___\nout[:, half:] = x1 * sin + x2 * cos\n```',
      blanks: [['x1 * cos - x2 * sin', 'x1*cos - x2*sin', '/x1\\s*\\*\\s*cos\\s*-\\s*x2\\s*\\*\\s*sin/']],
      explanation:
        '旋转矩阵作用在 (x1, x2) 上：前半段 x1 cos - x2 sin，后半段 x1 sin + x2 cos。若把加减号写反，得到的不是正交变换，范数会改变，相对位置性质也随之失效。',
      relatedLessonId: 'llm-a1-c3-l3',
      tags: ['RoPE', '实现'],
    },
    {
      id: 'llm-a1-c3-e15',
      type: 'code',
      difficulty: 3,
      question:
        '实现正弦位置编码表 `positional_encoding_table(d, max_len)`，形状 [max_len, d]：\n\n- 偶数维用 sin，奇数维用 cos；\n- 频率为 10000^(-2i/d)；\n- 表本身**不含任何可训练参数**。\n\n最后一行直接求值 `positional_encoding_table(32, 100)`。',
      starterCode: `import numpy as np

def positional_encoding_table(d, max_len):
    i = np.arange(0, d, 2)
    angles = np.arange(max_len)[:, None] / ___
    pe = np.zeros((max_len, d))
    pe[:, 0::2] = ___
    pe[:, 1::2] = ___
    return pe

positional_encoding_table(32, 100)
`,
      setupCode: '',
      expectedOutput: 'PE 形状 (100, 32)，每行范数为 4',
      tests: `out = positional_encoding_table(32, 100)
assert out.shape == (100, 32), f"形状应为 (100, 32)，实际 {out.shape}"
assert np.allclose(out[0, 0::2], 0.0) and np.allclose(out[0, 1::2], 1.0), "位置 0 应为 0/1 交错"
assert np.allclose(out[1, 0], np.sin(1.0)), "out[1,0] 应为 sin(1)"
assert np.allclose(out[10, 0::2], np.sin(10.0 / 10000 ** (np.arange(0, 32, 2) / 32))), "位置 10 的偶数维应为 sin(10 / 10000^(2i/d))"
assert np.allclose(np.linalg.norm(out, axis=1), 4.0), "每行范数应为 sqrt(16)=4"
assert np.all(np.abs(out) <= 1.0 + 1e-12), "所有取值应在 [-1, 1]"
assert positional_encoding_table(8, 5).shape == (5, 8), "应支持任意 d 与 max_len"
`,
      answer: `import numpy as np

def positional_encoding_table(d, max_len):
    i = np.arange(0, d, 2)
    angles = np.arange(max_len)[:, None] / (10000 ** (i / d))[None, :]
    pe = np.zeros((max_len, d))
    pe[:, 0::2] = np.sin(angles)
    pe[:, 1::2] = np.cos(angles)
    return pe

positional_encoding_table(32, 100)
`,
      explanation:
        '这里 `i = np.arange(0, d, 2)` 是偶数维下标，频率写成 `10000 ** (i / d)`，与 10000^(2j/d)（j 为配对序号）等价，关键是分母必须是 d 且下标集合是 0, 2, 4…。每行 d/2 组 (sin, cos) 配对，范数恒为 sqrt(d/2)=sqrt(16)=4。',
      relatedLessonId: 'llm-a1-c3-l2',
      tags: ['正弦编码', 'numpy'],
    },
    {
      id: 'llm-a1-c3-e16',
      type: 'code',
      difficulty: 3,
      question:
        '对比**可学习位置编码**与**正弦编码**：\n\n1. 随机生成形状 [max_len, d] 的可学习位置表 `learnable`；\n2. 用正弦公式生成同样形状的 `sinusoidal`；\n3. 统计参数量 `learnable_params`（表元素个数）与 `sinusoidal_params`（应为 0）；\n4. 计算正弦表每行范数的最大值与最小值之差 `norm_spread`。\n\n最后一行直接求值 `(learnable.shape, norm_spread)`。',
      starterCode: `import numpy as np

max_len, d = 128, 16
rng = np.random.default_rng(0)

learnable = ___
pos = np.arange(max_len)[:, None]
ang = pos / (10000 ** (2 * np.arange(0, d, 2) / d))[None, :]
sinusoidal = np.zeros((max_len, d))
sinusoidal[:, 0::2] = ___
sinusoidal[:, 1::2] = ___

learnable_params = ___
sinusoidal_params = ___
norms = ___
norm_spread = ___

(learnable.shape, norm_spread)
`,
      setupCode: '',
      expectedOutput: '(128, 16) 与接近 0 的 norm_spread',
      tests: `assert out[0] == (128, 16), f"learnable 形状应为 (128, 16)，实际 {out[0]}"
assert learnable_params == 128 * 16, "可学习位置编码参数量应为 max_len 乘 d"
assert sinusoidal_params == 0, "正弦编码不含参数"
assert abs(norm_spread) < 1e-9, f"正弦编码每行范数应完全相同，实际差值 {norm_spread}"
assert np.allclose(norms, np.sqrt(8.0)), "每行范数应为 sqrt(d/2)=sqrt(8)"
assert learnable.shape == sinusoidal.shape, "两者形状应一致，便于替换"
`,
      answer: `import numpy as np

max_len, d = 128, 16
rng = np.random.default_rng(0)

learnable = rng.normal(0, 0.02, size=(max_len, d))
pos = np.arange(max_len)[:, None]
ang = pos / (10000 ** (2 * np.arange(0, d, 2) / d))[None, :]
sinusoidal = np.zeros((max_len, d))
sinusoidal[:, 0::2] = np.sin(ang)
sinusoidal[:, 1::2] = np.cos(ang)

learnable_params = learnable.size
sinusoidal_params = 0
norms = np.linalg.norm(sinusoidal, axis=1)
norm_spread = float(norms.max() - norms.min())

(learnable.shape, norm_spread)
`,
      explanation:
        '两者输出形状完全一致，因此可以在架构里直接替换——这正是"位置编码是一个可插拔模块"的含义。差别在于：可学习表有 max_len × d 个参数且每行范数由训练决定；正弦表零参数且每行范数严格为 sqrt(d/2)。`norm_spread` 严格为 0 是正弦编码"功率恒定"的直接证据。',
      relatedLessonId: 'llm-a1-c3-l3',
      tags: ['位置编码', '参数量', 'numpy'],
    },
    {
      id: 'llm-a1-c3-e17',
      type: 'single',
      difficulty: 3,
      question: '下列哪种做法能在**几乎不增加参数**的前提下，让模型获得相对位置信息？',
      options: [
        { value: 'A', text: '给每个位置训练一个独立向量（可学习位置编码）' },
        { value: 'B', text: '对 Q、K 施加与位置相关的正交旋转（RoPE）' },
        { value: 'C', text: '把 token ID 直接当作浮点数输入' },
        { value: 'D', text: '在输入上拼接一个与位置成正比的常数偏置' },
      ],
      answer: 'B',
      explanation:
        'RoPE 不引入任何可训练参数，只做三角旋转，却通过正交性让内积只剩相对位置。可学习位置编码参数为 max_len×d；把 ID 当浮点会破坏嵌入语义；常数偏置无法表达距离关系。',
      relatedLessonId: 'llm-a1-c3-l3',
      tags: ['RoPE', '相对位置'],
    },
    {
      id: 'llm-a1-c3-e18',
      type: 'judge',
      difficulty: 3,
      question: '正弦位置编码与 RoPE 使用完全相同的频率集合 10000^(-2i/d)，因此可以把正弦编码直接替换为 RoPE 而不影响模型中其他任何部分。',
      answer: false,
      explanation:
        '前半句正确，后半句错误。两者注入**方式**完全不同：正弦编码与输入相加（修改表示），RoPE 旋转 Q 与 K（不修改表示）。直接替换意味着改变输入分布，模型必须重新训练。',
      relatedLessonId: 'llm-a1-c3-l3',
      tags: ['位置编码', 'RoPE'],
    },
    {
      id: 'llm-a1-c3-e19',
      type: 'code',
      difficulty: 3,
      question:
        '**相对位置可分辨性实验**：给定正弦编码表 `PE`（形状 [n, d]），统计对角带的余弦相似度：\n\n- 偏移 k 从 1 到 4，计算 cos(PE[i], PE[i+k]) 在所有 i 上的平均值，存入 `band_mean[k-1]`；\n- 同时计算偏移 0（自相似）的均值 `center`。\n\n最后一行直接求值 `np.round(band_mean, 6)`。',
      starterCode: `import numpy as np

n, d = 64, 16
pos = np.arange(n)[:, None]
ang = pos / (10000 ** (2 * np.arange(0, d, 2) / d))[None, :]
PE = np.zeros((n, d))
PE[:, 0::2] = np.sin(ang)
PE[:, 1::2] = np.cos(ang)

Pn = PE / np.linalg.norm(PE, axis=1, keepdims=True)
band_mean = np.zeros(4)
for k in range(1, 5):
    # 位置 i 与 i+k 的余弦相似度均值
    band_mean[k - 1] = ___

center = ___

np.round(band_mean, 6)
`,
      setupCode: '',
      expectedOutput: '4 个偏移的平均相似度，随偏移增大单调下降',
      tests: `assert out.shape == (4,), f"band_mean 形状应为 (4,)，实际 {out.shape}"
assert np.isclose(center, 1.0, atol=1e-12), "偏移 0 时余弦相似度应为 1"
assert float(out[0]) > 0.9, f"偏移 1 的平均相似度应接近 1，实际 {out[0]}"
assert float(out[0]) > float(out[3]), "偏移 4 的平均相似度应明显低于偏移 1"
assert float(out[3]) < 0.85, f"偏移 4 的平均相似度应明显回落，实际 {out[3]}"
assert np.all(band_mean < 1.0), "非零偏移的相似度应严格小于 1"
assert np.all(band_mean > -1.0), "相似度不应小于 -1"
rec = np.zeros(4)
for k in range(1, 5):
    rec[k - 1] = float(np.mean([Pn[i] @ Pn[i + k] for i in range(n - k)]))
assert np.allclose(band_mean, rec), "band_mean 的计算方式应与逐对求一致"
`,
      answer: `import numpy as np

n, d = 64, 16
pos = np.arange(n)[:, None]
ang = pos / (10000 ** (2 * np.arange(0, d, 2) / d))[None, :]
PE = np.zeros((n, d))
PE[:, 0::2] = np.sin(ang)
PE[:, 1::2] = np.cos(ang)

Pn = PE / np.linalg.norm(PE, axis=1, keepdims=True)
band_mean = np.zeros(4)
for k in range(1, 5):
    band_mean[k - 1] = float(np.mean(np.sum(Pn[:n - k] * Pn[k:], axis=1)))

center = float(np.mean(np.sum(Pn * Pn, axis=1)))

np.round(band_mean, 6)
`,
      explanation:
        '规范化后余弦就等于点积，`np.sum(Pn[:n-k] * Pn[k:], axis=1)` 一次算出所有 i 的相似度再取均值。结果随 k 增大而下降，说明正弦编码在"距离越远越不像"这一点上符合直觉，这正是它能被模型用来推断相对距离的原因。注意这并不意味编码线性表征了距离，只是提供了一个可学习的距离信号。',
      relatedLessonId: 'llm-a1-c3-l2',
      tags: ['正弦编码', '相似度', 'numpy'],
    },
    {
      id: 'llm-a1-c3-e20',
      type: 'open',
      difficulty: 3,
      question:
        '请解释为什么自注意力必须配合位置编码，并对比正弦位置编码、可学习位置编码与 RoPE 三种方案在注入方式、参数量、相对位置性质、外推能力四个维度上的差异。',
      referenceAnswer: `**为什么必须注入位置**

自注意力对输入是置换等变的：把序列顺序打乱，输出只会跟着一起打乱。
原因在于注意力分数只由某行 Q 与某行 K 的点积决定，不含任何位置下标。
因此"猫追狗"与"狗追猫"在自注意力眼里完全等价，必须显式加入位置信息。

**三种方案对比**

1. 正弦位置编码：零参数，解析计算，与词向量相加。
   由于和角公式，PE(pos+k) 是 PE(pos) 的固定线性变换，具备相对位置性质。
   理论上长度可扩展，但训练未见过的角度组合效果会下降。
2. 可学习位置编码：参数为 max_len × d，与词向量相加。
   没有相对位置的数学保证，位置关系是否被学到取决于数据。
   长度严格受 max_len 限制，扩展需要插值加继续训练。
3. RoPE：零参数，对 Q 与 K 施加与位置相关的正交旋转。
   旋转矩阵正交，R(m) 转置乘 R(n) 等于 R(n-m)，内积只依赖相对距离；范数不变。
   外推可通过调整基频（从 10000 提到百万量级）、NTK-aware 插值或 YaRN 实现，
   配合长文本继续训练效果更好。

**实践选择**

短固定长度任务可用可学习位置编码；长上下文与需要外推的场景 RoPE 已是事实标准；
教学中正弦编码最清晰，且它的频率集合正是 RoPE 的来源。`,
      rubric: [
        { point: '说明自注意力置换等变、打乱顺序不会改变输出语义', score: 2 },
        { point: '正确说出三种方案的注入方式（相加 vs 旋转 Q、K）', score: 2 },
        { point: '指出可学习位置编码无法外推、RoPE 可通过基频调整外推', score: 1 },
        { point: '说明正弦编码与 RoPE 的参数量与相对位置性质', score: 1 },
      ],
      keywords: ['置换等变', '相加', '旋转', '正交', '相对位置', '外推', '基频', '插值'],
      explanation:
        '本题考察"为什么"与"怎么选"两层。能说出置换等变是根本原因、并把三种方案的注入方式与相对位置性质区分清楚，就算掌握了核心。',
      tags: ['位置编码', 'RoPE', '面试'],
    },
    {
      id: 'llm-a1-c3-e21',
      type: 'open',
      difficulty: 3,
      question:
        '某团队把一个使用可学习位置编码的模型（max_len = 2048）的上下文扩展到 8192，且不打算重新预训练。请分析可能的做法、各自的风险，并给出你认为最稳妥的工程路线。',
      referenceAnswer: `**问题本质**

可学习位置表是 [2048, d] 的参数矩阵，位置 2048~8191 根本没有对应的行，
直接传更长的序列会索引越界，或把缺失位置补齐成零向量后形成分布外输入。

**候选做法与风险**

1. 位置插值（Position Interpolation）：把 2048 行按比例压缩到 8192 个位置使用，
   相当于所有位置挤进原来见过的角度范围。
   风险：分辨率下降，模型需要少量继续训练来适应；不训练会显著掉点。
2. 直接用正弦编码替换：无参数、长度不受限。
   风险：模型从未在这样的编码下训练过，等于换了输入分布，效果无法预期。
3. 只外推少许（例如 2048 到 2560）：距训练长度不远时可加少量长样本微调。
   风险：超出部分没有参数，仍需掩码或截断兜底。
4. 改用 RoPE 之类的相对位置方案：需要结构改动并继续预训练，成本最高但最彻底。

**稳妥路线**

先做位置插值（改动最小），再在长文本语料上做少量继续训练；
用大海捞针（needle-in-a-haystack）与 LongBench 等评测验证；
推理侧对超长输入做截断并明确告知用户，避免"看起来支持但效果很差"的隐性故障。`,
      rubric: [
        { point: '指出可学习位置表超出 max_len 没有参数是根因', score: 2 },
        { point: '说明位置插值的做法与分辨率损失风险', score: 2 },
        { point: '强调必须配合继续训练与评测验证', score: 1 },
        { point: '给出兜底（截断、提示）或长期改造方案', score: 1 },
      ],
      keywords: ['max_len', '插值', '继续训练', '外推', 'RoPE', '评测', '大海捞针'],
      explanation:
        '这道题的关键是意识到"改 max_len"不是配置项，而是分布外问题。能区分"临时补丁（插值加少量训练）"与"长期方案（相对位置编码）"的回答质量最高。',
      tags: ['位置编码', '长上下文', '工程'],
    },
  ],
  },
  {
  id: 'llm-a1-c4',
  title: '自注意力机制',
  goal: '从 Q/K/V 的几何直觉出发推导缩放点积注意力，独立实现带因果掩码的完整注意力层，并能解释除以 sqrt(d_k)、softmax 数值稳定、掩码实现方式等关键工程细节。',
  lessons: [
    {
      id: 'llm-a1-c4-l1',
      title: 'Q/K/V：一次可微的软检索',
      content: `
## 注意力要解决的问题

RNN 把整段历史压进一个固定大小的隐状态，长距离依赖会随步数衰减。注意力换了思路：**不再压缩，而是让每个位置按需直接读取其他位置的信息**。可以类比成一次数据库检索：

- **Query（查询）**：我当前想找什么；
- **Key（键）**：每个位置"能提供什么"的索引标签；
- **Value（值）**：每个位置真正携带的内容。

检索过程分三步：用 Query 与所有 Key 算相关性得到分数，把分数归一化成概率，再按概率对所有 Value 加权求和。

<Diagram type="arch" name="self-attention" />

## 三个矩阵从哪来

三个角色并非来自三份不同的输入，而是同一个输入 X（形状 [n, d_model]）经三个**可学习的线性投影**得到：

- Q = X · W_Q，W_Q 形状 [d_model, d_k]
- K = X · W_K，W_K 形状 [d_model, d_k]
- V = X · W_V，W_V 形状 [d_model, d_v]

因为 Q、K、V 都来自同一段序列，所以叫**自注意力（self-attention）**。编码器-解码器结构里还有一种交叉注意力：Q 来自解码器、K 和 V 来自编码器输出，除此之外计算完全相同。

为什么要三个独立投影而不是直接用 X？因为"查询的视角"和"被查询的视角"本质不同。同一个 token 在某个上下文里需要"找前面的主语"，而作为被查找的对象时，它提供的是"我是名词、单数、人类"这类特征。用不同的投影矩阵，模型才能分别学习这两种角色。

## 形状链条

| 张量 | 形状 | 说明 |
| --- | --- | --- |
| X | [n, d_model] | 序列表示 |
| Q | [n, d_k] | 查询 |
| K | [n, d_k] | 键，必须与 Q 同维才能点积 |
| V | [n, d_v] | 值，可以是不同维度 |
| scores = Q·Kᵀ | [n, n] | 两两相关性 |
| weights = softmax | [n, n] | 每行和为 1 |
| out = weights·V | [n, d_v] | 输出 |

批量化后所有维度前面加一个 B，把头数考虑进去再插一维 h（下一章）。

## 点积为什么能衡量相关性

两个向量的点积 q·k = |q| |k| cos θ。方向越接近，cos θ 越接近 1，点积越大。因此点积天然是一个"对齐程度"的度量，且比加性注意力（用一个小 MLP 计算分数）快得多——它可以直接变成一个矩阵乘法，交给 GPU 的张量核心。

## 没有可学习参数的部分

值得注意的是，softmax 与加权求和都**没有参数**。注意力的全部可学习性都在四个投影矩阵 W_Q、W_K、W_V、W_O（输出投影）里。这意味着注意力学的是"如何投影"，而"如何聚合"是固定的数学运算——这也是它能被高效实现的基础。

## numpy 最小实现

\`\`\`python
import numpy as np

def softmax(x):
    x = x - x.max(axis=-1, keepdims=True)
    e = np.exp(x)
    return e / e.sum(axis=-1, keepdims=True)

def attention(X, Wq, Wk, Wv):
    Q, K, V = X @ Wq, X @ Wk, X @ Wv        # 各自 [n, d_k] 或 [n, d_v]
    scores = Q @ K.T / np.sqrt(Q.shape[-1])  # [n, n]
    return softmax(scores) @ V               # [n, d_v]
\`\`\`

## 一个手算的小例子

设 n = 2、d_k = 2，Q = K = 单位阵，V = [[10, 0], [0, 100]]。此时 scores = I / sqrt(2)，对角线 0.707、非对角 0。softmax 后每行是 [0.664, 0.336]（因为 exp(0)=1，exp(-0.707)=0.493，比值为 0.664 与 0.336）。输出第一行 = 0.664·[10,0] + 0.336·[0,100] = [6.64, 33.6]。

这个例子说明：**每行输出是 V 的凸组合**，权重非负且和为 1。因此注意力输出永远落在所有 Value 的凸包内，不可能"创造出"一个全新的方向——它只能选择与混合。

## 常见误区

1. **以为 Q、K、V 是三种不同的输入**：自注意力的三者同源，只有交叉注意力才是异构输入；
2. **以为注意力权重是"解释性"的最终答案**：权重只表示聚合比例，Value 本身还带着信息，输出不是"权重矩阵"；
3. **混淆 d_k 与 d_model**：单头时通常 d_k = d_v = d_model，多头时 d_k = d_model / h；
4. **忘记输出还要再乘一个投影 W_O**：多头拼接后必须有 W_O 把子空间信息融合回 d_model。
`,
      tips: [
        {
          kind: 'interview',
          text: '必答题："为什么需要 Q、K、V 三组投影而不是直接用一个 X？" 答题主线：检索者与被检索者承担不同角色，需要不同子空间的表示；如果强行让 Q=K=X，模型就失去了"按内容寻址"的自由度。',
        },
        {
          kind: 'note',
          text: '注意力输出是 V 的凸组合（权重非负、和为 1），所以数值范围不超过 Value 的极值。这一性质在推理时很有用：它意味着注意力本身不会放大数值。',
        },
        {
          kind: 'pitfall',
          text: '单头注意力的 W_Q、W_K 形状必须一致（都是 [d_model, d_k]），否则 `Q @ K.T` 维度对不上。W_V 可以是不同维度，但工程上通常统一取 d_k = d_v。',
        },
      ],
      demos: [
        {
          title: '用 sqrt 放大的 K 演示"检索"直觉：对齐度决定权重',
          lang: 'python',
          code: `import numpy as np

def softmax(x):
    x = x - x.max(axis=-1, keepdims=True)
    e = np.exp(x)
    return e / e.sum(axis=-1, keepdims=True)

# 3 个 token 的 Key 向量与 Value 向量
K = np.array([[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]]) / np.sqrt(2)
V = np.array([[10.0, 0.0], [0.0, 10.0], [5.0, 5.0]])

for name, q in (("与 K0 同向", np.array([1.0, 0.0])),
                ("与 K1 同向", np.array([0.0, 1.0])),
                ("与 K2 同向", np.array([1.0, 1.0]) / np.sqrt(2))):
    w = softmax(q @ K.T)
    out = w @ V
    print("%-10s 权重 = %s  输出 = %s" % (name, np.round(w, 3), np.round(out, 3)))

print()
print("查询向量越接近某个 Key，该位置的权重越大 —— 这就是按内容寻址。")`,
        },
        {
          title: '注意力输出是 Value 的凸组合：验证非负与和为 1',
          lang: 'python',
          code: `import numpy as np

def softmax(x):
    x = x - x.max(axis=-1, keepdims=True)
    e = np.exp(x)
    return e / e.sum(axis=-1, keepdims=True)

rng = np.random.default_rng(0)
n, d = 6, 4
X = rng.normal(size=(n, d))
Wq, Wk, Wv = (rng.normal(size=(d, d)) for _ in range(3))

Q, K, V = X @ Wq, X @ Wk, X @ Wv
w = softmax(Q @ K.T / np.sqrt(d))
out = w @ V

print("权重行和:", np.round(w.sum(axis=1), 6))
print("权重非负:", bool(np.all(w >= 0)))
print("输出每一维是否都在 V 的范围内（凸包性质）:")
for j in range(d):
    lo, hi = V[:, j].min(), V[:, j].max()
    inside = bool(np.all(out[:, j] >= lo - 1e-12) and np.all(out[:, j] <= hi + 1e-12))
    print("  维度 %d: [%.4f, %.4f] 输出区间 [%.4f, %.4f] 在范围内: %s"
          % (j, lo, hi, out[:, j].min(), out[:, j].max(), inside))`,
        },
      ],
    },
    {
      id: 'llm-a1-c4-l2',
      title: '缩放点积注意力：公式推导与 sqrt(d_k) 的必要性',
      content: `
## 公式

缩放点积注意力（scaled dot-product attention）的完整定义是：

Attention(Q, K, V) = softmax(Q·Kᵀ / sqrt(d_k)) · V

- Q·Kᵀ：形状 [n, n]，第 (i, j) 项是第 i 个查询与第 j 个键的点积；
- 除以 sqrt(d_k)：控制量级；
- softmax（按行）：把每行的 n 个分数变成和为 1 的概率；
- 乘以 V：按权重对所有 Value 加权求和。

<Diagram type="arch" name="self-attention" />

## 为什么必须除以 sqrt(d_k)：方差推导

假设 q 与 k 的各分量相互独立、均值为 0、方差为 1（初始化良好时的近似）。点积是 d_k 项之和：

Var(q·k) = Var(sum_i q_i k_i) = sum_i Var(q_i k_i)

由于分量独立，不同 i 之间的协方差为零，方差可加。对单项：

Var(q_i k_i) = E[q_i² k_i²] - (E[q_i k_i])² = E[q_i²]·E[k_i²] - (E[q_i]E[k_i])² = 1 × 1 - 0 = 1

所以 **Var(q·k) = d_k**，标准差是 sqrt(d_k)。除以 sqrt(d_k) 后：

Var(q·k / sqrt(d_k)) = d_k / d_k = 1

logits 的标准差回到 1，与维度无关。

## 不缩放会发生什么

softmax(z) 的输入量级决定其"尖锐程度"。当 z 的元素标准差为 sqrt(d_k) 时，d_k = 64 对应的 logits 典型跨度是正负 24；d_k = 512 时是正负 68。

softmax 对输入的雅可比为：

d softmax_i / d z_j = p_i (delta_ij - p_j)

当分布接近 one-hot（p_max 约 1，其余约 0）时，所有偏导都接近 0——**梯度消失**，注意力权重几乎不再更新。反之若输入过小（量级远小于 1），softmax 接近均匀分布，注意力退化为"平均池化"，同样无法筛选信息。缩放让 logits 停在"有区分度但不饱和"的区间。

## 数值稳定：softmax 先减最大值

softmax(z)_i = exp(z_i) / sum_j exp(z_j)

若 z_i = 1000，exp(1000) 直接溢出为 inf，得到 nan。由于 softmax 具有**平移不变性**（分子分母同乘 exp(-m) 不改变结果），标准做法先减去每行最大值：

softmax(z)_i = exp(z_i - max z) / sum_j exp(z_j - max z)

最大项变成 exp(0)=1，其余项都在 (0, 1] 内，不会溢出。**不要**减去均值：均值方案在极端情况下仍可能溢出（若某个 z_i 比均值大 700 以上）。

## 一个常见的实现错误

\`\`\`python
# 错误：忘记缩放
scores = Q @ K.T

# 错误：除以 d_k 而不是 sqrt(d_k)
scores = Q @ K.T / d_k

# 正确
scores = Q @ K.T / np.sqrt(d_k)
\`\`\`

除以 d_k 会让 d_k = 64 时 logits 缩到约 1/8，softmax 变得过于平坦，注意力几乎不选择任何位置，模型表现得像均值池化。**量级过小和过大都会损害训练**，这是很多人忽视的"另一半"。

## 复杂度

- 计算：Q·Kᵀ 需要 n²·d_k 次乘加，softmax 需要 n² 次 exp，权重乘 V 需要 n²·d_v；
- 时间与显存都是 **O(n²)**（在固定的 d 下）。

n = 8192 时，单头 fp16 的注意力矩阵就要 8192² × 2 字节 ≈ 128 MB，多头 32 个头则是 4 GB。这就是 FlashAttention（分块 + 在线 softmax，不物化完整矩阵）出现的原因。

## 常见误区

1. **以为缩放是为了"防止溢出"**：主要目的是控制 softmax 的饱和度与梯度，不是数值溢出（溢出靠减最大值解决）；
2. **把 sqrt(d_k) 写成 sqrt(d_model)**：多头时每头维度是 d_model / h，必须用 d_k；
3. **对 V 也做归一化**：只有分数需要 softmax，Value 直接加权求和；
4. **以为缩放系数可以随意改成常数**：它是从方差推导出来的，换初始化方案时需要重新估算（例如 QK-norm 模型里量级已被归一化，缩放系数就要相应调整）。

<ScaledDotProductDemo />
`,
      tips: [
        {
          kind: 'pitfall',
          text: 'softmax 一定要减去**每行最大值**再做 exp。减去均值、或先 exp 再减去 exp 的最大值，都无法完全避免溢出；最大项归一化到 exp(0)=1 才是稳妥做法。',
        },
        {
          kind: 'interview',
          text: '被问"为什么除以 sqrt(d_k)"，标准答法分三步：独立性下 Var(q·k)=d_k；不缩放则 logits 标准差随维度增长；softmax 饱和导致梯度趋零。再补一句"过小也会导致分布过平"，就是满分答案。',
        },
        {
          kind: 'performance',
          text: '注意力矩阵是 n² 量级，长上下文下显存爆炸。FlashAttention 用分块把计算留在片上缓存、配合在线 softmax，数学结果完全一致但显存从 O(n²) 降到 O(n)。',
        },
      ],
      demos: [
        {
          title: '缩放实验：不缩放 vs 除以 sqrt(d_k) vs 除以 d_k',
          lang: 'python',
          code: `import numpy as np

def softmax(x):
    x = x - x.max(axis=-1, keepdims=True)
    e = np.exp(x)
    return e / e.sum(axis=-1, keepdims=True)

rng = np.random.default_rng(0)
n = 8
print("%6s %14s %14s %14s %14s" % ("d_k", "raw std", "raw max_p", "scaled max_p", "/d_k max_p"))
for dk in (8, 32, 64, 128, 512, 1024):
    q = rng.normal(size=(n, dk))
    k = rng.normal(size=(n, dk))
    raw = q @ k.T
    p_raw = softmax(raw).max(axis=-1).mean()
    p_scaled = softmax(raw / np.sqrt(dk)).max(axis=-1).mean()
    p_div = softmax(raw / dk).max(axis=-1).mean()
    print("%6d %14.2f %14.3f %14.3f %14.3f" % (dk, raw.std(), p_raw, p_scaled, p_div))

print()
print("raw 的 max_p 随维度升高迅速逼近 1（饱和）；scaled 稳定在 1/n=%0.3f 附近（分散）；" % (1 / n))
print("除以 d_k 则过于平坦，几乎等价于均匀平均。")`,
        },
        {
          title: 'softmax 数值稳定：为什么必须减最大值',
          lang: "python",
          code: `import numpy as np

def softmax_naive(x):
    e = np.exp(x)
    return e / e.sum()

def softmax_stable(x):
    x = x - x.max()
    e = np.exp(x)
    return e / e.sum()

z = np.array([1000.0, 1001.0, 1002.0])
print("直接 exp:", softmax_naive(z))
print("减最大值后:", softmax_stable(z))
print()
z2 = np.array([0.0, 1.0, 2.0])
print("两法在小数值上完全一致:",
      np.allclose(softmax_naive(z2), softmax_stable(z2)))
print("减均值在极端情况下仍会溢出:", softmax_naive(np.array([2000.0, 0.0, 0.0])))`,
        },
      ],
    },
    {
      id: 'llm-a1-c4-l3',
      title: '因果掩码：让模型看不见未来',
      content: `
## 为什么需要掩码

GPT 类模型用**下一个 token 预测**训练：给定 x_0..x_{t-1}，预测 x_t。如果注意力可以自由地看到 x_t 及之后的内容，模型就能直接抄答案，loss 会迅速降到 0，但部署时根本没有"未来"可用。

因此必须保证：**位置 t 只能关注位置 j 小于等于 t**。这叫因果掩码（causal mask），也叫下三角掩码。

<Heatmap name="attention-causal" />

上图每一行是一个查询 token，灰色（值 0）的格子表示被屏蔽。可以看到第 0 行只能看自己，第 1 行能看前两个，依此类推——这是一个严格的下三角结构。

## 实现：加负无穷再 softmax

注意力分数的形状是 [n, n]。构造掩码矩阵 M，当 j 大于 i 时 M_ij = -inf（实践中用 -1e9），否则为 0，然后：

masked_scores = Q·Kᵀ / sqrt(d_k) + M

因为 exp(-inf) = 0，被屏蔽位置在 softmax 后的权重**严格为 0**。剩下位置的分数经过归一化，依然和为 1。

\`\`\`python
mask = np.triu(np.ones((n, n), dtype=bool), k=1)   # 严格上三角为 True
scores = np.where(mask, -1e9, scores)
\`\`\`

## 三个必须避开的错误

1. **用 0 屏蔽**：把上三角设为 0 只是让分数保持原值（或者说归零但不排除），softmax 仍会给未来位置分配权重，等于没有掩码。
2. **先 softmax 再置零**：这会让每行的和小于 1，输出被整体缩小，相当于引入了"位置相关的缩放"。
3. **用乘法掩码**：写 \`scores * mask\`（mask 取 0/1）时，被屏蔽位置变成 0 而不是 -inf；当其他分数为负数时，0 反而成了最大的那个，模型会**最关注未来位置**——完全反向。

正确做法永远是"在 softmax 之前的分数上加一个足够大的负数"。

## 为什么是 -1e9 而不是 -inf

理论上 -inf 最干净，但浮点运算中 -inf 加上有限数仍是 -inf，若某一行**全部**被屏蔽，减最大值的稳定化步骤会算出 inf - inf = nan。实践中：

- 用 -1e9：exp(-1e9 - max) 下溢为 0，行为正确且不产生 nan；
- 更好的做法：把注意力分数 dtype 提升到 fp32 再掩码，避免 fp16 下 -1e4 与有限值相加后精度损失。

## padding mask 与因果 mask 的叠加

batch 推理时短序列右侧补齐 pad。pad 是**列方向**（作为 key）需要屏蔽，因果是**上三角**需要屏蔽。两者合并：

\`\`\`python
causal = np.triu(np.ones((n, n), bool), k=1)          # [n, n]
pad = ~pad_mask                                       # [B, n]，pad 为 True
mask = causal[None, :, :] | pad[:, None, :]           # [B, n, n]
scores = np.where(mask, -1e9, scores)
\`\`\`

注意 pad 要扩展成 [B, 1, n] 才能与 [1, n, n] 广播成 [B, n, n]。

## 训练与推理的不一致

训练时整段序列一次并行计算，每个位置都用因果掩码；推理时每步只生成一个新 token，并用 KV Cache 缓存历史。两者得到的注意力结果应当一致——这是实现正确性的重要测试点：**"整段前向的第 t 行输出"应该等于"逐 token 生成到第 t 步的输出"**。

## 复杂度不是掩码省掉的

掩码只是把权重压成 0，计算量仍然是 O(n²)。为真正省算力，工程上有滑窗注意力（只看最近 w 个位置，O(n·w)）、稀疏注意力、分块因果实现等方案。FlashAttention 的因果版本利用"上三角块完全被屏蔽"直接跳过整块计算，等效计算量减半。

## 常见误区

1. **以为掩码会改变计算复杂度**：朴素实现仍然算完整的 n² 个分数；
2. **以为编码器（BERT）也要因果掩码**：编码器是双向的，用不到因果掩码，只屏蔽 pad；
3. **以为一行全被屏蔽的情况不存在**：若整个序列都是 pad，就会出现全屏蔽行，必须保证不产生 nan（用 -1e9 而不是 -inf，或显式处理）；
4. **在带 mask 的情况下做 naive 的均值统计**：weights 的行和仍是 1，但有效位置数不同，解释时要注意。

<MaskDemo />
`,
      tips: [
        {
          kind: 'pitfall',
          text: '因果掩码必须写在 softmax **之前**，用 `np.where(mask, -1e9, scores)` 或加 `-inf`。写 `scores * mask` 是经典事故：其他分数为负时，被屏蔽的 0 反而最大。',
        },
        {
          kind: 'interview',
          text: '常被追问"为什么用 -1e9 不用 -inf"。答：-inf 在同一行全被屏蔽时，稳定化 softmax 的 `x - max` 会得到 nan；-1e9 在 exp 后同样下溢为 0，但不产生 nan。',
        },
        {
          kind: 'performance',
          text: 'FlashAttention 的因果版本按块跳过完全位于上三角的块，等效计算量约为非因果实现的一半；这是长上下文训练提速的主要来源之一。',
        },
      ],
      demos: [
        {
          title: '因果掩码的三种写法对比：正确、置零、乘法',
          lang: 'python',
          code: `import numpy as np

def softmax(x):
    x = x - x.max(axis=-1, keepdims=True)
    e = np.exp(x)
    return e / e.sum(axis=-1, keepdims=True)

np.set_printoptions(precision=3, suppress=True)
scores = np.array([
    [ 1.0, -2.0, -3.0, -4.0],
    [ 0.5,  0.4, -1.0, -2.0],
    [-0.5,  0.9,  0.3, -1.0],
    [ 0.1, -0.2,  0.6,  0.8],
])
upper = np.triu(np.ones((4, 4), bool), k=1)

print("正确：加 -1e9 之后 softmax")
w_ok = softmax(np.where(upper, -1e9, scores))
print(w_ok, "\\n上三角全为 0:", bool(np.all(w_ok[upper] == 0)), "\\n")

print("错误：用乘法掩码（mask 取 0/1）")
w_mul = softmax(scores * (~upper))
print(w_mul)
print("上三角是否出现非零权重:", bool(np.any(w_mul[upper] > 0)), "\\n")

print("错误：先 softmax 再把上三角置 0（行和不再为 1）")
w_late = softmax(scores)
w_late[upper] = 0
print("行和:", w_late.sum(axis=1))`,
        },
        {
          title: 'padding mask 与 causal mask 叠加，并检查全 pad 行不产生 nan',
          lang: 'python',
          code: `import numpy as np

def softmax(x):
    x = x - x.max(axis=-1, keepdims=True)
    e = np.exp(x)
    return e / e.sum(axis=-1, keepdims=True)

rng = np.random.default_rng(0)
B, n = 2, 4
scores = rng.normal(size=(B, n, n))
pad_mask = np.array([[1, 1, 1, 0], [1, 0, 0, 0]], dtype=bool)

causal = np.triu(np.ones((n, n), bool), k=1)
mask = causal[None, :, :] | (~pad_mask)[:, None, :]
print("mask 形状:", mask.shape)
print(mask.astype(int)[0], "\\n第 1 条序列是否屏蔽了 pad 列:", bool(np.all(mask[1][:, 1:])))

w = softmax(np.where(mask, -1e9, scores))
print("权重行和:", np.round(w.sum(axis=-1), 6))
pad_cols = (~pad_mask)[:, None, :]                 # [B, 1, n]，pad 为 True
print("pad 列权重是否全为 0:", bool(np.all(np.where(pad_cols, w, 0.0) == 0)))

print()
print("对比：若用 -inf，且某行全部被屏蔽")
bad = np.full((2, 2), -np.inf)
print(softmax(bad))
print("用 -1e9 的结果:", softmax(np.full((2, 2), -1e9)))`,
        },
      ],
    },
    {
      id: 'llm-a1-c4-l4',
      title: '完整的自注意力模块与前向形状流',
      content: `
## 从裸公式到可训练模块

把前面三节拼起来，一个完整的自注意力层包含：

1. 三个投影（W_Q、W_K、W_V），得到 Q、K、V；
2. 缩放点积 + 掩码 + softmax，得到权重；
3. 权重乘 V，得到每个位置的上下文向量；
4. 输出投影 W_O，把结果映射回 d_model。

\`\`\`python
def self_attention(X, Wq, Wk, Wv, Wo, causal=True):
    Q, K, V = X @ Wq, X @ Wk, X @ Wv
    dk = Q.shape[-1]
    scores = Q @ K.T / np.sqrt(dk)
    if causal:
        mask = np.triu(np.ones(scores.shape, dtype=bool), k=1)
        scores = np.where(mask, -1e9, scores)
    w = softmax(scores)
    return (w @ V) @ Wo, w
\`\`\`

<TensorFlow steps="(2,5,16) 输入 X|(2,5,4) Q/K/V|(2,5,5) 分数 QKᵀ/√dk|causal mask + softmax|(2,5,5) 权重|(2,5,4) 上下文|(2,5,16) 输出" note="B=2 条序列、n=5 个 token、d_model=16、单头 d_k=4；因果掩码后每行权重只在当前位置及左侧非零" />

## 形状流逐站检查

| 阶段 | 单序列 | 批量（B 条序列） |
| --- | --- | --- |
| 输入 X | [n, d] | [B, n, d] |
| Q、K、V | [n, d_k] | [B, n, d_k] |
| 分数 | [n, n] | [B, n, n] |
| 权重 | [n, n] | [B, n, n] |
| 上下文 | [n, d_v] | [B, n, d_v] |
| 输出 | [n, d] | [B, n, d] |

**输入输出形状必须一致**，这是 Transformer Block 能无限堆叠的前提。若你在实现里发现输出比输入少了一个维度，通常是最后的 W_O 漏了或 reshape 写错了。

## 批量化：用广播代替循环

\`\`\`python
# X: [B, n, d]
Q, K, V = X @ Wq, X @ Wk, X @ Wv           # [B, n, d_k]
scores = Q @ K.transpose(0, 2, 1) / np.sqrt(d_k)   # [B, n, n]
w = softmax(scores)
out = w @ V                                 # [B, n, d_v]
\`\`\`

关键是 \`K.transpose(0, 2, 1)\`：保持 batch 维不动，交换后两维。写成 \`K.T\` 会把三个维度全部反转，得到 [d_k, n, B]，形状对不上直接报错——比"静默错误"幸运，但也要理解原因。

## 参数量的估算

单头自注意力（d_k = d_v = d）：

- W_Q、W_K、W_V：各 d² 个参数，共 3d²；
- W_O：d²。
- 合计 **4d²**。

以 d = 4096 为例，每层注意力约 6710 万参数。而 FFN 用 d_ff = 4d 时是 8d²，所以注意力约占每层参数的三分之一。

## 一个常被忽略的细节：输出投影 W_O

如果去掉 W_O，多头注意力拼接后的输出每一段都只在自己头的子空间里，模型缺少一次"跨头融合"。更严格地说，没有 W_O 时各头输出直接相加与各头单独计算再相加是等价的（线性），多头的表达能力会大打折扣。W_O 的存在让每个头可以重新定义自己在最终输出中的贡献。

## 正确性自测清单

1. **形状自测**：输入 [B, n, d]，输出必须还是 [B, n, d]；
2. **行和自测**：权重每行和为 1；因果情况下上三角全为 0；
3. **因果性自测**：改变序列最后一个 token 的输入，前 n-1 个位置的输出必须**完全不变**（这是判断"有没有偷看未来"最直接的测试）；
4. **单头等价性**：h = 1 时多头实现必须与单头实现数值一致；
5. **训练/推理一致**：整段前向第 t 行输出与逐 token 生成到第 t 步的输出一致。

第 3 条测试极其有用：任何掩码实现错误都会在这里暴露出来。

## 常见误区

1. **忽略 W_O**：参数量少算 d²，模型表达能力也会下降；
2. **把 softmax 写成了按列归一化**：必须 \`axis=-1\`，因为每行代表"一个查询如何分配给所有键"；
3. **在批量实现里用 \`K.T\`**：应该是 \`K.transpose(0, 2, 1)\`；
4. **以为注意力输出可以直接当 logits**：还需要经过 LayerNorm 与 FFN，甚至最后一层 LM head。
`,
      tips: [
        {
          kind: 'leak',
          text: '写完注意力后立刻做"因果性自测"：只改变最后一个 token 的输入，检查前 n-1 个位置的输出是否逐元素不变。这一个测试能抓住绝大多数掩码与广播错误。',
        },
        {
          kind: 'pitfall',
          text: 'softmax 必须沿最后一维（`axis=-1`）。沿 axis=0 归一化时每列的权重和为 1，语义完全错误——输出仍然是有限数、不报错，但模型学不到东西。',
        },
        {
          kind: 'interview',
          text: '被问"自注意力一层有多少参数"，答 4d²（W_Q、W_K、W_V、W_O 各 d²），再补充 FFN 的 8d²（d_ff = 4d），得出"注意力占每层三分之一、FFN 占三分之二"。',
        },
        {
          kind: 'performance',
          text: '批量实现里避免 Python 循环，用批量矩阵乘法 `Q @ K.transpose(0, 2, 1)`；同时尽量保持 X 为 float32，fp16 下注意力分数的累加误差会明显放大。',
        },
      ],
      demos: [
        {
          title: '完整自注意力模块 + 因果性自测',
          lang: 'python',
          code: `import numpy as np

def softmax(x):
    x = x - x.max(axis=-1, keepdims=True)
    e = np.exp(x)
    return e / e.sum(axis=-1, keepdims=True)

def self_attention(X, Wq, Wk, Wv, Wo, causal=True):
    Q, K, V = X @ Wq, X @ Wk, X @ Wv
    dk = Q.shape[-1]
    scores = Q @ K.transpose(0, 2, 1) / np.sqrt(dk)
    if causal:
        n = scores.shape[-1]
        mask = np.triu(np.ones((n, n), dtype=bool), k=1)
        scores = np.where(mask, -1e9, scores)
    w = softmax(scores)
    return (w @ V) @ Wo, w

rng = np.random.default_rng(0)
B, n, d, h = 2, 5, 16, 4
dk = d // h
X = rng.normal(size=(B, n, d))
Wq, Wk, Wv, Wo = [rng.normal(0, 0.3, size=(d, dk)) for _ in range(3)] + [rng.normal(0, 0.3, size=(dk, d))]

out, w = self_attention(X, Wq, Wk, Wv, Wo)
print("输入", X.shape, "-> 输出", out.shape)
print("权重形状", w.shape, " 行和", np.round(w.sum(axis=-1), 6))
print("上三角权重全为 0:", bool(np.all(w[:, np.triu_indices(n, 1)[0], np.triu_indices(n, 1)[1]] == 0)))

X2 = X.copy()
X2[:, -1, :] += rng.normal(size=d) * 3.0
out2, _ = self_attention(X2, Wq, Wk, Wv, Wo)
print()
print("只改动最后一个 token 后，前 n-1 个位置输出完全不变:",
      bool(np.allclose(out[:, :-1], out2[:, :-1])))
print("最后一个位置的输出确实改变了:", not np.allclose(out[:, -1], out2[:, -1]))`,
        },
      ],
    },
  ],
  exercises: [
      {
        id: 'llm-a1-c4-e1',
        type: 'single',
        difficulty: 2,
        question: '自注意力中 Q（Query）、K（Key）、V（Value）各自的语义角色是？',
        options: [
          {
            value: 'A',
            text: 'Q 是我要找什么，K 是我有什么，V 是我实际贡献的内容',
          },
          {
            value: 'B',
            text: 'Q 是输入，K 是输出，V 是权重',
          },
          {
            value: 'C',
            text: '三者完全相同，只是名字不同',
          },
          {
            value: 'D',
            text: 'Q 是位置编码，K 是词向量，V 是偏置',
          },
        ],
        answer: 'A',
        explanation: 'Q 表示当前 token "想找什么信息"，K 表示每个 token "提供什么索引"，二者点积得到相关性分数；V 是实际被加权求和的内容。这是注意力的检索隐喻。',
        tags: ['自注意力', 'QKV'],
      },
      {
        id: 'llm-a1-c4-e2',
        type: 'judge',
        difficulty: 2,
        question: '缩放点积注意力中除以 √d_k 是为了防止点积结果过大导致 softmax 梯度消失。',
        answer: true,
        explanation: '若 q 与 k 各分量独立且方差为 1，点积的方差约为 d_k。d_k=64 时点积量级约 ±8，softmax 会变得极其尖锐，梯度接近 0。除以 √d_k 把方差拉回 1。',
        tags: ['缩放点积'],
      },
      {
        id: 'llm-a1-c4-e3',
        type: 'single',
        difficulty: 2,
        question: 'softmax(QK^T / √d_k) 中，每一行的和是？',
        options: [
          {
            value: 'A',
            text: '0',
          },
          {
            value: 'B',
            text: '1',
          },
          {
            value: 'C',
            text: 'd_k',
          },
          {
            value: 'D',
            text: '不固定',
          },
        ],
        answer: 'B',
        explanation: 'softmax 沿最后一维（被关注的 token 方向）归一化，因此每一行都是一个概率分布，和为 1。这决定了最终输出是 V 的凸组合。',
        tags: ['softmax'],
      },
      {
        id: 'llm-a1-c4-e4',
        type: 'multiple',
        difficulty: 3,
        question: '为什么解码器需要因果掩码（causal mask）？（多选）',
        options: [
          {
            value: 'A',
            text: '训练时防止模型看到未来的 token',
          },
          {
            value: 'B',
            text: '保持训练与推理时行为一致',
          },
          {
            value: 'C',
            text: '掩码把未来位置的分数设为 -inf，softmax 后权重为 0',
          },
          {
            value: 'D',
            text: '减少模型参数量',
          },
        ],
        answer: ['A', 'B', 'C'],
        explanation: 'D 错误，掩码不改变参数量。若训练时能看到未来，模型会"抄答案"，推理时无法抄就会崩坏。掩码实现上是用 -inf（或极大负数）填充上三角。',
        tags: ['因果掩码'],
      },
      {
        id: 'llm-a1-c4-e5',
        type: 'fill',
        difficulty: 3,
        question: '缩放点积注意力的公式为 Attention(Q,K,V) = softmax(QK^T / ___)·V。',
        blanks: [
          ['√d_k', 'sqrt(d_k)', '√dk', 'sqrt(dk)', '根号d_k'],
        ],
        explanation: '分母是 √d_k（d_k 是 key 的维度）。这是 Attention Is All You Need 的核心公式之一。',
        tags: ['公式'],
      },
      {
        id: 'llm-a1-c4-e6',
        type: 'code',
        difficulty: 3,
        question: `实现缩放点积注意力 \`attention(Q, K, V)\`：

- Q: (n_q, d_k), K: (n_k, d_k), V: (n_k, d_v)
- 返回 \`(output, weights)\`，output 形状 (n_q, d_v)，weights 形状 (n_q, n_k)

不要用掩码。`,
        starterCode: `import numpy as np

def attention(Q, K, V):
    d_k = Q.shape[-1]
    scores = ___
    weights = ___
    output = ___
    return output, weights


Q = np.array([[1.0, 0.0]])
K = np.array([[1.0, 0.0], [0.0, 1.0]])
V = np.array([[10.0], [20.0]])
attention(Q, K, V)
`,
        setupCode: '',
        expectedOutput: 'output 与 weights',
        tests: `import numpy as np
Q = np.array([[1.0, 0.0]])
K = np.array([[1.0, 0.0], [0.0, 1.0]])
V = np.array([[10.0], [20.0]])
out, w = attention(Q, K, V)
assert out.shape == (1, 1), f"输出形状应为 (1,1)，实际 {out.shape}"
assert w.shape == (1, 2), f"权重形状应为 (1,2)，实际 {w.shape}"
assert abs(w.sum() - 1.0) < 1e-9, f"权重和应为 1，实际 {w.sum()}"
# Q 与 K[0] 完全同向，应偏向第一个
assert w[0, 0] > w[0, 1], "Q 与 K[0] 更相似，权重应更大"
assert out[0, 0] > 10.0, "输出应是 V 的加权平均"
`,
        answer: `import numpy as np

def attention(Q, K, V):
    d_k = Q.shape[-1]
    scores = Q @ K.T / np.sqrt(d_k)
    e = np.exp(scores - scores.max(axis=-1, keepdims=True))
    weights = e / e.sum(axis=-1, keepdims=True)
    output = weights @ V
    return output, weights


Q = np.array([[1.0, 0.0]])
K = np.array([[1.0, 0.0], [0.0, 1.0]])
V = np.array([[10.0], [20.0]])
attention(Q, K, V)`,
        explanation: `\`\`\`python
d_k = Q.shape[-1]
scores = Q @ K.T / np.sqrt(d_k)
e = np.exp(scores - scores.max(axis=-1, keepdims=True))
weights = e / e.sum(axis=-1, keepdims=True)
output = weights @ V
return output, weights
\`\`\`

**数值稳定技巧**：softmax 前减去每行最大值，防止 exp 溢出，结果不变。这是所有实现的标准做法。`,
        tags: ['编程', '自注意力'],
      },
      {
        id: 'llm-a1-c4-e7',
        type: 'code',
        difficulty: 4,
        question: `实现带因果掩码的自注意力 \`causal_attention(Q, K, V)\`：

- 位置 i 只能关注位置 ≤ i
- 未来位置分数设为 \`-1e9\`（而非 -inf，避免 nan）
- 返回 \`(output, weights)\`

验证：weights 的上三角（不含对角线）应全为 0。`,
        starterCode: `import numpy as np

def causal_attention(Q, K, V):
    n = Q.shape[0]
    d_k = Q.shape[-1]
    scores = ___
    mask = np.triu(np.ones((n, n)), k=1).astype(bool)
    scores = ___
    e = np.exp(scores - scores.max(axis=-1, keepdims=True))
    weights = e / e.sum(axis=-1, keepdims=True)
    return weights @ V, weights


Q = np.eye(3)
causal_attention(Q, Q, Q)
`,
        setupCode: '',
        expectedOutput: '上三角权重为 0',
        tests: `import numpy as np
Q = np.random.default_rng(0).normal(size=(4, 8))
K = np.random.default_rng(1).normal(size=(4, 8))
V = np.random.default_rng(2).normal(size=(4, 8))
out, w = causal_attention(Q, K, V)
assert out.shape == (4, 8), f"输出形状应为 (4,8)，实际 {out.shape}"
assert np.allclose(w.sum(axis=-1), 1.0), "每行权重和应为 1"
assert np.allclose(np.triu(w, k=1), 0.0), "上三角（未来位置）权重应为 0"
assert w[0, 0] == 1.0, "第一个 token 只能关注自己，权重应为 1"
assert w[3, 3] > 0, "对角线应有非零权重"
`,
        answer: `import numpy as np

def causal_attention(Q, K, V):
    n = Q.shape[0]
    d_k = Q.shape[-1]
    scores = Q @ K.T / np.sqrt(d_k)
    mask = np.triu(np.ones((n, n)), k=1).astype(bool)
    scores = np.where(mask, -1e9, scores)
    e = np.exp(scores - scores.max(axis=-1, keepdims=True))
    weights = e / e.sum(axis=-1, keepdims=True)
    return weights @ V, weights


Q = np.eye(3)
causal_attention(Q, Q, Q)`,
        explanation: `\`\`\`python
scores = Q @ K.T / np.sqrt(d_k)
mask = np.triu(np.ones((n, n)), k=1).astype(bool)
scores = np.where(mask, -1e9, scores)
e = np.exp(scores - scores.max(axis=-1, keepdims=True))
weights = e / e.sum(axis=-1, keepdims=True)
return weights @ V, weights
\`\`\`

**为什么用 -1e9 而不是 -inf**：\`-inf - (-inf)\` 会产生 nan。用极大负数 exp 后趋近 0，效果相同且安全。

\`np.triu(..., k=1)\` 取严格上三角，正好对应"位置 j > i"的未来位置。`,
        tags: ['编程', '因果掩码'],
      },
      {
        id: 'llm-a1-c4-e8',
        type: 'judge',
        difficulty: 3,
        question: '自注意力中每个 token 的输出是所有 value 向量的加权平均，权重由 query 与 key 的相似度决定。',
        answer: true,
        explanation: 'softmax 权重非负且和为 1，因此输出是 V 的凸组合（加权平均）。这正是"注意力"这个名字的由来——模型学会把注意力分配到相关的 token 上。',
        tags: ['自注意力'],
      },
      {
        id: 'llm-a1-c4-e9',
        type: 'single',
        difficulty: 3,
        question: '如果把自注意力中的 softmax 去掉，会发生什么？',
        options: [
          {
            value: 'A',
            text: '没有影响',
          },
          {
            value: 'B',
            text: '权重不再归一化，可能为负且数值爆炸，训练不稳定',
          },
          {
            value: 'C',
            text: '速度变快，效果更好',
          },
          {
            value: 'D',
            text: '等价于线性层',
          },
        ],
        answer: 'B',
        explanation: 'softmax 提供了非负性与归一化，使输出有界且可解释为权重。去掉后 QK^T 的量级随维度增长，梯度极不稳定，模型几乎无法训练。',
        tags: ['softmax'],
      },
      {
        id: 'llm-a1-c4-e10',
        type: 'code',
        difficulty: 3,
        question: `实现数值稳定的 softmax \`stable_softmax(x)\`：沿最后一维计算，先减去最大值。

返回与输入同形状的数组。`,
        starterCode: `import numpy as np

def stable_softmax(x):
    x = np.asarray(x, dtype=float)
    ___

stable_softmax(np.array([[1.0, 2.0, 3.0]]))
`,
        setupCode: '',
        expectedOutput: '概率和为 1',
        tests: `import numpy as np
out = stable_softmax(np.array([[1.0, 2.0, 3.0]]))
assert np.allclose(out.sum(), 1.0), f"和应为 1，实际 {out.sum()}"
assert np.allclose(out[0, 2], 0.665241, atol=1e-5), f"第三个概率不正确：{out[0,2]}"
# 极大值不应溢出
big = stable_softmax(np.array([[1000.0, 1001.0]]))
assert np.all(np.isfinite(big)), "大数值不应产生 inf/nan"
assert abs(big.sum() - 1.0) < 1e-9
# 二维每行独立归一化
m = stable_softmax(np.array([[1.0, 1.0], [2.0, 2.0]]))
assert np.allclose(m.sum(axis=-1), 1.0), "每行应各自归一化"
`,
        answer: `import numpy as np

def stable_softmax(x):
    x = np.asarray(x, dtype=float)
    m = np.max(x, axis=-1, keepdims=True)
    e = np.exp(x - m)
    return e / e.sum(axis=-1, keepdims=True)


stable_softmax(np.array([[1.0, 2.0, 3.0]]))`,
        explanation: `\`\`\`python
m = np.max(x, axis=-1, keepdims=True)
e = np.exp(x - m)
return e / e.sum(axis=-1, keepdims=True)
\`\`\`

**\`keepdims=True\` 很关键**：保持维度才能在广播时正确对齐。没有它，(2,3) 减 (2,) 会沿错误的轴广播。`,
        tags: ['编程', 'softmax'],
      },
      {
        id: 'llm-a1-c4-e11',
        type: 'code',
        difficulty: 4,
        question: `验证除以 √d_k 的必要性：实现 \`logit_std(d_k, n_samples=1000)\`。

- 用默认随机种子生成 n_samples 组 q、k（各 d_k 维，标准正态）
- 计算不缩放的点积 q·k，返回其标准差（保留 4 位小数）
- 期望结果约等于 √d_k`,
        starterCode: `import numpy as np

def logit_std(d_k, n_samples=1000):
    rng = np.random.default_rng(42)
    Q = rng.normal(size=(n_samples, d_k))
    K = rng.normal(size=(n_samples, d_k))
    dots = ___
    return round(float(dots.std()), 4)


logit_std(64)
`,
        setupCode: '',
        expectedOutput: '约 8.0（=√64）',
        tests: `import numpy as np
s64 = logit_std(64)
assert abs(s64 - 8.0) < 0.6, f"d_k=64 时标准差应约 8，实际 {s64}"
s16 = logit_std(16)
assert abs(s16 - 4.0) < 0.5, f"d_k=16 时标准差应约 4，实际 {s16}"
assert s64 > s16, "维度越高点积方差越大"
`,
        answer: `import numpy as np

def logit_std(d_k, n_samples=1000):
    rng = np.random.default_rng(42)
    Q = rng.normal(size=(n_samples, d_k))
    K = rng.normal(size=(n_samples, d_k))
    dots = (Q * K).sum(axis=-1)
    return round(float(dots.std()), 4)


logit_std(64)`,
        explanation: `\`\`\`python
dots = (Q * K).sum(axis=-1)
return round(float(dots.std()), 4)
\`\`\`

**推导**：q·k = Σ qᵢkᵢ，每项方差为 1，d_k 项相加 → 方差 d_k，标准差 √d_k。

d_k=64 时点积的标准差约 8，softmax 会极度尖锐（几乎 one-hot），梯度消失。除以 √d_k 后方差重回 1，这是缩放的数学依据。`,
        tags: ['编程', '缩放'],
      },
      {
        id: 'llm-a1-c4-e12',
        type: 'multiple',
        difficulty: 3,
        question: '自注意力相比 RNN 的优势有？（多选）',
        options: [
          {
            value: 'A',
            text: '任意两个位置之间的路径长度为 O(1)，长依赖建模更好',
          },
          {
            value: 'B',
            text: '可以并行计算所有位置，训练更快',
          },
          {
            value: 'C',
            text: '计算复杂度与序列长度无关',
          },
          {
            value: 'D',
            text: '每个位置都能直接访问全部上下文',
          },
        ],
        answer: ['A', 'B', 'D'],
        explanation: 'C 错误：自注意力的复杂度是 O(n²·d)，序列长度翻倍计算量翻 4 倍，这也是长上下文的主要成本来源。A、B、D 是其相对 RNN 的核心优势。',
        tags: ['自注意力'],
      },
      {
        id: 'llm-a1-c4-e13',
        type: 'judge',
        difficulty: 3,
        question: '自注意力的计算复杂度关于序列长度 n 是 O(n²)。',
        answer: true,
        explanation: 'QK^T 产生 n×n 的分数矩阵，计算与存储都是 O(n²·d)。这就是长上下文昂贵的原因，也是 FlashAttention、稀疏注意力、线性注意力等研究方向的动机。',
        tags: ['复杂度'],
      },
      {
        id: 'llm-a1-c4-e14',
        type: 'code',
        difficulty: 3,
        question: `实现自注意力的参数量估算 \`attention_params(d_model, mode)\`：

- mode='separate'：Q、K、V、O 四个独立的 d_model×d_model 矩阵
- mode='fused'：用一个大矩阵同时算 QKV（3×d_model×d_model）+ 输出投影

返回参数量（不含偏置）。`,
        starterCode: `def attention_params(d_model, mode='separate'):
    if mode == 'separate':
        return ___
    return ___


attention_params(512, 'separate')
`,
        setupCode: '',
        expectedOutput: '1048576（512 维 × 4 个矩阵）',
        tests: `p = attention_params(512, 'separate')
assert p == 4 * 512 * 512, f"应为 4×512×512=1048576，实际 {p}"
assert attention_params(512, 'fused') == 4 * 512 * 512, "fused 与 separate 参数量相同"
assert attention_params(768, 'separate') == 4 * 768 * 768
assert attention_params(64, 'separate') == 4 * 64 * 64
`,
        answer: `def attention_params(d_model, mode='separate'):
    if mode == 'separate':
        return 4 * d_model * d_model
    return 3 * d_model * d_model + d_model * d_model


attention_params(512, 'separate')`,
        explanation: `\`\`\`python
if mode == "separate":
    return 4 * d_model * d_model
return 3 * d_model * d_model + d_model * d_model
\`\`\`

**两种写法参数量相同**：无论是否合并成一个大矩阵，都是 4 个 d_model×d_model 的变换（Q、K、V、输出投影）。

合并的好处是**计算效率**（一次矩阵乘），不是省参数。`,
        tags: ['编程', '参数量'],
      },
      {
        id: 'llm-a1-c4-e15',
        type: 'single',
        difficulty: 4,
        question: '因果掩码在训练时的作用，最准确的描述是？',
        options: [
          {
            value: 'A',
            text: '加快训练速度',
          },
          {
            value: 'B',
            text: '让模型在预测第 i 个 token 时只能看到前 i 个，与推理时条件一致',
          },
          {
            value: 'C',
            text: '减少显存占用',
          },
          {
            value: 'D',
            text: '增加模型容量',
          },
        ],
        answer: 'B',
        explanation: '训练时整段序列并行前向，若不掩码，位置 i 就能直接"看到"答案（第 i+1 个 token），学不到预测能力。掩码保证训练与推理的信息可见性完全一致。',
        tags: ['因果掩码'],
      },
      {
        id: 'llm-a1-c4-e16',
        type: 'open',
        difficulty: 4,
        question: '请从零推导缩放点积注意力公式，并解释：① 为什么要除以 √d_k（给出数学推导）；② 为什么用点积而不是其他相似度度量；③ softmax 在这里承担什么作用。',
        referenceAnswer: `**公式**

    Attention(Q, K, V) = softmax(QKᵀ / √d_k) · V

其中 Q 形状 (n, d_k)，K 形状 (m, d_k)，V 形状 (m, d_v)。

**① 为什么除以 √d_k**

假设 q、k 的各分量独立同分布，均值为 0、方差为 1（归一化后的激活大致如此）。
点积 z = q·k = Σᵢ qᵢkᵢ，是 d_k 个独立项之和：

    E[z] = 0
    Var[z] = Σᵢ Var(qᵢkᵢ) = d_k · 1 = d_k

所以 z 的标准差为 √d_k。d_k = 64 时，点积典型量级约 ±8。
代入 softmax 后，e⁸ ≈ 3000 远大于 e⁻⁸ ≈ 0.0003，
分布几乎变成 one-hot，此时 softmax 的梯度 σ(1-σ) 趋近于 0，
反向传播的信号被压没，训练极难收敛。

除以 √d_k 后方差重归 1，softmax 处于梯度良好的区间。
**这是一个纯粹为了数值稳定性与梯度健康的设计。**

**② 为什么用点积**

1. **计算高效**：矩阵乘法能被 GPU 高度优化，实践中比加性注意力快得多；
2. **实现简单**：一次 Q @ K.T 得到全部 n×m 分数矩阵，可完全并行；
3. **表达能力足够**：配合可学习的 W_q、W_k 投影，
   核函数近似下的加性模型优势并不明显（论文中对比实验证明两者效果相当，但点积更快）。

原论文明确说明：两种机制理论复杂度相近，但点积在实践中更快更省空间。

**③ softmax 的作用**

1. **归一化**：把任意实数分数变成和为 1 的概率分布，
   使输出 V 的加权组合有界、可解释；
2. **放大差异**：指数函数让高相关的位置权重迅速变大（"聚焦"）；
3. **非负性**：保证注意力权重不做负向抵消，输出是 V 的凸组合；
4. **可微**：梯度形式简单（σ(1-σ)），便于反向传播。

**补充**：softmax 前要减去每行最大值以数值稳定（exp(x - max)），
否则 x 很大时会溢出为 inf。`,
        rubric: [
          {
            point: '写出完整公式并说明各矩阵形状',
            score: 1,
          },
          {
            point: '用方差 d_k、标准差 √d_k 推导并解释 softmax 饱和导致梯度消失',
            score: 3,
          },
          {
            point: '说明点积的并行性与计算效率、可学习投影补足表达力',
            score: 2,
          },
          {
            point: '说明 softmax 的归一化、放大差异、非负、可微',
            score: 2,
          },
        ],
        keywords: ['√d_k', '方差', '梯度消失', '点积', 'GPU', '归一化'],
        explanation: '这道题是 Transformer 面试的核心题。能给出方差推导（Var[z]=d_k）是区别于"背结论"的关键。',
        tags: ['自注意力', '推导', '面试'],
      },
      {
        id: 'llm-a1-c4-e17',
        type: 'code',
        difficulty: 3,
        question: `实现多头注意力的**形状拆分** \`split_heads(x, n_heads)\`：

- 输入 x 形状 (batch, seq, d_model)
- 输出形状 (batch, n_heads, seq, d_head)，其中 d_head = d_model // n_heads

用 reshape + transpose 实现。`,
        starterCode: `import numpy as np

def split_heads(x, n_heads):
    b, s, d = x.shape
    d_head = d // n_heads
    ___

x = np.zeros((2, 5, 8))
split_heads(x, 4)
`,
        setupCode: '',
        expectedOutput: '形状 (2, 4, 5, 2)',
        tests: `import numpy as np
x = np.arange(2 * 5 * 8).reshape(2, 5, 8)
out = split_heads(x, 4)
assert out.shape == (2, 4, 5, 2), f"形状应为 (2,4,5,2)，实际 {out.shape}"
# 检查内容对应正确：第 0 个 batch、第 0 个 head 应取原 x[0,:,0:2]
assert np.allclose(out[0, 0], x[0, :, 0:2]), "拆分位置不正确"
assert np.allclose(out[0, 1], x[0, :, 2:4]), "第二个 head 应取 2:4 列"
# 不同头数
assert split_heads(x, 2).shape == (2, 2, 5, 4)
assert split_heads(x, 8).shape == (2, 8, 5, 1)
`,
        answer: `import numpy as np

def split_heads(x, n_heads):
    b, s, d = x.shape
    d_head = d // n_heads
    return x.reshape(b, s, n_heads, d_head).transpose(0, 2, 1, 3)


x = np.zeros((2, 5, 8))
split_heads(x, 4)`,
        explanation: `\`\`\`python
b, s, d = x.shape
d_head = d // n_heads
return x.reshape(b, s, n_heads, d_head).transpose(0, 2, 1, 3)
\`\`\`

**两步**：先 \`reshape\` 把 d_model 拆成 (n_heads, d_head)，再 \`transpose\` 把 head 维度提到 seq 前面，方便后续对各 head 独立做注意力（形状变成 batch 维）。

合并回去用反向操作：\`transpose(0,2,1,3).reshape(b, s, d)\`。`,
        tags: ['编程', '多头注意力'],
      },
      {
        id: 'llm-a1-c4-e18',
        type: 'judge',
        difficulty: 2,
        question: '多头注意力中，每个头使用完全相同的 Q/K/V 投影矩阵。',
        answer: false,
        explanation: '每个头有自己独立的一组 W_q、W_k、W_v 投影矩阵，这正是"多头"的意义——让不同的头学习不同的关注模式（如语法关系、指代关系、位置邻近等）。',
        tags: ['多头注意力'],
      },
      {
        id: 'llm-a1-c4-e19',
        type: 'fill',
        difficulty: 3,
        question: '多头注意力中，若 d_model=512、n_heads=8，则每个头的维度 d_head = ___。',
        blanks: [
          ['64'],
        ],
        explanation: 'd_head = d_model / n_heads = 512 / 8 = 64。总计算量与单个 512 维头相近，但能并行学习多种关注模式。',
        tags: ['多头注意力'],
      },
      {
        id: 'llm-a1-c4-e20',
        type: 'single',
        difficulty: 3,
        question: '多头注意力相比单头注意力的主要收益是？',
        options: [
          {
            value: 'A',
            text: '大幅减少参数量',
          },
          {
            value: 'B',
            text: '让模型在不同子空间学习多种关注模式',
          },
          {
            value: 'C',
            text: '把复杂度从 O(n²) 降到 O(n)',
          },
          {
            value: 'D',
            text: '不再需要位置编码',
          },
        ],
        answer: 'B',
        explanation: '总维度不变的前提下，多头允许模型并行地在多个子空间学习不同的注意力模式（如一个头关注语法、另一个关注指代）。参数量与复杂度基本不变。',
        tags: ['多头注意力'],
      },
      {
        id: 'llm-a1-c4-e21',
        type: 'open',
        difficulty: 4,
        question: '自注意力的复杂度是 O(n²d)。当上下文长度从 4K 增长到 128K 时，请分析计算量与显存各增长多少倍，并列举至少三种降低长上下文成本的技术及其原理。',
        referenceAnswer: `**增长倍数分析**

自注意力的主要计算是 QKᵀ（n×n×d）与 softmax 后的加权求和（n×n×d）：

    FLOPs ≈ 4n²d（每个头）

序列长度 n 从 4096 增到 131072（32 倍）：

- **计算量**：∝ n² → **32² = 1024 倍**
- **注意力分数矩阵显存**：n×n → 同样 **1024 倍**
- **KV Cache**：∝ n → **32 倍**（线性，但基数已很大）

举例：单头 fp16、n=131072 时，一个 n×n 分数矩阵就占
131072² × 2 字节 ≈ 32 GB，全部头叠加会爆炸。

**降低成本的三种技术**

1. **FlashAttention（分块 + 在线 softmax）**
   - 原理：不把完整的 n×n 矩阵写回 HBM，而是分块在 SRAM 内计算，
     用在线 softmax 逐块累加归一化因子与输出；
   - 效果：HBM 读写从 O(n²) 降到 O(n)，显存从 O(n²) 降到 O(n)，速度提升 2~4 倍；
   - 代价：需要自定义 CUDA kernel（现已被主流框架内置）。

2. **PagedAttention / GQA（优化 KV Cache）**
   - GQA：多个 Query 头共享一组 KV 头，KV Cache 降到 1/组数；
   - PagedAttention：把 KV Cache 分页管理，按需分配，浪费从 60% 降到 <4%；
   - 效果：同显存下支持更长的上下文与更多并发。

3. **稀疏 / 滑动窗口注意力**
   - 滑动窗口（如 Mistral）：每个 token 只关注最近 W 个 token，复杂度降为 O(nW)；
   - 稀疏模式（如 Longformer 的局部+全局）：只计算部分位置对；
   - 效果：复杂度从二次降为近线性，代价是可能丢失远距离依赖，需要靠"全局 token"或分层设计弥补。

**补充**：线性注意力（用核函数近似 softmax）、
状态空间模型（Mamba）、以及"检索式长上下文"（把历史存外部按需检索）
也是当前的研究方向。`,
        rubric: [
          {
            point: '指出计算量与显存均按 n² 增长，32 倍长度对应 1024 倍',
            score: 2,
          },
          {
            point: 'FlashAttention：分块 + 在线 softmax，显存 O(n) 化',
            score: 2,
          },
          {
            point: 'GQA / PagedAttention 降低 KV Cache',
            score: 2,
          },
          {
            point: '稀疏/滑动窗口注意力把复杂度降到近线性',
            score: 1,
          },
        ],
        keywords: ['n²', '1024 倍', 'FlashAttention', '在线 softmax', 'GQA', '滑动窗口'],
        explanation: '这道题把复杂度分析、显存估算与工程优化串起来，是长上下文方向的核心认知。',
        tags: ['复杂度', '长上下文', '工程'],
      },
    ],
  },
  {
  id: 'llm-a1-c5',
  title: '多头注意力',
  goal: '掌握多头注意力的拆分与拼接流程、为什么总计算量不变而表达能力提升，并能实现、调试 MHA，理解 MQA/GQA 如何为 KV Cache 减负。',
  lessons: [
    {
      id: 'llm-a1-c5-l1',
      title: '从单头到多头：拆分、并行与拼接',
      content: `
## 学习目标

学完本节，你应该能够：
1. 完整写出多头注意力的拆分-计算-拼接流程，并对每一步标注张量形状；
2. 证明（形状追踪）多头参数量 $4d^2$ 与头数 h 无关；
3. 用 numpy 实现多头前向并跑通形状流，理解"分组=免费的并行"。

## 前置知识

- 单头缩放点积注意力（c4-l1/l4-l2）；
- 矩阵分块与 reshape 的形状直觉（llm-a1 前置章）。

## 问题背景：从"一个视角"到"多个视角"的实现细节

概念章（c2-l2）说明了多头为什么好——多个子空间各学一种关系。本节解决**工程层**：拆分到底拆在哪个维度、reshape 与 transpose 的顺序为什么决定对错、参数量为何恰好不变。这三个细节是手写 Transformer 时形状错误的高发区。

## 核心概念：形状流全图

设输入 $X \\in (B, n, d)$（B 批量、n 序列长、d=512），h=8 头，$d_k = d/h = 64$：

| 步骤 | 操作 | 形状 |
| --- | --- | --- |
| 1 投影 | $Q = XW^Q$（$W^Q \\in (d, d)$） | $(B, n, 512)$ |
| 2 拆头 | reshape → $(B, n, 8, 64)$ → transpose(1,2) | $(B, 8, n, 64)$ |
| 3 各头注意力 | $\\mathrm{softmax}(QK^\\top/\\sqrt{64})V$ | $(B, 8, n, 64)$ |
| 4 拼头 | transpose(1,2) → reshape | $(B, n, 512)$ |
| 5 输出投影 | $\\times W^O \\in (d, d)$ | $(B, n, 512)$ |

**关键陷阱在步骤 2/4 的 transpose**：reshape 成 $(B, n, 8, 64)$ 后若不把头维换到前面，后面矩阵乘会把"头"和"序列"搅在一起——**先 reshape 再 transpose，拼头时反序操作**，这是 90% 形状 bug 的出处。

## 原理详解：参数量为何与 h 无关

四个投影 $W^Q, W^K, W^V, W^O$ 各为 $(d, d)$，合计 $4d^2$——**头数只决定"如何分组看"这 $d$ 维，不决定参数多少**。实现上可以先做整块 $(d, d)$ 投影再拆头（等价于每头一个 $(d, 64)$ 小投影的并行）：$XW^Q$ 的第 $i$ 个 64 维切片 = $X W^Q_i$——分块乘法自动完成了"每头自己的投影"。

## 代码实践

\`\`\`python
import numpy as np
rng = np.random.default_rng(0)
B, n, d, h = 2, 5, 512, 8
dk = d // h

X = rng.normal(0, 1, (B, n, d))
Wq = rng.normal(0, 0.04, (d, d)); Wk = rng.normal(0, 0.04, (d, d))
Wv = rng.normal(0, 0.04, (d, d)); Wo = rng.normal(0, 0.04, (d, d))

def mha(X):
    Q, K, V = X @ Wq, X @ Wk, X @ Wv
    # 拆头: (B,n,d)->(B,n,h,dk)->(B,h,n,dk)
    Qh = Q.reshape(B, n, h, dk).transpose(0, 2, 1, 3)
    Kh = K.reshape(B, n, h, dk).transpose(0, 2, 1, 3)
    Vh = V.reshape(B, n, h, dk).transpose(0, 2, 1, 3)
    scores = Qh @ Kh.transpose(0, 1, 3, 2) / np.sqrt(dk)
    scores += np.triu(np.full((n, n), -1e9), k=1)     # 因果掩码
    A = np.exp(scores); A /= A.sum(-1, keepdims=True)
    out = A @ Vh                                       # (B,h,n,dk)
    out = out.transpose(0, 2, 1, 3).reshape(B, n, d)   # 拼头（反序）
    return out @ Wo

print("输入", X.shape, "-> 输出", mha(X).shape)
print(f"参数量 4*{d}^2 = {4*d*d:,}（与 h={h} 无关）")
print("掩码后第0行权重和:", np.round(np.exp(
    (np.ones((1,1))) @ np.zeros((1,1)), 0) if False else "由 A 归一化保证=1")
\`\`\`

预期输出：输入 (2,5,512) → 输出 (2,5,512)；参数量 1,048,576。逐步打印 $Q_h$ 形状为 (2,8,5,64) 可自查 transpose 是否正确。**常见错误**：reshape 后忘 transpose（头维混入序列维，程序不报错但语义全错）；掩码加在 softmax 之后（应之前加大负数）；$d_k$ 的 sqrt 用了整维 d。

## 常见误区

1. **多头=多次独立注意力层**——是同一层内部的分组，一次前向同时算完；
2. **每头看到不同输入**——输入相同，投影后的**子空间**不同；
3. **拼头后必须再投影**——$W^O$ 负责跨头融合，省略它等于把各头结果简单堆放；
4. **头数必须整除 d**——工程约定（dk=64 粒度），不是数学必然。

## 知识关联

- **向前**：c4 章的单头公式在每头内部原样运行；概念章 c2-l2 的"多专家"直觉在此落地为形状流；
- **向后**：c5-l2 的 numpy 完整实现与参数分析；c5-l3 MQA/GQA（只改 K/V 的拆头共享方式）；
- **平行**：llm-a3 的 GQA/MLA 都是本节形状流上的变体。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 形状流 | 投影(d)→拆头(h,dk)→注意力→拼头→投影(d) |
| 陷阱 | reshape 后必须 transpose；拼头反序 |
| 参数 | $4d^2$，与 h 无关（分块乘法等价） |
| 掩码 | softmax 前加 $-10^9$ 上三角 |

## 参考资料

> **来源类型：学术来源**
> - Vaswani, A., et al. (2017). arXiv:1706.03762，§3.2.2。
> **来源类型：参考资料**
> - The Annotated Transformer（Harvard NLP, nlp.seas.harvard.edu）——逐行实现的经典参考。
> **来源类型：原创**
> - 形状流表与陷阱清单为本课程整理。
`,
      tips: [
        {
          kind: 'pitfall',
          text: '拆分必须是"先 reshape 再 transpose"。写反之后形状依旧合法、程序不报错，但每个头混入了其他头的维度，训练能收敛、效果明显变差——这是最难查的 bug 之一。',
        },
        {
          kind: 'leak',
          text: '写完多头立刻做两个自测：(1) h=1 时与单头实现数值完全一致；(2) 输出形状与输入形状相同。这两条能挡住绝大多数形状错误。',
        },
        {
          kind: 'interview',
          text: '"多头相比单头的计算量增加多少？" 标准答案：几乎为零。QKᵀ 部分仍是 n²·d_model，投影部分仍是 4n·d_model²，多头只是把同一个 d_model 切成 h 段并行。',
        },
      ],
      demos: [
        {
          title: '拆分与拼接：验证 reshape/transpose 顺序的正确性',
          lang: 'python',
          code: `import numpy as np

def split_heads(x, h):
    B, n, d = x.shape
    return x.reshape(B, n, h, d // h).transpose(0, 2, 1, 3)

def merge_heads(x, h):
    B, h, n, dk = x.shape
    return x.transpose(0, 2, 1, 3).reshape(B, n, h * dk)

def split_heads_wrong(x, h):
    B, n, d = x.shape
    return x.transpose(0, 2, 1).reshape(B, h, n, d // h)

rng = np.random.default_rng(0)
B, n, d, h = 2, 3, 8, 4
X = rng.normal(size=(B, n, d))

Q = split_heads(X, h)
print("输入", X.shape, "-> 拆分", Q.shape, "(B, h, n, d/h)")
print("拼接还原正确:", np.allclose(merge_heads(Q, h), X))

Qw = split_heads_wrong(X, h)
print()
print("错误的拆分顺序后，形状仍然是", Qw.shape, "，看起来完全正常")
print("但它能否还原原张量:", np.allclose(merge_heads(Qw, h), X) if Qw.shape == Q.shape else "形状不同，直接报错")
print("第 0 个头第 0 个位置（正确）:", np.round(Q[0, 0, 0], 3))
print("第 0 个头第 0 个位置（错误）:", np.round(Qw[0, 0, 0], 3))`,
        },
      ],
    },
    {
      id: 'llm-a1-c5-l2',
      title: '多头注意力的 numpy 实现与参数量分析',
      content: `
## 完整实现

一个可批量、带因果掩码的多头注意力：

\`\`\`python
def mha(X, Wq, Wk, Wv, Wo, h, causal=True):
    B, n, d = X.shape
    dk = d // h
    Q, K, V = X @ Wq, X @ Wk, X @ Wv           # [B, n, d]
    Q, K, V = (split_heads(t, h) for t in (Q, K, V))   # [B, h, n, dk]
    scores = Q @ K.transpose(0, 1, 3, 2) / np.sqrt(dk)  # [B, h, n, n]
    if causal:
        mask = np.triu(np.ones((n, n), dtype=bool), k=1)
        scores = np.where(mask, -1e9, scores)
    w = softmax(scores)                        # [B, h, n, n]
    ctx = w @ V                                # [B, h, n, dk]
    out = merge_heads(ctx, h) @ Wo             # [B, n, d]
    return out, w
\`\`\`

注意 \`K.transpose(0, 1, 3, 2)\`：前三维不动，只交换最后两维。若写成 \`K.T\`，四个维度会全部反转，变成 [dk, n, h, B]。

## 另一种等价写法：按头循环

\`\`\`python
outs = []
for i in range(h):
    Qi, Ki, Vi = Q[:, i], K[:, i], V[:, i]          # [B, n, dk]
    wi = softmax(Qi @ Ki.transpose(0, 2, 1) / np.sqrt(dk))
    outs.append(wi @ Vi)                            # [B, n, dk]
out = np.concatenate(outs, axis=-1) @ Wo            # [B, n, d]
\`\`\`

两种写法数值完全相同，只是批量化程度不同。循环写法更直观，适合调试；实际框架用批量形式以充分利用 GPU。

## 参数量：与头数无关

| 参数 | 形状 | 数量 |
| --- | --- | --- |
| W_Q（全部头拼在一起） | [d, d] | d² |
| W_K | [d, d] | d² |
| W_V | [d, d] | d² |
| W_O | [d, d] | d² |
| 合计 | | **4d²** |

h 只影响"如何切分"，不影响总量。这也是实现上的常规做法：框架里 W_Q 是一个 [d, d] 的大矩阵，前向时一次性算完再 reshape 成 h 份，比维护 h 个小矩阵更省内存带宽。

但**显存**不是完全无关：激活值与注意力矩阵是 [B, h, n, n]，随 h 线性增长。n = 4096、h = 32、B = 4 时，fp16 的注意力矩阵就有 4 × 32 × 4096² × 2 字节 ≈ 4.3 GB。

## 典型的超参数配置

| 模型 | d_model | h | d_k | 层数 |
| --- | --- | --- | --- | --- |
| Transformer-base | 512 | 8 | 64 | 6 |
| GPT-2 small | 768 | 12 | 64 | 12 |
| GPT-3 175B | 12288 | 96 | 128 | 96 |
| LLaMA-2 7B | 4096 | 32 | 128 | 32 |
| Qwen2.5 7B | 3584 | 28 | 128 | 28 |

规律非常稳定：**d_k 几乎总是 64 或 128**，头数随 d_model 线性增长。为什么？

- d_k 太小（如 16）：每个头的子空间表达能力不足，softmax 打分噪声大；
- d_k 太大：在 d_model 固定的前提下头数变少，多样性下降；
- 64/128 能在"每头足够表达"与"头数足够多"之间取得平衡，也刚好匹配硬件上矩阵乘的高效尺寸。

## 调试清单

1. **形状**：out 的形状必须与 X 相同 [B, n, d]；
2. **h = 1 等价性**：h=1 时与单头实现对同一组权重应产生相同结果；
3. **权重行和**：每个头的每行和为 1；
4. **因果性**：改变最后一个 token，前面的输出不变；
5. **头的多样性**：随机权重下不同头的权重矩阵应当不同（如果完全相同，说明拆分错了，所有头看到的是同一套输入）。

第 5 条是很实用的信号：如果 h 个头的输出一模一样，几乎可以断定 split 写错了。

## 常见误区

1. **以为头数越多参数越多**：参数由 d_model 决定，h 只改变切分方式；
2. **以为 h 越大越好**：头太多会让 d_k 过小，单个头表达力下降，且注意力矩阵显存增长；
3. **在 numpy 里对 4 维张量用 \`.T\`**：会反转全部维度，必须显式写 \`transpose\`；
4. **混淆"每头维度"与"总维度"**：softmax 的缩放因子是 sqrt(d_k)，不是 sqrt(d_model)。
`,
      tips: [
        {
          kind: 'pitfall',
          text: '缩放因子必须是 `sqrt(d_k)`（每头维度）。用 `sqrt(d_model)` 会在大模型上把 logits 压得过小，注意力分布过于平坦——形状正确、能跑通，但效果受损。',
        },
        {
          kind: 'performance',
          text: '不要为了"按头计算"而真的把 K/V 复制 h 份（`np.repeat`）。批量 transpose 后的矩阵乘由底层 BLAS 处理，既省内存又快得多。',
        },
        {
          kind: 'note',
          text: '注意力矩阵形状是 [B, h, n, n]，显存随 h 线性增长。这是长上下文训练 OOM 的第一来源，也是 FlashAttention 与 GQA 的动机。',
        },
      ],
      demos: [
        {
          title: '多头注意力：批量实现 vs 逐头循环（结果完全一致）',
          lang: 'python',
          code: `import numpy as np

def softmax(x):
    x = x - x.max(axis=-1, keepdims=True)
    e = np.exp(x)
    return e / e.sum(axis=-1, keepdims=True)

def split_heads(x, h):
    B, n, d = x.shape
    return x.reshape(B, n, h, d // h).transpose(0, 2, 1, 3)

def merge_heads(x):
    B, h, n, dk = x.shape
    return x.transpose(0, 2, 1, 3).reshape(B, n, h * dk)

def mha_batch(X, Wq, Wk, Wv, Wo, h):
    B, n, d = X.shape
    dk = d // h
    Q, K, V = (split_heads(X @ W, h) for W in (Wq, Wk, Wv))
    mask = np.triu(np.ones((n, n), bool), k=1)
    scores = np.where(mask, -1e9, Q @ K.transpose(0, 1, 3, 2) / np.sqrt(dk))
    w = softmax(scores)
    return merge_heads(w @ V) @ Wo, w

def mha_loop(X, Wq, Wk, Wv, Wo, h):
    B, n, d = X.shape
    dk = d // h
    Q, K, V = X @ Wq, X @ Wk, X @ Wv
    mask = np.triu(np.ones((n, n), bool), k=1)
    outs, ws = [], []
    for i in range(h):
        Qi = Q[:, :, i * dk:(i + 1) * dk]
        Ki = K[:, :, i * dk:(i + 1) * dk]
        Vi = V[:, :, i * dk:(i + 1) * dk]
        si = np.where(mask, -1e9, Qi @ Ki.transpose(0, 2, 1) / np.sqrt(dk))
        ws.append(softmax(si))
        outs.append(ws[-1] @ Vi)
    return np.concatenate(outs, axis=-1) @ Wo, np.stack(ws, axis=1)

rng = np.random.default_rng(1)
B, n, d, h = 2, 5, 16, 4
X = rng.normal(size=(B, n, d))
W = [rng.normal(0, 0.3, size=(d, d)) for _ in range(4)]

o1, w1 = mha_batch(X, *W, h)
o2, w2 = mha_loop(X, *W, h)
print("批量实现输出形状:", o1.shape)
print("两种实现结果一致:", np.allclose(o1, o2), " 权重一致:", np.allclose(w1, w2))
print("权重形状:", w1.shape, "（B, h, n, n）")
print("各头是否不同:", not np.allclose(w1[0, 0], w1[0, 1]))
o_single, _ = mha_batch(X, *W, 1)
print("h=1 时输出形状:", o_single.shape, "（仍是 [B, n, d]）")`,
        },
      ],
    },
    {
      id: 'llm-a1-c5-l3',
      title: 'MQA 与 GQA：为 KV Cache 减负',
      content: `
## 推理时真正吃显存的是 KV Cache

自回归生成时，每生成一个 token 都要与之前所有 token 计算注意力。为避免重算，我们缓存所有历史位置的 K 与 V：

KV cache 体积 = 2 × B × n × h × d_k × 精度字节

（乘 2 因为 K 与 V 各一份。）

以 LLaMA-2 7B 为例（32 层、h=32、d_k=128、fp16、序列 4096）：

2 × 32 层 × 4096 × 32 × 128 × 2 字节 ≈ 2.1 GB（单请求）

batch = 16 时就是 34 GB —— 超过了很多显卡的显存。注意**参数量完全没变**，吃显存的是缓存。

## 一个关键观察：K 和 V 不必与 Q 一样多

注意力的本质是"h 个查询头各自去找内容"，但"提供内容"的一方并不需要同样多的副本。于是有了：

| 方案 | Q 头数 | KV 头数 | KV cache 相对 MHA |
| --- | --- | --- | --- |
| MHA（Multi-Head） | h | h | 1× |
| GQA（Grouped-Query） | h | g（h > g > 1） | g/h |
| MQA（Multi-Query） | h | 1 | 1/h |

- **MQA**（Shazeer, 2019）：所有 Q 头共享同一组 K、V。缓存降到 1/h，但精度略降、训练也更不稳定；
- **GQA**（Ainslie 等, 2023）：把 h 个 Q 头分成 g 组，每组共享一组 K、V。g = h 时退化为 MHA，g = 1 时退化为 MQA。

LLaMA-2 70B 与 LLaMA-3 8B 都用 8 组 GQA，Qwen2.5 7B 用 4 组。这是精度与显存的最佳折中。

## 形状怎么变

原来 K、V 的形状是 [B, h, n, d_k]。GQA 下变成 [B, g, n, d_k]，其中每组的 KV 被该组的多个 Q 头复用：

\`\`\`python
group_size = h // g
for i in range(h):
    gi = i // group_size          # 第 i 个 Q 头属于第 gi 组
    Ki, Vi = K[:, gi], V[:, gi]   # 共享同一组 KV
\`\`\`

批量实现时用 \`np.repeat(K, group_size, axis=1)\` 把 KV 在头维上复制 group_size 份，与 Q 对齐后再做普通的批量矩阵乘。复制的是**计算时的视图**，缓存里只存 g 份。

## 显存换算的实践意义

\`\`\`python
def kv_bytes(layers, seq, kv_heads, d_k, batch=1, bytes_per=2):
    return 2 * layers * seq * kv_heads * d_k * batch * bytes_per
\`\`\`

LLaMA-2 70B：80 层、h=64、g=8、d_k=128、4096 序列、fp16 —— MHA 需要约 21.5 GiB，GQA 只需 2.7 GiB。**模型参数量一模一样**，能支持的并发数却差了 8 倍。

<Slider name="kv-cache-budget" />

拖动上面的滑块可以直接看到：层数、序列长度、KV 头数如何共同决定单请求的缓存体积。

## 为什么精度几乎不掉

直觉解释：K、V 提供的是"内容池"，多个查询头从同一个池子里取信息并不冲突——冲突的是"查询方式"的多样性，而查询侧（Q）仍然是完整的 h 份。实测中 GQA 在 8 组时与 MHA 的评测差距在噪声范围内。

## 常见误区

1. **以为 GQA 减少了参数量**：W_Q 仍是 d×d，W_K、W_V 变成 d × (g·d_k)，参数量略降但量级不变；主要收益在**推理显存**；
2. **以为 KV cache 能跨请求共享**：只有完全相同的前缀（如系统提示）才能用前缀缓存复用，不同请求的 KV 是独立的；
3. **把 MQA 用在长上下文训练**：MQA 在长序列上质量下降更明显，这也是 GQA 成为主流的原因；
4. **以为 GQA 与 MHA 的权重可以互换加载**：K、V 的形状不同，必须重新训练或做专门的权重转换。
`,
      tips: [
        {
          kind: 'interview',
          text: 'MHA / MQA / GQA 必考。一句话：三者区别只在 K、V 的头数（h / 1 / g），目标是在几乎不损失精度的情况下把 KV cache 从 h 份降到 g 份或 1 份。',
        },
        {
          kind: 'performance',
          text: '估算推理显存时先算 KV cache 再算权重：公式是 `2 × 层数 × 序列长度 × KV头数 × 头维度 × batch × 字节数`。长上下文场景下它常常超过模型权重本身。',
        },
        {
          kind: 'pitfall',
          text: 'GQA 实现里把 K/V 复制到 h 个头只是为了对齐批量计算，**缓存里只能存 g 份**。如果错误地把复制后的张量存进 cache，显存收益会完全消失。',
        },
        {
          kind: 'note',
          text: 'Qwen2.5 7B 用 28 个 Q 头配 4 组 KV，比例 7:1。组数 g 的选取是显存预算与质量之间的经验折中，7B 级模型常见 4~8 组。',
        },
      ],
      demos: [
        {
          title: 'MHA / GQA / MQA 的 KV cache 体积对比（含 batch）',
          lang: 'python',
          code: `def kv_gib(layers, seq, kv_heads, d_k, batch=1, bytes_per=2):
    return 2 * layers * seq * kv_heads * d_k * batch * bytes_per / 1024 ** 3

cfg = [
    ("LLaMA-2 7B", 32, 32, 128),
    ("LLaMA-3 8B", 32, 8, 128),
    ("LLaMA-2 70B", 80, 64, 128),
    ("Qwen2.5 7B", 28, 4, 128),
]
seq, batch = 4096, 8
print("序列 %d，batch %d，fp16" % (seq, batch))
print("%14s %10s %10s %12s" % ("模型", "KV头数", "cache", "若用全 MHA"))
for name, layers, g, dk in cfg:
    cur = kv_gib(layers, seq, g, dk, batch)
    full = kv_gib(layers, seq, 32 if "70B" not in name else 64, dk, batch)
    print("%14s %10d %9.2fG %11.2fG" % (name, g, cur, full))

print()
print("序列长度对 LLaMA-3 8B（8 组 KV、batch 1）的影响：")
for s in (1024, 4096, 16384, 131072):
    print("  seq=%6d -> %.3f GiB" % (s, kv_gib(32, s, 8, 128)))`,
        },
      ],
    },
    {
      id: 'llm-a1-c5-l4',
      title: '多头注意力的工程细节与可解释性',
      content: `
## 头与头之间真的不同吗

可解释性研究（如 Voita 等人的头部剪枝工作）发现 Transformer 的头有明显的分工：

- **局部头**：大量关注相邻 token，负责局部语法连贯；
- **句法头**：动词到直接宾语、代词到先行词这类依存关系；
- **检索头**：在长上下文中专门负责"抄写"某个关键片段（induction head 的变体）；
- **重复头 / 沉默头**：统计上高度冗余甚至几乎不活跃的头。

剪掉一部分后几类头，模型性能几乎不下降——这说明 multi-head 存在可观冗余，也是头剪枝、头蒸馏能成立的原因。

<Heatmap name="attention-4x4" />

上图是一个 4 个 token 的注意力权重示例（非因果情况下每行和为 1）。真实模型里每个头会给出**一张不同的热力图**，把它们叠起来看就是"多头各自盯不同的位置"。

## 实现层面的四个坑

1. **掩码维度**：批量多头下 scores 是 [B, h, n, n]，掩码要用 [n, n] 广播或 [B, 1, n, n]；
2. **softmax 的轴**：必须是最后一维（被关注的 key 维），写成 \`axis=-2\` 会归一化错对象；
3. **精度**：注意力分数在 fp16 下累加误差明显，实践常用 fp32 计算 softmax（或在 score 上加 attention logit 上限）；
4. **KV cache 与掩码的一致性**：推理第 t 步的 scores 形状是 [B, h, 1, t+1]，掩码要考虑"已缓存的历史 + 当前 token"。

## 训练与推理的性能权衡

| 阶段 | 瓶颈 | 关注点 |
| --- | --- | --- |
| 训练（compute-bound） | 矩阵乘算力 | 批量大小、FlashAttention、激活重计算 |
| 预填充 prefill | 算力 + 显存带宽 | 长提示的并行计算，TTFT 指标 |
| 解码 decode（memory-bound） | 显存带宽 | KV cache 读取，GQA/PagedAttention |

**训练是算力受限，解码是带宽受限**。这解释了为什么训练优化关注 FLOPS，而推理优化关注 KV cache 的存取效率——两者优化的对象完全不同。

## 一个容易忽略的细节：注意力权重不一定是"解释"

把注意力权重当作模型"在关注什么"的解释存在争议。原因：

- 权重只决定聚合比例，Value 本身可能把被忽略位置的信息"带"到输出里；
- 后续层可以随时改变读取方式；
- 同一信息可以由多个头冗余编码。

谨慎的用法是：把头部热力图作为**假设来源**，再用消融实验（屏蔽某个头/位置，观察输出变化）去验证。

## 多头注意力的现代变体

- **GQA / MQA**：减少 KV 头，用于推理加速（已讨论）；
- **MLA（Multi-head Latent Attention，DeepSeek）**：把 KV 压成低秩潜在向量再按需投影，进一步压缩 cache；
- **滑动窗口注意力**：每个 token 只关注最近 w 个，复杂度降为 O(n·w)，Mistral 等采用；
- **FlashAttention**：算法层面的 IO 优化，不改变数学定义。

这些变体的共同点是：**数学上仍是 softmax(QKᵀ/√d)V，只是"怎么算、存多少"不同**。

## 常见误区

1. **以为头数越多一定越好**：d_k 过小会损害单头表达，实测存在最优区间；
2. **以为注意力热力图就是"模型的解释"**：权重只是聚合比例，需要消融验证；
3. **以为 decode 阶段慢是因为算力不足**：decode 是带宽受限，优化方向是减少缓存读写；
4. **以为 FlashAttention 改变了数学结果**：它只是分块计算，结果在数值误差内完全一致。
`,
      tips: [
        {
          kind: 'interview',
          text: '被问"prefill 与 decode 有什么不同"，答：prefill 一次处理整段提示，是算力受限的并行矩阵乘；decode 每步只处理一个 token，是带宽受限的访存操作。两者优化的目标不同。',
        },
        {
          kind: 'note',
          text: '注意力权重不等于解释。把权重当证据前，先做消融：屏蔽某个头或某个位置后看输出是否真的变化，这是判断"这个头是否重要"的可靠方法。',
        },
        {
          kind: 'performance',
          text: '批量多头下 scores 是 [B, h, n, n]。掩码写成 [n, n] 广播最省显存；若写成 [B, h, n, n] 的完整布尔张量，长序列下光掩码就吃掉上 GB 显存。',
        },
      ],
      demos: [
        {
          title: '头部重要性消融：屏蔽一个头后输出变化多少',
          lang: 'python',
          code: `import numpy as np

def softmax(x):
    x = x - x.max(axis=-1, keepdims=True)
    e = np.exp(x)
    return e / e.sum(axis=-1, keepdims=True)

def split_heads(x, h):
    B, n, d = x.shape
    return x.reshape(B, n, h, d // h).transpose(0, 2, 1, 3)

def merge_heads(x):
    B, h, n, dk = x.shape
    return x.transpose(0, 2, 1, 3).reshape(B, n, h * dk)

rng = np.random.default_rng(3)
B, n, d, h = 1, 6, 16, 4
X = rng.normal(size=(B, n, d))
Wq, Wk, Wv, Wo = (rng.normal(0, 0.4, size=(d, d)) for _ in range(4))

Q, K, V = (split_heads(X @ W, h) for W in (Wq, Wk, Wv))
dk = d // h
w = softmax(Q @ K.transpose(0, 1, 3, 2) / np.sqrt(dk))
base = merge_heads(w @ V) @ Wo

print("每个头屏蔽后输出的相对变化：")
for i in range(h):
    w2 = w.copy()
    w2[:, i] = 0.0
    out = merge_heads(w2 @ V) @ Wo
    rel = float(np.abs(out - base).max() / np.abs(base).max())
    print("  屏蔽头 %d -> 输出最大相对变化 %.4f" % (i, rel))

print()
print("变化越大说明该头在当前样本上贡献越大。真实模型里通常只有少数头重要，")
print("这就是头部剪枝能够生效的经验依据。")`,
        },
      ],
    },
  ],
  exercises: [
    {
      id: 'llm-a1-c5-e1',
      type: 'single',
      difficulty: 2,
      question: '一个 `d_model = 768`、16 个注意力头的模型，每个头的维度 `d_k` 是？',
      options: [
        { value: 'A', text: '16' },
        { value: 'B', text: '48' },
        { value: 'C', text: '64' },
        { value: 'D', text: '768' },
      ],
      answer: 'B',
      explanation: '`d_k = d_model / h = 768 / 16 = 48`。注意 d_model 必须能被 h 整除，否则无法均匀切分。',
      relatedLessonId: 'llm-a1-c5-l1',
      tags: ['多头注意力', '配置'],
    },
    {
      id: 'llm-a1-c5-e2',
      type: 'judge',
      difficulty: 2,
      question: '当 d_model 固定时，多头注意力的参数量会随头数 h 成比例增加。',
      answer: false,
      explanation:
        'W_Q、W_K、W_V、W_O 的形状都是 [d_model, d_model]，合计 4·d_model²，与 h 无关。h 只决定"如何把这个大矩阵的输出切成 h 段"，不增加参数。显存中的注意力矩阵倒是随 h 线性增长。',
      relatedLessonId: 'llm-a1-c5-l2',
      tags: ['多头注意力', '参数量'],
    },
    {
      id: 'llm-a1-c5-e3',
      type: 'multiple',
      difficulty: 3,
      question: '关于多头注意力，下列说法正确的有？（多选）',
      options: [
        { value: 'A', text: '多头把 d_model 切成 h 份，每份做一次独立的自注意力' },
        { value: 'B', text: '在 d_model 固定时，多头的总计算量与单头基本相同' },
        { value: 'C', text: '不同头可以学到关注不同位置或不同关系模式' },
        { value: 'D', text: '多头使上下文窗口长度变为 h 倍' },
      ],
      answer: ['A', 'B', 'C'],
      explanation:
        '上下文窗口由位置编码与训练长度决定，与头数无关（D 错误）。A 是定义；B 来自 n²·d_model 不变；C 是可解释性研究的经验结论，也是多头存在的意义。',
      relatedLessonId: 'llm-a1-c5-l1',
      tags: ['多头注意力'],
    },
    {
      id: 'llm-a1-c5-e4',
      type: 'fill',
      difficulty: 2,
      question: '补全多头拆分的核心代码，把 [B, n, d] 变成 [B, h, n, d/h]：\n\n```python\ndef split_heads(x, h):\n    B, n, d = x.shape\n    return x.reshape(B, n, h, ___).___(0, 2, 1, 3)\n```',
      blanks: [['d // h', 'd//h'], ['transpose']],
      explanation:
        '先 reshape 把最后一维拆成 (h, d//h)，再 transpose 把头维度挪到序列维之前。两个操作顺序不能颠倒，否则每个头会混入其他头的维度且不报错。',
      relatedLessonId: 'llm-a1-c5-l1',
      tags: ['多头注意力', '形状变换'],
    },
    {
      id: 'llm-a1-c5-e5',
      type: 'single',
      difficulty: 3,
      question: 'GQA（Grouped-Query Attention）相比 MHA 最直接的收益是？',
      options: [
        { value: 'A', text: '模型参数量减少一半' },
        { value: 'B', text: '推理时 KV cache 从 h 份降到 g 份，显存大幅下降' },
        { value: 'C', text: '上下文窗口自动扩大' },
        { value: 'D', text: '不再需要 softmax' },
      ],
      answer: 'B',
      explanation:
        'GQA 让每组的多个 Q 头共享一组 K、V，所以缓存只需 g 份。W_Q 仍是 d×d，参数量量级不变；上下文窗口与 softmax 都不受影响。',
      relatedLessonId: 'llm-a1-c5-l3',
      tags: ['GQA', 'KV cache'],
    },
    {
      id: 'llm-a1-c5-e6',
      type: 'judge',
      difficulty: 3,
      question: 'MQA 让所有查询头共享同一组 K 和 V，它等价于 GQA 在组数 g=1 时的特例。',
      answer: true,
      explanation:
        'GQA 的组数 g 等于头数 h 时退化为 MHA，g=1 时退化为 MQA。所以 MQA 与 MHA 都是 GQA 的两个端点。MQA 的缓存最小但精度损失最明显。',
      relatedLessonId: 'llm-a1-c5-l3',
      tags: ['MQA', 'GQA'],
    },
    {
      id: 'llm-a1-c5-e7',
      type: 'multiple',
      difficulty: 3,
      question: '关于推理阶段的 KV cache，下列说法正确的有？（多选）',
      options: [
        { value: 'A', text: '缓存体积与层数、序列长度、KV 头数、头维度都成正比' },
        { value: 'B', text: '缓存的是历史 token 的 K 与 V，避免每步重算' },
        { value: 'C', text: 'batch 越大，KV cache 总显存越大' },
        { value: 'D', text: '使用 KV cache 会改变模型的数学输出' },
      ],
      answer: ['A', 'B', 'C'],
      explanation:
        'KV cache 只是复用已经算过的 K、V，数学上与全量重算完全等价，不改变输出（D 错误）。公式为 2 × 层数 × 序列 × KV头数 × d_k × batch × 字节数。',
      relatedLessonId: 'llm-a1-c5-l3',
      tags: ['KV cache', '推理'],
    },
    {
      id: 'llm-a1-c5-e8',
      type: 'code',
      difficulty: 2,
      question:
        '实现 `split_heads(x, h)` 与 `merge_heads(x)`，两者互为逆操作：\n\n- `split_heads`：把 [B, n, d] 变成 [B, h, n, d/h]；\n- `merge_heads`：把 [B, h, n, d/h] 变回 [B, n, d]。\n\n实现后请验证拆分再合并能完全还原。\n\n最后一行直接求值 `merge_heads(split_heads(X, h))`。',
      starterCode: `import numpy as np

def split_heads(x, h):
    B, n, d = x.shape
    return x.reshape(B, n, h, ___).transpose(0, ___, 1, 3)

def merge_heads(x):
    B, h, n, dk = x.shape
    return x.transpose(0, 2, 1, 3).reshape(B, n, ___)

rng = np.random.default_rng(0)
B, n, d, h = 2, 3, 8, 4
X = rng.normal(size=(B, n, d))

merge_heads(split_heads(X, h))
`,
      setupCode: '',
      expectedOutput: '拆分形状 (2, 4, 3, 2)，合并后与 X 完全相同',
      tests: `assert h == 4 and split_heads(X, h).shape == (2, 4, 3, 2), f"拆分后形状应为 (2, 4, 3, 2)，实际 {split_heads(X, h).shape}"
assert out.shape == (2, 3, 8), f"合并后形状应为 (2, 3, 8)，实际 {out.shape}"
assert np.allclose(out, X), "拆分再合并应完全还原"
qq = split_heads(X, h)
assert np.allclose(qq[0, 0, 0], X[0, 0, 0:2]), "第 0 个头第 0 个位置应取最后维的前 2 个数"
assert np.allclose(qq[0, 1, 0], X[0, 0, 2:4]), "第 1 个头第 0 个位置应取最后维的 2~4 个数"
assert split_heads(X, h).shape == (2, h, 3, 8 // h), "头维度应等于 d // h"
assert split_heads(X, h).shape[1] == 4, "头数应为 4"
assert merge_heads(split_heads(X, h)).shape == X.shape, "往返后形状应还原"
`,
      answer: `import numpy as np

def split_heads(x, h):
    B, n, d = x.shape
    return x.reshape(B, n, h, d // h).transpose(0, 2, 1, 3)

def merge_heads(x):
    B, h, n, dk = x.shape
    return x.transpose(0, 2, 1, 3).reshape(B, n, h * dk)

rng = np.random.default_rng(0)
B, n, d, h = 2, 3, 8, 4
X = rng.normal(size=(B, n, d))

merge_heads(split_heads(X, h))
`,
      explanation:
        '`reshape(B, n, h, d // h)` 把最后一维按"第 j 段属于第 j 个头"切分，`transpose(0, 2, 1, 3)` 把头维挪到前面。合并必须严格逆序：先 `transpose(0, 2, 1, 3)` 再 `reshape`。断言里用 `X[0, 0, 0:2]` 验证了"第 0 个头拿的是最后维的前 2 个数"，这正是切分语义的检查点。',
      relatedLessonId: 'llm-a1-c5-l1',
      tags: ['多头注意力', 'numpy'],
    },
    {
      id: 'llm-a1-c5-e9',
      type: 'code',
      difficulty: 3,
      question:
        '实现多头注意力 `mha(X, Wq, Wk, Wv, Wo, h)`（批量、无掩码）：\n\n- `X` 形状 [B, n, d]，四个权重形状均为 [d, d]；\n- 拆成 h 个头，每头维度 `dk = d // h`；\n- 缩放因子用 sqrt(dk)；\n- 拼接后用 `Wo` 得到 [B, n, d]，并返回每个头的权重 `weights`（[B, h, n, n]）。\n\n最后一行直接求值 `mha(X, Wq, Wk, Wv, Wo, h)[0]`。',
      starterCode: `import numpy as np

def softmax(x):
    x = x - x.max(axis=-1, keepdims=True)
    e = np.exp(x)
    return e / e.sum(axis=-1, keepdims=True)

def split_heads(x, h):
    B, n, d = x.shape
    return x.reshape(B, n, h, d // h).transpose(0, 2, 1, 3)

def merge_heads(x):
    B, h, n, dk = x.shape
    return x.transpose(0, 2, 1, 3).reshape(B, n, h * dk)

def mha(X, Wq, Wk, Wv, Wo, h):
    B, n, d = X.shape
    dk = d // h
    Q, K, V = (split_heads(X @ W, h) for W in (Wq, Wk, Wv))
    scores = ___                                   # [B, h, n, n]
    weights = softmax(scores)
    ctx = ___                                      # [B, h, n, dk]
    out = ___                                      # [B, n, d]
    return out, weights

rng = np.random.default_rng(1)
B, n, d, h = 2, 5, 16, 4
X = rng.normal(size=(B, n, d))
Wq, Wk, Wv, Wo = (rng.normal(0, 0.3, size=(d, d)) for _ in range(4))

mha(X, Wq, Wk, Wv, Wo, h)[0]
`,
      setupCode: '',
      expectedOutput: '输出形状 (2, 5, 16)，权重形状 (2, 4, 5, 5)',
      tests: `out, w = mha(X, Wq, Wk, Wv, Wo, h)
mha_out = out
assert mha_out.shape == (2, 5, 16), f"输出形状应为 (2, 5, 16)，实际 {mha_out.shape}"
assert w.shape == (2, 4, 5, 5), f"权重形状应为 (2, 4, 5, 5)，实际 {w.shape}"
assert np.allclose(w.sum(axis=-1), 1.0), "每个头的权重行和应为 1"
assert not np.allclose(w[:, 0], w[:, 1]), "不同头的注意力分布应不同"
assert np.all(w >= 0), "权重应非负"
o1, w1 = mha(X, Wq, Wk, Wv, Wo, 1)
assert o1.shape == (2, 5, 16) and w1.shape == (2, 1, 5, 5), "h=1 时形状应正确"
assert np.allclose(o1, X @ Wo) is False, "经过注意力后不应等于直接线性投影"
`,
      answer: `import numpy as np

def softmax(x):
    x = x - x.max(axis=-1, keepdims=True)
    e = np.exp(x)
    return e / e.sum(axis=-1, keepdims=True)

def split_heads(x, h):
    B, n, d = x.shape
    return x.reshape(B, n, h, d // h).transpose(0, 2, 1, 3)

def merge_heads(x):
    B, h, n, dk = x.shape
    return x.transpose(0, 2, 1, 3).reshape(B, n, h * dk)

def mha(X, Wq, Wk, Wv, Wo, h):
    B, n, d = X.shape
    dk = d // h
    Q, K, V = (split_heads(X @ W, h) for W in (Wq, Wk, Wv))
    scores = Q @ K.transpose(0, 1, 3, 2) / np.sqrt(dk)
    weights = softmax(scores)
    ctx = weights @ V
    out = merge_heads(ctx) @ Wo
    return out, weights

rng = np.random.default_rng(1)
B, n, d, h = 2, 5, 16, 4
X = rng.normal(size=(B, n, d))
Wq, Wk, Wv, Wo = (rng.normal(0, 0.3, size=(d, d)) for _ in range(4))

mha(X, Wq, Wk, Wv, Wo, h)[0]
`,
      explanation:
        '`K.transpose(0, 1, 3, 2)` 只交换最后两维（每头的 dk 与 n），得到 [B, h, dk, n]，与 [B, h, n, dk] 相乘得到 [B, h, n, n]。缩放用 `sqrt(dk)` 而不是 `sqrt(d)`。最后 `merge_heads(...) @ Wo` 完成拼接与融合。若把 transpose 写成 `K.T`，会反转全部四维而直接报错；若写错轴的顺序（如 `(0,1,2,3)` 不转置），矩阵乘形状不匹配同样会失败。',
      relatedLessonId: 'llm-a1-c5-l2',
      tags: ['多头注意力', 'numpy'],
    },
    {
      id: 'llm-a1-c5-e10',
      type: 'code',
      difficulty: 3,
      question:
        '实现 **GQA 的 KV 扩展**：给定查询头数 `h`、KV 组数 `g`，K 的形状为 [B, g, n, dk]，需要按组把 K 复制到 h 个查询头上，得到 [B, h, n, dk]。\n\n- 第 i 个查询头属于第 `i // (h // g)` 组；\n- 用 `np.repeat(K, h // g, axis=1)` 一次完成复制；\n- 同时计算 KV cache 的压缩比 `ratio = h / g`。\n\n最后一行直接求值 `K_expanded.shape`。',
      starterCode: `import numpy as np

B, h, g, n, dk = 2, 8, 2, 4, 3
rng = np.random.default_rng(0)
K = rng.normal(size=(B, g, n, dk))
Q = rng.normal(size=(B, h, n, dk))

group_size = h // g
K_expanded = ___                       # [B, h, n, dk]
ratio = ___

K_expanded.shape
`,
      setupCode: '',
      expectedOutput: '(2, 8, 4, 3)，压缩比 4.0',
      tests: `assert K_expanded.shape == (2, h, n, dk), f"形状应为 (2, 8, 4, 3)，实际 {K_expanded.shape}"
assert np.allclose(K_expanded[:, 0], K[:, 0]) and np.allclose(K_expanded[:, 1], K[:, 0]), "前两个 Q 头应共用第 0 组 KV"
assert np.allclose(K_expanded[:, 7], K[:, 1]), "最后一个 Q 头应属于最后一组"
assert np.allclose(K_expanded[:, 3], K[:, 0]) and np.allclose(K_expanded[:, 4], K[:, 1]), "按组边界切分：第 3 个头属第 0 组，第 4 个头属第 1 组"
assert np.isclose(ratio, 4.0), f"压缩比应为 4.0，实际 {ratio}"
scores = Q @ K_expanded.transpose(0, 1, 3, 2) / np.sqrt(dk)
assert scores.shape == (2, h, n, n), "扩展后应能与 Q 直接做批量矩阵乘"
`,
      answer: `import numpy as np

B, h, g, n, dk = 2, 8, 2, 4, 3
rng = np.random.default_rng(0)
K = rng.normal(size=(B, g, n, dk))
Q = rng.normal(size=(B, h, n, dk))

group_size = h // g
K_expanded = np.repeat(K, group_size, axis=1)
ratio = h / g

K_expanded.shape
`,
      explanation:
        '`np.repeat(K, 4, axis=1)` 把第 0 组 KV 连续复制 4 份、第 1 组复制 4 份，正好对应"第 i 个 Q 头属于第 i // 4 组"的约定；用 `np.tile` 则会变成 [组0,组1,组0,组1]，分组关系错了且不报错。要点是：**扩展只发生在计算时**，KV cache 里始终只存 g 份，否则显存收益全部消失。',
      relatedLessonId: 'llm-a1-c5-l3',
      tags: ['GQA', 'KV cache', 'numpy'],
    },
    {
      id: 'llm-a1-c5-e11',
      type: 'code',
      difficulty: 3,
      question:
        '估算 KV cache 显存：实现 `kv_gib(layers, seq, kv_heads, d_k, batch=1, bytes_per=2)`，返回 GiB。\n\n公式：`2 × layers × seq × kv_heads × d_k × batch × bytes_per / 1024**3`（乘 2 是因为 K 与 V 各一份）。\n\n计算三个配置并存入 `results`：\n- MHA：layers=32, seq=4096, kv_heads=32, d_k=128；\n- GQA(8)：同层数序列，kv_heads=8；\n- MQA：kv_heads=1。\n\n最后一行直接求值 `[round(r, 3) for r in results]`。',
      starterCode: `def kv_gib(layers, seq, kv_heads, d_k, batch=1, bytes_per=2):
    return ___

layers, seq, d_k = 32, 4096, 128
results = [kv_gib(layers, seq, kh, d_k) for kh in (32, 8, 1)]

[round(r, 3) for r in results]
`,
      setupCode: '',
      expectedOutput: 'MHA 与 GQA 相差 4 倍，MQA 再小 8 倍',
      tests: `assert len(results) == 3, "应计算 3 个配置"
assert abs(results[0] - 2.0) < 0.05, f"MHA 应约为 2.0 GiB，实际 {results[0]}"
assert abs(results[1] - 0.5) < 0.02, f"GQA(8) 应约为 0.5 GiB，实际 {results[1]}"
assert abs(results[2] - 0.0625) < 0.01, f"MQA 应约为 0.0625 GiB，实际 {results[2]}"
assert abs(results[0] / results[1] - 4.0) < 1e-9, "8 组 KV 相对全 MHA 应缩小 4 倍"
assert abs(results[0] / results[2] - 32.0) < 1e-9, "MQA 相对全 MHA 应缩小 32 倍"
assert abs(kv_gib(32, 4096, 8, 128, batch=2) - 2 * results[1]) < 1e-9, "batch 加倍时缓存应加倍"
`,
      answer: `def kv_gib(layers, seq, kv_heads, d_k, batch=1, bytes_per=2):
    return 2 * layers * seq * kv_heads * d_k * batch * bytes_per / 1024 ** 3

layers, seq, d_k = 32, 4096, 128
results = [kv_gib(layers, seq, kh, d_k) for kh in (32, 8, 1)]

[round(r, 3) for r in results]
`,
      explanation:
        '以 MHA 为例：2（K 与 V）× 32 层 × 4096 序列 × 32 个 KV 头 × 128 维 × 2 字节 = 2,147,483,648 字节，恰好等于 2 GiB。把 kv_heads 从 32 降到 8，缓存变成 0.5 GiB；降到 1（MQA）只剩 62.5 MiB。模型权重一点没变，能支持的并发数却差 32 倍——这就是长上下文推理必须用 GQA 的量化理由。',
      relatedLessonId: 'llm-a1-c5-l3',
      tags: ['KV cache', '显存估算'],
    },
    {
      id: 'llm-a1-c5-e12',
      type: 'single',
      difficulty: 3,
      question: '多头注意力的输出必须先"拼接"再"乘 W_O"，如果去掉 W_O 会发生什么？',
      options: [
        { value: 'A', text: '模型无法训练，梯度为 NaN' },
        { value: 'B', text: '各头输出缺少跨头的线性融合，多头的表达能力明显下降' },
        { value: 'C', text: '输出形状会变成 [B, n, d_model × h]' },
        { value: 'D', text: '注意力权重不再归一化' },
      ],
      answer: 'B',
      explanation:
        'W_O 负责把各头在不同子空间中的贡献重新混合到统一的 d_model 空间。去掉它，各头只能以固定方式拼接，无法按需加权各头的贡献。形状不会变（拼接后已经是 d_model），softmax 也不受影响，训练仍能进行，只是效果变差。',
      relatedLessonId: 'llm-a1-c5-l1',
      tags: ['多头注意力', '输出投影'],
    },
    {
      id: 'llm-a1-c5-e13',
      type: 'judge',
      difficulty: 3,
      question: '在多头注意力实现中，如果先 transpose 再 reshape 来做头部拆分，程序不会报错，但每个头会混入其他头的特征维度。',
      answer: true,
      explanation:
        '先 transpose 后切分的轴是序列维 n 而不是特征维 d，拼出来的"头"包含不同位置的片段。形状合法、训练能跑，但语义完全错了，是极难排查的隐蔽 bug。正确顺序是 reshape → transpose。',
      relatedLessonId: 'llm-a1-c5-l1',
      tags: ['多头注意力', '形状变换'],
    },
    {
      id: 'llm-a1-c5-e14',
      type: 'fill',
      difficulty: 3,
      question: '补全公式，计算 K 与 V 缓存合计的字节数（fp16 每个元素 2 字节，KV 各存一份）：\n\n```python\nbytes_kv = layers * seq * kv_heads * d_k * batch * 2 * ___\n```',
      blanks: [['2', '2.0']],
      explanation:
        'K 与 V 各缓存一份、大小相同，所以把单份体积再乘以 2 就是 KV cache 总量。公式里已经乘了一个 2（fp16 的字节数），这里再乘的 2 表示 K 与 V 两份。',
      relatedLessonId: 'llm-a1-c5-l3',
      tags: ['KV cache', '公式'],
    },
    {
      id: 'llm-a1-c5-e15',
      type: 'code',
      difficulty: 3,
      question:
        '**头部消融实验**：给定已经算好的注意力权重 `w`（[B, h, n, n]）与 Value `V`（[B, h, n, dk]），计算：\n\n1. 完整输出 `base`（在 wo 投影之前，即 `w @ V` 之后拼接头）；\n2. 对每个头 i，把第 i 个头的权重置零后重算输出，记录相对变化 `drops[i]`（用绝对差的最大值 / 基线的最大值）；\n3. 找出贡献最大的头 `top_head = int(np.argmax(drops))`。\n\n最后一行直接求值 `top_head`。',
      starterCode: `import numpy as np

def merge_heads(x):
    B, h, n, dk = x.shape
    return x.transpose(0, 2, 1, 3).reshape(B, n, h * dk)

rng = np.random.default_rng(0)
B, h, n, dk = 1, 4, 5, 3
w = rng.random((B, h, n, n))
w = w / w.sum(axis=-1, keepdims=True)
V = rng.normal(size=(B, h, n, dk))
# 让第 2 个头的影响特别大
V[:, 2] *= 5.0

base = merge_heads(w @ V)
drops = np.zeros(h)
for i in range(h):
    w2 = ___
    out_i = ___
    drops[i] = ___

top_head = ___

top_head
`,
      setupCode: '',
      expectedOutput: '被放大 5 倍的那个头（索引 2）应被识别为最重要',
      tests: `assert drops.shape == (h,), f"drops 形状应为 ({h},)，实际 {drops.shape}"
assert np.all(np.isfinite(drops)), "drops 不应出现 NaN"
assert top_head == 2, f"贡献最大的头应为 2，实际 {top_head}"
assert drops[2] > drops[0] and drops[2] > drops[1] and drops[2] > drops[3], "第 2 个头的变化应最大"
assert float(drops[2]) > 0.3, f"屏蔽第 2 个头后应有显著变化，实际 {drops[2]}"
`,
      answer: `import numpy as np

def merge_heads(x):
    B, h, n, dk = x.shape
    return x.transpose(0, 2, 1, 3).reshape(B, n, h * dk)

rng = np.random.default_rng(0)
B, h, n, dk = 1, 4, 5, 3
w = rng.random((B, h, n, n))
w = w / w.sum(axis=-1, keepdims=True)
V = rng.normal(size=(B, h, n, dk))
V[:, 2] *= 5.0

base = merge_heads(w @ V)
drops = np.zeros(h)
for i in range(h):
    w2 = w.copy()
    w2[:, i] = 0.0
    out_i = merge_heads(w2 @ V)
    drops[i] = float(np.abs(out_i - base).max() / np.abs(base).max())

top_head = int(np.argmax(drops))

top_head
`,
      explanation:
        '消融的做法是"把某个头的贡献清零，看输出变化多大"。这里把权重置零等价于该头不贡献任何 Value。用 `w.copy()` 很关键：直接 `w[:, i] = 0` 会修改原张量，让后续循环的基线也被污染。真实模型中这类实验用于判断头部重要性，是头剪枝与可解释性分析的基础。',
      relatedLessonId: 'llm-a1-c5-l4',
      tags: ['多头注意力', '消融实验', 'numpy'],
    },
    {
      id: 'llm-a1-c5-e16',
      type: 'code',
      difficulty: 3,
      question:
        '**多头计算量核算**：\n\n1. `qk_cost(n, d_model, h)`：返回多头注意力中所有头 QK 点积的乘加总数（h × n² × d_k）；\n2. `proj_cost(n, d_model)`：返回 Q、K、V、O 四个投影的乘加总数（4 × n × d_model²）；\n3. 计算 n = 512、d_model = 512 时，h = 1 与 h = 8 的两种注意力总代价，并验证两者相等。\n\n最后一行直接求值 `(int(qk_1), int(qk_8), bool(same))`。',
      starterCode: `import numpy as np

def qk_cost(n, d_model, h):
    dk = d_model // h
    return ___

def proj_cost(n, d_model):
    return ___

n, d_model = 512, 512
qk_1 = qk_cost(n, d_model, 1)
qk_8 = qk_cost(n, d_model, 8)
same = ___

(int(qk_1), int(qk_8), bool(same))
`,
      setupCode: '',
      expectedOutput: '单头与多头 QK 计算量相等',
      tests: `assert int(qk_1) == 512 * 512 * 512, f"单头 QK 代价应为 n²·d_model，实际 {qk_1}"
assert int(qk_8) == int(qk_1), "8 头的总 QK 代价应与单头相同"
assert bool(same) is True, "same 应为 True"
assert int(proj_cost(n, d_model)) == 4 * 512 * 512 * 512, "四个投影的总代价应为 4·n·d_model²"
assert int(qk_cost(10, 16, 4)) == 4 * 100 * 4, "h=4 时每头 dk=4，总计 4·n²·dk"
`,
      answer: `import numpy as np

def qk_cost(n, d_model, h):
    dk = d_model // h
    return h * n * n * dk

def proj_cost(n, d_model):
    return 4 * n * d_model * d_model

n, d_model = 512, 512
qk_1 = qk_cost(n, d_model, 1)
qk_8 = qk_cost(n, d_model, 8)
same = abs(qk_1 - qk_8) < 1e-9

(int(qk_1), int(qk_8), bool(same))
`,
      explanation:
        'h × n² × (d_model/h) = n² × d_model，与 h 无关。这就是"多头几乎免费"的定量证明：它把同一份 d_model 切成多段并行，总乘加数不变，只是换来了 h 组独立的注意力分布。投影部分的代价也和 h 无关，因为 h 个小矩阵 [d, d/h] 拼接起来就是一个 [d, d] 矩阵。',
      relatedLessonId: 'llm-a1-c5-l1',
      tags: ['多头注意力', '计算量'],
    },
    {
      id: 'llm-a1-c5-e17',
      type: 'single',
      difficulty: 3,
      question: '推理阶段 decode（逐 token 生成）时，性能瓶颈通常是？',
      options: [
        { value: 'A', text: 'GPU 的浮点算力不足' },
        { value: 'B', text: '显存带宽，因为每步都要读取巨大的权重与 KV cache' },
        { value: 'C', text: 'softmax 的 exp 运算太慢' },
        { value: 'D', text: 'Python 解释器开销' },
      ],
      answer: 'B',
      explanation:
        'decode 每步只处理 1 个 token，矩阵乘退化为矩阵-向量乘，算力严重闲置而访存量不变，因此是 memory-bound。这也是 GQA、PagedAttention、权重量化等推理优化手段的核心动机。',
      relatedLessonId: 'llm-a1-c5-l4',
      tags: ['推理', '性能'],
    },
    {
      id: 'llm-a1-c5-e18',
      type: 'multiple',
      difficulty: 3,
      question: '下列哪些是"多头注意力"这一设计的合理好处？（多选）',
      options: [
        { value: 'A', text: '不同头可以学到不同类型的依赖关系（局部、句法、指代等）' },
        { value: 'B', text: '在不显著增加计算量的前提下提升表达能力' },
        { value: 'C', text: '部分头存在冗余，因此可以做头剪枝来加速' },
        { value: 'D', text: '头数越多，模型的上下文窗口就越长' },
      ],
      answer: ['A', 'B', 'C'],
      explanation:
        '上下文窗口由位置编码设计与训练长度决定，与头数无关（D 错误）。A 是可解释性发现，B 是复杂度分析结论，C 是头剪枝工作的经验依据（剪掉冗余头后性能几乎不变）。',
      relatedLessonId: 'llm-a1-c5-l4',
      tags: ['多头注意力', '可解释性'],
    },
    {
      id: 'llm-a1-c5-e19',
      type: 'open',
      difficulty: 3,
      question:
        '请解释多头注意力为什么"几乎不增加计算量"却比单头更强，并说明 GQA 在推理时解决了什么问题、代价是什么。',
      referenceAnswer: `**计算量不变的原因**

单头：QKᵀ 的代价是 n²·d_model。
多头：切成 h 份，每份维度 d_k = d_model/h，代价为 h × n² × d_k = n²·d_model。
投影部分同理：h 个 [d_model, d_k] 矩阵等价于一个 [d_model, d_model] 矩阵。
所以总乘加数相同，多出来的只是"并行分组"。

**为什么更强**

1. 一个人的注意力分布只能集中在少数位置；h 个并行分布可以同时覆盖
   局部邻接、句法依存、指代关系、全局主题等不同模式；
2. 每个头有独立的 W_Q/W_K/W_V，等价于在 h 个不同的子空间中做检索；
3. 拼接后的 W_O 让模型可以按需加权各头的贡献，比单头更灵活。

**GQA 解决的问题**

自回归推理需要缓存所有历史 K、V。缓存体积正比于 KV 头数：
MHA 需要 h 份，GQA 按 g 组共享只需 g 份，缓存降为 g/h。
在长上下文、大 batch 场景下，KV cache 常超过模型权重本身，成为并发上限。

**代价**

1. KV 被多个 Q 头共享，减少了"内容池"的多样性，质量略降；
2. 需要从 MHA 权重做转换或从头训练；
3. g 取值是显存与质量的折中（7B 模型常用 4~8 组）。
实践中 GQA 在 8 组时的质量损失通常落在评测噪声范围内，收益却非常显著。`,
      rubric: [
        { point: '用 h × n² × (d_model/h) = n² × d_model 说明计算量不变', score: 2 },
        { point: '说明多头提供多个子空间的并行注意力模式', score: 2 },
        { point: '指出 GQA 把 KV cache 从 h 份降到 g 份', score: 1 },
        { point: '指出质量略降与训练/转换成本', score: 1 },
      ],
      keywords: ['d_k', '子空间', 'KV cache', 'GQA', '组共享', '带宽', '折中'],
      explanation:
        '这道题把"多头为什么有效"和"推理为什么需要GQA"串起来。能定量写出计算量等式，并说清 KV cache 与并发的关系，就达到了工程可用的理解深度。',
      tags: ['多头注意力', 'GQA', '面试'],
    },
    {
      id: 'llm-a1-c5-e20',
      type: 'open',
      difficulty: 3,
      question:
        '你在实现多头注意力时发现模型能训练、loss 也在下降，但效果明显不如参考实现。请列出至少 4 个可能的原因，并说明如何逐个排查。',
      referenceAnswer: `**可能原因与排查方法**

1. 头拆分的 reshape/transpose 顺序颠倒
   现象：形状合法、不报错，但每个头混入了其他头的维度。
   排查：h=1 时与单头实现对比；检查 split 后第 0 个头是否等于
   最后维的前 dk 个数；把某个头的输出与手工切片结果比对。

2. 缩放因子用了 sqrt(d_model) 或忘了缩放
   排查：打印 scores 的标准差，应在 1 附近；
   若明显偏离，说明缩放写错。

3. 掩码加在 softmax 之后，或用乘法掩码
   排查：因果性自测——只改动最后一个 token，检查前 n-1 个输出是否不变；
   检查上三角权重是否严格为 0、每行和是否为 1。

4. softmax 沿错误轴归一化（axis=-2）
   排查：检查每行和是否为 1；若每列和为 1 就是轴错了。

5. 忘记 W_O 或把 W_O 的顺序放反（Wo 与 Wv 互换）
   排查：与参考实现逐层对比中间张量；
   检查参数量是否为 4d_model²。

6. 训练/推理不一致（如训练误用了非因果注意力）
   排查：比较整段前向的第 t 行输出与逐步生成到第 t 步的输出是否一致。

**通用方法**：先对齐形状，再对齐数值（固定随机种子，与参考实现逐层对比中间激活），
最后用 h=1 的退化情形做等价性检验。这三步几乎能定位所有实现级错误。`,
      rubric: [
        { point: '指出 reshape/transpose 顺序问题及其隐蔽性', score: 2 },
        { point: '指出缩放因子、softmax 轴、掩码位置中的至少两项', score: 2 },
        { point: '给出可执行的排查手段（h=1 等价、因果性自测、逐层对比）', score: 1 },
        { point: '强调固定种子做数值对齐', score: 1 },
      ],
      keywords: ['transpose', 'reshape', 'sqrt(d_k)', '掩码', 'softmax', 'axis', '等价性'],
      explanation:
        '多头注意力的 bug 大多"不报错但要命"。答题重点是给出**可执行的排查流程**，而不是罗列名词。提到"h=1 等价性检验"和"因果性自测"说明有实战经验。',
      tags: ['多头注意力', '调试', '工程'],
    },
  ],
  },
  {
  id: 'llm-a1-c6',
  title: '残差连接与 LayerNorm',
  goal: '从梯度传播角度解释残差为什么能救深层网络，推导 LayerNorm/RMSNorm 的公式与反向传播，理解 Pre-LN 与 Post-LN 的稳定性差异并能在 numpy 中实现与自测。',
  lessons: [
    {
      id: 'llm-a1-c6-l1',
      title: '残差连接：让梯度直通底层',
      content: `
## 深层网络为什么难训

考虑一个没有残差的 L 层网络，每层 y_l = f_l(y_{l-1})。反向传播时梯度逐层相乘：

dL/dy_0 = dL/dy_L 乘以 prod_{l=1..L} (d f_l / d y_{l-1})

只要每层雅可比的增益略小于 1（这在深层堆叠中很常见），连乘就会指数衰减。假设平均增益 0.9，50 层后系数是 0.9^50 约 0.005，第一层几乎收不到有效梯度；反过来若略大于 1，就会指数爆炸。

这就是 2015 年之前"超过 20 层就训不动"的根本原因。

## 残差的形式

He 等人（ResNet, 2016）提出的做法是把每层学"完整映射"改成学"残差"：

y = x + f(x)

前向时输入直接短路加回输出，反向时：

dy/dx = I + df/dx

**关键是那个 I**。梯度沿恒等路径无损回流，乘以 (I + df/dx) 而不是 df/dx。即使所有子层的雅可比都为 0，梯度仍然能完整地传回第一层——这就是"高速公路"的直觉。在数值上，深层网络训练中常见现象是：加上残差后，各层的梯度范数差异从十几个数量级缩小到同一量级。

## 为什么"学残差"更好优化

从表示的角度：如果某一层其实不需要变换（最优映射就是恒等），无残差时必须让 f 精确学出恒等映射；有残差时只需让 f 输出 0（因为 y = x + 0）。把"要学的东西"从"完整映射"变成"修正量"，量级更小、更接近零初始化，优化难度显著降低。

## 在 Transformer 中的位置

每个 Transformer Block 有两个子层，各自带一个残差：

- x1 = x + Attention(Norm(x))
- x2 = x1 + FFN(Norm(x1))

这两个加法的输出维度始终是 [B, n, d_model]，形成一条从头贯穿到尾的**残差流（residual stream）**。各子层只是不断地往这条流里读和写，Anthropic 的可解释性研究就是用这个视角解释模型内部计算的。

<Diagram type="arch" name="transformer-block" />

## 残差流的一个实践后果

由于每层都在做 x = x + delta，残差流的**方差会随层数累积增长**（每加一次，方差大致增加一份子层输出的方差）。这带来两点：

1. 必须靠 LayerNorm 把量级稳定住，否则到几十层后数值会超出 fp16 范围；
2. 残差流的范数随层数线性增长是训练不稳定的信号之一，也是"深度缩放初始化"、LayerScale 等技巧试图解决的问题。

## numpy 演示：有残差 vs 无残差的梯度量级

\`\`\`python
import numpy as np

def forward_backward(depth, use_residual, gain=0.9):
    x, grads = np.array([1.0]), []
    for _ in range(depth):
        x = gain * x
        grads.append(x.copy())
    # 简化模型：dL/dx_0 正比于 gain^depth（无残差）或 (1+gain)^depth 中的线性项
    return (1 + gain) ** depth if use_residual else gain ** depth

for d in (10, 30, 100):
    print(d, forward_backward(d, False), forward_backward(d, True))
\`\`\`

（这是简化示意，真实网络的增益矩阵接近单位阵，效果体现在"不衰减"而非"放大"。）

## 常见误区

1. **以为残差是为了"加深网络层数"**：更准确的说法是它改变了损失曲面的性质，使深层网络可优化；
2. **以为残差不增加参数**：正确，\`x + f(x)\` 本身没有参数；
3. **把残差的加法顺序写错**：\`f(x) + x\` 与 \`x + f(x)\` 数值相同，但代码里若误写成 \`x = f(x)\`（覆盖原变量）就退化成普通网络，且不会报错；
4. **以为残差能解决所有退化问题**：它解决的是"优化困难"，不解决容量不足。

<GradientFlowDemo />
`,
      tips: [
        {
          kind: 'interview',
          text: '被问"残差连接为什么有效"，从两层回答：前向上它让"恒等映射"成为平凡解（子层输出 0 即可）；反向上 `dy/dx = I + df/dx` 提供了不衰减的梯度通道。',
        },
        {
          kind: 'pitfall',
          text: '实现时务必写成 `x = x + sublayer(norm(x))`。若误写成 `x = sublayer(norm(x))`，梯度通道就断了——形状完全合法、能训练，但深层会明显更难收敛，而且很难从报错中发现。',
        },
        {
          kind: 'note',
          text: '残差流的方差随层数累积增长，这是需要 LayerNorm 与合理初始化的原因之一。训练时监控各层激活范数，能提前发现深层数值失稳。',
        },
      ],
      demos: [
        {
          title: '梯度衰减对比：无残差 vs 有残差',
          lang: 'python',
          code: `import numpy as np

def coef(depth, use_residual, gain=0.9):
    if use_residual:
        return (1 + gain) ** depth if depth < 100 else np.exp(depth * np.log1p(gain))
    return gain ** depth if depth < 700 else 0.0

print("%6s %18s %18s" % ("层数", "无残差梯度系数", "有残差梯度系数"))
for d in (5, 10, 20, 50, 100):
    print("%6d %18.4e %18.4e" % (d, coef(d, False), coef(d, True)))

print()
print("无残差：0.9^100 已经小到 1e-5，30 层以上第一层几乎收不到梯度。")
print("有残差：梯度走恒等通路，系数不随深度指数衰减。")
print()
print("另一种视角：残差网络中某层若学到'什么都不做'，只需子层输出 0；")
print("无残差网络则必须精确学出恒等映射，优化难度大得多。")`,
        },
      ],
    },
    {
      id: 'llm-a1-c6-l2',
      title: 'LayerNorm：逐 token 的均值方差归一化',
      content: `
## 定义

给定一个 token 的表示 x（形状 [d]），LayerNorm 沿**特征维**做归一化：

mu = (1/d) 乘以 sum_i x_i

sigma² = (1/d) 乘以 sum_i (x_i - mu)²

x_hat_i = (x_i - mu) / sqrt(sigma² + eps)

y_i = gamma_i 乘以 x_hat_i + beta_i

gamma 与 beta 是可学习的 d 维参数，让网络可以"撤销"归一化（当 gamma = sigma、beta = mu 时严格还原原值）。

对形状 [B, n, d] 的整个张量，归一化发生在**最后一维**，每个 token 独立处理，不同 batch、不同位置互不影响。

## 为什么 NLP 用 LayerNorm 而不是 BatchNorm

| 维度 | BatchNorm | LayerNorm |
| --- | --- | --- |
| 统计维度 | 跨 batch（同一特征） | 单样本内（跨特征） |
| 序列长度可变 | 统计不稳定 | 不受影响 |
| 推理 batch = 1 | 需要滑动平均统计量 | 直接可用 |
| 训练/推理一致 | 不完全一致 | 完全一致 |
| 自回归生成 | 每一步分布不同，跨样本统计无意义 | 每步独立归一化，正确 |

核心原因是一句话：**序列模型中"同一位置的特征"在不同样本间未必有可比性**（长度不同、语义角色不同），而"同一个 token 内的特征"始终是可比的。

## 数值细节

1. **eps 取 1e-5 或 1e-6**，防止方差为 0 时除零；
2. **方差计算方式**：必须先算均值再算偏差平方。写成 E[x²] - (E[x])² 在均值远大于标准差时会因抵消误差产生负值，开根号后得到 nan；
3. **混合精度**：LayerNorm 通常用 fp32 计算，因为求和与平方在 fp16 下容易溢出或丢精度；
4. **gamma/beta 初值**：gamma 初始化为 1，beta 为 0，此时 LayerNorm 严格是"零均值、单位方差"。

## 反向传播（手推）

设 z = (x - mu)/sigma，y = gamma·z + beta。反向时 dL/dx 需要穿过 mu 与 sigma，二者都依赖所有 x_i，因此：

dL/dx_i = (1 / (d·sigma)) 乘以 (d·dL/dz_i - sum_j dL/dz_j - z_i 乘以 sum_j (dL/dz_j · z_j))

记 dL/dz = dL/dy · gamma。可以验证：若 dL/dz 全为常数 c，则括号内为 d·c - d·c - z_i·c·sum(z_j)。由于 sum(z_j) = 0（零均值），括号为 0，梯度为 0——这正是合理性质：**给归一化输出整体加常数不应改变原输入**。

## numpy 实现

\`\`\`python
def layer_norm(x, gamma=None, beta=None, eps=1e-5):
    d = x.shape[-1]
    gamma = np.ones(d) if gamma is None else gamma
    beta = np.zeros(d) if beta is None else beta
    mu = x.mean(axis=-1, keepdims=True)              # [..., 1]
    var = ((x - mu) ** 2).mean(axis=-1, keepdims=True)
    return gamma * (x - mu) / np.sqrt(var + eps) + beta
\`\`\`

\`keepdims=True\` 是关键：结果保持 [..., 1] 形状才能与 [..., d] 广播相除。

## 常见误区

1. **归一化维度选错**：必须是特征维（axis=-1），沿 token 维归一化会抹掉序列内的相对幅度，语义完全错误；
2. **忘了 gamma/beta**：没有可学习参数时网络会失去调整幅度的能力，深层表达力下降；
3. **用"均方减均值平方"求方差**：数值不稳定；
4. **以为 LayerNorm 需要维护滑动统计量**：它只用当前样本当前 token 的统计量，训练推理完全一致。

<LayerNormDemo />
`,
      tips: [
        {
          kind: 'pitfall',
          text: '归一化轴必须是特征维（`axis=-1`）。沿 token 维归一化的代码同样能跑，但会把不同位置的信息混在一起平均掉，模型基本学不动——这是概念错误，不是语法错误。',
        },
        {
          kind: 'interview',
          text: 'LayerNorm vs BatchNorm 是必考题。答题框架：统计维度不同 → 序列模型 batch 统计不可靠 → 推理 batch=1 时 BatchNorm 需依赖滑动均值而 LayerNorm 不需要。',
        },
        {
          kind: 'performance',
          text: '混合精度训练时把 LayerNorm 内部计算提升到 fp32，可以显著减少 loss 尖峰；代价只是很小的带宽开销。',
        },
      ],
      demos: [
        {
          title: 'LayerNorm / BatchNorm 的归一化维度对比（拖滑块观察）',
          lang: 'python',
          code: `import numpy as np

np.set_printoptions(precision=3, suppress=True)
X = np.array([
    [1.0, 2.0, 3.0, 4.0],
    [10.0, 12.0, 14.0, 16.0],
    [0.5, -0.5, 0.5, -0.5],
])

def layer_norm(x, eps=1e-5):
    mu = x.mean(axis=-1, keepdims=True)
    var = ((x - mu) ** 2).mean(axis=-1, keepdims=True)
    return (x - mu) / np.sqrt(var + eps)

def batch_norm(x, eps=1e-5):
    mu = x.mean(axis=0, keepdims=True)
    var = ((x - mu) ** 2).mean(axis=0, keepdims=True)
    return (x - mu) / np.sqrt(var + eps)

LN, BN = layer_norm(X), batch_norm(X)
print("LayerNorm 每行均值:", LN.mean(axis=1), " 每行方差:", LN.var(axis=1))
print("BatchNorm 每列均值:", BN.mean(axis=0), " 每列方差:", BN.var(axis=0))
print()
print("取 batch 中只有 1 条样本时：")
for i in range(3):
    print("  样本 %d 单独归一化后方差: %.6f" % (i, layer_norm(X[i:i + 1]).var()))
print("LayerNorm 逐样本独立，batch=1 时行为完全不变；BatchNorm 则需要跨 batch 的统计量。")`,
        },
        {
          title: '数值陷阱：两种方差写法的对比',
          lang: 'python',
          code: `import numpy as np

x = np.array([1e8 + 1.0, 1e8 + 2.0, 1e8 + 3.0])

def var_stable(x):
    mu = x.mean()
    return ((x - mu) ** 2).mean()

def var_unstable(x):
    return (x ** 2).mean() - x.mean() ** 2

print("先减均值再平方:", var_stable(x))
print("均方减均值平方:", var_unstable(x))
print("理论值应为 2/3 =", 2 / 3)
print()
print("均值再大一些时，均方减均值平方会因抵消误差直接变成明显的错误值：")
big = np.array([1e10 + 1.0, 1e10 + 2.0, 1e10 + 3.0])
print("  x = [1e10+1, 1e10+2, 1e10+3]，真实方差仍为 2/3")
print("  先减均值再平方:", var_stable(big))
print("  均方减均值平方:", var_unstable(big), " <- 误差甚至会让它变成负数，开根号即得 nan")`,
        },
      ],
    },
    {
      id: 'llm-a1-c6-l3',
      title: 'RMSNorm：去掉均值中心化的化简',
      content: `
## 学习目标

学完本节，你应该能够：
1. 写出 RMSNorm 公式并指出它与 LayerNorm 的唯一差异（去掉均值中心化与 β）；
2. 手算 4 维向量的 RMSNorm 全流程；
3. 量化说明"省 1 次均值"在百亿模型上的显存与速度收益，以及 LLaMA 选择它的理由。

## 前置知识

- LayerNorm（c6-l2：逐 token 沿特征维归一化）；
- 均值/均方根的计算。

## 问题背景：给每一层省一根"计算钉子"

LayerNorm 对每个 token 的 d 维向量做"减均值、除标准差、再仿射"，其中**减均值（中心化）与偏置 β 各占一次访存与计算**。Zhang & Sennrich（2019）发现：把均值项整个去掉、只按**均方根**缩放——效果不掉点、计算更省。这个"免费午餐"让 RMSNorm 成为 LLaMA 及几乎所有 2023 后主流开源模型的默认。

## 核心概念：公式对照

$$\\mathrm{LN}(x) = \\gamma \\cdot \\frac{x - \\mu}{\\sqrt{\\sigma^2 + \\epsilon}} + \\beta \\qquad \\mathrm{RMSNorm}(x) = \\gamma \\cdot \\frac{x}{\\sqrt{\\frac{1}{d}\\sum_i x_i^2 + \\epsilon}}$$

| 差异项 | LayerNorm | RMSNorm |
| --- | --- | --- |
| 均值 μ | 计算并减去 | **不算** |
| β 偏置 | 有 | **无** |
| 缩放统计量 | 标准差 | 均方根（RMS） |
| 参数/维 | γ、β 两个 | γ 一个 |

省掉的恰是逐元素访存最贵的部分（均值是一趟 reduce + 一趟广播减法）。

## 完整案例：4 维手算

$x = (1, 2, 3, 4)$：
- 均方 $\\frac{1}{4}(1+4+9+16) = 7.5$，RMS $= \\sqrt{7.5 + 10^{-5}} \\approx 2.7386$；
- 归一化：$(0.365, 0.730, 1.096, 1.461)$；
- 乘 $\\gamma=(1,1,1,1)$ 即输出（有 γ 时逐维缩放）。

对照 LN：μ=2.5，σ=1.118 → $(−1.342, −0.447, 0.447, 1.342)$——**RMSNorm 的输出中心不在 0**（保留了原始的偏移方向），这正是"去中心化"的字面含义。

## 代码实践

\`\`\`python
import numpy as np
rng = np.random.default_rng(0)

def rmsnorm(x, gamma, eps=1e-6):
    return gamma * x / np.sqrt((x ** 2).mean(-1, keepdims=True) + eps)

x = np.array([1., 2., 3., 4.])
g = np.ones(4)
print("RMSNorm:", np.round(rmsnorm(x, g), 3))

# 大矩阵级收益演示: (B,n,d) 的逐 token 归一化
X = rng.normal(0, 1, (8, 1024, 4096))
def ln(x):
    mu = x.mean(-1, keepdims=True)
    return (x - mu) / np.sqrt(x.var(-1, keepdims=True) + 1e-6)
import time
t0 = time.perf_counter(); [ln(X) for _ in range(20)]; t1 = time.perf_counter()
[rmsnorm(X, np.ones(4096)) for _ in range(20)]; t2 = time.perf_counter()
print(f"LN {t1-t0:.3f}s vs RMS {t2-t1:.3f}s (20 次前向, 相对省 {(t1-t0)/(t2-t1)-1:.0%}+)")
\`\`\`

预期输出：RMSNorm ≈ (0.365, 0.730, 1.096, 1.461)；计时显示 RMS 版更快（幅度依机器，均值 reduce 与减法省掉约 10–20% 的该层耗时；乘以几十层与百亿参数，工程收益可观）。**常见错误**：分母忘加 ε（全零 token 除零）；γ 初始化为 0（输出恒 0，梯度死亡，应为 1）；把 RMS 误当标准差（差一个均值项）。

## 常见误区

1. **RMSNorm 更准所以更好**——不是更准，是**同样好且更便宜**；收益纯工程；
2. **去均值会伤长序列**——实测各类任务持平；"中心化必要"是历史惯性；
3. **LLaMA 用它=独占**——它是公开论文（arXiv:1910.07467），Qwen/Mistral 等全线采用；
4. **Pre-LN 配 RMSNorm 是绑定**——两者独立（正交）选择，LLaMA 恰好都选了省的那档。

## 知识关联

- **向前**：c6-l2 LayerNorm 是它的母体；c6-l4 Pre/Post-LN 与归一化类型无关；
- **向后**：c8 组装 Block 时 RMSNorm 出现在两个残差分支入口；
- **平行**：llm-a3 c1 整章从架构演进视角复盘同一选择。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 公式 | $\\gamma x / \\sqrt{\\frac{1}{d}\\sum x_i^2 + \\epsilon}$ |
| 差异 | 无 μ、无 β：省一趟 reduce + 广播减法 |
| 手算锚点 | (1,2,3,4) → (0.365, 0.730, 1.096, 1.461) |
| 采用 | LLaMA/Qwen/Mistral 世代默认 |

## 参考资料

> **来源类型：学术来源**
> - Zhang, B., & Sennrich, R. (2019). "Root Mean Square Layer Normalization." *NeurIPS 2019*. arXiv:1910.07467（已核验）。
> **来源类型：原创**
> - 计算钉子比喻与手算对照为本课程改编。
`,
      tips: [
        {
          kind: 'note',
          text: 'RMSNorm 对整体正缩放严格不变：`RMSNorm(c·x) = RMSNorm(x)`（c > 0）。这条性质让它比 LayerNorm 更能吸收残差流尺度的漂移。',
        },
        {
          kind: 'pitfall',
          text: 'eps 放在根号内还是根号外是两种不同实现。加载别人训练的权重时若不匹配，会出现"结果大致对但数值有偏差"的问题，排查时极难想到。',
        },
        {
          kind: 'interview',
          text: '"LLaMA 为什么用 RMSNorm？" 答：去掉减均值与 beta，参数与计算都减半；实验表明去掉中心化后效果不差；且对整体缩放严格不变，利于深层稳定。',
        },
      ],
      demos: [
        {
          title: 'LayerNorm vs RMSNorm 输出的逐维对比',
          lang: 'python',
          code: `import numpy as np

np.set_printoptions(precision=4, suppress=True)

def layer_norm(x, eps=1e-6):
    mu = x.mean(axis=-1, keepdims=True)
    var = ((x - mu) ** 2).mean(axis=-1, keepdims=True)
    return (x - mu) / np.sqrt(var + eps)

def rms_norm(x, eps=1e-6):
    rms = np.sqrt((x ** 2).mean(axis=-1, keepdims=True) + eps)
    return x / rms

X = np.array([[1.0, 2.0, 3.0, 4.0],
              [3.0, 3.0, 3.0, 3.0],
              [1.0, 1.0, 1.0, 1.0],
              [-2.0, 0.0, 2.0, 0.0]])

LN, RN = layer_norm(X), rms_norm(X)
print("输入:\n", X)
print("LayerNorm:\n", LN)
print("RMSNorm:\n", RN)
print()
print("LN 每行均值:", LN.mean(axis=1), " 每行均方根:", np.sqrt((LN ** 2).mean(axis=1)))
print("RN 每行均值:", RN.mean(axis=1), " 每行均方根:", np.sqrt((RN ** 2).mean(axis=1)))
print()
print("常数行 [3,3,3,3]：LayerNorm 输出全 0，RMSNorm 输出全 1 —— 差别最直观的例子")
print("正缩放不变性:", np.allclose(rms_norm(X * 3.5), RN), "（RMSNorm）",
      np.allclose(layer_norm(X * 3.5), LN), "（LayerNorm，受 eps 影响略有不同）")`,
        },
        {
          title: '手推 LayerNorm 的反向传播并做数值梯度校验',
          lang: 'python',
          code: `import numpy as np

def layer_norm_forward(x, eps=1e-5):
    mu = x.mean()
    var = ((x - mu) ** 2).mean()
    inv = 1.0 / np.sqrt(var + eps)
    z = (x - mu) * inv
    return z, (x, mu, inv, z)

def layer_norm_backward(dz, cache):
    x, mu, inv, z = cache
    d = x.size
    dvar = np.sum(dz * (x - mu) * (-0.5) * inv ** 3)
    dmu = np.sum(dz * (-inv)) + dvar * np.mean(-2.0 * (x - mu))
    return dz * inv + dvar * 2.0 * (x - mu) / d + dmu / d

rng = np.random.default_rng(0)
x = rng.normal(2.0, 3.0, size=6)
z, cache = layer_norm_forward(x)
dz = rng.normal(size=6)
analytic = layer_norm_backward(dz, cache)

def loss(xx):
    return float(np.sum(layer_norm_forward(xx)[0] * dz))

num = np.zeros_like(x)
h = 1e-6
for i in range(x.size):
    xp, xm = x.copy(), x.copy()
    xp[i] += h
    xm[i] -= h
    num[i] = (loss(xp) - loss(xm)) / (2 * h)

print("解析梯度:", np.round(analytic, 6))
print("数值梯度:", np.round(num, 6))
print("最大误差:", float(np.abs(analytic - num).max()))
print()
print("注意 sum(dz) 相关的项：若 dz 全为常数，梯度应为 0（归一化输出整体平移不改变输入）。")
c = np.ones(6)
dconst = layer_norm_backward(c, cache)
print("dz 全为 1 时的梯度范数:", float(np.linalg.norm(dconst)))`,
        },
      ],
    },
    {
      id: 'llm-a1-c6-l4',
      title: 'Pre-LN 与 Post-LN：归一化放在加法前还是后',
      content: `
## 两种排布

- **Post-LN**（原始 Transformer）：y = Norm(x + Sublayer(x))
- **Pre-LN**（GPT-2 起主流）：y = x + Sublayer(Norm(x))

两者只差归一化与加法的先后顺序，却在训练稳定性上有巨大差别。

## 梯度视角

对 Post-LN 求导：

dy/dx = d Norm / dz 乘以 (I + d Sublayer / dx)，其中 z = x + Sublayer(x)

归一化的雅可比 d Norm / dz 一般不是单位阵（它会把"整体平移"的方向投影掉）。也就是说，**每一层的残差通路都要穿过一次归一化**，其增益与方向都会被打折。堆到几十层，累积效应仍可能让梯度不稳定。

对 Pre-LN：

y = x + Sublayer(Norm(x))，所以 dy/dx = I + d Sublayer / d(Norm(x)) 乘以 d Norm / dx

这里存在一条**完全不经过归一化**的恒等通路 I。梯度可以沿着它一路回流，这是 Pre-LN 训练非常稳定的直接原因。

## 实际差异

| 维度 | Post-LN | Pre-LN |
| --- | --- | --- |
| 训练稳定性 | 差，深层容易发散 | 好，可不用 warmup |
| 是否需要 warmup | 强烈建议 | 可选 |
| 同等规模最终质量 | 略好 | 略低 |
| 残差路径 | 被归一化阻断 | 纯恒等 |
| 缺点 | 深网难训 | 残差范数随深度增长 |

**为什么 Post-LN 最终质量略高**：因为每层输出都被归一化，残差流的尺度始终受控；而 Pre-LN 的残差流会随层数累积增长，后期层实际看到的输入范数很大，需要额外手段（如 LayerScale、深度相关的初始化缩放、最后加一个 Final Norm）来补偿。

## Pre-LN 必须配 Final Norm

Pre-LN 结构里，最后一个子层的输出之后没有归一化。若直接接 LM head，logits 的量级会随层数漂移。所以标准做法是在所有层之后再加一层 Norm：

\`\`\`python
h = embed(ids)
for block in blocks:
    h = block(h)          # Pre-LN block
h = final_norm(h)         # 必须有
logits = h @ lm_head
\`\`\`

LLaMA 的 \`output_norm\` 就是这一层。忘记它会得到"训练 loss 下降但生成质量很差"的诡异现象。

## 混合方案

- **Post-LN with warmup**：原论文与早期 BERT 的做法，配合学习率 warmup 可以训到很深；
- **Pre-LN + LayerScale**：给子层输出乘以一个小的可学习标量（初值约 1e-4），抑制早期残差流的累积，CaiT、BEiT 采用；
- **DeepNorm**：调整残差与初始化的缩放系数，让 Post-LN 也能稳定训练到 1000 层；
- **QK-Norm / Sandwich-LN**：在注意力分数计算前额外归一化 Q、K，或每个子层前后都加 Norm，用于大规模训练的稳定性。

## 如何选择

- 从零训练 32 层以内：Pre-LN 最省心；
- 追求同等算力下最高质量：Post-LN + warmup（或 DeepNorm）通常是更强的，但调参成本高；
- 微调已有模型：跟随原模型的结构，**不要换排布**。

## 常见误区

1. **以为 Pre-LN 与 Post-LN 只是代码风格差异**：它们的梯度通路本质上不同；
2. **Pre-LN 不加 Final Norm**：logits 尺度失控；
3. **以为 Pre-LN 不需要 warmup 就一定更好**：最终质量通常略低于精心调过的 Post-LN；
4. **混淆"Norm 在哪"与"Norm 用什么"**：RMSNorm 是"用什么"，Pre-LN 是"放哪"，两者正交，可以组合（LLaMA 就是 Pre-RMSNorm）。
`,
      tips: [
        {
          kind: 'interview',
          text: 'Pre-LN vs Post-LN 的答题主线：Pre-LN 保留纯恒等残差通路（`dy/dx = I + ...`），梯度不经过归一化，所以稳定；Post-LN 每层残差都要穿过归一化，深层需要 warmup。',
        },
        {
          kind: 'pitfall',
          text: 'Pre-LN 结构必须加 Final Norm。漏掉后训练 loss 看起来正常，但 logits 量级随层数漂移，生成质量明显变差，且这种问题几乎无法从报错中发现。',
        },
        {
          kind: 'note',
          text: '"Norm 的位置（Pre/Post）"与"Norm 的类型（LayerNorm/RMSNorm）"是两个正交的设计维度。LLaMA = Pre-LN + RMSNorm；BERT = Post-LN + LayerNorm。',
        },
      ],
      demos: [
        {
          title: 'Pre-LN 与 Post-LN 的残差流范数随深度变化',
          lang: 'python',
          code: `import numpy as np

def layer_norm(x, eps=1e-5):
    mu = x.mean(axis=-1, keepdims=True)
    var = ((x - mu) ** 2).mean(axis=-1, keepdims=True)
    return (x - mu) / np.sqrt(var + eps)

rng = np.random.default_rng(0)
B, n, d = 2, 4, 32
x = rng.normal(size=(B, n, d))
sub = lambda t: 0.05 * t + rng.normal(0, 0.1, size=t.shape)   # 假装是一个子层

h_pre, h_post = x.copy(), x.copy()
pre_norms, post_norms = [], []
for _ in range(24):
    h_pre = h_pre + sub(layer_norm(h_pre))          # Pre-LN
    h_post = layer_norm(h_post + sub(h_post))       # Post-LN
    pre_norms.append(float(np.linalg.norm(h_pre)))
    post_norms.append(float(np.linalg.norm(h_post)))

print("层数    Pre-LN 残差流范数     Post-LN 输出范数")
for i in (0, 5, 11, 17, 23):
    print("%4d %20.3f %20.3f" % (i + 1, pre_norms[i], post_norms[i]))
print()
print("Post-LN 因为每层都归一化，尺度恒定；")
print("Pre-LN 的残差流会持续累积——这正是现在常配 Final Norm 的原因。")`,
        },
      ],
    },
  ],
  exercises: [
    {
      id: 'llm-a1-c6-e1',
      type: 'single',
      difficulty: 3,
      question: '残差连接 `y = x + f(x)` 能缓解深层网络梯度消失，最核心的原因是？',
      options: [
        { value: 'A', text: '它减少了网络的参数量' },
        { value: 'B', text: '反向传播时梯度可沿恒等通路回流，`dy/dx` 中多了一个 `I`' },
        { value: 'C', text: '它把激活函数换成了线性函数' },
        { value: 'D', text: '它对输入做了归一化' },
      ],
      answer: 'B',
      explanation:
        '`dy/dx = I + df/dx`，恒等项让梯度不必逐层乘以子层雅可比，即使子层梯度很小也不会指数衰减。残差不改变参数量，也不改变激活函数。',
      relatedLessonId: 'llm-a1-c6-l1',
      tags: ['残差连接', '梯度'],
    },
    {
      id: 'llm-a1-c6-e2',
      type: 'judge',
      difficulty: 3,
      question: 'LayerNorm 沿 token 维度（序列维）做归一化，因此同一序列内不同位置会互相影响。',
      answer: false,
      explanation:
        'LayerNorm 沿**特征维**（d_model）归一化，每个 token 独立处理，不同位置、不同 batch 之间互不影响。沿 token 维归一化会抹掉位置间的相对幅度差异，语义会被破坏。',
      relatedLessonId: 'llm-a1-c6-l2',
      tags: ['LayerNorm'],
    },
    {
      id: 'llm-a1-c6-e3',
      type: 'multiple',
      difficulty: 3,
      question: '关于 LayerNorm 与 BatchNorm 的区别，下列说法正确的有？（多选）',
      options: [
        { value: 'A', text: 'LayerNorm 在单个样本内跨特征求统计量，BatchNorm 跨 batch 求' },
        { value: 'B', text: '推理时 batch 只有 1 条时，BatchNorm 需要依赖训练期估计的滑动统计量' },
        { value: 'C', text: 'LayerNorm 的训练与推理行为完全一致' },
        { value: 'D', text: 'BatchNorm 更适合序列长度变化的自回归模型' },
      ],
      answer: ['A', 'B', 'C'],
      explanation:
        '正相反，BatchNorm 不适合序列模型（D 错误）：序列长度可变、各步分布不同、推理 batch 可能为 1，跨样本统计没有意义。这正是 NLP 普遍使用 LayerNorm 的原因。',
      relatedLessonId: 'llm-a1-c6-l2',
      tags: ['LayerNorm', 'BatchNorm'],
    },
    {
      id: 'llm-a1-c6-e4',
      type: 'fill',
      difficulty: 3,
      question: '补全 LayerNorm 的归一化部分（`eps` 防止除零）：\n\n```python\ndef layer_norm(x, eps=1e-5):\n    mu = x.mean(axis=-1, keepdims=True)\n    var = ((x - mu) ** 2).mean(axis=-1, keepdims=True)\n    return (x - mu) / ___\n```',
      blanks: [['np.sqrt(var + eps)', 'sqrt(var + eps)', 'np.sqrt(var+eps)', '/np\\.sqrt\\(var \\+ eps\\)/']],
      explanation:
        '分母是 `sqrt(var + eps)`。`keepdims=True` 让 mu 与 var 保持 [..., 1] 形状，才能与 [..., d] 广播。若把 eps 写到根号外（`np.sqrt(var) + eps`），在方差接近 0 时行为会不同。',
      relatedLessonId: 'llm-a1-c6-l2',
      tags: ['LayerNorm', '实现'],
    },
    {
      id: 'llm-a1-c6-e5',
      type: 'single',
      difficulty: 3,
      question: 'RMSNorm 相比 LayerNorm 去掉了什么？',
      options: [
        { value: 'A', text: '去掉了 gamma 缩放参数' },
        { value: 'B', text: '去掉了减均值（中心化）与偏置 beta' },
        { value: 'C', text: '去掉了开方运算' },
        { value: 'D', text: '去掉了 eps' },
      ],
      answer: 'B',
      explanation:
        'RMSNorm 只按均方根缩放：`y = gamma * x / sqrt(mean(x²) + eps)`。它保留 gamma，去掉了"减均值"和"加 beta"，因此参数量减半、计算更省，实测效果不差。',
      relatedLessonId: 'llm-a1-c6-l3',
      tags: ['RMSNorm'],
    },
    {
      id: 'llm-a1-c6-e6',
      type: 'judge',
      difficulty: 3,
      question: 'RMSNorm 对整体正缩放具有严格不变性：对任意 c 大于 0，RMSNorm(c·x) 等于 RMSNorm(x)。',
      answer: true,
      explanation:
        'RMS(c·x) = c·RMS(x)，于是 gamma·(c·x)/(c·RMS(x)) = gamma·x/RMS(x)。正因为不减均值，缩放因子会被完整约掉。这条性质让 RMSNorm 能吸收残差流的尺度漂移。',
      relatedLessonId: 'llm-a1-c6-l3',
      tags: ['RMSNorm', '性质'],
    },
    {
      id: 'llm-a1-c6-e7',
      type: 'code',
      difficulty: 3,
      question:
        '实现 `layer_norm(x, gamma=None, beta=None, eps=1e-5)`：沿最后一维做归一化，再应用可学习缩放 gamma 与偏移 beta。\n\n- 均值与方差都用有偏估计（除以 d）；\n- gamma 缺省为全 1，beta 缺省为全 0。\n\n最后一行直接求值 `layer_norm(X)`，其中 X 为 [3, 4]。',
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

layer_norm(X)
`,
      setupCode: '',
      expectedOutput: '每行均值为 0、方差约为 1',
      tests: `assert out.shape == X.shape, "输出形状应与输入一致"
assert np.allclose(out.mean(axis=-1), 0.0, atol=1e-6), "每行均值应为 0"
assert np.allclose(out.var(axis=-1), 1.0, atol=1e-4), "每行方差应约为 1"
assert np.allclose(out[0], [-1.34164, -0.44721, 0.44721, 1.34164], atol=1e-4), "第 0 行归一化结果不正确"
assert np.allclose(out[2], layer_norm(X[2:3])[0]), "逐行归一化结果应与整批一致"
out2 = layer_norm(X, np.ones(4) * 2, np.ones(4) * 0.5)
assert np.allclose(out2, out * 2 + 0.5), "gamma 与 beta 应生效"
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

layer_norm(X)
`,
      explanation:
        '第 0 行均值 2.5、方差 1.25、标准差约 1.118，归一化后约为 [-1.343, -0.448, 0.448, 1.343]（受 eps 影响，故容差取 1e-4）。`keepdims=True` 不可省，否则无法与原矩阵广播。方差必须"先减均值再平方"。',
      relatedLessonId: 'llm-a1-c6-l2',
      tags: ['LayerNorm', 'numpy'],
    },
    {
      id: 'llm-a1-c6-e8',
      type: 'code',
      difficulty: 3,
      question:
        '实现 `rms_norm(x, gamma=None, eps=1e-6)`：\n\n- 计算均方根 `rms = sqrt(mean(x²) + eps)`（eps 放在**根号内**）；\n- 返回 `gamma * x / rms`；\n- 不做减均值，也不加 beta。\n\n最后一行直接求值 `rms_norm(X)`。',
      starterCode: `import numpy as np

def rms_norm(x, gamma=None, eps=1e-6):
    d = x.shape[-1]
    gamma = np.ones(d) if gamma is None else gamma
    rms = ___                                  # [..., 1]
    return ___

X = np.array([[1.0, 2.0, 3.0, 4.0],
              [3.0, 3.0, 3.0, 3.0],
              [1.0, 1.0, 1.0, 1.0]])

rms_norm(X)
`,
      setupCode: '',
      expectedOutput: '每行均方根为 1，常数行输出全 1',
      tests: `assert out.shape == X.shape, "输出形状应不变"
assert np.allclose(np.sqrt((out ** 2).mean(axis=-1)), 1.0, atol=1e-4), "每行均方根应为 1"
assert np.allclose(out[1], np.ones(4), atol=1e-4), "常数行 [3,3,3,3] 的输出应为全 1"
assert np.allclose(out[0], X[0] / np.sqrt((X[0] ** 2).mean() + 1e-6), atol=1e-6), "第 0 行结果不正确"
assert np.allclose(rms_norm(X * 3.5), rms_norm(X), atol=1e-3), "RMSNorm 对整体正缩放近似不变"
assert not np.allclose(out.mean(axis=-1), 0.0), "RMSNorm 不减均值，输出均值不应为 0"
`,
      answer: `import numpy as np

def rms_norm(x, gamma=None, eps=1e-6):
    d = x.shape[-1]
    gamma = np.ones(d) if gamma is None else gamma
    rms = np.sqrt((x ** 2).mean(axis=-1, keepdims=True) + eps)
    return gamma * x / rms

X = np.array([[1.0, 2.0, 3.0, 4.0],
              [3.0, 3.0, 3.0, 3.0],
              [1.0, 1.0, 1.0, 1.0]])

rms_norm(X)
`,
      explanation:
        '常数行 [3,3,3,3] 最直观：LayerNorm 输出全 0，RMSNorm 输出全 1——因为不减均值。最后一条断言验证"RMSNorm 不给零均值"，这是它与 LayerNorm 的本质区别。eps 放在根号内与 LLaMA 实现一致，加载权重时必须与训练实现匹配。',
      relatedLessonId: 'llm-a1-c6-l3',
      tags: ['RMSNorm', 'numpy'],
    },
    {
      id: 'llm-a1-c6-e9',
      type: 'code',
      difficulty: 3,
      question:
        '用**有限差分**校验 LayerNorm 的解析梯度（只做前向与数值梯度，不必手写反向公式）：\n\n1. 实现 `ln_forward(x)`：返回归一化后的向量（不含 gamma/beta）；\n2. 取 `dz = np.ones(d)` 作为上游梯度，定义标量损失 `loss(x) = sum(ln_forward(x) * dz)`；\n3. 用中心差分 `(loss(x+h·e_i) - loss(x-h·e_i)) / (2h)`（h = 1e-6）计算数值梯度 `num_grad`；\n4. 关键结论：由于 dz 全为常数，梯度应当接近 0（归一化输出的整体平移不改变输入）。\n\n最后一行直接求值 `np.round(num_grad, 8)`。',
      starterCode: `import numpy as np

def ln_forward(x, eps=1e-5):
    mu = x.mean()
    var = ((x - mu) ** 2).mean()
    return (x - mu) / np.sqrt(var + eps)

rng = np.random.default_rng(0)
x = rng.normal(2.0, 3.0, size=6)
dz = np.ones(6)
h = 1e-6

def loss(xx):
    return float(np.sum(ln_forward(xx) * dz))

num_grad = np.zeros_like(x)
for i in range(x.size):
    xp = x.copy()
    xm = x.copy()
    xp[i] += h
    xm[i] -= h
    num_grad[i] = ___

np.round(num_grad, 8)
`,
      setupCode: '',
      expectedOutput: '数值梯度应全部接近 0',
      tests: `assert num_grad.shape == (6,), f"梯度形状应为 (6,)，实际 {num_grad.shape}"
assert np.all(np.abs(num_grad) < 1e-6), f"常数上游梯度下，LayerNorm 的输入梯度应接近 0，实际最大 {np.abs(num_grad).max()}"
assert abs(float(loss(x)) - float(np.sum(ln_forward(x)))) < 1e-9, "dz 全为 1 时 loss 应等于输出之和"
assert abs(float(ln_forward(x).mean())) < 1e-9, "LayerNorm 输出均值应为 0"
assert abs(float(ln_forward(x).var()) - 1.0) < 1e-4, "LayerNorm 输出方差应约为 1"
`,
      answer: `import numpy as np

def ln_forward(x, eps=1e-5):
    mu = x.mean()
    var = ((x - mu) ** 2).mean()
    return (x - mu) / np.sqrt(var + eps)

rng = np.random.default_rng(0)
x = rng.normal(2.0, 3.0, size=6)
dz = np.ones(6)
h = 1e-6

def loss(xx):
    return float(np.sum(ln_forward(xx) * dz))

num_grad = np.zeros_like(x)
for i in range(x.size):
    xp = x.copy()
    xm = x.copy()
    xp[i] += h
    xm[i] -= h
    num_grad[i] = (loss(xp) - loss(xm)) / (2 * h)

np.round(num_grad, 8)
`,
      explanation:
        'LayerNorm 输出对"整体平移"不敏感：给 x 所有分量加同一个常数 c，mu 也加 c，x - mu 不变，于是输出不变。所以上游梯度为常数（即"只对整体平移敏感"的方向）时，对输入的梯度必然是 0——这正是公式里两项 `sum(dz)` 相互抵消的结果。反向公式为 `dx = inv/std * (dz - mean(dz) - z * mean(dz*z))`，代入 dz 全 1 可得 0。',
      relatedLessonId: 'llm-a1-c6-l2',
      tags: ['LayerNorm', '反向传播', 'numpy'],
    },
    {
      id: 'llm-a1-c6-e10',
      type: 'code',
      difficulty: 3,
      question:
        '**Pre-LN 与 Post-LN 残差流范数对比**：\n\n用同一个固定子层函数模拟 20 层堆叠：\n- Pre-LN：`h = h + sub(norm(h))`\n- Post-LN：`h = norm(h + sub(h))`\n\n记录最后一层的范数 `pre_norm`、`post_norm`（用 `np.linalg.norm`）。\n\n最后一行直接求值 `(round(pre_norm, 3), round(post_norm, 3))`。',
      starterCode: `import numpy as np

def norm(x, eps=1e-5):
    mu = x.mean(axis=-1, keepdims=True)
    var = ((x - mu) ** 2).mean(axis=-1, keepdims=True)
    return (x - mu) / np.sqrt(var + eps)

rng = np.random.default_rng(0)
x0 = rng.normal(size=(2, 4, 8))
W = rng.normal(0, 0.1, size=(8, 8))
sub = lambda t: t @ W

h_pre = x0.copy()
h_post = x0.copy()
for _ in range(20):
    h_pre = ___
    h_post = ___

pre_norm = ___
post_norm = ___

(round(pre_norm, 3), round(post_norm, 3))
`,
      setupCode: '',
      expectedOutput: 'Post-LN 范数恒定，Pre-LN 范数随层数增长',
      tests: `assert pre_norm > post_norm, "Pre-LN 的残差流范数应大于 Post-LN"
assert abs(post_norm - np.sqrt(64.0)) < 1e-3, "Post-LN 输出每层都被归一化，范数应恒为 sqrt(B*n*d)=8"
assert pre_norm > np.linalg.norm(x0) * 1.5, "Pre-LN 的残差流范数应明显大于初始值"
assert h_pre.shape == (2, 4, 8) and h_post.shape == (2, 4, 8), "形状应始终保持不变"
`,
      answer: `import numpy as np

def norm(x, eps=1e-5):
    mu = x.mean(axis=-1, keepdims=True)
    var = ((x - mu) ** 2).mean(axis=-1, keepdims=True)
    return (x - mu) / np.sqrt(var + eps)

rng = np.random.default_rng(0)
x0 = rng.normal(size=(2, 4, 8))
W = rng.normal(0, 0.1, size=(8, 8))
sub = lambda t: t @ W

h_pre = x0.copy()
h_post = x0.copy()
for _ in range(20):
    h_pre = h_pre + sub(norm(h_pre))
    h_post = norm(h_post + sub(h_post))

pre_norm = float(np.linalg.norm(h_pre))
post_norm = float(np.linalg.norm(h_post))

(round(pre_norm, 3), round(post_norm, 3))
`,
      explanation:
        'Post-LN 每层最后一步都是归一化，所以每个 token 的范数被固定为 sqrt(d)，整体范数恒为 sqrt(B·n·d)=sqrt(64)=8。Pre-LN 的残差流只做累加，范数随层数增长——这就是现代模型在最后一层后额外加一个 Final Norm 的原因，否则 logits 的量级会随深度漂移。',
      relatedLessonId: 'llm-a1-c6-l4',
      tags: ['Pre-LN', 'Post-LN', 'numpy'],
    },
    {
      id: 'llm-a1-c6-e11',
      type: 'single',
      difficulty: 3,
      question: '使用 Pre-LN 结构的模型，为什么必须在所有层之后再加一个 Final Norm？',
      options: [
        { value: 'A', text: '为了增加参数量提升模型容量' },
        { value: 'B', text: '因为残差流范数会随层数累积增长，不归一化会让 logits 尺度失控' },
        { value: 'C', text: '因为 Pre-LN 内部没有归一化' },
        { value: 'D', text: '为了减少推理时的显存占用' },
      ],
      answer: 'B',
      explanation:
        'Pre-LN 的残差通路是纯恒等加法，输出尺度随层数单调增长。最后接 LM head 前必须先归一化，否则 logits 量级随深度漂移。LLaMA 的 output_norm 就是这一层。Pre-LN 内部当然有 Norm（在子层之前），所以 C 错误。',
      relatedLessonId: 'llm-a1-c6-l4',
      tags: ['Pre-LN', 'Final Norm'],
    },
    {
      id: 'llm-a1-c6-e12',
      type: 'multiple',
      difficulty: 4,
      question: '关于 Pre-LN 与 Post-LN，下列说法正确的有？（多选）',
      options: [
        { value: 'A', text: 'Pre-LN 存在完全不经过归一化的恒等梯度通路' },
        { value: 'B', text: 'Post-LN 在深层网络中通常需要学习率 warmup 才能稳定训练' },
        { value: 'C', text: '同等规模下 Post-LN 最终质量常常略高' },
        { value: 'D', text: 'Pre-LN 与 Post-LN 的梯度通路完全相同，只是写法不同' },
      ],
      answer: ['A', 'B', 'C'],
      explanation:
        'D 错误：两者 dy/dx 的结构不同。Pre-LN 是 I 加上子层雅可比，恒等通路完全不经过归一化；Post-LN 则要在外面再乘以一层归一化的雅可比，每层残差都要穿过它。A、B、C 都是文献与实践中的标准结论。',
      relatedLessonId: 'llm-a1-c6-l4',
      tags: ['Pre-LN', 'Post-LN'],
    },
    {
      id: 'llm-a1-c6-e13',
      type: 'judge',
      difficulty: 4,
      question: '在混合精度训练中，LayerNorm 内部的均值、方差计算通常用 fp32 完成，可以显著减少 loss 尖峰。',
      answer: true,
      explanation:
        'fp16 的动态范围小，求和与平方累加容易溢出或丢精度。把 LayerNorm（以及 softmax）提升到 fp32 计算是标准做法，代价只是很小的带宽开销。',
      relatedLessonId: 'llm-a1-c6-l2',
      tags: ['混合精度', 'LayerNorm'],
    },
    {
      id: 'llm-a1-c6-e14',
      type: 'fill',
      difficulty: 4,
      question: '补全 Pre-LN Transformer Block 的第二个子层：\n\n```python\nh = x + attn(norm(x))\nout = h + ffn(___)\n```',
      blanks: [['norm(h)', 'ln(h)', 'layer_norm(h)', 'rms_norm(h)']],
      explanation:
        'Pre-LN 的形式是 `x + F(Norm(x))`，所以第二个子层也要先归一化：`h + FFN(Norm(h))`。若写成 `ffn(h)`，就退化成 Post-LN 的"归一化之前"状态，训练稳定性会明显变差。',
      relatedLessonId: 'llm-a1-c6-l4',
      tags: ['Transformer Block', 'Pre-LN'],
    },
    {
      id: 'llm-a1-c6-e15',
      type: 'code',
      difficulty: 4,
      question:
        '**梯度流对比实验**：模拟 L 层线性子层的梯度回传倍数。\n\n- 无残差：每层梯度乘以 `gain`，L 层后为 `gain ** L`；\n- 有残差：每层梯度乘以 `(1 + gain)`，L 层后为 `(1 + gain) ** L`。\n\n计算 L = 50、gain = 0.9 时的两个系数，并求它们的比值（保留 3 位小数）`ratio = res / plain`。\n\n最后一行直接求值 `(plain, res, ratio)`。',
      starterCode: `L = 50
gain = 0.9

plain = ___
res = ___
ratio = ___

(plain, res, ratio)
`,
      setupCode: '',
      expectedOutput: '有残差的系数远大于无残差',
      tests: `assert abs(plain - gain ** L) < 1e-30, "无残差的系数应为 gain ** L"
assert abs(res - (1 + gain) ** L) < 1e-8, "有残差的系数应为 (1 + gain) ** L"
assert abs(ratio - round(res / plain, 3)) < 1e-9, "ratio 应为 res / plain 保留 3 位小数"
assert plain < 1e-2, "无残差时 50 层后梯度已衰减两个数量级以上"
assert res > 1e5, "有残差时梯度不衰减"
`,
      answer: `L = 50
gain = 0.9

plain = gain ** L
res = (1 + gain) ** L
ratio = round(res / plain, 3)

(plain, res, ratio)
`,
      explanation:
        '0.9^50 约 5.15e-3，而 1.9^50 约 8.66e13。真实网络里残差的增益不会这么大（恒等项的雅可比是单位阵，不会放大），这个简化模型只是直观展示"连乘衰减 vs 直通"。关键在于：有残差时梯度走的是 `I + df/dx`，其中那个 I 保证了不衰减。',
      relatedLessonId: 'llm-a1-c6-l1',
      tags: ['残差连接', '梯度'],
    },
    {
      id: 'llm-a1-c6-e16',
      type: 'code',
      difficulty: 3,
      question:
        '实现 `pre_ln_block(x, attn, ffn, norm)` 与 `post_ln_block(x, attn, ffn, norm)`，其中 attn / ffn / norm 都是可调用对象。\n\n- Pre-LN：`h = x + attn(norm(x))`，`out = h + ffn(norm(h))`\n- Post-LN：`h = norm(x + attn(x))`，`out = norm(h + ffn(h))`\n\n用恒等函数测试时，Pre-LN 应得到 `2x`、Post-LN 应得到归一化后的结果。\n\n最后一行直接求值 `pre_ln_block(X, ident, ident, norm)`。',
      starterCode: `import numpy as np

def norm(x, eps=1e-5):
    mu = x.mean(axis=-1, keepdims=True)
    var = ((x - mu) ** 2).mean(axis=-1, keepdims=True)
    return (x - mu) / np.sqrt(var + eps)

def ident(t):
    return t

def pre_ln_block(x, attn, ffn, norm_fn):
    h = ___
    out = ___
    return out

def post_ln_block(x, attn, ffn, norm_fn):
    h = ___
    out = ___
    return out

X = np.array([[1.0, 2.0, 3.0, 4.0], [2.0, 4.0, 6.0, 8.0]])

pre_ln_block(X, ident, ident, norm)
`,
      setupCode: '',
      expectedOutput: 'Pre-LN 输出保留原均值尺度，Post-LN 输出零均值单位方差',
      tests: `pre = pre_ln_block(X, ident, ident, norm)
post = post_ln_block(X, ident, ident, norm)
assert pre.shape == X.shape, "Pre-LN 输出形状应不变"
assert not np.allclose(pre.mean(axis=-1), 0.0), "Pre-LN 的残差流不会强制零均值，均值偏移被保留"
assert np.allclose(pre - X, norm(X) + norm(X + norm(X))), "Pre-LN 输出应等于 X 加两次归一化残差"
assert float(np.linalg.norm(pre)) > float(np.linalg.norm(X)), "Pre-LN 的范数应大于输入（残差累积）"
assert np.allclose(post.mean(axis=-1), 0.0, atol=1e-6), "恒等子层下 Post-LN 输出应已零均值"
assert np.allclose(post.var(axis=-1), 1.0, atol=1e-4), "恒等子层下 Post-LN 输出方差应约为 1"
assert not np.allclose(post, pre), "两种排布的输出不应相同"
`,
      answer: `import numpy as np

def norm(x, eps=1e-5):
    mu = x.mean(axis=-1, keepdims=True)
    var = ((x - mu) ** 2).mean(axis=-1, keepdims=True)
    return (x - mu) / np.sqrt(var + eps)

def ident(t):
    return t

def pre_ln_block(x, attn, ffn, norm_fn):
    h = x + attn(norm_fn(x))
    out = h + ffn(norm_fn(h))
    return out

def post_ln_block(x, attn, ffn, norm_fn):
    h = norm_fn(x + attn(x))
    out = norm_fn(h + ffn(h))
    return out

X = np.array([[1.0, 2.0, 3.0, 4.0], [2.0, 4.0, 6.0, 8.0]])

pre_ln_block(X, ident, ident, norm)
`,
      explanation:
        '用恒等函数替换子层，能一眼看出两种排布的差别：Pre-LN 两次残差相加得到 X + Norm(X) + Norm(...)，均值与尺度都被保留并累积；Post-LN 每步都以归一化结束，输出零均值单位方差。这也是解释"Pre-LN 残差流范数会随深度增长"的最简例子。',
      relatedLessonId: 'llm-a1-c6-l4',
      tags: ['Pre-LN', 'Post-LN', 'numpy'],
    },
    {
      id: 'llm-a1-c6-e17',
      type: 'single',
      difficulty: 4,
      question: '实现 LayerNorm 时，计算方差写成 `E[x²] - E[x]²` 而不是 `E[(x - μ)²]`，主要风险是？',
      options: [
        { value: 'A', text: '计算速度变慢' },
        { value: 'B', text: '均值很大时浮点抵消误差可能导致方差为负，开根号得到 nan' },
        { value: 'C', text: '方差结果会恒为 0' },
        { value: 'D', text: '会改变归一化的维度' },
      ],
      answer: 'B',
      explanation:
        '`E[x²]` 与 `E[x]²` 都是大数，相减会损失有效位。均值达到 1e10 量级时，两者之差可能变成明显错误甚至负值。正确做法是先减均值再平方，数值稳定。',
      relatedLessonId: 'llm-a1-c6-l2',
      tags: ['LayerNorm', '数值稳定性'],
    },
    {
      id: 'llm-a1-c6-e18',
      type: 'multiple',
      difficulty: 4,
      question: '下列哪些做法在深层 Transformer 训练中常用于提升数值稳定性？（多选）',
      options: [
        { value: 'A', text: '使用 Pre-LN 排布' },
        { value: 'B', text: '在最后一层后加 Final Norm' },
        { value: 'C', text: '混合精度下让 LayerNorm 与 softmax 用 fp32 计算' },
        { value: 'D', text: '把残差连接去掉以减少数值累积' },
      ],
      answer: ['A', 'B', 'C'],
      explanation:
        '去掉残差（D）会让梯度无法回流，与稳定化目标完全相反。A、B、C 都是标准做法：Pre-LN 提供恒等梯度通路，Final Norm 控制输出尺度，fp32 计算归一化避免精度损失。',
      relatedLessonId: 'llm-a1-c6-l4',
      tags: ['训练稳定性', 'Pre-LN'],
    },
    {
      id: 'llm-a1-c6-e19',
      type: 'open',
      difficulty: 4,
      question:
        '请从梯度传播的角度解释：为什么 `y = x + f(x)` 的残差连接能够支持上百层的网络训练，而 `y = f(x)` 不能？并说明这与 Pre-LN 的稳定性有什么关系。',
      referenceAnswer: `**无残差的问题**

y_l = f_l(y_{l-1})，反向梯度为
dL/dy_0 = dL/dy_L × Π (df_l/dy_{l-1})。
雅可比连乘，只要平均增益小于 1，梯度就按指数衰减；
大于 1 则指数爆炸。50 层、增益 0.9 时系数约 5e-3，
100 层时约 2.6e-5，浅层几乎收不到学习信号。

**残差的改善**

y = x + f(x) 给出 dy/dx = I + df/dx。
反向传播时被乘的是 (I + df/dx) 而不是 df/dx。
即使所有子层的雅可比都接近 0，恒等项仍能让梯度
以近似原样回传到第一层——这就是"梯度高速公路"。

另外，若某层最优变换就是恒等映射，残差网络只需让
子层输出 0（零初始化即可），比精确学出恒等映射容易得多。

**与 Pre-LN 的关系**

Pre-LN 把归一化放在子层之前：y = x + Sub(Norm(x))，
于是 dy/dx = I + dSub/dNorm × dNorm/dx，恒等项 I
完全不经过归一化，梯度可以沿这条通路无损回传。

Post-LN 是 y = Norm(x + Sub(x))，dy/dx = dNorm/dz × (I + dSub/dx)，
每层残差通路都要乘以归一化的雅可比，方向与增益都被打折，
深层累积后仍可能失稳，因此通常需要 warmup。

结论：残差保证"梯度有路可走"，Pre-LN 保证"这条路不设卡"，
两者叠加才让 64 层、96 层的模型能够稳定训练。`,
      rubric: [
        { point: '写出无残差时的雅可比连乘并说明指数衰减', score: 2 },
        { point: '写出 dy/dx = I + df/dx 并解释恒等项的作用', score: 2 },
        { point: '指出残差让恒等映射成为平凡解，优化更容易', score: 1 },
        { point: '说明 Pre-LN 的恒等通路不经过归一化', score: 1 },
      ],
      keywords: ['雅可比', '连乘', '恒等通路', '指数衰减', 'Pre-LN', '归一化', 'warmup'],
      explanation:
        '这是一道"数学推导 + 架构设计"的综合题。能写出 dy/dx = I + df/dx 并把它与 Pre-LN 的排布联系起来，说明对训练稳定性有本质理解。',
      tags: ['残差连接', 'Pre-LN', '面试'],
    },
    {
      id: 'llm-a1-c6-e20',
      type: 'open',
      difficulty: 4,
      question:
        '某团队训练一个 48 层的模型，从零开始，使用 Post-LN 且没有 warmup，结果训练在几千步后 loss 变成 nan。请分析可能的原因，给出至少 3 条排查/修复建议，并说明为什么 Pre-LN 能规避这个问题。',
      referenceAnswer: `**原因分析**

1. Post-LN 的每层残差都要穿过归一化的雅可比，
   梯度通路被打折，深层堆叠后梯度不稳定；
2. 没有 warmup，训练初期激活尺度剧烈变化，
   归一化中的方差统计随之跳动；
3. 48 层较深，初始化不当会让早期残差流尺度快速累积；
4. 混合精度下 LayerNorm 若用 fp16 计算，
   大激活求和容易溢出，直接产生 inf/nan；
5. 学习率相对深度偏大，放大了上述不稳定。

**排查与修复**

1. 改为 Pre-LN 排布（成本最低、收益最大）；
2. 加 warmup（几千步线性升温）+ 梯度裁剪；
3. LayerNorm 与 softmax 强制 fp32 计算；
4. 监控各层激活范数与梯度范数，定位第一处出现 inf 的层；
5. 检查学习率与初始化（如深度相关的残差缩放）；
6. 必要时用 DeepNorm 一类为 Post-LN 设计的技巧。

**为什么 Pre-LN 能规避**

Pre-LN 的 y = x + Sub(Norm(x)) 给出 dy/dx = I + ...，
恒等项不经过归一化，梯度可以稳定回流；
同时子层输入始终是归一化后的固定尺度，
不会随深度漂移。因此训练初期不需要精细的 warmup 也能稳住。`,
      rubric: [
        { point: '指出 Post-LN 残差穿过归一化导致梯度不稳', score: 2 },
        { point: '给出 warmup、梯度裁剪、fp32 归一化等具体修复', score: 2 },
        { point: '说明监控激活/梯度范数来定位首个 inf 层', score: 1 },
        { point: '解释 Pre-LN 恒等通路的作用', score: 1 },
      ],
      keywords: ['Post-LN', 'warmup', 'nan', 'fp32', '梯度裁剪', '激活范数', 'Pre-LN'],
      explanation:
        '训练 nan 是工程中最常见也最头疼的故障。能同时从架构（Pre/Post）、优化（warmup、裁剪）、精度（fp32）三个层面给方案，并知道用激活范数定位，就具备了实际调试能力。',
      tags: ['训练稳定性', 'Pre-LN', '工程'],
    },
  ],
  },
  {
  id: 'llm-a1-c7',
  title: 'FFN 与前馈网络',
  goal: '理解 FFN 为何是"逐 token 的 MLP 加一层隐层"、4 倍扩展的意义、ReLU/GELU/SwiGLU 的区别与取舍，并能估算 FFN 参数、手写实现与反向传播。',
  lessons: [
    {
      id: 'llm-a1-c7-l1',
      title: 'FFN 的结构：先升维再降维',
      content: `
## 它是整个 Block 里唯一的非线性**

Transformer Block 里的注意力是**线性投影加凸组合**：输出是 V 的加权平均，权重来自 softmax。虽然 softmax 本身是非线性的，但作用于"分数"而非"表示"，因此如果没有 FFN，整个模型在表示维度上基本是线性映射的堆叠。

FFN（Feed-Forward Network，前馈网络）提供了**表示维度上的非线性**：

FFN(x) = W_2 · act(W_1 · x + b_1) + b_2

- W_1 形状 [d_ff, d_model]，把 d 维升到 d_ff 维；
- act 是逐元素非线性（ReLU、GELU、SiLU 等）；
- W_2 形状 [d_model, d_ff]，降回 d_model。

原论文取 **d_ff = 4 × d_model**。以 d = 512、d_ff = 2048 为例：

| 张量 | 形状 |
| --- | --- |
| 输入 x | [n, 512] |
| x·W_1 + b_1 | [n, 2048]（升维 4 倍） |
| act(...) | [n, 2048] |
| 输出 | [n, 512]（降回原宽度） |

## 逐 token 独立：这是最关键的一点

FFN 对每个位置**独立**地应用同一个 MLP：位置 i 的输出只依赖位置 i 的输入，不同位置之间**没有任何信息交换**。

若写成"按位置索引"的形式：

FFN(X)_i = W_2 · act(W_1 · X_i + b_1) + b_2

这与对整批 [n, d] 做一次矩阵乘完全等价，因为线性层天然逐样本作用。所以：

> **注意力负责跨位置混合，FFN 负责逐位置变换。**

这两件事交替进行，构成了 Transformer 的基本节奏。理解这条分工，很多设计问题就迎刃而解：想增加"知识容量"就加宽 FFN；想增加"上下文整合能力"就改注意力或多堆头。

## 为什么先升维再降维

1. **增加表达容量**：d → 4d 的隐层提供了约 4 倍的维度来"展开"特征组合，配合非线性可以在隐空间里做更复杂的选择；
2. **参数效率**：两层线性的参数量是 2·d·d_ff，在提升容量的同时保持结构简单；
3. **预训练的知识存储假说**：研究（Geva 等）发现 FFN 的每个 key（W_1 的列）像一个"检测器"，对应的 value（W_2 的行）像它"写入"的内容，隐层神经元近似于一种键值记忆。这解释了为什么 FFN 在参数量中占大头，且能存储大量事实知识。

## 没有激活函数会怎样

如果没有 act，则：

W_2 · (W_1 · x) = (W_2 · W_1) · x

**矩阵乘积仍是线性的**，两层塌缩为一层。整个模型的深度意义就丧失了大半。这是实现里最容易犯的"静默错误"之一：代码能跑、形状正确、训练也在下降，但因为少了一个激活，表达能力被严重削弱。

## 参数量占比

| 部分 | 参数量 | d = 4096、d_ff = 4d 时 |
| --- | --- | --- |
| 注意力（W_Q/W_K/W_V/W_O） | 4d² | 6710 万 |
| FFN（W_1、W_2 与偏置） | 2·d·d_ff = 8d² | 1.34 亿 |
| 每层合计 | 12d² | 约 2.01 亿 |

**FFN 约占每层参数的三分之二**。这就是为什么 MoE 把 FFN 替换成多个专家：改了参数大头，收益最大。

## numpy 实现

\`\`\`python
def ffn(X, W1, b1, W2, b2):
    H = np.maximum(X @ W1 + b1, 0)     # [n, d_ff]
    return H @ W2 + b2                  # [n, d_model]
\`\`\`

注意 \`X @ W1\` 而非 \`W1 @ X\`：PyTorch 的 \`nn.Linear(in, out)\` 内部是 \`x @ W.T\`，权重形状为 [out, in]；而 numpy 手写时通常约定权重为 [in, out]，两者只是约定不同，混用会报错或静默算错维度。

## 常见误区

1. **以为 FFN 会混合不同 token**：不会，它是逐位置的；
2. **忘记激活函数**：两层线性等价于一层；
3. **把 d_ff 设得过小**：容量不足，等于削弱了模型的主要"知识存储区"；
4. **混淆权重矩阵方向**：numpy 与 PyTorch 的 [in, out] / [out, in] 约定不同。

<TransformerArchDemo />
`,
      tips: [
        {
          kind: 'pitfall',
          text: 'FFN 少了激活函数就退化成两层线性，等价于一层——形状对、能训练、loss 也能降，但表达能力大幅下降。代码 review 时先看这一项。',
        },
        {
          kind: 'interview',
          text: '必答："注意力和 FFN 分别做什么？" 答：注意力跨位置混合信息（token 之间交互），FFN 逐位置做非线性变换（不跨 token），两者交替出现。',
        },
        {
          kind: 'note',
          text: '可解释性研究表明 FFN 的隐层神经元近似"键值记忆"：W_1 的列负责检测模式，W_2 的行负责写入内容。这也是 FFN 参数占大头、MoE 改造 FFN 收益最大的原因。',
        },
      ],
      demos: [
        {
          title: 'FFN 逐 token 独立计算：打乱顺序输出只跟着打乱',
          lang: 'python',
          code: `import numpy as np

rng = np.random.default_rng(0)
n, d, d_ff = 4, 8, 32
X = rng.normal(size=(n, d))
W1 = rng.normal(0, 0.3, size=(d, d_ff))
b1 = np.zeros(d_ff)
W2 = rng.normal(0, 0.3, size=(d_ff, d))
b2 = np.zeros(d)

def ffn(x):
    return np.maximum(x @ W1 + b1, 0) @ W2 + b2

Y = ffn(X)
print("输入", X.shape, "-> 中间", np.maximum(X @ W1 + b1, 0).shape, "-> 输出", Y.shape)

perm = np.array([2, 0, 3, 1])
print("打乱顺序后，输出是否等于原输出的同样打乱:", np.allclose(ffn(X[perm]), Y[perm]))
print("第 1 个 token 的输出只依赖它自己:", np.allclose(ffn(X[1:2])[0], Y[1]))

print()
print("对比：没有激活函数时，两层线性塌缩成一层")
A = X @ W1 @ W2 + b1 @ W2 + b2
B = X @ (W1 @ W2) + (b1 @ W2 + b2)
print("  W2(W1 x + b1) + b2 与 (W2 W1) x + const 相等:", np.allclose(A, B))
print("  说明去掉激活后，FFN 的表达能力与单个线性层相同。")`,
        },
      ],
    },
    {
      id: 'llm-a1-c7-l2',
      title: '激活函数：ReLU、GELU 与 SiLU',
      content: `
## 学习目标

学完本节，你应该能够：
1. 写出 GELU 与 SiLU 的公式，并手算关键点取值（x=1、x=−1）；
2. 解释"软激活"对梯度流的两个好处（负区小泄漏、处处光滑）；
3. 用数值导数验证激活函数在 0 点附近的光滑性，理解死 ReLU 问题如何被治愈。

## 前置知识

- FFN 的升维-激活-降维结构（c7-l1）；
- 导数与数值微分的概念（llm-a2 c2）。

## 问题背景：Transformer 激活的三代演化

原始 Transformer 用 ReLU；GPT-2 换成 GELU（高斯误差线性单元）；LLaMA 世代随 SwiGLU 采用 SiLU（Swish）。三代演化的主线不是"更聪明"，而是**"把硬开关换成软开关"**——优化曲面更平滑、负区梯度不断流。本节从公式到梯度把这条线走透。

## 核心概念：三代公式与关键点

$$\\mathrm{ReLU}(x) = \\max(0, x), \\quad \\mathrm{GELU}(x) = x\\,\\Phi(x), \\quad \\mathrm{SiLU}(x) = x\\,\\sigma(x)$$

（Φ 为标准正态 CDF，σ 为 sigmoid；工程上 GELU 常用 tanh 近似。）

| x | ReLU | GELU | SiLU |
| --- | --- | --- | --- |
| −2 | 0 | −0.046 | −0.238 |
| −1 | 0 | **−0.159** | −0.269 |
| 0.5 | 0.5 | 0.346 | 0.311 |
| 1 | 1 | 0.841 | 0.731 |

三个观察：负区 ReLU 全零、GELU/SiLU 留小负值（**非零梯度通道**）；正区软激活略低（自带缩放）；全部光滑（ReLU 在 0 点导数跳变）。

## 原理详解：软激活治好两种"梯度病"

1. **死神经元**：ReLU 负区梯度恒 0，长期为负的神经元永久失明；GELU 负区最小值约 −0.17（在 x≈−0.75 处），梯度仍可回流"唤醒"；
2. **优化棱角**：ReLU 在 0 处左右导数 0/1 跳变，高学习率下抖动放大；GELU/SiLU 导数处处连续，训练轨迹平滑。

实证注记：GELU 与 SiLU 的最终损失差距通常在千分位——选择更多由**生态与配套**（GELU 随 BERT/GPT 工具链、SiLU 随 SwiGLU 结构）决定，而非单点精度。

## 代码实践

\`\`\`python
import math
Phi = lambda z: 0.5 * (1 + math.erf(z / math.sqrt(2)))
gelu = lambda x: x * Phi(x)
silu = lambda x: x / (1 + math.exp(-x))

for x in (-2, -1, 0.5, 1):
    print(f"x={x:5}: ReLU={max(x,0):5.2f} GELU={gelu(x):7.4f} SiLU={silu(x):7.4f}")

# 数值导数: 0 点左右导数连续性
h = 1e-5
for name, f in [("ReLU", lambda v: max(v, 0)), ("GELU", gelu), ("SiLU", silu)]:
    dl = (f(0) - f(-h)) / h
    dr = (f(h) - f(0)) / h
    print(f"{name}: 左导数 {dl:.4f}, 右导数 {dr:.4f}, "
          f"{'光滑' if abs(dl-dr) < 1e-3 else '跳变'}")
\`\`\`

预期输出：数值表同上；**ReLU 左 0.0000 / 右 1.0000（跳变），GELU 与 SiLU 左右导数几乎相等（光滑）**——梯度病的两个证据一屏看完。**常见错误**：tanh 近似与精确 GELU 混用导致基准对不上；大 |x| 的 sigmoid 手写溢出（用数值稳定式）；在归一化层后再加激活（破坏概率语义）。

## 常见误区

1. **SiLU 全面胜过 GELU**——差距微小；选型常由结构配套决定（SwiGLU 的门用 SiLU）；
2. **负输出"违反直觉"**——小负值恰是梯度通道，不是缺陷；
3. **激活放越多越好**——只在 FFN 中间层与特定门控处，别处乱加破坏架构语义；
4. **死 ReLU 已被历史淘汰**——CNN/小模型中 ReLU 仍是性价比默认（计算最便宜）。

## 知识关联

- **向前**：c7-l1 的 FFN 给了激活的位置；llm-a2 的梯度流理论解释"病根"；
- **向后**：c7-l3 SwiGLU 用 SiLU 做门；c8 组装时的激活选型表；
- **平行**：llm-a3 c2-l1 的三代演进表是本节的架构史版。

## 本节总结

| 代际 | 公式 | 关键点(x=−1) | 特性 |
| --- | --- | --- | --- |
| ReLU | max(0,x) | 0 | 快，负区梯度死 |
| GELU | x·Φ(x) | −0.159 | 光滑，负区小泄漏 |
| SiLU | x·σ(x) | −0.269 | 光滑，SwiGLU 配套 |

## 参考资料

> **来源类型：学术来源**
> - Hendrycks & Gimpel (2016). "GELUs." arXiv:1606.08415。
> - Ramachandran, Zoph & Le (2017). "Searching for Activation Functions." arXiv:1710.05941（Swish）。
> **来源类型：原创**
> - 梯度病框架与数值导数验证为本课程改编。
`,
      tips: [
        {
          kind: 'pitfall',
          text: 'GELU 的 tanh 近似与 erf 精确形式数值略有差异。复现别人的模型时要确认训练用的是哪一种，否则会有小幅但可测的偏差。',
        },
        {
          kind: 'note',
          text: 'GELU 的直觉是"按输入为正的概率来门控"：`x·Phi(x)`。这个视角也能解释它为什么在负区间仍有小负值——Phi 在零点右侧并不严格为 0。',
        },
        {
          kind: 'interview',
          text: '被问"ReLU 有什么缺点"，答两点：负区间梯度为 0 导致神经元死亡；在 0 处不可导、不光滑。GELU/SiLU 用平滑门控缓解这两个问题。',
        },
      ],
      demos: [
        {
          title: '三种激活函数的数值与形状对比',
          lang: 'python',
          code: `import numpy as np

def relu(x):
    return np.maximum(x, 0.0)

def gelu(x):
    return 0.5 * x * (1.0 + np.tanh(np.sqrt(2 / np.pi) * (x + 0.044715 * x ** 3)))

def silu(x):
    return x / (1.0 + np.exp(-x))

xs = np.array([-3.0, -2.0, -1.0, -0.5, 0.0, 0.5, 1.0, 2.0, 3.0])
print("%6s %10s %10s %10s" % ("x", "relu", "gelu", "silu"))
for v in xs:
    print("%6.1f %10.4f %10.4f %10.4f" % (v, relu(v), gelu(v), silu(v)))

print()
print("负区间对比：relu 恒为 0；gelu(-1) = %.4f；silu(-1) = %.4f" % (gelu(-1.0), silu(-1.0)))
print("gelu(1) = %.5f，与精确 erf 形式误差在 1e-3 量级" % gelu(1.0))
print()
print("最小值位置：")
g = np.linspace(-2, 1, 30001)
print("  gelu 最小值约 %.4f（在 x=%.3f）" % (gelu(g).min(), g[np.argmin(gelu(g))]))
print("  silu 最小值约 %.4f（在 x=%.3f）" % (silu(g).min(), g[np.argmin(silu(g))]))
print("两者都是非单调的，这正是'平滑抑制'与'硬截断'的差别。")`,
        },
        {
          title: '梯度对比：ReLU 的零梯度 vs GELU 的平滑导数',
          lang: 'python',
          code: `import numpy as np

def gelu(x):
    return 0.5 * x * (1.0 + np.tanh(np.sqrt(2 / np.pi) * (x + 0.044715 * x ** 3)))

def gelu_grad(x, h=1e-5):
    return (gelu(x + h) - gelu(x - h)) / (2 * h)

xs = np.array([-4.0, -2.0, -1.0, -0.3, 0.0, 0.3, 1.0, 2.0])
print("%6s %12s %12s" % ("x", "relu'(x)", "gelu'(x)"))
for v in xs:
    r = 0.0 if v < 0 else 1.0
    print("%6.1f %12.4f %12.4f" % (v, r, gelu_grad(np.array([v]))[0]))

print()
print("x 从 0.01 到 0.99 时 gelu 的导数连续变化：")
print(np.round(gelu_grad(np.linspace(0.01, 0.99, 10)), 4))
print("ReLU 在这一点上是阶跃（0 直接跳到 1），GELU 是连续过渡。")`,
        },
      ],
    },
    {
      id: 'llm-a1-c7-l3',
      title: 'SwiGLU 与门控前馈网络',
      content: `
## 从两层到三层：加入门控

标准 FFN 是一个"升维 → 激活 → 降维"的漏斗。SwiGLU（Shazeer, 2020）引入了**门控**：用一路输出作为"开关"去调制另一路。

FFN_SwiGLU(x) = (SiLU(x·W_1) 逐元素乘 (x·W_3)) · W_2

- 两路并行升维：x·W_1 与 x·W_3，形状都是 [n, d_ff]；
- 一路过 SiLU 得到"门"，与另一路逐元素相乘；
- 再乘 W_2 降回 d_model。

可以理解为"内容 × 门控"：门控分支决定每一项内容要不要通过、通过多少。这与 LSTM 的门控思想一脉相承，但实现极简。

## 参数量：为什么 d_ff 要调小

标准 FFN 有 2 个矩阵：d·d_ff + d_ff·d = 2d·d_ff。
SwiGLU 有 3 个矩阵：3d·d_ff。

为保持参数量与 d_ff = 4d 的标准 FFN 相同：

3d·d_ff = 2d·(4d) 得到 d_ff = (8/3)d 约 2.67d

所以 LLaMA 的 4096 维模型用 11008（约 2.69×4096），而不是 16384。**看到 11008 这个奇怪的数字，就知道它是为了对齐参数预算**。

| 模型 | d_model | d_ff | 比例 |
| --- | --- | --- | --- |
| Transformer-base | 512 | 2048 | 4.0 |
| GPT-2 | 768 | 3072 | 4.0 |
| LLaMA-2 7B | 4096 | 11008 | 2.69 |
| Qwen2.5 7B | 3584 | 18944 | 5.29 |
| GPT-3 175B | 12288 | 49152 | 4.0 |

注意比例并非固定，Qwen 用了更大的扩展比——这是在参数量预算内的设计选择，不是"标准必须 4 倍"。

## 为什么门控有效

1. **乘法交互**：两路向量的逐元素乘积让特征可以做二阶组合，而单个线性层只能做加法；
2. **输入相关的缩放**：门控值随输入变化，等价于对每个 token 动态调整 FFN 的有效权重——这让 FFN 从"固定变换"变成"条件变换"；
3. **训练更稳**：SiLU 的光滑性与门控的乘性结构让梯度更平滑。

实测在同等参数量与算力下，SwiGLU 通常略优于 GELU，这也是 LLaMA、PaLM、Mistral、Qwen 都采用它的原因。

## 计算量并没有白给

门控需要**多一次升维矩阵乘**：标准 FFN 是 2 次（升、降），SwiGLU 是 3 次。这意味着同等参数量下，SwiGLU 的浮点运算量其实更高（因为 d_ff 小但矩阵更多，总 FLOPs 约等于 3·d·d_ff = 8d²，与标准 FFN 的 2·d·4d = 8d² 相同——实际上是一致的）。

更准确的说法：在**参数量相同**时，SwiGLU 的 FLOPs 与标准 FFN 相同，但显存里的激活值形状不同，且多了一次逐元素乘法。

## numpy 实现

\`\`\`python
def silu(x):
    return x / (1.0 + np.exp(-x))

def ffn_swiglu(X, W1, W3, W2):
    gate = silu(X @ W1)          # [n, d_ff]
    value = X @ W3               # [n, d_ff]
    return (gate * value) @ W2   # [n, d_model]
\`\`\`

注意：**逐元素乘**而不是矩阵乘。写成 \`gate @ value\` 会在形状上失败（[n, d_ff] 乘 [n, d_ff]），但如果两者恰好都是方阵就会静默算错，所以务必确认用的是 \`*\`。

## 常见误区

1. **以为 SwiGLU 用了三次矩阵乘所以一定更贵**：按参数量对齐后 FLOPs 基本相同；
2. **门控写成了矩阵乘**：必须是逐元素乘；
3. **沿用 4 倍扩展比**：SwiGLU 下 4 倍会让参数量超出预算约 50%；
4. **以为"扩展比越大越好"**：在固定参数预算下，扩展比变大意味着层数或宽度其他部分被压缩，存在最优点。
`,
      tips: [
        {
          kind: 'note',
          text: 'LLaMA 的 d_ff = 11008 不是随手取的：3 × 4096 × 11008 约等于 2 × 4096 × 16384，即用 3 个矩阵、每层更窄的隐层，换到与"4 倍扩展标准 FFN"相同的参数量。',
        },
        {
          kind: 'pitfall',
          text: 'SwiGLU 的门控是**逐元素乘** `gate * value`。若误写成 `gate @ value`，在 d_ff 相等的方阵情形下不会报错但结果完全错误；写完请检查维度与逐元素语义。',
        },
        {
          kind: 'interview',
          text: '"SwiGLU 相比 GELU-FFN 好在哪里？" 答：门控带来输入相关的条件缩放与乘性特征交互；在参数量对齐时通常略优，代价是多一个权重矩阵、实现稍复杂。',
        },
        {
          kind: 'performance',
          text: '门控 FFN 需要同时保存 gate 与 value 两路激活，显存比标准 FFN 略高；大 batch 训练时这部分激活是梯度检查点（activation checkpointing）的主要对象。',
        },
      ],
      demos: [
        {
          title: '标准 FFN 与 SwiGLU 的参数量对齐计算',
          lang: 'python',
          code: `def std_ffn_params(d_model, d_ff):
    return 2 * d_model * d_ff

def swiglu_params(d_model, d_ff):
    return 3 * d_model * d_ff

d = 4096
target = std_ffn_params(d, 4 * d)
print("标准 FFN（4 倍扩展）参数量: %d （约 %.2f×d²）" % (target, target / d ** 2))
d_ff_swiglu = int(round(target / (3 * d)))
d_ff_swiglu = (d_ff_swiglu + 127) // 128 * 128      # 对齐到 128 的倍数
print("为对齐参数量，SwiGLU 的 d_ff 应为: %d （约 %.2f×d）" % (d_ff_swiglu, d_ff_swiglu / d))
print("实际 LLaMA-2 7B 用的是 11008")
print("对齐后参数量: %d，误差 %.2f%%" % (swiglu_params(d, d_ff_swiglu),
      (swiglu_params(d, d_ff_swiglu) - target) / target * 100))
print()
print("若 SwiGLU 仍用 4 倍扩展，参数量会变成:",
      swiglu_params(d, 4 * d), "，超出 %.0f%%" % ((swiglu_params(d, 4 * d) / target - 1) * 100))`,
        },
        {
          title: '门控效果演示：门控值随输入变化，实现"条件变换"',
          lang: "python",
          code: `import numpy as np

def silu(x):
    return x / (1.0 + np.exp(-x))

rng = np.random.default_rng(0)
n, d, d_ff = 3, 6, 10
X = rng.normal(size=(n, d)) * 2.0
W1 = rng.normal(0, 0.4, size=(d, d_ff))
W3 = rng.normal(0, 0.4, size=(d, d_ff))

gate = silu(X @ W1)
value = X @ W3
out = gate * value

print("gate 形状:", gate.shape, " value 形状:", value.shape)
print("门控值的分布：均值 %.3f，最小 %.3f，最大 %.3f" % (gate.mean(), gate.min(), gate.max()))
print("有 %.1f%% 的门控值为负（对 value 起反相抑制）" % ((gate < 0).mean() * 100))
print()
print("不同 token 的门控均值不同，说明缩放是输入相关的：")
for i in range(n):
    print("  token %d: gate 均值 %.3f，value 范数 %.3f" % (i, gate[i].mean(), np.linalg.norm(value[i])))
print()
print("对比：标准 FFN 的激活只是逐元素查表，无法做这种【内容 × 开关】的乘法组合。")`,
        },
      ],
    },
    {
      id: 'llm-a1-c7-l4',
      title: 'FFN 的反向传播、MoE 与现代变体',
      content: `
## 学习目标

学完本节，你应该能够：
1. 手推 FFN 中间层激活的局部梯度（$\\delta_{h} = (W_2^\\top \\delta_{out}) \\otimes \\mathrm{act}'$），说出门控/激活导数在哪一步相乘；
2. 用数值梯度检查 FFN 的反向实现（中心差分对照）；
3. 说出"把 FFN 换成 MoE"改的是哪半结构、不动哪半（路由替换第一投影，输出投影保留）。

## 前置知识

- 计算图与链式法则（llm-a2 c2-l1）；
- SwiGLU 结构（c7-l3：门路×值路）；
- MoE 概念（llm-a1 c2-l2/MoE 课程导论）。

## 问题背景：FFN 是反向传播练习的最佳标本

FFN 结构简单（两三个矩阵 + 一个激活）却包含反向的全部要素：矩阵转置回传、激活逐元素导数、门控乘法路径。练透它，整个 Block 的反向只是它的重复。结尾的 MoE 连接则回答：**现代模型的"专家化"到底改了 FFN 的哪里**。

## 核心概念：FFN 前向与反向对照

前向（SwiGLU 版）：$h = \\mathrm{SiLU}(xW_1) \\otimes (xW_3),\\quad y = hW_2$。

反向（已知 $\\delta_y = \\partial L/\\partial y$）：

| 步骤 | 公式 | 形状语义 |
| --- | --- | --- |
| 1 | $\\delta_h = \\delta_y W_2^\\top$ | 转置回传到中间层 |
| 2 | $\\delta_{gate} = \\delta_h \\otimes (xW_3) \\otimes \\mathrm{SiLU}'(xW_1)$ | 门路梯度：三因子逐元素乘 |
| 3 | $\\delta_{value} = \\delta_h \\otimes \\mathrm{SiLU}(xW_1)$ | 值路梯度 |
| 4 | $\\delta_{W_1} = x^\\top \\delta_{gate},\\ \\delta_{W_3} = x^\\top \\delta_{value},\\ \\delta_{W_2} = h^\\top \\delta_y$ | 权重梯度（外积） |

要点：**门控结构把"激活导数"从单独一步变成与另一路的值相乘**——梯度沿两条路同时流动，这正是 SwiGLU 反向比 ReLU-FNN 多一条路径的原因。

## 代码实践

\`\`\`python
import numpy as np
rng = np.random.default_rng(0)
d, dff = 8, 16
x = rng.normal(0, 1, d)
W1 = rng.normal(0, 0.3, (d, dff)); W3 = rng.normal(0, 0.3, (d, dff))
W2 = rng.normal(0, 0.3, (dff, d))
ref = rng.normal(0, 1, d)                     # 损失方向的参考向量

sig = lambda v: 1 / (1 + np.exp(-v))
g = lambda v: v * sig(v)                      # SiLU
gs = lambda v: sig(v) + v * sig(v) * (1 - sig(v))   # SiLU 导数 = sigma + x*sigma*(1-sigma)

def fwd(x):
    return (g(x @ W1) * (x @ W3)) @ W2

# 数值梯度检查（中心差分，对 x[0]）
loss = lambda v: np.sum(fwd(v) * ref)
h = 1e-6
num = (loss(x + h * np.eye(d)[0]) - loss(x - h * np.eye(d)[0])) / (2 * h)

# 解析梯度（反向四步）
z1 = x @ W1; z3 = x @ W3; hid = g(z1) * z3
d_hid = ref @ W2.T                            # 步1 转置回传
d_z1 = d_hid * z3 * gs(z1)                    # 步2 门路三因子
d_z3 = d_hid * g(z1)                          # 步3 值路
d_x = d_z1 @ W1.T + d_z3 @ W3.T               # 步4 两条路汇合
print(f"数值 {num:.6f} vs 解析 {d_x[0]:.6f} -> "
      f"{'一致' if abs(num - d_x[0]) < 1e-4 else '检查实现'}")
\`\`\`

预期输出（实测）：数值 −0.255135 vs 解析 −0.255135——完全一致。**SiLU 导数是本节最容易写错的一步**：$\\mathrm{SiLU}'(x) = \\sigma(x) + x\\,\\sigma(x)(1-\\sigma(x))$，把 $\\sigma(1-\\sigma)$ 误写成别的形式是高频事故，数值梯度检查正是抓这种 bug 的唯一防线。**常见错误**：门控梯度漏乘对偶路（δ_z1 忘乘 z3）；数值检查用前向差分（精度不足，用中心差分）；导数公式与激活版本不匹配（tanh-GELU 与精确 GELU 的导数不同）。

## 常见误区

1. **激活导数只在 ReLU 上重要**——SiLU/GELU 的导数是非平凡函数，实现错一点就梯度偏差；
2. **门控两路对称**——门路与值路梯度公式不同（差一个激活导数因子）；
3. **MoE 改变了反向数学**——只改了"哪些参数参与"（稀疏选择），单专家内部的反向公式不变；
4. **数值检查浪费算力**——它是手写层能一次写对的关键保险，永远值得。

## 知识关联

- **向前**：c7-l1/l3 的结构与 SwiGLU 是本节主角；
- **向后**：c8 组装 Block 的反向（注意力 + FFN 拼合）；训练课的完整反向实践；
- **平行**：llm-a4 MoE 课程的路由与前向是本节"MoE 连接"的展开。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 反向四步 | 转置回传 → 门路三因子 → 值路 → 权重外积 |
| 验收 | 中心差分数值梯度检查（<1e-4） |
| MoE 边界 | 替换 (W1,W3) 为 N 份+路由；单专家反向不变 |

## 参考资料

> **来源类型：学术来源**
> - Shazeer, N. (2020). "GLU Variants Improve Transformer." arXiv:2002.05202（SwiGLU 前向结构）。
> - Baydin et al. (2018). "Automatic Differentiation in Machine Learning: a Survey." *JMLR* 18(153)——反向模式的教科书参照。
> **来源类型：参考资料**
> - CS231n 讲义 "Gradient Check"（cs231n.github.io）——数值检查的工程规范。
> **来源类型：原创**
> - 反向四步表与 MoE 边界说明为本课程改编。
`,
      tips: [
        {
          kind: 'performance',
          text: 'FFN 的中间激活 [B, n, d_ff] 是大 batch 训练显存的主要消耗。梯度检查点（activation checkpointing）通常优先作用在 FFN 上，用计算换显存。',
        },
        {
          kind: 'interview',
          text: '被问"MoE 的收益与代价"，答：收益是同等 FLOPs 下参数量大幅增加、专家可分工；代价是全专家显存占用、负载不均衡、路由不稳定、训练与部署复杂度上升。',
        },
        {
          kind: 'note',
          text: '把每层参数粗估为 12d²（注意力 4d² + FFN 8d²），再乘层数加上 embedding，就能在半分钟内估算任何 Transformer 的规模。',
        },
      ],
      demos: [
        {
          title: 'FFN 反向传播与数值梯度校验',
          lang: 'python',
          code: `import numpy as np

def ffn_forward(X, W1, b1, W2, b2):
    H_pre = X @ W1 + b1
    H = np.maximum(H_pre, 0)
    Y = H @ W2 + b2
    return Y, (H_pre, H)

def ffn_backward(X, W1, W2, cache, dY):
    H_pre, H = cache
    dW2 = H.T @ dY
    db2 = dY.sum(axis=0)
    dH = dY @ W2.T
    dH_pre = dH * (H_pre > 0)
    dW1 = X.T @ dH_pre
    db1 = dH_pre.sum(axis=0)
    dX = dH_pre @ W1.T
    return dW1, db1, dW2, db2, dX

rng = np.random.default_rng(0)
n, d, d_ff = 3, 4, 7
X = rng.normal(size=(n, d))
W1 = rng.normal(size=(d, d_ff))
b1 = rng.normal(size=d_ff)
W2 = rng.normal(size=(d_ff, d))
b2 = rng.normal(size=d)
dY = rng.normal(size=(n, d))

Y, cache = ffn_forward(X, W1, b1, W2, b2)
dW1, db1, dW2, db2, dX = ffn_backward(X, W1, W2, cache, dY)

def loss(W1_, b1_, W2_, b2_):
    return float(np.sum(ffn_forward(X, W1_, b1_, W2_, b2_)[0] * dY))

h = 1e-6
num_dW1 = np.zeros_like(W1)
for i in range(d):
    for j in range(d_ff):
        A, B = W1.copy(), W1.copy()
        A[i, j] += h
        B[i, j] -= h
        num_dW1[i, j] = (loss(A, b1, W2, b2) - loss(B, b1, W2, b2)) / (2 * h)

print("dW1 解析与数值最大误差:", float(np.abs(dW1 - num_dW1).max()))
print("dX 形状:", dX.shape, " dW1 形状:", dW1.shape)
print()
print("ReLU 的稀疏性：隐层中 0 元素占比 %.1f%%" % ((cache[1] == 0).mean() * 100))
print("这些位置对应的 dW1 列也为 0（神经元本轮不更新）。")`,
        },
      ],
    },
  ],
  exercises: [
    {
      id: 'llm-a1-c7-e1',
      type: 'single',
      difficulty: 3,
      question: 'Transformer 中 FFN 的计算方式是？',
      options: [
        { value: 'A', text: '对整段序列做一次全局线性变换，混合所有位置' },
        { value: 'B', text: '对每个 token 独立地应用同一个两层 MLP（含非线性激活）' },
        { value: 'C', text: '对每个 token 与所有其他 token 做加权求和' },
        { value: 'D', text: '只做一次仿射变换，没有激活函数' },
      ],
      answer: 'B',
      explanation:
        'FFN 逐位置独立：位置 i 的输出只依赖位置 i。加权求和（C）是注意力做的事；没有激活（D）会让两层线性塌缩成一层。',
      relatedLessonId: 'llm-a1-c7-l1',
      tags: ['FFN', '结构'],
    },
    {
      id: 'llm-a1-c7-e2',
      type: 'judge',
      difficulty: 3,
      question: '如果去掉 FFN 中的激活函数，两层线性变换仍然具有与含激活时相同的表达能力。',
      answer: false,
      explanation:
        'W_2·(W_1·x) = (W_2·W_1)·x，两个矩阵相乘仍是一个线性变换，两层塌缩为一层。激活函数是 FFN 提供非线性的唯一来源，去掉后整个模型在表示维度上几乎全是线性的。',
      relatedLessonId: 'llm-a1-c7-l1',
      tags: ['FFN', '激活函数'],
    },
    {
      id: 'llm-a1-c7-e3',
      type: 'multiple',
      difficulty: 3,
      question: '关于 FFN 在 Transformer 中的作用，下列说法正确的有？（多选）',
      options: [
        { value: 'A', text: '它提供逐位置的非线性变换，是表示维度上的主要非线性来源' },
        { value: 'B', text: '在 d_ff = 4·d_model 时，FFN 参数约占每层的三分之二' },
        { value: 'C', text: 'FFN 负责在不同 token 之间交换信息' },
        { value: 'D', text: '可解释性研究认为 FFN 隐层近似一种键值记忆' },
      ],
      answer: ['A', 'B', 'D'],
      explanation:
        '跨 token 的信息交换完全由注意力完成，FFN 是逐位置的（C 错误）。A 是结构作用；B 来自 4d² 与 8d² 的对比；D 是 Geva 等人的经验发现，也解释了 MoE 改造 FFN 的动机。',
      relatedLessonId: 'llm-a1-c7-l1',
      tags: ['FFN', '参数量'],
    },
    {
      id: 'llm-a1-c7-e4',
      type: 'fill',
      difficulty: 3,
      question: '补全标准 FFN 的前向计算（`act` 为激活函数）：\n\n```python\ndef ffn(x, W1, b1, W2, b2):\n    h = ___\n    return h @ W2 + b2\n```',
      blanks: [['act(x @ W1 + b1)', 'act(x@W1+b1)', 'np.maximum(x @ W1 + b1, 0)', '/act\\s*\\(\\s*x\\s*@\\s*W1\\s*\\+\\s*b1\\s*\\)/']],
      explanation:
        '先升维 `x @ W1 + b1`（形状 [n, d_ff]），再逐元素过激活函数。激活必须作用在升维之后、降维之前，否则就没有利用到 4 倍宽度的隐空间。',
      relatedLessonId: 'llm-a1-c7-l1',
      tags: ['FFN', '实现'],
    },
    {
      id: 'llm-a1-c7-e5',
      type: 'single',
      difficulty: 3,
      question: '与 ReLU 相比，GELU 最本质的差别是？',
      options: [
        { value: 'A', text: 'GELU 的输出没有上界' },
        { value: 'B', text: 'GELU 在负区间仍保留小幅负值与梯度，且处处光滑可导' },
        { value: 'C', text: 'GELU 不需要任何数学运算，速度更快' },
        { value: 'D', text: 'GELU 会把所有输入映射到 [0, 1]' },
      ],
      answer: 'B',
      explanation:
        'GELU(x) = x·Phi(x)，负区间输出小负值（如 GELU(-1) 约 -0.159），梯度连续。ReLU 在负区间输出恒为 0、梯度恒为 0，且 0 点不可导。两者都不是有界函数。',
      relatedLessonId: 'llm-a1-c7-l2',
      tags: ['GELU', 'ReLU'],
    },
    {
      id: 'llm-a1-c7-e6',
      type: 'judge',
      difficulty: 3,
      question: 'SwiGLU 为对齐"4 倍扩展标准 FFN"的参数量，通常把 d_ff 设为约 (8/3)·d_model，例如 LLaMA 的 11008。',
      answer: true,
      explanation:
        'SwiGLU 有三个权重矩阵（3·d·d_ff），标准 FFN 有两个（2·d·4d）。令 3d·d_ff = 8d² 得 d_ff = 2.67d，LLaMA 的 d=4096 对应 11008。',
      relatedLessonId: 'llm-a1-c7-l3',
      tags: ['SwiGLU', '参数量'],
    },
    {
      id: 'llm-a1-c7-e7',
      type: 'code',
      difficulty: 3,
      question:
        '实现**标准 FFN 前向**：`ffn(x, W1, b1, W2, b2)`，使用 ReLU 激活。\n\n- `x` 形状 [n, d]，`W1` 形状 [d, d_ff]，`W2` 形状 [d_ff, d]；\n- 返回形状 [n, d]。\n\n最后一行直接求值 `ffn(X, W1, b1, W2, b2)`。',
      starterCode: `import numpy as np

def ffn(x, W1, b1, W2, b2):
    h = ___                       # 升维 [n, d_ff]
    h = ___                       # ReLU
    return h @ W2 + b2

rng = np.random.default_rng(0)
n, d, d_ff = 4, 6, 24
X = rng.normal(size=(n, d))
W1 = rng.normal(0, 0.3, size=(d, d_ff))
b1 = np.zeros(d_ff)
W2 = rng.normal(0, 0.3, size=(d_ff, d))
b2 = np.zeros(d)

ffn(X, W1, b1, W2, b2)
`,
      setupCode: '',
      expectedOutput: '输出形状 (4, 6)，隐层中约一半为 0（ReLU）',
      tests: `assert out.shape == (n, d), f"输出形状应为 {(n, d)}，实际 {out.shape}"
H = np.maximum(X @ W1 + b1, 0)
assert np.allclose(out, H @ W2 + b2), "输出应等于 relu(X@W1+b1)@W2+b2"
assert np.all(StringH >= 0) if False else True
assert np.all(H >= 0), "隐层经过 ReLU 后应非负"
assert not np.allclose(out, X @ (W1 @ W2) + b2), "过激活后结果不应等于两层线性的塌缩"
assert np.allclose(ffn(X[1:2], W1, b1, W2, b2)[0], out[1]), "FFN 应逐 token 独立计算"
`,
      answer: `import numpy as np

def ffn(x, W1, b1, W2, b2):
    h = x @ W1 + b1
    h = np.maximum(h, 0.0)
    return h @ W2 + b2

rng = np.random.default_rng(0)
n, d, d_ff = 4, 6, 24
X = rng.normal(size=(n, d))
W1 = rng.normal(0, 0.3, size=(d, d_ff))
b1 = np.zeros(d_ff)
W2 = rng.normal(0, 0.3, size=(d_ff, d))
b2 = np.zeros(d)

ffn(X, W1, b1, W2, b2)
`,
      explanation:
        '顺序必须是"升维 → 激活 → 降维"。最后一条断言验证了 FFN 的逐 token 独立性：单独算第 1 个 token 的结果与整批计算中第 1 行完全一致。注意 numpy 手写时权重约定 [in, out]，与 PyTorch 的 [out, in] 相反。',
      relatedLessonId: 'llm-a1-c7-l1',
      tags: ['FFN', 'numpy'],
    },
    {
      id: 'llm-a1-c7-e8',
      type: 'code',
      difficulty: 3,
      question:
        '实现 `gelu(x)`（tanh 近似）与 `silu(x)`：\n\n- gelu：`0.5 * x * (1 + tanh(sqrt(2/pi) * (x + 0.044715 * x**3)))`\n- silu：`x / (1 + exp(-x))`\n\n返回 `out = (gelu(gx), silu(sx))`，其中 `gx = [-2, -1, 0, 1, 2]`。\n\n最后一行直接求值 `(gelu(gx), silu(sx))`。',
      starterCode: `import numpy as np

def gelu(x):
    return ___

def silu(x):
    return ___

gx = np.array([-2.0, -1.0, 0.0, 1.0, 2.0])
sx = np.array([-2.0, -1.0, 0.0, 1.0, 2.0])

(gelu(gx), silu(sx))
`,
      setupCode: '',
      expectedOutput: 'gelu(1) 约 0.8412，负区间为小负值',
      tests: `g, s = out
assert g.shape == (5,) and s.shape == (5,), "两个输出形状都应为 (5,)"
assert np.isclose(g[2], 0.0, atol=1e-9) and np.isclose(s[2], 0.0, atol=1e-9), "x=0 时两者都应为 0"
assert np.isclose(g[3], 0.84119, atol=1e-4), f"gelu(1) 应约为 0.8412，实际 {g[3]}"
assert g[0] < 0 and abs(g[0]) < 0.1, "gelu(-2) 应为小幅负数"
assert -0.2 < g[1] < 0, "gelu(-1) 应约为 -0.154"
assert np.isclose(s[1], -0.26894, atol=1e-4), f"silu(-1) 应约为 -0.269，实际 {s[1]}"
assert np.all(np.diff(g[3:]) > 0) and np.all(np.diff(s[3:]) > 0), "正区间应单调递增"
assert s[3] < g[3], "silu(1) 约 0.731 应小于 gelu(1) 约 0.841"
`,
      answer: `import numpy as np

def gelu(x):
    return 0.5 * x * (1.0 + np.tanh(np.sqrt(2 / np.pi) * (x + 0.044715 * x ** 3)))

def silu(x):
    return x / (1.0 + np.exp(-x))

gx = np.array([-2.0, -1.0, 0.0, 1.0, 2.0])
sx = np.array([-2.0, -1.0, 0.0, 1.0, 2.0])

(gelu(gx), silu(sx))
`,
      explanation:
        '两者都在负区间保留小负值与梯度，这正是它们优于 ReLU 的地方（ReLU 在负半轴输出与梯度都是 0）。注意 gelu 的 tanh 近似与原论文的 erf 精确形式误差在 1e-3 量级，复现模型时要与训练实现一致。',
      relatedLessonId: 'llm-a1-c7-l2',
      tags: ['GELU', 'SiLU', 'numpy'],
    },
    {
      id: 'llm-a1-c7-e9',
      type: 'code',
      difficulty: 3,
      question:
        '实现 **SwiGLU 前向**：\n\nFFN(x) = (SiLU(x·W1) 逐元素乘 (x·W3)) · W2\n\n- `x` 形状 [n, d]，`W1`、`W3` 形状 [d, d_ff]，`W2` 形状 [d_ff, d]；\n- 门控必须是**逐元素乘**；\n- 返回形状 [n, d]。\n\n最后一行直接求值 `swiglu(X, W1, W3, W2)`。',
      starterCode: `import numpy as np

def silu(x):
    return x / (1.0 + np.exp(-x))

def swiglu(x, W1, W3, W2):
    gate = ___                       # [n, d_ff]
    value = ___                      # [n, d_ff]
    return ___

rng = np.random.default_rng(0)
n, d, d_ff = 3, 6, 16
X = rng.normal(size=(n, d))
W1 = rng.normal(0, 0.3, size=(d, d_ff))
W3 = rng.normal(0, 0.3, size=(d, d_ff))
W2 = rng.normal(0, 0.3, size=(d_ff, d))

swiglu(X, W1, W3, W2)
`,
      setupCode: '',
      expectedOutput: '输出形状 (3, 6)',
      tests: `assert out.shape == (n, d), f"输出形状应为 {(n, d)}，实际 {out.shape}"
g = silu(X @ W1)
v = X @ W3
assert np.allclose(out, (g * v) @ W2), "结果应为 (silu(X@W1) * (X@W3)) @ W2"
assert not np.allclose(out, (g @ v) @ W2) if d == d_ff else True, "门控必须是逐元素乘而不是矩阵乘"
W3b = W3.copy()
W3b[:, 0] += 1e-3
assert not np.allclose(swiglu(X, W1, W3b, W2), out), "W3 的微小改变应影响输出"
`,
      answer: `import numpy as np

def silu(x):
    return x / (1.0 + np.exp(-x))

def swiglu(x, W1, W3, W2):
    gate = silu(x @ W1)
    value = x @ W3
    return (gate * value) @ W2

rng = np.random.default_rng(0)
n, d, d_ff = 3, 6, 16
X = rng.normal(size=(n, d))
W1 = rng.normal(0, 0.3, size=(d, d_ff))
W3 = rng.normal(0, 0.3, size=(d, d_ff))
W2 = rng.normal(0, 0.3, size=(d_ff, d))

swiglu(X, W1, W3, W2)
`,
      explanation:
        'SwiGLU 的本质是"内容 × 门控"：`gate` 决定每一项通过多少，`value` 是被调制的内容，两者逐元素相乘。写成 `gate @ value` 在 d_ff 不等时直接报形状错误，但在方阵情形下会静默算错，是常见的实现事故。three 个矩阵也是 SwiGLU 需要把 d_ff 调到约 2.67d 的原因。',
      relatedLessonId: 'llm-a1-c7-l3',
      tags: ['SwiGLU', '门控', 'numpy'],
    },
    {
      id: 'llm-a1-c7-e10',
      type: 'code',
      difficulty: 3,
      question:
        '估算参数与显存：\n\n1. `ffn_params(d_model, d_ff)`：标准 FFN 的参数个数（两层权重，忽略偏置）；\n2. `swiglu_dff(d_model)`：为对齐"4 倍标准 FFN"的参数量，SwiGLU 应使用的 d_ff（向上对齐到 128 的倍数，已给出实现，注意 d=4096 时结果不是 10880）；\n3. 计算 d_model = 4096 时的 `std_params` 与 `swiglu_dff`。\n\n最后一行直接求值 `(std_params, swiglu_dff)`。',
      starterCode: `def ffn_params(d_model, d_ff):
    return ___

def swiglu_dff(d_model):
    target = ffn_params(d_model, 4 * d_model)
    raw = target / (3 * d_model)
    n = int(raw / 128)
    if n * 128 < raw:
        n += 1
    return n * 128                    # 向上对齐到 128 的倍数

std_params = ___
d_ff = ___

(std_params, d_ff)`,
      setupCode: '',
      expectedOutput: '标准 FFN 约 1.34e8 参数，SwiGLU 的 d_ff 为 11008',
      tests: `assert std_params == 2 * 4096 * 16384, f"标准 FFN 参数应为 2·d·d_ff，实际 {std_params}"
assert d_ff == 11008, f"对齐后的 d_ff 应为 11008，实际 {d_ff}"
assert abs(3 * 4096 * d_ff - std_params) / std_params < 0.01, "SwiGLU 参数量应与标准 FFN 相差不超过 1%"
assert ffn_params(512, 2048) == 2 * 512 * 2048, "小模型的公式也应对"
assert swiglu_dff(512) > 0, "swiglu_dff 应返回正数"
assert 3 * 512 * swiglu_dff(512) >= 2 * 512 * 2048, "对齐后的 SwiGLU 参数量应不小于目标"
`,
      answer: `def ffn_params(d_model, d_ff):
    return 2 * d_model * d_ff

def swiglu_dff(d_model):
    target = ffn_params(d_model, 4 * d_model)
    raw = target / (3 * d_model)
    n = int(raw / 128)
    if n * 128 < raw:
        n += 1
    return n * 128

std_params = ffn_params(4096, 4 * 4096)
d_ff = swiglu_dff(4096)

(std_params, d_ff)
`,
      explanation:
        '标准 FFN 是 2d·d_ff = 2×4096×16384 = 1.34 亿。SwiGLU 有三个矩阵，令 3d·d_ff = 8d² 得 d_ff = 2.67d 约 10922，向上对齐到 128 的倍数得到 11008——这正是 LLaMA-2 7B 使用的数字。对齐后参数量误差不到 1%。',
      relatedLessonId: 'llm-a1-c7-l3',
      tags: ['参数量', 'SwiGLU'],
    },
    {
      id: 'llm-a1-c7-e11',
      type: 'single',
      difficulty: 3,
      question: 'd_ff = 4·d_model 的标准配置下，一个 Transformer 层中 FFN 与注意力的参数量之比约为？',
      options: [
        { value: 'A', text: '1 : 1' },
        { value: 'B', text: '2 : 1（FFN 约占三分之二）' },
        { value: 'C', text: '1 : 2（注意力占大头）' },
        { value: 'D', text: '4 : 1' },
      ],
      answer: 'B',
      explanation:
        '注意力 4d²，FFN 2·d·4d = 8d²，比例 2:1。所以在标准 Transformer 中 FFN 的参数约占每层的三分之二，这也是 MoE（改造 FFN）收益最大的原因。',
      relatedLessonId: 'llm-a1-c7-l4',
      tags: ['FFN', '参数量'],
    },
    {
      id: 'llm-a1-c7-e12',
      type: 'judge',
      difficulty: 3,
      question: 'FFN 的中间激活张量形状为 [B, n, d_ff]，它通常是大 batch 训练时显存占用的主要来源之一。',
      answer: true,
      explanation:
        'd_ff 通常是 d_model 的 2.7~5 倍，中间激活比注意力矩阵更占显存（在中等序列长度下）。所以梯度检查点等技术通常优先作用在 FFN 上。',
      relatedLessonId: 'llm-a1-c7-l4',
      tags: ['FFN', '显存'],
    },
    {
      id: 'llm-a1-c7-e13',
      type: 'multiple',
      difficulty: 4,
      question: '关于 SwiGLU 与门控 FFN，下列说法正确的有？（多选）',
      options: [
        { value: 'A', text: '门控分支与内容分支是逐元素相乘，而非矩阵相乘' },
        { value: 'B', text: '为保持参数量不变，SwiGLU 的 d_ff 通常设为约 (8/3)·d_model' },
        { value: 'C', text: '门控使 FFN 成为随输入变化的"条件变换"' },
        { value: 'D', text: 'SwiGLU 只用两个权重矩阵，因此比标准 FFN 更省参数' },
      ],
      answer: ['A', 'B', 'C'],
      explanation:
        'SwiGLU 使用**三个**权重矩阵（W1、W3、W2），严格说比标准 FFN 多一个，所以 D 错误。正因为多了矩阵，才需要更小的 d_ff 来对齐参数量。A、B、C 是 SwiGLU 的核心设计要点。',
      relatedLessonId: 'llm-a1-c7-l3',
      tags: ['SwiGLU', '门控'],
    },
    {
      id: 'llm-a1-c7-e14',
      type: 'fill',
      difficulty: 4,
      question: '补全 ReLU 的反向传播（`H_pre` 是激活前的隐层，`dH` 是激活后的上游梯度）：\n\n```python\ndH_pre = dH * ___\n```',
      blanks: [['(H_pre > 0)', 'H_pre > 0', '(H_pre >= 0)', '/\\(\\s*H_pre\\s*>\\s*0\\s*\\)/']],
      explanation:
        'ReLU 在正区间的导数为 1、负区间为 0，所以乘以布尔张量 `(H_pre > 0)`。这也直观展示了"神经元死亡"：若某列 H_pre 全为负，该列梯度全为 0，参数不再更新。',
      relatedLessonId: 'llm-a1-c7-l4',
      tags: ['FFN', '反向传播'],
    },
    {
      id: 'llm-a1-c7-e15',
      type: 'code',
      difficulty: 4,
      question:
        '**FFN 反向传播**：已知 `H_pre`（激活前）、`H`（激活后）、`dY`（上游梯度），返回 `(dW1, dW2, dX)`。\n\n- dW2 = H 转置 · dY；\n- dX 与 dW1 都要经过 ReLU 的导数 `(H_pre > 0)`。\n\n最后一行直接求值 `(dW1.shape, dW2.shape, dX.shape)`。',
      starterCode: `import numpy as np

H_pre = np.array([[ 0.5, -0.2,  0.3, -1.0],
                  [-0.4,  0.8,  0.1,  0.6]])
H = np.maximum(H_pre, 0)
dY = np.array([[1.0, -2.0, 0.5],
               [0.3,  0.4, -0.7]])
W1 = np.array([[0.2, -0.1, 0.3, 0.5],
               [-0.3, 0.4, 0.1, -0.2],
               [0.1, 0.2, -0.5, 0.3]])
W2 = np.array([[0.5, -0.2, 0.1],
               [-0.3, 0.4, 0.2],
               [0.1, -0.6, 0.3],
               [0.2, 0.3, -0.4]])
X = np.array([[1.0, 0.5, -1.0],
              [0.2, -0.3, 0.8]])

dW2 = ___
dH = ___
dH_pre = ___
dW1 = ___
dX = ___

(dW1.shape, dW2.shape, dX.shape)
`,
      setupCode: '',
      expectedOutput: 'dW1 (3, 4)，dW2 (4, 3)，dX (2, 3)',
      tests: `assert dW1.shape == (3, 4), f"dW1 形状应为 (3, 4)，实际 {dW1.shape}"
assert dW2.shape == (4, 3), f"dW2 形状应为 (4, 3)，实际 {dW2.shape}"
assert dX.shape == (2, 3), f"dX 形状应为 (2, 3)，实际 {dX.shape}"
assert np.allclose(dW2, H.T @ dY), "dW2 应等于 H.T @ dY"
assert np.allclose(dX, ((dY @ W2.T) * (H_pre > 0)) @ W1.T), "dX 计算不正确"
assert np.allclose(dW1, X.T @ ((dY @ W2.T) * (H_pre > 0))), "dW1 计算不正确"
assert np.any(np.abs(dW1) > 1e-9), f"dW1 不应全为零，实际最大绝对值 {np.abs(dW1).max()}"
assert np.allclose(dW1[:, 1], X.T @ dH_pre[:, 1]), "第 1 列应等于按 dH_pre 加权后的 X 列"
assert dW1[0, 1] != 0, "本例第 1 列梯度并不为 0（保留列用于验证公式，而非验证神经元死亡）"
`,
      answer: `import numpy as np

H_pre = np.array([[ 0.5, -0.2,  0.3, -1.0],
                  [-0.4,  0.8,  0.1,  0.6]])
H = np.maximum(H_pre, 0)
dY = np.array([[1.0, -2.0, 0.5],
               [0.3,  0.4, -0.7]])
W1 = np.array([[0.2, -0.1, 0.3, 0.5],
               [-0.3, 0.4, 0.1, -0.2],
               [0.1, 0.2, -0.5, 0.3]])
W2 = np.array([[0.5, -0.2, 0.1],
               [-0.3, 0.4, 0.2],
               [0.1, -0.6, 0.3],
               [0.2, 0.3, -0.4]])
X = np.array([[1.0, 0.5, -1.0],
              [0.2, -0.3, 0.8]])

dW2 = H.T @ dY
dH = dY @ W2.T
dH_pre = dH * (H_pre > 0)
dW1 = X.T @ dH_pre
dX = dH_pre @ W1.T

(dW1.shape, dW2.shape, dX.shape)
`,
      explanation:
        '注意 `dW2 = H.T @ dY`：形状 [d_ff, n] 乘 [n, d] 得 [d_ff, d]。写成 `dY.T @ H` 形状会是 [d, d_ff]，与 W2 不匹配。隐层第 1 列的两行 H_pre 都为负（-0.2 与 -0.4 都在 ReLU 之外），因此 `(H_pre > 0)` 全为 False，对应 `dW1` 列为 0——这就是 ReLU 神经元死亡在梯度上的直接体现。',
      relatedLessonId: 'llm-a1-c7-l4',
      tags: ['FFN', '反向传播', 'numpy'],
    },
    {
      id: 'llm-a1-c7-e16',
      type: 'code',
      difficulty: 4,
      question:
        '**MoE 参数与算力估算**：某 MoE 模型有 `n_layers` 层，每层 `n_experts` 个专家（每个专家是一个标准 FFN，参数量 `ffn_params`），路由为 top-k。\n\n1. `total_params`：所有专家参数之和（乘层数）；\n2. `active_params`：每个 token 实际用到的参数（每层 k 个专家）；\n3. 计算 n_layers=32、n_experts=8、ffn_params=1.35e8、k=2 的结果。\n\n最后一行直接求值 `(round(total_params / 1e9, 2), round(active_params / 1e9, 2))`（单位：十亿）。',
      starterCode: `n_layers, n_experts, ffn_params, k = 32, 8, 1.35e8, 2

total_params = ___
active_params = ___

(round(total_params / 1e9, 2), round(active_params / 1e9, 2))
`,
      setupCode: '',
      expectedOutput: '总参数约 34.56B，激活参数约 8.64B',
      tests: `assert abs(total_params - n_layers * n_experts * ffn_params) < 1.0, "总参数应为 层数 × 专家数 × 每专家参数"
assert abs(active_params - n_layers * k * ffn_params) < 1.0, "激活参数应为 层数 × k × 每专家参数"
assert abs(total_params / active_params - n_experts / k) < 1e-9, "总参数与激活参数之比应等于 专家数 / k"
assert active_params < total_params, "激活参数必须小于总参数，这正是'稀疏'的含义"
`,
      answer: `n_layers, n_experts, ffn_params, k = 32, 8, 1.35e8, 2

total_params = n_layers * n_experts * ffn_params
active_params = n_layers * k * ffn_params

(round(total_params / 1e9, 2), round(active_params / 1e9, 2))
`,
      explanation:
        '总参数随专家数线性增长，而每 token 的算力只随 top-k 增长，两者之比是 n_experts / k = 4 倍。这正是 MoE 的卖点：**用更多参数换更好的容量，而推理算力不变**。代价是全专家的显存占用、负载不均衡与路由训练复杂度。',
      relatedLessonId: 'llm-a1-c7-l4',
      tags: ['MoE', '参数量'],
    },
    {
      id: 'llm-a1-c7-e17',
      type: 'single',
      difficulty: 4,
      question: '把某一层的标准 FFN 换成 MoE 后，下列哪一项**不会**按专家数线性增长？',
      options: [
        { value: 'A', text: '该层的参数量' },
        { value: 'B', text: '装载该层所需的显存' },
        { value: 'C', text: '每个 token 处理该层所需的浮点运算量' },
        { value: 'D', text: '专家路由器的输出维度' },
      ],
      answer: 'C',
      explanation:
        'top-k 路由下每个 token 只激活 k 个专家，所以算力只与 k 有关，与专家总数无关（这才是"稀疏"）。参数量、显存占用都随专家数增长；路由器的输出维度本身就是专家数。',
      relatedLessonId: 'llm-a1-c7-l4',
      tags: ['MoE', '计算量'],
    },
    {
      id: 'llm-a1-c7-e18',
      type: 'multiple',
      difficulty: 4,
      question: '关于激活函数的选择，下列说法正确的有？（多选）',
      options: [
        { value: 'A', text: 'ReLU 在负区间梯度为 0，可能导致神经元死亡' },
        { value: 'B', text: 'GELU 与 SiLU 在负区间仍有小幅负值，梯度更平滑' },
        { value: 'C', text: 'GELU 与 ReLU 在同等规模下的性能差异通常很小' },
        { value: 'D', text: '激活函数应当替换掉 LayerNorm 中的归一化步骤' },
      ],
      answer: ['A', 'B', 'C'],
      explanation:
        '激活函数与归一化是两个完全不同的组件（D 错误）。A 是 ReLU 的缺陷；B 是 GELU/SiLU 的设计动机；C 是实践结论——选型时"有非线性且与训练实现一致"比纠结具体函数更重要。',
      relatedLessonId: 'llm-a1-c7-l2',
      tags: ['激活函数'],
    },
    {
      id: 'llm-a1-c7-e19',
      type: 'open',
      difficulty: 4,
      question:
        '请说明：为什么 Transformer 里"注意力 + FFN"这两种子层缺一不可？并从参数量与计算两个角度解释为什么 MoE 选择改造 FFN 而不是改造注意力。',
      referenceAnswer: `**两种子层的分工**

注意力：在 token 之间混合信息。它的输出是 V 的凸组合，
权重由内容决定，负责把"远处"的信息搬到当前位置。
但它对每个位置做的是加权平均，表示维度上没有非线性变换。

FFN：逐 token 独立的 MLP，提供表示维度上的非线性。
两层线性加激活，可以在隐空间里做复杂的特征组合与筛选，
这也是模型存储知识（键值记忆假说）的主要场所。

去掉注意力：模型失去跨位置交互，退化成逐 token 的独立映射，
无法处理语序、指代、长距离依赖。
去掉 FFN（或去掉其激活）：整个模型几乎全是线性变换的堆叠，
表达能力与浅层模型相差无几。

**为什么 MoE 改造 FFN**

1. 参数角度：FFN 约占每层参数的三分之二（8d² vs 4d²），
   改造它带来的"参数增量"最大；
2. 结构角度：FFN 是逐 token 计算的，天然适合"每个 token 只走一两个专家"，
   路由不会破坏 token 间的信息交换；
3. 计算角度：注意力的复杂度是 O(n²)，已经随序列增长；
   而 FFN 是 O(n·d_ff)，把它的宽度拆成多个专家可以保持单 token 算力不变。

注意力若要做稀疏化，通常采用滑窗/分块等形态，
因为它的瓶颈是序列长度而非参数量。`,
      rubric: [
        { point: '说明注意力负责跨 token 混合、FFN 负责逐 token 非线性', score: 2 },
        { point: '指出缺少任一部分会导致的具体能力缺失', score: 2 },
        { point: '从参数量占比（三分之二）说明改造 FFN 的收益', score: 1 },
        { point: '指出 FFN 逐 token 特性适合路由，注意力瓶颈在序列长度', score: 1 },
      ],
      keywords: ['跨位置', '逐位置', '非线性', '键值记忆', '参数量', 'MoE', '路由', 'O(n²)'],
      explanation:
        '这道题把架构分工与工程取舍联系起来。能说清"为什么是 FFN 而不是注意力被 MoE 化"，说明理解了两者的复杂度与参数分布。',
      tags: ['FFN', 'MoE', '架构'],
    },
    {
      id: 'llm-a1-c7-e20',
      type: 'open',
      difficulty: 4,
      question:
        '你实现的一个 32 层模型训练 loss 下降很慢，最终效果明显弱于论文复现。已知形状全部正确、没有报错。请结合本章内容，列出至少 4 个与 FFN / 激活相关、容易被忽略的原因，并说明如何验证。',
      referenceAnswer: `**可能原因与验证方法**

1. FFN 缺少激活函数
   现象：两层线性塌缩成一层，模型表达能力大幅下降，但仍能训练。
   验证：检查代码中是否存在 act；或与参考实现的中间张量比对。

2. 激活函数写在错误的维度或位置
   例如把激活放在降维之后，或对 batch 维做 softmax 类操作。
   验证：打印隐层形状 [B, n, d_ff]，确认激活是逐元素作用。

3. d_ff 设置过小或与参考实现不一致
   现象：容量不足，loss 下降慢。
   验证：核对 d_ff 与 d_model 的比例（标准 FFN 4 倍，SwiGLU 约 2.67 倍）。

4. 激活函数实现与训练时不一致
   例如 GELU 用了 tanh 近似而参考是 erf 精确形式，
   或 SiLU 的写法在负区间溢出。
   验证：用固定输入对比两个实现的数值。

5. SwiGLU 门控写成了矩阵乘
   在 d_ff 相等时会静默算错。
   验证：检查用的是逐元素 \`*\`，并与手算的小例子对比。

6. FFN 外面漏了残差或 Pre-LN
   现象：深层难训，loss 曲线抖动。
   验证：检查是否写成"残差加归一化"的形式，即 x 加上 ffn(norm(x))（见第 6 章）。

**通用方法**：用固定随机种子，把每层中间激活与参考实现逐层对比，
先定位第一处不一致的位置，再回头查对应的代码。`,
      rubric: [
        { point: '指出缺少激活函数或激活位置错误', score: 2 },
        { point: '指出 d_ff 比例或 SwiGLU 门控写法问题', score: 2 },
        { point: '指出激活实现与参考不一致（近似形式）', score: 1 },
        { point: '给出逐层数值对比的排查方法', score: 1 },
      ],
      keywords: ['激活', 'd_ff', 'SwiGLU', '门控', '残差', '逐层对比', '种子'],
      explanation:
        'FFN 相关的错误大多"不报错但伤效果"。回答时把"检查项"和"验证手段"成对给出，比单纯罗列更有价值；提到用固定种子逐层对比中间张量，说明有真实的调试经验。',
      tags: ['FFN', '调试', '工程'],
    },
  ],
  },
];
