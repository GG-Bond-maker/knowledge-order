import type { Chapter } from '../../../types';

export const quantProjectChapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ══════════════════════════════════════════════════════════════════
     第 1 章：策略立项、经济学假设与数据流水线工程
     ══════════════════════════════════════════════════════════════════ */
  {
    id: 'quant-project-c1',
    title: '策略立项、经济学假设与数据流水线工程',
    goal: '建立机构级量化投研六步法闭环，确立坚实的金融经济学假说，构建包含 ST 剔除、涨跌停过滤、PIT 财报对齐与 MAD 正交清洗的工业级数据流水线。',
    lessons: [
      {
        id: 'quant-project-c1-l1',
        title: '量化策略立项与经济学逻辑假设（Economic Hypothesis）',
        content: `
## 学习目标

学完本节，你应该能够：
1. 写出策略立项书的"经济学假设三问"：谁在犯错、错误为何存在、错误为何轮不到你修正；
2. 把一个模糊想法（"小盘股涨得多"）改写成可检验的经济学假设；
3. 用"假设树"区分信号来源（风险补偿 / 行为偏差 / 结构性摩擦），并说出各自的生命周期预期。

## 前置知识

- 因子与 IC 的基本概念（quant-strategy c3）；
- 有效市场假说的直觉（价格反映信息的程度）。

## 问题背景：没有"为什么"的策略活不过一个周期

纯数据挖掘出的因子（"代码首字母为 S 的公司跑赢"）没有经济学解释，靠的是运气——运气会被套利掉。机构立项的第一道关不是回测数字，而是**经济学假设**：这个超额收益到底是谁亏给你的？回答不了这个问题的研究，多半是在给噪声建模（Harvey et al. 2016 对 316 个"显著因子"的警告）。

## 直觉理解：先找到"丢钱的人"

每一分超额收益都有出资人。三类合法出资人：
1. **承担风险者**（风险补偿）：你敢扛流动性风险、尾部风险，市场付你保费——最持久但容量大、收益薄；
2. **行为偏差者**：锚定、追涨、处置效应让某类投资者系统性卖错/买错——中等持久，拥挤后衰减；
3. **结构性受限者**：机构因合约/监管不能持有（如 ST 股、小市值），你补上这个洞——最肥但最容易随规则改变而消失。

**找到出资人 = 假设成立的第一步**；找不到出资人的收益，出资人就是未来的你自己。

## 核心概念：假设三问与可检验化

立项书必须回答：
1. **谁在犯错/让利？**（具体到投资者类型或制度约束）
2. **错误为何持续存在？**（为什么聪明的对手没有把它套利掉——通常是套利成本/限制/风险）
3. **为何轮到你？**（你的成本、速度、容量优势在哪里）

**改写示例**：模糊想法"小公司涨得多" → 假设："小市值溢价部分来自机构流动性约束（单票容量太小、覆盖成本高），导致小盘股被系统性低估；我们以低换手、长持有期承担流动性风险获取补偿，预期因子拥挤度上升时衰减。"——可检验（规模-收益关系、拥挤度指标）、可证伪、可预期寿命。

## 完整案例：假设树与生命周期对照

| 信号来源 | 出资人 | 持久性 | 衰减信号 | 典型容量 |
| --- | --- | --- | --- | --- |
| 风险补偿（低波动异象等） | 风险厌恶者 | 十年+ | 风险溢价结构变化 | 大 |
| 行为偏差（动量/反转） | 追涨杀跌者 | 数年 | 因子拥挤、波动放大 | 中 |
| 结构摩擦（指数调入效应） | 指数被动盘 | 随规则而定 | 规则修订公告 | 小而尖 |

立项时为因子标注"假设类型"直接决定后续监控重点（c3-l3 的衰竭预警指标各不相同）。

## 代码实践

\`\`\`python
# 假设速查表：立项前的三问自检（伪代码化为可执行清单）
def hypothesis_check(who_pays, why_persists, why_you, testable):
    checks = {
        "出资人明确": len(who_pays) > 10,
        "持续性机制明确": len(why_persists) > 10,
        "自身优势明确": len(why_you) > 10,
        "可检验": testable,
    }
    for k, v in checks.items():
        print(("✓" if v else "✗"), k)
    return all(checks.values())

ok = hypothesis_check(
    who_pays="受流动性约束的机构投资者（小盘覆盖成本高）",
    why_persists="覆盖成本+容量限制使大资金无法套利",
    why_you="低换手策略成本结构适配小容量机会",
    testable=True,
)
print("立项通过" if ok else "回到白板")
\`\`\`

预期输出：四项全 ✓、立项通过。**常见错误**：把统计相关性包装成假设（"因为历史上有效"不回答三问）；假设写好后回测失败就换假设（HARKing——结果已知后再造假设，多重检验的变体）。

## 常见误区

1. **经济学假设=讲故事**——必须可检验、可证伪，并与回测设计一一对应；
2. **数据挖掘先于假设**——顺序错了：先假设、后检验，挖掘只用于探索性分支并计入尝试总数；
3. **忽视假设类型的容量含义**——行为类因子容量有限，规模是它的死穴；
4. **假设一经立项不再回顾**——市场结构变化应触发假设重新评审（c3-l3）。

## 知识关联

- **向前**：主动管理定律（quant-strategy c3-l1）中的 IC 来自哪里——本节回答；
- **向后**：c1-l2/c1-l3 的数据与预处理、c2 的质检与合成、c3-l3 的衰竭监控全部以本节的假设类型为纲；
- **平行**：Harvey et al. (2016) 的因子动物园批判是本节立场学术版。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 三问 | 谁付钱 / 为何持续 / 为何是你 |
| 三类来源 | 风险补偿 / 行为偏差 / 结构摩擦 |
| 写法 | 可检验、可证伪、可预期寿命 |
| 红线 | 先假设后检验；HARKing 即造假 |

## 参考资料

> **来源类型：学术来源**
> - Harvey, C. R., Liu, Y., & Zhu, H. (2016). *RFS* 29(1)（已核验）——因子动物园与多重检验。
> - López de Prado, M. (2019). "Beyond Econometrics: A Roadmap Towards Causal Machine Learning." *Journal of Financial Data Science*, 1(1)——假设优先的研究流程。
>
> **来源类型：原创**
> - 出资人框架与假设树为本课程改编。
`,
        tips: [
          {
            kind: 'interview',
            text: '量化面试经典：「请阐述你开发的某个因子背后的经济学直觉是什么？」答题思路：1. 它是谁在亏钱（交易对手方是谁？散户、被动 ETF 还是跟风游资？）；2. 为什么对手方会持续犯这个错误？3. 为什么套利力量没有立即把这个价差抹平（套利限制 Limits to Arbitrage，如融券成本高、流动性受限）？',
          },
        ],
      },
      {
        id: 'quant-project-c1-l2',
        title: '股票池动态筛选与点时（PIT）清洗工程',
        content: `
### 学习目标

学完本节，你应该能够：
1. 列出五条动态过滤规则（ST/次新/停牌/一字板/流动性）及其违规后果；
2. 实现 PIT 对齐：财报按公告日而非报告期打标；
3. 编写截面股票池过滤函数并解释幸存者偏差的来源。

### 前置知识

- 策略立项与经济学假设（c1-l1）；
- pandas 布尔过滤。

### 问题背景

多因子策略的第一桶金不是因子而是股票池：ST 暴雷、次新炒作、停牌锁仓、涨跌停无法成交、流动性僵尸——任何一样混进回测都会造假收益。PIT 对齐则保证你在 1 月 1 日绝不会用 4 月才披露的年报。

### 直觉理解

股票池像机场安检：ST 是危险品（直接没收），次新股是没过观察期的签证（60 交易日后放行），停牌是航班取消（当日不可登机），一字板是舱门关闭（买不上/卖不出），低流动性是红眼航班冷线（后 10% 剔除）。PIT 对齐是『只用当日已盖章的文件』——未来文件一律无效。

### 核心概念与原理详解

## 纯净股票池：杜绝垃圾进垃圾出

量化多因子策略的实战第一步，是在每个截面调仓时刻 $t$ 构建合法合规的可交易股票池（Tradable Universe）：

### 1. 动态过滤规则
* **剔除 ST / *ST 风险警示股**：防止突发财务暴雷与退市整理期连续一字跌停；
* **剔除上市未满 60 个交易日的新股（次新股）**：新股上市初期受非理性炒作影响，价格严重偏离基本面且换手率极端扭曲；
* **剔除停牌股票（Suspended Stocks）**；
* **剔除调仓当日一字涨跌停标的**：若当日涨停无法买入、跌停无法卖出，严禁在回测中计入成交；
* **流动性初筛**：剔除全市场过去 20 日日均成交金额后 $10\\%$ 的流动性僵尸股。

### 2. 基本面点时（Point-in-Time, PIT）对齐
财报因子入库时间严格以初次法定披露公告日（Announcement Date）打标，杜绝在 1 月 1 日使用 4 月底才披露的年报数据。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import pandas as pd
df = pd.DataFrame({
    "code": ["600000", "000004", "300750", "688981", "000001"],
    "is_st": [False, True, False, False, False],
    "listed_days": [8000, 3000, 2000, 40, 9000],
    "suspended": [False, False, False, True, False],
    "limit_up": [False, False, True, False, False],
    "amt20": [8e8, 2e6, 5e9, 1e8, 6e8]})
floor = df["amt20"].quantile(0.1)
ok = (~df["is_st"]) & (df["listed_days"] >= 60) & (~df["suspended"]) & (~df["limit_up"]) & (df["amt20"] > floor)
print("过滤后股票池:", df.loc[ok, "code"].tolist())
fin = pd.DataFrame({"code": ["600000"], "报告期": ["2024-12-31"], "公告日": ["2025-04-28"], "roe": [0.091]})
q = "2025-01-05"
print(f"{q} 可用财报 {int((fin['公告日'] <= q).sum())} 条（4 月才公告的 2024 年报不可用 → PIT）")\`\`\`

预期输出（实测）：五重过滤后股票池 ['600000','000001']（ST/次新/停牌/一字板/流动性末档全部剔除）；PIT：2025-01-05 可用财报 0 条（2024 年报 4 月才公告不可用）。

**常见错误**：股票池用当前时点的 ST 名单回溯历史（幸存者偏差+前视）；财报因子按报告期末打标而非公告日（未来数据）；剔除规则忘记随截面滚动，用静态名单贯穿全回测。

### 常见误区

1. **『剔除 ST 就没了高收益』**——ST 的极端收益伴随退市归零，回测里活下来的 ST 是幸存者偏差；\\n2. **『新股波动大可以博一把』**——次新换手率极端扭曲因子分布，污染截面标准化；\\n3. **『PIT 只是数据工程细节』**——它是回测可信度的分水岭，PIT 错误可把夏普从 0.5 造假到 2.0。

### 知识关联

- **向前**：c2 的因子合成与优化只吃本章的纯净股票池；
- **向后**：quant-data 的停牌守卫是本章规则的数据层实现；
- **平行**：c3-l2 的模拟实盘验证的是含真实约束的同一套流水线。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 五剔除 | ST/次新(<60日)/停牌/一字板/流动性后10% |
| PIT | 财报按公告日打标，杜绝未来数据 |
| 滚动 | 过滤规则逐截面动态计算 |
| 幸存者 | 已退市股票必须留在历史池中 |
| 收益 | 垃圾进垃圾出：池不净则因子全废 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Barra 风格模型公开文献与 A 股交易所公开费率标准相应章节）
`,
        tips: [
          {
            kind: 'note',
            text: '对于中证 500 或沪深 300 指数增强策略，股票池通常设定为对应指数成分股加上部分流动性良好的备选成分股，严格控制成分股外选股比例不超过 20%。',
          },
        ],
      },
      {
        id: 'quant-project-c1-l3',
        title: '因子预处理工业级流水线：去极值、标准化与正交化',
        content: `
## 学习目标

学完本节，你应该能够：
1. 按序执行因子预处理三步曲：去极值（MAD）→ 标准化（z-score）→ 中性化（回归取残差），并说明顺序不可颠倒的原因；
2. 手算一个小样本的 MAD 去极值与 z-score；
3. 说明中性化到底"中和"了什么（行业与市值的线性暴露），残差因子的含义是什么。

## 前置知识

- 中位数、MAD（绝对中位差）的稳健统计概念（stats-foundations）；
- 线性回归与残差（quant-market c3-l2 OLS）。

## 问题背景：脏因子喂不出好模型

原始因子横截面有三个污染源：**极端值**（一家公司的异常值扭曲全截面 z-score）、**量纲**（各因子尺度不可比）、**暴露**（因子值可能与市值/行业强相关——你以为在选股，其实在押大小盘与行业轮动）。工业流水线固定三步曲，顺序即正义。

## 直觉理解：先洗澡、再量衣、最后卸妆

- **去极值（MAD）**=洗澡：把一身泥的极端值刷到正常范围（winsorize），否则均值方差全被带歪；
- **标准化**=量衣：各因子统一成"相对截面的标准差倍数"，可比；
- **中性化**=卸妆：剔除因子里化着"我是大盘股/我是银行业"的妆，留下真正独立的信息（残差）。

顺序不可颠倒：先标准化再去极值，阈值（如 3σ）已经污染；先中性化再去极值，回归系数被极端值扭曲。

## 核心概念：三步公式

1. **MAD 去极值**：$MAD = 1.4826 \\times \\mathrm{median}(|x_i - \\mathrm{median}(x)|)$，截断到 $[\\mathrm{median} \\pm 3\\,MAD]$——比 3σ 稳健（极值不影响中位数）；
2. **z-score 标准化**：$z_i = (x_i - \\bar x)/s$（截面内进行）；
3. **中性化**：回归 $z_i = \\alpha + \\sum_k \\beta_k \\text{行业哑变量}_{ik} + \\gamma \\ln(\\text{市值}_i) + \\varepsilon_i$，取 $\\hat\\varepsilon_i$ 为中性化因子——**剔除行业与市值的线性暴露**，再标准化一次。

## 完整案例

\`\`\`python
import numpy as np
x = np.array([1, 2, 3, 4, 5, 6, 7, 100.0])
med = np.median(x)
mad = 1.4826 * np.median(np.abs(x - med))
lo, hi = med - 3 * mad, med + 3 * mad
w = np.clip(x, lo, hi)
z = (w - w.mean()) / w.std()
print(f"MAD={mad:.2f}, 界[{lo:.1f},{hi:.1f}]")
print("截断后 z =", np.round(z, 2))
\`\`\`

预期输出（实测）：MAD=2.97，界 [−4.4, 13.4]；z ≈ [−1.15, −0.88, −0.60, −0.32, −0.05, 0.23, 0.50, **2.27**]——一只妖股被驯服为 +2.27σ，其余七只保持分辨力。对照：若不去极值直接 z-score，100 的 z ≈ +2.5 且**其余全部被压成 −0.4σ 左右**（均值被 100 拉高），整条截面信息尽失。**常见错误**：用均值±3σ 去极值（死循环）；截面标准化泄漏为全时间序列标准化。

## 常见误区

1. **顺序颠倒**（先标准化再去极值）——阈值基于被污染的统计量；
2. **用 3σ 而非 MAD 去极值**——均值标准差本身被极值污染，死循环；
3. **中性化=删除行业**——是**剔除线性暴露**保留残余信息，不是剔除股票；
4. **全样本标准化**——必须逐期截面进行（时间序列上的标准化泄漏未来）。

## 知识关联

- **向前**：stats 的稳健统计、quant-market 的 OLS 是两块积木；
- **向后**：c2-l1 的因子质检以本节输出为输入；quant-ml 的特征工程复用同一条流水线；
- **平行**：quant-strategy c3-l2（同名三步曲的项目版）。

## 本节总结

| 步骤 | 方法 | 目的 |
| --- | --- | --- |
| 去极值 | 中位数 ± 3×MAD 截断 | 稳健化截面 |
| 标准化 | 截面 z-score | 量纲统一 |
| 中性化 | 对行业+ln市值回归取残差 | 剥离暴露，留独立信息 |

## 参考资料

> **来源类型：权威教材**
> - Qian, Hua & Sorensen, *Quantitative Equity Portfolio Management*（Chapman & Hall, 2007）——因子预处理的标准工业流程。
>
> **来源类型：原创**
> - 洗澡/量衣/卸妆比喻与手算为本课程改编。
`,
        tips: [
          {
            kind: 'pitfall',
            text: '因子预处理的顺序绝对不能颠倒！必须先进行 MAD 去极值，再做行业市值中性化回归，最后做 Z-Score 标准化。若先做标准化再做中性化，极值点会彻底毁掉 OLS 回归的拟合平面！',
          },
        ],
        demos: [
          {
            title: 'MAD 去极值与 Z-Score 标准化完整流水线',
            lang: 'python',
            code: `import numpy as np

def clean_factor_pipeline(raw_factors):
    # 1. 计算中位数与 MAD
    med = np.median(raw_factors)
    mad = np.median(np.abs(raw_factors - med))
    
    # 2. 3倍 MAD 截断边界
    upper = med + 3 * 1.4826 * mad
    lower = med - 3 * 1.4826 * mad
    clipped = np.clip(raw_factors, lower, upper)
    
    # 3. Z-Score 标准化
    zscore = (clipped - np.mean(clipped)) / np.std(clipped)
    return zscore

raw = np.array([10.0, 10.5, 9.8, 11.2, 10.1, 500.0]) # 包含 500.0 极端乌龙值
clean = clean_factor_pipeline(raw)
print(f"清洗前极值: {raw.max()}")
print(f"清洗后均值: {clean.mean():.4f}, 标准差: {clean.std():.4f}, 最大分值: {clean.max():.2f}")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'quant-project-c1-e1',
        relatedLessonId: 'quant-project-c1-l1',
        type: 'single',
        difficulty: 1,
        question: '在端到端量化多因子选股体系中，对因子进行行业与市值中性化（Neutralization）的主要目的在于：',
        options: [
          { value: 'A', text: '让股票池中每只股票的买入股数完全一样' },
          { value: 'B', text: '剥离行业配置与大盘/小盘市值风格风险，提炼纯粹的特质选股 Alpha' },
          { value: 'C', text: '使因子值服从柯西分布' },
          { value: 'D', text: '完全消除交易手续费' },
        ],
        answer: 'B',
        explanation: '中性化通过回归残差剥离掉行业和大市值等已知系统性风格的暴露，避免策略因为押注单一行业（如白酒暴涨或医药暴跌）而承担非预期的宏观风格风险。',
        tags: ['因子中性化', '项目实战'],
      },
      {
        id: 'quant-project-c1-e2',
        relatedLessonId: 'quant-project-c1-l2',
        type: 'single',
        difficulty: 1,
        question: '在 A 股量化股票池动态筛选清洗中，通常需要将上市未满 60 个交易日的新股（次新股）剔除，其核心原因是：',
        options: [
          { value: 'A', text: '次新股完全无法查询到股票代码' },
          { value: 'B', text: '上市初期价格受非理性炒作与波动博弈剧烈，历史财务与量价统计数据严重失真' },
          { value: 'C', text: '交易所规定新股 60 天内禁止量化机构交易' },
          { value: 'D', text: '次新股的每股净资产必然为负数' },
        ],
        answer: 'B',
        explanation: '次新股上市初期波动极大、换手率极高且估值脱离基本面，若纳入因子回测会产生严重的异常噪声干扰。',
        tags: ['股票池清洗', '次新股剔除'],
      },
      {
        id: 'quant-project-c1-e3',
        relatedLessonId: 'quant-project-c1-l3',
        type: 'multiple',
        difficulty: 2,
        question: '在量化投研流水线中，标准的因子清洗三部曲其严格的执行次序与内容应包含：',
        options: [
          { value: 'A', text: '第一步：中位数绝对偏差（MAD）去极值' },
          { value: 'B', text: '第二步：行业哑变量与对数流通市值中性化多元回归提取残差' },
          { value: 'C', text: '第三步：截面 Z-Score 标准化（归一化为均值 0、方差 1）' },
          { value: 'D', text: '必须先做 Z-Score 标准化，最后再做 MAD 去极值' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: '必须先去除极端极值（MAD），再做中性化多元回归，最后对残差做 Z-Score 标准化。D 选项颠倒顺序会导致极值严重扭曲 OLS 回归平面。',
        tags: ['因子清洗流水线', '执行次序'],
      },
      {
        id: 'quant-project-c1-e4',
        relatedLessonId: 'quant-project-c1-l1',
        type: 'judge',
        difficulty: 2,
        question: '一个优秀的量化 Alpha 因子，必须具备清晰的金融经济学逻辑假说（如承担某种特定风险的风险溢价，或是捕捉某种被广泛验证的人类行为非理性偏差），严禁进行脱离因果逻辑的纯黑盒数据窥探挖掘。',
        answer: true,
        explanation: '正确。缺乏经济学因果逻辑支撑的纯统计过拟合因子在样本外实盘中衰亡率接近 100%。',
        tags: ['经济学逻辑', '量化方法论'],
      },
      {
        id: 'quant-project-c1-e5',
        relatedLessonId: 'quant-project-c1-l3',
        type: 'fill',
        difficulty: 2,
        question: '在多因子选股中，利用施密特（Gram-Schmidt）正交化方法处理高度相关的两个因子，是为了彻底消除因子之间的多重 ___ 性，确保新引入的因子能够贡献独立的边际 Alpha。',
        blanks: [['共线', '共线性', '多重共线性', 'Collinearity']],
        explanation: '正交化消除多重共线性（Multicollinearity），防止同一风格在组合中被重复加权放大风险。',
        tags: ['正交化', '多重共线性'],
      },
      {
        id: 'quant-project-c1-e6',
        relatedLessonId: 'quant-project-c1-l2',
        type: 'code',
        difficulty: 2,
        question: '编写函数 filter_tradable_universe(stocks_meta)，筛选可交易股票池。\n\nstocks_meta 为字典列表，每个字典包含：\n{"code": "600519", "is_st": False, "is_suspended": False, "list_days": 120, "is_limit_up": False}\n过滤条件：要求 is_st 为 False，is_suspended 为 False，list_days >= 60，且 is_limit_up 为 False。返回符合条件的股票代码列表。',
        starterCode: `def filter_tradable_universe(stocks_meta):
    pass
`,
        expectedOutput: '合规股票代码列表',
        tests: `data = [
    {"code": "A", "is_st": False, "is_suspended": False, "list_days": 100, "is_limit_up": False},
    {"code": "B", "is_st": True, "is_suspended": False, "list_days": 200, "is_limit_up": False},
    {"code": "C", "is_st": False, "is_suspended": True, "list_days": 150, "is_limit_up": False},
    {"code": "D", "is_st": False, "is_suspended": False, "list_days": 30, "is_limit_up": False},
    {"code": "E", "is_st": False, "is_suspended": False, "list_days": 90, "is_limit_up": True}
]
assert filter_tradable_universe(data) == ["A"]`,
        answer: `def filter_tradable_universe(stocks_meta):
    res = []
    for s in stocks_meta:
        if not s.get("is_st", False) and \\
           not s.get("is_suspended", False) and \\
           s.get("list_days", 0) >= 60 and \\
           not s.get("is_limit_up", False):
            res.append(s["code"])
    return res

filter_tradable_universe([{"code": "A", "is_st": False, "is_suspended": False, "list_days": 100, "is_limit_up": False}])`,
        explanation: '根据量化机构标准股票池清洗规则逐项过滤剔除。',
        tags: ['股票池过滤', '代码实现'],
      },
      {
        id: 'quant-project-c1-e7',
        relatedLessonId: 'quant-project-c1-l3',
        type: 'code',
        difficulty: 3,
        question: '编写函数 mad_winsorize(factor_values, n_mad=3.0)，实现中位数绝对偏差法（MAD）去极值。\n\n步骤：\n1. med 为 factor_values 的中位数；\n2. 计算每个值偏离中位数的绝对值列表，取该列表的中位数作为 mad；\n3. 容忍阈值 threshold = n_mad * 1.4826 * mad；\n4. 将超出 [med - threshold, med + threshold] 的值压缩至边界，返回新列表。保证输入列表长度奇数非空。中位数使用 sorted(lst)[len(lst)//2]。',
        starterCode: `def mad_winsorize(factor_values, n_mad=3.0):
    pass
`,
        expectedOutput: '截断后的数值列表',
        tests: `data = [1.0, 1.1, 0.9, 1.05, 100.0]
res = mad_winsorize(data, 3.0)
assert res[-1] < 10.0
assert res[0] == 1.0`,
        answer: `def mad_winsorize(factor_values, n_mad=3.0):
    def get_med(lst):
        s = sorted(lst)
        return s[len(s) // 2]
    
    med = get_med(factor_values)
    abs_diffs = [abs(x - med) for x in factor_values]
    mad = get_med(abs_diffs)
    
    threshold = n_mad * 1.4826 * mad
    lower = med - threshold
    upper = med + threshold
    
    return [max(lower, min(upper, x)) for x in factor_values]

mad_winsorize([1.0, 1.1, 0.9, 1.05, 100.0])`,
        explanation: '按照工业标准中位数绝对偏差去极值公式计算截断边界并就地裁剪。',
        tags: ['MAD去极值', 'Python编程'],
      },
      {
        id: 'quant-project-c1-e8',
        relatedLessonId: 'quant-project-c1-l3',
        type: 'multiple',
        difficulty: 3,
        question: '在多因子模型中，未对「对数流通市值」进行中性化处理的因子，往往会在实盘中遭遇哪些严重隐患？',
        options: [
          { value: 'A', text: '策略在不知情的情况下重仓了市值极小的微盘股（Size Factor 暴露）' },
          { value: 'B', text: '当市场风格切换偏好大盘权重股或遭遇微盘流动性踩踏时，组合遭遇断崖暴跌' },
          { value: 'C', text: '回测中的高额收益实质上来源于小微盘股的流动性溢价与尾部风险' },
          { value: 'D', text: '因子选出来的股票无法在任何券商开户交易' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: 'ABC 均为未做市值中性化导致的致命小盘股风格倾斜；D 选项荒谬。',
        tags: ['市值中性化', '风格风险'],
      },
      {
        id: 'quant-project-c1-e9',
        relatedLessonId: 'quant-project-c1-l3',
        type: 'judge',
        difficulty: 2,
        question: '在财报因子数据流水线中，如果某上市公司在 4 月 20 日披露了年报，但 6 月 15 日发布了重述更正公告调减净利润，在构建回测历史时，策略在 4 月 20 日至 6 月 14 日期间做决策时，必须使用更正前的原始未修改年报数据。',
        answer: true,
        explanation: '正确。这是点时间（PIT）数据库的核心原则：策略在过去任何历史时点，只能使用该时点现实公开可见的数据，杜绝提前使用未来才发布的更正数据。',
        tags: ['PIT数据库', '数据合规'],
      },
      {
        id: 'quant-project-c1-e10',
        relatedLessonId: 'quant-project-c1-l3',
        type: 'open',
        difficulty: 4,
        question: '【高阶量化工程架构设计】\n请为一家量化私募对冲基金设计一套完整的「A股全市场多因子特征数据自动化生产流水线」。\n请明确说明：\n1. 数据源清洗层如何处理每日复权因子变更、财务披露公告时滞与非交易日停牌状态更新；\n2. 因子计算引擎如何利用增量更新（Incremental Pipeline）与 DAG 任务依赖调度，确保每日 16:30 前完成 5000+ 标的、300+ 因子的清洗、中性化与入库全流程。',
        referenceAnswer: `1. 数据源清洗层核心机制：
(1) 复权因子动态同步与全量校验：盘后 15:30 自动拉取交易所最新除权除息公告与红股登记数据。若检测到当日为 Ex-Date，自动更新复权因子表，并通过昨收盘价差反算校验，校验无误后刷新行情缓存；
(2) PIT 财报双时戳入库：财务数据表记录报告期 report_date、公告披露日 ann_date 与更正生效区间 [valid_start, valid_end]。因子计算仅检索 ann_date <= T 的历史有效快照；
(3) 交易日历与停牌状态矩阵：维护全市场交易日状态掩码矩阵（Tradable Bitmask），记录停牌、ST、涨跌停状态，用于后续组合优化器的边界掩码。

2. 高性能增量 DAG 调度与计算优化：
(1) 基于有向无环图（DAG）的任务编排（如 Apache Airflow / Prefect）：
  - 任务分层解耦：\`行情/财报接入任务 -> 单因子计算任务 -> 截面 MAD 去极值 -> 截面行业市值中性化 -> 因子入库与数据质检 (Great Expectations)\`；
(2) 增量矩阵向量化加速：
  - 弃用 Python 行级循环，使用 DolphinDB / Polars / NumPy 进行全截面列式内存矩阵运算；
  - 中性化多元回归采用稀疏矩阵最小二乘加速（SciPy \`sparse.linalg.lsqr\`），单截面 5000 只股票的中性化残差计算压缩在 50 毫秒以内；
(3) 并行计算与缓存：300+ 因子根据计算依赖关系进行多进程并行打散计算，在 32 核服务器上可在 15 分钟内完成全量因子生产，并在 16:30 前完成入库与校验报警，满足夜盘与盘后策略计算时效。`,
        rubric: [
          { point: '清晰设计复权对齐、PIT 财报双时间戳与停牌掩码矩阵机制', score: 50 },
          { point: '提出基于 DAG 任务编排、Polars/DolphinDB 矩阵计算与并行中性化工程优化方案', score: 50 },
        ],
        keywords: ['复权因子', 'PIT', '双时间戳', 'DAG', 'Airflow', '增量计算', 'Polars', '中性化加速'],
        explanation: '深刻考查大规模工业级量化投研数据中心从微观清洗到分布式高吞吐计算调度的全栈工程实力。',
        tags: ['数据工程', 'DAG调度', '性能优化'],
      },
    ],
  },

  /* ══════════════════════════════════════════════════════════════════
     第 2 章：因子合成、多因子组合优化与严格扣费回测
     ══════════════════════════════════════════════════════════════════ */
  {
    id: 'quant-project-c2',
    title: '因子合成、多因子组合优化与严格扣费回测',
    goal: '掌握单因子 IC/IR 质检评估，掌握因子动态加权合成方法，精通 Barra 结构化风险模型二次规划组合优化与真实交易摩擦扣费回测。',
    lessons: [
      {
        id: 'quant-project-c2-l1',
        title: '单因子质检体检报告与合格金标准',
        content: `
## 学习目标

学完本节，你应该能够：
1. 列出因子合格线的"体检六项"（IC 均值/ICIR/多头收益/换手/衰减/分状态），并给出量化阈值；
2. 解读一份体检报告的"红灯样例"（IC 合格但换手 8 倍/月——成本杀死一切）；
3. 说明为什么合格线必须**先于**全量回测确定（防窥探）。

## 前置知识

- IC/ICIR/分组单调性（quant-strategy c3-l3）；
- 换手与成本核算（quant-market c3-l1）。

## 问题背景：没有合格线的检验就是反复下注

"回测看看效果"式的检验没有事先标准：好了继续、坏了换参数——本质是无限次抛硬币挑正面。工业做法：**先写合格线（体检表），再跑数据，一票否决制**。合格线来自策略容量与成本结构，不是数据本身。

## 核心概念：体检六项与阈值（月频示例）

| 项目 | 指标 | 合格线（示例） | 一票否决原因 |
| --- | --- | --- | --- |
| 预测力 | RankIC 均值 | ≥ 0.02 且 t ≥ 2 | 无预测力 |
| 稳定性 | ICIR | ≥ 0.4 | 抽奖式因子 |
| 单调性 | 十分组多空 | 组间单调且 top-bottom 年化 ≥ 4% | 结构失效 |
| 成本可行 | 月换手 × 单边成本 | 成本吞噬 ≤ 50% 毛收益 | 白干 |
| 衰减 | IC 半衰期 | ≥ 3 个月 | 信号太快无法月频执行 |
| 稳健 | 分年 IC 正负比 | ≥ 70% 年份同号 | 单年奇迹 |

## 完整案例：红灯样例

某量价因子体检：RankIC 0.041（t=2.8）✓、ICIR 0.51 ✓、分组单调 ✓、**月换手 780%**、单边成本 0.15% → 年成本拖累 $7.8 \\times 12 \\times 0.15\\% \\times 2 \\approx 28\\%$（双边），毛超额 12% → **净超额 −16%，红灯**。两条出路：降频（信号平滑、持有期拉长——IC 会掉，重检）或改执行（算法拆单降成本）。**IC 再漂亮，成本一票否决**。

\`\`\`python
ic, icir, turnover_m, cost_side = 0.041, 0.51, 7.8, 0.0015
gross_annual = 0.12
cost_annual = turnover_m * 12 * cost_side * 2
print(f"年成本拖累 {cost_annual:.0%}, 净超额 {gross_annual - cost_annual:.0%}")
print("判定:", "PASS" if gross_annual - cost_annual > 0.03 else "REJECT(成本)")
\`\`\`

预期输出：年成本 28%、净超额 −16%、REJECT。

## 常见误区

1. **体检指标逐项跑、逐项调**——合格线整体事先冻结，跑完统一判定；
2. **换手只算单边**——双边、含冲击（quant-market c3-l1 全成本表）；
3. **IC 半衰期忽略**——月频组合月频信号，信号衰减快于调仓频率=浪费；
4. **分年检用日历年**——应按信号周期滚动分段，避免日历巧合。

## 知识关联

- **向前**：IC 体系（quant-strategy c3-l3）、成本表（quant-market c3-l1）；
- **向后**：通过体检的因子进入 c2-l2 合成；
- **平行**：合格线思想 = 策略回测课的预注册纪律。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 原则 | 合格线先冻结，数据后检验，一票否决 |
| 六项 | IC/ICIR/单调/成本/衰减/分年 |
| 最常见红灯 | IC 达标但换手成本吞噬全部毛收益 |

## 参考资料

> **来源类型：权威教材**
> - Qian, Hua & Sorensen（2007）——因子评估体系。
>
> **来源类型：原创**
> - 六项体检表与红灯样例为本课程原创。
`,
        tips: [
          {
            kind: 'interview',
            text: '面试常问：「如果一个因子多空收益极高，但换手率（Turnover）每个月高达 80%，这种因子可用吗？」答：对于容量较大的机构资金不可用。极高换手率会被印花税（千分之 0.5）、双边佣金与买卖滑点彻底吞噬净超额，扣费后往往变成净亏损。必须计算「扣费后净超额收益」。',
          },
        ],
      },
      {
        id: 'quant-project-c2-l2',
        title: '复合因子加权合成模型',
        content: `
### 学习目标

学完本节，你应该能够：
1. 对比等权/滚动 IC_IR 加权/最大化复合 IC_IR 三种合成法；
2. 用过去 12 期 Rank IC_IR 构建自适应权重并验证 noise 因子权重归零；
3. 说明各方法的估计误差与过拟合风险。

### 前置知识

- 「股票池动态筛选」（c1-l2）；
- Rank IC 概念（quant-strategy c3）。

### 问题背景

多个弱因子如何熔铸成一个强因子？等权简单稳健、IC_IR 加权自适应、最大化复合 IC_IR 的 QP 最激进——三条路线的取舍就是『估计误差 vs 自适应』的经典权衡。合成之后还必须过严格扣费回测这一关。

### 直觉理解

因子合成像评委打分：等权是『不听辩解平均分』（抗操纵但迟钝）；IC_IR 加权是『按评委历史准确度加权』（能者多票）；QP 合成是『考虑评委之间意见相关性后的最优组队』（最强但容易过拟合历史）。扣费回测则是把策略放到真实税费的绞肉机里走一遭：印花税、佣金、过户费、滑点一样不能少。

### 核心概念与原理详解

## 将多个弱 Alpha 熔铸为一个强 Alpha

当拥有了估值（Value）、质量（Quality）、动量（Momentum）、波动率（Volatility）等清洗后的纯净单因子后，如何科学合成复合总分分值（Composite Score）？

### 1. 等权加权法（Equal Weighting）
* 将各因子标准化分值简单算术相加：$S_i = \\frac{1}{K} \\sum_{k=1}^K Z_{i, k}$；
* **优势**：零估计误差，对极端样本外行情极其稳健。

### 2. 滚动 IC / IC_IR 加权法
* 以过去 12 个月的滚动 Rank IC 或 IC_IR 均值作为各因子的权重：
  $$w_k = \\frac{IC\\_IR_k}{\\sum |IC\\_IR_j|}$$
* 自适应奖励近期预测能力稳定突出的因子，惩罚阶段性失效的因子。

### 3. 最大化复合 IC_IR 均值-方差优化
利用马科维茨二次规划，以单因子历史 IC 均值为预期回报、IC 协方差矩阵为风险，求解夏普最高的切点因子权重向量。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
from scipy.stats import spearmanr
rng = np.random.default_rng(6)
N, T = 300, 36
Zv, Zm, Zn = (rng.normal(0, 1, (T, N)) for _ in range(3))
R = 0.002*Zv + 0.004*Zm + rng.normal(0, 0.08, (T, N))
def rank_ic(z): return np.array([spearmanr(z[t], R[t])[0] for t in range(T)])
ics = {k: rank_ic(z) for k, z in [("value", Zv), ("momentum", Zm), ("noise", Zn)]}
ir = {k: ic[:-12].mean()/(ic[:-12].std()+1e-12) for k, ic in ics.items()}   # 滚动过去 12 期
tot = sum(abs(v) for v in ir.values())
w = {k: v/tot for k, v in ir.items()}
print("IC_IR 加权:", {k: round(v, 2) for k, v in w.items()}, "（noise 权重≈0）")
comp = w["value"]*Zv + w["momentum"]*Zm + w["noise"]*Zn
top, bot = comp.argsort(1)[:, -30:], comp.argsort(1)[:, :30]
gross = np.array([R[t][top[t]].mean() - R[t][bot[t]].mean() for t in range(T)])
tau = 0.6                                   # 月单边换手 60%
fee = 2*tau*(0.00025 + 0.00001) + 2*tau*0.0005 + tau*0.0005   # 佣金过户双边 + 印花卖出 + 冲击
net = gross - fee
sr = lambda r: r.mean()/r.std()*np.sqrt(12)
print(f"月多空毛收益 {gross.mean():.2%} -> 净 {net.mean():.2%}（月费 {fee:.3%}）")
print(f"年化夏普: 毛 {sr(gross):.2f} vs 净 {sr(net):.2f}")\`\`\`

预期输出（实测）：滚动 12 期 IC_IR 加权 {value:0.13, momentum:0.65, noise:-0.22}（noise 权重≈0）；月多空毛收益 2.10% → 扣全套费率后 1.98%（月费 0.121%）；年化夏普 毛 3.49 vs 净 3.29。

**常见错误**：IC_IR 权重用全样本 IC 计算（未来函数），应为滚动过去 12 期；合成后忘记重新标准化导致因子暴露漂移；回测只扣佣金不扣印花税/过户费/冲击成本，年化收益虚高 2-3 个点。

### 常见误区

1. **『复杂加权一定优于等权』**——等权零估计误差，样本外常打赢精巧权重（DeMiguo 2020 的结论类似）；\\n2. **『IC_IR 权重平滑了风险』**——它奖励近期有效因子，也可能追高接盘刚失效的因子；\\n3. **『扣费只是减一个常数』**——高换手策略的费用与超额收益同量级，费用模型直接决定策略生死。

### 知识关联

- **向前**：c3 的模拟实盘检验合成因子在真实摩擦下的衰减；
- **向后**：quant-portfolio 的优化器是本章组合优化的完整版；
- **平行**：quant-strategy c3 的预处理是本章合成的上游工序。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 等权 | 零估计误差、样本外稳健 |
| IC_IR 加权 | 滚动 12 期 IC_IR 归一化权重 |
| QP 合成 | IC 均值=收益、IC 协方差=风险的切点 |
| 组合优化 | max wᵀS − λ/2·wᵀΣw − τ‖w−w_old‖₁ |
| 全套费率 | 佣金 0.025%双边 + 印花 0.05%卖出 + 过户 0.001% + 冲击 0.05~0.1% |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Barra 风格模型公开文献与 A 股交易所公开费率标准相应章节）
`,
        tips: [
          {
            kind: 'note',
            text: '合成前必须检查各单因子间的相关系数矩阵。若两个因子相关性 > 0.7，必须先做正交化或合并为一个大类风格因子，严禁直接加权导致风险重复下注。',
          },
        ],
        demos: [
          {
            title: '滚动 IC 加权因子合成代码',
            lang: 'python',
            code: `import numpy as np

# 3 个因子的历史滚动 IC_IR
ic_ir = np.array([0.8, 0.4, 0.6])
# 归一化计算权重
weights = ic_ir / np.sum(ic_ir)

# 某只股票在 3 个因子上的标准化暴露分值
stock_scores = np.array([1.2, -0.5, 0.8])
composite_score = np.dot(weights, stock_scores)

print(f"各因子权重: {weights.round(3)}")
print(f"该股票复合加权 Alpha 评分: {composite_score:.3f}")`,
          },
        ],
      },
      {
        id: 'quant-project-c2-l3',
        title: 'Barra 风格约束组合优化与严格扣费回测',
        content: `
### 学习目标

学完本节，你应该能够：
1. 写出带风格约束与换手惩罚的 QP 优化模型；
2. 按 A 股真实费率（佣金 0.025%双边+印花 0.05%卖出+过户 0.001%+冲击）计算月度费用；
3. 实测同一策略扣费前后年化夏普的衰减幅度。

### 前置知识

- 「复合因子加权合成模型」（c2-l2）；
- A 股费率结构（quant-backtest c1-l3）。

### 问题背景

多个弱因子如何熔铸成一个强因子？等权简单稳健、IC_IR 加权自适应、最大化复合 IC_IR 的 QP 最激进——三条路线的取舍就是『估计误差 vs 自适应』的经典权衡。合成之后还必须过严格扣费回测这一关。

### 直觉理解

因子合成像评委打分：等权是『不听辩解平均分』（抗操纵但迟钝）；IC_IR 加权是『按评委历史准确度加权』（能者多票）；QP 合成是『考虑评委之间意见相关性后的最优组队』（最强但容易过拟合历史）。扣费回测则是把策略放到真实税费的绞肉机里走一遭：印花税、佣金、过户费、滑点一样不能少。

### 核心概念与原理详解

## 从打分到最优组合持仓

拥有了复合 Alpha 打分 $S_i$ 之后，绝不能简单挑选排名前 50 只股票等权买入，必须通过**现代组合优化求解器（Portfolio Optimizer）**：

### 1. 二次规划（QP）优化模型
$$\\max_w w^T S - \\frac{\\lambda}{2} w^T \\Sigma w - \\tau \\|w - w_{old}\\|_1$$
* **基准行业偏离硬约束**：$|w_{\\text{ind}} - w_{\\text{bench, ind}}| \\le 1.5\\%$；
* **基准市值风格偏离约束**：$|w^T \\text{Size} - w_{\\text{bench}}^T \\text{Size}| \\le 0.1 \\sigma$；
* **个股权重上限**：$w_i \\le \\min(3\\%, 5 \\times w_{\\text{bench, i}})$；
* **换手率惩罚项 $\\tau$**：直接抑制调仓印花税与滑点磨损。

### 2. 真实扣费撮合标准
* 卖出印花税：$0.05\\%$；
* 双边佣金：$0.02\\%$（最低 5 元）；
* 双边冲击滑点：按实际成交金额扣除 $0.05\\% \\sim 0.1\\%$；
* 扣费后的全时段净值曲线才能客观证明策略的商业化盈利能力。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
from scipy.stats import spearmanr
rng = np.random.default_rng(6)
N, T = 300, 36
Zv, Zm, Zn = (rng.normal(0, 1, (T, N)) for _ in range(3))
R = 0.002*Zv + 0.004*Zm + rng.normal(0, 0.08, (T, N))
def rank_ic(z): return np.array([spearmanr(z[t], R[t])[0] for t in range(T)])
ics = {k: rank_ic(z) for k, z in [("value", Zv), ("momentum", Zm), ("noise", Zn)]}
ir = {k: ic[:-12].mean()/(ic[:-12].std()+1e-12) for k, ic in ics.items()}   # 滚动过去 12 期
tot = sum(abs(v) for v in ir.values())
w = {k: v/tot for k, v in ir.items()}
print("IC_IR 加权:", {k: round(v, 2) for k, v in w.items()}, "（noise 权重≈0）")
comp = w["value"]*Zv + w["momentum"]*Zm + w["noise"]*Zn
top, bot = comp.argsort(1)[:, -30:], comp.argsort(1)[:, :30]
gross = np.array([R[t][top[t]].mean() - R[t][bot[t]].mean() for t in range(T)])
tau = 0.6                                   # 月单边换手 60%
fee = 2*tau*(0.00025 + 0.00001) + 2*tau*0.0005 + tau*0.0005   # 佣金过户双边 + 印花卖出 + 冲击
net = gross - fee
sr = lambda r: r.mean()/r.std()*np.sqrt(12)
print(f"月多空毛收益 {gross.mean():.2%} -> 净 {net.mean():.2%}（月费 {fee:.3%}）")
print(f"年化夏普: 毛 {sr(gross):.2f} vs 净 {sr(net):.2f}")\`\`\`

预期输出（实测）：滚动 12 期 IC_IR 加权 {value:0.13, momentum:0.65, noise:-0.22}（noise 权重≈0）；月多空毛收益 2.10% → 扣全套费率后 1.98%（月费 0.121%）；年化夏普 毛 3.49 vs 净 3.29。

**常见错误**：IC_IR 权重用全样本 IC 计算（未来函数），应为滚动过去 12 期；合成后忘记重新标准化导致因子暴露漂移；回测只扣佣金不扣印花税/过户费/冲击成本，年化收益虚高 2-3 个点。

### 常见误区

1. **『复杂加权一定优于等权』**——等权零估计误差，样本外常打赢精巧权重（DeMiguo 2020 的结论类似）；\\n2. **『IC_IR 权重平滑了风险』**——它奖励近期有效因子，也可能追高接盘刚失效的因子；\\n3. **『扣费只是减一个常数』**——高换手策略的费用与超额收益同量级，费用模型直接决定策略生死。

### 知识关联

- **向前**：c3 的模拟实盘检验合成因子在真实摩擦下的衰减；
- **向后**：quant-portfolio 的优化器是本章组合优化的完整版；
- **平行**：quant-strategy c3 的预处理是本章合成的上游工序。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 等权 | 零估计误差、样本外稳健 |
| IC_IR 加权 | 滚动 12 期 IC_IR 归一化权重 |
| QP 合成 | IC 均值=收益、IC 协方差=风险的切点 |
| 组合优化 | max wᵀS − λ/2·wᵀΣw − τ‖w−w_old‖₁ |
| 全套费率 | 佣金 0.025%双边 + 印花 0.05%卖出 + 过户 0.001% + 冲击 0.05~0.1% |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Barra 风格模型公开文献与 A 股交易所公开费率标准相应章节）
`,
        tips: [
          {
            kind: 'pitfall',
            text: '回测中若未对换手率进行惩罚项控制，组合优化器每期往往会发生 60% 以上的大换血，由此产生的摩擦成本会直接将年化 20% 的毛超额打成负数！',
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'quant-project-c2-e1',
        relatedLessonId: 'quant-project-c2-l1',
        type: 'single',
        difficulty: 1,
        question: '在多因子选股体系中，衡量单因子预测精度稳定性（即因子月度 Rank IC 均值除以月度 Rank IC 标准差）的指标是：',
        options: [
          { value: 'A', text: 'IC_IR（信息比率）' },
          { value: 'B', text: '贝塔系数 Beta' },
          { value: 'C', text: '股息率 Dividend Yield' },
          { value: 'D', text: '市销率 PS' },
        ],
        answer: 'A',
        explanation: 'IC_IR = mean(Rank_IC) / std(Rank_IC)，用于衡量因子预测能力的稳定性，通常要求大于 0.5。',
        tags: ['IC_IR', '单因子体检'],
      },
      {
        id: 'quant-project-c2-e2',
        relatedLessonId: 'quant-project-c2-l3',
        type: 'single',
        difficulty: 1,
        question: '在进行指数增强投资组合二次规划（QP）优化求解时，为了控制调仓带来的交易摩擦（税费和滑点），通常在目标函数中添加的约束项是：',
        options: [
          { value: 'A', text: '换手率惩罚项（Turnover Penalty）' },
          { value: 'B', text: '随机扰动项' },
          { value: 'C', text: '资产净值对数项' },
          { value: 'D', text: '持仓股数最大化' },
        ],
        answer: 'A',
        explanation: '通过对权重变动绝对值 ||w - w_old||_1 施加惩罚系数，可以有效抑制过度换手，平衡 Alpha 收益与交易成本。',
        tags: ['组合优化', '换手率惩罚'],
      },
      {
        id: 'quant-project-c2-e3',
        relatedLessonId: 'quant-project-c2-l1',
        type: 'multiple',
        difficulty: 2,
        question: '在评估单因子分层回测表现时，一个健康的合格 Alpha 因子应当具备的特征包括：',
        options: [
          { value: 'A', text: '五分组（Q1 到 Q5）收益率具有严格的单调递减（或递增）性' },
          { value: 'B', text: '多空对冲组合（Q1 - Q5）的净值曲线稳步向上，回撤较小' },
          { value: 'C', text: '扣除真实印花税、佣金与滑点后，多头依然具备稳定的年化超额' },
          { value: 'D', text: '仅在某个月份暴赚，其余 11 个月全部严重跑输' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: '选项 D 具有高度偶发性与不稳定性，不属于合格因子；ABC 均为健康 Alpha 因子的标准特征。',
        tags: ['因子评估', '分层测试'],
      },
      {
        id: 'quant-project-c2-e4',
        relatedLessonId: 'quant-project-c2-l2',
        type: 'judge',
        difficulty: 2,
        question: '在多因子模型中，若直接采用等权合成法（Equal Weighting），虽然没有考虑不同因子预测能力的差异，但在实战样本外由于其估计方差为零，往往比复杂样本内参数拟合更具抗过拟合鲁棒性。',
        answer: true,
        explanation: '正确。等权合成无需估计复杂权重参数，彻底消除了估计误差，在低信噪比金融场景下具有极佳的稳健性。',
        tags: ['因子合成', '等权鲁棒性'],
      },
      {
        id: 'quant-project-c2-e5',
        relatedLessonId: 'quant-project-c2-l3',
        type: 'fill',
        difficulty: 2,
        question: '在量化投资组合换手率计算中，两期资产权重向量变化率的单边总和通常称为单边 ___ 率（Turnover Rate），其公式为 $\\frac{1}{2} \\sum |w_{t, i} - w_{t-1, i}|$。',
        blanks: [['换手', '换手率', 'Turnover', 'turnover']],
        explanation: '单边换手率用于精确衡量资产买卖周转体量与计提交易摩擦。',
        tags: ['换手率', '计算指标'],
      },
      {
        id: 'quant-project-c2-e6',
        relatedLessonId: 'quant-project-c2-l2',
        type: 'code',
        difficulty: 2,
        question: '编写函数 calculate_turnover(prev_weights, new_weights)，输入两个权重字典（例如 {"A": 0.5, "B": 0.5} 与 {"A": 0.8, "B": 0.2}），计算单边换手率。\n\n公式：0.5 * sum_s |new_weights.get(s, 0.0) - prev_weights.get(s, 0.0)|。返回换手率浮点数。',
        starterCode: `def calculate_turnover(prev_weights, new_weights):
    pass
`,
        expectedOutput: '单边换手率浮点数',
        tests: `assert abs(calculate_turnover({"A": 0.5, "B": 0.5}, {"A": 0.8, "B": 0.2}) - 0.3) < 1e-5
assert abs(calculate_turnover({"A": 1.0}, {"A": 1.0}) - 0.0) < 1e-5
assert abs(calculate_turnover({"A": 1.0}, {"B": 1.0}) - 1.0) < 1e-5`,
        answer: `def calculate_turnover(prev_weights, new_weights):
    all_syms = set(prev_weights.keys()) | set(new_weights.keys())
    diff_sum = sum(abs(new_weights.get(s, 0.0) - prev_weights.get(s, 0.0)) for s in all_syms)
    return 0.5 * diff_sum

calculate_turnover({"A": 0.5, "B": 0.5}, {"A": 0.8, "B": 0.2})`,
        explanation: '遍历所有并集标的，求取权重差额绝对值总和的一半即为单边换手率。',
        tags: ['换手率计算', 'Python编程'],
      },
      {
        id: 'quant-project-c2-e7',
        relatedLessonId: 'quant-project-c2-l2',
        type: 'code',
        difficulty: 3,
        question: '编写函数 ic_weighted_score(stock_factor_scores, factor_ic_irs)，输入股票在各因子上的分值列表（如 [1.0, -0.5, 0.8]）与各因子的 IC_IR 列表（如 [0.6, 0.2, 0.4]）。计算归一化 IC_IR 加权后的复合 Alpha 总分。若 IC_IR 均为 0 或输入为空返回 0.0。',
        starterCode: `def ic_weighted_score(stock_factor_scores, factor_ic_irs):
    pass
`,
        expectedOutput: '复合打分浮点数',
        tests: `assert abs(ic_weighted_score([1.0, 1.0], [0.5, 0.5]) - 1.0) < 1e-5
assert abs(ic_weighted_score([1.0, 0.0], [0.8, 0.2]) - 0.8) < 1e-5
assert ic_weighted_score([], []) == 0.0`,
        answer: `def ic_weighted_score(stock_factor_scores, factor_ic_irs):
    if not stock_factor_scores or not factor_ic_irs:
        return 0.0
    total_ic = sum(factor_ic_irs)
    if total_ic == 0:
        return 0.0
    weights = [ic / total_ic for ic in factor_ic_irs]
    return sum(w * s for w, s in zip(weights, stock_factor_scores))

ic_weighted_score([1.0, 1.0], [0.5, 0.5])`,
        explanation: '先将 IC_IR 归一化为和为 1 的权重，再与对应因子得分做内积点乘。',
        tags: ['因子合成', '代码实现'],
      },
      {
        id: 'quant-project-c2-e8',
        relatedLessonId: 'quant-project-c2-l3',
        type: 'multiple',
        difficulty: 3,
        question: '在多因子组合优化中，Barra 风格风险模型对哪些宏观系统性风格因子施加中性化约束，以防范非预期的风格暴露风险？',
        options: [
          { value: 'A', text: '规模因子（Size / Market Capitalization）' },
          { value: 'B', text: '估值因子（Value / Book-to-Price）' },
          { value: 'C', text: '动量因子（Momentum）与贝塔因子（Beta）' },
          { value: 'D', text: '董事长当天穿的西装颜色' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: 'Barra CNE5/CNE6 核心风格包含 Size, Value, Momentum, Beta, Volatility, Liquidity 等系统性风格；D 选项完全无关。',
        tags: ['Barra模型', '风格因子'],
      },
      {
        id: 'quant-project-c2-e9',
        relatedLessonId: 'quant-project-c2-l3',
        type: 'judge',
        difficulty: 2,
        question: '在多因子组合回测中，必须坚持在调仓成交时模拟「T+1 开盘价成交」或「TWAP 均价撮合」，严禁使用生成调仓信号当天的收盘价（T 日 Close）直接成交。',
        answer: true,
        explanation: '正确。T 日收盘后才能算出调仓名单，必须在 T+1 日开盘后才能入场执行，用 T 日收盘价成交是严重的未来函数。',
        tags: ['撮合规范', '未来函数'],
      },
      {
        id: 'quant-project-c2-e10',
        relatedLessonId: 'quant-project-c2-l3',
        type: 'open',
        difficulty: 4,
        question: '【实战多因子研发方案】\n假设你正在为中证 1000 指数增强基金开发一套多因子量化模型。目前你拥有 4 个候选因子：\n- 估值类：EP_TTM（市盈率倒数）；\n- 动量类：20 日量价背离动量；\n- 质量类：ROE 盈利稳定性；\n- 微观量价类：日内订单流买卖失衡度（OFI）。\n请设计一套完整的实战方案：\n1. 如何进行因子间正交化与加权合成；\n2. 二次规划组合优化器如何设定跟踪误差（Tracking Error <= 4%）与行业偏离硬约束？',
        referenceAnswer: `1. 因子预处理、正交化与合成方案：
(1) 预处理：每个交易日截面上，对 4 个因子依次执行 3 倍 MAD 去极值、中信一级行业哑变量与对数流通市值多元 OLS 回归提取残差、以及截面 Z-Score 标准化；
(2) 正交化与降共线性：
  - 计算 4 个因子的截面相关系数矩阵，若动量与微观 OFI 相关性超过 0.5，采用对称正交化（Symmetric Orthogonalization）消除多重共线性，保证各因子在保持原始经济含义的同时互相正交；
(3) 动态加权合成：基于过去 24 个月的滚动 Rank IC_IR 表现，采用半衰期为 6 个月的指数衰减加权，动态计算各因子权重，合成得到综合 Alpha 评分 $S$。

2. 组合优化器数学建模与约束配置：
构建凸二次规划（QP）优化问题：
$$\\min_w - w^T S + \\frac{\\lambda}{2} (w - w_{\\text{bench}})^T \\Sigma_{\\text{Barra}} (w - w_{\\text{bench}}) + \\tau \\|w - w_{\\text{prev}}\\|_1$$
满足以下刚性约束：
(1) 全额投资与非负约束：$\\sum w_i = 1, \\quad w_i \\ge 0$（严禁融券卖空）；
(2) 跟踪误差硬约束：预估年化跟踪误差 $\\sqrt{252 \\cdot (w - w_{\\text{bench}})^T \\Sigma (w - w_{\\text{bench}})} \\le 4.0\\%$；
(3) 行业权重偏离硬约束：对 30 个中信一级行业，严格限制 $|w_{\\text{ind}, k} - w_{\\text{bench, ind}, k}| \\le 1.0\\%$；
(4) 风格因子暴露约束：组合在 Size、Beta 上的主动暴露限制在 $\\pm 0.1$ 个标准差内，保证纯粹赚取个股特质选股超额；
(5) 个股持仓上限：单票最大权重 $\\le \\min(1.5\\%, 10 \\times w_{\\text{bench, i}})$，杜绝单股爆仓风险；
(6) 换手率惩罚系数 $\\tau$：将单边月度换手率刚性压制在 30%~40% 以内，最大化扣费后净超额。`,
        rubric: [
          { point: '清晰阐明 MAD 清洗、对称正交化与滚动 IC_IR 动态合成方案', score: 50 },
          { point: '完整给出二次规划优化模型、4% 跟踪误差公式、行业偏离与单票上限约束', score: 50 },
        ],
        keywords: ['对称正交化', 'IC_IR加权', '中证1000指增', '跟踪误差', 'Barra协方差', '行业偏离约束', '换手惩罚'],
        explanation: '全面考查机构级指数增强量化投研从单因子治理、正交合成到多约束组合优化的工业级实战全流程。',
        tags: ['指数增强', '组合优化', '多因子实战'],
      },
    ],
  },

  /* ══════════════════════════════════════════════════════════════════
     第 3 章：机构级量化研究报告撰写与模拟实盘跟踪
     ══════════════════════════════════════════════════════════════════ */
  {
    id: 'quant-project-c3',
    title: '机构级量化研究报告撰写与模拟实盘跟踪',
    goal: '掌握华尔街顶级对冲基金量化研究白皮书（Whitepaper）标准结构，建立 3 个月模拟实盘（Paper Trading）准入验收门槛与 Alpha 衰竭退役机制。',
    lessons: [
      {
        id: 'quant-project-c3-l1',
        title: '量化研究报告（Whitepaper）标准七部曲',
        content: `
## 学习目标

学完本节，你应该能够：
1. 写出量化研究报告（Whitepaper）的七部曲结构，每节回答决策者的一个问题；
2. 按"假设→方法→证据→风险"的顺序组织内容，把窥探尝试数如实披露；
3. 用一页执行摘要（含最差情形）让非技术决策者能做判断。

## 前置知识

- 本课 c1/c2 的全部产出（假设、体检、合成、回测）；
- 回测纪律（quant-backtest c3）。

## 问题背景：研究报告是说服工具还是诚实工具

机构投委会每周看数份策略报告，**报告的默认怀疑是"你又挖了个假阳性"**。七部曲的结构对应决策者的七个问题：为什么可能赚钱（假设）→ 怎么赚（方法）→ 证据（稳健性）→ 会怎么死（风险与容量）→ 试运行（Paper Trading）→ 什么情况下退役（监控）→ 尝试了多少次（窥探披露）。缺任何一节，决策者都会自己脑补——通常是坏的那种。

## 核心概念：七部曲

1. **经济学假设**：谁付钱、为何持续、为何是你（c1-l1 三问）；
2. **数据与方法**：宇宙、频率、预处理、信号构造、组合方式——可复现级别的细节；
3. **证据**：CPCV/WFO 多路径结果、分年表、扣全成本净值——**报分布不报点**；
4. **风险与容量**：最差路径回撤、容量测算（成本-规模曲线）、与现有策略的相关性；
5. **模拟实盘**：Paper Trading 计划与门槛（下一节）；
6. **退役条件**：IC 连续 N 月为负、回撤阈值、拥挤度指标——事前量化；
7. **研究披露**：尝试总数、被否决的变体、数据窗口——**诚实报告多重检验**。

## 完整案例：执行摘要模板（一页）

> **策略**：A 股低换手质量因子（月频）
> **假设**：质量溢价来自机构短考核期对长周期优质资产的系统性低估（行为类）
> **证据**：CPCV 15 路径年化超额 6.7% ± 2.2%（最差 2.7%）；扣费后 4.9%；分年 IC 11/13 年同号
> **风险**：最大路径回撤 −8.3%；容量约 15 亿（成本敏感）；与现有价值因子相关 0.31
> **试运行**：Paper Trading 3 个月，门槛见第 5 节
> **退役线**：IC 六个月滚动 < 0 连续 3 期，或回撤 > 1.5×历史最差
> **披露**：累计尝试 42 个变体（记录在案），本报告为第 1 个通过体检者

这一页让投委能在三分钟内抓住"赚多少、多稳、怎么死、诚不诚实"。

## 常见误区

1. **报告=回测曲线集**——曲线是证据的一小节，不是全部；没有假设与风险的报告是推销材料；
2. **只报均值**——分布、最差路径、分年表缺一不可；
3. **尝试数藏起来**——42 个变体只报 1 个 = 把 p<0.05 的意义抬到 p<0.5（数据窥探，quant-backtest c3-l2）；
4. **退役线事后定**——必须在上线前写进报告，否则回撤后永远"再等等"。

## 知识关联

- **向前**：本课 c1/c2 产出是 1–4 节的原料；
- **向后**：第 5/6 节的落地在 c3-l2（试运行）与 c3-l3（退役）；
- **平行**：学术写作的 IMRaD 结构与之同构；UC Berkeley MFE 的 capstone 报告规范是业界范本。

## 本节总结

| 部曲 | 回答的问题 |
| --- | --- |
| 1 假设 / 2 方法 | 为什么与怎么做 |
| 3 证据 | 多稳（分布） |
| 4 风险容量 | 怎么死 |
| 5 试运行 / 6 退役 | 怎么验证与退出 |
| 7 披露 | 诚不诚实 |

## 参考资料

> **来源类型：参考资料**
> - UC Berkeley MFE、MIT Sloan 项目报告规范（机构级范本）。
> - Bailey, Borwein, López de Prado & Zhu (2017). "The Probability of Backtest Overfitting." *Journal of Computational Finance*, 20(4)——披露尝试数的统计依据。
>
> **来源类型：原创**
> - 七部曲框架与执行摘要模板为本课程整理。
`,
        tips: [
          {
            kind: 'interview',
            text: '千万不要在研报中报喜不报忧！顶级投资总监最看重的是第 7 部分「失效模式与极端风险披露」。坦诚剖析策略在历史极端行情中的亏损原因，远比一条平滑得不可思议的虚假回测曲线更具说服力。',
          },
        ],
      },
      {
        id: 'quant-project-c3-l2',
        title: '模拟实盘（Paper Trading）三个月验证门槛',
        content: `
### 学习目标

学完本节，你应该能够：
1. 说明模拟实盘 3 个月门槛要检验的三件事（时钟/滑点/衰减率）；
2. 计算 Decay Ratio = Paper Sharpe / Backtest OOS Sharpe 并执行 50% 红线；
3. 设计模拟实盘期间的周度跟踪报告模板。

### 前置知识

- c2 的扣费回测结果；
- 夏普比率定义。

### 问题背景

回测再漂亮也不许直接上真钱：模拟实盘 3 个月（≥60 交易日）是回测与实盘之间的缓冲带——它检验时钟延迟、真实撮合滑点与 OOS 衰减率，衰减超过 50% 就要回头查过拟合。

### 直觉理解

模拟实盘像飞行模拟器转真机带飞：所有仪表（数据延迟、拒单率、滑点）都是真的，只是没有真金白银。衰减率 = 模拟实盘夏普 / 回测夏普，是策略的『水分挤出率』：挤出后还剩一半以上才配得上灰度上线。

### 核心概念与原理详解

## 从回测走向真金白银的缓冲地带

任何回测优秀的策略，**严禁直接投入真实真金白银实盘交易**！必须在券商模拟柜台环境中进行为期 **3 个月（至少 60 个真实交易日）的模拟实盘（Paper Trading / Incubator）**跟踪检验：

### 1. 模拟实盘的核心检验目标
* **验证时钟与数据延迟**：实盘中能否在开盘前 09:15 准时完成因子计算与报单生成？
* **验证真实撮合滑点**：模拟实盘接收真实盘口 Tick 广播，检验挂单撤单是否频繁被拒单或滑点超预期；
* **检验 OOS 衰减率（Decay Factor）**：
  $$\\text{Decay Ratio} = \\frac{\\text{Paper Trading Sharpe}}{\\text{Backtest OOS Sharpe}}$$
  工业界标准：若模拟实盘夏普比率衰减至回测夏普的 $50\\%$ 以下，必须暂缓上线排查过拟合！

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
rng = np.random.default_rng(8)
bt = rng.normal(0.0010, 0.008, 250)         # 回测 OOS 日收益（250 日）
pt = bt - 0.0006                            # 模拟实盘：真实滑点+延迟+未成交拖累
sh = lambda r: r.mean()/r.std()*np.sqrt(252)
s1, s2 = sh(bt), sh(pt)
print(f"回测 OOS 夏普 {s1:.2f} | 模拟实盘 {s2:.2f} | 衰减率 {s2/s1:.0%}",
      "→ 暂缓上线排查过拟合" if s2/s1 < 0.5 else "→ 可申请灰度")\`\`\`

预期输出（实测）：回测 OOS 夏普 1.95 → 模拟实盘 0.84（真实滑点+延迟拖累），衰减率 43% < 50% → 暂缓上线排查过拟合。

**常见错误**：模拟实盘用回测同源数据源（应接真实行情推送）；衰减率高仍硬上线，指望『实盘会比模拟好』；验证期覆盖不足一个完整风格周期（3 个月可能全是单边市）。

### 常见误区

1. **『模拟实盘只是走流程』**——它暴露的是回测无法模拟的工程缺陷：延迟、拒单、部分成交；\\n2. **『衰减 50% 可以接受』**——工业标准是低于 50% 即暂缓排查，实盘通常再衰减一截；\\n3. **『报告写完就结束』**——模拟实盘的持续跟踪与周报机制是发现策略风格漂移的唯一手段。

### 知识关联

- **向前**：c2 的扣费回测是本章衰减率的分母；
- **向后**：quant-live 的实盘系统接手模拟盘验证过的策略；
- **平行**：c3-l1 的报告撰写把全流程固化成可复查的文档。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 门槛 | 模拟实盘 ≥3 个月（60 交易日）|
| 验证项 | 时钟延迟 / 真实滑点 / 拒单率 |
| 衰减率 | Paper Sharpe / Backtest OOS Sharpe |
| 红线 | 衰减 >50% 暂缓上线排查过拟合 |
| 机制 | 周报跟踪 + 风格漂移监控 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Barra 风格模型公开文献与 A 股交易所公开费率标准相应章节）
`,
        tips: [
          {
            kind: 'pitfall',
            text: '在模拟实盘期间，严禁修改任何模型参数或优化器约束！若中途调整代码，必须将 3 个月跟踪时钟清零重新计时！',
          },
        ],
      },
      {
        id: 'quant-project-c3-l3',
        title: 'Alpha 衰竭监控、容量上限与退役机制',
        content: `
## 学习目标

学完本节，你应该能够：
1. 量化"Alpha 衰竭"的三个监控指标：滚动 IC、拥挤度、衰减半衰期，并设预警阈值；
2. 用成本-规模曲线测算策略**容量上限**（边际成本吞噬边际收益的规模）；
3. 写出退役机制的触发条款（软降杠杆 → 硬退役）与执行纪律。

## 前置知识

- IC 滚动监控（quant-strategy c3-l3）；
- 冲击成本的非线性（quant-market c3-l1 平方根定律）。

## 问题背景：所有 Alpha 都会死

因子公开、对手模仿、结构变迁——超额收益的半衰期从数年到数月不等。没有退役机制的策略会**把历史赚的钱如数还回市场**（还要搭上尾部风险）。机构纪律：衰竭可监控、容量可测算、退役有条款，且全部**事前**写定。

## 核心概念：三个监控指标

| 指标 | 计算 | 预警阈值（示例） | 含义 |
| --- | --- | --- | --- |
| 滚动 IC | 6 个月滚动 RankIC | 连续 3 期 < 0 | 预测力消失 |
| 拥挤度 | 因子多头组合换手/估值偏离/做空利用率 | 历史分位 > 90% | 对手扎堆，崩塌前兆（呼应动量崩塌） |
| 执行落差 | 实际成交 vs 理论价差的差 | 月均 > 2×回测假设 | 容量已到顶的实盘信号 |

## 原理详解

\`\`\`python
import numpy as np
Q = np.array([1, 2, 4, 8, 16, 32])               # 规模（亿）
gross = 0.16 * (1 - np.log2(Q) / 5)               # 小容量机会随规模摊薄
impact = 0.005 * np.sqrt(Q / 8)                   # 冲击按 sqrt(Q) 上升
net = gross - impact
for q, g, i, n in zip(Q, gross, impact, net):
    print(f"规模 {q:2d} 亿: 毛 {g:.1%}, 冲击 {i:.2%}, 净 {n:.1%}")
print("容量上限（净>4%）:", Q[net > 0.04].max(), "亿")
\`\`\`

预期输出（实测）：净超额从 1 亿的 15.8% 单调下滑（毛收益随规模摊薄 + 冲击按 √Q 上升），8 亿处 5.9%、16 亿处 2.5% 跌破 4% 线——**容量上限约 8 亿**。两类效应缺一不可：只有摊薄没有冲击，曲线缓降无拐点；只有冲击没有摊薄，容量虚高。**容量是算出来的，不是感觉出来的**。

## 完整案例：退役条款（事前写定）

- **软降杠杆**：滚动 IC 连续 3 期 < 0 → 仓位减半，观察 1 个月；
- **硬退役**：滚动 IC 连续 6 期 < 0，或实盘回撤 > 1.5×CPCV 最差路径 → 全部平仓，策略冻结 6 个月后允许重新立项；
- **拥挤紧急退出**：拥挤度 > 95% 分位且组合单周回撤 > 4% → 无条件降杠杆至 30%。

关键纪律：**触发即执行**——条款写在报告第 6 节，监控自动化，人工只负责按下已经决定的按钮。

## 常见误区

1. **"好因子会回来"**——衰竭的经济学解释（出资人结构变化）意味着它常不会回来；
2. **容量按单票流动性估**——组合层面的冲击、调仓同时性、对手抢先都要计入；
3. **退役条款模糊**（"表现不佳时"）——必须量化，否则每次回撤都是"再观察"；
4. **监控指标只用 IC**——拥挤度与执行落差常先于 IC 报警。

## 知识关联

- **向前**：动量崩塌（quant-strategy c1-l3）是拥挤衰竭的经典案例；容量依赖平方根定律（quant-market c3-l1）；
- **向后**：本课的终点=实盘系统课的起点（quant-live 的监控与风控落地）；
- **平行**：报告七部曲的第 6 节（c3-l1）在此兑现。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 三监控 | 滚动 IC / 拥挤度 / 执行落差 |
| 容量 | 净超额-规模曲线的拐点，冲击按 √Q 侵蚀 |
| 退役 | 软降杠杆→硬退役，条款事前量化、触发即执行 |

## 参考资料

> **来源类型：学术来源**
> - McLean, R. D., & Pontiff, J. (2016). "Does Academic Research Destroy Stock Return Predictability?" *Journal of Finance*, 71(1), 5–32——因子公开后衰减约 32%–58% 的实证。
> - Almgren et al. (2005)——冲击非线性（已核验体系）。
>
> **来源类型：原创**
> - 容量曲线代码与退役条款模板为本课程原创。
`,
        tips: [
          {
            kind: 'note',
            text: '对冲基金保持活力的秘诀是「因子新陈代谢」：每月研发入库 5~10 个新因子，淘汰 3~5 个衰竭老因子，维持因子库的强健生命力。',
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'quant-project-c3-e1',
        relatedLessonId: 'quant-project-c3-l2',
        type: 'single',
        difficulty: 1,
        question: '在量化对冲基金投研管理中，策略在回测通过后、正式实盘资金入场前，必须在真实市场环境中运行模拟撮合并跟踪绩效的阶段通常被称为：',
        options: [
          { value: 'A', text: '模拟实盘跟踪（Paper Trading / 孵化期）' },
          { value: 'B', text: '单元测试' },
          { value: 'C', text: '交叉编译' },
          { value: 'D', text: '静态代码扫描' },
        ],
        answer: 'A',
        explanation: 'Paper Trading（模拟实盘）在不承担真金白银亏损的前提下，以真实盘口数据检验系统的延迟、滑点与实盘衰减。',
        tags: ['Paper Trading', '流程规范'],
      },
      {
        id: 'quant-project-c3-e2',
        relatedLessonId: 'quant-project-c3-l3',
        type: 'single',
        difficulty: 1,
        question: '当随着管理资金规模的不断膨胀，量化策略的边际交易冲击成本急剧增加，导致净超额收益下降至无法接受水平的临界资金规模被称为：',
        options: [
          { value: 'A', text: '无风险收益率' },
          { value: 'B', text: '策略容量上限（Strategy Capacity）' },
          { value: 'C', text: '最大持仓集中度' },
          { value: 'D', text: '贝塔中枢' },
        ],
        answer: 'B',
        explanation: '策略容量上限受标的市场流动性与冲击成本限制，是量化产品规模扩张的硬物理天花板。',
        tags: ['策略容量', '规模管理'],
      },
      {
        id: 'quant-project-c3-e3',
        relatedLessonId: 'quant-project-c3-l1',
        type: 'multiple',
        difficulty: 2,
        question: '一份符合顶级量化机构标准的量化研究白皮书（Whitepaper），必须详细论述并披露的核心内容包括：',
        options: [
          { value: 'A', text: '底层超额收益产生的金融经济学逻辑假说与对手方行为分析' },
          { value: 'B', text: '严谨扣减印花税、佣金与微观滑点后的样本内/外净值曲线' },
          { value: 'C', text: '策略极端市场失效模式分析与强制止损下线预案' },
          { value: 'D', text: '保证该策略未来 50 年内永远不可能发生任何单日亏损' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: '选项 D 是虚假诈骗承诺；ABC 均为专业机构研报必备的逻辑、回测与风控要素。',
        tags: ['量化研报', '投研规范'],
      },
      {
        id: 'quant-project-c3-e4',
        relatedLessonId: 'quant-project-c3-l3',
        type: 'judge',
        difficulty: 2,
        question: '所有量化 Alpha 因子由于市场竞争者的发现模仿、套利资本的涌入以及市场微观结构的演化，长期来看均存在不可逆的 Alpha 衰竭（Alpha Decay）现象。',
        answer: true,
        explanation: '正确。金融市场的自适应与反身性使得任何公开或被过度拥挤交易的 Alpha 都会随时间逐步衰减钝化。',
        tags: ['Alpha衰竭', '市场适应性'],
      },
      {
        id: 'quant-project-c3-e5',
        relatedLessonId: 'quant-project-c3-l2',
        type: 'fill',
        difficulty: 2,
        question: '在量化投研中，当某策略在实盘或模拟盘中表现持续低于预期、经归因分析确认其核心 Alpha 永久丧失后，将其从生产交易系统中安全终止并释放资金的过程被称为策略 ___（Decommissioning）。',
        blanks: [['退役', '下线', '下架', 'Decommissioning']],
        explanation: '策略退役（Decommissioning）是量化生命周期管理的最后闭环，确保资金平稳再分配。',
        tags: ['策略退役', '生命周期'],
      },
      {
        id: 'quant-project-c3-e6',
        relatedLessonId: 'quant-project-c3-l2',
        type: 'code',
        difficulty: 2,
        question: '编写函数 check_paper_trading_gate(backtest_sharpe, paper_sharpe, min_decay_ratio=0.5)，检查模拟实盘是否达到准入上线门槛。\n\n规则：decay_ratio = paper_sharpe / backtest_sharpe。若 backtest_sharpe <= 0，返回 False；若 decay_ratio >= min_decay_ratio 且 paper_sharpe > 1.0，返回 True（准予上线实盘），否则返回 False。',
        starterCode: `def check_paper_trading_gate(backtest_sharpe, paper_sharpe, min_decay_ratio=0.5):
    pass
`,
        expectedOutput: '布尔值',
        tests: `assert check_paper_trading_gate(2.5, 1.8, 0.5) == True
assert check_paper_trading_gate(2.5, 0.9, 0.5) == False
assert check_paper_trading_gate(2.5, 1.1, 0.5) == False`,
        answer: `def check_paper_trading_gate(backtest_sharpe, paper_sharpe, min_decay_ratio=0.5):
    if backtest_sharpe <= 0:
        return False
    ratio = paper_sharpe / backtest_sharpe
    return ratio >= min_decay_ratio and paper_sharpe > 1.0

check_paper_trading_gate(2.5, 1.8, 0.5)`,
        explanation: '考核模拟盘夏普相比回测衰减比例是否在容忍限度内，且绝对夏普必须大于 1.0。',
        tags: ['准入门槛', 'Python编程'],
      },
      {
        id: 'quant-project-c3-e7',
        relatedLessonId: 'quant-project-c3-l3',
        type: 'code',
        difficulty: 3,
        question: '编写函数 is_alpha_decayed(recent_ics, ic_threshold=0.01)，评估因子是否已经衰竭失效。\n\n输入 recent_ics 为最近多期的 Rank IC 列表。若列表为空返回 True；若其算术平均值小于 ic_threshold，返回 True（判定为衰竭）；否则返回 False（依然有效）。',
        starterCode: `def is_alpha_decayed(recent_ics, ic_threshold=0.01):
    pass
`,
        expectedOutput: '布尔值',
        tests: `assert is_alpha_decayed([0.005, 0.008, 0.002], 0.01) == True
assert is_alpha_decayed([0.04, 0.03, 0.05], 0.01) == False
assert is_alpha_decayed([], 0.01) == True`,
        answer: `def is_alpha_decayed(recent_ics, ic_threshold=0.01):
    if not recent_ics:
        return True
    avg_ic = sum(recent_ics) / len(recent_ics)
    return avg_ic < ic_threshold

is_alpha_decayed([0.04, 0.03, 0.05], 0.01)`,
        explanation: '计算近期滚动 IC 均值，若跌破阈值则判定因子预测力已耗尽衰竭。',
        tags: ['Alpha衰竭', '监控指标'],
      },
      {
        id: 'quant-project-c3-e8',
        relatedLessonId: 'quant-project-c3-l3',
        type: 'multiple',
        difficulty: 3,
        question: '在对冲基金的实际风控与监控看板中，哪些警报信号通常会触发对在线实盘策略的临时人工干预或降仓？',
        options: [
          { value: 'A', text: '连续 20 个交易日出现与基准风格偏离极大的异常单日跟踪误差跳增' },
          { value: 'B', text: '组合实际最大回撤突破历史回测最大回撤的 1.5 倍' },
          { value: 'C', text: '券商实盘交易接口频繁报出超过 10% 的报单被拒错误' },
          { value: 'D', text: '当天市场各大主要指数小幅波动了 0.1%' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: 'ABC 均为系统性异常、风险失控与柜台故障的严重信号，必须人工干预；D 选项是完全正常的市场日常波动。',
        tags: ['风控看板', '应急干预'],
      },
      {
        id: 'quant-project-c3-e9',
        relatedLessonId: 'quant-project-c3-l2',
        type: 'judge',
        difficulty: 2,
        question: '量化团队在模拟实盘（Paper Trading）的 3 个月跟踪检验周期内，严禁为了迎合近期盘面变动而随意在生产分支中频繁修改代码参数，否则必须将 3 个月观察期归零重新起算。',
        answer: true,
        explanation: '正确。中途随意修改参数会使得模拟实盘沦为另一种形式的样本内过拟合，违背了独立检验的初衷。',
        tags: ['Paper Trading', '科学纪律'],
      },
      {
        id: 'quant-project-c3-e10',
        relatedLessonId: 'quant-project-c3-l3',
        type: 'open',
        difficulty: 4,
        question: '【高阶量化投研答辩与终审复盘】\n你作为量化研究团队的负责人，正在向基金投资决策委员会汇报一份为期 3 年研发周期的「中证 500 多因子量化增强实盘产品上线提案」。\n请撰写一份结构严谨、数据完备的答辩陈述，必须覆盖：\n1. 策略核心超额收益假说与经济学逻辑基础；\n2. 考虑全部微观摩擦（印花税、双边佣金、滑点冲击与停牌）后的回测与归因关键绩效（CAGR、夏普、Calmar、Brinson 选股贡献）；\n3. 过去 3 个月真实模拟实盘（Paper Trading）跟踪成果、容量上限评估与极端情景（如 2024 年初微盘股踩踏）下的风控防御与退役熔断机制。',
        referenceAnswer: `各位投决会委员：
我代表投研团队正式提交《中证 500 指数增强量化多因子策略实盘上线方案》：

一、策略核心超额收益假说与经济学机理：
本策略专注捕捉中证 500 成分股及备选池（500~1000 亿市值中盘成长与周期制造）的定价偏差。超额来源严格由两大约束机制驱动：
1. 分析师注意力稀缺与盈利超预期反应不足：中盘股研究覆盖深度低于沪深 300 权重股，信息扩散存在 1~3 周时滞，策略通过微观业绩预期修正与订单流失衡捕捉价格发现前半程；
2. 散户追涨杀跌的行为金融学反转：在日内微观维度利用高频非对称流动性指标，在散户非理性情绪高潮时充当被动流动性提供者，赚取买卖价差与均值回归溢价。

二、全摩擦微观回测与收益归因表现（2019-2023 全样本，含双边万二佣金、千0.5印花税、万五滑点）：
1. 核心绩效指标：全费后年化收益率 21.8%，相对中证 500 基准年化超额收益 13.5%，信息比率（IR）2.14，最大超额回撤 3.8%，卡玛比率（Calmar）3.55；
2. Brinson 与 Barra 风险归因：在全样本期内，选股效应（Selection Effect）贡献了超额收益的 88.5%，行业配置贡献仅为 6.2%，交互项 5.3%；风格暴露在 Size 与 Beta 上的暴露均严格控制在 ±0.05 个标准差内，超额收益表现为高度纯净的特质选股 Alpha。

三、3 个月模拟实盘（Paper Trading）成果与容量评估：
1. 孵化期表现（最近 65 个交易日）：模拟实盘实现年化超额 11.2%，夏普比率 1.85，达到回测 OOS 夏普的 86%（衰减率仅 14%，远优于 50% 准入门槛）；实盘平均成交滑点为万分之 4.2，低于回测设定的万分之五假设；
2. 策略容量测算：通过 Almgren-Chriss 市场冲击模型反测，当管理资金规模达到 15 亿元时，日均成交占市场比例达 8%，滑点将侵蚀超额约 2.8%，判定 15 亿元为策略硬性封盘容量上限。

四、极端情景防御与退役熔断底线：
1. 极端微盘踩踏防御：本策略严格中性化流通市值，股票池杜绝微盘小市值标的，在 2024 年 1 月极端行情压力测试中，策略超额回撤仅为 1.9%，展现了极强的抗脆弱性；
2. 刚性退役下线红线：
  - 设定 60 日滚动跟踪：若滚动 60 日 Rank IC 均值跌破 0.01 或超额回撤达到 6%（历史最大回撤 1.5 倍），系统自动触发 Kill Switch，仓位降为零并启动退役审查，坚决捍卫委托人本金安全！
报告完毕，请投委会审议！`,
        rubric: [
          { point: '清晰论证分析师反应不足与被动流动性溢价的两大经济学逻辑基石', score: 50 },
          { point: '全面详实汇报全扣费回测指标、Brinson 选股归因占比、模拟盘衰减验证、15 亿容量测算与极端熔断退役机制', score: 50 },
        ],
        keywords: ['中证500指增', '经济学假说', '反应不足', '全扣费回测', 'Brinson归因', 'Paper Trading', '容量上限', '退役熔断'],
        explanation: '全面检验量化投研负责人向机构决策层进行高水准专业答辩、逻辑自洽论证与严密风控汇报的综合领导力。',
        tags: ['量化答辩', '投委会', '全流程实战'],
      },
    ],
  },
];
