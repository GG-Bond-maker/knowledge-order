# -*- coding: utf-8 -*-
"""
Chapter 5: 特征编码、无量纲化与防泄漏流水线工程 (Feature Encoding, Scaling & Leak-Free Pipeline)
Course: ml-python-data
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_5():
    # ── Lesson 5.1 ──
    l1_content = """### 学习目标
学完本节，你应该能够：
1. 掌握三大经典无量纲化缩放算子：**标准差标准化（StandardScaler）**、**极差归一化（MinMaxScaler）**与**稳健缩放（RobustScaler）**的数学原理与代数形式；
2. 深刻理解为什么基于距离的模型（KNN、SVM、K-means）和基于梯度的优化模型（线性模型、神经网络）对特征尺度高度敏感；
3. 掌握当特征存在极端离群点时，StandardScaler 与 MinMaxScaler 如何遭到致命扭曲，以及为什么 RobustScaler 能保持绝佳的抗噪稳定性；
4. 理解决策树（Random Forest、GBDT）对特征单调缩放完全不敏感的理论成因；
5. 编写代码对包含异常值的高维特征分别应用三种缩放算子，对比均值、方差及样本间欧氏距离结构的变化。

### 前置知识
- 均值、方差与四分位数；
- 欧几里得距离公式与梯度下降步长。

### 问题背景与 ML 用途
在真实的特征表格中，不同字段的物理量纲往往千差万别：
- “年收入”以十万元（$10^5$）为单位计量，方差可能高达 $10^{10}$；
- “年龄”在 18 到 70 之间计量，方差只有数百；
- “点击率”在 0 到 1 之间计量，方差不到 0.1。
如果直接把未经无量纲化的特征喂给机器学习模型：
- 在 KNN 或聚类算法中，收入特征将占据 99.999% 的欧氏距离权重，年龄和点击率直接被当成空气忽视；
- 在梯度下降中，高方差特征的等高线极其狭长，导致优化器剧烈震荡横跳，训练极难收敛。
**特征无量纲化（Feature Scaling）是抹平量纲鸿沟、保障优化收敛的必备先决步骤**。

### 直觉理解
- **大象与蚂蚁拔河**：如果不做无量纲化，年收入就像一头十几吨重的大象，年龄就像一只小蚂蚁。无论蚂蚁怎么使劲拉扯（年龄在年轻与老年之间变化几倍），大象只要稍微晃动一下耳朵（收入微动几百元），总距离就被大象完全主导了。无量纲化就像把大象和蚂蚁都换算成各自种族内的“相对标准体型偏差”（你偏离大象平均体重几倍标准差，我偏离蚂蚁平均体重几倍标准差），让所有人站在完全公平的跑道上竞争！

### 核心概念与符号对照表
| 核心概念 | 缩放算子 | 数学转换公式 | 适用场景与抗噪特性 |
| --- | --- | --- | --- |
| **标准差标准化** | `StandardScaler` | $z = \\frac{x - \\mu}{\\sigma}$ | 映射为均值 0、方差 1；适用于近似高斯分布，对异常值敏感 |
| **极差归一化** | `MinMaxScaler` | $x' = \\frac{x - x_{\\min}}{x_{\\max} - x_{\\min}}$ | 严格压缩到 $[0, 1]$；适用于图像像素、需要非负稀疏输入的场景 |
| **稳健中位数缩放** | `RobustScaler` | $x' = \\frac{x - Q_2}{Q_3 - Q_1}$ | 基于中位数与 IQR；**对极端离群点具备坚固抗性**（首选） |
| **最大绝对值缩放** | `MaxAbsScaler` | $x' = \\frac{x}{\\max |x|}$ | 压缩到 $[-1, 1]$ 且保留严格稀疏性（不破坏 0 元素） |

### 数学原理与逐步推导
#### 1. 为什么无量纲化能让梯度下降从“狭长峡谷”变回“正圆碗底”？
考察未归一化的最小二乘损失函数：
$$\\mathcal{L}(w_1, w_2) = \\frac{1}{2n} \\sum_{i=1}^n (y_i - w_1 x_{i1} - w_2 x_{i2})^2$$
其关于权重向量的二阶 Hessian 矩阵为：
$$H = \\frac{1}{n} X^T X = \\begin{bmatrix} \\frac{1}{n}\\sum x_{i1}^2 & \\frac{1}{n}\\sum x_{i1} x_{i2} \\\\ \\frac{1}{n}\\sum x_{i1} x_{i2} & \\frac{1}{n}\\sum x_{i2}^2 \\end{bmatrix}$$
若特征 1 的方差是特征 2 的 10000 倍（$\\sum x_{i1}^2 \\approx 10^4 \\sum x_{i2}^2$）：
Hessian 矩阵的最大特征值 $\\lambda_{\\max} \\approx 10^4 \\lambda_{\\min}$，**条件数高达 $\\kappa = 10000$**！
正如我们在数学基础课中所证明的，等高线呈现极度扭曲的狭长雪茄状，梯度下降步长必须受限于 $\\eta < 2 / \\lambda_{\\max}$，导致参数沿着平缓轴前进极其缓慢，需要迭代数万步才能收敛。
若对所有特征执行标准化（$\\text{Var}(x_j) = 1$）：
Hessian 矩阵的主对角线全部归一为 1，条件数大幅趋近于 1，等高线由扁平雪茄恢复为完美的近正圆形碗状！梯度下降的负梯度方向几乎直接指向全局最优点，仅需数十步即可飞速收敛。

