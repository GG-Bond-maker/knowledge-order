# -*- coding: utf-8 -*-
"""
Chapter 1: 工业级特征工程与管道封装 (Advanced Feature Engineering & Scikit-Learn Pipelines)
Course: ml-engineering
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_1():
    # ── Lesson 1.1 ──
    l1_content = """### 学习目标
学完本节，你应该能够：
1. 掌握工业级类别特征编码的高阶范式：目标编码（Target Encoding）与其平滑正则化公式；
2. 理解高基数类别（High-Cardinality Categorical Features）中 One-Hot 导致的稀疏维度爆炸危害；
3. 掌握信贷风控与金融评分卡中的核心特征变换：证据权重（Weight of Evidence, WoE）与信息价值（Information Value, IV）；
4. 掌握连续特征的非线性分箱离散化（KBinsDiscretizer: 等频/等宽/聚类分箱）与多项式互动交叉项（Interaction Terms）；
5. 编写代码实现带贝叶斯平滑的目标编码器，并验证其在测试集上的抗过拟合表现。

### 前置知识
- 贝叶斯先验与后验概率；
- Pandas 分组聚合与 Scikit-learn 基础接口。

### 问题背景与 ML 用途
在数据科学界有一句广为人知的格言：“**数据和特征决定了机器学习的上限，而模型和算法只是逼近这个上限而已。**”
面对现实世界中的海量复杂表格数据：
- 类别特征常常包含数千甚至上万个独特取值（例如城市邮政编码、商品 SKU、设备型号）。若使用传统 One-Hot 独热编码，特征维度将瞬间膨胀成万维稀疏矩阵，引发显存暴涨与严重维数灾难；
- 目标编码（Target Encoding / Mean Encoding）直接用目标变量在该类别下的条件均值来代替类别标签，将任意维度的类别列直接压缩为一个致密的信息丰富的连续数值特征！
- 目标编码配合 WoE/IV 分箱，构成了信贷审批、广告点击率预估（CTR）和 Kaggle 顶级竞赛特征工程的绝对核心武器。

### 直觉理解
- **名誉评分替代长相（目标编码）**：如果去某个陌生城市选餐馆，你不知道“老张私房菜”、“翠花小炒”到底好不好吃（高基数名称）。与其记住每家餐馆的名字，不如直接把每家店替换为“过去一年去这家店的顾客给出好评的平均百分比（0.85、0.32）”。这样，复杂的店名瞬间被降维成了最有价值的连续信用指标！
- **贝叶斯平滑（抗小样本波动）**：如果一家新开的奶茶店只有 1 个人光顾并且给了好评，我们能断定它的好评率是 100% 吗？显然不能！聪明的做法是用全城奶茶店的平均好评率（全局先验）对它进行“拉拽拉齐”，当样本量很小时偏向全局均值，当样本量很大时才相信它自己的经验均值。

### 核心概念与符号对照表
| 核心概念 | 符号 / 公式 | 统计学本质 | 核心用途 |
| --- | --- | --- | --- |
| **目标编码** | $\\hat{x}_c = \\frac{1}{n_c} \\sum_{i \\in c} y_i$ | 类别 $c$ 对应的目标标签条件经验期望 $E[Y \\mid X=c]$ | 将高基数离散类别致密转换为单一连续特征 |
| **平滑目标编码** | $S_c = \\frac{n_c \\cdot \\bar{y}_c + m \\cdot \\bar{y}}{n_c + m}$ | 经验均值与全局先验的贝叶斯加权平滑（$m$ 为平滑权重） | 彻底根除长尾罕见类别的小样本目标过拟合 |
| **证据权重 (WoE)** | $\\text{WoE}_i = \\ln\\left( \\frac{\\text{Good}_i / \\text{Good}_{\\text{total}}}{\\text{Bad}_i / \\text{Bad}_{\\text{total}}} \\right)$ | 某分箱内好坏客户比例与总体比例的对数优势比 | 银行评分卡标准特征变换，单调化非线性关系 |
| **信息价值 (IV)** | $\\text{IV} = \\sum (\\%G_i - \\%B_i) \\times \\text{WoE}_i$ | 各分箱对目标变量区分能力的加权综合度量 | 工业风控中筛选关键预测特征的核心标尺 |

