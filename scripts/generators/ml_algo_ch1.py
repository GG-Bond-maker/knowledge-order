# -*- coding: utf-8 -*-
"""
Chapter 1: 广义线性模型与判别分类 (GLM & Discriminant Classification)
Course: ml-classical-algorithms
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_1():
    # ── Lesson 1.1 ──
    l1_content = """### 学习目标
学完本节，你应该能够：
1. 掌握多元线性回归的数学建模形式、矩阵表达与高斯马尔可夫定理（Gauss-Markov Theorem）；
2. 严密推导普通最小二乘法（OLS）的正规方程闭式解 $\\mathbf{w}^* = (X^T X)^{-1} X^T \\mathbf{y}$；
3. 从几何正交投影视角解释残差正交性，理解为什么正规方程等价于将标签向量投影到特征列空间；
4. 掌握多项式回归（Polynomial Regression）的特征增广机制与多项式阶数引起的过拟合波动；
5. 编写代码同时实现解析正规方程求解与小批量梯度下降（Mini-batch GD）求解，对比参数估计与收敛轨迹。

### 前置知识
- 矩阵转置、逆矩阵与矩阵微分求导；
- 凸二次型与极值驻点条件。

### 问题背景与 ML 用途
无论深度学习与大语言模型发展得多么繁荣，**线性回归永远是所有连续值预测任务的最核心基线（Baseline）**：
- 计量经济学中的资本资产定价模型（CAPM）与因子暴露分析；
- 工业界销售量预测、能源负载需求预测与广告出价 CTR 基础分；
- 现代特征归因与模型可解释性算法（如 LIME）本质上是在局部拟合一个线性模型。
作为监督学习中理论最完备的模型，线性回归清晰展现了“假说空间设计”、“似然损失函数构建”、“解析求解”与“数值迭代求解”的标准机器学习全景闭环。

### 直觉理解
- **弹簧平衡与影子映射**：想象每个样本点是一颗钉在墙面上的铁钉，拟合超平面是一块悬空的平直刚性铁板。每个铁钉到铁板之间都连着一根垂直的弹簧（残差）。当所有弹簧的拉力势能（平方误差和）达到全系统最低稳态时，铁板悬停的姿态就是**最小二乘解**！从投影视角看，正规方程就是把悬空的真实标签向量 $\\mathbf{y}$，垂直正交投影到特征子空间地面上，影子的顶点就是模型的最佳预测值。

### 核心概念与符号对照表
| 核心概念 | 符号 / 公式 | 数学与物理意义 | 在机器学习中的核心用途 |
| --- | --- | --- | --- |
| **设计矩阵** | $X \\in \\mathbb{R}^{n \\times (d+1)}$ | 包含截距偏置列（全 1 列）的特征矩阵 | 批量前向线性映射基础 |
| **正规方程** | $(X^T X) \\mathbf{w} = X^T \\mathbf{y}$ | 极小化 MSE 损失的一阶驻点充要方程 | 小规模满秩数据集上的精确解析解 |
| **正规方程闭式解** | $\\mathbf{w}^* = (X^T X)^{-1} X^T \\mathbf{y}$ | 列满秩时的唯一全局最小二乘权重 | OLS 闭式拟合 |
| **高斯-马尔可夫定理** | BLUE | 最佳线性无偏估计（Best Linear Unbiased Estimator） | 奠定 OLS 在所有线性无偏估计中的最小方差王者地位 |
| **多项式增广** | $\\phi(x) = [1, x, x^2, \\dots, x^p]^T$ | 将低维非线性映射为高维线性空间 | 赋予线性模型强大的局部曲线拟合能力 |

### 数学原理与逐步推导
#### 1. 最小二乘正规方程的矩阵微分严格推导
设样本集特征矩阵为 $X \\in \\mathbb{R}^{n \\times p}$，目标观测值为 $\\mathbf{y} \\in \\mathbb{R}^n$。
均方误差损失函数（MSE）定义为残差向量的欧氏范数平方：
$$\\mathcal{L}(\\mathbf{w}) = \\frac{1}{2} \\|\\mathbf{y} - X\\mathbf{w}\\|_2^2 = \\frac{1}{2} (\\mathbf{y} - X\\mathbf{w})^T (\\mathbf{y} - X\\mathbf{w})$$
展开该二次型：
$$\\mathcal{L}(\\mathbf{w}) = \\frac{1}{2} \\left( \\mathbf{y}^T \\mathbf{y} - \\mathbf{y}^T X\\mathbf{w} - \\mathbf{w}^T X^T \\mathbf{y} + \\mathbf{w}^T X^T X \\mathbf{w} \\right)$$
由于标量的转置等于其本身，$\\mathbf{y}^T X\\mathbf{w} = \\mathbf{w}^T X^T \\mathbf{y}$，因此：
$$\\mathcal{L}(\\mathbf{w}) = \\frac{1}{2} \\mathbf{y}^T \\mathbf{y} - \\mathbf{w}^T X^T \\mathbf{y} + \\frac{1}{2} \\mathbf{w}^T (X^T X) \\mathbf{w}$$
对权重向量 $\\mathbf{w}$ 计算一阶梯度：
$$\\nabla_{\\mathbf{w}} \\mathcal{L}(\\mathbf{w}) = -X^T \\mathbf{y} + X^T X \\mathbf{w}$$
令梯度严格等于零向量：
$$\\nabla_{\\mathbf{w}} \\mathcal{L}(\\mathbf{w}) = \\mathbf{0} \\implies (X^T X) \\mathbf{w} = X^T \\mathbf{y}$$
若特征矩阵 $X$ 为列满秩（$\\text{rank}(X) = p$），则方阵 $X^T X \\in \\mathbb{R}^{p \\times p}$ 严格正定可逆，两边左乘逆矩阵即可求出**唯一全局最优闭式解**：
$$\\mathbf{w}^* = (X^T X)^{-1} X^T \\mathbf{y}$$
若 $X^T X$ 不可逆（存在多重共线性或特征数大于样本数 $p > n$），则采用 Moore-Penrose 伪逆求解：$\\mathbf{w}^* = X^+ \\mathbf{y}$。

