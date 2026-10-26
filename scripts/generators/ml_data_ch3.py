# -*- coding: utf-8 -*-
"""
Chapter 3: 数据清洗：缺失值、异常值与数据质量 (Data Cleaning: Missing Values, Outliers & Quality)
Course: ml-python-data
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_3():
    # ── Lesson 3.1 ──
    l1_content = """### 学习目标
学完本节，你应该能够：
1. 掌握统计学大师 Donald Rubin 提出的三类核心数据缺失机制：**完全随机缺失（MCAR）**、**随机缺失（MAR）**与**非随机缺失（MNAR）**；
2. 深刻理解为什么盲目删除含有缺失值的行（Complete Case Analysis）会导致严重的样本选择性偏差（Selection Bias）；
3. 掌握简单填补法（均值、中位数、众数填补）的局限性，熟练运用缺失指示器（`MissingIndicator`）保留缺失本身的预测信号；
4. 掌握多重插补与基于近邻/树模型的链式方程插补（`KNNImputer` 与 `IterativeImputer` MICE）；
5. 编写代码对包含不同缺失机制的数据集进行多种插补策略评估，对比重构均方误差与分布失真程度。

### 前置知识
- 条件概率与联合分布基础；
- 矩阵缺失值 NaN 与布尔掩码。

### 问题背景与 ML 用途
在工业界现实世界中，“干净整洁的数据”只存在于教科书中：
- 医疗诊断数据中，医生通常只对怀疑患有特定疾病的患者开具昂贵的生化检查（缺失与病理高度相关）；
- 问卷调查中，高收入人群往往倾向于拒绝透露具体年收入（缺失值本身就意味着“收入极高”）；
- 工业物联网传感器在遭遇电压冲击或网络断开时发生连续断流。
很多初学者遇到缺失值直接调用 `df.dropna()` 一删了之：
- 如果一个数据集有 50 个特征，每个特征只有 2% 的随机缺失，直接 `dropna` 会导致超过 60% 的宝贵样本被粗暴丢弃！
- 如果缺失是非随机的（MNAR），直接删除会彻底扭曲训练集的样本分布，导致模型在生产环境遭遇灾难性泛化失败。
**科学诊断缺失机制并选择最相容的填补策略，是保证机器学习数据质量的第一道防线**。

### 直觉理解
- **侦探看空抽屉**：一个抽屉是空的，有三种完全不同的可能：
  1. 房主随机扔掷硬币决定今天不放东西（**MCAR**：纯属偶然，与房间内任何秘密都无关）；
  2. 房主在雨天总是忘记带钥匙所以抽屉空着，但只要看一眼窗外的天气预报就能完美解释（**MAR**：缺失依赖于我们已知的其他可观测变量）；
  3. 抽屉里放的是绝密机密文件，正因为内容太敏感所以房主特意锁在保险柜里留出空抽屉（**MNAR**：缺失本身就取决于这个变量自身的极端取值！）。
- 对第三种情况，如果你把空抽屉直接填上全家杂物的“平均值”，你实际上在亲手销毁最有价值的机密线索！

### 核心概念与符号对照表
| 核心概念 | 符号 / 术语 | 概率数学定义 | 最佳处理策略 |
| --- | --- | --- | --- |
| **完全随机缺失** | **MCAR** | $P(R \\mid Y_{\\text{obs}}, Y_{\\text{mis}}) = P(R)$ | 均值/中位数填补、多重插补 |
| **随机缺失** | **MAR** | $P(R \\mid Y_{\\text{obs}}, Y_{\\text{mis}}) = P(R \\mid Y_{\\text{obs}})$ | 基于其他特征的回归/KNN 协同填补 |
| **非随机缺失** | **MNAR** | $P(R \\mid Y_{\\text{obs}}, Y_{\\text{mis}})$ 依赖于未观测值 $Y_{\\text{mis}}$ 自身 | **必须增加 `MissingIndicator` 缺失标记列** |
| **缺失指示矩阵** | $M \\in \\{0, 1\\}^{N \\times d}$ | $M_{ij} = 1$ 若 $X_{ij}$ 为缺失，否则为 0 | 将“缺失”本身作为特征显式传给模型 |
| **KNN 插补** | `KNNImputer` | 寻找特征最相似的 $k$ 个邻居的加权平均填补 | 捕获非线性局部流形关联 |

### 数学原理与逐步推导
#### 1. 单纯均值填补对方差的系统性压缩
设特征 $X$ 的真实总体方差为 $\\sigma^2$。假设有比例为 $p \\in (0, 1)$ 的数据点发生完全随机缺失（MCAR）。
若采用最常见的**均值填补（Mean Imputation）**，将所有缺失位置全部用观测均值 $\\bar{X}$ 代替。
考察填补后新特征 $X^*$ 的样本方差 $S_*^2$：
$$S_*^2 = \\frac{1}{N-1} \\sum_{i=1}^N (x_i^* - \\bar{X})^2$$
由于被填补的 $p N$ 个数据点其取值恰好等于 $\\bar{X}$，它们在离差平方和中的贡献严格为零：
$$(x_i^* - \\bar{X})^2 = (\\bar{X} - \\bar{X})^2 = 0$$
因此总平方和仅仅来源于未缺失的那 $(1-p)N$ 个样本：
$$\\sum_{i=1}^N (x_i^* - \\bar{X})^2 = \\sum_{i \\in \\text{Obs}} (x_i - \\bar{X})^2 \\approx (1 - p) N \\sigma^2$$
除以总样本量 $N$ 后得到：
$$\\text{Var}(X^*) \\approx (1 - p) \\sigma^2 < \\sigma^2$$
**数学结论**：单纯均值填补会**以比例 $(1-p)$ 系统性人工低估该特征的真实方差**！这不仅人为拔高了分布的峰度（尖峰化），还会严重低估特征之间的协方差与相关性系数，削弱依赖协方差矩阵的模型（如线性回归、PCA、LDA）的判定能力。
**对策**：在填补的同时，必须联合使用 `sklearn.impute.MissingIndicator` 新增一个二值指示列，告诉模型哪些数值是人工合成的估计值。

