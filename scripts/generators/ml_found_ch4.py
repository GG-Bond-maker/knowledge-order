# -*- coding: utf-8 -*-
"""
Chapter 4: 正则化方法与模型复杂度控制
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_4():
    # ── Lesson 4.1 ──
    l1_content = """### 学习目标
学完本节，你应该能够：
1. 掌握 L2 正则化（Ridge 回归 / 权重衰减 Weight Decay）的数学目标函数与闭式解推导；
2. 理解为什么在存在多重共线性（Multicollinearity）时，$\\mathbf{X}^T \\mathbf{X}$ 奇异不可逆，而 L2 正则化通过添加 $\\lambda \\mathbf{I}$ 使得矩阵严格正定可逆；
3. 从贝叶斯推断视角，严格证明 L2 正则化等价于参数服从高斯先验 $\\mathcal{N}(0, \\tau^2)$ 的最大后验估计（MAP）；
4. 运行代码实验，绘制不同正则化系数 $\\lambda$ 下特征权重的平滑收缩轨迹图（Ridge Trace）。

### 前置知识
- 线性代数中的矩阵转置、逆矩阵与对称正定矩阵；
- 多元微积分中的矩阵对向量求导法则：$\\frac{\\partial (\\mathbf{w}^T \\mathbf{A} \\mathbf{w})}{\\partial \\mathbf{w}} = 2\\mathbf{A}\\mathbf{w}$。

### 问题背景
在多项式拟合或高维特征回归中，当模型出现严重过拟合时，最显著的物理特征往往不是预测偏离，而是**模型权重参数的绝对值变得极其巨大**（例如部分特征权重高达 $+10^8$，相邻特征权重高达 $-10^8$）。两个巨大权重在细微处相互抵消，导致函数在样本点之间产生剧烈的高频振荡。
此外，当特征数量大于样本量（$p > n$）或者特征之间高度共线时，协方差矩阵 $\\mathbf{X}^T \\mathbf{X}$ 的条件数极差甚至完全奇异，普通最小二乘法（OLS）直接失效。
**L2 正则化（岭回归，Ridge Regression）**应运而生：通过对权重向量的欧氏范数平方施加显式惩罚，强行将参数平滑压缩，消除过拟合振荡。

### 直觉理解
想象一个在悬崖边走钢丝的杂技演员（模型参数）：
- **没有 L2 正则化**：演员可以任意向左或向右猛烈挥舞 100 米长的超重平衡木（参数幅度无穷大），稍微一阵微风（测试集扰动），整个人就会发生灾难性的剧烈倾覆；
- **引入 L2 正则化**：给平衡木绑上高强度的强力弹簧。只要演员试图大幅度摆动平衡木，弹簧就会产生巨大的向心拉力，强迫他用幅度极小、动作极稳的轻微微调维持平衡。参数幅度被牢牢压制在安全区间。

### 核心概念与符号对照表
| 核心概念 | 数学符号 | 表达式 / 含义 | 统计与几何特性 |
| --- | --- | --- | --- |
| **L2 正则项** | $\\Omega(\\mathbf{w})$ | $\\frac{1}{2}\\|\\mathbf{w}\\|_2^2 = \\frac{1}{2}\\sum_{j=1}^d w_j^2$ | 各向同性的球形等高线，严格平滑凸函数 |
| **岭回归目标** | $J_{\\text{Ridge}}(\\mathbf{w})$ | $\\frac{1}{2n}\\|\\mathbf{y} - \\mathbf{X}\\mathbf{w}\\|_2^2 + \\frac{\\lambda}{2}\\|\\mathbf{w}\\|_2^2$ | 在经验均方误差与权重欧氏范数之间权衡 |
| **闭式解析解** | $\\mathbf{w}^*$ | $(\\mathbf{X}^T \\mathbf{X} + n\\lambda \\mathbf{I})^{-1} \\mathbf{X}^T \\mathbf{y}$ | 永远严格满秩可逆，数值计算极度稳定 |
| **奇异值收缩** | $s_j \\rightarrow \\frac{s_j^2}{s_j^2 + n\\lambda}$ | 主成分方向投影系数的非零平滑收缩 | 小特征值（噪声方向）被深度压缩，大特征值被保留 |
| **贝叶斯先验** | Prior | $\\mathbf{w} \\sim \\mathcal{N}(\\mathbf{0}, \\tau^2 \\mathbf{I})$ | 假定权重以 0 为均值正态聚集 |

### 数学原理与逐步推导
#### 1. 岭回归闭式解矩阵求导
优化目标函数：
$$J(\\mathbf{w}) = \\frac{1}{2} (\\mathbf{y} - \\mathbf{X}\\mathbf{w})^T (\\mathbf{y} - \\mathbf{X}\\mathbf{w}) + \\frac{\\alpha}{2} \\mathbf{w}^T \\mathbf{w}$$
将其展开：
$$J(\\mathbf{w}) = \\frac{1}{2} \\left( \\mathbf{y}^T \\mathbf{y} - 2 \\mathbf{w}^T \\mathbf{X}^T \\mathbf{y} + \\mathbf{w}^T \\mathbf{X}^T \\mathbf{X} \\mathbf{w} \\right) + \\frac{\\alpha}{2} \\mathbf{w}^T \\mathbf{w}$$
对权重向量 $\\mathbf{w}$ 求一阶偏导数并令其等于零向量 $\\mathbf{0}$：
$$\\nabla_{\\mathbf{w}} J(\\mathbf{w}) = -\\mathbf{X}^T \\mathbf{y} + \\mathbf{X}^T \\mathbf{X} \\mathbf{w} + \\alpha \\mathbf{w} = \\mathbf{0}$$
提取公因式 $\\mathbf{w}$：
$$(\\mathbf{X}^T \\mathbf{X} + \\alpha \\mathbf{I}) \\mathbf{w} = \\mathbf{X}^T \\mathbf{y}$$
由于 $\\mathbf{X}^T \\mathbf{X}$ 是半正定矩阵（所有特征值 $\\mu_i \\ge 0$），而 $\\alpha \\mathbf{I}$（$\\alpha > 0$）为严格正定矩阵，因此其和矩阵 $(\\mathbf{X}^T \\mathbf{X} + \\alpha \\mathbf{I})$ 的所有特征值为 $\\mu_i + \\alpha > 0$，**必定严格正定，绝对可逆**！
两边左乘逆矩阵，得出唯一最优闭式解：
$$\\mathbf{w}^*_{\\text{Ridge}} = (\\mathbf{X}^T \\mathbf{X} + \\alpha \\mathbf{I})^{-1} \\mathbf{X}^T \\mathbf{y}$$

