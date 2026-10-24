import type { Chapter } from '../../types';

/* ============================================================
 *  人工智能基础 · 论文导读 · 基础与表征
 *  02 Understanding LSTM Networks
 *
 *  来源：
 *  - 原文：Christopher Olah, "Understanding LSTM Networks"（2015 博客）
 *  - 原始论文：Hochreiter & Schmidhuber (1997), Long Short-Term Memory
 *  - 参考：Ojhaharsh/30u30 第 02 篇（CC BY-NC-ND 4.0，本地个人使用）
 *  - 本课程为原创导读 + 原创习题
 *
 *  执行说明：纯 numpy，走 Pyodide 浏览器内执行。
 * ============================================================ */

export const paperFoundationChapters2: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c2: LSTM
   * ============================================================ */
  {
    id: 'paper-foundation-c2',
    title: 'LSTM：给 RNN 装上"记忆开关"',
    goal: '理解三个门控的作用与细胞状态的设计哲学，掌握 LSTM 为什么能解决梯度消失，能手写一个完整的 LSTM 单元。',
    lessons: [
      {
        id: 'paper-foundation-c2-l1',
        title: '门控、细胞状态与梯度高速公路',
        difficulty: 4,
        content: `
### 学习目标

学完本节，你应该能够：
1. 写出 LSTM 四步公式（三 f/i/o 门+细胞更新），说明 sigmoid 做门、tanh 做内容的分工；
2. 推导 ∂c_t/∂c_{t-1}=f_t 的梯度高速公路，对比 RNN 的 diag(tanh')·W_hh 连乘衰减；
3. 手写 numpy 版 LSTM 单元并跑 20 步，验证 f≈1 时细胞状态近似保持而 h 输出漂移，并计算 4H(H+V+1) 的参数账。

### 前置知识

- c1 的 BPTT 与梯度消失；
- sigmoid/tanh 的性质；
- 逐元素乘法（⊙）的求导。

### 问题背景

RNN 的梯度是「乘法链」，tanh'≤1 连乘 50 步只剩 1e-31——长程依赖学不到。LSTM 的回答是给梯度修一条加法高速公路：细胞状态 c_t=f_t⊙c_{t-1}+i_t⊙g_t，当遗忘门 f≈1 时梯度原样流过；三个 sigmoid 门（遗忘/输入/输出）让网络自己决定记什么、忘什么、说什么。1997 年提出、2015 年借 Olah 图解爆红、2017 年被 Transformer 取代——但门控与「梯度直通」思想活在每个现代架构里。

### 直觉理解

细胞状态是一条「传送带」：旧记忆放上带子（f⊙c），新信息经检查口写入（i⊙g），输出窗口只展示当前需要的部分（o⊙tanh(c)）。RNN 的记忆像每次都重新搅拌的面团（乘法），LSTM 的记忆像贴着封条的档案袋——不拆封就原样传下去，要更新才开封改写。

### 核心概念与原理详解

## 文献信息

| 项目 | 内容 |
| --- | --- |
| **导读文章** | Christopher Olah, *Understanding LSTM Networks*（2015） |
| **原始论文** | Hochreiter & Schmidhuber, *Long Short-Term Memory*（1997） |
| **一句话贡献** | 用门控 + 细胞状态让梯度能沿时间无损传播，解决了 RNN 的梯度消失 |

**为什么先读 Olah 的博客**：

原始论文（1997）数学密集、符号晦涩。
Olah 用图解把 LSTM 讲清楚了——**这是深度学习领域最著名的技术博客之一**。

## 回顾：RNN 的根本问题

第 1 篇讲到，RNN 的梯度是连乘的：

    ∂L/∂h_1 = ∂L/∂h_T · ∏ ∂h_t/∂h_{t-1}
    每步乘 diag(tanh'(z)) · W_hh

**tanh' 最大 1，通常 0.1~0.25**，50 步后梯度约 1e-31。

**LSTM 的核心思路**：

> 不要强迫梯度穿过 tanh 的"挤压"——
> 给它一条**加法**的通道，让梯度可以直接流过。

<RNNvsLSTMDemo />

## LSTM 的两个关键设计

### 设计一：细胞状态（Cell State）

**新增一条贯穿所有时间步的"传送带"**：

    c_t = f_t ⊙ c_{t-1} + i_t ⊙ g_t

**关键**：这是**加法**，不是乘法。

**为什么加法重要**：

| 操作 | 梯度 |
| --- | --- |
| **乘法**：\`h_t = W·h_{t-1}\` | \`∂h_t/∂h_{t-1} = W\`（连乘衰减） |
| **加法**：\`c_t = c_{t-1} + ...\` | \`∂c_t/∂c_{t-1} = 1\`（**梯度直通**） |

**这就是"梯度高速公路"**——梯度沿 c 传播时不被挤压。

### 设计二：三个门（Gates）

**门 = sigmoid 输出 [0,1] 的"阀门"**：

    gate = σ(W·[h_{t-1}, x_t] + b)

- 输出 0：完全关闭（什么都不让过）
- 输出 1：完全打开（全部通过）
- 中间值：部分通过

**为什么用 sigmoid 而非 ReLU**：
- sigmoid 输出在 (0,1)，天然适合做"开关"
- ReLU 无上界，不能做比例控制

## 逐步拆解 LSTM

<LSTMCellDemo />

### ① 遗忘门：决定丢弃什么

    f_t = σ(W_f · [h_{t-1}, x_t] + b_f)

**作用**：对细胞状态的每个维度，决定保留多少旧信息。

**直觉**：
- 读到新主语时，忘掉旧主语的性别
- 读到段落结束时，清空当前主题

**关键性质**：\`f_t ≈ 1\` 时，旧信息**完全保留**，梯度无损流过。

### ② 输入门：决定写入什么

**两部分**：

    i_t = σ(W_i · [h_{t-1}, x_t] + b_i)      # 哪些位置要更新
    g_t = tanh(W_g · [h_{t-1}, x_t] + b_g)   # 更新成什么值

**为什么分两步**：
- \`i_t\`（sigmoid）控制"要不要写"
- \`g_t\`（tanh）提供"写什么内容"（值域 -1~1）

**类比**：\`i_t\` 是"是否编辑"的开关，\`g_t\` 是"新内容"。

### ③ 更新细胞状态

    c_t = f_t ⊙ c_{t-1} + i_t ⊙ g_t

**这是 LSTM 的核心公式。**

- \`f_t ⊙ c_{t-1}\`：保留的旧记忆
- \`i_t ⊙ g_t\`：写入的新信息

### ④ 输出门：决定输出什么

    o_t = σ(W_o · [h_{t-1}, x_t] + b_o)
    h_t = o_t ⊙ tanh(c_t)

**注意**：
- \`c_t\` 是**内部状态**（不直接输出）
- \`h_t\` 是**输出**（同时传给下一步和上层）

**为什么分开**：细胞状态可以保留长期信息，
但当前输出只需要其中一部分。

## 参数数量计算

**单个 LSTM 单元**有 4 组权重（f/i/g/o 各一组）：

| 参数 | 形状 | 数量 |
| --- | --- | --- |
| W_f, W_i, W_g, W_o | (H, H+V) 各一个 | 4H(H+V) |
| b_f, b_i, b_g, b_o | (H,) 各一个 | 4H |
| **合计** | | **4H(H+V+1)** |

**对比普通 RNN**：

| 模型 | 参数量 |
| --- | --- |
| RNN | H(H+V+1) |
| **LSTM** | **4H(H+V+1)** |

**LSTM 参数是 RNN 的 4 倍**——这是"用参数换表达能力"。

<ParamCompareDemo />

## 为什么 LSTM 能解决梯度消失

**关键路径**：梯度沿细胞状态传播。

    ∂c_t/∂c_{t-1} = f_t + (其他项，涉及 W 的偏导)

**主要项是 f_t**（遗忘门）。

**如果 f_t ≈ 1**：

    ∂c_T/∂c_1 ≈ ∏ f_t ≈ 1^T = 1

**梯度不衰减！**

**对比 RNN**：

    ∂h_t/∂h_{t-1} = diag(tanh') · W_hh ≈ 0.25 · W

**这就是本质区别**：

| | RNN | LSTM |
| --- | --- | --- |
| 梯度路径 | 乘 tanh'（≤1） | 乘 f_t（可≈1） |
| 50 步后 | ~1e-31 | ~1（若 f≈1） |
| 能学的依赖长度 | ~10 步 | **100+ 步** |

**注意**：f_t 是**学习出来的**。
模型自己决定"什么时候该记住、什么时候该忘记"。

## LSTM 的变体

### ① GRU（Gated Recurrent Unit）

**简化版 LSTM**，只有两个门：

    z_t = σ(W_z · [h_{t-1}, x_t])      # 更新门
    r_t = σ(W_r · [h_{t-1}, x_t])      # 重置门

    h̃_t = tanh(W · [r_t ⊙ h_{t-1}, x_t])
    h_t = (1 - z_t) ⊙ h_{t-1} + z_t ⊙ h̃_t

**简化点**：
- 合并细胞状态和隐藏状态（只有 h，没有 c）
- 合并遗忘门和输入门（用 1-z 和 z）

**参数**：3H(H+V+1)（比 LSTM 少 25%）

**效果**：多数任务上与 LSTM 相当，训练更快。

### ② Peephole 连接

**做法**：让门能看到细胞状态。

    f_t = σ(W_f · [c_{t-1}, h_{t-1}, x_t] + b_f)

**效果**：略有提升，但增加参数。实际用得不多。

### ③ 耦合输入遗忘门（CIFG）

**做法**：强制 \`i_t = 1 - f_t\`。

**理由**：如果忘了旧信息，就该写入新信息；反之亦然。

**效果**：减少参数，性能相近。

## LSTM 的历史地位

| 时期 | 事件 |
| --- | --- |
| 1997 | LSTM 提出（Hochreiter & Schmidhuber） |
| 2013 | Alex Graves 用 LSTM 做手写识别（端到端） |
| 2014 | seq2seq + LSTM 做机器翻译 |
| 2015 | Olah 的博客让 LSTM 广为人知 |
| 2015-2017 | LSTM 统治 NLP（Google Translate、语音识别） |
| **2017** | **Transformer 出现，逐步取代 LSTM** |
| 2019+ | 大模型时代，LSTM 退居二线 |

**为什么 LSTM 被取代**：

| 问题 | 说明 |
| --- | --- |
| **无法并行** | 时间步必须串行（第 t 步依赖第 t-1 步） |
| **长距离仍有限** | 虽然比 RNN 好，但 1000+ 步仍困难 |
| **参数效率低** | 4 组权重，比 Transformer 的注意力重 |

**但 LSTM 的思想没有过时**：

- **门控机制** → 被 GRU、Transformer 的 FFN 借鉴
- **细胞状态** → 启发了后来的状态空间模型（Mamba）
- **"让梯度有直通路径"** → 残差连接（ResNet）也是同一思想

## 一个常被忽略的细节

**LSTM 的"长期记忆"其实是有限的。**

虽然理论上 f_t 可以一直等于 1，
但实际训练中：

- f_t 很少恰好等于 1
- 多个 0.99 连乘 1000 次 → 0.99^1000 ≈ 4e-5

**所以 LSTM 的实际有效记忆约 100~500 步**，
而不是理论上的无限。

**这也是 Transformer 出现的原因**——
注意力机制让任意两位置的路径长度都是 1，彻底解决这个问题。

## 本节来源

> **来源类型：原始文献（博客导读）**
> - Olah, C. *Understanding LSTM Networks*（2015）
>   https://colah.github.io/posts/2015-08-Understanding-LSTMs/
>   **说明**：技术博客，非同行评审，但已成为 LSTM 的标准入门材料
>
> **来源类型：学术来源（原始论文）**
> - Hochreiter, S. & Schmidhuber, J. *Long Short-Term Memory*（1997）
>   Neural Computation, 9(8), 1735-1780
> - Cho, K. et al. *Learning Phrase Representations using RNN Encoder-Decoder*（2014，GRU）
>   arXiv:1406.1078
>
> **来源类型：参考资料（CC BY-NC-ND 4.0，本地个人使用）**
> - Ojhaharsh/30u30 第 02 篇（LSTM 完整实现，468 行）
>
> **来源类型：原创**
> - 全部导读文字、交互图示、代码示例与习题

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
rng = np.random.default_rng(17)
H, Z = 3, 5                      # Z = H + V (V=2)
def lstm_cell(x, h, c, Wf, Wi, Wg, Wo, bf):
    z = np.concatenate([h, x])
    f = 1/(1+np.exp(-(Wf@z + bf))); i = 1/(1+np.exp(-(Wi@z))); o = 1/(1+np.exp(-(Wo@z)))
    c = f * c + i * np.tanh(Wg @ z)
    return o * np.tanh(c), c
Wf, Wi, Wg, Wo = (rng.normal(0, .3, (H, Z)) for _ in range(4))
bf = np.full(H, 4.0)             # 遗忘门偏置大 -> f≈1
h, c = np.zeros(H), np.array([2.0, -1.0, 0.5])
for t in range(20):
    h, c = lstm_cell(rng.normal(0, 1, 2), h, c, Wf, Wi, Wg, Wo, bf)
print("t=0 记忆 [2.0, -1.0, 0.5] -> t=20:", np.round(c, 3), "(0.98^20≈%.2f)" % 0.98**20)
print("h 输出已随输入漂移:", np.round(h, 3))\`\`\`

预期输出（实测）：实测：遗忘门偏置 bf=4（f≈0.98）时，t=0 写入的记忆在 t=20 仍有强分量（主分量 2.0→1.31，与 0.98^20≈0.67 的衰减一致），其余分量被输入门的写入轻微改写；而 h 输出已随 20 步随机输入漂移——「长期记忆在 c、短期表达在 h」的分工直接可见。

**常见错误**：遗忘门偏置初始化为 0，训练初期 f≈0.5 记忆迅速衰减（常见建议偏置 1~5）；把 c 直接当 h 输出给上层——要过输出门和 tanh；以为 GRU 严格优于 LSTM——参数省 25% 但表达力取舍任务相关。

### 常见误区

1. **LSTM 的记忆无限长**——f 实际很少恰为 1，0.99^1000≈4e-5，有效记忆约 100~500 步；
2. **门=激活函数**——门是 [0,1] 的乘性阀门（sigmoid），不是非线性变换；
3. **被取代=思想过时**——门控进 GRU/SSM，加法直通进 ResNet，细胞状态启发 Mamba。

### 知识关联

- **向前**：c1 的梯度消失是本节的问题陈述；
- **向后**：paper-vision c2 的残差连接是同一「加法直通」思想，paper-reasoning c4 给记忆槽加交互；
- **平行**：GRU/CIFG/peephole 变体谱系。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 核心式 | c_t=f_t⊙c_{t-1}+i_t⊙g_t；h_t=o_t⊙tanh(c_t) |
| 三门 | 遗忘(留什么)/输入(写什么)/输出(说什么) |
| 高速公路 | ∂c_t/∂c_{t-1}=f_t，f≈1 时梯度无损 |
| 参数 | 4H(H+V+1)，RNN 的 4 倍 |
| 实测 | f≈0.98：20 步后主记忆保留约 2/3 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见原文：Olah, Understanding LSTM Networks（2015 博客）；Hochreiter & Schmidhuber, Long Short-Term Memory, 1997）
`,
        tips: [
          {
            kind: 'interview',
            text: '「LSTM 为什么能解决梯度消失」：细胞状态用加法更新 c_t = f_t⊙c_{t-1} + i_t⊙g_t，梯度沿 c 传播时 ∂c_t/∂c_{t-1} = f_t，若 f≈1 则梯度无损。而 RNN 是乘法，每步乘 tanh\'≤1。',
          },
          {
            kind: 'leak',
            text: '「三个门的分工」：遗忘门决定丢弃什么、输入门决定写入什么、输出门决定输出什么。门用 sigmoid 是因为输出 (0,1) 适合做"比例开关"。',
          },
          {
            kind: 'pitfall',
            text: 'LSTM 的"长期记忆"实际有限：f_t 很少恰好等于 1，0.99^1000 ≈ 4e-5。有效记忆约 100~500 步，不是理论上的无限。',
          },
        ],
        demos: [
          {
            title: 'LSTM 单元完整实现（纯 numpy）',
            lang: 'python',
            code: `import numpy as np

def sigmoid(x):
    return 1 / (1 + np.exp(-np.clip(x, -500, 500)))

class LSTMCell:
    """单个 LSTM 单元。"""
    def __init__(self, input_size, hidden_size):
        self.H = hidden_size
        self.V = input_size
        # 4 组门权重：f, i, g, o
        scale = 1.0 / np.sqrt(hidden_size)
        self.Wf = np.random.randn(hidden_size, hidden_size + input_size) * scale
        self.Wi = np.random.randn(hidden_size, hidden_size + input_size) * scale
        self.Wg = np.random.randn(hidden_size, hidden_size + input_size) * scale
        self.Wo = np.random.randn(hidden_size, hidden_size + input_size) * scale
        self.bf = np.zeros((hidden_size, 1))
        self.bi = np.zeros((hidden_size, 1))
        self.bg = np.zeros((hidden_size, 1))
        self.bo = np.zeros((hidden_size, 1))

    def forward(self, x, h_prev, c_prev):
        """前向传播，返回 (h, c, cache)。"""
        # 拼接 [h_prev; x]
        concat = np.vstack([h_prev, x])

        # ① 遗忘门：决定丢弃多少旧记忆
        f = sigmoid(self.Wf @ concat + self.bf)

        # ② 输入门：决定写入什么
        i = sigmoid(self.Wi @ concat + self.bi)
        g = np.tanh(self.Wg @ concat + self.bg)

        # ③ 更新细胞状态（关键：加法！）
        c = f * c_prev + i * g

        # ④ 输出门：决定输出什么
        o = sigmoid(self.Wo @ concat + self.bo)
        h = o * np.tanh(c)

        cache = (x, h_prev, c_prev, f, i, g, o, c, concat)
        return h, c, cache


np.random.seed(42)
H, V = 4, 3
cell = LSTMCell(V, H)

print("=== LSTM 单元前向传播 ===")
x = np.random.randn(V, 1)
h_prev = np.zeros((H, 1))
c_prev = np.zeros((H, 1))

h, c, cache = cell.forward(x, h_prev, c_prev)
print(f"输入 x:      {x.ravel()}")
print(f"h_prev:      {h_prev.ravel()}")
print(f"c_prev:      {c_prev.ravel()}")
print()
f, i, g, o = cache[3], cache[4], cache[5], cache[6]
print("=== 三个门的值（都在 0~1）===")
print(f"遗忘门 f:    {np.round(f.ravel(), 3)}  <- 保留多少旧记忆")
print(f"输入门 i:    {np.round(i.ravel(), 3)}  <- 写入多少新信息")
print(f"候选值 g:    {np.round(g.ravel(), 3)}  <- 新信息内容（-1~1）")
print(f"输出门 o:    {np.round(o.ravel(), 3)}  <- 输出多少")
print()
print(f"新细胞状态 c: {np.round(c.ravel(), 3)}")
print(f"新隐藏状态 h: {np.round(h.ravel(), 3)}")
print()
print("=== 验证公式 ===")
c_check = f * c_prev + i * g
h_check = o * np.tanh(c)
print(f"c = f*c_prev + i*g:  {np.allclose(c, c_check)}")
print(f"h = o*tanh(c):       {np.allclose(h, h_check)}")
print()
print("=== 关键：细胞状态的加法路径 ===")
print("c_t = f_t * c_{t-1} + i_t * g_t")
print("梯度: ∂c_t/∂c_{t-1} = f_t")
print("若 f_t ≈ 1 -> 梯度无损传播（这是 LSTM 解决梯度消失的核心）")`,
          },
          {
            title: 'RNN vs LSTM：梯度传播对比',
            lang: 'python',
            code: `import numpy as np
import matplotlib.pyplot as plt

print("=== 梯度沿时间传播的对比 ===")
print()
print("RNN:  ∂h_t/∂h_{t-1} = diag(tanh') · W_hh")
print("      tanh' 最大 1，通常 0.1~0.25")
print()
print("LSTM: ∂c_t/∂c_{t-1} = f_t （遗忘门）")
print("      f_t 可以接近 1")
print()

steps = np.arange(1, 201)

# RNN: 每步衰减
rnn_grad = 0.25 ** steps

# LSTM: 遗忘门不同取值
lstm_099 = 0.99 ** steps
lstm_095 = 0.95 ** steps
lstm_09 = 0.90 ** steps

print(f"{'步数':>6} | {'RNN(0.25)':>12} | {'LSTM(0.99)':>12} | {'LSTM(0.95)':>12} | {'LSTM(0.90)':>12}")
print("-" * 72)
for t in [1, 10, 50, 100, 200]:
    print(f"{t:>6} | {0.25**t:>12.2e} | {0.99**t:>12.2e} | {0.95**t:>12.2e} | {0.90**t:>12.2e}")

print()
print("关键观察：")
print("  · RNN 在 10 步后就衰减到 1e-6，完全无法学长距离")
print("  · LSTM 在 f=0.99 时，200 步后仍有 0.13")
print("  · 但即使 LSTM，f=0.90 时 200 步后也只有 7e-10")
print("  -> 这就是为什么 LSTM 的有效记忆约 100~500 步，不是无限")

# 可视化
fig, ax = plt.subplots(figsize=(9, 5))
ax.semilogy(steps, rnn_grad, label='RNN (tanh\'~0.25)', linewidth=2, color='#ef4444')
ax.semilogy(steps, lstm_09, label='LSTM (f=0.90)', linewidth=2, color='#f59e0b')
ax.semilogy(steps, lstm_095, label='LSTM (f=0.95)', linewidth=2, color='#0891b2')
ax.semilogy(steps, lstm_099, label='LSTM (f=0.99)', linewidth=2, color='#22c55e')
ax.axhline(1e-6, color='gray', linestyle='--', alpha=0.5, label='vanishing threshold')
ax.set_xlabel('Time steps')
ax.set_ylabel('Gradient magnitude (log scale)')
ax.set_title('Gradient flow: RNN vs LSTM')
ax.legend(loc='lower left')
ax.grid(alpha=0.3)
plt.tight_layout()
plt.savefig('lstm_gradient.png', dpi=80, bbox_inches='tight')
print()
print("已生成图表 lstm_gradient.png")`,
          },
          {
            title: 'LSTM 参数数量计算',
            lang: 'python',
            code: `def rnn_params(vocab, hidden):
    """RNN: Wxh + Whh + bh + Why + by"""
    Wxh = hidden * vocab
    Whh = hidden * hidden
    bh = hidden
    Why = vocab * hidden
    by = vocab
    return Wxh + Whh + bh + Why + by

def lstm_params(vocab, hidden):
    """LSTM: 4 组门（f/i/g/o）"""
    # 每组: W (hidden × (hidden+vocab)) + b (hidden)
    per_gate = hidden * (hidden + vocab) + hidden
    gates = 4 * per_gate
    # 输出层
    output = vocab * hidden + vocab
    return gates + output

print("=== 参数量对比 ===")
print()
print(f"{'配置':>22} | {'RNN':>12} | {'LSTM':>12} | {'倍数':>6}")
print("-" * 62)

for vocab, hidden in [(50, 128), (1000, 256), (10000, 512), (50000, 1024)]:
    r = rnn_params(vocab, hidden)
    l = lstm_params(vocab, hidden)
    print(f"V={vocab:>6}, H={hidden:>4} | {r:>12,} | {l:>12,} | {l/r:>5.1f}x")

print()
print("=== 为什么 LSTM 参数是 RNN 的约 4 倍 ===")
print()
print("RNN 每个时间步：")
print("  h = tanh(Wxh·x + Whh·h + bh)")
print("  -> 1 组输入权重 + 1 组循环权重")
print()
print("LSTM 每个时间步：")
print("  f = σ(Wf·[h,x] + bf)   <- 遗忘门")
print("  i = σ(Wi·[h,x] + bi)   <- 输入门")
print("  g = tanh(Wg·[h,x] + bg) <- 候选值")
print("  o = σ(Wo·[h,x] + bo)   <- 输出门")
print("  -> 4 组权重（每组都是 hidden × (hidden+vocab)）")
print()
print("所以 LSTM 参数量 ≈ 4 × RNN")
print("这是「用参数换表达能力」的典型例子。")

print()
print("=== 与 Transformer 对比（同规模）===")
# Transformer encoder layer: 4*d^2 (attention) + 8*d^2 (FFN) = 12*d^2
def transformer_params(d_model, n_layers):
    per_layer = 12 * d_model * d_model
    return per_layer * n_layers

d = 512
print(f"Transformer (d=512, 6 layers): {transformer_params(d, 6):,}")
print(f"LSTM (V=10000, H=512):         {lstm_params(10000, 512):,}")
print()
print("Transformer 参数更多，但可以并行训练（这是它取代 LSTM 的关键）。")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'paper-foundation-c2-e1',
        type: 'single',
        difficulty: 2,
        question: 'LSTM 解决梯度消失的核心机制是？',
        options: [
          { value: 'A', text: '用了更少的参数' },
          { value: 'B', text: '细胞状态用加法更新，梯度沿 c 传播时乘以遗忘门 f_t（可接近 1）' },
          { value: 'C', text: '用了 ReLU 激活函数' },
          { value: 'D', text: '增加了层数' },
        ],
        answer: 'B',
        explanation:
          'RNN 是乘法（每步乘 tanh\'≤1），梯度指数衰减。LSTM 的 c_t = f_t⊙c_{t-1} + i_t⊙g_t 是加法，∂c_t/∂c_{t-1} = f_t。f_t≈1 时梯度无损——这就是"梯度高速公路"。',
        tags: ['核心机制'],
      },
      {
        id: 'paper-foundation-c2-e2',
        type: 'judge',
        difficulty: 2,
        question: 'LSTM 的三个门（遗忘/输入/输出）都用 sigmoid 激活，因为输出在 (0,1) 适合做"比例开关"。',
        answer: true,
        explanation:
          'sigmoid 输出 (0,1)，0=完全关闭、1=完全打开、中间=部分通过。ReLU 无上界，不能做比例控制。注意候选值 g 用 tanh（值域 -1~1），因为它是"内容"不是"开关"。',
        tags: ['门控设计'],
      },
      {
        id: 'paper-foundation-c2-e3',
        type: 'multiple',
        difficulty: 3,
        question: 'LSTM 相比普通 RNN 的改进包括？（多选）',
        options: [
          { value: 'A', text: '增加细胞状态，提供梯度的"直通路径"' },
          { value: 'B', text: '用门控机制自适应决定记住/忘记什么' },
          { value: 'C', text: '参数数量约为 RNN 的 4 倍' },
          { value: 'D', text: '可以完全并行训练' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误——LSTM 仍然是串行的（第 t 步依赖第 t-1 步），这正是它被 Transformer 取代的原因。A/B/C 是 LSTM 的核心改进。',
        tags: ['LSTM 改进'],
      },
      {
        id: 'paper-foundation-c2-e4',
        type: 'fill',
        difficulty: 3,
        question:
          'LSTM 的核心更新公式是 c_t = f_t ⊙ c_{t-1} + i_t ⊙ ___，其中 g_t 是候选新信息。',
        blanks: [['g_t', 'gt', 'g']],
        explanation:
          'c_t = f_t ⊙ c_{t-1} + i_t ⊙ g_t。f_t 决定保留多少旧记忆，i_t 决定写入多少新信息，g_t 是新信息的内容（tanh 输出，-1~1）。',
        tags: ['核心公式'],
      },
      {
        id: 'paper-foundation-c2-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现 sigmoid 与 tanh 激活：\n\n- sigmoid(x): 1/(1+e^-x)，需防溢出（clip 到 ±500）\n- tanh_act(x): tanh(x)',
        starterCode: `import numpy as np

def sigmoid(x):
    return ___

def tanh_act(x):
    return ___
`,
        setupCode: '',
        expectedOutput: '激活函数',
        tests: `import numpy as np
# sigmoid 基本性质
assert abs(sigmoid(np.array([0.0]))[0] - 0.5) < 1e-9
assert sigmoid(np.array([10.0]))[0] > 0.999
assert sigmoid(np.array([-10.0]))[0] < 0.001
# 输出在 (0,1)
x = np.linspace(-5, 5, 20)
s = sigmoid(x)
assert np.all(s > 0) and np.all(s < 1)
# 极大值不溢出
assert not np.isnan(sigmoid(np.array([1000.0]))).any()
# tanh
assert abs(tanh_act(np.array([0.0]))[0]) < 1e-9
assert tanh_act(np.array([10.0]))[0] > 0.999
assert tanh_act(np.array([-10.0]))[0] < -0.999
`,
        answer: `import numpy as np

def sigmoid(x):
    return 1 / (1 + np.exp(-np.clip(x, -500, 500)))

def tanh_act(x):
    return np.tanh(x)
`,
        explanation:
          '**`np.clip(x, -500, 500)` 防溢出**：`exp(1000)` 会溢出为 inf，`1/(1+inf)=0` 虽然数学上对，但会产生警告。clip 后结果不变但更干净。\n\n**sigmoid 用于门**：输出 (0,1)，适合做"比例开关"。\n\n**tanh 用于候选值**：输出 (-1,1)，能表示"正/负向更新"。\n\n**为什么不用 ReLU 做门**：ReLU 无上界，无法表示"完全关闭"和"完全打开"之间的比例。',
        tags: ['编程', '激活函数'],
      },
      {
        id: 'paper-foundation-c2-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现 LSTM 单步前向：lstm_step(x, h_prev, c_prev, Wf, Wi, Wg, Wo, bf, bi, bg, bo)。\n\n返回 (h, c)。\n\n公式：\nconcat = [h_prev; x]\nf = σ(Wf@concat + bf)\ni = σ(Wi@concat + bi)\ng = tanh(Wg@concat + bg)\nc = f*c_prev + i*g\no = σ(Wo@concat + bo)\nh = o*tanh(c)',
        starterCode: `import numpy as np

def sigmoid(x):
    return 1 / (1 + np.exp(-np.clip(x, -500, 500)))

def lstm_step(x, h_prev, c_prev, Wf, Wi, Wg, Wo, bf, bi, bg, bo):
    concat = np.vstack([h_prev, x])
    f = ___
    i = ___
    g = ___
    c = ___
    o = ___
    h = ___
    return h, c
`,
        setupCode: '',
        expectedOutput: 'LSTM 单步',
        tests: `import numpy as np
np.random.seed(0)
H, V = 3, 4
x = np.random.randn(V, 1)
h_prev = np.random.randn(H, 1) * 0.1
c_prev = np.random.randn(H, 1) * 0.1
Wf = np.random.randn(H, H+V) * 0.3
Wi = np.random.randn(H, H+V) * 0.3
Wg = np.random.randn(H, H+V) * 0.3
Wo = np.random.randn(H, H+V) * 0.3
bf = np.zeros((H,1)); bi = np.zeros((H,1)); bg = np.zeros((H,1)); bo = np.zeros((H,1))

h, c = lstm_step(x, h_prev, c_prev, Wf, Wi, Wg, Wo, bf, bi, bg, bo)
assert h.shape == (H,1) and c.shape == (H,1)

# 验证公式
concat = np.vstack([h_prev, x])
f = 1/(1+np.exp(-(Wf@concat+bf)))
i = 1/(1+np.exp(-(Wi@concat+bi)))
g = np.tanh(Wg@concat+bg)
c_exp = f*c_prev + i*g
o = 1/(1+np.exp(-(Wo@concat+bo)))
h_exp = o*np.tanh(c_exp)
assert np.allclose(c, c_exp), "细胞状态计算错误"
assert np.allclose(h, h_exp), "隐藏状态计算错误"

# c 应受 c_prev 影响（当 f 不接近 0 时）
assert not np.allclose(c, 0)
`,
        answer: `import numpy as np

def sigmoid(x):
    return 1 / (1 + np.exp(-np.clip(x, -500, 500)))

def lstm_step(x, h_prev, c_prev, Wf, Wi, Wg, Wo, bf, bi, bg, bo):
    concat = np.vstack([h_prev, x])
    f = sigmoid(Wf @ concat + bf)
    i = sigmoid(Wi @ concat + bi)
    g = np.tanh(Wg @ concat + bg)
    c = f * c_prev + i * g
    o = sigmoid(Wo @ concat + bo)
    h = o * np.tanh(c)
    return h, c
`,
        explanation:
          '**`np.vstack([h_prev, x])`** 把 (H,1) 和 (V,1) 拼成 ((H+V),1)，这样四组门可以共用同一个拼接向量。\n\n**关键顺序**：\n1. 先算 f（遗忘门）\n2. 再算 i 和 g（输入门和候选值）\n3. 更新 c（**加法**，梯度直通）\n4. 最后算 o 和 h（输出门）\n\n**注意 `c = f*c_prev + i*g` 是逐元素乘（`*` 不是 `@`）**——门是向量，对每个维度独立控制。',
        tags: ['编程', 'LSTM 前向'],
      },
      {
        id: 'paper-foundation-c2-e7',
        type: 'code',
        difficulty: 3,
        question:
          '计算 LSTM 参数量：count_lstm_params(vocab_size, hidden_size, output_size=None)。\n\n- 4 组门，每组 W: hidden × (hidden + vocab)，b: hidden\n- 输出层：output_size × hidden + output_size（output_size 默认 = vocab_size）',
        starterCode: `def count_lstm_params(vocab_size, hidden_size, output_size=None):
    output_size = output_size or vocab_size
    per_gate = ___
    gates = ___
    output = ___
    return gates + output
`,
        setupCode: '',
        expectedOutput: '参数量',
        tests: `# V=10, H=4, 输出=V
n = count_lstm_params(10, 4)
# 每组: 4*(4+10) + 4 = 60; 4组 = 240; 输出: 10*4+10 = 50
assert n == 240 + 50, f"应为 290，实际 {n}"

# 自定义输出维度
n2 = count_lstm_params(10, 4, output_size=3)
assert n2 == 240 + (3*4 + 3), f"应为 255，实际 {n2}"

# 更大规模
n3 = count_lstm_params(1000, 128)
expected = 4 * (128*(128+1000) + 128) + (1000*128 + 1000)
assert n3 == expected, f"应为 {expected}，实际 {n3}"
`,
        answer: `def count_lstm_params(vocab_size, hidden_size, output_size=None):
    output_size = output_size or vocab_size
    per_gate = hidden_size * (hidden_size + vocab_size) + hidden_size
    gates = 4 * per_gate
    output = output_size * hidden_size + output_size
    return gates + output
`,
        explanation:
          '**每组门的权重**：`hidden × (hidden + vocab)`——因为输入是 `[h_prev; x]` 拼接，长度 `hidden + vocab`。\n\n**4 组门**：f / i / g / o，所以乘 4。\n\n**对比 RNN**：RNN 只有 1 组（`hidden × (hidden+vocab)`），所以 LSTM 参数约是 RNN 的 4 倍。\n\n**实践意义**：这解释了为什么 LSTM 训练慢、显存占用大——参数多 4 倍意味着计算量和内存都增加。',
        tags: ['编程', '参数量'],
      },
      {
        id: 'paper-foundation-c2-e8',
        type: 'code',
        difficulty: 4,
        question:
          '实现 LSTM 的梯度直通演示：simulate_gradient_flow(n_steps, forget_gate, rnn_decay=0.25)。\n\n返回 (rnn_grads, lstm_grads)，各为长度 n_steps 的列表。\n\n- RNN: grad = rnn_decay^t\n- LSTM: grad = forget_gate^t',
        starterCode: `def simulate_gradient_flow(n_steps, forget_gate=0.99, rnn_decay=0.25):
    rnn_grads = []
    lstm_grads = []
    for t in range(1, n_steps + 1):
        ___
    return rnn_grads, lstm_grads
`,
        setupCode: '',
        expectedOutput: '梯度流动',
        tests: `rnn, lstm = simulate_gradient_flow(10, 0.99, 0.25)
assert len(rnn) == 10 and len(lstm) == 10
assert abs(rnn[0] - 0.25) < 1e-9
assert abs(rnn[9] - 0.25**10) < 1e-12
assert abs(lstm[0] - 0.99) < 1e-9
assert abs(lstm[9] - 0.99**10) < 1e-12
# LSTM 衰减慢得多
assert lstm[9] > rnn[9] * 1000

# f=1 时完全不衰减
_, lstm1 = simulate_gradient_flow(100, 1.0)
assert abs(lstm1[99] - 1.0) < 1e-9, "f=1 应无衰减"

# f=0.9 时衰减明显
_, lstm09 = simulate_gradient_flow(100, 0.9)
assert lstm09[99] < 1e-4, f"0.9^100 应很小，实际 {lstm09[99]}"
`,
        answer: `def simulate_gradient_flow(n_steps, forget_gate=0.99, rnn_decay=0.25):
    rnn_grads = []
    lstm_grads = []
    for t in range(1, n_steps + 1):
        rnn_grads.append(rnn_decay ** t)
        lstm_grads.append(forget_gate ** t)
    return rnn_grads, lstm_grads
`,
        explanation:
          '**这个函数直观展示了 LSTM 的核心优势**：\n\n- RNN 每步乘 0.25 → 10 步后 1e-6\n- LSTM 每步乘 f_t → f=0.99 时 10 步后 0.90\n\n**但要注意**：\n- f=1.0 时完全不衰减（理论最优）\n- f=0.9 时 100 步后只有 2.7e-5（**仍会消失**）\n\n**所以 LSTM 不是"完全解决"梯度消失，而是"大幅缓解"**——\n它把有效记忆从 ~10 步提升到 ~100~500 步。',
        tags: ['编程', '梯度流动'],
      },
      {
        id: 'paper-foundation-c2-e9',
        type: 'judge',
        difficulty: 4,
        question: 'LSTM 的"长期记忆"是无限的，因为遗忘门 f_t 可以一直等于 1。',
        answer: false,
        explanation:
          '理论上 f_t 可以等于 1，但实际训练中很少恰好等于 1。多个 0.99 连乘 1000 次 → 0.99^1000 ≈ 4e-5。所以 LSTM 的实际有效记忆约 100~500 步，不是无限。',
        tags: ['记忆长度'],
      },
      {
        id: 'paper-foundation-c2-e10',
        type: 'open',
        difficulty: 4,
        question:
          '请解释：① LSTM 为什么能解决梯度消失（数学机制）；② 三个门各自的作用与为什么用 sigmoid；③ LSTM 与 GRU 的区别；④ 为什么 Transformer 最终取代了 LSTM。',
        referenceAnswer: `**① 为什么能解决梯度消失**

**核心：细胞状态的加法路径。**

**RNN 的梯度**：

    h_t = tanh(W·h_{t-1} + ...)
    ∂h_t/∂h_{t-1} = diag(tanh'(z)) · W_hh

每步乘 \`tanh'\`（≤1，通常 0.1~0.25）。
50 步后：\`0.25^50 ≈ 8e-31\` → 消失。

**LSTM 的梯度**：

    c_t = f_t ⊙ c_{t-1} + i_t ⊙ g_t
    ∂c_t/∂c_{t-1} = f_t + (涉及 W 的项)

**主要项是 f_t**（遗忘门）。

**如果 f_t ≈ 1**：

    ∂c_T/∂c_1 ≈ ∏ f_t ≈ 1

**梯度无损传播**——这就是"梯度高速公路"。

**关键对比**：

| | RNN | LSTM |
| --- | --- | --- |
| 更新方式 | 乘法 | **加法** |
| 梯度乘数 | tanh' ≤ 1 | f_t 可 ≈ 1 |
| 50 步后 | ~1e-31 | ~1 |

**但要注意**：f_t 是**学习出来的**，不是固定的。
模型自己决定"什么时候该记住"。

---

**② 三个门的作用**

**遗忘门 f_t**：

    f_t = σ(W_f · [h_{t-1}, x_t] + b_f)

**作用**：决定细胞状态中哪些旧信息要丢弃。

**例子**：读到新主语时，忘掉旧主语的性别信息。

**输入门 i_t**：

    i_t = σ(W_i · [h_{t-1}, x_t] + b_i)
    g_t = tanh(W_g · [h_{t-1}, x_t] + b_g)

**作用**：\`i_t\` 决定哪些位置要更新，\`g_t\` 提供新内容。

**为什么要两部分**：
- \`i_t\`（sigmoid）是"是否编辑"的开关
- \`g_t\`（tanh）是"新内容"（值域 -1~1）

**输出门 o_t**：

    o_t = σ(W_o · [h_{t-1}, x_t] + b_o)
    h_t = o_t ⊙ tanh(c_t)

**作用**：决定细胞状态中哪些部分要输出到 h_t。

**为什么要分开 c 和 h**：
- c 保留全部长期记忆
- h 只输出当前需要的部分

---

**③ 为什么用 sigmoid 做门**

**sigmoid 的性质**：

    σ(x) = 1/(1+e^{-x}) ∈ (0, 1)

**适合做"比例开关"**：
- 0 = 完全关闭（不让任何信息通过）
- 1 = 完全打开（全部通过）
- 0.5 = 一半

**为什么不用 ReLU**：
- ReLU 无上界，无法表示"完全打开"的饱和状态
- ReLU 在负区输出 0，会导致"门永久关闭"（类似神经元死亡）

**为什么 g_t 用 tanh**：

\`g_t\` 不是"开关"而是"内容"。
tanh 输出 (-1, 1)，能表示"正向更新"和"负向更新"。
如果用 sigmoid（0~1），只能正向更新，表达力受限。

---

**④ LSTM vs GRU**

| 维度 | LSTM | GRU |
| --- | --- | --- |
| 门数量 | 3（遗忘/输入/输出） | 2（更新/重置） |
| 状态 | h 和 c（两个） | 只有 h（合并了） |
| 参数 | 4H(H+V+1) | 3H(H+V+1)（少 25%） |
| 训练速度 | 较慢 | **较快** |
| 效果 | 略好（长序列） | 相当（多数任务） |

**GRU 的核心简化**：

    z_t = σ(W_z · [h_{t-1}, x_t])      # 更新门
    r_t = σ(W_r · [h_{t-1}, x_t])      # 重置门
    h̃_t = tanh(W · [r_t ⊙ h_{t-1}, x_t])
    h_t = (1 - z_t) ⊙ h_{t-1} + z_t ⊙ h̃_t

**关键**：用 \`1-z\` 和 \`z\` 替代了 LSTM 的遗忘门和输入门（耦合）。

**选择建议**：
- 数据少 / 要快 → GRU
- 长序列 / 需要精细控制 → LSTM
- 实践中差异通常 < 2%

---

**⑤ 为什么 Transformer 取代了 LSTM**

**LSTM 的三个根本问题**：

**a) 无法并行**

    h_1 → h_2 → h_3 → ... → h_T

第 t 步必须等第 t-1 步算完。
**GPU 的上万个核只能用 1 个**——训练效率极低。

Transformer 的自注意力让所有位置**同时计算**，训练速度提升 10 倍以上。

**b) 长距离仍有极限**

虽然比 RNN 好，但：

    0.99^1000 ≈ 4e-5

1000 步的依赖仍然学不到。实际有效记忆约 100~500 步。

Transformer 中**任意两位置距离都是 1**，彻底解决。

**c) 参数效率低**

LSTM 每层 4 组权重，而 Transformer 的注意力机制更"通用"——
同一套参数能处理任意长度的依赖。

**替代过程**：

| 年份 | 事件 |
| --- | --- |
| 2014 | Attention 机制提出（Bahdanau，用于 seq2seq） |
| 2017 | Transformer：**只用注意力**，抛弃循环 |
| 2018 | BERT / GPT 基于 Transformer |
| 2019+ | LSTM 退居二线（仅用于流式/边缘场景） |

**但 LSTM 的思想没有消失**：

- **门控机制** → 被各种架构借鉴（如 Mamba 的选择性状态）
- **梯度直通路径** → 残差连接（ResNet）是同一思想
- **状态维护** → 状态空间模型（S4/Mamba）重新拾起

**技术会过时，思想不会。**`,
        rubric: [
          { point: '数学机制：加法 vs 乘法，∂c_t/∂c_{t-1} = f_t ≈ 1', score: 3 },
          { point: '三门作用 + sigmoid 适合做比例开关 + g 用 tanh 的原因', score: 2 },
          { point: 'LSTM vs GRU：门数/状态数/参数量/适用场景', score: 2 },
          { point: 'Transformer 取代原因：无法并行、长距离极限、参数效率', score: 2 },
          { point: '指出 LSTM 思想被继承（门控、梯度直通、状态维护）', score: 1 },
        ],
        keywords: ['加法路径', 'f_t ≈ 1', '比例开关', '耦合门', '无法并行', '思想继承'],
        explanation:
          '能说清「加法 vs 乘法是根本区别」以及「LSTM 被取代是因为无法并行而非效果差」，就是理解了架构演进的技术逻辑。',
        tags: ['综合分析'],
      },
    ],
  },
];
