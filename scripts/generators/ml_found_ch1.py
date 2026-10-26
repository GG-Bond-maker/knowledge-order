# -*- coding: utf-8 -*-
"""
Chapter 1: 机器学习全景范式与学习理论
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_1():
    # ── Lesson 1.1 ──
    l1_content = """### 学习目标
学完本节，你应该能够：
1. 深刻理解传统规则系统（基于逻辑判断）与机器学习（基于数据统计归纳）的底层分水岭；
2. 掌握 Tom Mitchell 关于机器学习的形式化数学定义，并准确识别实际系统中的任务 $T$、经验 $E$ 与性能度量 $P$；
3. 清晰阐明机器学习五步标准闭环：问题建模、特征表征、假说空间搜索、损失评估与迭代优化；
4. 用代码实现规则决策树与统计拟合模型的对比，观察两者在面对噪声数据时的鲁棒性差异。

### 前置知识
- 基础 Python 编程语法（函数、条件分支、字典与列表推导式）；
- 基础平面直角坐标系概念与一元一次方程 $y = ax + b$ 直觉。

### 问题背景
在计算机发展的早期，人工智能主要由「专家系统」（Expert Systems）统治：人类领域专家把规则一条条编码成巨大的 `if-else` 分支（例如“若体温 > 38.5 且咳嗽且白细胞偏高，则判断为上呼吸道感染”）。
然而在现实世界中：
1. **规则爆炸与维护地狱**：一张 $28 \\times 28$ 像素的灰度手写数字图片，包含 784 个像素点，可能的像素组合高达 $256^{784}$，没有任何人类工程师能写尽识别数字「8」的所有几何规则；
2. **模糊性与对抗噪声**：现实数据总是充满传感器噪声与环境波动，机械硬编码规则在边界处极其脆弱，稍有扰动便全盘崩溃。
**机器学习的核心转变**：不再由人类教计算机「怎么做（How）」，而是由人类提供「目标衡量尺（Loss Function）」与大量「真实历史证据（Data）」，让计算机自主在参数空间中搜索出最优映射函数。

### 直觉理解
想象教一个婴儿认识小猫：
- **规则系统做法**：拿出一把尺子量耳朵长短、尖锐角度、胡须根数，给婴儿一套长达 500 页的《猫咪特征判定手册》。结果婴儿看到一只折耳猫就彻底判断失败。
- **机器学习做法**：带婴儿去动物园，指着 100 只形态各异的猫说“这是猫”，指着狗和兔子说“这不是猫”。婴儿的大脑神经网络自发从视觉信号中抽象出“绒毛质感、面部骨骼比例、体型特征”等深层特征，并形成极其稳健的识别能力。这就是“从经验中归纳”。

### 核心概念与符号对照表
| 核心概念 | 英文与符号 | 数学/系统含义 | 现实案例（垃圾邮件过滤） |
| --- | --- | --- | --- |
| **任务** | Task, $T$ | 系统需要完成的学习或预测行为 | 将新到达的邮件判定为“垃圾”或“非垃圾” |
| **经验** | Experience, $E$ | 供系统观测并提取统计模式的数据集 | 带有“垃圾/正常”人工标签的 10 万封历史邮件 |
| **性能度量** | Performance, $P$ | 量化评估系统完成任务优劣的标准 | 邮件分类准确率（Accuracy）与误杀率 |
| **真实分布** | Data Distribution, $\\mathcal{D}$ | 客观世界中数据产生的未知概率分布 | 全球真实邮件的语言分布与发信模式 |
| **独立同分布** | i.i.d. | 样本间互相独立且源自同一分布的假设 | 假设每封训练邮件的到达概率独立且统计特性稳定 |
| **假说映射** | Hypothesis, $f: \\mathcal{X} \\rightarrow \\mathcal{Y}$ | 模型从输入特征空间到输出标签空间的数学函数 | $f(\\mathbf{x}) = \\sigma(\\mathbf{w}^T \\mathbf{x} + b)$ |

### 数学原理与逐步推导
#### 1. Mitchell 形式化定义（1997）
> **定义**：对于某类任务 $T$ 和性能度量 $P$，如果一个计算机程序在 $T$ 上以 $P$ 衡量的性能随着经验 $E$ 的积累而提升，则称该程序从经验 $E$ 中进行了学习。

数学形式化表达为：
设性能评估函数为 $\\mathcal{M}_P(f, T)$，其中 $f$ 为由经验数据集 $S_n \\sim \\mathcal{D}^n$ 训练得到的模型：
$$\\lim_{n \\rightarrow \\infty} \\mathbb{E}_{S_n \\sim \\mathcal{D}^n} [\\mathcal{M}_P(f_{S_n}, T)] > \\mathcal{M}_P(f_0, T)$$

#### 2. 从确定性映射到统计推断
传统程序设计是确定性推导：
$$\\text{输入} \\mathbf{x} + \\text{人工算法代码} \\rightarrow \\text{输出} y$$
机器学习则是反向归纳与统计推断：
$$\\text{历史输入} \\mathbf{x} + \\text{历史结果} y \\xrightarrow{\\text{搜索优化}} \\text{预测模型} \\hat{f}$$
之后将新样本代入模型预测：
$$\\hat{y}_{\\text{new}} = \\hat{f}(\\mathbf{x}_{\\text{new}})$$

### 架构图示与数据流
```
【传统软件架构（规则驱动）】
[数据 x] ───┐
            ├──> [ 人类硬编码规则 if-else ] ───> [ 决策结果 y ]
[规则代码] ──┘   （当场景复杂度上升，维护成本暴增）

【机器学习架构（数据与目标驱动）】
[训练数据 X] ──┐
               ├──> [ 假说空间搜索 + 损失函数优化 ] ───> [ 泛化模型 f(x) ]
[真实标签 Y] ──┘                                               │
                                                               ▼
[新样本 x_new] ────────────────────────────────────────> [ 预测输出 y_hat ]
```

