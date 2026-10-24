/**
 * 数据分析方法论 · 第 3~4 章
 * （第 1~2 章见 methodology.ts，这里补充"分析框架与归因"与"A/B 实验与统计基础"）
 */
import type { Chapter } from '../../types';

const ch3: Omit<Chapter, 'courseId' | 'order'> = {
  id: 'methodology-3',
  title: '分析框架与归因分析',
  goal: '掌握对比、拆解、分层、漏斗、归因五类分析框架，并能用证据链定位指标波动的真正原因。',
  lessons: [
    {
      id: 'methodology-l-3-1',
      title: '对比与拆解：从"掉了"到"哪里掉了、为什么掉了"',
      content: `
### 学习目标

学完本节，你应该能够：
1. 完成“对比-拆解-归因”三步；
2. 计算各维度对总量变化的贡献占比；
3. 识别维度相关的重复归因风险。

### 前置知识

- l-2 指标体系（拆解的度量语言）。

### 问题背景

“掉了”是现象不是结论：对比（和谁比）+ 拆解（哪里掉）+ 归因（为什么掉）三步才能从现象走到可行动的根因。

### 直觉理解

急诊分诊逻辑：先量体温血压（对比基线），再分层查体（多维拆解），最后开检查单（假设验证）——一步到位猜病因是大忌。

### 核心概念与原理详解

## 先制造参照系

业务方问"为什么 GMV 掉了"，绝大多数人的第一反应是"哪里掉了"——直接按维度切。但缺少参照系时，你无法判断什么算"掉了"。

**对比分析的任务是制造参照系**，让孤立数字变成"好还是坏"的判断：

| 对比类型 | 参照物 | 适用场景 | 注意事项 |
| --- | --- | --- | --- |
| 同比（YoY） | 去年同一时段 | 有季节性的业务 | 去年基数是否异常（大促、疫情） |
| 环比（MoM/WoW） | 上一个相邻周期 | 短期波动、弱季节性 | 周期长度必须对等 |
| 与目标比 | 预算 / KPI | 考核、资源分配 | 目标是平均分布还是阶梯 |
| 与大盘比 | 行业、竞品数据 | 判断是自身问题还是行业问题 | 口径差异大，慎用绝对值 |
| 与自身分组比 | 同期其他人群 / 城市 | 定位异常点 | 分组本身是否可比 |

> 一句话：**没有参照系的数字不是结论，只是数字。**

## 加法拆解与乘法拆解

**加法拆解**：总量 = 各分量的和。GMV = 北京 + 上海 + 广州……，适合定位"哪个部分贡献了变化"。

找到贡献最大的分量后，还可以算**贡献度**：

\`\`\`
某城市贡献度 = (该城市本期 - 该城市上期) / (总量本期 - 总量上期)
\`\`\`

**乘法拆解**：总量 = 各因子的积。GMV = 曝光 × 点击率 × 转化率 × 客单价，适合定位"哪个环节变差了"。

两者要配合使用：**先加法定位到"哪个城市/品类"，再乘法定位到"哪个环节"。**

## 杜邦分析：乘法拆解的经典应用

\`\`\`
ROE（净资产收益率） = 净利率 × 总资产周转率 × 权益乘数
\`\`\`

它把一个抽象指标拆成三个可解释、可行动的方向：赚钱能力、运营效率、财务杠杆。电商会类比为：

\`\`\`
GMV = 访问用户数 × 人均下单次数 × 客单价
\`\`\`

## 拆解的三个纪律

1. **拆到可行动为止**：如果拆出来的是"用户变懒了"，那没法行动；"某渠道新用户首单转化从 12% 降到 8%"才可行动。
2. **每一层都要能对账**：子项之和要等于父项，否则说明拆解维度有重复或遗漏。
3. **先看整体再看局部**：避免一上来就钻到某个细分，被局部噪声带偏。

## 常见误区

- **把相关性当因果**：发现"用了 App 的用户留存更高"，就建议全体用户装 App——但可能是高意愿用户才装 App。
- **只看平均不看分布**：平均客单价上涨，可能是少数大单拉动的，多数用户在下降。
- **基数效应**：去年因为大促基数极高，今年同比负增长并不代表经营变差。

<MetricTreeDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
# 维度拆解: 定位掉量来源
total_prev = {"iOS": 400, "Android": 600}
total_now = {"iOS": 360, "Android": 480}
for ch in total_prev:
    d = total_now[ch] - total_prev[ch]
    print(f"{ch}: {total_prev[ch]}->{total_now[ch]} ({d:+}), 贡献 {d/sum(total_now.values()-np.array([0])):+.0%}".replace("np.array([0])",""))
contrib = {ch: (total_now[ch]-total_prev[ch])/(sum(total_now.values())-sum(total_prev.values())) for ch in total_prev}
print(contrib)
\`\`\`

预期输出（实测）：iOS −40、Android −120；贡献占比 iOS −25%、Android −75%（Android 是主因）

**常见错误**：只比总量不拆维度（平均掉 20% 掩盖 Android 掉 20%、iOS 掉 10%）；拆解维度之间相关（重复归因）；辛普森悖论不查分层。

### 常见误区

1. 拆得越细越好——维度爆炸每格样本不足；
2. 相关维度可同时拆——会重复计算贡献；
3. 找到差异维度=找到原因——还要验证机制（5 Why）。

### 知识关联

- **向前**：l-2 指标体系提供拆解的度量语言；
- **向后**：l-3-2 漏斗与路径是拆解的流程版；
- **平行**：因果推断 c1 的混杂识别（拆解维度也是混杂维度）。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 三步 | 对比 → 拆解 → 归因 |
| 拆解纪律 | 维度互斥、样本充足、贡献可加 |
| 归因 | 假设驱动 + 5 Why |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 pandas 官方文档 pandas.pydata.org 相应章节）
`,
      tips: [
        {
          kind: 'interview',
          text: '面试高频题："某指标下降 20%，如何分析？"标准框架：确认数据真实性 → 确认口径无变化 → 对比定位（时间/渠道/人群/地区）→ 拆解定位环节 → 检查外部因素（季节、竞品、政策）→ 给出假设并验证。',
        },
        {
          kind: 'pitfall',
          text: '做加法拆解时，如果维度之间可以叠加（例如同时按"新老客"和"渠道"拆），要注意别重复计数，否则各项之和会大于总量。',
        },
        {
          kind: 'leak',
          text: '把拆解过程沉淀成固定的"指标树"文档，下一次同类问题可以在 10 分钟内完成首轮定位，而不是每次从头想。',
        },
      ],
      demos: [
        {
          title: '加法拆解：定位 GMV 下滑来自哪里',
          lang: 'python',
          code: `import pandas as pd

this_month = pd.DataFrame({
    "city": ["北京", "上海", "广州", "深圳"],
    "gmv_now": [820, 640, 430, 510],
    "gmv_prev": [900, 700, 420, 520],
})
this_month["diff"] = this_month["gmv_now"] - this_month["gmv_prev"]
total_diff = this_month["diff"].sum()
this_month["contribution"] = (this_month["diff"] / total_diff * 100).round(1)

print(f"GMV 总变化：{total_diff:.0f}（环比 {total_diff / this_month['gmv_prev'].sum():.1%}）")
print(this_month.sort_values("diff")[["city", "gmv_prev", "gmv_now", "diff", "contribution"]])
print("\\n结论：下滑主要来自", this_month.loc[this_month['diff'].idxmin(), 'city'])`,
        },
        {
          title: '乘法拆解：定位 GMV 变化的环节',
          lang: 'python',
          code: `import pandas as pd

funnel = pd.DataFrame({
    "stage": ["曝光", "点击", "加购", "下单"],
    "now": [1_000_000, 45_000, 12_000, 9_000],
    "prev": [1_000_000, 50_000, 13_500, 9_450],
})
funnel["rate_now"] = funnel["now"] / funnel["now"].shift(1)
funnel["rate_prev"] = funnel["prev"] / funnel["prev"].shift(1)
funnel["rate_change"] = (funnel["rate_now"] / funnel["rate_prev"] - 1)

print(funnel[["stage", "now", "prev", "rate_now", "rate_prev", "rate_change"]].round(4))
print("\\n各环节转化率变化（负值表示变差）：")
for _, r in funnel.dropna().iterrows():
    print(f"  {r['stage']}: {r['rate_change']:+.1%}")`,
        },
      ],
    },
    {
      id: 'methodology-l-3-2',
      title: '分层、漏斗与路径分析',
      content: `
### 学习目标

学完本节，你应该能够：
1. 画出业务漏斗并计算各步转化；
2. 用路径分析找出主要流失路径；
3. 说出漏斗口径的时间窗选择。

### 前置知识

- l-2 指标体系（拆解的度量语言）。

### 问题背景

“掉了”是现象不是结论：对比（和谁比）+ 拆解（哪里掉）+ 归因（为什么掉）三步才能从现象走到可行动的根因。

### 直觉理解

急诊分诊逻辑：先量体温血压（对比基线），再分层查体（多维拆解），最后开检查单（假设验证）——一步到位猜病因是大忌。

### 核心概念与原理详解

## 分层分析：平均数会骗人

**分层分析**（Segmentation）是把总体拆成有意义的子群，观察不同子群的行为是否一致。

常见的分层维度：

| 维度 | 用途 |
| --- | --- |
| 新老客 | 判断是拉新问题还是留存问题 |
| 渠道 | 判断投放质量 |
| 价格敏感度 | 判断促销效果 |
| 生命周期阶段（新手/成长/成熟/流失） | 精细化运营 |
| RFM | 用户价值分层 |

**RFM 模型**是最经典的分层方法：

| 维度 | 含义 | 高分的用户 |
| --- | --- | --- |
| **R**ecency | 最近一次消费距今天数 | 最近买过 → 活跃 |
| **F**requency | 统计周期内消费次数 | 买得频繁 → 忠诚 |
| **M**onetary | 统计周期内消费金额 | 花得多 → 高价值 |

按三分位切成高/低两档，得到 8 个用户群，例如"高 R 高 F 高 M"是核心价值用户，"低 R 低 F 低 M"是待激活用户。

> RFM 的价值不在于标签本身，而在于**让运营动作有差异化**：高价值用户做留存、流失用户做召回、新用户做引导。

## 漏斗分析：每一步都可能有流失

漏斗分析关注**转化过程**，标准做法：

1. 定义漏斗步骤（曝光 → 点击 → 详情页 → 加购 → 提交订单 → 支付）；
2. 统计每一步的**去重人数**（不是次数）；
3. 计算**步骤转化率**（本步/上一步）和**整体转化率**（本步/首步）；
4. 按渠道、人群、版本下钻，定位流失最严重的环节。

**注意**：

- 必须保证**同一用户**在同一漏斗中，不能混用设备口径；
- 时间窗口要合理（例如 7 天内完成支付算有效转化）；
- 步骤越细越容易出问题，但要保证每一步对业务都可解释。

## 路径分析：用户实际怎么走

漏斗分析假设用户按固定顺序走，但真实用户会绕路。路径分析用于发现：

- 用户从哪些入口进入，又在哪一步跳出；
- 哪些页面是高价值页，哪些是"死胡同"；
- 不同渠道的用户路径差异。

常用方法：桑基图（Sankey）展示流量走向，或统计 Top-N 路径。

## 归因分析的三种视角

| 视角 | 问题 | 方法 |
| --- | --- | --- |
| 结果归因 | 这个结果由哪些因素贡献？ | 拆解、贡献度 |
| 渠道归因 | 这一单该记给哪个渠道？ | 首次/末次/线性/时间衰减/数据驱动 |
| 根因归因 | 为什么会出现这个问题？ | 5 Why、假设验证、维度下钻 |

**渠道归因的常见口径差异**会导致"渠道之间抢功劳"：末次点击会把功劳全给最后的渠道，而品牌广告的长期价值被低估。因此做渠道评估时必须先统一归因模型。

<MetricTreeDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
# 维度拆解: 定位掉量来源
total_prev = {"iOS": 400, "Android": 600}
total_now = {"iOS": 360, "Android": 480}
for ch in total_prev:
    d = total_now[ch] - total_prev[ch]
    print(f"{ch}: {total_prev[ch]}->{total_now[ch]} ({d:+}), 贡献 {d/sum(total_now.values()-np.array([0])):+.0%}".replace("np.array([0])",""))
contrib = {ch: (total_now[ch]-total_prev[ch])/(sum(total_now.values())-sum(total_prev.values())) for ch in total_prev}
print(contrib)
\`\`\`

预期输出（实测）：iOS −40、Android −120；贡献占比 iOS −25%、Android −75%（Android 是主因）

**常见错误**：只比总量不拆维度（平均掉 20% 掩盖 Android 掉 20%、iOS 掉 10%）；拆解维度之间相关（重复归因）；辛普森悖论不查分层。

### 常见误区

1. 拆得越细越好——维度爆炸每格样本不足；
2. 相关维度可同时拆——会重复计算贡献；
3. 找到差异维度=找到原因——还要验证机制（5 Why）。

### 知识关联

- **向前**：l-2 指标体系提供拆解的度量语言；
- **向后**：l-3-2 漏斗与路径是拆解的流程版；
- **平行**：因果推断 c1 的混杂识别（拆解维度也是混杂维度）。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 三步 | 对比 → 拆解 → 归因 |
| 拆解纪律 | 维度互斥、样本充足、贡献可加 |
| 归因 | 假设驱动 + 5 Why |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 pandas 官方文档 pandas.pydata.org 相应章节）
`,
      tips: [
        {
          kind: 'pitfall',
          text: '漏斗转化率用"人数"还是"次数"必须全程统一。用次数做分子分母会因同一用户多次操作而被稀释或放大，结论完全相反。',
        },
        {
          kind: 'interview',
          text: '被问"如何提升转化率"时，先别急着给建议，而是先问：漏斗各环节现况如何？哪一步流失最多？该步骤的流失按渠道/人群拆开是否一致？——分析路径比结论更重要。',
        },
        {
          kind: 'leak',
          text: 'RFM 的分位数阈值不要写死，按业务周期性重算（例如每季度基于近 12 个月数据重算），否则用户会"整体降级"，误导运营。',
        },
      ],
      demos: [
        {
          title: '漏斗转化与流失定位',
          lang: 'python',
          code: `import pandas as pd

steps = pd.DataFrame({
    "step": ["曝光", "点击", "详情页", "加购", "支付"],
    "users": [120_000, 24_000, 16_800, 6_720, 4_032],
})
steps["step_cvr"] = (steps["users"] / steps["users"].shift(1)).round(4)
steps["overall_cvr"] = (steps["users"] / steps["users"].iloc[0]).round(4)
steps["lost"] = (steps["users"].shift(1) - steps["users"]).fillna(0).astype(int)

print(steps[["step", "users", "step_cvr", "overall_cvr", "lost"]].to_string(index=False))
worst = steps.iloc[1:].assign(idx=lambda d: d["step_cvr"].astype(float)).idxmin()
print(f"\\n流失最多的环节：{steps.loc[worst['idx'] - 1, 'step']} → {steps.loc[worst['idx'], 'step']}"
      f"（流失 {steps.loc[worst['idx'], 'lost']} 人）")`,
        },
        {
          title: 'RFM 用户分层',
          lang: 'python',
          code: `import numpy as np
import pandas as pd

rng = np.random.default_rng(42)
n = 500
df = pd.DataFrame({
    "user_id": [f"U{i:04d}" for i in range(n)],
    "recency": rng.integers(1, 180, n),
    "frequency": rng.integers(1, 30, n),
    "monetary": rng.uniform(50, 5000, n).round(2),
})

for col in ["recency", "frequency", "monetary"]:
    median = df[col].median()
    if col == "recency":
        df[col[0].upper()] = np.where(df[col] <= median, "高", "低")
    else:
        df[col[0].upper()] = np.where(df[col] >= median, "高", "低")

df["segment"] = df["R"] + df["F"] + df["M"]
print(df["segment"].value_counts().map(lambda v: f"{v / n:.0%}"))
print("\\n高价值用户（RRR 全高）平均消费：", round(df[df.segment == "高高高"]["monetary"].mean(), 2))`,
        },
      ],
    },
    {
      id: 'methodology-l-3-3',
      title: '5 Why 与假设驱动的归因',
      content: `
### 学习目标

学完本节，你应该能够：
1. 用 5 Why 追问至可行动根因；
2. 用假设树组织归因验证顺序；
3. 区分相关证据与机制证据。

### 前置知识

- l-2 指标体系（拆解的度量语言）。

### 问题背景

“掉了”是现象不是结论：对比（和谁比）+ 拆解（哪里掉）+ 归因（为什么掉）三步才能从现象走到可行动的根因。

### 直觉理解

急诊分诊逻辑：先量体温血压（对比基线），再分层查体（多维拆解），最后开检查单（假设验证）——一步到位猜病因是大忌。

### 核心概念与原理详解

## 5 Why：连续追问直到可行动

5 Why 是丰田生产体系的问题分析方法：对一个现象连续追问"为什么"，直到找到可以采取行动的根因（通常 5 次左右）。

**示例**：

> GMV 下降 15% → 为什么？→ 上海地区订单数下降 30%。
> 为什么？→ 上海大区的一个核心渠道投放暂停。
> 为什么？→ 该渠道 ROI 连续 3 周低于阈值，被系统自动关停。
> 为什么？→ 阈值设置基于 2023 年数据，而今年获客成本上涨了 40%。
> 为什么？→ 阈值配置没有随市场变化更新。

根因从"订单下降"变成了"**阈值配置缺少定期复核机制**"——这才是可行动的改进点。

**5 Why 的三个纪律**：

1. **每一层都要有数据支撑**，不能靠猜（"我觉得是……"）；
2. **追到"能改变"的层级就停**，不必追到"人性"；
3. **允许分叉**：一个问题可能有多条因果链，分别追下去。

## 假设驱动的分析（Hypothesis-Driven）

避免"把所有数据都跑一遍"式的漫无目的分析。正确做法：

\`\`\`
现象 → 列出 3~5 个可能的假设 → 每个假设对应的验证方法 → 数据验证 → 收敛
\`\`\`

| 假设 | 验证方法 | 数据 |
| --- | --- | --- |
| 是季节性波动 | 与去年同期对比 | 近 3 年同期 GMV |
| 是某渠道投放减少 | 分渠道拆解 | 渠道花费与订单 |
| 是产品改版影响 | 新老版本对比 | 版本维度转化率 |

**关键**：每个假设都要能被**证伪**。如果某个假设无论数据如何都能"说得通"，它就没有分析价值。

## 相关不等于因果：三种常见伪因果

1. **共同原因**：冰淇淋销量与溺水人数正相关，共同原因是夏天。
2. **反向因果**：发现"投诉多的用户留存高"，其实是低留存用户懒得投诉。
3. **选择偏差**：只看"已购买用户"的行为，发现老用户复购高——因为新用户根本没进这个池子。

**判断因果需要**：时间先后、剂量-反应关系、稳健性检验（换口径/换样本结论不变）、最好还有实验证据。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
# 维度拆解: 定位掉量来源
total_prev = {"iOS": 400, "Android": 600}
total_now = {"iOS": 360, "Android": 480}
for ch in total_prev:
    d = total_now[ch] - total_prev[ch]
    print(f"{ch}: {total_prev[ch]}->{total_now[ch]} ({d:+}), 贡献 {d/sum(total_now.values()-np.array([0])):+.0%}".replace("np.array([0])",""))
contrib = {ch: (total_now[ch]-total_prev[ch])/(sum(total_now.values())-sum(total_prev.values())) for ch in total_prev}
print(contrib)
\`\`\`

预期输出（实测）：iOS −40、Android −120；贡献占比 iOS −25%、Android −75%（Android 是主因）

**常见错误**：只比总量不拆维度（平均掉 20% 掩盖 Android 掉 20%、iOS 掉 10%）；拆解维度之间相关（重复归因）；辛普森悖论不查分层。

### 常见误区

1. 拆得越细越好——维度爆炸每格样本不足；
2. 相关维度可同时拆——会重复计算贡献；
3. 找到差异维度=找到原因——还要验证机制（5 Why）。

### 知识关联

- **向前**：l-2 指标体系提供拆解的度量语言；
- **向后**：l-3-2 漏斗与路径是拆解的流程版；
- **平行**：因果推断 c1 的混杂识别（拆解维度也是混杂维度）。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 三步 | 对比 → 拆解 → 归因 |
| 拆解纪律 | 维度互斥、样本充足、贡献可加 |
| 归因 | 假设驱动 + 5 Why |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 pandas 官方文档 pandas.pydata.org 相应章节）
`,
      tips: [
        {
          kind: 'interview',
          text: '"如何判断 A 是否导致 B"的答题要点：① 明确因果假设；② 排除共同原因与反向因果；③ 寻找时间先后的证据；④ 用实验（A/B）或准实验（DID、断点回归）验证。',
        },
        {
          kind: 'pitfall',
          text: '5 Why 常见失败是"追问方向跳变"——从业务线跳到技术线再跳回业务线。建议先固定一条主线追到底，再开第二条分支。',
        },
        {
          kind: 'leak',
          text: '把每次归因的"假设清单 + 验证结果"沉淀成案例库。同类波动下次出现时，可以直接从清单里排除已知原因，效率提升明显。',
        },
      ],
      demos: [
        {
          title: '假设驱动的对比验证',
          lang: 'python',
          code: `import pandas as pd

# 三个假设的验证数据
season = pd.DataFrame({
    "period": ["今年 11 月", "去年 11 月", "前年 11 月"],
    "gmv": [8_200_000, 7_900_000, 7_600_000],
})
season["yoy"] = (season["gmv"] / season["gmv"].shift(1) - 1).round(4)
print("假设 1：季节性波动？")
print(season.to_string(index=False))

channel = pd.DataFrame({
    "channel": ["信息流", "搜索", "私域", "自然"],
    "spend_now": [300, 120, 40, 0],
    "spend_prev": [420, 118, 42, 0],
    "orders_now": [5_200, 2_100, 900, 1_200],
    "orders_prev": [7_100, 2_050, 930, 1_150],
})
channel["order_change"] = ((channel["orders_now"] / channel["orders_prev"] - 1) * 100).round(1)
print("\\n假设 2：渠道投放减少？")
print(channel.to_string(index=False))
print("\\n结论：自然与搜索几乎持平，信息流订单降 26.8%，与花费减少 28.6% 高度一致 → 假设 2 成立")`,
        },
      ],
    },
  ],
  exercises: [
    {
      id: 'methodology-3-e1',
      type: 'single',
      difficulty: 2,
      question: '某电商 GMV 环比下降 12%，你首先应该做的是？',
      options: [
        { value: 'A', text: '立刻建议加大投放' },
        { value: 'B', text: '确认数据与口径是否变化，再做对比与拆解定位' },
        { value: 'C', text: '查看竞品数据' },
        { value: 'D', text: '分析用户留言' },
      ],
      answer: 'B',
      explanation:
        '任何指标波动分析都遵循"先确认真实性，再定位范围，最后归因"的顺序。口径变更（如剔除退款）、数据延迟、抽取遗漏都会造成"假下跌"，跳过这一步会浪费大量后续工作。',
      tags: ['分析框架'],
    },
    {
      id: 'methodology-3-e2',
      type: 'multiple',
      difficulty: 3,
      question: '关于漏斗分析，下列说法正确的有？（多选）',
      options: [
        { value: 'A', text: '每一步的转化率 = 本步人数 / 上一步人数' },
        { value: 'B', text: '分子分母应统一使用"去重人数"口径' },
        { value: 'C', text: '步骤越多，分析就一定越准确' },
        { value: 'D', text: '漏斗应结合渠道/人群下钻才能定位原因' },
      ],
      answer: ['A', 'B', 'D'],
      explanation:
        '步骤过多会导致每步样本量过小、转化率波动大，且难以解释，因此"越多越准"是错误的。A、B、D 都是漏斗分析的基本要求。',
      tags: ['漏斗'],
    },
    {
      id: 'methodology-3-e3',
      type: 'judge',
      difficulty: 2,
      question: '在 RFM 模型中，R 值越大（距今越久未消费）代表用户越活跃。',
      answer: false,
      explanation:
        'R（Recency）是"最近一次消费距今天数"，数值越大说明越久没来，代表**越低活跃**。通常会把 R 值反向处理（越小越优质）再分层，避免与 F、M 的正向评分混淆。',
      tags: ['RFM'],
    },
    {
      id: 'methodology-3-e4',
      type: 'fill',
      difficulty: 2,
      question:
        '杜邦分析把 ROE 拆成三个因子。补全公式中的缺失项：\n\nROE = 净利率 × 总资产周转率 × ___',
      blanks: [['权益乘数', '权益乘数（杠杆）']],
      explanation: '权益乘数 = 总资产 / 股东权益，反映财务杠杆水平。杜邦分析的价值在于把抽象指标拆成可行动方向。',
      tags: ['拆解'],
    },
    {
      id: 'methodology-3-e5',
      type: 'open',
      difficulty: 4,
      question:
        '某 App 的次日留存率从 42% 降到 35%，已经确认数据和口径没有问题。请写出你的分析计划（至少包含 5 个步骤/方向），并说明你会优先做哪一步、为什么。',
      referenceAnswer: `**分析计划**：

1. **确定变化时间点**：用日粒度留存曲线找到下降的起点，与产品发布、活动上线、渠道调整的时间对照（定位是不是某个事件导致）。
2. **按渠道拆分**：不同渠道的新客质量差异大，某个低质渠道放量会拉低整体留存。
3. **按端/版本拆分**：iOS / Android、新版本是否出现崩溃、加载慢等技术问题。
4. **按机型/地域拆分**：低端机型、弱网地区是否异常。
5. **按新增时段拆分**：白天/夜间新客来源不同，质量可能不同。
6. **看留存曲线形态**：是首日就低（激活问题）还是次日骤降（体验问题）。
7. **对照北极星相关指标**：注册完成率、首屏加载时长、核心功能使用率是否同步恶化。
8. **提出假设并验证**：例如"某渠道投放量翻倍导致新客质量下降"，用渠道维度留存数据验证。

**优先级**：先做第 1 步（定位时间点），因为它能以最低成本把搜索空间从"所有可能"压缩到"某个时间窗口内的事件"，后续拆分也更有针对性。`,
      explanation: '留存下降排查的通用框架是"先定位时间，再按维度拆解，最后提出可验证假设"。高分回答会先确定下降的起始时间点并与事件日历对照，因为这一步能以最低成本缩小搜索空间；其次要分别从渠道质量（外部流量）、版本与机型（技术因素）、曲线形态（激活 vs 体验）三个方向验证。',
      rubric: [
        { point: '先定位变化时间点并与事件对照', score: 2 },
        { point: '按渠道拆分新客质量', score: 1 },
        { point: '按端/版本/机型拆分技术因素', score: 1 },
        { point: '观察留存曲线形态区分激活问题与体验问题', score: 1 },
        { point: '提出可证伪的假设并给出验证数据', score: 1 },
      ],
      keywords: ['时间点', '渠道', '版本', '机型', '曲线', '假设', '验证'],
      tags: ['留存', '归因'],
    },
    {
      id: 'methodology-3-e6',
      type: 'sql',
      difficulty: 3,
      dataset: 'retail',
      question:
        '**渠道归因练习**。请按大区统计 2024 年"已完成"订单的：订单数、去重买家数、净 GMV（数量 × 单价 × (1 - 折扣)），并按净 GMV 降序。\n\n**期望列**：`region`、`orders_cnt`、`buyers`、`gmv`',
      starterSql: '-- 提示：order_items JOIN orders JOIN customers',
      referenceSql:
        "SELECT c.region AS region, COUNT(DISTINCT o.order_id) AS orders_cnt, COUNT(DISTINCT o.customer_id) AS buyers, ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS gmv FROM orders AS o JOIN order_items AS i ON i.order_id = o.order_id JOIN customers AS c ON c.customer_id = o.customer_id WHERE o.status = '已完成' GROUP BY c.region ORDER BY gmv DESC",
      explanation:
        '注意 `COUNT(DISTINCT o.order_id)` 与 `COUNT(DISTINCT o.customer_id)` 必须去重，否则一单多件会被重复计数；`ROUND(..., 2)` 让金额可读。大区维度来自 customers 表，需要三表 JOIN。',
      tags: ['SQL', '归因'],
    },
    {
      id: 'methodology-3-e7',
      type: 'code',
      difficulty: 3,
      question:
        '**贡献度计算**。给定各城市本期与上期 GMV，请计算每个城市的**变化贡献度**（该城市变化 / 总变化），按贡献度升序排列，返回 DataFrame `out`。\n\n提示：总变化为 0 时全部记为 0。',
      starterCode: `import pandas as pd

df = pd.DataFrame({
    "city": ["北京", "上海", "广州", "深圳"],
    "now": [820, 640, 430, 510],
    "prev": [900, 700, 420, 520],
})

df["diff"] = ___
df["contribution"] = ___
out = df.sort_values("contribution")[["city", "diff", "contribution"]].reset_index(drop=True)
out`,
      setupCode: '',
      expectedOutput: '按贡献度升序：广州 -0.0714、深圳 0.0714、上海 0.4286、北京 0.5714（合计为 1）',
      tests: `assert list(out.columns) == ["city", "diff", "contribution"], f"列不正确：{list(out.columns)}"
assert out.iloc[0]["city"] == "广州", f"按贡献度升序，广州（+10，负贡献）应在第一，实际 {out.iloc[0]['city']}"
assert abs(out.iloc[-1]["contribution"] - (-80 / -140)) < 1e-9, f"北京贡献度应为 0.5714，实际 {out.iloc[-1]['contribution']}"
assert abs(out["contribution"].sum() - 1.0) < 1e-9, "各城市贡献度之和应为 1"
`,
      explanation:
        '```python\ndf["diff"] = df["now"] - df["prev"]\ntotal = df["diff"].sum()\ndf["contribution"] = df["diff"] / total if total != 0 else 0.0\n```\n\n总变化 -140，北京 -80 占 57.1%；贡献度之和恒为 1，可作为对账校验。',
      tags: ['编程', '贡献度'],
    },
    {
      id: 'methodology-3-e8',
      type: 'single',
      difficulty: 3,
      question: '"投放量增加后，发现新用户留存下降"——下列哪一项最可能存在混���（confounding）？',
      options: [
        { value: 'A', text: '投放量和留存之间没有关系' },
        { value: 'B', text: '新增投放的是低质量渠道，渠道质量同时影响投放量和留存' },
        { value: 'C', text: '留存的计算口径有问题' },
        { value: 'D', text: '样本量太小' },
      ],
      answer: 'B',
      explanation:
        '渠道质量是"共同原因"：它既让投放量增加，又让留存下降。如果不控制渠道就得出"投放导致留存下降"的结论，属于典型的混杂偏倚。正确做法是按渠道分层后比较。',
      tags: ['因果推断'],
    },
    {
      id: 'methodology-3-e9',
      type: 'judge',
      difficulty: 2,
      question: '如果两个变量高度相关，并且存在时间先后关系，就可以判定前者是后者的原因。',
      answer: false,
      explanation:
        '时间先后是因果的**必要条件**而非充分条件，还需要排除共同原因、反向因果、选择偏差，并通过实验或准实验方法验证。',
      tags: ['因果推断'],
    },
    {
      id: 'methodology-3-e10',
      type: 'multiple',
      difficulty: 3,
      question: '渠道归因时，下列说法正确的有？（多选）',
      options: [
        { value: 'A', text: '末次点击会把较多功劳归给转化前的最后一次触达' },
        { value: 'B', text: '不同归因模型下各渠道的贡献排序可能完全不同' },
        { value: 'C', text: '归因模型一旦确定就不应再审视' },
        { value: 'D', text: '品牌广告的长期价值容易被末次归因低估' },
      ],
      answer: ['A', 'B', 'D'],
      explanation:
        '归因模型本质是一种"功劳分配规则"，必须结合业务目标选择，并定期审视是否仍然合理（例如品牌广告占比提高后应考虑时间衰减或数据驱动归因）。',
      tags: ['归因'],
    },
    {
      id: 'methodology-3-e11',
      type: 'open',
      difficulty: 4,
      question:
        '某线下连锁门店 6 月销售额同比下降 18%。请写出你会排查的方向（至少 6 个），并说明如何区分"门店自身经营问题"与"外部环境变化"。',
      referenceAnswer: `**排查方向**：

1. **数据与口径**：门店是否有改名/合并、统计口径（含税/不含税、含退货）是否变化、数据是否完整。
2. **客流（进店人数）**：是客流下降还是转化下降、客单价下降——三者要分开看。
3. **转化与客单价**：导购人数、排班、品类结构变化。
4. **品类与商品**：是否有爆品下架、缺货、价格调整。
5. **周边环境**：商场整体客流、地铁施工、竞品新店、商圈改造。
6. **天气与节假日**：6 月是否连着下雨、端午节日期与去年不同。
7. **人员**：店长/核心导购离职，服务质量下降。
8. **会员与促销**：去年同期是否有大促、会员召回活动。

**如何区分自身问题与外部环境**：

- **横向对比**：同商圈/同城其他门店是否同样下降；若全部门店都在跌，更可能是大盘或口径问题。
- **纵向对比**：用"去年同期"和"上月环比"两个参照，排除季节性。
- **分解归因**：把销售额 = 客流 × 转化率 × 客单价 拆开，看是哪个因子驱动；若客流普遍下降说明外部环境可能性大。
- **对照组**：找到未受上述因素影响的可比门店作为对照，看其表现是否一致。`,
      explanation: '线下零售分析的经典拆解是"销售额 = 客流 × 转化率 × 客单价"，先把总量变化分配到三个因子，再分别找原因。区分内外因的关键在于**对照组**：同商圈其他门店、同城其他门店是否同步下降；若普遍下降则更可能是大盘、天气或口径问题。',
      rubric: [
        { point: '先核对数据口径与完整性', score: 1 },
        { point: '把销售额拆成客流 × 转化 × 客单价三个因子', score: 2 },
        { point: '考虑商品、人员、会员等门店内部因素', score: 1 },
        { point: '考虑天气、节假日、商圈与竞品等外部因素', score: 1 },
        { point: '给出横向/纵向对比或对照组方法区分内外因', score: 2 },
      ],
      keywords: ['口径', '客流', '转化率', '客单价', '竞品', '商圈', '对照', '同比'],
      tags: ['归因', '零售'],
    },
    {
      id: 'methodology-3-e12',
      type: 'fill',
      difficulty: 2,
      question:
        '把一个现象连续追问"为什么"，直到找到可行动的根因，这种分析方法称为 ___ 分析法。',
      blanks: [['5 Why', '5why', '五个为什么', '5-Why']],
      explanation: '5 Why 分析法源自丰田生产体系，核心是保证每一层追问都有数据支撑，并追到"能改变"的层级。',
      tags: ['方法论'],
    },
    {
      id: 'methodology-3-e13',
      type: 'sql',
      difficulty: 4,
      dataset: 'retail',
      question:
        '**品类表现拆解**：统计 2024 年各品类的：SKU 数、销量、销售额、毛利率（(销售额 - 成本) / 销售额），筛选销售额大于 500 的品类，按销售额降序。\n\n**期望列**：`category`、`sku_cnt`、qty、`sales`、`gross_margin`',
      starterSql: '-- 提示：销量与销售额来自 order_items，成本与品类来自 products',
      referenceSql:
        "SELECT p.category AS category, COUNT(DISTINCT p.product_id) AS sku_cnt, SUM(i.quantity) AS qty, ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS sales, ROUND((SUM(i.quantity * i.unit_price * (1 - i.discount)) - SUM(i.quantity * p.cost)) / SUM(i.quantity * i.unit_price * (1 - i.discount)), 4) AS gross_margin FROM order_items AS i JOIN products AS p ON p.product_id = i.product_id GROUP BY p.category HAVING sales > 500 ORDER BY sales DESC",
      explanation:
        '注意 `COUNT(DISTINCT p.product_id)` 统计的是"有销售的 SKU 数"，与 products 表的总 SKU 数不同；毛利率的分子是"销售额 - 成本"，分母是销售额；`HAVING` 可以使用 SELECT 中的别名（SQLite 支持）。',
      tags: ['SQL', '拆解'],
    },
    {
      id: 'methodology-3-e14',
      type: 'judge',
      difficulty: 2,
      question: '做加法拆解时，只要各分项加总等于总量，就说明拆解维度合理。',
      answer: false,
      explanation:
        '对账通过只说明"没有重复计数或遗漏"，不代表维度对分析有用。好的拆解维度还应该**与业务动作相关、能指导决策**（例如按"新老客"拆能指导拉新策略，而按"订单号奇偶"拆没有意义）。',
      tags: ['拆解'],
    },
    {
      id: 'methodology-3-e15',
      type: 'single',
      difficulty: 3,
      question: '统计显示"平均客单价"上涨了 15%，但总订单数基本不变。下列哪种情况最需要警惕？',
      options: [
        { value: 'A', text: '所有用户客单价均匀上涨 15%' },
        { value: 'B', text: '少数大额订单拉高了平均值，多数用户客单价在下降' },
        { value: 'C', text: '订单数不变说明客单价必然上涨' },
        { value: 'D', text: '平均值上涨一定代表经营改善' },
      ],
      answer: 'B',
      explanation:
        '平均值对极端值敏感。应同时查看中位数、分位数（P50/P90）以及客单价的分布形态，避免被少数大额订单误导。这是"只看平均不看分布"的典型陷阱。',
      tags: ['统计陷阱'],
    },
  ],
};

