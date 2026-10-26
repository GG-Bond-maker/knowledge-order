# -*- coding: utf-8 -*-
"""
Chapter 3: 参数高效微调技术 (PEFT: LoRA & QLoRA)
Course: ml-llm-applications
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_3():
    # ── Lesson 3.1 ──
    l1_text = """### 学习目标
学完本节，你应该能够：
1. 掌握大语言模型全量参数微调（Full Fine-Tuning）的显存占用严格推导与算力瓶颈；
2. 理解内在维度假说（Intrinsic Rank Hypothesis）与参数高效微调（PEFT）的理论根基；
3. **深入推导 LoRA（低秩自适应）的数学机理**：权重旁路分解、参数初始化策略与缩放因子 $\\frac{\\alpha}{r}$；
4. 掌握 LoRA 在模型推理部署时的零延迟权重合并（Weight Merging）原理；
5. 编写纯 Python/NumPy 代码从零实现 LoRA 线性层前向计算与参数合并。

### 前置知识
- 线性代数：矩阵的秩（Rank）与低秩近似；
- 优化器状态：AdamW 一阶动量与二阶动量显存开销。

### 问题背景与 ML 用途
虽然通过 Prompt Engineering 可以完成很多任务，但在特定专业垂直领域（如医疗诊断、金融合规审查、特定代码框架）、或者需要极度严格的输出风格对齐时，必须对模型进行**监督微调（Supervised Fine-Tuning, SFT）**。
- **全量微调的显存噩梦**：如果要全量微调一个 70B（700 亿参数）的开源大模型，不仅要存储 70B 的半精度权重（140 GB），还要保存 140 GB 的反向传播梯度，以及 AdamW 优化器庞大的动量状态（至少 560 GB）！再加上前向激活值，总显存开销突破 **1200 GB**，至少需要由多台 8 卡 A100/H100 组成的高性能算力集群，普通企业和个人开发者根本无法承受；
- 2021 年微软提出的 **LoRA（Low-Rank Adaptation）** 彻底颠覆了微调范式：它冻结原模型全部预训练权重，仅在注意力矩阵旁边引入两个极低维度的旁路矩阵。可训练参数量从 100% 锐减到 **0.1% 甚至 0.01%**，显存开销降低 70% 以上，让大模型微调飞入寻常百姓家。

### 直觉理解
- **原装大书与便签纸注记（LoRA 的直觉）**：
  - 预训练模型就像一本几千页的原版大英百科全书（极其厚重，不允许在上面涂改，参数全部冻结）；
  - 全量微调相当于要求你为了补充某个小村庄的特产信息，把整本几千页的百科全书从头到尾重新手抄一遍（极度昂贵，浪费巨大）；
  - **LoRA 的做法极其聪明**：原书原封不动，遇到特定章节时，只在书页空白处贴上一张小巧精致的**便签纸（低秩矩阵 $\\Delta W = B \\times A$）**，上面只记录该领域的几句增量修正！
  - 读者看书时，把原书内容和便签纸上的注记加在一起看即可；若要出版定制版（上线部署），直接把便签纸的内容印回新版书里（权重合并），没有哪怕一丝一毫的额外翻书延迟！

### 核心概念与符号对照表
| 核心概念 | 数学表达 | 维度形状 | 核心作用与设定 |
| --- | --- | --- | --- |
| **原始冻结权重** | $W_0$ | $(d_{\\text{out}}, d_{\\text{in}})$ | 保持预训练基础语言知识，训练时不产生任何梯度 |
| **低秩降维矩阵 $A$** | $A$ | $(r, d_{\\text{in}})$ | 使用高斯随机数 $\\mathcal{N}(0, \\sigma^2)$ 初始化，将特征降维至 $r$ |
| **低秩升维矩阵 $B$** | $B$ | $(d_{\\text{out}}, r)$ | **全零初始化（初始化为 0）**，保证训练起点增量 $\\Delta W = 0$ |
| **LoRA 秩 (Rank)** | $r$ | 标量超参数（通常为 8, 16, 32） | 远小于原始特征维度 $r \\ll \\min(d_{\\text{in}}, d_{\\text{out}})$ |
| **缩放常数** | $\\frac{\\alpha}{r}$ | 标量因子（常取 $\\alpha = 2r$） | 稳定超参数调优，改变秩 $r$ 时无需重新调大学习率 |

