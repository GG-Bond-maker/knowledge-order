# -*- coding: utf-8 -*-
"""
Chapter 2: 实例学习与概率生成模型 (Instance-Based & Generative Probabilistic Models)
Course: ml-classical-algorithms
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_2():
    # ── Lesson 2.1 ──
    l1_content = """### 学习目标
学完本节，你应该能够：
1. 掌握基于实例的懒惰学习（Lazy Learning）核心理念与 $k$ 近邻算法（$k$-NN）的几何判决机制；
2. 深刻辨析不同距离度量（欧氏距离、曼哈顿距离、明可夫斯基距离与余弦相似度）的数学特征与量纲敏感度；
3. 从偏差—方差权衡（Bias-Variance Trade-off）严格推导超参数 $k$ 的选取准则（$k=1$ 的过拟合碎片边界 vs $k=N$ 的全局欠拟合）；
4. 掌握 KD-Tree（$k$-维树）与球树（Ball-Tree）空间分层索引剪枝算法，将近邻查询复杂度从 $O(N)$ 优化至 $O(\\log N)$；
5. 深刻理解**维数灾难（Curse of Dimensionality）**在高维空间中导致“所有点对彼此等距”的数学物理失效机理。

### 前置知识
- 向量空间欧氏距离与闵可夫斯基范数；
- 二叉搜索树（BST）空间二分剪枝。

### 问题背景与 ML 用途
绝大多数机器学习算法（如线性回归、神经网络）都是**急切学习者（Eager Learners）**：在训练阶段拼命调整参数拟合函数，一旦训练完成，训练样本就可以全部扔掉，推理时只需做前向计算。
而 **$k$ 近邻算法（$k$-NN）是纯粹的懒惰学习者（Lazy Learner）**：
- 训练阶段开销为零（仅做数据的内存持久化存储）；
- 所有的计算全部延迟到推理（Query）阶段：对每一个新样本，在整个历史数据库中动态寻找“与我最像的 $k$ 个邻居”，并通过多数表决或距离加权输出预测；
- 在现代大模型检索增强生成（RAG）、向量数据库（Milvus、FAISS）以及图像特征局部匹配中，KNN 的核心检索逻辑构成了近邻语义检索的通用底层。

### 直觉理解
- **近朱者赤，近墨者黑**：判断一个新搬来的邻居喜欢看什么电影，最简单的办法不是去建立一套复杂的社会学方程式，而是去小区里敲开离他物理距离最近的 5 个邻居的门（$k=5$），看这 5 个人平时最常看什么电影。如果 4 个都在看科幻片，那就断定他也喜欢看科幻片。
- **高维空间的空旷沙漠（维数灾难）**：在 1 维线段 $[0, 1]$ 上，100 个点密密麻麻；但在 100 维超立方体中，若每个维度切 10 份，需要 $10^{100}$ 个点才能达到相同密度（超过全宇宙原子总数）！高维空间中所有样本都孤零零地漂浮在超立方体的遥远表面角落，**任意两点之间的距离几乎完全相等**，“邻近”这一几何概念在高维空间中彻底失效！

### 核心概念与符号对照表
| 核心概念 | 符号 / 算法 | 数学定义 / 表达式 | 在机器学习中的核心用途 |
| --- | --- | --- | --- |
| **明氏距离** | $D_p(\\mathbf{x}, \\mathbf{y})$ | $\\left( \\sum_{j=1}^d |x_j - y_j|^p \\right)^{1/p}$ | $p=1$ 曼哈顿，$p=2$ 欧氏，$p=\\infty$ 切比雪夫 |
| **$k$ 值超参数** | $k$ | 参与多数投票判决的邻居个数 | 调节决策边界平滑度与过拟合水平 |
| **KD-Tree** | `KDTree` | 轮流沿各方差最大特征轴进行中位数二分空间划分 | $d < 20$ 低维空间极速近邻剪枝查找 |
| **球树** | `BallTree` | 使用超球体嵌套划分高维空间 | 适用于高维非均匀、流形分布数据 |
| **维数灾难** | $\\lim_{d \\to \\infty} \\frac{D_{\\max} - D_{\\min}}{D_{\\min}}$ | 相对距离方差比趋于 0 | 促使高维数据必须先做 PCA 降维或嵌入 |

