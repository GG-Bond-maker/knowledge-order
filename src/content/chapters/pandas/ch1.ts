import type { Chapter } from '../../../types';

/* ============================================================
 *  第 1 章：Series 与 DataFrame 基础
 * ============================================================ */

export const ch1: Omit<Chapter, 'courseId' | 'order'> = {
  id: 'pandas-1-1',
  title: 'Series 与 DataFrame 基础',
  goal: '建立「一维 Series + 二维 DataFrame + 索引/列名两张标签」的心智模型，会用字典/列表/数组三种方式造表，看懂 dtype，并熟练使用 head / info / describe 做第一次数据体检。',
  lessons: [
    /* ───────────────────── Lesson 1 ───────────────────── */
    {
      id: 'pandas-l-1-1',
      title: '数据结构全景：Series、DataFrame 与「带标签的数组」',
      content: `
### 学习目标

学完本节，你应该能够：
1. 用 Series/DataFrame 构造带标签数据并读出形状与 dtype；
2. 解释索引对齐在算术中的行为；
3. 用 describe() 快速体检一张表。

### 前置知识

- Python 基础课的 list/dict（l-2 章）；
- 无 Pandas 前置。

### 问题背景

数据分析的 90% 时间花在读数据与整理结构上——Series 与 DataFrame 是 Pandas 的一对基石：理解它们，读/选/洗/算全有了统一语言。

### 直觉理解

DataFrame 像一张带行号列名的 Excel 表，Series 是单独抽出的一列（自带行标签）——一切操作最终都落到“按标签对齐”这一件事上。

### 核心概念与原理详解

## 为什么数据分析从「表」开始

Excel 里我们习惯一张表：行是记录，列是字段。Pandas 把这件事抽象成两个类：**Series（一维）** 和 **DataFrame（二维）**。它们不是新发明的容器，而是**在 NumPy 数组外面套了一层"标签系统"**。理解这句话，就理解了 Pandas 80% 的设计。

一句话对照：

| Python 原生 | NumPy | Pandas | 关键差别 |
| --- | --- | --- | --- |
| \`list\` | \`ndarray\`（1 维） | \`Series\` | 每个元素有**索引标签** |
| \`dict\` / 列表的列表 | \`ndarray\`（2 维） | \`DataFrame\` | 行有**行索引**，列有**列名**，且每列可不同类型 |

## Series：一维带标签数组

Series 由三部分组成：**values（值）**、**index（索引标签）**、**name（名字）**。

\\\`\\\`\\\`python
import pandas as pd

s = pd.Series([120, 95, 88], index=["语文", "数学", "英语"], name="score")
print(s.values)   # [120  95  88]   → 底层是一个 NumPy 数组
print(s.index)    # Index(['语文', '数学', '英语'], dtype='object')
print(s.name)     # score
\\\`\\\`\\\`

所以 Series 有两种"下标"写法：

- \\\`s["数学"]\\\`：按**标签**取，和字典一样；
- \\\`s.iloc[1]\\\`：按**位置**取，和列表一样。

初学者 90% 的困惑都来自这两者混用，第 2 章会专门讲。这里只需记住：**索引标签默认是 0,1,2,... 的整数，看起来像位置，但它是标签。**

## DataFrame：由多个 Series 拼成的"Excel 表"

可以这样理解 DataFrame：**每一列就是一个 Series，它们共享同一条行索引。**

\\\`\\\`\\\`python
df = pd.DataFrame({
    "name":  ["张三", "李四", "王五"],
    "score": [88, 92, 79],
    "city":  ["北京", "上海", "北京"],
})
\\\`\\\`\\\`

内部结构可以画成：

\`\`\`text
            列名(numpy dtype 决定列的类型)
            name(对象)   score(int64)   city(对象)
索引 0      张三          88             北京
索引 1      李四          92             上海
索引 2      王五          79             北京
\`\`\`

这里有两个非常重要的性质：

1. **列可以有不同的 dtype**。这是 Pandas 与 NumPy 二维数组最大的区别：NumPy 的 \\\`np.array([[1, "a"]])\\\` 会把整数也变成字符串，而 DataFrame 保留每列各自的类型。
2. **行索引在所有列之间共享**。给某一列重新排索引，其它列会一起对齐——这个"对齐"机制既是便利，也是 [[坑]]（详见第 4 章的 \\\`+\\\` 与 \\\`merge\\\`）。

## 常用的"表"操作一览（本章先建印象）

| 操作 | 写法 | 返回 |
| --- | --- | --- |
| 看形状 | \\\`df.shape\\\` | \\\`(行数, 列数)\\\` 元组 |
| 看前几行 | \\\`df.head(5)\\\` | DataFrame |
| 看列名 | \\\`df.columns\\\` | Index 对象 |
| 看类型 | \\\`df.dtypes\\\` | 每列一个 dtype 的 Series |
| 取一列 | \\\`df["score"]\\\` | Series |
| 取多列 | \\\`df[["name", "score"]]\\\` | DataFrame |
| 结构化概览 | \\\`df.info()\\\` | 打印到控制台（返回 None） |
| 统计摘要 | \\\`df.describe()\\\` | DataFrame |

注意倒数第二行：\\\`info()\\\` **返回 None**，它的作用是往标准输出打印。浏览器里执行后你会看到"打印结果"，但拿不到返回值，不能写 \\\`x = df.info()\\\` 再用 \\\`x\\\`。

## 不可变与可变：View 与 Copy

Pandas 2.x/3.x 引入了 **Copy-on-Write（CoW）** 语义：当你写 \\\`sub = df[df["score"] > 80]\\\` 时，\`sub\` 只是在展示上是一个新对象，底层数据共享；一旦你修改它就复制一份。好处是省内存、行为可预测；代价是**"修改 sub 顺手改了 df"这种老代码可能不再生效**（第 6 章专门讨论）。

## 什么时候用 Series，什么时候用 DataFrame

- 只有**一个字段**的时间序列、计数结果（如 \\\`value_counts()\\\`）、某一列的计算结果 → Series；
- 只要需要**多列同时出现**，或者要做 \\\`groupby\\\` / \\\`merge\\\` / 导出 → DataFrame。

实际工作中，绝大多数 API 在"单列"时返回 Series，在"多列"时返回 DataFrame。例如 \\\`df.groupby("city")["price"].sum()\\\` 是 Series，去掉 \\\`["price"]\\\` 后 \\\`df.groupby("city").sum()\\\` 就是 DataFrame。

<PandasIndexDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
import pandas as pd
s = pd.Series([88, 92, 79], index=["语", "数", "英"])
df = pd.DataFrame({"name": ["甲", "乙"], "score": [88, 92]})
print(s, sep="\\n")
print(df)
print(df["score"].mean())  # 90.0
\`\`\`

预期输出（实测）：Series 按索引打印三行；DataFrame 两列表格；score 均值 90.0

**常见错误**：把 DataFrame 当 list 用下标取（应 df["col"] 或 loc）；混用位置与标签；忘记索引对齐导致 NaN。

### 常见误区

1. Series 就是列表——它多一层索引，算术按索引对齐；
2. df["col"] 返回视图可原地改——可能返回副本，赋值链有 SettingWithCopyWarning；
3. 索引必须唯一——重复索引会让对齐结果翻倍。

### 知识关联

- **向前**：Python 基础课的 list/dict 是直觉来源；
- **向后**：l-2-1 的 loc/iloc 是精确取数工具；
- **平行**：Excel 的行号列名是同构概念。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| Series | 一维 + 索引标签 |
| DataFrame | 二维表，列是 Series |
| 对齐 | 算术按索引对齐，缺失成 NaN |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 pandas 官方文档 pandas.pydata.org 相应章节）
`,
      tips: [
        {
          kind: 'pitfall',
          text: 'df["score"] 返回 Series 只有一列；df[["score"]] 返回 DataFrame。少写一层方括号，后面再 .sum()、.to_frame() 的行为会完全不同，报错信息也往往让人摸不着头脑。',
        },
        {
          kind: 'note',
          text: 'Series 的 .values 是 NumPy 数组，去掉标签只留数字；真要保留索引请用 .to_numpy() 之外的 .items() / .to_dict()，或直接对整个 Series 做运算。',
        },
        {
          kind: 'interview',
          text: '面试常问：「Series 和 NumPy 一维数组的区别？」要点：Series 多了索引标签、可以异构（配合 DataFrame）、支持按标签对齐；去掉标签后计算性能基本一致。',
        },
      ],
      demos: [
        {
          title: '从「带标签的数组」理解 Series',
          lang: 'python',
          code: `import pandas as pd
import numpy as np

s = pd.Series([120, 95, 88], index=["语文", "数学", "英语"], name="score")
print("values :", s.values)
print("index  :", list(s.index))
print("name   :", s.name)
print("dtype  :", s.dtype)

print("\\n按标签取值 s['数学'] =", s["数学"])
print("按位置取值 s.iloc[1] =", s.iloc[1])

print("\\n对齐就是这么来的：两个 Series 相加，标签一致的才相加")
a = pd.Series([1, 2, 3], index=["x", "y", "z"])
b = pd.Series([10, 20], index=["y", "z"])
print(a + b)`,
        },
        {
          title: 'DataFrame 就是「共享行索引的多列 Series」',
          lang: 'python',
          code: `import pandas as pd

df = pd.DataFrame({
    "name": ["张三", "李四", "王五"],
    "score": [88, 92, 79],
    "city": ["北京", "上海", "北京"],
})
print(df)
print()
print("shape  :", df.shape)
print("columns:", list(df.columns))
print("index  :", list(df.index))
print("dtypes :", df.dtypes.to_dict())

col = df["score"]
print("\\n单列类型:", type(col).__name__, "| 它的索引与 df 相同吗:", col.index.equals(df.index))`,
        },
      ],
    },

    /* ───────────────────── Lesson 2 ───────────────────── */
    {
      id: 'pandas-l-1-2',
      title: '创建方式与 dtype：从字典、列表、数组与 CSV 字符串造表',
      content: `
### 学习目标

学完本节，你应该能够：
1. 用 head/info/describe 三件套完成数据体检；
2. 从 dict/list/CSV 三种来源构造 DataFrame；
3. 说出 dtype 自动推断的常见意外（object 型数字）。

### 前置知识

- Python 基础课的 list/dict（l-2 章）；
- 无 Pandas 前置。

### 问题背景

数据分析的 90% 时间花在读数据与整理结构上——Series 与 DataFrame 是 Pandas 的一对基石：理解它们，读/选/洗/算全有了统一语言。

### 直觉理解

DataFrame 像一张带行号列名的 Excel 表，Series 是单独抽出的一列（自带行标签）——一切操作最终都落到“按标签对齐”这一件事上。

### 核心概念与原理详解

## 五种最常用的创建方式

| 方式 | 典型写法 | 适用场景 | 注意点 |
| --- | --- | --- | --- |
| 字典 → 列 | \\\`pd.DataFrame({"a": [1, 2], "b": [3, 4]})\\\` | 手写测试数据、从多个列表合并 | 各列表长度必须一致 |
| 记录列表 | \\\`pd.DataFrame([{"a": 1, "b": 2}, {"a": 3}])\\\` | 从接口 JSON 读入 | 缺的键自动变 NaN |
| 二维数组 + 列名 | \\\`pd.DataFrame(arr, columns=[...])\\\` | 从 NumPy 迁移 | 所有列类型被统一 |
| 两个 Series | \\\`pd.DataFrame({"x": s1, "y": s2})\\\` | 合并对齐已有结果 | 索引会**取并集** |
| CSV 文本 | \\\`pd.read_csv(io.StringIO(text))\\\` | 读真实数据 | 类型推断可能出错 |

### 字典方式：最常见也最容易犯长度错误

\\\`\\\`\\\`python
pd.DataFrame({"a": [1, 2, 3], "b": [4, 5]})
# ValueError: All arrays must be of the same length
\\\`\\\`\\\`

### 记录列表：JSON 的天然形态

\\\`\\\`\\\`python
rows = [{"id": 1, "price": 9.9}, {"id": 2}, {"id": 3, "price": 19.9}]
df = pd.DataFrame(rows)   # 缺失的 price 自动补 NaN
\\\`\\\`\\\`

### 从 CSV 字符串读入（浏览器环境尤其重要）

浏览器里没有本地文件系统，练习时通常给一段 CSV 文本，用 \\\`io.StringIO\\\` 包一层再交给 \\\`read_csv\\\`：

\\\`\\\`\\\`python
import io
csv_text = "id,price\\n1,9.9\\n2,19.9\\n"
df = pd.read_csv(io.StringIO(csv_text))
\\\`\\\`\\\`

真实项目中文件在磁盘上，等价写法是 \\\`pd.read_csv("orders.csv")\\\`。**除了"数据从哪来"这一层不同，后面所有的清洗、分析代码完全一样。**

## dtype：DataFrame 的"列类型系统"

| dtype | 含义 | 常见来源 | 影响 |
| --- | --- | --- | --- |
| \\\`int64\\\` | 64 位整数 | 整数列表 | 可做算术、可作索引 |
| \\\`float64\\\` | 双精度浮点 | 有小数、**或混入了 NaN 的整数列** | 比较要用 \\\`np.isclose\\\` |
| \\\`object\\\` / \\\`str\\\` | Python 对象（Pandas 3 默认字符串列是 \\\`str\\\`） | 含中文、含 None 的文本 | 不能直接排序做数值计算 |
| \\\`bool\\\` | 布尔 | 比较结果 | 布尔掩码的基石 |
| \\\`datetime64[ns]\\\` | 时间戳 | \\\`to_datetime\\\` | 第 5 章主角 |
| \\\`category\\\` | 有限取值集合 | \\\`astype("category")\\\` | 省内存、分组更快 |

### 为什么整数列会变成 float？

这是新手最常见的"灵异事件"：

\\\`\\\`\\\`python
df = pd.DataFrame({"qty": [1, 2, None]})
print(df["qty"].dtype)   # float64  ← 因为 NaN 只能存在浮点数组里
\\\`\\\`\\\`

NumPy 的整数数组没有"缺失值"这个概念，所以 Pandas 只能退化成 float64 来装 NaN，或者用可空整型 \\\`Int64\\\`（大写 I）。

### 类型转换：astype 与 to_numeric

\\\`\\\`\\\`python
df["id_str"].astype(int)             # 前提：字符串里全是合法数字
pd.to_numeric(df["price"], errors="coerce")   # 遇到脏值变 NaN，而不是报错
\\\`\\\`\\\`

\\\`astype\\\` 遇到无法转换的值会**直接抛异常**，而 \\\`to_numeric(errors="coerce")\\\` 会**把脏值变成 NaN**，在数据清洗里后者更安全。

## 常见陷阱速记

- 读 CSV 时金额列被读成字符串（含 \\\`"￥1,299"\\\`、千分位逗号、单位"元"），必须清洗后再转；
- \\\`astype(int)\\\` 对 \\\`1.9\\\` 会**截断**为 1，不会四舍五入；
- \\\`astype(str)\\\` 会把 NaN 变成字符串 \\\`"nan"\\\`，后续判断就再也认不出缺失了。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
import pandas as pd
s = pd.Series([88, 92, 79], index=["语", "数", "英"])
df = pd.DataFrame({"name": ["甲", "乙"], "score": [88, 92]})
print(s, sep="\\n")
print(df)
print(df["score"].mean())  # 90.0
\`\`\`

预期输出（实测）：Series 按索引打印三行；DataFrame 两列表格；score 均值 90.0

**常见错误**：把 DataFrame 当 list 用下标取（应 df["col"] 或 loc）；混用位置与标签；忘记索引对齐导致 NaN。

### 常见误区

1. Series 就是列表——它多一层索引，算术按索引对齐；
2. df["col"] 返回视图可原地改——可能返回副本，赋值链有 SettingWithCopyWarning；
3. 索引必须唯一——重复索引会让对齐结果翻倍。

### 知识关联

- **向前**：Python 基础课的 list/dict 是直觉来源；
- **向后**：l-2-1 的 loc/iloc 是精确取数工具；
- **平行**：Excel 的行号列名是同构概念。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| Series | 一维 + 索引标签 |
| DataFrame | 二维表，列是 Series |
| 对齐 | 算术按索引对齐，缺失成 NaN |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 pandas 官方文档 pandas.pydata.org 相应章节）
`,
      tips: [
        {
          kind: 'pitfall',
          text: '浮点列在数字前用 astype(int) 是「向零截断」：pd.Series([1.9, -1.9]).astype(int) 得到 [1, -1]。要四舍五入请先 .round() 再 astype。',
        },
        {
          kind: 'pitfall',
          text: 'astype(str) 之后，原本的 NaN 会变成字符串 "nan" 或 "None"，.isna() 再也认不出来。转换文本前先用 .isna() 打标记，或改用可空 Int64 / string 类型。',
        },
        {
          kind: 'note',
          text: 'Pandas 3 起字符串列的默认 dtype 是 str（不再是 object），字符串列的内存和空值处理都更合理；但 assert s.dtype == "object" 这类老断言会失效，做类型判断请用 pandas.api.types.is_string_dtype。',
        },
        {
          kind: 'performance',
          text: '整列重复率高的文本（如渠道、城市、品类）转成 category 后，内存占用常能降低一个数量级，groupby 也会明显变快，但新增类目需要先 add_categories。',
        },
      ],
      demos: [
        {
          title: '四种创建方式与缺失值带来的 dtype 退化',
          lang: 'python',
          code: `import io
import pandas as pd

# 1. 字典 → 列
df1 = pd.DataFrame({"id": [1, 2, 3], "city": ["北京", "上海", "杭州"]})
print("字典方式：", df1.shape)

# 2. 记录列表（等价于 JSON）
rows = [{"id": 1, "price": 9.9}, {"id": 2}, {"id": 3, "price": 19.9}]
print("\\n记录列表方式：")
print(pd.DataFrame(rows))

# 3. CSV 字符串
csv_text = "id,price,qty\\n1,9.9,2\\n2,19.9,1\\n"
print("\\nCSV 方式：")
print(pd.read_csv(io.StringIO(csv_text)).dtypes.to_dict())

# 4. 缺失值会让整数列退化成 float
df4 = pd.DataFrame({"qty": [1, 2, None]})
print("\\n带 None 的列 dtype =", df4["qty"].dtype)`,
        },
        {
          title: 'dtype 转换与 to_numeric 的安全清洗',
          lang: 'python',
          code: `import pandas as pd

raw = pd.Series(["12", "8元", "15", "不祥", "20"])
print("原始 dtype:", raw.dtype)

num = pd.to_numeric(raw, errors="coerce")
print("coerce 后:")
print(num)
print("dtype:", num.dtype, " 缺失个数:", int(num.isna().sum()))

print("\\nastype(int) 遇到脏值会直接报错：")
try:
    raw.astype(int)
except ValueError as e:
    print("  ValueError:", str(e)[:60], "...")

print("\\n浮点截断：", pd.Series([1.9, -1.9]).astype(int).tolist())`,
        },
      ],
    },

    /* ───────────────────── Lesson 3 ───────────────────── */
    {
      id: 'pandas-l-1-3',
      title: '第一次数据体检：head / info / describe / shape，以及列的增删改',
      content: `
### 学习目标

学完本节，你应该能够：
1. 解释向量化运算为何比循环快；
2. 对两列做算术与比较生成新列；
3. 用 apply 处理向量化不便的自定义逻辑。

### 前置知识

- Python 基础课的 list/dict（l-2 章）；
- 无 Pandas 前置。

### 问题背景

数据分析的 90% 时间花在读数据与整理结构上——Series 与 DataFrame 是 Pandas 的一对基石：理解它们，读/选/洗/算全有了统一语言。

### 直觉理解

DataFrame 像一张带行号列名的 Excel 表，Series 是单独抽出的一列（自带行标签）——一切操作最终都落到“按标签对齐”这一件事上。

### 核心概念与原理详解

## 拿到任何一张表，先做 30 秒体检

专业分析师接手数据的第一件事不是 \\\`groupby\\\`，而是回答四个问题：**有多大？有哪些列？每列什么类型？有没有缺失？** 对应四个动作：

| 动作 | 代码 | 看什么 |
| --- | --- | --- |
| 形状 | \\\`df.shape\\\` | \\\`(行数, 列数)\\\`，判断数据量级 |
| 预览 | \\\`df.head()\\\` / \\\`df.tail()\\\` | 字段含义对不对、编码是否乱码 |
| 结构 | \\\`df.info()\\\` | 每列 dtype、非空个数、内存占用 |
| 统计 | \\\`df.describe()\\\` | 数值列的均值/分位数，发现量级异常 |

### info()：最被低估的一行代码

\`\`\`text
<class 'pandas.core.frame.DataFrame'>
RangeIndex: 5 entries, 0 to 4
Data columns (total 4 columns):
 #   Column   Non-Null Count  Dtype
---  ------   --------------  -----
 0   order_id  5 non-null      int64
 1   price     4 non-null      float64
 2   city      5 non-null      str
 3   order_date 5 non-null     str   ← 日期还是字符串！
\`\`\`

读完这张小表，你能一眼看出：**price 有 1 个缺失**；**order_date 是字符串而不是 datetime**，说明还没解析。这两条信息直接决定了下一步该做什么。

> \\\`info()\\\` 的返回值是 \\\`None\\\`，它把信息打印到 stdout。在 Jupyter 或本网站的终端里查看即可。

### describe()：默认只看数值列

\\\`\\\`\\\`python
df.describe()                 # 数值列
df.describe(include="all")    # 连文本列一起看（count/unique/top/freq）
df["price"].describe()        # 单列
\\\`\\\`\\\`

注意 \\\`count\\\` 是**非缺失个数**而不是行数。如果 \\\`count\\\` 明显小于 \\\`shape[0]\\\`，就该警惕缺失率了。另外 \\\`describe\\\` 的 \\\`25%/50%/75%\\\` 分位数是判断异常值最快的手段：如果某列中位数 100、75 分位 120 但最大值 999999，基本可以确定有脏数据。

## 列的访问：三种写法，含义不同

| 写法 | 结果 | 说明 |
| --- | --- | --- |
| \\\`df["price"]\\\` | Series | ✅ 推荐，列名含空格/中文也没问题 |
| \\\`df[["price", "city"]]\\\` | DataFrame | 取多列 |
| \\\`df.price\\\` | Series | 属性写法，**仅当列名是合法标识符且不与方法重名** |

属性写法的坑：列名叫 \\\`count\\\`、\\\`sum\\\`、\\\`min\\\`、\\\`size\\\` 这类方法名时，\\\`df.count\\\` 拿到的是**方法对象**而不是列；列名含空格时 \\\`df.total price\\\` 直接语法错误。团队规范里通常约定**统一用方括号**。

## 新增列、修改列、删除列

\\\`\\\`\\\`python
df["total"] = df["price"] * df["qty"]        # 新增：整列赋值
df["level"] = "普通"                           # 标量广播：整列都填同一个值
df["city"] = df["city"].str.strip()           # 修改：覆盖已有列
df.drop(columns=["level"])                   # 删除（返回新表）
df.drop(columns=["level"], inplace=True)     # 原地删除
\\\`\\\`\\\`

**新增列的常见错误**：

1. 用 \\\`df.append({"a": 1})\\\` 加行 —— 1.4 起已废弃，应该 \\\`pd.concat\\\`；
2. 用 \\\`df["x"] = series\\\` 时，若 \\\`series\\\` 的**索引与 df 不一致**，会得到一堆 NaN —— 这是"索引对齐"在作祟；
3. 循环 \\\`for i in range(len(df)): df["x"][i] = ...\\\` —— 慢且会触发链式赋值告警，应改写为向量化或 \\\`df.loc[:, "x"]\\\`。

## 再认识一下「索引」

本章不需要彻底搞懂索引，但要知道：

- 默认索引是 \\\`RangeIndex(0..n-1)\\\`，**它是标签不是位置**；
- 筛选后行索引**不会自动重排**（会出现 0, 2, 5 这样的"断号"），需要时用 \\\`df.reset_index(drop=True)\\\`；
- 索引可以重复，重复时 \\\`df.loc[标签]\\\` 会返回多行。

第 2 章会系统地讲 \\\`.loc\\\` 与 \\\`.iloc\\\` 的区别与坑。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
import pandas as pd
s = pd.Series([88, 92, 79], index=["语", "数", "英"])
df = pd.DataFrame({"name": ["甲", "乙"], "score": [88, 92]})
print(s, sep="\\n")
print(df)
print(df["score"].mean())  # 90.0
\`\`\`

预期输出（实测）：Series 按索引打印三行；DataFrame 两列表格；score 均值 90.0

**常见错误**：把 DataFrame 当 list 用下标取（应 df["col"] 或 loc）；混用位置与标签；忘记索引对齐导致 NaN。

### 常见误区

1. Series 就是列表——它多一层索引，算术按索引对齐；
2. df["col"] 返回视图可原地改——可能返回副本，赋值链有 SettingWithCopyWarning；
3. 索引必须唯一——重复索引会让对齐结果翻倍。

### 知识关联

- **向前**：Python 基础课的 list/dict 是直觉来源；
- **向后**：l-2-1 的 loc/iloc 是精确取数工具；
- **平行**：Excel 的行号列名是同构概念。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| Series | 一维 + 索引标签 |
| DataFrame | 二维表，列是 Series |
| 对齐 | 算术按索引对齐，缺失成 NaN |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 pandas 官方文档 pandas.pydata.org 相应章节）
`,
      tips: [
        {
          kind: 'pitfall',
          text: 'describe() 默认只统计数值列。文本列要用 describe(include="all") 或单独看 df["city"].value_counts()。另外 count 是非空个数，不是行数。',
        },
        {
          kind: 'pitfall',
          text: 'df.count 不加括号时拿到的是自带方法（bound method），不是列。列名与方法名冲突时请用 df["count"]。',
        },
        {
          kind: 'note',
          text: '筛选、dropna 之后索引会断号。reset_index(drop=True) 重排，但不加 drop=True 时旧索引会变成一列 index，很容易在导出时多出一列。',
        },
        {
          kind: 'interview',
          text: '「如何快速查看数据质量？」标准答法：shape 看规模 → info 看 dtype 与非空数 → describe(include="all") 看分布与异常 → isna().sum() 看缺失率 → duplicated().sum() 看重复。',
        },
      ],
      demos: [
        {
          title: '30 秒数据体检',
          lang: 'python',
          code: `import pandas as pd
import numpy as np

df = pd.DataFrame({
    "order_id": [1001, 1002, 1003, 1004, 1005],
    "price": [39.9, 19.5, np.nan, 88.0, 12.0],
    "qty": [2, 1, 3, 1, 5],
    "city": ["北京", "上海", "杭州", "北京", "上海"],
})
print("shape:", df.shape)
print("\\nhead(3):")
print(df.head(3))
print("\\ninfo() 打印如下：")
df.info()
print("\\ndescribe():")
print(df.describe().round(2))
print("\\n缺失个数:", df.isna().sum().to_dict())`,
        },
        {
          title: '列的增删改与索引对齐',
          lang: 'python',
          code: `import pandas as pd

df = pd.DataFrame({"price": [10.0, 20.0, 30.0], "qty": [2, 1, 4]})
df["total"] = df["price"] * df["qty"]
df["level"] = "普通"
print(df)

# 索引不一致时，赋值会对齐成 NaN
bonus = pd.Series([5, 6], index=[0, 1])
df["bonus"] = bonus
print("\\n索引不一致导致对齐:") 
print(df)

# 删除列
print("\\n删除 level 后:", list(df.drop(columns=["level"]).columns))
print("原表仍有 level:", "level" in df.columns)`,
        },
      ],
    },
  ],

  exercises: [
    /* ---------- 1 single ---------- */
    {
      id: 'pandas-1-e1',
      type: 'single',
      difficulty: 1,
      question: '关于 Series 与 DataFrame 的关系，下列说法**最准确**的是？',
      options: [
        { value: 'A', text: 'DataFrame 可以看作是由多个共享同一行索引的 Series 组成的二维表' },
        { value: 'B', text: 'DataFrame 底层就是一个二维 NumPy 数组，所以所有列的类型必须相同' },
        { value: 'C', text: 'Series 只是带名字的列表，没有索引概念' },
        { value: 'D', text: 'DataFrame 不能只包含一列' },
      ],
      answer: 'A',
      explanation:
        'DataFrame 的每一列都是一个 Series，它们共享行索引；各列 dtype 可以不同（这是与 NumPy 二维数组的关键差异）。Series 有独立的 index，也可以来自只有一列的 DataFrame（`df[["c"]]`）。',
      relatedLessonId: 'pandas-l-1-1',
      tags: ['Series', 'DataFrame', '概念'],
    },
    /* ---------- 2 judge ---------- */
    {
      id: 'pandas-1-e2',
      type: 'judge',
      difficulty: 1,
      question: '执行 `df[["price"]]` 与 `df["price"]` 得到的结果类型相同。',
      answer: false,
      explanation:
        '`df["price"]` 返回 **Series**，`df[["price"]]` 返回只包含一列的 **DataFrame**。外层方括号里的列表代表"要取哪些列"，因此一定是 DataFrame。',
      relatedLessonId: 'pandas-l-1-1',
      tags: ['列访问', 'Series', 'DataFrame'],
    },
    /* ---------- 3 multiple ---------- */
    {
      id: 'pandas-1-e3',
      type: 'multiple',
      difficulty: 2,
      question: '下列哪些方式可以正确地**创建一个 DataFrame**？（多选）',
      options: [
        { value: 'A', text: '`pd.DataFrame({"a": [1, 2], "b": [3, 4]})`' },
        { value: 'B', text: '`pd.DataFrame([{"a": 1}, {"a": 2, "b": 3}])`' },
        { value: 'C', text: '`pd.DataFrame([[1, 2], [3, 4]], columns=["a", "b"])`' },
        { value: 'D', text: '`pd.DataFrame({"a": [1, 2], "b": [3]})`' },
      ],
      answer: ['A', 'B', 'C'],
      explanation:
        'D 会报 `ValueError: All arrays must be of the same length`，因为两个列表长度不同。B 属于"记录列表"形式：缺的键会自动补 NaN。',
      relatedLessonId: 'pandas-l-1-2',
      tags: ['创建', 'DataFrame'],
    },
    /* ---------- 4 fill ---------- */
    {
      id: 'pandas-1-e4',
      type: 'fill',
      difficulty: 2,
      question:
        '下面代码想从 CSV 字符串直接构造 DataFrame，但缺少必要的 IO 包装。请补全第一个空，使代码可以运行：\n\n```python\ndf = pd.read_csv(io.___(csv_text))\n```',
      blanks: [['StringIO']],
      explanation:
        '`read_csv` 需要一个"文件对象"（有 `read` 方法），纯字符串不行。`io.StringIO(csv_text)` 把字符串包装成内存文件。真实项目中直接传路径即可：`pd.read_csv("orders.csv")`。',
      caseSensitive: true,
      relatedLessonId: 'pandas-l-1-2',
      tags: ['CSV', 'io'],
    },
    /* ---------- 5 code ---------- */
    {
      id: 'pandas-1-e5',
      type: 'code',
      difficulty: 2,
      question:
        '**构造学生成绩表。**给定三列数据（`names`、`scores`、`cities`），请构造 DataFrame 赋值给变量 `df`，要求：\n\n1. 列名依次为 `name`、`score`、`city`；\n2. 在 df 中新增一列 `passed`，表示及格与否，及格线 **60 分**；\n3. 最后让代码的最后一行是 `df`，以便回显整张表。',
      starterCode: `import pandas as pd

names = ["张三", "李四", "王五", "赵六"]
scores = [88, 92, 55, 60]
cities = ["北京", "上海", "北京", "广州"]

df = pd.DataFrame(___)

# 新增列：分数 >= 60 为 True
df[___] = ___

df
`,
      setupCode: '',
      expectedOutput: 'shape = 4 × 4，passed 为 [True, True, False, True]',
      tests: [
        'assert df.shape == (4, 4), f"df 应为 4 行 4 列，实际为 {df.shape}"',
        'assert list(df.columns) == ["name", "score", "city", "passed"], f"列名应为 [\'name\', \'score\', \'city\', \'passed\']，实际为 {list(df.columns)}"',
        'assert df["name"].tolist() == ["张三", "李四", "王五", "赵六"], "name 列内容不正确"',
        'assert df["passed"].tolist() == [True, True, False, True], f"passed 列应为 [True, True, False, True]，实际为 {df[\'passed\'].tolist()}"',
        'assert df["passed"].dtype == bool, f"passed 应为布尔类型，实际为 {df[\'passed\'].dtype}"',
      ].join('\n'),
            answer: `import pandas as pd

names = ["张三", "李四", "王五", "赵六"]
scores = [88, 92, 55, 60]
cities = ["北京", "上海", "北京", "广州"]

df = pd.DataFrame({"name": names, "score": scores, "city": cities})
df["passed"] = df["score"] >= 60
df`,
      explanation:
        '```python\ndf = pd.DataFrame({"name": names, "score": scores, "city": cities})\ndf["passed"] = df["score"] >= 60\n```\n\n字典的键就是列名；`df["score"] >= 60` 是整列向量化比较，直接得到一个布尔 Series，赋给新列即可。注意最后一个空里如果写成 `df["passed"]`，赋值语句 `df["passed"] = df["passed"]` 会覆盖掉原有列，所以推荐**右边用表达式、左边用列名**。及格线是 60，所以 `60 >= 60` 为 True，赵六也算及格。',
      tags: ['创建', '新增列', '向量化'],
    },
    /* ---------- 6 single ---------- */
    {
      id: 'pandas-1-e6',
      type: 'single',
      difficulty: 2,
      question: '执行 `pd.DataFrame({"qty": [1, 2, None]}).dtypes["qty"]`，结果是？',
      options: [
        { value: 'A', text: '`int64`' },
        { value: 'B', text: '`float64`' },
        { value: 'C', text: '`object`' },
        { value: 'D', text: '`Int64`' },
      ],
      answer: 'B',
      explanation:
        'NumPy 的整数数组无法表示缺失值，所以含 None/NaN 的整数列会被自动转成 `float64`。若想保留整型语义，需要显式指定可空整型：`pd.Series([1, 2, None], dtype="Int64")`（注意大写 I）。',
      relatedLessonId: 'pandas-l-1-2',
      tags: ['dtype', '缺失值'],
    },
    /* ---------- 7 code ---------- */
    {
      id: 'pandas-1-e7',
      type: 'code',
      difficulty: 3,
      question:
        '**CSV 读取与类型清理。**`csv_text` 里是一段订单数据，其中 `price` 列因为混有「元」字被读成了字符串。请：\n\n1. 用 `io.StringIO` + `pd.read_csv` 读入，赋值给 `df`；\n2. 把 `price` 列清洗为数值类型（去掉"元"字），存回 `df` 的 `price` 列，dtype 应为数值类型且 **1 个无效值变成 NaN**；\n3. 计算 `price` 列的非缺失个数，赋值给 `valid_price_count`。',
      starterCode: `import io
import pandas as pd

csv_text = """order_id,price,qty
1001,39.9元,2
1002,19.5,1
1003,未知,3
1004,88,1
"""

df = pd.read_csv(___)

# 清洗：去掉字符串里的"元"字，再转数值；无法转换的变成 NaN
df["price"] = ___

valid_price_count = ___
`,
      setupCode: '',
      expectedOutput: 'df 4 行；price 为 [39.9, 19.5, NaN, 88.0]；valid_price_count = 3',
      tests: [
        'assert df.shape == (4, 3), f"df 应为 4 行 3 列，实际为 {df.shape}"',
        'assert str(df["price"].dtype).startswith("float"), f"price 应转为浮点类型，实际为 {df[\'price\'].dtype}"',
        'assert int(df["price"].isna().sum()) == 1, f"price 应有 1 个缺失值，实际为 {int(df[\'price\'].isna().sum())}"',
        'assert abs(float(df["price"].iloc[0]) - 39.9) < 1e-9, f"第 1 行 price 应为 39.9，实际为 {df[\'price\'].iloc[0]}"',
        'assert abs(float(df["price"].iloc[3]) - 88.0) < 1e-9, f"第 4 行 price 应为 88.0，实际为 {df[\'price\'].iloc[3]}"',
        'assert valid_price_count == 3, f"valid_price_count 应为 3，实际为 {valid_price_count}"',
      ].join('\n'),
      answer: `import io
import pandas as pd

csv_text = """order_id,price,qty
1001,39.9元,2
1002,19.5,1
1003,未知,3
1004,88,1
"""

df = pd.read_csv(io.StringIO(csv_text))
df["price"] = pd.to_numeric(df["price"].astype(str).str.replace("元", "", regex=False), errors="coerce")
valid_price_count = int(df["price"].notna().sum())`,
      explanation:
        '```python\ndf = pd.read_csv(io.StringIO(csv_text))\ndf["price"] = pd.to_numeric(df["price"].str.replace("元", "", regex=False), errors="coerce")\nvalid_price_count = int(df["price"].notna().sum())\n```\n\n要点：\n1. `str.replace` 默认按正则处理，要按字面替换"元"必须写 `regex=False`，否则在更复杂的字符串里可能报错；\n2. `to_numeric(errors="coerce")` 把"未知"这种不可解析的值变成 NaN，而不是让整题崩溃；\n3. `notna().sum()` 统计非缺失个数，与 `describe()` 里的 count 含义一致。',
      tags: ['CSV', '类型转换', '清洗'],
    },
    /* ---------- 8 judge ---------- */
    {
      id: 'pandas-1-e8',
      type: 'judge',
      difficulty: 1,
      question: '`df.info()` 会返回一个 DataFrame，内容包含每列的类型和非空个数。',
      answer: false,
      explanation:
        '`info()` 的返回值是 `None`，它只是把信息打印到标准输出。要以编程方式拿到"非空个数"，用 `df.notna().sum()`；要拿到类型，用 `df.dtypes`。',
      relatedLessonId: 'pandas-l-1-3',
      tags: ['info', '数据体检'],
    },
    /* ---------- 9 multiple ---------- */
    {
      id: 'pandas-1-e9',
      type: 'multiple',
      difficulty: 3,
      question: '关于 `describe()`，下列哪些说法**正确**？（多选）',
      options: [
        { value: 'A', text: '默认只统计数值类型的列' },
        { value: 'B', text: '`count` 表示该列的非缺失值个数' },
        { value: 'C', text: '`describe(include="all")` 会把文本列也统计进来，并给出 unique 与 top' },
        { value: 'D', text: '`describe()` 会直接修改原 DataFrame' },
      ],
      answer: ['A', 'B', 'C'],
      explanation:
        '`describe()` 返回新的统计结果，不会修改原数据（除非显式 `inplace=True`，而 `describe` 根本没有该参数）。文本列的统计项是 `count / unique / top / freq`。',
      relatedLessonId: 'pandas-l-1-3',
      tags: ['describe', '数据体检'],
    },
    /* ---------- 10 fill ---------- */
    {
      id: 'pandas-1-e10',
      type: 'fill',
      difficulty: 2,
      question:
        '想查看 DataFrame 的行数与列数，可以用 `df.___`，它返回一个元组 `(行数, 列数)`。',
      blanks: [['shape', 'df.shape']],
      explanation:
        '`df.shape` 返回 `(n_rows, n_cols)`。与之相对的 `df.size` 是**元素总个数**（行 × 列），不是行数，容易混淆；`len(df)` 只返回行数。',
      relatedLessonId: 'pandas-l-1-3',
      tags: ['shape', '数据体检'],
    },
    /* ---------- 11 code ---------- */
    {
      id: 'pandas-1-e11',
      type: 'code',
      difficulty: 2,
      question:
        '**数据体检小工具。**给定 DataFrame `df`，请计算并保存以下四个变量：\n\n1. `n_rows`：行数；\n2. `n_cols`：列数；\n3. `missing_by_col`：每列的缺失值个数（`Series`，索引为列名）；\n4. `max_missing_col`：缺失值最多的列名（字符串）。',
      starterCode: `import pandas as pd
import numpy as np

df = pd.DataFrame({
    "order_id": [1001, 1002, 1003, 1004, 1005],
    "price": [39.9, np.nan, np.nan, 88.0, 12.0],
    "qty": [2, 1, 3, np.nan, 5],
    "city": ["北京", "上海", np.nan, "北京", "上海"],
})

n_rows, n_cols = ___
missing_by_col = ___
max_missing_col = ___
`,
      setupCode: '',
      expectedOutput: 'n_rows = 5, n_cols = 4, max_missing_col = "price"',
      tests: [
        'assert n_rows == 5, f"n_rows 应为 5，实际为 {n_rows}"',
        'assert n_cols == 4, f"n_cols 应为 4，实际为 {n_cols}"',
        'assert isinstance(missing_by_col, pd.Series), "missing_by_col 应为 Series"',
        'assert list(missing_by_col.index) == ["order_id", "price", "qty", "city"], f"missing_by_col 的索引应为列名，实际为 {list(missing_by_col.index)}"',
        'assert [int(v) for v in missing_by_col.tolist()] == [0, 2, 1, 1], f"各列缺失个数应为 [0, 2, 1, 1]，实际为 {missing_by_col.tolist()}"',
        'assert max_missing_col == "price", f"max_missing_col 应为 \'price\'，实际为 {max_missing_col}"',
      ].join('\n'),
      explanation:
        '```python\nn_rows, n_cols = df.shape\nmissing_by_col = df.isna().sum()\nmax_missing_col = missing_by_col.idxmax()\n```\n\n`df.isna()` 得到同形状的布尔表，`.sum()` 按列求和（True 记为 1），正好得到每列缺失个数。`idxmax()` 返回**最大值对应的索引标签**，即列名。如果只想看缺失率，把 `sum()` 换成 `mean()`。',
      tags: ['数据体检', '缺失值', 'idxmax'],
    },
    /* ---------- 12 single ---------- */
    {
      id: 'pandas-1-e12',
      type: 'single',
      difficulty: 2,
      question:
        '一个 DataFrame 有一列名为 `count`，成员 `df.count` 得到的是什么？',
      options: [
        { value: 'A', text: '包含该列数据的 Series' },
        { value: 'B', text: 'DataFrame 自带的 `count` 方法（bound method），而不是数据' },
        { value: 'C', text: '该列的非空个数' },
        { value: 'D', text: '报错 AttributeError' },
      ],
      answer: 'B',
      explanation:
        '属性访问 `df.count` 在名称冲突时优先返回**类上同名的方法**，所以拿到的是方法与列名同名时属性访问会得到方法对象。安全的写法永远是 `df["count"]`。这类坑在列名为 `count`、`sum`、`min`、`max`、`size`、`name` 时都会出现。',
      relatedLessonId: 'pandas-l-1-3',
      tags: ['列访问', '陷阱'],
    },
    /* ---------- 13 open ---------- */
    {
      id: 'pandas-1-e13',
      type: 'open',
      difficulty: 3,
      question:
        '新人拿到一张 50 万行、20 列的订单表后，直接跑了 `df.groupby("city")["price"].sum()`，结果发现总销售额与财务系统相差约 12%。请你描述一套**接手数据后的标准体检流程**（至少 5 个步骤），并说明每一步能发现什么问题。',
      referenceAnswer: `**一套可复用的体检流程**：

1. **看规模与结构**：\`df.shape\`、\`df.head()\`、\`df.info()\`。确认行数是否与上游一致（比如是否有被截断/分页丢失），以及每一列的 dtype 是否符合预期（价格是 float 还是 str、日期是 datetime 还是 str）。
2. **看缺失率**：\`df.isna().mean().sort_values(ascending=False)\`。缺失率高的列直接影响求和结果——例如 12% 的 price 为空，正好对应 12% 的偏差。
3. **看重复**：\`df.duplicated().sum()\`、\`df.duplicated(subset=["order_id"]).sum()\`。明细表重复导入会让求和翻倍。
4. **看分布与异常值**：\`df.describe()\`、\`df["price"].quantile([0.01, 0.99])\`。负价格、极大值、0 元订单都可能拉偏汇总。
5. **看口径与状态**：订单表通常有 \`status\`（已取消、已退款、已完成）。财务口径和业务口径不同，必须先与对方对齐"哪些状态计入 GMV"。
6. **对账**：用 \`df["price"].sum()\` 与总行数、均值做交叉校验（如 \`mean * count\`），再与财务系统的合计对比，定位差异来源（时间范围、状态、币种）。

**本题场景的最可能原因**：12% 恰好接近某个缺失率或某个状态（如"已取消"）的占比。应先用 \`df["status"].value_counts()\` 与 \`df["price"].isna().mean()\` 验证，再决定是填充、过滤还是重新取数。`,
      rubric: [
        { point: '提到用 shape / info / head 了解规模与类型', score: 1 },
        { point: '提到缺失率检查并把它与 12% 偏差联系起来', score: 2 },
        { point: '提到重复值检查', score: 1 },
        { point: '提到订单状态/口径对齐等业务层面的校验', score: 2 },
        { point: '提到与财务数据对账、定位差异来源', score: 1 },
      ],
      keywords: ['缺失', '重复', 'describe', '口径', '对账', '状态'],
      explanation:
        '这题的评分重点在于"是否把数据质量问题与汇总偏差联系起来"，而不是背 API。实际面试中，能说出"12% 可能是缺失率也可能是某个订单状态占比"的人很受青睐。',
      relatedLessonId: 'pandas-l-1-3',
      tags: ['数据体检', '业务', '面试'],
    },
    /* ---------- 14 single ---------- */
    {
      id: 'pandas-1-e14',
      type: 'single',
      difficulty: 2,
      question: '`df["level"] = "普通"` 执行后，`df["level"]` 列的内容是？',
      options: [
        { value: 'A', text: '只有第一行是 "普通"，其余为 NaN' },
        { value: 'B', text: '所有行都是 "普通"（标量广播）' },
        { value: 'C', text: '报错，赋值的长度必须与行数一致' },
        { value: 'D', text: '整列都是 None' },
      ],
      answer: 'B',
      explanation:
        '赋一个标量时，Pandas 会把它**广播**到整列。只有赋一个可迭代对象（列表/Series/数组）时才要求长度一致或索引对齐。',
      relatedLessonId: 'pandas-l-1-3',
      tags: ['赋值', '广播'],
    },
    /* ---------- 15 judge ---------- */
    {
      id: 'pandas-1-e15',
      type: 'judge',
      difficulty: 2,
      question:
        '用布尔条件筛选后（如 `sub = df[df["price"] > 100]`），`sub` 的行索引会自动重排为 0, 1, 2, ...',
      answer: false,
      explanation:
        '筛选只保留原始行，**索引标签保持原样**，因此可能是不连续的（如 0, 3, 7）。需要连续索引请调用 `sub.reset_index(drop=True)`。很多"按位置取数却取错"的 bug 就出在这里。',
      relatedLessonId: 'pandas-l-1-3',
      tags: ['索引', '筛选'],
    },
    /* ---------- 16 fill ---------- */
    {
      id: 'pandas-1-e16',
      type: 'fill',
      difficulty: 3,
      question:
        '`raw = pd.Series(["12", "8元", "15"])`，想要把"8元"这种脏值变成 NaN 而不是让程序报错，补全函数名：\n\n```python\nnum = pd.___(raw, errors="coerce")\n```',
      blanks: [['to_numeric']],
      explanation:
        '`astype(float)` 遇到 "8元" 会抛 `ValueError`；`pd.to_numeric(..., errors="coerce")` 会把无法解析的值转成 NaN，适合不确定数据是否干净的场景。另有 `errors="ignore"`（原样返回，已不推荐）与默认的 `errors="raise"`。',
      caseSensitive: true,
      relatedLessonId: 'pandas-l-1-2',
      tags: ['类型转换', '清洗'],
    },
    /* ---------- 17 single ---------- */
    {
      id: 'pandas-1-e17',
      type: 'single',
      difficulty: 2,
      question:
        '`pd.Series([1.9, 2.4, -1.9]).astype(int)` 的结果是？',
      options: [
        { value: 'A', text: '`[2, 2, -2]`（四舍五入）' },
        { value: 'B', text: '`[1, 2, -1]`（向零截断）' },
        { value: 'C', text: '`[1, 2, -2]`（向下取整）' },
        { value: 'D', text: '报错' },
      ],
      answer: 'B',
      explanation:
        '`astype(int)` 做的是**向零截断**（相当于 C 语言的强制转换），不是四舍五入也不是向下取整。`1.9 → 1`、`2.4 → 2`、`-1.9 → -1`。要四舍五入请先 `.round()`，要向下取整用 `np.floor`。',
      relatedLessonId: 'pandas-l-1-2',
      tags: ['类型转换', '陷阱'],
    },
    /* ---------- 18 code ---------- */
    {
      id: 'pandas-1-e18',
      type: 'code',
      difficulty: 3,
      question:
        '**运动相机订单表：新增计算列 + 单列类型转换 + 汇总。**给定 DataFrame `df`（价格列已经是数值），请：\n\n1. 新增列 `total`：`price * qty`（保留两位小数）；\n2. 新增列 `tier`：`total >= 100` 为 `"高"`，否则为 `"低"`；\n3. 计算 `orders_total`：所有订单 `total` 之和（四舍五入到 2 位小数，返回 float）；\n4. 计算 `n_high`：`tier == "高"` 的订单数（int）。',
      starterCode: `import pandas as pd

df = pd.DataFrame({
    "order_id": [1001, 1002, 1003, 1004],
    "price": [39.9, 19.5, 88.0, 12.0],
    "qty": [2, 1, 3, 5],
})

df["total"] = ___
df["tier"] = ___

orders_total = ___
n_high = ___
`,
      setupCode: '',
      expectedOutput: 'orders_total = 423.3, n_high = 1',
      tests: [
        'assert list(df.columns) == ["order_id", "price", "qty", "total", "tier"], f"新增列顺序应为 total, tier，实际列为 {list(df.columns)}"',
        'assert [round(v, 2) for v in df["total"].tolist()] == [79.8, 19.5, 264.0, 60.0], f"total 列应为 [79.8, 19.5, 264.0, 60.0]，实际为 {[round(v, 2) for v in df[\'total\'].tolist()]}"',
        'assert df["tier"].tolist() == ["低", "低", "高", "低"], f"tier 列应为 [\'低\', \'低\', \'高\', \'低\']，实际为 {df[\'tier\'].tolist()}"',
        'assert abs(orders_total - 423.3) < 1e-6, f"orders_total 应为 423.3，实际为 {orders_total}"',
      ].join('\n'),
            answer: `import pandas as pd
import numpy as np

df = pd.DataFrame({
    "order_id": [1001, 1002, 1003, 1004],
    "price": [39.9, 19.5, 88.0, 12.0],
    "qty": [2, 1, 3, 5],
})

df["total"] = (df["price"] * df["qty"]).round(2)
df["tier"] = np.where(df["total"] >= 100, "高", "低")
orders_total = round(float(df["total"].sum()), 2)
n_high = int((df["tier"] == "高").sum())`,
      explanation:
        '```python\ndf["total"] = (df["price"] * df["qty"]).round(2)\ndf["tier"] = np.where(df["total"] >= 100, "高", "低")\norders_total = round(float(df["total"].sum()), 2)\nn_high = int((df["tier"] == "高").sum())\n```\n\n`np.where(条件, 真值, 假值)` 是向量化的三元表达式，比 `apply` 快得多。注意 order 1001 的 total 是 79.8（小于 100），order 1003 是 264.0（大于 100）。若用 `.apply(lambda r: ...)` 也能做，但在大数据上会慢 10 倍以上（见第 6 章）。',
      tags: ['新增列', 'np.where', '向量化'],
    },
    /* ---------- 19 multiple ---------- */
    {
      id: 'pandas-1-e19',
      type: 'multiple',
      difficulty: 2,
      question: '关于访问 `df` 中的 `price` 列，下列说法**正确**的是？（多选）',
      options: [
        { value: 'A', text: '`df["price"]` 返回 Series' },
        { value: 'B', text: '`df.price` 在列名是合法标识符时也可用，但遇到方法名冲突会出错' },
        { value: 'C', text: '`df[["price"]]` 返回 DataFrame' },
        { value: 'D', text: '`df.loc[:, "price"]` 与 `df["price"]` 结果形状一致' },
      ],
      answer: ['A', 'B', 'C', 'D'],
      explanation:
        '四种写法都成立。`df.loc[:, "price"]` 是"取所有行、price 列"，返回 Series，与 `df["price"]` 等价；如果写成 `df.loc[:, ["price"]]` 则会返回 DataFrame。实际工作中推荐统一用方括号，避免属性写法的歧义。',
      relatedLessonId: 'pandas-l-1-3',
      tags: ['列访问', 'loc'],
    },
    /* ---------- 20 judge ---------- */
    {
      id: 'pandas-1-e20',
      type: 'judge',
      difficulty: 2,
      question:
        'DataFrame 的每一列必须是相同的 dtype，否则无法构造。',
      answer: false,
      explanation:
        '这是 Pandas 相对 NumPy 二维数组的核心优势：**每一列可以有自己的 dtype**。只有用二维 NumPy 数组构造时，才会因为数组本身同质而统一类型。',
      relatedLessonId: 'pandas-l-1-1',
      tags: ['dtype', '概念'],
    },
    /* ---------- 21 single ---------- */
    {
      id: 'pandas-1-e21',
      type: 'single',
      difficulty: 3,
      question:
        '`df["city"]` 是字符串列，`df["scores"]` 是整数列。执行 `df["scores"] = df["scores"] + 1` 后再执行 `df["scores"].dtype`，结果最可能是？',
      options: [
        { value: 'A', text: '`int64`' },
        { value: 'B', text: '`object`' },
        { value: 'C', text: '`str`' },
        { value: 'D', text: '`float64`' },
      ],
      answer: 'A',
      explanation:
        '整数列做整数加法仍然是 int64。不需要担心它"变成 object"——只要整列都是合法整数，dtype 不会被污染。但若原始列里有 NaN，它已经是 float64，加完之后仍是 float64。',
      relatedLessonId: 'pandas-l-1-2',
      tags: ['dtype', '运算'],
    },
    /* ---------- 22 code ---------- */
    {
      id: 'pandas-1-e22',
      type: 'code',
      difficulty: 4,
      question:
        '**合并两个来源的字段（索引对齐实战）。**有两个 Series：\n\n- `base`：每个商品在 6 天的销量，索引是日期；\n- `extra`：其中几天额外的人工补录销量，索引也是日期（**顺序与 base 不同，且日期不全**）。\n\n请新增两列到 `df`：\n\n1. `extra_qty`：把 `extra` 对齐到 `df.index` 上，缺失日期记 0；\n2. `final_qty`：`qty + extra_qty`。',
      starterCode: `import pandas as pd

df = pd.DataFrame({
    "qty": [10, 12, 8, 15, 9, 11],
}, index=["d1", "d2", "d3", "d4", "d5", "d6"])

# 注意：索引顺序与 df 不同，而且缺了 d1 / d5
extra = pd.Series([7, 3, 5], index=["d3", "d2", "d6"])

# 提示：先 reindex 到 df.index，再填充缺失
df["extra_qty"] = ___
df["final_qty"] = ___

df
`,
      setupCode: '',
      expectedOutput: 'extra_qty = [0, 3, 7, 0, 0, 5]，final_qty = [10, 15, 15, 15, 9, 16]',
      tests: [
        'assert list(df.columns) == ["qty", "extra_qty", "final_qty"], f"列应为 [qty, extra_qty, final_qty]，实际为 {list(df.columns)}"',
        'assert df["extra_qty"].tolist() == [0, 3, 7, 0, 0, 5], f"extra_qty 应为 [0, 3, 7, 0, 0, 5]，实际为 {df[\'extra_qty\'].tolist()}"',
        'assert df["final_qty"].tolist() == [10, 15, 15, 15, 9, 16], f"final_qty 应为 [10, 15, 15, 15, 9, 16]，实际为 {df[\'final_qty\'].tolist()}"',
        'assert list(df.index) == ["d1", "d2", "d3", "d4", "d5", "d6"], "df 的索引顺序不应改变"',
      ].join('\n'),
      explanation:
        '```python\ndf["extra_qty"] = extra.reindex(df.index, fill_value=0)\ndf["final_qty"] = df["qty"] + df["extra_qty"]\n```\n\n`reindex` 的含义是"按给定标签重新排布"，对不存在的标签填 `fill_value`。如果直接写 `df["extra_qty"] = extra`，Pandas 会做**索引对齐**：df 中没有的标签补 NaN（d1、d4、d5 都变 NaN），所以一定要显式 `reindex` 或 `fillna(0)`。这是"索引对齐"最容易咬人的地方，第 2 章会展开展开。',
      tags: ['索引对齐', 'reindex', '新增列'],
    },
  ],
};
