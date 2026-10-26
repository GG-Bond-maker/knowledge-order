# -*- coding: utf-8 -*-
"""
Chapter 5: 评估体系、验证策略与端到端工作流
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_5():
    # ── Lesson 5.1 ──
    l1_content = """### 学习目标
学完本节，你应该能够：
1. 熟练构建并解读二分类混淆矩阵（Confusion Matrix，TP, FP, FN, TN），掌握精确率（Precision）、召回率（Recall）与 F1-Score 的计算逻辑；
2. 深刻理解阈值移动（Threshold Moving）的业务本质，掌握如何根据商业代价矩阵动态调节分类阈值；
3. 掌握 ROC 曲线与 AUC（Area Under Curve）的统计学几何内涵，理解为什么 AUC 对正负样本比例变化保持鲁棒；
4. 掌握 PR 曲线（Precision-Recall Curve）在极度不平衡样本场景（如反欺诈、罕见病筛查）下的显微镜价值；
5. 运行代码实验，从零手写二分类混淆矩阵与 ROC/PR 坐标点生成计算器。

### 前置知识
- 概率测度与条件概率 $P(Y=1 \\mid X)$；
- 统计假设检验中的第一类错误（弃真，假阳性 $\\alpha$）与第二类错误（存伪，假阴性 $\\beta$）。

### 问题背景
在实际机器学习落地中，经常出现“算法在离线测试集上准确率 98%，上线后却被业务部门投诉直接下线”的惨案。
最典型的根因在于：**准确率（Accuracy）的虚假繁荣与业务代价的严重不对称**。
例如在信用卡交易反欺诈场景中，盗刷交易仅占 0.1%（正样本）。一个把所有交易全判为“正常”的无脑模型，其准确率高达 99.9%！但对于银行而言，100% 的盗刷交易被漏放（召回率为 0），导致数千万元的巨额直接资金损失。
因此，必须建立**混淆矩阵、ROC 曲线与 PR 曲线**构建的立体化评估显微镜。

### 直觉理解
- **混淆矩阵**：体检中心诊断账本：
  - **TP（真阳性）**：病人确有肿瘤，医生准确查出（立大功）；
  - **FP（假阳性，误报）**：健康人被误判为癌症，虚惊一场去复查（误杀成本）；
  - **FN（假阴性，漏报）**：病人确有肿瘤，医生漏诊放回家，延误治疗（致死代价！）；
  - **TN（真阴性）**：健康人判定健康，平安回家。
- **Precision（查准率）**：“警犬叫了 10 次，到底有几次是真的有炸弹？”（防误杀）；
- **Recall（查全率/召回率）**：“全场一共有 10 颗炸弹，警犬到底搜出了几颗？”（防漏网）；
- **ROC 曲线 vs PR 曲线**：ROC 是望远镜，看全景（抗样本倾斜）；PR 是显微镜，在 1% 极小正类的泥潭中精准捕捉有效信号。

### 核心概念与符号对照表
| 指标名称 | 数学计算公式 | 业务含义 | 适用典型场景 |
| --- | --- | --- | --- |
| **准确率 (Accuracy)** | $\\frac{\\text{TP} + \\text{TN}}{\\text{TP} + \\text{TN} + \\text{FP} + \\text{FN}}$ | 全部预测中猜对的总体比例 | 样本均衡、正负样本代价对称的场景 |
| **精确率 (Precision)** | $\\frac{\\text{TP}}{\\text{TP} + \\text{FP}}$ | 预测为正的样本中，实际确实为正的比例 | 误报代价极高（垃圾邮件过滤、推荐系统） |
| **召回率 (Recall / TPR)** | $\\frac{\\text{TP}}{\\text{TP} + \\text{FN}}$ | 所有客观真实正样本中，被模型成功抓出的比例 | 漏报代价极高（癌症筛查、重大安全预警） |
| **假阳性率 (FPR)** | $\\frac{\\text{FP}}{\\text{FP} + \\text{TN}}$ | 所有客观真实负样本中，被误报为正的比例 | ROC 曲线的横坐标 |
| **$F_1$ 分数** | $2 \\cdot \\frac{\\text{Precision} \\cdot \\text{Recall}}{\\text{Precision} + \\text{Recall}}$ | 精确率与召回率的调和平均数（Harmonic Mean） | 综合衡量兼顾两者的平衡指标 |
| **ROC-AUC** | $\\int_0^1 \\text{TPR}(f) \\, d\\text{FPR}$ | 随机抽取一对正负样本，正样本打分大于负样本的概率 | 综合衡量模型全局排序能力 |

### 数学原理与逐步推导
#### 1. 为什么 $F_1$ 分数采用调和平均数，而不是算术平均数？
若采用算术平均数：$A = \\frac{P + R}{2}$。
当 Precision = 1.0，但 Recall = 0.01（极度极端偏科，全场只抓了一个最确定的样本）时：
$$A = \\frac{1.0 + 0.01}{2} = 0.505$$
算术平均居然还能给出超过 50 分的及格分！
而调和平均数倒数相加：
$$\\frac{1}{F_1} = \\frac{1}{2} \\left( \\frac{1}{P} + \\frac{1}{R} \\right) \\implies F_1 = \\frac{2 P R}{P + R}$$
代入上述数值：
$$F_1 = \\frac{2 \\times 1.0 \\times 0.01}{1.0 + 0.01} \\approx 0.0198$$
**数学美感**：调和平均数极端惩罚偏科！只要 Precision 或 Recall 中任何一项趋近于 0，$F_1$ 分数就会被强力拉向 0。

#### 2. ROC-AUC 的统计学概率解释
设随机抽取一个真实正样本 $\\mathbf{x}_+ \\sim \\mathcal{D}_+$，随机抽取一个真实负样本 $\\mathbf{x}_- \\sim \\mathcal{D}_-$。
模型输出的预测分数为 $s(\\mathbf{x})$。
则 AUC 具有极其优美的无偏统计学等价性：
$$\\text{AUC} = P(s(\\mathbf{x}_+) > s(\\mathbf{x}_-))$$
**含义**：AUC 严格等于“模型将随机抽取的正样本排在随机抽取的负样本之前的概率”。
- $\\text{AUC} = 0.5$ 对应完全随机瞎猜；
- $\\text{AUC} = 1.0$ 对应完美排序（所有正样本打分均严格高于所有负样本）。

### 逐步实现与代码解析
下面的 Python 脚本直接从基础数组计算混淆矩阵、Precision、Recall、F1 以及不同分类阈值下的 ROC 曲线点：

