# -*- coding: utf-8 -*-
"""
Chapter 3: 不平衡数据分布与稀有事件建模 (Imbalanced Data Learning & Rare Event Modeling)
Course: ml-engineering
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_3():
    # ── Lesson 3.1 ──
    l1_content = """### 学习目标
学完本节，你应该能够：
1. 掌握真实工业场景中极端长尾不平衡数据（Imbalanced Data）对模型经验风险最小化的扭曲机理；
2. 深刻辨析数据级重采样（Resampling）策略：随机欠采样（RUS）、随机过采样（ROS）与潜在缺陷；
3. 掌握 Chawla 等人提出的 **SMOTE（合成少数类过采样技术）** 在特征空间沿 $k$ 近邻连线的凸组合插值数学原理；
4. 掌握边界过采样（Borderline-SMOTE）如何将插值精力集中在分类决策边界的危险样本（DANGER）上；
5. 掌握数据级重采样的**防泄漏最高铁律**：为什么重采样必须且只能在交叉验证的训练折内部进行；
6. 编写代码使用纯 Python/NumPy 实现单步 SMOTE 样本合成算法，并在稀有类数据上直观验证插值分布。

### 前置知识
- 向量空间凸组合（Convex Combination）；
- $k$ 近邻欧几里得距离检索。

### 问题背景与 ML 用途
在真实的工业界：
- 欺诈交易只占 0.01%（1 万笔交易中只有 1 笔欺诈）；
- 广告点击率（CTR）通常只有 1% 到 3%；
- 半导体晶圆缺陷检测中瑕疵芯片不到 0.1%。
如果直接将这些数据喂给传统的机器学习模型：
- 目标损失函数（如均方误差、交叉熵）在样本上求平均，占 99.9% 的多数类会产生绝对压倒性的梯度信号；
- 少数类产生的误差被彻底淹没在汪洋大海中，导致模型完全蜕变成“只会猜负类的装傻机器”。
重采样（Resampling）技术从数据输入端对这一倾斜分布进行纠偏，是工业级稀有事件挖掘的第一道防线。

### 直觉理解
- **生硬复读机 vs 虚拟模拟演练**：
  - **随机过采样（ROS）**：就像驾校学员练车时，遇到一次复杂的雨天侧方停车，教练把同一段录像强行播放了 100 遍（硬复制）。学员把这段录像里每一个像素都背下来了（严重过拟合），但稍微换个角度的下雨天依然不会停；
  - **SMOTE 合成技术**：教练把学员在雨天遇到的几个极其相似的险情点连成一线，在这几个真实险情之间的“空隙路径”上，智能生成全新且符合物理规律的“虚拟综合险情”（特征空间插值）！学员因此见到了多样化的真实衍生场景，真正学会了举一反三！

### 核心概念与符号对照表
| 重采样技术 | 核心机制 | 致命隐患 / 优势 | 适用场景 |
| --- | --- | --- | --- |
| **随机欠采样 (RUS)** | 随机抛弃多数类样本直至比例均衡 | 抛弃了海量原本包含珍贵信息的正常样本 | 原始总样本数极大（千万级）且算力有限 |
| **随机过采样 (ROS)** | 简单有放回粗暴复制少数类样本 | 导致模型在复制的少数样本周围过拟合出极窄的决策孤岛 | 极力不推荐单独使用 |
| **SMOTE** | 少数类样本与其近邻点做随机线性插值 | 创造新样本，拓宽决策边界；但若插值落在两类重叠区会产生噪声 | 中小规模稀有类特征空间连续数据 |
| **Borderline-SMOTE** | 仅对周围半数邻居是多数类的“边界危险样本”做插值 | 避免在少数类深处浪费样本，也不在噪声区生成样本 | **工业界效果最稳健的 SMOTE 进阶变体** |

### 数学原理与逐步推导
#### SMOTE 特征空间凸组合插值公式推导
设少数类样本集为 $\mathcal{S}_{\text{min}}$。
对于 $\mathcal{S}_{\text{min}}$ 中的每一个样本 $\mathbf{x}_i$：
1. 在 $\mathcal{S}_{\text{min}}$ 内部计算其到其他同类样本的欧氏距离，提取出其前 $k$ 个最近邻（通常 $k=5$）：
   $$\mathcal{N}_k(\mathbf{x}_i) = \{\mathbf{z}_1, \mathbf{z}_2, \dots, \mathbf{z}_k\}$$