#### 2. 贝叶斯视角：高斯先验的最大后验估计（MAP）
设似然函数为高斯分布：$y \\mid \\mathbf{x}, \\mathbf{w} \\sim \\mathcal{N}(\\mathbf{w}^T \\mathbf{x}, \\sigma^2)$。
假定权重参数服从高斯先验：$\\mathbf{w} \\sim \\mathcal{N}(\\mathbf{0}, \\tau^2 \\mathbf{I})$。
根据贝叶斯定理，后验概率分布为：
$$P(\\mathbf{w} \\mid \\mathbf{X}, \\mathbf{y}) \\propto P(\\mathbf{y} \\mid \\mathbf{X}, \\mathbf{w}) \\cdot P(\\mathbf{w})$$
取负对数后验（Negative Log-Posterior）：
$$-\\ln P(\\mathbf{w} \\mid \\mathbf{X}, \\mathbf{y}) = \\frac{1}{2\\sigma^2} \\sum_{i=1}^n (y_i - \\mathbf{w}^T \\mathbf{x}_i)^2 + \\frac{1}{2\\tau^2} \\sum_{j=1}^d w_j^2 + \\text{常数}$$
两边同乘以 $\\sigma^2$，令 $\\alpha = \\frac{\\sigma^2}{\\tau^2}$：
$$\\arg\\max_{\\mathbf{w}} P(\\mathbf{w} \\mid \\mathbf{X}, \\mathbf{y}) = \\arg\\min_{\\mathbf{w}} \\left[ \\frac{1}{2} \\sum_{i=1}^n (y_i - \\mathbf{w}^T \\mathbf{x}_i)^2 + \\frac{\\alpha}{2} \\|\\mathbf{w}\\|_2^2 \\right]$$
**结论**：L2 正则化在贝叶斯学派眼中，就是对权重参数预设了一个均值为 0、方差为 $\\tau^2$ 的高斯信念先验。噪声方差越小、先验方差越小，正则化系数 $\\alpha$ 就越大。

### 逐步实现与代码解析
下面的 Python 脚本直接实现岭回归闭式解，并扫描正则化超参数 $\\alpha$ 从 $10^{-3}$ 到 $10^3$，展示权重平滑缩减至接近 0 的过程：

```python
import numpy as np

# 1. 构造高维共线性数据 (20 个样本, 8 个强相关特征)
rng = np.random.default_rng(42)
n_samples, n_features = 25, 8
X_base = rng.normal(0, 1, size=(n_samples, 1))
X = X_base + rng.normal(0, 0.2, size=(n_samples, n_features))
y = 3.0 * X[:, 0] - 2.0 * X[:, 1] + rng.normal(0, 0.5, size=n_samples)

# 2. 闭式解函数实现
def solve_ridge(X, y, alpha):
    n_feat = X.shape[1]
    w = np.linalg.inv(X.T @ X + alpha * np.eye(n_feat)) @ (X.T @ y)
    return w

alphas = [0.0, 0.1, 1.0, 10.0, 100.0]
print("=== 岭回归闭式解不同正则化强度 alpha 下的权重向量 ===")
for a in alphas:
    w = solve_ridge(X, y, a)
    norm = np.linalg.norm(w)
    print(f"alpha = {a:6.1f} | ||w||_2 模长: {norm:6.3f} | 前三个权重: {w[:3].round(3)}")

print("\\n[观察结论] 随着 alpha 上升，所有权重以平滑的比例收缩，模长单调减小，但永远不会精确为 0！")
```

### 常见易错点与典型反例
1. **对截距项（Bias $b$）施加正则化**：
   - 极其严重的错误！截距项 $b$ 决定了模型的垂直基线位置（例如房屋均价），它与模型过拟合的高频振荡毫无关系。**正则化绝不能惩罚截距项 $b$**，否则会导致模型在因变量整体偏移时产生致命偏差。
2. **以为 L2 能把无用特征删掉**：
   - L2 正则化的几何约束面是光滑圆球，与损失等高线的切点几乎 100% 落在非零坐标上。L2 只能将权重“压缩得很小”，绝对无法将权重“精准压为严格的 0.0”（无法做硬特征选择）。

### 知识联系与进阶桥梁
- **上承**：3.2 节过拟合解药矩阵；
- **下接**：4.2 节将揭开为什么 L1 正则化能够产生神奇的“稀疏解（精确置零）”。

### 本节总结与自查清单
- [ ] 为什么 $(\\mathbf{X}^T \\mathbf{X} + \\alpha \\mathbf{I})$ 必定严格可逆？其最小特征值是多少？
- [ ] L2 正则化在贝叶斯框架下对应什么先验分布？
- [ ] 深度学习中常说的 Weight Decay（权重衰减）与 L2 正则化在 SGD 优化下有何等价关系？

