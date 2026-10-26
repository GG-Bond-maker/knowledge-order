# -*- coding: utf-8 -*-
"""
Chapter 4: 集成学习：Bagging、Boosting 与梯度提升家族 (Ensemble Learning: Bagging, Boosting & Gradient Boosted Trees)
Course: ml-classical-algorithms
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_4():
    # ── Lesson 4.1 ──
    l1_content = """### 学习目标
学完本节，你应该能够：
1. 理解集成学习（Ensemble Learning）的“群体智慧”哲学与三大范式（Bagging、Boosting 与 Stacking）；
2. 从统计学角度推导独立弱分类器多数表决错误率随基模型数量 $T$ 呈指数衰减的 Condorcet 陪审团定理；
3. 掌握自助重采样（Bootstrap Sampling）机制与 $1 - 1/e \\approx 63.2\\%$ 的数学极限证明，掌握袋外数据（OOB, Out-Of-Bag）无偏评估；
4. 理解随机森林（Random Forest, Breiman 2001）的双重随机性机制（样本随机抽样 + 特征随机子空间）；
5. 编写代码实现随机森林分类，对比基模型数量对方差削减的效果，并评估 OOB 准确率与特征重要性。

### 前置知识
- 决策树基本原理（CART 二叉树）；
- 独立同分布随机变量方差性质与二项分布。

### 问题背景与 ML 用途
单棵决策树虽然直观可解释，但有一个致命弱点：**方差极高（High Variance）**。训练集中只要发生哪怕一个样本点的微小扰动，树的根节点切分点就可能发生突变，导致整棵树从上到下所有分支完全变异。
在统计学中，降低方差最直接有效的方法就是**求平均（Averaging）**：
$$Var\\left( \\frac{1}{T} \\sum_{t=1}^T X_t \\right) = \\frac{\\sigma^2}{T} \\quad (\\text{若彼此独立})$$
随机森林（Random Forest）通过构建多棵互相独立的决策树并将它们“群策群力”融合，在几乎不增加偏差的前提下，将方差断崖式压缩，成为**工业界结构化表格数据（Tabular Data）上最坚实可靠的开箱即用首选算法**。

### 直觉理解
- **专家会诊与独立第二意见**：看病时，如果只听一位医生的诊断，他可能因为当天的偏好或个案偏差给出激进甚至错误的建议；但如果召集 100 位来自不同背景、拥有不同专科视角的资深医生独立诊断，最后通过举手表决决定治疗方案，误诊率将大幅下降！
- **盲人摸象的互补性（双重随机性）**：如果 100 位医生看的都是同一张化验单，他们的结论很容易趋同。随机森林的绝妙之处在于：**第一重随机性**让每个医生看不同的病历子集（Bootstrap 采样），**第二重随机性**让每个医生在每个问诊环节只能看部分生理指标（每次分裂随机挑选 $\\sqrt{d}$ 个特征）！这样培养出的每棵树各有专长且彼此低相关，集成效果登峰造极。

### 核心概念与符号对照表
| 核心概念 | 符号 / 机制 | 统计学本质 | 核心作用 |
| --- | --- | --- | --- |
| **自助采样** | Bootstrap Sample | 有放回均匀随机抽取 $N$ 次 | 创造具有统计扰动的新训练集 |
| **袋外样本** | OOB ($36.8\\%$) | 每次采样未被抽中的独立样本集 | 无需独立验证集即可无偏交叉验证 |
| **特征子空间** | $m = \\sqrt{d}$ | 每次划分只从随机抽取的 $m$ 个特征中挑最佳 | 强行打碎各决策树之间的相关性 |
| **方差收敛** | $\\rho \\sigma^2 + \\frac{1-\\rho}{T} \\sigma^2$ | 当 $T \\to \\infty$，方差下限由树间相关性 $\\rho$ 决定 | 解释为何随机森林不会无限过拟合 |

### 数学原理与逐步推导
#### 1. 独立基分类器多数投票错误率指数衰减证明
设 $T$ 个二分类基分类器 $h_1, \\dots, h_T$，各自分类错误率均为 $\\epsilon < 0.5$ 且彼此相互独立。
集成预测通过多数投票产生，集成分类错误的条件是超过半数分类器预测错误。设错误分类器个数为随机变量 $K \\sim \\text{Binomial}(T, \\epsilon)$。
由霍夫丁不等式（Hoeffding's Inequality）：
$$P\\left( K \\ge \\frac{T}{2} \\right) = P\\left( \\sum_{t=1}^T (I_t - \\epsilon) \\ge T\\left(0.5 - \\epsilon\\right) \\right) \\le \\exp\\left( -2 T (0.5 - \\epsilon)^2 \\right)$$
**结论**：只要基学习器的准确率略高于随机瞎猜（$\\epsilon < 0.5$），集成分类器的错误率将**随着基模型数量 $T$ 呈负指数级迅猛衰减至 0**！

#### 2. 袋外数据（OOB）比例的极限推导
设样本集共有 $N$ 个样本。进行一次有放回的随机抽取，某个特定样本未被抽中的概率为 $1 - \\frac{1}{N}$。
连续抽取 $N$ 次后，该样本**始终未被抽中**的概率为：
$$P(\\text{未被抽中}) = \\left( 1 - \\frac{1}{N} \\right)^N$$
利用重要的微积分极限公式 $\\lim_{N \\to \\infty} (1 + \\frac{x}{N})^N = e^x$，令 $x = -1$：
$$\\lim_{N \\to \\infty} \\left( 1 - \\frac{1}{N} \\right)^N = e^{-1} = \\frac{1}{e} \\approx 0.367879 \\approx 36.8\\%$$
**结论**：在样本量足够大时，每棵树平均只使用了约 $63.2\\%$ 的原始样本，而剩余约 $36.8\\%$ 的样本对该树是完全未见过的隐蔽样本！这些未抽中的样本被称为**袋外数据（OOB）**，可直接作为该树的天然测试集。