2. 从这 $k$ 个邻居中均匀随机抽取一个邻居样本 $\mathbf{x}_{zi} \in \mathcal{N}_k(\mathbf{x}_i)$；
3. 在样本 $\mathbf{x}_i$ 与邻居 $\mathbf{x}_{zi}$ 连接的线段上随机插值，生成新样本 $\mathbf{x}_{\text{new}}$：
   $$\mathbf{x}_{\text{new}} = \mathbf{x}_i + \lambda (\mathbf{x}_{zi} - \mathbf{x}_i), \quad \lambda \sim \text{Uniform}(0, 1)$$
由于 $\lambda \in [0, 1]$，$\\mathbf{x}_{\\text{new}} = (1-\\lambda)\\mathbf{x}_i + \\lambda \\mathbf{x}_{zi}$ 在几何上严格落在连接两点的线段之间（凸组合）。
这一插值保证了新样本在特征空间中具有与真实少数类完全一致的局部流形密度，显著增强了决策边界对少数类区域的覆盖泛化能力。

### 真实代码示例与分析
下面展示从零实现 SMOTE 核心线性插值函数，并在不平衡数据上观察少数类合成效果："""

    l1_code = """import numpy as np
from sklearn.neighbors import NearestNeighbors

def simple_smote(X_minority: np.ndarray, n_samples_to_generate: int, k_neighbors: int = 5) -> np.ndarray:
    \"\"\"从零实现核心 SMOTE 样本线性插值生成器\"\"\"
    n_min, d = X_minority.shape
    k = min(k_neighbors, n_min - 1)
    
    # 1. 拟合少数类样本的 KNN 拓扑
    nn = NearestNeighbors(n_neighbors=k + 1).fit(X_minority)
    _, indices = nn.kneighbors(X_minority)
    
    synthetic_samples = []
    for _ in range(n_samples_to_generate):
        # 随机挑选一个基准少数类样本 i
        base_idx = np.random.randint(0, n_min)
        base_pt = X_minority[base_idx]
        
        # 随机挑选该样本的一个 k 近邻 (排除自身索引 0)
        neighbor_idx = np.random.choice(indices[base_idx, 1:])
        neighbor_pt = X_minority[neighbor_idx]
        
        # 在两点连线上执行均匀随机凸组合插值
        lam = np.random.uniform(0.0, 1.0)
        new_pt = base_pt + lam * (neighbor_pt - base_pt)
        synthetic_samples.append(new_pt)
        
    return np.array(synthetic_samples)

# 构造一个 2 维稀有少数类点集 (仅 5 个点)
np.random.seed(42)
X_minority_demo = np.array([
    [1.0, 1.0], [1.2, 1.5], [1.5, 1.1], [2.0, 1.8], [1.8, 2.2]
])

# 使用 SMOTE 合成 4 个全新虚拟样本
X_syn = simple_smote(X_minority_demo, n_samples_to_generate=4, k_neighbors=3)

print("=== 原始少数类真实样本 (5 个) ===")
print(X_minority_demo)
print("\\n=== SMOTE 智能合成的全新样本 (4 个) ===")
print(np.round(X_syn, 4))
print("验证: 合成样本完全落在原始点簇构成的凸包凸流形内部，极大拓宽了决策边界！")
"""

    l1_tips = [
        tip("千万不要在交叉验证之前对全量数据做 SMOTE！若在切分前做 SMOTE，合成样本会将训练集的信息和验证集的信息做插值混合，导致验证集在评估时遇到的是自己的‘血缘双胞胎’，产生严重的离线虚高欺骗。SMOTE 只能在每一折的训练集内部独立生成！", "leak"),
    ]

    # ── Lesson 3.2 ──
    l2_content = """### 学习目标
