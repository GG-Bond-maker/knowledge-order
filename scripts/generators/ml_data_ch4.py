# -*- coding: utf-8 -*-
"""
Chapter 4: 统计探索性数据分析（EDA）与可解释可视化 (Exploratory Data Analysis & Interpretable Visualization)
Course: ml-python-data
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_4():
    # ── Lesson 4.1 ──
    l1_content = """### 学习目标
学完本节，你应该能够：
1. 掌握单变量分布探索的两个高级高阶统计矩：**偏度（Skewness）**与**峰度（Kurtosis）**的数学定义；
2. 理解为什么对于线性回归、逻辑回归与神经网络，将右偏长尾特征转换为近似正态分布能显著提升模型拟合能力与梯度稳定性；
3. 掌握非线性幂变换家族：对数变换（`np.log1p`）、Box-Cox 变换与 Yeo-Johnson 变换的数学形式及负数适应性；
4. 熟练运用分位数-分位数图（Q-Q Plot）进行正态性视觉诊断；
5. 编写代码对具有极端右偏的长尾收入特征进行多种幂变换校正，对比偏度衰减幅度与正态性检验统计量。

### 前置知识
- 期望、方差与三阶/四阶中心矩；
- 对数函数与指数函数运算法则。

### 问题背景与 ML 用途
在机器学习的特征集中，大量经济与互联网指标（如房价、用户资产、下载量、视频播放时长）天然呈现出**极度不均衡的右偏长尾形态**：
- 99% 的用户消费金额在 100 元以内，而 1% 的极端高净值用户消费几十万元；
- 如果直接将原始数据送入线性回归或神经网络，那几个极端大值会完全主导损失函数的梯度方向；
- 高偏度特征还会导致模型残差的“异方差性（Heteroscedasticity）”，使得小样本区域的拟合残差极小、而大样本区域的残差呈喇叭状剧烈发散。
**通过单变量分布探索识别偏度，并运用幂变换将其重塑为对称近似高斯分布，是经典统计学习与深度学习预处理的核心工序**。

### 直觉理解
- **弹簧压缩器（对数变换直觉）**：想象一条数轴，0 到 100 挤满了密密麻麻的普通人，而 100 万处孤零零站着一个富翁。普通线性模型在看着这条数轴时，眼中只有富翁那巨大的 100 万跨度，根本看不清 0 到 100 之间普通人细微的差别（分辨率丢失）。对数变换 $\\log(1 + x)$ 就像一个自适应弹簧：它对数值很小的地方（0 到 100）几乎不压缩，而对几万、几十万的巨大数值施加极其强烈的非线性压缩（把 100 万压缩成大约 13.8）。这样一挤压，整条数轴上的点就均匀、对称地散布开来，模型的眼睛瞬间能看清所有人！

### 核心概念与符号对照表
| 核心概念 | 符号 / 统计量 | 数学定义 / 表达式 | 在机器学习中的核心用途 |
| --- | --- | --- | --- |
| **偏度** | $\\text{Skew}(X)$ | $\\mathbb{E}\\left[ \\left(\\frac{X-\\mu}{\\sigma}\\right)^3 \\right]$ | 量化分布的不对称性（$>0$ 右偏，$<0$ 左偏） |
| **超额峰度** | $\\text{Kurt}(X)$ | $\\mathbb{E}\\left[ \\left(\\frac{X-\\mu}{\\sigma}\\right)^4 \\right] - 3$ | 量化尾部的厚重程度与极端值概率（$>0$ 厚尾尖峰） |
| **Log1p 变换** | $\\log(1 + x)$ | 自然对数加 1（防 0 产生的负无穷） | 非负右偏特征的最轻量标准变换 |
| **Box-Cox 变换** | $y^{(\\lambda)}$ | $\\frac{y^\\lambda - 1}{\\lambda} (\\lambda \\neq 0)$，要求 $y > 0$ | 寻找最优参数 $\\lambda$ 自动将数据映射为正态 |
| **Yeo-Johnson 变换** | $y^{(\\lambda)}$ | Box-Cox 的连续扩展，支持含负数和 0 的特征 | Scikit-learn `PowerTransformer` 默认通用引擎 |

### 数学原理与逐步推导
#### 1. Box-Cox 变换与最大似然最优参数估计
为了自动找到一个最优的单调非线性变换，将偏态特征 $y$ 映射为严格高斯分布 $y^{(\\lambda)} \\sim \\mathcal{N}(\\mu, \\sigma^2)$，Box 与 Cox 提出了如下参数化变换族（假定 $y_i > 0$）：
$$y^{(\\lambda)} = \\begin{cases} \\frac{y^\\lambda - 1}{\\lambda}, & \\text{if } \\lambda \\neq 0 \\\\ \\ln(y), & \\text{if } \\lambda = 0 \\end{cases}$$
其中参数 $\\lambda$ 的最优值不是人为随意猜测的，而是通过在全样本上**构建轮廓对数似然函数（Profile Log-Likelihood）**并利用数值优化求解极大值点得到的：
$$\\mathcal{L}(\\lambda) = -\\frac{n}{2} \\ln(\\hat{\\sigma}^2(\\lambda)) + (\\lambda - 1) \\sum_{i=1}^n \\ln(y_i)$$
其中 $\\hat{\\sigma}^2(\\lambda) = \\frac{1}{n} \\sum_{i=1}^n (y_i^{(\\lambda)} - \\bar{y}^{(\\lambda)})^2$ 为变换后的样本方差。
**结论**：
- 当 $\\lambda = 1$ 时，变换退化为线性平移缩放；
- 当 $\\lambda = 0$ 时，变换退化为对数变换；
- 当 $\\lambda = 0.5$ 时，变换退化为开平方变换。
算法通过在连续区间 $[ -2, 2 ]$ 内搜索使似然度最大的 $\\lambda^*$，实现分布偏度的全自动校正。

