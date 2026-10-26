# -*- coding: utf-8 -*-
"""
Chapter 4: 模型量化、推理加速与服务化部署 (Quantization, KV Cache & vLLM)
Course: ml-llm-applications
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_4():
    # ── Lesson 4.1 ──
    l1_text = """### 学习目标
学完本节，你应该能够：
1. 掌握训练后量化（Post-Training Quantization, PTQ）的理论基础与映射公式；
2. 深刻理解大语言模型规模膨胀带来的**激活值异常值（Activation Outliers）**对整型量化的破坏机制；
3. 掌握 **SmoothQuant** 通过等价数学缩放将量化难度从激活平滑迁移至权重的推导证明；
4. 理解 **AWQ（Activation-aware Weight Quantization）** 保护显著权重通道（Salient Weights）的优化思想；
5. 编写纯 Python 代码实现对称线性量化与反量化函数。

### 前置知识
- 浮点数表示与截断舍入；
- 矩阵乘法结合律与对角阵缩放性质。

### 问题背景与 ML 用途
大语言模型动辄几十 GB 甚至几百 GB 的参数量，给线上部署带来了严峻的**硬件门槛与商业成本危机**。
- **全精度运行的昂贵代价**：一个 70B 模型以 16-bit 浮点数（FP16/BF16）加载需要 140 GB 显存，两张顶级 80GB A100 显卡只能勉强把模型装下，根本留不出显存并发服务更多用户；
- **量化（Quantization）是工业落地的降本利器**：将 16-bit 浮点数压缩为 8-bit 甚至 4-bit 定点整数。显存直接缩减 50%~75%，原本需要 8 张显卡才能跑的模型，压缩后仅用 2 张甚至单张显卡就能极速运行；
- 传统的计算机视觉小模型可以直接进行 INT8 简单量化；但研究表明，当语言模型参数规模超过 6.7B 时，模型内部会涌现出系统性的“激活值异常通道（Activation Outliers）”，直接导致普通量化精度断崖式雪崩。**SmoothQuant** 与 **AWQ** 算法的诞生，成功解决了这一世界级工业难题。

### 直觉理解
- **软硬兼施的挤压术（SmoothQuant 的直觉）**：
  - 矩阵乘法 $Y = X \\cdot W$ 涉及两个参与者：激活矩阵 $X$（随着每句话动态变化，且某些神经元异常激增，极其硬、难量化）；权重矩阵 $W$（静态已知，分布均匀，很软、极易量化）；
  - 传统方案试图硬啃激活矩阵 $X$，结果硌坏了牙齿（精度崩溃）；
  - **SmoothQuant 的妙招**：既然 $X$ 太硬而 $W$ 还有很大的压缩余量，我们找一个平衡比例系数 $s$：把 $X$ 除以 $s$（把激活值的异常尖刺压平），同时把 $W$ 乘以 $s$（让权重矩阵稍微承担一点点尖刺）。通过两者的内部等价中和，两边都变得温和适中，INT8 量化轻松过关！

### 核心概念与符号对照表
| 量化方案 | 作用对象 | 核心技术亮点 | 精度保留与显存收益 |
| --- | --- | --- | --- |
| **标准 INT8 PTQ** | 权重与激活 | 线性极值缩放（Min-Max / AbsMax） | 模型超过 6.7B 时精度严重崩溃 |
| **SmoothQuant** | 激活向权重迁移 | 引入对角缩放阵 $S$ 平滑异常值通道 | 实现 W8A8（权重与激活全 INT8）加速与精度零损耗 |
| **AWQ** | 仅量化权重 (W4A16) | 观察激活分布，保护前 1% 的最显著权重通道不被破坏 | 4-bit 权重极度压缩，几乎不损失推理困惑度 |
| **GPTQ** | 权重二阶量化 | 基于 Hessian 矩阵逆的逐列贪心近似补偿 | 工业级极速 4-bit 权重离线量化标杆 |

