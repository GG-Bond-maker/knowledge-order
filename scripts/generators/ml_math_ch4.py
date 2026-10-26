# -*- coding: utf-8 -*-
"""
Chapter 4: 概率论、随机变量与贝叶斯推断 (Probability Theory & Bayesian Inference)
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_4():
    # ── Lesson 4.1 ──
    l1_content = """### 学习目标
学完本节，你应该能够：
1. 掌握柯尔莫哥洛夫公理化概率体系（非负性、规范性、可数可加性）与条件概率定义；
2. 理解全概率公式与贝叶斯定理（Bayes' Theorem）的逆概率推断逻辑（从证据更新信念）；
3. 掌握条件独立性（Conditional Independence）的数学定义及其在联合概率因式分解中的关键作用；
4. 理解朴素贝叶斯分类器（Naive Bayes）的核心假设，掌握其克服“特征组合爆炸”的代数机制；
5. 编写代码实现贝叶斯信念更新器，定量观察罕见病筛查中“先验基准率主导后验概率”的现象。

### 前置知识
- 基础集合论运算（交、并、补集）；
- 条件概率与代数乘法规则。

### 问题背景与 ML 用途
真实世界的机器学习系统几乎永远面临着**不确定性（Uncertainty）**：
- 传感器测量带来的观测噪声（随机不确定性 Aleatoric Uncertainty）；
- 训练数据不足导致模型对某些领域的认知空白（认知不确定性 Epistemic Uncertainty）；
- 自然语言中词汇的多义性与歧义性。
概率论是机器学习描述和量化这种不确定性的通用语言。
- 贝叶斯定理给出了机器从数据中学习的本质范式：**后验概率 $\\propto$ 似然度 $\\times$ 先验信念**；
- 朴素贝叶斯分类器被广泛应用于垃圾邮件过滤、文本情感分析与医疗初步诊断；
- 现代大语言模型的自回归解码生成本质上也是在计算条件概率分布 $P(w_t \\mid w_1, \\dots, w_{t-1})$。

### 直觉理解
- **贝叶斯侦探办案**：侦探在案发现场发现了一枚特定血型的脚印（证据 $D$）。在没有勘查现场前，全镇居民是嫌疑人的概率各不相同（先验信念 $P(\\theta)$）；看到这个证据后，某些符合特征的嫌疑人作案的概率大幅提升（后验概率 $P(\\theta \\mid D)$）。新的证据并不能凭空创造结论，而是对原有的先验信念进行按比例重新缩放校准。
- **罕见病阳性佯谬**：如果一种罕见病在人群中的发病率只有 0.1%（先验极小），即便某种检测仪器的准确率高达 99%，某人第一次检测呈阳性时，其真正患病的概率其实依然只有不到 10%！因为 99.9% 的健康人中那 1% 的假阳性人数，远远超过了 0.1% 患病人群中的真阳性人数。

### 核心概念与符号对照表
| 核心概念 | 符号 | 数学定义 / 表达式 | 在机器学习中的核心用途 |
| --- | --- | --- | --- |
| **先验概率** | $P(\\theta)$ | 在观测到数据前对参数或类别的初始概率分布 | 对应正则化项、归纳偏置（Inductive Bias） |
| **似然函数** | $P(D \\mid \\theta)$ | 在给定参数或类别下观察到当前样本的概率 | 对应模型损失函数（对数似然） |
| **后验概率** | $P(\\theta \\mid D)$ | $\\frac{P(D \\mid \\theta) P(\\theta)}{P(D)}$ | 观测到数据后更新的最终置信度 |
| **证据因子** | $P(D)$ | $\\int P(D \\mid \\theta) P(\\theta) d\\theta$ | 归一化常数，贝叶斯模型比较标准 |
| **条件独立性** | $X \\perp Y \\mid Z$ | $P(X, Y \\mid Z) = P(X \\mid Z) P(Y \\mid Z)$ | 贝叶斯网络、隐马尔可夫模型、朴素贝叶斯 |

### 数学原理与逐步推导
#### 1. 贝叶斯定理与全概率分解
设样本空间的一个完备划分事件为 $A_1, A_2, \\dots, A_k$（两两互斥且并集为全集），对于任意事件 $B$（$P(B) > 0$），根据乘法公式：
$$P(A_i \\cap B) = P(B \\mid A_i) P(A_i) = P(A_i \\mid B) P(B)$$
两边同除以 $P(B)$，得：
$$P(A_i \\mid B) = \\frac{P(B \\mid A_i) P(A_i)}{P(B)}$$
根据全概率公式展开分母：
$$P(B) = \\sum_{j=1}^k P(B \\mid A_j) P(A_j)$$
代入即得**贝叶斯公式**：
$$P(A_i \\mid B) = \\frac{P(B \\mid A_i) P(A_i)}{\\sum_{j=1}^k P(B \\mid A_j) P(A_j)}$$

#### 2. 朴素贝叶斯的条件独立性简化
在多特征分类任务中，输入特征向量为 $\\mathbf{x} = [x_1, x_2, \\dots, x_d]^T$，类别标签为 $y \\in \\{1, \\dots, C\\}$。
要精确计算联合似然度 $P(x_1, \\dots, x_d \\mid y)$，如果特征全为离散二值，需要估计 $2^d$ 个参数，会发生严重的维度灾难。
朴素贝叶斯做出了一个极强的**条件独立性假设**：在给定类别 $y$ 的前提下，各个特征之间相互独立：
$$P(x_1, x_2, \\dots, x_d \\mid y) = \\prod_{j=1}^d P(x_j \\mid y)$$
参数量直接从 $O(2^d)$ 剧降到 $O(d)$！分类决策准则为：
$$\\hat{y} = \\arg\\max_{c} P(y=c) \\prod_{j=1}^d P(x_j \\mid y=c)$$
通过对两边取自然对数，乘法连乘转化为加法求和，不仅数值稳定防下溢，而且推导出了典型的线性决策边界。

