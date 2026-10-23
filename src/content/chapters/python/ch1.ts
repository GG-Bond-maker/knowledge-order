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
## 学习目标

学完本节，你应该能够：
1. 用"名字标签贴在对象上"的模型解释 Python 变量，而不是"变量是装值的盒子"；
2. 区分 \`is\` 与 \`==\`、可变对象与不可变对象；
3. 复现并解释 \`b = a\` 之后 \`b.append(...)\` 为什么会影响 \`a\`——这是 Python 数据分析中最常见的一类 bug 的根源。

## 前置知识

本节是全课程第一节，无前置。会开机、会打字即可。

## 问题背景：为什么第一课要讲内存模型

数据分析日常的诡异 bug 十有八九出自同一根源：以为赋值是"复制"，实际只是"起别名"。两个变量名指向同一个列表，改了一个，"另一个"也变了——数据被意外污染，且往往离案发现场很远才爆雷。把这一节的模型吃透，后面列表、字典、函数默认参数、DataFrame 切片的坑都能提前识破。

## 直觉理解：名字标签，不是盒子

C 语言里变量是盒子（装一个值）；**Python 里变量是名字标签**，贴在对象上：

\`\`\`
a = [1, 2, 3]     # 造一个列表对象，贴上标签 a
b = a             # 没有新列表！只是同一个列表再贴一张标签 b
b.append(4)       # 通过标签 b 改了那个唯一的列表
a                 # [1, 2, 3, 4] —— 标签 a 看到的也变了
\`\`\`

标签可以有无数张，对象只有一个。\`del a\` 只撕掉标签，对象是否被回收取决于还有没有别的标签引用它（引用计数归零即回收，CPython 实现）。

## 核心概念：对象、引用、身份、相等

- **一切皆对象**：数字、字符串、函数、类——都有 \`id()\`（身份，CPython 中即内存地址）、类型 \`type()\`、值；
- **\`is\` 比身份**（同一对象），**\`==\` 比值**（\`a == b\` 调用 \`a.__eq__(b)\`）；
- **不可变对象**：\`int / float / str / tuple\`——"改"它们其实是造新对象贴旧标签；
- **可变对象**：\`list / dict / set\`——原地修改，所有标签都能看到。

## 原理详解：两类对象的行为分岔

对不可变对象，任何"修改"操作（如 \`s += "!"\`）必然产生新对象，别名之间天然隔离；对可变对象，\`+=\`、\`append\` 等是原地操作，别名共享修改。函数传参同理：**传的是引用**——函数内对可变参数的原地修改会波及调用方，而对不可变参数重新赋值只改函数内的本地标签。这一条直接预告了第 3 章可变默认参数陷阱的原理。

## 完整案例：三段代码三种命运

\`\`\`python
# 1) 不可变：天然隔离
x = 10
y = x
y += 5            # y 贴到新对象 15
print(x, y)       # 10 15

# 2) 可变：别名共享
a = [1, 2, 3]
b = a
b.append(4)
print(a is b, a)  # True [1, 2, 3, 4]

# 3) 真正的复制要显式做
c = a.copy()      # 或 a[:] 或 list(a) —— 浅拷贝
c.append(5)
print(a is c, a, c)  # False [1, 2, 3, 4] [1, 2, 3, 4, 5]
\`\`\`

注意第 3 段是**浅拷贝**：列表里的子对象仍是共享的（嵌套列表的坑，第 5 章 \`copy.deepcopy\` 处理）。

## 代码实践

\`\`\`python
import sys
a = [1, 2]
b = a
print(id(a) == id(b), a is b)      # True True
print(sys.getrefcount(a))          # 3 左右：a、b、函数调用临时引用

s1 = "hello"
s2 = "hello"
print(s1 is s2)                    # True：短字符串被解释器驻留（实现细节，勿依赖）
print(s1 == s2)                    # True：判值永远用 ==

n1 = 257
n2 = 257
print(n1 is n2)                    # 常为 False：小整数缓存仅覆盖 -5..256
print(n1 == n2)                    # True
\`\`\`

预期输出：\`True True\` → refcount 约 3 → \`True\` → \`True\` → \`False True\`（最后两行依解释器版本可能不同——**这恰恰证明 \`is\` 依赖实现细节，判值必须用 \`==\`**）。**常见错误**：用 \`is\` 比较数值或字符串；把 \`b = a\` 当复制用；混淆"标签消失"与"对象删除"。

## 常见误区

1. **"赋值拷贝了数据"**——只拷贝了引用。列表、字典、DataFrame 全部适用。
2. **\`is\` 与 \`==\` 混用**——\`is\` 只该用于 \`is None\` 这类身份判断。
3. **小整数缓存 / 字符串驻留当语言保证**——CPython 优化细节（\`-5..256\`），跨实现不保证。
4. **"不可变所以慢"**——恰恰相反，不可变对象可以被安全共享、用作字典键（第 2 章的伏笔）。

## 知识关联

- **向后**：下一节数字类型是不可变对象的第一个系统案例；第 2 章四大容器可变性各异；第 3 章函数默认参数陷阱是本节模型的直接推论；
- **平行**：Pandas 中 \`df2 = df\` 同样是贴标签，视图与拷贝的区分贯穿数据分析全程。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 变量模型 | 名字标签 → 对象；赋值 = 贴标签，不复制 |
| 身份 vs 相等 | \`is\` 比对象身份，\`==\` 比值 |
| 可变 / 不可变 | list/dict/set 原地改；int/str/tuple 改 = 新对象 |
| 复制 | 显式 \`.copy()\`（浅）；嵌套结构用 \`copy.deepcopy\` |

## 参考资料

> **来源类型：官方文档**
> - Python 官方教程 §3.1 "Using Python as a Calculator" 与 §9 "Classes"（docs.python.org）——对象与名字绑定的权威表述。
>
> **来源类型：权威教材**
> - Ramalho, L., *Fluent Python*（O'Reilly, 2nd ed., 2022），Chapter 1/6——"变量是标签而非盒子"的标准讲法。
>
> **来源类型：原创**
> - 三段对照代码与逐行讲解为本课程改编。
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
## 学习目标

学完本节，你应该能够：
1. 解释 \`0.1 + 0.2 != 0.3\` 的二进制根源，并说清浮点数的安全有效位数（15–17 位）；
2. 用 \`math.isclose\` 与 \`decimal.Decimal\` 分别解决"比较"与"精确计算"两类问题；
3. 说出 \`/\`、\`//\`、\`%\` 与 \`divmod\` 的分工，避免整除负数的坑。

## 前置知识

- 上一节的变量与对象模型（数字不可变——"改"即是新对象）；
- 二进制表示整数的基本概念（八位二进制 0–255 即可，不要求位运算基础）。

## 问题背景：一个让全球程序员困惑了六十年的等式

打开任何 Python 环境：\`0.1 + 0.2 == 0.3\` 返回 \`False\`。这不是 bug，而是 IEEE 754 浮点标准的必然结果。数据分析里金额求和对不上分、循环累加越加越偏、机器学习损失打印出 17 位小数——全是同一件事：**二进制无法精确表示大多数十进制小数**。不理解它，你会把对的代码当成错的，把错的代码当成对的。

## 直觉理解：三分之一困境

十进制里 1/3 = 0.3333... 写不尽；同理二进制里 1/10 = 0.000110011...（0011 无限循环）。float 只有 64 位，无限循环必须截断——存进去的 0.1 其实是 0.1000000000000000055511151231257827...。两个"近似 0.1"相加，与"近似 0.3"自然差了一丝。**误差在写入那一刻就注定了**，与运算技巧无关。

## 核心概念：IEEE 754 双精度速览

64 位 = 1 符号位 + 11 指数位 + **52 尾数位**，约 **15–17 位十进制有效数字**。两个关键推论：
- 超过 15 位的十进制输入，尾数已无法区分（\`0.1 + 0.2\` 打印出的 \`0.30000000000000004\` 正是第 17 位暴露）；
- 机器精度 \`eps = 2⁻⁵² ≈ 2.22e-16\`：1 与“下一个能表示的 float”的间隔，可用 \`sys.float_info.epsilon\` 取得（\`math.ulp(1.0)\` 给出同一值）。

与 \`int\` 的对比：Python 的 \`int\` 是**任意精度**（只受内存限制），\`2**1000\` 精确无误；\`float\` 溢出为 \`inf\`，\`numpy\` 定宽整数还会回绕——这是第 6 章数据管道的隐患预告。

## 原理详解：为什么"恰好差一点"

以 0.1 为例：规格化后尾数是无限循环 \`0.0001100110011...₂\`，52 位后**舍入**。0.2、0.3 同理各自近似。于是 \`0.1 + 0.2\` 是"近似值 + 近似值"，结果再舍入一次，而 \`0.3\` 是对 0.3 的单独一次近似——两条路径到达的不是同一个 64 位模式。判等的正确姿势是比较差值是否在容差内：

\`\`\`python
import math
math.isclose(0.1 + 0.2, 0.3)              # True（默认相对容差 1e-09）
abs(0.1 + 0.2 - 0.3) < 1e-9               # 等价的手写版
\`\`\`

## 完整案例：误差是会累积的

\`\`\`python
total = 0.0
for _ in range(10):
    total += 0.1
print(total)                     # 0.9999999999999999
print(sum([0.1] * 10))           # 0.9999999999999999（sum 有更聪明的成对补偿版本时更准，此处同样中招）
print(math.fsum([0.1] * 10))     # 1.0 —— 用 fsum：跟踪丢失的低位，结果精确
\`\`\`

三次输出对比说明：**误差不是单次事故，而是会随累加放大的系统性偏差**；\`math.fsum\` 用补偿算法守住精度。金额场景的根治方案是 \`Decimal\`：

\`\`\`python
from decimal import Decimal
Decimal("0.1") + Decimal("0.2") == Decimal("0.3")   # True：十进制精确存储
Decimal(0.1)                                        # 注意！0.1 的 float 近似——务必传字符串
\`\`\`

## 代码实践

\`\`\`python
import math
print(0.1 + 0.2)                        # 0.30000000000000004
print(f"{0.1:.20f}")                    # 0.10000000000000000555
print(math.isclose(0.1 + 0.2, 0.3))     # True
print(7 / 2, 7 // 2, 7 % 2)             # 3.5 3 1（真除法 / 永远得 float）
print(-7 // 2, -7 % 2)                  # -4 1（// 向下取整！不是向零截断）
print(divmod(7, 2))                     # (3, 1) 商和余数一次拿
import sys
print(sys.float_info.epsilon)            # 2.220446049250313e-16
\`\`\`

预期输出逐行见注释。**常见错误**：\`Decimal(0.1)\` 传 float（把近似值带进来了）；\`//\` 以为向零取整（负数行为翻车）；\`round(2.675, 2)\` 期望 2.68 实得 2.67（round 用银行家舍入 + 二进制近似双重作用）。

## 常见误区

1. **"print 出来是对的，怎么存的是错的"**——Python 从 Python 3.1 起 print 用最短往返表示，\`0.1\` 打印 0.1 但存的从来都是那个长尾数。
2. **用 \`round\` 修一切**——round 只是换一个近似，比较仍会翻车；比较用 \`isclose\`，精确用 \`Decimal\`。
3. **金融计算用 float**——分单位整数或 \`Decimal\`，绝不用 float 存钱。
4. **把 numpy 溢出当 Python 语义**——\`np.int64\` 定宽会静默回绕，与内置 int 行为完全不同。

## 知识关联

- **向前**：上一节"不可变对象"解释了 \`x += 1\` 为何安全；本节是第 4 章 CSV 金额字段、第 6 章订单金额聚合的精度地基；
- **向后**：NumPy/Pandas 课程会重放同一主题（float64 数组）；机器学习课程里"损失不下降"排查也会用到 \`isclose\` 思想。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 根源 | 二进制无限循环 + 52 位尾数截断（IEEE 754） |
| 有效位 | 15–17 位十进制；\`eps ≈ 2.22e-16\` |
| 比较 | \`math.isclose\`（绝不用 \`==\`） |
| 精确 | \`Decimal("0.1")\`（传字符串）；累加用 \`math.fsum\` |
| 整除 | \`//\` 向下取整（负数向负无穷），\`divmod\` 一箭双雕 |

## 参考资料

> **来源类型：官方文档**
> - Python 官方教程 §14.1 "Floating Point Arithmetic: Issues and Limitations"（docs.python.org）——本节主题的官方权威解释。
> - 标准库文档 \`math\`（isclose/fsum/ulp）与 \`decimal\` 模块页。
>
> **来源类型：学术来源**
> - Goldberg, D. (1991). "What Every Computer Scientist Should Know About Floating-Point Arithmetic." *ACM Computing Surveys*, 23(1), 5–48 —— 浮点领域的经典总览。
> - IEEE 754-2019 标准。
>
> **来源类型：原创**
> - 误差累积三连对比与 Decimal 金额示例为本课程改编。
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