# -*- coding: utf-8 -*-
"""
Stats Foundations - Chapter 15: Multiple Regression and Model Diagnostics
"""

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_15():
    c15_lessons = [
        lesson(
            "stats-foundations-l15-1",
            "多元线性回归与'控制其他变量不变'（Ceteris Paribus）",
            """### 破除混杂影响的统计武器
真实世界的结局通常由多个因素共同驱动：
$$Y_i = \\beta_0 + \\beta_1 X_{1i} + \\beta_2 X_{2i} + \\dots + \\beta_p X_{pi} + \\epsilon_i$$

#### 偏回归系数（Partial Regression Coefficient, $\\beta_j$）的深刻含义：
**在保持模型中所有其他自变量数值严格固定不变（Ceteris Paribus）的前提下**，自变量 $X_j$ 每增加 1 个单位，因变量 $Y$ 的平均期望改变量！
- 例如在薪资预测模型中：$\\text{年薪} = \\beta_0 + \\beta_1 \\text{工龄} + \\beta_2 \\text{学历} + \\beta_3 \\text{周工时}$。
- $\\beta_1$ 纯净地度量了：在两个学历完全相同、每周工作时长完全一样的员工之间，工龄每多 1 年带来的纯粹净薪酬增量！它一举清洗掉了学历和加班对工龄效应的混杂污染。

#### 矩阵表示与 OLS 几何正交投影解：
向量化紧凑表达：$\\mathbf{Y} = \\mathbf{X}\\boldsymbol{\\beta} + \\boldsymbol{\\epsilon}$。
正规方程组：$(\\mathbf{X}^T \\mathbf{X}) \\hat{\\boldsymbol{\\beta}} = \\mathbf{X}^T \\mathbf{Y}$。
只要自变量矩阵满秩（$\\mathbf{X}^T\\mathbf{X}$ 可逆），闭式解为：
$$\\hat{\\boldsymbol{\\beta}} = (\\mathbf{X}^T \\mathbf{X})^{-1} \\mathbf{X}^T \\mathbf{Y}$$""",
            difficulty=2,
            tips=[
                tip("在多元回归中，单个系数的符号和大小完全取决于你控制了哪些其他变量！加入或剔除一个强相关协变量，原本正的系数完全可能瞬间变负。", "pitfall"),
            ],
        ),
        lesson(
            "stats-foundations-l15-2",
            "调整后决定系数（Adjusted R²）：惩罚滥加特征的照妖镜",
            """### 为什么普通 R² 会沦为自欺欺人的工具？
在普通最小二乘法中，有一个致命的数学性质：
**只要你在回归方程中添加一个新变量（哪怕这个变量是用 random.randint() 生成的纯随机乱码），普通决定系数 $R^2$ 也绝不可能下降，它只会单调单调上升！**
这就诱惑研究者为了追求高 $R^2$ 毫无节制地堆砌垃圾特征，导致极其严重的过拟合（Overfitting）。

#### 调整后决定系数（Adjusted $R^2$, $R^2_{\\text{adj}}$）
统计学家引入了**自由度惩罚机制**：
$$R^2_{\\text{adj}} = 1 - \\frac{SSE / (n - p - 1)}{SST / (n - 1)} = 1 - (1 - R^2) \\frac{n - 1}{n - p - 1}$$
（其中 $n$ 为样本量，$p$ 为引入的自变量个数）。

#### 机制裁决：
- 新加入一个变量，若它对因变量真实解释力很强，能大幅压低 $SSE$，使得 $R^2_{\\text{adj}}$ 上升；
- 若新加入的变量是垃圾特征，其对 $SSE$ 的削减微乎其微，但分母由于多消耗了一个自由度（$n - p - 1$ 变小）导致惩罚项暴增，$R^2_{\\text{adj}}$ **反而会倒退下降！**
- 铁律：**模型比较与特征筛选永远看 Adjusted $R^2$（或 AIC/BIC），绝不看普通 $R^2$！**""",
            difficulty=2,
            tips=[
                tip("R²_adj 的数值必定恒小于或等于普通 R²；在极度劣质的模型中，R²_adj 甚至可能出现负数！", "note"),
            ],
        ),
        lesson(
            "stats-foundations-l15-3",
            "全局 F 检验 vs 单个特征 t 检验：协同与个体的对话",
            """### 两道坚固的模型质量审查防线
在多元回归输出报表中，永远存在两个层次的显著性检验：

#### 1. 全局整体 F 检验（Overall F-test）
- 原假设：$H_0: \\beta_1 = \\beta_2 = \\dots = \\beta_p = 0$（模型里所有自变量全部没用，预测力为零）。
- 备择假设：$H_1: \\text{至少有一个 } \\beta_j \\neq 0$。
- 统计量：
  $$F = \\frac{SSR / p}{SSE / (n - p - 1)} \\sim F(p, n - p - 1)$$
- **第一审查关卡**：如果整个模型的全局 $F$ 检验都不显著（$p > 0.05$），整个模型属于彻底报废状态，后面任何单个特征的系数根本无需再看！

#### 2. 单个偏回归系数的 t 检验（Individual t-test）
- 检验特定自变量 $X_j$ 在**控制了其余所有变量之后**，是否依然对因变量有显著的边际解释增益：
  $$t = \\frac{b_j - 0}{SE(b_j)} \\sim t(n - p - 1)$$

#### 经典怪象：为什么全局 F 极显著，但每个单个 t 全都不显著？
很多分析师遇到过诡异情况：全局 $F$ 检验 $p < 0.0001$（证明变量肯定有用），但每个特征单独的 t 检验全是 $p > 0.1$。
**原因只有一个：模型遭遇了严重的多重共线性（Multicollinearity）！**""",
            difficulty=2,
            tips=[
                tip("这就像五个优秀的特种兵一起推车，车确实被推动了（全局F显著），但由于五个人动作完全重合，你很难单独证明任何一个人到底出了多少力（单个t全不显著）。", "note"),
            ],
        ),
        lesson(
            "stats-foundations-l15-4",
            "多重共线性（Multicollinearity）：方差膨胀因子 VIF 与自变量内卷",
            """### 自变量之间高度重叠带来的统计灾难
若自变量之间存在高度线性相关（如同时放入“身高(cm)”和“身高(米)”、“月收入”和“年收入”）。

#### 1. 多重共线性的破坏力：
- 矩阵 $\\mathbf{X}^T\\mathbf{X}$ 接近奇异矩阵（行列式趋近于 0），导致求逆 $(\\mathbf{X}^T\\mathbf{X})^{-1}$ 极其不稳定。
- **系数估计的标准误 $SE(b_j)$ 发生爆炸级狂飙！**
- 导致置信区间变得极其宽大，真实有效的特征无法被检出显著性；回归系数符号完全错乱（如生活常识中正相关的变量算出来变成负数）。

#### 2. 诊断金标准：方差膨胀因子（VIF, Variance Inflation Factor）
对每个自变量 $X_j$，以它为因变量对剩余所有自变量跑辅助回归，算出其辅助决定系数 $R_j^2$：
$$VIF_j = \\frac{1}{1 - R_j^2}$$
- **VIF = 1**：完全不相关，最理想状态。
- **VIF > 5**：存在中度多重共线性，需引起警惕。
- **VIF > 10**：**严重多重共线性红线！** 必须采取行动！

#### 3. 解决对策：
- 剔除冗余重叠变量；
- 使用主成分分析（PCA）或因子分析提取正交综合特征；
- 改用**岭回归（Ridge Regression）或 Lasso**，通过 L2/L1 正则化压制共线性。""",
            difficulty=3,
            tips=[
                tip("面试经典：'当回归系数符号与业务常理相反时（如房龄越大房价越高），该如何排查？' 答：首要排查多重共线性（计算 VIF）或遗漏了重要混杂变量（如是否学区房）。", "interview"),
            ],
        ),
        lesson(
            "stats-foundations-l15-5",
            "异方差检验与怀特稳健标准误（Robust SE）",
            """### 当误差的波动随着自变量的增大而发散
在收入预测消费的经济学模型中：低收入者的月度消费金额非常固定（方差小）；而高收入者的消费极其随性（有人极度节俭，有人挥金如土，方差极大），残差呈现典型的喇叭口发散。

#### 1. 异方差（Heteroscedasticity）的后果
根据高斯-马尔可夫定理：当同方差假设被打破时：
- 最小二乘估计值 $b_j$ **依然是无偏的**（拟合直线本身没跑偏）；
- 但是：**常规计算出的标准误 $SE(b_j)$ 彻底失效！** 导致所有的 t 统计量、P值和置信区间全都是错的，做出虚假的决策。

#### 2. 诊断工具：
- **布劳施-帕甘检验（Breusch-Pagan Test）** 与 **怀特检验（White Test）**：
  原假设 $H_0: \\text{误差具备同方差性}$。若 $p < 0.05$，确认存在异方差。

#### 3. 现代经济学与工业界标配解法：怀特稳健标准误（White's Robust SE / HC1/HC3）
无需变换变量，保持 OLS 系数不变，直接使用三明治协方差估计量（Sandwich Estimator）：
$$Var(\\hat{\\boldsymbol{\\beta}}) = (\\mathbf{X}^T\\mathbf{X})^{-1} (\\mathbf{X}^T \\boldsymbol{\\Omega} \\mathbf{X}) (\\mathbf{X}^T\\mathbf{X})^{-1}$$
在 Python 的 statsmodels 中只需一行：`model.fit(cov_type='HC3')`，立刻获得抵抗异方差的真实稳健 P 值！""",
            difficulty=3,
            tips=[
                tip("现代应用计量经济学（Angrist 流派）的黄金法则是：所有回归报表默认一律报告稳健标准误（Robust Standard Errors），绝不使用容易被异方差摧毁的经典标准误！", "note"),
            ],
        ),
        lesson(
            "stats-foundations-l15-6",
            "哑变量编码与交互效应：定性分类与协同倍增",
            """### 将离散标签与协同效应揉入线性方程
#### 1. 哑变量编码（Dummy Variable / 虚拟变量）
若有一个分类变量包含 $k$ 个离散类别（如地区：北京、上海、广州）。
- **必须只引入 $k - 1$ 个 0-1 指示变量（哑变量）！**
- 留出来的未编码类别作为**基准参照组（Base / Reference Category）**。
- *哑变量陷阱（Dummy Variable Trap）*：若贪心引入了全部 $k$ 个虚拟变量，且方程中保留了截距项，各虚拟变量之和将严格等于常数 1（与截距项产生完全共线性），矩阵不可逆导致程序崩溃！

#### 2. 交互效应（Interaction Effects / 协同效应）
两个变量之间可能不是孤立相加，而是具有乘法协同作用：
$$Y = \\beta_0 + \\beta_1 X_1 + \\beta_2 X_2 + \\beta_3 (X_1 \\times X_2) + \\epsilon$$
- **业务场景**：新药在年轻人群中疗效一般，但在老年人群中疗效倍增（年龄与药物产生交互）。
- **交互项系数 $\\beta_3$ 的解读**：
  求偏导：$\\frac{\\partial Y}{\\partial X_1} = \\beta_1 + \\beta_3 X_2$。
  $X_1$ 对 $Y$ 的推动效应大小，自身**直接取决于 $X_2$ 当前所处的水平**！若 $\\beta_3 > 0$，说明两者具有 $1+1 > 2$ 的协同促进放大效应。""",
            difficulty=2,
            tips=[
                tip("规范准则：只要模型中包含了交互项 X1 * X2，就必须无条件保留其各自的主效应 X1 和 X2，哪怕某个主效应单独不显著也不能随意删去！", "interview"),
            ],
        ),
        lesson(
            "stats-foundations-l15-7",
            "算例拆解与自查清单：完整多元回归输出报表（Summary Table）精读实战",
            """## 工业与学术界标准回归报表（Summary）精读

某二手房评估系统对房屋总价 $Y$（万元）拟合多元回归方程：
纳入变量：建筑面积 $X_1$（平米）、房龄 $X_2$（年）、是否学区房 $X_3$（哑变量：学区房=1，普通=0）。
样本容量 $n = 104$。

### 核心报表输出与逐行破译：

```
==============================================================================
Dep. Variable:            Price (万元)   R-squared:                       0.850
Model:                             OLS   Adj. R-squared:                  0.845
Method:                  Least Squares   F-statistic:                     188.9
No. Observations:                  104   Prob (F-statistic):          1.25e-40
==============================================================================
                 coef    std err          t      P>|t|      [0.025      0.975]
------------------------------------------------------------------------------
const          20.000      5.000      4.000      0.000      10.080      29.920
Area            3.500      0.250     14.000      0.000       3.004       3.996
Age            -0.800      0.160     -5.000      0.000      -1.117      -0.483
School_District50.000      8.000      6.250      0.000      34.128      65.872
==============================================================================
Omnibus: 2.14  Prob(Omnibus): 0.343  Durbin-Watson: 1.95  Condition No.: 12.4
==============================================================================
```

---

### 第一步：模型全局质量体检
1. **全局 F 检验**：$F = 188.9, p = 1.25 \\times 10^{-40}$，极其微小。说明 3 个特征整体对房价具有摧枯拉朽的显著预测力，模型成立！
2. **拟合优度**：$R^2 = 0.850, R^2_{\\text{adj}} = 0.845$。说明三项特征成功解释了该城市二手房 84.5% 的价格方差波动，且两者差距极小，没有盲目堆砌无用特征。
3. **残差独立性**：Durbin-Watson $= 1.95$（极度接近 2.0），表明残差不存在一阶自相关。

### 第二步：偏回归系数专业解读
- **常数项 $b_0 = 20.0$**：基准参考房（非学区房、面积0、房龄0）的理论基线价格。
- **面积系数 $b_1 = +3.5$**（$p < 0.001$）：在房龄与学区属性完全相同的条件下，房屋建筑面积每增加 1 平米，售价平均增加 **3.5 万元**。
- **房龄系数 $b_2 = -0.8$**（$p < 0.001$）：在面积与学区属性相同的条件下，房屋每老旧 1 年，售价平均折旧 **0.8 万元**。
- **学区房系数 $b_3 = +50.0$**（$p < 0.001$）：在面积与房龄完全一致的同等条件下，带学区属性的房屋相比非学区房平均溢价达 **50.0 万元**！

### 第三步：自查清单闭环
1. 各变量 VIF 是否低于 5？经核查最大 VIF 为 1.6，无多重共线性。
2. 哑变量是否设立了基准组？是（以非学区房为 0 基准）。
3. 残差 Q-Q 图与同方差是否满足？经核查正态分布良好。报告通过，可直接投入生产估值系统！""",
            difficulty=3,
            tips=[
                tip("在看报表时，养成三步走顺序：先看全局 F 判生死，再看 R²_adj 判拟合，最后看单个系数 t 和 P 值与置信区间。", "note"),
            ],
        ),
    ]

    c15_exercises = [
        single_choice(
            "stats-foundations-c15-e1",
            "在多元线性回归模型中，偏回归系数 $\\beta_j$ 的核心统计学定义是：",
            [
                {"value": "A", "text": "在保持模型中所有其余自变量严格固定不变的前提下，自变量 X_j 每增加 1 个单位时，因变量 Y 的平均期望改变量"},
                {"value": "B", "text": "自变量 X_j 与因变量 Y 之间的简单皮尔逊相关系数"},
                {"value": "C", "text": "当只有 X_j 存在时 Y 的变动量"},
                {"value": "D", "text": "残差平方和的改变量"},
            ],
            "A",
            "偏回归系数的灵魂就是'控制其余变量不变（Ceteris Paribus）'，它剔除了模型中其他协变量的间接共变影响，反映了该特征对因变量的净直接边际效应。",
            difficulty=1,
            related_lesson_id="stats-foundations-l15-1",
            tags=["偏回归系数", "控制变量", "核心概念"],
        ),
        judge(
            "stats-foundations-c15-e2",
            "无论新加入多元回归模型的自变量在现实中多么无用（哪怕是纯随机白噪声），普通决定系数 $R^2$ 也会单调增加，绝不会减少。",
            True,
            "数学铁律：OLS 目标是最小化残差平方和 SSE。新增加任意特征只会给优化器提供额外的微调自由度，使 SSE 单调不增，从而导致普通 R² = 1 - SSE/SST 单调不减。因此必须使用带有自由度惩罚的 Adjusted R² 进行模型比较。",
            difficulty=2,
            related_lesson_id="stats-foundations-l15-2",
            tags=["R方缺陷", "单调性", "自由度"],
        ),
        fill(
            "stats-foundations-c15-e3",
            "在多重共线性诊断中，若某个自变量对其余所有自变量跑辅助回归得到的决定系数为 $R_j^2 = 0.90$，则该自变量对应的方差膨胀因子（VIF）数值等于 ___。",
            [["10", "10.0"]],
            "方差膨胀因子公式：VIF = 1 / (1 - R_j²) = 1 / (1 - 0.90) = 1 / 0.10 = 10。达到了严重多重共线性的告警红线。",
            difficulty=2,
            related_lesson_id="stats-foundations-l15-4",
            tags=["VIF计算", "多重共线性"],
        ),
        single_choice(
            "stats-foundations-c15-e4",
            "某多元回归模型中包含一个无序分类变量'用户所在地区'（共有 4 个互斥类别：华北、华东、华南、西部）。为了避免'哑变量陷阱'并保留回归截距项，应该在模型中放入的哑变量（Dummy）数量是：",
            [
                {"value": "A", "text": "3 个"},
                {"value": "B", "text": "4 个"},
                {"value": "C", "text": "2 个"},
                {"value": "D", "text": "1 个"},
            ],
            "A",
            "包含 k 个类别的离散特征必须引入 k - 1 个哑变量，留出一个作为对照基准组。若全放入 4 个，四个哑变量之和恒等于 1，将与截距项产生完全多重共线性（哑变量陷阱）导致矩阵奇异不可逆。",
            difficulty=2,
            related_lesson_id="stats-foundations-l15-6",
            tags=["哑变量编码", "哑变量陷阱", "基准组"],
        ),
        multiple_choice(
            "stats-foundations-c15-e5",
            "当多元回归模型存在严重的多重共线性（如某两个关键自变量的皮尔逊相关系数高达 0.98）时，会导致下列哪些不良统计后果？",
            [
                {"value": "A", "text": "各回归系数的估计标准误 SE 发生爆炸性膨胀"},
                {"value": "B", "text": "自变量的偏回归系数置信区间变得极其宽阔不稳定，轻微扰动数据系数数值会剧烈跳变"},
                {"value": "C", "text": "可能出现全局 F 检验高度显著，但每个特征各自的 t 检验全都不显著的诡异矛盾"},
                {"value": "D", "text": "自变量系数的符号可能发生反转，违背基本的经济学或工程常理"},
                {"value": "E", "text": "模型将彻底无法输出任何预测结果"},
            ],
            ["A", "B", "C", "D"],
            "E选项错误：尽管参数方差大且不稳定，模型数学上依然可以计算出拟合值；其余选项均为多重共线性的经典危害。",
            difficulty=3,
            related_lesson_id="stats-foundations-l15-4",
            tags=["多重共线性危害", "VIF", "参数不稳定"],
        ),
        judge(
            "stats-foundations-c15-e6",
            "当回归模型存在异方差性（Heteroscedasticity）时，普通最小二乘法（OLS）求得的参数估计值 $\\hat{\\boldsymbol{\\beta}}$ 仍然具备无偏性，但其经典标准误失效导致假设检验结论不可信。",
            True,
            "同方差假设仅用于推导参数估计的协方差矩阵（标准误），并不参与证明参数无偏性（无偏性仅依赖外生性 E(ε|X)=0）。因此参数依然无偏，只需改用稳健标准误（Robust SE）修正推断即可。",
            difficulty=3,
            related_lesson_id="stats-foundations-l15-5",
            tags=["异方差性质", "无偏性保持", "稳健推断"],
        ),
        fill(
            "stats-foundations-c15-e7",
            "某多元回归方程设定为 $Y = 10 + 2 X_1 + 3 X_2 + 4 (X_1 \\times X_2)$。如果当前 $X_2$ 的取值固定为 $5$，则自变量 $X_1$ 对 $Y$ 的实际边际效应斜率（$\\frac{\\partial Y}{\\partial X_1}$）等于 ___。",
            [["22", "22.0"]],
            "边际效应为对 X1 求偏导：∂Y/∂X1 = 2 + 4 * X2。代入 X2 = 5，得到边际效应 = 2 + 4 * 5 = 2 + 20 = 22。",
            difficulty=2,
            related_lesson_id="stats-foundations-l15-6",
            tags=["交互效应", "边际效应", "导数计算"],
        ),
        single_choice(
            "stats-foundations-c15-e8",
            "在模型拟合分析中，若样本容量为 $n = 30$，模型包含 $p = 5$ 个自变量，总平方和 $SST = 100$，残差平方和 $SSE = 24$（普通 $R^2 = 0.76$）。则该模型的调整后决定系数 $R^2_{\\text{adj}}$ 的数值约为：",
            [
                {"value": "A", "text": "0.71"},
                {"value": "B", "text": "0.76"},
                {"value": "C", "text": "0.81"},
                {"value": "D", "text": "0.50"},
            ],
            "A",
            "Adjusted R² = 1 - [SSE/(n - p - 1)] / [SST/(n - 1)] = 1 - [24/(30 - 5 - 1)] / [100/(30 - 1)] = 1 - [24/24] / [100/29] = 1 - 1 / (3.448) = 1 - 0.29 = 0.71。",
            difficulty=3,
            related_lesson_id="stats-foundations-l15-2",
            tags=["Adjusted-R方计算", "自由度调整"],
        ),
        fill(
            "stats-foundations-c15-e9",
            "在评估回归模型残差是否存在一阶序列自相关（Autocorrelation）时，统计报表中输出的 DW 统计量（Durbin-Watson）若在数值上极度接近数字 ___，则表明残差相互独立、完全没有自相关现象。",
            [["2", "2.0"]],
            "Durbin-Watson 统计量取值范围在 0 到 4 之间。等于 2 表示不存在一阶自相关；接近 0 表示强正自相关；接近 4 表示强负自相关。",
            difficulty=1,
            related_lesson_id="stats-foundations-l15-7",
            tags=["Durbin-Watson", "自相关诊断"],
        ),
        multiple_choice(
            "stats-foundations-c15-e10",
            "在机器学习与现代计量经济学中，当数据中存在强烈的多重共线性时，可采用的有效治理手段包括：",
            [
                {"value": "A", "text": "采用岭回归（Ridge Regression），通过引入 L2 正则化在对角线上加入扰动使矩阵稳定可逆"},
                {"value": "B", "text": "采用 Lasso 回归，通过 L1 正则化将部分冗余共线性特征的系数直接压缩归零"},
                {"value": "C", "text": "采用主成分分析（PCA）将高度相关的特征降维转换为相互正交的主成分"},
                {"value": "D", "text": "直接丢弃所有自变量，只用因变量历史均值预测"},
                {"value": "E", "text": "基于业务领域知识对高度重叠的两个特征做差或做比率（构造新复合特征）"},
            ],
            ["A", "B", "C", "E"],
            "D选项完全弃疗无意义；其余均为治理多重共线性的业界标准实战策略。",
            difficulty=3,
            related_lesson_id="stats-foundations-l15-4",
            tags=["多重共线性治理", "正则化", "PCA降维", "特征工程"],
        ),
        single_choice(
            "stats-foundations-c15-e11",
            "在多元回归模型比较中，赤池信息量准则（AIC）与贝叶斯信息量准则（BIC）被广泛用于特征选择。关于 AIC/BIC 的最优选择标准是：",
            [
                {"value": "A", "text": "数值越小越好（在最大化似然的同时对参数个数进行最严厉的惩罚）"},
                {"value": "B", "text": "数值越大越好"},
                {"value": "C", "text": "数值必须等于 0"},
                {"value": "D", "text": "与模型拟合度完全无关"},
            ],
            "A",
            "信息准则定义通常为 -2 ln(L) + penalty。拟合越好 -2ln(L) 越小，参数越精简惩罚项越小，因此 AIC 和 BIC 都是越小代表模型平衡拟合与复杂度越最优。",
            difficulty=2,
            related_lesson_id="stats-foundations-l15-2",
            tags=["AIC与BIC", "模型选择", "奥卡姆剃刀"],
        ),
        open_ex(
            "stats-foundations-c15-e12",
            "请严格推导多元线性回归普通最小二乘法（OLS）参数估计量的矩阵闭式解：$\\hat{\\boldsymbol{\\beta}} = (\\mathbf{X}^T \\mathbf{X})^{-1} \\mathbf{X}^T \\mathbf{Y}$。要求：写出矩阵二次型残差平方和损失函数，应用向量微积分（Matrix Calculus）求关于向量 $\\boldsymbol{\\beta}$ 的梯度并令其为 0，展示推导的完整代数步骤。",
            """推导步骤：
1. 建立矩阵回归方程：
   Y = X β + ε
   其中 Y 为 n×1 向量，X 为 n×(p+1) 设计矩阵，β 为 (p+1)×1 系数向量，ε 为 n×1 随机误差向量。
2. 写出残差向量与残差平方和损失函数（二次型）：
   残差向量 e = Y - X β
   目标函数 S(β) = e^T e = (Y - X β)^T (Y - X β)
3. 展开矩阵乘法：
   S(β) = (Y^T - β^T X^T) (Y - X β)
        = Y^T Y - Y^T X β - β^T X^T Y + β^T X^T X β
   注意到 Y^T X β 是一个 1×1 的标量，标量的转置等于其自身：
   (Y^T X β)^T = β^T X^T Y。
   因此中间两项完全相同，可合并为：
   S(β) = Y^T Y - 2 β^T X^T Y + β^T X^T X β。
4. 应用矩阵微积分法则求关于向量 β 的梯度：
   - ∂(β^T A) / ∂β = A，因此 ∂(2 β^T X^T Y) / ∂β = 2 X^T Y；
   - ∂(β^T A β) / ∂β = 2 A β（当 A 对称时），X^T X 显然是对称半正定矩阵，因此 ∂(β^T X^T X β) / ∂β = 2 X^T X β。
   求导结果：
   ∂S(β) / ∂β = -2 X^T Y + 2 X^T X β。
5. 令梯度等于 0（矩阵形式的正规方程）：
   -2 X^T Y + 2 X^T X β = 0  ==>  (X^T X) β = X^T Y。
6. 求解 β̂：
   假设自变量矩阵 X 满列秩，则 X^T X 为可逆的对称正定矩阵。
   两边左乘逆矩阵 (X^T X)^(-1)：
   β̂_OLS = (X^T X)^(-1) X^T Y。证毕。""",
            "考察线性代数矩阵回归建模、向量微积分二次型求导、正规方程组矩阵求解及满秩可逆性证明。",
            [
                {"point": "将残差平方和正确写为矩阵二次型 (Y - Xβ)^T(Y - Xβ) 并展开", "score": 2},
                {"point": "对向量 β 正确应用矩阵微分求梯度", "score": 1},
                {"point": "由矩阵正规方程左乘逆矩阵解出 β̂ = (X^T X)^(-1) X^T Y", "score": 1},
            ],
            exemplar="""【多元回归矩阵闭式解严格推导】：
设样本量为 $n$，特征数为 $p$（含截距项共 $p+1$ 个参数）。
线性模型为：$\\mathbf{Y} = \\mathbf{X} \\boldsymbol{\\beta} + \\boldsymbol{\\epsilon}$。
其中 $\\mathbf{Y} \\in \\mathbb{R}^{n \\times 1}$，$\\mathbf{X} \\in \\mathbb{R}^{n \\times (p+1)}$，$\\boldsymbol{\\beta} \\in \\mathbb{R}^{(p+1) \\times 1}$。

第一步：构造残差平方和的矩阵二次型。
残差向量为 $\\mathbf{e} = \\mathbf{Y} - \\mathbf{X} \\boldsymbol{\\beta}$。
目标函数 $S(\\boldsymbol{\\beta})$ 等于残差向量的内积：
$$S(\\boldsymbol{\\beta}) = \\mathbf{e}^T \\mathbf{e} = (\\mathbf{Y} - \\mathbf{X} \\boldsymbol{\\beta})^T (\\mathbf{Y} - \\mathbf{X} \\boldsymbol{\\beta})$$

第二步：展开矩阵二次型。
$$S(\\boldsymbol{\\beta}) = (\\mathbf{Y}^T - \\boldsymbol{\\beta}^T \\mathbf{X}^T) (\\mathbf{Y} - \\mathbf{X} \\boldsymbol{\\beta}) = \\mathbf{Y}^T \\mathbf{Y} - \\mathbf{Y}^T \\mathbf{X} \\boldsymbol{\\beta} - \\boldsymbol{\\beta}^T \\mathbf{X}^T \\mathbf{Y} + \\boldsymbol{\\beta}^T \\mathbf{X}^T \\mathbf{X} \\boldsymbol{\\beta}$$
由于 $\\mathbf{Y}^T \\mathbf{X} \\boldsymbol{\\beta}$ 运算结果为 $1 \\times 1$ 的标量，标量的转置等于其自身：
$$(\\mathbf{Y}^T \\mathbf{X} \\boldsymbol{\\beta})^T = \\boldsymbol{\\beta}^T \\mathbf{X}^T \\mathbf{Y}$$
因此中间两项相等，合并得：
$$S(\\boldsymbol{\\beta}) = \\mathbf{Y}^T \\mathbf{Y} - 2 \\boldsymbol{\\beta}^T \\mathbf{X}^T \\mathbf{Y} + \\boldsymbol{\\beta}^T (\\mathbf{X}^T \\mathbf{X}) \\boldsymbol{\\beta}$$

第三步：应用向量矩阵求导法则。
依据矩阵微积分基础公式：
- $\\frac{\\partial (\\boldsymbol{\\beta}^T \\mathbf{a})}{\\partial \\boldsymbol{\\beta}} = \\mathbf{a}$
- $\\frac{\\partial (\\boldsymbol{\\beta}^T \\mathbf{A} \\boldsymbol{\\beta})}{\\partial \\boldsymbol{\\beta}} = 2 \\mathbf{A} \\boldsymbol{\\beta}$ （由于 $\\mathbf{A} = \\mathbf{X}^T\\mathbf{X}$ 是对称矩阵）
对向量 $\\boldsymbol{\\beta}$ 求一阶偏导数（梯度）：
$$\\nabla_{\\boldsymbol{\\beta}} S(\\boldsymbol{\\beta}) = -2 \\mathbf{X}^T \\mathbf{Y} + 2 (\\mathbf{X}^T \\mathbf{X}) \\boldsymbol{\\beta}$$

第四步：令梯度等于零向量，求解极值点。
$$-2 \\mathbf{X}^T \\mathbf{Y} + 2 (\\mathbf{X}^T \\mathbf{X}) \\boldsymbol{\\beta} = \\mathbf{0} \\implies (\\mathbf{X}^T \\mathbf{X}) \\boldsymbol{\\beta} = \\mathbf{X}^T \\mathbf{Y}$$
此式即为著名的**矩阵形式正规方程组（Normal Equations）**。

第五步：求逆完成闭式解。
若设计矩阵 $\\mathbf{X}$ 满足列满秩（各特征列线性无关，不存在完全共线性），则矩阵 $(\\mathbf{X}^T \\mathbf{X})$ 是 $(p+1) \\times (p+1)$ 维严格对称正定矩阵，逆矩阵必然存在。
两端左乘 $(\\mathbf{X}^T \\mathbf{X})^{-1}$：
$$\\hat{\\boldsymbol{\\beta}}_{OLS} = (\\mathbf{X}^T \\mathbf{X})^{-1} \\mathbf{X}^T \\mathbf{Y}$$
证毕。""",
            difficulty=4,
            related_lesson_id="stats-foundations-l15-1",
            tags=["数学推导", "矩阵微积分", "OLS正规方程", "代数大题"],
        ),
        open_ex(
            "stats-foundations-c15-e13",
            "某量化对冲基金研究员在构建股票多因子定价模型（Fama-French 风格）时，使用过去 5 年的股票横截面收益率对以下自变量拟合 OLS 回归：\n- 账面市值比 BM、市盈率 PE 的倒数 EP、市销率 PS 的倒数 SP、过去一个月动量 MOM、过去一年动量 LTM。\n回归输出显示：全局 F 检验高度显著（$p < 0.0001$），模型调整后 $R^2 = 0.35$。但令研究员大惑不解的是：BM、EP 和 SP 三个经典价值因子的偏回归系数 t 检验全都不显著（$p > 0.3$），且 BM 因子的系数符号为负（违背了低估值高收益的价值投资公理），模型放入实盘测试后表现极度脆弱。请为该基金经理写一份诊断排查报告：指出造成'全局显著但价值因子系数不显著且符号翻转'的致命统计学原因，给出具体的量化诊断指标（如 VIF），并设计出一套标准的治理方案（如正则化或因子正交化）。",
            """1. 致命统计学原因诊断：
   - 核心病因：**严重的多重共线性（Severe Multicollinearity）**。
   - 账面市值比（BM）、市盈率倒数（EP）、市销率倒数（SP）本质上都是度量同一类经济学内涵——【股票估值便宜程度（Value）】的不同代理变量。在金融横截面上，这三个因子的两两相关系数通常高达 0.85 ~ 0.95。
   - 危害机理：高度共线使得 X^T X 矩阵严重接近奇异，参数协方差矩阵对角线元素被剧烈放大（方差膨胀）。回归算法无法在控制了 EP 和 SP 的前提下识别 BM 的边际独立增量，导致每个因子的 t 统计量被压制到不显著，且由于噪声放大产生虚假的符号反转（正收益变负系数）。实盘微小扰动会导致权重剧烈震荡崩溃。
2. 量化诊断指标：
   - 计算各因子的方差膨胀因子（VIF）。若 BM、EP、SP 的 VIF 远超 10（甚至高达 30~50），即可百分之百实锤多重共线性。
   - 检查相关系数矩阵与条件数（Condition Number > 30）。
3. 因子治理与模型优化方案：
   - 方案一（行业合成因子）：将 BM、EP、SP 分别进行 Z-score 标准化后，等权或按主成分分析（PCA）第一主成分打分为一个统一的【综合价值因子（Composite Value Factor）】，彻底消灭因子内部内卷。
   - 方案二（因子施密特正交化 / 序贯回归）：保留信息量最大的核心价值因子（如 EP），对其余两个因子做截面回归剥离残差，只使用纯净的正交残差作为独立增量因子。
   - 方案三（引入收缩与特征选择）：采用弹性网（Elastic Net）或岭回归（Ridge Regression），通过 L2 正则化给协方差矩阵对角线添加惩罚扰动，稳定系数方差并压制符号漂移。""",
            "考察金融量化多因子模型中多重共线性的机理爆发、参数符号反转诊断、VIF测度及三大工业级因子正交化/降维治理方案。",
            [
                {"point": "准确指出 BM、EP、SP 高度相关引发的多重共线性是导致系数不显著且符号翻转的根本病因", "score": 2},
                {"point": "给出计算方差膨胀因子 VIF > 10 的量化检验手段", "score": 1},
                {"point": "提出合成复合价值因子（PCA/等权）、施密特正交化或岭回归等工业落地方案", "score": 1},
            ],
            exemplar="""【量化投研模型诊断与风控排查报告】：
1. 异常现象病因定性（严重多重共线性 Multicollinearity）：
本模型呈现'全局 F 极度显著、核心因子 t 全面熄火且符号反常'的现象，是教科书级的多重共线性发作征兆。
- 经济学生成机制重叠：BM（账面市值比）、EP（盈利市值比）、SP（销售市值比）本质上均为同一底层经济实体——'企业被低估程度（Value）'的不同维度度量。在 A 股或美股截面上，三者的两两截面相关系数通常在 0.80 到 0.95 之间。
- 数学破坏机理：自变量矩阵 $\\mathbf{X}$ 严重近似线相关，导致 $(\\mathbf{X}^T \\mathbf{X})$ 矩阵行列式趋近于 0。各系数估计方差 $Var(b_j) = \\sigma^2 [(\\mathbf{X}^T\\mathbf{X})^{-1}]_{jj}$ 发生数万倍的恶性方差膨胀。真实有效信号被巨大的标准误吞噬（使得 $t$ 值微弱、$p > 0.3$），且参数对样本微小噪声极度敏感，在优化求解中被迫通过'一个打出极大正数、另一个打出极大负数'来相互抵消，诱发价值因子系数意外变负。实盘应用时由于系数剧烈抖动产生巨大的换手磨损，导致回测虚高而实盘归零。

2. 量化诊断实操步骤：
- 计算每个因子的方差膨胀因子（VIF）：对 BM 检验其余因子的辅助拟合度。预期 BM、EP、SP 的 VIF 将全面突破 15 以上，确诊多重共线性。
- 计算矩阵条件数（Condition Number）：若 $\\kappa(\\mathbf{X}) = \\sqrt{\\lambda_{\\max}/\\lambda_{\\min}} > 30$，验证系统处于病态方程组状态。

3. 工业级模型重构与因子治理解决方案：
- 方案A（构建复合大类因子，强烈推荐）：严禁将同义反复的估值因子并行喂入无约束 OLS。应将截面去极值与标准化后的 BM、EP、SP 取等权均值（或提取 PCA 第一主成分），合成单一的【复合价值大类因子（Composite Value）】，从根本上消除内部内卷。
- 方案B（因子格拉姆-施密特正交化 / Gram-Schmidt Orthogonalization）：保留最有效的 EP 因子作为基准，将 BM 和 SP 分别对 EP 做截面回归，仅提取不含 EP 信息的纯正交残差部分入模，确保进入回归的各特征矩阵列严格正交。
- 方案C（正则化收缩模型）：放弃纯 OLS，改用岭回归（Ridge）或 ElasticNet。通过引入 L2 范数惩罚项 $(\\mathbf{X}^T\\mathbf{X} + \\lambda \\mathbf{I})^{-1}$，强行修正奇异矩阵特征值，压制系数方差膨胀与符号反转，使因子权重具备坚实样本外泛化能力。""",
            difficulty=5,
            related_lesson_id="stats-foundations-l15-4",
            tags=["量化多因子定价", "多重共线性爆发", "因子正交化", "高阶金融实战"],
        ),
    ]

    ch15 = chapter(
        "stats-foundations-c15",
        "stats-foundations",
        15,
        "多元回归与模型诊断",
        "掌握偏回归系数、Adjusted R² 惩罚、全局 F 与局部 t、多重共线性 VIF、异方差稳健标准误与哑变量交互。",
        c15_lessons,
        c15_exercises,
    )
    return ch15
