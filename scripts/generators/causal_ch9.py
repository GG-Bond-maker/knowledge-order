# -*- coding: utf-8 -*-
"""
Causal Inference - Chapter 9: Instrumental Variables (IV)
"""

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_9():
    c9_lessons = [
        lesson(
            "causal-inference-l9-1",
            "工具变量直觉与内生性破局：借外力穿透未测混杂",
            """### 当存在无法消除的未测混杂与反向因果时
考虑经典难题：教育年限（$D$）对薪水（$Y$）的真实回报。
- 混杂因素：个人的“天资能力（Ability, $U$）”。
- 绝境：天资能力既让一个人更容易考上大学，又让他在职场上本就赚得更多（$D \\leftarrow U \\to Y$），且天资完全不可测！多元回归 OLS 彻底瘫痪。

#### 工具变量（Instrumental Variable, IV）的破局之道：
引入一个外部随机杠杆变量 $Z$（如菲利普·赖特著名的供需工具变量，或安格里斯特的“出生季度”）：
1. **相关性条件（Relevance）**：$Z$ 必须与内生处理变量 $D$ 强相关（$\\text{Cov}(Z, D) \\neq 0$）；
2. **外生性条件（Exogeneity）**：$Z$ 与未测混杂 $U$ 严格独立（$\\text{Cov}(Z, U) = 0$）；
3. **排他性约束（Exclusion Restriction）**：$Z$ **只能通过改变 $D$ 这一唯一渠道来间接影响结局 $Y$**，绝对不能对 $Y$ 产生任何直接因果影响！

```
因果 DAG：
工具变量 Z ──> 内生处理 D ──> 最终结局 Y
                ↖       ↗
              未测混杂 U (能力)
```
- **核心直觉**：工具变量 $Z$ 充当了一把手术刀，将 $D$ 中被混杂 $U$ 污染的部分切掉，**仅提取 $D$ 中被外生随机杠杆 $Z$ 所撬动的纯净外生变异**，用这部分纯净变异去拟合 $Y$！""",
            difficulty=2,
            tips=[
                tip("排他性约束是不可检验的理论假定！必须依赖严密的经济学和业务逻辑进行定性辩护。", "interview"),
            ],
        ),
        lesson(
            "causal-inference-l9-2",
            "局部平均处理效应（LATE）：Angrist-Imbens 诺奖框架",
            """### 工具变量到底估计出了谁的因果效应？
传统学者曾以为 IV 估计出的是全人群的平均因果效应（ATE）。
2021 年诺贝尔经济学奖得主 Joshua Angrist 和 Guido Imbens 证明了具有划时代意义的定理：
**在异质性处理效应下，工具变量法估计的既不是 ATE，也不是 ATT，而是局部平均处理效应（Local Average Treatment Effect, LATE）！**

#### LATE 的精准受众定义：
$$LATE = E[Y(1) - Y(0) \\mid \\text{Compliers}] = E[Y(1) - Y(0) \\mid D(1) = 1, D(0) = 0]$$
- **依从者（Compliers）**：**那些只有受到工具变量 $Z$ 的激励才会改变行为，若不给 $Z$ 就不改变行为的边缘受试人群！**
- 对其他人群完全不适用：
  - 无论给不给 $Z$ 都雷打不动必定参加的人（Always-takers），$Z$ 根本没有撬动他们，IV 对其完全失明；
  - 无论给不给 $Z$ 都誓死不参加的人（Never-takers），IV 同样对其完全失明！

#### 单变量 Wald-IV 估计量公式：
$$LATE = \\frac{\\text{Cov}(Z, Y)}{\\text{Cov}(Z, D)} = \\frac{E[Y \\mid Z=1] - E[Y \\mid Z=0]}{E[D \\mid Z=1] - E[D \\mid Z=0]}$$
- 局限性与启示：不同的工具变量会调动不同的依从人群，因此不同 IV 估计出的 LATE 数值往往不同！""",
            difficulty=3,
            tips=[
                tip("业务汇报时务必向高管讲清：IV 评估的增量仅来自于'被本次活动触达所撬动的边缘新增客群'，不能无底线外推全量。", "tip"),
            ],
        ),
        lesson(
            "causal-inference-l9-3",
            "两阶段最小二乘法（2SLS）：代数机制与矩阵闭式解",
            """### 处理多控制变量与多工具变量的工业标配：2SLS
当模型中包含多个控制变量 $\\mathbf{X}$ 或多个工具变量 $\\mathbf{Z}$ 时，采用**两阶段最小二乘法（Two-Stage Least Squares, 2SLS）**。

#### 2SLS 执行两步曲：
1. **第一阶段（First Stage Regression）**：
   用工具变量 $\\mathbf{Z}$ 和全部外生控制变量 $\\mathbf{X}$ 对内生变量 $D$ 运行 OLS 回归：
   $$D_i = \\pi_0 + \\boldsymbol{\\pi}_1^T \\mathbf{Z}_i + \\boldsymbol{\\pi}_2^T \\mathbf{X}_i + v_i$$
   提取拟合预测值 $\\hat{D}_i$。$\\hat{D}_i$ 仅由外生变量驱动，彻底剥离了内生残差 $v_i$。
2. **第二阶段（Second Stage Regression）**：
   将真实结局 $Y$ 对第一阶段的拟合值 $\\hat{D}_i$ 及外生控制变量 $\\mathbf{X}$ 运行 OLS 回归：
   $$Y_i = \\beta_0 + \\beta_1^{\\text{2SLS}} \\hat{D}_i + \\boldsymbol{\\gamma}^T \\mathbf{X}_i + \\epsilon_i$$
   求出的 $\\hat{\\beta}_1^{\\text{2SLS}}$ 即为无偏一致的因果效应估计量！

#### 矩阵紧凑闭式解：
令投影矩阵 $\\mathbf{P}_Z = \\mathbf{Z}(\\mathbf{Z}^T \\mathbf{Z})^{-1} \\mathbf{Z}^T$：
$$\\hat{\\boldsymbol{\\beta}}_{\\text{2SLS}} = (\\mathbf{X}^T \\mathbf{P}_Z \\mathbf{X})^{-1} \\mathbf{X}^T \\mathbf{P}_Z \\mathbf{Y}$$""",
            difficulty=3,
            tips=[
                tip("手算两阶段时千万不要直接用第二阶段 OLS 汇报标准误！必须使用专业的 IV 软件包自动修正第二阶段残差标准误自由度。", "pitfall"),
            ],
        ),
        lesson(
            "causal-inference-l9-4",
            "弱工具变量危机（Weak Instruments）：F 检验防线",
            """### 工具变量不可承受之轻：弱相关导致灾难
若工具变量与内生变量之间的相关性极度微弱（Weak Instrument）：
- 直觉：你想用一根极其松弛软烂的橡皮筋去撬动千斤顶。
- **严重数学后果**：
  1. **偏误放大**：2SLS 估计量的有限样本偏误，在弱工具变量下会**剧烈向普通的有偏 OLS 估计量靠拢**！原本想消除 OLS 偏误，结果偏误依然全盘保留；
  2. **方差暴增**：估计量的渐近方差等于 $\\frac{\\sigma^2}{N \\cdot \\text{Var}(D) \\cdot R_{D|Z}^2}$。分母中第一阶段 $R^2$ 趋近于 0，标准误瞬间暴增数百倍，置信区间完全失真。

#### 第一阶段 F 检验黄金防火墙：
在完成第一阶段回归后，必须检验所有工具变量联合显著性的 **$F$ 统计量（First-stage F-statistic）**：
- **Staiger & Stock (1997) 经典经验法则**：**第一阶段 $F > 10$！** 若 $F < 10$，直接判定为弱工具变量，模型结论作废！
- **Stock-Yogo (2005) 严格准则**：为了确保 2SLS 相对偏误不超过 10%，单工具变量下要求 **$F > 16.38$（更严格为 $> 104$ 对应 Lee et al. 2021 新准则）**。
- **治理方案**：若遇到弱工具变量，改用有限信息极大似然法（LIML）或 Fuller 修正估计量，具有更好的小样本中枢无偏性。""",
            difficulty=3,
            tips=[
                tip("审稿人检查 2SLS 论文的第一眼，就是直接看第一阶段回归表格底部的 F 值有没有突破 10！", "interview"),
            ],
        ),
        lesson(
            "causal-inference-l9-5",
            "过度识别检验（Over-identification Test）：Sargan-Hansen J 检验",
            """### 拥有多个工具变量时的外生性交叉审判
当工具变量个数 $m$ 与内生变量个数 $k$ 之间存在不同数量关系时：
1. **恰好识别（Just-identified, $m = k$）**：一个工具变量对应一个内生变量。
   - 困境：外生性假定 $\\text{Cov}(Z, \\epsilon) = 0$ 没有任何多余的数学自由度去检验，只能靠理论逻辑辩护。
2. **过度识别（Over-identified, $m > k$）**：拥有比内生变量更多的工具变量（如用 2 个不同的政策随机冲击去识别 1 个内生特征）。
   - 惊喜：拥有了多余的自由度去进行**模型设定与外生性的统计检验！**

#### Sargan-Hansen J 检验（Hansen's J-test）：
- **核心思想**：如果所有工具变量都是外生合法的，那么 2SLS 拟合残差 $\\hat{\\epsilon}$ 应该与所有工具变量 $\\mathbf{Z}$ 都不存在系统性关联。
- **检验构造**：将 2SLS 残差 $\\hat{\\epsilon}$ 对所有工具变量 $\\mathbf{Z}$ 和控制变量做辅助回归，计算 $n R^2$：
  $$J = n R^2_{\\text{aux}} \\sim \\chi^2(m - k)$$
- **原假设 $H_0$**：所有工具变量都是严格外生的（与误差项正交）。
- **决策准则**：
  - **若 $p > 0.05$**：无法拒绝原假设，说明多个工具变量之间高度自洽，支持外生性；
  - **若 $p < 0.05$**：严重报警！拒绝原假设，表明**至少存在一个工具变量违背了外生性或排他性约束**，模型被严重污染！""",
            difficulty=3,
            tips=[
                tip("J 检验无法指出具体哪一个工具变量坏掉了，它只能作为一个整体系统健康的'故障报警灯'。", "note"),
            ],
        ),
        lesson(
            "causal-inference-l9-6",
            "排他性约束破裂的真实商业陷阱与防范",
            """### 寻找好工具变量为什么难于上青天？
在因果推断领域有一句名言：“天底下几乎没有完美的工具变量”。绝大部分看似绝妙的工具变量，都在**排他性约束（Exclusion Restriction）**上轰然倒塌。

#### 真实世界经典翻车案例排查：
1. **天气/降雨量作为出行打车的工具变量？**
   - 设想：下雨天（$Z$）导致乘客叫车需求暴增（$D$），以此估计打车对商圈消费（$Y$）的拉动。
   - 翻车：下雨天不仅让人叫车，下雨本身就直接让人们不想出门逛街（$Z \\to Y$ 直接因果管道产生）！排他性直接破裂。
2. **距离学校/医院的地理距离作为就学/手术的工具变量？**
   - 设想：住得离好大学近（$Z$）更容易上大学（$D$）。
   - 翻车：能买得起好大学旁边学区房的家庭，往往父母更富有、更有文化资本（混杂变量通过学区房价渗透）！
3. **App 弹窗强提醒作为使用新功能的工具变量？**
   - 设想：随机弹窗（$Z$）促使用户体验新功能（$D$）。
   - 翻车：弹窗本身可能会严重骚扰惹怒用户导致直接卸载 App（$Z \\to Y$ 产生负向直接冲击）！

#### 工业级防御措施：
- 严格绘制因果图，排查 $Z$ 是否存在任何绕过 $D$ 直达 $Y$ 的旁路；
- 将潜在旁路变量全部显式作为控制变量 $\\mathbf{X}$ 放入两阶段方程中进行封堵。""",
            difficulty=2,
            tips=[
                tip("面试时若提出一个工具变量，必须立刻主动陈述其潜在威胁及如何通过控制变量进行排他性修补，展现顶级专业度。", "interview"),
            ],
        ),
        lesson(
            "causal-inference-l9-7",
            "算例拆解与自查清单：从第一阶段到 2SLS 完整手算",
            """### 算例拆解：信贷利率降息的 2SLS 全流程手算
某互金平台研究借款利率（$D$，以百分比表示，如 15%）对借款人一年后逾期率（$Y$，以百分比表示）的因果效应。
由于存在严重逆向选择（高风险客户不挑利率，利率与未测高危资质 $U$ 强混杂）。
风控团队利用一次“外生风控系统时钟抖动引发的随机微降息推荐（$Z \\in \\{0, 1\\}$）”作为工具变量。

#### 样本统计矩与辅助回归（样本量 $n = 10,000$）：
1. **第一阶段回归（$D$ 对 $Z$ 回归）**：
   $$D_i = 18.0 - 2.5 Z_i + v_i$$
   - 解释：未获得随机推荐组（$Z=0$）平均利率为 18.0%；获得推荐组（$Z=1$）平均利率降至 15.5%。
   - 第一阶段因果系数 $\\hat{\\pi}_1 = -2.5\\%$。
   - 回归计算第一阶段 $F$ 统计量 $= 125.4$（远大于 10，彻底排除弱工具变量危机！）。
2. **简化式回归（Reduced Form, $Y$ 对 $Z$ 回归）**：
   $$Y_i = 8.0 - 1.25 Z_i + u_i$$
   - 解释：随机推荐直接促成逾期率下降了 1.25 个百分点。
3. **2SLS 因果效应手动结算**：
   利用 Wald-IV 公式：
   $$\\hat{\\beta}_1^{\\text{2SLS}} = \\frac{\\text{简化式系数}}{\\text{第一阶段系数}} = \\frac{-1.25\\%}{-2.5\\%} = +0.50$$
   - **深刻因果结论**：借款利率每降低 1 个百分点，借款人的真实因果逾期率将改善降低 0.50 个百分点！
   - 对比朴素 OLS：直接用 $Y$ 对 $D$ 跑 OLS 算出的系数仅为 $+0.05$（因为逆向选择高危客户掩盖了利率负担影响，被严重向下偏误粉饰）。IV 成功拨云见日！

---

### 第九章自查清单：
- [ ] 工具变量是否满足相关性、外生性与排他性约束三大支柱？
- [ ] 第一阶段回归的 F 统计量是否严格突破了 10（或更严格的 Stock-Yogo 临界值）？
- [ ] 是否向业务方讲清了估计量仅代表“依从者群体（Compliers）”的 LATE？
- [ ] 拥有多个工具变量时，是否汇报了 Sargan-Hansen J 检验（验证过度识别 $p > 0.05$）？
- [ ] 是否在因果图中严格排查了任何直接绕过处理直达结局的后门漏网之鱼？""",
            difficulty=2,
            tips=[
                tip("工具变量法是计量因果皇冠上的明珠。它不要求控制所有混杂，只需一个干净的外生杠杆即可扭转乾坤！", "quote"),
            ],
        ),
    ]

    c9_exercises = [
        single_choice(
            "causal-inference-c9-e1",
            "在因果推断中，一个合格的工具变量（Instrumental Variable, Z）必须且仅须同时满足的核心条件组合是：",
            [
                {"label": "与结局变量 Y 具有 0.99 以上的极高线性相关性", "value": "A"},
                {"label": "相关性（与内生自变量 D 强相关）与外生排他性（与未测混杂无关，且只能通过 D 间接影响结局 Y）", "value": "B"},
                {"label": "必须是连续的正态分布随机变量", "value": "C"},
                {"label": "必须是由政府官方发布的宏观经济指标", "value": "D"},
            ],
            "B",
            "工具变量两大约束：第一阶段相关性（Relevance: Cov(Z, D) ≠ 0）与外生排他性约束（Exogeneity & Exclusion Restriction: Z ⊥ U 且只能通过 D 传递给 Y）。",
            difficulty=1,
            related_lesson_id="causal-inference-l9-1",
            tags=["工具变量条件", "相关性", "排他性约束"],
        ),
        single_choice(
            "causal-inference-c9-e2",
            "在两阶段最小二乘法（2SLS）实操中，判断是否存在“弱工具变量（Weak Instruments）”危机的最经典经验诊断标准是：",
            [
                {"label": "第二阶段 OLS 回归的 R² 必须大于 0.95", "value": "A"},
                {"label": "第一阶段辅助回归中，工具变量联合显著性的 F 统计量必须大于 10（Staiger & Stock 经验准则）", "value": "B"},
                {"label": "样本量必须刚好为 10 的整数倍", "value": "C"},
                {"label": "Durbin-Watson 统计量刚好等于 2.0", "value": "D"},
            ],
            "B",
            "第一阶段 F 统计量度量了工具变量对内生变量的解释强度。F > 10 是防范弱工具变量偏误的最经典基线标准（更严格的为 Stock-Yogo 临界值）。",
            difficulty=2,
            related_lesson_id="causal-inference-l9-4",
            tags=["弱工具变量", "第一阶段F值", "Stock准则"],
        ),
        single_choice(
            "causal-inference-c9-e3",
            "根据 2021 年诺贝尔经济学奖 Angrist & Imbens 的经典因果框架，在存在处理效应异质性的现实场景下，单工具变量 2SLS 估计量所识别的因果量本质是：",
            [
                {"label": "全量大盘总体平均处理效应（ATE）", "value": "A"},
                {"label": "局部平均处理效应（Local Average Treatment Effect, LATE / CACE），仅针对那些因工具变量驱动而改变处理状态的依从者群体（Compliers）", "value": "B"},
                {"label": "永远接受者（Always-takers）的平均因果效应", "value": "C"},
                {"label": "反抗叛逆者（Defiers）的平均因果效应", "value": "D"},
            ],
            "B",
            "IV 只能撬动依从者（Compliers）的行为，对永远接受和永不接受者完全无能为力。因此 IV 估计出的因果效应本质是局部平均处理效应 LATE，不能直接外推为全局 ATE。",
            difficulty=2,
            related_lesson_id="causal-inference-l9-2",
            tags=["LATE", "依从者效应", "Angrist-Imbens"],
        ),
        single_choice(
            "causal-inference-c9-e4",
            "在应用工具变量法时，若工具变量 Z 违背了“排他性约束（Exclusion Restriction）”——即 Z 除了通过 D 影响 Y 之外，还存在直接影响 Y 的其他绕行因果通道，会导致的最直接后果是：",
            [
                {"label": "2SLS 估计量不再具有因果一致性，估计系数严重有偏且无法识别真实因果效应", "value": "A"},
                {"label": "第一阶段回归的 F 统计量自动变为 0", "value": "B"},
                {"label": "模型直接退化为双向固定效应 DID", "value": "C"},
                {"label": "自由度增加一倍", "value": "D"},
            ],
            "A",
            "排他性约束要求阻断 Z 到 Y 的所有直接管道。一旦存在其他通道，Z 与第二阶段扰动项相关，IV 外生性崩溃，导致估计量严重失真有偏。",
            difficulty=2,
            related_lesson_id="causal-inference-l9-6",
            tags=["排他性约束破裂", "内生性残留", "IV失效"],
        ),
        single_choice(
            "causal-inference-c9-e5",
            "在过度识别模型中（工具变量数量 $m$ 严格大于内生自变量数量 $k$），用于联合检验所有工具变量是否满足外生性正交条件的最经典假设检验是：",
            [
                {"label": "怀特异方差检验（White Test）", "value": "A"},
                {"label": "萨根-汉森 J 检验（Sargan-Hansen J-test / 过度识别检验）", "value": "B"},
                {"label": "麦克法登拟合优度检验", "value": "C"},
                {"label": "柯尔莫哥洛夫-斯米尔诺夫检验（KS 检验）", "value": "D"},
            ],
            "B",
            "Hansen's J 检验（或 Sargan 检验）利用多余的自由度检验 2SLS 残差与工具变量的正交性。若 p > 0.05 支持所有工具变量外生；若 p < 0.05 表明至少存在一个无效工具变量。",
            difficulty=3,
            related_lesson_id="causal-inference-l9-5",
            tags=["Hansen-J检验", "过度识别检验", "外生性检验"],
        ),
        multiple_choice(
            "causal-inference-c9-e6",
            "下列实证经济学与数据科学经典研究中，属于运用工具变量识别因果效应的著名案例有：",
            [
                {"label": "Angrist & Krueger (1991)：利用学生的'出生季度（Quarter of Birth）'受义务教育入学法制约作为教育年限的工具变量", "value": "A"},
                {"label": "Card (1993)：利用家庭居住地'距离大学的地理远近'作为个体接受高等教育年限的工具变量", "value": "B"},
                {"label": "Miguel et al. (2004)：利用非洲国家各年份的'降雨量经济冲击'作为经济增长波动的工具变量，研究内战冲突", "value": "C"},
                {"label": "直接用病人的体温作为其是否患有肺炎的工具变量", "value": "D"},
            ],
            ["A", "B", "C"],
            "A、B、C 均为计量经济学教科书级的经典自然实验工具变量设计。D 中体温本身就是肺炎的直接症状结果，完全违背外生性与排他性约束，属于严重伪工具变量。",
            difficulty=2,
            related_lesson_id="causal-inference-l9-1",
            tags=["经典IV案例", "自然实验", "多选题"],
        ),
        multiple_choice(
            "causal-inference-c9-e7",
            "在实操中遭遇“弱工具变量（Weak Instruments）”时，会导致的严重计量统计灾难包括：",
            [
                {"label": "2SLS 估计量的有限样本偏误严重靠拢普通的有偏 OLS 估计量，丧失校偏能力", "value": "A"},
                {"label": "2SLS 估计量的标准误剧烈膨胀发散，置信区间严重失真宽厚", "value": "B"},
                {"label": "常规 Wald t 检验不再服从标准正态或 t 分布，假阳性一类错误率严重超标", "value": "C"},
                {"label": "自动使所有的内生变量变成外生变量", "value": "D"},
            ],
            ["A", "B", "C"],
            "弱工具变量会导致估计量偏向 OLS、方差发散以及推断统计量非正态畸变，是工具变量实证研究最凶险的雷区。D 属于荒谬选项。",
            difficulty=3,
            related_lesson_id="causal-inference-l9-4",
            tags=["弱工具变量危害", "小样本偏误", "推断失真", "多选题"],
        ),
        judge(
            "causal-inference-c9-e8",
            "只要某个特征变量与内生自变量的相关系数高达 0.95，根据相关性定理，该变量就必定是一个无可挑剔的优质工具变量，可以直接放心入模。",
            False,
            "错误。工具变量不仅需要强相关，更核心的前提是必须满足外生性与排他性约束（与未测混杂无关且无直接影响路径）。高度相关的变量往往自身就深深卷入内生性混杂之中（如用期末模拟考成绩作为高考成绩的 IV），排他性彻底崩溃。",
            difficulty=1,
            related_lesson_id="causal-inference-l9-1",
            tags=["工具变量误区", "外生性绝对要求", "判断题"],
        ),
        judge(
            "causal-inference-c9-e9",
            "在具有异质性效应的现实世界中，两名学者针对同一个内生政策（如是否上大学），分别采用“距离大学远近”和“征兵抽签号码”作为工具变量，最终估计出的 LATE 数值差异巨大，这并不代表其中一方计算错误，而是因为两个工具变量调动了不同的依从者（Compliers）子客群。",
            True,
            "正确。LATE 依赖于具体的工具变量所撬动的特定边际人群。因距离就学的贫困农村学生，与因逃避兵役而上大学的学生，其教育因果回报率天然具有异质性差异，两者在理论上完全合法共存。",
            difficulty=2,
            related_lesson_id="causal-inference-l9-2",
            tags=["LATE异质性", "不同依从人群", "判断题"],
        ),
        fill(
            "causal-inference-c9-e10",
            "两阶段最小二乘法在统计学与计量经济学中的标准英文首字母大写缩写是____；在第一阶段回归中用于防御弱工具变量的核心检验统计量是____统计量。",
            ["2SLS", "F"],
            "缩写为 2SLS，排查弱工具变量的核心为第一阶段 F 统计量。",
            difficulty=1,
            related_lesson_id="causal-inference-l9-3",
            tags=["2SLS", "第一阶段F统计量", "填空题"],
        ),
        fill(
            "causal-inference-c9-e11",
            "在 Angrist-Imbens 潜在结果工具变量模型中，由工具变量所识别的、针对依从者群体的因果效应被称为____平均处理效应（填写'局部'或'总体'），英文缩写为 LATE。",
            ["局部"],
            "LATE 全称为 Local Average Treatment Effect（局部平均处理效应）。",
            difficulty=1,
            related_lesson_id="causal-inference-l9-2",
            tags=["局部平均处理效应", "LATE", "填空题"],
        ),
        open_ex(
            "causal-inference-c9-e12",
            "请完成两阶段最小二乘法（2SLS）矩阵投影闭式解及其退化为单变量 Wald-IV 估计量的严谨数学推导：\n设线性总体模型为：\n$$\\mathbf{Y} = \\mathbf{X} \\boldsymbol{\\beta} + \\boldsymbol{\\epsilon}$$\n其中 $\\mathbf{X} \\in \\mathbb{R}^{n \\times k}$ 包含内生解释变量，$\\mathbf{Z} \\in \\mathbb{R}^{n \\times m} (m \\ge k)$ 为外生工具变量矩阵，满足正交性假定 $E[\\mathbf{Z}^T \\boldsymbol{\\epsilon}] = \\mathbf{0}$。\n定义投影矩阵 $\\mathbf{P}_Z = \\mathbf{Z} (\\mathbf{Z}^T \\mathbf{Z})^{-1} \\mathbf{Z}^T$。\n1. 写出第一阶段将 $\\mathbf{X}$ 对 $\\mathbf{Z}$ 做 OLS 回归的拟合矩阵 $\\hat{\\mathbf{X}}$；\n2. 将 $\\hat{\\mathbf{X}}$ 作为解释变量带入第二阶段 OLS 回归，利用正交投影矩阵性质（对称性 $\\mathbf{P}_Z = \\mathbf{P}_Z^T$ 与幂等性 $\\mathbf{P}_Z \\mathbf{P}_Z = \\mathbf{P}_Z$），严格推导证明矩阵闭式解：\n   $$\\hat{\\boldsymbol{\\beta}}_{\\text{2SLS}} = (\\mathbf{X}^T \\mathbf{P}_Z \\mathbf{X})^{-1} \\mathbf{X}^T \\mathbf{P}_Z \\mathbf{Y}$$\n3. 证明在单内生变量、单工具变量且不含其他控制变量的标量情形下，该矩阵闭式解退化为经典的 Wald-IV 估计量 $\\hat{\\beta}_{\\text{IV}} = \\frac{\\text{Cov}(Z, Y)}{\\text{Cov}(Z, X)}$。",
            """推导步骤如下：
1. 第一阶段拟合矩阵推导：
   将内生矩阵 X 的每一列分别对工具变量矩阵 Z 拟合 OLS：
   X = Z Π + V => Π̂ = (Z^T Z)^(-1) Z^T X
   则 X 的第一阶段拟合预测值为：
   X̂ = Z Π̂ = Z (Z^T Z)^(-1) Z^T X = P_Z X
   其中 P_Z = Z (Z^T Z)^(-1) Z^T 为向 Z 的列空间的正交投影矩阵。

2. 第二阶段 OLS 回归与矩阵化简：
   将结局 Y 对第一阶段拟合值 X̂ 运行标准 OLS 回归：
   β̂_{2SLS} = (X̂^T X̂)^(-1) X̂^T Y
   将 X̂ = P_Z X 带入展开：
   X̂^T X̂ = (P_Z X)^T (P_Z X) = X^T P_Z^T P_Z X
   利用正交投影矩阵的两大基础代数性质：
   - 对称性：P_Z^T = P_Z；
   - 幂等性：P_Z P_Z = P_Z；
   因此：X^T P_Z^T P_Z X = X^T P_Z P_Z X = X^T P_Z X
   同理展开分子项：
   X̂^T Y = (P_Z X)^T Y = X^T P_Z^T Y = X^T P_Z Y
   代回即严格证明了：
   β̂_{2SLS} = (X^T P_Z X)^(-1) X^T P_Z Y
   证毕。

3. 单变量标量情形下的退化证明：
   当样本数据中心化（离均差形式，即均值为0）且只有单个内生标量 x 与单个工具变量标量 z 时：
   Z 是 n×1 向量，Z^T Z = ∑ z_i^2 = n Var(z)；
   P_z x = z (z^T z)^(-1) z^T x = z [ ∑ z_i x_i / ∑ z_i^2 ]
   代入 2SLS 公式：
   分母 x^T P_z x = x^T z (z^T z)^(-1) z^T x = (x^T z)^2 / (z^T z)
   分子 x^T P_z Y = x^T z (z^T z)^(-1) z^T y = (x^T z)(z^T y) / (z^T z)
   相除：
   β̂_{IV} = [ (x^T z)(z^T y) / (z^T z) ] / [ (x^T z)^2 / (z^T z) ]
           = (z^T y) / (z^T x)
           = [ ∑ z_i y_i ] / [ ∑ z_i x_i ]
   分子除以 n 为 Cov(z, y)，分母除以 n 为 Cov(z, x)：
   β̂_{IV} = Cov(z, y) / Cov(z, x)
   证毕。该推导展示了 2SLS 矩阵投影与一元 Wald 估计量的完全代数一致性。""",
            "考察 2SLS 第一阶段投影矩阵建立、第二阶段正交投影矩阵对称幂等化简推导及单变量下退化为 Wald 协方差比率证明。",
            [
                {"point": "正确写出第一阶段拟合预测值 X̂ = P_Z X", "score": 1},
                {"point": "利用投影矩阵对称性与幂等性严格推导出 (X^T P_Z X)^(-1) X^T P_Z Y 闭式解", "score": 2},
                {"point": "准确证明在单变量下退化为 Cov(Z, Y) / Cov(Z, X) 的 Wald 标量形式", "score": 1},
            ],
            exemplar="""【2SLS 两阶段最小二乘法矩阵闭式解与 Wald-IV 估计量严密数学推导】：

一、模型架构与投影算子定义：
设总体结构方程满足矩阵紧凑表达：
$$\\mathbf{Y} = \\mathbf{X} \\boldsymbol{\\beta} + \\boldsymbol{\\epsilon}$$
其中：
- $\\mathbf{Y} \\in \\mathbb{R}^{n \\times 1}$ 为结局向量；
- $\\mathbf{X} \\in \\mathbb{R}^{n \\times k}$ 为解释变量矩阵（包含一个或多个内生自变量，导致 $E[\\mathbf{X}^T \\boldsymbol{\\epsilon}] \\neq \\mathbf{0}$）；
- $\\mathbf{Z} \\in \\mathbb{R}^{n \\times m} (m \\ge k)$ 为外生工具变量矩阵，满足严格正交外生性：$E[\\mathbf{Z}^T \\boldsymbol{\\epsilon}] = \\mathbf{0}$，且具有满列秩 $\\text{rank}(\\mathbf{Z}) = m$。
定义向工具变量列空间 $\\mathcal{S}(\\mathbf{Z})$ 的正交投影矩阵（Hat Matrix / Projection Matrix）：
$$\\mathbf{P}_Z = \\mathbf{Z} (\\mathbf{Z}^T \\mathbf{Z})^{-1} \\mathbf{Z}^T$$

二、2SLS 矩阵推导全过程：
1. 第一阶段回归与拟合值矩阵提取：
   对内生设计矩阵 $\\mathbf{X}$ 的每一列，分别关于工具变量矩阵 $\\mathbf{Z}$ 拟合 OLS 回归：
   $$\\mathbf{X} = \\mathbf{Z} \\boldsymbol{\\Pi} + \\mathbf{V}$$
   根据普通最小二乘求解：
   $$\\hat{\\boldsymbol{\\Pi}} = (\\mathbf{Z}^T \\mathbf{Z})^{-1} \\mathbf{Z}^T \\mathbf{X}$$
   提取第一阶段的内生变量纯净拟合预测值矩阵 $\\hat{\\mathbf{X}}$：
   $$\\hat{\\mathbf{X}} = \\mathbf{Z} \\hat{\\boldsymbol{\\Pi}} = \\mathbf{Z} (\\mathbf{Z}^T \\mathbf{Z})^{-1} \\mathbf{Z}^T \\mathbf{X} = \\mathbf{P}_Z \\mathbf{X}$$
   物理性质：拟合值 $\\hat{\\mathbf{X}}$ 完全处于工具变量的线性张成空间内，与扰动项渐近正交。

2. 第二阶段 OLS 回归与正交投影代数化简：
   将结局 $\\mathbf{Y}$ 对第一阶段生成的纯净预测值 $\\hat{\\mathbf{X}}$ 进行第二阶段多元 OLS 回归：
   $$\\hat{\\boldsymbol{\\beta}}_{\\text{2SLS}} = (\\hat{\\mathbf{X}}^T \\hat{\\mathbf{X}})^{-1} \\hat{\\mathbf{X}}^T \\mathbf{Y}$$
   将 $\\hat{\\mathbf{X}} = \\mathbf{P}_Z \\mathbf{X}$ 带入方阵二次型：
   $$\\hat{\\mathbf{X}}^T \\hat{\\mathbf{X}} = (\\mathbf{P}_Z \\mathbf{X})^T (\\mathbf{P}_Z \\mathbf{X}) = \\mathbf{X}^T \\mathbf{P}_Z^T \\mathbf{P}_Z \\mathbf{X}$$
   应用正交投影矩阵的两大基本代数恒等性质：
   - 对称性（Symmetry）：$\\mathbf{P}_Z^T = \\mathbf{P}_Z$
   - 幂等性（Idempotence）：$\\mathbf{P}_Z \\mathbf{P}_Z = \\mathbf{P}_Z$
   故有：
   $$\\hat{\\mathbf{X}}^T \\hat{\\mathbf{X}} = \\mathbf{X}^T \\mathbf{P}_Z \\mathbf{X}$$
   同理代入分子项向量：
   $$\\hat{\\mathbf{X}}^T \\mathbf{Y} = (\\mathbf{P}_Z \\mathbf{X})^T \\mathbf{Y} = \\mathbf{X}^T \\mathbf{P}_Z^T \\mathbf{Y} = \\mathbf{X}^T \\mathbf{P}_Z \\mathbf{Y}$$
   联立上述两式，即严格推导证明了 2SLS 著名矩阵闭式解：
   $$\\hat{\\boldsymbol{\\beta}}_{\\text{2SLS}} = \\Big( \\mathbf{X}^T \\mathbf{P}_Z \\mathbf{X} \\Big)^{-1} \\mathbf{X}^T \\mathbf{P}_Z \\mathbf{Y}$$
   证毕。

三、退化为单变量 Wald-IV 估计量证明：
考察特殊情形：样本已进行均值中心化（去均值处理），模型仅包含单一标量内生变量 $x_i$ 和单一标量工具变量 $z_i$（无其余协变量）：
此时 $\\mathbf{X} = \\mathbf{x} \\in \\mathbb{R}^{n \\times 1}$，$\\mathbf{Z} = \\mathbf{z} \\in \\mathbb{R}^{n \\times 1}$。
1. 计算标量内积：
   $$\\mathbf{z}^T \\mathbf{z} = \\sum_{i=1}^n z_i^2 = n \\widehat{\\text{Var}}(z)$$
   $$\\mathbf{z}^T \\mathbf{x} = \\sum_{i=1}^n z_i x_i = n \\widehat{\\text{Cov}}(z, x)$$
   $$\\mathbf{z}^T \\mathbf{y} = \\sum_{i=1}^n z_i y_i = n \\widehat{\\text{Cov}}(z, y)$$
2. 展开投影矩阵二次型：
   $$\\mathbf{x}^T \\mathbf{P}_z \\mathbf{x} = \\mathbf{x}^T \\mathbf{z} (\\mathbf{z}^T \\mathbf{z})^{-1} \\mathbf{z}^T \\mathbf{x} = \\frac{(\\mathbf{x}^T \\mathbf{z})^2}{\\mathbf{z}^T \\mathbf{z}} = \\frac{[n \\widehat{\\text{Cov}}(z, x)]^2}{n \\widehat{\\text{Var}}(z)}$$
   $$\\mathbf{x}^T \\mathbf{P}_z \\mathbf{y} = \\mathbf{x}^T \\mathbf{z} (\\mathbf{z}^T \\mathbf{z})^{-1} \\mathbf{z}^T \\mathbf{y} = \\frac{(\\mathbf{x}^T \\mathbf{z})(\\mathbf{z}^T \\mathbf{y})}{\\mathbf{z}^T \\mathbf{z}} = \\frac{[n \\widehat{\\text{Cov}}(z, x)][n \\widehat{\\text{Cov}}(z, y)]}{n \\widehat{\\text{Var}}(z)}$$
3. 两式相除导出标量估计量：
   $$\\hat{\\beta}_{\\text{2SLS}} = \\frac{\\mathbf{x}^T \\mathbf{P}_z \\mathbf{y}}{\\mathbf{x}^T \\mathbf{P}_z \\mathbf{x}} = \\frac{\\frac{[n \\widehat{\\text{Cov}}(z, x)][n \\widehat{\\text{Cov}}(z, y)]}{n \\widehat{\\text{Var}}(z)}}{\\frac{[n \\widehat{\\text{Cov}}(z, x)]^2}{n \\widehat{\\text{Var}}(z)}} = \\frac{n \\widehat{\\text{Cov}}(z, y)}{n \\widehat{\\text{Cov}}(z, x)} = \\frac{\\widehat{\\text{Cov}}(z, y)}{\\widehat{\\text{Cov}}(z, x)}$$
   此式与经典 Wald-IV 估计量完全完全一致。证毕。""",
            difficulty=4,
            related_lesson_id="causal-inference-l9-3",
            tags=["数学推导", "2SLS闭式解", "投影矩阵", "Wald估计量证明"],
        ),
        open_ex(
            "causal-inference-c9-e13",
            "某拥有数亿日活的移动内容资讯社交平台正在评估“用户在信息流中的主动互动行为数（点赞、评论、转发总量 D）”对“用户 30 天后次月留存率（Y）”的因果效应。\n- 业务困境：直接用留存率对互动数跑 OLS 回归，得到高得令人难以置信的巨大正相关系数。然而资深分析师深知：高互动用户本身就是极度忠诚、拥有大量熟人关系的硬核死忠粉（存在极严重的未测粘性混杂 U 和反向因果），OLS 结果充斥着巨大的选择性虚高泡沫。\n- 算法工程创新：推荐算法团队在客户端设计了一次外生随机实验：对大盘 100 万新入驻用户，系统伪随机数生成器以 50% 概率触发下发“轻量化互动微气泡呼吸动效引导弹窗（Z=1 表示触发弹窗，Z=0 表示不触发）”。该动效大幅提升了用户初期的点赞欲望。\n\n请你担任平台首席因果算法科学家，完成如下工业级 IV 评估与风控全流程方案：\n1. 机制论证：详细阐述为什么微气泡弹窗 $Z$ 可以作为内生互动 $D$ 的工具变量（严格证明其满足相关性条件 Relevance 与外生性假定 Exogeneity）；\n2. 2SLS 模型设定与第一阶段诊断：写出第一阶段和第二阶段的回归模型方程，给出第一阶段弱工具变量 F 检验的判别红线，说明如何通过 Wald 比率计算因果效应；\n3. 排他性约束（Exclusion Restriction）的潜在危机反思：若部分受试用户由于该呼吸气泡弹窗遮挡了新闻阅读正文，产生了严重的心理烦躁并直接关闭 App 乃至卸载。深入分析这种副作用是如何在 DAG 图中打破排他性约束的，并推导它会导致 2SLS 对互动因果效应产生何种方向的偏误；\n4. LATE 局限性与商业落地建议：解释为何利用该弹窗估计出的 LATE 仅能代表“依从者（Compliers）”，并向产品总监说明该结论能否直接外推到全量老用户大盘。",
            """1. 工具变量 Z 的有效性论证：
   - 相关性（Relevance）：微气泡呼吸动效通过显著的 UI 视觉动效提示，大幅降低了用户的认知决策成本，显著刺激了用户的点赞、转发动作，确保第一阶段 Cov(Z, D) 显著异于 0。
   - 外生性（Exogeneity）：微气泡下发与否完全由客户端底层的独立物理伪随机哈希算法决定（等价于抛硬币），与用户的潜在性格、社交偏好、死忠程度（U）完全独立（Z ⊥ U）。

2. 2SLS 模型设定与第一阶段诊断：
   - 第一阶段回归方程：
     D_i = π_0 + π_1 Z_i + γ_1^T X_i + v_i
     其中 X_i 为用户注册渠道、设备机型等外生协变量。
     第一阶段弱 IV 检验：计算 π_1 显著性的 F 统计量。必须满足 F > 10（或更严格的 F > 104），确立微气泡对互动的强拉动，彻底排除弱工具变量方差发散风险。
   - 第二阶段回归方程：
     Y_i = β_0 + β_1^2SLS D̂_i + γ_2^T X_i + ε_i
     其中 D̂_i 为第一阶段拟合预测值。
     Wald 因果效应比率：β_1^2SLS = [E(Y|Z=1) - E(Y|Z=0)] / [E(D|Z=1) - E(D|Z=0)]。

3. 排他性约束破裂剖析与偏误方向推导：
   - 机制与 DAG 破坏：
     排他性约束要求 Z 到 Y 只能有唯一的通道 Z -> D -> Y。
     若微气泡遮挡正文引起用户反感卸载，则在 DAG 图中直接开辟了一条【绕过互动 D 直达结局 Y 的负向直接通道：Z -> Y（负向直接惩罚）】！
   - 偏误方向严格推演：
     简化式分子为总效应：E[Y|Z=1] - E[Y|Z=0] = (间接互动因果增益 β_1 · π_1) + (弹窗反感直接负效应 δ_direct)。
     两阶段 Wald 估计量变为：
     β̂_IV = [β_1 · π_1 + δ_direct] / π_1 = β_1 + [δ_direct / π_1]
     已知第一阶段气泡增加互动 π_1 > 0，而反感直接负效应 δ_direct < 0。
     偏误项 = δ_direct / π_1 < 0！
     结论：模型将严重【向下负偏（严重低估互动的真实因果价值）】，甚至误把有价值的互动增益算成负值！

4. LATE 局限性与高管商业决策建议：
   - 依从者（Compliers）人群画像：
     LATE 仅能反映那部分“没气泡就不互动、看见气泡才产生冲动互动”的摇摆易受影响客群（Compliers，通常是刚入驻、行为尚在建立期的新手用户）。
   - 外推局限性：
     对于平台已沉淀的核心老用户（Always-takers），他们即使不看气泡也会自发高频互动，其互动对留存的因果粘性机制与新手完全不同。
   - 商业落地策略：
     a) 严禁在全量老用户群体粗暴复制微气泡弹窗；
     b) 将该增量策略精准靶向定位于“注册前 7 天的新用户新手破冰冷启动期”，在兼顾阅读体验（设置可关闭卡尺）的前提下，实现 Compliers 人群的留存转化最大化。""",
            "考察资讯平台真实场景下 IV 机制论证、2SLS 建模与弱 IV 诊断、排他性破裂（遮挡负效应）数学偏误方向严密推导、以及 LATE 局部效应商业外推局限与精准运营落地。",
            [
                {"point": "规范论证随机弹窗的强相关性与外生独立性", "score": 1},
                {"point": "正确写出 2SLS 两阶段方程并明确第一阶段 F>10 判别红线与 Wald 比率", "score": 1},
                {"point": "深刻分析弹窗遮挡引发直接负通道 Z->Y，严格推导出偏误项 δ/π<0 导致因果效应被严重低估", "score": 1},
                {"point": "剖析 Compliers 局限性并提出面向新用户冷启动的精准商业落地策略", "score": 1},
            ],
            exemplar="""【移动内容平台用户互动因果归因与工具变量（2SLS）工程落地全案】：

一、微气泡引导工具变量（IV）三大核心支柱严密论证
以客户端随机微气泡呼吸动效弹窗（$Z \\in \\{0, 1\\}$）作为内生互动行为总量（$D$）的工具变量：
1. 第一阶段强相关性（Relevance）：
   呼吸微气泡在视觉动线上提供了强烈的即时交互线索（Affordance），将原本需要用户主动寻找的低频点赞/评论操作转化为低门槛的无意识冲动交互。实测显著撬动人均互动次数增加，满足 $\\text{Cov}(Z, D) \\neq 0$。
2. 外生独立性（Exogeneity）：
   微气泡是否下发由推荐引擎在客户端渲染前通过 MurmurHash3 算法对设备 ID 取模判定，分流比严格为 $50\\% : 50\\%$，物理机制保证了 $Z$ 与用户的潜在留存意愿、社交死忠属性等不可测混杂特征 $U$ 严格相互独立：
   $$Z \\perp \\{Y(1), Y(0), U\\}$$
3. 理论排他性（Exclusion Restriction）：
   微气泡本身仅为一个临时的动画视觉组件，在理想设计下，它不包含任何实质性的金币奖励或核心内容变动，只能且必须通过“激活用户完成点赞/评论（$D$）”这一唯一业务路径间接影响最终留存。

二、2SLS 两阶段计量模型构建与第一阶段弱 IV 质控
1. 第一阶段回归方程（剥离内生性）：
   $$D_i = \\pi_0 + \\pi_1 Z_i + \\boldsymbol{\\gamma}_1^T \\mathbf{X}_i + v_i$$
   其中 $\\mathbf{X}_i$ 包含机型档次、网络环境、注册渠道等外生背景变量。
   - **第一阶段强弱诊断底线**：计算参数 $\\pi_1$ 的第一阶段 $F$ 统计量：
     $$F = \\frac{(R_{\\text{unrestricted}}^2 - R_{\\text{restricted}}^2) / 1}{(1 - R_{\\text{unrestricted}}^2) / (n - k - 1)}$$
     必须严格满足 **$F > 16.38$（Stock-Yogo 10% 偏误临界值，工业界通常要求 $F > 50$）**。若 $F < 10$，立即熔断放弃 2SLS，防止小样本偏误向有偏 OLS 严重靠拢。
2. 第二阶段结构回归方程：
   提取第一阶段拟合预测值 $\\hat{D}_i = \\hat{\\pi}_0 + \\hat{\\pi}_1 Z_i + \\hat{\\boldsymbol{\\gamma}}_1^T \\mathbf{X}_i$（纯净外生变异）：
   $$Y_i = \\beta_0 + \\beta_1^{\\text{2SLS}} \\hat{D}_i + \\boldsymbol{\\gamma}_2^T \\mathbf{X}_i + \\epsilon_i$$
   $\\beta_1^{\\text{2SLS}}$ 严格剥离了死忠粉自选择偏误，输出互动对留存的真实无偏因果弹性。

三、排他性约束破裂之机制与偏误方向数学严谨推导
若微气泡由于前端布局 Bug 遮挡了新闻正文，引发用户反感甚至愤而卸载：
1. 因果图破裂拓扑：
   系统产生了绕过互动 $D$ 直达留存 $Y$ 的第二条直接因果管道：$Z \\xrightarrow{\\delta_{\\text{direct}}} Y$。
   全数据生成真实方程为：
   $$Y_i = \\alpha_0 + \\beta_1 D_i + \\delta_{\\text{direct}} Z_i + \\epsilon_i$$
2. 偏误方向代数推演：
   计算外生工具变量 $Z$ 驱动结局的简化式总效应（Reduced Form）：
   $$\\text{RF} = E[Y \\mid Z=1] - E[Y \\mid Z=0] = \\beta_1 \\cdot \\pi_1 + \\delta_{\\text{direct}}$$
   两阶段 Wald 估计量在数学上等于简化式除以第一阶段：
   $$\\hat{\\beta}_1^{\\text{2SLS}} = \\frac{\\text{RF}}{\\pi_1} = \\frac{\\beta_1 \\pi_1 + \\delta_{\\text{direct}}}{\\pi_1} = \\beta_1 + \\underbrace{\\frac{\\delta_{\\text{direct}}}{\\pi_1}}_{\\text{排他性违背偏误项}}$$
3. 符号与业务定性结论：
   - 第一阶段微气泡显著激发互动，故 $\\pi_1 > 0$；
   - 气泡遮挡正文引起用户反感甚至卸载，直接对留存造成负面冲击，故 $\\delta_{\\text{direct}} < 0$；
   - 乘积比率偏误项：$\\frac{\\delta_{\\text{direct}}}{\\pi_1} < 0$！
   **数学实锤结论**：该遮挡副作用会导致 2SLS 对互动因果价值产生**致命的向下严重低估（Negative Bias）**！它把 UI 体验变差带来的负向掉留存，错误地扣减在点赞互动身上，可能得出“互动反而损害留存”的灾难性荒谬误判。

四、LATE 局部因果局限性与工业级商业策略对齐
1. 依从者（Compliers）的人群边界：
   该 2SLS 估计出的因果效应并非面向全量网民的 ATE，而严格是针对“因为微气泡提示才被动点赞、若不提示绝不点赞”的摇摆易受影响新手客群（Compliers）。
2. 不可直接全量外推的机理：
   对于平台中沉淀 1 年以上的老用户（Always-takers），其互动行为来源于熟人社交裂变与深度内容共鸣，其每多一次评论所带来的留存粘性，与新手因好奇点击气泡所产生的浅层点赞具有完全不同的因果机制。
3. 商业决策落地指南：
   - 策略分层：微气泡产品功能应精准限定为**“新手前 7 天冷启动破冰插件”**，通过前置交互引导快速跨过“Aha! Moment”留存临界点；
   - 体验治理：紧急修复前端遮挡，引入滑动即隐（Auto-dismiss）交互，彻底切断直接负向管道 $\\delta_{\\text{direct}}$，恢复排他性纯洁识别；
   - 指标采纳：以修正后的 LATE 参数测算新手互动激励的合理商业预算，严禁将该参数套用于全量大盘老用户的商业模型。""",
            difficulty=5,
            related_lesson_id="causal-inference-l9-7",
            tags=["互联网互动因果", "2SLS实战", "排他性破裂推导", "LATE外推风控"],
        ),
    ]

    ch9 = chapter(
        "causal-inference-c9",
        "causal-inference",
        9,
        "工具变量法（IV, Instrumental Variables）",
        "掌握工具变量相关性与外生性条件、LATE 依从者框架、2SLS 矩阵推导、弱工具变量第一阶段 F 检验、以及 Hansen J 检验与排他性破裂排查。",
        c9_lessons,
        c9_exercises,
    )
    return ch9