### 几何图景与计算图
```
朴素贝叶斯的有向图模型结构：
           类别变量 Y (父节点)
         /    │     \
        ▼     ▼      ▼
       X_1   X_2 ... X_d (子特征节点之间无连接弧，给定 Y 条件独立)
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：把 $P(A \mid B)$ 和 $P(B \mid A)$ 混为一谈
> “患乳腺癌患者在乳腺钼靶检查中呈阳性的概率是 90%”（似然度 $P(+ \\mid \\text{Cancer}) = 0.9$），绝对不等于“某人钼靶检查呈阳性时，她患乳腺癌的概率是 90%”（后验概率 $P(\\text{Cancer} \\mid +)$）。混淆这两者被称为“检察官谬误（Prosecutor's Fallacy）”，在机器学习模型评测和医疗决策中极易导致灾难性误判。

### 工业界实践与工程考量
- 朴素贝叶斯在工业界进行文本分类时，若某个单词在训练集的某个类别中从未出现过，其估计概率会直接为 0，连乘后会导致整个后验概率归零。因此必须使用**拉普拉斯平滑（Laplace / Lidstone Smoothing）**：
$$\\hat{P}(x_j = k \\mid y = c) = \\frac{N_{ck} + \\alpha}{N_c + \\alpha K}$$
通常设置平滑系数 $\\alpha = 1.0$。

### 延伸思考与进阶阅读
- 阅读 Kevin P. Murphy《Probabilistic Machine Learning: An Introduction》第 2 章与第 3 章。
- 思考：如果特征之间存在极强的相关性（例如同一特征重复输入了两次），朴素贝叶斯的后验概率估计会出现什么系统性偏差？

### 本节小结
- 贝叶斯定理通过证据似然度与先验信念相乘，实现逆概率推断；
- 朴素贝叶斯的条件独立性假设将指数复杂度降至线性，是概率建模的经典范例。"""

    l1_code = """# 贝叶斯罕见病检验后验更新器仿真
def compute_posterior(prior_disease: float, sensitivity: float, specificity: float) -> dict:
    # sensitivity: P(+ | Disease) (真阳性率)
    # specificity: P(- | Healthy) (真阴性率)
    # false_alarm: P(+ | Healthy) = 1 - specificity (假阳性率)
    p_d = prior_disease
    p_h = 1.0 - p_d
    p_pos_given_d = sensitivity
    p_pos_given_h = 1.0 - specificity

    # 1. 全概率公式计算总阳性测试概率 P(+)
    p_positive = p_pos_given_d * p_d + p_pos_given_h * p_h

    # 2. 贝叶斯公式计算阳性下的真实患病后验概率 P(Disease | +)
    posterior_positive = (p_pos_given_d * p_d) / p_positive

    return {
        "prior_disease": p_d,
        "sensitivity": sensitivity,
        "specificity": specificity,
        "p_positive": round(p_positive, 4),
        "posterior_if_positive": round(posterior_positive, 4)
    }

# 案例 1: 罕见病 (发病率 0.1%), 检测准确率高达 99%
res_rare = compute_posterior(prior_disease=0.001, sensitivity=0.99, specificity=0.99)
print("=== 罕见病筛查 (先验 0.1%, 准确率 99%) ===")
print("总测试阳性率:", res_rare["p_positive"])
print(f"阳性结果下真实患病后验概率: {res_rare['posterior_if_positive']:.2%}")

# 案例 2: 若进行二次独立复检 (以第一次后验作为第二次先验)
res_second = compute_posterior(prior_disease=res_rare["posterior_if_positive"], sensitivity=0.99, specificity=0.99)
print("\\n=== 连续两次检测均为阳性 ===")
print(f"二次阳性后的最终患病后验概率: {res_second['posterior_if_positive']:.2%}")
"""

    lesson_1 = lesson(
        lesson_id="ml-math-l4-1",
        title="概率公理、条件概率与贝叶斯逆概率推断：从证据更新信念",
        content=l1_content,
        difficulty=3,
        tips=[
            tip("基准率忽视陷阱：在处理极度不平衡分类或罕见事件时，忽视先验分布是导致误报率失控的首要原因。", "pitfall"),
            tip("贝叶斯序列更新：今天的后验就是明天的先验。每当有新数据到来，直接以上一步后验作为新先验进行贝叶斯更新，无需重头训练。", "note")
        ],
        demos=[
            demo(code=l1_code, title="罕见病筛查与连续贝叶斯后验概率更新模拟")
        ]
    )

    # ── Lesson 4.2 ──
    l2_content = """### 学习目标
学完本节，你应该能够：
1. 掌握常见离散分布（伯努利分布、分类分布）与常见连续分布（高斯分布、拉普拉斯分布）的概率密度/质量函数；
2. 理解交叉熵损失（Cross-Entropy Loss）如何由多项伯努利分布的似然函数严格推导而来；
3. 掌握多元高斯分布（Multivariate Normal Distribution）的协方差椭球几何结构与马氏距离（Mahalanobis Distance）；
4. 理解拉普拉斯分布（Laplace Distribution）与高斯分布的尾部差异，掌握其分别导出 $L_1$ 稀疏正则与 $L_2$ 平滑正则的对偶关系；
5. 编写代码对多元高斯分布进行样本生成，验证协方差椭球主轴与特征值几何对应关系。

### 前置知识
- 矩阵二次型、特征谱分解与逆矩阵；
- 标量指数函数与定积分基础。

### 问题背景与 ML 用途
如果说概率论是建筑图纸，那么**各种概率分布族（Probability Distributions）**就是搭建机器学习模型的预制砖石：
- 逻辑回归假定标签服从**伯努利分布**；
- 线性回归假定观测误差服从均值为 0 的**一元高斯分布**；
- 多分类任务与大语言模型 Token 预测假定输出服从**多项分类分布（Categorical Distribution）**；
- 变分自编码器（VAE）将隐空间强行约束为**标准多元高斯分布**；
- 扩散模型（Diffusion Models）的整个前向加噪过程本质上是一个连续的多维高斯马尔可夫链。

### 直觉理解
- **多元高斯的等高线椭球**：在一维高斯分布中，密度最大的地方在均值 $\\mu$ 处，远离均值时密度按钟形曲线指数衰减。在二维或高维高斯分布中，等概率密度曲线形成了一个**超椭球体**。如果两个特征完全不相关，椭球的轴线与坐标轴平行；如果两个特征正相关，椭球就会倾斜，长轴方向正是数据分布方差最大的第一主成分方向！

### 核心概念与符号对照表
| 核心概念 | 符号 | 数学定义 / 表达式 | 在机器学习中的核心用途 |
| --- | --- | --- | --- |
| **伯努利分布** | $\\text{Bern}(p)$ | $P(X=x) = p^x (1-p)^{1-x}, x \\in \\{0, 1\\}$ | 二分类模型、BCE 损失函数推导 |
| **多元高斯分布** | $\\mathcal{N}(\\boldsymbol{\\mu}, \\Sigma)$ | $\\frac{1}{(2\\pi)^{d/2} |\\Sigma|^{1/2}} \\exp\\left( -\\frac{1}{2} (\\mathbf{x}-\\boldsymbol{\\mu})^T \\Sigma^{-1} (\\mathbf{x}-\\boldsymbol{\\mu}) \\right)$ | 异常检测、高斯混合模型 GMM、VAE 隐空间 |
| **马氏距离平方** | $D_M^2(\\mathbf{x}, \\boldsymbol{\\mu})$ | $(\\mathbf{x}-\\boldsymbol{\\mu})^T \\Sigma^{-1} (\\mathbf{x}-\\boldsymbol{\\mu})$ | 消除特征间相关性与尺度差异的距离度量 |
| **拉普拉斯分布** | $\\text{Laplace}(\\mu, b)$ | $\\frac{1}{2b} \\exp\\left(-\\frac{|x-\\mu|}{b}\\right)$ | 导出 Lasso $L_1$ 正则化与稀疏权重先验 |
| **指数族分布** | $\\text{ExpFam}$ | $h(x) \\exp(\\boldsymbol{\\eta}^T T(x) - A(\\boldsymbol{\\eta}))$ | 广义线性模型（GLM）的统一数学框架 |

### 数学原理与逐步推导
#### 1. 多元高斯协方差椭球与特征谱分解的几何对齐
考察多元高斯概率密度的核心指数项——**马氏距离二次型**：
$$(\\mathbf{x} - \\boldsymbol{\\mu})^T \\Sigma^{-1} (\\mathbf{x} - \\boldsymbol{\\mu}) = c^2$$
对实对称正定协方差矩阵 $\\Sigma$ 进行特征值分解：
$$\\Sigma = Q \\Lambda Q^T \\implies \\Sigma^{-1} = Q \\Lambda^{-1} Q^T$$
其中 $Q = [\\mathbf{q}_1, \\dots, \\mathbf{q}_d]$ 为由相互正交的单位特征向量组成的正交矩阵，$\\Lambda = \\text{diag}(\\lambda_1, \\dots, \\lambda_d)$。
令中心化坐标在正交特征基底下的投影为 $\\mathbf{y} = Q^T (\\mathbf{x} - \\boldsymbol{\\mu})$，代入二次型得：
$$\\mathbf{y}^T \\Lambda^{-1} \\mathbf{y} = \\sum_{i=1}^d \\frac{y_i^2}{\\lambda_i} = c^2$$
等价于标准几何椭球方程：
$$\\sum_{i=1}^d \\frac{y_i^2}{(c \\sqrt{\\lambda_i})^2} = 1$$
**几何结论**：
1. 等高密度面的几何形状是高维**超椭球**；
2. 椭球的第 $i$ 个对称主轴方向恰好与特征向量 $\\mathbf{q}_i$ 完全重合；
3. 该方向上的半轴长度严格正比于该轴向特征值的平方根 $\\sqrt{\\lambda_i}$（即该轴向的标准差）。

#### 2. 先验分布与正则化项的对偶性
在最大后验估计（MAP）框架下，参数估计值满足：
$$\\hat{\\boldsymbol{\\theta}}_{\\text{MAP}} = \\arg\\max_{\\boldsymbol{\\theta}} \\left[ \\sum_{i=1}^n \\log P(y_i \\mid \\mathbf{x}_i, \\boldsymbol{\\theta}) + \\log P(\\boldsymbol{\\theta}) \\right]$$
- **若参数先验为均值为 0 的独立高斯分布**：$P(\\theta_j) \\propto \\exp(-\\frac{\\theta_j^2}{2\\sigma^2})$，则 $\\log P(\\boldsymbol{\\theta}) = -\\frac{1}{2\\sigma^2} \\|\\boldsymbol{\\theta}\\|_2^2 + \\text{const}$。这精确导出了 **Ridge 岭回归（$L_2$ 正则化）**！
- **若参数先验为均值为 0 的独立拉普拉斯分布**：$P(\\theta_j) \\propto \\exp(-\\frac{|\\theta_j|}{b})$，则 $\\log P(\\boldsymbol{\\theta}) = -\\frac{1}{b} \\|\\boldsymbol{\\theta}\\|_1 + \\text{const}$。这精确导出了 **Lasso 稀疏回归（$L_1$ 正则化）**！

### 几何图景与计算图
```
多元高斯等高线超椭球面：
             y_2 (q_2, 轴长 ~ sqrt(λ_2))
              │     __---__
              │   /         \
              │  |     μ     |  <-- 等密度轮廓线
              │   \         /
              │     ^---__-
              └───────────────▶ y_1 (q_1, 轴长 ~ sqrt(λ_1))
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：欧氏距离最近等于概率意义下最相似
> 当各特征的方差差异很大或特征间存在强相关时，直接计算欧氏距离会导致高方差特征支配距离度量。必须使用**马氏距离**对协方差矩阵做逆变换白化（Whitening），将拉伸倾斜的椭球面复原为标准各向同性的单位超球面。

