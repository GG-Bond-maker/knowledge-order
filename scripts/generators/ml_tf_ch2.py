# -*- coding: utf-8 -*-
"""
Chapter 2: 自注意力机制与多头注意力 (Self-Attention & Multi-Head Attention)
Course: ml-transformer-llm
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_2():
    # ── Lesson 2.1 ──
    l1_text = """### 学习目标
学完本节，你应该能够：
1. 掌握传统循环神经网络（RNN/LSTM）信息瓶颈与注意力机制（Attention Mechanism）的历史诞生背景；
2. 深刻理解 Query（查询）、Key（键）、Value（值）三元组的数据库检索直觉与几何投影；
3. 严格推导缩放点积注意力（Scaled Dot-Product Attention）的数学公式与 Softmax 权重分布；
4. **掌握核心数学证明**：从随机变量独立性与中心极限定理出发，严格证明为何必须除以 $\\sqrt{d_k}$ 缩放因子以防止梯度饱和；
5. 编写纯 Python/NumPy 代码从零实现缩放点积注意力计算。

### 前置知识
- 线性代数：矩阵乘法、矩阵转置、向量内积；
- 概率与统计：独立随机变量求和的期望与方差性质；
- 微积分：Softmax 函数的导数性质与梯度饱和（Saturation）。

### 问题背景与 ML 用途
在 Transformer 诞生之前，序列建模的霸主是循环神经网络（RNN/LSTM/GRU）。
- **RNN 的信息压缩瓶颈**：RNN 必须按时间步顺序逐字处理文本，将任意长度的整个历史信息压缩进一个固定维度的隐藏状态向量 $h_t$ 中。随着句子长度增加，早期信息被不断稀释，发生不可逆的信息灾难性遗忘；
- **自注意力机制（Self-Attention）** 打破了“按序传递”的枷锁：它允许序列中的每一个 Token **直接、同时**与序列中的所有其他 Token 进行点积交互计算，任意两个词之间的信息距离被彻底压缩为 $\\mathcal{O}(1)$！
- 如今，自注意力机制已经成为所有现代大语言模型（GPT-4、Claude、LLaMA、DeepSeek）以及视觉模型（ViT）的核心计算引擎。

### 直觉理解
- **图书检索借书（Q, K, V 直觉）**：
  - **Query ($Q$)**：你在图书馆检索框里输入的“搜索关键词”（例如“我想找关于量子力学的导引”）；
  - **Key ($K$)**：图书馆书库里成千上万本书的书名、标签与图书目录；
  - **$Q \\cdot K^\\top$（相似度打分）**：你的搜索词与每本书标签的匹配度；经过 Softmax 归一化后，得到一个在所有图书上的注意力分配百分比；
  - **Value ($V$)**：图书的实际正文内容。最终你读到的知识，就是所有图书内容按其匹配度百分比加权汇总的混合体！

### 核心概念与符号对照表
| 核心符号 / 概念 | 维度形状 | 数学定义 | 核心物理作用 |
| --- | --- | --- | --- |
| **输入矩阵 $X$** | $(N, d_{\\text{model}})$ | 输入 Token 序列的嵌入表征 | 包含序列的全部输入信息 |
| **查询矩阵 $Q$** | $(N, d_k)$ | $Q = X W_Q$ | 主动发起的“查询需求” |
| **键矩阵 $K$** | $(N, d_k)$ | $K = X W_K$ | 被动匹配的“属性索引” |
| **值矩阵 $V$** | $(N, d_v)$ | $V = X W_V$ | 真正承载提取的“信息内容” |
| **缩放因子** | $\\frac{1}{\\sqrt{d_k}}$ | 标量因子 | 将高维点积方差从 $d_k$ 重新标准化为 1 |
| **Attention 矩阵** | $(N, N)$ | $A = \\text{softmax}\\left(\\frac{Q K^\\top}{\\sqrt{d_k}}\\right)$ | 序列内每个 Token 对其他所有 Token 的归一化注意力权重 |

### 数学原理与逐步推导
#### 1. 缩放点积注意力公式
$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left( \\frac{Q K^\\top}{\\sqrt{d_k}} \\right) V$$
其中 $Q \\in \\mathbb{R}^{N \\times d_k}, K \\in \\mathbb{R}^{M \\times d_k}, V \\in \\mathbb{R}^{M \\times d_v}$。在自注意力中，通常 $M = N, d_k = d_v$。