### 几何图景与计算图
```
偏度变换前后的密度曲线对比：
变换前 (严重右偏长尾，偏度 Skew > 3.0):
   │ |\
   │ | \
   │ |  \____
   │ |       \_______________ (长长微弱的右尾巴)
   └──────────────────────────▶ x

变换后 (Yeo-Johnson / Log1p 变换后，偏度降至接近 0):
   │       _--_
   │     /      \
   │    |   μ    |  <-- 完美对称钟形正态分布，线性模型拟合度倍增!
   │   /          \
   └───────────────▶ y_transformed
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：决策树和 GBDT 模型也必须做 Log 或 Box-Cox 变换吗？
> **完全没有必要！** 决策树算法（Random Forest、XGBoost、LightGBM）的核心机制是基于特征值的“单调序关系（Monotonic Rank）”寻找最佳切分点。由于对数变换或 Box-Cox 是**严格单调递增变换**，它不会改变任何样本点之间的先后次序大小关系！树模型对单调变换天然免疫。**偏度校正主要针对的是线性模型、逻辑回归、KNN、SVM、PCA 以及神经网络**。

### 工业界实践与工程考量
- 在工业级特征工程中，如果一个特征的物理取值全非负（如访问量、花费），优先使用 `np.log1p`，因为它的数学形式固定、不需要在训练集上拟合任何自由参数，在线上部署推理时没有“参数存储与维护成本”。如果特征包含负数（如温度、利润亏损），必须使用 Scikit-learn 的 `PowerTransformer(method='yeo-johnson')`。

### 延伸思考与进阶阅读
- 阅读 George E. P. Box, David R. Cox 经典论文《An Analysis of Transformations》(JRSS-B, 1964)。
- 思考：如果目标变量标签 $y$ 是严重右偏的房价，我们在训练模型前对 $y$ 做了 `log1p(y)` 变换，当模型推理输出预测值 $\\hat{z}$ 后，如何将其无偏地还原为真实房价？直接取 `expm1(z)` 会带来什么几何均值低估偏差？

### 本节小结
- 偏度刻画不对称性，峰度刻画厚尾风险；
- Log1p、Box-Cox 与 Yeo-Johnson 幂变换能将右偏长尾重塑为近似高斯分布，赋能距离敏感型与线性模型。"""

    l1_code = """import numpy as np
from scipy import stats
from sklearn.preprocessing import PowerTransformer

# 构造一个具有极端右偏形态的合成收入特征 (1000 个样本，对数正态分布)
np.random.seed(42)
income_raw = np.random.lognormal(mean=2.0, sigma=1.2, size=1000)

# 1. 评估原始特征的高阶矩 (偏度与超额峰度)
skew_raw = stats.skew(income_raw)
kurt_raw = stats.kurtosis(income_raw)

print("=== 原始特征分布统计 ===")
print(f"偏度系数 (Skewness): {skew_raw:.4f} (显著大于 0，呈严重右偏)")
print(f"超额峰度 (Kurtosis): {kurt_raw:.4f} (厚尾特征，离群点频发)")

# 2. 变换方案 A: np.log1p (最常用轻量对数变换)
income_log = np.log1p(income_raw)
skew_log = stats.skew(income_log)
kurt_log = stats.kurtosis(income_log)

print("\\n=== 变换方案 A: np.log1p ===")
print(f"对数变换后偏度: {skew_log:.4f} (迅速回落至接近 0 的对称区间)")
print(f"对数变换后峰度: {kurt_log:.4f}")

# 3. 变换方案 B: Yeo-Johnson 自动最优幂变换 (PowerTransformer)
pt = PowerTransformer(method='yeo-johnson')
income_yj = pt.fit_transform(income_raw.reshape(-1, 1)).flatten()
skew_yj = stats.skew(income_yj)
kurt_yj = stats.kurtosis(income_yj)

print("\\n=== 变换方案 B: Yeo-Johnson 幂变换 ===")
print(f"最优搜索参数 lambda: {pt.lambdas_[0]:.4f}")
print(f"幂变换后偏度: {skew_yj:.4f} (完美居中对称)")
print(f"幂变换后峰度: {kurt_yj:.4f}")

# 正态性检验 (Shapiro-Wilk 检验，p 值越大越支持正态分布)
_, p_val_raw = stats.shapiro(income_raw[:100])
_, p_val_yj = stats.shapiro(income_yj[:100])
print(f"\\n原始数据正态性检验 p-value: {p_val_raw:.2e} (彻底拒绝正态假设)")
print(f"变换后数据正态性检验 p-value: {p_val_yj:.4f} (显著提升正态拟合度)")
"""

    lesson_1 = lesson(
        lesson_id="ml-data-l4-1",
        title="单变量分布探索与偏度/峰度校正：重塑健康的高斯形态",
        content=l1_content,
        difficulty=3,
        tips=[
            tip("树模型无需做单调变换：谨记 GBDT 树模型对单调特征变换完全免疫，不要在纯树模型流水线中盲目堆砌不必要的 log 变换。", "interview"),
            tip("np.log1p 防零溢出：计算对数时永远优先使用 `np.log1p(x)` 代替 `np.log(x)`，防止 $x=0$ 时产生负无穷 `-inf` 污染流水线。", "pitfall")
        ],
        demos=[
            demo(code=l1_code, title="偏度/峰度统计度量与 Log1p / Yeo-Johnson 幂变换对比")
        ]
    )

    # ── Lesson 4.2 ──
    l2_content = """### 学习目标
学完本节，你应该能够：
1. 掌握三大变量关联度量工具：**皮尔逊相关系数（Pearson）**、**斯皮尔曼等级相关（Spearman）**与**互信息（Mutual Information）**的数学原理；
2. 深刻辨析线性相关、单调非线性相关与非单调非线性相关在不同度量下的致命盲区；
3. 掌握多重共线性（Multicollinearity）对线性回归与逻辑回归模型参数解释性的破坏机理；
4. 熟练运用方差膨胀因子（Variance Inflation Factor, VIF）进行共线性特征诊断与剔除；
5. 编写代码对三种典型数据关系（线性、单调三次曲线、非线性二次抛物面）进行全量相关性对比，验证互信息的非线性捕获能力。

### 前置知识
- 协方差与标准差归一化；
- 信息论熵（Entropy）与联合熵定义。

### 问题背景与 ML 用途
在特征选择阶段，我们常常希望淘汰那些“与预测目标毫无关联的无用特征”，同时剔除“彼此高度重复冗余的共线性特征”：
- 很多工程师只画一张 Pearson 相关性热力图：如果一个特征与目标是 $y = x^2$ 的完美二次抛物线关系，Pearson 相关系数几乎严格为 0！如果此时误以为该特征无用而直接丢弃，你就**亲手丢弃了一个决定性的关键特征**！
- 如果特征集中存在两列高度相关的特征（如“以厘米度量的身高”和“以英寸度量的身高”），这会导致普通线性回归的特征权重符号颠倒、方差极大、模型彻底失去业务解释性。
**综合运用 Pearson、Spearman 与互信息矩阵，是穿透非线性迷雾、进行科学特征筛选的关键抓手**。

### 直觉理解
- **侦测三兄弟的不同视力**：
  - **老大皮尔逊（Pearson）**：戴着一副“纯线性眼镜”，眼中只有直线。只要数据点排成一条倾斜直线他就大喊 1.0；但凡弯成一条抛物线，他就视而不见，给出 0 分。
  - **老二斯皮尔曼（Spearman）**：戴着一副“排名放大镜”，他不在乎具体的数值间距，只在乎“你大我也大（单调性）”。即使曲线弯得很厉害，只要排位没有逆转，他依然会给出满分 1.0。
  - **老三互信息（Mutual Information）**：来自于信息论的终极侦探，无论数据是弯成抛物线、圆环还是波浪线，只要知道 $X$ 的取值能够减少你对 $Y$ 结果的不确定性，互信息就能敏锐捕获这种深层依赖关系！

### 核心概念与符号对照表
| 核心概念 | 符号 / 公式 | 测量目标与数值范围 | 核心优缺点 |
| --- | --- | --- | --- |
| **皮尔逊相关** | $r = \\frac{\\text{Cov}(X, Y)}{\\sigma_X \\sigma_Y}$ | 测量**严格线性关系**，取值 $[-1, 1]$ | 计算极快，但对非线性关系完全失明 |
| **斯皮尔曼相关** | $\\rho = 1 - \\frac{6 \\sum d_i^2}{n(n^2-1)}$ | 测量**单调非线性关系**，取值 $[-1, 1]$ | 抗离群点干扰，适用于等级/有序变量 |
| **互信息** | $I(X; Y) = D_{\\text{KL}}(P_{XY} \\parallel P_X P_Y)$ | 测量**任意线性和非线性依赖**，$\\ge 0$ | 捕捉复杂依赖，但计算复杂度相对较高 |
| **方差膨胀因子** | $\\text{VIF}_j = \\frac{1}{1 - R_j^2}$ | 评估该特征被其他所有特征线性拟合的程度 | $\\text{VIF} > 10$ 表明存在极其严重的多重共线性 |

### 数学原理与逐步推导
#### 1. 互信息（Mutual Information）的第一性原理
在信息论中，香农熵 $H(Y)$ 衡量了随机变量 $Y$ 自身的初始不确定性：
$$H(Y) = -\\int p(y) \\log p(y) dy$$
当我们在观察到特征 $X$ 之后，关于 $Y$ 的剩余不确定性由条件熵（Conditional Entropy）刻画：
$$H(Y \\mid X) = -\\iint p(x, y) \\log p(y \\mid x) dx dy$$
特征 $X$ 与目标 $Y$ 之间的**互信息 $I(X; Y)$** 定义为初始不确定性由于获知 $X$ 而消除的信息增益：
$$I(X; Y) = H(Y) - H(Y \\mid X) = \\iint p(x, y) \\log \\frac{p(x, y)}{p(x) p(y)} dx dy$$
**数学性质**：
1. **非负性**：$I(X; Y) \\ge 0$；当且仅当 $X$ 与 $Y$ 完全统计独立时，$p(x, y) = p(x)p(y)$，积分项为 $\\log(1) = 0$；
2. **非线性感知**：若存在确定性函数关系 $Y = g(X)$（即使是非单调的二次抛物线），在给定 $X$ 条件下 $Y$ 没有任何残留不确定性（$H(Y \\mid X) = 0$），互信息取得极大值 $I(X; Y) = H(Y)$！这是皮尔逊和斯皮尔曼根本无法比拟的理论优势。

### 几何图景与计算图
```
三种典型关系在不同度量下的表现对比：
关系类型 1: 严格线性 Y = 2X          关系类型 2: 单调非线性 Y = X^3       关系类型 3: 非单调二次 Y = X^2
   Y ^                                 Y ^                                 Y ^
     │     /                             │          /                        │    \     /
     │    /                              │        /                          │     \   /
     │   /                               │       /                           │      \ /
     └───────▶ X                         └───────▶ X                         └───────▶ X
  Pearson  = 1.00                     Pearson  = 0.85                     Pearson  ≈ 0.00 (完全失明!)
  Spearman = 1.00                     Spearman = 1.00                     Spearman ≈ 0.00 (完全失明!)
  MutualInfo 高                       MutualInfo 高                       MutualInfo 极高 (洞若观火!)
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：皮尔逊相关系数为 0 代表两特征相互独立
> **完全不成立！** 只有对于多元正态分布，不相关才等价于独立。对于一般分布，相关系数为 0 仅仅代表“没有一阶线性关系”，它们之间可能存在极其强烈的非线性函数关联（如二次关系、周期正弦关系）。**判断真正独立性必须使用互信息或距离相关（Distance Correlation）**。

