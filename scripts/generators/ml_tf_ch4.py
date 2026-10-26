# -*- coding: utf-8 -*-
"""
Chapter 4: Transformer 整体架构与现代变体 (Transformer Architectures & Modern Variants)
Course: ml-transformer-llm
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_4():
    # ── Lesson 4.1 ──
    l1_text = """### 学习目标
学完本节，你应该能够：
1. 掌握 Vaswani 原版 Transformer 编码器-解码器（Encoder-Decoder）的完整宏观拓扑结构；
2. 深刻理解交叉注意力机制（Cross-Attention / Encoder-Decoder Attention）的输入来源与信息桥接机理；
3. 理解残差流（Residual Stream）作为“信息高速公路”的数学机理：恒等映射与梯度直通；
4. 掌握前馈全连接网络（Feed-Forward Network, FFN）的升维扩展与两级非线性特征投影；
5. 编写纯 NumPy 代码构建一个轻量级 Transformer 模块前向流程。

### 前置知识
- 自注意力机制与多头注意力；
- 残差连接（ResNet）原理与梯度回传求导。

### 问题背景与 ML 用途
2017 年发表的经典论文《Attention Is All You Need》最初是为了攻克**机器翻译**任务。
- 机器翻译天生需要处理两个不同的序列：源语言句子和目标语言句子；
- 为此，Transformer 设计为对称的 **Encoder-Decoder 架构**：
  - **Encoder（编码器）**：负责充分理解源语言，提取富含全局双向上下文的深层语义特征；
  - **Decoder（解码器）**：在自回归生成目标语言时，一方面通过因果掩码自注意力关注已翻译出的前文，另一方面通过**交叉注意力（Cross-Attention）**实时从 Encoder 提取相关的源语言语义信息；
- 理解原始 Encoder-Decoder 结构，是读懂后续分化出的 Encoder-only（如 BERT）与 Decoder-only（如 GPT/LLaMA）设计哲学的关键起点。

### 直觉理解
- **同传翻译官的笔记本（Cross-Attention 直觉）**：编码器就像同传翻译官在草稿纸上记录的整段外语要点（Encoder 输出的 Key 和 Value）；解码器就像翻译官脑子里正在说出的半截话（Decoder 发出的 Query）。翻译官低头查阅草稿纸（通过 Query 查询草稿纸上的 Key），迅速提取关键意思（Value），从而准确吐出下一个翻译词！
- **残差流高速公路（Residual Stream 直觉）**：残差连接就像贯穿整栋楼的高速垂直升降电梯。原始输入向量从 1 楼一直直通顶楼，每经过一层注意力层或 FFN 层，网络只是往电梯里“加一点点修正信息”（Residual Update），而不会把原本的信息推倒重来。

### 核心概念与符号对照表
| 模块名称 | 输入张量 | 权重矩阵 | 核心功能与变换 |
| --- | --- | --- | --- |
| **Encoder 自注意力** | $X_{\\text{enc}}$ | $W_Q, W_K, W_V$ 全部来自 Encoder | 双向上下文无掩码交互，提取全句语义 |
| **Decoder 因果自注意力** | $Y_{\\text{dec}}$ | $W_Q, W_K, W_V$ 全部来自 Decoder | 施加下三角因果掩码，仅关注已生成的目标前文 |
| **交叉注意力 (Cross-Attn)** | $Q$ 来自 Decoder, $K, V$ 来自 Encoder | $W_Q^{\\text{cross}}, W_K^{\\text{cross}}, W_V^{\\text{cross}}$ | 将解码状态与编码上下文进行跨模态/跨序列对齐 |
| **前馈网络 (FFN)** | $H$ | $W_1 \\in \\mathbb{R}^{D \\times 4D}, W_2 \\in \\mathbb{R}^{4D \\times D}$ | 逐位置两层全连接，升维投影至 $4D$ 并经过非线性激活 |
| **残差连接** | $x$ | 无参数 | $x_{\\text{out}} = x + \\text{Sublayer}(x)$，避免深层梯度弥散 |