### 几何图景与计算图
```
无量纲化重塑优化损失曲面：
未缩放的病态狭长等高线 (κ = 10000):
   w2 ^
      │    (_____________________)  <-- 剧烈之字形震荡，收敛极慢
      └─────────────────────────────▶ w1

标准化后的近正圆等高线 (κ ≈ 1):
   w2 ^
      │        (   o   )            <-- 大步流星直接走向碗底中心!
      └─────────────────────────────▶ w1
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：以为 MinMaxScaler 映射到 [0, 1] 之后，所有离群点都被完全消除了
> **完全没有被消除！** 相反，离群点在 MinMaxScaler 下造成的破坏是毁灭性的！如果一个特征 99% 的数值在 0 到 10 之间，突然出现了一个值为 10000 的异常点，MinMaxScaler 会将 10000 映射为 1.0，而将原先所有 0 到 10 之间的正常样本全部压扁压缩在 $[0, 0.001]$ 这样一个微不可见的极窄缝隙里！导致其余正常样本在模型中彻底失去区分度。**遇到含离群点的数据，必须选用 `RobustScaler`**。

### 工业界实践与工程考量
- 稀疏矩阵（如文本 TF-IDF 或超大 One-Hot 稀疏矩阵）绝对不能使用 `StandardScaler(with_mean=True)`！因为减去均值会把原先海量的 `0` 全部变成非零浮点数，直接将稀疏矩阵打爆为超大密集矩阵，瞬间榨干数十 GB 内存导致 OOM。对稀疏数据只能使用 `MaxAbsScaler` 或设置 `StandardScaler(with_mean=False)`。

### 延伸思考与进阶阅读
- 阅读 Scikit-learn 官方用户指南第 6.3 节《Preprocessing data》。
- 思考：如果输入给树模型（XGBoost），为什么是否做 StandardScaler 对模型的最终 AUC 分数完全没有任何影响？

### 本节小结
- 距离模型和梯度优化模型依赖无量纲化来消除量纲主导与病态峡谷；
- StandardScaler 适用于无明显离群点的高斯形态，RobustScaler 是抗离群点的中流砥柱。"""

    l1_code = """import numpy as np
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler

# 构造包含极端异常值的单特征数据 (10 个正常点 + 1 个极端大值 500.0)
data = np.array([[10.0], [12.0], [11.0], [13.0], [12.0], [10.0], [14.0], [11.0], [13.0], [12.0], [500.0]])

# 分别使用三种算子进行拟合转换
ss = StandardScaler().fit_transform(data)
mm = MinMaxScaler().fit_transform(data)
rs = RobustScaler().fit_transform(data)

print("=== 原始特征取值 ===")
print("前 5 个正常样本:", data[:5].flatten())
print("最后 1 个异常样本:", data[-1].flatten())

print("\\n=== 1. StandardScaler (受异常值剧烈拉扯) ===")
print(f"正常样本被压缩至微小区间: [{ss[0, 0]:.3f}, {ss[6, 0]:.3f}]")
print(f"异常样本的 Z-score: {ss[-1, 0]:.3f}")

print("\\n=== 2. MinMaxScaler (极差归一化崩溃表现) ===")
print(f"正常样本全部被挤压在微小缝隙: [{mm[0, 0]:.4f}, {mm[6, 0]:.4f}] (失去方差分辨率!)")
print(f"异常样本独占最大值: {mm[-1, 0]:.4f}")

print("\\n=== 3. RobustScaler (中位数与 IQR 稳健缩放，抗噪英雄!) ===")
print(f"正常样本依然保有健康的尺度跨度: [{rs[0, 0]:.3f}, {rs[6, 0]:.3f}] (中位数归零，完美保持分辨率!)")
print(f"异常样本被客观隔离在远端: {rs[-1, 0]:.3f}")
"""

    lesson_1 = lesson(
        lesson_id="ml-data-l5-1",
        title="连续特征无量纲化：消除量纲鸿沟与病态优化曲面",
        content=l1_content,
        difficulty=3,
        tips=[
            tip("稀疏矩阵切勿减均值：对 scipy.sparse 稀疏特征矩阵归一化时，务必关闭 `with_mean=False`，防止破坏稀疏性导致内存瞬间撑爆。", "performance"),
            tip("离群点首选 RobustScaler：面对未清洗或含有长尾异常值的工业级连续特征，优先选用 RobustScaler 代替 StandardScaler。", "interview")
        ],
        demos=[
            demo(code=l1_code, title="StandardScaler / MinMaxScaler / RobustScaler 抗噪对比实测")
        ]
    )

    # ── Lesson 5.2 ──
    l2_content = """### 学习目标
学完本节，你应该能够：
1. 掌握三大离散特征编码范式：**独热编码（One-Hot）**、**序号编码（Ordinal）**与**目标编码（Target Encoding）**；
2. 深刻辨析名义无序变量（Nominal）与有序变量（Ordinal）的编码禁忌（严禁对无序类别强行赋以连续数值）；
3. 掌握目标编码中由于“自身标签内生反馈”引发的严重**目标泄漏（Target Leakage）**机理；
4. 熟练掌握**交叉折外目标编码（Out-of-Fold Target Encoding）**与经验贝叶斯平滑先验（Empirical Bayes Smoothing）的联合防泄漏解法；
5. 编写代码从零实现带经验平滑先验的 K-Fold 折外目标编码器，对比普通全局均值编码与折外编码的过拟合差异。

### 前置知识
- 类别特征定义；
- K-Fold 交叉验证切分；
- 条件期望与经验贝叶斯。

### 问题背景与 ML 用途
现实世界的特征绝大多数是离散类别文本（如职业、车系品牌、商户类别、城市）：
- 计算机算法（如逻辑回归、SVM、神经网络）只认浮点数矩阵，根本无法直接对字符串 `'Beijing'` 执行加权点积；
- 如果你把无序类别简单映射为数字（北京=1, 上海=2, 广州=3），线性模型会荒谬地认为“上海是北京的 2 倍”，并在损失曲面上建立起虚假的欧氏空间线性约束；
- 如果你对一个拥有 2000 个类别的列做独热编码，维度爆炸会直接拖垮树模型的切分深度；
- 如果你使用目标编码（Target Encoding）把每个类替换为历史违约率，稍有不慎就会把预测标签泄露给特征，导致测试集惨遭滑铁卢。
**类别特征编码是连接业务离散符号与机器学习连续代数空间的精密桥梁**。

### 直觉理解
- **名牌身份证 vs 考卷平均分**：
  - 独热编码（One-Hot）：就像给每个人发一个大牌子，全场有多少个类别，牌子上就有多少个开关灯泡。如果是“北京”，北京灯亮（1），其余灯全灭（0）。缺点是人一多，牌子大得拿不动。
  - 目标编码（Target Encoding）：干脆不发牌子，而是把每个类别的“历史战绩打分”写在脑门上。比如“数码类目”的历史平均客单价是 1200 元，那所有购买数码的记录直接赋分 1200。**这在完全不增加任何特征维度的前提下，直接将类别信息浓缩成了最高效的数值强信号！** 但最关键的是：**算这个平均分时，绝对不能把当前考生自己的这门卷子算进去（折外交叉计算）**，否则就成了闭卷考试直接抄自己的答案（目标泄漏）。

### 核心概念与符号对照表
| 编码方式 | 适用变量类型 | 维度变化 | 核心优缺点 |
| --- | --- | --- | --- |
| **One-Hot 独热编码** | 低基数无序名义变量（Nominal，如性别、支付渠道） | $1 \\to C$（增加 $C$ 列） | 保留独立性无序性，但高基数时维度灾难 |
| **Ordinal 序号编码** | 具有天然顺序尺度的变量（Ordinal，如学历、会员等级） | $1 \\to 1$（保持 1 列） | 保持连续阶梯顺序，但不适用于无序变量 |
| **Target 目标编码** | **高基数分类变量**（High-Cardinality，如品牌、邮编） | $1 \\to 1$（保持 1 列） | 极度紧凑信息量极大，但**有严重的数据泄漏与过拟合风险** |
| **折外目标编码 (OOF)** | 生产级防泄漏目标编码 | $1 \\to 1$ | 仅用其余 $K-1$ 折样本计算均值，切断自相关泄漏 |

### 数学原理与逐步推导
#### 1. 目标编码的平滑先验公式（m-estimate / Empirical Bayes）
设类别特征 $X$ 包含子类别 $c_k$。在全量训练集中，全局目标均值为 $\\mu_{\\text{global}} = \\frac{1}{N}\\sum y_i$。
若某子类 $c_k$ 的样本量为 $n_k$，其组内真实目标均值为 $\\bar{y}_k = \\frac{1}{n_k} \\sum_{i \\in c_k} y_i$。
如果样本量 $n_k$ 极小（例如 $n_k = 1$，碰巧其标签 $y=1$），直接使用 $\\bar{y}_k = 1.0$ 会赋予一个极度过拟合的假象。
为了解决小样本估计的高方差问题，引入**经验贝叶斯平滑公式**：
$$\\hat{S}_k = \\frac{n_k \\bar{y}_k + m \\cdot \\mu_{\\text{global}}}{n_k + m} = \\lambda(n_k) \\bar{y}_k + (1 - \\lambda(n_k)) \\mu_{\\text{global}}$$
其中平滑系数 $\\lambda(n_k) = \\frac{n_k}{n_k + m} \\in [0, 1)$，$m$ 为设定的平滑权重伪计数（通常取 10 到 50）。
**性质分析**：
- 当 $n_k \\gg m$ 时（大样本大群体），$\\lambda(n_k) \\to 1$，估计值完全信任该组内的丰富统计均值 $\\bar{y}_k$；
- 当 $n_k \\to 0$ 时（罕见长尾小群体），$\\lambda(n_k) \\to 0$，估计值自动平滑回退收缩至稳健的全局先验均值 $\\mu_{\\text{global}}$！

#### 2. K-Fold 折外计算（Out-of-Fold, OOF）切断自泄漏
在训练集上，如果用包含样本 $i$ 自身在内的全量数据计算 $\\bar{y}_k$，样本 $i$ 的标签 $y_i$ 就间接泄漏给了其自身的输入特征！
**OOF 解决算法**：
1. 将训练集随机均分为 $K$ 个折（Folds）；
2. 对于第 $f$ 折中的每个验证样本，计算平滑目标编码时，**严格仅使用其余 $K-1$ 折中的训练样本**来统计 $n_k$ 和 $\\bar{y}_k$；
3. 对于最终测试集（Test Set），则使用**全量训练集计算出的全局平滑均值表**进行静态映射。

### 几何图景与计算图
```
折外目标编码 (OOF) 防泄漏数据流：
训练集划分为 3 折：
┌─────────────┬─────────────┬─────────────┐
│   Fold 1    │   Fold 2    │   Fold 3    │
└─────────────┴─────────────┴─────────────┘
      │              │              │
      ▼              └──────┬───────┘