```python
import numpy as np

# 1. 模拟模型预测概率与真实标签 (不平衡二分类: 8 个负类, 4 个正类)
y_true = np.array([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1])
y_prob = np.array([0.1, 0.15, 0.2, 0.25, 0.4, 0.6, 0.65, 0.7, 0.35, 0.55, 0.85, 0.9])

def calc_confusion_metrics(y_true, y_prob, threshold=0.5):
    y_pred = (y_prob >= threshold).astype(int)
    tp = int(np.sum((y_true == 1) & (y_pred == 1)))
    fp = int(np.sum((y_true == 0) & (y_pred == 1)))
    fn = int(np.sum((y_true == 1) & (y_pred == 0)))
    tn = int(np.sum((y_true == 0) & (y_pred == 0)))
    
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    return {"TP": tp, "FP": fp, "FN": fn, "TN": tn, "Precision": precision, "Recall": recall, "F1": f1}

print("=== 默认阈值 0.5 时的评估指标 ===")
m50 = calc_confusion_metrics(y_true, y_prob, threshold=0.5)
for k, v in m50.items():
    print(f"  {k:10s}: {v if isinstance(v, int) else f'{v:.3f}'}")

print("\\n=== 调低阈值到 0.3 (宁可误杀不可漏放) ===")
m30 = calc_confusion_metrics(y_true, y_prob, threshold=0.3)
print(f"  Recall (召回率): {m30['Recall']:.3f} (从 {m50['Recall']:.3f} 显著提升至全覆盖！)")
print(f"  Precision (精确率): {m30['Precision']:.3f} (代价为误杀率略有上升)")
```

### 常见易错点与典型反例
1. **不平衡数据下盲目信任 ROC-AUC**：
   - 当负样本高达 999,000，正样本仅 1,000 时，若模型产生 9,990 个误报（FP），此时 $\\text{FPR} = 9990 / 999000 = 1\\%$（极小），ROC 曲线依然看起来极其完美接近左上角（AUC 可能高达 0.98）。但此时模型发出的 10000 次报警中，只有 1000 次是真的，精确率 Precision 仅有 10%！**在严重类别不平衡下，必须以 PR 曲线与 PR-AUC 为准**。

### 知识联系与进阶桥梁
- **上承**：2.2 节分类交叉熵损失；
- **下接**：5.2 节回归模型评估体系。

### 本节总结与自查清单
- [ ] 混淆矩阵四象限 TP, FP, FN, TN 分别对应第一类错误还是第二类错误？
- [ ] 为什么 F1 分数采用调和平均数而不是算术平均数？
- [ ] 为什么说 AUC 衡量的是模型的“排序能力”而非“绝对分类标签”？

### 权威来源与延伸阅读
- Tom Fawcett (2006). *An introduction to ROC analysis*, Pattern Recognition Letters.
- Jesse Davis, Mark Goadrich (2006). *The Relationship Between Precision-Recall and ROC Curves*, ICML Proceedings."""

    # ── Lesson 5.2 ──
    l2_content = """### 学习目标
学完本节，你应该能够：
1. 全面掌握连续值回归的核心评估指标：MSE、RMSE、MAE、MAPE 与对称 MAPE（sMAPE）；
2. 掌握决定系数 $R^2$（Coefficient of Determination）的数学严谨推导与方差分解结构；
3. 深刻理解为什么在测试集发生严重漂移或模型弱于均值基线时，$R^2$ 会出现负数（打破“平方必然为正”的直觉误区）；
4. 掌握调整后决定系数（Adjusted $R^2$）如何惩罚冗余无用特征的加入。

### 前置知识
- 总体方差与样本方差公式；
- 简单线性最小二乘残差正交性。

### 问题背景
在房价预测、供应链销量预测、股票波动率预测等连续实数场景中，我们如何判断一个回归模型是好是坏？
很多初学者只看 MSE（均方误差），然而：
- MSE 带有自变量单位的平方（如“人民币元的平方”），数值难以直观解读；
- MAE 虽然保持了原单位，但在房价 500 万时误差 5 万与在衣服 50 元时误差 5 万，百分比影响不可同日而语；
- 更关键的是：如何跨越不同的行业数据集比较模型拟合优劣？这就是**无量纲相对指标 $R^2$** 诞生的核心驱动力。

### 直觉理解
- **RMSE（均方根误差）**：带单位的几何标准差，极度厌恶偶发的大失误；
- **MAE（平均绝对误差）**：平价账本，一视同仁；
- **MAPE（平均绝对百分比误差）**：“误差占真实值的百分之几”。预测 100 块的东西差了 5 块（5% 误差），预测 10 块的东西差了 5 块（50% 误差）；
- **$R^2$（决定系数）**：**相比“完全不看任何特征、无脑猜历史平均值”，你的模型究竟多解释了百分之多少的方差？**

### 核心概念与符号对照表
| 指标名称 | 数学表达式 | 物理量纲 | 优缺点与特性 |
| --- | --- | --- | --- |
| **均方误差 (MSE)** | $\\frac{1}{n}\\sum (y_i - \\hat{y}_i)^2$ | 原单位平方 | 平滑易求导，但对离群误差呈二次放大 |
| **均方根误差 (RMSE)** | $\\sqrt{\\frac{1}{n}\\sum (y_i - \\hat{y}_i)^2}$ | 与 $y$ 原单位相同 | 保留原量纲直观性，仍对极端失误敏感 |
| **平均绝对误差 (MAE)** | $\\frac{1}{n}\\sum |y_i - \\hat{y}_i|$ | 与 $y$ 原单位相同 | 直观稳健，但无法惩罚偶尔的恶性大偏差 |
| **平均绝对百分比 (MAPE)** | $\\frac{100\\%}{n}\\sum \\left|\\frac{y_i - \\hat{y}_i}{y_i}\\right|$ | 百分比 $(\\%)$ | 相对误差，但在 $y_i=0$ 时发生除以零爆炸 |
| **决定系数 ($R^2$)** | $1 - \\frac{\\text{SS}_{\\text{res}}}{\\text{SS}_{\\text{tot}}}$ | 无量纲 (通常 $\\le 1$) | 反映数据方差被模型捕获的比例 |

### 数学原理与逐步推导
#### 1. 总平方和（SST）的方差三分解
定义三个核心平方和：
- **总平方和（$\\text{SS}_{\\text{tot}}$）**：因变量固有的总方差基线（无脑预测均值 $\\bar{y}$ 产生的误差和）：
  $$\\text{SS}_{\\text{tot}} = \\sum_{i=1}^n (y_i - \\bar{y})^2$$