### 工业界实践与工程考量
- 在高维表格建模中，特征之间严重的共线性会导致特征重要性被强行分散（如两个相同特征的重要性各自减半）。在特征初筛阶段，标准的工业流水线是：
  1. 计算特征间 Pearson 矩阵，若某对特征相关系数 $|r| > 0.95$，通过贪心法直接剔除其中一列；
  2. 使用 `sklearn.feature_selection.mutual_info_classif / mutual_info_regression` 对非线性特征进行快速过滤排名，保留 Top $K$ 强关联特征。

### 延伸思考与进阶阅读
- 阅读 Thomas M. Cover, Joy A. Thomas《Elements of Information Theory》第 2 章：互信息与熵。
- 思考：为什么决策树的节点切分准则（如 ID3/C4.5 的信息增益）在本质上完全等价于最大化特征与离散类别的互信息？

### 本节小结
- Pearson 限度在线性，Spearman 覆盖单调性，互信息通吃任意复杂非线性依赖；
- 多重共线性导致参数估计方差暴增，必须通过 VIF 和高相关去重进行严格治理。"""

    l2_code = """import numpy as np
from scipy import stats
from sklearn.feature_selection import mutual_info_regression

# 构造三种具有代表性的特征与目标关系数据集 (200 个样本)
np.random.seed(42)
x = np.linspace(-3.0, 3.0, 200)