作为验证集                 用 Fold 2 + Fold 3 统计类别目标均值
(得到无泄漏特征) ◀─────────────┘ (严格不包含 Fold 1 自身任何标签!)
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：无序类别直接用 `LabelEncoder` 赋成连续整数
> 很多初学者为了图省事，对“职业”（医生、老师、司机）直接用 `LabelEncoder` 编码成 0, 1, 2。**这在逻辑回归、SVM 和神经网络中是毁灭性的致命错误**！因为算法会隐式学习出一个荒谬的数学假设：“司机(2) - 老师(1) = 老师(1) - 医生(0)”。如果模型需要用超平面把老师区分出来，它将无法在线性空间中将其与另外两者割裂开。**无序变量低基数用 One-Hot，高基数用 Target Encoding**。

### 工业界实践与工程考量
- CatBoost 之所以能在表格数据竞赛中独步天下，正是因为其底层内置了极为高级的“排序目标编码（Ordered Target Encoding）”：通过在时序上将先到达的数据作为历史计算当前样本的均值，彻底消除了目标泄漏。Scikit-learn 1.3+ 也已官方引入 `TargetEncoder`，底层严格内置了经验贝叶斯平滑与 OOF 机制。

### 延伸思考与进阶阅读
- 阅读 CatBoost 经典论文《CatBoost: unbiased boosting with categorical features》(NeurIPS 2018)。
- 思考：如果分类特征在测试集中遇到了训练集中从未出现过的新类别，目标编码该如何安全处理而不报错？（直接赋予全局先验均值 $\\mu_{\\text{global}}$）。

### 本节小结
- 区分 Nominal、Ordinal 与 High-Cardinality 变量选择不同编码算子；
- 目标编码必须结合 K-Fold 折外计算与经验贝叶斯平滑先验，方能防范致命的目标数据泄漏。"""

    l2_code = """import pandas as pd
import numpy as np
from sklearn.model_selection import KFold

# 构造一个高基数类别特征与二分类标签数据集 (模拟借贷违约)
np.random.seed(42)
train_df = pd.DataFrame({
    'city': ['A', 'A', 'B', 'B', 'C', 'A', 'B', 'C', 'A', 'B'],
    'target': [1,   1,   0,   0,   0,   1,   1,   0,   0,   0]
})

test_df = pd.DataFrame({
    'city': ['A', 'B', 'D'] # D 为训练集中从未出现过的新城市 (OOV)
})

# 从零实现 K-Fold 折外目标编码器 (含经验贝叶斯平滑)
def out_of_fold_target_encode(train_data, test_data, cat_col, target_col, n_splits=3, smoothing=5.0):
    train = train_data.copy()
    test = test_data.copy()
    global_mean = float(train[target_col].mean())
    oof_encoded = np.zeros(len(train))

    kf = KFold(n_splits=n_splits, shuffle=True, random_state=42)

    # 1. 训练集进行 K-Fold 折外编码，防止自身标签反哺泄漏
    for train_idx, val_idx in kf.split(train):
        tr_fold = train.iloc[train_idx]
        val_fold = train.iloc[val_idx]

        # 基于 tr_fold 计算经验平滑均值: (n * mean + m * global) / (n + m)
        stats = tr_fold.groupby(cat_col)[target_col].agg(['count', 'mean'])
        smoothed = (stats['count'] * stats['mean'] + smoothing * global_mean) / (stats['count'] + smoothing)

        # 映射至验证折，未匹配到的填充全局均值
        oof_encoded[val_idx] = val_fold[cat_col].map(smoothed).fillna(global_mean).values

    train['target_encoded_oof'] = oof_encoded

    # 2. 测试集使用全量训练集统计量映射
    stats_all = train.groupby(cat_col)[target_col].agg(['count', 'mean'])
    smoothed_all = (stats_all['count'] * stats_all['mean'] + smoothing * global_mean) / (stats_all['count'] + smoothing)
    test['target_encoded'] = test[cat_col].map(smoothed_all).fillna(global_mean).values

    return train, test