### 权威来源与延伸阅读
- Arthur E. Hoerl, Robert W. Kennard (1970). *Ridge Regression: Biased Estimation for Nonorthogonal Problems*, Technometrics.
- Trevor Hastie et al. (2009). *The Elements of Statistical Learning*, Section 3.4.1: Ridge Regression, Springer."""

    # ── Lesson 4.2 ──
    l2_content = """### 学习目标
学完本节，你应该能够：
1. 掌握 L1 正则化（Lasso 回归）的数学目标函数与次梯度（Subgradient）概念；
2. 从等高线几何切点与软阈值算子（Soft-Thresholding）两大维度，透彻解释为什么 L1 能产生稀疏解（Sparsity）而 L2 不能；
3. 理解 L1 正则化对应拉普拉斯先验（Laplace Prior）的 MAP 贝叶斯本质；
4. 掌握弹性网络（ElasticNet）如何兼采 L1 与 L2 之长，解决多重共线性下的特征分组选择难题。

### 前置知识
- 凸优化中等高线与凸集相切极值点；
- 绝对值函数在原点处的不可导性与次导数概念。

### 问题背景
在现代大数据与基因组学、金融多因子场景中，特征维度 $p$ 往往达到几千甚至数万，但其中真正起决定性作用的有效特征可能只有几十个（特征极度稀疏）。
- 如果使用 L2 正则化，所有 10000 个特征的权重全部被保留下来（只是数值变小了），模型既无法实现自动化特征筛选，在生产上线时还需要采集并计算全部 10000 个指标，维护成本极高；
- 工程师梦寐以求的是：**算法能否在训练拟合的同时，自动把那些无用特征的权重精准打成严格的 0.0，直接将其从模型中彻底剔除？**
这正是 Robert Tibshirani 于 1996 年提出的 **Lasso（Least Absolute Shrinkage and Selection Operator）** 震撼数据科学界的终极能力。

### 直觉理解
想象切削钻石：
- **L2 正则化（光滑圆球）**：约束边界是一个光滑无棱角的球体。当你把倾斜的损失函数等高线推向球体时，切点可以滑落并停留在球面上任意一个平滑点上——对应各特征权重都不为 0；
- **L1 正则化（多面菱形八面体）**：约束边界是由尖锐棱角和尖端顶点（Vertices）构成的棱形。尖角正好全部精确长在坐标轴（$w_1=0$ 或 $w_2=0$）上！当扩张的椭圆等高线接触到菱形时，有压倒性的几何概率首先撞在尖角顶点上——直接迫使某些维度坐标精准清零！

### 核心概念与符号对照表
| 核心概念 | 数学符号 | 表达式 / 定义 | 算法特性 |
| --- | --- | --- | --- |
| **L1 正则项** | $\\Omega(\\mathbf{w})$ | $\\|\\mathbf{w}\\|_1 = \\sum_{j=1}^d |w_j|$ | 菱形/正八面体约束集，原点处不可导 |
| **Lasso 目标** | $J_{\\text{Lasso}}(\\mathbf{w})$ | $\\frac{1}{2n}\\|\\mathbf{y} - \\mathbf{X}\\mathbf{w}\\|_2^2 + \\lambda \\|\\mathbf{w}\\|_1$ | 凸非光滑优化，带来特征系数稀疏性 |
| **次导数集合** | $\\partial |w|$ | 当 $w > 0$ 为 1；当 $w < 0$ 为 -1；当 $w=0$ 为 $[-1, 1]$ | 允许原点处斜率跨越 0，形成捕获区 |
| **软阈值算子** | $S_\\tau(z)$ | $\\text{sign}(z) \\max(|z| - \\tau, 0)$ | 坐标下降法（Coordinate Descent）基石算子 |
| **弹性网络** | ElasticNet | $\\lambda_1 \\|\\mathbf{w}\\|_1 + \\frac{\\lambda_2}{2}\\|\\mathbf{w}\\|_2^2$ | 解决强相关特征组的集体选入，保持稀疏性 |

### 数学原理与逐步推导
#### 1. 软阈值算子（Soft-Thresholding）与一维精确解
考虑正交特征基底下的一维 Lasso 目标（每个参数独立解耦）：
$$\\min_w \\frac{1}{2}(w - \\hat{w}_{\\text{OLS}})^2 + \\lambda |w|$$
利用次导数条件：$0 \\in (w - \\hat{w}_{\\text{OLS}}) + \\lambda \\partial |w|$。
分情况讨论：
1. 若 $w > 0$，则 $\\partial |w| = 1$，得 $w^* = \\hat{w}_{\\text{OLS}} - \\lambda$（仅当 $\\hat{w}_{\\text{OLS}} > \\lambda$ 时成立）；
2. 若 $w < 0$，则 $\\partial |w| = -1$，得 $w^* = \\hat{w}_{\\text{OLS}} + \\lambda$（仅当 $\\hat{w}_{\\text{OLS}} < -\\lambda$ 时成立）；
3. 若 $w = 0$，则 $\\partial |w| \\in [-1, 1]$，平衡条件要求 $0 \\in -\\hat{w}_{\\text{OLS}} + \\lambda [-1, 1]$，即 $|\\hat{w}_{\\text{OLS}}| \\le \\lambda$！

**闭式解（软阈值函数）**：
$$w^* = S_\\lambda(\\hat{w}_{\\text{OLS}}) = \\begin{cases} \\hat{w}_{\\text{OLS}} - \\lambda, & \\text{若 } \\hat{w}_{\\text{OLS}} > \\lambda \\\\ 0, & \\text{若 } |\\hat{w}_{\\text{OLS}}| \\le \\lambda \\\\ \\hat{w}_{\\text{OLS}} + \\lambda, & \\text{若 } \\hat{w}_{\\text{OLS}} < -\\lambda \\end{cases}$$
**数学核心启示**：只要普通最小二乘法估计的原始权重绝对值小于门限 $\\lambda$，Lasso 的软阈值算子就会**毫不留情地将其强行截断为精确的 0**！而 L2 岭回归的解为 $\\frac{1}{1+\\lambda} \\hat{w}_{\\text{OLS}}$，永远只是按比例缩小，绝不为 0。

