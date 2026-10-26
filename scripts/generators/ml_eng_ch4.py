# -*- coding: utf-8 -*-
"""
Chapter 4: 超参数寻优与模型可解释性归因 (Hyperparameter Tuning & Explainable AI / XAI)
Course: ml-engineering
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_4():
    # ── Lesson 4.1 ──
    l1_content = """### 学习目标
学完本节，你应该能够：
1. 理解超参数优化（Hyperparameter Optimization, HPO）的目标函数黑盒特性与调优挑战；
2. 深刻辨析网格搜索（Grid Search）、随机搜索（Random Search）与贝叶斯优化（Bayesian Optimization）的采样效率差异；
3. 掌握基于树状帕曾估计器（Tree-structured Parzen Estimator, TPE, Bergstra et al. 2011）的概率建模机制与期望改善（Expected Improvement, EI）准则；
4. 熟练掌握现代工业级自动化调参利器 **Optuna** 的核心设计：Objective 函数、参数建议空间与高效采样器（TPESampler）；
5. 掌握基于中间验证表现的自动早停剪枝机制（Pruning / MedianPruner），将算力开销缩减 3 至 5 倍；
6. 编写代码使用 Optuna 优化 LightGBM/GBDT 的超参数，并输出最佳参数组合与试验收敛历史。

### 前置知识
- 交叉验证评估（StratifiedKFold）；
- 条件概率密度估计（Kernel Density Estimation）。

### 问题背景与 ML 用途
现代提升树（LightGBM、XGBoost）和深度学习模型拥有几十个可调超参数（学习率、树深度、叶子数、L1/L2 正则、采样率等）。
初学者往往依赖“盲目试凑”或极其原始的“网格搜索（GridSearchCV）”：
- 如果对 6 个超参数各选 5 个候选值，网格组合总数高达 $5^6 = 15,625$ 次模型训练！若做 5 折交叉验证，需要训练近 8 万棵树，算力直接破产；
- 工业界必须使用**贝叶斯优化（Bayesian Optimization）**：利用历史试验的成败反馈，建立高斯过程或 TPE 概率代理模型，优先在“最有可能刷新最佳指标”的未知参数区域下注！
Optuna 凭借其灵活的 Python 动态定义搜索空间（Define-by-Run）和激进的自动化中间剪枝，已经全面统治了现代机器学习竞赛与工业界的自动化调参流水线。

### 直觉理解
- **盲目地毯式搜救 vs 智能搜救犬（HPO 演化）**：
  - **网格搜索**：在整片大森林里画一张精细的棋盘方格，不管山洪暴发还是悬崖峭壁，机械地在每一个格子点上都派一队搜救员（绝大部分格子都在完全错误的区域浪费生命）；
  - **随机搜索**：像空投伞兵一样在森林里随机降落。由于很多超参数其实并不敏感，随机采样在关键超参数上的投影覆盖度远胜死板网格；
  - **贝叶斯优化（Optuna / TPE）**：训练一只绝顶聪明的搜救犬。前几次探路后，搜救犬根据气味浓淡建立了一张概率地图（好参数分布 $\ell(x)$ vs 坏参数分布 $g(x)$）。下一批搜救员只派往“气味最浓烈、且之前探索较少”的高价值区域！如果搜救队走到一半发现路况不对（剪枝 Pruning），立刻叫停返回，绝不浪费时间！

### 核心概念与符号对照表
| 搜索策略 | 算法 / 工具 | 采样复杂度与机制 | 优缺点对比 |
| --- | --- | --- | --- |
| **网格搜索** | `GridSearchCV` | 笛卡尔积穷举所有预设离散网格组合 | 指数级组合爆炸，完全没有历史反馈记忆 |
| **随机搜索** | `RandomizedSearchCV` | 从连续或离散分布中独立均匀随机采样 | 简单高效，高维投影覆盖度好；但依然是无记忆盲猜 |
| **TPE 贝叶斯优化** | `optuna.samplers.TPESampler` | 历史结果按百分位切分为优秀组 $\ell(x)$ 与平庸组 $g(x)$ | **以极少试验次数快速逼近全局最优**，兼顾探索与利用 |
| **自动早停剪枝** | `optuna.pruners.MedianPruner` | 训练中期若当前指标落后于历史中位数，直接掐断该次试验 | 极大节省无谓的算力与时间开销 |

