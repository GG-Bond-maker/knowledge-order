# -*- coding: utf-8 -*-
"""
Chapter 3: 位置编码全景演进：从绝对到旋转 (Positional Encodings: From Absolute to RoPE)
Course: ml-transformer-llm
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_3():
    # ── Lesson 3.1 ──
    l1_text = """### 学习目标
学完本节，你应该能够：
1. 深刻理解纯自注意力机制的**置换不变性（Permutation Invariance）**及其引发的位置信息丢失困境；
2. 掌握 Vaswani 正弦-余弦绝对位置编码（Sinusoidal Positional Encoding）的数学构造公式；
3. **推导核心三角性质**：严格证明为何对于任意相对距离 $k$，$PE_{pos+k}$ 都可以由 $PE_{pos}$ 经过一个线性正交矩阵变换精确得出；
4. 理解波长频率随特征维度呈几何级数递增的物理内涵；
5. 编写纯 NumPy 代码生成正弦位置编码矩阵并进行热力图与内积衰减分析。

### 前置知识
- 高中三角函数和差化积公式：$\\sin(\\alpha + \\beta)$ 与 $\\cos(\\alpha + \\beta)$；
- 矩阵变换与正交旋转矩阵。

### 问题背景与 ML 用途
人类语言是一种对**词序极其敏感**的符号系统。
- 颠倒词语顺序，语义会彻底改变甚至相反：“张三打了李四” vs “李四打了张三”；
- 然而自注意力机制在数学上本质是集合操作。如果输入序列仅仅经过 Embedding 层进入 Self-Attention，那么交换输入句子中任意两个词的位置，所有计算出的注意力权重集合与输出向量集合完全一模一样！
- 为了赋予 Transformer 识别时序前后顺序的能力，必须将**位置信息显式注入**到每个 Token 的向量表征中；
- 2017 年经典的 Transformer 原论文创造性地提出了无需训练、基于正弦与余弦函数的解析型绝对位置编码。

### 直觉理解
- **二进制时钟脉冲（Sinusoidal 的直觉）**：最低位跳动得极快，0 和 1 剧烈交替（高频）；最高位变化极慢（低频）。正弦位置编码正是这种连续平滑版本的计数器：低维度通道对应高频波长，随位置 $pos$ 快速起伏；高维度通道对应超大波长，变化极为缓慢。每一个整数位置 $pos$，都在这个多频率交织的波浪中拥有独一无二的几何指纹！

### 核心概念与符号对照表
| 核心概念 | 数学公式 | 符号含义 | 物理/几何内涵 |
| --- | --- | --- | --- |
| **偶数维度编码** | $PE_{(pos, 2i)} = \\sin\\left( \\frac{pos}{10000^{2i/d}} \\right)$ | $pos$ 为序列索引，$i$ 为特征对索引 | 沿时间步的高频/低频正弦波采样 |
| **奇数维度编码** | $PE_{(pos, 2i+1)} = \\cos\\left( \\frac{pos}{10000^{2i/d}} \\right)$ | 与偶数维形成正交正弦-余弦对 | 构成复数平面的二维单位旋转圆 |
| **角频率** | $\\omega_i = \\frac{1}{10000^{2i/d}}$ | 几何递减的特征频率 | 确保波长跨度覆盖 $2\\pi \\sim 10000 \\cdot 2\\pi$ |
| **相对线性映射** | $PE_{pos+k} = M_k \\cdot PE_{pos}$ | $M_k$ 为纯依赖偏移量 $k$ 的变换矩阵 | 使得模型理论上容易通过线性层学习关注相对距离 |