### 数学原理与逐步推导
#### 1. 全量微调显存组成的严密推导
设模型包含 $N$ 个参数。在混合精度（FP16/BF16）训练下，显存主要由四大模块组成：
1. **模型权重（Weights）**：每个参数占 2 字节 $\\to 2N$ 字节；
2. **梯度（Gradients）**：每个参数占 2 字节 $\\to 2N$ 字节；
3. **AdamW 优化器状态（Optimizer States）**：
   - FP32 主权重副本：每个参数 4 字节；
   - FP32 一阶动量（Momentum）：每个参数 4 字节；
   - FP32 二阶动量（Variance）：每个参数 4 字节；
   - 优化器状态小计：每个参数 $12$ 字节 $\\to 12N$ 字节！
4. **总静态显存**（未计入激活值）：
   $$\\text{Memory}_{\\text{static}} = 2N + 2N + 12N = 16N \\text{ 字节}$$
对于 70B 模型，$16 \\times 70 \\times 10^9 \\approx 1120 \\text{ GB}$！而在 LoRA 中，仅对千分之一的参数更新梯度和保存优化器状态，优化器显存近乎归零。

#### 2. LoRA 数学公式与初始化
给定一个线性层前向映射 $h = W_0 x$。
LoRA 修改其前向计算为：
$$h = W_0 x + \\Delta W x = W_0 x + \\frac{\\alpha}{r} (B A) x$$
其中：
- $W_0 \\in \\mathbb{R}^{d \\times k}$ 被完全冻结（`requires_grad = False`）；
- $A \\in \\mathbb{R}^{r \\times k}$，参数初始化为正态分布：$A_{ij} \\sim \\mathcal{N}(0, 1/r)$；
- $B \\in \\mathbb{R}^{d \\times r}$，参数**必须初始化为严格的全零矩阵**：$B_{ij} = 0$。
**关键设计**：在训练开始的第 0 步，增量矩阵：
$$\\Delta W = \\frac{\\alpha}{r} B A = \\frac{\\alpha}{r} \\times 0 \\times A = 0$$
这使得在微调开始的瞬间，模型完全没有任何随机初始化的噪声扰动，其输出与未经微调的高质量预训练模型**100% 绝对等价**！

#### 3. 部署期零延迟权重合并（Zero Latency Deployment）
在训练完成后，如果要将模型推向线上服务，我们绝不需要在推理时让 GPU 每次都执行两次独立的矩阵乘法。
只需在离线加载模型时，执行一次简单的张量加法：
$$W_{\\text{merged}} = W_0 + \\frac{\\alpha}{r} (B A)$$
将 $W_{\\text{merged}}$ 存盘并直接替换原本的线性层。线上推理时结构与原模型完全一致，**计算延迟增加为 0，显存占用增加为 0**！

### 架构图解：LoRA 线性层计算拓扑
```
               输入 x: (Batch, SeqLen, d_in)
                        │
         ┌──────────────┴──────────────┐
         │ (主干路径: 权重完全冻结)    │ (LoRA 旁路: 仅微调低秩小矩阵)
         ▼                             ▼
   [ W_0 (d_out, d_in) ]         [ A (r, d_in) ]  <-- 高斯初始化降维
         │                             │
         │                             ▼
         │                       [ B (d_out, r) ] <-- 全零初始化升维
         │                             │
         │                             ▼
         │                       × (α / r) 缩放
         │                             │
         └──────────────┬──────────────┘
                        ▼ + 逐元素相加
               最终输出 h: (Batch, SeqLen, d_out)
```

### Python 代码实现与实验验证
下面的代码展示纯 NumPy 手写的 LoRA 线性层，验证其前向计算与权重合并后的数值绝对等价性。"""

    l1_code = """import numpy as np

class LoRALinearNumPy:
    def __init__(self, d_in, d_out, r=4, lora_alpha=8.0):
        self.d_in = d_in
        self.d_out = d_out
        self.r = r
        self.scaling = lora_alpha / r
        
        # 1. 冻结的主干原始权重 W_0
        np.random.seed(42)
        self.W_0 = np.random.randn(d_out, d_in) * 0.1
        
        # 2. LoRA 旁路可训练矩阵: A 高斯初始化, B 全零初始化
        self.A = np.random.randn(r, d_in) * (1.0 / np.sqrt(r))
        self.B = np.zeros((d_out, r))
        
    def forward(self, x):
        \"\"\"x 形状: (batch_size, d_in)\"\"\"
        # 主干输出: x @ W_0.T
        base_out = np.matmul(x, self.W_0.T)
        # 旁路输出: x @ A.T @ B.T * scaling
        lora_out = np.matmul(np.matmul(x, self.A.T), self.B.T) * self.scaling
        return base_out + lora_out
        
    def merge_weights(self):
        \"\"\"将 LoRA 权重离线合并到 W_0 中，实现零延迟推理\"\"\"
        delta_W = (self.B @ self.A) * self.scaling
        return self.W_0 + delta_W