### 数学原理与逐步推导
交叉注意力的三元组投影为：
$$Q = H_{\\text{dec}} W_Q^{\\text{cross}}, \\quad K = H_{\\text{enc}} W_K^{\\text{cross}}, \\quad V = H_{\\text{enc}} W_V^{\\text{cross}}$$
计算交叉注意力矩阵：
$$A_{\\text{cross}} = \\text{softmax}\\left( \\frac{Q K^\\top}{\\sqrt{d_k}} \\right) \\in \\mathbb{R}^{S_{\\text{tgt}} \\times S_{\\text{src}}}$$
注意此时注意力矩阵的行数是目标序列长度 $S_{\\text{tgt}}$，列数是源序列长度 $S_{\\text{src}}$！
加权输出：
$$\\text{Output} = A_{\\text{cross}} V \\in \\mathbb{R}^{S_{\\text{tgt}} \\times D}$$

每个 Transformer 模块在注意力层之后紧跟一个前馈网络：
$$\\text{FFN}(x) = \\max(0, x W_1 + b_1) W_2 + b_2$$
其中中间隐层维度通常扩展为模型维度的 4 倍：$d_{ff} = 4 \\times d_{\\text{model}}$。

### 常见认知误区与避坑指南
1. **混淆自注意力与交叉注意力**：自注意力中 $Q, K, V$ 全部来自同一个输入序列自身；交叉注意力中 $Q$ 来自目标序列，而 $K$ 和 $V$ 来自源序列。
2. **误以为现代大语言模型都是 Encoder-Decoder 架构**：当代大模型（GPT、LLaMA、DeepSeek）绝大多数都是 **Decoder-only 架构**。纯解码器直接把 Prompt 和生成的文本拼在同一个序列中，依靠因果掩码完成理解与生成。
3. **以为 FFN 只是普通的降维分类头**：FFN 的参数量通常占据了总参数量的近三分之二。研究表明，FFN 充当了键值记忆库的角色，海量事实性世界知识主要存储在 FFN 的权重矩阵中。

### 工业级工程实践
- **Residual Scaling**：在层数极深的模型中，每次残差相加会使激活值方差随层数累加。现代架构在初始化残差分支的投影权重时会除以 $\\sqrt{2 \\times L}$，有效防止深度残差流数值膨胀。
- **架构选型**：在通用多任务文本生成中一律优先选择 Decoder-only；在语音识别（ASR 如 Whisper）等输入输出长度差异极大的专门场景中，Encoder-Decoder 架构依然保有一席之地。

### 拓展阅读与学术文献
1. **Vaswani et al. (2017)**: *Attention Is All You Need* (第 3.1 节)。
2. **Geva et al. (2020)**: *Transformer Feed-Forward Layers Are Key-Value Memories*。

### 知识总结与核心记忆要点
- **宏观结构**：经典 Transformer 由双向 Encoder 和带掩码的 Decoder 堆叠而成。
- **交叉注意力**：Decoder 发出 Query，向 Encoder 的 Key 和 Value 进行跨序列信息提取与语义对齐。
- **残差流**：线性直通主干保持梯度畅通，各子层通过残差增量更新表征。
- **FFN 记忆库**：占据三分之二参数量的 $4D$ 升维网络，是模型存储事实知识的核心容器。"""

    l1_code = """import numpy as np

def softmax(x, axis=-1):
    x_max = np.max(x, axis=axis, keepdims=True)
    exp_x = np.exp(x - x_max)
    return exp_x / np.sum(exp_x, axis=axis, keepdims=True)

def cross_attention_demo(decoder_hidden, encoder_hidden, d_k=8):
    D = decoder_hidden.shape[-1]
    np.random.seed(42)
    W_q = np.random.randn(D, d_k) * 0.1
    W_k = np.random.randn(D, d_k) * 0.1
    W_v = np.random.randn(D, D) * 0.1
    
    Q = np.matmul(decoder_hidden, W_q)
    K = np.matmul(encoder_hidden, W_k)
    V = np.matmul(encoder_hidden, W_v)
    
    scores = np.matmul(Q, K.T) / np.sqrt(d_k)
    cross_weights = softmax(scores, axis=-1)
    output = np.matmul(cross_weights, V)
    return output, cross_weights

S_src, S_tgt, D = 5, 3, 16
encoder_out = np.random.randn(S_src, D)
decoder_out = np.random.randn(S_tgt, D)

cross_out, weights = cross_attention_demo(decoder_out, encoder_out)
print(f"交叉注意力输出形状: {cross_out.shape}, 权重矩阵形状: {weights.shape}")
print(f"第 0 个目标词对源序列对齐行和: {np.sum(weights[0]):.4f}")