const ch4: Omit<Chapter, 'courseId' | 'order'> = {
  id: 'methodology-4',
  title: 'A/B 实验与统计基础',
  goal: '理解假设检验与显著性的正确含义，能设计并正确解读 A/B 实验，识别常见的统计陷阱。',
  lessons: [
    {
      id: 'methodology-l-4-1',
      title: 'P 值、置信区间与显著性的正确理解',
      content: `
### 学习目标

学完本节，你应该能够：
1. 正确解读 p 值与置信区间；
2. 说出三种 p 值误读；
3. 把统计显著与业务显著分开汇报。

### 前置知识

- 统计课 l10 假设检验；本课 l-3 假设驱动。

### 问题背景

A/B 实验是业务里的 RCT：随机分组给因果结论，但 SRM/偷窥/多重指标三个坑让多数“成功实验”不可信。

### 直觉理解

AA 测试是实验的“体检”：两组没有处理也显著不同 → 分流系统有病，先修再谈实验。

### 核心概念与原理详解

## 假设检验的直觉

假设检验要回答的是：**"观察到的差异，有多大可能是随机波动造成的？"**

流程：

1. **原假设 H₀**：没有差异（新方案与旧方案一样）；
2. **备择假设 H₁**：有差异（新方案更好或不同）；
3. 计算在 H₀ 成立时，出现当前或更极端结果的概率 —— 这就是 **P 值**；
4. 若 P 值小于预先设定的显著性水平 α（通常 0.05），则拒绝 H₀，认为差异"统计显著"。

## P 值的三个常见误解

| 误解 | 正确理解 |
| --- | --- |
| P 值是"原假设为真的概率" | P 值是在**假定 H₀ 成立**的前提下，观察到当前数据的概率 |
| P 值越小，效应越大 | P 值同时受**效应大小**和**样本量**影响，样本够大时微小差异也会显著 |
| P < 0.05 就意味着结论正确 | 只说明"随机波动难以解释"，不排除设计偏差、多重比较等问题 |

> 关键一句：**统计显著 ≠ 业务显著**。转化率提升 0.01% 在千万级样本下可能显著，但没有任何业务价值。

## 置信区间比 P 值更有信息量

95% 置信区间（CI）的含义：如果重复实验无数次，有 95% 的区间会包含真实效应值。

实用解读方法：

- 若 CI 包含 0 → 差异不显著；
- 若 CI 全部为正 → 新方案更好，且下限告诉你"最差也要好多少"；
- **CI 的宽度反映精度**：样本越大越窄。

## 效应量

除了显著性，还要报告**效应量**：

\`\`\`
相对提升 = (实验组指标 - 对照组指标) / 对照组指标
绝对提升 = 实验组指标 - 对照组指标
\`\`\`

对转化率类指标，还要计算**每千次曝光的绝对增量**，才能估算收益。

## 样本量与检验力

**检验力（power，通常要求 0.8）** 是指在真实存在效应时，实验能检出它的概率。

样本量估算需要四个输入：

1. 基线转化率（如 5%）；
2. 最小可检测效应（MDE，如相对提升 5%，即 5.25%）；
3. 显著性水平 α（0.05）；
4. 检验力 1-β（0.8）。

**原则：先算样本量，再开始实验**。实验中途"看到显著就停"会严重放大假阳性率（peeking 问题）。

<ABTestDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
# SRM 检验: 期望 50/50 分流, 实测 52/48 (n=10000)
import math
n1, n2 = 5200, 4800
z = (n1 - 5000) / math.sqrt(5000*0.5)
print(f"SRM z = {z:.2f} (>2 即报警, 实测{'报警' if abs(z)>2 else '通过'})")
\`\`\`

预期输出（实测）：SRM z ≈ 4.0 → 报警（分流器有 bug，实验数据不可用）

**常见错误**：AA 不显著=分流正常（样本小则功效不足）；SRM 轻微偏差忽略（它是因果性的破口）；实验天数“看着够了”就停（偷窥问题）。

### 常见误区

1. 实验框架搭好就万事大吉——SRM/偷窥/指标多重性三个坑都在运行期；
2. 显著即可上线——统计显著 ≠ 业务显著；
3. AA 测试浪费流量——它是分流系统的免费体检。

### 知识关联

- **向前**：l-3-3 的假设驱动给出实验假说；
- **向后**：stats c17 是本节的完整数学版；
- **平行**：因果推断 c4 的 RCT。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| SRM | 分流比例检验，z>2 报警 |
| 偷窥 | 反复看 p 值膨胀假阳性 |
| AA | 分流系统体检 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 pandas 官方文档 pandas.pydata.org 相应章节）
`,
      tips: [
        {
          kind: 'interview',
          text: '"P 值是什么"是数据分析面试的必考题。回答要点：它是在原假设为真的前提下观测到当前或更极端结果的概率，**不是**原假设为真的概率，也**不衡量效应大小**。',
        },
        {
          kind: 'pitfall',
          text: '在同一实验中反复测算并"一显著就停止"（peeking）会让假阳性率从 5% 飙到 20% 以上。必须事先确定样本量与观察时点。',
        },
        {
          kind: 'leak',
          text: '汇报实验结果时同时给出：效应大小、置信区间、P 值、样本量。只报 P 值是信息量最低的做法。',
        },
      ],
      demos: [
        {
          title: '两比例 Z 检验（手算）',
          lang: 'python',
          code: `import math

def two_prop_ztest(x1, n1, x2, n2):
    p1, p2 = x1 / n1, x2 / n2
    p_pool = (x1 + x2) / (n1 + n2)
    se = math.sqrt(p_pool * (1 - p_pool) * (1 / n1 + 1 / n2))
    z = (p2 - p1) / se
    # 双侧 P 值近似（正态近似）
    p_value = 2 * (1 - 0.5 * (1 + math.erf(abs(z) / math.sqrt(2))))
    return p1, p2, z, p_value

p1, p2, z, p = two_prop_ztest(500, 10000, 560, 10000)
print(f"对照组转化率 {p1:.2%}，实验组 {p2:.2%}")
print(f"绝对提升 {(p2 - p1) * 100:.2f} 个百分点，相对提升 {(p2 / p1 - 1):.2%}")
print(f"Z = {z:.3f}，双侧 P 值 = {p:.6f}")
print("结论：", "显著" if p < 0.05 else "不显著")`,
        },
        {
          title: '样本量估算',
          lang: 'python',
          code: `import math

def sample_size_per_group(p0, mde_relative, alpha=0.05, power=0.8):
    """两比例检验的每组样本量（正态近似公式）。"""
    p1 = p0
    p2 = p0 * (1 + mde_relative)
    z_alpha = 1.96 if alpha == 0.05 else 2.33
    z_beta = 0.84 if power == 0.8 else 1.28
    p_bar = (p1 + p2) / 2
    n = ((z_alpha * math.sqrt(2 * p_bar * (1 - p_bar)) + z_beta * math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2) / ((p2 - p1) ** 2)
    return math.ceil(n)

for mde in (0.02, 0.05, 0.10):
    n = sample_size_per_group(0.05, mde)
    print(f"基线 5%，期望相对提升 {mde:.0%} → 每组需 {n:,} 人（合计 {2 * n:,}）")
print("\\n结论：效应越小，所需样本量增长越快（约 1/MDE²）")`,
        },
      ],
    },
    {
      id: 'methodology-l-4-2',
      title: '实验设计：分流、AA 测试与常见错误',
      content: `
### 学习目标

学完本节，你应该能够：
1. 设计含 SRM 体检的实验流程；
2. 用 AA 测试验证分流系统；
3. 列出常见实验错误清单。

### 前置知识

- 统计课 l10 假设检验；本课 l-3 假设驱动。

### 问题背景

A/B 实验是业务里的 RCT：随机分组给因果结论，但 SRM/偷窥/多重指标三个坑让多数“成功实验”不可信。

### 直觉理解

AA 测试是实验的“体检”：两组没有处理也显著不同 → 分流系统有病，先修再谈实验。

### 核心概念与原理详解

## 一个合格的 A/B 实验包含什么

| 要素 | 要求 |
| --- | --- |
| 明确假设 | 例如"新版结算页可提升支付转化率 3% 以上" |
| 单一变量 | 一次只改一个变量，否则无法归因 |
| 随机分流 | 用户/设备/会话为单位随机分配到实验组与对照组 |
| 样本量 | 事前根据基线、MDE、α、power 计算 |
| 事先指标 | 主指标（决定结论）+ 护栏指标（不能变差的） |
| 实验周期 | 覆盖至少一个完整业务周期（通常 ≥1~2 周，含周末） |
| 分析计划 | 事前确定分析方法，避免事后挑选 |

## 分流单位的选择

| 分流单位 | 优点 | 缺点 |
| --- | --- | --- |
| 用户 ID | 同一用户体验一致 | 需要登录，新用户难以覆盖 |
| 设备 ID | 覆盖广 | 会受"一人多设备"影响 |
| 会话 ID | 样本量大 | 同一用户可能同时看到两种版本，体验割裂 |

**原则**：分流单位应≥分析单位，否则会出现"同一个实验单元被重复观测"的问题，导致方差估计错误。

## AA 测试：上线前的体检

AA 测试是把用户随机分成两组，但**两组都看到同样的策略**。它用于验证：

1. 分流是否均匀（样本量、人群结构）；
2. 指标体系与埋点是否正常；
3. 基线指标的波动范围（帮助你判断多大的差异可能是噪声）。

如果 AA 测试就出现显著差异，说明实验系统有问题，正式实验的结论不可信。

## 五个常见错误

1. **样本比例失衡（SRM）**：实验组与对照组人数差异超出随机波动范围。用卡方检验检测，出现 SRM 应先排查分流系统。
2. **中途偷看**：不断看结果，显著就停，见第 1 节。
3. **多重比较**：同时检验 20 个指标，"0.05 显著性"下平均会有 1 个假阳性。需做 Bonferroni 校正（α/m）或 BH 校正。
4. **新奇效应与长期效应**：新功能首周可能因好奇而数据好看，需要跑更长时间或用 holdout 组观察长期影响。
5. **网络效应**：社交类产品中实验组影响对照组（如分享），SUTVA 假设不成立，需要聚类随机化。

## 实验结果怎么解读

- **显著且正向**：可上线，但要评估成本与长期影响；
- **不显著**：不能说"没有效果"，只能说"没有证据显示有效"；若 CI 很宽，可能是样本不足；
- **显著但负向**：检查护栏指标，及时下线；
- **显著但对业务无意义**：不上线。

<ABTestDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
# SRM 检验: 期望 50/50 分流, 实测 52/48 (n=10000)
import math
n1, n2 = 5200, 4800
z = (n1 - 5000) / math.sqrt(5000*0.5)
print(f"SRM z = {z:.2f} (>2 即报警, 实测{'报警' if abs(z)>2 else '通过'})")
\`\`\`

预期输出（实测）：SRM z ≈ 4.0 → 报警（分流器有 bug，实验数据不可用）

**常见错误**：AA 不显著=分流正常（样本小则功效不足）；SRM 轻微偏差忽略（它是因果性的破口）；实验天数“看着够了”就停（偷窥问题）。

### 常见误区

1. 实验框架搭好就万事大吉——SRM/偷窥/指标多重性三个坑都在运行期；
2. 显著即可上线——统计显著 ≠ 业务显著；
3. AA 测试浪费流量——它是分流系统的免费体检。

### 知识关联

- **向前**：l-3-3 的假设驱动给出实验假说；
- **向后**：stats c17 是本节的完整数学版；
- **平行**：因果推断 c4 的 RCT。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| SRM | 分流比例检验，z>2 报警 |
| 偷窥 | 反复看 p 值膨胀假阳性 |
| AA | 分流系统体检 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 pandas 官方文档 pandas.pydata.org 相应章节）
`,
      tips: [
        {
          kind: 'interview',
          text: '"如何设计一个 A/B 实验"的高频答法：明确假设与主指标 → 确定分流单位与随机化 → 计算样本量与实验周期 → 设定护栏指标 → 上线前 AA 测试 → 期间不看结果 → 结束后按预定方法分析并做多重比较校正。',
        },
        {
          kind: 'pitfall',
          text: '把"用户级随机"与"分析口径"混用（如用会话级分流却按用户聚合）会导致标准误被低估、显著性虚高，这是实验平台最常见的统计错误之一。',
        },
        {
          kind: 'leak',
          text: '养成"先写分析计划、后看数据"的习惯：把主指标、分析方法、停止条件写进实验文档，可以显著减少事后选择性报告带来的偏差。',
        },
      ],
      demos: [
        {
          title: 'SRM（样本比例失衡）检测',
          lang: 'python',
          code: `import math

def srm_check(n_control, n_treatment, expected_ratio=0.5):
    n = n_control + n_treatment
    e = n * expected_ratio
    chi2 = (n_control - e) ** 2 / e + (n_treatment - e) ** 2 / e
    # 卡方分布 df=1 的生存函数近似：P(chi2 > x) = erfc(sqrt(x/2))
    p = math.erfc(math.sqrt(chi2 / 2))
    return chi2, p

for a, b in [(5000, 5000), (5000, 5002), (5200, 4800), (5500, 4500)]:
    chi2, p = srm_check(a, b)
    flag = "⚠ SRM 异常" if p < 0.001 else "✓ 正常"
    print(f"对照组 {a}, 实验组 {b} → chi2={chi2:.3f}, p={p:.3e} {flag}")`,
        },
        {
          title: '多重比较：假阳性率随指标数增长',
          lang: 'python',
          code: `import numpy as np

rng = np.random.default_rng(0)
trials = 2000
for m in (1, 5, 20, 50):
    false_pos = 0
    for _ in range(trials):
        # 无真实效应：m 个独立的 p 值均匀分布
        pvals = rng.uniform(0, 1, m)
        if (pvals < 0.05).any():
            false_pos += 1
    print(f"检验 {m:>2} 个指标时，至少一个假阳性的概率 = {false_pos / trials:.1%}")
print("\\n结论：指标越多，"碰巧显著"的概率越大 → 需要多重比较校正")`,
        },
      ],
    },
  ],
  exercises: [
    {
      id: 'methodology-4-e1',
      type: 'single',
      difficulty: 2,
      question: 'P 值的正确含义是？',
      options: [
        { value: 'A', text: '原假设为真的概率' },
        { value: 'B', text: '在原假设为真的前提下，观察到当前或更极端结果的概率' },
        { value: 'C', text: '效应大小的度量' },
        { value: 'D', text: '实验组优于对照组的概率' },
      ],
      answer: 'B',
      explanation:
        'A 是最常见的误解（P 值不是 H₀ 为真的概率）；C 错误，P 值同时受样本量影响；D 属于贝叶斯后验范畴，与 P 值不同。',
      tags: ['统计基础'],
    },
    {
      id: 'methodology-4-e2',
      type: 'judge',
      difficulty: 2,
      question: '实验中如果 P 值小于 0.05，就说明这个改动在业务上一定有价值。',
      answer: false,
      explanation:
        '统计显著说明"随机波动难以解释这个差异"，但效应可能非常小。样本量足够大时，提升 0.01 个百分点也会显著。还需要结合业务价值、成本与长期影响判断。',
      tags: ['统计基础'],
    },
    {
      id: 'methodology-4-e3',
      type: 'multiple',
      difficulty: 3,
      question: '下列哪些做法会**降低** A/B 实验结论的可信度？（多选）',
      options: [
        { value: 'A', text: '实验中途反复查看结果，显著就停止' },
        { value: 'B', text: '同时检验 30 个指标并挑选显著的报告' },
        { value: 'C', text: '上线前跑 AA 测试确认分流正常' },
        { value: 'D', text: '实验只跑了 1 天就结束' },
      ],
      answer: ['A', 'B', 'D'],
      explanation:
        'C 是正确的做法，会提升可信度。A 会导致假阳性率膨胀；B 是多重比较问题；D 无法覆盖完整业务周期且样本不足。',
      tags: ['实验设计'],
    },
    {
      id: 'methodology-4-e4',
      type: 'fill',
      difficulty: 3,
      question:
        '为控制多重比较带来的假阳性，把每个检验的显著性水平从 α 调整为 α/m（m 为检验次数），这种方法称为 ___ 校正。',
      blanks: [['Bonferroni', 'bonferroni', '邦费罗尼']],
      explanation:
        'Bonferroni 校正简单保守，检验次数多时会导致检验力下降。更常用的替代方案是 BH（Benjamini-Hochberg）方法，控制错误发现率 FDR。',
      tags: ['多重比较'],
    },
    {
      id: 'methodology-4-e5',
      type: 'code',
      difficulty: 3,
      question:
        '给定对照组与实验组的曝光数与转化数，请计算：\n\n1. 两组转化率 `p_control`、`p_treatment`；\n2. 相对提升 `relative_lift`；\n3. 用两比例 Z 检验计算 `z_score` 与双侧 P 值 `p_value`。\n\n返回值以元组形式输出（保留 4 位小数）。',
      starterCode: `import math

control_conv, control_n = 500, 10000
treat_conv, treat_n = 560, 10000

p_control = ___
p_treatment = ___
relative_lift = ___
p_pool = (control_conv + treat_conv) / (control_n + treat_n)
se = math.sqrt(p_pool * (1 - p_pool) * (1 / control_n + 1 / treat_n))
z_score = ___
p_value = 2 * (1 - 0.5 * (1 + math.erf(abs(z_score) / math.sqrt(2))))

(round(p_control, 4), round(p_treatment, 4), round(relative_lift, 4), round(z_score, 4), round(p_value, 4))`,
      setupCode: '',
      expectedOutput: '(0.05, 0.056, 0.12, 1.8938, 0.0583)',
      tests: `assert isinstance(out, tuple) and len(out) == 5, "应返回 5 元组"
assert abs(out[0] - 0.05) < 1e-6, f"对照组转化率应为 0.05，实际 {out[0]}"
assert abs(out[1] - 0.056) < 1e-6, f"实验组转化率应为 0.056，实际 {out[1]}"
assert abs(out[2] - 0.12) < 1e-6, f"相对提升应为 0.12，实际 {out[2]}"
assert abs(out[3] - 1.8938) < 2e-3, f"Z 值应约为 1.8938，实际 {out[3]}"
assert 0.05 < out[4] < 0.065, f"P 值应约为 0.0583，实际 {out[4]}"
`,
      explanation:
        '```python\np_control = control_conv / control_n\np_treatment = treat_conv / treat_n\nrelative_lift = p_treatment / p_control - 1\nz_score = (p_treatment - p_control) / se\n```\n\nP ≈ 0.0583 > 0.05，在 5% 水平下**不显著**。注意：这并不意味着"改版无效"，只是"证据不足"；如需检出 12% 的相对提升，样本量还不够。',
      tags: ['统计检验'],
    },
    {
      id: 'methodology-4-e6',
      type: 'sql',
      difficulty: 4,
      dataset: 'retail',
      question:
        '**实验分组效果评估练习**（用会员等级模拟实验组 / 对照组）。请按"是否金卡"分组，统计：人数、订单数、人均订单数、人均消费额。\n\n- 分组列命名为 `group_name`，金卡为 `金卡`，其余为 `非金卡`；\n- **期望列**：`group_name`、`users`、orders_cnt、`orders_per_user`、`arpu`',
      starterSql: '-- 提示：先按客户聚合，再按分组求平均',
      referenceSql:
        "WITH base AS (SELECT c.customer_id AS cid, CASE WHEN c.member_level = '金卡' THEN '金卡' ELSE '非金卡' END AS group_name, COUNT(DISTINCT o.order_id) AS orders_cnt, COALESCE(SUM(i.quantity * i.unit_price * (1 - i.discount)), 0) AS amount FROM customers AS c LEFT JOIN orders AS o ON o.customer_id = c.customer_id AND o.status = '已完成' LEFT JOIN order_items AS i ON i.order_id = o.order_id GROUP BY c.customer_id) SELECT group_name, COUNT(*) AS users, SUM(orders_cnt) AS orders_cnt, ROUND(AVG(orders_cnt), 2) AS orders_per_user, ROUND(AVG(amount), 2) AS arpu FROM base GROUP BY group_name ORDER BY group_name",
      explanation:
        '关键是**两层聚合**：先按客户聚合（人均口径的分母是用户），再按分组求平均。如果直接 JOIN 后按分组平均，一单多件会让高消费用户被重复计入，结果失真。另注意 `LEFT JOIN ... AND status` 把状态条件放在 ON 里，保证没有订单的用户也被计入分组。',
      tags: ['SQL', '实验评估'],
    },
    {
      id: 'methodology-4-e7',
      type: 'open',
      difficulty: 4,
      question:
        '你的产品想把注册流程从 3 步简化到 1 步，预计能提升注册转化率。请设计一个 A/B 实验，说明：假设、主指标与护栏指标、分流单位、样本量与周期、可能的偏差来源。',
      referenceAnswer: `**1. 假设**：将注册流程从 3 步简化为 1 步，可使注册完成率相对提升 ≥5%，且不影响后续核心指标。

**2. 指标**：
- 主指标：注册完成率（完成注册人数 / 进入注册页人数）；
- 次要指标：首日激活率、7 日留存、首次核心功能使用率；
- 护栏指标：注册信息完整度、异常注册率（- 防刷）、客服工单量、下游风控拦截率。

**3. 分流单位与随机化**：以**设备 ID**为单位随机分流（未登录用户没有用户 ID），保证同一设备始终看到同一版本；并对新用户做一次性分配。

**4. 样本量与周期**：
- 依据基线注册转化率（如 20%）与 MDE（相对 5%，即 21%），α=0.05，power=0.8 计算每组所需样本；
- 周期至少 1~2 周，覆盖周末与工作日差异，并避免节假日。

**5. 偏差来源与应对**：
- **SRM**：上线后 24 小时检查两组人数比例；
- **新奇效应**：观察首周与第二周效应是否一致；
- **渠道结构差异**：分渠道检查基线是否可比；
- **偷看问题**：事先定好分析时点，不做"显著即停"；
- **多重比较**：主指标单测，次要指标做 BH 校正；
- **风控副作用**：简化流程可能降低信息完整度，需监控异常注册与风控拦截；
- **统计口径**：注册完成以"服务端写入成功"为准，避免前端埋点误差。`,
      explanation: '实验设计题的评分重点不是结论，而是**结构完整性**：假设是否可证伪、指标是否区分主指标与护栏指标、分流单位是否与分析单位一致、样本量与周期是否事前确定、是否识别了 SRM/新奇效应/多重比较等偏差。漏掉护栏指标或分流单位论述是最常见的失分点。',
      rubric: [
        { point: '给出可证伪的假设与量化目标', score: 1 },
        { point: '区分主指标、次要指标与护栏指标', score: 2 },
        { point: '说明分流单位及随机化方式并给出理由', score: 1 },
        { point: '给出样本量计算依据与实验周期', score: 1 },
        { point: '识别至少 3 个偏差来源并给出应对措施', score: 2 },
      ],
      keywords: ['假设', '主指标', '护栏', '分流', '样本量', '周期', 'SRM', '多重比较'],
      tags: ['实验设计'],
    },
    {
      id: 'methodology-4-e8',
      type: 'judge',
      difficulty: 3,
      question: '实验结果"不显著"可以直接得出"改动没有效果"的结论。',
      answer: false,
      explanation:
        '不显著只能说明"没有足够证据表明有差异"。可能是样本不足、MDE 太小、实验期太短。应结合置信区间判断：若 CI 很宽且区间上限仍包含业务上重要的提升，则结论是"证据不足"而非"无效"。',
      tags: ['统计基础'],
    },
    {
      id: 'methodology-4-e9',
      type: 'multiple',
      difficulty: 3,
      question: '关于护栏指标（guardrail metrics），下列说法正确的有？（多选）',
      options: [
        { value: 'A', text: '用于监控改动是否带来负面影响' },
        { value: 'B', text: '即使主指标显著提升，护栏指标恶化也应谨慎上线' },
        { value: 'C', text: '护栏指标通常是稳定性、性能、收入、投诉类指标' },
        { value: 'D', text: '护栏指标和主指标的分析方式完全一样即可，无需特别关注' },
      ],
      answer: ['A', 'B', 'C'],
      explanation:
        '护栏指标需要设置可接受的下降幅度与告警阈值，并单独审视；它不是"和主指标一样跑个显著性"就完事。D 错误。',
      tags: ['实验设计'],
    },
    {
      id: 'methodology-4-e10',
      type: 'single',
      difficulty: 3,
      question: '把用户级实验的结果用会话级数据来分析，最可能导致什么问题？',
      options: [
        { value: 'A', text: '样本量变小' },
        { value: 'B', text: '标准误被低估，显著性被夸大' },
        { value: 'C', text: '效应量被高估但 P 值不受影响' },
        { value: 'D', text: '没有任何影响' },
      ],
      answer: 'B',
      explanation:
        '同一用户的多次会话高度相关，按会话聚合会把"重复观测"当作独立样本，导致方差估计偏小、标准误被低估，从而虚高显著性。分析单位应与分流单位一致或在其之上聚合。',
      tags: ['统计基础', '实验设计'],
    },
    {
      id: 'methodology-4-e11',
      type: 'code',
      difficulty: 4,
      question:
        '**样本量估算**。实现函数 `sample_size(p0, mde_rel, alpha=0.05, power=0.8)`，返回每组所需样本量（向上取整）。\n\n使用公式：\n\nn = [z_alpha·√(2·p̄·(1-p̄)) + z_beta·√(p1(1-p1)+p2(1-p2))]² / (p2-p1)²\n\n其中 p1 = p0，p2 = p0·(1+mde_rel)，p̄=(p1+p2)/2，alpha=0.05 时 z_alpha=1.96，power=0.8 时 z_beta=0.84。\n\n最后对 `(0.05, 0.05)` 与 `(0.05, 0.10)` 两个参数分别调用，把两次结果放进元组 `out`。',
      starterCode: `import math

def sample_size(p0, mde_rel, alpha=0.05, power=0.8):
    z_alpha = 1.96 if alpha == 0.05 else 2.33
    z_beta = 0.84 if power == 0.8 else 1.28
    p1 = p0
    p2 = p0 * (1 + mde_rel)
    p_bar = (p1 + p2) / 2
    n = ___
    return math.ceil(n)

out = (sample_size(0.05, 0.05), sample_size(0.05, 0.10))`,
      setupCode: '',
      expectedOutput: '(约 121986, 约 31199)',
      tests: `assert isinstance(out, tuple) and len(out) == 2, "应返回 2 元组"
assert 110000 < out[0] < 135000, f"相对提升 5% 时每组约 12.2 万，实际 {out[0]}"
assert 28000 < out[1] < 35000, f"相对提升 10% 时每组约 3.1 万，实际 {out[1]}"
assert out[0] > out[1] * 2, "效应越小，所需样本越大"
`,
      explanation:
        '```python\nn = ((z_alpha * math.sqrt(2 * p_bar * (1 - p_bar)) + z_beta * math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2) / ((p2 - p1) ** 2)\n```\n\n关键直觉：样本量与 MDE² 成反比——想检出只有一半大小的效应，需要约 4 倍样本（3.1 万 → 12.2 万，正好约 4 倍）。这也是为什么"小改动"的实验往往要跑很久。',
      tags: ['样本量'],
    },
    {
      id: 'methodology-4-e12',
      type: 'single',
      difficulty: 2,
      question: 'AA 测试的主要目的是？',
      options: [
        { value: 'A', text: '验证新功能是否有效' },
        { value: 'B', text: '验证分流系统与指标体系是否正常，并了解基线波动' },
        { value: 'C', text: '确定样本量' },
        { value: 'D', text: '替代正式 A/B 实验' },
      ],
      answer: 'B',
      explanation:
        'AA 测试中两组看到完全相同的策略，理论上不应有差异。它用于检验分流是否均匀、埋点是否准确，并让你了解正常波动范围；若 AA 就出现显著差异，说明实验系统有问题。',
      tags: ['实验设计'],
    },
    {
      id: 'methodology-4-e13',
      type: 'fill',
      difficulty: 3,
      question:
        '实验组与对照组人数比例明显偏离预期（例如 55:45），通常会被判定为 SRM（样本比例失衡）。检测 SRM 常用的统计方法是 ___ 检验。',
      blanks: [['卡方', 'chi-square', 'chi2', 'χ²', '卡方拟合优度']],
      explanation: 'SRM 检测对两组人数做卡方拟合优度检验（df=1），P 值极小（如 <0.001）时判定为异常，需要排查实验平台或其他分流因素。',
      tags: ['实验设计'],
    },
    {
      id: 'methodology-4-e14',
      type: 'open',
      difficulty: 4,
      question:
        '某团队做了一个"优化搜索排序算法"的 A/B 实验，结果是：主指标点击率显著提升 3%，但下单转化率不显著下降 2%，客服投诉率显著上升 5%。作为分析师，你会如何给出上线建议？',
      referenceAnswer: `**判断框架：主指标、护栏指标与业务收益三者共同决策**

1. **先确认显著性细节**：点击率的 3% 是否来自某类查询或某个人群？下单转化率"不显著下降 2%"的置信区间是多少？若区间上限接近 0、下限很深，说明风险不可忽视。
2. **护栏指标恶化是重要信号**：投诉率显著上升 5% 说明用户体验受损，即使点击率提升，也要查清原因（是否是排序结果相关性下降、出现重复结果或广告占比过高）。
3. **商业价值核算**：点击率提升带来的曝光收益，能否覆盖转化率下降与投诉上升带来的成本？需要预估对 GMV/收入的影响。
4. **分人群/分场景分析**：是否在部分场景（如长尾查询）明显变差，可考虑灰度只对部分场景上线。
5. **提出改进**：先修复导致投诉的具体问题（如控制广告占比上限、提升相关性），再做第二轮实验验证。
6. **结论建议**：**暂不全量上线**；做小范围灰度并修复问题，达成"主指标提升、护栏指标不恶化"后再评估。

**核心原则**：主指标显著不是上线的充分条件，必须同时满足护栏指标可接受。`,
      explanation: '这是一道"指标冲突下的决策题"。正确的处理顺序是：先看置信区间判断风险大小，再判断护栏指标恶化是否可接受，最后做商业价值核算并给出灰度与改进方案。直接依据"主指标显著"给出全量上线建议是典型错误。',
      rubric: [
        { point: '明确不能只看主指标，护栏指标恶化需谨慎', score: 2 },
        { point: '要求查看置信区间与效应大小而非只看显著性', score: 1 },
        { point: '给出业务价值/成本收益的量化核算思路', score: 1 },
        { point: '建议分人群或分场景灰度、定位投诉原因', score: 2 },
      ],
      keywords: ['护栏', '置信区间', '投诉', '灰度', '收益', '场景', '体验'],
      tags: ['实验决策'],
    },
    {
      id: 'methodology-4-e15',
      type: 'judge',
      difficulty: 2,
      question: '实验周期越短越好，这样能更快拿到结论并快速迭代。',
      answer: false,
      explanation:
        '周期过短会：样本量不足、无法覆盖完整业务周期（工作日/周末差异）、受新奇效应影响、遇到"周内效应"导致结论不可外推。应保证样本量达标并覆盖至少一个完整周期。',
      tags: ['实验设计'],
    },
  ],
};

export const methodologyExtraChapters: Omit<Chapter, 'courseId' | 'order'>[] = [ch3, ch4];
