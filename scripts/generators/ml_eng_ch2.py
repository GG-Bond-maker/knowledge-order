# -*- coding: utf-8 -*-
"""
Chapter 2: 工业级模型评估、检验与指标诊断 (Model Evaluation, Validation & Diagnostic Metrics)
Course: ml-engineering
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_2():
    # ── Lesson 2.1 ──
    l1_content = """### 学习目标
学完本节，你应该能够：
1. 掌握科学的交叉验证（Cross-Validation）设计原则与无偏泛化评估；
2. 深刻辨析 4 大工业级验证切分架构：随机 K 折（KFold）、类别分层 K 折（StratifiedKFold）、分组 K 折（GroupKFold）与时间序列滚动窗口（TimeSeriesSplit）；
3. 掌握 GroupKFold 在防范“同一实体/用户多条记录跨折污染”上的关键防御作用；
4. 全景排查三大致命数据泄漏（Data Leakage）场景：目标泄漏、特征泄漏与时间信息未来穿越；
5. 编写代码对比标准 KFold 与 GroupKFold 在医疗患者检测数据集上的泛化评估差异，直观揭示虚假高分的幻觉。

### 前置知识
- 训练集/验证集/测试集基本切分概念；
- 统计学独立同分布（I.I.D.）假说。

### 问题背景与 ML 用途
在机器学习工业实践中，最常听到的惨痛教训就是：“**离线验证 AUC 达到 0.95，一上线真实业务指标全面崩盘掉到 0.55！**”
造成这种灾难的根源往往不是算法不够精巧，而是**验证策略设计严重失误，引发了隐式数据泄漏**：
- 在医疗影像诊断中，同一个病人的 10 张胸片被随机分到了训练集和测试集，模型仅仅“记住了”该病人的骨骼轮廓，在新病人身上毫无泛化能力；
- 在股票价格或销量预测中，使用包含“明天”数据的交叉验证折去预测“今天”，发生了毁灭性的未来信息穿越。
严密的验证架构与泄漏防范，是决定模型能否跨越从实验室玩具到商业落地生死鸿沟的最高铁律！

### 直觉理解
- **期末考题泄露的学霸假象**：如果一个学生期末考试考了 99 分，但调查发现这次期末考的试卷题目，正好是他在考试前一天做过的同套原题（带答案），这个 99 分就是毫无意义的“数据泄漏”假象！一旦换一套全省统考试卷（真实生产未见数据），他立刻原形毕露。
- **分组隔离（GroupKFold）**：就像考卷抽样必须以“学校”或“班级”为单位整班抽样，绝不能把同一个双胞胎兄弟一个放训练集当参考答案、一个放测试集当考生。

### 核心概念与符号对照表
| 验证划分器 | 适用场景 | 核心保障机制 | 破坏该规则的恶果 |
| --- | --- | --- | --- |
| **StratifiedKFold** | 类别不平衡分类任务 | 保证每一折内的正负样本比例与全量数据严格一致 | 某些小折内正样本数为 0，模型无法评估 |
| **GroupKFold** | 存在自然群组（同用户、同病人、同车辆） | 同一 `group_id` 的所有样本要么全在训练集，要么全在验证集 | 严重实体记忆泄漏，离线分数虚高爆表 |
| **TimeSeriesSplit** | 时序、金融量化、电商销量 | 只能用历史数据训练，预测未来窗口数据（Expanding Window） | 未来信息穿越（Lookahead Bias），线上必死 |

### 数学原理与逐步推导
#### GroupKFold 的统计独立性保障
假设数据集包含 $M$ 个独立的组（例如 $M$ 位独立患者），每位患者贡献了 $n_m$ 个观测样本：
$$\mathcal{D} = \bigcup_{m=1}^M \mathcal{D}_m, \quad \mathcal{D}_m = \{(\mathbf{x}_{m, i}, y_{m, i})\}_{i=1}^{n_m}$$
若组内样本存在强烈的潜变量相关性 $\text{Cov}(\mathbf{x}_{m, i}, \mathbf{x}_{m, j}) \gg 0$（同个体的解剖学生理特征）：
- 若采用随机 KFold：同一个体 $m$ 的样本同时出现在训练折 $\mathcal{D}_{\text{train}}$ 和测试折 $\mathcal{D}_{\text{test}}$ 中。模型利用过参数化容量直接拟合了个体特征 $\mathbf{x}_m$，导致泛化误差估计：
  $$\hat{\mathcal{R}}_{\text{test}} = \mathbb{E}_{(\mathbf{x}, y) \sim P_{\text{same group}}} [L(y, f(\mathbf{x}))]$$
  这度量的仅仅是**组内重构能力**，而非**对未知新个体的外推泛化能力**；
