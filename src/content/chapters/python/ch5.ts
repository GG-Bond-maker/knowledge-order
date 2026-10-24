import type { Chapter } from '../../../types';

/* ============================================================
 *  第 5 章：推导式、迭代器与常用标准库
 * ============================================================ */

const ch5: Omit<Chapter, 'courseId' | 'order'> = {
  id: 'python-5',
  title: '推导式、迭代器与常用标准库',
  goal: '熟练使用推导式与内置函数完成数据变换与聚合，掌握 itertools / collections / functools 中的高频工具，并了解模块与包的导入机制。',
  lessons: [
    {
      id: 'py-l-5-1',
      title: '推导式：列表、字典、集合与生成器',
      content: `
### 学习目标

学完本节，你应该能够：
1. 写出列表/字典/集合/生成器四种推导式并加上过滤条件；
2. 判断何时应退回普通 for（多步逻辑、带副作用、嵌套过深）；
3. 用生成器表达式替代临时列表完成一次惰性聚合（sum/any/all）。

### 前置知识

- l2 的四种容器与 l3 的函数调用。

### 问题背景

同样是分组计数，手写 for 循环十行，Counter 一行且更快；同样是缓存计算，lru_cache一个装饰器把指数级递归压成线性。标准库与推导式是「Pythonic」的分界线：它们把数据处理的常见动作变成公认的短语，代码短一半、快一截、审查者一眼懂。模块与导入机制则是这一切的组织方式——不懂 sys.modules 与搜索路径，就看不懂循环导入与 __main__ 之谜。

### 直觉理解

推导式是「一行印章」：一个方括号把「变换+过滤」压成一句话印出一整个容器。collections 是自动柜台：Counter 自动点数、defaultdict 自动开户、deque 两端快进快出；itertools 是迭代器工具箱，groupby 认准「相邻相同」才分组。lru_cache 给函数贴上便签「算过的直接抄」，partial 是「预设参数的模具」，import 是先查自家书架（sys.modules）再去图书馆（搜索路径）借书登记。

### 核心概念与原理详解

## 四种推导式

\`\`\`python
# 列表推导式
squares = [x * x for x in range(5)]              # [0, 1, 4, 9, 16]

# 带条件过滤
evens = [x for x in range(10) if x % 2 == 0]

# 条件表达式（if-else 要写在前面）
labels = ["偶" if x % 2 == 0 else "奇" for x in range(4)]

# 嵌套推导（注意顺序：外层在前）
pairs = [(i, j) for i in range(2) for j in range(2)]
# [(0,0), (0,1), (1,0), (1,1)]

# 字典推导式
lengths = {w: len(w) for w in ["a", "bb", "ccc"]}

# 集合推导式
unique_initials = {w[0] for w in ["apple", "avocado", "banana"]}

# 生成器表达式（惰性，用圆括号）
total = sum(x * x for x in range(1_000_000))
\`\`\`

## 命名习惯与可读性边界

- 推导式适合**单层、逻辑简单**的转换；超过两层嵌套或带复杂条件的，应拆成循环。
- 不要用推导式产生**副作用**（如往外部列表 append），推导式是为了"表达值"。

## 性能对比

| 写法 | 相对耗时 | 说明 |
| --- | --- | --- |
| 列表推导式 | 1x | 最快，在 C 层循环 |
| \`list(map(f, seq))\` | 约 1x | 调用现有函数时略快 |
| 普通 for + append | 约 1.5~2x | 每次查找 append 方法 |
| 生成器表达式 + sum | 内存最优 | 不建中间列表 |

## 常用聚合与变换函数

\`\`\`python
values = [3, 7, 2, 9, 5]

sum(values)                    # 26
max(values), min(values)       # 9, 2
sorted(values, reverse=True)   # [9, 7, 5, 3, 2]
len(values)                    # 5

all(v > 0 for v in values)     # True：是否全部为正
any(v > 8 for v in values)     # True：是否存在大于 8

list(enumerate(["a", "b"]))    # [(0, 'a'), (1, 'b')]
list(zip([1, 2], ["x", "y"]))  # [(1, 'x'), (2, 'y')]
list(reversed(values))         # [5, 9, 2, 7, 3]

# 按 key 取极值
records = [{"n": "A", "v": 3}, {"n": "B", "v": 9}]
max(records, key=lambda r: r["v"])["n"]    # 'B'
\`\`\`

## 分组的正确姿势

\`groupby\` 只能对**相邻**的相同键分组，使用前必须先排序：

\`\`\`python
from itertools import groupby

data = [("北京", 10), ("上海", 5), ("北京", 3)]
data_sorted = sorted(data, key=lambda x: x[0])
for city, group in groupby(data_sorted, key=lambda x: x[0]):
    print(city, list(group))
\`\`\`

> 日常分析请优先用 \`collections.defaultdict(list)\` 或 \`pandas.groupby\`，\`itertools.groupby\` 只在处理已排序流（如按时间排序的日志）时有优势。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
from collections import Counter, defaultdict, deque
from itertools import groupby
from functools import lru_cache, partial, reduce
import operator

# ---- 1. 四种推导式 ----
xs = [3, 1, 4, 1, 5, 9, 2, 6]
print([x * x for x in xs if x > 2])
print({x: x * x for x in xs})
print({x % 3 for x in xs})
gen = (x for x in xs if x % 2)
print(next(gen), next(gen), sum(gen))

# ---- 2. collections 三件套 ----
words = ["apple", "pear", "apple", "fig", "pear", "apple"]
print(Counter(words).most_common(2))
dd = defaultdict(list)
for w in words:
    dd[len(w)].append(w)
print(dict(dd))
dq = deque([1, 2, 3], maxlen=3)
dq.append(4)
print(list(dq))

# ---- 3. groupby 只认相邻 ----
rows = [("a", 1), ("a", 2), ("b", 3), ("a", 4)]
print({k: [v for _, v in g] for k, g in groupby(rows, key=lambda r: r[0])})
print("未排序的 a 有两组 -> 先 sorted 再 groupby:",
      {k: [v for _, v in g] for k, g in groupby(sorted(rows), key=lambda r: r[0])})

# ---- 4. functools / operator ----
@lru_cache(maxsize=None)
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)
print("fib(120) =", int(fib(120)), f"（位数 {len(str(int(fib(120))))}，装饰器下瞬时完成）")
print(reduce(operator.add, [1, 2, 3, 4], 0))
pow2 = partial(operator.pow, 2)
print(pow2(10), sorted([(2, "b"), (1, "a")], key=operator.itemgetter(0)))\`\`\`

预期输出（实测）：[9, 16, 25, 81, 36]；{3: 9, 1: 1, ...}（字典推导去重保后）；{0, 1, 2}；生成器 3 1 15；Counter.most_common(2)=[('apple', 3), ('pear', 2)]；defaultdict 分组 {5: [apple×3], 4: [pear×2], 3: [fig]}；deque(maxlen=3) 后 [2, 3, 4]；未排序 groupby 只剩 {'a': [4], 'b': [3]}（前两组被吞！）而先 sorted 得 {'a': [1,2,4], 'b': [3]}；fib(120)=5358...840（25 位，装饰器下瞬时）；reduce=10；partial 1024；itemgetter 排序 [(1,'a'),(2,'b')]

**常见错误**：推导式里做带副作用的操作（写文件/改外部变量），一行印章变成陷阱；groupby 忘了先按 key 排序，同组被切成多段；lru_cache 缓存了可变参数（list/dict）直接 TypeError，或缓存了随时间变化的函数导致脏读。

### 常见误区

1. **推导式只是更短的 for**——它是独立作用域的表达式，循环变量不泄漏，且构造专用字节码更快；\\n2. **defaultdict 访问不存在的键会报错**——它自动创建默认值并写入（这正是它和 dict.get 的区别，也常制造脏数据）；\\n3. **import 只是找文件**——它是 sys.modules 缓存查询 + 搜索路径查找 + 执行模块顶层代码三步，循环导入卡在第三步。

### 知识关联

- **向前**：l2 容器与 l3 函数是推导式与装饰器的语法基础；
- **向后**：l6 项目的解析/聚合/报告三阶段由本节工具串成；
- **平行**：pandas 的 groupby.agg 与 Counter/itertools.groupby 是同一思想的两层封装。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 推导式 | 列表/字典/集合/生成器四形态；带过滤；独立作用域 |
| collections | Counter 点数、defaultdict 分组、deque 双端队列 |
| itertools | groupby 只认相邻，先排序；islice/chunk 迭代器常备 |
| functools | lru_cache 记忆化、partial 预设参数、reduce 归约 |
| 导入 | sys.modules 缓存 → 搜索路径 → 执行顶层代码 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Python 官方文档 collections/itertools/functools 模块与 PEP 328 相应章节）
`,
      tips: [
        {
          kind: 'pitfall',
          text: '推导式中的变量会泄漏到外层作用域（Python 3 中列表推导式有独立作用域，但生成器/循环变量行为不同），不要复用同名变量，容易造成意外覆盖。',
        },
        {
          kind: 'performance',
          text: '`sum([f(x) for x in data])` 会先建完整列表；写成 `sum(f(x) for x in data)` 可省掉中间列表，大数据量下内存差一个量级。',
        },
        {
          kind: 'leak',
          text: '嵌套推导式超过两层时，用 `for` 循环 + 有意义的中间变量命名，维护成本会低得多。可读性优先于一行写完。',
        },
      ],
      demos: [
        {
          title: '四种推导式实战',
          lang: 'python',
          code: `orders = [
    {"city": "北京", "amount": 320, "status": "已完成"},
    {"city": "上海", "amount": 150, "status": "已完成"},
    {"city": "北京", "amount": 88, "status": "已取消"},
    {"city": "广州", "amount": 420, "status": "已完成"},
]

# 过滤有效订单并取金额
valid_amounts = [o["amount"] for o in orders if o["status"] == "已完成"]
print("有效金额:", valid_amounts)

# 字典推导：城市 → 金额
city_map = {o["city"]: o["amount"] for o in orders}
print("城市映射:", city_map)

# 集合推导：出现过的城市
cities = {o["city"] for o in orders}
print("城市集合:", cities)

# 生成器：不建中间列表
avg = sum(o["amount"] for o in orders) / len(orders)
print(f"平均金额: {avg:.2f}")`,
        },
        {
          title: 'any / all / max(key) / groupby',
          lang: 'python',
          code: `from itertools import groupby

scores = [88, 92, 45, 78]
print("全部及格?", all(s >= 60 for s in scores))
print("有人不及格?", any(s < 60 for s in scores))

records = [{"name": "A", "v": 3}, {"name": "B", "v": 9}, {"name": "C", "v": 6}]
print("最高分:", max(records, key=lambda r: r["v"]))

sales = [("北京", 10), ("北京", 5), ("上海", 7), ("上海", 9), ("北京", 2)]
print("\\ngroupby 必须先排序：")
for city, grp in groupby(sorted(sales), key=lambda x: x[0]):
    print(" ", city, list(grp))`,
        },
      ],
    },
    {
      id: 'py-l-5-2',
      title: 'collections 与 itertools 高频工具',
      content: `
### 学习目标

学完本节，你应该能够：
1. 用 Counter 完成计数与 most_common，用 defaultdict(list) 完成分组；
2. 解释 itertools.groupby「只认相邻」的契约并写出先排序的规范用法；
3. 用 deque 固定窗口维护「最近 N 条」并在 random 场景设种子保证可复现。

### 前置知识

- l5-1 的推导式与生成器；
- l2-3/l2-4 的字典与集合。

### 问题背景

同样是分组计数，手写 for 循环十行，Counter 一行且更快；同样是缓存计算，lru_cache一个装饰器把指数级递归压成线性。标准库与推导式是「Pythonic」的分界线：它们把数据处理的常见动作变成公认的短语，代码短一半、快一截、审查者一眼懂。模块与导入机制则是这一切的组织方式——不懂 sys.modules 与搜索路径，就看不懂循环导入与 __main__ 之谜。

### 直觉理解

推导式是「一行印章」：一个方括号把「变换+过滤」压成一句话印出一整个容器。collections 是自动柜台：Counter 自动点数、defaultdict 自动开户、deque 两端快进快出；itertools 是迭代器工具箱，groupby 认准「相邻相同」才分组。lru_cache 给函数贴上便签「算过的直接抄」，partial 是「预设参数的模具」，import 是先查自家书架（sys.modules）再去图书馆（搜索路径）借书登记。

### 核心概念与原理详解

## collections 模块

| 工具 | 用途 | 示例 |
| --- | --- | --- |
| \`Counter\` | 计数 | \`Counter(words).most_common(3)\` |
| \`defaultdict\` | 带默认值的字典 | \`dd = defaultdict(list)\` |
| \`OrderedDict\` | 显式保证顺序（3.7+ 普通 dict 已保序，基本不需要） | — |
| \`namedtuple\` | 轻量不可变记录 | \`Point = namedtuple("Point", "x y")\` |
| \`deque\` | 双端队列 | \`dq.appendleft(x)\`（O(1)） |

\`\`\`python
from collections import Counter, defaultdict, deque

Counter("hello").most_common(2)      # [('l', 2), ('h', 1)]

groups = defaultdict(list)
for city, amt in data:
    groups[city].append(amt)

dq = deque(maxlen=3)      # 天然滑动窗口：满了自动挤出最旧的
for x in [1, 2, 3, 4, 5]:
    dq.append(x)
print(list(dq))            # [3, 4, 5]
\`\`\`

> \`deque(maxlen=n)\` 是实现**滑动平均、最近 N 条记录**最简洁的结构，比手动 pop(0) 快且不会写错。

## itertools 常用函数

\`\`\`python
from itertools import (
    chain, product, combinations, permutations, count, cycle, islice, accumulate
)

list(chain([1, 2], [3], [4]))              # [1, 2, 3, 4]  合并多个可迭代对象
list(product("ab", [1, 2]))                # [('a',1),('a',2),('b',1),('b',2)] 笛卡尔积
list(combinations([1, 2, 3], 2))           # [(1,2),(1,3),(2,3)]  组合
list(permutations([1, 2, 3], 2))           # 排列（有序）
list(accumulate([1, 2, 3, 4]))             # [1, 3, 6, 10]  累积和
list(islice(count(10, 5), 3))              # [10, 15, 20]  切片无限迭代器
\`\`\`

**典型用途**：\`product\` 生成参数组合网格（超参搜索）；\`combinations\` 做字段两两相关性检验；\`chain\` 把多个文件的行合并成一个流。

## functools

\`\`\`python
from functools import lru_cache, partial, reduce, cmp_to_key

@lru_cache(maxsize=None)        # 记忆化：相同参数只计算一次
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)

add_vat = partial(lambda amount, rate: amount * (1 + rate), rate=0.13)
add_vat(100)                    # 113.0

reduce(lambda acc, x: acc + x, [1, 2, 3, 4])   # 10（一般用 sum 替代）
\`\`\`

**重要**：\`lru_cache\` 要求参数可哈希，所以不能直接用于 \`list\` 或 \`DataFrame\` 参数。做数据分析时，若某步"读取 + 清洗"耗时很长，可以把它做成"输入路径 → 输出 DataFrame"的缓存函数。

## random 与可复现性

\`\`\`python
import random
random.seed(42)          # 固定随机种子，保证结果可复现
random.sample(range(100), 5)     # 无放回抽样
random.choices(items, weights=w, k=10)  # 有放回加权抽样
\`\`\`

> 数据分析中凡是涉及随机（采样、交叉验证、随机数生成），都应在开头固定 seed，否则结果无法复现、问题无法排查。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
from collections import Counter, defaultdict, deque
from itertools import groupby
from functools import lru_cache, partial, reduce
import operator

# ---- 1. 四种推导式 ----
xs = [3, 1, 4, 1, 5, 9, 2, 6]
print([x * x for x in xs if x > 2])
print({x: x * x for x in xs})
print({x % 3 for x in xs})
gen = (x for x in xs if x % 2)
print(next(gen), next(gen), sum(gen))

# ---- 2. collections 三件套 ----
words = ["apple", "pear", "apple", "fig", "pear", "apple"]
print(Counter(words).most_common(2))
dd = defaultdict(list)
for w in words:
    dd[len(w)].append(w)
print(dict(dd))
dq = deque([1, 2, 3], maxlen=3)
dq.append(4)
print(list(dq))

# ---- 3. groupby 只认相邻 ----
rows = [("a", 1), ("a", 2), ("b", 3), ("a", 4)]
print({k: [v for _, v in g] for k, g in groupby(rows, key=lambda r: r[0])})
print("未排序的 a 有两组 -> 先 sorted 再 groupby:",
      {k: [v for _, v in g] for k, g in groupby(sorted(rows), key=lambda r: r[0])})

# ---- 4. functools / operator ----
@lru_cache(maxsize=None)
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)
print("fib(120) =", int(fib(120)), f"（位数 {len(str(int(fib(120))))}，装饰器下瞬时完成）")
print(reduce(operator.add, [1, 2, 3, 4], 0))
pow2 = partial(operator.pow, 2)
print(pow2(10), sorted([(2, "b"), (1, "a")], key=operator.itemgetter(0)))\`\`\`

预期输出（实测）：[9, 16, 25, 81, 36]；{3: 9, 1: 1, ...}（字典推导去重保后）；{0, 1, 2}；生成器 3 1 15；Counter.most_common(2)=[('apple', 3), ('pear', 2)]；defaultdict 分组 {5: [apple×3], 4: [pear×2], 3: [fig]}；deque(maxlen=3) 后 [2, 3, 4]；未排序 groupby 只剩 {'a': [4], 'b': [3]}（前两组被吞！）而先 sorted 得 {'a': [1,2,4], 'b': [3]}；fib(120)=5358...840（25 位，装饰器下瞬时）；reduce=10；partial 1024；itemgetter 排序 [(1,'a'),(2,'b')]

**常见错误**：推导式里做带副作用的操作（写文件/改外部变量），一行印章变成陷阱；groupby 忘了先按 key 排序，同组被切成多段；lru_cache 缓存了可变参数（list/dict）直接 TypeError，或缓存了随时间变化的函数导致脏读。

### 常见误区

1. **推导式只是更短的 for**——它是独立作用域的表达式，循环变量不泄漏，且构造专用字节码更快；\\n2. **defaultdict 访问不存在的键会报错**——它自动创建默认值并写入（这正是它和 dict.get 的区别，也常制造脏数据）；\\n3. **import 只是找文件**——它是 sys.modules 缓存查询 + 搜索路径查找 + 执行模块顶层代码三步，循环导入卡在第三步。

### 知识关联

- **向前**：l2 容器与 l3 函数是推导式与装饰器的语法基础；
- **向后**：l6 项目的解析/聚合/报告三阶段由本节工具串成；
- **平行**：pandas 的 groupby.agg 与 Counter/itertools.groupby 是同一思想的两层封装。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 推导式 | 列表/字典/集合/生成器四形态；带过滤；独立作用域 |
| collections | Counter 点数、defaultdict 分组、deque 双端队列 |
| itertools | groupby 只认相邻，先排序；islice/chunk 迭代器常备 |
| functools | lru_cache 记忆化、partial 预设参数、reduce 归约 |
| 导入 | sys.modules 缓存 → 搜索路径 → 执行顶层代码 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Python 官方文档 collections/itertools/functools 模块与 PEP 328 相应章节）
`,
      tips: [
        {
          kind: 'leak',
          text: '固定随机种子（`random.seed`、`np.random.default_rng(42)`）是数据分析脚本的基本纪律，尤其在抽样验证与建模时。',
        },
        {
          kind: 'performance',
          text: '`lru_cache` 的缓存会占用内存，长驻服务里应设置 `maxsize`，并注意缓存参数是可哈希的。',
        },
        {
          kind: 'pitfall',
          text: '`deque(maxlen=n)` 满了之后 `append` 会自动丢弃最左侧元素，不会报错，这既是特性也是隐患：如果没意识到，你会在无提示的情况下丢数据。',
        },
      ],
      demos: [
        {
          title: 'Counter / defaultdict / deque',
          lang: 'python',
          code: `from collections import Counter, defaultdict, deque

logs = ["error", "info", "info", "warn", "error", "error"]
print("日志级别统计:", Counter(logs).most_common())

events = [("北京", "点击"), ("上海", "购买"), ("北京", "购买"), ("北京", "点击")]
by_city = defaultdict(lambda: Counter())
for city, e in events:
    by_city[city][e] += 1
print("城市事件:", dict(by_city))

# 滑动窗口：最近 3 天销售额
dq = deque(maxlen=3)
for day, amt in [("D1", 100), ("D2", 120), ("D3", 90), ("D4", 150)]:
    dq.append(amt)
    print(f"  {day}: 最近3天 = {list(dq)} 平均 = {sum(dq)/len(dq):.1f}")`,
        },
        {
          title: 'itertools 与 lru_cache',
          lang: 'python',
          code: `from itertools import product, combinations, accumulate, chain
from functools import lru_cache
import time

print("参数网格:", list(product([0.1, 0.3], [16, 32])))
print("两两组合:", list(combinations(["价格", "销量", "评分"], 2)))
print("累计和:", list(accumulate([100, 120, 90])))
print("合并流:", list(chain("ab", [1, 2])))

calls = 0
@lru_cache(maxsize=None)
def slow_square(n):
    global calls
    calls += 1
    time.sleep(0.001)
    return n * n

for n in [3, 3, 4, 3, 4]:
    slow_square(n)
print(f"\\n实际计算次数: {calls}（调用了 5 次，去重后仅 2 次）")`,
        },
      ],
    },
    {
      id: 'py-l-5-3',
      title: '模块、包与导入机制',
      content: `
### 学习目标

学完本节，你应该能够：
1. 区分 import 的四种形式及各自对命名空间的污染面；
2. 复述导入三步（sys.modules 缓存→搜索路径→执行顶层代码）并解释循环导入的成因；
3. 用 if __name__ == '__main__' 隔离脚本入口，并说明相对导入为何只能在包内使用。

### 前置知识

- l3 的函数定义；
- l5-1/l5-2 的标准库使用经验。

### 问题背景

同样是分组计数，手写 for 循环十行，Counter 一行且更快；同样是缓存计算，lru_cache一个装饰器把指数级递归压成线性。标准库与推导式是「Pythonic」的分界线：它们把数据处理的常见动作变成公认的短语，代码短一半、快一截、审查者一眼懂。模块与导入机制则是这一切的组织方式——不懂 sys.modules 与搜索路径，就看不懂循环导入与 __main__ 之谜。

### 直觉理解

推导式是「一行印章」：一个方括号把「变换+过滤」压成一句话印出一整个容器。collections 是自动柜台：Counter 自动点数、defaultdict 自动开户、deque 两端快进快出；itertools 是迭代器工具箱，groupby 认准「相邻相同」才分组。lru_cache 给函数贴上便签「算过的直接抄」，partial 是「预设参数的模具」，import 是先查自家书架（sys.modules）再去图书馆（搜索路径）借书登记。

### 核心概念与原理详解

## 导入的几种形式

\`\`\`python
import math                      # 导入模块
import numpy as np               # 常用别名
from datetime import date, timedelta   # 导入具体名字
from pathlib import Path
from collections import Counter as C   # 重命名
\`\`\`

**实践建议**：不要用 \`from module import *\`，它会污染命名空间、覆盖同名变量，且让代码的依赖来源变得难以追溯。

## import 时发生了什么

1. 在 \`sys.modules\` 中查找是否已加载 → 已加载则直接复用（**模块只执行一次**）；
2. 否则按 \`sys.path\` 顺序查找对应文件；
3. 执行模块顶层代码，把结果放入 \`sys.modules\`。

因此**模块顶层的代码会在导入时执行**，耗时操作（读大文件、连数据库）不应放在顶层。

## \`if __name__ == "__main__"\`

\`\`\`python
def analyze():
    ...

if __name__ == "__main__":
    analyze()
\`\`\`

- 直接运行该文件时 \`__name__\` 为 \`"__main__"\`，会执行；
- 被别的文件 import 时 \`__name__\` 是模块名，不会执行。

这是脚本既可以"当脚本运行"又可以"当库被导入"的标准写法。

## 绝对导入与相对导入

\`\`\`python
from myproject.utils.io import read_csv      # 绝对导入，推荐
from .utils import read_csv                  # 相对导入，仅限包内部使用
\`\`\`

## 包的结构

\`\`\`
myproject/
├── __init__.py       # 包初始化（可留空）
├── utils/
│   ├── __init__.py
│   └── io.py
└── main.py
\`\`\`

## 项目结构建议（数据分析项目）

\`\`\`
project/
├── data/             # 原始数据（只读，不手动改）
│   ├── raw/
│   └── processed/
├── notebooks/        # 探索性分析
├── src/              # 可复用的数据处理代码
├── tests/            # 单元测试
├── requirements.txt
└── README.md
\`\`\`

**核心原则**：notebook 用来探索，**稳定的逻辑要沉淀为 src 下的函数并写测试**，否则分析结论无法复现、无法复用。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
from collections import Counter, defaultdict, deque
from itertools import groupby
from functools import lru_cache, partial, reduce
import operator

# ---- 1. 四种推导式 ----
xs = [3, 1, 4, 1, 5, 9, 2, 6]
print([x * x for x in xs if x > 2])
print({x: x * x for x in xs})
print({x % 3 for x in xs})
gen = (x for x in xs if x % 2)
print(next(gen), next(gen), sum(gen))

# ---- 2. collections 三件套 ----
words = ["apple", "pear", "apple", "fig", "pear", "apple"]
print(Counter(words).most_common(2))
dd = defaultdict(list)
for w in words:
    dd[len(w)].append(w)
print(dict(dd))
dq = deque([1, 2, 3], maxlen=3)
dq.append(4)
print(list(dq))

# ---- 3. groupby 只认相邻 ----
rows = [("a", 1), ("a", 2), ("b", 3), ("a", 4)]
print({k: [v for _, v in g] for k, g in groupby(rows, key=lambda r: r[0])})
print("未排序的 a 有两组 -> 先 sorted 再 groupby:",
      {k: [v for _, v in g] for k, g in groupby(sorted(rows), key=lambda r: r[0])})

# ---- 4. functools / operator ----
@lru_cache(maxsize=None)
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)
print("fib(120) =", int(fib(120)), f"（位数 {len(str(int(fib(120))))}，装饰器下瞬时完成）")
print(reduce(operator.add, [1, 2, 3, 4], 0))
pow2 = partial(operator.pow, 2)
print(pow2(10), sorted([(2, "b"), (1, "a")], key=operator.itemgetter(0)))\`\`\`

预期输出（实测）：[9, 16, 25, 81, 36]；{3: 9, 1: 1, ...}（字典推导去重保后）；{0, 1, 2}；生成器 3 1 15；Counter.most_common(2)=[('apple', 3), ('pear', 2)]；defaultdict 分组 {5: [apple×3], 4: [pear×2], 3: [fig]}；deque(maxlen=3) 后 [2, 3, 4]；未排序 groupby 只剩 {'a': [4], 'b': [3]}（前两组被吞！）而先 sorted 得 {'a': [1,2,4], 'b': [3]}；fib(120)=5358...840（25 位，装饰器下瞬时）；reduce=10；partial 1024；itemgetter 排序 [(1,'a'),(2,'b')]

**常见错误**：推导式里做带副作用的操作（写文件/改外部变量），一行印章变成陷阱；groupby 忘了先按 key 排序，同组被切成多段；lru_cache 缓存了可变参数（list/dict）直接 TypeError，或缓存了随时间变化的函数导致脏读。

### 常见误区

1. **推导式只是更短的 for**——它是独立作用域的表达式，循环变量不泄漏，且构造专用字节码更快；\\n2. **defaultdict 访问不存在的键会报错**——它自动创建默认值并写入（这正是它和 dict.get 的区别，也常制造脏数据）；\\n3. **import 只是找文件**——它是 sys.modules 缓存查询 + 搜索路径查找 + 执行模块顶层代码三步，循环导入卡在第三步。

### 知识关联

- **向前**：l2 容器与 l3 函数是推导式与装饰器的语法基础；
- **向后**：l6 项目的解析/聚合/报告三阶段由本节工具串成；
- **平行**：pandas 的 groupby.agg 与 Counter/itertools.groupby 是同一思想的两层封装。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 推导式 | 列表/字典/集合/生成器四形态；带过滤；独立作用域 |
| collections | Counter 点数、defaultdict 分组、deque 双端队列 |
| itertools | groupby 只认相邻，先排序；islice/chunk 迭代器常备 |
| functools | lru_cache 记忆化、partial 预设参数、reduce 归约 |
| 导入 | sys.modules 缓存 → 搜索路径 → 执行顶层代码 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Python 官方文档 collections/itertools/functools 模块与 PEP 328 相应章节）
`,
      tips: [
        {
          kind: 'pitfall',
          text: '把脚本命名为 `random.py`、`csv.py`、`json.py` 会**屏蔽标准库同名模块**，导致 `import random` 导入的是你自己写的文件，引发难以定位的错误。',
        },
        {
          kind: 'leak',
          text: '代码依赖要写进 `requirements.txt`（或 `pyproject.toml`）并固定版本，否则几个月后环境重建时结果会因库版本变化而不同。',
        },
        {
          kind: 'interview',
          text: '`if __name__ == "__main__":` 的作用是常见面试点：让模块既能被导入又能直接执行，避免导入时执行测试代码或启动逻辑。',
        },
      ],
      demos: [
        {
          title: '模块属性与命名空间',
          lang: 'python',
          code: `import math
import sys

print("math 模块文件:", math.__file__ if hasattr(math, "__file__") else "(内置/虚拟)")
print("math.pi =", round(math.pi, 6))
print("math.floor/ceil:", math.floor(3.7), math.ceil(3.2))
print("math.isclose(0.1+0.2, 0.3):", math.isclose(0.1 + 0.2, 0.3))

print("\\n已加载模块数量:", len(sys.modules))
print("本模块 __name__ =", __name__)

import json
print("\\njson 模块别名检查:", json.__name__)`,
        },
        {
          title: '用 datetime 计算日期差',
          lang: 'python',
          code: `from datetime import date, datetime, timedelta

start = date(2024, 1, 1)
end = date(2024, 3, 15)
print("相差天数:", (end - start).days)

now = datetime(2024, 3, 15, 9, 30)
print("加 7 天:", now + timedelta(days=7))
print("格式化:", now.strftime("%Y-%m-%d %H:%M %A"))
print("解析:", datetime.strptime("2024/03/15", "%Y/%m/%d"))

# 计算账期：每月 1 号
first_day = now.replace(day=1)
print("当月第一天:", first_day.date())`,
        },
      ],
    },
  ],
  exercises: [
    {
      id: 'py-5-e1',
      type: 'single',
      difficulty: 1,
      question: '`[x * 2 for x in range(4) if x % 2 == 1]` 的结果是？',
      options: [
        { value: 'A', text: '`[0, 2, 4, 6]`' },
        { value: 'B', text: '`[2, 6]`' },
        { value: 'C', text: '`[1, 3]`' },
        { value: 'D', text: '`[2, 4, 6]`' },
      ],
      answer: 'B',
      explanation: '`range(4)` 为 0,1,2,3；过滤保留奇数 1、3；乘 2 得 `[2, 6]`。',
      tags: ['推导式'],
    },
    {
      id: 'py-5-e1b',
      type: 'fill',
      difficulty: 2,
      question: '统计 `"banana"` 中每个字符出现次数，补全代码：\n\n```python\nfrom collections import ___\nprint(Counter("banana").most_common(1))\n```',
      blanks: [['Counter']],
      explanation: '`Counter` 是专门做频次统计的字典子类，`most_common(n)` 返回出现次数最多的 n 项。',
      tags: ['Counter'],
    },
    {
      id: 'py-5-e2',
      type: 'multiple',
      difficulty: 2,
      question: '关于 `deque(maxlen=3)`，下列说法正确的有？（多选）',
      options: [
        { value: 'A', text: '追加超过 3 个元素时，最左侧的旧元素会自动被移除' },
        { value: 'B', text: '`appendleft` 与 `popleft` 的时间复杂度为 O(1)' },
        { value: 'C', text: '适合实现滑动窗口（如最近 N 天的指标）' },
        { value: 'D', text: '元素被自动丢弃时会抛出异常' },
      ],
      answer: ['A', 'B', 'C'],
      explanation:
        '`deque(maxlen=n)` 满了之后会自动丢弃旧元素且**不报错**。这正是它实现滑动窗口方便的原因，同时也是"静默丢数据"的潜在风险。',
      tags: ['collections'],
    },
    {
      id: 'py-5-e3',
      type: 'code',
      difficulty: 3,
      question:
        '使用推导式完成数据变换：给定 `sales = [(城市, 金额), ...]`，请：\n\n1. 用**列表推导式**过滤出金额 > 100 的订单金额，保存到 `big_amounts`；\n2. 用**字典推导式**把 `{"A": 10, "B": 20, "C": 5}` 转成"消费等级"字典（≥15 为"高"，否则为"低"），保存到 `levels`。',
      starterCode: `sales = [("北京", 320), ("上海", 150), ("广州", 88), ("深圳", 500), ("杭州", 60)]
price_map = {"A": 10, "B": 20, "C": 5}

big_amounts = ___
levels = ___
`,
      setupCode: '',
      expectedOutput: "big_amounts = [320, 150, 500], levels = {'A': '低', 'B': '高', 'C': '低'}",
      tests: `assert big_amounts == [320, 150, 500], f"big_amounts 不正确：{big_amounts}"
assert levels == {"A": "低", "B": "高", "C": "低"}, f"levels 不正确：{levels}"
assert isinstance(big_amounts, list) and isinstance(levels, dict)
`,
      explanation:
        '```python\nbig_amounts = [amt for _, amt in sales if amt > 100]\nlevels = {k: ("高" if v >= 15 else "低") for k, v in price_map.items()}\n```\n\n注意"条件表达式"写在 `for` 前面，而"过滤条件"写在后面，这是推导式最常见的语法混淆点。',
      tags: ['推导式'],
    },
    {
      id: 'py-5-e4',
      type: 'code',
      difficulty: 3,
      question:
        '`itertools.product` 生成参数网格。给定 `learning_rate = [0.1, 0.01]` 与 `max_depth = [3, 5]`，请生成所有组合，保存为**字典列表** `grid`，每个字典形如 `{"lr": 0.1, "depth": 3}`，并按 `lr` 升序（同 lr 时按 depth 升序）排序。',
      starterCode: `from itertools import product

learning_rate = [0.1, 0.01]
max_depth = [3, 5]

grid = ___
`,
      setupCode: '',
      expectedOutput:
        "grid = [{'lr': 0.01, 'depth': 3}, {'lr': 0.01, 'depth': 5}, {'lr': 0.1, 'depth': 3}, {'lr': 0.1, 'depth': 5}]",
      tests: `assert len(grid) == 4, f"应生成 4 个组合，实际 {len(grid)}"
assert grid[0] == {"lr": 0.01, "depth": 3}, f"排序不正确：{grid}"
assert grid[-1] == {"lr": 0.1, "depth": 5}, f"排序不正确：{grid}"
assert all(set(g.keys()) == {"lr", "depth"} for g in grid)
`,
      explanation:
        '```python\ngrid = sorted(\n    ({"lr": lr, "depth": d} for lr, d in product(learning_rate, max_depth)),\n    key=lambda g: (g["lr"], g["depth"]),\n)\n```\n\n`product` 返回的是各列表的笛卡尔积，顺序由输入顺序决定，因此需要显式排序。',
      tags: ['itertools'],
    },
    {
      id: 'py-5-e5',
      type: 'judge',
      difficulty: 2,
      question: '`itertools.groupby` 可以直接把列表中所有相同的键分到同一组，即使它们在列表中并不相邻。',
      answer: false,
      explanation:
        '`groupby` 只对**相邻**的相同键分组。必须先 `sorted(data, key=...)` 再分组，否则同一城市会被拆成多个组。这是一个高频错误。',
      tags: ['itertools'],
    },
    {
      id: 'py-5-e6',
      type: 'fill',
      difficulty: 3,
      question: '用 `functools` 中的装饰器缓存函数结果（记忆化），补全代码：\n\n```python\nfrom functools import ___\n\n@___\ndef fib(n):\n    return n if n < 2 else fib(n - 1) + fib(n - 2)\n```',
      blanks: [['lru_cache']],
      explanation: '`lru_cache` 会将参数 → 返回值缓存起来，相同参数再次调用时直接返回，把指数级递归降为线性。',
      tags: ['functools'],
    },
    {
      id: 'py-5-e7',
      type: 'multiple',
      difficulty: 2,
      question: '下列哪些导入方式是**推荐**的做法？（多选）',
      options: [
        { value: 'A', text: '`import pandas as pd`' },
        { value: 'B', text: '`from math import *`' },
        { value: 'C', text: '`from pathlib import Path`' },
        { value: 'D', text: '`from mypkg.utils import read_csv`（绝对导入）' },
      ],
      answer: ['A', 'C', 'D'],
      explanation:
        '`from module import *` 会污染命名空间、覆盖同名变量，且难以追踪依赖来源，应避免使用。其余三种都是标准推荐写法。',
      tags: ['模块'],
    },
    {
      id: 'py-5-e8',
      type: 'code',
      difficulty: 4,
      question:
        '实现滑动窗口均值：给定 `values = [100, 120, 90, 150, 80, 200]` 与窗口大小 `k = 3`。\n\n请返回一个列表 `out`，第 i 个元素是 `values[i:i+k]`（不足 k 个时取 available 部分）的均值，**保留 2 位小数**。\n\n提示：可使用 `collections.deque(maxlen=k)`。',
      starterCode: `from collections import deque

values = [100, 120, 90, 150, 80, 200]
k = 3

out = ___
`,
      setupCode: '',
      expectedOutput: 'out = [100.0, 110.0, 103.33, 120.0, 106.67, 143.33]',
      tests: `assert len(out) == 6, f"结果长度应为 6，实际 {len(out)}"
assert out[:2] == [100.0, 110.0], f"前两项不正确：{out}"
assert abs(out[2] - 103.33) < 1e-9, f"第三项应为 103.33，实际 {out[2]}"
assert abs(out[-1] - 143.33) < 1e-9, f"最后一项应为 143.33，实际 {out[-1]}"
`,
      explanation:
        '```python\ndq = deque(maxlen=k)\nout = []\nfor v in values:\n    dq.append(v)\n    out.append(round(sum(dq) / len(dq), 2))\n```\n\n`deque(maxlen=k)` 让 `sum(dq)` 始终只覆盖最近 k 个元素，前 k-1 个是"不足窗口"的部分均值。',
      tags: ['deque', '窗口'],
    },
    {
      id: 'py-5-e9',
      type: 'single',
      difficulty: 2,
      question: '`from collections import Counter` 后，`Counter("hello")["z"]` 的返回值是？',
      options: [
        { value: 'A', text: '`KeyError` 异常' },
        { value: 'B', text: '`None`' },
        { value: 'C', text: '`0`' },
        { value: 'D', text: '`1`' },
      ],
      answer: 'C',
      explanation:
        '`Counter` 是 `dict` 的子类，但重写了 \`__missing__\`，访问不存在的键返回 `0` 而不是抛 `KeyError`。这让计数逻辑更安全。',
      tags: ['Counter'],
    },
    {
      id: 'py-5-e10',
      type: 'judge',
      difficulty: 2,
      question: '`if __name__ == "__main__":` 下的代码在被其他模块 `import` 时也会执行。',
      answer: false,
      explanation:
        '被导入时模块的 `__name__` 等于模块名（如 `"utils"`），因此该分支不执行。只有直接运行该脚本时 `__name__` 才等于 `"__main__"`。',
      tags: ['模块'],
    },
    {
      id: 'py-5-e11',
      type: 'open',
      difficulty: 4,
      question:
        '某同学在 `notebooks/analysis.ipynb` 中写了 300 行数据处理代码，每个月手动改几个数字重跑一次，最近发现"上个月和这个月的结论对不上"。请分析这种现象的成因，并给出把分析工作工程化的方案。',
      referenceAnswer: `**成因**：
1. **不可复现**：数据版本、随机种子、库版本、中间结果都被手改或被覆盖，无法确认两次运行输入是否一致；
2. **逻辑分散在 notebook cell 中**：执行顺序依赖人工记忆，同一个 cell 可能被多次运行，状态不确定；
3. **口径无版本管理**：指标定义直接写死在代码里，改动没有记录；
4. **缺少对账**：没有行数/金额守恒校验，错误被下游报告吸收；
5. **临时修补**：为跑通某个数字而手动删行、改值，问题被掩盖。

**工程化方案**：
1. 把稳定的逻辑抽到 \`src/\` 下的函数，notebook 只负责调用与展示；
2. 原始数据落 \`data/raw\` 只读，清洗结果写 \`data/processed\` 并带版本号/日期；
3. 固定随机种子、固定依赖版本（requirements 锁版本）；
4. 关键步骤加**对账断言**（行数、金额合计、空值率），异常即失败；
5. 用 git 管理代码，用单元测试覆盖核心变换，把每次交付的脚本与结果一起归档；
6. 指标口径整理成"指标字典"，变更需评审并记录。

最终目标是：**任何人拿到同一份数据和同一个 commit，都能跑出同样的结果**。`,
      explanation: '本题的核心概念是"可复现性"。回答应围绕三点展开：输入（数据版本）、过程（代码版本 / 执行顺序 / 随机种子）、输出（对账校验）。只答"用 git 管理"是不够的，因为这解决不了数据版本与执行顺序问题。',
      rubric: [
        { point: '指出不可复现是核心问题（数据版本、随机性、库版本）', score: 2 },
        { point: '指出 notebook 执行顺序/状态不确定、逻辑分散', score: 1 },
        { point: '给出逻辑抽离到 src + 单元测试的方案', score: 1 },
        { point: '给出数据版本管理、依赖锁定、种子固定', score: 1 },
        { point: '给出对账断言与指标字典/口径治理', score: 1 },
      ],
      keywords: ['复现', '版本', '种子', '逻辑', '测试', '对账', '口径'],
      tags: ['工程化', '方法论'],
    },
  ],
};

export { ch5 };