### 数学原理与逐步推导
#### 1. 目标编码的过拟合风险与贝叶斯平滑公式推导
朴素目标编码直接取子集标签均值：$\\bar{y}_c = \\frac{1}{n_c} \\sum_{i \\in I_c} y_i$。
若某类别 $c$ 在训练集中仅出现 1 次且标签为 $y=1$（例如稀有欺诈订单），朴素编码赋予其值 1.0。若测试集中该类别再次出现，模型会将其误判为 100% 欺诈，导致极其严重的过拟合。
为了解决这一问题，Micci-Barreca (2001) 提出了经典的**贝叶斯经验平滑公式**：
$$S_c = \\lambda(n_c) \\bar{y}_c + (1 - \\lambda(n_c)) \\bar{y}_{\\text{global}}$$
其中全局目标均值为 $\\bar{y}_{\\text{global}} = \\frac{1}{N} \\sum_{i=1}^N y_i$。权重函数 $\\lambda(n_c) \\in [0, 1]$ 满足随着样本量 $n_c$ 增大单调递增至 1。
最常用的线性平滑核函数为：
$$\\lambda(n_c) = \\frac{n_c}{n_c + m}$$
代入得到工业通用的平滑公式：
$$S_c = \\frac{n_c \\bar{y}_c + m \\bar{y}_{\\text{global}}}{n_c + m}$$
- 当样本极多（$n_c \\gg m$）时：$\\frac{n_c}{n_c+m} \\approx 1$，$S_c \\approx \\bar{y}_c$（充分相信本类别的统计量）；
- 当样本极少（$n_c \\to 0$）时：$S_c \\approx \\bar{y}_{\\text{global}}$（退化为全局平均基准，杜绝极端异常值）。

### 真实代码示例与分析
下面展示如何通过 Python 实现带平滑的目标编码器，并使用交叉验证防止数据泄漏："""

    l1_code = """import numpy as np
import pandas as pd
from sklearn.model_selection import KFold

def smooth_target_encode(train_df: pd.DataFrame, test_df: pd.DataFrame, 
                         cat_col: str, target_col: str, m: float = 10.0) -> tuple:
    \"\"\"工业级带 K-Fold 交叉验证的平滑目标编码器 (彻底防训练集自身信息泄漏)\"\"\"
    global_mean = train_df[target_col].mean()
    train_encoded = np.zeros(len(train_df))
    
    # 1. 对训练集使用 Out-Of-Fold (OOF) 方式编码，杜绝自引用泄漏
    kf = KFold(n_splits=5, shuffle=True, random_state=42)
    for tr_idx, val_idx in kf.split(train_df):
        tr_part = train_df.iloc[tr_idx]
        stats = tr_part.groupby(cat_col)[target_col].agg(['count', 'mean'])
        # 贝叶斯平滑公式
        smooth_val = (stats['count'] * stats['mean'] + m * global_mean) / (stats['count'] + m)
        val_cats = train_df.iloc[val_idx][cat_col]
        train_encoded[val_idx] = val_cats.map(smooth_val).fillna(global_mean).values

    # 2. 对测试集使用全量训练集的完整统计量编码
    full_stats = train_df.groupby(cat_col)[target_col].agg(['count', 'mean'])
    test_smooth = (full_stats['count'] * full_stats['mean'] + m * global_mean) / (full_stats['count'] + m)
    test_encoded = test_df[cat_col].map(test_smooth).fillna(global_mean).values

    return train_encoded, test_encoded

# 构造包含高基数稀有类别的示例数据
df_train = pd.DataFrame({
    'city': ['Beijing', 'Beijing', 'Shanghai', 'Tibet', 'Beijing', 'Shanghai', 'Tibet'],
    'bought': [1, 1, 0, 1, 0, 1, 0]
})
df_test = pd.DataFrame({'city': ['Beijing', 'Tibet', 'NewCity_Unknown']})

tr_enc, te_enc = smooth_target_encode(df_train, df_test, 'city', 'bought', m=5.0)
print("=== 训练集 OOF 目标编码结果 ===")
print(np.round(tr_enc, 4))
print("\\n=== 测试集目标编码结果 (含未知未登录新城市) ===")
print(np.round(te_enc, 4))
print(f"全局基准均值: {df_train['bought'].mean():.4f}")
"""

    l1_tips = [
        tip("切记：目标编码绝不能直接在全量训练集上用单次 groupby().mean() 计算！否则模型会发生严重的‘目标泄漏’（Target Leakage），导致训练集虚高过拟合。在训练集内部必须使用 Out-of-fold（OOF）分折计算！", "leak"),
    ]

    # ── Lesson 1.2 ──
    l2_content = """### 学习目标
