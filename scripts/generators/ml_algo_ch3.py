# -*- coding: utf-8 -*-
"""
Chapter 3: 决策树与支持向量机 (Decision Trees & Support Vector Machines)
Course: ml-classical-algorithms
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_3():
    # ── Lesson 3.1 ──
    l1_content = """### 学习目标
学完本节，你应该能够：
1. 深刻理解决策树的递归贪心划分哲学（Recursive Greedy Splitting）；
2. 掌握信息熵（Shannon Entropy）、信息增益（ID3）与信息增益比（C4.5）的数学定义与推导；
3. 掌握 CART（Classification and Regression Trees）中的基尼不纯度（Gini Impurity）与连续值均方误差（MSE）方差缩减准则；
4. 熟练掌握对抗树模型过拟合的关键技术：预剪枝（Pre-pruning）与基于代价复杂度后剪枝（Cost-Complexity Pruning, CCP）；
5. 编写代码实现连续特征的最佳二分切分搜索与基尼不纯度计算，分析决策树提取的特征重要性（Feature Importance）。

### 前置知识
- 概率质量函数与期望值；
- 信息论基础（信息量与熵）。

### 问题背景与 ML 用途
如果说线性模型追求的是全局超平面的平滑划分，那么**决策树（Decision Tree）则是模拟人类“若……则……”（If-Else）规则判断的非参数模型**：
- **可解释性极高**：决策树的每一步分裂都可直接转化为人类完全可读的业务规则，在医疗诊断、信贷风控准入、合规审计中具有无可替代的白盒透明度；
- **集成学习的原子基石**：当今在表格数据（Tabular Data）上统治业界的强大模型——随机森林（Random Forest）、GBDT、XGBoost、LightGBM 与 CatBoost，其底层最基础的弱学习器（Weak Learner）全都是决策树！
理解单棵决策树的分裂机制与剪枝逻辑，是征服现代集成提升树算法的绝对前提。

### 直觉理解
- **20 个问题的猜谜游戏**：想象你在玩一个“20 个是非问题猜动物”的游戏。面对全世界上千种动物，你的第一个问题绝对不会问“它是不是小红帽故事里的那只大灰狼？”（因为这只能排除 1 种动物，信息量太低）；相反，你会问“它是哺乳动物吗？”——这个问题一下把候选集均匀砍成两半！决策树的分裂核心就是**在每一步寻找一个最能将不确定性降低（纯度提升最大）的特征与阈值**。
- **正交阶梯超平面**：与线性回归平滑倾斜的斜线不同，决策树在多维特征空间中切出的决策边界永远是**与坐标轴平行的正交阶梯状超平面网格**。

### 核心概念与符号对照表
| 核心概念 | 符号 / 公式 | 数学定义与物理意义 | 在决策树中的作用 |
| --- | --- | --- | --- |
| **香农熵** | $H(D) = -\\sum_{k=1}^K p_k \\log_2 p_k$ | 样本集类别分布的平均不确定性 | 衡量节点混合混乱度 |
| **信息增益** | $\\text{Gain}(D, A) = H(D) - \\sum_{v} \\frac{|D^v|}{|D|} H(D^v)$ | 划分后不确定性的绝对降低量 | ID3 算法的分裂标准 |
| **信息增益比** | $\\text{GainRatio}(D, A) = \\frac{\\text{Gain}(D, A)}{\\text{IV}(A)}$ | 增益除以特征固有熵（惩罚多取值特征） | C4.5 算法的分裂标准 |
| **基尼不纯度** | $\\text{Gini}(D) = 1 - \\sum_{k=1}^K p_k^2$ | 从集合中随机抽取两个样本类别不一致的概率 | CART 分类树的分裂标准 |
| **方差缩减** | $\\Delta \\sigma^2 = \\text{Var}(D) - \\sum_{v} \\frac{|D^v|}{|D|} \\text{Var}(D^v)$ | 标签连续值的方差下降量 | CART 回归树的分裂标准 |

### 数学原理与逐步推导
#### 1. 信息熵、条件熵与信息增益推导
设样本集 $D$ 包含 $K$ 个类别，第 $k$ 类的样本比例为 $p_k = \\frac{|C_k|}{|D|}$。
香农熵定义为：
$$H(D) = -\\sum_{k=1}^K p_k \\log_2 p_k$$
若按离散特征 $A$ 的 $V$ 个可能取值 $\{a^1, a^2, \\dots, a^V\}$ 将集合 $D$ 划分为 $V$ 个子集 $\{D^1, D^2, \\dots, D^V\}$，则给定特征 $A$ 条件下的**条件熵（Conditional Entropy）**为各子集熵的加权平均：
$$H(D \\mid A) = \\sum_{v=1}^V \\frac{|D^v|}{|D|} H(D^v)$$
**信息增益（Information Gain, ID3）**为划分前后的熵之差：
$$\\text{Gain}(D, A) = H(D) - H(D \\mid A)$$