#### 2. 贝叶斯视角：拉普拉斯先验
拉普拉斯分布概率密度：$P(w) = \\frac{1}{2b} \\exp \\left( -\\frac{|w|}{b} \\right)$。
在原点处，拉普拉斯密度拥有尖锐的极值高峰（尖峰厚尾），其对数先验为 $-\\frac{|w|}{b}$。
对数后验最大化自然导出绝对值惩罚 $\\lambda |w|$。

### 逐步实现与代码解析
下面的代码使用 Scikit-Learn 的 `Lasso` 与 `Ridge`，在含有 10 个无关干扰噪声特征的数据集上进行对比实验：

```python
import numpy as np
from sklearn.linear_model import Lasso, Ridge

# 1. 构造高维稀疏真实规律: 12 个特征，但只有前 2 个特征起决定作用
rng = np.random.default_rng(42)
n_samples = 40
X = rng.normal(0, 1, size=(n_samples, 12))
# 真实规律: y = 5.0 * x0 - 4.0 * x1 + 0 (后 10 个特征系数均为 0)
y = 5.0 * X[:, 0] - 4.0 * X[:, 1] + rng.normal(0, 0.3, size=n_samples)

# 2. 分别拟合 Ridge 与 Lasso
ridge = Ridge(alpha=1.0).fit(X, y)
lasso = Lasso(alpha=0.3).fit(X, y)

print("=== 真实系数 vs Ridge 系数 vs Lasso 系数 ===")
print("真实参数: [ 5.0, -4.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0]")
print(f"Ridge 系数: {ridge.coef_.round(2)}")
print(f"Lasso 系数: {lasso.coef_.round(2)}")

n_zero_ridge = np.sum(ridge.coef_ == 0.0)
n_zero_lasso = np.sum(lasso.coef_ == 0.0)
print(f"\\nRidge 精确为 0 的系数个数: {n_zero_ridge} 个")
print(f"Lasso 精确为 0 的系数个数: {n_zero_lasso} 个 (自动化特征筛选与稀疏恢复！)")
```

### 常见易错点与典型反例
1. **共线性下的 Lasso 随机选择陷阱**：
   - 如果两个有用特征高度相关（如身高的厘米与身高的米），Lasso 往往会随机挑选其中一个，把另一个置零，这导致模型可解释性受损。此时应改用**弹性网络（ElasticNet）**。
2. **未做标准化就跑 Lasso**：
   - Lasso 对所有特征施加统一的惩罚力度 $\\lambda$。若特征 $A$ 尺度很大（数值数万），其系数极小，容易被不公正地置零；若特征 $B$ 尺度很小，系数很大，容易被幸存保留。**跑 Lasso 之前必须 Standard Scaling**！

### 知识联系与进阶桥梁
- **上承**：4.1 节 L2 岭回归；
- **下接**：4.3 节模型复杂度与 VC 维理论。

### 本节总结与自查清单
- [ ] 为什么 L1 的菱形约束等高线比 L2 的圆形等高线更容易产生坐标轴上的稀疏解？
- [ ] 软阈值算子中，截断区间 $[-\\lambda, \\lambda]$ 的宽度由什么超参数决定？
- [ ] 什么是弹性网络？它如何克服 Lasso 在高度共线性数据下的缺陷？

### 权威来源与延伸阅读
- Robert Tibshirani (1996). *Regression Shrinkage and Selection via the Lasso*, Journal of the Royal Statistical Society, Series B.
- Hui Zou, Trevor Hastie (2005). *Regularization and variable selection via the elastic net*, JRSS-B."""

    # ── Lesson 4.3 ──
    l3_content = """### 学习目标
学完本节，你应该能够：
1. 彻底纠正“模型参数量越多就必然越复杂”的片面直觉，掌握单参数无限 VC 维反例；
2. 理解 VC 维（Vapnik-Chervonenkis Dimension）的严格数学定义（打散 Shatter 的概念）；
3. 掌握奥卡姆剃刀原则（Occam's Razor）与最小描述长度（MDL）的哲学与数学统一；
4. 掌握赤池信息准则（AIC）与贝叶斯信息准则（BIC）的形式与惩罚差异，并能在代码中实现自动模型阶数选择。

### 前置知识
- 组合数学基础（对 $N$ 个点进行二元标记的可能排列数 $2^N$）；
- 极大似然估计对数似然值 $\\ln \\mathcal{L}$。

### 问题背景
如何客观量化一个机器学习模型的“复杂度”？
直觉上，大家的第一反应是：“数一数模型里有多少个权重参数 $w$”。
然而，统计学习奠基人 Vapnik 指出：**参数数量并不能充当模型复杂度的充要度量！**
经典反例：考虑单参数正弦分类器 $f_\\alpha(x) = \\text{sign}(\\sin(\\alpha x))$，虽然只有 $\\alpha$ 仅仅 1 个标量参数，但由于高频正弦振荡的任意稠密性，它能在实数轴上完美打散（Shatter）任意有限个样本点，其容量为**无穷大**！
因此，统计学界引入了 **VC 维** 与 **信息准则（AIC/BIC）** 来严谨刻画模型的真实容量。

### 直觉理解
- **打散（Shattering）**：给你平面上任意位置的 3 个点，无论我如何给这 3 个点随机涂上红黑颜色（共有 $2^3 = 8$ 种涂色方案），你总能用一把笔直的尺子（二维线性超平面）一刀切开，红点在一边，黑点在另一边。这说明直线分类器能够“打散”3 个点。
- **打散失败**：如果是 4 个点排成异或（XOR）交叉分布，一条直线无论如何都无法把同色点完整隔开。所以二维线性分类器最多只能打散 3 个点，其 VC 维严格等于 3！
- **奥卡姆剃刀（Occam's Razor）**：“如无必要，勿增实体”。在能够同等解释现有观测事实的假说中，最简单的那个假说具有最高的先验泛化可信度。

