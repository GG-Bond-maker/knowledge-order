# -*- coding: utf-8 -*-
"""
Stats Foundations - Chapter 4: Discrete Random Variables and Common Distributions
"""

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_4():
    c4_lessons = [
        lesson(
            "stats-foundations-l4-1",
            "随机变量的概念：从样本空间到实数轴的映射",
            """### 为什么需要把事件变成数字？
在前面的章节中，事件还是诸如“正面”、“红球”、“合格品”这样的文字描述。文字无法直接代入数学函数求导或求和。

**随机变量（Random Variable, 通常记为大写字母 $X, Y, Z$）**：
是一个将样本空间 $\\Omega$ 中的每一个可能结果 $\\omega$，映射到实数轴 $\\mathbb{R}$ 上的**确定性实值函数**：
$$X: \\Omega \\to \\mathbb{R}, \\quad \\omega \\mapsto X(\\omega)$$

- 掷硬币：规定 $X(\\text{正面}) = 1, X(\\text{反面}) = 0$。
- 掷两次骰子：令 $Y$ 为两次点数之和（可能取值为 $2, 3, \\dots, 12$）。
- 关键区分：
  - **大写字母 $X$**：代表随机变量本身（未做试验前的抽象函数/规则）。
  - **小写字母 $x$**：代表该随机变量具体观测到的某个实数值（实现值，Realization）。""",
            difficulty=1,
            tips=[
                tip("随机变量既不是'随机的'也不是'变量'，它的本质是一个严格的数学函数！随机性来自样本空间抽出的样本点 ω，函数映射本身是确定性的。", "note"),
            ],
        ),
        lesson(
            "stats-foundations-l4-2",
            "概率质量函数（PMF）与累积分布函数（CDF）",
            """### 描述离散分布的两大标准工具
如果随机变量 $X$ 的所有可能取值是有限个或可列无限个，称其为**离散型随机变量（Discrete RV）**。

#### 1. 概率质量函数（Probability Mass Function, PMF）
记为 $p(x) = P(X = x)$，表示 $X$ 恰好等于某个值 $x$ 的概率。
PMF 必须满足两大公理性质：
1. **非负性**：对任意 $x$，$p(x) \\ge 0$。
2. **归一性**：所有可能取值的概率和严格等于 1：$\\sum_x p(x) = 1$。

#### 2. 累积分布函数（Cumulative Distribution Function, CDF）
记为 $F(x) = P(X \\le x)$，表示 $X$ 落在区间 $(-\\infty, x]$ 上的累积概率。
CDF 的核心性质（对离散和连续变量均成立）：
1. **单调不减**：若 $x_1 < x_2$，则 $F(x_1) \\le F(x_2)$。
2. **极限界限**：$\\lim_{x \\to -\\infty} F(x) = 0$，且 $\\lim_{x \\to +\\infty} F(x) = 1$。
3. **右连续性**：$\\lim_{t \\to x^+} F(t) = F(x)$。
4. **离散阶梯状**：离散变量的 CDF 呈现为从左到右阶梯上升的跳跃函数，跳跃的高度恰好等于该点的 PMF 值 $P(X = x)$！""",
            difficulty=1,
            tips=[
                tip("求区间概率神器：P(a < X ≤ b) = F(b) - F(a)。注意离散变量端点是否有等于号对结果影响极大！", "pitfall"),
            ],
        ),
        lesson(
            "stats-foundations-l4-3",
            "数学期望与方差：长期加权平均与离散波动",
            """### 随机变量的核心数字特征
#### 1. 数学期望（Expectation / Expected Value, $E(X)$ 或 $\\mu$）
期望是随机变量取值的**概率加权平均数**，代表长期重复试验的理论平均值：
$$E(X) = \\sum_i x_i P(X = x_i)$$
**期望的重要性质**：
- **线性性（巨好用！）**：对任意常数 $a, b$ 和任意两个随机变量 $X, Y$（无论是否独立！）：
  $$E(aX + bY) = aE(X) + bE(Y)$$
- **无意识统计学家法则（LOTUS）**：求函数 $g(X)$ 的期望无需先推导 $g(X)$ 的分布，直接加权：
  $$E[g(X)] = \\sum_i g(x_i) P(X = x_i)$$

#### 2. 方差（Variance, $Var(X)$ 或 $\\sigma^2$）
衡量随机变量偏离其期望值的离散程度（波动性）：
$$Var(X) = E[(X - E(X))^2] = E(X^2) - [E(X)]^2$$
**方差的重要性质**：
- $Var(c) = 0$（常数的方差为0）。
- $Var(aX + b) = a^2 Var(X)$（加常数不改变波动，乘常数出来变平方！）。
- **若 $X$ 与 $Y$ 相互独立**，则：$Var(X + Y) = Var(X) + Var(Y)$。""",
            difficulty=2,
            tips=[
                tip("千万记住：E(X²) 绝不等于 [E(X)]²！根据方差非负性 Var(X) = E(X²) - [E(X)]² ≥ 0，必有 E(X²) ≥ [E(X)]²，仅在X为常数时取等号。", "pitfall"),
            ],
        ),
        lesson(
            "stats-foundations-l4-4",
            "伯努利分布与二项分布：独立重复'抛硬币'模型",
            """### 统计学中使用频率最高的基础分布
#### 1. 伯努利分布（Bernoulli / 0-1分布）
只进行单次试验，只有两种结果：“成功”（记为1，概率 $p$）和“失败”（记为0，概率 $1-p$）。
- $E(X) = p$
- $Var(X) = p(1-p)$

#### 2. 二项分布（Binomial Distribution, $X \\sim B(n, p)$）
将上述伯努利试验独立重复进行 $n$ 次，成功次数记为 $X$。
- **PMF**：
  $$P(X = k) = \\binom{n}{k} p^k (1-p)^{n-k}, \\quad k = 0, 1, 2, \\dots, n$$
- **期望与方差推导（利用线性性秒杀）**：
  $X$ 可分解为 $n$ 个独立伯努利变量之和：$X = I_1 + I_2 + \\dots + I_n$。
  $$E(X) = \\sum_{i=1}^n E(I_i) = n p$$
  $$Var(X) = \\sum_{i=1}^n Var(I_i) = n p (1-p)$$
- **标准差**：$\\sigma = \\sqrt{n p (1-p)}$。""",
            difficulty=2,
            tips=[
                tip("当 p=0.5 时，方差取得极大值 n/4；当 p 极其接近 0 或 1 时，结果几乎必然确定，方差趋向于 0。", "note"),
            ],
        ),
        lesson(
            "stats-foundations-l4-5",
            "几何分布与负二项分布：为了成功需要等待多久？",
            """### 等待型随机变量
#### 1. 几何分布（Geometric Distribution, $X \\sim \\text{Geom}(p)$）
在独立重复伯努利试验中，**试验直到首次成功所需要的总试验次数** $X$。
- **PMF**：前 $k-1$ 次全失败，第 $k$ 次终于成功：
  $$P(X = k) = (1-p)^{k-1} p, \\quad k = 1, 2, 3, \\dots$$
- **期望与方差**：
  $$E(X) = \\frac{1}{p}, \\quad Var(X) = \\frac{1-p}{p^2}$$
  *直觉*：若投篮命中率 $p = 0.2$（20%），平均需要投 $1/0.2 = 5$ 次才能进第一球。
- **无记忆性（Memoryless Property）**：
  $$P(X > s + t \\mid X > s) = P(X > t)$$
  机器已经连续失败了 $s$ 次，对未来还要多久才能成功毫无影响！离散分布中**唯有几何分布具备无记忆性**。

#### 2. 负二项分布（Negative Binomial）
记录**直到第 $r$ 次成功所需要的总试验次数**。它是 $r$ 个独立几何变量之和，期望为 $r/p$。""",
            difficulty=2,
            tips=[
                tip("无记忆性是常考难点：'掷硬币已经连续出了9次反面，第10次出正面的概率还是0.5吗？' 是的！硬币没有记忆，前9次失败不会让第10次更容易成功（赌徒谬误）。", "interview"),
            ],
        ),
        lesson(
            "stats-foundations-l4-6",
            "泊松分布：稀有事件在时空中的流淌",
            """### 稀有事件发生计数的王者
很多事件单次发生的概率极小，但在大范围持续观察下却以稳定的**平均发生率 $\\lambda$** 出现：
例如：某客服中心每小时接到的求助电话数、网站每分钟的异常请求数、芯片晶圆表面的微瑕疵数。

#### 1. 泊松分布（Poisson Distribution, $X \\sim \\text{Poisson}(\\lambda)$）
- **PMF**：
  $$P(X = k) = \\frac{\\lambda^k e^{-\\lambda}}{k!}, \\quad k = 0, 1, 2, \\dots$$
- **期望与方差的惊人对称性**：
  $$E(X) = \\lambda, \\quad Var(X) = \\lambda$$
  泊松分布的期望与方差严格相等！
  *过离散检验*：若实际业务数据的样本方差远大于样本均值（Overdispersion），说明数据并不服从单纯的泊松分布，可能需要负二项回归。

#### 2. 泊松小概率极限定理（Poisson Approximation）
当二项分布的试验次数 $n$ 极大（$n \\ge 100$），单次成功率 $p$ 极小（$p \\le 0.01$），且二者乘积 $\\lambda = np$ 适中时：
$$B(n, p) \\approx \\text{Poisson}(\\lambda = np)$$
用泊松公式避免计算巨大的组合数 $\\binom{n}{k}$！""",
            difficulty=3,
            tips=[
                tip("方差/均值比（Fano Factor）= 1 是检验泊松假设的第一道金标准。如果数据方差是均值的数倍，绝不能盲目套用泊松模型。", "performance"),
            ],
        ),
        lesson(
            "stats-foundations-l4-7",
            "超几何分布与抽样近似法则",
            """### 有限总体无放回抽样的真实面貌
- 总体总数 $N$，其中目标物件 $M$ 个。
- 无放回抽取 $n$ 个，抽中的目标物件数 $X$ 服从**超几何分布（Hypergeometric）**：
  $$P(X = k) = \\frac{\\binom{M}{k} \\binom{N-M}{n-k}}{\\binom{N}{n}}$$
- **期望与方差**：
  令总体比例 $p = M/N$：
  $$E(X) = np$$
  $$Var(X) = np(1-p) \\times \\left(\\frac{N - n}{N - 1}\\right)$$

#### 有限总体修正系数（Finite Population Correction, FPC）
注意看方差公式中多出来的一项：
$$FPC = \\frac{N - n}{N - 1}$$
- 当样本量 $n$ 很小，总体 $N$ 极大时，$FPC \\approx 1$，方差直接退化为二项分布的 $np(1-p)$。
- 当抽取几乎把整个总体全抽完时（$n \\to N$），$FPC \\to 0$，方差归零（因为全部抽遍了，结果完全确定没有随机波动）。""",
            difficulty=2,
            tips=[
                tip("工程经验法则：当抽样比率 n/N ≤ 0.05（抽样不到总体的5%）时，直接忽略 FPC，按二项分布计算毫无问题。", "note"),
            ],
        ),
        lesson(
            "stats-foundations-l4-8",
            "算例拆解与自查清单：离散分布选型决策树",
            """## 面对业务问题，如何秒选正确的概率模型？

```
                             离散计数问题
                                  │
                  ┌───────────────┴───────────────┐
             关注'是否成功'                  关注'发生次数'
                  │                               │
        ┌─────────┴─────────┐                     │
    单次试验            重复多次试验                │
   (Bernoulli)              │                     │
                    ┌───────┴───────┐             │
                 有放回          无放回           │
             (独立，总体大)  (不独立，总体小)      │
                   │               │              │
               (Binomial)   (Hypergeometric)      │
                                                  │
                  ┌───────────────────────────────┴───────────────┐
              固定时间内计数                               直到成功所需的等待次数
                    │                                             │
               (Poisson)                                          │
                                                          ┌───────┴───────┐
                                                       单次成功        第r次成功
                                                     (Geometric)  (Negative Binomial)
```

---

### 实战算例：服务器宕机预警
某数据中心有 1000 台服务器，在任意给定的 1 小时内，任何一台服务器发生内存溢出故障的概率为 $p = 0.002$。各服务器故障相互独立。
求：在接下来这 1 小时内，数据中心恰好发生 2 台服务器故障的概率。

### 第一步：模型选型
- 重复试验次数 $n = 1000$（大），单次概率 $p = 0.002$（小）。
- 精确模型为二项分布 $B(1000, 0.002)$。
- 适用泊松近似：参数 $\\lambda = np = 1000 \\times 0.002 = 2$。

### 第二步：公式计算
使用泊松分布 PMF：$P(X = k) = \\frac{\\lambda^k e^{-\\lambda}}{k!}$
代入 $\\lambda = 2, k = 2$：
$$P(X = 2) = \\frac{2^2 e^{-2}}{2!} = \\frac{4 e^{-2}}{2} = 2 e^{-2} \\approx 2 \\times 0.135335 = 0.2707 \\quad (27.07\\%!)$$

### 第三步：对比二项精确值
若硬算二项公式：$\\binom{1000}{2} (0.002)^2 (0.998)^{998} \\approx 0.2709$。
误差不到万分之二，计算速度快百倍且避免大数乘方溢出！""",
            difficulty=3,
            tips=[
                tip("Python 代码一行验证：scipy.stats.poisson.pmf(2, mu=2) 即可直接计算。", "note"),
            ],
        ),
    ]

    c4_exercises = [
        single_choice(
            "stats-foundations-c4-e1",
            "离散型随机变量 $X$ 的概率质量函数为 $P(X = k) = c \\cdot k$，其中 $k \\in \\{1, 2, 3, 4\\}$。常数 $c$ 的值必须等于：",
            [
                {"value": "A", "text": "0.1"},
                {"value": "B", "text": "0.25"},
                {"value": "C", "text": "1.0"},
                {"value": "D", "text": "0.2"},
            ],
            "A",
            "根据 PMF 归一性公理，所有概率之和必须为 1：∑ P(X=k) = c(1 + 2 + 3 + 4) = 10c = 1。解得 c = 0.1。",
            difficulty=1,
            related_lesson_id="stats-foundations-l4-2",
            tags=["PMF", "归一性", "基础计算"],
        ),
        judge(
            "stats-foundations-c4-e2",
            "对于任意离散型随机变量 $X$，其累积分布函数 $F(x) = P(X \\le x)$ 在实数轴上必定处处连续。",
            False,
            "离散型随机变量的 CDF 在其所有可能取值的点处都发生跳跃间断，呈现右连续的阶梯函数形态，绝不是处处连续的。",
            difficulty=1,
            related_lesson_id="stats-foundations-l4-2",
            tags=["CDF", "阶梯函数", "性质判断"],
        ),
        fill(
            "stats-foundations-c4-e3",
            "已知随机变量 $X$ 满足 $E(X) = 3, Var(X) = 2$。根据方差的性质，新随机变量 $Y = -2X + 5$ 的方差 $Var(Y)$ 等于 ___。",
            [["8"]],
            "利用方差运算性质：Var(aX + b) = a² * Var(X)。这里 a = -2, b = 5，因此 Var(Y) = (-2)² * Var(X) = 4 * 2 = 8。",
            difficulty=2,
            related_lesson_id="stats-foundations-l4-3",
            tags=["方差性质", "线性变换"],
        ),
        single_choice(
            "stats-foundations-c4-e4",
            "某电商广告的历史点击转化率为 $p = 0.05$。假设各用户的点击行为相互独立，销售团队向 100 位用户推送该广告。成功购买的用户数 $X$ 服从二项分布 $B(100, 0.05)$。该指标的标准差约为：",
            [
                {"value": "A", "text": "2.18"},
                {"value": "B", "text": "5.00"},
                {"value": "C", "text": "4.75"},
                {"value": "D", "text": "1.50"},
            ],
            "A",
            "二项分布方差 Var(X) = n * p * (1 - p) = 100 * 0.05 * 0.95 = 4.75。标准差 σ = sqrt(Var(X)) = sqrt(4.75) ≈ 2.1794 ≈ 2.18。",
            difficulty=2,
            related_lesson_id="stats-foundations-l4-4",
            tags=["二项分布", "标准差计算"],
        ),
        multiple_choice(
            "stats-foundations-c4-e5",
            "关于数学期望（Expected Value）的数学性质，下列说法恒成立的有：",
            [
                {"value": "A", "text": "对任意随机变量 X 和 Y，E(X + Y) = E(X) + E(Y) 恒成立（无需独立性前提）"},
                {"value": "B", "text": "对任意常数 c，E(c) = c"},
                {"value": "C", "text": "若 X 与 Y 相互独立，则 E(X · Y) = E(X) · E(Y)"},
                {"value": "D", "text": "对任意非常数随机变量 X，E(X²) 恒大于 [E(X)]²"},
                {"value": "E", "text": "E(1/X) 恒等于 1/E(X)"},
            ],
            ["A", "B", "C", "D"],
            "E选项是严重的琴生不等式陷阱（Jensen's Inequality）：凸函数期望不等于期望的函数，E(1/X) ≥ 1/E(X)。其余选项均根据期望算子线性性与方差非负性恒成立。",
            difficulty=3,
            related_lesson_id="stats-foundations-l4-3",
            tags=["数学期望", "性质大全", "琴生不等式"],
        ),
        judge(
            "stats-foundations-c4-e6",
            "泊松分布最独特的理论性质是：其数学期望与方差在数值上严格相等，即 $E(X) = Var(X) = \\lambda$。",
            True,
            "泊松分布 Poisson(λ) 的期望 E(X)=λ，方差 Var(X)=λ，两者完全相等。这是泊松分布最标志性的特征。",
            difficulty=1,
            related_lesson_id="stats-foundations-l4-6",
            tags=["泊松分布", "期望与方差"],
        ),
        fill(
            "stats-foundations-c4-e7",
            "在掷硬币试验中（硬币质地均匀），每次正面朝上的概率为 0.5。直到第一次掷出正面所需的总投掷次数 $X$ 服从几何分布。期望投掷次数 $E(X)$ 等于 ___ 次。",
            [["2"]],
            "几何分布期望 E(X) = 1/p。代入 p = 0.5，E(X) = 1 / 0.5 = 2 次。",
            difficulty=2,
            related_lesson_id="stats-foundations-l4-5",
            tags=["几何分布", "期望计算"],
        ),
        single_choice(
            "stats-foundations-c4-e8",
            "某呼叫中心平均每分钟接到 3 起客户投诉电话，呼叫到达满足泊松过程。在未来 1 分钟内，呼叫中心'完全没有接到任何投诉电话（k=0）'的概率为：",
            [
                {"value": "A", "text": "e^(-3)"},
                {"value": "B", "text": "3 * e^(-3)"},
                {"value": "C", "text": "1 - e^(-3)"},
                {"value": "D", "text": "0"},
            ],
            "A",
            "泊松 PMF 为 P(X = k) = (λ^k * e^(-λ)) / k!。代入 λ = 3, k = 0：P(X = 0) = (3^0 * e^(-3)) / 0! = 1 * e^(-3) / 1 = e^(-3) ≈ 0.0498（约 5%）。",
            difficulty=2,
            related_lesson_id="stats-foundations-l4-6",
            tags=["泊松分布", "呼叫中心"],
        ),
        fill(
            "stats-foundations-c4-e9",
            "当二项分布的试验次数 $n=1000$，成功概率 $p=0.003$ 时，若利用泊松分布进行极限近似，泊松参数 $\\lambda$ 的最佳取值为 ___。",
            [["3", "3.0"]],
            "泊松小概率近似法则要求 λ = n * p = 1000 * 0.003 = 3。",
            difficulty=2,
            related_lesson_id="stats-foundations-l4-6",
            tags=["泊松近似", "参数匹配"],
        ),
        multiple_choice(
            "stats-foundations-c4-e10",
            "关于几何分布的'无记忆性（Memoryless Property）'，下列解释符合统计学本质的有：",
            [
                {"value": "A", "text": "条件概率 P(X > s + t | X > s) = P(X > t)"},
                {"value": "B", "text": "即使已经连续失败了 s 次，未来还需要尝试的次数分布与刚开始完全一样"},
                {"value": "C", "text": "无记忆性意味着前面的失败会'累积好运'，使下一次成功的概率大增"},
                {"value": "D", "text": "在所有离散型随机变量中，几何分布是唯一具有无记忆性的分布"},
                {"value": "E", "text": "买彩票如果连续 100 期没中，第 101 期中奖概率依然严格保持不变"},
            ],
            ["A", "B", "D", "E"],
            "C选项是典型的'赌徒谬误'：无记忆性恰恰说明各次试验独立，前序失败绝不会使后续成功的概率发生任何增加；其余选项均正确。",
            difficulty=3,
            related_lesson_id="stats-foundations-l4-5",
            tags=["无记忆性", "几何分布", "赌徒谬误"],
        ),
        single_choice(
            "stats-foundations-c4-e11",
            "某批次共有 20 台笔记本电脑，其中藏有 3 台次品。现质检员无放回随机抽取 4 台送检。抽出的次品数 $X$ 服从超几何分布。关于该试验方差与二项分布（有放回）方差的对比，正确的是：",
            [
                {"value": "A", "text": "由于抽样比例 n/N = 4/20 = 20% 较大，超几何方差由于有限总体修正系数（FPC < 1）而明显小于二项分布方差"},
                {"value": "B", "text": "超几何方差严格大于二项分布方差"},
                {"value": "C", "text": "两者方差完全一致"},
                {"value": "D", "text": "无放回抽样导致信息缺失，方差必然无限放大"},
            ],
            "A",
            "超几何方差在二项方差基础上乘上了 FPC = (N - n)/(N - 1) = (20 - 4)/(19) = 16/19 ≈ 0.842 < 1。无放回抽样锁定了部分已知信息，抽样不确定性（方差）小于有放回抽样。",
            difficulty=3,
            related_lesson_id="stats-foundations-l4-7",
            tags=["超几何分布", "FPC修正", "方差对比"],
        ),
        open_ex(
            "stats-foundations-c4-e12",
            "请严格证明二项分布 $X \\sim B(n, p)$ 的数学期望为 $E(X) = np$，方差为 $Var(X) = np(1-p)$。要求：使用指示变量（Indicator Variable）分解法秒杀求和，展现现代概率论的构造性证明思想。",
            """证明过程：
1. 构造指示随机变量：
   将二项试验分解为 n 次独立的伯努利试验。定义指示变量 I_i（i = 1, 2, ..., n）：
   若第 i 次试验成功，I_i = 1；若失败，I_i = 0。
   则总成功次数为：X = ∑_{i=1}^n I_i。
2. 计算单个指示变量的数字特征：
   - E(I_i) = 1 * p + 0 * (1-p) = p。
   - E(I_i²) = 1² * p + 0² * (1-p) = p。
   - Var(I_i) = E(I_i²) - [E(I_i)]² = p - p² = p(1-p)。
3. 利用期望的线性性质求 E(X)：
   E(X) = E(∑ I_i) = ∑ E(I_i) = n * p。
4. 利用独立随机变量方差的可加性求 Var(X)：
   因为各次伯努利试验独立，所以 I_1, I_2, ..., I_n 相互独立。
   Var(X) = Var(∑ I_i) = ∑ Var(I_i) = n * p(1-p)。
证毕。""",
            "考察指示变量构造分解法、期望线性性质与独立变量方差可加性的综合证明技巧。",
            [
                {"point": "将二项变量 X 正确拆解为 n 个独立伯努利指示变量之和", "score": 2},
                {"point": "根据期望线性性质证明 E(X) = np", "score": 1},
                {"point": "利用试验独立性证明 Var(X) = np(1-p)", "score": 1},
            ],
            exemplar="""【证明】：
设 X 为 n 重伯努利试验中的成功总次数。
引入指示变量 I_i（i = 1, 2, ..., n）：
I_i = 1 (若第 i 次试验成功，概率为 p)
I_i = 0 (若第 i 次试验失败，概率为 1-p)
则显而易见有：X = I_1 + I_2 + ... + I_n。

第一步：求单个指示变量的数字特征。
E(I_i) = 1 · p + 0 · (1-p) = p
E(I_i²) = 1² · p + 0² · (1-p) = p
Var(I_i) = E(I_i²) - [E(I_i)]² = p - p² = p(1-p)

第二步：求 E(X)。
根据数学期望的线性性质（对任意相关性均成立）：
E(X) = E(∑_{i=1}^n I_i) = ∑_{i=1}^n E(I_i) = ∑_{i=1}^n p = n p。

第三步：求 Var(X)。
由于各次伯努利试验彼此独立，因此随机变量 I_1, I_2, ..., I_n 相互独立。
由独立随机变量和的方差性质（协方差为0）：
Var(X) = Var(∑_{i=1}^n I_i) = ∑_{i=1}^n Var(I_i) = ∑_{i=1}^n p(1-p) = n p (1-p)。
证毕。""",
            difficulty=4,
            related_lesson_id="stats-foundations-l4-4",
            tags=["指示变量", "数学证明", "期望与方差"],
        ),
        open_ex(
            "stats-foundations-c4-e13",
            "某互联网金融信贷APP在做风控监控。系统监测到每小时发生的'严重违约交易笔数'历史均值为 $\\lambda = 4$。某日凌晨两点，监控大屏突然报警显示：该小时内记录到了 12 笔严重违约。风控总监要求立刻给出研判：在系统原本正常运行的前提下，单小时出现 12 笔或更多违约的概率有多大？这究竟是一次正常的随机波动，还是遭遇了黑产团伙集中撞库攻击？请用泊松分布进行量化分析。",
            """1. 建立概率模型：
   假定系统处于基线正常状态，单小时违约笔数服从泊松分布 X ~ Poisson(λ = 4)。
2. 计算异常极端值发生的概率 P(X ≥ 12)：
   P(X ≥ 12) = ∑_{k=12}^∞ (4^k * e^(-4)) / k!
   逐步计算尾部概率：
   - P(X = 12) = 4^12 * e^(-4) / 12! ≈ 0.000642
   - P(X = 13) ≈ 0.000197
   - P(X ≥ 12) 总概率约等于 0.0009（不足万分之一，即 0.09%）！
3. 统计推断与业务决策：
   - 0.09% 的概率属于统计学上的极小概率事件（远低于 0.05 或 0.01 显著性阈值）。
   - 如果系统仍然是正常运行，这种事件平均需要 1 / 0.0009 ≈ 1100 小时（约 46 天）才可能偶然出现一次。
   - 决策结论：原假设（正常随机波动）在统计上基本被否决！这绝非普通日常噪音，而是遭到了系统性外部黑产攻击或底层风控接口严重故障，必须立即启动应急风控降级预案。""",
            "考察泊松分布在真实风控告警中的尾部检验、p-value直觉与异常研判。",
            [
                {"point": "正确写出泊松模型并算出 P(X ≥ 12) 为极小概率（不足千分之一）", "score": 2},
                {"point": "结合统计显著性（小概率原理）对随机波动假说进行反驳", "score": 1},
                {"point": "给出明确的业务风控决策（非偶然波动，需启动黑产排查）", "score": 1},
            ],
            exemplar="""【量化分析与业务研判报告】：
1. 模型设定：
在基线安全状态下，单位时间异常数服从泊松分布：X ~ Poisson(λ = 4)。
期望 μ = 4，标准差 σ = sqrt(4) = 2。
观测值 X = 12，偏离均值达到了：(12 - 4) / 2 = 4 个标准差（4-Sigma 事件）！

2. 尾部概率精确估算：
P(X ≥ 12) = 1 - P(X ≤ 11)
经泊松累积分布计算：P(X ≥ 12) ≈ 0.00095（约 0.095%，即万分之九）。

3. 研判结论与行动建议：
- 否定正常波动：在正常随机扰动下，出现 12 笔及以上的单小时发生概率低于万分之一，期望重现周期长达 1.5 个月。
- 业务定性：可以高度断定遭遇了有组织的黑产集中撞库骗贷或内部风控策略漏判事故，拒绝将其归咎为'日常随机噪音'。
- 处置建议：立即对凌晨两点相关账户实施临时风控加固，锁定同一IP段/设备指纹，并调阅风控命中规则日志。""",
            difficulty=4,
            related_lesson_id="stats-foundations-l4-8",
            tags=["风控预警", "泊松检验", "业务决策", "实战挑战"],
        ),
        single_choice(
            "stats-foundations-c4-e14",
            "设随机变量 $X \\sim \\text{Poisson}(\\lambda_1)$，$Y \\sim \\text{Poisson}(\\lambda_2)$，且 $X$ 与 $Y$ 相互独立。则两变量之和 $Z = X + Y$ 服从的分布是：",
            [
                {"value": "A", "text": "泊松分布，参数为 λ1 + λ2"},
                {"value": "B", "text": "正态分布，参数为 (λ1+λ2, λ1+λ2)"},
                {"value": "C", "text": "二项分布"},
                {"value": "D", "text": "泊松分布，参数为 λ1 · λ2"},
            ],
            "A",
            "这是泊松分布著名的可加性（卷积性质）：独立泊松变量之和依然服从泊松分布，其参数直接相加：Z ~ Poisson(λ1 + λ2)。",
            difficulty=3,
            related_lesson_id="stats-foundations-l4-6",
            tags=["泊松分布", "卷积性质", "可加性"],
        ),
    ]

    ch4 = chapter(
        "stats-foundations-c4",
        "stats-foundations",
        4,
        "离散随机变量与常用分布",
        "深入理解 PMF、CDF、期望方差算子，熟练驾驭伯努利、二项、几何、泊松与超几何离散模型。",
        c4_lessons,
        c4_exercises,
    )
    return ch4
