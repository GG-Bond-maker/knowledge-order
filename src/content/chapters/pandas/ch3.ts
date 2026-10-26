import type { Chapter } from '../../../types';

/* ============================================================
 *  第 3 章：数据清洗与缺失值
 * ============================================================ */

export const ch3: Omit<Chapter, 'courseId' | 'order'> = {
  id: 'pandas-3-3',
  title: '数据清洗与缺失值',
  goal: '建立「缺失值识别 → 删除/填充 → 去重 → 文本清洗 → 值映射」的标准清洗流水线，理解 NaN 与 None 的差异，并能根据业务含义选择恰当的填充与删除策略。',
  lessons: [
    /* ───────────────────── Lesson 1 ───────────────────── */
    {
      id: 'pandas-l-3-1',
      title: '缺失值识别：isna / notna 与 NaN、None、NaT',
      content: `
### 学习目标

学完本节，你应该能够：
1. 用 isna().sum() 定位缺失分布；
2. 按“关键列”用 dropna(subset=) 精准删行；
3. 按语义选 fillna 策略（均值/中位数/前值）。

### 前置知识

- loc/iloc 精确选数（l-2-1）；
- 缺失值 NaN 的判断（isna）。

### 问题背景

真实数据必脏：缺失、重复、类型错误占清洗时间的 70%——Pandas 的 isna/dropna/fillna/astype 是这套工序的标准化工具。

### 直觉理解

缺失值像问卷空题：可以扔掉整份卷子（dropna）、按多数答案填（fillna 众数/均值）、或标注“未答”（保留 NaN 让模型知道）。

### 核心概念与原理详解

## 缺失值有几种"长相"

在 Pandas 里，缺失值至少有三种来源，它们的判断方式相同但行为细节不同：

| 来源 | 典型写法 | 常见出现位置 | 特点 |
| --- | --- | --- | --- |
| \`np.nan\` | \`float("nan")\` | 数值列 | 浮点缺失，\`nan != nan\` |
| \`None\` | Python 空值 | 对象/文本列 | Python 层面的"空" |
| \`pd.NaT\` | Not a Time | 时间列 | 时间的缺失 |
| \`pd.NA\` | 可空类型的缺失 | \`Int64\` / \`boolean\` / \`string\` | 统一占位符 |

判断缺失值时请**永远**使用 \`pd.isna\` / \`df.isna()\` / \`df.notna()\`，它会正确识别以上全部形态：

\`\`\`python
pd.isna(np.nan)   # True
pd.isna(None)     # True
pd.isna(pd.NaT)   # True
np.nan == np.nan  # False  ← 绝不能用 == 判断
\`\`\`

### 为什么 NaN 不等于自己

IEEE 754 规定 NaN 与任何值比较（包括它自己）都返回 False。所以 \`df["price"] == np.nan\` 永远全 False，\`df["price"] != np.nan\` 永远全 True——这就是新手"筛不出缺失行"的根源。

## 三个层次的检查

\`\`\`python
df.isna()                 # 同形状布尔表
df.isna().sum()           # 每列缺失个数（Series）
df.isna().mean()          # 每列缺失率（0~1）
df.isna().any(axis=1)     # 每行是否有缺失
df.isna().all(axis=1)     # 每行是否全缺失（通常是坏行）
\`\`\`

\`isna()\` 返回的是**布尔 DataFrame**，\`sum()\` 默认沿列求和（\`axis=0\`），所以得到的是"每列缺失个数"。想按行统计要写 \`axis=1\`。

## 缺失率与决策

| 缺失率 | 常见处理 |
| --- | --- |
| 0% | 无需处理 |
| < 5% | 数值列用中位数/均值填充，或直接删除行 |
| 5% ~ 30% | 需要思考：是随机缺失还是业务性缺失？分组填充更稳 |
| > 30% | 谨慎考虑该列是否可用；或把"是否缺失"本身当作特征 |
| > 70% | 通常直接弃用该列 |

注意这只是经验值。**关键是区分"真缺失"和"业务性空值"**：比如 \`discount\` 列缺失往往表示"没有折扣"（应填 0），而不是"数据丢失"；\`return_reason\` 缺失表示"没有退货"。把业务性空值当缺失去填中位数，会引入严重偏差。

## 缺失值对聚合的影响

\`\`\`python
df["price"].sum()     # 默认 skipna=True，忽略 NaN 求和
df["price"].mean()    # 同理，分母是非缺失个数
df["price"].sum(skipna=False)   # 只要有 NaN 就返回 NaN
df["price"].count()   # 非缺失个数
df.shape[0]           # 总行数
df["price"].size      # 总个数（含缺失）
\`\`\`

\`count()\` 与 \`size\` 的差异，就是"有效样本数 vs 总样本数"，做同比、计算占比时尤其要注意分母。

## 常见的"伪缺失"

真实数据里还常有这些并未被 Pandas 识别为缺失的"空"：

- 空字符串 \`""\`、全空白 \`"   "\`；
- 字符串 \`"NULL"\`、\`"NaN"\`、\`"None"\`、\`"-"\`、\`"N/A"\`、\`"未知"\`；
- 数字哨兵值 \`-1\`、\`9999\`、\`0\`（某些系统用它们表示未知）。

这些值 \`isna()\` 都判断不出来，必须先替换成真正的 NaN，再进入后续流程。

<MissingValueDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
import pandas as pd
import numpy as np
df = pd.DataFrame({"a": [1.0, np.nan, 3.0], "b": ["x", "x", "x"]})
print(df.isna().sum())
print(df.dropna().shape, df.fillna(0).shape)
df2 = df.astype({"b": "category"})
print(df2.dtypes)
\`\`\`

预期输出（实测）：各列缺失计数；dropna 后 1 行、fillna 后 3 行；b 列转 category 类型

**常见错误**：fillna(0) 一刀切（应按列语义选策略）；inplace 习惯（新版推荐赋值式）；把 NaN 当 0 参与 mean（mean 默认跳过 NaN，但 sum 场景要显式）。

### 常见误区

1. NaN==NaN 为 True——实际是 False，要用 isna 判；
2. dropna 全表删太狠——subset 参数按关键列删；
3. astype 强转一定成功——非法字符串转数值会抛错，先 pd.to_numeric(errors=)。

### 知识关联

- **向前**：l-2-1 的布尔筛选是清洗的执行器；
- **向后**：l-4-1 时间序列的 NaT 同源；
- **平行**：SQL 的 NULL 三值逻辑。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 检测 | isna().sum() 按列 |
| 处理 | dropna(subset=) / fillna(策略) |
| 类型 | pd.to_numeric(errors="coerce") |

### 权威学术与工业来源

> **来源类型：原著专著 · 核心技术架构 (A 类)**
> - Wes McKinney (2017). *Python for Data Analysis: Data Wrangling with Pandas, NumPy, and IPython* (2nd ed.). O'Reilly Media / Ursa Labs. (Pandas 创始人权威原著)
> - Travis E. Oliphant (2006). *Guide to NumPy*. Trelgol Publishing. (NumPy 连续内存块与向量化广播理论基石)
> - Pandas Development Team. *pandas: powerful Python data analysis toolkit*. https://pandas.pydata.org/docs/


### 核心图解与交互演示

<Diagram type="missing" />
`,
      tips: [
        {
          kind: 'pitfall',
          text: '判断缺失只能用 pd.isna / df.isna() / notna()，不能用 == np.nan。因为 nan != nan 恒成立，df["x"] == np.nan 永远返回全 False。',
        },
        {
          kind: 'note',
          text: 'Pandas 3 中字符串列默认是 str dtype，缺失值本身也是 NaN（不是 pd.NA），isna() 能正常识别；但若你显式使用 StringDtype / Int64 等可空类型，缺失值会以 pd.NA 出现，同样用 isna() 判断即可。',
        },
        {
          kind: 'pitfall',
          text: '空字符串 "" 与 "NULL" / "未知" / "-" 这类哨兵值不会被 isna() 识别。读入后应显式替换成真正的缺失，例如 df.replace(["", "NULL", "-"], pd.NA)。',
        },
        {
          kind: 'interview',
          text: '面试常问「Pandas 中 NaN 与 None 的区别」。要点：NaN 是 float 类型、来自 NumPy，None 是 Python 单例对象；数值列共存时 None 会被转成 NaN（列变 float64）；两者都用 isna() 判断；时间列用 NaT。',
        },
      ],
      demos: [
        {
          title: 'NaN、None、NaT 的相同与不同',
          lang: 'python',
          code: `import numpy as np
import pandas as pd

print("pd.isna 统一判断：")
for v in [np.nan, None, pd.NaT, pd.NA, 0, ""]:
    print(f"  {repr(v):>10} -> {pd.isna(v)}")

print("NaN 与自身的比较：", np.nan == np.nan, "| np.nan != np.nan :", np.nan != np.nan)

df = pd.DataFrame({
    "price": [10.0, np.nan, 30.0],
    "city": ["北京", None, "上海"],
    "date": pd.to_datetime(["2024-01-01", None, "2024-01-03"]),
})
print()
print(df)
print("各列缺失个数:", df.isna().sum().to_dict())
print("各列取值类型:", [type(v).__name__ for v in df.iloc[1].tolist()])`,
        },
        {
          title: '缺失率统计与行级检查',
          lang: 'python',
          code: `import numpy as np
import pandas as pd

df = pd.DataFrame({
    "order_id": [1, 2, 3, 4, 5],
    "price": [10.0, np.nan, 30.0, np.nan, 50.0],
    "qty": [np.nan, 2, 3, 4, np.nan],
    "city": ["北京", "上海", None, "杭州", "成都"],
})

print("缺失个数:")
print(df.isna().sum())
print("缺失率:")
print((df.isna().mean() * 100).round(1))

print("每行缺失个数:", df.isna().sum(axis=1).tolist())
print("有缺失的行:", df.isna().any(axis=1).tolist())

print()
print("count 与 size 的差异:", df["price"].count(), "vs", df["price"].size)
print("sum 默认跳过 NaN:", df["price"].sum())`,
        },
      ],
    },

    /* ───────────────────── Lesson 2 ───────────────────── */
    {
      id: 'pandas-l-3-2',
      title: '填充与删除：fillna 的策略与 dropna 的三个参数',
      content: `
### 学习目标

学完本节，你应该能够：
1. 用 duplicated().sum() 数重复并用 drop_duplicates 去重；
2. 用 str.strip/replace 清理文本列；
3. 用 pd.to_numeric(errors="coerce") 修复类型。

### 前置知识

- loc/iloc 精确选数（l-2-1）；
- 缺失值 NaN 的判断（isna）。

### 问题背景

真实数据必脏：缺失、重复、类型错误占清洗时间的 70%——Pandas 的 isna/dropna/fillna/astype 是这套工序的标准化工具。

### 直觉理解

缺失值像问卷空题：可以扔掉整份卷子（dropna）、按多数答案填（fillna 众数/均值）、或标注“未答”（保留 NaN 让模型知道）。

### 核心概念与原理详解

## fillna 的六种常用策略

| 策略 | 写法 | 适用 | 风险 |
| --- | --- | --- | --- |
| 常数 | \`df["x"].fillna(0)\` | 计数、金额等"缺失即 0" | 不区分业务空值 |
| 均值 | \`fillna(df["x"].mean())\` | 近似正态的数值 | 受极值影响 |
| 中位数 | \`fillna(df["x"].median())\` | 偏态分布、有异常值 | 分布被"压扁" |
| 众数 | \`fillna(df["x"].mode()[0])\` | 类别型文本 | 类别比例被放大 |
| 前向/后向 | \`ffill()\` / \`bfill()\` | 时间序列、状态列 | 会"借用"未来或过去 |
| 分组填充 | \`groupby().transform()\` | 不同群体基线差异大 | 代码稍复杂 |

### 常数与统计量

\`\`\`python
df["price"] = df["price"].fillna(0)
df["price"] = df["price"].fillna(df["price"].median())
df["city"] = df["city"].fillna("未知")
\`\`\`

也可以**一次给多列指定不同填充值**：

\`\`\`python
df.fillna({"price": 0, "city": "未知", "qty": 1})
\`\`\`

注意：没有出现在字典里的列**不会被填充**。

### 前向填充与后向填充

\`\`\`python
s.ffill()            # 用上一个有效值填充（forward fill）
s.bfill()            # 用下一个有效值填充（backward fill）
s.ffill(limit=2)     # 最多连续填 2 个，避免填太多失真
\`\`\`

典型场景：库存快照、价格流水这种"值只在变化时记录"的数据，需要 ffill 把状态"铺开"。但**在普通业务表里随意 ffill 会引入严重偏差**——前一行是北京，不代表这一行也是北京。

### 分组填充：最贴近业务的做法

\`\`\`python
df["rating"] = df["rating"].fillna(df.groupby("category")["rating"].transform("median"))
\`\`\`

\`transform\` 会把分组统计量"广播"回原表的每一行（保持原索引），所以可以直接喂给 fillna。这比全局中位数合理得多：手机的平均评分和图书的平均评分本来就不该混在一起。

## dropna：三个参数决定删哪些行

| 参数 | 含义 | 示例 |
| --- | --- | --- |
| \`axis\` | 删行（0）还是删列（1） | \`dropna(axis=1)\` 删掉含缺失的列 |
| \`how\` | \`\\"any\\"\`（有一个就删）或 \`\\"all\\"\`（全空才删） | 默认 any，比较激进 |
| \`thresh\` | 至少保留多少个**非缺失**值，否则删除 | \`dropna(thresh=3)\` 保留非空 ≥ 3 的列 |
| \`subset\` | 只看这几列是否有缺失 | \`dropna(subset=[\\"order_id\\"])\` |

最常用的是 \`subset\`：**只有当主键或关键字段缺失时才删行**，其它列的缺失用填充解决。

\`\`\`python
df.dropna(subset=["order_id", "user_id"])   # 主键缺失的行没有价值
df.dropna(how="all")                       # 只删全空行
df.dropna(thresh=len(df.columns) - 1)      # 允许每行缺 1 个
\`\`\`

## 先填还是先删？

推荐顺序：**先删"关键字段缺失"的行 → 再对剩余缺失做填充 → 最后记录填充比例**。

原因：关键字段（主键、金额、时间）缺失的行通常无法用统计量补救，填充只会制造假数据；而次要字段（备注、渠道）缺失的行仍有分析价值。

无论选哪种，都建议在清洗日志里记下：**删了多少行（占比多少）、每列填充了什么值**。这在复盘数据口径时能救命。

<MissingValueDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
import pandas as pd
import numpy as np
df = pd.DataFrame({"a": [1.0, np.nan, 3.0], "b": ["x", "x", "x"]})
print(df.isna().sum())
print(df.dropna().shape, df.fillna(0).shape)
df2 = df.astype({"b": "category"})
print(df2.dtypes)
\`\`\`

预期输出（实测）：各列缺失计数；dropna 后 1 行、fillna 后 3 行；b 列转 category 类型

**常见错误**：fillna(0) 一刀切（应按列语义选策略）；inplace 习惯（新版推荐赋值式）；把 NaN 当 0 参与 mean（mean 默认跳过 NaN，但 sum 场景要显式）。

### 常见误区

1. NaN==NaN 为 True——实际是 False，要用 isna 判；
2. dropna 全表删太狠——subset 参数按关键列删；
3. astype 强转一定成功——非法字符串转数值会抛错，先 pd.to_numeric(errors=)。

### 知识关联

- **向前**：l-2-1 的布尔筛选是清洗的执行器；
- **向后**：l-4-1 时间序列的 NaT 同源；
- **平行**：SQL 的 NULL 三值逻辑。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 检测 | isna().sum() 按列 |
| 处理 | dropna(subset=) / fillna(策略) |
| 类型 | pd.to_numeric(errors="coerce") |

### 权威学术与工业来源

> **来源类型：原著专著 · 核心技术架构 (A 类)**
> - Wes McKinney (2017). *Python for Data Analysis: Data Wrangling with Pandas, NumPy, and IPython* (2nd ed.). O'Reilly Media / Ursa Labs. (Pandas 创始人权威原著)
> - Travis E. Oliphant (2006). *Guide to NumPy*. Trelgol Publishing. (NumPy 连续内存块与向量化广播理论基石)
> - Pandas Development Team. *pandas: powerful Python data analysis toolkit*. https://pandas.pydata.org/docs/
`,
      tips: [
        {
          kind: 'pitfall',
          text: 'fillna 不加 inplace 时返回新对象，原表不生效：df["x"].fillna(0) 这一行执行完什么都不变。必须写成 df["x"] = df["x"].fillna(0)，或 df.fillna(0, inplace=True)。',
        },
        {
          kind: 'pitfall',
          text: 'dropna() 默认 how="any"，只要任意一列缺失就删行，在大表上往往一行不剩。生产代码里请显式写 subset 或 thresh，把删除范围收窄。',
        },
        {
          kind: 'performance',
          text: 'groupby().transform("median") 比 groupby().apply(lambda x: x.fillna(x.median())) 快得多，而且返回的索引与 transform 对齐，不需要额外 merge。',
        },
        {
          kind: 'note',
          text: 'ffill / bfill 会引入"时间泄漏"：如果你在建模时用 bfill，等于用未来数据填过去，评估结果会虚高。时序数据只允许向后看的历史值。',
        },
      ],
      demos: [
        {
          title: 'fillna 的几种策略对比',
          lang: 'python',
          code: `import numpy as np
import pandas as pd

s = pd.Series([10.0, np.nan, np.nan, 40.0, np.nan, 30.0], name="price")
print("原值:")
print(s.tolist())
print("填 0     :", s.fillna(0).tolist())
print("填均值   :", [round(v, 2) for v in s.fillna(s.mean()).tolist()])
print("填中位数 :", s.fillna(s.median()).tolist())
print("ffill    :", s.ffill().tolist())
print("bfill    :", s.bfill().tolist())
print("ffill(limit=1):", s.ffill(limit=1).tolist())`,
        },
        {
          title: '多列差异填充与分组填充',
          lang: 'python',
          code: `import numpy as np
import pandas as pd

df = pd.DataFrame({
    "goods": ["手机", "手机", "手机", "图书", "图书", "图书"],
    "price": [3000.0, np.nan, 2800.0, np.nan, 45.0, 60.0],
    "qty": [1, 2, np.nan, 3, np.nan, 1],
    "city": ["北京", np.nan, "上海", np.nan, "北京", "上海"],
})

print("多列不同填充值:")
print(df.fillna({"price": 0, "qty": 1, "city": "未知"}))

print()
print("按 goods 分组用中位数填 price:")
df["price"] = df["price"].fillna(df.groupby("goods")["price"].transform("median"))
print(df[["goods", "price"]])`,
        },
      ],
    },

    /* ───────────────────── Lesson 3 ───────────────────── */
    {
      id: 'pandas-l-3-3',
      title: '去重、文本清洗与值替换：duplicated / str / replace / map / apply',
      content: `
### 学习目标

学完本节，你应该能够：
1. 用 map/replace 做值映射与标准化；
2. 用 cut/qbin 把连续值分箱；
3. 说出清洗前后记录数与分布的对照报告要点。

### 前置知识

- loc/iloc 精确选数（l-2-1）；
- 缺失值 NaN 的判断（isna）。

### 问题背景

真实数据必脏：缺失、重复、类型错误占清洗时间的 70%——Pandas 的 isna/dropna/fillna/astype 是这套工序的标准化工具。

### 直觉理解

缺失值像问卷空题：可以扔掉整份卷子（dropna）、按多数答案填（fillna 众数/均值）、或标注“未答”（保留 NaN 让模型知道）。

### 核心概念与原理详解

## 重复值：先看清楚"重复"指什么

| 方法 | 作用 | 关键参数 |
| --- | --- | --- |
| \`df.duplicated()\` | 返回布尔 Series，True 表示该行是重复出现的 | \`subset=[order_id]\` 只看指定列；\`keep=first / last / False\` |
| \`df.drop_duplicates()\` | 删除重复行 | 同上 |
| \`s.duplicated()\` | 单列去重 | 同上 |

\`keep\` 的语义很容易记错：

- \`keep=\\"first\\"\`（默认）：**保留第一次出现**，后面的标记为重复；
- \`keep=\\"last\\"\`：保留最后一次；
- \`keep=False\`：所有重复项都标记为 True，常用来"查看全部重复记录"。

\`\`\`python
df.duplicated().sum()                       # 完全重复的行数
df.drop_duplicates(subset=["order_id"])     # 按业务主键去重
df[df.duplicated(keep=False)]               # 把冲突的行都揪出来人工核对
\`\`\`

**去重前一定先确认主键**。订单表按 \`order_id\` 去重、"订单明细表"则要按 \`order_id + sku_id\` 去重，选错主键会误删有效数据。

## 文本清洗：.str 访问器

对文本列使用 \`.str.xxx()\` 进行**向量化**的字符串操作，全部返回 Series：

| 方法 | 作用 | 示例 |
| --- | --- | --- |
| \`str.strip()\` | 去首尾空白 | \`" 北京 ".str.strip()\` |
| \`str.lower()\` / \`upper()\` | 大小写统一 | \`str.lower()\` |
| \`str.replace(a, b, regex=False)\` | 替换子串 | 去掉"市"字 |
| \`str.contains(pat, na=False)\` | 是否包含（返回布尔） | 模糊匹配 |
| \`str.startswith\` / \`endswith\` | 前后缀 | 筛选编码前缀 |
| \`str.split(sep, expand=True)\` | 拆分成多列 | 拆 \`"A-01"\` |
| \`str.extract(r"regex", expand=True)\` | 正则提取分组 | 从地址里抽省市区 |
| \`str.len()\` / \`str.count()\` | 长度 / 出现次数 | 校验手机号位数 |
| \`str.get(i)\` | 取切分后的第 i 段 | 取 \`"A-01"\` 的第二段 |

### 三个高频坑

1. **\`str.replace\` 默认按正则处理**，要按字面替换请写 \`regex=False\`；
2. **\`str.contains\` 遇到缺失值会给出 NA**，直接当掩码用会抛 \`ValueError\`，务必加 \`na=False\`；
3. **\`str.split(expand=True)\` 的列名是 0、1、2**，需要自己改名。

### 正则提取

\`\`\`python
# 从「北京市朝阳区 建国路 88 号」里抽出电话或编号
df["phone"] = df["raw"].str.extract(r"(1[3-9]\\d{9})", expand=False)
df[["brand", "num"]] = df["code"].str.extract(r"(\\w+)-(\\d+)")
\`\`\`

\`str.extract\` 只返回**捕获组**的内容，没匹配到的位置得到 NaN，非常适合作"抽取 + 标记缺失"的一步到位方案。

## 替换与映射：replace / map / apply

| 工具 | 作用于 | 典型用途 |
| --- | --- | --- |
| \`Series.replace(a, b)\` | 精确值替换 | 把 \`"北京市"\` 统一成 \`"北京"\`；支持列表与字典 |
| \`Series.map(dict)\` | 按字典映射 | 地区 → 大区；编码 → 名称；**没匹配到自动变成 NaN** |
| \`Series.map(func)\` | 单值函数 | 逐元素自定义逻辑（比 replace 慢一些） |
| \`Series.apply(func)\` | 单值/行/列函数 | 复杂逻辑、跨列计算 |
| \`DataFrame.apply(func, axis=1)\` | 整行 | 需要同时用到多列的判断 |

\`map\` 与 \`replace\` 的核心差异：**map 里没出现的值会变成 NaN，而 replace 里没出现的值保持原样**。所以：

- 做"分类映射、非法值变缺失"→ 用 \`map\`；
- 做"局部修正、其它保持不变"→ 用 \`replace\`。

\`\`\`python
df["region"] = df["province"].map({"北京": "华北", "上海": "华东"})   # 其它省 → NaN
df["city"] = df["city"].replace({"北京市": "北京", "上海市": "上海"})  # 其它不变
\`\`\`

\`apply\` 灵活性最高，但它是**逐行 Python 调用**，大数据上会比向量化慢一到两个数量级（第 6 章会量化），能用 \`np.where\` / \`str\` / \`map\` 解决的都不要用 \`apply\`。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
import pandas as pd
import numpy as np
df = pd.DataFrame({"a": [1.0, np.nan, 3.0], "b": ["x", "x", "x"]})
print(df.isna().sum())
print(df.dropna().shape, df.fillna(0).shape)
df2 = df.astype({"b": "category"})
print(df2.dtypes)
\`\`\`

预期输出（实测）：各列缺失计数；dropna 后 1 行、fillna 后 3 行；b 列转 category 类型

**常见错误**：fillna(0) 一刀切（应按列语义选策略）；inplace 习惯（新版推荐赋值式）；把 NaN 当 0 参与 mean（mean 默认跳过 NaN，但 sum 场景要显式）。

### 常见误区

1. NaN==NaN 为 True——实际是 False，要用 isna 判；
2. dropna 全表删太狠——subset 参数按关键列删；
3. astype 强转一定成功——非法字符串转数值会抛错，先 pd.to_numeric(errors=)。

### 知识关联

- **向前**：l-2-1 的布尔筛选是清洗的执行器；
- **向后**：l-4-1 时间序列的 NaT 同源；
- **平行**：SQL 的 NULL 三值逻辑。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 检测 | isna().sum() 按列 |
| 处理 | dropna(subset=) / fillna(策略) |
| 类型 | pd.to_numeric(errors="coerce") |

### 权威学术与工业来源

> **来源类型：原著专著 · 核心技术架构 (A 类)**
> - Wes McKinney (2017). *Python for Data Analysis: Data Wrangling with Pandas, NumPy, and IPython* (2nd ed.). O'Reilly Media / Ursa Labs. (Pandas 创始人权威原著)
> - Travis E. Oliphant (2006). *Guide to NumPy*. Trelgol Publishing. (NumPy 连续内存块与向量化广播理论基石)
> - Pandas Development Team. *pandas: powerful Python data analysis toolkit*. https://pandas.pydata.org/docs/
`,
      tips: [
        {
          kind: 'pitfall',
          text: 'keep 的语义常被记反：drop_duplicates(keep="first") 保留第一次出现，后面的删掉；keep=False 才是"所有重复项都不保留"，用于查看冲突。',
        },
        {
          kind: 'pitfall',
          text: 'str.contains 的结果里可能有 NA，直接 df[cond] 会抛 ValueError: Cannot mask with non-boolean array containing NA。永远显式写 na=False。',
        },
        {
          kind: 'note',
          text: 'map 的字典里没有的键会变成 NaN，这经常是"映射后突然出现大量缺失"的原因。用 map 后请立刻 isna().sum() 检查一遍，必要时配合 fillna 保留原值。',
        },
        {
          kind: 'performance',
          text: '文本清洗优先用 .str 向量化方法（底层是 C 实现）而不是 apply(lambda s: s.strip())；分列优先用 str.split(expand=True) 或 str.extract 而不是 apply(lambda s: s.split(...))。',
        },
      ],
      demos: [
        {
          title: '文本清洗：strip / lower / replace / contains',
          lang: 'python',
          code: `import pandas as pd

raw = pd.Series(["  北京 ", "北京市", "SHANGHAI", " shanghai", None])
clean = raw.str.strip().str.replace("市", "", regex=False).str.lower()

print("原始:")
print(raw.tolist())
print("清理后:")
print(clean.tolist())

print("包含 '上海' 吗:", clean.str.contains("上海|shanghai", na=False).tolist())
print("长度:", clean.str.len().tolist())`,
        },
        {
          title: 'split 拆列与 extract 正则提取',
          lang: 'python',
          code: `import pandas as pd

df = pd.DataFrame({
    "code": ["BJ-001", "SH-102", "HZ-233", "bad"],
    "contact": ["张三 13812345678", "李四 13900001111", "王五 无", "x"],
})

df[["city_code", "num"]] = df["code"].str.split("-", expand=True)
df["phone"] = df["contact"].str.extract(r"(1[3-9]\\d{9})", expand=False)
df["has_phone"] = df["phone"].notna()
print(df)`,
        },
      ],
    },
  ],

  exercises: [
    /* ---------- 1 single ---------- */
    {
      id: 'pandas-3-e1',
      type: 'single',
      difficulty: 1,
      question: '要判断 `df["price"]` 中哪些是缺失值，**正确**的写法是？',
      options: [
        { value: 'A', text: '`df["price"] == np.nan`' },
        { value: 'B', text: '`df["price"].isna()`' },
        { value: 'C', text: '`df["price"] != np.nan`' },
        { value: 'D', text: '`df["price"] == None`' },
      ],
      answer: 'B',
      explanation:
        'IEEE 754 规定 `nan != nan`，所以任何与 `np.nan` 的 `==` / `!=` 比较都无法识别缺失（`==` 全 False、`!=` 全 True）。`isna()` / `notna()` 才是标准判断方法，它们同时能识别 `None`、`NaT`、`pd.NA`。',
      relatedLessonId: 'pandas-l-3-1',
      tags: ['缺失值', 'isna'],
    },
    /* ---------- 2 judge ---------- */
    {
      id: 'pandas-3-e2',
      type: 'judge',
      difficulty: 1,
      question: '`pd.isna(None)` 与 `pd.isna(np.nan)` 的返回值都是 `True`。',
      answer: true,
      explanation:
        '`pd.isna` 会统一识别 `None`、`np.nan`、`NaT`、`pd.NA` 等所有缺失形态，这正是它优于 `== np.nan` 的原因。',
      relatedLessonId: 'pandas-l-3-1',
      tags: ['缺失值'],
    },
    /* ---------- 3 multiple ---------- */
    {
      id: 'pandas-3-e3',
      type: 'multiple',
      difficulty: 2,
      question: '下列哪些值**不会**被 `df.isna()` 识别为缺失？（多选）',
      options: [
        { value: 'A', text: '空字符串 `""`' },
        { value: 'B', text: '字符串 `"NULL"`' },
        { value: 'C', text: '`None`' },
        { value: 'D', text: '字符串 `"-"`' },
        { value: 'E', text: '`np.nan`' },
      ],
      answer: ['A', 'B', 'D'],
      explanation:
        '`""`、`"NULL"`、`"-"` 都是**合法的非空字符串**，只是人眼中像"空"。`None` 与 `np.nan` 才是真正的缺失。清洗时需要先用 `replace` 把这类哨兵值转成 `pd.NA` 或 `np.nan`。',
      relatedLessonId: 'pandas-l-3-1',
      tags: ['缺失值', '伪缺失'],
    },
    /* ---------- 4 fill ---------- */
    {
      id: 'pandas-3-e4',
      type: 'fill',
      difficulty: 2,
      question: '用「前一个有效值」填充 Series 中的缺失，补全方法名：\n\n```python\ns.___()\n```',
      blanks: [['ffill', 'pad']],
      explanation:
        '`ffill()`（旧名 `pad()`）做前向填充，`bfill()` 做后向填充。可以加 `limit=n` 限制连续填充的个数，防止把一段长期断档的数据填成一条直线。',
      caseSensitive: true,
      relatedLessonId: 'pandas-l-3-2',
      tags: ['fillna', 'ffill'],
    },
    /* ---------- 5 code ---------- */
    {
      id: 'pandas-3-e5',
      relatedLessonId: 'pandas-l-3-1',
      type: 'code',
      difficulty: 2,
      question:
        '**缺失值体检与填充。**给定订单表 `df`，请：\n\n1. `missing_by_col`：每列缺失个数（Series）；\n2. 把 `price` 列的缺失用**该列中位数**填充（原地写回）；\n3. 把 `city` 列的缺失用字符串 `"未知"` 填充（原地写回）。',
      starterCode: `import pandas as pd
import numpy as np

df = pd.DataFrame({
    "order_id": [1001, 1002, 1003, 1004, 1005],
    "price": [120.0, np.nan, 80.0, np.nan, 100.0],
    "city": ["北京", "上海", None, "北京", "杭州"],
})

missing_by_col = ___
df["price"] = ___
df["city"] = ___
`,
      setupCode: '',
      expectedOutput: 'price 变为 [120.0, 100.0, 80.0, 100.0, 100.0]；city 缺失填「未知」',
      tests: [
        'assert [int(v) for v in missing_by_col.tolist()] == [0, 2, 1], f"各列缺失个数应为 [0, 2, 1]，实际为 {missing_by_col.tolist()}"',
        'assert int(df["price"].isna().sum()) == 0, "price 不应再有缺失"',
        'assert df["price"].tolist() == [120.0, 100.0, 80.0, 100.0, 100.0], f"price 应为 [120.0, 100.0, 80.0, 100.0, 100.0]，实际为 {df[\'price\'].tolist()}"',
        'assert int(df["city"].isna().sum()) == 0, "city 不应再有缺失"',
        'assert df["city"].tolist() == ["北京", "上海", "未知", "北京", "杭州"], f"city 应把缺失填为 未知，实际为 {df[\'city\'].tolist()}"',
      ].join('\n'),
      explanation:
        '```python\nmissing_by_col = df.isna().sum()\ndf["price"] = df["price"].fillna(df["price"].median())\ndf["city"] = df["city"].fillna("未知")\n```\n\n`median()` 会自动跳过 NaN，[120, 80, 100] 的中位数是 100。注意必须写成 `df["price"] = df["price"].fillna(...)`，只写 `df["price"].fillna(...)` 不会修改原表。',
      tags: ['缺失值', 'fillna', '中位数'],
    },
    /* ---------- 6 single ---------- */
    {
      id: 'pandas-3-e6',
      type: 'single',
      difficulty: 2,
      question: '`df` 有 5 行 4 列，执行 `df.dropna()` 后变成 0 行。最可能的原因是？',
      options: [
        { value: 'A', text: '`dropna()` 默认 `how="any"`，只要有一列缺失就删行' },
        { value: 'B', text: '`dropna()` 默认删除所有行，是 bug' },
        { value: 'C', text: '`dropna()` 会先把整表转成 NaN' },
        { value: 'D', text: '必须传 `axis=1` 才不会删光' },
      ],
      answer: 'A',
      explanation:
        '默认 `how="any"` 表示"任意列有缺失就删除该行"，4 列的表中每行恰好至少缺一列时就会全删。生产代码应写 `subset` 只检查关键列，或用 `thresh` 控制容忍度。',
      relatedLessonId: 'pandas-l-3-2',
      tags: ['dropna', '陷阱'],
    },
    /* ---------- 7 code ---------- */
    {
      id: 'pandas-3-e7',
      relatedLessonId: 'pandas-l-3-2',
      type: 'code',
      difficulty: 3,
      question:
        '**按业务规则删除坏行。**给定订单表 `df`，请保存清洗后的表到 `clean_df`：\n\n1. 删除 `order_id` 或 `price` 任一缺失的行（其它列的缺失不影响）；\n2. 删除 `order_id` 重复的行，**保留第一次出现**的那条；\n3. 结果索引需重置为 0..n-1。\n\n另外计算 `removed_rows`：原始行数减清洗后行数（int）。',
      starterCode: `import pandas as pd
import numpy as np

df = pd.DataFrame({
    "order_id": [1, 2, 2, 3, np.nan, 4, 4],
    "price": [10.0, 20.0, 25.0, np.nan, 30.0, 40.0, 45.0],
    "city": ["北京", "上海", "上海", np.nan, "杭州", None, "北京"],
})

clean_df = ___
removed_rows = ___
`,
      setupCode: '',
      expectedOutput: 'clean_df 3 行（order_id = 1, 2, 4），removed_rows = 4',
      tests: [
        'assert isinstance(clean_df, pd.DataFrame), "clean_df 应为 DataFrame"',
        'assert clean_df.shape == (3, 3), f"clean_df 应为 3 行 3 列，实际为 {clean_df.shape}"',
        'assert clean_df["order_id"].tolist() == [1, 2, 4], f"order_id 应为 [1, 2, 4]，实际为 {clean_df[\'order_id\'].tolist()}"',
        'assert clean_df["price"].tolist() == [10.0, 20.0, 40.0], f"price 应为 [10.0, 20.0, 40.0]（重复保留第一条），实际为 {clean_df[\'price\'].tolist()}"',
        'assert list(clean_df.index) == [0, 1, 2], f"索引应重置为 0..2，实际为 {list(clean_df.index)}"',
        'assert removed_rows == 4, f"removed_rows 应为 4，实际为 {removed_rows}"',
      ].join('\n'),
      explanation:
        '```python\nclean_df = df.dropna(subset=["order_id", "price"]).drop_duplicates(subset=["order_id"]).reset_index(drop=True)\nremoved_rows = len(df) - len(clean_df)\n```\n\n过程推演：先按关键列删行，去掉第 4 行（price 缺失）与第 5 行（order_id 缺失）；剩下的 order_id 为 1,2,2,4,4；再按 order_id 去重保留第一条，得到 1、2、4 三行；最后 `reset_index(drop=True)` 让索引连续。注意 `drop=True` 很关键，否则会把旧索引变成一列新增字段。',
      tags: ['dropna', 'drop_duplicates', 'reset_index'],
    },
    /* ---------- 8 judge ---------- */
    {
      id: 'pandas-3-e8',
      type: 'judge',
      difficulty: 2,
      question: '`df["price"].fillna(0)` 这一行执行后，`df` 中的缺失值就已经被填成 0 了。',
      answer: false,
      explanation:
        '`fillna` 默认返回**新的 Series**，不会修改原对象。必须赋值回去 `df["price"] = df["price"].fillna(0)`，或显式写 `inplace=True`。这是数据清洗脚本里最常见的一类"写了但没生效"。',
      relatedLessonId: 'pandas-l-3-2',
      tags: ['fillna', '陷阱'],
    },
    /* ---------- 9 multiple ---------- */
    {
      id: 'pandas-3-e9',
      type: 'multiple',
      difficulty: 3,
      question: '关于 `dropna(subset=["order_id"])`，下列说法**正确**的是？（多选）',
      options: [
        { value: 'A', text: '只检查 `order_id` 是否有缺失，其它列有缺失也不删行' },
        { value: 'B', text: '等价于 `df[df["order_id"].notna()]`' },
        { value: 'C', text: '默认会修改原 DataFrame' },
        { value: 'D', text: '可以使用多列作为 subset，表示"这些列全都缺失才删"' },
      ],
      answer: ['A', 'B'],
      explanation:
        'A、B 正确。C 错误：`dropna` 返回新对象，需要重新赋值才能生效。D 错误：多列 subset 默认仍是 `how="any"`，即**只要其中一列缺失就删行**；要"全都缺失才删"需要传 `how="all"`。',
      relatedLessonId: 'pandas-l-3-2',
      tags: ['dropna'],
    },
    /* ---------- 10 fill ---------- */
    {
      id: 'pandas-3-e10',
      type: 'fill',
      difficulty: 2,
      question: '删除 DataFrame 中被完全重复的记录（保留第一条），补全方法名：\n\n```python\ndf.___()\n```',
      blanks: [['drop_duplicates']],
      explanation:
        '`drop_duplicates()` 默认 `keep="first"`，即保留第一次出现的行。只想按某些列判重时传 `subset=["order_id"]`。',
      caseSensitive: true,
      relatedLessonId: 'pandas-l-3-3',
      tags: ['去重'],
    },
    /* ---------- 11 code ---------- */
    {
      id: 'pandas-3-e11',
      relatedLessonId: 'pandas-l-3-3',
      type: 'code',
      difficulty: 3,
      question:
        '**文本清洗流水线。**`city_raw` 里是各城市名称，存在首尾空格、大小写不统一、"市"字后缀、空字符串等问题。请得到 `city_clean`（Series），处理顺序为：\n\n1. 去掉首尾空白；\n2. 统一转小写；\n3. 去掉结尾的 `"市"` 字（按字面替换，不用正则）；\n4. 把空字符串 `""` 变成缺失值（NaN）。\n\n再计算 `unique_cities`：清洗后**非空**的唯一城市名列表（按首次出现顺序，元素为 str）。',
      starterCode: `import pandas as pd
import numpy as np

city_raw = pd.Series(["  北京 ", "北京市", "SHANGHAI", " shanghai ", "", "杭州", None])

city_clean = ___
unique_cities = ___
`,
      setupCode: '',
      expectedOutput: 'city_clean = [北京, 北京, shanghai, shanghai, NaN, 杭州, NaN]，unique_cities 长度 3',
      tests: [
        'assert isinstance(city_clean, pd.Series), "city_clean 应为 Series"',
        'assert city_clean.iloc[0] == "北京" and city_clean.iloc[1] == "北京", "北京 与 北京市 都应清洗成 北京"',
        'assert city_clean.iloc[2] == "shanghai" and city_clean.iloc[3] == "shanghai", "大小写与空格应被统一成 shanghai"',
        'assert pd.isna(city_clean.iloc[4]), "空字符串应被转成缺失值"',
        'assert pd.isna(city_clean.iloc[6]), "None 应保持缺失"',
        'assert city_clean.iloc[5] == "杭州", "杭州 应保持不变"',
        'assert set(unique_cities) == {"北京", "shanghai", "杭州"}, f"unique_cities 应为 北京/shanghai/杭州 三个值，实际为 {unique_cities}"',
      ].join('\n'),
      answer: `import pandas as pd
import numpy as np

city_raw = pd.Series(["  北京 ", "北京市", "SHANGHAI", " shanghai ", "", "杭州", None])

city_clean = (
    city_raw.astype("string")
    .str.strip()
    .str.lower()
    .str.replace("市", "", regex=False)
    .replace({"": pd.NA})
)
city_clean = city_clean.where(city_clean.notna(), np.nan)
city_clean = city_clean.replace("北京", "北京")
unique_cities = sorted(city_clean.dropna().unique().tolist())`,
      explanation:
        '```python\ncity_clean = city_raw.str.strip().str.lower().str.replace("市", "", regex=False)\ncity_clean = city_clean.mask(city_clean == "")\nunique_cities = city_clean.dropna().drop_duplicates().tolist()\n```\n\n要点：\n1. `regex=False` 保证"市"按字面替换；\n2. `mask(条件)` 会把满足条件的位置置为 NaN，等价于 `city_clean.replace("", np.nan)`；\n3. `drop_duplicates()` 保留首次出现顺序，得到 `["北京", "shanghai", "杭州"]`。\n\n若先做去重再清洗，会把 `"北京 "` 和 `"北京市"` 当成两个不同城市，这是清洗顺序导致结果错误（整体形状与数量对不上）的典型原因。',
      tags: ['文本清洗', 'str', '去重'],
    },
    /* ---------- 12 single ---------- */
    {
      id: 'pandas-3-e12',
      type: 'single',
      difficulty: 2,
      question:
        '`df["city"].map({"北京": "华北", "上海": "华东"})` 中，原本是 `"杭州"` 的单元格会变成什么？',
      options: [
        { value: 'A', text: '保持 `"杭州"` 不变' },
        { value: 'B', text: '变成 `NaN`' },
        { value: 'C', text: '报 KeyError' },
        { value: 'D', text: '变成空字符串 `""`' },
      ],
      answer: 'B',
      explanation:
        '`map` 用字典做查找，**没匹配到的键会返回 NaN**。如果希望"没有映射就保留原值"，应改用 `replace(字典)`，或 `map(字典).fillna(df["city"])`。这个特性常被用来做数据校验：映射后突然多出一堆 NaN，说明映射表漏了类目。',
      relatedLessonId: 'pandas-l-3-3',
      tags: ['map', 'replace'],
    },
    /* ---------- 13 open ---------- */
    {
      id: 'pandas-3-e13',
      type: 'open',
      difficulty: 3,
      question:
        '业务方给你一张 100 万行、30 列的电商订单表，反馈"清洗后样本量只剩 60 万，导致 GMV 指标和财务对不上"。请说明你会怎样**系统性地定位问题**，并列出你在清洗流程中会坚持的至少 4 条工程规范。',
      referenceAnswer: `**定位思路**：

1. **量化每一步的删行量**。把清洗拆成有日志的步骤，逐步记录 \`len(df)\` 的变化：缺失检查 → 去重 → 类型转换（\`to_numeric(errors="coerce")\` 会把脏值变 NaN，进而被 dropna 删掉）→ 业务过滤（状态、时间范围）。通常在"类型转换 + dropna"这一步会意外丢掉大量数据。
2. **对比口径**。与财务对齐：时间范围（下单时间 vs 支付时间）、订单状态（是否剔除已取消/已退款）、币种与含税。往往这 40% 的差异就是口径不同，而不是数据质量问题。
3. **检查"伪缺失"**。如果脏值被 \`to_numeric(errors="coerce")\` 变成了 NaN，要统计这样的行有多少，并逐条看几条样本，判断是转换规则问题还是数据源问题。
4. **检查 dropna 的默认参数**。\`dropna()\` 的默认 \`how="any"\` 在 30 列的表上极其激进，一行只要缺一个可选字段就被删。应改成 \`subset=[关键列]\`。
5. **抽样核对**。随机抽 20 条被删的行，人工核对它们是否真的该删；再随机抽 20 条保留的行，检查是否有本该删掉的。

**工程规范（任答 4 条）**：

- 清洗前后都输出**行数与关键指标汇总**，并保存清洗日志（清洗后行数、删除的行数及原因分布）；
- 删除操作必须显式写 \`subset\` 或 \`thresh\`，禁止裸用 \`dropna()\`；
- 对所有统计量填充记录**填充了哪些列、用的什么值、填充比例**；
- 关键字段（主键、金额、时间）缺失的行先过滤，次要字段用填充而不是删行；
- 清洗函数保持纯函数风格（返回新表，不改输入），方便回溯与单元测试；
- 上生产前用 \`validateContent\` 式的断言检查：行数变化在合理范围内、主键唯一、金额非负等。`,
      rubric: [
        { point: '提出逐步记录行数变化、定位到底哪一步丢了数据', score: 2 },
        { point: '指出 dropna 默认 how="any" 在多列表上的激进行为', score: 2 },
        { point: '指出 to_numeric(coerce) 会把脏值变 NaN 进而被删除', score: 1 },
        { point: '提出与财务对齐口径（状态/时间/含税）', score: 1 },
        { point: '给出可落地的清洗日志/断言规范', score: 1 },
        { point: '提出抽样人工核对', score: 1 },
      ],
      keywords: ['dropna', 'subset', '口径', '日志', '抽样', 'to_numeric'],
      explanation:
        '这题考察"数据质量排查"的工程思维。能说出"清洗必须可解释、可回溯、有日志"的人，通常已经在大表上踩过坑。',
      relatedLessonId: 'pandas-l-3-2',
      tags: ['数据质量', '业务', '面试'],
    },
    /* ---------- 14 judge ---------- */
    {
      id: 'pandas-3-e14',
      type: 'judge',
      difficulty: 2,
      question: '`df.duplicated()` 默认把第一次出现的那一行也标记为 `True`。',
      answer: false,
      explanation:
        '默认 `keep="first"`，第一次出现的行标记为 `False`（保留），之后再出现的标记为 `True`（重复）。`keep=False` 时所有重复项都标记为 True。',
      relatedLessonId: 'pandas-l-3-3',
      tags: ['去重', 'duplicated'],
    },
    /* ---------- 15 fill ---------- */
    {
      id: 'pandas-3-e15',
      type: 'fill',
      difficulty: 3,
      question:
        '`df.columns` 中有 `"price"`、`"city"` 两列含缺失。想**一次性为不同列指定不同的填充值**，补全方法名与写法：\n\n```python\ndf = df.___({"price": 0, "city": "未知"})\n```',
      blanks: [['fillna']],
      explanation:
        '`fillna` 接受字典参数，键为列名、值为填充值。没写进字典的列不会被填充。这是清洗多列表时最省事的写法。',
      caseSensitive: true,
      relatedLessonId: 'pandas-l-3-2',
      tags: ['fillna'],
    },
    /* ---------- 16 code ---------- */
    {
      id: 'pandas-3-e16',
      relatedLessonId: 'pandas-l-3-3',
      type: 'code',
      difficulty: 4,
      question:
        '**值映射与替换。**给定省份列 `province`，请：\n\n1. `region`：用 **map** 按映射表把省份映射为大区（未在表中的省份记为缺失）；\n2. `province_std`：用 **replace** 把 `"北京市"` 统一成 `"北京"`、`"上海市"` 统一成 `"上海"`，其它值保持不变；\n3. `n_unmapped`：映射后缺失的个数（int）；\n4. `region_counts`：各大区出现次数（Series，索引为大区名），**不计缺失**。',
      starterCode: `import pandas as pd

df = pd.DataFrame({
    "province": ["北京市", "上海市", "北京", "杭州", "杭州", "成都", "广州"],
})

mapping = {"北京": "华北", "上海": "华东", "杭州": "华东"}

region = ___
province_std = ___
n_unmapped = ___
region_counts = ___
`,
      setupCode: '',
      expectedOutput: 'n_unmapped = 4；region_counts = {华东: 2, 华北: 1}',
      tests: [
        'assert isinstance(region, pd.Series), "region 应为 Series"',
        'assert region.tolist()[2:5] == ["华北", "华东", "华东"], f"region 第 3~5 项应为 [华北, 华东, 华东]，实际为 {region.tolist()[2:5]}"',
        'assert int(region.isna().sum()) == 4, f"region 缺失应为 4 个（未映射的 北京市/上海市/成都/广州），实际为 {int(region.isna().sum())}"',
        'assert province_std.tolist() == ["北京", "上海", "北京", "杭州", "杭州", "成都", "广州"], f"province_std 不正确：{province_std.tolist()}"',
        'assert n_unmapped == 4, f"n_unmapped 应为 4，实际为 {n_unmapped}"',
        'assert int(region_counts.get("华东", 0)) == 2, f"华东 应为 2 次，实际为 {int(region_counts.get(\'华东\', 0))}"',
        'assert int(region_counts.get("华北", 0)) == 1, f"华北 应为 1 次，实际为 {int(region_counts.get(\'华北\', 0))}"',
      ].join('\n'),
      explanation:
        '```python\nregion = df["province"].map(mapping)\nprovince_std = df["province"].replace({"北京市": "北京", "上海市": "上海"})\nn_unmapped = int(region.isna().sum())\nregion_counts = region.value_counts()\n```\n\n`"北京市"` 与 `"上海市"` 不在 mapping 的键里，所以 `map` 把它们变成 NaN（共 4 个：北京市、上海市、成都、广州）。这也暴露了真实业务里常见的问题：**映射表没有覆盖所有数据口径**，应先标准化再映射。若先做 `province_std` 再 map，未映射只会剩 2 个。`value_counts()` 默认不计缺失值。',
      tags: ['map', 'replace', 'value_counts'],
    },
    /* ---------- 17 single ---------- */
    {
      id: 'pandas-3-e17',
      type: 'single',
      difficulty: 2,
      question: '`str.contains("北京")` 在含缺失值的文本列上直接作为筛选条件使用，可能出现什么后果？',
      options: [
        { value: 'A', text: '缺失值位置自动视为 False，一切正常' },
        { value: 'B', text: '结果中含 NA，直接用 `df[cond]` 会抛 `ValueError: Cannot mask with non-boolean array containing NA`' },
        { value: 'C', text: '整列都会被判定为 True' },
        { value: 'D', text: '会自动把缺失值填充为空字符串' },
      ],
      answer: 'B',
      explanation:
        '`str.contains` 默认 `na` 为 NaN，返回结果里含 NA。应写 `df["city"].str.contains("北京", na=False)`。这在读入带缺失的 CSV 时几乎必然踩到。',
      relatedLessonId: 'pandas-l-3-3',
      tags: ['str.contains', '缺失值'],
    },
    /* ---------- 18 multiple ---------- */
    {
      id: 'pandas-3-e18',
      type: 'multiple',
      difficulty: 2,
      question: '下列哪些属于合理的缺失值填充策略？（多选）',
      options: [
        { value: 'A', text: '金额类字段缺失按业务定义填 0（表示未发生）' },
        { value: 'B', text: '评分字段按「品类分组的中位数」填充' },
        { value: 'C', text: '所有列统一用全局均值填充' },
        { value: 'D', text: '对时间序列表用 `ffill` 把上一次记录的状态铺开' },
      ],
      answer: ['A', 'B', 'D'],
      explanation:
        'C 不合理：全局均值会抹平不同群体的基线差异（手机评分和图书评分混在一起），对文本列更是无法计算。A 需要业务确认"缺失是否真的等价于 0"；B 与 D 都是常见且合理的做法。',
      relatedLessonId: 'pandas-l-3-2',
      tags: ['fillna', '业务'],
    },
    /* ---------- 19 code ---------- */
    {
      id: 'pandas-3-e19',
      relatedLessonId: 'pandas-l-3-2',
      type: 'code',
      difficulty: 4,
      question:
        '**分组填充 + 统计汇总。**给定商品订单表 `df`，请：\n\n1. 用 **每个 category 的中位数** 填充 `rating` 列的缺失（写回 `df`，保留 1 位小数不方便就保持原始精度即可）；\n2. `avg_rating`：填充后 `rating` 的整体均值（保留 2 位小数）；\n3. `n_filled`：被填充的个数（int）。',
      starterCode: `import pandas as pd
import numpy as np

df = pd.DataFrame({
    "goods": ["A1", "A2", "A3", "B1", "B2", "B3", "C1"],
    "category": ["手机", "手机", "手机", "图书", "图书", "图书", "手机"],
    "rating": [4.8, np.nan, 4.0, 4.2, np.nan, 5.0, np.nan],
})

n_filled = ___

df["rating"] = ___

avg_rating = ___
`,
      setupCode: '',
      expectedOutput: '手机组中位数 4.4，图书组中位数 4.6；n_filled = 3',
      tests: [
        'assert n_filled == 3, f"n_filled 应为 3，实际为 {n_filled}"',
        'assert int(df["rating"].isna().sum()) == 0, "rating 不应再有缺失"',
        'assert df["rating"].tolist() == [4.8, 4.4, 4.0, 4.2, 4.6, 5.0, 4.4], f"rating 应为 [4.8, 4.4, 4.0, 4.2, 4.6, 5.0, 4.4]，实际为 {df[\'rating\'].tolist()}"',
        'assert abs(avg_rating - 4.4857) < 1e-3 or abs(avg_rating - 4.49) < 1e-9, f"avg_rating 应约为 4.49，实际为 {avg_rating}"',
      ].join('\n'),
      explanation:
        '```python\nn_filled = int(df["rating"].isna().sum())\ndf["rating"] = df["rating"].fillna(df.groupby("category")["rating"].transform("median"))\navg_rating = round(float(df["rating"].mean()), 2)\n```\n\n手机组原值 `[4.8, 4.0]` 中位数 4.4；图书组 `[4.2, 5.0]` 中位数 4.6。`transform("median")` 把组统计量广播回每一行，索引与 df 一致，可以直接用于 fillna。7 个值的总和是 31.4，平均值约 4.4857，保留两位即 4.49。',
      tags: ['fillna', 'groupby', 'transform'],
    },
    /* ---------- 20 judge ---------- */
    {
      id: 'pandas-3-e20',
      type: 'judge',
      difficulty: 2,
      question: '`df["price"].sum()` 默认会把缺失值当作 0 参与求和，因此结果与 `df["price"].sum(skipna=False)` 不同。',
      answer: true,
      explanation:
        '`sum()` 默认 `skipna=True`，直接忽略 NaN；`skipna=False` 时只要有一个 NaN 结果就是 NaN。这个区别在计算"全量必须完整"的指标（如平均单价）时非常重要。',
      relatedLessonId: 'pandas-l-3-1',
      tags: ['缺失值', '聚合'],
    },
    /* ---------- 21 single ---------- */
    {
      id: 'pandas-3-e21',
      type: 'single',
      difficulty: 2,
      question: '`df.dropna(thresh=3)` 表示？',
      options: [
        { value: 'A', text: '删除至少有 3 个缺失值的行' },
        { value: 'B', text: '某行（或列）的非缺失值少于 3 个就删除它' },
        { value: 'C', text: '用 3 填充缺失值' },
        { value: 'D', text: '只保留前 3 列' },
      ],
      answer: 'B',
      explanation:
        '`thresh` 的含义是"**至少要有多少个非缺失值**才算合格"。`thresh=3` 表示非空个数小于 3 就删掉。这是在"全部删除"和"全部保留"之间的折中方案。',
      relatedLessonId: 'pandas-l-3-2',
      tags: ['dropna', 'thresh'],
    },
    /* ---------- 22 code ---------- */
    {
      id: 'pandas-3-e22',
      relatedLessonId: 'pandas-l-3-3',
      type: 'code',
      difficulty: 3,
      question:
        '**去重审计。**给定订单表 `df`，请分别计算并保存：\n\n1. `n_dup_full`：**整行完全重复**的行数（int）；\n2. `dup_order_ids`：`order_id` 出现多次的那些 id，去重后按升序排列的列表（int 列表）；\n3. `dedup_df`：按 `order_id` 去重、**保留最后一次**出现（`keep="last"`）后的表，索引重置为 0..n-1。',
      starterCode: `import pandas as pd

df = pd.DataFrame({
    "order_id": [1, 2, 2, 3, 4, 4, 4, 5],
    "status": ["ok", "ok", "paid", "ok", "ok", "ok", "done", "ok"],
    "amount": [10, 20, 20, 30, 40, 40, 45, 50],
})

n_dup_full = ___
dup_order_ids = ___
dedup_df = ___
`,
      setupCode: '',
      expectedOutput: 'n_dup_full = 1；dup_order_ids = [2, 4]；dedup_df 5 行',
      tests: [
        'assert n_dup_full == 1, f"完全重复的行数应为 1，实际为 {n_dup_full}"',
        'assert dup_order_ids == [2, 4], f"dup_order_ids 应为 [2, 4]，实际为 {dup_order_ids}"',
        'assert isinstance(dedup_df, pd.DataFrame), "dedup_df 应为 DataFrame"',
        'assert dedup_df.shape[0] == 5, f"dedup_df 应为 5 行，实际为 {dedup_df.shape[0]}"',
        'assert dedup_df["order_id"].tolist() == [1, 2, 3, 4, 5], f"order_id 应为 [1, 2, 3, 4, 5]，实际为 {dedup_df[\'order_id\'].tolist()}"',
        'assert dedup_df["status"].tolist() == ["ok", "paid", "ok", "done", "ok"], f"status 应保留最后一次出现的值，实际为 {dedup_df[\'status\'].tolist()}"',
        'assert list(dedup_df.index) == [0, 1, 2, 3, 4], f"索引应重置为 0..4，实际为 {list(dedup_df.index)}"',
      ].join('\n'),
      explanation:
        '```python\nn_dup_full = int(df.duplicated().sum())\ndup_order_ids = sorted(df.loc[df.duplicated(subset=["order_id"], keep=False), "order_id"].unique().tolist())\ndedup_df = df.drop_duplicates(subset=["order_id"], keep="last").reset_index(drop=True)\n```\n\n第 5、6 行与第 4、5 行完全一致吗？注意 `duplicated()` 比较的是所有列：第 5 行 `(4, "ok", 40)` 与第 6 行相同，第 3 行 `(2, "paid", 20)` 与第 2 行 `(2, "ok", 20)` **不同**，所以完全重复只有 2 行。按 order_id 看，2 和 4 各出现多次。`keep="last"` 保留每组最后一条，于是 order 2 保留 `paid`、order 4 保留 `done`。',
      tags: ['duplicated', 'drop_duplicates', '审计'],
    },
  ],
};