### 核心概念与符号对照表
| 概念 | 符号 | 数学定义 | 核心内涵 |
| --- | --- | --- | --- |
| **打散** | Shatter | 假说空间 $\\mathcal{H}$ 能实现对点集的所有 $2^N$ 种二元标记 | 假说空间对该尺寸点集具有完全表达自由度 |
| **VC 维** | $d_{\\text{VC}}(\\mathcal{H})$ | 假说空间能够完全打散的**最大样本点数** $N$ | 衡量假说空间内在几何复杂度的无偏标尺 |
| **二维线性分类器 VC 维** | $d_{\\text{VC}}$ | $d+1 = 2+1 = 3$ | $d$ 维线性感知机最多能打散 $d+1$ 个点 |
| **赤池信息准则** | AIC | $2k - 2\\ln(\\mathcal{L})$ | 渐近最小化预测 KL 散度，$k$ 为自由参数量 |
| **贝叶斯信息准则** | BIC | $k \\ln(n) - 2\\ln(\\mathcal{L})$ | 样本量 $n$ 较大时对参数量惩罚更严苛 |

### 数学原理与逐步推导
#### 1. VC 维严格定义
对于二元分类假说空间 $\\mathcal{H}$，其在样本集 $S = \\{x_1, \\dots, x_N\\}$ 上的生长函数（Growth Function）定义为：
$$\\Pi_{\\mathcal{H}}(N) = \\max_{S} |\\{ (f(x_1), \\dots, f(x_N)) \\mid f \\in \\mathcal{H} \\}|$$
显然，$\\Pi_{\\mathcal{H}}(N) \\le 2^N$。
若 $\\Pi_{\\mathcal{H}}(N) = 2^N$，则称 $\\mathcal{H}$ 能打散 $N$ 个点。
**VC 维定义**为使得 $\\Pi_{\\mathcal{H}}(N) = 2^N$ 成立的最大整数 $N$：
$$d_{\\text{VC}}(\\mathcal{H}) = \\max \\{N \\mid \\Pi_{\\mathcal{H}}(N) = 2^N\\}$$
若对任意 $N$ 都能打散，则 $d_{\\text{VC}} = \\infty$。

#### 2. AIC 与 BIC 信息准则比较
当模型具有 $k$ 个可训练参数，样本量为 $n$，最大对数似然估计值为 $\\hat{L}$ 时：
$$\\text{AIC} = 2k - 2\\ln \\hat{L}$$
$$\\text{BIC} = k \\ln(n) - 2\\ln \\hat{L}$$
- 当样本量 $n > e^2 \\approx 7.39$ 时，$\\ln(n) > 2$，因此 **BIC 对多余参数的惩罚力度显著高于 AIC**；
- 在大数据集上，AIC 倾向于选择偏大、偏复杂的过参数化模型；BIC 则倾向于选择更加精简的紧凑模型。

### 逐步实现与代码解析
下面的 Python 脚本使用 AIC 与 BIC 信息准则，对不同阶数的多项式回归模型进行全自动模型选择：

```python
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures

# 1. 生成真实二阶多项式数据: y = 2 - 3x + 1.5x^2 + 噪声
rng = np.random.default_rng(42)
n = 60
X = rng.uniform(-2, 2, size=(n, 1))
y = 2.0 - 3.0 * X[:, 0] + 1.5 * (X[:, 0] ** 2) + rng.normal(0, 0.4, size=n)

def compute_aic_bic(n_samples, rss, k_params):
    # 高斯似然下: -2 ln(L) = n * ln(RSS / n)
    log_lik = -0.5 * n_samples * np.log(rss / n_samples)
    aic = 2 * k_params - 2 * log_lik
    bic = k_params * np.log(n_samples) - 2 * log_lik
    return aic, bic

degrees = [1, 2, 3, 5, 8]
print("=== AIC 与 BIC 模型复杂度评估筛选 ===")
print("阶数 M | 参数量 k | 训练集 RSS |    AIC     |    BIC     | 判定结论")
print("-" * 65)

best_bic = float('inf')
best_deg = None

for deg in degrees:
    poly = PolynomialFeatures(deg)
    X_poly = poly.fit_transform(X)
    k = X_poly.shape[1]  # 包含截距在内的参数总数
    
    reg = LinearRegression().fit(X_poly, y)
    rss = np.sum((y - reg.predict(X_poly)) ** 2)
    aic, bic = compute_aic_bic(n, rss, k)
    
    if bic < best_bic:
        best_bic = bic
        best_deg = deg
        
    print(f"  {deg:2d}   |   {k:2d}    |  {rss:8.3f}  | {aic:10.2f} | {bic:10.2f} | {'★ 最优模型' if deg==2 else ''}")

print(f"\\nBIC 准则成功识别出真实阶数: {best_deg} 阶 (完美压制高阶伪关联)！")
```

### 常见易错点与典型反例
1. **误把 VC 维等同于参数量**：
   - 绝不能画等号。线性模型 VC 维恰好为 $d+1$，但对于非线性模型、神经网络，VC 维与参数量之间存在复杂的非线性上下界关系。
2. **盲目迷信 AIC**：
   - AIC 目标是最小化预测损失，在样本量极大时可能略微高估真实阶数；在强调模型可解释性与因果结构的场景中，BIC 更具确定性。

### 知识联系与进阶桥梁
- **上承**：4.1/4.2 正则化实战；
- **下接**：第 5 章模型综合评估指标与严密交叉验证防泄漏流水线。

