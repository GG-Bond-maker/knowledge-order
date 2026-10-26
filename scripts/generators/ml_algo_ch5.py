# -*- coding: utf-8 -*-
"""
Chapter 5: 无监督学习：聚类分析与流形降维 (Unsupervised Learning: Clustering & Manifold Dimensionality Reduction)
Course: ml-classical-algorithms
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_5():
    # ── Lesson 5.1 ──
    l1_content = """### 学习目标
学完本节，你应该能够：
1. 掌握无监督聚类的数学本质与簇内平方误差和（Inertia / WCSS）优化目标；
2. 严密掌握 Lloyd 算法（K-Means 标准算法）的双步交替优化过程（固定质心分配簇标签，固定标签更新质心位置）；
3. 从坐标下降与期望最大化（EM）视角严格证明 K-Means 算法的单调收敛性与局部极值局限；
4. 掌握 Arthur & Vassilvitskii 提出的 **K-Means++ 初始质心概率采样算法**，理解其如何将解的质量逼近比从无界提升至 $O(\\log k)$；
5. 掌握聚类评估的双核心手段：肘部法则（Elbow Method）与轮廓系数（Silhouette Coefficient, $s \\in [-1, 1]$）；
6. 编写代码从零实现 K-Means 单步交替迭代更新，并在多维空间评估聚类质量与质心漂移轨迹。

### 前置知识
- 欧几里得距离与均方误差；
- 矩阵切片与条件均值计算。

### 问题背景与 ML 用途
在真实的商业世界中，海量数据是没有现成人工标签的：
- 电商与银行业中成百上千万用户的消费记录，没有任何标注写明“高价值理财客户”或“价格敏感型客户”；
- 图像分割、异常入侵检测、基因表达谱分群、大模型文本语料主题聚类等场景全都是**无监督学习（Unsupervised Learning）**的主战场。
K-Means 是无监督聚类领域历史最悠久、应用最广泛、吞吐量最大的工业经典：
- 计算复杂度仅为 $O(t \\cdot k \\cdot n \\cdot d)$（线性依赖于样本数和维度）；
- 原理极其纯粹直观，是客户细分（Customer Segmentation）与向量量化（Vector Quantization）的基石。

### 直觉理解
- **选拔班级学习互助小组的组长与组员动态流动**：班主任要在班里选出 $k=3$ 个学习互助小组。
  - 第一步：先挑 3 个同学暂代组长（初始质心）；
  - 第二步：全班所有同学测量自己和哪位组长兴趣与成绩最接近，就走到哪位组长的桌子旁集合（分配样本到最近质心）；
  - 第三步：每个小组集合完毕后，大家重新投票选举出该组在几何中心位置的新组长（更新质心为均值）；
  - 重复第二步和第三步：同学们重新根据新组长换队，组内再重选新组长……直到所有人站定不再走动，分组彻底稳定！

### 核心概念与符号对照表
| 核心概念 | 符号 / 算法 | 数学定义 | 核心功能 |
| --- | --- | --- | --- |
| **簇内平方和** | $\\text{WCSS} = \\sum_{j=1}^k \\sum_{x_i \\in C_j} \\|x_i - \\mu_j\\|^2$ | 各点到其所属质心的欧氏距离平方和 | K-Means 极小化的核心目标函数 |
| **质心更新** | $\\mu_j = \\frac{1}{|C_j|} \\sum_{x_i \\in C_j} x_i$ | 当前簇内所有样本坐标的算术平均值 | 保证固定分配下平方误差最小 |
| **K-Means++** | $P(x) = \\frac{D(x)^2}{\\sum D(x)^2}$ | 距离现有所有质心越远的点越大概率被选为下一个新质心 | 避免初始质心堆叠，防止陷入局部极差解 |
| **轮廓系数** | $s(i) = \\frac{b(i) - a(i)}{\\max(a(i), b(i))}$ | $a(i)$ 簇内凝聚度，$b(i)$ 邻近簇分离度 | 评估聚类密实度与分离度的无监督指标 |