### 几何图景与计算图
```
缺失值填补后的几何分布异变：
真实分布 (正态 Bell Curve):
          _---_
        /       \
      /           \
    -----------------

单纯均值填补后的畸形分布 (方差被人为压缩，均值处出现虚假极尖脉冲!):
            ||  <-- 极尖脉冲 (方差萎缩，低估真实不确定性)
          / || \
        /   ||   \
      /     ||     \
    -----------------
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：树模型（XGBoost/LightGBM）不需要任何填补，所以我就完全不管缺失值了
> XGBoost 和 LightGBM 确实具有原生的缺失值分支自学习能力（将缺失值统一切分到最优子节点）。但这**仅限于纯数值的单列切分**！如果你的下游流水线包含特征缩放（`StandardScaler`）、主成分分析（`PCA`）或任何线性层，传入 `NaN` 会直接抛出异常导致整个 Pipeline 瘫痪！工程标准流水线依然必须定义明确的填补步骤。

### 工业界实践与工程考量
- 工业界在处理 MNAR（非随机缺失）特征时，最佳工程实践是：**中位数填补 + MissingIndicator**。中位数具备抗极端离群点能力，而额外的 0/1 指示列直接将“该样本是否选择不透露该项信息”作为一个强预测信号提供给树模型，实战效果往往超越复杂的 MICE 多重插补。

### 延伸思考与进阶阅读
- 阅读 Roderick J. A. Little, Donald B. Rubin 经典巨著《Statistical Analysis with Missing Data》第 1 章。
- 思考：在信用评分卡开发中，为什么业务专家常常将缺失值作为一个独立的“特殊分箱（Special Bin）”单独赋予评分，而不是直接填补为 0？

### 本节小结
- 区分 MCAR、MAR 与 MNAR 是科学处理缺失的前提；
- 均值填补会人为萎缩方差，结合 `MissingIndicator` 或高级插补（KNN/Iterative）能够最大程度保留原始信息流。"""

    l1_code = """import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer, KNNImputer, MissingIndicator

# 构造一个 2 维相关特征数据集 (包含 10 个样本)
np.random.seed(42)
X_true = np.array([
    [1.0, 2.1], [2.0, 3.9], [3.0, 6.2], [4.0, 7.8], [5.0, 10.1],
    [6.0, 11.9], [7.0, 14.2], [8.0, 15.9], [9.0, 18.1], [10.0, 20.2]
])

# 人为引入随机缺失 (MAR: 第 1 维在样本大时缺失第 2 维特征)
X_missing = X_true.copy()
X_missing[2, 1] = np.nan
X_missing[6, 1] = np.nan
X_missing[8, 0] = np.nan

df_miss = pd.DataFrame(X_missing, columns=['feature_A', 'feature_B'])
print("=== 带有缺失值的数据集 ===")
print(df_miss)

# 1. 均值填补 + 缺失指示器 (MissingIndicator)
mean_imp = SimpleImputer(strategy='mean')
indicator = MissingIndicator()

X_mean_filled = mean_imp.fit_transform(X_missing)
missing_mask = indicator.fit_transform(X_missing)

print("\\n=== 1. 均值填补结果 (注意方差会被压缩) ===")
print(np.round(X_mean_filled, 2))
print("缺失指示矩阵 (1 代表该位置原先缺失):\\n", missing_mask.astype(int))

# 2. KNN 插补 (基于特征间线性/流形相关性进行协同插补)
knn_imp = KNNImputer(n_neighbors=2)
X_knn_filled = knn_imp.fit_transform(X_missing)

print("\\n=== 2. KNN 插补结果 (利用 A 和 B 的强正相关性精准推断) ===")
print(np.round(X_knn_filled, 2))

# 对比第 2 行真实值 [3.0, 6.2] 的恢复精度:
print(f"\\n样本 2 真实值: {X_true[2, 1]:.2f}")
print(f"均值填补恢复值: {X_mean_filled[2, 1]:.2f} (脱离了 A=3.0 的局部上下文)")
print(f"KNN 插补恢复值: {X_knn_filled[2, 1]:.2f} (极度贴合真实值，保留了特征关联!)")
"""

    lesson_1 = lesson(
        lesson_id="ml-data-l3-1",
        title="缺失机制深度辨析与填补策略：从丢弃到指示器建模",
        content=l1_content,
        difficulty=3,
        tips=[
            tip("保留缺失的业务信号：在金融、医疗场景中，缺失本身就是高权重特征。使用 SimpleImputer 时务必设置 `add_indicator=True` 自动追加指示列。", "interview"),
            tip("时序数据严禁用后向数据填补：在时间序列中填补缺失值时，只能使用向前填补 `bfill/ffill` 中的 `ffill`（用历史填补当前），绝对不能用 `bfill` 偷看未来的数据。", "pitfall")
        ],
        demos=[
            demo(code=l1_code, title="均值插补与协同 KNN 插补及缺失指示器实战对比")
        ]
    )

    # ── Lesson 3.2 ──
    l2_content = """### 学习目标
学完本节，你应该能够：
1. 掌握参数化异常检测准则：$3\\sigma$ 准则与标准正态分布分位数；
2. 掌握非参数稳健异常检测方法：**图基四分位距法则（Tukey's IQR Rule）**；
3. 理解无监督机器学习异常检测利器：**孤立森林（Isolation Forest）**的树切分拓扑原理；
4. 深刻辨析异常值处理的三大工程流派：直接剔除（Trimming）、盖帽缩尾（Winsorization）与稳健变换；
5. 编写代码实现基于 Tukey IQR 的无监督自动盖帽缩尾计算器，抑制极端离群点对回归损失函数的二次方放大破坏。

### 前置知识
- 经验分位数（Quantiles, $Q_1, Q_3$）；
- 二叉树切分与路径长度深度。

### 问题背景与 ML 用途
在数据采集中，极端异常值（Outliers）无处不在：
- 传感器受到瞬间电涌冲击，温度读数从 25℃ 瞬间飙升到 9999℃；
- 金融交易流水中出现一笔金额为 10 亿的测试刷单假数据；
- 信用卡欺诈交易中黑客故意发起的攻击嗅探请求。
为什么不能放任异常值不管？
- 在普通最小二乘法（MSE 损失）中，残差是以**平方形式**进行惩罚的。一个偏差 1000 倍的极端离群点产生的损失贡献高达 $10^6$，会像黑洞一样强行将拟合回归直线拉向自己，彻底摧毁模型在其余 99.9% 正常样本上的泛化能力！
- 批归一化（BatchNorm）或标准差计算会被离群点彻底拉大，导致所有正常特征值被压缩为几乎重合的微小近零值。

### 直觉理解
- **抓贼要抓落单的（孤立森林思想）**：如果你在一个拥挤的广场上找一个普通市民，你可能需要问很多个问题才能准确定位他；但如果广场角落站着一个头戴小丑帽、手拿充气大锤的奇怪人士，你只需要随意画一刀（“谁戴着小丑帽？”），**仅仅用 1 次随机切分就能把他单独隔离开来**！孤立森林（Isolation Forest）就是基于这个美妙直觉：**异常点由于稀疏且远离大众，在随机二叉树切分中总是最快被孤立、路径深度极浅**！

### 核心概念与符号对照表
| 核心概念 | 判定准则 / 算法 | 数学表达式与边界 | 适用数据形态 |
| --- | --- | --- | --- |
| **$3\\sigma$ 准则** | Z-score 阈值 | $|x - \\mu| > 3 \\sigma$ (超出区间概率仅 0.27%) | 严格单峰正态分布 |
| **Tukey 箱线图法则** | **IQR 四分位距** | 上界 $Q_3 + 1.5 \\times \\text{IQR}$，下界 $Q_1 - 1.5 \\times \\text{IQR}$ | **非正态、长尾或偏态分布**（首选） |
| **盖帽缩尾处理** | **Winsorization** | 将超出 $[L, U]$ 的值截断为边界值 $L$ 或 $U$ | 保留样本总行数，防止方差爆炸 |
| **孤立森林** | `IsolationForest` | 基于平均搜索路径长度 $E(h(x))$ 计算异常得分 | 高维特征、复杂多模态交互异常 |

### 数学原理与逐步推导
#### 1. 图基箱线图法则（Tukey IQR）的稳健性数学机理
对于任意样本特征向量 $\\mathbf{x}$，将其从小到大排序。
定义：
- 第 25 百分位数（下四分位数）：$Q_1$；
- 第 75 百分位数（上四分位数）：$Q_3$；
- 四分位间距（Interquartile Range）：$\\text{IQR} = Q_3 - Q_1$。
Tukey 边界定义为：
$$\\text{Lower Bound} = Q_1 - k \\cdot \\text{IQR}, \\quad \\text{Upper Bound} = Q_3 + k \\cdot \\text{IQR}$$
通常标准离群点阈值取 $k = 1.5$，极端离群点取 $k = 3.0$。
**为什么 IQR 远胜于 $3\\sigma$ 准则？**
考察样本均值 $\\bar{X}$ 与样本标准差 $S$：如果数据中混入了一个数值极其巨大的离群点（如 $10^8$），均值和标准差本身会被这个异常点同步拉大！导致原先的 $|x - \\bar{X}| / S$ 计算出的 Z-score 虚假偏小，产生**异常掩盖效应（Masking Effect）**。
而四分位数 $Q_1$ 和 $Q_3$ 仅由排序后的中间位置决定，只要异常点占比小于 25%，**$Q_1$、$Q_3$ 和 $\\text{IQR}$ 的数值受到极端离群点的污染扰动为零（崩溃点 Breakdown Point 高达 25%）**！因此 Tukey IQR 具有坚不可摧的统计学鲁棒性。

### 几何图景与计算图
```
Tukey 箱线图异常检测几何结构：
                     正常数据区间 (占绝大多数)
          Lower = Q1 - 1.5*IQR                Upper = Q3 + 1.5*IQR
            │                                    │
  [离群点]  ├───[────┬───────────────┬────]───────┤   [离群点]
    *   *   │   │    │  中位数 Q2    │    │       │     *     *
            │   │    └───────────────┘    │       │
            │   Q1                       Q3       │
            │<----------- IQR ----------->│
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：检测出异常值后直接全部删除（Drop）
> **绝对不可盲目删除！** 
> 1. 在信用卡风控、网络入侵检测中，**异常值恰恰就是你最想捕获的正样本标签（欺诈者）**！直接删掉等于亲手删除了最重要的业务真值；
> 2. 如果数据属于合法的长尾分布（如金融收入的帕累托分布），这些大客户并非测量错误。直接删除会导致模型对高净值人群完全失准。工程上首选**Winsorization（截断盖帽）**或**对数变换（Log Transform）**。