#### 2. ID3 的致命缺陷与 C4.5 的固有值（Intrinsic Value）惩罚
ID3 算法有一个严重的缺陷：**它极其偏向于取值数量极多的特征**。
例如：如果把“身份证号”或“用户唯一 ID”作为一个特征，每个分支只包含 1 个样本，$H(D^v) = 0$，条件熵 $H(D \\mid A) = 0$，信息增益达到理论极大值！但这会导致模型产生完全没有泛化能力的过拟合。
为了解决这一偏置，Quinlan 在 C4.5 算法中引入了特征自身属性的**固有熵（Intrinsic Value, IV）**作为惩罚分母：
$$\\text{IV}(A) = -\\sum_{v=1}^V \\frac{|D^v|}{|D|} \\log_2 \\frac{|D^v|}{|D|}$$
**信息增益比（Gain Ratio, C4.5）**定义为：
$$\\text{GainRatio}(D, A) = \\frac{\\text{Gain}(D, A)}{\\text{IV}(A)}$$
当特征取值分支越多、越细碎时，$\\text{IV}(A)$ 越大，从而严厉抑制了特征虚高的信息增益。

#### 3. CART 的基尼不纯度（Gini Impurity）
CART（Breiman 等人提出）采用**二叉树（Binary Tree）**结构，其分类分裂标准采用**基尼不纯度**。
样本随机抽取两个个体，其类别不同的概率为：
$$\\text{Gini}(D) = \\sum_{k=1}^K p_k (1 - p_k) = 1 - \\sum_{k=1}^K p_k^2$$
- 当集合完全纯净（所有样本属于同一类）时，$p_1 = 1$，$\\text{Gini}(D) = 0$（纯度最高）；
- 当集合类别完全均匀分布时，$p_k = 1/K$，$\\text{Gini}(D) = 1 - 1/K$（纯度最低）。
基尼指数在避免对数计算（提高运算效率）的同时，提供了一阶泰勒近似香农熵的高保真度：$-\\ln p_k \\approx 1 - p_k$。

### 几何直觉与图解
决策树的本质是**递归超平面正交轴对齐切割**：
```
特征 X2
  ^
  |  [区域 R1: 类别 0]  |     [区域 R2: 类别 1]
  |                     |  X1 <= 4.5 且 X2 > 3.0
  |---------------------+------------------------  <-- 切割线 2 (X2 = 3.0)
  |                     |
  |  [区域 R3: 类别 0]  |     [区域 R4: 类别 1]
  |  X1 <= 2.0          |  X1 > 2.0 且 X2 <= 3.0
  +---------------------+-------------------------> 特征 X1
                        ^
                    切割线 1 (X1 = 2.0)
```
每次划分都是在当前子空间中引入一个平直的轴平行超平面，将空间一分为二。

### 真实代码示例与分析
下面展示如何通过 Python 计算基尼系数，并使用 `sklearn.tree.DecisionTreeClassifier` 观察特征分裂与特征重要性："""

    l1_code = """import numpy as np
from sklearn.tree import DecisionTreeClassifier, export_text
from sklearn.datasets import load_iris

def compute_gini(labels: np.ndarray) -> float:
    \"\"\"计算给定标签列表的基尼不纯度 (Gini Impurity)\"\"\"
    if len(labels) == 0:
        return 0.0
    _, counts = np.unique(labels, return_counts=True)
    probs = counts / len(labels)
    return float(1.0 - np.sum(probs ** 2))

# 1. 验证基尼指数直觉
pure_set = np.array([0, 0, 0, 0])
mixed_set = np.array([0, 0, 1, 1])
print(f"纯净集合 Gini: {compute_gini(pure_set):.4f} (期望 0.0)")
print(f"混合集合 Gini: {compute_gini(mixed_set):.4f} (期望 0.5)")

# 2. 训练一棵限定深度的 CART 决策树
iris = load_iris()
X, y = iris.data, iris.target
clf = DecisionTreeClassifier(max_depth=3, criterion='gini', random_state=42)
clf.fit(X, y)

print("\\n--- 决策树结构 (前 3 层) ---")
tree_rules = export_text(clf, feature_names=list(iris.feature_names))
print(tree_rules[:300] + "...")

print("\\n--- 特征重要性 (MDI: Mean Decrease in Impurity) ---")
for name, imp in zip(iris.feature_names, clf.feature_importances_):
    print(f"特征 [{name}]: 重要性 = {imp:.4f}")
"""

    l1_tips = [
        tip("决策树对连续特征的单调变换（如对数变换、标准化）完全免疫！因为分裂只取决于数值的大小排序，无需对特征做任何预先缩放。", "performance"),
        tip("未剪枝的深度决策树必然在训练集上达到 100% 准确率（每个叶子只有一个样本），但这会导致极端的高方差与过拟合。在生产中必须严格设置 max_depth、min_samples_leaf 或启用 ccp_alpha 剪枝。", "pitfall"),
    ]

    # ── Lesson 3.2 ──
    l2_content = """### 学习目标
学完本节，你应该能够：
1. 掌握线性可分支持向量机（Linear SVM）的最大几何间隔（Maximum Margin）思想；
2. 严密区分函数间隔（Functional Margin）与几何间隔（Geometric Margin）的尺度不变性；
3. 构建硬间隔二次规划（QP）原始问题，推导拉格朗日对偶问题（Lagrange Dual Problem）；
4. 理解 KKT 互补松弛条件（Complementary Slackness），洞察为什么**只有支持向量才对决策超平面产生影响**；
5. 掌握软间隔（Soft Margin）与松弛变量 $\\xi_i$、惩罚参数 $C$ 的作用，建立软间隔 SVM 与合页损失（Hinge Loss）的等价数学映射。