### 数学原理与逐步推导
#### 1. 对称均匀量化数学公式
对于连续浮点张量 $\\mathbf{X} \\in \\mathbb{R}$，将其量化到 $b$-bit 有符号整数区间 $[-2^{b-1}, 2^{b-1} - 1]$（以 INT8 为例，区间为 $[-128, 127]$）。
定义绝对最大值缩放因子（Scale）：
$$S = \\frac{\\max(|\\mathbf{X}|)}{2^{b-1} - 1}$$
量化映射函数：
$$q = \\text{clip}\\left( \\left\\lfloor \\frac{x}{S} \\right\\rceil, -2^{b-1}, 2^{b-1} - 1 \\right)$$
其中 $\\lfloor \\cdot \\rceil$ 表示最近整数舍入。反量化公式为：$\\hat{x} = q \\times S$。

#### 2. SmoothQuant 激活-权重平滑推导
对于全连接层计算 $Y = X W$，设激活值 $X$ 的各通道存在剧烈的异常值峰值。
在两边插入单位矩阵 $I = \\text{diag}(s)^{-1} \\text{diag}(s)$：
$$Y = X W = \\left( X \\text{diag}(\\mathbf{s})^{-1} \\right) \\left( \\text{diag}(\\mathbf{s}) W \\right) = \\hat{X} \\hat{W}$$
其中 $\\mathbf{s} \\in \\mathbb{R}^k$ 为每个通道的缩放因子向量。
为了在激活与权重之间实现最优平衡，Xiao 等人（2023）设计基于几何平均的平滑公式：
$$s_j = \\frac{\\max(|X_j|)^\\alpha}{\\max(|W_j|)^{1 - \\alpha}}$$
其中：
- $\\max(|X_j|)$ 为第 $j$ 个激活通道的全局绝对最大值；
- $\\max(|W_j|)$ 为第 $j$ 列权重的最大值；
- $\\alpha \\in [0, 1]$ 为迁移强度超参数（通常取 $\\alpha = 0.5$）。
通过该变换，激活值的通道方差被大幅抹平，使得原本不可量化的激活矩阵能够完美使用标准 INT8 硬件张量核心加速。

### 常见认知误区与避坑指南
1. **误以为量化会导致模型推理速度在所有场景下都翻倍**：**并非如此！** 在纯权重 4-bit 量化（如 W4A16：权重 4-bit 存储，激活值 16-bit 计算）中，矩阵乘法在计算前必须动态反量化回 16 位。在短序列、计算密集型场景下，量化带来的速度提升并不明显；**量化的最大红利在于降低显存占用，从而允许跑原本装不下的超大模型，以及大幅增加批处理并发吞吐（吞吐量大幅拉升）！**
2. **以为量化会永久改变原始浮点基座模型**：训练后量化（PTQ）是**纯前向的离线转换过程**，完全不需要反向传播更新训练，通常只需在几百条公开校准语料（Calibration Data）上统计激活分布，数分钟即可完成整个千亿模型的转换。

### 工业级工程实践
- **AutoAWQ 与 vLLM 无缝配合**：在企业生产部署中，最成熟的方案是使用 `AutoAWQ` 将开源模型转为 4-bit AWQ 权重，然后直接挂载进 `vLLM` 引擎。70B 大模型单张双卡 A100 即可轻松扛起数千并发，显存直接从 140GB 砍至 40GB 以内。

### 拓展阅读与学术文献
1. **Xiao et al. (2023)**: *SmoothQuant: Accurate and Efficient Post-Training Quantization for Large Language Models* (ICML 2023)。
2. **Lin et al. (2023)**: *AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration* (MLSys 2024)。
3. **Frantar et al. (2022)**: *GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers*。

### 知识总结与核心记忆要点
- **量化核心**：用低比特整数表达浮点数，显存暴降，解放显卡门槛。
- **异常值挑战**：超大模型特有的激活尖刺通道摧毁了朴素 INT8 量化。
- **SmoothQuant**：数学等价缩放，将激活量化难度平滑转移给权重。
- **AWQ 洞见**：并非所有权重都同等重要，保护前 1% 显著权重通道即可保住 4-bit 精度。"""

    l1_code = """import numpy as np

def symmetric_int8_quantize(tensor):
    \"\"\"对称 INT8 线性量化\"\"\"
    abs_max = np.max(np.abs(tensor))
    scale = abs_max / 127.0 if abs_max != 0 else 1.0
    # 缩放并截断取整
    q_tensor = np.clip(np.round(tensor / scale), -128, 127).astype(np.int8)
    return q_tensor, scale