# 案例 1: 纯线性关系
y_linear = 2.0 * x + np.random.normal(0, 0.2, size=200)

# 案例 2: 单调非线性关系 (三次曲线)
y_monotonic = x**3 + np.random.normal(0, 0.5, size=200)

# 案例 3: 严格非单调非线性关系 (对称二次抛物线)
y_quadratic = x**2 + np.random.normal(0, 0.1, size=200)

cases = [
    ("1. 纯线性关系 (Y = 2X + e)", y_linear),
    ("2. 单调非线性 (Y = X^3 + e)", y_monotonic),
    ("3. 非单调二次 (Y = X^2 + e)", y_quadratic)
]

print("=== 三种相关性度量在不同数据拓扑下的表现对比 ===")
print(f"{'关系模式':<28} | {'Pearson (线性)':<15} | {'Spearman (单调)':<15} | {'互信息 MI (全能)':<15}")
print("-" * 80)

for name, y_data in cases:
    # 1. Pearson 相关系数
    p_corr, _ = stats.pearsonr(x, y_data)
    # 2. Spearman 秩相关系数
    s_corr, _ = stats.spearmanr(x, y_data)
    # 3. 互信息评估
    mi = mutual_info_regression(x.reshape(-1, 1), y_data, random_state=42)[0]

    print(f"{name:<28} | {p_corr:^15.4f} | {s_corr:^15.4f} | {mi:^15.4f}")

print("-" * 80)
print("关键发现: 在案例 3 对称二次抛物线中，Pearson 和 Spearman 彻底失明 (接近 0)，而互信息依然精准探测出极高的关联依赖！")
"""

    lesson_2 = lesson(
        lesson_id="ml-data-l4-2",
        title="双变量与多变量相关性：穿透 Pearson/Spearman/互信息迷雾",
        content=l2_content,
        difficulty=3,
        tips=[
            tip("警惕相关系数为零的假象：对非线性问题切忌单看 Pearson 矩阵，善用互信息 `mutual_info_regression` 发现隐藏的高阶预测信号。", "interview"),
            tip("共线性双胞胎特征剔除：训练模型前若发现两个特征相关系数 > 0.98，必须果断剔除一个，否则会导致模型解释性崩塌和权重符号混乱。", "pitfall")
        ],
        demos=[
            demo(code=l2_code, title="线性、单调与抛物线数据下 Pearson / Spearman / 互信息实测对比")
        ]
    )

    # ── Lesson 4.3 ──
    l3_content = """### 学习目标
学完本节，你应该能够：
1. 掌握自动化探索性数据分析（Automated EDA）的核心框架与设计哲学；
2. 深刻辨析训练集与测试集之间的**协变量漂移（Covariate Shift）**与数据分布漂移机理；
3. 掌握机器学习领域的隐蔽神器：**对抗验证（Adversarial Validation）**的数学原理与实施步骤；
4. 熟练利用对抗验证的 ROC-AUC 得分量化数据集划分偏差，精准揪出造成分布漂移的罪魁祸首特征；
5. 编写代码从零实现对抗验证流程，并基于特征重要性剔除漂移特征以校准分布对齐。

### 前置知识
- 二分类逻辑回归与决策树基线；
- ROC 曲线与 AUC 指标。