- **残差平方和（$\\text{SS}_{\\text{res}}$）**：模型未捕获的残差误差：
  $$\\text{SS}_{\\text{res}} = \\sum_{i=1}^n (y_i - \\hat{y}_i)^2$$
- **回归解释平方和（$\\text{SS}_{\\text{reg}}$）**：模型预测值围绕均值的离散变异：
  $$\\text{SS}_{\\text{reg}} = \\sum_{i=1}^n (\\hat{y}_i - \\bar{y})^2$$

对于包含截距项的普通最小二乘线性回归（残差与预测值正交），在训练集上严格满足：
$$\\text{SS}_{\\text{tot}} = \\text{SS}_{\\text{reg}} + \\text{SS}_{\\text{res}}$$
两边同除以 $\\text{SS}_{\\text{tot}}$：
$$1 = \\frac{\\text{SS}_{\\text{reg}}}{\\text{SS}_{\\text{tot}}} + \\frac{\\text{SS}_{\\text{res}}}{\\text{SS}_{\\text{tot}}} \\implies R^2 = 1 - \\frac{\\text{SS}_{\\text{res}}}{\\text{SS}_{\\text{tot}}} = \\frac{\\text{SS}_{\\text{reg}}}{\\text{SS}_{\\text{tot}}}$$

#### 2. 为什么 $R^2$ 会出现负数？
许多初学者误以为 $R^2$ 带有“平方”，所以必然大于等于 0。
根据严谨定义：
$$R^2 = 1 - \\frac{\\sum (y_i - \\hat{y}_i)^2}{\\sum (y_i - \\bar{y})^2}$$
- 如果你的模型预测误差 $\\sum (y_i - \\hat{y}_i)^2$ 比直接用均值 $\\bar{y}$ 预测还要大（即 $\\text{SS}_{\\text{res}} > \\text{SS}_{\\text{tot}}$），则分式大于 1，$1 - (\\text{大于 } 1) < 0$！
- **场景**：在测试集上严重过拟合、或者测试集发生剧烈均值漂移时，$R^2$ 完全可能出现 $-0.5$、$-10$ 甚至负无穷大，这表明**你的模型比瞎猜历史平均值还要糟糕！**

#### 3. 调整后决定系数（Adjusted $R^2$）
在模型中不断胡乱添加新的无关自变量（哪怕是纯随机噪声），普通 $R^2$ 必然单调上升。
Adjusted $R^2$ 引入自由度惩罚：
$$R^2_{\\text{adj}} = 1 - \\left( \\frac{1 - R^2}{n - p - 1} \\right) (n - 1) = 1 - \\frac{\\text{SS}_{\\text{res}} / (n - p - 1)}{\\text{SS}_{\\text{tot}} / (n - 1)}$$
只有当新加入的特征对残差的削减幅度超越了损失 1 个自由度的代价时，$R^2_{\\text{adj}}$ 才会上升。

### 逐步实现与代码解析
下面的 Python 脚本实现标准回归指标评估器，并在过拟合模型上复现 $R^2$ 出现负数的真实场景：

```python
import numpy as np

def evaluate_regression(y_true, y_pred):
    n = len(y_true)
    residuals = y_true - y_pred
    
    mse = float(np.mean(residuals ** 2))
    rmse = float(np.sqrt(mse))
    mae = float(np.mean(np.abs(residuals)))
    
    ss_res = float(np.sum(residuals ** 2))
    ss_tot = float(np.sum((y_true - np.mean(y_true)) ** 2))
    r2 = 1.0 - (ss_res / ss_tot) if ss_tot > 0 else 0.0
    
    return {"MSE": mse, "RMSE": rmse, "MAE": mae, "R2": r2}

# 1. 正常优秀拟合
y_test = np.array([10.0, 20.0, 30.0, 40.0])
y_good = np.array([11.0, 19.5, 30.2, 39.0])
print("=== 优秀模型指标评估 ===")
print(evaluate_regression(y_test, y_good))

# 2. 恶劣预测 (比均值 25 还要偏离得多)
y_terrible = np.array([50.0, -10.0, 80.0, -20.0])
print("\\n=== 极度劣质模型指标评估 (复现负 R2) ===")
print(evaluate_regression(y_test, y_terrible))
```

### 常见易错点与典型反例
1. **真实值为 0 时强行算 MAPE**：
   - 当销售数据中含有零销量天数时，$\\frac{|y_i - \\hat{y}_i|}{y_i}$ 产生除以 0 致命错误。此时应改用加了常数平滑的 WAPE（加权绝对百分比）或对称 sMAPE。

### 知识联系与进阶桥梁
- **上承**：5.1 节分类评估；
- **下接**：5.3 节严密交叉验证防泄漏。

### 本节总结与自查清单
- [ ] 决定系数 $R^2$ 的物理本质是什么（被模型解释的方差比）？
- [ ] 面对什么样的数据缺陷，$R^2$ 会呈现负数？
- [ ] Adjusted $R^2$ 如何有效惩罚无用自变量的加入？

### 权威来源与延伸阅读
- Norman R. Draper, Harry Smith (1998). *Applied Regression Analysis*, Chapter 2: The Two-Variable Linear Regression, Wiley."""

    # ── Lesson 5.3 ──
    l3_content = """### 学习目标
学完本节，你应该能够：
1. 掌握 K 折交叉验证（K-Fold CV）、分层 K 折（Stratified K-Fold）与时序留出（Time-Series Split）的切分原则；
2. 深刻识别机器学习最隐蔽、最致命的杀手：**数据泄漏（Data Leakage）**的十大经典形态；
3. 理解为什么严禁在数据集切分之前调用 `fit_transform` 做任何标准化或特征编码；
4. 熟练运用 Scikit-Learn `Pipeline` 封装工业级无泄漏特征处理与模型训练全流程。

### 前置知识
- 数据集的训练集、验证集与独立测试集三级划分；
- 5.1/5.2 节分类与回归性能度量。

### 问题背景
数据泄漏（Data Leakage）被称为现代机器学习领域的“静默癌症”。
- **症状**：模型在离线评估和交叉验证中表现极佳（AUC 0.99，准确率 98%），工程师兴高采烈上线；
- **爆发**：上线第一天，面对源源不断流入的真实用户流量，预测性能断崖式雪崩，准确率直接暴跌到 55%！
原因在于：训练阶段不小心引入了只有在“未来”或“事后”才能获知的作弊信息，或者在特征工程时将验证集/测试集的信息悄悄渗透进了训练集。模型在做开卷作弊，而实际生产是一场闭卷考试。