### 数学原理与逐步推导
设词嵌入向量为 $\\mathbf{x}_{pos} \\in \\mathbb{R}^d$。将位置向量 $\\mathbf{p}_{pos} \\in \\mathbb{R}^d$ 直接逐元素相加：
$$\\mathbf{z}_{pos} = \\mathbf{x}_{pos} + \\mathbf{p}_{pos}$$
对于某个频率通道 $i$，角频率为 $\\omega_i = \\frac{1}{10000^{2i/d}}$。
定义该二维切片上的位置编码向量为：
$$\\mathbf{p}(pos) = \\begin{bmatrix} \\sin(\\omega_i \\cdot pos) \\\\ \\cos(\\omega_i \\cdot pos) \\end{bmatrix}$$
平移 $k$ 个步长后的位置 $pos + k$：
$$\\mathbf{p}(pos + k) = \\begin{bmatrix} \\sin(\\omega_i (pos + k)) \\\\ \\cos(\\omega_i (pos + k)) \\end{bmatrix}$$
根据高中和角公式展开：
$$\\begin{bmatrix} \\sin(\\omega_i(pos+k)) \\\\ \\cos(\\omega_i(pos+k)) \\end{bmatrix} = \\begin{bmatrix} \\cos(\\omega_i k) & \\sin(\\omega_i k) \\\\ -\\sin(\\omega_i k) & \\cos(\\omega_i k) \\end{bmatrix} \\begin{bmatrix} \\sin(\\omega_i \\cdot pos) \\\\ \\cos(\\omega_i \\cdot pos) \\end{bmatrix}$$
旋转变换矩阵 $M_k$ 只与相对距离 $k$ 以及通道频率 $\\omega_i$ 有关，而与绝对位置 $pos$ 完全无关！

### 常见认知误区与避坑指南
1. **误以为词向量与位置向量相加会相互污染语义**：高维空间极其辽阔，相加相当于在一个超大球面上给词向量叠加了一个轻微的位置扰动，模型的注意力矩阵能够轻松通过线性投影将语义分量和位置分量解耦。
2. **以为正弦位置编码需要反向传播更新梯度**：Vaswani 原版 Sinusoidal 位置编码是完全固定的闭式解析解，在整个训练过程中不需要任何可学习参数。

### 工业级工程实践
- **PE Buffer Register**：在 PyTorch 编写模块时，切勿在每次 forward 时重新计算三角函数。应当在 `__init__` 中预先生成好最大长度的张量，并通过 `register_buffer('pe', pe)` 注册进模块。
- **10000 底数的调优**：如果构建超长上下文模型（如 100 万 Token），原始的 10000 底数太小会导致高频维度周期重叠，现代大模型通常将该基数放大至 500,000 甚至更高。

### 拓展阅读与学术文献
1. **Vaswani et al. (2017)**: *Attention Is All You Need* (第 3.5 节)。
2. **Press et al. (2021)**: *Train Short, Test Long: Attention with Linear Biases Enables Input Length Extrapolation* (ALiBi)。

### 知识总结与核心记忆要点
- **根本矛盾**：自注意力的置换不变性迫使我们必须注入位置信息。
- **Sinusoidal 构造**：偶数维填正弦、奇数维填余弦，角频率随维度指数衰减。
- **旋转本质**：利用和角公式，平移 $k$ 个步长严格等价于二维复平面的正交旋转。"""

    l1_code = """import numpy as np

def get_sinusoidal_positional_encoding(max_seq_len, d_model):
    assert d_model % 2 == 0
    PE = np.zeros((max_seq_len, d_model))
    positions = np.arange(max_seq_len)[:, np.newaxis]
    div_term = np.exp(np.arange(0, d_model, 2) * -(np.log(10000.0) / d_model))
    PE[:, 0::2] = np.sin(positions * div_term)
    PE[:, 1::2] = np.cos(positions * div_term)
    return PE

seq_len, d_model = 50, 32
PE = get_sinusoidal_positional_encoding(seq_len, d_model)

pos, k = 10, 5
omega_0 = np.exp(0 * -(np.log(10000.0) / d_model))
M_k = np.array([
    [np.cos(omega_0 * k), np.sin(omega_0 * k)],
    [-np.sin(omega_0 * k), np.cos(omega_0 * k)]
])
v_pos = PE[pos, 0:2]
v_pos_plus_k_actual = PE[pos + k, 0:2]
v_pos_plus_k_predicted = np.dot(M_k, v_pos)

