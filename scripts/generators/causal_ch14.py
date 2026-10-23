# -*- coding: utf-8 -*-
"""
Causal Inference - Chapter 14: Heterogeneous Treatment Effects, Causal Trees, and Forests
"""

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_14():
    c14_lessons = [
        lesson(
            "causal-inference-l14-1",
            "从 ATE 到 CATE：为什么全局平均效应会误导决策？",
            """### 一、从均值迷思到个体异质性
在前面的章节中，我们通常关注全局平均处理效应（Average Treatment Effect, ATE）：
$$ATE = \\mathbb{E}[Y_i(1) - Y_i(0)]$$
然而在现实世界中，“一刀切”的干预往往并不存在：
- **电商优惠券**：全量发券的平均客单价提升仅为 +0.5 元（ATE 不显著）。但对价格敏感的年轻客群提升为 +25 元，对高净值忠实客群提升为 -10 元（原本无券也会购买，发券纯粹损失利润毛利）。全局均值完全掩盖了截然相反的群体效应！
- **临床医学**：某抗癌新药的全局治愈提升率仅为 3%，但对于携带特定基因突变的患者，治愈率飙升 60%，而对未突变者甚至有严重毒副作用。

因此，现代因果推断的核心前沿是估计**条件平均处理效应 (Conditional Average Treatment Effect, CATE)**：
$$\\tau(x) = \\mathbb{E}[Y_i(1) - Y_i(0) \\mid X_i = x]$$
其中 $X_i$ 是受访个体的多维协变量特征向量。

### 二、传统线性交互项的致命缺陷
在经典计量经济学中，研究人员通常在回归中引入交互项：
$$Y_i = \\alpha + \\tau_0 D_i + X_i^\\top \\beta + (D_i \\cdot X_i)^\\top \\gamma + \\epsilon_i$$
此时特征为 $x$ 时的边际效应为 $\\widehat{\\tau}(x) = \\tau_0 + x^\\top \\gamma$。
当特征维度很低且形式线性时这种方法可行，但在高维大数据下存在致命缺陷：
1. **维度灾难与组合爆炸**：如果有 50 个特征，考虑二阶非线性和高维交叉项，待估参数数以千计。
2. **严重的函数形式误设**：真实异质性往往呈局部台阶状（如“活跃天数 > 5 且 近30天无退货”），线性交互项无法拟合复杂的非线性规则。
3. **P-hacking（数据钓鱼）**：分析师反复手动尝试不同的交互组合，筛选出统计显著的子群体汇报，在独立样本中完全无法复现。""",
            difficulty=1,
            tips=[
                tip("CATE 的核心价值", "CATE 让因果推断从'评估过去'走向'精细化决策未来'，寻找对干预最敏感的目标人群。")
            ],
            demos=[
                demo("传统 ATE 与 CATE 的对比", "ATE: 全体样本均值差；CATE: 特征子群体的局部期望增量差。")
            ]
        ),
        lesson(
            "causal-inference-l14-2",
            "Uplift 建模三大元学习器：S-Learner, T-Learner 与 X-Learner",
            """### 一、元学习器 (Meta-Learners) 概念
元学习器不发明新的底层回归算法，而是通过组合现有的监督学习回归器（如 LightGBM、XGBoost、Random Forest），解决因果反事实缺失的问题。

### 二、S-Learner (Single Learner)
- **做法**：将干预变量 $D$ 视为普通特征，与其他协变量 $X$ 一起输入单个模型进行拟合：
  $$\\mu(x, d) = \\mathbb{E}[Y \\mid X=x, D=d]$$
  CATE 估计为：$\\widehat{\\tau}_S(x) = \\widehat{\\mu}(x, 1) - \\widehat{\\mu}(x, 0)$。
- **致命弱点（趋零收缩）**：当特征 $X$ 维度很高且主效应很强时，树模型分裂或正则化倾向于完全忽略干预项 $D$。导致估出的因果效应严重偏向于 0！

### 三、T-Learner (Two Learners)
- **做法**：强制将数据拆分为对照组和干预组两份，分别独立训练两个模型：
  $$\\widehat{\\mu}_0(x) = \\mathbb{E}[Y \\mid X=x, D=0], \\quad \\widehat{\\mu}_1(x) = \\mathbb{E}[Y \\mid X=x, D=1]$$
  CATE 估计为：$\\widehat{\\tau}_T(x) = \\widehat{\\mu}_1(x) - \\widehat{\\mu}_0(x)$。
- **弱点**：当干预组与对照组样本量极不均衡时（如大促发券 95% 对 5%），小样本模型方差极大，两模型相减会产生大量虚假的异质性噪声。

### 四、X-Learner (Crossover Learner)
Künzel 等人 (2019) 提出针对不平衡样本设计的 X-Learner：
1. **第一步**：与 T-Learner 一样，在两组分别训练 $\\widehat{\\mu}_0(x)$ 和 $\\widehat{\\mu}_1(x)$。
2. **第二步**：计算交叉反事实残差：
   - 对干预组：$D_{1, i} = Y_i - \\widehat{\\mu}_0(X_i)$
   - 对对照组：$D_{0, j} = \\widehat{\\mu}_1(X_j) - Y_j$
   分别用 $X$ 回归拟合这两个伪因果残差，得到 $\\widehat{\\tau}_1(x)$ 与 $\\widehat{\\tau}_0(x)$。
3. **第三步**：用倾向得分加权组合：
   $$\\widehat{\\tau}_X(x) = e(x)\\widehat{\\tau}_0(x) + (1 - e(x))\\widehat{\\tau}_1(x)$$
样本量多的一组模型预测更精准，因而在反事实残差中获得更大权重，有效克服了样本不平衡难题。""",
            difficulty=2,
            tips=[
                tip("工业界选型", "样本均衡且特征少时用 T-Learner；样本极度不平衡（如 9:1 或 19:1）时优先选用 X-Learner。")
            ]
        ),
        lesson(
            "causal-inference-l14-3",
            "因果树 (Causal Trees) 的分裂准则：最大化效应异质性",
            """### 一、为什么不能直接用 CART 决策树？
经典 CART 决策树的分裂目标是降低 $Y$ 的方差（即最小化 MSE）：
$$\\min \\sum (Y_i - \\bar{Y}_L)^2 + \\sum (Y_i - \\bar{Y}_R)^2$$
CART 寻找的是结果 $Y$ 最纯粹的子群。
然而因果推断的目标是寻找**干预效应 $\\tau$ 最具差异的子群**！
如果高收入人群消费为 1000 元，低收入人群消费为 100 元，但优惠券给两组带来的增量都是 +50 元。CART 会优先按收入切分，但这在因果异质性上毫无意义（因果效应异质性为 0）。

### 二、Athey & Imbens (2016) 的因果分裂目标
在因果树的叶子节点 $l$ 中，因果效应估计量为组间均值差：
$$\\widehat{\\tau}(l) = \\bar{Y}_{1, l} - \\bar{Y}_{0, l}$$
对于候选分裂点切割出的左子节点 $L$ 和右子节点 $R$，因果分裂准则最大化：
$$\\Delta(L, R) = N_L \\cdot \\widehat{\\tau}(L)^2 + N_R \\cdot \\widehat{\\tau}(R)^2 - \\text{Variance Penalty}$$
- **第一部分（异质性增益）**：子节点之间的效应差越大，目标函数越大，驱动树寻找因果增量差异最显著的特征切分。
- **第二部分（方差惩罚）**：防止因叶子样本量过小导致随机扰动被误判为大效应。""",
            difficulty=2,
            tips=[
                tip("因果树的目标转变", "CART 预测 Y 的水平，因果树发现 tau 的增量差异。")
            ]
        ),
        lesson(
            "causal-inference-l14-4",
            "诚实估计 (Honest Estimation)：正交样本切分解决预选择偏差",
            """### 一、预选择偏差 (Pre-selection Bias)
在因果推断中，如果我们用同一份数据既去寻找树的最优分裂点，又去计算叶子节点内的处理效应 $\\widehat{\\tau}$，会引发灾难性的过拟合：
- 因果分裂准则极其饥渴地搜寻组间差异极大的微小样本切片。
- 随机噪声必然会导致某些叶子碰巧干预组均值极高、对照组极低。
- 算法把这个切片圈出来并汇报该效应，会导致严重高估效应，置信区间彻底失效（统计检验假显著）。

### 二、诚实原则 (Honesty Principle)
Athey & Imbens 提出诚实估计（Honesty），其操作极其纯粹：
**将训练集严格正交划分为互不相交的两部分**：
1. **结构分裂集 (Splitting Sample, $\\mathcal{S}^{\\text{tr}}$)**：仅用于寻找最佳特征切分阈值，决定整棵树的拓扑结构。
2. **效应估计集 (Estimation Sample, $\\mathcal{S}^{\\text{est}}$)**：树结构固定后，将估计集样本倒入树中，落入叶子 $l$ 的样本仅用于重新计算效应均值差：
   $$\\widehat{\\tau}^{\\text{honest}}(l) = \\bar{Y}_{1, l}^{\\text{est}} - \\bar{Y}_{0, l}^{\\text{est}}$$

### 三、诚实估计的统计学奇迹
1. **条件无偏性**：对估计集而言，叶子边界是外生固定的区间，彻底消除了由数据挖掘带来的选择偏差。
2. **中心极限定理与有效置信区间**：叶子内估计量恢复渐近正态分布，能够直接计算解析标准误和 95% 置信区间。""",
            difficulty=2,
            tips=[
                tip("Honesty 样本损失代价", "虽然样本量被二分，但消除了极端偏差并换取了严格的置信区间，这在因果推断中是决定性的。")
            ]
        ),
        lesson(
            "causal-inference-l14-5",
            "广义随机森林 (GRF) 与因果森林 (Causal Forests)",
            """### 一、从因果树到因果森林
单棵因果树方差较大、边界呈阶梯状且不稳定。Wager & Athey (2018) 将随机森林拓展为**因果森林 (Causal Forest)**，并在广义随机森林（Generalized Random Forests, GRF）框架下统一。

### 二、自适应核局部加权 (Adaptive Kernel) 的本质
因果森林的本质不是简单对多棵树的离散预测求平均，而是一个**数据驱动的自适应局部核加权估计器**：
- 对于任意测试点 $x$，如果样本 $i$ 在第 $b$ 棵树中与 $x$ 落入同一个叶子，则记一次“邻居”。
- 遍历所有树后，样本 $i$ 对 $x$ 的综合亲密度权重为：
  $$\\alpha_i(x) = \\frac{1}{B} \\sum_{b=1}^B \\frac{\\mathbf{1}(X_i \\in L_b(x))}{|L_b(x)|}$$
- 如果某个特征与因果异质性无关，树不会频繁在该维度切分，核带宽在这一维度自动变宽；如果某个特征极敏感，切分极细密，核带宽自动收缩。

### 三、局部正交矩估计与逐点正态推断
基于权重 $\\alpha_i(x)$，因果森林通过局部正交化求解局部参数：
$$\\min_{\\tau} \\sum_{i=1}^N \\alpha_i(x) \\left( (Y_i - \\widehat{m}(X_i)) - \\tau(x) \\cdot (D_i - \\widehat{e}(X_i)) \\right)^2$$
在子抽样（Subsampling）和诚实树（Honest Trees）的保证下，估出的 $\\widehat{\\tau}(x)$ 具备逐点渐近正态性，并能通过刀切法（Jackknife）直接输出解析置信区间。""",
            difficulty=2,
            tips=[
                tip("GRF 的广泛适用性", "GRF 不仅能做因果森林，还能用于局部工具变量森林 (IV Forest)、局部分位数森林等。")
            ]
        ),
        lesson(
            "causal-inference-l14-6",
            "工业级因果评估：Qini 曲线、AUUC 与离线策略价值",
            """### 一、为什么传统 AUC / MSE 无法评估因果模型？
在标准监督学习中，每个样本都有确切的真实标签 $Y_i$。但在因果推断中，由于反事实缺失，**没有人能观测到个体的真实因果增量 $\\tau_i$**！
若盲目使用响应 AUC，模型会极度倾向于预测“原本转化率就很高的铁忠粉”，而这部分人的因果增量往往为 0 甚至负数。

### 二、Qini 曲线与 AUUC 核心评估法
因果评估必须依赖基于随机对照（RCT）保持测试集的群体排序评估：
1. 用 CATE 模型对测试集样本打出预测增量分 $\\widehat{\\tau}(X_i)$。
2. 将样本按 $\\widehat{\\tau}$ 降序排列。
3. 从头部前 $k\\%$ 样本开始累加，统计该切片内干预组响应数 $Y_1(k)$ 和对照组响应数 $Y_0(k)$，计算累积净增量：
   $$Q(k) = Y_1(k) - Y_0(k) \\cdot \\frac{N_1(k)}{N_0(k)}$$
4. **Qini 曲线**：以人群比例为横轴，累积净增量为纵轴。
5. **AUUC (Area Under Uplift Curve)**：累积增益曲线下面积。优秀模型的曲线在头部迅速攀升，远高于随机圈人基线对角线。

### 三、离线策略评估 (Offline Policy Evaluation, OPE)
评估因果决策策略 $\\pi(X) \\in \\{0, 1\\}$ 的商业价值：
$$\\widehat{V}(\\pi) = \\frac{1}{N} \\sum_{i=1}^N \\frac{\\mathbf{1}(D_i = \\pi(X_i))}{P(D_i = \\pi(X_i) \\mid X_i)} Y_i - c \\cdot \\pi(X_i)$$
其中 $c$ 为干预边际成本。该评估能在不上线真实流量前测算出因果策略的净 ROI。""",
            difficulty=2,
            tips=[
                tip("AUUC 的核心意义", "AUUC 衡量的是模型将'高增量敏感人群'排在前面、将'无增量与睡眠狗人群'排在后面的排序能力。")
            ]
        ),
        lesson(
            "causal-inference-l14-7",
            "算例拆解与自查清单：电商补贴定价场景下 CATE 建模与最优干预",
            """### 一、业务全景与客群四分类
某平台大促发放 20 元立减券（成本 $c = 20$ 元），单笔订单毛利 $R = 100$ 元。
用户可分为四类潜在画像：
1. **铁忠粉 (Sure Things, 30%)**：发不发券都会买。$\\tau = 0$。发券净亏损 20 元。
2. **敏感人群 (Persuadables, 15%)**：不发不买，发了才买。$\\tau = 1$。发券期望净毛利 $100 - 20 = +80$ 元。
3. **沉睡无关群 (Lost Causes, 50%)**：发不发都不买。$\\tau = 0$。
4. **反感打扰群 (Sleeping Dogs, 5%)**：原本要买，发营销短信激怒卸载。$\\tau = -1$。

### 二、策略收益大比拼（100 万大盘推演）
- **策略 A（全量发放）**：覆盖 100 万人，撬动净增量 10 万单，核销成本 800 万，净收益 = $100 \\times 10\\text{万} - 800\\text{万} = +200$ 万元。
- **策略 B（传统响应模型预测高买入概率前 30 万人）**：圈中的全是铁忠粉，增量为 0，核销成本 600 万，净收益 = $-600$ 万元（巨额亏损！）。
- **策略 C（因果森林最优策略）**：仅圈选 $\\widehat{\\tau}(X) > \\frac{20}{100} = 0.2$ 的敏感人群（15 万人），撬动净增量 15 万单，核销成本 300 万，净收益 = $100 \\times 15\\text{万} - 300\\text{万} = +1200$ 万元（为全量策略的 6 倍！）。

### 三、因果 Uplift 建模自查清单
- [ ] 1. **反事实评估合规**：绝不使用监督学习的 AUC/RMSE 评估 CATE 模型，必须绘制 Qini / AUUC 曲线。
- [ ] 2. **样本正交切分**：因果树算法必须开启 Honesty 诚实分割，杜绝因自产自销导致的选择偏差。
- [ ] 3. **样本不均衡选型**：干预组与对照组极度不平衡时优先选用 X-Learner。
- [ ] 4. **最优决策门槛**：干预阈值严格锚定成本收益比 $\\tau^* > c / R$。""",
            difficulty=2,
            tips=[
                tip("营销避坑铁律", "永远不要用购买概率高低来圈定发券名单，必须用因果增量 CATE 圈选！")
            ]
        )
    ]

    c14_exercises = [
        single_choice(
            "causal-inference-c14-e1",
            "关于条件平均处理效应 (CATE) $\\tau(x)$ 与全局平均处理效应 (ATE) 的关系，下列叙述正确的是：",
            [
                {"label": "根据全期望定理，ATE 等于 CATE 在协变量分布下的边缘期望，即 ATE = E[tau(X)]", "value": "A"},
                {"label": "如果全局 ATE 等于 0，则说明所有特征子群的 CATE 必然处处为 0", "value": "B"},
                {"label": "CATE 的取值必然严格大于 ATE", "value": "C"},
                {"label": "CATE 只能在线性回归中定义，非参数机器学习中不存在 CATE", "value": "D"},
            ],
            "A",
            "根据重期望法则，E[tau(X)] = E[E[Y(1) - Y(0) | X]] = E[Y(1) - Y(0)] = ATE。若 ATE = 0，完全可能是不同客群的正负效应相互抵消，CATE 绝不一定处处为 0。",
            difficulty=1,
            related_lesson_id="causal-inference-l14-1",
            tags=["CATE", "ATE", "重期望法则"],
        ),
        single_choice(
            "causal-inference-c14-e2",
            "在高维特征与复杂树模型中，直接使用 S-Learner 估计因果增量最容易产生的系统性问题是：",
            [
                {"label": "趋零收缩偏差 (Shrinkage to Zero)，干预变量 D 极易在树分裂或正则化中被忽略", "value": "A"},
                {"label": "效应无界发散，预测值趋于无穷大", "value": "B"},
                {"label": "只能拟合常数效应，无法识别连续变量", "value": "C"},
                {"label": "仅适用于干预组大于对照组 10 倍以上的数据", "value": "D"},
            ],
            "A",
            "S-Learner 拟合的是 Y 的总变异。由于干预变量只是众多特征中的一维，在主效应强烈的场景下，树分裂会倾向于忽略干预变量 D，导致 CATE 预测值严重收缩到 0。",
            difficulty=1,
            related_lesson_id="causal-inference-l14-2",
            tags=["S-Learner", "趋零收缩", "正则化偏差"],
        ),
        single_choice(
            "causal-inference-c14-e3",
            "Athey & Imbens (2016) 的因果树在节点分裂准则上与经典 CART 决策树的根本区别在于：",
            [
                {"label": "因果树以最大化子节点因果效应异质性并对小样本方差进行惩罚为目标，而非最小化 Y 的 MSE", "value": "A"},
                {"label": "因果树使用信息增益率，CART 使用基尼系数", "value": "B"},
                {"label": "因果树只能使用布尔二值特征进行分裂", "value": "C"},
                {"label": "因果树强制树深度必须小于等于 2", "value": "D"},
            ],
            "A",
            "CART 关注 Y 自身方差的减小（预测水平）；因果树关注子节点间处理效应差异的最大化（异质性增量），并包含样本方差惩罚项防止过拟合噪声。",
            difficulty=2,
            related_lesson_id="causal-inference-l14-3",
            tags=["因果树", "CART", "分裂准则"],
        ),
        single_choice(
            "causal-inference-c14-e4",
            "在因果树与因果森林中，实现“诚实估计 (Honest Estimation)”的核心做法是：",
            [
                {"label": "将训练数据正交切分为两份：一份用于决定树的分裂结构，另一份用于估计叶子内部的因果效应", "value": "A"},
                {"label": "在每个叶子节点中强制要求干预组与对照组样本数量绝对相等", "value": "B"},
                {"label": "对所有特征进行归一化并加入 L1 正则化", "value": "C"},
                {"label": "剔除所有预测残差超过 3 倍标准差的异常样本", "value": "D"},
            ],
            "A",
            "诚实性原则（Honesty）要求样本切分正交：Splitting 样本仅用于选切分点，Estimation 样本仅用于算效应，彻底消除预选择偏差（Pre-selection bias）。",
            difficulty=2,
            related_lesson_id="causal-inference-l14-4",
            tags=["诚实估计", "Honesty", "预选择偏差"],
        ),
        single_choice(
            "causal-inference-c14-e5",
            "某营销干预的单客边际成本为 15 元，成功转化带来的毛利为 60 元。若模型对某用户预测的 CATE（增量转化概率）为 0.20，最优决策应当是：",
            [
                {"label": "不干预，因为增量毛利 60 * 0.20 = 12 元低于成本 15 元，单客净亏损 3 元", "value": "A"},
                {"label": "施加干预，因为 CATE > 0，有正向转化提升", "value": "B"},
                {"label": "施加干预，因为转化率提升了 20% 属于业务显著提升", "value": "C"},
                {"label": "随机抽取 50% 概率进行干预", "value": "D"},
            ],
            "A",
            "最优干预门槛为 tau*(X) > c / R = 15 / 60 = 0.25。当前预测的 tau = 0.20 < 0.25，干预带来的毛利增量不足以覆盖直接成本，属于负收益干预。",
            difficulty=2,
            related_lesson_id="causal-inference-l14-7",
            tags=["最优干预策略", "CATE", "边际收益"],
        ),
        single_choice(
            "causal-inference-c14-e6",
            "广义随机森林 (GRF) 将森林视为自适应核回归器，样本 i 对测试点 x 的加权权重 alpha_i(x) 取决于：",
            [
                {"label": "样本 i 与测试点 x 在森林的所有树中落入同一个叶子节点的频率与叶子大小", "value": "A"},
                {"label": "样本 i 与测试点 x 在原始欧氏空间中的几何距离倒数", "value": "B"},
                {"label": "样本 i 的因果效应大小", "value": "C"},
                {"label": "样本 i 的倾向得分倒数", "value": "D"},
            ],
            "A",
            "GRF 通过树切分构建自适应最近邻度量，样本 i 与目标点 x 在所有树中共落入同一叶子的加权频率即为其核权重 alpha_i(x)。",
            difficulty=2,
            related_lesson_id="causal-inference-l14-5",
            tags=["广义随机森林", "GRF", "自适应核权重"],
        ),
        multiple_choice(
            "causal-inference-c14-e7",
            "为什么因果增量模型（Uplift）不能使用传统监督学习的 AUC 或 RMSE 进行评估？（多选）",
            [
                {"label": "因果推断存在反事实缺失，无法观测到个体层面的真实增量标签 tau_i", "value": "A"},
                {"label": "传统响应模型的评估指标倾向于奖励自然转化率高的客群，而这部分客群的增量往往接近 0", "value": "B"},
                {"label": "传统 AUC 无法反映对反向睡眠狗人群的识别与避让能力", "value": "C"},
                {"label": "因为因果效应必须大于 0，而 RMSE 支持负数预测", "value": "D"},
            ],
            ["A", "B", "C"],
            "A、B、C 均为因果评估的本质难点。D 错误：因果效应完全可以为负（如睡眠狗人群），因果评估不能用 RMSE 的根源是个体真值不可观测。",
            difficulty=2,
            related_lesson_id="causal-inference-l14-6",
            tags=["Uplift评估", "AUUC", "反事实不可观测"],
        ),
        multiple_choice(
            "causal-inference-c14-e8",
            "相比于 S-Learner 与 T-Learner，X-Learner 的突出优势体现在：（多选）",
            [
                {"label": "在干预组与对照组样本比例极不均衡时依然能保持稳健的高精度", "value": "A"},
                {"label": "通过构造反事实交叉残差，直接以因果增量作为回归目标", "value": "B"},
                {"label": "利用倾向得分动态加权两个效应估计器，优先倚重样本更充裕的一方", "value": "C"},
                {"label": "完全不需要任何因果可识别性假定即可估计因果效应", "value": "D"},
            ],
            ["A", "B", "C"],
            "A、B、C 准确阐释了 X-Learner 的三阶段机制与核心优势。D 错误：任何观测因果模型都依赖无混杂性、重叠性与 SUTVA 假定。",
            difficulty=3,
            related_lesson_id="causal-inference-l14-2",
            tags=["X-Learner", "交叉残差", "不平衡样本"],
        ),
        multiple_choice(
            "causal-inference-c14-e9",
            "因果森林采用诚实估计（Honest Trees）带来的关键理论性质包括：（多选）",
            [
                {"label": "消除了由于数据自适应选择最佳切分点带来的预选择高估偏差", "value": "A"},
                {"label": "在给定树结构下，估计样本上的叶子估计量具有条件无偏性", "value": "B"},
                {"label": "满足中心极限定理，能够给出渐近正态的置信区间与标准误", "value": "C"},
                {"label": "使得每棵树的叶子数量必然严格相等", "value": "D"},
            ],
            ["A", "B", "C"],
            "A、B、C 均为诚实性原则（Honesty）带来的统计理论奇迹。D 错误：诚实性正交切分不约束叶子数量相等。",
            difficulty=3,
            related_lesson_id="causal-inference-l14-4",
            tags=["诚实性原则", "条件无偏性", "渐近正态性"],
        ),
        judge(
            "causal-inference-c14-e10",
            "某业务活动中，算法发现'高客单老用户'的领券核销率高达 90%，因此最优因果决策应当是将所有优惠券集中发放给这部分高客单老用户。",
            False,
            "错误。核销率高代表绝对水平高，但这部分用户即便不发券也会下单（铁忠粉），发券的因果增量接近 0，纯粹损耗利润。最优策略应发放给增量最大的敏感客群。",
            difficulty=1,
            related_lesson_id="causal-inference-l14-7",
            tags=["转化率迷思", "铁忠粉", "决策误区"],
        ),
        judge(
            "causal-inference-c14-e11",
            "如果一条 Qini 曲线在覆盖人群比例超过 80% 之后呈现持续单调向下倾斜，说明最后 20% 的人群中存在平均干预效应为负的'睡眠狗'人群。",
            True,
            "正确。Qini 曲线纵轴为累积净增量。纳入后部人群导致总净增量下降，说明该部分人群接受干预后的响应低于不干预，属于负向反作用人群。",
            difficulty=2,
            related_lesson_id="causal-inference-l14-6",
            tags=["Qini曲线", "睡眠狗", "累积增益"],
        ),
        fill(
            "causal-inference-c14-e12",
            "在给定特征 $X=x$ 条件下的因果效应称为条件平均处理效应，英文简写为 [blank1]；在 Uplift 评估中，衡量模型因果排序能力的累积增益曲线下面积简称为 [blank2]。",
            [["CATE"], ["AUUC"]],
            "CATE 即 Conditional Average Treatment Effect；累积增量曲线面积简称为 AUUC (Area Under Uplift Curve)。",
            difficulty=2,
            related_lesson_id="causal-inference-l14-1",
            tags=["CATE", "AUUC", "核心指标"],
        ),
        open_ex(
            "causal-inference-c14-e13",
            "某在线教育平台准备对 200 万线索池进行电话外呼促销（单次外呼销售人力成本为 10 元，若转化课程客单净利为 200 元）。请设计一份完整的 CATE / Uplift 解决方案，涵盖：\n1. 探索性实验设计与训练集构建；\n2. 元学习器（X-Learner）与因果森林算法选型考量；\n3. 评估指标（Qini / AUUC 与留存验证集）构建；\n4. 最优决策门槛计算与全量投放 ROI 测算逻辑。",
            """1. 实验设计与数据准备：
- 避免直接使用历史已外呼数据（存在严重销售主观筛选混杂）。在 200 万线索池中随机抽取 10 万线索开展 RCT 探索实验：8 万人外呼（干预组 D=1），2 万人静默不呼（对照组 D=0）。收集用户线索特征 X（来源渠道、浏览时长、试听课完成度等）与购买转化结果 Y。

2. 算法建模与机制：
- 选用因果森林 (Causal Forest) 或 X-Learner。在线教育场景下自然转化率较低（约 2%~5%），数据存在明显的不平衡性，X-Learner 能通过两阶段残差插补与倾向得分加权有效抑制方差。
- 因果森林开启诚实切分（Honesty），将 10 万实验样本 5:5 划分为树结构分裂集与叶子效应估计集，彻底避免自产自销带来的虚假高增量。

3. 模型评估与验证：
- 在独立的保持测试集中，按预测因果效应 tau(X) 从大到小排序，绘制 Qini 曲线并计算 AUUC。对比随机外呼基线与全量外呼基线，确保模型在头部 20%~30% 人群累积增益陡峭，具有显著的因果排序能力。

4. 商业决策与投放 ROI：
- 边际成本 c = 10 元，单客增量毛利 R = 200 元。
- 最优外呼准入阈值为：tau*(X) > c / R = 10 / 200 = 0.05（即模型预测该线索通过电话外呼能带来 5% 以上的增量转化率）。
- 仅对满足 tau(X_i) > 0.05 的人群拨打电话。
- 相比无差别盲打 200 万线索（人力成本高达 2000 万元，且大量骚扰沉默用户），因果策略将外呼集中在敏感人群，大幅缩减销售团队成本，实现平台净利润最大化。""",
            "掌握基于 CATE/Uplift 的商业化闭环设计：RCT小流量冷启动、X-Learner/因果森林选型与Honesty保障、Qini/AUUC因果评估，以及严格按成本收益比设定干预门槛。",
            [
                {"point": "设计合理的小流量随机实验并解释克服选择性偏差的逻辑", "score": 2},
                {"point": "深入对比 X-Learner 或因果森林并阐述 Honesty 机制作用", "score": 1},
                {"point": "建立 Qini / AUUC 评估体系并解释与传统 AUC 的区别", "score": 1},
                {"point": "精准计算最优决策阈值 tau* = c / R = 0.05 并测算商业净利润", "score": 1},
            ],
            exemplar="""【工业级方案推演】
1. 小流量保持对照实验：
在 200 万潜客中随机抽样 10 万人，其中 8 万人外呼（干预），2 万人静默（对照），确保 (Y(1), Y(0)) 独立于 D。

2. 算法选型与训练：
使用 X-Learner 克服低转化率数据极度不均衡的方差问题；结合因果森林开启 Honesty 样本正交分裂，彻底避免预选择高估偏差。

3. 评估体系：
在验证集上计算 Qini 曲线与 AUUC，剔除睡眠狗客群（tau < 0），确保排名前列的用户增量斜率最大。

4. 决策门槛与 ROI：
阈值 tau* = 10 / 200 = 0.05。仅外呼预测增量大于 5% 的线索，将营销 ROI 提升数倍。""",
            difficulty=5,
            related_lesson_id="causal-inference-l14-7",
            tags=["工业级Uplift", "方案设计", "商业决策", "端到端实战"],
        ),
    ]

    ch14 = chapter(
        "causal-inference-c14",
        "causal-inference",
        14,
        "异质性因果效应与因果树/因果森林",
        "突破全局平均效应局限，系统掌握 CATE、经典元学习器 (S/T/X-Learner)、因果树分裂准则、诚实估计 (Honesty) 原则、广义随机森林 (GRF) 以及工业级 Uplift / Qini 评估与决策体系。",
        c14_lessons,
        c14_exercises,
    )
    return ch14

if __name__ == "__main__":
    ch = get_chapter_14()
    print(f"Chapter 14 validated: {len(ch['lessons'])} lessons, {len(ch['exercises'])} exercises.")