### 数学原理与逐步推导
#### 1. 簇内方差最小化目标的凸二次性与质心均值推导
K-Means 试图将 $n$ 个样本划分为 $k$ 个不相交的簇 $C_1, \\dots, C_k$，优化目标为：
$$\\min_{C_1, \\dots, C_k, \\mu_1, \\dots, \\mu_k} \\mathcal{J} = \\sum_{j=1}^k \\sum_{x_i \\in C_j} \\|x_i - \\mu_j\\|^2$$
假设当前样本到各簇的分配方案 $\{C_j\}$ 已经固定，优化各簇质心 $\\mu_j$：
对目标函数关于质心 $\\mu_j$ 求偏导：
$$\\nabla_{\\mu_j} \\mathcal{J} = -2 \\sum_{x_i \\in C_j} (x_i - \\mu_j) = 0$$
$$\\sum_{x_i \\in C_j} x_i - |C_j| \\mu_j = 0 \\implies \\mu_j = \\frac{1}{|C_j|} \\sum_{x_i \\in C_j} x_i$$
**结论**：使得连续二次欧氏误差最小的质心位置，**在数学上严格等于簇内样本的算术平均值（Mean）**！

#### 2. K-Means++ 初始化概率采样机制
标准 K-Means 若随机初始化，很容易挑中聚在同一个真实簇内的两个点，导致其余大范围样本无质心覆盖。
Arthur & Vassilvitskii 提出的 K-Means++ 初始化步骤如下：
1. 从数据集 $X$ 中均匀随机选择第一个质心 $\\mu_1$；
2. 对于数据集中每个样本点 $x$，计算其到**已有所有质心**的最近欧氏距离：
   $$D(x) = \\min_{m=1, \\dots, j-1} \\|x - \\mu_m\\|$$
3. 以概率正比于距离平方 $D(x)^2$ 抽取下一个质心 $\\mu_j$：
   $$P(x) = \\frac{D(x)^2}{\\sum_{x' \\in X} D(x')^2}$$
4. 重复步骤 2 和 3，直到选出 $k$ 个质心。
这一策略在数学上以概率保证了新质心尽可能相互分散，将期望收敛误差界牢牢锚定在 $O(\\log k)$。

### 真实代码示例与分析
下面展示使用 Scikit-learn 的 `KMeans` 聚类，比较随机初始化与 K-Means++ 的 Inertia 损失，并计算轮廓系数："""

    l1_code = """import numpy as np
from sklearn.cluster import KMeans
from sklearn.datasets import make_blobs
from sklearn.metrics import silhouette_score

# 1. 生成 4 个具有明显间距的 2D 数据簇
X, y_true = make_blobs(n_samples=500, centers=4, cluster_std=0.60, random_state=42)

# 2. 对比随机初始化 vs K-Means++
kmeans_random = KMeans(n_clusters=4, init='random', n_init=1, random_state=10)
kmeans_random.fit(X)
inertia_rand = kmeans_random.inertia_
sil_rand = silhouette_score(X, kmeans_random.labels_)

kmeans_plus = KMeans(n_clusters=4, init='k-means++', n_init=1, random_state=10)
kmeans_plus.fit(X)
inertia_plus = kmeans_plus.inertia_
sil_plus = silhouette_score(X, kmeans_plus.labels_)

print(f"随机初始化   : WCSS 惯性损失 = {inertia_rand:.2f} | 轮廓系数 = {sil_rand:.4f}")
print(f"K-Means++ 采样: WCSS 惯性损失 = {inertia_plus:.2f} | 轮廓系数 = {sil_plus:.4f}")
print(f"质心坐标 (K-Means++):\\n{np.round(kmeans_plus.cluster_centers_, 2)}")
"""

    l1_tips = [
        tip("K-Means 假设各个簇在几何上是球形（Spherical）且方差相近。如果数据簇呈现狭长条形、环形或密度差异巨大，K-Means 会强行将其切割为破碎的凸球体，此时必须使用密度聚类 DBSCAN 或高斯混合模型 GMM。", "pitfall"),
    ]

    # ── Lesson 5.2 ──
    l2_content = """### 学习目标
学完本节，你应该能够：
1. 掌握基于密度的聚类算法 **DBSCAN（Density-Based Spatial Clustering of Applications with Noise）** 的核心思想；
2. 严密区分核心样本点（Core Point）、边界点（Border Point）与离群噪声点（Noise / Outlier）；
3. 掌握邻域半径 $\\epsilon$（Eps）与密度阈值 $\\text{MinPts}$ 双超参数的物理意义；
4. 掌握直接密度可达（Directly Density-Reachable）、密度可达（Density-Reachable）与密度相连（Density-Connected）的图连通定义；
5. 理解 DBSCAN 如何在无需预设簇数量 $k$ 的前提下，自然发现任意复杂非凸形状（如双月形、同心环形）并精准滤除噪声。

### 前置知识
- 拓扑邻域与图的连通分量遍历（广度优先搜索 BFS）；
- 距离度量矩阵。