### 逐步实现与代码解析
我们通过一个具体问题对比两者：根据用户消费金额与在线时长，预测用户是否为高价值付费用户。
观察硬编码阈值在数据受到微小扰动时如何失效，而统计模型如何优雅适应：

```python
import numpy as np

# 1. 模拟合成真实用户数据 (特征: 消费金额, 在线时长; 标签: 0或1)
rng = np.random.default_rng(42)
n_samples = 200
X = rng.uniform(10, 100, size=(n_samples, 2))
# 真实规律: 0.05 * 金额 + 0.08 * 时长 - 5 > 0 判定为付费用户，并加入轻微噪声
true_logits = 0.05 * X[:, 0] + 0.08 * X[:, 1] - 5.0
noise = rng.normal(0, 0.4, size=n_samples)
y = ((true_logits + noise) > 0).astype(int)

# 2. 传统人工规则系统：专家凭借主观经验拍脑袋设定的硬编码切分
def expert_system_predict(features):
    # 专家规则：金额 > 50 且 时长 > 40
    return ((features[:, 0] > 50) & (features[:, 1] > 40)).astype(int)

# 3. 统计机器学习做法：使用感知机/线性分类器自适应寻找最优分界超平面
class LinearLearner:
    def __init__(self, lr=0.01, epochs=100):
        self.lr = lr
        self.epochs = epochs
        self.w = np.zeros(2)
        self.b = 0.0

    def fit(self, X_train, y_train):
        # 梯度更新拟合决策边界
        for _ in range(self.epochs):
            for i in range(len(X_train)):
                pred = 1 if (np.dot(X_train[i], self.w) + self.b) > 0 else 0
                error = y_train[i] - pred
                self.w += self.lr * error * X_train[i]
                self.b += self.lr * error

    def predict(self, X_test):
        return ((X_test @ self.w + self.b) > 0).astype(int)

learner = LinearLearner(lr=0.001, epochs=50)
learner.fit(X, y)

rule_acc = np.mean(expert_system_predict(X) == y)
ml_acc = np.mean(learner.predict(X) == y)

print(f"人工规则准确率: {rule_acc:.3f}")
print(f"机器学习准确率: {ml_acc:.3f}")
print(f"学习得到的权重参数: w = {learner.w.round(3)}, b = {learner.b:.3f}")
```

### 常见易错点与典型反例
1. **「数据越多，模型一定越好」的迷思**：
   - 错误认知：以为只要给模型灌海量数据，准确率自然能逼近 100%。
   - 真实根因：若新增数据与目标场景不属于同一数据分布 $\\mathcal{D}$（发生分布漂移 Distribution Drift），或者数据含有系统性偏误（Selection Bias），海量垃圾数据只会让模型“极其自信地得到错误结论”。
2. **混淆「拟合」与「智能」**：
   - 机器学习模型并没有意识和语义理解，它的本质是在高维空间中进行**流形插值与相关性逼近**，并不直接等同于因果推理。

### 知识联系与进阶桥梁
- **上承**：高等数学中的多元函数与几何直线方程；
- **下接**：本章第 2 节将深入拆解机器学习的分类、回归、聚类与强化学习三大全景范式；
- **跃迁**：第 2 章将系统探讨模型背后的假说空间与损失函数极值求解。

### 本节总结与自查清单
- [ ] 能否向非技术人员解释“Mitchell 机器学习定义中的三要素 $T, E, P$”？
- [ ] 面对一个实际业务需求，能否快速判断它适合用传统规则还是机器学习来解决？
- [ ] 为什么说机器学习系统是“目标函数驱动，而非代码指令驱动”？

### 权威来源与延伸阅读
- Tom M. Mitchell (1997). *Machine Learning*, Chapter 1: Introduction, McGraw-Hill.
- Trevor Hastie, Robert Tibshirani, Jerome Friedman (2009). *The Elements of Statistical Learning*, Chapter 2: Overview of Supervised Learning, Springer."""

    # ── Lesson 1.2 ──
    l2_content = """### 学习目标
学完本节，你应该能够：
1. 掌握监督学习、无监督学习、半监督学习与强化学习的数学形式化定义与本质差异；
2. 准确分辨回归问题与分类问题的标签空间几何特征，并能为实际问题选定正确建模目标；
3. 理解自监督学习（Self-Supervised Learning）如何成为现代大规模预训练语言模型（LLM）的底层支撑；
4. 运行可交互代码，对比分类、回归与无监督聚类在数据变换上的实际输出。

### 前置知识
- 本章 1.1 节：机器学习形式化定义；
- 离散集合（Discrete Sets）与连续实数空间（Real Continuum）概念。

### 问题背景
在实际业务中，我们经常遇到完全不同的业务场景：
- “预测明天的气温是多少摄氏度？”（连续数值）
- “判定这张胸透片是否有恶性肿瘤？”（离散二元类别）
- “电商平台有 5000 万匿名访客，如何发现他们自发聚集的消费偏好圈层？”（没有任何标签）
- “让四足机器人在复杂雪地地形上自主学会奔跑平衡？”（无静态输入，依赖试错反馈）
如果不能在问题建模的第一步准确识别任务范式，就会导致灾难性的架构错误（例如用回归方法去预测多分类标签，或者强行用无监督聚类去解决欺诈分类）。

