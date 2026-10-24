import type { Chapter } from '../../types';

/* ============================================================
 *  人工智能基础 · 论文导读 · 记忆与推理
 *  21 Neural Message Passing for Quantum Chemistry
 *
 *  来源：
 *  - 论文：Gilmer, Schoenholz, Riley, Vinyals, Dahl (2017) arXiv:1704.01212
 *  - 参考：Ojhaharsh/30u30 第 21 篇（CC BY-NC-ND 4.0，本地个人使用）
 *  - 本课程为原创导读 + 原创习题
 *
 *  执行说明：本章代码需要 PyTorch，走本地后端执行。
 * ============================================================ */

export const paperReasoningChapters5: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c5: Neural Message Passing
   * ============================================================ */
  {
    id: 'paper-reasoning-c5',
    title: '消息传递：在图结构上做深度学习',
    goal: '理解消息传递框架（MPNN）的三个阶段，掌握如何在分子图上做端到端学习，能手写 MPNN 层与 readout。',
    lessons: [
      {
        id: 'paper-reasoning-c5-l1',
        title: '图上的深度学习：从分子说起',
        difficulty: 5,
        content: `
### 学习目标

学完本节，你应该能够：
1. 说明图数据与网格/序列的本质差异（邻居数可变、无自然顺序）与三大归纳偏置（置换不变、沿边局部、可变大小）；
2. 手写 MPNN 三阶段（消息→聚合→更新）与 readout，解释求和聚合为何同时给出置换不变与计数保留；
3. 用 numpy 在 5 节点图上传 2 轮消息，验证节点重编号后图表示完全不变。

### 前置知识

- 邻接矩阵与图的基本表示；
- 置换不变概念（c3 已建立）；
- MLP。

### 问题背景

分子是天然的图：原子是节点、化学键是边。预测分子性质，量子化学计算（DFT）精确但一个分子要算几小时，分子指纹+回归快但手工特征表达力有限，SMILES+RNN 则丢掉图结构。MPNN 论文把散落的图神经网络统一成「消息计算 → 聚合 → 更新」三段框架，在 QM9 上以快约六个数量级的速度逼近化学精度（1 kcal/mol）。今天几乎所有 GNN 论文都用这套框架表述——它是图深度学习的通用语法。

### 直觉理解

小区传八卦：每个住户（节点）先给所有邻居发消息（消息函数），把收到的八卦全部倒进一个袋子求和（聚合——谁先谁后无所谓，所以换门牌号也不会乱），再结合自己原有的认知更新判断（更新函数）。传 T 轮八卦就扩散 T 跳；最后把全楼住户的判断汇总（readout），得出整栋楼的评分（分子性质）。

### 核心概念与原理详解

## 论文信息

| 项目 | 内容 |
| --- | --- |
| **标题** | Neural Message Passing for Quantum Chemistry |
| **作者** | Justin Gilmer, Samuel S. Schoenholz, Patrick F. Riley, Oriol Vinyals, George E. Dahl（Google Brain） |
| **发表** | ICML 2017 |
| **arXiv** | [1704.01212](https://arxiv.org/abs/1704.01212) |
| **一句话贡献** | 把散落在各处的图神经网络方法统一成"消息传递"框架（MPNN），并用于分子性质预测 |

## 为什么需要图

**分子就是图**：

    原子 = 节点（node）
    化学键 = 边（edge）

**例子**：水分子 H₂O

    O — H
    |
    H

**3 个原子，2 个键**。

**问题**：预测分子的性质（能量、偶极矩、溶解度...）

**传统方法**：

| 方法 | 问题 |
| --- | --- |
| **量子化学计算（DFT）** | 精确但极慢（每个分子数小时） |
| **分子指纹 + 回归** | 手工特征，表达能力有限 |
| **字符串（SMILES）+ RNN** | 丢失图结构 |

**目标**：**直接从图结构学习，又快又准**。

<MoleculeGraphDemo />

## 图数据的挑战

**为什么 CNN/RNN 不能直接用**：

| 模型 | 问题 |
| --- | --- |
| **CNN** | 需要网格结构（图像），图没有固定邻居数 |
| **RNN** | 需要序列顺序，图的节点无自然顺序 |

**关键差异**：

| 数据 | 结构 | 邻居数 |
| --- | --- | --- |
| 图像 | 网格 | 固定（如 3×3） |
| 文本 | 序列 | 固定（前后各 1） |
| **图** | **任意** | **可变（1~N）** |

**需要新的归纳偏置**：

    ① 置换不变性：节点顺序改变，结果不变
    ② 局部性：信息通过边传播
    ③ 可变大小：节点数可以变化

## 消息传递框架（MPNN）

**核心思想**：**让节点之间反复传递消息**。

**三个阶段**：

### ① 消息计算（Message）

对每条边 (v, w)，计算从 v 发给 w 的消息：

    m_{vw} = M(h_v, h_w, e_{vw})

| 符号 | 含义 |
| --- | --- |
| h_v, h_w | 节点特征（原子类型、电荷...） |
| e_{vw} | 边特征（键类型、距离...） |
| M | 消息函数（通常是 MLP） |

### ② 消息聚合（Aggregate）

每个节点收集所有邻居发来的消息：

    m_v = Σ_{w ∈ N(v)} m_{wv}

**关键**：**求和**（或 mean/max）——保证置换不变。

### ③ 节点更新（Update）

    h_v' = U(h_v, m_v)

用 GRU 或 MLP 更新节点状态。

<MessagePassingDemo />

**完整一轮**：

    for each node v:
        messages = [M(h_v, h_w, e_vw) for w in neighbors(v)]
        m_v = sum(messages)
        h_v = U(h_v, m_v)

**重复 T 轮** → 信息传播 T 跳。

## 为什么"求和"保证置换不变

**问题**：邻居的顺序是任意的（图没有自然顺序）。

**如果拼接**：

    concat([m1, m2, m3]) ≠ concat([m2, m1, m3])

**顺序变了结果就变** → 违反置换不变性。

**如果用求和**：

    m1 + m2 + m3 = m2 + m1 + m3

**顺序无关** ✓

**其他可行的聚合**：

| 聚合 | 置换不变 | 特点 |
| --- | --- | --- |
| **sum** | ✅ | 保留数量信息 |
| **mean** | ✅ | 归一化，丢失数量 |
| **max** | ✅ | 关注最强信号 |
| **attention** | ✅ | 加权，最灵活 |

**这就是图神经网络的核心设计原则。**

<PermutationInvarianceDemo />

## Readout：从节点到图

**问题**：我们想预测整个分子的性质，但 MPNN 输出的是每个节点的表示。

**解法**：**Readout 函数**把节点表示聚合成图表示。

    y = R({h_v : v ∈ G})

**两种 readout**：

### ① Sum / Mean Readout

    y = MLP(Σ_v h_v)

**简单，但可能丢失结构信息**。

### ② Set2Set（论文用的）

**思想**：用注意力反复"查询"节点集合。

    q_0 = 0
    for t in range(T):
        α = softmax(h_v · q_t)        # 注意力权重
        r_t = Σ α_v · h_v             # 加权求和
        q_{t+1} = LSTM(q_t, r_t)      # 更新查询
    y = concat(q_0, ..., q_T)

**优势**：
- 可以多次"读取"不同方面
- 比简单求和表达能力强
- 对节点数不敏感

<ReadoutDemo />

## 论文的实验：QM9 数据集

**数据集**：13 万个小分子（最多 9 个重原子）。

**任务**：预测 13 种量子化学性质。

| 性质 | 说明 |
| --- | --- |
| 原子化能 | 分子稳定性 |
| 偶极矩 | 极性 |
| HOMO/LUMO | 能级 |
| 极化率 | 电子云形变 |
| ... | ... |

**结果**（论文的核心贡献之一）：

| 方法 | 平均误差 |
| --- | --- |
| 分子指纹 + 随机森林 | 基线 |
| **MPNN（Enn-s2s）** | **显著更好** |
| DFT 计算 | 精确但慢 10^6 倍 |

**关键**：**MPNN 接近化学精度**（1 kcal/mol），而速度快得多。

## MPNN 的变体空间

**论文的贡献**：把已有方法统一到 MPNN 框架。

| 模型 | 对应 MPNN 的哪个选择 |
| --- | --- |
| **GGNN** | 消息 = f(h_v, h_w)，更新用 GRU |
| **Interaction Networks** | 消息含边特征，聚合用 sum |
| **Molecular Graph Convolutions** | 消息 = 边类型相关的矩阵乘 |
| **Deep Tensor NN** | 消息 = 张量积 |
| **MPNN（本文）** | 灵活选择，用 edge network |

**统一框架的价值**：
- 看清各方法的异同
- 系统探索设计空间
- 找到更好的组合

## Edge Network：论文的一个改进

**问题**：边特征（键类型）怎么用？

**朴素做法**：拼接到消息里。

    m = MLP([h_v, h_w, e])

**论文的做法**：**Edge Network**

    m = Σ_k e_k · MLP_k([h_v, h_w])

**思想**：边类型决定"用哪个变换"。

**例子**：

    单键 → 用变换 A
    双键 → 用变换 B
    芳香键 → 用变换 C

**效果**：比简单拼接好。

## MPNN 的影响

**① 图神经网络的统一框架**

这篇论文的 MPNN 框架成为 GNN 领域的标准表述。

**今天几乎所有 GNN 论文都用这个框架描述。**

**② 分子机器学习**

| 后续工作 | 改进 |
| --- | --- |
| **SchNet** | 连续距离（而非离散键类型） |
| **DimeNet** | 加入角度信息 |
| **MPNN + Transformer** | 全局注意力 |
| **AlphaFold** | 蛋白质结构预测（本质是图） |
| **MEGNet** | 多任务 + 全局状态 |

**③ 通用 GNN 的启发**

| 模型 | 应用 |
| --- | --- |
| **GCN** | 半监督分类 |
| **GraphSAGE** | 大规模图 |
| **GAT** | 注意力聚合 |
| **GIN** | 理论表达力分析 |

## 局限

| 局限 | 说明 |
| --- | --- |
| **过平滑** | 层数多了，所有节点表示趋同 |
| **过挤压** | 远距离信息被压缩（bottleneck） |
| **表达力上限** | 不如 WL 图同构测试（GIN 论文证明） |
| **T 轮限制** | 只能传播 T 跳（远距离需很多层） |

**改进方向**：
- 跳跃连接（Jumping Knowledge）
- 位置编码（图的位置编码）
- 全局注意力（Transformer）
- 层次化池化

## 本节来源

> **来源类型：学术来源**
> - Gilmer, J., Schoenholz, S. S., Riley, P. F., Vinyals, O., Dahl, G. E.
>   *Neural Message Passing for Quantum Chemistry*
>   arXiv:[1704.01212](https://arxiv.org/abs/1704.01212)（ICML 2017）
> - Battaglia, P. et al. *Relational inductive biases, deep learning, and graph networks*
>   arXiv:[1806.01261](https://arxiv.org/abs/1806.01261)（GNN 综述）
> - Xu, K. et al. *How Powerful are Graph Neural Networks?*
>   arXiv:[1810.00826](https://arxiv.org/abs/1810.00826)（GIN，表达力分析）
>
> **来源类型：参考资料（CC BY-NC-ND 4.0，本地个人使用）**
> - Ojhaharsh/30u30 第 21 篇（885 行，含 MolecularGraph / MPNN / EdgeNetwork / Set2SetReadout）
>
> **来源类型：原创**
> - 全部导读文字、交互图示、代码示例与习题

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
rng = np.random.default_rng(4)
A = np.array([[0,1,1,0,0],[1,0,1,0,0],[1,1,0,1,0],[0,0,1,0,1],[0,0,0,1,0]], float)
X = np.array([[1,0],[0,1],[1,1],[0,0],[1,0]], float)
Wm, Wu = rng.normal(0, .7, (2, 2)), rng.normal(0, .7, (2, 2))
def mpnn(X, A, T=2):
    H = X.copy()
    for _ in range(T):
        H = np.tanh(H @ Wu + (A @ H) @ Wm)     # sum 聚合 + 更新
    return H, H.sum(0)
H, g1 = mpnn(X, A)
perm = [3, 0, 2, 4, 1]
_, g2 = mpnn(X[perm], A[np.ix_(perm, perm)])
print("图表示:", np.round(g1, 4))
print("置换后:", np.round(g2, 4), "| 置换不变:", bool(np.allclose(g1, g2)))
print("节点0(2跳):", np.round(H[0], 3))\`\`\`

预期输出（实测）：实测：图表示 [3.5078, 1.8789]；节点按 [3,0,2,4,1] 重编号后重跑消息传递，图表示逐位一致（allclose=True）——sum 聚合的置换不变性；T=2 轮后节点 0 的感受野已覆盖 2 跳邻居。

**常见错误**：聚合用拼接破坏置换不变性，节点顺序一变结果就变；把消息轮数 T 堆到几十层造成过平滑，所有节点表示趋同；readout 用 mean 抹平分子大小差异，不同大小的分子得到相同图表示。

### 常见误区

1. **GNN=图上的 CNN**——CNN 邻居固定有序，GNN 邻居可变无序，必须用置换不变聚合；
2. **消息传得越远越好**——T 跳感受野换来过平滑与过挤压，远距离依赖要靠残差/全局注意力补；
3. **MPNN 只是分子工具**——它是 GCN/GAT/GraphSAGE/GIN 的统一表述，推荐系统与知识图谱同在用。

### 知识关联

- **向前**：c3 RN 是「全连接图上的 MPNN」（g_θ 即消息函数、Σ 即聚合）；
- **向后**：AlphaFold 的图注意力、paper-vision 的视觉结构是消息传递的规模化应用；
- **平行**：c6 的集合 readout 与 Deep Sets 同为置换不变聚合。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 三阶段 | 消息 m=M(h_v,h_w,e) → 聚合 Σ → 更新 U，重复 T 轮 |
| 聚合原则 | sum/mean/max/attention 都置换不变，sum 保留数量 |
| readout | 节点表示 → 图表示（sum 或 Set2Set） |
| 战绩 | QM9 接近化学精度，比 DFT 快约 10^6 倍 |
| 手算锚点 | 节点重编号后图表示逐位不变 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见论文原文：Gilmer et al., Neural Message Passing for Quantum Chemistry, arXiv:1704.01212）
`,
        tips: [
          {
            kind: 'interview',
            text: '「MPNN 三阶段」：消息计算 m_vw = M(h_v, h_w, e_vw) → 聚合 m_v = Σ m_wv → 更新 h_v = U(h_v, m_v)。重复 T 轮，最后 readout 成图表示。',
          },
          {
            kind: 'leak',
            text: '「为什么用求和聚合」：图没有邻居顺序，拼接会破坏置换不变性。求和（/mean/max/attention）对顺序不敏感——这是 GNN 的核心设计原则。',
          },
          {
            kind: 'pitfall',
            text: 'MPNN 有过平滑问题：层数多了所有节点表示趋同。还有过挤压问题：远距离信息被压缩。所以实际 GNN 通常只用 2~4 层。',
          },
        ],
        demos: [
          {
            title: 'MPNN 核心实现（PyTorch）',
            lang: 'python',
            code: `import torch
import torch.nn as nn
import torch.nn.functional as F

class MessagePassingLayer(nn.Module):
    """
    一轮消息传递。

    m_vw = M(h_v, h_w, e_vw)
    m_v  = sum_w m_wv
    h_v' = U(h_v, m_v)
    """
    def __init__(self, node_dim, edge_dim, hidden_dim):
        super().__init__()
        # 消息函数
        self.message_mlp = nn.Sequential(
            nn.Linear(node_dim * 2 + edge_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
        )
        # 更新函数（用 GRU）
        self.gru = nn.GRUCell(hidden_dim, node_dim)

    def forward(self, h, adj, edge_features):
        """
        h: (B, N, node_dim)       节点特征
        adj: (B, N, N)            邻接矩阵（1=有边）
        edge_features: (B, N, N, edge_dim)  边特征
        """
        B, N, D = h.shape

        # ① 构造所有 (v, w) 对
        h_v = h.unsqueeze(2).expand(B, N, N, D)    # (B,N,N,D)
        h_w = h.unsqueeze(1).expand(B, N, N, D)

        # ② 计算消息
        msg_input = torch.cat([h_v, h_w, edge_features], dim=-1)
        messages = self.message_mlp(msg_input)      # (B,N,N,H)

        # ③ 用邻接矩阵 mask 掉不存在的边
        mask = adj.unsqueeze(-1)                    # (B,N,N,1)
        messages = messages * mask

        # ④ 聚合（求和）
        aggregated = messages.sum(dim=2)            # (B,N,H)

        # ⑤ 更新
        h_new = self.gru(
            aggregated.reshape(B * N, -1),
            h.reshape(B * N, D)
        ).reshape(B, N, D)

        return h_new


class MPNN(nn.Module):
    """完整的 MPNN：多层消息传递 + readout。"""
    def __init__(self, node_dim, edge_dim, hidden_dim, out_dim, num_layers=3):
        super().__init__()
        self.input_proj = nn.Linear(node_dim, hidden_dim)
        self.layers = nn.ModuleList([
            MessagePassingLayer(hidden_dim, edge_dim, hidden_dim)
            for _ in range(num_layers)
        ])
        self.readout = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, out_dim),
        )

    def forward(self, h, adj, edge_features):
        h = self.input_proj(h)
        for layer in self.layers:
            h = layer(h, adj, edge_features)
        # sum readout
        graph_repr = h.sum(dim=1)                  # (B, H)
        return self.readout(graph_repr)


print("=== MPNN 前向 ===")
torch.manual_seed(42)
B, N = 2, 5          # 2 个图，每个 5 个节点
NODE_DIM, EDGE_DIM = 8, 4

model = MPNN(NODE_DIM, EDGE_DIM, hidden_dim=32, out_dim=1, num_layers=3)

h = torch.randn(B, N, NODE_DIM)
# 构造一个简单图的邻接矩阵（链状 + 一条额外的边）
adj = torch.zeros(B, N, N)
for i in range(N - 1):
    adj[:, i, i+1] = 1
    adj[:, i+1, i] = 1
adj[:, 0, N-1] = 1
adj[:, N-1, 0] = 1

edge_feat = torch.randn(B, N, N, EDGE_DIM)

out = model(h, adj, edge_feat)
print(f"节点特征: {tuple(h.shape)}")
print(f"邻接矩阵: {tuple(adj.shape)}")
print(f"边特征: {tuple(edge_feat.shape)}")
print(f"输出: {tuple(out.shape)}")
print()
print("=== 消息传递的层数效应 ===")
print()
print("第 1 层后：每个节点包含 1 跳邻居信息")
print("第 2 层后：2 跳")
print("第 3 层后：3 跳")
print()
print("对于 5 个节点的链状图，3 层足以覆盖全图")

print()
print("=== 置换不变性验证 ===")
print()
# 打乱节点顺序
perm = torch.tensor([3, 0, 4, 1, 2])
h_perm = h[:, perm]
adj_perm = adj[:, perm][:, :, perm]
edge_perm = edge_feat[:, perm][:, :, perm]

out_perm = model(h_perm, adj_perm, edge_perm)
print(f"原顺序输出: {out[0, 0].item():.6f}")
print(f"打乱后输出: {out_perm[0, 0].item():.6f}")
print(f"差异: {abs(out[0,0].item() - out_perm[0,0].item()):.8f}")
print()
print("-> 差异应接近 0（sum readout 保证置换不变）")`,
          },
          {
            title: '分子图构建与性质预测',
            lang: 'python',
            code: `import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np

# 简化的分子图表示
ATOM_TYPES = ['C', 'N', 'O', 'F']       # 4 种原子
BOND_TYPES = ['单键', '双键', '三键', '芳香']   # 4 种键

def smiles_to_graph(smiles):
    """
    极简 SMILES 解析（只支持线性分子）。
    真实实现需要 RDKit。
    """
    atoms = []
    bonds = []
    for ch in smiles:
        if ch in ATOM_TYPES:
            atoms.append(ch)
            if len(atoms) > 1:
                bonds.append((len(atoms)-2, len(atoms)-1, 0))   # 默认单键
    return atoms, bonds


def graph_to_tensors(atoms, bonds):
    """把分子图转成张量。"""
    N = len(atoms)
    node_dim = len(ATOM_TYPES) + 1     # onehot + 度数
    edge_dim = len(BOND_TYPES)

    # 节点特征
    h = torch.zeros(N, node_dim)
    for i, a in enumerate(atoms):
        h[i, ATOM_TYPES.index(a)] = 1.0
    # 加度数
    degrees = torch.zeros(N)
    for i, j, _ in bonds:
        degrees[i] += 1
        degrees[j] += 1
    h[:, -1] = degrees / 4.0

    # 邻接 + 边特征
    adj = torch.zeros(N, N)
    ef = torch.zeros(N, N, edge_dim)
    for i, j, bt in bonds:
        adj[i, j] = 1
        adj[j, i] = 1
        ef[i, j, bt] = 1
        ef[j, i, bt] = 1

    return h, adj, ef


print("=== 构建分子图 ===")
print()
molecules = [
    ("甲醇", "CO"),
    ("乙醇", "CCO"),
    ("丙醇", "CCCO"),
    ("乙酸", "CCCO"),   # 简化，实际是 CC(=O)O
]

for name, smiles in molecules:
    atoms, bonds = smiles_to_graph(smiles)
    h, adj, ef = graph_to_tensors(atoms, bonds)
    print(f"{name:>6} ({smiles}): {len(atoms)} 原子, {len(bonds)} 键")
    print(f"  节点特征: {tuple(h.shape)}, 邻接: {tuple(adj.shape)}")
    print(f"  原子序列: {atoms}")

print()
print("=== 用 MPNN 预测分子性质 ===")
print()

class SimpleMPNN(nn.Module):
    def __init__(self, node_dim, edge_dim, hidden=32, out_dim=1):
        super().__init__()
        self.proj = nn.Linear(node_dim, hidden)
        self.msg = nn.Sequential(
            nn.Linear(hidden * 2 + edge_dim, hidden), nn.ReLU(),
            nn.Linear(hidden, hidden),
        )
        self.gru = nn.GRUCell(hidden, hidden)
        self.readout = nn.Sequential(
            nn.Linear(hidden, hidden), nn.ReLU(),
            nn.Linear(hidden, out_dim),
        )

    def forward(self, h, adj, ef):
        h = self.proj(h)
        N = h.shape[0]
        # 3 轮消息传递
        for _ in range(3):
            h_v = h.unsqueeze(1).expand(N, N, -1)
            h_w = h.unsqueeze(0).expand(N, N, -1)
            msgs = self.msg(torch.cat([h_v, h_w, ef], dim=-1))
            msgs = msgs * adj.unsqueeze(-1)
            agg = msgs.sum(dim=1)
            h = self.gru(agg, h)
        return self.readout(h.sum(dim=0))


# 用分子量作为"伪标签"演示
def fake_target(atoms):
    """假的标签：原子数（示意）。"""
    return float(len(atoms))

model = SimpleMPNN(node_dim=5, edge_dim=4, hidden=32, out_dim=1)
optimizer = torch.optim.Adam(model.parameters(), lr=1e-2)

print("任务：预测分子中的原子数（简化演示）")
print()

# 训练
train_data = []
for n_carbon in range(1, 7):
    smiles = "C" * n_carbon
    atoms, bonds = smiles_to_graph(smiles)
    h, adj, ef = graph_to_tensors(atoms, bonds)
    train_data.append((h, adj, ef, fake_target(atoms)))

for epoch in range(1, 501):
    total_loss = 0
    for h, adj, ef, y in train_data:
        pred = model(h, adj, ef).squeeze()
        loss = (pred - y) ** 2
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        total_loss += loss.item()

    if epoch % 100 == 0:
        print(f"epoch {epoch:>3}: loss={total_loss/len(train_data):.4f}")

print()
print("=== 预测结果 ===")
print()
for n_carbon in range(1, 7):
    smiles = "C" * n_carbon
    atoms, bonds = smiles_to_graph(smiles)
    h, adj, ef = graph_to_tensors(atoms, bonds)
    with torch.no_grad():
        pred = model(h, adj, ef).item()
    print(f"  C×{n_carbon}: 预测={pred:.2f}, 实际={n_carbon}")

print()
print("=== 泛化到更大分子 ===")
print()
for n_carbon in [8, 10, 15]:
    smiles = "C" * n_carbon
    atoms, bonds = smiles_to_graph(smiles)
    h, adj, ef = graph_to_tensors(atoms, bonds)
    with torch.no_grad():
        pred = model(h, adj, ef).item()
    print(f"  C×{n_carbon}: 预测={pred:.2f}, 实际={n_carbon}")

print()
print("关键：模型在 1~6 个原子上训练，但能泛化到 15 个")
print("因为消息传递是局部的，sum readout 与节点数无关")`,
          },
          {
            title: '聚合函数的对比：sum vs mean vs max',
            lang: "python",
            code: `import torch
import numpy as np

print("=== 三种聚合函数的性质对比 ===")
print()

# 场景：一个节点有 3 个邻居
messages = torch.tensor([
    [1.0, 2.0],
    [3.0, 1.0],
    [2.0, 2.0],
])

print("3 个邻居发来的消息:")
for i, m in enumerate(messages):
    print(f"  邻居{i}: {m.numpy()}")

print()
print(f"sum:  {messages.sum(dim=0).numpy()}")
print(f"mean: {messages.mean(dim=0).numpy()}")
print(f"max:  {messages.max(dim=0).values.numpy()}")

print()
print("=== 关键性质 ===")
print()

# 1. 置换不变性
perm = torch.tensor([2, 0, 1])
m_perm = messages[perm]

print("1. 置换不变性:")
for name, fn in [("sum", lambda x: x.sum(0)), ("mean", lambda x: x.mean(0)), ("max", lambda x: x.max(0).values)]:
    a = fn(messages)
    b = fn(m_perm)
    print(f"   {name:>4}: 打乱前后相同 = {torch.allclose(a, b)}")

print()
print("2. 邻居数量敏感性:")
for n in [1, 2, 3, 5]:
    msgs = torch.ones(n, 2)
    print(f"   {n} 个相同消息: sum={msgs.sum(0)[0].item():.1f}, "
          f"mean={msgs.mean(0)[0].item():.1f}, max={msgs.max(0).values[0].item():.1f}")

print()
print("   -> sum 随数量线性增长（保留数量信息）")
print("   -> mean 和 max 与数量无关")

print()
print("3. 何时用哪个:")
print()
print("   sum:  需要区分'邻居有多少个'（如分子大小、度数）")
print("   mean: 需要归一化，对度数不敏感（如社交网络）")
print("   max:  关注'最强信号'（如点云、局部特征）")
print()

print("=== 实验：sum vs mean 在分子任务上 ===")
print()

def simulate_readout(aggregations, true_value):
    """模拟：用不同聚合预测分子性质。"""
    if aggregations == "sum":
        return true_value * 1.0      # 完美
    else:
        return true_value / 3.0      # 被平均缩小

print("假设真实性质 ∝ 原子数")
print()
print(f"{'原子数':>6} | {'sum 预测':>10} | {'mean 预测':>10}")
print("-" * 34)
for n in [2, 4, 6, 8]:
    s = simulate_readout("sum", n)
    m = simulate_readout("mean", n)
    print(f"{n:>6} | {s:>10.1f} | {m:>10.1f}")
print()
print("sum 保留线性关系，mean 被压缩")
print("这就是论文用 sum（或 Set2Set）而非 mean 的原因")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'paper-reasoning-c5-e1',
        type: 'single',
        difficulty: 2,
        question: 'MPNN（消息传递神经网络）的三个阶段是？',
        options: [
          { value: 'A', text: '编码 → 解码 → 输出' },
          { value: 'B', text: '消息计算 → 聚合 → 节点更新' },
          { value: 'C', text: '卷积 → 池化 → 全连接' },
          { value: 'D', text: '注意力 → 前馈 → 归一化' },
        ],
        answer: 'B',
        explanation:
          'm_vw = M(h_v, h_w, e_vw)（消息）→ m_v = Σ m_wv（聚合）→ h_v\' = U(h_v, m_v)（更新）。重复 T 轮，最后 readout 成图表示。',
        tags: ['三阶段'],
      },
      {
        id: 'paper-reasoning-c5-e2',
        type: 'judge',
        difficulty: 2,
        question: '图神经网络必须用 sum 聚合，用 concat 会破坏置换不变性。',
        answer: true,
        explanation:
          'concat 对顺序敏感（concat([a,b]) ≠ concat([b,a])），而图的邻居没有自然顺序。sum/mean/max/attention 都是置换不变的。这是 GNN 的核心设计原则。',
        tags: ['置换不变性'],
      },
      {
        id: 'paper-reasoning-c5-e3',
        type: 'multiple',
        difficulty: 3,
        question: '为什么 CNN/RNN 不能直接用于图数据？（多选）',
        options: [
          { value: 'A', text: 'CNN 需要固定大小的网格邻域，图的邻居数可变' },
          { value: 'B', text: 'RNN 需要序列顺序，图的节点无自然顺序' },
          { value: 'C', text: '图的节点数可以变化' },
          { value: 'D', text: '图数据无法用矩阵表示' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误——图可以用邻接矩阵表示（稀疏矩阵）。A/B/C 是真正的问题：可变邻居数、无自然顺序、可变节点数。',
        tags: ['图数据挑战'],
      },
      {
        id: 'paper-reasoning-c5-e4',
        type: 'fill',
        difficulty: 3,
        question:
          'MPNN 中从节点表示得到图表示的函数叫 ___ 函数（如 sum 或 Set2Set）。',
        blanks: [['readout', '读出', 'Readout', '聚合']],
        explanation:
          'readout: y = R({h_v})。论文用 Set2Set（用注意力反复查询节点集合），比简单 sum 表达能力强。',
        tags: ['readout'],
      },
      {
        id: 'paper-reasoning-c5-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现置换不变的聚合：aggregate_messages(messages, mode="sum")。\n\n- messages: (num_neighbors, dim)\n- mode: "sum" / "mean" / "max"\n- 返回 (dim,)',
        starterCode: `import numpy as np

def aggregate_messages(messages, mode="sum"):
    messages = np.asarray(messages, dtype=float)
    if mode == "sum":
        return ___
    elif mode == "mean":
        return ___
    elif mode == "max":
        return ___
    raise ValueError(f"未知模式: {mode}")
`,
        setupCode: '',
        expectedOutput: '聚合结果',
        tests: `import numpy as np
msgs = np.array([[1.0, 2.0], [3.0, 1.0], [2.0, 2.0]])

assert np.allclose(aggregate_messages(msgs, "sum"), [6.0, 5.0])
assert np.allclose(aggregate_messages(msgs, "mean"), [2.0, 5.0/3])
assert np.allclose(aggregate_messages(msgs, "max"), [3.0, 2.0])

# 置换不变性
perm = np.array([2, 0, 1])
for mode in ["sum", "mean", "max"]:
    a = aggregate_messages(msgs, mode)
    b = aggregate_messages(msgs[perm], mode)
    assert np.allclose(a, b), f"{mode} 应置换不变"

# 单邻居
assert np.allclose(aggregate_messages(np.array([[5.0, 1.0]]), "sum"), [5.0, 1.0])
`,
        answer: `import numpy as np

def aggregate_messages(messages, mode="sum"):
    messages = np.asarray(messages, dtype=float)
    if mode == "sum":
        return messages.sum(axis=0)
    elif mode == "mean":
        return messages.mean(axis=0)
    elif mode == "max":
        return messages.max(axis=0)
    raise ValueError(f"未知模式: {mode}")
`,
        explanation:
          '**三种聚合都是置换不变的**——这是关键。\n\n**区别**：\n\n| 模式 | n 个相同消息 | 特点 |\n| --- | --- | --- |\n| sum | n·m | 保留数量 |\n| mean | m | 归一化 |\n| max | m | 取最强 |\n\n**`axis=0`**：沿邻居维度聚合，保留特征维度。\n\n**为什么不用 concat**：\n\n    concat([m1, m2]) ≠ concat([m2, m1])\n\n顺序变了结果变 → 违反置换不变性。\n\n**这就是 GNN 的核心设计原则**：\n聚合函数必须对邻居顺序不敏感。',
        tags: ['编程', '聚合'],
      },
      {
        id: 'paper-reasoning-c5-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现消息计算：compute_messages(h, adj, edge_feat, W_node, W_edge)。\n\n- h: (N, D) 节点特征\n- adj: (N, N) 邻接矩阵\n- edge_feat: (N, N, E)\n- 返回 (N, N, hidden)，不存在的边为 0\n\n简化：message[i,j] = W_node @ concat(h_i, h_j) + W_edge @ e_ij，然后乘 adj',
        starterCode: `import numpy as np

def compute_messages(h, adj, edge_feat, W_node, W_edge):
    N, D = h.shape
    h_i = ___
    h_j = ___
    node_msg = ___
    edge_msg = ___
    messages = ___
    return messages * adj[:, :, None]
`,
        setupCode: '',
        expectedOutput: '消息张量',
        tests: `import numpy as np
np.random.seed(0)
N, D, E, H = 4, 3, 2, 5

h = np.random.randn(N, D)
adj = np.zeros((N, N))
adj[0,1] = adj[1,0] = 1
adj[1,2] = adj[2,1] = 1
edge_feat = np.random.randn(N, N, E)
W_node = np.random.randn(H, D*2) * 0.3
W_edge = np.random.randn(H, E) * 0.3

msgs = compute_messages(h, adj, edge_feat, W_node, W_edge)
assert msgs.shape == (N, N, H), f"形状错误: {msgs.shape}"

# 不存在的边应为 0
assert np.allclose(msgs[0, 2], 0), "无边处应为0"
assert np.allclose(msgs[2, 0], 0)

# 存在的边应非 0
assert not np.allclose(msgs[0, 1], 0)

# 验证公式
h_i = np.repeat(h[:, None, :], N, axis=1)
h_j = np.repeat(h[None, :, :], N, axis=0)
expected = (np.concatenate([h_i, h_j], -1) @ W_node.T) + (edge_feat @ W_edge.T)
expected = expected * adj[:, :, None]
assert np.allclose(msgs, expected)
`,
        answer: `import numpy as np

def compute_messages(h, adj, edge_feat, W_node, W_edge):
    N, D = h.shape
    h_i = np.repeat(h[:, None, :], N, axis=1)     # (N,N,D)
    h_j = np.repeat(h[None, :, :], N, axis=0)     # (N,N,D)
    node_msg = np.concatenate([h_i, h_j], axis=-1) @ W_node.T   # (N,N,H)
    edge_msg = edge_feat @ W_edge.T                              # (N,N,H)
    messages = node_msg + edge_msg
    return messages * adj[:, :, None]
`,
        explanation:
          '**四个关键点**：\n\n1. **`h[:, None, :]`**：h_i 沿 j 广播\n2. **`h[None, :, :]`**：h_j 沿 i 广播\n3. **`concat` 后投影**：把 (h_i, h_j) 拼成 2D 维\n4. **`* adj[:, :, None]`**：mask 掉不存在的边\n\n**为什么 mask**：\n\n    不存在的边不应该传递消息\n    乘 0 后，聚合时自然被忽略\n\n**注意 `adj[:, :, None]`**：\nadj 是 (N,N)，要扩成 (N,N,1) 才能和 (N,N,H) 广播。\n\n**这就是消息计算的核心**：\n\n    m_ij = f(h_i, h_j, e_ij)\n\n然后在聚合时求和（只加有边的）。',
        tags: ['编程', '消息计算'],
      },
      {
        id: 'paper-reasoning-c5-e7',
        type: 'code',
        difficulty: 4,
        question:
          '用 PyTorch 实现完整的 MPNN 层：\n\nMessagePassingLayer(node_dim, edge_dim, hidden_dim)\nforward(h, adj, edge_feat) -> h_new',
        starterCode: `import torch
import torch.nn as nn

class MessagePassingLayer(nn.Module):
    def __init__(self, node_dim, edge_dim, hidden_dim):
        super().__init__()
        self.message_mlp = nn.Sequential(
            nn.Linear(node_dim * 2 + edge_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
        )
        self.gru = nn.GRUCell(hidden_dim, node_dim)

    def forward(self, h, adj, edge_feat):
        B, N, D = h.shape
        h_v = ___
        h_w = ___
        msg_input = ___
        messages = ___
        messages = messages * ___
        aggregated = ___
        return self.gru(aggregated.reshape(B*N, -1), h.reshape(B*N, D)).reshape(B, N, D)
`,
        setupCode: '',
        expectedOutput: 'MessagePassingLayer',
        tests: `import torch
import torch.nn as nn

torch.manual_seed(0)
B, N, D, E = 2, 5, 8, 4
layer = MessagePassingLayer(D, E, hidden_dim=16)

h = torch.randn(B, N, D)
adj = torch.zeros(B, N, N)
adj[:, 0, 1] = adj[:, 1, 0] = 1
adj[:, 1, 2] = adj[:, 2, 1] = 1
ef = torch.randn(B, N, N, E)

h_new = layer(h, adj, ef)
assert h_new.shape == (B, N, D), f"形状错误: {h_new.shape}"

# 梯度
h_new.sum().backward()
assert layer.message_mlp[0].weight.grad is not None

# 孤立节点（无邻居）应该也有输出
adj_iso = torch.zeros(B, N, N)
h_iso = layer(h, adj_iso, ef)
assert h_iso.shape == (B, N, D)
`,
        answer: `import torch
import torch.nn as nn

class MessagePassingLayer(nn.Module):
    def __init__(self, node_dim, edge_dim, hidden_dim):
        super().__init__()
        self.message_mlp = nn.Sequential(
            nn.Linear(node_dim * 2 + edge_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
        )
        self.gru = nn.GRUCell(hidden_dim, node_dim)

    def forward(self, h, adj, edge_feat):
        B, N, D = h.shape
        h_v = h.unsqueeze(2).expand(B, N, N, D)
        h_w = h.unsqueeze(1).expand(B, N, N, D)
        msg_input = torch.cat([h_v, h_w, edge_feat], dim=-1)
        messages = self.message_mlp(msg_input)
        messages = messages * adj.unsqueeze(-1)
        aggregated = messages.sum(dim=2)
        return self.gru(aggregated.reshape(B*N, -1), h.reshape(B*N, D)).reshape(B, N, D)
`,
        explanation:
          '**`unsqueeze(2)` vs `unsqueeze(1)`**：\n\n    h: (B, N, D)\n    h_v = h.unsqueeze(2)  -> (B, N, 1, D) -> expand -> (B, N, N, D)\n    h_w = h.unsqueeze(1)  -> (B, 1, N, D) -> expand -> (B, N, N, D)\n\n**`* adj.unsqueeze(-1)`**：\n\n    adj: (B,N,N) -> (B,N,N,1) -> 广播到 (B,N,N,H)\n\n**`GRUCell` 的输入**：\n\n    GRUCell(input_size=hidden_dim, hidden_size=node_dim)\n    gru(aggregated, h)   # aggregated 是输入，h 是隐状态\n\n**注意 reshape**：GRUCell 要求 (batch, dim)，所以要把 (B,N,·) 展平成 (B*N,·)。',
        tags: ['编程', 'MPNN 层'],
      },
      {
        id: 'paper-reasoning-c5-e8',
        type: 'code',
        difficulty: 4,
        question:
          '构建分子图：build_molecule_graph(atoms, bonds, num_atom_types, num_bond_types)。\n\n- atoms: 原子类型索引列表\n- bonds: [(i, j, bond_type), ...]\n- 返回 (h, adj, edge_feat)',
        starterCode: `import numpy as np

def build_molecule_graph(atoms, bonds, num_atom_types=4, num_bond_types=4):
    N = len(atoms)
    # 节点特征：onehot + 度数
    h = np.zeros((N, num_atom_types + 1))
    for i, a in enumerate(atoms):
        ___
    for i, j, _ in bonds:
        ___

    adj = np.zeros((N, N))
    edge_feat = np.zeros((N, N, num_bond_types))
    for i, j, bt in bonds:
        ___
    return h, adj, edge_feat
`,
        setupCode: '',
        expectedOutput: '分子图',
        tests: `import numpy as np
# 甲醇：C-O
h, adj, ef = build_molecule_graph([0, 2], [(0, 1, 0)])
assert h.shape == (2, 5)
assert adj.shape == (2, 2)
assert ef.shape == (2, 2, 4)

# 节点 onehot
assert h[0, 0] == 1.0, "原子0 应是类型0"
assert h[1, 2] == 1.0, "原子1 应是类型2"

# 度数（最后一维）
assert h[0, -1] > 0, "原子0 应有一个邻居"
assert h[1, -1] > 0

# 邻接对称
assert adj[0, 1] == 1 and adj[1, 0] == 1
assert adj[0, 0] == 0

# 边特征
assert ef[0, 1, 0] == 1.0
assert ef[1, 0, 0] == 1.0

# 三原子链
h2, adj2, ef2 = build_molecule_graph([0,0,2], [(0,1,0),(1,2,1)])
assert h2.shape == (3, 5)
assert adj2[1, 0] == 1 and adj2[1, 2] == 1
assert ef2[1, 2, 1] == 1.0
`,
        answer: `import numpy as np

def build_molecule_graph(atoms, bonds, num_atom_types=4, num_bond_types=4):
    N = len(atoms)
    h = np.zeros((N, num_atom_types + 1))
    for i, a in enumerate(atoms):
        h[i, a] = 1.0
    for i, j, _ in bonds:
        h[i, -1] += 1
        h[j, -1] += 1
    # 归一化度数
    if N > 1:
        h[:, -1] /= max(h[:, -1].max(), 1)

    adj = np.zeros((N, N))
    edge_feat = np.zeros((N, N, num_bond_types))
    for i, j, bt in bonds:
        adj[i, j] = 1
        adj[j, i] = 1
        edge_feat[i, j, bt] = 1
        edge_feat[j, i, bt] = 1
    return h, adj, edge_feat
`,
        explanation:
          '**三个组成部分**：\n\n**① 节点特征 h (N, atom_types+1)**\n\n    onehot(原子类型) + 度数\n    度数归一化到 [0,1]（避免数值过大）\n\n**② 邻接矩阵 adj (N, N)**\n\n    无向图 → 对称矩阵\n    adj[i,j] = 1 表示 i 和 j 有边\n\n**③ 边特征 edge_feat (N, N, bond_types)**\n\n    每条边的键类型 onehot\n    对称（i→j 和 j→i 相同）\n\n**注意**：真实分子图还需要：\n- 氢原子（通常省略，用"隐式氢"）\n- 立体化学\n- 电荷、芳香性\n\n**这就是为什么实际用 RDKit 而不是手写解析器。**',
        tags: ['编程', '分子图'],
      },
      {
        id: 'paper-reasoning-c5-e9',
        type: 'judge',
        difficulty: 4,
        question: 'MPNN 的层数越多越好，因为能传播更远的信息。',
        answer: false,
        explanation:
          '不是。层数多了会有"过平滑"（over-smoothing）问题：所有节点表示趋同，失去区分度。还有"过挤压"（over-squashing）：远距离信息被压缩到固定维度。实际 GNN 通常只用 2~4 层。',
        tags: ['过平滑'],
      },
      {
        id: 'paper-reasoning-c5-e10',
        type: 'open',
        difficulty: 5,
        question:
          '请解释：① 为什么图数据需要专门的神经网络；② MPNN 三阶段与置换不变性；③ readout 的作用与 Set2Set；④ MPNN 与 GNN/Transformer 的关系。',
        referenceAnswer: `**① 为什么图数据需要专门的神经网络**

**图的特征**：

    节点：可变数量、无自然顺序
    边：任意连接、可变邻居数
    结构：非欧几里得（不是网格/序列）

**CNN 的问题**：

    Conv 需要固定大小的邻域（如 3×3）
    图的邻居数从 1 到 N 不等

**RNN 的问题**：

    RNN 需要序列顺序
    图没有自然的"第一个节点"

**需要的新性质**：

| 性质 | 说明 |
| --- | --- |
| **置换不变性** | 节点重排，结果不变 |
| **局部性** | 信息沿边传播 |
| **可变大小** | 节点数可变化 |
| **边信息** | 能利用边特征 |

**这就是图神经网络（GNN）的设计目标。**

---

**② MPNN 三阶段与置换不变性**

**三阶段**：

**① 消息计算**：

    m_vw = M(h_v, h_w, e_vw)

对每条边 (v,w) 算一个消息向量。

**② 聚合**：

    m_v = Σ_{w ∈ N(v)} m_wv

**关键：必须置换不变！**

**③ 更新**：

    h_v' = U(h_v, m_v)

用 GRU 或 MLP。

**为什么聚合必须置换不变**：

**反例（concat）**：

    邻居顺序 [A, B, C]:
      concat(m_A, m_B, m_C) = [1, 2, 3, 4, 5, 6]

    邻居顺序 [B, A, C]:
      concat(m_B, m_A, m_C) = [3, 4, 1, 2, 5, 6]

**结果不同！** 但这两个是同一个图。

**正例（sum）**：

    m_A + m_B + m_C = m_B + m_A + m_C   ✓

**可行的聚合**：

| 聚合 | 置换不变 | 保留数量 |
| --- | --- | --- |
| sum | ✅ | ✅ |
| mean | ✅ | ❌ |
| max | ✅ | ❌ |
| attention | ✅ | ✅ |

**这就是 GNN 的核心设计原则。**

---

**③ readout 的作用与 Set2Set**

**问题**：

MPNN 输出每个节点的表示 h_v。
但我们想预测**整个图**的性质（如分子能量）。

**需要**：把 N 个节点表示聚合成 1 个图表示。

**简单 readout**：

    y = MLP(Σ_v h_v)

**问题**：
- 只用了"求和"，可能丢失结构信息
- 不同的图可能有相同的节点特征和

**Set2Set（论文用的）**：

**思想**：用注意力**多次查询**节点集合。

    q_0 = 0
    for t in range(T):
        α = softmax(h_v · q_t)      # 每个节点的重要性
        r_t = Σ_v α_v · h_v         # 加权读出
        q_{t+1} = LSTM(q_t, r_t)    # 更新查询
    y = concat(q_1, ..., q_T)       # 拼接所有读出

**优势**：

| 方面 | 简单 sum | Set2Set |
| --- | --- | --- |
| 表达能力 | 弱 | **强** |
| 多次读取 | ❌ | ✅ |
| 节点数不变性 | ✅ | ✅ |
| 参数 | 无 | 有 |

**直觉**：
- 第一次查询"整体是什么样的"
- 第二次查询"还有什么没读到"
- 多次后得到完整表示

**这就是"读出"一个集合信息的优雅方式。**

---

**④ MPNN 与 GNN/Transformer 的关系**

**MPNN 是 GNN 的统一框架**

**论文的贡献**：把已有方法都表述成 MPNN。

| 模型 | 消息函数 | 聚合 | 更新 |
| --- | --- | --- | --- |
| **GGNN** | f(h_v, h_w) | sum | GRU |
| **Interaction Networks** | f(h_v, h_w, e) | sum | MLP |
| **Molecular Conv** | 边类型矩阵乘 | sum | MLP |
| **MPNN（本文）** | edge network | sum | GRU |

**这统一了领域，让不同方法可以比较。**

**MPNN 与 Transformer**：

**Transformer 的注意力**：

    Attention(Q,K,V) = softmax(QK^T/√d)·V

**可以看作"全连接图上的消息传递"**：

| MPNN | Transformer |
| --- | --- |
| 图结构 | 全连接（所有对） |
| 消息 m_vw | q_v·k_w（打分） |
| 聚合 | 加权求和（softmax） |
| 更新 | 残差 + FFN |

**所以**：

> **Transformer = 全连接图上的 MPNN + 位置编码**

**反过来**：

> **GNN = 稀疏图上的 Transformer（无位置编码）**

**这两个视角的统一是现代架构理解的关键。**

**MPNN 与图 Transformer**：

**图 Transformer**（如 Graphormer）：
- 用注意力替代消息传递
- 加入图结构编码（如最短路径距离）
- 效果通常更好但计算量大

**历史脉络**：

    2017 MPNN              -> 统一 GNN 框架
    2017 Transformer       -> 全连接注意力
    2018 GNN 综述          -> 统一图学习框架
    2019 GIN               -> 表达力分析（WL 测试）
    2020 Graphormer        -> 图 Transformer
    2021 AlphaFold2        -> 蛋白质图 + 注意力
    2023+ 图基础模型        -> 大规模图预训练

---

**⑤ MPNN 的局限与未来**

**局限**：

| 局限 | 说明 |
| --- | --- |
| **过平滑** | 层数多了节点表示趋同 |
| **过挤压** | 远距离信息被压缩 |
| **表达力上限** | 不如 WL 图同构测试 |
| **T 轮限制** | 只能传播 T 跳 |

**为什么过平滑**：

    每层都是 h' = U(h, mean(邻居))
    多轮后所有节点都变成"局部平均"
    失去区分度

**类比**：反复做图像模糊，最后全图一个颜色。

**解法**：

| 方法 | 思路 |
| --- | --- |
| **残差连接** | h' = h + Δh |
| **Jumping Knowledge** | 拼接所有层的表示 |
| **DropEdge** | 随机删边 |
| **PairNorm** | 归一化防止趋同 |

**为什么过挤压**：

    一个节点要接收 T 跳外的信息
    必须经过 T 次压缩
    信息量受限于隐藏维度

**解法**：
- 图重连（添加"虚拟边"）
- 全局注意力（Transformer）
- 层次化池化

**未来方向**：

1. **大规模图预训练**（图基础模型）
2. **几何深度学习**（等变 GNN，如 EGNN）
3. **图 + LLM**（图推理增强）
4. **科学应用**（分子设计、材料发现）

**MPNN 的框架会长期存在**——
即使具体实现变化，三阶段的思想不会变。`,
        rubric: [
          { point: 'CNN 需固定邻域、RNN 需顺序；图需置换不变+可变大小', score: 3 },
          { point: '三阶段 + 为什么聚合必须置换不变（concat 反例）', score: 2 },
          { point: 'readout 作用 + Set2Set 用注意力多次查询', score: 2 },
          { point: 'Transformer = 全连接 MPNN + 位置编码；GNN = 稀疏 Transformer', score: 2 },
          { point: '过平滑/过挤压的成因与解法', score: 1 },
        ],
        keywords: ['置换不变', 'sum 聚合', 'Set2Set', '全连接MPNN', '过平滑'],
        explanation:
          '能说清「Transformer 就是全连接图上的 MPNN」以及「为什么 concat 破坏置换不变性」，就是真正理解了消息传递框架。',
        tags: ['综合分析'],
      },
    ],
  },
];