### 真实代码示例与分析
下面展示如何使用 `sklearn.ensemble.RandomForestClassifier` 训练随机森林，对比单棵决策树与随机森林的泛化能力，并提取 OOB 评分："""

    l1_code = """import numpy as np
from sklearn.datasets import make_classification
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

# 1. 生成复杂的多特征二分类数据
X, y = make_classification(
    n_samples=1000, n_features=20, n_informative=12,
    n_redundant=4, random_state=42
)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

# 2. 训练单棵决策树 (易受高方差过拟合困扰)
tree = DecisionTreeClassifier(random_state=42)
tree.fit(X_train, y_train)
acc_tree_train = tree.score(X_train, y_train)
acc_tree_test = tree.score(X_test, y_test)

# 3. 训练随机森林 (oob_score=True 开启袋外评估)
rf = RandomForestClassifier(n_estimators=100, max_features='sqrt', oob_score=True, random_state=42)
rf.fit(X_train, y_train)
acc_rf_train = rf.score(X_train, y_train)
acc_rf_test = rf.score(X_test, y_test)
oob_score = rf.oob_score_

print(f"单棵决策树: 训练集准确率={acc_tree_train:.4f}, 测试集准确率={acc_tree_test:.4f} (过拟合落差: {acc_tree_train - acc_tree_test:.4f})")
print(f"随机森林  : 训练集准确率={acc_rf_train:.4f}, 测试集准确率={acc_rf_test:.4f} (测试集显著领先!)")
print(f"随机森林 OOB 估计准确率: {oob_score:.4f} (无需保留测试集即可无偏检验)")
"""

    l1_tips = [
        tip("很多初学者误以为随机森林树越多（n_estimators 越大）越容易过拟合。其实不然！根据大数定律，随机森林的泛化误差随着树木增多会单调收敛于一个理论上界，绝不会因为加树而导致过拟合。", "note"),
        tip("计算特征重要性时，传统的 MDI（基尼不纯度减少量）严重偏爱高基数类别特征（取值多的列）。在严谨业务场景中，推荐使用基于袋外置换的 Permutation Feature Importance（PFI）。", "pitfall"),
    ]

    # ── Lesson 4.2 ──
    l2_content = """### 学习目标
学完本节，你应该能够：
1. 掌握提升法（Boosting）的串行加法模型（Additive Model）与前向分步算法（Forward Stagewise Algorithm）；
2. 理解自适应提升（AdaBoost, Freund & Schapire 1997）如何通过“错题强化”动态重加权训练样本；
3. 严格推导基学习器重要性系数 $\\alpha_t = \\frac{1}{2} \\ln\\left(\\frac{1-\\epsilon_t}{\\epsilon_t}\\right)$ 与样本权重迭代乘法公式；
4. 证明 AdaBoost 最小化加权分类误差等价于在函数空间中最小化**指数损失（Exponential Loss）**；
5. 编写代码从零实现基于单层决策树桩（Decision Stump）的 AdaBoost 权重更新与集成分类器。

### 前置知识
- 凸函数极值一阶导数驻点条件；
- 指数函数与自然对数运算性质。

### 问题背景与 ML 用途
Bagging（如随机森林）采用的是“并行各抒己见，平权多数表决”策略，基模型之间没有主次先后，重点在**削减方差（Reduce Variance）**。
而 **Boosting（提升法）采用的是“知错就改，接力补齐短板”的串行迭代哲学**，重点在**削减偏差（Reduce Bias）**：
- 每一轮训练的新模型，专门聚焦于前面所有模型“做错的难题”；
- 表现优异的弱学习器获得更大的发言权（较高的投票权重 $\\alpha_t$），表现较差的被削减话语权；
- 最终将成百上千个极其简陋的“弱分类器”（如仅有 1 次切分的单层决策树桩）组合成一个高精度的强学习器！

### 直觉理解
- **中高考错题本与魔鬼冲刺**：学生在复习冲刺时，如果每次模拟考都把所有题目从头到尾平均做一遍，提分极慢（相当于平权重复训练）。聪明的学生会准备一个**错题本**：第一轮模考后，把做错的题做上红色标记，赋予极大权重；第二轮集中所有精力死磕这些高难度错题；第三轮再针对第二轮还做错的少数极难题目强化……最终，每一个针对特定薄弱知识点的解题本领综合起来，构成了无懈可击的高考学霸！

### 核心概念与符号对照表
| 核心概念 | 符号 / 公式 | 物理与数学意义 | 动态演变趋势 |
| --- | --- | --- | --- |
| **加权分类误差率** | $\\epsilon_t = \\sum_{i: h_t(\\mathbf{x}_i) \\ne y_i} w_{t, i}$ | 第 $t$ 轮弱学习器在加权样本集上的失误率 | 要求 $\\epsilon_t < 0.5$（优于盲猜） |
| **分类器权重** | $\\alpha_t = \\frac{1}{2} \\ln\\left( \\frac{1 - \\epsilon_t}{\\epsilon_t} \\right)$ | 弱学习器在最终强委员会中的投票权 | $\\epsilon_t \\to 0$ 时 $\\alpha_t \\to +\\infty$；$\\epsilon_t = 0.5$ 时 $\\alpha_t = 0$ |
| **样本权重更新** | $w_{t+1, i} = \\frac{w_{t, i}}{Z_t} \\exp(-\\alpha_t y_i h_t(\\mathbf{x}_i))$ | 做对样本权重被除以 $\\exp(\\alpha_t)$，做错被乘以 $\\exp(\\alpha_t)$ | 错题被动态加权放大 |
| **规范化因子** | $Z_t = \\sum_{i=1}^n w_{t, i} \\exp(-\\alpha_t y_i h_t(\\mathbf{x}_i))$ | 保证新样本权重和为 1 的归一化常数 | 也是第 $t$ 轮训练误差的严格上界 |