### 直觉理解
- **监督学习（Supervised）**：有标准答案的做题家。每个训练题旁边都印刷着参考答案 $y$，模型做完题对照答案扣分，不断纠偏。
- **无监督学习（Unsupervised）**：整理杂乱衣物的管家。没人告诉你衣服分类标签，但你会根据颜色、材质、季节自然把相似的衣服归拢成堆。
- **强化学习（Reinforcement）**：学骑自行车的少年。没有老师在耳边逐毫秒念诵角度指令，只有摔倒的疼痛（惩罚）和疾驰的风（奖励），在不断受挫中掌握动力学平衡。
- **自监督学习（Self-Supervised）**：完形填空高手。把整本书扣掉几个词，让模型猜被盖住的词是什么，用数据本身的内在结构自己监督自己。

### 核心概念与符号对照表
| 学习范式 | 输入与标签形式 | 典型目标任务 | 核心评估指标 | 代表经典算法 |
| --- | --- | --- | --- | --- |
| **监督学习：回归** | $\\mathcal{X} \\subseteq \\mathbb{R}^d, \\mathcal{Y} \\subseteq \\mathbb{R}$ | 房价预测、销量预测、温度回归 | MSE, RMSE, MAE, $R^2$ | 线性回归、GBDT回归、SVR |
| **监督学习：分类** | $\\mathcal{X} \\subseteq \\mathbb{R}^d, \\mathcal{Y} \\in \\{1,\\dots,K\\}$ | 欺诈检测、图像识别、情感倾向 | Accuracy, Precision, Recall, AUC | 逻辑回归、随机森林、SVM |
| **无监督学习：聚类** | $\\mathcal{X} \\subseteq \\mathbb{R}^d, \\mathcal{Y} = \\emptyset$ | 客户分群、热点新闻聚合 | 轮廓系数、互信息 | K-means, DBSCAN, 层次聚类 |
| **无监督学习：降维** | $\\mathbf{x} \\in \\mathbb{R}^D \\rightarrow \\mathbf{z} \\in \\mathbb{R}^d$ ($d \\ll D$) | 特征压缩、高维数据可视化 | 解释方差比、重构误差 | PCA, t-SNE, UMAP |
| **强化学习** | 状态 $s_t$, 动作 $a_t$, 奖励 $r_t$, 转移 $\\mathcal{P}$ | 围棋博弈、自动驾驶、机器人控制 | 累积折扣回报 $\\sum \\gamma^t r_t$ | Q-Learning, PPO, DQN |

### 数学原理与逐步推导
#### 1. 监督学习形式化
给定训练集 $S = \\{(\\mathbf{x}_i, y_i)\\}_{i=1}^n$ 独立同分布于未知联合分布 $P(X, Y)$。
目标是寻找映射函数 $f: \\mathcal{X} \\rightarrow \\mathcal{Y}$，最小化在未知分布上的期望损失：
$$R(f) = \\int_{\\mathcal{X} \\times \\mathcal{Y}} L(f(\\mathbf{x}), y) dP(\\mathbf{x}, y)$$

#### 2. 回归与分类的几何分水岭
- **回归分析**：在空间中拟合一个**连续超曲面**，使得所有样本点到曲面的垂直/投影距离方差最小。
- **分类分析**：在空间中寻找一个或多个**分离超曲面（Decision Boundary）**，将不同类别的点集隔绝在不同的拓扑连通区域内。

#### 3. 强化学习形式化（马尔可夫决策过程 MDP）
强化学习建模为一个五元组 $\\mathcal{M} = \\langle \\mathcal{S}, \\mathcal{A}, \\mathcal{P}, \\mathcal{R}, \\gamma \\rangle$：
- 策略函数 $\\pi(a|s) = P(A_t = a | S_t = s)$；
- 优化目标是寻找最优策略 $\\pi^*$ 最大化期望累积回报：
  $$J(\\pi) = \\mathbb{E}_{\\tau \\sim \\pi} \\left[ \\sum_{t=0}^T \\gamma^t R(s_t, a_t) \\right]$$

### 逐步实现与代码解析
通过下面的自包含代码，直观体验分类、回归与聚类三大任务在代码调用与结果结构上的根本区别：

```python
import numpy as np
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.cluster import KMeans

# 1. 准备共享特征数据 (2维特征)
rng = np.random.default_rng(0)
X = rng.normal(loc=[5.0, 10.0], scale=[1.5, 2.0], size=(100, 2))

# ── 任务 A: 回归任务 (连续实数目标 y_reg) ──
# 目标: y = 2.5 * x1 + 1.2 * x2 + 噪声
y_reg = 2.5 * X[:, 0] + 1.2 * X[:, 1] + rng.normal(0, 0.5, size=100)
reg_model = LinearRegression().fit(X, y_reg)
pred_reg = reg_model.predict(X[:3])

# ── 任务 B: 分类任务 (离散标签 y_cls in {0, 1}) ──
# 目标: 按照超平面是否大于某阈值切分两类
y_cls = (y_reg > np.median(y_reg)).astype(int)
cls_model = LogisticRegression().fit(X, y_cls)
pred_cls = cls_model.predict(X[:3])
pred_prob = cls_model.predict_proba(X[:3])[:, 1]

# ── 任务 C: 无监督聚类任务 (完全无需目标标签 y) ──
# 目标: 自发发现数据内在聚集中心
cluster_model = KMeans(n_clusters=2, random_state=0, n_init='auto').fit(X)
cluster_labels = cluster_model.labels_[:3]

print("=== 回归任务预测 (连续实数) ===")
print(f"前3个样本真实值: {y_reg[:3].round(2)}")
print(f"前3个样本预测值: {pred_reg.round(2)}\n")

print("=== 分类任务预测 (离散类别与预测概率) ===")
print(f"前3个样本真实分类: {y_cls[:3]}")
print(f"前3个样本分类预测: {pred_cls}")
print(f"前3个样本正类概率: {pred_prob.round(3)}\n")

print("=== 无监督聚类结果 (自发划分簇编号) ===")
print(f"前3个样本聚类分配: {cluster_labels}")
print(f"聚类质心坐标:\\n{cluster_model.cluster_centers_.round(2)}")
```

