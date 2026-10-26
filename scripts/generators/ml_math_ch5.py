# -*- coding: utf-8 -*-
"""
Chapter 5: 数理统计、参数估计与置信区间 (Mathematical Statistics & Parameter Estimation)
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_5():
    # ── Lesson 5.1 ──
    l1_content = """### 学习目标
学完本节，你应该能够：
1. 掌握总体参数（Population Parameters）与样本统计量（Sample Statistics）的本质区别；
2. 理解样本方差使用贝塞尔校正（Bessel's Correction）除以 $n-1$ 的深层数理原因，并完成无偏性严格代数推导；
3. 从几何投影子空间自由度（Degrees of Freedom）视角，解释为什么残差正交投影矩阵 $M = I - P$ 消耗了参数自由度；
4. 掌握源自正态总体的三大基础抽样分布：卡方分布（$\\chi^2$）、学生氏 $t$ 分布（$t$）与费希尔 $F$ 分布（$F$）；
5. 编写代码对有偏样本方差（除以 $n$）与无偏样本方差（除以 $n-1$）进行大样本蒙特卡洛仿真对比，验证贝塞尔校正的必要性。

### 前置知识
- 期望与方差代数性质；
- 独立同分布（i.i.d.）随机变量基础。

### 问题背景与 ML 用途
在机器学习的理想世界中，我们希望直接掌握数据生成机制的真实“总体联合分布 $p_{\\text{data}}(\\mathbf{x}, y)$”。
然而在工程现实中，我们永远只能拿到有限的“训练集与验证集（样本）”。
如何通过有限的样本观测，对未知的总体特征做出最优、最稳健且无系统性偏差的估计？
- 为什么在批归一化（Batch Normalization）中，训练阶段计算方差除以 $B$，而推理阶段累积的总体运行方差（Running Variance）必须使用除以 $B-1$ 的无偏校正？
- 为什么线性回归分析特征显著性时输出的表格里总是包含 $t$ 统计量与 $F$ 检验值？
数理统计学为机器学习提供了从“有限样本经验”跨越到“总体真实规律”的严格推断方法。

### 直觉理解
- **贝塞尔校正（自己夸自己）**：如果我们知道真实的总体均值 $\\mu$，直接计算每个样本点到 $\\mu$ 的距离平方和再除以 $n$，结果是绝对无偏的。但在实际中，我们根本不知道 $\\mu$，只能用这组样本自己的平均值 $\\bar{X}$ 来代替。因为样本平均值 $\\bar{X}$ 本身就是由这组数据算出来的，它天然“紧贴”着这组数据，导致每个点到 $\\bar{X}$ 的散布距离往往比到真实总体均值 $\\mu$ 的距离**略微更小**！如果直接除以 $n$，计算出的方差就会系统性偏小（低估真实风险）。为了纠正这种“近亲偏袒”，分母必须减少 1，从 $n$ 变成 $n-1$！

### 核心概念与符号对照表
| 核心概念 | 符号 | 数学定义 / 表达式 | 在机器学习中的核心用途 |
| --- | --- | --- | --- |
| **样本均值** | $\\bar{X}$ | $\\frac{1}{n} \\sum_{i=1}^n X_i$ | 总体期望的无偏且一致估计量 |
| **有偏样本方差** | $S_n^2$ | $\\frac{1}{n} \\sum_{i=1}^n (X_i - \\bar{X})^2$ | 极大似然估计值（偏低） |
| **无偏样本方差** | $S^2$ | $\\frac{1}{n-1} \\sum_{i=1}^n (X_i - \\bar{X})^2$ | 总体真实方差的无偏估计量（贝塞尔校正） |
| **自由度** | $\\text{df}$ | 能够自由变动的独立变量个数（$n - p$） | 卡方分布、$t$ 分布与 $F$ 分布的关键参数 |
| **卡方分布** | $\\chi^2(k)$ | $\\sum_{i=1}^k Z_i^2, Z_i \\sim \\mathcal{N}(0, 1)$ | 样本方差分布、拟合优度检验 |
| **学生氏 $t$ 分布** | $t(k)$ | $\\frac{Z}{\\sqrt{V/k}}, Z \\sim \\mathcal{N}(0, 1), V \\sim \\chi^2(k)$ | 小样本未知方差假设检验、厚尾鲁棒建模 |

