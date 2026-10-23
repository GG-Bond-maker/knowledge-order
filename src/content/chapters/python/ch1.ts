import type { Chapter } from '../../../types';

/* ============================================================
 *  第 1 章：变量与基础数据类型
 * ============================================================ */

const ch1: Omit<Chapter, 'courseId' | 'order'> = {
  id: 'python-1',
  title: '变量与基础数据类型',
  goal: '理解变量是"给内存里的对象贴标签"，并掌握 int / float / str / bool 四种基础类型及其运算与转换规则。',
  lessons: [
    {
      id: 'py-l-1-1',
      title: '变量、赋值与内存模型',
      content: `
## 变量不是"盒子"，是"标签"

初学者最容易把变量想象成一个盒子：我先造一个空盒子，再往里放东西。Python 的真实行为是**先创建对象，再让名字指向它**。

\`\`\`python
age = 25
\`\`\`

这行代码做了三件事：

1. 在内存中创建一个 \`int\` 对象 \`25\`；
2. 在命名空间（namespace）中创建名字 \`age\`；
3. 让 \`age\` **指向**这个对象（引用计数 +1）。

所以真正重要的一句话是：**变量保存的是对象的引用，而不是对象本身。**

### 这解释了三个常见现象

**现象一：两个名字可以指向同一个对象。**

\`\`\`python
a = [1, 2, 3]
b = a          # b 和 a 指向同一个 list 对象
b.append(4)
print(a)       # [1, 2, 3, 4]  ← a 也变了！
\`\`\`

**现象二：不可变对象"修改"其实是重新绑定。**

\`\`\`python
x = 1
y = x
x = x + 1      # 创建新对象 2，让 x 指向它；y 仍指向 1
print(x, y)    # 2 1
\`\`\`

**现象三：\`is\` 比较的是"是不是同一个对象"，\`==\` 比较的是"值是否相等"。**

\`\`\`python
a = [1, 2, 3]
b = [1, 2, 3]
print(a == b)  # True  值相等
print(a is b)  # False 不同对象
\`\`\`

## 命名规则与命名规范

| 规则 | 说明 |
| --- | --- |
| 合法字符 | 字母、数字、下划线，且不能以数字开头 |
| 区分大小写 | \`Name\` 与 \`name\` 是两个不同变量 |
| 不能用关键字 | \`if\`、\`for\`、\`class\`、\`None\`、\`True\` 等 |
| 推荐风格（PEP 8） | 普通变量与函数用 \`snake_case\`，常量用 \`UPPER_CASE\`，类名用 \`PascalCase\` |

> 在数据分析场景里，**好名字直接决定代码可读性**：\`df_customer_orders\` 远比 \`d1\` 好。

## 多变量赋值与解包

\`\`\`python
a, b, c = 1, 2, 3          # 同时赋值
a, b = b, a                # 交换两个变量（不需要临时变量）
first, *rest = [1, 2, 3]   # 星号解包：first=1, rest=[2, 3]
\`\`\`

## 动态类型与强类型

- **动态类型**：变量本身没有类型，类型属于对象，同一个名字可以先后指向不同类型的对象。
- **强类型**：类型之间不会隐式转换。\`"1" + 1\` 会直接报 \`TypeError\`，而不是悄悄变成 \`"11"\` 或 \`2\`。

这两点合起来意味着：**写分析代码时必须对数据类型保持敏感**，读入的 CSV 里数字经常是字符串，后续做求和或比较就会出错。

<PythonMemoryDemo />
`,
      tips: [
        {
          kind: 'pitfall',
          text: '`a = b = []` 会让 a 和 b 指向**同一个列表**。需要两个独立列表时必须分别写 `a = []` 和 `b = []`。',
        },
        {
          kind: 'interview',
          text: '面试常问：`is` 与 `==` 的区别。标准答法：`==` 调用对象的 `__eq__` 比较值；`is` 比较内存地址（`id()`）。判断"是否为 None"应始终用 `is None`。',
        },
        {
          kind: 'leak',
          text: '函数默认参数写成可变对象（如 `def f(x, acc=[])`）会导致多次调用共享同一个列表，正确写法是 `acc=None` 后在函数体里 `if acc is None: acc = []`。',
        },
      ],
      demos: [
        {
          title: '验证"引用"与"值"的区别',
          lang: 'python',
          code: `a = [1, 2, 3]
b = a
c = a.copy()

b.append(4)
print("a =", a)
print("b =", b, "→ b 与 a 是同一个对象:", b is a)
print("c =", c, "→ c 是复制出来的新对象:", c is a)

# 不可变对象的"修改"其实是重新绑定
x = 1
y = x
x = x + 1
print("\\nx =", x, "y =", y, "→ y 不受影响")
print("id(x) =", id(x), " id(y) =", id(y))`,
        },
        {
          title: '多变量赋值与解包',
          lang: 'python',
          code: `a, b, c = 1, 2, 3
print(a, b, c)

a, b = b, a          # 交换
print("交换后:", a, b)

first, *middle, last = [10, 20, 30, 40, 50]
print("first =", first, " middle =", middle, " last =", last)

# 解包常用于提取函数返回值
row = ("张三", 28, "北京")
name, age, city = row
print(f"{name} 今年 {age} 岁，来自 {city}")`,
        },
      ],
    },
    {
      id: 'py-l-1-2',
      title: '数字类型：int、float 与精度陷阱',
      content: `
## 两种数字：int 与 float

Python 的整数是**任意精度**的，不会像 C/Java 那样溢出：

\`\`\`python
print(2 ** 100)   # 1267650600228229401496703205376
\`\`\`

浮点数遵循 IEEE 754 双精度标准，64 位里 1 位符号、11 位指数、52 位尾数。这意味着：**大部分十进制小数无法被二进制精确表示**。

## 浮点精度：数据分析里最常见的坑

\`\`\`python
print(0.1 + 0.2)          # 0.30000000000000004
print(0.1 + 0.2 == 0.3)   # False  ← 直接比较会翻车
\`\`\`

正确做法有两种：

\`\`\`python
import math
print(math.isclose(0.1 + 0.2, 0.3))     # True：相对误差判断

from decimal import Decimal
print(Decimal("0.1") + Decimal("0.2"))  # 0.3：十进制精确计算
\`\`\`

> 在**金额计算**场景（如结算、对账）应使用 \`Decimal\` 或把金额存成"分"的整数；在**统计分析**场景用 \`math.isclose\` 或设置容差即可。

## 运算符

| 运算符 | 含义 | 示例 | 结果 |
| --- | --- | --- | --- |
| \`+\` \`-\` \`*\` \`/\` | 加减乘除 | \`7 / 2\` | \`3.5\`（结果总是 float） |
| \`//\` | 整除（向下取整） | \`7 // 2\`、\`-7 // 2\` | \`3\`、\`-4\` |
| \`%\` | 取余 | \`7 % 2\` | \`1\` |
| \`**\` | 幂 | \`2 ** 10\` | \`1024\` |

注意 \`//\` 是**向负无穷取整**，而不是简单地截断小数部分，这是负数和取模运算容易出错的地方。

## 类型转换

\`\`\`python
int("42")      # 42
int(3.99)      # 3     ← 向零截断，注意不是四舍五入
float("3.14")  # 3.14
round(2.675, 2)  # 2.67  ← 浮点表示问题导致的"意外"
\`\`\`

## 常用数学函数

\`\`\`python
abs(-5)          # 5
round(3.14159, 3)  # 3.142（银行家舍入：.5 时取偶）
min(3, 1, 2)     # 1
max([3, 1, 2])   # 3
sum([1, 2, 3])   # 6
\`\`\`

需要更高精度时：

\`\`\`python
from decimal import Decimal, ROUND_HALF_UP
Decimal("2.675").quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)  # 2.68
\`\`\`

<PythonMemoryDemo />
`,
      tips: [
        {
          kind: 'pitfall',
          text: '`round()` 用的是银行家舍入（四舍六入五取偶），`round(2.5)` 得 2、`round(3.5)` 得 4。财务计算请显式指定 `ROUND_HALF_UP`。',
        },
        {
          kind: 'performance',
          text: '在大数据量下，Python 循环里做逐行浮点运算很慢，建议交给 NumPy/Pandas 向量化处理（通常快 10~100 倍）。',
        },
        {
          kind: 'interview',
          text: '经典问题：为什么 `0.1 + 0.2 != 0.3`？答题要点：IEEE 754 二进制无法精确表示十进制小数，误差在末位累计，应使用 `math.isclose` 或 `Decimal`。',
        },
      ],
      demos: [
        {
          title: '浮点精度实验',
          lang: 'python',
          code: `import math
from decimal import Decimal

print("0.1 + 0.2 =", 0.1 + 0.2)
print("是否等于 0.3 ?", 0.1 + 0.2 == 0.3)
print("math.isclose 判断:", math.isclose(0.1 + 0.2, 0.3))

print("\\nDecimal 精确计算:", Decimal("0.1") + Decimal("0.2"))
print("Decimal 累加 10 次 0.1:", sum([Decimal("0.1")] * 10))
print("float  累加 10 次 0.1:", sum([0.1] * 10))

print("\\n整除与取余：")
for x in (7, -7):
    print(f"  {x} // 2 = {x // 2},  {x} % 2 = {x % 2}")`,
        },
        {
          title: 'round 与四舍五入的差异',
          lang: 'python',
          code: `for v in (2.5, 3.5, 2.675):
    print(f"round({v}) = {round(v)}")

from decimal import Decimal, ROUND_HALF_UP
print("Decimal 四舍五入 2.675 →", Decimal("2.675").quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))`,
        },
      ],
    },
    {
      id: 'py-l-1-3',
      title: '字符串：定义、切片与格式化',
      content: `
## 不可变的字符序列

字符串是**不可变**对象：任何"修改"都会创建新字符串。

\`\`\`python
s = "数据分析"
# s[0] = "大"   ← TypeError: 'str' object does not support item assignment
s2 = "大" + s[1:]   # 正确做法：拼接出新字符串
\`\`\`

## 定义方式与转义

\`\`\`python
a = 'single'
b = "double"
c = """多行
字符串"""
d = r"C:\\new\\table"    # 原始字符串：反斜杠不转义（写正则、Windows 路径时必用）
\`\`\`

常见转义字符：\`\\n\` 换行、\`\\t\` 制表符、\`\\\\\` 反斜杠、\`\\"\` 引号。

## 索引与切片（左闭右开）

\`\`\`python
s = "Python数据分析"
#    0123456789...
print(s[0])      # P
print(s[-1])     # 析     ← 负数从末尾数
print(s[0:6])    # Python ← 含头不含尾
print(s[:6])     # Python
print(s[6:])     # 数据分析
print(s[::2])    # 每隔一个取一个
print(s[::-1])   # 反转字符串
\`\`\`

切片不会越界报错：\`"abc"[0:100]\` 返回 \`"abc"\`。

## 常用方法速查

| 方法 | 说明 | 示例结果 |
| --- | --- | --- |
| \`s.upper()\` / \`s.lower()\` | 大小写 | \`"AB"\` / \`"ab"\` |
| \`s.strip(chars)\` | 去除首尾字符（默认空白） | \`"  x ".strip() → "x"\` |
| \`s.split(sep, maxsplit)\` | 分割成列表 | \`"a,b,c".split(",") → ['a','b','c']\` |
| \`sep.join(list)\` | 用分隔符拼接 | \`"-".join(['a','b']) → 'a-b'\` |
| \`s.replace(old, new, count)\` | 替换 | \`"aaa".replace("a","b",1) → "baa"\` |
| \`s.find(sub)\` / \`s.index(sub)\` | 查找位置 | 找不到时 \`find\` 返回 -1，\`index\` 抛异常 |
| \`s.startswith\` / \`s.endswith\` | 前缀/后缀判断 | \`True\` / \`False\` |
| \`s.count(sub)\` | 计数 | \`"banana".count("a") → 3\` |
| \`s.isdigit()\` / \`s.isalpha()\` | 类型判断 | \`"123".isdigit() → True\` |

## 三种格式化方式

**1. f-string（推荐，Python 3.6+）**

\`\`\`python
name, score = "小明", 92.5
print(f"{name} 的成绩是 {score:.1f} 分")
print(f"{1234567:,}")          # 1,234,567  千分位
print(f"{0.256:.2%}")          # 25.60%     百分比
print(f"{name!r}")             # '小明'      repr 形式
\`\`\`

**2. \`str.format()\`**

\`\`\`python
print("{} 的分数是 {:.1f}".format("小红", 88))
\`\`\`

**3. \`%\` 旧式格式化**（老代码常见，新代码不建议）

\`\`\`python
print("%s 的分数是 %.1f" % ("小刚", 76.5))
\`\`\`

## 字符串比较与成员判断

\`\`\`python
"a" in "data"        # True
"Python" == "python" # False ← 区分大小写
"apple" < "banana"   # True  ← 按 Unicode 码位逐字符比较
\`\`\`

> 在数据清洗中，\`strip()\` + \`lower()\` 几乎是最常用的组合：\`" 北京 ".strip()\` 与 \`"北京"\` 必须视为同一个值。
`,
      tips: [
        {
          kind: 'pitfall',
          text: '`"".split(",")` 返回 `[""]`（长度为 1 的列表），而不是空列表。判断"有无内容"时要额外小心。',
        },
        {
          kind: 'pitfall',
          text: '写正则或 Windows 路径时忘记加 `r` 前缀，`"\\n"` 会被当成换行、`"\\t"` 被当成制表符，导致匹配失败。',
        },
        {
          kind: 'leak',
          text: '拼接大量字符串时不要用 `+` 在循环里累加（每次都会新建对象，复杂度 O(n²)），用 `"".join(parts)` 效率高得多。',
        },
      ],
      demos: [
        {
          title: '切片与常用方法',
          lang: 'python',
          code: `s = "Python数据分析"
print("长度:", len(s))
print("前 6 个字符:", s[:6])
print("最后 2 个字符:", s[-2:])
print("反转:", s[::-1])
print("每隔一个:", s[::2])

text = "  用户ID:  A1024 , 北京  "
print("\\n原始:", repr(text))
print("strip:", repr(text.strip()))
print("split:", text.strip().split(","))
print("replace:", text.strip().replace("用户ID:", ""))`,
        },
        {
          title: 'f-string 格式化技巧',
          lang: 'python',
          code: `name, score, sales = "小明", 92.456, 1234567.891
print(f"{name} 的成绩：{score:.1f} 分")
print(f"销售额：{sales:,.2f} 元")
print(f"增长率：{0.0523:.2%}")
print(f"左对齐 |{name:<8}|  右对齐 |{score:>10.2f}|")
print(f"补零：{7:03d}")

# = 号调试（Python 3.8+）
width = 12.5
print(f"{width = }")`,
        },
      ],
    },
    {
      id: 'py-l-1-4',
      title: '布尔值与真值判断',
      content: `
## bool 是 int 的子类

\`\`\`python
print(True + 1)      # 2
print(isinstance(True, int))  # True
print(True == 1)     # True
print(sum([True, False, True]))  # 2  ← 统计"满足条件的个数"的常用技巧
\`\`\`

## 逻辑运算与短路求值

| 运算符 | 说明 | 示例 |
| --- | --- | --- |
| \`and\` | 与，两者为真才为真 | \`True and False\` → \`False\` |
| \`or\` | 或，任一为真即为真 | \`True or False\` → \`True\` |
| \`not\` | 非 | \`not 0\` → \`True\` |

**短路求值**：\`and\` 在左侧为假时直接返回左侧值，不再计算右侧；\`or\` 在左侧为真时直接返回左侧值。这个特性常被用来写"默认值"：

\`\`\`python
name = user_input or "匿名"   # 空字符串时使用默认值
\`\`\`

> 注意 \`and\`/\`or\` 返回的是**操作数本身**，不一定是 \`True\`/\`False\`：
> \`3 and 5\` → \`5\`；\`0 or "x"\` → \`"x"\`。

## 哪些值是"假"？

Python 中只有以下值会被判定为 \`False\`：

- \`False\`、\`None\`
- 数值零：\`0\`、\`0.0\`、\`0j\`
- 空容器：\`""\`、\`[]\`、\`()\`、\`{}\`、\`set()\`
- 空 \`range(0)\`

其余一切对象都是真。所以 \`if not df.empty:\` 或 \`if rows:\` 是常见的优雅写法。

## 比较运算的链式写法

\`\`\`python
x = 5
print(1 < x < 10)      # True，等价于 1 < x and x < 10
\`\`\`

## 三目运算符

\`\`\`python
level = "高" if score >= 90 else "中" if score >= 60 else "低"
\`\`\`

## 与 None 的比较

\`\`\`python
x = None
print(x is None)     # ✅ 推荐
print(x == None)     # ⚠️ 能跑但不推荐
\`\`\`

> 数据里常常混有 \`None\`、\`np.nan\`、空字符串三种"空"。它们并不相等：\`np.nan == np.nan\` 是 \`False\`，\`None == ""\` 也是 \`False\`。做缺失值判断请用 \`pd.isna()\`。
`,
      tips: [
        {
          kind: 'pitfall',
          text: '`if x:` 与 `if x is not None:` 语义不同：前者对 `0`、`""`、`[]` 也判为假。判断"参数是否传入"时要用 `is not None`。',
        },
        {
          kind: 'interview',
          text: '常见面试题：`if a and b` 与 `if a & b` 的区别。前者是逻辑与（短路），后者是按位与，对整数逐位运算，却常被误用到 NumPy 数组的条件筛选中（那里必须用 `&`，并给每个条件加括号）。',
        },
        {
          kind: 'note',
          text: '`sum(list_of_bools)` 统计满足条件的元素个数，比写循环计数更简洁，但可读性稍差，团队内要统一约定。',
        },
      ],
      demos: [
        {
          title: '真值判断实验',
          lang: 'python',
          code: `values = [0, 0.0, "", [], {}, None, False, "0", [0], -1]
for v in values:
    print(f"{repr(v):>8}  →  bool: {bool(v)}")

print("\\n短路求值：")
print("0 or '默认值' =", 0 or "默认值")
print("'有值' or '默认值' =", "有值" or "默认值")
print("3 and 5 =", 3 and 5)

print("\\n统计满足条件的个数：")
scores = [88, 45, 92, 67, 55]
print("及格人数:", sum(s >= 60 for s in scores))`,
        },
        {
          title: '链式比较与三目运算',
          lang: 'python',
          code: `def grade(score):
    return "优秀" if score >= 90 else "及格" if score >= 60 else "不及格"

for s in (95, 72, 58):
    print(f"{s} → {grade(s)}")

temp = 26
print("体感舒适" if 18 <= temp <= 26 else "体感不适")`,
        },
      ],
    },
    {
      id: 'py-l-1-5',
      title: '类型注解与输入输出',
      content: `
## 为什么需要类型注解

Python 3.5 起支持类型注解（PEP 484）。注解**不会在运行时强制检查**，但它是团队协作和 IDE 智能提示的基础，也让 \`mypy\` 这类静态检查工具能提前发现 bug。

\`\`\`python
def average(numbers: list[float]) -> float:
    return sum(numbers) / len(numbers)

name: str = "张三"
scores: dict[str, int] = {"math": 90, "english": 85}
maybe: int | None = None          # Python 3.10+ 的联合类型写法
\`\`\`

在数据分析代码里，**给 DataFrame 的列做类型约束**是最有价值的注解：

\`\`\`python
import pandas as pd

def load_orders(path: str) -> pd.DataFrame:
    ...
\`\`\`

## print 的常用参数

\`\`\`python
print("a", "b", sep="-", end="!\\n")   # a-b!
name = "李四"
print(f"你好，{name}")
\`\`\`

## input 读取用户输入

\`\`\`python
age_str = input("请输入年龄：")   # 返回值永远是 str
age = int(age_str)                # 需要自己转换
\`\`\`

> 在浏览器环境下 \`input()\` 不可用（没有终端阻塞输入），练习时请直接用变量代替。

## 查看类型与文档

\`\`\`python
x = 3.14
print(type(x))              # <class 'float'>
print(isinstance(x, float)) # True
print(isinstance(x, (int, float)))  # True  ← 判断是否属于多种类型之一
help(str.strip)             # 查看文档
\`\`\`
`,
      tips: [
        {
          kind: 'interview',
          text: '`type()` 与 `isinstance()` 的区别：`isinstance` 会考虑继承关系，是推荐用法。例如 `isinstance(True, int)` 为 `True`。',
        },
        {
          kind: 'leak',
          text: '函数签名里写上 `-> pd.DataFrame`、参数写 `df: pd.DataFrame`，配合 VS Code 的 Pylance 能获得准确的补全与错误提示，长期收益很大。',
        },
      ],
      demos: [
        {
          title: '类型检查与 isinstance',
          lang: 'python',
          code: `samples = [1, 2.0, "3", True, [1], None]
for s in samples:
    print(f"{repr(s):>8} → {type(s).__name__:<7} 是数字吗: {isinstance(s, (int, float)) and not isinstance(s, bool)}")

def safe_divide(a: float, b: float) -> float | None:
    """类型注解示例：可能返回 None 表示无法计算。"""
    if b == 0:
        return None
    return a / b

print("\\n10 / 0 →", safe_divide(10, 0))
print("10 / 4 →", safe_divide(10, 4))`,
        },
      ],
    },
  ],
  exercises: [
    {
      id: 'py-1-e1',
      type: 'single',
      difficulty: 1,
      question: '执行下面的代码后，`b` 的值是什么？\n\n```python\na = [1, 2, 3]\nb = a\nb.append(4)\n```',
      options: [
        { value: 'A', text: '`[1, 2, 3]`' },
        { value: 'B', text: '`[1, 2, 3, 4]`' },
        { value: 'C', text: '`None`' },
        { value: 'D', text: '抛出异常，列表不可修改' },
      ],
      answer: 'B',
      explanation:
        '`b = a` 只是让 `b` 指向同一个列表对象，`append` 修改的是对象本身，因此 `a` 和 `b` 看到的内容都会变化。如果要独立副本，应使用 `b = a.copy()` 或 `b = a[:]`。',
      tags: ['变量', '引用'],
      relatedLessonId: 'py-l-1-1',
    },
    {
      id: 'py-1-e2',
      type: 'judge',
      difficulty: 1,
      question: '`is` 运算符和 `==` 运算符的作用完全相同，都可以用来比较两个对象是否相等。',
      answer: false,
      explanation:
        '`==` 比较的是**值**（调用 `__eq__`），`is` 比较的是**是否为同一个对象**（比较 `id()`）。例如 `a = [1, 2]; b = [1, 2]`，`a == b` 为 `True`，而 `a is b` 为 `False`。',
      tags: ['运算符'],
    },
    {
      id: 'py-1-e3',
      type: 'multiple',
      difficulty: 2,
      question: '下列哪些值在 `if` 条件判断中会被判定为 `False`？（多选）',
      options: [
        { value: 'A', text: '`0`' },
        { value: 'B', text: '`[]`' },
        { value: 'C', text: '`"0"`' },
        { value: 'D', text: '`None`' },
        { value: 'E', text: '`{}`' },
        { value: 'F', text: '`"False"`' },
      ],
      answer: ['A', 'B', 'D', 'E'],
      explanation:
        '假值只有：`False`、`None`、数值零、空容器。`"0"` 和 `"False"` 都是**非空字符串**，因此为真。这正是"从 CSV 读入的 0 被当成字符串"容易被误判的原因。',
      tags: ['布尔值'],
    },
    {
      id: 'py-1-e4',
      type: 'fill',
      difficulty: 2,
      question: '补全代码，让 `b` 成为 `a` 的**独立副本**（修改 `b` 不会影响 `a`）：\n\n```python\na = [1, 2, 3]\nb = a.___()\nb.append(4)\nassert a == [1, 2, 3]\n```',
      blanks: [['copy']],
      explanation: '列表的 `copy()` 方法返回浅拷贝；也可以用 `a[:]` 或 `list(a)`。',
      tags: ['列表', '拷贝'],
    },
    {
      id: 'py-1-e5',
      type: 'single',
      difficulty: 2,
      question: '`print(0.1 + 0.2 == 0.3)` 的输出是？',
      options: [
        { value: 'A', text: '`True`' },
        { value: 'B', text: '`False`' },
        { value: 'C', text: '`0.30000000000000004`' },
        { value: 'D', text: '抛出 `ValueError`' },
      ],
      answer: 'B',
      explanation:
        '`0.1 + 0.2` 实际得到 `0.30000000000000004`，与字面量 `0.3` 不相等。浮点比较应使用 `math.isclose(0.1 + 0.2, 0.3)`。',
      tags: ['浮点数'],
    },
    {
      id: 'py-1-e6',
      type: 'judge',
      difficulty: 2,
      question: '`round(2.5)` 的结果是 `3`，因为 Python 的四舍五入规则是"逢五进一"。',
      answer: false,
      explanation:
        'Python 3 的 `round()` 使用**银行家舍入**（四舍六入五取偶），`round(2.5)` 返回 `2`，`round(3.5)` 返回 `4`。财务场景应使用 `Decimal(...).quantize(..., rounding=ROUND_HALF_UP)`。',
      tags: ['浮点数'],
    },
    {
      id: 'py-1-e7',
      type: 'code',
      difficulty: 3,
      question:
        '购物车金额计算：给定商品单价列表 `prices = [19.99, 5.49, 23.75, 0.99]`，请用 `Decimal` 精确计算 (1) 总金额（保留 2 位小数）、(2) 打 8.5 折后的应付金额（保留 2 位小数）。\n\n将两个结果分别保存到变量 `total` 和 `final_price`（类型均为 `Decimal`）。',
      starterCode: `from decimal import Decimal, ROUND_HALF_UP

prices = [Decimal("19.99"), Decimal("5.49"), Decimal("23.75"), Decimal("0.99")]

# 1. 计算总金额，保留 2 位小数
total = ___

# 2. 打 8.5 折，保留 2 位小数
final_price = ___
`,
      setupCode: '',
      expectedOutput: 'total = 50.22, final_price = 42.69',
      tests: `from decimal import Decimal
assert isinstance(total, Decimal), "total 应是 Decimal 类型"
assert total == Decimal("50.22"), f"total 应为 50.22，实际为 {total}"
assert isinstance(final_price, Decimal), "final_price 应是 Decimal 类型"
assert final_price == Decimal("42.69"), f"final_price 应为 42.69，实际为 {final_price}"
`,
      explanation:
        '```python\ntotal = sum(prices).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)\nfinal_price = (total * Decimal("0.85")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)\n```\n\n用 `float` 累加 `19.99 + 5.49 + 23.75 + 0.99` 会得到 `50.21999999999999`，直接 \`round\` 再 \`* 0.85\` 也可能出现 \`42.68699999...\`。金额计算务必用 `Decimal`。',
      tags: ['Decimal', '浮点数'],
    },
    {
      id: 'py-1-e8',
      type: 'code',
      difficulty: 2,
      question:
        '字符串切片：给定 `s = "Order_2024_Q1.xlsx"`，请提取：\n\n1. 文件扩展名（`xlsx`）保存到 `ext`（不带点）；\n2. 年份（`2024`）保存到 `year`；\n3. 去掉扩展名后的文件名 `Order_2024_Q1` 保存到 `stem`。',
      starterCode: `s = "Order_2024_Q1.xlsx"

ext = ___
year = ___
stem = ___
`,
      expectedOutput: "ext='xlsx' year='2024' stem='Order_2024_Q1'",
      tests: `assert ext == "xlsx", f"ext 应为 'xlsx'，实际为 {ext}"
assert year == "2024", f"year 应为 '2024'，实际为 {year}"
assert stem == "Order_2024_Q1", f"stem 应为 'Order_2024_Q1'，实际为 {stem}"
`,
      explanation:
        '```python\next = s.split(".")[-1]          # 或 s.rsplit(".", 1)[1]\nyear = s[6:10]                  # 或 s.split("_")[1]\nstem = s.rsplit(".", 1)[0]      # 或 s[:s.rindex(".")]\n```\n\n实际项目中处理路径更推荐 `pathlib.Path(s).stem` 与 `.suffix`。',
      tags: ['字符串', '切片'],
    },
    {
      id: 'py-1-e9',
      type: 'single',
      difficulty: 1,
      question: '`"Python"[1:3]` 的结果是？',
      options: [
        { value: 'A', text: '`"yt"`' },
        { value: 'B', text: '`"yth"`' },
        { value: 'C', text: '`"y"`' },
        { value: 'D', text: '`"Pyt"`' },
      ],
      answer: 'A',
      explanation: '切片是左闭右开区间 `[1:3]`，取下标 1、2 的字符，即 `y`、`t`。',
      tags: ['字符串', '切片'],
    },
    {
      id: 'py-1-e10',
      type: 'multiple',
      difficulty: 2,
      question: '关于字符串 `s = "  北京 "`，下列哪些说法正确？（多选）',
      options: [
        { value: 'A', text: '`s.strip()` 的结果是 `"北京"`' },
        { value: 'B', text: '`s.strip()` 会直接修改 `s` 本身' },
        { value: 'C', text: '`s.strip() == s` 为 `False`' },
        { value: 'D', text: '字符串是不可变类型，所有"修改"方法都返回新对象' },
      ],
      answer: ['A', 'C', 'D'],
      explanation:
        '字符串不可变，`strip()` 返回新的字符串而不会修改 `s`。因此 B 错误；A、C、D 正确。数据清洗时常见的 bug 就是写了 `s.strip()` 却没把返回值赋回去。',
      tags: ['字符串', '不可变'],
    },
    {
      id: 'py-1-e11',
      type: 'fill',
      difficulty: 2,
      question: '使用 f-string 把 `ratio = 0.2567` 格式化为百分比且保留 1 位小数，补全占位符：\n\n```python\nratio = 0.2567\nprint(f"{ratio:___}")\n# 期望输出：25.7%\n```',
      blanks: [['.1%']],
      explanation: '`%` 表示按百分比显示并自动乘以 100，`.1` 表示保留 1 位小数。',
      tags: ['字符串格式化'],
    },
    {
      id: 'py-1-e12',
      type: 'judge',
      difficulty: 1,
      question: '在 Python 中，`int("3.14")` 会返回 `3`。',
      answer: false,
      explanation:
        '`int("3.14")` 会抛出 `ValueError`，因为字符串 `"3.14"` 不是合法的整数字面量。正确做法是先 `float("3.14")` 再 `int()`，即 `int(float("3.14"))` 得到 `3`。',
      tags: ['类型转换'],
    },
    {
      id: 'py-1-e13',
      type: 'single',
      difficulty: 2,
      question: '下列哪个变量名是**不合法**的 Python 标识符？',
      options: [
        { value: 'A', text: '`_total`' },
        { value: 'B', text: '`totalPrice2`' },
        { value: 'C', text: '`2total`' },
        { value: 'D', text: '`total_price`' },
      ],
      answer: 'C',
      explanation: '标识符不能以数字开头。`2total` 无法解析，会报 `SyntaxError`。',
      tags: ['命名规范'],
    },
    {
      id: 'py-1-e14',
      type: 'open',
      difficulty: 3,
      question:
        '请解释：为什么在数据分析中，用 `float` 表示金额可能产生错误？请至少说出 3 种可能的业务后果，并给出 2 种解决方案。',
referenceAnswer: `**原因**：\`float\` 是 IEEE 754 双精度二进制浮点数，很多十进制小数（如 0.1、19.99）无法被二进制精确表示，运算中会累积误差，例如 \`0.1 + 0.2 == 0.30000000000000004\`。

**业务后果**（任答 3 点）：
1. 对账时金额差 1 分钱，被财务打回，需人工排查；
2. 金额累计后显示 \`50.21999999999999\` 这类异常数字，影响报表专业度；
3. 用 \`==\` 比较金额是否相等时误判，导致优惠券/退款逻辑出错；
4. 排序、分组时同值被判为不同组；
5. 加总后与上游系统对不上，产出失真。

**解决方案**：
1. 用 \`Decimal\` 做十进制精确计算（推荐财务场景），并显式指定舍入规则 \`ROUND_HALF_UP\`；
2. 以“分”为单位存成 \`int\`，仅在展示时除以 100；
3. 比较时使用 \`math.isclose\` 设置容差；
4. 数据库侧使用 \`DECIMAL/NUMERIC\` 类型而不是 \`FLOAT\`。`,
      rubric: [
        { point: '指出 IEEE 754 二进制表示导致十进制小数无法精确表示', score: 2 },
        { point: '举出具体业务后果（对账差异 / 显示异常 / 比较误判等）', score: 2 },
        { point: '给出 Decimal 方案', score: 1 },
        { point: '给出整型"分"或 isclose 容差方案', score: 1 },
      ],
      keywords: ['IEEE', '二进制', '精度', 'Decimal', '对账', '误差'],
      explanation: '本题考察对浮点数的本质理解，是数据分析面试中非常高频的问题。',
      tags: ['浮点数', '业务'],
    },
  ],
};

export { ch1 };