### 常见易错点与典型反例
1. **分类阈值的僵化理解**：
   - 误区：认为分类器输出的就是绝对类别标签。
   - 事实：现代概率分类器（如 Logistic Regression, 神经网络）输出的都是后验概率估计 $P(y=1|\\mathbf{x})$，从概率转换为离散类别依赖于**判定阈值 $\\tau$**（默认 0.5）。在癌症筛查或金融欺诈等非对称代价场景下，阈值通常下调至 0.1 甚至 0.02。
2. **以为降维无损**：
   - PCA 等降维算法不可避免会丢失正交投影方向的方差（残差能量），降维是方差与信噪比的折中，绝非免费午餐。

### 知识联系与进阶桥梁
- **上承**：1.1 节 Mitchell 学习形式化框架；
- **下接**：1.3 节将深入特征空间的几何结构与距离度量第一性原理；
- **大模型关联**：大语言模型（LLM）的 Next-Token Prediction 本质上是词表维度（数万维）上的大规模多分类监督学习，但利用无标注网络语料自建监督信号（自监督学习）。

### 本节总结与自查清单
- [ ] 能否给出分类与回归的最本质数学差异（标签空间的拓扑形态）？
- [ ] 强化学习的反馈信号与监督学习的标签有什么核心区别（时延性、评价性而非指导性）？
- [ ] 自监督预训练如何解决了传统监督学习依赖人工标注的昂贵瓶颈？

### 权威来源与延伸阅读
- Christopher M. Bishop (2006). *Pattern Recognition and Machine Learning*, Section 1.1: Example: Polynomial Curve Fitting, Springer.
- Richard S. Sutton, Andrew G. Barto (2018). *Reinforcement Learning: An Introduction*, Chapter 1, MIT Press."""

    # ── Lesson 1.3 ──
    l3_content = """### 学习目标
学完本节，你应该能够：
1. 理解将物理实体（文本、图像、交易日志）映射为高维欧氏向量空间的表征几何本质；
2. 熟练掌握并推导常见距离与相似度度量（$L_1$ 曼哈顿、$L_2$ 欧几里得、余弦相似度、马氏距离），明确各自适用前提；
3. 从几何概率推导出「维度灾难」（Curse of Dimensionality），理解高维球体体积集中与距离集聚坍缩现象；
4. 运行向量化实验代码，验证高维空间中随机向量彼此正交且距离比值趋于 1 的反直觉数学特性。

### 前置知识
- 线性代数中的向量内积（Dot Product）与向量模长（$L_2$ 范数）；
- 概率统计中的均值与协方差矩阵。

### 问题背景
计算机天生只能进行算术与矩阵浮点计算，无法直接“阅读”医疗报告、无法直接“观看”CT 影像。
机器学习的前提，是把物理世界的非结构化对象映射到向量空间：
$$\\mathbf{x} = [x_1, x_2, \\dots, x_d]^T \\in \\mathbb{R}^d$$
这个过程被称为**表征（Representation）或特征工程**。
然而一旦进入高维向量空间，人类基于三维世界的几何直觉将彻底失效：在高维空间中，点与点之间的距离分布急剧集聚，球体的体积几乎全部贴在外壳表面，使得基于距离的算法（如 KNN、SVM、K-means）面临严重的退化风险。

### 直觉理解
- **欧几里得距离**：飞鸟直线距离。两点之间拉一条皮尺量出的真实物理距离，对特征尺度极端敏感；
- **曼哈顿距离**：曼哈顿街区出租车行驶距离。只能沿着坐标轴网格水平垂直转弯走；
- **余弦相似度**：关注方向而非模长。两名读者读同样类型的书籍，但一位读者读书量是另一位的 10 倍，二人的阅读向量模长差异巨大，但夹角余弦极高，代表品味完全一致；
- **维度灾难直觉**：在 1 维线段 $[0, 1]$ 上采 10 个点就能密布空间（间隔 0.1）；在 2 维单位正方形中需要 $10^2=100$ 个点；在 100 维超立方体中，若保持同样密度，需要 $10^{100}$ 个点——这已经远超全宇宙原子总数！在高维空间中，任何数据集都呈现出绝对的极度空旷与稀疏。

### 核心概念与符号对照表
| 度量方法 | 数学公式 | 几何特性 | 典型适用场景 |
| --- | --- | --- | --- |
| **欧几里得距离** | $d_2(\\mathbf{x}, \\mathbf{z}) = \\sqrt{\\sum_{i=1}^d (x_i - z_i)^2} = \\|\\mathbf{x} - \\mathbf{z}\\|_2$ | 空间直线距离，旋转不变，尺度敏感 | 连续物理特征、图像像素距离 |
| **曼哈顿距离** | $d_1(\\mathbf{x}, \\mathbf{z}) = \\sum_{i=1}^d \\|x_i - z_i\\| = \\|\\mathbf{x} - \\mathbf{z}\\|_1$ | 网格折线距离，抗极端离群点较稳健 | 高维稀疏频次特征、网格路径规划 |
| **余弦相似度** | $\\cos(\\theta) = \\frac{\\mathbf{x} \\cdot \\mathbf{z}}{\\|\\mathbf{x}\\|_2 \\|\\mathbf{z}\\|_2}$ | 向量夹角余弦，范围 $[-1, 1]$，尺度无关 | 文本向量（TF-IDF / Embedding）、推荐系统 |
| **马氏距离** | $d_M(\\mathbf{x}, \\mathbf{z}) = \\sqrt{(\\mathbf{x} - \\mathbf{z})^T \\mathbf{\\Sigma}^{-1} (\\mathbf{x} - \\mathbf{z})}$ | 消除特征协方差相关性与量纲尺度影响 | 多元异常值检测、高斯聚类 |