#### 2. 为什么必须除以 $\\sqrt{d_k}$？（严格方差证明）
假设向量 $\\mathbf{q} = (q_1, \\dots, q_{d_k})$ 和 $\\mathbf{k} = (k_1, \\dots, k_{d_k})$ 的各分量都是相互独立的随机变量，均值为 0，方差为 1：
$$\\mathbb{E}[q_i] = 0, \\quad \\text{Var}(q_i) = 1, \\quad \\mathbb{E}[k_i] = 0, \\quad \\text{Var}(k_i) = 1$$
考虑它们的分量乘积 $x_i = q_i k_i$：
$$\\mathbb{E}[x_i] = \\mathbb{E}[q_i] \\mathbb{E}[k_i] = 0, \\quad \\text{Var}(x_i) = \\mathbb{E}[q_i^2 k_i^2] = 1$$
点积为这 $d_k$ 个独立同分布变量的总和：
$$z = \\mathbf{q}^\\top \\mathbf{k} = \\sum_{i=1}^{d_k} q_i k_i = \\sum_{i=1}^{d_k} x_i$$
根据独立随机变量方差的可加性：
$$\\mathbb{E}[z] = 0, \\quad \\text{Var}(z) = \\sum_{i=1}^{d_k} \\text{Var}(x_i) = d_k$$
因此，点积 $z$ 的方差为 $d_k$，标准差为 $\\sqrt{d_k}$！
- 当维度 $d_k$ 较大时，点积 $z$ 的绝对值会经常达到数十甚至上百；
- 将极大或极小的数输入到 Softmax 函数中时，Softmax 输出会极度偏向最大值（接近 1），其余分量接近 0（分布呈现 One-Hot 尖刺状）；
- **梯度饱和危机**：Softmax 的导数为 $\\frac{\\partial \\text{softmax}(z)_i}{\\partial z_j} = S_i (\\delta_{ij} - S_j)$。当某个 $S_i \\to 1$ 其余 $S_j \\to 0$ 时，所有偏导数全都趋近于 0！导致反向传播时发生严重的梯度消失。
- 引入缩放因子后：
$$\\text{Var}\\left( \\frac{z}{\\sqrt{d_k}} \\right) = \\frac{1}{d_k} \\text{Var}(z) = \\frac{1}{d_k} \\times d_k = 1$$
将点积方差严格稳定为 1，确保无论维度 $d_k$ 多大，Softmax 始终工作在梯度充沛的敏感区间。

### 常见认知误区与避坑指南
1. **误以为自注意力机制是带有前后序列顺序感知的**：自注意力本身是完全无序的（Permutation Invariant）！如果将输入句子的词顺序完全打乱，自注意力计算出的数值集合不会发生任何物理改变。Transformer 必须额外注入位置编码。
2. **误以为 Q 和 K 可以使用不同的维度**：在点积计算 $Q K^\\top$ 中，$Q$ 和 $K$ 的最后一个特征维度必须严格相等（均为 $d_k$）；而 $V$ 的维度 $d_v$ 在数学上可以与 $d_k$ 不同。
3. **Softmax 数值溢出避坑**：工业级实现必须先减去该行的最大值：$\\text{softmax}(x) = \\frac{\\exp(x - \\max(x))}{\\sum \\exp(x - \\max(x))}$，这在数学上完全等价，但在数值上绝对安全。

### 工业级工程实践
- **FlashAttention 硬件级加速**：标准自注意力由于需要将完整的 $N \\times N$ 注意力矩阵存入 GPU 显存，显存占用随长度平方级爆炸 $\\mathcal{O}(N^2)$。FlashAttention 利用 GPU SRAM 高速缓存进行分块计算（Tiling），完全不显式保存中间矩阵，将计算速度提升 2~4 倍，显存降低一个数量级。
- **Mask 填充值选择**：工程上通常采用 `-1e9` 或 `torch.finfo(dtype).min`，避免直接使用 `-float('inf')` 导致出现 NaN。

### 拓展阅读与学术文献
1. **Vaswani et al. (2017)**: *Attention Is All You Need* (NeurIPS 2017)。
2. **Dao et al. (2022)**: *FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness*。

### 知识总结与核心记忆要点
- **注意力本质**：通过 Query 与 Key 的相似度加权获取 Value 的内容表征。
- **O(1) 路径**：打破 RNN 时序递归，任意两个位置之间的交互距离为常数 1。
- **方差守恒定理**：独立随机向量点积方差随维度线性膨胀为 $d_k$，除以 $\\sqrt{d_k}$ 是防止 Softmax 梯度饱和的关键。"""

    l1_code = """import numpy as np