### 工业界实践与工程考量
- 在高并发线上服务中，无法针对每一条实时流入的样本重新计算四分位数。标准做法是在离线训练阶段（Training Phase）固化下每个特征的 $[L, U]$ 上下界阈值常量，在线上推理流水线中作为静态配置直接执行极速向量化截断：`x_clipped = np.clip(x, L_fixed, U_fixed)`。

### 延伸思考与进阶阅读
- 阅读 Fei Tony Liu, Kai Ming Ting 经典论文《Isolation Forest》(ICDM 2008)。
- 思考：如果一个特征包含两个截然不同的正常聚集簇（双峰高斯分布），基于全局单区间的 IQR 法则可能会把两个簇之间的过渡点或者其中一个密集簇的边缘误判为异常，此时应该用什么无监督密度算法？（提示：Local Outlier Factor, LOF）。

### 本节小结
- $3\\sigma$ 易受异常值自身污染，Tukey IQR 依靠四分位数具备极高崩溃点稳健性；
- 孤立森林是高维非线性异常检测的利器；盖帽缩尾（Winsorization）是兼顾数据完整性与模型稳定性的通用解法。"""

    l2_code = """import numpy as np
from sklearn.ensemble import IsolationForest

# 构造一个包含极端离群点的右偏分布特征 (100 个正常样本 + 3 个极端破坏性离群点)
np.random.seed(42)
normal_data = np.random.exponential(scale=10.0, size=100)
outliers = np.array([250.0, 500.0, -100.0]) # 严重异常点
data = np.concatenate([normal_data, outliers])