### 数学原理与逐步推导
#### 1. 高维球体体积集中现象
考虑 $d$ 维单位超球体（半径为 1），其体积公式为：
$$V_d(1) = \\frac{\\pi^{d/2}}{\\Gamma(d/2 + 1)}$$
考虑厚度为 $\\epsilon$ 的超球表面薄壳层（半径在 $1-\\epsilon$ 到 1 之间），该外壳体积占整个超球体积的比例为：
$$\\frac{V_d(1) - V_d(1-\\epsilon)}{V_d(1)} = 1 - (1-\\epsilon)^d$$
当 $d \\rightarrow \\infty$ 时，对于任意小的 $\\epsilon > 0$（例如 $\\epsilon = 0.05$）：
$$\\lim_{d \\rightarrow \\infty} [1 - (1 - \\epsilon)^d] = 1 - 0 = 100\\%$$
**惊人结论**：在高维空间中，球体的几乎所有质量和体积都集中在距离表面极薄的一层外壳上，球体内部完全是空洞的！

#### 2. 距离集中效应（Distance Concentration）
设 $\\mathbf{x}_1, \\mathbf{x}_2, \\dots, \\mathbf{x}_n \\in \\mathbb{R}^d$ 为独立同分布随机向量。当维度 $d \\rightarrow \\infty$ 时：
$$\\lim_{d \\rightarrow \\infty} \\frac{d_{\\max} - d_{\\min}}{d_{\\min}} \\rightarrow 0$$
任意两个样本点之间的距离之比趋于 1。这意味着“最近邻”和“最远邻”几乎一样遥远，传统的近邻判别几乎退化为随机选择。

### 逐步实现与代码解析
以下代码通过仿真模拟，用可运行的数据实验揭示高维空间中距离聚集与球体体积贴壳现象：

```python
import numpy as np

# 1. 模拟维度上升对点间距离分布的影响
dimensions = [2, 10, 50, 200, 1000]
n_points = 100
rng = np.random.default_rng(42)

print("=== 维度灾难：距离对比度 (Max - Min) / Min 的剧烈退化 ===")
for d in dimensions:
    # 在 d 维单位超立方体中随机撒 100 个点
    points = rng.uniform(0, 1, size=(n_points, d))
    # 计算全部两两样本对之间的欧氏距离
    diff = points[:, np.newaxis, :] - points[np.newaxis, :, :]
    dist_matrix = np.sqrt(np.sum(diff ** 2, axis=-1))
    
    # 取非对角线上的有效距离
    mask = ~np.eye(n_points, dtype=bool)
    distances = dist_matrix[mask]
    
    d_min = np.min(distances)
    d_max = np.max(distances)
    contrast = (d_max - d_min) / d_min
    
    print(f"维度 {d:4d} | 最小距离: {d_min:.3f}, 最大距离: {d_max:.3f} | 距离对比度: {contrast:.4f}")

# 2. 验证高维超球体表面外壳体积占比
print("\\n=== 超球薄壳 (外侧 5% 壳层) 包含的体积占比 ===")
epsilon = 0.05
for d in [1, 2, 5, 20, 50, 100]:
    fraction = 1.0 - (1.0 - epsilon) ** d
    print(f"空间维度 {d:3d} | 外壳体积占比: {fraction * 100:.2f}%")
```

### 常见易错点与典型反例
1. **未标准化直接算欧氏距离**：
   - 反例：特征 $x_1$ 为年收入（数万到数百万），特征 $x_2$ 为年龄（20 到 80）。欧氏距离公式中，$(x_1^{(a)} - x_1^{(b)})^2$ 将达到数亿级别，彻底淹没年龄特征的所有信息。**任何基于距离的算法必须先行标准化（Standardization）**。
2. **在文本分类中误用欧氏距离**：
   - 短文本向量长度短，长文本向量长度长，两者欧氏距离巨大，但可能讨论的是同一主题。文本领域必须使用余弦相似度消除篇幅长度影响。

### 知识联系与进阶桥梁
- **上承**：本章 1.2 节无监督降维（PCA 正是解决维度灾难的核心降维技术）；
- **下接**：第 2 章 2.1 节假说空间与归纳偏置；
- **大模型关联**：当代 LLM 的 Embedding 空间通常为 4096 维乃至更高（如 GPT-4, LLaMA-3），其语义检索必须依赖余弦相似度与归一化内积。

### 本节总结与自查清单
- [ ] 为什么在高维空间中，欧几里得距离的辨别能力会发生显著退化？
- [ ] 欧氏距离与余弦相似度各有什么不变性（旋转不变 vs 缩放不变）？
- [ ] 什么是马氏距离？它相比欧氏距离解决了什么核心统计问题（特征共线性与方差量纲）？

### 权威来源与延伸阅读
- Kevin P. Murphy (2012). *Machine Learning: A Probabilistic Perspective*, Section 1.4.3: The Curse of Dimensionality, MIT Press.
- Beyer et al. (1999). *When Is "Nearest Neighbor" Meaningful?*, ICDT Proceedings."""

    lessons = [
        lesson(
            lesson_id="ml-found-l1-1",
            title="机器学习究竟是什么：从专家规则系统到从数据中归纳规律",
            content=l1_content,
            difficulty=2,
            tips=[
                tip("不要把'规则写得很长很复杂'误以为是机器学习。只要系统的逻辑全是由人类程序员预先硬编码决定的，它就依然是符号专家系统，而非从数据泛化经验的机器学习系统。", "pitfall"),
                tip("高频面试题：请准确阐述 Mitchell 提出的机器学习形式化定义，并指出垃圾邮件分类中 T, P, E 分别代表什么。", "interview"),
                tip("生产最佳实践：在机器学习项目立项前，始终优先编写一个单行基准规则或均值模型。如果复杂模型无法稳健超越简单启发式规则，说明问题定义或特征构建存在根源性偏差。", "leak"),
            ],
            demos=[
                demo(
                    code="""import numpy as np