### 数学原理与逐步推导
#### 1. 维数灾难的球体与立方体体积比收缩证明
考察一个边长为 $2r$ 的 $d$ 维超立方体，其内切超球体的半径为 $r$。
$d$ 维超立方体的体积为：
$$V_{\\text{cube}}(d) = (2r)^d = 2^d r^d$$
$d$ 维超球体的体积公式由伽马函数（Gamma Function）给出：
$$V_{\\text{sphere}}(d) = \\frac{\\pi^{d/2}}{\\Gamma\\left(\\frac{d}{2} + 1\\right)} r^d$$
考察内切球体积占外接立方体体积的比例：
$$\\frac{V_{\\text{sphere}}(d)}{V_{\\text{cube}}(d)} = \\frac{\\pi^{d/2}}{2^d \\Gamma\\left(\\frac{d}{2} + 1\\right)}$$
当维度 $d \\to \\infty$ 时，分母中的伽马函数呈阶乘级 $O((d/2)!)$ 暴增，而分子仅呈指数增长：
$$\\lim_{d \\to \\infty} \\frac{V_{\\text{sphere}}(d)}{V_{\\text{cube}}(d)} = 0$$
**数学结论**：
在高维空间中，内切球的体积占比迅速趋向于 0！
这说明**超立方体绝大部分的体积和质量，全都死死集中分布在远离中心的尖锐边角（Corners）处**！数据点极其稀疏地散布在边界外壳上，任何测试点到各个训练点的欧氏距离差别变得微乎其微，距离度量失去了区分密度密集的物理意义。