### 工业界实践与工程考量
- 在高维数据密度估计中，协方差矩阵求逆 $\\Sigma^{-1}$ 极易由于样本不足而退化奇异。工程上通常采用**收缩估计（Shrinkage / Ledoit-Wolf 估计）**：$\\Sigma_{\\text{reg}} = (1 - \\alpha) \\Sigma + \\alpha \\frac{\\text{Tr}(\\Sigma)}{d} I$；或者强行采用对角协方差矩阵（各特征独立，如轻量化高斯朴素贝叶斯）。

### 延伸思考与进阶阅读
- 阅读 Christopher M. Bishop《PRML》第 2.3 节：高斯分布的代数性质与几何直觉。
- 思考：为什么绝大多数物理与工程问题中的噪声都天然近似服从高斯分布？这背后有何深层数学极限定理的支撑？

### 本节小结
- 伯努利分布与分类分布支撑了分类损失函数的构建；
- 多元高斯分布的等高线椭球完全由协方差矩阵的谱分解决定；
- 高斯先验与拉普拉斯先验分别在代数上严格对偶于 $L_2$ 与 $L_1$ 正则化。"""

    l2_code = """import numpy as np

# 设定均值向量与包含强正相关性的协方差矩阵
mu = np.array([2.0, 3.0])
cov = np.array([[4.0, 2.5],
                [2.5, 3.0]])