### 前置知识
- 空间点到超平面的几何距离公式；
- 凸优化拉格朗日乘子法与对偶性。

### 问题背景与 ML 用途
回顾感知机（Perceptron）与逻辑回归（Logistic Regression）：
- 感知机只要找到一条能把正负样本完全分开的直线就会停机。但若样本线性可分，存在无穷多条合法分割超平面！如果选中的分界线贴近某个正样本，只要未来测试集出现一点点噪声扰动就会分类错误；
- **支持向量机（SVM）给出了绝对最优解**：在所有能够把数据分开的超平面中，寻找一条**距离两类样本“最安全、最宽广”的超平面**——即最大化分类间隔！
- SVM 建立在统计学习理论（VC 维理论与结构风险最小化）之上，在小样本、高维特征（如生物信息基因芯片、文本分类）上展现出极度坚挺的泛化抗噪能力。

### 直觉理解
- **公路中央隔离带的最宽安全距离**：想象正负两类样本是公路两侧的悬崖峭壁。感知机就像一个只要不掉下悬崖就随心所欲开车的新手，车身可能贴着左边悬崖飞驰。而 SVM 则是最稳健的道路规划总工程师：它测量两边悬崖最近处的宽度，并在正中间画出一条中心线，同时让两侧的安全缓冲隔离带（Margin）宽度达到**极限最大化**！
- **真正起决定作用的只是少数“钉子户”（支持向量）**：在这条宽阔的公路隔离带两边，刚好碰触到安全边界的几个极其关键的样本点，就是“支持向量”。其他远在公路几公里之外的村庄点，就算全部拆迁或者来回移动，中央隔离带的位置和朝向**纹丝不动**！

### 核心概念与符号对照表
| 核心概念 | 符号 / 表达式 | 数学定义与物理意义 | 在 SVM 中的角色 |
| --- | --- | --- | --- |
| **超平面方程** | $\\mathbf{w}^T \\mathbf{x} + b = 0$ | 法向量 $\\mathbf{w}$ 决定超平面方向，截距 $b$ 决定平移 | 分类决策边界 |
| **几何间隔** | $\\gamma = \\min_i \\frac{y_i (\\mathbf{w}^T \\mathbf{x}_i + b)}{\\|\\mathbf{w}\\|}$ | 样本点到超平面的带符号欧氏垂直距离 | 结构风险安全裕度 |
| **对偶变量** | $\\alpha_i \\ge 0$ | 每个样本点对应的不等式约束拉格朗日乘子 | $\\alpha_i > 0$ 的样本即为支持向量 |
| **软间隔惩罚系数** | $C > 0$ | 平衡“最大化间隔”（正则化项）与“减少松弛误差”（损失项） | 控制过拟合与欠拟合的杠杆 |
| **合页损失** | $L_{\\text{hinge}}(z) = \\max(0, 1 - z)$ | 预测正确且裕度大于 1 时损失为 0，否则线性惩罚 | 软间隔 SVM 的等价凸损失函数 |

### 数学原理与逐步推导
#### 1. 硬间隔优化问题的建立
样本点 $(\\mathbf{x}_i, y_i)$，其中 $y_i \\in \\{-1, +1\\}$。
点到超平面的垂直几何距离为 $\\frac{y_i(\\mathbf{w}^T \\mathbf{x}_i + b)}{\\|\\mathbf{w}\\|}$。
为了最大化最小几何间隔，同时利用函数间隔的尺度缩放自由度，固定支持向量处的函数间隔为 1：
$$y_i (\\mathbf{w}^T \\mathbf{x}_i + b) \\ge 1, \\quad \\forall i=1, \\dots, n$$
此时两类支持向量之间的几何间隔带宽为 $\\frac{2}{\\|\\mathbf{w}\\|}$。
最大化 $\\frac{2}{\\|\\mathbf{w}\\|}$ 等价于最小化 $\\frac{1}{2}\\|\\mathbf{w}\\|^2$。得到**硬间隔 SVM 原始凸优化问题（Primal Problem）**：
$$\\min_{\\mathbf{w}, b} \\frac{1}{2} \\|\\mathbf{w}\\|^2 \\quad \\text{s.t.} \\quad y_i (\\mathbf{w}^T \\mathbf{x}_i + b) \\ge 1, \\quad i=1, \\dots, n$$