# 简单线性分类学习器模拟
rng = np.random.default_rng(42)
X = rng.uniform(0, 10, size=(100, 2))
# 真实边界: 2 * x1 + 3 * x2 - 25 > 0
y = ((2 * X[:, 0] + 3 * X[:, 1] - 25) > 0).astype(int)

# 简单感知机学习权重
w = np.zeros(2)
b = 0.0
for _ in range(50):
    for i in range(len(X)):
        pred = 1 if (np.dot(X[i], w) + b) > 0 else 0
        err = y[i] - pred
        w += 0.05 * err * X[i]
        b += 0.05 * err

acc = np.mean(((X @ w + b > 0).astype(int)) == y)
print(f"训练完成！分类准确率: {acc * 100:.1f}%")
print(f"收敛权重参数: w1={w[0]:.3f}, w2={w[1]:.3f}, 偏置 b={b:.3f}")
""",
                    lang="python",
                    title="从数据自适应学习线性分类决策边界",
                )
            ],
        ),
        lesson(
            lesson_id="ml-found-l1-2",
            title="监督学习、无监督学习与强化学习：三大范式全景对比",
            content=l2_content,
            difficulty=2,
            tips=[
                tip("混淆分类与回归是初学者最严重的建模错误：如果预测目标是'明天股票的收盘价（实数）'，这是回归任务；如果预测'明天股票是涨还是跌（离散类别）'，这是二分类任务。", "pitfall"),
                tip("大模型核心常识：现代大语言模型（如 GPT、Claude）的预训练阶段属于'自监督因果语言建模'，本质上是用前文预测下一个 Token 的海量离散多分类任务。", "note"),
                tip("面试核心考点：请对比强化学习的 Reward 信号与监督学习的 Label 信号。为什么强化学习探索（Exploration）更加困难？", "interview"),
            ],
            demos=[
                demo(
                    code="""import numpy as np
from sklearn.linear_model import LogisticRegression

# 模拟医学检验指标与患病概率
rng = np.random.default_rng(123)
biomarker = rng.uniform(10, 80, size=(60, 1))
# 患病概率随指标上升
p = 1 / (1 + np.exp(-(0.15 * biomarker - 6)))
label = (rng.uniform(0, 1, size=(60, 1)) < p).astype(int).ravel()

clf = LogisticRegression().fit(biomarker, label)
test_val = np.array([[20.0], [40.0], [60.0]])
probs = clf.predict_proba(test_val)[:, 1]

print("=== 指标数值与罹患疾病后验概率 ===")
for val, prob in zip(test_val.ravel(), probs):
    print(f"指标测量值: {val:4.1f} -> 预测罹患概率: {prob * 100:5.2f}%")
""",
                    lang="python",
                    title="逻辑回归连续特征概率映射实战",
                )
            ],
        ),
        lesson(
            lesson_id="ml-found-l1-3",
            title="样本、特征空间与数据表征第一性原理",
            content=l3_content,
            difficulty=3,
            tips=[
                tip("高维灾难陷阱：在高维空间中，欧几里得距离会发生集聚失效，所有点与点之间的距离差距微乎其微。在高维稀疏场景中，余弦相似度或降维预处理具有极高的优先度。", "performance"),
                tip("特征量纲一致性原则：任何涉及距离或内积计算的算法（KNN、SVM、K-means、梯度下降），在输入模型前必须进行无泄漏特征归一化或标准化！", "pitfall"),
                tip("面试高频：请推导高维空间中超球体外壳体积占比公式，并从几何角度解释为什么随机高维向量彼此趋于正交。", "interview"),
            ],
            demos=[
                demo(
                    code="""import numpy as np

# 验证高维随机向量正交性：计算 1000 维空间中随机向量的夹角余弦
rng = np.random.default_rng(42)
d = 1000
n_pairs = 10

cos_sims = []
for _ in range(n_pairs):
    v1 = rng.normal(0, 1, size=d)
    v2 = rng.normal(0, 1, size=d)
    cos_sim = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
    cos_sims.append(cos_sim)

print("1000 维空间中 10 对独立随机高维向量的夹角余弦：")
for i, sim in enumerate(cos_sims, 1):
    print(f"向量对 {i:2d}: 余弦值 = {sim:+.4f} (对应夹角: {np.degrees(np.arccos(sim)):.2f}°)")
