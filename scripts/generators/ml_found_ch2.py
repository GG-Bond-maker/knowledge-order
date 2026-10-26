# -*- coding: utf-8 -*-
"""
Chapter 2: 模型三要素：假说空间、损失函数与优化目标
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_2():
    # ── Lesson 2.1 ──
    l1_content = """### 学习目标
学完本节，你应该能够：
1. 掌握机器学习模型的假说空间（Hypothesis Space $\\mathcal{H}$）概念，理解学习过程即为在假说空间中搜索候选函数；
2. 深刻领会「没有免费午餐定理」（No Free Lunch Theorem, NFL）的数学内涵，认识到不存在超越一切任务的先验全能模型；
3. 理解「归纳偏置」（Inductive Bias）作为模型先验约束的不可或缺性，并准确列举线性模型、KNN、决策树与深度神经网络各自的经典归纳偏置；
4. 运行可交互代码，直观对比不同假说空间（一阶线性空间 vs 高阶多项式空间 vs 局部近邻空间）在同一散点上的拟合决策差异。

### 前置知识
- 映射与函数空间直觉；
- 线性方程组与多项式基底概念。

### 问题背景
给定一组有限的离散观测点 $(x_1, y_1), (x_2, y_2), \\dots, (x_n, y_n)$，有多少个连续函数能够穿过或贴近这些点？
答案是：**无穷多个！**
在没有额外约束的前提下，穿过有限数据点的潜在函数空间是不可数无穷大的。如果一个算法没有任何预设立场（偏好），它在面对一个从未见过的测试点 $x^*$ 时，给出任何预测值都是数学上自洽的！
这就引出了机器学习中最深刻的哲学与数学命题：**模型凭借什么在无穷无尽的可能性中选出我们想要的那个预测函数？** 答案就是模型的**假说空间**与**归纳偏置**。

### 直觉理解
想象你是一名刑警，现场只留下两串模糊的鞋印（训练数据）：
- 如果你没有任何假设（无归纳偏置），鞋印可能是嫌疑人留下的，也可能是路过的猫穿着微型假鞋踩的，或者外星人激光雕刻的——你将永远无法立案推断；
- 如果你假定“凶手是一个身高 175cm 左右的成年男子且沿直线逃离”（这就是归纳偏置），你立刻就能缩小排查范围，做出合理的轨迹预测。
**归纳偏置不是模型的缺陷，而是学习能够发生的根本动力。**

### 核心概念与符号对照表
| 核心概念 | 英文与符号 | 数学定义/特征 | 代表模型体现 |
| --- | --- | --- | --- |
| **假说空间** | Hypothesis Space, $\\mathcal{H}$ | 算法允许考虑的全部候选映射函数的集合 | 线性模型：$\\mathcal{H} = \\{f(\\mathbf{x}) = \\mathbf{w}^T \\mathbf{x} + b \\mid \\mathbf{w} \\in \\mathbb{R}^d, b \\in \\mathbb{R}\\}$ |
| **真实目标函数** | Ground Truth, $f^*$ | 生成真实数据的客观未知法则，往往 $f^* \\notin \\mathcal{H}$ | 自然界真实的物理动力学或用户消费决策规律 |
| **归纳偏置** | Inductive Bias | 算法在假说空间搜索时预先设定的先验偏好与结构假设 | 线性假设、近邻平滑假设、空间平移不变性 |
| **没有免费午餐** | No Free Lunch (NFL) | 在所有可能的数据生成分布均匀加权下，所有学习算法期望误差相同 | 不存在一个“天下第一”在任何场景都碾压其他算法的模型 |

### 数学原理与逐步推导
#### 1. 没有免费午餐定理（Wolpert & Macready, 1997）
设 $\\mathcal{X}$ 为有限输入空间，$\\mathcal{Y} = \\{0, 1\\}$ 为二元标签。真实目标函数 $f^*: \\mathcal{X} \\rightarrow \\mathcal{Y}$ 的可能总数为 $2^{|\\mathcal{X}|}$。
设算法 $\\mathfrak{A}_1$ 与 $\\mathfrak{A}_2$ 在训练集 $S \\subset \\mathcal{X}$ 上得到假说 $f_1, f_2$。
当对**所有可能的真实函数 $f^*$ 进行均匀平均**时，任何算法在未见样本点 $x \\notin S$ 上的期望误差完全相等：
$$\\sum_{f^*} E_{\\text{out}}(\\mathfrak{A}_1(S), f^*) = \\sum_{f^*} E_{\\text{out}}(\\mathfrak{A}_2(S), f^*)$$
**启示**：脱离具体业务与实际数据分布去争论“哪个算法更好”是完全毫无意义的。算法的高下，本质在于该算法的归纳偏置与目标问题的真实物理机制是否契合！

#### 2. 典型机器学习模型的归纳偏置剖析
- **线性回归 / 逻辑回归**：假定输入特征与输出（或输出对数几率）之间存在**平滑全局线性超平面**；
- **$k$ 近邻算法（KNN）**：假定**度量空间内距离相近的样本拥有相似的属性**（局部平滑性）；
- **决策树（Decision Tree）**：假定决策边界可以由**与坐标轴平行的正交超矩形网格**分层嵌套划分；
- **卷积神经网络（CNN）**：假定视觉信号具备**局部连接性（Local Connectivity）**与**平移等变性（Translation Equivariance）**；
- **循环神经网络（RNN）**：假定时间序列满足**时序马尔可夫连续性与时间平移不变性**。

### 逐步实现与代码解析
下面的可运行代码演示了当假说空间过小（线性一阶） vs 过大（多项式 15 阶） vs 局部近邻（KNN）时，在相同数据上的表现：

