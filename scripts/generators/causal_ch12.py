# -*- coding: utf-8 -*-
"""
Causal Inference - Chapter 12: Panel Data and Fixed Effects
"""

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_12():
    c12_lessons = [
        lesson(
            "causal-inference-l12-1",
            "面板数据（Panel Data）的独特魔力：同时控制个体固定异质性",
            """### 纵向追踪数据的因果威力
在截面数据（Cross-sectional Data）中，我们只能在某一个瞬间看到“张三”和“李四”，永远无法知道张三和李四之间那些天生不平等的固定性格、智商、家庭背景（未测混杂）。
**面板数据（Panel / Longitudinal Data）**对相同的个体在多个连续时间步进行重复追踪观测（下标为 $i$ 代表个体，$t$ 代表时间）。

#### 个体固定效应的数学提炼：
$$Y_{it} = \\beta_1 D_{it} + \\boldsymbol{\\gamma}^T \\mathbf{X}_{it} + \\alpha_i + \\epsilon_{it}$$
- $\\alpha_i$ 为**个体固定效应（Individual Fixed Effect）**：代表个体 $i$ 所拥有的**所有不随时间改变的固有特征的集合**（如张三与生俱来的智商、基因、童年教养、企业创立时的地理基因与底层文化）。
- **神奇破局**：在很多经济与商业场景中，最棘手的混杂变量正是这些不随时间改变的先天资质 $\\alpha_i$！
- 统计学家发明了精妙的代数技巧，能够在**完全不测量、不知道 $\\alpha_i$ 到底包含什么的情况下，直接在数学上将 $\\alpha_i$ 连根拔起彻底消解消除！**""",
            difficulty=1,
            tips=[
                tip("面板数据使得每个个体能够充当自身的反事实基线：通过观察同一个体在不同时间干预状态切换时的表现消偏！", "note"),
            ],
        ),
        lesson(
            "causal-inference-l12-2",
            "一阶差分估计量（First Differences, FD）：消解个体效应",
            """### 最直观的消除固定效应手法：相邻期相减
考虑两期面板数据（$t = 1, 2$）：
- 时期 1：$Y_{i1} = \\beta_0 + \\beta_1 D_{i1} + \\alpha_i + \\epsilon_{i1}$
- 时期 2：$Y_{i2} = (\\beta_0 + \\lambda) + \\beta_1 D_{i2} + \\alpha_i + \\epsilon_{i2}$

#### 一阶差分操作（$\\Delta Y_i = Y_{i2} - Y_{i1}$）：
对同一个体 $i$ 在两期之间的数值直接做减法：
$$(Y_{i2} - Y_{i1}) = \\lambda + \\beta_1 (D_{i2} - D_{i1}) + (\\alpha_i - \\alpha_i) + (\\epsilon_{i2} - \\epsilon_{i1})$$
$$\\Delta Y_i = \\lambda + \\beta_1 \\Delta D_i + \\Delta \\epsilon_i$$

#### 奇迹发生：
- 个体固定效应项 $\\alpha_i - \\alpha_i = 0$ **被完全对消抵消！**
- 所有不随时间改变的不可观测个体异质性（无论包含多少亿个混杂因素），在差分后**彻底灰飞烟灭**！
- 对差分后的新变量运行简单的 OLS 回归，求出的斜率就是对真实因果效应 $\\beta_1$ 的无偏一致估计量！""",
            difficulty=2,
            tips=[
                tip("当面板时期 T = 2 时，一阶差分（FD）估计量与固定效应（FE）组内变换估计量在代数上完全严格等价！", "interview"),
            ],
        ),
        lesson(
            "causal-inference-l12-3",
            "组内离均差变换（Within Transformation）与 FE 估计量",
            """### 当时间跨度大于 2 期时的黄金解法：组内去均值
当追踪时期较长（$T \\ge 3$）时，更通用的方法是**组内变换（Within Transformation / Fixed Effects Estimator）**。

#### 组内离均差去均值操作步骤：
设真实模型：$Y_{it} = \\beta_1 D_{it} + \\alpha_i + \\epsilon_{it}$。
1. **计算每个个体自身的时间序列均值**：
   对个体 $i$ 的 $T$ 期数据求算术平均：
   $$\\bar{Y}_i = \\frac{1}{T} \\sum_{t=1}^T Y_{it} = \\beta_1 \\bar{D}_i + \\alpha_i + \\bar{\\epsilon}_i$$
   （注意：因为 $\\alpha_i$ 不随时间改变，其均值等于其自身 $\\bar{\\alpha}_i = \\alpha_i$！）。
2. **两式相减（De-meaning / 离均差变换）**：
   $$(Y_{it} - \\bar{Y}_i) = \\beta_1 (D_{it} - \\bar{D}_i) + (\\alpha_i - \\alpha_i) + (\\epsilon_{it} - \\bar{\\epsilon}_i)$$
   记中心化离均差为 $\\ddot{Y}_{it} = Y_{it} - \\bar{Y}_i, \\; \\ddot{D}_{it} = D_{it} - \\bar{D}_i$：
   $$\\ddot{Y}_{it} = \\beta_1 \\ddot{D}_{it} + \\ddot{\\epsilon}_{it}$$
3. **纯净无偏的 OLS 求解**：
   个体效应 $\\alpha_i$ 再次被彻底清除！对离均差数据运行 OLS 所得的估计量即为**固定效应估计量（FE Estimator / Within Estimator）**。
- **代价红线**：所有自身不随时间改变的特征（如性别、出生地），其离均差 $\\ddot{X}_{it} = 0$，其系数在 FE 模型中无法被估计，全部被吸收！""",
            difficulty=2,
            tips=[
                tip("虚拟变量最小二乘法（LSDV）：为每一个个体设置一个哑变量的回归，在代数上与组内去均值完全等价，但大样本下会导致附带参数灾难。", "tip"),
            ],
        ),
        lesson(
            "causal-inference-l12-4",
            "随机效应模型（Random Effects）与豪斯曼检验（Hausman Test）",
            """### 究竟该选固定效应（FE）还是随机效应（RE）？
除了固定效应，计量经济学还有另一流派：**随机效应模型（Random Effects, RE）**。

#### 两种模型的根本哲学分野：
1. **固定效应模型（Fixed Effects, FE）**：
   - 假定：允许个体未测异质性 $\\alpha_i$ 与解释变量 $D_{it}$ 存在任意的**相关性（$\\text{Cov}(\\alpha_i, D_{it}) \\neq 0$）**！
   - 优点：对混杂极度稳健，因果一致性极高，是因果推断的主流偏好。
2. **随机效应模型（Random Effects, RE）**：
   - 假定：强行假设个体未测特征 $\\alpha_i$ 与自变量完全外生独立（$\\text{Cov}(\\alpha_i, D_{it}) = 0$）！
   - 优点：可以使用广义最小二乘法（GLS）估计不随时变的特征（如性别），且标准误更小（更具统计效率）。
   - 致命弱点：一旦现实中 $\\alpha_i$ 与自变量相关（自选择），RE 估计量全线有偏报废！

#### 裁判长：豪斯曼检验（Hausman Specification Test）
- **原假设 $H_0$**：$\\text{Cov}(\\alpha_i, D_{it}) = 0$（个体效应完全外生独立，RE 与 FE 均无偏，但 RE 更有效率）。
- **备择假设 $H_1$**：$\\text{Cov}(\\alpha_i, D_{it}) \\neq 0$（存在内生性混杂，RE 严重有偏，只有 FE 是无偏一致的）。
- **检验统计量**：
  $$H = (\\hat{\\boldsymbol{\\beta}}_{\\text{FE}} - \\hat{\\boldsymbol{\\beta}}_{\\text{RE}})^T \\Big[ \\text{Var}(\\hat{\\boldsymbol{\\beta}}_{\\text{FE}}) - \\text{Var}(\\hat{\\boldsymbol{\\beta}}_{\\text{RE}}) \\Big]^{-1} (\\hat{\\boldsymbol{\\beta}}_{\\text{FE}} - \\hat{\\boldsymbol{\\beta}}_{\\text{RE}}) \\sim \\chi^2(k)$$
- **决策规则**：
  - **若 $p < 0.05$**：坚决拒绝原假设，确诊存在内生性，**一律强制采用固定效应模型（FE）！**
  - **若 $p > 0.05$**：无法拒绝原假设，方可考虑随机效应模型。实证因果推断通常默认采用 FE。""",
            difficulty=3,
            tips=[
                tip("在绝大部分微观企业和用户数据中，个人的未测能力必然与努力程度相关，豪斯曼检验几乎 99% 会拒绝原假设支持 FE！", "interview"),
            ],
        ),
        lesson(
            "causal-inference-l12-5",
            "双向固定效应模型（TWFE）：个体效应 + 时间效应",
            """### 现代实证经济学的标准基底架构
真实面板数据不仅面临个体层面的固有差异，还面临全大盘面临的**宏观时间趋势（Time Shock）**（如通胀、疫情大流行、节假日季节性）。

#### 双向固定效应（Two-Way Fixed Effects, TWFE）模型：
$$Y_{it} = \\beta_1 D_{it} + \\boldsymbol{\\gamma}^T \\mathbf{X}_{it} + \\alpha_i + \\lambda_t + \\epsilon_{it}$$
- $\\alpha_i$：**个体固定效应（Entity Fixed Effects）** —— 吸收所有“个体固有、不随时间变”的混杂；
- $\\lambda_t$：**时间固定效应（Time Fixed Effects）** —— 吸收所有“随时间变动、但所有个体平等面临”的宏观外生冲击（相当于为每一个时间年份/月份加入时间哑变量）；
- $\\epsilon_{it}$：特异残差项。

#### 双重组内离均差变换（Double De-meaning）：
在代数层面上，TWFE 等价于将数据进行双重中心化：
$$\\ddot{Y}_{it} = (Y_{it} - \\bar{Y}_i - \\bar{Y}_t + \\bar{Y})$$
同时减去个体均值和时期均值，再加上全样本总均值！
- 威力：一举将“个体固定先天天资”与“大盘宏观时间浪潮”两道最大的混杂山峰同时彻底荡平！""",
            difficulty=2,
            tips=[
                tip("TWFE 模型实质上是经典 DID 模型在多期、多个体、多控制变量下的通用矩阵拓展表达！", "note"),
            ],
        ),
        lesson(
            "causal-inference-l12-6",
            "面板固定效应的致命局限与时变内生性陷阱",
            """### 千万不要迷信固定效应：它不是万能药！
很多数据分析师误以为：“只要我在模型里加上了 `fe`，我的模型就绝对因果无偏了”。**这是极其幼稚且致命的幻觉！**

#### 固定效应绝对无法解决的四大内生性死穴：
1. **随时间变化的不可测混杂（Time-Varying Unobservables）**：
   - FE 只能消除不随时间改变的 $\\alpha_i$！
   - 如果某个未测混杂本身随着时间发生漂移（如某个企业在第 3 年引入了一位极其优秀的 CEO，或者用户在下半年突然顿悟自律发奋图强），这种时变能力提升与处理同时发生，**FE 完全无法消除该偏误！**
2. **反向因果与动态反馈（Reverse Causality & Feedback）**：
   - 结局 $Y_{it}$ 的变动反过来影响下一期的干预决策 $D_{i, t+1}$（如警察巡逻与犯罪率的相互动态博弈）。必须采用动态面板 GMM（Arellano-Bond 差分 GMM）解决。
3. **处理变量测量误差放大（Measurement Error Attenuation）**：
   - 组内去均值会剔除大量真实信号变异，导致残差中噪声占比剧烈升高，导致衰减偏误（Attenuation Bias）被严重放大，估计系数人为向 0 萎缩。""",
            difficulty=3,
            tips=[
                tip("面试核心考点：'固定效应能解决时变遗漏变量吗？' 必须毫不犹豫秒答：绝对不能！", "interview"),
            ],
        ),
        lesson(
            "causal-inference-l12-7",
            "算例拆解与自查清单：从企业面板到固定效应实算全流程",
            """### 算例拆解：企业数字化转型对人均产出的面板核算
某研究评估“企业引入 ERP 数字化管理系统（$D_{it} \\in \\{0, 1\\}$）”对“员工人均创收（$Y_{it}$，万元）”的影响。
收集 2 家企业（A 和 B）在 2 个时期的极简面板数据：

| 企业 $i$ | 时期 $t$ | ERP 处理 $D_{it}$ | 观测创收 $Y_{it}$ | 企业固定底蕴 $\\alpha_i$ |
| :--- | :--- | :--- | :--- | :--- |
| A | 1 | 0 | 20 | $\\alpha_A = 15$ |
| A | 2 | 1 | 28 | $\\alpha_A = 15$ |
| B | 1 | 0 | 10 | $\\alpha_B = 5$ |
| B | 2 | 0 | 12 | $\\alpha_B = 5$ |

#### 1. 朴素截面 OLS 的严重偏误：
若仅看时期 2 的截面数据：企业 A（ERP组，28万） vs 企业 B（对照组，12万）。
粗暴得出因果效应为 $28 - 12 = +16$ 万元！把 A 企业天生高底蕴（$\\alpha_A = 15$ vs $\\alpha_B = 5$，差额 10 万）全部误当成了 ERP 的疗效。

#### 2. 一阶差分法（FD）实算：
- 企业 A（处理组）：$\\Delta Y_A = Y_{A2} - Y_{A1} = 28 - 20 = +8$ 万元，$\\Delta D_A = 1 - 0 = 1$
- 企业 B（对照组）：$\\Delta Y_B = Y_{B2} - Y_{B1} = 12 - 10 = +2$ 万元，$\\Delta D_B = 0 - 0 = 0$
- 差分回归方程：$\\Delta Y_i = \\lambda + \\beta_1 \\Delta D_i$
  - 当 $\\Delta D = 0$ 时，$\\lambda = +2$（大盘自然通胀时间趋势）；
  - 当 $\\Delta D = 1$ 时，$\\lambda + \\beta_1 = +8 \\implies \\beta_1 = 8 - 2 = +6$ 万元！

#### 3. 组内去均值（Within FE）实算：
- 企业 A 均值：$\\bar{Y}_A = (20+28)/2 = 24$, $\\bar{D}_A = 0.5$
  - 时期 1 离均差：$\\ddot{Y}_{A1} = 20 - 24 = -4$, $\\ddot{D}_{A1} = 0 - 0.5 = -0.5$
  - 时期 2 离均差：$\\ddot{Y}_{A2} = 28 - 24 = +4$, $\\ddot{D}_{A2} = 1 - 0.5 = +0.5$
- 拟合斜率：
  $$\\hat{\\beta}_1^{\\text{FE}} = \\frac{\\sum \\ddot{D}_{it} \\ddot{Y}_{it}}{\\sum \\ddot{D}_{it}^2} = \\frac{(-0.5)(-4) + (0.5)(4)}{(-0.5)^2 + (0.5)^2} = \\frac{2 + 2}{0.25 + 0.25} = \\frac{4}{0.50} = +8.0$$
  （扣除时间固定效应后纯净因果净增量为稳定的 6.0 万元！完全洗净企业先天底蕴混杂）。

---

### 第十二章自查清单：
- [ ] 面对具有重复观测主体的追踪数据，是否优先构建了面板模型？
- [ ] 是否深刻掌握组内去均值（Within Transformation）完全清除 $\\alpha_i$ 的代数原理？
- [ ] 是否运行了豪斯曼检验（Hausman Test）确认是否支持固定效应 FE（$p < 0.05$）？
- [ ] 是否意识到任何不随时间变动的静态先验特征无法在 FE 中直接估计？
- [ ] 是否高度警惕了时变不可测混杂（Time-varying confounders）对 FE 的侵蚀？""",
            difficulty=2,
            tips=[
                tip("固定效应是控制不可测混杂的绝佳武器，但永远牢记其边界仅限于'不随时间变动'的特征。", "quote"),
            ],
        ),
    ]

    c12_exercises = [
        single_choice(
            "causal-inference-c12-e1",
            "在计量经济学与因果推断中，面板固定效应模型（Fixed Effects, FE）最核心、最无可替代的因果消偏能力在于：",
            [
                {"label": "彻底消除了处理变量中所有的随机测量误差", "value": "A"},
                {"label": "在完全不需要观测其具体内容的前提下，能够在数学上彻底完全消除所有'个体固有、不随时间流逝而改变'的不可测遗漏混杂变量", "value": "B"},
                {"label": "保证模型在样本量只有 3 个时也能给出精确 t 统计量", "value": "C"},
                {"label": "自动使所有非线性关系变为严格一阶线性关系", "value": "D"},
            ],
            "B",
            "FE 模型通过组内去均值或一阶差分，消除了所有不随时间变化的个体固定效应 α_i，从而彻底排除了先天资质、企业文化等不可测固定混杂。",
            difficulty=1,
            related_lesson_id="causal-inference-l12-1",
            tags=["固定效应", "FE消偏", "不可测混杂"],
        ),
        single_choice(
            "causal-inference-c12-e2",
            "组内离均差变换（Within Transformation）作为固定效应估计量的标准数学计算操作，其具体执行步骤是：",
            [
                {"label": "对所有变量取对数后计算一阶差分", "value": "A"},
                {"label": "计算每个个体自身在考察时间区间内的序列算术均值，将该个体每个时期的观测值减去其自身的均值（Y_it - Ȳ_i）", "value": "B"},
                {"label": "将所有个体的数值减去全大盘的全局总均值", "value": "C"},
                {"label": "用主成分分析提取第一主成分", "value": "D"},
            ],
            "B",
            "组内变换（Within Transformation）将每个个体的时序变量减去该个体自身的跨期均值，使不随时变的个体固定效应 α_i 被减法完全对消为 0。",
            difficulty=2,
            related_lesson_id="causal-inference-l12-3",
            tags=["组内变换", "去均值操作", "FE实现"],
        ),
        single_choice(
            "causal-inference-c12-e3",
            "在面板数据分析中，用于在固定效应模型（FE）与随机效应模型（RE）之间做出统计学判决的经典检验是：",
            [
                {"label": "怀特检验（White Test）", "value": "A"},
                {"label": "豪斯曼检验（Hausman Specification Test）", "value": "B"},
                {"label": "迪基-福勒检验（ADF 检验）", "value": "C"},
                {"label": "格兰杰因果检验", "value": "D"},
            ],
            "B",
            "豪斯曼检验检验个体效应与自变量是否相关。若拒绝原假设（p < 0.05），说明存在内生性混杂，RE 有偏，必须采用 FE 模型。",
            difficulty=1,
            related_lesson_id="causal-inference-l12-4",
            tags=["豪斯曼检验", "Hausman Test", "FE vs RE"],
        ),
        single_choice(
            "causal-inference-c12-e4",
            "在标准个体固定效应模型（FE）中，若研究者试图在自变量中加入一个“个体不随时间改变的静态特征”（例如员工的出生籍贯省份、企业的创始年份）：",
            [
                {"label": "该变量的系数会极其显著，t 值突破 100", "value": "A"},
                {"label": "由于该变量的组内离均差恒等于 0（完全缺乏时间维度变异），其系数在代数上完全无法估计，会被回归软件自动作为完全共线性而剔除（Omitted）", "value": "B"},
                {"label": "该变量会自动将整个模型转为泊松回归", "value": "C"},
                {"label": "会导致所有其他变量的系数自动变为 0", "value": "D"},
            ],
            "B",
            "FE 模型依靠组内时间变异识别系数。不随时变的静态特征在减去自身均值后恒为 0，缺乏任何组内方差，因而其主效应无法在 FE 中直接识别。",
            difficulty=2,
            related_lesson_id="causal-inference-l12-3",
            tags=["静态变量吸收", "组内方差缺失", "FE局限"],
        ),
        single_choice(
            "causal-inference-c12-e5",
            "关于一阶差分估计量（FD）与组内固定效应估计量（FE）的对比，下列说法严格正确的是：",
            [
                {"label": "当时期 T = 2 时，一阶差分估计量与固定效应估计量在数值与代数上完全严格等价", "value": "A"},
                {"label": "FD 只能用于离散数据，FE 只能用于连续数据", "value": "B"},
                {"label": "无论 T 多大，两者数值永远绝对相同", "value": "C"},
                {"label": "FD 会完全保留个体固定效应 α_i", "value": "D"},
            ],
            "A",
            "在 T=2 的极简两期面板中，离均差变动与一阶差分只是按标量常数缩放，二者估计出的回归斜率完全恒等；在 T > 2 时，残差自相关结构决定二者效率取舍。",
            difficulty=2,
            related_lesson_id="causal-inference-l12-2",
            tags=["FD与FE等价性", "两期面板", "代数性质"],
        ),
        multiple_choice(
            "causal-inference-c12-e6",
            "关于双向固定效应（Two-Way Fixed Effects, TWFE）模型 $Y_{it} = \\beta_1 D_{it} + \\boldsymbol{\\gamma}^T \\mathbf{X}_{it} + \\alpha_i + \\lambda_t + \\epsilon_{it}$ 的表述，正确的有：",
            [
                {"label": "α_i 为个体固定效应，吸收了所有个体固有且不随时间变化的先天未测特征", "value": "A"},
                {"label": "λ_t 为时间固定效应，吸收了所有在宏观上随时间演进、但对所有个体产生同等影响的外生时间冲击", "value": "B"},
                {"label": "在代数计算上，它等价于对数据同时扣除个体均值和时间截面均值（双重去均值）", "value": "C"},
                {"label": "它能够彻底解决所有随时间发生剧烈漂移的个体层级未测混杂变量", "value": "D"},
            ],
            ["A", "B", "C"],
            "A、B、C 完整表达了 TWFE 的机制与代数操作。D 属于严重误解：随时间变化的个体特异未测混杂变量（如个人后天突发学习自律提升）无法被 FE 或 TWFE 消除。",
            difficulty=2,
            related_lesson_id="causal-inference-l12-5",
            tags=["TWFE模型", "双重去均值", "时间效应", "多选题"],
        ),
        multiple_choice(
            "causal-inference-c12-e7",
            "在实证因果推断中，虽然面板固定效应模型（FE）非常强大，但它依然**完全无法解决**的内生性威胁包括：",
            [
                {"label": "随时间变化的个体不可测混杂（Time-Varying Unobservables）：例如企业在某年突击更换了极有魄力的新管理团队", "value": "A"},
                {"label": "反向因果与动态反馈偏差（Simultaneity & Reverse Causality）：当期的结局变动直接反向影响下一期的策略投入", "value": "B"},
                {"label": "自变量测量误差放大（Measurement Error）：去均值抹平了真实变异，导致残差中噪声信噪比恶化，引发更严重的向零衰减偏误", "value": "C"},
                {"label": "个体不随时间变动的先天家庭出身背景混杂", "value": "D"},
            ],
            ["A", "B", "C"],
            "A、B、C 是面板 FE 模型面临的三大著名软肋。D 是 FE 模型最擅长消解的核心优势（属于不随时间变动的固有混杂），不是无法解决的问题。",
            difficulty=3,
            related_lesson_id="causal-inference-l12-6",
            tags=["FE局限性", "时变混杂", "反向因果", "测量误差", "多选题"],
        ),
        judge(
            "causal-inference-c12-e8",
            "在处理面板数据时，只要分析师在 Stata 中运行了 `xtreg y x, fe` 或在 Python 中加入了个体虚拟变量，就等于完全消除了所有遗漏变量偏误，结论百分之百具有因果确定性。",
            False,
            "错误。FE 只能消除不随时变的个体异质性。如果存在随时间推移而演化的时变未测混杂（Time-varying confounders）或反向因果，FE 回归依然存在严重内生性偏误。",
            difficulty=1,
            related_lesson_id="causal-inference-l12-6",
            tags=["FE万能论破除", "时变遗漏变量", "判断题"],
        ),
        judge(
            "causal-inference-c12-e9",
            "豪斯曼检验（Hausman Test）的原假设是个体随机效应与解释变量不相关（Cov(α_i, X_it) = 0）；当实证检验输出 p < 0.01 拒绝原假设时，说明随机效应模型存在严重内生性偏误，分析师应当果断选用固定效应模型（FE）。",
            True,
            "正确。拒绝原假设表明 α_i 与解释变量显著相关，违背了随机效应 RE 的核心外生性假设，只有固定效应 FE 能够保持一致无偏性。",
            difficulty=2,
            related_lesson_id="causal-inference-l12-4",
            tags=["豪斯曼检验决策", "RE内生性", "判断题"],
        ),
        fill(
            "causal-inference-c12-e10",
            "面板数据（Panel Data）相比于纯截面数据，其最本质的结构特征是同时包含两个维度：____维度（跨不同个体）与____维度（跨不同时间步）。",
            ["截面", "时间"],
            "面板数据由横截面维度（Cross-sectional）与时间序列维度（Time-series）二维嵌套构成。",
            difficulty=1,
            related_lesson_id="causal-inference-l12-1",
            tags=["面板数据结构", "二维矩阵", "填空题"],
        ),
        fill(
            "causal-inference-c12-e11",
            "在面板数据计量中，用于检验个体效应与解释变量是否外生独立、进而判定采用固定效应还是随机效应的检验称为____检验（填写学者英文姓氏 Hausman 检验）。",
            ["Hausman"],
            "Jerry Hausman (1978) 创立的 Hausman Specification Test 是面板模型选型的通用标准。",
            difficulty=1,
            related_lesson_id="causal-inference-l12-4",
            tags=["Hausman检验", "填空题"],
        ),
        open_ex(
            "causal-inference-c12-e12",
            "请完成面板数据组内固定效应变换（Within Transformation）彻底消解个体未测异质性 $\\alpha_i$ 的严谨数学推导：\n设平衡面板数据生成过程满足：\n$$Y_{it} = \\beta X_{it} + \\alpha_i + \\epsilon_{it}, \\quad i = 1, \\dots, N; \\; t = 1, \\dots, T$$\n其中 $\\alpha_i$ 为可能与解释变量 $X_{it}$ 存在任意未知相关性的不可观测个体固定效应（$\\text{Cov}(\\alpha_i, X_{it}) \\neq 0$），$\\epsilon_{it}$ 满足严格外生性假定 $E[\\epsilon_{it} \\mid X_{i1}, \\dots, X_{iT}, \\alpha_i] = 0$。\n1. 定义时间序列算术平均值 $\\bar{Y}_i = \\frac{1}{T} \\sum_{t=1}^T Y_{it}, \\; \\bar{X}_i = \\frac{1}{T} \\sum_{t=1}^T X_{it}, \\; \\bar{\\epsilon}_i = \\frac{1}{T} \\sum_{t=1}^T \\epsilon_{it}$，写出个体均值方程；\n2. 将原方程减去个体均值方程，严格推导离均差方程 $\\ddot{Y}_{it} = \\beta \\ddot{X}_{it} + \\ddot{\\epsilon}_{it}$，证明 $\\alpha_i$ 被完全消除；\n3. 写出固定效应估计量 $\\hat{\\beta}_{\\text{FE}}$ 的 OLS 闭式解，并严格证明其无偏性 $E[\\hat{\\beta}_{\\text{FE}} \\mid \\mathbf{X}] = \\beta$。",
            """推导步骤如下：
1. 建立个体均值方程：
   对原方程两端对时间 t = 1, ..., T 求和并除以 T：
   (1/T) ∑_{t=1}^T Y_{it} = β · (1/T) ∑_{t=1}^T X_{it} + (1/T) ∑_{t=1}^T α_i + (1/T) ∑_{t=1}^T ε_{it}
   由于 α_i 不随时间改变，为对于时间求和的常数项：
   (1/T) ∑_{t=1}^T α_i = (1/T) · (T · α_i) = α_i
   代入简写记号：
   Ȳ_i = β X̄_i + α_i + ε̄_i  (式 1)

2. 组内去均值（两式相减）：
   将原始方程 Y_{it} = β X_{it} + α_i + ε_{it} 减去个体均值方程（式 1）：
   (Y_{it} - Ȳ_i) = β (X_{it} - X̄_i) + (α_i - α_i) + (ε_{it} - ε̄_i)
   注意中间项：
   α_i - α_i ≡ 0
   定义离均差变量：
   Ÿ_{it} = Y_{it} - Ȳ_i
   Ẍ_{it} = X_{it} - X̄_i
   ε̈_{it} = ε_{it} - ε̄_i
   得到纯净变换方程：
   Ÿ_{it} = β Ẍ_{it} + ε̈_{it}  (式 2)
   证毕。个体未测混杂 α_i 被完全、彻底消除，消除了内生性。

3. OLS 闭式解与无偏性证明：
   对去均值方程（式 2）运行标准 OLS 回归：
   β̂_{FE} = [ ∑_{i=1}^N ∑_{t=1}^T Ẍ_{it} Ÿ_{it} ] / [ ∑_{i=1}^N ∑_{t=1}^T Ẍ_{it}^2 ]
   将 Ÿ_{it} = β Ẍ_{it} + ε̈_{it} 代入：
   β̂_{FE} = [ ∑_{i=1}^N ∑_{t=1}^T Ẍ_{it} (β Ẍ_{it} + ε̈_{it}) ] / [ ∑_{i=1}^N ∑_{t=1}^T Ẍ_{it}^2 ]
          = β + [ ∑_{i=1}^N ∑_{t=1}^T Ẍ_{it} ε̈_{it} ] / [ ∑_{i=1}^N ∑_{t=1}^T Ẍ_{it}^2 ]
   两边取关于所有 X 矩阵的条件期望：
   E[β̂_{FE} | X] = β + E[ [ ∑ Ẍ_{it} ε̈_{it} ] / [ ∑ Ẍ_{it}^2 ] | X ]
   由于严格外生性假定 E[ε_{it} | X] = 0，可知 E[ε̄_i | X] = 0，从而 E[ε̈_{it} | X] = 0。
   因此第二项分子条件期望严格为 0：
   E[β̂_{FE} | X] = β
   严格证明了组内固定效应估计量是在存在严重内生个体混杂（Cov(α_i, X_it) ≠ 0）下依然严格无偏一致的因果估计量。""",
            "考察面板均值方程展开、α_i 恒等对消证明、离均差方程建立、以及 OLS 闭式解在严格外生性下的条件无偏性证明。",
            [
                {"point": "正确写出个体均值方程并证明 (1/T) ∑ α_i = α_i", "score": 1},
                {"point": "相减消去 α_i 严格导出离均差方程 Ÿ_{it} = β Ẍ_{it} + ε̈_{it}", "score": 1},
                {"point": "规范写出 β̂_FE 闭式解并结合严格外生性 E[ε̈_{it}|X]=0 证明条件无偏性", "score": 2},
            ],
            exemplar="""【面板数据组内固定效应变换（Within Transformation）与无偏性严密数学推导】：

一、模型设定与严格外生性假定：
设平衡面板数据结构方程为：
$$Y_{it} = \\beta X_{it} + \\alpha_i + \\epsilon_{it}, \\quad i = 1, \\dots, N; \\; t = 1, \\dots, T$$
其中：
- $X_{it}$ 为核心解释变量；
- $\\alpha_i$ 为个体未观测固定效应，允许与解释变量存在任意内生相关性：$\\text{Cov}(\\alpha_i, X_{it}) \\neq 0$；
- 误差项满足严格外生性公理（Strict Exogeneity Assumption）：
  $$E[\\epsilon_{it} \\mid \\mathbf{X}_i, \\alpha_i] = 0, \\quad \\forall t = 1, \\dots, T$$
  其中 $\\mathbf{X}_i = (X_{i1}, X_{i2}, \\dots, X_{iT})^T$ 包含个体 $i$ 在全部 $T$ 个时期的自变量信息。

二、个体时间均值方程与消元代数推导：
1. 建立时间均值方程：
   对原方程两端关于时间指标 $t$ 在区间 $[1, T]$ 上累加求和并同除以 $T$：
   $$\\frac{1}{T} \\sum_{t=1}^T Y_{it} = \\beta \\left( \\frac{1}{T} \\sum_{t=1}^T X_{it} \\right) + \\frac{1}{T} \\sum_{t=1}^T \\alpha_i + \\frac{1}{T} \\sum_{t=1}^T \\epsilon_{it}$$
   定义变量的时间序列标量均值：
   $$\\bar{Y}_i = \\frac{1}{T} \\sum_{t=1}^T Y_{it}, \\quad \\bar{X}_i = \\frac{1}{T} \\sum_{t=1}^T X_{it}, \\quad \\bar{\\epsilon}_i = \\frac{1}{T} \\sum_{t=1}^T \\epsilon_{it}$$
   关键分析：由于固定效应 $\\alpha_i$ 随时间恒定不变，其在时间轴上的平均值严格等于自身：
   $$\\frac{1}{T} \\sum_{t=1}^T \\alpha_i = \\frac{1}{T} (T \\cdot \\alpha_i) = \\alpha_i$$
   由此导出个体均值方程：
   $$\\bar{Y}_i = \\beta \\bar{X}_i + \\alpha_i + \\bar{\\epsilon}_i \\quad \\text{(式 1)}$$

2. 执行组内离均差变换（De-meaning）：
   将原始方程 $Y_{it} = \\beta X_{it} + \\alpha_i + \\epsilon_{it}$ 减去个体均值方程（式 1）：
   $$(Y_{it} - \\bar{Y}_i) = \\beta (X_{it} - \\bar{X}_i) + (\\alpha_i - \\alpha_i) + (\\epsilon_{it} - \\bar{\\epsilon}_i)$$
   考察固定效应项：
   $$\\alpha_i - \\alpha_i \\equiv 0$$
   定义中心化离均差变量：
   $$\\ddot{Y}_{it} = Y_{it} - \\bar{Y}_i, \\quad \\ddot{X}_{it} = X_{it} - \\bar{X}_i, \\quad \\ddot{\\epsilon}_{it} = \\epsilon_{it} - \\bar{\\epsilon}_i$$
   代入即严格推导出纯净去偏回归方程：
   $$\\ddot{Y}_{it} = \\beta \\ddot{X}_{it} + \\ddot{\\epsilon}_{it} \\quad \\text{(式 2)}$$
   结论：不可观测的内生性混杂变量 $\\alpha_i$ 被完全、彻底地从模型中对消消除！

三、固定效应估计量 $\\hat{\\beta}_{\\text{FE}}$ 的 OLS 闭式解与条件无偏性证明：
对变换后的无截距项方程（式 2）拟合普通最小二乘法：
$$\\hat{\\beta}_{\\text{FE}} = \\frac{\\sum_{i=1}^N \\sum_{t=1}^T \\ddot{X}_{it} \\ddot{Y}_{it}}{\\sum_{i=1}^N \\sum_{t=1}^T \\ddot{X}_{it}^2}$$
将 $\\ddot{Y}_{it} = \\beta \\ddot{X}_{it} + \\ddot{\\epsilon}_{it}$ 带入分子项展开：
$$\\hat{\\beta}_{\\text{FE}} = \\frac{\\sum_{i=1}^N \\sum_{t=1}^T \\ddot{X}_{it} (\\beta \\ddot{X}_{it} + \\ddot{\\epsilon}_{it})}{\\sum_{i=1}^N \\sum_{t=1}^T \\ddot{X}_{it}^2} = \\beta \\cdot \\frac{\\sum_{i=1}^N \\sum_{t=1}^T \\ddot{X}_{it}^2}{\\sum_{i=1}^N \\sum_{t=1}^T \\ddot{X}_{it}^2} + \\frac{\\sum_{i=1}^N \\sum_{t=1}^T \\ddot{X}_{it} \\ddot{\\epsilon}_{it}}{\\sum_{i=1}^N \\sum_{t=1}^T \\ddot{X}_{it}^2}$$
$$\\hat{\\beta}_{\\text{FE}} = \\beta + \\frac{\\sum_{i=1}^N \\sum_{t=1}^T \\ddot{X}_{it} \\ddot{\\epsilon}_{it}}{\\sum_{i=1}^N \\sum_{t=1}^T \\ddot{X}_{it}^2}$$
在条件于全样本设计矩阵 $\\mathbf{X}$ 的前提下，两端取条件数学期望：
$$E[\\hat{\\beta}_{\\text{FE}} \\mid \\mathbf{X}] = \\beta + E\\left[ \\frac{\\sum_{i=1}^N \\sum_{t=1}^T \\ddot{X}_{it} \\ddot{\\epsilon}_{it}}{\\sum_{i=1}^N \\sum_{t=1}^T \\ddot{X}_{it}^2} \\;\\Bigg|\\; \\mathbf{X} \\right] = \\beta + \\frac{\\sum_{i=1}^N \\sum_{t=1}^T \\ddot{X}_{it} E[\\ddot{\\epsilon}_{it} \\mid \\mathbf{X}]}{\\sum_{i=1}^N \\sum_{t=1}^T \\ddot{X}_{it}^2}$$
根据严格外生性假定：对于任意 $t$，恒有 $E[\\epsilon_{it} \\mid \\mathbf{X}] = 0$。
因此其算术平均的条件期望同样为 0：$E[\\bar{\\epsilon}_i \\mid \\mathbf{X}] = 0$。
由此可得离均差误差的期望必为 0：
$$E[\\ddot{\\epsilon}_{it} \\mid \\mathbf{X}] = E[\\epsilon_{it} - \\bar{\\epsilon}_i \\mid \\mathbf{X}] = 0 - 0 = 0$$
将其代回分子项：
$$E[\\hat{\\beta}_{\\text{FE}} \\mid \\mathbf{X}] = \\beta + 0 = \\beta$$
证毕。该数学推导严格证明了：即便个体未测异质性 $\\alpha_i$ 与解释变量存在严重内生自选择（$\\text{Cov}(\\alpha_i, X_{it}) \\neq 0$），固定效应估计量依然具有坚不可摧的条件无偏性。""",
            difficulty=4,
            related_lesson_id="causal-inference-l12-3",
            tags=["数学推导", "组内变换", "固定效应无偏性", "代数大题"],
        ),
        open_ex(
            "causal-inference-c12-e13",
            "某跨国科技集团战略发展部正在评估各业务线“年度技术研发投入强度（X，占营收比重）”对“次年高价值发明专利新增授权量（Y，件）”的因果驱动效应。\n集团数据库记录了旗下 500 个独立业务单元（Business Units, BU）在过去 6 年（2018~2023）的完整面板平衡数据集。\n请作为集团首席因果推断专家，针对以下四个关键建模议题撰写系统性实证指导报告：\n1. TWFE 模型架构构建：规范写出同时控制事业部个体固定效应与年份时间固定效应的双向固定效应（TWFE）计量经济模型，分别阐明两组固定效应吸收了何种具体宏观与微观现实干扰；\n2. 豪斯曼检验判决实战：算法工程师对数据拟合了 RE 模型与 FE 模型，豪斯曼检验输出统计量 $\\chi^2(3) = 48.2, p < 0.0001$。向战略委员会深入解释这一统计检验结果的经济学内涵，论述为何必须一票否决 RE 模型；\n3. 静态特征吸收陷阱排查：某初级分析师试图在 FE 回归方程中加入“该业务单元是否属于芯片半导体行业（二元哑变量，6 年内恒定为 1 或 0）”，回归结果中该变量系数显示为 `(omitted / 无法估计)`。请用组内变换代数机理向其解释为何该变量会被自动剔除；\n4. 时变内生性（Time-varying Confounding）深度风控：战略副总裁询问：“既然我们已经加了事业部固定效应，是不是意味着我们不需要再担心任何管理层能力差异的遗漏偏误了？”请通过设计一个具体的反例（如某事业部在第 3 年空降了一位极具战略远见的明星总经理），向副总裁深刻论证固定效应为何对此类时变内生性完全无能为力。",
            """1. TWFE 双向固定效应模型构建：
   Y_{it} = β_1 X_{it} + α_i + λ_t + γ^T Z_{it} + ε_{it}
   - Y_{it} 为业务单元 i 在 t+1 年的新增发明专利授权数；
   - X_{it} 为业务单元 i 在 t 年的研发投入强度；
   - α_i 为事业部个体固定效应（Entity Fixed Effects）：用于吸收和完全控制所有不随时间改变的事业部固有底蕴（如创立初期的底层代码架构积淀、所处赛道天然的基础技术研发难度、团队早期工程师文化基因等）；
   - λ_t 为年份时间固定效应（Time Fixed Effects）：用于吸收所有年份层级、全集团各事业部共同面临的宏观外部冲击（如国家知识产权局年度专利审查松紧尺度、宏观芯片法案外部制裁、全行业通用大模型技术浪潮等）；
   - β_1 为研发投入强度对专利产出的纯净因果边际贡献。

2. 豪斯曼检验经济学内涵与 RE 否决论证：
   - 检验统计量与假定：
     原假设 H_0 为个体效应与研发投入外生不相关 Cov(α_i, X_{it}) = 0。实测 χ^2(3) = 48.2, p < 0.0001，在统计学上以极大概率彻底击碎并拒绝了原假设。
   - 经济学内涵：
     事业部天生的底层技术积累与创新文化（α_i），与其实际申请并获得的研发预算经费（X_{it}）之间存在着极强烈的正向自选择正相关（实力强、积淀厚的事业部天然更敢于且更容易拿到高额研发预算，Cov(α_i, X) > 0）。
   - 必须一票否决 RE 的理由：
     随机效应模型（RE）强行假设两者独立，导致其估计量深陷严重的选择性内生偏误；而固定效应（FE）通过组内去均值彻底消除了 α_i，是唯一具备渐近一致无偏性的可信估计量。

3. 静态行业哑变量被 Omitted 的代数机理：
   - 组内离均差操作本质：
     FE 估计依靠将每个变量减去其事业部 6 年跨期均值：Ẍ_{it} = X_{it} - X̄_i。
   - 静态特征方差归零：
     对于芯片半导体行业标签（Ind_i），对于某个特定事业部，它在过去 6 年全为 1（或全为 0）。
     其时间均值 Ind̄_i = 1，其组内离均差：
     Ind̈_{it} = Ind_{it} - Ind̄_i = 1 - 1 = 0（对所有时期恒等于 0！）。
   - 矩阵共线性：
     该变量的离均差列向量变成了全零向量，其样本方差严格为 0，与截距项产生完全多重共线性，逆矩阵无法计算，故在代数几何层面上必定被软件物理剔除。

4. 面对副总裁的时变内生性（Time-varying Confounding）深度批判：
   - 澄清认知盲区：
     固定效应 α_i 只能消除【时间恒定不变】的固有特质。
   - 反例论证（空降明星总经理）：
     设第 88 事业部在 2021 年（第 3 年）撤换管理层，空降了一位行业顶级战略 CEO。
     这位 CEO 凭借其个人远见与管理铁腕（未观测变量 U_{it} 发生剧烈时变跃升）：
     a) 积极向集团游说争抢到了更多的研发资金（导致 X_{it} 激增）；
     b) 深度重组研发考核机制，亲自把关专利申请质量（导致 Y_{it} 剧增）。
   - FE 崩溃机理：
     这种管理能力的飞跃是【随时间动态演化的（Time-varying）】，它发生在 2021~2023 年，在时间均值相减后依然顽固残留在扰动项 ε̈_{it} 中！
     模型无法分清专利的爆发究竟是“真金白银研发经费砸出来的”，还是“新 CEO 的管理魅力和架构重组带来的”。
     因此，FE 绝对无法解决时变管理层能力混杂！必须辅助引入工具变量（IV）或基于差分的前沿动态面板 GMM 进行深度解耦。""",
            "考察企业集团实战场景下 TWFE 宏微观机制设定、豪斯曼检验经济学内涵、静态特征组内方差为 0 吸收机理、以及时变内生性（空降 CEO 反例）局限性深度剖析。",
            [
                {"point": "正确写出 TWFE 模型并阐述 α_i 吸收微观底蕴与 λ_t 吸收宏观冲击的现实内涵", "score": 1},
                {"point": "深入解释豪斯曼检验拒绝原假设说明研发投入与事业部底蕴强相关，论证否决 RE", "score": 1},
                {"point": "从离均差 Ind̈_{it} = 1 - 1 = 0 全零向量代数机理清晰解释被 Omitted 原因", "score": 1},
                {"point": "设计空降 CEO 时变能力反例，深刻阐明时变混杂残留在 ε̈_{it} 中摧毁 FE 的机理", "score": 1},
            ],
            exemplar="""【科技集团研发创新因果归因与面板固定效应（TWFE）实战治理报告】：

一、双向固定效应（TWFE）基准计量模型构建
基于集团旗下 500 个业务单元（BU）过去 6 年（$N = 500, T = 6$）的平衡面板数据集，构建标准双向固定效应回归方程：
$$Y_{it} = \\beta_1 X_{it} + \\boldsymbol{\\gamma}^T \\mathbf{Z}_{it} + \\alpha_i + \\lambda_t + \\epsilon_{it}$$
核心变量因果解构与现实吸收机制：
- $Y_{it}$：事业部 $i$ 在第 $t+1$ 年新增高价值发明专利授权量（件）；
- $X_{it}$：事业部 $i$ 在第 $t$ 年的研发经费投入强度（研发支出占营收比重，$\\%, 0 \\le X \\le 100$）；
- $\\mathbf{Z}_{it}$：随时间变动的可测控制变量向量（如事业部人员总规模、当年净利润率等）；
- $\\alpha_i$：**事业部个体固定效应（Entity Fixed Effects）**：
  在物理现实中吸收所有“事业部固有、不随 6 年时间改变”的深层特质。包括：事业部创立初期的底层代码技术底蕴、所在细分赛道的天然研发周期壁垒、以及事业部早期积淀的极客工程师文化；
- $\\lambda_t$：**年份时间固定效应（Time Fixed Effects）**：
  在宏观现实中吸收所有“全集团所有事业部在某一年份共同面临”的宏观外生浪潮。包括：当年度国家知识产权局对专利审查标准的周期性收紧与放宽、全球芯片与算力供应链受阻冲击、以及通用大模型技术爆发对各部门全员研发效率的同步抬升；
- $\\beta_1$：核心因果参数，度量排除事业部底蕴与宏观时间浪潮后，研发投入强度对专利产出的纯净边际因果弹性。

二、豪斯曼检验（Hausman Test）经济学实战判决
算法团队对数据分别拟合了固定效应（FE）与随机效应（RE）模型，输出统计检验结果：
$$\\chi^2(3) = 48.2, \\quad p = 1.94 \\times 10^{-10} < 0.0001$$
1. 统计判据剖析：
   豪斯曼检验的原假设为 $H_0: \\text{Cov}(\\alpha_i, X_{it}) = 0$（假定事业部未观测先天底蕴与其实际研发投入决策完全统计独立）。
   极小的 $p$ 值在统计学上以绝对确凿的把握**断然拒绝原假设**！
2. 经济学现实内涵：
   在真实商业竞争中，未测企业底蕴 $\\alpha_i$ 绝不可能与研发预算 $X_{it}$ 外生独立。研发实力雄厚、技术底子扎实的事业部，其管理团队天然更具技术信仰，在集团战略预算答辩中更容易争取到高额研发配额（呈现强烈的正向自选择：$\\text{Cov}(\\alpha_i, X_{it}) > 0$）。
3. 决策坚决一票否决 RE：
   随机效应模型（RE）强行施加的外生独立性假定在现实中彻底破灭，导致 RE 估计量将事业部自身底蕴带来的高专利产出全部错误算成了研发投入的功劳，充斥着严重的选择性偏误。只有固定效应模型（FE）能够严格保证估计量的因果一致性。

三、静态行业哑变量被自动 Omitted 的代数几何机理
初级分析师试图在 FE 回归中加入“是否属于芯片半导体行业（$\\text{Ind}_i$）”变量，结果被系统直接剔除（Omitted）：
1. 组内去均值算子的代数消解：
   固定效应估计的核心数学操作是将所有变量投影至正交于个体均值的离均差子空间：
   $$\\ddot{V}_{it} = V_{it} - \\bar{V}_i, \\quad \\text{其中 } \\bar{V}_i = \\frac{1}{6}\\sum_{t=1}^6 V_{it}$$
2. 方差湮灭推导：
   对于芯片半导体行业变量 $\\text{Ind}_i$：该属性属于事业部在 6 年考察期内恒定不变的静态标签：
   - 若事业部属于芯片行业，其在 6 年中的取值序列为 $[1, 1, 1, 1, 1, 1]$，时间均值 $\\overline{\\text{Ind}}_i = 1$；
   - 其组内离均差为：$\\ddot{\\text{Ind}}_{it} = \\text{Ind}_{it} - \\overline{\\text{Ind}}_i = 1 - 1 = 0$；
   - 若事业部属于非芯片行业，取值序列全为 0，其离均差同样恒等于 $0 - 0 = 0$。
3. 几何结论：
   在经过组内去均值后，静态特征向量 $\\ddot{\\mathbf{Ind}}$ 坍缩成为了全零向量，其时间维度的离均差方差严格等于 0（$\\sum \\ddot{\\text{Ind}}_{it}^2 = 0$）。在 OLS 逆矩阵 $(Ẍ^T Ẍ)^{-1}$ 计算中产生不可逆的完全多重共线性奇异，因此在数学上必然被物理剔除。若想考察行业效应，必须改用其与时间趋势的交互项 $\\text{Ind}_i \\times t$ 入模。

四、面向副总裁的“时变内生性（Time-varying Confounding）”深度风控报告
针对副总裁“固定效应是否能消除所有管理层能力差异偏误”的质询：
1. 核心定性结论：
   **固定效应绝对不是万能解药！它只能消除'不随时间变动的固定特质'，而对任何'随时间动态改变的未测混杂'完全丧失免疫力！**
2. 经典反例剖析（明星 CEO 空降冲击）：
   设第 88 事业部在 2021 年（第 3 年）撤换原平庸团队，空降了一位行业顶尖的技术明星 CEO：
   - 机制 A（撬动资金）：新 CEO 凭借巨大声望向集团争取到了研发经费预算翻倍（刺激 $X_{it}$ 跃升）；
   - 机制 B（重构流程）：新 CEO 亲自推行专利合规激励与研发攻坚（直接使得该部门专利申请数 $Y_{it}$ 井喷）。
3. 偏误残留破坏机理：
   新 CEO 的战略领导力是一个**随时间在 2021 年发生断裂突变的时变未测变量（Time-varying Unobservable, $U_{it}$）**：
   在做组内去均值时，由于新 CEO 仅在后三年生效，其卓越能力无法在时间平均中完全抵消，而是顽固地残留在离均差误差项 $\\ddot{\\epsilon}_{it}$ 中！
   此时，自变量离均差 $\\ddot{X}_{it}$ 与误差项 $\\ddot{\\epsilon}_{it}$ 再次产生强烈的正相关，严格外生性假定 $E[\\ddot{\\epsilon}_{it} \\mid \\ddot{X}_{it}] = 0$ 彻底破裂！
4. 战略建议：
   绝不能迷信 FE 的单兵作战能力。面对高管变动、团队重组等时变管理红利混杂，必须在模型中主动引入“外部研发费用加计扣除税收新规的阶梯税率变动”等外生工具变量（IV），方能真正实现研发投资回报的纯净因果归因。""",
            difficulty=5,
            related_lesson_id="causal-inference-l12-7",
            tags=["面板FE实战", "TWFE建模", "豪斯曼检验判决", "静态变量吸收机理", "时变内生性风控"],
        ),
    ]

    ch12 = chapter(
        "causal-inference-c12",
        "causal-inference",
        12,
        "面板数据与固定效应（Panel Data & Fixed Effects）",
        "掌握面板数据消偏机理、组内去均值 Within 变换、豪斯曼检验 FE vs RE 判决、TWFE 双向固定效应、以及时变内生性局限性。",
        c12_lessons,
        c12_exercises,
    )
    return ch12