print(f"余弦绝对值均值: {np.mean(np.abs(cos_sims)):.4f} (极其接近 0，几何上几乎严格正交)")
""",
                    lang="python",
                    title="高维向量随机正交性数学模拟",
                )
            ],
        ),
    ]

    # ── Exercises for Chapter 1 ──
    exercises = [
        single_choice(
            ex_id="ml-found-c1-ex1",
            question="根据 Tom Mitchell 关于机器学习的经典形式化定义，如果一个下象棋程序通过与自己对弈 10 万盘棋，使得在锦标赛中的胜率显著提高，那么在该系统中，经验 $E$、任务 $T$ 与性能度量 $P$ 分别是什么？",
            options=[
                {"value": "A", "text": "E: 与自己对弈的历史棋局；T: 下象棋；P: 锦标赛胜率"},
                {"value": "B", "text": "E: 锦标赛胜率；T: 下象棋；P: 与自己对弈的历史棋局"},
                {"value": "C", "text": "E: 下象棋规则；T: 锦标赛比赛；P: 胜利局数"},
                {"value": "D", "text": "E: 锦标赛中的对手棋局；T: 评估棋子价值；P: 击败特级大师的能力"},
            ],
            answer="A",
            explanation="根据 Mitchell 定义：系统执行的任务 T 是下象棋（Playing checkers/chess）；所利用的经验经验 E 是自我对弈积累的对局数据；衡量性能的度量指标 P 是锦标赛胜率。",
            difficulty=1,
            related_lesson_id="ml-found-l1-1",
            tags=["概念定义", "Mitchell定义", "形式化"],
        ),
        judge(
            ex_id="ml-found-c1-ex2",
            question="在大规模预训练语言模型（如 GPT、LLaMA）中，模型通过从互联网未标注文本中截取前文并预测下一个 Token 进行训练。这种学习机制属于纯粹的无监督聚类任务。",
            answer=False,
            explanation="错误。预测下一个 Token 属于【自监督学习（Self-Supervised Learning）】范畴，其在底层形式上是标准的多分类监督学习（标签是下一个实际出现的真实 Token），只不过标签是从无标注纯文本自身切分派生的，不属于无监督聚类。",
            difficulty=1,
            related_lesson_id="ml-found-l1-2",
            tags=["自监督学习", "LLM", "学习范式"],
        ),
        multiple_choice(
            ex_id="ml-found-c1-ex3",
            question="在进行客户信用违约风险评分卡模型开发时，以下哪些做法属于正确且合规的问题建模思路？",
            options=[
                {"value": "A", "text": "由于客户未来是否违约是一个离散二元状态（违约=1，履约=0），应将其形式化为二分类概率估计任务"},
                {"value": "B", "text": "输出的连续后验概率值 $P(y=1|x)$ 可以直接用于客户违约风险分级与额度授信决策"},
                {"value": "C", "text": "可以直接使用未做量纲标准化的客户年收入（数十万元）与客户年龄（数十岁）计算欧氏距离以识别近邻高风险客户"},
                {"value": "D", "text": "在不平衡样本场景（违约率仅 1%）下，不能仅盲目关注整体准确率 Accuracy，必须权衡 Precision、Recall 与 ROC-AUC 指标"},
            ],
            answer=["A", "B", "D"],
            explanation="选项 A、B 正确：违约预测是典型的二分类任务，预测概率可用于精细化分层。选项 C 错误：年收入与年龄数量级相差几万倍，未经标准化的欧氏距离将完全被年收入支配，导致年龄特征失效。选项 D 正确：在 1% 极度不平衡下，全猜不违约准确率也有 99%，毫无实际风控价值，必须考察 PR-AUC/ROC-AUC 等指标。",
            difficulty=2,
            related_lesson_id="ml-found-l1-2",
            tags=["监督学习", "二分类", "特征尺度"],
        ),
        fill(
            ex_id="ml-found-c1-ex4",
            question="在高维欧氏空间中，随着特征维度 $d$ 的不断上升，单位超球体内距离表面厚度为 $\\epsilon$ 的外壳体积占整个超球体积的比例公式为 $1 - (1 - \\epsilon)^d$。当 $d \\rightarrow \\infty$ 且 $\\epsilon > 0$ 时，该体积比例极限值收敛到 ____；这从几何上直接揭示了高维数据具有极度 ____ 的本质特征。",
            blanks=[
                ["1", "100%", "1.0"],
                ["稀疏", "空旷", "稀疏空旷"]
            ],
            explanation="极限值收敛到 1（即 100%），证明高维球体的全部体积都贴在薄薄的外壳上，球体内部极其空旷，导致高维数据点在空间中呈现出极度稀疏分布的几何特性。",
            difficulty=2,
            related_lesson_id="ml-found-l1-3",
            tags=["维度灾难", "几何推导", "填空题"],
        ),
        open_ex(
            ex_id="ml-found-c1-ex5",
            question="【案例分析与架构设计】某自动驾驶物流车研发团队目前面临两个核心算法模块设计需求：\n模块甲：根据激光雷达与摄像头的融合点云数据，在三维坐标系中检测并框选出前方行人与障碍物的精确 3D 边界框（连续坐标中心 $(x,y,z)$ 与长宽高）；\n模块乙：根据车辆当前速度、周围障碍物轨迹与目标导航路线，决定车辆在未来 3 秒内是加速、变道还是紧急制动。\n\n请回答：\n1. 模块甲与模块乙分别应归入哪种机器学习范式（监督/无监督/强化），并说明依据；\n2. 为什么模块乙如果仅采用纯静态监督学习进行训练，容易在实车行驶中遭遇分布外漂移（Distribution Shift）引发失控事故？如何用强化学习思想解决？",
            reference_answer="""1. 范式归属与依据：
- 模块甲属于【监督学习中的回归与分类联合任务（目标检测）】：输入为传感器张量，输出包含连续坐标与尺寸（3D 坐标回归）以及物体类型标签（行人类别多分类），依靠大量带有精细三维标注的真值数据集进行参数优化。
- 模块乙属于【基于环境交互的强化学习（Reinforcement Learning）或序列决策控制任务】：车辆是智能体（Agent），行驶环境是状态空间（State），动作是加速/减速/转弯（Action），目标是最大化安全行驶距离、平顺性并惩罚碰撞风险（Reward）。

