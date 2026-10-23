import type { Chapter } from '../../types';

/* 数据挖掘 · M4 推荐系统 · c2 矩阵分解、c3 内容与混合、c4 评估体系 */

export const miningRecsysChapters2: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'mining-recsys-c2',
    title: '矩阵分解与隐式反馈',
    goal: '理解 MF/ALS/BPR 的建模思路，掌握隐式反馈与冷启动的工程处理。',
    lessons: [
      {
        id: 'mining-recsys-c2-l1',
        title: '从 SVD 到 ALS 与 BPR',
        difficulty: 4,
        content: `
## 协同过滤的两个瓶颈

1. **稀疏性**：共同评分项太少 → 相似度不可靠；
2. **计算**：用户数 × 物品数的矩阵巨大，无法全部载入。

**矩阵分解（MF）** 的思路：把用户和物品都映射到 **k 维隐空间**，
用内积近似评分。

## MF 的基本模型

    r̂_{ui} = μ + b_u + b_i + p_u^T q_i

| 符号 | 含义 |
| --- | --- |
| μ | 全局平均分 |
| b_u | 用户偏置（该用户打分偏高/偏低） |
| b_i | 物品偏置（该物品普遍受欢迎程度） |
| p_u, q_i | 用户/物品的 k 维隐向量 |

**偏置项很重要**：有人总是打高分、有些物品总是受欢迎。
不建模偏置会让隐向量需要"兼职"表达这些信息，效果变差。

## 优化目标

    min Σ_{(u,i) ∈ 观测} (r_{ui} - r̂_{ui})² + λ(||p_u||² + ||q_i||²)

**关键：只对观测到的评分求误差**（未评分不算 0 分）。

**求解方法**：
- **SGD**：逐样本更新；
- **ALS（交替最小二乘）**：固定 q 解 p，再固定 p 解 q，交替迭代。

**为什么 ALS 流行**：
- 每一步有**闭式解**（不需要调学习率）；
- **天然可并行**（每个用户/物品独立求解）；
- 适合隐式反馈。

## 隐式反馈：没有负样本怎么办

**核心难题**：用户没点击不代表不喜欢——可能只是没看到。

**方案 1：ALS 的置信度加权**

    min Σ_{u,i} c_{ui}(p_{ui} - p_u^T q_i)² + λ(...)

- p_{ui} = 1 表示有交互，0 表示无交互；
- **c_{ui}** = 置信度：有交互时 \`1 + α·次数\`，无交互时 1（而不是 0）。

**直觉**：把所有未交互项当作"弱负样本"，用低置信度处理。

**方案 2：BPR（贝叶斯个性化排序）**

**不预测评分，只预测相对偏好**：

    对每个用户，构造三元组 (u, i, j)：
      i 是用户交互过的物品
      j 是用户未交互的物品
    要求：r̂_{ui} > r̂_{uj}

**损失**（pairwise hinge/log-sigmoid）：

    L = -Σ log σ(r̂_{ui} - r̂_{uj}) + λ(...)

**BPR 的优势**：
- 直接优化排序，与推荐目标一致（我们只关心"推荐什么"，不关心"打几分"）；
- 天然处理隐式反馈（有交互 > 无交互）；
- 训练快。

**BPR 的关键：负采样**。未交互物品有几百万个，训练时随机采 1~5 个即可。

## 冷启动的处理

**新用户**（无历史）：
- 用**注册信息**（年龄、地域）找相似群体，用该群体的热门；
- **主动询问**兴趣（选 3 个感兴趣的品类）；
- 用**内容召回**（物品的类目/标签）。

**新物品**（无交互）：
- **内容特征**：标题/图片/类目 → embedding → 与已有物品算相似；
- **属性回归**：用类目/价格等预测隐向量（属性到 latent 的映射，即 **SVDFeature** 思路）；
- **探索流量**：固定曝光预算收集反馈。

## 一个实践要点：特征工程仍然重要

**纯 MF 只用 ID**。但在工业系统中，通常会把**上下文特征**也放进去：

    r̂ = μ + b_u + b_i + b_t + p_u^T q_i + Σ w_f x_f

这就是 **Factorization Machines（FM）**，以及后来的 **DeepFM、xDeepFM** 的起点。

| 模型 | 加入什么 |
| --- | --- |
| MF | 用户 ID、物品 ID |
| SVD++ | + 用户的隐式反馈 |
| FM | + 任意二阶交叉特征（时间、设备、上下文） |
| DeepFM | + 深度网络学高阶交叉 |

**实践建议**：现在的推荐系统几乎不会只用纯 MF，
而是"MF 召回 + 精排模型（FM/DNN）"的两阶段架构。

## 两阶段推荐架构

    数百万物品
      ↓ 召回（MF/物品相似/热门）：降到 几百个
      ↓ 粗排（轻量模型）：降到 几十个
      ↓ 精排（重模型，含丰富特征）：输出最终排序
      → Top-N 展示

**为什么分阶段**：精排模型很强但很慢，不可能对百万物品打分。
召回负责"不漏"，精排负责"排准"。

<MatrixHeat />
`,
        tips: [
          {
            kind: 'interview',
            text: '「ALS 相比 SGD 的优势」：每步有闭式解无需调学习率、天然可并行（用户/物品独立求解）、适合隐式反馈的置信度加权。',
          },
          {
            kind: 'leak',
            text: '隐式反馈没有真负样本。ALS 把所有未交互项当"低置信度负样本"（c=1），有交互的置信度设为 1+α·次数。',
          },
          {
            kind: 'note',
            text: '工业推荐系统是两阶段架构：召回（MF/相似/热门）从百万降到几百，精排（FM/DNN）从几百排到 Top-N。',
          },
        ],
        demos: [
          {
            title: 'SGD 训练矩阵分解（含偏置）',
            lang: 'python',
            code: `import numpy as np

# 用户-物品评分矩阵（0 = 未评分）
R = np.array([
    [5, 4, 0, 0, 1],
    [4, 5, 0, 1, 0],
    [0, 0, 5, 4, 0],
    [0, 1, 4, 5, 0],
    [1, 0, 0, 0, 5],
], dtype=float)

n_users, n_items = R.shape
k = 3
rng = np.random.default_rng(0)

# 初始化
P = rng.normal(0, 0.1, (n_users, k))
Q = rng.normal(0, 0.1, (n_items, k))
bu = np.zeros(n_users)
bi = np.zeros(n_items)

# 全局均值（只对观测值）
observed = R > 0
mu = R[observed].mean()
print(f"全局均值 μ = {mu:.3f}, 观测比例 = {observed.mean():.1%}")

# SGD 训练
lr, reg, epochs = 0.01, 0.05, 200
for epoch in range(epochs):
    for u in range(n_users):
        for i in range(n_items):
            if not observed[u, i]:
                continue
            pred = mu + bu[u] + bi[i] + P[u] @ Q[i]
            err = R[u, i] - pred
            # 更新
            bu[u] += lr * (err - reg * bu[u])
            bi[i] += lr * (err - reg * bi[i])
            P_u, Q_i = P[u].copy(), Q[i].copy()
            P[u] += lr * (err * Q_i - reg * P_u)
            Q[i] += lr * (err * P_u - reg * Q_i)

# 评估训练误差
preds = mu + bu[:, None] + bi[None, :] + P @ Q.T
rmse = np.sqrt(np.mean((R[observed] - preds[observed]) ** 2))
print(f"训练 RMSE = {rmse:.4f}")
print()

print("=== 预测用户 0 的未评分物品 ===")
for i in range(n_items):
    if not observed[0, i]:
        print(f"  物品{i}: 预测 {preds[0, i]:.2f}")
print()

print("=== 各用户的偏置（打分风格）===")
for u in range(n_users):
    print(f"  用户{u}: b_u = {bu[u]:+.2f}  ({'偏高' if bu[u] > 0 else '偏低'})")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'mining-recsys-c2-e1',
        type: 'single',
        difficulty: 2,
        question: '矩阵分解（MF）相比协同过滤解决的核心问题是？',
        options: [
          { value: 'A', text: '计算更快' },
          { value: 'B', text: '把稀疏的高维评分矩阵映射到低维隐空间，缓解数据稀疏' },
          { value: 'C', text: '不需要用户数据' },
          { value: 'D', text: '可以处理图像' },
        ],
        answer: 'B',
        explanation:
          'MF 把用户和物品都映射到 k 维隐向量（k 通常 10~200），用内积近似评分。即使用户只评过 2 个物品，也能在隐空间找到相似性。',
        tags: ['矩阵分解'],
      },
      {
        id: 'mining-recsys-c2-e2',
        type: 'judge',
        difficulty: 2,
        question: '隐式反馈（点击、购买）中没有交互的物品应该视为负样本，置信度与有交互的一样。',
        answer: false,
        explanation:
          '未交互不代表不喜欢（可能没曝光）。ALS 的处理是把未交互项当"低置信度负样本"（c=1），有交互的置信度设为 1+α·次数，以此区分强弱信号。',
        tags: ['隐式反馈'],
      },
      {
        id: 'mining-recsys-c2-e3',
        type: 'multiple',
        difficulty: 3,
        question: 'ALS（交替最小二乘）相比 SGD 的优势有？（多选）',
        options: [
          { value: 'A', text: '每步有闭式解，不需要调学习率' },
          { value: 'B', text: '天然可并行（每个用户/物品独立求解）' },
          { value: 'C', text: '适合隐式反馈的置信度加权' },
          { value: 'D', text: '内存占用更小' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误——ALS 需要把矩阵载入内存（或分块），内存需求不小。A/B/C 是它成为工业标配的原因。',
        tags: ['ALS'],
      },
      {
        id: 'mining-recsys-c2-e4',
        type: 'fill',
        difficulty: 3,
        question: 'BPR（贝叶斯个性化排序）构造 (u, i, j) 三元组，要求 r̂_{ui} 大于 r̂_{___}。',
        blanks: [['uj', 'u,j', '用户未交互物品']],
        explanation:
          'BPR 不预测绝对评分，只要求"用户交互过的物品 i 的得分 > 未交互物品 j 的得分"。这直接优化排序，与推荐目标一致。',
        tags: ['BPR'],
      },
      {
        id: 'mining-recsys-c2-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现 MF 预测：mf_predict(mu, bu, bi, P, Q)，返回完整预测矩阵。\n\n公式：r̂_{ui} = μ + b_u + b_i + p_u^T q_i',
        starterCode: `import numpy as np

def mf_predict(mu, bu, bi, P, Q):
    return ___
`,
        setupCode:
          'import numpy as np\nmu = 3.0\nbu = np.array([0.5, -0.5])\nbi = np.array([0.2, -0.2, 0.0])\nP = np.array([[1,0],[0,1]])\nQ = np.array([[1,0],[0,1],[1,1]])',
        expectedOutput: '2×3 预测矩阵',
        tests: `import numpy as np
mu = 3.0
bu = np.array([0.5, -0.5])
bi = np.array([0.2, -0.2, 0.0])
P = np.array([[1,0],[0,1]], dtype=float)
Q = np.array([[1,0],[0,1],[1,1]], dtype=float)
out = mf_predict(mu, bu, bi, P, Q)
assert out.shape == (2,3), f"形状应为 (2,3)，实际 {out.shape}"
# 用户0物品0: 3.0+0.5+0.2+(1*1+0*0)=4.7
assert abs(out[0,0] - 4.7) < 1e-9, f"应为 4.7，实际 {out[0,0]}"
# 用户1物品1: 3.0-0.5-0.2+(0*0+1*1)=3.3
assert abs(out[1,1] - 3.3) < 1e-9, f"应为 3.3，实际 {out[1,1]}"
# 用户0物品2: 3.0+0.5+0.0+(1*1+0*1)=4.5
assert abs(out[0,2] - 4.5) < 1e-9, f"应为 4.5，实际 {out[0,2]}"
`,
        answer: `import numpy as np

def mf_predict(mu, bu, bi, P, Q):
    return mu + bu[:, None] + bi[None, :] + P @ Q.T
`,
        explanation:
          '四项相加：全局均值 + 用户偏置（广播到列）+ 物品偏置（广播到行）+ 隐向量内积。\n\n`P @ Q.T` 一次矩阵乘算出所有用户-物品的隐向量内积（n×m 矩阵）。\n\n**偏置项不可省**：它让隐向量不用"兼职"表达"这人总打高分"这类信息。',
        tags: ['编程', 'MF 预测'],
      },
      {
        id: 'mining-recsys-c2-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现 ALS 的置信度矩阵构建：als_confidence(R, alpha=40)：\n\n- R 是隐式反馈矩阵（值是交互次数）\n- 有交互：c = 1 + alpha × count\n- 无交互：c = 1\n返回与 R 同形状的置信度矩阵。',
        starterCode: `import numpy as np

def als_confidence(R, alpha=40):
    R = np.asarray(R, dtype=float)
    ___
`,
        setupCode: 'import numpy as np\nR = np.array([[1,0,3],[0,2,0]], dtype=float)',
        expectedOutput: '有交互的置信度更高',
        tests: `import numpy as np
R = np.array([[1,0,3],[0,2,0]], dtype=float)
C = als_confidence(R, alpha=40)
assert C.shape == R.shape, "形状应一致"
# 有交互：1+40*1=41, 1+40*3=121, 1+40*2=81
assert abs(C[0,0] - 41) < 1e-9, f"应为 41，实际 {C[0,0]}"
assert abs(C[0,2] - 121) < 1e-9, f"应为 121，实际 {C[0,2]}"
assert abs(C[1,1] - 81) < 1e-9, f"应为 81，实际 {C[1,1]}"
# 无交互：1
assert C[0,1] == 1.0 and C[1,0] == 1.0 and C[1,2] == 1.0
`,
        answer: `import numpy as np

def als_confidence(R, alpha=40):
    R = np.asarray(R, dtype=float)
    return np.where(R > 0, 1 + alpha * R, 1.0)
`,
        explanation:
          '`np.where(条件, 真值, 假值)` 向量化处理。\n\n**关键**：无交互的置信度设为 **1 而不是 0**——它们仍是"弱负样本"，只是权重低。完全忽略未交互项会导致模型学不到"用户不喜欢什么"。\n\nalpha 越大，隐含"交互信号越强"。典型值 10~40。',
        tags: ['编程', 'ALS'],
      },
      {
        id: 'mining-recsys-c2-e7',
        type: 'code',
        difficulty: 3,
        question:
          '实现 BPR 的负采样：sample_negatives(user_items, all_items, n_neg=3, rng=None)。\n\n- user_items: 用户已交互的物品集合\n- all_items: 全部物品集合\n- 随机采样 n_neg 个用户**未交互**的物品\n返回采样列表。',
        starterCode: `import numpy as np

def sample_negatives(user_items, all_items, n_neg=3, rng=None):
    rng = rng or np.random.default_rng(0)
    candidates = ___
    if len(candidates) < n_neg:
        return list(candidates)
    return list(rng.choice(candidates, n_neg, replace=False))
`,
        setupCode:
          'import numpy as np\nuser_items = {1, 3}\nall_items = {1,2,3,4,5}\nrng = np.random.default_rng(0)',
        expectedOutput: '3 个用户未交互的物品',
        tests: `import numpy as np
user_items = {1,3}
all_items = {1,2,3,4,5}
rng = np.random.default_rng(0)
out = sample_negatives(user_items, all_items, 2, rng)
assert len(out) == 2, f"应采 2 个，实际 {len(out)}"
assert all(x not in user_items for x in out), f"不应包含已交互物品，实际 {out}"
assert all(x in all_items for x in out), "应来自全部物品集"
# 无重复
assert len(set(out)) == len(out), "不应重复采样"
# 候选不足时全返回
out2 = sample_negatives({1,2,3,4}, all_items, 5, rng)
assert set(out2) == {5}, f"候选只有 5，实际 {out2}"
`,
        answer: `import numpy as np

def sample_negatives(user_items, all_items, n_neg=3, rng=None):
    rng = rng or np.random.default_rng(0)
    candidates = np.array(sorted(set(all_items) - set(user_items)))
    if len(candidates) < n_neg:
        return list(candidates)
    return list(rng.choice(candidates, n_neg, replace=False))
`,
        explanation:
          'BPR 训练的核心操作：**为每个正样本采样若干未交互物品作负样本**。\n\n`set(all) - set(user)` 得到候选池，`replace=False` 保证不重复。\n\n实践中负采样有技巧：**按热度采样**（热门物品更可能被曝光，作为负样本更有信息量）比均匀采样效果好。',
        tags: ['编程', 'BPR'],
      },
      {
        id: 'mining-recsys-c2-e8',
        type: 'judge',
        difficulty: 3,
        question: '矩阵分解中的用户偏置 b_u 建模的是"该用户打分普遍偏高还是偏低"。',
        answer: true,
        explanation:
          'b_u 就是用户的打分风格。有人习惯打 5 分，有人习惯打 3 分，这是系统性的偏移，必须单独建模，否则隐向量会被迫表达这个信息。',
        tags: ['偏置项'],
      },
      {
        id: 'mining-recsys-c2-e9',
        type: 'single',
        difficulty: 3,
        question: 'BPR 相比 MF 回归的核心优势是？',
        options: [
          { value: 'A', text: '参数量更少' },
          { value: 'B', text: '直接优化排序（相对偏好），与推荐的真正目标一致' },
          { value: 'C', text: '不需要负样本' },
          { value: 'D', text: '计算更快' },
        ],
        answer: 'B',
        explanation:
          '推荐只关心"推荐什么"，不关心"预测几分"。BPR 用 pairwise 损失直接优化"正样本得分 > 负样本得分"，目标与业务一致。代价是需要负采样。',
        tags: ['BPR'],
      },
      {
        id: 'mining-recsys-c2-e10',
        type: 'open',
        difficulty: 4,
        question:
          '请解释工业推荐系统的两阶段架构（召回 + 精排），说明为什么不能直接用一个模型对全部物品排序，以及矩阵分解在其中的位置。',
        referenceAnswer: `**一、两阶段架构**

    全部物品（百万~千万级）
      ↓ ① 召回（多路并行）
      ↓    每路取 Top-100~500，合并去重 → 数千个
      ↓ ② 粗排（轻量模型）
      ↓    → 数百个
      ↓ ③ 精排（重模型，特征丰富）
      ↓    → Top-N（如 20 个）
      → 展现在用户面前

**二、为什么不能一个模型搞定**

**① 计算量不允许**

精排模型（DeepFM/DIN/DLRM）单次预测约 1~10 ms（含特征查询）。
- 对 100 万物品打分：1000~10000 秒；
- 用户等不了 0.1 秒以上。

**必须先把候选集降到几百个**，才能用重模型。

**② 特征成本差异巨大**

| 阶段 | 可用特征 | 单次成本 |
| --- | --- | --- |
| 召回 | 只有用户/物品 ID、向量 | 微秒级 |
| 精排 | 用户画像 + 物品属性 + 交叉特征 + 实时行为 | 毫秒级 |

对百万物品查全部特征根本不可行。

**③ 目标不同**

- **召回要"不漏"**（高召回率）：宁可放一些不相关的进来，只要真正相关的没丢；
- **精排要"排准"**（高精确率）：在候选里挑出最该展示的。

这两个目标需要不同的模型与评估指标。

**三、矩阵分解在其中的位置**

**MF 是召回的经典方案**：

1. 训练得到用户隐向量 P 和物品隐向量 Q；
2. 在线时用 **ANN（近似最近邻）** 检索：
   - 用用户向量 p_u 在物品向量库中找内积最大的 Top-K；
   - FAISS/HNSW 可在毫秒内从上百万向量中检索。
3. 通常与其他召回路径**并行**（热门、类目、物品相似、实时行为），
   最后合并去重。

**MF 召回的优点**：
- 隐向量就是"用户/物品的语义表示"，可离线算好；
- ANN 检索极快（亚毫秒级）；
- 能做**跨类目**的泛化推荐（隐空间无类目边界）。

**MF/MF 变体在精排中的位置**：
- 作为**特征**输入（用户向量与物品向量的内积、余弦相似度）；
- 不再单独做排序模型。

**四、多路召回的必要性**

单一召回通道会形成**信息茧房**：

| 通道 | 覆盖什么 |
| --- | --- |
| MF/双塔 | 个性化兴趣 |
| 物品相似（Item-CF） | 当前浏览的延伸 |
| 热门 | 冷启动、大众热点 |
| 类目/标签 | 兴趣广度 |
| 实时行为序列 | 短期意图 |
| 社交/关注 | 关系链 |

**实践**：各通道按配额取数（如 MF 300 个 + 热门 100 个 + ...），
合并后统一去重进入粗排。

**五、一个关键认知**

**召回决定上限，精排决定能否逼近上限。**

如果召回阶段就把真正相关的物品漏掉了，精排再强也救不回来。
这就是为什么大厂在召回上投入巨大（多路、多模态、向量检索优化）。`,
        rubric: [
          { point: '三阶段流程与数量级（百万→数千→数百→Top-N）', score: 3 },
          { point: '计算量与特征成本不允许单模型搞定', score: 2 },
          { point: '召回要"不漏"、精排要"排准"的目标差异', score: 2 },
          { point: 'MF 在召回中的位置（隐向量 + ANN 检索）', score: 2 },
          { point: '多路召回的必要性 + "召回决定上限"', score: 1 },
        ],
        keywords: ['召回', '精排', 'ANN', 'FAISS', '多路召回', '信息茧房'],
        explanation:
          '能说清"召回决定上限、精排逼近上限"以及用量级说明为什么必须分阶段，就理解了工业架构的必然性。',
        tags: ['推荐架构', '综合'],
      },
    ],
  },

  {
    id: 'mining-recsys-c3',
    title: '内容推荐与混合策略',
    goal: '掌握基于内容的特征匹配方法、六种混合策略，以及冷启动与多样性问题的解法。',
    lessons: [
      {
        id: 'mining-recsys-c3-l1',
        title: '内容特征匹配与混合推荐',
        difficulty: 4,
        content: `
## 内容推荐：不依赖他人行为

**协同过滤的根本局限**：需要大量用户行为数据。

**内容推荐（Content-Based）** 的思路：**用物品本身的特征**匹配用户偏好。

    物品特征：文本、类目、标签、图片、作者、价格……
    用户画像：从用户历史偏好聚合出的特征向量

**核心流程**：

    1. 物品 → 特征向量（TF-IDF / Embedding / 多模态）
    2. 用户历史物品的特征向量 → 聚合（加权平均 / 注意力）→ 用户画像
    3. 计算候选物品与用户画像的相似度 → 排序

## 物品特征怎么做

| 类型 | 方法 |
| --- | --- |
| **文本**（标题、描述） | TF-IDF、BERT embedding、关键词抽取 |
| **类目/标签** | One-Hot、层级编码 |
| **图像** | CNN/CLIP 提取视觉 embedding |
| **数值**（价格、时长） | 标准化 + 分箱 |
| **结构化**（作者、品牌） | ID embedding |

**多模态融合**：把文本、图像、类目的 embedding 拼接或加权求和，
形成统一的物品向量。这是当前电商/短视频的主流做法。

## 用户画像的聚合方式

**① 简单平均**

    user_vec = mean([item_vec for item in history])

问题：所有历史物品等权，无法体现"最近更相关"或"某类更偏好"。

**② 时间衰减加权**

    w_i = exp(-λ · Δt_i)      # 越久远权重越低
    user_vec = Σ w_i · item_vec_i / Σ w_i

**③ 注意力聚合**

用一个小网络学习"每个历史物品对当前预测的重要程度"。
这是 **DIN（Deep Interest Network）** 的核心创新。

**④ 多兴趣向量**

把用户历史聚成多个兴趣簇（如电商里的"母婴""数码""美妆"），
每个簇一个向量。这是 **MIND（Multi-Interest Network）** 的思路。

## 内容推荐的优缺点

| 优点 | 缺点 |
| --- | --- |
| **无冷启动问题**（新物品只要有特征就能推） | **推荐同质化**（总推相似内容，用户会腻） |
| 可解释（"因为你看了 X"） | 无法发现**跨类目的惊喜** |
| 不需要用户行为 | 特征质量决定效果（文本描述不准确就废了） |
| 适合小众/长尾物品 | 难以捕捉"群体偏好" |

## 六种混合策略（Burke 的分类）

| 策略 | 做法 | 例子 |
| --- | --- | --- |
| **加权混合** | 各推荐器的分数加权求和 | 0.6×CF + 0.4×CB |
| **切换混合** | 按场景选一个 | 新用户用 CB，老用户用 CF |
| **混合展示** | 每个推荐器各出几条 | 5 条 CF + 5 条 CB |
| **特征组合** | 把一方输出作为另一方输入 | CF 分数作为 CB 的特征 |
| **级联混合** | 前一个先粗筛，后一个精排 | CB 召回 → CF 精排 |
| **元级混合** | 用一个模型学习如何组合 | Stacking |

**实践中最常用：切换 + 级联**

- **切换**：新用户（无行为）用内容推荐，有行为后切到协同过滤；
- **级联**：内容召回解决覆盖，协同过滤/精排解决准确。

## 冷启动的完整方案

| 场景 | 策略 |
| --- | --- |
| **新平台（无数据）** | 人工运营位 + 内容推荐 + 热门榜 |
| **新用户** | 兴趣选择题、注册信息分群、热门兜底、探索流量 |
| **新物品** | 内容特征匹配、类目内推荐、固定探索预算 |
| **跨域冷启动** | 用其他业务的行为（如浏览→购买）迁移 |

**关键：冷启动的本质是"信息不足"，所有解法都是"从哪里获得额外信息"**。

## 多样性与信息茧房

**纯协同过滤/内容推荐都会导致同质化**：

- 用户看了 A → 推更多类似 A → 越看越窄；
- 长期会降低用户留存与平台生态健康。

**解法**：

| 方法 | 说明 |
| --- | --- |
| **MMR（最大边际相关性）** | 每次选"与已选最不相似但与查询最相关"的 |
| **DPP（行列式点过程）** | 用行列式衡量多样性，理论优雅 |
| **类目打散** | 强制 Top-N 中至少 K 个不同类目 |
| **探索配额** | 固定比例曝光给新物品/长尾 |
| **轮播/混合** | 多路召回按配额组合 |

**MMR 公式**：

    MMR = argmax [ λ·sim(item, query) - (1-λ)·max sim(item, selected) ]

λ 控制"相关性 vs 多样性"的平衡。

## 一个实践要点：评估要看长期

内容推荐的**离线指标**容易做好（相似度算得准），但可能：

- 短期 CTR 上升，**长期留存下降**（同质化导致疲劳）；
- 多样性下降，**生态恶化**（长尾创作者流失）。

**必须监控**：

- 类目覆盖度、熵（多样性）；
- 新物品/长尾物品的曝光占比；
- 用户 7 日/30 日留存。

<CollaborativeFilteringDemo />
`,
        tips: [
          {
            kind: 'interview',
            text: '「内容推荐 vs 协同过滤」：内容推荐用物品特征匹配用户画像，无冷启动问题但易同质化；协同过滤用群体行为，能发现跨类目惊喜但需行为数据。实践中用混合策略。',
          },
          {
            kind: 'leak',
            text: 'MMR 用 λ 平衡"与查询的相关性"和"与已选结果的差异"，是解决推荐列表同质化最常用的方法。',
          },
          {
            kind: 'pitfall',
            text: '离线 CTR 提升不等于长期收益。同质化推荐会短期提 CTR 但长期降留存，必须监控类目多样性、长尾曝光与留存指标。',
          },
        ],
        demos: [
          {
            title: 'TF-IDF 内容推荐与 MMR 多样性重排',
            lang: 'python',
            code: `import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

items = [
    {"id": 1, "title": "Python 数据分析入门", "cat": "编程"},
    {"id": 2, "title": "Pandas 数据处理实战", "cat": "编程"},
    {"id": 3, "title": "统计学基础教程", "cat": "数学"},
    {"id": 4, "title": "SQL 查询优化技巧", "cat": "编程"},
    {"id": 5, "title": "机器学习数学基础", "cat": "数学"},
    {"id": 6, "title": "数据可视化设计", "cat": "设计"},
]

# ① 文本向量化
tfidf = TfidfVectorizer(analyzer="char", ngram_range=(2, 3))
texts = [f"{it['title']} {it['cat']}" for it in items]
X = tfidf.fit_transform(texts).toarray()

# ② 用户画像：看过 item 1 和 2
history_idx = [0, 1]
user_vec = X[history_idx].mean(axis=0)

# ③ 计算相关性分数
sims = X @ user_vec / (np.linalg.norm(X, axis=1) * np.linalg.norm(user_vec) + 1e-9)
sims[history_idx] = -1  # 排除已看

print("=== 按相关性排序 ===")
order = np.argsort(-sims)
for i in order:
    if sims[i] > 0:
        print(f"  {items[i]['title']:22} [{items[i]['cat']}]  相似度 {sims[i]:.3f}")

# ④ MMR 多样性重排
def mmr(sims, vectors, top_k=3, lam=0.7):
    selected = []
    remaining = [i for i in np.argsort(-sims) if sims[i] > 0]
    while remaining and len(selected) < top_k:
        best, best_score = None, -np.inf
        for i in remaining:
            if not selected:
                score = sims[i]
            else:
                max_sim = max(
                    vectors[i] @ vectors[j] / (np.linalg.norm(vectors[i]) * np.linalg.norm(vectors[j]) + 1e-9)
                    for j in selected
                )
                score = lam * sims[i] - (1 - lam) * max_sim
            if score > best_score:
                best, best_score = i, score
        selected.append(best)
        remaining.remove(best)
    return selected

picked = mmr(sims, X, top_k=3, lam=0.5)
print()
print("=== MMR 多样性重排（lambda=0.5）===")
for i in picked:
    print(f"  {items[i]['title']:22} [{items[i]['cat']}]  相似度 {sims[i]:.3f}")
print()
print("对比：纯相关性会推 2(Pandas) 4(SQL) 都是编程类")
print("MMR 打散后至少引入数学/设计类，降低同质化")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'mining-recsys-c3-e1',
        type: 'single',
        difficulty: 2,
        question: '内容推荐相比协同过滤的最大优势是？',
        options: [
          { value: 'A', text: '准确率更高' },
          { value: 'B', text: '不需要用户行为数据，能解决冷启动' },
          { value: 'C', text: '计算更快' },
          { value: 'D', text: '推荐的多样性更好' },
        ],
        answer: 'B',
        explanation:
          '内容推荐用物品特征（文本/图片/类目）匹配用户画像，新物品只要有特征就能推荐。这正是协同过滤完全做不到的（新物品无任何交互记录）。',
        tags: ['内容推荐'],
      },
      {
        id: 'mining-recsys-c3-e2',
        type: 'judge',
        difficulty: 2,
        question: '内容推荐因为总推相似物品，容易导致推荐结果同质化。',
        answer: true,
        explanation:
          '内容推荐基于物品特征相似度，天然倾向推荐同类物品，用户会感到"越看越窄"。这就是为什么需要混合策略与多样性重排（MMR/DPP）。',
        tags: ['同质化'],
      },
      {
        id: 'mining-recsys-c3-e3',
        type: 'multiple',
        difficulty: 3,
        question: '下列哪些属于混合推荐策略？（多选）',
        options: [
          { value: 'A', text: '加权混合（各推荐器分数加权求和）' },
          { value: 'B', text: '切换混合（按场景选不同推荐器）' },
          { value: 'C', text: '级联混合（前者召回，后者精排）' },
          { value: 'D', text: '只用协同过滤' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 是单一策略，不是混合。Burke 总结了七种混合方式（加权/切换/混合展示/特征组合/级联/元级/特征增强），实践中常用切换 + 级联。',
        tags: ['混合策略'],
      },
      {
        id: 'mining-recsys-c3-e4',
        type: 'fill',
        difficulty: 3,
        question: 'MMR 用公式 λ·sim(item, query) − (1−λ)·max sim(item, selected)，其中 λ 控制 ___ 与多样性的平衡。',
        blanks: [['相关性', 'relevance', '相关度']],
        explanation:
          'λ 越大越偏重与查询的相关性（可能同质化），λ 越小越偏重与已选结果的差异（更多样但相关性下降）。常用 0.5~0.7。',
        tags: ['MMR'],
      },
      {
        id: 'mining-recsys-c3-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现时间衰减权重：time_decay_weights(deltas, halflife)。\n\n- deltas: 距今的天数列表\n- 返回权重列表，满足"经过 halflife 天后权重减半"\n保留 4 位小数。',
        starterCode: `import numpy as np

def time_decay_weights(deltas, halflife=30.0):
    d = np.asarray(deltas, dtype=float)
    ___
`,
        setupCode: 'import numpy as np\ndeltas = [0, 30, 60, 90]',
        expectedOutput: '[1.0, 0.5, 0.25, 0.125]',
        tests: `import numpy as np
out = time_decay_weights([0,30,60,90], 30.0)
assert np.allclose(out, [1.0, 0.5, 0.25, 0.125], atol=1e-6), f"结果不正确: {out}"
# halflife=10
out2 = time_decay_weights([0,10,20], 10.0)
assert np.allclose(out2, [1.0, 0.5, 0.25], atol=1e-6)
# 权重单调递减
out3 = time_decay_weights([0,5,10,20], 15.0)
assert all(out3[i] > out3[i+1] for i in range(len(out3)-1)), "应单调递减"
`,
        answer: `import numpy as np

def time_decay_weights(deltas, halflife=30.0):
    d = np.asarray(deltas, dtype=float)
    return np.round(0.5 ** (d / halflife), 4)
`,
        explanation:
          '`0.5 ** (d / halflife)` 直接实现"半衰期"：d = halflife 时指数为 1，得到 0.5。\n\n这是给用户历史行为加权最常用的方式——最近的行为更能代表当前兴趣。\n\nhalflife 的选择取决于业务节奏：短视频取几小时，电商可能取 30 天。',
        tags: ['编程', '时间衰减'],
      },
      {
        id: 'mining-recsys-c3-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现 MMR 的一步选择：mmr_select(sims, sims_matrix, selected, lam=0.5)。\n\n- sims: 候选物品与查询的相关性分数数组\n- sims_matrix: 物品间相似度矩阵\n- selected: 已选物品索引列表\n- 返回应选的下一个物品索引（分数最高的）\n\nscore = lam*sims[i] - (1-lam)*max(sims_matrix[i][j] for j in selected)',
        starterCode: `import numpy as np

def mmr_select(sims, sims_matrix, selected, lam=0.5):
    sims = np.asarray(sims, dtype=float)
    best_i, best_score = -1, -np.inf
    for i in range(len(sims)):
        if i in selected:
            continue
        if selected:
            max_sim = ___
            score = ___
        else:
            score = lam * sims[i]
        if score > best_score:
            best_i, best_score = i, score
    return best_i
`,
        setupCode:
          'import numpy as np\nsims = np.array([0.9, 0.8, 0.3])\nmat = np.array([[1,0.9,0.1],[0.9,1,0.1],[0.1,0.1,1]])',
        expectedOutput: 'first pick = 0',
        tests: `import numpy as np
sims = np.array([0.9, 0.8, 0.3])
mat = np.array([[1,0.9,0.1],[0.9,1,0.1],[0.1,0.1,1]])
# 无已选时选相关性最高的
assert mmr_select(sims, mat, [], 0.5) == 0, "应选索引 0"
# 已选 0 后： 
#   i=1: 0.5*0.8 - 0.5*0.9 = 0.4-0.45 = -0.05
#   i=2: 0.5*0.3 - 0.5*0.1 = 0.15-0.05 = 0.10
assert mmr_select(sims, mat, [0], 0.5) == 2, "应选差异大的索引 2"
# lambda 大时更偏相关性
assert mmr_select(sims, mat, [0], 0.95) == 1, "高 lambda 应选相关性更高的"
`,
        answer: `import numpy as np

def mmr_select(sims, sims_matrix, selected, lam=0.5):
    sims = np.asarray(sims, dtype=float)
    best_i, best_score = -1, -np.inf
    for i in range(len(sims)):
        if i in selected:
            continue
        if selected:
            max_sim = max(sims_matrix[i][j] for j in selected)
            score = lam * sims[i] - (1 - lam) * max_sim
        else:
            score = lam * sims[i]
        if score > best_score:
            best_i, best_score = i, score
    return best_i
`,
        explanation:
          'MMR 的核心权衡：**相关性减去与已选结果的最大相似度**。\n\n- 若某物品与已选的非常像（max_sim 大），扣分多，不容易被选中； - λ 控制偏向：大 λ 更看相关性，小 λ 更多样。\n\n这正是"避免列表里全是同类内容"的数学表达。',
        tags: ['编程', 'MMR'],
      },
      {
        id: 'mining-recsys-c3-e7',
        type: 'judge',
        difficulty: 3,
        question: '内容推荐的离线评估指标通常不如协同过滤，所以实际系统应该只用协同过滤。',
        answer: false,
        explanation:
          '内容推荐的价值不在离线指标，而在**解决冷启动与长尾覆盖**。实际系统用混合策略：内容负责覆盖（新物品、新用户），协同过滤负责准确。',
        tags: ['策略选择'],
      },
      {
        id: 'mining-recsys-c3-e8',
        type: 'single',
        difficulty: 3,
        question: '新平台上完全没有用户行为数据，应该优先用？',
        options: [
          { value: 'A', text: '矩阵分解' },
          { value: 'B', text: '内容推荐 + 人工运营 + 热门榜' },
          { value: 'C', text: 'Item-CF' },
          { value: 'D', text: '深度排序模型' },
        ],
        answer: 'B',
        explanation:
          '没有交互数据时，任何协同过滤类方法都无法训练。此时需靠内容特征（物品属性匹配）、人工精选与热门榜单撑起第一版，同时用探索流量快速积累数据。',
        tags: ['冷启动'],
      },
      {
        id: 'mining-recsys-c3-e9',
        type: 'code',
        difficulty: 3,
        question:
          '实现类目打散：diversify_by_category(items, category_key, k, max_per_cat)。\n\n- items: 已排序的物品列表（每项是 dict）\n- 从前往后取，同一类目最多取 max_per_cat 个，直到取满 k 个\n返回结果列表。',
        starterCode: `def diversify_by_category(items, category_key, k, max_per_cat=2):
    result = []
    cat_count = {}
    ___
    return result
`,
        setupCode:
          'items = [{"id":1,"c":"A"},{"id":2,"c":"A"},{"id":3,"c":"A"},{"id":4,"c":"B"},{"id":5,"c":"C"}]\ncategory_key = "c"',
        expectedOutput: '每类最多 2 个',
        tests: `items = [{"id":1,"c":"A"},{"id":2,"c":"A"},{"id":3,"c":"A"},
         {"id":4,"c":"B"},{"id":5,"c":"C"}]
out = diversify_by_category(items, "c", 4, 2)
assert len(out) == 4, f"应取 4 个，实际 {len(out)}"
cats = [x["c"] for x in out]
assert cats.count("A") <= 2, f"A 类应最多 2 个，实际 {cats}"
assert [x["id"] for x in out] == [1,2,4,5], f"顺序不正确: {[x['id'] for x in out]}"
# max_per_cat=1 时每个类目只取 1 个
out2 = diversify_by_category(items, "c", 5, 1)
assert [x["id"] for x in out2] == [1,4,5], f"结果不正确: {[x['id'] for x in out2]}"
`,
        answer: `def diversify_by_category(items, category_key, k, max_per_cat=2):
    result = []
    cat_count = {}
    for it in items:
        if len(result) >= k:
            break
        cat = it[category_key]
        if cat_count.get(cat, 0) >= max_per_cat:
            continue
        result.append(it)
        cat_count[cat] = cat_count.get(cat, 0) + 1
    return result
`,
        explanation:
          '最简单的多样性控制：**限制每个类目在最终列表中的数量**。\n\n生产系统中这是"打散规则"的一部分，常配合其他规则（如品牌打散、作者打散）。\n\n优点是简单可控、可解释；缺点是可能牺牲相关性（真正相关的被限制掉了）。MMR/DPP 更优雅但计算更重。',
        tags: ['编程', '多样性'],
      },
      {
        id: 'mining-recsys-c3-e10',
        type: 'open',
        difficulty: 4,
        question:
          '请设计一个完整的推荐系统方案，覆盖：冷启动、混合策略、多样性与长期健康。说明每个阶段用什么方法、为什么，以及如何监控系统健康度。',
        referenceAnswer: `**一、系统阶段设计**

**阶段 0：平台冷启动（无任何数据）**

- **人工运营位**：编辑精选专题、榜单；
- **内容推荐**：用物品属性（类目/标签/文本）匹配用户主动选择的兴趣；
- **热门兜底**：按点击/销量排序；
- **目标**：快速积累第一批交互数据。

**阶段 1：新用户（有注册信息，无行为）**

- **兴趣引导**：注册流程选 3~5 个感兴趣品类（转化率高、成本低）；
- **人口统计学分群**：按年龄/地域/设备推该群体热门；
- **探索配额**：给新用户固定比例的探索曝光，快速摸清偏好；
- **切换策略**：行为数 < 阈值时用内容推荐，超过后切协同过滤。

**阶段 2：成熟用户（有充分行为）**

- **多路召回**：
  - MF/双塔（个性化）
  - Item-CF（当前浏览延伸）
  - 内容相似（跨类目泛化）
  - 实时行为序列
  - 热门/新品
- **精排**：DeepFM/DIN，融合用户画像 + 物品属性 + 交叉特征；
- **重排**：多样性、业务规则、去重。

**二、混合策略的具体设计**

**级联混合（主力）**：

    内容召回（覆盖长尾 + 新物品）
      + 协同过滤召回（准确 + 跨类目惊喜）
      → 合并去重
      → 精排统一打分

**切换混合（冷启动）**：

    行为数 < 5  → 内容推荐为主
    行为数 >= 5 → 协同过滤为主，内容为辅

**加权混合（打散后）**：

    最终分 = 0.7 × 精排分 + 0.3 × 多样性奖励分

**三、多样性保障（防止信息茧房）**

| 层次 | 措施 |
| --- | --- |
| **召回层** | 多路配额（热门最多占 30%） |
| **精排层** | 类目多样性作为特征或约束 |
| **重排层** | MMR/DPP 或简单类目打散（每类最多 2 个） |
| **探索层** | 固定 5%~10% 曝光给新物品/长尾 |
| **时间维度** | 同用户 7 天内不重复推同一物品 |

**MMR 参数**：λ = 0.7（相关性优先，但保证一定多样性）。

**四、长期健康监控**

**单次请求指标**：

- CTR、CVR、人均点击深度、停留时长。

**系统健康指标（关键，常被忽略）**：

| 指标 | 健康区间 | 说明 |
| --- | --- | --- |
| **类目覆盖度** | 越高越好 | 曝光涉及的类目数 / 总类目数 |
| **推荐熵** | 高 | 曝光分布的香农熵，低说明过度集中 |
| **长尾曝光占比** | 20%~40% | Top 20% 物品之外的曝光比例 |
| **新物品冷启成功率** | 监控趋势 | 新品 7 天内获得 100+ 曝光的比例 |
| **创作者/商家活跃** | 监控 | 有曝光的长尾商家数 |

**用户长期指标**：

- 7 日 / 30 日留存；
- 用户兴趣广度（历史交互的类目数）；
- 疲劳度（同一物品被重复曝光的次数）。

**A/B 实验设计**：

- 不只看单次 CTR，**必须跑 2 周以上**观察留存；
- 设立**长期 holdout 组**（如 5% 用户长期用旧版本）监测长期影响。

**五、一个重要的判断**

**短期 CTR 与长期留存可能相反**：

- 极端个性化的推荐短期 CTR 高（推用户一定点的）；
- 但会让用户"看腻"，长期留存下降。

**正确做法**：把"多样性/新鲜度"作为**目标函数的一部分**而非事后补救。

    最终目标 ≈ 短期收益 + α × 长期留存 + β × 生态健康

α、β 的取值需要长期 A/B 实验调优。`,
        rubric: [
          { point: '三阶段冷启动方案（平台/新用户/成熟用户）', score: 3 },
          { point: '混合策略：级联 + 切换 + 加权，说明各自场景', score: 2 },
          { point: '多样性四层次（召回配额/精排/重排 MMR/探索）', score: 2 },
          { point: '健康指标：类目覆盖、熵、长尾曝光、新品成功率', score: 2 },
          { point: '指出短期 CTR 与长期留存可能相反 + 长期 holdout', score: 1 },
        ],
        keywords: ['冷启动', '级联混合', 'MMR', '熵', '长尾曝光', '长期 holdout'],
        explanation:
          '能提出"多样性作为目标函数一部分"而非事后补救，并设计长期 holdout 监控，就理解了推荐系统的长期主义。',
        tags: ['推荐系统设计', '综合'],
      },
    ],
  },

  {
    id: 'mining-recsys-c4',
    title: '评估体系与工程实践',
    goal: '掌握离线评估的指标选择与陷阱、在线实验设计，以及离线在线不一致的原因。',
    lessons: [
      {
        id: 'mining-recsys-c4-l1',
        title: '离线指标、在线实验与不一致',
        difficulty: 5,
        content: `
## 评估的两层结构

| 层 | 数据 | 目标 | 特点 |
| --- | --- | --- | --- |
| **离线** | 历史日志 | 快速筛选模型 | 便宜、快，但有偏差 |
| **在线** | 真实流量 | 验证真实收益 | 可信、贵，影响用户体验 |

**核心结论**：**离线好 ≠ 线上好**。必须做 A/B。

## 离线指标家族

**① 评分预测类**（显式反馈）

    RMSE = sqrt(mean((r - r̂)²))
    MAE  = mean(|r - r̂|)

**问题**：优化评分精度 ≠ 推荐得好。
用户关心的是"推荐给我什么"，不是"你猜我打几分"。

**② 排序质量类**（Top-N 推荐）

| 指标 | 定义 | 特点 |
| --- | --- | --- |
| **Precision@K** | Top-K 中相关物品比例 | 衡量"推得准不准" |
| **Recall@K** | Top-K 覆盖了多少相关物品 | 衡量"有没有漏" |
| **F1@K** | 两者调和平均 | 平衡 |
| **MAP@K** | 平均精度的均值 | 考虑位置 |
| **NDCG@K** | 归一化折损累计增益 | **考虑位置与分级相关性** |
| **MRR** | 第一个相关物品排名的倒数的均值 | 关注"第一个对的在哪" |

**NDCG 为什么最常用**：
- 考虑**位置折扣**（排前面更重要）；
- 支持**分级相关性**（不只是 0/1）；
- 归一化后不同用户/查询间可比。

**③ 分类/排序区分度**

- **AUC**：整体排序能力；
- **GAUC**（Group AUC）：**按用户分组算 AUC 再平均**——
  这才是推荐场景的正确用法（不同用户可比性差）。

**GAUC 的重要性**：全局 AUC 高可能只是"把高活用户排在低活用户前面"，
但同一用户内部的排序才是关键。

## 离线评估的四个陷阱

**① 数据偏差（选择偏差）**

训练数据只有**曝光过的物品**的反馈。未曝光的完全缺失。

**后果**：模型在"已曝光集合"上表现好，但要面对全量候选时失效。

**② 位置偏差**

同样物品放第 1 位和第 10 位，CTR 差数倍。
离线数据里混杂了位置效应，模型可能学到"位置高 = 用户喜欢"。

**③ 流行度偏差**

热门物品交互多，模型倾向于推热门，形成马太效应。
离线评估也无法反映这个长期危害。

**④ 评估方式与线上不一致**

- 离线常做"留一法"或"随机切分"；
- 线上是时间序列的真实流。
**随机切分会泄漏未来信息**（用未来行为预测过去）。

**正确做法**：**按时间切分**（前 N 天训练、后 M 天测试）。

## 在线实验（A/B）设计

**① 分流**

- 按用户 ID 哈希分流（同一用户始终在同一组，避免体验抖动）；
- 实验组与对照组除待测变量外**完全一致**；
- 样本量要够（用功效分析计算）。

**② 核心指标**

| 层 | 指标 |
| --- | --- |
| **北极星指标** | 如人均 GMV、次日留存 |
| **直接指标** | CTR、CVR、点击深度 |
| **护栏指标** | 延迟、错误率、投诉率、多样性 |

**③ 统计显著性**

- 用 t 检验或 Mann-Whitney U；
- p < 0.05 才算显著；
- **样本量估算**：效应越小需要的样本越多。

**④ 常见错误**

| 错误 | 后果 |
| --- | --- |
| **提前看结果**（peeking） | 假阳性率暴涨 |
| **只看短期** | 忽略长期留存下降 |
| **多重比较**（看太多指标） | 假阳性累积 |
| **分流不均匀** | 组间本身有差异 |

## 离线在线不一致的五个原因

**这是推荐系统最经典的困惑**：离线 AUC 0.75 → 上线后 CTR 反而下降。

| 原因 | 说明 |
| --- | --- |
| **① 数据分布不同** | 离线是历史策略产生的数据，新策略会改变分布 |
| **② 反馈回路** | 推荐改变用户行为 → 改变后续数据 |
| **③ 位置/呈现偏差** | 离线不含展示位置、样式等 |
| **④ 指标不一致** | 离线优化 AUC，线上看 GMV |
| **⑤ 冷启动物品** | 离线评估覆盖不到新物品 |

**缓解手段**：

- **反事实评估（Off-Policy Evaluation）**：
  用 IPS（逆倾向加权）修正历史策略的偏差；
- **无偏评估数据集**：故意随机曝光收集无偏数据；
- **仿真环境**：用模拟器评估新策略（但难做准）；
- **小流量实验**：最终还是要靠 A/B。

## 一个务实的流程

    离线快速筛（NDCG/GAUC/Recall@K）
      ↓ 排除明显更差的方案
    小流量 A/B（1%~5%，跑 1~2 周）
      ↓ 看核心指标 + 护栏指标
    逐步放量（10% → 50% → 100%）
      ↓ 持续监控长期指标
    全量 + 定期回归测试

**关键**：离线只是"筛子"，不是"裁判"。**最终裁判是在线实验。**

<CollaborativeFilteringDemo />
`,
        tips: [
          {
            kind: 'interview',
            text: '「GAUC 与 AUC 的区别」：AUC 是全局排序能力，但推荐场景不同用户间不可比。GAUC 按用户分组算 AUC 再按样本数加权平均，才反映"同一用户内部的排序质量"。',
          },
          {
            kind: 'leak',
            text: '离线评估必须按时间切分，随机切分会用未来行为预测过去（泄漏）。这是推荐评估最常见的错误。',
          },
          {
            kind: 'pitfall',
            text: '离线好线上差是常态，五大原因：数据分布不同、反馈回路、位置偏差、指标不一致、冷启动覆盖不到。最终必须靠 A/B 验证。',
          },
        ],
        demos: [
          {
            title: 'NDCG、GAUC 与 A/B 显著性检验',
            lang: 'python',
            code: `import numpy as np
from scipy import stats

def ndcg_at_k(relevances, k=10):
    """relevances: 按推荐顺序排列的相关性（0/1 或分级）"""
    relevances = np.asarray(relevances[:k], dtype=float)
    if relevances.sum() == 0:
        return 0.0
    discounts = 1 / np.log2(np.arange(2, len(relevances) + 2))
    dcg = (relevances * discounts).sum()
    ideal = np.sort(relevances)[::-1]
    idcg = (ideal * discounts).sum()
    return dcg / idcg if idcg > 0 else 0.0

def gauc(y_true_by_user, y_score_by_user):
    """按用户分组算 AUC 再加权平均。"""
    from sklearn.metrics import roc_auc_score
    aucs, weights = [], []
    for u in y_true_by_user:
        yt = y_true_by_user[u]
        if len(set(yt)) < 2:
            continue  # 该用户全正或全负，AUC 无定义
        aucs.append(roc_auc_score(yt, y_score_by_user[u]))
        weights.append(len(yt))
    return np.average(aucs, weights=weights) if aucs else 0.0

print("=== NDCG@K ===")
# 场景1：相关物品排前面
print(f"  相关物品在 [1,0,1,0,0]: NDCG@5 = {ndcg_at_k([1,0,1,0,0], 5):.4f}")
print(f"  相关物品在 [0,0,1,0,1]: NDCG@5 = {ndcg_at_k([0,0,1,0,1], 5):.4f}")
print("  -> 同样命中 2 个，排前面的 NDCG 更高（位置折扣）")
print()

print("=== GAUC vs AUC ===")
from sklearn.metrics import roc_auc_score
rng = np.random.default_rng(0)
# 构造 3 个用户，其中用户0是高活用户（样本多）
users = {
    "活跃用户": ([1,0,1,0,1,0,1,0,1,0]*5, list(rng.uniform(0.4,0.9,25)) + list(rng.uniform(0.1,0.6,25))),
    "普通用户1": ([1,0,0,0], [0.8, 0.7, 0.3, 0.2]),
    "普通用户2": ([0,1,0,0], [0.9, 0.3, 0.4, 0.1]),  # 这个用户排得很差
}
y_true_by_user = {u: v[0] for u, v in users.items()}
y_score_by_user = {u: v[1] for u, v in users.items()}

all_true = sum(y_true_by_user.values(), [])
all_score = sum(y_score_by_user.values(), [])
print(f"  全局 AUC = {roc_auc_score(all_true, all_score):.4f}")
print(f"  GAUC     = {gauc(y_true_by_user, y_score_by_user):.4f}")
print("  -> 活跃用户样本多，主导了全局 AUC；GAUC 平等对待每个用户")
print()

print("=== A/B 实验显著性检验 ===")
# 模拟：对照组 CTR 10%，实验组 10.5%，各 10 万用户
n = 100_000
ctrl_clicks = rng.binomial(n, 0.100)
exp_clicks = rng.binomial(n, 0.105)
print(f"  对照组: {ctrl_clicks}/{n} = {ctrl_clicks/n:.4%}")
print(f"  实验组: {exp_clicks}/{n} = {exp_clicks/n:.4%}")
print(f"  相对提升: {(exp_clicks/n - ctrl_clicks/n)/(ctrl_clicks/n):+.2%}")

# 双比例 z 检验
p1, p2 = ctrl_clicks/n, exp_clicks/n
p_pool = (ctrl_clicks + exp_clicks) / (2*n)
se = np.sqrt(p_pool * (1-p_pool) * (2/n))
z = (p2 - p1) / se
p_value = 2 * (1 - stats.norm.cdf(abs(z)))
print(f"  z = {z:.4f}, p = {p_value:.6f}")
print(f"  {'显著 ✓' if p_value < 0.05 else '不显著 ✗ —— 需要更大样本'}")
print()
print(f"  （0.5pp 的提升需要约 6 万/组样本才有 80% 功效）")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'mining-recsys-c4-e1',
        type: 'single',
        difficulty: 2,
        question: '推荐系统的离线评估应该采用哪种数据切分方式？',
        options: [
          { value: 'A', text: '随机切分' },
          { value: 'B', text: '按时间切分（前 N 天训练，后 M 天测试）' },
          { value: 'C', text: '按用户 ID 排序后切分' },
          { value: 'D', text: 'Leave-one-out' },
        ],
        answer: 'B',
        explanation:
          '随机切分会用未来行为预测过去（时间泄漏），严重高估效果。推荐系统必须按时间切分，模拟真实的"用历史预测未来"场景。',
        tags: ['评估切分'],
      },
      {
        id: 'mining-recsys-c4-e2',
        type: 'judge',
        difficulty: 2,
        question: 'GAUC（分组 AUC）比全局 AUC 更能反映推荐系统的真实排序能力。',
        answer: true,
        explanation:
          '全局 AUC 会被高活用户主导，且不同用户间的分数不可比。GAUC 按用户分组算 AUC 再加权平均，衡量"同一用户内部的排序质量"，更贴近业务。',
        tags: ['GAUC'],
      },
      {
        id: 'mining-recsys-c4-e3',
        type: 'multiple',
        difficulty: 3,
        question: '离线指标好但线上效果差的原因可能有哪些？（多选）',
        options: [
          { value: 'A', text: '离线数据存在选择偏差（只有曝光过的记录）' },
          { value: 'B', text: '推荐会改变用户行为，形成反馈回路' },
          { value: 'C', text: '离线指标与业务目标不一致' },
          { value: 'D', text: '离线计算有 bug' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 不排除但通常不是主因。A/B/C 是结构性的、几乎必然存在的偏差，也是为什么必须做 A/B 实验的根本原因。',
        tags: ['离线在线不一致'],
      },
      {
        id: 'mining-recsys-c4-e4',
        type: 'fill',
        difficulty: 3,
        question: 'A/B 实验中，把用户按 ID ___ 分流可以保证同一用户始终在同一组，避免体验抖动。',
        blanks: [['哈希', 'hash', '散列']],
        explanation:
          '用 hash(user_id) % 100 决定分组，保证同一用户每次都进入同一组。若随机分流，同一用户在不同请求间可能看到不同版本，体验抖动且干扰实验。',
        tags: ['A/B 实验'],
      },
      {
        id: 'mining-recsys-c4-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现 Precision@K 与 Recall@K：precision_recall_at_k(recommended, relevant, k)。\n\n返回 (precision, recall)，保留 4 位小数。',
        starterCode: `def precision_recall_at_k(recommended, relevant, k):
    top_k = recommended[:k]
    hits = ___
    precision = ___
    recall = ___
    return round(precision, 4), round(recall, 4)
`,
        setupCode:
          'recommended = ["a","b","c","d","e"]\nrelevant = {"a","c","f"}',
        expectedOutput: 'precision=0.4, recall≈0.667',
        tests: `p, r = precision_recall_at_k(["a","b","c","d","e"], {"a","c","f"}, 5)
assert abs(p - 0.4) < 1e-6, f"precision 应为 0.4，实际 {p}"
assert abs(r - 0.6667) < 1e-3, f"recall 应约 0.6667，实际 {r}"
# k=2 时只命中 a
p2, r2 = precision_recall_at_k(["a","b","c"], {"a","c"}, 2)
assert abs(p2 - 0.5) < 1e-6 and abs(r2 - 0.5) < 1e-6
# 全命中
p3, r3 = precision_recall_at_k(["a","c"], {"a","c"}, 2)
assert p3 == 1.0 and r3 == 1.0
# 全不命中
p4, r4 = precision_recall_at_k(["x","y"], {"a"}, 2)
assert p4 == 0.0 and r4 == 0.0
`,
        answer: `def precision_recall_at_k(recommended, relevant, k):
    top_k = recommended[:k]
    hits = len(set(top_k) & set(relevant))
    precision = hits / k if k else 0.0
    recall = hits / len(relevant) if relevant else 0.0
    return round(precision, 4), round(recall, 4)
`,
        explanation:
          '**Precision 分母是 K**（推荐了几个就除几），**Recall 分母是相关物品总数**。\n\n两者的权衡很直观：推得多则 Recall 高但 Precision 低；推得少则相反。\n\n注意 K 可能超过推荐列表长度，实践应取 `min(k, len(recommended))`。',
        tags: ['编程', 'Precision/Recall'],
      },
      {
        id: 'mining-recsys-c4-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现 NDCG@K：ndcg_at_k(relevances, k)。\n\n- relevances: 按推荐顺序排列的相关性列表（0/1 或分级）\n- DCG = Σ rel_i / log2(i+2)\n- IDCG = 理想排序（降序）的 DCG\n返回 DCG/IDCG，保留 4 位小数；全 0 时返回 0.0。',
        starterCode: `import numpy as np

def ndcg_at_k(relevances, k):
    rel = np.asarray(relevances[:k], dtype=float)
    if rel.sum() == 0:
        return 0.0
    discounts = ___
    dcg = ___
    ideal = ___
    idcg = ___
    return round(float(dcg / idcg), 4) if idcg > 0 else 0.0
`,
        setupCode: 'relevances = [1, 0, 1, 0, 0]\nk = 5',
        expectedOutput: '0 < NDCG < 1',
        tests: `import numpy as np
# 完美排序 -> NDCG = 1
assert abs(ndcg_at_k([1,1,0,0], 4) - 1.0) < 1e-6, "完美排序应为 1"
# 相关物品排在后面
v = ndcg_at_k([0,0,1,1], 4)
assert 0 < v < 1, f"应在 0~1 之间，实际 {v}"
# 排前面得分更高
v1 = ndcg_at_k([1,0,1,0], 4)
v2 = ndcg_at_k([0,1,0,1], 4)
assert v1 > v2, f"排前面得分应更高: {v1} vs {v2}"
# 全不相关
assert ndcg_at_k([0,0,0], 3) == 0.0
# 分级相关性
v3 = ndcg_at_k([2,1,0], 3)
assert v3 > ndcg_at_k([1,2,0], 3), "高相关应排前面"
`,
        answer: `import numpy as np

def ndcg_at_k(relevances, k):
    rel = np.asarray(relevances[:k], dtype=float)
    if rel.sum() == 0:
        return 0.0
    discounts = 1 / np.log2(np.arange(2, len(rel) + 2))
    dcg = float((rel * discounts).sum())
    ideal = np.sort(rel)[::-1]
    idcg = float((ideal * discounts).sum())
    return round(dcg / idcg, 4) if idcg > 0 else 0.0
`,
        explanation:
          '`1/np.log2(np.arange(2, len+2))` 生成折扣序列：i=0 时 1/log2(2)=1，i=1 时 1/log2(3)=0.631……\n\nIDCG 用降序排列的同一组相关性计算——这是"理想情况"的上界。\n\nNDCG∈[0,1]，1 表示完美排序。这是推荐/搜索最常用的排序指标。',
        tags: ['编程', 'NDCG'],
      },
      {
        id: 'mining-recsys-c4-e7',
        type: 'code',
        difficulty: 3,
        question:
          '实现双比例 z 检验：ab_test_ztest(clicks_a, n_a, clicks_b, n_b)。\n\n返回 (z 值, p 值)，保留 4 位小数。用双侧检验。\n\np_pool = (a+b)/(na+nb)，se = sqrt(p_pool*(1-p_pool)*(1/na+1/nb))',
        starterCode: `import numpy as np

def norm_cdf(x):
    """标准正态 CDF 的近似（避免依赖 scipy）。"""
    return 0.5 * (1 + np.math.erf(x / np.sqrt(2))) if hasattr(np, 'math') else 0.5 * (1 + __import__('math').erf(x / __import__('math').sqrt(2)))

def ab_test_ztest(clicks_a, n_a, clicks_b, n_b):
    pa = clicks_a / n_a
    pb = clicks_b / n_b
    p_pool = ___
    se = ___
    if se == 0:
        return 0.0, 1.0
    z = ___
    p_value = ___
    return round(float(z), 4), round(float(p_value), 4)
`,
        setupCode:
          'clicks_a, n_a = 10000, 100000\nclicks_b, n_b = 10500, 100000',
        expectedOutput: 'p 值小（显著）',
        tests: `import numpy as np
# 明显差异 -> 显著
z, p = ab_test_ztest(10000, 100000, 10500, 100000)
assert abs(z) > 2, f"z 应较大，实际 {z}"
assert p < 0.05, f"应显著，实际 p={p}"
# 几乎无差异 -> 不显著
z2, p2 = ab_test_ztest(10000, 100000, 10010, 100000)
assert p2 > 0.05, f"应不显著，实际 p={p2}"
# 完全相同 -> z=0, p=1
z3, p3 = ab_test_ztest(1000, 10000, 1000, 10000)
assert abs(z3) < 1e-9 and abs(p3 - 1.0) < 1e-6
`,
        answer: `import numpy as np
import math

def norm_cdf(x):
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))

def ab_test_ztest(clicks_a, n_a, clicks_b, n_b):
    pa = clicks_a / n_a
    pb = clicks_b / n_b
    p_pool = (clicks_a + clicks_b) / (n_a + n_b)
    se = np.sqrt(p_pool * (1 - p_pool) * (1/n_a + 1/n_b))
    if se == 0:
        return 0.0, 1.0
    z = (pb - pa) / se
    p_value = 2 * (1 - norm_cdf(abs(z)))
    return round(float(z), 4), round(float(p_value), 4)
`,
        explanation:
          '**双比例 z 检验**是 A/B 实验最常用的显著性检验。\n\n`p_pool` 是合并后的比例（原假设下两组相同），`se` 是差值的标准误。\n\n`2 * (1 - cdf(|z|))` 是双侧 p 值。**注意是双侧**——实验组可能更好也可能更差。\n\n实践中还要做**样本量估算**：0.5pp 的差异需要每组约 6 万人。',
        tags: ['编程', 'A/B 检验'],
      },
      {
        id: 'mining-recsys-c4-e8',
        type: 'judge',
        difficulty: 3,
        question: 'A/B 实验中可以边跑边看结果，发现显著就立即停止实验。',
        answer: false,
        explanation:
          '这是典型的"提前偷看（peeking）"错误，会大幅提高假阳性率。正确做法是**预先确定样本量和实验时长**，跑满再分析。若需中期检查，要用序贯检验方法。',
        tags: ['A/B 实验'],
      },
      {
        id: 'mining-recsys-c4-e9',
        type: 'single',
        difficulty: 3,
        question: '离线优化 RMSE（评分预测）为什么不适合作为推荐系统的主指标？',
        options: [
          { value: 'A', text: 'RMSE 计算太慢' },
          { value: 'B', text: '用户关心"推荐什么"而非"猜我打几分"，评分精度与推荐质量不一致' },
          { value: 'C', text: 'RMSE 只能用于回归' },
          { value: 'D', text: 'RMSE 范围太大' },
        ],
        answer: 'B',
        explanation:
          '优化评分精度不等于推荐得好。用户不关心模型能否准确预测 4.2 分还是 4.5 分，只关心 Top-N 里有没有想看的。所以应该用排序指标（NDCG/MAP/Recall@K）。',
        tags: ['指标选择'],
      },
      {
        id: 'mining-recsys-c4-e10',
        type: 'open',
        difficulty: 5,
        question:
          '一个推荐团队发现：新模型离线 NDCG 提升 3%，但上线后 CTR 下降 1%。请分析可能原因，并给出排查方案与正确的评估流程。',
        referenceAnswer: `**一、可能原因分析**

**① 离线指标与业务目标不一致**

NDCG@10 优化的是"相关物品排得靠前"，但 CTR 关心的是"用户会不会点"。
两者可能背离：
- NDCG 高的模型可能推的是"用户已经买过/看过"的东西（相关但不需要）；
- 或者推的是"内容质量高但不吸引点击"的物品。

**② 离线数据偏差**

- 离线数据由**旧策略**产生（只有旧策略推过的物品有反馈）；
- 新模型可能把资源分配给旧数据中样本少的物品（分布外），离线评估不可靠；
- **位置偏差**：离线数据里位置 1 的 CTR 天然高，模型可能学到"要推旧策略排前面的"。

**③ 反馈回路效应**

离线是静态的。上线后新推荐改变用户行为，
新的曝光分布与离线完全不同，模型的表现随之变化。

**④ 未被指标覆盖的因素**

- **多样性下降**：新模型更"精准"但同质化，短期 CTR 降；
- **新鲜度不足**：总推同类，用户疲劳；
- **延迟增加**：模型更复杂导致响应变慢，用户流失。

**⑤ 实验结果本身的问题**

- 样本量不足，-1% 可能在噪声范围内；
- 分流不均匀；
- 与其它实验冲突（同时跑多个实验相互干扰）。

**二、排查方案**

**第 1 步：确认实验有效性**

- 检查分流是否均匀（两组用户特征分布）；
- 计算 p 值与置信区间（-1% 是否统计显著？）；
- 检查是否有其他实验同时进行（SRM 检查）。

**第 2 步：分维度拆解**

| 拆解维度 | 看什么 |
| --- | --- |
| 用户分层 | 新/老用户、高/低活用户的 CTR 变化 |
| 物品类型 | 热门/长尾、新/旧物品的点击变化 |
| 曝光位置 | 各位置的 CTR、曝光分布是否偏移 |
| 类目 | 哪些类目的推荐变了 |

如果只有部分人群/类目下降，说明问题定位更明确。

**第 3 步：检查链路指标**

- 曝光量、点击率、点击深度、停留时长、转化率；
- **延迟**：P50/P95 响应时间是否变差；
- 多样性：类目熵、长尾曝光占比。

**第 4 步：离线在线一致性诊断**

- 用**线上真实请求**的特征值，跑离线模型，对比预测；
- 检查特征口径（时间窗口、去重、空值处理）是否一致；
- 抽样 100 个用户，人工对比离线 Top-10 与线上实际展示。

**第 5 步：做一个"只换模型不换特征"的对照实验**

如果 NDCG 提升来自特征变化，需分离"模型 vs 特征"的贡献。

**三、正确的评估流程**

**① 离线阶段（筛子，不是裁判）**

- 用**多指标**：NDCG + Recall@K + GAUC + 多样性 + 覆盖率；
- **按时间切分**，不用随机切分；
- **加入业务约束指标**：如"重复推荐率"（推已购物品的比例）、
  平均价格、类目分布；
- 排除明显更差的方案即可，**不要指望离线选出最优**。

**② 离线与在线对齐**

- 建立**离线-在线相关性监控**：
  记录每次上线的离线指标与实际线上效果，看长期相关性；
- 若发现某类离线指标与线上负相关，调整离线指标体系。

**③ 在线 A/B（真正的裁判）**

- 小流量（1%~5%），跑**至少 1~2 周**（覆盖完整周期）；
- **核心指标**：CTR、CVR、人均时长、人均 GMV；
- **护栏指标**：延迟、多样性、长尾曝光、投诉率；
- 预先确定样本量与停止规则。

**④ 长期监控**

- 7 日/30 日留存；
- 用户兴趣广度是否收窄；
- 生态健康（长尾创作者曝光）。

**四、一个关键认知**

**"离线 NDCG 提升 3%" 本身不是结论，只是假设。**

真正的问题应该问：
- NDCG 提升来自哪里？（哪些用户、哪些类目？）
- 这些提升是否对应业务价值？
- 是否有某个维度在退化（被平均值掩盖）？

**正确的做法是把 NDCG 当作"必要非充分条件"**：
NDCG 不涨基本不用上线；NDCG 涨了也不代表能上线。

**最终判断永远是在线 A/B + 长期指标。**`,
        rubric: [
          { point: '离线指标与业务目标不一致（NDCG vs CTR）', score: 2 },
          { point: '离线数据偏差（旧策略、位置偏差、分布外）', score: 2 },
          { point: '反馈回路 + 多样性/新鲜度/延迟等未覆盖因素', score: 2 },
          { point: '排查：实验有效性检查 + 分维度拆解 + 链路指标', score: 2 },
          { point: '正确流程：离线多指标 + 离线在线对齐 + A/B + 长期监控', score: 2 },
        ],
        keywords: ['NDCG vs CTR', '位置偏差', '反馈回路', '分维度拆解', '护栏指标', '长期监控'],
        explanation:
          '能指出"离线指标只是必要非充分条件"，并给出分维度拆解与离线在线对齐的方法，就是成熟的推荐评估思维。',
        tags: ['推荐评估', '综合'],
      },
    ],
  },
];