### 问题背景与 ML 用途
K-Means 存在两大严重的结构性缺陷：
1. 必须由人工预先主观指定簇数量 $k$；
2. 每一个样本必须被硬分配给某个质心，即便该样本是个远在火星的离群异常噪声点！而且它只能拟合凸多边形球体。
1996 年，Ester、Kriegel 等人提出了 **DBSCAN 算法**：
- **完全不需要预先指定聚类数量 $k$**，它能根据密度的自然山川走势自主发现数据内部究竟有几个簇；
- **天生具备离群点检测能力**，凡是身处荒芜人烟稀疏区域的点，直接贴上“噪声（Noise = -1）”标签；
- **彻底击碎球形假设**，能够完美聚出“环形嵌套”、“S 型长蛇”、“任意连通流形”。在地理空间信息分析（GIS）、雷达轨迹聚类与金融黑产团伙挖掘中极其关键。

### 直觉理解
- **走街串巷的走访调查（密度的连通性）**：
  - 核心点就像是繁华商业街的旺铺：在以它为圆心半径 $\\epsilon$ 的范围内，聚集了至少 $\\text{MinPts}=5$ 家商铺；
  - 只要两家旺铺彼此靠得足够近（密度可达），它们就自然合并成同一条繁华商业街（同一个簇）；
  - 位于商业街最外围的小推车虽然自己周围凑不够 5 家，但因为它挨着旺铺，所以被当作该商业街的“边缘点”保留；
  - 而远在荒郊野岭、方圆几公里只有自己一间茅草屋的点，因为周围没有任何核心点支持，被果断标记为“孤立噪声”！

### 核心概念与符号对照表
| 核心概念 | 条件定义 | 物理意义 | 在 DBSCAN 中的行为 |
| --- | --- | --- | --- |
| **核心点** | $|N_\\epsilon(\\mathbf{x})| \\ge \\text{MinPts}$ | 局部高密度中心点 | 触发新簇的建立或簇的区域生长扩张 |
| **边界点** | $|N_\\epsilon(\\mathbf{x})| < \\text{MinPts}$ 且落在某核心点邻域内 | 位于簇的外围边缘 | 归属于该核心点所在的簇，不向外扩张 |
| **噪声点** | 既不是核心点，也不落在任何核心点邻域内 | 离群孤立异常值 | 标记为 Label = -1（有效净化数据集） |
| **密度相连** | 存在点 $\\mathbf{o}$，使得 $\\mathbf{x}$ 和 $\\mathbf{y}$ 均从 $\\mathbf{o}$ 密度可达 | 保证聚类的等价关系对称性与传递性 | 构成一个最大连通密度的簇 |

### 几何直觉与图解
```
   X2 ^
      |       * (边界点)
      |     /  
      |   (核心点)---(核心点)---(核心点)   <-- 区域生长相连 (簇 1)
      |    \          /
      |      (核心点)
      |
      |                                  x (噪声点 Noise: 孤零零)
      +----------------------------------------------------> X1
```

### 真实代码示例与分析
下面展示使用 Scikit-learn 的 `DBSCAN` 轻松征服双半月形（`make_moons`）非凸流形数据，并对比 K-Means 的惨败："""

    l2_code = """import numpy as np
from sklearn.datasets import make_moons
from sklearn.cluster import DBSCAN, KMeans

# 1. 生成经典的双半月形非线性数据集 (500 样本，附加微量噪声)
X, y_true = make_moons(n_samples=500, noise=0.08, random_state=42)

# 2. 使用 K-Means 聚类 (强行用直线切分球体)
kmeans = KMeans(n_clusters=2, random_state=42)
kmeans_labels = kmeans.fit_predict(X)

# 3. 使用 DBSCAN 密度聚类 (eps=0.2, min_samples=5)
dbscan = DBSCAN(eps=0.2, min_samples=5)
db_labels = dbscan.fit_predict(X)

# 统计 DBSCAN 聚类结果
n_clusters_db = len(set(db_labels)) - (1 if -1 in db_labels else 0)
n_noise_db = list(db_labels).count(-1)