def softmax(x, axis=-1):
    x_max = np.max(x, axis=axis, keepdims=True)
    exp_x = np.exp(x - x_max)
    return exp_x / np.sum(exp_x, axis=axis, keepdims=True)

def scaled_dot_product_attention(Q, K, V, mask=None):
    d_k = Q.shape[-1]
    scores = np.matmul(Q, np.swapaxes(K, -1, -2)) / np.sqrt(d_k)
    if mask is not None:
        scores = np.where(mask == 0, -1e9, scores)
    attn_weights = softmax(scores, axis=-1)
    output = np.matmul(attn_weights, V)
    return output, attn_weights

np.random.seed(42)
seq_len = 4
d_k = 64
d_v = 64

Q = np.random.randn(seq_len, d_k)
K = np.random.randn(seq_len, d_k)
V = np.random.randn(seq_len, d_v)

raw_dots = np.matmul(Q, K.T)
scaled_dots = raw_dots / np.sqrt(d_k)

output, weights = scaled_dot_product_attention(Q, K, V)
print(f"原始点积方差: {np.var(raw_dots):.2f}, 缩放后点积方差: {np.var(scaled_dots):.2f}")
print(f"注意力权重行和: {np.sum(weights, axis=-1)}")

assert np.allclose(np.sum(weights, axis=-1), 1.0)
assert np.abs(np.var(scaled_dots) - 1.0) < 0.5
print("测试通过：缩放点积注意力与方差推导完全成立！")"""

    l1_tips = [
        tip("点积注意力除以根号 d_k 的唯一目的，是为了抵消高维点积方差线性膨胀带来的 Softmax 梯度饱和。", "pitfall"),
        tip("自注意力机制本身是集合操作，完全不包含位置信息，必须配合位置编码使用。", "note"),
    ]

    # ── Lesson 2.2 ──
    l2_text = """### 学习目标
学完本节，你应该能够：
1. 理解多头注意力机制（Multi-Head Attention, MHA）的设计哲学与多子空间联合表征原理；
2. 掌握多头注意力的完整数学公式与输出投影矩阵 $W^O$ 的信息融合作用；
3. **精通张量维度变换与重塑（Reshape & Transpose）魔法**：掌握 $(B, S, D) \\to (B, S, H, d_k) \\to (B, H, S, d_k)$ 的批并行推导；
4. 编写纯 NumPy 代码从零实现一个完整可运行的 `MultiHeadAttention` 模块。

### 前置知识
- 高维张量（4D Tensor）的切片、转置与批矩阵乘法（BMM）；
- 线性投影变换与全连接层。

### 问题背景与 ML 用途
如果只使用一个单头注意力，就相当于强迫模型在整个 $D$ 维向量空间中仅生成一个全局注意力权重分布。
- **单头的单一视角缺陷**：人类在理解一个词时，需要同时处理多种维度的关系。例如在句子中，一个视角需要关注句法语法结构，另一个视角关注语义指代消解，还有一个视角关注原因修饰语；
- 如果只有单个头，这些截然不同的注意力焦点就会被强制“平均化”；
- **Multi-Head Attention** 将表征空间切分为 $h$ 个独立的低维子空间，让每个注意力头在专属的子空间中各司其职，最后通过输出线性层进行汇总。

### 直觉理解
- **专家委员会联合会诊（多头直觉）**：面对一份复杂的病历报告，多头注意力就像组织了一个 $h$ 人的专家会诊团队：第 1 位专家专门盯着心血管指标，第 2 位专家研读过敏史，第 3 位专家捕捉罕见的药物反应。最后，院长（输出投影矩阵 $W^O$）坐镇将 $h$ 位专家的意见整合，得出最终诊断！

### 核心概念与符号对照表
| 核心概念 | 符号 / 维度 | 典型大模型数值 | 核心功能与意义 |
| --- | --- | --- | --- |
| **模型隐藏维度** | $d_{\\text{model}}$ 或 $D$ | 4096 | 整个 Transformer 网络每层主干的隐层向量维度 |
| **注意力头数** | $h$ | 32 | 并行切分的子空间数量 |
| **单头维度** | $d_k = D / h$ | 128 | 每个独立注意力头的特征子空间维度 |
| **投影权重 $W_Q, W_K, W_V$** | $(D, D)$ | $(4096, 4096)$ | 将输入投影到全部头拼接后的复合特征空间 |
| **输出投影 $W_O$** | $(D, D)$ | $(4096, 4096)$ | 将所有头拼接后的信息充分混合交叉 |