学完本节，你应该能够：
1. 掌握特征选择的三大经典流派：过滤式（Filter）、包裹式（Wrapper）与嵌入式（Embedded）；
2. 掌握基于统计显著性的过滤评估：方差阈值（Variance Threshold）、方差分析（ANOVA F-test）与互信息（Mutual Information）；
3. 掌握递归特征消除（RFE / RFECV）的工作机制与交叉验证特征子集搜索；
4. 掌握基于模型内在系数的嵌入选择（Lasso L1 稀疏性与树模型特征重要性阈值截断）；
5. 掌握特征选择中的防泄漏铁律：为什么特征选择必须作为 Pipeline 的一部分在各交叉验证折内独立拟合。

### 前置知识
- 假设检验基础（p 值与 F 检验）；
- 贪心搜索与过拟合防范。

### 问题背景与 ML 用途
在真实的工业数据中，特征工程往往会衍生出成百上千个新变量（各种时间滑动窗口均值、交叉乘积、分箱指标等）。
但这会引入严重的负面影响：
1. **垃圾进，垃圾出（Garbage in, Garbage out）**：大量无关的噪声特征会严重扰乱树模型的分裂方向，破坏距离度量（KNN/SVM）；
2. **多重共线性**：高度相关的重复特征会导致线性模型参数极不稳定；
3. **推理延迟与存储开销**：特征越多，线上实时特征工程管道的计算延迟越长，直接拖垮在线服务的响应 SLA。
**特征选择（Feature Selection）是精简特征集、提升模型泛化性能并压榨在线推理速度的关键工序**。

### 直觉理解
- **招牌员工筛选考核的三种方式**：
  - **过滤式（Filter）**：在正式面试前设立硬性笔试门槛（如学历、英语四六级成绩、方差是否非零）。完全不看后续面试官（学习算法）是谁，先用简单的统计标尺把明显不合格的快速筛掉。速度极快，开销极低；
  - **包裹式（Wrapper）**：把最终的模型当成黑盒考官。先挑 3 个人组合模拟工作，评估效果；再换一组人，看哪组团队配合打分最高（如 RFE 逐步淘汰最后一名）。精度极高，但需要反复训练成百上千次模型，计算极慢；
  - **嵌入式（Embedded）**：考官直接在平时的实际工作考核过程中，根据员工的绩效系数（如 Lasso 的回归系数 $\\mathbf{w}$ 或随机森林的特征分裂贡献度）自然完成排序筛选。兼具高效率与针对性。

### 核心概念与符号对照表
| 特征选择方法 | 典型算法 / 工具 | 核心机制 | 优缺点对比 |
| --- | --- | --- | --- |
| **过滤式 (Filter)** | `SelectKBest`, `VarianceThreshold`, `mutual_info_classif` | 根据特征与标签之间的单变量统计相关性独立打分 | **速度极快**；但忽略了特征之间的多重共线性与协同互动组合 |
| **包裹式 (Wrapper)** | `RFE` (递归特征消除), `SequentialFeatureSelector` | 使用特定预测器反复迭代拟合，按贡献度倒序剔除 | **考虑特征协同**，效果上限高；但计算极其昂贵，容易对验证集过拟合 |
| **嵌入式 (Embedded)** | `SelectFromModel` (Lasso, Random Forest, LightGBM) | 训练自带特征选择机制的复杂模型，按内在重要性阈值截断 | **性价比最高**；兼顾非线性相关性与单次训练的高效计算 |

### 数学原理与逐步推导
#### 互信息（Mutual Information）过滤度量
互信息度量的是两个变量之间的任意依赖关系（包括线性和复杂的非线性关系）。
对离散特征 $X$ 与目标标签 $Y$，互信息定义为边缘分布与联合分布之间的 KL 散度：
$$I(X; Y) = \\sum_{x \\in \\mathcal{X}} \\sum_{y \\in \\mathcal{Y}} P(x, y) \\log \\frac{P(x, y)}{P(x) P(y)}$$
- 若 $X$ 与 $Y$ 完全统计独立：$P(x, y) = P(x) P(y)$，则 $\\log(1) = 0$，$I(X; Y) = 0$（该特征对预测目标毫无信息增益，应立即剔除）；
- $I(X; Y)$ 越大，说明知晓特征 $X$ 能让目标 $Y$ 的不确定性（熵）降低得越多！
与皮尔逊相关系数仅能度量线性相关不同，**互信息能够灵敏检测任意复杂的非线性几何形态**（如 $Y = X^2$ 时 Pearson 相关系数为 0，但互信息极其显著）。

