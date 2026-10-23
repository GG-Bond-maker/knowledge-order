import type { Chapter } from '../../types';

/* ============================================================
 *  人工智能基础 · 论文导读 · Transformer 家族
 *  14 The Annotated Transformer (Rush et al. 2018)
 *
 *  来源：
 *  - 文章：Alexander Rush, "The Annotated Transformer"（2018，Harvard NLP）
 *  - 原始论文：Vaswani et al. (2017) arXiv:1706.03762
 *  - 参考：Ojhaharsh/30u30 第 14 篇（CC BY-NC-ND 4.0，本地个人使用）
 *  - 本课程为原创导读 + 原创习题
 *
 *  执行说明：本章代码需要 PyTorch，走本地后端执行。
 * ============================================================ */

export const paperTransformerChapters3: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c3: The Annotated Transformer
   * ============================================================ */
  {
    id: 'paper-transformer-c3',
    title: 'The Annotated Transformer：逐行实现',
    goal: '逐行理解 Transformer 的完整实现：从缩放点积注意力到编码器-解码器堆叠，掌握 mask 机制与残差+LayerNorm 的组合。',
    lessons: [
      {
        id: 'paper-transformer-c3-l1',
        title: '从公式到可运行代码',
        difficulty: 5,
        content: `
## 文献信息

| 项目 | 内容 |
| --- | --- |
| **文章** | Alexander M. Rush, *The Annotated Transformer*（2018） |
| **原始论文** | Vaswani et al., *Attention Is All You Need*（2017） |
| **出处** | Harvard NLP（https://nlp.seas.harvard.edu/annotated-transformer/） |
| **一句话贡献** | 把 Transformer 论文的每个公式变成可运行的 PyTorch 代码，并逐行注释 |

## 为什么需要"逐行实现"

**论文的问题**：公式简洁，但**实现细节全靠猜**。

**例子**：

    论文说：MultiHead(Q, K, V) = Concat(head_1, ..., head_h) · W^O
            其中 head_i = Attention(Q·W_i^Q, K·W_i^K, V·W_i^V)

**但没说的**：
- \`W_i^Q\` 的形状是什么？
- 多头是"切分"还是"独立投影"？
- \`Concat\` 后怎么降维？
- mask 加在哪一步？

**Annotated Transformer 的价值**：**每个细节都有对应代码**。

## 整体架构

<TransformerArchDemo />

**两大组件**：

| 组件 | 作用 |
| --- | --- |
| **Encoder** | 把源句编码成表示（可看全句） |
| **Decoder** | 自回归生成译文（只能看已生成部分） |

**各自 6 层堆叠**（论文 base 版本）。

## 缩放点积注意力

**公式**：

    Attention(Q, K, V) = softmax(Q·K^T / √d_k) · V

**代码**：

    def attention(query, key, value, mask=None, dropout=None):
        d_k = query.size(-1)
        scores = torch.matmul(query, key.transpose(-2, -1)) / math.sqrt(d_k)
        if mask is not None:
            scores = scores.masked_fill(mask == 0, -1e9)
        p_attn = scores.softmax(dim=-1)
        if dropout is not None:
            p_attn = dropout(p_attn)
        return torch.matmul(p_attn, value), p_attn

<ScaledDotProductDemo />

**三个关键细节**：

### ① 为什么除以 √d_k

**问题**：当 \`d_k\` 很大时，点积的方差变大。

    q·k = Σ_{i=1}^{d_k} q_i·k_i
    假设 q_i, k_i ~ N(0,1)
    则 q·k 的方差 = d_k
    标准差 = √d_k

**后果**：softmax 的输入过大 → 输出接近 one-hot → **梯度消失**。

**解决**：除以 \`√d_k\` 把方差归一到 1。

### ② mask 的作用

**两种 mask**：

| 类型 | 用途 | 形状 |
| --- | --- | --- |
| **padding mask** | 忽略填充的 <pad> | (B, 1, 1, T) |
| **causal mask** | 解码器不能看未来 | (B, 1, T, T) 下三角 |

**代码**：

    scores = scores.masked_fill(mask == 0, -1e9)

**为什么用 -1e9 而非 -inf**：
- \`-inf\` 在 softmax 中可能产生 nan（如果整行都是 -inf）
- \`-1e9\` 经过 exp 后接近 0，数值稳定

<MaskDemo />

### ③ 为什么先 softmax 再乘 V

**顺序**：

    weights = softmax(scores)      # (B, h, T, T)
    output = weights @ V           # (B, h, T, d_k)

**如果反过来**（先乘 V 再 softmax）就错了——
softmax 必须作用在"注意力分布"上，而不是输出上。

## 多头注意力

**核心思想**：并行多个注意力，各关注不同子空间。

**实现**：

    class MultiHeadedAttention(nn.Module):
        def __init__(self, h, d_model, dropout=0.1):
            super().__init__()
            assert d_model % h == 0
            self.d_k = d_model // h
            self.h = h
            # 4 个线性层：Q, K, V, O
            self.linears = clones(nn.Linear(d_model, d_model), 4)
            self.attn = None

        def forward(self, query, key, value, mask=None):
            batch_size = query.size(0)
            # ① 线性投影 + 分头
            query, key, value = [
                l(x).view(batch_size, -1, self.h, self.d_k).transpose(1, 2)
                for l, x in zip(self.linears, (query, key, value))
            ]
            # ② 每个头独立做注意力
            x, self.attn = attention(query, key, value, mask=mask)
            # ③ 合并多头
            x = x.transpose(1, 2).contiguous().view(batch_size, -1, self.h * self.d_k)
            # ④ 输出投影
            return self.linears[-1](x)

<MultiHeadDemo />

**形状变化**（B=2, T=10, d_model=512, h=8）：

| 步骤 | 形状 |
| --- | --- |
| 输入 | (2, 10, 512) |
| 线性投影 | (2, 10, 512) |
| \`view(B, -1, h, d_k)\` | (2, 10, 8, 64) |
| \`transpose(1, 2)\` | (2, 8, 10, 64) |
| 注意力 | (2, 8, 10, 64) |
| \`transpose(1,2).view(B,-1,512)\` | (2, 10, 512) |
| 输出投影 | (2, 10, 512) |

**关键**：\`d_model = h × d_k\`，所以分头不改变总维度。

## 位置编码

**问题**：Transformer 没有循环，也没有卷积，**天然无序**。

**解决**：给每个位置加一个"位置向量"。

    PE(pos, 2i)   = sin(pos / 10000^(2i/d_model))
    PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))

**为什么用 sin/cos**：

| 性质 | 好处 |
| --- | --- |
| **有界** | 值域 [-1,1]，不影响词嵌入 |
| **唯一** | 每个位置有独特模式 |
| **相对位置可表达** | \`PE(pos+k)\` 是 \`PE(pos)\` 的线性变换 |

**代码**：

    class PositionalEncoding(nn.Module):
        def __init__(self, d_model, dropout, max_len=5000):
            super().__init__()
            pe = torch.zeros(max_len, d_model)
            position = torch.arange(0, max_len).unsqueeze(1)
            div_term = torch.exp(
                torch.arange(0, d_model, 2) * -(math.log(10000.0) / d_model)
            )
            pe[:, 0::2] = torch.sin(position * div_term)
            pe[:, 1::2] = torch.cos(position * div_term)
            self.register_buffer('pe', pe.unsqueeze(0))

        def forward(self, x):
            return x + self.pe[:, :x.size(1)].requires_grad_(False)

<PositionalEncodingDemo2 />

**注意**：\`register_buffer\` 让 \`pe\` 不参与训练，但会随模型移动设备。

## 残差连接 + LayerNorm

**每个子层后都有**：

    x = LayerNorm(x + Sublayer(x))

**代码**：

    class SublayerConnection(nn.Module):
        def __init__(self, size, dropout):
            super().__init__()
            self.norm = LayerNorm(size)
            self.dropout = nn.Dropout(dropout)

        def forward(self, x, sublayer):
            return x + self.dropout(sublayer(self.norm(x)))

**注意**：Annotated Transformer 用的是 **Pre-LN**（先 norm 再子层）。

**与原始论文的区别**：

| 版本 | 结构 |
| --- | --- |
| **原论文**（Post-LN） | \`LayerNorm(x + Sublayer(x))\` |
| **Annotated**（Pre-LN） | \`x + Sublayer(LayerNorm(x))\` |

**为什么 Annotated 用 Pre-LN**：
训练更稳定（这是 GPT-2 之后的主流）。

**这与 ResNet v2 的预激活是同一思想**（第 10 篇讲过）。

## 编码器与解码器

<EncoderDecoderDemo />

### EncoderLayer

    class EncoderLayer(nn.Module):
        def __init__(self, size, self_attn, feed_forward, dropout):
            super().__init__()
            self.self_attn = self_attn
            self.feed_forward = feed_forward
            self.sublayer = clones(SublayerConnection(size, dropout), 2)

        def forward(self, x, mask):
            x = self.sublayer[0](x, lambda x: self.self_attn(x, x, x, mask))
            return self.sublayer[1](x, self.feed_forward)

**两个子层**：
1. 自注意力（Q=K=V=x）
2. 前馈网络

### DecoderLayer

    class DecoderLayer(nn.Module):
        def forward(self, x, memory, src_mask, tgt_mask):
            # ① 自注意力（带 causal mask）
            x = self.sublayer[0](x, lambda x: self.self_attn(x, x, x, tgt_mask))
            # ② 交叉注意力（Q 来自 decoder，K/V 来自 encoder）
            x = self.sublayer[1](x, lambda x: self.src_attn(x, memory, memory, src_mask))
            # ③ 前馈
            return self.sublayer[2](x, self.feed_forward)

**三个子层**：
1. 自注意力（causal mask）
2. 交叉注意力（看 encoder 输出）
3. 前馈网络

**交叉注意力的形状**：

    Q: (B, T_tgt, d)      来自 decoder
    K: (B, T_src, d)      来自 encoder
    V: (B, T_src, d)      来自 encoder
    scores: (B, h, T_tgt, T_src)   ← 注意维度不同！

**这就是"翻译"的发生地**：解码器每一步查询源句的相关部分。

## 完整前向流程

    源句 → Embedding → PositionalEncoding → Encoder × 6 → memory
                                                          ↓
    目标句 → Embedding → PositionalEncoding → Decoder × 6 (交叉注意力看 memory)
                                                          ↓
                                                    Linear → Softmax → 词概率

## 参数量统计

| 组件 | 参数量（base: d=512, h=8, layers=6） |
| --- | --- |
| Embedding | 2 × vocab × 512 |
| 每层 Encoder | 4×512²（注意力）+ 2×512×2048（FFN）= 3.1M |
| 每层 Decoder | 4×512²（自注意力）+ 4×512²（交叉）+ 2×512×2048 = 4.2M |
| **总计** | **约 65M** |

**对比**：

| 模型 | 参数量 |
| --- | --- |
| Transformer base | 65M |
| Transformer big | 213M |
| GPT-2 | 1.5B |
| GPT-3 | 175B |

## 一个常被忽略的细节

**Annotated Transformer 用的是"教学版"配置**：

| 参数 | Annotated | 原论文 |
| --- | --- | --- |
| 层数 | 2 | 6 |
| d_model | 512 | 512 |
| batch | 32 | ~25k tokens |
| 数据集 | 小规模 IWSLT | WMT |

**为什么**：为了让代码能在单卡上跑通。

**所以**：**不要用它训练出的模型做实际翻译**——
它是**理解实现**的材料，不是生产代码。

## 本节来源

> **来源类型：学术来源（教程）**
> - Rush, A. M. *The Annotated Transformer*（2018）
>   https://nlp.seas.harvard.edu/annotated-transformer/
>   **说明**：教学博客，非同行评审，但已成为 Transformer 实现的权威参考
>
> **来源类型：学术来源（原始论文）**
> - Vaswani, A. et al. *Attention Is All You Need*
>   arXiv:[1706.03762](https://arxiv.org/abs/1706.03762)（NeurIPS 2017）
> - Ba, J. L., Kiros, J. R., Hinton, G. E. *Layer Normalization*
>   arXiv:[1607.06450](https://arxiv.org/abs/1607.06450)
>
> **来源类型：参考资料（CC BY-NC-ND 4.0，本地个人使用）**
> - Ojhaharsh/30u30 第 14 篇（1017 行，含完整 Transformer 实现）
>
> **来源类型：原创**
> - 全部导读文字、交互图示、代码示例与习题
`,
        tips: [
          {
            kind: 'interview',
            text: '「为什么除以 √d_k」：q·k 的方差是 d_k，d_k 大时 softmax 输入过大会饱和（接近 one-hot），梯度消失。除以 √d_k 把方差归一到 1。',
          },
          {
            kind: 'leak',
            text: '「两种 mask」：padding mask 忽略 <pad>（(B,1,1,T)），causal mask 让解码器不能看未来（(B,1,T,T) 下三角）。用 -1e9 而非 -inf 防止 nan。',
          },
          {
            kind: 'pitfall',
            text: 'Annotated Transformer 用的是 Pre-LN（先 norm 再子层），而原论文是 Post-LN。这与 ResNet v2 的预激活是同一思想——训练更稳定。',
          },
        ],
        demos: [
          {
            title: '缩放点积注意力 + mask（PyTorch）',
            lang: 'python',
            code: `import torch
import torch.nn as nn
import math

def attention(query, key, value, mask=None, dropout=None):
    """
    缩放点积注意力。

    Attention(Q,K,V) = softmax(Q·K^T / √d_k) · V
    """
    d_k = query.size(-1)

    # ① 打分
    scores = torch.matmul(query, key.transpose(-2, -1)) / math.sqrt(d_k)

    # ② mask（可选）
    if mask is not None:
        scores = scores.masked_fill(mask == 0, -1e9)

    # ③ softmax
    p_attn = scores.softmax(dim=-1)
    if dropout is not None:
        p_attn = dropout(p_attn)

    # ④ 加权聚合
    return torch.matmul(p_attn, value), p_attn


print("=== 基本注意力 ===")
torch.manual_seed(42)
B, T, d_k = 1, 4, 8
q = torch.randn(B, T, d_k)
k = torch.randn(B, T, d_k)
v = torch.randn(B, T, d_k)

out, attn = attention(q, k, v)
print(f"Q/K/V: {tuple(q.shape)}")
print(f"输出: {tuple(out.shape)}")
print(f"注意力权重: {tuple(attn.shape)}")
print()
print("权重矩阵（每行和为1）:")
for i in range(T):
    print(f"  位置{i}: {attn[0, i].detach().numpy()}")

print()
print("=== 为什么除以 sqrt(d_k) ===")
print()
for d in [8, 64, 512]:
    q2 = torch.randn(1, 1, d)
    k2 = torch.randn(1, 1, d)
    dot = (q2 @ k2.transpose(-2, -1)).item()
    scaled = dot / math.sqrt(d)
    print(f"d_k={d:>3}: 点积={dot:>8.2f}, 除以√d后={scaled:>7.3f}")

print()
print("观察：d_k 越大，原始点积越大（方差=d_k）")
print("不缩放 -> softmax 饱和 -> 梯度消失")

print()
print("=== Causal Mask（解码器不能看未来）===")
print()
T2 = 5
causal_mask = torch.tril(torch.ones(T2, T2)).bool()
print("Causal mask (下三角):")
for i in range(T2):
    print("  ", causal_mask[i].int().tolist())

q3 = torch.randn(1, T2, 8)
k3 = torch.randn(1, T2, 8)
v3 = torch.randn(1, T2, 8)

_, attn_causal = attention(q3, k3, v3, mask=causal_mask)
print()
print("带 causal mask 的注意力权重:")
for i in range(T2):
    print(f"  位置{i}: {[f'{x:.3f}' for x in attn_causal[0, i].detach().numpy()]}")
print()
print("关键：位置 i 只能看到 0..i（未来位置的权重为 0）")

print()
print("=== Padding Mask（忽略填充）===")
print()
# 假设第 3、4 个位置是 padding
pad_mask = torch.tensor([[1, 1, 1, 0, 0]]).bool()   # (B, T)
pad_mask = pad_mask.unsqueeze(1).unsqueeze(1)        # (B, 1, 1, T)
_, attn_pad = attention(q3, k3, v3, mask=pad_mask)
print("带 padding mask 的权重（位置3,4 是 pad）:")
for i in range(T2):
    print(f"  位置{i}: {[f'{x:.3f}' for x in attn_pad[0, i].detach().numpy()]}")
print()
print("关键：pad 位置的权重为 0，不参与聚合")`,
          },
          {
            title: '多头注意力完整实现',
            lang: 'python',
            code: `import torch
import torch.nn as nn
import math
import copy

def clones(module, N):
    return nn.ModuleList([copy.deepcopy(module) for _ in range(N)])


def attention(query, key, value, mask=None, dropout=None):
    d_k = query.size(-1)
    scores = torch.matmul(query, key.transpose(-2, -1)) / math.sqrt(d_k)
    if mask is not None:
        scores = scores.masked_fill(mask == 0, -1e9)
    p_attn = scores.softmax(dim=-1)
    if dropout is not None:
        p_attn = dropout(p_attn)
    return torch.matmul(p_attn, value), p_attn


class MultiHeadedAttention(nn.Module):
    def __init__(self, h, d_model, dropout=0.1):
        super().__init__()
        assert d_model % h == 0, "d_model 必须能被 h 整除"
        self.d_k = d_model // h
        self.h = h
        self.linears = clones(nn.Linear(d_model, d_model), 4)
        self.attn = None
        self.dropout = nn.Dropout(p=dropout)

    def forward(self, query, key, value, mask=None):
        if mask is not None:
            mask = mask.unsqueeze(1)     # 增加 head 维度

        nbatches = query.size(0)

        # ① 线性投影 + 分头
        # (B, T, d_model) -> (B, T, h, d_k) -> (B, h, T, d_k)
        query, key, value = [
            lin(x).view(nbatches, -1, self.h, self.d_k).transpose(1, 2)
            for lin, x in zip(self.linears, (query, key, value))
        ]

        # ② 每个头独立做注意力
        x, self.attn = attention(query, key, value, mask=mask, dropout=self.dropout)

        # ③ 合并多头
        # (B, h, T, d_k) -> (B, T, h, d_k) -> (B, T, d_model)
        x = x.transpose(1, 2).contiguous().view(nbatches, -1, self.h * self.d_k)

        # ④ 输出投影
        return self.linears[-1](x)


print("=== 多头注意力形状变化 ===")
B, T, d_model, h = 2, 10, 512, 8
mha = MultiHeadedAttention(h, d_model)

x = torch.randn(B, T, d_model)
print(f"输入:                {tuple(x.shape)}")
print(f"d_model={d_model}, h={h}, d_k={d_model//h}")
print()

# 手动追踪形状
q = mha.linears[0](x)
print(f"① 线性投影后:        {tuple(q.shape)}")
q2 = q.view(B, -1, h, mha.d_k)
print(f"   view(B,-1,h,d_k):  {tuple(q2.shape)}")
q3 = q2.transpose(1, 2)
print(f"   transpose(1,2):    {tuple(q3.shape)}  <- 分头完成")

out = mha(x, x, x)
print(f"④ 最终输出:          {tuple(out.shape)}")
print()
print("关键：d_model = h × d_k，分头不改变总维度")

print()
print("=== 多头 vs 单头：参数量相同 ===")
print()
single = MultiHeadedAttention(1, 512)
multi = MultiHeadedAttention(8, 512)
n_single = sum(p.numel() for p in single.parameters())
n_multi = sum(p.numel() for p in multi.parameters())
print(f"单头 (h=1): {n_single:,}")
print(f"多头 (h=8): {n_multi:,}")
print(f"相同: {n_single == n_multi}")

print()
print("=== 每个头关注不同的东西 ===")
print()
# 用不同输入验证多头确实产生不同的注意力
x2 = torch.randn(1, 6, 512)
mha2 = MultiHeadedAttention(4, 512)
_ = mha2(x2, x2, x2)
attn = mha2.attn   # (B, h, T, T)
print(f"注意力形状: {tuple(attn.shape)}")
print()
for head in range(4):
    w = attn[0, head]
    # 计算每个头的"聚焦度"（最大权重均值）
    focus = w.max(dim=-1).values.mean().item()
    print(f"  头 {head}: 平均最大权重 = {focus:.3f}")
print()
print("不同头的聚焦模式不同 -> 学到不同的关系")`,
          },
          {
            title: '位置编码实现与可视化',
            lang: 'python',
            code: `import torch
import torch.nn as nn
import math
import matplotlib.pyplot as plt

class PositionalEncoding(nn.Module):
    def __init__(self, d_model, max_len=5000):
        super().__init__()
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(
            torch.arange(0, d_model, 2).float() * -(math.log(10000.0) / d_model)
        )
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        self.register_buffer('pe', pe.unsqueeze(0))   # (1, max_len, d_model)

    def forward(self, x):
        return x + self.pe[:, :x.size(1)]


print("=== 位置编码矩阵 ===")
d_model = 8
pe = PositionalEncoding(d_model)
P = pe.pe[0, :6].numpy()

print(f"前 6 个位置，d_model={d_model}:")
print()
for pos in range(6):
    row = " ".join(f"{v:>6.3f}" for v in P[pos])
    print(f"  pos {pos}: [{row}]")

print()
print("=== 关键性质 ===")
print()
print("1. 值域有界 [-1, 1]")
print(f"   最小值: {P.min():.3f}, 最大值: {P.max():.3f}")
print()
print("2. 每个位置唯一")
dists = []
for i in range(6):
    for j in range(i+1, 6):
        dists.append(torch.norm(pe.pe[0, i] - pe.pe[0, j]).item())
print(f"   位置间最小距离: {min(dists):.3f}")
print(f"   位置间最大距离: {max(dists):.3f}")
print()
print("3. 波长几何级数")
print("   偶数维: sin(pos / 10000^(2i/d))")
print("   奇数维: cos(pos / 10000^(2i/d))")
print()
for i in range(0, d_model, 2):
    wavelength = 2 * math.pi * (10000 ** (i / d_model))
    print(f"   维度 {i}: 波长 = {wavelength:>10.2f}")

print()
print("=== 可视化 ===")
pe_big = PositionalEncoding(64, max_len=100)
P_big = pe_big.pe[0, :50].numpy()

fig, axes = plt.subplots(1, 2, figsize=(12, 4))

im1 = axes[0].imshow(P_big.T, aspect='auto', cmap='RdBu')
axes[0].set_xlabel('Position')
axes[0].set_ylabel('Dimension')
axes[0].set_title('Positional Encoding Matrix')
plt.colorbar(im1, ax=axes[0])

# 几个维度的曲线
for dim in [0, 2, 8, 20]:
    axes[1].plot(P_big[:, dim], label=f'dim {dim}', alpha=0.8)
axes[1].set_xlabel('Position')
axes[1].set_ylabel('Value')
axes[1].set_title('Encoding curves by dimension')
axes[1].legend(fontsize=8)
axes[1].grid(alpha=0.3)

plt.tight_layout()
plt.savefig('positional_encoding.png', dpi=80, bbox_inches='tight')
print()
print("已生成 positional_encoding.png")
print()
print("观察：")
print("  · 低维度变化快（高频）")
print("  · 高维度变化慢（低频）")
print("  · 组合起来能唯一标识每个位置")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'paper-transformer-c3-e1',
        type: 'single',
        difficulty: 2,
        question: '缩放点积注意力中除以 √d_k 的原因是？',
        options: [
          { value: 'A', text: '为了让权重和为 1' },
          { value: 'B', text: 'd_k 大时点积方差为 d_k，softmax 会饱和导致梯度消失' },
          { value: 'C', text: '为了减少参数量' },
          { value: 'D', text: '为了加快计算' },
        ],
        answer: 'B',
        explanation:
          'q·k 的方差 = d_k。d_k=512 时点积可能达 ±20，softmax 输出接近 one-hot，梯度接近 0。除以 √d_k 把方差归一到 1，保持 softmax 在敏感区间。',
        tags: ['缩放'],
      },
      {
        id: 'paper-transformer-c3-e2',
        type: 'judge',
        difficulty: 2,
        question: '解码器的 causal mask 让每个位置只能看到自己和之前的位置。',
        answer: true,
        explanation:
          'causal mask 是下三角矩阵：位置 i 只能 attend 到 0..i。这保证自回归生成时不会"偷看"未来的词。用 -1e9 填充未来位置，softmax 后权重接近 0。',
        tags: ['causal mask'],
      },
      {
        id: 'paper-transformer-c3-e3',
        type: 'multiple',
        difficulty: 3,
        question: '关于多头注意力，正确的有？（多选）',
        options: [
          { value: 'A', text: 'd_model 必须能被 h 整除（d_k = d_model/h）' },
          { value: 'B', text: '多头与单头的参数量相同' },
          { value: 'C', text: '不同头可以关注不同的子空间/关系' },
          { value: 'D', text: '多头会增加 d_model 维度' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误——分头后每个头是 d_k 维，合并后仍是 d_model 维，总维度不变。A/B/C 正确。多头是"分工"而非"扩容"。',
        tags: ['多头'],
      },
      {
        id: 'paper-transformer-c3-e4',
        type: 'fill',
        difficulty: 3,
        question:
          'Annotated Transformer 用的是 ___ 结构（先 LayerNorm 再子层），而原论文是 Post-LN。',
        blanks: [['Pre-LN', 'PreLN', 'pre-ln', 'pre ln', '预归一化']],
        explanation:
          'Pre-LN：x + Sublayer(LayerNorm(x))。Post-LN：LayerNorm(x + Sublayer(x))。Pre-LN 训练更稳定，GPT-2 之后成为主流。与 ResNet v2 的预激活是同一思想。',
        tags: ['Pre-LN'],
      },
      {
        id: 'paper-transformer-c3-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现缩放点积注意力的打分部分：scaled_scores(Q, K)。\n\n- Q: (B, T_q, d_k)\n- K: (B, T_k, d_k)\n- 返回 (B, T_q, T_k)，即 Q·K^T / √d_k',
        starterCode: `import torch
import math

def scaled_scores(Q, K):
    d_k = Q.size(-1)
    return ___
`,
        setupCode: '',
        expectedOutput: '缩放打分',
        tests: `import torch
import math

B, Tq, Tk, d_k = 2, 3, 5, 8
Q = torch.randn(B, Tq, d_k)
K = torch.randn(B, Tk, d_k)

scores = scaled_scores(Q, K)
assert scores.shape == (B, Tq, Tk), f"形状错误: {scores.shape}"

# 验证公式
expected = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(d_k)
assert torch.allclose(scores, expected, atol=1e-6)

# 缩放后数值不应太大
assert scores.abs().max() < 10, f"缩放后不应过大: {scores.abs().max()}"

# 不缩放会更大
unscaled = torch.matmul(Q, K.transpose(-2, -1))
assert unscaled.abs().max() > scores.abs().max()
`,
        answer: `import torch
import math

def scaled_scores(Q, K):
    d_k = Q.size(-1)
    return torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(d_k)
`,
        explanation:
          '**`transpose(-2, -1)`** 交换最后两维：\n\n    K: (B, T_k, d_k) -> (B, d_k, T_k)\n    Q @ K^T: (B, T_q, d_k) @ (B, d_k, T_k) = (B, T_q, T_k)\n\n**用 `-2, -1` 而非 `1, 2`**：这样对任意维度的输入都有效（不假设是 3D）。\n\n**除以 `math.sqrt(d_k)`**：把方差从 d_k 归一化到 1。\n\n**验证**：`d_k=8` 时，未缩放的点积标准差约 √8≈2.8，缩放后约 1。',
        tags: ['编程', '缩放打分'],
      },
      {
        id: 'paper-transformer-c3-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现 causal mask：causal_mask(size)。\n\n返回 (1, size, size) 的布尔张量，下三角为 True。\n\n提示：torch.tril(torch.ones(size, size))',
        starterCode: `import torch

def causal_mask(size):
    mask = ___
    return ___
`,
        setupCode: '',
        expectedOutput: 'causal mask',
        tests: `import torch

m = causal_mask(4)
assert m.shape == (1, 4, 4), f"形状错误: {m.shape}"
assert m.dtype == torch.bool, f"应为 bool，实际 {m.dtype}"

# 下三角为 True
expected = torch.tensor([[
    [True, False, False, False],
    [True, True, False, False],
    [True, True, True, False],
    [True, True, True, True],
]])
assert torch.equal(m, expected), f"内容错误:\\n{m}"

# 每行 True 的数量递增
for i in range(4):
    assert m[0, i].sum().item() == i + 1
`,
        answer: `import torch

def causal_mask(size):
    mask = torch.tril(torch.ones(size, size)).bool()
    return mask.unsqueeze(0)
`,
        explanation:
          '**`torch.tril`** 取矩阵的下三角（含对角线），其余置 0。\n\n**`unsqueeze(0)`** 增加 batch 维度，变成 (1, T, T)。\n\n**为什么需要 causal mask**：\n\n自回归生成时，位置 i 只能看到 0..i。\n如果不加 mask，训练时模型能"偷看"答案，学不到真正的生成能力。\n\n**在注意力中的用法**：\n\n    scores = scores.masked_fill(mask == 0, -1e9)\n    # 未来位置的分数变成 -1e9\n    # softmax 后权重 ≈ 0\n\n**注意形状**：attention 中通常要 `unsqueeze(1)` 变成 (B,1,T,T) 以匹配多头维度。',
        tags: ['编程', 'causal mask'],
      },
      {
        id: 'paper-transformer-c3-e7',
        type: 'code',
        difficulty: 3,
        question:
          '实现多头注意力的分头与合并：\n\n- split_heads(x, h): (B,T,d_model) -> (B,h,T,d_k)\n- merge_heads(x): (B,h,T,d_k) -> (B,T,d_model)',
        starterCode: `import torch

def split_heads(x, h):
    B, T, d_model = x.shape
    d_k = ___
    return ___

def merge_heads(x):
    B, h, T, d_k = x.shape
    return ___
`,
        setupCode: '',
        expectedOutput: '分头与合并',
        tests: `import torch
B, T, d_model, h = 2, 6, 12, 3
x = torch.arange(B*T*d_model, dtype=torch.float).reshape(B, T, d_model)

# 分头
split = split_heads(x, h)
assert split.shape == (B, h, T, d_model//h), f"分头形状错误: {split.shape}"

# 合并
merged = merge_heads(split)
assert merged.shape == (B, T, d_model), f"合并形状错误: {merged.shape}"

# 往返一致
assert torch.allclose(merged, x), "合并后应与原输入相同"

# 验证内容正确（第一个头的前 d_k 个元素）
d_k = d_model // h
assert torch.allclose(split[0, 0, 0], x[0, 0, :d_k])
assert torch.allclose(split[0, 1, 0], x[0, 0, d_k:2*d_k])
`,
        answer: `import torch

def split_heads(x, h):
    B, T, d_model = x.shape
    d_k = d_model // h
    return x.view(B, T, h, d_k).transpose(1, 2)

def merge_heads(x):
    B, h, T, d_k = x.shape
    return x.transpose(1, 2).contiguous().view(B, T, h * d_k)
`,
        explanation:
          '**分头两步**：\n\n    view(B, T, h, d_k)      # 把 d_model 拆成 (h, d_k)\n    transpose(1, 2)         # 把 head 维度提前\n\n**合并两步**：\n\n    transpose(1, 2)         # 把 head 放回后面\n    contiguous().view(...)  # 合并 h 和 d_k\n\n**`contiguous()` 为什么必要**：\n`transpose` 只改变 stride 不复制数据，\n`view` 要求内存连续，所以必须先 `contiguous()` 复制。\n\n**注意**：`view` vs `reshape`——`reshape` 会自动处理不连续的情况，更安全但可能多一次拷贝。',
        tags: ['编程', '多头拆分'],
      },
      {
        id: 'paper-transformer-c3-e8',
        type: 'code',
        difficulty: 4,
        question:
          '实现位置编码：positional_encoding(max_len, d_model)。\n\n返回 (max_len, d_model) 张量：\n- 偶数维：sin(pos / 10000^(2i/d_model))\n- 奇数维：cos(pos / 10000^(2i/d_model))',
        starterCode: `import torch
import math

def positional_encoding(max_len, d_model):
    pe = torch.zeros(max_len, d_model)
    position = ___
    div_term = ___
    pe[:, 0::2] = ___
    pe[:, 1::2] = ___
    return pe
`,
        setupCode: '',
        expectedOutput: '位置编码',
        tests: `import torch
import math

pe = positional_encoding(50, 16)
assert pe.shape == (50, 16)

# 值域有界
assert pe.abs().max() <= 1.0 + 1e-6

# 位置 0 的编码：sin(0)=0, cos(0)=1
assert torch.allclose(pe[0, 0::2], torch.zeros(8), atol=1e-6), "位置0的sin应为0"
assert torch.allclose(pe[0, 1::2], torch.ones(8), atol=1e-6), "位置0的cos应为1"

# 验证公式
pos, i = 5, 2
expected_sin = math.sin(pos / (10000 ** (i / 16)))
assert abs(pe[pos, i].item() - expected_sin) < 1e-5, f"公式错误"

# 每个位置唯一
for p in range(1, 10):
    assert not torch.allclose(pe[p], pe[0]), "位置应唯一"
`,
        answer: `import torch
import math

def positional_encoding(max_len, d_model):
    pe = torch.zeros(max_len, d_model)
    position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
    div_term = torch.exp(
        torch.arange(0, d_model, 2).float() * -(math.log(10000.0) / d_model)
    )
    pe[:, 0::2] = torch.sin(position * div_term)
    pe[:, 1::2] = torch.cos(position * div_term)
    return pe
`,
        explanation:
          '**`div_term` 的巧妙之处**：\n\n    原式：1 / 10000^(2i/d_model)\n    等价：exp(-log(10000) × 2i / d_model)\n\n**为什么用 exp(log)**：\n数值更稳定，且可以向量化计算。\n\n**`position.unsqueeze(1)`**：\n\n    position: (max_len,) -> (max_len, 1)\n    div_term: (d_model/2,)\n    相乘广播: (max_len, d_model/2)\n\n**`pe[:, 0::2]`** 取偶数列（步长 2），`pe[:, 1::2]` 取奇数列。\n\n**关键性质**：\n- 低维（i 小）：div_term 大 → 高频变化\n- 高维（i 大）：div_term 小 → 低频变化\n- 组合起来像"二进制计数"，唯一标识位置',
        tags: ['编程', '位置编码'],
      },
      {
        id: 'paper-transformer-c3-e9',
        type: 'judge',
        difficulty: 4,
        question: 'Annotated Transformer 的实现与原始论文完全一致，可以直接用于生产环境。',
        answer: false,
        explanation:
          '有两处不同：① 用 Pre-LN 而非 Post-LN；② 用 2 层小配置（原论文 6 层）以便单卡运行。它是教学材料，不是生产代码——训练出的模型质量有限。',
        tags: ['教学版差异'],
      },
      {
        id: 'paper-transformer-c3-e10',
        type: 'open',
        difficulty: 5,
        question:
          '请解释：① 为什么除以 √d_k（数学推导）；② 两种 mask 的区别与用法；③ 多头注意力的形状变换与意义；④ Annotated Transformer 与原论文的实现差异。',
        referenceAnswer: `**① 为什么除以 √d_k**

**数学推导**：

假设 \`q_i, k_i ~ N(0, 1)\` 独立同分布。

    q·k = Σ_{i=1}^{d_k} q_i·k_i

每个 \`q_i·k_i\` 的方差：

    Var(q_i·k_i) = E[q_i²]·E[k_i²] - (E[q_i]E[k_i])²
                 = 1·1 - 0 = 1

所以：

    Var(q·k) = d_k · 1 = d_k
    Std(q·k) = √d_k

**d_k=512 时**：点积的标准差约 22.6，可能达 ±60。

**softmax 的问题**：

    softmax([60, 0, 0, 0]) ≈ [1.0, 0, 0, 0]   ← 接近 one-hot

**梯度分析**：

    ∂softmax/∂x 在饱和区 ≈ 0

**所以梯度消失，训练不动。**

**解决**：

    scores = q·k / √d_k

现在方差 = \`d_k / d_k = 1\`，softmax 输入在合理范围。

**注意**：论文用的是 \`√d_k\` 而非 \`d_k\`——因为要归一方差（标准差是 √d_k）。

---

**② 两种 mask**

**Padding mask（填充掩码）**

**问题**：batch 中句子长度不同，短的用 \`<pad>\` 补齐。

**形状**：\`(B, 1, 1, T)\`（broadcast 到所有 query 位置和所有头）

**例子**（B=1, T=5，后两个是 pad）：

    mask = [[1, 1, 1, 0, 0]]

**作用**：所有位置都不关注 pad。

**Causal mask（因果掩码）**

**问题**：解码器生成时不能看未来的词。

**形状**：\`(B, 1, T, T)\` 下三角

**例子**（T=4）：

    位置0 只能看 0
    位置1 能看 0,1
    位置2 能看 0,1,2
    位置3 能看 0,1,2,3

**作用**：保证自回归性质。

**组合**：解码器的自注意力需要**同时**用两种 mask（padding + causal）。

**实现细节**：

    scores = scores.masked_fill(mask == 0, -1e9)

**为什么用 -1e9 而非 -inf**：

    exp(-inf) = 0        ← 数学上对
    但如果整行都是 -inf -> 0/0 = nan

    exp(-1e9) ≈ 0        ← 数值上安全
    且 softmax 后仍接近 0

---

**③ 多头注意力的形状变换**

**完整流程**（B=2, T=10, d_model=512, h=8）：

| 步骤 | 操作 | 形状 |
| --- | --- | --- |
| 输入 | - | (2, 10, 512) |
| 线性投影 | \`Linear(512,512)\` | (2, 10, 512) |
| 分维度 | \`view(2, -1, 8, 64)\` | (2, 10, 8, 64) |
| 换轴 | \`transpose(1, 2)\` | (2, 8, 10, 64) |
| 注意力 | 每个头独立 | (2, 8, 10, 64) |
| 换回 | \`transpose(1, 2)\` | (2, 10, 8, 64) |
| 合并 | \`view(2, -1, 512)\` | (2, 10, 512) |
| 输出投影 | \`Linear(512,512)\` | (2, 10, 512) |

**关键约束**：\`d_model = h × d_k\`。

**意义**：

**a) 参数量不变**

    单头 (h=1, d_k=512): W_q, W_k, W_v, W_o 各 512×512
    多头 (h=8, d_k=64): 同样 4 个 512×512 矩阵

**总参数量完全相同**——多头是"分工"不是"扩容"。

**b) 不同的头学到不同的关系**

实证观察（论文可视化）：

| 头 | 学到的东西 |
| --- | --- |
| 头 1 | 关注相邻词（局部语法） |
| 头 2 | 关注句首（全局上下文） |
| 头 3 | 关注动词（句法依赖） |
| 头 4 | 关注指代（coreference） |

**c) 为什么有效（一种解释）**

单个注意力只能学一种"相似度度量"。
多个头并行，相当于**多个不同的相似度空间**，
表达能力更强。

**类比**：一个人判断"两个词相关"只有一种标准，
八个人各自有不同标准，综合起来更全面。

---

**④ Annotated Transformer 与原论文的差异**

**差异 1：Pre-LN vs Post-LN**

| 版本 | 结构 |
| --- | --- |
| 原论文 | \`LayerNorm(x + Sublayer(x))\` |
| **Annotated** | \`x + Sublayer(LayerNorm(x))\` |

**为什么改**：Post-LN 深层时梯度不稳，需要 warmup。Pre-LN 更稳。

**这与 ResNet v2 的预激活是同一思想**：
把归一化移到子层之前，让残差捷径保持纯净。

**差异 2：规模配置**

| 参数 | Annotated | 原论文 |
| --- | --- | --- |
| 层数 | 2 | 6 |
| d_model | 512 | 512 |
| d_ff | 2048 | 2048 |
| batch | 32 句 | ~25000 tokens |
| 数据集 | IWSLT（小） | WMT（大） |
| 训练时间 | 分钟级 | 数天 |

**为什么**：为了让读者能在单卡上跑通。

**差异 3：一些实现简化**

- 没有 label smoothing（论文用了 0.1）
- 没有完整的 learning rate warmup 调参
- 没有 beam search（只做 greedy）

**结论**：

> **Annotated Transformer 是"理解工具"，不是"生产代码"。**

它的价值在于：

| 价值 | 说明 |
| --- | --- |
| **逐行对应** | 每个公式都有代码 |
| **可运行** | 真的能跑起来 |
| **可修改** | 便于实验 |
| **教学清晰** | 变量命名、注释都很清楚 |

**Rush 本人的说法**（大意）：

> 这不是最快的实现，也不是最好的实现，
> 但它是最容易理解的实现。

---

**⑤ 一个实践建议**

**如果你想真正理解 Transformer**：

1. **先读 Annotated Transformer 的代码**（比论文好懂）
2. **自己实现一遍**（不看答案）
3. **对比官方实现**（如 PyTorch 的 nn.Transformer）
4. **做实验**：改 h、改层数、去掉位置编码，看效果

**只有自己写过一遍，才算真正理解。**`,
        rubric: [
          { point: '√d_k 推导：Var(q·k)=d_k，softmax 饱和导致梯度消失', score: 3 },
          { point: '两种 mask：padding (B,1,1,T) vs causal (B,1,T,T) 下三角，-1e9 防 nan', score: 2 },
          { point: '形状变换完整流程 + d_model=h×d_k + 参数不变', score: 2 },
          { point: 'Pre-LN vs Post-LN（与 ResNet v2 同源）+ 教学配置差异', score: 2 },
          { point: '实践建议：自己实现一遍才算理解', score: 1 },
        ],
        keywords: ['Var=d_k', 'softmax 饱和', 'padding vs causal', 'd_model=h×d_k', 'Pre-LN'],
        explanation:
          '能推导「Var(q·k)=d_k」以及说清「多头参数量不变只是分工」，就是理解了 Transformer 实现的核心细节。',
        tags: ['综合分析'],
      },
    ],
  },
];
