# -*- coding: utf-8 -*-
"""
Chapter 2: 矩阵分解与谱分析 (Matrix Decompositions & Spectral Analysis)
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_2():
    # ── Lesson 2.1 ──
    l1_content = """### 学习目标
学完本节，你应该能够：
1. 掌握特征值与特征向量的代数定义 $A\\mathbf{v} = \\lambda \\mathbf{v}$ 与几何变换本质（纯拉伸不旋转）；
2. 理解瑞利商（Rayleigh Quotient）的概念及其极值与矩阵最大/最小特征值的对偶对应关系；
3. 掌握实对称矩阵的谱定理（Spectral Theorem），推导正交特征基底分解 $A = Q \\Lambda Q^T$；
4. 理解马氏距离（Mahalanobis Distance）与协方差矩阵椭球主轴的几何对齐机制；
5. 编写代码对实对称矩阵进行特征谱分解，验证矩阵谱重构与特征向量正交性。

### 前置知识
- 矩阵乘法、转置与内积几何意义；
- 行列式基础与线性方程组齐次解。

### 问题背景与 ML 用途
在机器学习中，数据协方差矩阵、图神经网络的拉普拉斯矩阵、核方法的 Gram 矩阵几乎全部是**实对称半正定矩阵**。
普通基底下的矩阵变换往往显得极其复杂，既有拉伸又有旋转。然而，如果我们能找到一组特殊的“固有方向”——在这些方向上，矩阵的作用仅仅是纯粹的坐标拉伸缩放而不发生任何偏折旋转，那么复杂的矩阵分析就会立刻退化为简单的标量乘法！
特征值分解正是这种解耦的核心工具：
- 在 PCA 中，样本协方差矩阵的最大特征值方向代表方差最大的投影主轴；
- 在谱聚类（Spectral Clustering）中，图拉普拉斯矩阵的第二小特征向量（Fiedler 向量）给出了图的最佳切分；
- 在优化算法中，Hessian 矩阵的最大最小特征值比值决定了损失曲面的病态条件数。

### 直觉理解
- **特征向量**：是矩阵变换下的“不动方向”。把一张印有圆形图案的弹性橡胶膜朝各个方向用力拉伸，绝大多数方向上的线条都会被扭曲倾斜，但总有一两条正交的轴线，其上的线段仅仅被均匀拉长或缩短，方向完全不变。这些方向就是特征向量，拉长的倍数就是特征值 $\\lambda$。
- **瑞利商**：对于实对称矩阵 $A$，标量函数 $R_A(\\mathbf{x}) = \\frac{\\mathbf{x}^T A \\mathbf{x}}{\\mathbf{x}^T \\mathbf{x}}$ 衡量了在单位方向 $\\mathbf{x}$ 上矩阵的二次能量。它的最大值就是最大特征值 $\\lambda_{\\max}$，对应的极值点就是主特征向量。

### 核心概念与符号对照表
| 核心概念 | 符号 | 数学定义 / 表达式 | 在机器学习中的核心用途 |
| --- | --- | --- | --- |
| **特征对** | $(\\lambda, \\mathbf{v})$ | $A \\mathbf{v} = \\lambda \\mathbf{v}, \\mathbf{v} \\neq \\mathbf{0}$ | 捕获变换的主要伸缩因子与固有方向 |
| **实对称矩阵谱定理** | $A = Q \\Lambda Q^T$ | $Q Q^T = I, \\Lambda = \\text{diag}(\\lambda_1, \\dots, \\lambda_n)$ | 协方差去相关、二次型解耦 |
| **瑞利商** | $R_A(\\mathbf{x})$ | $\\frac{\\mathbf{x}^T A \\mathbf{x}}{\\mathbf{x}^T \\mathbf{x}}$ | 最优投影轴目标函数、PCA 方差最大化 |
| **谱半径** | $\\rho(A)$ | $\\max_i |\\lambda_i|$ | 迭代法收敛性判断、RNN 梯度爆炸判据 |
| **条件数** | $\\kappa(A)$ | $\\frac{\\lambda_{\\max}}{\\lambda_{\\min}}$ | 优化曲面病态程度、梯度下降震荡程度 |

### 数学原理与逐步推导
#### 1. 实对称矩阵特征向量的正交性证明
设 $A$ 为实对称矩阵（$A = A^T$），$\\mathbf{v}_1, \\mathbf{v}_2$ 为属于不同特征值 $\\lambda_1 \\neq \\lambda_2$ 的特征向量：
$$A \\mathbf{v}_1 = \\lambda_1 \\mathbf{v}_1, \\quad A \\mathbf{v}_2 = \\lambda_2 \\mathbf{v}_2$$
考察内积标量 $\\mathbf{v}_1^T A \\mathbf{v}_2$：
一方面，由于 $A \\mathbf{v}_2 = \\lambda_2 \\mathbf{v}_2$：
$$\\mathbf{v}_1^T A \\mathbf{v}_2 = \\mathbf{v}_1^T (\\lambda_2 \\mathbf{v}_2) = \\lambda_2 \\mathbf{v}_1^T \\mathbf{v}_2$$
另一方面，利用对称性 $\\mathbf{v}_1^T A = (A^T \\mathbf{v}_1)^T = (A \\mathbf{v}_1)^T = (\\lambda_1 \\mathbf{v}_1)^T = \\lambda_1 \\mathbf{v}_1^T$：
$$\\mathbf{v}_1^T A \\mathbf{v}_2 = \\lambda_1 \\mathbf{v}_1^T \\mathbf{v}_2$$
两式相减得：
$$(\\lambda_1 - \\lambda_2) \\mathbf{v}_1^T \\mathbf{v}_2 = 0$$
因为已知 $\\lambda_1 \\neq \\lambda_2$，必有：
$$\\mathbf{v}_1^T \\mathbf{v}_2 = 0$$
**结论**：实对称矩阵不同特征值对应的特征向量严格正交。经单位化后，组成正交矩阵 $Q = [\\mathbf{q}_1, \\dots, \\mathbf{q}_n]$，满足 $Q^T Q = I$。