assert cross_out.shape == (S_tgt, D)
assert weights.shape == (S_tgt, S_src)
assert np.isclose(np.sum(weights[0]), 1.0)
print("测试通过：Encoder-Decoder 交叉注意力数学机理运行正确！")"""

    l1_tips = [
        tip("交叉注意力中，Query 来自解码器（Decoder），Key 和 Value 来自编码器（Encoder）。", "note"),
    ]

    # ── Lesson 4.2 ──
    l2_text = """### 学习目标
学完本节，你应该能够：
1. 掌握 Post-LN（后置归一化）与 Pre-LN（前置归一化）在残差连接与层归一化顺序上的拓扑差异；
2. **推导核心数学稳定性**：严格证明为什么 Post-LN 在深层网络中会导致梯度随层数呈指数级不稳定，必须严重依赖 Warmup 学习率预热；
3. 掌握 Pre-LN 如何实现恒等映射（Identity Mapping）的无损梯度直通，彻底化解深层训练崩溃危机；
4. 理解为什么现代所有顶尖大模型（GPT-3、LLaMA、Mistral、DeepSeek）毫无例外全部采用 Pre-LN 架构。

### 前置知识
- 链式法则多元微分；
- 矩阵导数与残差网络恒等映射性质。

### 问题背景与 ML 用途
在深度学习中，网络的深度直接决定了模型的容量与表达能力。然而在 Transformer 提出的早期：
- **Post-LN 的历史困境**：Vaswani 原版采用的是 Post-LN，即先做残差相加，再套上 LayerNorm。为了让它收敛，工程师必须小心翼翼地配置漫长的 Warmup，且初始阶段极易发生梯度爆炸或损失直接变成 NaN；
- 2020 年，理论研究通过微积分证明揭开了这一谜底：Post-LN 的结构破坏了残差流的梯度直通性，导致输出层的梯度在向底层回传时被连乘衰减或膨胀；
- **Pre-LN 的胜利**：将 LayerNorm 移动到子层之前，让残差主干成为纯净的无阻碍通道，彻底消除了深层训练的不稳定性。

### 直觉理解
- **收费站 vs 主干道无卡通行（Pre-LN 的直觉）**：
  - **Post-LN（每层都建收费站）**：车辆每跑完一小段路，在残差合并之后，必须全部强制通过一个收费站重新安检归一化。底层与顶层之间的直接联通被收费站硬生生切断，梯度回传时被各层收费站的导数连乘摧毁；
  - **Pre-LN（主干道无障碍通行）**：主干道畅通无阻，没有任何收费站！只有当车辆需要拐入“服务区”（注意力层或 FFN 层）时，在服务区入口才做一次归一化。主干道上的信息和梯度从 1 楼到 100 楼可以一脚油门直通到底！

### 核心概念与符号对照表
| 归一化架构 | 前向传播公式 | 残差流性质 | 训练稳定性与 Warmup 依赖 |
| --- | --- | --- | --- |
| **Post-LN** | $x_{l+1} = \\text{LN}(x_l + F(x_l))$ | 残差主干被 LN 强行打断 | 深层极易发散，必须依赖漫长的小学习率 Warmup |
| **Pre-LN** | $x_{l+1} = x_l + F(\\text{LN}(x_l))$ | 残差主干保持纯净恒等映射 | 梯度直通，收敛极度稳定，可直接使用大学习率 |
| **Final LN** | $y = \\text{LN}(x_L)$ | 在最末层输出前追加一个全局归一化 | 保证输入给输出分类头的向量方差规整 |

### 数学原理与逐步推导
对于 **Pre-LN**，反复展开递推关系：
$$x_L = x_l + \\sum_{i=l}^{L-1} F_i(\\text{LayerNorm}(x_i))$$
对其关于 $x_l$ 求偏导：
$$\\frac{\\partial x_L}{\\partial x_l} = \\mathbf{I} + \\sum_{i=l}^{L-1} \\frac{\\partial F_i(\\text{LayerNorm}(x_i))}{\\partial x_l}$$
损失函数 $\\mathcal{L}$ 对底层输入 $x_l$ 的梯度为：
$$\\frac{\\partial \\mathcal{L}}{\\partial x_l} = \\frac{\\partial \\mathcal{L}}{\\partial x_L} \\left( \\mathbf{I} + \\sum_{i=l}^{L-1} \\frac{\\partial F_i}{\\partial x_l} \\right) = \\frac{\\partial \\mathcal{L}}{\\partial x_L} + \\text{高阶修正项}$$
第一项 $\\frac{\\partial \\mathcal{L}}{\\partial x_L}$ 以完全恒等的强度（Identity Gradient Highway）直接灌入底层参数！