sims_from_0 = [np.dot(PE[0], PE[t]) / (np.linalg.norm(PE[0]) * np.linalg.norm(PE[t])) for t in range(seq_len)]

print(f"位置编码张量形状: {PE.shape}")
print(f"距离为 1 相似度: {sims_from_0[1]:.4f}, 距离为 30 相似度: {sims_from_0[30]:.4f}")

assert np.allclose(v_pos_plus_k_predicted, v_pos_plus_k_actual)
assert sims_from_0[1] > sims_from_0[30]
print("测试通过：正弦位置编码生成及三角和差化积性质严格成立！")"""

    l1_tips = [
        tip("Sinusoidal 编码是纯数学固定公式，不包含任何可训练参数，使用 register_buffer 保存以避免重复计算。", "performance"),
    ]

    # ── Lesson 3.2 ──
    l2_text = """### 学习目标
学完本节，你应该能够：
1. 掌握可学习绝对位置编码（Learned Positional Embeddings）的参数化结构与优缺点；
2. 掌握 Shaw 相对位置编码（Relative Positional Encoding, 2018）的键值偏置注入原理；
3. 理解 T5 相对位置偏置（T5 Relative Position Bias）的**对数分桶算法（Logarithmic Binning）**数学设计；
4. 对比绝对位置、相对位置与固定解析编码在表征能力、外推性与计算开销上的系统权衡。

### 前置知识
- 嵌入层查找表（Embedding Lookup Table）机制；
- 对数函数在非线性尺度压缩中的应用。

### 问题背景与 ML 用途
Vaswani 的固定正弦位置编码虽然优雅，但在实际工业落地中很快遇到了挑战：
- **BERT 和 GPT-2 的选择**：直接设立一个可训练的参数矩阵 $W_{pos} \\in \\mathbb{R}^{L_{max} \\times D}$；
- **绝对位置的硬伤**：语言理解更多依赖的是两个词之间的相对距离，无论这个短语出现在文章开头还是末尾；
- **外推性的死穴**：可学习位置编码设立了最大长度。当推理时传入第 1025 个 Token 时，查找表直接发生数组越界崩溃；
- 这催生了以 **Shaw 相对位置编码** 和 **T5 相对位置偏置** 为代表的相对位置建模体系。

### 直觉理解
- **身份证号 vs 相对座位号**：绝对位置就像每个人的身份证号；相对位置就像剧院里的座位指示：“李四坐在张三前面第 2 排”。只要相对距离为 2，无论坐在哪排交互逻辑完全一样！
- **近大远小的透视法则（T5 对数分桶直觉）**：距离你 1 米和 2 米的人，你一眼就能看出他们相差整整 1 米；但距离你 500 米和 501 米的两棵树，在你眼里几乎没有差别。T5 的对数分桶机制正是模拟了人类的这种视觉与认知透视法则！

### 核心概念与符号对照表
| 架构范式 | 代表模型 | 注入位置 | 参数量与外推能力 |
| --- | --- | --- | --- |
| **可学习绝对位置 (Learned)** | BERT, GPT-2 | 输入层与 Token Embedding 相加 | 参数量 $L_{\\max} \\times D$，**完全无法外推** |
| **Shaw 相对位置** | Transformer-XL (变体) | 注入到注意力矩阵 $Q K^\\top$ 与 $V$ 中 | 仅需学习截断距离以内的相对参数，可外推 |
| **T5 相对位置偏置** | T5, mT5 | 直接作为标量加到注意力得分中：$S_{ij} + b_{\\text{bucket}(i - j)}$ | 参数量极少，长文本表现稳健 |