#### 2. 谱分解的外积求和形式
$$A = Q \\Lambda Q^T = \\sum_{i=1}^n \\lambda_i \\mathbf{q}_i \\mathbf{q}_i^T$$
其中每个 $\\mathbf{q}_i \\mathbf{q}_i^T$ 是一个秩为 1 的正交投影算子。这表明：**任何实对称矩阵都可以完美分解为一组相互正交的标量能量权重与秩一投影算子的加权和**。

### 几何图景与计算图
```
实对称矩阵 A 的谱几何：
原空间单位圆 x^T x = 1 
       │ 经过矩阵 A = Q Λ Q^T 映射
       ▼
旋转椭球面 y^T A^(-1) y = 1
       ▲
       │ 主轴方向由特征向量 q_1, q_2 决定
       │ 半轴长度与特征值 λ_1, λ_2 成正比
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：以为所有可逆方阵都能对角化
> 事实上，只有当矩阵拥有足额的线性无关特征向量（代数重数等于几何重数）时才可对角化。存在亏损矩阵（Defective Matrix，如 Jordan 块 $\\begin{bmatrix} 1 & 1 \\\\ 0 & 1 \\end{bmatrix}$）无法正交对角化。但**实对称矩阵保证 100% 拥有完全实数特征值并可正交对角化**。

### 工业界实践与工程考量
- 工业界在计算实对称特征值时（如协方差矩阵），通常使用专门针对对称/Hermitian 矩阵优化的算法（如 LAPACK 的 `dsyevd` 或 NumPy 的 `np.linalg.eigh`），比通用的 `np.linalg.eig` 速度快 2 到 3 倍且数值误差小得多。
- 在超大规模稀疏图拉普拉斯矩阵求特征值时，绝对不能全量求解，而是使用 Lanczos 迭代法（如 SciPy 的 `scipy.sparse.linalg.eigsh`）只提取前 $k$ 个关键特征对。

### 延伸思考与进阶阅读
- 阅读 Gilbert Strang《Linear Algebra and Learning from Data》第 1 章：对角化与瑞利商极大极小原理（Courant-Fischer 极小极大定理）。
- 思考：如果一个实对称矩阵的所有特征值都严格大于 0，这个矩阵具有什么重要性质？它在凸优化中意味着什么？

### 本节小结
- 特征值分解将实对称矩阵分解为 $A = Q \\Lambda Q^T$；
- 谱分解将高维复杂几何变换解构为正交基上的拉伸，是协方差分析与降维算法的基石。"""

    l1_code = """import numpy as np

# 构造一个 2x2 实对称矩阵
A = np.array([[4.0, 2.0],
              [2.0, 3.0]])

# 使用专用于实对称矩阵的 eigh 求解
eigenvalues, eigenvectors = np.linalg.eigh(A)

print("特征值 (按升序排列):", np.round(eigenvalues, 4))
print("特征向量矩阵 Q (各列为特征向量):\\n", np.round(eigenvectors, 4))

# 验证正交性 Q^T Q == I
ortho_test = eigenvectors.T @ eigenvectors
print("正交性检验 Q^T @ Q:\\n", np.round(ortho_test, 4))

# 验证谱分解重构 A == Q @ Lambda @ Q^T
Lambda = np.diag(eigenvalues)
recon_A = eigenvectors @ Lambda @ eigenvectors.T
print("谱分解重构矩阵:\\n", np.round(recon_A, 4))
print("重构与原矩阵最大绝对误差:", np.max(np.abs(A - recon_A)))
"""

    lesson_1 = lesson(
        lesson_id="ml-math-l2-1",
        title="特征值、特征向量与谱分解：协方差矩阵的正交主轴解耦",
        content=l1_content,
        difficulty=3,
        tips=[
            tip("实对称矩阵优先使用 eigh 而非 eig：NumPy 中的 `np.linalg.eigh` 专门用于对称/厄米特矩阵，保证返回实数特征值并严格保证特征向量正交，数值稳定性远高于 `eig`。", "performance"),
            tip("瑞利商在 PCA 中的角色：PCA 寻找投影方向的最大方差，本质就是在最大化样本协方差矩阵的瑞利商，其理论最大值正是最大特征值。", "interview")
        ],
        demos=[
            demo(code=l1_code, title="实对称矩阵特征值与谱分解验证")
        ]
    )

    # ── Lesson 2.2 ──
    l2_content = """### 学习目标
学完本节，你应该能够：
1. 掌握奇异值分解 SVD（Singular Value Decomposition）的数学形式 $A = U \\Sigma V^T$ 与四子空间几何映射；
2. 理解奇异值与特征值的内在联系（$\\sigma_i = \\sqrt{\\lambda_i(A^T A)}$）；
3. 掌握 Eckart-Young-Mirsky 低秩逼近定理，理解截断 SVD 在模型压缩与去噪中的最优性；
4. 理解 Moore-Penrose 广义逆（伪逆）的构造及在病态最小二乘中的求逆应用；
5. 编写代码对图像或二维矩阵进行截断 SVD 低秩压缩，观察能量截断曲线。

### 前置知识
- 特征值分解与正交矩阵概念；
- 矩阵的秩（Rank）与 Frobenius 范数。

### 问题背景与 ML 用途
特征值分解只能处理**方阵**，而且对非对称方阵的处理非常棘手。然而，真实世界的数据矩阵几乎全是**长方形**的！
- 用户-商品交互矩阵：$10^6$ 个用户 $\\times 10^4$ 个商品；
- 文档-词汇矩阵：$10^5$ 篇文档 $\\times 5 \\times 10^4$ 个单词；
- 图像像素矩阵：$1080 \\times 1920$。
对于这种任意尺寸的实数矩阵 $A \\in \\mathbb{R}^{m \\times n}$，**奇异值分解（SVD）是真正具有普适性的终极武器**。
在现代机器学习中：
- 推荐系统的矩阵分解（SVD++ / FunkSVD）本质是用户隐向量与物品隐向量的低秩交互；
- 大语言模型低秩自适应微调（LoRA）的核心假设“权重更新矩阵 $\\Delta W$ 具有很低的固有秩”正是建立在低秩截断 SVD 理论之上；
- 潜在语义分析（LSA）通过截断 SVD 发现词汇与文档背后的主题语义。

### 直觉理解
- **SVD 的几何三步走**：把单位超球面上的向量 $\\mathbf{x}$ 输入矩阵 $A$ 会得到什么？SVD 告诉你：任何矩阵变换 $A = U \\Sigma V^T$ 都可以被精确分解为三步：
  1. $V^T$：在输入空间进行**旋转**，把原基底对齐到输入奇异向量；
  2. $\\Sigma$：沿各个轴向进行**拉伸/压缩**，拉伸倍数就是奇异值 $\\sigma_1 \\ge \\sigma_2 \\ge \\dots \\ge 0$；
  3. $U$：在输出空间进行第二次**旋转**，将轴向对齐到输出奇异向量。
- **低秩逼近（Eckart-Young）**：就像用前几项傅里叶级数近似复杂音频一样，保留前 $k$ 个最大的奇异值，就能以绝对最小的能量均方误差逼近原矩阵。

### 核心概念与符号对照表
| 核心概念 | 符号 | 数学定义 / 表达式 | 在机器学习中的核心用途 |
| --- | --- | --- | --- |
| **全奇异值分解** | $A = U \\Sigma V^T$ | $U \\in \\mathbb{R}^{m \\times m}, \\Sigma \\in \\mathbb{R}^{m \\times n}, V \\in \\mathbb{R}^{n \\times n}$ | 揭示任意长方矩阵的几何结构 |
| **紧凑 / 经济 SVD** | $A = U_r \\Sigma_r V_r^T$ | $r = \\text{rank}(A), \\Sigma_r \\in \\mathbb{R}^{r \\times r}$ | 去除全零奇异值，节省存储空间 |
| **截断 SVD** | $A_k = \\sum_{i=1}^k \\sigma_i \\mathbf{u}_i \\mathbf{v}_i^T$ | 仅保留前 $k$ 个最大奇异值 | 数据降维、去噪、LoRA 参数分解 |
| **Eckart-Young 定理** | $\\min_{\\text{rank}(B)=k} \\|A - B\\|_F$ | 最优解为 $A_k$，且误差为 $\\sqrt{\\sum_{i=k+1}^r \\sigma_i^2}$ | 最优低秩逼近理论保证 |
| **Moore-Penrose 伪逆** | $A^+$ | $V \\Sigma^+ U^T$ | 超定/欠定方程组最小范数最小二乘解 |

### 数学原理与逐步推导
#### 1. 奇异值与特征值的联系
考察对称矩阵 $A^T A \\in \\mathbb{R}^{n \\times n}$：
$$(A^T A) \\mathbf{v}_i = \\lambda_i \\mathbf{v}_i$$
将 SVD 代入：$A^T A = (V \\Sigma^T U^T)(U \\Sigma V^T) = V (\\Sigma^T \\Sigma) V^T$。
由于 $V$ 是正交矩阵，这正是 $A^T A$ 的正交特征谱分解！
因此：
- 右奇异向量 $\\mathbf{v}_i$ 是 $A^T A$ 的特征向量；
- 左奇异向量 $\\mathbf{u}_i$ 是 $A A^T$ 的特征向量；
- 奇异值 $\\sigma_i = \\sqrt{\\lambda_i(A^T A)}$。

#### 2. Eckart-Young-Mirsky 定理
对于任意秩为 $k \\le r = \\text{rank}(A)$ 的矩阵 $B$：
$$\\|A - A_k\\|_F \\le \\|A - B\\|_F$$
其中 $A_k = \\sum_{i=1}^k \\sigma_i \\mathbf{u}_i \\mathbf{v}_i^T$。
截断后的能量保留比例（Energy Retention Ratio）定义为：
$$\\text{Energy}(k) = \\frac{\\sum_{i=1}^k \\sigma_i^2}{\\sum_{i=1}^r \\sigma_i^2} = \\frac{\\|A_k\\|_F^2}{\\|A\\|_F^2}$$
通常设定阈值（如 90% 或 95%）来自动确定最优低秩截断阶数 $k$。

### 几何图景与计算图
```
任意长方矩阵 A 的几何作用过程：
输入空间 R^n                          输出空间 R^m
  单位超球面 ──────── V^T (正交旋转) ─────────▶
       │                                     │
       ▼                                     ▼
