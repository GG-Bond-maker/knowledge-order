import type { Chapter } from '../../../types';

/* ============================================================
 *  第 4 章：时间序列与窗口计算
 * ============================================================ */

export const ch4: Omit<Chapter, 'courseId' | 'order'> = {
  id: 'pandas-4-4',
  title: '时间序列与窗口计算',
  goal: '掌握日期解析、日期时间属性提取、重采样与移动窗口计算，能独立完成"按周/月汇总 + 同环比 + 移动平均"的时间序列分析。',
  lessons: [
    {
      id: 'pandas-l-4-1',
      title: '日期解析与 dt 访问器',
      content: `
### 学习目标

学完本节，你应该能够：
1. 用 to_datetime + set_index 建立时间索引；
2. 用 resample("ME") 按月聚合；
3. 用 rolling(window).mean() 计算移动平均并设 min_periods。

### 前置知识

- 数据清洗完成后的干净列（l-3-1）；
- resample 需要时间索引（to_datetime）。

### 问题背景

时间序列是业务数据的主形态（订单、日志、指标）——Pandas 的 datetime64 + resample/rolling 把“按月汇总、移动平均”变成一行代码。

### 直觉理解

把时间列变成 datetime64 后，DataFrame 就有了“时间轴”：resample 是按时间粒度重新聚合（像 SQL 的 GROUP BY 月份），rolling 是滑动窗口。

### 核心概念与原理详解

## 时间列是数据分析的核心维度

绝大部分业务数据都带时间：订单日期、注册时间、日志时间戳。
把字符串正确解析成日期类型，是后续所有时间分析的前提。

## to_datetime：三种典型用法

\`\`\`python
import pandas as pd

# 1. 常见格式自动识别
pd.to_datetime(["2024-01-05", "2024-01-06"])

# 2. 指定格式（更快，且能发现脏数据）
pd.to_datetime(["2024/01/05", "2024/01/06"], format="%Y/%m/%d")

# 3. 强制转换错误为 NaT（而不是抛异常）
pd.to_datetime(s, errors="coerce")
\`\`\`

| 参数 | 作用 |
| --- | --- |
| \`format\` | 指定格式，**大幅提速**并避免歧义（如 01/02 到底是 1 月 2 日还是 2 月 1 日） |
| \`errors="coerce"\` | 无法解析的值变成 \`NaT\`，适合真实脏数据 |
| \`errors="raise"\` | 默认，遇到非法值直接抛错 |
| \`unit\` | 处理 Unix 时间戳（\`unit="s"\` 或 \`"ms"\`） |

> **实战建议**：真实数据一定用 \`errors="coerce"\` + \`format\`，
> 然后用 \`isna()\` 统计有多少行解析失败——这个数字本身就是数据质量指标。

## dt 访问器：从日期中榨取信息

日期类型（\`datetime64\`）的 Series 支持 \`dt\` 访问器：

\`\`\`python
d = pd.to_datetime(df["order_date"])

d.dt.year          # 年
d.dt.month         # 月
d.dt.day           # 日
d.dt.quarter       # 季度（1~4）
d.dt.dayofweek     # 星期几（周一=0，周日=6）
d.dt.week          # ISO 周数
d.dt.dayofyear     # 一年中的第几天
d.dt.is_month_end  # 是否月末
d.dt.strftime("%Y-%m")   # 格式化为字符串
\`\`\`

**注意**：\`dayofweek\` 是 0=周一，而很多人以为是 0=周日。需要"周几"的中文名可以映射：

\`\`\`python
names = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
d.dt.dayofweek.map(lambda i: names[i])
\`\`\`

## 时间差与运算

\`\`\`python
(d2 - d1).dt.days          # 天数差
d + pd.Timedelta(days=7)   # 加 7 天
d.dt.to_period("M")        # 转成月份周期（用于按月分组）
\`\`\`

\`to_period("M")\` 与 \`strftime("%Y-%m")\` 都能把日期降到月粒度，区别是前者保持周期类型（可以直接排序、比较），后者变成字符串。

<ResampleDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
import pandas as pd
df = pd.DataFrame({"ts": pd.to_datetime(["2024-01-05", "2024-01-20", "2024-02-10"]),
                   "v": [10, 20, 30]}).set_index("ts")
print(df.resample("MS")["v"].sum())
print(df["v"].rolling(2).sum())
\`\`\`

预期输出（实测）：按月汇总：1 月 30、2 月 30；rolling(2) 首行 NaN、次行 30、末行 50

**常见错误**：resample 粒度写错（MS 月初 vs M 月末已改名 ME）；rolling 不设 min_periods 导致首段全 NaN；时区naive/aware 混用。

### 常见误区

1. 字符串日期能直接比较——可比较但无法 resample，先 to_datetime；
2. rolling 窗口含当前位置——rolling(2).sum() 是含自身的两期和；
3. 时区转换用 tz_localize+tz_convert 两步。

### 知识关联

- **向前**：l-3-1 清洗后数据才可安全转时间索引；
- **向后**：l-5-1 透视表按月透视的底层；
- **平行**：量化课的时间对齐（对齐交易日历）。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 时间索引 | set_index + datetime64 |
| resample | 按时间粒度聚合（MS/ME/D） |
| rolling | 滑动窗口，min_periods 防全 NaN |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 pandas 官方文档 pandas.pydata.org 相应章节）
`,
      tips: [
        {
          kind: 'pitfall',
          text: '`to_datetime` 不加 `format` 时，`01/02/2024` 这类格式会有歧义（月/日还是日/月），可能被静默解析成错误日期。明确指定 format 既准确又快。',
        },
        {
          kind: 'pitfall',
          text: '`dt.dayofweek` 是 **0=周一**，不是 0=周日。做"周末分析"时注意 `isin([5, 6])` 才表示周六、周日。',
        },
        {
          kind: 'performance',
          text: '对百万行数据指定 `format` 的 `to_datetime` 比自动推断快数倍，因为避免了逐行猜测格式。',
        },
      ],
      demos: [
        {
          title: '日期解析与 dt 属性',
          lang: 'python',
          code: `import pandas as pd

s = pd.Series(["2024-01-05", "2024-03-15", "2024-07-01", "bad_date"])
d = pd.to_datetime(s, format="%Y-%m-%d", errors="coerce")
print("解析结果:")
print(d)

print("\\n解析失败数:", d.isna().sum())
print("dd")
df = pd.DataFrame({"date": d})
df["year"] = df["date"].dt.year
df["month"] = df["date"].dt.month
df["quarter"] = df["date"].dt.quarter
df["weekday"] = df["date"].dt.dayofweek
names = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
df["weekday_name"] = df["weekday"].map(lambda i: names[int(i)] if pd.notna(i) else None)
print(df)`,
        },
      ],
    },
    {
      id: 'pandas-l-4-2',
      title: 'resample：按周/月重采样',
      content: `
### 学习目标

学完本节，你应该能够：
1. 用 shift/diff 计算环比与同比；
2. 用 between_time/at_time 切时段；
3. 说出时区处理两步法（tz_localize → tz_convert）。

### 前置知识

- 数据清洗完成后的干净列（l-3-1）；
- resample 需要时间索引（to_datetime）。

### 问题背景

时间序列是业务数据的主形态（订单、日志、指标）——Pandas 的 datetime64 + resample/rolling 把“按月汇总、移动平均”变成一行代码。

### 直觉理解

把时间列变成 datetime64 后，DataFrame 就有了“时间轴”：resample 是按时间粒度重新聚合（像 SQL 的 GROUP BY 月份），rolling 是滑动窗口。

### 核心概念与原理详解

## 重采样是什么

**重采样（resample）** 是把时间序列从一个频率转换到另一个频率：

- 降采样：日 → 周 / 月（通常配合聚合）
- 升采样：日 → 小时（通常配合填充或插值）

## 基本用法

\`\`\`python
df = df.set_index("order_date")            # 时间必须作为索引
monthly = df.resample("M")["amount"].sum()
\`\`\`

常见频率别名：

| 别名 | 含义 |
| --- | --- |
| \`D\` | 日 |
| \`W\` / \`W-MON\` | 周（默认周日结束） |
| \`M\` / \`ME\` | 月末 |
| \`Q\` / \`QE\` | 季末 |
| \`Y\` / \`YE\` | 年末 |
| \`H\` | 小时 |

## 与 groupby 的区别

| | resample | groupby |
| --- | --- | --- |
| 要求 | 索引必须是时间类型 | 任意列 |
| 缺失周期 | **会补出空周期**（可 \`.sum()\` 得 0） | 不补 |
| 适用 | 完整的时间轴分析 | 一般分组 |

**"补出空周期"是 resample 最大的价值**：如果某个月没有订单，
\`groupby("month")\` 会直接缺失该月，画图时折线会"跳过去"造成误导；
\`resample("M")\` 会保留该月（值为 0 或 NaN），时间轴完整。

\`\`\`python
df.resample("M")["amount"].sum()        # 空月份为 0
df.resample("M")["amount"].sum().fillna(0)  # 显式补 0
\`\`\`

## 多种聚合同时计算

\`\`\`python
result = df.resample("W").agg({
    "amount": ["sum", "mean", "count"],
    "customer_id": "nunique",
})
\`\`\`

## 升采样与插值

\`\`\`python
daily = df.resample("D")["amount"].sum()
hourly = daily.resample("h").ffill()          # 前向填充
hourly2 = daily.resample("h").interpolate()   # 线性插值
\`\`\`

**注意**：升采样会产生大量"虚构"数据点，只在前台展示或建模需要时使用，
做统计指标（如月度汇总）时不要先升采样再降采样，会引入误差。

## 同环比计算

\`\`\`python
monthly = df.resample("M")["amount"].sum()
mom = monthly.pct_change()             # 环比（与上月比）
yoy = monthly.pct_change(12)           # 同比（与 12 个周期前比）
\`\`\`

\`pct_change()\` 会正确处理 NaN（第一期没有上期时为 NaN）。

<ResampleDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
import pandas as pd
df = pd.DataFrame({"ts": pd.to_datetime(["2024-01-05", "2024-01-20", "2024-02-10"]),
                   "v": [10, 20, 30]}).set_index("ts")
print(df.resample("MS")["v"].sum())
print(df["v"].rolling(2).sum())
\`\`\`

预期输出（实测）：按月汇总：1 月 30、2 月 30；rolling(2) 首行 NaN、次行 30、末行 50

**常见错误**：resample 粒度写错（MS 月初 vs M 月末已改名 ME）；rolling 不设 min_periods 导致首段全 NaN；时区naive/aware 混用。

### 常见误区

1. 字符串日期能直接比较——可比较但无法 resample，先 to_datetime；
2. rolling 窗口含当前位置——rolling(2).sum() 是含自身的两期和；
3. 时区转换用 tz_localize+tz_convert 两步。

### 知识关联

- **向前**：l-3-1 清洗后数据才可安全转时间索引；
- **向后**：l-5-1 透视表按月透视的底层；
- **平行**：量化课的时间对齐（对齐交易日历）。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 时间索引 | set_index + datetime64 |
| resample | 按时间粒度聚合（MS/ME/D） |
| rolling | 滑动窗口，min_periods 防全 NaN |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 pandas 官方文档 pandas.pydata.org 相应章节）
`,
      tips: [
        {
          kind: 'leak',
          text: '做时间趋势分析时优先用 `resample` 而不是 `groupby(strftime)`，因为前者会自动补全没有数据的周期，避免图表出现"虚假断崖"。',
        },
        {
          kind: 'pitfall',
          text: '`resample` 要求索引是 DatetimeIndex。忘记 `set_index` 会报 `TypeError: Only valid with DatetimeIndex`。',
        },
        {
          kind: 'note',
          text: '新版 pandas 中 `M`/`Q`/`Y` 等别名有弃用警告，推荐写 `ME`/`QE`/`YE`（Month-End 等），语义更明确。',
        },
      ],
      demos: [
        {
          title: '按月重采样与同环比',
          lang: 'python',
          code: `import pandas as pd
import numpy as np

rng = np.random.default_rng(42)
dates = pd.date_range("2024-01-01", "2024-08-31", freq="D")
# 刻意让 3 月没有数据，观察 resample 的补全效果
amount = pd.Series(rng.integers(100, 1000, len(dates)), index=dates)
amount[amount.index.month == 3] = np.nan

df = pd.DataFrame({"amount": amount})
monthly = df.resample("M")["amount"].sum()
print("按月汇总（3 月无数据被保留）:")
print(monthly)

print("\\n环比:")
print(monthly.pct_change().round(4))

print("\\n按周汇总前 5 行:")
print(df.resample("W")["amount"].sum().head())`,
        },
      ],
    },
    {
      id: 'pandas-l-4-3',
      title: 'rolling、shift 与移动窗口',
      content: `
### 学习目标

学完本节，你应该能够：
1. 用 expanding 计算累计指标；
2. 对比 rolling/expanding 的业务场景；
3. 在时间索引下做切片取数（闭区间）。

### 前置知识

- 数据清洗完成后的干净列（l-3-1）；
- resample 需要时间索引（to_datetime）。

### 问题背景

时间序列是业务数据的主形态（订单、日志、指标）——Pandas 的 datetime64 + resample/rolling 把“按月汇总、移动平均”变成一行代码。

### 直觉理解

把时间列变成 datetime64 后，DataFrame 就有了“时间轴”：resample 是按时间粒度重新聚合（像 SQL 的 GROUP BY 月份），rolling 是滑动窗口。

### 核心概念与原理详解

## rolling：移动窗口聚合

\`\`\`python
s = df["amount"]
s.rolling(window=7).mean()      # 7 期移动平均
s.rolling(7).sum()              # 7 期移动合计
s.rolling(7).std()              # 移动标准差（波动率）
s.rolling(7).min() / .max()     # 移动极值
\`\`\`

**默认窗口是"包含当前行及之前共 window 行"**，因此前 6 行为 NaN。

常用参数：

| 参数 | 作用 |
| --- | --- |
| \`window\` | 窗口大小 |
| \`min_periods\` | 窗口内最少有效观测数（默认等于 window） |
| \`center=True\` | 窗口居中（用于平滑展示，不可用于预测） |
| \`closed\` | 窗口边界闭合方式 |

\`\`\`python
s.rolling(7, min_periods=1).mean()   # 前几行也能算出值（基于已有数据）
\`\`\`

## 为什么需要移动平均

原始日数据波动大，趋势被噪声掩盖。移动平均是**最简单的平滑手段**：

- 7 日移动平均：消除"周内效应"（周末高、工作日低）；
- 30 日移动平均：看月度趋势；
- 对比"实际值"与"移动平均线"，可以识别异常波动。

## shift：错位取数

\`\`\`python
s.shift(1)      # 上一期的值
s.shift(-1)     # 下一期的值
s.diff()        # 与上一期的差值（= s - s.shift(1)）
s.pct_change()  # 与上一期的变化率
\`\`\`

**shift 的关键用途**：做"同环比"和"标签构造"。

\`\`\`python
df["yesterday"] = df["amount"].shift(1)
df["day_diff"] = df["amount"] - df["amount"].shift(1)
\`\`\`

## 常见的组合用法

\`\`\`python
# 计算相对移动平均的偏差，识别异常
ma7 = s.rolling(7).mean()
deviation = (s - ma7) / ma7
anomalies = s[deviation > 0.5]      # 超出均值 50% 的日子
\`\`\`

\`\`\`python
# 判断连续上涨天数
up = (s.diff() > 0).astype(int)
streak = up.groupby((up != up.shift()).cumsum()).cumsum()
\`\`\`

这是"连续 N 天"类问题的通用套路：**先标记状态 → 用"状态变化"分组 → 组内累计**。

## expanding：累计到当前

\`\`\`python
s.expanding().mean()    # 从第一行累加到当前行的平均
s.expanding().max()     # 历史最高
\`\`\`

用于"截至目前的最好成绩""累计签到天数"这类累计指标。

<RollingWindowDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
import pandas as pd
df = pd.DataFrame({"ts": pd.to_datetime(["2024-01-05", "2024-01-20", "2024-02-10"]),
                   "v": [10, 20, 30]}).set_index("ts")
print(df.resample("MS")["v"].sum())
print(df["v"].rolling(2).sum())
\`\`\`

预期输出（实测）：按月汇总：1 月 30、2 月 30；rolling(2) 首行 NaN、次行 30、末行 50

**常见错误**：resample 粒度写错（MS 月初 vs M 月末已改名 ME）；rolling 不设 min_periods 导致首段全 NaN；时区naive/aware 混用。

### 常见误区

1. 字符串日期能直接比较——可比较但无法 resample，先 to_datetime；
2. rolling 窗口含当前位置——rolling(2).sum() 是含自身的两期和；
3. 时区转换用 tz_localize+tz_convert 两步。

### 知识关联

- **向前**：l-3-1 清洗后数据才可安全转时间索引；
- **向后**：l-5-1 透视表按月透视的底层；
- **平行**：量化课的时间对齐（对齐交易日历）。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 时间索引 | set_index + datetime64 |
| resample | 按时间粒度聚合（MS/ME/D） |
| rolling | 滑动窗口，min_periods 防全 NaN |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 pandas 官方文档 pandas.pydata.org 相应章节）
`,
      tips: [
        {
          kind: 'pitfall',
          text: '`rolling(7)` 默认要求窗口内 7 个观测都有效，前 6 行是 NaN。若希望早期也有值，加 `min_periods=1`。',
        },
        {
          kind: 'leak',
          text: '`shift(1)` 是构造"用昨天预测今天"类特征的必备操作；忘记 shift 会导致未来信息泄漏（用到了当期数据）。',
        },
        {
          kind: 'performance',
          text: '`rolling` 是 C 实现，比手写 for 循环快几个数量级。做滑动计算时不要在 Python 层循环。',
        },
      ],
      demos: [
        {
          title: '移动平均与异常识别',
          lang: 'python',
          code: `import pandas as pd
import numpy as np

rng = np.random.default_rng(7)
dates = pd.date_range("2024-01-01", periods=30, freq="D")
sales = pd.Series(rng.integers(80, 120, 30), index=dates).astype(float)
sales.iloc[15] = 260          # 注入一个异常峰值

df = pd.DataFrame({"sales": sales})
df["ma7"] = df["sales"].rolling(7, min_periods=1).mean().round(1)
df["prev_day"] = df["sales"].shift(1)
df["day_diff"] = df["sales"].diff()

deviation = (df["sales"] - df["ma7"]) / df["ma7"]
print("偏离移动平均超过 50% 的日期:")
print(df[deviation.abs() > 0.5][["sales", "ma7"]].round(1))

print("\\n前 8 行的移动平均:")
print(df.head(8)[["sales", "ma7"]])`,
        },
      ],
    },
  ],
  exercises: [
    {
      id: 'pandas-4-e1',
      type: 'single',
      difficulty: 1,
      question: '`pd.to_datetime` 的 `errors="coerce"` 参数作用是？',
      options: [
        { value: 'A', text: '抛异常终止' },
        { value: 'B', text: '无法解析的值转为 `NaT`，其余正常解析' },
        { value: 'C', text: '忽略所有值' },
        { value: 'D', text: '按 UTC 时区转换' },
      ],
      answer: 'B',
      explanation:
        '`coerce` 表示"强制转换"，非法值变成 `NaT`（缺失时间），适合处理真实脏数据。配合 `isna().sum()` 可以统计解析失败的行数。',
      tags: ['to_datetime'],
    },
    {
      id: 'pandas-4-e2',
      type: 'judge',
      difficulty: 2,
      question: '`dt.dayofweek` 中，0 表示周日。',
      answer: false,
      explanation:
        '`dt.dayofweek` 是 **0=周一**，6=周日。判断周末应写 `isin([5, 6])`。许多人会误以为是 0=周日（那是 \`dayofyear\` 之外的另一个常见混淆点）。',
      tags: ['dt'],
    },
    {
      id: 'pandas-4-e3',
      type: 'multiple',
      difficulty: 2,
      question: '`resample` 相比 `groupby` 的优势有哪些？（多选）',
      options: [
        { value: 'A', text: '会自动补全没有数据的周期' },
        { value: 'B', text: '时间轴连续，画图不会出现虚假断裂' },
        { value: 'C', text: '只能用于数值列' },
        { value: 'D', text: '支持多种聚合同时计算' },
      ],
      answer: ['A', 'B', 'D'],
      explanation:
        '`resample` 可以用于任意列类型（包括非数值的 count 聚合），因此 C 错误。A、B、D 都是它的优势。',
      tags: ['resample'],
    },
    {
      id: 'pandas-4-e4',
      type: 'fill',
      difficulty: 2,
      question: '计算 7 期移动平均并保存到新列，补全代码：\n\n```python\ndf["ma7"] = df["amount"].___(7).mean()\n```',
      blanks: [['rolling']],
      explanation: '`rolling(window)` 返回滚动窗口对象，再调用 `.mean()` 得到移动平均。前 6 行默认是 NaN。',
      tags: ['rolling'],
    },
    {
      id: 'pandas-4-e5',
      type: 'code',
      difficulty: 2,
      question:
        '给定日期字符串 Series `dates`，请：\n\n1. 解析为日期保存到 `parsed`（非法值变 NaT）；\n2. 计算解析失败的数量 `n_fail`；\n3. 提取所有非空日期的年份保存到 `years`（不修改原索引）。',
      starterCode: `import pandas as pd

dates = pd.Series(["2023-05-01", "2024-01-15", "not_a_date", "2024-11-30"])

parsed = ___
n_fail = ___
years = ___
`,
      setupCode: '',
      expectedOutput: 'n_fail = 1, years = [2023.0, 2024.0, 2024.0]',
      tests: `assert isinstance(parsed, pd.Series), "parsed 应为 Series"
assert pd.api.types.is_datetime64_any_dtype(parsed), "parsed 应为日期类型"
assert n_fail == 1, f"n_fail 应为 1，实际 {n_fail}"
assert list(years.dropna().astype(int)) == [2023, 2024, 2024], f"years 不正确：{list(years)}"
`,
      explanation:
        '```python\nparsed = pd.to_datetime(dates, errors="coerce")\nn_fail = parsed.isna().sum()\nyears = parsed.dt.year\n```\n\n`dt.year` 对 NaT 返回 NaN，因此 `dropna()` 后才是 3 个有效年份。',
      tags: ['to_datetime', 'dt'],
    },
    {
      id: 'pandas-4-e6',
      type: 'code',
      difficulty: 3,
      question:
        '把订单按"月"汇总。给定 `df`（含 `order_date` 日期列与 `amount` 数值列），请：\n\n1. 按月分组求和，结果 Series 的索引为月份字符串（形如 `2024-01`），保存到 `monthly`；\n2. 计算环比增长率保存到 `mom`（保留 4 位小数）。',
      starterCode: `import pandas as pd

df = pd.DataFrame({
    "order_date": pd.to_datetime(["2024-01-05", "2024-01-20", "2024-02-11", "2024-03-03", "2024-03-25"]),
    "amount": [100.0, 200.0, 500.0, 250.0, 150.0],
})

monthly = ___
mom = ___
`,
      setupCode: '',
      expectedOutput: 'monthly[0]=300.0, monthly[1]=500.0, monthly[2]=400.0; mom[1]=0.6667',
      tests: `assert list(monthly.values) == [300.0, 500.0, 400.0], f"monthly 不正确：{list(monthly.values)}"
assert list(monthly.index) == ["2024-01", "2024-02", "2024-03"], f"索引不正确：{list(monthly.index)}"
assert abs(mom.iloc[1] - 0.6667) < 1e-3, f"2 月环比应约 0.6667，实际 {mom.iloc[1]}"
assert pd.isna(mom.iloc[0]), "首月环比应为 NaN"
`,
      explanation:
        '```python\nmonthly = df.groupby(df["order_date"].dt.strftime("%Y-%m"))["amount"].sum()\nmom = monthly.pct_change().round(4)\n```\n\n1 月 300、2 月 500（+66.67%）、3 月 400（-20%）。用 `strftime` 分组适合"只要月份标签"的场景；需要补全空月份时改用 `set_index + resample`。',
      tags: ['时间分组', '环比'],
    },
    {
      id: 'pandas-4-e7',
      type: 'single',
      difficulty: 3,
      question: '`series.rolling(7).mean()` 的前 6 个元素通常是？',
      options: [
        { value: 'A', text: '原值' },
        { value: 'B', text: '`NaN`' },
        { value: 'C', text: '`0`' },
        { value: 'D', text: '报错' },
      ],
      answer: 'B',
      explanation:
        '默认 `min_periods` 等于 window，窗口内不足 7 个观测就返回 NaN。若希望前面也有值，写 `rolling(7, min_periods=1)`。',
      tags: ['rolling'],
    },
    {
      id: 'pandas-4-e8',
      type: 'judge',
      difficulty: 3,
      question: '`resample` 要求 DataFrame 的索引必须是日期时间类型。',
      answer: true,
      explanation:
        '`resample` 基于 `DatetimeIndex` 工作。若时间在普通列里，需先 `set_index("order_date")` 或使用 `on=` 参数（`df.resample("M", on="order_date")`）。',
      tags: ['resample'],
    },
    {
      id: 'pandas-4-e9',
      type: 'code',
      difficulty: 3,
      question:
        '使用 `resample` 按月汇总并验证"空月份被保留"。给定 `s`（DatetimeIndex，含 1 月、3 月数据，2 月无数据），请：\n\n1. 按月求和保存到 `monthly`；\n2. 记录 `monthly` 的长度 `n_months`；\n3. 记录 2 月的值 `feb_value`（应是 0 或 NaN）。',
      starterCode: `import pandas as pd

idx = pd.to_datetime(["2024-01-05", "2024-01-20", "2024-03-10"])
s = pd.Series([100.0, 200.0, 400.0], index=idx)

monthly = ___
n_months = ___
feb_value = ___
`,
      setupCode: '',
      expectedOutput: 'n_months = 3（1、2、3 月都被保留），feb_value = 0.0',
      tests: `assert n_months == 3, f"应保留 3 个月（含空的 2 月），实际 {n_months}"
assert monthly.iloc[0] == 300.0, f"1 月合计应为 300，实际 {monthly.iloc[0]}"
assert (feb_value == 0) or pd.isna(feb_value), f"2 月应为 0 或 NaN，实际 {feb_value}"
assert monthly.iloc[2] == 400.0, f"3 月合计应为 400，实际 {monthly.iloc[2]}"
`,
      explanation:
        '```python\nmonthly = s.resample("ME").sum()\nn_months = len(monthly)\nfeb_value = monthly.iloc[1]\n```\n\n这正是 `resample` 与 `groupby` 的关键差异：2 月没有任何数据，`groupby` 会直接丢掉这个月（长度 2），而 `resample` 会补出一个 0 值月份（长度 3），时间轴保持连续。',
      tags: ['resample'],
    },
    {
      id: 'pandas-4-e10',
      type: 'fill',
      difficulty: 3,
      question: '取上一期的值用于计算同环比，补全方法：\n\n```python\ndf["prev"] = df["amount"].___(1)\n```',
      blanks: [['shift']],
      explanation: '`shift(1)` 把整列往下移一行，得到"上一期"的值。`shift(-1)` 则是取下一期（构造标签时用，注意未来信息泄漏）。',
      tags: ['shift'],
    },
    {
      id: 'pandas-4-e11',
      type: 'code',
      difficulty: 4,
      question:
        '识别异常日：给定 20 天的销售额 Series `sales`（DatetimeIndex），请：\n\n1. 计算 5 日移动平均保存到 `ma5`（允许前几期不足 5 个观测也计算）；\n2. 找出"销售额 > 移动平均 × 1.5"的日期（字符串列表，按日期升序）保存到 `anomalies`。',
      starterCode: `import pandas as pd

idx = pd.date_range("2024-01-01", periods=20, freq="D")
values = [100, 105, 98, 102, 110, 95, 108, 103, 99, 101,
          400, 102, 97, 106, 104, 100, 99, 103, 108, 101]
sales = pd.Series(values, index=idx, dtype=float)

ma5 = ___
anomalies = ___
`,
      setupCode: '',
      expectedOutput: "anomalies == ['2024-01-11']",
      tests: `assert len(ma5) == 20, "ma5 长度应为 20"
assert abs(ma5.iloc[-1] - sum(values[-5:]) / 5) < 1e-9, f"最后一天的 ma5 计算不正确：{ma5.iloc[-1]}"
assert anomalies == ["2024-01-11"], f"异常日应只有 2024-01-11，实际 {anomalies}"
`,
      explanation:
        '```python\nma5 = sales.rolling(5, min_periods=1).mean()\nanomalies = [d.strftime("%Y-%m-%d") for d in sales.index[sales > ma5 * 1.5]]\n```\n\n第 11 天销售额 400，同期移动平均约 103，远超 1.5 倍阈值，因此被判为异常。这是业务监控中最常用的"简易异常检测"。',
      tags: ['rolling', '异常检测'],
    },
    {
      id: 'pandas-4-e12',
      type: 'multiple',
      difficulty: 3,
      question: '关于 `shift`，下列说法正确的有？（多选）',
      options: [
        { value: 'A', text: '`shift(1)` 取上一期值，首行为 NaN' },
        { value: 'B', text: '`shift(-1)` 取下一期值（可用于构造标签）' },
        { value: 'C', text: '`diff()` 等价于 `s - s.shift(1)`' },
        { value: 'D', text: '`shift` 会修改原 Series' },
      ],
      answer: ['A', 'B', 'C'],
      explanation:
        '`shift` 返回新对象，不修改原 Series（D 错误）。A、B、C 都正确。用 `shift(-1)` 构造标签时要注意，实际建模时不能用"未来的值"做特征。',
      tags: ['shift'],
    },
    {
      id: 'pandas-4-e13',
      type: 'single',
      difficulty: 3,
      question: '"连续上涨天数"这类问题，最常用的 pandas 套路是？',
      options: [
        { value: 'A', text: '用 while 循环逐行判断' },
        { value: 'B', text: '先标记涨跌状态，再按"状态变化"分组累计' },
        { value: 'C', text: '用 `rolling` 求最大值' },
        { value: 'D', text: '无法用 pandas 实现' },
      ],
      answer: 'B',
      explanation:
        '通用套路：`up = (s.diff() > 0).astype(int)`，然后 `up.groupby((up != up.shift()).cumsum()).cumsum()`。先标记状态、再按"状态段"分组、组内累计，是处理所有"连续 N 期"问题的标准写法。',
      tags: ['分组', '套路'],
    },
    {
      id: 'pandas-4-e14',
      type: 'open',
      difficulty: 4,
      question:
        '业务方要求"看最近 12 个月的销售额趋势"。你发现原始数据里有几个月完全没订单。请说明用 `groupby` 与用 `resample` 的结果差异，以及各自可能带来的问题。',
      referenceAnswer: `**用 groupby 分组（如 \`groupby(order_date.dt.strftime("%Y-%m"))\`）**：

- 只返回**有数据的月份**，没有订单的月份直接缺失；
- 结果长度可能小于 12；
- 画折线图时时间轴被压缩，两个相邻点可能实际相差 2 个月，
  视觉上却像"连续下降"，**会造成误导**；
- 算环比时 \`pct_change()\` 会把"隔月"当成"上月"，环比值错误。

**用 resample 按月重采样**：

- 会补全时间轴上所有的月份，无数据的月份值为 0（或 NaN）；
- 时间轴连续，趋势图真实反映"某月没卖出去"；
- 环比计算正确（相邻行就是相邻月）；
- 缺点：如果缺失是"数据没采集到"而不是"真的没卖"，补 0 会掩盖数据问题。

**结论与建议**：

1. 先判断"无数据"的原因：是业务上真的没有交易，还是数据缺失；
2. 业务上为 0 → 用 \`resample("ME").sum()\`，得到真实的 0；
3. 数据缺失 → 用 \`resample("ME").sum().reindex(full_range)\` 后再决定是否标记为未知，
   不要直接填 0；
4. 无论哪种，都要在报告里明确标注"哪几个月无数据及原因"。`,
      rubric: [
        { point: '指出 groupby 会丢掉无数据月份、结果长度不足', score: 2 },
        { point: '指出 groupby 会导致图表时间轴失真与环比错误', score: 2 },
        { point: '说明 resample 会补全周期、时间轴连续', score: 1 },
        { point: '区分"业务为 0"与"数据缺失"并给出不同处理', score: 1 },
      ],
      keywords: ['groupby', 'resample', '补全', '连续', '环比', '缺失'],
      explanation:
        '本题的核心是"时间轴完整性问题"。很多分析报告的趋势图之所以误导人，就是因为缺失月份被悄悄跳过了。',
      tags: ['resample', '数据陷阱'],
    },
    {
      id: 'pandas-4-e15',
      type: 'code',
      difficulty: 4,
      question:
        '综合：给定日数据 `df`（`date` 列 + `amount`），请完成：\n\n1. 以 `date` 为索引按月求和，保存到 `monthly`；\n2. 计算累计销售额保存到 `cum_sales`（累计到当月）；\n3. 计算 2 期移动平均保存到 `ma2`（保留 2 位小数，首期为 NaN）。\n\n结果放在 DataFrame `out` 中，列名为 `monthly`、`cum_sales`、`ma2`。',
      starterCode: `import pandas as pd

df = pd.DataFrame({
    "date": pd.to_datetime([
        "2024-01-10", "2024-01-20", "2024-02-05",
        "2024-03-15", "2024-03-28", "2024-04-10",
    ]),
    "amount": [100.0, 150.0, 300.0, 50.0, 80.0, 220.0],
})

monthly = ___
cum_sales = ___
ma2 = ___
out = ___
`,
      setupCode: '',
      expectedOutput: 'monthly = [250, 300, 130, 220], cum_sales 末值 900, ma2[0] = NaN',
      tests: `assert list(out.columns) == ["monthly", "cum_sales", "ma2"], f"列名不正确：{list(out.columns)}"
assert list(out["monthly"].values) == [250.0, 300.0, 130.0, 220.0], f"monthly 不正确：{list(out['monthly'].values)}"
assert out["cum_sales"].iloc[-1] == 900.0, f"累计末值应为 900，实际 {out['cum_sales'].iloc[-1]}"
assert pd.isna(out["ma2"].iloc[0]), "ma2 首期应为 NaN"
assert abs(out["ma2"].iloc[1] - 275.0) < 1e-9, f"ma2 第二期应为 275，实际 {out['ma2'].iloc[1]}"
`,
      explanation:
        '```python\nmonthly = df.set_index("date")["amount"].resample("ME").sum()\ncum_sales = monthly.cumsum()\nma2 = monthly.rolling(2).mean().round(2)\nout = pd.DataFrame({"monthly": monthly, "cum_sales": cum_sales, "ma2": ma2})\n```\n\n1 月 250、2 月 300、3 月 130、4 月 220，累计 900。(250+300)/2 = 275。',
      tags: ['综合', 'resample', 'rolling'],
    },
    {
      id: 'pandas-4-e16',
      type: 'judge',
      difficulty: 2,
      question: '`s.diff()` 等价于 `s - s.shift(1)`。',
      answer: true,
      explanation:
        '`diff()` 默认 periods=1，就是与上一期的差。`diff(2)` 则是与上两期的差。它比手写 `s - s.shift(1)` 更简洁，且对 NaN 的处理一致。',
      tags: ['diff'],
    },
    {
      id: 'pandas-4-x1',
      type: 'single',
      difficulty: 1,
      question: '把一列日期字符串转换为日期类型，应使用？',
      options: [
        {
          value: 'A',
          text: '`pd.to_datetime(col)`',
        },
        {
          value: 'B',
          text: '`col.astype(str)`',
        },
        {
          value: 'C',
          text: '`pd.to_numeric(col)`',
        },
        {
          value: 'D',
          text: '`col.dt.year`',
        },
      ],
      answer: 'A',
      explanation: '`to_datetime` 是日期解析的标准入口；`astype(str)` 反而是把日期转成字符串。',
      tags: ['to_datetime'],
    },
    {
      id: 'pandas-4-x2',
      type: 'judge',
      difficulty: 1,
      question: '`dt.quarter` 返回的是 1~4 的季度值。',
      answer: true,
      explanation: '`dt.quarter` 按自然季度（1~3 月为 Q1）返回 1~4，常用于季度汇总。',
      tags: ['dt'],
    },
    {
      id: 'pandas-4-x3',
      type: 'fill',
      difficulty: 2,
      question: `把日期序列降采样到"月末"，补全频率别名：

df.resample("___").sum()`,
      blanks: [
        ['ME', 'M'],
      ],
      explanation: '`ME`（Month End）是新版推荐写法，旧版 `M` 在 pandas 2.2+ 会有弃用警告。',
      tags: ['resample'],
    },
    {
      id: 'pandas-4-x4',
      type: 'code',
      difficulty: 2,
      question: '给定日期序列 `dates`，提取"星期几"（0=周一）保存到 `weekday`，并统计周末（周六、周日）的记录数 `n_weekend`。',
      starterCode: `import pandas as pd

dates = pd.to_datetime(["2024-01-01", "2024-01-06", "2024-01-07", "2024-01-08"])

weekday = ___
n_weekend = ___
`,
      setupCode: '',
      expectedOutput: 'weekday = [0, 5, 6, 0], n_weekend = 2',
      tests: `assert list(weekday) == [0, 5, 6, 0], f"weekday 不正确：{list(weekday)}"
assert n_weekend == 2, f"n_weekend 应为 2，实际 {n_weekend}"
`,
      answer: `weekday = pd.Series(dates).dt.dayofweek
n_weekend = int(weekday.isin([5, 6]).sum())`,
      explanation: '`weekday = dates.dt.dayofweek` 取星期序号；`isin([5, 6])` 才是"周末"。2024-01-01 是周一（0）。',
      tags: ['dt', '日期'],
    },
    {
      id: 'pandas-4-x5',
      type: 'single',
      difficulty: 2,
      question: '`pct_change()` 计算的是？',
      options: [
        {
          value: 'A',
          text: '与上一期的差值',
        },
        {
          value: 'B',
          text: '与上一期的变化率（相对变化）',
        },
        {
          value: 'C',
          text: '累计和',
        },
        {
          value: 'D',
          text: '移动平均',
        },
      ],
      answer: 'B',
      explanation: '`pct_change()` 返回 (当前 - 上期) / 上期，即变化率；`diff()` 返回绝对差值。',
      tags: ['pct_change'],
    },
    {
      id: 'pandas-4-x6',
      type: 'judge',
      difficulty: 2,
      question: '`rolling(7, min_periods=1).mean()` 可以让前 6 行也有值。',
      answer: true,
      explanation: '`min_periods=1` 表示窗口内至少 1 个有效观测就算，因此第 1 行即开始有值。',
      tags: ['rolling'],
    },
    {
      id: 'pandas-4-x7',
      type: 'fill',
      difficulty: 2,
      question: `取"下一期"的值用于构造标签，补全参数：

df["next_value"] = df["amount"].shift(___)`,
      blanks: [
        ['-1'],
      ],
      explanation: '`shift(-1)` 把整列上移一行，当前行取到下一期的值。注意建模时不要用未来数据做特征。',
      tags: ['shift'],
    },
    {
      id: 'pandas-4-x8',
      type: 'code',
      difficulty: 3,
      question: `给定日销售额 Series（DatetimeIndex），请计算：

1. 7 日滚动合计 \`sum7\`；
2. 7 日滚动合计的环比 \`sum7_pct\`（相对前一天，保留 4 位小数）。`,
      starterCode: `import pandas as pd

idx = pd.date_range("2024-01-01", periods=12, freq="D")
s = pd.Series([100, 110, 90, 120, 130, 100, 150, 120, 140, 160, 130, 170], index=idx, dtype=float)

sum7 = ___
sum7_pct = ___
`,
      setupCode: '',
      expectedOutput: 'sum7 第 7 项 = 800，sum7_pct 第 8 项 ≈ 0.0663',
      tests: `assert len(sum7) == 12
assert sum7.iloc[6] == 800.0, f"sum7 第 7 项应为 800，实际 {sum7.iloc[6]}"
assert sum7.iloc[7] == 820.0, f"sum7 第 8 项应为 820，实际 {sum7.iloc[7]}"
assert pd.isna(sum7_pct.iloc[6]), "sum7_pct 第 7 项应为 NaN"
assert abs(sum7_pct.iloc[7] - 0.025) < 1e-3, f"第 8 项环比应约 0.025，实际 {sum7_pct.iloc[7]}"
`,
      answer: `sum7 = s.rolling(7).sum()
sum7_pct = sum7.pct_change().round(4)`,
      explanation: '前 7 项之和 = 100+110+90+120+130+100+150 = 800；第 8 期窗口为 110+90+120+130+100+150+120 = 820。环比 (820-800)/800 = 0.025。',
      tags: ['rolling', 'pct_change'],
    },
    {
      id: 'pandas-4-x9',
      type: 'multiple',
      difficulty: 3,
      question: '关于时间序列索引，下列说法正确的有？（多选）',
      options: [
        {
          value: 'A',
          text: '`DatetimeIndex` 支持按字符串切片，如 `df["2024-01"]`',
        },
        {
          value: 'B',
          text: '`resample` 需要 `DatetimeIndex` 或通过 `on=` 指定日期列',
        },
        {
          value: 'C',
          text: '时间索引丢失后仍可 `resample`',
        },
        {
          value: 'D',
          text: '`set_index("date")` 可把日期列设为索引',
        },
      ],
      answer: ['A', 'B', 'D'],
      explanation: '`resample` 必须基于时间索引或 `on` 参数指定日期列，普通整数索引无法重采样（C 错误）。',
      tags: ['时间索引'],
    },
    {
      id: 'pandas-4-x10',
      type: 'single',
      difficulty: 3,
      question: '不同月份数据缺失时，用 `groupby` 与 `resample` 的最大差别是？',
      options: [
        {
          value: 'A',
          text: '`resample` 会补全缺失的时间周期，`groupby` 不会',
        },
        {
          value: 'B',
          text: '`groupby` 更快',
        },
        {
          value: 'C',
          text: '两者完全等价',
        },
        {
          value: 'D',
          text: '`resample` 只能做求和',
        },
      ],
      answer: 'A',
      explanation: '`resample` 按时间轴补全周期（空月份为 0/NaN），保证时间连续；`groupby` 只返回有数据的组。',
      tags: ['resample'],
    },
    {
      id: 'pandas-4-x11',
      type: 'code',
      difficulty: 4,
      question: `给定月度销售额 Series（DatetimeIndex），计算：

1. 3 个月移动平均 \`ma3\`；
2. 同比增长率 \`yoy\`（与 12 个月前比，保留 4 位小数）；
3. 找出 \`yoy\` 最大的月份（字符串 YYYY-MM）到 \`best_month\`。`,
      starterCode: `import pandas as pd
import numpy as np

idx = pd.date_range("2023-01-01", periods=24, freq="MS")
vals = np.arange(24) * 10 + 100.0
s = pd.Series(vals, index=idx)

ma3 = ___
yoy = ___
best_month = ___
`,
      setupCode: '',
      expectedOutput: 'best_month 为 2024-01',
      tests: `assert len(ma3) == 24
assert abs(ma3.iloc[2] - 110.0) < 1e-9, f"ma3 第 3 项应为 110，实际 {ma3.iloc[2]}"
assert pd.isna(yoy.iloc[11]), "前 12 期同比应为 NaN"
assert abs(yoy.iloc[12] - 1.2) < 1e-6, f"2024-01 同比应约 1.2，实际 {yoy.iloc[12]}"
assert best_month == "2024-01", f"最佳月份应为 2024-01，实际 {best_month}"
`,
      answer: `ma3 = s.rolling(3).mean()
yoy = s.pct_change(12).round(4)
best_month = yoy.idxmax().strftime("%Y-%m")`,
      explanation: '数据线性递增，前 12 期同比为 NaN，因此最大的是第 13 期（2024-01）。',
      tags: ['rolling', '同比'],
    },
    {
      id: 'pandas-4-x12',
      type: 'open',
      difficulty: 3,
      question: '请说明"同比"与"环比"的区别，并各举一个业务场景说明应该用哪个。',
      referenceAnswer: `**环比**：与上一个相邻周期比较，反映短期变化速度。适用于无强季节性指标或快速异常监测。

**同比**：与去年同一时期比较，抵消季节性影响。适用于强季节性业务（电商大促、旅游旺季、教育寒假）。

**结论**：判断"变化多快/是否异常"用环比；判断"是否真正变好"用同比；报告里两者通常同时呈现。`,
      rubric: [
        {
          point: '准确说明环比是相邻周期比较',
          score: 1,
        },
        {
          point: '准确说明同比是去年同期比较、能抵消季节性',
          score: 2,
        },
        {
          point: '各给出一个恰当的业务场景',
          score: 2,
        },
      ],
      keywords: ['环比', '同比', '季节性', '相邻周期', '去年同期'],
      tags: ['时间分析'],
      explanation: '本题考察对时间序列分析指标的理解。答题关键是能说明环比反映短期变化、同比抵消季节性，并各给出一个贴合业务场景的例子。',
    },
  ],
};
