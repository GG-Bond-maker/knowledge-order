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
## 学习目标

学完本节，你应该能够：
1. 熟练使用 for + range、enumerate、zip 完成遍历，并说明 while 的适用场景；
2. 用 break/continue/else 精确控制循环流程（尤其循环 else 的触发条件）；
3. 识别"循环中重复造轮子"的信号，改用 sum/max/any/all/推导式。

## 前置知识

- 列表与迭代器的基本概念（第 2 章）；
- 布尔真值判断（l-1-4）。

## 问题背景：循环是初学者的第一生产力，也是第一堆烂代码

90% 的数据处理是"逐条加工"——循环不可替代；但 Python 的循环生态里有大量**更短、更快、更不易错**的替代品。初学的常见症状：手写计数器、手写累加、三层嵌套找元素。本节目标：循环写得对，更知道**什么时候不该写循环**。

## 核心概念：四件套与流程控制

\`\`\`python
for i in range(3): ...              # 计数循环
for idx, x in enumerate(lst): ...   # 带下标（不要手写 i=0; while i<len）
for a, b in zip(xs, ys): ...        # 多序列并行（不要下标取两个列表）
while 条件: ...                      # 次数未知（重试、收敛、读流）
\`\`\`

\`break\` 跳出最近循环；\`continue\` 跳到下一次迭代；**循环 else**：循环**没有被 break 中断**时才执行——天然适合"查找失败"分支：

\`\`\`python
for u in users:
    if u.id == target:
        print("找到"); break
else:                                # 循环自然结束（没找到）才进来
    print("未找到")
\`\`\`

## 完整案例：找第一个合格订单的三种写法

\`\`\`python
orders = [{"id": 1, "amt": 50}, {"id": 2, "amt": 800}, {"id": 3, "amt": 1200}]

# 写法一：循环 + flag（初学者）
found = None
for o in orders:
    if o["amt"] > 1000:
        found = o
        break

# 写法二：循环 else（正确但少用）
for o in orders:
    if o["amt"] > 1000:
        found = o
        break
else:
    found = None

# 写法三：生成器 + next（Pythonic）
found = next((o for o in orders if o["amt"] > 1000), None)
\`\`\`

三种等价；写法三把"找第一个"的语义压进一行，\`next\` 的第二个参数兜底未找到。

## 代码实践

\`\`\`python
import random
rng = random.Random(7)

# 场景1：次数未知 -> while（重试直到成功，上限 5 次）
attempts = 0
while attempts < 5:
    attempts += 1
    if rng.random() < 0.4:
        print(f"第 {attempts} 次成功"); break
else:
    print("5 次均失败")           # while 也支持 else：未被 break 才执行

# 场景2：并行遍历统计差异
xs, ys = [10, 20, 30], [12, 18, 33]
diffs = [f"{x}->{y} ({y-x:+d})" for x, y in zip(xs, ys)]
print(diffs)

# 场景3：判断存在性不用收集全部
has_big = any(o["amt"] > 1000 for o in orders)
all_pos = all(o["amt"] > 0 for o in orders)
print(has_big, all_pos)
\`\`\`

预期输出：重试结果（依随机而定，else 分支可能触发）；diffs 形如 ['10->12 (+2)', ...]；\`True True\`——any/all 接收生成器，**找到即短路**，不全量扫描。**常见错误**：while 忘记更新条件（死循环）；\`zip\` 两序列长度不齐（默认截断，需 \`strict=True\` 报错或 \`itertools.zip_longest\`）；在循环里用 \`lst.remove(x)\`（跳元素，见 l-2-1）。

## 常见误区

1. **手写计数器 i += 1 配 while**——已知次数用 for+range；
2. **为"找有没有"建一个完整列表**——any/all + 生成器短路即止；
3. **循环 else 与 if else 混淆**——循环 else 挂在 for/while 上，"没被 break"才执行；
4. **多层嵌套循环**——超过两层先想数据结构（字典索引、集合）能否降维。

## 知识关联

- **向前**：列表/字典（第 2 章）是循环的原材料；
- **向后**：推导式（第 5 章）是"循环建列表"的语法糖；生成器（l-3-4）把"边循环边产出"做到省内存；
- **平行**：Pandas 的向量化是"整列循环"的工业替代——同一个思想换层面。

## 本节总结

| 场景 | 工具 |
| --- | --- |
| 已知次数 / 带下标 / 并行 | for+range / enumerate / zip |
| 次数未知 | while（务必更新条件） |
| 查找失败分支 | 循环 else / next(生成器, 默认) |
| 存在/全部判断 | any / all（短路） |

## 参考资料

> **来源类型：官方文档**
> - Python 教程 §4 "More Control Flow Tools"（docs.python.org）——break/continue/else 与循环惯用的权威表述。
>
> **来源类型：原创**
> - 三种查找写法对照为本课程改编。
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
## 学习目标

学完本节，你应该能够：
1. 熟练使用位置/关键字/默认/可变参数（\`*args\`/\`**kwargs\`）四类参数并说出解包场景；
2. 解释可变默认参数陷阱的内存机制（第 1 章对象模型的直接应用）并给出正确写法；
3. 用类型注解（\`list[dict]\`、\`-> float\`）为函数写"自解释签名"。

## 前置知识

- 对象与名字绑定（l-1-1：函数默认参数的陷阱根源）；
- 列表/字典（第 2 章）。

## 问题背景：函数是代码复用的最小单元，也是第一坑现场

数据分析脚本变长的第一信号：同一段清洗逻辑复制三遍。函数化是解药，但 Python 参数系统有几个**教科书级陷阱**——可变默认参数首当其冲：\`def f(x, acc=[])\` 的 \`acc\` 在**多次调用间共享同一个列表**。不懂其机制的人改 \`[]\` 为 \`None\` 了事，懂的人能讲清为什么。

## 核心概念：四类参数一张表

| 类型 | 语法 | 调用示例 | 说明 |
| --- | --- | --- | --- |
| 位置 | \`def f(a, b)\` | \`f(1, 2)\` | 按顺序绑定 |
| 关键字 | 同上 | \`f(b=2, a=1)\` | 按名绑定，可读性优先 |
| 默认值 | \`def f(a, sep=",")\` | \`f(x)\` | **定义时求值一次**（陷阱根源） |
| 可变收集 | \`def f(*args, **kw)\` | \`f(1, k=2)\` | 收集成元组/字典 |
| 解包传递 | \`def f(a, b, c)\` | \`f(*[1,2,3])\` | 序列/字典展开成参数 |

顺序规则：\`def f(位置, 默认=..., *args, **kwargs)\`，关键字参数不能在位置参数前。

## 原理详解：可变默认参数为什么共享

\`def f(acc=[])\` 中 \`[]\` 在 **def 执行时创建一次**，成为函数对象的一个属性（\`f.__defaults__\`）；此后每次调用不传 \`acc\`，绑定的都是**同一个列表对象**——与 \`b = a\` 别名共享（l-1-1）完全同源。验证：两次调用后 \`f.__defaults__[0]\` 是同一个 id。正确写法用哨兵：

\`\`\`python
def add_item(item, acc=None):
    if acc is None:
        acc = []            # 每次调用新建
    acc.append(item)
    return acc
\`\`\`

**为什么默认值不在调用时求值？** def 是语句，执行一次即创建函数对象——默认值作为对象状态随之固定（性能考虑：避免每次调用重复求值）。

## 完整案例：一个带完整签名的清洗函数

\`\`\`python
def clean_prices(
    prices: list[float],
    drop_negative: bool = True,
    scale: float = 1.0,
    **report: object,
) -> tuple[list[float], dict]:
    # 清洗价格序列：去负值、缩放，返回(结果, 报告)
    out, n_drop = [], 0
    for p in prices:
        if drop_negative and p < 0:
            n_drop += 1
            continue
        out.append(p * scale)
    info = {"dropped": n_drop, "kept": len(out)}
    info.update(report)
    return out, info

clean, info = clean_prices([10.0, -2, 30], scale=1.1, source="demo")
print(clean, info)
\`\`\`

预期输出：\`[11.0, 33.0] {'dropped': 1, 'kept': 2, 'source': 'demo'}\`——注解+docstring+关键字参数让调用处几乎不需要读函数体。

## 代码实践

\`\`\`python
def demo(acc=[]):                 # 陷阱现场
    acc.append(1)
    return acc

print(demo(), demo())             # [1, 1] [1, 1] —— 同一个列表！
print(demo())                     # [1, 1, 1]

def demo_safe(acc=None):
    if acc is None:
        acc = []
    acc.append(1)
    return acc

print(demo_safe(), demo_safe())   # [1] [1] —— 各自独立

# 解包传递：配置字典直接铺开成关键字参数
cfg = {"drop_negative": False, "scale": 2.0}
print(clean_prices([10, -2], **cfg))
\`\`\`

预期输出依次见注释；最后一行 \`**cfg\` 把字典解包成关键字参数——**配置对象转函数调用**的日常桥梁。**常见错误**：默认值用 \`[]\`/\`{}\`/\`set()\`（一律 None 哨兵）；\`*args\` 当万能签名（丢失可读性，IDE 无法提示）；返回 None 表示失败（应抛异常或返回哨兵值）。

## 常见误区

1. **默认参数每次调用新建**——def 时创建一次，可变默认值跨调用共享；
2. **参数越多家越好**——超过 5 个考虑打包成 dataclass/字典（l-5-5）；
3. **函数内修改传入的可变参数**——副作用污染调用方（要么文档声明，要么复制后改）；
4. **注解只是装饰**——IDE/mypy 用它做静态检查，是大型项目的第一道防线。

## 知识关联

- **向前**：l-1-1 的对象模型解释本节唯一大坑；第 2 章容器是默认值的主角；
- **向后**：l-3-4 作用域讲函数内的名字从哪来；lambda（l-3-5）是无名函数；
- **平行**：Pandas 的 \`fillna(value=..., inplace=...)\` 签名就是四类参数的工业示范。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 四类参数 | 位置/关键字/默认/可变收集，顺序固定 |
| 头号陷阱 | 可变默认值 def 时求值一次、跨调用共享——None 哨兵 |
| 解包 | \`f(*lst)\`、\`f(**dict)\` 双向桥梁 |
| 签名 | 注解 + docstring = 自解释函数 |

## 参考资料

> **来源类型：官方文档**
> - Python 教程 §4.8 "More on Defining Functions"（默认参数求值时机、*args/**kwargs）。
> - FAQ "Why are default values shared between objects?"——陷阱的官方解释。
>
> **来源类型：原创**
> - 清洗函数案例与陷阱现场为本课程改编。
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
## 学习目标

学完本节，你应该能够：
1. 用 LEGB 规则判断一个名字解析到哪一层（Local→Enclosing→Global→Built-in）；
2. 写出闭包的识别条件（内层函数 + 引用外层变量 + 返回内层函数）并手写一个计数器；
3. 用生成器函数（yield）处理"放不进内存的大文件"，解释惰性求值的省内存机制。

## 前置知识

- 函数定义与调用（l-3-3）；
- 迭代器协议的直觉（for 就是不断 next）。

## 问题背景：函数不是孤岛

函数内读名字、内层函数捕获外层变量、全局配置被谁改了——这些问题的裁判规则叫 **LEGB**。而"数据处理放不进内存"是数据科学的日常：10GB 日志只想逐行统计——生成器让"处理流程"与"数据全量驻留"解耦。闭包与生成器是 Python 进阶的分水岭：装饰器（工程课）、流式处理都从这里出发。

## 核心概念一：LEGB 作用域

名字查找顺序 **L→E→G→B**：函数内 → 外层函数 → 模块全局 → 内置。要点：
- **赋值即局部**：函数内 \`x = 1\` 让 x 成为局部（哪怕外层有同名）；
- 要在函数内**改**全局/外层变量：\`global x\` / \`nonlocal x\` 显式声明（写出来的意图比隐式坑好）；
- 循环变量泄漏：for 的变量在循环后仍可见（Python 无块级作用域）。

## 核心概念二：闭包

闭包 = 内层函数 + 捕获的外层环境。识别三条件：嵌套函数、内层引用外层变量、外层返回内层。捕获的是**变量（绑定）而非值**——这是理解"循环里建闭包全拿到同一个值"类经典坑的钥匙：

\`\`\`python
def make_counter():
    count = 0
    def inc():
        nonlocal count          # 要修改外层绑定
        count += 1
        return count
    return inc

c = make_counter()
print(c(), c(), c())            # 1 2 3 —— inc 记住了自己的 count
\`\`\`

## 核心概念三：生成器（yield）

函数体含 \`yield\` 即为生成器函数：调用它**不执行函数体**，返回生成器对象；每次 \`next\` 执行到下一个 yield 暂停并交出值，**局部状态完整保留**：

\`\`\`python
def read_big(path):
    with open(path, encoding="utf-8") as f:
        for line in f:          # 文件对象本身也是惰性迭代器
            yield line.strip()

total = sum(1 for line in read_big("huge.log") if "ERROR" in line)
\`\`\`

任意大的日志只占一行内存。生成器表达式 \`(x*x for x in data)\` 是它的匿名形态；与列表推导式的唯一区别是 \`[...]\` 立即物化、\`(...)\` 惰性产出。

## 代码实践

\`\`\`python
# LEGB 演示
x = "global"
def outer():
    x = "enclosing"
    def inner():
        x = "local"
        print("L:", x)
    inner(); print("E:", x)
outer(); print("G:", x)

# 闭包工厂：按倍率生成定制函数
def multiplier(n):
    return lambda v: v * n       # lambda 捕获 n
dbl, tpl = multiplier(2), multiplier(3)
print(dbl(10), tpl(10))          # 20 30 —— 各自的 n 互不干扰

# 生成器 vs 列表：内存对比
import sys
big_list = [x * x for x in range(100_000)]
big_gen  = (x * x for x in range(100_000))
print(f"list {sys.getsizeof(big_list)/1e6:.1f}MB vs gen {sys.getsizeof(big_gen)}B")
print(sum(big_gen))              # 333328333350000
\`\`\`

预期输出：\`L: local / E: enclosing / G: global\`；\`20 30\`；列表约 0.8MB vs 生成器约 208 字节——**同一数据，内存相差近四千倍**（生成器只存状态不存元素）。**常见错误**：函数内改全局忘 \`global\`（UnboundLocalError）；循环建闭包捕获循环变量（全部拿到末值——用默认参数 \`lambda v, i=i:\` 固化）；生成器只能消费一次（耗尽后再 next 抛 StopIteration）。

## 常见误区

1. **闭包捕获的是"值"**——捕获的是变量绑定；循环变量结束后统一等于末值；
2. **生成器当列表反复用**——一次性，要复用先 \`list()\` 或重建；
3. **global 满天飞**——函数间传参优于全局可变状态；
4. **yield 与 return 混淆**——return 在生成器里表示终止（可携带返回值进 StopIteration.value）。

## 知识关联

- **向前**：l-1-1 名字绑定是 LEGB 的原子；l-3-3 的函数对象是闭包的载体；
- **向后**：装饰器 = "接收函数返回函数"的闭包（工程课）；itertools（l-5-2）组合生成器；
- **平行**：Pandas 的 chunksize 读取、Dask 的惰性图都是生成器思想的大数据版。

## 本节总结

| 概念 | 一句话 |
| --- | --- |
| LEGB | 名字查找 L→E→G→B；赋值即局部，改外层要声明 |
| 闭包 | 内层函数捕获外层绑定；捕获变量非值 |
| 生成器 | yield 暂停/恢复，惰性产出，一次消费 |
| 内存 | 生成器只存状态：百 KB 级差异实测 |

## 参考资料

> **来源类型：官方文档**
> - Python 教程 §9.2 "Python Scopes and Namespaces"（LEGB 权威表述）、§9.10 "Generators"。
> - PEP 227 / 3104（nonlocal）——作用域语义的演进文档。
>
> **来源类型：权威教材**
> - Ramalho, *Fluent Python*（2nd ed., 2022）Ch.7 "Closures and Decorators"。
>
> **来源类型：原创**
> - LEGB 演示与内存对比为本课程改编。
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