学完本节，你应该能够：
1. 掌握算法级代价敏感学习（Cost-Sensitive Learning）的核心理念：无需生成假样本，直接在损失反向传播时重加权；
2. 严格推导 Scikit-Learn 与主流提升树中 `class_weight='balanced'` 的数学公式 $w_c = \\frac{N}{K \\cdot N_c}$；
3. 掌握现代深度学习与不平衡建模的里程碑损失：何恺明团队提出的 **Focal Loss**；
4. 严格推导 Focal Loss 的动态聚焦衰减因子 $(1 - p_t)^\\gamma$ 抑制大量简单易分负样本梯度的数学物理机理；
5. 掌握超参数 $\\alpha_t$（类别平衡系数）与 $\\gamma$（聚焦调制因子，通常取 2.0）的调优法则；
6. 编写代码对比普通二元交叉熵损失（BCE）与 Focal Loss 在不同置信度样本上的损失与梯度衰减曲线。

### 前置知识
- 二元交叉熵（BCE）损失函数求导；
- 梯度下降与反向传播权重调整。

### 问题背景与 ML 用途
在样本不平衡场景中，数据级重采样（SMOTE）虽然直观，但在工业实践中存在三大痛点：
1. 合成样本增加了总训练数据量，拖慢大规模模型的训练速度；
2. 在高维稀疏特征（如点击率预估的上万维稀疏 ID）上，欧几里得距离失效，SMOTE 插值往往制造出荒谬无意义的特征组合；
3. 容易在两类交叠处引入噪声样本。
**算法级代价敏感学习（Cost-Sensitive Learning）在数学上更优雅、计算上无任何额外开销**：
- 它直接修改模型的损失函数，让模型在漏判少数样本时承受成倍的重罚；
- **Focal Loss（焦点损失）** 是目标检测和大模型高不平衡分类的核武器：它动态压制数以百万计的“太容易分类的简单负样本”，将全模型的反向传播梯度百分之百集中在“最硬骨头的稀有正样本”上！

### 直觉理解
- **学生复习中的做题时间动态分配（Focal Loss）**：
  - 普通交叉熵损失：学生把卷子上所有题目从头到尾做一遍，哪怕是 1+1=2 这样已经做对 1000 次、掌握概率高达 99.9% 的弱智题，做一次依然耗费相同的精力和分数（产生不小的累计梯度），最后成千上万道简单题霸占了 99% 的复习时间；
  - **Focal Loss 机制**：给题目加上一个“厌倦调节阀 $(1-p)^\gamma$”。如果一道题学生掌握度已经达到 99%（$p=0.99$），厌倦阀算出的难度权重只有 $(1-0.99)^2 = 0.0001$，精力消耗直接砍掉一万倍，忽略不计！只有当遇到掌握度只有 10% 的极难稀有错题时，调节阀权重达到 $(1-0.1)^2 = 0.81$！全部火力倾泻在突破真正困难的稀有样本上！

### 核心概念与符号对照表
| 损失函数 | 数学表达式 | 核心思想 | 工业核心优势 |
| --- | --- | --- | --- |
| **标准交叉熵 (CE)** | $-\\log(p_t)$ | 所有样本一视同仁，累加误差 | 易被占 99% 的简单背景样本梯度淹没 |
| **类别加权交叉熵** | $-\\alpha_t \\log(p_t)$ | 按类别的静态全局样本比例赋予固定倍数权重 | 解决了类间不平衡，但无法区分样本难度差异 |
| **Focal Loss (FL)** | $-\\alpha_t (1 - p_t)^\\gamma \\log(p_t)$ | **类别加权 + 难易动态聚焦衰减** | 彻底降维打击海量简单负样本，主攻硬样本 |