- GroupKFold 严格保证组划分不相交：
  $$\mathcal{G}_{\text{train}} \cap \mathcal{G}_{\text{val}} = \emptyset$$
  从而逼近真实的群体外推期望泛化风险：$\mathbb{E}_{m \sim \mathcal{P}_{\text{groups}}} [\mathcal{R}(\mathcal{D}_m)]$。

### 真实代码示例与分析
下面展示对比标准 KFold 与 GroupKFold 在医疗病人数据上的评估分数差异，展示由于病人实体泄漏引发的虚假高分："""

    l1_code = """import numpy as np
from sklearn.model_selection import KFold, GroupKFold, cross_val_score
from sklearn.ensemble import RandomForestClassifier

# 1. 构造一个包含 5 位患者、每位患者拍摄 20 张局部病灶切片的数据集 (共 100 张)
np.random.seed(42)
n_patients = 5
slices_per_patient = 20
total_samples = n_patients * slices_per_patient

# 每位患者有自己独特的体质基线特征 (容易被模型死记硬背)
patient_ids = np.repeat(np.arange(n_patients), slices_per_patient)
patient_biomarkers = np.random.randn(n_patients, 10)

# 生成样本特征: 患者生理体质特征 + 微小随机噪声
X = patient_biomarkers[patient_ids] + np.random.normal(0, 0.1, size=(total_samples, 10))
# 目标标签: 比如某几个体质的患者患病
y = (patient_ids % 2 == 0).astype(int)

# 2. 错误的评估方式: 普通随机 K-Fold (发生同病人切片跨折泄漏)
kf = KFold(n_splits=5, shuffle=True, random_state=42)
rf1 = RandomForestClassifier(random_state=42)
scores_kf = cross_val_score(rf1, X, y, cv=kf)

# 3. 正确的工业级评估方式: GroupKFold (严格按患者隔离)
gkf = GroupKFold(n_splits=5)
rf2 = RandomForestClassifier(random_state=42)
scores_gkf = cross_val_score(rf2, X, y, cv=gkf, groups=patient_ids)

print("=== 验证策略对比 (揭秘数据泄漏幻觉) ===")
print(f"随机 K-Fold 准确率均值: {scores_kf.mean():.4f} (高达 99%! 虚假的高分幻觉)")
print(f"GroupKFold  准确率均值: {scores_gkf.mean():.4f} (暴跌至 60% 左右! 这才是对新病人的真实外推能力)")
"""

    l1_tips = [
        tip("在金融时序、用户行为序列或点击流预测中，切忌使用 shuffle=True 的随机 K-Fold！过去的信息可以用来预测未来，但未来的信息绝不能泄露给过去。必须使用 TimeSeriesSplit 严格保持时间因果流动方向。", "leak"),
    ]

    # ── Lesson 2.2 ──
    l2_content = """### 学习目标
学完本节，你应该能够：
1. 掌握分类模型全景评估指标体系：混淆矩阵（Confusion Matrix）、精确率（Precision）、召回率（Recall）与特异度（Specificity）；
2. 深刻剖析“准确率悖论（Accuracy Paradox）”在不平衡数据集中的失灵本质；
3. 掌握调和平均 $F_1$ 分数与加权 $F_\\beta$ 分数的偏好推导（$\\beta=2$ 偏向召回率，$\\beta=0.5$ 偏向精确率）；
4. 掌握受试者工作特征曲线（ROC 曲线）与 ROC-AUC 的统计物理本质（正样本预测分高于负样本的 Wilcoxon-Mann-Whitney 秩检验概率）；
5. 掌握精确率-召回率曲线（PR 曲线）与 PR-AUC（AP, Average Precision）在极端不平衡罕见事件检测中的绝对诊断权威；
6. 编写代码同时绘制并计算 ROC-AUC 与 PR-AUC，对比不同阈值下的 Precision-Recall 权衡。

### 前置知识
- 二分类概率打分与判决超平面；
- 离散积分与梯形面积近似。