各向伸缩拉伸 ──────── Σ (对角拉伸 σ_i) ───────▶
       │                                     │
       ▼                                     ▼
输出空间旋转 ──────── U (正交旋转) ─────────▶ 超椭球体
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：以为 SVD 与特征值分解是一回事
> 1. 特征值分解要求方阵，基向量不一定正交；SVD 适用于任意 $m \\times n$ 长方阵，左右奇异向量 $U$ 和 $V$ 都严格正交。
> 2. 只有正定对称方阵，其特征值分解才与 SVD 形式完全一致（此时 $\\sigma_i = \\lambda_i, U = V$）。

### 工业界实践与工程考量
- 在大模型微调（LoRA）中，权重增量 $\\Delta W \\in \\mathbb{R}^{d_{in} \\times d_{out}}$ 被分解为 $B A$（其中 $B \\in \\mathbb{R}^{d_{in} \\times r}, A \\in \\mathbb{R}^{r \\times d_{out}}$，且 $r \\ll \\min(d_{in}, d_{out})$）。这直接源自 SVD 的截断低秩逼近思想，将数十亿可训练参数降至数百万。
- 计算超大稀疏矩阵 SVD 时，工业界普遍使用 Randomized SVD（随机化奇异值分解，如 `sklearn.utils.extmath.randomized_svd`），时间复杂度从 $O(m n \\min(m, n))$ 大幅降至 $O(m n k)$。