# 1. 对协方差矩阵做特征值谱分解
eigvals, eigvecs = np.linalg.eigh(cov)
print("协方差特征值 (椭球主轴方差):", np.round(eigvals, 4))
print("主轴特征向量 (主轴方向):\\n", np.round(eigvecs, 4))

# 2. 生成 1000 个采样点
np.random.seed(42)
samples = np.random.multivariate_normal(mu, cov, size=1000)

# 3. 验证采样点经验均值与经验协方差
emp_mu = np.mean(samples, axis=0)
emp_cov = np.cov(samples, rowvar=False)

print("\\n真实均值:", mu, "-> 采样经验均值:", np.round(emp_mu, 4))
print("真实协方差最大误差:", round(np.max(np.abs(cov - emp_cov)), 4))

# 4. 计算任意测试点到均值的马氏距离 vs 欧氏距离
test_pt_A = np.array([2.0 + 2.0, 3.0 + 1.25]) # 沿着相关性主轴方向移动
test_pt_B = np.array([2.0 - 1.25, 3.0 + 2.0]) # 沿着正交副轴方向移动

inv_cov = np.linalg.inv(cov)
def mahalanobis_dist(x, m, icov):
    diff = x - m
    return np.sqrt(diff.T @ icov @ diff)

dist_euc_A = np.linalg.norm(test_pt_A - mu)
dist_euc_B = np.linalg.norm(test_pt_B - mu)

dist_mah_A = mahalanobis_dist(test_pt_A, mu, inv_cov)
dist_mah_B = mahalanobis_dist(test_pt_B, mu, inv_cov)

print(f"\\n点 A (沿主扩散方向): 欧氏距离 = {dist_euc_A:.3f}, 马氏距离 = {dist_mah_A:.3f}")
print(f"点 B (沿反向狭窄副轴): 欧氏距离 = {dist_euc_B:.3f}, 马氏距离 = {dist_mah_B:.3f}")
print("结论: 欧氏距离相近的点，在马氏几何下由于协方差约束展现出截然不同的概率罕见度！")
"""

    lesson_2 = lesson(
        lesson_id="ml-math-l4-2",
        title="常见分布族、充分统计量与几何直觉：从多元高斯到先验正则",
        content=l2_content,
        difficulty=3,
        tips=[
            tip("马氏距离的去相关本质：马氏距离本质上是先把数据投影到协方差特征主轴上，再除以各轴向标准差，最后计算各向同性欧氏距离。", "interview"),
            tip("L1 与 L2 正则的贝叶斯起源：记住 L2 惩罚对应高斯先验（参数倾向于平滑较小值），L1 惩罚对应拉普拉斯先验（尖峰厚尾，参数倾向于精确压缩为 0）。", "note")
        ],
        demos=[
            demo(code=l2_code, title="多元高斯采样与马氏距离几何验证")
        ]
    )

    # ── Lesson 4.3 ──
    l3_content = """### 学习目标
学完本节，你应该能够：
1. 掌握数学期望（Expectation）、方差（Variance）与协方差矩阵（Covariance Matrix）的定义与代数运算性质；
2. 严密推导并证明：任何实随机变量向量的协方差矩阵必为**实对称半正定矩阵**（Positive Semi-definite）；
3. 掌握马尔可夫不等式、切比雪夫不等式与**弱大数定律（WLLN）**，理解蒙特卡洛积分与经验风险收敛性；
4. 深刻理解**中心极限定理（CLT）**在独立同分布样本均值渐近正态性中的核心地位；
5. 编写代码对非正态极端偏态总体进行重复抽样，实证验证样本均值向高斯分布的快速渐近收敛过程。

### 前置知识
- 连续与离散随机变量积分与求和；
- 矩阵二次型与半正定判定。