### 问题背景与 ML 用途
在真实的机器学习竞赛与工业界交付中，算法工程师经常会遭遇这样的“惊天大坑”：
- 本地交叉验证（CV）分明达到了 92% 的惊人准确率；
- 一旦上线或提交到测试榜单，线上分数惨跌到 70%！
为什么会出现如此严重的泛化灾难？
- 训练集数据来自 2025 年，而测试集数据来自 2026 年（时间漂移）；
- 训练集采自一线城市用户，测试集采自三四线城市用户（地域人群偏置）；
- 数据生成环境发生了根本性的**协变量漂移（Covariate Shift, $P_{\\text{train}}(\\mathbf{x}) \\neq P_{\\text{test}}(\\mathbf{x})$）**。
如何提前、精准地发现这种隐蔽的分布断崖？
**对抗验证（Adversarial Validation）是现代机器学习中检验训练集与测试集是否同分布的黄金试金石**。

### 直觉理解
- **火眼金睛辨雌雄（对抗验证直觉）**：我们训练一个“辨别真假钞票的质检员”。我们把训练集的样本全部贴上标签 `0`，测试集的样本全部贴上标签 `1`（扔掉原本的业务目标）。然后，让一个机器学习分类器（比如逻辑回归或 LightGBM）去尝试区分：“这条数据到底来自训练集还是测试集？”
  - 如果分类器的 ROC-AUC 只有 **0.50**（相当于闭着眼睛瞎猜），恭喜你！这意味着训练集和测试集**在特征分布上完美融合、毫无破绽、无懈可击**！
  - 如果分类器的 ROC-AUC 高达 **0.95**，说明训练集和测试集有巨大的人工裂痕。此时只要看一下分类器最看重的特征重要性（Feature Importance），就能瞬间抓出是谁在“泄露天机”导致了分布脱节！

### 核心概念与符号对照表
| 核心概念 | 术语 / 工具 | 数学与工程原理 | 在机器学习中的核心用途 |
| --- | --- | --- | --- |
| **协变量漂移** | **Covariate Shift** | $P_{\\text{train}}(\\mathbf{x}) \\neq P_{\\text{test}}(\\mathbf{x})$ 但 $P(y \\mid \\mathbf{x})$ 保持恒定 | 本地 CV 虚高、线上模型失效根源 |
| **对抗验证** | **Adversarial Validation** | 设定 $y=0$（训练集），$y=1$（测试集），训练分类模型 | 检验数据集划分健康度、检测分布漂移 |
| **无偏对齐基准** | $\\text{AUC} \\approx 0.5$ | 判别模型完全无法区分样本来自哪个集合 | 保证本地验证集高度可信与可复现 |
| **漂移严重告警** | $\\text{AUC} > 0.75$ | 存在强区分性漂移特征（如时间戳、特定批次 ID） | 触发特征剔除或重要性加权（Importance Weighting） |
| **自动化 EDA 引擎** | Auto-EDA | 自动批量生成缺失率、零值率、高相关对与偏度报告 | 项目立项首日 10 分钟建立全景认知 |

### 数学原理与逐步推导
#### 1. 对抗验证与样本重要性采样加权（Density Ratio Estimation）
设训练集样本生成分布为 $p_{\\text{tr}}(\\mathbf{x})$，测试集生成分布为 $p_{\\text{te}}(\\mathbf{x})$。
在训练对抗验证模型时，设样本来自测试集的先验概率为 $P(y=1) = \\frac{N_{\\text{te}}}{N_{\\text{tr}} + N_{\\text{te}}} = \\alpha$。
根据贝叶斯定理，对抗分类器预测出的后验概率为：
$$P(y=1 \\mid \\mathbf{x}) = \\frac{p_{\\text{te}}(\\mathbf{x}) \\alpha}{p_{\\text{te}}(\\mathbf{x}) \\alpha + p_{\\text{tr}}(\\mathbf{x}) (1 - \\alpha)}$$
两边整理，可以求出训练分布与测试分布的**概率密度比（Density Ratio）**：
$$w(\\mathbf{x}) = \\frac{p_{\\text{te}}(\\mathbf{x})}{p_{\\text{tr}}(\\mathbf{x})} = \\frac{1 - \\alpha}{\\alpha} \\cdot \\frac{P(y=1 \\mid \\mathbf{x})}{1 - P(y=1 \\mid \\mathbf{x})}$$
**数学神迹**：
对抗验证不仅能通过 AUC 发现漂移，更能直接利用模型输出的预测几率比（Odds）计算出每个训练样本的**重要性权重 $w(\\mathbf{x}_i)$**！
将这些权重赋给最终业务模型的损失函数（加权经验风险）：
$$\\min_{\\boldsymbol{\\theta}} \\sum_{i=1}^{N_{\\text{tr}}} w(\\mathbf{x}_i) \\mathcal{L}(f(\\mathbf{x}_i; \\boldsymbol{\\theta}), y_i)$$
这样就在数学上**将有偏的训练损失期望，精准纠正映射为测试集上的无偏泛化期望**！