print(f"K-Means 预测簇数量: 2 (局限于凸切分，无法捕捉月牙流形弯曲)")
print(f"DBSCAN  自动识别簇数量: {n_clusters_db} 簇")
print(f"DBSCAN  滤除的离群噪声点数量: {n_noise_db} 个")
print(f"DBSCAN  前 10 个样本预测标签: {db_labels[:10]}")
"""

    l2_tips = [
        tip("DBSCAN 对参数 eps 和 min_samples 较为敏感。如果数据集中各簇的密度差异极其巨大（一个簇极其紧密，另一个簇非常松散），全局单一固定的 eps 将无法兼顾。这种场景下建议使用变密度聚类算法 OPTICS 或 HDBSCAN。", "pitfall"),
    ]

    # ── Lesson 5.3 ──
    l3_content = """### 学习目标
学完本节，你应该能够：
1. 深刻理解传统线性降维（如 PCA 最大方差投影）在复杂非线性流形（Manifold）上的信息坍塌缺陷；
2. 掌握 van der Maaten & Hinton 提出的 **t-SNE（t-Distributed Stochastic Neighbor Embedding）** 算法机理；
3. 掌握高维空间高斯分布条件概率与对称联合概率 $p_{ij}$ 的构建过程；
4. 掌握低维嵌入空间中采用自由度为 1 的 **Student-t 长尾分布** $q_{ij} = \\frac{(1 + \\|y_i - y_j\\|^2)^{-1}}{\\sum_k \\sum_{l \\ne k} (1 + \\|y_k - y_l\\|^2)^{-1}}$ 的数学动机；
5. 深入透析 **“拥挤问题”（Crowding Problem）** 的几何物理本质，推导 KL 散度目标函数关于低维坐标的梯度更新；
6. 掌握新一代流形降维算法 **UMAP** 的核心优势，编写代码直观对比 PCA 与 t-SNE 在高维手写数字数据上的流形展开效果。

### 前置知识
- 主成分分析（PCA）特征值分解；
- 相对熵（Kullback-Leibler 散度）与梯度下降。

### 问题背景与 ML 用途
高维数据（如 784 维手写数字图像、数千维的单细胞 RNA 测序基因组、大模型上万维的 Token 向量 Embedding）直接让人类视觉无法理解。
PCA 是一种线性正交投影，其目标是尽可能保留全局的绝对方差。但如果真实数据是一个弯曲在低维超曲面上的“瑞士卷”（Swiss Roll）或复杂的局部近邻网络，PCA 会粗暴地将远隔数层的曲面直接拍扁压在同一平面上，彻底毁灭数据的内在几何流形结构。
**t-SNE 与 UMAP 是当今数据科学界探索高维表征的最强可视化显微镜**：
- 它们优先保留**局部近邻的概率拓扑相似性**；
- 在生物信息学（单细胞亚群分群）、深度学习表征质检（检查 Embedding 是否把同类语义聚在一起）中是不可或缺的探索分析工具。

### 直觉理解
- **弹簧动力学与长尾排斥力**：
  - 把所有高维样本想象成通过小弹簧连接的铁珠：如果两个点在高维中靠得很近，弹簧拉力极强；如果很远，拉力几乎为零；
  - **拥挤问题（为什么高维投影到 2D 会爆炸？）**：在高维空间中，一个点周围可以容纳成百上千个“互相彼此垂直、等距”的近邻。但如果强行把它们塞进狭小的 2 维平面，2 维平面的圆周表面积根本容纳不下这么多邻居，导致所有点全部被挤成一团面糊！
  - **Student-t 分布的解药**：t 分布在远端比高斯分布有更厚的长尾（Heavy Tail）。这意味着在低维空间中，**稍远一点的距离就能产生与高维极小概率相等的相似度**。这相当于给了低维点强烈的“空间排斥力”，强行把不同的簇弹开拉远，从而让聚类结构清晰呈现！

### 核心概念与符号对照表
| 核心概念 | 符号 / 公式 | 统计学本质 | 核心作用 |
| --- | --- | --- | --- |
| **高维联合概率** | $p_{ij} = \\frac{p_{j|i} + p_{i|j}}{2n}$ | 高维空间两点成邻居的对称联合高斯概率 | 刻画高维局部邻近拓扑 |
| **低维 t 分布概率** | $q_{ij} = \\frac{(1 + \\|y_i - y_j\\|^2)^{-1}}{\\sum_k \\sum_{l \\ne k} (1 + \\|y_k - y_l\\|^2)^{-1}}$ | 自由度为 1 的柯西长尾概率分布 | 抵抗高维拥挤，拉开异类簇间距 |
| **优化目标** | $\\mathcal{L} = \\text{KL}(P \\parallel Q) = \\sum_i \\sum_j p_{ij} \\ln \\frac{p_{ij}}{q_{ij}}$ | 高维与低维概率分布之间的 KL 散度 | 惩罚高维相近但在低维被分离开的违例 |
| **困惑度** | `perplexity` (通常 5~50) | 相当于有效最近邻居数量的平滑超参数 | 控制局部细节与全局宏观平衡 |

