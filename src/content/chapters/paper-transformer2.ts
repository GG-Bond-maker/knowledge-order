import type { Chapter } from '../../types';

/* ============================================================
 *  人工智能基础 · 论文导读 · Transformer 家族
 *  15 Neural Machine Translation by Jointly Learning to Align and Translate
 *
 *  来源：
 *  - 论文：Bahdanau, Cho, Bengio (2014) arXiv:1409.0473
 *  - 参考：Ojhaharsh/30u30 第 15 篇（CC BY-NC-ND 4.0，本地个人使用）
 *  - 本课程为原创导读 + 原创习题
 *
 *  执行说明：本章代码需要 PyTorch，走本地后端执行。
 * ============================================================ */

export const paperTransformerChapters2: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c2: Bahdanau Attention
   * ============================================================ */
  {
    id: 'paper-transformer-c2',
    title: 'Bahdanau 注意力：让翻译"看着原文"输出',
    goal: '理解固定长度向量的瓶颈，掌握加性注意力的对齐机制，能手写 BahdanauAttention 并可视化注意力权重。',
    lessons: [
      {
        id: 'paper-transformer-c2-l1',
        title: '从固定向量到动态对齐',
        difficulty: 4,
        content: `
### 学习目标

学完本节，你应该能够：
1. 用 BLEU 随句长下降的证据说明固定向量瓶颈，说出「动态对齐」如何取消该瓶颈；
2. 手推加性注意力三步（对齐分数→softmax→加权求和），对比 Bahdanau 加性与 Luong/Transformer 乘性的参数与并行性差异；
3. 用 numpy 实现 BahdanauAttention，观察解码「猫」时权重向 cat 集中的软对齐行为。

### 前置知识

- seq2seq 编码器-解码器结构；
- softmax；
- paper-foundation c2 的双向 RNN（encoder 用 BiRNN 的原因）。

### 问题背景

2014 年的 seq2seq 把整句压进一个固定向量——500 页书压成一页摘要，长句 BLEU 急剧下降。Bahdanau 的洞察：翻译每个词时只需要看源句的相关部分。编码器输出全部时间步的隐状态，解码器每一步用加性注意力 e=v^T tanh(W_s·s+W_h·h) 动态算权重，加权求和出上下文。对齐是学出来的副产品（cat↔chat 无人标注），软对齐可视化也成为可解释性的起点——Q/K/V 的原型在此定型。

### 直觉理解

同传译员不做「整句听完再默背」：翻到哪、看哪。解码器每生成一个词，回头扫一眼源句（对齐分数），把目光焦点（注意力权重）落在相关的词上，取一勺信息（加权求和）继续翻。源句再长也不怕——「摘要本」变成了「可以反复回看的原文」。

### 核心概念与原理详解

## 论文信息

| 项目 | 内容 |
| --- | --- |
| **标题** | Neural Machine Translation by Jointly Learning to Align and Translate |
| **作者** | Dzmitry Bahdanau, Kyunghyun Cho, Yoshua Bengio |
| **发表** | ICLR 2015 |
| **arXiv** | [1409.0473](https://arxiv.org/abs/1409.0473) |
| **一句话贡献** | 让解码器每一步动态"关注"源句的不同位置，打破固定长度向量的瓶颈 |

## 之前的问题：seq2seq 的瓶颈

**2014 年的标准做法**（Sutskever et al.）：

    Encoder: 源句 "I love cats" → 压缩成固定向量 c
    Decoder: 从 c 出发，逐词生成 "我 爱 猫"

**问题**：**所有信息必须挤进一个固定长度向量**。

<FixedVectorBottleneckDemo />

**具体表现**：

| 句子长度 | BLEU 分数 |
| --- | --- |
| 短句（< 10 词） | 较好 |
| 中句（10~20 词） | 下降 |
| **长句（> 30 词）** | **急剧下降** |

**为什么**：

    向量维度固定（如 1000 维）
    句子越长，每个词分配到的"容量"越少
    信息被压缩丢失

**类比**：把一本 500 页的书压缩成一页摘要——细节必然丢失。

## Bahdanau 的核心思想

**关键洞察**：**翻译每个词时，只需要看源句的相关部分。**

**例子**：

    源句：The cat sat on the mat
    生成"猫"时 → 关注 "cat"
    生成"垫子"时 → 关注 "mat"

**所以不需要把整句压成一个向量！**

**新做法**：

    Encoder: 输出所有时间步的隐藏状态 h_1, h_2, ..., h_T（不压缩）
    Decoder: 每生成一个词，动态计算对 h_i 的"注意力权重"

<AlignmentDemo />

## 注意力的计算

**三步**：

### ① 计算对齐分数

    e_{t,i} = score(s_{t-1}, h_i)

其中：
- \`s_{t-1}\`：解码器上一步的隐藏状态（"我现在想生成什么"）
- \`h_i\`：编码器第 i 步的隐藏状态（"源句第 i 个词的信息"）

**Bahdanau 用的 score 函数**（加性注意力）：

    e_{t,i} = v^T · tanh(W_s · s_{t-1} + W_h · h_i)

**为什么用 tanh**：
- 把两个不同空间的向量投影到同一空间
- tanh 提供非线性
- \`v^T\` 把向量压成标量

### ② 归一化成权重

    α_{t,i} = exp(e_{t,i}) / Σ_j exp(e_{t,j})

这就是 softmax，保证 \`Σ α = 1\`。

### ③ 加权求和得到上下文

    c_t = Σ_i α_{t,i} · h_i

**c_t 就是"当前步骤应该看的源句信息"**。

<AttentionMathDemo />

## 加性 vs 乘性注意力

**Bahdanau（加性）**：

    score(s, h) = v^T · tanh(W_s·s + W_h·h)

**Luong（乘性，2015）**：

    score(s, h) = s^T · W · h

**对比**：

| 类型 | 公式 | 参数 | 速度 | 效果 |
| --- | --- | --- | --- | --- |
| **加性（Bahdanau）** | \`v^T tanh(W_s s + W_h h)\` | 较多 | 慢 | 略好（长句） |
| **乘性（Luong）** | \`s^T W h\` | 较少 | **快**（矩阵乘） | 相当 |

**Transformer 用的是乘性**（缩放点积）：

    score(Q, K) = Q·K^T / √d_k

**为什么 Transformer 用乘性**：矩阵乘法可以并行，GPU 效率高。

## 注意力解决了什么

**① 长距离依赖**

    RNN: 第 1 个词的信息要经过 T 步才能到第 T 步
    注意力: 任意两个位置的距离都是 1

**② 可解释性**

注意力权重可以可视化——看模型"在看哪里"。

**③ 不再需要固定向量**

源句多长都可以，编码器输出全部保留。

<AttentionHeatmapDemo />

## 注意力权重的性质

**论文观察到的对齐模式**：

**英语→法语**（语序相似）：

    源: The  cat  sat  on  the  mat
    译: Le   chat était sur le  tapis
    对齐：近似对角线（顺序对应）

**英语→德语**（语序不同）：

    源: I  have  a  cat
    译: Ich habe eine Katze
    对齐：仍有偏移，因为德语动词位置不同

**关键**：**注意力自动学到了词对齐**——没有人告诉它 "cat" 对应 "chat"。

**这被称为"软对齐"（soft alignment）**：
- 不是硬性的 1-1 对应
- 而是概率分布（一个词可能关注多个源词）

## 与 Transformer 的关系

**Bahdanau 注意力 → Transformer 的关键继承**：

| 概念 | Bahdanau | Transformer |
| --- | --- | --- |
| **Query** | \`s_{t-1}\`（解码器状态） | Q |
| **Key** | \`h_i\`（编码器状态） | K |
| **Value** | \`h_i\`（同 Key） | V |
| **打分** | 加性 tanh | 缩放点积 |
| **归一化** | softmax | softmax |
| **聚合** | 加权求和 | 加权求和 |

**核心公式完全一致**：

    Attention(Q, K, V) = softmax(score(Q, K)) · V

**Transformer 的三个改进**：

1. **去掉 RNN**：Q/K/V 都来自同一序列（自注意力）
2. **多头**：并行多个注意力，捕获不同子空间
3. **乘性打分**：矩阵乘法并行化

**所以理解 Bahdanau 是理解 Transformer 的基础。**

## 一个常被忽略的细节

**论文的 encoder 是双向 RNN**（BiRNN）：

    h_i = [→h_i ; ←h_i]

**为什么双向**：
- 翻译"cat"时，既需要看前面的词，也需要看后面的词
- 单向 RNN 只看过去，信息不全

**代价**：必须等整句输入完才能开始（不能流式翻译）。

**Transformer 也是"双向"的**（encoder 可以看全句）——
所以继承了同样的优势与代价。

## 本节来源

> **来源类型：学术来源**
> - Bahdanau, D., Cho, K., Bengio, Y. *Neural Machine Translation by Jointly
>   Learning to Align and Translate* arXiv:[1409.0473](https://arxiv.org/abs/1409.0473)（ICLR 2015）
> - Luong, M.-T., Pham, H., Manning, C. D. *Effective Approaches to Attention-based
>   Neural Machine Translation* arXiv:[1508.04025](https://arxiv.org/abs/1508.04025)（乘性注意力）
> - Vaswani, A. et al. *Attention Is All You Need*
>   arXiv:[1706.03762](https://arxiv.org/abs/1706.03762)（Transformer）
>
> **来源类型：参考资料（CC BY-NC-ND 4.0，本地个人使用）**
> - Ojhaharsh/30u30 第 15 篇（293 行，含 BahdanauAttention / AttentionDecoder / Seq2SeqWithAttention）
>
> **来源类型：原创**
> - 全部导读文字、交互图示、代码示例与习题

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
words = ["The", "cat", "sat", "on", "the", "mat"]
h = np.array([[-0.5, 1, 0], [2, 0, 0], [0, 2, 0], [-0.5, 0, 1], [-0.5, 1, 0], [0, 0, 2]], float)
s = np.array([2.0, 0.5, 0.5])                      # 解码器状态: 正想生成「猫」
Ws = Wh = 0.5 * np.eye(3); v = np.array([4.0, 0, 0])   # 演示投影(真实模型中学出)
e = np.tanh(Ws @ s + h @ Wh.T) @ v                 # e_i = v^T tanh(Ws·s + Wh·h_i)
p = np.exp(e - e.max()); p /= p.sum()
for w, pi in zip(words, p):
    print(f"  {w:>4}: {pi:.3f} " + "#" * int(pi * 40))
print("软对齐: 行和 =", round(float(p.sum()), 2), "| 解码「猫」时权重集中于 cat(均匀基线 0.167)")\`\`\`

预期输出（实测）：实测：解码状态指向「猫」时，6 个源词的对齐权重最大落在 cat（0.371，均匀基线 0.167 的两倍余），功能词 The/on/the 仅 0.100；权重行随机（和=1）且为软对齐（次要词 sat/mat 仍分得 0.165）——对齐无需标注、由注意力自学。

**常见错误**：打分函数输入用 s_t 而非 s_{t-1}（泄露当前步信息）；softmax 前忘减 max 数值溢出；把对齐当硬 1-1 映射做解码约束——软对齐本来就是分布。

### 常见误区

1. **注意力权重=翻译对齐的真值**——它是对齐的软近似，可视化是诊断工具不是金标准；
2. **加性比乘性好**——长句略好但慢，Transformer 选乘性为并行；
3. **encoder 必须双向**——BiRNN 提升质量但失去流式能力，流式架构（RNN-T）反向取舍。

### 知识关联

- **向前**：paper-foundation c2 的 RNN/LSTM 是 encoder/decoder 的载体；
- **向后**：c1 把打分换成缩放点积并去掉循环，c3 的交叉注意力（Q=decoder, K/V=encoder）是直系；
- **平行**：paper-reasoning c2 指针网络——注意力权重当输出的另一种用法。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 瓶颈 | 固定向量 c：长句 BLEU 急剧下降 |
| 机制 | e=v^T tanh(W_s s+W_h h) → softmax → 加权求和 |
| 对齐 | 软对齐自学（cat↔chat 无标注） |
| 谱系 | 加性(慢/长句略好) vs 乘性(快/并行) |
| 地位 | Q/K/V 原型，Transformer 的直接前身 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见论文原文：Bahdanau, Cho & Bengio, Neural Machine Translation by Jointly Learning to Align and Translate, arXiv:1409.0473）
`,
        tips: [
          {
            kind: 'interview',
            text: '「Bahdanau 注意力解决什么问题」：seq2seq 把所有信息压进固定向量，长句性能急剧下降。注意力让解码器每步动态关注源句的不同位置，不再需要固定向量。',
          },
          {
            kind: 'leak',
            text: '「加性 vs 乘性注意力」：Bahdanau 用 v^T·tanh(W_s·s + W_h·h)（加性），Luong 用 s^T·W·h（乘性）。Transformer 用缩放点积 Q·K^T/√d_k（乘性，可并行）。',
          },
          {
            kind: 'pitfall',
            text: 'Bahdanau 的 encoder 是双向 RNN——翻译某词需要看上下文两侧。代价是必须等整句输入完才能开始，不能流式翻译。',
          },
        ],
        demos: [
          {
            title: 'Bahdanau 注意力实现（PyTorch）',
            lang: 'python',
            code: `import torch
import torch.nn as nn
import torch.nn.functional as F

class BahdanauAttention(nn.Module):
    """
    加性注意力（Bahdanau et al. 2015）。

    e_{t,i} = v^T · tanh(W_s·s_{t-1} + W_h·h_i)
    α = softmax(e)
    c = Σ α_i · h_i
    """
    def __init__(self, hidden_dim):
        super().__init__()
        self.W_s = nn.Linear(hidden_dim, hidden_dim, bias=False)
        self.W_h = nn.Linear(hidden_dim, hidden_dim, bias=False)
        self.v = nn.Linear(hidden_dim, 1, bias=False)

    def forward(self, decoder_hidden, encoder_outputs):
        """
        decoder_hidden: (batch, hidden)         当前解码器状态 s_{t-1}
        encoder_outputs: (batch, src_len, hidden)  所有编码器状态 h_1..h_T

        返回:
          context: (batch, hidden)   加权求和的上下文向量
          weights: (batch, src_len)  注意力权重（可可视化）
        """
        # ① 计算对齐分数
        # decoder_hidden 扩到 (batch, 1, hidden) 以便广播
        s = self.W_s(decoder_hidden).unsqueeze(1)          # (B, 1, H)
        h = self.W_h(encoder_outputs)                       # (B, T, H)
        energy = torch.tanh(s + h)                          # (B, T, H) 广播相加
        scores = self.v(energy).squeeze(-1)                 # (B, T)

        # ② softmax 归一化
        weights = F.softmax(scores, dim=-1)                 # (B, T)

        # ③ 加权求和
        context = torch.bmm(weights.unsqueeze(1), encoder_outputs).squeeze(1)  # (B, H)

        return context, weights


print("=== Bahdanau 注意力前向 ===")
torch.manual_seed(42)
B, T, H = 2, 5, 8
attn = BahdanauAttention(H)

dec_hidden = torch.randn(B, H)
enc_outputs = torch.randn(B, T, H)

context, weights = attn(dec_hidden, enc_outputs)

print(f"解码器状态: {tuple(dec_hidden.shape)}")
print(f"编码器输出: {tuple(enc_outputs.shape)}")
print(f"上下文向量: {tuple(context.shape)}")
print(f"注意力权重: {tuple(weights.shape)}")
print()
print("注意力权重（每行和应为 1）:")
for b in range(B):
    w = weights[b].detach().numpy()
    print(f"  样本{b}: {np_round(w)} (和={w.sum():.4f})")

print()
print("=== 关键验证 ===")
print()
print("1. 权重之和 = 1:", torch.allclose(weights.sum(dim=-1), torch.ones(B), atol=1e-5))
print("2. 上下文 = 加权和:")
manual = torch.bmm(weights.unsqueeze(1), enc_outputs).squeeze(1)
print("   ", torch.allclose(context, manual, atol=1e-5))

print()
print("=== 注意力的'聚焦'效果 ===")
print()
# 构造一个明显的对齐：让某个位置分数特别高
enc2 = torch.zeros(1, 4, H)
enc2[0, 2] = torch.ones(H) * 5     # 第 3 个位置特征强
dec2 = torch.ones(1, H) * 5

ctx2, w2 = attn(dec2, enc2)
print(f"源句 4 个位置，第 3 个特征最强")
print(f"注意力权重: {w2[0].detach().numpy()}")
print(f"最大权重位置: {w2[0].argmax().item()}")
print()
print("-> 注意力自动聚焦到信息最强的位置")`,
          },
          {
            title: '完整 seq2seq + 注意力',
            lang: 'python',
            code: `import torch
import torch.nn as nn
import torch.nn.functional as F

class Encoder(nn.Module):
    """双向 GRU 编码器（Bahdanau 用 BiRNN）。"""
    def __init__(self, vocab_size, embed_dim, hidden_dim):
        super().__init__()
        self.embed = nn.Embedding(vocab_size, embed_dim)
        self.rnn = nn.GRU(embed_dim, hidden_dim, batch_first=True, bidirectional=True)
        self.fc = nn.Linear(hidden_dim * 2, hidden_dim)

    def forward(self, src):
        # src: (B, T)
        e = self.embed(src)                      # (B, T, E)
        out, hidden = self.rnn(e)                # out: (B, T, 2H)
        # 把双向的最终状态合并成单向
        h = torch.tanh(self.fc(torch.cat([hidden[0], hidden[1]], dim=-1)))
        return out, h.unsqueeze(0)               # (B,T,2H), (1,B,H)


class BahdanauAttention(nn.Module):
    def __init__(self, hidden_dim, enc_dim):
        super().__init__()
        self.W_s = nn.Linear(hidden_dim, hidden_dim, bias=False)
        self.W_h = nn.Linear(enc_dim, hidden_dim, bias=False)
        self.v = nn.Linear(hidden_dim, 1, bias=False)

    def forward(self, s, h):
        # s: (B, H), h: (B, T, 2H)
        energy = torch.tanh(self.W_s(s).unsqueeze(1) + self.W_h(h))
        scores = self.v(energy).squeeze(-1)
        weights = F.softmax(scores, dim=-1)
        context = torch.bmm(weights.unsqueeze(1), h).squeeze(1)
        return context, weights


class Decoder(nn.Module):
    def __init__(self, vocab_size, embed_dim, hidden_dim, enc_dim):
        super().__init__()
        self.embed = nn.Embedding(vocab_size, embed_dim)
        self.attn = BahdanauAttention(hidden_dim, enc_dim)
        self.rnn = nn.GRU(embed_dim + enc_dim, hidden_dim, batch_first=True)
        self.fc = nn.Linear(hidden_dim, vocab_size)

    def forward(self, trg, hidden, enc_out):
        # trg: (B, T_trg)
        e = self.embed(trg)
        outputs = []
        weights_all = []
        for t in range(e.size(1)):
            s = hidden[-1]
            context, w = self.attn(s, enc_out)
            inp = torch.cat([e[:, t], context], dim=-1).unsqueeze(1)
            out, hidden = self.rnn(inp, hidden)
            outputs.append(self.fc(out.squeeze(1)))
            weights_all.append(w)
        return torch.stack(outputs, 1), torch.stack(weights_all, 1)


class Seq2SeqWithAttention(nn.Module):
    def __init__(self, src_vocab, trg_vocab, embed_dim=32, hidden_dim=64):
        super().__init__()
        self.encoder = Encoder(src_vocab, embed_dim, hidden_dim)
        self.decoder = Decoder(trg_vocab, embed_dim, hidden_dim, hidden_dim * 2)

    def forward(self, src, trg):
        enc_out, hidden = self.encoder(src)
        return self.decoder(trg, hidden, enc_out)


print("=== 完整模型前向 ===")
torch.manual_seed(0)
model = Seq2SeqWithAttention(src_vocab=100, trg_vocab=80, embed_dim=32, hidden_dim=64)

src = torch.randint(0, 100, (2, 7))    # 2 个样本，源句 7 词
trg = torch.randint(0, 80, (2, 5))     # 目标句 5 词

logits, weights = model(src, trg)
print(f"源句: {tuple(src.shape)}")
print(f"目标句: {tuple(trg.shape)}")
print(f"输出 logits: {tuple(logits.shape)}")
print(f"注意力权重: {tuple(weights.shape)}  <- (B, T_trg, T_src)")
print()
print("形状解释：")
print(f"  {weights.shape[0]} 个样本")
print(f"  {weights.shape[1]} 个目标词（每步一组权重）")
print(f"  {weights.shape[2]} 个源词（对每个源词的关注度）")

print()
print("=== 注意力权重矩阵（样本0）===")
print()
print("行 = 目标词，列 = 源词")
w = weights[0].detach().numpy()
for t in range(w.shape[0]):
    row = " ".join(f"{v:.2f}" for v in w[t])
    peak = w[t].argmax()
    print(f"  目标词{t}: [{row}]  峰值在源词{peak}")

print()
print("=== 参数量 ===")
total = sum(p.numel() for p in model.parameters())
print(f"总参数量: {total:,}")
print()
print("分布：")
for name, module in [("Encoder", model.encoder), ("Decoder", model.decoder)]:
    n = sum(p.numel() for p in module.parameters())
    print(f"  {name}: {n:,} ({n/total*100:.1f}%)")
n_attn = sum(p.numel() for p in model.decoder.attn.parameters())
print(f"  其中注意力层: {n_attn:,}")`,
          },
          {
            title: '注意力权重可视化：对齐学习',
            lang: 'python',
            code: `import numpy as np

def simulate_alignment(src_len, trg_len, offset=0, noise=0.1, seed=0):
    """
    模拟注意力对齐矩阵。

    假设：目标词 t 主要关注源词 t+offset
    """
    rng = np.random.default_rng(seed)
    W = np.zeros((trg_len, src_len))
    for t in range(trg_len):
        target = min(t + offset, src_len - 1)
        for i in range(src_len):
            # 距离目标位置越近，分数越高
            dist = abs(i - target)
            W[t, i] = np.exp(-dist * 1.5)
        # 加噪声
        W[t] += rng.normal(0, noise, src_len)
        W[t] = np.maximum(W[t], 0)
        # softmax 归一化
        W[t] = W[t] / W[t].sum()
    return W


def print_heatmap(W, src_words, trg_words):
    """用字符打印热力图。"""
    chars = " .:-=+*#%@"
    print("       " + " ".join(f"{w[:3]:>3}" for w in src_words))
    for t in range(W.shape[0]):
        row = ""
        for i in range(W.shape[1]):
            idx = int(W[t, i] * (len(chars) - 1))
            row += f" {chars[idx]:>3}"
        print(f"{trg_words[t][:5]:>6} {row}")


print("=== 场景 1：语序相似（英语→法语）===")
print()
src = ["The", "cat", "sat", "on", "the", "mat"]
trg = ["Le", "chat", "etait", "sur", "le", "tapis"]
W1 = simulate_alignment(6, 6, offset=0, seed=1)
print_heatmap(W1, src, trg)
print()
print("观察：近似对角线——目标词 t 主要关注源词 t")
print()

print("=== 场景 2：语序不同（英语→德语，动词后置）===")
print()
src2 = ["I", "have", "a", "cat"]
trg2 = ["Ich", "habe", "eine", "Katze"]
# 德语动词位置类似，但整体有偏移
W2 = simulate_alignment(4, 4, offset=0, seed=2)
print_heatmap(W2, src2, trg2)
print()

print("=== 场景 3：语序反转（英语→日语，宾语前置）===")
print()
src3 = ["I", "love", "cats"]
trg3 = ["Watashi", "wa", "neko", "ga", "suki"]
# 日语宾语在前 -> 反向对齐
W3 = simulate_alignment(3, 5, offset=0, seed=3)
# 手动反转部分对齐
W3[2] = np.array([0.1, 0.1, 0.7])   # "neko" 关注 "cats"
W3[4] = np.array([0.1, 0.8, 0.1])   # "suki" 关注 "love"
for t in range(W3.shape[0]):
    W3[t] /= W3[t].sum()
print_heatmap(W3, src3, trg3)
print()

print("=== 关键洞察 ===")
print()
print("注意力权重自动学到了词对齐：")
print("  · 不需要人工标注对齐关系")
print("  · 训练中通过翻译损失自动学习")
print("  · 这被称为'软对齐'（soft alignment）")
print()
print("论文的核心贡献就是：")
print("  'Jointly Learning to Align and Translate'")
print("  —— 对齐和翻译是一起学出来的")
print()
print("=== 可视化矩阵数值 ===")
print()
print("英语→法语的对齐矩阵：")
print("       " + " ".join(f"{w:>6}" for w in src))
for t in range(W1.shape[0]):
    print(f"{trg[t]:>6} " + " ".join(f"{v:>6.3f}" for v in W1[t]))`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'paper-transformer-c2-e1',
        type: 'single',
        difficulty: 2,
        question: 'Bahdanau 注意力解决的核心问题是？',
        options: [
          { value: 'A', text: '训练速度慢' },
          { value: 'B', text: 'seq2seq 把所有信息压进固定长度向量，长句性能急剧下降' },
          { value: 'C', text: '词表太大' },
          { value: 'D', text: '梯度爆炸' },
        ],
        answer: 'B',
        explanation:
          '固定向量是瓶颈——句子越长，每个词分配到的容量越少。注意力让解码器每步动态关注源句的不同位置，不再需要把整句压缩成一个向量。',
        tags: ['核心动机'],
      },
      {
        id: 'paper-transformer-c2-e2',
        type: 'judge',
        difficulty: 2,
        question: 'Bahdanau 注意力的 encoder 输出只保留最后一个时间步的隐藏状态。',
        answer: false,
        explanation:
          '恰恰相反——保留**所有**时间步的隐藏状态 h_1...h_T，这才是注意力的基础。如果只保留最后一个，就退化成了原来的固定向量瓶颈。',
        tags: ['编码器输出'],
      },
      {
        id: 'paper-transformer-c2-e3',
        type: 'multiple',
        difficulty: 3,
        question: 'Bahdanau 注意力的计算步骤包括？（多选）',
        options: [
          { value: 'A', text: '用 tanh 计算对齐分数 e_{t,i} = v^T·tanh(W_s·s + W_h·h)' },
          { value: 'B', text: 'softmax 归一化成权重 α' },
          { value: 'C', text: '加权求和得到上下文 c_t = Σ α_i·h_i' },
          { value: 'D', text: '对源句做池化' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误——注意力不做池化，而是加权求和（权重是学出来的）。A/B/C 是注意力的标准三步：打分 → 归一化 → 加权聚合。',
        tags: ['计算步骤'],
      },
      {
        id: 'paper-transformer-c2-e4',
        type: 'fill',
        difficulty: 3,
        question:
          'Bahdanau 用的是 ___ 注意力（用 tanh），而 Transformer 用的是缩放点积注意力（乘性）。',
        blanks: [['加性', 'additive', 'additive attention']],
        explanation:
          '加性：v^T·tanh(W_s·s + W_h·h)。乘性（Luong）：s^T·W·h。Transformer 用 Q·K^T/√d_k。乘性可以用矩阵乘法并行，GPU 效率更高。',
        tags: ['加性 vs 乘性'],
      },
      {
        id: 'paper-transformer-c2-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现注意力权重的 softmax 归一化：attention_weights(scores)。\n\n- scores: (T,) 对齐分数\n- 返回 softmax 后的权重，和应为 1\n- 注意数值稳定性（减去最大值）',
        starterCode: `import numpy as np

def attention_weights(scores):
    scores = np.asarray(scores, dtype=float)
    shifted = ___
    exp_s = ___
    return ___
`,
        setupCode: '',
        expectedOutput: '注意力权重',
        tests: `import numpy as np
# 均匀分数 -> 均匀权重
w = attention_weights(np.zeros(4))
assert np.allclose(w, [0.25]*4), f"应均匀，实际 {w}"
assert abs(w.sum() - 1.0) < 1e-9

# 一个高分 -> 权重集中
w2 = attention_weights([10.0, 0.0, 0.0])
assert w2[0] > 0.99, f"应集中在第一个，实际 {w2}"
assert abs(w2.sum() - 1.0) < 1e-9

# 数值稳定性：极大值不溢出
w3 = attention_weights([1000.0, 1000.0])
assert np.allclose(w3, [0.5, 0.5])
assert not np.isnan(w3).any()

# 二维
w4 = attention_weights(np.array([[1.0, 1.0], [2.0, 0.0]]))
assert abs(w4[0].sum() - 1.0) < 1e-9
assert abs(w4[1].sum() - 1.0) < 1e-9
`,
        answer: `import numpy as np

def attention_weights(scores):
    scores = np.asarray(scores, dtype=float)
    shifted = scores - np.max(scores, axis=-1, keepdims=True)
    exp_s = np.exp(shifted)
    return exp_s / np.sum(exp_s, axis=-1, keepdims=True)
`,
        explanation:
          '**减去最大值是数值稳定的关键**：\n\n    exp(1000) = inf  ->  inf/inf = nan\n    exp(1000-1000) = 1  ->  正常\n\n**数学上等价**：\n\n    exp(x_i - max) / Σexp(x_j - max)\n    = [exp(x_i)/exp(max)] / [Σexp(x_j)/exp(max)]\n    = exp(x_i) / Σexp(x_j)\n\n**`axis=-1, keepdims=True`** 支持批量处理：\n- 一维：(T,) → 标量\n- 二维：(B,T) → (B,1) 广播\n\n**这就是 softmax，注意力权重的核心。**',
        tags: ['编程', 'softmax'],
      },
      {
        id: 'paper-transformer-c2-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现加性注意力的打分函数：additive_score(s, h, W_s, W_h, v)。\n\n- s: (H,) 解码器状态\n- h: (T, H) 编码器输出\n- 返回 (T,) 对齐分数\n\n公式：e_i = v^T · tanh(W_s·s + W_h·h_i)',
        starterCode: `import numpy as np

def additive_score(s, h, W_s, W_h, v):
    # W_s: (H, H), W_h: (H, H), v: (H,)
    proj_s = ___
    proj_h = ___
    energy = ___
    return ___
`,
        setupCode: '',
        expectedOutput: '对齐分数',
        tests: `import numpy as np
np.random.seed(0)
H, T = 4, 3
s = np.random.randn(H)
h = np.random.randn(T, H)
W_s = np.random.randn(H, H) * 0.5
W_h = np.random.randn(H, H) * 0.5
v = np.random.randn(H) * 0.5

scores = additive_score(s, h, W_s, W_h, v)
assert scores.shape == (T,), f"形状应为 ({T},)，实际 {scores.shape}"

# 验证公式
expected = np.array([v @ np.tanh(W_s @ s + W_h @ h[i]) for i in range(T)])
assert np.allclose(scores, expected), f"公式错误"

# tanh 输出范围 -> 分数有界
assert np.all(np.abs(scores) <= np.linalg.norm(v) + 1e-6)
`,
        answer: `import numpy as np

def additive_score(s, h, W_s, W_h, v):
    proj_s = W_s @ s                 # (H,)
    proj_h = h @ W_h.T               # (T, H)
    energy = np.tanh(proj_s[None, :] + proj_h)   # (T, H)
    return energy @ v                # (T,)
`,
        explanation:
          '**`h @ W_h.T`** 是批量矩阵乘：\n\n    h: (T, H)  @  W_h.T: (H, H)  ->  (T, H)\n\n比循环 `for i: W_h @ h[i]` 快得多。\n\n**`proj_s[None, :]`** 把 (H,) 变成 (1, H) 以便广播到 (T, H)。\n\n**`energy @ v`** 把 (T,H) 投影成 (T,)，得到每个位置的标量分数。\n\n**为什么用 tanh**：\n- 把 s 和 h 投影到同一空间后相加\n- tanh 提供非线性，且输出有界（-1,1）\n- 防止分数爆炸\n\n**注意 `v` 是学习参数**：它决定"什么样的模式值得关注"。',
        tags: ['编程', '加性打分'],
      },
      {
        id: 'paper-transformer-c2-e7',
        type: 'code',
        difficulty: 3,
        question:
          '用 PyTorch 实现完整的 BahdanauAttention：\n\n- forward(decoder_hidden, encoder_outputs) -> (context, weights)\n- decoder_hidden: (B, H)\n- encoder_outputs: (B, T, H)\n- context: (B, H)\n- weights: (B, T)，每行和为 1',
        starterCode: `import torch
import torch.nn as nn
import torch.nn.functional as F

class BahdanauAttention(nn.Module):
    def __init__(self, hidden_dim):
        super().__init__()
        self.W_s = nn.Linear(hidden_dim, hidden_dim, bias=False)
        self.W_h = nn.Linear(hidden_dim, hidden_dim, bias=False)
        self.v = nn.Linear(hidden_dim, 1, bias=False)

    def forward(self, decoder_hidden, encoder_outputs):
        s = self.W_s(decoder_hidden).unsqueeze(1)   # (B, 1, H)
        h = ___
        energy = ___
        scores = ___
        weights = ___
        context = ___
        return context, weights
`,
        setupCode: '',
        expectedOutput: 'BahdanauAttention',
        tests: `import torch
import torch.nn as nn

torch.manual_seed(42)
B, T, H = 2, 5, 8
attn = BahdanauAttention(H)
dec = torch.randn(B, H)
enc = torch.randn(B, T, H)

ctx, w = attn(dec, enc)
assert ctx.shape == (B, H), f"context 形状错误: {ctx.shape}"
assert w.shape == (B, T), f"weights 形状错误: {w.shape}"

# 权重和为 1
assert torch.allclose(w.sum(dim=-1), torch.ones(B), atol=1e-5)

# 权重非负
assert (w >= 0).all()

# 上下文 = 加权和
manual = torch.bmm(w.unsqueeze(1), enc).squeeze(1)
assert torch.allclose(ctx, manual, atol=1e-5)

# 梯度可回传
ctx.sum().backward()
assert attn.W_s.weight.grad is not None
`,
        answer: `import torch
import torch.nn as nn
import torch.nn.functional as F

class BahdanauAttention(nn.Module):
    def __init__(self, hidden_dim):
        super().__init__()
        self.W_s = nn.Linear(hidden_dim, hidden_dim, bias=False)
        self.W_h = nn.Linear(hidden_dim, hidden_dim, bias=False)
        self.v = nn.Linear(hidden_dim, 1, bias=False)

    def forward(self, decoder_hidden, encoder_outputs):
        s = self.W_s(decoder_hidden).unsqueeze(1)   # (B, 1, H)
        h = self.W_h(encoder_outputs)                # (B, T, H)
        energy = torch.tanh(s + h)                   # (B, T, H) 广播
        scores = self.v(energy).squeeze(-1)          # (B, T)
        weights = F.softmax(scores, dim=-1)          # (B, T)
        context = torch.bmm(weights.unsqueeze(1), encoder_outputs).squeeze(1)  # (B, H)
        return context, weights
`,
        explanation:
          '**四个关键步骤**：\n\n1. **`unsqueeze(1)`**：把 (B,H) 变成 (B,1,H)，以便与 (B,T,H) 广播\n2. **`s + h` 广播**：(B,1,H) + (B,T,H) → (B,T,H)\n3. **`self.v(energy).squeeze(-1)`**：(B,T,H) → (B,T,1) → (B,T)\n4. **`torch.bmm`**：批量矩阵乘 (B,1,T) @ (B,T,H) → (B,1,H)\n\n**`bmm` 而不是 `@`**：`bmm` 专门做批量矩阵乘，要求 3D 输入。\n\n**`squeeze(1)`**：把 (B,1,H) 压回 (B,H)。\n\n**返回 weights 很重要**：用于可视化分析对齐关系，也是可解释性的来源。',
        tags: ['编程', 'BahdanauAttention'],
      },
      {
        id: 'paper-transformer-c2-e8',
        type: 'code',
        difficulty: 4,
        question:
          '实现注意力权重分析：analyze_alignment(weights)。\n\n- weights: (T_trg, T_src) numpy 数组\n- 返回 dict：{max_positions, entropy, is_diagonal}\n  - max_positions: 每个目标词的峰值源位置列表\n  - entropy: 平均熵（越低越"聚焦"）\n- is_diagonal: 是否近似对角（峰值位置单调递增）',
        starterCode: `import numpy as np

def analyze_alignment(weights):
    weights = np.asarray(weights, dtype=float)
    T_trg, T_src = weights.shape

    max_positions = ___
    entropies = ___
    entropy = ___
    is_diagonal = ___

    return {
        "max_positions": max_positions,
        "entropy": entropy,
        "is_diagonal": is_diagonal,
    }
`,
        setupCode: '',
        expectedOutput: '对齐分析',
        tests: `import numpy as np

# 完美对角
W = np.eye(4)
r = analyze_alignment(W)
assert r["max_positions"] == [0, 1, 2, 3]
assert r["entropy"] < 0.01, f"对角矩阵熵应接近0: {r['entropy']}"
assert r["is_diagonal"] == True

# 均匀分布：熵最大
W2 = np.ones((3, 4)) / 4
r2 = analyze_alignment(W2)
assert r2["entropy"] > 1.3, f"均匀分布熵应大: {r2['entropy']}"
assert r2["is_diagonal"] == False

# 单调但非对角
W3 = np.zeros((3, 4))
W3[0, 0] = 1; W3[1, 1] = 1; W3[2, 3] = 1
r3 = analyze_alignment(W3)
assert r3["max_positions"] == [0, 1, 3]
assert r3["is_diagonal"] == True

# 非单调
W4 = np.zeros((3, 3))
W4[0, 2] = 1; W4[1, 0] = 1; W4[2, 1] = 1
r4 = analyze_alignment(W4)
assert r4["is_diagonal"] == False
`,
        answer: `import numpy as np

def analyze_alignment(weights):
    weights = np.asarray(weights, dtype=float)
    T_trg, T_src = weights.shape

    max_positions = [int(weights[t].argmax()) for t in range(T_trg)]

    entropies = []
    for t in range(T_trg):
        w = weights[t]
        w = w / (w.sum() + 1e-12)
        entropies.append(-np.sum(w * np.log2(w + 1e-12)))
    entropy = float(np.mean(entropies))

    # 均匀分布时 argmax 无意义，直接判为非对角
    uniform = all(
        np.max(weights[t]) - np.min(weights[t]) < 1e-6
        for t in range(T_trg)
    )
    is_diagonal = (not uniform) and all(
        max_positions[i] <= max_positions[i + 1]
        for i in range(len(max_positions) - 1)
    )

    return {
        "max_positions": max_positions,
        "entropy": entropy,
        "is_diagonal": is_diagonal,
    }
`,
        explanation:
          '**三个指标的物理含义**：\n\n**① max_positions（峰值位置）**\n\n    每个目标词最关注哪个源词\n对角线 = 顺序对应\n偏移 = 语序不同\n\n**② entropy（熵）**\n\n    熵低 = 注意力集中（"我知道该看哪"）\n熵高 = 注意力分散（"不确定看哪"）\n均匀分布时熵 = log2(T_src)\n\n**③ is_diagonal（单调性）**\n\n    峰值位置单调递增 = 顺序对应\n非单调 = 语序重排（如日语宾语前置）\n\n**实践用途**：\n- 诊断翻译质量（熵高说明模型困惑）\n- 发现语序差异\n- 分析多义词的上下文消歧',
        tags: ['编程', '对齐分析'],
      },
      {
        id: 'paper-transformer-c2-e9',
        type: 'judge',
        difficulty: 4,
        question: 'Bahdanau 注意力的 encoder 必须是单向 RNN，因为双向会破坏因果性。',
        answer: false,
        explanation:
          'Bahdanau 用的是**双向** RNN——翻译某个词需要看源句两侧的上下文。这不违反因果性，因为 encoder 处理的是完整的源句（不是生成过程）。只有 decoder 需要因果性。',
        tags: ['双向编码器'],
      },
      {
        id: 'paper-transformer-c2-e10',
        type: 'open',
        difficulty: 4,
        question:
          '请解释：① 固定向量瓶颈的具体表现与原因；② Bahdanau 注意力的三步计算；③ 加性 vs 乘性注意力的取舍；④ 注意力如何自然演变成 Transformer。',
        referenceAnswer: `**① 固定向量瓶颈**

**seq2seq 的做法**：

    Encoder: 源句 → 逐词 RNN → 最终隐藏状态 c（固定维度）
    Decoder: 从 c 出发 → 逐词生成译文

**具体表现**（论文的实测）：

| 句子长度 | BLEU |
| --- | --- |
| < 10 词 | 较好 |
| 10~20 词 | 下降 |
| **> 30 词** | **急剧下降** |

**原因**：

    向量维度固定（如 1000）
    句子越长，每词分到的"容量"越少
    信息被压缩丢失

**类比**：把 500 页书压缩成一页摘要——细节必然丢失。

**更深的分析**：

    假设源句有 T 个词，每个词的信息量约 I
    总信息量 = T × I
    向量容量 = H（固定）
    当 T×I > H 时，必然丢失信息

**这就是"信息瓶颈"（information bottleneck）。**

---

**② Bahdanau 注意力的三步计算**

**第一步：打分**

    e_{t,i} = v^T · tanh(W_s·s_{t-1} + W_h·h_i)

- \`s_{t-1}\`：解码器上一步状态（"我想生成什么"）
- \`h_i\`：编码器第 i 步状态（"源句第 i 个词"）
- \`W_s, W_h\`：把两者投影到同一空间
- \`tanh\`：非线性，输出有界
- \`v^T\`：压成标量

**第二步：归一化**

    α_{t,i} = softmax_i(e_{t,i})

保证 \`Σ_i α_{t,i} = 1\`，形成概率分布。

**第三步：加权聚合**

    c_t = Σ_i α_{t,i} · h_i

\`c_t\` 是"当前步骤应该看的源句信息"。

**然后**：

    s_t = RNN(s_{t-1}, [y_{t-1}, c_t])
    p(y_t | ...) = softmax(W·s_t)

**关键**：\`c_t\` 每步都重新计算——这是"动态"的来源。

---

**③ 加性 vs 乘性**

**加性（Bahdanau 2015）**：

    score(s, h) = v^T · tanh(W_s·s + W_h·h)

**乘性（Luong 2015）**：

    score(s, h) = s^T · W · h

**对比**：

| 维度 | 加性 | 乘性 |
| --- | --- | --- |
| **参数** | W_s, W_h, v（较多） | W（较少） |
| **计算** | 需要 tanh（非线性） | 纯矩阵乘 |
| **并行性** | 差（逐位置计算） | **好**（批量矩阵乘） |
| **长句效果** | 略好 | 相当 |
| **理论** | 更灵活 | 等价于双线性形式 |

**为什么乘性更适合大规模**：

    加性：对每个 (s, h_i) 都要算 tanh -> O(T) 次非线性
    乘性：s^T W h 可以写成 (W^T s)^T h -> 一次矩阵乘 O(T)

**GPU 优势**：矩阵乘法高度优化，非线性函数慢。

**所以 Transformer 用乘性**：

    Attention(Q, K, V) = softmax(Q·K^T / √d_k) · V

**√d_k 的作用**：防止点积过大导致 softmax 饱和（梯度消失）。

---

**④ 如何演变成 Transformer**

**核心公式完全一致**：

    Bahdanau: c_t = Σ_i softmax(v^T tanh(W_s s + W_h h_i)) · h_i
    Transformer: Attention(Q,K,V) = softmax(QK^T/√d) · V

**三步完全对应**：

| 步骤 | Bahdanau | Transformer |
| --- | --- | --- |
| 打分 | 加性 tanh | 缩放点积 |
| 归一化 | softmax | softmax |
| 聚合 | 加权求和 | 加权求和 |

**Transformer 的三个关键改动**：

**改动 1：Q/K/V 都来自同一序列（自注意力）**

    Bahdanau: Q 来自 decoder，K/V 来自 encoder（跨注意力）
    Transformer encoder: Q=K=V=同一序列（自注意力）
    Transformer decoder: 有自注意力 + 交叉注意力

**意义**：不再需要 RNN 来"传递信息"——注意力本身就能建模任意位置的关系。

**改动 2：多头（Multi-Head）**

    Bahdanau: 单一注意力
    Transformer: h=8 个头，各关注不同子空间

**意义**：一个头学语法，一个头学指代，一个头学语义...

**改动 3：去掉 RNN（完全并行）**

    Bahdanau: RNN 串行，第 t 步依赖第 t-1 步
    Transformer: 所有位置同时计算

**这是最关键的改动**——训练速度提升 10 倍以上。

**但代价**：

    去掉 RNN 后，失去了位置信息（RNN 天然有序）
    -> 必须加位置编码（Positional Encoding）

**历史脉络**：

    2014  Bahdanau 注意力（解决固定向量瓶颈）
    2015  Luong 乘性注意力（更快）
    2017  Transformer（去掉 RNN + 多头 + 位置编码）
    2018  BERT / GPT（预训练范式）

**每一步都在解决前一步的局限。**

---

**⑤ 一个常被忽略的洞察**

**注意力的本质是"软对齐"（soft alignment）**

**硬对齐**（传统统计机器翻译）：

    cat ↔ chat（1-1 对应）
    人工标注或统计对齐

**软对齐**（注意力）：

    cat -> [0.05, 0.85, 0.05, 0.03, 0.02]
           "主要看第2个词，但也稍微看其他"

**优势**：

| 方面 | 硬对齐 | 软对齐 |
| --- | --- | --- |
| 一对多 | 不支持 | ✅ |
| 多对一 | 不支持 | ✅ |
| 语序重排 | 需显式建模 | ✅ 自动学 |
| 可微 | ❌ | ✅ 可端到端训练 |

**这解释了一个有趣现象**：

注意力权重常常"模糊"——不是纯净的对角线。
这不是缺陷，而是**优势**：
模型学会了"这个词需要结合上下文才能确定"。

**可解释性**：

注意力权重可以可视化，让我们看到模型的"思考过程"。
虽然不是完美的解释（注意力 ≠ 推理过程），
但它提供了一个有用的观察窗口。

**这也是注意力机制最吸引人的地方**：
既有效，又可解释。`,
        rubric: [
          { point: '固定向量瓶颈：T×I > H 时信息丢失，长句性能急剧下降', score: 3 },
          { point: '三步：加性打分 → softmax → 加权聚合', score: 2 },
          { point: '加性 vs 乘性：参数/并行性/GPU 效率的取舍', score: 2 },
          { point: '演变：自注意力 + 多头 + 去 RNN + 位置编码', score: 2 },
          { point: '软对齐的优势：一对多、多对一、可微、可解释', score: 1 },
        ],
        keywords: ['信息瓶颈', '加性打分', '并行性', '自注意力', '软对齐'],
        explanation:
          '能说清「注意力的三步与 Transformer 完全对应」以及「去掉 RNN 的代价是需要位置编码」，就是理解了从 Bahdanau 到 Transformer 的演进逻辑。',
        tags: ['综合分析'],
      },
    ],
  },
];