### 几何图景与计算图
```
最小二乘正规方程的几何正交投影：
真实标签向量 y (位于 R^n 空间)
       │       /
       │      /  残差向量 e = y - ŷ (严格正交于特征平面!)
       │     /
       ▼    /
预测点 ŷ = X w* ──────── 特征列空间 C(X) (由 X 的各列张成)
       ▲
       │ 此时预测点 ŷ 到真实点 y 的欧氏距离被压缩至绝对全局最短！
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：既然有正规方程解析解，工业界为什么还要用梯度下降？
> 1. **计算复杂度瓶颈**：正规方程中计算 $(X^T X)^{-1}$ 的时间复杂度为 $O(p^3)$。当特征数量达到 $10^5$ 时，矩阵求逆的算力开销是任何超级计算机都无法承受的；
> 2. **内存瓶颈**：当样本量 $n = 10^8$ 时，全量矩阵 $X$ 根本无法一次性载入内存；
> 3. **不可逆风险**：实际数据中特征常有强共线性，$X^T X$ 极易病态近奇异导致求逆数值爆炸。而随机梯度下降（SGD）只需每次读取微小的 Mini-batch，计算复杂度仅为 $O(B p)$，且对共线性天然具备正则平滑稳定性。

### 工业界实践与工程考量
- 在 Scikit-learn 的 `LinearRegression` 源码中，内部并没有直接调用 `np.linalg.inv`，而是基于 LAPACK 的 `gelsd` 驱动库执行**奇异值分解（SVD）或 QR 分解**。因为 QR 分解的条件数是 $X^T X$ 的平方根（$\\kappa(X)$ 对比 $\\kappa(X)^2$），其数值稳定性高出几个数量级。

### 延伸思考与进阶阅读
- 阅读 Trevor Hastie 等《The Elements of Statistical Learning》第 3 章：线性回归与高斯-马尔可夫定理。
- 思考：如果样本观测误差的方差是不相等的（异方差性 $\\text{Var}(\\epsilon_i) = \\sigma_i^2$），普通最小二乘法就不再是最佳线性无偏估计（BLUE），此时应该如何通过加权最小二乘法（WLS）进行校正？

### 本节小结
- OLS 最小二乘在几何上是将标签向量投影至特征列空间；
- 正规方程提供精确解，梯度下降与 QR/SVD 分解解决大规模工程落地中的算力与数值瓶颈。"""

    l1_code = """import numpy as np

# 构造一个含噪声的一元二次非线性数据: y = 0.5 * x^2 - 2 * x + 1 + 噪声
np.random.seed(42)
n_samples = 50
x = np.linspace(-2, 4, n_samples)
y = 0.5 * x**2 - 2.0 * x + 1.0 + np.random.normal(0, 0.5, size=n_samples)

# 1. 多项式特征增广 (阶数 p = 2): 构造设计矩阵 X = [1, x, x^2]
X_design = np.column_stack([np.ones(n_samples), x, x**2])

# 2. 正规方程闭式解: w* = (X^T X)^(-1) X^T y
w_analytical = np.linalg.inv(X_design.T @ X_design) @ X_design.T @ y

print("=== 1. 正规方程解析解 (Normal Equation) ===")
print(f"拟合多项式系数: 偏置 = {w_analytical[0]:.4f}, x 项 = {w_analytical[1]:.4f}, x^2 项 = {w_analytical[2]:.4f}")
print(f"真实理论系数: 偏置 = 1.0000, x 项 = -2.0000, x^2 项 = 0.5000")

# 3. 批量梯度下降数值求解 (Batch Gradient Descent)
w_gd = np.zeros(3)
learning_rate = 0.02
n_epochs = 1000

# 特征缩放防梯度爆炸 (对多项式列除以最大绝对值)
X_norm = X_design.copy()
scales = np.max(np.abs(X_design), axis=0)
scales[0] = 1.0 # 偏置列不缩放
X_norm = X_norm / scales

w_norm = np.zeros(3)
for epoch in range(n_epochs):
    y_pred = X_norm @ w_norm
    error = y_pred - y
    grad = (X_norm.T @ error) / n_samples
    w_norm -= learning_rate * grad

# 还原缩放后的真实参数权重
w_gd = w_norm / scales

print("\\n=== 2. 批量梯度下降数值解 (BGD) ===")
print(f"BGD 拟合系数: 偏置 = {w_gd[0]:.4f}, x 项 = {w_gd[1]:.4f}, x^2 项 = {w_gd[2]:.4f}")
print("解析解与梯度下降解最大绝对误差:", np.max(np.abs(w_analytical - w_gd)))
"""

    lesson_1 = lesson(
        lesson_id="ml-algo-l1-1",
        title="线性回归与多项式回归：从正规方程到梯度优化",
        content=l1_content,
        difficulty=3,
        tips=[
            tip("高阶多项式剧烈振荡：多项式回归阶数切忌过高（Runge 现象），在数据边界处高阶曲线会发生剧烈的过拟合翘尾振荡。", "pitfall"),
            tip("SVD 替代直接求逆：工程实践中若直接用正规方程，使用 `np.linalg.pinv`（基于 SVD）而非 `np.linalg.inv`，可防范共线性不可逆异常。", "performance")
        ],
        demos=[
            demo(code=l1_code, title="多项式回归设计矩阵构建、正规方程与梯度下降对比")
        ]
    )

    # ── Lesson 1.2 ──
    l2_content = """### 学习目标
学完本节，你应该能够：
1. 掌握三大经典正则化线性模型：**岭回归（Ridge，$L_2$）**、**Lasso 回归（$L_1$）**与**弹性网络（ElasticNet）**的数学表达；
2. 从等高线几何切线图景，严密证明为什么 $L_1$ 正则化的菱形尖角能够精确产生参数稀疏解（权重置零）；
3. 掌握 Lasso 在不可导点处的次梯度（Subgradient）与**坐标下降法（Coordinate Descent）**软阈值更新算法；
4. 掌握岭回归通过向对角线注入 $\\alpha I$ 根除矩阵不可逆与病态多重共线性的代数机制；
5. 编写代码追踪特征权重随正则化强度 $\\alpha$ 变化的**正则化路径（Regularization Path）**，直观观察 Lasso 的逐步特征淘汰过程。

### 前置知识
- 向量的 $L_1$ 与 $L_2$ 范数；
- 凸优化拉格朗日乘子法与次梯度概念。

### 问题背景与 ML 用途
普通线性回归在特征之间存在多重共线性（Multicollinearity）或特征数远大于样本数（$p > n$）时，会产生灾难性的过拟合：
- 矩阵 $X^T X$ 接近奇异不可逆，权重解向量模长会爆炸式膨胀到几百万；
- 两个完全等价的特征可能被赋予一正一负两个天文数字权重（$+10^6$ 和 $-10^6$），彼此对冲抵消，模型极度脆弱。
如何驯服这种病态参数爆炸？
- **Ridge（岭回归）**通过施加 $L_2$ 权重收缩，给参数戴上平滑紧箍咒，保证解的数值绝对稳定；
- **Lasso** 通过施加 $L_1$ 范数约束，能在训练过程中**自动将无用或冗余特征的权重精确压缩至严格的 0**，从而天然兼具“模型拟合”与“自动特征筛选”的双重神效！

### 直觉理解
- **圆球约束 vs 菱形尖角（稀疏性几何之谜）**：
  想象均方误差的损失等高线是一圈圈向外扩散的同心椭圆，最优解是椭圆中心。现在我们给参数加上预算约束：
  - $L_2$ 正则化约束区域是一个**光滑的正圆形球体**（$\\sum w_j^2 \\le C$）。当椭圆等高线从外向内膨胀接触到圆形边界时，切点几乎必然落在平滑的圆弧曲面上，此时两个参数都不为 0，只是被均匀收缩变小。
  - $L_1$ 正则化约束区域是一个**带有锋利棱角的四边形菱形**（$\\sum |w_j| \\le C$）。膨胀的等高线椭圆在碰到菱形边界时，**极大概率会首先碰撞到菱形突出在坐标轴上的尖角（Vertex）**！而坐标轴上的尖角位置，恰恰意味着另一个特征的权重分量严格为 0（$w_2 = 0$）！这就是 Lasso 能自动挑选特征并产生稀疏解的几何第一性原理！

### 核心概念与符号对照表
| 核心概念 | 目标损失函数 | 正则化约束形态 | 核心优势与输出特性 |
| --- | --- | --- | --- |
| **Ridge 岭回归** | $\\frac{1}{2n}\\|y - Xw\\|_2^2 + \\frac{\\alpha}{2}\\|w\\|_2^2$ | $L_2$ 范数圆球 | 拥有解析闭式解，彻底消除病态共线性，参数平滑收缩 |
| **Lasso 回归** | $\\frac{1}{2n}\\|y - Xw\\|_2^2 + \\alpha \\|w\\|_1$ | $L_1$ 范数菱形 | **稀疏参数解**（自动特征选择，不重要特征直接为 0） |
| **ElasticNet 弹性网络** | $\\text{MSE} + \\alpha \\rho \\|w\\|_1 + \\frac{\\alpha(1-\\rho)}{2}\\|w\\|_2^2$ | $L_1 + L_2$ 凸组合 | 兼具 Lasso 稀疏特征筛选与 Ridge 群组效应（Group Effect） |
| **软阈值算子** | $\\mathcal{S}_{\\tau}(z) = \\text{sign}(z)\\max(|z|-\\tau, 0)$ | 坐标下降一维更新解析解 | Lasso 核心优化引擎 |

### 数学原理与逐步推导
#### 1. 岭回归闭式解对奇异性的根治
岭回归的目标函数为：
$$\\mathcal{L}_{\\text{Ridge}}(\\mathbf{w}) = \\frac{1}{2} \\|\\mathbf{y} - X\\mathbf{w}\\|_2^2 + \\frac{\\alpha}{2} \\|\\mathbf{w}\\|_2^2$$
对其求导并令梯度为零：
$$\\nabla_{\\mathbf{w}} \\mathcal{L} = X^T (X\\mathbf{w} - \\mathbf{y}) + \\alpha \\mathbf{w} = (X^T X + \\alpha I_p) \\mathbf{w} - X^T \\mathbf{y} = \\mathbf{0}$$
得出闭式解：
$$\\mathbf{w}^*_{\\text{Ridge}} = (X^T X + \\alpha I_p)^{-1} X^T \\mathbf{y}$$
**数学保证**：
半正定矩阵 $X^T X$ 的所有特征值均为非负数 $\\lambda_i \\ge 0$。
加上 $\\alpha I_p$（$\\alpha > 0$）后，新矩阵 $(X^T X + \\alpha I_p)$ 的所有特征值严格变为 $\\lambda_i + \\alpha \\ge \\alpha > 0$！
因此新矩阵**必定为严格正定矩阵，100% 可逆**，且其条件数被牢牢控制在有界范围内，彻底消除了除以零的数值奇点。

#### 2. Lasso 的软阈值算子（Soft-Thresholding）
在特征正交化假定下，考虑单变量 Lasso 问题：
$$\\min_{w} \\frac{1}{2} (w - z)^2 + \\alpha |w|$$
由于绝对值函数在 $w = 0$ 处不可导，使用次梯度：
- 当 $w > 0$ 时，导数为 $(w - z) + \\alpha = 0 \\implies w = z - \\alpha$（仅当 $z > \\alpha$ 时成立）；
- 当 $w < 0$ 时，导数为 $(w - z) - \\alpha = 0 \\implies w = z + \\alpha$（仅当 $z < -\\alpha$ 时成立）；
- 当 $|z| \\le \\alpha$ 时，极小值严格锁定在不可导点 $w = 0$！
统一写为**软阈值算子**：
$$w^* = \\mathcal{S}_{\\alpha}(z) = \\text{sign}(z) \\max(|z| - \\alpha, 0)$$
当相关性信号强度 $|z|$ 弱于阈值 $\\alpha$ 时，权重被强行直接抹平为严格的 0！

### 几何图景与计算图
```
L2 平滑收缩 vs L1 菱形尖角产生稀疏解几何对比：
L2 岭回归 (光滑圆球):                 L1 Lasso (尖锐菱形):
      w2 ^                                  w2 ^
         │     (椭圆等高线)                    │     (椭圆等高线)
         │    /     \                          │    /     \
    ─────┼───o───────*──────▶ w1          ─────┼───o───────[★]────▶ w1 (切点必在尖角!)
         │  切点不在轴上                       │  切在坐标轴上: w2 严格等于 0!
         │  (w1, w2 均非零)                    │  (自动剔除特征 2，达成特征稀疏化!)
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：做 Ridge 或 Lasso 之前不进行特征标准化
> 正则化项 $\\sum w_j^2$ 或 $\\sum |w_j|$ 对所有特征的惩罚力度是完全一视同仁的！如果特征 1 的量纲极大（导致其理论权重很小），特征 2 的量纲极小（导致其理论权重极大），正则化项会疯狂惩罚特征 2，而放任特征 1 不管，造成严重的偏向失衡。**在使用 Ridge、Lasso、ElasticNet 之前，必须对所有特征进行 StandardScaler 标准化！**