### 延伸思考与进阶阅读
- 阅读 Gene H. Golub, Charles F. Van Loan《Matrix Computations》第 2.4 节：奇异值分解及其应用。
- 思考：在推荐系统中，评分矩阵含有大量未知缺失值，我们能否直接对含有 NaN 的矩阵做普通 SVD？如果不可以，应如何转化优化问题？

### 本节小结
- 奇异值分解 $A = U \\Sigma V^T$ 是将任意矩阵解耦为两个旋转和一个拉伸的终极工具；
- Eckart-Young 定理证明了截断 SVD 是 Frobenius 范数下的最优低秩逼近，奠定了矩阵压缩与 LoRA 的数学基础。"""

    l2_code = """import numpy as np

# 构造一个 5x4 的特征数据矩阵
np.random.seed(42)
A = np.random.randn(5, 4)

# 经济型 SVD 分解 (full_matrices=False)
U, S, Vt = np.linalg.svd(A, full_matrices=False)

print("奇异值序列 S:", np.round(S, 4))
print(f"U 形状: {U.shape}, S 形状: {S.shape}, V^T 形状: {Vt.shape}")

# 取秩 k = 2 的截断低秩逼近 A_2
k = 2
A_k = U[:, :k] @ np.diag(S[:k]) @ Vt[:k, :]

# 经验误差 (Frobenius 范数)
emp_err = np.linalg.norm(A - A_k, 'fro')

# 理论误差：根据 Eckart-Young 定理，等于被舍弃奇异值的平方和开根号
theo_err = np.sqrt(np.sum(S[k:]**2))

print(f"k={k} 截断近似经验误差:", round(emp_err, 6))
print(f"k={k} 理论最优误差:", round(theo_err, 6))
print("经验误差与理论误差是否完全吻合:", np.isclose(emp_err, theo_err))

# 能量保留比例
energy = np.sum(S[:k]**2) / np.sum(S**2)
print(f"前 {k} 个奇异值保留的信息能量比例: {energy:.2%}")
"""

    lesson_2 = lesson(
        lesson_id="ml-math-l2-2",
        title="奇异值分解 SVD 与最优低秩逼近：从长方矩阵到 LoRA",
        content=l2_content,
        difficulty=3,
        tips=[
            tip("full_matrices 参数设置：在 NumPy 中做 SVD 时，推荐传入 `full_matrices=False` 以获取瘦身后的经济 SVD，避免生成巨大的无用零扩展矩阵。", "performance"),
            tip("能量保留定律：矩阵 Frobenius 范数的平方等于其所有奇异值的平方和：$\\|A\\|_F^2 = \\sum \\sigma_i^2$。", "note")
        ],
        demos=[
            demo(code=l2_code, title="SVD 截断低秩逼近与 Eckart-Young 验证")
        ]
    )

    # ── Lesson 2.3 ──
    l3_content = """### 学习目标
学完本节，你应该能够：
1. 掌握主成分分析（PCA）的两种对偶数学推导：**最大投影方差理论**与**最小重构误差理论**；
2. 理解样本协方差矩阵去中心化计算 $\\Sigma = \\frac{1}{n-1} X_c^T X_c$ 的推导及其正半定谱性质；
3. 掌握拉格朗日乘子法求解第一主成分的最优化过程；
4. 理解主成分正交性、累计解释方差比（Explained Variance Ratio）与碎石图（Scree Plot）的决策法则；
5. 编写从零实现的 PCA 算法，并与 Scikit-Learn 官方标准实现对比验证。