### 几何图景与计算图
```
对抗验证工作流图解：
训练集特征 X_train (贴上标签 y=0) ──┐
                                     ├──▶ 合并全集 ──▶ 训练二分类判别器
测试集特征 X_test  (贴上标签 y=1) ──┘                  │
                                                      ▼ 评估交叉验证 ROC-AUC
                 ┌────────────────────────────────────┴────────────────────────────────────┐
                 ▼                                                                         ▼
           AUC ≈ 0.50                                                                AUC > 0.80
     【分布完全一致，绿色通行】                                                【存在严重分布漂移，红色警报】
   本地 CV 与线上测试集紧密对齐                                         查看特征重要性，剔除头号漂移特征!
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：对抗验证 AUC 很高时，把所有高重要性特征全删了
> 如果某个高重要性特征是导致分布漂移的元凶（比如一个随着时间不断增长的自增订单 ID），删除它是完全正确的；但如果某个特征既有分布漂移，同时又包含极强的真实业务因果预测力（例如经济危机下的宏观通胀率），直接删除会导致模型完全丧失预测能力。此时更高级的处理是做**差分变换**（将其变为环比增长率）使其分布平稳化，或使用密度比加权。

### 工业界实践与工程考量
- 在现代机器学习竞赛与敏捷开发中，新项目进入的第一周，资深工程师的第一项任务就是搭建对抗验证脚本。只有当对抗验证确认训练集与测试集没有荒谬的人工伪影后，团队才会启动复杂的模型调参。自动化 EDA 工具（如 Sweetviz 或 YData Profiling）则被用于快速产出第一版数据质量基线 HTML 报告。

### 延伸思考与进阶阅读
- 阅读 Masashi Sugiyama, Motoaki Kawanabe《Machine Learning in Non-Stationary Environments: Introduction to Covariate Shift Adaptation》。
- 思考：在时间序列预测中，如果测试集是未来的 1 个月，通常本地交叉验证应该采用随机 K-Fold 还是基于时间的 Rolling-Window 划分？对抗验证能帮我们挑选出最具代表性的本地验证集吗？

### 本节小结
- 自动化 EDA 是快速把握数据全景与清洗漏洞的高效工具；
- 对抗验证通过让模型尝试区分训练集与测试集，以 AUC 指标为探针精准诊断协变量漂移。"""

    l3_code = """import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score

# 构造模拟场景: 演示如何利用对抗验证检测数据漂移 (Covariate Shift)
np.random.seed(42)
n_train = 500
n_test = 500

# 特征 1 (age): 训练集与测试集分布完全一致 ~ N(35, 10)
age_train = np.random.normal(35, 10, size=n_train)
age_test = np.random.normal(35, 10, size=n_test)

# 特征 2 (income): 训练集与测试集分布一致 ~ N(8000, 2000)
income_train = np.random.normal(8000, 2000, size=n_train)
income_test = np.random.normal(8000, 2000, size=n_test)

# 特征 3 (app_version_code): 发生严重的时间漂移！(测试集使用了新版本)
version_train = np.random.normal(1.0, 0.2, size=n_train)
version_test = np.random.normal(2.5, 0.2, size=n_test) # 测试集均值严重偏离!

X_train = np.column_stack([age_train, income_train, version_train])
X_test = np.column_stack([age_test, income_test, version_test])
feature_names = ['age', 'income', 'app_version_code']

# 1. 构建对抗验证数据集: 训练集为 0, 测试集为 1
X_adv = np.vstack([X_train, X_test])
y_adv = np.array([0] * n_train + [1] * n_test)

# 2. 训练对抗分类判别器
clf = LogisticRegression()
clf.fit(X_adv, y_adv)
pred_probs = clf.predict_proba(X_adv)[:, 1]
auc_score = roc_auc_score(y_adv, pred_probs)

print(f"=== 对抗验证判别模型 ROC-AUC: {auc_score:.4f} ===")
if auc_score > 0.75:
    print("警报！AUC 显著高于 0.50，说明训练集与测试集存在严重的分布漂移（Covariate Shift）！")
    # 查看判别器各特征绝对权重，揪出罪魁祸首
    weights = np.abs(clf.coef_[0])
    for name, w in zip(feature_names, weights):
        print(f"  特征 [{name:<18}]: 判别权重贡献 = {w:.4f}")
    culprit = feature_names[np.argmax(weights)]
    print(f"\\n诊断结论: 头号漂移特征是 【{culprit}】，应在建模前将其剔除或重构归一化！")
else:
    print("恭喜！AUC 接近 0.50，两数据集分布良好融合。")
"""

    lesson_3 = lesson(
        lesson_id="ml-data-l4-3",
        title="自动化 EDA 与关键业务假设探索：对抗验证侦测分布漂移",
        content=l3_content,
        difficulty=3,
        tips=[
            tip("对抗验证 AUC 指南：AUC 处于 0.50~0.60 属于优秀对齐；若 > 0.80 必须优先查看特征重要性剔除漂移严重的泄漏特征。", "interview"),
            tip("时序划分严禁随机打乱：在时间序列问题中，切忌使用随机 K-Fold，必须使用 TimeSeriesSplit 严格按时间切分验证集。", "pitfall")
        ],
        demos=[
            demo(code=l3_code, title="从零实现对抗验证流程并诊断协变量漂移特征")
        ]
    )

    lessons = [lesson_1, lesson_2, lesson_3]

    # ── Exercises for Chapter 4 ──
    exercises = [
        single_choice(
            ex_id="ml-data-c4-ex1",
            question="在探索性数据分析中，若某特征与预测目标之间存在如 $y = x^2$ 的完美对称二次抛物线关系，计算得到的皮尔逊相关系数（Pearson）与互信息（Mutual Information）通常会表现为：",
            options=[
                {"value": "A", "text": "皮尔逊相关系数接近 0（对非线性关系完全失明），而互信息显著大于 0（能够精准捕获非线性依赖）"},
                {"value": "B", "text": "两者都严格等于 1.0"},
                {"value": "C", "text": "皮尔逊相关系数严格等于 1.0，而互信息为 0"},
                {"value": "D", "text": "两者都会抛出数学不可计算异常"},
            ],
            answer="A",
            explanation="皮尔逊相关系数仅能度量严格的线性依赖，在对称非线性关系中正负协方差相互抵消导致相关系数接近 0；而互信息建立在香农熵之上，能够捕获任何形式的线性和非线性函数依赖。",
            difficulty=2,
            related_lesson_id="ml-data-l4-2",
            tags=["相关性度量", "Pearson", "互信息", "非线性依赖"],
        ),
        judge(
            ex_id="ml-data-c4-ex2",
            question="对于以 GBDT（如 LightGBM、XGBoost）或随机森林为主构建的树模型流水线，对长尾右偏数值特征进行对数变换（`np.log1p`）通常不会改变树模型的切分点优劣，因为基于单特征排序的树切分对严格单调递增变换具有天然免疫性。",
            answer=True,
            explanation="正确。决策树寻找最优划分点仅依赖特征值的排序位次（Rank）。对数变换是严格单调递增变换，完全不改变样本的大小先后顺序，因此树模型的树结构与预测输出在理论上完全等价。",
            difficulty=2,
            related_lesson_id="ml-data-l4-1",
            tags=["树模型性质", "单调变换", "log1p适用性"],
        ),
        multiple_choice(
            ex_id="ml-data-c4-ex3",
            question="在进行对抗验证（Adversarial Validation）以诊断训练集与测试集是否存在分布漂移时，下列步骤与结论正确的有：",
            options=[
                {"value": "A", "text": "将训练集样本打上标签 0，测试集样本打上标签 1，合并后训练二分类器"},
                {"value": "B", "text": "若训练得到的分类器在交叉验证上的 ROC-AUC 接近 0.50，说明训练集与测试集分布高度一致，本地验证集可靠"},
                {"value": "C", "text": "若分类器的 ROC-AUC 高达 0.95，可以通过查看特征重要性（Feature Importance）定位引起分布差异的特征"},
                {"value": "D", "text": "对抗验证必须使用真实的业务目标标签 $y$ 参与训练"},
            ],
            answer=["A", "B", "C"],
            explanation="A、B、C 均为对抗验证的标准机制。D 是错误的：对抗验证必须彻底丢弃原业务标签，重新构造一个二分类人工标签（训练集为 0，测试集为 1），专门检验特征空间本身的协变量漂移。",
            difficulty=3,
            related_lesson_id="ml-data-l4-3",
            tags=["对抗验证", "CovariateShift", "ROC-AUC", "数据漂移诊断"],
        ),
        fill(
            ex_id="ml-data-c4-ex4",
            question="在统计学中，度量概率分布不对称程度的三阶标准化中心矩被称为 ____（Skewness）；度量尾部厚重与尖锐程度的四阶统计量被称为 ____（Kurtosis）。",
            blanks=[
                ["偏度", "偏度系数", "Skewness"],
                ["峰度", "超额峰度", "峰度系数", "Kurtosis"]
            ],
            explanation="三阶标准化中心矩为偏度（Skewness），四阶标准化矩减 3 为超额峰度（Kurtosis）。",
            difficulty=2,
            related_lesson_id="ml-data-l4-1",
            tags=["偏度", "峰度", "高阶矩"],
        ),
        open_ex(
            ex_id="ml-data-c4-ex5",
            question="【架构推导题】请系统回答关于**对抗验证（Adversarial Validation）**的理论机制与落地行动指南：\n1. 明确写出对抗验证的构建流程与标签构造方法；\n2. 解释当分类器 ROC-AUC 分数分别处于 $\\approx 0.50$ 和 $> 0.85$ 时，所代表的统计学含义；\n3. 当发现对抗验证 AUC 严重偏高（如 0.92）时，算法工程师应按照什么排查步骤逐步解决该问题？",
            reference_answer="""对抗验证理论与落地指南如下：
1. 构建流程与标签构造：
   - 彻底丢弃训练集和测试集原本的业务预测目标标签 $y$；
   - 为全量训练集样本赋予人工伪标签 $y_{\\text{adv}} = 0$，为全量测试集样本赋予人工伪标签 $y_{\\text{adv}} = 1$；
   - 将两个数据集按行堆叠合并，在合并后的数据集上训练一个二分类判别模型（如逻辑回归、LightGBM），并通过严谨的交叉验证评估该模型的 ROC-AUC 得分。

2. AUC 分数的统计学涵义：
   - $\\text{AUC} \\approx 0.50$：判别模型在特征空间中完全无法区分一个样本到底来自训练集还是测试集（表现等同于随机掷硬币猜测）。这证明训练集与测试集的特征分布高度一致（无协变量漂移），本地交叉验证指标能高度真实地反映线上泛化表现；
   - $\\text{AUC} > 0.85$：判别模型能够极其轻易地将两集合样本彻底区分开。这证明训练集与测试集在特征空间中存在严重的人工割裂或分布漂移（Covariate Shift），本地验证结果将极不可信。

3. 发现高 AUC 后的工程排查步骤：
   - 提取判别模型的特征重要性（Feature Importance），按权重从高到低排列；
   - 检查排名前列的高贡献特征：
     a. 若为自增 ID、批次编号、时间戳等非物理因果特征，确认存在时间/批次泄漏，直接将该特征从建模特征集中剔除；
     b. 若为核心业务特征（如均值发生漂移的宏观变量），对其进行比率化、差分平稳化或分位数标准化重构；
   - 重新执行对抗验证，观察 AUC 是否顺利下降至 0.60 以下安全区间；
   - 若某些业务强特征确实存在天然漂移且无法剔除，利用对抗验证预测出的几率比（Odds）计算重要性采样权重，在训练最终模型时加权损失函数。""",
            explanation="系统阐释对抗验证的标签设计、AUC 统计涵义与完整的工业排查治理流程，具有极高架构实战指导价值。",
            rubric=[
                {"point": "明确叙述丢弃原标签并构建 y=0 (Train) / y=1 (Test) 的流程", "score": 25},
                {"point": "准确解释 AUC 约 0.50 (无漂移) 与 > 0.85 (严重漂移) 的统计物理内涵", "score": 25},
                {"point": "清晰阐明通过特征重要性抓取元凶特征并进行剔除或平稳化重构的步骤", "score": 25},
                {"point": "提及重要性采样加权等高阶治理策略，论述具备专业深度", "score": 25},
            ],
            difficulty=4,
            related_lesson_id="ml-data-l4-3",
            tags=["对抗验证", "CovariateShift", "分布对齐", "模型验证工程"],
        ),
        # ── Code Exercise 4 ──
        {
            "id": "ml-data-c4-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】实现特征与目标相关性多维度分析评估器：\n编写函数 `calculate_feature_correlations(X, y)`：\n接收一个 2D NumPy 数组或嵌套列表 $X \\in \\mathbb{R}^{n \\times d}$（包含 $d$ 个特征列）和一个 1D 数组或列表 $y \\in \\mathbb{R}^n$（目标标签）。\n遍历每一个特征列 $j = 0, \\dots, d-1$：\n1. 计算特征与目标的皮尔逊线性相关系数（Pearson $r$）；\n2. 计算特征与目标的斯皮尔曼秩相关系数（Spearman $\\rho$）。\n\n返回一个 Python 列表，其中每个元素为元组 `(pearson_r, spearman_rho)`（两个浮点数均使用 `round(..., 4)` 保留 4 位小数）。\n\n最后一行请返回调用示例在测试数据 `X_demo = [[1.0, 10.0], [2.0, 9.0], [3.0, 7.0], [4.0, 4.0], [5.0, 0.0]]`, `y_demo = [2.0, 4.0, 6.0, 8.0, 10.0]` 下的计算结果。",
            "starterCode": "import numpy as np\nfrom scipy import stats\n\ndef calculate_feature_correlations(X, y) -> list:\n    \"\"\"计算各特征与目标的 Pearson 线性相关和 Spearman 秩相关系数\"\"\"\n    # 请在此实现\n    ___\n\nX_demo = [[1.0, 10.0], [2.0, 9.0], [3.0, 7.0], [4.0, 4.0], [5.0, 0.0]]\ny_demo = [2.0, 4.0, 6.0, 8.0, 10.0]\ncalculate_feature_correlations(X_demo, y_demo)\n",
            "setupCode": "",
            "expectedOutput": "[(1.0, 1.0), (-0.9731, -1.0)]",
            "answer": "import numpy as np\nfrom scipy import stats\n\ndef calculate_feature_correlations(X, y) -> list:\n    X = np.array(X, dtype=float)\n    y = np.array(y, dtype=float)\n    d = X.shape[1]\n    res = []\n    for j in range(d):\n        xj = X[:, j]\n        p_corr, _ = stats.pearsonr(xj, y)\n        s_corr, _ = stats.spearmanr(xj, y)\n        res.append((round(float(p_corr), 4), round(float(s_corr), 4)))\n    return res\n\nX_demo = [[1.0, 10.0], [2.0, 9.0], [3.0, 7.0], [4.0, 4.0], [5.0, 0.0]]\ny_demo = [2.0, 4.0, 6.0, 8.0, 10.0]\ncalculate_feature_correlations(X_demo, y_demo)\n",
            "tests": "X_t = [[1.0], [2.0], [3.0]]\ny_t = [1.0, 2.0, 3.0]\nres_t = calculate_feature_correlations(X_t, y_t)\nassert res_t == [(1.0, 1.0)], f\"计算结果有误: {res_t}\"\n",
            "explanation": "使用 scipy.stats.pearsonr 与 spearmanr 分别计算各特征维度的线性与单调秩相关系数。",
            "tags": ["Pearson", "Spearman", "相关性分析", "SciPy编程实战"],
            "related_lesson_id": "ml-data-l4-2",
        },
        single_choice(
            ex_id="ml-data-c4-ex7",
            question="在进行非线性特征正态化变换时，若特征数据中包含大量小于或等于 0 的负实数，下列哪种幂变换方法在数学上能够合法处理负数并自动搜索最优正态参数？",
            options=[
                {"value": "A", "text": "Yeo-Johnson 变换（`PowerTransformer(method='yeo-johnson')`）"},
                {"value": "B", "text": "标准 Box-Cox 变换"},
                {"value": "C", "text": "纯自然对数变换 `np.log`"},
                {"value": "D", "text": "`np.log1p`"},
            ],
            answer="A",
            explanation="标准 Box-Cox 变换严格要求数据严格大于 0（$y > 0$），遇到负数会抛出 ValueError；而 Yeo-Johnson 变换扩展了分段幂变换公式，对正数和非正数采用平滑对偶公式，是 Scikit-learn 官方支持负数的通用正态幂变换引擎。",
            difficulty=2,
            related_lesson_id="ml-data-l4-1",
            tags=["Yeo-Johnson", "Box-Cox", "负数处理", "幂变换"],
        ),
    ]

    return chapter(
        chapter_id="ml-data-c4",
        course_id="ml-python-data",
        order=4,
        title="统计探索性数据分析（EDA）与可解释可视化",
        goal="掌握偏度/峰度与幂变换校正，透彻辨析 Pearson/Spearman/互信息，掌握对抗验证检测协变量漂移。",
        lessons=lessons,
        exercises=exercises,
    )
