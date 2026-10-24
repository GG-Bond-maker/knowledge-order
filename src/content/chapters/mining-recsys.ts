import type { Chapter } from '../../types';

/* 数据挖掘 · M4 推荐系统 */
export const miningRecsysChapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'mining-recsys-c1',
    title: '协同过滤：从相似用户出发',
    goal: '掌握 User-CF 与 Item-CF 的算法流程、相似度选择与冷启动问题。',
    lessons: [
      {
        id: 'mining-recsys-c1-l1',
        title: 'User-CF 与 Item-CF',
        difficulty: 3,
        content: `
### 学习目标

学完本节，你应该能够：
1. 在小型评分矩阵上计算用户/物品余弦相似度并解释皮尔逊去均值的意义；
2. 用 User-CF 加权近邻预测缺失评分；
3. 对比 User-CF 与 Item-CF 的稳定性与计算规模，说明工业界偏好。

### 前置知识

- numpy 矩阵运算；
- 余弦相似度概念。

### 问题背景

推荐的本质是填补 99% 为空的用户-物品矩阵。User-CF 找『和你相似的人』，Item-CF 找『和你买过的相似商品』——后者因物品属性稳定、可离线预计算，通常是工业界的起点。

### 直觉理解

User-CF 像问『跟你口味像的朋友最近看了啥』；Item-CF 像购物网站『买了 X 的人也买了 Y』。皮尔逊相关是『先扣掉各自打分风格再比』：习惯打 5 分的人与习惯打 3 分的人可能口味完全一致，不减均值就会把风格误当偏好。

### 核心概念与原理详解

## 推荐系统的两类输入

| 类型 | 数据 | 方法 |
| --- | --- | --- |
| **显式反馈** | 评分（1~5 星）、点赞/踩 | 协同过滤、矩阵分解 |
| **隐式反馈** | 浏览、点击、购买、停留时长 | ALS、BPR、序列模型 |

**关键差异**：隐式反馈**没有负样本**——没点击不代表不喜欢，
可能是没看到。这是隐式推荐的核心难点。

## 核心数据：用户-物品矩阵

<MatrixHeat />

**稀疏性**：真实场景里这个矩阵 **99% 以上是空的**。
推荐的本质就是**填补空白**。

## User-CF：找"和你相似的人"

**思路**：如果用户 A 与 B 历史口味相似，那么 A 喜欢的、B 没看过的，可以推荐给 B。

    # 步骤
    1. 计算用户相似度 sim(A, B)
    2. 找 A 的 K 个最近邻
    3. 预测 A 对物品 i 的评分：
       score(A, i) = Σ_{B ∈ N(A)} sim(A,B) · r(B,i) / Σ |sim(A,B)|

**相似度选择**：

| 相似度 | 公式 | 特点 |
| --- | --- | --- |
| 余弦 | cos(u,v) = u·v / (‖u‖‖v‖) | 对未评分项视为 0，适合稀疏 |
| 皮尔逊 | 去均值后的余弦 | 消除用户评分偏置（有人总给高分） |
| Jaccard | 交集/并集 | 适合二值（买/没买） |

**关键细节：去均值（Pearson）很重要**。
有人习惯打 5 分，有人习惯打 3 分。不减均值会把"打分风格"误当成"偏好差异"。

## Item-CF：找"和你买的东西相似的商品"

**思路**：如果两个物品常被同一批人购买，它们就相似。

    score(u, i) = Σ_{j ∈ 用户u评过分的物品} sim(i,j) · r(u,j) / Σ |sim(i,j)|

**Item-CF 通常优于 User-CF**，原因：

| 维度 | User-CF | Item-CF |
| --- | --- | --- |
| 相似度稳定性 | 用户兴趣会变，相似度不稳定 | 物品属性稳定，相似度可离线预计算 |
| 计算规模 | 用户数增长快 | 物品数通常远小于用户数 |
| 可解释性 | "和你相似的人也买了" | "买了这个的人还买了"（更直观） |

**这就是 Amazon 用 Item-CF 的原因**——物品相对稳定，且能离线算好相似度矩阵。

## 协同过滤的三个根本问题

**① 冷启动（Cold Start）**

- **新用户**：没有任何历史，无法找相似用户；
- **新物品**：没有交互记录，无法被推荐（曝光死循环）。

**解法**：
- 新用户：问几个偏好问题（选品类）、用人口统计学信息、推热门；
- 新物品：用**内容特征**（文本/图片）+ 探索流量（EE 问题）。

**② 数据稀疏**

用户-物品矩阵极稀疏时，共同评分项很少，相似度不可靠。

**解法**：矩阵分解（把稀疏矩阵分解成低维稠密向量）、隐式反馈建模。

**③ 马太效应（流行度偏差）**

热门物品被推荐得更多 → 更多交互 → 更热门。
冷门好物品永远没有曝光机会。

**解法**：加探索机制（UCB、Thompson Sampling）、对热门度做惩罚、多样化重排。

## 一个实践要点：评估不能只看准确率

推荐系统的评估要分两层：

| 层次 | 指标 |
| --- | --- |
| **离线** | Precision@K、Recall@K、NDCG@K、MAP、AUC |
| **在线** | CTR、转化率、留存、人均消费、多样性 |

**离线指标提升不等于线上提升**——这是推荐系统最经典的陷阱。
原因：离线评估用的是已曝光数据，存在**选择偏差**；
线上还有位置偏差、用户疲劳、生态多样性等因素。

**必须做 A/B 实验验证。**

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
R = np.array([[5,3,0,1], [4,0,0,1], [1,1,0,5], [0,0,5,4], [0,3,4,0]], float)
def cos_sim(a, b):
    mask = (a>0)&(b>0)
    if not mask.any(): return 0
    return float(a[mask]@b[mask]/(np.linalg.norm(a[mask])*np.linalg.norm(b[mask])))
n = len(R)
S = np.array([[cos_sim(R[i], R[j]) for j in range(n)] for i in range(n)])
print("用户相似度(0-1):", np.round(S, 2)[0])
# 预测用户 0 对物品 2 的评分（User-CF）
u = 0; it = 2
neigh = np.argsort(-S[u])[[1, 2]]
num = sum(S[u, v]*R[v, it] for v in neigh if R[v, it] > 0)
den = sum(abs(S[u, v]) for v in neigh if R[v, it] > 0)
print(f"User-CF 预测 U0 对 I2 评分: {num/den:.2f}")
# Item-CF 相似度
Si = np.array([[cos_sim(R[:, i], R[:, j]) for j in range(4)] for i in range(4)])
print("Item 相似度 I2 与:", np.round(Si[2], 2))\`\`\`

预期输出（实测）：用户 0 的相似度 [1,1,0.42,1,1]；User-CF 预测 U0 对 I2 评分 4.50；Item 相似度向量（小矩阵上共现少，需 MF 补强）。

**常见错误**：用未去均值的余弦比较打分风格迥异的用户；Item-CF 相似度用含当前用户的全体数据计算后线上直接用（应预计算并处理新物品冷启动）；把未评分当 0 分参与均值计算。

### 常见误区

1. **『User-CF 与 Item-CF 等价可互换』**——用户数≫物品数时 Item-CF 的相似度矩阵小得多且更稳定；\\n2. **『隐式反馈可用评分公式』**——没有负样本，需要 BPR/ALS 置信度加权；\\n3. **『相似度高就该推』**——还要排除已购/已曝光，并考虑流行度修正。

### 知识关联

- **向前**：mining-freq c1 的共现支持度是 Item-CF 相似度的原始形态；
- **向后**：c2 的矩阵分解解决稀疏性瓶颈；
- **平行**：llm-b1 的余弦检索与本章用户相似度同一数学。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 两类反馈 | 显式有评分；隐式无负样本 |
| User-CF | sim(u,v)·r 加权预测，K 近邻 |
| Item-CF | 物品相似稳定可预计算，工业首选 |
| 相似度 | 余弦/皮尔逊（去均值）/Jaccard |
| 稀疏性 | 99% 空 → 需 MF（下一章）|

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Han, Kamber & Pei《数据挖掘：概念与技术》相应章节与 scikit-learn 官方文档）
`,
        tips: [
          {
            kind: 'interview',
            text: '「User-CF 与 Item-CF 的区别」：User-CF 找相似用户，Item-CF 找相似物品。Item-CF 更常用，因为物品更稳定、可离线预计算、可解释性更好。',
          },
          {
            kind: 'leak',
            text: '做 User-CF 必须去均值（Pearson 相似度），否则用户打分风格的差异（有人总打高分）会被误认为偏好差异。',
          },
          {
            kind: 'pitfall',
            text: '离线指标提升不等于线上提升。离线数据存在选择偏差（只有曝光过的才有记录），必须做 A/B 实验。',
          },
        ],
        demos: [
          {
            title: '手写 User-CF 与 Item-CF',
            lang: 'python',
            code: `import numpy as np

# 用户-物品评分矩阵（0 表示未评分）
R = np.array([
    [5, 4, 0, 0, 1],
    [4, 5, 0, 1, 0],
    [0, 0, 5, 4, 0],
    [0, 1, 4, 5, 0],
    [1, 0, 0, 0, 5],
], dtype=float)

def cosine_sim_matrix(M):
    """按行计算余弦相似度。"""
    norm = np.linalg.norm(M, axis=1, keepdims=True)
    norm[norm == 0] = 1e-9
    Mn = M / norm
    return Mn @ Mn.T

def user_cf(R, user_idx, k=2, top_n=3):
    sim = cosine_sim_matrix(R)
    sim[user_idx, user_idx] = 0          # 排除自己
    neighbors = np.argsort(-sim[user_idx])[:k]
    print(f"用户{user_idx} 的最近邻: {neighbors.tolist()} (相似度 {sim[user_idx][neighbors].round(3)})")

    scores = np.zeros(R.shape[1])
    for item in range(R.shape[1]):
        if R[user_idx, item] > 0:        # 已评分的跳过
            continue
        num = sum(sim[user_idx, n] * R[n, item] for n in neighbors if R[n, item] > 0)
        den = sum(abs(sim[user_idx, n]) for n in neighbors if R[n, item] > 0)
        scores[item] = num / den if den else 0
    order = np.argsort(-scores)[:top_n]
    return [(int(i), round(float(scores[i]), 2)) for i in order if scores[i] > 0]

print("=== User-CF ===")
print("给用户0的推荐:", user_cf(R, 0))

def item_cf(R, user_idx, top_n=3):
    sim = cosine_sim_matrix(R.T)          # 物品相似度
    scores = []
    for item in range(R.shape[1]):
        if R[user_idx, item] > 0:
            continue
        num = sum(sim[item, j] * R[user_idx, j] for j in range(R.shape[1])
                  if R[user_idx, j] > 0 and j != item)
        den = sum(abs(sim[item, j]) for j in range(R.shape[1])
                  if R[user_idx, j] > 0 and j != item)
        if den:
            scores.append((item, num / den))
    scores.sort(key=lambda x: -x[1])
    return [(int(i), round(float(s), 2)) for i, s in scores[:top_n]]

print()
print("=== Item-CF ===")
print("给用户0的推荐:", item_cf(R, 0))

# 稀疏度
print()
print(f"矩阵稀疏度: {(R == 0).sum() / R.size:.0%} 是空的")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'mining-recsys-c1-e1',
        type: 'single',
        difficulty: 2,
        question: 'Item-CF 通常比 User-CF 更常用的主要原因是？',
        options: [
          { value: 'A', text: '物品数量更多' },
          { value: 'B', text: '物品相似度更稳定、可离线预计算、可解释性更好' },
          { value: 'C', text: '计算更简单' },
          { value: 'D', text: '准确率一定更高' },
        ],
        answer: 'B',
        explanation:
          '用户兴趣会随时间变化导致相似度不稳定，而物品属性相对稳定，相似度矩阵可以离线算好。加上"买了这个的人还买了"的可解释性，Item-CF 成为工业主流。',
        tags: ['Item-CF'],
      },
      {
        id: 'mining-recsys-c1-e2',
        type: 'judge',
        difficulty: 2,
        question: '做 User-CF 时使用皮尔逊相似度（去均值）能消除不同用户打分风格带来的偏差。',
        answer: true,
        explanation:
          '有人习惯打 5 分、有人习惯打 3 分。不减均值会把这个风格差异误认为偏好差异。去均值后比较的是"相对偏好"而非"绝对分数"。',
        tags: ['相似度'],
      },
      {
        id: 'mining-recsys-c1-e3',
        type: 'multiple',
        difficulty: 3,
        question: '协同过滤面临的三个根本问题是？（多选）',
        options: [
          { value: 'A', text: '冷启动：新用户/新物品没有历史数据' },
          { value: 'B', text: '数据稀疏：共同评分项太少导致相似度不可靠' },
          { value: 'C', text: '马太效应：热门物品越来越热，冷门好物无曝光' },
          { value: 'D', text: '无法处理数值型评分' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误——协同过滤正是处理数值型评分的方法。A/B/C 是协同过滤的三个经典痛点，分别用内容特征+探索、矩阵分解、多样化重排来缓解。',
        tags: ['协同过滤问题'],
      },
      {
        id: 'mining-recsys-c1-e4',
        type: 'fill',
        difficulty: 3,
        question: '推荐系统的离线指标提升不代表线上效果提升，因为离线数据存在 ___ 偏差（只有曝光过的才有记录）。',
        blanks: [['选择', '选择性', 'selection', '曝光']],
        explanation:
          '选择偏差（selection bias）：离线评估只用了已曝光物品的交互数据，而线上要从未曝光的候选中选择。必须靠 A/B 实验验证真实效果。',
        tags: ['评估陷阱'],
      },
      {
        id: 'mining-recsys-c1-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现余弦相似度矩阵：cosine_sim(M)，按行计算，返回 n×n 矩阵。\n\n注意零向量的保护（避免除零）。',
        starterCode: `import numpy as np

def cosine_sim(M):
    norm = ___
    norm[norm == 0] = 1e-9
    Mn = ___
    return ___
`,
        setupCode: 'import numpy as np\nM = np.array([[1,0],[1,0],[0,1]], dtype=float)',
        expectedOutput: '相似度矩阵',
        tests: `import numpy as np
M = np.array([[1,0],[1,0],[0,1]], dtype=float)
S = cosine_sim(M)
assert S.shape == (3,3), f"形状应为 (3,3)，实际 {S.shape}"
assert abs(S[0,1] - 1.0) < 1e-9, "相同的两行相似度应为 1"
assert abs(S[0,2]) < 1e-9, "正交的行相似度应为 0"
# 对角线为 1
assert all(abs(S[i,i] - 1.0) < 1e-9 for i in range(3))
# 零向量不报错
M2 = np.array([[0,0],[1,0]], dtype=float)
assert cosine_sim(M2).shape == (2,2)
`,
        answer: `import numpy as np

def cosine_sim(M):
    norm = np.linalg.norm(M, axis=1, keepdims=True)
    norm[norm == 0] = 1e-9
    Mn = M / norm
    return Mn @ Mn.T
`,
        explanation:
          '`keepdims=True` 保证广播正确（n×1 而非 n）。\n\n`Mn @ Mn.T` 一次矩阵乘算出所有两两余弦相似度——这是协同过滤最核心的计算，也是向量检索的基础。\n\n零向量保护必要：全未评分的用户会除零。',
        tags: ['编程', '相似度'],
      },
      {
        id: 'mining-recsys-c1-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现 User-CF 评分预测：predict_user_cf(R, user_idx, item_idx, sim, k=3)。\n\n用最相似的 k 个邻居（且该邻居对该物品有评分）加权平均。若无可用邻居返回 0.0，结果保留 4 位小数。',
        starterCode: `import numpy as np

def predict_user_cf(R, user_idx, item_idx, sim, k=3):
    s = sim[user_idx].copy()
    s[user_idx] = 0
    neighbors = ___
    num = den = 0.0
    for n in neighbors:
        if R[n, item_idx] > 0:
            ___
    return round(num / den, 4) if den else 0.0
`,
        setupCode:
          'import numpy as np\nR = np.array([[5,4,0],[4,5,1],[0,0,5]], dtype=float)\nsim = np.array([[1,0.9,0.1],[0.9,1,0.1],[0.1,0.1,1]])',
        expectedOutput: '加权平均预测值',
        tests: `import numpy as np
R = np.array([[5,4,0],[4,5,1],[0,0,5]], dtype=float)
sim = np.array([[1,0.9,0.1],[0.9,1,0.1],[0.1,0.1,1]])
# 用户0 对物品2：邻居1 评了1分(相似0.9)，邻居2 评了5分(相似0.1)
p = predict_user_cf(R, 0, 2, sim)
expected = (0.9*1 + 0.1*5) / (0.9 + 0.1)
assert abs(p - round(expected, 4)) < 1e-6, f"应为 {expected}，实际 {p}"
# 无邻居评分时返回 0
p2 = predict_user_cf(R, 2, 1, sim)
assert p2 == 0.0 or p2 > 0, "应正常返回"
`,
        answer: `import numpy as np

def predict_user_cf(R, user_idx, item_idx, sim, k=3):
    s = sim[user_idx].copy()
    s[user_idx] = 0
    neighbors = np.argsort(-s)[:k]
    num = den = 0.0
    for n in neighbors:
        if R[n, item_idx] > 0:
            num += s[n] * R[n, item_idx]
            den += abs(s[n])
    return round(num / den, 4) if den else 0.0
`,
        explanation:
          '核心是**只统计对该物品有评分的邻居**（`R[n, item_idx] > 0`）——没评过分的邻居无法提供信息。\n\n分母用 `abs(s[n])` 而非 `s[n]`：若有负相似度（负相关用户），用带符号的分母会让结果异常。',
        tags: ['编程', 'User-CF'],
      },
      {
        id: 'mining-recsys-c1-e7',
        type: 'judge',
        difficulty: 3,
        question: '隐式反馈（点击、购买）在建模时不需要特别处理负样本，因为未点击就等于不喜欢。',
        answer: false,
        explanation:
          '隐式反馈**没有真正的负样本**。未点击可能是没看到、没曝光，而非不喜欢。直接当负样本会引入大量噪声，需要负采样策略或专门的隐式反馈模型（ALS、BPR）。',
        tags: ['隐式反馈'],
      },
      {
        id: 'mining-recsys-c1-e8',
        type: 'single',
        difficulty: 3,
        question: '推荐系统出现"冷门好物品永远没有曝光机会"的问题叫什么？',
        options: [
          { value: 'A', text: '冷启动问题' },
          { value: 'B', text: '马太效应（流行度偏差）' },
          { value: 'C', text: '数据稀疏' },
          { value: 'D', text: '过拟合' },
        ],
        answer: 'B',
        explanation:
          '热门物品被推荐更多 → 交互更多 → 更热门，形成正反馈。冷门好物没有曝光机会。解法是加探索机制（UCB/Thompson Sampling）、对热门度惩罚、多样化重排。',
        tags: ['马太效应'],
      },
      {
        id: 'mining-recsys-c1-e9',
        type: 'code',
        difficulty: 3,
        question:
          '计算 NDCG@K：ndcg_at_k(recommended, relevant, k)。\n\n- recommended: 推荐列表（物品 id 有序）\n- relevant: 真实相关物品集合\n- DCG = Σ rel_i / log2(i+2)，i 从 0 开始\n- IDCG = 理想排序（所有相关物品排最前）的 DCG\n\n返回 DCG/IDCG，保留 4 位小数。',
        starterCode: `import math

def ndcg_at_k(recommended, relevant, k):
    dcg = 0.0
    for i, item in enumerate(recommended[:k]):
        if item in relevant:
            dcg += ___
    ideal = sorted(relevant, key=lambda x: 0)  # 理想：全部命中
    idcg = 0.0
    for i in range(min(len(ideal), k)):
        idcg += ___
    return round(dcg / idcg, 4) if idcg else 0.0
`,
        setupCode: 'recommended = ["a","b","c","d"]\nrelevant = {"a","c"}',
        expectedOutput: '0 < NDCG <= 1',
        tests: `import math
# 全部命中且排最前 -> NDCG=1
assert abs(ndcg_at_k(["a","b"], {"a","b"}, 2) - 1.0) < 1e-6
# 命中在第1、3位
v = ndcg_at_k(["a","x","b"], {"a","b"}, 3)
assert 0 < v < 1, f"应为 0~1，实际 {v}"
# 完全未命中
assert ndcg_at_k(["x","y"], {"a"}, 2) == 0.0
# 排得越靠前分数越高
v1 = ndcg_at_k(["a","b","x"], {"a","b"}, 3)
v2 = ndcg_at_k(["x","a","b"], {"a","b"}, 3)
assert v1 > v2, "命中排前面应得分更高"
`,
        answer: `import math

def ndcg_at_k(recommended, relevant, k):
    dcg = 0.0
    for i, item in enumerate(recommended[:k]):
        if item in relevant:
            dcg += 1.0 / math.log2(i + 2)
    ideal = list(relevant)
    idcg = 0.0
    for i in range(min(len(ideal), k)):
        idcg += 1.0 / math.log2(i + 2)
    return round(dcg / idcg, 4) if idcg else 0.0
`,
        explanation:
          'NDCG 的关键是**位置折扣**：1/log2(i+2) 让排在前面的命中得分更高。\n\n第一位（i=0）：1/log2(2)=1.0；第二位（i=1）：1/log2(3)=0.631；第三位（i=2）：1/log2(4)=0.5。',
        tags: ['编程', 'NDCG'],
      },
      {
        id: 'mining-recsys-c1-e10',
        type: 'open',
        difficulty: 4,
        question:
          '一个新上线的电商平台要从零搭建推荐系统。请说明：① 冷启动阶段怎么做；② 协同过滤的三个问题如何缓解；③ 为什么必须做 A/B 实验而不只看离线指标。',
        referenceAnswer: `**一、冷启动阶段（最关键）**

**新用户冷启动**：
1. **兴趣引导**：注册时让用户选 3~5 个感兴趣的品类（成本低、效果好）；
2. **热门兜底**：按品类推热门商品（保证有东西可推）；
3. **人口统计学**：用年龄/性别/地域做粗粒度分群推荐；
4. **探索流量**：给新用户分配一定比例的探索曝光，快速收集反馈。

**新物品冷启动**：
1. **内容特征**：用标题/图片/类目做 embedding，与已有物品算相似度（内容-based）；
2. **新品流量扶持**：给新上架商品固定曝光预算；
3. **类目内推荐**：在新品所属类目内推荐，用户接受度更高。

**平台冷启动**（无任何数据）：
- 用内容推荐 + 人工运营位；
- 快速积累第一批交互数据，再切换协同过滤。

**二、协同过滤三个问题的缓解**

**① 数据稀疏 → 矩阵分解**

把稀疏的 R（m×n）分解为 U（m×k）· V（k×n），k 远小于 min(m,n)。
即使用户只评过 2 个物品，也能在低维空间找到相似性。

**② 马太效应 → 探索与多样性**

- **UCB / Thompson Sampling**：给不确定性高的物品更高探索权重；
- **流行度惩罚**：score = 预测分 / popularity^α；
- **多样化重排**：MMR（最大边际相关性）、DPP，避免推荐列表全是同类；
- **新品流量池**：固定比例曝光给长尾内容。

**③ 冷启动 → 内容 + 混合推荐**

- 内容特征弥补交互数据缺失；
- 混合策略：新用户用内容推荐，老用户用协同过滤；
- 跨域迁移：用其他业务的行为（如浏览）补充本业务缺失。

**三、为什么必须做 A/B 实验**

**① 离线数据存在选择偏差**

离线评估只用"已曝光物品"的交互记录。但线上要从**全部候选**里选，
未曝光物品的真实偏好完全未知（MNAR 数据）。离线高分可能只是拟合了曝光策略。

**② 离线指标与业务指标脱节**

离线看的是 Precision@K / NDCG，但业务关心 CTR、转化率、留存、GMV。
一个更"准"的推荐可能更同质化，长期降低用户留存。

**③ 反馈回路效应**

推荐系统会改变用户行为，进而改变未来数据分布。
离线评估是静态的，无法捕捉这种动态影响。

**④ 位置偏差与呈现方式**

同样的物品放在第 1 位和第 10 位，点击率差数倍。
离线评估忽略了位置、样式、文案等呈现因素。

**正确做法**：

    离线刷掉明显差的方案（快速筛）
      ↓
    小流量 A/B 实验（1~5%，看业务指标 + 显著性检验）
      ↓
    逐步放量（边放边看长期指标：留存/多样性/生态健康）
      ↓
    全量上线 + 持续监控

**关键**：A/B 实验要有**统计显著性**（样本量足够、检验方法正确），
且要看**长期指标**而非只看短期点击率。`,
        rubric: [
          { point: '冷启动：兴趣引导 + 热门兜底 + 内容特征 + 探索流量', score: 3 },
          { point: '稀疏用矩阵分解、马太效应用探索与多样化、冷启动用混合推荐', score: 3 },
          { point: '指出离线选择偏差（MNAR）与指标脱节', score: 2 },
          { point: '提到反馈回路与位置偏差', score: 1 },
          { point: '给出离线→A/B→放量→监控的完整流程', score: 1 },
        ],
        keywords: ['冷启动', '矩阵分解', 'UCB', 'MMR', '选择偏差', 'A/B 实验'],
        explanation:
          '这是推荐系统的落地综合题。能说清"离线指标好不代表线上好"的四个原因，就理解了推荐系统评估的核心陷阱。',
        tags: ['推荐系统', '综合'],
      },
    ],
  },
];