### 数学原理与逐步推导
#### 1. 前向分步加法模型与指数损失极小化
AdaBoost 最终构建的强分类器是一个加权线性和：
$$f_M(\\mathbf{x}) = \\sum_{t=1}^M \\alpha_t h_t(\\mathbf{x})$$
决策判决为 $\\text{sign}(f_M(\\mathbf{x}))$，目标是极小化指数损失函数：
$$\\mathcal{L}(f) = \\sum_{i=1}^n \\exp\\left( -y_i f(\\mathbf{x}_i) \\right) = \\sum_{i=1}^n \\exp\\left( -y_i [f_{t-1}(\\mathbf{x}_i) + \\alpha_t h_t(\\mathbf{x}_i)] \\right)$$
定义当前样本权重为未归一化的前序损失 $w_{t, i} = \\exp(-y_i f_{t-1}(\\mathbf{x}_i))$，则第 $t$ 轮的目标函数为：
$$\\mathcal{L}_t(\\alpha_t, h_t) = \\sum_{i=1}^n w_{t, i} \\exp\\left( -y_i \\alpha_t h_t(\\mathbf{x}_i) \\right)$$

#### 2. 基分类器权重 $\\alpha_t$ 的解析推导
由于 $y_i, h_t(\\mathbf{x}_i) \\in \\{-1, +1\\}$，乘积 $y_i h_t(\\mathbf{x}_i)$ 只有两种取值：
- 分类正确时：$y_i h_t(\\mathbf{x}_i) = +1$；
- 分类错误时：$y_i h_t(\\mathbf{x}_i) = -1$。
将目标函数按分类正确与否拆分成两部分：
$$\\mathcal{L}_t = e^{-\\alpha_t} \\sum_{y_i = h_t(\\mathbf{x}_i)} w_{t, i} + e^{\\alpha_t} \\sum_{y_i \\ne h_t(\\mathbf{x}_i)} w_{t, i}$$
设总权重和已归一化 $\\sum w_{t, i} = 1$，加权错误率为 $\\epsilon_t = \\sum_{y_i \\ne h_t(\\mathbf{x}_i)} w_{t, i}$，正确权重和为 $1 - \\epsilon_t$。
代入得：
$$\\mathcal{L}_t(\\alpha_t) = (1 - \\epsilon_t) e^{-\\alpha_t} + \\epsilon_t e^{\\alpha_t}$$
为了求使损失最小的 $\\alpha_t$，对其求导并令导数为 0：
$$\\frac{\\partial \\mathcal{L}_t}{\\partial \\alpha_t} = -(1 - \\epsilon_t) e^{-\\alpha_t} + \\epsilon_t e^{\\alpha_t} = 0$$
$$(1 - \\epsilon_t) e^{-\\alpha_t} = \\epsilon_t e^{\\alpha_t} \\implies e^{2\\alpha_t} = \\frac{1 - \\epsilon_t}{\\epsilon_t}$$
两边取自然对数并除以 2：
$$\\alpha_t = \\frac{1}{2} \\ln\\left( \\frac{1 - \\epsilon_t}{\\epsilon_t} \\right)$$
**证毕**！这就是 AdaBoost 中经典的分类器权重公式。

### 真实代码示例与分析
下面展示从零实现 AdaBoost 单步迭代与样本权重更新过程："""

    l2_code = """import numpy as np
from sklearn.tree import DecisionTreeClassifier

# 1. 构造一个简单的一维二分类错题集
X = np.array([[0], [1], [2], [3], [4], [5], [6], [7], [8], [9]], dtype=float)
y = np.array([1, 1, 1, -1, -1, -1, 1, 1, 1, -1])  # 类别标签 {-1, +1}
n = len(X)

# 2. 初始化均匀样本权重
weights = np.ones(n) / n

# 3. 运行一轮 AdaBoost: 训练单层决策树桩 (Decision Stump)
stump = DecisionTreeClassifier(max_depth=1)
stump.fit(X, y, sample_weight=weights)
preds = stump.predict(X)

# 计算加权分类误差率 epsilon
incorrect = (preds != y)
epsilon = np.sum(weights[incorrect])

# 计算分类器发言权系数 alpha
alpha = 0.5 * np.log((1.0 - epsilon) / max(epsilon, 1e-10))

# 更新样本权重并归一化
weights = weights * np.exp(-alpha * y * preds)
weights = weights / np.sum(weights)

print(f"第 1 轮树桩切分点阈值: {stump.tree_.threshold[0]}")
print(f"加权误差率 epsilon: {epsilon:.4f}")
print(f"分类器权重 alpha: {alpha:.4f}")
print(f"错题样本索引: {np.where(incorrect)[0]}")
print(f"做错样本的新权重: {weights[incorrect]}")
print(f"做对样本的新权重: {weights[~incorrect]}")
print(f"新权重和验证: {np.sum(weights):.4f}")
"""

    l2_tips = [
        tip("AdaBoost 采用指数损失 exp(-y f(x))，对异常值（Outliers）极度敏感！因为异常值可能永远分类错误，其权重会被指数级持续暴增，导致后续基分类器全部围着异常噪声打转。在噪声严重的场景下应改用 Huber 损失或 GBDT。", "pitfall"),
    ]

    # ── Lesson 4.3 ──
    l3_content = """### 学习目标
学完本节，你应该能够：
1. 掌握梯度提升机（GBM / GBDT, Friedman 2001）的广义函数空间梯度下降（Gradient Descent in Function Space）思想；
2. 深刻辨析传统残差（Residuals）与**伪残差（Pseudo-Residuals / 负梯度）**的本质差异；
3. 推导常见损失函数（MSE 回归损失、MAE 绝对值损失、二分类对数似然损失 Deviance）对应的负梯度解析式；
4. 掌握回归树拟合负梯度后叶节点最优输出值 $\\gamma_{jm}$ 的求解策略；
5. 掌握收缩率（Shrinkage / Learning Rate）正则化机制对提升树步长更新与泛化性能的控制。

### 前置知识
- 多元微积分梯度概念；
- 极大似然估计与交叉熵损失。