### 问题背景与 ML 用途
为什么我们在训练神经网络时，可以用一小批数据（Mini-batch，例如 64 或 128 个样本）的平均损失梯度，来代替整个数千万数据集上的总体真实梯度？
为什么我们在评估测试集准确率时，测试集的平均分数能够可靠地代表模型在未来未知全量数据上的泛化能力？
为什么机器学习理论中“经验风险最小化（ERM）”能够渐近逼近“期望风险最小化”？
这一切的底层数学基石，全部来自于概率论中最核心的两个极限定理：**大数定律（Law of Large Numbers）**与**中心极限定理（Central Limit Theorem）**。

### 直觉理解
- **大数定律（众志成城）**：投掷一枚质地均匀的硬币，前 5 次可能出现 4 次正面（样本均值偏离真实值很远）。但随着投掷次数增加到 1000 次、10000 次，正面的频率会以极高的概率无限逼近 50%。只要样本量足够大，样本均值就能可靠地替代不可测的总体期望。
- **中心极限定理（万流归宗的钟形曲线）**：无论总体的原始分布多么古怪、多么扭曲、多么不规则（无论是指数分布、双峰分布还是均匀分布），只要你每次随机抽取 $n$ 个样本并计算它们的均值，这些**均值自身的分布都会惊人地收敛为一条优雅的高斯钟形曲线**！

### 核心概念与符号对照表
| 核心概念 | 符号 | 数学定义 / 表达式 | 在机器学习中的核心用途 |
| --- | --- | --- | --- |
| **数学期望** | $\\mathbb{E}[X]$ | $\\int x p(x) dx$ 或 $\\sum x_i p_i$ | 模型平均预测输出、泛化期望风险 |
| **协方差矩阵** | $\\text{Cov}(\\mathbf{X})$ | $\\mathbb{E}[(\\mathbf{X}-\\boldsymbol{\\mu})(\\mathbf{X}-\\boldsymbol{\\mu})^T]$ | 描述高维多特征间的联合线性相关波动 |
| **切比雪夫不等式** | $P(|X-\\mu| \\ge \\epsilon)$ | $\\le \\frac{\\sigma^2}{\\epsilon^2}$ | 大数定律推导工具、置信上限保证 |
| **弱大数定律** | $\\bar{X}_n \\xrightarrow{P} \\mu$ | $\\lim_{n \\to \\infty} P(|\\bar{X}_n - \\mu| < \\epsilon) = 1$ | 经验风险收敛至真实风险的理论保证 |
| **中心极限定理** | $\\sqrt{n}(\\bar{X}_n - \\mu)$ | $\\xrightarrow{d} \\mathcal{N}(0, \\sigma^2)$ | Mini-batch 梯度噪声建模、置信区间构造 |

### 数学原理与逐步推导
#### 1. 协方差矩阵半正定性的严格代数证明
设 $\\mathbf{X} \\in \\mathbb{R}^d$ 为随机向量，其均值向量为 $\\boldsymbol{\\mu} = \\mathbb{E}[\\mathbf{X}]$。
其协方差矩阵定义为：
$$\\Sigma = \\mathbb{E}\\left[ (\\mathbf{X} - \\boldsymbol{\\mu})(\\mathbf{X} - \\boldsymbol{\\mu})^T \\right] \\in \\mathbb{R}^{d \\times d}$$
显然 $\\Sigma$ 是实对称矩阵（$\\Sigma^T = \\Sigma$）。
对于任意非零常数实向量 $\\mathbf{a} \\in \\mathbb{R}^d$，考察二次型 $\\mathbf{a}^T \\Sigma \\mathbf{a}$：
$$\\mathbf{a}^T \\Sigma \\mathbf{a} = \\mathbf{a}^T \\mathbb{E}\\left[ (\\mathbf{X} - \\boldsymbol{\\mu})(\\mathbf{X} - \\boldsymbol{\\mu})^T \\right] \\mathbf{a}$$
由于期望算子是线性的，常数向量 $\\mathbf{a}$ 可以移入期望算子内部：
$$\\mathbf{a}^T \\Sigma \\mathbf{a} = \\mathbb{E}\\left[ \\mathbf{a}^T (\\mathbf{X} - \\boldsymbol{\\mu})(\\mathbf{X} - \\boldsymbol{\\mu})^T \\mathbf{a} \\right]$$
注意到 $\\mathbf{a}^T (\\mathbf{X} - \\boldsymbol{\\mu})$ 是一个标量，记为标量随机变量 $Y = \\mathbf{a}^T (\\mathbf{X} - \\boldsymbol{\\mu})$。
标量的转置等于其自身，因此：
$$\\mathbf{a}^T (\\mathbf{X} - \\boldsymbol{\\mu})(\\mathbf{X} - \\boldsymbol{\\mu})^T \\mathbf{a} = Y \\cdot Y = Y^2$$
代回期望表达式：
$$\\mathbf{a}^T \\Sigma \\mathbf{a} = \\mathbb{E}[Y^2]$$
因为实数的平方恒非负（$Y^2 \\ge 0$），其数学期望也必恒大于或等于 0：
$$\\mathbb{E}[Y^2] \\ge 0 \\implies \\mathbf{a}^T \\Sigma \\mathbf{a} \\ge 0$$
**定理得证**：对任意非零向量 $\\mathbf{a}$，二次型恒满足 $\\mathbf{a}^T \\Sigma \\mathbf{a} \\ge 0$，因此**任何随机向量的协方差矩阵必定是实对称半正定矩阵**（其所有特征值 $\\lambda_i \\ge 0$）！