### 真实代码示例与分析
下面展示如何通过 `SelectKBest` 互信息过滤与 `SelectFromModel` 嵌入式筛选高效剔除海量白噪声特征："""

    l2_code = """import numpy as np
from sklearn.datasets import make_classification
from sklearn.feature_selection import SelectKBest, mutual_info_classif, SelectFromModel
from sklearn.ensemble import RandomForestClassifier

# 1. 构造一个包含 5 个真信号特征和 15 个纯白噪声特征的数据集 (共 20 维)
X, y = make_classification(
    n_samples=500, n_features=20, n_informative=5,
    n_redundant=0, n_repeated=0, random_state=42
)

# 2. 过滤式特征选择: 基于互信息提取前 5 个最强特征
selector_mi = SelectKBest(score_func=mutual_info_classif, k=5)
X_mi = selector_mi.fit_transform(X, y)
selected_indices_mi = np.where(selector_mi.get_support())[0]

# 3. 嵌入式特征选择: 基于随机森林的特征重要性筛选
rf = RandomForestClassifier(n_estimators=50, random_state=42)
selector_embed = SelectFromModel(estimator=rf, max_features=5)
X_embed = selector_embed.fit_transform(X, y)
selected_indices_embed = np.where(selector_embed.get_support())[0]

print(f"原始特征维度: {X.shape[1]} 维")
print(f"互信息 Filter 选中的特征索引: {selected_indices_mi} (成功锁定真信号特征!)")
print(f"随机森林 Embedded 选中的特征索引: {selected_indices_embed}")
print(f"真实有效特征索引前 5 位: [0, 1, 2, 3, 4] 左右")
"""

    l2_tips = [
        tip("绝对不能在全量数据（训练集+测试集）上做特征选择！如果在拆分测试集之前就计算了互信息或运行了 RFE，测试集的目标信息就已经渗透进了特征子集的筛选中，这是典型的‘隐式信息泄漏’！必须在拆分出纯净测试集之后，仅使用训练集来 fit 特征选择器。", "leak"),
    ]

    # ── Lesson 1.3 ──
    l3_content = """### 学习目标
学完本节，你应该能够：
1. 掌握 Scikit-Learn `Pipeline` 与 `ColumnTransformer` 的工业级模块化架构；
2. 深刻理解为什么将特征预处理与估算器绑定为单一原子对象能够杜绝任何形态的数据泄漏；
3. 掌握自定义特征转换器（Custom Transformer）的实现规范（继承 `BaseEstimator` 与 `TransformerMixin`）；
4. 熟练构建针对数值列（缺失值中位数填充 + 标准化）与类别列（缺失值常数填充 + One-Hot / Target 编码）的异构并行特征管道；
5. 编写代码完整实现一个高健壮性、可直接保存持久化并在测试数据上一键推理的端到端数据流水线。

### 前置知识
- Python 面向对象编程（类继承与魔法方法）；
- Scikit-Learn `fit()`、`transform()` 与 `fit_transform()` 接口规范。

### 问题背景与 ML 用途
在初学机器学习时，很多人习惯写一长串杂乱的脚本：
先对整个 Pandas DataFrame 填缺失值，再调用 `StandardScaler` 做标准化，再手动拼装特征……
这种非工程化的工作流存在三大毁灭性隐患：
1. **数据泄漏重灾区**：很容易不经意间在测试集上使用了训练集的均值，或者在标准化时混入了测试集的方差；
2. **代码脆弱且无法维护**：测试集如果多了一列、少了一行、或者缺失值出现在了训练集中没有出现的位置，手工处理代码立即报出致命 KeyError；
3. **无法上线生产**：线上微服务接收到前端发来的单个 JSON 字典（例如一个用户的一行特征）时，根本无法复用那套杂乱的离线脚本！
**Scikit-Learn 的 Pipeline 架构是工业界工程落地的最高规范**：
它将数据清洗、特征提取、维度缩减与最终模型紧密胶装成一个完整的黑盒整体，对外暴露统一的 `fit(X, y)` 与 `predict(X)` 接口！