# 1. Tukey IQR 非参数稳健异常检测与盖帽缩尾 (Winsorization)
q1 = np.percentile(data, 25)
q3 = np.percentile(data, 75)
iqr = q3 - q1
lower_bound = q1 - 1.5 * iqr
upper_bound = q3 + 1.5 * iqr

is_iqr_outlier = (data < lower_bound) | (data > upper_bound)
print("=== 1. Tukey IQR 稳健统计检测 ===")
print(f"Q1 = {q1:.2f}, Q3 = {q3:.2f}, IQR = {iqr:.2f}")
print(f"合法安全区间: [{lower_bound:.2f}, {upper_bound:.2f}]")
print(f"检测出的异常值个数: {np.sum(is_iqr_outlier)} 个")
print(f"异常值具体取值: {data[is_iqr_outlier]}")

# 执行盖帽截断 (Winsorization)
data_clipped = np.clip(data, lower_bound, upper_bound)
print(f"截断前最大值: {data.max():.2f} -> 截断后最大值: {data_clipped.max():.2f} (成功遏制二次损失爆炸!)")

# 2. 孤立森林 (Isolation Forest) 高维树结构异常检测
iso_forest = IsolationForest(contamination=0.03, random_state=42)
iso_preds = iso_forest.fit_predict(data.reshape(-1, 1)) # -1 代表异常, 1 代表正常

is_iso_outlier = (iso_preds == -1)
print("\\n=== 2. 孤立森林 (Isolation Forest) 机器学习检测 ===")
print(f"孤立森林识别出的异常样本数: {np.sum(is_iso_outlier)} 个")
print(f"孤立森林捕获的异常点: {data[is_iso_outlier]}")
"""

    lesson_2 = lesson(
        lesson_id="ml-data-l3-2",
        title="异常值检测与稳健截断：降服极端离群点与损失爆炸",
        content=l2_content,
        difficulty=3,
        tips=[
            tip("截断优于粗暴删除：除非明确知道是采集硬件损坏产生的虚假脏数据，否则优先使用 Winsorization 盖帽截断或对数变换，保留样本总行数与有效拓扑。", "interview"),
            tip("防离线泄漏：测试集的截断上下界必须严格使用训练集上计算出的 Q1 和 Q3，绝对不能在测试集上重新计算百分位数。", "pitfall")
        ],
        demos=[
            demo(code=l2_code, title="Tukey IQR 稳健检测盖帽与孤立森林实战对比")
        ]
    )

    # ── Lesson 3.3 ──
    l3_content = """### 学习目标
学完本节，你应该能够：
1. 掌握重复样本识别（完全重复与主键局部重复）的机理与去重策略；
2. 深刻辨析高基数类别特征（High-Cardinality Categorical Features）直接独热编码引发的“维度灾难”与稀疏性过拟合风险；
3. 熟练运用长尾词频截断合并法则，将低频小众类别统一归并为 `'Other'` 综合桶；
4. 掌握利用正则表达式（Regex）与 Pandas 向量化字符串方法（`.str`）进行文本格式清洗与规范化；
5. 编写代码对包含高基数与脏文本的大规模特征数据执行长尾合并与字符串标准化清洗。