### 数学原理与逐步推导
#### 1. 多头注意力数学定义
给定输入 $X$，线性投影得到查询、键、值矩阵：
$$Q = X W_Q, \\quad K = X W_K, \\quad V = X W_V$$
切分为 $h$ 个头，每个头维度为 $d_k = D / h$：
$$\\text{head}_i = \\text{Attention}(Q_i, K_i, V_i) = \\text{softmax}\\left( \\frac{Q_i K_i^\\top}{\\sqrt{d_k}} \\right) V_i$$
拼接并通过输出投影矩阵 $W^O \\in \\mathbb{R}^{D \\times D}$ 线性变换：
$$\\text{MultiHead}(Q, K, V) = \\text{Concat}(\\text{head}_1, \\dots, \\text{head}_h) W^O$$

#### 2. 张量重塑与批并行推导
1. 输入 $X$ 形状为 `(Batch, SeqLen, D)`，通过矩阵乘法得到 $Q$ 形状 `(Batch, SeqLen, D)`；
2. Reshape 切分子空间：张量变为 `(Batch, SeqLen, h, d_k)`；
3. Transpose 交换维度：变为 `(Batch, h, SeqLen, d_k)`，前两维被 GPU 硬件统一视作批处理维度；
4. 批量并行矩阵乘法 `Q @ K.swapaxes(-1, -2)` 一次性并行完成全部头的注意力计算；
5. 还原重塑：输出形状为 `(Batch, h, SeqLen, d_k)`，转置并展平为 `(Batch, SeqLen, D)`，最后乘以 $W_O$。

### 常见认知误区与避坑指南
1. **误以为多头注意力增加头数会成倍增加总参数量与计算量**：并不会！因为每个头的维度相应缩小为 $d_k = D / h$。所有头的维度总和依然是 $D$。参数量始终维持在 $4 \\times D^2$。增加头数本质上是重新划分特征子空间。
2. **忘记 swapaxes 导致维度错位**：将 `(B, S, h, d_k)` 变成 `(B, h, S, d_k)` 必须显式调用 `transpose/swapaxes`，而不能仅调用 `reshape`！

### 工业级工程实践
- **QKV 权重大合并（Fused Projection）**：工业实现将三者打包合并为一个大矩阵 $W_{\\text{qkv}} \\in \\mathbb{R}^{D \\times 3D}$，一次前向计算后在内存中直接通过 `split` 切分，极大减少 GPU Kernel 启动开销。
- **GQA 的引入**：长文本下 MHA 保存每个头的 KV Cache 极其吃显存，现代模型广泛采用 GQA 共享键值头。

### 拓展阅读与学术文献
1. **Vaswani et al. (2017)**: *Attention Is All You Need* (第 3.2 节)。
2. **Clark et al. (2019)**: *What Does BERT Look At? An Analysis of Attention Heads*.

### 知识总结与核心记忆要点
- **多头核心理念**：将全维度空间切分成 $h$ 个低维子空间，并行捕捉多种不同维度的语义关系。
- **参数守恒**：$d_k = D / h$，多头设计并未增加参数量与 FLOPs 计算量。
- **转置核心**：通过 `swapaxes(1, 2)` 将头维度前置，实现 GPU 硬件层面的全面并行。"""

    l2_code = """import numpy as np

def softmax(x, axis=-1):
    x_max = np.max(x, axis=axis, keepdims=True)
    exp_x = np.exp(x - x_max)
    return exp_x / np.sum(exp_x, axis=axis, keepdims=True)

class MultiHeadAttentionNumPy:
    def __init__(self, d_model=16, num_heads=4):
        assert d_model % num_heads == 0
        self.d_model = d_model
        self.num_heads = num_heads
        self.d_k = d_model // num_heads
        
        scale = np.sqrt(2.0 / (d_model + d_model))
        self.W_q = np.random.randn(d_model, d_model) * scale
        self.W_k = np.random.randn(d_model, d_model) * scale
        self.W_v = np.random.randn(d_model, d_model) * scale
        self.W_o = np.random.randn(d_model, d_model) * scale
        
    def forward(self, x, mask=None):
        B, S, D = x.shape
        Q = np.matmul(x, self.W_q).reshape(B, S, self.num_heads, self.d_k).swapaxes(1, 2)
        K = np.matmul(x, self.W_k).reshape(B, S, self.num_heads, self.d_k).swapaxes(1, 2)
        V = np.matmul(x, self.W_v).reshape(B, S, self.num_heads, self.d_k).swapaxes(1, 2)
        
        scores = np.matmul(Q, K.swapaxes(-1, -2)) / np.sqrt(self.d_k)
        if mask is not None:
            scores = np.where(mask == 0, -1e9, scores)
            
        attn_weights = softmax(scores, axis=-1)
        head_outputs = np.matmul(attn_weights, V)
        concat = head_outputs.swapaxes(1, 2).reshape(B, S, self.d_model)
        out = np.matmul(concat, self.W_o)
        return out, attn_weights