### 数学原理与逐步推导
#### 1. 平衡类别权重 $w_c$ 的严密数学推导
为了让各类别的加权总损失在期望意义下完全平等，设类别 $c$ 包含 $N_c$ 个样本，总样本数 $N = \\sum_{c=1}^K N_c$。
若不加权，类别 $c$ 在总损失中所占权重为 $\\frac{N_c}{N}$。
我们希望给类别 $c$ 赋予权重 $w_c$，使得加权后每个类别的有效样本总权重相等，且保持全样本总权重和不变：
$$\\sum_{i \\in c} w_c = N_c \\cdot w_c = \\frac{N}{K} \\implies w_c = \\frac{N}{K \\cdot N_c}$$
这就是 Scikit-Learn `compute_class_weight('balanced')` 的底层公式。
例如正类占 1%（$N_1 = 10$），负类占 99%（$N_0 = 990$），总数 $N=1000$，$K=2$：
- 负类权重 $w_0 = \\frac{1000}{2 \\times 990} \\approx 0.505$；
- 正类权重 $w_1 = \\frac{1000}{2 \\times 10} = 50.0$！每个正样本的梯度被瞬间放大近 100 倍！

#### 2. Focal Loss 的数学定义与梯度衰减推导
定义预测目标概率 $p_t$：
$$p_t = \\begin{cases} p, & \\text{若 } y = 1 \\\\ 1 - p, & \\text{若 } y = 0 \\end{cases}$$
其中 $p \in (0, 1)$ 为模型预测的阳性概率。标准交叉熵可简洁写为 $\text{CE}(p_t) = -\log(p_t)$。
何恺明等人在损失前乘上调制系数 $(1 - p_t)^\gamma$（其中聚焦参数 $\gamma \ge 0$），得到 **Focal Loss**：
$$\text{FL}(p_t) = -(1 - p_t)^\gamma \log(p_t)$$
考察损失对 logits 打分 $z$（满足 $p = \sigma(z)$）的梯度导数：
$$\frac{\partial \text{FL}}{\partial z} = (1 - p_t)^\gamma (p_t - 1) + \gamma (1 - p_t)^{\gamma-1} p_t (1 - p_t) \log(p_t)$$
- 当样本极易分类（$p_t = 0.99$）时，调制因子 $(1 - p_t)^2 = (0.01)^2 = 10^{-4}$，其反向传播的梯度被衰减了 **1 万倍**！
- 当样本较难分类（$p_t = 0.5$）时，调制因子 $(1 - 0.5)^2 = 0.25$，梯度仅衰减 4 倍。
**重大数学物理结论**：Focal Loss 让海量容易分类的多数类样本在反向传播中“集体隐形”，让极少数艰难的正类样本主导模型参数的演进方向！

### 真实代码示例与分析
下面展示对比普通交叉熵损失与 Focal Loss 在不同置信度下的损失值对比："""

    l2_code = """import numpy as np

def binary_focal_loss(y_true: np.ndarray, y_prob: np.ndarray, gamma: float = 2.0, alpha: float = 0.25) -> np.ndarray:
    \"\"\"计算每个样本的 Focal Loss 损失值\"\"\"
    # 截断防对数溢出
    eps = 1e-12
    y_prob = np.clip(y_prob, eps, 1.0 - eps)
    
    # 计算 p_t
    p_t = np.where(y_true == 1, y_prob, 1.0 - y_prob)
    alpha_t = np.where(y_true == 1, alpha, 1.0 - alpha)
    
    # Focal Loss 公式
    fl = -alpha_t * ((1.0 - p_t) ** gamma) * np.log(p_t)
    return fl

# 模拟 3 个不同难度的样本 (真实标签均为正类 y=1)
# 样本 A: 极其简单已完全掌握 (p=0.99)
# 样本 B: 模棱两可处于边界 (p=0.50)
# 样本 C: 极其困难被严重误判 (p=0.01)
y_sim = np.array([1, 1, 1])
p_sim = np.array([0.99, 0.50, 0.01])

# 1. 普通交叉熵损失 (gamma=0, alpha=1)
ce_loss = binary_focal_loss(y_sim, p_sim, gamma=0.0, alpha=1.0)
# 2. Focal Loss (gamma=2.0, alpha=1.0)
fl_loss = binary_focal_loss(y_sim, p_sim, gamma=2.0, alpha=1.0)

