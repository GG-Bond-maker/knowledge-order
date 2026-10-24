import type { Chapter } from '../../types';

/* 数据挖掘 · M5 图挖掘与异常检测 */
export const miningGraphChapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'mining-graph-c1',
    title: '链接分析：PageRank 与图中心性',
    goal: '理解 PageRank 的随机游走解释、收敛条件与常见变体。',
    lessons: [
      {
        id: 'mining-graph-c1-l1',
        title: 'PageRank：用随机游走给节点排名',
        difficulty: 3,
        content: `
### 学习目标

学完本节，你应该能够：
1. 写出 PageRank 迭代公式并手推 4 节点小图的两轮迭代；
2. 解释阻尼因子 d 的数学必要性（不可约/非周期/平稳分布唯一）；
3. 实现含 dangling node 处理的幂迭代并验证 PR 总和为 1。

### 前置知识

- 图的基本概念（节点/边/度）；
- 矩阵向量乘法。

### 问题背景

数入链数会被几千个垃圾页互刷作弊；PageRank 的洞察是『来自重要页面的链接更值钱』——递归定义 + 随机游走 + 瞬移机制，构成 Google 的起点，也是图上一切重要性度量的原型。

### 直觉理解

PageRank 像一群游客在网页间随机点链接：在每个页面的长期停留比例就是它的排名。15% 的瞬移概率（d=0.85）是保底机制——没有出链的死胡同会困住游客，闭环会卷走权重，瞬移保证游客最终能逛遍全网且分布唯一稳定。

### 核心概念与原理详解

## 从"数链接"到"看谁链接你"

最早的网页排名就是数入链数量。但这样容易被刷——建几千个垃圾页面互相链接就行。

**PageRank 的核心洞察**（Google 的起点）：

> 来自**重要页面**的链接，比来自普通页面的链接更有价值。

这是一个**递归定义**：页面的重要性由链接它的页面重要性决定。

## 随机游走模型

想象一个用户随机点击链接：

    1. 等概率选一个页面开始
    2. 每步以概率 d 随机点当前页面上的一个出链
    3. 以概率 (1-d) 随机跳到任意页面（"瞬移"，teleport）
    4. 长期来看，用户在每个页面停留的时间比例 = 该页面的 PageRank

**为什么需要瞬移（阻尼因子 d）**：

- 有些页面没有出链（dangling node）→ 游走会卡死；
- 有些页面形成闭环（A→B→A）→ 权重在里面循环出不来；
- 瞬移保证马尔可夫链**不可约且非周期**，因此有唯一平稳分布。

**d 常取 0.85**，即 85% 概率沿链接走、15% 概率随机跳。

## 迭代公式

    PR(p) = (1-d)/N + d · Σ_{q → p} PR(q) / L(q)

- N：页面总数；
- L(q)：q 的出链数；
- 求和遍历所有指向 p 的页面 q。

**矩阵形式**：PR = (1-d)/N · 1 + d · M · PR，其中 M 是列随机转移矩阵。

<PageRankFlow />

## 为什么一定收敛

把 PageRank 迭代看成**幂迭代**：

- 转移矩阵 M 是列随机的（每列和为 1）；
- 加入瞬移后，实际转移矩阵是 (1-d)/N·J + d·M，它是**正矩阵**；
- 由 Perron-Frobenius 定理，正矩阵有唯一的主特征向量，且幂迭代收敛到它。

**收敛速度**由 d 决定：d 越大收敛越慢（d=0.85 通常几十次迭代到 1e-8）。

## 常见变体与问题

**① Dangling nodes（悬挂节点）**

没有出链的页面会把权重"漏掉"。处理方式：
- 按列归一化时把它们视为指向所有页面的均匀分布；
- 或直接剔除后再加回。

**② Personalized PageRank（PPR）**

把瞬移改成**按用户偏好分布跳转**（如只跳到用户看过的页面）。
结果就是"相对于该用户的个性化重要性"。

**用途**：推荐系统的图扩散、GraphRAG 的相关性传播。

**③ TrustRank**

从一个"可信种子集"出发做 PPR，用来对抗链接农场（spam）。

**④ 主题敏感 PageRank**

瞬移按主题分布跳转，得到主题相关的排名。

## 图中心性：不止 PageRank

| 指标 | 定义 | 适合 |
| --- | --- | --- |
| **度中心性** | 连接数 | 快速粗筛 |
| **PageRank** | 递归的重要性 | 有向图、引用网络 |
| **介数中心性** | 经过该点的最短路径数 | 找"桥梁"节点 |
| **接近中心性** | 到其他点平均距离的倒数 | 找"中心位置" |
| **特征向量中心性** | 邻接矩阵主特征向量 | 无向图（PageRank 的无向版） |

**介数中心性**的用途很实际：找社交网络里的"跨圈层关键人物"、
交通网络里的"瓶颈路段"、传播网络里的"超级传播者"。

## 一个实践要点：图规模

真实图可能有**数十亿节点**。

- 全图迭代：内存放不下邻接矩阵 → 用稀疏格式；
- **分布式**：Pregel / Giraph 的"顶点为中心"模型；
- **近似算法**：Monte Carlo 近似 PPR（几十次随机游走就能估计一个节点的 PPR）。

**Personalized PageRank 的近似**在工业界极其常用（推荐召回、图神经网络邻居采样）。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
edges = [("A","B"),("A","C"),("B","C"),("C","A"),("D","C")]
nodes = sorted({n for e in edges for n in e})
idx = {n: i for i, n in enumerate(nodes)}
N = len(nodes)
M = np.zeros((N, N))
for s, t in edges: M[idx[t], idx[s]] += 1
out = M.sum(0); out[out == 0] = N            # dangling -> 均匀
M = M/out
d = 0.85
pr = np.ones(N)/N
for it in range(60):
    pr = (1-d)/N + d*M@pr
print("PageRank:", {n: round(p, 3) for n, p in zip(nodes, pr)}, "| 总和:", round(pr.sum(), 4), "| C 最高（被 A/B/D 指向）")\`\`\`

预期输出（实测）：4 节点图 PageRank（d=0.85）：C=0.394 > A=0.373 > B=0.196 > D=0.038，总和 1.0——C 被三个页面指向且 A 的权重经链接传导。

**常见错误**：忘记处理 dangling node（无出链页把权重漏掉，总和不再为 1）；d 设 1（闭环权重永远出不来）；迭代不收敛就停止（应设阈值 1e-8 或固定轮数）。

### 常见误区

1. **『PageRank 只看入链数』**——它看出链页的重要性并按出链数均分；\\n2. **『PR 值绝对大小有意义』**——不同图之间不可比，同图内相对排名才有意义；\\n3. **『瞬移是工程补丁』**——它是数学必需：保证马尔可夫链不可约非周期、平稳分布唯一。

### 知识关联

- **向前**：图的基本表示（邻接矩阵/度）是本章前置；
- **向后**：c2 的社区发现用图拓扑；c4 的流式 PageRank 处理动态图；
- **平行**：mining-recsys 的 Item-CF 共现图与本章随机游走共享『转移概率』内核。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 迭代式 | PR(p) = (1−d)/N + d·Σ PR(q)/L(q) |
| 阻尼 | d=0.85：85% 走链接、15% 瞬移 |
| 收敛 | 幂迭代 + Perron-Frobenius，几十轮到 1e-8 |
| dangling | 视为指向所有页面的均匀分布 |
| 变体 | PPR（个性化瞬移）、TrustRank |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Han, Kamber & Pei《数据挖掘：概念与技术》相应章节与 scikit-learn 官方文档）
`,
        tips: [
          {
            kind: 'interview',
            text: '「PageRank 的阻尼因子 d 起什么作用」：防止权重在闭环中循环、防止悬挂节点泄漏，保证马尔可夫链不可约非周期，从而有唯一平稳分布。',
          },
          {
            kind: 'leak',
            text: 'PageRank 一定收敛，因为加入瞬移后转移矩阵是正矩阵（Perron-Frobenius 定理保证唯一主特征向量）。d 越大收敛越慢。',
          },
          {
            kind: 'note',
            text: 'Personalized PageRank（瞬移按用户偏好）是推荐系统图扩散与 GraphRAG 相关性传播的基础，工业界常用 Monte Carlo 近似。',
          },
        ],
        demos: [
          {
            title: '手写 PageRank 迭代',
            lang: 'python',
            code: `import numpy as np

# 有向图：edges[i] = [i 指向的节点]
edges = {
    'A': ['B', 'C'],
    'B': ['C'],
    'C': ['A'],
    'D': ['C', 'A'],
}
nodes = sorted(edges)
idx = {n: i for i, n in enumerate(nodes)}
N = len(nodes)

# 构建列随机转移矩阵（处理悬挂节点：均匀分配）
M = np.zeros((N, N))
for n, outs in edges.items():
    if outs:
        for o in outs:
            M[idx[o], idx[n]] = 1 / len(outs)
    else:
        M[:, idx[n]] = 1 / N

def pagerank(M, d=0.85, iters=100, tol=1e-10):
    N = M.shape[0]
    pr = np.ones(N) / N
    history = []
    for it in range(iters):
        new = (1 - d) / N + d * (M @ pr)
        diff = np.abs(new - pr).sum()
        history.append(diff)
        pr = new
        if diff < tol:
            print(f"  收敛于第 {it + 1} 轮（Δ={diff:.2e}）")
            break
    return pr, history

print("=== PageRank 迭代 ===")
pr, hist = pagerank(M)
for n in nodes:
    print(f"  {n}: {pr[idx[n]]:.4f}  ({pr[idx[n]]*100:.1f}%)")
print(f"总和: {pr.sum():.4f}")

print()
print("=== 不同阻尼因子的影响 ===")
for d in (0.5, 0.85, 0.99):
    pr2, h2 = pagerank(M, d=d)
    print(f"  d={d}: A={pr2[idx['A']]:.4f} C={pr2[idx['C']]:.4f} 迭代次数={len(h2)}")

print()
print("解读：C 被 B、D、A 指向，且 A 与 B 本身重要 -> C 排名最高")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'mining-graph-c1-e1',
        type: 'single',
        difficulty: 2,
        question: 'PageRank 中阻尼因子 d（通常 0.85）的主要作用是？',
        options: [
          { value: 'A', text: '加快计算速度' },
          { value: 'B', text: '保证随机游走不会陷入闭环或悬挂节点，使马尔可夫链有唯一平稳分布' },
          { value: 'C', text: '减少内存占用' },
          { value: 'D', text: '过滤垃圾链接' },
        ],
        answer: 'B',
        explanation:
          '没有瞬移时，悬挂节点会泄漏权重、闭环会让权重无法流出。加入 (1-d) 的随机跳转后转移矩阵变为正矩阵，由 Perron-Frobenius 定理保证唯一平稳分布。',
        tags: ['阻尼因子'],
      },
      {
        id: 'mining-graph-c1-e2',
        type: 'judge',
        difficulty: 2,
        question: 'PageRank 的迭代一定收敛，但 d 越大会收敛越慢。',
        answer: true,
        explanation:
          '收敛由正矩阵的谱性质保证。d 越大（如 0.99），瞬移越少，矩阵越接近临界状态，收敛越慢——需要更多次迭代。',
        tags: ['收敛性'],
      },
      {
        id: 'mining-graph-c1-e3',
        type: 'multiple',
        difficulty: 3,
        question: '下列哪些属于图中心性指标？（多选）',
        options: [
          { value: 'A', text: '度中心性（连接数）' },
          { value: 'B', text: '介数中心性（经过的最短路径数）' },
          { value: 'C', text: '接近中心性（到其他点平均距离的倒数）' },
          { value: 'D', text: '信息增益' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 是决策树的分裂准则，与图无关。三种中心性各有用途：度中心性找"人脉广"，介数找"桥梁"，接近中心性找"位置居中"。',
        tags: ['中心性'],
      },
      {
        id: 'mining-graph-c1-e4',
        type: 'fill',
        difficulty: 3,
        question: '把 PageRank 的瞬移改为按用户偏好分布跳转，得到的是 ___ PageRank，常用于推荐召回与 GraphRAG。',
        blanks: [['Personalized', 'personalized', '个性化', 'PPR']],
        explanation:
          'Personalized PageRank（PPR）计算"相对于某个用户/种子节点的重要性"，是图扩散推荐与知识图谱相关性传播的核心算法。工业界常用 Monte Carlo 近似。',
        tags: ['PPR'],
      },
      {
        id: 'mining-graph-c1-e5',
        type: 'code',
        difficulty: 2,
        question:
          '构建列随机转移矩阵：build_transition(edges, nodes)。\n\nedges: dict，节点 → 出链列表。悬挂节点（无出链）均匀指向所有节点。\n返回 numpy 矩阵 M，其中 M[目标, 源] = 权重。',
        starterCode: `import numpy as np

def build_transition(edges, nodes):
    N = len(nodes)
    idx = {n: i for i, n in enumerate(nodes)}
    M = np.zeros((N, N))
    for n, outs in edges.items():
        ___
    return M
`,
        setupCode:
          'edges = {"A": ["B"], "B": ["A", "C"], "C": []}\nnodes = ["A", "B", "C"]',
        expectedOutput: '列随机矩阵（每列和为 1）',
        tests: `import numpy as np
edges = {"A": ["B"], "B": ["A", "C"], "C": []}
nodes = ["A", "B", "C"]
M = build_transition(edges, nodes)
# 每列和为 1
assert np.allclose(M.sum(axis=0), 1.0), f"每列和应为 1，实际 {M.sum(axis=0)}"
# A -> B
assert M[1, 0] == 1.0, "A 全部指向 B"
# B -> A, C 各 0.5
assert M[0, 1] == 0.5 and M[2, 1] == 0.5
# C 是悬挂节点，均匀分配
assert np.allclose(M[:, 2], 1/3), f"悬挂节点应均匀分配，实际 {M[:, 2]}"
`,
        answer: `import numpy as np

def build_transition(edges, nodes):
    N = len(nodes)
    idx = {n: i for i, n in enumerate(nodes)}
    M = np.zeros((N, N))
    for n, outs in edges.items():
        if outs:
            for o in outs:
                M[idx[o], idx[n]] = 1 / len(outs)
        else:
            M[:, idx[n]] = 1 / N
    return M
`,
        explanation:
          '**注意矩阵方向**：`M[目标, 源]`，这样 `M @ pr` 才能正确把权重沿着边传播。\n\n悬挂节点（无出链）均匀分配是关键细节——否则权重会泄漏，最终和不为 1。',
        tags: ['编程', '转移矩阵'],
      },
      {
        id: 'mining-graph-c1-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现 PageRank 迭代：pagerank(M, d=0.85, iters=100, tol=1e-10)。\n\n返回收敛后的 PageRank 向量（numpy array）。用 `(1-d)/N + d * (M @ pr)` 迭代，`sum(abs(new-pr)) < tol` 时停止。',
        starterCode: `import numpy as np

def pagerank(M, d=0.85, iters=100, tol=1e-10):
    N = M.shape[0]
    pr = ___
    for _ in range(iters):
        new = ___
        if ___
            break
        pr = new
    return pr
`,
        setupCode:
          'import numpy as np\nM = np.array([[0,0.5,1],[1,0,0],[0,0.5,0]], dtype=float)',
        expectedOutput: '概率分布，和为 1',
        tests: `import numpy as np
M = np.array([[0,0.5,1],[1,0,0],[0,0.5,0]], dtype=float)
pr = pagerank(M)
assert abs(pr.sum() - 1.0) < 1e-6, f"和应为 1，实际 {pr.sum()}"
assert all(pr >= 0), "不应有负值"
# 与已知结果对比（用 numpy 特征向量验证）
vals, vecs = np.linalg.eig((1-0.85)/3 + 0.85*M)
target = np.real(vecs[:, np.argmax(np.real(vals))])
target = np.abs(target) / np.abs(target).sum()
assert np.allclose(np.sort(pr), np.sort(target), atol=1e-4), f"应与特征向量解一致"
`,
        answer: `import numpy as np

def pagerank(M, d=0.85, iters=100, tol=1e-10):
    N = M.shape[0]
    pr = np.ones(N) / N
    for _ in range(iters):
        new = (1 - d) / N + d * (M @ pr)
        if np.abs(new - pr).sum() < tol:
            break
        pr = new
    return new
`,
        explanation:
          '**初始化为均匀分布** `ones(N)/N` 是标准做法，且和已为 1。\n\n瞬移项 `(1-d)/N` 保证每步都注入均匀分量，这正是收敛的关键。\n\n`M @ pr` 让每个源节点把自己的权重分给出链。',
        tags: ['编程', 'PageRank'],
      },
      {
        id: 'mining-graph-c1-e7',
        type: 'judge',
        difficulty: 3,
        question: '介数中心性最高的节点通常是图中的"桥梁"或"瓶颈"节点。',
        answer: true,
        explanation:
          '介数中心性统计经过该节点的最短路径数量。高介数的节点是不同群体之间的必经之路——社交网络里的跨圈层人物、交通网络的瓶颈路段。移除它们会显著增加图的最短路径。',
        tags: ['介数中心性'],
      },
      {
        id: 'mining-graph-c1-e8',
        type: 'single',
        difficulty: 3,
        question: '真实图有数十亿节点时，计算 Personalized PageRank 最实用的方案是？',
        options: [
          { value: 'A', text: '全部载入内存后精确迭代' },
          { value: 'B', text: 'Monte Carlo 随机游走近似' },
          { value: 'C', text: '把图转成邻接矩阵求逆' },
          { value: 'D', text: '用二分查找' },
        ],
        answer: 'B',
        explanation:
          '精确计算需要全图迭代或矩阵求逆，内存与时间都不可行。Monte Carlo 近似只需从种子节点跑几十次随机游走，统计各节点访问频率即可，复杂度与图规模解耦。',
        tags: ['近似算法'],
      },
      {
        id: 'mining-graph-c1-e9',
        type: 'code',
        difficulty: 3,
        question:
          '实现度中心性：degree_centrality(edges, nodes)。\n\n返回 dict：节点 → 归一化度中心性（出度 + 入度）/ (N-1)。有向图按双向计算。',
        starterCode: `def degree_centrality(edges, nodes):
    N = len(nodes)
    deg = {n: 0 for n in nodes}
    ___
    return {n: round(d / (N - 1), 4) if N > 1 else 0.0 for n, d in deg.items()}
`,
        setupCode:
          'edges = {"A": ["B"], "B": ["A", "C"], "C": []}\nnodes = ["A", "B", "C"]',
        expectedOutput: '归一化度数',
        tests: `edges = {"A": ["B"], "B": ["A", "C"], "C": []}
nodes = ["A", "B", "C"]
dc = degree_centrality(edges, nodes)
# A: 出1(B) 入1(从B) = 2
assert abs(dc["A"] - 1.0) < 1e-9, f"A 应为 1.0，实际 {dc['A']}"
# B: 出2(A,C) 入1(从A) = 3 -> 3/2=1.5
assert abs(dc["B"] - 1.5) < 1e-9, f"B 应为 1.5，实际 {dc['B']}"
# C: 出0 入1(从B) = 1 -> 0.5
assert abs(dc["C"] - 0.5) < 1e-9, f"C 应为 0.5，实际 {dc['C']}"
# 单节点图不报错
assert degree_centrality({}, ["X"]) == {"X": 0.0}
`,
        answer: `def degree_centrality(edges, nodes):
    N = len(nodes)
    deg = {n: 0 for n in nodes}
    for n, outs in edges.items():
        deg[n] += len(outs)
        for o in outs:
            deg[o] = deg.get(o, 0) + 1
    return {n: round(d / (N - 1), 4) if N > 1 else 0.0 for n, d in deg.items()}
`,
        explanation:
          '**双向计数**：出度加给自己，入度加给对方。\n\n归一化除以 N-1 让不同规模的图可比——这是网络分析的标准做法。\n\n注意单节点图的除零保护。',
        tags: ['编程', '度中心性'],
      },
      {
        id: 'mining-graph-c1-e10',
        type: 'open',
        difficulty: 4,
        question:
          '请完整解释 PageRank：随机游走模型、迭代公式、阻尼因子的作用、为什么收敛，以及 Personalized PageRank 的用途。',
        referenceAnswer: `**一、随机游走模型**

想象一个用户在图上游走：
1. 等概率选一个起始页面；
2. 每步以概率 d 沿当前页面的某个出链跳转；
3. 以概率 (1-d) 随机跳到任意页面（瞬移）；
4. 长期来看，用户在每页停留的时间比例就是该页的 PageRank。

递归直觉：**来自重要页面的链接更有价值**。

**二、迭代公式**

    PR(p) = (1-d)/N + d · Σ_{q → p} PR(q) / L(q)

- N 是节点总数，L(q) 是 q 的出链数；
- 第一项是瞬移带来的均匀底分；
- 第二项是所有入链贡献的加权和。

矩阵形式：

    PR = (1-d)/N · 1 + d · M · PR

其中 M 是列随机转移矩阵（M[目标, 源] = 1/出度）。

**三、阻尼因子 d 的作用**

**为什么需要瞬移**：
1. **悬挂节点**：没有出链的页面会让权重泄漏，总和不再为 1；
2. **闭环陷阱**：A→B→A 会让权重在两个节点间循环，无法流出；
3. **周期性问题**：二部图结构会导致不收敛（振荡）。

**加入瞬移后**：
- 转移矩阵变成 (1-d)/N·J + d·M，是严格正矩阵；
- 正矩阵保证马尔可夫链**不可约、非周期**；
- 从而有**唯一平稳分布**，且幂迭代必然收敛到它。

**d 的取值影响**：
- d 越大 → 越依赖真实链接结构，排名越"客观"，但收敛越慢；
- d 越小 → 越接近均匀分布，收敛快但信息少；
- 标准值 0.85。

**四、为什么收敛**

由 Perron-Frobenius 定理：正矩阵有唯一的最大实特征值（等于谱半径），
对应唯一正特征向量。幂迭代从任意正向量出发都收敛到该特征向量。

收敛速率由第二大特征值决定：d 越大，第二大特征值越接近 1，收敛越慢。

**五、Personalized PageRank（PPR）**

把瞬移分布从**均匀**改成**任意偏好分布**：

    PR_p = (1-d)·p + d · M · PR_p

其中 p 是偏好向量（如只在用户交互过的物品上非零）。

**结果**：相对于种子节点集的重要性传播。

**主要用途**：
1. **推荐系统召回**：从用户历史物品出发做 PPR，得到候选物品的相关性分数；
2. **GraphRAG**：从问题实体出发做 PPR，找到知识图谱中最相关的子图；
3. **图神经网络**：邻居采样（PPR 采样比均匀采样更有效）；
4. **社区发现**：以某节点为种子，PPR 值高的节点构成其局部社区。

**工业界常用 Monte Carlo 近似**：从种子节点跑 K 次随机游走，
统计各节点的访问频率作为 PPR 估计。复杂度与图规模无关，可增量更新。`,
        rubric: [
          { point: '随机游走模型 + 迭代公式', score: 2 },
          { point: '阻尼因子的三个作用（悬挂/闭环/周期性）', score: 3 },
          { point: 'Perron-Frobenius 保证收敛 + d 影响收敛速度', score: 2 },
          { point: 'PPR 的定义与至少三种用途', score: 2 },
          { point: '提到 Monte Carlo 近似', score: 1 },
        ],
        keywords: ['随机游走', '阻尼因子', '平稳分布', 'Perron-Frobenius', 'PPR', 'Monte Carlo'],
        explanation:
          '能说清阻尼因子解决的三类病态情况（悬挂/闭环/周期性），就真正理解了 PageRank 的设计动机。',
        tags: ['PageRank', '综合'],
      },
    ],
  },
];