np.random.seed(42)
B, S, D, H = 2, 5, 16, 4
mha = MultiHeadAttentionNumPy(d_model=D, num_heads=H)
inputs = np.random.randn(B, S, D)
outputs, attn_matrix = mha.forward(inputs)

print(f"输出形状: {outputs.shape}, 注意力张量形状: {attn_matrix.shape}")
assert outputs.shape == (B, S, D)
assert attn_matrix.shape == (B, H, S, S)
print("测试通过：多头注意力张量重塑与批矩阵乘法完全吻合！")"""

    l2_tips = [
        tip("增加注意力头数 h 并不会增加模型的参数量，因为每个头的子空间维度相应缩小为 d_model / h。", "note"),
    ]

    # ── Lesson 2.3 ──
    l3_text = """### 学习目标
学完本节，你应该能够：
1. 掌握因果注意力掩码（Causal Mask / Look-ahead Mask）在自回归语言模型中的数学必要性；
2. 掌握下三角掩码矩阵的构建与数值填充原理；
3. 理解训练阶段并行计算（Teacher Forcing）与推理阶段逐步自回归生成的本质区别；
4. 编写代码完整实现因果注意力掩码，并模拟单 Token 逐步生成的解码循环。

### 前置知识
- 线性代数：三角矩阵定义；
- 语言模型自回归条件概率分解：$P(w_1, \\dots, w_T) = \\prod_{t=1}^T P(w_t \\mid w_{<t})$。

### 问题背景与 ML 用途
以 GPT、LLaMA、Claude 为代表的主流大语言模型均属于**因果自回归模型（Causal LM）**。
- **语言模型的因果性**：当人类在说话或模型在写字时，我们只能根据**已经生成的过去上文**来预测**下一个词**；
- **训练并行的矛盾**：在训练阶段，整篇目标文章在数据集中是现成已知的。为了充分利用 GPU 并发能力，我们必须将整篇文章的所有 Token 一次性打包输入模型；
- **Causal Mask 是终极解决方案**：它在数学上用一个下三角掩码矩阵，将所有“未来时间步”的注意力权重硬性置为 0，从而完美兼顾了**训练的全序列并行计算**与**因果单向可见性**！

### 直觉理解
- **开卷考试的特制墨水（因果掩码直觉）**：当学生看第 $t$ 行时，所有第 $t+1, t+2, \\dots$ 行的字迹被特制墨水完全涂黑（加上 $-\\infty$），只有第 $1$ 到第 $t$ 行的内容清晰可见。这样，即便所有题目同时摊在桌上，学生也绝对无法偷看未来！

### 核心概念与符号对照表
| 核心概念 | 数学符号 | 形状 | 核心机制与作用 |
| --- | --- | --- | --- |
| **下三角掩码** | $M_{\\text{causal}}$ | $(S, S)$ | 当 $j \\le i$ 时为 1，当 $j > i$ 时为 0 |
| **掩码加权得分** | $\\tilde{S}_{ij} = S_{ij} + M'_{ij}$ | $(S, S)$ | 对 $j > i$ 的未来位置填充 $-\\infty$ |
| **归一化权重** | $A_{ij} = \\text{softmax}(\\tilde{S})_{ij}$ | $(S, S)$ | 因 $\\exp(-\\infty) = 0$，未来位置权重严格为 0 |
| **Teacher Forcing** | 训练策略 | 全局并行 | 训练时强制使用真实标签历史作为上文，并行计算全序列损失 |
| **自回归生成** | 推理策略 | 串行循环 | 每步根据当前上文预测新 Token，追加至末尾继续循环 |