print("=== 损失值响应对比 (揭秘 Focal Loss 压制机理) ===")
for name, p, ce, fl in zip(['A (极易样本 p=0.99)', 'B (边界样本 p=0.50)', 'C (极难样本 p=0.01)'], p_sim, ce_loss, fl_loss):
    suppression_ratio = ce / max(fl, 1e-12)
    print(f"[{name}]:")
    print(f"  普通交叉熵 CE 损失: {ce:.6f}")
    print(f"  Focal Loss (γ=2) 损失: {fl:.6f}")
    print(f"  相对衰减抑制倍数: {suppression_ratio:.1f}x 倍！")
"""

    l2_tips = [
        tip("在极度不平衡表格分类中，使用 LightGBM 或 XGBoost 时，优先调节原生超参数 scale_pos_weight = (负样本数 / 正样本数)。该参数直接在二阶泰勒展开的目标函数中放大正样本的一阶与二阶梯度，无需繁琐重采样即可大幅拉高稀有类召回率。", "performance"),
    ]

    lessons = [
        lesson("ml-eng-l3-1", "重采样技术：过采样、欠采样与合成样本", l1_content, 2, l1_tips, [demo(code=l1_code, title="从零实现 SMOTE 少数类特征空间近邻插值")]),
        lesson("ml-eng-l3-2", "算法级代价敏感学习与 Focal Loss", l2_content, 3, l2_tips, [demo(code=l2_code, title="Focal Loss 动态衰减易分负样本梯度对比")]),
    ]

    exercises = [
        single_choice(
            ex_id="ml-eng-c3-ex1",
            question="相较于简单的随机过采样（Random Over-sampling），SMOTE（合成少数类过采样技术）的核心机制是什么？为什么它能有效降低模型过拟合风险？",
            options=[
                {"value": "A", "text": "在特征空间中，沿着少数类样本与其同类近邻点之间的连线进行连续随机凸组合插值合成新样本，拓宽了少数类的决策边界流形"},
                {"value": "B", "text": "在特征空间中加入纯高斯随机白噪声"},
                {"value": "C", "text": "直接丢弃多数类中距离最远的样本"},
                {"value": "D", "text": "通过对多数类样本进行特征聚类合并"},
            ],
            answer="A",
            explanation="随机过采样仅仅是死板地重复抽取已有样本，导致模型在相同样本点上过度拟合出狭窄的决策孤岛。SMOTE 在少数类样本与其近邻构成的线段上进行随机凸组合插值，构造出符合局部流形的新合成点，显著增强了泛化性。",
            difficulty=2,
            related_lesson_id="ml-eng-l3-1",
            tags=["SMOTE", "重采样", "不平衡学习"],
        ),
        judge(
            ex_id="ml-eng-c3-ex2",
            question="在进行 5 折交叉验证时，为了让评估过程更具代表性，应该先对整个全量数据集运行 SMOTE 重采样使得正负样本比例达到 1:1，然后再将平衡后的数据切分为 5 折进行交叉验证训练与打分。",
            answer=False,
            explanation="严重错误！这是极度隐蔽且致命的数据泄漏。如果先对全量数据做 SMOTE，合成样本会把本该保留在验证集中的信息插值混合到训练集中，导致验证集在评估时遇到自己的‘血缘双胞胎’，产生虚假的高召回率。重采样操作必须且只能在每一个训练折内部独立进行，验证折必须严格保持原始真实分布！",
            difficulty=2,
            related_lesson_id="ml-eng-l3-1",
            tags=["SMOTE", "数据泄漏", "交叉验证铁律"],
        ),
        multiple_choice(
            ex_id="ml-eng-c3-ex3",
            question="在工业机器学习中，应对样本极度不平衡（如欺诈检测 1:1000）的算法级（Cost-Sensitive / Loss）策略包括哪些？",
            options=[
                {"value": "A", "text": "在损失函数中配置 `class_weight='balanced'`，按样本比例反比放大稀有类的损失梯度"},
                {"value": "B", "text": "在提升树（XGBoost/LightGBM）中设置 `scale_pos_weight` 放大正样本梯度"},
                {"value": "C", "text": "采用 Focal Loss，通过引入调制因子 $(1 - p_t)^\\gamma$ 极力压制海量简单负样本的无效梯度贡献"},
                {"value": "D", "text": "无脑将预测判定阈值固定死在 0.5 处不做任何变动"},
            ],
            answer=["A", "B", "C"],
            explanation="选项 A、B、C 均为成熟高效的算法级与损失函数级应对方案。选项 D 硬套 0.5 默认阈值不仅不能解决不平衡，反而是导致漏放严重的罪魁祸首。",
            difficulty=2,
            related_lesson_id="ml-eng-l3-2",
            tags=["代价敏感学习", "Focal Loss", "scale_pos_weight", "不平衡建模"],
        ),
        fill(
            ex_id="ml-eng-c3-ex4",
            question="某二分类数据集中共有 1000 个样本，其中负类有 900 个，正类仅有 100 个。根据 Scikit-Learn 的 `class_weight='balanced'` 平衡权重公式 $w_c = \\frac{N}{K \\cdot N_c}$（其中类别数 $K=2$），正类样本被赋予的损失惩罚权重 $w_{\\text{pos}}$ 精确为 ___（请填写整数）。",
            blanks=[["5"]],
            explanation="总样本 N=1000，类别数 K=2，正类样本数 N_pos=100。w_pos = 1000 / (2 * 100) = 1000 / 200 = 5。负类权重为 1000 / (2 * 900) = 5/9 ≈ 0.556。",
            difficulty=2,
            related_lesson_id="ml-eng-l3-2",
            tags=["class_weight", "平衡权重", "数值计算"],
        ),
        open_ex(
            ex_id="ml-eng-c3-ex5",
            question="请详细推导并解释 Focal Loss 损失公式 $\\text{FL}(p_t) = -\\alpha_t (1 - p_t)^\\gamma \\log(p_t)$ 中的调制因子 $(1 - p_t)^\\gamma$（$\\gamma > 0$）是如何在反向传播中自适应抑制‘海量简单易分样本’对梯度主导的，并解释其在解决极端前景/背景不平衡中的核心机理。",
            reference_answer="1. 调制因子的动态抑制机理：\n在二分类中，p_t 衡量的是模型对样本真实类别的置信度。对于容易分类的样本（例如背景负样本，真实标签 y=0，模型预测 p=0.01，此时 p_t = 0.99），普通交叉熵损失 -log(0.99) 虽然很小（约 0.01），但在千万级的海量负样本累加下，其微小的损失和依然会汇聚成毁灭性的庞大梯度洪流，完全淹没少数正类样本。\n当引入调制因子 (1 - p_t)^gamma（以 gamma=2 为例）时：\n- 对于易分样本（p_t = 0.99），调制因子为 (1 - 0.99)^2 = 0.0001，直接将该样本的损失与梯度断崖式压缩了 10,000 倍！这使得成千上万个简单负样本在反向传播中的有效累积梯度几乎趋近于 0；\n- 对于难分样本（例如被严重误判的稀有正样本，p_t = 0.1），调制因子为 (1 - 0.1)^2 = 0.81，损失与梯度几乎完全保留（仅轻微衰减 1.2 倍）。\n2. 核心机理总结：\n调制因子在不改变样本真实物理标签的前提下，实现了一种全自动、动态连续的‘难易样本梯度重分配机制’，彻底化解了多数类由于绝对数量庞大而在梯度空间建立的‘暴政’，迫使优化器将有限的参数更新容量全力用于攻关困难的稀有类别。",
            explanation="推导 p_t 在易分与难分样本下的不同取值，定量计算调制因子对梯度的压缩倍数，揭示反向传播梯度的动态重平衡本质。",
            rubric=[
                {"points": 5, "description": "阐述普通交叉熵下易分样本由于数量巨大累积产生压倒性梯度的弊端"},
                {"points": 5, "description": "定量分析 (1-p_t)^gamma 动态调节项在 p_t 接近 1 时对梯度的指数级衰减抑制机理"},
            ],
            difficulty=3,
            related_lesson_id="ml-eng-l3-2",
            tags=["Focal Loss", "调制因子", "梯度抑制", "难易样本加权"],
        ),
        # ── Code Exercise 3 ──
        {
            "id": "ml-eng-c3-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】从零实现二分类平衡样本权重计算器：\n编写函数 `calculate_balanced_class_weights(y)`：\n接收一维二分类标签列表或数组 `y`（包含 0 和 1）。\n根据 Scikit-Learn 官方平衡权重公式：\n$$w_c = \\frac{N}{K \\cdot N_c}$$\n其中 $N$ 为总样本数，$K$ 为唯一类别数量（此处 $K=2$），$N_c$ 为类别 $c$ 的样本数量。\n函数返回一个字典 `dict`，键为整数类别 0 和 1，值为对应计算出的平衡权重浮点数（使用 `round(w, 4)` 保留 4 位小数）。\n\n最后一行请以 `y_demo = [0, 0, 0, 0, 1]` 调用该函数测试。",
            "starterCode": "from typing import Dict, List\nimport numpy as np\n\ndef calculate_balanced_class_weights(y: List[int]) -> Dict[int, float]:\n    \"\"\"从零计算二分类数据集的 balanced 平衡类别权重\"\"\"\n    # 请在此实现\n    ___\n\ny_demo = [0, 0, 0, 0, 1]\ncalculate_balanced_class_weights(y_demo)\n",
            "setupCode": "",
            "expectedOutput": "{0: 0.625, 1: 2.5}",
            "answer": "from typing import Dict, List\nimport numpy as np\n\ndef calculate_balanced_class_weights(y: List[int]) -> Dict[int, float]:\n    y = np.array(y, dtype=int)\n    n = len(y)\n    classes = np.unique(y)\n    k = len(classes)\n    \n    weights = {}\n    for c in classes:\n        n_c = np.sum(y == c)\n        w = n / (k * n_c)\n        weights[int(c)] = round(float(w), 4)\n        \n    return weights\n\ny_demo = [0, 0, 0, 0, 1]\ncalculate_balanced_class_weights(y_demo)\n",
            "tests": "y_t = [0, 1]\nres = calculate_balanced_class_weights(y_t)\nassert res == {0: 1.0, 1: 1.0}, f\"测试不匹配: {res}\"\n",
            "explanation": "统计总样本数 N 与各类别频数 N_c，按照公式 N / (K * N_c) 计算权重并四舍五入返回字典。",
            "tags": ["class_weight", "样本不平衡", "算法实战", "权重计算"],
            "related_lesson_id": "ml-eng-l3-2",
        },
        single_choice(
            ex_id="ml-eng-c3-ex7",
            question="相较于在少数类全集上盲目进行插值的标准 SMOTE，**Borderline-SMOTE** 算法引入了‘危险区域（DANGER）’的判定。其只对符合下列哪种条件的少数类样本进行插值合成？",
            options=[
                {"value": "A", "text": "在其 $m$ 个近邻中，多数类邻居的数量占到一半以上但未达到全部（即 $m/2 \\le \\text{多数类邻居} < m$），表明该样本处于两类交界分类决策边界的险要地带"},
                {"value": "B", "text": "其所有近邻全都是少数类的最核心深处样本"},
                {"value": "C", "text": "其所有近邻全都是多数类的完全孤立噪声样本"},
                {"value": "D", "text": "离所有多数类样本欧氏距离最遥远的样本"},
            ],
            answer="A",
            explanation="Borderline-SMOTE 将少数样本分为三类：全部是同类则为 SAFE（安全无需插值）；全部是异类则为 NOISE（噪声避免插值）；若多数类邻居占一半以上但未全满，判定为 DANGER（危险边界）。只对 DANGER 样本做插值能精准强化分类器的判决边界能力。",
            difficulty=2,
            related_lesson_id="ml-eng-l3-1",
            tags=["Borderline-SMOTE", "危险样本", "重采样进阶"],
        ),
    ]

    return chapter(
        chapter_id="ml-eng-c3",
        course_id="ml-engineering",
        order=3,
        title="不平衡数据分布与稀有事件建模",
        goal="掌握 SMOTE 凸组合插值与交叉验证防泄漏铁律，掌握平衡权重数学推导，精通 Focal Loss 动态梯度聚焦机理。",
        lessons=lessons,
        exercises=exercises,
    )