def symmetric_int8_dequantize(q_tensor, scale):
    \"\"\"INT8 反量化还原为浮点数\"\"\"
    return q_tensor.astype(np.float32) * scale

# 模拟神经元激活值与权重
np.random.seed(42)
weights = np.random.randn(4, 4) * 2.0

q_w, scale_w = symmetric_int8_quantize(weights)
dequant_w = symmetric_int8_dequantize(q_w, scale_w)

max_diff = np.max(np.abs(weights - dequant_w))
print("量化后的 INT8 整数权重矩阵:\\n", q_w)
print(f"量化缩放常数 Scale: {scale_w:.6f}")
print(f"最大反量化近似误差: {max_diff:.6f}")

assert q_w.dtype == np.int8
assert max_diff < (scale_w / 2.0 + 1e-5), "最大量化误差应严格小于半个量化台阶"
print("测试通过：对称 INT8 线性量化与反量化精度完全受控！")"""

    l1_tips = [
        tip("大模型量化的最大瓶颈不在于权重，而在于激活值的通道异常尖刺；SmoothQuant 的平滑迁移是解决该瓶颈的奠基之作。", "pitfall"),
    ]

    # ── Lesson 4.2 ──
    l2_text = """### 学习目标
学完本节，你应该能够：
1. 掌握大语言模型自回归解码阶段的**显存带宽墙（Memory-bound Bottleneck）**；
2. **推导 KV Cache 显存占用严密数学公式**，深刻认识超长上下文下的显存吞噬危机；
3. 理解传统推理引擎在 KV Cache 预分配中的严重显存碎片化（Fragmentation）缺陷；
4. 掌握 **PagedAttention（vLLM 核心算法）** 借鉴操作系统虚拟分页内存的设计哲学；
5. 理解前缀缓存（Prefix Caching）在多轮对话与系统 Prompt 中的显存复用共享机理。

### 前置知识
- 自回归因果注意力机制（每步追加一个新 Token）；
- 操作系统基础：分页式虚拟内存管理（Virtual Memory, Page Table）。

### 问题背景与 ML 用途
在评估大语言模型线上服务性能时，工程师经常关注两大指标：**首字延迟（TTFT, Time to First Token）** 与 **生成吞吐速度（Tokens per Second）**。
- **两阶段计算特征的巨大鸿沟**：
  1. **Prefill（预填充阶段）**：把用户输入的全部 Prompt 一次性并行输入，主要进行大矩阵乘法，处于**计算密集型（Compute-bound）**，GPU 利用率极高；
  2. **Decode（自回归逐字解码阶段）**：每次只生成 1 个 Token。为了生成这 1 个词，GPU 必须把整个几十 GB 的模型权重和数十 GB 的历史 KV 缓存从极慢的显存（HBM）完整读取到计算核心（SRAM）一次！此时 GPU 算力利用率通常低于 5%，计算核心一直在苦苦等待显存数据传输，处于极端的**显存带宽瓶颈（Memory-bound）**！
- **KV Cache 显存爆炸危机**：当上下文长度扩展到 8k~32k 时，KV Cache 占用的显存甚至会迅速反超模型本身的权重！
- 2023 年 UC 伯克利团队发表的 **vLLM（PagedAttention）**，通过引入操作系统分页机制彻底消除了显存碎片，将大模型服务的并发吞吐量提升了整整 **2 到 4 倍**，成为全世界所有云端推理平台的底层基石。

### 直觉理解
- **固定包厢预订 vs 散客动态拼桌（PagedAttention 的直觉）**：
  - **传统系统（固定包厢预订）**：某位客人（用户请求）刚刚进店，虽然他目前可能只想吃一碗面（生成 10 个词），但餐厅经理不知道他最多会吃多久，只能按照最大上限（比如预订能坐 2048 人的豪华宴会厅）直接圈定一块巨大的连续显存！结果绝大多数空间都在白白空置，餐厅明明还有大量空座，新客人却排长队进不来（显存碎片高达 60%~80% 浪费）；
  - **vLLM PagedAttention（散客动态拼桌）**：完全不预先霸占连续空间！客人每吃一口（每生成 16 个 Token），服务员在显卡任意犄角旮旯找一个空置的 16 座小桌（物理块 Block），用一张“桌号映射单（页表 Page Table）”记下来。不同桌子在显存里东拼西凑，物理显存利用率无限逼近 100%！