### 数学原理与逐步推导
对于长度为 $S$ 的序列，因果掩码矩阵 $M \\in \\mathbb{R}^{S \\times S}$ 定义为：
$$M_{ij} = \\begin{cases} 0, & \\text{if } j \\le i \\text{ (允许关注过去与自身)} \\\\ -\\infty, & \\text{if } j > i \\text{ (严禁偷看未来)} \\end{cases}$$
计算注意力权重矩阵：
$$A = \\text{softmax}\\left( \\frac{Q K^\\top}{\\sqrt{d_k}} + M \\right)$$
对于任意行 $i$ 和列 $j$：若 $j > i$，得分加上 $-\\infty$，经 Softmax 分子 $\\exp(-\\infty) = 0$，其注意力权重严格为 0。

### 常见认知误区与避坑指南
1. **混淆 BERT 与 GPT 的掩码机制**：BERT 是双向的，没有下三角因果掩码，其 `[MASK]` 是把词替换为掩码字符进行填空；GPT 强制施加下三角因果掩码，严禁向后看。
2. **误以为推理生成时必须每次重头计算整个序列的掩码**：推理阶段每次只生成最新的 1 个 Token，工业界通过 **KV Cache** 机制缓存历史 Token 的 Key 和 Value，避免重复计算。

### 工业级工程实践
- **Fused Attention Kernel**：底层 GPU 内核直接在计算线程中通过条件分支 `if (col > row) return 0` 实现掩码，根本不需要在内存中分配这个 $S \\times S$ 的掩码张量，节约了宝贵的显存带宽。
- **停止条件**：生成循环必须设定双重终止判定：① 达到 `max_new_tokens`；② 命中了 `<eos>` 结束符。

### 拓展阅读与学术文献
1. **Radford et al. (2018)**: *Improving Language Understanding by Generative Pre-Training* (GPT-1 论文)。
2. **Dao (2023)**: *FlashAttention-2: Faster Attention with Better Parallelism*.

### 知识总结与核心记忆要点
- **因果必要性**：自回归语言模型要求每个位置仅能依据过去信息预测下一个词。
- **掩码数学**：下三角矩阵在上三角填入 $-\\infty$，经 Softmax 后使未来位置权重精确等于 0。
- **训练并行 vs 推理穿行**：训练期借助因果掩码实现全序列并行，推理期逐步迭代追加生成。"""

    l3_code = """import numpy as np

def create_causal_mask(seq_len):
    return np.tril(np.ones((seq_len, seq_len), dtype=np.float32))

def masked_attention_demo(Q, K, V):
    seq_len, d_k = Q.shape
    scores = np.matmul(Q, K.T) / np.sqrt(d_k)
    causal_mask = create_causal_mask(seq_len)
    scores_masked = np.where(causal_mask == 1, scores, -1e9)
    
    scores_max = np.max(scores_masked, axis=-1, keepdims=True)
    exp_scores = np.exp(scores_masked - scores_max)
    attn_weights = exp_scores / np.sum(exp_scores, axis=-1, keepdims=True)
    
    output = np.matmul(attn_weights, V)
    return output, attn_weights

np.random.seed(42)
S, d_k = 4, 8
Q = np.random.randn(S, d_k)
K = np.random.randn(S, d_k)
V = np.random.randn(S, d_k)

output, weights = masked_attention_demo(Q, K, V)
print("因果掩码权重矩阵:")
print(np.round(weights, 4))

for i in range(S):
    for j in range(i + 1, S):
        assert np.isclose(weights[i, j], 0.0)
