import type { Chapter } from '../../../types';

/* ============================================================
 *  第 3 章：控制流与函数
 * ============================================================ */

const ch3: Omit<Chapter, 'courseId' | 'order'> = {
  id: 'python-3',
  title: '控制流与函数',
  goal: '掌握 if / for / while 与 enumerate、zip 等迭代技巧，理解函数参数机制、作用域与可变默认值陷阱，能够写出可复用、可测试的数据处理函数。',
  lessons: [
    {
      id: 'py-l-3-1',
      title: '条件分支与 match 模式匹配',
      content: `
## if / elif / else

\`\`\`python
score = 78
if score >= 90:
    level = "优秀"
elif score >= 60:
    level = "及格"
else:
    level = "不及格"
\`\`\`

**关键点**：Python 用**缩进**表示代码块（PEP 8 建议 4 个空格），缩进错误会直接导致 \`IndentationError\`，这也是从其他语言转过来时最容易踩的坑。

## 顺序很重要：条件从"最严格"开始

\`\`\`python
# 错误：score = 95 时永远得到"及格"
if score >= 60:
    level = "及格"
elif score >= 90:      # 永远走不到！
    level = "优秀"
\`\`\`

\`elif\` 链是**短路**的：命中第一个为真的分支就结束。所以互斥区间要按边界从高到低（或从低到高）排列。

## 提前返回（guard clause）

在函数中优先处理异常分支并 \`return\`，可以让主逻辑扁平化：

\`\`\`python
def process_row(row):
    if row is None:
        return None
    if not row.get("amount"):
        return None
    # 主逻辑直接在最外层，无需层层缩进
    return row["amount"] * 1.13
\`\`\`

## 嵌套与"扁平优于嵌套"

超过三层的 \`if\` 嵌套就应该拆分：提取条件为具名变量、使用 \`and\` 合并、或抽成小函数。

## match 语句（Python 3.10+）

\`\`\`python
def handle_export(fmt):
    match fmt:
        case "csv":
            return "导出 CSV"
        case "xlsx" | "xls":
            return "导出 Excel"
        case {"type": t, **rest} if t == "json":   # 结构化模式匹配
            return f"导出 JSON（{rest}）"
        case _:
            return "未知格式"
\`\`\`

> \`match\` 更像"结构化模式匹配"而不是 C 的 \`switch\`：它能解构列表、字典与类实例。不过在 Pyodide 里 Python 版本较新（3.13），可以放心使用。

## 常用条件写法习惯

\`\`\`python
if x in (1, 2, 3):          # 优于 x == 1 or x == 2 or x == 3
if all(v is not None for v in values):   # 全部满足
if any(v > 100 for v in values):         # 任一满足
\`\`\`
`,
      tips: [
        {
          kind: 'pitfall',
          text: '`if x = 5:` 是语法错误，新手常把 `=`（赋值）误写成 `==`（比较）。更新版本的 Python 会给出明确的错误提示。',
        },
        {
          kind: 'leak',
          text: '把复杂条件先赋给有名字的变量：`is_high_value = amount > 1000 and level == "金卡"`，再 `if is_high_value:`，可读性立刻提升。',
        },
        {
          kind: 'interview',
          text: '`if x:` 与 `if x is not None:` 的区别（0、" "、[] 会被判假）是高频面试点，答案里最好带上业务例子。',
        },
      ],
      demos: [
        {
          title: '分段打分：if / elif 顺序陷阱',
          lang: 'python',
          code: `def grade_wrong(score):
    if score >= 60:
        return "及格"
    elif score >= 90:
        return "优秀"
    return "不及格"

def grade_right(score):
    if not isinstance(score, (int, float)):
        return "无效分数"
    if score >= 90:
        return "优秀"
    if score >= 60:
        return "及格"
    return "不及格"

for s in (95, 75, 50):
    print(f"{s} → 错误版本: {grade_wrong(s):<4} 正确版本: {grade_right(s)}")`,
        },
        {
          title: 'match 结构化模式匹配',
          lang: 'python',
          code: `def describe(value):
    match value:
        case 0:
            return "零"
        case [x] if isinstance(x, int):
            return f"单元素列表，元素 {x}"
        case [x, y]:
            return f"二元组/{x, y}"
        case {"city": c, "amount": a}:
            return f"{c} 的订单，金额 {a}"
        case str() as s:
            return f"字符串，长度 {len(s)}"
        case _:
            return f"其他类型 {type(value).__name__}"

for v in (0, [5], [1, 2], {"city": "北京", "amount": 99}, "数据分析", 3.14):
    print(f"{str(v):<32} → {describe(v)}")`,
        },
      ],
    },
    {
      id: 'py-l-3-2',
      title: '循环：for、while 与迭代技巧',
      content: `
## for 循环遍历的是"可迭代对象"

\`\`\`python
for ch in "abc":          # 字符串
for x in [1, 2, 3]:       # 列表
for k in {"a": 1}:        # 字典 → 遍历键
for k, v in {"a": 1}.items():   # 遍历键值对
for i in range(3):        # range 对象，惰性生成
for line in file:         # 逐行读大文件，内存友好
\`\`\`

## 四个高频工具

| 工具 | 用途 | 示例 |
| --- | --- | --- |
| \`enumerate(seq, start=0)\` | 同时拿到下标和值 | \`for i, v in enumerate(lst):\` |
| \`zip(a, b)\` | 并行遍历多个序列 | \`for name, score in zip(names, scores):\` |
| \`reversed(seq)\` | 反向迭代（不复制） | \`for x in reversed(lst):\` |
| \`sorted(seq, key=...)\` | 排序后迭代 | \`for x in sorted(lst, key=len):\` |

**\`zip\` 的"静默截断"**是经典坑：长度不等时以最短的为准，多余部分被丢弃且不报错。需要严格校验时用 \`zip(..., strict=True)\`（3.10+）。

## range 系列

\`\`\`python
range(5)          # 0,1,2,3,4
range(1, 10, 2)   # 1,3,5,7,9
range(10, 0, -1)  # 10..1 倒序
\`\`\`

## while 与 break / continue / else

\`\`\`python
n = 1
while n < 100:
    n *= 2
print(n)    # 128

for x in data:
    if x is None:
        continue      # 跳过本次
    if x == "STOP":
        break         # 结束整个循环
else:
    print("循环正常走完，没有被 break 打断")
\`\`\`

\`for ... else\` 表示"没有被 \`break\` 中断"，适合"查找是否有满足条件的元素"：

\`\`\`python
for u in users:
    if u.is_admin:
        print("找到管理员")
        break
else:
    print("没有管理员")
\`\`\`

## 双层循环的性能问题

\`\`\`python
# O(n²)：1 万个订单要比较 1 亿次
for o in orders:
    for p in products:
        if o["pid"] == p["id"]:
            ...

# O(n)：先建索引字典再查
prod_map = {p["id"]: p for p in products}
for o in orders:
    p = prod_map.get(o["pid"])
\`\`\`

> **这是数据分析中最值得记住的优化**：凡是"循环里再循环去查找"的地方，都可以先建一个字典/集合，把嵌套循环降为单层。

## 遍历时不要修改容器

\`\`\`python
# 错误：会漏元素
for x in lst:
    if x < 0:
        lst.remove(x)

# 正确：构造新列表（列表推导式）
lst = [x for x in lst if x >= 0]
\`\`\`
`,
      tips: [
        {
          kind: 'pitfall',
          text: '`zip(a, b)` 长度不同时按短的截断且**不报错**，数据长度不一致会导致"悄悄少了一批数据"。3.10+ 用 `zip(a, b, strict=True)` 可发现这种问题。',
        },
        {
          kind: 'performance',
          text: '遍历大文件用 `for line in f:`；遍历大列表时不要用 `range(len(lst))` 再索引，`enumerate` 更 Pythonic 也更快。',
        },
        {
          kind: 'leak',
          text: '循环体很简单时优先使用推导式、`sum()`、`all()`、`any()`、`max(key=...)`，代码更短、C 层执行更快。',
        },
      ],
      demos: [
        {
          title: 'enumerate / zip / dict 索引消嵌套',
          lang: 'python',
          code: `names = ["张三", "李四", "王五"]
scores = [88, 95, 72]

for i, (name, score) in enumerate(zip(names, scores), start=1):
    print(f"{i}. {name}: {score}")

print("\\n用字典消掉嵌套循环：")
orders = [{"pid": 101, "qty": 2}, {"pid": 103, "qty": 1}, {"pid": 101, "qty": 5}]
products = [{"id": 101, "name": "耳机", "price": 299}, {"id": 103, "name": "显示器", "price": 1599}]

pmap = {p["id"]: p for p in products}
total = 0
for o in orders:
    p = pmap.get(o["pid"])
    if p is None:
        continue
    subtotal = p["price"] * o["qty"]
    total += subtotal
    print(f"  {p['name']} x{o['qty']} = {subtotal}")
print("总计:", total)`,
        },
        {
          title: 'for...else 与 zip strict',
          lang: 'python',
          code: `users = [{"name": "张三", "role": "user"}, {"name": "李四", "role": "admin"}]
for u in users:
    if u["role"] == "admin":
        print("找到管理员:", u["name"])
        break
else:
    print("没有管理员")

a = [1, 2, 3]
b = [10, 20]
print("\\nzip 静默截断:", list(zip(a, b)))
try:
    list(zip(a, b, strict=True))
except ValueError as e:
    print("strict=True 会报错:", e)`,
        },
      ],
    },
    {
      id: 'py-l-3-3',
      title: '函数定义、参数与返回值',
      content: `
## 定义与调用

\`\`\`python
def calc_growth(current: float, previous: float) -> float | None:
    """计算同比增长率；分母为 0 时返回 None。"""
    if previous == 0:
        return None
    return (current - previous) / previous

rate = calc_growth(120, 100)   # 0.2
\`\`\`

函数体第一行的字符串叫 **docstring**，可通过 \`help(calc_growth)\` 或 \`calc_growth.__doc__\` 查看，是团队协作的基本要求。

## 五种参数形式

\`\`\`python
def f(a, b=10, *args, c=20, **kwargs):
    """
    a        : 位置参数（必填）
    b        : 默认参数
    *args    : 收集多余的位置参数为元组
    c        : 仅限关键字参数（keyword-only）
    **kwargs : 收集多余的关键字参数为字典
    """
    print(a, b, args, c, kwargs)

f(1, 2, 3, 4, c=5, d=6)
# 输出：1 2 (3, 4) 5 {'d': 6}
\`\`\`

## 可变默认值陷阱（必考）

\`\`\`python
def add_item(item, bucket=[]):
    bucket.append(item)
    return bucket

print(add_item("a"))   # ['a']
print(add_item("b"))   # ['a', 'b']  ← 不是 ['b']！
\`\`\`

原因：默认值在**函数定义时只求值一次**，\`[]\` 被所有调用共享。正确写法：

\`\`\`python
def add_item(item, bucket=None):
    if bucket is None:
        bucket = []
    bucket.append(item)
    return bucket
\`\`\`

## 参数传递：传"对象引用"

Python 不是"传值"也不是严格的"传引用"，而是**按对象引用传递**（call by object reference）：

- 传入不可变对象（数字、字符串、元组）：函数内的"修改"只影响局部变量；
- 传入可变对象（列表、字典）：函数内的原地修改会反映到外部。

\`\`\`python
def modify(lst):
    lst.append(1)      # 影响外部
    lst = [99]         # 只是让局部名字指向新列表，不影响外部

x = []
modify(x)
print(x)               # [1]
\`\`\`

## 多返回值

\`\`\`python
def stats(values):
    return min(values), max(values), sum(values) / len(values)

lo, hi, avg = stats([3, 8, 1])
\`\`\`

## 高阶函数与 lambda

\`\`\`python
data = [{"name": "a", "v": 3}, {"name": "b", "v": 1}]
data.sort(key=lambda r: r["v"])          # lambda 作排序键
squared = list(map(lambda x: x * x, [1, 2, 3]))
\`\`\`

> 当 lambda 超过一行或需要复用时就应改成普通函数。**不要为了"一行写完"牺牲可读性**。
`,
      tips: [
        {
          kind: 'pitfall',
          text: '把可变对象（list / dict / set）作为默认参数会导致跨调用共享状态，是 Python 最著名的坑之一。统一用 `None` + 函数体内初始化。',
        },
        {
          kind: 'interview',
          text: '`*args` 和 `**kwargs` 常被问"怎么写一个能接收任意参数的装饰器里的包装函数"。另外要能说清"仅限关键字参数"的作用：避免调用方按位置传参时把含义传错。',
        },
        {
          kind: 'leak',
          text: '一个函数只做一件事；数据处理函数应尽量是"输入 → 输出"的纯函数，这样便于单元测试，也不容易产生隐性依赖。',
        },
      ],
      demos: [
        {
          title: '可变默认值陷阱演示',
          lang: 'python',
          code: `def bad_append(item, bucket=[]):
    bucket.append(item)
    return bucket

print("错误写法：")
print("  bad_append('a') →", bad_append("a"))
print("  bad_append('b') →", bad_append("b"))
print("  bad_append('c') →", bad_append("c"))

def good_append(item, bucket=None):
    if bucket is None:
        bucket = []
    bucket.append(item)
    return bucket

print("\\n正确写法：")
print("  good_append('a') →", good_append("a"))
print("  good_append('b') →", good_append("b"))`,
        },
        {
          title: '参数形式全览',
          lang: 'python',
          code: `def report(title, *metrics, unit="元", **extra):
    print("标题:", title)
    print("指标:", metrics)
    print("单位:", unit)
    print("附加:", extra)

report("2024 Q1 销售", 1200, 980, 1500, unit="万元", owner="市场部", region="华东")

# 用 * 和 ** 展开已有数据
params = {"unit": "件", "owner": "运营部"}
report("库存", 300, 180, **params)`,
        },
      ],
    },
    {
      id: 'py-l-3-4',
      title: '作用域、闭包与生成器',
      content: `
## LEGB 作用域规则

Python 查找变量按顺序：**L**ocal → **E**nclosing（外层函数）→ **G**lobal（模块）→ **B**uiltin（内置）。

\`\`\`python
x = "global"

def outer():
    x = "enclosing"
    def inner():
        # 没赋值时会向上找，得到 "enclosing"
        print(x)
    inner()

outer()
\`\`\`

## global 与 nonlocal

\`\`\`python
counter = 0

def increment():
    global counter      # 显式声明要修改模块级变量
    counter += 1

def make_counter():
    n = 0
    def inc():
        nonlocal n      # 修改外层函数变量
        n += 1
        return n
    return inc
\`\`\`

> **最佳实践**：尽量避免 \`global\`。它会让数据流难以追踪，并且让函数不再是纯函数。

## 闭包

内部函数记住了外部函数的变量，即使外部函数已经执行结束：

\`\`\`python
def make_tax(rate):
    def apply(amount):
        return amount * (1 + rate)
    return apply

vat = make_tax(0.13)
print(vat(100))   # 113.0
\`\`\`

闭包的经典陷阱是**循环中创建 lambda**：

\`\`\`python
fs = [lambda: i for i in range(3)]
print([f() for f in fs])   # [2, 2, 2]  ← 都捕获了同一个 i

fs = [(lambda n: lambda: n)(i) for i in range(3)]
print([f() for f in fs])   # [0, 1, 2]
\`\`\`

## 生成器：惰性、省内存

把函数里的 \`return\` 换成 \`yield\` 就得到生成器：每次 \`next()\` 才计算下一个值。

\`\`\`python
def read_rows(path):
    with open(path, encoding="utf-8") as f:
        for line in f:
            yield line.rstrip("\\n").split(",")
\`\`\`

优点：**任意大的数据流都只占用常数内存**。缺点：只能遍历一次。

生成器表达式：

\`\`\`python
total = sum(x * x for x in range(10))     # 不创建中间列表
\`\`\`

## 迭代器协议简述

任何实现了 \`__iter__\` 与 \`__next__\` 的对象都是迭代器。\`for\` 循环、\`list()\`、\`sum()\` 都基于这个协议。Pandas 的 \`chunksize\` 读 CSV、数据库游标，本质上都是生成器思想的应用。
`,
      tips: [
        {
          kind: 'pitfall',
          text: '生成器只能消费一次，`len(gen)` 不支持；转成 list 之前不要在多处重复遍历，否则第二次得到的是空结果，且**不报错**。',
        },
        {
          kind: 'interview',
          text: '"闭包 + 循环变量"的 `[lambda: i for i in range(3)]` 输出 `[2,2,2]` 是经典面试题，考察对延迟绑定（late binding）的理解。',
        },
        {
          kind: 'performance',
          text: '处理 GB 级 CSV 时不要 `pd.read_csv` 一次性读入，可用 `chunksize=100_000` 分块聚合，或在线清洗后直接写库。',
        },
      ],
      demos: [
        {
          title: '闭包与延迟绑定',
          lang: 'python',
          code: `def make_tax(rate):
    def apply(amount):
        return amount * (1 + rate)
    return apply

vat = make_tax(0.13)
print("100 元含税:", vat(100))

fs_bad = [lambda: i for i in range(3)]
print("延迟绑定:", [f() for f in fs_bad])

fs_ok = [(lambda n: lambda: n)(i) for i in range(3)]
print("立即绑定:", [f() for f in fs_ok])`,
        },
        {
          title: '生成器的内存优势',
          lang: 'python',
          code: `import sys

def numbers_gen(n):
    for i in range(n):
        yield i

gen = numbers_gen(10_000_000)
print("生成器对象大小:", sys.getsizeof(gen), "字节")
print("前 5 个:", [next(gen) for _ in range(5)])

lst = [i for i in range(10_000)]
print("\\n列表大小:", sys.getsizeof(lst), "字节")
print("生成器表达式大小:", sys.getsizeof(i for i in range(10_000)), "字节")

# 生成器只能遍历一次
def counter():
    yield 1
    yield 2

c = counter()
print("\\n第一次 list(c):", list(c))
print("第二次 list(c):", list(c))`,
        },
      ],
    },
  ],
  exercises: [
    {
      id: 'py-3-e1',
      type: 'single',
      difficulty: 1,
      question: '执行 `print(5 // 2, 5 % 2)` 的输出是？',
      options: [
        { value: 'A', text: '`2.5 1`' },
        { value: 'B', text: '`2 1`' },
        { value: 'C', text: '`2 2.5`' },
        { value: 'D', text: '`3 1`' },
      ],
      answer: 'B',
      explanation: '`//` 是整除（向下取整），`%` 是取余。`5 // 2 = 2`，`5 % 2 = 1`。',
      tags: ['运算符'],
    },
    {
      id: 'py-3-e2',
      type: 'judge',
      difficulty: 2,
      question: '下面代码会输出 `["a", "a", "a"]`：\n\n```python\nfs = [lambda: i for i in range(3)]\nprint([f() for f in fs])\n```',
      answer: false,
      explanation:
        'Python 闭包采用**延迟绑定**，lambda 体在最外层列表推导式完成后才执行，此时 `i` 已经是 2，因此输出 `[2, 2, 2]`。若要捕获每次的值，用默认参数：`[lambda i=i: i for i in range(3)]`。',
      tags: ['闭包'],
    },
    {
      id: 'py-3-e3',
      type: 'multiple',
      difficulty: 2,
      question: '关于 `zip(a, b)`，下列说法正确的有？（多选）',
      options: [
        { value: 'A', text: '长度相等时，逐个配对成元组' },
        { value: 'B', text: '长度不等时以较短序列为准，多余元素被丢弃且不报错' },
        { value: 'C', text: '`zip(a, b, strict=True)` 在长度不等时会抛 `ValueError`' },
        { value: 'D', text: '`zip` 返回的是列表' },
      ],
      answer: ['A', 'B', 'C'],
      explanation:
        '`zip` 返回的是**迭代器**而不是列表，需要 `list(zip(...))` 才能看到全部内容。长度不等时静默截断是常见数据丢失来源，3.10+ 可用 `strict=True` 防范。',
      tags: ['zip', '迭代'],
    },
    {
      id: 'py-3-e4',
      type: 'fill',
      difficulty: 2,
      question: '补全代码，同时遍历列表的下标与值：\n\n```python\nnames = ["张三", "李四"]\nfor i, name in ___(names):\n    print(i, name)\n```',
      blanks: [['enumerate']],
      explanation: '`enumerate(seq, start=0)` 返回 `(下标, 值)` 对，比 `for i in range(len(names))` 更 Pythonic。',
      tags: ['循环'],
    },
    {
      id: 'py-3-e5',
      type: 'code',
      difficulty: 3,
      question:
        '编写函数 `top_n(records, n)`：\n\n- `records` 是 `[(名称, 分数), ...]` 的列表；\n- 返回**分数最高的前 n 条记录**（保持列表形式，按分数降序）；\n- 如果 `n` 大于记录总数，返回全部记录（已排序）。\n\n请在函数定义之后调用 `top_n(records, 3)`，并把结果保存到变量 `out`。',
      starterCode: `records = [("A", 72), ("B", 95), ("C", 88), ("D", 95), ("E", 60)]

def top_n(records, n):
    """返回按分数降序的前 n 条记录。"""
    return ___

out = top_n(records, 3)
`,
      setupCode: '',
      expectedOutput: "[('B', 95), ('D', 95), ('C', 88)]",
      tests: `assert out == [("B", 95), ("D", 95), ("C", 88)], f"结果不正确：{out}"
assert top_n([("X", 1)], 10) == [("X", 1)], "n 大于总数时应返回全部记录"
assert top_n([], 3) == [], "空列表应返回空列表"
assert top_n([("a", 1), ("b", 3), ("c", 2)], 2) == [("b", 3), ("c", 2)]
`,
      explanation:
        '```python\ndef top_n(records, n):\n    return sorted(records, key=lambda r: r[1], reverse=True)[:n]\n```\n\n`sorted` 是稳定排序，分数相同的记录保持原有相对顺序，因此 B 与 D 同分时 B 在前。Python 的切片越界不会报错，所以 `n` 大于长度时自动返回全部。',
      tags: ['函数', '排序'],
    },
    {
      id: 'py-3-e6',
      type: 'code',
      difficulty: 3,
      question:
        '编写函数 `safe_div(a, b, default=None)`：当 `b` 为 0 时返回 `default`，否则返回 `a / b`。\n\n然后计算 `out = [safe_div(x, y) for x, y in pairs]`，其中 `pairs = [(10, 2), (5, 0), (9, 3), (7, 0)]`，并给 `default` 传入 `0.0`。',
      starterCode: `pairs = [(10, 2), (5, 0), (9, 3), (7, 0)]

def safe_div(a, b, default=None):
    """安全除法：分母为 0 时返回 default。"""
    if b == 0:
        return ___
    return ___

out = [safe_div(x, y, default=0.0) for x, y in pairs]
`,
      setupCode: '',
      expectedOutput: '[5.0, 0.0, 3.0, 0.0]',
      tests: `assert out == [5.0, 0.0, 3.0, 0.0], f"结果不正确：{out}"
assert safe_div(1, 0) is None, "默认 default 应为 None"
assert safe_div(6, 3) == 2.0
assert safe_div(1, 0, default=-1) == -1
`,
      explanation:
        '```python\ndef safe_div(a, b, default=None):\n    if b == 0:\n        return default\n    return a / b\n```\n\n这是数据处理里最常用的防御式函数之一。注意 `default=None` 而不是具体数值，把"缺省该怎么办"交给调用方决定。',
      tags: ['函数', '异常处理'],
    },
    {
      id: 'py-3-e7',
      type: 'single',
      difficulty: 3,
      question:
        '执行下面两行后，第二次输出是什么？\n\n```python\ndef f(x, acc=[]):\n    acc.append(x)\n    return acc\nprint(f(1))\nprint(f(2))\n```',
      options: [
        { value: 'A', text: '`[2]`' },
        { value: 'B', text: '`[1, 2]`' },
        { value: 'C', text: '`[1]`' },
        { value: 'D', text: '`[2, 1]`' },
      ],
      answer: 'B',
      explanation:
        '默认参数在函数**定义时**求值一次，`[]` 被所有调用共享，所以第二次调用向同一个列表追加 2，得到 `[1, 2]`。这是 Python 最经典的陷阱之一，应改用 `acc=None`。',
      tags: ['函数', '默认参数'],
    },
    {
      id: 'py-3-e8',
      type: 'judge',
      difficulty: 2,
      question: '在 `for ... else` 结构中，`else` 块只有在循环没有被 `break` 中断时才会执行。',
      answer: true,
      explanation:
        '`for...else` / `while...else` 的 `else` 表示"正常结束"（包括一次都没执行），被 `break` 打断时不执行。常用于"查找是否命中"的场景，等价于一个标志位变量。',
      tags: ['循环'],
    },
    {
      id: 'py-3-e9',
      type: 'fill',
      difficulty: 3,
      question: '补全代码，让内部函数能够修改外层函数的变量：\n\n```python\ndef make_counter():\n    n = 0\n    def inc():\n        ___ n\n        n += 1\n        return n\n    return inc\n```',
      blanks: [['nonlocal']],
      explanation: '`nonlocal n` 声明 `n` 来自外层函数作用域；若变量在模块级则用 `global`。',
      tags: ['作用域'],
    },
    {
      id: 'py-3-e10',
      type: 'multiple',
      difficulty: 3,
      question: '下列哪些是使用生成器（`yield`）的优势？（多选）',
      options: [
        { value: 'A', text: '惰性计算，内存占用低' },
        { value: 'B', text: '可以处理超出内存规模的数据流' },
        { value: 'C', text: '可以像列表一样按索引访问（`gen[0]`）' },
        { value: 'D', text: '可以延迟执行直到真正需要时' },
      ],
      answer: ['A', 'B', 'D'],
      explanation: '生成器不支持索引访问，也不支持 `len()`，且只能遍历一次。它只能顺序迭代，这正是它节省内存的原因。',
      tags: ['生成器'],
    },
    {
      id: 'py-3-e11',
      type: 'code',
      difficulty: 4,
      question:
        '用嵌套循环实现太慢。给定 `products`（含 `id` 与 `price`）与 `items`（含 `pid` 与 `qty`），请：\n\n1. 先建立 `id → price` 的字典；\n2. 计算所有明细的销售额之和，保存到 `total`（float）；\n3. 计算 `items` 中出现了多少次"商品不存在"的情况，保存到 `missing_count`。',
      starterCode: `products = [{"id": 1, "price": 19.9}, {"id": 2, "price": 35.0}, {"id": 3, "price": 8.5}]
items = [
    {"pid": 1, "qty": 3},
    {"pid": 2, "qty": 1},
    {"pid": 99, "qty": 2},
    {"pid": 3, "qty": 4},
    {"pid": 1, "qty": 1},
]

total = ___
missing_count = ___
`,
      setupCode: '',
      expectedOutput: 'total = 148.6, missing_count = 1',
      tests: `assert abs(total - 148.6) < 1e-9, f"total 应为 148.6，实际 {total}"
assert missing_count == 1, f"missing_count 应为 1，实际 {missing_count}"
`,
      explanation:
        '```python\nprice_map = {p["id"]: p["price"] for p in products}\ntotal = 0.0\nmissing_count = 0\nfor it in items:\n    price = price_map.get(it["pid"])\n    if price is None:\n        missing_count += 1\n        continue\n    total += price * it["qty"]\n```\n\n计算：19.9×3 + 35×1 + 8.5×4 + 19.9×1 = 59.7 + 35 + 34 + 19.9 = 148.6（注意 pid=1 的商品出现了两次，都要计入）。用字典把"每次查找都遍历商品表"的 O(n×m) 降为 O(n+m)。',
      tags: ['字典', '性能'],
    },
    {
      id: 'py-3-e12',
      type: 'single',
      difficulty: 2,
      question: '函数 `f(a, b=2, *args, c=3)` 中，`c` 属于哪种参数？',
      options: [
        { value: 'A', text: '位置参数' },
        { value: 'B', text: '仅限关键字参数（keyword-only）' },
        { value: 'C', text: '可变位置参数' },
        { value: 'D', text: '可变关键字参数' },
      ],
      answer: 'B',
      explanation: '在 `*args` 之后声明且带默认值的参数是"仅限关键字参数"，调用时必须写成 `f(1, c=5)`，不能按位置传入。这能避免位置传参时的顺序错误。',
      tags: ['函数', '参数'],
    },
    {
      id: 'py-3-e13',
      type: 'open',
      difficulty: 3,
      question:
        '你写了一段数据处理脚本，对 10 万行订单逐行做 `for row in rows: for p in products: ...` 查找商品价格，运行需要 90 秒。请给出至少 4 种优化方向，并说明各自的适用场景与可能的风险。',
referenceAnswer: `**1. 建立字典索引（最简单、收益最大）**：先把商品表转成 \`{id: product}\` 字典，查找从 O(m) 降为 O(1)，整体从 O(n·m) 变为 O(n+m)。风险：商品表非常大时字典内存占用增长，但通常可接受。

**2. 使用 Pandas merge**：把订单与商品转成 DataFrame 后 \`pd.merge(orders, products, on="product_id", how="left")\`，底层是 C 实现的哈希连接，比 Python 循环快 10~100 倍。风险：需要把数据全部载入内存。

**3. 向量化 / NumPy 索引**：如果只是按 id 取价，可以用 NumPy 数组做 \`np.take(price_array, id_array)\`。

**4. 改用列式引擎或数据库**：数据量到亿级时用 DuckDB / ClickHouse / 数据库 JOIN，利用索引与并行；Python 只负责取结果。

**5. 减少 Python 层的行级操作**：把能批量做的（类型转换、过滤）交给 pandas / polars，避免 \`iterrows()\`（它比向量化慢几十倍）。

**风险与取舍**：优化前应先**测量**（\`cProfile\`、\`time.perf_counter\`）确认瓶颈，不要凭感觉优化；同时注意优化后结果的正确性（如缺失键处理方式变化可能引入 NaN 行，需做对账）。`,
      explanation: '这是一道典型的性能优化面试题。评分看两点：一是能否说出"建立索引把 O(n·m) 降为 O(n+m)"这类结构性优化，二是是否想到用 pandas / 数据库把计算下沉到 C 实现或更快的引擎。能补一句"优化前先测量"会明显加分。',
      rubric: [
        { point: '建立字典索引，把嵌套查找降为 O(1)', score: 2 },
        { point: '使用 pandas merge 等向量化方案', score: 2 },
        { point: '提到数据库/列式引擎等外部方案', score: 1 },
        { point: '强调先测量定位瓶颈、优化后需对账验证', score: 1 },
      ],
      keywords: ['字典', '哈希', 'merge', '向量化', '索引', 'pandas', '瓶颈'],
      tags: ['性能', '面试'],
    },
  ],
};

export { ch3 };