### 直觉理解
- **数据泄漏就如同高考前夕提前偷看答案**：在平时模拟考中把把满分，自以为是绝世天才；到了正式高考（生产环境），没有提前泄题，立刻交白卷。
- **Pipeline 的护城河**：Pipeline 就像一个严格的考场安检门，把特征预处理（如何算均值、方差、中位数）全部锁死在每个训练折内部，绝对禁止窥视测试折分毫。

### 核心概念与符号对照表
| 交叉验证策略 | 切分机制 | 核心约束 | 典型应用领域 |
| --- | --- | --- | --- |
| **标准 K 折 (K-Fold)** | 数据均匀切分成 $K$ 份，轮流用 1 份做验证，$K-1$ 份做训练 | 假设样本完全独立同分布（i.i.d.） | 均衡表格数据、通用回归任务 |
| **分层 K 折 (Stratified)** | 每一折中正负标签比例严格与全量数据集相同 | 保持各类别的先验分布一致 | 类别不平衡分类（如欺诈、流失） |
| **时序滚动 (TimeSeriesSplit)** | 训练窗口在时间轴上逐步向前滑动，只能用历史预测未来 | 严禁未来信息向过去泄漏 | 金融股票、销售预测、宏观经济时序 |
| **Pipeline 封装** | 将特征变换器与预测器串联为一个原子黑盒对象 | 测试折数据只能调用 `transform`，严禁 `fit` | 工业生产级机器学习标准代码范式 |

### 数据泄漏十大致命场景排查清单
1. **预处理全局泄漏**：在拆分训练集和测试集之前，对全量数据 $X$ 一次性调用 `StandardScaler.fit_transform(X)`（将测试集的均值和方差提前混入了训练集！）；
2. **缺失值全局填充**：使用全量数据的全局中位数去填充训练集的缺失值；
3. **目标编码泄漏（Target Encoding Leakage）**：用测试集中的真实标签 $y$ 去计算类别特征的目标均值；
4. **时间穿越泄漏**：用当天收盘价去预测当天的开盘价；或在特征中包含了用户在未来 7 天的点击日志；
5. **重复样本/多重版本泄漏**：同一个用户的行为日志分散在训练集和测试集（应当按 `user_id` 做 Group-KFold 切分，而不是随机打散）。

### 逐步实现与代码解析
下面的 Python 完整代码演示了一个典型的数据泄漏陷阱（切分前标准化），以及如何使用 `Pipeline` 彻底杜绝泄漏：

```python
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

# 1. 模拟一个纯高斯白噪声数据集 (完全无任何预测规律，理论 AUC 应该只有 0.5)
rng = np.random.default_rng(42)
n_samples, n_features = 200, 1000
X = rng.normal(0, 1, size=(n_samples, n_features))
y = rng.integers(0, 2, size=n_samples)

# ── 错误做法：切分前全局特征筛选与标准化 (严重数据泄漏！) ──
# 如果在切分前挑出了与全量 y 相关性最大的 5 个特征
corrs = np.array([np.abs(np.corrcoef(X[:, j], y)[0, 1]) for j in range(n_features)])
top_features_leaked = np.argsort(corrs)[-5:]
X_leaked = X[:, top_features_leaked]

# 看看泄漏数据上的虚假高分：
scores_leaked = cross_val_score(LogisticRegression(), X_leaked, y, cv=5)
print(f"【严重数据泄漏】纯噪声数据却跑出虚假高准确率: {np.mean(scores_leaked):.3f} (掩耳盗铃！)")

# ── 正确做法：使用 Pipeline，特征工程完全局限在训练折内部 ──
pipe = Pipeline([
    ('scaler', StandardScaler()),
    ('clf', LogisticRegression())
])

# 在原始全量 X 上交叉验证，Pipeline 保证每个 fold 独立 fit scaler
scores_clean = cross_val_score(pipe, X, y, cv=5)
print(f"【无泄漏 Pipeline】客观真实的泛化评估表现: {np.mean(scores_clean):.3f} (回归真实的 50% 随机基线)")
```

### 常见易错点与典型反例
1. **时序数据用普通随机 K-Fold**：
   - 金融预测如果用随机 K-Fold，模型相当于用下周三的股票行情去预测周一的开盘，算出来的指标美妙绝伦，实盘上线立刻爆仓。时序任务**必须使用 TimeSeriesSplit**。

### 知识联系与进阶桥梁
- **上承**：5.1/5.2 评估体系；
- **下接**：5.4 节端到端机器学习全生命周期。

### 本节总结与自查清单
- [ ] 为什么严禁在数据集划分之前对全量数据调用 `fit_transform`？
- [ ] 分层 K 折（Stratified K-Fold）解决了普通 K 折的什么缺陷？
- [ ] Scikit-Learn 中的 `Pipeline` 为什么是防范数据泄漏的最佳工业级武器？

### 权威来源与延伸阅读
- Max Kuhn, Kjell Johnson (2013). *Applied Predictive Modeling*, Chapter 3: Data Pre-processing, Springer.
- Shachar Kaufman et al. (2012). *Leakage in Data Mining: Formulation, Detection, and Avoidance*, ACM Transactions on Knowledge Discovery from Data."""

    # ── Lesson 5.4 ──
    l4_content = """### 学习目标
学完本节，你应该能够：
1. 掌握工业级机器学习项目端到端 7 步生命周期闭环（从业务抽象到监控运维）；
2. 掌握系统化误差分析（Error Analysis）排查协议，准确对 Top 错例进行根因归类；
3. 理解模型在线离线一致性（Training-Serving Skew）与概念漂移（Concept Drift）监控；
4. 完成从数据清洗、无泄漏 Pipeline 封装、超参调优到模型持久化导出的全流程 Capstone 实战。

### 前置知识
- 前四章全部机器学习理论（损失函数、泛化权衡、正则化、评估指标）。

### 工业级机器学习项目 7 步标准闭环
1. **阶段一：业务问题抽象与 ROI 论证**：
   - 绝不为了用模型而用模型。明确业务目标是“提高客单价”还是“降低违约率”；设定硬性上线门槛基线（如：“若新模型在千分之一误杀率下的召回率不能达到 60%，不予上线”）。
2. **阶段二：数据探查与防泄漏切分**：
   - 探查缺失值、极端值与偏态；
   - 确立防泄漏切分防线（训练集、验证集、盲测集），封死未来信息与标识符污染。