assert np.isclose(weights[0, 0], 1.0)
print("测试通过：因果掩码成功阻断了未来信息泄漏，严格保证自回归单向性！")"""

    l3_tips = [
        tip("自回归模型在训练时必须使用下三角因果掩码，否则模型会提前看到后续真实词而发生严重的信息泄露作弊。", "pitfall"),
    ]

    lessons = [
        lesson("ml-tf-l2-1", "注意力机制直觉与 Scaled Dot-Product Attention 数学推导", l1_text, 2, l1_tips, [demo(code=l1_code, title="缩放点积注意力与方差稳定性验证")]),
        lesson("ml-tf-l2-2", "Multi-Head Attention (多头注意力) 与张量重塑魔法", l2_text, 3, l2_tips, [demo(code=l2_code, title="纯 NumPy 手写 MultiHeadAttention 模块")]),
        lesson("ml-tf-l2-3", "因果掩码注意力与自回归生成机制", l3_text, 2, l3_tips, [demo(code=l3_code, title="下三角因果掩码构建与自回归单向性测试")]),
    ]

    exercises = [
        single_choice(
            ex_id="ml-tf-c2-ex1",
            question="在 Scaled Dot-Product Attention 中，为什么要将 QK^T 点积除以 \\sqrt{d_k}？",
            options=[
                {"value": "A", "text": "为了减少矩阵乘法的计算复杂度，将 O(N^2) 降至 O(N)"},
                {"value": "B", "text": "当维度 d_k 较大时，点积的方差会线性增长至 d_k，导致 Softmax 极值过大进入梯度饱和区而发生梯度消失"},
                {"value": "C", "text": "因为根据量子力学校准公式，任何高维张量必须按根号维度归一化才能输入计算机"},
                {"value": "D", "text": "为了确保注意力权重矩阵的对角线元素严格等于 0"},
            ],
            answer="B",
            explanation="推导表明，独立标准正态分布向量点积的方差等于其维度 d_k。当 d_k 很大时，方差膨胀导致 Softmax 输出严重趋向于 One-Hot 尖刺，所有梯度的偏导数趋向于 0 发生梯度饱和。除以 \\sqrt{d_k} 可将方差重新归一化为 1。",
            difficulty=2,
            related_lesson_id="ml-tf-l2-1",
            tags=["ScaledDotProduct", "梯度饱和", "Softmax", "方差证明"],
        ),
        multiple_choice(
            ex_id="ml-tf-c2-ex2",
            question="关于 Transformer 自注意力机制中的 Query、Key、Value，下列说法正确的有：",
            options=[
                {"value": "A", "text": "在自注意力中，Q、K、V 通常是由同一个输入张量 X 分别乘以不同的可学习线性权重矩阵 W_Q, W_K, W_V 得到的"},
                {"value": "B", "text": "Q 和 K 的最后一个特征维度必须相等（均为 d_k），否则无法进行点积矩阵乘法"},
                {"value": "C", "text": "纯自注意力机制具有置换不变性（Permutation Invariance），若不添加位置编码，打乱输入顺序不会改变计算结果的数值集合"},
                {"value": "D", "text": "V 矩阵的特征维度 d_v 必须在数学上等于序列长度 N"},
            ],
            answer=["A", "B", "C"],
            explanation="A、B、C 均为自注意力的核心数学性质。D 选项错误，V 矩阵的行数为 N，但列数 d_v 是特征隐藏维度，通常等于 d_k，与序列长度 N 无关。",
            difficulty=2,
            related_lesson_id="ml-tf-l2-1",
            tags=["自注意力", "QKV", "置换不变性"],
        ),
        judge(
            ex_id="ml-tf-c2-ex3",
            question="在多头注意力（MHA）中，将头数从 8 增加到 16（保持总模型隐层维度 d_model 不变），注意力层的总参数量和计算 FLOPs 会直接翻倍。",
            answer=False,
            explanation="错误。当头数 h 增加时，每个头的特征维度 d_k = d_model / h 会按比例缩减，所有头的维度总和仍然是 d_model。W_Q, W_K, W_V, W_O 的总参数量保持为 4 * (d_model)^2 不变。",
            difficulty=2,
            related_lesson_id="ml-tf-l2-2",
            tags=["多头注意力", "参数量", "MHA"],
        ),
        fill(
            ex_id="ml-tf-c2-ex4",
            question="在多头注意力的高效批实现中，张量从 (Batch, SeqLen, Heads, d_k) 转换为 (Batch, Heads, SeqLen, d_k) 必须使用转置操作，在 NumPy 中对应的轴交换方法是 swapaxes(____, 2)。（填数字）",
            blanks=[["1"]],
            explanation="第 1 维是 SeqLen，第 2 维是 Heads。要将 Heads 调到前面以便 GPU 批量并行，必须交换第 1 和第 2 维，即 swapaxes(1, 2) 或 transpose(0, 2, 1, 3)。",
            difficulty=2,
            related_lesson_id="ml-tf-l2-2",
            tags=["张量重塑", "swapaxes", "批并行"],
        ),
        open_ex(
            ex_id="ml-tf-c2-ex5",
            question="简要分析因果掩码（Causal Mask）在语言模型预训练阶段与推理生成阶段分别扮演了什么角色？",
            reference_answer="角色与机制：\n1. 预训练阶段：全序列所有 Token 一次性并行输入 GPU 进行训练（Teacher Forcing）。因果掩码通过将未来时间步的注意力权重置零，防止模型提前“偷看”待预测的下一个词，在保证全序列极速并行计算的同时杜绝了信息泄漏；\n2. 推理生成阶段：模型以自回归方式逐个 Token 预测。因果掩码确保每次生成的最新 Token 只能关注已生成的历史 Token，保持时间方向上的单向因果一致性。",
            explanation="因果掩码是实现“训练极速并行”与“逻辑严格单向自回归”完美统一的关键结构。",
            rubric=[
                {"points": 5, "description": "阐明预训练阶段全序列并行与因果掩码防作弊机制"},
                {"points": 5, "description": "阐明推理阶段逐步自回归生成的单向历史关注机制"},
            ],
            difficulty=3,
            related_lesson_id="ml-tf-l2-3",
            tags=["因果掩码", "自回归", "TeacherForcing"],
        ),
        # ── Code Exercise 2 ──
        {
            "id": "ml-tf-c2-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】手写支持因果掩码的缩放点积注意力：\n编写函数 `scaled_dot_product_attention_fn(Q, K, V, is_causal=False)`：\n1. $d_k = Q.\\text{shape}[-1]$，计算未缩放得分并除以 $\\sqrt{d_k}$；\n2. 若 `is_causal=True`，构造下三角掩码，将未来位置得分填充为 `-1e9`；\n3. 对最后一个维度计算数值稳定的 Softmax；\n4. 返回加权输出矩阵（保留 4 位小数）。\n\n最后一行请以给定的 Q, K, V 数组调用测试。",
            "starterCode": "import numpy as np\n\ndef scaled_dot_product_attention_fn(Q: np.ndarray, K: np.ndarray, V: np.ndarray, is_causal: bool = False) -> np.ndarray:\n    \"\"\"实现缩放点积注意力计算\"\"\"\n    # 请在此实现\n    ___\n\nnp.random.seed(42)\nQ = np.array([[1.0, 0.0], [0.0, 1.0]])\nK = np.array([[1.0, 0.0], [0.0, 1.0]])\nV = np.array([[2.0, 3.0], [4.0, 5.0]])\nout = scaled_dot_product_attention_fn(Q, K, V, is_causal=True)\nprint(out.shape)\n",
            "setupCode": "",
            "expectedOutput": "(2, 2)",
            "answer": "import numpy as np\n\ndef scaled_dot_product_attention_fn(Q: np.ndarray, K: np.ndarray, V: np.ndarray, is_causal: bool = False) -> np.ndarray:\n    d_k = Q.shape[-1]\n    scores = np.matmul(Q, np.swapaxes(K, -1, -2)) / np.sqrt(d_k)\n    if is_causal:\n        seq_q = Q.shape[-2]\n        seq_k = K.shape[-2]\n        mask = np.tril(np.ones((seq_q, seq_k)))\n        scores = np.where(mask == 1, scores, -1e9)\n    scores_max = np.max(scores, axis=-1, keepdims=True)\n    exp_s = np.exp(scores - scores_max)\n    weights = exp_s / np.sum(exp_s, axis=-1, keepdims=True)\n    return np.matmul(weights, V)\n\nnp.random.seed(42)\nQ = np.array([[1.0, 0.0], [0.0, 1.0]])\nK = np.array([[1.0, 0.0], [0.0, 1.0]])\nV = np.array([[2.0, 3.0], [4.0, 5.0]])\nout = scaled_dot_product_attention_fn(Q, K, V, is_causal=True)\nprint(out.shape)\n",
            "tests": "Q_t = np.array([[1.0, 0.0], [0.0, 1.0]])\nK_t = np.array([[1.0, 0.0], [0.0, 1.0]])\nV_t = np.array([[2.0, 3.0], [4.0, 5.0]])\nout_t = scaled_dot_product_attention_fn(Q_t, K_t, V_t, is_causal=True)\n# 第 0 个 token 只能看到自己，因此输出必须严格等于 V[0]\nassert np.allclose(out_t[0], [2.0, 3.0]), f\"因果注意力第 0 位输出不匹配: {out_t[0]}\"\n",
            "explanation": "通过下三角掩码对未来位置施加极小负值，使得 Softmax 后权重归零，保证计算输出严格符合因果单向约束。",
            "tags": ["缩放点积", "因果掩码", "Softmax", "算法实战"],
            "related_lesson_id": "ml-tf-l2-1",
        },
    ]

    return chapter(
        chapter_id="ml-tf-c2",
        course_id="ml-transformer-llm",
        order=2,
        title="自注意力机制与多头注意力",
        goal="系统掌握 Transformer 的核心计算引擎：缩放点积注意力、多头特征子空间分解与因果掩码自回归生成。",
        lessons=lessons,
        exercises=exercises,
    )