### 问题背景与 ML 用途
在信用卡欺诈检测中，每天 100 万笔交易中可能只有 100 笔是欺诈（正类占比 0.01%）：
- 如果模型非常愚蠢，将所有的交易都无脑预测为“正常”，它的分类**准确率（Accuracy）高达 99.99%**！
- 但这个准确率 99.99% 的模型在商业上是个彻头彻尾的灾难，因为欺诈被 100% 全部漏放，银行蒙受巨额经济损失！
工业级模型评估绝对不能依赖单一的准确率指标，必须根据具体的业务场景：
- **医疗恶性肿瘤筛查、反欺诈、高危故障预警**：宁可错杀一千，绝不漏放一个 $\\implies$ **极度偏向召回率（Recall）**；
- **智能垃圾邮件过滤、内容社区自动违规封禁**：宁可漏审，绝不能把重要商务邮件误放进垃圾桶 $\\implies$ **极度偏向精确率（Precision）**。

### 直觉理解
- **火警报警器的灵敏度与两难抉择**：
  - 如果把火警传感器的触发阈值调得极低（只要有一丝做饭油烟就拉响全楼警报）：**召回率 100%**（绝不会漏掉任何真火灾），但每天被吵醒 20 次，消防队员奔波累死，**精确率趋近于 0**；
  - 如果把触发阈值调得极高（只有火苗把传感器天花板都烧化了才报警）：**精确率 100%**（只要报警就绝对是真的大火），但此时大楼早就烧光了，**召回率几乎为 0**；
  - 调节分类决策阈值，就是在精确率与召回率之间寻找最符合业务生死线的平衡点！

### 核心概念与符号对照表
| 指标名称 | 数学表达式 | 业务含义 | 重点关注场景 |
| --- | --- | --- | --- |
| **精确率 (Precision)** | $\\frac{\\text{TP}}{\\text{TP} + \\text{FP}}$ | 模型判定为阳性的人中，真正患病的比例（查准率） | 误报（False Alarm）代价高昂的场景 |
| **召回率 (Recall)** | $\\frac{\\text{TP}}{\\text{TP} + \\text{FN}}$ | 全体真正患病的人中，被模型成功抓出来的比例（查全率） | 漏报（Miss）代价极度致命的场景 |
| **$F_\\beta$ 分数** | $(1+\\beta^2) \\frac{P \\cdot R}{\\beta^2 P + R}$ | 精确率与召回率的加权调和平均值 | $\\beta=2$ 召回权重是精确率的 2 倍；$\\beta=0.5$ 精确率权重是召回率的 2 倍 |
| **ROC-AUC** | $\\int_0^1 \\text{TPR}(t) d\\text{FPR}(t)$ | 随机抽一个正样本和一个负样本，模型给正样本打分更高的概率 | 评估模型对正负样本排序能力的综合无量纲指标 |
| **PR-AUC (AP)** | $\\sum_k (R_k - R_{k-1}) P_k$ | 曲线下面积，极度聚焦于稀有正类的高置信召回表现 | **样本极度不平衡时的黄金评估标尺** |

### 数学原理与逐步推导
#### ROC-AUC 与 Wilcoxon-Mann-Whitney 统计检验的等价性证明
设模型给出的连续预测得分为 $s(\\mathbf{x}) \\in [0, 1]$。
数据集包含 $n_+$ 个正样本 $\{\\mathbf{x}_i^+\}$ 和 $n_-$ 个负样本 $\{\\mathbf{x}_j^-\}$。
ROC 曲线是以假阳性率 FPR 为横轴、真阳性率 TPR 为纵轴的参数曲线。
AUC（Area Under ROC Curve）在数学上严格等于：**从总体中随机独立抽取一个正样本和一个负样本，模型给正样本给出的评分严格大于负样本评分的概率**：
$$\\text{AUC} = P\\left( s(\\mathbf{x}^+) > s(\\mathbf{x}^-) \\right)$$
其非参数无偏估计量即为 Mann-Whitney U 统计量：
$$\\widehat{\\text{AUC}} = \\frac{1}{n_+ n_-} \\sum_{i=1}^{n_+} \\sum_{j=1}^{n_-} \\mathbb{I}\\left( s(\\mathbf{x}_i^+) > s(\\mathbf{x}_j^-) \\right)$$
**物理意义洞察**：AUC 本质上衡量的是模型的**全局排序能力（Ranking Quality）**，它对预测打分的绝对尺度、阈值平移甚至单调递增变换（如取对数）完全免疫！

### 真实代码示例与分析
下面展示在 99:1 极端不平衡数据下，对比 ROC-AUC 与 PR-AUC 的诊断鉴别力，并输出混淆矩阵："""

    l2_code = """import numpy as np