```python
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
from sklearn.neighbors import KNeighborsRegressor
from sklearn.pipeline import make_pipeline

# 1. 生成真实非线性数据: y = sin(x) + 噪声
rng = np.random.default_rng(42)
X_train = np.sort(rng.uniform(0, 5, size=(25, 1)), axis=0)
y_train = np.sin(X_train).ravel() + rng.normal(0, 0.15, size=25)

X_test = np.linspace(0, 5, 200).reshape(-1, 1)
y_true = np.sin(X_test).ravel()

# 2. 三种不同归纳偏置与假说空间的模型拟合
# 模型 A: 强线性偏置 (假说空间过小，无法捕捉弯曲)
model_linear = LinearRegression().fit(X_train, y_train)

# 模型 B: 15阶多项式空间 (假说空间过大，震荡严重)
model_poly15 = make_pipeline(PolynomialFeatures(degree=15), LinearRegression()).fit(X_train, y_train)

# 模型 C: 局部平滑偏置 KNN (k=3，局部近邻均值)
model_knn = KNeighborsRegressor(n_neighbors=3).fit(X_train, y_train)

mse_lin = np.mean((model_linear.predict(X_test) - y_true) ** 2)
mse_poly = np.mean((model_poly15.predict(X_test) - y_true) ** 2)
mse_knn = np.mean((model_knn.predict(X_test) - y_true) ** 2)

print("=== 不同假说空间在未见测试集上的真实泛化 MSE 误差 ===")
print(f"线性回归 (偏置过强，欠拟合) MSE: {mse_lin:.4f}")
print(f"15阶多项式 (偏置过弱，过拟合) MSE: {mse_poly:.4f}")
print(f"3近邻回归 (局部平滑偏置)   MSE: {mse_knn:.4f}")
```

### 常见易错点与典型反例
1. **追求“完全无假设”的模型**：
   - 误区：认为最好的模型应该是“没有任何先验假设、纯粹让数据说话”。
   - 根因：由 NFL 定理，无偏好的模型在未见数据上的泛化期望与瞎猜无异。归纳偏置不是偏见，而是将人类领域知识（物理约束、对称性、稀疏性）注入算法的通道。

### 知识联系与进阶桥梁
- **上承**：1.2 节三大监督与无监督范式；
- **下接**：2.2 节将深入定义衡量模型在假说空间中走偏程度的“损失函数”。

### 本节总结与自查清单
- [ ] 为什么说有限的经验数据不能唯一决定未见数据的泛化规律？
- [ ] 能否用一句通俗的话向团队解释 NFL 定理在模型选型中的指导意义？
- [ ] CNN 的局部感受野与权值共享属于何种归纳偏置？

### 权威来源与延伸阅读
- David H. Wolpert, William G. Macready (1997). *No Free Lunch Theorems for Optimization*, IEEE Transactions on Evolutionary Computation.
- Tom M. Mitchell (1997). *Machine Learning*, Section 2.7: Inductive Bias, McGraw-Hill."""

    # ── Lesson 2.2 ──
    l2_content = """### 学习目标
学完本节，你应该能够：
1. 掌握损失函数（Loss Function）在模型参数空间中引导梯度搜索的核心机制；
2. 熟练掌握回归三大损失：均方误差（MSE）、平均绝对误差（MAE）与 Huber 损失的数学形式与抗噪特性；
3. 从极大似然估计（MLE）严格推导 MSE 对应高斯噪声假设、MAE 对应拉普拉斯噪声假设；
4. 掌握分类核心损失：0-1 损失、对数几率损失（Binary Cross-Entropy）与 Hinge 损失（SVM），并解释分类问题为何不能直接使用 MSE。

### 前置知识
- 高等数学中的导数与偏导数；
- 概率论中的极大似然估计（Maximum Likelihood Estimation, MLE）思想。

### 问题背景
假说空间 $\\mathcal{H}$ 给出了候选模型的大海，算法必须有一把极其精确的“尺子”，用来度量某一个候选函数 $f$ 预测输出 $\\hat{y}$ 与客观真值 $y$ 之间的差距。
这把尺子就是**损失函数 $L(f(\\mathbf{x}), y)$**。
如果尺子设计不当（例如在存在严重离群点的数据中强行使用 MSE，或者在分类问题中使用非凸不平滑的 0-1 损失），优化器就会迷失在病态曲面中，导致模型彻底训练失败。

### 直觉理解
- **MSE（均方误差）**：严厉的惩罚者。误差为 1 时罚 1，误差为 10 时罚 100（平方放大）！只要数据里混入一个异常输入（如打错的零），模型就会被这个异常样本彻底带偏；
- **MAE（平均绝对误差）**：温和视距者。误差多大就罚多大，对离群点具有极佳的免疫抗性，但零点处不可导导致收敛震荡；
- **Huber 损失**：兼具两者的滑板鞋。误差较小时采用平滑易导的平方误差，误差超过阈值后平滑切换为线性惩罚；
- **交叉熵（Cross-Entropy）**：概率与信息的天然测度。当模型对一个错误答案极其确信时（预测概率接近 0 但真值为 1），交叉熵损失将飙升至正无穷大，产生巨大的梯度强行将参数踹回正轨。

