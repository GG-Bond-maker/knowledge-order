import type { Chapter } from '../../types';

/* ============================================================
 *  《大模型训练原理》扩展章节 c6~c9
 *
 *  c6 分布式训练     c7 混合精度与数值稳定性
 *  c8 数据工程       c9 Scaling Laws 方法论
 *
 *  参考：Stanford CS336 L5(GPUs) / L7-L8(Parallelism) / L9,L11(Scaling laws)
 *       / L13-L14(Data)、Megatron-LM、ZeRO 论文、Chinchilla
 * ============================================================ */

export const llmA2Extra2: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c6：分布式训练
   * ============================================================ */
  {
    id: 'llm-a2-c6',
    title: '分布式训练：把模型铺到千卡上',
    goal: '理解数据并行 / 张量并行 / 流水线并行 / 序列并行的分工，掌握 ZeRO 三阶段与 FSDP 的显存优化原理。',
    lessons: [
      {
        id: 'llm-a2-c6-l1',
        title: '为什么单卡训不动：显存都花在哪了',
        content: `
### 学习目标

学完本节，你应该能够：
1. 算清 7B fp16 训练显存账（权重 14 + 梯度 14 + Adam 56 ≈ 84 GiB）；
2. 填出四种并行的『切什么/解决什么/通信特点』对照表；
3. 解释 DDP 的通信-计算重叠与 ring all-reduce 通信量 2(N-1)/N 的含义。

### 前置知识

- c5 的 batch 与梯度概念；
- GiB/字节换算。

### 问题背景

7B 全参训练起步 100+ GB、175B 起步数 TB——单卡物理放不下，分布式不是提速手段而是必需品。DP/TP/PP/SP 四种并行切的东西不同、通信代价不同，ZeRO/FSDP 则把数据并行里最冗余的显存也切开。

### 直觉理解

训练巨型模型像盖一张巨大拼图：DP 是复印整张图给每人一块拼图（各自拼不同区域再对答案）；TP 是把一层图案按列裁开给一组人（每步都要对缝，必须在同一房间 NVLink）；PP 是把上下半张图分给流水线工人（传接少但要微批流水防空转）；ZeRO 则发现大家复印的整张图和橡皮擦完全一样，索性每人只留 1/N，用时再借。

### 核心概念与原理详解

## 先算一笔账

训练一个 7B 模型（fp16），显存需求：

| 项目 | 大小 | 说明 |
| --- | --- | --- |
| 模型权重（fp16） | 14 GB | 7B × 2 字节 |
| 梯度（fp16） | 14 GB | 与权重同形状 |
| 优化器状态（Adam） | 56 GB | fp32 的 m + v 各 28GB |
| **小计（不含激活）** | **84 GB** | 已经超过 80GB 单卡 |
| 激活值（随 batch/序列长度增长） | 数十 GB | 反向传播要用 |

**结论**：7B 模型全参训练起步就要 100+ GB，单卡放不下。
必须把显存和计算分散到多张卡上——这就是分布式训练。

## 四种并行方式的分工

| 方式 | 切什么 | 解决什么 | 通信特点 |
| --- | --- | --- | --- |
| **数据并行 DP** | 切 batch | 训练速度（吞吐） | 每步同步梯度，量大 |
| **张量并行 TP** | 切单层内的矩阵 | 单层放不下 | 每层都通信，量最大 |
| **流水线并行 PP** | 切层（按深度） | 层数太多 | 只在层边界通信，气泡问题 |
| **序列并行 SP** | 切序列长度 | 长上下文激活爆 | 注意力内部通信 |

**实际大模型训练通常是三者组合**：
例如 70B 模型在 1024 卡上训练，可能是
**TP=8 × PP=8 × DP=16** 的 3D 并行。

<Diagram type="arch" name="moe-routing" />

## 数据并行（DP）：最直观

每张卡放一份**完整的模型**，各自处理不同的数据，然后同步梯度：

    # 每张卡
    loss = model(batch_i)
    loss.backward()               # 各自算梯度
    all_reduce(gradients)         # 所有卡梯度求平均
    optimizer.step()              # 更新后参数仍然一致

**优点**：实现简单，几乎线性加速。
**缺点**：每张卡都要放完整模型——**显存没有节省**，只解决了速度。

这就是为什么大模型不能只用 DP。

## 分布式数据并行（DDP）

PyTorch 的 \`DistributedDataParallel\` 相比老的 \`DataParallel\` 的关键改进：
**梯度同步与反向传播重叠**（bucket + async all-reduce）。

反向传播是逐层算梯度的，DDP 一边算一边把已完成的梯度桶发出去，
不等全部算完再同步——通信时间被计算时间掩盖。

## All-Reduce 是什么

所有卡把自己的数据发出去，最终每张卡都拿到**所有卡的归约结果**（如求和/平均）。

    ring all-reduce：每张卡只与左右邻居通信，
    N 张卡传输 2(N-1)/N 倍数据量，与卡数几乎无关

**关键认知**：all-reduce 的通信量与**参数量**成正比。
7B 模型 fp16 → 每步要同步 14GB 梯度。这就是 DP 的通信瓶颈。

<PipelineBubbleDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
GB = 1e9
P = 7e9
w, g, opt = P*2/GB, P*2/GB, P*8/GB      # fp16 权重/梯度；fp32 m+v 各 4 字节
print(f"7B: 权重 {w:.0f} + 梯度 {g:.0f} + Adam {opt:.0f} = {w+g+opt:.0f} GB（不含激活）")
N = 8
print(f"ZeRO-1: {w+g+opt/N:.1f} | ZeRO-2: {w+g/N+opt/N:.1f} | ZeRO-3: {(w+g+opt)/N:.1f} GB")

# ---- 张量并行数值验证 ----
rng = np.random.default_rng(0)
X = rng.normal(size=(4, 8)); W = rng.normal(size=(8, 6)); Y = X @ W
print("列切等价:", np.allclose(np.hstack([X@W[:, :3], X@W[:, 3:]]), Y))
print("行切等价:", np.allclose(X[:, :4]@W[:4, :] + X[:, 4:]@W[4:, :], Y))

# ---- 流水线气泡 ----
for P_, m in [(4, 1), (4, 8), (8, 16)]:
    print(f"P={P_}, 微批 m={m}: 气泡比例 ≈ (P-1)/m = {(P_-1)/m:.2f}")\`\`\`

预期输出（实测）：7B 显存账：权重 14 + 梯度 14 + Adam 56 = 84 GB；ZeRO-1 35.0 / ZeRO-2 22.8 / ZeRO-3 10.5 GB；列切与行切均数值等价（allclose=True）；气泡比例：P=4,m=1 → 3.0（利用率 25%）、P=4,m=8 → 0.38、P=8,m=16 → 0.44。

**常见错误**：把 TP 放到跨机（以太网撑不住每层 all-reduce），训练慢 10 倍；PP 微批数 m 没调大，气泡比例 (P-1)/m 高达 75%，八卡只用上两卡；ZeRO-3 用了却没按 block 预取，all-gather 串行等待抵消显存收益。

### 常见误区

1. **『数据并行省显存』**——DP 每卡放完整模型，只提速不省显存；省显存靠 ZeRO/FSDP；\\n2. **『并行度越高越快』**——TP 通信量最大，通信超过计算收益后线性度崩塌，3D 并行是平衡艺术；\\n3. **『梯度检查点免费』**——用约 30% 额外计算换显存，与 ZeRO 组合才划算。

### 知识关联

- **向前**：c7 混合精度进一步把每卡显存除以 2；
- **向后**：llm-a4 的 MoE 在并行之上再加专家维度；
- **平行**：llm-a3 的 GQA/MLA 从模型结构侧砍显存，本章从系统侧砍，两面夹击。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 显存账 | 7B fp16：权重14 + 梯度14 + Adam56 ≈ 84 GiB |
| 四并行 | DP 切 batch / TP 切矩阵 / PP 切层 / SP 切序列 |
| 3D 组合 | TP≤8 占满单机 NVLink，PP 跨机，DP 填余 |
| 气泡 | 朴素 PP 利用率 1/P → 1F1B 微批，气泡 ≈ (P-1)/m |
| ZeRO | 1 切优化器 / 2 切梯度 / 3 切权重；FSDP=官方 ZeRO-3 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Vaswani et al. (2017)、Hoffmann et al. (2022) arXiv:2203.15556《Chinchilla》、Rajbhandari et al. (2020) ZeRO 论文与 PyTorch FSDP 文档相应章节）
`,
        tips: [
          {
            kind: 'interview',
            text: '「7B 模型训练需要多少显存」：权重 14GB + 梯度 14GB + Adam 状态 56GB = 84GB，再加激活值。这就是为什么必须分布式。',
          },
          {
            kind: 'note',
            text: 'DP 只解决速度（吞吐），不解决单卡显存。要省显存必须用 TP/PP/ZeRO/FSDP。',
          },
          {
            kind: 'performance',
            text: 'DDP 的梯度同步与反向传播重叠（bucket 机制），通信时间被计算掩盖，这是它比 DataParallel 快的关键。',
          },
        ],
        demos: [
          {
            title: '训练显存需求计算器',
            lang: 'python',
            code: `def training_memory_gb(n_params_b, precision_bytes=2, use_adam=True, n_layers=None, batch=1, seq=2048):
    """估算训练显存（GB）。"""
    n = n_params_b * 1e9
    weights = n * precision_bytes
    grads = n * precision_bytes
    # Adam: fp32 的一阶矩 + 二阶矩
    optimizer = n * 4 * 2 if use_adam else 0
    base = (weights + grads + optimizer) / 1024**3

    # 激活值粗估：层数 × batch × seq × d_model × 字节 × 系数
    act = 0
    if n_layers:
        d_model = int((n / (12 * n_layers)) ** 0.5)
        act = n_layers * batch * seq * d_model * 2 * 10 / 1024**3
    return base, act

print("模型      | 权重+梯度+优化器 | 激活(估) | 合计")
print("-" * 58)
for name, p, L in [("1B", 1, 24), ("7B", 7, 32), ("13B", 13, 40), ("70B", 70, 80)]:
    b, a = training_memory_gb(p, 2, True, L)
    print(f"{name:8} | {b:8.1f} GB | {a:6.1f} GB | {b+a:7.1f} GB")

print()
print("单卡 80GB：")
for name, p, L in [("1B", 1, 24), ("7B", 7, 32), ("13B", 13, 40), ("70B", 70, 80)]:
    b, a = training_memory_gb(p, 2, True, L)
    need = b + a
    cards = need / 80
    print(f"  {name}: 需 {need:6.1f} GB -> 至少 {int(cards)+1} 张 80GB 卡")`,
          },
        ],
      },
      {
        id: 'llm-a2-c6-l2',
        title: '张量并行与流水线并行',
        content: `
### 学习目标

学完本节，你应该能够：
1. 推导 Megatron 列并行（无通信）与行并行（一次 all-reduce）并数值验证等价性；
2. 说明 MLP『列切+行切』与注意力按 head 切的标准方案及 TP≤8 的原因；
3. 计算 PP 气泡比例 (P-1)/m，解释 1F1B 微批调度如何填满流水线。

### 前置知识

- 「为什么单卡训不动：显存都花在哪了」（c6-l1）；
- 矩阵分块乘法。

### 问题背景

7B 全参训练起步 100+ GB、175B 起步数 TB——单卡物理放不下，分布式不是提速手段而是必需品。DP/TP/PP/SP 四种并行切的东西不同、通信代价不同，ZeRO/FSDP 则把数据并行里最冗余的显存也切开。

### 直觉理解

训练巨型模型像盖一张巨大拼图：DP 是复印整张图给每人一块拼图（各自拼不同区域再对答案）；TP 是把一层图案按列裁开给一组人（每步都要对缝，必须在同一房间 NVLink）；PP 是把上下半张图分给流水线工人（传接少但要微批流水防空转）；ZeRO 则发现大家复印的整张图和橡皮擦完全一样，索性每人只留 1/N，用时再借。

### 核心概念与原理详解

## 张量并行（TP）：把一层劈开

以矩阵乘法 Y = XW 为例，W 形状 (d_in, d_out)。

**按列切 W**（Megatron 的 Column Parallel）：

    W = [W1 | W2]        # 每张卡存一半列
    Y1 = X @ W1, Y2 = X @ W2    # 各自算出一半输出
    # 列并行无需通信（输出天然分开）

**按行切 W**（Row Parallel）：

    W = [W1; W2]         # 按行切
    Y = X1 @ W1 + X2 @ W2       # 需要把部分和加起来 → all-reduce

**MLP 的标准切法**：第一个线性层按列切（无通信），第二个按行切（一次 all-reduce）。

    h = GELU(x @ W1)  →  W1 按列切，各卡算一部分 h
    y = h @ W2        →  W2 按行切，各卡算部分和，all-reduce 求和

**多头注意力的切法**：按 head 切。每个卡负责一部分 head，天然独立；
只有最后的输出投影需要 all-reduce。

**TP 的特点**：
- 通信量最大（每层都要 all-reduce）；
- 必须放在**同一节点内**（NVLink，带宽 ~600GB/s），跨节点以太网撑不住；
- 通常 TP ≤ 8（不超过单机 GPU 数）。

## 流水线并行（PP）：按层切

把模型的 L 层分成 P 段，每段放在一张卡上：

    卡1: layer 1-8   卡2: layer 9-16   卡3: layer 17-24   卡4: layer 25-32

数据依次流过，看起来很自然，但有个大问题：**气泡（bubble）**。

    # 朴素做法：同一时刻只有一张卡在工作
    卡1: [====]
    卡2:        [====]
    卡3:               [====]
    卡4:                      [====]
    → 利用率只有 1/4

**解决：微批次（micro-batch）流水**。把一个大 batch 切成 m 个小块，
让各卡交错执行：

    # 1F1B 调度（一前一后）
    卡1: F1 F2 F3 F4 B1 B2 B3 B4
    卡2:    F1 F2 F3 F4 B1 B2 B3 B4
    ...

气泡比例约 **(P-1)/m**（P=流水段数，m=微批次数）。
**m 越大，气泡越小**，但 micro-batch 太小会影响 GPU 效率。

**PP 的特点**：通信量最小（只在段边界传激活），可以跨节点；
但需精心调度微批次来减少气泡。

## 3D 并行：实际组合方式

**Megatron-LM 训练 530B 的配置**：TP=8 × PP=35 × DP=... 

原则：
1. **TP 优先占满单机**（8 卡 NVLink）；
2. **PP 跨机**（通信少）；
3. **DP 填剩余**（DP 可跨任意节点，但 all-reduce 量大）。

    # 1024 卡训 70B 的典型划分
    TP = 8    （单机内）
    PP = 8    （跨 8 组机）
    DP = 16   （1024 / 8 / 8）
    总计 8 × 8 × 16 = 1024 ✓

## 序列并行（SP）

长上下文时，**激活值的序列维**会爆显存。
序列并行把 seq 维切开，每卡处理一段；注意力的 softmax 需要全局统计量，
所以要在计算 max/sum 时做 all-reduce（Ring Attention 用环形通信避免全局同步）。

**适用**：长上下文训练（128K+）、激活重计算的替代方案。

<PipelineScheduleDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
GB = 1e9
P = 7e9
w, g, opt = P*2/GB, P*2/GB, P*8/GB      # fp16 权重/梯度；fp32 m+v 各 4 字节
print(f"7B: 权重 {w:.0f} + 梯度 {g:.0f} + Adam {opt:.0f} = {w+g+opt:.0f} GB（不含激活）")
N = 8
print(f"ZeRO-1: {w+g+opt/N:.1f} | ZeRO-2: {w+g/N+opt/N:.1f} | ZeRO-3: {(w+g+opt)/N:.1f} GB")

# ---- 张量并行数值验证 ----
rng = np.random.default_rng(0)
X = rng.normal(size=(4, 8)); W = rng.normal(size=(8, 6)); Y = X @ W
print("列切等价:", np.allclose(np.hstack([X@W[:, :3], X@W[:, 3:]]), Y))
print("行切等价:", np.allclose(X[:, :4]@W[:4, :] + X[:, 4:]@W[4:, :], Y))

# ---- 流水线气泡 ----
for P_, m in [(4, 1), (4, 8), (8, 16)]:
    print(f"P={P_}, 微批 m={m}: 气泡比例 ≈ (P-1)/m = {(P_-1)/m:.2f}")\`\`\`

预期输出（实测）：7B 显存账：权重 14 + 梯度 14 + Adam 56 = 84 GB；ZeRO-1 35.0 / ZeRO-2 22.8 / ZeRO-3 10.5 GB；列切与行切均数值等价（allclose=True）；气泡比例：P=4,m=1 → 3.0（利用率 25%）、P=4,m=8 → 0.38、P=8,m=16 → 0.44。

**常见错误**：把 TP 放到跨机（以太网撑不住每层 all-reduce），训练慢 10 倍；PP 微批数 m 没调大，气泡比例 (P-1)/m 高达 75%，八卡只用上两卡；ZeRO-3 用了却没按 block 预取，all-gather 串行等待抵消显存收益。

### 常见误区

1. **『数据并行省显存』**——DP 每卡放完整模型，只提速不省显存；省显存靠 ZeRO/FSDP；\\n2. **『并行度越高越快』**——TP 通信量最大，通信超过计算收益后线性度崩塌，3D 并行是平衡艺术；\\n3. **『梯度检查点免费』**——用约 30% 额外计算换显存，与 ZeRO 组合才划算。

### 知识关联

- **向前**：c7 混合精度进一步把每卡显存除以 2；
- **向后**：llm-a4 的 MoE 在并行之上再加专家维度；
- **平行**：llm-a3 的 GQA/MLA 从模型结构侧砍显存，本章从系统侧砍，两面夹击。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 显存账 | 7B fp16：权重14 + 梯度14 + Adam56 ≈ 84 GiB |
| 四并行 | DP 切 batch / TP 切矩阵 / PP 切层 / SP 切序列 |
| 3D 组合 | TP≤8 占满单机 NVLink，PP 跨机，DP 填余 |
| 气泡 | 朴素 PP 利用率 1/P → 1F1B 微批，气泡 ≈ (P-1)/m |
| ZeRO | 1 切优化器 / 2 切梯度 / 3 切权重；FSDP=官方 ZeRO-3 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Vaswani et al. (2017)、Hoffmann et al. (2022) arXiv:2203.15556《Chinchilla》、Rajbhandari et al. (2020) ZeRO 论文与 PyTorch FSDP 文档相应章节）
`,
        tips: [
          {
            kind: 'interview',
            text: '「TP 与 PP 的区别」：TP 切单层内的矩阵，每层都通信、量大，必须同机 NVLink；PP 切层，只在边界通信、量小，可跨机但有气泡。',
          },
          {
            kind: 'leak',
            text: '实际大模型用 3D 并行：TP 占满单机 NVLink（通常 8），PP 跨机，DP 填剩余。这是 Megatron-LM 的标准做法。',
          },
          {
            kind: 'performance',
            text: 'PP 的气泡比例约 (P-1)/m，P 是流水段数、m 是微批次数。增大 micro-batch 数量能显著减少气泡，但受显存限制。',
          },
        ],
        demos: [
          {
            title: '流水线气泡比例计算',
            lang: 'python',
            code: `def bubble_ratio(p_stages, m_micro):
    """1F1B 调度下的气泡比例。"""
    return (p_stages - 1) / (m_micro + p_stages - 1)

print("流水段数 P | 微批次 m | 气泡比例 | GPU 利用率")
print("-" * 50)
for p in (4, 8):
    for m in (4, 8, 16, 32, 64):
        b = bubble_ratio(p, m)
        print(f"{p:10} | {m:8} | {b:8.1%} | {(1-b):10.1%}")

print()
print("结论：m 越大气泡越小，但 micro-batch 太小会让单卡计算效率下降")
print("经验：m >= 4 × P 时气泡可接受（<20%）")

print()
print("=== 3D 并行配置验证 ===")
def check_3d(tp, pp, dp, total_gpus):
    used = tp * pp * dp
    ok = "✓" if used == total_gpus else f"✗ 差 {total_gpus-used}"
    print(f"TP={tp} × PP={pp} × DP={dp} = {used} 卡 (目标 {total_gpus}) {ok}")

check_3d(8, 8, 16, 1024)
check_3d(8, 4, 32, 1024)
check_3d(8, 16, 8, 1024)`,
          },
        ],
      },
      {
        id: 'llm-a2-c6-l3',
        title: 'ZeRO 与 FSDP：把优化器状态也切开',
        content: `
### 学习目标

学完本节，你应该能够：
1. 列出 ZeRO 三阶段各切什么及显存/通信代价；
2. 算出 7B 在 DP=8 下 ZeRO-1/2/3 的每卡显存（35 / 22.75 / 10.5 GiB）；
3. 说明 FSDP 与 ZeRO-3 的对应关系及按 block 包装 + 预取的实现要点。

### 前置知识

- 「张量并行与流水线并行」（c6-l2）；
- all-reduce/all-gather 概念。

### 问题背景

7B 全参训练起步 100+ GB、175B 起步数 TB——单卡物理放不下，分布式不是提速手段而是必需品。DP/TP/PP/SP 四种并行切的东西不同、通信代价不同，ZeRO/FSDP 则把数据并行里最冗余的显存也切开。

### 直觉理解

训练巨型模型像盖一张巨大拼图：DP 是复印整张图给每人一块拼图（各自拼不同区域再对答案）；TP 是把一层图案按列裁开给一组人（每步都要对缝，必须在同一房间 NVLink）；PP 是把上下半张图分给流水线工人（传接少但要微批流水防空转）；ZeRO 则发现大家复印的整张图和橡皮擦完全一样，索性每人只留 1/N，用时再借。

### 核心概念与原理详解

## 数据并行的显存浪费

DP 下每张卡都存一份完整的：权重 + 梯度 + 优化器状态。
**这些是完全冗余的**——N 张卡存了 N 份相同的东西。

**ZeRO（Zero Redundancy Optimizer）的思路**：把这些冗余切开，各卡只存 1/N。

<Diagram type="arch" name="kv-cache" />

## ZeRO 三个阶段

| 阶段 | 切什么 | 每卡显存（相对 DP） | 通信量 |
| --- | --- | --- | --- |
| **ZeRO-1** | 优化器状态 | 权重 + 梯度 + 优化器/N | 与 DP 相同 |
| **ZeRO-2** | + 梯度 | 权重 + 梯度/N + 优化器/N | 略增 |
| **ZeRO-3** | + 权重 | (权重 + 梯度 + 优化器)/N | 增 1.5 倍 |

以 7B 模型为例（DP=8）：

| 方式 | 每卡显存 | 说明 |
| --- | --- | --- |
| 纯 DP | 84 GB | 装不下 |
| ZeRO-1 | 14 + 14 + 7 = 35 GB | 优化器切 8 份 |
| ZeRO-2 | 14 + 1.75 + 7 = 22.75 GB | 梯度也切 |
| ZeRO-3 | (14+14+56)/8 = 10.5 GB | 全切 |

**ZeRO-3 是怎么做到的**：前向/反向时，用到哪一层就把那一层的权重从别的卡**取过来**（all-gather），
用完立刻释放。所以显存省了，但通信量增加。

## FSDP：PyTorch 官方的 ZeRO-3

\`FullyShardedDataParallel\` 是 PyTorch 对 ZeRO-3 的原生实现：

\`\`\`python
from torch.distributed.fsdp import FullyShardedDataParallel as FSDP

model = FSDP(
    model,
    sharding_strategy=ShardingStrategy.FULL_SHARD,   # 相当于 ZeRO-3
    # SHARD_GRAD_OP 相当于 ZeRO-2
    # NO_SHARD 相当于普通 DDP
    mixed_precision=MixedPrecision(param_dtype=torch.bfloat16),
    device_id=torch.cuda.current_device(),
)
\`\`\`

**关键：FSDP 包装的粒度**。通常按 Transformer Block 包装（\`auto_wrap_policy\`），
这样 all-gather 是以 block 为单位，能在计算当前 block 时预取下一个。

## 显存优化技术全景

| 技术 | 省什么 | 代价 |
| --- | --- | --- |
| ZeRO-1/2/3 | 优化器状态/梯度/权重 | 通信增加 |
| 梯度累积 | 激活（用小 batch 模拟大 batch） | 训练变慢 |
| 梯度检查点 | 激活（前向不存，反向重算） | 计算 +30% |
| 混合精度（bf16） | 权重/激活减半 | 精度略降 |
| 8-bit 优化器 | 优化器状态减到 1/4 | 精度略降 |
| CPU/NVMe offload | 全搬到 CPU/磁盘 | 速度大幅下降 |

**实战组合**：
7B 全参微调 = FSDP(ZeRO-3) + bf16 + 梯度检查点 + 梯度累积，
可在 8×A100(80G) 上跑。

## 一个重要的取舍：通信换显存

分布式训练的本质是**用通信换显存和算力**：

- TP：通信最多，省单层显存；
- PP：通信最少，省层数显存，但有气泡；
- ZeRO/FSDP：通信中等，省冗余显存。

**选择依据**：
1. 单层放不下 → 必须 TP；
2. 层数多、显存紧 → PP 或 FSDP；
3. 只缺优化器显存 → ZeRO-1/2 就够，通信代价最小。

<RecomputeDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
GB = 1e9
P = 7e9
w, g, opt = P*2/GB, P*2/GB, P*8/GB      # fp16 权重/梯度；fp32 m+v 各 4 字节
print(f"7B: 权重 {w:.0f} + 梯度 {g:.0f} + Adam {opt:.0f} = {w+g+opt:.0f} GB（不含激活）")
N = 8
print(f"ZeRO-1: {w+g+opt/N:.1f} | ZeRO-2: {w+g/N+opt/N:.1f} | ZeRO-3: {(w+g+opt)/N:.1f} GB")

# ---- 张量并行数值验证 ----
rng = np.random.default_rng(0)
X = rng.normal(size=(4, 8)); W = rng.normal(size=(8, 6)); Y = X @ W
print("列切等价:", np.allclose(np.hstack([X@W[:, :3], X@W[:, 3:]]), Y))
print("行切等价:", np.allclose(X[:, :4]@W[:4, :] + X[:, 4:]@W[4:, :], Y))

# ---- 流水线气泡 ----
for P_, m in [(4, 1), (4, 8), (8, 16)]:
    print(f"P={P_}, 微批 m={m}: 气泡比例 ≈ (P-1)/m = {(P_-1)/m:.2f}")\`\`\`

预期输出（实测）：7B 显存账：权重 14 + 梯度 14 + Adam 56 = 84 GB；ZeRO-1 35.0 / ZeRO-2 22.8 / ZeRO-3 10.5 GB；列切与行切均数值等价（allclose=True）；气泡比例：P=4,m=1 → 3.0（利用率 25%）、P=4,m=8 → 0.38、P=8,m=16 → 0.44。

**常见错误**：把 TP 放到跨机（以太网撑不住每层 all-reduce），训练慢 10 倍；PP 微批数 m 没调大，气泡比例 (P-1)/m 高达 75%，八卡只用上两卡；ZeRO-3 用了却没按 block 预取，all-gather 串行等待抵消显存收益。

### 常见误区

1. **『数据并行省显存』**——DP 每卡放完整模型，只提速不省显存；省显存靠 ZeRO/FSDP；\\n2. **『并行度越高越快』**——TP 通信量最大，通信超过计算收益后线性度崩塌，3D 并行是平衡艺术；\\n3. **『梯度检查点免费』**——用约 30% 额外计算换显存，与 ZeRO 组合才划算。

### 知识关联

- **向前**：c7 混合精度进一步把每卡显存除以 2；
- **向后**：llm-a4 的 MoE 在并行之上再加专家维度；
- **平行**：llm-a3 的 GQA/MLA 从模型结构侧砍显存，本章从系统侧砍，两面夹击。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 显存账 | 7B fp16：权重14 + 梯度14 + Adam56 ≈ 84 GiB |
| 四并行 | DP 切 batch / TP 切矩阵 / PP 切层 / SP 切序列 |
| 3D 组合 | TP≤8 占满单机 NVLink，PP 跨机，DP 填余 |
| 气泡 | 朴素 PP 利用率 1/P → 1F1B 微批，气泡 ≈ (P-1)/m |
| ZeRO | 1 切优化器 / 2 切梯度 / 3 切权重；FSDP=官方 ZeRO-3 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Vaswani et al. (2017)、Hoffmann et al. (2022) arXiv:2203.15556《Chinchilla》、Rajbhandari et al. (2020) ZeRO 论文与 PyTorch FSDP 文档相应章节）
`,
        tips: [
          {
            kind: 'interview',
            text: '「ZeRO 三阶段分别切什么」：ZeRO-1 切优化器状态、ZeRO-2 再切梯度、ZeRO-3 连权重也切。FSDP 是 PyTorch 的 ZeRO-3 实现。',
          },
          {
            kind: 'leak',
            text: '只缺优化器显存时用 ZeRO-1/2 就够，通信代价最小。ZeRO-3（FSDP）虽然最省显存，但通信量增加 1.5 倍。',
          },
          {
            kind: 'performance',
            text: '7B 全参微调的可复现配置：FSDP(ZeRO-3) + bf16 + 梯度检查点 + 梯度累积，8×A100 80G 可跑。',
          },
        ],
        demos: [
          {
            title: 'ZeRO 各阶段的显存对比',
            lang: 'python',
            code: `def zero_memory(n_params_b, world_size, precision=2):
    """各并行方式下每卡显存（GB）。"""
    n = n_params_b * 1e9
    w = n * precision / 1024**3       # 权重
    g = n * precision / 1024**3       # 梯度
    o = n * 4 * 2 / 1024**3           # Adam fp32 的 m + v

    return {
        "纯 DP":        w + g + o,
        "ZeRO-1":       w + g + o / world_size,
        "ZeRO-2":       w + g / world_size + o / world_size,
        "ZeRO-3/FSDP":  (w + g + o) / world_size,
    }

print("7B 模型，不同 DP 规模下每卡显存（GB）")
print("并行规模 | " + " | ".join(f"{k:>12}" for k in zero_memory(7, 8)))
print("-" * 70)
for ws in (1, 2, 4, 8, 16, 32):
    mem = zero_memory(7, ws)
    row = " | ".join(f"{v:12.1f}" for v in mem.values())
    print(f"{ws:8} | {row}")

print()
print("单卡 80GB 上限：")
for ws in (1, 2, 4, 8):
    mem = zero_memory(7, ws)
    ok3 = "✓" if mem["ZeRO-3/FSDP"] < 80 else "✗"
    print(f"  DP={ws:2}: ZeRO-3 每卡 {mem['ZeRO-3/FSDP']:5.1f} GB {ok3}")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-a2-c6-e1',
        relatedLessonId: 'llm-a2-c6-l3',
        type: 'single',
        difficulty: 2,
        question: '训练 7B 模型（fp16 + Adam）时，仅权重+梯度+优化器状态就约需多少显存？',
        options: [
          { value: 'A', text: '14 GB' },
          { value: 'B', text: '28 GB' },
          { value: 'C', text: '84 GB' },
          { value: 'D', text: '7 GB' },
        ],
        answer: 'C',
        explanation: '权重 14GB（fp16）+ 梯度 14GB（fp16）+ Adam 状态 56GB（fp32 的 m 和 v 各 28GB）= 84GB。再加激活值，单卡 80GB 放不下。',
        tags: ['显存'],
      },
      {
        id: 'llm-a2-c6-e2',
        relatedLessonId: 'llm-a2-c6-l3',
        type: 'judge',
        difficulty: 2,
        question: '数据并行（DP）能减少单卡显存占用。',
        answer: false,
        explanation: 'DP 每张卡都存完整模型与优化器状态，**显存完全没有节省**，它只解决训练速度（吞吐）。省显存需要 TP/PP/ZeRO/FSDP。',
        tags: ['数据并行'],
      },
      {
        id: 'llm-a2-c6-e3',
        relatedLessonId: 'llm-a2-c6-l2',
        type: 'single',
        difficulty: 3,
        question: '张量并行（TP）为什么通常限制在单机内（≤8 卡）？',
        options: [
          { value: 'A', text: '因为 GPU 数量不够' },
          { value: 'B', text: 'TP 每层都要 all-reduce，通信量极大，必须靠 NVLink 高带宽' },
          { value: 'C', text: '因为显存限制' },
          { value: 'D', text: 'TP 只能处理 8 层' },
        ],
        answer: 'B',
        explanation: 'TP 切的是单层内的矩阵，每层都要通信。跨节点以太网带宽远低于 NVLink（约 600GB/s），通信会成为瓶颈。',
        tags: ['张量并行'],
      },
      {
        id: 'llm-a2-c6-e4',
        relatedLessonId: 'llm-a2-c6-l3',
        type: 'multiple',
        difficulty: 3,
        question: '关于 ZeRO 三个阶段，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: 'ZeRO-1 切分优化器状态' },
          { value: 'B', text: 'ZeRO-2 在 ZeRO-1 基础上再切分梯度' },
          { value: 'C', text: 'ZeRO-3 连模型权重也切分' },
          { value: 'D', text: 'ZeRO-3 的通信量比纯 DP 更少' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: 'D 错误：ZeRO-3 需要在前向/反向时 all-gather 权重，通信量约是纯 DP 的 1.5 倍。省显存是用通信换来的。',
        tags: ['ZeRO'],
      },
      {
        id: 'llm-a2-c6-e5',
        relatedLessonId: 'llm-a2-c6-l2',
        type: 'fill',
        difficulty: 3,
        question: '流水线并行的气泡比例约为 (P-1)/___，其中 P 是流水段数。',
        blanks: [['m', 'P-1+m', 'P-1 + m']],
        explanation: 'm 是微批次（micro-batch）数量。气泡比例 ≈ (P-1)/(m+P-1)，m 越大气泡越小。经验上 m ≥ 4P 时气泡可接受。',
        tags: ['流水线并行'],
      },
      {
        id: 'llm-a2-c6-e6',
        relatedLessonId: 'llm-a2-c6-l1',
        type: 'code',
        difficulty: 2,
        question: '计算训练显存：实现 `train_mem_gb(n_params_b, precision_bytes=2)`，返回权重+梯度+Adam状态的总显存（GB，保留 2 位小数）。',
        starterCode: `def train_mem_gb(n_params_b, precision_bytes=2):
    n = n_params_b * 1e9
    weights = ___
    grads = ___
    optimizer = ___      # Adam: fp32 的 m 和 v
    return round((weights + grads + optimizer) / 1024**3, 2)


train_mem_gb(7)
`,
        setupCode: '',
        expectedOutput: '约 78.23 GiB（十进制约 84 GB）',
        tests: `m = train_mem_gb(7)
assert 77 < m < 80, f"7B 模型应约 78.2GiB（= 84 十进制 GB），实际 {m}"
assert train_mem_gb(1) < m, "1B 应小于 7B"
# 1B: (2+2+8)e9 / 1024^3 = 9.31
assert abs(train_mem_gb(1) - 11.18) < 0.1, f"1B 应约 11.18GiB，实际 {train_mem_gb(1)}"
# 权重+梯度用 precision_bytes，优化器固定 fp32 两份
assert abs(train_mem_gb(7, 4) - ((7e9*4*2 + 7e9*8)/1024**3)) < 0.1, "fp32 应正确计算"
`,
        answer: `def train_mem_gb(n_params_b, precision_bytes=2):
    n = n_params_b * 1e9
    weights = n * precision_bytes
    grads = n * precision_bytes
    optimizer = n * 4 * 2
    return round((weights + grads + optimizer) / 1024**3, 2)


train_mem_gb(7)`,
        explanation:
          '```python\nweights = n * precision_bytes\ngrads = n * precision_bytes\noptimizer = n * 4 * 2   # Adam 的 m 和 v 各一份 fp32\nreturn round((weights + grads + optimizer) / 1024**3, 2)\n```\n\n7B：14 + 14 + 56 = 84GB。\n\n**注意 /1024³** 而不是 /1e9——GB 与 GiB 的差别在几十 GB 量级上会差 7%。',
        tags: ['编程', '显存'],
      },
      {
        id: 'llm-a2-c6-e7',
        relatedLessonId: 'llm-a2-c6-l3',
        type: 'code',
        difficulty: 3,
        question: '计算 ZeRO 各阶段的每卡显存：实现 `zero_mem(n_params_b, world_size, stage)`。\n\n- stage=0：纯 DP（不切分）\n- stage=1：优化器切分\n- stage=2：优化器 + 梯度切分\n- stage=3：全部切分\n\n返回 GB（保留 2 位小数）。权重与梯度用 fp16，优化器用 fp32×2。',
        starterCode: `def zero_mem(n_params_b, world_size, stage):
    n = n_params_b * 1e9
    w = n * 2 / 1024**3
    g = n * 2 / 1024**3
    o = n * 4 * 2 / 1024**3
    if stage == 0:
        total = ___
    elif stage == 1:
        total = ___
    elif stage == 2:
        total = ___
    else:
        total = ___
    return round(total, 2)


zero_mem(7, 8, 3)
`,
        setupCode: '',
        expectedOutput: 'ZeRO-3 在 8 卡下约 9.87 GiB',
        tests: `# 7B, 8 卡（单位 GiB）
assert abs(zero_mem(7, 8, 0) - 78.23) < 0.3, f"纯 DP 应约 78.2GiB，实际 {zero_mem(7,8,0)}"
assert abs(zero_mem(7, 8, 1) - 32.60) < 0.3, f"ZeRO-1 应约 32.6GiB，实际 {zero_mem(7,8,1)}"
assert abs(zero_mem(7, 8, 2) - 21.19) < 0.3, f"ZeRO-2 应约 21.2GiB，实际 {zero_mem(7,8,2)}"
assert abs(zero_mem(7, 8, 3) - 9.78) < 0.3, f"ZeRO-3 应约 9.8GiB，实际 {zero_mem(7,8,3)}"
# 单调递减
assert zero_mem(7,8,0) > zero_mem(7,8,1) > zero_mem(7,8,2) > zero_mem(7,8,3)
`,
        answer: `def zero_mem(n_params_b, world_size, stage):
    n = n_params_b * 1e9
    w = n * 2 / 1024**3
    g = n * 2 / 1024**3
    o = n * 4 * 2 / 1024**3
    if stage == 0:
        total = w + g + o
    elif stage == 1:
        total = w + g + o / world_size
    elif stage == 2:
        total = w + g / world_size + o / world_size
    else:
        total = (w + g + o) / world_size
    return round(total, 2)


zero_mem(7, 8, 3)`,
        explanation:
          '```python\nif stage == 0:\n    total = w + g + o\nelif stage == 1:\n    total = w + g + o / world_size\nelif stage == 2:\n    total = w + g / world_size + o / world_size\nelse:\n    total = (w + g + o) / world_size\n```\n\n7B/8 卡：纯 DP 83.8 → ZeRO-1 35.0 → ZeRO-2 22.75 → ZeRO-3 10.48 GB。\n\n这就是为什么 7B 全参微调能在 8×80G 上跑——ZeRO-3 把每卡降到 10.5GB。',
        tags: ['编程', 'ZeRO'],
      },
      {
        id: 'llm-a2-c6-e8',
        relatedLessonId: 'llm-a2-c6-l2',
        type: 'code',
        difficulty: 3,
        question: '计算流水线气泡比例：`bubble_ratio(p_stages, m_micro)`，公式 `(P-1)/(m+P-1)`，保留 4 位小数。',
        starterCode: `def bubble_ratio(p_stages, m_micro):
    ___

bubble_ratio(8, 32)
`,
        setupCode: '',
        expectedOutput: '约 0.1791',
        tests: `assert abs(bubble_ratio(8, 32) - 0.1791) < 1e-3, f"应为 0.1791，实际 {bubble_ratio(8,32)}"
assert abs(bubble_ratio(4, 4) - 0.4286) < 1e-3, f"P=4,m=4 应为 3/7≈0.4286"
assert bubble_ratio(8, 64) < bubble_ratio(8, 32), "m 越大气泡越小"
assert bubble_ratio(4, 32) < bubble_ratio(8, 32), "P 越小气泡越小"
assert 0 <= bubble_ratio(2, 100) < 0.05, "P=2,m=100 气泡应很小"
`,
        answer: `def bubble_ratio(p_stages, m_micro):
    return round((p_stages - 1) / (m_micro + p_stages - 1), 4)


bubble_ratio(8, 32)`,
        explanation:
          '```python\nreturn round((p_stages - 1) / (m_micro + p_stages - 1), 4)\n```\n\nP=8, m=32：(8-1)/(32+8-1) = 7/39 ≈ 0.179，即 17.9% 的时间 GPU 在空转。\n\n**优化方向**：增大 m（更多微批次）或减少 P（更少流水段）。',
        tags: ['编程', '流水线'],
      },
      {
        id: 'llm-a2-c6-e9',
        relatedLessonId: 'llm-a2-c6-l3',
        type: 'judge',
        difficulty: 3,
        question: 'ZeRO-3（FSDP）虽然最省显存，但通信量比纯数据并行更大。',
        answer: true,
        explanation: 'ZeRO-3 在前向和反向时都要 all-gather 权重（用完释放），通信量约为纯 DP 的 1.5 倍。这是用通信换显存的典型取舍。',
        tags: ['ZeRO'],
      },
      {
        id: 'llm-a2-c6-e10',
        relatedLessonId: 'llm-a2-c6-l1',
        type: 'open',
        difficulty: 4,
        question:
          '你要在 64 张 A100(80GB) 上从头训练一个 70B 模型。请设计并行方案：说明 TP/PP/DP 各取多少、为什么这样分，并估算每卡的显存占用（含优化器与激活）。',
        referenceAnswer: `**一、显存估算（70B，bf16 + Adam）**

- 权重：70B × 2 = 140 GB
- 梯度：140 GB
- Adam 状态（fp32 m+v）：70B × 8 = 560 GB
- **小计 840 GB**（不含激活）

64 卡 × 80GB = 5120 GB 总显存，理论够，但要合理分配。

**二、并行方案设计**

**步骤 1：TP 先占满单机**

A100 单机 8 卡、NVLink 互联。TP 必须放在机内（通信量最大）。
取 **TP = 8**（占满一台机器）。

**步骤 2：PP 跨机**

PP 通信量最小（只在段边界传激活），适合跨节点。
64 卡 / TP 8 = 8 个 TP 组。若取 **PP = 4**，则 DP = 8/4 = 2。

或者 **PP = 8, DP = 1**（纯 TP×PP，无数据并行）。

**推荐 PP = 4, DP = 2**：总 8 × 4 × 2 = 64 ✓
- DP=2 提供一定的数据并行吞吐；
- PP=4 气泡可接受（配 m=16 micro-batch，气泡 ≈ 3/19 ≈ 16%）。

**三、每卡显存（TP=8, PP=4, DP=2）**

切分后每卡持有：
- 权重：140 GB / (TP×PP) = 140 / 32 = **4.4 GB**
- 梯度：**4.4 GB**
- 优化器：560 / 32 = **17.5 GB**（若用 ZeRO-1 切到 DP=2，则 8.75 GB）
- 激活：与 micro-batch × seq 相关，用梯度检查点后约 **10~20 GB**

**合计约 37~47 GB / 卡**，留有余量给通信缓冲与碎片。

**四、可选的进一步优化**

1. **ZeRO-1**：把优化器状态再按 DP 切 2 份 → 省 8.75 GB/卡；
2. **梯度检查点**：激活从 30GB 降到 10GB，代价是 +30% 计算；
3. **bf16 混合精度**：权重/梯度已经按 bf16 算；
4. **序列并行**：若序列长度 > 8K，考虑切 seq 维。

**五、验证与调优**

1. 先小规模验证（如 1/8 规模）确认配置能跑通；
2. 监控每卡显存峰值，确保 < 90% 上限；
3. 用 profiler 看通信占比，若 > 30% 说明切分不合理；
4. 逐步提高 micro-batch 减少气泡，直到显存吃满。

**关键原则**：TP 占满单机 NVLink → PP 跨机减少通信 → DP 填剩余提升吞吐。`,
        rubric: [
          { point: '正确估算 70B 训练显存（840GB 不含激活）', score: 2 },
          { point: 'TP=8 占满单机 NVLink，理由充分', score: 2 },
          { point: 'PP 跨机 + DP 填剩余，三者乘积等于 64', score: 2 },
          { point: '逐项算出每卡显存（权重/梯度/优化器/激活）', score: 2 },
          { point: '提出 ZeRO/梯度检查点等进一步优化', score: 1 },
        ],
        keywords: ['TP=8', 'NVLink', 'PP=4', 'DP=2', '840GB', '梯度检查点'],
        explanation: '这是分布式训练的综合设计题。核心是理解"TP 占单机、PP 跨机、DP 填剩余"这条实践准则。',
        tags: ['分布式', '系统设计'],
      },
    ],
  },
];