### 数学原理与逐步推导
#### 1. KL 散度不对称性对近邻保持的偏好
观察 KL 散度关于 $p_{ij}$ 和 $q_{ij}$ 的公式：
$$\\text{KL}(P \\parallel Q) = \\sum_{i \\ne j} p_{ij} \\ln \\frac{p_{ij}}{q_{ij}}$$
- **情况 1：高维距离极近（$p_{ij}$ 很大）**：
  若在低维中误将它们排得很远（$q_{ij} \\to 0$），则 $\\ln(p_{ij}/q_{ij}) \\to +\\infty$，导致 $p_{ij} \\ln(p_{ij}/q_{ij})$ 产生**毁灭性的巨大惩罚**！因此模型拼死也要保证高维中的近邻在低维中依然紧紧相聚！
- **情况 2：高维距离很远（$p_{ij} \\to 0$）**：
  此时无论低维中 $q_{ij}$ 是大是小，$p_{ij} \\ln(p_{ij}/q_{ij}) \\approx 0$，惩罚极其轻微。
**结论**：t-SNE 的天生数学倾向是**极度强硬地保持局部微观近邻结构**，而对全局宏观远距离相对宽容。

#### 2. 坐标更新梯度的物理弹簧受力分析
KL 散度关于低维嵌入坐标 $y_i$ 的导数形式异常简洁优雅：
$$\\frac{\\partial \\text{KL}}{\\partial y_i} = 4 \\sum_j (p_{ij} - q_{ij}) (y_i - y_j) (1 + \\|y_i - y_j\\|^2)^{-1}$$
- 当 $p_{ij} > q_{ij}$ 时：产生**正向引力（Attraction）**，拉近 $y_i$ 和 $y_j$；
- 当 $p_{ij} < q_{ij}$ 时：产生**反向斥力（Repulsion）**，推开 $y_i$ 和 $y_j$。
整个算法本质上是在模拟一个粒子物理系统，在引力与斥力的博弈中达到能量最低稳态！

### 真实代码示例与分析
下面展示使用 Scikit-learn 对 64 维手写数字图像（Digits）分别应用 PCA 和 t-SNE 降维至 2 维，对比两者的聚类辨识度："""

    l3_code = """import numpy as np
from sklearn.datasets import load_digits
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE

# 1. 加载 64 维手写数字数据集 (0~9 共 10 个类别)
digits = load_digits()
X, y = digits.data[:600], digits.target[:600]

# 2. 线性 PCA 降维至 2D
pca = PCA(n_components=2, random_state=42)
X_pca = pca.fit_transform(X)
var_ratio = np.sum(pca.explained_variance_ratio_)

# 3. 非线性 t-SNE 流形嵌入降维至 2D (perplexity=30)
tsne = TSNE(n_components=2, perplexity=30, random_state=42)
X_tsne = tsne.fit_transform(X)

