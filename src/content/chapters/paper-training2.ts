import type { Chapter } from '../../types';

/* ============================================================
 *  人工智能基础 · 论文导读 · 训练与规模
 *  24 GPipe: Efficient Training of Giant Neural Networks
 *
 *  来源：
 *  - 论文：Huang et al. (2018) arXiv:1811.06965
 *  - 参考：Ojhaharsh/30u30 第 24 篇（CC BY-NC-ND 4.0，本地个人使用）
 *  - 本课程为原创导读 + 原创习题
 *
 *  执行说明：本章代码需要 PyTorch，走本地后端执行。
 * ============================================================ */

export const paperTrainingChapters2: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c2: GPipe
   * ============================================================ */
  {
    id: 'paper-training-c2',
    title: 'GPipe：用流水线并行训练超大模型',
    goal: '理解模型并行与流水线并行的区别，掌握微批处理（micro-batch）如何填满流水线气泡，能手写 GPipe 调度并计算加速比。',
    lessons: [
      {
        id: 'paper-training-c2-l1',
        title: '单个 GPU 装不下怎么办',
        difficulty: 5,
        content: `
### 学习目标

学完本节，你应该能够：
1. 对比数据/模型/流水线三种并行的切分对象与适用场景，指出朴素模型并行利用率 1/K 的问题；
2. 手推气泡比例 (K-1)/(M+K-1) 与总时间公式，说明 micro-batch 数 M 如何填满流水线；
3. 用代码输出 K=4 的调度表，解释累积 BN 统计与重计算（+33% 计算换显存）两个配套技巧。

### 前置知识

- 反向传播需要保存中间激活（显存去向）；
- 数据并行的梯度同步；
- c1 的算力账本 C=6ND。

### 问题背景

模型比显存大是常态：数据并行装不下模型，朴素模型并行同一时刻只有一张卡在干活（利用率 1/K）。GPipe 的答案是「模型切开放 + 微批流水线」：把 mini-batch 切成 M 个 micro-batch 让它们在 K 级流水线上重叠执行，气泡占比 (K-1)/(M+K-1) 随 M 增大迅速趋零。它还带来两个标配技术：跨 micro-batch 累积 BatchNorm 统计量、用重计算（多 33% 计算换显存）。今天 Megatron/DeepSpeed 的「张量+流水线+数据」三维并行，流水线这一维的直接源头就是 GPipe。

### 直觉理解

洗车流水线：一辆车（mini-batch）拆成 M 个部件（micro-batch）依次经过 K 个工位。开工和收工时后面的工位没活干（气泡），但中间满负荷。想省时间不是加人手，而是送更多小部件进来把空档填满——M=128 时气泡只剩 2%。代价是每个部件太小、质检（BatchNorm）要跨部件累计数据才准。

### 核心概念与原理详解

## 论文信息

| 项目 | 内容 |
| --- | --- |
| **标题** | GPipe: Efficient Training of Giant Neural Networks using Pipeline Parallelism |
| **作者** | Yanping Huang, Youlong Cheng, Ankur Bapna, et al.（Google） |
| **发表** | NeurIPS 2019 |
| **arXiv** | [1811.06965](https://arxiv.org/abs/1811.06965) |
| **一句话贡献** | 用"模型分片 + 微批流水线"训练单卡装不下的巨型网络 |

## 问题：模型比 GPU 大

**场景**：一个 10 亿参数的模型，单卡 16GB 显存装不下。

**三种解法**：

| 方法 | 思路 | 问题 |
| --- | --- | --- |
| **数据并行** | 每卡一份完整模型，分数据 | 模型必须装进单卡 |
| **模型并行** | 把模型切开放不同卡 | **GPU 利用率低**（串行等待） |
| **流水线并行** | 模型切开 + 微批重叠 | **GPipe 的方案** |

**模型并行的核心问题**：

    GPU0: Layer 1-4  → 等待 → 等待 → 等待
    GPU1: 等待 → Layer 5-8 → 等待 → 等待
    GPU2: 等待 → 等待 → Layer 9-12 → 等待

**同一时刻只有一个 GPU 在工作**——利用率 1/K。

<PipelineBubbleDemo />

## GPipe 的核心：微批流水线

**关键洞察**：**把 mini-batch 切成多个 micro-batch，让它们重叠执行**。

**例子**：4 个 GPU，8 个 micro-batch

    GPU0: [m0][m1][m2][m3][m4][m5][m6][m7]
    GPU1:     [m0][m1][m2][m3][m4][m5][m6][m7]
    GPU2:         [m0][m1][m2][m3][m4][m5][m6][m7]
    GPU3:             [m0][m1][m2][m3][m4][m5][m6][m7]

**时间轴**：

    t=0:  GPU0 处理 m0
    t=1:  GPU0 处理 m1, GPU1 处理 m0
    t=2:  GPU0 m2, GPU1 m1, GPU2 m0
    ...
    t=3:  流水线填满（4 个 GPU 都在工作）
    ...
    t=10: 流水线排空

**关键**：**中间阶段所有 GPU 都在工作**。

<PipelineScheduleDemo />

## 气泡（Bubble）分析

**问题**：流水线的开始和结束有"气泡"（GPU 空闲）。

**气泡大小**：

    填充阶段：K-1 个时间单位（K = 流水线级数）
    排空阶段：K-1 个时间单位

**总时间**：

    T = (M + K - 1) × t_step

其中：
- M = micro-batch 数量
- K = 流水线级数
- t_step = 每个 micro-batch 在一级上的时间

**理想时间**（无气泡）：

    T_ideal = M × t_step

**气泡比例**：

    bubble_ratio = (K - 1) / (M + K - 1)

**关键结论**：

| M（micro-batch） | K（级数） | 气泡比例 |
| --- | --- | --- |
| 4 | 4 | 43% |
| 8 | 4 | 27% |
| 32 | 4 | 8.6% |
| **128** | **4** | **2.3%** |

**所以**：**M 越大，气泡越小**。

<BubbleRatioDemo />

**但这带来新问题**：M 大意味着每个 micro-batch 小，
**BatchNorm 的统计量不准**。

## 一个关键问题：BatchNorm

**问题**：micro-batch 太小，BN 的均值/方差估计不准。

**论文的解法**：**累积移动平均**

    # 不只用当前 micro-batch，而是跨所有 micro-batch
    for m in micro_batches:
        forward(m)   # 用累积的 running stats
    
    # 全部完成后，统一更新 running stats

**这叫 "accumulating statistics"**。

**为什么重要**：
如果每个 micro-batch 独立算 BN，会引入噪声，损害性能。

## 重计算（Recomputation）

**问题**：流水线并行需要保存所有中间激活（为了反向传播），显存还是不够。

**解法**：**不保存中间激活，反向时重新计算**。

    # 正常：保存所有激活
    forward:
        h1 = layer1(x)   # 保存 h1
        h2 = layer2(h1)  # 保存 h2
        ...
    
    # 重计算：只保存分区边界
    forward:
        h1 = layer1(x)   # 不保存
        h2 = layer2(h1)  # 只保存这个（分区输出）
    
    backward:
        # 重新前向计算 h1
        h1 = layer1(x)   # 重算
        # 然后正常反向

**代价**：

| 方面 | 影响 |
| --- | --- |
| **显存** | 降低到 O(√N) 或 O(1)（取决于策略） |
| **计算** | 增加约 33%（多一次前向） |

**这是"用计算换显存"的经典权衡。**

<RecomputeDemo />

## 论文的实验

**模型**：GPipe 训练了 5.57 亿到 60 亿参数的模型。

**结果**：

| 模型规模 | GPU 数 | 加速比 |
| --- | --- | --- |
| 5.57 亿 | 8 | 接近线性 |
| **60 亿** | **128** | **接近线性** |

**关键**：**在 128 个 GPU 上接近线性加速**——这说明流水线效率很高。

**ImageNet 结果**：

| 模型 | Top-1 准确率 |
| --- | --- |
| ResNet-50（基线） | 76.3% |
| **GPipe（8 倍大）** | **84.3%** |

**用更多参数换来更好的效果**——这正是 Scaling Laws 的实践。

## 与其他并行方式的对比

| 方式 | 切分对象 | 通信量 | 适用场景 |
| --- | --- | --- | --- |
| **数据并行** | 数据 | 大（梯度同步） | 模型能装进单卡 |
| **模型并行** | 层 | 小（边界激活） | 模型超大 |
| **流水线并行** | 层 + 微批 | 小 | 模型超大 + 追求效率 |
| **张量并行** | 单层内的矩阵 | 极大 | 单层就装不下 |

**实际大模型训练**：**三种结合**

    张量并行（层内）+ 流水线并行（层间）+ 数据并行（副本）

**例**：GPT-3 175B 训练用 8 路张量并行 + 流水线 + 数据并行。

## 局限

| 局限 | 说明 |
| --- | --- |
| **气泡** | M 不够大时有空闲 |
| **显存不均衡** | 各 stage 的激活大小不同 |
| **调度复杂** | 需要仔细安排 |
| **同步开销** | 每个 micro-batch 边界要通信 |

**后续改进**：

| 工作 | 改进 |
| --- | --- |
| **PipeDream** | 异步流水线（消除气泡，但梯度陈旧） |
| **1F1B** | 交替前向反向，减少显存 |
| **Megatron-LM** | 张量并行 + 流水线 |
| **DeepSpeed** | ZeRO + 流水线 |

## 本节来源

> **来源类型：学术来源**
> - Huang, Y. et al. *GPipe: Efficient Training of Giant Neural Networks using
>   Pipeline Parallelism* arXiv:[1811.06965](https://arxiv.org/abs/1811.06965)（NeurIPS 2019）
> - Narayanan, D. et al. *PipeDream: Generalized Pipeline Parallelism for DNN Training*
>   SOSP 2019
> - Shoeybi, M. et al. *Megatron-LM: Training Multi-Billion Parameter Language Models
>   Using Model Parallelism* arXiv:[1909.08053](https://arxiv.org/abs/1909.08053)
>
> **来源类型：参考资料（CC BY-NC-ND 4.0，本地个人使用）**
> - Ojhaharsh/30u30 第 24 篇（166 行，含 GPipe / PipelineStage / checkpoint）
>
> **来源类型：原创**
> - 全部导读文字、交互图示、代码示例与习题

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
K, M = 4, 8
bubble = lambda K, M: (K-1)/(M+K-1)
print("气泡比例: " + "  ".join(f"M={m}: {bubble(4, m):.0%}" for m in (4, 8, 32, 128)))
print("前向调度(行=GPU级, 列=时间步):")
for k in range(K):
    row = "".join(f"F{t-k:<2d}" if k <= t < k + M else " . " for t in range(K + M - 1))
    print(f"  GPU{k}: {row}")
print(f"总时间=(M+K-1)={M+K-1} 步, 理想 {M} 步, 利用率 {100*M/(M+K-1):.1f}%")\`\`\`

预期输出（实测）：实测：气泡比例 M=4→43%、M=8→27%、M=32→9%、M=128→2%；K=4/M=8 的调度表显示 GPU0~3 依次错开一拍，中段全部并行；总时间 11 步 vs 理想 8 步，利用率 72.7%——M 翻倍气泡按 (K-1)/(M+K-1) 缩小。

**常见错误**：把气泡公式记成 (K-1)/M——分母漏掉 K-1，小 M 时严重低估；micro-batch 切太碎又不处理 BatchNorm 统计，精度反而掉；重计算当成「免费」——它多一次前向，计算量 +33%。

### 常见误区

1. **流水线=无代价加速**——气泡、显存不均衡、边界通信都在吃效率，M 要够大才接近线性；
2. **模型并行比数据并行高级**——它们切的东西不同（层 vs 数据），实际大训练是三维并行组合；
3. **micro-batch 越大越好**——M 大气泡小，但 micro-batch 变小伤害 BN 统计与算术强度。

### 知识关联

- **向前**：c1 的 Scaling Law 决定「必须训大」，本节回答「单卡装不下怎么办」；
- **向后**：1F1B/PipeDream 优化调度与显存，Megatron-LM 叠加张量并行；
- **平行**：数据并行（梯度同步）与张量并行（层内切分）是同一问题的不同切法。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 方案 | 模型按层切 K 级 + mini-batch 切 M 个 micro-batch |
| 气泡 | (K-1)/(M+K-1)：实测 M=4→43%，M=128→2% |
| 配套 | 跨 micro-batch 累积 BN 统计；重计算省显存（+33% 计算） |
| 战绩 | 128 卡近线性加速；ResNet 放大 8 倍 84.3% |
| 地位 | Megatron/DeepSpeed 流水线维的源头 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见论文原文：Huang et al., GPipe, arXiv:1811.06965；Shoeybi et al., Megatron-LM, arXiv:1909.08053）
`,
        tips: [
          {
            kind: 'interview',
            text: '「GPipe 的核心」：模型切成 K 段放 K 个 GPU，mini-batch 切成 M 个 micro-batch。微批重叠执行，填满流水线。气泡比例 = (K-1)/(M+K-1)。',
          },
          {
            kind: 'leak',
            text: '「BatchNorm 问题」：micro-batch 太小导致 BN 统计不准。GPipe 用"累积移动平均"——所有 micro-batch 完成后统一更新 running stats。',
          },
          {
            kind: 'pitfall',
            text: '重计算（recomputation）用计算换显存：不保存中间激活，反向时重算。代价是约 33% 额外计算，收益是显存大幅降低。',
          },
        ],
        demos: [
          {
            title: 'GPipe 调度模拟（PyTorch）',
            lang: 'python',
            code: `import torch
import torch.nn as nn
import torch.utils.checkpoint as checkpoint

class PipelineStage(nn.Module):
    """流水线的一级（包含若干层）。"""
    def __init__(self, layers, stage_id, use_checkpoint=True):
        super().__init__()
        self.layers = nn.Sequential(*layers)
        self.stage_id = stage_id
        self.use_checkpoint = use_checkpoint

    def forward(self, x):
        if self.use_checkpoint and self.training:
            # 用重计算节省显存
            for layer in self.layers:
                x = checkpoint.checkpoint(layer, x, use_reentrant=False)
            return x
        return self.layers(x)


class GPipe(nn.Module):
    """GPipe：模型并行 + 微批流水线。"""
    def __init__(self, model, n_partitions, n_microbatches, use_checkpoint=True):
        super().__init__()
        self.n_partitions = n_partitions
        self.n_microbatches = n_microbatches
        self.use_checkpoint = use_checkpoint

        total_layers = len(model)
        layers_per = max(1, total_layers // n_partitions)

        self.stages = nn.ModuleList()
        for i in range(n_partitions):
            start = i * layers_per
            end = (i + 1) * layers_per if i < n_partitions - 1 else total_layers
            self.stages.append(PipelineStage(model[start:end], i, use_checkpoint))

    def forward(self, x):
        # ① 切分 micro-batch
        chunks = torch.chunk(x, self.n_microbatches, dim=0)

        # ② 流水线执行（模拟：每个 stage 依次处理所有 chunk）
        # 真实 GPipe 用异步调度，这里简化演示
        outputs = []
        for chunk in chunks:
            h = chunk
            for stage in self.stages:
                h = stage(h)
            outputs.append(h)

        return torch.cat(outputs, dim=0)


print("=== GPipe 基本运行 ===")
torch.manual_seed(42)

# 构造 12 层的模型
model = nn.Sequential(*[
    nn.Sequential(nn.Linear(32, 32), nn.ReLU()) for _ in range(12)
])

gpipe = GPipe(model, n_partitions=4, n_microbatches=8)
x = torch.randn(16, 32)

out = gpipe(x)
print(f"输入: {tuple(x.shape)}")
print(f"输出: {tuple(out.shape)}")
print(f"分区数 K=4, 微批数 M=8")
print(f"每微批大小: {16 // 8}")

print()
print("=== 气泡分析 ===")
print()
K, M = 4, 8
T_ideal = M
T_actual = M + K - 1
bubble = (K - 1) / (M + K - 1)
print(f"理想时间: {T_ideal} 单位")
print(f"实际时间: {T_actual} 单位")
print(f"气泡比例: {bubble:.1%}")
print(f"效率: {(1-bubble):.1%}")

print()
print("=== 不同 M 的效率 ===")
print()
print(f"{'M':>6} | {'时间':>6} | {'气泡比例':>10} | {'效率':>8}")
print("-" * 38)
for M in [2, 4, 8, 16, 32, 64, 128]:
    t = M + K - 1
    b = (K - 1) / t
    print(f"{M:>6} | {t:>6} | {b:>9.1%} | {(1-b):>7.1%}")

print()
print("结论：M 越大，气泡越小，效率越高")
print("但 M 太大 -> 每个 micro-batch 太小 -> BN 统计不准")

print()
print("=== 重计算的显存节省（概念演示）===")
print()
print("假设 12 层，每层激活 100MB:")
print(f"  不重计算: 12 × 100MB = 1200MB")
print(f"  重计算（只存分区边界）: 4 × 100MB = 400MB")
print(f"  节省: {(1 - 400/1200):.0%}")
print()
print("代价：反向时多一次前向，计算量 +33%")

print()
print("=== 参数量对比 ===")
n_params = sum(p.numel() for p in model.parameters())
print(f"模型参数量: {n_params:,}")
print(f"分区数: 4")
print(f"每卡约: {n_params // 4:,} 参数")
print()
print("关键：模型被切开，每卡只需存 1/4 的参数")`,
          },
          {
            title: '流水线气泡可视化',
            lang: "python",
            code: `import numpy as np

def simulate_pipeline(K, M):
    """
    模拟流水线调度。

    K: 流水线级数（GPU 数）
    M: micro-batch 数

    返回: (时间轴上的忙碌矩阵, 总时间)
    """
    total_time = M + K - 1
    # busy[stage][time] = 处理的 micro-batch 编号（-1 表示空闲）
    busy = np.full((K, total_time), -1, dtype=int)

    for m in range(M):
        for k in range(K):
            t = m + k
            busy[k, t] = m

    return busy, total_time


def print_schedule(K, M):
    busy, T = simulate_pipeline(K, M)
    print(f"K={K} 级, M={M} 个 micro-batch, 总时间 {T}")
    print()
    print("     " + "".join(f"{t:>3}" for t in range(T)))
    for k in range(K):
        row = ""
        for t in range(T):
            if busy[k, t] >= 0:
                row += f"{'m'+str(busy[k,t]):>3}"
            else:
                row += f"{'--':>3}"
        print(f"GPU{k} {row}")
    print()

    # 计算利用率
    total_slots = K * T
    busy_slots = np.sum(busy >= 0)
    util = busy_slots / total_slots
    print(f"忙碌槽位: {busy_slots}/{total_slots} = {util:.1%}")
    print(f"气泡槽位: {total_slots - busy_slots} = {1-util:.1%}")
    print()


print("=== 场景 1：K=4, M=4（气泡大）===")
print()
print_schedule(4, 4)

print("=== 场景 2：K=4, M=8（气泡小）===")
print()
print_schedule(4, 8)

print("=== 场景 3：K=4, M=16（几乎无气泡）===")
print()
print_schedule(4, 16)

print("=== 气泡比例公式验证 ===")
print()
print(f"{'K':>3} | {'M':>5} | {'公式':>10} | {'模拟':>10}")
print("-" * 36)
for K in [2, 4, 8]:
    for M in [4, 8, 16]:
        busy, T = simulate_pipeline(K, M)
        util = np.sum(busy >= 0) / (K * T)
        formula = (K - 1) / (M + K - 1)
        print(f"{K:>3} | {M:>5} | {1-formula:>9.1%} | {util:>9.1%}")

print()
print("公式与模拟一致：气泡比例 = (K-1)/(M+K-1)")

print()
print("=== 关键权衡 ===")
print()
print("M 大 -> 气泡小，效率高")
print("但 M 大意味着每个 micro-batch 小：")
print("  · BatchNorm 统计不准（需要累积平均）")
print("  · 每个 micro-batch 的并行度降低")
print()
print("实践中：M ≈ 4K ~ 8K 是常见选择")`,
          },
          {
            title: '重计算：用计算换显存',
            lang: "python",
            code: `import torch
import torch.nn as nn
import torch.utils.checkpoint as checkpoint
import gc

def measure_memory(fn):
    """测量峰值显存（MB）。"""
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.reset_peak_memory_stats()
        fn()
        return torch.cuda.max_memory_allocated() / 1024**2
    # CPU 上无法测显存，返回估算
    return None


print("=== 重计算的原理 ===")
print()
print("不重计算：")
print("  前向：h1=layer1(x), h2=layer2(h1), ... 保存所有 h")
print("  反向：用保存的 h 算梯度")
print("  显存：O(N)（N=层数）")
print()
print("重计算：")
print("  前向：只保存分区边界（如每 4 层存一次）")
print("  反向：从边界重新前向，算到需要的 h")
print("  显存：O(sqrt(N)) 或 O(1)")
print("  代价：多一次前向，计算 +33%")
print()

# 实际演示
torch.manual_seed(42)

class Block(nn.Module):
    def __init__(self, dim):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(dim, dim * 2),
            nn.ReLU(),
            nn.Linear(dim * 2, dim),
        )
    def forward(self, x):
        return x + self.net(x)


def run_without_checkpoint(x, blocks):
    h = x
    for b in blocks:
        h = b(h)
    return h


def run_with_checkpoint(x, blocks):
    h = x
    for b in blocks:
        h = checkpoint.checkpoint(b, h, use_reentrant=False)
    return h


print("=== 计算量与显存的权衡 ===")
print()

DIM = 64
N_BLOCKS = 8
x = torch.randn(32, DIM, requires_grad=True)
blocks = [Block(DIM) for _ in range(N_BLOCKS)]

# 不重计算
out1 = run_without_checkpoint(x, blocks)
loss1 = out1.sum()
loss1.backward()
print("不重计算:")
print(f"  输出 shape: {tuple(out1.shape)}")
print(f"  梯度 shape: {tuple(x.grad.shape)}")
print(f"  中间激活数: {N_BLOCKS} 个（全保存）")

x.grad = None

# 重计算
out2 = run_with_checkpoint(x, blocks)
loss2 = out2.sum()
loss2.backward()
print()
print("重计算:")
print(f"  输出 shape: {tuple(out2.shape)}")
print(f"  梯度 shape: {tuple(x.grad.shape)}")
print(f"  中间激活数: 0 个（反向时重算）")

print()
print("=== 输出一致性验证 ===")
print()
print(f"两种方式输出差异: {(out1 - out2).abs().max().item():.2e}")
print("-> 数值上完全一致（重计算不改变结果）")

print()
print("=== 重计算的适用场景 ===")
print()
scenarios = [
    ("超深网络（>100 层）", "显存是瓶颈，重计算几乎必用"),
    ("大 batch 训练", "激活占满显存"),
    ("推理", "不需要重计算（无反向）"),
    ("小模型", "重计算不划算（计算开销相对大）"),
]
for name, note in scenarios:
    print(f"  {name:>18}: {note}")

print()
print("=== 数学：显存节省 ===")
print()
print("假设 N 层，每层激活 A MB:")
print(f"  不重计算: N × A")
print()
print("分组重计算（每组 g 层存一次边界）:")
print(f"  显存: (N/g) × A + g × A")
print(f"  最优 g = sqrt(N): 显存 = 2×sqrt(N)×A")
print()
for N in [12, 50, 100, 1000]:
    g = int(N ** 0.5)
    normal = N
    recompute = 2 * (N ** 0.5)
    print(f"  N={N:>4}: 不重计算 {normal:>4}A, 重计算 {recompute:>6.1f}A, 节省 {(1-recompute/normal)*100:>5.1f}%")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'paper-training-c2-e1',
        type: 'single',
        difficulty: 2,
        question: 'GPipe 解决的核心问题是？',
        options: [
          { value: 'A', text: '训练速度慢' },
          { value: 'B', text: '单个 GPU 装不下超大模型，且朴素模型并行利用率低' },
          { value: 'C', text: '数据太多' },
          { value: 'D', text: '梯度爆炸' },
        ],
        answer: 'B',
        explanation:
          '朴素模型并行时同一时刻只有一个 GPU 在工作（利用率 1/K）。GPipe 把 mini-batch 切成 micro-batch，让它们在不同 stage 上重叠执行，填满流水线。',
        tags: ['核心动机'],
      },
      {
        id: 'paper-training-c2-e2',
        type: 'judge',
        difficulty: 2,
        question: 'GPipe 中 micro-batch 数量 M 越大，流水线气泡比例越小。',
        answer: true,
        explanation:
          '气泡比例 = (K-1)/(M+K-1)。M 增大时气泡比例下降。但 M 太大会让每个 micro-batch 太小，导致 BatchNorm 统计不准。',
        tags: ['气泡'],
      },
      {
        id: 'paper-training-c2-e3',
        type: 'multiple',
        difficulty: 3,
        question: 'GPipe 用到的关键技术包括？（多选）',
        options: [
          { value: 'A', text: '微批流水线（micro-batch pipelining）' },
          { value: 'B', text: '重计算（recomputation）节省显存' },
          { value: 'C', text: 'BatchNorm 统计量的累积移动平均' },
          { value: 'D', text: '异步梯度更新（不同步）' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误——GPipe 是**同步**的（每个 mini-batch 结束才更新参数），这保证了与单卡训练等价的数学结果。异步的是 PipeDream。',
        tags: ['关键技术'],
      },
      {
        id: 'paper-training-c2-e4',
        type: 'fill',
        difficulty: 3,
        question:
          'GPipe 的流水线气泡比例公式为 (K-1)/(M+K-1)，其中 K 是流水线 ___，M 是 micro-batch 数。',
        blanks: [['级数', '段数', 'stage 数', '层数']],
        explanation:
          'K = 流水线级数（GPU 数）。填充和排空各需要 K-1 个时间单位，所以总时间 = M + K - 1，理想是 M，气泡 = K-1。',
        tags: ['气泡公式'],
      },
      {
        id: 'paper-training-c2-e5',
        type: 'code',
        difficulty: 2,
        question:
          '计算流水线效率：pipeline_efficiency(K, M)。\n\n- K: 流水线级数\n- M: micro-batch 数\n- 返回忙碌时间占比 = M / (M + K - 1)',
        starterCode: `def pipeline_efficiency(K, M):
    return ___
`,
        setupCode: '',
        expectedOutput: '效率',
        tests: `# K=4, M=4: 4/(4+4-1) = 4/7
assert abs(pipeline_efficiency(4, 4) - 4/7) < 1e-9

# K=4, M=8: 8/11
assert abs(pipeline_efficiency(4, 8) - 8/11) < 1e-9

# K=4, M=128: 128/131
assert abs(pipeline_efficiency(4, 128) - 128/131) < 1e-9

# M 越大效率越高
assert pipeline_efficiency(4, 32) > pipeline_efficiency(4, 8) > pipeline_efficiency(4, 4)

# K 越大效率越低
assert pipeline_efficiency(8, 32) < pipeline_efficiency(4, 32)

# 极限：M→∞ 时效率→1
assert pipeline_efficiency(4, 10000) > 0.999
`,
        answer: `def pipeline_efficiency(K, M):
    return M / (M + K - 1)
`,
        explanation:
          '**推导**：\n\n    总时间 = M + K - 1\n    理想时间 = M\n    效率 = M / (M + K - 1)\n\n**为什么总时间是 M+K-1**：\n\n    填充：K-1 个时间单位（流水线逐渐填满）\n    满载：M-(K-1) 个时间单位\n    排空：K-1 个时间单位\n    总计：2(K-1) + M-(K-1) = M + K - 1\n\n**实践含义**：\n\n| K | M | 效率 |\n| --- | --- | --- |\n| 4 | 4 | 57% |\n| 4 | 8 | 73% |\n| 4 | 32 | 91% |\n| 4 | 128 | 98% |\n\n**所以**：M 应该至少是 K 的 4~8 倍。',
        tags: ['编程', '效率'],
      },
      {
        id: 'paper-training-c2-e6',
        type: 'code',
        difficulty: 3,
        question:
          '模拟流水线调度：pipeline_schedule(K, M)。\n\n返回 (busy_matrix, total_time)：\n- busy_matrix: (K, total_time) 的数组，值为 micro-batch 编号（-1=空闲）\n- total_time = M + K - 1\n\n规则：micro-batch m 在 stage k 的时间是 t = m + k',
        starterCode: `import numpy as np

def pipeline_schedule(K, M):
    total_time = ___
    busy = np.full((K, total_time), -1, dtype=int)
    for m in range(M):
        for k in range(K):
            t = ___
            busy[k, t] = m
    return busy, total_time
`,
        setupCode: '',
        expectedOutput: '(busy_matrix, total_time)',
        tests: `import numpy as np

# K=2, M=3
busy, T = pipeline_schedule(2, 3)
assert T == 4, f"总时间应为 4，实际 {T}"
assert busy.shape == (2, 4)

# 检查调度正确性
# GPU0: m0, m1, m2, --
# GPU1: --, m0, m1, m2
assert busy[0, 0] == 0 and busy[0, 1] == 1 and busy[0, 2] == 2 and busy[0, 3] == -1
assert busy[1, 0] == -1 and busy[1, 1] == 0 and busy[1, 2] == 1 and busy[1, 3] == 2

# 忙碌槽位数 = K * M
assert np.sum(busy >= 0) == 2 * 3

# K=4, M=4
busy2, T2 = pipeline_schedule(4, 4)
assert T2 == 7
assert np.sum(busy2 >= 0) == 16

# 每个 micro-batch 在每个 stage 各出现一次
for m in range(4):
    assert np.sum(busy2 == m) == 4, f"micro-batch {m} 应出现 4 次"
`,
        answer: `import numpy as np

def pipeline_schedule(K, M):
    total_time = M + K - 1
    busy = np.full((K, total_time), -1, dtype=int)
    for m in range(M):
        for k in range(K):
            t = m + k
            busy[k, t] = m
    return busy, total_time
`,
        explanation:
          '**`t = m + k`** 是流水线的核心调度规则：\n\n    micro-batch m 在第 k 级的时间 = m + k\n\n**验证**：\n\n    m=0, k=0 -> t=0（第一个 GPU 立刻开始）\n    m=0, k=1 -> t=1（第二个 GPU 等 1 步）\n    m=1, k=0 -> t=1（第一个 GPU 处理第二个微批）\n\n**为什么这样安排**：\n- 同一时刻不同 stage 处理不同 micro-batch\n- 同一 stage 相邻时刻处理相邻 micro-batch\n- 无冲突（每个 (k,t) 最多一个 m）\n\n**这就是"流水线"的本质**：像工厂流水线，每个工位连续处理不同产品。',
        tags: ['编程', '调度'],
      },
      {
        id: 'paper-training-c2-e7',
        type: 'code',
        difficulty: 3,
        question:
          '计算重计算的显存节省：recompute_memory_saving(N, group_size=None)。\n\n- N: 层数\n- group_size: 每组层数（默认 sqrt(N)）\n- 返回 (不重计算的内存, 重计算的内存)，单位是"每层激活"的倍数',
        starterCode: `import numpy as np

def recompute_memory_saving(N, group_size=None):
    if group_size is None:
        group_size = max(1, int(np.sqrt(N)))
    normal = ___
    recompute = ___
    return normal, recompute
`,
        setupCode: '',
        expectedOutput: '(normal, recompute)',
        tests: `import numpy as np

# N=100, g=10: 不重计算 100A, 重计算 (100/10 + 10)A = 20A
normal, rec = recompute_memory_saving(100, 10)
assert normal == 100
assert rec == 20, f"应为 20，实际 {rec}"

# N=12, 默认 g=3: 12A vs (12/3 + 3)A = 7A
normal2, rec2 = recompute_memory_saving(12)
assert normal2 == 12
assert rec2 == 7, f"应为 7，实际 {rec2}"

# N=1000, 默认 g=31: 1000A vs (1000/31 + 31)A ≈ 63A
normal3, rec3 = recompute_memory_saving(1000)
assert normal3 == 1000
assert rec3 < 100, f"应大幅降低，实际 {rec3}"

# 重计算总是更省
for n in [10, 50, 100]:
    a, b = recompute_memory_saving(n)
    assert b < a
`,
        answer: `import numpy as np

def recompute_memory_saving(N, group_size=None):
    if group_size is None:
        group_size = max(1, int(np.sqrt(N)))
    normal = N
    n_groups = int(np.ceil(N / group_size))
    recompute = n_groups + group_size
    return normal, recompute
`,
        explanation:
          '**显存分析**：\n\n**不重计算**：保存所有 N 层的激活 -> N·A\n\n**分组重计算**：\n\n    只保存每组的边界：ceil(N/g) 个\n    反向时重算组内 g 层：同时需要 g 个\n    总显存：(N/g + g)·A\n\n**最优 g**：\n\n    对 g 求导：-N/g² + 1 = 0\n    => g = sqrt(N)\n    最小值：2·sqrt(N)\n\n**具体数据**：\n\n| N | g=√N | 不重计算 | 重计算 | 节省 |\n| --- | --- | --- | --- | --- |\n| 12 | 3 | 12A | 7A | 42% |\n| 100 | 10 | 100A | 20A | 80% |\n| 1000 | 31 | 1000A | 63A | 94% |\n\n**代价**：计算量 +33%（多一次前向）。\n\n**这是"用计算换显存"的经典权衡**，在训练大模型时几乎必用。',
        tags: ['编程', '重计算'],
      },
      {
        id: 'paper-training-c2-e8',
        type: 'code',
        difficulty: 4,
        question:
          '用 PyTorch 实现简化的 GPipe：\n\nGPipe(model, n_partitions, n_microbatches)\n- 把 model 按层均分成 n_partitions 段\n- 前向时把输入切成 n_microbatches 份\n- 依次通过所有 stage',
        starterCode: `import torch
import torch.nn as nn

class GPipe(nn.Module):
    def __init__(self, model, n_partitions, n_microbatches):
        super().__init__()
        self.n_microbatches = n_microbatches
        total = len(model)
        per = max(1, total // n_partitions)
        self.stages = nn.ModuleList()
        for i in range(n_partitions):
            start = i * per
            end = (i+1)*per if i < n_partitions-1 else total
            self.stages.append(___)

    def forward(self, x):
        chunks = ___
        outputs = []
        for chunk in chunks:
            h = chunk
            for stage in self.stages:
                h = ___
            outputs.append(h)
        return ___
`,
        setupCode: '',
        expectedOutput: 'GPipe',
        tests: `import torch
import torch.nn as nn

torch.manual_seed(0)
model = nn.Sequential(*[
    nn.Sequential(nn.Linear(16, 16), nn.ReLU()) for _ in range(8)
])
gp = GPipe(model, 4, 2)
x = torch.randn(8, 16)
out = gp(x)

assert out.shape == (8, 16), f"形状错误: {out.shape}"
assert len(gp.stages) == 4

# 不同分区/微批
gp2 = GPipe(model, 2, 4)
out2 = gp2(x)
assert out2.shape == (8, 16)

# 梯度
x2 = torch.randn(4, 16, requires_grad=True)
out3 = gp2(x2)
out3.sum().backward()
assert x2.grad is not None
`,
        answer: `import torch
import torch.nn as nn

class GPipe(nn.Module):
    def __init__(self, model, n_partitions, n_microbatches):
        super().__init__()
        self.n_microbatches = n_microbatches
        total = len(model)
        per = max(1, total // n_partitions)
        self.stages = nn.ModuleList()
        for i in range(n_partitions):
            start = i * per
            end = (i+1)*per if i < n_partitions-1 else total
            self.stages.append(nn.Sequential(*list(model)[start:end]))

    def forward(self, x):
        chunks = torch.chunk(x, self.n_microbatches, dim=0)
        outputs = []
        for chunk in chunks:
            h = chunk
            for stage in self.stages:
                h = stage(h)
            outputs.append(h)
        return torch.cat(outputs, dim=0)
`,
        explanation:
          '**三个关键点**：\n\n1. **模型分片**：`list(model)[start:end]` 按层切分\n2. **输入切分**：`torch.chunk(x, M, dim=0)` 沿 batch 维切\n3. **串行执行**：每个 chunk 依次通过所有 stage\n\n**注意这是"教学版"**：\n真实 GPipe 用**异步调度**——\n当 GPU0 处理 m1 时，GPU1 同时处理 m0。\n\n这里简化为"每个 chunk 走完全程"，\n数学上等价（结果相同），但没有并行加速。\n\n**真实实现**需要：\n- 多 GPU 通信（send/recv 激活）\n- 异步执行（不同 stage 同时工作）\n- 重计算（节省显存）',
        tags: ['编程', 'GPipe'],
      },
      {
        id: 'paper-training-c2-e9',
        type: 'judge',
        difficulty: 4,
        question: 'GPipe 是异步的，不同 stage 可以独立更新参数。',
        answer: false,
        explanation:
          'GPipe 是**同步**的——每个 mini-batch 的所有 micro-batch 都完成后才更新参数。这保证与单卡训练数学等价（梯度是准确的）。异步的是 PipeDream，代价是梯度陈旧。',
        tags: ['同步 vs 异步'],
      },
      {
        id: 'paper-training-c2-e10',
        type: 'open',
        difficulty: 4,
        question:
          '请解释：① 朴素模型并行的问题；② GPipe 如何用微批填满流水线；③ 气泡公式与效率权衡；④ 重计算如何节省显存，代价是什么。',
        referenceAnswer: `**① 朴素模型并行的问题**

**做法**：把模型的层切开放到不同 GPU。

    GPU0: Layer 1-4
    GPU1: Layer 5-8
    GPU2: Layer 9-12

**问题**：**串行等待**

    t=0: GPU0 工作，GPU1/GPU2 空闲
    t=1: GPU1 工作，GPU0/GPU2 空闲
    t=2: GPU2 工作，GPU0/GPU1 空闲

**利用率**：1/K（K = GPU 数）。

**为什么**：
数据必须顺序流过所有层。
GPU0 算完才能给 GPU1，GPU1 算完才能给 GPU2。

**所以**：
- 4 个 GPU 只有 25% 的时间在工作
- 加速比远低于线性

---

**② GPipe 如何用微批填满流水线**

**核心**：把 mini-batch 切成 M 个 micro-batch。

**调度**：

    t=0: GPU0[m0]
    t=1: GPU0[m1], GPU1[m0]
    t=2: GPU0[m2], GPU1[m1], GPU2[m0]
    t=3: GPU0[m3], GPU1[m2], GPU2[m1], GPU3[m0]  ← 满载！
    ...

**关键**：**不同 GPU 同时处理不同的 micro-batch**。

**类比**：工厂流水线
- 工位1 处理产品 A
- 工位2 同时处理产品 B（A 的前一个）
- 工位3 同时处理产品 C
- 每个工位都一直在工作

**效果**：利用率从 1/K 提升到接近 1。

---

**③ 气泡公式与效率权衡**

**时间分析**：

    填充：K-1 个时间单位（流水线逐渐填满）
    满载：M-(K-1) 个时间单位
    排空：K-1 个时间单位

    总时间 = (K-1) + (M-K+1) + (K-1) = M + K - 1

**理想时间**（无气泡）= M。

**气泡比例**：

    bubble = (K-1) / (M+K-1)
    efficiency = M / (M+K-1)

**数据**（K=4）：

| M | 效率 |
| --- | --- |
| 4 | 57% |
| 8 | 73% |
| 32 | 91% |
| 128 | 98% |

**权衡**：

**M 大的好处**：气泡小，效率高。

**M 大的代价**：
- 每个 micro-batch 小 -> BatchNorm 统计不准
- 每个 micro-batch 的并行度降低（矩阵太小，GPU 利用率下降）

**实践**：M ≈ 4K ~ 8K。

---

**④ 重计算如何节省显存**

**问题**：

反向传播需要中间激活。
流水线并行 + 大模型 -> 激活占满显存。

**正常做法**：

    forward:
        h1 = layer1(x)   # 保存 h1（占显存）
        h2 = layer2(h1)  # 保存 h2
        ...
        hN = layerN(hN-1)
    
    backward:
        用保存的 h1...hN 算梯度

**显存**：O(N)。

**重计算做法**：

    forward:
        h1 = layer1(x)   # 不保存
        ...
        hN = layerN(...)  # 只保存分区边界
    
    backward:
        # 需要 h1 时，从最近的边界重算
        h1 = layer1(x)   # 重算！
        # 然后算梯度

**显存**（分组重计算）：

    只存 N/g 个边界 + 重算时的 g 个
    总显存 ≈ (N/g + g)·A
    最优 g = sqrt(N) -> 2·sqrt(N)·A

**具体**：

| N | 不重计算 | 重计算（g=√N） | 节省 |
| --- | --- | --- | --- |
| 12 | 12A | 7A | 42% |
| 100 | 100A | 20A | 80% |
| 1000 | 1000A | 63A | 94% |

**代价**：计算量 +33%（多一次前向）。

**为什么是 33%**：

    正常：1 次前向 + 1 次反向 = 3 单位（前向 1，反向 2）
    重计算：2 次前向 + 1 次反向 = 4 单位
    增加：(4-3)/3 = 33%

**这是"用计算换显存"的经典权衡。**

---

**⑤ 与现代大模型训练的关系**

**实际训练用"3D 并行"**：

| 并行方式 | 切分 | 通信量 |
| --- | --- | --- |
| **数据并行** | batch | 大（梯度） |
| **流水线并行** | 层 | 小（边界激活） |
| **张量并行** | 层内矩阵 | 极大（每层都要通信） |

**例：GPT-3 175B**

    8 路张量并行 × 流水线并行 × 数据并行

**为什么这样组合**：
- 单层太大 -> 张量并行
- 层数太多 -> 流水线并行
- 想用更多 GPU -> 数据并行

**GPipe 的贡献**：
它是流水线并行的奠基工作。
今天的 Megatron-LM、DeepSpeed 都基于类似思想。

**一个诚实的说明**：

GPipe 在 128 GPU 上接近线性加速，
但那是 2019 年的 60 亿参数模型。

**今天**：
- 模型大 1000 倍
- 需要更复杂的并行策略
- 但 GPipe 的基本思想（微批流水线 + 重计算）仍然适用`,
        rubric: [
          { point: '朴素模型并行利用率 1/K，串行等待', score: 3 },
          { point: '微批流水线：不同 GPU 同时处理不同 micro-batch', score: 2 },
          { point: '气泡公式 (K-1)/(M+K-1) + M 大的代价', score: 2 },
          { point: '重计算：O(N)→O(√N)，代价 +33% 计算', score: 2 },
          { point: '3D 并行（数据+流水线+张量）的组合', score: 1 },
        ],
        keywords: ['利用率1/K', '微批重叠', 'M+K-1', 'O(√N)', '+33%计算'],
        explanation:
          '能说清「气泡公式的推导」以及「重计算为什么是 +33% 计算」，就是理解了 GPipe 的两个核心权衡。',
        tags: ['综合分析'],
      },
    ],
  },
];
