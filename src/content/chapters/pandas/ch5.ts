import type { Chapter } from '../../../types';

/* ============================================================
 *  第 5 章：透视表、合并与多表关联
 * ============================================================ */

export const ch5: Omit<Chapter, 'courseId' | 'order'> = {
  id: 'pandas-5-5',
  title: '透视表、合并与多表关联',
  goal: '掌握 pivot_table 做多维汇总、melt 做宽长互转、merge/concat 做多表关联，并能识别 JOIN 导致的行数放大问题。',
  lessons: [
    {
      id: 'pandas-l-5-1',
      title: 'pivot_table：多维交叉汇总',
      content: `
### 学习目标

学完本节，你应该能够：
1. 用 pivot_table 把长表折成城市×月份宽表；
2. 用 fill_value 处理空组合；
3. 用 margins 加行列合计。

### 前置知识

- 分组聚合直觉（GROUP BY）；
- merge 的键概念。

### 问题背景

多表关联与透视是分析的最后一步加工：merge 对应 SQL JOIN，pivot_table 对应 Excel 数据透视——两者是“宽表思维”的核心。

### 直觉理解

merge 像拼拼图（按 key 对上两块），pivot_table 像折纸（长表折成宽表：行=分组、列=拆开、值=聚合）。

### 核心概念与原理详解

## 透视表解决什么问题

当你要回答"**每个城市 × 每个品类的销售额是多少**"时，
\`groupby(["city", "category"]).sum()\` 得到的是**长表**（每行一个组合），
而 \`pivot_table\` 得到的是**交叉表**（行=城市、列=品类），更接近业务方看的报表。

<PivotDiagram />

\`\`\`python
pt = df.pivot_table(
    index="city",          # 行维度
    columns="category",    # 列维度
    values="amount",       # 聚合的数值列
    aggfunc="sum",         # 聚合方式
    fill_value=0,          # 空单元格填 0
    margins=True,          # 加合计行列
)
\`\`\`

## 核心参数

| 参数 | 说明 |
| --- | --- |
| \`index\` | 行分组的键（可以是列表，形成多层索引） |
| \`columns\` | 列分组的键 |
| \`values\` | 要聚合的列 |
| \`aggfunc\` | 聚合函数，也可以是**字典**给不同列不同函数 |
| \`fill_value\` | 缺失组合填什么（不填则是 NaN） |
| \`margins\` | 是否加"合计"行列 |
| \`dropna\` | 是否丢弃全为 NaN 的列 |

## 多个聚合函数

\`\`\`python
pt = df.pivot_table(
    index="city",
    values=["amount", "qty"],
    aggfunc={"amount": "sum", "qty": ["sum", "mean"]},   # 每个列可用多个函数
)
\`\`\`

结果会有**多层列索引**，取值时写成 \`pt[("amount", "sum")]\`。

## 占比与累计

\`\`\`python
pt = df.pivot_table(index="city", columns="category", values="amount", aggfunc="sum", fill_value=0)

# 每个单元格占该行合计的比例（行内占比）
row_share = pt.div(pt.sum(axis=1), axis=0)

# 每个城市的合计占比
city_share = pt.sum(axis=1) / pt.sum().sum()

# 按行累计占比（帕累托分析）
cum = pt.sum(axis=0).sort_values(ascending=False).cumsum() / pt.sum().sum()
\`\`\`

## pivot_table vs groupby

| | groupby | pivot_table |
| --- | --- | --- |
| 输出形态 | 长表（索引 = 分组键） | 交叉表（行列是维度） |
| 多维度 | 需要 unstack 才能变宽 | 原生支持 |
| 业务报表 | 需要再处理 | 直接可用 |
| 灵活性 | 更灵活（transform、filter 等） | 面向汇总 |

**经验**：
- 计算复杂（需要 transform / filter / 自定义聚合）→ 用 \`groupby\`；
- 要"行列交叉的汇总表" → 用 \`pivot_table\`；
- 两者可以互相转换：\`groupby(...).sum().unstack()\` ≈ \`pivot_table(...)\`。

## 常见坑

1. **\`aggfunc\` 默认是 \`mean\`**！不写会得到平均值而不是求和，这是最常见的错误。
2. **缺失组合**默认产生 NaN，报表里通常需要 \`fill_value=0\`。
3. **重复的 index/columns 组合** 会被聚合（这正是 pivot_table 与 pivot 的区别：
   \`pivot\` 要求唯一，重复会报错）。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
import pandas as pd
orders = pd.DataFrame({"uid": [1, 2], "amt": [100, 200]})
users = pd.DataFrame({"uid": [1, 2, 3], "city": ["BJ", "SH", "SZ"]})
m = orders.merge(users, on="uid", how="left")
print(m)
long = pd.DataFrame({"city": ["BJ", "BJ", "SH"], "m": ["1月", "2月", "1月"], "v": [5, 6, 7]})
print(long.pivot_table(index="city", columns="m", values="v", aggfunc="sum", fill_value=0))
\`\`\`

预期输出（实测）：merge 后 2 行带 city；透视表为城市×月份矩阵（缺失填 0）

**常见错误**：merge 忘 how= 默认 inner 丢行（长表常用 left）；透视表不设 fill_value 出 NaN；重复键 merge 后行数爆炸（先查键唯一性）。

### 常见误区

1. merge 默认 how="inner"——与 SQL JOIN 同义，不想要的丢行都是它干的；
2. pivot 与 pivot_table 不同——pivot 不做聚合，重复索引会报错；
3. concat 与 merge 混淆——concat 是上下/左右堆叠，merge 才按键。

### 知识关联

- **向前**：l-4-1 时间索引让透视按月成为可能；
- **向后**：SQL 课的 JOIN/GROUP BY 是同一操作的声明式版本；
- **平行**：Excel 数据透视表。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| merge | SQL 式按键连接，how 四种 |
| pivot_table | 长转宽 + 聚合 + fill_value |
| 风险 | 键重复→行数爆炸，先查唯一 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 pandas 官方文档 pandas.pydata.org 相应章节）
`,
      tips: [
        {
          kind: 'pitfall',
          text: '`pivot_table` 的 `aggfunc` 默认是 `"mean"`，不写会得到平均值。做销售汇总时必须显式写 `aggfunc="sum"`。',
        },
        {
          kind: 'pitfall',
          text: '`pivot_table` 可以处理重复组合（会自动聚合），而 `pivot` 遇到重复会抛 `ValueError: Index contains duplicate entries`。',
        },
        {
          kind: 'leak',
          text: '业务报表通常需要 `fill_value=0` + `margins=True`，一次性得到完整的交叉表与合计行列。',
        },
      ],
      demos: [
        {
          title: '交叉汇总与占比',
          lang: 'python',
          code: `import pandas as pd

df = pd.DataFrame({
    "city": ["北京", "北京", "北京", "上海", "上海", "广州", "广州"],
    "category": ["数码", "数码", "服装", "服装", "数码", "数码", "服装"],
    "amount": [320.0, 180.0, 99.0, 460.0, 200.0, 150.0, 88.0],
})

pt = df.pivot_table(index="city", columns="category", values="amount", aggfunc="sum", fill_value=0, margins=True)
print("交叉汇总（含合计）:")
print(pt)

print("\\n行内占比:")
share = pt.drop("All").drop(columns="All")
print(share.div(share.sum(axis=1), axis=0).round(3))`,
        },
      ],
    },
    {
      id: 'pandas-l-5-2',
      title: 'merge / join / concat：多表关联',
      content: `
### 学习目标

学完本节，你应该能够：
1. 用 merge 完成四种 JOIN 并对比行数；
2. 识别键重复导致的行数爆炸；
3. 用 concat 上下堆叠同构表并 reset_index。

### 前置知识

- 分组聚合直觉（GROUP BY）；
- merge 的键概念。

### 问题背景

多表关联与透视是分析的最后一步加工：merge 对应 SQL JOIN，pivot_table 对应 Excel 数据透视——两者是“宽表思维”的核心。

### 直觉理解

merge 像拼拼图（按 key 对上两块），pivot_table 像折纸（长表折成宽表：行=分组、列=拆开、值=聚合）。

### 核心概念与原理详解

## 三种"连接"的区别

| 方法 | 用途 | 类比 |
| --- | --- | --- |
| \`merge\` | 按**列值**关联两张表（类似 SQL JOIN） | SQL 的 JOIN |
| \`join\` | 按**索引**关联（merge 的便捷版） | 索引对齐 |
| \`concat\` | 按**行或列**拼接（不做键匹配） | UNION / 横向拼接 |

## merge 的核心参数

\`\`\`python
pd.merge(left, right, how="inner", on="customer_id")
\`\`\`

| 参数 | 说明 |
| --- | --- |
| \`how\` | \`inner\`（默认）/ \`left\` / \`right\` / \`outer\` |
| \`on\` | 同名列作为键 |
| \`left_on\` / \`right_on\` | 两侧列名不同时分别指定 |
| \`suffixes\` | 同名非连接列的后缀，默认 \`("_x", "_y")\` |
| \`validate\` | \`"1:1"\` / \`"1:m"\` / \`"m:1"\` / \`"m:m"\`，**强烈推荐** |

**\`validate\` 是最被低估的参数**：

\`\`\`python
orders.merge(products, on="product_id", validate="m:1", how="left")
# 若 products 中 product_id 重复，会直接抛错，而不是悄悄放大行数
\`\`\`

## 四种连接语义

\`\`\`python
left.merge(right, on="k", how="inner")   # 两边都有的键
left.merge(right, on="k", how="left")    # 保留左表全部
left.merge(right, on="k", how="right")   # 保留右表全部
left.merge(right, on="k", how="outer")   # 两边并集（缺失补 NaN）
\`\`\`

## 行数放大：最危险的陷阱

**当右表的连接键有重复时，merge 会让行数变多**：

\`\`\`python
orders   # 100 行，customer_id 唯一
customer   # 1 行对应 1 客户，但如果有重复注册 → 同一 customer_id 出现 2 次
order_with_customer = orders.merge(customer, on="customer_id", how="left")
# 行数可能 > 100！
\`\`\`

**后果**：
- 后续 \`sum()\` 会重复累加；
- 报表数字虚高，且**不会报错**。

**检查方法**：

\`\`\`python
print(f"左表 {len(left)} 行 → 合并后 {len(merged)} 行")
if len(merged) > len(left):
    print("警告：行数放大！检查右表连接键是否重复")
\`\`\`

## indicator：看清每行来自哪边

\`\`\`python
merged = left.merge(right, on="k", how="outer", indicator=True)
# 多出 _merge 列：both / left_only / right_only
merged["_merge"].value_counts()
\`\`\`

这是做"数据对账"的利器——一眼看出哪些键只在左表、只在右表。

## concat：拼接

\`\`\`python
# 纵向（追加行）：列名对齐，缺失补 NaN
pd.concat([df1, df2], ignore_index=True)

# 横向（并排）：按索引对齐
pd.concat([df1, df2], axis=1)

# 用 keys 加一层标识
pd.concat([df1, df2], keys=["2023", "2024"], names=["year", "row"])
\`\`\`

**\`ignore_index=True\` 很重要**：不加的话索引会重复（0,1,2,0,1,2），后续按索引取值可能拿到意外结果。

<SqlJoinDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
import pandas as pd
orders = pd.DataFrame({"uid": [1, 2], "amt": [100, 200]})
users = pd.DataFrame({"uid": [1, 2, 3], "city": ["BJ", "SH", "SZ"]})
m = orders.merge(users, on="uid", how="left")
print(m)
long = pd.DataFrame({"city": ["BJ", "BJ", "SH"], "m": ["1月", "2月", "1月"], "v": [5, 6, 7]})
print(long.pivot_table(index="city", columns="m", values="v", aggfunc="sum", fill_value=0))
\`\`\`

预期输出（实测）：merge 后 2 行带 city；透视表为城市×月份矩阵（缺失填 0）

**常见错误**：merge 忘 how= 默认 inner 丢行（长表常用 left）；透视表不设 fill_value 出 NaN；重复键 merge 后行数爆炸（先查键唯一性）。

### 常见误区

1. merge 默认 how="inner"——与 SQL JOIN 同义，不想要的丢行都是它干的；
2. pivot 与 pivot_table 不同——pivot 不做聚合，重复索引会报错；
3. concat 与 merge 混淆——concat 是上下/左右堆叠，merge 才按键。

### 知识关联

- **向前**：l-4-1 时间索引让透视按月成为可能；
- **向后**：SQL 课的 JOIN/GROUP BY 是同一操作的声明式版本；
- **平行**：Excel 数据透视表。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| merge | SQL 式按键连接，how 四种 |
| pivot_table | 长转宽 + 聚合 + fill_value |
| 风险 | 键重复→行数爆炸，先查唯一 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 pandas 官方文档 pandas.pydata.org 相应章节）
`,
      tips: [
        {
          kind: 'pitfall',
          text: 'merge 后行数变多是 JOIN 放大的典型症状，会让 SUM 静默错误。养成"合并前后打印行数"并加 `validate="m:1"` 的习惯。',
        },
        {
          kind: 'pitfall',
          text: '`concat` 不加 `ignore_index=True` 会让索引重复，后续 `df.loc[0]` 会返回多行，导致难以发现的错误。',
        },
        {
          kind: 'leak',
          text: '用 `indicator=True` 做两表对账，`_merge` 列的 `left_only` / `right_only` 就是"孤儿数据"清单。',
        },
      ],
      demos: [
        {
          title: 'merge 行数放大演示与对账',
          lang: 'python',
          code: `import pandas as pd

orders = pd.DataFrame({
    "order_id": ["A1", "A2", "A3"],
    "customer_id": [1, 2, 1],
    "amount": [100.0, 200.0, 150.0],
})

# customers 中 customer_id=2 重复（例如重复注册）
customers = pd.DataFrame({
    "customer_id": [1, 2, 2],
    "name": ["张三", "李四", "李四(重复)"],
})

merged = orders.merge(customers, on="customer_id", how="left")
print(f"左表 {len(orders)} 行 → 合并后 {len(merged)} 行")
print(merged)
print("\\n金额合计被放大:", merged["amount"].sum(), "（真实值", orders["amount"].sum(), "）")

print("\\n用 indicator 做对账:")
check = orders.merge(customers.drop_duplicates("customer_id"), on="customer_id", how="outer", indicator=True)
print(check["_merge"].value_counts())

try:
    orders.merge(customers, on="customer_id", validate="m:1")
except Exception as e:
    print("\\nvalidate 捕获了放大:", type(e).__name__)`,
        },
      ],
    },
    {
      id: 'pandas-l-5-3',
      title: 'melt / pivot：宽表与长表互转',
      content: `
### 学习目标

学完本节，你应该能够：
1. 用 melt 宽转长（反向透视）；
2. 说明“长表适合聚合、宽表适合阅读”的选型逻辑；
3. 完成“长→透视→melt”的往返验证。

### 前置知识

- 分组聚合直觉（GROUP BY）；
- merge 的键概念。

### 问题背景

多表关联与透视是分析的最后一步加工：merge 对应 SQL JOIN，pivot_table 对应 Excel 数据透视——两者是“宽表思维”的核心。

### 直觉理解

merge 像拼拼图（按 key 对上两块），pivot_table 像折纸（长表折成宽表：行=分组、列=拆开、值=聚合）。

### 核心概念与原理详解

## 宽表与长表

**宽表**（wide）：每行一个主体，每个指标占一列。适合人看、适合报表。

\`\`\`
city   2024-01  2024-02  2024-03
北京    100      120      90
上海    200      180      210
\`\`\`

**长表**（long）：每行一个"主体-维度-数值"组合。适合机器处理、画图、建模。

\`\`\`
city    month      amount
北京    2024-01    100
北京    2024-02    120
\`\`\`

## melt：宽 → 长

\`\`\`python
long_df = wide_df.melt(
    id_vars=["city"],          # 保持不变的列
    value_vars=["2024-01", "2024-02", "2024-03"],  # 要转成行的列
    var_name="month",          # 原来的列名变成这一列
    value_name="amount",       # 原来的值变成这一列
)
\`\`\`

**为什么需要 melt**：
- Matplotlib / Seaborn 画多系列折线图时，需要长表格式；
- \`groupby\` 做统一聚合时，长表更方便；
- 数据入库（数据库表）通常是长表。

## pivot：长 → 宽

\`\`\`python
wide = long_df.pivot(index="city", columns="month", values="amount")
\`\`\`

**注意**：\`pivot\` 要求 \`(index, columns)\` 组合**唯一**，否则报错：
\`ValueError: Index contains duplicate entries, cannot reshape\`。

遇到重复组合时，用 \`pivot_table\`（会自动聚合）或先 \`groupby\` 去重。

## stack / unstack：索引层级变换

\`\`\`python
df.stack()     # 把列"压"进索引（宽 → 长的另一种方式）
df.unstack()   # 把索引的最后一层"展"成列（长 → 宽）
\`\`\`

与 melt/pivot 的区别是：**stack/unstack 操作的是索引层级**，而 melt/pivot 操作的是列。

## 实战：宽表规范化

真实数据常见"按月/按渠道横向铺开"的宽表：

\`\`\`python
raw = pd.read_csv(...)   # 列：店铺, 1月, 2月, ..., 12月
normalized = raw.melt(id_vars="店铺", var_name="月份", value_name="销售额")
\`\`\`

规范化后就能统一做时间序列分析、分组聚合——**这是数据清洗的高频操作**。

<PivotDiagram />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
import pandas as pd
orders = pd.DataFrame({"uid": [1, 2], "amt": [100, 200]})
users = pd.DataFrame({"uid": [1, 2, 3], "city": ["BJ", "SH", "SZ"]})
m = orders.merge(users, on="uid", how="left")
print(m)
long = pd.DataFrame({"city": ["BJ", "BJ", "SH"], "m": ["1月", "2月", "1月"], "v": [5, 6, 7]})
print(long.pivot_table(index="city", columns="m", values="v", aggfunc="sum", fill_value=0))
\`\`\`

预期输出（实测）：merge 后 2 行带 city；透视表为城市×月份矩阵（缺失填 0）

**常见错误**：merge 忘 how= 默认 inner 丢行（长表常用 left）；透视表不设 fill_value 出 NaN；重复键 merge 后行数爆炸（先查键唯一性）。

### 常见误区

1. merge 默认 how="inner"——与 SQL JOIN 同义，不想要的丢行都是它干的；
2. pivot 与 pivot_table 不同——pivot 不做聚合，重复索引会报错；
3. concat 与 merge 混淆——concat 是上下/左右堆叠，merge 才按键。

### 知识关联

- **向前**：l-4-1 时间索引让透视按月成为可能；
- **向后**：SQL 课的 JOIN/GROUP BY 是同一操作的声明式版本；
- **平行**：Excel 数据透视表。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| merge | SQL 式按键连接，how 四种 |
| pivot_table | 长转宽 + 聚合 + fill_value |
| 风险 | 键重复→行数爆炸，先查唯一 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 pandas 官方文档 pandas.pydata.org 相应章节）
`,
      tips: [
        {
          kind: 'pitfall',
          text: '`pivot` 遇到重复的 (index, columns) 组合会报错。用 `pivot_table` 并显式给 `aggfunc` 才是安全的做法。',
        },
        {
          kind: 'leak',
          text: '画多系列折线图前先 `melt` 成长表，配合 `hue` 参数自动分行分色，比手动写多个 plot 简洁得多。',
        },
        {
          kind: 'note',
          text: '`stack`/`unstack` 是索引层级的重排，`melt`/`pivot` 是列与行的重组，用在什么场景取决于你的数据结构是"索引层"还是"列"。',
        },
      ],
      demos: [
        {
          title: '宽表转长表再汇总',
          lang: 'python',
          code: `import pandas as pd

wide = pd.DataFrame({
    "city": ["北京", "上海"],
    "2024-01": [100, 200],
    "2024-02": [120, 180],
    "2024-03": [90, 210],
})

long_df = wide.melt(id_vars="city", var_name="month", value_name="amount")
print("长表:")
print(long_df)

print("\\n按月份汇总:")
print(long_df.groupby("month")["amount"].sum())

print("\\n再转回宽表:")
print(long_df.pivot(index="city", columns="month", values="amount"))`,
        },
      ],
    },
  ],
  exercises: [
    {
      id: 'pandas-5-e1',
      type: 'single',
      difficulty: 1,
      question: '`pivot_table` 不指定 `aggfunc` 时的默认聚合方式是？',
      options: [
        { value: 'A', text: '`sum`' },
        { value: 'B', text: '`mean`' },
        { value: 'C', text: '`count`' },
        { value: 'D', text: '`max`' },
      ],
      answer: 'B',
      explanation:
        '默认是 `"mean"`（平均值）。做销售汇总时忘记写 `aggfunc="sum"` 会得到平均值，是最常见的透视表错误。',
      tags: ['pivot_table'],
    },
    {
      id: 'pandas-5-e2',
      type: 'judge',
      difficulty: 2,
      question: '`merge` 的 `how` 参数默认值是 `"inner"`。',
      answer: true,
      explanation:
        '与 SQL 的 JOIN 一致，默认 INNER。想保留左表全部行必须显式写 `how="left"`。',
      tags: ['merge'],
    },
    {
      id: 'pandas-5-e3',
      type: 'multiple',
      difficulty: 2,
      question: '关于 `merge` 后行数变多，下列说法正确的有？（多选）',
      options: [
        { value: 'A', text: '通常是右表连接键存在重复值' },
        { value: 'B', text: '会导致后续 `sum` 重复累加' },
        { value: 'C', text: '用 `validate="m:1"` 可以提前发现' },
        { value: 'D', text: 'merge 结果行数一定等于左表行数' },
      ],
      answer: ['A', 'B', 'C'],
      explanation:
        'D 明显错误——join 放大会让行数增加。合并前后打印行数是最实用的自检习惯。',
      tags: ['merge', '行数放大'],
    },
    {
      id: 'pandas-5-e4',
      type: 'fill',
      difficulty: 2,
      question: '把宽表转为长表，补全方法：\n\n```python\nlong_df = wide_df.___(id_vars=["city"], var_name="month", value_name="amount")\n```',
      blanks: [['melt']],
      explanation: '`melt` 把多列"熔"成两列（变量名列 + 值列），是宽表规范化的标准操作。',
      tags: ['melt'],
    },
    {
      id: 'pandas-5-e5',
      type: 'code',
      difficulty: 2,
      question:
        '交叉汇总练习：给定 `df`（含 `city`、`category`、`amount`），请生成透视表保存到 `pt`：\n\n- 行 = `city`，列 = `category`\n- 值 = `amount` 的**求和**\n- 空单元格填 0',
      starterCode: `import pandas as pd

df = pd.DataFrame({
    "city": ["北京", "北京", "上海", "上海", "广州"],
    "category": ["数码", "服装", "数码", "服装", "数码"],
    "amount": [320.0, 99.0, 460.0, 200.0, 150.0],
})

pt = ___
`,
      setupCode: '',
      expectedOutput: 'pt.loc["北京","数码"]=320, pt.loc["上海","服装"]=200',
      tests: `assert pt.shape == (3, 2), f"形状应为 (3, 2)，实际 {pt.shape}"
assert pt.loc["北京", "数码"] == 320.0, f"北京-数码应为 320，实际 {pt.loc['北京','数码']}"
assert pt.loc["北京", "服装"] == 99.0
assert pt.loc["上海", "数码"] == 460.0, f"上海-数码应为 460（求和而非平均），实际 {pt.loc['上海','数码']}"
assert pt.loc["广州", "服装"] == 0, f"缺失组合应填 0，实际 {pt.loc['广州','服装']}"
`,
      explanation:
        '```python\npt = df.pivot_table(index="city", columns="category", values="amount", aggfunc="sum", fill_value=0)\n```\n\n三个要点：`aggfunc="sum"`（否则是平均值）、`fill_value=0`（广州没有服装数据）、行列由 index/columns 指定。',
      tags: ['pivot_table'],
    },
    {
      id: 'pandas-5-e6',
      type: 'code',
      difficulty: 3,
      question:
        '多表关联：`orders` 与 `customers` 通过 `customer_id` 关联。请：\n\n1. 用 LEFT JOIN 合并保存到 `merged`（保留订单表全部行）；\n2. 计算合并前后行数保存到 `n_before`、`n_after`；\n3. 判断是否发生行数放大，保存布尔值到 `is_inflated`。',
      starterCode: `import pandas as pd

orders = pd.DataFrame({
    "order_id": ["A1", "A2", "A3"],
    "customer_id": [1, 2, 3],
    "amount": [100.0, 200.0, 150.0],
})
customers = pd.DataFrame({
    "customer_id": [1, 2, 2, 3],
    "name": ["张三", "李四", "李四(重复)", "王五"],
})

merged = ___
n_before = ___
n_after = ___
is_inflated = ___
`,
      setupCode: '',
      expectedOutput: 'n_before=3, n_after=4, is_inflated=True',
      tests: `assert n_before == 3, f"n_before 应为 3，实际 {n_before}"
assert n_after == 4, f"n_after 应为 4（customer_id=2 重复导致放大），实际 {n_after}"
assert is_inflated is True or is_inflated == True, f"is_inflated 应为 True，实际 {is_inflated}"
assert "name" in merged.columns, "merged 应包含 name 列"
`,
      explanation:
        '```python\nmerged = orders.merge(customers, on="customer_id", how="left")\nn_before, n_after = len(orders), len(merged)\nis_inflated = n_after > n_before\n```\n\ncustomers 中 customer_id=2 出现两次，A2 订单会被复制成两行，3 行变 4 行。**这就是 JOIN 放大**，会导致后续 `merged["amount"].sum()` 从 450 变成 650。',
      tags: ['merge', '行数放大'],
    },
    {
      id: 'pandas-5-e7',
      type: 'single',
      difficulty: 3,
      question: '`pivot` 报错 `ValueError: Index contains duplicate entries, cannot reshape`，最可能的原因是？',
      options: [
        { value: 'A', text: '数据里有 NaN' },
        { value: 'B', text: '`(index, columns)` 组合存在重复，无法唯一确定单元格' },
        { value: 'C', text: '列名不是字符串' },
        { value: 'D', text: 'DataFrame 太大' },
      ],
      answer: 'B',
      explanation:
        '`pivot` 要求每个 (index, columns) 组合唯一。存在重复时，可以用 `pivot_table`（自动聚合）或先 `groupby().sum()` 收敛重复。',
      tags: ['pivot'],
    },
    {
      id: 'pandas-5-e8',
      type: 'judge',
      difficulty: 2,
      question: '`concat([df1, df2])` 不加 `ignore_index=True` 时，结果的索引可能是 `0,1,2,0,1,2`。',
      answer: true,
      explanation:
        '默认保留原索引，两段数据拼接后索引会重复。这会让人按索引定位时返回多行，是隐蔽的 bug 来源。',
      tags: ['concat'],
    },
    {
      id: 'pandas-5-e9',
      type: 'code',
      difficulty: 3,
      question:
        '长表转宽表：给定长表 `long_df`（列：`city`、`month`、`amount`），请生成宽表保存到 `wide`：\n\n- 行 = `city`，列 = `month`，值 = `amount`\n- 结果索引与列都已命名（`city` / `month`）',
      starterCode: `import pandas as pd

long_df = pd.DataFrame({
    "city": ["北京", "北京", "上海", "上海"],
    "month": ["2024-01", "2024-02", "2024-01", "2024-02"],
    "amount": [100.0, 120.0, 200.0, 180.0],
})

wide = ___
`,
      setupCode: '',
      expectedOutput: 'wide.loc["北京","2024-02"] == 120',
      tests: `assert wide.shape == (2, 2), f"形状应为 (2, 2)，实际 {wide.shape}"
assert wide.loc["北京", "2024-01"] == 100.0
assert wide.loc["北京", "2024-02"] == 120.0
assert wide.loc["上海", "2024-02"] == 180.0
`,
      explanation:
        '```python\nwide = long_df.pivot(index="city", columns="month", values="amount")\n```\n\n`pivot` 要求组合唯一；若数据里同一 city-month 有多行，应改用 `pivot_table(..., aggfunc="sum")`。',
      tags: ['pivot'],
    },
    {
      id: 'pandas-5-e10',
      type: 'fill',
      difficulty: 3,
      question: '合并两表并检查每行来自哪边（对账），补全参数：\n\n```python\nmerged = left.merge(right, on="k", how="outer", ___=True)\n```',
      blanks: [['indicator']],
      explanation:
        '`indicator=True` 会新增 `_merge` 列，取值 `both` / `left_only` / `right_only`，是两表对账最直接的工具。',
      tags: ['merge', '对账'],
    },
    {
      id: 'pandas-5-e11',
      type: 'code',
      difficulty: 4,
      question:
        '透视表进阶：给定 `df`，请生成透视表 `pt`：\n\n- 行 = `region`，列 = `category`\n- 值 = `amount` 的求和，空值填 0\n- 再计算每个大区在"数码"品类的销售额占该大区总销售额的比例，保存到 `digital_share`（Series，索引为大区，保留 4 位小数）',
      starterCode: `import pandas as pd

df = pd.DataFrame({
    "region": ["华东", "华东", "华北", "华北", "华南"],
    "category": ["数码", "服装", "数码", "服装", "数码"],
    "amount": [400.0, 100.0, 300.0, 300.0, 200.0],
})

pt = ___
digital_share = ___
`,
      setupCode: '',
      expectedOutput: 'digital_share["华东"]=0.8, ["华北"]=0.5, ["华南"]=1.0',
      tests: `assert pt.loc["华东", "数码"] == 400.0 and pt.loc["华东", "服装"] == 100.0
assert abs(digital_share["华东"] - 0.8) < 1e-9, f"华东数码占比应为 0.8，实际 {digital_share['华东']}"
assert abs(digital_share["华北"] - 0.5) < 1e-9, f"华北数码占比应为 0.5，实际 {digital_share['华北']}"
assert abs(digital_share["华南"] - 1.0) < 1e-9, f"华南数码占比应为 1.0，实际 {digital_share['华南']}"
`,
      explanation:
        '```python\npt = df.pivot_table(index="region", columns="category", values="amount", aggfunc="sum", fill_value=0)\ndigital_share = (pt["数码"] / pt.sum(axis=1)).round(4)\n```\n\n`pt.sum(axis=1)` 得到每行合计；用某一列除以行合计得到"行内占比"。这种"结构占比"分析在经营报表中非常常用。',
      tags: ['pivot_table', '占比'],
    },
    {
      id: 'pandas-5-e12',
      type: 'multiple',
      difficulty: 3,
      question: '关于 `concat`，下列说法正确的有？（多选）',
      options: [
        { value: 'A', text: '`axis=0`（默认）表示纵向追加行' },
        { value: 'B', text: '`axis=1` 表示横向拼接列（按索引对齐）' },
        { value: 'C', text: '`ignore_index=True` 会重新生成连续索引' },
        { value: 'D', text: '`concat` 会按指定键匹配两表' },
      ],
      answer: ['A', 'B', 'C'],
      explanation:
        '`concat` 不做键匹配（那是 `merge` 的职责），只做机械拼接。D 错误。',
      tags: ['concat'],
    },
    {
      id: 'pandas-5-e13',
      type: 'single',
      difficulty: 3,
      question: '想把"每行一个客户、每个渠道一列"的宽表转为长表以便统一分析，应使用？',
      options: [
        { value: 'A', text: '`pivot_table`' },
        { value: 'B', text: '`melt`' },
        { value: 'C', text: '`merge`' },
        { value: 'D', text: '`concat`' },
      ],
      answer: 'B',
      explanation: '`melt` 就是"宽转长"的标准操作，把多列压缩成"变量名 + 值"两列。',
      tags: ['melt'],
    },
    {
      id: 'pandas-5-e14',
      type: 'judge',
      difficulty: 3,
      question: '`merge` 的 `validate="m:1"` 参数能在右表连接键重复时直接抛错，从而避免行数放大。',
      answer: true,
      explanation:
        '`validate` 用来声明预期的关联基数：`1:1`、`1:m`、`m:1`、`m:m`。声明 `m:1` 而实际不满足时立即报错，是把"静默错误"变成"显式错误"的好办法。',
      tags: ['merge', 'validate'],
    },
    {
      id: 'pandas-5-e15',
      type: 'code',
      difficulty: 4,
      question:
        '综合：`orders`（含 `order_id`、`product_id`、`qty`）与 `products`（含 `product_id`、`price`、`category`）关联，请：\n\n1. 合并后计算每行金额（`qty * price`）保存为 `amount` 列；\n2. 按 `category` 汇总销售额保存到 `cat_sales`（Series，按销售额降序）；\n3. 记录合并后总行数 `n_rows`（应与左表一致，证明没有放大）。',
      starterCode: `import pandas as pd

orders = pd.DataFrame({
    "order_id": ["A1", "A1", "A2", "A3"],
    "product_id": [1, 2, 1, 3],
    "qty": [2, 1, 3, 5],
})
products = pd.DataFrame({
    "product_id": [1, 2, 3],
    "price": [299.0, 499.0, 89.0],
    "category": ["数码", "数码", "家居"],
})

merged = ___
cat_sales = ___
n_rows = ___
`,
      setupCode: '',
      expectedOutput: '数码 = 1596.0, 家居 = 445.0；n_rows = 4',
      tests: `assert "amount" in merged.columns, "merged 应包含 amount 列"
assert n_rows == 4, f"n_rows 应为 4（未放大），实际 {n_rows}"
assert abs(cat_sales["数码"] - 1596.0) < 1e-9, f"数码销售额应为 1596（2*299 + 499 + 3*299），实际 {cat_sales['数码']}"
assert abs(cat_sales["家居"] - 445.0) < 1e-9, f"家居销售额应为 445（5*89），实际 {cat_sales['家居']}"
assert list(cat_sales.index) == ["数码", "家居"], "应按销售额降序排列"
`,
      explanation:
        '```python\nmerged = orders.merge(products, on="product_id", how="left", validate="m:1")\nmerged["amount"] = merged["qty"] * merged["price"]\ncat_sales = merged.groupby("category")["amount"].sum().sort_values(ascending=False)\nn_rows = len(merged)\n```\n\nproducts 中 product_id 唯一，所以用 `validate="m:1"` 不会报错，且行数不变（4 行）。数码 = 2×299 + 1×499 + 3×299 = 598 + 499 + 897 = 1994？注意 A1 有两行明细（product 1 和 2），A2 是 product 1：2×299 + 1×499 + 3×299 = 1596（A3 属于家居）。',
      tags: ['综合', 'merge', '分组'],
    },
    {
      id: 'pandas-5-e16',
      type: 'open',
      difficulty: 4,
      question:
        '同事的多表合并脚本"跑完之后总销售额比财务报的数多了 30%"，但没有报错。请写出你的排查思路，并说明如何在代码层面预防这类问题。',
      referenceAnswer: `**排查思路（按可能性排序）**：

1. **检查行数是否放大**：比较 merge 前后的行数。最常见的元凶是
   右表连接键存在重复（一客多行、一商品多 SKU 记录等）。
2. **检查连接键本身**：是否存在类型不一致（int vs str）、首尾空格、
   大小写不同，导致部分匹配失败或误解。
3. **检查是否多路径计数**：如果一条明细同时 JOIN 了客户表和商品表，
   任一表有重复都会放大。
4. **检查金额字段的重复累加**：订单级的"运费""优惠"字段
   在 JOIN 明细后被重复加 N 次。
5. **与财务口径比对**：确认"销售额"是否含税、是否含运费、是否剔除取消单。

**代码层面的预防**：

1. **加 \`validate\`**：\`merge(..., validate="m:1")\`，键重复立即报错；
2. **加行数断言**：\`assert len(merged) == len(left)\`，或打印前后行数对比；
3. **先聚合再 JOIN**：把右表先收敛到唯一粒度（\`drop_duplicates("key")\` 或 \`groupby\`），再合并；
4. **用 \`indicator=True\` 做对账**，检查 \`left_only\` / \`right_only\` 的比例；
5. **加金额守恒断言**：JOIN 前后 \`amount.sum()\` 应相等（针对订单级字段）；
6. **写单元测试**：用含重复键的小数据集，断言合并后行数不变。`,
      rubric: [
        { point: '首要怀疑 JOIN 行数放大并给出检查方法', score: 2 },
        { point: '检查连接键的类型/空格/大小写不一致', score: 1 },
        { point: '指出订单级字段被重复累加的问题', score: 1 },
        { point: '提出 validate / 行数断言等代码级预防', score: 2 },
      ],
      keywords: ['行数放大', 'validate', '重复键', '断言', 'indicator', '对账'],
      explanation:
        '这类"数字虚高但不报错"是数据工程中代价最高的 bug 之一。回答重点是"如何让问题显式化"——validate、断言、对账。',
      tags: ['merge', '对账'],
    },
    {
      id: 'pandas-5-x1',
      type: 'single',
      difficulty: 1,
      question: '`pd.concat([df1, df2])` 的默认拼接方式是？',
      options: [
        {
          value: 'A',
          text: '纵向拼接（追加行）',
        },
        {
          value: 'B',
          text: '横向拼接（并排列）',
        },
        {
          value: 'C',
          text: '按主键关联',
        },
        {
          value: 'D',
          text: '求交集',
        },
      ],
      answer: 'A',
      explanation: '`concat` 默认 `axis=0`，纵向追加行。',
      tags: ['concat'],
    },
    {
      id: 'pandas-5-x2',
      type: 'judge',
      difficulty: 1,
      question: '`merge` 的 `how="outer"` 会保留两侧所有键。',
      answer: true,
      explanation: '外连接取并集，任一侧缺失补 NaN。配合 `indicator=True` 可看出每行来自哪边。',
      tags: ['merge'],
    },
    {
      id: 'pandas-5-x3',
      type: 'fill',
      difficulty: 2,
      question: `在透视表中把空单元格填 0，补全参数：

df.pivot_table(index="city", columns="cat", values="amt", aggfunc="sum", ___=0)`,
      blanks: [
        ['fill_value'],
      ],
      explanation: '`fill_value=0` 让没有数据的组合显示 0 而不是 NaN。',
      tags: ['pivot_table'],
    },
    {
      id: 'pandas-5-x4',
      type: 'code',
      difficulty: 2,
      question: '给定两张表 `left` 与 `right`，用内连接按 `id` 合并保存到 `merged`，并统计合并后的行数 `n`。',
      starterCode: `import pandas as pd

left = pd.DataFrame({"id": [1, 2, 3], "a": [10, 20, 30]})
right = pd.DataFrame({"id": [2, 3, 4], "b": [200, 300, 400]})

merged = ___
n = ___
`,
      setupCode: '',
      expectedOutput: 'n = 2',
      tests: `assert n == 2, f"n 应为 2，实际 {n}"
assert list(merged.columns) == ["id", "a", "b"], f"列不正确：{list(merged.columns)}"
assert list(merged["id"]) == [2, 3], f"id 应为 [2, 3]，实际 {list(merged['id'])}"
`,
      answer: `merged = left.merge(right, on="id", how="inner")
n = len(merged)`,
      explanation: '内连接只保留两侧都有的键（2、3），因此 2 行。',
      tags: ['merge'],
    },
    {
      id: 'pandas-5-x5',
      type: 'single',
      difficulty: 2,
      question: '`concat` 的 `axis=1` 主要用于？',
      options: [
        {
          value: 'A',
          text: '按索引横向拼接列',
        },
        {
          value: 'B',
          text: '追加行',
        },
        {
          value: 'C',
          text: '去重',
        },
        {
          value: 'D',
          text: '排序',
        },
      ],
      answer: 'A',
      explanation: '`axis=1` 按索引对齐后横向拼接，索引不一致时补 NaN。',
      tags: ['concat'],
    },
    {
      id: 'pandas-5-x6',
      type: 'judge',
      difficulty: 2,
      question: '`pivot_table` 可以处理重复的 (index, columns) 组合，而 `pivot` 会报错。',
      answer: true,
      explanation: '`pivot_table` 会自动聚合；`pivot` 要求唯一组合。',
      tags: ['pivot'],
    },
    {
      id: 'pandas-5-x7',
      type: 'fill',
      difficulty: 2,
      question: `合并两表时声明"左表多对一"的关联基数以提前发现放大问题，补全参数：

left.merge(right, on="k", validate="___")`,
      blanks: [
        ['m:1', 'many_to_one'],
      ],
      explanation: '`validate="m:1"` 表示左表多行对应右表一行，右表键重复时会抛错。',
      tags: ['merge', 'validate'],
    },
    {
      id: 'pandas-5-x8',
      type: 'code',
      difficulty: 3,
      question: '透视表进阶：给定 `df`，生成透视表 `pt`（行=city，列=cat，值=amt 求和，空填 0），再计算每个城市的总销售额 `city_total`（Series，按总额降序）。',
      starterCode: `import pandas as pd

df = pd.DataFrame({
    "city": ["北京", "北京", "上海", "上海", "广州"],
    "cat": ["A", "B", "A", "B", "A"],
    "amt": [100, 200, 150, 50, 300],
})

pt = ___
city_total = ___
`,
      setupCode: '',
      expectedOutput: '北京 300、广州 300、上海 200',
      tests: `assert pt.shape == (3, 2), f"形状应为 (3,2)，实际 {pt.shape}"
assert pt.loc["北京", "A"] == 100 and pt.loc["北京", "B"] == 200
assert dict(city_total)["北京"] == 300, f"北京合计应为 300，实际 {dict(city_total).get('北京')}"
assert list(city_total.index)[-1] == "上海", f"上海应排最后，实际 {list(city_total.index)}"
`,
      answer: `pt = df.pivot_table(index="city", columns="cat", values="amt", aggfunc="sum", fill_value=0)
city_total = pt.sum(axis=1).sort_values(ascending=False)`,
      explanation: '北京 300、广州 300、上海 200；上海最小排最后。',
      tags: ['pivot_table'],
    },
    {
      id: 'pandas-5-x9',
      type: 'multiple',
      difficulty: 3,
      question: '关于 `melt`，下列说法正确的有？（多选）',
      options: [
        {
          value: 'A',
          text: '把宽表转成长表',
        },
        {
          value: 'B',
          text: '`id_vars` 指定保持不变的列',
        },
        {
          value: 'C',
          text: '`var_name` / `value_name` 指定新列名',
        },
        {
          value: 'D',
          text: '`melt` 会自动去掉重复值',
        },
      ],
      answer: ['A', 'B', 'C'],
      explanation: '`melt` 不做去重，只是结构重排（D 错误）。',
      tags: ['melt'],
    },
    {
      id: 'pandas-5-x10',
      type: 'single',
      difficulty: 3,
      question: '合并后发现行数明显多于左表，第一步应该？',
      options: [
        {
          value: 'A',
          text: '直接删除重复行',
        },
        {
          value: 'B',
          text: '检查右表关联键是否有重复值',
        },
        {
          value: 'C',
          text: '改用 outer join',
        },
        {
          value: 'D',
          text: '忽略，继续分析',
        },
      ],
      answer: 'B',
      explanation: '行数放大几乎都是因为右表关联键重复，应先查原因再决定处理方式。',
      tags: ['merge', '行数放大'],
    },
    {
      id: 'pandas-5-x11',
      type: 'code',
      difficulty: 4,
      question: '两组数据拼接：`orders_2023` 与 `orders_2024` 列结构相同。请纵向拼接保存到 `all_orders`（索引重置），并计算两年的订单总额各保存到 `total_2023`、`total_2024`。',
      starterCode: `import pandas as pd

orders_2023 = pd.DataFrame({"order_id": [1, 2], "amount": [100.0, 200.0], "year": 2023})
orders_2024 = pd.DataFrame({"order_id": [3, 4, 5], "amount": [150.0, 250.0, 300.0], "year": 2024})

all_orders = ___
total_2023 = ___
total_2024 = ___
`,
      setupCode: '',
      expectedOutput: 'all_orders 5 行，total_2023 = 300.0，total_2024 = 700.0',
      tests: `assert len(all_orders) == 5, f"all_orders 应有 5 行，实际 {len(all_orders)}"
assert list(all_orders.index) == [0, 1, 2, 3, 4], "索引应重置为 0..4"
assert total_2023 == 300.0, f"total_2023 应为 300，实际 {total_2023}"
assert total_2024 == 700.0, f"total_2024 应为 700，实际 {total_2024}"
`,
      answer: `all_orders = pd.concat([orders_2023, orders_2024], ignore_index=True)
total_2023 = float(all_orders.loc[all_orders["year"] == 2023, "amount"].sum())
total_2024 = float(all_orders.loc[all_orders["year"] == 2024, "amount"].sum())`,
      explanation: '`ignore_index=True` 避免索引重复；按年份条件取金额求和。',
      tags: ['concat', '聚合'],
    },
    {
      id: 'pandas-5-x12',
      type: 'open',
      difficulty: 4,
      question: '请解释"宽表"与"长表"的区别，以及为什么建模和数据可视化通常偏好长表。',
      referenceAnswer: `**宽表**：每行一个主体，每个指标是一列。适合人阅读的报表。

**长表**：每行一个"主体-维度-值"组合。适合机器处理。

**偏好长表的原因**：

1. 可扩展：新增月份只需加行，不用改表结构；
2. 便于分组聚合：\`groupby\` 直接可用；
3. 适合可视化：绘图库按类别列分系列；
4. 适合建模：特征矩阵天然是长表；
5. 关系型数据库天然是长表结构。

**宽表的优势**：面向人的对账报表更直观。

**转换工具**：宽→长用 \`melt\`，长→宽用 \`pivot\` / \`pivot_table\`。`,
      rubric: [
        {
          point: '准确描述宽表与长表的结构差异',
          score: 2,
        },
        {
          point: '说明长表可扩展、便于聚合与可视化',
          score: 2,
        },
        {
          point: '提到转换工具 melt / pivot',
          score: 1,
        },
        {
          point: '指出宽表在报表场景更直观',
          score: 1,
        },
      ],
      keywords: ['宽表', '长表', 'melt', 'pivot', '分组', '可视化'],
      tags: ['数据形态'],
      explanation: '本题考察对数据形态的理解。答题关键是能说明"长表可扩展、便于分组聚合与可视化"，并知道 melt / pivot 是两种形态的转换工具。',
    },
  ],
};