### 核心概念与符号对照表
| 核心指标 / 概念 | 数学符号 | 典型大模型取值 (LLaMA-70B) | 物理定义与意义 |
| --- | --- | --- | --- |
| **网络层数** | $L$ | 80 | Transformer 堆叠的总层数 |
| **KV 头数** | $H_{KV}$ | 8 (采用 GQA) | 键值注意力头数 |
| **单头维度** | $d_k$ | 128 | 每个注意力头的特征维度 |
| **序列长度** | $S$ | 8192 (8k 上下文) | 用户 Prompt 与生成文本的总 Token 数 |
| **并发批大小** | $B$ | 16 | 同时并发服务的请求数量 |
| **KV Cache 总显存** | $\\text{Bytes}_{KV}$ | **约 85.9 GB！** | 甚至大幅超越了 4-bit 量化后的模型权重本身！ |

### 数学原理与逐步推导
#### 1. KV Cache 显存容量严格公式推导
在自回归生成中，每个 Token 经过每一层时，需要保存其专属的 Key 向量与 Value 向量。
设数据类型为 FP16（每个数值占 2 字节）：
- 单个 Token 在单层单头中保存 Key 和 Value 的字节数：$2 \\text{ (K 和 V)} \\times 2 \\text{ 字节} \\times d_k = 4 d_k$ 字节；
- 扩展到全部 $H_{KV}$ 个头与全部 $L$ 层网络：$4 \\times L \\times H_{KV} \\times d_k$ 字节/Token；
- 扩展到全序列长度 $S$ 与并发并发请求数 $B$：
$$\\text{Total\\_KV\\_Bytes} = 4 \\times L \\times H_{KV} \\times d_k \\times S \\times B$$
以 LLaMA-3-70B（$L=80, H_{KV}=8, d_k=128$）、在 $S=8192, B=16$ 下代入计算：
$$\\text{Total\\_KV\\_Bytes} = 4 \\times 80 \\times 8 \\times 128 \\times 8192 \\times 16 = 42,949,672,960 \\text{ 字节} \\times 2 \\approx 85.9 \\text{ GB}$$
（注：若算入 Key 与 Value 两个独立矩阵的完整物理存储，显存消耗极其惊人！）

#### 2. PagedAttention 虚拟内存映射机制
PagedAttention 将每个序列的 KV Cache 切分成固定大小的“逻辑块（Logical Blocks）”，每个块包含固定数量的 Token（如 $B_{\\text{size}} = 16$）。
在物理显存（HBM）中，维护一个全局的物理块池（Physical Block Pool）。
- **逻辑块与物理块解耦**：第 $i$ 个逻辑块可以被调度映射到任意不连续的物理块 $P_k$ 中；
- **页表记录（Page Table）**：
  $$\\text{PageTable}(\\text{req\\_id}) = [P_5, P_{12}, P_2, \\dots]$$
- **按需分配（On-demand Allocation）**：仅当当前物理块的 16 个 Token 槽位全部填满后，才向内存池申请下一个空闲物理块，彻底杜绝过早预分配带来的内部碎片。
- **写时复制与前缀共享（Copy-on-Write & Prefix Sharing）**：当多个用户请求共享同一长段系统提示词（System Prompt）时，它们在页表中直接指向同一批只读的物理块，直到某个分支开始产生独立的新 Token 时才触发写时复制，显存节省再次拉升数倍。

### 常见认知误区与避坑指南
1. **误以为增加了 GPU 算力就能成倍缩短逐字解码的单字生成延迟**：在自回归 Decode 阶段，瓶颈主要受限于**显存带宽（HBM Bandwidth，如 A100 的 2.0 TB/s）**，而不是算力（TFLOPs）。即使换上算力提升 3 倍的卡，若显存带宽只增加 30%，单字生成耗时几乎不会有实质改善。提升单请求生成速度的唯一有效手段是提升显存带宽、使用更小的模型（如蒸馏）、或者采用投机采样（Speculative Decoding）。
2. **误以为 KV Cache 关掉也不会影响输出**：如果关掉 KV Cache，每生成一个新词就必须把过去所有的词重头计算一遍自注意力，计算复杂度会从每步 $\\mathcal{O}(S)$ 暴增到全过程 $\\mathcal{O}(S^3)$，长文本生成会直接卡死瘫痪。