### 数学原理与逐步推导
#### TPE 树状帕曾估计器的期望改善（Expected Improvement）推导
设超参数为 $\mathbf{x}$，模型验证损失为 $y = f(\mathbf{x})$。我们要极小化损失。
设定一个损失阈值 $y^*$（通常为历史已完成试验损失的前 $\gamma$ 分位数，如最优的 15%）。
TPE 不直接对目标函数 $p(y \mid \mathbf{x})$ 建模，而是极其精妙地对超参数在不同表现下的条件分布建模：
$$p(\mathbf{x} \mid y) = \begin{cases} \ell(\mathbf{x}), & \text{若 } y < y^* \quad (\text{表现优秀组}) \\ g(\mathbf{x}), & \text{若 } y \ge y^* \quad (\text{表现平庸组}) \end{cases}$$
其中 $\ell(\mathbf{x})$ 和 $g(\mathbf{x})$ 分别由优秀试验点和平庸试验点通过高斯核密度估计（KDE）构建。
根据贝叶斯定理，预期改善（Expected Improvement, EI）定义为新损失低于当前阈值的期望值：
$$\text{EI}_{y^*}(\mathbf{x}) = \int_{-\infty}^{y^*} (y^* - y) p(y \mid \mathbf{x}) dy = \frac{\int_{-\infty}^{y^*} (y^* - y) p(\mathbf{x} \mid y) p(y) dy}{p(\mathbf{x})}$$
经数学变换可化简为正比于两类分布密度的比值：
$$\text{EI}_{y^*}(\mathbf{x}) \propto \frac{\ell(\mathbf{x})}{g(\mathbf{x})}$$
**重大数学直觉**：
为了最大化改善概率，TPE 只需要寻找能够让 **$\\frac{\\ell(\\mathbf{x})}{g(\\mathbf{x})}$ 达到最大**的超参数 $\\mathbf{x}$！
即：**在优秀试验区出现概率极高（$\\ell(\\mathbf{x})$ 很大）、且在糟糕试验区出现概率极低（$g(\\mathbf{x})$ 很小）的超参数区域进行密集下注**！

### 真实代码示例与分析
下面展示使用 Scikit-learn 的 `HistGradientBoostingClassifier`，结合纯 Python 模拟的随机搜索与 Optuna 原语进行调参："""

    l1_code = """import numpy as np
from sklearn.datasets import make_classification
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import cross_val_score, StratifiedKFold

# 1. 构造一个包含非线性复杂特征的数据集
X, y = make_classification(n_samples=1000, n_features=20, random_state=42)
cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)

# 2. 模拟自动化超参数优化搜索 (探索学习率、最大叶子数与 L2 正则)
def objective(lr: float, max_leaf: int, l2_reg: float) -> float:
    clf = HistGradientBoostingClassifier(
        learning_rate=lr, max_leaf_nodes=max_leaf,
        l2_regularization=l2_reg, random_state=42
    )
    scores = cross_val_score(clf, X, y, cv=cv, scoring='accuracy')
    return float(scores.mean())

# 运行 10 轮启发式试验
best_score = 0.0
best_params = {}