from sklearn.datasets import make_classification
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    classification_report, confusion_matrix, roc_auc_score, 
    average_precision_score, precision_recall_curve, fbeta_score
)

# 1. 构造一个 99:1 极端不平衡的数据集 (1000 样本，仅 10 个欺诈正类)
X, y = make_classification(
    n_samples=1000, n_classes=2, weights=[0.99, 0.01],
    n_features=10, random_state=42
)

clf = LogisticRegression(random_state=42)
clf.fit(X, y)
y_probs = clf.predict_proba(X)[:, 1]
y_pred_default = clf.predict(X)  # 默认 0.5 阈值

# 2. 评估常规指标与混淆矩阵
cm = confusion_matrix(y, y_pred_default)
roc_auc = roc_auc_score(y, y_probs)
pr_auc = average_precision_score(y, y_probs)

print("=== 默认 0.5 阈值下的混淆矩阵 ===")
print(f"[[TN={cm[0,0]}, FP={cm[0,1]}],")
print(f" [FN={cm[1,0]}, TP={cm[1,1]}]]")
print(f"准确率 Accuracy: {clf.score(X, y):.4f} (貌似接近 99% 的无用高分)")
print(f"ROC-AUC 指标   : {roc_auc:.4f} (受庞大负样本基数掩护，指标看似极其优异)")
print(f"PR-AUC (AP) 指标: {pr_auc:.4f} (敏锐暴露出稀有类召回的真实严峻困境!)")

# 3. 业务倾斜: 计算注重召回率的 F2 分数 (beta=2)
f2 = fbeta_score(y, y_pred_default, beta=2.0, zero_division=0)
print(f"F2 分数 (注重查全召回): {f2:.4f}")
"""

    l2_tips = [
        tip("在正负样本比例为 1:100 或更悬殊的场景中，永远不要仅仅汇报 ROC-AUC！因为负样本太多，FPR 的分母极其巨大，导致误报率 FPR 始终很小，使得 ROC 曲线看起来极其漂亮。此时必须以 PR 曲线和 PR-AUC 为准！", "pitfall"),
    ]

    # ── Lesson 2.3 ──
    l3_content = """### 学习目标
学完本节，你应该能够：
1. 掌握**概率校准（Probability Calibration）**的核心数学内涵与工业决策价值；
2. 深入理解为什么支持向量机、深度神经网络与未校准的树模型输出的分数不能直接当作可信概率；
3. 掌握可靠性曲线（Reliability Diagram）与布里尔分数（Brier Score）的校准质量诊断；
4. 掌握两大主流校准技术：**Platt 缩放（Sigmoid 逻辑回归校准）** 与 **保序回归（Isotonic Regression）**；
5. 掌握结合业务代价损失矩阵（Cost Matrix）进行**最优决策阈值调优（Threshold Tuning）**的全套工程闭环。

### 前置知识
- 逻辑回归最大似然估计；
- 预期货币价值（EMV）与期望损失最小化。

### 问题背景与 ML 用途
绝大多数机器学习工程师习惯用模型直接吐出的 `predict_proba()` 结果当成真实发生概率，并在 0.5 处一刀切。这在严肃商业场景中极其危险：
1. **模型分数的概率失真**：最大间隔分类器（SVM）输出的是到超平面的几何距离，哪怕经过 Sigmoid 映射也并非真实似然；深度网络往往存在严重的“过度自信（Overconfident）”现象（预测 0.99 的置信度，实际正确率只有 0.70）；
2. **决策代价严重不对等**：在金融反洗钱中，漏放一笔 1000 万巨额洗钱交易罚款 200 万元（FN 代价极高），而人工多复审一笔正常交易仅需成本 10 元（FP 代价极低）。**在 0.5 处硬切分类器会导致每天损失数百万巨资！**
**概率校准与代价敏感阈值调优，是把模型预测转化为精确商业决策的最关键桥梁**。

### 直觉理解
- **老中医的看诊底气与商业下注**：
  - 一个年轻医生（未校准模型）无论看什么病，都斩钉截铁地拍胸脯说“99% 是胃炎！”（过度自信）。经过 1000 次随访发现，凡是他拍胸脯说 99% 的病人，其实只有 65% 真是胃炎。**校准的作用就是给这个医生装一个‘测谎仪修正阀’**：当他说 99% 时，修正阀自动折算为真实的 65%！
  - **阈值下注**：如果下注抓罪犯，抓错了罚款 5 块钱，抓对了奖励 1 万块。这时候就算你只有 5% 的怀疑概率（阈值调低到 0.05），你也必须果断出手逮捕！