### 问题背景与 ML 用途
AdaBoost 虽然优雅，但受限于指数损失函数，无法轻松推广到连续值回归、排序（Ranking）或泊松计数等复杂损失目标。
2001 年，统计学泰斗 Jerome H. Friedman 提出了划时代的 **GBDT（Gradient Boosted Decision Trees）**：
- 破除了“残差只能是 $y - \\hat{y}$”的狭隘认知，证明任何可微损失函数都可以在函数空间做梯度下降；
- 将前向加法模型与最速下降法（Steepest Descent）完美缝合；
- GBDT 开启了树模型横扫 Kaggle 竞赛与各行业推荐排序、点击率预估的黄金时代！

### 直觉理解
- **参数空间梯度下降 vs 函数空间梯度下降**：
  - 在线性回归中，我们优化的是**参数** $\\mathbf{w}$：$\\mathbf{w}_{t+1} = \\mathbf{w}_t - \\eta \\nabla_{\\mathbf{w}} \\mathcal{L}$；
  - 在 GBDT 中，模型没有固定的参数列表，我们直接把整个函数在各个样本点上的输出预测值 $f(\\mathbf{x}_1), \\dots, f(\\mathbf{x}_n)$ 当作待优化的变量！
  - 想要让总损失下降最快，新加入的第 $m$ 棵树 $h_m(\\mathbf{x})$ 的预测值就必须**尽可能与损失函数关于前一轮预测输出的负梯度方向对齐**！因此，第 $m$ 棵树就是在**拟合当前全局强模型的负梯度**！

### 核心概念与符号对照表
| 核心概念 | 符号 / 公式 | 核心含义 |
| --- | --- | --- |
| **伪残差 (负梯度)** | $r_{im} = -\\left[ \\frac{\\partial L(y_i, f(\\mathbf{x}_i))}{\\partial f(\\mathbf{x}_i)} \\right]_{f = f_{m-1}}$ | 损失函数在当前预测值处的函数空间最速下降方向 |
| **平方损失负梯度** | $-\\frac{\\partial \\frac{1}{2}(y_i - f)^2}{\\partial f} = y_i - f$ | 在 MSE 损失下，伪残差刚好精确等于普通残差 |
| **逻辑损失负梯度** | $y_i - \\frac{1}{1 + e^{-f(\\mathbf{x}_i)}} = y_i - p_i$ | 二分类交叉熵下，负梯度等于真实标签与预测概率之差 |
| **学习率 (Shrinkage)** | $f_m(\\mathbf{x}) = f_{m-1}(\\mathbf{x}) + \\eta \\sum_j \\gamma_{jm} I(\\mathbf{x} \\in R_{jm})$ | $\\eta \\in (0, 1]$ 缩小每棵树的步长，迫使更多树参与协同 |

### 数学原理与逐步推导
#### 1. 损失函数关于函数输出的求导与负梯度
设训练样本 $(x_i, y_i)_{i=1}^n$。当前强模型为 $f_{m-1}(x)$。
我们希望找到新基学习器 $h_m(x)$，使得损失函数下降：
$$\\min_{h_m} \\sum_{i=1}^n L\\left( y_i, f_{m-1}(x_i) + h_m(x_i) \\right)$$
对损失函数在当前预测点 $f_{m-1}(x_i)$ 处进行一阶一元泰勒展开：
$$L(y_i, f_{m-1}(x_i) + h_m(x_i)) \\approx L(y_i, f_{m-1}(x_i)) + \\left[ \\frac{\\partial L(y_i, f(x_i))}{\\partial f(x_i)} \\right]_{f_{m-1}} \\cdot h_m(x_i)$$
为了使损失减少最快（一阶近似下降最多），根据柯西-施瓦茨不等式，$h_m(x_i)$ 的方向应当与梯度相反！
即令 $h_m(x_i)$ 去逼近**负梯度（Negative Gradient / 伪残差）**：
$$r_{im} = -\\left[ \\frac{\\partial L(y_i, f(x_i))}{\\partial f(x_i)} \\right]_{f(x_i) = f_{m-1}(x_i)}$$

#### 2. 二分类对数似然损失（Deviance）负梯度严格求导
设标签 $y_i \\in \\{0, 1\\}$，模型输出为对数几率（Logits）$f(x_i) = \\ln \\frac{p_i}{1 - p_i}$。
预测概率为 Sigmoid 映射：$p_i = \\sigma(f(x_i)) = \\frac{1}{1 + e^{-f(x_i)}}$。
二分类负对数似然损失为：
$$L(y_i, f(x_i)) = -y_i \\ln p_i - (1 - y_i) \\ln(1 - p_i)$$
$$= -y_i \\ln\\left(\\frac{1}{1 + e^{-f(x_i)}}\\right) - (1 - y_i) \\ln\\left(\\frac{e^{-f(x_i)}}{1 + e^{-f(x_i)}}\\right)$$
$$= -y_i \\ln(1) + y_i \\ln(1 + e^{-f(x_i)}) - (1 - y_i) \\left[ -f(x_i) - \\ln(1 + e^{-f(x_i)}) \\right]$$
$$= (1 - y_i) f(x_i) + \\ln(1 + e^{-f(x_i)})$$
对 $f(x_i)$ 求偏导：
$$\\frac{\\partial L}{\\partial f(x_i)} = (1 - y_i) + \\frac{-e^{-f(x_i)}}{1 + e^{-f(x_i)}} = (1 - y_i) - (1 - p_i) = p_i - y_i$$
取负号即得负梯度：
$$r_{im} = -\\frac{\\partial L}{\\partial f(x_i)} = y_i - p_i$$
**结论**：在二分类 GBDT 中，树模型在每一轮拟合的“伪残差”，其数学表达式就是**真实分类标签与当前 Sigmoid 预测概率之差**！

### 真实代码示例与分析
下面展示使用 `sklearn.ensemble.GradientBoostingRegressor` 拟合非线性三角函数的全过程，并观察随着树的数量增加残差逐步清零的过程："""

    l3_code = """import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_squared_error

# 1. 生成带有高斯噪声的正弦曲线
np.random.seed(42)
X = np.sort(np.random.uniform(-3, 3, size=(200, 1)), axis=0)
y = np.sin(X).ravel() + np.random.normal(0, 0.1, size=200)