#### 2. 拉格朗日对偶（Lagrange Duality）与对偶问题推导
引入拉格朗日乘子 $\\alpha_i \\ge 0$，构造广义拉格朗日函数：
$$L(\\mathbf{w}, b, \\boldsymbol{\\alpha}) = \\frac{1}{2} \\|\\mathbf{w}\\|^2 - \\sum_{i=1}^n \\alpha_i [y_i (\\mathbf{w}^T \\mathbf{x}_i + b) - 1]$$
根据 Slater 条件，强对偶性（Strong Duality）成立，原始问题的极小极大等价于对偶问题的极大极小。
分别对 $\\mathbf{w}$ 和 $b$ 求偏导并令其为 0：
$$\\nabla_{\\mathbf{w}} L = \\mathbf{w} - \\sum_{i=1}^n \\alpha_i y_i \\mathbf{x}_i = 0 \\implies \\mathbf{w} = \\sum_{i=1}^n \\alpha_i y_i \\mathbf{x}_i$$
$$\\frac{\\partial L}{\\partial b} = -\\sum_{i=1}^n \\alpha_i y_i = 0 \\implies \\sum_{i=1}^n \\alpha_i y_i = 0$$
将上述两式代回 $L(\\mathbf{w}, b, \\boldsymbol{\\alpha})$，化简得到**SVM 对偶优化问题（Dual Problem）**：
$$\\max_{\\boldsymbol{\\alpha}} \\sum_{i=1}^n \\alpha_i - \\frac{1}{2} \\sum_{i=1}^n \\sum_{j=1}^n \\alpha_i \\alpha_j y_i y_j (\\mathbf{x}_i^T \\mathbf{x}_j)$$
$$\\text{s.t.} \\quad \\sum_{i=1}^n \\alpha_i y_i = 0, \\quad \\alpha_i \\ge 0, \\quad \\forall i=1, \\dots, n$$

#### 3. KKT 互补松弛条件与支持向量稀疏性
最优解 $(\\mathbf{w}^*, b^*, \\boldsymbol{\\alpha}^*)$ 必须满足 Karush-Kuhn-Tucker (KKT) 条件：
$$\\alpha_i^* [y_i ((\\mathbf{w}^*)^T \\mathbf{x}_i + b^*) - 1] = 0, \\quad \\forall i=1, \\dots, n$$
这一互补松弛条件揭示了 SVM 的灵魂：
- 若 $y_i ((\\mathbf{w}^*)^T \\mathbf{x}_i + b^*) > 1$（样本严格落在间隔带外侧安全区）：则必须有 $\\alpha_i^* = 0$！该样本在 $\\mathbf{w} = \\sum \\alpha_i y_i \\mathbf{x}_i$ 中权重为 0，完全不参与决策面的构成！
- 只有当 $y_i ((\\mathbf{w}^*)^T \\mathbf{x}_i + b^*) = 1$（样本刚好落在间隔带边缘）：此时 $\\alpha_i^* > 0$，这些样本才是真正的**支持向量（Support Vectors）**！

### 几何直觉与图解
```
  X2 ^
     |            + (正类)        +
     |         +             /
     |            [支持向量] + / 
     |---------------------+--/---------------------> 间隔上边界: w^T x + b = +1
     |                   /   /
     |                  /   /  <-- 最优超平面: w^T x + b = 0
     |                 /   /
     |----------------/---+-------------------------> 间隔下边界: w^T x + b = -1
     |               /  - [支持向量]
     |              /       -
     |             /  -           - (负类)
     +------------/-------------------------------> X1
```

### 真实代码示例与分析
下面使用 Scikit-learn 的 `SVC(kernel='linear')` 训练线性 SVM，提取支持向量索引、系数 $\\mathbf{w}$，并验证非支持向量对决策边界的零影响："""

    l2_code = """import numpy as np
from sklearn.svm import SVC

# 1. 构造一个二维线性可分数据集 (8 个样本)
X = np.array([
    [1.0, 2.0], [2.0, 3.0], [2.0, 1.0], [3.0, 2.0],  # 负类 0
    [5.0, 6.0], [6.0, 5.0], [6.0, 7.0], [7.0, 6.0]   # 正类 1
])
y = np.array([0, 0, 0, 0, 1, 1, 1, 1])

# 2. 训练硬间隔/大惩罚线性 SVM (C 很大逼近硬间隔)
clf = SVC(kernel='linear', C=1e5)
clf.fit(X, y)

print(f"权重向量 w: {clf.coef_[0]}")
print(f"截距项 b: {clf.intercept_[0]:.4f}")
print(f"支持向量索引: {clf.support_}")
print(f"支持向量坐标:\\n{clf.support_vectors_}")
print(f"对偶系数 alpha * y: {clf.dual_coef_[0]}")

# 3. 验证非支持向量扰动不改变模型
X_modified = X.copy()
# 修改非支持向量点 (索引 0: [1.0, 2.0] -> 挪得更远 [-5.0, -5.0])
X_modified[0] = [-5.0, -5.0]

clf_mod = SVC(kernel='linear', C=1e5)
clf_mod.fit(X_modified, y)

diff_w = np.linalg.norm(clf.coef_ - clf_mod.coef_)
diff_b = abs(clf.intercept_[0] - clf_mod.intercept_[0])
print(f"\\n扰动非支持向量后:")
print(f"权重差异 ||w - w_mod||: {diff_w:.6e}")
print(f"截距差异 |b - b_mod|: {diff_b:.6e} (模型绝对稳定!)")
"""

    l2_tips = [
        tip("SVM 对特征量纲极度敏感！如果特征 X1 范围是 [0, 1]，而特征 X2 范围是 [0, 10000]，几何间隔计算就会被 X2 完全统治。使用 SVM 前必须严格进行 StandardScaler 标准化。", "pitfall"),
        tip("当软间隔参数 C 设置得极大时，模型对误分类惩罚极重，间隔变窄，倾向于过拟合；当 C 较小时，允许更多样本违规穿透间隔带，间隔更宽，倾向于欠拟合。", "note"),
    ]

    # ── Lesson 3.3 ──
    l3_content = """### 学习目标