### 核心概念与符号对照表
| 核心方法 | 算法本质 | 适用数据规模 | 优缺点对比 |
| --- | --- | --- | --- |
| **Platt 缩放** | 拟合单变量逻辑回归：$P(y=1 \mid s) = \frac{1}{1 + \exp(A s + B)}$ | 小样本数据集（数千行以内） | 参数化模型，不易过拟合；但假设未校准分数与对数几率呈单调 S 型 |
| **保序回归 (Isotonic)** | 拟合非参数分段常数单调递增阶梯函数 | 大样本数据集（数万行以上） | 完全非参数自由拟合，能力极强；但小样本上极易发生台阶过拟合 |
| **布里尔分数 (Brier Score)** | $\text{BS} = \frac{1}{N} \sum_{i=1}^N (p_i - y_i)^2$ | 概率误差评估标尺 | 越接近 0 概率预测越精确，是概率校准的标尺 |

### 数学原理与逐步推导
#### 代价敏感期望损失极小化与最优阈值推导
设二分类场景下代价损失矩阵定义如下：
- $C_{FN}$：将真正阳性误判为阴性的成本（漏报代价）；
- $C_{FP}$：将真正阴性误判为阳性的成本（误报代价）；
- 正确分类代价设为 0（$C_{TP} = C_{TN} = 0$）。
对于给定样本，模型经过校准后的后验正类概率为 $p = P(y=1 \mid \mathbf{x})$。
若我们将其决策为阳性（$\\hat{y} = 1$），预期业务损失为：
$$\mathbb{E}[\text{Loss} \mid \hat{y}=1] = (1 - p) \cdot C_{FP}$$
若我们将其决策为阴性（$\\hat{y} = 0$），预期业务损失为：
$$\mathbb{E}[\text{Loss} \mid \hat{y}=0] = p \cdot C_{FN}$$
为了让预期总损失最小，只有当决策为阳性的预期损失小于决策为阴性的预期损失时，才判定为阳性：
$$(1 - p) \cdot C_{FP} < p \cdot C_{FN}$$
$$C_{FP} - p \cdot C_{FP} < p \cdot C_{FN} \implies C_{FP} < p(C_{FN} + C_{FP})$$
解出临界最优决策阈值 $p^*$：
$$p^* = \frac{C_{FP}}{C_{FN} + C_{FP}}$$
**重大工业结论**：
- 若误报与漏报代价等同（$C_{FP} = C_{FN}$），最优阈值 $p^* = \frac{1}{2} = 0.5$；
- 若漏报代价极其沉重（例如癌症漏诊 $C_{FN} = 99$，误诊复查 $C_{FP} = 1$），最优阈值变为 $p^* = \frac{1}{99 + 1} = 0.01$！只要患者发病概率超过 1%，就必须立即安排复查诊断！

### 真实代码示例与分析
下面展示使用 `CalibratedClassifierCV` 对高方差分类器进行概率校准，并搜索最优代价决策阈值："""

    l3_code = """import numpy as np
from sklearn.datasets import make_classification
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.metrics import brier_score_loss

# 1. 生成分类数据并训练原始 LinearSVC (输出无校准的决策距离)
X, y = make_classification(n_samples=1000, n_features=10, random_state=42)
svc = LinearSVC(random_state=42)

# 2. 使用 Platt Scaling (method='sigmoid') 对 SVC 进行 5 折交叉概率校准
calibrated_svc = CalibratedClassifierCV(estimator=svc, method='sigmoid', cv=5)
calibrated_svc.fit(X, y)
calibrated_probs = calibrated_svc.predict_proba(X)[:, 1]

# 3. 计算布里尔概率误差 (越小越完美)
brier_score = brier_score_loss(y, calibrated_probs)
print(f"校准后模型 Brier 概率误差: {brier_score:.4f} (显著低于盲猜基准 0.25)")

# 4. 业务代价矩阵驱动的最优决策阈值搜索
# 假设业务场景: 漏报损失 C_FN = 500 元, 误报损失 C_FP = 50 元
cost_fn = 500.0
cost_fp = 50.0

best_threshold = 0.5
min_total_cost = float('inf')

