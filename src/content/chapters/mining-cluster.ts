import type { Chapter } from '../../types';

/* 数据挖掘 · M3 聚类与降维（骨架，后续补全） */
export const miningClusterChapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'mining-cluster-c1',
    title: 'K-Means：最常用的聚类算法',
    goal: '理解 K-Means 的迭代机制、初始化问题与 k 的选择方法。',
    lessons: [
      {
        id: 'mining-cluster-c1-l1',
        title: 'K-Means 的迭代与收敛',
        difficulty: 3,
        content: `
### 学习目标

学完本节，你应该能够：
1. 手写 K-Means 两步交替并验证 SSE 单调不增；
2. 用不同随机种子实测局部最优现象与 K-Means++ 的作用；
3. 用肘部法+轮廓系数联合选 k，并说明业务可解释性的权重。

### 前置知识

- numpy 基础；
- 距离与方差概念。

### 问题背景

没有标签时怎么发现结构？K-Means 用『质心代表一簇』给出最简单也最常用的答案：两步交替必然收敛（SSE 单调不增），但收敛到局部最优——初始化（K-Means++）与 k 的选择决定成败。

### 直觉理解

K-Means 像圈地建邮局：先猜 k 个邮局位置（质心），居民都去最近的邮局（分配步），再把邮局搬到辖区内居民的正中心（更新步）；反复几轮家家户户就近，SSE 一轮比一轮小。但邮局可能挤在半山腰（局部最优）——K-Means++ 让新邮局离已有的越远越可能被选中。

### 核心概念与原理详解

## 聚类在解决什么问题

**没有标签**的时候，怎么发现数据里的结构？
聚类就是把"相似的样本"分到一组。

**K-Means 的核心假设**：一个簇可以用**质心（centroid）**代表，
样本属于离它最近的质心。

## 算法：两步交替

    # 输入：数据 X，簇数 k
    1. 随机初始化 k 个质心 μ1..μk
    2. 重复直到收敛：
       a. 分配：每个点分配给最近的质心
          c_i = argmin_j ||x_i - μ_j||²
       b. 更新：质心 = 所属点的均值
          μ_j = mean{x_i : c_i = j}

<KMeansStep />

## 为什么一定会收敛

每一轮都在**降低目标函数**（簇内平方和 SSE）：

    SSE = Σ_j Σ_{x ∈ C_j} ||x - μ_j||²

- **分配步**：固定质心，每个点选最近的 → SSE 不增；
- **更新步**：固定分配，均值是使 SSE 最小的点（可求导验证）→ SSE 不增。

SSE 单调不增且有下界（≥ 0），所以必然收敛。

**但收敛到的可能是局部最优**，不是全局最优。这就是初始化重要的原因。

## 初始化：K-Means++

随机初始化可能选到很差的起点（如两个质心几乎重合）。

**K-Means++ 的策略**：
1. 随机选第一个质心；
2. 之后每个质心以**与已有质心距离平方成正比**的概率选择；
3. 这样质心倾向于分散，不易撞在一起。

**实践**：sklearn 默认就是 k-means++，且跑 10 次取 SSE 最小的。

## 怎么选 k

| 方法 | 做法 | 局限 |
| --- | --- | --- |
| **肘部法** | 画 SSE vs k 曲线，找"拐点" | 拐点常不明显 |
| **轮廓系数** | 衡量簇内紧密度 vs 簇间分离度 | 计算成本 O(n²) |
| **业务可解释性** | k 要能对应真实业务分组 | 最实用 |

**轮廓系数**：

    s(i) = (b(i) - a(i)) / max(a(i), b(i))

- a(i)：点 i 到同簇其他点的平均距离；
- b(i)：点 i 到最近其他簇的平均距离。

取值 [-1, 1]，越接近 1 越好。

## K-Means 的三个局限

**① 假设簇是球形且大小相近**

K-Means 用欧氏距离，隐含假设簇是各向同性的球。
遇到月牙形、环形分布会失败。

**解法**：DBSCAN（密度聚类）、谱聚类。

**② 对异常值敏感**

质心是均值，一个极端值会把质心拉偏。

**解法**：K-Medoids（用真实点作中心）、先剔除异常值。

**③ 必须预先指定 k**

**解法**：层次聚类（可看树状图定 k）、DBSCAN（自动决定簇数）。

## 一个工程细节：必须标准化

K-Means 基于距离，**量纲不同的特征会主导结果**：

    年龄 20~60，收入 3000~50000
    → 收入的差异远大于年龄，聚类几乎只看收入

**必须先标准化**（Z-score 或 Min-Max）。
这是实践中最常被忘记的一步。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
rng = np.random.default_rng(0)
X = np.r_[rng.normal([0,0], 0.6, (80,2)), rng.normal([4,4], 0.6, (80,2)), rng.normal([0,5], 0.6, (80,2))]
def kmeans(X, k, iters=50, seed=0):
    rng = np.random.default_rng(seed)
    c = X[rng.choice(len(X), k, replace=False)]
    sse_hist = []
    for _ in range(iters):
        d = ((X[:,None,:]-c[None])**2).sum(-1)
        lab = d.argmin(1); sse = d[np.arange(len(X)), lab].sum()
        sse_hist.append(sse)
        c = np.array([X[lab==j].mean(0) if (lab==j).any() else c[j] for j in range(k)])
    return lab, c, sse_hist
for seed in (0, 1, 2):
    lab, c, h = kmeans(X, 3, seed=seed)
    print(f"seed={seed}: 最终 SSE={h[-1]:.1f} 单调不增={all(h[i+1]<=h[i]+1e-9 for i in range(len(h)-1))}")
# 肘部法与轮廓系数（每个 k 跑 5 个种子取最优 = sklearn n_init 实践）
from sklearn.metrics import silhouette_score
for k in (2, 3, 4, 5):
    best = min((kmeans(X, k, seed=sd) for sd in range(5)), key=lambda r: r[2][-1])
    lab, c, h = best
    print(f"k={k}: 最优 SSE={h[-1]:7.1f} | 轮廓系数={silhouette_score(X, lab):.3f}")\`\`\`

预期输出（实测）：K-Means 不同种子：SSE 1147.5 / 177.0 / 818.6（局部最优确实存在，SSE 均单调不增）；肘部+轮廓（5 种子取最优）：k=2 SSE 839/轮廓 0.601，k=3 SSE 177/0.749（峰值），k=4 155/0.607，k=5 134/0.460 → 选 k=3。

**常见错误**：随机初始化两个质心几乎重合，收敛到坏解（应 K-Means++ + n_init 多次）；k 用肘部法硬找拐点（不明显时改轮廓系数/业务解释）；在未缩放的特征上直接聚类，量纲大的特征主导距离。

### 常见误区

1. **『K-Means 一定能找到真实分组』**——它只能找凸球形簇，对环形/月牙形束手无策（换 DBSCAN）；\\n2. **『收敛=全局最优』**——只是局部最优，结果依赖初始化；\\n3. **『k 越大 SSE 越小所以 k 越好』**——k=n 时 SSE=0 毫无意义，要配合轮廓系数与业务。

### 知识关联

- **向前**：mining-prep c2 的缩放是本章的必要前置；
- **向后**：c2 的层次/密度聚类补足 K-Means 的三个硬伤；
- **平行**：llm-b1 的向量检索同样是『找最近邻』的几何游戏。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 两步 | 分配（就近）→ 更新（均值），SSE 单调不增 |
| 收敛 | 局部最优，K-Means++ + n_init=10 |
| 选 k | 肘部法 / 轮廓系数 / 业务可解释性 |
| 假设 | 簇是凸球形、各簇方差相近 |
| 前置 | 必须先缩放 |

### 权威学术与经典教材来源

> **来源类型：国际经典教材 · 顶级大学公开课程 (A 类)**
> - Jiawei Han, Micheline Kamber, & Jian Pei (2011). *Data Mining: Concepts and Techniques* (3rd ed.). Morgan Kaufmann / University of Illinois at Urbana-Champaign (UIUC). (计算机学会经典数据挖掘教材)
> - Jure Leskovec, Anand Rajaraman, & Jeffrey D. Ullman (2020). *Mining of Massive Datasets* (3rd ed.). Cambridge University Press / Stanford CS246. (大规模图挖掘、流数据处理与频繁项集)
`,
        tips: [
          {
            kind: 'interview',
            text: '「K-Means 一定会收敛吗」：会。分配步与更新步都单调降低 SSE，且 SSE 有下界。但可能收敛到局部最优，所以需要 k-means++ 与多次重启。',
          },
          {
            kind: 'leak',
            text: 'K-Means 假设簇是球形、大小相近、对异常值敏感。遇到月牙形分布要换 DBSCAN。',
          },
          {
            kind: 'pitfall',
            text: 'K-Means 基于距离，必须标准化特征。否则量纲大的特征会完全主导聚类结果——这是最常见的实操错误。',
          },
        ],
        demos: [
          {
            title: '手写 K-Means 与 K-Means++',
            lang: 'python',
            code: `import numpy as np

def kmeans_pp_init(X, k, rng):
    """K-Means++ 初始化：每个新质心按距离平方概率选。"""
    centroids = [X[rng.integers(len(X))]]
    for _ in range(1, k):
        d2 = np.min([np.sum((X - c) ** 2, axis=1) for c in centroids], axis=0)
        probs = d2 / d2.sum()
        centroids.append(X[rng.choice(len(X), p=probs)])
    return np.array(centroids)

def kmeans(X, k, max_iter=100, seed=0):
    rng = np.random.default_rng(seed)
    C = kmeans_pp_init(X, k, rng)
    history = []
    for it in range(max_iter):
        # ① 分配
        d = np.linalg.norm(X[:, None, :] - C[None, :, :], axis=2)
        labels = d.argmin(axis=1)
        sse = float(np.sum(d[np.arange(len(X)), labels] ** 2))
        history.append(sse)
        # ② 更新
        newC = np.array([X[labels == j].mean(axis=0) if np.any(labels == j) else C[j] for j in range(k)])
        if np.allclose(newC, C):
            print(f"  第 {it + 1} 轮收敛（质心不再移动）")
            break
        C = newC
    return labels, C, history

rng = np.random.default_rng(42)
# 三团数据
X = np.vstack([
    rng.normal([0, 0], 1, (50, 2)),
    rng.normal([5, 5], 1, (50, 2)),
    rng.normal([0, 6], 1, (50, 2)),
])

labels, centers, hist = kmeans(X, 3)
print("质心:")
for i, c in enumerate(centers):
    print(f"  簇{i}: ({c[0]:.2f}, {c[1]:.2f})  样本数={np.sum(labels == i)}")
print(f"\\nSSE 下降过程: {[round(h, 1) for h in hist]}")

# 对比不同 k 的 SSE
print("\\n=== 肘部法 ===")
for k in range(1, 7):
    _, _, h = kmeans(X, k, seed=1)
    print(f"  k={k}: SSE={h[-1]:.1f}")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'mining-cluster-c1-e1',
        relatedLessonId: 'mining-cluster-c1-l1',
        type: 'single',
        difficulty: 2,
        question: 'K-Means 一定能收敛的原因是？',
        options: [
          { value: 'A', text: '数据量有限' },
          { value: 'B', text: '分配步与更新步都单调不增 SSE，且 SSE 有下界' },
          { value: 'C', text: '质心数量固定' },
          { value: 'D', text: '随机初始化保证' },
        ],
        answer: 'B',
        explanation:
          '两步都让 SSE 不增，SSE ≥ 0 有下界，所以必然收敛。但可能收敛到局部最优——这就是需要 k-means++ 和多次重启的原因。',
        tags: ['收敛性'],
      },
      {
        id: 'mining-cluster-c1-e2',
        relatedLessonId: 'mining-cluster-c1-l1',
        type: 'judge',
        difficulty: 2,
        question: 'K-Means 适合发现任意形状的簇（如环形、月牙形）。',
        answer: false,
        explanation:
          'K-Means 用欧氏距离，隐含假设簇是球形且大小相近。环形、月牙形分布用 DBSCAN 或谱聚类更合适。',
        tags: ['K-Means 局限'],
      },
      {
        id: 'mining-cluster-c1-e3',
        relatedLessonId: 'mining-cluster-c1-l1',
        type: 'multiple',
        difficulty: 3,
        question: '使用 K-Means 时必须注意哪些问题？（多选）',
        options: [
          { value: 'A', text: '特征必须先标准化，否则量纲大的特征会主导结果' },
          { value: 'B', text: '需要预先指定簇数 k' },
          { value: 'C', text: '对异常值敏感（质心是均值）' },
          { value: 'D', text: '需要标签数据' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误——聚类是无监督方法，不需要标签。A/B/C 都是 K-Means 的实际约束，A 尤其常见（忘记标准化导致聚类只看一个特征）。',
        tags: ['实践要点'],
      },
      {
        id: 'mining-cluster-c1-e4',
        relatedLessonId: 'mining-cluster-c1-l1',
        type: 'fill',
        difficulty: 3,
        question: 'K-Means++ 初始化时，新质心以与已有质心距离的 ___ 成正比概率被选中。',
        blanks: [['平方', '平方和', '距离平方', '平方距离']],
        explanation:
          '用距离平方而非距离本身，是为了进一步偏好远处的点，让质心更分散。这能显著降低收敛到坏局部最优的概率。',
        tags: ['K-Means++'],
      },
      {
        id: 'mining-cluster-c1-e5',
        relatedLessonId: 'mining-cluster-c1-l1',
        type: 'code',
        difficulty: 2,
        question:
          '实现单步分配：assign_clusters(X, centroids)。\n\n返回每个点到最近质心的索引（list）。用 numpy。',
        starterCode: `import numpy as np

def assign_clusters(X, centroids):
    d = ___
    return ___
`,
        setupCode:
          'import numpy as np\nX = np.array([[0,0],[1,1],[10,10]])\ncentroids = np.array([[0,0],[10,10]])',
        expectedOutput: '[0, 0, 1]',
        tests: `import numpy as np
X = np.array([[0,0],[1,1],[10,10]])
C = np.array([[0,0],[10,10]])
out = assign_clusters(X, C)
assert list(out) == [0,0,1], f"应为 [0,0,1]，实际 {list(out)}"
# 单质心
assert list(assign_clusters(X, np.array([[5,5]]))) == [0,0,0]
# 三质心
C3 = np.array([[0,0],[1,1],[10,10]])
assert list(assign_clusters(X, C3)) == [0,1,2]
`,
        answer: `import numpy as np

def assign_clusters(X, centroids):
    d = np.linalg.norm(X[:, None, :] - centroids[None, :, :], axis=2)
    return d.argmin(axis=1)
`,
        explanation:
          '`X[:, None, :] - centroids[None, :, :]` 用广播算出 n×k×d 的距离张量，再在 k 维上取 argmin。\n\n这是 K-Means 的分配步，也是全流程中重复次数最多的一步——它的效率决定了整体速度。',
        tags: ['编程', '分配步'],
      },
      {
        id: 'mining-cluster-c1-e6',
        relatedLessonId: 'mining-cluster-c1-l1',
        type: 'code',
        difficulty: 3,
        question:
          '计算 SSE（簇内平方和）：compute_sse(X, labels, centroids)，保留 4 位小数。',
        starterCode: `import numpy as np

def compute_sse(X, labels, centroids):
    total = ___
    return round(total, 4)
`,
        setupCode:
          'import numpy as np\nX = np.array([[0,0],[1,1],[10,10]])\nlabels = np.array([0,0,1])\ncentroids = np.array([[0.5,0.5],[10,10]])',
        expectedOutput: '1.0',
        tests: `import numpy as np
X = np.array([[0,0],[1,1],[10,10]])
lab = np.array([0,0,1])
C = np.array([[0.5,0.5],[10,10]])
assert abs(compute_sse(X, lab, C) - 1.0) < 1e-6, f"应为 1.0，实际 {compute_sse(X,lab,C)}"
# 质心正好在点上 -> SSE=0
C2 = np.array([[0.5,0.5],[10,10]])
X2 = np.array([[0.5,0.5],[10,10]])
assert abs(compute_sse(X2, np.array([0,1]), C2)) < 1e-9
`,
        answer: `import numpy as np

def compute_sse(X, labels, centroids):
    total = float(np.sum((X - centroids[labels]) ** 2))
    return round(total, 4)
`,
        explanation:
          '`centroids[labels]` 是 numpy 的花式索引——把每个点的所属质心取出来，与 X 相减后平方求和。\n\nSSE 是 K-Means 的目标函数，也是肘部法的纵轴。',
        tags: ['编程', 'SSE'],
      },
      {
        id: 'mining-cluster-c1-e7',
        relatedLessonId: 'mining-cluster-c1-l1',
        type: 'judge',
        difficulty: 3,
        question: 'K-Means 的轮廓系数取值范围是 [0, 1]，越接近 1 说明聚类质量越好。',
        answer: false,
        explanation:
          '轮廓系数范围是 **[-1, 1]**，不是 [0, 1]。负值表示样本更适合归到别的簇（可能被分错了）。越接近 1 越好。',
        tags: ['轮廓系数'],
      },
      {
        id: 'mining-cluster-c1-e8',
        relatedLessonId: 'mining-cluster-c1-l1',
        type: 'single',
        difficulty: 3,
        question: '数据中年龄范围 20~60、收入范围 3000~50000，直接做 K-Means 会出现什么问题？',
        options: [
          { value: 'A', text: '无法收敛' },
          { value: 'B', text: '收入特征会主导距离计算，聚类几乎只按收入分组' },
          { value: 'C', text: '质心数量会变化' },
          { value: 'D', text: 'SSE 会变负' },
        ],
        answer: 'B',
        explanation:
          'K-Means 基于欧氏距离。收入的数值范围比年龄大 1000 倍，距离几乎完全由收入决定。必须先标准化（Z-score 或 Min-Max）。',
        tags: ['标准化'],
      },
      {
        id: 'mining-cluster-c1-e9',
        relatedLessonId: 'mining-cluster-c1-l1',
        type: 'code',
        difficulty: 3,
        question:
          '实现轮廓系数计算（简化版）：silhouette_simple(X, labels, idx)，计算第 idx 个点的轮廓系数。\n\n- a = 到同簇其他点的平均距离\n- b = 到最近其他簇所有点的平均距离\n- 返回 (b - a) / max(a, b)，保留 4 位小数',
        starterCode: `import numpy as np

def silhouette_simple(X, labels, idx):
    labels = np.asarray(labels)
    same = ___
    a = ___
    b = float("inf")
    for lab in set(labels):
        if lab == labels[idx]:
            continue
        other = X[labels == lab]
        dist = ___
        b = min(b, dist)
    return round((b - a) / max(a, b), 4) if max(a, b) > 0 else 0.0
`,
        setupCode:
          'import numpy as np\nX = np.array([[0,0],[0.1,0],[10,10],[10.1,10]])\nlabels = np.array([0,0,1,1])',
        expectedOutput: '接近 1 的高分',
        tests: `import numpy as np
X = np.array([[0,0],[0.1,0],[10,10],[10.1,10]])
lab = np.array([0,0,1,1])
s = silhouette_simple(X, lab, 0)
assert s > 0.9, f"分得很开的簇，轮廓系数应接近 1，实际 {s}"
# 混在一起的点分数会低
X2 = np.array([[0,0],[1,0],[2,0],[3,0]])
lab2 = np.array([0,0,1,1])
s2 = silhouette_simple(X2, lab2, 0)
assert s2 < s, "重叠数据分数应更低"
`,
        answer: `import numpy as np

def silhouette_simple(X, labels, idx):
    labels = np.asarray(labels)
    same = X[(labels == labels[idx]) & (np.arange(len(X)) != idx)]
    a = float(np.mean(np.linalg.norm(same - X[idx], axis=1))) if len(same) else 0.0
    b = float("inf")
    for lab in set(labels):
        if lab == labels[idx]:
            continue
        other = X[labels == lab]
        dist = float(np.mean(np.linalg.norm(other - X[idx], axis=1)))
        b = min(b, dist)
    return round((b - a) / max(a, b), 4) if max(a, b) > 0 else 0.0
`,
        explanation:
          '轮廓系数的直觉：**(簇间距离 - 簇内距离) / 较大者**。\n\n- 点离同簇很近（a 小）、离别的簇很远（b 大）→ 分数接近 1；\n- 点在两簇边界上（a ≈ b）→ 分数接近 0；\n- 点其实更适合别的簇（a > b）→ 分数为负。\n\n完整实现要对所有点求均值，时间复杂度 O(n²)。',
        tags: ['编程', '轮廓系数'],
      },
      {
        id: 'mining-cluster-c1-e10',
        relatedLessonId: 'mining-cluster-c1-l1',
        type: 'open',
        difficulty: 4,
        question:
          '请完整说明 K-Means 算法：迭代过程、为什么收敛、三个主要局限及对应解法，并给出实际项目中的使用建议。',
        referenceAnswer: `**一、迭代过程**

输入数据 X 与簇数 k：

1. **初始化**：k-means++ 选 k 个质心（按距离平方概率分散选取）；
2. **分配步**：每个点分配给最近的质心；
3. **更新步**：质心 = 所属点的均值；
4. 重复 2-3 直到质心不再移动或达到最大迭代数。

目标函数（SSE）：

    SSE = Σ_j Σ_{x ∈ C_j} ||x - μ_j||²

**二、为什么收敛**

- 分配步：固定质心，每个点选最近的 → SSE 不增；
- 更新步：固定分配，均值是使 SSE 最小的点 → SSE 不增；
- SSE ≥ 0 有下界；
- 单调有界序列必收敛。

**但收敛到的是局部最优**（SSE 是 K-Means 意义下的局部最小），
所以需要 k-means++ 与多次重启取最优。

**三、三个主要局限与解法**

**① 假设簇是球形、大小相近**

原因：用欧氏距离，隐含各向同性。
解法：DBSCAN（密度）、谱聚类（图划分）、GMM（椭圆簇）。

**② 对异常值敏感**

原因：质心是均值，极端值会拉偏。
解法：K-Medoids（用真实点作中心）、先剔除异常值、用中位数版本。

**③ 必须预先指定 k**

解法：肘部法、轮廓系数、业务可解释性；
或改用层次聚类（看树状图）、DBSCAN（自动定簇数）。

**四、实际项目使用建议**

1. **必须标准化**：量纲不同会让某个特征完全主导距离。用 Z-score 或 RobustScaler（有异常值时）；
2. **多次重启**：n_init ≥ 10，取 SSE 最小的结果，降低局部最优影响；
3. **k 的选择要结合业务**：统计指标给参考，最终要能解释成有意义的群体；
4. **先处理异常值**：否则质心会被拉偏；
5. **高维要谨慎**：维度灾难下距离失去区分度，先降维（PCA）再聚类；
6. **结果要可解释**：输出每个簇的质心画像（各特征的均值），让业务方判断是否合理。

**五、一个常见误区**

不要只看 SSE 下降就认为聚类变好——SSE 随 k 增加必然下降，
k = n 时 SSE = 0。所以不能用 SSE 直接选 k，要用肘部法或轮廓系数。`,
        rubric: [
          { point: '完整迭代流程 + SSE 目标函数', score: 2 },
          { point: '正确解释收敛性（两步单调不增 + 有下界）与局部最优', score: 2 },
          { point: '三个局限及对应解法（形状/异常值/k）', score: 3 },
          { point: '实践建议：标准化、多次重启、业务解释', score: 2 },
          { point: '指出 SSE 不能直接用于选 k', score: 1 },
        ],
        keywords: ['SSE', '单调收敛', '局部最优', 'k-means++', 'DBSCAN', '标准化'],
        explanation:
          '能同时说清"为什么收敛"与"为什么只是局部最优"，并给出对应实践建议，就完整掌握了 K-Means。',
        tags: ['K-Means', '综合'],
      },
    ],
  },
];