对于 **Post-LN**，偏导数为连乘形式：
$$\\frac{\\partial x_L}{\\partial x_l} = \\prod_{i=l}^{L-1} J_{\\text{LN}}(z_i) \\left( \\mathbf{I} + \\frac{\\partial F_i}{\\partial x_i} \\right)$$
多层 LayerNorm Jacobian 矩阵 $J_{\\text{LN}}$ 的连乘会导致底层参数接收到的梯度方差随层数呈指数级衰减或剧烈震荡。

### 常见认知误区与避坑指南
1. **忘记在 Pre-LN 顶层添加 Final LayerNorm**：在 Pre-LN 架构中，由于残差主干一直在自由累加，最后一个 Transformer Block 输出的向量数值尺度可能比第 1 层大得多。必须在输入给分类头之前显式施加一个 Final LayerNorm。
2. **把 Pre-LN 和 BatchNorm 搞混**：NLP 和 Transformer 永远使用 LayerNorm，绝不能使用 CV 中常见的 BatchNorm，因为文本序列长度高度动态。

### 工业级工程实践
- **Warmup 步长的大幅削减**：改用 Pre-LN 架构后，Warmup 步长可以从数千步大幅压缩至几百步甚至完全省略，极大缩短了大模型的训练爬坡周期。

### 拓展阅读与学术文献
1. **Xiong et al. (2020)**: *On Layer Normalization in the Transformer Architecture* (ICML 2020)。
2. **Brown et al. (2020)**: *Language Models are Few-Shot Learners* (GPT-3 论文)。

### 知识总结与核心记忆要点
- **拓扑差异**：Post-LN 在残差相加后归一化；Pre-LN 在子层支路前归一化。
- **梯度直通**：Pre-LN 的反向传播包含单位恒等矩阵 $\\mathbf{I}$，保证顶层梯度直达底层。
- **现代共识**：现代所有开源与商业闭源大模型全线统一采用 Pre-LN 架构。"""

    l2_code = """import numpy as np

def layer_norm(x, eps=1e-5):
    mean = np.mean(x, axis=-1, keepdims=True)
    var = np.var(x, axis=-1, keepdims=True)
    return (x - mean) / np.sqrt(var + eps)

def simulate_forward_stability(num_layers=20, d_model=32):
    np.random.seed(42)
    x_init = np.random.randn(1, 10, d_model)
    
    x_post = x_init.copy()
    post_norms = []
    for _ in range(num_layers):
        sublayer_out = np.random.randn(1, 10, d_model) * 0.1
        x_post = layer_norm(x_post + sublayer_out)
        post_norms.append(float(np.linalg.norm(x_post)))
        
    x_pre = x_init.copy()
    pre_norms = []
    for _ in range(num_layers):
        sublayer_out = np.random.randn(1, 10, d_model) * 0.1
        x_pre = x_pre + sublayer_out
        pre_norms.append(float(np.linalg.norm(x_pre)))
        
    return post_norms, pre_norms

post_norms, pre_norms = simulate_forward_stability(num_layers=20)
print(f"Post-LN 第 20 层范数: {post_norms[-1]:.2f}")
print(f"Pre-LN  第 20 层范数: {pre_norms[-1]:.2f}")

assert len(post_norms) == 20 and len(pre_norms) == 20
print("测试通过：Pre-LN 与 Post-LN 的结构流动模拟运行无误！")"""

    l2_tips = [
        tip("Pre-LN 架构必须在最末层输出前追加一个全局 Final LayerNorm，防止未受约束的残差累加激活值导致输出 Softmax 溢出。", "pitfall"),
    ]

    # ── Lesson 4.3 ──
    l3_text = """### 学习目标