np.random.seed(42)
for trial_id in range(1, 11):
    # 模拟 Optuna suggest 建议空间
    trial_lr = float(np.exp(np.random.uniform(np.log(0.01), np.log(0.3))))
    trial_leaf = int(np.random.randint(15, 64))
    trial_l2 = float(np.exp(np.random.uniform(np.log(1e-3), np.log(10.0))))
    
    score = objective(trial_lr, trial_leaf, trial_l2)
    if score > best_score:
        best_score = score
        best_params = {'lr': trial_lr, 'max_leaf': trial_leaf, 'l2': trial_l2}
        print(f"[Trial {trial_id:2d}] 刷新最佳验证准确率: {best_score:.4f} | 参数: {best_params}")

print("\\n=== 自动化超参优化完成 ===")
print(f"全局最优准确率: {best_score:.4f}")
print(f"最佳超参数组合: lr={best_params['lr']:.4f}, max_leaf={best_params['max_leaf']}, l2={best_params['l2']:.4f}")
"""

    l1_tips = [
        tip("调优连续参数（如 learning_rate、l2_reg）时，切忌在线性尺度均分（如 0.001 到 1.0 的等差数列）！必须使用对数均匀分布（log=True / loguniform），因为 0.001 到 0.01 的量级跨度与 0.1 到 1.0 对模型的学习影响同样巨大！", "performance"),
    ]

    # ── Lesson 4.2 ──
    l2_content = """### 学习目标
学完本节，你应该能够：
1. 理解可解释机器学习（Explainable AI, XAI）在金融风控合规（如拒贷归因告知函）与高危医疗中的刚性法理诉求；
2. 深刻辨析传统特征重要性 MDI（基尼不纯度减少）在连续特征与高基数类别上的严重系统性偏差；
3. 掌握置换特征重要性（Permutation Feature Importance, PFI）基于测试集打乱的无偏外推评估；
4. 严格推导合作博弈论中的**沙普利值（Shapley Values, 诺贝尔经济学奖得主 Lloyd Shapley）**数学公式；
5. 掌握沙普利值的四大不可替代黄金公理：效率性（Efficiency）、对称性（Symmetry）、虚拟性（Dummy）与可加性（Additivity）；
6. 掌握 Lundberg & Lee 的 **SHAP（SHapley Additive exPlanations）** 统一解释框架，编写代码解析单客户决策瀑布图（Waterfall Plot）与特征边际效应。

### 前置知识
- 合作博弈论联盟收益函数；
- 全排列组合与边际贡献期望。

### 问题背景与 ML 用途
过去，业界将复杂集成树（XGBoost/LightGBM）和神经网络统称为“不可解释的黑盒模型”。
但在现实商业与法律合规场景中，黑盒模型面临着严峻的法律红线：
- **《欧盟人工智能法案》与个人信息保护法**：当银行风控系统自动拒绝一个用户的房贷申请时，法律明确规定金融机构**必须提供可解释的法定拒贷理由（Adverse Action Notice）**：“由于您过去 6 个月信用卡透支次数达到 8 次（贡献 -35 分），且近 3 个月征信查询过频（贡献 -20 分），导致综合评分未达准入线”；
- 传统的特征重要性只能告诉你“哪个特征全局最重要”，根本无法回答“**对于张三这个具体客户，为什么模型给他打了 0.92 的高违约概率？**”
**SHAP 建立了现代可解释 AI 的黄金法理标准**：它将模型预测的最终打分，严丝合缝、毫无遗漏地拆解分配给每一个输入特征！

### 直觉理解
- **足球队夺冠后的奖金公道分配（Shapley 值）**：
  - 一支足球队打赢了决赛，赢得了 100 万元总奖金。现在要给主力前锋梅西发个人奖金，发多少才最公平、让全队所有人毫无怨言？
  - 如果只看他一个人，或者只看他和门将两个人，都不全面。
  - **Shapley 值的终极公平哲学**：列出这支球队可能的所有上场球员子联盟（共 $2^{11}$ 种组合）。对于每一种可能的子联盟组合，考察“**梅西上场 vs 梅西不上场，球队赢球概率的边际净提升差额**”！把梅西在所有可能联盟里的边际贡献按组合概率加权平均，算出来的那个唯一数值，就是梅西无可辩驳的绝对真实身价贡献！