### 数学原理与逐步推导
在 T5 模型中，不再向输入 Embedding 添加任何位置向量，而是在计算注意力得分矩阵时，直接加上一个可学习的相对位置标量偏置 $b_{i, j}$：
$$\\text{Score}_{ij} = \\frac{\\mathbf{q}_i^\\top \\mathbf{k}_j}{\\sqrt{d_k}} + b_{i, j}$$
偏置 $b_{i, j}$ 的值由相对偏移量 $\\delta = i - j$ 决定。采用对数分桶策略：
1. 若偏移量很小（$\\delta < B / 2$），采用线性映射：$\\text{bucket}(\\delta) = \\delta$；
2. 若偏移量较大（$\\delta \\ge B / 2$），采用对数映射进行非线性压缩；
3. 所有超过最大距离 $M$ 的超长距离，全部合并落入最后一个第 $B-1$ 号桶。

### 常见认知误区与避坑指南
1. **以为相对位置编码完全不需要知道绝对位置**：对于绝大多数自然语言任务，“谁在谁的前面多少个词”远比“谁是全书第几万个词”重要得多。基于相对位置设计的模型在外推长度上有天然的巨大优势。
2. **Learned 绝对位置编码的微调陷阱**：在长文本微调时，简单扩展位置矩阵往往会导致灾难性遗忘，因为新初始化的位置权重从未参与过预训练。

### 工业级工程实践
- **跨层共享相对偏置**：T5 原论文中所有注意力头共享同一个相对位置偏置查找表，在所有 Transformer 层中复用同一套偏置权重，总参数量不到几千字节。
- **RoPE 的替代**：千亿大模型时代，相对偏置对 FlashAttention 等算子并不友好，业界全面转向 RoPE。

### 拓展阅读与学术文献
1. **Shaw et al. (2018)**: *Self-Attention with Relative Position Representations*.
2. **Raffel et al. (2020)**: *Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer* (T5 论文)。

### 知识总结与核心记忆要点
- **可学习绝对位置**：参数量绑定 $L_{\\max}$，超出长度直接崩溃，完全丧失外推性。
- **相对位置本质**：关注 Token 之间的相对位移差值，契合人类语言的语法与结构逻辑。
- **T5 对数分桶**：近距离线性单步精细划分，远距离对数压缩，巧妙平衡了分辨率与参数量。"""

    l2_code = """import numpy as np

def t5_relative_position_bucket(relative_position, num_buckets=32, max_distance=128):
    n = -relative_position
    n = np.maximum(n, 0)
    max_exact = num_buckets // 2
    is_small = n < max_exact
    
    val_if_large = max_exact + (
        np.log(n.astype(float) / max_exact + 1e-6) /
        np.log(float(max_distance) / max_exact) *
        (num_buckets - max_exact)
    ).astype(int)
    val_if_large = np.minimum(val_if_large, num_buckets - 1)
    
    return np.where(is_small, n, val_if_large)

distances = np.array([0, 1, 2, 5, 10, 15, 16, 20, 30, 60, 100, 150, 200])
buckets = t5_relative_position_bucket(-distances, num_buckets=32, max_distance=128)

for d, b in zip(distances, buckets):
    print(f"相对距离 {d:3d} 步 -> 分配至第 {b:2d} 号桶")

for d in range(16):
    b = t5_relative_position_bucket(np.array([-d]), num_buckets=32, max_distance=128)[0]
    assert b == d
assert buckets[-1] == 31 and buckets[-2] == 31
print("测试通过：T5 对数分桶近距离精细、远距离压缩的性质验证无误！")"""

    l2_tips = [
        tip("T5 的相对偏置矩阵与输入内容无关，推理时可以预先计算并缓存在内存中。", "performance"),
    ]

    # ── Lesson 3.3 ──
    l3_text = """### 学习目标
学完本节，你应该能够：
1. 掌握旋转位置编码（Rotary Position Embedding, RoPE, Su et al., 2021）的理论动机与核心思想；
2. 掌握复数空间内积与 2D 正交旋转矩阵的严密数学推导；
3. **推导 RoPE 核心定理**：证明为何对 Query 和 Key 施加绝对旋转变换后，其内积自动涌现出纯相对位置差 $(m-n)$；
4. 掌握 RoPE 向量切片在多维张量中的极速纯 Python/NumPy 实现；
5. 理解现代长文本外推技术（Position Interpolation 与 YaRN）的频率缩放机理。