### 前置知识
- 样本均值与协方差基础定义；
- 特征值分解与拉格朗日乘子法入门。

### 问题背景与 ML 用途
现代机器学习面临着严重的“维度灾难（Curse of Dimensionality）”：
- 基因芯片数据可能有数万个特征，但样本量只有数百；
- 图像像素特征极易出现相邻像素的高冗余线性相关；
- 高维特征空间中数据点极其稀疏，导致模型过拟合、计算复杂度爆炸。
主成分分析（Principal Component Analysis, PCA）作为非监督降维的黄金基石，通过寻找数据方差最大的正交投影子空间，把高维特征映射为少量不相关的综合特征（主成分），不仅消除了多重共线性，而且最大程度保留了原始数据的有效几何变异信息。

### 直觉理解
- **投影找最大影子**：想象你在黑暗中用手电筒照射一个漂浮在空中的雪茄形橄榄球。如果把手电筒对着橄榄球的侧面照射，墙壁上投下的阴影面积最大、最能反映它的形状细节；如果从球体两端直视照射，阴影就退化成一个小圆盘。PCA 的目标就是在所有可能的照射角度中，找到那个让投影后“影子散布范围（方差）最大”的角度！

### 核心概念与符号对照表
| 核心概念 | 符号 | 数学定义 / 表达式 | 在机器学习中的核心用途 |
| --- | --- | --- | --- |
| **去中心化矩阵** | $X_c$ | $X - \\mathbf{1}_n \\boldsymbol{\\mu}^T$ | 消除平移常数项，使协方差等于内积 |
| **样本协方差矩阵** | $S$ | $\\frac{1}{n-1} X_c^T X_c \\in \\mathbb{R}^{d \\times d}$ | 捕获不同特征间的两两线性变异关联 |
| **投影权重向量** | $\\mathbf{w}_1$ | $\\arg\\max_{\\|\\mathbf{w}\\|=1} \\mathbf{w}^T S \\mathbf{w}$ | 第一主成分的投影方向 |
| **主成分得分** | $Z$ | $X_c W_k \\in \\mathbb{R}^{n \\times k}$ | 降维后的低维特征表示 |
| **解释方差比** | $\\rho_k$ | $\\frac{\\lambda_k}{\\sum_{j=1}^d \\lambda_j}$ | 衡量第 $k$ 个主成分保留的信息量占比 |

### 数学原理与逐步推导
#### 1. 最大投影方差法的严格拉格朗日推导
设去中心化后的样本矩阵为 $X_c \\in \\mathbb{R}^{n \\times d}$，其样本协方差矩阵为 $S = \\frac{1}{n-1} X_c^T X_c$。
设投影方向为单位向量 $\\mathbf{w} \\in \\mathbb{R}^d$（满足约束 $\\mathbf{w}^T \\mathbf{w} = 1$）。
各样本在 $\\mathbf{w}$ 上的投影值为 $z_i = \\mathbf{x}_{c,i}^T \\mathbf{w}$。
投影后样本的均值为 0，其方差为：
$$\\sigma_{\\mathbf{w}}^2 = \\frac{1}{n-1} \\sum_{i=1}^n z_i^2 = \\frac{1}{n-1} \\mathbf{w}^T X_c^T X_c \\mathbf{w} = \\mathbf{w}^T S \\mathbf{w}$$
我们希望寻找使方差最大的投影方向 $\\mathbf{w}$，构建优化问题：
$$\\max_{\\mathbf{w}} \\mathbf{w}^T S \\mathbf{w} \\quad \\text{s.t.} \\quad \\mathbf{w}^T \\mathbf{w} = 1$$
构建拉格朗日函数（Lagrangian）：
$$\\mathcal{L}(\\mathbf{w}, \\lambda) = \\mathbf{w}^T S \\mathbf{w} - \\lambda (\\mathbf{w}^T \\mathbf{w} - 1)$$
对 $\\mathbf{w}$ 求导并令其等于零：
$$\\nabla_{\\mathbf{w}} \\mathcal{L} = 2 S \\mathbf{w} - 2 \\lambda \\mathbf{w} = \\mathbf{0} \\implies S \\mathbf{w} = \\lambda \\mathbf{w}$$
这个式子正是**特征值方程**！
两边左乘 $\\mathbf{w}^T$：
$$\\mathbf{w}^T S \\mathbf{w} = \\lambda \\mathbf{w}^T \\mathbf{w} = \\lambda$$
因此，**投影后的方差恰好等于特征值 $\\lambda$**！为了让投影方差最大化，$\\mathbf{w}$ 必须是协方差矩阵 $S$ 的**最大特征值对应的特征向量**！
依次类推，第二主成分是在与第一主成分正交的约束下，使方差最大的方向，对应第二大特征向量。