print(f"原始数据维度: {X.shape}")
print(f"PCA 2D 降维结果形状: {X_pca.shape} (保留方差占比: {var_ratio * 100:.1f}%)")
print(f"t-SNE 2D 嵌入结果形状: {X_tsne.shape}")
print(f"t-SNE 最终收敛的 KL 散度: {tsne.kl_divergence_:.4f}")
print("结论: PCA 将非线性手写字大幅重叠混淆；而 t-SNE 将 10 类数字完全分立为各自独立的岛屿！")
"""

    l3_tips = [
        tip("t-SNE 的低维坐标只是用于探索性可视化展示的非参数嵌入，它没有像 PCA 那样的转换投影矩阵（W），因此无法直接对新测试样本进行 transform() 推理！切忌将 t-SNE 的输出特征直接作为分类器的离线输入特征。", "pitfall"),
        tip("UMAP 在保留局部结构的同时能更好地保持全局宏观拓扑结构，且计算速度显著快于 t-SNE，还支持对新样本进行 transform() 映射，是当今超大规模向量嵌入的首选工具。", "note"),
    ]

    lessons = [
        lesson("ml-algo-l5-1", "划分聚类：K-Means 与 K-Means++ 算法", l1_content, 2, l1_tips, [demo(code=l1_code, title="K-Means++ 聚类与轮廓系数评估")]),
        lesson("ml-algo-l5-2", "密度聚类：DBSCAN 算法与任意形状簇发现", l2_content, 3, l2_tips, [demo(code=l2_code, title="DBSCAN 双月流形聚类与噪声滤除")]),
        lesson("ml-algo-l5-3", "非线性降维与数据流形可视化：t-SNE 与 UMAP", l3_content, 3, l3_tips, [demo(code=l3_code, title="手写数字 PCA 线性投影 vs t-SNE 流形展开")]),
    ]

    exercises = [
        single_choice(
            ex_id="ml-algo-c5-ex1",
            question="标准 K-Means 算法在处理下列哪种几何结构的数据簇时，聚类效果通常最差并会强行将真实簇割裂？",
            options=[
                {"value": "A", "text": "具有明显双重嵌套同心环形（Concentric Rings）分布的数据"},
                {"value": "B", "text": "方差大致均等且各向同性的紧凑球形高斯点云"},
                {"value": "C", "text": "各簇样本数量完全相同的规则多面体点群"},
                {"value": "D", "text": "簇间距极其巨大的孤立致密点团"},
            ],
            answer="A",
            explanation="K-Means 最小化欧氏距离平方和，几何本质是用垂直平分超平面（Voronoi 胞腔）划分空间，隐式假设所有簇为凸球体（Concentric rings 是典型的非凸环形几何），会导致 K-Means 将外环割碎成若干段并与内圈强行混合。",
            difficulty=2,
            related_lesson_id="ml-algo-l5-1",
            tags=["K-Means", "凸球形假设", "非凸几何失效"],
        ),
        judge(
            ex_id="ml-algo-c5-ex2",
            question="DBSCAN 算法不需要使用者预先显式指定簇的数量 $k$，能够自动探测并发现任意复杂的非凸几何形状簇，并且具备将离群点标记为噪声（-1）的原生能力。",
            answer=True,
            explanation="正确。DBSCAN 基于密度相连性进行区域生长，不需要预先设定 k，能够发现任意形状的簇，且不满足核心点或边界点条件的孤立点会被直接标记为噪声点。",
            difficulty=1,
            related_lesson_id="ml-algo-l5-2",
            tags=["DBSCAN", "密度聚类", "噪声识别"],
        ),
        multiple_choice(
            ex_id="ml-algo-c5-ex3",
            question="关于无监督聚类质量评估指标“轮廓系数”（Silhouette Coefficient $s$），下列陈述中正确的有：",
            options=[
                {"value": "A", "text": "轮廓系数的取值范围为 $[-1, +1]$"},
                {"value": "B", "text": "若 $s \\approx 1$，表明样本到其所属簇内部非常紧凑（簇内距离小），且距离最近的异类簇非常遥远（簇间分离度高）"},
                {"value": "C", "text": "若 $s < 0$，表明样本到所属簇内其他点的距离平均值甚至大于到其他临近簇的距离，说明该样本大概率被误聚类"},
                {"value": "D", "text": "轮廓系数必须依赖于真实的人工标注标签（Ground Truth）才能完成计算"},
            ],
            answer=["A", "B", "C"],
            explanation="轮廓系数取值 [-1, 1]，通过样本自身与簇内的平均距离 a(i) 和与最近异簇的平均距离 b(i) 计算 s = (b - a) / max(a, b)。它完全属于纯粹的无监督几何评估指标，不需要任何真实标签，因此 D 错误。",
            difficulty=2,
            related_lesson_id="ml-algo-l5-1",
            tags=["轮廓系数", "聚类评估", "无监督指标"],
        ),
        fill(
            ex_id="ml-algo-c5-ex4",
            question="在 K-Means++ 算法中，为避免初始质心过于密集，下一个质心被选中的概率 $P(x)$ 与该样本到当前已有全部质心的最短欧几里得距离的 ___ 成正比（请填写中文词汇，如“平方”或“立方”）。",
            blanks=[["平方", "二次方"]],
            explanation="K-Means++ 采样概率公式为 P(x) = D(x)^2 / sum(D(x)^2)，其中 D(x) 为点 x 到已有所有质心的最近距离，距离的平方项能极大概率选中远离已有质心的孤立样本。",
            difficulty=2,
            related_lesson_id="ml-algo-l5-1",
            tags=["K-Means++", "质心初始化", "概率采样"],
        ),
        open_ex(
            ex_id="ml-algo-c5-ex5",
            question="请详细解释 t-SNE 算法中著名的“拥挤问题”（Crowding Problem）产生的几何物理原因，并说明为什么在低维嵌入空间中使用自由度为 1 的 Student-t 分布（柯西分布）能够成功化解该问题。",
            reference_answer="1. 拥挤问题的几何成因：\n在超高维空间中，空间的容积随着维度指数级膨胀。一个点周围可以容纳极其庞大数量的彼此互相垂直、互相等距的正交近邻点。但是，当我们将这些点强行投影映射到狭小的 2 维或 3 维欧氏空间时，低维空间的表面积和体积急剧缩小，根本无法提供足够的几何空间来同时安放所有等距的邻近点。如果低维空间仍沿用高斯分布，所有稍远一点的簇都会被这股空间挤压力量压缩推挤到中心区域，导致不同类别的簇在 2D 平面上严重重叠塌陷成一团面糊，这就是拥挤问题。\n2. Student-t 分布的化解机制：\n自由度为 1 的 Student-t 分布（柯西分布）相比高斯分布具有更厚的‘长尾’（Heavy Tail）。在长尾分布下，要让低维的相似度概率 q_ij 匹配高维中一个中等或较小的相似度概率 p_ij，低维空间中的两个点必须被放置在比高斯分布下远得多的物理欧几里得距离之外。这种长尾特性在低维空间中为点对赋予了强大的排斥力（Repulsion），强行将原本被挤成一团的异类簇远远弹开，从而完美解决了拥挤问题，呈现出清晰独立的聚类斑块。",
            explanation="从高维与低维空间几何容积的落差出发解释拥挤问题，并分析 Student-t 长尾分布的排斥拉伸作用机理。",
            rubric=[
                {"points": 5, "description": "从高维空间容积巨大到低维欧氏空间容积剧烈萎缩的角度清晰解释拥挤问题的本质"},
                {"points": 5, "description": "从 Student-t 分布的长尾特性赋予低维簇间强排斥力、拉大欧氏距离的角度解释其化解机理"},
            ],
            difficulty=3,
            related_lesson_id="ml-algo-l5-3",
            tags=["t-SNE", "拥挤问题", "Student-t分布", "流形降维"],
        ),
        # ── Code Exercise 5 ──
        {
            "id": "ml-algo-c5-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】从零实现 K-Means 单步更新迭代函数：\n编写函数 `kmeans_step(X, centroids)`：\n1. `X` 为二维样本数组或嵌套列表（形状 $N \\times D$）；\n2. `centroids` 为二维初始质心数组或嵌套列表（形状 $K \\times D$）；\n请完成单轮 Lloyd 迭代：\n步骤 A：计算每个样本点到所有质心的欧氏距离，将样本分配给距离最近的质心编号（从 0 开始）；\n步骤 B：针对每个簇，计算分配给该簇的所有样本的算术平均值作为新质心坐标；若某簇在这一轮没有被分配到任何样本，则保持原质心坐标不变。\n\n函数返回元组 `(labels, new_centroids)`：\n- `labels`：长度为 $N$ 的 Python 整数列表，记录每个样本的簇索引；\n- `new_centroids`：形状为 $K \\times D$ 的 Python 嵌套列表，每个坐标保留 4 位小数。\n\n最后一行请以 `X_demo = [[0.0, 0.0], [0.5, 0.0], [5.0, 5.0], [5.0, 6.0]]`, `c_demo = [[0.0, 0.0], [4.0, 4.0]]` 调用该函数测试。",
            "starterCode": "import numpy as np\nfrom typing import Tuple, List\n\ndef kmeans_step(X, centroids) -> Tuple[List[int], List[List[float]]]:\n    \"\"\"从零执行单步 K-Means 簇分配与新质心算术平均更新\"\"\"\n    # 请在此实现\n    ___\n\nX_demo = [[0.0, 0.0], [0.5, 0.0], [5.0, 5.0], [5.0, 6.0]]\nc_demo = [[0.0, 0.0], [4.0, 4.0]]\nkmeans_step(X_demo, c_demo)\n",
            "setupCode": "",
            "expectedOutput": "([0, 0, 1, 1], [[0.25, 0.0], [5.0, 5.5]])",
            "answer": "import numpy as np\nfrom typing import Tuple, List\n\ndef kmeans_step(X, centroids) -> Tuple[List[int], List[List[float]]]:\n    X = np.array(X, dtype=float)\n    centroids = np.array(centroids, dtype=float)\n    n, d = X.shape\n    k = len(centroids)\n    \n    # 步骤 A: 距离计算与簇分配\n    # dists 形状 (N, K)\n    dists = np.linalg.norm(X[:, None, :] - centroids[None, :, :], axis=2)\n    labels = np.argmin(dists, axis=1)\n    \n    # 步骤 B: 质心均值更新\n    new_cents = np.zeros_like(centroids)\n    for j in range(k):\n        assigned_pts = X[labels == j]\n        if len(assigned_pts) > 0:\n            new_cents[j] = np.mean(assigned_pts, axis=0)\n        else:\n            new_cents[j] = centroids[j]\n            \n    new_cents_list = [[round(float(val), 4) for val in row] for row in new_cents]\n    labels_list = [int(lab) for lab in labels]\n    return labels_list, new_cents_list\n\nX_demo = [[0.0, 0.0], [0.5, 0.0], [5.0, 5.0], [5.0, 6.0]]\nc_demo = [[0.0, 0.0], [4.0, 4.0]]\nkmeans_step(X_demo, c_demo)\n",
            "tests": "X_t = [[1.0], [2.0], [18.0], [19.0]]\nc_t = [[0.0], [20.0]]\nlabs, n_c = kmeans_step(X_t, c_t)\nassert labs == [0, 0, 1, 1] and n_c == [[1.5], [18.5]], f\"测试不匹配: {labs}, {n_c}\"\n",
            "explanation": "利用广播计算所有点到所有质心的欧式距离矩阵，通过 argmin 得到样本所属簇编号，随后按簇分组求均值更新质心。",
            "tags": ["K-Means", "质心更新", "广播矩阵", "无监督实战"],
            "related_lesson_id": "ml-algo-l5-1",
        },
        single_choice(
            ex_id="ml-algo-c5-ex7",
            question="在 DBSCAN 算法中，若一个样本点 $p$ 满足：在以其为中心的 $\\epsilon$ 邻域内所包含的样本总数小于 $\\text{MinPts}$，但点 $p$ 恰好落在了某个核心点 $q$ 的 $\\epsilon$ 邻域之内，则点 $p$ 的法定身份被判定为：",
            options=[
                {"value": "A", "text": "核心点（Core Point）"},
                {"value": "B", "text": "边界点（Border Point）并被纳入点 $q$ 所在的簇"},
                {"value": "C", "text": "离群噪声点（Noise Point）被标记为 -1"},
                {"value": "D", "text": "独立成为一个新的孤立簇的中心"},
            ],
            answer="B",
            explanation="根据 DBSCAN 定义，核心点必须满足邻域内样本数 >= MinPts；若自身邻域不达标，但落在至少一个核心点的 eps 邻域内，则属于边界点，被收编至该核心点所在的簇中。",
            difficulty=2,
            related_lesson_id="ml-algo-l5-2",
            tags=["DBSCAN", "边界点", "核心点"],
        ),
        single_choice(
            ex_id="ml-algo-c5-ex8",
            question="在工业机器学习特征工程中，为什么数据科学家通常使用 PCA 做特征降维后传给下游分类器，却极少直接把 t-SNE 的 2D 嵌入坐标作为下游分类器的常规特征？",
            options=[
                {"value": "A", "text": "因为 t-SNE 无法处理连续特征"},
                {"value": "B", "text": "因为 t-SNE 是非参数流形嵌入算法，不存在固定的解析正交投影矩阵，无法直接对未知的线上新测试样本做 `transform()` 实时推理，且计算代价随样本数呈二次方增长"},
                {"value": "C", "text": "因为 t-SNE 只能用于一维数据"},
                {"value": "D", "text": "因为 PCA 的分类准确率在任何场景下都严格优于 t-SNE"},
            ],
            answer="B",
            explanation="t-SNE 的核心定位是探索性可视化。它直接优化这组固定训练样本在低维空间的坐标位置，没有产生像 PCA 那样可以泛化复用的线性变换权重投影阵 W，因此新测试样本无法直接 transform 嵌入，不适合作线上特征管道。",
            difficulty=2,
            related_lesson_id="ml-algo-l5-3",
            tags=["t-SNE", "PCA", "特征工程", "工业落地"],
        ),
    ]

    return chapter(
        chapter_id="ml-algo-c5",
        course_id="ml-classical-algorithms",
        order=5,
        title="无监督学习：聚类分析与流形降维",
        goal="掌握 K-Means++ 质心概率采样与轮廓系数，掌握 DBSCAN 密度相连与噪声检测，精通 t-SNE 拥挤问题与流形可视化。",
        lessons=lessons,
        exercises=exercises,
    )