### 工业级工程实践
- **vLLM 生产级启动最佳实践**：
  - `--gpu-memory-utilization`：推荐设为 0.90~0.95，为 KV Cache 留出最大连续显存池；
  - `--max-model-len`：根据实际业务场景收拢（如不要盲目开启 32k，若业务只有 4k，设为 4096 可使并发容量翻倍）；
  - `--enable-prefix-caching`：在多轮对话 Agent 和密集 RAG 场景中务必开启，能够大幅削减 Prefill 阶段的冗余计算与显存占用。

### 拓展阅读与学术文献
1. **Kwon et al. (2023)**: *Efficient Memory Management for Large Language Model Serving with PagedAttention* (SOSP 2023) — vLLM 传世之作。
2. **Leviathan et al. (2023)**: *Fast Inference from Transformers via Speculative Decoding* (ICML 2023)。
3. **Pope et al. (2023)**: *Efficiently Scaling Transformer Inference* (MLSys 2023)。

### 知识总结与核心记忆要点
- **瓶颈解耦**：Prefill 是算力密集型，Decode 是显存带宽受限型。
- **容量剧毒**：长上下文下 KV Cache 显存容量成倍激增，是制约系统并发的头号杀手。
- **PagedAttention 革命**：分页管理碎块，按需动态分配，物理显存利用率逼近 100%。
- **前缀共享**：利用页表复用系统 Prompt 与多轮上文，大幅释放端到端吞吐。"""

    l2_code = """import numpy as np

def calculate_kv_cache_size_gb(num_layers, num_kv_heads, head_dim, seq_len, batch_size, bytes_per_elem=2):
    \"\"\"
    精确计算 Transformer 自回归推理时的 KV Cache 显存占用 (单位: GB)
    Key 和 Value 各占一份张量
    \"\"\"
    # 单个 token 的 KV 元素总数 = 2 (K和V) * num_layers * num_kv_heads * head_dim
    elements_per_token = 2 * num_layers * num_kv_heads * head_dim
    total_elements = elements_per_token * seq_len * batch_size
    total_bytes = total_elements * bytes_per_elem
    total_gb = total_bytes / (1024 ** 3)
    return total_gb

# 测试 LLaMA-3-70B 规格: 80层, 8个KV头 (GQA), 头维 128, 8k 长度, 并发 16
num_layers = 80
num_kv_heads = 8
head_dim = 128
seq_len = 8192
batch_size = 16

kv_gb = calculate_kv_cache_size_gb(num_layers, num_kv_heads, head_dim, seq_len, batch_size)
print(f"LLaMA-70B (GQA 8头, 长度 8k, 并发 16) 的 KV Cache 显存占用: {kv_gb:.2f} GB")

# 假设若是旧版 MHA (全部 64 个头独立维护 KV):
kv_gb_mha = calculate_kv_cache_size_gb(num_layers, 64, head_dim, seq_len, batch_size)
print(f"若采用未做 GQA 的标准 MHA (64头) 其 KV Cache 显存占用: {kv_gb_mha:.2f} GB (显存爆炸!)")