3. **阶段三：特征工程与基线建立（Baseline First）**：
   - 快速上线一个单行规则基线或简单逻辑回归基线；
   - 特征衍生、标准化变换、高基数类别编码。
4. **阶段四：多算法对抗比拼与超参数调优**：
   - 对比线性模型、决策树家族（Random Forest / LightGBM）与非线性核模型；
   - 使用贝叶斯优化或网格搜索调参，绘制学习曲线防止过拟合。
5. **阶段五：精细化误差分析（Error Analysis）**：
   - 提取测试集上损失最大的前 100 个错误样本（Top Misclassified Samples）；
   - 人工逐条核查并打标签：是“标注源头打错了”、“特征信息缺失”，还是“反欺诈对抗升级”？
6. **阶段六：模型序列化交付与服务化包装**：
   - 使用 `joblib` 或 `ONNX` 将包含预处理流水线在内的整个 Pipeline 打包序列化；
   - 固化特征 Schema 与默认值映射。
7. **阶段七：生产监控与概念漂移（Concept Drift）治理**：
   - 监控在线特征分布的 PSI（群体稳定性指标 Population Stability Index）；
   - 监控延迟业务指标，建立自动化定期重训（Retraining Pipeline）机制。

### 逐步实现与代码解析
下面的 Python 脚本演示完整的端到端违约风险评分卡流水线，包含合成数据、分层无泄漏 Pipeline、交叉验证网格调优与模型持久化导出：

```python
import numpy as np
from sklearn.model_selection import train_test_split, GridSearchCV, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, roc_auc_score
import io

# 1. 模拟合成真实信用评估数据 (500 样本, 5 特征, 15% 违约率)
rng = np.random.default_rng(2024)
n = 500
X = rng.normal(loc=[35, 12, 60, 3, 2], scale=[8, 5, 20, 2, 1], size=(n, 5))
logits = 0.04 * X[:, 0] - 0.15 * X[:, 1] - 0.05 * X[:, 2] + 0.3 * X[:, 3] + rng.normal(0, 0.4, size=n)
y = (logits > np.percentile(logits, 85)).astype(int)

# 2. 严格划分留出测试集 (80% 训练调优, 20% 最终盲测)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

# 3. 构造全流程原子 Pipeline
pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('classifier', LogisticRegression(solver='liblinear', random_state=42))
])

# 4. 网格搜索调优正则化超参数 C 与惩罚类型
param_grid = {
    'classifier__C': [0.01, 0.1, 1.0, 10.0],
    'classifier__penalty': ['l1', 'l2']
}
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
grid = GridSearchCV(pipeline, param_grid, cv=cv, scoring='roc_auc', n_jobs=1)
grid.fit(X_train, y_train)

# 5. 盲测集最终严格质检
best_model = grid.best_estimator_
y_test_prob = best_model.predict_proba(X_test)[:, 1]
test_auc = roc_auc_score(y_test, y_test_prob)

print(f"=== 调优完成！最优超参数: {grid.best_params_} ===")
print(f"交叉验证最高 AUC: {grid.best_score_:.4f}")
print(f"最终独立测试集盲测 AUC: {test_auc:.4f}")
print("\\n=== 最佳模型最终分类报告 ===")
print(classification_report(y_test, (y_test_prob >= 0.5).astype(int), digits=3))
```

### 常见易错点与典型反例
1. **模型导出时把预处理遗留在代码外**：
   - 线上服务接收的是原始未经缩放的 JSON 报文。如果导出时只导出了算法 `model.pkl`，而忘记导出 `scaler.pkl`，线上推理时直接拿原始值预测，产生灾难性的线上线下倾斜（Training-Serving Skew）。**必须将 Preprocessing 与 Model 统一打包入同一个 Pipeline 导出**。

### 知识联系与进阶桥梁
- **上承**：全课程全部核心基础；
- **下接**：下一门课程《经典机器学习算法》将系统深入推导回归树、随机森林、XGBoost、SVM 与聚类算法的底层数学与源码实现。

### 本节总结与自查清单
- [ ] 什么是训练-服务倾斜（Training-Serving Skew）？如何通过 Pipeline 彻底避免？
- [ ] 概念漂移（Concept Drift）发生时，最直观的线上表现是什么？
- [ ] 为什么说没有误差分析（Error Analysis）的模型调优就是在黑暗中摸象？

### 权威来源与延伸阅读
- Chip Huyen (2022). *Designing Machine Learning Systems*, O'Reilly Media.
- Google Cloud Architecture Center (2023). *MLOps: Continuous delivery and automation pipelines in machine learning*."""

    lessons = [
        lesson(
            lesson_id="ml-found-l5-1",
            title="分类模型评估全景图：混淆矩阵、ROC-AUC 与 PR 曲线",
            content=l1_content,
            difficulty=3,
            tips=[
                tip("不平衡数据军规：在欺诈、黑客入侵等正样本比例极低的场景下，严禁仅向汇报 ROC-AUC（容易虚假乐观），必须将 PR 曲线与 PR-AUC 作为主力评估依据。", "interview"),
                tip("阈值调整技巧：默认 0.5 阈值仅在正负样本对称代价下成立。如果漏报一个癌症患者代价是误杀的 100 倍，阈值应大幅下调，优先拉高召回率 Recall。", "leak"),
            ],
            demos=[
                demo(
                    code="""import numpy as np
from sklearn.metrics import confusion_matrix, precision_score, recall_score, f1_score

y_true = np.array([0, 0, 0, 1, 1, 1])
y_pred = np.array([0, 0, 1, 0, 1, 1])

cm = confusion_matrix(y_true, y_pred)
print("混淆矩阵 [[TN, FP], [FN, TP]]:\\n", cm)
print(f"精确率 Precision: {precision_score(y_true, y_pred):.3f}")
print(f"召回率 Recall:    {recall_score(y_true, y_pred):.3f}")
print(f"F1 得分:         {f1_score(y_true, y_pred):.3f}")
""",
                    lang="python",
                    title="Scikit-Learn 混淆矩阵与核心指标计算",
                )
            ],
        ),
        lesson(
            lesson_id="ml-found-l5-2",
            title="回归模型评估与业务契合度：MSE、MAE、RMSE 与 R 方",
            content=l2_content,
            difficulty=2,
            tips=[
                tip("R2 负数解惑：当面试官问你'R 方有没有可能是负数'时，大声回答：'有！' 当模型对测试集的拟合效果比直接用常数均值预测还要差时，残差平方和大于总平方和，R2 必然为负数。", "interview"),
                tip("量纲选择：向业务方汇报时优先使用 MAE（平均偏差多少万元）或 MAPE（相对偏差百分之几）；在模型损失优化时优先使用带光滑梯度的 MSE 或 Huber。", "note"),
            ],
            demos=[
                demo(
                    code="""import numpy as np