### 核心概念与符号对照表
| 损失函数 | 数学表达式 | 统计学 MLE 对应假设 | 导数与优化特性 |
| --- | --- | --- | --- |
| **均方误差 (MSE, $L_2$)** | $L(y, \\hat{y}) = \\frac{1}{2}(y - \\hat{y})^2$ | 噪声服从高斯分布 $\\epsilon \\sim \\mathcal{N}(0, \\sigma^2)$ | 导数为 $-(y - \\hat{y})$，连续平滑凸函数，对极端离群值高度敏感 |
| **绝对误差 (MAE, $L_1$)** | $L(y, \\hat{y}) = |y - \\hat{y}|$ | 噪声服从拉普拉斯分布 $\\epsilon \\sim \\text{Laplace}(0, b)$ | 次导数为 $-\\text{sign}(y - \\hat{y})$，鲁棒抗噪，在 0 处不可微 |
| **Huber 损失** | 若 $|e| \\le \\delta$: $\\frac{1}{2}e^2$; 否则: $\\delta|e| - \\frac{1}{2}\\delta^2$ | 混合密度模型 | 兼具凸性、光滑导数与离群值稳健性 |
| **对数损失 (BCE)** | $-[y \\ln \\hat{p} + (1-y) \\ln (1-\\hat{p})]$ | 伯努利分布条件似然 | 概率凸曲面，误差大时梯度充沛，避免饱和区停滞 |
| **合页损失 (Hinge)** | $\\max(0, 1 - y \\cdot f(\\mathbf{x}))$ ($y \\in \\{-1, +1\\}$) | 几何间隔最大化 | 支持向量外样本损失严格为 0，带来解的稀疏性 |

### 数学原理与逐步推导
#### 1. 均方误差与高斯分布的对偶性证明
设数据生成模型为 $y = f(\\mathbf{x}) + \\epsilon$，其中噪声 $\\epsilon \\sim \\mathcal{N}(0, \\sigma^2)$。
给定单个样本 $(\\mathbf{x}, y)$，其条件概率密度为：
$$P(y \\mid \\mathbf{x}) = \\frac{1}{\\sqrt{2\\pi}\\sigma} \\exp \\left( -\\frac{(y - f(\\mathbf{x}))^2}{2\\sigma^2} \\right)$$
在独立同分布样本集 $S = \\{(\\mathbf{x}_i, y_i)\\}_{i=1}^n$ 上的对数似然函数为：
$$\\ln \\mathcal{L}(\\mathbf{w}) = \\sum_{i=1}^n \\ln P(y_i \\mid \\mathbf{x}_i) = -\\frac{n}{2} \\ln(2\\pi\\sigma^2) - \\frac{1}{2\\sigma^2} \\sum_{i=1}^n (y_i - f(\\mathbf{x}_i))^2$$
极大化对数似然 $\\max \\ln \\mathcal{L}(\\mathbf{w})$ 完全等价于最小化：
$$\\min_{\\mathbf{w}} \\sum_{i=1}^n (y_i - f(\\mathbf{x}_i))^2$$
**结论**：使用 MSE 损失函数在本质上就是在强力假设“残差噪声是完全对称的高斯白噪声”。

#### 2. 为什么二分类问题不能直接用 MSE？
如果将分类概率 $\\hat{p} = \\sigma(\\mathbf{w}^T \\mathbf{x})$ 代入 MSE 损失：
$$L_{\\text{MSE}} = \\frac{1}{2}(y - \\sigma(z))^2$$
对其求导：
$$\\frac{\\partial L_{\\text{MSE}}}{\\partial \\mathbf{w}} = -(y - \\sigma(z)) \\cdot \\sigma'(z) \\cdot \\mathbf{x} = -(y - \\sigma(z)) \\cdot \\sigma(z)(1-\\sigma(z)) \\cdot \\mathbf{x}$$
当模型发生严重错误时（如真值 $y=1$，但模型输出极小的值 $z = -10$, $\\sigma(z) \\approx 0$）：
$\\sigma'(z) = \\sigma(z)(1-\\sigma(z)) \\approx 0$，导致**梯度趋近于 0（梯度消失）**！模型明明错得离谱，却完全学不动。
而使用二元交叉熵损失 $L_{\\text{BCE}}$ 时：
$$\\frac{\\partial L_{\\text{BCE}}}{\\partial \\mathbf{w}} = (\\sigma(z) - y) \\cdot \\mathbf{x}$$
梯度大小与绝对误差 $|\\sigma(z) - y|$ 严格呈正比，不存在被 $\\sigma'(z)$ 抹平的失效现象。

### 逐步实现与代码解析
通过下面的代码对比 MSE、MAE、Huber 与交叉熵在不同误差值下的梯度大小行为：

```python
import numpy as np

# 模拟预测值在真实值为 1 时的误差演变
y_true = 1.0
predictions = np.linspace(0.01, 1.99, 100)
errors = predictions - y_true

# 1. 损失函数数值计算
loss_mse = 0.5 * (errors ** 2)
loss_mae = np.abs(errors)

# Huber 损失 (delta = 0.5)
delta = 0.5
loss_huber = np.where(np.abs(errors) <= delta, 0.5 * errors ** 2, delta * np.abs(errors) - 0.5 * delta ** 2)

# 二分类交叉熵损失 (仅考察 p in (0, 1))
p = np.clip(predictions, 1e-4, 1.0 - 1e-4)
loss_bce = - (1.0 * np.log(p))

print("=== 误差距离与各损失函数数值对比样例 ===")
for err in [-0.9, -0.2, 0.0, 0.2, 0.8]:
    idx = np.argmin(np.abs(errors - err))
    print(f"误差 e={err:+4.1f} | MSE={loss_mse[idx]:6.3f} | MAE={loss_mae[idx]:6.3f} | Huber={loss_huber[idx]:6.3f}")

print(f"\\n当概率预测为极小值 p=0.01 时 (严重误判):")
print(f"交叉熵 Loss = {-np.log(0.01):.2f} (高额惩罚产生剧烈梯度)")
```