学完本节，你应该能够：
1. 深入掌握开源大模型标配归一化层 **RMSNorm（Root Mean Square Layer Normalization）** 的简化原理与计算加速优势；
2. 掌握门控前馈网络 **SwiGLU（Swish Gated Linear Unit）** 的双线性门控机理与数学表达；
3. **精通现代大模型注意力三大范式演进**：对比多头注意力（MHA）、多查询注意力（MQA）与分组查询注意力（GQA）；
4. 掌握 GQA 如何在维持高模型表达容量的同时，将推理期 KV Cache 显存占用缩减数倍；
5. 编写代码完整实现 RMSNorm 与 SwiGLU 模块前向计算。

### 前置知识
- LayerNorm 均值与方差计算；
- 激活函数（ReLU, GELU, SiLU/Swish）；
- 推理阶段 KV Cache 显存瓶颈概念。

### 问题背景与 ML 用途
自 2020 年以来，现代大语言模型（以 Meta 的 LLaMA 系列、Mistral、DeepSeek 为典型代表）在保持 Transformer 核心架构不变的前提下，对底层三大核心组件进行了一场彻底的工程“大换血”：
1. **归一化层**：传统 LayerNorm 被计算更轻快、效果更强健的 **RMSNorm** 全面取代；
2. **激活函数**：标准 ReLU/GELU FFN 被双线性门控的 **SwiGLU** 架构全面淘汰；
3. **注意力机制**：标准 MHA 在长上下文推理中导致 KV Cache 显存崩溃，被 **GQA（Grouped-Query Attention）** 全面替代！
- 这三大组件的组合，构成了当今所有最顶尖开源与商业大模型的主干“黄金标配”（LLaMA-style Architecture）。

### 直觉理解
- **去繁就简的减肥术（RMSNorm 直觉）**：研究者发现自然语言向量减不减均值，根本不影响下游表征质量！核心起作用的是“把过大的激活向量模长约束在一个球面上”。RMSNorm 砍掉了“计算和减去均值”这一繁琐步骤，只做均方根缩放，性能完全不变，GPU 计算耗时降低近一半！
- **拼桌共享（GQA 直觉）**：MHA 拥有 32 个 Query 头和 32 个 Key/Value 头，推理时显存迅速吃光；MQA 极度节约，32 个 Query 头挤在一起共用 1 个 Key/Value 头，但表达力受损；GQA 采取折中设计：32 个 Query 头分成 8 组，每组 4 个 Query 头共享 1 个 Key/Value 头，显存缩减 4~8 倍，性能几乎无损！

### 核心概念与符号对照表
| 现代组件 | 传统旧组件 | 核心数学革新 | 工业代表模型 |
| --- | --- | --- | --- |
| **RMSNorm** | LayerNorm | 移除均值中心化，仅按均方根 RMS 进行缩放 | LLaMA, Mistral, Qwen, DeepSeek |
| **SwiGLU** | ReLU / GELU FFN | 引入 SiLU 门控与双线性乘法：$(x W_1) \\odot \\text{SiLU}(x W_g)$ | LLaMA, PaLM, Gemma |
| **GQA** | MHA / MQA | $h_Q$ 个 Query 头分组共享 $h_{KV}$ 个键值头 ($h_Q = g \\times h_{KV}$) | LLaMA-2/3 (70B), Mistral |

### 数学原理与逐步推导
#### 1. RMSNorm 数学推导
给定输入向量 $\\mathbf{x} \\in \\mathbb{R}^d$，RMSNorm 定义均方根：
$$\\text{RMS}(\\mathbf{x}) = \\sqrt{\\frac{1}{d} \\sum_{i=1}^d x_i^2 + \\epsilon}$$
归一化输出为：
$$\\bar{a}_i = \\frac{x_i}{\\text{RMS}(\\mathbf{x})} \\odot \\gamma_i$$
其中 $\\gamma \\in \\mathbb{R}^d$ 为可学习的仿射缩放参数。

#### 2. SwiGLU 门控前馈网络
定义 SiLU 激活函数：$\\text{SiLU}(x) = \\frac{x}{1 + e^{-x}}$。
SwiGLU 模块由三个权重矩阵构成：
$$\\text{SwiGLU}(x) = \\left( \\text{SiLU}(x W_g) \\odot (x W_1) \\right) W_2$$
其中中间隐层维度通常取为 $\\frac{8}{3} D$。