from sklearn.metrics import r2_score, mean_squared_error

y_true = np.array([10.0, 20.0, 30.0])
# 恶劣预测模型 (严重偏离真实值)
y_bad = np.array([100.0, -50.0, 80.0])

r2 = r2_score(y_true, y_bad)
print(f"恶劣模型 R2 得分: {r2:.4f} (显著为负数，表明远劣于均值基线！)")
""",
                    lang="python",
                    title="负 R 方计算示例",
                )
            ],
        ),
        lesson(
            lesson_id="ml-found-l5-3",
            title="交叉验证黄金策略与数据泄漏终极防范",
            content=l3_content,
            difficulty=3,
            tips=[
                tip("第一死穴：绝对禁止在数据集切分前做全量 Standard Scaling！这会将测试集的均值和方差提前泄漏给训练集，造成严重的离线虚假高分。", "pitfall"),
                tip("工业标准：Scikit-Learn Pipeline 是防范数据泄漏的最佳基础设施。将预处理 Transformer 与估计器打包为一个原子黑盒，交叉验证时各 fold 严格独立隔离。", "leak"),
            ],
            demos=[
                demo(
                    code="""import numpy as np
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import Ridge

# 演示 Pipeline 原子打包调用
X = np.array([[1.0], [2.0], [3.0], [4.0]])
y = np.array([2.0, 4.0, 6.0, 8.0])

# 标准化与模型无缝闭环
pipe = make_pipeline(StandardScaler(), Ridge(alpha=0.5))
pipe.fit(X, y)
print("Pipeline 拟合完成！测试预测结果:", pipe.predict([[5.0]])[0].round(3))
""",
                    lang="python",
                    title="Pipeline 原子封装快速体验",
                )
            ],
        ),
        lesson(
            lesson_id="ml-found-l5-4",
            title="机器学习项目的完整工程生命周期与 Capstone 闭环",
            content=l4_content,
            difficulty=3,
            tips=[
                tip("上线防坑：导出模型时，绝不能只导出分类器，必须导出包含完整预处理流程的整个 Pipeline。线上接收原始特征字典后直接输入 Pipeline，彻底杜绝特征变换漂移。", "leak"),
                tip("面试高频：请详细讲述一次你在项目中做误差分析（Error Analysis）并反哺特征工程的真实经历。", "interview"),
            ],
            demos=[
                demo(
                    code="""import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression

# 工业级 Pipeline 组装范式
pipe = Pipeline([
    ('scaler', StandardScaler()),
    ('clf', LogisticRegression())
])

X = np.array([[10, 20], [30, 40], [50, 60], [70, 80]])
y = np.array([0, 0, 1, 1])