### 几何图景与计算图
```
超参数 k 对决策边界复杂度的几何影响：
k = 1 (极度复杂，低偏差、高方差):       k = 15 (平滑圆润，高偏差、低方差):
  Class 0 [o]     Class 1 [*]              Class 0 [o]     Class 1 [*]
       \  *  /                                  \         /
        \___/  <-- 产生孤岛碎片边界              \_______/  <-- 平滑稳健宏观边界
      (过拟合单个噪声点)                       (具备极高泛化抗噪性)
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：KNN 训练时间为 0，所以它是一个极快的高性能算法
> **大错特错！** KNN 是把所有计算负债全部推迟到了**推理预测阶段**！
> - 暴力搜索（Brute Force）对单个测试样本的推理复杂度为 $O(N d)$；若有 100 万个样本，每次预测都要计算 100 万次距离！
> - 即使使用 KD-Tree 剪枝，当维度 $d > 20$ 时，KD-Tree 的剪枝回溯效率会退化为接近暴力全表扫描（$O(N)$）。**KNN 是典型的“训练极爽、推理极慢”的算法**。

### 工业界实践与工程考量
- 在现代大规模近邻检索（如电商搜推广或 RAG 向量检索）中，工业界绝不使用纯精确 KNN，而是采用**近似近邻检索（Approximate Nearest Neighbors, ANN）**：基于图索引（HNSW，分层可导航小世界图）或局部敏感哈希（LSH），以牺牲 1% 的精度为代价，将千万级向量的检索延迟压缩至毫秒级（如 Facebook FAISS 库）。

### 延伸思考与进阶阅读
- 阅读 Jon Louis Bentley 经典论文《Multidimensional binary search trees used for associative searching》(CACM 1975)。
- 思考：如果特征中有分类变量（如颜色：红、绿、蓝），欧几里得距离就无法直接度量，此时应该采用什么混合距离？（提示：HEOM 异构欧几里得重叠度量）。

### 本节小结
- KNN 通过局部近邻多数表决分类，$k$ 值调节模型容量；
- 维数灾难使得高维空间距离度量退化，KD-Tree 在低维高效但在高维失效。"""

    l1_code = """import numpy as np
from sklearn.neighbors import KNeighborsClassifier
from sklearn.datasets import make_classification
import time

# 构造一个 2 维二分类数据集用于直观观察 k 值效应
np.random.seed(42)
X, y = make_classification(n_samples=200, n_features=2, n_informative=2, n_redundant=0, 
                           n_clusters_per_class=1, flip_y=0.1, random_state=42)

# 1. 拟合 k = 1 (过拟合极值) 与 k = 15 (平滑稳健模型)
knn_k1 = KNeighborsClassifier(n_neighbors=1).fit(X, y)
knn_k15 = KNeighborsClassifier(n_neighbors=15).fit(X, y)

print("=== 1. k 值对训练集拟合度的影响 ===")
print(f"k = 1  训练集准确率: {knn_k1.score(X, y):.2%} (100% 强行死记硬背每个噪声点!)")
print(f"k = 15 训练集准确率: {knn_k15.score(X, y):.2%} (容忍局部噪声，学习宏观边界)")

# 2. 模拟高维空间下的查询延迟对比: 暴力搜索 (Brute) vs KD-Tree
# 构造高维大数据场景: 10,000 个样本 x 10 维特征
X_big = np.random.randn(10000, 10)
y_big = np.random.randint(0, 2, size=10000)
X_query = np.random.randn(50, 10)

knn_brute = KNeighborsClassifier(n_neighbors=5, algorithm='brute').fit(X_big, y_big)
knn_kdtree = KNeighborsClassifier(n_neighbors=5, algorithm='kd_tree').fit(X_big, y_big)

t0 = time.perf_counter()
knn_brute.predict(X_query)
t_brute = time.perf_counter() - t0

t0 = time.perf_counter()
knn_kdtree.predict(X_query)
t_kd = time.perf_counter() - t0

print("\\n=== 2. 空间索引查询测速 (50 次查询) ===")
print(f"暴力全表遍历 (Brute Force) 耗时: {t_brute:.4f} 秒")
print(f"KD-Tree 二叉空间剪枝耗时: {t_kd:.4f} 秒")
print(f"KD-Tree 加速比: {t_brute / t_kd:.2f} 倍")
"""

    lesson_1 = lesson(
        lesson_id="ml-algo-l2-1",
        title="k 近邻算法与维数灾难：懒惰学习与空间索引剪枝",
        content=l1_content,
        difficulty=3,
        tips=[
            tip("k 必须选用奇数防平局：在二分类问题中，$k$ 值必须选取奇数（如 3, 5, 7），防止出现正负票数各半（Tie）导致的无序随机猜测。", "pitfall"),
            tip("必须在 KNN 前做标准化：KNN 计算的是欧氏距离，若某个特征未经标准化其方差是其他特征的千倍，该特征将完全主导距离度量，使其余特征失效。", "interview")
        ],
        demos=[
            demo(code=l1_code, title="KNN k 值偏差方差行为与 KD-Tree 查询加速对比")
        ]
    )

    # ── Lesson 2.2 ──
    l2_content = """### 学习目标
学完本节，你应该能够：
1. 掌握判别式模型（Discriminative）与生成式模型（Generative）在联合分布 $P(X, Y)$ 建模上的根本哲学分野；
2. 掌握朴素贝叶斯分类器的数学表达与**特征条件独立性假设（Conditional Independence）**；
3. 熟练掌握三大朴素贝叶斯家族变体的适用场景：**高斯朴素贝叶斯（GaussianNB）**、**多项式朴素贝叶斯（MultinomialNB）**与**伯努利朴素贝叶斯（BernoulliNB）**；
4. 掌握拉普拉斯平滑（Laplace Smoothing）解决零概率灾难（Zero Probability Disaster）的代数机制；
5. 编写代码对垃圾邮件文本词袋数据从零实现带拉普拉斯平滑的多项式朴素贝叶斯分类器。

### 前置知识
- 贝叶斯定理与条件概率分解；
- 独立同分布假设与高斯连续概率密度。

### 问题背景与 ML 用途
在自然语言处理与高维文本分类中，词汇量往往高达数万维（词表大小 $V = 50,000$）：
- 垃圾邮件分类过滤（Spam Filtering）；
- 法律文书、医学病历与新闻文章的快速主题自动分类；
- 情感分析（Sentiment Analysis）与舆情监控。
如果使用逻辑回归或深度神经网络，需要通过数十轮梯度下降耗费大量算力；
而**朴素贝叶斯（Naive Bayes）仅需一次单趟数据扫描（One-pass Scan）**，在几秒钟内完成所有先验与条件概率的闭式计数统计！其训练速度极其惊人，且在文本、生物信息学领域展现出异乎寻常的鲁棒分类性能。

### 直觉理解
- **侦探的嫌疑人特征画册（生成式建模）**：
  - 判别式模型（如逻辑回归、SVM）像一个严苛的考官，直接在地图上画一条红线（决策超平面），只关心“把两拨人分开”；
  - 生成式模型（朴素贝叶斯）像一位老刑警，他在脑海中分别为“正常邮件”和“垃圾邮件”各自建立了详细的特征肖像画册：一封典型的垃圾邮件长什么样？里面出现“中奖”、“免费”、“发票”的概率分别是多少？面对新邮件时，他分别比对两本画册，看这封邮件更符合哪一本画册的生成规律！

### 核心概念与符号对照表
| 核心概念 | 变体模型 | 特征假设与似然分布 | 典型应用场景 |
| --- | --- | --- | --- |
| **高斯朴素贝叶斯** | `GaussianNB` | 连续特征在各类中服从独立正态分布 $\\mathcal{N}(\\mu_{ck}, \\sigma_{ck}^2)$ | 传感器连续数值、医学体检指标 |
| **多项式朴素贝叶斯** | `MultinomialNB` | 离散多项分布（特征为词频整数计数 $x_j \\in \\mathbb{N}$） | 文本主题分类、TF-IDF 文本打标 |
| **伯努利朴素贝叶斯** | `BernoulliNB` | 伯努利分布（特征为二值布尔变量 $x_j \\in \\{0, 1\\}$） | 短文本/关键词是否出现指示器 |
| **拉普拉斯平滑** | $\\alpha = 1.0$ | $\\hat{P}(x_j=k \\mid y=c) = \\frac{N_{ck} + \\alpha}{N_c + \\alpha K}$ | 防止未登录词造成后验连乘清零 |

### 数学原理与逐步推导
#### 1. 朴素贝叶斯后验概率对数展开
根据贝叶斯定理，给定特征向量 $\\mathbf{x} = [x_1, \\dots, x_d]^T$，样本属于类别 $c$ 的后验概率为：
$$P(y = c \\mid \\mathbf{x}) = \\frac{P(y = c) P(\\mathbf{x} \\mid y = c)}{P(\\mathbf{x})}$$
由于分母 $P(\\mathbf{x})$ 对所有候选类别是固定相等的常数因子，分类判决准则为最大化分子联合概率：
$$\\hat{y} = \\arg\\max_{c \\in \\{1, \\dots, C\\}} P(y = c) P(\\mathbf{x} \\mid y = c)$$
应用核心假设——**各特征在给定类别条件下相互独立**：
$$P(\\mathbf{x} \\mid y = c) = \\prod_{j=1}^d P(x_j \\mid y = c)$$
在实际计算中，几百个小于 1 的概率小数连乘会立即触发计算机底层的**浮点数下溢（Floating-point Underflow）**变为 0。
为了保证数值绝对稳定，两边取自然对数，将**连乘转化为连加**：
$$\\hat{y} = \\arg\\max_{c} \\left[ \\ln P(y = c) + \\sum_{j=1}^d \\ln P(x_j \\mid y = c) \\right]$$
**惊人的代数映射**：
由于对数似然项在展开后可以整理为 $\\sum w_{cj} x_j + b_c$，这证明了**多项式朴素贝叶斯在对数空间中，在数学形式上竟然与线性分类器（线性超平面）完全等价**！

#### 2. 拉普拉斯平滑（Laplace Smoothing）的数学必要性
若测试文本中包含了一个单词“量子纠缠”，而这个词在训练集的所有“垃圾邮件”样本中从未出现过：
$$P(\\text{量子纠缠} \\mid \\text{Spam}) = 0$$
连乘公式中只要出现一个 0，整个类别的后验概率就会被无情地瞬间清零：
$$P(y = \\text{Spam} \\mid \\mathbf{x}) \\propto P(\\text{Spam}) \\times 0 \\times \\prod \\dots = 0$$
即使该邮件中其余 99 个词全都是“发票”、“中奖”、“代开”等典型垃圾词，模型也会武断地断定它绝不可能是垃圾邮件！
引入拉普拉斯平滑（分子加 1，分母加类别取值总数 $K$）：
$$\\hat{P}(x_j = v \\mid y = c) = \\frac{N_{cv} + 1}{N_c + K}$$
保证了未见特征分配到一个微小的基础概率先验，彻底消除了极端零概率盲区。

### 几何图景与计算图
```
生成式 vs 判别式决策几何：
判别式模型 (直接学习边界 P(Y|X)):     生成式模型 (分别学习两类密度 P(X|Y) 再贝叶斯逆推):
       │                                     │     密度峰值 0            密度峰值 1
       │      / (硬分界线)                   │      _---_                _---_
   Class 0   /   Class 1                  Class 0 /       \    分界点    /       \ Class 1
       │    /                                │   (         )     │      (         )
       └────────────────▶                    └───┴─────────┴─────┼──────┴─────────┴──▶
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：特征条件独立性假设在现实中几乎从来不成立，为什么朴素贝叶斯效果依然很好？
> 现实中词与词之间显然存在强烈关联（如“深度”和“学习”经常连在一起），条件独立性假设几乎永远被违反。但 Pedro Domingos 等学者在理论上证明了：**概率估计的绝对数值偏差并不影响分类决策的正确性**！只要最优类别的后验概率相对排序保持领先，即使绝对概率值估计得不准，最终的分类判决依然能够 100% 正确！