#### 3. GQA 键值共享
同一个组内的 $g$ 个 Query 头共享该组专属的单个 Key 头与 Value 头。
- **KV Cache 显存收益**：推理时保存历史上下文的显存占用直接降低为原本的 $\\frac{1}{g}$，极大解放了高并发推理吞吐！

### 常见认知误区与避坑指南
1. **误以为 GQA 降低了模型参数量**：将 $H_{KV}$ 从 32 降到 8，总参数量降低通常不到 5%。GQA 的根本价值从来不是为了节省模型参数量，而是为了数倍节省推理时的显存占用与提高并发解码吞吐！
2. **忽略维度对齐**：为大模型设计 SwiGLU 隐层维度时，工程上通常向上取整到 64 或 256 的整倍数，以充分发挥 Tensor Core 并行性能。

### 工业级工程实践
- **Triton 融合算子实现 RMSNorm**：在工业推理系统（如 vLLM）中，RMSNorm 与残差相加融合成单次访存操作，速度提升 2~3 倍。
- **MHA 到 GQA Uptraining**：将已有 MHA 模型的 $K, V$ 权重均值池化，仅用 5% 语料微调即可继承全部能力并获得 GQA 极速推理优势。

### 拓展阅读与学术文献
1. **Zhang & Sennrich (2019)**: *Root Mean Square Layer Normalization* (NeurIPS 2019)。
2. **Shazeer (2020)**: *GLU Variants Improve Transformer*。
3. **Ainslie et al. (2023)**: *GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints*。

### 知识总结与核心记忆要点
- **RMSNorm**：移除均值中心化，仅通过均方根归一化，性能持平而速度大幅飙升。
- **SwiGLU**：门控双线性乘法，用平滑的 SiLU 替代硬阈值，极大扩充特征表达容量。
- **GQA 哲学**：在 MHA 与 MQA 之间找到绝佳平衡点，解放 KV Cache 显存瓶颈。
- **工业新范式**：Pre-LN + RMSNorm + SwiGLU + RoPE + GQA 构成了现代顶级开源大模型的主干架构。"""

    l3_code = """import numpy as np

def silu(x):
    return x / (1.0 + np.exp(-np.clip(x, -15, 15)))

class RMSNormNumPy:
    def __init__(self, dim, eps=1e-6):
        self.eps = eps
        self.gamma = np.ones(dim)
        
    def forward(self, x):
        rms = np.sqrt(np.mean(x ** 2, axis=-1, keepdims=True) + self.eps)
        return (x / rms) * self.gamma

class SwiGLUNumPy:
    def __init__(self, d_model=16, d_ff=32):
        scale = np.sqrt(2.0 / (d_model + d_ff))
        self.W_g = np.random.randn(d_model, d_ff) * scale
        self.W_1 = np.random.randn(d_model, d_ff) * scale
        self.W_2 = np.random.randn(d_ff, d_model) * scale
        
    def forward(self, x):
        gate = silu(np.matmul(x, self.W_g))
        val = np.matmul(x, self.W_1)
        hidden = gate * val
        return np.matmul(hidden, self.W_2)

np.random.seed(42)
B, S, D = 2, 4, 16
x = np.random.randn(B, S, D)

rmsnorm = RMSNormNumPy(dim=D)
x_norm = rmsnorm.forward(x)
rms_val = np.sqrt(np.mean(x_norm ** 2, axis=-1))

swiglu = SwiGLUNumPy(d_model=D, d_ff=32)
out_ffn = swiglu.forward(x)

print(f"RMSNorm 归一化后的样本 RMS: {rms_val[0, 0]:.4f}")
print(f"SwiGLU 输出形状: {out_ffn.shape}")

