# -*- coding: utf-8 -*-
"""
Causal Inference - Chapter 15: Double Machine Learning (DML) and Orthogonal Estimation
"""

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_15():
    c15_lessons = [
        lesson(
            "causal-inference-l15-1",
            "高维混杂与正则化偏差：朴素机器学习为何因果翻车？",
            """### 一、大数据时代的混杂诅咒
在现代工业界，我们常常需要控制上百甚至成千上万维的高维协变量 $X$（例如用户的历史点击流、图特征、消费偏好、搜索关键词词袋等）。
在大样本高维场景下，传统的 OLS 多元回归彻底失效（参数量超过样本量，存在严重共线性）。
自然而然地，数据科学家会想：**能否直接用现代机器学习模型（如 Lasso、Random Forest、XGBoost、深度神经网络）来控制这些混杂变量？**

例如考虑经典的部分线性模型（Partially Linear Model）：
$$Y = D\\theta_0 + g_0(X) + U, \\quad \\mathbb{E}[U \\mid D, X] = 0$$
其中 $\\theta_0$ 是我们唯一关心的因果参数，$g_0(X)$ 是高维非线性混杂主效应。

### 二、朴素机器学习的灾难：正则化偏差 (Regularization Bias)
一个看似直观的做法是：使用 Lasso 或随机森林直接回归 $Y$ 对 $D$ 和 $X$，并汇报 $D$ 的系数作为 $\\theta_0$。
**这在统计学上是一个灾难性的错误！**
1. **收缩惩罚带来的漏选/压制**：像 Lasso 这种为了防止过拟合而引入 $L_1$ 惩罚项的算法，在收敛过程中会强行将很多特征系数压缩为 0。如果干预变量 $D$ 与某个混杂变量 $X_j$ 强相关，Lasso 在权衡预测误差时很可能漏选 $X_j$ 或严重低估其系数。
2. **遗漏变量偏差爆发**：混杂变量 $X_j$ 被正则化压制留下的未解释残差，会全部泄露并投影到干预变量 $D$ 上。
3. **缓慢的收敛速率**：非参数机器学习估计高维 nuisance 函数 $\\widehat{g}(X)$ 的收敛速度通常只有 $n^{-1/4}$。这种慢速非参数估计误差会直接污染主参数 $\\theta_0$，导致 $\\widehat{\\theta}$ 的估计偏差达到 $O(n^{-1/4})$ 甚至更大，远远达不到经典计量推断所要求的 $\\sqrt{n}$ 根号 $n$ 渐近无偏一致性！""",
            difficulty=1,
            tips=[
                tip("机器学习的本质目的", "标准机器学习被设计用于'最小化预测方差'，而不是'保持因果参数的一致推断'。正则化以偏差换方差的机制对因果推断是致命的。")
            ],
            demos=[
                demo("正则化偏差示意", "Y = theta*D + g(X) + U. Lasso 会在缩减 g(X) 复杂度的同时，把未除净的混杂方差甩锅给 D。")
            ]
        ),
        lesson(
            "causal-inference-l15-2",
            "Neyman 正交性 (Neyman Orthogonality)：剥离讨厌参数的数学护城河",
            """### 一、讨厌参数 (Nuisance Parameters) 的困扰
在因果推断模型中，我们最关心的目标因果参数记为 $\\theta_0$（低维，通常为标量）。
而高维函数 $g_0(X) = \\mathbb{E}[Y \\mid X]$ 和倾向得分 $m_0(X) = \\mathbb{E}[D \\mid X]$ 被称为**讨厌参数（Nuisance Parameters）**——我们并不真正关心它们的具体数值，但必须对它们进行调整以排除混杂。

如果评估 $\\theta_0$ 的打分矩条件 $\\psi(W; \\theta, \\eta)$ 对讨厌参数 $\\eta$ 非常敏感，那么 $\\eta$ 估计中的微小偏差 $\\widehat{\\eta} - \\eta_0$ 就会在线性一阶项（First-order error）上完全传导给 $\\widehat{\\theta}$！

### 二、Neyman 正交性条件的数学定义
Chernozhukov 等人 (2018) 在《Double/debiased machine learning for treatment and structural parameters》中提出：
打分函数 $\\psi(W; \\theta_0, \\eta_0)$ 满足 **Neyman 正交性 (Neyman Orthogonality)**，当且仅当其关于讨厌参数 $\\eta$ 的加托导数（Gâteaux Derivative / 方向导数）在真值处严格为 0：
$$\\partial_\\eta \\mathbb{E}\\big[ \\psi(W; \\theta_0, \\eta) \\big]\\Big|_{\\eta = \\eta_0} = 0$$

### 三、正交性带来的绝妙性质：一阶免疫
根据泰勒级数展开：
$$\\mathbb{E}[\\psi(W; \\theta_0, \\widehat{\\eta})] = \\underbrace{\\mathbb{E}[\\psi(W; \\theta_0, \\eta_0)]}_{=0} + \\underbrace{\\partial_\\eta \\mathbb{E}[\\psi]\\Big|_{\\eta_0}(\\widehat{\\eta} - \\eta_0)}_{=0 \\text{ (由于正交性彻底消失!)}} + O\\left( \\|\\widehat{\\eta} - \\eta_0\\|^2 \\right)$$
这意味着讨厌参数的一阶估计误差对因果目标参数的影响**彻底归零**！
只剩下二阶甚至更高阶的微小误差项 $O(\\|\\widehat{\\eta} - \\eta_0\\|^2)$。
即便机器学习估计 $\\widehat{\\eta}$ 的速度只有慢速的 $n^{-1/4}$，经过平方后，误差项直接加速缩减为：
$$(n^{-1/4})^2 = n^{-1/2} = \\frac{1}{\\sqrt{n}}$$
**因果参数 $\\widehat{\\theta}$ 奇迹般地恢复了 $\\sqrt{n}$ 根号 $n$ 经典渐近正态收敛速度！**""",
            difficulty=2,
            tips=[
                tip("正交性的几何直觉", "正交打分函数使得因果参数的求解方向恰好处于讨厌参数误差切空间的法线方向，任何讨厌参数的扰动都不会在因果投影轴上产生投影分量。")
            ]
        ),
        lesson(
            "causal-inference-l15-3",
            "样本交叉拟合 (K-fold Cross-Fitting)：消除经验过程紧性问题",
            """### 一、为什么只有正交性还不够？
即使打分函数在期望层面具备 Neyman 正交性，即 $\\mathbb{E}[\\partial_\\eta \\psi] = 0$，在有限样本中，我们面对的是**经验平均（Sample Average）**：
$$\\frac{1}{N} \\sum_{i=1}^N \\psi(W_i; \\theta, \\widehat{\\eta})$$
如果我们在同一批样本上既训练机器学习模型得到 $\\widehat{\\eta}$，又用该批样本计算经验平均：
机器学习模型的高度灵活性（如上千棵树的深度森林或深度网络）会死记硬背下样本的微观噪声（过拟合）。
这会导致讨厌参数预测值 $\\widehat{\\eta}(X_i)$ 与残差 $U_i$ 产生不可忽视的经验内生相关，使得经验过程（Empirical Process）不再具备 Donsker 紧性条件，导致渐近方差估计彻底失真！

### 二、K 折交叉拟合 (K-fold Cross-Fitting) 的执行步骤
为了彻底斩断 $\\widehat{\\eta}$ 与经验残差之间的过拟合纠缠，必须使用**交叉拟合 (Cross-Fitting)**：
1. **数据切分**：将总样本 $\\mathcal{W}$ 随机平均分成 $K$ 个互不重叠的折（Folds，通常 $K=5$ 或 $K=10$）。
2. **轮流跨折训练与预测**：
   - 对于第 $k$ 折样本 $\\mathcal{I}_k$：仅使用其余 $K-1$ 折样本训练机器学习模型，获得 $\\widehat{\\eta}^{(-k)}$。
   - 然后，仅用这个在外部训练的模型，对第 $k$ 折样本进行推断预测，得到 $\\widehat{\\eta}^{(-k)}(W_i), \\; \\forall i \\in \\mathcal{I}_k$。
3. **全样本池化求解因果参数**：
   将所有折的样本及其“外部预测”拼在一起，求解正交经验打分方程：
   $$\\frac{1}{N} \\sum_{k=1}^K \\sum_{i \\in \\mathcal{I}_k} \\psi\\left(W_i; \\widehat{\\theta}, \\widehat{\\eta}^{(-k)}\\right) = 0$$

### 三、交叉拟合的理论保证
由于每个个体的讨厌参数预测值都是由**完全不包含该个体的独立样本集**拟合出来的，个体样本与预测值完全条件独立。
过拟合偏差被彻底粉碎，为统计推断提供了无懈可击的数学保障。""",
            difficulty=2,
            tips=[
                tip("交叉拟合 vs 普通交叉验证", "CV 只是为了调超参数选最佳模型；而 Cross-Fitting 是为了在因果打分方程中严格隔离估计误差与残差。")
            ]
        ),
        lesson(
            "causal-inference-l15-4",
            "DML 两大经典框架：部分线性回归 (PLR) 与交互效应模型 (IRM)",
            """### 一、部分线性模型 (PLR, Partially Linear Regression)
模型设定：
$$Y = D\\theta_0 + g_0(X) + U, \\quad \\mathbb{E}[U \\mid D, X] = 0$$
$$D = m_0(X) + V, \\quad \\mathbb{E}[V \\mid X] = 0$$
- **第一步（双重去混杂 Residualization / Frisch-Waugh-Lovell 拓展）**：
  用任意机器学习算法（如 LightGBM 或神经网络）分别拟合：
  1. $Y$ 关于 $X$ 的回归：$\\widehat{\\ell}(X) \\approx \\mathbb{E}[Y \\mid X]$
  2. $D$ 关于 $X$ 的回归：$\\widehat{m}(X) \\approx \\mathbb{E}[D \\mid X]$
- **第二步（计算双重正交残差）**：
  $$\\widetilde{Y} = Y - \\widehat{\\ell}(X), \\quad \\widetilde{D} = D - \\widehat{m}(X)$$
- **第三步（无截距残差单回归）**：
  $$\\widehat{\\theta}_{\\text{PLR}} = \\frac{\\sum_{i=1}^N \\widetilde{D}_i \\widetilde{Y}_i}{\\sum_{i=1}^N \\widetilde{D}_i^2}$$
这就是著名的 Robinson (1988) 正交转换！通过对 $Y$ 和 $D$ 双重剔除 $X$ 的预测主效应，直接消除混杂。

### 二、局部交互效应模型 (IRM, Interactive Regression Model / ATE)
如果干预效应也是完全非参数化的，即：
$$Y = g_0(D, X) + U, \\quad D = m_0(X) + V$$
此时我们估计的是全局 $ATE = \\mathbb{E}[g_0(1, X) - g_0(0, X)]$。
其正交打分函数为著名的增广逆倾向加权（AIPW）形式：
$$\\psi(W; \\theta, \\eta) = \\big( g(1, X) - g(0, X) \\big) + \\frac{D(Y - g(1, X))}{m(X)} - \\frac{(1-D)(Y - g(0, X))}{1 - m(X)} - \\theta$$
通过结合回归插补与倾向得分倒数加权，具备极强的正交与双重稳健性质。""",
            difficulty=2,
            tips=[
                tip("PLR 的工业杀伤力", "PLR 仅需两次非参数预测加一次一元 OLS，即可在高维特征下得到无偏的干预系数，算力开销极小且效果拔群。")
            ]
        ),
        lesson(
            "causal-inference-l15-5",
            "双重稳健性 (Double Robustness) 与渐近方差闭式解",
            """### 一、双重稳健性 (Double Robustness) 的神奇魔力
在 IRM 模型的打分函数中，包含了两个独立的机器学习模型：
1. **结果模型 (Outcome Model)**：$g(D, X) = \\mathbb{E}[Y \\mid D, X]$
2. **倾向得分模型 (Propensity Model)**：$m(X) = P(D=1 \\mid X)$

所谓的**双重稳健性（Double Robustness）**是指：
$$\\mathbb{E}[\\psi(W; \\theta_0, \\bar{g}, \\bar{m})] = 0 \\quad \\Longleftrightarrow \\quad \\big( \\bar{g} = g_0 \\big) \\; \\text{或者} \\; \\big( \\bar{m} = m_0 \\big)$$
**只要结果模型和倾向得分模型中任意一个被正确指定或一致收敛，因果效应估计量 $\\widehat{\\theta}$ 就严格无偏一致！**
即便一个模型存在函数形式误设，另一个模型也能充当防波堤将其纠正。

### 二、解析渐近方差与假设检验
由于 Neyman 正交性与 Cross-Fitting 的保护，DML 估计量满足严格的中心极限定理：
$$\\sqrt{n}(\\widehat{\\theta} - \\theta_0) \\xrightarrow{d} \\mathcal{N}(0, \\sigma^2)$$
其方差具有简洁优雅的闭式三明治解：
$$\\widehat{\\sigma}^2 = J^{-1} \\left( \\frac{1}{N} \\sum_{i=1}^N \\psi(W_i; \\widehat{\\theta}, \\widehat{\\eta})^2 \\right) (J^{-1})^\\top$$
其中 $J = \\frac{1}{N}\\sum_{i=1}^N \\partial_\\theta \\psi$。
这使得研究人员无需进行计算昂贵且在高维下易失效的 Bootstrap 重抽样，就能瞬间给出 95% 置信区间与 p 值！""",
            difficulty=2,
            tips=[
                tip("双重保险机制", "工业界中很难保证单一机器学习模型百分之百完美，AIPW 的双重稳健性是目前最被信任的统计护城河。")
            ]
        ),
        lesson(
            "causal-inference-l15-6",
            "工业级实操流水线：EconML / DoubleML 架构与调优秘籍",
            """### 一、工业级开源生态
目前 DML 的两大标杆工业库：
1. **Microsoft EconML**：专注于异质性处理效应与 DML 扩展（LinearDML, CausalForestDML, NonParamDML）。
2. **DoubleML (Python / R)**：严格遵循 Chernozhukov 等人原著规范的学术级 DML 框架。

### 二、DML 生产全流程标准五步法
1. **定义模型族**：判断干预是连续的、二值的，还是异质性的。二值且追求全局 ATE 选 `DoubleMLIRM`；连续定价选 `DoubleMLPLR`。
2. **选型底层机器学习器 (Learners)**：
   - 结果模型通常选用拟合能力强、抗过拟合优越的 LightGBM、CatBoost 或带 Dropout 的多层感知机（MLP）。
   - 倾向得分模型建议使用经过概率校准（CalibratedClassifierCV）的逻辑回归或浅层 GBDT，防止预测概率趋近 0 或 1 造成方差爆炸。
3. **设置交叉拟合折数**：工业标准通常设为 `n_folds=5`。若样本量在百万级别，可适度设为 3 折以节省算力。
4. **倾向得分修剪 (Trimming / Clipping)**：强制将极端的倾向得分截断在 $[0.01, 0.99]$ 或 $[0.02, 0.98]$，消除分母过小带来的数值不稳定。
5. **模型诊断与敏感度分析**：调用核查工具，输出残差诊断分布和相关系数。""",
            difficulty=2,
            tips=[
                tip("极端倾向得分警报", "若发现样本中存在倾向得分低于 0.001 的个体，必须执行 Trimming 截断，否则单个异常样本能瞬间把 ATE 方差拉爆上千倍。")
            ]
        ),
        lesson(
            "causal-inference-l15-7",
            "算例拆解与自查清单：高维用户画像下营销因果 DML 实战与排错",
            """### 一、业务全景：SaaS 平台续费补贴因果评估
某 B2B SaaS 平台对 20 万家企业客户实施了“顾问式客户成功续费支持计划”（$D=1$ 代表被顾问介入，$D=0$ 代表自然续费）。
企业特征 $X$ 包含 250 维高维画像（如日活跃员工数、历史工单数、API 调用峰值、企业行业、融资轮次、历史付费金额等）。
结果变量 $Y$ 为企业次年真实续费金额。

由于客户成功经理往往有偏向性地去联系“大客户”或“快要流失的风险客户”，干预变量 $D$ 存在极强的高维混杂！

### 二、三种算法对比算例拆解
| 评估方法 | 估计处理效应 $\\widehat{\\theta}$ | 标准误 (SE) | 95% 置信区间 | 结论与评价 |
| :--- | :--- | :--- | :--- | :--- |
| **方法 1：朴素 OLS（全特征进入）** | $+12,850$ 元 | 4,210 元 | $[4,598, 21,102]$ | 高度共线性导致估计方差极大，系数剧烈波动 |
| **方法 2：朴素 Lasso 直接回归** | $+3,120$ 元 | 850 元 | $[1,454, 4,786]$ | 严重正则化收缩偏差，因漏选部分混杂变量导致效应被严重低估 |
| **方法 3：DML (DoubleMLPLR + LightGBM)** | $+8,420$ 元 | 410 元 | $[7,616, 9,224]$ | Neyman 正交化 + 5 折交叉拟合，精确剥离混杂，置信区间紧凑 |

### 三、双重机器学习 (DML) 实施自查清单
- [ ] 1. **正交打分核验**：使用的估计量是否满足 Neyman 正交条件？严禁直接从监督学习的特征重要性或线性系数读取因果效应。
- [ ] 2. **Cross-Fitting 开启**：是否严格实施了 K-fold 交叉拟合？是否杜绝了用全样本一边训练 nuisance 一边算正交矩的“自用泄漏”？
- [ ] 3. **倾向得分重叠性核查**：计算倾向得分分布直方图，确认干预组与对照组具有充分的公共支撑域（Common Support）。
- [ ] 4. **讨厌参数预测能力**：检查第一阶段 nuisance 模型的 AUC 和 $R^2$。如果第一阶段模型几乎没有预测能力（如 $R^2 \\approx 0$），正交残差化将退化为简单差分。
- [ ] 5. **敏感度分析 (Sensitivity Analysis)**：执行 Cinelli & Hazlett (2020) 灵敏度轮廓图测试，评估若存在未观测隐藏混杂时，需多强的混杂度才能彻底推翻当前因果结论。""",
            difficulty=2,
            tips=[
                tip("DML 的本质定位", "DML 不是魔术，不能解决未观测混杂；它的核心贡献是在假设所有混杂均已被测量的前提下，允许你用高维非线性机器学习而不需要承担正则化偏差。")
            ]
        )
    ]

    c15_exercises = [
        single_choice(
            "causal-inference-c15-e1",
            "在部分线性模型中，直接使用 Lasso 回归 Y 对 (D, X) 并汇报 D 的系数，会产生严重偏差的根本原因是：",
            [
                {"label": "Lasso 的 L1 正则化收缩会压制或漏选与 D 相关的混杂特征，导致遗漏变量偏差泄露至因果系数", "value": "A"},
                {"label": "Lasso 只能处理离散二值标签，无法处理连续变量 Y", "value": "B"},
                {"label": "Lasso 的计算复杂度为 O(N^3)，计算无法在有限时间内收敛", "value": "C"},
                {"label": "Lasso 的残差不满足高斯正态分布", "value": "D"},
            ],
            "A",
            "Lasso 以牺牲无偏性换取预测方差降低。当混杂特征 X 与 D 具有相关性时，收缩惩罚会将混杂变量系数压缩向 0，未被充分解释的变异直接污染 D 的系数，造成严重的正则化偏差（Regularization Bias）。",
            difficulty=1,
            related_lesson_id="causal-inference-l15-1",
            tags=["正则化偏差", "Lasso缺陷", "高维混杂"],
        ),
        single_choice(
            "causal-inference-c15-e2",
            "Neyman 正交性 (Neyman Orthogonality) 的核心数学内涵是：",
            [
                {"label": "因果打分函数关于高维讨厌参数 (Nuisance Parameters) 的方向导数在真实参数处为 0", "value": "A"},
                {"label": "协变量 X 矩阵的每一列必须相互正交，内积为 0", "value": "B"},
                {"label": "干预变量 D 与潜在结果 Y 在几何空间上夹角为 90 度", "value": "C"},
                {"label": "倾向得分与结果回归残差的相关系数必须严格等于 1", "value": "D"},
            ],
            "A",
            "Neyman 正交性是指矩条件对讨厌参数的一阶加托方向导数为 0。这使得讨厌参数估计的慢速一阶误差彻底消失，仅保留极微小的二阶误差，使因果参数能够达到 root-n 渐近正态收敛速度。",
            difficulty=2,
            related_lesson_id="causal-inference-l15-2",
            tags=["Neyman正交性", "方向导数", "理论核心"],
        ),
        single_choice(
            "causal-inference-c15-e3",
            "在 DML 中，样本交叉拟合 (K-fold Cross-Fitting) 的根本目的是：",
            [
                {"label": "防止机器学习在同一份样本上过拟合导致的残差与讨厌参数内生相关，切断经验过程的紧性违背", "value": "A"},
                {"label": "为了寻找机器学习的最优学习率与超参数", "value": "B"},
                {"label": "为了让训练样本数量扩大 K 倍", "value": "C"},
                {"label": "为了把连续变量离散化为 K 个分箱", "value": "D"},
            ],
            "A",
            "交叉拟合（Cross-Fitting）是为了在样本层面彻底斩断机器学习模型的记忆过拟合。每一折的 nuisance 预测均由外部折训练得出，从而保证了经验残差与预测值的条件独立性。",
            difficulty=2,
            related_lesson_id="causal-inference-l15-3",
            tags=["Cross-Fitting", "交叉拟合", "防止过拟合"],
        ),
        single_choice(
            "causal-inference-c15-e4",
            "在部分线性回归模型 (PLR) 的 DML 流程中，第二步计算出的两个正交残差分别是：",
            [
                {"label": "Y 对 X 回归的预测残差，以及 D 对 X 回归的预测残差", "value": "A"},
                {"label": "Y 对 D 回归的残差，以及 X 对 D 回归的残差", "value": "B"},
                {"label": "Y 对所有特征的残差，以及倾向得分倒数", "value": "C"},
                {"label": "X 矩阵的主成分分解残差", "value": "D"},
            ],
            "A",
            "根据 Robinson 正交变换：首先用机器学习估计 E[Y|X] 和 E[D|X]，然后分别求出残差 Y_tilde = Y - E[Y|X] 与 D_tilde = D - E[D|X]，最后用 Y_tilde 对 D_tilde 做无截距回归。",
            difficulty=2,
            related_lesson_id="causal-inference-l15-4",
            tags=["PLR", "双重残差", "Robinson正交化"],
        ),
        single_choice(
            "causal-inference-c15-e5",
            "关于双重稳健估计量（如 AIPW）的“双重稳健性 (Double Robustness)”，以下陈述准确的是：",
            [
                {"label": "只要结果预测模型 E[Y|D,X] 与倾向得分模型 P(D=1|X) 中任意一个一致收敛，因果效应估计量就严格一致", "value": "A"},
                {"label": "必须要求结果模型和倾向得分模型同时 100% 正确，估计量才有效", "value": "B"},
                {"label": "即使存在严重的未观测隐藏混杂变量，估计量依然能够完全消除偏差", "value": "C"},
                {"label": "该估计量的方差永远只有单一回归调整法的一半", "value": "D"},
            ],
            "A",
            "双重稳健性的数学定理表明：只要结果模型与倾向得分模型中有一个收敛至真值，矩条件期望就为 0，因而保证因果估计量的一致性。",
            difficulty=2,
            related_lesson_id="causal-inference-l15-5",
            tags=["双重稳健性", "AIPW", "收敛性"],
        ),
        single_choice(
            "causal-inference-c15-e6",
            "在使用 DML 估计因果效应时，如果部分样本的倾向得分预测值达到了 0.0001（极度违背重叠假定），最合理的工程处理策略是：",
            [
                {"label": "执行倾向得分截断 (Trimming / Clipping)，排除或截断倾向得分过极端的样本", "value": "A"},
                {"label": "将所有 Y 乘以 10000 放大", "value": "B"},
                {"label": "增加深度学习的层数直到该概率变成 0.5", "value": "C"},
                {"label": "直接忽略，因为 DML 的 Neyman 正交性会自动解决分母为 0 的问题", "value": "D"},
            ],
            "A",
            "倾向得分在分母位置。若接近 0 会导致逆概率权重爆炸，估计量方差剧增。工业标准通常设置 Trimming 截断（如限制在 [0.01, 0.99]），排除缺乏公共支撑域的极端样本。",
            difficulty=2,
            related_lesson_id="causal-inference-l15-6",
            tags=["倾向得分截断", "重叠性违背", "Trimming"],
        ),
        multiple_choice(
            "causal-inference-c15-e7",
            "双重机器学习 (DML) 框架相比传统计量经济学方法的核心突破体现在：（多选）",
            [
                {"label": "允许在控制高维混杂因素时直接使用任意复杂的黑盒机器学习算法（如 GBDT、深度神经网络）", "value": "A"},
                {"label": "通过 Neyman 正交化设计，彻底消除了非参数估计带来的慢速一阶正则化偏差", "value": "B"},
                {"label": "利用交叉拟合机制杜绝了过拟合，恢复了因果参数的根号 n 渐近正态推断能力", "value": "C"},
                {"label": "可以在没有任何假定的情况下，全自动解决遗漏未观测混杂变量的问题", "value": "D"},
            ],
            ["A", "B", "C"],
            "A、B、C 均为 Chernozhukov 等人创立 DML 的核心贡献。D 错误：DML 建立在无混杂性（可忽略性）假定之上，依然无法消除未被观测到的混杂因素。",
            difficulty=2,
            related_lesson_id="causal-inference-l15-2",
            tags=["DML突破", "核心贡献", "方法论对比"],
        ),
        multiple_choice(
            "causal-inference-c15-e8",
            "在 DML 的第一阶段中，以下哪些机器学习模型的超参数调优是合理的做法？（多选）",
            [
                {"label": "使用 5 折交叉验证调优 LightGBM 的树深和叶子数，以最小化 MSE", "value": "A"},
                {"label": "对倾向得分模型采用 CalibratedClassifierCV 进行概率校准，防止概率输出两极虚高", "value": "B"},
                {"label": "使用早停法 (Early Stopping) 防止深度神经网络在训练集上过拟合", "value": "C"},
                {"label": "手动挑选让最终因果系数 p 值最显著的超参数组合", "value": "D"},
            ],
            ["A", "B", "C"],
            "A、B、C 均为科学的第一阶段 nuisance 参数调优实践。D 错误：属于典型的数据钓鱼（P-hacking），严重破坏统计有效性。",
            difficulty=3,
            related_lesson_id="causal-inference-l15-6",
            tags=["调优实践", "概率校准", "合规研发"],
        ),
        multiple_choice(
            "causal-inference-c15-e9",
            "关于 DML 中渐近方差估计的说法，正确的有：（多选）",
            [
                {"label": "由于具备 Neyman 正交性与 CLT 保证，可以直接通过三明治方差公式计算解析置信区间", "value": "A"},
                {"label": "不需要耗时数小时的 Bootstrap 重抽样即可输出标准误", "value": "B"},
                {"label": "方差大小与样本量 N 的平方根成反比（收敛速度为根号 n）", "value": "C"},
                {"label": "估计出的置信区间只能用于样本内推断，不能用于总体假设检验", "value": "D"},
            ],
            ["A", "B", "C"],
            "A、B、C 准确阐述了 DML 解析渐近方差的数学性质。D 错误：渐近正态置信区间正是用于对总体真值因果参数进行科学统计推断。",
            difficulty=3,
            related_lesson_id="causal-inference-l15-5",
            tags=["渐近方差", "三明治公式", "统计推断"],
        ),
        judge(
            "causal-inference-c15-e10",
            "只要有了双重机器学习 (DML)，我们在进行因果分析时就再也不需要做任何因果图 DAG 定性分析或混杂因素梳理了，可以直接把数据库里的所有千张表字段全扔给机器学习模型。",
            False,
            "错误。DML 只能处理观测到的混杂变量，若盲目纳入碰撞变量（Collider）或中介变量（Mediator），会人为制造混杂或拦截因果效应；且 DML 无法解决未观测遗漏变量。",
            difficulty=1,
            related_lesson_id="causal-inference-l15-7",
            tags=["坏控制变量", "DAG", "方法局限"],
        ),
        judge(
            "causal-inference-c15-e11",
            "在 PLR 框架中，如果结果预测模型 E[Y|X] 具有极高的预测精度，而干预预测模型 E[D|X] 完全没有任何预测能力（R方接近0），DML 会产生灾难性的除零错误。",
            False,
            "错误。PLR 中分母是 D_tilde^2 = (D - E[D|X])^2。当 E[D|X] 预测能力为 0 时，D_tilde = D - bar{D}，分母恰好等于 D 的样本方差，依然可以正常求解且不会除以 0。",
            difficulty=2,
            related_lesson_id="causal-inference-l15-4",
            tags=["PLR分母", "鲁棒性", "残差化"],
        ),
        fill(
            "causal-inference-c15-e12",
            "DML 的两大核心理论支柱是：使得矩条件对讨厌参数一阶导数为零的 [blank1] 正交性，以及将数据分折以切断过拟合相关性的 [blank2] 交叉拟合。",
            [["Neyman", "内曼"], ["Cross-Fitting", "K-fold Cross-Fitting", "交叉拟合"]],
            "两大基石正是 Neyman 正交性 (Neyman Orthogonality) 与样本交叉拟合 (K-fold Cross-Fitting)。",
            difficulty=2,
            related_lesson_id="causal-inference-l15-2",
            tags=["DML基石", "Neyman", "Cross-Fitting"],
        ),
        open_ex(
            "causal-inference-c15-e13",
            "高维用户画像下价格弹性 DML 估计与灵敏度分析方案设计",
            """某在线打车平台计划对高峰期动态调价算法开展价格弹性因果评估。
数据包含过去半年的 1000 万笔订单，干预变量 $D$ 为动态加价倍率（连续型，1.0~2.5），结果变量 $Y$ 为乘客完单率或发单时长，协变量 $X$ 为 300 维高维特征（天气、历史完单率、供需比热力、用户会员等级、实时叫车排队数等）。
请撰写一份完整的 DML 落地实施方案：
1. 建立部分线性模型 (PLR)，推导正交残差化与因果参数求解公式；
2. 阐述为什么要使用 5 折 Cross-Fitting，以及如果不用会导致什么严重后果；
3. 详细说明第一阶段两个机器学习模型的选型、损失函数及调优注意事项；
4. 设计一套稳健性与灵敏度分析（Sensitivity Analysis）流程，评估若存在未测量的司机端不可见动机混杂时因果结论的抗压能力。""",
            "掌握 DML 在连续型因果干预下的实战闭环：PLR 正交残差推导、Cross-Fitting 理论防御、第一阶段机器学习调优以及 Cinelli-Hazlett 混杂灵敏度评估。",
            [
                {"point": "正确写出 PLR 设定、Neyman 正交残差化及 theta 解析解", "score": 2},
                {"point": "深入解释 Cross-Fitting 防御过拟合及经验过程紧性失真的机制", "score": 1},
                {"point": "合理选型两阶段机器学习器并提及防过拟合策略", "score": 1},
                {"point": "设计完备的未观测混杂灵敏度分析方案", "score": 1},
            ],
            exemplar="""【完整工业方案】
1. PLR 模型与正交推导：
- 模型结构：$Y = D\\theta + g(X) + U$, $D = m(X) + V$, 其中 $\\mathbb{E}[U \\mid D,X]=0, \\mathbb{E}[V \\mid X]=0$。
- 使用机器学习分别预测 $\\widehat{\\ell}(X) \\approx \\mathbb{E}[Y \\mid X]$ 和 $\\widehat{m}(X) \\approx \\mathbb{E}[D \\mid X]$。
- 构造正交残差：$\\widetilde{Y}_i = Y_i - \\widehat{\\ell}(X_i)$, $\\widetilde{D}_i = D_i - \\widehat{m}(X_i)$。
- 求解因果参数：$\\widehat{\\theta} = \\frac{\\sum_{i} \\widetilde{D}_i \\widetilde{Y}_i}{\\sum_{i} \\widetilde{D}_i^2}$。该估计量满足 Neyman 正交性，讨厌参数的一阶估计误差对 $\\theta$ 的影响为零。

2. 5 折 Cross-Fitting 的必要性：
- 若在同一份样本上拟合 $\\widehat{m}, \\widehat{\\ell}$ 并计算残差，高维复杂树模型会将样本微观随机噪声强行拟合，导致残差 $\\widetilde{D}$ 与 $\\widetilde{Y}$ 产生经验内生相关性。
- 5 折 Cross-Fitting 确保每个样本的预测值完全来自不包含该样本的其余 4 折数据训练的模型，斩断依赖，确保渐近正态推断。

3. 第一阶段模型选型与调优：
- $\\mathbb{E}[Y \\mid X]$：选用 LightGBM 回归器，以 MSE 为目标函数，开启早停并调优叶子数与学习率。
- $\\mathbb{E}[D \\mid X]$：由于价格为连续变量，采用 CatBoost 回归器，结合 5 折网格搜索正则化参数，确保不过拟合。

4. 灵敏度分析：
- 采用 Cinelli & Hazlett (2020) 的偏 $R^2$ 灵敏度轮廓分析（Robustness Value, RV）。
- 测算使得价格弹性统计显著性消失所需的最小混杂强度 $RV_{q=1}$。若未观测混杂（如司机线下拒单倾向）的解释力必须超过当前基准供需特征的 3 倍以上才能推翻结论，则说明因果估计具备高置信度。""",
            difficulty=5,
            related_lesson_id="causal-inference-l15-7",
            tags=["连续干预", "PLR实战", "灵敏度分析", "工业落地"],
        ),
    ]

    ch15 = chapter(
        "causal-inference-c15",
        "causal-inference",
        15,
        "双重机器学习 (Double Machine Learning, DML)",
        "掌握现代因果推断皇冠上的明珠：破解正则化偏差困境、Neyman 正交性数学构造、K 折交叉拟合、PLR 与 IRM 框架、双重稳健性及工业级实战流水线。",
        c15_lessons,
        c15_exercises,
    )
    return ch15

if __name__ == "__main__":
    ch = get_chapter_15()
    print(f"Chapter 15 validated: {len(ch['lessons'])} lessons, {len(ch['exercises'])} exercises.")