学完本节，你应该能够：
1. 理解非线性分类中特征映射 $\\phi(\\mathbf{x})$ 的高维升维机制；
2. 掌握**核技巧（Kernel Trick）**的核心数学思想：无需显式计算高维映射，直接在低维空间计算内积 $K(\\mathbf{x}, \\mathbf{z}) = \\langle \\phi(\\mathbf{x}), \\phi(\\mathbf{z}) \\rangle$；
3. 掌握 Mercer 定理与正定核（Positive Definite Kernel）充要条件；
4. 熟练掌握常见核函数（线性核、多项式核、高斯径向基 RBF 核与 Sigmoid 核）的数学表达式与适用场景；
5. 掌握高斯核超参数 $\\gamma$（Gamma）与软间隔惩罚系数 $C$ 的双参数网格搜索调优策略。

### 前置知识
- 线性 SVM 对偶优化目标函数；
- 内积空间与希尔伯特空间（Hilbert Space）概念。

### 问题背景与 ML 用途
现实世界中的绝大部分数据都不是线性可分的（例如“异或问题 XOR”或“同心圆嵌套分布”）。
Cover 定理（Cover's Theorem on the Separability of Patterns）指出：**将复杂的非线性模式通过非线性变换投射到足够高维的空间中，其变成线性可分的概率将以指数级逼近 1**。
然而显式升维面临两个毁灭性的障碍：
1. **维数灾难**：如果把 100 维特征升到 10 次多项式空间，维度将膨胀到数十万亿维，内存直接爆炸；
2. **计算复杂度**：在高维空间中计算两个向量的内积，计算开销不可承受。
**核技巧（Kernel Trick）是机器学习历史上最精妙的数学奇迹之一**：它允许我们在低维空间用常数级代价做一次简单的标量函数计算，等价于在无限维希尔伯特空间中完成内积运算！

### 直觉理解
- **折纸与切西瓜（升维直觉）**：在一张平铺的纸上画两个同心圆，内圈是红点，外圈是蓝点。在 2D 平面上，你无论如何画不出一道笔直的刀痕把它们分开。但是，如果你把纸的中心向上顶起来（变成一个三维的圆锥或抛物面），然后水平横切一刀——红点全部在刀口上方，蓝点全部在刀口下方！线性可分瞬间达成！
- **神秘的黑匣子（核技巧直觉）**：设想你有一台魔法计算器。你想知道两个在十亿维空间中的向量的内积，但你根本不需要知道这两个十亿维向量具体每个分量长什么样，你只需要把两个低维向量扔进黑匣子，它就能瞬间吐出高维内积的准确数值！

### 核心概念与符号对照表
| 核心概念 | 符号 / 公式 | 数学定义 | 特征空间维度 |
| --- | --- | --- | --- |
| **高斯径向基核 (RBF)** | $K(\\mathbf{x}, \\mathbf{z}) = \\exp(-\\gamma \\|\\mathbf{x} - \\mathbf{z}\\|^2)$ | 基于欧氏距离的指数衰减局部相似度度量 | **无穷维 ($\\infty$)** |
| **多项式核** | $K(\\mathbf{x}, \\mathbf{z}) = (\\gamma \\mathbf{x}^T \\mathbf{z} + r)^d$ | $d$ 阶多项式特征交叉组合 | $\\binom{p+d}{d}$ 有限高维 |
| **线性核** | $K(\\mathbf{x}, \\mathbf{z}) = \\mathbf{x}^T \\mathbf{z}$ | 无特征变换，等价于原始空间线性分类 | 原始 $p$ 维 |
| **超参数 $\\gamma$** | $\\gamma = \\frac{1}{2\\sigma^2}$ | 控制高斯钟形曲线的宽度/辐射半径 | $\\gamma$ 越大，单样本影响范围越窄 |

### 数学原理与逐步推导
#### 1. 核技巧的数学本质
回顾 SVM 对偶问题的目标函数与决策函数：
$$\\max_{\\boldsymbol{\\alpha}} \\sum_{i=1}^n \\alpha_i - \\frac{1}{2} \\sum_{i=1}^n \\sum_{j=1}^n \\alpha_i \\alpha_j y_i y_j \\langle \\phi(\\mathbf{x}_i), \\phi(\\mathbf{x}_j) \\rangle$$
$$f(\\mathbf{x}) = \\text{sign}\\left( \\sum_{i=1}^n \\alpha_i y_i \\langle \\phi(\\mathbf{x}_i), \\phi(\\mathbf{x}) \\rangle + b \\right)$$
**关键发现**：特征映射 $\\phi(\\mathbf{x})$ 在整个算法中**从未单独出现过**，它永远只以**成对内积 $\\langle \\phi(\\mathbf{x}_i), \\phi(\\mathbf{x}_j) \\rangle$ 的形式存在**！
因此，只要存在一个核函数 $K(\\mathbf{x}, \\mathbf{z}) = \\langle \\phi(\\mathbf{x}), \\phi(\\mathbf{z}) \\rangle$，我们根本不需要显式写出甚至计算 $\\phi(\\mathbf{x})$！