### 常见易错点与典型反例
1. **金融/风控模型滥用 MSE**：
   - 金融欺诈样本中偶发数千万元的大额洗钱交易（极端离群点）。若用普通 MSE 拟合，模型为了迎合该极端异常点，会大幅度旋转整个决策曲面，损害 99.9% 正常交易的识别效果。此类场景应首选 Huber 损失或分位数损失（Quantile Loss）。
2. **以为损失为 0 等于模型完美**：
   - 训练集损失为 0 几乎必定意味着过拟合（Memorization），这是算法学习的危险信号而非胜利标志。

### 知识联系与进阶桥梁
- **上承**：2.1 节假说空间与归纳偏置；
- **下接**：2.3 节经验风险与结构风险；
- **深度学习关联**：Softmax + Cross-Entropy 是所有大模型预训练与微调的标准损失函数。

### 本节总结与自查清单
- [ ] 能否给出 MSE 对应高斯噪声假设的完整极大似然推导？
- [ ] 为什么分类问题使用 MSE 会在严重错误区域发生梯度饱和消失？
- [ ] Huber 损失如何通过超参数 $\\delta$ 协调凸优化平滑性与鲁棒性？

### 权威来源与延伸阅读
- Christopher M. Bishop (2006). *Pattern Recognition and Machine Learning*, Section 1.5.5: Loss functions for regression, Springer.
- Ian Goodfellow, Yoshua Bengio, Aaron Courville (2016). *Deep Learning*, Section 6.2.1: Cost Functions, MIT Press."""

    # ── Lesson 2.3 ──
    l3_content = """### 学习目标
学完本节，你应该能够：
1. 建立期望风险（Expected Risk）、经验风险（Empirical Risk）与结构风险（Structural Risk）的数学体系；
2. 深刻理解经验风险最小化（ERM）原则的致命陷阱：训练集经验误差小并不保证泛化误差小；
3. 掌握统计学习理论的核心思想：通过结构风险最小化（SRM）在经验拟合度与模型复杂度之间施加显式惩罚；
4. 运行可交互代码，亲手实现一个带显式模型复杂度正则化惩罚的参数寻优过程。

### 前置知识
- 期望（Expectation）的积分定义；
- 矩阵内积与范数基础。

### 问题背景
在实际机器学习中，我们面临一个根本的数学悖论：
我们真正想要最小化的是**未来在全部可能未见数据上的期望损失（真实风险）**：
$$R(f) = \\mathbb{E}_{(\\mathbf{x}, y) \\sim \\mathcal{D}} [L(f(\\mathbf{x}), y)]$$
然而，客观世界的数据分布 $\\mathcal{D}$ 对人类是未知的，我们手中仅有有限的训练样本集 $S = \\{(\\mathbf{x}_i, y_i)\\}_{i=1}^n$。
最直观的替代方案是：既然算不出真实期望风险，那就把这 $n$ 个已有样本的平均损失算出来并求最小值——这就是**经验风险最小化（Empirical Risk Minimization, ERM）**。
然而，如果假说空间足够大（例如一个 100 层的深层神经网络或高阶多项式），ERM 策略会诱导模型把训练数据每一个离散点的坐标甚至随机噪声全部死记硬背下来（经验风险降为 0），但面对新数据时预测误差彻底崩溃。

### 直觉理解
- **期望风险**：学生在期末高考真实考场上的平均答题失分期望（无法提前考）；
- **经验风险**：学生做平时随堂练习册时的做错题比率；
- **经验风险最小化（ERM）的漏洞**：学生发现偷看练习册后面的参考答案，或者直接把练习册的题目背下来，随堂测试就能拿满分（经验风险为 0）。但这根本不代表他真正学会了学科思维，到了高考考场立刻现出原形。
- **结构风险最小化（SRM）的智慧**：老师不仅看平时成绩，还要对“答题步骤是否过于冗长死板（复杂度惩罚）”进行扣分，强迫学生用最简练、最本质的原理解题。

### 核心概念与符号对照表
| 概念名称 | 数学符号 | 表达式 | 核心本质 |
| --- | --- | --- | --- |
| **期望风险 (真实风险)** | $R(f)$ | $\\mathbb{E}_{(\\mathbf{x},y)\\sim\\mathcal{D}}[L(f(\\mathbf{x}),y)]$ | 目标：模型在全宇宙可能数据上的理论期望误差 |
| **经验风险 (训练误差)** | $\\hat{R}_S(f)$ | $\\frac{1}{n} \\sum_{i=1}^n L(f(\\mathbf{x}_i), y_i)$ | 代理：模型在手头有限训练集上的平均误差 |
| **泛化差距** | Generalization Gap | $R(f) - \\hat{R}_S(f)$ | 衡量模型是否存在“掩耳盗铃式”过拟合 |
| **结构风险** | $R_{\\text{SRM}}(f)$ | $\\hat{R}_S(f) + \\lambda \\cdot \\Omega(f)$ | 综合目标：经验损失 + 复杂度惩罚项 |
| **复杂度度量** | $\\Omega(f)$ | $\\|\\mathbf{w}\\|_2^2$ 或 $\\|\\mathbf{w}\\|_1$ 或 VC 维 | 对复杂、扭曲、高频振荡假说的惩罚项 |
| **权衡因子** | $\\lambda$ | 超参数 $\\lambda \\ge 0$ | 调节对数据拟合 vs 结构简洁的侧重比重 |