2. 静态监督学习的失效根因与强化学习解决方案：
- 静态监督学习（行为克隆，Behavioral Cloning）仅在人类专家驾驶轨迹的经验分布下进行拟合。在实车运行中，车辆微小的预测误差会不断累积，导致车辆陷入人类专家从未演示过的边缘异常状态（Out-of-Distribution 状态）。一旦处于该状态，监督学习模型完全无法自愈纠偏，产生级联错误导致失控。
- 强化学习引入了探索（Exploration）与环境动态闭环反馈。智能体不仅学习“最佳行为”，还在仿真环境中主动经历偏航、失稳状态，并学会通过调节转向与制动将系统从危险状态重新拉回安全轨迹（如马尔可夫决策过程中的价值函数与策略自适应优化），从根本上提升了序列决策的鲁棒性。""",
            explanation="本题考察将复杂现实工程问题准确映射到监督学习与强化学习范式的能力，并深入理解序列决策中累积误差（Covariate Shift / Compounding Error）的本质。",
            rubric=[
                {"point": "准确指出模块甲为监督学习（目标检测，含坐标回归与类别分类），并阐明原因", "score": 25},
                {"point": "准确指出模块乙为强化学习（序列决策控制），明确状态、动作与奖励三要素", "score": 25},
                {"point": "深刻阐明静态监督学习（行为克隆）面对微小误差累积引发分布漂移（OOD）的失效根因", "score": 25},
                {"point": "阐述强化学习如何通过交互试错反馈与自愈恢复策略解决序列控制问题", "score": 25},
            ],
            difficulty=4,
            related_lesson_id="ml-found-l1-2",
            tags=["架构设计", "案例分析", "强化学习 vs 监督学习"],
        ),
        # ── Code Exercise 1 ──
        {
            "id": "ml-found-c1-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】计算高维向量余弦相似度与标准化欧氏距离：\n编写函数 `calc_metrics(v1, v2)`，接收两个一维 NumPy 浮点数组，返回一个字典，包含两个浮点数值：\n1. `cosine_similarity`: 两个向量的余弦相似度 $\\frac{\\mathbf{v}_1 \\cdot \\mathbf{v}_2}{\\|\\mathbf{v}_1\\|_2 \\|\\mathbf{v}_2\\|_2}$（保留浮点数）；\n2. `euclidean_distance`: 两个向量的标准欧氏距离 $\\|\\mathbf{v}_1 - \\mathbf{v}_2\\|_2$。\n\n最后一行请返回调用示例 `calc_metrics(np.array([1.0, 2.0, 3.0]), np.array([4.0, 5.0, 6.0]))` 的字典结果。",
            "starterCode": "import numpy as np\n\ndef calc_metrics(v1: np.ndarray, v2: np.ndarray) -> dict:\n    \"\"\"计算两个向量的余弦相似度与欧式距离\"\"\"\n    # 请在此实现\n    ___\n\ncalc_metrics(np.array([1.0, 2.0, 3.0]), np.array([4.0, 5.0, 6.0]))\n",
            "setupCode": "",
            "expectedOutput": "{'cosine_similarity': 0.9746318461970762, 'euclidean_distance': 5.196152422706632}",
            "answer": "import numpy as np\n\ndef calc_metrics(v1: np.ndarray, v2: np.ndarray) -> dict:\n    dot_prod = np.dot(v1, v2)\n    norm1 = np.linalg.norm(v1)\n    norm2 = np.linalg.norm(v2)\n    cos_sim = float(dot_prod / (norm1 * norm2))\n    euc_dist = float(np.linalg.norm(v1 - v2))\n    return {\"cosine_similarity\": cos_sim, \"euclidean_distance\": euc_dist}\n\ncalc_metrics(np.array([1.0, 2.0, 3.0]), np.array([4.0, 5.0, 6.0]))\n",
            "tests": "res = calc_metrics(np.array([1.0, 0.0]), np.array([0.0, 1.0]))\nassert round(res['cosine_similarity'], 4) == 0.0, f\"正交向量余弦应为0: {res}\"\nassert round(res['euclidean_distance'], 4) == 1.4142, f\"单位正交向量欧氏距离有误: {res}\"\nres2 = calc_metrics(np.array([3.0, 4.0]), np.array([6.0, 8.0]))\nassert round(res2['cosine_similarity'], 4) == 1.0, f\"同向向量余弦应为1: {res2}\"\nassert round(res2['euclidean_distance'], 4) == 5.0, f\"欧式距离计算有误: {res2}\"\n",
            "explanation": "余弦相似度度量向量方向夹角（与模长伸缩无关），欧氏距离度量空间直线绝对位移（与尺度和原点高度相关）。",
            "tags": ["特征空间", "度量计算", "NumPy实战"],
            "related_lesson_id": "ml-found-l1-3",
        },
        single_choice(
            ex_id="ml-found-c1-ex7",
            question="在信用评分或医疗诊断中，若正负样本比例为 1:99（正类为极度罕见的违约/患病）。如果一个基线模型盲目地将所有样本均预测为负类（正常），那么该模型的指标表现如何？",
            options=[
                {"value": "A", "text": "准确率（Accuracy）高达 99%，但召回率（Recall）为 0%，在业务上毫无任何预警价值"},
                {"value": "B", "text": "准确率只有 1%，说明模型彻底失效"},
                {"value": "C", "text": "精确率（Precision）高达 99%，说明模型预警极其可信"},
                {"value": "D", "text": "F1-Score 达到 0.99，模型表现接近完美"},
            ],
            answer="A",
            explanation="由于负类占 99%，全猜负类使得 TN=99, FN=1, TP=0, FP=0。整体准确率 Accuracy = (TN+TP)/Total = 99/100 = 99%。但由于未抓出任何一个正样本（TP=0），正类召回率 Recall = TP/(TP+FN) = 0/1 = 0%，无法在实际业务中截获任何一例风险。",
            difficulty=2,
            related_lesson_id="ml-found-l1-2",
            tags=["评估指标", "不平衡样本", "准确率悖论"],
        ),
    ]

    return chapter(
        chapter_id="ml-found-c1",
        course_id="ml-foundations",
        order=1,
        title="机器学习全景范式与学习理论",
        goal="掌握机器学习形式化定义，厘清监督/无监督/自监督/强化学习的本质边界，建立高维向量特征空间的几何认知与度量体系。",
        lessons=lessons,
        exercises=exercises,
    )