### 本节总结与自查清单
- [ ] 二维平面上一条直线的 VC 维是多少？能否打散任意 4 个点？
- [ ] 为什么单参数正弦函数分类器拥有无穷大的 VC 维？
- [ ] BIC 与 AIC 相比，为什么在样本量较大时对复杂模型的惩罚更严厉？

### 权威来源与延伸阅读
- Vladimir N. Vapnik (1998). *Statistical Learning Theory*, Section 3.4: The VC Dimension of a Set of Functions, Wiley.
- Kenneth P. Burnham, David R. Anderson (2002). *Model Selection and Multimodel Inference: A Practical Information-Theoretic Approach*, Springer."""

    lessons = [
        lesson(
            lesson_id="ml-found-l4-1",
            title="L2 正则化（Ridge / 权重衰减）数学推导与空间收缩",
            content=l1_content,
            difficulty=3,
            tips=[
                tip("矩阵数值稳定性定理：当矩阵 X 存在共线性时，X^T X 的逆矩阵计算极度脆弱；加入 lambda * I 之后，矩阵所有特征值平移 lambda，条件数大幅改善，彻底杜绝浮点溢出。", "performance"),
                tip("权重衰减本质：在神经网络 SGD 优化中，Weight Decay 等价于每次迭代前先将权重乘上 (1 - lr * lambda)，实现平滑向原点衰减收缩。", "interview"),
            ],
            demos=[
                demo(
                    code="""import numpy as np

# 验证 Ridge 闭式解与奇异值收缩
X = np.array([[1.0, 2.0], [2.0, 4.01], [3.0, 5.99]])
y = np.array([5.0, 10.0, 15.0])

# X^T X 接近奇异 (特征2几乎是特征1的两倍)
det_raw = np.linalg.det(X.T @ X)
det_reg = np.linalg.det(X.T @ X + 1.0 * np.eye(2))

print(f"原始矩阵行列式 det(X^T X): {det_raw:.6f} (极其接近 0，几乎不可逆！)")
print(f"加正则后行列式 det(X^T X + I): {det_reg:.4f} (严格正定安全可逆！)")
""",
                    lang="python",
                    title="L2 岭正则改善矩阵奇异性数值验证",
                )
            ],
        ),
        lesson(
            lesson_id="ml-found-l4-2",
            title="L1 正则化（Lasso）与稀疏解的几何第一性原理",
            content=l2_content,
            difficulty=3,
            tips=[
                tip("面试核心必考图解：请在白板上画出 L1 的菱形约束面与 L2 的圆形约束面，解释为什么等高线切点大概率落在 L1 棱角的坐标轴顶点上（产生稀疏权重 0）。", "interview"),
                tip("弹性网络（ElasticNet）选用准则：当特征之间存在严重群体相关性（Group Correlation）时，单一 Lasso 随机挑选一个的不确定性极大，应使用 ElasticNet 联合选入整组特征。", "leak"),
            ],
            demos=[
                demo(
                    code="""import numpy as np

# 软阈值函数实现
def soft_threshold(z, lam):
    return np.sign(z) * np.maximum(np.abs(z) - lam, 0.0)

inputs = np.array([-3.0, -1.0, -0.4, 0.0, 0.3, 1.2, 4.0])
outputs = soft_threshold(inputs, lam=0.5)

print("软阈值算子 (lambda = 0.5) 处理结果：")
for inp, out in zip(inputs, outputs):
    print(f"输入: {inp:4.1f} -> 输出: {out:4.1f} {'[截断置零]' if out==0.0 else '[平滑缩减]'}")
""",
                    lang="python",
                    title="Lasso 核心软阈值算子数值行为",
                )
            ],
        ),
        lesson(
            lesson_id="ml-found-l4-3",
            title="模型复杂度量化：从参数量到 VC 维与奥卡姆剃刀",
            content=l3_content,
            difficulty=3,
            tips=[
                tip("反直觉经典反例：参数量不等同于容量！单一参数正弦函数 sign(sin(a * x)) 能打散实数轴上任意 N 个点，拥有无穷大的 VC 维。", "interview"),
                tip("模型选择实战：样本量小且重视预测精度时用 AIC；样本量大且希望彻底剔除多余虚假特征、获得精简模型时用 BIC。", "note"),
            ],
            demos=[
                demo(
                    code="""import numpy as np