### 数学原理与逐步推导
#### 1. 统计学习泛化误差上界（PAC 理论）
设假说空间 $\\mathcal{H}$ 为有限集，容量为 $|\\mathcal{H}|$。对于任意给定的置信度参数 $\\delta \\in (0, 1)$，以至少 $1 - \\delta$ 的概率，对于 $\\mathcal{H}$ 中**所有可能的假说 $f$**，以下不等式一致成立：
$$R(f) \\le \\hat{R}_S(f) + \\sqrt{\\frac{\\ln |\\mathcal{H}| + \\ln(2/\\delta)}{2n}}$$
当假说空间为连续无限集时（如包含实数权重的神经网络），设其 VC 维为 $d_{\\text{VC}}$，泛化界为：
$$R(f) \\le \\hat{R}_S(f) + \\mathcal{O} \\left( \\sqrt{\\frac{d_{\\text{VC}} \\ln(n/d_{\\text{VC}}) + \\ln(1/\\delta)}{n}} \\right)$$

**深刻洞察**：
1. **训练样本量 $n$ 的作用**：分母上的 $\\sqrt{n}$ 保证了当样本量越来越大时，第二项惩罚收敛至 0，经验风险逐渐可靠地逼近期望风险；
2. **假说空间复杂度 $d_{\\text{VC}}$ 的代价**：如果盲目选用过于复杂的模型来强行将 $\\hat{R}_S(f)$ 压向 0，第二项复杂度惩罚项将急剧爆炸，导致真实泛化风险 $R(f)$ 不降反升！

#### 2. 结构风险最小化数学目标
结构风险最小化（SRM）直接将理论上界的右侧作为显式优化目标：
$$\\min_{f \\in \\mathcal{H}} \\left\\{ \\frac{1}{n} \\sum_{i=1}^n L(f(\\mathbf{x}_i), y_i) + \\lambda \\cdot \\Omega(f) \\right\\}$$
通过超参数 $\\lambda$ 寻优（通常用验证集交叉验证选定），获得帕累托最优平衡点。

### 逐步实现与代码解析
下面的 Python 代码手写展示了纯经验风险最小化（ERM）在带有噪声的数据上如何被带偏，而结构风险最小化（SRM, 带 L2 惩罚）如何稳健抵抗扰动：

```python
import numpy as np

# 1. 生成带有共线性与轻度噪声的数据
rng = np.random.default_rng(10)
n = 30
X = rng.normal(0, 1, size=(n, 5))
# 真实规律: y = 2 * x0 - 3 * x1 + 噪声 (特征 2, 3, 4 为无关干扰特征)
y = 2.0 * X[:, 0] - 3.0 * X[:, 1] + rng.normal(0, 0.5, size=n)

# 2. 纯 ERM 闭式求解: w = (X^T X)^{-1} X^T y
w_erm = np.linalg.pinv(X.T @ X) @ (X.T @ y)

# 3. 结构风险最小化 SRM (加入 L2 正则化项 lambda * ||w||^2)
# 对应优化目标: 1/(2n) ||Xw - y||^2 + (lambda/2) ||w||^2
# 闭式解: w = (X^T X + n * lambda * I)^{-1} X^T y
lam = 0.5
w_srm = np.linalg.inv(X.T @ X + n * lam * np.eye(5)) @ (X.T @ y)

print("=== 真实参数 vs ERM 求解 vs SRM 求解 ===")
print("真实参数权重:    [ 2.0, -3.0,  0.0,  0.0,  0.0]")
print(f"纯 ERM 求解权重: {w_erm.round(3)}")
print(f"SRM (L2惩罚)权重: {w_srm.round(3)}")

print(f"\\nERM 干扰特征权重范数: {np.linalg.norm(w_erm[2:]):.3f} (严重吸收噪声)")
print(f"SRM 干扰特征权重范数: {np.linalg.norm(w_srm[2:]):.3f} (有效压缩虚假关联)")
```

### 常见易错点与典型反例
1. **以为 $\\lambda$ 越大越好**：
   - 如果正则化系数 $\\lambda \\rightarrow \\infty$，模型将完全无视数据样本的经验损失，强行将所有参数全部压为 0，模型退化为欠拟合的常数平面对。
2. **在训练集和测试集上计算结构风险**：
   - 记住：正则化惩罚项 $\\lambda \\Omega(f)$ 只在**训练优化时**计入损失函数；在最终测试集上评估模型质量时，只计算真实的经验业务指标（如 MSE、AUC），绝不再附加正则化项。

### 知识联系与进阶桥梁
- **上承**：2.2 节损失函数；
- **下接**：第 3 章将把泛化误差进一步严格数学拆解为“偏差（Bias）”与“方差（Variance）”。

### 本节总结与自查清单
- [ ] 什么是经验风险与期望风险？两者在数学期望上有何等价关系（无偏性）？
- [ ] PAC 泛化误差上界由哪两个相互对抗的项组成？
- [ ] 结构风险最小化（SRM）如何在算法层面落地实现？

### 权威来源与延伸阅读
- Vladimir N. Vapnik (1998). *Statistical Learning Theory*, Chapter 1: The Setting of the Learning Problem, Wiley.
- Shai Shalev-Shwartz, Shai Ben-David (2014). *Understanding Machine Learning: From Theory to Algorithms*, Chapter 2: A Gentle Start, Cambridge University Press."""

    lessons = [
        lesson(
            lesson_id="ml-found-l2-1",
            title="假说空间与归纳偏置：模型学到的是什么",
            content=l1_content,
            difficulty=2,
            tips=[
                tip("没有免费午餐定理（NFL）的核心告诫：脱离数据分布去争论'决策树是不是比 SVM 强'在数学上毫无意义。选择模型就是在选择其背后的归纳偏置与你的业务逻辑是否契合。", "interview"),
                tip("深度学习常识：CNN 强加了局部感受野与空间平移不变性的先验偏置，这使得 CNN 在小样本图像任务上往往比 Vision Transformer 更加稳定；而 Transformer 归纳偏置更弱，需要更海量的数据才能自我涌现空间注意力。", "note"),
            ],
            demos=[
                demo(
                    code="""import numpy as np