### 前置知识
- 集合论哈希查重原理；
- 正则表达式元字符基础。

### 问题背景与 ML 用途
在真实的业务数据集中，文本与类别特征常常极度混乱：
- 职业分类特征中，有“软件工程师”、“程序员”、“码农”、“SDE”，还有各种只出现过 1 次的错别字或长尾称谓；
- 如果某个类别特征有 5,000 个不同取值，若直接对其进行 One-Hot 独热编码，特征矩阵会瞬间膨胀出 5,000 列极其稀疏的无用列，导致模型训练缓慢且在尾部低频类上严重过拟合；
- 用户输入的电话号码或邮政编码，带有破折号、空格、国家代码前缀（如 `+86`）等各种异构格式。
**高基数类别长尾归并与正则表达式向量化清洗，是构建高质量特征矩阵的必备基本功**。

### 直觉理解
- **抓大放小与设立“其他”分类**：如果一个班级里选举班长，前三名候选人获得了 90% 的选票，剩下 50 个人每个人只得了 1 票。在进行群体画像分析时，我们完全没有必要为那 50 个人每人单独设一个分类标签，而是直接将这 50 个长尾零散得票者合并为一个统一的“**其他（Other）**”分类。这样既保留了绝大多数样本的核心辨识度，又将特征维度从 53 压缩到 4，极大增强了模型的泛化鲁棒性。

### 核心概念与符号对照表
| 核心概念 | 语法 / 函数 | 底层行为与规则 | 在机器学习中的核心用途 |
| --- | --- | --- | --- |
| **全行去重** | `df.drop_duplicates()` | 基于所有特征列进行哈希精确匹配去重 | 消除重复采样的脏日志记录 |
| **主键子集去重** | `df.drop_duplicates(subset=['id'], keep='last')` | 仅基于业务主键去重，保留最新更新的一行 | 状态变更流水拉平为最终状态快照 |
| **长尾类别合并** | `s.where(s.isin(top_cats), 'Other')` | 仅保留频次最高的前 $K$ 个类别，其余压入 `'Other'` | 抑制独热编码维度灾难，防止稀疏过拟合 |
| **向量化正则提取** | `df['col'].str.extract(r'(pattern)')` | 调动 C 级正则引擎并行提取子字符串 | 从杂乱文本中提取金额、版本号、手机号 |
| **字符规范化** | `df['col'].str.strip().str.lower()` | 去除首尾空白并统一转换为小写 | 消除大小写与空格导致的人为类别割裂 |

### 数学原理与逐步推导
#### 1. 高基数独热编码的方差膨胀与过拟合机理
设样本量为 $N$，某类别特征具有 $C$ 个互斥取值。
若某长尾小众类别 $c_k$ 在全量训练集中仅出现过 1 次（$N_k = 1$），对应的独热编码列为 $\\mathbf{x}_{c_k} = [0, \\dots, 1, \\dots, 0]^T$。
在线性模型中，该特征对应的参数估计为 $w_{c_k}$。
根据数理统计，该参数估计的方差与该类别的样本量严格反比：
$$\\text{Var}(\\hat{w}_{c_k}) \\propto \\frac{\\sigma^2}{N_k} = \\frac{\\sigma^2}{1} = \\sigma^2$$
其估计方差极其巨大！模型为了迎合这唯一的一条偶发样本，会赋予 $w_{c_k}$ 一个极度极端且不稳定的权重，导致测试集遇到该类时预测严重失真。
**长尾截断定理（Pareto Principle）**：真实世界的数据分布普遍服从长尾幂律分布（Power-law / Zipf's Law）。前 10% 到 20% 的高频类别占据了 80% 到 90% 的样本量。将长尾尾部截断并聚合为 `'Other'`：
1. 能够消除极小样本对孤立参数方差的剧烈放大；
2. 将独热编码维度从 $O(C)$ 约束到常数 $O(K)$（如 $K=20$），显著降低模型容量与内存占用。