### 工业界实践与工程考量
- 在现代在线垃圾内容审核系统中，朴素贝叶斯常作为第一道粗筛网（L1 Filter）：凭借微秒级的极速推理，直接将 90% 毫无争议的正常内容放行，并将疑似违规内容交由庞大但耗时的下游深度学习大模型进行精细二次复审。

### 延伸思考与进阶阅读
- 阅读 Pedro Domingos, Michael Pazzani 经典论文《On the Optimality of the Simple Bayesian Classifier under Zero-One Loss》(Machine Learning, 1997)。
- 思考：如果输入特征是连续的并且呈现明显的双峰混合分布，强行套用单峰的高斯朴素贝叶斯会产生什么失真？此时应该如何用高斯混合模型（GMM）进行扩展？

### 本节小结
- 朴素贝叶斯基于联合分布逆推后验，条件独立性假设将复杂度降为单次计数；
- 拉普拉斯平滑根除零概率，三大变体覆盖高斯连续、多项计数与伯努利二值场景。"""

    l2_code = """import numpy as np
from sklearn.naive_bayes import MultinomialNB

# 构造一个微型垃圾邮件分类玩具词袋数据集 (4 篇文档，4 个词汇: [优惠, 免费, 论文, 算法])
# 词袋特征: 每行代表各词汇在当前文档中出现的频次
X_train = np.array([
    [3, 2, 0, 0],  # 垃圾邮件 1: "优惠 免费"
    [2, 3, 0, 0],  # 垃圾邮件 2: "优惠 免费"
    [0, 0, 4, 2],  # 正常邮件 1: "论文 算法"
    [0, 1, 2, 3],  # 正常邮件 2: "免费 论文 算法"
])
y_train = np.array([1, 1, 0, 0]) # 1: 垃圾邮件, 0: 正常邮件
vocab = ['优惠', '免费', '论文', '算法']