from sklearn.linear_model import LinearRegression

# 简单线性模型假说空间展示
rng = np.random.default_rng(0)
x = np.array([[1.0], [2.0], [3.0], [4.0]])
y = np.array([2.2, 3.9, 6.1, 8.2])

model = LinearRegression().fit(x, y)
print(f"在线性假说空间 H = {{y = w*x + b}} 中搜索出的最优解：")
print(f"斜率 w = {model.coef_[0]:.3f}, 截距 b = {model.intercept_:.3f}")
""",
                    lang="python",
                    title="参数化假说空间线性参数寻优",
                )
            ],
        ),
        lesson(
            lesson_id="ml-found-l2-2",
            title="常见损失函数数学解析：从平方误差到交叉熵与 Hinge 损失",
            content=l2_content,
            difficulty=3,
            tips=[
                tip("为什么分类模型绝不能用 MSE？分类问题使用 Sigmoid+MSE 会在错误预测区域由于导数趋近 0 导致严重的梯度消失，而交叉熵损失求导后能直接抵消 Sigmoid 导数项，提供充沛的纠错梯度。", "interview"),
                tip("抗离群值法则：如果训练数据中存在较多传感器录入错误或极端异常值，优先尝试 Huber Loss 或 MAE 替代 MSE，能有效防止模型决策超曲面被个别极端异常样本带偏。", "performance"),
            ],
            demos=[
                demo(
                    code="""import numpy as np

# 验证 Sigmoid + MSE 的梯度消失 vs Sigmoid + 交叉熵的充足梯度
z = -5.0  # 极大负值，预测概率接近 0
y_true = 1.0  # 真实标签为 1，说明模型严重误判！

sigmoid = lambda x: 1.0 / (1.0 + np.exp(-x))
p = sigmoid(z)

# 1. MSE 梯度: (p - y) * p * (1 - p)
grad_mse = (p - y_true) * p * (1.0 - p)

# 2. 交叉熵梯度: (p - y)
grad_ce = p - y_true

print(f"当模型出现严重误判 (真实=1, 预测概率={p:.4f}):")
print(f"MSE 损失梯度:     {grad_mse:+.6f} (严重梯度消失，优化器无法纠偏！)")
print(f"交叉熵损失梯度:   {grad_ce:+.6f} (梯度充沛且与绝对误差成正比，快速拉回！)")
""",
                    lang="python",
                    title="分类任务中 MSE 梯度消失与交叉熵梯度优势数值验证",
                )
            ],
        ),
        lesson(
            lesson_id="ml-found-l2-3",
            title="经验风险最小化（ERM）与结构风险最小化（SRM）",
            content=l3_content,
            difficulty=3,
            tips=[
                tip("ERM 的典型病症：如果你在没有任何正则化的情况下训练了一个极高容量的模型，训练集 Loss 降到 0.0001，但验证集 Loss 居高不下，这就是典型的纯 ERM 诱发的泛化崩溃。", "pitfall"),
                tip("面试高频：请解释什么是结构风险最小化（SRM）。为什么说现代机器学习中的 L1/L2 正则化是 SRM 的具象化工程落地？", "interview"),
            ],
            demos=[
                demo(
                    code="""import numpy as np
from sklearn.linear_model import Ridge, LinearRegression

# 简单共线性数据演示 Ridge (SRM) 如何压制参数爆炸
X = np.array([[1.0, 1.01], [2.0, 2.01], [3.0, 3.02], [4.0, 4.01]])
y = np.array([3.0, 5.0, 7.0, 9.0])

# 纯 ERM (普通最小二乘)
ols = LinearRegression().fit(X, y)
# SRM (带 L2 惩罚项)
ridge = Ridge(alpha=1.0).fit(X, y)