# 简单演示单参数高频振荡分类打散能力
a = 1e5
x_points = np.array([1.0, 2.0, 3.0, 4.0])
# 只要 a 足够大，可在任意点取到任意正负符号
preds = np.sign(np.sin(a * x_points))
print(f"单参数高频正弦函数在 4 个点的分类标记: {preds}")
""",
                    lang="python",
                    title="高频分类器打散能力示意",
                )
            ],
        ),
    ]

    # ── Exercises for Chapter 4 ──
    exercises = [
        single_choice(
            ex_id="ml-found-c4-ex1",
            question="在岭回归（Ridge Regression, L2 正则化）中，当正则化超参数 $\\lambda > 0$ 时，关于矩阵 $(\\mathbf{X}^T \\mathbf{X} + \\lambda \\mathbf{I})$ 的性质，以下叙述绝对正确的是：",
            options=[
                {"value": "A", "text": "即使特征矩阵存在完全多重共线性（$\\mathbf{X}^T \\mathbf{X}$ 奇异），该求和矩阵的所有特征值必定严格大于 0，因而是严格对称正定且必定可逆的"},
                {"value": "B", "text": "当且仅当特征数 $d < n$ 样本量时，该矩阵才可能可逆"},
                {"value": "C", "text": "$\\lambda$ 越大，该矩阵的行列式越接近 0"},
                {"value": "D", "text": "该矩阵的逆矩阵会导致回归参数权重整体放大"},
            ],
            answer="A",
            explanation="由于 $\\mathbf{X}^T \\mathbf{X}$ 是半正定矩阵（所有特征值 $\\mu_i \\ge 0$），加上 $\\lambda \\mathbf{I}$ 后，所有特征值平移为 $\\mu_i + \\lambda \\ge \\lambda > 0$。因此矩阵严格正定，满秩且必定存在唯一的逆矩阵，从根本上消除了求逆时的奇异性。",
            difficulty=2,
            related_lesson_id="ml-found-l4-1",
            tags=["岭回归", "正定矩阵", "线性代数推导"],
        ),
        judge(
            ex_id="ml-found-c4-ex2",
            question="在进行 Lasso（L1 正则化）建模前，如果不对输入特征进行标准化（Standardization），可能会导致数值量纲较大的特征被不合理地剔除，或者量纲微小的特征被过度保留，从而破坏特征选择的真实客观性。",
            answer=True,
            explanation="正确。Lasso 目标函数对所有参数施加无差别的统一惩罚项 $\\lambda \\sum |w_j|$。如果某个特征量纲极大，其系数必然很小，极易被软阈值截断置零；反之量纲极小的特征其系数很大，极易逃避置零惩罚。因此，基于范数正则化的算法必须先进行特征标准化。",
            difficulty=2,
            related_lesson_id="ml-found-l4-2",
            tags=["Lasso", "特征标准化", "工程陷阱"],
        ),
        multiple_choice(
            ex_id="ml-found-c4-ex3",
            question="在贝叶斯统计学习理论中，将参数估计问题转化为最大后验估计（MAP）时，关于先验分布与正则化项的等价关系，以下哪些结论是正确的？",
            options=[
                {"value": "A", "text": "L2 正则化（Ridge）在数学上严格等价于假定权重参数服从独立同分布的高斯先验（Gaussian Prior）"},
                {"value": "B", "text": "L1 正则化（Lasso）在数学上严格等价于假定权重参数服从独立同分布的拉普拉斯先验（Laplace Prior）"},
                {"value": "C", "text": "拉普拉斯先验在原点 0 处具有尖锐的尖峰厚尾特征，从概率信念上倾向于让大部分参数严格归零"},
                {"value": "D", "text": "普通无正则化的最小二乘法（OLS）等价于假设参数先验为均匀平坦无信息先验下的 MAP 估计"},
            ],
            answer=["A", "B", "C", "D"],
            explanation="全选项均正确！这是统计学贝叶斯学派与频率学派正则化对偶性的核心理论基石：均方误差+高斯先验=L2；均方误差+拉普拉斯先验=L1；均方误差+均匀先验=普通无约束 MLE/OLS。",
            difficulty=3,
            related_lesson_id="ml-found-l4-2",
            tags=["贝叶斯推断", "高斯先验", "拉普拉斯先验", "MAP"],
        ),
        fill(
            ex_id="ml-found-c4-ex4",
            question="在二维平面分类中，线性分类器能够打散（Shatter）的最大点数是 3，因此二维线性假说的 VC 维为 ____；而结合了 L1 稀疏性与 L2 稳定性的复合正则化方法被称为 ____ 网络（ElasticNet）。",
            blanks=[
                ["3", "三"],
                ["弹性", "弹性网络", "ElasticNet"]
            ],
            explanation="二维平面线性分类器无法打散排成 XOR 异或布局的 4 个点，因此最大打散点数为 3，VC 维为 3；结合 L1 与 L2 惩罚项的方法是 Zou 与 Hastie 提出的弹性网络（ElasticNet）。",
            difficulty=2,
            related_lesson_id="ml-found-l4-3",
            tags=["VC维", "弹性网络", "理论填空"],
        ),
        open_ex(
            ex_id="ml-found-c4-ex5",
            question="【几何与解析综合题】请回答关于 L1 与 L2 正则化的几何机制与优化问题：\n1. 从带有约束条件的优化问题（$\\min \\frac{1}{2n}\\|\\mathbf{y} - \\mathbf{X}\\mathbf{w}\\|^2$ 约束于 $\\|\\mathbf{w}\\| \\le C$）的几何角度，详细画图/描述为什么 L1 约束集（正八面体/菱形）比 L2 约束集（圆球）更容易产生精确为 0 的稀疏权重解；\n2. 在模型工程实践中，为什么严禁对截距项（Bias 项 $b$）施加正则化惩罚？",
            reference_answer="""1. 几何切点视角阐明 L1 稀疏性成因：
- 约束优化视角：根据拉格朗日乘子对偶性，正则化问题等价于在约束区域 $\\Omega(\\mathbf{w}) \\le C$ 内最小化二次误差损失等高线。
- L2 正则化的约束区域：在二维平面上是一个连续平滑的圆形凸集（高维中为超球体）。均方误差损失函数是一个以未受限最小二乘解 $\\hat{\\mathbf{w}}_{\\text{OLS}}$ 为中心的同心椭圆等高线。当椭圆逐渐向外膨胀并首次接触到圆形边界时，切点可以落在圆周上的任意一点，切点坐标同时包含非零的 $w_1$ 与 $w_2$（非零概率为 100%）。
- L1 正则化的约束区域：在二维平面上是一个带有尖锐顶点的菱形凸集（高维中为正八面体/超多面体）。该几何体的角顶点（Vertices）恰好全部精准落在坐标轴上（此时 $w_1=0$ 或 $w_2=0$）。由于多面体的角是尖锐突出的，向外膨胀的椭圆等高线在接触几何体时，有极大概率首先触碰到这些突出的顶点。只要切点落在顶点上，对应的某维权重就会被精确锁定为 0，从而产生参数稀疏性与自动特征选择。