### 数学原理与逐步推导
#### 1. 样本方差除以 $n$ 产生系统性低估的严格代数证明
设独立同分布样本 $X_1, \\dots, X_n \\sim (\\mu, \\sigma^2)$。样本均值 $\\bar{X} = \\frac{1}{n}\\sum X_i$。
根据期望与方差性质：
$$\\mathbb{E}[\\bar{X}] = \\mu, \\quad \\text{Var}(\\bar{X}) = \\frac{\\sigma^2}{n}$$
利用方差展开公式 $\\text{Var}(Y) = \\mathbb{E}[Y^2] - (\\mathbb{E}[Y])^2$，对于单个样本 $X_i$：
$$\\mathbb{E}[X_i^2] = \\text{Var}(X_i) + (\\mathbb{E}[X_i])^2 = \\sigma^2 + \\mu^2$$
对于样本均值 $\\bar{X}$：
$$\\mathbb{E}[\\bar{X}^2] = \\text{Var}(\\bar{X}) + (\\mathbb{E}[\\bar{X}])^2 = \\frac{\\sigma^2}{n} + \\mu^2$$
考察样本离差平方和 $\\sum_{i=1}^n (X_i - \\bar{X})^2$ 的数学期望：
$$\\sum_{i=1}^n (X_i - \\bar{X})^2 = \\sum_{i=1}^n (X_i^2 - 2 X_i \\bar{X} + \\bar{X}^2) = \\sum_{i=1}^n X_i^2 - 2 \\bar{X} \\sum_{i=1}^n X_i + n \\bar{X}^2 = \\sum_{i=1}^n X_i^2 - n \\bar{X}^2$$
对两边取数学期望：
$$\\mathbb{E}\\left[ \\sum_{i=1}^n (X_i - \\bar{X})^2 \\right] = \\sum_{i=1}^n \\mathbb{E}[X_i^2] - n \\mathbb{E}[\\bar{X}^2] = n(\\sigma^2 + \\mu^2) - n\\left(\\frac{\\sigma^2}{n} + \\mu^2\\right) = n \\sigma^2 - \\sigma^2 = (n - 1) \\sigma^2$$
若除以 $n$：
$$\\mathbb{E}\\left[ \\frac{1}{n} \\sum_{i=1}^n (X_i - \\bar{X})^2 \\right] = \\frac{n-1}{n} \\sigma^2 < \\sigma^2$$
这证明了除以 $n$ 得到的方差估计期望系统性小于 $\\sigma^2$！
若除以 $n-1$：
$$\\mathbb{E}[S^2] = \\mathbb{E}\\left[ \\frac{1}{n-1} \\sum_{i=1}^n (X_i - \\bar{X})^2 \\right] = \\frac{(n-1)\\sigma^2}{n-1} = \\sigma^2$$
**定理得证**：除以 $n-1$ 的样本方差是总体方差的**严格无偏估计量**。