print(f"纯 ERM 求解系数:   {ols.coef_.round(2)} (参数由于共线性剧烈震荡)")
print(f"SRM (L2惩罚)系数:  {ridge.coef_.round(2)} (结构风险有效约束系数平滑)")
""",
                    lang="python",
                    title="共线性场景下 ERM 参数失稳与 SRM 正则化稳定对比",
                )
            ],
        ),
    ]

    # ── Exercises for Chapter 2 ──
    exercises = [
        single_choice(
            ex_id="ml-found-c2-ex1",
            question="“没有免费午餐定理”（No Free Lunch Theorem）对机器学习工程实践最直接的核心启示是：",
            options=[
                {"value": "A", "text": "深度学习算法在任何数据集上的先验泛化能力都优于传统统计学习算法"},
                {"value": "B", "text": "脱离具体数据分布假设，没有任何一个算法能够在所有可能的问题上先验地优于其他算法"},
                {"value": "C", "text": "要想让模型取得良好泛化，必须支付极高的云算力成本，不可能有低成本方案"},
                {"value": "D", "text": "通过网格搜索调参，总能找到一个在全场景通用的最优超级超参数组合"},
            ],
            answer="B",
            explanation="NFL 定理在数学上证明了：如果对所有可能的目标函数在整个函数空间做均匀加权平均，任何两个学习算法的期望误差完全相同。因此，必须结合具体领域知识与数据真实分布，选择具有契合归纳偏置的算法。",
            difficulty=2,
            related_lesson_id="ml-found-l2-1",
            tags=["NFL定理", "归纳偏置", "统计学习理论"],
        ),
        judge(
            ex_id="ml-found-c2-ex2",
            question="从概率极大似然估计（MLE）的角度推导，在回归问题中使用均方误差（MSE）作为损失函数，本质上严格等价于假设观测数据的残差噪声服从均值为 0 的高斯分布（正态分布）。",
            answer=True,
            explanation="正确。当假设残差噪声 $\\epsilon \\sim \\mathcal{N}(0, \\sigma^2)$ 时，样本的负对数似然函数除了常数项外，主体部分即为残差平方和 $\\sum (y_i - f(x_i))^2$，极大化对数似然完全等价于最小化均方误差。",
            difficulty=2,
            related_lesson_id="ml-found-l2-2",
            tags=["极大似然估计", "MSE", "高斯分布"],
        ),
        multiple_choice(
            ex_id="ml-found-c2-ex3",
            question="在二分类模型训练中，相比直接使用均方误差（MSE），使用对数几率损失（Binary Cross-Entropy）具有以下哪些核心优势？",
            options=[
                {"value": "A", "text": "当模型出现极度自信的严重错误预测时，交叉熵的梯度幅值正比于误差大小，不存在由于 Sigmoid 饱和区引发的梯度消失"},
                {"value": "B", "text": "对于线性分类假说，交叉熵损失关于模型参数是全局凸函数，不易陷入局部恶性极小值"},
                {"value": "C", "text": "交叉熵损失在预测完全错误时损失趋近于 0，能够保护模型参数不被破坏"},
                {"value": "D", "text": "交叉熵天然源自伯努利分布的条件极大似然估计，具有完备的信息论与统计学理论基础"},
            ],
            answer=["A", "B", "D"],
            explanation="选项 A、B、D 均正确：BCE 求导后抵消了 Sigmoid 的微商项，使得梯度为 $(p - y)x$，消除梯度消失且具有良好凸性与统计学根基。选项 C 错误：预测完全错误时交叉熵损失趋于正无穷大，提供高额惩罚。",
            difficulty=3,
            related_lesson_id="ml-found-l2-2",
            tags=["交叉熵", "损失函数", "梯度特性"],
        ),
        fill(
            ex_id="ml-found-c2-ex4",
            question="在统计学习理论中，真实未知分布上的期望风险为 $R(f)$，手头有限训练集上的平均损失称为 ____ 风险；经验风险最小化（ERM）容易导致严重过拟合，而结构风险最小化（SRM）通过在目标函数中显式引入对模型复杂度的 ____ 项，从而有效控制泛化误差上界。",
            blanks=[
                ["经验", "经验风险"],
                ["惩罚", "惩罚项", "正则化", "正则项", "约束"]
            ],
            explanation="手头有限训练集上的平均误差称为【经验风险】；结构风险最小化（SRM）在经验风险基础上添加了对模型复杂度的【惩罚项（正则化项）】，在拟合能力与模型复杂度之间寻找帕累托平衡。",
            difficulty=2,
            related_lesson_id="ml-found-l2-3",
            tags=["ERM", "SRM", "理论填空"],
        ),
        open_ex(
            ex_id="ml-found-c2-ex5",
            question="【概念剖析与推导题】请回答以下关于损失函数与归纳偏置的两个核心问题：\n1. 解释为什么卷积神经网络（CNN）对图像识别具有强归纳偏置，而普通全连接前馈神经网络（MLP）归纳偏置较弱？这在数据样本量不足时会带来怎样的性能差异？\n2. 写出 Huber 损失函数的数学分段定义，并阐明它相比纯 MSE 和纯 MAE 的工程优势。",
            reference_answer="""1. CNN 与 MLP 归纳偏置对比及小样本表现：
- CNN 强加了两个关键物理归纳偏置：① 局部感受野（Local Connectivity）：像素只与相邻邻域存在强相关；② 平移等变性（Translation Equivariance / 权值共享）：图像中物体的语义特征在平移后保持不变。而 MLP 假定每个像素与全图任意其他像素均存在独立权重，缺乏局部与空间平移先验。
- 差异表现：在样本量较小时，CNN 的强归纳偏置能极大压缩有效假说空间，避免学到虚假全局噪声关联，泛化性能显著优于 MLP；而 MLP 由于参数量巨大且缺乏空间约束，在小样本下极易严重过拟合。

2. Huber 损失定义与工程优势：
- 数学分段定义：
  $$L_\\delta(e) = \\begin{cases} \\frac{1}{2}e^2, & \\text{当 } |e| \\le \\delta \\\\ \\delta |e| - \\frac{1}{2}\\delta^2, & \\text{当 } |e| > \\delta \\end{cases}$$
  其中 $e = y - \\hat{y}$，$\\delta > 0$ 为阈值超参数。