### 几何图景与计算图
```
PCA 降维映射流程：
原始数据 X (n x d)
       │
       ▼ 去中心化 X_c = X - μ
计算协方差 S = 1/(n-1) * X_c^T X_c
       │
       ▼ 特征谱分解 S = W Λ W^T (特征值降序排列)
选取前 k 个特征向量 W_k = [w_1, ..., w_k]
       │
       ▼ 正交投影映射
低维新特征 Z = X_c W_k (n x k)
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：做 PCA 之前不需要做标准化
> 如果特征之间量纲差异巨大（例如“年收入（数十万元）”和“年龄（数十岁）”），协方差矩阵将被数值极大的特征完全主导，导致 PCA 的主成分只是简单挑出了量纲最大的特征，失去了客观降维的意义。**在实际应用中，除非各特征物理量纲天然统一（如图像灰度），否则必须先做 Z-score 标准化**。

### 工业界实践与工程考量
- 工业级 PCA 实现绝不直接计算 $X_c^T X_c$ 再求特征值！因为当样本数 $n$ 很大而特征数 $d$ 较小，或特征数 $d$ 极大时，$X^T X$ 的条件数会平方放大（$\\kappa(X^T X) = \\kappa(X)^2$），导致极端严重的数值下溢与精度损失。
- Scikit-Learn 的 `PCA` 内部直接调用 $X_c$ 的 **SVD 分解**：$X_c = U \\Sigma V^T$。因为 $X_c^T X_c = V \\Sigma^2 V^T$，直接取右奇异向量 $V$ 作为主成分方向，奇异值 $\\sigma_i^2 / (n-1)$ 作为特征值，计算既稳定又高效。

### 延伸思考与进阶阅读
- 阅读 Christopher M. Bishop《Pattern Recognition and Machine Learning》第 12.1 节：PCA 的最大方差与最小重构误差双重推导。
- 思考：如果数据不是线性的（例如双螺旋线或半月形流形），线性 PCA 降维会产生什么后果？应使用何种非线性扩展（Kernel PCA 或 t-SNE）？

### 本节小结
- PCA 寻找方差最大的正交投影子空间，数学推导直接归结为样本协方差矩阵的特征值分解；
- 投影方差即为特征值，前 $k$ 个主成分的累积方差贡献率决定了降维维度的选取。"""

    l3_code = """import numpy as np

# 构造具有明显相关性的 3 维特征合成数据 (100 个样本)
np.random.seed(42)
mean_true = np.array([10.0, 5.0, -2.0])
cov_true = np.array([[4.0, 3.0, 1.0],
                     [3.0, 3.0, 0.8],
                     [1.0, 0.8, 1.5]])
X = np.random.multivariate_normal(mean_true, cov_true, size=100)

# 1. 均值去中心化
X_centered = X - np.mean(X, axis=0)

# 2. 估计样本协方差矩阵 S (除以 n - 1 无偏估计)
n_samples = X.shape[0]
S = (X_centered.T @ X_centered) / (n_samples - 1)

# 3. 特征值谱分解
eigenvalues, eigenvectors = np.linalg.eigh(S)

# 4. 按特征值从大到小降序排列
idx_sorted = np.argsort(eigenvalues)[::-1]
eigenvalues = eigenvalues[idx_sorted]
eigenvectors = eigenvectors[:, idx_sorted]

# 5. 计算解释方差比
explained_variance_ratio = eigenvalues / np.sum(eigenvalues)

print("降序排列的特征值 (主成分方差):", np.round(eigenvalues, 4))
print("各主成分解释方差比例:", [f"{v:.2%}" for v in explained_variance_ratio])
print("前 2 个主成分累计解释方差比例:", f"{np.sum(explained_variance_ratio[:2]):.2%}")

# 6. 将数据投影到前 2 个主成分构成的新空间
W_2 = eigenvectors[:, :2]
Z = X_centered @ W_2
print("降维后数据矩阵 Z 形状:", Z.shape)
"""

    lesson_3 = lesson(
        lesson_id="ml-math-l2-3",
        title="主成分分析 PCA 的数学本质与谱推导：方差最大化与信息保留",
        content=l3_content,
        difficulty=3,
        tips=[
            tip("去中心化不可或缺：如果不对原始数据进行中心化处理，协方差矩阵 $X^T X$ 会掺杂数据均值的偏置偏移，导致第一主成分严重偏向原点到均值点的连线。", "pitfall"),
            tip("SVD 求解更稳健：工程落地中对数据矩阵 $X_c$ 直接做 SVD 分解能避免数值平方病态，是工业界库的标准做法。", "performance")
        ],
        demos=[
            demo(code=l3_code, title="从零推导实现 PCA 降维与方差解释比")
        ]
    )

    lessons = [lesson_1, lesson_2, lesson_3]

    # ── Exercises for Chapter 2 ──
    exercises = [
        single_choice(
            ex_id="ml-math-c2-ex1",
            question="对于一个实对称半正定协方差矩阵 $\\Sigma \\in \\mathbb{R}^{d \\times d}$，其所有特征值 $\\lambda_i$ 具有什么基本数学性质？",
            options=[
                {"value": "A", "text": "均为实数，且严格 $\\ge 0$"},
                {"value": "B", "text": "可以为复数，但模长必须为 1"},
                {"value": "C", "text": "至少有一个特征值必须严格等于 0"},
                {"value": "D", "text": "所有特征值的代数和必须严格等于 1"},
            ],
            answer="A",
            explanation="实对称矩阵的谱定理保证所有特征值皆为实数；半正定性（Positive Semi-definiteness）定义即为对任意非零向量 $\\mathbf{x}$ 有 $\\mathbf{x}^T \\Sigma \\mathbf{x} \\ge 0$，由瑞利商可知其所有特征值 $\\lambda_i \\ge 0$。",
            difficulty=2,
            related_lesson_id="ml-math-l2-1",
            tags=["实对称矩阵", "特征值性质", "半正定"],
        ),
        judge(
            ex_id="ml-math-c2-ex2",
            question="根据 Eckart-Young-Mirsky 定理，对于任意实数矩阵 $A$，保留其奇异值分解的前 $k$ 个最大项得到的截断矩阵 $A_k$，在所有秩为 $k$ 的矩阵中，是 Frobenius 范数和谱范数意义下的全局最优逼近矩阵。",
            answer=True,
            explanation="正确。Eckart-Young-Mirsky 定理是矩阵近似理论的核心定理，严格证明了截断 SVD 在任何酉不变范数（包括 Frobenius 范数和谱范数）下都是最优秩 $k$ 近似。",
            difficulty=2,
            related_lesson_id="ml-math-l2-2",
            tags=["Eckart-Young定理", "截断SVD", "最优低秩逼近"],
        ),
        multiple_choice(
            ex_id="ml-math-c2-ex3",
            question="在进行主成分分析（PCA）时，以下哪些说法是严格正确的？",
            options=[
                {"value": "A", "text": "第一主成分方向对应样本协方差矩阵的最大特征值对应的特征向量"},
                {"value": "B", "text": "各主成分之间相互正交，投影后的新特征互不相关（协方差为 0）"},
                {"value": "C", "text": "若不对各维度特征进行去均值中心化，第一主成分往往会被数据的均值位置严重偏置"},
                {"value": "D", "text": "PCA 是一种有监督算法，其投影目标是最大化不同类别标签之间的距离"},
            ],
            answer=["A", "B", "C"],
            explanation="A、B、C 均为 PCA 的核心性质。D 是错误的，PCA 是完全无监督的降维方法，不依赖任何类别标签；最大化类间距离、最小化类内距离的是线性判别分析（LDA）。",
            difficulty=3,
            related_lesson_id="ml-math-l2-3",
            tags=["PCA原理", "主成分正交性", "数据中心化"],
        ),
        fill(
            ex_id="ml-math-c2-ex4",
            question="设某长方矩阵 $A \\in \\mathbb{R}^{m \\times n}$ 的奇异值为 $\\sigma_1, \\sigma_2, \\dots, \\sigma_r$，则实对称方阵 $A^T A \\in \\mathbb{R}^{n \\times n}$ 的非零特征值与矩阵 $A$ 的奇异值的定量关系是 $\\lambda_i(A^T A) = $____。",
            blanks=[
                ["\\sigma_i^2", "\\sigma_i^{2}", "sigma_i^2", "sigma_i**2"]
            ],
            explanation="由 SVD 定义 $A = U \\Sigma V^T$，可得 $A^T A = V \\Sigma^T \\Sigma V^T$，因此 $A^T A$ 的特征值恰好为奇异值的平方 $\\sigma_i^2$。",
            difficulty=2,
            related_lesson_id="ml-math-l2-2",
            tags=["奇异值", "特征值关系", "公式推导"],
        ),
        open_ex(
            ex_id="ml-math-c2-ex5",
            question="【数理证明题】请写出利用拉格朗日乘子法推导 PCA 第一主成分投影方向的完整过程：\n1. 明确定义样本去中心化协方差矩阵 $S$ 与待求解单位方向向量 $\\mathbf{w}$；\n2. 写出最大化投影方差的目标函数与单位模长约束条件；\n3. 构建拉格朗日函数 $\\mathcal{L}(\\mathbf{w}, \\lambda)$ 并求关于 $\\mathbf{w}$ 的梯度；\n4. 得出特征方程 $S \\mathbf{w} = \\lambda \\mathbf{w}$ 并解释为什么最优方向是最大特征值对应的特征向量。",
            reference_answer="""推导步骤如下：
1. 设定去中心化样本协方差矩阵 $S = \\frac{1}{n-1} X_c^T X_c$，待求投影单位向量为 $\\mathbf{w} \\in \\mathbb{R}^{d}$，满足约束 $\\mathbf{w}^T \\mathbf{w} = 1$。
2. 各样本在 $\\mathbf{w}$ 上的投影方差为 $\\sigma_{\\mathbf{w}}^2 = \\mathbf{w}^T S \\mathbf{w}$。优化问题为：
   $$\\max_{\\mathbf{w}} \\mathbf{w}^T S \\mathbf{w} \\quad \\text{s.t.} \\quad \\mathbf{w}^T \\mathbf{w} = 1$$
3. 构建拉格朗日函数：
   $$\\mathcal{L}(\\mathbf{w}, \\lambda) = \\mathbf{w}^T S \\mathbf{w} - \\lambda (\\mathbf{w}^T \\mathbf{w} - 1)$$
   对 $\\mathbf{w}$ 求偏导并令其为 0：
   $$\\nabla_{\\mathbf{w}} \\mathcal{L} = 2 S \\mathbf{w} - 2 \\lambda \\mathbf{w} = \\mathbf{0} \\implies S \\mathbf{w} = \\lambda \\mathbf{w}$$
4. 两边左乘 $\\mathbf{w}^T$：
   $$\\mathbf{w}^T S \\mathbf{w} = \\lambda \\mathbf{w}^T \\mathbf{w} = \\lambda$$
   由于目标是最大化投影方差 $\\mathbf{w}^T S \\mathbf{w}$，该方差在极值点处恰好等于特征值 $\\lambda$。因此，必须选取协方差矩阵 $S$ 的最大特征值 $\\lambda_{\\max}$，对应的单位特征向量 $\\mathbf{w}_1$ 即为第一主成分的最优投影方向。""",
            explanation="通过拉格朗日乘子法推导极值条件，揭示 PCA 的代数本质是求解协方差矩阵的特征谱。",
            rubric=[
                {"point": "正确写出投影方差表达式 w^T S w 与约束条件 w^T w = 1", "score": 25},
                {"point": "正确构建拉格朗日函数并对向量 w 求导", "score": 25},
                {"point": "严密推导得出特征值方程 S w = lambda w", "score": 25},
                {"point": "说明目标方差值即为特征值 lambda，证明最大方差对应最大特征值", "score": 25},
            ],
            difficulty=4,
            related_lesson_id="ml-math-l2-3",
            tags=["拉格朗日乘子法", "PCA数学证明", "特征值对偶"],
        ),
        # ── Code Exercise 2 ──
        {
            "id": "ml-math-c2-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】实现基于截断 SVD 的矩阵低秩逼近与能量保留率计算器：\n编写函数 `svd_low_rank_approx(A, k)`：\n接收一个 2D NumPy 浮点数组 $A \\in \\mathbb{R}^{m \\times n}$ 和一个正整数 $k$（目标截断阶数 $1 \\le k \\le \\min(m, n)$）。\n计算并返回一个元组 `(A_k, energy_ratio)`：\n1. `A_k`: 秩为 $k$ 的最优截断重构矩阵 $\\sum_{i=1}^k \\sigma_i u_i v_i^T$（2D NumPy 数组，元素四舍五入保留 4 位小数，转为嵌套 Python 列表）；\n2. `energy_ratio`: 前 $k$ 个奇异值的平方和占所有奇异值平方和的保留比例 $\\frac{\\sum_{i=1}^k \\sigma_i^2}{\\sum_{i=1}^r \\sigma_i^2}$（浮点数，保留 4 位小数）。\n\n最后一行请返回调用示例在测试矩阵下的计算结果。",
            "starterCode": "import numpy as np\n\ndef svd_low_rank_approx(A: np.ndarray, k: int) -> tuple:\n    \"\"\"计算矩阵的前 k 阶截断 SVD 最优逼近与奇异值能量保留比例\"\"\"\n    # 请在此实现\n    ___\n\nA_demo = np.array([[3.0, 2.0, 2.0], [2.0, 3.0, -2.0]])\nres_A_k, res_ratio = svd_low_rank_approx(A_demo, 1)\n(res_A_k, res_ratio)\n",
            "setupCode": "",
            "expectedOutput": "([[2.5, 2.5, 0.0], [2.5, 2.5, 0.0]], 0.7353)",
            "answer": "import numpy as np\n\ndef svd_low_rank_approx(A: np.ndarray, k: int) -> tuple:\n    U, S, Vt = np.linalg.svd(A, full_matrices=False)\n    A_k = U[:, :k] @ np.diag(S[:k]) @ Vt[:k, :]\n    energy_ratio = float(np.sum(S[:k]**2) / np.sum(S**2))\n    return (np.round(A_k, 4).tolist(), round(energy_ratio, 4))\n\nA_demo = np.array([[3.0, 2.0, 2.0], [2.0, 3.0, -2.0]])\nres_A_k, res_ratio = svd_low_rank_approx(A_demo, 1)\n(res_A_k, res_ratio)\n",
            "tests": "A_t = np.diag([4.0, 3.0, 0.0])\nA_k_t, r_t = svd_low_rank_approx(A_t, 1)\nassert np.allclose(np.array(A_k_t), np.diag([4.0, 0.0, 0.0])), f\"截断逼近矩阵错误: {A_k_t}\"\nassert r_t == 0.64, f\"能量保留比计算错误: {r_t}\"\n",
            "explanation": "利用 SVD 分解截取前 k 个奇异值及对应的左右奇异向量外积相加，并计算奇异值平方能量占比。",
            "tags": ["SVD", "低秩逼近", "NumPy编程实战"],
            "related_lesson_id": "ml-math-l2-2",
        },
        single_choice(
            ex_id="ml-math-c2-ex7",
            question="在主成分分析中，如果有 5 个特征，且求得样本协方差矩阵的特征值依次为 5.0, 3.0, 1.5, 0.4, 0.1，那么保留前 2 个主成分时，累积解释方差比（Explained Variance Ratio）是多少？",
            options=[
                {"value": "A", "text": "80.00%"},
                {"value": "B", "text": "50.00%"},
                {"value": "C", "text": "30.00%"},
                {"value": "D", "text": "95.00%"},
            ],
            answer="A",
            explanation="特征值总和为 5.0 + 3.0 + 1.5 + 0.4 + 0.1 = 10.0。前 2 个主成分的特征值之和为 5.0 + 3.0 = 8.0。因此累积解释方差比为 8.0 / 10.0 = 80.00%。",
            difficulty=2,
            related_lesson_id="ml-math-l2-3",
            tags=["解释方差比", "特征值求和", "PCA评估"],
        ),
    ]

    return chapter(
        chapter_id="ml-math-c2",
        course_id="ml-math",
        order=2,
        title="矩阵分解与谱分析",
        goal="掌握特征谱分解、奇异值分解 SVD 的几何与代数原理，熟练推导 PCA 与低秩近似理论。",
        lessons=lessons,
        exercises=exercises,
    )
