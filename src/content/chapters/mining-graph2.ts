import type { Chapter } from '../../types';

/* 数据挖掘 · M5 图挖掘与异常检测 · c2 社区发现、c3 异常检测、c4 数据流挖掘 */

export const miningGraphChapters2: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'mining-graph-c2',
    title: '社区发现：找出图中的群体',
    goal: '理解模块度的定义与含义，掌握 Louvain 与标签传播的核心思想。',
    lessons: [
      {
        id: 'mining-graph-c2-l1',
        title: '模块度与 Louvain 算法',
        difficulty: 4,
        content: `
## 社区是什么

**社区（community）**：图内部连接紧密、外部连接稀疏的节点群组。

    社交网络：朋友圈、兴趣小组
    引用网络：同一研究领域
    电商：同品类商品的共购群
    生物：功能模块

**与聚类的区别**：社区发现利用**图结构**，不依赖节点特征。

## 模块度：社区划分的质量指标

**Newman 的模块度（Modularity）Q**：

    Q = (1/2m) Σ_{i,j} [ A_ij - k_i·k_j/(2m) ] δ(c_i, c_j)

| 符号 | 含义 |
| --- | --- |
| A_ij | 邻接矩阵（有无边） |
| k_i | 节点 i 的度 |
| m | 总边数 |
| δ(c_i,c_j) | 同社区为 1，否则 0 |

**直观理解**：

    Q = （社区内部的边占比）− （随机图中期望的内部边占比）

- Q = 0：划分与随机无异（没有社区结构）；
- Q > 0.3：明显的社区结构；
- Q 最大为 1（完全分离的团）。

**为什么需要"减去期望"**：高度节点天然会形成很多内部边，
不减期望的话，把高度节点聚在一起就能得到高分——但那是平凡的划分。

## Louvain 算法：当前最常用

**两个阶段交替**：

**阶段 1：局部移动**

    对每个节点 i：
      尝试把它移到邻居所在的各个社区
      计算移动后 ΔQ
      若 ΔQ > 0，接受（移到增益最大的社区）
    重复直到没有节点愿意移动

**阶段 2：社区聚合**

    把每个社区压缩成一个"超级节点"
    超级节点之间的边权 = 两社区间所有边的权重和
    在新图上重复阶段 1

**终止**：模块度不再提升。

**为什么高效**：
- 阶段 1 只需遍历节点与邻居，O(m)；
- 阶段 2 把图规模快速缩小；
- 整体接近 **O(m)**（线性），能处理上亿节点的图。

**Louvain 的问题**：
- 可能产生**内部不连通的社区**（"坏社区"）；
- **Leiden 算法**修正了这一点，并保证社区连通，现在更推荐。

## 标签传播（LPA）：最简单快速

**思想**：每个节点采用**邻居中最常见的标签**。

    1. 每个节点初始化唯一标签（如自己的 ID）
    2. 重复：
       每个节点把标签更新为邻居中出现最多的标签
       （平局随机选）
    3. 直到标签不再变化

**优点**：
- **极快**（接近线性）；
- 无需预设社区数、无需优化目标函数；
- 实现只要几十行。

**缺点**：
- **结果不稳定**（随机性大，多次运行结果不同）；
- 可能产生**巨型社区**（所有节点收敛到同一标签）；
- 没有质量保证（不优化模块度）。

**适用**：超大规模图的快速粗分、作为其他算法的初始化。

## 三种算法对比

| 算法 | 复杂度 | 质量 | 稳定性 | 适用 |
| --- | --- | --- | --- | --- |
| **Louvain/Leiden** | 近线性 | 高（优化 Q） | 较好 | **通用首选** |
| 标签传播 LPA | 近线性 | 中 | **差** | 超大规模、快速粗分 |
| Girvan-Newman | O(m²n) | 高 | 好 | 小图（教学） |
| 谱聚类 | O(n³) | 高 | 好 | 小图、理论分析 |

## 社区发现的评估

**有真实标签时**：NMI、ARI（与聚类评估相同）。

**无标签时**：模块度 Q（但要小心——**Q 高不一定业务上有意义**）。

**关键**：社区发现的"正确答案"取决于**尺度**。
同一张图，粗粒度看是 3 个大社区，细粒度看是 20 个小社区，都对。

**Louvain 的 resolution 参数**控制这个尺度：
- resolution 大 → 更多更小的社区；
- resolution 小 → 更少更大的社区。

**实践**：调 resolution 让社区规模符合业务需求（如"每个社区 50~500 人"）。

## 一个实践要点：社区发现的用途

| 用途 | 说明 |
| --- | --- |
| **推荐** | 同社区的人/物品更可能相关 |
| **风控** | 欺诈团伙往往形成紧密社区 |
| **社交** | 好友推荐、兴趣圈识别 |
| **内容** | 知识图谱的主题聚类 |
| **运维** | 服务依赖图的模块划分 |

<PageRankFlow />
`,
        tips: [
          {
            kind: 'interview',
            text: '「模块度 Q 的含义」：社区内部边占比减去随机图中期望的内部边占比。Q=0 表示无社区结构，Q>0.3 表示明显结构。减期望是为了避免"把高度节点聚在一起"这种平凡划分。',
          },
          {
            kind: 'leak',
            text: 'Louvain 两阶段交替（局部移动 + 社区聚合），接近线性复杂度，能处理上亿节点。改进版 Leiden 保证社区连通，现在更推荐。',
          },
          {
            kind: 'pitfall',
            text: '标签传播（LPA）极快但不稳定，多次运行结果不同，还可能产生巨型社区。适合超大规模粗分，不适合需要可复现结果的场景。',
          },
        ],
        demos: [
          {
            title: '模块度计算与标签传播',
            lang: 'python',
            code: `import numpy as np
from collections import Counter, defaultdict

# 两个团 + 一条桥边
edges = [
    (0,1),(0,2),(1,2),          # 团 A
    (3,4),(3,5),(4,5),          # 团 B
    (2,3),                      # 桥
]
n = 6
A = np.zeros((n, n))
for u, v in edges:
    A[u,v] = A[v,u] = 1

def modularity(A, labels):
    m = A.sum() / 2
    k = A.sum(axis=1)
    Q = 0.0
    for i in range(len(A)):
        for j in range(len(A)):
            if labels[i] != labels[j]:
                continue
            Q += A[i,j] - k[i]*k[j]/(2*m)
    return Q / (2*m)

print("=== 模块度对比 ===")
# 正确划分：{0,1,2} 与 {3,4,5}
good = [0,0,0,1,1,1]
print(f"  正确划分 {good}: Q = {modularity(A, good):.4f}")

# 全在一个社区
all_one = [0]*6
print(f"  全在一个社区:     Q = {modularity(A, all_one):.4f}")

# 每个点自成一社区
each = [0,1,2,3,4,5]
print(f"  每个点独立:       Q = {modularity(A, each):.4f}")

# 错误划分：把桥两端分到一起
bad = [0,1,1,0,1,1]
print(f"  错误划分 {bad}: Q = {modularity(A, bad):.4f}")
print()

print("结论：正确划分的 Q 最高，全在一起 Q=0（无社区结构），")
print("      每点独立 Q 为负（比随机还差）")
print()

# === 标签传播 ===
def label_propagation(edges, n, seed=0):
    rng = np.random.default_rng(seed)
    adj = defaultdict(list)
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)

    labels = list(range(n))
    for _ in range(50):
        changed = False
        order = rng.permutation(n)
        for node in order:
            if not adj[node]:
                continue
            cnt = Counter(labels[nb] for nb in adj[node])
            max_c = max(cnt.values())
            candidates = [l for l, c in cnt.items() if c == max_c]
            new_label = int(rng.choice(candidates))
            if new_label != labels[node]:
                labels[node] = new_label
                changed = True
        if not changed:
            break
    return labels

print("=== 标签传播（多次运行）===")
for seed in range(3):
    lab = label_propagation(edges, n, seed)
    # 归一化成 0,1,...
    mapping = {}
    norm = []
    for x in lab:
        if x not in mapping:
            mapping[x] = len(mapping)
        norm.append(mapping[x])
    print(f"  seed={seed}: {norm}  Q={modularity(A, norm):.4f}")
print()
print("注意：LPA 结果可能不稳定（不同 seed 得到不同划分）")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'mining-graph-c2-e1',
        type: 'single',
        difficulty: 2,
        question: '模块度 Q 的含义是？',
        options: [
          { value: 'A', text: '社区内的边数' },
          { value: 'B', text: '社区内部边占比减去随机图中期望的内部边占比' },
          { value: 'C', text: '社区的数量' },
          { value: 'D', text: '节点的平均度' },
        ],
        answer: 'B',
        explanation:
          '减去期望是为了避免平凡划分：高度节点天然有很多内部边，不校正的话把它们聚在一起就能得高分。Q=0 表示无社区结构，Q>0.3 表示明显结构。',
        tags: ['模块度'],
      },
      {
        id: 'mining-graph-c2-e2',
        type: 'judge',
        difficulty: 2,
        question: 'Louvain 算法的两个阶段是"局部移动"和"社区聚合"，交替进行直到模块度不再提升。',
        answer: true,
        explanation:
          '阶段 1 尝试把节点移到邻居社区以提升 Q；阶段 2 把社区压缩成超级节点。交替进行，图规模快速缩小，整体接近线性复杂度。',
        tags: ['Louvain'],
      },
      {
        id: 'mining-graph-c2-e3',
        type: 'multiple',
        difficulty: 3,
        question: '标签传播（LPA）的缺点有？（多选）',
        options: [
          { value: 'A', text: '结果不稳定，多次运行可能不同' },
          { value: 'B', text: '可能产生巨型社区（所有节点收敛到同一标签）' },
          { value: 'C', text: '没有质量保证（不优化模块度）' },
          { value: 'D', text: '复杂度太高无法处理大图' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误——LPA 恰恰是**最快**的方法之一（接近线性）。A/B/C 是它的真实缺点，所以适合粗分而不适合需要可复现结果的场景。',
        tags: ['LPA'],
      },
      {
        id: 'mining-graph-c2-e4',
        type: 'fill',
        difficulty: 3,
        question: 'Louvain 的改进版叫 ___ 算法，它保证社区内部连通，并修正了 Louvain 可能产生不连通社区的问题。',
        blanks: [['Leiden', 'leiden']],
        explanation:
          'Leiden 算法（2019）修正了 Louvain 的两个问题：可能产生内部不连通的"坏社区"，以及模块度优化的局部最优。现在多数场景推荐用 Leiden。',
        tags: ['Leiden'],
      },
      {
        id: 'mining-graph-c2-e5',
        type: 'code',
        difficulty: 2,
        question:
          '构建邻接矩阵：build_adjacency(edges, n)。\n\nedges 是 (u, v) 列表，返回 n×n 的 numpy 矩阵（无向图，对称）。',
        starterCode: `import numpy as np

def build_adjacency(edges, n):
    A = ___
    for u, v in edges:
        ___
    return A
`,
        setupCode: 'edges = [(0,1),(1,2),(2,0)]\nn = 3',
        expectedOutput: '3×3 对称矩阵',
        tests: `import numpy as np
edges = [(0,1),(1,2),(2,0)]
A = build_adjacency(edges, 3)
assert A.shape == (3,3), f"形状应为 (3,3)，实际 {A.shape}"
assert np.array_equal(A, A.T), "应为对称矩阵"
assert A[0,1] == 1 and A[1,0] == 1, "边应双向"
assert A.sum() == 6, f"总度数应为 6，实际 {A.sum()}"
assert A[0,0] == 0, "无自环"
`,
        answer: `import numpy as np

def build_adjacency(edges, n):
    A = np.zeros((n, n))
    for u, v in edges:
        A[u, v] = 1
        A[v, u] = 1
    return A
`,
        explanation:
          '无向图的邻接矩阵是**对称**的，所以每条边要写两次。\n\n总度数 = 边数 × 2（每条边贡献两个度数）。\n\n**注意自环**：若有 (u,u) 的边，要单独处理（通常加 2 或加 1，视定义）。',
        tags: ['编程', '邻接矩阵'],
      },
      {
        id: 'mining-graph-c2-e6',
        type: 'code',
        difficulty: 3,
        question:
          '计算模块度：modularity(A, labels)。\n\nQ = (1/2m) Σ_{i,j} [A_ij − k_i·k_j/(2m)] δ(c_i, c_j)\n其中 m = 总边数（A.sum()/2），k 是度数向量。返回保留 4 位小数。',
        starterCode: `import numpy as np

def modularity(A, labels):
    A = np.asarray(A, dtype=float)
    labels = np.asarray(labels)
    m = ___
    k = ___
    same = ___
    Q = ___
    return round(float(Q), 4)
`,
        setupCode:
          'import numpy as np\nA = np.array([[0,1,1,0],[1,0,1,0],[1,1,0,1],[0,0,1,0]], dtype=float)\nlabels = [0,0,0,1]',
        expectedOutput: '模块度值',
        tests: `import numpy as np
# 两个团 + 桥
A = np.zeros((6,6))
for u,v in [(0,1),(0,2),(1,2),(3,4),(3,5),(4,5),(2,3)]:
    A[u,v]=A[v,u]=1
# 正确划分
q1 = modularity(A, [0,0,0,1,1,1])
assert q1 > 0.3, f"正确划分 Q 应 > 0.3，实际 {q1}"
# 全在一个社区
q2 = modularity(A, [0]*6)
assert abs(q2) < 1e-6, f"全在一起 Q 应为 0，实际 {q2}"
# 正确划分应高于错误划分
q3 = modularity(A, [0,1,1,0,1,1])
assert q1 > q3, f"正确划分应更高: {q1} vs {q3}"
`,
        answer: `import numpy as np

def modularity(A, labels):
    A = np.asarray(A, dtype=float)
    labels = np.asarray(labels)
    m = A.sum() / 2
    k = A.sum(axis=1)
    same = (labels[:, None] == labels[None, :]).astype(float)
    Q = ((A - np.outer(k, k) / (2 * m)) * same).sum() / (2 * m)
    return round(float(Q), 4)
`,
        explanation:
          '**向量化实现**：`np.outer(k, k)` 一次算出所有 k_i·k_j。\n\n`same` 是 δ 函数——同社区为 1 的矩阵。\n\n最终除以 2m 归一化。\n\n**验证**：全在一个社区时，A 的总和 = 2m，期望项总和也是 2m，相减为 0 → Q = 0 ✓',
        tags: ['编程', '模块度'],
      },
      {
        id: 'mining-graph-c2-e7',
        type: 'code',
        difficulty: 3,
        question:
          '实现一步标签传播：propagate_once(adj_list, labels, node)。\n\n- adj_list: dict 节点 → 邻居列表\n- 把 node 的标签更新为邻居中出现最多的标签（平局取最小标签）\n返回新标签。',
        starterCode: `from collections import Counter

def propagate_once(adj_list, labels, node):
    neighbors = adj_list.get(node, [])
    if not neighbors:
        return labels[node]
    ___
`,
        setupCode:
          'adj_list = {0:[1,2], 1:[0,2], 2:[0,1]}\nlabels = {0:0, 1:1, 2:1}',
        expectedOutput: '节点0 应变为 1（邻居都是 1）',
        tests: `adj_list = {0:[1,2], 1:[0,2], 2:[0,1]}
labels = {0:0, 1:1, 2:1}
assert propagate_once(adj_list, labels, 0) == 1, "邻居都是 1，节点0 应变 1"
# 平局取最小
adj2 = {0:[1,2], 1:[0], 2:[0]}
labels2 = {0:0, 1:5, 2:3}
assert propagate_once(adj2, labels2, 0) == 3, f"平局应取最小标签 3，实际 {propagate_once(adj2, labels2, 0)}"
# 无邻居保持不变
assert propagate_once({0: []}, {0: 9}, 0) == 9
`,
        answer: `from collections import Counter

def propagate_once(adj_list, labels, node):
    neighbors = adj_list.get(node, [])
    if not neighbors:
        return labels[node]
    cnt = Counter(labels[nb] for nb in neighbors)
    max_c = max(cnt.values())
    candidates = sorted(l for l, c in cnt.items() if c == max_c)
    return candidates[0]
`,
        explanation:
          '`Counter` 统计邻居标签频次，取最多的那些，**平局时取最小值**（保证确定性）。\n\n真实 LPA 通常平局随机选，但那样结果不可复现。这里取最小值让行为确定，便于教学与测试。\n\n生产环境中若要稳定性，可用"带权标签传播"或 Leiden。',
        tags: ['编程', '标签传播'],
      },
      {
        id: 'mining-graph-c2-e8',
        type: 'judge',
        difficulty: 3,
        question: '模块度 Q 越高，说明社区划分在业务上一定越有意义。',
        answer: false,
        explanation:
          'Q 只衡量"结构上是否像社区"，与业务意义无关。而且社区发现存在**尺度问题**：粗粒度 3 个大社区、细粒度 20 个小社区，都可能 Q 很高。必须结合业务需求调 resolution。',
        tags: ['模块度局限'],
      },
      {
        id: 'mining-graph-c2-e9',
        type: 'single',
        difficulty: 3,
        question: 'Louvain 能处理上亿节点图的关键原因是？',
        options: [
          { value: 'A', text: '用了并行计算' },
          { value: 'B', text: '两阶段交替让图规模快速缩小，整体接近线性复杂度' },
          { value: 'C', text: '只处理局部子图' },
          { value: 'D', text: '不需要计算模块度' },
        ],
        answer: 'B',
        explanation:
          '阶段 1 的局部移动只需遍历节点与邻居 O(m)；阶段 2 把社区压成超级节点，图规模指数级缩小。几轮后图就很小了，所以整体接近 O(m)。',
        tags: ['Louvain'],
      },
      {
        id: 'mining-graph-c2-e10',
        type: 'open',
        difficulty: 4,
        question:
          '请解释社区发现：模块度的定义与直觉、Louvain 的两阶段流程、标签传播的取舍，以及在风控场景（识别欺诈团伙）中如何应用。',
        referenceAnswer: `**一、模块度 Q 的定义与直觉**

    Q = (1/2m) Σ_{i,j} [A_ij − k_i·k_j/(2m)] δ(c_i, c_j)

**直觉**：社区内部的边数占比，减去"随机图"中期望的内部边数占比。

**为什么要减期望**：高度节点天然会形成大量内部边。
若不校正，把几个超级节点聚在一起就能得高分——但那是平凡划分，没有意义。

**判读**：
- Q ≈ 0：划分与随机无异；
- Q > 0.3：明显的社区结构；
- Q 最大 1（完全分离的团）。

**二、Louvain 两阶段**

**阶段 1（局部移动）**：
- 遍历每个节点，尝试移到邻居所在的社区；
- 计算 ΔQ，若为正且最大则接受；
- 重复直到没有节点愿意移动。

**阶段 2（社区聚合）**：
- 把每个社区压缩成一个超级节点；
- 超级节点间的边权 = 两社区间所有边的权重和；
- 在新图上重复阶段 1。

**终止**：Q 不再提升。

**为什么快**：阶段 1 是 O(m)，阶段 2 让图规模快速缩小。
整体接近 O(m)，能处理上亿节点。

**三、标签传播（LPA）的取舍**

**优点**：
- 极快（近线性），实现简单；
- 无需预设社区数。

**缺点**：
- **结果不稳定**（随机性大，多次运行不同）；
- 可能产生**巨型社区**（所有节点收敛到同一标签）；
- 不优化任何目标函数，无质量保证。

**取舍**：适合超大规模图的快速粗分或初始化，
不适合需要可复现结果的场景。需要稳定就用 Leiden。

**四、风控场景：识别欺诈团伙**

**为什么用社区发现**：

欺诈团伙的行为特征就是"**内部紧密、外部稀疏**"：
- 共享设备、IP、银行卡、手机号；
- 资金在团伙内部快速流转；
- 与正常用户连接很少。

这正好是社区结构的定义。

**具体做法**：

**① 构建异构图**

    节点：用户、设备、IP、银行卡、手机号
    边：登录、绑定、转账、同 IP

**② 边权设计**

- 共享设备：权重高（强信号）；
- 同 IP：权重中（可能是公共网络）；
- 转账关系：权重按金额/频次。

**③ 社区发现**

- 用 **Louvain/Leiden** 在异构图上找社区；
- 调 resolution 让社区规模合理（欺诈团伙通常 5~50 人）。

**④ 团伙评分**

对每个社区计算风险分：

    社区风险 = 平均个体风险 × log(社区规模) × 内部连接密度

- 若社区内多个成员已有欺诈标签 → 整个社区高风险；
- 社区规模异常大且连接密集 → 疑似团伙。

**⑤ 人工审核 + 处置**

- 高风险社区整体审核（比逐个审核效率高得多）；
- 处置时考虑**连带影响**（同一设备下的账号）。

**五、风控场景的特殊考量**

| 问题 | 应对 |
| --- | --- |
| **对抗性** | 欺诈者会故意打散连接（用小号隔离），需结合行为特征 |
| **误伤** | 同一写字楼的公共 IP 会让正常用户聚在一起，需剔除弱信号 |
| **时效性** | 团伙形成很快，需要近实时更新（增量社区发现） |
| **解释性** | 给审核员看"为什么这个社区可疑"（共享了哪些实体） |

**六、一个关键认知**

社区发现是**线索发现工具**，不是判决工具。
它把可疑群体圈出来，降低人工审核的搜索空间，
但最终判定仍需要证据链（资金流、行为序列等）。

**价值在于效率**：从"审核 100 万用户"变成"审核 500 个可疑社区"。`,
        rubric: [
          { point: '模块度定义 + 为什么减期望 + 判读标准', score: 3 },
          { point: 'Louvain 两阶段流程 + 为什么快', score: 2 },
          { point: 'LPA 优缺点与适用边界', score: 2 },
          { point: '风控应用：异构图构建 + 边权设计 + 社区评分', score: 2 },
          { point: '风控特殊考量（对抗性/误伤/时效）+ 线索而非判决', score: 1 },
        ],
        keywords: ['模块度', 'Louvain', 'Leiden', '异构图', '团伙评分', '公共 IP'],
        explanation:
          '能说清"减期望避免平凡划分"与"社区发现是线索工具而非判决工具"，就同时掌握了算法本质与业务定位。',
        tags: ['社区发现', '综合'],
      },
    ],
  },

  {
    id: 'mining-graph-c3',
    title: '异常检测：从统计到深度学习',
    goal: '掌握统计、距离、密度、模型四类异常检测方法，理解评估的特殊性与标签稀缺的处理。',
    lessons: [
      {
        id: 'mining-graph-c3-l1',
        title: '四类方法与评估困境',
        difficulty: 4,
        content: `
## 异常检测的特殊性

**核心困难**：

1. **极度不平衡**（异常通常 < 1%）；
2. **没有标签**（异常形态未知、随时变化）；
3. **异常的定义依赖业务**（"异常"可能是错误，也可能是机会）；
4. **对抗性**（欺诈者会主动规避）。

<AnomalyScatter />

## 四类方法

**① 统计方法**

假设数据服从某个分布，偏离分布的判为异常。

| 方法 | 做法 | 局限 |
| --- | --- | --- |
| **3σ 法则** | 偏离均值 3 个标准差 | 假设正态，受异常值污染 |
| **IQR** | Q1−1.5IQR / Q3+1.5IQR | 单变量，多变量难扩展 |
| **Grubbs 检验** | 迭代剔除最大偏离点 | 假设正态 |
| **HBOS** | 各维度直方图概率相乘 | 假设特征独立 |

**优点**：极快、可解释。
**局限**：真实数据很少服从简单分布，且多维需要假设独立性。

**② 距离方法**

异常点离其他点都很远。

| 方法 | 做法 |
| --- | --- |
| **kNN 距离** | 到第 k 近邻的距离，越大越异常 |
| **LOF**（局部离群因子） | 比较点的局部密度与邻居的局部密度 |

**LOF 的巧妙之处**：它用**相对密度**而非绝对距离。

    LOF(x) = (邻居的平均局部密度) / (x 的局部密度)

- LOF ≈ 1：与邻居密度相当（正常）；
- LOF >> 1：密度远低于邻居（异常）。

**为什么重要**：在密度不均匀的数据中（一个密集区 + 一个稀疏区），
稀疏区的正常点绝对距离也很大。LOF 用相对密度能正确识别"局部异常"。

**③ 密度/边界方法**

**One-Class SVM**：学习一个包围正常数据的边界，边界外的判为异常。

- 适合小样本、高维；
- 对核函数与 nu 参数敏感。

**④ 集成/模型方法（主流）**

**Isolation Forest（孤立森林）**：

**核心思想**：异常点**更容易被孤立**。

    随机选一个维度，随机选一个切分点，切分数据。
    异常点因为"少且离群"，平均用更少的切分就能被单独隔离。

**异常分数**：\`s(x) = 2^(-E[h(x)]/c(n))\`，h 是路径长度。

- 路径短 → 容易被孤立 → 异常分高；
- 路径长 → 混在密集区 → 正常。

**优势**：
- **无需假设分布**；
- O(n log n)，可处理大数据；
- 高维表现好（不用算距离）；
- 只需正常样本占多数（不需要标签）。

**Local Outlier Factor 与 IF 的对比**：

| 维度 | LOF | Isolation Forest |
| --- | --- | --- |
| 原理 | 局部密度比 | 随机切分路径长度 |
| 复杂度 | O(n²) | O(n log n) |
| 大数据 | 差 | **好** |
| 高维 | 差（距离退化） | **较好** |
| 局部异常 | **擅长** | 一般 |

**AutoEncoder（自编码器）**：

用神经网络学习"压缩-重建"，异常点的**重建误差**大。

- 适合高维、复杂模式（图像、时序）；
- 需要足够多的正常样本训练；
- 可解释性差。

## 评估的特殊性

**没有标签时**：无法算 AUC，只能靠人工审核 Top-N 的命中率。

**有少量标签时**：

| 指标 | 说明 |
| --- | --- |
| **Precision@K** | Top-K 中真实异常的比例（最实用） |
| **Recall@K** | 前 K 个覆盖了多少真实异常 |
| **AUPRC** | 极不平衡下比 AUC 更合适 |

**关键**：**不要用准确率**。1% 异常率下，全判正常就有 99% 准确率。

## 标签稀缺怎么办

**① 无监督为主**

用 Isolation Forest/LOF 先筛，人工审核 Top-N。

**② 弱监督**

- 用规则生成"疑似标签"（如金额 > 阈值）；
- 用历史确认的案例作正例；
- **PU Learning**（正例 + 未标注）：把未标注当负例的加权版本。

**③ 主动学习**

模型挑出"最不确定"的样本让人工标注，用最少标注获得最大提升。

**④ 半监督**

用少量标签 + 大量无标签数据训练（如 AutoEncoder + 少量分类头）。

## 一个实践流程

    1. 业务定义"异常"（什么算异常？代价是什么？）
    2. 特征工程（原始值 + 聚合 + 相对位置 + 时序）
    3. 无监督检测（IF / LOF / AutoEncoder）→ 排序
    4. 人工审核 Top-N → 得到少量标签
    5. 用标签训练监督模型（或半监督）
    6. 上线 + 持续监控 + 定期重训（异常形态会演化）

**注意第 6 步**：异常检测模型会**过时**——
欺诈手法在变，去年的模型今年可能失效。
`,
        tips: [
          {
            kind: 'interview',
            text: '「Isolation Forest 为什么有效」：异常点少且离群，随机切分时平均用更少的次数就能被单独隔离。用路径长度作为异常分数，无需假设分布。',
          },
          {
            kind: 'leak',
            text: 'LOF 用相对密度而非绝对距离，能识别密度不均匀数据中的局部异常——这是它相比 kNN 距离的核心优势。',
          },
          {
            kind: 'pitfall',
            text: '异常检测绝不能用准确率评估。1% 异常率下全判正常就有 99% 准确率。应该用 Precision@K、Recall@K、AUPRC。',
          },
        ],
        demos: [
          {
            title: 'Isolation Forest vs LOF vs 统计方法',
            lang: 'python',
            code: `import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor

rng = np.random.default_rng(0)

# 造数据：正常点两个团 + 3 个明显异常
normal = np.vstack([
    rng.normal([0, 0], 0.5, (100, 2)),
    rng.normal([5, 5], 0.5, (100, 2)),
])
outliers = np.array([[10, 0], [-5, 8], [3, -6]])
X = np.vstack([normal, outliers])
y_true = np.array([0]*200 + [1]*3)

print(f"数据: {X.shape}, 异常 {y_true.sum()} 个 ({y_true.mean():.1%})")
print()

# ① 统计方法：3σ
mu, sigma = X.mean(axis=0), X.std(axis=0)
z_scores = np.abs((X - mu) / sigma)
stat_pred = (z_scores > 3).any(axis=1)
print("=== ① 3σ 法则 ===")
print(f"  检出 {stat_pred.sum()} 个")
print(f"  真实异常命中 {((stat_pred == 1) & (y_true == 1)).sum()} / 3")

# ② Isolation Forest
iso = IsolationForest(contamination=0.02, random_state=0)
iso_pred = iso.fit_predict(X) == -1
iso_score = -iso.score_samples(X)   # 越大越异常
print()
print("=== ② Isolation Forest ===")
print(f"  检出 {iso_pred.sum()} 个")
print(f"  真实异常命中 {((iso_pred == 1) & (y_true == 1)).sum()} / 3")
top3 = np.argsort(-iso_score)[:3]
print(f"  Top-3 索引: {top3.tolist()}, 真实异常索引: {[200,201,202]}")

# ③ LOF
lof = LocalOutlierFactor(n_neighbors=20, contamination=0.02)
lof_pred = lof.fit_predict(X) == -1
print()
print("=== ③ LOF ===")
print(f"  检出 {lof_pred.sum()} 个")
print(f"  真实异常命中 {((lof_pred == 1) & (y_true == 1)).sum()} / 3")

# 评估
print()
print("=== Precision@K 评估（K=5）===")
for name, scores in [("IsolationForest", iso_score), ("3σ", z_scores.max(axis=1))]:
    top5 = np.argsort(-scores)[:5]
    hits = y_true[top5].sum()
    print(f"  {name}: Precision@5 = {hits/5:.2f} ({hits}/5 命中)")

print()
print("注意：异常检测不能用准确率！全判正常就有 98.5% 准确率，但毫无价值")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'mining-graph-c3-e1',
        type: 'single',
        difficulty: 2,
        question: 'Isolation Forest 判断异常的核心依据是？',
        options: [
          { value: 'A', text: '点到中心的距离' },
          { value: 'B', text: '随机切分时异常点平均用更少的切分次数就能被孤立' },
          { value: 'C', text: '点的密度' },
          { value: 'D', text: '点的标签' },
        ],
        answer: 'B',
        explanation:
          '异常点少且离群，随机选维度与切分点时，它们更容易被单独隔离（路径更短）。用路径长度作为异常分数，无需假设分布，也不需要标签。',
        tags: ['Isolation Forest'],
      },
      {
        id: 'mining-graph-c3-e2',
        type: 'judge',
        difficulty: 2,
        question: 'LOF 用相对密度而非绝对距离，因此能识别密度不均匀数据中的局部异常。',
        answer: true,
        explanation:
          '在"密集区 + 稀疏区"混合的数据中，稀疏区的正常点绝对距离也很大，用 kNN 距离会误判。LOF 比较"该点密度 vs 邻居密度"，能正确识别局部异常。',
        tags: ['LOF'],
      },
      {
        id: 'mining-graph-c3-e3',
        type: 'multiple',
        difficulty: 3,
        question: '异常检测面临的核心困难有哪些？（多选）',
        options: [
          { value: 'A', text: '极度不平衡（异常通常 < 1%）' },
          { value: 'B', text: '没有标签，异常形态未知且随时变化' },
          { value: 'C', text: '异常的定义依赖业务，且有对抗性' },
          { value: 'D', text: '数据量太大无法处理' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 不准确——Isolation Forest 等方法是 O(n log n)，大数据完全可处理。A/B/C 是异常检测的本质困难，也是它比普通分类难的原因。',
        tags: ['异常检测困难'],
      },
      {
        id: 'mining-graph-c3-e4',
        type: 'fill',
        difficulty: 3,
        question: '异常检测评估时绝不能用 ___，因为 1% 异常率下全判正常就有 99% 的该指标。',
        blanks: [['准确率', 'accuracy', 'Accuracy']],
        explanation:
          '不平衡场景下准确率毫无意义。应该用 Precision@K（Top-K 中真实异常比例）、Recall@K、AUPRC 等对少数类敏感的指标。',
        tags: ['评估'],
      },
      {
        id: 'mining-graph-c3-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现 kNN 异常分数：knn_score(X, k=5)。\n\n对每个点计算到第 k 近邻的距离（不含自身），返回分数数组（越大越异常）。',
        starterCode: `import numpy as np

def knn_score(X, k=5):
    X = np.asarray(X, dtype=float)
    scores = []
    for i in range(len(X)):
        d = ___
        d_sorted = ___
        scores.append(___)
    return np.array(scores)
`,
        setupCode:
          'import numpy as np\nX = np.array([[0,0],[0.1,0],[0.2,0],[0,0.1],[10,10]], dtype=float)',
        expectedOutput: '最后一个点分数最高',
        tests: `import numpy as np
X = np.array([[0,0],[0.1,0],[0.2,0],[0,0.1],[10,10]], dtype=float)
s = knn_score(X, 3)
assert len(s) == 5
assert s[-1] > s[0], f"孤立点分数应最高: {s[-1]} vs {s[0]}"
assert s[-1] == max(s), "最后一个点应是最异常的"
# 密集区的点分数应很小
assert s[0] < 1, f"密集区点分数应很小，实际 {s[0]}"
`,
        answer: `import numpy as np

def knn_score(X, k=5):
    X = np.asarray(X, dtype=float)
    scores = []
    for i in range(len(X)):
        d = np.linalg.norm(X - X[i], axis=1)
        d_sorted = np.sort(d)
        # d_sorted[0] 是自身（距离 0），所以取 index k
        scores.append(d_sorted[k] if k < len(d_sorted) else d_sorted[-1])
    return np.array(scores)
`,
        explanation:
          '**关键**：`d_sorted[0]` 是自身（距离 0），所以"第 k 近邻"要取 `d_sorted[k]`。\n\n复杂度 O(n²)——每个点都要算到所有点的距离。大数据要用 KD-Tree 或近似算法。\n\n这是最直观的异常检测：离大家都很远的就是异常。',
        tags: ['编程', 'kNN 异常'],
      },
      {
        id: 'mining-graph-c3-e6',
        type: 'code',
        difficulty: 3,
        question:
          '计算 Precision@K 用于异常检测评估：precision_at_k(scores, y_true, k)。\n\n- scores: 异常分数（越大越异常）\n- y_true: 真实标签（1=异常）\n- 取分数最高的 k 个，返回其中真实异常的比例（保留 4 位小数）',
        starterCode: `import numpy as np

def precision_at_k(scores, y_true, k):
    scores = np.asarray(scores)
    y_true = np.asarray(y_true)
    top_k = ___
    return ___
`,
        setupCode:
          'import numpy as np\nscores = np.array([0.9,0.8,0.7,0.1,0.05])\ny_true = np.array([1,0,1,0,0])',
        expectedOutput: '2/3 ≈ 0.6667',
        tests: `import numpy as np
scores = np.array([0.9,0.8,0.7,0.1,0.05])
y_true = np.array([1,0,1,0,0])
# Top-3 是索引 0,1,2，其中 2 个异常
assert abs(precision_at_k(scores, y_true, 3) - 0.6667) < 1e-3
# Top-1 只有索引 0，是异常
assert precision_at_k(scores, y_true, 1) == 1.0
# Top-5 全部
assert abs(precision_at_k(scores, y_true, 5) - 0.4) < 1e-9
# 全命中
assert precision_at_k(np.array([1,2]), np.array([1,1]), 2) == 1.0
`,
        answer: `import numpy as np

def precision_at_k(scores, y_true, k):
    scores = np.asarray(scores)
    y_true = np.asarray(y_true)
    top_k = np.argsort(-scores)[:k]
    return round(float(y_true[top_k].sum()) / k, 4)
`,
        explanation:
          '`np.argsort(-scores)[:k]` 取分数最高的 k 个索引（负号实现降序）。\n\nPrecision@K 是异常检测**最实用的离线指标**——它直接对应"人工审核前 K 个，有多少是真异常"。\n\n生产系统中 K 通常取审核团队一天能处理的量（如 100~500）。',
        tags: ['编程', 'Precision@K'],
      },
      {
        id: 'mining-graph-c3-e7',
        type: 'judge',
        difficulty: 3,
        question: '异常检测模型上线后可以长期使用，不需要重新训练。',
        answer: false,
        explanation:
          '异常形态会演化（欺诈手法在变），模型会过时。必须持续监控 + 定期重训。这是异常检测与普通分类任务的重要区别。',
        tags: ['模型维护'],
      },
      {
        id: 'mining-graph-c3-e8',
        type: 'single',
        difficulty: 3,
        question: 'PU Learning（正例 + 未标注学习）适用于什么场景？',
        options: [
          { value: 'A', text: '所有样本都有标签' },
          { value: 'B', text: '只有少量确认的异常样本，大量样本未标注（不确定是否异常）' },
          { value: 'C', text: '完全没有数据' },
          { value: 'D', text: '只有正常样本' },
        ],
        answer: 'B',
        explanation:
          '异常检测常只有"已确认的异常"（正例）与"大量未标注样本"。PU Learning 把未标注样本当作"负例的加权版本"处理，避免直接当负例引入噪声。',
        tags: ['PU Learning'],
      },
      {
        id: 'mining-graph-c3-e9',
        type: 'code',
        difficulty: 3,
        question:
          '实现 LOF 的核心比值：lof_ratio(point, neighbors, k_dist_func)。\n\n简化版：返回 邻居平均可达距离 / 该点的可达距离。\n\n用简化的距离函数 d(a,b) = ||a-b||，可达距离定义为 max(d, 第k近邻距离)。\n\n这里简化为：返回 (邻居到其第k近邻的平均距离) / (point 到其第k近邻的距离)。',
        starterCode: `import numpy as np

def lof_ratio(point, neighbors, all_points, k=3):
    def k_dist(p):
        d = np.sort(np.linalg.norm(all_points - p, axis=1))
        return d[min(k, len(d)-1)]
    own = k_dist(point)
    if own == 0:
        return 1.0
    avg_neighbor = ___
    return round(avg_neighbor / own, 4)
`,
        setupCode:
          'import numpy as np\nX = np.array([[0,0],[0.1,0],[0.2,0],[10,10]], dtype=float)\npoint = X[0]\nneighbors = X[1:3]',
        expectedOutput: 'LOF 比值',
        tests: `import numpy as np
X = np.array([[0,0],[0.1,0],[0.2,0],[0,0.1],[10,10]], dtype=float)
# 密集区内的点：邻居密度与自己相当，比值接近 1
r1 = lof_ratio(X[0], X[1:4], X, k=3)
assert 0.5 < r1 < 2.0, f"密集区点比值应接近 1，实际 {r1}"
# 孤立点：自身 k 距离远大于邻居的 k 距离 -> 比值 << 1
# （简化版用 k_dist(邻居)/k_dist(自身)，孤立点的 own 很大，所以比值很小）
r2 = lof_ratio(X[4], X[0:2], X, k=3)
assert r2 < 0.5, f"孤立点比值应明显小于 1（自身密度低），实际 {r2}"
# 说明：真实 LOF 用 1/密度 的比值，方向相反；这里保留"偏离 1 即为异常"的直觉
assert abs(r1 - 1.0) < abs(r2 - 1.0), "密集区点应比孤立点更接近 1"
`,
        answer: `import numpy as np

def lof_ratio(point, neighbors, all_points, k=3):
    def k_dist(p):
        d = np.sort(np.linalg.norm(all_points - p, axis=1))
        return d[min(k, len(d)-1)]
    own = k_dist(point)
    if own == 0:
        return 1.0
    avg_neighbor = np.mean([k_dist(nb) for nb in neighbors])
    return round(float(avg_neighbor / own), 4)
`,
        explanation:
'LOF 的核心：**比较该点的密度与邻居的密度**。\n\n- 比值 ≈ 1：密度与邻居相当（正常）； - 比值 >> 1：密度远低于邻居（异常）。  **注意**：真实 LOF 用的是"可达距离"（reachability distance）而非原始距离， 并用局部可达密度（lrd）的比值。这里是简化版，保留核心直觉。',
        tags: ['编程', 'LOF'],
      },
      {
        id: 'mining-graph-c3-e10',
        type: 'open',
        difficulty: 5,
        question:
          '你负责一个支付平台的欺诈检测。数据特点：日均 100 万笔交易、欺诈率 0.1%、几乎没有标注（只有用户投诉后确认的少量案例）、欺诈手法每月都在变。请设计完整的检测方案。',
        referenceAnswer: `**一、问题拆解**

| 特点 | 影响 |
| --- | --- |
| 100 万/天 | 必须流式处理，延迟 < 100ms |
| 欺诈率 0.1% | 极度不平衡，不能用准确率 |
| 几乎无标注 | 必须以无监督为主 + 主动学习 |
| 手法每月变 | 模型必须快速迭代 + 持续监控 |

**二、整体架构（三层）**

    第一层：规则引擎（硬规则，毫秒级）
      ↓ 过滤掉 80% 的明显正常交易
    第二层：无监督异常检测（Isolation Forest / AutoEncoder）
      ↓ 打分排序
    第三层：人工审核 Top-N + 反馈闭环
      ↓ 积累标签 → 训练监督模型

**三、各层设计**

**① 规则引擎（第一道防线）**

- 黑名单（已知欺诈设备/IP/卡号）；
- 硬阈值（单笔 > 5 万、深夜大额、异地登录 + 大额）；
- 频次限制（同一卡 1 分钟内 5 笔）。

**作用**：拦截已知模式，成本极低，且可解释。

**② 无监督检测**

**特征工程（最关键）**：

| 类别 | 特征 |
| --- | --- |
| **原始** | 金额、时间、商户类目、卡类型 |
| **聚合** | 该卡近 1h/24h/7d 的交易数、金额、商户数 |
| **相对** | 本笔金额 / 该卡历史均值；距上次交易时间 / 平均间隔 |
| **时序** | 是否首次在该商户交易、是否首次异地 |
| **图** | 该卡与已知欺诈卡的关联距离（共享设备/IP） |
| **行为** | 输入密码耗时、页面停留、设备指纹 |

**模型选择**：

- **Isolation Forest**：主模型，快、无监督、高维表现好；
- **AutoEncoder**：对复杂模式（时序）补充；
- **LOF**：识别局部异常（如某商户突然出现一批异常卡）；
- **图方法**：用社区发现找团伙（共享设备/IP 聚成的群）。

**融合**：多模型分数加权或取最大，输出统一风险分。

**③ 人工审核 + 反馈闭环**

- 每天审核风险分 Top-500（审核团队的处理上限）；
- 审核结果（确认欺诈/正常）作为标签；
- **主动学习**：优先标注模型最不确定的样本；
- 标签积累到一定量（如 5000 条）后训练监督模型。

**四、应对"手法每月变"**

| 策略 | 说明 |
| --- | --- |
| **短周期重训** | 无监督模型每周重训；监督模型每两周 |
| **漂移监控** | 监控特征分布（PSI）、分数分布、拦截率 |
| **概念漂移检测** | 若审核命中率连续下降 → 触发告警 |
| **多模型集成** | 不同原理的模型互补，单点失效影响小 |
| **规则快速迭代** | 规则引擎支持热更新（无需重训模型） |

**五、评估与迭代**

**离线**：

- **Precision@K**（K=审核能力，如 500）；
- **Recall@K**（用历史确认案例回测）；
- 不用准确率、不只看 AUC。

**在线**：

- 拦截率、误拦率（正常用户被拦的比例）；
- 用户投诉率（护栏指标）；
- 审核团队的确认率（命中率）。

**A/B 实验注意**：欺诈检测的 A/B 很难做（不能故意放过欺诈）。
通常用**历史回放**（用旧数据评估新模型）+ **影子模式**（新模型只打分不拦截）。

**六、关键风险与应对**

| 风险 | 应对 |
| --- | --- |
| **误拦正常用户** | 高风险才拦截，中风险走二次验证（短信/人脸） |
| **对抗性规避** | 不要过度依赖单一特征；加入行为生物特征 |
| **标签太少** | 主动学习 + PU Learning + 迁移学习 |
| **延迟** | 特征预计算 + 模型轻量化（IF 很快） |
| **冷启动新商户** | 用商户类目/注册信息做先验 |

**七、一个核心认知**

**欺诈检测是"军备竞赛"，不是一次性建模。**

    上线 → 欺诈者适应 → 模型失效 → 重新分析 → 迭代
      ↑                                        ↓
      └────────────────────────────────────────┘

必须建立**快速迭代机制**：
- 数据 → 特征 → 模型 → 审核 → 反馈的闭环尽量短（周级）；
- 保留人工分析能力（发现新手法比调模型更重要）。

**最终目标不是"抓完所有欺诈"，而是"在可接受的误拦率下最大化召回"。**`,
        rubric: [
          { point: '三层架构：规则 + 无监督 + 人工审核闭环', score: 3 },
          { point: '特征工程：聚合/相对/时序/图特征', score: 2 },
          { point: '模型选择：IF + AutoEncoder + LOF + 图方法融合', score: 2 },
          { point: '应对手法变化：短周期重训 + 漂移监控 + 规则热更新', score: 2 },
          { point: '评估：Precision@K + 历史回放 + 影子模式（A/B 难做）', score: 1 },
        ],
        keywords: ['Isolation Forest', '主动学习', 'PSI', '历史回放', '影子模式', '军备竞赛'],
        explanation:
          '能指出"欺诈检测是军备竞赛"并设计快速迭代闭环，以及用影子模式替代 A/B，就是真实的工业级思路。',
        tags: ['异常检测实战', '综合'],
      },
    ],
  },

  {
    id: 'mining-graph-c4',
    title: '数据流挖掘：一次扫描处理无限数据',
    goal: '理解流数据的约束、窗口模型，掌握 Misra-Gries 与 Count-Min Sketch 等概要结构。',
    lessons: [
      {
        id: 'mining-graph-c4-l1',
        title: '窗口模型与概要数据结构',
        difficulty: 5,
        content: `
## 流数据的三个约束

| 约束 | 说明 |
| --- | --- |
| **单遍（one-pass）** | 数据流过就没了，不能回头重读 |
| **有限内存** | 不能存下全部数据（可能是无限流） |
| **实时性** | 必须快速响应（毫秒级） |

**典型场景**：网络流量监控、实时交易风控、日志分析、传感器数据、
点击流统计、热搜榜。

## 窗口模型

**"统计最近的数据"** 有三种定义方式：

| 模型 | 定义 | 例子 |
| --- | --- | --- |
| **滑动窗口（Sliding）** | 最近 W 个元素 | 最近 1000 条记录 |
| **滚动窗口（Tumbling）** | 固定时间段，不重叠 | 每分钟统计一次 |
| **衰减窗口（Decayed）** | 越久远权重越低 | 指数衰减 |

**滑动窗口的难点**：需要"忘记"老数据。
精确维护需要存整个窗口（O(W) 内存），大窗口不可行。

**近似方案**：指数直方图（Exponential Histogram）、
或简单的"分桶 + 时间衰减"。

## Misra-Gries：找频繁元素

**问题**：在流中找出现次数超过 n/k 的元素（频繁项）。

**关键洞察**：**频繁项最多只有 k−1 个**（否则总次数超过 n）。

**算法（k−1 个计数器）**：

    维护 k-1 个 (元素, 计数) 对
    对每个到达的元素 x：
      若 x 已在计数器中 → 计数 +1
      若有空槽 → 加入 (x, 1)
      否则 → 所有计数器减 1，减到 0 的删除

**为什么有效**：
每次"全体减 1"相当于**抵消掉 k 个不同的元素**。
若某元素出现次数 > n/k，它不可能被完全抵消掉。

**保证**：所有真实频率 > n/k 的元素一定会被保留（**无假阴性**）。
但计数是**低估**的（可能偏小，误差 ≤ n/k）。

**内存**：O(k)，与流长度无关。这就是它的价值。

## Count-Min Sketch：估计任意元素的频率

**问题**：任意查询"元素 x 出现了多少次"，内存 O(1)。

**结构**：d 个哈希函数 × w 个桶的二维数组。

    更新 x：对每一行 i，counts[i][hash_i(x)] += 1
    查询 x：返回 min over i of counts[i][hash_i(x)]

**为什么取最小值**：
哈希冲突只会让计数**偏大**（其他元素也加到这个桶）。
取 d 行中最小的，冲突最少的那个最接近真实值。

**误差保证**（概率性）：

    P(误差 > ε·n) < δ
    需要 w = ⌈e/ε⌉, d = ⌈ln(1/δ)⌉

**例**：ε=0.01, δ=0.01 → w=272, d=5 → 约 1360 个计数器。
**用 1360 个整数就能估计任意元素的频率**，误差 < 1%。

**典型用途**：
- 实时统计 URL 访问次数（找热门）；
- 检测重流量（Heavy Hitter）；
- 数据库查询优化（估计选择率）；
- 网络流量异常检测。

## 其他重要概要结构

| 结构 | 解决什么 | 内存 |
| --- | --- | --- |
| **Bloom Filter** | 元素是否存在（有假阳性无假阴性） | O(1) |
| **HyperLogLog** | 基数估计（有多少个不同元素） | O(1)，误差 ~2% |
| **Count-Min Sketch** | 元素频率估计 | O(1) |
| **Misra-Gries** | 频繁项（Top-K） | O(k) |
| **Reservoir Sampling** | 均匀随机采样 | O(k) |
| **t-digest** | 分位数估计 | O(1) |

**这些结构的共同点**：用**可控的误差**换**极大的内存节省**。

## 流式聚类的两个算法

**① CluStream**

用**微簇（micro-cluster）**表示：
每个微簇存 (N, LS, SS, 时间戳)，其中 LS 是线性和、SS 是平方和。

- 在线阶段：新点归入最近的微簇或新建；
- 离线阶段：对微簇做 K-Means 得到最终簇。

**② DenStream（密度流聚类）**

用"核心微簇"与"潜在微簇"，能发现任意形状且自动处理噪声。

## 一个实践要点：流处理框架

| 框架 | 特点 |
| --- | --- |
| **Flink** | 真正的流处理，精确一次语义，状态管理强 |
| **Kafka Streams** | 轻量，与 Kafka 集成 |
| **Spark Structured Streaming** | 微批（micro-batch），生态好 |
| **Storm** | 老牌，低延迟 |

**核心概念**：
- **事件时间 vs 处理时间**：事件时间是数据产生的时间，处理时间是系统收到的时间。乱序数据必须用事件时间 + 水位线（watermark）。
- **状态管理**：流处理需要维护跨事件的状态（如计数器），要支持容错（checkpoint）。
- **精确一次（exactly-once）**：消息不重不漏，靠事务或幂等实现。

**一个常见错误**：用处理时间做窗口，遇到延迟数据会算错。
**正确做法**：用事件时间 + watermark 处理乱序。

<StreamSketchDemo />
`,
        tips: [
          {
            kind: 'interview',
            text: '「Misra-Gries 的原理」：维护 k-1 个计数器，新元素无槽时全体减 1。每次减 1 相当于抵消 k 个不同元素，所以频率 > n/k 的元素不可能被完全抵消（无假阴性，但计数偏低）。',
          },
          {
            kind: 'leak',
            text: 'Count-Min Sketch 查询取 d 行最小值：哈希冲突只让计数偏大，取最小能减小冲突影响。w=⌈e/ε⌉、d=⌈ln(1/δ)⌉ 就能保证误差 ε·n 内。',
          },
          {
            kind: 'pitfall',
            text: '流处理窗口必须用事件时间（数据产生时间）而非处理时间（系统收到时间），否则延迟/乱序数据会算错。需要 watermark 处理乱序。',
          },
        ],
        demos: [
          {
            title: 'Misra-Gries 与 Count-Min Sketch 实现',
            lang: 'python',
            code: `import numpy as np
from collections import defaultdict

# 模拟数据流
rng = np.random.default_rng(0)
stream = []
for _ in range(5000):
    # 80% 的数据来自 3 个高频元素
    if rng.random() < 0.8:
        stream.append(int(rng.choice([1, 2, 3])))
    else:
        stream.append(int(rng.integers(10, 100)))

true_count = defaultdict(int)
for x in stream:
    true_count[x] += 1

n = len(stream)
print(f"流长度 n = {n}, 不同元素数 = {len(true_count)}")
print(f"Top-5 真实频率: {sorted(true_count.items(), key=lambda x: -x[1])[:5]}")
print()

# ═══ Misra-Gries ═══
def misra_gries(stream, k):
    counters = {}
    for x in stream:
        if x in counters:
            counters[x] += 1
        elif len(counters) < k - 1:
            counters[x] = 1
        else:
            # 全体减 1，删除归零的
            for key in list(counters.keys()):
                counters[key] -= 1
                if counters[key] == 0:
                    del counters[key]
    return counters

print("=== Misra-Gries (k=4，即 3 个计数器) ===")
mg = misra_gries(stream, 4)
print(f"  保留的元素: {mg}")
print(f"  真实频率:   {[(x, true_count[x]) for x in mg]}")
print(f"  说明：计数是低估的（误差 ≤ n/k = {n//4}），但没有假阴性")
print(f"  频率 > n/4 的元素全部被保留: {[x for x in true_count if true_count[x] > n/4]}")
print()

# ═══ Count-Min Sketch ═══
class CountMinSketch:
    def __init__(self, epsilon=0.01, delta=0.01):
        self.w = int(np.ceil(np.e / epsilon))
        self.d = int(np.ceil(np.log(1 / delta)))
        self.counts = np.zeros((self.d, self.w), dtype=int)
        self.seeds = list(range(self.d))

    def _hash(self, x, i):
        return hash((self.seeds[i], x)) % self.w

    def update(self, x, cnt=1):
        for i in range(self.d):
            self.counts[i, self._hash(x, i)] += cnt

    def query(self, x):
        return int(min(self.counts[i, self._hash(x, i)] for i in range(self.d)))

cms = CountMinSketch(epsilon=0.01, delta=0.01)
print(f"=== Count-Min Sketch ===")
print(f"  结构大小: {cms.d} 行 × {cms.w} 列 = {cms.d * cms.w} 个计数器")
for x in stream:
    cms.update(x)

print(f"  查询结果对比（真实 vs 估计）:")
for x in [1, 2, 3, 10, 50]:
    est = cms.query(x)
    true = true_count[x]
    err = est - true
    print(f"    元素{x:3}: 真实={true:4}, 估计={est:4}, 误差={err:+d}")

print()
print(f"  注意：估计值只会 >= 真实值（冲突只会让计数偏大）")
print(f"  误差上界 ε·n = {0.01 * n:.0f}")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'mining-graph-c4-e1',
        type: 'single',
        difficulty: 2,
        question: '流数据挖掘的三个核心约束是？',
        options: [
          { value: 'A', text: '单遍扫描、有限内存、实时性' },
          { value: 'B', text: '数据量大、维度高、噪声多' },
          { value: 'C', text: '需要标签、需要验证、需要测试' },
          { value: 'D', text: '必须用分布式、必须用 GPU、必须用数据库' },
        ],
        answer: 'A',
        explanation:
          '流数据流过就没了（单遍）、不能全部存下（有限内存）、必须快速响应（实时性）。这三个约束催生了各种"概要数据结构"——用可控误差换内存节省。',
        tags: ['流数据约束'],
      },
      {
        id: 'mining-graph-c4-e2',
        type: 'judge',
        difficulty: 2,
        question: 'Misra-Gries 算法保证：所有真实频率超过 n/k 的元素都会被保留在计数器中。',
        answer: true,
        explanation:
          '这是它的核心保证（无假阴性）。因为每次"全体减 1"相当于抵消 k 个不同元素，频率 > n/k 的元素不可能被完全抵消。代价是计数偏低（低估误差 ≤ n/k）。',
        tags: ['Misra-Gries'],
      },
      {
        id: 'mining-graph-c4-e3',
        type: 'multiple',
        difficulty: 3,
        question: 'Count-Min Sketch 的特点有？（多选）',
        options: [
          { value: 'A', text: '用 d 个哈希函数 × w 个桶的二维数组' },
          { value: 'B', text: '查询时取 d 行中的最小值' },
          { value: 'C', text: '估计值只会大于等于真实值（不会低估）' },
          { value: 'D', text: '能精确恢复所有元素的真实频率' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误——它是概率性结构，有误差（误差上界 ε·n，概率 1−δ）。哈希冲突只会让计数偏大，所以取最小值能减小冲突影响。',
        tags: ['Count-Min Sketch'],
      },
      {
        id: 'mining-graph-c4-e4',
        type: 'fill',
        difficulty: 3,
        question: '流处理中必须用 ___ 时间（数据产生的时间）而非处理时间做窗口，否则延迟数据会算错。',
        blanks: [['事件', 'event', 'Event']],
        explanation:
          '事件时间是数据实际产生的时间，处理时间是系统收到的时间。乱序/延迟数据必须用事件时间 + watermark 处理，否则统计结果错误。',
        tags: ['事件时间'],
      },
      {
        id: 'mining-graph-c4-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现 Misra-Gries 算法：misra_gries(stream, k)。\n\n维护 k-1 个计数器。返回 dict {元素: 估计计数}。',
        starterCode: `def misra_gries(stream, k):
    counters = {}
    for x in stream:
        if x in counters:
            ___
        elif len(counters) < k - 1:
            ___
        else:
            for key in list(counters.keys()):
                counters[key] -= 1
                if counters[key] == 0:
                    del counters[key]
    return counters
`,
        setupCode: 'stream = [1,1,1,2,2,3,3,4,4,4,4]\nk = 3',
        expectedOutput: '保留高频元素',
        tests: `# k=3 -> 2 个计数器
out = misra_gries([1,1,1,2,2,3,3,4,4,4,4], 3)
assert isinstance(out, dict), "应返回 dict"
assert all(v > 0 for v in out.values()), "计数应全为正"
assert len(out) <= 2, f"最多 2 个计数器，实际 {len(out)}"
# 全部相同元素
assert misra_gries([5]*10, 3) == {5: 10}, f"应得 {{5:10}}，实际 {misra_gries([5]*10,3)}"
# 元素少于 k-1
out2 = misra_gries([1,1,2], 5)
assert out2 == {1: 2, 2: 1}
`,
        answer: `def misra_gries(stream, k):
    counters = {}
    for x in stream:
        if x in counters:
            counters[x] += 1
        elif len(counters) < k - 1:
            counters[x] = 1
        else:
            for key in list(counters.keys()):
                counters[key] -= 1
                if counters[key] == 0:
                    del counters[key]
    return counters
`,
        explanation:
          '**关键在"全体减 1"**：这相当于一次性抵消 k 个不同的元素。\n\n频率 > n/k 的元素即使每次都被抵消，剩余次数仍 > 0，所以不会被删除（无假阴性）。\n\n但计数是低估的——因为减 1 时它也被减了。误差上界是 n/k。',
        tags: ['编程', 'Misra-Gries'],
      },
      {
        id: 'mining-graph-c4-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现 Count-Min Sketch：cms_init(epsilon, delta) 返回 (w, d)。\n\nw = ceil(e / epsilon)，d = ceil(ln(1/delta))。返回整数元组。',
        starterCode: `import numpy as np

def cms_init(epsilon=0.01, delta=0.01):
    w = ___
    d = ___
    return int(w), int(d)
`,
        setupCode: 'epsilon, delta = 0.01, 0.01',
        expectedOutput: 'w≈272, d≈5',
        tests: `import numpy as np
w, d = cms_init(0.01, 0.01)
assert w == int(np.ceil(np.e / 0.01)), f"w 计算错误: {w}"
assert d == int(np.ceil(np.log(1/0.01))), f"d 计算错误: {d}"
assert 270 <= w <= 275, f"w 应约 272，实际 {w}"
assert 4 <= d <= 6, f"d 应约 5，实际 {d}"
# 更小的 epsilon 需要更大的 w
w2, _ = cms_init(0.001, 0.01)
assert w2 > w, "epsilon 更小需要更多桶"
# 更小的 delta 需要更大的 d
_, d2 = cms_init(0.01, 0.001)
assert d2 > d, "delta 更小需要更多行"
`,
        answer: `import numpy as np

def cms_init(epsilon=0.01, delta=0.01):
    w = np.ceil(np.e / epsilon)
    d = np.ceil(np.log(1 / delta))
    return int(w), int(d)
`,
        explanation:
          '这是 Count-Min Sketch 的理论保证：\n\n    P(误差 > ε·n) < δ\n\n由 w = ⌈e/ε⌉ 与 d = ⌈ln(1/δ)⌉ 保证。\n\n**实测**：ε=0.01, δ=0.01 → 272×5 = 1360 个计数器，就能在 1% 误差内估计任意元素频率。这就是"用极小内存处理无限流"的威力。',
        tags: ['编程', 'CMS 参数'],
      },
      {
        id: 'mining-graph-c4-e7',
        type: 'code',
        difficulty: 3,
        question:
          '实现 Reservoir Sampling（蓄水池采样）：reservoir_sample(stream, k)。\n\n从流中**均匀随机**抽取 k 个元素（单遍，O(k) 内存）。\n\n算法：前 k 个直接放入；第 i 个元素（i>k）以 k/i 概率替换池中随机一个。',
        starterCode: `import numpy as np

def reservoir_sample(stream, k, seed=0):
    rng = np.random.default_rng(seed)
    reservoir = []
    for i, x in enumerate(stream):
        if i < k:
            ___
        else:
            j = rng.integers(0, i + 1)
            if j < k:
                ___
    return reservoir
`,
        setupCode: 'stream = list(range(100))\nk = 10',
        expectedOutput: '10 个均匀采样的元素',
        tests: `import numpy as np
stream = list(range(100))
out = reservoir_sample(stream, 10)
assert len(out) == 10, f"应采 10 个，实际 {len(out)}"
assert all(x in stream for x in out), "应来自原流"
assert len(set(out)) == 10, "不应重复"
# 均匀性：多次采样，每个位置被选中的频率应接近 k/n
rng = np.random.default_rng(0)
counts = np.zeros(100)
for s in range(200):
    idx = reservoir_sample(stream, 10, seed=s)
    for i in idx:
        counts[i] += 1
freq = counts / 200
# 期望 0.1，允许 ±0.06 波动
assert abs(freq.mean() - 0.1) < 0.01, f"平均频率应约 0.1，实际 {freq.mean()}"
assert freq.max() < 0.25, f"不应有元素被过度采样: {freq.max()}"
`,
        answer: `import numpy as np

def reservoir_sample(stream, k, seed=0):
    rng = np.random.default_rng(seed)
    reservoir = []
    for i, x in enumerate(stream):
        if i < k:
            reservoir.append(x)
        else:
            j = rng.integers(0, i + 1)
            if j < k:
                reservoir[j] = x
    return reservoir
`,
        explanation:
          '**为什么均匀**：第 i 个元素被保留的概率是 k/i。\n通过归纳可证明每个元素最终被选中的概率都是 k/n。\n\n**关键**：只需 O(k) 内存，单遍扫描，无需知道流总长度。\n\n应用：从日志中随机抽样、A/B 实验的用户采样、大数据集的随机验证集划分。',
        tags: ['编程', '蓄水池采样'],
      },
      {
        id: 'mining-graph-c4-e8',
        type: 'judge',
        difficulty: 3,
        question: 'Count-Min Sketch 的估计值可能小于真实值。',
        answer: false,
        explanation:
          '哈希冲突只会让桶的计数**偏大**（其他元素也加进来了），所以估计值只会 ≥ 真实值。取 d 行最小值就是为了尽量减小这个偏大误差。',
        tags: ['CMS 性质'],
      },
      {
        id: 'mining-graph-c4-e9',
        type: 'single',
        difficulty: 3,
        question: 'HyperLogLog 用于解决什么问题？',
        options: [
          { value: 'A', text: '元素频率估计' },
          { value: 'B', text: '基数估计（有多少个不同元素），内存 O(1)、误差约 2%' },
          { value: 'C', text: '判断元素是否存在' },
          { value: 'D', text: '计算分位数' },
        ],
        answer: 'B',
        explanation:
          'HyperLogLog 估计集合的基数（不同元素个数）。用约 12KB 内存就能估计上亿基数，误差约 2%。Redis 的 PFADD/PFCOUNT 就是它的实现。',
        tags: ['HyperLogLog'],
      },
      {
        id: 'mining-graph-c4-e10',
        type: 'open',
        difficulty: 5,
        question:
          '一个实时风控系统需要处理每秒 10 万笔交易，要实时检测"某张卡在 1 分钟内交易超过 5 次"、"某 IP 下关联的卡号超过 20 个"、"某商户的异常率突然飙升"。请设计完整的技术方案。',
        referenceAnswer: `**一、三个需求的本质**

| 需求 | 类型 | 技术方案 |
| --- | --- | --- |
| 卡 1 分钟 > 5 笔 | 滑动窗口计数 | 时间窗口计数器 |
| IP 关联卡号 > 20 | 基数估计（去重计数） | HyperLogLog |
| 商户异常率飙升 | 比率突变的在线检测 | 滑窗统计 + 基线对比 |

**二、需求 1：卡号滑动窗口计数**

**方案 A：精确（小窗口）**

用 Redis 的 **Sorted Set** 存 (卡号 → 时间戳列表)：

    ZADD card:{id} {timestamp} {txn_id}
    ZREMRANGEBYSCORE card:{id} 0 {now-60}
    ZCARD card:{id}

- 复杂度 O(log n)，精确；
- 内存：每卡最多存 1 分钟的交易（通常几条）。

**方案 B：近似（大规模/长窗口）**

用**分桶计数**：把 1 分钟切成 6 个 10 秒的桶，用环形数组存。
查询时累加最近 6 个桶。

- 内存 O(1)/卡；
- 误差来自桶边界（最多 ±10 秒），可接受。

**10 万/秒的吞吐**：
- 用 Redis Cluster 按卡号哈希分片；
- 或用 Flink 的 Keyed State（本地状态 + checkpoint）。

**三、需求 2：IP 关联卡号数（基数估计）**

**为什么不能精确**：一个热门 IP（如商场 WiFi）可能关联数万卡号，
精确存 set 内存爆炸。

**方案：HyperLogLog**

    PFADD ip:{addr}:1min {card_id}
    PFCOUNT ip:{addr}:1min

- 内存：约 12KB/IP（Redis 实现）；
- 误差：约 0.81%；
- 1 分钟窗口：用 key 加时间后缀，定时清理。

**注意**：阈值 20 用 HLL 估计完全够用（误差 0.8% 对 20 这个量级无影响）。

**四、需求 3：商户异常率突变检测**

**统计**：

- 滚动窗口（每分钟）：该商户的交易数、欺诈数（含"疑似"标记）；
- 计算欺诈率 p = fraud / total。

**基线**：

- 历史 7 天同期的均值 μ 与标准差 σ（考虑周期性）；
- 或用**指数加权移动平均（EWMA）**维护平滑基线。

**检测**：

用 **z-score** 或 **CUSUM（累积和）**：

    z = (p_now - μ) / (σ / sqrt(n_now))
    若 z > 3 且 n_now >= 最小样本量 → 告警

**CUSUM 更适合检测"缓慢漂移"**：

    S_t = max(0, S_{t-1} + (p_t - μ - k))
    若 S_t > h → 告警

**为什么用 CUSUM**：z-score 只检测"单点突变"，
而欺诈手法渗透往往是渐进的，CUSUM 对持续偏移更敏感。

**五、整体架构**

    交易流（Kafka）
      ↓
    Flink（事件时间 + watermark）
      ├─ 状态：卡号窗口计数（Keyed State）
      ├─ 状态：IP 的 HLL（Keyed State）
      └─ 状态：商户滑窗统计（Keyed State）
      ↓
    规则引擎（阈值判断）
      ↓
    风险分（多规则加权）→ 拦截/放行/二次验证
      ↓
    告警与看板

**六、关键技术点**

| 点 | 说明 |
| --- | --- |
| **事件时间** | 必须用交易发生时间，不能用来系统接收时间（否则网络延迟会算错） |
| **Watermark** | 处理乱序，容忍一定延迟（如 5 秒） |
| **状态后端** | RocksDB（大状态）+ checkpoint（容错） |
| **精确一次** | Flink checkpoint + 幂等写入 |
| **本地缓存** | 热点卡号/IP 的状态本地化，避免跨节点查询 |
| **降级策略** | 若流处理延迟过高，降级到"仅规则引擎"保证不阻塞交易 |

**七、性能估算**

- 10 万 TPS，每笔需要 3 次状态查询 + 更新；
- 单 Flink TaskManager 约处理 1~5 万 TPS；
- 需要 4~10 个并行度（按 key 哈希分片）；
- 状态大小：活跃卡号约 1000 万 × 每条几十字节 ≈ 数百 MB（RocksDB 可承载）。

**八、一个常见错误**

**用处理时间做窗口**：网络延迟或重试会导致同一笔交易被算在错误的窗口里，
产生误判。

**正确做法**：事件时间 + watermark，允许 5 秒乱序容忍。
超过 watermark 的迟到数据可以选择丢弃或更新（视业务要求）。

**九、监控指标**

- 处理延迟（P99 < 100ms）；
- 状态大小增长趋势（防内存泄漏）；
- 各规则触发率（防误报泛滥）；
- 告警确认率（人工审核的命中率）。`,
        rubric: [
          { point: '需求 1：滑动窗口计数（Redis ZSet 或分桶环形数组）', score: 2 },
          { point: '需求 2：HyperLogLog 做基数估计，说明为什么不能精确', score: 3 },
          { point: '需求 3：滑窗统计 + 基线 + z-score/CUSUM 检测', score: 2 },
          { point: '架构：Flink + Keyed State + 事件时间/watermark', score: 2 },
          { point: '性能估算 + 降级策略 + 事件时间的重要性', score: 1 },
        ],
        keywords: ['滑动窗口', 'HyperLogLog', 'CUSUM', 'watermark', 'Keyed State', '降级'],
        explanation:
          '能针对三个需求分别选对技术（精确计数/基数估计/突变检测），并强调事件时间与降级策略，就是完整的实时风控方案。',
        tags: ['流数据实战', '综合'],
      },
    ],
  },
];