### 几何图景与计算图
```
高基数长尾截断合并图景：
类别出现频次直方图 (幂律长尾分布):
频次 ^
     │ ██
     │ ██  ██
     │ ██  ██  ██
     │ ██  ██  ██  █  █  ▏  ▏  ▏  ▏  ▏  ▏  ▏  ▏  (无数微弱长尾)
     └────────────────────────────────────────▶ 类别种类
       [   Top K 高频核心类   ] [ 全部归并为 'Other' 桶! ]
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：把测试集中从未见过的“新类别”当作报错异常抛出
> 在生产线上服务中，用户经常会输入离线训练集中从未出现过的新城市、新品牌或新单词。如果模型预处理管道未设置未登录词（OOV, Out-Of-Vocabulary）保护机制，流水线会直接抛出 `KeyError` 导致服务崩溃！**必须在数据预处理阶段设立默认兜底分支（`default='Other'`），让所有未知新词自动归入 `'Other'` 桶**。

### 工业界实践与工程考量
- 在大模型语料清洗与结构化数据处理中，对于包含数千万行的文本列清洗，纯 Python 的 `re.sub` 遍历非常慢。工程上普遍使用 Pandas 优化的 `.str.replace(pattern, repl, regex=True)`，或者结合 Rust 编写的极速正则扩展进行批量清洗。

### 延伸思考与进阶阅读
- 阅读 Scikit-learn 官方文档中关于高基数分类特征处理与 `TargetEncoder` 的对比分析。
- 思考：除了合并为 `'Other'` 之外，对于无法舍弃任何细分类别的极端高基数特征（例如拥有 10 万个 ID 的图书名称），现代工业推荐系统普遍采用什么技术将其映射为稠密向量？（提示：Embedding 嵌入层或 Feature Hashing）。

### 本节小结
- 查重必须结合业务主键与时间戳保留最新有效快照；
- 幂律长尾类别通过阈值合并为 `'Other'`，是根治独热编码维度爆炸与长尾过拟合的标准规范。"""

    l3_code = """import pandas as pd
import numpy as np

# 构造包含高基数长尾类别与混乱文本的模拟脏数据
raw_data = pd.DataFrame({
    'user_id': [101, 102, 103, 101, 104, 105, 106, 107, 108, 109, 110, 111],
    'job_title': [
        ' Software Engineer ', 'software engineer', 'Data Scientist', 'Software Engineer',
        'CEO', 'Teacher', 'Designer', 'data scientist', 'Baker', 'Diver', 'Clerk', 'Nurse'
    ],
    'contact_phone': [
        '+86-138-1234-5678', '13812345678', ' (010) 88889999 ', '138-1234-5678',
        '139-9999-8888', '+86 13700001111', '13611112222', '021-66667777',
        '13522223333', '13433334444', '13344445555', '13255556666'
    ]
})

print("=== 原始混乱数据 ===")
print(raw_data)

# 1. 文本规范化：去除首尾空格并转换为统一小写
clean_df = raw_data.copy()
clean_df['job_clean'] = clean_df['job_title'].str.strip().str.lower()

# 2. 高基数长尾归并：统计词频，仅保留出现频次 >= 2 的核心岗位，其余归为 'other'
freq = clean_df['job_clean'].value_counts()
print("\\n岗位出现频次分布:\\n", freq)

top_jobs = freq[freq >= 2].index
clean_df['job_grouped'] = clean_df['job_clean'].where(clean_df['job_clean'].isin(top_jobs), 'other')
print("\\n长尾归并后结果 (类别数从 9 压缩至 3):")
print(clean_df[['user_id', 'job_title', 'job_grouped']])

# 3. 向量化正则表达式清洗：提取统一格式的 11 位中国大陆手机号码
# 正则逻辑: 匹配可选的 +86 前缀，过滤掉破折号与空格，捕获以 1 开头的 11 位数字
phone_pattern = r'(?:\\+86[- ]?)?([1][3-9]\\d{9})'
clean_df['mobile_normalized'] = clean_df['contact_phone'].str.replace(r'[-() ]', '', regex=True).str.extract(r'(\\d{11})')

print("\\n=== 手机号正则规范化提取 ===")
print(clean_df[['contact_phone', 'mobile_normalized']])
"""

    lesson_3 = lesson(
        lesson_id="ml-data-l3-3",
        title="重复样本识别、高基数清洗与文本正则预处理：长尾特征治理",
        content=l3_content,
        difficulty=3,
        tips=[
            tip("OOV 未登录词防崩防线：生产特征管道必须给未知新类别预留 `'Other'` 兜底槽位，防止线上推理遇到生词直接崩溃。", "interview"),
            tip("正则预编译提升百倍吞吐：对上千万行文本执行复杂正则抽取时，预先使用 `re.compile` 编译模式串能显著减少底层正则状态机重复构建开销。", "performance")
        ],
        demos=[
            demo(code=l3_code, title="文本规范化、高基数长尾类别归并与正则特征清洗")
        ]
    )

    lessons = [lesson_1, lesson_2, lesson_3]

    # ── Exercises for Chapter 3 ──
    exercises = [
        single_choice(
            ex_id="ml-data-c3-ex1",
            question="在统计学家 Donald Rubin 的缺失数据机制理论中，如果一个特征的缺失概率严格依赖于未被观测到的数据本身的真实潜在取值（例如高净值人群因隐私保护而拒绝在问卷中透露具体收入数值），这种缺失机制被称为：",
            options=[
                {"value": "A", "text": "非随机缺失（Missing Not at Random, MNAR）"},
                {"value": "B", "text": "完全随机缺失（Missing Completely at Random, MCAR）"},
                {"value": "C", "text": "随机缺失（Missing at Random, MAR）"},
                {"value": "D", "text": "系统内部网络丢失（Hardware Fault）"},
            ],
            answer="A",
            explanation="当缺失发生的概率取决于缺失变量本身的数值时，被称为非随机缺失（MNAR）。例如高收入者更不愿报告收入。处理 MNAR 数据时，缺失本身就是极具预测价值的关键信号，必须加入 `MissingIndicator` 缺失指示特征。",
            difficulty=2,
            related_lesson_id="ml-data-l3-1",
            tags=["缺失机制", "MNAR", "Rubin理论"],
        ),
        judge(
            ex_id="ml-data-c3-ex2",
            question="在连续特征数据清洗中，单纯使用全量样本的均值（Mean）对所有缺失值进行统一填补，会导致该特征在填补后的方差被人为系统性压缩减小，并削弱特征间的协方差关联。",
            answer=True,
            explanation="正确。由于所有填补位置的离差 $(x_i^* - \\bar{X})$ 全部为 0，对离差平方和毫无贡献，导致填补后的特征方差系统性萎缩为原方差的 $(1-p)$ 倍，低估了真实分布的不确定性。",
            difficulty=2,
            related_lesson_id="ml-data-l3-1",
            tags=["均值填补", "方差压缩", "数据失真"],
        ),
        multiple_choice(
            ex_id="ml-data-c3-ex3",
            question="关于图基四分位距（Tukey IQR）法则与 $3\\sigma$ 准则在异常值检测中的对比，下列说法正确的有：",
            options=[
                {"value": "A", "text": "四分位数 $Q_1$ 和 $Q_3$ 仅由排序后的中间位置决定，只要异常点比例不超过 25%，四分位数不会受到极端数值的污染"},
                {"value": "B", "text": "$3\\sigma$ 准则依赖样本均值和标准差，而极端离群点会剧烈拉大均值和标准差，产生严重的异常掩盖效应（Masking Effect）"},
                {"value": "C", "text": "对于服从偏态分布或长尾分布的特征，Tukey IQR 法则通常比假设正态分布的 $3\\sigma$ 准则稳健得多"},
                {"value": "D", "text": "检测出异常点后，必须将其整行直接从数据集中彻底删除，绝不能使用盖帽截断（Winsorization）"},
            ],
            answer=["A", "B", "C"],
            explanation="A、B、C 均为数理统计中关于稳健统计量的经典结论。D 是错误的：直接删除往往会导致样本量损失或在欺诈检测中误删正样本标签，工程上普遍首选盖帽缩尾截断（Winsorization）或对数变换。",
            difficulty=3,
            related_lesson_id="ml-data-l3-2",
            tags=["TukeyIQR", "3-Sigma", "异常掩盖", "稳健统计"],
        ),
        fill(
            ex_id="ml-data-c3-ex4",
            question="在图基（Tukey）箱线图法则中，四分位距定义为 $\\text{IQR} = Q_3 - Q_1$，通常判决异常值的上界截断阈值为 $Q_3 + $____ $\\times \\text{IQR}$；将超出合理边界的离群点强制截断为边界值本身的处理技术在统计学上被称为 ____（Winsorization）。",
            blanks=[
                ["1.5", "1.50"],
                ["盖帽", "缩尾", "盖帽缩尾", "缩尾处理"]
            ],
            explanation="Tukey 标准上界为 $Q_3 + 1.5 \\times \\text{IQR}$；将离群点压至边界的技术被称为盖帽缩尾（Winsorization）。",
            difficulty=2,
            related_lesson_id="ml-data-l3-2",
            tags=["IQR阈值", "Winsorization", "盖帽截断"],
        ),
        open_ex(
            ex_id="ml-data-c3-ex5",
            question="【架构设计与工业实战题】面对具有 5,000 个不同类别的极端高基数分类特征（例如电商商品三级细分类目 `category_id`），若直接使用 One-Hot 独热编码会引发什么灾难性问题？请提出两套工业级标准的应对治理方案并详述其数理逻辑。",
            reference_answer="""问题分析与治理方案如下：
1. 直接 One-Hot 编码的致命缺陷：
   - 维度灾难与内存爆炸：生成尺寸高达 $N \\times 5000$ 的极度稀疏矩阵，内存占用激增数十倍；
   - 参数方差极大导致严重过拟合：由于长尾效应，数千个细分类目在训练集中可能仅出现过 1 到 2 次。模型对这些稀疏特征赋予的参数 $\\hat{w}$ 具有极大的方差 $\\text{Var}(\\hat{w}) \\propto \\sigma^2/N_k$，极易捕获随机噪声导致泛化崩溃。

2. 方案一：长尾频次截断合并法（Frequency Thresholding + 'Other' Bucket）：
   - 逻辑：统计各类别的样本频次，仅保留累计覆盖率达到 80%~90% 的前 $K$ 个高频核心类（例如 $K=30$），其余 4,970 个低频细分类目统一重命名为 `'Other'`；
   - 优势：将特征维度从 5,000 瞬间压缩至 31 维，既保留了绝大多数样本的核心辨识度，又将所有长尾样本汇聚到单一桶中赋予稳定的参数估计，同时天然具备线上未登录词（OOV）容错能力。

3. 方案二：平滑目标编码（Target Encoding with Empirical Bayes Smoothing）：
   - 逻辑：不进行维度扩张，而是将每个类别替换为其对应的目标标签均值（如违约率或点击率）。为了防止小样本类别的过拟合，引入经验贝叶斯平滑公式：
     $$\\hat{S}_k = \\frac{n_k \\bar{y}_k + m \\cdot \\mu_{\\text{global}}}{n_k + m}$$
     其中 $n_k$ 为该类样本量，$\\bar{y}_k$ 为组内均值，$\\mu_{\\text{global}}$ 为全局先验均值，$m$ 为平滑权重；
   - 优势：将高基数类别直接压缩为单列高质量数值特征，完全消除维度膨胀，且在样本量微小时自动退化收缩至全局先验，极大抑制长尾方差。""",
            explanation="深入剖析高基数独热编码引发的方差膨胀本质，提出长尾频次截断合并与经验贝叶斯平滑目标编码两套工业级最佳解决方案。",
            rubric=[
                {"point": "明确指出维度灾难、稀疏性以及小样本类别导致参数方差极大的过拟合机理", "score": 25},
                {"point": "详细阐述长尾频次截断合并为 'Other' 的实施机制与 OOV 容错优势", "score": 25},
                {"point": "准确给出目标编码的平滑公式与经验贝叶斯向全局先验收缩的抗噪原理", "score": 25},
                {"point": "方案论述具备高水平工程指导性与严密的数理逻辑", "score": 25},
            ],
            difficulty=4,
            related_lesson_id="ml-data-l3-3",
            tags=["高基数类别", "长尾合并", "目标编码", "特征工程方案"],
        ),
        # ── Code Exercise 3 ──
        {
            "id": "ml-data-c3-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】实现基于 Tukey IQR 的无监督自动盖帽缩尾（Winsorization）清洗器：\n编写函数 `tukey_iqr_winsorize(data, factor=1.5)`：\n接收一个包含实数的一维列表或 NumPy 数组 `data`，以及四分位间距系数 `factor`（默认 1.5）。\n计算并返回一个元组 `(lower_bound, upper_bound, clipped_data)`：\n1. `lower_bound`: 计算出的下截断边界 $Q_1 - \\text{factor} \\times \\text{IQR}$（四舍五入保留 4 位小数）；\n2. `upper_bound`: 计算出的上截断边界 $Q_3 + \\text{factor} \\times \\text{IQR}$（四舍五入保留 4 位小数）；\n3. `clipped_data`: 利用 `np.clip` 将超出范围的异常值强制截断至上下界后的清洗数据列表（各元素保留 4 位小数的 Python 浮点数列表）。\n\n最后一行请返回调用示例在测试数据 `[10.0, 12.0, 12.0, 13.0, 12.0, 11.0, 14.0, 100.0, -50.0]` 下的计算结果。",
            "starterCode": "import numpy as np\n\ndef tukey_iqr_winsorize(data, factor: float = 1.5) -> tuple:\n    \"\"\"利用 Tukey IQR 法则计算截断上下界并执行盖帽缩尾处理\"\"\"\n    # 请在此实现\n    ___\n\ntest_data = [10.0, 12.0, 12.0, 13.0, 12.0, 11.0, 14.0, 100.0, -50.0]\ntukey_iqr_winsorize(test_data)\n",
            "setupCode": "",
            "expectedOutput": "(8.0, 16.0, [10.0, 12.0, 12.0, 13.0, 12.0, 11.0, 14.0, 16.0, 8.0])",
            "answer": "import numpy as np\n\ndef tukey_iqr_winsorize(data, factor: float = 1.5) -> tuple:\n    arr = np.array(data, dtype=float)\n    q1 = float(np.percentile(arr, 25))\n    q3 = float(np.percentile(arr, 75))\n    iqr = q3 - q1\n    lower = q1 - factor * iqr\n    upper = q3 + factor * iqr\n    clipped = np.clip(arr, lower, upper)\n    return (round(lower, 4), round(upper, 4), [round(x, 4) for x in clipped.tolist()])\n\ntest_data = [10.0, 12.0, 12.0, 13.0, 12.0, 11.0, 14.0, 100.0, -50.0]\ntukey_iqr_winsorize(test_data)\n",
            "tests": "d_t = [1.0, 2.0, 3.0, 4.0, 5.0]\nres_t = tukey_iqr_winsorize(d_t)\nassert res_t == (-1.0, 7.0, [1.0, 2.0, 3.0, 4.0, 5.0]), f\"计算结果有误: {res_t}\"\n",
            "explanation": "利用 np.percentile 计算 Q1 和 Q3，根据 IQR 边界公式得出截断阈值并通过 np.clip 执行盖帽缩尾。",
            "tags": ["TukeyIQR", "Winsorization", "盖帽截断", "NumPy编程实战"],
            "related_lesson_id": "ml-data-l3-2",
        },
        single_choice(
            ex_id="ml-data-c3-ex7",
            question="在对大规模无结构化文本列执行复杂的正则表达式提取时，为了保证特征工程流水线的高吞吐执行，下列哪种方式的性能最高？",
            options=[
                {"value": "A", "text": "使用 Pandas 底层 C 编译优化的 `.str.extract(r'...')` 向量化字符串方法"},
                {"value": "B", "text": "使用标准 Python 原生 `for` 循环配合单次 `re.search`"},
                {"value": "C", "text": "使用 `df.apply(lambda row: re.match(...))`"},
                {"value": "D", "text": "将所有文本导出到纯文本文件后用 Bash sed 命令再读回"},
            ],
            answer="A",
            explanation="Pandas 的 `.str` 访问器（如 `.str.extract`、`.str.contains`）在底层调用了高度优化的 C 级别正则表达式循环引擎，避免了 Python 逐行解释执行带来的开销，其速度显著快于纯 Python 循环或 `df.apply`。",
            difficulty=2,
            related_lesson_id="ml-data-l3-3",
            tags=["向量化正则", ".str访问器", "高性能文本清洗"],
        ),
    ]

    return chapter(
        chapter_id="ml-data-c3",
        course_id="ml-python-data",
        order=3,
        title="数据清洗：缺失值、异常值与数据质量",
        goal="掌握 MCAR/MAR/MNAR 缺失机制与指示器建模，熟练运用 Tukey IQR 稳健盖帽与高基数长尾治理。",
        lessons=lessons,
        exercises=exercises,
    )
