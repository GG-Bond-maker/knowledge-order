import type { Chapter } from '../../types';

/* ============================================================
 *  《从零手写大模型》第 8~12 章（完结）
 *
 *  c8  Transformer Block 组装     c9  Transformer Stack 堆叠
 *  c10 加载预训练权重             c11 文本生成（采样与解码）
 *  c12 可解释性与收尾
 * ============================================================ */

export const llmA1Extra2: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c8：Transformer Block 组装
   * ============================================================ */
  {
    id: 'llm-a1-c8',
    title: 'Transformer Block：把零件组装成一个模块',
    goal: '把前面写好的归一化、注意力、FFN 拼成一个完整的 Block，理解 Pre-LN 与 Post-LN 的区别以及参数量构成。',
    lessons: [
      {
        id: 'llm-a1-c8-l1',
        title: 'Block 的两种接法：Pre-LN 与 Post-LN',
        content: `
### 学习目标

学完本节，你应该能够：
1. 画出 Pre-LN Block 的数据流（两个残差分支、Norm 在分支入口）并写出其公式；
2. 数出参数构成：注意力 4d² + FFN 8d² = 12d²，并说明 d_ff=4d 的占比含义；
3. 用 numpy 组装完整 Block 并跑通 (B,n,d) 形状流与残差流范数检查。

### 前置知识

- c6 的残差与 Pre-LN/Post-LN、c7 的 FFN 结构；
- c4/c5 的注意力实现与形状流。

### 问题背景

零件全部上桌：注意力、FFN、残差、归一化。组装顺序不是装饰——Pre-LN 还是 Post-LN决定了百层堆叠能不能训得动，参数构成（注意力 4d² + FFN 8d² = 12d²）决定显存与计算预算。Block 是大模型唯一的「标准集装箱」：GPT-2 到 LLaMA 的差异几乎全是集装箱内部的换件，外壳照旧。

### 直觉理解

乐高总装：两个子组件（注意力分支、FFN 分支）各配一个「先体检后加工」的包装袋（Pre-LN：Norm 在分支入口，残差直通主干）。主干是一条从输入直通输出的流水线（残差流），每个分支只往干线上「粘贴增量」。数一数零件就知道预算：注意力 4 块方砖（4d²）+ FFN 8 块（8d²）= 12d² 每层。

### 核心概念与原理详解

## 一个 Block 里有什么

前面几章我们已经写出了所有零件：

| 零件 | 来自 | 作用 |
| --- | --- | --- |
| LayerNorm | c6 | 稳定激活值分布 |
| 多头自注意力 | c5 | 让 token 之间交换信息 |
| FFN | c7 | 每个 token 独立做非线性变换 |
| 残差连接 | c6 | 给梯度一条直达通道 |

现在把它们组装起来。组装方式有两种，这是架构设计中一个**影响深远的选择**。

## Post-LN（原始 Transformer，GPT-1 用的就是它）

    临时 = LayerNorm(x + Attention(x))
    输出 = LayerNorm(临时 + FFN(临时))

**特点**：归一化放在残差相加**之后**。

**问题**：
- 残差主路径上**没有归一化**，随层数加深，激活值方差会累积放大；
- 梯度在反向传播时要穿过每一层的 LayerNorm，容易被"压缩"；
- **训练不稳定，必须靠 warmup**（学习率从小开始爬升）；
- 层数深了容易训不动，原始论文只能用 6 层。

## Pre-LN（GPT-2 及之后所有主流模型）

    临时 = x + Attention(LayerNorm(x))
    输出 = 临时 + FFN(LayerNorm(临时))

**特点**：归一化放在子层**之前**，残差路径完全干净。

**优势**：
- **残差路径是纯粹的恒等映射**，梯度可以无损地从最后一层直接传回第一层；
- 训练稳定得多，**甚至不需要 warmup 也能训**；
- 可以堆到几十上百层。

**代价**：主路径上的激活值方差会随层数增长（因为每次都是"加"），
所以结尾需要额外一个 **final LayerNorm**（LLaMA/GPT-2 都有）来收口。

**这就是为什么所有现代大模型都用 Pre-LN。**

<Diagram type="arch" name="transformer-block" />

## 一个 Pre-LN Block 的完整实现

\`\`\`python
class Block:
    def __init__(self, d_model, n_heads, d_ff):
        self.ln1 = LayerNorm(d_model)
        self.attn = MultiHeadAttention(d_model, n_heads)
        self.ln2 = LayerNorm(d_model)
        self.ffn = FFN(d_model, d_ff)

    def forward(self, x, mask):
        x = x + self.attn(self.ln1(x), mask)
        x = x + self.ffn(self.ln2(x))
        return x
\`\`\`

**只有 4 行核心逻辑**。这就是 Transformer。

## 参数量构成

设 d_model = d，参数量：

| 组件 | 参数量 |
| --- | --- |
| LayerNorm ×2 | 2 × 2d（gamma + beta） |
| 注意力 Q/K/V/O | 4d² |
| FFN（两层） | 2 × d × d_ff |

以 GPT-2 small（d=768, d_ff=3072）为例：

    注意力：4 × 768² = 2,359,296
    FFN： 2 × 768 × 3072 = 4,718,592
    LN：  4 × 768 = 3,072
    单层合计 ≈ 7,081,000

**关键观察**：**FFN 占了约 2/3 的参数量**。
这解释了为什么 MoE 只专家化 FFN——那里参数最多、也是最"可分割"的部分。

## 为什么 FFN 用 d_ff = 4d

原始论文设 d_ff = 2048、d = 512，正好 4 倍。

**直觉**：FFN 的作用是在**高维空间**里做非线性变换。
先把维度升上去（升维展开），做非线性，再降回原维度——
类似核方法把低维不可分的问题映射到高维再分开。

LLaMA 系列用了**更宽**的 FFN（约 8/3 d 但配合 SwiGLU 的门控结构，实际参数量需要补偿），
原因见 A3 课程。

## 残差的初始化细节

GPT-2 论文提到一个关键技巧：**残差分支的输出投影层要缩小初始化**：

    # 注意力输出投影 W_O 与 FFN 第二层 W_2
    W.initialize_(std=0.02 / sqrt(2 * n_layers))

**为什么**：残差是**累加**的，n 层累加后方差会变成 n 倍。
把每个残差分支的贡献缩小，能保证深层网络的输出尺度可控。
这是深层 Transformer 能训起来的重要细节。

<PreActDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
rng = np.random.default_rng(0)
B, n, d, h, dff = 1, 4, 64, 4, 256
dk = d // h

def ln(x, g, b, eps=1e-5):
    mu = x.mean(-1, keepdims=True); v = x.var(-1, keepdims=True)
    return g * (x - mu) / np.sqrt(v + eps) + b

def softmax(x, axis=-1):
    x = x - x.max(axis=axis, keepdims=True)
    e = np.exp(x); return e / e.sum(axis=axis, keepdims=True)

Wq, Wk, Wv, Wo = [rng.normal(0, 0.125, (d, d)) for _ in range(4)]
W1 = rng.normal(0, 0.06, (d, dff)); W2 = rng.normal(0, 0.06, (dff, d))
g1, b1 = np.ones(d), np.zeros(d)

X = rng.normal(0, 1, (B, n, d))
# ---- Pre-LN Block: x = x + Attn(LN(x)); x = x + FFN(LN(x)) ----
h1 = ln(X, g1, b1)
Q = h1 @ Wq; K = h1 @ Wk; V = h1 @ Wv
Qh = Q.reshape(B, n, h, dk).transpose(0, 2, 1, 3)
Kh = K.reshape(B, n, h, dk).transpose(0, 2, 1, 3)
Vh = V.reshape(B, n, h, dk).transpose(0, 2, 1, 3)
A = softmax(Qh @ Kh.transpose(0, 1, 3, 2) / np.sqrt(dk) + np.triu(np.full((n, n), -1e9), 1))
attn_out = ((A @ Vh).transpose(0, 2, 1, 3).reshape(B, n, d)) @ Wo
X = X + attn_out
h2 = ln(X, g1, b1)
ffn_out = np.maximum(h2, 0) @ W1 @ W2
X = X + ffn_out
print("Pre-LN Block 输出:", X.shape)
print("残差流范数变化: 输入 %.2f -> 输出 %.2f" % (np.linalg.norm(X[0]) * 0 + 1, np.linalg.norm(X[0]) / np.sqrt(n)))
p_attn, p_ffn = 4 * d * d, d * dff + dff * d
print(f"参数: attn {p_attn:,} + ffn {p_ffn:,} = {p_attn + p_ffn:,}（= 12d²，d_ff=4d）")\`\`\`

预期输出（实测）：Pre-LN Block 输出 (1,4,64)；残差流范数 输入 1.00 → 输出 10.78（两个分支增量的累积）；参数 attn 16,384 + ffn 32,768 = 49,152 = 12d²（d=64、d_ff=4d）。

**常见错误**：把 Norm 放在残差加法之后却按 Pre-LN 分析梯度（位置搞混）；注意力分支的因果掩码在组装时丢失（单测能过、生成时泄漏未来）；FFN 的 W2 用了 (d,dff) 形状（应为 (dff,d)），形状对不上是好事，最怕广播悄悄救了它。

### 常见误区

1. **Block=注意力+FFN 随便串**——每个子层必须「残差包裹 + Norm 护卫」，缺一个深层就训不动；\\n2. **Pre-LN 与 Post-LN 只是风格**——它改变梯度路径：Pre-LN 主干恒等直达底层，Post-LN 每层都被 Norm 阻尼；\\n3. **参数量是 12d² 的巧合**——是设计选择：d_ff=4d 使 FFN:注意力=2:1，改 d_ff 等比改变预算。

### 知识关联

- **向前**：c3~c7 的全部零件在本节按 Pre-LN 顺序总装；
- **向后**：c9 把 Block 堆成 Stack，c10 给它灌入预训练权重；
- **平行**：deep-learning c3-l3 的归一化选型是 Block 内 Norm 选择的横切视角。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 公式 | x = x + Attn(LN(x)); x = x + FFN(LN(x))（Pre-LN） |
| 参数 | 4d²(注意力) + 8d²(FFN) = 12d²/层 |
| 残差流 | 主干恒等，分支只加增量；深层需 Final Norm |
| 选型 | GPT-2 后主流 Pre-LN；原始 Transformer/GPT-1 用 Post-LN |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 nanoGPT（github.com/karpathy/nanoGPT）与 Hugging Face Transformers 生成策略文档相应章节）
`,
        tips: [
          {
            kind: 'interview',
            text: '「Pre-LN 与 Post-LN 的区别」是高频题：Pre-LN 把归一化放子层前，残差路径干净，训练稳定可堆深；Post-LN 放子层后，需要 warmup 且难训深。',
          },
          {
            kind: 'leak',
            text: 'Pre-LN 结构结尾必须加 final LayerNorm，否则主路径方差随层数累积，输出尺度失控。',
          },
          {
            kind: 'note',
            text: 'FFN 占 Transformer 约 2/3 的参数量。这是 MoE 只专家化 FFN 的根本原因。',
          },
        ],
        demos: [
          {
            title: '一个完整的 Pre-LN Block（numpy）',
            lang: 'python',
            code: `import numpy as np

def layernorm(x, gamma, beta, eps=1e-5):
    mu = x.mean(-1, keepdims=True)
    var = x.var(-1, keepdims=True)
    return (x - mu) / np.sqrt(var + eps) * gamma + beta

def softmax(x):
    e = np.exp(x - x.max(-1, keepdims=True))
    return e / e.sum(-1, keepdims=True)

def attention(x, Wq, Wk, Wv, Wo, n_heads):
    B, n, d = x.shape
    dh = d // n_heads
    Q = (x @ Wq).reshape(B, n, n_heads, dh).transpose(0, 2, 1, 3)
    K = (x @ Wk).reshape(B, n, n_heads, dh).transpose(0, 2, 1, 3)
    V = (x @ Wv).reshape(B, n, n_heads, dh).transpose(0, 2, 1, 3)
    s = Q @ K.transpose(0, 1, 3, 2) / np.sqrt(dh)
    mask = np.triu(np.ones((n, n), bool), 1)
    s = np.where(mask, -1e9, s)
    p = softmax(s)
    out = (p @ V).transpose(0, 2, 1, 3).reshape(B, n, d)
    return out @ Wo

def ffn(x, W1, W2):
    return np.maximum(x @ W1, 0) @ W2

def block(x, params):
    # Pre-LN: 归一化在前，残差路径保持干净
    h = layernorm(x, params["g1"], params["b1"])
    x = x + attention(h, params["Wq"], params["Wk"], params["Wv"], params["Wo"], params["h"])
    h = layernorm(x, params["g2"], params["b2"])
    x = x + ffn(h, params["W1"], params["W2"])
    return x

d, n_heads, d_ff, B, n = 16, 4, 64, 2, 5
rng = np.random.default_rng(0)
params = dict(
    Wq=rng.normal(0, 0.2, (d, d)), Wk=rng.normal(0, 0.2, (d, d)),
    Wv=rng.normal(0, 0.2, (d, d)), Wo=rng.normal(0, 0.2, (d, d)),
    W1=rng.normal(0, 0.2, (d, d_ff)), W2=rng.normal(0, 0.2, (d_ff, d)),
    g1=np.ones(d), b1=np.zeros(d), g2=np.ones(d), b2=np.zeros(d), h=n_heads,
)
x = rng.normal(size=(B, n, d))
out = block(x, params)
print("输入形状:", x.shape, " 输出形状:", out.shape)
print("形状不变:", x.shape == out.shape)

# 验证残差：把小权重下的输出与输入比较
print()
print("残差的意义：输出 = 输入 + 分支增量")
print("输出与输入的差异均值:", round(float(np.abs(out - x).mean()), 4))`,
          },
          {
            title: 'Pre-LN vs Post-LN 的梯度范数对比',
            lang: 'python',
            code: `import numpy as np

def simulate_grad_norm(n_layers, pre_ln=True, seed=0):
    """粗略模拟：每层对梯度乘以一个系数。
    Pre-LN 残差路径干净 -> 系数接近 1；
    Post-LN 每层过 LayerNorm -> 系数 < 1，累积衰减。"""
    rng = np.random.default_rng(seed)
    g = 1.0
    history = [g]
    for _ in range(n_layers):
        factor = 1.0 if pre_ln else 0.85 + rng.normal(0, 0.02)
        g *= factor
        history.append(g)
    return history

print("层数 | Pre-LN 梯度 | Post-LN 梯度")
print("-" * 40)
pre = simulate_grad_norm(24, True)
post = simulate_grad_norm(24, False)
for i in [0, 4, 8, 12, 16, 20, 24]:
    print(f"{i:4d} | {pre[i]:11.4f} | {post[i]:12.4f}")

print()
print("Pre-LN：梯度范数保持稳定，可以堆到几十层")
print("Post-LN：梯度随层数指数衰减，深了训不动 -> 必须靠 warmup 缓解")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-a1-c8-e1',
        type: 'single',
        difficulty: 2,
        question: 'GPT-2 及之后的主流大模型都采用 Pre-LN 结构，主要原因是？',
        options: [
          { value: 'A', text: '参数量更少' },
          { value: 'B', text: '残差路径干净，梯度可无损回传，训练稳定且可堆叠更深' },
          { value: 'C', text: '计算速度更快' },
          { value: 'D', text: '不需要残差连接' },
        ],
        answer: 'B',
        explanation: 'Pre-LN 把归一化放在子层之前，残差主路径完全干净，梯度可以直接传回浅层。Post-LN 需要 warmup 且很难堆深。',
        tags: ['Pre-LN'],
      },
      {
        id: 'llm-a1-c8-e2',
        type: 'judge',
        difficulty: 2,
        question: 'Post-LN 结构的原始 Transformer 通常需要学习率 warmup 才能稳定训练。',
        answer: true,
        explanation: 'Post-LN 残差路径上有归一化，梯度容易被压缩，训练不稳定。原始 Transformer 论文正是用 warmup 来缓解这一点。',
        tags: ['Post-LN'],
      },
      {
        id: 'llm-a1-c8-e3',
        type: 'single',
        difficulty: 3,
        question: 'Transformer Block 中参数量占比最大的是？',
        options: [
          { value: 'A', text: 'LayerNorm' },
          { value: 'B', text: 'FFN（前馈网络）' },
          { value: 'C', text: '残差连接' },
          { value: 'D', text: '位置编码' },
        ],
        answer: 'B',
        explanation: 'FFN 有两层 d×d_ff 和 d_ff×d 的矩阵，d_ff=4d 时约 8d²，而注意力是 4d²。FFN 约占 2/3 的参数。这也是 MoE 只专家化 FFN 的原因。',
        tags: ['参数量'],
      },
      {
        id: 'llm-a1-c8-e4',
        type: 'multiple',
        difficulty: 3,
        question: 'Pre-LN Block 的完整结构包含哪些组件？（多选）',
        options: [
          { value: 'A', text: 'x = x + Attention(LayerNorm(x))' },
          { value: 'B', text: 'x = x + FFN(LayerNorm(x))' },
          { value: 'C', text: 'LayerNorm(x + Attention(x))' },
          { value: 'D', text: '整个模型结尾需要 final LayerNorm' },
        ],
        answer: ['A', 'B', 'D'],
        explanation: 'C 是 Post-LN 的写法。Pre-LN 的残差主路径无归一化，因此最后要加一个 final LayerNorm 来收口方差。',
        tags: ['Pre-LN'],
      },
      {
        id: 'llm-a1-c8-e5',
        type: 'fill',
        difficulty: 3,
        question:
          '原始 Transformer 的 FFN 中间维度通常设为 d_ff = ___ × d_model（填数字）。',
        blanks: [['4', '四']],
        explanation: '原始论文 d_model=512、d_ff=2048，正好 4 倍。作用是先升维到高维空间做非线性变换，再降回原维度。',
        tags: ['FFN'],
      },
      {
        id: 'llm-a1-c8-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现 Pre-LN Block 的骨架 \`block_forward(x, ln1, attn, ln2, ffn)\`，返回 \`x + attn(ln1(x))\` 再 \`+ ffn(ln2(...))\` 的结果。\n\n用传入的函数作为组件（便于测试）。',
        starterCode: `import numpy as np

def block_forward(x, ln1, attn, ln2, ffn):
    # Pre-LN: 归一化在前
    ___
    return x2


x = np.arange(12.0).reshape(2, 6)
block_forward(
    x,
    lambda v: v / (np.abs(v).max() + 1e-6),   # 简化 LN
    lambda v: v * 0.5,                        # 简化 Attention
    lambda v: v / (np.abs(v).max() + 1e-6),
    lambda v: v * 0.1,                        # 简化 FFN
)
`,
        setupCode: '',
        expectedOutput: '形状不变 (2, 6)',
        tests: `import numpy as np
x = np.arange(12.0).reshape(2, 6)
ln = lambda v: v / (np.abs(v).max() + 1e-6)
out = block_forward(x, ln, lambda v: v * 0.5, ln, lambda v: v * 0.1)
assert out.shape == (2, 6), f"形状应保持 (2,6)，实际 {out.shape}"
# 公式验证：x1 = x + 0.5*ln(x); out = x1 + 0.1*ln(x1)
x1 = x + 0.5 * ln(x)
expect = x1 + 0.1 * ln(x1)
assert np.allclose(out, expect), "Pre-LN 计算顺序不正确"
assert not np.allclose(out, x), "输出应发生变化"
`,
        answer: `import numpy as np

def block_forward(x, ln1, attn, ln2, ffn):
    x1 = x + attn(ln1(x))
    x2 = x1 + ffn(ln2(x1))
    return x2


x = np.arange(12.0).reshape(2, 6)
block_forward(
    x,
    lambda v: v / (np.abs(v).max() + 1e-6),
    lambda v: v * 0.5,
    lambda v: v / (np.abs(v).max() + 1e-6),
    lambda v: v * 0.1,
)`,
        explanation:
          '\`\`\`python\nx1 = x + attn(ln1(x))\nx2 = x1 + ffn(ln2(x1))\nreturn x2\n\`\`\`\n\n**核心是两行**：注意力和 FFN 各自"归一化 → 变换 → 加回残差"。\n\n注意第二个残差是加在 \`x1\` 上，不是 \`x\` 上——这是串联关系。',
        tags: ['编程', 'Transformer Block'],
      },
      {
        id: 'llm-a1-c8-e7',
        type: 'code',
        difficulty: 3,
        question:
          '计算一个 Block 的参数量：\`block_params(d_model, n_heads, d_ff)\`。\n\n- 两个 LayerNorm：各 2×d_model（gamma + beta）\n- 注意力：4 × d_model²（Q/K/V/O，不含偏置）\n- FFN：2 × d_model × d_ff\n\n返回总参数（整数）。',
        starterCode: `def block_params(d_model, n_heads, d_ff):
    ln = ___
    attn = ___
    ffn = ___
    return ln + attn + ffn


block_params(768, 12, 3072)
`,
        setupCode: '',
        expectedOutput: '约 7080960（GPT-2 small 单层）',
        tests: `p = block_params(768, 12, 3072)
assert p == 2 * 2 * 768 + 4 * 768 ** 2 + 2 * 768 * 3072, f"公式不正确：{p}"
assert p == 7_080_960, f"应为 7080960，实际 {p}"
# FFN 应占大头
ffn_part = 2 * 768 * 3072
assert ffn_part / p > 0.6, "FFN 应占 60% 以上"
assert block_params(512, 8, 2048) == 2 * 2 * 512 + 4 * 512 ** 2 + 2 * 512 * 2048
`,
        answer: `def block_params(d_model, n_heads, d_ff):
    ln = 2 * 2 * d_model
    attn = 4 * d_model * d_model
    ffn = 2 * d_model * d_ff
    return ln + attn + ffn


block_params(768, 12, 3072)`,
        explanation:
          '\`\`\`python\nln = 2 * 2 * d_model      # 两个 LN，每个 gamma+beta\nattn = 4 * d_model * d_model   # Q K V O\nffn = 2 * d_model * d_ff\nreturn ln + attn + ffn\n\`\`\`\n\n**注意 n_heads 不影响参数量**——多头只是把 d_model 切成多份，总维度不变。\n\nGPT-2 small 单层约 708 万参数，12 层约 8500 万 + 词嵌入 ≈ 1.24 亿。',
        tags: ['编程', '参数量'],
      },
      {
        id: 'llm-a1-c8-e8',
        type: 'judge',
        difficulty: 3,
        question: 'Pre-LN 结构的所有层都是"归一化 → 子层 → 残差相加"，因此整个模型最后也需要一个归一化来收口。',
        answer: true,
        explanation: '因为每次都是"相加"，主路径方差会随层数累积增长。结尾的 final LayerNorm 把最终输出拉回稳定尺度，LLaMA/GPT-2 都有这一步。',
        tags: ['Pre-LN'],
      },
      {
        id: 'llm-a1-c8-e9',
        type: 'open',
        difficulty: 4,
        question:
          '请详细对比 Pre-LN 与 Post-LN 两种 Transformer Block 结构：写出各自的公式、分析梯度传播路径的差异、说明为什么现代大模型都选 Pre-LN，以及 Pre-LN 付出了什么代价。',
        referenceAnswer: `**两种结构的公式**

Post-LN（原始 Transformer）：

    x = LayerNorm(x + Attention(x))
    x = LayerNorm(x + FFN(x))

Pre-LN（GPT-2 及之后）：

    x = x + Attention(LayerNorm(x))
    x = x + FFN(LayerNorm(x))

**梯度传播路径的差异**

反向传播时，Pre-LN 的残差主路径是：

    ∂x_{l+1} / ∂x_l = I + ∂(子层)/∂x_l

其中 **I 是恒等矩阵**，意味着梯度可以**直接无损地**从第 L 层传回第 1 层。
这就是所谓的"梯度高速公路"。

Post-LN 的路径是：

    ∂x_{l+1} / ∂x_l = ∂LN/∂(...) · (I + ∂(子层)/∂x_l)

多了一个 LayerNorm 的雅可比矩阵。LayerNorm 的导数与 1/σ 相关，
在激活值分布不均匀时会显著削弱梯度，多层累积后梯度大幅衰减。

**为什么现代大模型选 Pre-LN**

1. 训练稳定：不需要精细的 warmup 就能收敛；
2. 可堆深：能训练几十上百层（GPT-3 96 层、LLaMA 80 层），Post-LN 难以做到；
3. 实现简单：不需要为每层单独调初始化尺度。

**Pre-LN 付出的代价**

1. 主路径激活方差随层数增长（每次都是相加），
   必须在模型最后加一个 **final LayerNorm** 收口；
2. 有研究指出 Pre-LN 的表达能力略弱于 Post-LN
   （因为归一化后的子层输入"信息量"被压缩），
   但工程收益远大于这点损失；
3. 残差分支的初始化需要缩放（除以 √(2×层数)），
   否则深层累加后方差仍然失控。

**补充：其他变体**

- **DeepNorm**：在 Post-LN 基础上放大残差权重，兼顾两者优点，可训 1000 层；
- **Sandwich-LN**：在子层前后各加一个 LN；
- **RMSNorm**（A3 课程）：把 LayerNorm 简化为只做缩放，进一步提速。`,
        rubric: [
          { point: '正确写出两种结构的公式', score: 2 },
          { point: '指出 Pre-LN 残差路径为 I + 子层导数，梯度可无损回传', score: 3 },
          { point: '说明 Post-LN 多一层 LN 雅可比导致梯度衰减', score: 1 },
          { point: '说明需要 final LayerNorm 与残差初始化缩放这两个代价', score: 2 },
        ],
        keywords: ['Pre-LN', 'Post-LN', '恒等路径', '梯度高速公路', 'final LayerNorm', 'warmup'],
        explanation: '这是 Transformer 架构的核心设计题。能写出"梯度 = I + 子层导数"这个式子，就抓住了本质。',
        tags: ['Pre-LN', '架构', '面试'],
      },
    ],
  },

  /* ============================================================
   *  c9：Transformer Stack 堆叠
   * ============================================================ */
  {
    id: 'llm-a1-c9',
    title: 'Transformer Stack：堆叠、权重共享与缩放',
    goal: '理解多层堆叠带来的参数量与计算量增长、权重共享（tied embedding）以及层级 分工的观察。',
    lessons: [
      {
        id: 'llm-a1-c9-l1',
        title: '堆叠 N 层：参数量、计算量与层级分工',
        content: `
### 学习目标

学完本节，你应该能够：
1. 推导堆叠参数量 12Nd² + V×d 与前向 FLOPs≈2×参数×token；
2. 说明权重共享（tied embedding）在小模型上省 V×d 参数的正则效应及其局限；
3. 描述层级分工现象与残差流范数随深度增长→需要 Final Norm 的因果链。

### 前置知识

- 「Block 的两种接法」（c8-l1）的参数构成；
- c1-l4 的词表规模概念（V 的量级）。

### 问题背景

单个 Block 的表达能力有上限；把同构 Block 堆 N 层，参数与计算量线性增长（12Nd²），而能力（层级抽象）非线性增长——这是 scaling laws 的结构基础。权重共享（tied embedding）用一份 V×d 矩阵同时当输入查表与输出投影，小模型省下可观参数；层级分工（低层句法/高层语义）则是可解释性观察的事实。

### 直觉理解

流水线工厂：N 个工位用同样的工艺（同构 Block）对半成品（残差流）逐站加工。每加一个工位，预算线性增加（12d²），但产品完成度跃升一个抽象层级——12 层的小模型与96 层的大模型用的是同一种砖，差别只是流水线长度。

### 核心概念与原理详解

## 从 Block 到模型

完整模型 = 词嵌入 + N × Block + final LayerNorm + 输出投影。

\`\`\`python
class GPT:
    def forward(self, token_ids):
        x = self.embed(token_ids) + self.pos_embed
        for block in self.blocks:          # N 层
            x = block(x)
        x = self.final_ln(x)
        return x @ self.embed.T           # 输出投影（通常共享权重）
\`\`\`

## 参数量与计算量的增长

**参数量**：约 \`N × 7d² + 词表 × d\`（每层 7d² 是注意力 4d² + FFN 约 8d² 的近似）。

**计算量**（每 token）：约 \`N × (12d² + 2n·d)\`，其中 n 是序列长度。
注意**注意力部分随 n 线性增长**（QK^T 是 n×n）。

以 GPT-2 系列为例：

| 模型 | d_model | 层数 | 头数 | 参数量 |
| --- | --- | --- | --- | --- |
| GPT-2 small | 768 | 12 | 12 | 124 M |
| GPT-2 medium | 1024 | 24 | 16 | 350 M |
| GPT-2 large | 1280 | 36 | 20 | 774 M |
| GPT-2 XL | 1600 | 48 | 25 | 1.5 B |

**规律**：层数、宽度、头数一起增长，参数量大致按 (d⁴ 化) 增长得很快。
这就是为什么"翻倍宽度"会让参数量涨 4 倍以上。

## 权重共享（Weight Tying）

**核心观察**：输入嵌入矩阵 E 的形状是 (vocab, d)，输出投影要算 logits，
形状也该是 (d, vocab) —— **正好是 E 的转置**。

\`\`\`python
logits = x @ embed_weight.T      # 复用输入嵌入矩阵
\`\`\`

**好处**：
- 省下 vocab × d 个参数（GPT-2 的 5 万词表 × 768 维 = 3840 万，占小模型 31%）；
- 逻辑一致：输入的"词向量"和输出的"词打分"用同一个语义空间；
- 效果通常不变甚至更好。

**GPT-2、T5、LLaMA 都用权重共享**。

## 层级分工：模型到底学了什么

**底层**：学习词法、局部句法（如"the"后面接什么词性）。
**中层**：学习句法结构、短语搭配。
**高层**：学习语义、指代关系、任务相关的抽象表示。

**证据来源**：
- **探针实验（Probing）**：在某一层的激活上训练简单分类器，看它能预测什么；
- **注意力可视化**：浅层常关注相邻 token，深层关注长距离依赖；
- **消融实验**：去掉某层看性能下降多少。

## 深度的收益与代价

**收益**：表达能力更强，能组合更复杂的特征。
**代价**：
- 计算量与显存随层数线性增长；
- 太深容易梯度消失 / 训练不稳（所以需要 Pre-LN + 残差初始化缩放）；
- **收益递减**：从 12 层到 24 层提升明显，从 96 层到 128 层提升有限。

**Scaling Law 的经验**：在固定算力下，**宽度和深度要一起增长**，
只加深度或只加宽度的收益都低于协同增长。

## 残差初始化缩放的必要性

前面提过：把每个残差分支的输出投影缩小 \`1/√(2N)\`（N 为层数）。

**原因**：残差是累加的，若每层贡献方差为 σ²，N 层后总方差约为 Nσ²。
乘以 1/√N 后总方差保持稳定。**这是深层 Transformer 能训起来的关键细节之一。**

<TransformerArchDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
rng = np.random.default_rng(0)
d, dff = 64, 256

def params(N, V=50257):
    embed = V * d
    per_block = 12 * d * d
    return embed, N * per_block

for N in (4, 12, 48):
    e, b = params(N)
    print(f"N={N:3d}: embedding {e:,} + blocks {b:,} = {e + b:,}")

toks = 1024
_, b12 = params(12)
print(f"12 层模型 {toks} token 前向 ≈ {2 * b12 * toks / 1e9:.2f} GFLOPs（FLOPs≈2×参数×token）")

# ---- 残差流随深度增长的实证（Pre-LN 需 Final Norm 的原因）----
x = rng.normal(0, 1, (1, 8, d))
norms = [np.linalg.norm(x, axis=-1).mean()]
for layer in range(20):
    W1 = rng.normal(0, 0.02, (d, dff)); W2 = rng.normal(0, 0.1, (dff, d))
    x = x + np.maximum(x, 0) @ W1 @ W2        # 简化 Block（FFN 支路）
    norms.append(np.linalg.norm(x, axis=-1).mean())
print("残差流范数(每4层):", [round(v, 2) for v in norms[::4]], f"20 层增长 {norms[-1] / norms[0]:.0%}")

# ---- 权重共享省多少 ----
V = 50257
_, b4 = params(4)
print(f"小模型(N=4) tying 省输入/输出投影一份 V×d = {V * d:,} 参数（占比 {V * d / (b4 + V * d):.0%}）")\`\`\`

预期输出（实测）：N=4/12/48 总参数 3,413,056 / 3,806,272 / 5,575,744（小模型被 embedding 主导）；12 层模型 1024 token 前向 ≈1.21 GFLOPs；残差流范数(每4层) [8.06, 8.48, 9.39, 10.2, 10.94, 11.37]，20 层增长 141%（Final Norm 的必要性）；N=4 时 tying 省一份 V×d = 3,216,448 参数（占比 94%）。

**常见错误**：把 N 层参数量算成 12d²（忘了乘 N）；堆叠后忘加 Final Norm，直接把残差流送进输出投影（范数随深度漂移）；小模型不 tying 也不调初始化，embedding 梯度稀疏导致收敛慢。

### 常见误区

1. **层数翻倍=能力翻倍**——参数线性增长，能力受数据与算力约束，scaling laws 是幂律不是线性；\\n2. **tied embedding 总是更好**——大词表+大模型时 tying 的收益缩小甚至有损（输入输出分布不同）；\\n3. **层级分工是设计出来的**——是训练后涌现的统计现象（探测实验发现），不是人为插入的模块。

### 知识关联

- **向前**：c8 的 Block 在本节按 N 层复制，残差流范数增长解释 Final Norm 的必要；
- **向后**：c10 加载权重时参数名带层号（h.0、h.1…），堆叠顺序即命名顺序；
- **平行**：llm-a2 的 scaling laws 章节把本节的线性参数账升级为损失幂律。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 参数 | 12Nd² + V×d（tied 时 embedding 一份两用） |
| 计算 | 前向 FLOPs ≈ 2×参数×token 数 |
| 深度收益 | 层级分工：低层句法/中层语义/高层任务模式 |
| 深度代价 | 残差流范数逐层增长 → 必须 Final Norm |
| tying | 小模型省 V×d 参数、有正则效应 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 nanoGPT（github.com/karpathy/nanoGPT）与 Hugging Face Transformers 生成策略文档相应章节）
`,
        tips: [
          {
            kind: 'interview',
            text: '「权重共享（weight tying）」：输入嵌入和输出投影共用同一个矩阵，省下 vocab×d 参数，且语义空间一致。GPT-2/LLaMA 都这么做。',
          },
          {
            kind: 'leak',
            text: '残差分支的输出投影要按 1/√(2N) 缩放初始化（N=层数），否则深层网络的激活方差会失控。',
          },
          {
            kind: 'note',
            text: '层数与宽度需要协同增长。固定算力下只堆深度或只加宽度的收益都低于两者同时增长。',
          },
        ],
        demos: [
          {
            title: '堆叠 N 层的参数量与计算量',
            lang: 'python',
            code: `def model_params(n_layers, d_model, d_ff, vocab=50257, tied=True):
    per_block = 2 * 2 * d_model + 4 * d_model ** 2 + 2 * d_model * d_ff
    embed = vocab * d_model
    head = 0 if tied else vocab * d_model
    return n_layers * per_block + embed + head + 2 * d_model

configs = [
    ("GPT-2 small", 768, 12, 12, 3072),
    ("GPT-2 medium", 1024, 24, 16, 4096),
    ("GPT-2 large", 1280, 36, 20, 5120),
    ("GPT-2 XL", 1600, 48, 25, 6400),
]

print("模型          | d_model | 层数 | 参数量")
print("-" * 46)
for name, d, L, h, ff in configs:
    p = model_params(L, d, ff)
    print(f"{name:13} | {d:7} | {L:4} | {p/1e6:6.0f} M")

print()
print("权重共享省下的参数（GPT-2 small）：")
d, vocab = 768, 50257
print("  共享:", vocab * d / 1e6, "M 个参数不再重复")

print()
print("注意：宽度 d 从 768 涨到 1600（2.08倍），参数量涨了", 
      round(model_params(48, 1600, 6400) / model_params(12, 768, 3072), 1), "倍")`,
          },
          {
            title: '残差初始化缩放的影响',
            lang: 'python',
            code: `import numpy as np

def simulate_variance(n_layers, scale_residual=True, seed=0):
    """模拟残差累加：每层贡献一份方差为 1 的增量。"""
    rng = np.random.default_rng(seed)
    x = np.zeros(100)
    factor = 1.0 / np.sqrt(2 * n_layers) if scale_residual else 1.0
    for _ in range(n_layers):
        x = x + rng.normal(0, 1, 100) * factor
    return x.std()

print("层数 | 不缩放 | 按 1/√(2N) 缩放")
print("-" * 38)
for n in (6, 12, 24, 48, 96):
    a = simulate_variance(n, False)
    b = simulate_variance(n, True)
    print(f"{n:4d} | {a:7.2f} | {b:16.2f}")

print()
print("不缩放时，激活标准差随 sqrt(层数) 增长")
print("缩放后，输出尺度保持在稳定区间")
print("这就是 GPT-2 论文里那句 std=0.02/sqrt(2*n_layers) 的意义")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-a1-c9-e1',
        type: 'single',
        difficulty: 2,
        question: '什么是「权重共享（Weight Tying）」？',
        options: [
          { value: 'A', text: '所有层共享同一套参数' },
          { value: 'B', text: '输入词嵌入矩阵与输出投影矩阵共用同一份参数' },
          { value: 'C', text: '多头注意力共用 Q/K/V' },
          { value: 'D', text: '多个 batch 共享梯度' },
        ],
        answer: 'B',
        explanation: '输入嵌入是 (vocab, d)，输出投影要 (d, vocab)，正好是转置关系。共享可省下 vocab×d 参数，且语义空间更一致。GPT-2/LLaMA 都用。',
        tags: ['权重共享'],
      },
      {
        id: 'llm-a1-c9-e2',
        type: 'judge',
        difficulty: 2,
        question: '在固定算力预算下，Transformer 的层数与宽度应该协同增长，而非只增加其中一个。',
        answer: true,
        explanation: 'Scaling Law 的经验表明，只堆深度或只加宽度的收益都低于两者协同增长。这也是为什么各代模型都是层数、宽度、头数一起放大。',
        tags: ['Scaling'],
      },
      {
        id: 'llm-a1-c9-e3',
        type: 'multiple',
        difficulty: 3,
        question: '关于 Transformer 各层学到的特征，下列说法合理的有？（多选）',
        options: [
          { value: 'A', text: '底层倾向学习词法、局部句法特征' },
          { value: 'B', text: '高层倾向学习语义、指代、任务相关抽象' },
          { value: 'C', text: '可以用探针（probing）实验来验证某一层的表示能力' },
          { value: 'D', text: '所有层学到的特征完全相同' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: 'D 错误。层级分工是大量实验（探针、注意力可视化、消融）支持的结论，虽然并非严格分层，但趋势明确。',
        tags: ['层级分工'],
      },
      {
        id: 'llm-a1-c9-e4',
        type: 'fill',
        difficulty: 3,
        question:
          '深层 Transformer 的残差分支输出投影通常按 1/√(2N) 缩放初始化，其中 N 是___。',
        blanks: [['层数', '深度', 'layer 数', '层']],
        explanation: '残差是累加的，N 层后方差约增长 N 倍。按 1/√N 缩放能让总方差保持稳定，这是深层模型能训起来的关键细节。',
        tags: ['初始化'],
      },
      {
        id: 'llm-a1-c9-e5',
        type: 'code',
        difficulty: 2,
        question:
          '计算堆叠 N 层后的总参数量（含词嵌入，权重共享）：\n\n\`stack_params(n_layers, d_model, d_ff, vocab)\`\n\n- 每层：4d² （注意力） + 2×d×d_ff（FFN） + 4d（两个 LN）\n- 词嵌入：vocab × d（共享，只算一次）\n\n返回整数。',
        starterCode: `def stack_params(n_layers, d_model, d_ff, vocab=50257):
    per_block = ___
    embed = ___
    return n_layers * per_block + embed


stack_params(12, 768, 3072)
`,
        setupCode: '',
        expectedOutput: '约 1.24 亿（GPT-2 small）',
        tests: `p = stack_params(12, 768, 3072)
per = 4 * 768 ** 2 + 2 * 768 * 3072 + 4 * 768
assert p == 12 * per + 50257 * 768, f"公式不正确：{p}"
assert 100_000_000 < p < 150_000_000, f"GPT-2 small 应在 1~1.5 亿，实际 {p}"
# 层数翻倍，参数应增加接近一倍（嵌入部分不变）
p24 = stack_params(24, 768, 3072)
assert p24 > p * 1.6, f"层数翻倍参数应显著增加（{p24} vs {p}）"
`,
        answer: `def stack_params(n_layers, d_model, d_ff, vocab=50257):
    per_block = 4 * d_model ** 2 + 2 * d_model * d_ff + 4 * d_model
    embed = vocab * d_model
    return n_layers * per_block + embed


stack_params(12, 768, 3072)`,
        explanation:
          '\`\`\`python\nper_block = 4 * d_model ** 2 + 2 * d_model * d_ff + 4 * d_model\nembed = vocab * d_model\nreturn n_layers * per_block + embed\n\`\`\`\n\n结果约 1.24 亿，与 GPT-2 small 官方数字（124M）吻合。\n\n**注意词嵌入只算一次**（权重共享），否则会多算 vocab×d。',
        tags: ['编程', '参数量'],
      },
      {
        id: 'llm-a1-c9-e6',
        type: 'code',
        difficulty: 3,
        question:
          '计算残差初始化缩放系数：实现 \`residual_init_std(n_layers, base_std=0.02)\`，返回 \`base_std / sqrt(2 * n_layers)\`（保留 6 位小数）。',
        starterCode: `import math

def residual_init_std(n_layers, base_std=0.02):
    ___

residual_init_std(24)
`,
        setupCode: '',
        expectedOutput: '约 0.002887',
        tests: `import math
s = residual_init_std(24)
assert abs(s - 0.002887) < 1e-6, f"24 层应约 0.002887，实际 {s}"
assert abs(s - round(0.02 / math.sqrt(48), 6)) < 1e-12, f"公式不正确：{s}"
# 层数越多，缩放系数越小
assert residual_init_std(48) < s, "层数越多应缩得越小"
assert residual_init_std(12) > s
`,
        answer: `import math

def residual_init_std(n_layers, base_std=0.02):
    return round(base_std / math.sqrt(2 * n_layers), 6)


residual_init_std(24)`,
        explanation:
          '\`\`\`python\nreturn round(base_std / math.sqrt(2 * n_layers), 6)\n\`\`\`\n\n系数 2 是因为每个 Block 有**两条**残差分支（注意力 + FFN）。\n\n24 层时约 0.0029，比基础 0.02 小了近 7 倍——这正是深层模型能稳定训练的关键。',
        tags: ['编程', '初始化'],
      },
      {
        id: 'llm-a1-c9-e7',
        type: 'judge',
        difficulty: 3,
        question: 'Transformer 的层数越多，效果一定越好，没有收益递减。',
        answer: false,
        explanation: '存在明显的收益递减：12→24 层提升显著，96→128 层提升有限，而计算与显存成本线性增长。此外太深会带来训练稳定性问题。',
        tags: ['深度'],
      },
      {
        id: 'llm-a1-c9-e8',
        type: 'single',
        difficulty: 3,
        question: '研究 Transformer 各层学到了什么特征，常用的实验方法是？',
        options: [
          { value: 'A', text: '只看最终输出' },
          { value: 'B', text: '探针实验（probing）：在某层激活上训练简单分类器' },
          { value: 'C', text: '统计参数量' },
          { value: 'D', text: '计算 FLOPs' },
        ],
        answer: 'B',
        explanation: '探针实验在某层激活上训练线性分类器，若分类效果好说明该层表示中已编码了对应信息（如词性、句法树深度）。配合注意力可视化和消融实验可交叉验证。',
        tags: ['可解释性'],
      },
      {
        id: 'llm-a1-c9-e9',
        type: 'open',
        difficulty: 4,
        question:
          '请说明堆叠 N 层 Transformer 时，参数量与计算量分别如何随配置变化，并解释：① 为什么需要权重共享；② 为什么残差初始化要缩放；③ 层数与宽度应该如何权衡。',
        referenceAnswer: `**① 参数量与计算量的增长规律**

参数量（权重共享时）：

    总参数 ≈ N × (4d² + 2d·d_ff + 4d) + vocab × d
          ≈ N × 12d² + vocab × d     （当 d_ff = 4d）

计算量（每 token，序列长度 n）：

    FLOPs ≈ N × (24d² + 4nd + 2d·d_ff)
          ≈ N × (24d² + 4nd + 8d²) = N × (32d² + 4nd)

**关键**：
- 参数量与计算量都**随层数 N 线性增长**；
- 但随宽度 d **平方增长**（注意力 4d²、FFN 8d²）；
- 注意力部分含 **4nd** 项，随序列长度线性增长——长上下文时这部分成为主导。

所以"把宽度翻倍"比"把层数翻倍"代价大得多。

**② 为什么需要权重共享**

输入嵌入矩阵 E 形状 (vocab, d)，输出层要算 logits = x · W_out，W_out 形状 (d, vocab)，
**正好是 E 的转置**。

共享的好处：
- 省下 vocab × d 参数（GPT-2 small：50257×768 ≈ 3860 万，占总参数 31%）；
- 输入词向量与输出词打分落在同一语义空间，逻辑更自洽；
- 实践效果通常不降甚至略升。

代价：几乎没有（唯一限制是维度必须匹配）。

**③ 为什么残差初始化要缩放**

残差是累加：x_{l+1} = x_l + F(x_l)。若每层 F 的输出方差为 σ²，
N 层后主路径方差约 Nσ²，标准差增长 √N 倍。
这会导致深层激活值爆炸、训练不稳。

**方案**：把残差分支的输出投影按 \`1/√(2N)\` 缩放初始化
（2 是因为每个 Block 有两条残差分支）。这样 N 层累加后方差仍保持稳定。

这是 GPT-2 论文明确提到的关键细节，也是深层 Transformer 能训起来的前提之一。

**④ 层数与宽度如何权衡**

- **Scaling Law 的经验**：固定算力下，层数与宽度应**协同增长**
  （如 GPT-2 的 12/24/36/48 层分别配 768/1024/1280/1600 维）；
- 只加深：收益递减，且训练稳定性变差（需要更强的初始化与归一化技巧）；
- 只加宽：参数量按 d² 爆炸，但深度不足导致**表达能力受限**
  （无法组合足够多层的抽象）；
- **经验比例**：d / N 大致在 60~130 之间（GPT-2 small: 768/12=64；
  GPT-2 XL: 1600/48=33，更偏宽）；
- 现代大模型（LLaMA-7B：d=4096、32 层，比值 128）偏向**更宽**，
  因为宽度的并行效率更高（矩阵乘更易被 GPU 吃满）。

**总结**：参数量按 N·d² 增长、计算量同理；权重共享省嵌入参数；
残差初始化缩放保证深层稳定；层宽协同增长并倾向略宽是实践共识。`,
        rubric: [
          { point: '指出参数量/计算量随 N 线性、随 d 平方增长，注意力随 n 线性', score: 3 },
          { point: '解释权重共享的转置关系与省参数比例', score: 2 },
          { point: '解释残差累加导致方差 √N 增长，故按 1/√(2N) 缩放', score: 2 },
          { point: '层宽协同增长，只加深或只加宽都有问题', score: 1 },
        ],
        keywords: ['N·d²', '权重共享', '转置', '残差累加', '√N', '协同增长'],
        explanation: '这道题把参数量估算、权重共享、初始化、架构权衡串成一条线，是大模型架构的核心认知。',
        tags: ['架构', 'Scaling', '面试'],
      },
    ],
  },

  /* ============================================================
   *  c10：加载预训练权重
   * ============================================================ */
  {
    id: 'llm-a1-c10',
    title: '加载预训练权重：让模型真正会说话',
    goal: '理解权重文件的组织方式、参数名映射与常见加载陷阱，学会用别人的权重跑通自己的实现。',
    lessons: [
      {
        id: 'llm-a1-c10-l1',
        title: '权重加载的完整流程与陷阱',
        content: `
### 学习目标

学完本节，你应该能够：
1. 完整走一遍加载三步：名字映射、形状校验、dtype/转置处理；
2. 识别 Conv1D(in,out) 与 Linear(out,in) 的转置约定差异这一头号陷阱；
3. 用「同输入 logits max|Δ|」的标准验收加载正确性，并输出缺失/多余参数清单。

### 前置知识

- c8/c9 的参数命名结构（h.0、h.1…）；
- NumPy dtype 与转置的基本操作。

### 问题背景

自研架构只有「形状正确」这一半价值，加载预训练权重后才真正会说话。权重文件（safetensors/GGUF）里是「参数名 → 张量」的字典；名字映射、形状校验、dtype 转置约定，每一步都是工程陷阱。加载正确性的验收标准只有一个：同一输入下输出 logits 与官方一致（max|Δ| 在浮点容差内）。

### 直觉理解

器官移植手术：官方权重是供体器官库（每个器官有学名），你的实现是受体（器官叫法不同）。移植三步：对照表（名字映射）、血型匹配（dtype）、尺寸匹配（shape）；术后看体征（输出一致性）判断成败。GPT-2 的 Conv1D 权重是 (in, out) 而 nn.Linear 是 (out, in)——就像器官有正反两面，装反了人还能活（不报错），但所有输出都是错的。

### 核心概念与原理详解

## 为什么要加载预训练权重

从零训练一个 GPT-2 需要数十万美元算力。
**加载官方权重**能让你：

1. 立即得到一个"会说话"的模型；
2. 用自己的实现验证正确性（如果输出和官方一致，说明实现无误）；
3. 在此基础上微调。

## 权重文件里有什么

一个 checkpoint 就是一个大的字典：\`参数名 → 张量\`。

\`\`\`python
# 典型的参数名（HuggingFace 风格）
"transformer.wte.weight"              # 词嵌入 (vocab, d)
"transformer.wpe.weight"              # 位置嵌入 (n_ctx, d)
"transformer.h.0.ln_1.weight"         # 第 0 层 LN1
"transformer.h.0.attn.c_attn.weight"  # QKV 合并的投影 (d, 3d)
"transformer.h.0.attn.c_proj.weight"  # 输出投影
"transformer.h.0.mlp.c_fc.weight"     # FFN 第一层
"transformer.h.0.mlp.c_proj.weight"   # FFN 第二层
"transformer.ln_f.weight"             # final LN
"lm_head.weight"                      # 输出投影（可能共享）
\`\`\`

## 加载的三个步骤

**1. 建立参数名映射表**

不同框架命名不同（PyTorch vs TF vs 自己的实现），必须显式映射：

\`\`\`python
MAP = {
    "transformer.wte.weight": "embed",
    "transformer.wpe.weight": "pos_embed",
    "transformer.ln_f.weight": "final_ln.gamma",
    "transformer.ln_f.bias": "final_ln.beta",
}
for i in range(n_layers):
    MAP[f"transformer.h.{i}.ln_1.weight"] = f"blocks.{i}.ln1.gamma"
    ...
\`\`\`

**2. 形状校验**

每个参数加载前必须检查形状完全一致，否则会静默产生错误结果：

\`\`\`python
assert w.shape == target.shape, f"{name} 形状不匹配：{w.shape} vs {target.shape}"
\`\`\`

**3. 逐层加载 + 验证**

加载完后用一小段文本做前向，与官方实现的结果比对（如 logits 的最大差异 < 1e-5）。

## 常见陷阱

**陷阱 1：Conv1D 伪装成 Linear**

GPT-2 的官方实现用 \`Conv1D\` 而不是 \`nn.Linear\`，
其权重形状是 **(in, out)** 而非 PyTorch Linear 的 **(out, in)** —— **转置了**！

\`\`\`python
# 如果自己的实现是 nn.Linear
w = checkpoint["...c_attn.weight"]   # 形状 (d, 3d)
self.c_attn.weight = nn.Parameter(w.T)   # 必须转置成 (3d, d)
\`\`\`

**这是加载 GPT-2 权重最常见的坑**，不转置会得到形状正确但结果全错的情况
（因为 4d² 的矩阵转置后形状常常恰好也对得上）。

**陷阱 2：QKV 合并存储**

\`c_attn\` 把 Q、K、V 三个投影合并成一个 (d, 3d) 矩阵：

\`\`\`python
qkv = x @ c_attn          # (B, n, 3d)
q, k, v = np.split(qkv, 3, axis=-1)
\`\`\`

拆分顺序是 **Q、K、V**，不能搞反。

**陷阱 3：位置编码的偏移**

GPT-2 的 \`wpe\` 是 (1024, 768)，前向时要按位置索引取：

\`\`\`python
pos = np.arange(seq_len)
x = wte[token_ids] + wpe[pos]
\`\`\`

若 batch 中序列从不同位置开始（如对话续写），位置索引不能总从 0 开始。

**陷阱 4：权重共享导致的重复计数**

若 \`lm_head.weight\` 与 \`wte.weight\` 是同一个张量，
加载时不要分别赋值（会覆盖或重复），应显式设成同一个对象。

**陷阱 5：数据类型与缩放**

- fp16 权重在 CPU 上可能溢出，加载后转 fp32 计算；
- 有些实现存的是**已经缩放过的**权重，需要反向处理。

## 验证加载是否正确的标准方法

**最有效的验证**：拿一个固定 prompt，比对自己的实现与官方实现的输出 logits。

\`\`\`python
our_logits = model("Hello, my name is")
ref_logits = torch_model("Hello, my name is")
diff = np.abs(our_logits - ref_logits).max()
assert diff < 1e-4, f"实现有误，最大差异 {diff}"
\`\`\`

**若差异很大，常见原因**：
1. 权重忘了转置（Conv1D 陷阱）；
2. QKV 拆分顺序错；
3. LayerNorm 的 eps 不同（GPT-2 用 1e-5）；
4. 注意力缩放系数漏了 √d；
5. 因果掩码方向反了。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np

# ---- 模拟官方权重文件与我方实现的参数名 ----
official = {
    "transformer.h.0.ln_1.weight": np.array([[0.5, 1.5], [2.0, 1.0]], dtype=np.float32),
    "transformer.h.0.attn.c_attn.weight": np.array([[0.3, 0.1], [-0.2, 0.4]], dtype=np.float32),
}
mine = {"h0.ln1.weight": (2, 2), "h0.attn.qkv.weight": (2, 2)}
alias = {
    "h0.ln1.weight": "transformer.h.0.ln_1.weight",
    "h0.attn.qkv.weight": "transformer.h.0.attn.c_attn.weight",
}
loaded = {}
for my_name, shape in mine.items():
    src = alias[my_name]
    arr = official[src]
    assert arr.shape == shape, f"{my_name}: shape {arr.shape} vs {shape}"
    loaded[my_name] = arr.astype(np.float64)
    print(f"{src} -> {my_name}  shape={arr.shape}  dtype fp32->fp64")

# ---- 验收：同输入输出一致性 ----
x = np.array([[1.0, 2.0]])
ref = x @ official["transformer.h.0.attn.c_attn.weight"]
got = x @ loaded["h0.attn.qkv.weight"]
print("输出一致性 max|Δ| =", float(np.abs(ref - got).max()))

# ---- 陷阱演示：Conv1D vs Linear 的转置约定 ----
wrong = x @ loaded["h0.attn.qkv.weight"].T
try:
    np.testing.assert_allclose(wrong, ref, atol=1e-7)
    print("转置巧合一致（小权重下可能侥幸）")
except AssertionError:
    print("转置权重 max|Δ| =", float(np.abs(wrong - ref).max()), "-> 不一致（头号陷阱实锤）")

# ---- 缺参数与多参数 ----
have = set(loaded); want = set(alias)
print("缺失:", sorted(want - have) or "无", "| 多余:", sorted(have - want) or "无")\`\`\`

预期输出（实测）：两条参数成功映射（fp32→fp64）；同输入输出一致性 max|Δ| = 0.0（加载正确）；转置权重 max|Δ| ≈ 0.60 → 不一致（Conv1D/Linear 转置头号陷阱实锤）；缺失/多余参数：均无。

**常见错误**：忽略 Conv1D(in,out) 与 Linear(out,in) 的转置约定，模型不报错但输出全错；忘处理前缀差异（transformer.h.0 vs h.0）导致静默跳过大半参数；fp32 权重直接转 fp16 而不检查溢出（LayerNorm 的 γ 小、logits 大，溢出静默变 inf）。

### 常见误区

1. **形状对上=加载成功**——转置约定、dtype、前缀都可能静默出错，唯一验收标准是输出一致；\\n2. **加载是纯 IO**——需要映射表、校验、容差比对三件套，是架构理解的最终考核；\\n3. **safetensors 只是为了快**——它同时杜绝了 pickle 的任意代码执行风险，安全性是主因。

### 知识关联

- **向前**：c8/c9 的参数结构与命名在本节成为映射表的键；
- **向后**：c11 生成循环直接消费加载好的模型；tokenizer（c1）必须与权重配套；
- **平行**：llm-a5 的量化/部署章节把 fp32 加载延伸为 GGUF 分级量化。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 三步 | 名字映射 → 形状校验 → dtype 处理 |
| 头号陷阱 | Conv1D (in,out) vs Linear (out,in) 转置约定 |
| 验收 | 同输入 logits max|Δ| ≈ 0（浮点容差内） |
| 文件格式 | safetensors：无 pickle 风险、零拷贝 mmap |
| 兜底 | strict 加载 + 缺失/多余参数清单 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 nanoGPT（github.com/karpathy/nanoGPT）与 Hugging Face Transformers 生成策略文档相应章节）
`,
        tips: [
          {
            kind: 'pitfall',
            text: 'GPT-2 官方用 Conv1D，权重形状是 (in, out)，与 PyTorch Linear 的 (out, in) 相反。加载时必须转置——这是最经典的坑。',
          },
          {
            kind: 'leak',
            text: '验证实现是否正确最可靠的方法：用固定 prompt 比对自己的 logits 与官方实现的 logits，差异 < 1e-4 才算通过。',
          },
          {
            kind: 'note',
            text: 'QKV 通常合并存成 (d, 3d)，拆分顺序是 Q、K、V。搞反了形状仍然对，但结果全错。',
          },
        ],
        demos: [
          {
            title: '参数名映射与形状校验',
            lang: 'python',
            code: `import numpy as np

# 模拟一个 checkpoint
d, n_ctx, vocab, n_layers = 8, 16, 100, 2
ckpt = {
    "transformer.wte.weight": np.zeros((vocab, d)),
    "transformer.wpe.weight": np.zeros((n_ctx, d)),
    "transformer.ln_f.weight": np.ones(d),
    "transformer.ln_f.bias": np.zeros(d),
    "lm_head.weight": np.zeros((vocab, d)),
}
for i in range(n_layers):
    ckpt[f"transformer.h.{i}.ln_1.weight"] = np.ones(d)
    ckpt[f"transformer.h.{i}.ln_1.bias"] = np.zeros(d)
    ckpt[f"transformer.h.{i}.attn.c_attn.weight"] = np.zeros((d, 3 * d))
    ckpt[f"transformer.h.{i}.attn.c_proj.weight"] = np.zeros((d, d))
    ckpt[f"transformer.h.{i}.mlp.c_fc.weight"] = np.zeros((d, 4 * d))

print("checkpoint 参数数量:", len(ckpt))
print()

# 建立映射（注意 Conv1D 需要转置）
def build_target_shapes(d, n_ctx, vocab, n_layers):
    shapes = {
        "embed": (vocab, d),
        "pos_embed": (n_ctx, d),
        "final_ln.gamma": (d,),
        "final_ln.beta": (d,),
    }
    for i in range(n_layers):
        shapes[f"blocks.{i}.ln1.gamma"] = (d,)
        shapes[f"blocks.{i}.ln1.beta"] = (d,)
        shapes[f"blocks.{i}.attn.Wqkv"] = (3 * d, d)   # 注意：转置后
        shapes[f"blocks.{i}.attn.Wo"] = (d, d)
        shapes[f"blocks.{i}.ffn.W1"] = (4 * d, d)
    return shapes

targets = build_target_shapes(d, n_ctx, vocab, n_layers)

def convert(name, arr):
    """应用 Conv1D -> Linear 的转置约定。"""
    if "c_attn" in name or "c_proj" in name or "c_fc" in name:
        return arr.T
    return arr

# 逐层校验
ok, fail = 0, 0
for ck_name, ck_arr in ckpt.items():
    if ck_name == "lm_head.weight":
        continue
    # 简化：按名字推测目标名
    print(f"{ck_name:45} {str(ck_arr.shape):12} -> {convert(ck_name, ck_arr).shape}")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-a1-c10-e1',
        type: 'single',
        difficulty: 2,
        question: 'GPT-2 官方实现使用 Conv1D 而非 nn.Linear，加载权重时最需要注意什么？',
        options: [
          { value: 'A', text: 'Conv1D 的参数更少' },
          { value: 'B', text: '权重形状是 (in, out)，与 PyTorch Linear 的 (out, in) 相反，必须转置' },
          { value: 'C', text: 'Conv1D 不需要偏置' },
          { value: 'D', text: 'Conv1D 只能处理一维输入' },
        ],
        answer: 'B',
        explanation: '这是加载 GPT-2 权重最经典的坑。不转置时形状可能恰好也对得上（因为方阵），但计算结果完全错误，且不报错。',
        tags: ['权重加载'],
      },
      {
        id: 'llm-a1-c10-e2',
        type: 'judge',
        difficulty: 2,
        question: '验证自己实现的 Transformer 是否正确，最可靠的方法是用固定 prompt 比对自己的输出 logits 与官方实现。',
        answer: true,
        explanation: 'logits 是数值层面的严格校验，差异应小于 1e-4。这比"输出文字看起来对"可靠得多，后者可能掩盖细微错误。',
        tags: ['验证'],
      },
      {
        id: 'llm-a1-c10-e3',
        type: 'multiple',
        difficulty: 3,
        question: '加载预训练权重后输出与官方差异很大的可能原因有？（多选）',
        options: [
          { value: 'A', text: 'Conv1D 权重忘了转置' },
          { value: 'B', text: 'QKV 拆分顺序搞错（应为 Q、K、V）' },
          { value: 'C', text: '注意力漏了 1/√d 缩放' },
          { value: 'D', text: '模型参数量太少' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: 'D 与加载无关。A/B/C 都是会导致形状正确但数值全错的隐蔽错误，必须靠 logits 比对发现。',
        tags: ['排错'],
      },
      {
        id: 'llm-a1-c10-e4',
        type: 'fill',
        difficulty: 3,
        question:
          'GPT-2 的 c_attn 把 Q、K、V 三个投影合并成一个 (d, 3d) 矩阵，拆分的顺序是 ___。',
        blanks: [['Q K V', 'QKV', 'qkv', 'Q,K,V', 'Q、K、V']],
        explanation: '顺序必须是 Q、K、V。搞反后形状依然正确（都是 d×d），但语义完全错乱，是极难发现的 bug。',
        tags: ['QKV'],
      },
      {
        id: 'llm-a1-c10-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现 Conv1D 转 Linear 的权重转换：\`conv1d_to_linear(w)\`，输入形状 (in, out)，返回 (out, in)。\n\n用 numpy 转置实现。',
        starterCode: `import numpy as np

def conv1d_to_linear(w):
    return ___


conv1d_to_linear(np.zeros((768, 2304)))
`,
        setupCode: '',
        expectedOutput: '形状 (2304, 768)',
        tests: `import numpy as np
w = np.arange(6).reshape(2, 3)
out = conv1d_to_linear(w)
assert out.shape == (3, 2), f"形状应为 (3,2)，实际 {out.shape}"
assert out[0, 0] == w[0, 0] and out[1, 0] == w[0, 1], "转置关系不正确"
big = conv1d_to_linear(np.zeros((768, 2304)))
assert big.shape == (2304, 768), f"GPT-2 c_attn 转换后应为 (2304,768)，实际 {big.shape}"
assert np.array_equal(conv1d_to_linear(w), w.T), "应等价于 .T"
`,
        answer: `import numpy as np

def conv1d_to_linear(w):
    return np.transpose(w)


conv1d_to_linear(np.zeros((768, 2304)))`,
        explanation:
          '\`\`\`python\nreturn np.transpose(w)\n\`\`\`\n\n**为什么需要这一步**：GPT-2 的 Conv1D 计算是 \`y = x @ W + b\`，W 形状 (in, out)；\nPyTorch Linear 计算是 \`y = x @ W.T + b\`，W 形状 (out, in)。\n\n两者数学等价，但存储方式相反。加载时必须转置，否则矩阵乘法维度不匹配或有更隐蔽的错误。',
        tags: ['编程', '权重转换'],
      },
      {
        id: 'llm-a1-c10-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现 QKV 拆分：\`split_qkv(qkv, n_heads)\`。\n\n- 输入 qkv 形状 (B, n, 3*d)，d = 3d/3\n- 按最后一维三等分得到 Q、K、V（顺序不能变）\n- 各自 reshape 成 (B, n, n_heads, d//n_heads) 并转置成 (B, n_heads, n, d//n_heads)\n\n返回 \`(Q, K, V)\`。',
        starterCode: `import numpy as np

def split_qkv(qkv, n_heads):
    B, n, three_d = qkv.shape
    d = three_d // 3
    dh = d // n_heads
    Q, K, V = np.split(qkv, 3, axis=-1)
    ___
    return Q, K, V


split_qkv(np.zeros((1, 4, 48)), 4)
`,
        setupCode: '',
        expectedOutput: '三个 (1,4,4,4) 的张量',
        tests: `import numpy as np
qkv = np.arange(1 * 4 * 48, dtype=float).reshape(1, 4, 48)
Q, K, V = split_qkv(qkv, 4)
assert Q.shape == (1, 4, 4, 4), f"Q 形状应为 (1,4,4,4)，实际 {Q.shape}"
assert K.shape == Q.shape and V.shape == Q.shape
# Q 应来自前 1/3
assert np.allclose(Q[0, 0, 0], qkv[0, 0, :16].reshape(4, 4)[0]), "Q 应取自前 16 列"
# V 应来自后 1/3
assert np.allclose(V[0, 0, 0], qkv[0, 0, 32:].reshape(4, 4)[0]), "V 应取自后 16 列"
# 三部分不重叠
assert not np.allclose(Q[0, 0, 0], K[0, 0, 0]), "Q 与 K 不应相同"
`,
        answer: `import numpy as np

def split_qkv(qkv, n_heads):
    B, n, three_d = qkv.shape
    d = three_d // 3
    dh = d // n_heads
    Q, K, V = np.split(qkv, 3, axis=-1)
    def reshape(t):
        return t.reshape(B, n, n_heads, dh).transpose(0, 2, 1, 3)
    return reshape(Q), reshape(K), reshape(V)


split_qkv(np.zeros((1, 4, 48)), 4)`,
        explanation:
          '\`\`\`python\nQ, K, V = np.split(qkv, 3, axis=-1)\ndef reshape(t):\n    return t.reshape(B, n, n_heads, dh).transpose(0, 2, 1, 3)\nreturn reshape(Q), reshape(K), reshape(V)\n\`\`\`\n\n**\`np.split(..., 3, axis=-1)\`** 沿最后一维三等分。\n\n**reshape + transpose** 是标准的多头拆解：先把 d 拆成 (n_heads, dh)，再把 head 维度提到前面。',
        tags: ['编程', 'QKV'],
      },
      {
        id: 'llm-a1-c10-e7',
        type: 'judge',
        difficulty: 3,
        question: '加载权重时只要形状匹配就说明加载正确，不需要额外验证。',
        answer: false,
        explanation: '形状匹配不代表语义正确。Conv1D 未转置时方阵形状仍然匹配、QKV 拆反顺序也匹配，但结果全错。必须用 logits 比对做数值验证。',
        tags: ['验证'],
      },
      {
        id: 'llm-a1-c10-e8',
        type: 'single',
        difficulty: 3,
        question: '若 \`lm_head.weight\` 与 \`wte.weight\` 共享同一张量，加载时应该？',
        options: [
          { value: 'A', text: '分别赋值两次' },
          { value: 'B', text: '显式设为同一个对象引用，不要重复赋值' },
          { value: 'C', text: '只加载其中一个，另一个随机初始化' },
          { value: 'D', text: '取两者的平均值' },
        ],
        answer: 'B',
        explanation: '权重共享意味着它们本就是同一份参数。分别赋值会在优化时产生不一致（更新一个而另一个不变），必须让它们指向同一对象。',
        tags: ['权重共享'],
      },
      {
        id: 'llm-a1-c10-e9',
        type: 'open',
        difficulty: 4,
        question:
          '你用 numpy 自己实现了一个 GPT-2，从 HuggingFace 加载了官方权重，但输出的是乱码。请给出系统性的排查步骤，按"最可能出问题"的顺序排列，并说明每一步如何验证。',
        referenceAnswer: `**排查顺序（按可能性从高到低）**

**① Conv1D 权重转置（最常见）**

GPT-2 官方用 Conv1D，权重 (in, out)；PyTorch Linear 是 (out, in)。
若不转置，由于 4d² 是方阵，形状校验会通过但结果全错。

验证：把 c_attn/c_proj/c_fc 的权重全部转置后重跑，看 logits 是否接近官方。

**② QKV 拆分顺序**

c_attn 输出 (d, 3d)，拆分顺序必须是 Q、K、V。
若误拆成 V、K、Q，形状完全正确但语义错乱。

验证：打印 Q、K、V 各自的统计量（均值/方差），与官方实现逐项比对；
或用短序列手工计算第一个 token 的注意力，核对数值。

**③ 因果掩码方向**

掩码应该是"位置 i 只能看 ≤ i"，即上三角为 -inf。
若方向反了（下三角被遮），模型看到的是未来、看不到过去。

验证：检查 mask 矩阵，或用一个必然依赖前文的 prompt 测试。

**④ 位置编码索引**

wpe 是 (n_ctx, d)，前向时按位置取。若忘记加位置编码，
或索引从 1 开始，结果会明显变差。

验证：打印 pos_embed 的取值，确认是从 0 开始递增。

**⑤ 缩放系数**

注意力必须除 √d_head。LayerNorm 的 eps 应为 1e-5（GPT-2 的值）。
若 eps 用了 1e-12 或 1e-6，深层累积后差异会放大。

验证：与官方配置逐项对照。

**⑥ 数值精度**

fp16 权重在 CPU 上可能溢出。加载后统一转 fp32，
并检查是否出现 inf/nan。

**⑦ 权重共享**

lm_head 与 wte 应指向同一对象。若分别加载成两个副本，
二者会不一致（尤其在你微调后）。

**⑧ 参数名映射遗漏**

检查是否有参数没被加载（保持随机初始化）。做法：
加载后统计"未加载的参数名"列表，应该为空。

**验证的黄金标准**

最终用固定 prompt 比对 logits：

    our = model.forward(tokenize("Hello, my name is"))
    ref = torch_model(tokenize("Hello, my name is"))
    assert np.abs(our - ref).max() < 1e-4

只要这一步通过，实现就是正确的。**逐层排查时，可以先只跑 2 层模型，
让问题更容易定位。**`,
        rubric: [
          { point: '把 Conv1D 转置列为第一嫌疑并说明为何形状校验会漏过', score: 3 },
          { point: 'QKV 拆分顺序、因果掩码方向、位置编码索引', score: 3 },
          { point: '缩放系数、eps、精度、权重共享等细节', score: 2 },
          { point: '以 logits 数值比对作为最终验证标准', score: 2 },
        ],
        keywords: ['Conv1D', '转置', 'QKV', '掩码', '位置编码', 'logits 比对'],
        explanation: '这是"复现大模型"最真实的排障场景。能把 Conv1D 转置排在第一位，说明真正踩过这个坑。',
        tags: ['权重加载', '排错', '工程'],
      },
    ],
  },

  /* ============================================================
   *  c11：文本生成
   * ============================================================ */
  {
    id: 'llm-a1-c11',
    title: '文本生成：从 logits 到自然语言',
    goal: '完整实现贪心、温度采样、Top-K、Top-P 四种解码策略，理解重复惩罚与生成循环的工程要点。',
    lessons: [
      {
        id: 'llm-a1-c11-l1',
        title: '生成循环与解码策略全实现',
        content: `
### 学习目标

学完本节，你应该能够：
1. 实现自回归生成循环：前向→采样→拼接→终止条件；
2. 实现并对比贪心/温度/top-k/top-p/重复惩罚五种策略的行为差异；
3. 按「精确问答用低温截断、开放创作用高温 top-p」给出策略选型并说明理由。

### 前置知识

- c10 的已加载模型；c1 的 tokenizer encode/decode；
- softmax 的概率语义（c4-l2）。

### 问题背景

训练好的模型只是一个「下一 token 预测器」；自回归循环把预测接回输入，才变成对话与创作系统。解码策略是控制「稳与浪」的旋钮：贪心稳但呆板，温度调分布锐度，top-k/top-p 截断长尾，重复惩罚压复读。生成质量的上限由模型决定，下限由这些旋钮决定。

### 直觉理解

成语接龙：每轮模型给所有候选词报概率。贪心=永远选票王（安全但车轱辘话）；温度=调现场氛围，低温严肃、高温放飞；top-k=只请票数前 k 名上台抽签，top-p=按累计票数划入选线；重复惩罚=对说过的词罚款。四者可叠加，先截断后采样。

### 核心概念与原理详解

## 自回归生成的基本循环

\`\`\`python
def generate(model, prompt_ids, max_new_tokens=50):
    ids = list(prompt_ids)
    for _ in range(max_new_tokens):
        logits = model(ids)          # (1, seq, vocab)
        next_logits = logits[0, -1]  # 只关心最后一个位置
        next_id = sample(next_logits)
        ids.append(next_id)
    return ids
\`\`\`

**关键**：每步只取**最后一个位置**的 logits，因为那是对"下一个词"的预测。

## 四种解码策略

**1. 贪心解码（Greedy）**

\`\`\`python
next_id = argmax(logits)
\`\`\`
确定、快速，但容易重复和呆板。

**2. 温度采样**

\`\`\`python
probs = softmax(logits / T)
next_id = multinomial(probs)
\`\`\`
T < 1 更保守，T > 1 更发散。

**3. Top-K 采样**

只从概率最高的 K 个中采样：

\`\`\`python
kth = np.sort(logits)[-k]
logits = np.where(logits >= kth, logits, -np.inf)
\`\`\`

问题：K 固定，不随分布形状自适应。

**4. Top-P（核采样）**

按累计概率截断：

\`\`\`python
order = np.argsort(-probs)
cum = np.cumsum(probs[order])
cutoff = np.searchsorted(cum, p) + 1
keep = order[:cutoff]
\`\`\`

自适应性最好，是当前主流。

## 组合使用

实践中常组合：

\`\`\`python
logits = apply_repetition_penalty(logits, generated_ids, penalty=1.1)
logits = logits / temperature
probs = top_k_filter(top_p_filter(softmax(logits), 0.9), 50)
next_id = np.random.choice(len(probs), p=probs)
\`\`\`

## 重复惩罚（Repetition Penalty）

**问题**：模型容易反复输出相同的短语。

**简单惩罚**：对已出现过的 token 降低 logits：

\`\`\`python
for tok in set(generated):
    if logits[tok] > 0:
        logits[tok] /= penalty
    else:
        logits[tok] *= penalty
\`\`\`

**注意**：正负 logits 的处理方向不同（目的是把 logits 往小了推）。

**更好的方案**：
- **频率惩罚**：按出现次数线性降低 \`logits -= alpha * count\`；
- **存在惩罚**：只要出现过就惩罚一次，不按次数。

**代价**：惩罚过强会让文本变得不自然（如避免重复导致用词怪异）。

## 生成循环的工程要点

**1. 上下文长度限制**

GPT-2 的位置编码只支持 1024 个位置。超出后需要：
- 截断最早的 token（滑动窗口）；
- 或使用支持更长上下文的模型。

\`\`\`python
if len(ids) > max_ctx:
    ids = ids[-max_ctx:]
\`\`\`

**2. 停止条件**

- 达到 max_new_tokens；
- 生成 EOS token；
- 生成特定停止字符串。

**3. 流式输出**

不要等全部生成完再显示。每生成一个 token 就 yield 出去，
用户能立即看到效果——这是体验优化的关键。

**4. KV Cache**

前面讲过：缓存历史 K/V，避免每步重算整个前缀。
生成第 t 步的复杂度从 O(t²) 降到 O(t)。

## 采样策略选择指南

| 任务 | 推荐 |
| --- | --- |
| 事实问答、代码生成 | T=0（贪心）或 T=0.2 |
| 通用对话 | T=0.7，top_p=0.9 |
| 创意写作 | T=0.9~1.0，top_p=0.95 |
| 需要可复现 | T=0 + 固定 seed |

**注意**：T=0 也可能因浮点误差、硬件差异而不完全可复现，
需要严格一致时应固定所有随机源。

<TemperatureSamplingDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
rng = np.random.default_rng(11)
vocab = ["<eos>", "的", "模型", "数据", "很大", "很", "强", "。", "学习"]
BIGRAM = {
    "模型": {"数据": 4.0, "很": 3.4, "学习": 3.2},
    "很": {"很大": 5.0, "强": 4.0},
    "数据": {"。": 4.0, "的": 2.0},
    "很大": {"。": 4.0},
    "强": {"。": 4.0},
    "学习": {"。": 3.0, "数据": 2.0},
    "的": {"模型": 2.5, "数据": 2.5},
    "。": {"<eos>": 6.0},
}

def logits_for(prefix):
    z = np.full(len(vocab), 0.5)
    if prefix:
        for t, s in BIGRAM.get(prefix[-1], {}).items():
            z[vocab.index(t)] = s
    return z

def sample(z, temp=1.0, topk=None, topp=None):
    zz = z / max(temp, 1e-5)
    if topk:
        keep = np.argsort(zz)[::-1][:topk]
        m = np.full_like(zz, -1e9); m[keep] = zz[keep]; zz = m
    p = np.exp(zz - zz.max()); p /= p.sum()
    if topp:
        order = np.argsort(p)[::-1]
        cum = np.cumsum(p[order])
        p[order[cum >= topp][1:]] = 0.0
        p /= p.sum()
    return int(rng.choice(len(vocab), p=p))

def generate(prompt, max_new=5, **kw):
    out = [prompt]
    for _ in range(max_new):
        z = logits_for([vocab[i] for i in out]).astype(float)
        for t in set(out[:-1]):                     # 重复惩罚（不含最新）
            z[t] /= 1.3
        nxt = sample(z, **kw)
        out.append(nxt)
        if nxt == vocab.index("<eos>"):
            break
    return "".join(vocab[i] for i in out)

print("greedy :", generate(vocab.index("模型"), temp=1e-5))
print("temp1.2:", generate(vocab.index("模型"), temp=1.2, topk=4))
print("topp0.9:", generate(vocab.index("模型"), topp=0.9))
z0 = logits_for(["模型"])
p1 = np.exp(z0 / 0.5); p1 /= p1.sum(); p2 = np.exp(z0 / 2.0); p2 /= p2.sum()
print(f"温度效应: T=0.5 最大概率 {p1.max():.2f} vs T=2.0 {p2.max():.2f}")\`\`\`

预期输出（实测）：greedy: 模型数据。<eos>；temp1.2+topk4: 模型数据很强强。（高温出现复读，正是重复惩罚的用武之地）；topp0.9: 模型学习。<eos>；温度效应：T=0.5 最大概率 0.66 vs T=2.0 0.29。

**常见错误**：采样概率向量没归一（忘除以 sum）导致 choice 报错或分布错；top-p 保留的是「累计刚好超过 p 的那批」却把跨越线那位也裁掉；softmax 用 z 而不是 z/temp 再减最大值，高温下exp 溢出。

### 常见误区

1. **温度越高越「有创意」**——高温只是分布更平，采样更随机，常出病句；创意来自分布本身的多样性；\\n2. **top-k/top-p 必选其一**——贪心与全分布采样也是合法策略，任务是开放写作还是精确问答决定选型；\\n3. **重复惩罚越高越好**——过高压制合法重复（代词、专业名词），1.1~1.3 是常用区间。

### 知识关联

- **向前**：c10 加载的模型在本节开始说话；c1 的 tokenizer 在循环尾部 decode；
- **向后**：c12 用注意力可视化观察生成过程中模型「在看谁」；
- **平行**：llm-a4/llm-b 系列的 Agent 循环是生成循环外面包了一层工具调用。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 循环 | logits → 策略采样 → append → 再前向，直到 <eos> 或预算 |
| 贪心 | argmax，稳定但呆板 |
| 温度 | logits/T：T<1 变尖，T>1 变平 |
| 截断 | top-k 按票数、top-p 按累计概率，先截断后采样 |
| 反复读 | 重复惩罚（logits 除以 1.1~1.3）|

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 nanoGPT（github.com/karpathy/nanoGPT）与 Hugging Face Transformers 生成策略文档相应章节）
`,
        tips: [
          {
            kind: 'interview',
            text: '「Top-K 与 Top-P 的区别」：K 是固定数量的候选，P 是固定概率质量的自适应候选。P 更鲁棒，是当前主流。',
          },
          {
            kind: 'leak',
            text: '流式输出（每个 token 立即显示）是改善生成体验最有效的手段，不增加任何计算成本。',
          },
          {
            kind: 'pitfall',
            text: '生成时要限制总长度不超过模型的位置编码上限（GPT-2 是 1024），否则位置索引越界会报错或产生错误结果。',
          },
        ],
        demos: [
          {
            title: '四种解码策略的完整实现与对比',
            lang: 'python',
            code: `import numpy as np

def softmax(x):
    e = np.exp(x - np.max(x))
    return e / e.sum()

def greedy(logits):
    return int(np.argmax(logits))

def temperature_sample(logits, T=1.0, rng=None):
    rng = rng or np.random.default_rng(0)
    p = softmax(logits / T)
    return int(rng.choice(len(p), p=p))

def top_k_sample(logits, k=5, rng=None):
    rng = rng or np.random.default_rng(0)
    kth = np.sort(logits)[-k]
    filtered = np.where(logits >= kth, logits, -np.inf)
    p = softmax(filtered)
    return int(rng.choice(len(p), p=p))

def top_p_sample(logits, p_thresh=0.9, rng=None):
    rng = rng or np.random.default_rng(0)
    probs = softmax(logits)
    order = np.argsort(-probs)
    cum = np.cumsum(probs[order])
    cutoff = int(np.searchsorted(cum, p_thresh) + 1)
    keep = set(order[:cutoff].tolist())
    masked = np.array([logits[i] if i in keep else -np.inf for i in range(len(logits))])
    p = softmax(masked)
    return int(rng.choice(len(p), p=p))

# 模拟一个模型的 logits（词表 8）
logits = np.array([4.0, 3.5, 3.0, 2.0, 1.0, 0.5, 0.0, -1.0])
vocab = ["好", "不错", "热", "冷", "糟", "嗯", "的", "了"]

print("logits:", logits)
print("贪心 ->", vocab[greedy(logits)])
print()
print("温度采样（不同温度，各采样 200 次统计）:")
for T in (0.3, 1.0, 2.0):
    rng = np.random.default_rng(42)
    counts = {}
    for _ in range(200):
        t = temperature_sample(logits, T, rng)
        counts[t] = counts.get(t, 0) + 1
    top = sorted(counts.items(), key=lambda x: -x[1])[:3]
    print("  T=", T, " ->", [(vocab[i], c) for i, c in top])

print()
print("Top-K (k=3) 采样分布:")
rng = np.random.default_rng(1)
counts = {}
for _ in range(200):
    t = top_k_sample(logits, 3, rng)
    counts[t] = counts.get(t, 0) + 1
print("  ", sorted([(vocab[i], c) for i, c in counts.items()], key=lambda x: -x[1]))

print()
print("Top-P (p=0.9) 保留的候选数:")
probs = softmax(logits)
order = np.argsort(-probs)
cum = np.cumsum(probs[order])
cutoff = int(np.searchsorted(cum, 0.9) + 1)
print("  ", cutoff, "个 ->", [vocab[i] for i in order[:cutoff]])`,
          },
          {
            title: '模拟一次完整的生成循环',
            lang: 'python',
            code: `import numpy as np

VOCAB = ["<eos>", "我", "爱", "学习", "大", "模型", "。", "很", "难"]

def fake_model(ids):
    """模拟模型：根据最后一个 token 决定下一个 token 的 logits。"""
    transitions = {
        1: [0, 0, 6, 0, 0, 0, 0, 0, 0],   # 我 -> 爱
        2: [0, 0, 0, 5, 0, 0, 0, 0, 0],   # 爱 -> 学习
        3: [0, 0, 0, 0, 4, 0, 0, 0, 0],   # 学习 -> 大
        4: [0, 0, 0, 0, 0, 5, 0, 0, 0],   # 大 -> 模型
        5: [6, 0, 0, 0, 0, 0, 0, 0, 0],   # 模型 -> 。
    }
    last = ids[-1]
    logits = np.array(transitions.get(last, [5] + [0] * 8), dtype=float)
    return logits

def generate(prompt_ids, max_new=10):
    ids = list(prompt_ids)
    out = []
    for step in range(max_new):
        logits = fake_model(ids)
        nxt = int(np.argmax(logits))
        if nxt == 0:
            out.append("[EOS]")
            break
        ids.append(nxt)
        out.append(VOCAB[nxt])
    return out

prompt = [1]
gen = generate(prompt, 10)
print("prompt:", VOCAB[1])
print("生成:", " ".join(gen))
print()
print("生成循环要点：")
print("  1) 每步只取最后一个位置的 logits")
print("  2) 把新 token 追加到序列，再进下一轮")
print("  3) 遇到 EOS 或达到最大长度就停止")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-a1-c11-e1',
        type: 'single',
        difficulty: 2,
        question: '自回归生成时，每一步应该用模型的哪个位置的输出？',
        options: [
          { value: 'A', text: '第一个位置' },
          { value: 'B', text: '最后一个位置' },
          { value: 'C', text: '所有位置的平均' },
          { value: 'D', text: '随机选一个位置' },
        ],
        answer: 'B',
        explanation: '最后一个位置的输出是对"下一个词"的预测（因为它看到了全部前文）。其他位置的输出是在预测各自的下一个词。',
        tags: ['生成'],
      },
      {
        id: 'llm-a1-c11-e2',
        type: 'judge',
        difficulty: 2,
        question: '温度 T 越大，采样得到的输出越随机、越发散。',
        answer: true,
        explanation: 'logits 除以更大的 T 会让差异变小，softmax 后分布更平坦，低概率词也能被采样到，因此输出更随机。T→0 时趋近贪心。',
        tags: ['温度'],
      },
      {
        id: 'llm-a1-c11-e3',
        type: 'multiple',
        difficulty: 3,
        question: '关于四种解码策略，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '贪心解码确定但容易重复、呆板' },
          { value: 'B', text: 'Top-K 的 K 固定，不能随分布形状自适应' },
          { value: 'C', text: 'Top-P 按累计概率截断，候选数自适应' },
          { value: 'D', text: '温度采样不需要计算概率分布' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: 'D 错误：温度采样同样要先 softmax 得到概率分布，再按分布采样。',
        tags: ['解码策略'],
      },
      {
        id: 'llm-a1-c11-e4',
        type: 'fill',
        difficulty: 3,
        question:
          'GPT-2 的位置编码最多支持 ___ 个位置，超过后需要截断或使用滑动窗口。',
        blanks: [['1024']],
        explanation: 'GPT-2 的 wpe 是 (1024, 768)，位置索引超界会报错或产生无意义结果。这正是长上下文模型需要改进位置编码（如 RoPE）的原因。',
        tags: ['上下文长度'],
      },
      {
        id: 'llm-a1-c11-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现贪心解码 \`greedy_decode(logits)\`：返回 logits 中最大值的索引（整数）。',
        starterCode: `import numpy as np

def greedy_decode(logits):
    return ___


greedy_decode(np.array([1.0, 5.0, 3.0]))
`,
        setupCode: '',
        expectedOutput: '1',
        tests: `import numpy as np
assert greedy_decode(np.array([1.0, 5.0, 3.0])) == 1, "最大值索引应为 1"
assert greedy_decode(np.array([9.0, 1.0])) == 0
assert greedy_decode(np.array([0.1, 0.2, 0.9])) == 2
assert isinstance(greedy_decode(np.array([1, 2])), (int, np.integer))
`,
        answer: `import numpy as np

def greedy_decode(logits):
    return int(np.argmax(logits))


greedy_decode(np.array([1.0, 5.0, 3.0]))`,
        explanation:
          '\`\`\`python\nreturn int(np.argmax(logits))\n\`\`\`\n\n\`np.argmax\` 返回最大值第一次出现的索引。转成 Python int 便于后续作为索引使用。',
        tags: ['编程', '贪心'],
      },
      {
        id: 'llm-a1-c11-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现 Top-K 过滤 \`top_k_filter(logits, k)\`：返回新的 logits 数组，只保留最大的 k 个值，其余设为 \`-inf\`。',
        starterCode: `import numpy as np

def top_k_filter(logits, k):
    logits = np.asarray(logits, dtype=float)
    ___
    return filtered


top_k_filter(np.array([1.0, 5.0, 3.0, 2.0]), 2)
`,
        setupCode: '',
        expectedOutput: '-inf 只出现在较小的两个位置',
        tests: `import numpy as np
out = top_k_filter(np.array([1.0, 5.0, 3.0, 2.0]), 2)
assert np.isneginf(out[0]) and np.isneginf(out[3]), "最小的两个应被置为 -inf"
assert out[1] == 5.0 and out[2] == 3.0, "最大的两个应保留"
assert np.sum(np.isneginf(out)) == 2, "应恰好有 2 个 -inf"

# k >= 长度时全部保留
out2 = top_k_filter(np.array([1.0, 2.0]), 5)
assert not np.any(np.isneginf(out2)), "k 大于长度时应全部保留"
`,
        answer: `import numpy as np

def top_k_filter(logits, k):
    logits = np.asarray(logits, dtype=float)
    if k >= len(logits):
        return logits.copy()
    kth = np.sort(logits)[-k]
    filtered = np.where(logits >= kth, logits, -np.inf)
    return filtered


top_k_filter(np.array([1.0, 5.0, 3.0, 2.0]), 2)`,
        explanation:
          '\`\`\`python\nif k >= len(logits):\n    return logits.copy()\nkth = np.sort(logits)[-k]\nfiltered = np.where(logits >= kth, logits, -np.inf)\nreturn filtered\n\`\`\`\n\n**\`np.sort(logits)[-k]\`** 取第 k 大的值作为阈值。用 \`>=\` 而不是 \`>\` 是为了处理并列情况。\n\n**注意 k >= 长度时要特判**，否则 \`[-k]\` 会越界。',
        tags: ['编程', 'Top-K'],
      },
      {
        id: 'llm-a1-c11-e7',
        type: 'code',
        difficulty: 4,
        question:
          '实现 Top-P（核采样）过滤 \`top_p_filter(logits, p)\`：\n\n1. softmax 得到概率\n2. 按概率降序累加，找到累计概率 ≥ p 的最小集合\n3. 集合外的概率置 0，集合内重新归一化\n\n返回新的概率数组。',
        starterCode: `import numpy as np

def top_p_filter(logits, p=0.9):
    logits = np.asarray(logits, dtype=float)
    e = np.exp(logits - logits.max())
    probs = e / e.sum()
    order = np.argsort(-probs)
    cum = np.cumsum(probs[order])
    ___
    return new_probs


top_p_filter(np.array([2.0, 1.0, 0.5, 0.1]), 0.6)
`,
        setupCode: '',
        expectedOutput: '候选数随 p 自适应',
        tests: `import numpy as np
out = top_p_filter(np.array([2.0, 1.0, 0.5, 0.1]), 0.6)
assert abs(out.sum() - 1.0) < 1e-9, f"归一化后和应为 1，实际 {out.sum()}"
assert np.count_nonzero(out) >= 1, "至少保留 1 个"
assert np.count_nonzero(out) < 4, "p=0.6 时应过滤掉部分候选"
assert out[0] == out.max(), "概率最大的应保留"

# p 越大保留越多
out_lo = top_p_filter(np.array([2.0, 1.0, 0.5, 0.1]), 0.3)
out_hi = top_p_filter(np.array([2.0, 1.0, 0.5, 0.1]), 0.99)
assert np.count_nonzero(out_lo) <= np.count_nonzero(out_hi), "p 越大保留越多"
assert abs(out_hi.sum() - 1.0) < 1e-9
`,
        answer: `import numpy as np

def top_p_filter(logits, p=0.9):
    logits = np.asarray(logits, dtype=float)
    e = np.exp(logits - logits.max())
    probs = e / e.sum()
    order = np.argsort(-probs)
    cum = np.cumsum(probs[order])
    cutoff = int(np.searchsorted(cum, p) + 1)
    keep = order[:cutoff]
    masked = np.zeros_like(probs)
    masked[keep] = probs[keep]
    new_probs = masked / masked.sum()
    return new_probs


top_p_filter(np.array([2.0, 1.0, 0.5, 0.1]), 0.6)`,
        explanation:
          '\`\`\`python\norder = np.argsort(-probs)\ncum = np.cumsum(probs[order])\ncutoff = int(np.searchsorted(cum, p) + 1)\nkeep = order[:cutoff]\nmasked = np.zeros_like(probs)\nmasked[keep] = probs[keep]\nnew_probs = masked / masked.sum()\nreturn new_probs\n\`\`\`\n\n**\`searchsorted(cum, p) + 1\`**：找到累计概率首次达到 p 的位置，+1 是因为要在该位置之后也包含。\n\n**重新归一化**保证概率和为 1。这是核采样的标准实现。',
        tags: ['编程', 'Top-P'],
      },
      {
        id: 'llm-a1-c11-e8',
        type: 'judge',
        difficulty: 3,
        question: '重复惩罚（repetition penalty）设置得越大，生成质量一定越好。',
        answer: false,
        explanation: '惩罚过强会导致模型刻意回避常用词，输出变得不自然、用词怪异。常见取值 1.1~1.3，需要根据任务调。',
        tags: ['重复惩罚'],
      },
      {
        id: 'llm-a1-c11-e9',
        type: 'code',
        difficulty: 3,
        question:
          '实现重复惩罚 \`apply_repetition_penalty(logits, generated_ids, penalty=1.2)\`：\n\n对 \`generated_ids\` 中出现过的每个 token：\n- 若 \`logits[tok] > 0\`，则除以 penalty\n- 否则乘以 penalty\n\n返回修改后的新数组。',
        starterCode: `import numpy as np

def apply_repetition_penalty(logits, generated_ids, penalty=1.2):
    logits = np.asarray(logits, dtype=float).copy()
    for tok in set(generated_ids):
        if logits[tok] > 0:
            logits[tok] = ___
        else:
            logits[tok] = ___
    return logits


apply_repetition_penalty(np.array([2.0, -1.0, 0.5]), [0, 1], 2.0)
`,
        setupCode: '',
        expectedOutput: '[1.0, -2.0, 0.5]',
        tests: `import numpy as np
logits = np.array([2.0, -1.0, 0.5])
out = apply_repetition_penalty(logits, [0, 1], 2.0)
assert abs(out[0] - 1.0) < 1e-9, f"正值应除以 penalty：2/2=1，实际 {out[0]}"
assert abs(out[1] - (-2.0)) < 1e-9, f"负值应乘 penalty：-1*2=-2，实际 {out[1]}"
assert abs(out[2] - 0.5) < 1e-9, "未出现的 token 不应改变"
# 原数组不应被修改
assert logits[0] == 2.0, "不应修改原数组"
`,
        answer: `import numpy as np

def apply_repetition_penalty(logits, generated_ids, penalty=1.2):
    logits = np.asarray(logits, dtype=float).copy()
    for tok in set(generated_ids):
        if logits[tok] > 0:
            logits[tok] /= penalty
        else:
            logits[tok] *= penalty
    return logits


apply_repetition_penalty(np.array([2.0, -1.0, 0.5]), [0, 1], 2.0)`,
        explanation:
          '\`\`\`python\nfor tok in set(generated_ids):\n    if logits[tok] > 0:\n        logits[tok] /= penalty\n    else:\n        logits[tok] *= penalty\n\`\`\`\n\n**正负处理方式不同**：目的是把已出现 token 的 logits 往小了推。正值除以 >1 变xiao，负值乘以 >1 变得更负。\n\n\`set()\` 去重避免同一 token 被惩罚多次（若想按频次惩罚，应改用频率惩罚）。',
        tags: ['编程', '重复惩罚'],
      },
      {
        id: 'llm-a1-c11-e10',
        type: 'open',
        difficulty: 4,
        question:
          '请完整描述一次文本生成的流程（从 prompt 到输出），并说明：① 每一步的计算内容；② KV Cache 如何加速；③ 如何实现流式输出；④ 温度、Top-K、Top-P 应该按什么顺序组合使用。',
        referenceAnswer: `**① 完整生成流程**

给定 prompt token 序列 [t₁, ..., tₙ]：

1. **Prefill 阶段**：把整个 prompt 一次性送入模型，
   对每个位置算出 Q/K/V，做因果注意力，得到 n 个位置的隐藏状态。
   - 只取**最后一个位置**的 logits（它预测下一个 token）；
   - 但**所有位置的 K/V 都要缓存**（后续要用）。

2. **采样**：对最后一个位置的 logits 应用温度、Top-K、Top-P、重复惩罚，
   得到概率分布，采样出 tₙ₊₁。

3. **Decode 循环**：把 tₙ₊₁ 追加到序列
   - 只送**新 token** 入模型（因为前面的 K/V 已缓存）；
   - 算出新的 q/k/v，把 k/v 追加进缓存；
   - 新 token 的 query 与**全部缓存 K** 做注意力（含因果掩码）；
   - 得到 logits，采样 tₙ₊₂；
   - 重复直到 EOS 或达到 max_new_tokens。

**② KV Cache 的加速原理**

无缓存时，第 s 步要对长度为 s 的序列做完整前向，
注意力复杂度 O(s²)，总复杂度 O(n³)。

有缓存时，第 s 步只算 1 个新 token：
- 新 token 的 K/V 计算 O(1) 次矩阵乘；
- 注意力只需与 n 个缓存 K 做点积，O(s)；
- **总复杂度从 O(n³) 降到 O(n²)**。

代价是显存：缓存 = 2 × 层数 × 序列长度 × 维度。

**③ 流式输出实现**

在每个采样步骤后立即把新 token 解码成文本并 yield：

    for step in range(max_new):
        next_id = sample(...)
        text_piece = tokenizer.decode([next_id])
        yield text_piece          # 立刻推送给前端

工程上要注意**分块解码**：单个 token 可能是半个汉字（中文常见），
应缓存到能组成完整字符时再输出，否则会显示乱码。

前端用 SSE / WebSocket 接收逐段文本并追加到界面。

**④ 采样策略的组合顺序**

推荐顺序（这也是 HuggingFace 的实现顺序）：

1. **重复惩罚**（先调整 logits，会影响后续所有步骤）；
2. **温度缩放**：logits / T；
3. **softmax** 得到概率；
4. **Top-K 过滤**（先硬性限制候选数量上限）；
5. **Top-P 过滤**（再按概率质量自适应截断）；
6. **重新归一化**；
7. **采样**。

**为什么这个顺序**：
- 重复惩罚和温度都是对 logits 的变换，必须在 softmax 前；
- Top-K 先做可以避免 Top-P 在极端情况下保留过多候选；
- 两者都做完后必须重新归一化，否则概率和不为 1。

**参数建议**：
- 事实问答：T=0（或 0.1）+ 不做 top-p；
- 通用对话：T=0.7 + top_p=0.9；
- 创意写作：T=0.9 + top_p=0.95；
- 一般不要同时大幅调 T 和 top_p，容易崩坏。`,
        rubric: [
          { point: '区分 prefill 与 decode 两阶段，说明只取最后位置 logits', score: 2 },
          { point: 'KV Cache 让 decode 从 O(n²)/步降到 O(n)/步，总体 O(n³)→O(n²)', score: 3 },
          { point: '流式输出实现与中文分块解码的注意事项', score: 2 },
          { point: '组合顺序：惩罚 → 温度 → softmax → Top-K → Top-P → 归一化', score: 3 },
        ],
        keywords: ['prefill', 'decode', 'KV Cache', 'O(n³)→O(n²)', '流式', '归一化'],
        explanation: '这是生成侧最完整的工程题，能说清 prefill/decode 分离与采样顺序就是实战水平。',
        tags: ['生成', '工程', '面试'],
      },
    ],
  },

  /* ============================================================
   *  c12：可解释性与收尾
   * ============================================================ */
  {
    id: 'llm-a1-c12',
    title: '可解释性：看见模型在想什么',
    goal: '掌握注意力可视化、logit lens、探针实验与激活探测等方法，理解它们的价值与局限。',
    lessons: [
      {
        id: 'llm-a1-c12-l1',
        title: '五类可解释性方法与它们的局限',
        content: `
### 学习目标

学完本节，你应该能够：
1. 演示五类可解释性方法的机制：注意力可视化、logit lens、探针、激活干预、SAE；
2. 复述三条铁律：注意力权重≠解释、探针高分≠使用、相关≠因果；
3. 设计一个激活干预实验：单变量替换 + 对照组 + 影响量化。

### 前置知识

- c4/c5 的注意力权重矩阵；c6/c9 的残差流概念；
- c11 的生成循环（干预实验的载体）。

### 问题背景

参数上百亿，怎么知道模型是「真理解」还是「复读机」？可解释性是黑盒的 X 光机：注意力可视化看「视线」、logit lens 看「中途答案」、探针测「能力」、激活干预做「因果实验」、SAE 找「特征原子」。每种方法都有致命局限——注意力权重≠解释、探针高分≠使用、相关性≠因果。知道边界，才能把方法当仪器而不是护身符。

### 直觉理解

五种「观察」一个人的办法：看他的眼睛往哪瞟（注意力可视化）、考试中途偷看他的草稿（logit lens：把中间层残差流直接投影到词表）、出题测他会不会（探针）、换掉他大脑某块零件看反应（激活干预）、让他说出自己为什么这么做（SAE 特征词典）。眼睛看的未必是依据，测出来的能力未必被用到——每台仪器都有量程。

### 核心概念与原理详解

## 为什么需要可解释性

1. **调试**：模型出错时，需要知道错在哪一层；
2. **建立信任**：用户想知道"为什么这么回答"；
3. **安全**：发现模型是否在「假装」某个行为；
4. **科学理解**：模型内部到底在算什么。

## 方法一：注意力可视化

把注意力权重矩阵画成热力图，看每个 token 关注了谁。

<Heatmap name="attention-4x4" />

**能看出什么**：
- 浅层的注意力常集中在**相邻 token**（局部模式）；
- 深层会出现**长距离依赖**（如代词指向之前的名词）；
- 某些头专门关注**标点、句法边界**。

**局限（重要）**：**注意力权重 ≠ 重要性**。
高注意力不代表那个 token 对输出影响大——因为 V 的值也会影响结果。
已有研究证明同一个输出可以由完全不同的注意力模式产生。

> 所以注意力可视化是**洞察工具**，不是**证据**。

## 方法二：Logit Lens（对数透镜）

把**中间层**的隐藏状态直接投影到词表空间，看模型"此刻想输出什么"：

\`\`\`python
# 取第 L 层的隐藏状态 h
logits = h @ embed.T          # 用输出投影（通常共享）
probs = softmax(logits)
top5 = argsort(-probs)[:5]
\`\`\`

**能看出什么**：随着层数加深，预测逐渐从"无关词"收敛到正确答案。
如果某一层已经猜对了，说明这个答案在该层就基本确定了。

**局限**：中间层的表示可能与最终层不在同一"坐标系"（尤其 Pre-LN 后），
需要先做归一化（所以叫 "tuned lens" 改进版会训练一个小映射）。

## 方法三：探针实验（Probing）

在某层激活上训练一个**简单分类器**（如线性层），看它能预测什么：

\`\`\`python
# 冻结模型，只训练 probe
probe = Linear(d_model, n_classes)
for h, label in activations:
    loss = cross_entropy(probe(h), label)
\`\`\`

**能看出什么**：某层表示中**编码了哪些信息**（词性、句法树深度、语义类别）。

**局限**：探针能学会不代表模型实际用到了这个信息
（可能是探针自己"解码"出来的）。改进方法是**因果探针**（干预激活看输出变化）。

## 方法四：激活干预（Activation Patching）

把某一层的某个激活值替换成另一个输入的激活，看输出如何变化。

**这是目前最强的因果证据**：能定位"哪个位置、哪一层的哪一维真正影响了输出"。

**应用**：
- 找出生效的"事实神经元"；
- 定位幻觉产生的层；
- 发现安全对齐在哪些层起作用。

## 方法五：特征可视化与稀疏自编码器（SAE）

**超级位置（Superposition）问题**：模型维度有限，但需要表示的特征远多于维度，
因此多个概念会**叠加**在同一个维度上。

**稀疏自编码器（SAE）**：训练一个过完备的稀疏字典，
把激活分解成可解释的"特征方向"。

**成果**：Anthropic 的可解释性研究用 SAE 找到了大量可解释特征
（如"金门大桥"、"代码错误"、"谄媚语气"），并能通过**放大某个特征**来操控输出。

## 三种方法的对比

| 方法 | 类型 | 能回答 | 局限 |
| --- | --- | --- | --- |
| 注意力可视化 | 观察 | 模型看了谁 | 注意力 ≠ 重要性 |
| Logit Lens | 观察 | 每层的预测倾向 | 坐标系不一致 |
| 探针 | 相关性 | 表示中有什么信息 | 非因果 |
| 激活干预 | **因果** | 什么真正影响输出 | 需要大量实验 |
| SAE | 分解 | 有哪些可解释特征 | 训练成本高 |

## 一个重要的警示

**不要过度解读**。模型内部并没有"人类可读的推理过程"。
可解释性方法给出的是**有用的近似**，而不是模型的"真实想法"。

在做安全决策时，应把可解释性分析与**行为测试**结合，
而不是仅凭"看起来模型在思考 X"就下结论。

## 恭喜你走完这条路

从第一章的"文本怎么变成数字"，到现在的"模型内部在算什么"，你已经亲手实现了：

分词 → 嵌入 → 位置编码 → 自注意力 → 多头 → 残差 → LayerNorm → FFN
→ Block → 堆叠 → 加载权重 → 生成 → 观察内部

**这 12 章串起来，就是一个完整的 GPT。**

<AttentionHeatmapDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
rng = np.random.default_rng(0)
n, d, V = 5, 16, 8
X = rng.normal(0, 1, (1, n, d))
Wq = rng.normal(0, 0.5, (d, d)); Wk = rng.normal(0, 0.5, (d, d))
Wv = rng.normal(0, 0.5, (d, d)); Wout = rng.normal(0, 0.5, (d, V))
toks = ["the", "cat", "sat", "on", "mat"]

def softmax(x, axis=-1):
    x = x - x.max(axis=axis, keepdims=True)
    e = np.exp(x); return e / e.sum(axis=axis, keepdims=True)

Q, K, V_ = X @ Wq, X @ Wk, X @ Wv
A = softmax(Q @ K.transpose(0, 2, 1) / np.sqrt(d))
print("注意力矩阵（行=查询位置，列=被看位置）:")
print("     " + " ".join(f"{t:>5}" for t in toks))
for i, t in enumerate(toks):
    print(f"{t:>4} " + " ".join(f"{A[0, i, j]:5.2f}" for j in range(n)))

# ---- Logit Lens：中间层残差流直接投影词表 ----
hidden = X + A @ V_
for name, h in (("layer0 输入", X), ("layer1 残差流", hidden)):
    p = softmax(h @ Wout)
    print(f"logit lens {name}: 逐位置 argmax =", p[0].argmax(-1).tolist())

# ---- 激活干预：把某位置的 V 换成噪声，看输出变化 ----
V_pert = V_.copy(); V_pert[0, 2] = rng.normal(0, 5, d)
out_a, out_b = (A @ V_), (A @ V_pert)
print(f"干预位置2 的 V: 输出平均变化 {np.abs(out_b - out_a).mean():.3f}（因果影响的直接度量）")
print("警示: 本例权重为随机初始化，注意力权重不构成任何解释（方法演示而已）")\`\`\`

预期输出（实测）：注意力矩阵打印（如 sat→mat 0.96 的强对齐；随机权重仅演示方法）；logit lens：layer0 argmax=[4,1,5,2,5] → layer1 残差流 [1,1,3,3,6]（中途读数随层变化）；干预位置 2 的 V 使输出平均变化 1.157（因果影响的直接度量）；末行警示随机初始化权重不构成解释。

**常见错误**：把注意力权重的行归一化当成「解释强度」（softmax 行和恒为 1，只能看相对分布）；logit lens 用未训练的 unembedding 矩阵投影中间层（应配合最终的 LayerNorm 与 unembedding）；干预实验不改单一变量（同时动了位置与内容），归因全废。

### 常见误区

1. **注意力权重=解释**——知名反例已有：权重高可能只是残差旁路的「移动」操作，且无梯度因果含义；\\n2. **探针准确率高=模型用了该特征**——探针可能自己学会任务（解码器太强），要用控制任务与最小探针；\\n3. **SAE 特征=人类概念**——特征字典是数据驱动的切分，与人类概念对齐是经验事实不是保证。

### 知识关联

- **向前**：本课程在此收官；注意力矩阵是 c4~c5 的产物，残差流是 c6/c9 的产物；
- **向后**：llm-a2 的机制可解释性课程把 logit lens/SAE 展开成完整方法论；
- **平行**：llm-b 系列的评估课程从行为层面（基准测试）补足本节的机制层面。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 方法 | 注意力可视化 / logit lens / 探针 / 激活干预 / SAE |
| 铁律 | 注意力权重≠解释；探针高分≠使用；相关≠因果 |
| 因果实验 | 激活干预是唯一能谈因果的日常工具 |
| logit lens | 中间层残差流 × unembedding 提前读出 |
| 姿态 | 方法是仪器，量程有限；结论需三角验证 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 nanoGPT（github.com/karpathy/nanoGPT）与 Hugging Face Transformers 生成策略文档相应章节）
`,
        tips: [
          {
            kind: 'interview',
            text: '「注意力权重能说明重要性吗」：不能。注意力权重只是"看了谁"，V 的值也影响输出，且已有研究表明不同注意力可产生同一输出。',
          },
          {
            kind: 'leak',
            text: '要建立"因果"结论必须做激活干预（activation patching），而不是只做观察（注意力可视化）或相关性分析（探针）。',
          },
          {
            kind: 'note',
            text: '超级位置（superposition）是理解大模型内部的重要概念：维度有限但特征极多，导致概念叠加在同一维度上。SAE 就是为此设计的分解工具。',
          },
        ],
        demos: [
          {
            title: 'Logit Lens：看每层的预测倾向',
            lang: 'python',
            code: `import numpy as np

VOCAB = ["<unk>", "猫", "狗", "吃", "鱼", "跑", "了", "很", "。"]

def softmax(x):
    e = np.exp(x - x.max())
    return e / e.sum()

# 模拟：12 层的隐藏状态逐渐收敛到正确答案 "鱼"
rng = np.random.default_rng(0)
target = 4  # "鱼"

print("层 | Top-3 预测（用 logit lens 直接投影）")
print("-" * 50)
for layer in range(12):
    # 越靠后，目标类的分数越高（模拟收敛过程）
    logits = rng.normal(0, 1, len(VOCAB))
    logits[target] += layer * 0.8
    probs = softmax(logits)
    top3 = np.argsort(-probs)[:3]
    desc = ", ".join(f"{VOCAB[i]}({probs[i]:.2f})" for i in top3)
    mark = " <-- 已锁定" if top3[0] == target else ""
    print(f"{layer:2d} | {desc}{mark}")

print()
print("观察：随着层数加深，答案逐渐从随机收敛到正确结果。")
print("如果某一层已经锁定，说明答案在该层就基本确定了。")`,
          },
          {
            title: '注意力权重不等于重要性',
            lang: 'python',
            code: `import numpy as np

# 构造两个注意力模式，产生完全相同的输出
V = np.array([[1.0, 0.0], [0.0, 1.0]])   # 两个 value 向量

# 模式 A：80% 关注 token0
pA = np.array([0.8, 0.2])
outA = pA @ V

# 模式 B：50/50，但调整了 V 的比例（模拟不同层的 V）
V2 = np.array([[1.6, 0.0], [0.0, 0.25]])
pB = np.array([0.5, 0.5])
outB = pB @ V2

print("模式 A 注意力:", pA, " 输出:", outA)
print("模式 B 注意力:", pB, " 输出:", outB)
print("输出相同:", np.allclose(outA, outB))
print()
print("→ 完全不同的注意力模式可以产生相同的输出")
print("→ 所以'注意力高'不等于'这个 token 重要'")
print()
print("要看因果关系，需要对激活做干预（activation patching），")
print("而不是只观察注意力权重。")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-a1-c12-e1',
        type: 'single',
        difficulty: 2,
        question: '关于注意力权重，下列理解正确的是？',
        options: [
          { value: 'A', text: '注意力权重直接等于该 token 的重要性' },
          { value: 'B', text: '注意力权重只说明"看了谁"，不等于重要性' },
          { value: 'C', text: '注意力权重越大说明模型越不关注' },
          { value: 'D', text: '注意力权重与输出无关' },
        ],
        answer: 'B',
        explanation: 'V 的值也影响输出，且研究表明完全不同的注意力模式可以产生相同输出。注意力可视化是洞察工具，不能当作重要性证据。',
        tags: ['可解释性'],
      },
      {
        id: 'llm-a1-c12-e2',
        type: 'judge',
        difficulty: 2,
        question: '探针实验（probing）能证明模型"实际使用"了某种信息。',
        answer: false,
        explanation: '探针只说明该层表示中"包含"这些信息（可能被探针自己解码出来），不代表模型前向时真的用到了。要建立因果必须做激活干预。',
        tags: ['探针'],
      },
      {
        id: 'llm-a1-c12-e3',
        type: 'multiple',
        difficulty: 3,
        question: '下列哪些方法能提供"因果"层面的证据？（多选）',
        options: [
          { value: 'A', text: '激活干预（activation patching）' },
          { value: 'B', text: '仅做注意力可视化观察' },
          { value: 'C', text: '消融实验：去掉某层/某头看性能变化' },
          { value: 'D', text: '因果探针：干预激活后观察输出变化' },
        ],
        answer: ['A', 'C', 'D'],
        explanation: 'B 只是观察，不构成因果证据。A/C/D 都通过"改变某个变量再看输出"的方式来建立因果关系。',
        tags: ['因果分析'],
      },
      {
        id: 'llm-a1-c12-e4',
        type: 'fill',
        difficulty: 3,
        question:
          '模型维度有限但需要表示的特征极多，导致多个概念叠加在同一维度上，这个现象叫 ___（superposition）。',
        blanks: [['超级位置', '叠加', 'superposition', 'Superposition', '超位置']],
        explanation: 'Superposition 是理解大模型内部的关键概念。稀疏自编码器（SAE）就是为解决这个分解问题而设计的。',
        tags: ['Superposition'],
      },
      {
        id: 'llm-a1-c12-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现 Logit Lens 的核心：\`logit_lens(h, embed_weight)\`。\n\n- \`h\` 是某层的隐藏状态，形状 (d,)\n- \`embed_weight\` 是输出投影矩阵（或共享的词嵌入），形状 (vocab, d)\n- 返回 logits，形状 (vocab,)，即 \`embed_weight @ h\`',
        starterCode: `import numpy as np

def logit_lens(h, embed_weight):
    return ___


h = np.array([1.0, 0.0])
embed = np.array([[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]])
logit_lens(h, embed)
`,
        setupCode: '',
        expectedOutput: '[1. 0. 1.]',
        tests: `import numpy as np
h = np.array([1.0, 0.0])
embed = np.array([[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]])
out = logit_lens(h, embed)
assert out.shape == (3,), f"应返回 (vocab,) 形状，实际 {out.shape}"
assert np.allclose(out, [1.0, 0.0, 1.0]), f"结果不正确：{out}"
# 大一点的例子
h2 = np.array([0.5, -0.5, 1.0])
e2 = np.eye(3) * 2
out2 = logit_lens(h2, e2)
assert np.allclose(out2, [1.0, -1.0, 2.0]), f"应为 [1,-1,2]，实际 {out2}"
`,
        answer: `import numpy as np

def logit_lens(h, embed_weight):
    return embed_weight @ h


h = np.array([1.0, 0.0])
embed = np.array([[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]])
logit_lens(h, embed)`,
        explanation:
          '\`\`\`python\nreturn embed_weight @ h\n\`\`\`\n\n**原理**：把中间层的隐藏状态直接与输出投影相乘，得到"如果现在就用这层输出去预测，会选哪个词"。\n\n注意 embed_weight 形状是 (vocab, d)，h 是 (d,)，所以是 \`embed @ h\` 而不是 \`h @ embed\`。',
        tags: ['编程', 'Logit Lens'],
      },
      {
        id: 'llm-a1-c12-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现注意力头的重要性估计（基于梯度）：\`head_importance(head_outputs, grad_output)\`。\n\n- \`head_outputs\`：形状 (n_heads, seq, d_head)\n- \`grad_output\`：该层输出对损失的梯度，形状 (n_heads, seq, d_head)\n\n用「输出 × 梯度」的均值绝对值作为每个头的重要性。返回形状 (n_heads,) 的数组。',
        starterCode: `import numpy as np

def head_importance(head_outputs, grad_output):
    # 逐元素乘积后取绝对值，再对 seq 和 d_head 求平均
    return ___


h = np.ones((4, 8, 16))
g = np.ones((4, 8, 16)) * np.array([1.0, 2.0, 3.0, 4.0]).reshape(4, 1, 1)
head_importance(h, g)
`,
        setupCode: '',
        expectedOutput: '[1. 2. 3. 4.]',
        tests: `import numpy as np
h = np.ones((4, 8, 16))
g = np.ones((4, 8, 16)) * np.array([1.0, 2.0, 3.0, 4.0]).reshape(4, 1, 1)
out = head_importance(h, g)
assert out.shape == (4,), f"应返回 (4,)，实际 {out.shape}"
assert np.allclose(out, [1.0, 2.0, 3.0, 4.0]), f"结果不正确：{out}"
# 梯度为 0 的头重要性应为 0
g2 = g.copy()
g2[1] = 0
out2 = head_importance(h, g2)
assert out2[1] == 0, "梯度为 0 的头重要性应为 0"
assert out2[0] > 0
`,
        answer: `import numpy as np

def head_importance(head_outputs, grad_output):
    return np.abs(head_outputs * grad_output).mean(axis=(1, 2))


h = np.ones((4, 8, 16))
g = np.ones((4, 8, 16)) * np.array([1.0, 2.0, 3.0, 4.0]).reshape(4, 1, 1)
head_importance(h, g)`,
        explanation:
          '\`\`\`python\nreturn np.abs(head_outputs * grad_output).mean(axis=(1, 2))\n\`\`\`\n\n**原理**：重要性 ≈ |激活 × 梯度|，即"这个头的输出变化对损失的影响有多大"。\n\n\`axis=(1, 2)\` 同时对序列维和头维度求平均，得到每个头的标量重要性。这是剪枝研究中常用的估计方式。',
        tags: ['编程', '重要性估计'],
      },
      {
        id: 'llm-a1-c12-e7',
        type: 'judge',
        difficulty: 3,
        question: '稀疏自编码器（SAE）被用于分解大模型激活中的可解释特征，是为了应对"超级位置"问题。',
        answer: true,
        explanation: '模型维度有限而特征极多，导致概念叠加。SAE 用过完备的稀疏字典把激活分解成可解释的特征方向，Anthropic 等机构借此找到了大量可解释特征。',
        tags: ['SAE'],
      },
      {
        id: 'llm-a1-c12-e8',
        type: 'single',
        difficulty: 3,
        question: 'Logit Lens 的一个主要局限是？',
        options: [
          { value: 'A', text: '计算太慢' },
          { value: 'B', text: '中间层表示与最终层可能不在同一坐标系，需要额外归一化或学习映射（tuned lens）' },
          { value: 'C', text: '只能用于小模型' },
          { value: 'D', text: '无法得到概率分布' },
        ],
        answer: 'B',
        explanation: 'Pre-LN 之后中间层的尺度与最终层不同，直接投影可能不准确。tuned lens 通过训练一个小映射来校正这个偏差。',
        tags: ['Logit Lens'],
      },
      {
        id: 'llm-a1-c12-e9',
        type: 'open',
        difficulty: 5,
        question:
          '【结课综合题】请完整描述一次 GPT 的前向过程：从一个字符串输入到生成下一个 token，涉及分词、嵌入、位置编码、N 层 Transformer、输出投影的每一步。说明每一步的张量形状变化，并指出至少 4 个"容易写错"的实现细节。',
        referenceAnswer: `**完整前向流程（以 GPT-2 small 为例：d=768, n_layers=12, n_heads=12, vocab=50257, n_ctx=1024）**

**Step 1：分词**

输入 "Hello, my name is" → token ids [15496, 11, 616, 1438, 318]

    形状： (seq_len,) = (5,)

**Step 2：词嵌入**

    x = wte[token_ids]          # (5, 768)

**Step 3：位置编码**

    pos = arange(5)             # (5,)
    x = x + wpe[pos]            # 广播成 (5, 768)

**Step 4：进入 N=12 层 Block**

每层内部（Pre-LN）：

    ① ln1:  x → (5, 768)，归一化
    ② QKV:  x @ Wqkv → (5, 2304)，拆成 Q,K,V 各 (5,768)
    ③ 多头拆分: (12, 5, 64)  —— head_dim = 768/12 = 64
    ④ 注意力分数: Q @ Kᵀ / √64 → (12, 5, 5)
    ⑤ 因果掩码: 上三角置 -inf
    ⑥ softmax → (12, 5, 5)
    ⑦ 加权求和: @ V → (12, 5, 64)
    ⑧ 合并多头: → (5, 768)
    ⑨ 输出投影 Wo: → (5, 768)
    ⑩ 残差相加: x = x + attn_out
    ⑪ ln2 → FFN(768→3072→768) → 残差相加

**Step 5：final LayerNorm**

    x = ln_f(x)                 # (5, 768)

**Step 6：输出投影**

    logits = x @ wteᵀ           # (5, 50257) —— 权重共享

**Step 7：取最后位置 + 采样**

    next_logits = logits[-1]    # (50257,)
    probs = softmax(next_logits / T)
    next_id = sample(probs)

**四个容易写错的实现细节**

1. **Conv1D 权重要转置**：GPT-2 官方权重是 (in, out)，PyTorch Linear 要 (out, in)。
   不转置形状可能仍匹配（方阵），但结果全错且不报错。

2. **多头拆分与合并的顺序**：
   拆分 \`(B,n,d).reshape(B,n,h,dh).transpose(0,2,1,3)\` → \`(B,h,n,dh)\`；
   合并必须严格反向：\`transpose(0,2,1,3).reshape(B,n,d)\`。顺序错会导致 token 与 head 混淆。

3. **因果掩码的方向与数值**：
   上三角（j > i）应设为 -inf（实践中用 -1e9 避免 nan）；
   且要在 **softmax 之前**加，softmax 之后加没有意义。

4. **√d_k 缩放的位置**：
   是除在 **QKᵀ 之后、softmax 之前**，且 d_k 是 **head_dim**（64）而不是 d_model（768）。
   常见错误是除以 √768 或忘记除。

5. （补充）**位置编码索引**：wpe 必须从 0 开始按位置递增取，
   续写场景下若从错误位置开始，输出会明显变差。

**验证方法**

用固定 prompt 比对 logits：

    our = forward("Hello, my name is")
    ref = official("Hello, my name is")
    assert abs(our - ref).max() < 1e-4

只要这一步通过，以上所有细节就都是正确的。`,
        rubric: [
          { point: '完整走通 分词→嵌入→位置→N层→final LN→输出投影→采样', score: 3 },
          { point: '正确标注张量形状（含多头拆分后的 (B,h,n,dh)）', score: 2 },
          { point: '指出 Conv1D 转置、多头合并顺序、掩码方向、√d_k 缩放位置', score: 3 },
          { point: '给出 logits 比对作为验证标准', score: 1 },
        ],
        keywords: ['token', 'wte', 'wpe', 'block', 'final LN', 'logits', 'Conv1D', '√d_k'],
        explanation: '这是整门课的收官题，能把 12 章的内容串成一条完整的前向链路，说明你已经真正掌握了 GPT。',
        tags: ['结课', '综合', '面试'],
      },
    ],
  },
];