### 工业界实践与工程考量
- 当特征集包含成组高度相关的特征（例如图像中相邻的一片像素）时，Lasso 会随机挑选其中一个特征而将其余全部置零，表现出不稳定的波动；而 ElasticNet 结合了 $L_2$ 范数的强凸性，能产生**群组效应（Group Effect）**，将这组相关特征作为一个整体同时保留，是工业界综合表现最稳健的正则化选择。

### 延伸思考与进阶阅读
- 阅读 Robert Tibshirani 奠基之作《Regression shrinkage and selection via the lasso》(JRSS-B, 1996)。
- 思考：为什么带有 $L_1$ 正则项的优化问题无法使用普通光滑梯度下降法求解？近端梯度法（Proximal Gradient Method / ISTA）是如何将光滑梯度步与非光滑软阈值步完美融合的？

### 本节小结
- Ridge 消除多重共线性，保证参数平滑稳健；
- Lasso 菱形几何角切点产生稀疏解，兼具参数收缩与自动特征筛选。"""

    l2_code = """import numpy as np
from sklearn.linear_model import Ridge, Lasso
from sklearn.preprocessing import StandardScaler

# 构造一个包含多重共线性与无关噪声特征的数据集 (50 个样本，5 个特征)
np.random.seed(42)
n_samples = 50
X_base = np.random.randn(n_samples, 2)
# 特征 1, 2 为真实有效信号
# 特征 3 为特征 1 的强共线性拷贝 (加上微小噪声)
x3_collinear = X_base[:, 0] + np.random.normal(0, 0.01, size=n_samples)
# 特征 4, 5 为纯随机无关白噪声
x4_noise = np.random.randn(n_samples)
x5_noise = np.random.randn(n_samples)