assert kv_gb < 45.0, "GQA 应使 8k 长度 16 并发显存控制在 45GB 左右"
assert np.isclose(kv_gb_mha / kv_gb, 8.0), "MHA 显存占用应精确为 GQA 的 8 倍"
print("测试通过：KV Cache 显存占用公式推导与 GQA 显存节省验证完全吻合！")"""

    l2_tips = [
        tip("生产环境评估推理卡配置时，必须预留至少一半显存给 KV Cache，否则高并发或长上下文时会瞬间触发 OOM。", "performance"),
    ]

    lessons = [
        lesson("ml-app-l4-1", "训练后量化 (PTQ) 理论与现代量化算法", l1_text, 2, l1_tips, [demo(code=l1_code, title="对称 INT8 线性量化与反量化精度验证")]),
        lesson("ml-app-l4-2", "推理显存吞吐革命：KV Cache 与 PagedAttention (vLLM)", l2_text, 3, l2_tips, [demo(code=l2_code, title="KV Cache 显存占用精确公式与 GQA 收益计算")]),
    ]

    exercises = [
        single_choice(
            ex_id="ml-app-c4-ex1",
            question="为什么在参数规模超过 6.7B 的大语言模型中，传统的标准 INT8 训练后量化（PTQ）会发生灾难性的精度崩塌？",
            options=[
                {"value": "A", "text": "模型内部涌现出极少数通道的激活值异常值（Activation Outliers），其数值幅度达到普通值的数十倍甚至上百倍，导致极值量化截断误差急剧放大"},
                {"value": "B", "text": "因为大于 6.7B 的模型完全不支持任何定点整数计算指令"},
                {"value": "C", "text": "由于权重矩阵完全退化为全零矩阵，无法进行量化映射"},
                {"value": "D", "text": "因为量化后会导致注意力机制中的 Softmax 计算结果出现虚数"},
            ],
            answer="A",
            explanation="Dettmers 等人证明，大模型在规模增大后会在极少部分特定隐藏层通道产生巨大的激活尖刺异常值，标准线性量化会被这些极值绑架，使得绝大多数正常数值的分辨率极度压缩而引发精度雪崩。",
            difficulty=2,
            related_lesson_id="ml-app-l4-1",
            tags=["激活异常值", "量化崩塌", "SmoothQuant", "INT8"],
        ),
        multiple_choice(
            ex_id="ml-app-c4-ex2",
            question="关于 vLLM 推理引擎中的 PagedAttention 技术，下列阐述正确的有：",
            options=[
                {"value": "A", "text": "它借鉴操作系统虚拟分页内存思想，将每个请求的 KV Cache 切分成固定大小的块，并允许物理显存非连续存储"},
                {"value": "B", "text": "彻底消除了传统推理系统中因静态预分配最大长度导致的内部显存碎片（碎片率从 60%~80% 降至接近 0）"},
                {"value": "C", "text": "支持前缀缓存（Prefix Caching），使得共享相同系统提示词的多个请求可以只读共享同一份物理 KV Cache 块"},
                {"value": "D", "text": "它完全舍弃了 KV Cache 机制，每次生成新 Token 均从头重新计算全量注意力"},
            ],
            answer=["A", "B", "C"],
            explanation="A、B、C 均为 PagedAttention 的核心创新与收益。D 选项严重错误，PagedAttention 恰恰是管理 KV Cache 的极致高效技术，绝没有舍弃 KV Cache。",
            difficulty=2,
            related_lesson_id="ml-app-l4-2",
            tags=["vLLM", "PagedAttention", "显存碎片", "虚拟分页"],
        ),
        judge(
            ex_id="ml-app-c4-ex3",
            question="在自回归文本生成的逐步解码（Decode）阶段，每次只生成 1 个 Token，此时 GPU 主要处于计算密集型（Compute-bound）状态，算力利用率极高。",
            answer=False,
            explanation="错误。Decode 阶段由于生成 1 个 Token 需要将全量模型权重与庞大 KV Cache 完整读取一次，受限于显存传输带宽，属于典型的显存带宽受限型（Memory-bound），GPU 算力利用率通常极低。",
            difficulty=2,
            related_lesson_id="ml-app-l4-2",
            tags=["MemoryBound", "Decode阶段", "推理性能"],
        ),
        fill(
            ex_id="ml-app-c4-ex4",
            question="SmoothQuant 算法通过在激活与权重之间插入对角缩放矩阵，将量化难度从难以压缩的____平滑迁移至容易压缩的权重。（填'激活'或'偏置'）",
            blanks=[["激活"]],
            explanation="SmoothQuant 核心在于将激活值（Activation）中的尖刺难度平滑迁移至权重（Weight）。",
            difficulty=1,
            related_lesson_id="ml-app-l4-1",
            tags=["SmoothQuant", "激活平滑", "量化原理"],
        ),
        open_ex(
            ex_id="ml-app-c4-ex5",
            question="结合公式说明：为什么在长上下文与高并发场景下，大模型的并发瓶颈往往不是模型权重参数本身，而是 KV Cache 显存？",
            reference_answer="原理解析：\n1. 静态模型权重固定不变：一个量化后的 70B 模型（如 4-bit AWQ）占用的显存是恒定的约 35 GB，无论并发用户数是 1 个还是 100 个，权重在显存中只有一份，不随并发或序列长度增加；\n2. KV Cache 随并发与长度成乘积级爆炸：根据公式 Bytes_KV = 4 * L * H_kv * d_k * SeqLen * BatchSize；每个并发请求的每个 Token 都在实时动态累积消耗显存；\n3. 当上下文扩展到 8k/32k 且维持数十个并发时，KV Cache 的动态显存需求迅速膨胀至上百甚至数百 GB，瞬间反超静态模型权重成为消耗显存的绝对主导，直接触发显存溢出（OOM）。",
            explanation="对比静态权重的不变性与动态 KV Cache 随序列长度与并发乘积级线性扩张的数学本质。",
            rubric=[
                {"points": 5, "description": "指出模型底座权重显存恒定不变且全局共享"},
                {"points": 5, "description": "根据 KV Cache 公式分析其随序列长度和并发数线性膨胀直至反超权重的机制"},
            ],
            difficulty=3,
            related_lesson_id="ml-app-l4-2",
            tags=["KVCache瓶颈", "显存推导", "并发限制"],
        ),
        # ── Code Exercise 4 ──
        {
            "id": "ml-app-c4-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】实现精确 KV Cache 显存容量计算器：\n编写函数 `calc_kv_mem_mb(layers, kv_heads, head_dim, seq_len, batch_size)`：\n1. 采用 FP16 精度（每个浮点数 2 字节）；\n2. Key 和 Value 矩阵各占一份存储；\n3. 计算并返回总显存大小（单位: MB，以 1024*1024 换算，四舍五入保留 2 位小数）。\n\n最后一行请以 `layers=32`, `kv_heads=4`, `head_dim=128`, `seq_len=2048`, `batch_size=4` 测试调用。",
            "starterCode": "def calc_kv_mem_mb(layers: int, kv_heads: int, head_dim: int, seq_len: int, batch_size: int) -> float:\n    \"\"\"计算 KV Cache 显存占用 (MB)\"\"\"\n    # 请在此实现\n    ___\n\nres = calc_kv_mem_mb(32, 4, 128, 2048, 4)\nprint(res)\n",
            "setupCode": "",
            "expectedOutput": "512.0",
            "answer": "def calc_kv_mem_mb(layers: int, kv_heads: int, head_dim: int, seq_len: int, batch_size: int) -> float:\n    # 2 (K and V) * layers * kv_heads * head_dim * seq_len * batch_size * 2 bytes\n    total_bytes = 2 * layers * kv_heads * head_dim * seq_len * batch_size * 2\n    total_mb = total_bytes / (1024 * 1024)\n    return round(float(total_mb), 2)\n\nres = calc_kv_mem_mb(32, 4, 128, 2048, 4)\nprint(res)\n",
            "tests": "t_mem = calc_kv_mem_mb(1, 1, 1, 1024, 1024)\n# 2 * 1 * 1 * 1 * 1024 * 1024 * 2 = 4194304 bytes = 4.0 MB\nassert t_mem == 4.0, f\"显存计算不匹配: {t_mem}\"\n",
            "explanation": "根据 2 * layers * kv_heads * head_dim * seq_len * batch * 2 计算总字节数，并除以 1024^2 换算为 MB。",
            "tags": ["KVCache", "显存计算", "公式实战"],
            "related_lesson_id": "ml-app-l4-2",
        },
    ]

    return chapter(
        chapter_id="ml-app-c4",
        course_id="ml-llm-applications",
        order=4,
        title="模型量化、推理加速与服务化部署",
        goal="系统掌握 PTQ 训练后量化算法 SmoothQuant/AWQ，突破自回归解码内存墙瓶颈，精通 KV Cache 与 vLLM PagedAttention 显存优化。",
        lessons=lessons,
        exercises=exercises,
    )