# 2. 训练不同基树数量的 GBDT 模型 (learning_rate=0.1)
for n_est in [2, 10, 50, 150]:
    gbr = GradientBoostingRegressor(n_estimators=n_est, learning_rate=0.1, max_depth=3, random_state=42)
    gbr.fit(X, y)
    preds = gbr.predict(X)
    mse = mean_squared_error(y, preds)
    print(f"GBDT 树木数量: {n_est:3d} 棵 | 训练 MSE 均方误差: {mse:.5f}")
"""

    l3_tips = [
        tip("GBDT 的学习率（learning_rate / shrinkage）与迭代树木棵树（n_estimators）存在负相关联动关系：学习率调小（如 0.05 或 0.01），通常需要成倍增加树木数量才能收敛，但模型的测试集泛化稳定性会显著提高！", "performance"),
    ]

    # ── Lesson 4.4 ──
    l4_content = """### 学习目标
学完本节，你应该能够：
1. 掌握陈天奇提出的 **XGBoost（eXtreme Gradient Boosting）** 的二阶泰勒展开优化与显式树结构正则化；
2. 严格推导包含一阶梯度 $g_i$ 与二阶 Hessian 梯度 $h_i$ 的叶子节点最优权重闭式解 $w_j^* = -\\frac{\\sum g_i}{\\sum h_i + \\lambda}$ 与增益评分公式；
3. 掌握 XGBoost 的稀疏感知（Sparsity-aware Split Finding）与缺失值默认分裂方向自适应学习；
4. 掌握微软 **LightGBM** 的两大核心突破：**GOSS（基于梯度的单边采样）** 与 **EFB（互斥特征捆绑）**；
5. 掌握 LightGBM 的 Leaf-wise（按叶生长）带深度限制策略与直方图特征分箱（Histogram-based Algorithm）的内存与速度飞跃。

### 前置知识
- 多元函数的二阶泰勒级数展开；
- 贪心搜索与树的分裂增益评估。

### 问题背景与 ML 用途
传统 GBDT 存在三个制约大规模工业落地的痛点：
1. **只使用一阶导数**：优化步长需要额外的精确线搜索（Line Search），收敛速度慢；
2. **缺乏显式树复杂度正则化**：容易陷入局部过拟合；
3. **计算吞吐量受限**：每分裂一个节点都需要在全部样本上对连续特征做耗时的全排序（Exact Greedy），面对千万级行、上千特征的工业广告推荐场景计算成本高昂。
**XGBoost 与 LightGBM 的相继诞生彻底引爆了工业界提升树的生产力**：
- XGBoost 通过二阶泰勒展开将任意二次可微目标统一求解，引入二阶导数精确加权；
- LightGBM 则通过直方图分箱将特征排序复杂度降到 $O(K)$（常数级分箱数 $K \\le 255$），并通过 GOSS 过滤掉海量梯度极小的无用样本，训练速度较传统 GBDT 提升了数十倍至上百倍！

### 核心概念与符号对照表
| 核心概念 | 算法 / 符号 | 数学与技术原理 | 核心优势 |
| --- | --- | --- | --- |
| **二阶展开** | $g_i = \\partial_{\\hat{y}} L, h_i = \\partial^2_{\\hat{y}} L$ | 目标函数近似展开到二阶 Hessian 项 | 支持任意自定义二阶可微损失函数 |
| **树正则项** | $\\Omega(f) = \\gamma T + \\frac{1}{2} \\lambda \\sum w_j^2$ | 控制叶子节点总数 $T$ 与叶权重 L2 范数 | 强力遏制树的局部过拟合 |
| **分裂增益 Gain** | $\\frac{1}{2}\\left[\\frac{G_L^2}{H_L+\\lambda} + \\frac{G_R^2}{H_R+\\lambda} - \\frac{(G_L+G_R)^2}{H_L+H_R+\\lambda}\\right] - \\gamma$ | 分裂前后二阶目标改善净收益 | 只有增益超过 $\\gamma$ 才允许分裂 |
| **GOSS** | LightGBM 单边采样 | 保留梯度前 $a\\%$ 样本，对剩余小梯度样本随机抽样 $b\\%$ 并放大权重 | 在保精度的同时缩减巨量计算开销 |
| **EFB** | LightGBM 互斥捆绑 | 将彼此很少同时非零的稀疏特征无损捆绑为一个特征 | 极致压缩高维稀疏特征维度 |

### 数学原理与逐步推导
#### 1. XGBoost 目标函数的二阶泰勒展开推导
在第 $t$ 轮，优化目标为：
$$\\text{Obj}^{(t)} = \\sum_{i=1}^n L\\left(y_i, \\hat{y}_i^{(t-1)} + f_t(\\mathbf{x}_i)\\right) + \\Omega(f_t)$$
对损失函数在 $\\hat{y}_i^{(t-1)}$ 处做二阶泰勒展开：
$$L(y, \\hat{y} + \\Delta) \\approx L(y, \\hat{y}) + g_i \\Delta + \\frac{1}{2} h_i \\Delta^2$$
其中一阶导数 $g_i = \\left[ \\frac{\\partial L(y_i, \\hat{y})}{\\partial \\hat{y}} \\right]_{\\hat{y}^{(t-1)}}$，二阶导数 $h_i = \\left[ \\frac{\\partial^2 L(y_i, \\hat{y})}{\\partial \\hat{y}^2} \\right]_{\\hat{y}^{(t-1)}}$。
移除常数项 $L(y_i, \\hat{y}_i^{(t-1)})$，得到极小化目标：
$$\\widetilde{\\text{Obj}}^{(t)} = \\sum_{i=1}^n \\left[ g_i f_t(\\mathbf{x}_i) + \\frac{1}{2} h_i f_t(\\mathbf{x}_i)^2 \\right] + \\gamma T + \\frac{1}{2} \\lambda \\sum_{j=1}^T w_j^2$$
设每个叶子节点 $j$ 包含的样本索引集合为 $I_j = \\{i \\mid q(\\mathbf{x}_i) = j\\}$，树的输出即为叶节点的权重 $w_j$。
将样本按叶节点聚合重组：
$$\\widetilde{\\text{Obj}}^{(t)} = \\sum_{j=1}^T \\left[ \\left(\\sum_{i \\in I_j} g_i\\right) w_j + \\frac{1}{2} \\left(\\sum_{i \\in I_j} h_i + \\lambda\\right) w_j^2 \\right] + \\gamma T$$
定义叶子节点的一阶梯度和 $G_j = \\sum_{i \\in I_j} g_i$，二阶梯度和 $H_j = \\sum_{i \\in I_j} h_i$：
$$\\widetilde{\\text{Obj}}^{(t)} = \\sum_{j=1}^T \\left[ G_j w_j + \\frac{1}{2}(H_j + \\lambda) w_j^2 \\right] + \\gamma T$$