X_raw = np.column_stack([X_base, x3_collinear, x4_noise, x5_noise])
# 真实数据生成机制: y = 3 * x1 - 2 * x2 + 噪声 (特征 3, 4, 5 均为冗余)
y = 3.0 * X_raw[:, 0] - 2.0 * X_raw[:, 1] + np.random.normal(0, 0.2, size=n_samples)

# 必须先做标准化，保证正则化惩罚尺度公平
X = StandardScaler().fit_transform(X_raw)

# 1. 拟合未正则化最小二乘 OLS
w_ols = np.linalg.pinv(X) @ y
print("=== 1. 未正则化 OLS 权重 (受共线性影响，权重被撕裂) ===")
print("特征权重 [x1, x2, x3_共线, x4_噪声, x5_噪声]:")
print(np.round(w_ols, 3))

# 2. 拟合 Ridge 岭回归 (L2 正则化: alpha = 10.0)
ridge = Ridge(alpha=10.0, fit_intercept=False).fit(X, y)
print("\\n=== 2. Ridge 岭回归权重 (L2: 平滑收缩，权重数值健康缩小) ===")
print(np.round(ridge.coef_, 3))

# 3. 拟合 Lasso 稀疏回归 (L1 正则化: alpha = 0.5)
lasso = Lasso(alpha=0.5, fit_intercept=False).fit(X, y)
print("\\n=== 3. Lasso 稀疏回归权重 (L1: 自动将共线性与噪声特征精确置零!) ===")
print(np.round(lasso.coef_, 3))
print(f"Lasso 自动剔除的特征数量: {np.sum(lasso.coef_ == 0)} 个 (成功实现稀疏特征选择!)")
"""

    lesson_2 = lesson(
        lesson_id="ml-algo-l1-2",
        title="正则化线性模型：Ridge、Lasso 与稀疏性几何之谜",
        content=l2_content,
        difficulty=4,
        tips=[
            tip("必须在正则化前标准化：正则化算子对所有维度的参数惩罚权重相同，未做 StandardScale 会导致大尺度特征逃脱惩罚、小尺度特征被过度扼杀。", "pitfall"),
            tip("高相关特征用 ElasticNet：特征间存在成团高度相关时，Lasso 会随机盲选一个，此时选用 ElasticNet 能够稳定捕获群组特征。", "interview")
        ],
        demos=[
            demo(code=l2_code, title="共线性噪声数据下 OLS / Ridge / Lasso 权重稀疏性对比")
        ]
    )

    # ── Lesson 1.3 ──
    l3_content = """### 学习目标
学完本节，你应该能够：
1. 掌握广义线性模型（GLM）架构与**逻辑回归（Logistic Regression）**的 Sigmoid 激活函数映射；
2. 理解**几率（Odds）**与**对数几率（Log-Odds / Logit）**的概念，推导逻辑回归在对数几率意义下的严格线性决策边界；
3. 从伯努利分布构建二元交叉熵损失函数（BCE Loss），严密证明其关于权重 $\\mathbf{w}$ 的严格凸性（严格无局部极小）；
4. 推导逻辑回归损失函数的梯度向量与 Hessian 矩阵，掌握牛顿-拉夫逊（Newton-Raphson / IRLS）优化算法；
5. 编写代码从零实现带 L2 正则化的逻辑回归梯度下降二分类器，输出概率校准曲线与决策超平面。

### 前置知识
- 导数链式法则；
- 极大似然估计与伯努利分布似然度。

### 问题背景与 ML 用途
如果直接用线性回归去预测分类问题（如预测患者是否有心脏病，标签 $y \\in \\{0, 1\\}$）：
- 线性模型的输出范围是 $(-\\infty, +\\infty)$，会荒谬地预测出 $-0.8$ 或 $1.7$ 的概率；
- 远离分类超平面的极端正确样本（如健康状况极佳的年轻人）会产生巨大的残差平方惩罚，强行将原本正确的分类边界推离最优位置。
**逻辑回归（Logistic Regression）是整个分类算法王国中最坚固的基石**：
- 它通过 Sigmoid 单调光滑压缩，将实数域输出映射为合法的区间 $(0, 1)$ 概率；
- 在互联网广告点击率预估（CTR）、反欺诈风控、医学流行病学危险度评分中，逻辑回归不仅给出二分类判决，更能输出**高度可信的后验概率值**。

### 直觉理解
- **S 型压缩阀与几率的对数转换**：
  我们希望预测一匹马在比赛中获胜的几率。如果获胜概率是 $p = 0.8$，输掉的概率是 $1 - p = 0.2$，那么“赢面几率（Odds）”是 $0.8 / 0.2 = 4$（赢是输的 4 倍）。
  对几率取自然对数，得到对数几率 $\\text{logit}(p) = \\ln\\left(\\frac{p}{1-p}\\right)$。
  逻辑回归的核心假设极其优美直观：**对数几率与输入特征呈严格的线性加权关系！**
  $$\\ln\\left(\\frac{p}{1-p}\\right) = \\mathbf{w}^T \\mathbf{x}$$
  通过对两边反解出 $p$，就自然推导出了经典的 S 型 **Sigmoid 函数**！