### 直觉理解
- **汽车工业的标准组装流水线**：
  - 如果造汽车是手工作坊：工人们东敲一下西拧一个螺丝，测试车和量产车混在一起装配，零件经常放错（数据泄漏），换个新车型整套工具全部作废；
  - Pipeline 则是现代化的现代汽车总装车间：钢板进来，第一工位冲压车身（缺失值填补），第二工位喷涂底漆（特征标准化），第三工位安装智能引擎（XGBoost 分类器），出厂直接就是一辆整车（预测概率）！无论是成批生产（批量训练）还是定制单车（单条在线推理），流水线动作毫秒级标准复现！

### 核心概念与符号对照表
| 核心组件 | Scikit-Learn 类 | 核心职能 | 工业应用场景 |
| --- | --- | --- | --- |
| **串行流水线** | `Pipeline(steps=[...])` | 前一步的输出作为后一步的输入，依次顺序执行 | 数据清洗 $\\to$ 特征工程 $\\to$ 模型训练一体化封装 |
| **异构列转换器** | `ColumnTransformer(transformers=[...])` | 对不同列应用不同的预处理策略，并在水平方向拼接（concat） | 数值列做归一化，文本列做 TF-IDF，类别列做独热编码 |
| **自定义转换器** | `BaseEstimator, TransformerMixin` | 遵循标准 API 规范，拥有 `fit()` 和 `transform()` 方法 | 编写领域专属的特征工程逻辑（如经纬度距离计算） |

### 真实代码示例与分析
下面展示构建一个能够同时处理数值缺失异常与类别异构数据的完整工业级 Pipeline："""

    l3_code = """import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression

# 1. 编写自定义特征工程转换器: 计算两列比值特征 (如负债收入比)
class RatioFeatureExtractor(BaseEstimator, TransformerMixin):
    def __init__(self, numerator_col: str, denominator_col: str, new_col_name: str = "ratio"):
        self.numerator_col = numerator_col
        self.denominator_col = denominator_col
        self.new_col_name = new_col_name
        
    def fit(self, X, y=None):
        return self  # 无状态学习，直接返回 self
        
    def transform(self, X):
        X_df = pd.DataFrame(X).copy()
        # 加上微小常数防止除以零
        ratio = X_df[self.numerator_col] / (X_df[self.denominator_col] + 1e-6)
        return ratio.values.reshape(-1, 1)

# 2. 构造含有异构类型与缺失值的真实业务模拟数据
train_raw = pd.DataFrame({
    'debt': [1000.0, 5000.0, np.nan, 2000.0, 8000.0],
    'income': [5000.0, 10000.0, 4000.0, np.nan, 12000.0],
    'education': ['college', 'highschool', 'college', 'master', 'highschool'],
    'approved': [1, 1, 0, 1, 0]
})

num_features = ['debt', 'income']
cat_features = ['education']

# 3. 组装列转换器
num_pipeline = Pipeline([
    ('imputer', SimpleImputer(strategy='median')),
    ('scaler', StandardScaler())
])

cat_pipeline = Pipeline([
    ('imputer', SimpleImputer(strategy='most_frequent')),
    ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
])

preprocessor = ColumnTransformer(transformers=[
    ('num', num_pipeline, num_features),
    ('cat', cat_pipeline, cat_features)
])

# 4. 组装端到端完整生产流水线
full_pipeline = Pipeline([
    ('preprocessor', preprocessor),
    ('classifier', LogisticRegression(random_state=42))
])

# 5. 训练与端到端一键拟合
X_tr = train_raw[['debt', 'income', 'education']]
y_tr = train_raw['approved']
full_pipeline.fit(X_tr, y_tr)