assert np.isclose(rms_val[0, 0], 1.0, atol=0.05)
assert out_ffn.shape == (B, S, D)
print("测试通过：现代大模型标配 RMSNorm 与 SwiGLU 模块验证完全成功！")"""

    l3_tips = [
        tip("GQA 的根本价值在于缩减长序列推理时的 KV Cache 显存占用，从而提高并发吞吐，而非节省模型参数量。", "note"),
    ]

    lessons = [
        lesson("ml-tf-l4-1", "经典 Transformer 编码器-解码器架构与残差流", l1_text, 2, l1_tips, [demo(code=l1_code, title="Encoder-Decoder 交叉注意力机制前向验证")]),
        lesson("ml-tf-l4-2", "Pre-LN vs Post-LN 深度残差稳定性数学证明", l2_text, 3, l2_tips, [demo(code=l2_code, title="Pre-LN 与 Post-LN 深度堆叠前向稳定性对比")]),
        lesson("ml-tf-l4-3", "现代开源大模型标配：RMSNorm, SwiGLU 与 GQA", l3_text, 2, l3_tips, [demo(code=l3_code, title="纯 NumPy 手写 RMSNorm 与 SwiGLU 模块")]),
    ]

    exercises = [
        single_choice(
            ex_id="ml-tf-c4-ex1",
            question="在 Transformer 的 Encoder-Decoder 结构中，交叉注意力（Cross-Attention）层的 Q、K、V 分别来自何处？",
            options=[
                {"value": "A", "text": "Q 来自 Encoder，K 和 V 来自 Decoder"},
                {"value": "B", "text": "Q 来自 Decoder 当前层，K 和 V 来自 Encoder 的最终输出"},
                {"value": "C", "text": "Q、K、V 全部来自 Decoder 输入"},
                {"value": "D", "text": "Q 和 K 来自源语言，V 来自目标语言"},
            ],
            answer="B",
            explanation="交叉注意力中，Decoder 发出 Query（查询当前需要翻译什么），从 Encoder 提供的 Key（源语言索引）和 Value（源语言特征）中提取对齐信息。",
            difficulty=2,
            related_lesson_id="ml-tf-l4-1",
            tags=["交叉注意力", "Encoder-Decoder", "QKV来源"],
        ),
        multiple_choice(
            ex_id="ml-tf-c4-ex2",
            question="关于 Pre-LN 相比 Post-LN 的核心优势，下列阐述正确的有：",
            options=[
                {"value": "A", "text": "Post-LN 在残差相加后执行 LayerNorm，导致深层网络残差主干被打断，梯度随层数呈指数级不稳定"},
                {"value": "B", "text": "Pre-LN 将 LayerNorm 放置在各子层支路之前，使得残差主干保留了无阻碍的恒等梯度直通通道"},
                {"value": "C", "text": "采用 Pre-LN 架构可以大幅缩减甚至省略漫长的 Warmup 预热步长，极大提升超深模型的训练稳定性"},
                {"value": "D", "text": "Pre-LN 在计算完最后一层 Transformer 模块后，无需使用任何 Final LayerNorm 即可直接连接分类头"},
            ],
            answer=["A", "B", "C"],
            explanation="A、B、C 均为 Pre-LN 的核心优势与原理。D 选项错误，因为 Pre-LN 主干一直在累加，最后一层输出前必须显式补充一个 Final LayerNorm 进行尺度约束。",
            difficulty=2,
            related_lesson_id="ml-tf-l4-2",
            tags=["Pre-LN", "Post-LN", "梯度直通", "稳定性"],
        ),
        judge(
            ex_id="ml-tf-c4-ex3",
            question="GQA（Grouped-Query Attention）的主要设计目的是为了将模型的参数量压缩 90% 以上。",
            answer=False,
            explanation="错误。GQA 缩减的是 Key 和 Value 头的数量，这只改变注意力层不到 5% 的模型总参数量；其最根本的设计目的是为了将长文本推理阶段的 KV Cache 显存占用降低数倍并提升解码吞吐。",
            difficulty=2,
            related_lesson_id="ml-tf-l4-3",
            tags=["GQA", "KVCache", "显存瓶颈"],
        ),
        fill(
            ex_id="ml-tf-c4-ex4",
            question="与标准 LayerNorm 相比，RMSNorm 移除了对数据计算和减去____（填'均值'或'方差'）的步骤，仅依赖均方根进行缩放，从而显著降低了计算与显存访存开销。",
            blanks=[["均值"]],
            explanation="RMSNorm 证明了中心化（减去均值）对模型效果贡献微弱，故仅保留均方根缩放。",
            difficulty=1,
            related_lesson_id="ml-tf-l4-3",
            tags=["RMSNorm", "LayerNorm", "计算优化"],
        ),
        open_ex(
            ex_id="ml-tf-c4-ex5",
            question="用简明数学推导说明：为什么 Pre-LN 结构能够保证深层网络在反向传播时始终拥有不衰减的恒等梯度直通？",
            reference_answer="推导过程：\n1. Pre-LN 的前向递推为 x_L = x_l + \\sum_{i=l}^{L-1} F_i(LN(x_i))；\n2. 计算损失 \\mathcal{L} 对底层输入 x_l 的偏导数：\\frac{\\partial \\mathcal{L}}{\\partial x_l} = \\frac{\\partial \\mathcal{L}}{\\partial x_L} \\cdot \\frac{\\partial x_L}{\\partial x_l}；\n3. 展开 \\frac{\\partial x_L}{\\partial x_l} 可得：\\mathbf{I} + \\sum_{i=l}^{L-1} \\frac{\\partial F_i}{\\partial x_l}；\n4. 括号内的单位阵 \\mathbf{I} 使得梯度公式中出现了一项独立的 \\frac{\\partial \\mathcal{L}}{\\partial x_L} · \\mathbf{I} = \\frac{\\partial \\mathcal{L}}{\\partial x_L}；\n5. 这保证了顶层梯度无论跨越多少层，都能以常数 1 的无损强度直接回传到底层，杜绝了梯度弥散。",
            explanation="恒等残差项提供了零阻碍的梯度高速通道。",
            rubric=[
                {"points": 5, "description": "写出递推展开式并推导求导后出现的单位阵 I"},
                {"points": 5, "description": "说明该单位阵保证了顶层梯度直接无损回传至底层"},
            ],
            difficulty=3,
            related_lesson_id="ml-tf-l4-2",
            tags=["Pre-LN数学证明", "恒等映射", "链式法则"],
        ),
        # ── Code Exercise 4 ──
        {
            "id": "ml-tf-c4-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】手写纯 NumPy RMSNorm 归一化层：\n编写函数 `rmsnorm_forward(x, gamma, eps=1e-6)`：\n1. 计算均方根：$\\text{RMS}(x) = \\sqrt{\\text{mean}(x^2) + \\epsilon}$；\n2. 归一化输出：$(x / \\text{RMS}(x)) \\odot \\gamma$；\n3. 返回计算后的数组。\n\n最后一行请以给定的 x, gamma 数组调用测试。",
            "starterCode": "import numpy as np\n\ndef rmsnorm_forward(x: np.ndarray, gamma: np.ndarray, eps: float = 1e-6) -> np.ndarray:\n    \"\"\"实现 RMSNorm 前向归一化\"\"\"\n    # 请在此实现\n    ___\n\nx = np.array([[2.0, -2.0, 2.0, -2.0]])\ngamma = np.ones(4)\nout = rmsnorm_forward(x, gamma)\nprint(out.shape)\n",
            "setupCode": "",
            "expectedOutput": "(1, 4)",
            "answer": "import numpy as np\n\ndef rmsnorm_forward(x: np.ndarray, gamma: np.ndarray, eps: float = 1e-6) -> np.ndarray:\n    rms = np.sqrt(np.mean(x ** 2, axis=-1, keepdims=True) + eps)\n    return (x / rms) * gamma\n\nx = np.array([[2.0, -2.0, 2.0, -2.0]])\ngamma = np.ones(4)\nout = rmsnorm_forward(x, gamma)\nprint(out.shape)\n",
            "tests": "x_t = np.array([[3.0, 4.0]]) # 均方根 sqrt((9+16)/2) = sqrt(12.5) ≈ 3.5355\nout_t = rmsnorm_forward(x_t, np.ones(2))\nassert np.isclose(out_t[0, 0], 3.0 / np.sqrt(12.5)), f\"RMSNorm 数值不匹配: {out_t}\"\n",
            "explanation": "沿最后一个特征维度计算均方根，并将输入向量除以均方根后乘以仿射参数 gamma。",
            "tags": ["RMSNorm", "归一化", "均方根", "算法实战"],
            "related_lesson_id": "ml-tf-l4-3",
        },
    ]

    return chapter(
        chapter_id="ml-tf-c4",
        course_id="ml-transformer-llm",
        order=4,
        title="Transformer 整体架构与现代变体",
        goal="系统掌握 Transformer 拓扑结构设计：从 Encoder-Decoder 与残差流，到现代主流 Pre-LN、RMSNorm、SwiGLU 与 GQA 范式。",
        lessons=lessons,
        exercises=exercises,
    )