### 核心概念与符号对照表
| 核心概念 | 符号 / 公式 | 域与范围 | 在机器学习中的核心用途 |
| --- | --- | --- | --- |
| **Sigmoid 激活** | $\\sigma(z) = \\frac{1}{1 + e^{-z}}$ | $\\mathbb{R} \\to (0, 1)$ | 将线性打分连续单调压缩为合法概率 |
| **Sigmoid 导数对称性** | $\\sigma'(z) = \\sigma(z)(1 - \\sigma(z))$ | 极值在 $z=0$ 处取得 0.25 | 反向传播梯度推导的核心简化利器 |
| **对数几率 (Logit)** | $\\ln\\frac{p}{1-p} = \\mathbf{w}^T \\mathbf{x}$ | $(-\\infty, +\\infty)$ | 线性决策超平面的代数本质（边界为 $\\mathbf{w}^T \\mathbf{x} = 0$） |
| **二元交叉熵损失** | $\\mathcal{L}(\\mathbf{w}) = -\\frac{1}{n}\\sum [y_i \\ln \\hat{y}_i + (1-y_i)\\ln(1-\\hat{y}_i)]$ | 恒非负 | 逻辑回归极大似然等价损失函数 |
| **Softmax 多分类扩展** | $P(y=k \\mid \\mathbf{x}) = \\frac{e^{\\mathbf{w}_k^T \\mathbf{x}}}{\\sum e^{\\mathbf{w}_j^T \\mathbf{x}}}$ | 概率和恒为 1 | 多分类逻辑回归与深度学习分类输出层 |

### 数学原理与逐步推导
#### 1. 逻辑回归梯度公式推导
设模型预测概率为 $\\hat{y}_i = \\sigma(\\mathbf{w}^T \\mathbf{x}_i)$。单个样本的对数似然损失为：
$$\\ell_i(\\mathbf{w}) = -y_i \\ln(\\hat{y}_i) - (1 - y_i) \\ln(1 - \\hat{y}_i)$$
利用链式法则对参数 $\\mathbf{w}$ 求偏导：
$$\\frac{\\partial \\ell_i}{\\partial \\mathbf{w}} = \\frac{\\partial \\ell_i}{\\partial \\hat{y}_i} \\cdot \\frac{\\partial \\hat{y}_i}{\\partial z_i} \\cdot \\frac{\\partial z_i}{\\partial \\mathbf{w}}$$
分别计算三个偏导项：
1. $\\frac{\\partial \\ell_i}{\\partial \\hat{y}_i} = -\\frac{y_i}{\\hat{y}_i} + \\frac{1 - y_i}{1 - \\hat{y}_i} = \\frac{\\hat{y}_i - y_i}{\\hat{y}_i (1 - \\hat{y}_i)}$
2. $\\frac{\\partial \\hat{y}_i}{\\partial z_i} = \\sigma'(z_i) = \\hat{y}_i (1 - \\hat{y}_i)$
3. $\\frac{\\partial z_i}{\\partial \\mathbf{w}} = \\mathbf{x}_i$
将三项相乘，**中间项 $\\hat{y}_i (1 - \\hat{y}_i)$ 发生惊人而优雅的绝对抵消**！
$$\\frac{\\partial \\ell_i}{\\partial \\mathbf{w}} = \\frac{\\hat{y}_i - y_i}{\\hat{y}_i (1 - \\hat{y}_i)} \\cdot \\hat{y}_i (1 - \\hat{y}_i) \\cdot \\mathbf{x}_i = (\\hat{y}_i - y_i) \\mathbf{x}_i$$
全数据集的总梯度为：
$$\\nabla_{\\mathbf{w}} \\mathcal{L}(\\mathbf{w}) = \\frac{1}{n} \\sum_{i=1}^n (\\hat{y}_i - y_i) \\mathbf{x}_i = \\frac{1}{n} X^T (\\hat{\\mathbf{y}} - \\mathbf{y})$$
**结论**：其梯度形式与线性回归的 $\\frac{1}{n} X^T (X\\mathbf{w} - \\mathbf{y})$ 在代数结构上惊人一致！只是将连续预测值替换为了概率预测值 $\\hat{\\mathbf{y}}$。

#### 2. 二阶 Hessian 与严格凸性证明
对一阶梯度再次求导，得到 Hessian 矩阵：
$$\\nabla^2 \\mathcal{L}(\\mathbf{w}) = \\frac{1}{n} \\sum_{i=1}^n \\hat{y}_i (1 - \\hat{y}_i) \\mathbf{x}_i \\mathbf{x}_i^T = \\frac{1}{n} X^T S X$$
其中权重矩阵 $S = \\text{diag}(\\hat{y}_1(1-\\hat{y}_1), \\dots, \\hat{y}_n(1-\\hat{y}_n))$。
由于 Sigmoid 输出 $\\hat{y}_i \\in (0, 1)$，其方差项 $\\hat{y}_i (1 - \\hat{y}_i) > 0$ 恒大于零！
对于任意非零向量 $\\mathbf{v}$：
$$\\mathbf{v}^T \\nabla^2 \\mathcal{L}(\\mathbf{w}) \\mathbf{v} = \\frac{1}{n} (X \\mathbf{v})^T S (X \\mathbf{v}) = \\frac{1}{n} \\sum_{i=1}^n \\hat{y}_i(1-\\hat{y}_i) (\\mathbf{x}_i^T \\mathbf{v})^2 \\ge 0$$
**定理得证**：逻辑回归损失函数的 Hessian 矩阵全域半正定，**目标函数是严格的凸函数（Convex Function）**！这保证了无论采用梯度下降、拟牛顿法（L-BFGS）还是坐标下降，都**必定能够收敛到全局唯一最优解，绝不可能陷入任何不良局部极小**！

