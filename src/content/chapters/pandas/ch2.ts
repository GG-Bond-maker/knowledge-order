import type { Chapter } from '../../../types';

/* ============================================================
 *  第 2 章：索引与数据选取（loc / iloc）
 * ============================================================ */

export const ch2: Omit<Chapter, 'courseId' | 'order'> = {
  id: 'pandas-2-2',
  title: '索引与数据选取（loc / iloc）',
  goal: '彻底分清「标签索引」与「位置索引」，熟练用 loc / iloc / 布尔掩码 / query / isin 精准取数，并能识别链式赋值、多条件漏括号等高频坑。',
  lessons: [
    /* ───────────────────── Lesson 1 ───────────────────── */
    {
      id: 'pandas-l-2-1',
      title: '显式索引 vs 位置索引：.loc 与 .iloc 的分工',
      content: `
### 学习目标

学完本节，你应该能够：
1. 用 loc 按标签取行/列/单元格；
2. 用 iloc 按位置取数并说清与 loc 的端点差异；
3. 用布尔条件筛选子集并一次完成赋值。

### 前置知识

- Series/DataFrame 与索引概念（l-1-1）；
- 布尔真值判断。

### 问题背景

选错数据是分析错的第一原因：loc 按标签、iloc 按位置，两者混用是 Pandas 最高频 bug 来源。

### 直觉理解

loc 是“按门牌号找人”（标签），iloc 是“按排队第几位找人”（位置）——数据重排后门牌不变、位次会变。

### 核心概念与原理详解

## 两种「第几行」

在 Excel 里说"第 3 行"不会歧义：就是从上往下的第三行。但在 Pandas 里有两个"第几行"：

- **位置（position）**：从 0 开始数，永远连续，就是内存里第几个；
- **标签（label）**：索引 Index 里的值，可以是整数、日期、字符串，可以重复、可以不连续。

Pandas 为此提供了两套显式取数器：

| 取数器 | 依据 | 切片是否含尾 | 典型写法 |
| --- | --- | --- | --- |
| \`.iloc\` | **位置**（integer location） | 不含尾，与 Python 列表一致 | \`df.iloc[0:3]\` 取前 3 行 |
| \`.loc\` | **标签**（label） | 含尾，左右都包含 | \`df.loc["a":"c"]\` 取 a、b、c 三行 |

这张表里藏着两条最容易出错的规则：

1. **\`.loc\` 的切片两端都包含**，这是 Pandas 故意模仿 R 语言的设计；
2. **\`.loc\` 里的数字是标签而不是位置**。对索引恰好是 0..n 的表，它看起来和 iloc 一样；一旦索引被打乱（筛选、排序、reset_index 之后都会打乱），两者就会"对不上"。

## 一个真实灾难

\`\`\`python
df = pd.DataFrame({"price": [10, 20, 30]}, index=[10, 20, 30])
df.loc[10:20]   # 按标签切片：取标签 10 和 20 → 2 行
df.iloc[10:20]  # 按位置切片：只有 3 行，位置 3 之后越界 → 返回空表
df.iloc[0:2]    # 按位置：位置 0、1 → 2 行
\`\`\`

反过来更危险：如果索引被打乱成 \`[5, 3, 1]\`，\`df.loc[0]\` 会直接 KeyError，而 \`df.iloc[0]\` 仍然安全地返回第一行。所以：**想按"第几行"取就用 iloc；想按"标签"取就用 loc。**

<IndexDiagram kind="loc" />

<IndexDiagram kind="iloc" />

## 行、列、行列：三种选择器形态

| 形式 | 含义 | 返回 |
| --- | --- | --- |
| \`df.loc[行]\` | 只选行 | Series（索引为列名）；行选择器是列表时为 DataFrame |
| \`df.loc[行, 列]\` | 选行列交集 | 标量 |
| \`df.loc[行, [列1, 列2]]\` | 选行列交集，多列 | DataFrame |
| \`df.iloc[位置, 位置]\` | 同上，但用位置 | 标量 |
| \`df.loc[:, 列]\` | 所有行、指定列 | Series |

注意：冒号 \`:\` 在 loc / iloc 里都表示"全部"。

## loc 里的「切片 vs 列表」

\`\`\`python
df.loc["北京":"上海"]      # 切片：按顺序截一段，包含两端
df.loc[["北京", "上海"]]    # 列表：按给出的顺序取，可以重复、可以乱序
df.loc[[1, 1, 2]]           # 列表可以重复标签 → 结果行数可以大于原表
\`\`\`

这也是 loc 比 \`df[]\` 强大的地方：\`df[行条件]\` 只能筛行，而 loc 可以**同时**限定行与列，例如 \`df.loc[df["city"] == "北京", ["order_id", "price"]]\`。

## \`df[ ]\` 这个「什么都不像」的语法

- \`df["price"]\` 取列；
- \`df[["price", "qty"]]\` 取多列；
- \`df[df["price"] > 10]\` 用布尔掩码筛行；
- \`df[0:2]\` 按**位置**取行（不是标签！），等价于 \`df.iloc[0:2]\`。

正因为 \`df[]\` 在不同参数下含义不同，工程规范通常要求：**取行一律用 loc / iloc，取列才用 \`df[]\`。**

## 索引是「Index 对象」，有自己的一套操作

\`\`\`python
df.index                    # RangeIndex / Index
df.index.name = "日期"       # 给索引起名，导出 Excel 时会成为表头
df.set_index("order_id")    # 把某一列变成索引
df.reset_index(drop=True)   # 丢掉旧索引，恢复 0..n-1
\`\`\`

## 易错点小结

1. 索引被打乱后，\`df.loc[0]\` 取不到你想要的"第一行"；
2. \`df.iloc[0:3]\` 取 3 行，\`df.loc[0:3]\` 取 4 行；
3. 布尔 Series 可以传给 \`df[]\` 和 \`df.loc[]\`，但**不能**传给 \`df.iloc[]\`。

## 选哪个？一句话决策

问自己：「我这个数字是**数据里的标签**，还是**它在第几行**？」标签用 loc，第几行用 iloc。如果连索引长什么样都不知道（比如刚筛选完），就永远用 iloc 取位置、用布尔掩码取条件。

<PandasIndexDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
import pandas as pd
df = pd.DataFrame({"a": [1, 2, 3]}, index=["x", "y", "z"])
print(df.loc["y", "a"])        # 标签
print(df.iloc[1, 0])           # 位置
print(df.loc[df["a"] > 1, "a"])  # 布尔筛选
\`\`\`

预期输出（实测）：标签 y 行 a 列 = 2；位置第 1 行第 0 列 = 2；布尔筛选出 a>1 的两行

**常见错误**：loc/iloc 混用后顺序依赖；链式索引 df[df.a>1]["b"] 触发 SettingWithCopyWarning（用 loc[行,列]）；忘记 iloc 排他/loc 包含端点。

### 常见误区

1. df[col] 能选行——单列是 Series，切片才是行（易混）；
2. loc 只能标签——也接受布尔数组与“标签切片”；
3. 链式赋值生效——必须一次 loc 完成。

### 知识关联

- **向前**：l-1-1 的索引概念是本节地基；
- **向后**：l-3-1 清洗前先学会精确选中要洗的行；
- **平行**：SQL 的 WHERE+ORDER BY。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| loc | 标签（含端点），支持布尔 |
| iloc | 位置（排他端点） |
| 赋值 | 一次 loc 完成，避免链式 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 pandas 官方文档 pandas.pydata.org 相应章节）
`,
      tips: [
        {
          kind: 'pitfall',
          text: 'loc 的切片是「两端都包含」，iloc 的切片是「左闭右开」。loc[0:3] 是 4 行，iloc[0:3] 是 3 行，混用会让结果差一行且非常隐蔽。',
        },
        {
          kind: 'pitfall',
          text: '筛选后索引会断号（0, 2, 5…），此时 .loc[0] 并不等于第一行，甚至可能 KeyError。凡是要按「第几行」取数，统一用 .iloc。',
        },
        {
          kind: 'interview',
          text: '面试常问 loc / iloc / df[] 的区别。标准答法：loc 按标签且切片含尾；iloc 按位置且左闭右开；df[] 取列用键、取行用布尔掩码或位置切片，语义不统一，所以规范上只建议用它取列。',
        },
        {
          kind: 'performance',
          text: 'at / iat 只取一个元素时最快，比 loc / iloc 少做一层选择器校验；但它们只适合标量，批量取数仍应使用向量化切片。',
        },
      ],
      demos: [
        {
          title: 'loc 与 iloc 的正面对比',
          lang: 'python',
          code: `import pandas as pd

df = pd.DataFrame({
    "city": ["北京", "上海", "杭州", "成都", "武汉"],
    "price": [120, 90, 150, 80, 110],
}, index=["r1", "r2", "r3", "r4", "r5"])
print(df)

print("loc 按标签切片 r2:r4 （含两端）:")
print(df.loc["r2":"r4", "price"])

print("iloc 按位置切片 1:3 （左闭右开）:")
print(df.iloc[1:3, 1])

print("单个标量:")
print("loc['r3','city'] =", df.loc["r3", "city"])
print("iloc[2, 0]      =", df.iloc[2, 0])`,
        },
        {
          title: '索引被打乱之后',
          lang: 'python',
          code: `import pandas as pd

df = pd.DataFrame({
    "city": ["北京", "上海", "杭州", "成都"],
    "price": [120, 90, 150, 80],
})
sub = df[df["price"] > 85]
print("筛选后索引:", sub.index.tolist())

print("iloc[0] 永远是第一行:", sub.iloc[0].to_dict())
print("loc[0] 是标签 0 的那一行:", sub.loc[0].to_dict())

try:
    sub.loc[1]
except KeyError as e:
    print("loc[1] 报错:", str(e)[:50])`,
        },
      ],
    },

    /* ───────────────────── Lesson 2 ───────────────────── */
    {
      id: 'pandas-l-2-2',
      title: '布尔索引与多条件筛选：& | ~ 与括号',
      content: `
### 学习目标

学完本节，你应该能够：
1. 用 query 写类 SQL 的筛选表达式；
2. 用 isin/between 处理多值与区间；
3. 用 set_index/reset_index 在标签与位置间切换。

### 前置知识

- Series/DataFrame 与索引概念（l-1-1）；
- 布尔真值判断。

### 问题背景

选错数据是分析错的第一原因：loc 按标签、iloc 按位置，两者混用是 Pandas 最高频 bug 来源。

### 直觉理解

loc 是“按门牌号找人”（标签），iloc 是“按排队第几位找人”（位置）——数据重排后门牌不变、位次会变。

### 核心概念与原理详解

## 布尔掩码：一次比较生成一整列 True/False

\`\`\`python
mask = df["price"] > 100
df[mask]                     # 只保留 True 的行
df.loc[mask, ["order_id"]]   # 只保留 True 的行，并且只要指定列
\`\`\`

布尔掩码是一个与 df 行数相同、dtype 为 bool 的 Series。它的核心价值是**向量化**：哪怕一亿行，也不会出现一行 Python 循环。

## 多条件：必须用 & | ~，而不是 and or not

把 Python 的 \`and\` 用在 Series 上会报错：

\`\`\`text
ValueError: The truth value of a Series is ambiguous.
\`\`\`

因为 \`and\` 试图把整个 Series 当成一个布尔值。正确写法是位运算符，并且**每个条件都要用括号包起来**：

\`\`\`python
df[(df["price"] > 100) & (df["city"] == "北京")]   # 正确
df[df["price"] > 100 & df["city"] == "北京"]       # 错误：运算符优先级坑
\`\`\`

第二行为什么错？Python 中比较运算符的优先级高于 \`&\`，这一行实际被解析成 \`df["price"] > (100 & df["city"]) > "北京"\`，要么报类型错误，要么悄悄算出完全错误的结果。

| 需求 | 写法 | 说明 |
| --- | --- | --- |
| 且 | \`(c1) & (c2)\` | 两个条件同时为真 |
| 或 | \`(c1) \\| (c2)\` | 任一为真 |
| 非 | \`~(c1)\` | 取反 |
| 取反的替代 | \`df[df["city"] != "北京"]\` | 与 \`~(...)\` 等价 |

## 缺失值参与比较时

数值列与 NaN 比较会得到 False（缺失位置在掩码里被视为不匹配）：\`df[df["price"] > 100]\` 会把 NaN 行丢掉。若想显式表达这一意图，可以写：

\`\`\`python
df[df["price"].notna() & (df["price"] > 100)]
\`\`\`

文本列用 \`str.contains\` 时，缺省参数会让缺失位置得到 NA，进而触发 \`ValueError: Cannot mask with non-boolean array containing NA\`，必须写 \`na=False\`。

## query()：把条件写成 SQL 的样子

\`\`\`python
df.query("price > 100 and city == '北京'")  # 可以用 and / or
df.query("price > @threshold")               # 用 @ 引用外部变量
df.query("city in ['北京', '上海']")        # in 语法
\`\`\`

优点：可读性好、不用反复写 \`df[...]\`、没有括号问题；缺点：列名含空格或中文时要用反引号包裹，拼错列名只会得到 \`UndefinedVariableError\`。**性能与布尔索引基本相当**，它的价值是可读性而不是速度。

## 「值在集合里」：isin

\`\`\`python
df[df["city"].isin(["北京", "上海"])]
df[~df["city"].isin(["北京"])]
\`\`\`

isin 比一长串 \`|\` 更短，也更快（哈希查找）。当候选集合来自另一张表时特别有用：\`df["user_id"].isin(vip_users["user_id"])\`，这就是一次"半连接"式的筛选。

## 「值在区间里」：between 与 loc 切片

\`\`\`python
df[df["price"].between(50, 120)]                     # 闭区间
df[df["price"].between(50, 120, inclusive="left")]   # 左闭右开
\`\`\`

如果索引是**排好序的日期**，可以直接用标签切片：\`df.loc["2024-01":"2024-03"]\`，比布尔筛选更简洁（第 5 章会展开）。

<PandasIndexDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
import pandas as pd
df = pd.DataFrame({"a": [1, 2, 3]}, index=["x", "y", "z"])
print(df.loc["y", "a"])        # 标签
print(df.iloc[1, 0])           # 位置
print(df.loc[df["a"] > 1, "a"])  # 布尔筛选
\`\`\`

预期输出（实测）：标签 y 行 a 列 = 2；位置第 1 行第 0 列 = 2；布尔筛选出 a>1 的两行

**常见错误**：loc/iloc 混用后顺序依赖；链式索引 df[df.a>1]["b"] 触发 SettingWithCopyWarning（用 loc[行,列]）；忘记 iloc 排他/loc 包含端点。

### 常见误区

1. df[col] 能选行——单列是 Series，切片才是行（易混）；
2. loc 只能标签——也接受布尔数组与“标签切片”；
3. 链式赋值生效——必须一次 loc 完成。

### 知识关联

- **向前**：l-1-1 的索引概念是本节地基；
- **向后**：l-3-1 清洗前先学会精确选中要洗的行；
- **平行**：SQL 的 WHERE+ORDER BY。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| loc | 标签（含端点），支持布尔 |
| iloc | 位置（排他端点） |
| 赋值 | 一次 loc 完成，避免链式 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 pandas 官方文档 pandas.pydata.org 相应章节）
`,
      tips: [
        {
          kind: 'pitfall',
          text: '多条件务必给每个条件加括号：(df.a > 1) & (df.b < 2)。漏括号时 & 的优先级低于比较运算符，代码可能不报错但结果完全错误，是最难排查的一类 bug。',
        },
        {
          kind: 'pitfall',
          text: '数值列与 NaN 比较得到 False，想显式排除缺失请先 notna()；文本列用 str.contains 时记得 na=False，否则会因掩码含 NA 而抛 ValueError。',
        },
        {
          kind: 'note',
          text: 'query() 里可以用 and / or / in / @变量，可读性接近 SQL；但列名含空格或中文时必须用反引号包裹，例如 df.query("`总价` > 100")。',
        },
        {
          kind: 'performance',
          text: 'isin 用哈希查找，比一长串 == 加 | 更快，候选集合越大优势越明显；而 apply(lambda) 做条件判断是逐行 Python 调用，比向量化慢 10~100 倍。',
        },
      ],
      demos: [
        {
          title: '多条件筛选的三种写法',
          lang: 'python',
          code: `import pandas as pd

df = pd.DataFrame({
    "order_id": [1001, 1002, 1003, 1004, 1005],
    "city": ["北京", "上海", "北京", "杭州", "北京"],
    "price": [120, 90, 150, 80, 110],
})
threshold = 100

print("布尔索引:")
print(df[(df["price"] > threshold) & (df["city"] == "北京")]["order_id"].tolist())

print("query():")
print(df.query("price > @threshold and city == '北京'")["order_id"].tolist())

print("isin + between:")
print(df[df["city"].isin(["上海", "杭州"]) & df["price"].between(80, 100)])

print("漏写括号会怎样:")
try:
    print(df[df["price"] > threshold & df["city"] == "北京"])
except Exception as e:
    print("  ", type(e).__name__, str(e)[:70])`,
        },
        {
          title: '缺失值参与比较时的坑',
          lang: 'python',
          code: `import pandas as pd
import numpy as np

df = pd.DataFrame({"city": ["北京", None, "上海"], "price": [120.0, np.nan, 90.0]})

print("NaN 与数字比较的结果:")
print(df["price"] > 100)

print("直接用 df[cond] 会丢掉 NaN 行:")
print(df[df["price"] > 100].shape[0], "行")

print("str.contains 遇到 None 需要 na=False:")
print(df["city"].str.contains("京", na=False).tolist())`,
        },
      ],
    },

    /* ───────────────────── Lesson 3 ───────────────────── */
    {
      id: 'pandas-l-2-3',
      title: '精准写入与链式赋值：at / iat、SettingWithCopy 与 CoW',
      content: `
### 学习目标

学完本节，你应该能够：
1. 用 sort_values 完成多列排序；
2. 用 nlargest/nsmallest 取 Top-N；
3. 识别并避免排序后的索引乱序陷阱（reset_index）。

### 前置知识

- Series/DataFrame 与索引概念（l-1-1）；
- 布尔真值判断。

### 问题背景

选错数据是分析错的第一原因：loc 按标签、iloc 按位置，两者混用是 Pandas 最高频 bug 来源。

### 直觉理解

loc 是“按门牌号找人”（标签），iloc 是“按排队第几位找人”（位置）——数据重排后门牌不变、位次会变。

### 核心概念与原理详解

## 读得对，还要写得对

分析工作中 80% 的代码在"读"，但真正制造 bug 的是那 20% 的"写"。本节讲三件事：怎么**安全地改一个单元格**、怎么**按条件批量修改**、以及为什么会有 **SettingWithCopyWarning** 和它今天的继任者。

## 单个单元格：at 与 iat

| 方法 | 依据 | 写法 |
| --- | --- | --- |
| \`.at\` | 标签 | \`df.at["r3", "price"] = 99\` |
| \`.iat\` | 位置 | \`df.iat[2, 1] = 99\` |

二者比 \`df.loc[...] = ...\` 更快（少一层校验），但**只能操作单个标量**，不能传切片或列表。

## 批量修改：loc 一行搞定

\`\`\`python
df.loc[df["city"] == "北京", "price"] = df.loc[df["city"] == "北京", "price"] * 1.1
df.loc[df["price"] < 0, "price"] = 0
df.loc[:, "level"] = "普通"
\`\`\`

请记住这个固定句式：**\`df.loc[行条件, 列名] = 值\`**。它是唯一推荐的"条件更新"写法。

## 链式赋值：为什么改了却没用

\`\`\`python
df[df["price"] > 100]["price"] = 0   # 链式赋值，无效或告警
sub = df[df["price"] > 100]
sub["price"] = 0                    # 改的是筛选出来的副本，原表不变
\`\`\`

原因：\`df[df["price"] > 100]\` 先产生一个**中间对象**。对中间对象赋值，结果要么没生效，要么语义含糊地部分生效。

两种正确写法：

\`\`\`python
df.loc[df["price"] > 100, "price"] = 0    # 一步定位，直接改原表
sub = df[df["price"] > 100].copy()         # 目的就是改副本时，显式 copy
\`\`\`

## Pandas 3 与 Copy-on-Write

Pandas 2.0 引入、3.0 成为默认行为的 **Copy-on-Write（CoW）** 给这件事一个确定答案：

- 任何"派生"对象（切片、筛选结果、\`df[["a"]]\`）**默认与父对象共享底层数据**，只有任意一方被修改时才真正复制；
- 于是 \`SettingWithCopyWarning\` 退出舞台，取而代之的是更准确的 \`ChainedAssignmentError\`：

\`\`\`text
ChainedAssignmentError: A value is being set on a copy of a DataFrame or Series
through chained assignment. Try using .loc[row_indexer, col_indexer] = value instead
\`\`\`

- 好消息是**行为可预测**了：改派生对象永远不会反噬原表；
- 代价是：依赖"改 sub 等于改 df"的老代码会静默失效，需要改成 \`df.loc[...]\`，或者显式 \`.copy()\` 后再回写。

## 速查表

| 需求 | 推荐写法 |
| --- | --- |
| 改一个单元格（标签） | \`df.at[标签, 列] = 值\` |
| 改一个单元格（位置） | \`df.iat[行号, 列号] = 值\` |
| 按条件批量改 | \`df.loc[条件, 列] = 值\` |
| 改一整列 | \`df[列] = 表达式\` |
| 独立处理子集 | \`sub = df[条件].copy()\` |
| 把子集修改写回原表 | \`df.loc[sub.index, 列] = sub[列]\` |

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
import pandas as pd
df = pd.DataFrame({"a": [1, 2, 3]}, index=["x", "y", "z"])
print(df.loc["y", "a"])        # 标签
print(df.iloc[1, 0])           # 位置
print(df.loc[df["a"] > 1, "a"])  # 布尔筛选
\`\`\`

预期输出（实测）：标签 y 行 a 列 = 2；位置第 1 行第 0 列 = 2；布尔筛选出 a>1 的两行

**常见错误**：loc/iloc 混用后顺序依赖；链式索引 df[df.a>1]["b"] 触发 SettingWithCopyWarning（用 loc[行,列]）；忘记 iloc 排他/loc 包含端点。

### 常见误区

1. df[col] 能选行——单列是 Series，切片才是行（易混）；
2. loc 只能标签——也接受布尔数组与“标签切片”；
3. 链式赋值生效——必须一次 loc 完成。

### 知识关联

- **向前**：l-1-1 的索引概念是本节地基；
- **向后**：l-3-1 清洗前先学会精确选中要洗的行；
- **平行**：SQL 的 WHERE+ORDER BY。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| loc | 标签（含端点），支持布尔 |
| iloc | 位置（排他端点） |
| 赋值 | 一次 loc 完成，避免链式 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 pandas 官方文档 pandas.pydata.org 相应章节）
`,
      tips: [
        {
          kind: 'pitfall',
          text: 'df[cond]["col"] = v 属于链式赋值。Pandas 3 中它不会修改原表，并抛出 ChainedAssignmentError；正确写法是 df.loc[cond, "col"] = v。',
        },
        {
          kind: 'pitfall',
          text: '看到 SettingWithCopyWarning 时不要简单加 .copy() 了事：先想清楚是要改原表（用 loc 一步定位），还是要改副本（再显式 copy）。',
        },
        {
          kind: 'interview',
          text: '「SettingWithCopyWarning 怎么产生、怎么解决」是 Pandas 面试高频题。答题链条：链式索引 → 中间对象可能是副本 → 赋值落到副本上 → 原表未变；解法是用 .loc 一步完成，或对独立子集显式 copy。Pandas 3 起该警告被 ChainedAssignmentError 取代。',
        },
        {
          kind: 'performance',
          text: 'inplace=True 并不比"重新赋值"更快，很多方法内部仍会创建新对象，而且会破坏方法链（df.fillna(0).dropna() 这种写法就没了）。现代代码风格倾向于不用 inplace。',
        },
      ],
      demos: [
        {
          title: '条件更新的正确姿势',
          lang: 'python',
          code: `import pandas as pd

df = pd.DataFrame({
    "city": ["北京", "上海", "北京", "杭州"],
    "price": [120, 90, 150, 80],
})
print("原始:")
print(df)

df.loc[df["city"] == "北京", "price"] = df.loc[df["city"] == "北京", "price"] * 1.1
print("北京涨价 10% 后:")
print(df)

df.at[1, "city"] = "上海-浦东"
df.iat[3, 1] = 0
print("单元格更新后:")
print(df)`,
        },
        {
          title: '链式赋值的后果（Pandas 3 的 CoW）',
          lang: 'python',
          code: `import warnings
import pandas as pd

df = pd.DataFrame({"city": ["北京", "上海"], "price": [120, 90]})

with warnings.catch_warnings(record=True) as w:
    warnings.simplefilter("always")
    df["city"][0] = "广州"
    print("警告个数:", len(w))
    if w:
        print("警告类型:", w[0].category.__name__)

print("原表是否被修改:", df["city"].tolist())

sub = df[df["price"] > 100].copy()
sub["price"] = 0
print("显式 copy 后改 sub:")
print(sub)
print("原表不受影响:", df["price"].tolist())`,
        },
      ],
    },
  ],

  exercises: [
    /* ---------- 1 single ---------- */
    {
      id: 'pandas-2-e1',
      type: 'single',
      difficulty: 1,
      question: '`df` 有 10 行，索引为默认的 `RangeIndex(0, 10)`。下列哪一个表达式只返回 **3 行**？',
      options: [
        { value: 'A', text: '`df.iloc[0:3]`' },
        { value: 'B', text: '`df.loc[0:3]`' },
        { value: 'C', text: '`df[0:4]`' },
        { value: 'D', text: '`df.head(4)`' },
      ],
      answer: 'A',
      explanation:
        '`iloc` 的切片左闭右开，`iloc[0:3]` 取位置 0、1、2 共 3 行。`loc[0:3]` 是**标签**切片且包含两端，取 4 行；`df[0:4]` 按位置切片同样 4 行；`head(4)` 更是 4 行。',
      relatedLessonId: 'pandas-l-2-1',
      tags: ['loc', 'iloc', '切片'],
    },
    /* ---------- 2 judge ---------- */
    {
      id: 'pandas-2-e2',
      type: 'judge',
      difficulty: 2,
      question: '对索引被打乱（例如 `[5, 3, 1]`）的 DataFrame，`df.loc[0]` 一定能取到第一行。',
      answer: false,
      explanation:
        '`loc` 按**标签**取数，索引里没有标签 0 时会直接抛 `KeyError`。要取"第一行"应使用 `df.iloc[0]`。',
      relatedLessonId: 'pandas-l-2-1',
      tags: ['loc', '索引'],
    },
    /* ---------- 3 multiple ---------- */
    {
      id: 'pandas-2-e3',
      type: 'multiple',
      difficulty: 2,
      question: '`df` 有 `city`、`price` 两列。要筛选出「city 为北京 **且** price 大于 100」的行，下列哪些写法**正确**？（多选）',
      options: [
        { value: 'A', text: '`df[(df["city"] == "北京") & (df["price"] > 100)]`' },
        { value: 'B', text: '`df[(df["city"] == "北京") and (df["price"] > 100)]`' },
        { value: 'C', text: '`df.query("city == \'北京\' and price > 100")`' },
        { value: 'D', text: '`df[df["city"] == "北京" & df["price"] > 100]`' },
      ],
      answer: ['A', 'C'],
      explanation:
        'B 用 Python 的 `and` 会被 `Series.__bool__` 拒绝，抛 `ValueError: The truth value of a Series is ambiguous`；D 缺括号，`&` 优先级低于 `>`，运算顺序完全错乱。A、C 都正确。',
      relatedLessonId: 'pandas-l-2-2',
      tags: ['布尔索引', 'query', '优先级'],
    },
    /* ---------- 4 fill ---------- */
    {
      id: 'pandas-2-e4',
      type: 'fill',
      difficulty: 2,
      question:
        '想筛选出 `city` 列取值**属于** `["北京", "上海"]` 的行，补全方法名：\n\n```python\ndf[df["city"].___(["北京", "上海"])]\n```',
      blanks: [['isin']],
      explanation:
        '`isin` 用哈希查找判断元素是否在集合中，比一串 `|` 连接的条件更简洁也更快。取反写 `~df["city"].isin([...])`。',
      caseSensitive: true,
      relatedLessonId: 'pandas-l-2-2',
      tags: ['isin', '筛选'],
    },
    /* ---------- 5 code ---------- */
    {
      id: 'pandas-2-e5',
      type: 'code',
      difficulty: 2,
      question:
        '**按位置取数。**`df` 的索引是故意打乱的字符串（`r5, r3, r1, r4, r2`）。请只用 **iloc** 完成：\n\n1. `first_row`：第一行（Series）；\n2. `corner`：第一行 `price` 列的值（标量）；\n3. `top3`：前 3 行的 `city` 与 `price` 两列（DataFrame）。',
      starterCode: `import pandas as pd

df = pd.DataFrame({
    "city": ["北京", "上海", "杭州", "成都", "武汉"],
    "price": [120, 90, 150, 80, 110],
}, index=["r5", "r3", "r1", "r4", "r2"])

first_row = ___
corner = ___
top3 = ___
`,
      setupCode: '',
      expectedOutput: 'first_row 的 city 为「北京」；corner = 120；top3 形状 (3, 2)',
      tests: [
        'assert isinstance(first_row, pd.Series), "first_row 应为 Series"',
        'assert first_row["city"] == "北京", f"first_row 的 city 应为 北京，实际为 {first_row[\'city\']}"',
        'assert int(first_row["price"]) == 120, f"first_row 的 price 应为 120，实际为 {first_row[\'price\']}"',
        'assert corner == 120, f"corner 应为 120，实际为 {corner}"',
        'assert isinstance(top3, pd.DataFrame), "top3 应为 DataFrame"',
        'assert top3.shape == (3, 2), f"top3 形状应为 (3, 2)，实际为 {top3.shape}"',
        'assert list(top3.columns) == ["city", "price"], f"top3 的列应为 [city, price]，实际为 {list(top3.columns)}"',
        'assert top3["city"].tolist() == ["北京", "上海", "杭州"], f"top3 的 city 应为 [北京, 上海, 杭州]，实际为 {top3[\'city\'].tolist()}"',
      ].join('\n'),
      explanation:
        '```python\nfirst_row = df.iloc[0]\ncorner = df.iloc[0, 1]\ntop3 = df.iloc[0:3, [0, 1]]\n```\n\n这里索引是 `r5, r3, r1...`，用 `df.loc[0]` 会直接 KeyError，因为根本没有标签 0。`iloc[0:3, [0, 1]]` 的第二个参数是**列位置列表**；等价的标签写法是 `df.loc[df.index[:3], ["city", "price"]]`。',
      tags: ['iloc', '切片', '位置索引'],
    },
    /* ---------- 6 single ---------- */
    {
      id: 'pandas-2-e6',
      type: 'single',
      difficulty: 2,
      question: '下面代码执行后，`df` 中 `price` 列被改成 0 的行有几行？\n\n```python\ndf[df["price"] > 100]["price"] = 0\n```',
      options: [
        { value: 'A', text: '所有 price > 100 的行都被改成 0' },
        { value: 'B', text: '一行都没有被改：这是链式赋值，修改落在临时副本上' },
        { value: 'C', text: '只有第一行被改' },
        { value: 'D', text: '一定能正常执行且结果正确' },
      ],
      answer: 'B',
      explanation:
        '`df[df["price"] > 100]` 先产生中间对象，再对它赋值，落不到原表上。Pandas 2.x 会触发 `SettingWithCopyWarning`，Pandas 3（CoW 默认开启）会直接抛 `ChainedAssignmentError`。正确写法：`df.loc[df["price"] > 100, "price"] = 0`。',
      relatedLessonId: 'pandas-l-2-3',
      tags: ['链式赋值', 'CoW', '陷阱'],
    },
    /* ---------- 7 code ---------- */
    {
      id: 'pandas-2-e7',
      type: 'code',
      difficulty: 3,
      question:
        '**多条件筛选与条件更新。**给定订单表 `df`，请：\n\n1. `big_beijing`：筛选出 **city 为北京且 price ≥ 100** 的订单，只保留 `order_id`、`price` 两列；\n2. `n_big_beijing`：上一步的行数（int）；\n3. 用 **`.loc`** 把 `df` 中 price 小于 50 的订单价格上调 10%（原地修改 `df`）。',
      starterCode: `import pandas as pd

df = pd.DataFrame({
    "order_id": [1001, 1002, 1003, 1004, 1005, 1006],
    "city": ["北京", "上海", "北京", "杭州", "北京", "上海"],
    "price": [120.0, 45.0, 150.0, 80.0, 60.0, 30.0],
})

big_beijing = ___
n_big_beijing = ___

# 价格 < 50 的订单上调 10%
___
`,
      setupCode: '',
      expectedOutput: 'n_big_beijing = 2；price 变为 [120.0, 49.5, 150.0, 80.0, 60.0, 33.0]',
      tests: [
        'assert big_beijing.shape == (2, 2), f"big_beijing 应为 2 行 2 列，实际为 {big_beijing.shape}"',
        'assert list(big_beijing.columns) == ["order_id", "price"], f"big_beijing 的列应为 [order_id, price]，实际为 {list(big_beijing.columns)}"',
        'assert big_beijing["order_id"].tolist() == [1001, 1003], f"big_beijing 的 order_id 应为 [1001, 1003]，实际为 {big_beijing[\'order_id\'].tolist()}"',
        'assert n_big_beijing == 2, f"n_big_beijing 应为 2，实际为 {n_big_beijing}"',
        'assert [round(v, 2) for v in df["price"].tolist()] == [120.0, 49.5, 150.0, 80.0, 60.0, 33.0], f"df 的 price 应变为 [120.0, 49.5, 150.0, 80.0, 60.0, 33.0]，实际为 {[round(v, 2) for v in df[\'price\'].tolist()]}"',
        'assert df["order_id"].tolist() == [1001, 1002, 1003, 1004, 1005, 1006], "不应增删行"',
      ].join('\n'),
      explanation:
        '```python\nbig_beijing = df.loc[(df["city"] == "北京") & (df["price"] >= 100), ["order_id", "price"]]\nn_big_beijing = len(big_beijing)\ndf.loc[df["price"] < 50, "price"] = df.loc[df["price"] < 50, "price"] * 1.1\n```\n\n两个关键点：`loc` 可以**同时**限定行与列；条件更新必须写成 `df.loc[条件, 列] = 新值`。若写成 `df[df["price"] < 50]["price"] *= 1.1` 会触发链式赋值错误。',
      tags: ['loc', '多条件', '条件更新'],
    },
    /* ---------- 8 judge ---------- */
    {
      id: 'pandas-2-e8',
      type: 'judge',
      difficulty: 1,
      question: '`df.loc[df["price"] > 100, "price"] = 0` 会修改原 DataFrame 的 `price` 列。',
      answer: true,
      explanation:
        '`loc` 一次性定位「行 + 列」，不是链式赋值，修改直接落在原表上，这也是官方推荐的写法。',
      relatedLessonId: 'pandas-l-2-3',
      tags: ['loc', '赋值'],
    },
    /* ---------- 9 multiple ---------- */
    {
      id: 'pandas-2-e9',
      type: 'multiple',
      difficulty: 3,
      question: '关于 `df.query(...)`，下列说法**正确**的是？（多选）',
      options: [
        { value: 'A', text: '在 query 字符串里可以直接写 `and` / `or`，不需要用 `&` / `|`' },
        { value: 'B', text: '可以用 `@变量名` 引用外部 Python 变量' },
        { value: 'C', text: '支持 `in` 语法，如 `city in ["北京", "上海"]`' },
        { value: 'D', text: 'query 一定比布尔索引快一个数量级' },
      ],
      answer: ['A', 'B', 'C'],
      explanation:
        'query 使用表达式求值引擎，性能与手写布尔索引基本相当，不存在数量级优势，它的价值在于可读性。列名含空格或中文时需要用反引号包裹。',
      relatedLessonId: 'pandas-l-2-2',
      tags: ['query', '性能'],
    },
    /* ---------- 10 fill ---------- */
    {
      id: 'pandas-2-e10',
      type: 'fill',
      difficulty: 2,
      question: '取「第 2 行、第 3 列」的标量值（按位置），补全下标：\n\n```python\nvalue = df.iloc[1, ___]\n```',
      blanks: [['2']],
      explanation: '位置从 0 开始：第 2 行是位置 1，第 3 列是位置 2。按标签的等价写法是 `df.at["行标签", "列名"]`。',
      relatedLessonId: 'pandas-l-2-1',
      tags: ['iloc', '标量'],
    },
    /* ---------- 11 code ---------- */
    {
      id: 'pandas-2-e11',
      type: 'code',
      difficulty: 3,
      question:
        '**三种筛选器组合。**给定订单表 `df`，请分别用指定方式筛选，并把结果的 `order_id` 保存为普通 list（保持原表顺序）：\n\n1. `by_query`：用 `.query()` 选出 `city == "上海" or price > 100` 的订单；\n2. `by_isin`：用 `.isin()` 选出 `city` 属于 `["北京", "杭州"]` 的订单；\n3. `by_between`：用 `.between()` 选出 `price` 在 60 到 120 之间（**闭区间**）的订单。',
      starterCode: `import pandas as pd

df = pd.DataFrame({
    "order_id": [1001, 1002, 1003, 1004, 1005, 1006],
    "city": ["北京", "上海", "北京", "杭州", "北京", "上海"],
    "price": [120.0, 45.0, 150.0, 80.0, 60.0, 30.0],
})

by_query = ___
by_isin = ___
by_between = ___
`,
      setupCode: '',
      expectedOutput: 'by_query=[1001, 1002, 1003, 1006]；by_isin=[1001, 1003, 1004, 1005]；by_between=[1001, 1004, 1005]',
      tests: [
        'assert by_query == [1001, 1002, 1003, 1006], f"by_query 应为 [1001, 1002, 1003, 1006]，实际为 {by_query}"',
        'assert by_isin == [1001, 1003, 1004, 1005], f"by_isin 应为 [1001, 1003, 1004, 1005]，实际为 {by_isin}"',
        'assert by_between == [1001, 1004, 1005], f"by_between 应为 [1001, 1004, 1005]，实际为 {by_between}"',
        'assert isinstance(by_query, list), "by_query 应为 list"',
      ].join('\n'),
      explanation:
        '```python\nby_query = df.query("city == \'上海\' or price > 100")["order_id"].tolist()\nby_isin = df.loc[df["city"].isin(["北京", "杭州"]), "order_id"].tolist()\nby_between = df.loc[df["price"].between(60, 120), "order_id"].tolist()\n```\n\n`between(60, 120)` 默认 `inclusive="both"`，所以 120.0 与 60.0 都被包含（订单 1001、1005）。注意 query 的字符串里引号嵌套：外层用双引号、内层用单引号。',
      tags: ['query', 'isin', 'between'],
    },
    /* ---------- 12 single ---------- */
    {
      id: 'pandas-2-e12',
      type: 'single',
      difficulty: 2,
      question: '下列哪种写法在 Pandas 3 中能**正确且不告警**地修改原表？',
      options: [
        { value: 'A', text: '`df[df["price"] > 100]["price"] = 0`' },
        { value: 'B', text: '`sub = df[df["price"] > 100]` 之后 `sub["price"] = 0`' },
        { value: 'C', text: '`df.loc[df["price"] > 100, "price"] = 0`' },
        { value: 'D', text: '`df["price"][df["price"] > 100] = 0`' },
      ],
      answer: 'C',
      explanation:
        'A、D 是链式赋值，Pandas 3 会抛 `ChainedAssignmentError`；B 只修改了筛选出来的副本（CoW 下原表不受影响）。只有 C 用 `loc` 一步定位行列，会真正修改原表。',
      relatedLessonId: 'pandas-l-2-3',
      tags: ['链式赋值', 'loc'],
    },
    /* ---------- 13 open ---------- */
    {
      id: 'pandas-2-e13',
      type: 'open',
      difficulty: 3,
      question:
        '同事写了一段代码，本想产出「北京地区 price 大于 100 的订单」，结果有的环境里不报错，但结果明显不对（有的环境直接 TypeError）：\n\n```python\ndf[df["city"] == "北京" & df["price"] > 100]\n```\n\n请解释**为什么错**、**这行代码实际在做什么**，并给出至少 2 种正确写法。',
      referenceAnswer: `**为什么错**：Python 的运算符优先级中，比较运算符（\`==\`、\`>\`）高于位运算符 \`&\`。这行代码实际被解析成：

\`\`\`python
df["price"] > (100 & df["city"]) > "北京"
\`\`\`

整条表达式完全不是作者想要的逻辑。

**它实际在做什么**：先试图对整数 \`100\` 与一个 Series 做按位与并和字符串比较。多数情况下会抛 \`TypeError\`；如果数据恰好全是整数/布尔，则可能算出无意义的掩码，然后拿去筛选——于是得到"不报错但结果全错"的可怕情况。

**正确写法**（任两种）：

1. 布尔索引加括号：\`df[(df["city"] == "北京") & (df["price"] > 100)]\`
2. query：\`df.query("city == '北京' and price > 100")\`
3. 分两步存变量：\`cond1 = df["city"] == "北京"; cond2 = df["price"] > 100; df[cond1 & cond2]\`
4. loc 写法：\`df.loc[(df["city"] == "北京") & (df["price"] > 100), :]\`

**团队规范建议**：超过一个条件的筛选就拆成多个布尔变量，或统一用 \`query\`；code review 专门检查 \`&\` / \`|\` 两侧是否有括号。`,
      rubric: [
        { point: '指出运算符优先级问题（& 低于比较运算）', score: 2 },
        { point: '说明实际执行顺序 / 实际被解析成的表达式', score: 2 },
        { point: '给出带括号的布尔索引正确写法', score: 1 },
        { point: '给出 query 或分步存变量的写法', score: 1 },
      ],
      keywords: ['优先级', '括号', 'and', 'query', '掩码'],
      explanation:
        '面试官问这题想看的是你能否**推导出表达式的真实解析顺序**。能用「分步存变量」从根本上避免这一类坑，是很成熟的习惯。',
      relatedLessonId: 'pandas-l-2-2',
      tags: ['布尔索引', '优先级', '面试'],
    },
    /* ---------- 14 judge ---------- */
    {
      id: 'pandas-2-e14',
      type: 'judge',
      difficulty: 2,
      question: '在默认 RangeIndex 上，`df.iloc[0:3]` 与 `df.loc[0:3]` 返回的行数相同。',
      answer: false,
      explanation:
        '`iloc[0:3]` 左闭右开 → 3 行（0,1,2）；`loc[0:3]` 含两端 → 4 行（0,1,2,3）。',
      relatedLessonId: 'pandas-l-2-1',
      tags: ['loc', 'iloc', '切片'],
    },
    /* ---------- 15 fill ---------- */
    {
      id: 'pandas-2-e15',
      type: 'fill',
      difficulty: 3,
      question:
        '想取「第 2 行到第 4 行（含）的第 1 列」，下面还有一处空白需要你补全方法名：\n\n```python\ndf.___[1:4, 0]\n```',
      blanks: [['iloc', 'df.iloc']],
      explanation: '`iloc[1:4, 0]` 取位置 1、2、3 三行的第 0 列。若用 `loc` 则按标签解释，遇到非整数索引会报错。',
      relatedLessonId: 'pandas-l-2-1',
      tags: ['iloc', '切片'],
    },
    /* ---------- 16 code ---------- */
    {
      id: 'pandas-2-e16',
      type: 'code',
      difficulty: 4,
      question:
        '**多条件组合 + 取反 + 区间。**给定订单表 `df`（`price` 里有 NaN），请求出满足以下条件的订单 id 列表 `ids`：\n\n- `price` **不为空**；\n- 且 `price` 落在 **(100, 500]**（不含 100、含 500）；\n- 且 `city` **不是** `"北京"`。\n\n结果保持原表顺序，`ids` 为元素是 int 的普通 list。',
      starterCode: `import pandas as pd
import numpy as np

df = pd.DataFrame({
    "order_id": [1001, 1002, 1003, 1004, 1005, 1006, 1007],
    "city": ["北京", "上海", "杭州", "上海", "北京", "成都", "上海"],
    "price": [120.0, 250.0, np.nan, 500.0, 300.0, 80.0, 100.0],
})

# 提示：between 可以指定 inclusive；城市取反可以用 ~ 配合 isin
mask = ___
ids = ___
`,
      setupCode: '',
      expectedOutput: 'ids = [1002, 1004]',
      tests: [
        'assert ids == [1002, 1004], f"ids 应为 [1002, 1004]，实际为 {ids}"',
        'assert isinstance(ids, list), "ids 应为 list"',
        'assert all(isinstance(v, int) for v in ids), "ids 的元素应为 int"',
      ].join('\n'),
      explanation:
        '```python\nmask = df["price"].notna() & df["price"].between(100, 500, inclusive="right") & ~df["city"].isin(["北京"])\nids = df.loc[mask, "order_id"].tolist()\n```\n\n要点：\n1. 先 `notna()` 再 `between`，避免 NA 进入掩码；\n2. `inclusive="right"` 表示 `(100, 500]`；\n3. 城市取反用 `~df["city"].isin([...])`，也可以写 `df["city"] != "北京"`；\n4. 每个条件都加括号，`&` 才能正确连接。',
      tags: ['多条件', 'between', '缺失值'],
    },
    /* ---------- 17 multiple ---------- */
    {
      id: 'pandas-2-e17',
      type: 'multiple',
      difficulty: 2,
      question: '关于 `df.at` 与 `df.iat`，下列说法**正确**的是？（多选）',
      options: [
        { value: 'A', text: '`at` 用标签定位，`iat` 用位置定位' },
        { value: 'B', text: '它们只适用于取/放单个标量，不能传切片' },
        { value: 'C', text: '单元素访问时，`at` / `iat` 通常比 `loc` / `iloc` 更快' },
        { value: 'D', text: '`df.at[0, "price"]` 里的 0 一定表示第 1 行的位置' },
      ],
      answer: ['A', 'B', 'C'],
      explanation:
        'D 错误：`at` 的 0 是**标签** 0，索引被打乱后含义就变了。`at` / `iat` 少了一层选择器校验，标量访问更快，但不支持切片或列表选择器。',
      relatedLessonId: 'pandas-l-2-3',
      tags: ['at', 'iat', '性能'],
    },
    /* ---------- 18 single ---------- */
    {
      id: 'pandas-2-e18',
      type: 'single',
      difficulty: 3,
      question: '`df` 的索引是 `["a", "b", "c"]`，`df.loc["a":"c"]` 与 `df.loc[["a", "c"]]` 的结果分别是？',
      options: [
        { value: 'A', text: '都是 3 行' },
        { value: 'B', text: '前者 3 行，后者 2 行' },
        { value: 'C', text: '前者 2 行，后者 3 行' },
        { value: 'D', text: '后者报错' },
      ],
      answer: 'B',
      explanation:
        '`loc` 切片按顺序截取一段并包含两端，得 a、b、c 三行；列表选择器只取列出的标签，得 a、c 两行。有趣的是列表可以写重复标签 `["a", "a", "c"]`，此时反而得到 3 行。',
      relatedLessonId: 'pandas-l-2-1',
      tags: ['loc', '选择器'],
    },
    /* ---------- 19 code ---------- */
    {
      id: 'pandas-2-e19',
      type: 'code',
      difficulty: 3,
      question:
        '**按标签切段读取。**`df` 的索引是 `"2024-01-01"` 到 `"2024-01-10"` 的字符串日期，`price` 为每日价格。请：\n\n1. `slice_df`：用 **loc 切片** 取 `"2024-01-03"` 到 `"2024-01-06"`（含两端）的 `price` 列（Series）；\n2. `n_rows`：区间行数；\n3. `avg`：区间内的平均价格（保留 2 位小数）。',
      starterCode: `import pandas as pd

df = pd.DataFrame(
    {"price": [100, 102, 105, 103, 108, 110, 107, 112, 115, 118]},
    index=[f"2024-01-0{i}" for i in range(1, 10)] + ["2024-01-10"],
)

slice_df = ___
n_rows = ___
avg = ___
`,
      setupCode: '',
      expectedOutput: 'slice_df 共 4 项，avg = 106.5',
      tests: [
        'assert isinstance(slice_df, pd.Series), "slice_df 应为 Series"',
        'assert list(slice_df.index) == ["2024-01-03", "2024-01-04", "2024-01-05", "2024-01-06"], f"slice_df 的索引应为 01-03 到 01-06，实际为 {list(slice_df.index)}"',
        'assert slice_df.tolist() == [105, 103, 108, 110], f"slice_df 的值应为 [105, 103, 108, 110]，实际为 {slice_df.tolist()}"',
        'assert n_rows == 4, f"n_rows 应为 4，实际为 {n_rows}"',
        'assert abs(avg - 106.5) < 1e-6, f"avg 应为 106.5，实际为 {avg}"',
      ].join('\n'),
      explanation:
        '```python\nslice_df = df.loc["2024-01-03":"2024-01-06", "price"]\nn_rows = len(slice_df)\navg = round(slice_df.mean(), 2)\n```\n\n索引是**有序且格式统一的字符串**，`loc` 的切片会按字典序截取区间，两端都包含。若索引是真正的 `DatetimeIndex`（第 5 章），这就是时间序列筛选的标准姿势。',
      tags: ['loc', '切片', '时间索引'],
    },
    /* ---------- 20 judge ---------- */
    {
      id: 'pandas-2-e20',
      type: 'judge',
      difficulty: 2,
      question: '`df[0:2]` 是严格按照**标签** 0 到 2 取行的。',
      answer: false,
      explanation:
        '`df[切片]` 在参数是整数切片时按**位置**解释，等价于 `df.iloc[0:2]`。正因 `df[]` 语义混乱，规范上建议取行一律走 `loc` / `iloc`。',
      relatedLessonId: 'pandas-l-2-1',
      tags: ['索引', '陷阱'],
    },
    /* ---------- 21 single ---------- */
    {
      id: 'pandas-2-e21',
      type: 'single',
      difficulty: 3,
      question: 'Pandas 3 中执行 `df["price"][df["price"] > 100] = 0`，最可能的结果是？',
      options: [
        { value: 'A', text: '静默地只修改 DataFrame 中的一部分行' },
        { value: 'B', text: '抛出 ChainedAssignmentError，且原 DataFrame 不变' },
        { value: 'C', text: '抛出 KeyError' },
        { value: 'D', text: '正常修改原表所有目标行' },
      ],
      answer: 'B',
      explanation:
        'Pandas 3 默认开启 Copy-on-Write，链式赋值不再"部分生效"，而是明确失败并抛出 `ChainedAssignmentError`。正确写法：`df.loc[df["price"] > 100, "price"] = 0`。这个改动把"行为不确定"变成了"确定失败"，便于及早发现 bug。',
      relatedLessonId: 'pandas-l-2-3',
      tags: ['CoW', '链式赋值'],
    },
    /* ---------- 22 fill ---------- */
    {
      id: 'pandas-2-e22',
      type: 'fill',
      difficulty: 2,
      question: '取 `df` 中 `price` 列最大值所在行的索引标签（最大值唯一），补全方法名：\n\n```python\nlabel = df["price"].___()\n```',
      blanks: [['idxmax']],
      explanation:
        '`idxmax()` 返回最大值对应的索引标签。想同时拿到数值可写 `df.loc[df["price"].idxmax()]`，或直接用 `df["price"].max()`。对应还有 `idxmin()`。',
      relatedLessonId: 'pandas-l-2-1',
      tags: ['索引', 'idxmax'],
    },
  ],
};