#### 2. 中心极限定理对随机梯度下降（SGD）的指导意义
设全量数据集包含 $N$ 个样本，每个样本的损失梯度为 $\\mathbf{g}_i = \\nabla \\mathcal{L}_i(\\boldsymbol{\\theta})$，总体真实梯度为 $\\bar{\\mathbf{g}} = \\frac{1}{N} \\sum_{i=1}^N \\mathbf{g}_i$。
Mini-batch 抽样大小为 $B$，批梯度为 $\\hat{\\mathbf{g}}_B = \\frac{1}{B} \\sum_{j=1}^B \\mathbf{g}_{i_j}$。
根据中心极限定理：
$$\\hat{\\mathbf{g}}_B \\sim \\mathcal{N}\\left( \\bar{\\mathbf{g}}, \\frac{1}{B} \\Sigma_{\\text{grad}} \\right)$$
批梯度是全量梯度的**无偏估计**，且其噪声方差严格反比于批次大小 $B$（方差缩减比例为 $1/B$）。这为现代深度学习调节 Batch Size、设置学习率衰减策略（如线性缩放法则 Linear Scaling Rule: 增大 $k$ 倍 Batch Size 则增大 $k$ 倍学习率）提供了坚不可摧的数学依据。

### 几何图景与计算图
```
中心极限定理演进图：
单个样本 X_i 的分布 (极度偏态的指数分布)
   │  |\
   │  | \
   │  |  \____
   └─────────────▶ x

抽样均值 (n = 30 时的分布，自发蜕变为对称的高斯分布!)
   │       _--_
   │     /      \
   │    |   μ    |  <-- 渐近正态性万流归宗
   │   /          \
   └───────────────▶ \bar{X}_n
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：以为中心极限定理说的是“样本量增加时，原始数据分布变成正态分布”
> 这是一个极为普遍的严重误解！样本量增加并不会改变原始总体的物理属性（原始总体该是指数组依然是指数组）。**变成正态分布的是“样本的平均值（Sample Mean）”这一统计量自身的抽样分布，而不是单个样本的数据点本身！**

### 工业界实践与工程考量
- 在大模型训练与评估中，当汇报模型在基准测试（如 MMLU）上的准确率时，绝不能只汇报单一均值数字，而是必须利用 CLT 构造 95% 置信区间 $\\hat{p} \\pm 1.96 \\sqrt{\\frac{\\hat{p}(1-\\hat{p})}{n}}$，以判断两次实验之间的性能差异是否具备真正的统计显著性。

### 延伸思考与进阶阅读
- 阅读 Sheldon Ross《A First Course in Probability》第 8 章：极限定理与切比雪夫不等式。
- 思考：如果总体的方差是无穷大的（例如柯西分布 Cauchy Distribution 或极厚尾的帕累托分布），中心极限定理依然成立吗？此时应该用什么分布来描述？

### 本节小结
- 协方差矩阵由二次型非负性严格保证了其半正定性；
- 大数定律保证了经验均值依概率收敛于总体期望，中心极限定理阐明了估计误差的渐近正态波动规律。"""

    l3_code = """import numpy as np

# 从高度不对称且厚尾的指数分布 (Exponential Distribution, scale=2.0) 中抽样
np.random.seed(42)
scale_true = 2.0
pop_mean = scale_true
pop_std = scale_true

# 模拟不同样本容量 n 下样本均值的抽样分布
sample_sizes = [2, 5, 30, 200]
n_simulations = 5000

print(f"总体理论期望: {pop_mean}, 总体理论标准差: {pop_std}")
print("=" * 60)

for n in sample_sizes:
    # 模拟 n_simulations 次抽样，每次抽取 n 个独立样本并计算均值
    samples = np.random.exponential(scale=scale_true, size=(n_simulations, n))
    means = np.mean(samples, axis=1)

    mean_of_means = np.mean(means)
    std_of_means = np.std(means)
    theoretical_std = pop_std / np.sqrt(n)

    # 计算抽样均值分布的偏度 (Skewness, 正态分布偏度为 0)
    skewness = np.mean(((means - mean_of_means) / std_of_means)**3)

    print(f"样本容量 n = {n:3d}:")
    print(f"  均值的期望: {mean_of_means:.4f} (理论: {pop_mean:.4f})")
    print(f"  均值的标准差: {std_of_means:.4f} (CLT 理论: {theoretical_std:.4f})")
    print(f"  偏度系数: {skewness:.4f} (越接近 0 越趋向对称正态，原始偏度为 2.0)")
    print("-" * 60)
"""

    lesson_3 = lesson(
        lesson_id="ml-math-l4-3",
        title="期望、协方差、大数定律与中心极限定理：从样本估计总体的基石",
        content=l3_content,
        difficulty=3,
        tips=[
            tip("半正定性自明公理：协方差矩阵对任何向量的二次型等价于标量投影的方差 Var(a^T X)，而方差天然大于等于 0，这从根本上保证了半正定性。", "interview"),
            tip("CLT 的收敛门槛：在工程实践中，当单个样本方差有限时，通常样本量 n >= 30 即可展现出极好的正态逼近性质。", "note")
        ],
        demos=[
            demo(code=l3_code, title="极端偏态总体下中心极限定理收敛模拟")
        ]
    )

    lessons = [lesson_1, lesson_2, lesson_3]

    # ── Exercises for Chapter 4 ──
    exercises = [
        single_choice(
            ex_id="ml-math-c4-ex1",
            question="在朴素贝叶斯分类器（Naive Bayes）中，被称为“朴素（Naive）”的核心假设在数学上具体是指什么？",
            options=[
                {"value": "A", "text": "在给定目标类别标签 $y$ 的条件下，输入的所有特征 $x_1, \\dots, x_d$ 之间相互条件独立"},
                {"value": "B", "text": "所有特征都必须服从均值为 0、方差为 1 的正态分布"},
                {"value": "C", "text": "所有类别的先验概率 $P(y)$ 必须完全相等"},
                {"value": "D", "text": "模型不需要任何训练样本，可以直接根据常识进行预测"},
            ],
            answer="A",
            explanation="朴素贝叶斯之所以被称为“朴素”，正是因为它做出了一个极强的理想化假设：在已知类别的前提下，各个特征之间相互条件独立，从而将联合似然因式分解为单特征似然的连乘。",
            difficulty=2,
            related_lesson_id="ml-math-l4-1",
            tags=["朴素贝叶斯", "条件独立性", "分类假设"],
        ),
        judge(
            ex_id="ml-math-c4-ex2",
            question="根据中心极限定理（CLT），只要原始总体的方差有限，无论原始数据的总体分布形状如何（甚至极度偏斜），当样本量 $n$ 足够大时，样本均值 $\\bar{X}_n$ 自身的抽样分布都将渐近收敛于正态分布。",
            answer=True,
            explanation="正确。这正是中心极限定理的核心结论：渐近趋于正态分布的是样本均值这一统计量，而非原始数据本身。",
            difficulty=2,
            related_lesson_id="ml-math-l4-3",
            tags=["中心极限定理", "渐近正态", "统计基础"],
        ),
        multiple_choice(
            ex_id="ml-math-c4-ex3",
            question="关于多元高斯分布 $\\mathcal{N}(\\boldsymbol{\\mu}, \\Sigma)$ 的几何与代数性质，下列陈述中正确的有：",
            options=[
                {"value": "A", "text": "其等概率密度超曲面在几何上是高维超椭球体"},
                {"value": "B", "text": "超椭球体的对称主轴方向与协方差矩阵 $\\Sigma$ 的特征向量完全重合"},
                {"value": "C", "text": "若协方差矩阵 $\\Sigma$ 为对角矩阵，则各维度特征之间相互独立"},
                {"value": "D", "text": "马氏距离等价于消除了不同特征间的尺度差异与相关性之后的各向同性标准化距离"},
            ],
            answer=["A", "B", "C", "D"],
            explanation="四项陈述全部正确。多元高斯分布的等高线是由马氏距离决定的椭球，主轴为协方差矩阵的特征向量；对于多元高斯分布而言，不相关（对角协方差）与统计独立是完全等价的充要条件。",
            difficulty=3,
            related_lesson_id="ml-math-l4-2",
            tags=["多元高斯", "马氏距离", "协方差椭球", "统计独立"],
        ),
        fill(
            ex_id="ml-math-c4-ex4",
            question="从贝叶斯最大后验概率估计（MAP）的视角来看，机器学习中的 $L_2$ 正则化（岭回归）等价于假设参数先验服从 ____ 分布；而能够产生稀疏参数解的 $L_1$ 正则化（Lasso 回归）等价于假设参数先验服从 ____ 分布。",
            blanks=[
                ["高斯", "正态", "正态分布", "高斯分布"],
                ["拉普拉斯", "拉普拉斯分布"]
            ],
            explanation="高斯先验的对数形式为负平方和项，对应 $L_2$ 范数惩罚；拉普拉斯先验的对数形式为绝对值和项，具有零点尖峰，对应 $L_1$ 稀疏范数惩罚。",
            difficulty=3,
            related_lesson_id="ml-math-l4-2",
            tags=["MAP估计", "L1正则", "L2正则", "高斯先验", "拉普拉斯先验"],
        ),
        open_ex(
            ex_id="ml-math-c4-ex5",
            question="【数理代数证明】设 $\\mathbf{X} \\in \\mathbb{R}^d$ 为实随机向量，其均值向量为 $\\boldsymbol{\\mu} = \\mathbb{E}[\\mathbf{X}]$。请严密证明：其协方差矩阵 $\\Sigma = \\mathbb{E}\\left[(\\mathbf{X}-\\boldsymbol{\\mu})(\\mathbf{X}-\\boldsymbol{\\mu})^T\\right]$ 必然是一个实对称半正定矩阵（即对任意非零向量 $\\mathbf{a} \\in \\mathbb{R}^d$，恒有 $\\mathbf{a}^T \\Sigma \\mathbf{a} \\ge 0$）。",
            reference_answer="""证明过程如下：
1. 对称性证明：
   $\\Sigma^T = \\left( \\mathbb{E}\\left[ (\\mathbf{X} - \\boldsymbol{\\mu})(\\mathbf{X} - \\boldsymbol{\\mu})^T \\right] \\right)^T = \\mathbb{E}\\left[ \\left( (\\mathbf{X} - \\boldsymbol{\\mu})(\\mathbf{X} - \\boldsymbol{\\mu})^T \\right)^T \\right] = \\mathbb{E}\\left[ (\\mathbf{X} - \\boldsymbol{\\mu})(\\mathbf{X} - \\boldsymbol{\\mu})^T \\right] = \\Sigma$。
   因此 $\\Sigma$ 必为实对称矩阵。
2. 半正定性证明：
   对于任意非零常数实向量 $\\mathbf{a} \\in \\mathbb{R}^d$，考察其二次型：
   $$\\mathbf{a}^T \\Sigma \\mathbf{a} = \\mathbf{a}^T \\mathbb{E}\\left[ (\\mathbf{X} - \\boldsymbol{\\mu})(\\mathbf{X} - \\boldsymbol{\\mu})^T \\right] \\mathbf{a}$$
   由数学期望的线性性质，常数向量 $\\mathbf{a}$ 可移入期望算子内部：
   $$\\mathbf{a}^T \\Sigma \\mathbf{a} = \\mathbb{E}\\left[ \\mathbf{a}^T (\\mathbf{X} - \\boldsymbol{\\mu})(\\mathbf{X} - \\boldsymbol{\\mu})^T \\mathbf{a} \\right]$$
3. 记标量随机变量 $Y = \\mathbf{a}^T (\\mathbf{X} - \\boldsymbol{\\mu})$。由于标量的转置等于其本身：
   $$\\mathbf{a}^T (\\mathbf{X} - \\boldsymbol{\\mu})(\\mathbf{X} - \\boldsymbol{\\mu})^T \\mathbf{a} = Y \\cdot Y^T = Y^2$$
4. 因此二次型可化简为：
   $$\\mathbf{a}^T \\Sigma \\mathbf{a} = \\mathbb{E}[Y^2]$$
   由于任何实数随机变量的平方 $Y^2 \\ge 0$ 恒成立，其数学期望必满足 $\\mathbb{E}[Y^2] \\ge 0$。
   故 $\\mathbf{a}^T \\Sigma \\mathbf{a} \\ge 0$ 恒成立。
命题得证，协方差矩阵必然为实对称半正定矩阵。""",
            explanation="利用期望的线性性质将二次型转化为标量投影随机变量平方的期望，严谨证明协方差矩阵的半正定性。",
            rubric=[
                {"point": "严谨证明协方差矩阵的对称性 Sigma^T = Sigma", "score": 25},
                {"point": "正确利用期望的线性性质将向量 a 移入期望内部", "score": 25},
                {"point": "将二次型内部识别并转化为标量随机变量平方的形式 Y^2", "score": 25},
                {"point": "由实数平方非负性得出 E[Y^2] >= 0 并完成半正定判定", "score": 25},
            ],
            difficulty=4,
            related_lesson_id="ml-math-l4-3",
            tags=["协方差矩阵", "半正定证明", "二次型", "数学推导"],
        ),
        # ── Code Exercise 4 ──
        {
            "id": "ml-math-c4-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】实现贝叶斯医学检验后验概率计算器：\n编写函数 `bayes_disease_posterior(prior, sensitivity, specificity)`：\n接收三个浮点参数：\n1. `prior`: 疾病的基础先验发病率 $P(D)$；\n2. `sensitivity`: 检验的真阳性敏感度 $P(+ \\mid D)$；\n3. `specificity`: 检验的真阴性特异度 $P(- \\mid \\neg D)$。\n利用全概率公式与贝叶斯公式，计算并返回一个元组 `(p_positive, p_posterior)`：\n1. `p_positive`: 全人群中测试呈阳性的总全概率 $P(+)$（四舍五入保留 4 位小数）；\n2. `p_posterior`: 当某人测试结果呈阳性时，其真正患病的后验概率 $P(D \\mid +)$（四舍五入保留 4 位小数）。\n\n最后一行请返回调用示例在测试参数 `(0.01, 0.95, 0.90)` 下的计算结果。",
            "starterCode": "def bayes_disease_posterior(prior: float, sensitivity: float, specificity: float) -> tuple:\n    \"\"\"利用贝叶斯公式计算总阳性率与阳性患者的真实患病后验概率\"\"\"\n    # 请在此实现\n    ___\n\nbayes_disease_posterior(0.01, 0.95, 0.90)\n",
            "setupCode": "",
            "expectedOutput": "(0.1085, 0.0876)",
            "answer": "def bayes_disease_posterior(prior: float, sensitivity: float, specificity: float) -> tuple:\n    p_pos = sensitivity * prior + (1.0 - specificity) * (1.0 - prior)\n    posterior = (sensitivity * prior) / p_pos\n    return (round(p_pos, 4), round(posterior, 4))\n\nbayes_disease_posterior(0.01, 0.95, 0.90)\n",
            "tests": "p_pos2, post2 = bayes_disease_posterior(0.001, 0.99, 0.95)\nassert p_pos2 == 0.0509, f\"总阳性率计算错误: {p_pos2}\"\nassert post2 == 0.0194, f\"后验概率计算错误: {post2}\"\n",
            "explanation": "利用全概率公式计算分母 P(+) = P(+|D)P(D) + P(+|~D)P(~D)，再利用贝叶斯公式求得后验概率。",
            "tags": ["贝叶斯公式", "全概率公式", "后验概率", "Python编程实战"],
            "related_lesson_id": "ml-math-l4-1",
        },
        single_choice(
            ex_id="ml-math-c4-ex7",
            question="为什么在深度学习中，针对多分类任务（如 ImageNet 1000 分类），我们普遍采用 Softmax 输出结合交叉熵损失（Cross-Entropy Loss），而不是直接使用均方误差（MSE）？",
            options=[
                {"value": "A", "text": "Softmax 结合交叉熵损失本质上是对多项分类分布进行极大似然估计（MLE），其导数形式极其简洁（预测概率减真实标签），在预测错误严重时仍能提供强劲梯度而不会发生梯度饱和消失"},
                {"value": "B", "text": "因为 MSE 损失函数在分类问题中无法使用反向传播求导"},
                {"value": "C", "text": "因为 Softmax 只能与交叉熵配合，与 MSE 在数学维度上不兼容"},
                {"value": "D", "text": "因为交叉熵损失的计算速度比 MSE 快 100 倍以上"},
            ],
            answer="A",
            explanation="多分类标签服从分类分布，似然函数的负对数即为交叉熵损失。Softmax 结合交叉熵求导时，激活函数的局部饱和导数与损失函数的对数分母完美抵消，梯度为简洁的 $(\\hat{y}_k - y_k)$；而若配合 MSE，当模型做出极度自信的错误预测时，Softmax 的导数趋于 0 会导致梯度严重弥散。",
            difficulty=3,
            related_lesson_id="ml-math-l4-2",
            tags=["Softmax", "交叉熵损失", "极大似然估计", "梯度饱和"],
        ),
    ]

    return chapter(
        chapter_id="ml-math-c4",
        course_id="ml-math",
        order=4,
        title="概率论、随机变量与贝叶斯推断",
        goal="掌握贝叶斯逆概率推断与先验更新，理解多元高斯分布几何与正则化对偶，证明协方差半正定性与极限定理。",
        lessons=lessons,
        exercises=exercises,
    )