# 验证 LoRA 初始化与前向逻辑
d_in, d_out, r = 8, 16, 4
lora_layer = LoRALinearNumPy(d_in, d_out, r=r)
x = np.random.randn(2, d_in)

# 1. 验证初始化时 delta_W 是否为 0
out_init = lora_layer.forward(x)
out_base_only = np.matmul(x, lora_layer.W_0.T)
assert np.allclose(out_init, out_base_only), "初始阶段 LoRA 输出应与原冻结模型绝对相同"

# 2. 模拟训练更新: 给 B 赋予非零梯度更新值
lora_layer.B = np.random.randn(d_out, r) * 0.05
out_trained = lora_layer.forward(x)

# 3. 验证合并权重后的单次矩阵乘法是否与双路前向严格等价
W_merged = lora_layer.merge_weights()
out_merged = np.matmul(x, W_merged.T)

print(f"原始主权重形状: {lora_layer.W_0.shape}")
print(f"LoRA A 矩阵参数量: {lora_layer.A.size}, B 矩阵参数量: {lora_layer.B.size}")
print(f"双路计算与合并后单矩阵计算的最大绝对误差: {np.max(np.abs(out_trained - out_merged)):.10e}")

assert np.allclose(out_trained, out_merged, atol=1e-7), "权重合并后输出必须与双路前向绝对一致"
print("测试通过：LoRA 初始化、低秩前向计算与零延迟权重合并完全成立！")"""

    l1_tips = [
        tip("LoRA 的矩阵 B 必须初始化为全零，矩阵 A 采用小方差高斯初始化；若将 B 也随机初始化，训练伊始模型的预训练能力会被严重破坏。", "pitfall"),
    ]

    # ── Lesson 3.2 ──
    l2_text = """### 学习目标
学完本节，你应该能够：
1. 深入掌握 QLoRA（Dettmers et al., 2023）如何实现单张 24GB 消费级显卡微调 33B~65B 大模型；
2. 掌握 **4-bit NormalFloat (NF4)** 数据类型的数学设计与高斯最优分位数构建；
3. 掌握**双重量化（Double Quantization, DQ）**对量化常数二次压缩的节省原理；
4. 理解**分页优化器（Paged Optimizers）**利用主机 CPU 内存防显存峰值 OOM 的机制；
5. 编写代码模拟 NormalFloat 分位数量化与反量化误差计算。

### 前置知识
- 浮点数与整型量化基础（Scale 与 Zero-point）；
- 高斯正态分布累积分布函数（CDF）。

### 问题背景与 ML 用途
虽然 LoRA 成功把梯度与优化器状态的显存开销消减了 99%，但是**模型本身的静态权重参数依然需要占用大量显存**。
- 例如一个 65B 的模型，即使使用 16-bit 浮点数加载冻结权重，光是把这套权重塞进显卡，就需要 $65 \\times 2 \\text{ GB} = 130 \\text{ GB}$ 显存，至少需要两张 80GB 的 A100！
- **消费级显卡（如 24GB 显存的 RTX 3090/4090）的平民化微调梦想**：能否把这 130 GB 的基础权重直接压缩为 4-bit 精度加载（仅需约 35 GB 甚至更小），同时在此基础上继续挂载 LoRA 适配器进行反向传播训练？
- 传统 4-bit 整数直接量化会导致模型灾难性精度崩塌。2023 年华盛顿大学 Dettmers 等人发表了轰动学术与工业界的 **QLoRA**，通过 **NF4（NormalFloat4）**、**双重量化（Double Quantization）** 和 **分页优化器（Paged Optimizers）** 三大杀手锏，不仅成功把显存压到了极限，甚至在多个基准评测上**完全达到了与 16-bit 全精度 LoRA 毫无二致的微调表现**！