### 核心概念与符号对照表
| 可解释性工具 | 级别 | 核心数学机制 | 缺陷 / 优势 |
| --- | --- | --- | --- |
| **MDI (树不纯度减少)** | 全局 | 统计该特征在所有树的所有节点分裂带来的 Gini/MSE 净下降和 | **严重偏倚**：极端偏好高基数类别和连续噪声特征 |
| **PFI (置换重要性)** | 全局 | 在测试集上随机打乱该列，计算评估指标（如 AUC）的净下降量 | **无偏真实**；但若特征间强相关，置换会产生反物理的荒谬样本 |
| **SHAP (沙普利值)** | **局部 + 全局** | 基于博弈论边际贡献公理，将预测值拆解为各特征的代数和 | **唯一满足博弈论四大公理的解释体系**，局部全局兼备 |

### 数学原理与逐步推导
#### 1. 沙普利值（Shapley Value）严密数学公式
设全体特征集合为 $N = \{1, 2, \dots, d\}$。对于任意特征子集 $S \subseteq N \setminus \{i\}$，$v(S)$ 表示仅使用子集 $S$ 中的特征时模型的预期预测值。
特征 $i$ 对模型预测的沙普利贡献值 $\phi_i$ 定义为：
$$\phi_i = \sum_{S \subseteq N \setminus \{i\}} \frac{|S|! (|N| - |S| - 1)!}{|N|!} \left[ v(S \cup \{i\}) - v(S) \right]$$
其中加权系数 $\frac{|S|! (|N| - |S| - 1)!}{|N|!}$ 代表在特征全排列中，子集 $S$ 恰好排在特征 $i$ 之前的排列概率。

#### 2. 沙普利值的四大黄金公理（证明其唯一最优性）
Shapley (1953) 证明了：**沙普利值是满足以下四项公理的唯一分配方案**：
1. **效率性公理（Efficiency）**：
   所有特征的沙普利值之和，加上模型在空特征集上的基线期望输出 $\phi_0$，**严格精确等于模型对当前样本的具体预测输出 $f(\mathbf{x})$**：
   $$f(\mathbf{x}) = \phi_0 + \sum_{i=1}^d \phi_i, \quad \text{其中 } \phi_0 = \mathbb{E}[f(X)]$$
   （没有任何多余的误差项，每一分概率都被追根溯源精确归因！）
2. **对称性公理（Symmetry）**：若两个特征在所有子联盟中的边际贡献恒等，则它们的沙普利值必然完全相等：$\phi_i = \phi_j$；
3. **虚拟性公理（Dummy）**：若特征 $i$ 加入任何联盟都不改变预测输出，则其沙普利值严格为 0：$\phi_i = 0$；
4. **可加性公理（Additivity）**：若模型是两个子模型的集成 $f = f_1 + f_2$，则特征贡献为各自贡献之和：$\phi_i(f) = \phi_i(f_1) + \phi_i(f_2)$。

### 真实代码示例与分析
下面展示从零计算一个 3 特征合作博弈联盟的精确 Shapley 归因值，并验证效率性公理："""

    l2_code = """import numpy as np
from itertools import permutations

def compute_exact_shapley(v_func, n_players: int, instance_features: list) -> list:
    \"\"\"从零根据博弈论全排列边际贡献推导严格精确的 Shapley 沙普利值\"\"\"
    all_players = list(range(n_players))
    shapley_values = np.zeros(n_players)
    all_perms = list(permutations(all_players))
    n_perms = len(all_perms)
    
    # 对每一种排列遍历
    for perm in all_perms:
        current_subset = []
        val_before = v_func(current_subset)
        
        for player in perm:
            current_subset_with_player = current_subset + [player]
            val_after = v_func(current_subset_with_player)
            # 边际贡献
            marginal_contrib = val_after - val_before
            shapley_values[player] += marginal_contrib
            
            # 更新为下一个玩家的前置联盟
            current_subset = current_subset_with_player
            val_before = val_after
            
    # 平均得到 Shapley 值
    return (shapley_values / n_perms).tolist()