#### 2. 叶节点最优权重 $w_j^*$ 与最佳增益闭式解
上式中每个叶节点 $w_j$ 都是一个独立的单变量一元二次方程！
对 $w_j$ 求偏导并令其为 0：
$$G_j + (H_j + \\lambda) w_j = 0 \\implies w_j^* = -\\frac{G_j}{H_j + \\lambda}$$
将最优权重代回目标函数，得到该树结构所能达到的最小目标评分（Score）：
$$\\widetilde{\\text{Obj}}^*(q) = -\\frac{1}{2} \\sum_{j=1}^T \\frac{G_j^2}{H_j + \\lambda} + \\gamma T$$
分裂增益（Gain）即为：分裂为左右两个叶子后的目标收益减去不分裂的单叶目标收益，再减去新增一个叶节点的惩罚代价 $\\gamma$：
$$\\text{Gain} = \\frac{1}{2} \\left[ \\frac{G_L^2}{H_L + \\lambda} + \\frac{G_R^2}{H_R + \\lambda} - \\frac{(G_L + G_R)^2}{H_L + H_R + \\lambda} \\right] - \\gamma$$
只要 $\\text{Gain} > 0$，这次切分就在理论上带来了客观的全局损失降低！

### 真实代码示例与分析
下面展示如何使用 Scikit-learn 的 `HistGradientBoostingClassifier`（基于 LightGBM 直方图分箱算法的原生实现），在大规模样本上体验高速直方图分箱训练："""

    l4_code = """import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier, GradientBoostingClassifier
from sklearn.datasets import make_classification
import time

# 1. 构造一个包含 5,000 个样本、30 个特征的数据集
X, y = make_classification(n_samples=5000, n_features=30, random_state=42)

# 2. 传统精确排序 GBDT 训练计时 (仅取 30 棵树)
t0 = time.time()
gbdt = GradientBoostingClassifier(n_estimators=30, random_state=42)
gbdt.fit(X, y)
t_gbdt = time.time() - t0

# 3. 现代化直方图分箱提升树 (HistGBDT, LightGBM 核心同款直方图技术)
t0 = time.time()
hist_gbdt = HistGradientBoostingClassifier(max_iter=30, random_state=42)
hist_gbdt.fit(X, y)
t_hist = time.time() - t0