### 直觉理解
- **量身定做的阶梯（NF4 的直觉）**：
  - 传统的 4-bit 均匀整数（INT4）就像普通的楼梯台阶：把区间 $[-1, 1]$ 均匀切成 16 等份。每个台阶宽度一模一样；
  - 但深度神经网络经过海量预训练后，权重绝不是均匀分布的，而是高度聚集在 0 附近的**标准正态正态分布**（99% 的数值都挤在 $[-0.5, 0.5]$ 之间，极少数在边缘）；
  - 用等宽楼梯去度量高斯分布，中间极密区域的分辨率被严重浪费，边缘稀疏区域却占了一堆台阶；
  - **NF4 极其聪明**：根据正态分布的密度曲面来设计台阶！中间密集的地方台阶密密麻麻（超高分辨率），两边稀疏的地方台阶宽阔。16 个离散点每个都承载完全相同的信息熵，精度直接逼近 16 位浮点数！

### 核心概念与符号对照表
| QLoRA 核心三大技术 | 技术原理 | 显存与工程收益 |
| --- | --- | --- |
| **4-bit NormalFloat (NF4)** | 利用标准正态分布等面积分位数划分的 16 个理论最优离散点 | 无损压缩基础权重，显存直接压缩至原本的 25% |
| **双重量化 (Double Quant)** | 对第 1 次量化产生的 FP32 缩放常数（Scale）再进行一次 8-bit 量化 | 平均每个参数再挤出 0.37 字节显存（65B 模型省出 3GB） |
| **分页优化器 (Paged Optimizers)** | 借助 CUDA 统一内存，在长文本激活峰值时将优化器自动换入 CPU 内存 | 彻底杜绝训练偶发性显存尖峰导致的 OOM 崩溃 |

### 数学原理与逐步推导
#### 1. 4-bit NormalFloat (NF4) 最优分位数推导
设预训练神经网络权重通过绝对最大值归一化至 $[-1, 1]$ 区间，且服从标准正态分布 $X \\sim \\mathcal{N}(0, 1)$。
4-bit 数据类型恰好拥有 $2^4 = 16$ 个离散取值。
为了使每个量化桶包含完全相等的信息熵，量化网格点 $q_i$ 必须由标准正态分布的累积分布函数（CDF）的等距分位数决定：
$$q_i = \\frac{1}{2} \\left( Q_X\\left(\\frac{i}{2^k}\\right) + Q_X\\left(\\frac{i+1}{2^k}\\right) \\right), \\quad i = 0, 1, \\dots, 2^k - 1$$
其中 $Q_X(\\cdot) = \\Phi^{-1}(\\cdot)$ 是标准正态分布的反累积分布函数（分位数函数）。
特别地，由于神经元需要精确的数值 0，算法对正负半轴分别进行对称分位，使得 16 个点中严格包含精确的数值 `0.0`。

#### 2. 双重量化（Double Quantization, DQ）推导
在对权重张量进行块量化（Block-wise Quantization，块大小如 $B_1 = 64$）时，每个块必须附带一个 32-bit 的浮点缩放常数 $c_1$。
该常数自身带来的额外显存开销为：$\\frac{32}{64} = 0.5$ 字节/参数。
双重量化对这批常数 $c_1$ 再次施加块大小为 $B_2 = 256$ 的 8-bit FP8 量化：
$$\\text{Memory}_{\\text{scales}} = \\frac{8}{64} + \\frac{32}{64 \\times 256} \\approx 0.125 + 0.002 = 0.127 \\text{ 字节/参数}$$
每参数净省出 $0.5 - 0.127 = 0.373$ 字节显存！

### 常见认知误区与避坑指南
1. **误以为 QLoRA 中 LoRA 的适配器权重也是 4-bit 的**：**绝对不是！** 在 QLoRA 中，**被冻结的基础权重 $W_0$ 采用 4-bit NF4 格式存储在显存中**；但当进行矩阵乘法前向计算时，当前计算块在 GPU 共享内存中被临时动态反量化（Dequantize）回 16-bit 浮点数，与 16-bit 的输入向量做乘法；**挂载的 LoRA 旁路矩阵 $A$ 和 $B$ 以及反向传播梯度全程保持标准的 16-bit 浮点精度**！
2. **误以为 QLoRA 的训练速度比普通 LoRA 更快**：QLoRA 节约的是**显存（Memory Footprint）**，而不是算力！由于每次前向和反向计算都要实时进行 4-bit 到 16-bit 的动态反量化（Dequantization），QLoRA 的单步前向耗时通常比全精度 LoRA 慢 20%~30%。这是极其划算的用微弱时间开销换取显存断崖式下跌的工程奇迹。