# 定义一个模拟风控信用评分函数 v(S)
# 基线分 (空集) = 600 分
# 特征 0 (月收入高): 边际增益极大
# 特征 1 (有房产): 边际增益大
# 特征 2 (有过逾期): 边际扣分重
def credit_score_model(subset):
    score = 600.0  # 基线期望分 phi_0
    if 0 in subset: score += 120.0
    if 1 in subset: score += 80.0
    if 2 in subset: score -= 150.0
    # 特征交叉协作效应: 收入高且有房产额外奖励 50 分
    if (0 in subset) and (1 in subset): score += 50.0
    return score

# 计算各个特征对该客户的绝对 Shapley 贡献值
phi_0 = credit_score_model([])
shap_vals = compute_exact_shapley(credit_score_model, n_players=3, instance_features=[0, 1, 2])
target_pred = credit_score_model([0, 1, 2])

print(f"客户基线均值期望分 phi_0: {phi_0:.1f} 分")
print(f"特征 0 [高收入]   SHAP 贡献: +{shap_vals[0]:.2f} 分")
print(f"特征 1 [有房产]   SHAP 贡献: +{shap_vals[1]:.2f} 分")
print(f"特征 2 [曾有逾期] SHAP 贡献: {shap_vals[2]:.2f} 分")
print(f"全特征模型最终预测分: {target_pred:.1f} 分")
print(f"效率性公理验证: phi_0 + sum(phi_i) = {phi_0 + sum(shap_vals):.1f} 分 (完全 100% 严丝合缝闭环!)")
"""

    l2_tips = [
        tip("在向业务方或法务部门汇报特征重要性时，千万不要使用模型自带的 feature_importances_（基于 MDI）。MDI 会将特征分割次数多的高基数噪声列误判为重要特征！必须统一采用基于 SHAP 绝对均值（mean(|SHAP value|)）的全局重要性指标。", "pitfall"),
    ]

    lessons = [
        lesson("ml-eng-l4-1", "自动化超参数优化：网格、随机与 Optuna 贝叶斯优化", l1_content, 2, l1_tips, [demo(code=l1_code, title="启发式超参数搜索与验证集收敛跟踪")]),
        lesson("ml-eng-l4-2", "模型可解释性：PFI、局部归因与 SHAP 沙普利值", l2_content, 3, l2_tips, [demo(code=l2_code, title="从零实现合作博弈论全排列 Shapley 归因")]),
    ]

    exercises = [
        single_choice(
            ex_id="ml-eng-c4-ex1",
            question="Optuna 默认采用的 TPE（Tree-structured Parzen Estimator）贝叶斯优化算法，是通过下列哪项核心概率建模机制来决定下一个超参数采样点的？",
            options=[
                {"value": "A", "text": "将历史试验样本分为优秀组与平庸组，分别构建概率密度分布 $\\ell(x)$ 与 $g(x)$，并在比值 $\\ell(x)/g(x)$ 最大的区域优先采样"},
                {"value": "B", "text": "仅在所有已知最佳参数的正负 1% 微小范围内做网格步进"},
                {"value": "C", "text": "使用深度强化学习 Q-Learning 拟合超参数收益网络"},
                {"value": "D", "text": "完全抛弃所有历史试验结果，保持无偏均匀随机抽样"},
            ],
            answer="A",
            explanation="TPE 将历史结果按损失分位数分为表现优良组 l(x) 和表现平庸组 g(x)。根据期望改善 EI 公式推导，EI(x) 正比于 l(x)/g(x)。因此 TPE 在优秀区高频出现且在糟糕区极少出现的区域优先采样，实现高效的探索与利用平衡。",
            difficulty=2,
            related_lesson_id="ml-eng-l4-1",
            tags=["TPE", "Optuna", "贝叶斯优化", "超参数调优"],
        ),
        judge(
            ex_id="ml-eng-c4-ex2",
            question="置换特征重要性（Permutation Feature Importance, PFI）是在未参与拟合的独立测试集上，通过随机打乱某单一特征列的取值并观察评估指标的下降幅度来度量重要性，因此它比传统的 MDI（基尼不纯度减少）更加无偏且客观。",
            answer=True,
            explanation="正确。MDI 仅在训练集上统计特征分裂带来的不纯度减少，严重偏袒高基数特征且反映的是训练过拟合程度。PFI 在纯净测试集上通过洗牌该列评估泛化指标损失，真实反映了特征对测试集泛化预测的不可替代性。",
            difficulty=2,
            related_lesson_id="ml-eng-l4-2",
            tags=["PFI", "置换重要性", "特征重要性", "模型可解释性"],
        ),
        multiple_choice(
            ex_id="ml-eng-c4-ex3",
            question="合作博弈论中的沙普利值（Shapley Value）之所以被公认为特征归因归功的终极数学基石，是因为它是唯一能够同时满足下列哪些公平公理的分配机制？",
            options=[
                {"value": "A", "text": "效率性（Efficiency / 局部准确性）：各特征归因值之和加基线期望严格等于样本的预测值"},
                {"value": "B", "text": "对称性（Symmetry）：若两个特征在任何特征子集中带来的边际收益完全一致，则两者的归因贡献严格相等"},
                {"value": "C", "text": "虚拟性（Dummy）：如果一个特征加入任何子集都不改变预测结果，其贡献值严格为 0"},
                {"value": "D", "text": "可加性（Additivity）：多个模型集成预测时的特征贡献值等于各子模型贡献值的加权代数和"},
            ],
            answer=["A", "B", "C", "D"],
            explanation="Shapley (1953) 严格证明了效率性、对称性、虚拟性与可加性是定义唯一公平博弈分配的四大公理，这四条公理为现代 SHAP 模型解释体系奠定了坚不可摧的法理与数学基础。",
            difficulty=2,
            related_lesson_id="ml-eng-l4-2",
            tags=["Shapley值", "博弈论公理", "SHAP", "XAI"],
        ),
        fill(
            ex_id="ml-eng-c4-ex4",
            question="根据 SHAP 的效率性公理（Efficiency Property），对于任意给定样本 $\\mathbf{x}$，模型预测值 $f(\\mathbf{x})$ 可以精确分解为基线期望输出 $\\phi_0$ 与所有特征沙普利值 $\\phi_i$ 的代数___（请填写“和”或“积”）。",
            blanks=[["和"]],
            explanation="效率性公理公式为 f(x) = phi_0 + sum_{i=1}^d phi_i，即所有特征贡献值的代数和，不多不少精确重构出模型的最终预测输出。",
            difficulty=1,
            related_lesson_id="ml-eng-l4-2",
            tags=["SHAP", "效率性公理", "代数和"],
        ),
        open_ex(
            ex_id="ml-eng-c4-ex5",
            question="在金融信贷审批与反欺诈等强合规场景中，当一个借款申请被模型自动拒绝时，为什么法务合规部门要求必须提供基于 SHAP 的局部样本归因，而不能仅仅向用户提供随机森林或 GBDT 的全局特征重要性（MDI）？",
            reference_answer="1. 全局特征重要性（MDI）的致命局限：\nMDI 给出的是一个宏观维度的统计平均值（例如告诉你‘全行客户中，月收入这一列的重要性是 0.35，年龄是 0.12’）。这个全局数值对全行总体有效，但无法解释具体‘张三’为什么被拒贷。可能张三本人的月收入高达 10 万元（处于正向优势），但他被拒贷的真实原因是个人的近 1 个月征信被机构查询了 15 次。向张三展示全局重要性毫无针对性，无法满足法律监管关于‘不利行动具体原因告知（Adverse Action Notice）’的合规要求。\n2. SHAP 局部归因的法定可解释性优势：\n- 样本级因果透明：SHAP 基于博弈论效率性公理，针对张三这个具体的输入向量，精准解构出每一个特征的数值（例如月收入贡献 +25 分，征信查询贡献 -70 分，历史负债比贡献 -30 分）；\n- 严丝合缝的代数闭环：基线分 600 分加上各项特征正负贡献分，精确等同于最终打分 525 分，向借款人清晰说明了究竟是哪几项关键负面指标将其推下了及格线，完全满足了个人信息保护法与金融反歧视合规要求。",
            explanation="从全局宏观均值无法解释个体决策出发，结合法定拒贷告知函诉求，深入阐述 SHAP 样本级局部归因与代数可加性闭环的合规价值。",
            rubric=[
                {"points": 5, "description": "阐述全局 MDI 无法反映个体特定维度的具体正负贡献，无法满足法定拒贷告知要求"},
                {"points": 5, "description": "阐述 SHAP 局部归因如何通过个体精准正负打分与代数和闭环提供完全透明的决策解释"},
            ],
            difficulty=3,
            related_lesson_id="ml-eng-l4-2",
            tags=["SHAP", "模型可解释性", "金融合规", "拒贷告知"],
        ),
        # ── Code Exercise 4 ──
        {
            "id": "ml-eng-c4-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】从零实现单特征置换特征重要性（Permutation Importance）评估函数：\n编写函数 `calculate_feature_permutation_importance(model, X_val, y_val, feature_idx, metric_func, random_seed=42)`：\n1. `model`：已训练好的分类/回归预测器（具有 `predict(X)` 方法）；\n2. `X_val`：未参与训练的验证集特征 2D 数组（形状 $N \\times D$）；\n3. `y_val`：验证集真实标签 1D 数组（形状 $N$）；\n4. `feature_idx`：待评估的特征列索引整数；\n5. `metric_func`：评估函数，调用方式为 `metric_func(y_true, y_pred)`，返回值越高代表模型表现越优异；\n6. `random_seed`：打乱特征时的随机种子。\n\n步骤：\n- 计算模型在原始验证集上的基准指标得分 `baseline_score`；\n- 复制一份验证集副本，将指定的特征列通过随机排列（`np.random.permutation`）打乱破坏其与标签的对应关系；\n- 计算模型在打乱后数据上的退化指标得分 `permuted_score`；\n- 特征重要性定义为指标下降幅度：$\\text{importance} = \\text{baseline_score} - \\text{permuted_score}$。\n\n函数返回保留 4 位小数的浮点数 `round(float(importance), 4)`。\n\n最后一行请以简单决策树与模拟二分类数据调用测试。",
            "starterCode": "import numpy as np\nfrom sklearn.tree import DecisionTreeClassifier\nfrom sklearn.metrics import accuracy_score\n\ndef calculate_feature_permutation_importance(\n    model, X_val, y_val, feature_idx: int, metric_func, random_seed: int = 42\n) -> float:\n    \"\"\"从零计算指定单特征在验证集上的置换重要性 (指标下降量)\"\"\"\n    # 请在此实现\n    ___\n\n# 测试示例\nnp.random.seed(42)\nX_tr_d = np.array([[1.0, 0.0], [2.0, 0.0], [8.0, 0.0], [9.0, 0.0]])\ny_tr_d = np.array([0, 0, 1, 1])\ntree_demo = DecisionTreeClassifier(random_state=42).fit(X_tr_d, y_tr_d)\ncalculate_feature_permutation_importance(tree_demo, X_tr_d, y_tr_d, feature_idx=0, metric_func=accuracy_score)\n",
            "setupCode": "",
            "expectedOutput": "0.5",
            "answer": "import numpy as np\nfrom sklearn.tree import DecisionTreeClassifier\nfrom sklearn.metrics import accuracy_score\n\ndef calculate_feature_permutation_importance(\n    model, X_val, y_val, feature_idx: int, metric_func, random_seed: int = 42\n) -> float:\n    X_val = np.array(X_val, dtype=float)\n    y_val = np.array(y_val)\n    \n    # 1. 计算原始基准分数\n    base_preds = model.predict(X_val)\n    baseline_score = metric_func(y_val, base_preds)\n    \n    # 2. 复制并打乱指定特征列\n    X_permuted = X_val.copy()\n    rng = np.random.RandomState(random_seed)\n    perm_indices = rng.permutation(len(X_val))\n    X_permuted[:, feature_idx] = X_permuted[perm_indices, feature_idx]\n    \n    # 3. 计算退化后的表现\n    perm_preds = model.predict(X_permuted)\n    permuted_score = metric_func(y_val, perm_preds)\n    \n    importance = baseline_score - permuted_score\n    return round(float(importance), 4)\n\n# 测试示例\nnp.random.seed(42)\nX_tr_d = np.array([[1.0, 0.0], [2.0, 0.0], [8.0, 0.0], [9.0, 0.0]])\ny_tr_d = np.array([0, 0, 1, 1])\ntree_demo = DecisionTreeClassifier(random_state=42).fit(X_tr_d, y_tr_d)\ncalculate_feature_permutation_importance(tree_demo, X_tr_d, y_tr_d, feature_idx=0, metric_func=accuracy_score)\n",
            "tests": "clf_t = DecisionTreeClassifier(random_state=42).fit([[0], [10]], [0, 1])\nimp_t = calculate_feature_permutation_importance(clf_t, [[0], [10]], [0, 1], 0, accuracy_score, random_seed=0)\n# 原始准确率 1.0, 打乱后标签 0 与 1 对调, 准确率变 0.0, 下降 1.0\nassert imp_t == 1.0, f\"测试不匹配: {imp_t}\"\n",
            "explanation": "计算基准准确率，使用特定种子将指定特征列打乱打破信号联系，计算性能退化差额作为该特征真实贡献量度。",
            "tags": ["PFI", "置换特征重要性", "模型解释", "算法实战"],
            "related_lesson_id": "ml-eng-l4-2",
        },
        single_choice(
            ex_id="ml-eng-c4-ex7",
            question="在进行耗时庞大的深度模型或大树模型超参数搜索时，Optuna 的 `MedianPruner` 自动剪枝器是通过何种规则在训练中间轮次果断终止某个试验以节约算力的？",
            options=[
                {"value": "A", "text": "若当前试验在第 $t$ 步的中间验证指标显著差于过去所有已完成试验在第 $t$ 步的中位数表现，则提前触发异常早停抛弃该试验"},
                {"value": "B", "text": "只要训练出现一次损失上升就立即剪枝"},
                {"value": "C", "text": "随机以 50% 概率终止试验"},
                {"value": "D", "text": "仅在所有试验全部跑完后进行剪枝"},
            ],
            answer="A",
            explanation="MedianPruner 是一种基于历史分位数的高效剪枝算法。在每个预设的检查点（step），如果当前试验的性能处于历史试验的下半区（低于中位数），算法判定该试验几乎不可能逆袭成为全局冠军，因此果断将其掐断终止，节省巨量时间。",
            difficulty=2,
            related_lesson_id="ml-eng-l4-1",
            tags=["Optuna", "MedianPruner", "自动剪枝", "算力优化"],
        ),
    ]

    return chapter(
        chapter_id="ml-eng-c4",
        course_id="ml-engineering",
        order=4,
        title="超参数寻优与模型可解释性归因",
        goal="掌握 TPE 贝叶斯超参优化与自动剪枝，掌握 PFI 无偏置换重要性，精通博弈论沙普利值四大公理与 SHAP 局部归因体系。",
        lessons=lessons,
        exercises=exercises,
    )