### 几何图景与计算图
```
样本自由度损失的几何图景：
原样本空间 R^n (维数 = n)
       │
       ▼ 正交投影到全 1 向量方向 e = [1, 1, ..., 1]^T
子空间 1: 样本均值向量 \bar{X} * 1 (消耗 1 个自由度)
       │
       ▼ 正交补子空间 (残差向量 X - \bar{X} * 1)
子空间 2: 约束超平面 \sum (X_i - \bar{X}) = 0 (维度为 n - 1)
       ▲
       │ 样本方差只能在这个 n - 1 维子空间中自由摆动！
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：NumPy 的 `np.var` 默认也是除以 $n-1$ 吗？
> **不是！** 这是很多机器学习初学者踩过的大坑：
> - NumPy 的 `np.var(x)` 默认参数是 `ddof=0`（Delta Degrees of Freedom），默认除以 $n$（有偏估计）；
> - Pandas 的 `df.var()` 默认是 `ddof=1`，除以 $n-1$（无偏估计）；
> 在计算无偏方差时，必须显式在 NumPy 中指定 `np.var(x, ddof=1)`！

### 工业界实践与工程考量
- 在 PyTorch 的 `BatchNorm1d/2d` 中，训练阶段为了与当前 Batch 样本紧密对其使用的是 `unbiased=False`（即除以 $B$）；但当记录全局评估指标或向 `running_var` 累积时，会采用贝塞尔校正校准，防止全局模型部署时低估方差导致数值失真。

### 延伸思考与进阶阅读
- 阅读 George Casella, Roger L. Berger《Statistical Inference》第 5 章：抽样分布与自由度。
- 思考：既然除以 $n-1$ 的样本方差 $S^2$ 是无偏的，那么对它直接开平方得到的样本标准差 $S = \\sqrt{S^2}$，还是总体标准差 $\\sigma$ 的无偏估计吗？（提示：利用琴生不等式分析凸函数开平方）。

### 本节小结
- 样本平均值固定了一个自由度约束，导致离差平方和期望仅为 $(n-1)\sigma^2$；
- 贝塞尔校正通过除以 $n-1$ 恢复方差估计的无偏性；三大抽样分布构成了假设检验的理论基石。"""

    l1_code = """import numpy as np

# 设定真实总体的均值与方差
np.random.seed(42)
true_mu = 10.0
true_sigma = 3.0
true_var = true_sigma ** 2  # 真实方差为 9.0

# 模拟小样本情况 (每次抽取 n = 5 个样本)，重复 20,000 次实验
n_sample = 5
n_trials = 20000

samples = np.random.normal(loc=true_mu, scale=true_sigma, size=(n_trials, n_sample))

# 分别计算除以 n (有偏) 和除以 n - 1 (无偏) 的样本方差
vars_biased = np.var(samples, axis=1, ddof=0)
vars_unbiased = np.var(samples, axis=1, ddof=1)

mean_biased = np.mean(vars_biased)
mean_unbiased = np.mean(vars_unbiased)

print(f"真实总体方差: {true_var:.4f}")
print("=" * 55)
print(f"除以 n   的样本方差平均值: {mean_biased:.4f} (低估比例: {mean_biased / true_var:.2%})")
print(f"理论预测有偏方差期望 ((n-1)/n * sigma^2): {(n_sample - 1) / n_sample * true_var:.4f}")
print(f"除以 n-1 的样本方差平均值: {mean_unbiased:.4f} (准确度: {mean_unbiased / true_var:.2%})")
print("=" * 55)
print("实验结论: 贝塞尔校正除以 (n-1) 完美消除了系统性下偏，实现了绝对无偏估计！")
"""

    lesson_1 = lesson(
        lesson_id="ml-math-l5-1",
        title="总体与样本统计量、自由度与抽样分布：贝塞尔校正之谜",
        content=l1_content,
        difficulty=3,
        tips=[
            tip("NumPy 与 Pandas 的方差默认参数陷阱：NumPy `np.var` 默认除以 n (ddof=0)，而 Pandas `df.var` 默认除以 n-1 (ddof=1)，做特征工程时必须格外注意统一标准。", "pitfall"),
            tip("自由度守恒法则：数据原有的 n 个自由度，在估计了均值后消耗了 1 个，只剩 n-1 个自由度能反映残差波动。", "note")
        ],
        demos=[
            demo(code=l1_code, title="蒙特卡洛仿真验证贝塞尔校正的方差无偏性")
        ]
    )

    # ── Lesson 5.2 ──
    l2_content = """### 学习目标
学完本节，你应该能够：
1. 掌握似然函数（Likelihood Function）与对数似然函数（Log-Likelihood）的构建方法；
2. 理解极大似然估计（MLE）的数学本质与一阶 Score 方程求解；
3. 掌握费希尔信息量（Fisher Information）与克拉默-拉奥下界（Cramér-Rao Lower Bound, CRLB），理解 MLE 的渐近有效性；
4. 掌握极大后验估计（MAP）在贝叶斯框架下与 MLE 及正则化项的统一对偶模型；
5. 编写代码对正态分布样本进行解析 MLE 与基于 SciPy 优化器的数值 MLE 拟合，验证参数估计的一致性。

### 前置知识
- 联合概率分布与自然对数求导；
- 驻点求导极值条件。

### 问题背景与 ML 用途
在机器学习中，**几乎所有经典损失函数的诞生，都源自数理统计中的极大似然估计（MLE）**：
- 为什么回归任务要最小化均方误差（MSE）？因为在假设数据噪声服从高斯分布时，MLE 导出的目标函数在数学上**严格等价于 MSE**！
- 为什么二分类任务要用对数损失（Binary Cross-Entropy）？因为在假设标签服从伯努利分布时，MLE 导出的目标函数在数学上**严格等价于 BCE**！
- 为什么多分类任务要用 Softmax 交叉熵？因为在假设标签服从分类分布时，MLE 导出的目标函数正是交叉熵！
可以说，理解了极大似然估计与最大后验估计，就掌握了整个现代监督学习损失函数体系的“法典之源”。

### 直觉理解
- **极大似然的直觉（事出反常必有因）**：假设你有一个箱子，里面有两种可能：要么全是白球，要么白黑各半。你闭着眼睛从中抓出 5 个球，全都是白球。你会猜测箱子里是哪种情况？几乎所有人都会断定“全白球的概率更大”。因为在“全白球”假设下，抓出 5 个白球的概率是 $100\%$；而在“半黑半白”假设下，概率只有 $(1/2)^5 \\approx 3.125\\%$。极大似然估计就是在所有可能的模型参数中，挑选出那个**使得当前已经观察到的数据发生概率最大的参数 $\\theta$**！

### 核心概念与符号对照表
| 核心概念 | 符号 | 数学定义 / 表达式 | 在机器学习中的核心用途 |
| --- | --- | --- | --- |
| **似然函数** | $L(\\theta \\mid D)$ | $\\prod_{i=1}^n p(x_i \\mid \\theta)$ | 给定数据下参数 $\\theta$ 的支持度 |
| **对数似然函数** | $\\ell(\\theta)$ | $\\sum_{i=1}^n \\log p(x_i \\mid \\theta)$ | 将连乘转化为连加，数值防下溢 |
| **Score 函数** | $S(\\theta)$ | $\\nabla_\\theta \\ell(\\theta)$ | 对数似然的梯度，满足 $\\mathbb{E}[S(\\theta)] = 0$ |
| **Fisher 信息量** | $I(\\theta)$ | $\\mathbb{E}[S(\\theta) S(\\theta)^T] = -\\mathbb{E}[\\nabla^2 \\ell(\\theta)]$ | 数据对参数提供的信息量，刻画对数似然曲率 |
| **CRLB 下界** | $\\text{Var}(\\hat{\\theta})$ | $\\ge I(\\theta)^{-1}$ | 任何无偏估计量方差所能达到的理论极限 |
| **MAP 估计** | $\\hat{\\theta}_{\\text{MAP}}$ | $\\arg\\max_\\theta [\\ell(\\theta) + \\log p(\\theta)]$ | 结合先验知识的正则化参数估计 |

### 数学原理与逐步推导
#### 1. 高斯噪声线性回归推导 MSE 损失函数的全过程
设样本对为 $(x_i, y_i)$，真实关系为线性关系加上独立同分布的加性高斯噪声：
$$y_i = \\mathbf{w}^T \\mathbf{x}_i + \\epsilon_i, \\quad \\epsilon_i \\sim \\mathcal{N}(0, \\sigma^2)$$
因此在给定特征 $\\mathbf{x}_i$ 和参数 $\\mathbf{w}$ 条件下，目标值 $y_i$ 服从均值为 $\\mathbf{w}^T \\mathbf{x}_i$ 的高斯分布：
$$p(y_i \\mid \\mathbf{x}_i; \\mathbf{w}, \\sigma^2) = \\frac{1}{\\sqrt{2\\pi \\sigma^2}} \\exp\\left( -\\frac{(y_i - \\mathbf{w}^T \\mathbf{x}_i)^2}{2\\sigma^2} \\right)$$
构建样本集上的对数似然函数：
$$\\ell(\\mathbf{w}) = \\sum_{i=1}^n \\log p(y_i \\mid \\mathbf{x}_i; \\mathbf{w}, \\sigma^2) = \\sum_{i=1}^n \\left[ -\\frac{1}{2} \\log(2\\pi \\sigma^2) - \\frac{1}{2\\sigma^2} (y_i - \\mathbf{w}^T \\mathbf{x}_i)^2 \\right]$$
提取出与参数 $\\mathbf{w}$ 相关的项：
$$\\ell(\\mathbf{w}) = -\\frac{1}{2\\sigma^2} \\sum_{i=1}^n (y_i - \\mathbf{w}^T \\mathbf{x}_i)^2 - \\frac{n}{2} \\log(2\\pi \\sigma^2)$$
由于常数项和正常数因子 $\\frac{1}{2\\sigma^2}$ 不改变极值点位置，最大化对数似然函数 $\\max_{\\mathbf{w}} \\ell(\\mathbf{w})$ 等价于：
$$\\min_{\\mathbf{w}} \\frac{1}{n} \\sum_{i=1}^n (y_i - \\mathbf{w}^T \\mathbf{x}_i)^2$$
**结论**：最小化均方误差（MSE）损失函数，在统计学上精确等价于**假定观测噪声为高斯分布时的极大似然估计**！

### 几何图景与计算图
```
从似然到损失函数的统一数学图景：
分布假设              似然函数连乘              负对数似然 (-log L) ──> 现代机器学习损失函数
高斯分布 N(μ, σ^2) ──▶ ∏ exp(-(y - ŷ)^2) ──────▶ ∑ (y - ŷ)^2        ──> 均方误差 (MSE Loss)
伯努利分布 Bern(p) ──▶ ∏ p^y (1-p)^(1-y) ──────▶ -∑ [y log p + ...] ──> 二元交叉熵 (BCE Loss)
多项分类分布 Cat(p) ──▶ ∏ ∏ p_k^(y_k)     ──────▶ -∑ y_k log p_k    ──> 多分类交叉熵 (Cross Entropy)
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：以为 MLE 估计量永远是无偏的
> MLE 具有渐近无偏性（Asymptotic Unbiasedness，当 $n \\to \\infty$ 时无偏），但**在小样本时 MLE 往往是有偏的**！例如正态分布方差的 MLE 估计量是 $\\hat{\\sigma}_{\\text{MLE}}^2 = \\frac{1}{n}\\sum (X_i - \\bar{X})^2$，它恰好就是那个缺少了贝塞尔校正的有偏方差估计！

