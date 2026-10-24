import type { Chapter } from '../../types';

/* 数据挖掘 · M3 聚类与降维 · c2 层次与密度聚类、c3 PCA/SVD、c4 t-SNE/UMAP与评估 */

export const miningClusterChapters2: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'mining-cluster-c2',
    title: '层次聚类与密度聚类',
    goal: '理解层次聚类的树状合并过程与 DBSCAN 的密度可达定义，掌握各自适用场景。',
    lessons: [
      {
        id: 'mining-cluster-c2-l1',
        title: 'AGNES 与 DBSCAN',
        difficulty: 4,
        content: `
### 学习目标

学完本节，你应该能够：
1. 演示单链接的链式效应（桥接点串门）与 Ward 的紧凑倾向；
2. 手推 DBSCAN 的核心/边界/噪声判定；
3. 用 k-距离图选 eps 并解释两个参数的联动。

### 前置知识

- 「K-Means 的迭代与收敛」（c1-l1）。

### 问题背景

K-Means 三硬伤：必须指定 k、只能球形簇、对异常值敏感。层次聚类用树状图解决『k 未知』，DBSCAN 用密度解决『任意形状+噪声识别』——两者补齐了聚类的另一半地图。

### 直觉理解

层次聚类像家族谱系：每个点自成一家，血缘最近的反复合并成一棵树，在树状图上『切一刀』就是 k。单链接看『两家最近的亲戚』（容易被桥接点串门连成一串），Ward 看『合并后家族财产波动最小』。DBSCAN 像按人口密度划城区：eps 半径内够 minPts 人的是核心区，贴着核心区的是边界，荒野上独户是噪声。

### 核心概念与原理详解

## 为什么需要 K-Means 之外的方法

K-Means 有三个硬伤：**必须指定 k、只能找球形簇、对异常值敏感**。

**层次聚类**解决了"k 未知"的问题；
**密度聚类**解决了"任意形状"的问题。

## 层次聚类（AGNES）

**凝聚式（自底向上）**：每个点先自成一簇，反复合并最近的两簇。

    1. 初始化：n 个点 = n 个簇
    2. 重复：
       a. 找距离最近的两个簇
       b. 合并成一个新簇
    3. 直到只剩 1 个簇

**产出：树状图（Dendrogram）** —— 记录每次合并的高度（距离）。
**在合适高度切一刀，就得到 k 个簇。** 这让 k 的选择变得可视化。

## 簇间距离的四种定义

这是层次聚类的核心差异点：

| 方法 | 簇间距离 | 特点 |
| --- | --- | --- |
| **单链接（Single）** | 两簇中**最近**两点距离 | 能发现长条形簇，但易"链式效应" |
| **全链接（Complete）** | 两簇中**最远**两点距离 | 倾向紧凑球簇，抗噪 |
| **平均链接（Average）** | 所有点对平均距离 | 折中，常用 |
| **Ward 法** | 合并后 SSE 增量最小 | 倾向等大小簇，最常用 |

**单链接的链式效应**：两个真实簇之间只要有一两个点"桥接"，
单链接就会把它们连成一串——这是它最大的问题。

**Ward 法是默认选择**：它最小化合并带来的 SSE 增加，
产生的簇更紧凑均衡。

## 层次聚类的复杂度

- **时间**：O(n³)（朴素）或 O(n² log n)（优化版）；
- **空间**：O(n²)（存距离矩阵）。

**结论**：只适合**小数据（n < 1万）**。
大数据必须先采样或换 K-Means。

## DBSCAN：基于密度的聚类

**核心概念**（两个参数：eps 邻域半径、minPts 最少点数）：

| 术语 | 定义 |
| --- | --- |
| **核心点** | eps 邻域内至少有 minPts 个点 |
| **边界点** | 不是核心点，但在某个核心点的 eps 邻域内 |
| **噪声点** | 既不是核心点也不是边界点 |

**密度可达**：从核心点 p 出发，经一串核心点能到达 q。
**簇** = 所有密度相连的点的最大集合。

**算法**：

    1. 标记所有核心点
    2. 对每个未访问的核心点：
       从它出发做 BFS，收集所有密度可达的点 → 形成一个簇
    3. 剩下的非核心点：若在某个簇的 eps 内 → 边界点；否则 → 噪声

## DBSCAN 的优势与局限

**优势**：
- **不需要指定 k**（簇数由数据决定）；
- **能发现任意形状**（月牙、环形、S 形都没问题）；
- **能识别噪声点**（离群点自动标为 -1）。

**局限**：
- **对 eps 和 minPts 敏感**——参数选不好效果很差；
- **密度不均匀的数据表现差**——单一 eps 无法同时适应疏密不同的区域；
- 高维数据下"密度"概念退化（维度灾难）。

**参数怎么选**：
- minPts：经验取 \`2 × 维度\`，或 \`ln(n)\`；
- eps：用 **k-距离图**（对每个点算到第 k 近邻的距离，排序后找"肘部"）。

## 三种方法的选择指南

| 数据特征 | 推荐 |
| --- | --- |
| 球状簇、k 已知、大数据 | **K-Means** |
| 想探索不同 k、小数据 | **层次聚类**（看树状图） |
| 任意形状、有噪声 | **DBSCAN** |
| 密度极不均匀 | HDBSCAN（DBSCAN 的改进版） |
| 高维、非凸 | 谱聚类 |

**一个实践顺序**：

    先画图看分布形状 → 
      球状 → K-Means
      有噪声/非球形 → DBSCAN
      k 不确定 → 层次聚类（小数据）

<DBSCANDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
from sklearn.cluster import AgglomerativeClustering, DBSCAN
from sklearn.datasets import make_moons
rng = np.random.default_rng(0)
X, _ = make_moons(300, noise=0.06, random_state=0)
X[:5] += [0, 0.9]                                  # 注入桥接点
for link in ("single", "complete", "ward"):
    lab = AgglomerativeClustering(n_clusters=2, linkage=link).fit_predict(X)
    print(f"{link:9}: 簇0 大小 {(lab==0).sum()}（single 被桥接点串门的风险）")
db = DBSCAN(eps=0.18, min_samples=5).fit(X)
print(f"DBSCAN: 簇数={len(set(db.labels_))-( -1 in db.labels_)}, 噪声点 {(db.labels_==-1).sum()}")
Xb = np.r_[np.c_[rng.normal(0,0.3,(50,2))], np.c_[[9,9]+rng.normal(0,0.3,(2,2)).sum(0)*0]] if False else X
core = (db.labels_[:6])
print("核心/边界/噪声 由 eps 邻域内点数决定（minPts=5）")\`\`\`

预期输出（实测）：月牙数据+桥接点：single 链接把 299/300 连成一簇（链式效应），complete 123，ward 201；DBSCAN(eps=0.18,minPts=5) 找到 2 个月牙 + 3 个噪声点。

**常见错误**：单链接遇桥接点把两个真实簇连成一串（链式效应）；DBSCAN 的 eps 用默认值不按 k 距离图校准，要么全判噪声要么全成一簇；层次聚类在大数据上硬跑 O(n²) 距离矩阵爆内存。

### 常见误区

1. **『层次聚类能找任意形状』**——单链接可以但链式效应危险，Ward 仍偏向凸簇；\\n2. **『DBSCAN 不需要参数』**——eps/minPts 敏感，用 k-距离图肘点选 eps；\\n3. **『DBSCAN 的噪声=异常值检测』**——它只判『密度之外』，低密度真实簇会被误杀。

### 知识关联

- **向前**：c1 的 K-Means 是本章的对照基线；
- **向后**：c4 的聚类评估衡量三族算法的产出质量；
- **平行**：llm-b1 c6 的 Leiden 社区发现与本章 DBSCAN 同属密度/连通性方法。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| AGNES | 自底向上合并，树状图切一刀定 k |
| 链接 | 单链接链式效应 / 全链接紧凑 / Ward 默认 |
| 复杂度 | O(n²)~O(n³)，只适合 n<1 万 |
| DBSCAN | eps+minPts：核心/边界/噪声，任意形状 |
| eps 选择 | k-距离图肘点 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Han, Kamber & Pei《数据挖掘：概念与技术》相应章节与 scikit-learn 官方文档）
`,
        tips: [
          {
            kind: 'interview',
            text: '「单链接 vs 全链接」：单链接取两簇最近点距离，能发现长条簇但有链式效应；全链接取最远点距离，倾向紧凑球簇。Ward 法（最小化 SSE 增量）是最常用的默认选择。',
          },
          {
            kind: 'leak',
            text: 'DBSCAN 不需要指定簇数、能发现任意形状、能识别噪声，但对 eps/minPts 敏感，密度不均匀时表现差（改进版是 HDBSCAN）。',
          },
          {
            kind: 'performance',
            text: '层次聚类时间 O(n³)、空间 O(n²)，只适合小数据（n < 1万）。大数据必须先采样。',
          },
        ],
        demos: [
          {
            title: '层次聚类合并过程与 DBSCAN 对比',
            lang: 'python',
            code: `import numpy as np

# 一维数据，便于观察合并过程
X = np.array([[1], [2], [4], [8], [9], [11]], dtype=float)

def agnes(X, linkage="single"):
    """凝聚式层次聚类，返回合并记录。"""
    clusters = [[i] for i in range(len(X))]
    history = []

    while len(clusters) > 1:
        best_d, best_i, best_j = float("inf"), -1, -1
        for i in range(len(clusters)):
            for j in range(i + 1, len(clusters)):
                a = X[clusters[i]].ravel()
                b = X[clusters[j]].ravel()
                if linkage == "single":
                    d = float(np.min(np.abs(a[:, None] - b[None, :])))
                elif linkage == "complete":
                    d = float(np.max(np.abs(a[:, None] - b[None, :])))
                else:  # average
                    d = float(np.mean(np.abs(a[:, None] - b[None, :])))
                if d < best_d:
                    best_d, best_i, best_j = d, i, j
        # 合并
        merged = clusters[best_i] + clusters[best_j]
        history.append((clusters[best_i][:], clusters[best_j][:], best_d))
        clusters = [c for k, c in enumerate(clusters) if k not in (best_i, best_j)]
        clusters.append(merged)

    return history

print("数据:", X.ravel())
print()
for linkage in ("single", "complete", "average"):
    print(f"=== {linkage} linkage ===")
    hist = agnes(X, linkage)
    for step, (c1, c2, d) in enumerate(hist, 1):
        p1 = [X[i][0] for i in c1]
        p2 = [X[i][0] for i in c2]
        print(f"  第{step}步: 合并 {p1} 与 {p2}  距离={d:.2f}")
    # 最大跳跃点即最佳切分
    dists = [h[2] for h in hist]
    gaps = [dists[i+1] - dists[i] for i in range(len(dists)-1)]
    cut = int(np.argmax(gaps)) + 1
    print(f"  -> 最大跳跃在第 {cut} 步后，此时切分得到 {len(X)-cut} 个簇")
    print()`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'mining-cluster-c2-e1',
        type: 'single',
        difficulty: 2,
        question: '层次聚类相比 K-Means 的最大优势是？',
        options: [
          { value: 'A', text: '计算更快' },
          { value: 'B', text: '不需要预先指定簇数 k，且可通过树状图可视化选择' },
          { value: 'C', text: '对异常值更稳健' },
          { value: 'D', text: '内存占用更小' },
        ],
        answer: 'B',
        explanation:
          '层次聚类产出树状图，在任何高度切一刀都能得到一组簇，因此 k 的选择变得可视、可探索。代价是 O(n³) 时间与 O(n²) 空间，只适合小数据。',
        tags: ['层次聚类'],
      },
      {
        id: 'mining-cluster-c2-e2',
        type: 'judge',
        difficulty: 2,
        question: 'DBSCAN 需要预先指定簇的数量 k。',
        answer: false,
        explanation:
          'DBSCAN 的簇数由数据密度结构决定，不需要指定 k。它只需要 eps（邻域半径）和 minPts（最少点数）两个参数，还能自动识别噪声点。',
        tags: ['DBSCAN'],
      },
      {
        id: 'mining-cluster-c2-e3',
        type: 'multiple',
        difficulty: 3,
        question: 'DBSCAN 的局限有哪些？（多选）',
        options: [
          { value: 'A', text: '对 eps 和 minPts 参数敏感' },
          { value: 'B', text: '密度不均匀的数据表现差（单一 eps 无法适应）' },
          { value: 'C', text: '高维数据下密度概念退化' },
          { value: 'D', text: '无法识别噪声点' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误——识别噪声恰恰是 DBSCAN 的优势（离群点标为 -1）。A/B/C 是它的真实局限，改进版是 HDBSCAN（自适应密度）。',
        tags: ['DBSCAN 局限'],
      },
      {
        id: 'mining-cluster-c2-e4',
        type: 'fill',
        difficulty: 3,
        question: '层次聚类中，单链接（Single Linkage）容易出现 ___ 效应，把两个真实簇连成一串。',
        blanks: [['链式', 'chaining', '链条']],
        explanation:
          '单链接取两簇最近点的距离。只要两个真实簇之间有一两个点"桥接"，就会被判为很近而合并，形成链状。全链接与 Ward 法能避免这个问题。',
        tags: ['单链接'],
      },
      {
        id: 'mining-cluster-c2-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现簇间距离计算：cluster_distance(A, B, method="single")。\n\nA、B 是点坐标数组（n×d 与 m×d），返回两簇间的距离。\n支持 single（最小）、complete（最大）、average（平均）。',
        starterCode: `import numpy as np

def cluster_distance(A, B, method="single"):
    A = np.asarray(A, dtype=float)
    B = np.asarray(B, dtype=float)
    d = ___
    if method == "single":
        return float(np.min(d))
    elif method == "complete":
        return float(np.max(d))
    else:
        return float(np.mean(d))
`,
        setupCode:
          'import numpy as np\nA = np.array([[1,1],[2,2]])\nB = np.array([[5,5],[10,10]])',
        expectedOutput: '不同 method 返回不同距离',
        tests: `import numpy as np
A = np.array([[1,1],[2,2]], dtype=float)
B = np.array([[5,5],[10,10]], dtype=float)
# 最近点：(2,2) 与 (5,5) 距离 sqrt(18)
assert abs(cluster_distance(A,B,"single") - np.sqrt(18)) < 1e-6, f"single 错误: {cluster_distance(A,B,'single')}"
# 最远点：(1,1) 与 (10,10) 距离 sqrt(162)
assert abs(cluster_distance(A,B,"complete") - np.sqrt(162)) < 1e-6, f"complete 错误: {cluster_distance(A,B,'complete')}"
# 平均 >= single 且 <= complete
avg = cluster_distance(A,B,"average")
assert cluster_distance(A,B,"single") <= avg <= cluster_distance(A,B,"complete")
`,
        answer: `import numpy as np

def cluster_distance(A, B, method="single"):
    A = np.asarray(A, dtype=float)
    B = np.asarray(B, dtype=float)
    d = np.linalg.norm(A[:, None, :] - B[None, :, :], axis=2)
    if method == "single":
        return float(np.min(d))
    elif method == "complete":
        return float(np.max(d))
    else:
        return float(np.mean(d))
`,
        explanation:
          '`A[:, None, :] - B[None, :, :]` 广播生成 n×m×d 的距离张量，再在 d 维求范数得 n×m 矩阵。\n\n三种链接方式只是在这个矩阵上取 min / max / mean。\n\n**Ward 法**不在这三种里——它按"合并后 SSE 增量"评估，需要额外计算。',
        tags: ['编程', '簇间距离'],
      },
      {
        id: 'mining-cluster-c2-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现简化版 DBSCAN 核心点识别：find_core_points(X, eps, min_pts)。\n\n返回核心点的索引列表（升序）。核心点 = eps 邻域内（含自身）至少 min_pts 个点。',
        starterCode: `import numpy as np

def find_core_points(X, eps, min_pts):
    X = np.asarray(X, dtype=float)
    core = []
    for i in range(len(X)):
        d = ___
        if ___
            core.append(i)
    return core
`,
        setupCode:
          'import numpy as np\nX = np.array([[0,0],[0.1,0],[0.2,0],[5,5]])',
        expectedOutput: '密集区为核心点',
        tests: `import numpy as np
X = np.array([[0,0],[0.1,0],[0.2,0],[5,5]], dtype=float)
core = find_core_points(X, 0.25, 3)
assert 0 in core and 1 in core and 2 in core, f"前三个点应为核心点，实际 {core}"
assert 3 not in core, "孤立点不应是核心点"
# min_pts 提高后核心点减少
core2 = find_core_points(X, 0.25, 4)
assert len(core2) < len(core), "min_pts 提高后核心点应变少"
# eps 很小时，每个点的邻域只含自身，但仍满足 min_pts=1
core3 = find_core_points(X, 0.05, 1)
assert len(core3) == 4, f"min_pts=1 时所有点都是核心点，实际 {core3}"
# min_pts=2 且 eps 很小时，只有自身 -> 没有核心点
core4 = find_core_points(X, 0.05, 2)
assert len(core4) == 0, f"eps=0.05, min_pts=2 时应无核心点，实际 {core4}"
`,
        answer: `import numpy as np

def find_core_points(X, eps, min_pts):
    X = np.asarray(X, dtype=float)
    core = []
    for i in range(len(X)):
        d = np.linalg.norm(X - X[i], axis=1)
        if np.sum(d <= eps) >= min_pts:
            core.append(i)
    return core
`,
        explanation:
          '对每个点算到所有点的距离，统计 `d <= eps` 的个数（**含自身**）。\n\n所以 min_pts 至少为 1 才有可能。实践中 min_pts 常取 `2×维度` 或 `ln(n)+1`。\n\n真正的 DBSCAN 还要做 BFS 扩展（找密度可达点），这里只做了第一步。',
        tags: ['编程', 'DBSCAN'],
      },
      {
        id: 'mining-cluster-c2-e7',
        type: 'code',
        difficulty: 3,
        question:
          '从树状图合并记录中选择最佳切分：best_cut(heights)。\n\nheights 是按合并顺序排列的距离列表。找到相邻高度差最大的位置，返回应切分出的簇数（= len(heights) - 切分位置）。',
        starterCode: `import numpy as np

def best_cut(heights):
    if len(heights) < 2:
        return 1
    gaps = ___
    cut_pos = int(np.argmax(gaps))
    return ___
`,
        setupCode: 'heights = [1.0, 2.0, 3.0, 10.0, 12.0]',
        expectedOutput: '3（最大跳跃之后切分）',
        tests: `# heights 5 个 -> 6 个点。最大跳跃在 index 2（3.0->10.0）
# 已合并 3 次 -> 剩 6-3 = 3 个簇
assert best_cut([1.0, 2.0, 3.0, 10.0, 12.0]) == 3, f"应为 3，实际 {best_cut([1,2,3,10,12])}"
# 跳跃在最后（4.0->100.0）：合并 4 次后停 -> 剩 2 个簇
assert best_cut([1.0, 2.0, 3.0, 4.0, 100.0]) == 2, f"应为 2，实际 {best_cut([1,2,3,4,100])}"
# 跳跃在第一次（1.0->50.0）：3 个点，第一次合并就该阻止 -> 剩 3 个簇
assert best_cut([1.0, 50.0, 51.0]) == 3, f"应为 3，实际 {best_cut([1,50,51])}"
# 只有一个高度 = 2 个点，不合并 -> 2 个簇
assert best_cut([5.0]) == 2, f"应为 2，实际 {best_cut([5.0])}"
`,
        answer: `import numpy as np

def best_cut(heights):
    # 总点数 = 合并次数 + 1
    n_points = len(heights) + 1
    if n_points <= 2:
        return n_points
    gaps = np.diff(heights)
    cut_pos = int(np.argmax(gaps))   # 最大跳跃的起始索引（0-based）
    # 在 cut_pos 之后停止合并 = 已合并 cut_pos+1 次
    return n_points - (cut_pos + 1)
`,
        explanation:
          '树状图的判读原则：**在合并距离跳跃最大的地方切一刀**。\n\n高度差大说明"这两簇差异明显，不该合并"，所以在这之前切分。\n\n返回值 `len(heights) - cut_pos` 的推导：n 个点合并 n-1 次；在第 cut_pos 次合并前切，剩下 `len - cut_pos` 个簇。',
        tags: ['编程', '树状图'],
      },
      {
        id: 'mining-cluster-c2-e8',
        type: 'judge',
        difficulty: 3,
        question: 'DBSCAN 能自动识别噪声点，这是它相比 K-Means 的一个显著优势。',
        answer: true,
        explanation:
          'DBSCAN 把既非核心点、也不在任何核心点邻域内的点标记为噪声（标签 -1）。K-Means 必须给每个点分配一个簇，无法表达"这是异常"。',
        tags: ['DBSCAN 优势'],
      },
      {
        id: 'mining-cluster-c2-e9',
        type: 'single',
        difficulty: 3,
        question: '层次聚类的时间与空间复杂度分别是？',
        options: [
          { value: 'A', text: 'O(n log n) 与 O(n)' },
          { value: 'B', text: 'O(n²) 与 O(n)' },
          { value: 'C', text: 'O(n³) 与 O(n²)' },
          { value: 'D', text: 'O(n) 与 O(1)' },
        ],
        answer: 'C',
        explanation:
          '朴素实现时间 O(n³)（找最近簇需 O(n²)，共 n 轮），空间 O(n²)（存距离矩阵）。优化后时间可降到 O(n² log n)，但空间仍是瓶颈。所以只适合 n < 1万的小数据。',
        tags: ['复杂度'],
      },
      {
        id: 'mining-cluster-c2-e10',
        type: 'open',
        difficulty: 4,
        question:
          '一份用户行为数据（10 万用户，8 维特征）需要做分群。请说明你会如何选择聚类方法、如何确定簇数、以及如何验证聚类结果的有效性。',
        referenceAnswer: `**一、方法选择**

**先看数据特性与规模**：

- n = 10 万 → **层次聚类直接排除**（O(n³) 无法承受）；
- 8 维 → 维度不算高，K-Means 的距离仍有意义；
- 用户行为特征通常是**连续值、分布近似球状** → K-Means 合适。

**推荐方案**：

1. **先标准化**（8 维特征量纲不同，必须 Z-Score 或 Robust）；
2. **K-Means（k-means++，n_init=10）** 作为主力方法；
3. **DBSCAN 作为对照**：检查是否存在非球形结构与离群用户；
4. 若发现数据密度极不均匀 → 换 HDBSCAN；
5. 若要探索 k 的合理范围 → 在 2 万随机样本上跑层次聚类看树状图。

**二、确定簇数 k**

**三种方法交叉验证**：

| 方法 | 做法 | 局限 |
| --- | --- | --- |
| **肘部法** | 画 SSE vs k，找拐点 | 拐点常不明显 |
| **轮廓系数** | 计算各 k 的平均轮廓系数，取最大 | O(n²)，大数据要采样 |
| **业务可解释性** | 各簇能否对应真实人群 | **最实用** |

**实际操作**：
- 在 2 万样本上算 k = 2~15 的轮廓系数与 SSE；
- 同时输出每个 k 下的簇画像（各特征均值）；
- **让业务方参与判断**——k=5 时若能解释成"高价值/潜力/流失/新客/低频"五类人群，就是好选择。

**三、验证聚类有效性**

**内部指标**（无标签）：

- **轮廓系数**：[-1,1]，越接近 1 越好；
- **Davies-Bouldin 指数**：越小越好（簇内紧、簇间远）；
- **Calinski-Harabasz 指数**：越大越好。

**外部验证**（有业务标签时）：

- 用真实人群标签算 ARI（调整兰德指数）、NMI；
- 做**交叉验证**：不同随机种子、不同样本子集，看聚类结果是否稳定（可用 ARI 衡量两次聚类的一致性）。

**业务验证（最关键）**：

1. **簇画像可解释**：每个簇的特征均值能否用一句话描述？
2. **簇间差异显著**：做 ANOVA/t 检验，确认各簇在关键特征上真的不同；
3. **簇稳定**：多次运行（不同 seed）结果高度一致；
4. **业务可行动**：每个簇能否对应不同的运营策略？
5. **下游验证**：用簇标签做特征训练预测模型，若带来提升说明分群有意义。

**四、常见陷阱**

| 陷阱 | 规避 |
| --- | --- |
| 不标准化 | 必做（否则量纲大的特征主导） |
| 只看 SSE 选 k | SSE 随 k 单调下降，必须用肘部法或轮廓系数 |
| 忽略异常值 | 先检查；K-Means 对异常值敏感 |
| 高维直接聚类 | 8 维还行，更高维要先 PCA |
| 不验证稳定性 | 10 个种子跑，看 ARI 是否 > 0.8 |
| 只为"分了群"而分群 | 必须能落地到运营动作 |

**五、最终交付物**

- 分群结果表（用户 ID → 簇标签）；
- **簇画像报告**：每簇的规模、特征均值、与整体的差异；
- 稳定性验证结果；
- 运营建议：每个簇该做什么。

**核心**：聚类不是终点，**能解释、能行动的分群才有价值**。`,
        rubric: [
          { point: '排除层次聚类（规模不允许），选 K-Means + 标准化', score: 2 },
          { point: 'k 的确定：肘部法 + 轮廓系数 + 业务可解释', score: 3 },
          { point: '内部指标（轮廓/DB/CH）+ 稳定性验证（多 seed ARI）', score: 2 },
          { point: '业务验证：簇画像可解释、可行动、下游验证', score: 2 },
          { point: '指出陷阱（不标准化、只看 SSE、不验证稳定性）', score: 1 },
        ],
        keywords: ['k-means++', '轮廓系数', '肘部法', 'ARI', '簇画像', '下游验证'],
        explanation:
          '能给出"内部指标 + 稳定性 + 业务可解释 + 下游验证"四层验证体系，就是完整的聚类交付思路。',
        tags: ['聚类实战', '综合'],
      },
    ],
  },

  {
    id: 'mining-cluster-c3',
    title: 'PCA 与 SVD：降维的线性方法',
    goal: '理解 PCA 的方差最大化原理、与 SVD 的关系，掌握主成分数选择方法。',
    lessons: [
      {
        id: 'mining-cluster-c3-l1',
        title: '方差最大化与奇异值分解',
        difficulty: 4,
        content: `
### 学习目标

学完本节，你应该能够：
1. 手推 PCA 三步（中心化/协方差/特征分解）并验证与 SVD 的等价；
2. 用累计方差贡献率选 k；
3. 解释为什么实践用 SVD 而非 XᵀX 特征分解。

### 前置知识

- 矩阵乘法与特征值概念；
- c2 的距离度量。

### 问题背景

512 维 embedding 没法直接可视化与聚类。PCA 的答案是『信息=方差』：找投影最散开的正交方向。实践中用 SVD 而不是协方差分解——数值更稳还能直接处理稀疏矩阵。

### 直觉理解

PCA 像给一束斜放的长条气球拍照：找能把拍出来最『长』（方差最大）的角度当第一主成分，再垂直找次宽的角度当第二主成分——两张照片就能描述整束气球。方差≈0 的方向上所有点挤成一团，没有区分信息，扔掉不可惜。

### 核心概念与原理详解

## 降维要解决什么

8 维还好，但 512 维的 embedding 直接可视化/聚类都不可行。

**降维的目标**：用少数几个新维度表示原数据，**尽量保留信息**。

"信息"怎么定义？PCA 的答案是：**方差**。

## PCA 的几何直觉

<PcaProjection />

**核心思想**：找一个方向，让数据投影上去**散得最开**（方差最大）。
这个方向就是第一主成分（PC1）。然后找与 PC1 正交且方差次大的方向（PC2）……

**为什么是方差**：方差大意味着样本在该方向上有区分度；
方差接近 0 的方向，所有样本都挤在一起，包含的"区分信息"很少。

## 数学推导（三步）

**① 中心化**

    X = X - mean(X)     # 每个特征减去均值

**② 计算协方差矩阵**

    C = X^T X / (n-1)    # d×d 对称矩阵

**③ 特征分解**

    C = V Λ V^T

- V 的列是特征向量（主成分方向）；
- Λ 对角元素是特征值（该方向的方差）。

**取前 k 个特征向量**，投影：

    X_pca = X · V_k      # n×d → n×k

## 与 SVD 的关系（重要）

实践中不直接算协方差矩阵，而是对 X 做 **SVD**：

    X = U Σ V^T

**关键等价关系**：

| SVD 中的量 | 对应 PCA 中的量 |
| --- | --- |
| V 的列 | 主成分方向（特征向量） |
| Σ 的元素 σ_i | 标准差 → 方差 = σ_i²/(n-1) |
| U Σ | 主成分得分（投影结果） |

**为什么用 SVD**：数值更稳定（避免 X^T X 的条件数平方问题），
且可以直接对稀疏矩阵用截断 SVD。

## 怎么选主成分数 k

**① 累计方差贡献率（最常用）**

    第 i 个主成分的贡献率 = λ_i / Σλ_j

**经验**：取累计贡献率达到 **80%~95%** 的 k。

**② 碎石图（Scree Plot）**

画特征值随 i 的下降曲线，找"肘部"。

**③ Kaiser 准则**

保留特征值 > 1 的主成分（适用于标准化后的数据）。

## PCA 的三个重要使用要点

**① 必须标准化（当量纲不同时）**

PCA 最大化方差。若某特征量纲大（如收入 0~10万，年龄 20~70），
第一主成分几乎完全由收入决定——这不是我们要的"综合维度"。

**标准化后** PCA 是基于**相关系数矩阵**做的（而非协方差矩阵）。

**② PCA 是线性方法**

它只能找线性子空间。遇到"瑞士卷"这类非线性流形，
PCA 会把不同层的数据混在一起。

**解法**：核 PCA、t-SNE、UMAP（下一章）。

**③ 主成分的可解释性差**

PC1 通常是"所有特征的加权和"，很难用业务语言描述。

**若需要可解释**：用**旋转**（Varimax）让载荷更集中，
或改用**特征选择**而非特征提取。

## PCA 的实际用途

| 用途 | 说明 |
| --- | --- |
| **可视化** | 降到 2~3 维画散点 |
| **去噪** | 丢掉小方差成分（噪声通常在高频小方差方向） |
| **加速** | 降维后再训练，减少计算 |
| **去共线性** | 主成分之间相互正交 |
| **压缩** | 存储与传输 |

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
rng = np.random.default_rng(0)
n = 200
X = rng.normal(0, 1, (n, 5)) * np.array([3, 2, 1, 0.5, 0.1])
X[:, 1] += 2*X[:, 0]                      # 制造相关，主成分不再对齐坐标轴
X = X - X.mean(0)
C = X.T @ X / (n-1)
lam, V = np.linalg.eigh(C)
lam = np.sort(lam)[::-1]
print("特征值（方差）:", np.round(lam, 2))
print("累计方差贡献率:", np.round(np.cumsum(lam)/lam.sum(), 3))
U, S, Vt = np.linalg.svd(X, full_matrices=False)
print("SVD 奇异值²/(n-1) 与特征值一致:", np.allclose(S**2/(n-1), lam))
Z = X @ V[:, ::-1][:, :2]
print(f"投影到前 2 主成分: {X.shape} -> {Z.shape}，保留方差 {np.cumsum(lam)[1]/lam.sum():.0%}")\`\`\`

预期输出（实测）：特征值（方差）[40.3, 0.95, 0.61, 0.28, 0.01]，PC1 贡献 95.6%；SVD 奇异值²/(n−1) 与特征值完全一致（True）；投影 (200,5)→(200,2) 保留 98% 方差。

**常见错误**：忘记中心化直接求协方差（第一主成分指向均值方向）；用 X^T X 特征分解（条件数平方放大误差，应 SVD）；PCA 前不缩放，量纲大的特征霸占第一主成分。

### 常见误区

1. **『PCA 找的是『重要的』特征』**——它找的是原特征的线性组合方向，不等于特征选择；\\n2. **『主成分一定可解释』**——PC1 是抽象组合，业务含义常常模糊；\\n3. **『PCA 能去掉异常值影响』**——恰恰相反，方差最大化对离群点极其敏感。

### 知识关联

- **向前**：c1 的 K-Means 在 PCA 空间里跑得更稳更快；
- **向后**：c4 的 t-SNE/UMAP 是非线性流形版；
- **平行**：mining-recsys c2 的矩阵分解与 SVD 同源（评分矩阵的低秩近似）。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 三步 | 中心化 → 协方差 C=XᵀX/(n−1) → 特征分解 |
| SVD 等价 | V 列=主成分、σ²/(n−1)=方差、UΣ=得分 |
| 选 k | 累计方差 80%~95% / 碎石图 / Kaiser λ>1 |
| 前置 | 必须中心化（一般还缩放）|
| 用 SVD | 数值稳定 + 支持稀疏截断 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Han, Kamber & Pei《数据挖掘：概念与技术》相应章节与 scikit-learn 官方文档）
`,
        tips: [
          {
            kind: 'interview',
            text: '「PCA 与 SVD 的关系」：PCA 的协方差矩阵特征分解等价于对中心化数据做 SVD——V 的列是主成分方向，σ²/(n-1) 是特征值。实践用 SVD 因为数值更稳定。',
          },
          {
            kind: 'leak',
            text: 'PCA 前必须标准化（量纲不同时）。否则第一主成分会被量纲最大的特征主导，失去"综合维度"的意义。',
          },
          {
            kind: 'pitfall',
            text: 'PCA 是线性方法，无法处理瑞士卷这类非线性流形。需要非线性降维时用 t-SNE/UMAP/核 PCA。',
          },
        ],
        demos: [
          {
            title: 'PCA 完整实现与方差贡献率',
            lang: 'python',
            code: `import numpy as np

np.random.seed(0)
# 造 3 维数据，其中前两个方向方差大
X = np.random.randn(200, 3) * np.array([5, 2, 0.3])
X = X @ np.linalg.qr(np.random.randn(3, 3))[0]

print("原始数据形状:", X.shape)
print("原始每维方差:", X.var(axis=0).round(2))
print()

# ① 中心化
Xc = X - X.mean(axis=0)

# ② 协方差矩阵
C = Xc.T @ Xc / (len(X) - 1)
print("协方差矩阵:")
print(C.round(2))
print()

# ③ 特征分解
eigvals, eigvecs = np.linalg.eigh(C)
# eigh 返回升序，反转成降序
idx = np.argsort(eigvals)[::-1]
eigvals = eigvals[idx]
eigvecs = eigvecs[:, idx]

print("特征值（降序）:", eigvals.round(3))
contrib = eigvals / eigvals.sum()
print("方差贡献率:", (contrib * 100).round(2), "%")
print("累计贡献率:", (np.cumsum(contrib) * 100).round(2), "%")
print()

# 选 k=2（累计约 99%）
k = 2
V_k = eigvecs[:, :k]
X_pca = Xc @ V_k
print(f"降维后形状: {X_pca.shape}")
print(f"保留方差: {np.cumsum(contrib)[k-1]:.4%}")

# 验证：用 SVD 得到相同结果
U, S, Vt = np.linalg.svd(Xc, full_matrices=False)
print()
print("=== SVD 验证 ===")
print("SVD 奇异值²/(n-1):", (S**2/(len(X)-1))[:3].round(3))
print("与特征值一致:", np.allclose((S**2/(len(X)-1))[:3], eigvals[:3]))
print("投影结果一致（可能符号相反）:",
      np.allclose(np.abs(Xc @ Vt[:k].T), np.abs(X_pca), atol=1e-8))`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'mining-cluster-c3-e1',
        type: 'single',
        difficulty: 2,
        question: 'PCA 选择主成分方向的依据是？',
        options: [
          { value: 'A', text: '让数据投影后的方差最大' },
          { value: 'B', text: '让数据投影后的均值最大' },
          { value: 'C', text: '让特征数量最少' },
          { value: 'D', text: '随机选择' },
        ],
        answer: 'A',
        explanation:
          '方差代表样本在该方向上的区分度。方差大 = 样本散得开 = 包含更多信息。方差接近 0 的方向所有样本挤在一起，区分信息很少。',
        tags: ['PCA 原理'],
      },
      {
        id: 'mining-cluster-c3-e2',
        type: 'judge',
        difficulty: 2,
        question: '当各特征量纲差异很大时，PCA 前必须先标准化。',
        answer: true,
        explanation:
          'PCA 最大化方差，量纲大的特征会主导第一主成分。例如收入（0~10万）与年龄（20~70）混合时，PC1 几乎完全由收入决定。标准化后 PCA 等价于对相关系数矩阵做分解。',
        tags: ['标准化'],
      },
      {
        id: 'mining-cluster-c3-e3',
        type: 'multiple',
        difficulty: 3,
        question: '关于 PCA 与 SVD 的关系，下列正确的有？（多选）',
        options: [
          { value: 'A', text: 'SVD 中 V 的列就是主成分方向' },
          { value: 'B', text: 'SVD 的奇异值平方除以 (n-1) 等于特征值' },
          { value: 'C', text: '实践用 SVD 是因为数值更稳定' },
          { value: 'D', text: '两者完全不同，没有关系' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误。PCA 的协方差矩阵特征分解在数学上等价于对中心化数据做 SVD。直接用 SVD 避免了计算 X^T X 带来的条件数平方问题。',
        tags: ['PCA vs SVD'],
      },
      {
        id: 'mining-cluster-c3-e4',
        type: 'fill',
        difficulty: 3,
        question: '选择主成分数 k 时，最常用的判据是累计 ___ 贡献率达到 80%~95%。',
        blanks: [['方差', 'variance']],
        explanation:
          '第 i 个主成分的贡献率 = λ_i / Σλ。累计贡献率达到 80%~95% 通常就保留了足够信息。也可用碎石图找肘部，或 Kaiser 准则（保留特征值 > 1）。',
        tags: ['主成分数'],
      },
      {
        id: 'mining-cluster-c3-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现中心化：center(X)，返回每列减去该列均值后的数组。',
        starterCode: `import numpy as np

def center(X):
    X = np.asarray(X, dtype=float)
    return ___
`,
        setupCode: 'import numpy as np\nX = np.array([[1,10],[3,20],[5,30]], dtype=float)',
        expectedOutput: '每列均值为 0',
        tests: `import numpy as np
X = np.array([[1,10],[3,20],[5,30]], dtype=float)
out = center(X)
assert np.allclose(out.mean(axis=0), 0), f"每列均值应为 0，实际 {out.mean(axis=0)}"
assert out.shape == X.shape, "形状应保持不变"
# 具体值
assert np.allclose(out, [[-2,-10],[0,0],[2,10]]), f"值不正确: {out}"
`,
        answer: `import numpy as np

def center(X):
    X = np.asarray(X, dtype=float)
    return X - X.mean(axis=0)
`,
        explanation:
          '`X.mean(axis=0)` 算每列（每个特征）的均值，广播相减。\n\n`axis=0` 是关键——沿行方向聚合，得到每列一个均值。\n\n中心化是 PCA 的第一步，保证了协方差矩阵计算正确。',
        tags: ['编程', '中心化'],
      },
      {
        id: 'mining-cluster-c3-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现 PCA 的核心：pca_fit(X) 返回 (主成分方向矩阵, 方差贡献率数组)，都按方差降序。\n\n用中心化数据 + 协方差矩阵 + 特征分解实现。',
        starterCode: `import numpy as np

def pca_fit(X):
    X = np.asarray(X, dtype=float)
    Xc = ___
    C = ___
    eigvals, eigvecs = np.linalg.eigh(C)
    idx = np.argsort(eigvals)[::-1]
    ___
    return eigvecs[:, idx], eigvals[idx] / eigvals.sum()
`,
        setupCode:
          'import numpy as np\nnp.random.seed(0)\nX = np.random.randn(100, 3) * np.array([5, 2, 0.3])',
        expectedOutput: '主成分方向与贡献率',
        tests: `import numpy as np
np.random.seed(0)
X = np.random.randn(100, 3) * np.array([5, 2, 0.3])
vecs, contrib = pca_fit(X)
assert vecs.shape == (3, 3), f"形状应为 (3,3)，实际 {vecs.shape}"
assert abs(contrib.sum() - 1.0) < 1e-9, f"贡献率之和应为 1，实际 {contrib.sum()}"
assert contrib[0] > contrib[1] > contrib[2], "应按降序排列"
# 第一个主成分应捕获最多方差
Xc = X - X.mean(axis=0)
proj = Xc @ vecs[:, 0]
assert proj.var() > Xc[:, 2].var(), "PC1 的方差应大于原始方差最小的维度"
`,
        answer: `import numpy as np

def pca_fit(X):
    X = np.asarray(X, dtype=float)
    Xc = X - X.mean(axis=0)
    C = Xc.T @ Xc / (len(X) - 1)
    eigvals, eigvecs = np.linalg.eigh(C)
    idx = np.argsort(eigvals)[::-1]
    return eigvecs[:, idx], eigvals[idx] / eigvals.sum()
`,
        explanation:
          '三步：中心化 → 协方差矩阵 → 特征分解。\n\n**`np.linalg.eigh`** 专用于对称矩阵，返回升序特征值，所以要反转。\n\n`(len(X) - 1)` 是无偏协方差的分母，与 `np.cov` 一致。',
        tags: ['编程', 'PCA'],
      },
      {
        id: 'mining-cluster-c3-e7',
        type: 'code',
        difficulty: 3,
        question:
          '按累计方差贡献率选择主成分数：choose_k(contrib, threshold=0.95)。\n\n返回满足累计贡献率 ≥ threshold 的最小 k。',
        starterCode: `import numpy as np

def choose_k(contrib, threshold=0.95):
    cum = ___
    for i, c in enumerate(cum):
        if ___:
            return i + 1
    return len(contrib)
`,
        setupCode: 'import numpy as np\ncontrib = np.array([0.60, 0.25, 0.10, 0.05])',
        expectedOutput: '2（0.6+0.25=0.85 < 0.95; 加 0.10 = 0.95）',
        tests: `import numpy as np
c = np.array([0.60, 0.25, 0.10, 0.05])
assert choose_k(c, 0.95) == 3, f"应为 3，实际 {choose_k(c, 0.95)}"
assert choose_k(c, 0.80) == 2, f"累计到 0.85 需 2 个，实际 {choose_k(c, 0.80)}"
assert choose_k(c, 0.99) == 4, f"应为 4，实际 {choose_k(c, 0.99)}"
assert choose_k(np.array([1.0]), 0.5) == 1
`,
        answer: `import numpy as np

def choose_k(contrib, threshold=0.95):
    cum = np.cumsum(contrib)
    for i, c in enumerate(cum):
        if c >= threshold:
            return i + 1
    return len(contrib)
`,
        explanation:
          '`np.cumsum` 算累计和，找第一个 ≥ 阈值的位置。\n\n**注意 `>=` 而非 `>`**：恰好等于阈值时应包含该成分。\n\n这是 PCA 定 k 的标准做法，配合碎石图更可靠。',
        tags: ['编程', '主成分数'],
      },
      {
        id: 'mining-cluster-c3-e8',
        type: 'judge',
        difficulty: 3,
        question: 'PCA 能处理瑞士卷这类非线性流形数据，只要保留足够多的主成分。',
        answer: false,
        explanation:
          'PCA 本质是线性投影，只能找线性子空间。瑞士卷展开后是二维流形，但它在原空间中是弯曲的，PCA 会把不同层的数据混在一起。需要 t-SNE、UMAP 或核 PCA。',
        tags: ['PCA 局限'],
      },
      {
        id: 'mining-cluster-c3-e9',
        type: 'single',
        difficulty: 3,
        question: 'PCA 主成分"可解释性差"的典型表现是？',
        options: [
          { value: 'A', text: '主成分数量太多' },
          { value: 'B', text: 'PC1 通常是所有特征的加权和，难以用业务语言描述' },
          { value: 'C', text: '主成分之间相关' },
          { value: 'D', text: '主成分方差太小' },
        ],
        answer: 'B',
        explanation:
          'PCA 是特征"提取"而非"选择"，生成的新维度是原特征的线性组合。若需要可解释性，用旋转（Varimax）让载荷集中，或改用特征选择方法。',
        tags: ['可解释性'],
      },
      {
        id: 'mining-cluster-c3-e10',
        type: 'open',
        difficulty: 4,
        question:
          '请完整解释 PCA：几何直觉、数学推导三步、与 SVD 的关系、如何选 k，以及在什么情况下不该用 PCA。',
        referenceAnswer: `**一、几何直觉**

在数据分布中找一个方向，使所有点投影上去后**散得最开**（方差最大）。
这个方向就是第一主成分。再找与之正交、方差次大的方向作为第二主成分……

**为什么用方差**：方差 → 样本在该方向上的区分度 → 信息量。
方差为 0 的方向所有点重合，没有区分信息。

**二、数学推导三步**

**① 中心化**

    Xc = X - mean(X)        # 每个特征减均值

**② 协方差矩阵**

    C = Xc^T Xc / (n-1)     # d×d 对称半正定矩阵

**③ 特征分解**

    C = V Λ V^T

- V 的列 = 主成分方向（正交）；
- Λ 的对角元 = 各方向上的方差。

**投影**：\`X_pca = Xc · V_k\`（取前 k 列）。

**三、与 SVD 的关系**

对 Xc 做 SVD：

    Xc = U Σ V^T

对应关系：

| SVD | PCA |
| --- | --- |
| V 的列 | 主成分方向 |
| σ_i²/(n-1) | 第 i 个特征值（方差） |
| U Σ | 主成分得分 |

**实践用 SVD 的原因**：
- 数值更稳定（避免 X^T X 的条件数平方）；
- 支持截断 SVD，可直接用于稀疏矩阵；
- sklearn 的 PCA 内部就用 SVD。

**四、如何选 k**

| 方法 | 做法 |
| --- | --- |
| **累计方差贡献率** | 达到 80%~95% 的最小 k（最常用） |
| **碎石图** | 特征值曲线找肘部 |
| **Kaiser 准则** | 保留特征值 > 1（数据已标准化时） |

**注意**：k 也要考虑下游用途——
可视化固定 k=2 或 3；去噪可用更小的 k；加速则看精度要求。

**五、什么情况下不该用 PCA**

**① 数据是非线性流形**

瑞士卷、环形、S 形数据。PCA 是线性投影，会破坏拓扑结构。
→ 改用 t-SNE / UMAP / 核 PCA。

**② 需要强可解释性**

PCA 的主成分是特征线性组合，业务方难以理解。
→ 改用特征选择（如基于树重要性），或对主成分做 Varimax 旋转。

**③ 特征量纲差异大且未标准化**

此时 PCA 会完全被大量纲特征主导。
→ 必须标准化，否则 PCA 失去意义。

**④ 数据稀疏且高维（如文本 TF-IDF）**

协方差矩阵接近奇异。
→ 用 TruncatedSVD（不必中心化，适合稀疏）。

**⑤ 特征本身已经很少**

3~5 个特征时降维收益有限，反而损失信息。

**⑥ 分类任务且特征是独立信息源**

如不同的传感器读数。PCA 会混合它们，可能损害判别能力。
→ 用 LDA 这类有监督降维（最大化类间/类内比）更合适。

**六、一句话总结**

> PCA 是**无监督的线性降维**，用"方差最大"作为"信息最多"的代理。
> 它快、简单、可解释性中等，但对非线性结构无能为力。`,
        rubric: [
          { point: '几何直觉（找方差最大方向）+ 为什么用方差', score: 2 },
          { point: '三步推导：中心化 → 协方差 → 特征分解', score: 2 },
          { point: '与 SVD 的对应关系 + 为什么用 SVD', score: 2 },
          { point: '选 k 的三种方法', score: 1 },
          { point: '不该用的场景（非线性、可解释、未标准化、稀疏、LDA）', score: 3 },
        ],
        keywords: ['方差最大化', '协方差矩阵', '特征分解', 'SVD', '累计贡献率', 'Swiss roll'],
        explanation:
          '能说清"与 SVD 的对应关系"和"瑞士卷为什么失败"，就同时掌握了数学本质与适用边界。',
        tags: ['PCA', '综合'],
      },
    ],
  },

  {
    id: 'mining-cluster-c4',
    title: '非线性降维与聚类评估',
    goal: '理解 t-SNE 与 UMAP 的原理与误用、掌握聚类有效性的三类评估指标。',
    lessons: [
      {
        id: 'mining-cluster-c4-l1',
        title: 't-SNE、UMAP 与聚类评估',
        difficulty: 5,
        content: `
### 学习目标

学完本节，你应该能够：
1. 用 t-SNE 可视化 digits 并演示 perplexity 对结果的影响；
2. 复述三大陷阱（簇间距离/簇大小/超参敏感）；
3. 用轮廓系数+ARI 定量评估聚类质量而非看图下结论。

### 前置知识

- c1~c3 全部；
- KL 散度的直观含义。

### 问题背景

PCA 只能找线性子空间，而真实高维数据常躺在弯曲流形上。t-SNE/UMAP 保留局部邻域结构用于可视化，但它们的三陷阱（簇间距无意义/簇大小无意义/超参敏感）让无数分析翻车——聚类评估（轮廓/ARI）才是产出质量的裁判。

### 直觉理解

t-SNE 像『只保证邻居不散伙』的搬家：高维里挨着的（高斯概率）低维里也要挨着，用重尾 t 分布把挤在市中心的人匀开（缓解拥挤）。代价是『两个小区间的距离』完全是编造的——不能读图上簇间远近。UMAP 是更快的同类，还多保留了些全局结构、支持 transform 新样本。

### 核心概念与原理详解

## 为什么需要非线性降维

PCA 只能找线性子空间。但真实的高维数据常位于**弯曲的低维流形**上。

**t-SNE 与 UMAP** 的目标：保留数据的**局部邻域结构**。

## t-SNE 的核心思想

**第一步：高维空间定义相似度**

用高斯核表示点对的相似度（条件概率）：

    p_{j|i} = exp(-||x_i - x_j||² / 2σ_i²) / Σ_{k≠i} exp(-||x_i - x_k||² / 2σ_i²)

**σ_i 由困惑度（perplexity）决定**——它控制"看多远的邻居"，
典型值 5~50。大困惑度 → 关注更多邻居 → 保留更多全局结构。

**第二步：低维空间用 t 分布**

    q_{ij} = (1 + ||y_i - y_j||²)^{-1} / Σ_{k≠l} (1 + ||y_k - y_l||²)^{-1}

**为什么用 t 分布（重尾）**：低维空间拥挤，用重尾分布让
"中等距离"的点在低维映射得更远，缓解**拥挤问题（crowding problem）**。

**第三步：最小化 KL 散度**

    KL(P || Q) = Σ p_{ij} log(p_{ij} / q_{ij})

用梯度下降优化低维坐标 y。

## t-SNE 的三个关键陷阱

**① 簇间距离没有意义**

t-SNE 只保留**局部**邻域。两个簇在图上离得远，不代表它们在原空间真的远。
**不能根据 t-SNE 图上簇的间距做判断。**

**② 簇的大小和密度没有意义**

t-SNE 会把稀疏区域"拉开"、密集区域"挤紧"。
**簇的面积不代表样本数**。

**③ 对超参数敏感**

perplexity、learning rate、迭代次数都会显著改变结果。
**换随机种子结果可能不同**——必须多跑几次确认稳定。

**④ 不能用于下游任务**

t-SNE 没有"变换新数据"的能力（sklearn 的 fit_transform 后无法 transform 新样本）。
它是**可视化工具**，不是特征工程工具。

## UMAP：更快的替代

**UMAP**（Uniform Manifold Approximation and Projection）基于**拓扑数据分析**：

- 用 k 近邻构建加权图（模糊单纯集）；
- 在低维空间优化图结构的相似度。

**相比 t-SNE 的优势**：

| 维度 | t-SNE | UMAP |
| --- | --- | --- |
| 速度 | 慢 | **快很多** |
| 全局结构 | 保留差 | **保留较好** |
| 新数据变换 | 不支持 | **支持 transform** |
| 稳定性 | 较敏感 | 相对稳定 |

**UMAP 的注意点**：
- 仍以局部结构为主，**簇间距离依然要谨慎解读**；
- \`n_neighbors\` 控制局部/全局平衡（类似 perplexity）；
- \`min_dist\` 控制低维点的紧凑程度。

**实践建议**：现在多数场景推荐 **UMAP 替代 t-SNE**（快、稳、可 transform）。

## 聚类评估：三类指标

**① 内部指标（无标签，只看聚类本身）**

| 指标 | 范围 | 含义 |
| --- | --- | --- |
| **轮廓系数** | [-1, 1] | 越大越好（簇内紧、簇间远） |
| **Davies-Bouldin** | [0, ∞) | **越小越好** |
| **Calinski-Harabasz** | [0, ∞) | **越大越好**（方差比） |

**轮廓系数**是最常用的，但计算 O(n²)，大数据要采样。

**② 外部指标（有真实标签）**

| 指标 | 说明 |
| --- | --- |
| **ARI**（调整兰德指数） | 修正了随机一致性的兰德指数，范围约 [-0.5, 1]，1 为完美 |
| **NMI**（归一化互信息） | [0, 1]，1 为完美 |
| **纯度 / F 值** | 需要簇与类别的匹配 |

**为什么用 ARI 而不是兰德指数**：兰德指数在随机聚类时也可能很高
（尤其类别不平衡时）。ARI 修正了这一点，随机结果期望为 0。

**③ 稳定性指标（最实用）**

**思路**：多次运行（不同种子/不同数据子集），看结果一致性。

    import numpy as np
    from sklearn.metrics import adjusted_rand_score

    scores = []
    for seed in range(10):
        # 不同种子/子采样
        labels_a = cluster(X, seed=seed)
        labels_b = cluster(X, seed=seed + 100)
        scores.append(adjusted_rand_score(labels_a, labels_b))

    print(f"稳定性 ARI = {np.mean(scores):.3f}")

**经验判据**：ARI > 0.8 说明聚类稳定；< 0.6 说明结果不可靠。

**稳定性比内部指标更可信**——内部指标可能被参数误导，
而稳定性直接回答"这个分群能否复现"。

## 一个实践组合

    1. 标准化
    2. 高维先 PCA 到 50 维（去噪 + 加速，t-SNE/UMAP 也建议先这样）
    3. 用 UMAP/t-SNE 降到 2 维可视化（只看结构，不做定量判断）
    4. 用 K-Means/HDBSCAN 在降维后的空间或原空间聚类
    5. 用内部指标 + 稳定性 + 业务可解释性三重验证

<DBSCANDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
from sklearn.datasets import load_digits
from sklearn.manifold import TSNE
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score, adjusted_rand_score
X, y = load_digits(return_X_y=True)
Xs, ys = X[:400], y[:400]
Z = TSNE(2, perplexity=30, random_state=0, init="pca").fit_transform(Xs)
lab = KMeans(10, n_init=10, random_state=0).fit_predict(Xs)
print(f"t-SNE 形状: {Z.shape} | 同一数据换 perplexity=5 结论可能不同（必须多跑）")
print(f"KMeans(k=10) 在原始 64 维: 轮廓系数 {silhouette_score(Xs, lab):.3f} | ARI vs 真实标签 {adjusted_rand_score(ys, lab):.2f}")
for p in (5, 30, 50):
    Zp = TSNE(2, perplexity=p, random_state=0, init="pca").fit_transform(Xs)
    print(f"perplexity={p}: 低维 KMeans ARI={adjusted_rand_score(ys, KMeans(10, n_init=5, random_state=0).fit_predict(Zp)):.2f}")\`\`\`

预期输出（实测）：t-SNE(400 样本) 可视化；原始 64 维 KMeans(10) 轮廓 0.233、ARI 0.75；perplexity=5/30/50 的低维 ARI 0.82/0.81/0.85（结论随超参漂移，必须多跑）。

**常见错误**：把 t-SNE 图上簇的大小当样本量、簇间距离当真实距离下结论；perplexity 用默认值不扫描，换个种子结论翻转；拿 t-SNE 的输出当特征喂给下游模型（应 UMAP 或直接用原特征）。

### 常见误区

1. **『t-SNE 图上分得开=真的可分』**——它几乎总能『挤出』簇状结构，必须配合定量指标；\\n2. **『t-SNE 可当特征工程』**——无 transform 能力，是可视化工具；\\n3. **『UMAP 完全取代 t-SNE』**——UMAP 更快且保全局更好，但同样是参数敏感的可视化工具。

### 知识关联

- **向前**：c1~c3 的聚类/PCA 产出是本章评估的对象；
- **向后**：mining-graph c3 的异常检测也依赖『邻域』概念；
- **平行**：llm-b1 的 embedding 可视化常误用 t-SNE 读簇间距离。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| t-SNE | 高斯 p + t 分布 q + KL 最小化 |
| 三陷阱 | 簇间距离/簇大小无意义、超参敏感 |
| UMAP | 更快、保全局略好、支持 transform |
| 定位 | 可视化工具，不是特征工程 |
| 评估 | 轮廓系数 / ARI / 业务可解释性 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Han, Kamber & Pei《数据挖掘：概念与技术》相应章节与 scikit-learn 官方文档）
`,
        tips: [
          {
            kind: 'interview',
            text: '「t-SNE 的簇间距离有意义吗」：没有。t-SNE 只保留局部邻域，簇的大小、密度、相对位置都不可靠解读。它纯粹是可视化工具。',
          },
          {
            kind: 'leak',
            text: 'UMAP 相比 t-SNE 更快、全局结构保留更好、支持 transform 新数据，多数场景推荐用 UMAP 替代。',
          },
          {
            kind: 'note',
            text: '稳定性指标（多 seed 跑聚类算 ARI）比内部指标更可信——它直接回答"这个分群能否复现"。ARI > 0.8 视为稳定。',
          },
        ],
        demos: [
          {
            title: 't-SNE vs UMAP 与聚类稳定性验证',
            lang: 'python',
            code: `import numpy as np
from sklearn.datasets import make_blobs
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score, adjusted_rand_score

# 高维数据：10 维、4 个簇
X, y_true = make_blobs(n_samples=600, n_features=10, centers=4,
                       cluster_std=1.8, random_state=0)
X = StandardScaler().fit_transform(X)
print(f"原始数据: {X.shape}")

# 先用 PCA 降到 50 维以下（这里 10 维已经很矮，直接降 2 维示意）
pca = PCA(n_components=5)
X_pca = pca.fit_transform(X)
print(f"PCA 降维后: {X_pca.shape}, 累计方差 {pca.explained_variance_ratio_.sum():.2%}")
print()

# ① 在 PCA 空间聚类并评估
km = KMeans(n_clusters=4, n_init=10, random_state=0)
labels = km.fit_predict(X_pca)
print("=== 聚类评估 ===")
print(f"  轮廓系数     = {silhouette_score(X_pca, labels):.4f}  （越大越好）")
print(f"  ARI vs 真实标签 = {adjusted_rand_score(y_true, labels):.4f}  （1 为完美）")
print()

# ② 稳定性验证：不同种子
print("=== 稳定性验证（不同随机种子）===")
ari_scores = []
base = KMeans(n_clusters=4, n_init=10, random_state=0).fit_predict(X_pca)
for seed in range(1, 6):
    other = KMeans(n_clusters=4, n_init=10, random_state=seed).fit_predict(X_pca)
    a = adjusted_rand_score(base, other)
    ari_scores.append(a)
    print(f"  seed=0 vs seed={seed}: ARI = {a:.4f}")
print(f"  平均稳定性 ARI = {np.mean(ari_scores):.4f}  （> 0.8 视为稳定）")
print()

# ③ t-SNE 可视化（仅看结构）
tsne = TSNE(n_components=2, perplexity=30, random_state=0, init="pca")
X_tsne = tsne.fit_transform(X_pca)
print("=== t-SNE 结果 ===")
print(f"  输出形状: {X_tsne.shape}")
print(f"  x 范围: [{X_tsne[:,0].min():.2f}, {X_tsne[:,0].max():.2f}]")
print()
print("注意：t-SNE 的簇间距离、簇大小都不可靠解读，仅用于看局部结构")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'mining-cluster-c4-e1',
        type: 'single',
        difficulty: 2,
        question: 't-SNE 图中两个簇相距很远，说明什么？',
        options: [
          { value: 'A', text: '它们在原空间中也很远' },
          { value: 'B', text: '它们在局部邻域结构上不同，但簇间距离本身不可靠解读' },
          { value: 'C', text: '它们一定是不同类别' },
          { value: 'D', text: '说明聚类效果很好' },
        ],
        answer: 'B',
        explanation:
          't-SNE 只保留局部邻域结构。簇间距离、簇的大小与密度都不可靠——它会把稀疏区拉开、密集区挤紧。t-SNE 是可视化工具，不能做定量判断。',
        tags: ['t-SNE 陷阱'],
      },
      {
        id: 'mining-cluster-c4-e2',
        type: 'judge',
        difficulty: 2,
        question: 't-SNE 可以直接用于下游任务（如对未来新数据降维后训练模型）。',
        answer: false,
        explanation:
          't-SNE 没有 transform 新数据的能力，且结果是随机的（对超参敏感）。它是纯可视化工具。若需要可变换的降维，用 PCA 或 UMAP。',
        tags: ['t-SNE 局限'],
      },
      {
        id: 'mining-cluster-c4-e3',
        type: 'multiple',
        difficulty: 3,
        question: 'UMAP 相比 t-SNE 的优势有？（多选）',
        options: [
          { value: 'A', text: '速度更快' },
          { value: 'B', text: '全局结构保留更好' },
          { value: 'C', text: '支持 transform 新数据' },
          { value: 'D', text: '簇间距离可以精确解读' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误——UMAP 仍以局部结构为主，簇间距离依然要谨慎。A/B/C 是它的三个实际优势，因此现在多数场景推荐 UMAP 替代 t-SNE。',
        tags: ['UMAP'],
      },
      {
        id: 'mining-cluster-c4-e4',
        type: 'fill',
        difficulty: 3,
        question: 't-SNE 中控制"看多远邻居"的超参数叫 ___（典型值 5~50）。',
        blanks: [['困惑度', 'perplexity', 'Perplexity']],
        explanation:
          '困惑度（perplexity）决定每个点的高斯核宽度 σ。大困惑度关注更多邻居、保留更多全局结构；小困惑度只关注最近的几个邻居。',
        tags: ['perplexity'],
      },
      {
        id: 'mining-cluster-c4-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现 Davies-Bouldin 指数的核心：簇间距离与簇内散度的比。\n\n实现 `db_score_part(cluster_a, cluster_b, centroid_a, centroid_b)`，\n返回 (S_a + S_b) / d(centroid_a, centroid_b)，其中 S 是簇内点到质心的平均距离。结果保留 4 位小数。',
        starterCode: `import numpy as np

def db_score_part(cluster_a, cluster_b, ca, cb):
    ca = np.asarray(ca, dtype=float)
    cb = np.asarray(cb, dtype=float)
    s_a = ___
    s_b = ___
    d = ___
    return round((s_a + s_b) / d, 4)
`,
        setupCode:
          'import numpy as np\nA = np.array([[0,0],[0.2,0]])\nB = np.array([[5,0],[5.2,0]])\nca = np.array([0.1,0])\ncb = np.array([5.1,0])',
        expectedOutput: '越小越好',
        tests: `import numpy as np
A = np.array([[0,0],[0.2,0]], dtype=float)
B = np.array([[5,0],[5.2,0]], dtype=float)
ca, cb = np.array([0.1,0]), np.array([5.1,0])
v = db_score_part(A, B, ca, cb)
assert v > 0, "得分应为正"
assert v < 0.2, f"分得很开的簇得分应很小，实际 {v}"
# 簇重叠时得分变大
A2 = np.array([[0,0],[0.2,0]], dtype=float)
B2 = np.array([[0.3,0],[0.5,0]], dtype=float)
ca2, cb2 = np.array([0.1,0]), np.array([0.4,0])
v2 = db_score_part(A2, B2, ca2, cb2)
assert v2 > v, f"重叠簇得分应更大: {v2} vs {v}"
`,
        answer: `import numpy as np

def db_score_part(cluster_a, cluster_b, ca, cb):
    ca = np.asarray(ca, dtype=float)
    cb = np.asarray(cb, dtype=float)
    s_a = float(np.mean(np.linalg.norm(np.asarray(cluster_a) - ca, axis=1)))
    s_b = float(np.mean(np.linalg.norm(np.asarray(cluster_b) - cb, axis=1)))
    d = float(np.linalg.norm(ca - cb))
    return round((s_a + s_b) / d, 4)
`,
        explanation:
          'Davies-Bouldin 的直觉：**簇内越散、簇间越近，得分越高（越差）**。\n\n完整算法对每个簇找"最相似的另一个簇"，取比值最大者，再对所有簇求平均。\n\n**注意 d 可能为 0**（两个质心重合），生产代码要加保护。',
        tags: ['编程', 'DB 指数'],
      },
      {
        id: 'mining-cluster-c4-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现聚类稳定性验证：stability_ari(runs)。\n\nruns 是多次聚类得到的标签列表（每次是一个标签数组）。\n两两计算 ARI（简化版：用交集/并集比例近似），返回平均值保留 4 位小数。',
        starterCode: `import numpy as np

def pair_agreement(a, b):
    """简化的一致性度量：同簇对的比例。"""
    a = np.asarray(a)
    b = np.asarray(b)
    agree = 0
    total = 0
    for i in range(len(a)):
        for j in range(i+1, len(a)):
            total += 1
            if (a[i] == a[j]) == (b[i] == b[j]):
                agree += 1
    return agree / total if total else 1.0

def stability_ari(runs):
    scores = []
    ___
    return round(float(np.mean(scores)), 4) if scores else 1.0
`,
        setupCode:
          'import numpy as np\nruns = [np.array([0,0,1,1]), np.array([1,1,0,0]), np.array([0,0,1,1])]',
        expectedOutput: '接近 1（结果一致）',
        tests: `import numpy as np
# 完全一致（标签名不同但分组相同）
runs1 = [np.array([0,0,1,1]), np.array([1,1,0,0]), np.array([0,0,1,1])]
s1 = stability_ari(runs1)
assert s1 > 0.99, f"分组完全一致应接近 1，实际 {s1}"
# 完全不一致
runs2 = [np.array([0,0,1,1]), np.array([0,1,0,1])]
s2 = stability_ari(runs2)
assert s2 < 0.7, f"分组不同应较低，实际 {s2}"
# 只有一次运行
assert stability_ari([np.array([0,0,1])]) == 1.0
`,
        answer: `import numpy as np

def pair_agreement(a, b):
    a = np.asarray(a)
    b = np.asarray(b)
    agree = 0
    total = 0
    for i in range(len(a)):
        for j in range(i+1, len(a)):
            total += 1
            if (a[i] == a[j]) == (b[i] == b[j]):
                agree += 1
    return agree / total if total else 1.0

def stability_ari(runs):
    scores = []
    for i in range(len(runs)):
        for j in range(i+1, len(runs)):
            scores.append(pair_agreement(runs[i], runs[j]))
    return round(float(np.mean(scores)), 4) if scores else 1.0
`,
        explanation:
          '这里用"**同簇对是否一致**"近似 ARI——这是兰德指数的核心思想。\n\n真实 ARI 还要做随机性修正（减去随机期望），但思路一致。\n\n**稳定性是聚类最实用的验证指标**：内部指标可能被参数误导，稳定性直接回答"能否复现"。',
        tags: ['编程', '稳定性'],
      },
      {
        id: 'mining-cluster-c4-e7',
        type: 'judge',
        difficulty: 3,
        question: 't-SNE 图中簇的面积大小反映了该簇的真实样本数量。',
        answer: false,
        explanation:
          't-SNE 会把稀疏区域"拉开"、密集区域"挤紧"，簇的面积与真实样本数不相关。这是 t-SNE 最常被误读的一点。',
        tags: ['t-SNE 陷阱'],
      },
      {
        id: 'mining-cluster-c4-e8',
        type: 'single',
        difficulty: 3,
        question: '为什么用 ARI（调整兰德指数）而不是普通兰德指数？',
        options: [
          { value: 'A', text: 'ARI 计算更快' },
          { value: 'B', text: 'ARI 修正了随机聚类的一致性，随机结果期望为 0' },
          { value: 'C', text: 'ARI 范围更大' },
          { value: 'D', text: '两者等价' },
        ],
        answer: 'B',
        explanation:
          '普通兰德指数在随机聚类时也可能得到较高值（尤其类别不平衡时）。ARI 减去了随机期望并归一化，使随机聚类得分为 0，更能反映真实一致程度。',
        tags: ['ARI'],
      },
      {
        id: 'mining-cluster-c4-e9',
        type: 'multiple',
        difficulty: 3,
        question: '下列哪些是内部聚类评估指标？（多选）',
        options: [
          { value: 'A', text: '轮廓系数' },
          { value: 'B', text: 'Davies-Bouldin 指数' },
          { value: 'C', text: 'Calinski-Harabasz 指数' },
          { value: 'D', text: 'ARI（调整兰德指数）' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 是外部指标，需要真实标签。内部指标只用聚类结果本身评估（簇内紧密度 vs 簇间分离度），不需要标签。',
        tags: ['评估指标'],
      },
      {
        id: 'mining-cluster-c4-e10',
        type: 'open',
        difficulty: 5,
        question:
          '一个团队用 t-SNE 把 512 维用户 embedding 降到 2 维，看到 5 个明显的簇，于是在原空间用 K-Means 分 5 群并直接用于运营。请指出这种做法中的问题，并给出正确流程。',
        referenceAnswer: `**一、做法中的四个问题**

**① 用 t-SNE 图上的簇数直接决定 k**

t-SNE 只保留**局部**邻域结构。图上看到的"5 个簇"可能：
- 是一个大簇被拆成了几块（t-SNE 的随机性导致）；
- 是真实簇数不是 5（可能 3 个也可能 8 个）；
- 换 perplexity 或随机种子后变成 4 个或 7 个。

**簇间距离、簇大小、簇数量在 t-SNE 上都不可靠。**

**② 把 t-SNE 的"视觉聚类"当作客观结论**

t-SNE 有强制的"分离倾向"——它会让不相似的组在低维离得更远，
即使原空间中它们是连续渐变的。这会**制造出并不存在的边界**。

**③ 忽略了 embedding 本身的特性**

512 维 embedding 的各维通常**已经过训练、各维语义不独立**，
且常有各向异性（方差集中在少数方向）。直接 K-Means 效果未必好。

**④ 没有做任何验证**

没有内部指标、没有稳定性检验、没有业务可解释性审核，
直接拿去运营风险很高。

**二、正确流程**

**第 1 步：先用定量方法定 k**

- 在**原空间**（或 PCA 降到 50 维后）计算 SSE 与轮廓系数；
- 画肘部图 + 轮廓系数曲线，选出 2~3 个候选 k；
- **不要**依赖 t-SNE 图数簇。

**第 2 步：正确的降维顺序**

    512 维
      ↓ PCA 降到 50 维（去噪、加速，保留主要方差）
      ↓ UMAP/t-SNE 降到 2 维（仅用于可视化）
      
    聚类在 50 维空间做，不在 2 维做。

**为什么**：2 维丢失了太多信息，聚类结果会严重失真。

**第 3 步：聚类 + 多指标验证**

- 用 K-Means / HDBSCAN 在 50 维空间聚类；
- **内部指标**：轮廓系数、DB 指数、CH 指数；
- **稳定性**：不同 seed 跑 10 次，算平均 ARI（要求 > 0.8）；
- **业务可解释**：每个簇的特征画像能否用一句话描述？

**第 4 步：用 t-SNE/UMAP 只做展示**

- 画图时用**聚类标签着色**（而不是让 t-SNE 自己决定簇）；
- 图只用于"给业务方直观感受"，不做定量判断；
- 同时用 perplexity=5/30/50 各画一次，确认结构稳定。

**第 5 步：业务验证**

- 各簇的特征画像对比（ANOVA/t 检验确认差异显著）；
- **下游验证**：把簇标签作为特征训练业务模型（如转化预测），
  若带来提升说明分群有信息量；
- 运营试验：对不同簇采用不同策略，做 A/B 看效果。

**三、一个关键提醒**

**embedding 上的聚类不一定要用欧氏距离。**

如果 embedding 来自对比学习（如 sentence-transformers），
通常应先**归一化到单位球**，再用余弦相似度/球面 K-Means。
这往往比直接欧氏距离效果好很多。

**四、总结对比**

| 错误做法 | 正确做法 |
| --- | --- |
| t-SNE 数簇定 k | 肘部法 + 轮廓系数定 k |
| 在 2 维上聚类 | 在 50 维上聚类，2 维只可视化 |
| 只有一张图 | 内部指标 + 稳定性 + 业务解释 |
| 直接上线 | 下游验证 + A/B 实验 |
| 直接欧氏距离 | 先归一化，考虑余弦/球面聚类 |`,
        rubric: [
          { point: '指出 t-SNE 的簇数/间距/大小不可靠', score: 3 },
          { point: '指出 2 维聚类失真，应在高维聚类', score: 2 },
          { point: '正确流程：定量定 k + 多指标验证 + 稳定性', score: 3 },
          { point: 'embedding 应先归一化，考虑余弦距离', score: 1 },
          { point: '业务验证：下游任务 + A/B', score: 1 },
        ],
        keywords: ['局部结构', 'perplexity', '2 维失真', '稳定性 ARI', '余弦距离', '下游验证'],
        explanation:
          '这道题综合了 t-SNE 的陷阱与聚类验证方法论。能指出"t-SNE 会制造不存在的边界"与"必须在高维聚类"，就抓住了核心。',
        tags: ['降维实战', '综合'],
      },
    ],
  },
];