### 工业级工程实践
- **bitsandbytes 库的使用范式**：在现代 HuggingFace 生态中，开启 QLoRA 仅需几行配置：
  ```python
  from transformers import BitsAndBytesConfig
  bnb_config = BitsAndBytesConfig(
      load_in_4bit=True,
      bnb_4bit_quant_type="nf4",
      bnb_4bit_use_double_quant=True,
      bnb_4bit_compute_dtype=torch.bfloat16
  )
  ```
  结合 PEFT 库即可直接在消费级显卡上微调 LLaMA-3 等现代顶级开源模型。

### 拓展阅读与学术文献
1. **Dettmers et al. (2023)**: *QLoRA: Efficient Finetuning of Quantized LLMs* (NeurIPS 2023) — 划时代的平民化微调论文。
2. **Hu et al. (2021)**: *LoRA: Low-Rank Adaptation of Large Language Models* (ICLR 2022)。

### 知识总结与核心记忆要点
- **QLoRA 价值**：打破显存死锁，使单张 24GB 消费卡微调 33B~65B 模型成为现实。
- **NF4 核心**：高斯正态等信息熵分位数，精度全面碾压标准 INT4。
- **动态反量化**：4-bit 仅用于存储，计算与 LoRA 适配器保持 16-bit 高精度。"""

    l2_code = """import numpy as np

# NF4 理论 16 个分位数常数表 (Dettmers et al., 2023)
NF4_QUANTILE_TABLE = np.array([
    -1.0, -0.6961928009986877, -0.5250730514526367, -0.39491748809814453,
    -0.28444138169288635, -0.18477343022823334, -0.09105003625154495, 0.0,
    0.07958029955625534, 0.16093020141124725, 0.24611230194568634, 0.33791524171829224,
    0.44070982933044434, 0.5626170039176941, 0.7229568362236023, 1.0
])

def quantize_nf4(weights):
    \"\"\"模拟 4-bit NormalFloat 量化: 映射到最接近的 NF4 索引\"\"\"
    # 绝对最大值归一化至 [-1, 1]
    abs_max = np.max(np.abs(weights))
    normalized = weights / abs_max
    
    # 广播计算与 16 个分位数格点的距离并寻找最近索引
    dists = np.abs(normalized[:, np.newaxis] - NF4_QUANTILE_TABLE[np.newaxis, :])
    quant_indices = np.argmin(dists, axis=-1) # 4 位整数索引 (0 到 15)
    return quant_indices, abs_max

def dequantize_nf4(quant_indices, abs_max):
    \"\"\"反量化还原为浮点数\"\"\"
    return NF4_QUANTILE_TABLE[quant_indices] * abs_max

# 模拟服从高斯分布的预训练神经元权重
np.random.seed(42)
weights = np.random.randn(100) * 0.5

# 执行 NF4 量化与动态反量化
indices, scale = quantize_nf4(weights)
dequantized_weights = dequantize_nf4(indices, scale)

mae_error = float(np.mean(np.abs(weights - dequantized_weights)))
print(f"原始权重平均幅度: {np.mean(np.abs(weights)):.4f}")
print(f"NF4 4-bit 量化/反量化平均绝对误差: {mae_error:.6f}")

