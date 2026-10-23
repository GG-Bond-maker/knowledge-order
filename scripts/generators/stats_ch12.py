# -*- coding: utf-8 -*-
"""
Stats Foundations - Chapter 12: Analysis of Variance (ANOVA) and Multiple Comparisons
"""

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_12():
    c12_lessons = [
        lesson(
            "stats-foundations-l12-1",
            "为什么不能对多组直接做两两 t 检验？假阳性率的指数级膨胀",
            """### 比较三组及以上数据时，初学者最大的坑！
假设产品经理设计了 3 种新 UI 方案（方案A、方案B、方案C）与当前对照组（组D）进行对比，共有 $k = 4$ 组。
初学者自然会想：“为什么不把这 4 组两两配对，做 $\\binom{4}{2} = 6$ 次双样本 t 检验呢？”

#### 1. 全局第一类错误率（Family-Wise Error Rate, FWER）的灾难性爆炸
假定每次单独的 t 检验显著性水平设定为 $\\alpha = 0.05$。
这意味着在单次检验中，不犯第 I 类错误的概率为 $1 - 0.05 = 0.95$。
如果连续独立进行 $m = 6$ 次两两比较：
**6 次检验中至少犯一次假阳性错误（把无用改动误判为显著有效）的总体概率为**：
$$\\alpha_{\\text{total}} = 1 - (0.95)^6 = 1 - 0.735 = 0.265 = 26.5\\%!$$
如果比较 10 个组（$m = \\binom{10}{2} = 45$ 次检验）：
$$\\alpha_{\\text{total}} = 1 - (0.95)^{45} = 1 - 0.099 = 90.1\\%!$$
**这意味着即便所有方案完全毫无差异，你也几乎必然（90%概率）会误打误撞抓出一个“虚假显著”的伪结论！**

#### 2. 统计学解决方案：方差分析（ANOVA）
ANOVA 由罗纳德·费舍尔在 1920 年代发明。它的核心突破是：**只用一个总括性检验（Omnibus Test），在严格锁死 $\\alpha = 0.05$ 的前提下，一枪命中所有组间是否存在任何实质差异！**""",
            difficulty=2,
            tips=[
                tip("凡是组数 k ≥ 3，严禁直接起手做多次两两 t 检验！必须先跑单因素 ANOVA 检验全局是否显著，再做专门的事后校正多重比较。", "pitfall"),
            ],
        ),
        lesson(
            "stats-foundations-l12-2",
            "方差分析的灵魂思想：用方差来推断均值！",
            """### 名字叫'方差分析'，为什么能用来比较'平均值'？
这是统计学中最巧妙的直觉之一。
设共有 $k$ 个处理组，总样本量为 $N$。数据中所有数值之所以各不相同，其背后的波动（总变异）来自两大源头：

```
                    数据总变异 (SST)
                           │
            ┌──────────────┴──────────────┐
            ▼                             ▼
   组间变异 (Between, SSB)        组内变异 (Within, SSW)
   (由于不同方案处理导致的差异)    (不可控的个体随机抽样纯噪音)
```

1. **组内变异（Within-group Variance / 误差）**：
   在同一个组内部，大家接受的是完全相同的方案，但每个人的数值依然有高有低。
   *原因*：个体天生随机波动、测量随机误差。这代表了**纯粹的系统环境噪音水平**！
2. **组间变异（Between-group Variance / 处理效应）**：
   不同组的组均值各不相同。
   *原因*：**既包含个体随机噪音，又包含了不同方案真正带来的'处理效果（Treatment Effect）'！**

#### 判别直觉：信噪比（F 统计量）
$$\\text{信号与噪音之比} = \\frac{\\text{组间波动（处理效应 + 噪音）}}{\\text{组内波动（纯随机噪音）}}$$
- 如果不同方案根本没有效果（$H_0$ 为真），那么组间波动完全就是由组内的纯随机噪音引起的，两者的比值**接近 1**！
- 如果方案真正产生了显著效果，组间波动会被额外大幅拉大，该比值会**显著大于 1**！""",
            difficulty=2,
            tips=[
                tip("ANOVA 的核心本质就是计算'信噪比'：分子是信号加噪音，分母是纯噪音。只有信号远压倒噪音时，才判定存在显著差异。", "note"),
            ],
        ),
        lesson(
            "stats-foundations-l12-3",
            "平方和分解定理与自由度拆解：数学骨架",
            """### SST = SSB + SSW 恒等式
设共有 $k$ 个组，第 $j$ 组样本量 $n_j$，观测值为 $X_{ij}$，该组均值为 $\\bar{X}_j$，全部 $N$ 个数据的总均值为 $\\bar{X}_{\\bullet\\bullet}$。

#### 1. 总平方和（Total Sum of Squares, $SST$）
所有单个数据偏离总均值的平方和：
$$SST = \\sum_{j=1}^k \\sum_{i=1}^{n_j} (X_{ij} - \\bar{X}_{\\bullet\\bullet})^2, \\quad df = N - 1$$

#### 2. 组间平方和（Between / Treatment, $SSB$ 或 $SSA$）
各组均值偏离总均值的加权平方和（反映处理效果）：
$$SSB = \\sum_{j=1}^k n_j (\\bar{X}_j - \\bar{X}_{\\bullet\\bullet})^2, \\quad df = k - 1$$

#### 3. 组内平方和（Within / Error, $SSW$ 或 $SSE$）
各组内部数据偏离自身组均值的平方和（反映随机误差）：
$$SSW = \\sum_{j=1}^k \\sum_{i=1}^{n_j} (X_{ij} - \\bar{X}_j)^2, \\quad df = N - k$$

#### 自由度与平方和的双重严格守恒：
$$SST = SSB + SSW$$
$$df_{total} = df_{between} + df_{within} \\implies (N - 1) = (k - 1) + (N - k)$$""",
            difficulty=3,
            tips=[
                tip("自由度守恒是检验 ANOVA 计算是否正确的天然防火墙：(k - 1) + (N - k) 恒等于 N - 1，绝不会丢失任何一个维度。", "note"),
            ],
        ),
        lesson(
            "stats-foundations-l12-4",
            "均方与 F 统计量构造：从平方和到比率检验",
            """### 平方和除以自由度得到'平均方差'（均方）
平方和会随样本量增大而累积，不能直接比大小，必须各自除以对应的自由度，化为**均方（Mean Square, MS）**：

1. **组间均方（Mean Square Between, $MSB$）**：
   $$MSB = \\frac{SSB}{k - 1}$$
2. **组内均方（Mean Square Within, $MSW$ 或 $MSE$）**：
   $$MSW = \\frac{SSW}{N - k}$$

#### 3. F 检验统计量
$$F = \\frac{MSB}{MSW} \\sim F(k - 1, N - k)$$
- 原假设：$H_0: \\mu_1 = \\mu_2 = \\dots = \\mu_k$（所有 $k$ 组的总体均值完全相等）。
- 备择假设：$H_1: \\text{至少有两个组的总体均值不相等}$（注意：只要有一对不同即可，不要求所有都不同！）。
- **决策规则**：
  查 $F$ 分布表临界值 $F_{\\alpha}(k - 1, N - k)$。因为只有当组间变异远大于组内变异时才拒绝原假设，所以 **ANOVA 永远是单侧右尾拒绝域**！若 $F > F_{\\alpha}$（或 $p < \\alpha$），拒绝 $H_0$！""",
            difficulty=2,
            tips=[
                tip("常考易错点：ANOVA 的 F 检验虽然比较的是多组双向差异，但其拒绝域永远只在 F 分布的'右尾单侧'！", "interview"),
            ],
        ),
        lesson(
            "stats-foundations-l12-5",
            "方差分析的三大先决条件及违背对策",
            """### 在点击运行 ANOVA 之前必须自问的三句话
1. **独立性假设（Independence）**：
   - 每个观测值之间相互独立，各组之间相互独立。
   - *违背后果*：若数据存在时间序列自相关或人际网络聚集，假阳性率会彻底失控。**这是最不可违背的硬前提**！
2. **正态性假设（Normality）**：
   - 每一个处理组内的总体分布均服从正态分布。
   - *稳健性*：根据大数与中心极限定理，只要各组样本量适中（每组 $n_j \\ge 20$）且组大小相近，ANOVA 对轻度偏态**高度稳健**。
3. **方差齐性假设（Homoscedasticity）**：
   - 所有各组的真实总体方差必须相等：$\\sigma_1^2 = \\sigma_2^2 = \\dots = \\sigma_k^2$。
   - *违背后果与对策*：
     - 如果各组样本量相等（均衡设计, Balanced Design），ANOVA 对轻度方差不齐依然较稳健。
     - 如果样本量不相等且方差严重不齐，必须改用 **Welch's ANOVA**！
     - 如果数据严重偏态，改用**非参数 Kruskal-Wallis 检验**！""",
            difficulty=2,
            tips=[
                tip("均衡设计（每组样本量相等）是实验设计的保护神：平衡样本量能使 ANOVA 对正态性和方差齐性的偏离产生极强的天然免疫力。", "performance"),
            ],
        ),
        lesson(
            "stats-foundations-l12-6",
            "事后多重比较：Tukey HSD、Bonferroni 与 FDR",
            """### 当 ANOVA 拒绝了 H0，究竟是哪两组在不同？
ANOVA 只回答了“大家不全相等”，但没告诉我们“具体是 A 胜过 B，还是 B 胜过 C”。此时必须进入**事后检验（Post-Hoc Tests）**，并对多重比较的假阳性进行严密校正！

#### 1. 邦弗朗尼校正法（Bonferroni Correction，极度保守安全）
- 逻辑极简：做 $m$ 次两两检验，就把每次检验的显著性门槛直接除以 $m$：
  $$\\alpha_{\\text{adj}} = \\frac{\\alpha}{m}$$
  或者将算出的 P 值乘上 $m$：$p_{\\text{adj}} = \\min(1, m \\times p)$。
- *优点*：彻底将总假阳性率（FWER）锁死在 $\\alpha$ 以内。
- *缺点*：当比较次数较多时极度保守，假阴性率（漏诊）暴增！

#### 2. 图基真实显著差异法（Tukey's HSD, Honestly Significant Difference）
- **推荐用于全排列两两配对均值比较**！
- 基于学生化极差分布（Studentized Range Distribution），在控制总体 FWER 的同时，统计功效显著优于粗暴的 Bonferroni。

#### 3. 错误发现率控制（FDR / Benjamini-Hochberg 算法）
在基因组学与多因子选股（成千上万次假设检验）中，不再强求“全盘零假阳性（FWER）”，而是控制“在所有被宣布为显著的结论中，假阳性的平均比例不超过 $q$（如 5%）”，大幅释放发现真理的统计效力！""",
            difficulty=3,
            tips=[
                tip("在 A/B/C 测试中，如果只有 3~5 组两两比较，首选 Tukey HSD；如果是 10,000 个基因表达筛查，唯一选择是 Benjamini-Hochberg (FDR)。", "interview"),
            ],
        ),
        lesson(
            "stats-foundations-l12-7",
            "算例拆解与自查清单：完整手算 ANOVA 表与效应量 η²",
            """## 完整标准 ANOVA 分析算例

某在线教育产品测试 3 种视频播放器清晰度自适应算法（算法A、算法B、算法C）对完课时长（分钟）的影响。每组随机分流 5 名学员，总样本量 $N = 15$。

- **算法A（组1）**：$\\{10, 12, 14, 11, 13\\}$，组均值 $\\bar{x}_1 = 12$
- **算法B（组2）**：$\\{14, 16, 17, 15, 18\\}$，组均值 $\\bar{x}_2 = 16$
- **算法C（组3）**：$\\{18, 20, 22, 19, 21\\}$，组均值 $\\bar{x}_3 = 20$
- **全部数据总均值**：$\\bar{X}_{\\bullet\\bullet} = (12 + 16 + 20) / 3 = 16$ 分钟。

---

### 第一步：计算组间平方和（SSB）
各组样本量 $n = 5$：
$$SSB = 5 \\times (12 - 16)^2 + 5 \\times (16 - 16)^2 + 5 \\times (20 - 16)^2$$
$$SSB = 5 \\times (-4)^2 + 5 \\times (0)^2 + 5 \\times (4)^2 = 5 \\times 16 + 0 + 80 = 160$$
自由度：$df_B = k - 1 = 3 - 1 = 2$。
组间均方：$MSB = SSB / df_B = 160 / 2 = 80$。

### 第二步：计算组内平方和（SSW）
- 组1内部离差平方和：$(10-12)^2 + (12-12)^2 + (14-12)^2 + (11-12)^2 + (13-12)^2 = 4 + 0 + 4 + 1 + 1 = 10$。
- 组2内部离差平方和：$(14-16)^2 + (16-16)^2 + (17-16)^2 + (15-16)^2 + (18-16)^2 = 4 + 0 + 1 + 1 + 4 = 10$。
- 组3内部离差平方和：$(18-20)^2 + (20-20)^2 + (22-20)^2 + (19-20)^2 + (21-20)^2 = 4 + 0 + 4 + 1 + 1 = 10$。
总误差平方和：$SSW = 10 + 10 + 10 = 30$。
自由度：$df_W = N - k = 15 - 3 = 12$。
组内均方：$MSW = SSW / df_W = 30 / 12 = 2.5$。

### 第三步：计算 F 统计量与标准方差分析表
$$F = \\frac{MSB}{MSW} = \\frac{80}{2.5} = 32.0$$

| 变异来源 | 平方和 (SS) | 自由度 (df) | 均方 (MS) | F 统计量 | P 值 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **组间 (Between)** | 160 | 2 | 80 | **32.0** | **p < 0.0001** |
| **组内 (Within)** | 30 | 12 | 2.5 | | |
| **总计 (Total)** | 190 | 14 | | | |

### 第四步：计算效应量 $\\eta^2$（Eta-squared）
$$\\eta^2 = \\frac{SSB}{SST} = \\frac{160}{190} \\approx 0.842 \\quad (84.2\\%!)$$
含义：完课时长总差异中，有高达 **84.2% 的变异能够被不同的算法清晰度完全解释**！
结论：在 $\\alpha = 0.01$ 水平下，$F = 32.0$ 远超临界值 $F_{0.01}(2, 12) = 6.93$。三种算法的完课时长存在极其显著的真实差异，算法C显著优于算法B，算法B显著优于算法A。""",
            difficulty=3,
            tips=[
                tip("效应量 η² 判定标准：0.01 微弱，0.06 中等，0.14 以上属于强效应。本案 η²=0.84 属于统治级巨大效应。", "note"),
            ],
        ),
    ]

    c12_exercises = [
        single_choice(
            "stats-foundations-c12-e1",
            "在比较 5 个独立实验组的均值是否存在差异时，如果放弃单因素方差分析，而是直接对这 5 个组进行两两独立样本 t 检验（共需做 10 次检验）。设每次检验的显著性水平设为 $\\alpha = 0.05$。假设所有组别真实均值完全相同，至少犯一次第 I 类错误（假阳性）的总体累积概率约为：",
            [
                {"value": "A", "text": "约 40.1%"},
                {"value": "B", "text": "正好等于 5%"},
                {"value": "C", "text": "等于 50%"},
                {"value": "D", "text": "接近 0%"},
            ],
            "A",
            "不犯错误的联合概率为 (1 - 0.05)^10 = (0.95)^10 ≈ 0.5987。至少犯一次假阳性错误的概率 FWER = 1 - 0.5987 = 0.4013 ≈ 40.1%！假阳性率剧烈膨胀，这是必须使用 ANOVA 的核心原因。",
            difficulty=2,
            related_lesson_id="stats-foundations-l12-1",
            tags=["FWER膨胀", "多重比较危害", "ANOVA必要性"],
        ),
        judge(
            "stats-foundations-c12-e2",
            "单因素方差分析（ANOVA）的备择假设是：所有参与比较的 $k$ 个处理组的总体均值两两互不相等。",
            False,
            "原假设是所有组均值全部相等；备择假设仅仅是'至少有两个组的均值不相等'（只要有一对不同即成立，不要求全都不相等）。",
            difficulty=1,
            related_lesson_id="stats-foundations-l12-4",
            tags=["备择假设", "概念辨析"],
        ),
        fill(
            "stats-foundations-c12-e3",
            "某单因素方差分析试验共设置了 $k = 4$ 个处理组，每组分配了 10 名受试者（总样本量 $N = 40$）。根据自由度拆解原理，组内平方和（误差平方和）的自由度 $df_{\\text{within}}$ 等于 ___。",
            [["36"]],
            "组内自由度公式：df_within = N - k = 40 - 4 = 36。",
            difficulty=1,
            related_lesson_id="stats-foundations-l12-3",
            tags=["ANOVA自由度", "计算题"],
        ),
        single_choice(
            "stats-foundations-c12-e4",
            "方差分析中计算出的 F 检验统计量本质上代表的是一个'信噪比'。其分子组间均方（MSB）与分母组内均方（MSW）分别反映了：",
            [
                {"value": "A", "text": "分子反映了处理效应叠加随机误差，分母仅反映纯粹的个体随机误差"},
                {"value": "B", "text": "分子仅反映随机误差，分母反映处理效应"},
                {"value": "C", "text": "分子和分母完全独立于任何处理效应"},
                {"value": "D", "text": "分子是总体均值，分母是样本方差"},
            ],
            "A",
            "ANOVA 的灵魂机制：组内变异在同处理下产生，代表纯随机噪音基准；组间变异包含了方案处理差异加随机噪音。只有当处理产生真实效果时，分子才会显著超越分母使 F 统计量远大于 1。",
            difficulty=2,
            related_lesson_id="stats-foundations-l12-2",
            tags=["信噪比", "MSB与MSW", "ANOVA原理"],
        ),
        multiple_choice(
            "stats-foundations-c12-e5",
            "关于单因素方差分析的先决条件与稳健性，下列叙述正确的有：",
            [
                {"value": "A", "text": "独立性假设是方差分析最关键的生命线，观测数据相互独立不可违背"},
                {"value": "B", "text": "当各组样本量相等（均衡设计）时，方差分析对轻度的非正态性和方差不齐具有良好的稳健性"},
                {"value": "C", "text": "当各组方差严重不齐且样本量不等时，应使用 Welch's ANOVA 替代经典 ANOVA"},
                {"value": "D", "text": "方差分析的 F 检验拒绝域位于 F 分布的双侧尾部"},
                {"value": "E", "text": "总平方和严格等于组间平方和与组内平方和之和：SST = SSB + SSW"},
            ],
            ["A", "B", "C", "E"],
            "D选项错误：F检验的拒绝域永远位于'单侧右尾'；其余选项均正确。",
            difficulty=3,
            related_lesson_id="stats-foundations-l12-5",
            tags=["先决条件", "稳健性", "Welch-ANOVA"],
        ),
        judge(
            "stats-foundations-c12-e6",
            "在事后多重比较中，邦弗朗尼校正（Bonferroni Correction）的方法是将原本的显著性水平 $\\alpha$ 直接除以比较总次数 $m$。",
            True,
            "Bonferroni 校正极其保守直接，令调整后的显著性阈值 α_adj = α / m，以确保全局第一类错误率（FWER）严格受控在 α 以内。",
            difficulty=1,
            related_lesson_id="stats-foundations-l12-6",
            tags=["Bonferroni校正", "事后检验"],
        ),
        fill(
            "stats-foundations-c12-e7",
            "某方差分析表计算得到组间平方和 $SSB = 60$，组内平方和 $SSW = 140$。根据效应量公式，该处理对总变异的解释比例 $\\eta^2$（Eta-squared）等于 ___%（填纯数字）。",
            [["30", "30.0"]],
            "总平方和 SST = SSB + SSW = 60 + 140 = 200。η² = SSB / SST = 60 / 200 = 0.30 = 30%。",
            difficulty=2,
            related_lesson_id="stats-foundations-l12-7",
            tags=["效应量", "Eta-squared", "方差解释度"],
        ),
        single_choice(
            "stats-foundations-c12-e8",
            "在单因素方差分析中，如果计算得到的组间均方 $MSB = 45$，组内均方 $MSW = 15$。则对应的 F 检验统计量的值为：",
            [
                {"value": "A", "text": "3.0"},
                {"value": "B", "text": "0.33"},
                {"value": "C", "text": "60.0"},
                {"value": "D", "text": "675.0"},
            ],
            "A",
            "F 统计量公式 F = MSB / MSW = 45 / 15 = 3.0。",
            difficulty=1,
            related_lesson_id="stats-foundations-l12-4",
            tags=["F统计量", "基础计算"],
        ),
        fill(
            "stats-foundations-c12-e9",
            "在涉及全排列两两均值对比的事后多重检验中，既能有效控制全局错误率（FWER）又比 Bonferroni 拥有更高统计功效的首选方法是 ___ HSD 检验。（填统计学家姓氏中文音译，如 图基 或 杜克）",
            [["图基", "杜克", "Tukey"]],
            "Tukey's Honestly Significant Difference (HSD) 检验是经典两两事后检验的首选。",
            difficulty=1,
            related_lesson_id="stats-foundations-l12-6",
            tags=["Tukey-HSD", "事后检验"],
        ),
        multiple_choice(
            "stats-foundations-c12-e10",
            "在现代生物信息学或量化金融多因子挖掘中，当面临数万次并行的假设检验时，相比于严格控制'全盘零伪阳性（FWER）'的 Bonferroni 法，采用'错误发现率（FDR / Benjamini-Hochberg）'的核心优势在于：",
            [
                {"value": "A", "text": "放宽了极端死板的控制标准，避免将大量真实的微弱信号漏判（大幅提升统计功效）"},
                {"value": "B", "text": "它控制的是在所有被拒绝的假设（报警）中，伪阳性所占的期望比例"},
                {"value": "C", "text": "完全不需要计算原始 P 值即可直接完成排序"},
                {"value": "D", "text": "适应高维小样本场景下大规模特征筛选的真实科学探索需求"},
                {"value": "E", "text": "能够将每个单独检验的 P 值全部变为 0"},
            ],
            ["A", "B", "D"],
            "C和E荒谬错误；FDR 控制通过允许可接受的误报比例换取对真实信号的强力挖掘，是高通量数据挖掘的标准框架。A, B, D 正确。",
            difficulty=3,
            related_lesson_id="stats-foundations-l12-6",
            tags=["FDR控制", "高通量检验", "Benjamini-Hochberg"],
        ),
        single_choice(
            "stats-foundations-c12-e11",
            "某单因素方差分析求得 $F = 1.05$，对应 $p = 0.42 > 0.05$。下一步正确的统计决策动作是：",
            [
                {"value": "A", "text": "未能拒绝原假设，全括性检验表明没有证据证明组间存在差异，不需要也不应该继续做后续的事后多重两两比较"},
                {"value": "B", "text": "虽然整体不显著，但必须继续对每一对组做 t 检验直到找出显著的一对"},
                {"value": "C", "text": "证明所有样本数据完全相同"},
                {"value": "D", "text": "将组别减少一半后重新跑 ANOVA"},
            ],
            "A",
            "全括性检验（Omnibus test）不显著意味着信噪比未脱离随机波动。此时强行继续做事后两两比较属于典型的数据钓鱼作弊。应当果断接受未能拒绝原假设的结论。",
            difficulty=2,
            related_lesson_id="stats-foundations-l12-4",
            tags=["决策纪律", "防数据钓鱼", "全括性检验"],
        ),
        open_ex(
            "stats-foundations-c12-e12",
            "请严格推导单因素方差分析的平方和分解恒等式：证明 $SST = SSB + SSW$。要求写出观测偏差 $(X_{ij} - \\bar{X}_{\\bullet\\bullet})$ 拆分为组内离差与组间离差的代数展开过程，并证明交叉乘积项在双重求和下严格归零。",
            """推导步骤：
1. 恒等式拆分观测离差：
   对任意组内观测值 X_ij，将其偏离总均值的距离拆分为两部分：
   (X_ij - X̄_••) = (X_ij - X̄_j) + (X̄_j - X̄_••)
   其中 (X_ij - X̄_j) 为组内误差，(X̄_j - X̄_••) 为组间处理效应。
2. 两边平方并对所有组 j 和所有个体 i 进行双重求和：
   ∑_{j=1}^k ∑_{i=1}^{n_j} (X_ij - X̄_••)² = ∑_{j=1}^k ∑_{i=1}^{n_j} [ (X_ij - X̄_j) + (X̄_j - X̄_••) ]²
3. 展开右侧完全平方：
   = ∑_j ∑_i (X_ij - X̄_j)² + ∑_j ∑_i (X̄_j - X̄_••)² + 2 ∑_j ∑_i (X_ij - X̄_j)(X̄_j - X̄_••)
   第一项为 SSW；第二项因 (X̄_j - X̄_••) 与 i 无关，求和 n_j 次后为 ∑_j n_j (X̄_j - X̄_••)² = SSB。
4. 证明交叉乘积项严格等于 0：
   考察交叉项：2 ∑_{j=1}^k (X̄_j - X̄_••) [ ∑_{i=1}^{n_j} (X_ij - X̄_j) ]
   注意到中括号内部是每个数据偏离该组自身组均值的离差和：
   ∑_{i=1}^{n_j} (X_ij - X̄_j) = (∑_{i=1}^{n_j} X_ij) - n_j X̄_j = n_j X̄_j - n_j X̄_j = 0！
   因此无论组均值是多少，每一组内部的离差和恒为 0，交叉乘积项被整体清零！
5. 结论：
   ∑_j ∑_i (X_ij - X̄_••)² = ∑_j n_j (X̄_j - X̄_••)² + ∑_j ∑_i (X_ij - X̄_j)²
   即：SST = SSB + SSW。证毕。""",
            "考察方差分析代数分解、平方项展开与残差离差和为零的严格数学证明。",
            [
                {"point": "正确将离差拆解为组内离差与组间离差之和", "score": 1},
                {"point": "展开完全平方项识别出 SSB 与 SSW 表达式", "score": 1},
                {"point": "利用组内离差和严格为零 ∑(X_ij - X̄_j) = 0 证明交叉项为 0", "score": 2},
            ],
            exemplar="""【证明】：
第一步：对任意观测值 $X_{ij}$（第 $j$ 组第 $i$ 个观测）进行恒等拆分：
$$X_{ij} - \\bar{X}_{\\bullet\\bullet} = (X_{ij} - \\bar{X}_j) + (\\bar{X}_j - \\bar{X}_{\\bullet\\bullet})$$
其中 $(X_{ij} - \\bar{X}_j)$ 代表个体偏离本组均值的随机误差，$(\\bar{X}_j - \\bar{X}_{\\bullet\\bullet})$ 代表本组均值偏离全盘总均值的处理效应。

第二步：两边平方并在全样本上求和（外层遍历组 $j=1..k$，内层遍历组员 $i=1..n_j$）：
$$\\sum_{j=1}^k \\sum_{i=1}^{n_j} (X_{ij} - \\bar{X}_{\\bullet\\bullet})^2 = \\sum_{j=1}^k \\sum_{i=1}^{n_j} \\left[ (X_{ij} - \\bar{X}_j) + (\\bar{X}_j - \\bar{X}_{\\bullet\\bullet}) \\right]^2$$
展开右侧平方项：
$$= \\sum_{j=1}^k \\sum_{i=1}^{n_j} (X_{ij} - \\bar{X}_j)^2 + \\sum_{j=1}^k \\sum_{i=1}^{n_j} (\\bar{X}_j - \\bar{X}_{\\bullet\\bullet})^2 + 2 \\sum_{j=1}^k \\sum_{i=1}^{n_j} (X_{ij} - \\bar{X}_j)(\\bar{X}_j - \\bar{X}_{\\bullet\\bullet})$$

第三步：识别各主体项：
- 第一项：$\\sum_{j=1}^k \\sum_{i=1}^{n_j} (X_{ij} - \\bar{X}_j)^2 = SSW$（组内平方和）。
- 第二项：由于 $(\\bar{X}_j - \\bar{X}_{\\bullet\\bullet})^2$ 与指标 $i$ 完全无关，累加 $n_j$ 次直接提取：
  $$\\sum_{j=1}^k n_j (\\bar{X}_j - \\bar{X}_{\\bullet\\bullet})^2 = SSB \\quad (\\text{组间平方和})$$

第四步：证明交叉乘积项恒等于 0：
提取与内层求和指标 $i$ 无关的公因式 $(\\bar{X}_j - \\bar{X}_{\\bullet\\bullet})$：
$$\\text{交叉项} = 2 \\sum_{j=1}^k (\\bar{X}_j - \\bar{X}_{\\bullet\\bullet}) \\left[ \\sum_{i=1}^{n_j} (X_{ij} - \\bar{X}_j) \\right]$$
根据样本均值的数学定义，一组数据围绕其自身均值的偏差代数和严格为 0：
$$\\sum_{i=1}^{n_j} (X_{ij} - \\bar{X}_j) = \\sum_{i=1}^{n_j} X_{ij} - n_j \\bar{X}_j = n_j \\bar{X}_j - n_j \\bar{X}_j = 0$$
因此内层括号项对于每一个组 $j$ 都恒等于 0，导致交叉乘积项整体归零。

综上所述：$SST = SSB + SSW$ 恒成立。证毕。""",
            difficulty=4,
            related_lesson_id="stats-foundations-l12-3",
            tags=["数学证明", "方差分解", "SST=SSB+SSW", "经典数理统计"],
        ),
        open_ex(
            "stats-foundations-c12-e13",
            "在大型多臂在线营销实验（Multi-Arm Bandit / 多方案 A/B/C/D 测试）中，增长团队同时上线了 4 种不同的优惠券满减策略（100减20、200减50、300减80与随机红包）以及 1 个无优惠券基准对照组（共 5 组）。数据科学家在运行完单因素 ANOVA 后获得了 $p = 0.001$（整体高度显著）。随后产品经理要求对这 5 个组进行两两比较挑出胜者，数据分析师和算法工程师产生了严重分歧：\n- 分析师坚持使用经典 Bonferroni 校正（设 $\\alpha = 0.05 / 10 = 0.005$）；\n- 算法工程师认为直接上 Tukey HSD 更好；\n- 增长负责人则提出：'我们只想知道哪种满减券比无券对照组好，我们根本不在乎满减券之间谁比谁好！'\n请站在统计决策架构师的角度，评价三者的方案，并基于增长负责人的业务目标设计最优的'Dunnett's 检验'方案（说明为什么 Dunnett 检验在'多对一'对照场景下不仅完全控制 FWER，还能提供远胜 Bonferroni 的敏锐检验力）。",
            """1. 评价分析师方案（Bonferroni）：
   - 能够有效防守 FWER，但极其保守。做 10 次比较把阈值硬压到 0.005，会严重错杀具有实际业务增益的有效券种（犯第 II 类错误）。
2. 评价算法工程师方案（Tukey HSD）：
   - Tukey HSD 适用于【全排列探索】（全盘两两比较）。如果团队确实需要知道'满减A是否击败满减B'，Tukey 是最优选择。
3. 评价增长负责人的业务诉求与 Dunnett 检验（终极正解！）：
   - 增长负责人的洞察极其精准：业务场景是【所有实验组与单一对照组对比】（Many-to-One），根本无需做 C(5,2)=10 次全排列比较，而只需要做 4 次比较（方案1 vs 对照组，方案2 vs 对照组，方案3 vs 对照组，方案4 vs 对照组）！
   - Dunnett's 检验：专为'多个处理组与唯一定照组对比'而发明的特种多重比较算法！
     a. 它充分利用了所有比较都共享同一个对照组样本而产生的协方差相关性结构；
     b. 只消耗 4 次对比的检验预算，其临界值远低于盲目的 Bonferroni 和通用的 Tukey；
     c. 在严格将全局 FWER 控制在 5% 的同时，大幅提升统计检验功效（Power），最容易敏锐检出哪种优惠券战胜了对照组！""",
            "考察多组比较中全排列两两（Tukey）与多对一对照（Dunnett）的场景识别、多重校正保守度权衡及最优推断架构设计。",
            [
                {"point": "指出 Bonferroni 做 10 次校正过于保守导致有效券种漏判", "score": 1},
                {"point": "指出 Tukey 适用于全排列，但在'多对一'场景下属于杀鸡用牛刀浪费功效", "score": 1},
                {"point": "准确引入 Dunnett 检验，阐明其仅做 4 次多对一比较、利用共享对照组相关性提升检验力的优越性", "score": 2},
            ],
            exemplar="""【方案评价与决策架构设计】：
1. 方案评价：
- 分析师方案（Bonferroni 全排列校正）：将 $\\alpha$ 苛刻降至 $0.05 / 10 = 0.005$。它假设了最坏的 10 种可能，付出了极高的假阴性代价。原本具有显著提升的优惠券极易因门槛过高被误判为无效，严重阻碍业务增长。
- 算法组方案（Tukey HSD）：是全排列探索（All-pairwise Comparisons）的黄金准则。但本案业务方并不关心'满减A与满减B谁更好'，Tukey 将宝贵的统计效能浪费在无关紧要的交叉配对上。

2. 最佳方案：采用专门的 Dunnett's 检验（Many-to-One Comparison）：
增长负责人的核心诉求是典型的【多处理组 vs 单一对照组】结构。
- 缩减无效比较：全排列有 $\\binom{5}{2} = 10$ 次比较，而与对照组对比仅需 $k - 1 = 4$ 次关键决策。
- 利用多变量相关性结构：因为这 4 次比较共享完全相同的对照组数据，各检验统计量之间天然具备 $\\rho = 0.5$ 的数学正相关性。Dunnett 检验利用该多元 t 分布积分，求出的临界值比 Bonferroni 宽松得多。
- 结论：Dunnett 检验既 100% 严密防守了全局假阳性（FWER ≤ 0.05），又以最敏锐的统计功效协助增长团队精准捕获真正击败基准的爆款优惠券！""",
            difficulty=5,
            related_lesson_id="stats-foundations-l12-6",
            tags=["Dunnett检验", "多臂实验", "多重比较校正", "增长架构设计"],
        ),
    ]

    ch12 = chapter(
        "stats-foundations-c12",
        "stats-foundations",
        12,
        "方差分析与多重比较",
        "掌握 FWER 膨胀根源、组间/组内方差信噪比分解、F分布决策、Tukey/Bonferroni/Dunnett 事后校正。",
        c12_lessons,
        c12_exercises,
    )
    return ch12