2. 严禁惩罚截距项 $b$ 的原因：
- 截距项 $b$ 代表的是目标输出变量 $y$ 在输入特征全为 0 时的基准期望均值（例如全城平均基础房价），它反映的是因变量整体的物理平移量，与模型在特征空间中过拟合的高频振荡与扭曲毫无关系。
- 若对截距项 $b$ 施加惩罚，会强行将预测基准向 0 压缩。当真值因变量 $y$ 的均值很大（如真实房价均值为 500 万）时，强行惩罚截距会使得模型产生极其严重的系统性欠拟合偏差。因此，工程规范要求：仅对特征权重 $\\mathbf{w}$ 施加收缩惩罚，截距项 $b$ 保持无约束自由拟合。""",
            explanation="深入考察正则化几何第一性原理，以及工程落地中截距项保护的规范细节。",
            rubric=[
                {"point": "从等高线与约束边界几何切点出发，描述 L2 平滑球形切点非零特性", "score": 25},
                {"point": "清晰阐明 L1 菱形顶点位于坐标轴上，膨胀等高线大概率触碰顶点导致坐标精准置零", "score": 25},
                {"point": "指出截距项决定基准全局平移均值，与过拟合的高频曲面扭曲无关", "score": 25},
                {"point": "说明惩罚截距项会导致模型对因变量均值产生不可逆的严重系统性偏差", "score": 25},
            ],
            difficulty=4,
            related_lesson_id="ml-found-l4-2",
            tags=["几何解释", "Lasso稀疏性", "截距惩罚禁忌"],
        ),
        # ── Code Exercise 4 ──
        {
            "id": "ml-found-c4-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】实现坐标下降法中的软阈值算子（Soft-Thresholding）：\n编写函数 `soft_threshold(z, lam)`：\n接收一个 NumPy 一维数组或浮点数 `z` 和非负阈值标量 `lam`（$\\lambda \\ge 0$）。\n根据公式计算并返回软阈值输出：\n$$S_\\lambda(z) = \\begin{cases} z - \\lambda, & z > \\lambda \\\\ 0, & |z| \\le \\lambda \\\\ z + \\lambda, & z < -\\lambda \\end{cases}$$\n最后一行请返回调用示例 `soft_threshold(np.array([-2.5, -0.5, 0.2, 0.8, 3.0]), 0.6)` 的 NumPy 数组结果（转换为列表）。",
            "starterCode": "import numpy as np\n\ndef soft_threshold(z, lam: float):\n    \"\"\"实现 Lasso 坐标下降法软阈值截断算子\"\"\"\n    # 请在此实现\n    ___\n\nlist(soft_threshold(np.array([-2.5, -0.5, 0.2, 0.8, 3.0]), 0.6))\n",
            "setupCode": "",
            "expectedOutput": "[-1.9, 0.0, 0.0, 0.20000000000000007, 2.4]",
            "answer": "import numpy as np\n\ndef soft_threshold(z, lam: float):\n    z_arr = np.asarray(z, dtype=float)\n    return np.sign(z_arr) * np.maximum(np.abs(z_arr) - lam, 0.0)\n\nlist(np.round(soft_threshold(np.array([-2.5, -0.5, 0.2, 0.8, 3.0]), 0.6), 4))\n",
            "tests": "res = soft_threshold(0.4, 0.5)\nassert round(float(res), 4) == 0.0, f\"阈值内截断失败: {res}\"\nres2 = soft_threshold(2.0, 0.5)\nassert round(float(res2), 4) == 1.5, f\"正向收缩失败: {res2}\"\nres3 = soft_threshold(-2.0, 0.5)\nassert round(float(res3), 4) == -1.5, f\"负向收缩失败: {res3}\"\n",
            "explanation": "软阈值算子是 Lasso 与 L1 次梯度优化的核心基石算子，绝对值小于 lambda 的输入被强制归零，大于 lambda 的被线性向原点平移。",
            "tags": ["软阈值", "Lasso核心", "次梯度"],
            "related_lesson_id": "ml-found-l4-2",
        },
        single_choice(
            ex_id="ml-found-c4-ex7",
            question="在经典信息准则模型选择中，赤池信息准则（AIC）与贝叶斯信息准则（BIC）均在对数似然项基础上对参数数量 $k$ 施加惩罚。关于两者的惩罚差异，以下叙述正确的是：",
            options=[
                {"value": "A", "text": "当样本量 $n > 8$ 时，BIC（惩罚项为 $k \\ln n$）对模型参数量的惩罚强度显著高于 AIC（惩罚项为 $2k$），因此 BIC 倾向于选择更精简紧凑的模型"},
                {"value": "B", "text": "AIC 始终比 BIC 具有更强的复杂度惩罚"},
                {"value": "C", "text": "AIC 与 BIC 随着样本量无限增加，选出的最优模型阶数必定完全一致"},
                {"value": "D", "text": "BIC 只能用于线性回归，无法用于含有非高斯分布的复杂广义线性模型"},
            ],
            answer="A",
            explanation="AIC 惩罚项为 $2k$，BIC 惩罚项为 $k \\ln n$。当 $n > e^2 \\approx 7.39$（即 $n \\ge 8$）时，$\\ln n > 2$，因此在绝大多数实际样本量下，BIC 对增加参数的惩罚力度都严格大于 AIC，在大数据下更能有力抑制过参数化。",
            difficulty=3,
            related_lesson_id="ml-found-l4-3",
            tags=["AIC", "BIC", "模型选择"],
        ),
    ]

    return chapter(
        chapter_id="ml-found-c4",
        course_id="ml-foundations",
        order=4,
        title="正则化方法与模型复杂度控制",
        goal="掌握 L1/L2 正则化的闭式推导与几何第一性原理，理解贝叶斯先验等价性与 VC 维模型复杂度量化体系。",
        lessons=lessons,
        exercises=exercises,
    )