### 几何图景与计算图
```
逻辑回归前向决策计算图：
输入特征向量 x ──▶ 线性点积加权 z = w^T x ──▶ Sigmoid 激活 p = 1 / (1 + e^-z) ──▶ 输出预测概率
                                              │
                                              ▼
                    决策分界超平面 (p = 0.5 <==> z = w^T x = 0)
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：样本线性不可分时，逻辑回归就完全不能用了
> 逻辑回归自身的超平面在原始特征空间中是线性的。但正如多项式回归一样，只要我们对原始特征施加非线性特征变换（例如构造多项式特征、交叉特征、或者使用连续特征分箱 One-Hot），**逻辑回归就能在原始空间拟合出极其复杂的非线性双峰决策曲面**！工业界亿级参数的推荐 CTR 预估（如经典的 LR+GBDT 或 FTRL）正是利用海量交叉特征构建出的强大非线性模型。

### 工业界实践与工程考量
- 工业界训练逻辑回归时，几乎**永远默认开启 L2 正则化（`C=1.0`）**。为什么？因为在数据完全线性可分（Linearly Separable）的极端理想情况下，为了让交叉熵损失逼近 0，未正则化的逻辑回归权重会无限向无穷大发散（$\\mathbf{w} \\to \\infty$），导致数值溢出。L2 正则项能够牢牢锚定权重模长。

### 延伸思考与进阶阅读
- 阅读 Christopher M. Bishop《PRML》第 4.3 节：概率判别式模型与 IRLS 迭代加权最小二乘法。
- 思考：在正负样本极度不均衡（例如欺诈率只有 0.1%）时，逻辑回归预测出的概率会出现整体偏低。如何通过对偏置项 $b$ 进行理论后验概率校准公式调整，将预测概率还原至真实分布？

### 本节小结
- 逻辑回归是对数几率的线性模型，极大似然导出二元交叉熵损失；
- 损失函数具备严格凸性，梯度形式优美，L2 正则化可保障参数稳定性。"""

    l3_code = """import numpy as np
from sklearn.linear_model import LogisticRegression

# 构造一个 2 维二分类线性可分玩具数据集 (40 个样本)
np.random.seed(42)
n_pts = 20
class_0 = np.random.normal(loc=[-1.5, -1.5], scale=0.8, size=(n_pts, 2))
class_1 = np.random.normal(loc=[1.5, 1.5], scale=0.8, size=(n_pts, 2))

X = np.vstack([class_0, class_1])
y = np.array([0] * n_pts + [1] * n_pts)

# 1. 从零手写带 L2 正则化的逻辑回归梯度下降训练器
def train_logistic_regression(X, y, lr=0.1, alpha=0.1, epochs=300):
    n, d = X.shape
    # 增加偏置列
    X_b = np.column_stack([np.ones(n), X])
    w = np.zeros(d + 1)

    for epoch in range(epochs):
        z = X_b @ w
        # 数值稳定版 Sigmoid
        p = 1.0 / (1.0 + np.exp(-np.clip(z, -20, 20)))
        # 梯度: 1/n * X^T (p - y) + alpha * w (偏置项不正则化)
        grad = (X_b.T @ (p - y)) / n
        grad[1:] += alpha * w[1:]
        w -= lr * grad

    return w

w_scratch = train_logistic_regression(X, y, lr=0.2, alpha=0.01, epochs=500)
print("=== 1. 从零手写逻辑回归训练结果 ===")
print(f"偏置权重 b = {w_scratch[0]:.4f}")
print(f"特征权重 w1 = {w_scratch[1]:.4f}, w2 = {w_scratch[2]:.4f}")

# 2. 与 Scikit-Learn 官方标准实现对比
clf = LogisticRegression(C=100.0, fit_intercept=True).fit(X, y)
print("\\n=== 2. Scikit-Learn 官方模型参数对比 ===")
print(f"官方偏置 b = {clf.intercept_[0]:.4f}")
print(f"官方特征权重 w = {clf.coef_[0]}")

# 3. 测试一个新样本的分类与后验概率输出
x_test = np.array([[0.0, 0.0], [2.0, 2.0]])
prob_scratch = 1.0 / (1.0 + np.exp(-np.clip(np.column_stack([np.ones(2), x_test]) @ w_scratch, -20, 20)))
prob_sklearn = clf.predict_proba(x_test)[:, 1]

print("\\n=== 3. 预测点后验概率对比 ===")
print("测试点 [0, 0] (分界中线附近) 预测概率:", round(prob_scratch[0], 4), "vs 官方:", round(prob_sklearn[0], 4))
print("测试点 [2, 2] (正类核心深处) 预测概率:", round(prob_scratch[1], 4), "vs 官方:", round(prob_sklearn[1], 4))
"""

    lesson_3 = lesson(
        lesson_id="ml-algo-l1-3",
        title="逻辑回归与最大似然：几率比、二元交叉熵与凸优化",
        content=l3_content,
        difficulty=3,
        tips=[
            tip("概率饱和截断防越界：在计算 Sigmoid 或交叉熵损失时，必须对线性打分做 `np.clip(z, -20, 20)`，防止 `exp` 计算发生浮点下溢/上溢。", "performance"),
            tip("永远开启 L2 正则防发散：在完全线性可分的数据上，未加正则项的逻辑回归权重会趋于无穷大发散，必须通过 L2 正则化约束参数模长。", "interview")
        ],
        demos=[
            demo(code=l3_code, title="从零实现逻辑回归梯度下降与 Scikit-Learn 权重及概率对标")
        ]
    )

    lessons = [lesson_1, lesson_2, lesson_3]

    # ── Exercises for Chapter 1 ──
    exercises = [
        single_choice(
            ex_id="ml-algo-c1-ex1",
            question="为什么在最小二乘线性回归（OLS）中，当特征之间存在严重的多重共线性（例如某两个特征完全线性相关）时，通过正规方程求解权重会失败？",
            options=[
                {"value": "A", "text": "因为特征矩阵 $X$ 不再列满秩，导致方阵 $X^T X$ 不可逆（行列式为 0），无法直接求解其逆矩阵 $(X^T X)^{-1}$"},
                {"value": "B", "text": "因为梯度下降法无法计算任何含有共线性特征的梯度"},
                {"value": "C", "text": "因为高斯马尔可夫定理要求特征必须服从均匀分布"},
                {"value": "D", "text": "因为多重共线性会导致训练集损失函数自动转变为非凸函数"},
            ],
            answer="A",
            explanation="正规方程闭式解 $\\mathbf{w}^* = (X^T X)^{-1} X^T \\mathbf{y}$ 的数学前提是 $X^T X$ 严格可逆。当特征存在完全共线性时，列空间退化，$\\text{rank}(X) < p$，方阵 $X^T X$ 为奇异矩阵（不可逆），导致普通最小二乘无法求得唯一解。",
            difficulty=2,
            related_lesson_id="ml-algo-l1-1",
            tags=["正规方程", "多重共线性", "奇异矩阵", "线性代数条件"],
        ),
        judge(
            ex_id="ml-algo-c1-ex2",
            question="Lasso 回归（$L_1$ 正则化）之所以能够将部分无关或冗余特征的权重精确压缩至严格为 0（产生稀疏参数解），其几何本质是因为其 $L_1$ 约束区域在坐标轴上具有锋利的尖角（Vertex），等高线与尖角相切的概率极高。",
            answer=True,
            explanation="正确。从拉格朗日几何切点视角看，$L_1$ 范数单位球是具有锐利顶点的多面体菱形，二次损失函数的椭圆等高线在膨胀接触菱形时极大概率碰撞到位于坐标轴上的顶点，而在坐标轴上的顶点处，其余非轴向的特征权重严格为零。",
            difficulty=2,
            related_lesson_id="ml-algo-l1-2",
            tags=["Lasso稀疏性", "L1范数", "几何切点", "特征选择"],
        ),
        multiple_choice(
            ex_id="ml-algo-c1-ex3",
            question="关于逻辑回归（Logistic Regression）的数理性质与工程特性，下列说法正确的有：",
            options=[
                {"value": "A", "text": "逻辑回归输出的概率值在对数几率（Log-odds / Logit）空间中与输入特征呈严格的线性加权关系"},
                {"value": "B", "text": "二元交叉熵损失函数（BCE）关于模型权重 $\\mathbf{w}$ 的 Hessian 矩阵全域半正定，是严格的凸优化问题，无局部极小陷阱"},
                {"value": "C", "text": "若训练数据是严格线性可分的，未添加正则化的逻辑回归在梯度优化中权重参数模长会无限发散膨胀"},
                {"value": "D", "text": "逻辑回归仅能解决严格线性可分问题，无论如何添加多项式特征或特征交叉都无法形成非线性决策边界"},
            ],
            answer=["A", "B", "C"],
            explanation="A、B、C 均为逻辑回归的核心数理性质。D 是错误的：通过对输入特征进行多项式增广、核映射或连续分箱特征交叉，逻辑回归在原始特征空间中能够拟合出极其高度非线性的复杂分离曲面。",
            difficulty=3,
            related_lesson_id="ml-algo-l1-3",
            tags=["逻辑回归", "凸函数", "对数几率", "BCE损失"],
        ),
        fill(
            ex_id="ml-algo-c1-ex4",
            question="在岭回归（Ridge）中，为防止矩阵奇异并平滑收缩权重，正规方程闭式解在 $X^T X$ 上注入了一个对角矩阵，其公式为 $\\mathbf{w}^* = (X^T X + $____$)^{-1} X^T \\mathbf{y}$；综合结合了 $L_1$ 稀疏特征筛选与 $L_2$ 消除共线性稳定性的混合正则化模型被称为 ____ 网络（ElasticNet）。",
            blanks=[
                ["\\alpha I", "\\alpha I_p", "alpha * I", "lambda I", "\\lambda I"],
                ["弹性", "弹性网络", "ElasticNet"]
            ],
            explanation="岭回归注入对角正则化项为 $\\alpha I$；结合 L1 与 L2 惩罚项的模型被称为弹性网络（ElasticNet）。",
            difficulty=2,
            related_lesson_id="ml-algo-l1-2",
            tags=["岭回归公式", "弹性网络", "正则化对偶"],
        ),
        open_ex(
            ex_id="ml-algo-c1-ex5",
            question="【严谨数理推导题】请系统完成普通最小二乘法（OLS）到岭回归（Ridge）的矩阵微积分推导：\n1. 明确写出多元线性回归在特征矩阵 $X \\in \\mathbb{R}^{n \\times p}$ 下的均方误差损失函数 $\\mathcal{L}_{\\text{OLS}}(\\mathbf{w}) = \\frac{1}{2}\\|\\mathbf{y} - X\\mathbf{w}\\|_2^2$ 的矩阵展开式；\n2. 运用矩阵求导法则，推导出一阶梯度表达式 $\\nabla_{\\mathbf{w}} \\mathcal{L}$，并得出正规方程 $(X^T X)\\mathbf{w} = X^T \\mathbf{y}$；\n3. 加入 $L_2$ 正则化惩罚项 $\\frac{\\alpha}{2}\\|\\mathbf{w}\\|_2^2$（$\\alpha > 0$），写出目标函数并求出岭回归闭式解；\n4. 从矩阵特征谱（Eigenvalues）的角度，严格证明为什么岭回归的闭式解能够彻底解决 $X^T X$ 不可逆的奇异性病态问题。",
            reference_answer="""推导与谱分析如下：
1. 均方误差矩阵展开：
   $$\\mathcal{L}_{\\text{OLS}}(\\mathbf{w}) = \\frac{1}{2} (\\mathbf{y} - X\\mathbf{w})^T (\\mathbf{y} - X\\mathbf{w}) = \\frac{1}{2} \\left( \\mathbf{y}^T \\mathbf{y} - 2 \\mathbf{w}^T X^T \\mathbf{y} + \\mathbf{w}^T X^T X \\mathbf{w} \\right)$$

2. 一阶求导与正规方程：
   根据矩阵微积分法则 $\\nabla_{\\mathbf{w}} (\\mathbf{w}^T A) = A$ 以及 $\\nabla_{\\mathbf{w}} (\\mathbf{w}^T B \\mathbf{w}) = (B + B^T)\\mathbf{w}$：
   $$\\nabla_{\\mathbf{w}} \\mathcal{L} = -X^T \\mathbf{y} + X^T X \\mathbf{w} = X^T (X\\mathbf{w} - \\mathbf{y})$$
   令一阶梯度等于零，得出经典正规方程：
   $$(X^T X) \\mathbf{w} = X^T \\mathbf{y}$$

3. 岭回归目标函数与闭式解：
   引入 $L_2$ 正则项：
   $$\\mathcal{L}_{\\text{Ridge}}(\\mathbf{w}) = \\frac{1}{2} \\|\\mathbf{y} - X\\mathbf{w}\\|_2^2 + \\frac{\\alpha}{2} \\|\\mathbf{w}\\|_2^2$$
   求梯度：
   $$\\nabla_{\\mathbf{w}} \\mathcal{L}_{\\text{Ridge}} = (X^T X)\\mathbf{w} - X^T \\mathbf{y} + \\alpha \\mathbf{w} = (X^T X + \\alpha I_p) \\mathbf{w} - X^T \\mathbf{y} = \\mathbf{0}$$
   两边左乘逆矩阵，得出岭回归解析闭式解：
   $$\\mathbf{w}^*_{\\text{Ridge}} = (X^T X + \\alpha I_p)^{-1} X^T \\mathbf{y}$$

4. 谱分析证明可逆性：
   实对称矩阵 $X^T X$ 为半正定矩阵，其所有特征值满足 $\\lambda_i \\ge 0$。
   加入 $\\alpha I_p$（$\\alpha > 0$）后，新矩阵 $M = X^T X + \\alpha I_p$ 具有相同的特征向量基底，且其对应的特征值变为：
   $$\\mu_i = \\lambda_i + \\alpha \\ge \\alpha > 0$$
   由于所有特征值均严格大于正常数 $\\alpha$，矩阵 $M$ 的行列式 $\\det(M) = \\prod \\mu_i \\ge \\alpha^p > 0$ 恒严格非零，因此矩阵 $M$ 严格正定，**在数学上 100% 绝对可逆**，且其逆矩阵的最大范数被控制在 $1/\\alpha$ 之内，彻底根除了数值奇异爆炸。""",
            explanation="系统结合矩阵微积分展开、正规方程推导、岭回归闭式解以及基于特征值下界大于 0 的严密可逆性代数证明。",
            rubric=[
                {"point": "正确写出矩阵展开式并准确应用矩阵求导法则推导正规方程", "score": 25},
                {"point": "准确建立岭回归目标函数并推导出闭式解 (X^T X + \\alpha I)^(-1) X^T y", "score": 25},
                {"point": "深刻分析 X^T X 的半正定特征值 \\lambda_i >= 0 性质", "score": 25},
                {"point": "严谨证明加 \\alpha I 后特征值严格大于 \\alpha > 0 并得出绝对可逆结论", "score": 25},
            ],
            difficulty=4,
            related_lesson_id="ml-algo-l1-2",
            tags=["正规方程", "岭回归闭式解", "矩阵微积分", "特征值谱分析"],
        ),
        # ── Code Exercise 1 ──
        {
            "id": "ml-algo-c1-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】实现带 L2 正则化的岭回归（Ridge Regression）闭式解求解器：\n编写函数 `linear_regression_ridge_closed_form(X, y, alpha=1.0)`：\n接收一个 2D 数组或列表 $X \\in \\mathbb{R}^{n \\times d}$（假定已包含必要的偏置常数列或经过标准化，特征数为 $d$）和一个 1D 数组或列表 $y \\in \\mathbb{R}^n$（目标标签），以及正则化参数 $\\alpha \\ge 0$。\n根据岭回归闭式解公式：\n$$\\mathbf{w}^* = (X^T X + \\alpha I_d)^{-1} X^T \\mathbf{y}$$\n计算并返回权重参数向量（NumPy 浮点数组转化为嵌套 Python 列表，每个权重元素使用 `round(float(w), 4)` 保留 4 位小数）。\n\n最后一行请返回调用示例在测试数据 `X_demo = [[1.0, 2.0], [2.0, 1.0], [3.0, 4.0], [4.0, 3.0]]`, `y_demo = [5.0, 4.0, 11.0, 10.0]`（$\\alpha = 0.1$）下的计算结果。",
            "starterCode": "import numpy as np\n\ndef linear_regression_ridge_closed_form(X, y, alpha: float = 1.0) -> list:\n    \"\"\"利用正规方程闭式解计算带 L2 正则化的岭回归最优参数权重\"\"\"\n    # 请在此实现\n    ___\n\nX_demo = [[1.0, 2.0], [2.0, 1.0], [3.0, 4.0], [4.0, 3.0]]\ny_demo = [5.0, 4.0, 11.0, 10.0]\nlinear_regression_ridge_closed_form(X_demo, y_demo, alpha=0.1)\n",
            "setupCode": "",
            "expectedOutput": "[1.0212, 1.9736]",
            "answer": "import numpy as np\n\ndef linear_regression_ridge_closed_form(X, y, alpha: float = 1.0) -> list:\n    X = np.array(X, dtype=float)\n    y = np.array(y, dtype=float)\n    d = X.shape[1]\n    I = np.eye(d)\n    w = np.linalg.inv(X.T @ X + alpha * I) @ X.T @ y\n    return [round(float(x), 4) for x in w]\n\nX_demo = [[1.0, 2.0], [2.0, 1.0], [3.0, 4.0], [4.0, 3.0]]\ny_demo = [5.0, 4.0, 11.0, 10.0]\nlinear_regression_ridge_closed_form(X_demo, y_demo, alpha=0.1)\n",
            "tests": "X_t = [[1.0], [2.0], [3.0]]\ny_t = [2.0, 4.0, 6.0]\nres_t = linear_regression_ridge_closed_form(X_t, y_t, alpha=1.0)\nassert res_t == [1.8667], f\"闭式解计算错误: {res_t}\"\n",
            "explanation": "利用 np.eye(d) 构建单位矩阵注入 X^T X 中，使用 np.linalg.inv 计算闭式解析解。",
            "tags": ["岭回归", "正规方程", "闭式解", "NumPy编程实战"],
            "related_lesson_id": "ml-algo-l1-2",
        },
        single_choice(
            ex_id="ml-algo-c1-ex7",
            question="在二分类逻辑回归中，若定义正类后验概率为 $p = P(y=1 \\mid \\mathbf{x})$，当对数几率 $\\mathbf{w}^T \\mathbf{x} = 0$ 时，模型输出的后验概率 $p$ 严格等于多少？",
            options=[
                {"value": "A", "text": "0.50（恰好位于决策超平面边界，分类不确定性最高）"},
                {"value": "B", "text": "0.00"},
                {"value": "C", "text": "1.00"},
                {"value": "D", "text": "0.75"},
            ],
            answer="A",
            explanation="由 Sigmoid 函数定义 $\\sigma(0) = \\frac{1}{1 + e^{-0}} = \\frac{1}{2} = 0.50$。当对数几率为 0 时，胜率几率 Odds 为 1（正负概率各半），对应二分类模型的决策超平面边界。",
            difficulty=2,
            related_lesson_id="ml-algo-l1-3",
            tags=["Sigmoid", "决策边界", "后验概率"],
        ),
    ]

    return chapter(
        chapter_id="ml-algo-c1",
        course_id="ml-classical-algorithms",
        order=1,
        title="广义线性模型与判别分类",
        goal="掌握 OLS 正规方程与几何投影，剖析 Ridge/Lasso 正则化稀疏对偶，掌握逻辑回归凸性与极大似然推导。",
        lessons=lessons,
        exercises=exercises,
    )