### 前置知识
- 复数乘法几何意义：复数乘以 $e^{i\\theta}$ 等价于复平面逆时针旋转 $\\theta$ 弧度；
- 矩阵正交性：正交矩阵的转置等于其逆矩阵 $R^\\top = R^{-1}$。

### 问题背景与 ML 用途
进入以 LLaMA、Mistral、Qwen、DeepSeek 为代表的当代开源大语言模型时代，**RoPE 已经成为事实上的绝对统治级标准**。
- **Su Jianlin（苏剑林）等人的天才突破**：设计一种编码方式，在形式上是绝对位置编码（直接对单个 Token 向量进行变换，保持输入格式不变），但在自注意力内积计算后，数学上自动显现出纯相对位置关系；
- 这就是 RoPE！它完美统一了绝对位置的优雅实现与相对位置的强大外推性。

### 直觉理解
- **时钟指针的相对夹角（RoPE 的直觉）**：一个时针在 2 点，一个在 5 点。计算两个时针之间的夹角时，它们相差 3 个小时。无论你把整个时钟整体旋转多少度，只要它们相隔 3 个小时，两个指针之间的相对夹角永远是固定的 90 度！RoPE 将高维向量拆解为成百上千个二维小指针，绝对角度相消，只剩下干净的相对时间差！

### 核心概念与符号对照表
| 核心概念 | 数学表达 | 维度 / 形式 | 核心数学作用 |
| --- | --- | --- | --- |
| **复数表示** | $\\mathbf{z} = x_1 + i x_2$ | 2D 平面复数 | 将实数向量相邻两维映射到复平面 |
| **旋转算子** | $R_{\\Theta, m}$ | 正交旋转矩阵 | 将位置 $m$ 的向量逆时针旋转 $m\\theta$ 角度 |
| **相对内积定理** | $\\langle R_m \\mathbf{q}, R_n \\mathbf{k} \\rangle = g(\\mathbf{q}, \\mathbf{k}, m-n)$ | 标量内积 | 绝对位置旋转后的内积纯粹只取决于相对差 $(m-n)$ |
| **外推缩放 (PI)** | $\\theta' = \\theta / s$ | 线性插值标量 | 将长上下文压缩至预训练已知频率区间内 |

### 数学原理与逐步推导
对二维向量施加旋转：
$$R_{\\Theta, m} \\mathbf{x} = \\begin{bmatrix} \\cos(m\\theta) & -\\sin(m\\theta) \\\\ \\sin(m\\theta) & \\cos(m\\theta) \\end{bmatrix} \\begin{bmatrix} x_1 \\\\ x_2 \\end{bmatrix}$$
分别对 Query 和 Key 施加旋转：
$$\\tilde{\\mathbf{q}}_m = R_{\\Theta, m} \\mathbf{q}_m, \\quad \\tilde{\\mathbf{k}}_n = R_{\\Theta, n} \\mathbf{k}_n$$
计算内积：
$$\\langle \\tilde{\\mathbf{q}}_m, \\tilde{\\mathbf{k}}_n \\rangle = (R_{\\Theta, m} \\mathbf{q}_m)^\\top (R_{\\Theta, n} \\mathbf{k}_n) = \\mathbf{q}_m^\\top R_{\\Theta, m}^\\top R_{\\Theta, n} \\mathbf{k}_n$$
由于旋转矩阵是正交矩阵：$R_{\\Theta, m}^\\top = R_{\\Theta, -m}$，因此：
$$R_{\\Theta, m}^\\top R_{\\Theta, n} = R_{\\Theta, -m} R_{\\Theta, n} = R_{\\Theta, (n - m)}$$
代入内积式：
$$\\langle \\tilde{\\mathbf{q}}_m, \\tilde{\\mathbf{k}}_n \\rangle = \\mathbf{q}_m^\\top R_{\\Theta, (n - m)} \\mathbf{k}_n$$
定理得证！内积中位置 $m$ 与 $n$ 完全融合成了一个单一的相对差值 $(n - m)$！