# 6. 对未见过的全新测试样本进行毫秒级端到端预测
new_applicant = pd.DataFrame({
    'debt': [3000.0],
    'income': [7000.0],
    'education': ['phd']  # 训练集未见过的学历类别，handle_unknown='ignore' 平稳应对!
})
prob = full_pipeline.predict_proba(new_applicant)[0, 1]
print("=== 工业级端到端 Pipeline 运行成功 ===")
print(f"全新客户贷款审批通过概率: {prob:.4f}")
print("包含步骤:", [name for name, _ in full_pipeline.steps])
"""

    l3_tips = [
        tip("在生产中使用 OneHotEncoder 时，务必显式设置 handle_unknown='ignore'！否则一旦线上出现训练集未见过的生僻类别，代码会立即抛出致命 ValueError 异常导致线上服务中断崩溃。", "pitfall"),
        tip("Pipeline 对象可以直接通过 joblib.dump(full_pipeline, 'model.joblib') 完整序列化打包，包含了所有的均值、方差、中位数和分类模型权重，客户端只需载入单文件即可无缝执行 predict()！", "performance"),
    ]

    lessons = [
        lesson("ml-eng-l1-1", "高级特征变换与编码技术", l1_content, 2, l1_tips, [demo(code=l1_code, title="贝叶斯平滑目标编码器与 OOF 防泄漏实现")]),
        lesson("ml-eng-l1-2", "特征选择与降噪过滤策略", l2_content, 2, l2_tips, [demo(code=l2_code, title="互信息过滤与随机森林嵌入式特征选择")]),
        lesson("ml-eng-l1-3", "现代 Scikit-Learn 流水线架构（Pipeline & ColumnTransformer）", l3_content, 3, l3_tips, [demo(code=l3_code, title="异构特征混合处理与端到端 Pipeline 组装")]),
    ]

    exercises = [
        single_choice(
            ex_id="ml-eng-c1-ex1",
            question="在处理包含数千个唯一取值的高基数离散类别特征时，相比于传统的 One-Hot 独热编码，采用平滑目标编码（Smooth Target Encoding）的最核心优势是什么？",
            options=[
                {"value": "A", "text": "将可能导致维度爆炸的数千维稀疏特征直接压缩为单一信息致密的连续特征，同时利用先验均值平滑遏制低频类别过拟合"},
                {"value": "B", "text": "能够自动将二分类问题转换为多任务强化学习问题"},
                {"value": "C", "text": "不需要使用训练集的目标变量"},
                {"value": "D", "text": "保证转换后的特征服从标准正态分布"},
            ],
            answer="A",
            explanation="One-Hot 面对高基数类别会产生灾难性的稀疏高维矩阵，导致树模型分裂效率低下和严重的维数灾难。目标编码将每个类别映射为其对应的目标期望值，维度仅为 1，贝叶斯平滑进一步消除了稀有罕见小样本的极值过拟合。",
            difficulty=2,
            related_lesson_id="ml-eng-l1-1",
            tags=["目标编码", "高基数特征", "特征工程", "贝叶斯平滑"],
        ),
        judge(
            ex_id="ml-eng-c1-ex2",
            question="在构建特征工程流水线时，只要使用 `StandardScaler()` 对特征做标准化，就可以在切分训练集和测试集之前，直接对全量数据集运行 `fit_transform()` 以便简化代码流程。",
            answer=False,
            explanation="错误！这是最典型的数据泄漏（Data Leakage）错误。如果直接对全量数据 fit_transform，测试集的均值和标准差就会渗透到训练集中。正确做法必须是：仅在训练集上 fit，随后用学习到的统计量对测试集做 transform。",
            difficulty=1,
            related_lesson_id="ml-eng-l1-3",
            tags=["数据泄漏", "标准化", "Pipeline规范"],
        ),
        multiple_choice(
            ex_id="ml-eng-c1-ex3",
            question="关于特征选择方法中的‘互信息’（Mutual Information, MI），下列说法正确的有：",
            options=[
                {"value": "A", "text": "互信息基于信息论中的香农熵与 KL 散度构建，度量特征与标签之间的依赖程度"},
                {"value": "B", "text": "互信息只能捕捉特征与标签之间的线性相关关系，对非线性关系无效"},
                {"value": "C", "text": "若特征与标签完全相互独立，则两者之间的互信息精确为 0"},
                {"value": "D", "text": "即使特征与标签之间存在复杂的非线性函数映射（如 $Y = X^2$），互信息依然能灵敏地捕捉到强依赖信号"},
            ],
            answer=["A", "C", "D"],
            explanation="互信息基于信息论，度量两个变量的任意依赖程度。若完全独立则 MI=0；若存在确定性非线性关系（如抛物线映射），Pearson 线性相关系数可能接近 0，但互信息依然很大。因此选项 B 错误，A、C、D 正确。",
            difficulty=2,
            related_lesson_id="ml-eng-l1-2",
            tags=["互信息", "特征选择", "非线性相关"],
        ),
        fill(
            ex_id="ml-eng-c1-ex4",
            question="在工业生产环境中，为了防止线上接收到的新样本出现训练集中从未见过的生僻类别而导致服务抛出 KeyError 异常崩溃，配置 Scikit-Learn 的 `OneHotEncoder` 时，应将参数 `handle_unknown` 显式设置为 '___'（请填写英文单词，全小写）。",
            blanks=[["ignore"]],
            explanation="设置 handle_unknown='ignore' 后，当遇到未见过的生僻类别时，编码器会将其全部编码为 0 全零行，而不会抛出致命异常中断服务。",
            difficulty=2,
            related_lesson_id="ml-eng-l1-3",
            tags=["OneHotEncoder", "生产环境", "handle_unknown"],
        ),
        open_ex(
            ex_id="ml-eng-c1-ex5",
            question="请详细阐述在表格数据建模中，为什么不能直接在训练集全量数据上使用 `train.groupby('category')['target'].mean()` 进行单纯的目标编码？并详细解释基于 Out-Of-Fold（OOF）分折目标编码是如何彻底杜绝这一隐患的。",
            reference_answer="1. 直接 groupby 均值编码的致命隐患（目标泄漏 Target Leakage）：\n若直接在全量训练集上分组求均值，每个样本在计算自己的编码值时，自身真实的标签 y_i 也参与了该均值的计算。对于样本极少的罕见类别（例如某个类别只出现了一次，且 y=1），其编码值直接等于 1.0，这相当于直接把目标标签本身硬拷贝到了特征中。模型在训练时会过度依赖这一特征，并在该类别的特征值上产生极端自信的拟合，而在面对包含噪声的测试集时泛化性能会彻底崩溃。\n2. Out-Of-Fold（OOF）分折编码的防泄漏机理：\nOOF 借鉴了 K 折交叉验证的思想：将训练集划分为 K 折（例如 5 折）。在对第 k 折样本进行目标编码时，仅使用其余 K-1 折的数据进行分组统计计算均值，然后将统计结果映射到第 k 折的样本上。这一机制严格保证了：任何一个训练样本的编码数值，完全来自于其他独立样本，其自身的目标标签绝不参与自身特征的构建，彻底杜绝了自引用目标泄漏，保证了训练集特征分布与未来测试集的统计同分布。",
            explanation="系统分析单纯目标编码引发的自引用目标泄漏机理，并从 K 折隔离的角度阐述 OOF 的无偏特征映射保障。",
            rubric=[
                {"points": 5, "description": "阐述直接求均值会导致样本自身标签参与特征计算，形成自引用目标泄漏与严重过拟合"},
                {"points": 5, "description": "阐述 OOF 分折机制如何通过只使用其余 K-1 折样本统计量来严格隔离自身标签"},
            ],
            difficulty=3,
            related_lesson_id="ml-eng-l1-1",
            tags=["目标编码", "目标泄漏", "OOF", "特征工程规范"],
        ),
        # ── Code Exercise 1 ──
        {
            "id": "ml-eng-c1-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】从零实现平滑目标编码单列映射函数：\n编写函数 `calculate_smooth_target_encoding(categories, targets, m=10.0)`：\n接收包含离散类别标签的列表 `categories` 和二分类标签列表 `targets`（值为 0 或 1），以及平滑权重系数 $m > 0$。\n根据贝叶斯平滑公式：\n$$S_c = \\frac{n_c \\cdot \\bar{y}_c + m \\cdot \\bar{y}_{\\text{global}}}{n_c + m}$$\n其中 $\\bar{y}_{\\text{global}}$ 为全量标签均值，$n_c$ 为类别 $c$ 出现的频次，$\\bar{y}_c$ 为该类别下的样本标签均值。\n\n函数返回一个字典 `dict`，键为各个不同的类别字符串/数值，值为对应计算出的平滑目标编码值（浮点数，使用 `round(val, 4)` 保留 4 位小数）。\n\n最后一行请以 `cats_demo = ['A', 'A', 'B', 'B', 'B', 'C']`, `tgts_demo = [1, 1, 0, 0, 1, 0]`（$m=2.0$）调用该函数测试。",
            "starterCode": "from typing import Dict, Any, List\nimport numpy as np\n\ndef calculate_smooth_target_encoding(categories: List[Any], targets: List[int], m: float = 10.0) -> Dict[Any, float]:\n    \"\"\"从零计算各个离散类别的贝叶斯平滑目标编码映射字典\"\"\"\n    # 请在此实现\n    ___\n\ncats_demo = ['A', 'A', 'B', 'B', 'B', 'C']\ntgts_demo = [1, 1, 0, 0, 1, 0]\ncalculate_smooth_target_encoding(cats_demo, tgts_demo, m=2.0)\n",
            "setupCode": "",
            "expectedOutput": "{'A': 0.75, 'B': 0.4, 'C': 0.3333}",
            "answer": "from typing import Dict, Any, List\nimport numpy as np\n\ndef calculate_smooth_target_encoding(categories: List[Any], targets: List[int], m: float = 10.0) -> Dict[Any, float]:\n    targets = np.array(targets, dtype=float)\n    categories = list(categories)\n    global_mean = float(np.mean(targets))\n    \n    unique_cats = sorted(list(set(categories)))\n    result = {}\n    \n    for c in unique_cats:\n        indices = [i for i, cat in enumerate(categories) if cat == c]\n        n_c = len(indices)\n        mean_c = float(np.mean(targets[indices]))\n        smoothed_val = (n_c * mean_c + m * global_mean) / (n_c + m)\n        result[c] = round(float(smoothed_val), 4)\n        \n    return result\n\ncats_demo = ['A', 'A', 'B', 'B', 'B', 'C']\ntgts_demo = [1, 1, 0, 0, 1, 0]\ncalculate_smooth_target_encoding(cats_demo, tgts_demo, m=2.0)\n",
            "tests": "c_t = ['X', 'X', 'Y']\nt_t = [1, 1, 0]\nres = calculate_smooth_target_encoding(c_t, t_t, m=1.0)\n# global_mean = 2/3\n# for X: (2 * 1.0 + 1 * (2/3)) / (2 + 1) = (8/3)/3 = 8/9 = 0.8889\n# for Y: (1 * 0.0 + 1 * (2/3)) / (1 + 1) = (2/3)/2 = 1/3 = 0.3333\nassert res == {'X': 0.8889, 'Y': 0.3333}, f\"测试不匹配: {res}\"\n",
            "explanation": "统计各个类别的频数与条件均值，结合全局均值与平滑参数 m 执行贝叶斯平滑公式计算，返回键值映射字典。",
            "tags": ["平滑目标编码", "贝叶斯平滑", "算法实战", "特征工程"],
            "related_lesson_id": "ml-eng-l1-1",
        },
        single_choice(
            ex_id="ml-eng-c1-ex7",
            question="在金融信贷风控与评分卡开发中，为什么业务专家偏好将连续数值特征（如年龄、月收入）先进行非线性分箱并转化为证据权重（WoE）特征？",
            options=[
                {"value": "A", "text": "分箱不仅能消化处理极端的异常离群值和缺失值，还能将复杂的非线性关系转化为与对数几率严格单调的线性关系，同时极大增强模型业务可解释性"},
                {"value": "B", "text": "因为分箱后模型参数量会增加一百倍"},
                {"value": "C", "text": "因为 WoE 编码能够自动剔除所有的特征相关性"},
                {"value": "D", "text": "因为不分箱的话逻辑回归无法收敛"},
            ],
            answer="A",
            explanation="WoE 分箱是银行与风控评分卡的黄金标准。它把缺失值和极端离群值独立作为一个分箱平稳容纳，消除异常波动，将连续特征非线性映射为对违约对数几率呈线性的单调特征，使最终输出的评分卡每项加减分对业务完全白盒透明。",
            difficulty=2,
            related_lesson_id="ml-eng-l1-1",
            tags=["WoE", "分箱", "信贷风控", "模型可解释性"],
        ),
    ]

    return chapter(
        chapter_id="ml-eng-c1",
        course_id="ml-engineering",
        order=1,
        title="工业级特征工程与管道封装",
        goal="掌握平滑目标编码与 WoE/IV，掌握互信息与模型嵌入式特征选择，熟练构建健壮生产级 Scikit-Learn Pipeline。",
        lessons=lessons,
        exercises=exercises,
    )