# 1. 使用 Scikit-Learn 的 MultinomialNB 进行拟合 (带拉普拉斯平滑 alpha=1.0)
nb = MultinomialNB(alpha=1.0)
nb.fit(X_train, y_train)

print("=== 1. 先验概率与条件概率分析 ===")
print("类别先验概率 P(y):", np.exp(nb.class_log_prior_))
print(f"词汇表: {vocab}")
print("正常邮件 (Class 0) 各词条件特征概率 P(w | Ham):\\n", np.round(np.exp(nb.feature_log_prob_[0]), 4))
print("垃圾邮件 (Class 1) 各词条件特征概率 P(w | Spam):\\n", np.round(np.exp(nb.feature_log_prob_[1]), 4))

# 2. 预测一封含有未见词组合的新邮件: "优惠 算法" -> [1, 0, 0, 1]
X_test = np.array([[1, 0, 0, 1]])
pred_class = nb.predict(X_test)[0]
pred_probs = nb.predict_proba(X_test)[0]

print("\\n=== 2. 测试样本分类预测 ===")
print("测试文档词频: [优惠=1, 免费=0, 论文=0, 算法=1]")
print(f"模型预测类别: 【{'垃圾邮件' if pred_class == 1 else '正常邮件'}】")
print(f"后验概率分布: P(正常) = {pred_probs[0]:.4f}, P(垃圾) = {pred_probs[1]:.4f}")
print("结论: 凭借拉普拉斯平滑，未见过的零频词不会抹杀分类，模型准确综合了两侧证据！")
"""

    lesson_2 = lesson(
        lesson_id="ml-algo-l2-2",
        title="朴素贝叶斯分类器家族：生成模型与拉普拉斯平滑",
        content=l2_content,
        difficulty=3,
        tips=[
            tip("必须在对数空间相加：工程实现朴素贝叶斯必须对先验与似然求 `np.log` 后相加，直接在实数域连乘必然会导致浮点数下溢为零。", "performance"),
            tip("拉普拉斯平滑不可或缺：MultinomialNB 必须设置 `alpha=1.0`（或大于 0 的平滑值），防止测试集中偶发未登录词导致整个分类后验清零。", "pitfall")
        ],
        demos=[
            demo(code=l2_code, title="MultinomialNB 垃圾文本词袋分类与条件特征概率实测")
        ]
    )

    lessons = [lesson_1, lesson_2]

    # ── Exercises for Chapter 2 ──
    exercises = [
        single_choice(
            ex_id="ml-algo-c2-ex1",
            question="在 $k$ 近邻算法（$k$-NN）中，如果将超参数 $k$ 设为极端小的值（例如 $k=1$），模型的偏差（Bias）与方差（Variance）在理论上会呈现何种变化趋势？",
            options=[
                {"value": "A", "text": "偏差极小、方差极大（模型极度复杂，容易死记硬背训练集中的孤立噪声点，导致严重的过拟合）"},
                {"value": "B", "text": "偏差极大、方差极小（模型极度欠拟合）"},
                {"value": "C", "text": "偏差和方差同时变为严格的 0"},
                {"value": "D", "text": "模型自动退化为全剧常量预测"},
            ],
            answer="A",
            explanation="当 $k=1$ 时，预测结果完全取决于距离最近的单个样本，决策边界极度破碎扭曲，训练集误差为 0（极低偏差），但对任何细微扰动或噪声点极其敏感（极高方差），呈现典型的高方差过拟合状态。",
            difficulty=2,
            related_lesson_id="ml-algo-l2-1",
            tags=["KNN", "k值选取", "偏差方差权衡", "过拟合"],
        ),
        judge(
            ex_id="ml-algo-c2-ex2",
            question="在高维特征空间中（例如维度 $d > 100$），由于“维数灾难”效应，超立方体绝大部分的体积都集中在遥远的边界角落，导致任意两个样本点之间的欧氏距离差异趋于微弱，使得基于距离的 $k$-NN 算法分类能力大幅退化。",
            answer=True,
            explanation="正确。随着维度增加，高维球体体积占外接立方体体积的比例指数级衰减至 0，样本极度稀疏，最大距离与最小距离的相对比值趋向于 0，欧氏距离丧失了度量局部紧密性的区分力。",
            difficulty=2,
            related_lesson_id="ml-algo-l2-1",
            tags=["维数灾难", "高维几何", "KNN失效机理"],
        ),
        multiple_choice(
            ex_id="ml-algo-c2-ex3",
            question="关于朴素贝叶斯（Naive Bayes）分类器家族及其数学机制，下列陈述正确的有：",
            options=[
                {"value": "A", "text": "多项式朴素贝叶斯（MultinomialNB）适用于文本词频或离散整数计数的特征场景"},
                {"value": "B", "text": "高斯朴素贝叶斯（GaussianNB）假设每个类别下的连续特征独立服从正态分布"},
                {"value": "C", "text": "拉普拉斯平滑（Laplace Smoothing）的作用是防止测试集中偶发未见词导致似然连乘归零"},
                {"value": "D", "text": "朴素贝叶斯属于判别式模型（Discriminative Model），直接建模后验概率 $P(Y \\mid X)$ 而无需关注特征联合分布"},
            ],
            answer=["A", "B", "C"],
            explanation="A、B、C 均为朴素贝叶斯的核心机制。D 是错误的：朴素贝叶斯是典型的概率生成式模型（Generative Model），它通过分别对各类别的先验 $P(Y)$ 和类条件似然 $P(X \\mid Y)$ 建模，进而由贝叶斯公式逆推后验概率。",
            difficulty=3,
            related_lesson_id="ml-algo-l2-2",
            tags=["朴素贝叶斯", "生成式模型", "MultinomialNB", "拉普拉斯平滑"],
        ),
        fill(
            ex_id="ml-algo-c2-ex4",
            question="在多项式朴素贝叶斯中，为消除零概率现象，拉普拉斯平滑（Laplace Smoothing）在条件概率估计的分母上加上了常数 $\\alpha \\times $____（其中 $\\alpha$ 为平滑系数，填空项为特征所有可能取值的总种类数）；在低维欧氏空间中通过二叉树轮流按方差主轴进行空间中位数二分剪枝的数据结构被称为 ____（KD-Tree）。",
            blanks=[
                ["K", "特征取值种类数", "词汇表大小", "类别数"],
                ["KD树", "KDTree", "k-d树", "k-维树"]
            ],
            explanation="拉普拉斯平滑分母加 $\\alpha K$（$K$ 为类别或词表尺寸）以保证概率归一化；空间分层剪枝树结构是 KD-Tree。",
            difficulty=2,
            related_lesson_id="ml-algo-l2-2",
            tags=["拉普拉斯平滑公式", "KD-Tree", "算法基础"],
        ),
        open_ex(
            ex_id="ml-algo-c2-ex5",
            question="【数理对比分析题】请系统对比**生成式模型（Generative Model）**与**判别式模型（Discriminative Model）**的根本哲学差异：\n1. 写出两类模型分别对什么联合概率或条件概率进行直接建模；\n2. 以朴素贝叶斯（生成式）和逻辑回归（判别式）为例，对比二者在训练方式、计算开销与参数更新机制上的不同；\n3. 阐明在面对存在大量缺失值、或只有极小规模训练样本时，哪类模型通常展现出更佳的适应鲁棒性及其数理原因。",
            reference_answer="""数理哲学与机制对比分析如下：