print(f"传统排序 GBDT 训练耗时: {t_gbdt:.3f} 秒 | 训练集准确率: {gbdt.score(X, y):.4f}")
print(f"直方图 Hist-GBDT 训练耗时: {t_hist:.3f} 秒 | 训练集准确率: {hist_gbdt.score(X, y):.4f}")
print(f"速度飞跃倍数: {t_gbdt / max(t_hist, 1e-6):.1f}x 倍加速！直方图分箱威力显著！")
"""

    l4_tips = [
        tip("LightGBM 默认采用 Leaf-wise（按叶生长）而非传统 XGBoost 的 Level-wise（按层生长）。Leaf-wise 能够更快地降低损失，但在数据较小且没有限制 max_depth 时极容易发生深层枝叶的过拟合，生产中必须同时限制 num_leaves 和 min_child_samples。", "pitfall"),
    ]

    lessons = [
        lesson("ml-algo-l4-1", "集成学习哲学与随机森林（Random Forest）", l1_content, 2, l1_tips, [demo(code=l1_code, title="随机森林训练与 OOB 评估")]),
        lesson("ml-algo-l4-2", "自适应提升 AdaBoost：指数损失与样本权重自适应", l2_content, 3, l2_tips, [demo(code=l2_code, title="AdaBoost 树桩训练与权重更新")]),
        lesson("ml-algo-l4-3", "梯度提升决策树 GBDT：伪残差与函数空间负梯度", l3_content, 3, l3_tips, [demo(code=l3_code, title="GBDT 拟合非线性函数与负梯度逼近")]),
        lesson("ml-algo-l4-4", "工业级提升树王者：XGBoost 与 LightGBM 核心突破", l4_content, 3, l4_tips, [demo(code=l4_code, title="直方图分箱提升树极速训练对比")]),
    ]

    exercises = [
        single_choice(
            ex_id="ml-algo-c4-ex1",
            question="在 AdaBoost 算法中，若一个样本在当前第 $t$ 轮弱学习器的预测中被错误分类，其在下一轮第 $t+1$ 轮训练中的权重 $w_{t+1, i}$ 将会如何变化？",
            options=[
                {"value": "A", "text": "权重被乘以 $\\exp(\\alpha_t) > 1$ 并被相对放大，成为后续分类器重点攻克的难题"},
                {"value": "B", "text": "权重被除以 $\\exp(\\alpha_t)$ 进而衰减，防止异常值干扰"},
                {"value": "C", "text": "权重重置为 $1/N$ 的均等初始值"},
                {"value": "D", "text": "样本被直接剔除出训练集"},
            ],
            answer="A",
            explanation="AdaBoost 的核心思想在于错题强化。由公式 w_{t+1, i} \\propto w_{t, i} \\exp(-\\alpha_t y_i h_t(x_i))，当分类错误时 y_i h_t = -1，指数项变为 \\exp(\\alpha_t)。因为基分类器优于随机猜测时 \\alpha_t > 0，故该错题样本的权重被显著放大。",
            difficulty=2,
            related_lesson_id="ml-algo-l4-2",
            tags=["AdaBoost", "样本权重", "提升法"],
        ),
        judge(
            ex_id="ml-algo-c4-ex2",
            question="在随机森林（Random Forest）中，只要计算资源允许，将基决策树数量（n_estimators）从 100 棵增加到 10,000 棵，模型必然会因为模型容量过大而发生严重的过拟合。",
            answer=False,
            explanation="错误。随机森林基于 Bagging 思想，各决策树相互独立训练并取均值。根据大数定律，随机森林的泛化误差随着基树数量 T 趋于无穷大时会收敛到一个理论极限下限，绝不会因为单调增加树木数量而引发过拟合（过拟合主要由单棵树深度过深或特征相关性引起）。",
            difficulty=2,
            related_lesson_id="ml-algo-l4-1",
            tags=["随机森林", "泛化误差", "过拟合"],
        ),
        multiple_choice(
            ex_id="ml-algo-c4-ex3",
            question="相较于 Friedman 的传统 GBDT，陈天奇提出的 XGBoost 在数学优化和工程设计上做出了哪些重大革新？",
            options=[
                {"value": "A", "text": "对损失函数进行了二阶泰勒级数展开，同时利用了一阶梯度（g_i）与二阶 Hessian 梯度（h_i）"},
                {"value": "B", "text": "在目标函数中显式加入了正则化项（叶子节点数惩罚 gamma 与叶权重 L2 范数惩罚 lambda）"},
                {"value": "C", "text": "支持稀疏感知与缺失值默认分裂方向自适应学习"},
                {"value": "D", "text": "完全抛弃了决策树，改用深度卷积神经网络作为弱学习器"},
            ],
            answer=["A", "B", "C"],
            explanation="XGBoost 的核心突破包括二阶泰勒展开、目标函数显式正则化项、稀疏缺失值自动路径学习以及近似分位数候选切分。XGBoost 依然以决策树（CART）作为核心弱学习器，选项 D 纯属捏造。",
            difficulty=2,
            related_lesson_id="ml-algo-l4-4",
            tags=["XGBoost", "二阶泰勒展开", "正则化", "提升树"],
        ),
        fill(
            ex_id="ml-algo-c4-ex4",
            question="在样本量 $N$ 足够大时，使用 Bootstrap 自助重采样从 $N$ 个样本中有放回抽取 $N$ 次，某个特定样本在整个采样过程中从未被抽中的极限理论概率约为 ___%（请填写四舍五入保留一位小数的百分比数字，如 36.8）。",
            blanks=[["36.8", "36.8%"]],
            explanation="极限公式为 lim_{N -> inf} (1 - 1/N)^N = 1/e \\approx 0.367879，即约 36.8% 的样本不会进入训练集，构成了天然的袋外数据（OOB）。",
            difficulty=2,
            related_lesson_id="ml-algo-l4-1",
            tags=["Bootstrap", "袋外数据", "OOB", "极限概率"],
        ),
        open_ex(
            ex_id="ml-algo-c4-ex5",
            question="请详细阐述 GBDT（梯度提升决策树）中“负梯度（伪残差）”与传统线性回归“残差”的联系与区别，并解释为什么 GBDT 可以通过拟合负梯度来优化任意二次可微的非线性损失函数。",
            reference_answer="1. 联系与区别：\n- 在平方误差损失（MSE）下，L(y, f) = 1/2 (y - f)^2，其关于函数输出 f 的负梯度为 -∂L/∂f = y - f，刚好精确等于真实值减去预测值的传统残差。因此传统残差只是负梯度的平方损失特例；\n- 但在其他损失（如绝对值误差 MAE、二分类交叉熵 Logistic Loss）下，真实标签与预测值的差值并不等于梯度方向。伪残差则是损失函数在当前强模型输出处的真实函数空间最速下降方向（负梯度 -∂L/∂f）。\n2. 为什么能优化任意二次可微损失：\n- GBDT 将模型的预测输出直接视为待优化的变量空间（函数空间）。根据一阶泰勒展开，要使下一轮复合模型的总损失下降最快，新加入的基树输出值必须在各个样本点上尽可能与负梯度方向对齐。\n- 因此，GBDT 将复杂非线性损失的优化问题，转化为让一棵普通的回归树去拟合当前负梯度数值的标量回归问题，从而实现了在不改动树分裂算法的前提下，通用于任意可微损失函数的优化目标。",
            explanation="对比平方误差残差与通用负梯度，揭示在函数空间中使用回归树拟合负梯度的数学本质。",
            rubric=[
                {"points": 5, "description": "阐明平方损失下负梯度与传统残差的一致性，以及在非 MSE 损失下传统残差与负梯度的本质脱节"},
                {"points": 5, "description": "从函数空间最速下降（一阶泰勒展开方向对齐）角度解释为什么拟合负梯度可以最小化任意可微损失"},
            ],
            difficulty=3,
            related_lesson_id="ml-algo-l4-3",
            tags=["GBDT", "负梯度", "伪残差", "函数空间梯度下降"],
        ),
        # ── Code Exercise 4 ──
        {
            "id": "ml-algo-c4-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】实现 AdaBoost 样本权重更新与分类器系数计算单步函数：\n编写函数 `adaboost_step(weights, preds, y)`：\n1. `weights`：当前各样本的归一化权重一维数组或列表（长度 $N$）；\n2. `preds`：当前弱分类器的二分类预测结果一维数组或列表（值为 -1 或 +1）；\n3. `y`：样本真实标签一维数组或列表（值为 -1 或 +1）；\n计算：\n- 加权误差率 $\\epsilon = \\sum_{i: \\text{preds}_i \\ne y_i} w_i$；\n- 分类器系数 $\\alpha = \\frac{1}{2} \\ln\\left( \\frac{1 - \\epsilon}{\\max(\\epsilon, 10^{-10})} \\right)$；\n- 更新后归一化的新样本权重数组 $w_{new} = \\frac{w_i \\exp(-\\alpha y_i \\text{preds}_i)}{Z}$，使得 $\\sum w_{new} = 1.0$。\n\n函数返回元组 `(round(float(epsilon), 4), round(float(alpha), 4), list_of_new_weights)`，其中新权重保留 4 位小数返回 Python 浮点数列表。\n\n最后一行请以 `w0 = [0.25, 0.25, 0.25, 0.25]`, `p0 = [1, 1, 1, -1]`, `y0 = [1, 1, -1, -1]` 调用该函数测试。",
            "starterCode": "import numpy as np\nfrom typing import Tuple, List\n\ndef adaboost_step(weights, preds, y) -> Tuple[float, float, List[float]]:\n    \"\"\"计算 AdaBoost 单步加权误差率、分类器系数 alpha 与更新后的归一化样本权重\"\"\"\n    # 请在此实现\n    ___\n\nw0 = [0.25, 0.25, 0.25, 0.25]\np0 = [1, 1, 1, -1]\ny0 = [1, 1, -1, -1]\nadaboost_step(w0, p0, y0)\n",
            "setupCode": "",
            "expectedOutput": "(0.25, 0.5493, [0.1667, 0.1667, 0.5, 0.1667])",
            "answer": "import numpy as np\nfrom typing import Tuple, List\n\ndef adaboost_step(weights, preds, y) -> Tuple[float, float, List[float]]:\n    weights = np.array(weights, dtype=float)\n    preds = np.array(preds, dtype=int)\n    y = np.array(y, dtype=int)\n    \n    incorrect = (preds != y)\n    epsilon = float(np.sum(weights[incorrect]))\n    \n    eps_safe = max(epsilon, 1e-10)\n    if eps_safe >= 1.0:\n        alpha = 0.0\n    else:\n        alpha = float(0.5 * np.log((1.0 - eps_safe) / eps_safe))\n        \n    new_w = weights * np.exp(-alpha * y * preds)\n    new_w = new_w / np.sum(new_w)\n    new_w_list = [round(float(val), 4) for val in new_w]\n    \n    return round(epsilon, 4), round(alpha, 4), new_w_list\n\nw0 = [0.25, 0.25, 0.25, 0.25]\np0 = [1, 1, 1, -1]\ny0 = [1, 1, -1, -1]\nadaboost_step(w0, p0, y0)\n",
            "tests": "w_t = [0.5, 0.5]\np_t = [1, 1]\ny_t = [1, -1]\neps_t, alp_t, nw_t = adaboost_step(w_t, p_t, y_t)\nassert eps_t == 0.5 and alp_t == 0.0 and nw_t == [0.5, 0.5], f\"测试未通过: {eps_t}, {alp_t}, {nw_t}\"\n",
            "explanation": "加权累加错分样本得到 epsilon，代入对数比值计算 alpha，通过向量化指数乘法更新样本权重并做归一化除法。",
            "tags": ["AdaBoost", "样本权重", "分类器系数", "算法实战"],
            "related_lesson_id": "ml-algo-l4-2",
        },
        single_choice(
            ex_id="ml-algo-c4-ex7",
            question="LightGBM 的 GOSS（基于梯度的单边采样）算法在缩减训练样本量时，是如何平衡计算速度与梯度的统计无偏性的？",
            options=[
                {"value": "A", "text": "仅保留一阶梯度最小的样本，完全抛弃大梯度样本"},
                {"value": "B", "text": "保留所有梯度绝对值排名前 $a\\%$ 的大梯度样本，并对剩余的小梯度样本随机抽样 $b\\%$，同时将这部分小样本的梯度乘以补偿系数 $\\frac{1-a}{b}$"},
                {"value": "C", "text": "使用主成分分析（PCA）将所有样本投影至一维"},
                {"value": "D", "text": "对所有样本的梯度进行 Min-Max 归一化处理"},
            ],
            answer="B",
            explanation="GOSS 认识到梯度大的样本对信息增益贡献最大。因此 GOSS 完整保留头部大梯度样本（前 a%），并在尾部小梯度样本中随机抽取比例 b%，同时为这部分被抽中小样本乘以 (1-a)/b 的放大补偿权重，从数学上严格保证了样本分布梯度的无偏估计。",
            difficulty=2,
            related_lesson_id="ml-algo-l4-4",
            tags=["LightGBM", "GOSS", "梯度单边采样"],
        ),
        single_choice(
            ex_id="ml-algo-c4-ex8",
            question="在二分类场景下，当正负样本极度不平衡时（例如正样本仅占 1%），若直接训练 LightGBM 或 XGBoost，最推荐优先调节下列哪项原生超参数来惩罚正样本的漏判？",
            options=[
                {"value": "A", "text": "`learning_rate`"},
                {"value": "B", "text": "`scale_pos_weight`（设置约为 99，即负样本数/正样本数）"},
                {"value": "C", "text": "`colsample_bytree`"},
                {"value": "D", "text": "`max_depth`"},
            ],
            answer="B",
            explanation="scale_pos_weight 是提升树算法专为样本极度不平衡设计的正样本梯度放大权重。通常将其设为负样本总数与正样本总数的比值，直接在二阶展开目标函数中成倍放大正样本的一阶与二阶梯度，显著提升稀有类的召回率。",
            difficulty=2,
            related_lesson_id="ml-algo-l4-4",
            tags=["XGBoost", "LightGBM", "样本不平衡", "scale_pos_weight"],
        ),
    ]

    return chapter(
        chapter_id="ml-algo-c4",
        course_id="ml-classical-algorithms",
        order=4,
        title="集成学习：Bagging、Boosting 与梯度提升家族",
        goal="掌握随机森林双重随机性与 OOB 评估，掌握 AdaBoost 指数损失推导，精通 GBDT 负梯度及 XGBoost / LightGBM 工业突破。",
        lessons=lessons,
        exercises=exercises,
    )