- 工程优势：
  ① 相比纯 MSE：当出现极端离群点时（$|e| > \\delta$），损失由平方惩罚降为线性增长，梯度恒定为 $\\pm \\delta$，避免异常值产生爆炸性梯度带偏模型；
  ② 相比纯 MAE：在接近原点处（$|e| \\le \\delta$）保持二次可微光滑性，导数连续平滑收敛到 0，避免了 MAE 在零点处的次梯度震荡。""",
            explanation="深入考察常见模型归纳偏置的物理内涵，以及稳健回归损失（Huber Loss）在工业去噪中的设计哲学。",
            rubric=[
                {"point": "清晰阐明 CNN 局部感受野与平移等变性两大归纳偏置，并对比 MLP", "score": 25},
                {"point": "说明小样本场景下强归纳偏置限制假说空间、提升泛化稳定性的原因", "score": 25},
                {"point": "准确写出 Huber 损失函数的分段数学表达式（平方区与线性区）", "score": 25},
                {"point": "对比 MSE（抗离群能力强）与 MAE（零点光滑收敛），阐明 Huber 的工程折中优势", "score": 25},
            ],
            difficulty=4,
            related_lesson_id="ml-found-l2-2",
            tags=["归纳偏置", "Huber损失", "综合简答"],
        ),
        # ── Code Exercise 2 ──
        {
            "id": "ml-found-c2-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】实现鲁棒 Huber 损失与梯度函数：\n编写函数 `calc_huber(y_true, y_pred, delta=1.0)`，接收两个同形状一维 NumPy 浮点数组及阈值 `delta`，返回一个元组 `(loss, grad)`：\n1. `loss`: 样本平均 Huber 损失（浮点数）；\n2. `grad`: 损失函数关于预测值 `y_pred` 的平均梯度 $\\frac{\\partial L}{\\partial \\hat{y}}$（浮点数）。\n\n提示：误差 $e = \\hat{y} - y$。当 $|e| \\le \\delta$ 时，$L = \\frac{1}{2}e^2$，梯度为 $e$；当 $|e| > \\delta$ 时，$L = \\delta|e| - \\frac{1}{2}\\delta^2$，梯度为 $\\delta \\cdot \\text{sign}(e)$。\n最后一行返回调用示例 `calc_huber(np.array([1.0, 2.0]), np.array([1.2, 5.0]), delta=1.0)` 的结果。",
            "starterCode": "import numpy as np\n\ndef calc_huber(y_true: np.ndarray, y_pred: np.ndarray, delta: float = 1.0) -> tuple:\n    \"\"\"计算平均 Huber 损失及对预测值 y_pred 的梯度\"\"\"\n    # 请在此实现\n    ___\n\ncalc_huber(np.array([1.0, 2.0]), np.array([1.2, 5.0]), delta=1.0)\n",
            "setupCode": "",
            "expectedOutput": "(1.26, 0.6)",
            "answer": "import numpy as np\n\ndef calc_huber(y_true: np.ndarray, y_pred: np.ndarray, delta: float = 1.0) -> tuple:\n    e = y_pred - y_true\n    abs_e = np.abs(e)\n    loss_arr = np.where(abs_e <= delta, 0.5 * (e ** 2), delta * abs_e - 0.5 * (delta ** 2))\n    grad_arr = np.where(abs_e <= delta, e, delta * np.sign(e))\n    return (float(np.mean(loss_arr)), float(np.mean(grad_arr)))\n\ncalc_huber(np.array([1.0, 2.0]), np.array([1.2, 5.0]), delta=1.0)\n",
            "tests": "loss, grad = calc_huber(np.array([0.0]), np.array([0.5]), delta=1.0)\nassert round(loss, 4) == 0.125, f\"小误差平方区损失有误: {loss}\"\nassert round(grad, 4) == 0.5, f\"小误差平方区梯度有误: {grad}\"\nloss2, grad2 = calc_huber(np.array([0.0]), np.array([3.0]), delta=1.0)\nassert round(loss2, 4) == 2.5, f\"大误差线性区损失有误: {loss2}\"\nassert round(grad2, 4) == 1.0, f\"大误差线性区梯度应截断为delta: {grad2}\"\n",
            "explanation": "Huber 损失在误差较小时采用二次平滑损失，导数连续；在误差超过 delta 时截断为恒定梯度 delta，有效抵御异常值带偏参数。",
            "tags": ["Huber损失", "梯度计算", "鲁棒回归"],
            "related_lesson_id": "ml-found-l2-2",
        },
        single_choice(
            ex_id="ml-found-c2-ex7",
            question="关于结构风险最小化（SRM）与经验风险最小化（ERM）的关系，以下哪种说法是准确的？",
            options=[
                {"value": "A", "text": "当样本量 $n \\rightarrow \\infty$ 时，经验风险最小化（ERM）以概率 1 收敛于期望风险，此时正则化项 $\\lambda$ 可以逐渐衰减至 0"},
                {"value": "B", "text": "ERM 始终优于 SRM，因为 SRM 人为增加了惩罚，破坏了数据真实性"},
                {"value": "C", "text": "SRM 中的复杂度惩罚项 $\\Omega(f)$ 必须同时在训练集和最终生产推理时一同计算"},
                {"value": "D", "text": "若一个模型在训练集上经验风险达到 0，则该模型的结构风险必然也达到全域最小值"},
            ],
            answer="A",
            explanation="根据统计学习大数定律与 PAC 理论，随着样本量 $n \\rightarrow \\infty$，泛化误差上界中的复杂度惩罚项以 $\\mathcal{O}(1/\\sqrt{n})$ 速率收敛到 0，经验风险无偏逼近期望风险。因此在海量数据下，模型对先验正则化惩罚的依赖显著降低。",
            difficulty=3,
            related_lesson_id="ml-found-l2-3",
            tags=["SRM", "大数定律", "泛化理论"],
        ),
    ]

    return chapter(
        chapter_id="ml-found-c2",
        course_id="ml-foundations",
        order=2,
        title="模型三要素：假说空间、损失函数与优化目标",
        goal="深刻理解假说空间与归纳偏置第一性原理，掌握常用损失函数的推导与抗噪特性，建立结构风险最小化优化框架。",
        lessons=lessons,
        exercises=exercises,
    )