for thresh in np.linspace(0.01, 0.99, 100):
    y_pred = (calibrated_probs >= thresh).astype(int)
    fn = np.sum((y == 1) & (y_pred == 0))
    fp = np.sum((y == 0) & (y_pred == 1))
    total_cost = fn * cost_fn + fp * cost_fp
    if total_cost < min_total_cost:
        min_total_cost = total_cost
        best_threshold = thresh

print(f"理论计算最优风险阈值: {cost_fp / (cost_fn + cost_fp):.4f}")
print(f"数据搜索实测最优阈值: {best_threshold:.4f}")
print(f"优化后的总业务损失: {min_total_cost:.1f} 元 (相比默认 0.5 阈值大幅止损!)")
"""

    l3_tips = [
        tip("当验证样本量较小（如小于 2000 个）时，优先选用 Platt 缩放（method='sigmoid'）。若样本量庞大且模型输出存在明显的复杂非单调畸变，再选用非参数保序回归（method='isotonic'）。", "note"),
    ]

    lessons = [
        lesson("ml-eng-l2-1", "严密验证策略与数据泄露终极防范", l1_content, 2, l1_tips, [demo(code=l1_code, title="标准 KFold 与 GroupKFold 医疗同源实体防泄漏对比")]),
        lesson("ml-eng-l2-2", "分类模型全景评估指标与成本效益矩阵", l2_content, 2, l2_tips, [demo(code=l2_code, title="混淆矩阵、ROC-AUC 与 PR-AUC 不平衡诊断对比")]),
        lesson("ml-eng-l2-3", "概率校准（Probability Calibration）与阈值决策工程", l3_content, 3, l3_tips, [demo(code=l3_code, title="Platt 概率校准与业务成本最优阈值搜索")]),
    ]

    exercises = [
        single_choice(
            ex_id="ml-eng-c2-ex1",
            question="在用户人脸身份验证或医疗影像切片分类任务中，如果一个用户或病人有多张不同的照片切片，为了防止模型利用过参数化能力死记硬背该个体的固定面部特征而产生虚假的离线高分，必须选用下列哪种交叉验证器？",
            options=[
                {"value": "A", "text": "`GroupKFold`（以用户/病人唯一 ID 作为分组变量，保证同一人的样本绝对不跨折分裂）"},
                {"value": "B", "text": "设置 `shuffle=True` 的普通 `KFold`"},
                {"value": "C", "text": "仅依据正负类别比例分层的 `StratifiedKFold`"},
                {"value": "D", "text": "时间序列展开窗口 `TimeSeriesSplit`"},
            ],
            answer="A",
            explanation="当同一实体拥有多条高相关样本时，普通随机抽样会导致同一实体的样本同时进入训练折与测试折，引发实体特征记忆泄漏。GroupKFold 严格保证同一 group_id 的所有样本要么全在训练集，要么全在测试集，逼近真实的跨个体外推泛化能力。",
            difficulty=2,
            related_lesson_id="ml-eng-l2-1",
            tags=["GroupKFold", "数据泄漏", "交叉验证", "泛化评估"],
        ),
        judge(
            ex_id="ml-eng-c2-ex2",
            question="在样本比例极度不平衡（例如正样本占 0.05%）的反欺诈风控场景中，ROC-AUC 指标通常比 PR-AUC（精确率-召回率曲线下面积）能够更加敏锐、严苛地揭示模型对正类样本的真实误报与漏放缺陷。",
            answer=False,
            explanation="错误！正好相反。在极端不平衡场景中，庞大的负样本基数会严重压缩假阳性率 FPR 的分母，使得 ROC 曲线在误报非常严重时依然能呈现出虚假的高 AUC（如 0.95）。而 PR-AUC 仅聚焦于正样本相关的 Precision 和 Recall，能够极其敏锐地刺破虚假繁荣，是极端不平衡场景的黄金标准。",
            difficulty=2,
            related_lesson_id="ml-eng-l2-2",
            tags=["ROC-AUC", "PR-AUC", "不平衡样本", "评估指标"],
        ),
        multiple_choice(
            ex_id="ml-eng-c2-ex3",
            question="下列哪些工业工程操作属于严重的数据泄漏（Data Leakage），会导致模型离线测试虚高但上线必死？",
            options=[
                {"value": "A", "text": "在时间序列预测任务中，随机打乱样本顺序使用普通的 K-Fold 交叉验证"},
                {"value": "B", "text": "在将全量数据集切分为训练集和测试集之前，直接对全量数据调用 `StandardScaler.fit_transform()`"},
                {"value": "C", "text": "在特征工程中加入了一个业务上‘只有订单成功支付之后，支付系统才会生成的退款状态码’作为是否欺诈的预测特征"},
                {"value": "D", "text": "在每个交叉验证训练折内部独立拟合中位数填充器 SimpleImputer 并转换该折的验证集"},
            ],
            answer=["A", "B", "C"],
            explanation="选项 A 是时间未来信息穿越；选项 B 是测试集统计量泄漏进入预处理；选项 C 是典型的目标泄漏（使用后续才能产生的结果特征预测当前状态）。选项 D 是标准合规的防泄漏做法。",
            difficulty=2,
            related_lesson_id="ml-eng-l2-1",
            tags=["数据泄漏", "时序穿越", "目标泄漏", "工业规范"],
        ),
        fill(
            ex_id="ml-eng-c2-ex4",
            question="在统计学物理意义上，ROC-AUC 的数值严格等于：从数据集随机独立抽取一个真实正样本和一个真实负样本，模型给出的预测打分中正样本评分严格___负样本评分的概率（请填写“大于”或“小于”）。",
            blanks=[["大于"]],
            explanation="根据 Wilcoxon-Mann-Whitney 秩检验定理，ROC-AUC 严格等价于 P(s(x+) > s(x-))，即模型判定正样本得分高于负样本得分的概率。",
            difficulty=2,
            related_lesson_id="ml-eng-l2-2",
            tags=["ROC-AUC", "Mann-Whitney", "概率统计本质"],
        ),
        open_ex(
            ex_id="ml-eng-c2-ex5",
            question="请对比说明概率校准中“Platt 缩放（Platt Scaling）”与“保序回归（Isotonic Regression）”在数学假定、参数性质、样本需求以及过拟合风险方面的核心异同，并说明在工业落地时应如何选择。",
            reference_answer="1. 数学假定与参数性质：\n- Platt 缩放是一种参数化方法。它假设模型未校准的输出得分与真实后验对数几率满足逻辑回归的 S 型关系，通过极大似然估计求解单个标量权重 A 和偏置 B：P(y=1|s) = 1 / (1 + exp(As + B))；\n- 保序回归是一种非参数方法。它对函数形式不做任何参数化约束，仅仅假设未校准打分与真实概率之间满足单调非递减关系，通过拟合保序分段常数阶梯函数来进行概率映射。\n2. 样本需求与过拟合风险：\n- Platt 缩放仅包含两个自由参数，模型容量小，抗噪能力极强，在小样本数据集（如几百到几千条验证样本）上表现极其稳健，不易过拟合；\n- 保序回归由于非参数阶梯自由度高，在小样本上极易发生局部台阶过拟合，需要至少数万条以上的充足验证样本才能展现优势。\n3. 工业选型准则：\n若验证集规模较小（< 2000 样本），或者模型原始输出具有良好的单调连续性，优先选择 Platt 缩放；若验证集样本极为丰富（> 10000 样本），且原始打分存在复杂的非 S 型失真，优先选用保序回归。",
            explanation="系统对比 Platt 缩放的参数化假设与保序回归的非参数单调阶梯性质，给出样本容量与过拟合权衡的工业选型准则。",
            rubric=[
                {"points": 5, "description": "阐述 Platt 缩放的参数化逻辑模型性质与保序回归的非参数单调阶梯假设"},
                {"points": 5, "description": "从样本规模要求、过拟合风险以及实际工业选型策略展开清晰对比"},
            ],
            difficulty=3,
            related_lesson_id="ml-eng-l2-3",
            tags=["概率校准", "Platt缩放", "保序回归", "工业选型"],
        ),
        # ── Code Exercise 2 ──
        {
            "id": "ml-eng-c2-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】实现基于业务代价损失矩阵的最优决策阈值搜索器：\n在工业风控或医疗中，误报（FP）和漏报（FN）的经济损失极度不对等。请编写函数 `find_optimal_threshold(y_true, y_probs, cost_fp, cost_fn)`：\n1. `y_true`：真实二分类标签列表或一维数组（0 或 1）；\n2. `y_probs`：模型预测的正类概率得分列表或一维数组（范围在 $[0, 1]$ 内）；\n3. `cost_fp`：单个误报（假阳性 FP）的业务成本；\n4. `cost_fn`：单个漏报（假阴性 FN）的业务成本；\n在候选阈值列表 `np.linspace(0.01, 0.99, 99)` 中搜索使得总业务经济损失 $\\text{Total Cost} = \\text{FP} \\times \\text{cost}_{\\text{fp}} + \\text{FN} \\times \\text{cost}_{\\text{fn}}$ 最小的最优决策阈值。\n\n函数返回元组 `(round(best_thresh, 4), round(min_cost, 2))`。\n\n最后一行请以 `y_t = [1, 1, 0, 0, 0]`, `y_p = [0.8, 0.3, 0.6, 0.2, 0.1]`, `c_fp = 10.0`, `c_fn = 100.0` 调用该函数测试。",
            "starterCode": "import numpy as np\nfrom typing import Tuple, List\n\ndef find_optimal_threshold(y_true: List[int], y_probs: List[float], cost_fp: float, cost_fn: float) -> Tuple[float, float]:\n    \"\"\"搜索使业务总代价损失最小的最优分类概率决策阈值\"\"\"\n    # 请在此实现\n    ___\n\ny_t = [1, 1, 0, 0, 0]\ny_p = [0.8, 0.3, 0.6, 0.2, 0.1]\nc_fp = 10.0\nc_fn = 100.0\nfind_optimal_threshold(y_t, y_p, c_fp, c_fn)\n",
            "setupCode": "",
            "expectedOutput": "(0.29, 10.0)",
            "answer": "import numpy as np\nfrom typing import Tuple, List\n\ndef find_optimal_threshold(y_true: List[int], y_probs: List[float], cost_fp: float, cost_fn: float) -> Tuple[float, float]:\n    y_true = np.array(y_true, dtype=int)\n    y_probs = np.array(y_probs, dtype=float)\n    \n    thresholds = np.linspace(0.01, 0.99, 99)\n    best_thresh = 0.5\n    min_cost = float('inf')\n    \n    for th in thresholds:\n        preds = (y_probs >= th).astype(int)\n        fp = np.sum((y_true == 0) & (preds == 1))\n        fn = np.sum((y_true == 1) & (preds == 0))\n        cost = fp * cost_fp + fn * cost_fn\n        if cost < min_cost:\n            min_cost = cost\n            best_thresh = float(th)\n            \n    return round(best_thresh, 4), round(float(min_cost), 2)\n\ny_t = [1, 1, 0, 0, 0]\ny_p = [0.8, 0.3, 0.6, 0.2, 0.1]\nc_fp = 10.0\nc_fn = 100.0\nfind_optimal_threshold(y_t, y_p, c_fp, c_fn)\n",
            "tests": "yt = [1, 0]\nyp = [0.9, 0.1]\nth_opt, c_opt = find_optimal_threshold(yt, yp, 50.0, 50.0)\nassert c_opt == 0.0, f\"测试不匹配: {c_opt}\"\n",
            "explanation": "遍历概率网格阈值，向量化统计 FP 与 FN 频次并乘上各自的单样本代价，找到让企业总损失最小的最优决策阈值。",
            "tags": ["阈值调优", "代价敏感学习", "商业决策", "算法实战"],
            "related_lesson_id": "ml-eng-l2-3",
        },
        single_choice(
            ex_id="ml-eng-c2-ex7",
            question="在加权调和平均指标 $F_\\beta$ 分数中，若业务方明确要求“模型对召回率（Recall）的重视程度应当是精确率（Precision）的 2 倍”，则超参数 $\\beta$ 应该设置为多少？",
            options=[
                {"value": "A", "text": "$\\beta = 2.0$（即 $F_2$ 分数）"},
                {"value": "B", "text": "$\\beta = 0.5$（即 $F_{0.5}$ 分数）"},
                {"value": "C", "text": "$\\beta = 1.0$"},
                {"value": "D", "text": "$\\beta = 4.0$"},
            ],
            answer="A",
            explanation="由 F_beta 公式可知，beta 参数控制着对召回率的重视程度与对精确率重视程度的比值。当 beta=2 时为 F2 分数，召回率的权重是精确率的 2 倍；当 beta=0.5 时，精确率的权重是召回率的 2 倍。",
            difficulty=2,
            related_lesson_id="ml-eng-l2-2",
            tags=["F-beta", "召回率", "精确率", "指标权衡"],
        ),
    ]

    return chapter(
        chapter_id="ml-eng-c2",
        course_id="ml-engineering",
        order=2,
        title="工业级模型评估、检验与指标诊断",
        goal="掌握 GroupKFold 与时序防泄漏检验，掌握 ROC/PR-AUC 诊断本质，掌握 Platt 概率校准与代价敏感最优阈值决策。",
        lessons=lessons,
        exercises=exercises,
    )