### 常见认知误区与避坑指南
1. **误以为 RoPE 是加在 Value 向量上的**：千万不能加在 $V$ 上！RoPE 仅且只作用于 $Q$ 和 $K$。如果给 $V$ 施加了旋转，加权汇总出来的上下文表征会被旋转角度彻底破坏。
2. **长文本外推时的直接截断误区**：在将 4k 预训练模型扩展到 32k 或 128k 时，直接把大 $pos$ 塞给 RoPE 会导致高频维度的内积剧烈震荡崩溃。必须采用**位置内插（Position Interpolation）**或 **YaRN**。

### 工业级工程实践
- **Triton 算子融合**：高性能推理引擎中，RoPE 被优化为单个 Triton/CUDA 融合算子，显存吞吐量达到极致，延迟几乎为零。
- **YaRN 自适应插值**：对高频维度不进行插值（保护局部细粒度语法感知）；只对波长很长的低频维度进行外推插值。

### 拓展阅读与学术文献
1. **Su et al. (2021)**: *RoFormer: Enhanced Transformer with Rotary Position Embedding*。
2. **Chen et al. (2023)**: *Extending Context Window of Large Language Models via Positional Interpolation*。

### 知识总结与核心记忆要点
- **设计初衷**：绝对位置的形式实现，相对位置的数学本质。
- **复数旋转**：利用二维平面正交旋转矩阵，使内积计算中绝对角度相抵消，自然涌现纯相对位移 $(n-m)$。
- **作用边界**：只旋转 Query 和 Key，严禁旋转 Value。"""

    l3_code = """import numpy as np

def apply_rotary_pos_emb(x, pos, theta_base=10000.0):
    d = len(x)
    assert d % 2 == 0
    i = np.arange(0, d, 2)
    thetas = 1.0 / (theta_base ** (i / d))
    angles = pos * thetas
    
    x_even = x[0::2]
    x_odd = x[1::2]
    cos_a = np.cos(angles)
    sin_a = np.sin(angles)
    
    x_rot = np.zeros_like(x)
    x_rot[0::2] = x_even * cos_a - x_odd * sin_a
    x_rot[1::2] = x_even * sin_a + x_odd * cos_a
    return x_rot

np.random.seed(42)
d = 8
q = np.random.randn(d)
k = np.random.randn(d)

q_pos10 = apply_rotary_pos_emb(q, pos=10)
k_pos7  = apply_rotary_pos_emb(k, pos=7)
dot_case1 = np.dot(q_pos10, k_pos7)

q_pos110 = apply_rotary_pos_emb(q, pos=110)
k_pos107 = apply_rotary_pos_emb(k, pos=107)
dot_case2 = np.dot(q_pos110, k_pos107)

print(f"场景 1 内积 (位置 10 与 7):   {dot_case1:.6f}")
print(f"场景 2 内积 (位置 110 与 107): {dot_case2:.6f}")