#### 2. 高斯 RBF 核映射到无穷维空间的严格泰勒展开证明
考虑一维特征 $x, z \\in \\mathbb{R}$，令 $\\gamma = 1/2$：
$$K(x, z) = \\exp\\left( -\\frac{(x - z)^2}{2} \\right) = \\exp\\left(-\\frac{x^2}{2}\\right) \\exp\\left(-\\frac{z^2}{2}\\right) \\exp(xz)$$
利用自然指数函数的泰勒级数展开 $\\exp(t) = \\sum_{k=0}^{\\infty} \\frac{t^k}{k!}$：
$$\\exp(xz) = \\sum_{k=0}^\\infty \\frac{(xz)^k}{k!} = \\sum_{k=0}^\\infty \\left(\\frac{x^k}{\\sqrt{k!}}\\right) \\left(\\frac{z^k}{\\sqrt{k!}}\\right)$$
将其代入核函数：
$$K(x, z) = \\sum_{k=0}^\\infty \\left[ \\exp\\left(-\\frac{x^2}{2}\\right) \\frac{x^k}{\\sqrt{k!}} \\right] \\cdot \\left[ \\exp\\left(-\\frac{z^2}{2}\\right) \\frac{z^k}{\\sqrt{k!}} \\right]$$
定义无穷维特征映射向量：
$$\\phi(x) = \\exp\\left(-\\frac{x^2}{2}\\right) \\left[ 1, x, \\frac{x^2}{\\sqrt{2!}}, \\frac{x^3}{\\sqrt{3!}}, \\dots, \\frac{x^k}{\\sqrt{k!}}, \\dots \\right]^T$$
此时：
$$K(x, z) = \\langle \\phi(x), \\phi(z) \\rangle$$
**证毕**：高斯核在数学上严格等价于将低维数据隐式投影到了包含无穷个高阶多项式分量的希尔伯特空间中！

### 真实代码示例与分析
下面展示如何使用 RBF 核 SVM 完美分类同心圆非线性数据，并展示不同 $\\gamma$ 对模型决策边界的影响："""

    l3_code = """import numpy as np
from sklearn.datasets import make_circles
from sklearn.svm import SVC

# 1. 生成 2D 同心圆线性不可分数据 (外圈 0, 内圈 1)
X, y = make_circles(n_samples=200, factor=0.4, noise=0.1, random_state=42)

# 2. 对比线性核 vs RBF 高斯核
linear_svm = SVC(kernel='linear')
linear_svm.fit(X, y)
acc_linear = linear_svm.score(X, y)

rbf_svm = SVC(kernel='rbf', C=1.0, gamma='scale')
rbf_svm.fit(X, y)
acc_rbf = rbf_svm.score(X, y)

print(f"线性核 SVM 准确率: {acc_linear:.4f} (线性超平面彻底失效)")
print(f"RBF 高斯核 SVM 准确率: {acc_rbf:.4f} (完美解决非线性流形)")
print(f"RBF 支持向量总数: {len(rbf_svm.support_)} / {len(X)}")

# 3. 观察不同 gamma 对过拟合的影响
for gamma_val in [0.1, 1.0, 50.0]:
    clf_g = SVC(kernel='rbf', gamma=gamma_val, C=1.0)
    clf_g.fit(X, y)
    print(f"Gamma={gamma_val:4.1f}: 训练准确率={clf_g.score(X, y):.4f}, 支持向量数={len(clf_g.support_)}")