### 工业界实践与工程考量
- 在大模型训练中，Loss 实际上就是语言模型的每个 Token 预测的负对数似然（Negative Log-Likelihood, NLL）。困惑度指标（Perplexity, PPL）直接定义为 NLL 的指数次幂：$\\text{PPL} = \\exp(\\text{Loss})$。

### 延伸思考与进阶阅读
- 阅读 Stephen M. Stigler《The History of Statistics》中关于 Gauss 与 Laplace 对最小二乘法与正态分布极大似然等价性的论述。
- 思考：如果观测数据中包含很多极端异常值（厚尾噪声），高斯噪声假设下的 MSE 会严重崩塌，此时应换用哪种噪声分布的 MLE 来导出更鲁棒的损失函数？（提示：Huber 损失或绝对误差 MAE 对应的拉普拉斯分布）。

### 本节小结
- 极大似然估计寻找让观测数据发生概率最大化的参数；
- MSE、BCE 与交叉熵损失函数均源自特定概率分布下的极大似然估计。"""

    l2_code = """import numpy as np
from scipy.optimize import minimize

# 生成一组服从正态分布的合成观测数据
np.random.seed(42)
true_mu = 5.0
true_sigma = 2.0
data = np.random.normal(loc=true_mu, scale=true_sigma, size=100)

# 1. 解析 MLE 公式求解
# mu_mle = mean(x)
# sigma2_mle = 1/n * sum((x - mean)^2)
mle_mu_analytical = np.mean(data)
mle_sigma_analytical = np.std(data, ddof=0) # MLE 对应除以 n

print("=== 解析法极大似然估计 (Analytical MLE) ===")
print(f"mu 估计值: {mle_mu_analytical:.4f} (真实值: {true_mu})")
print(f"sigma 估计值: {mle_sigma_analytical:.4f} (真实值: {true_sigma})")

# 2. 基于数值优化的负对数似然最小化 (Numerical MLE)
def negative_log_likelihood(params):
    mu, sigma = params[0], params[1]
    if sigma <= 1e-5:
        return 1e10
    n = len(data)
    # 高斯负对数似然公式
    nll = 0.5 * n * np.log(2.0 * np.pi * sigma**2) + np.sum((data - mu)**2) / (2.0 * sigma**2)
    return nll

# 使用 L-BFGS-B 数值优化求解
res = minimize(negative_log_likelihood, x0=[0.0, 1.0], bounds=[(-50, 50), (1e-3, 50)])
mle_mu_num, mle_sigma_num = res.x

print("\\n=== 数值优化极大似然估计 (Numerical MLE via SciPy) ===")
print(f"数值解 mu: {mle_mu_num:.4f}, sigma: {mle_sigma_num:.4f}")
print("解析解与数值解误差:", np.max(np.abs([mle_mu_analytical - mle_mu_num, mle_sigma_analytical - mle_sigma_num])))
"""

    lesson_2 = lesson(
        lesson_id="ml-math-l5-2",
        title="极大似然估计 MLE 与 MAP 估计对偶：现代损失函数的源泉",
        content=l2_content,
        tips=[
            tip("损失函数即负对数似然：在阅读机器学习前沿论文时，只要看到一个新的 Loss 函数，第一反应就是分析作者暗中假设了哪种概率分布并在做极大似然估计。", "interview"),
            tip("CRLB 的实际含义：克拉默-拉奥下界是参数估计的物理天花板，它说明任何无偏算法都不可能突破 Fisher 信息量所限定的方差精度极限。", "note")
        ],
        demos=[
            demo(code=l2_code, title="正态分布参数极大似然解析解与数值优化对比")
        ]
    )

    # ── Lesson 5.3 ──
    l3_content = """### 学习目标