pipe.fit(X, y)
print("Pipeline 各步骤命名:", [step[0] for step in pipe.steps])
print("预测新样本类别与概率:", pipe.predict([[45, 55]]), pipe.predict_proba([[45, 55]])[0].round(3))
""",
                    lang="python",
                    title="端到端可上线流水线最小完整实现",
                )
            ],
        ),
    ]

    # ── Exercises for Chapter 5 ──
    exercises = [
        single_choice(
            ex_id="ml-found-c5-ex1",
            question="在反欺诈业务建模中，正样本（欺诈）极其罕见（仅占 0.2%）。如果希望建立一个监控大盘，要求：在所有被模型判定为可疑欺诈的交易中，尽可能保证真实欺诈的占比不低于 80%（严格控制误杀正常客户的骚扰成本）。此时工程师在调优分类阈值时，应该优先关注并拉高哪一个核心指标？",
            options=[
                {"value": "A", "text": "精确率（Precision）"},
                {"value": "B", "text": "召回率（Recall）"},
                {"value": "C", "text": "全量样本准确率（Accuracy）"},
                {"value": "D", "text": "均方根误差（RMSE）"},
            ],
            answer="A",
            explanation="精确率 Precision = TP / (TP + FP)，衡量所有被预测为正类的样本中实际真正为正类的比例。要求在报警的案件中真实欺诈占比不低于 80%，正是对精确率（Precision >= 80%）的明确业务诉求。",
            difficulty=2,
            related_lesson_id="ml-found-l5-1",
            tags=["评估指标", "精确率", "业务契合"],
        ),
        judge(
            ex_id="ml-found-c5-ex2",
            question="决定系数 $R^2$ 衡量的是回归模型相比于‘简单使用因变量均值进行盲目预测’多解释了多少比例的方差；当模型预测效果比直接猜均值还要差时，$R^2$ 会呈现负数。",
            answer=True,
            explanation="正确。$R^2 = 1 - \\text{SS}_{\\text{res}} / \\text{SS}_{\\text{tot}}$。当模型的残差平方和 $\\text{SS}_{\\text{res}}$ 超过总平方和 $\\text{SS}_{\\text{tot}}$（即模型表现劣于均值基线）时，$R^2$ 严格小于 0。",
            difficulty=2,
            related_lesson_id="ml-found-l5-2",
            tags=["决定系数", "R2", "负数成因"],
        ),
        multiple_choice(
            ex_id="ml-found-c5-ex3",
            question="在机器学习工程实践中，以下哪些行为属于典型且致命的【数据泄漏（Data Leakage）】？",
            options=[
                {"value": "A", "text": "在将数据集切分为训练集与测试集之前，直接对全量特征矩阵调用 StandardScaler.fit_transform()"},
                {"value": "B", "text": "在电商转化率预测中，包含了用户在未来下单后才生成的物流发货状态特征"},
                {"value": "C", "text": "对于时序预测任务，使用未来时间段的数据来训练模型去预测过去时间段的指标"},
                {"value": "D", "text": "使用 Scikit-Learn Pipeline 将特征预处理与分类器打包，在 K 折交叉验证时仅在训练折内部执行 fit"},
            ],
            answer=["A", "B", "C"],
            explanation="选项 A 泄漏测试集分布参数，选项 B 包含未来结果特征（时间穿越），选项 C 违背时序因果先后顺序，均属于致命的数据泄漏。选项 D 是杜绝数据泄漏的标准最佳实践，不属于泄漏。",
            difficulty=2,
            related_lesson_id="ml-found-l5-3",
            tags=["数据泄漏", "Pipeline", "工程规范"],
        ),
        fill(
            ex_id="ml-found-c5-ex4",
            question="ROC 曲线以假阳性率（FPR）为横轴，以 ____（召回率 / TPR）为纵轴；而 ROC-AUC 曲线下面积在统计学上严格等价于：随机抽取一对正负样本，模型给正样本预测打分 ____（大于 / 小于）负样本预测打分的概率。",
            blanks=[
                ["真阳性率", "TPR", "召回率", "Recall"],
                ["大于", "高于", ">"]
            ],
            explanation="ROC 纵轴为真阳性率（TPR/召回率）；ROC-AUC 的统计学本质是排序一致性概率，即随机抽取一个正样本和一个负样本，模型给正样本打分大于负样本打分的概率。",
            difficulty=2,
            related_lesson_id="ml-found-l5-1",
            tags=["ROC曲线", "AUC定义", "填空题"],
        ),
        # ── Code Exercise 5.1 ──
        {
            "id": "ml-found-c5-ex5",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】从零实现混淆矩阵与 F1 评估函数：\n编写函数 `calc_classification_report(y_true, y_pred)`：\n接收两个一维 NumPy 整数数组 `y_true` 与 `y_pred`（取值均为 0 或 1）。\n计算并返回一个字典，包含四个指标（保留 4 位小数）：\n1. `precision`: 查准率 $\\frac{\\text{TP}}{\\text{TP} + \\text{FP}}$（若分母为 0 则为 0.0）；\n2. `recall`: 查全率 $\\frac{\\text{TP}}{\\text{TP} + \\text{FN}}$（若分母为 0 则为 0.0）；\n3. `f1_score`: 调和平均 $2 \\cdot \\frac{P \\cdot R}{P + R}$（若分母为 0 则为 0.0）；\n4. `accuracy`: 整体准确率 $\\frac{\\text{TP} + \\text{TN}}{N}$。\n\n最后一行请返回调用示例 `calc_classification_report(np.array([1, 1, 0, 0]), np.array([1, 0, 0, 1]))` 的字典结果。",
            "starterCode": "import numpy as np\n\ndef calc_classification_report(y_true: np.ndarray, y_pred: np.ndarray) -> dict:\n    \"\"\"从零计算二分类混淆指标\"\"\"\n    # 请在此实现\n    ___\n\ncalc_classification_report(np.array([1, 1, 0, 0]), np.array([1, 0, 0, 1]))\n",
            "setupCode": "",
            "expectedOutput": "{'precision': 0.5, 'recall': 0.5, 'f1_score': 0.5, 'accuracy': 0.5}",
            "answer": "import numpy as np\n\ndef calc_classification_report(y_true: np.ndarray, y_pred: np.ndarray) -> dict:\n    tp = int(np.sum((y_true == 1) & (y_pred == 1)))\n    fp = int(np.sum((y_true == 0) & (y_pred == 1)))\n    fn = int(np.sum((y_true == 1) & (y_pred == 0)))\n    tn = int(np.sum((y_true == 0) & (y_pred == 0)))\n    total = len(y_true)\n    \n    p = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0\n    r = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0\n    f1 = float((2 * p * r) / (p + r)) if (p + r) > 0 else 0.0\n    acc = float((tp + tn) / total) if total > 0 else 0.0\n    \n    return {\n        \"precision\": round(p, 4),\n        \"recall\": round(r, 4),\n        \"f1_score\": round(f1, 4),\n        \"accuracy\": round(acc, 4)\n    }\n\ncalc_classification_report(np.array([1, 1, 0, 0]), np.array([1, 0, 0, 1]))\n",
            "tests": "res = calc_classification_report(np.array([1, 1, 1]), np.array([1, 1, 1]))\nassert res['f1_score'] == 1.0, f\"完美分类F1应为1: {res}\"\nassert res['accuracy'] == 1.0, f\"完美分类准确率应为1: {res}\"\nres2 = calc_classification_report(np.array([1, 1]), np.array([0, 0]))\nassert res2['recall'] == 0.0, f\"完全漏放召回率应为0: {res2}\"\nassert res2['f1_score'] == 0.0, f\"完全漏放F1应为0: {res2}\"\n",
            "explanation": "通过逻辑布尔与运算快速统计二分类混淆矩阵的四个象限值，并依定义计算精度、召回率与 F1 调和平均值。",
            "tags": ["混淆矩阵", "F1", "NumPy分类评估"],
            "related_lesson_id": "ml-found-l5-1",
        },
        # ── Code Exercise 5.2 ──
        {
            "id": "ml-found-c5-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】构建无泄漏 Pipeline 并执行交叉验证：\n编写函数 `train_pipeline_cv(X, y)`：\n1. 构建一个 Scikit-Learn `Pipeline`，第一步为 `StandardScaler()`，第二步为 `LogisticRegression(solver='liblinear', random_state=42)`；\n2. 使用 `cross_val_score` 在 3 折分层交叉验证（`cv=3`）下计算该 Pipeline 的准确率得分数组；\n3. 返回 3 折交叉验证的平均准确率（保留 4 位小数的浮点数）。\n\n最后一行请返回调用示例在测试数据上的计算结果。",
            "starterCode": "import numpy as np\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.model_selection import cross_val_score\n\ndef train_pipeline_cv(X: np.ndarray, y: np.ndarray) -> float:\n    \"\"\"封装无泄漏 Pipeline 并计算 3 折交叉验证均值\"\"\"\n    # 请在此实现\n    ___\n\nX_demo = np.array([[10, 2], [15, 3], [20, 5], [80, 10], [90, 12], [85, 11]])\ny_demo = np.array([0, 0, 0, 1, 1, 1])\ntrain_pipeline_cv(X_demo, y_demo)\n",
            "setupCode": "",
            "expectedOutput": "1.0",
            "answer": "import numpy as np\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.model_selection import cross_val_score\n\ndef train_pipeline_cv(X: np.ndarray, y: np.ndarray) -> float:\n    pipe = Pipeline([\n        ('scaler', StandardScaler()),\n        ('clf', LogisticRegression(solver='liblinear', random_state=42))\n    ])\n    scores = cross_val_score(pipe, X, y, cv=3, scoring='accuracy')\n    return float(round(float(np.mean(scores)), 4))\n\nX_demo = np.array([[10, 2], [15, 3], [20, 5], [80, 10], [90, 12], [85, 11]])\ny_demo = np.array([0, 0, 0, 1, 1, 1])\ntrain_pipeline_cv(X_demo, y_demo)\n",
            "tests": "X_t = np.array([[1.0], [2.0], [3.0], [10.0], [11.0], [12.0]])\ny_t = np.array([0, 0, 0, 1, 1, 1])\nscore = train_pipeline_cv(X_t, y_t)\nassert score == 1.0, f\"线性可分数据3折CV均值应为1.0: {score}\"\n",
            "explanation": "Pipeline 保证交叉验证中每一折独立执行 scaler.fit 与 clf.fit，测试折仅调用 transform，彻底绝缘数据泄漏。",
            "tags": ["Pipeline", "交叉验证", "Scikit-Learn"],
            "related_lesson_id": "ml-found-l5-3",
        },
        single_choice(
            ex_id="ml-found-c5-ex7",
            question="在模型导出与生产交付阶段，为什么工业级标准严禁单独仅导出分类器对象（如 `model.pkl`），而必须将整个带有特征预处理的 `Pipeline` 打包导出？",
            options=[
                {"value": "A", "text": "避免在线服务收到未经过相同标准化/编码变换的原始特征，彻底杜绝线上线下特征不一致（Training-Serving Skew）引发的预测失真"},
                {"value": "B", "text": "单独导出分类器会导致文件体积增加 10 倍以上"},
                {"value": "C", "text": "Python 不支持单独序列化纯分类器对象"},
                {"value": "D", "text": "如果不打包 Pipeline，模型上线后会自动发生过拟合"},
            ],
            answer="A",
            explanation="线上生产环境接收的是未经处理的业务原始 JSON/数据流。如果只导出了模型，线上工程必须手动用代码重写一套特征变换逻辑，极易产生计算口径偏差、缺失值填充不一致等所谓的 Training-Serving Skew。导出完整 Pipeline 能保证线上线下变换逻辑的严格同一性。",
            difficulty=2,
            related_lesson_id="ml-found-l5-4",
            tags=["工程落地", "模型交付", "Pipeline打包"],
        ),
        open_ex(
            ex_id="ml-found-c5-ex8",
            question="【课程收官大作业 · Capstone 综合实战报告】\n某跨境电商平台计划上线一套【用户 30 天流失预警与智能挽留系统】。历史数据包含 20 万用户的静态属性（年龄、地域）、近 90 天消费行为日志（活跃天数、退货率、订单金额衰减比）以及打标结果（未来 30 天是否流失，1=流失，0=留存，流失率为 8%）。\n\n请以负责算法专家的身份，撰写一份完整的工程实施与质检报告，回答以下核心问题：\n1. **数据切分与防泄漏设计**：应如何切分数据集？为什么不能用随机打散的 K-Fold？\n2. **指标选择与业务对齐**：业务方预算有限，运营团队每月只能外呼挽留 5000 名高风险流失客户。你应该如何选择评估指标，并如何设定最终分类阈值 $\\tau$？\n3. **误差分析闭环**：模型上线前，你应如何设计一套标准化的错例排查协议（Error Analysis Protocol）？",
            reference_answer="""1. 数据切分与防泄漏设计：