"""

    l3_tips = [
        tip("当 gamma 取值极大时（如 gamma=100），高斯钟形基函数的支持半径极小，每一个支持向量周围都会形成独立的‘孤岛’，导致严重的过拟合与差劲的测试集泛化能力。", "pitfall"),
        tip("SVM 训练的时间复杂度通常为 O(n^2) 到 O(n^3)。当训练样本规模超过 10 万行时，基于核技巧的 SVM 训练速度会极度缓慢，此时应优先考虑线性模型或基于直方图分箱的提升树（LightGBM）。", "performance"),
    ]

    lessons = [
        lesson("ml-algo-l3-1", "决策树算法精髓：ID3、C4.5 与 CART", l1_content, 2, l1_tips, [demo(code=l1_code, title="决策树基尼系数计算与规则导出")]),
        lesson("ml-algo-l3-2", "线性支持向量机：最大几何间隔与软间隔对偶", l2_content, 3, l2_tips, [demo(code=l2_code, title="线性硬间隔 SVM 训练与支持向量提取")]),
        lesson("ml-algo-l3-3", "非线性 SVM 与核技巧（Kernel Trick）", l3_content, 3, l3_tips, [demo(code=l3_code, title="RBF 高斯核同心圆分类与 Gamma 调优")]),
    ]

    exercises = [
        single_choice(
            ex_id="ml-algo-c3-ex1",
            question="C4.5 算法相较于 ID3 算法，主要通过哪项机制克服了偏向于选择取值数量过多特征（如唯一 ID 列）的缺陷？",
            options=[
                {"value": "A", "text": "改用基尼指数代替信息熵"},
                {"value": "B", "text": "使用特征自身的固有熵（Intrinsic Value）作为分母，计算信息增益比进行归一化惩罚"},
                {"value": "C", "text": "引入高斯核函数将离散特征映射至无穷维空间"},
                {"value": "D", "text": "在根节点直接进行预剪枝截断"},
            ],
            answer="B",
            explanation="ID3 采用信息增益作为分裂标准，容易偏好取值众多的特征。C4.5 引入特征自身属性的固有熵 IV(A) 作为惩罚分母，计算信息增益比 GainRatio = Gain / IV(A)，有效抑制了极端细分特征的虚高增益。",
            difficulty=2,
            related_lesson_id="ml-algo-l3-1",
            tags=["决策树", "ID3", "C4.5", "信息增益比"],
        ),
        judge(
            ex_id="ml-algo-c3-ex2",
            question="在硬间隔线性支持向量机中，如果任意移动或删除训练集中所有严格落在分类间隔边界外部（非支持向量）的安全样本点，重新求解得到的决策超平面完全不变。",
            answer=True,
            explanation="正确。根据 KKT 互补松弛条件，只有位于间隔边界上的支持向量对应的拉格朗日乘子 alpha_i > 0，超平面法向量 w = sum alpha_i y_i x_i 完全由支持向量线性表出，非支持向量的移动或删除对解无任何影响。",
            difficulty=2,
            related_lesson_id="ml-algo-l3-2",
            tags=["SVM", "支持向量", "KKT条件"],
        ),
        multiple_choice(
            ex_id="ml-algo-c3-ex3",
            question="在构建单棵决策树时，下列哪些策略能够有效抑制过拟合并降低模型方差（Variance）？",
            options=[
                {"value": "A", "text": "限制树的最大生长深度（max_depth）"},
                {"value": "B", "text": "增大叶子节点所允许包含的最小样本数量（min_samples_leaf）"},
                {"value": "C", "text": "采用代价复杂度剪枝（Cost-Complexity Pruning, ccp_alpha > 0）对生成的大树进行后剪枝"},
                {"value": "D", "text": "允许节点持续递归分裂直到每个叶节点的样本纯度达到 100%"},
            ],
            answer=["A", "B", "C"],
            explanation="选项 A、B 是预剪枝策略，选项 C 是后剪枝策略，均能有效限制模型复杂度，抑制过拟合。选项 D 会导致完全生长的极端深树，产生严重的过拟合与高方差。",
            difficulty=2,
            related_lesson_id="ml-algo-l3-1",
            tags=["决策树", "剪枝", "过拟合防范"],
        ),
        fill(
            ex_id="ml-algo-c3-ex4",
            question="设某二分类训练节点中包含 3 个正样本和 1 个负样本（共 4 个样本）。根据 CART 分类树的基尼不纯度定义，该节点的基尼不纯度 Gini 值为 ___（请填写精确小数或最简分数，如 0.375 或 3/8）。",
            blanks=[["0.375", "3/8"]],
            explanation="正类概率 p1 = 3/4 = 0.75，负类概率 p2 = 1/4 = 0.25。Gini(D) = 1 - (p1^2 + p2^2) = 1 - (9/16 + 1/16) = 1 - 10/16 = 6/16 = 3/8 = 0.375。",
            difficulty=2,
            related_lesson_id="ml-algo-l3-1",
            tags=["基尼不纯度", "CART", "数值计算"],
        ),
        open_ex(
            ex_id="ml-algo-c3-ex5",
            question="在软间隔支持向量机中，超参数 $C$ 起到了正则化与损失权衡的关键作用。请分析：\n1. 当 $C \\to +\\infty$ 时，模型的数学行为会趋向于什么？可能会引发什么问题？\n2. 当 $C \\to 0^+$ 时，模型的数学行为又会如何变化？对模型的偏差和方差有何影响？",
            reference_answer="1. 当 C 趋向于正无穷时，优化目标中对松弛变量违规的惩罚权重达到无限大，任何样本穿透间隔带都会引发巨大惩罚。此时模型行为完全退化为硬间隔 SVM，要求所有样本严格线性可分。如果数据本身存在噪声或轻微重叠，模型将无法找到可行解；若勉强分开，会导致间隔极度狭窄，模型方差（Variance）急剧飙升，极易发生过拟合。\n2. 当 C 趋向于 0 时，对分类错误和间隔违规的容忍度极高，优化目标几乎只关注最小化 ||w||^2（即最大化间隔宽度 2/||w||）。此时决策超平面倾向于极度平缓宽阔，可能忽略大量误分类样本，导致模型的偏差（Bias）增大，模型发生欠拟合。",
            explanation="从支持向量机间隔宽度与松弛惩罚权衡的角度，系统分析参数 C 走向两个极端时的数学收敛行为与偏差方差特征。",
            rubric=[
                {"points": 5, "description": "准确回答 C 趋于无穷时退化为硬间隔，对误分类零容忍，导致方差增大与过拟合/无可行解风险"},
                {"points": 5, "description": "准确回答 C 趋于 0 时极度容忍违规，追求最大化间隔带宽，导致偏差增大与欠拟合"},
            ],
            difficulty=3,
            related_lesson_id="ml-algo-l3-2",
            tags=["SVM", "软间隔", "超参数C", "偏差方差权衡"],
        ),
        # ── Code Exercise 3 ──
        {
            "id": "ml-algo-c3-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】从零实现单连续特征最佳二分阈值切分评估器：\n在 CART 决策树中，对于连续特征，需要搜索最佳切分阈值 $t$ 将数据分为左子集（$x \\le t$）和右子集（$x > t$），使得切分后的加权基尼不纯度最小：\n$$\\text{Gini}_{\\text{split}} = \\frac{N_L}{N} \\text{Gini}(D_L) + \\frac{N_R}{N} \\text{Gini}(D_R)$$\n\n请编写函数 `find_best_split(x, y)`：\n1. `x` 为一维连续特征数组或列表，`y` 为一维二分类标签数组或列表（类别 0 或 1）；\n2. 将所有独特的特征值按升序排列，候选切分点为相邻相异特征值的均值中点；\n3. 对每个候选切分点计算加权基尼不纯度；\n4. 返回一个元组 `(best_threshold, best_gini)`，其中 `best_threshold` 为最佳切分阈值（浮点数），`best_gini` 为对应最小加权基尼值（保留 4 位小数）。若特征值全部相同无法切分，返回 `(None, 1.0)`。\n\n最后一行请以 `x_demo = [1.0, 2.0, 3.0, 4.0]`, `y_demo = [0, 0, 1, 1]` 调用该函数测试。",
            "starterCode": "import numpy as np\nfrom typing import Tuple, Optional\n\ndef find_best_split(x, y) -> Tuple[Optional[float], float]:\n    \"\"\"寻找连续特征的最佳二分阈值与最小加权基尼不纯度\"\"\"\n    # 请在此实现\n    ___\n\nx_demo = [1.0, 2.0, 3.0, 4.0]\ny_demo = [0, 0, 1, 1]\nfind_best_split(x_demo, y_demo)\n",
            "setupCode": "",
            "expectedOutput": "(2.5, 0.0)",
            "answer": "import numpy as np\nfrom typing import Tuple, Optional\n\ndef find_best_split(x, y) -> Tuple[Optional[float], float]:\n    x = np.array(x, dtype=float)\n    y = np.array(y, dtype=int)\n    n = len(y)\n    if n == 0:\n        return None, 1.0\n    \n    def gini(sub_y):\n        if len(sub_y) == 0:\n            return 0.0\n        _, counts = np.unique(sub_y, return_counts=True)\n        probs = counts / len(sub_y)\n        return 1.0 - np.sum(probs ** 2)\n    \n    unique_x = np.sort(np.unique(x))\n    if len(unique_x) <= 1:\n        return None, 1.0\n    \n    best_thresh = None\n    best_score = float('inf')\n    \n    for i in range(len(unique_x) - 1):\n        thresh = (unique_x[i] + unique_x[i+1]) / 2.0\n        left_mask = x <= thresh\n        right_mask = ~left_mask\n        \n        y_l = y[left_mask]\n        y_r = y[right_mask]\n        \n        score = (len(y_l) / n) * gini(y_l) + (len(y_r) / n) * gini(y_r)\n        if score < best_score:\n            best_score = score\n            best_thresh = float(thresh)\n            \n    return best_thresh, round(float(best_score), 4)\n\nx_demo = [1.0, 2.0, 3.0, 4.0]\ny_demo = [0, 0, 1, 1]\nfind_best_split(x_demo, y_demo)\n",
            "tests": "x_t = [1.0, 2.0, 5.0, 6.0]\ny_t = [0, 0, 1, 1]\nthresh, g = find_best_split(x_t, y_t)\nassert thresh == 3.5 and g == 0.0, f\"测试不通过: {thresh}, {g}\"\n",
            "explanation": "遍历排序后相邻特征值的中点作为候选切分点，分别计算左右分支的基尼不纯度加权和，选取使不纯度降到最低的切分阈值。",
            "tags": ["CART", "基尼不纯度", "连续特征切分", "决策树"],
            "related_lesson_id": "ml-algo-l3-1",
        },
        single_choice(
            ex_id="ml-algo-c3-ex7",
            question="在使用高斯径向基核（RBF Kernel, $\\exp(-\\gamma \\|\\mathbf{x} - \\mathbf{z}\\|^2)$）训练 SVM 时，如果将参数 $\\gamma$ 设置得非常巨大（例如 $\\gamma = 1000$），模型最可能表现出什么现象？",
            options=[
                {"value": "A", "text": "决策边界变得极度平滑，模型严重欠拟合"},
                {"value": "B", "text": "高斯钟形衰减半径极短，每个支持向量周围形成孤立的微小决策圆环，训练集表现极好但测试集泛化崩溃（严重过拟合）"},
                {"value": "C", "text": "核矩阵退化为单位矩阵，算法直接转化为普通线性回归"},
                {"value": "D", "text": "拉格朗日乘子 alpha 全部落在边界 C 处"},
            ],
            answer="B",
            explanation="gamma 控制高斯核的有效影响半径（衰减速度）。gamma 极大时，核函数值在样本稍微偏离几步后迅速衰减为 0，导致每个支持向量都在其极小邻域内圈定一个孤岛，使得决策边界极度破碎扭曲，产生灾难性的过拟合。",
            difficulty=2,
            related_lesson_id="ml-algo-l3-3",
            tags=["SVM", "RBF核", "Gamma参数", "过拟合"],
        ),
    ]

    return chapter(
        chapter_id="ml-algo-c3",
        course_id="ml-classical-algorithms",
        order=3,
        title="决策树与支持向量机",
        goal="掌握信息熵、信息增益与 CART 基尼分裂准则，掌握支持向量机最大间隔优化、对偶性与 RBF 核技巧推导。",
        lessons=lessons,
        exercises=exercises,
    )