train_enc, test_enc = out_of_fold_target_encode(train_df, test_df, 'city', 'target', n_splits=3, smoothing=2.0)

print(f"全局违约基准均值 (Global Prior Mean): {train_df['target'].mean():.2f}")
print("\\n=== 训练集折外目标编码结果 (成功切断自身标签回环泄漏) ===")
print(train_enc[['city', 'target', 'target_encoded_oof']])

print("\\n=== 测试集目标编码映射结果 ===")
print(test_enc)
print("验证: 测试集未登录城市 'D' 安全平稳回退至全局先验均值 0.40，未发生崩溃！")
"""

    lesson_2 = lesson(
        lesson_id="ml-data-l5-2",
        title="类别特征编码：独热、序号与折外目标编码防泄漏实战",
        content=l2_content,
        difficulty=4,
        tips=[
            tip("严禁对名义类别使用 LabelEncoder：无序名义分类列（如颜色、国家）绝不能用 LabelEncoder 编成数字喂给非树模型，否则会引入虚假距离先验。", "pitfall"),
            tip("TargetEncoder 平滑先验：使用 Target Encoding 时必须配置 smoothing 参数，防止小样本极端类的单一标签过拟合拉偏整体权重。", "interview")
        ],
        demos=[
            demo(code=l2_code, title="从零手写 K-Fold 折外防泄漏平滑目标编码器实战")
        ]
    )

    # ── Lesson 5.3 ──
    l3_content = """### 学习目标
学完本节，你应该能够：
1. 深刻理解数据泄漏（Data Leakage）的本质定义与三种致命形态：**预处理统计泄漏**、**目标直接泄漏**与**时序信息穿越**；
2. 掌握在执行 `train_test_split` 之前调用 `fit_transform` 导致交叉验证虚假乐观的数理成因；
3. 掌握 Scikit-learn 现代工业流水线架构：`Pipeline`、`FeatureUnion` 与 `ColumnTransformer` 的解耦拼装；
4. 熟练构建包含数值列缺失填补与无量纲化、类别列低频治理与独热编码的异构端到端防泄漏流水线；
5. 编写代码搭建生产级完整 Pipeline，进行严密的多折交叉验证与无泄漏持久化保存。

### 前置知识
- 交叉验证与泛化误差；
- 面向对象封装与 `fit` / `transform` 接口契约。

### 问题背景与 ML 用途
在机器学习工程化落地中，**数据泄漏（Data Leakage）是吞噬算法工程师信誉与企业商业价值的第一大杀手**：
- 模型在离线评估时准确率高达 99.8%，团队大张旗鼓举行庆功会；
- 一旦上线接驳真实业务流量，准确率断崖暴跌到 52%，直接造成严重业务亏损。
为什么会发生这种悲剧？
- 在特征工程清洗时，工程师写了一句 `scaler.fit_transform(X)`，然后才调用 `train_test_split(X, y)`；
- 这一句看似人畜无害的代码，实际上已经让训练集**提前偷看到了测试集的均值、最大值和标准差**！
- 模型的超参数选择、特征筛选不知不觉全部基于这份被提前污染的数据进行调整，制造了彻底的“自欺欺人”假象。
**Scikit-learn 的 `Pipeline` 与 `ColumnTransformer` 是工业界彻底斩断数据泄漏黑手、保证离线与线上行为 100% 幂等一致的根本防线**。

### 直觉理解
- **密封绝密试卷与流水线传送带**：
  - **有泄漏的错误做法**：在期末考试前，老师把全校所有试卷（包括下周才考的期末试卷）混在一起，先统计出整套卷子的生词表和重点题型（全量 `fit`），然后再发给学生练习。学生在练习时虽然没看到具体答案，但潜意识里已经掌握了未来试卷的词汇分布（分布泄漏）。
  - **无泄漏的 Pipeline 做法**：期末试卷被锁在保险箱里贴上封条（测试集），任何人不得触碰。老师只拿平时的练习册（训练集）提取均值、词表和规则（`pipeline.fit(X_train)`）。考试当天，直接把这套固化的规则机械应用到密封试卷上（`pipeline.predict(X_test)`）。学生从未在任何环节偷看到未来试卷的哪怕一个统计量！

### 核心概念与符号对照表
| 核心组件 | 类 / 函数 | 职责与工程语义 | 在机器学习中的核心用途 |
| --- | --- | --- | --- |
| **流水线容器** | `sklearn.pipeline.Pipeline` | 将多个预处理变换器与最终估计器串联成单个复合模型 | 封装跨阶段状态，保证 CV 循环内严格隔离 |
| **异构列分流器** | `ColumnTransformer` | 对数值列、类别列等不同类型字段执行独立并行的子流水线 | 异构特征工程统一调度中枢 |
| **预处理三步契约** | `fit`, `transform`, `fit_transform` | `fit` 仅在训练集学参数；`transform` 将学到的参数应用到任意集 | 杜绝任何形式的分布逆向渗透 |
| **无泄漏交叉验证** | `cross_val_score(pipeline, X, y)` | 在每一折循环内部独立执行预处理的 `fit` 与 `transform` | 给出 100% 真实客观的无泄漏泛化指标评估 |

### 数学原理与逐步推导
#### 1. 预处理数据泄漏对泛化误差评估的虚假压缩证明
设总样本集包含 $N$ 条样本。设真实目标是预测高维随机噪声向量是否存在关联（理论上真实 AUC 应严格为 0.50）。
**泄漏场景（错误操作）**：
1. 在全量数据 $N$ 上执行特征选择：计算所有特征与目标 $y$ 的相关系数，挑选出相关性绝对值最大的 Top 5 个特征；
2. 将数据切分为训练集与测试集（80% : 20%）；
3. 在选出的 Top 5 个特征上训练分类器并在测试集评估。
**致命数学推论**：
即使全量数据纯粹是独立高斯噪声，在 10,000 个特征中由于多重假设检验，也必然有少数特征碰巧因随机偶然性在全量数据上表现出极高相关性（假阳性 Alpha 膨胀）！
因为测试集的样本**已经被用来挑选这 5 个特征了**，测试集不再独立！分类器在测试集上评估出的 AUC 会荒谬地达到 0.85 以上！
**严密的防泄漏流水线（正确操作）**：
特征选择步骤必须完全封装在 Pipeline 内部。在交叉验证的每一折中，**必须仅在 80% 的训练折上重新计算相关系数挑选特征**，并在完全未参与特征选择的 20% 验证折上打分。此时评估出的 AUC 会真实、客观、无情地显示为 0.50，瞬间粉碎过度拟合的假象！