- 切分策略：必须采用【时间序列滚动切分（Time-Series Split / OOT 外推测试）】。例如选取 1~3 月用户行为特征预测 4 月流失状态作为训练集，选取 2~4 月特征预测 5 月流失作为验证集，选取 3~5 月特征预测 6 月流失作为严格盲测集（Out-Of-Time Test）。
- 严禁随机打散 K-Fold 的原因：用户行为具有强时序惯性与宏观经济/季节周期性。若随机打散，会导致用“未来的流失状态”反向预测“过去的特征”，产生严重的时间穿越泄漏，掩盖模型在真实未来时间段上的泛化衰减。

2. 指标选择与业务对齐（阈值决策）：
- 指标选择：在流失率仅 8% 的不平衡场景下，严禁看 Accuracy。核心指标必须锁定为【Top-K 精确率（Precision@5000）与 PR 曲线】。
- 阈值设定策略：运营每月固定仅能外呼 5000 人。算法不应采用固定的 0.5 概率阈值，而是对当月全体候选用户计算流失预测概率 $P(\\text{churn})$ 并进行降序排列（Top-K 排序）；将截断阈值 $\\tau$ 动态设定为“第 5000 名用户的预测概率值”。这样可以确保输出给运营的名单精准保持在 5000 人的外呼容量极限内，同时最大化这 5000 人的流失命中率（Precision@K）。

3. 误差分析闭环（Error Analysis Protocol）：
- 错例抽样：在盲测集上抽取预测严重失准的两类典型 Top 错例各 50 例：
  ① Top 假阳性（FP）：模型预警流失概率高达 95%，但用户实际高度活跃且消费；
  ② Top 假阴性（FN）：模型预测流失概率极低（< 5%），但用户毫无征兆突然流失。
- 根因归纳与打标：排查是否由于“特殊促销活动短期脉冲干扰”、“账号被盗重置”、“核心竞品上线冲击”或“关键行为字段缺失”；
- 迭代反哺：根据错例根因反哺特征工程（如构建‘优惠券核销敏感度衰减比’等新特征）或在数据源头清洗异常黑产刷单标签，形成模型演进的正向闭环。""",
            explanation="全课程大作业综合考察：从真实业务抽象、时序防泄漏切分、Top-K 业务阈值绑定到工业级误差分析协议的全流程闭环能力。",
            rubric=[
                {"point": "明确采用基于时间轴的 OOT 外推切分，深刻阐明随机打散引发时间穿越泄漏的根因", "score": 25},
                {"point": "结合 5000 人外呼硬性预算，指出采用 Precision@5000 与 Top-K 动态截断阈值策略", "score": 25},
                {"point": "设计规范的误差分析（Error Analysis）抽样与根因归纳协议（分析 Top FP 与 Top FN）", "score": 25},
                {"point": "阐述错例根因如何反哺特征工程与数据清洗，形成系统化的持续迭代工程闭环", "score": 25},
            ],
            difficulty=5,
            related_lesson_id="ml-found-l5-4",
            tags=["Capstone", "大作业", "全流程综合实战"],
        ),
    ]

    return chapter(
        chapter_id="ml-found-c5",
        course_id="ml-foundations",
        order=5,
        title="评估体系、验证策略与端到端工作流",
        goal="掌握混淆矩阵、ROC/PR 与回归方差分解全指标体系，建立无泄漏 Pipeline 护城河，跑通机器学习项目全生命周期与 Capstone 闭环。",
        lessons=lessons,
        exercises=exercises,
    )