学完本节，你应该能够：
1. 掌握置信区间（Confidence Interval）的数理构造枢轴量法（Pivotal Quantity Method）；
2. 深刻辨析置信区间的真正统计学涵义，彻底根除“参数落在该区间概率为 95%”的常见认知谬误；
3. 掌握假设检验决策矩阵（Hypothesis Testing Decision Matrix），明确第一类错误 $\\alpha$、第二类错误 $\\beta$ 与统计功效（Statistical Power, $1-\\beta$）；
4. 掌握 $p$ 值的严密数理定义（在原假设成立时观察到至少当前极端统计量的概率），理解其在工程决策中的临界作用；
5. 编写代码对两个机器学习模型的测试集准确率进行 Welch 独立双样本 $t$ 检验，判定模型改良是否具有统计显著性。

### 前置知识
- 样本均值与正态抽样分布；
- 学生氏 $t$ 分布与临界值查找。

### 问题背景与 ML 用途
在机器学习模型研发与上线部署中，我们每天都在面对这样的关键抉择：
- “新版本模型的准确率从 85.2% 提升到了 85.6%，这个提升到底是真的来自算法改进，还是仅仅因为测试集随机抽样碰巧发生的波动？”
- “在互联网推荐系统 A/B 测试中，实验组留存率提升了 0.3%，我们需要积累多少 UV 样本量才能确保这一结论不是随机假象？”
如果缺乏严格的假设检验与统计功效控制：
- 团队会把随机噪声当作重大技术突破，浪费数月算力上线一个毫无作用的“伪改进”（犯第一类错误，假阳性）；
- 团队也可能因为样本量过小导致检验功效不足，错误废弃一个真正有效的架构改进（犯第二类错误，假阴性）。

### 直觉理解
- **置信区间的套圈游戏**：地上的木桩是固定的（未知的真实参数 $\\mu$），你手中的圈则是随机变动的（基于样本计算出的置信区间 $[\\hat{\\mu} - \\Delta, \\hat{\\mu} + \\Delta]$）。“95% 置信区间”的意思是：如果你扔 100 次圈（重复进行 100 次独立抽样实验），其中大约有 95 次套中木桩，5 次脱靶。**木桩不会动，是圈在动！**
- **p 值的司法审判直觉**：法庭审判默认“疑罪从无”（原假设 $H_0$：嫌疑人无罪）。如果检方提交的作案物证在“被告无罪”的假设下发生的概率极低（例如只有 $p = 0.001$），法官就会判定该假设极不合理，从而推翻原假设（拒绝 $H_0$），宣判被告有罪（改进显著有效）。

### 核心概念与符号对照表
| 核心概念 | 符号 | 数学定义 / 表达式 | 在机器学习中的核心用途 |
| --- | --- | --- | --- |
| **原假设** | $H_0$ | 待检验的默认基准（通常为“新模型无显著改善”） | 确定保护基准、防止虚假冒进 |
| **第一类错误** | $\\alpha$ | $P(\\text{拒绝 } H_0 \\mid H_0 \\text{ 为真})$ | 假阳性率（False Positive Rate），通常设定为 0.05 |
| **第二类错误** | $\\beta$ | $P(\\text{未拒绝 } H_0 \\mid H_0 \\text{ 为假})$ | 假阴性率（漏报率），通常设定 $\\le 0.20$ |
| **统计功效** | $1 - \\beta$ | 能够成功检测出真实有效改进的概率 | 实验设计样本容量规划（Power Analysis） |
| **$p$ 值** | $p\\text{-value}$ | $P(T \\ge t_{\\text{obs}} \\mid H_0)$ | 量化当前观测极端程度的指标 |
| **效应量** | Cohen's $d$ | $\\frac{\\mu_1 - \\mu_2}{\\sigma_{\\text{pooled}}}$ | 不依赖样本量的实际业务提升幅度度量 |

### 数学原理与逐步推导
#### 1. 均值差检验的 Welch $t$ 检验统计量推导
设两组实验指标独立抽取于两模型测试结果：
模型 A：样本量 $n_1$，均值 $\\bar{X}_1$，样本方差 $S_1^2$；
模型 B：样本量 $n_2$，均值 $\\bar{X}_2$，样本方差 $S_2^2$。
不假定两组总体方差相等，根据中心极限定理，均值差的方差为：
$$\\text{Var}(\\bar{X}_1 - \\bar{X}_2) = \\frac{\\sigma_1^2}{n_1} + \\frac{\\sigma_2^2}{n_2}$$
用样本方差代替总体方差，构建 Welch $t$ 检验统计量：
$$t = \\frac{(\\bar{X}_1 - \\bar{X}_2) - 0}{\\sqrt{\\frac{S_1^2}{n_1} + \\frac{S_2^2}{n_2}}}$$
该统计量近似服从自由度为 $\\nu$ 的 $t$ 分布，其中有效自由度由 Welch-Satterthwaite 公式给出：
$$\\nu \\approx \\frac{\\left(\\frac{S_1^2}{n_1} + \\frac{S_2^2}{n_2}\\right)^2}{\\frac{(S_1^2/n_1)^2}{n_1 - 1} + \\frac{(S_2^2/n_2)^2}{n_2 - 1}}$$
双侧检验的 $p$ 值为 $p = 2 \\times P(t_\\nu \\ge |t_{\\text{obs}}|)$。
若 $p < \\alpha$（如 0.05），我们在统计学上拒绝原假设，认定两模型性能存在显著差异。