assert np.isclose(dot_case1, dot_case2, atol=1e-7)
print("测试通过：RoPE 在整体平移后内积严格守恒，相对位置性质完美成立！")"""

    l3_tips = [
        tip("RoPE 仅作用于 Query 和 Key 向量，绝对不要施加于 Value 向量上，否则会导致 FFN 接收到的特征严重失真。", "pitfall"),
    ]

    lessons = [
        lesson("ml-tf-l3-1", "Sinusoidal 正弦绝对位置编码与三角恒等变换", l1_text, 2, l1_tips, [demo(code=l1_code, title="正弦绝对位置编码生成与三角旋转变换验证")]),
        lesson("ml-tf-l3-2", "可学习位置编码与相对位置编码", l2_text, 2, l2_tips, [demo(code=l2_code, title="T5 相对位置对数分桶算法特性测试")]),
        lesson("ml-tf-l3-3", "现代大模型基石：RoPE 旋转位置编码深度推导与长文本外推", l3_text, 3, l3_tips, [demo(code=l3_code, title="RoPE 旋转位置编码与相对内积平移不变性测试")]),
    ]

    exercises = [
        single_choice(
            ex_id="ml-tf-c3-ex1",
            question="为什么在标准 Transformer 架构中必须引入位置编码（Positional Encoding）？",
            options=[
                {"value": "A", "text": "因为自注意力机制在数学上具有置换不变性，若不注入位置信息，无法区分打乱词序后的句子含义"},
                {"value": "B", "text": "为了使矩阵乘法的维度能够与 GPU 的硬件线程数对齐"},
                {"value": "C", "text": "现代分词器（Tokenizer）生成的 Token ID 没有包含字母大小写信息，需要位置编码补齐"},
                {"value": "D", "text": "防止注意力矩阵中的 Softmax 计算结果出现负数"},
            ],
            answer="A",
            explanation="纯自注意力对输入序列的顺序没有任何物理感知（置换不变性）。“猫吃鱼”和“鱼吃猫”在纯注意力机制下得到的结果完全一样，因此必须显式添加位置编码以打破对称性。",
            difficulty=2,
            related_lesson_id="ml-tf-l3-1",
            tags=["位置编码", "置换不变性", "自注意力"],
        ),
        multiple_choice(
            ex_id="ml-tf-c3-ex2",
            question="关于旋转位置编码（RoPE），下列说法正确的有：",
            options=[
                {"value": "A", "text": "RoPE 通过将高维特征切分成若干个 2D 子空间，并在复平面施加与位置成正比的正交旋转变换"},
                {"value": "B", "text": "RoPE 仅施加于 Query 和 Key 向量上，严禁作用于 Value 向量"},
                {"value": "C", "text": "经过 RoPE 变换后的 Query 与 Key 在进行内积运算时，绝对位置角度相互抵消，内积纯粹只取决于相对位移 (m - n)"},
                {"value": "D", "text": "RoPE 必须通过在模型中增加数百万个可训练参数矩阵来实现"},
            ],
            answer=["A", "B", "C"],
            explanation="A、B、C 均为 RoPE 的核心原理与性质。D 选项错误，RoPE 采用解析的三角函数旋转公式，本身不引入任何新的可训练参数。",
            difficulty=2,
            related_lesson_id="ml-tf-l3-3",
            tags=["RoPE", "旋转位置编码", "复数空间", "大模型标配"],
        ),
        judge(
            ex_id="ml-tf-c3-ex3",
            question="BERT 采用的可学习绝对位置编码（Learned Positional Embeddings）可以零样本无缝处理长度达到 10000 的长文本输入，不会报错。",
            answer=False,
            explanation="错误。BERT 的可学习位置编码矩阵最大长度固化为 512。当输入超过 512 时，查找表会发生数组越界异常，完全丧失直接外推能力。",
            difficulty=1,
            related_lesson_id="ml-tf-l3-2",
            tags=["BERT", "可学习位置编码", "外推限制"],
        ),
        fill(
            ex_id="ml-tf-c3-ex4",
            question="T5 模型的相对位置偏置采用非线性分桶策略：在近距离范围内采用精确的____映射，在远距离范围内采用对数压缩映射。（填'线性'或'指数'）",
            blanks=[["线性"]],
            explanation="T5 在小距离范围内采用精确的线性一对一映射以保证近距离句法的高分辨率，远距离则采用对数分桶压缩。",
            difficulty=2,
            related_lesson_id="ml-tf-l3-2",
            tags=["T5", "对数分桶", "相对位置偏置"],
        ),
        open_ex(
            ex_id="ml-tf-c3-ex5",
            question="简要分析为什么二维正交旋转矩阵能够保证内积运算只保留相对位置信息？",
            reference_answer="数学原理：\n1. 设 Query 位于位置 m，经旋转后为 R_m q；Key 位于位置 n，经旋转后为 R_n k；\n2. 二者的内积为 (R_m q)^T (R_n k) = q^T (R_m^T R_n) k；\n3. 由于 R 是正交旋转矩阵，R_m^T 对应于逆旋转矩阵 R_{-m}；\n4. 旋转算子相乘在复平面对应角度相加：R_{-m} R_n = R_{n-m}；\n5. 最终内积为 q^T R_{n-m} k，绝对位置参数 m 和 n 被完美相消，只留下相对位置差值 n-m。",
            explanation="正交旋转算子的结合律与正交性保证了内积下的相对性涌现。",
            rubric=[
                {"points": 5, "description": "利用正交矩阵转置等于逆矩阵写出内积化简式"},
                {"points": 5, "description": "说明旋转角度相加相减使得绝对位置消去留下纯相对距离 n-m"},
            ],
            difficulty=3,
            related_lesson_id="ml-tf-l3-3",
            tags=["RoPE推导", "正交矩阵", "相对内积"],
        ),
        # ── Code Exercise 3 ──
        {
            "id": "ml-tf-c3-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】实现简易二维 RoPE 旋转位置编码函数：\n编写函数 `apply_rope_2d(q, k, pos_q, pos_k)`：\n1. `q` 和 `k` 均为长度为 2 的一维向量，角频率 $\\omega = 1.0$；\n2. 对 `q` 施加 $pos_q$ 角度的 2D 旋转；\n3. 对 `k` 施加 $pos_k$ 角度的 2D 旋转；\n4. 计算并返回旋转后的向量内积浮点数（保留 4 位小数）。\n\n最后一行请以 `q=[1.0, 0.0]`, `k=[0.0, 1.0]`, `pos_q=10`, `pos_k=7` 测试调用。",
            "starterCode": "import numpy as np\n\ndef apply_rope_2d(q: np.ndarray, k: np.ndarray, pos_q: int, pos_k: int) -> float:\n    \"\"\"实现 2D RoPE 旋转并计算内积\"\"\"\n    # 请在此实现\n    ___\n\nq = np.array([1.0, 0.0])\nk = np.array([0.0, 1.0])\nres = apply_rope_2d(q, k, 10, 7)\nprint(res)\n",
            "setupCode": "",
            "expectedOutput": "0.1411",
            "answer": "import numpy as np\n\ndef apply_rope_2d(q: np.ndarray, k: np.ndarray, pos_q: int, pos_k: int) -> float:\n    omega = 1.0\n    ang_q = pos_q * omega\n    cos_q, sin_q = np.cos(ang_q), np.sin(ang_q)\n    q_rot = np.array([q[0] * cos_q - q[1] * sin_q, q[0] * sin_q + q[1] * cos_q])\n    \n    ang_k = pos_k * omega\n    cos_k, sin_k = np.cos(ang_k), np.sin(ang_k)\n    k_rot = np.array([k[0] * cos_k - k[1] * sin_k, k[0] * sin_k + k[1] * cos_k])\n    \n    return round(float(np.dot(q_rot, k_rot)), 4)\n\nq = np.array([1.0, 0.0])\nk = np.array([0.0, 1.0])\nres = apply_rope_2d(q, k, 10, 7)\nprint(res)\n",
            "tests": "q_t = np.array([1.0, 0.0])\nk_t = np.array([0.0, 1.0])\ndot1 = apply_rope_2d(q_t, k_t, 10, 7)\ndot2 = apply_rope_2d(q_t, k_t, 100, 97)\nassert dot1 == dot2 == 0.1411, f\"相对内积守恒测试不匹配: {dot1}, {dot2}\"\n",
            "explanation": "利用 2D 旋转矩阵对 Query 和 Key 分别施加角度变换，内积结果严格取决于相对距离 pos_q - pos_k。",
            "tags": ["RoPE", "2D旋转", "内积守恒", "算法实战"],
            "related_lesson_id": "ml-tf-l3-3",
        },
    ]

    return chapter(
        chapter_id="ml-tf-c3",
        course_id="ml-transformer-llm",
        order=3,
        title="位置编码全景演进：从绝对到旋转",
        goal="系统掌握 Transformer 打破置换不变性的位置注入方案：从经典正弦编码、T5 相对偏置到当代大模型标配 RoPE。",
        lessons=lessons,
        exercises=exercises,
    )
