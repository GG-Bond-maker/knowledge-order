import type { Chapter } from '../../types';

/* ============================================================
 *  人工智能基础 · 论文导读 · 记忆与推理
 *  19 A Simple Neural Network Module for Relational Reasoning
 *
 *  来源：
 *  - 论文：Santoro et al. (2017) arXiv:1706.01427
 *  - 参考：Ojhaharsh/30u30 第 19 篇（CC BY-NC-ND 4.0，本地个人使用）
 *  - 本课程为原创导读 + 原创习题
 *
 *  执行说明：本章代码需要 PyTorch，走本地后端执行。
 * ============================================================ */

export const paperReasoningChapters3: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c3: Relational Reasoning
   * ============================================================ */
  {
    id: 'paper-reasoning-c3',
    title: '关系网络：让模型显式地"两两比较"',
    goal: '理解为什么标准 CNN/RNN 难以做关系推理，掌握 Relation Network 的 g_θ(f_φ) 两阶段结构，能手写 RN 模块并做 CLEVR 式推理。',
    lessons: [
      {
        id: 'paper-reasoning-c3-l1',
        title: '关系推理：一个被忽略的能力',
        difficulty: 4,
        content: `
### 学习目标

学完本节，你应该能够：
1. 解释 CNN/RNN 做关系推理的缺陷（局部性、无显式比较）与 CLEVR 上的实验证据；
2. 手写 RN(O)=f_φ(Σ g_θ(o_i,o_j))，说明全配对（含 i=j）、共享 g、求和聚合三个设计各自的价值，尤其求和如何保留计数信息；
3. 用 numpy 实现 RN 模块，验证关系和对物体数量敏感（红红配对数=k²）。

### 前置知识

- MLP 与全连接层；
- VQA 任务形式（图像+问题→答案）；
- 集合求和的置换不变性直觉。

### 问题背景

CNN 看局部、RNN 看顺序，但「红色物体数量是否等于球的数量」要求对任意两个物体做两两比较再聚合统计——标准架构里没有「比较」这个算子，CLEVR 上 CNN+LSTM 只有 68.5%。Relation Network 用两行公式补上：对每对物体跑共享 MLP g_θ，n² 个关系向量求和后交给 f_φ 出答案。结构简单到失礼，却在 CLEVR 拿到 95.5% 超过人类（92.6%）。它也是 GNN 消息传递与 Transformer 注意力的极简先声。

### 直觉理解

判断「两个双胞胎谁年长」不能看合影（全局池化会抹平差异），必须 pairwise 单独比。RN 是「配对面谈」：把所有 (i,j) 组合请进同一间会议室（共享 g_θ），每人一句结论（关系向量），最后把所有结论倒进一个固定大小的箱子称重（求和）。箱子不随人数变大，而「有几个人发言」本身留在重量里——这就是计数能力的来源。

### 核心概念与原理详解

## 论文信息

| 项目 | 内容 |
| --- | --- |
| **标题** | A Simple Neural Network Module for Relational Reasoning |
| **作者** | Adam Santoro, David Raposo, David Barrett, Mateusz Malinowski, Razvan Pascanu, Peter Battaglia, Timothy Lillicrap（DeepMind） |
| **发表** | NeurIPS 2017 |
| **arXiv** | [1706.01427](https://arxiv.org/abs/1706.01427) |
| **一句话贡献** | 提出极简的 Relation Network：先对每对物体算关系，再聚合——用 2 个 MLP 解决关系推理 |

## 什么是"关系推理"

**任务示例**（CLEVR 数据集）：

    图中有 3 个物体：
      · 红色小球
      · 蓝色大立方体
      · 红色大圆柱

    问题："红色物体的数量是否等于球的数量？"

**需要的能力**：

| 能力 | 说明 |
| --- | --- |
| **物体识别** | 找出图中有哪些物体 |
| **属性提取** | 颜色、形状、大小 |
| **两两比较** | 比较任意两个物体的属性 |
| **聚合** | 统计满足条件的数量 |

**关键**：**"两两比较"是核心**。

<RelationalTaskDemo />

## 标准网络为什么不行

**CNN 的问题**：

    Conv → Conv → ... → GAP → FC → answer

**问题**：

| 问题 | 说明 |
| --- | --- |
| **局部性** | 卷积只看邻域，远距离物体难以交互 |
| **无显式比较** | 没有"物体 A vs 物体 B"的机制 |
| **难以组合** | 需要多层才能传播信息 |

**实验证据**（论文）：

| 模型 | CLEVR 准确率 |
| --- | --- |
| CNN + LSTM（标准 VQA） | 68.5% |
| **Relation Network** | **95.5%** |
| 人类 | 92.6% |

**关键**：RN **超过人类**，而 CNN+LSTM 差很多。

## Relation Network 的核心

**极简结构**：

    RN(O) = f_φ( Σ_{i,j} g_θ(o_i, o_j) )

**两个 MLP**：

| 组件 | 作用 |
| --- | --- |
| **g_θ** | 对每一对 (o_i, o_j) 计算"关系" |
| **f_φ** | 聚合所有关系，输出答案 |

<RelationNetworkDemo />

**详细流程**：

    ① 输入：物体表示 o_1, ..., o_n（每个是向量）
    ② 两两配对：所有 (i, j) 组合，共 n² 对
    ③ 计算关系：r_ij = g_θ(o_i, o_j)     # 每对一个向量
    ④ 求和聚合：r = Σ_ij r_ij            # 所有关系相加
    ⑤ 输出：y = f_φ(r)                   # 得到答案

**关键设计**：

| 设计 | 为什么 |
| --- | --- |
| **所有对都算** | 不遗漏任何关系（包括 i=j） |
| **共享 g_θ** | 参数少，且"关系"是通用的 |
| **求和而非拼接** | 对物体数量 n 不变（可处理任意 n） |
| **f_φ 非线性** | 能表达复杂聚合逻辑 |

## 为什么"求和"很关键

**问题**：如果有 n 个物体，两两配对有 n² 个关系向量。
怎么聚合成固定维度？

**方案对比**：

| 方案 | 问题 |
| --- | --- |
| 拼接 | 维度随 n² 增长，无法处理不同 n |
| 平均 | 可以，但丢失"数量"信息 |
| **求和** | **保留数量信息，维度固定** |

**为什么求和保留数量**：

    2 个"红色物体" -> r 中红色相关的分量是 1 个的 2 倍
    -> f_φ 可以通过大小判断数量

**这就是 CLEVR 计数类问题的关键**。

<SumAggregationDemo />

## 物体表示从哪来

**问题**：RN 需要物体表示 o_i，但图像是像素。

**两种做法**：

### ① 用现成的物体检测器

    图像 → Faster R-CNN → 物体框 + 特征 → o_i

**优点**：模块化
**缺点**：依赖检测器质量

### ② 用 CNN 特征图的每个位置

    图像 → CNN → 特征图 (H×W×C) → 展平成 H×W 个向量

**优点**：端到端
**缺点**：位置不是真正的"物体"

**论文的做法**：两种都试了，②更简单且效果好。

**这也是 RN 的一个局限**：
它假设"物体已经被分离出来了"。

## 论文的实验

### 任务 1：CLEVR（视觉问答）

**问题类型**：

| 类型 | 例子 |
| --- | --- |
| 计数 | 有多少个红色物体？ |
| 比较 | 红色物体比蓝色多吗？ |
| 存在 | 有立方体吗？ |
| 属性查询 | 大物体的颜色是什么？ |

**结果**：

| 模型 | 整体准确率 |
| --- | --- |
| CNN+LSTM | 68.5% |
| **RN** | **95.5%** |
| 人类 | 92.6% |

**分类型结果**（RN）：

| 类型 | 准确率 |
| --- | --- |
| 计数 | 92.7% |
| 比较 | 97.8% |
| 存在 | 99.1% |
| 属性查询 | 97.2% |

### 任务 2：Sort-of-CLEVR

**自建数据集**：简化版 CLEVR，问题分两类。

| 类型 | 说明 | RN | CNN |
| --- | --- | --- | --- |
| **非关系** | "这个物体是什么颜色" | 高 | 高 |
| **关系** | "这两个物体的形状相同吗" | **高** | **低** |

**关键**：RN 在关系问题上优势明显。

### 任务 3：bAbI（文本推理）

**任务**：基于故事的问答。

    "John 去了厨房。Mary 去了花园。John 拿起了苹果。"
    Q: "苹果在哪？"
    A: "厨房"

**结果**：

| 模型 | 准确率 |
| --- | --- |
| LSTM | 低（需要很多数据） |
| **RN** | **高** |

**为什么 RN 擅长**：
bAbI 需要"追踪实体间关系"（谁在哪、谁拿了什么）。

### 任务 4：动态物理系统

**任务**：预测多体系统的运动（球碰撞）。

**结果**：RN 比 LSTM 更准确，尤其在物体数量变化时。

## RN 的变体

### ① Pairwise RN

**改动**：不做全局求和，而是输出每对的分数。

    y_ij = g_θ(o_i, o_j)

**用途**：需要"哪两个物体有关系"的任务。

### ② Recurrent RN

**改动**：多次应用 g_θ。

    r^(k+1) = Σ_ij g_θ(o_i, o_j, r^(k))

**用途**：多步推理。

### ③ 与 Attention 结合

**Attention RN**：用注意力加权求和，而非简单求和。

    r = Σ_ij α_ij · g_θ(o_i, o_j)

**这就是后来的 Transformer 思路**。

## RN 的历史地位

**贡献**：

| 方面 | 说明 |
| --- | --- |
| **极简** | 2 个 MLP 解决关系推理 |
| **通用** | 视觉、文本、物理都能用 |
| **可组合** | 可以堆叠多个 RN |
| **启发后续** | 图神经网络、Transformer 的关系建模 |

**与图神经网络的关系**：

    RN 的 g_θ(o_i, o_j) ≈ GNN 的消息函数
    RN 的 Σ 聚合 ≈ GNN 的聚合函数

**RN 可以看作"全连接图上的 GNN"**。

**与 Transformer 的关系**：

| 组件 | RN | Transformer |
| --- | --- | --- |
| 两两交互 | g_θ(o_i, o_j) | Attention(Q,K) |
| 聚合 | 求和 | 加权求和 |
| 位置 | 无 | 位置编码 |

**Transformer 的注意力就是"带权重的 RN"**。

## 局限

| 局限 | 说明 |
| --- | --- |
| **n² 复杂度** | 物体多时计算量大 |
| **需要物体表示** | 依赖前置的物体检测/分割 |
| **无显式图结构** | 所有对都算，包括无关的 |
| **简单求和** | 可能被大量无关关系淹没 |

**改进方向**：

| 工作 | 改进 |
| --- | --- |
| **GNN** | 用图结构限制交互范围 |
| **Transformer** | 用注意力加权 |
| **Neural Module Networks** | 根据问题动态组合模块 |
| **Neural Message Passing** | 迭代式消息传递 |

## 本节来源

> **来源类型：学术来源**
> - Santoro, A. et al. *A Simple Neural Network Module for Relational Reasoning*
>   arXiv:[1706.01427](https://arxiv.org/abs/1706.01427)（NeurIPS 2017）
> - Johnson, J. et al. *CLEVR: A Diagnostic Dataset for Compositional Language
>   and Elementary Visual Reasoning* arXiv:[1612.06890](https://arxiv.org/abs/1612.06890)
> - Battaglia, P. et al. *Relational inductive biases, deep learning, and graph networks*
>   arXiv:[1806.01261](https://arxiv.org/abs/1806.01261)（综述）
>
> **来源类型：参考资料（CC BY-NC-ND 4.0，本地个人使用）**
> - Ojhaharsh/30u30 第 19 篇（244 行，含 RelationNetwork / add_coordinates）
>
> **来源类型：原创**
> - 全部导读文字、交互图示、代码示例与习题

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
rng = np.random.default_rng(2)
W1, W2 = rng.normal(0, 1, (4, 8)), rng.normal(0, 1, 8)
def g(a, b):
    return np.tanh(np.concatenate([a, b]) @ W1) @ W2
def RN(O):
    n = len(O)
    return sum(g(O[i], O[j]) for i in range(n) for j in range(n))
for k in (2, 3, 4):      # 场景: k 个红球(特征相同) + 1 个蓝方块
    scene = np.vstack([np.tile([1.0, 0.0], (k, 1)), [[0.0, 1.0]]])
    r = RN(scene)
    print(f"红球 {k} 个: |r|={np.linalg.norm(r):.3f}  sum(r)={r.sum():+.3f}")
print("红红配对数 = k^2, 求和把数量编码进关系和")\`\`\`

预期输出（实测）：实测：k=2/3/4 个红球时关系和 sum(r) = -8.59 / -11.83 / -15.11，随 k 单调变化——k² 个同特征红红配对各贡献一份 g([1,0],[1,0])，即使 g_θ 完全未训练，求和聚合也把「数量」编码进了关系和，f_φ 据此即可回答计数类问题。

**常见错误**：把 n² 个关系向量拼接而不是求和，维度随 n² 爆炸，物体数一变就要换网络；聚合改用 mean 丢掉数量信息，计数类问题全崩；漏掉有序对或跳过 i=j，丢掉「物体与自身/方向性关系」的信号。

### 常见误区

1. **RN 是新架构**——只有两个共享 MLP，贡献在「连接方式」：全配对 + 求和聚合；
2. **求和聚合是随意选择**——它同时给出置换不变与保留计数两件事，mean 丢数量、max 丢分布；
3. **RN 已过时**——GNN 的消息函数/聚合函数与 g_θ/Σ 一一对应，Transformer 是「带权重的 RN」。

### 知识关联

- **向前**：补足 CNN 卷积局部性没有显式「比较算子」的缺陷；
- **向后**：c5 MPNN 把「全配对」换成「沿边传递」，c4 RMC 的多头注意力让记忆槽两两交流；
- **平行**：图神经网络综述（Relational inductive biases）与 Set Transformer。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 公式 | RN(O) = f_φ( Σ_ij g_θ(o_i, o_j) )，两个共享 MLP |
| 三设计 | 全配对（含 i=j）、共享 g、求和聚合 |
| 求和的价值 | 置换不变 + 保留数量（红红配对 k²） |
| 战绩 | CLEVR 95.5% 超 CNN+LSTM 27 个点、超人类 92.6% |
| 地位 | GNN 消息传递与注意力两两交互的极简先声 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见论文原文：Santoro et al., A Simple Neural Network Module for Relational Reasoning, arXiv:1706.01427）
`,
        tips: [
          {
            kind: 'interview',
            text: '「RN 的核心公式」：RN(O) = f_φ(Σ_ij g_θ(o_i, o_j))。g_θ 对每对物体算关系，求和聚合（保留数量信息），f_φ 输出答案。极简但有效。',
          },
          {
            kind: 'leak',
            text: '「为什么用求和而非拼接」：拼接维度随 n² 增长，无法处理不同物体数。求和维度固定，且保留"数量"信息（2 个红物体 = 1 个的 2 倍）。',
          },
          {
            kind: 'pitfall',
            text: 'RN 需要"物体表示"作为输入——它假设物体已被检测/分割出来。这是它的前提也是局限（依赖前置模块）。',
          },
        ],
        demos: [
          {
            title: 'Relation Network 实现（PyTorch）',
            lang: 'python',
            code: `import torch
import torch.nn as nn

class RelationNetwork(nn.Module):
    """
    Relation Network: RN(O) = f_phi( sum_ij g_theta(o_i, o_j) )

    极简：两个 MLP 解决关系推理。
    """
    def __init__(self, obj_dim, relation_dim=256, out_dim=10):
        super().__init__()
        # g_theta: 对每对物体算关系
        self.g = nn.Sequential(
            nn.Linear(obj_dim * 2, relation_dim),
            nn.ReLU(),
            nn.Linear(relation_dim, relation_dim),
            nn.ReLU(),
            nn.Linear(relation_dim, relation_dim),
        )
        # f_phi: 聚合后输出答案
        self.f = nn.Sequential(
            nn.Linear(relation_dim, relation_dim),
            nn.ReLU(),
            nn.Linear(relation_dim, out_dim),
        )

    def forward(self, objects):
        """
        objects: (B, n, obj_dim)   n 个物体的表示
        返回: (B, out_dim)
        """
        B, n, d = objects.shape

        # ① 构造所有配对 (i, j)
        # 每个物体重复 n 次，得到 (B, n, n, d)
        o_i = objects.unsqueeze(2).expand(B, n, n, d)
        o_j = objects.unsqueeze(1).expand(B, n, n, d)

        # ② 拼接每一对
        pairs = torch.cat([o_i, o_j], dim=-1)      # (B, n, n, 2d)

        # ③ 计算关系
        relations = self.g(pairs)                   # (B, n, n, rel_dim)

        # ④ 求和聚合
        aggregated = relations.sum(dim=(1, 2))      # (B, rel_dim)

        # ⑤ 输出
        return self.f(aggregated)


print("=== Relation Network 前向 ===")
torch.manual_seed(42)
B, n, d = 2, 5, 8
rn = RelationNetwork(d, relation_dim=32, out_dim=4)

objects = torch.randn(B, n, d)
out = rn(objects)

print(f"物体表示: {tuple(objects.shape)}  (B={B}, n={n}, d={d})")
print(f"配对数: {n} × {n} = {n*n}")
print(f"输出: {tuple(out.shape)}")
print()
print("=== 关键：n 可以变化 ===")
print()
for test_n in [3, 5, 8, 12]:
    obj = torch.randn(1, test_n, d)
    o = rn(obj)
    print(f"n={test_n:>2}: 输出 {tuple(o.shape)}  (维度固定!)")
print()
print("因为求和聚合，输出维度与 n 无关")

print()
print("=== 参数量 ===")
total = sum(p.numel() for p in rn.parameters())
n_g = sum(p.numel() for p in rn.g.parameters())
n_f = sum(p.numel() for p in rn.f.parameters())
print(f"g_theta: {n_g:,}")
print(f"f_phi:   {n_f:,}")
print(f"总计:    {total:,}")
print()
print("注意：参数量与 n 无关——g_theta 在所有配对上共享")

print()
print("=== 求和 vs 平均：数量信息 ===")
print()
# 构造：1 个红球 vs 2 个红球
red = torch.tensor([1.0, 0.0, 0.0])
blue = torch.tensor([0.0, 1.0, 0.0])

one_red = torch.stack([red, blue, blue]).unsqueeze(0)      # 1红2蓝
two_red = torch.stack([red, red, blue]).unsqueeze(0)       # 2红1蓝

class SimpleRN(nn.Module):
    def __init__(self):
        super().__init__()
        self.g = nn.Linear(6, 4)
    def forward(self, o, mode='sum'):
        B, n, d = o.shape
        oi = o.unsqueeze(2).expand(B, n, n, d)
        oj = o.unsqueeze(1).expand(B, n, n, d)
        r = self.g(torch.cat([oi, oj], dim=-1))
        if mode == 'sum':
            return r.sum(dim=(1,2))
        return r.mean(dim=(1,2))

srn = SimpleRN()
with torch.no_grad():
    s1 = srn(one_red, 'sum')
    s2 = srn(two_red, 'sum')
    m1 = srn(one_red, 'mean')
    m2 = srn(two_red, 'mean')

print(f"1红2蓝 sum:  {s1[0].numpy()}")
print(f"2红1蓝 sum:  {s2[0].numpy()}")
print(f"  差异: {(s2-s1).abs().sum().item():.4f}  <- 求和保留了数量差异")
print()
print(f"1红2蓝 mean: {m1[0].numpy()}")
print(f"2红1蓝 mean: {m2[0].numpy()}")
print(f"  差异: {(m2-m1).abs().sum().item():.4f}  <- 平均抹平了数量差异")
print()
print("这就是为什么论文用 sum 而非 mean——计数任务需要数量信息")`,
          },
          {
            title: 'Sort-of-CLEVR 式关系推理训练',
            lang: 'python',
            code: `import torch
import torch.nn as nn
import torch.nn.functional as F

class RelationNetwork(nn.Module):
    def __init__(self, obj_dim, rel_dim=64, out_dim=2):
        super().__init__()
        self.g = nn.Sequential(
            nn.Linear(obj_dim * 2, rel_dim), nn.ReLU(),
            nn.Linear(rel_dim, rel_dim), nn.ReLU(),
        )
        self.f = nn.Sequential(
            nn.Linear(rel_dim, rel_dim), nn.ReLU(),
            nn.Linear(rel_dim, out_dim),
        )

    def forward(self, objects):
        B, n, d = objects.shape
        oi = objects.unsqueeze(2).expand(B, n, n, d)
        oj = objects.unsqueeze(1).expand(B, n, n, d)
        r = self.g(torch.cat([oi, oj], dim=-1))
        return self.f(r.sum(dim=(1, 2)))


def make_relational_task(batch_size, n_objects=6, seed=None):
    """
    生成关系推理任务：
    - 每个物体有 [颜色(2维onehot), 形状(2维onehot), 位置(2维)]
    - 问题：有多少对物体形状相同？

    标签：形状相同对的数量的奇偶性（二分类）
    """
    if seed is not None:
        torch.manual_seed(seed)

    B = batch_size
    colors = torch.randint(0, 2, (B, n_objects))
    shapes = torch.randint(0, 2, (B, n_objects))
    positions = torch.rand(B, n_objects, 2)

    # 物体表示
    objects = torch.cat([
        F.one_hot(colors, 2).float(),
        F.one_hot(shapes, 2).float(),
        positions,
    ], dim=-1)     # (B, n, 6)

    # 计算标签：形状相同的对数（奇偶）
    labels = torch.zeros(B, dtype=torch.long)
    for b in range(B):
        count = 0
        for i in range(n_objects):
            for j in range(i + 1, n_objects):
                if shapes[b, i] == shapes[b, j]:
                    count += 1
        labels[b] = count % 2

    return objects, labels


print("=== 训练关系网络做关系推理 ===")
torch.manual_seed(0)
N_OBJ = 6
OBJ_DIM = 6

model = RelationNetwork(OBJ_DIM, rel_dim=64, out_dim=2)
optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)

print(f"任务：{N_OBJ} 个物体，判断'形状相同的对数'的奇偶性")
print()

for epoch in range(1, 501):
    obj, labels = make_relational_task(64, N_OBJ)
    logits = model(obj)
    loss = F.cross_entropy(logits, labels)

    optimizer.zero_grad()
    loss.backward()
    optimizer.step()

    if epoch % 100 == 0:
        with torch.no_grad():
            pred = logits.argmax(dim=-1)
            acc = (pred == labels).float().mean().item()
        print(f"epoch {epoch:>3}: loss={loss.item():.4f}, 准确率={acc:.3f}")

print()
print("=== 对比：不用关系结构的模型 ===")
print()

class NoRelationNet(nn.Module):
    """把所有物体拼接后过 MLP（无两两比较）。"""
    def __init__(self, obj_dim, n_objects, hidden=64, out_dim=2):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(obj_dim * n_objects, hidden), nn.ReLU(),
            nn.Linear(hidden, hidden), nn.ReLU(),
            nn.Linear(hidden, out_dim),
        )
    def forward(self, objects):
        B = objects.shape[0]
        return self.net(objects.reshape(B, -1))

plain = NoRelationNet(OBJ_DIM, N_OBJ, out_dim=2)
opt2 = torch.optim.Adam(plain.parameters(), lr=1e-3)

for epoch in range(1, 501):
    obj, labels = make_relational_task(64, N_OBJ)
    loss = F.cross_entropy(plain(obj), labels)
    opt2.zero_grad()
    loss.backward()
    opt2.step()
    if epoch % 250 == 0:
        with torch.no_grad():
            acc = (plain(obj).argmax(-1) == labels).float().mean().item()
        print(f"无关系网络 epoch {epoch}: 准确率={acc:.3f}")

print()
print("=== 泛化测试：更多物体 ===")
print()
for test_n in [4, 6, 8, 10]:
    obj, labels = make_relational_task(64, test_n, seed=999)
    with torch.no_grad():
        # RN 可以处理任意 n
        acc_rn = (model(obj).argmax(-1) == labels).float().mean().item()
    print(f"n={test_n:>2}: RN 准确率 = {acc_rn:.3f}")

print()
print("注意：NoRelationNet 无法处理 n != 6（输入维度固定）")
print("RN 因为用求和聚合，天然支持任意 n")`,
          },
          {
            title: '可视化：关系矩阵',
            lang: "python",
            code: `import numpy as np

def relation_matrix(objects, seed=0):
    """
    计算关系强度矩阵（用简单的相似度模拟 g_theta）。

    objects: (n, d)
    返回: (n, n) 关系强度
    """
    n = len(objects)
    R = np.zeros((n, n))
    for i in range(n):
        for j in range(n):
            # 用余弦相似度模拟"关系"
            a, b = objects[i], objects[j]
            R[i, j] = (a @ b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-8)
    return R


def print_matrix(R, labels):
    print("       " + " ".join(f"{l:>5}" for l in labels))
    for i in range(len(R)):
        row = " ".join(f"{v:>5.2f}" for v in R[i])
        print(f"{labels[i]:>6} {row}")


print("=== 场景：CLEVR 式物体 ===")
print()
np.random.seed(42)

# 5 个物体，每个 8 维表示
labels = ['红球', '蓝方', '红方', '蓝球', '绿球']
objects = np.random.randn(5, 8)

# 让"红球"和"红方"相似（同为红色）
objects[2] = objects[0] + np.random.randn(8) * 0.3
# 让"蓝方"和"蓝球"相似（同为蓝色）
objects[3] = objects[1] + np.random.randn(8) * 0.3

R = relation_matrix(objects)
print("关系强度矩阵（余弦相似度）:")
print_matrix(R, labels)
print()
print("观察：")
print(f"  红球-红方: {R[0,2]:.3f}  (同为红色，相似度高)")
print(f"  蓝方-蓝球: {R[1,3]:.3f}  (同为蓝色，相似度高)")
print(f"  红球-蓝方: {R[0,1]:.3f}  (颜色不同，相似度低)")

print()
print("=== 聚合：求和 vs 平均 ===")
print()
print(f"所有关系求和: {R.sum():.3f}")
print(f"所有关系平均: {R.mean():.3f}")
print()
print("求和保留'数量'信息：物体越多，和越大")
print("平均则归一化，丢失数量信息")

print()
print("=== 为什么 n^2 对 ===")
print()
n = 5
print(f"n={n} 个物体 -> {n*n} 对（含自配对 i=j）")
print()
print("如果去掉自配对:")
print(f"  {n}*(n-1) = {n*(n-1)} 对（有向）")
print(f"  {n*(n-1)//2} 对（无向）")
print()
print("论文保留所有 n^2 对（含 i=j），因为：")
print("  · 自配对也有意义（物体自身的属性）")
print("  · 实现简单（广播即可）")

print()
print("=== 复杂度 ===")
print()
for n in [5, 10, 50, 100]:
    print(f"  n={n:>3}: {n*n:>6} 对, 若每对 1 次 MLP -> {n*n} 次前向")
print()
print("这就是 RN 的局限：n^2 复杂度")
print("改进：GNN 用图结构限制交互，Transformer 用稀疏注意力")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'paper-reasoning-c3-e1',
        type: 'single',
        difficulty: 2,
        question: 'Relation Network 的核心公式是？',
        options: [
          { value: 'A', text: 'RN(O) = f_φ(Σ_ij g_θ(o_i, o_j))' },
          { value: 'B', text: 'RN(O) = softmax(W·O)' },
          { value: 'C', text: 'RN(O) = max(o_1, ..., o_n)' },
          { value: 'D', text: 'RN(O) = concat(o_1, ..., o_n)' },
        ],
        answer: 'A',
        explanation:
          'g_θ 对每对物体算关系向量，求和聚合（保留数量信息、维度固定），f_φ 输出答案。极简的两个 MLP 就能做关系推理。',
        tags: ['核心公式'],
      },
      {
        id: 'paper-reasoning-c3-e2',
        type: 'judge',
        difficulty: 2,
        question: 'Relation Network 用"平均"聚合关系而非"求和"，效果更好。',
        answer: false,
        explanation:
          '论文用**求和**。平均会抹平"数量"信息——2 个红物体和 1 个红物体的平均关系一样，但求和是 2 倍。计数类任务（CLEVR 有很多）需要数量信息。',
        tags: ['聚合方式'],
      },
      {
        id: 'paper-reasoning-c3-e3',
        type: 'multiple',
        difficulty: 3,
        question: 'Relation Network 相比 CNN+LSTM 的优势？（多选）',
        options: [
          { value: 'A', text: '显式建模物体两两之间的关系' },
          { value: 'B', text: '求和聚合使输出维度与物体数量 n 无关' },
          { value: 'C', text: '参数量与 n 无关（g_θ 在所有对共享）' },
          { value: 'D', text: '计算复杂度是 O(n) 而非 O(n²)' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误——RN 要算所有 n² 对，复杂度是 O(n²)。这既是它的优势（不遗漏关系）也是局限（物体多时慢）。A/B/C 是核心优势。',
        tags: ['优势'],
      },
      {
        id: 'paper-reasoning-c3-e4',
        type: 'fill',
        difficulty: 3,
        question:
          'Relation Network 可以看作"全连接图上的 ___ 网络"——所有节点两两交互。',
        blanks: [['图', 'graph', '图神经']],
        explanation:
          'RN 的 g_θ(o_i,o_j) 相当于 GNN 的消息函数，Σ 聚合相当于 GNN 的聚合函数。区别是 RN 假设全连接（所有对都算），GNN 用实际图结构（稀疏）。',
        tags: ['与 GNN 关系'],
      },
      {
        id: 'paper-reasoning-c3-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现两两配对：make_pairs(objects)。\n\n- objects: (n, d)\n- 返回 (n, n, 2d)，其中 [i,j] 位置是 concat(o_i, o_j)',
        starterCode: `import numpy as np

def make_pairs(objects):
    objects = np.asarray(objects, dtype=float)
    n, d = objects.shape
    o_i = ___
    o_j = ___
    return ___
`,
        setupCode: '',
        expectedOutput: '配对张量',
        tests: `import numpy as np
obj = np.array([[1.0, 2.0], [3.0, 4.0], [5.0, 6.0]])
pairs = make_pairs(obj)

assert pairs.shape == (3, 3, 4), f"形状错误: {pairs.shape}"

# [0,1] 应是 concat(obj[0], obj[1])
assert np.allclose(pairs[0, 1], [1.0, 2.0, 3.0, 4.0])
assert np.allclose(pairs[1, 0], [3.0, 4.0, 1.0, 2.0])
assert np.allclose(pairs[2, 2], [5.0, 6.0, 5.0, 6.0])

# 自配对
assert np.allclose(pairs[0, 0], [1.0, 2.0, 1.0, 2.0])
`,
        answer: `import numpy as np

def make_pairs(objects):
    objects = np.asarray(objects, dtype=float)
    n, d = objects.shape
    o_i = np.repeat(objects[:, None, :], n, axis=1)     # (n, n, d)
    o_j = np.repeat(objects[None, :, :], n, axis=0)     # (n, n, d)
    return np.concatenate([o_i, o_j], axis=-1)
`,
        explanation:
          '**目标形状**：(n, n, 2d)。\n\n**`o_i`**：第 i 个物体重复 n 次 → `pairs[i, :]` 的第一个 d 维都是 o_i。\n\n**`o_j`**：第 j 个物体在每行重复 → `pairs[:, j]` 的第二个 d 维都是 o_j。\n\n**PyTorch 的写法更简洁**：\n\n    o_i = objects.unsqueeze(2).expand(B, n, n, d)\n    o_j = objects.unsqueeze(1).expand(B, n, n, d)\n    pairs = torch.cat([o_i, o_j], dim=-1)\n\n**注意 `expand` 不复制内存**（只是视图），效率高。\n\n**含 i=j**：论文保留自配对——物体自身属性也有意义。',
        tags: ['编程', '两两配对'],
      },
      {
        id: 'paper-reasoning-c3-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现 RN 的聚合：aggregate_relations(relations, mode="sum")。\n\n- relations: (n, n, rel_dim)\n- mode="sum" 或 "mean"\n- 返回 (rel_dim,)',
        starterCode: `import numpy as np

def aggregate_relations(relations, mode="sum"):
    relations = np.asarray(relations, dtype=float)
    if mode == "sum":
        return ___
    elif mode == "mean":
        return ___
    else:
        raise ValueError(f"未知模式: {mode}")
`,
        setupCode: '',
        expectedOutput: '聚合结果',
        tests: `import numpy as np
R = np.ones((3, 3, 4))

s = aggregate_relations(R, "sum")
assert s.shape == (4,)
assert np.allclose(s, 9.0), f"求和应为 9，实际 {s}"

m = aggregate_relations(R, "mean")
assert m.shape == (4,)
assert np.allclose(m, 1.0)

# 数量差异：2x2 vs 3x3
R2 = np.ones((2, 2, 4))
assert aggregate_relations(R2, "sum")[0] == 4.0
assert aggregate_relations(R, "sum")[0] == 9.0
# 平均相同
assert np.allclose(aggregate_relations(R2, "mean"), aggregate_relations(R, "mean"))
`,
        answer: `import numpy as np

def aggregate_relations(relations, mode="sum"):
    relations = np.asarray(relations, dtype=float)
    if mode == "sum":
        return relations.sum(axis=(0, 1))
    elif mode == "mean":
        return relations.mean(axis=(0, 1))
    else:
        raise ValueError(f"未知模式: {mode}")
`,
        explanation:
          '**`axis=(0, 1)`** 对前两维（n×n）求和/平均，保留最后一维（rel_dim）。\n\n**关键差异**：\n\n| 模式 | n=2 | n=3 | 说明 |\n| --- | --- | --- | --- |\n| sum | 4 | 9 | **保留数量** |\n| mean | 1 | 1 | 抹平数量 |\n\n**为什么论文用 sum**：\n\nCLEVR 有大量计数问题："有多少个红物体"。\n用 sum 时，红物体越多，聚合向量的相关分量越大 → f_φ 能"数"。\n用 mean 则丢失这个信息。\n\n**注意**：sum 的代价是数值范围随 n 变化，可能需要归一化。',
        tags: ['编程', '聚合'],
      },
      {
        id: 'paper-reasoning-c3-e7',
        type: 'code',
        difficulty: 3,
        question:
          '用 PyTorch 实现完整的 RelationNetwork：\n\nforward(objects) -> (B, out_dim)\n- objects: (B, n, obj_dim)\n- 内部：两两配对 → g_θ → 求和 → f_φ',
        starterCode: `import torch
import torch.nn as nn

class RelationNetwork(nn.Module):
    def __init__(self, obj_dim, rel_dim=64, out_dim=10):
        super().__init__()
        self.g = nn.Sequential(
            nn.Linear(obj_dim * 2, rel_dim), nn.ReLU(),
            nn.Linear(rel_dim, rel_dim), nn.ReLU(),
        )
        self.f = nn.Sequential(
            nn.Linear(rel_dim, rel_dim), nn.ReLU(),
            nn.Linear(rel_dim, out_dim),
        )

    def forward(self, objects):
        B, n, d = objects.shape
        o_i = ___
        o_j = ___
        pairs = ___
        relations = ___
        aggregated = ___
        return ___
`,
        setupCode: '',
        expectedOutput: 'RelationNetwork',
        tests: `import torch
import torch.nn as nn

torch.manual_seed(0)
rn = RelationNetwork(6, rel_dim=32, out_dim=4)

# 不同 n 都能处理
for n in [2, 5, 10]:
    obj = torch.randn(2, n, 6)
    out = rn(obj)
    assert out.shape == (2, 4), f"n={n} 形状错误: {out.shape}"

# 梯度可回传
obj = torch.randn(1, 4, 6, requires_grad=True)
rn(obj).sum().backward()
assert obj.grad is not None
assert obj.grad.abs().sum() > 0

# 参数量与 n 无关
p1 = sum(p.numel() for p in rn.parameters())
rn2 = RelationNetwork(6, rel_dim=32, out_dim=4)
p2 = sum(p.numel() for p in rn2.parameters())
assert p1 == p2
`,
        answer: `import torch
import torch.nn as nn

class RelationNetwork(nn.Module):
    def __init__(self, obj_dim, rel_dim=64, out_dim=10):
        super().__init__()
        self.g = nn.Sequential(
            nn.Linear(obj_dim * 2, rel_dim), nn.ReLU(),
            nn.Linear(rel_dim, rel_dim), nn.ReLU(),
        )
        self.f = nn.Sequential(
            nn.Linear(rel_dim, rel_dim), nn.ReLU(),
            nn.Linear(rel_dim, out_dim),
        )

    def forward(self, objects):
        B, n, d = objects.shape
        o_i = objects.unsqueeze(2).expand(B, n, n, d)
        o_j = objects.unsqueeze(1).expand(B, n, n, d)
        pairs = torch.cat([o_i, o_j], dim=-1)
        relations = self.g(pairs)
        aggregated = relations.sum(dim=(1, 2))
        return self.f(aggregated)
`,
        explanation:
          '**`unsqueeze(2)` 和 `unsqueeze(1)`**：\n\n    objects: (B, n, d)\n    unsqueeze(2) -> (B, n, 1, d) -> expand -> (B, n, n, d)   # o_i 沿 j 广播\n    unsqueeze(1) -> (B, 1, n, d) -> expand -> (B, n, n, d)   # o_j 沿 i 广播\n\n**`expand` 不复制内存**——只是改变 stride，效率高。\n\n**`sum(dim=(1,2))`**：对 n×n 求和，得到 (B, rel_dim)。\n\n**为什么这个设计优雅**：\n\n1. **参数与 n 无关**：g_θ 在所有对共享\n2. **输出维度与 n 无关**：求和聚合\n3. **n² 复杂度**：是优势（不遗漏）也是局限（物体多时慢）',
        tags: ['编程', 'RelationNetwork'],
      },
      {
        id: 'paper-reasoning-c3-e8',
        type: 'code',
        difficulty: 4,
        question:
          '计算"形状相同的对数"（关系推理的标签）：count_same_shape_pairs(shapes)。\n\n- shapes: (n,) 整数数组\n- 返回相同值的无序对数（i < j）',
        starterCode: `import numpy as np

def count_same_shape_pairs(shapes):
    shapes = np.asarray(shapes)
    count = 0
    n = len(shapes)
    for i in range(n):
        for j in range(i + 1, n):
            if ___:
                count += 1
    return count
`,
        setupCode: '',
        expectedOutput: '相同对数量',
        tests: `import numpy as np
# 全相同：C(4,2)=6
assert count_same_shape_pairs(np.array([1,1,1,1])) == 6
# 全不同
assert count_same_shape_pairs(np.array([0,1,2,3])) == 0
# 两两相同
assert count_same_shape_pairs(np.array([0,0,1,1])) == 2
# 混合
assert count_same_shape_pairs(np.array([0,0,0,1])) == 3
# 单个
assert count_same_shape_pairs(np.array([5])) == 0
# 空
assert count_same_shape_pairs(np.array([])) == 0
`,
        answer: `import numpy as np

def count_same_shape_pairs(shapes):
    shapes = np.asarray(shapes)
    count = 0
    n = len(shapes)
    for i in range(n):
        for j in range(i + 1, n):
            if shapes[i] == shapes[j]:
                count += 1
    return count
`,
        explanation:
          '**`i < j` 保证无序对**：\n\n    对 (0,1) 和 (1,0) 是同一对，只算一次\n\n**组合数公式**：如果某形状出现 k 次，贡献 C(k,2) = k(k-1)/2 对。\n\n**更高效的实现**：\n\n    from collections import Counter\n    return sum(k*(k-1)//2 for k in Counter(shapes).values())\n\nO(n) 而非 O(n²)。\n\n**这个任务的意义**：\n它需要"两两比较"——正是 Relation Network 擅长的。\n普通 MLP 拼接所有形状后难以学会"数对数"。',
        tags: ['编程', '关系标签'],
      },
      {
        id: 'paper-reasoning-c3-e9',
        type: 'judge',
        difficulty: 4,
        question: 'Relation Network 的计算复杂度是 O(n)，因为 g_θ 在所有配对上共享参数。',
        answer: false,
        explanation:
          '参数共享 ≠ 计算量少。RN 要算所有 n² 对，**计算复杂度是 O(n²)**。参数共享只是让参数量与 n 无关。这是 RN 的主要局限（物体多时慢）。',
        tags: ['复杂度'],
      },
      {
        id: 'paper-reasoning-c3-e10',
        type: 'open',
        difficulty: 4,
        question:
          '请解释：① 为什么标准 CNN/LSTM 难以做关系推理；② RN 的两阶段结构；③ 为什么用求和而非平均；④ RN 与 GNN/Transformer 的关系。',
        referenceAnswer: `**① 为什么标准网络难以做关系推理**

**关系推理需要什么**：

| 能力 | 说明 |
| --- | --- |
| 物体识别 | 找出图中有哪些物体 |
| 属性提取 | 颜色、形状、大小 |
| **两两比较** | 比较任意两个物体 |
| 聚合 | 统计满足条件的数量 |

**CNN 的问题**：

    Conv → Conv → ... → GAP → FC → answer

| 问题 | 说明 |
| --- | --- |
| **局部性** | 卷积只看邻域，远距离物体难交互 |
| **无显式比较** | 没有"物体 A vs B"的机制 |
| **需要多层传播** | 信息要经过很多层才能相遇 |

**LSTM 的问题**：

把图像特征当序列读入，但：
- 顺序是人为的（图像没有自然顺序）
- 难以"回头比较"已读过的物体

**实验证据**：

| 模型 | CLEVR 准确率 |
| --- | --- |
| CNN+LSTM | 68.5% |
| **RN** | **95.5%** |
| 人类 | 92.6% |

**差 27 个百分点**——不是调参能弥补的，是**结构缺陷**。

---

**② RN 的两阶段结构**

**公式**：

    RN(O) = f_φ( Σ_{i,j} g_θ(o_i, o_j) )

**两个 MLP**：

**阶段 1：g_θ（关系函数）**

    输入：一对物体 (o_i, o_j)
    输出：关系向量 r_ij

**特点**：
- 对所有 n² 对**共享参数**
- 不需要知道 n（输入是固定维度的 2d）

**阶段 2：f_φ（聚合输出）**

    输入：Σ r_ij（聚合后的单个向量）
    输出：答案

**特点**：
- 输入维度固定（rel_dim）
- 与 n 无关

**完整流程**：

    ① objects: (n, d)
    ② 构造所有配对: (n, n, 2d)
    ③ r = g_θ(pairs): (n, n, rel_dim)
    ④ 求和: (rel_dim,)
    ⑤ y = f_φ(sum): (out_dim,)

**为什么这个设计巧妙**：

| 设计 | 效果 |
| --- | --- |
| 所有对都算 | 不遗漏任何关系 |
| 共享 g_θ | 参数与 n 无关 |
| 求和聚合 | 输出维度与 n 无关 |
| f_φ 非线性 | 能表达复杂逻辑 |

---

**③ 为什么用求和而非平均**

**关键：计数任务**

CLEVR 中大量问题是"有多少个 X"。

**例子**：数红色物体

    1 个红物体：r = g(红,红) + g(红,蓝) + g(蓝,红) + g(蓝,蓝)
    2 个红物体：r = 4 个 g(红,*) 项 + ...

**用 sum**：

    红物体相关的分量大小 ∝ 红物体数量
    f_φ 可以"看大小"来数

**用 mean**：

    归一化了，1 个和 2 个的平均关系一样
    **丢失数量信息**

**实验验证**（论文）：

| 聚合 | 计数类准确率 |
| --- | --- |
| **sum** | **92.7%** |
| mean | 明显更低 |

**代价**：

sum 的数值范围随 n 变化（n 大时值大）。
可能需要归一化或让 f_φ 适应不同尺度。

**其他聚合方式**：

| 方式 | 保留数量 | 维度固定 |
| --- | --- | --- |
| concat | ✅ | ❌ |
| sum | ✅ | ✅ |
| mean | ❌ | ✅ |
| max | ❌ | ✅ |

**sum 是唯一同时满足两个要求的**。

---

**④ 与 GNN/Transformer 的关系**

**RN ≈ 全连接图上的 GNN**

**GNN 的消息传递**：

    m_ij = M(h_i, h_j)          # 消息函数
    m_i = Σ_{j∈N(i)} m_ij       # 聚合
    h_i' = U(h_i, m_i)          # 更新

**RN**：

    r_ij = g_θ(o_i, o_j)        # 相当于 M
    r = Σ_ij r_ij               # 相当于聚合（但全局，不是邻居）
    y = f_φ(r)                  # 相当于 U（但只输出一次）

**关键差异**：

| 维度 | RN | GNN |
| --- | --- | --- |
| 图结构 | 全连接（所有对） | 稀疏（实际边） |
| 聚合范围 | 全局 | 邻居 |
| 迭代 | 一次 | 多次 |
| 复杂度 | O(n²) | O(n·deg) |

**RN 是 GNN 的特例**（全连接图 + 单次聚合）。

**RN 与 Transformer**：

**Transformer 的注意力**：

    Attention(Q, K, V) = softmax(QK^T/√d) · V

**对比 RN**：

    RN:          r = Σ_ij g_θ(o_i, o_j)
    Transformer: r_i = Σ_j softmax(q_i·k_j) · v_j

**对应关系**：

| RN | Transformer |
| --- | --- |
| g_θ(o_i, o_j) | q_i·k_j（打分） |
| 求和 | 加权求和（权重=softmax） |
| 无权重 | **有权重** |

**Transformer 相当于"带注意力权重的 RN"**：
- 不是所有对等权，而是按相关性加权
- 这解决了 RN 的一个问题（无关关系淹没重要关系）

**历史脉络**：

    2015 Pointer Networks    -> 注意力当输出
    2017 Relation Network    -> 两两比较 + 聚合
    2017 Transformer         -> 带权重的两两比较
    2018 GNN 综述            -> 统一框架
    2020+ 图 Transformer     -> 结合图结构与注意力

---

**⑤ 一个诚实的评价**

**RN 的价值**：

| 方面 | 说明 |
| --- | --- |
| **极简** | 2 个 MLP 就能做关系推理 |
| **通用** | 视觉、文本、物理都能用 |
| **清晰** | 结构明确，易理解 |
| **启发** | GNN/Transformer 的思想源头之一 |

**RN 的局限**：

| 局限 | 说明 |
| --- | --- |
| **O(n²)** | 物体多时慢 |
| **无权重** | 无关关系也会累加 |
| **需要物体表示** | 依赖前置检测/分割 |
| **单次聚合** | 复杂推理需要堆叠多层 |

**但它的历史意义很大**：

> 它明确提出了"**显式建模两两关系**"这个设计原则。

今天所有需要关系推理的模型（GNN、Transformer、图 Transformer）
都继承了这个思想。

**RN 不是"最好的"，但它是"最清晰的"**——
用来理解关系推理的本质非常合适。`,
        rubric: [
          { point: 'CNN 局部性/无显式比较；CLEVR 68.5% vs 95.5%', score: 3 },
          { point: '两阶段：g_θ 算关系（共享）+ f_φ 聚合输出', score: 2 },
          { point: 'sum vs mean：计数任务需要数量信息', score: 2 },
          { point: 'RN ≈ 全连接 GNN；Transformer = 带权重的 RN', score: 2 },
          { point: '诚实评价：O(n²)/无权重/需物体表示，但思想重要', score: 1 },
        ],
        keywords: ['显式两两比较', '求和保数量', '全连接GNN', '带权重RN', '思想源头'],
        explanation:
          '能说清「Transformer 相当于带注意力权重的 RN」以及「sum 是唯一同时满足保数量+维度固定的聚合」，就是理解了 RN 的设计精髓。',
        tags: ['综合分析'],
      },
    ],
  },
];