### 几何图景与计算图
```
假设检验决策矩阵：
                        真实情况：H_0 为真 (无改进)     真实情况：H_0 为假 (真实有改进)
检验决策：接受 H_0       正确决策 (置信度 1 - α)          第二类错误 (犯漏报 β)
检验决策：拒绝 H_0       第一类错误 (虚假误报 α)          正确决策 (统计功效 1 - β)
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：“p 值小于 0.05 说明改进的幅度很大”
> **绝对错误！** $p$ 值仅仅度量了“该差异是由随机噪声引起的概率”，它**绝不等于效应量（Effect Size）的大小**！当样本量 $n$ 极其庞大时（如推荐系统数亿次曝光），即使准确率仅仅提升了微不足道的 0.0001%，$p$ 值也能轻松达到极小的 $10^{-10}$。因此工业界必须将“$p$ 值显著性”与“实际业务效应量（Cohen's d / 经济收益）”合并考量。

### 工业界实践与工程考量
- 在大模型微调评估中，由于测试集评估样本有限（如 GSM8K 1319 道题），单纯比较两次跑分（例如 75.3% vs 76.1%）极易受到单次采样噪声干扰。工业界标准做法是进行多次随机采样测试，运行配对 $t$ 检验（Paired t-test）或 McNemar 检验来下结论。

### 延伸思考与进阶阅读
- 阅读 Ron Kohavi《Trustworthy Online Controlled Experiments: A Practical Guide to A/B Testing》第 2 章与第 3 章。
- 思考：如果同时测试了 100 个特征候选方案，并对每个方案按照 $\alpha = 0.05$ 进行显著性检验，其中完全没有任何作用的垃圾特征碰巧被误判为“显著有效”的概率是多少？（多重检验校正与 Bonferroni 校正）。

### 本节小结
- 置信区间刻画了参数估计的不确定性区间；
- 假设检验通过控制第一类错误 $\alpha$ 与第二类错误 $\beta$，为算法迭代与 A/B 测试提供科学严谨的决策保障。"""

    l3_code = """import numpy as np
from scipy import stats

# 模拟两款模型在 30 个不同测试分块上的准确率跑分 (百分制)
np.random.seed(42)
# 模型 A (基准模型): 均值 82.0, 标准差 2.0
scores_A = np.random.normal(loc=82.0, scale=2.0, size=30)
# 模型 B (微调改良模型): 均值 83.2, 标准差 2.2
scores_B = np.random.normal(loc=83.2, scale=2.2, size=30)

# 计算均值与标准差
mean_A, std_A = np.mean(scores_A), np.std(scores_A, ddof=1)
mean_B, std_B = np.mean(scores_B), np.std(scores_B, ddof=1)

print(f"基准模型 A 均值: {mean_A:.3f} (标准差: {std_A:.3f})")
print(f"新版模型 B 均值: {mean_B:.3f} (标准差: {std_B:.3f})")
print(f"两模型样本准确率差值: {mean_B - mean_A:.3f}%")

# 执行独立双样本 Welch t 检验 (不假定方差齐性)
t_stat, p_val = stats.ttest_ind(scores_B, scores_A, equal_var=False)

# 计算效应量 Cohen's d
pooled_std = np.sqrt(((len(scores_A)-1)*std_A**2 + (len(scores_B)-1)*std_B**2) / (len(scores_A) + len(scores_B) - 2))
cohen_d = (mean_B - mean_A) / pooled_std

print("-" * 55)
print(f"Welch t 统计量: {t_stat:.4f}")
print(f"双侧 p 值: {p_val:.4f}")
print(f"效应量 (Cohen's d): {cohen_d:.4f} (通常 0.2 为小效应, 0.5 为中等效应, 0.8 为大效应)")

alpha = 0.05
if p_val < alpha:
    print(f"统计检验结论: p < {alpha}，在 95% 置信水平下拒绝原假设，新模型提升具有统计显著性！")
else:
    print(f"统计检验结论: p >= {alpha}，不能排除随机波动，提升不具备显著性。")
"""

    lesson_3 = lesson(
        lesson_id="ml-math-l5-3",
        title="置信区间与假设检验决策矩阵：A/B 测试与显著性判据",
        content=l3_content,
        difficulty=3,
        tips=[
            tip("p 值的正确定位：p 值不是模型更好的概率，而是零假设（无改进）成立时出现当前差异的罕见程度。", "interview"),
            tip("大样本量下的显著性陷阱：在大数据场景下，极微小的业务差异也会呈现出 p < 0.001 的统计显著，必须同时考核业务效应量（Cohen's d）。", "note")
        ],
        demos=[
            demo(code=l3_code, title="双模型效果对比 Welch t 检验与效应量评估")
        ]
    )

    lessons = [lesson_1, lesson_2, lesson_3]

    # ── Exercises for Chapter 5 ──
    exercises = [
        single_choice(
            ex_id="ml-math-c5-ex1",
            question="在数理统计中，为什么计算样本方差时必须除以 $n-1$（贝塞尔校正）而不是除以 $n$？",
            options=[
                {"value": "A", "text": "因为使用了样本均值 $\\bar{X}$ 代替未知总体均值 $\\mu$，导致样本离差平方和的数学期望仅为 $(n-1)\\sigma^2$，除以 $n-1$ 才能确保估计量的无偏性"},
                {"value": "B", "text": "因为除以 $n$ 在计算机中可能会导致浮点数除以零异常"},
                {"value": "C", "text": "因为第 $n$ 个样本永远无法被测量"},
                {"value": "D", "text": "为了让方差的量纲与标准差保持一致"},
            ],
            answer="A",
            explanation="样本均值本身是用这组数据算出来的，使得样本点相对于样本均值的离散程度天生比相对于真实总体均值更紧密。数学推导证明 $\\mathbb{E}[\\sum (X_i-\\bar{X})^2] = (n-1)\\sigma^2$，因此除以 $n-1$ 才能恢复对总体方差的严格无偏估计。",
            difficulty=2,
            related_lesson_id="ml-math-l5-1",
            tags=["贝塞尔校正", "无偏估计", "样本方差", "数理推导"],
        ),
        judge(
            ex_id="ml-math-c5-ex2",
            question="在假设检验中，$p$ 值的严谨定义是：在已知新算法确实比基准模型更优的前提下，未来测试集能够复现这一优势的概率。",
            answer=False,
            explanation="错误。这是常见的严重误解。$p$ 值的严格定义是在【原假设成立（即新算法没有实质改进）】的条件下，由于抽样随机性导致出现至少像当前观测结果一样极端统计量的概率。它既不是原假设成立的概率，更不是新算法更优的概率。",
            difficulty=2,
            related_lesson_id="ml-math-l5-3",
            tags=["p值定义", "假设检验", "统计误区"],
        ),
        multiple_choice(
            ex_id="ml-math-c5-ex3",
            question="关于极大似然估计（MLE）在机器学习中的对应关系，下列命题正确的有：",
            options=[
                {"value": "A", "text": "在线性回归中假定加性噪声服从均值为 0 的高斯分布，则极大似然估计在数学上等价于最小二乘法（MSE 损失）"},
                {"value": "B", "text": "在二分类逻辑回归中假定标签服从伯努利分布，则极大似然估计在数学上等价于最小化二元交叉熵损失（BCE Loss）"},
                {"value": "C", "text": "极大似然估计在小样本下也必定是无偏估计"},
                {"value": "D", "text": "在给定高斯先验的前提下进行极大后验估计（MAP），在数学上等价于带有 $L_2$ 正则化惩罚（Ridge 岭回归）"},
            ],
            answer=["A", "B", "D"],
            explanation="A、B、D 均完全正确。C 是错误的，MLE 仅保证大样本渐近无偏，在有限小样本下往往是有偏的（如方差的 MLE 估计量除以的是 $n$ 而非 $n-1$，存在系统性偏低）。",
            difficulty=3,
            related_lesson_id="ml-math-l5-2",
            tags=["极大似然估计", "MSE", "交叉熵", "MAP", "L2正则"],
        ),
        fill(
            ex_id="ml-math-c5-ex4",
            question="在假设检验中，原假设为真但检验决策错误地拒绝了原假设，所犯的错误被称为第 ____ 类错误（假阳性）；任何无偏估计量所能达到的方差理论下界被称为克拉默-拉奥下界（CRLB），该下界等于 ____ 信息量的倒数。",
            blanks=[
                ["一", "1", "第一类错误", "I"],
                ["费希尔", "Fisher", "Fisher信息量", "费希尔信息量"]
            ],
            explanation="拒绝真实的原假设称为第一类错误（Type I error，False Positive）；CRLB 下界等于 Fisher 信息量的逆矩阵/倒数。",
            difficulty=3,
            related_lesson_id="ml-math-l5-2",
            tags=["第一类错误", "CRLB", "Fisher信息量"],
        ),
        open_ex(
            ex_id="ml-math-c5-ex5",
            question="【数理代数推导】设 $X_1, X_2, \\dots, X_n$ 为独立同分布的样本，总体均值为 $\\mu$，总体方差为 $\\sigma^2$。请完成贝塞尔校正的完整代数推导：\n1. 写出样本均值 $\\bar{X}$ 的期望与方差；\n2. 展开离差平方和 $\\sum_{i=1}^n (X_i - \\bar{X})^2$；\n3. 对展开式两边求数学期望，证明 $\\mathbb{E}\\left[\\sum_{i=1}^n (X_i - \\bar{X})^2\\right] = (n-1)\\sigma^2$；\n4. 由此得出为什么必须除以 $n-1$ 才能得到总体方差的无偏估计量。",
            reference_answer="""推导过程如下：
1. 样本均值 $\\bar{X} = \\frac{1}{n}\\sum_{i=1}^n X_i$。
   由于独立同分布：
   $$\\mathbb{E}[\\bar{X}] = \\mu, \\quad \\text{Var}(\\bar{X}) = \\frac{\\sigma^2}{n}$$
   利用公式 $\\mathbb{E}[Y^2] = \\text{Var}(Y) + (\\mathbb{E}[Y])^2$，可知：
   $$\\mathbb{E}[X_i^2] = \\sigma^2 + \\mu^2, \\quad \\mathbb{E}[\\bar{X}^2] = \\frac{\\sigma^2}{n} + \\mu^2$$
2. 展开离差平方和：
   $$\\sum_{i=1}^n (X_i - \\bar{X})^2 = \\sum_{i=1}^n (X_i^2 - 2 X_i \\bar{X} + \\bar{X}^2) = \\sum_{i=1}^n X_i^2 - 2 \\bar{X} \\sum_{i=1}^n X_i + n \\bar{X}^2$$
   由于 $\\sum_{i=1}^n X_i = n \\bar{X}$，代入化简可得：
   $$\\sum_{i=1}^n (X_i - \\bar{X})^2 = \\sum_{i=1}^n X_i^2 - n \\bar{X}^2$$
3. 对两边取数学期望：
   $$\\mathbb{E}\\left[ \\sum_{i=1}^n (X_i - \\bar{X})^2 \\right] = \\sum_{i=1}^n \\mathbb{E}[X_i^2] - n \\mathbb{E}[\\bar{X}^2]$$
   代入第 1 步的期望结果：
   $$= n(\\sigma^2 + \\mu^2) - n\\left( \\frac{\\sigma^2}{n} + \\mu^2 \\right) = n \\sigma^2 + n \\mu^2 - \\sigma^2 - n \\mu^2 = (n - 1) \\sigma^2$$
4. 结论：
   由于离差平方和的数学期望仅为 $(n-1)\\sigma^2$，若直接除以 $n$，得到的估计量期望为 $\\frac{n-1}{n}\\sigma^2 < \\sigma^2$（系统性低估）；
   定义样本方差 $S^2 = \\frac{1}{n-1}\\sum_{i=1}^n (X_i - \\bar{X})^2$，对其取期望得：
   $$\\mathbb{E}[S^2] = \\frac{1}{n-1} \\mathbb{E}\\left[ \\sum_{i=1}^n (X_i - \\bar{X})^2 \\right] = \\frac{(n-1)\\sigma^2}{n-1} = \\sigma^2$$
   因此，除以 $n-1$ 是确保估计量无偏性的充要条件。""",
            explanation="通过展开离差平方和并代入样本均值方差公式，严谨推导出 (n-1) 因子与无偏估计量。",
            rubric=[
                {"point": "正确写出并推导 E[X_i^2] = \\sigma^2 + \\mu^2 以及 E[\\bar{X}^2] = \\sigma^2/n + \\mu^2", "score": 25},
                {"point": "正确代数展开并化简离差平方和为 \\sum X_i^2 - n \\bar{X}^2", "score": 25},
                {"point": "两边求期望并精确得出 (n-1)\\sigma^2 结论", "score": 25},
                {"point": "清晰说明除以 n 会导致下偏，证明除以 (n-1) 的无偏性", "score": 25},
            ],
            difficulty=4,
            related_lesson_id="ml-math-l5-1",
            tags=["贝塞尔校正", "数学证明", "无偏方差", "期望推导"],
        ),
        # ── Code Exercise 5 ──
        {
            "id": "ml-math-c5-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】实现有偏方差与贝塞尔无偏方差计算器：\n编写函数 `sample_variance_unbiased(data)`：\n接收一个包含实数的一维列表或 NumPy 数组 `data`（假定长度 $n \\ge 2$）。\n计算并返回一个元组 `(mean, biased_var, unbiased_var, correction_ratio)`：\n1. `mean`: 样本均值 $\\bar{x} = \\frac{1}{n} \\sum x_i$（浮点数，保留 4 位小数）；\n2. `biased_var`: 样本有偏方差（分母为 $n$，保留 4 位小数）；\n3. `unbiased_var`: 贝塞尔校正无偏方差（分母为 $n-1$，保留 4 位小数）；\n4. `correction_ratio`: 校正比率 $\\frac{\\text{unbiased\\_var}}{\\text{biased\\_var}} = \\frac{n}{n-1}$（保留 4 位小数）。\n\n最后一行请返回调用示例在测试数据 `[2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0]` 下的计算结果。",
            "starterCode": "import numpy as np\n\ndef sample_variance_unbiased(data) -> tuple:\n    \"\"\"计算样本均值、有偏方差、贝塞尔校正无偏方差及校正比率\"\"\"\n    # 请在此实现\n    ___\n\nsample_variance_unbiased([2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0])\n",
            "setupCode": "",
            "expectedOutput": "(5.0, 4.0, 4.5714, 1.1429)",
            "answer": "import numpy as np\n\ndef sample_variance_unbiased(data) -> tuple:\n    arr = np.array(data, dtype=float)\n    n = len(arr)\n    m = float(np.mean(arr))\n    biased_var = float(np.sum((arr - m)**2) / n)\n    unbiased_var = float(np.sum((arr - m)**2) / (n - 1))\n    ratio = float(n / (n - 1))\n    return (round(m, 4), round(biased_var, 4), round(unbiased_var, 4), round(ratio, 4))\n\nsample_variance_unbiased([2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0])\n",
            "tests": "res_t = sample_variance_unbiased([1.0, 3.0])\nassert res_t == (2.0, 1.0, 2.0, 2.0), f\"计算结果有误: {res_t}\"\n",
            "explanation": "根据定义分别计算除以 n 的有偏方差与除以 n-1 的无偏方差，并计算其倍率关系 n/(n-1)。",
            "tags": ["样本方差", "贝塞尔校正", "无偏估计", "NumPy编程实战"],
            "related_lesson_id": "ml-math-l5-1",
        },
        single_choice(
            ex_id="ml-math-c5-ex7",
            question="在进行算法 A/B 测试实验设计时，若希望将检测真实微小改进的统计功效（Statistical Power, $1-\\beta$）从 80% 提升至 95%，在保持显著性水平 $\\alpha=0.05$ 不变的前提下，所需要的测试样本量通常需要如何变化？",
            options=[
                {"value": "A", "text": "样本量需要大幅增加约 60% 到 75% 左右"},
                {"value": "B", "text": "样本量可以减少一半"},
                {"value": "C", "text": "样本量保持完全不变，只需要提高学习率"},
                {"value": "D", "text": "样本量只需要增加 1 个样本即可"},
            ],
            answer="A",
            explanation="根据样本量估算公式 $n \\propto (z_{1-\\alpha/2} + z_{1-\\beta})^2$。当 $1-\\beta$ 从 80% ($z=0.84$) 提升至 95% ($z=1.645$) 时，临界值平方和项显著增加，所需样本容量通常需要扩张 60% 到 75% 左右。",
            difficulty=3,
            related_lesson_id="ml-math-l5-3",
            tags=["统计功效", "A/B测试", "样本量估算"],
        ),
    ]

    return chapter(
        chapter_id="ml-math-c5",
        course_id="ml-math",
        order=5,
        title="数理统计、参数估计与置信区间",
        goal="掌握贝塞尔校正与三大抽样分布，理解极大似然 MLE 与损失函数对偶，掌握假设检验与 A/B 测试判据。",
        lessons=lessons,
        exercises=exercises,
    )