assert np.all(indices >= 0) and np.all(indices <= 15), "索引必须严格在 4-bit (0~15) 范围内"
assert mae_error < 0.05, "NF4 应保持极低的反量化精度损失"
print("测试通过：4-bit NormalFloat 分位数量化与反量化精度验证完全通过！")"""

    l2_tips = [
        tip("QLoRA 计算时依然采用 16-bit 浮点数，4-bit 纯粹用于节省底座权重的显存存储，不可将梯度和优化器也硬压缩为 4 位。", "pitfall"),
    ]

    lessons = [
        lesson("ml-app-l3-1", "全量微调显存瓶颈与低秩自适应", l1_text, 2, l1_tips, [demo(code=l1_code, title="LoRA 线性层低秩计算与离线无损合并测试")]),
        lesson("ml-app-l3-2", "QLoRA 与 4-bit 量化微调", l2_text, 3, l2_tips, [demo(code=l2_code, title="4-bit NormalFloat (NF4) 高斯分位数量化误差分析")]),
    ]

    exercises = [
        single_choice(
            ex_id="ml-app-c3-ex1",
            question="在 LoRA（低秩自适应）微调算法中，为什么矩阵 B 必须初始化为全零矩阵，而矩阵 A 采用随机高斯初始化？",
            options=[
                {"value": "A", "text": "为了使微调训练开始时增量矩阵 Delta W = B * A 严格为 0，保证初始模型输出与预训练基础模型 100% 保持一致"},
                {"value": "B", "text": "因为 Python 在处理全零矩阵时能够自动启用 GPU 的无感加速"},
                {"value": "C", "text": "为了防止反向传播时矩阵 A 发生除零浮点异常"},
                {"value": "D", "text": "因为矩阵 B 在训练全过程中都不会更新梯度"},
            ],
            answer="A",
            explanation="若 B 和 A 均为随机初始化，训练伊始模型输出会被巨大的随机噪声打乱，破坏预训练模型的先验表征。将 B 置 0 使得 Delta W 初始为零矩阵，实现平滑稳定的渐进微调启动。",
            difficulty=2,
            related_lesson_id="ml-app-l3-1",
            tags=["LoRA", "参数初始化", "低秩分解"],
        ),
        multiple_choice(
            ex_id="ml-app-c3-ex2",
            question="关于 QLoRA 算法的技术突破与运行机制，下列叙述正确的有：",
            options=[
                {"value": "A", "text": "NF4（NormalFloat4）根据标准正态分布的等信息熵分位数构建量化网格，理论精度显著高于普通均匀 INT4 量化"},
                {"value": "B", "text": "在进行前向矩阵乘法时，被 4-bit 存储的冻结基础权重会被实时动态反量化为 16-bit 浮点数参与计算"},
                {"value": "C", "text": "挂载的 LoRA 旁路可训练适配器参数以及反向传播梯度全程维持标准的 16-bit 浮点精度"},
                {"value": "D", "text": "QLoRA 的训练速度比全精度 16-bit LoRA 还要快 2 倍以上"},
            ],
            answer=["A", "B", "C"],
            explanation="A、B、C 均为 QLoRA 的核心机制。D 选项错误，因为频繁的 4-bit 到 16-bit 动态反量化开销，QLoRA 训练耗时通常比全精度 LoRA 慢 20%~30%，它是用算力时间换取显存大幅度压缩。",
            difficulty=2,
            related_lesson_id="ml-app-l3-2",
            tags=["QLoRA", "NF4", "显存优化", "动态反量化"],
        ),
        judge(
            ex_id="ml-app-c3-ex3",
            question="使用 LoRA 训练完成后的模型，在推向线上生产环境进行推理部署时，必须在每个网络层中保留两条独立的计算分支，无法合并为单矩阵。",
            answer=False,
            explanation="错误。LoRA 的核心优势之一正是部署零延迟：上线前通过 W_deploy = W_0 + (alpha/r)*B*A 将权重直接离线加合到主干权重中，推理时完全恢复为普通的单矩阵乘法，没有任何额外开销。",
            difficulty=1,
            related_lesson_id="ml-app-l3-1",
            tags=["LoRA合并", "推理延迟", "生产部署"],
        ),
        fill(
            ex_id="ml-app-c3-ex4",
            question="QLoRA 中对量化缩放常数自身进行二次量化压缩的技术被称为____量化。（填两个汉字）",
            blanks=[["双重"]],
            explanation="该技术称为双重量化（Double Quantization, DQ）。",
            difficulty=1,
            related_lesson_id="ml-app-l3-2",
            tags=["双重量化", "DQ", "QLoRA"],
        ),
        open_ex(
            ex_id="ml-app-c3-ex5",
            question="严密推导并列出在 AdamW 混合精度训练下一个拥有 N 个参数的模型所需要的静态显存构成，并解释为什么 LoRA 能够将这部分显存开销削减 90% 以上？",
            reference_answer="显存构成推导与分析：\n1. 混合精度（FP16/BF16）全量微调静态显存构成：\n- 模型权重（FP16）：2N 字节；\n- 梯度（FP16）：2N 字节；\n- AdamW 优化器状态：包含 FP32 主权重副本（4N 字节）、一阶动量（4N 字节）、二阶动量（4N 字节），合计 12N 字节；\n- 总静态显存 = 2N + 2N + 12N = 16N 字节（若算入激活值峰值甚至可达 18N~20N 字节）；\n2. LoRA 削减 90% 显存的机理：\n- LoRA 将占总参数量 99.9% 的原模型权重 W_0 完全冻结，这部分参数不需要计算梯度，更不需要分配任何 AdamW 动量（省去了 2N + 12N 字节中的绝大部分）；\n- 仅有极少量的低秩适配器参数（通常占比 0.01%~0.1%）需要维护梯度和优化器状态；\n- 使得训练时的显存占用几乎仅取决于只读的基础权重本身与前向激活值，实现了显存占用的断崖式暴降。",
            explanation="详细拆解模型权重、梯度与优化器动量的 16N 字节公式，并指出 LoRA 冻结底座消除大部分梯度与动量的原理。",
            rubric=[
                {"points": 5, "description": "给出 16N 字节显存构成的具体推导（权重 2N、梯度 2N、优化器 12N）"},
                {"points": 5, "description": "阐明 LoRA 冻结参数使得 99.9% 的权重无需维护梯度和优化器状态从而大幅节约显存"},
            ],
            difficulty=3,
            related_lesson_id="ml-app-l3-1",
            tags=["显存推导", "AdamW开销", "LoRA优势"],
        ),
        # ── Code Exercise 3 ──
        {
            "id": "ml-app-c3-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】实现 LoRA 权重离线合并函数：\n编写函数 `merge_lora_weights(w0, lora_a, lora_b, alpha, r)`：\n1. `w0`: (d_out, d_in) 原冻结权重 NumPy 数组；\n2. `lora_a`: (r, d_in) 降维矩阵；\n3. `lora_b`: (d_out, r) 升维矩阵；\n4. `alpha`, `r`: 缩放系数；\n5. 计算并返回合并后的新权重矩阵：$W = W_0 + \\frac{\\alpha}{r} (B A)$（四舍五入保留 4 位小数）。\n\n最后一行请以给定的数组调用测试。",
            "starterCode": "import numpy as np\n\ndef merge_lora_weights(w0: np.ndarray, lora_a: np.ndarray, lora_b: np.ndarray, alpha: float, r: int) -> np.ndarray:\n    \"\"\"实现 LoRA 权重合并\"\"\"\n    # 请在此实现\n    ___\n\nw0 = np.array([[1.0, 2.0], [3.0, 4.0]])\nla = np.array([[1.0, 0.0]]) # r=1, d_in=2\nlb = np.array([[0.5], [1.0]]) # d_out=2, r=1\nres = merge_lora_weights(w0, la, lb, alpha=2.0, r=1)\nprint(res[0, 0])\n",
            "setupCode": "",
            "expectedOutput": "2.0",
            "answer": "import numpy as np\n\ndef merge_lora_weights(w0: np.ndarray, lora_a: np.ndarray, lora_b: np.ndarray, alpha: float, r: int) -> np.ndarray:\n    scaling = alpha / r\n    delta_w = np.matmul(lora_b, lora_a) * scaling\n    return np.round(w0 + delta_w, 4)\n\nw0 = np.array([[1.0, 2.0], [3.0, 4.0]])\nla = np.array([[1.0, 0.0]])\nlb = np.array([[0.5], [1.0]])\nres = merge_lora_weights(w0, la, lb, alpha=2.0, r=1)\nprint(res[0, 0])\n",
            "tests": "w_test = merge_lora_weights(np.zeros((2, 2)), np.ones((1, 2)), np.ones((2, 1)), alpha=1.0, r=1)\nassert np.allclose(w_test, np.ones((2, 2))), f\"LoRA 矩阵合并结果不匹配: {w_test}\"\n",
            "explanation": "利用矩阵乘法 B @ A 结合 alpha/r 缩放系数算出增量 Delta W，与原权重 W_0 相加完成合并。",
            "tags": ["LoRA合并", "矩阵运算", "PEFT", "算法实战"],
            "related_lesson_id": "ml-app-l3-1",
        },
    ]

    return chapter(
        chapter_id="ml-app-c3",
        course_id="ml-llm-applications",
        order=3,
        title="参数高效微调技术",
        goal="系统掌握大模型微调显存构成推导，深入 LoRA 旁路低秩分解与零延迟合并，精通 QLoRA 4-bit NF4 突破显存瓶颈的平民微调技术。",
        lessons=lessons,
        exercises=exercises,
    )