1. 概率建模本质差异：
   - 生成式模型（Generative）：直接对特征与标签的**联合概率分布 $P(X, Y) = P(Y)P(X \\mid Y)$** 进行显式建模，学习数据是如何“由不同类别分别生成出来的”；随后通过贝叶斯定理逆推后验概率：$P(Y \\mid X) = \\frac{P(X, Y)}{\\sum P(X, Y')}$；
   - 判别式模型（Discriminative）：不关心数据生成机制，直接对**条件后验概率 $P(Y \\mid X)$ 或硬决策边界 $f(X)$** 进行建模，其目标是寻找一条最优超平面将不同类别区分开。

2. 朴素贝叶斯 vs 逻辑回归对比：
   - 训练方式与开销：朴素贝叶斯只需单趟遍历数据集（One-pass Count）闭式统计频率即可得到参数，训练极其迅速；逻辑回归则需要通过多轮迭代梯度下降（或 L-BFGS）求解凸优化损失函数，计算开销较大；
   - 依赖性假设：朴素贝叶斯强假设特征在给定类别下相互条件独立；逻辑回归不对输入特征的联合分布做任何独立性假设，能够自由拟合特征间的相关性权重。

3. 缺失值与小样本适应性：
   - 生成式模型（朴素贝叶斯）在小样本和缺失值下表现更佳；
   - 数理原因：
     a. 收敛速率差异：吴恩达（Andrew Ng）在经典论文中证明，生成式模型的参数估计以 $O(\\log d)$ 的样本量即可逼近其渐近误差，而判别式模型需要 $O(d)$ 的样本量；因此在极小样本下，朴素贝叶斯的泛化表现往往超越逻辑回归；
     b. 缺失值天然容错：由于朴素贝叶斯的联合概率被拆解为单特征似然的连乘 $\\prod P(x_j \\mid y)$，当某个特征缺失时，只需直接在连乘项中跳过该维度，完全不需要进行繁重的插补，天然具有极致的缺失容错能力。""",
            explanation="深入辨析生成式与判别式模型的概率论第一性原理，对比朴素贝叶斯与逻辑回归在计算复杂度、小样本渐近收敛性与缺失值容错机制上的深层差异。",
            rubric=[
                {"point": "准确给出生成式建模 P(X, Y) 与判别式建模 P(Y|X) 的数学表达", "score": 25},
                {"point": "对比朴素贝叶斯闭式计数与逻辑回归梯度优化训练机制的差异", "score": 25},
                {"point": "明确指出朴素贝叶斯在极小样本下的渐近收敛优势（对数级对比线性级）", "score": 25},
                {"point": "深刻阐释朴素贝叶斯在连乘中直接略过缺失维度的天然容错机理", "score": 25},
            ],
            difficulty=4,
            related_lesson_id="ml-algo-l2-2",
            tags=["生成式模型", "判别式模型", "朴素贝叶斯", "逻辑回归", "数理哲学"],
        ),
        # ── Code Exercise 2 ──
        {
            "id": "ml-algo-c2-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】从零实现基于欧氏距离的 $k$ 近邻分类器（KNN Predictor）：\n编写函数 `knn_predict(X_train, y_train, X_test, k=3)`：\n接收训练集特征 `X_train`（2D 数组或列表）、训练集类别标签 `y_train`（1D 整数列表/数组，类别为 0 或 1）、测试集特征 `X_test`（2D 数组或列表）以及近邻数 `k`。\n对于 `X_test` 中的每个测试样本：\n1. 计算其到 `X_train` 中所有样本的欧几里得距离；\n2. 提取距离最小的 $k$ 个最近邻的类别标签；\n3. 通过多数表决（Majority Vote）决定预测类别；若票数平局，选取较小的类别标签数字。\n\n返回一个 Python 整数列表，包含所有测试样本的预测类别标签。\n\n最后一行请返回调用示例在测试数据 `X_tr = [[1.0, 1.0], [1.5, 1.5], [5.0, 5.0], [5.5, 5.5]]`, `y_tr = [0, 0, 1, 1]`, `X_te = [[1.2, 1.2], [4.8, 4.8]]`（$k=3$）下的计算结果。",
            "starterCode": "import numpy as np\n\ndef knn_predict(X_train, y_train, X_test, k: int = 3) -> list:\n    \"\"\"从零实现基于欧氏距离与多数表决的 KNN 分类预测器\"\"\"\n    # 请在此实现\n    ___\n\nX_tr_demo = [[1.0, 1.0], [1.5, 1.5], [5.0, 5.0], [5.5, 5.5]]\ny_tr_demo = [0, 0, 1, 1]\nX_te_demo = [[1.2, 1.2], [4.8, 4.8]]\nknn_predict(X_tr_demo, y_tr_demo, X_te_demo, k=3)\n",
            "setupCode": "",
            "expectedOutput": "[0, 1]",
            "answer": "import numpy as np\n\ndef knn_predict(X_train, y_train, X_test, k: int = 3) -> list:\n    X_train = np.array(X_train, dtype=float)\n    y_train = np.array(y_train, dtype=int)\n    X_test = np.array(X_test, dtype=float)\n    if X_train.ndim == 1:\n        X_train = X_train[:, None]\n    if X_test.ndim == 1:\n        X_test = X_test[:, None]\n    \n    preds = []\n    for x in X_test:\n        dists = np.linalg.norm(X_train - x, axis=1)\n        k_indices = np.argsort(dists)[:k]\n        k_labels = y_train[k_indices]\n        vals, counts = np.unique(k_labels, return_counts=True)\n        max_count = np.max(counts)\n        best_candidates = vals[counts == max_count]\n        preds.append(int(np.min(best_candidates)))\n    return preds\n\nX_tr_demo = [[1.0, 1.0], [1.5, 1.5], [5.0, 5.0], [5.5, 5.5]]\ny_tr_demo = [0, 0, 1, 1]\nX_te_demo = [[1.2, 1.2], [4.8, 4.8]]\nknn_predict(X_tr_demo, y_tr_demo, X_te_demo, k=3)\n",
            "tests": "X_tr_t = [[0.0], [1.0], [10.0]]\ny_tr_t = [0, 0, 1]\nX_te_t = [[0.5], [9.0]]\nres_t = knn_predict(X_tr_t, y_tr_t, X_te_t, k=1)\nassert res_t == [0, 1], f\"预测结果有误: {res_t}\"\n",
            "explanation": "计算测试样本到训练集的欧氏距离，通过 np.argsort 获取最近邻标签并用多数表决输出分类判决。",
            "tags": ["KNN", "欧氏距离", "多数表决", "NumPy编程实战"],
            "related_lesson_id": "ml-algo-l2-1",
        },
        single_choice(
            ex_id="ml-algo-c2-ex7",
            question="在实现多项式朴素贝叶斯时，为什么要将各特征的条件概率在自然对数空间中相加（$\\ln P(y) + \\sum \\ln P(x_j \\mid y)$），而不是直接在实数域中连乘？",
            options=[
                {"value": "A", "text": "在高维文本中几十个小于 1 的概率直接连乘会迅速触发计算机的浮点数下溢（Underflow）而归零，对数转换可将连乘化为加法并保证数值绝对稳定"},
                {"value": "B", "text": "因为对数转换能够自动将非线性模型转化为深度神经网络"},
                {"value": "C", "text": "因为如果不取对数，拉普拉斯平滑参数无法生效"},
                {"value": "D", "text": "因为取对数后可以完全忽略先验概率"},
            ],
            answer="A",
            explanation="由于概率值均在 $(0, 1)$ 区间，数百个小概率连续相乘在计算机 IEEE 754 浮点数表示下会以指数级衰减至零（浮点下溢）。转换为对数连加不仅防止数值下溢，而且加法运算在硬件上比乘法更加高效。",
            difficulty=2,
            related_lesson_id="ml-algo-l2-2",
            tags=["对数似然", "浮点数下溢", "数值稳定性"],
        ),
    ]

    return chapter(
        chapter_id="ml-algo-c2",
        course_id="ml-classical-algorithms",
        order=2,
        title="实例学习与概率生成模型",
        goal="掌握 KNN 懒惰学习机制与 KD-Tree 剪枝，理解维数灾难物理本质，掌握生成式朴素贝叶斯与拉普拉斯平滑。",
        lessons=lessons,
        exercises=exercises,
    )