### 几何图景与计算图
```
ColumnTransformer + Pipeline 端到端防泄漏工业架构：
                   原始混合输入特征表格 (包含数值列与文本类别列)
                                    │
               ┌────────────────────┴────────────────────┐
               ▼ (数值列分流)                             ▼ (类别列分流)
      [ SimpleImputer: 均值填补 ]               [ SimpleImputer: 众数填补 ]
               │                                         │
               ▼                                         ▼
      [ RobustScaler: 稳健无量纲化 ]             [ OneHotEncoder: 独热编码 ]
               │                                         │
               └────────────────────┬────────────────────┘
                                    ▼ (水平特征矩阵拼接 ColumnTransformer)
                        拼接出全量高质量数值特征矩阵
                                    │
                                    ▼ (最终模型估计器)
                     [ RidgeClassifier / XGBoost ]
                                    │
                                    ▼
                         输出最终无泄漏预测与概率
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：在进入 Pipeline 之前把缺失值用 Pandas 的 `df.fillna(df.mean())` 填好
> **这是最隐蔽的严重数据泄漏！** `df.mean()` 计算的是**包含测试集在内的全局均值**！这一行代码已经在无形中把测试集的统计均值直接注入到了训练集中！**所有填补、缩放、降维、特征选择逻辑，必须 100% 封装在 Pipeline 内部，由 Pipeline 内部的 SimpleImputer 在运行时仅从训练集学出均值**。

### 工业界实践与工程考量
- 在模型持久化（Model Serialization）上线部署时，直接对最外层的 `pipeline` 对象调用 `joblib.dump(pipeline, 'model.joblib')`。线上微服务接收到前端 JSON 数据后，直接加载该文件调用 `pipeline.predict(json_df)`。预处理参数与模型权重浑然一体，绝不可能出现“线上线下特征缩放均值不一致”的线上事故。

### 延伸思考与进阶阅读
- 阅读 Scikit-learn 官方文档《6.1. Pipelines and composite estimators》。
- 思考：如果在时间序列预测中，如果要在 Pipeline 内部构建基于历史滞后项（Lag Features）的时序特征，为什么标准的无状态 Transformer 无法胜任？应该如何重构符合时序因果的自定义 Transformer？

### 本节小结
- 数据泄漏会导致离线虚高与线上雪崩，切分前执行 fit_transform 是万恶之源；
- ColumnTransformer 负责异构分流，Pipeline 实现跨阶段严密隔离，是构建可信机器学习工程的标准基石。"""

    l3_code = """import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import RobustScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression

# 构造一个真实的异构特征业务数据集 (模拟金融信用卡逾期违约风险)
np.random.seed(42)
n_samples = 1000

df = pd.DataFrame({
    'age': np.random.choice([22, 35, 45, np.nan, 28, 60], size=n_samples), # 含有缺失的数值特征
    'monthly_income': np.random.lognormal(mean=8.5, sigma=1.0, size=n_samples), # 严重偏态数值
    'education': np.random.choice(['HighSchool', 'Bachelor', 'Master', np.nan], size=n_samples), # 离散文本
    'loan_purpose': np.random.choice(['Car', 'House', 'Education', 'Debt'], size=n_samples),
    'target': np.random.choice([0, 1], p=[0.8, 0.2], size=n_samples) # 违约标签
})

X = df.drop(columns=['target'])
y = df['target']

# 1. 严格切分训练集与测试集 (测试集必须提前封存，严禁参与预处理 fit!)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# 2. 构建模块化子流水线
# 数值列流水线: 中位数填补 -> 稳健缩放 RobustScaler
numeric_features = ['age', 'monthly_income']
numeric_transformer = Pipeline(steps=[
    ('imputer', SimpleImputer(strategy='median')),
    ('scaler', RobustScaler())
])

# 类别列流水线: 众数填补 -> 独热编码 (忽略测试集中出现的新类别)
categorical_features = ['education', 'loan_purpose']
categorical_transformer = Pipeline(steps=[
    ('imputer', SimpleImputer(strategy='most_frequent')),
    ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
])

# 3. 使用 ColumnTransformer 组装异构特征分流预处理器
preprocessor = ColumnTransformer(
    transformers=[
        ('num', numeric_transformer, numeric_features),
        ('cat', categorical_transformer, categorical_features)
    ]
)

# 4. 组装端到端防泄漏完整 Pipeline (预处理 + 分类器)
full_pipeline = Pipeline(steps=[
    ('preprocessor', preprocessor),
    ('classifier', LogisticRegression(class_weight='balanced', random_state=42))
])

# 5. 执行严密无泄漏的多折交叉验证 (预处理参数在每一折内独立 fit!)
cv_scores = cross_val_score(full_pipeline, X_train, y_train, cv=5, scoring='roc_auc')
print(f"=== 5 折交叉验证 ROC-AUC (无数据泄漏真实成绩): {cv_scores.mean():.4f} (±{cv_scores.std():.4f}) ===")

# 6. 在全量训练集上拟合，并在完全隔离的测试集上进行最终验证
full_pipeline.fit(X_train, y_train)
test_score = full_pipeline.score(X_test, y_test)
print(f"独立留出测试集准确率: {test_score:.4f}")
print("结论: 整个特征清洗与转换过程完全被锁在 Pipeline 内，杜绝了任何形式的测试集信息渗透！")
"""

    lesson_3 = lesson(
        lesson_id="ml-data-l5-3",
        title="数据泄漏的万恶之源与 Scikit-learn Pipeline 闭环：工程可靠性防线",
        content=l3_content,
        difficulty=4,
        tips=[
            tip("切分前绝对不要 fit：永远在 `train_test_split` 之后再构建和拟合 Pipeline，绝对不要在划分前对全量数据调用 fit 或 fit_transform。", "pitfall"),
            tip("handle_unknown='ignore'：在 OneHotEncoder 中务必显式设置 `handle_unknown='ignore'`，确保线上推理遇到未登录新词时安全生成全零向量而不崩溃。", "interview")
        ],
        demos=[
            demo(code=l3_code, title="ColumnTransformer + Pipeline 端到端异构防泄漏工程全流程")
        ]
    )

    lessons = [lesson_1, lesson_2, lesson_3]

    # ── Exercises for Chapter 5 ──
    exercises = [
        single_choice(
            ex_id="ml-data-c5-ex1",
            question="在机器学习数据处理流水线中，所谓“数据泄漏（Data Leakage）”的最典型表现是下列哪种操作？",
            options=[
                {"value": "A", "text": "在将数据集切分为训练集与测试集之前，直接在全量数据上调用了 `StandardScaler.fit_transform()` 拟合了全局均值和方差"},
                {"value": "B", "text": "在训练集上计算均值并用该均值去填补测试集中的缺失值"},
                {"value": "C", "text": "使用 `Pipeline` 将特征预处理器与最终分类器串联在一起"},
                {"value": "D", "text": "在训练模型前剔除了与目标完全无关的唯一自增主键 ID"},
            ],
            answer="A",
            explanation="在切分之前对全量数据执行 `fit` 会让测试集的分布信息（均值、最大最小值、方差）提前泄漏到训练集预处理逻辑中，使得模型在离线评估时产生严重的虚假乐观指标（自欺欺人），这是最经典的数据泄漏操作。",
            difficulty=2,
            related_lesson_id="ml-data-l5-3",
            tags=["数据泄漏", "DataLeakage", "fit_transform禁忌", "工程规范"],
        ),
        judge(
            ex_id="ml-data-c5-ex2",
            question="在对包含数万个小众品类的极端高基数特征应用目标编码（Target Encoding）时，如果直接用该类别在全量训练集上的真实目标均值代替特征，会导致强烈的目标泄漏并引起严重过拟合，必须使用 K-Fold 折外计算（Out-of-Fold）与平滑先验进行隔离。",
            answer=True,
            explanation="正确。如果直接使用全量均值，每个样本的目标标签会被直接内生泄漏回其自身的输入特征中。必须采用 K-Fold 折外计算切断当前样本与自身标签的连接，并加入经验贝叶斯平滑以稳定小样本方差。",
            difficulty=2,
            related_lesson_id="ml-data-l5-2",
            tags=["目标编码", "OOF", "数据泄漏", "平滑先验"],
        ),
        multiple_choice(
            ex_id="ml-data-c5-ex3",
            question="在设计一个工业级稳健的 Scikit-learn 特征工程流水线时，下列哪些配置与设计原则是推荐的最佳实践？",
            options=[
                {"value": "A", "text": "使用 `ColumnTransformer` 将连续数值特征子流水线与离散类别特征子流水线解耦并行分流处理"},
                {"value": "B", "text": "在 `OneHotEncoder` 中显式指定 `handle_unknown='ignore'`，防止线上推理遇到未知类别时引发程序崩溃"},
                {"value": "C", "text": "面对含有严重异常离群点的连续特征，优先选用基于中位数和 IQR 的 `RobustScaler` 替代 `StandardScaler`"},
                {"value": "D", "text": "对所有特征预处理的参数拟合（fit）严格仅在训练折内执行，验证折与测试集仅调用 transform"},
            ],
            answer=["A", "B", "C", "D"],
            explanation="四项陈述全部是工业界机器学习工程实践的标准最高准则：解耦异构列、防范 OOV 异常、稳健抗噪缩放以及跨生命周期的零数据泄漏隔离。",
            difficulty=3,
            related_lesson_id="ml-data-l5-3",
            tags=["Pipeline", "ColumnTransformer", "工程最佳实践", "防泄漏"],
        ),
        fill(
            ex_id="ml-data-c5-ex4",
            question="在 Scikit-learn 的 `Pipeline` 中，中间各个处理阶段的组件对象必须实现 `fit` 与 ____ 接口契约；负责对异构表格中不同列名组合分别执行不同转换子流的复合转换器类是 ____。",
            blanks=[
                ["transform", "transform方法"],
                ["ColumnTransformer", "sklearn.compose.ColumnTransformer"]
            ],
            explanation="流水线中间步骤必须实现 transform 契约；负责列分流组装的组件是 ColumnTransformer。",
            difficulty=2,
            related_lesson_id="ml-data-l5-3",
            tags=["Pipeline契约", "ColumnTransformer", "接口规范"],
        ),
        open_ex(
            ex_id="ml-data-c5-ex5",
            question="【架构设计与防泄漏题】请系统回答关于**折外目标编码（Out-of-Fold Target Encoding）**的设计与数学原理：\n1. 解释为什么普通全局均值目标编码会导致模型在训练集上发生严重过拟合；\n2. 写出引入经验贝叶斯（Empirical Bayes）平滑权重的目标编码公式，并解释参数 $m$（先验权重）的数学收缩作用；\n3. 详细叙述在训练集和测试集上分别应用 K-Fold 折外目标编码的具体数据流向步骤。",
            reference_answer="""设计与数学原理如下：
1. 普通全局目标编码过拟合机理：
   若直接计算全量均值 $\\bar{y}_k = \\frac{1}{n_k} \\sum_{i \\in c_k} y_i$，样本 $i$ 的自身真实标签 $y_i$ 参与了其自身编码值的计算。特别是当某个类别在数据中只出现过 1 次时（$n_k = 1$），该特征直接变成了 $y_i$ 本身！模型会学到一个虚假的强规则（“只要看到特征值等于 1 就预测为正样本”），在训练集上准确率虚高到 100%，但在测试集遇到该类时预测严重失真。

2. 经验贝叶斯平滑公式与收缩原理：
   平滑公式定义为：
   $$\\hat{S}_k = \\frac{n_k \\bar{y}_k + m \\cdot \\mu_{\\text{global}}}{n_k + m}$$
   其中 $n_k$ 为组内样本量，$\\bar{y}_k$ 为组内均值，$\\mu_{\\text{global}}$ 为全局目标均值，$m$ 为平滑权重伪计数常数。
   数学收缩作用：该公式本质上是一个凸组合加权。当某类别样本量 $n_k$ 极大时，权重倾向于组内均值 $\\bar{y}_k$；当某类别为长尾极小样本（$n_k \\to 0$）时，分母被 $m$ 支配，估计值自动被强行向全局先验均值 $\\mu_{\\text{global}}$ 收缩拉回，从而有效遏制了小样本类别的剧烈方差与过拟合。

3. K-Fold 折外计算数据流向步骤：
   - 步骤一（针对训练集）：将训练集均分为 $K$ 个折。对于第 $f$ 折中的每个样本，计算其类别编码时，**严格仅使用其余 $K-1$ 折中的训练样本**统计 $n_k$ 与 $\\bar{y}_k$ 并代入平滑公式映射。对所有 $K$ 折循环执行完毕后，拼接成训练集的完整折外特征列，彻底切断自身标签回环；
   - 步骤二（针对测试集）：测试集完全不参与任何参数统计。使用**全量训练集**计算出的唯一一份最终全局平滑均值映射表，直接映射测试集中的各行类别（未匹配到的未知类别一律填充全局均值 $\\mu_{\\text{global}}$）。""",
            explanation="深入剖析目标编码过拟合的第一性原理，完整推导经验贝叶斯平滑公式并清晰描绘 K-Fold 折外训练与测试数据流向。",
            rubric=[
                {"point": "明确阐述自身标签内生泄漏导致小样本类别特征退化为标签自身的过拟合机理", "score": 25},
                {"point": "正确写出经验贝叶斯平滑公式并准确解释参数 m 的收缩作用", "score": 25},
                {"point": "清晰叙述在训练集中利用其余 K-1 折计算当前折样本编码的 OOF 流程", "score": 25},
                {"point": "准确说明测试集使用全量训练集映射表及未登录类别回退全局均值的规则", "score": 25},
            ],
            difficulty=4,
            related_lesson_id="ml-data-l5-2",
            tags=["目标编码", "OOF", "经验贝叶斯平滑", "数据防泄漏"],
        ),
        # ── Code Exercise 5 ──
        {
            "id": "ml-data-c5-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】实现带经验贝叶斯平滑的 K-Fold 折外目标编码器（OOF Target Encoder）：\n编写函数 `out_of_fold_target_encode(train_df, test_df, cat_col, target_col, n_splits=3, smoothing=10.0, random_state=42)`：\n接收包含类别列和目标列的 `train_df`，以及仅包含类别列的 `test_df`。\n1. 计算训练集全量目标全局均值 $\\mu_{\\text{global}}$；\n2. 使用 `KFold(n_splits=n_splits, shuffle=True, random_state=random_state)` 对 `train_df` 进行切分。对于每个验证折，利用其余训练折数据根据平滑公式 $\\hat{S}_k = \\frac{n_k \\bar{y}_k + \\text{smoothing} \\cdot \\mu_{\\text{global}}}{n_k + \\text{smoothing}}$ 计算折外编码值，未见类别用 $\\mu_{\\text{global}}$ 填充；\n3. 对于 `test_df`，使用基于全量 `train_df` 计算出的平滑映射表进行编码，未见类别用 $\\mu_{\\text{global}}$ 填充。\n\n返回一个元组 `(encoded_train, encoded_test)`，两者均为浮点数列表且元素均使用 `round(..., 4)` 保留 4 位小数。\n\n最后一行请返回调用示例在测试参数 `(n_splits=3, smoothing=2.0)` 下的计算结果。",
            "starterCode": "import pandas as pd\nimport numpy as np\nfrom sklearn.model_selection import KFold\n\ndef out_of_fold_target_encode(train_df, test_df, cat_col, target_col, n_splits=3, smoothing=10.0, random_state=42) -> tuple:\n    \"\"\"实现带经验贝叶斯平滑的 K-Fold 折外防泄漏目标编码器\"\"\"\n    # 请在此实现\n    ___\n\ntr = pd.DataFrame({'cat': ['A', 'A', 'B', 'B', 'A', 'B'], 'target': [1, 1, 0, 0, 0, 1]})\nte = pd.DataFrame({'cat': ['A', 'B', 'C']})\nout_of_fold_target_encode(tr, te, 'cat', 'target', n_splits=3, smoothing=2.0)\n",
            "setupCode": "",
            "expectedOutput": "([0.3333, 0.3333, 0.3333, 0.5, 0.75, 0.3333], [0.6, 0.4, 0.5])",
            "answer": "import pandas as pd\nimport numpy as np\nfrom sklearn.model_selection import KFold\n\ndef out_of_fold_target_encode(train_df, test_df, cat_col, target_col, n_splits=3, smoothing=10.0, random_state=42) -> tuple:\n    train_df = train_df.copy()\n    test_df = test_df.copy()\n    global_mean = float(train_df[target_col].mean())\n    encoded_train = np.zeros(len(train_df))\n    \n    kf = KFold(n_splits=n_splits, shuffle=True, random_state=random_state)\n    for tr_idx, val_idx in kf.split(train_df):\n        tr_fold = train_df.iloc[tr_idx]\n        val_fold = train_df.iloc[val_idx]\n        stats = tr_fold.groupby(cat_col)[target_col].agg(['count', 'mean'])\n        smoothed = (stats['count'] * stats['mean'] + smoothing * global_mean) / (stats['count'] + smoothing)\n        encoded_train[val_idx] = val_fold[cat_col].map(smoothed).fillna(global_mean).values\n        \n    stats_all = train_df.groupby(cat_col)[target_col].agg(['count', 'mean'])\n    smoothed_all = (stats_all['count'] * stats_all['mean'] + smoothing * global_mean) / (stats_all['count'] + smoothing)\n    encoded_test = test_df[cat_col].map(smoothed_all).fillna(global_mean).values\n    \n    return [round(float(x), 4) for x in encoded_train], [round(float(x), 4) for x in encoded_test]\n\ntr = pd.DataFrame({'cat': ['A', 'A', 'B', 'B', 'A', 'B'], 'target': [1, 1, 0, 0, 0, 1]})\nte = pd.DataFrame({'cat': ['A', 'B', 'C']})\nout_of_fold_target_encode(tr, te, 'cat', 'target', n_splits=3, smoothing=2.0)\n",
            "tests": "tr_t = pd.DataFrame({'c': ['X', 'X'], 'y': [1, 0]})\nte_t = pd.DataFrame({'c': ['X', 'Z']})\ntr_enc_t, te_enc_t = out_of_fold_target_encode(tr_t, te_t, 'c', 'y', n_splits=2, smoothing=1.0)\nassert te_enc_t == [0.5, 0.5], f\"测试集编码错误: {te_enc_t}\"\n",
            "explanation": "利用 KFold 交叉循环在折外训练数据上计算平滑目标均值，测试集使用全量训练集统计量，未见类别回退至全局均值。",
            "tags": ["目标编码", "OOF", "防泄漏", "Pandas编程实战"],
            "related_lesson_id": "ml-data-l5-2",
        },
        single_choice(
            ex_id="ml-data-c5-ex7",
            question="在处理大规模稀疏矩阵特征（例如包含 10 万个维度的 TF-IDF 词袋矩阵，以 `scipy.sparse` 格式存储）时，如果对其使用 `StandardScaler()` 且未将 `with_mean` 参数设置为 `False`，通常会发生什么严重后果？",
            options=[
                {"value": "A", "text": "减去均值操作会将原矩阵中原本绝大多数为 0 的稀疏元素全部转化为非零浮点数，直接将稀疏矩阵打爆为超大密集矩阵，瞬间耗尽内存导致系统发生 OOM 崩溃"},
                {"value": "B", "text": "矩阵的所有奇异值会自动归零"},
                {"value": "C", "text": "Scikit-learn 会自动将其压缩为无损的 ZIP 格式"},
                {"value": "D", "text": "计算出的方差会严格等于负数"},
            ],
            answer="A",
            explanation="稀疏矩阵的核心优势是仅存储非零元素。若减去非零均值（`with_mean=True`），每个原本为 0 的位置都会填充非零数值，导致稀疏矩阵瞬间转化为密集的 NumPy 数组，内存占用激增数百倍并引发致命的 OOM 崩溃。处理稀疏矩阵必须设置 `with_mean=False` 或使用 `MaxAbsScaler`。",
            difficulty=3,
            related_lesson_id="ml-data-l5-1",
            tags=["稀疏矩阵", "StandardScaler", "with_mean参数", "内存优化"],
        ),
        # ── Comprehensive Capstone Open Exercise ──
        open_ex(
            ex_id="ml-data-c5-ex8",
            question="""【Python 与机器学习数据处理综合大作业：端到端防泄漏工业级特征流水线设计与落地实战】
作为一名资深机器学习工程师，你负责搭建一套用于金融信贷逾期违约预测的生产级特征工程预处理与建模流水线。
数据集包含连续特征（年龄、月收入、负债率）、名义分类特征（住房情况、贷款目的）、高基数类别特征（工作行业分类 `industry_code`）以及目标标签（是否违约 `is_default`）。
请结合本课程所学，系统设计并论述该项目的全流程落地方案：

1. 【缺失值与异常值工程治理】：
   - 连续特征存在部分缺失，且“月收入”特征具有极度右偏的长尾分布并混杂有极端异常大额数值；
   - 详述应采用何种组合策略（填补策略、异常值检测算法、无量纲化算子）进行治理，并给出数理理由。

2. 【高基数类别特征治理与防泄漏编码】：
   - 针对高基数类别特征 `industry_code`（包含 2,000 个行业代码），阐明为什么不能使用简单的 One-Hot 或 LabelEncoder；
   - 详细设计一套结合经验贝叶斯平滑与 K-Fold 折外的目标编码方案，确保杜绝目标泄漏。

3. 【端到端防泄漏 Pipeline 架构设计】：
   - 给出基于 Scikit-learn 的 `Pipeline` 与 `ColumnTransformer` 的完整架构组织方案；
   - 阐明为什么“先划分训练测试集、再在交叉验证内部执行预处理”是保证泛化评估真实性的唯一准绳，并说明该流水线如何实现线上生产微服务的无缝幂等部署。""",
            reference_answer="""端到端防泄漏工业级特征工程全流程设计方案如下：

1. 【缺失值与异常值工程治理】：
   - 缺失值治理：对于连续特征，采用中位数填补（`SimpleImputer(strategy='median')`），同时必须设置 `add_indicator=True`（生成 `MissingIndicator` 缺失二值列）。数理理由：中位数是鲁棒位置统计量，不受极值干扰；而违约场景中“某些收入不详”本身代表非随机缺失（MNAR），二值指示列能够将该不确定性显式传递给下游分类器。
   - 异常值与偏度治理：对于严重右偏且含极端异常值的月收入，首先施加对数平滑变换 `np.log1p(x)` 或 Yeo-Johnson 变换，压缩长尾并将右偏转换为对称形态；随后在缩放环节选用 `RobustScaler`（基于中位数与 IQR 进行无量纲化）。数理理由：坚决避免使用受离群点严重破坏的 MinMaxScaler 或极易产生异常掩盖的 StandardScaler，确保其余正常样本在优化空间中保留完整的距离分辨率。

2. 【高基数类别特征治理与防泄漏编码】：
   - 缺陷剖析：2,000 个类别的独热编码会带来高达 2,000 维的极度稀疏矩阵，导致树模型和线性模型在长尾小样本上出现巨大参数方差与严重过拟合；而 LabelEncoder 强行赋予任意连续数值，在特征空间中引入错误的虚假距离先验。
   - 解决方案（长尾截断 + 经验贝叶斯折外目标编码）：
     a. 首先统计各行业频次，仅保留覆盖率达 85% 的前 50 个高频类，其余低频长尾统一归并为 `'Other'` 桶（同时作为线上 OOV 兜底）；
     b. 对归并后的特征执行 K-Fold 折外目标编码（Out-of-Fold Target Encoding）：在训练集切分为 5 折，每一折的编码值严格仅使用其余 4 折样本计算；
     c. 引入经验贝叶斯平滑公式 $\\hat{S}_k = \\frac{n_k \\bar{y}_k + m \\cdot \\mu_{\\text{global}}}{n_k + m}$（设置平滑先验权重 $m=20$），将小样本类别平稳收缩至全局基准违约率，测试集使用全量训练集计算出的平滑映射表进行静态映射，彻底杜绝目标数据泄漏。

3. 【端到端防泄漏 Pipeline 架构设计与线上部署】：
   - 架构组装：
     a. 数值分支流水线：`Pipeline([('imputer', SimpleImputer(strategy='median', add_indicator=True)), ('scaler', RobustScaler())])`；
     b. 名义分类分支：`Pipeline([('imputer', SimpleImputer(strategy='most_frequent')), ('ohe', OneHotEncoder(handle_unknown='ignore', sparse_output=False))])`；
     c. 高基数分支：包装带平滑先验的 OOF 目标编码器；
     d. 使用 `ColumnTransformer` 将各异构子流水线分流并网，最外层接入带有类权重平衡的 `LogisticRegression` 或 `HistGradientBoostingClassifier`，组装为全局 `full_pipeline`。
   - 防泄漏与线上闭环：
     a. 数据集在接触任何转换器前，首先执行 `train_test_split`，将测试集永久隔离；在训练集上运行 `cross_val_score(full_pipeline, X_train, y_train, cv=5)`。由于流水线机制，每一折交叉验证内部都是从纯净的子训练集上执行 `fit`（学习中位数、分位数、编码表），并在子验证集上仅执行 `transform`，从数学上保证了测试信号零泄漏；
     b. 最终模型直接使用 `joblib.dump(full_pipeline, 'credit_risk_model.joblib')` 全量固化。线上生产服务直接加载该文件，传入未经处理的原始业务 JSON 字典，Pipeline 会自动按训练好的参数幂等执行转换与预测，彻底根除“离线清洗代码与线上推理代码双轨制”导致的代码不一致事故。""",
            explanation="全方位贯通缺失值指示器建模、RobustScaler 稳健缩放、高基数长尾截断与经验贝叶斯 OOF 目标编码，并基于 ColumnTransformer 与 Pipeline 给出工业级端到端防泄漏与模型上线闭环架构。",
            rubric=[
                {"point": "科学组合中位数填补、MissingIndicator、对数变换与 RobustScaler 并说明数理成因", "score": 25},
                {"point": "针砭高基数独热与序号编码弊端，严密设计长尾截断加经验贝叶斯平滑 OOF 目标编码", "score": 25},
                {"point": "清晰设计 ColumnTransformer 异构分流与最外层 Pipeline 端到端串联架构", "score": 25},
                {"point": "深刻阐述 CV 内部防泄漏原理与 joblib 整体持久化上线消除双轨制隐患的工程闭环", "score": 25},
            ],
            difficulty=5,
            related_lesson_id="ml-data-l5-3",
            tags=["综合大作业", "Pipeline", "ColumnTransformer", "防泄漏工程", "TargetEncoding", "工业级架构"],
        ),
    ]

    return chapter(
        chapter_id="ml-data-c5",
        course_id="ml-python-data",
        order=5,
        title="特征编码、无量纲化与防泄漏流水线工程",
        goal="掌握三大连续缩放算子与高基数折外目标编码，构建 ColumnTransformer 端到端无泄漏 Pipeline 闭环。",
        lessons=lessons,
        exercises=exercises,
    )
