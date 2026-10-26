import type { Chapter } from '../../../types';

/* ============================================================
 *  第 2 章：列表、元组、字典与集合
 * ============================================================ */

const ch2: Omit<Chapter, 'courseId' | 'order'> = {
  id: 'python-2',
  title: '列表、元组、字典与集合',
  goal: '掌握四种内置容器的选取原则与核心操作，能用推导式和字典完成数据统计与转换。',
  lessons: [
    {
      id: 'py-l-2-1',
      title: '列表：增删改查与常用操作',
      content: `
## 学习目标

学完本节，你应该能够：
1. 用"动态数组 + 过度分配"解释为什么尾部 \`append\` 是均摊 O(1) 而头部 \`insert(0, ...)\` 是 O(n)；
2. 背下列表核心操作复杂度表，并据此在数据规模变大前选对结构；
3. 识别"遍历时删除"与"乘法复制嵌套列表"两大经典陷阱并给出正确写法。

## 前置知识

- 第 1 章变量与对象模型（列表是可变对象，\`b = a\` 是别名）；
- 大 O 记号的直觉（n 翻倍、时间翻几倍）即可。

## 问题背景：同一份代码，10 行与 10 万行是两种命运

入门阶段随手 \`insert(0, x)\` 没有任何问题；等数据到十万行、脚本从 1 秒变 1 小时，性能课才补——代价太大。列表是数据分析里使用频率最高的容器，它的复杂度表值得在第一天就贴在脑门上。

## 直觉理解：电影院的预留座位

列表 = 连续座位的放映厅（动态数组）。尾部加座：厅后有空地（**过度分配**的预留容量），坐下即走，O(1)；座位满了才整厅搬迁到更大的厅（O(n)，但摊到此前每次 append 上仍是均摊 O(1)）。头部插入：第一排要进人，**后面所有人全体后挪一位**，O(n)——厅越大越痛苦。

## 核心概念：操作复杂度表

| 操作 | 复杂度 | 说明 |
| --- | --- | --- |
| \`append\` / \`pop()\` | 均摊 O(1) | 尾部操作，预留容量吸收增长 |
| \`insert(0, x)\` / \`pop(0)\` | O(n) | 头部操作，整体搬移 |
| \`x in lst\` / \`index\` / \`count\` | O(n) | 线性扫描（与 set 的 O(1) 对比，见集合一节） |
| \`lst[i]\` 读写 | O(1) | 连续内存 + 偏移寻址 |
| \`sort\` | O(n log n) | Timsort，稳定排序 |
| 切片 \`lst[a:b]\` | O(b−a) | 生成新列表（浅拷贝） |

CPython 的增长策略：容量按约 \`1/8\` 比例过度分配（\`newsize + newsize>>3 + 6\`），所以append 十亿次也只搬迁约几十次。

## 原理详解：为什么头部插入必然 O(n)

连续内存意味着下标 \`i\` 的地址 = 起始地址 + i×元素大小——这是 O(1) 下标访问的代价与前提。要在位置 0 插入，就必须把原 0..n−1 全部右移一格腾位。反过来，若改成链表（头插 O(1)），就失去 O(1) 随机访问与 CPU 缓存亲和性——**没有免费午餐，只有按场景选结构**（\`collections.deque\` 两端 O(1)，正是为头尾频繁操作而生）。

## 完整案例：10 万次头部插入的代价实测

\`\`\`python
from time import perf_counter

n = 100_000
t0 = perf_counter()
head = []
for i in range(n):
    head.insert(0, i)              # 每次全体后挪：O(n²) 总代价
t1 = perf_counter()
tail = []
for i in range(n):
    tail.append(i)                 # 均摊 O(1)：O(n) 总代价
t2 = perf_counter()
print(f"insert(0): {t1-t0:.2f}s   append: {t2-t1:.3f}s   倍数 {(t1-t0)/(t2-t1):.0f}x")
\`\`\`

预期输出（依机器而异）：\`insert(0)\` 约 1–2 秒，\`append\` 约 0.005 秒——**同一数量级的数据，几百倍差距**。正确姿势：尾部追加（最后 \`reverse()\` 一次，O(n)），或直接用 \`deque\`。

## 常见误区

1. **遍历时删除**：\`for x in lst: lst.remove(x)\` 会跳元素。用推导式重建 \`lst[:] = [x for x in lst if cond]\`，或倒序删除。
2. **\`[[0]*3]*3\` 造二维矩阵**——外层乘法复制的是**同一个内层列表的引用**（第 1 章别名问题）：改 \`[0][0]\` 全列变。正确：\`[[0]*3 for _ in range(3)]\`。
3. **把列表当集合查成员**——\`if x in big_list\` 是 O(n)；去重+查询用 \`set\`（下一节对比实测）。
4. **混淆 \`+\` 与 \`extend\`**——\`a + b\` 造新列表 O(n+m)；\`a.extend(b)\` 原地追加，循环里应选后者。

## 知识关联

- **向前**：第 1 章的可变对象模型解释了 append 为什么"原地"；本节的 \`+\` vs \`extend\` 是别名问题的性能面；
- **向后**：字典与集合一节把"查询 O(n)"升级到 O(1)；\`deque\`/\`heapq\` 在第 5 章 collections 专题；
- **平行**：Pandas 的 \`pd.concat\` 频繁调用同样是 O(n²) 型错误，原理一模一样。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 本质 | 动态数组：连续内存 + 约 1/8 过度分配 |
| 尾 O(1) / 头 O(n) | append 均摊 O(1)；insert(0) 触发整体搬移 |
| 查找 O(n) | 成员测试线性扫；高频查询换 set/dict |
| 两大陷阱 | 遍历中删除；\`[x]*n\` 复制的是引用 |

## 参考资料

> **来源类型：官方文档**
> - Python 官方文档 \`list\` 类型页与 \`collections.deque\` 页（docs.python.org）。
> - CPython 源码 \`Objects/listobject.c\` 顶部注释——过度分配策略的第一手出处。
>
> **来源类型：参考资料**
> - wiki.python.org/moin/TimeComplexity —— 各容器操作的官方社区复杂度总表。
>
> **来源类型：原创**
> - 头插/尾插实测脚本与二维矩阵陷阱为本课程改编。
`,
      tips: [
        {
          kind: 'performance',
          text: '`lst.insert(0, x)` 与 `lst.pop(0)` 都是 O(n)。需要频繁在头部操作时使用 `collections.deque`（`appendleft` / `popleft` 为 O(1)）。',
        },
        {
          kind: 'pitfall',
          text: '在 `for` 循环中遍历列表的同时删除元素，会跳过元素。正确做法是遍历副本（`for x in lst[:]`）或倒序遍历，或构造新列表。',
        },
        {
          kind: 'interview',
          text: '`list.sort()` 与 `sorted()` 的区别：前者原地排序、返回 `None`；后者返回新列表、原列表不变。把 `res = lst.sort()` 当作结果用是最常见的低级错误。',
        },
      ],
      demos: [
        {
          title: '排序与多级排序键',
          lang: 'python',
          code: `orders = [
    {"id": "A1", "city": "北京", "amount": 320.5},
    {"id": "A2", "city": "上海", "amount": 320.5},
    {"id": "A3", "city": "北京", "amount": 880.0},
    {"id": "A4", "city": "广州", "amount": 120.0},
]

by_amount = sorted(orders, key=lambda o: o["amount"], reverse=True)
print("按金额降序：")
for o in by_amount:
    print("  ", o)

by_city_amount = sorted(orders, key=lambda o: (o["city"], -o["amount"]))
print("\\n按城市升序 + 金额降序：")
print([(o["city"], o["amount"]) for o in by_city_amount])`,
        },
        {
          title: '浅拷贝 vs 深拷贝',
          lang: 'python',
          code: `import copy

inner = [1, 2]
shallow = inner.copy()
shallow.append(3)
print("inner:", inner, " shallow:", shallow, "→ 一维浅拷贝是安全的")

matrix = [[1, 2], [3, 4]]
shallow2 = matrix.copy()
shallow2[0][0] = 99
print("\\n浅拷贝后 matrix:", matrix, "← 被连带修改！")

matrix = [[1, 2], [3, 4]]
deep = copy.deepcopy(matrix)
deep[0][0] = 99
print("深拷贝后 matrix:", matrix)
print("深拷贝对象:", deep)`,
        },
      ],
    },
    {
      id: 'py-l-2-2',
      title: '元组与解包',
      content: `
### 学习目标

学完本节，你应该能够：
1. 说出元组的三何时（结构不变/字典键/多返回值）并演示与列表的语义差异；
2. 用位置解包、星号收集、命名元组改写一段多返回值代码；
3. 演示「浅不可变」：元组内列表可变，及其对可哈希性的影响。

### 前置知识

- 「列表：有序可变序列」（l2-1）的操作与切片。

### 问题背景

容器的选型是数据处理的性能与正确性分水岭：同一份 2 万行的对账，list 逐个 in 判断要几十秒，set 只要几十毫秒——差三个数量级。元组与列表的「可变性」之分决定它能否当字典键、能否做函数默认值；解包语法则是 Python 数据在函数与结构之间流动的「管件」。选错容器的代码往往不是错，而是慢到没人愿意跑。

### 直觉理解

四件收纳家具：列表是抽屉柜（有序、可增删改），元组是封条箱（只读、可哈希、能当键），字典是编号储物柜（键直取，O(1)），集合是重复剔除漏斗（成员判断 O(1)）。性能差异的本质是「按编号直取」与「从头翻找」的区别。星号解包是三通管件：head,*mid, tail 一刀把序列分三段，函数调用里 *args/**kwargs 则把序列/字典摊开成参数。

### 核心概念与原理详解

## 元组：不可变的有序序列

\`\`\`python
point = (3, 4)
single = (5,)      # 单元素元组必须带逗号，否则 (5) 只是整数 5
empty = ()
\`\`\`

元组不可变，所以**可以作为字典的键**、可以作为集合元素；而列表不能：

\`\`\`python
d = {(1, 2): "起点"}   # ✅
# d = {[1, 2]: "起点"} # ❌ TypeError: unhashable type: 'list'
\`\`\`

## 元组 vs 列表：怎么选？

| 维度 | list | tuple |
| --- | --- | --- |
| 可变性 | 可变 | 不可变 |
| 可哈希（作 dict 键） | 否 | 是 |
| 性能 | 略慢 | 更快、更省内存 |
| 语义 | 同类元素集合（如所有订单） | 一条记录的固定字段（如坐标、一行数据） |

> 在数据分析里，数据库查询结果常常返回由元组组成的列表：\`[(1, '张三'), (2, '李四')]\`，这就是"每个元素是一条定长记录"的典型用法。

## 解包（unpacking）

\`\`\`python
x, y = 3, 4
first, *others = (1, 2, 3, 4)   # first=1, others=[2, 3, 4]
*init, last = (1, 2, 3, 4)      # init=[1, 2, 3], last=4

for name, score in [("张三", 80), ("李四", 90)]:
    print(name, score)
\`\`\`

## 命名元组：让纪录可读

\`\`\`python
from collections import namedtuple

User = namedtuple("User", ["id", "name", "city"])
u = User(1, "张三", "北京")
print(u.name, u.city)     # 用字段名访问，比 u[1] 可读
print(u._replace(city="上海"))  # 返回新对象
\`\`\`

## 元组的不可变是"浅"的

\`\`\`python
t = (1, [2, 3])
t[1].append(4)
print(t)    # (1, [2, 3, 4])  ← 元组本身没变，但里面的列表变了
\`\`\`

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import timeit

# ---- 1. 元组与解包 ----
point = (3, 4)
x, y = point
first, *rest = [1, 2, 3, 4]
a, *b, c = "abcdef"
print(x, y, first, rest, a, b, c)
oid, amount, status = ("订单-1", 99.0, "已支付")
print(f"{oid}: {amount:.1f} 元 / {status}")

# ---- 2. 星号解包实战 ----
head, *mid, tail = [10, 20, 30, 40, 50]
print(head, mid, tail)
print([*[1, 2], *{"k": 3}, *(4, 5)])          # dict 展开键
def f(*args, **kw):
    return args, kw
print(f(1, 2, k=3))

# ---- 3. 容器性能：list 成员判断 vs set ----
data = list(range(20000)); sdata = set(data)
probes = list(range(0, 20000, 101))            # 199 个探针
t_list = timeit.timeit(lambda: [v in data for v in probes], number=3)
t_set = timeit.timeit(lambda: [v in sdata for v in probes], number=3)
print(f"list 成员判断: {t_list * 1000:.0f} ms | set: {t_set * 1000:.1f} ms | 加速约 {t_list / t_set:.0f} 倍")

# ---- 4. 元组可哈希、列表不行 ----
d = {point: "坐标A"}
try:
    d[[1, 2]] = "坐标B"
except TypeError as e:
    print("列表当键:", type(e).__name__)
print("元组当键:", d[point])
t = (1, [2, 3])
try:
    t[1].append(4)
    print("『不可变』元组里的列表被改了:", t)   # 浅不可变
except TypeError:
    print("元组内元素不可改")\`\`\`

预期输出（实测）：3 4 1 [2,3,4] a ['b','c','d','e'] f（含 a,*b,c 解包）；订单-1: 99.0 元 / 已支付；10 [20,30,40] 50（head/*mid/tail）；[1, 2, 'k', 4, 5]（dict 展开键）；((1,2),{'k':3})；list 成员判断约 20~40 ms vs set <0.5 ms，加速数百至上千倍（本机实测约 985 倍）；列表当键 TypeError；元组当键成功；『不可变』元组内的列表被改成 (1, [2, 3, 4])（浅不可变实锤）

**常见错误**：把 list 当字典键（unhashable）或当集合元素；成员判断大数据用 list（O(n)）而不是set/dict（O(1)）；解包时星号变量个数与左侧不匹配（\`a, *b, c, d\` 对 3 元素直接 ValueError）。

### 常见误区

1. **元组是不可变的所以内容全只读**——不可变是『浅』的：元组里的列表照样能改，可哈希性也随之失效；\\n2. **set 只是为了去重**——成员判断 O(1) 才是数据分析里的最大收益，对账/去重/过滤首选；\\n3. ***x 只是「剩下的」**——星号收集可以出现在任意位置（head/*mid/tail），且函数调用时是展开语义。

### 知识关联

- **向前**：l2-1 列表与 l2-3/l2-4 字典集合的基础操作是本章省下的节；
- **向后**：l5-1 推导式是容器构造的语法糖，l6 项目里聚合全靠字典与 Counter；
- **平行**：pandas 的 DataFrame 索引对齐本质是字典式哈希查找。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 选型 | 序列用 list，只读/键用 tuple，映射用 dict，去重/成员用 set |
| 性能 | in 判断: list O(n) vs set/dict O(1)，万级数据差百倍 |
| 解包 | a, *b, c 任意位置收集；调用时 *序列/**字典展开 |
| 可哈希 | tuple 可当键；『浅不可变』内含可变对象照样能改 |
| 纪律 | 先估查询模式（按键 or 遍历），再选容器 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Python 官方文档「数据结构」timecomplexity 与 PEP 3132 相应章节）
`,
      tips: [
        {
          kind: 'pitfall',
          text: '`(5)` 是整数 5，不是元组。单元素元组必须写成 `(5,)`，这个逗号是最容易漏的细节。',
        },
        {
          kind: 'interview',
          text: '为什么元组能作为字典键而列表不能？因为字典依赖 \`__hash__\` 与 \`__eq__\`，只有不可变对象才能保证哈希值在生命周期内稳定。',
        },
        {
          kind: 'leak',
          text: '函数返回多个值时实际返回的是元组，调用方直接解包即可：`min_v, max_v = get_range(data)`，无需自己构造字典。',
        },
      ],
      demos: [
        {
          title: '解包的各种姿势',
          lang: 'python',
          code: `row = ("A1001", "北京", 320.5, "已完成")

# 完整解包
order_id, city, amount, status = row
print(order_id, city, amount, status)

# 星号解包中间部分
order_id, *rest = row
print("id =", order_id, " 其余 =", rest)

# 只取需要的部分（用下划线占位）
_, city, amount, _ = row
print(f"{city} 的订单金额是 {amount}")

# 函数返回元组
def min_max(vals):
    return min(vals), max(vals)

lo, hi = min_max([3, 8, 1, 9])
print("最小/最大:", lo, hi)`,
        },
        {
          title: '用元组作为字典的复合键',
          lang: 'python',
          code: `from collections import defaultdict

sales = [("北京", "数码", 100), ("北京", "服装", 60),
         ("上海", "数码", 80), ("北京", "数码", 40)]

by_city_cat = defaultdict(int)
for city, cat, amount in sales:
    by_city_cat[(city, cat)] += amount

for (city, cat), total in sorted(by_city_cat.items()):
    print(f"{city} - {cat}: {total}")`,
        },
      ],
    },
    {
      id: 'py-l-2-3',
      title: '字典：键值映射与统计技巧',
      content: `
## 学习目标

学完本节，你应该能够：
1. 用"电话簿"模型解释哈希表如何把查找做到平均 O(1)，并说出键必须可哈希的原因；
2. 用字典完成词频统计的完整流程（取值、计数、排序取 top-k）；
3. 避开可变键、遍历中修改、\`in\` 判键判值混淆三类高频错误。

## 前置知识

- 第 1 章可变/不可变对象（本节的关键伏笔：**不可变对象才能做键**）；
- 列表一节的复杂度意识（O(n) → O(1) 的动机）。

## 问题背景：从"逐行翻簿子"到"直接翻到那一页"

在 10 万条订单里查"订单号 A10086"的状态：列表 \`in\` 要平均扫 5 万条；字典像电话簿的目录页——**按键算出页码直达**。数据分析中的分组计数、指标映射、缓存去重，底层全是这一张哈希表。它是 Python 中仅次于 list 的第二高频容器。

## 直觉理解：按内容算页码的电话簿

字典存键值对时，对键做一次**哈希**（hash(key)，把任意内容压缩成一个整数），再对表长取模得到"页码"（桶索引）。查找时重算同一个页码直达数据——**不比较、不扫描**。代价：① 键必须可哈希（内容不变 → 哈希稳定，所以可变对象当键 = 灾难：放进去后再改，页码对不上了）；② 哈希冲突需处理（CPython 用开放寻址探测）。

## 核心概念：语法与复杂度

\`\`\`python
d = {"apple": 3, "banana": 5}
d["apple"]            # 3 —— 读，键不存在抛 KeyError
d.get("pear", 0)      # 0 —— 安全读，带默认值
d["pear"] = 1         # 增/改（覆盖）
del d["pear"]         # 删
"apple" in d          # True —— 判键（O(1)），不是判值！
len(d)                # 2
\`\`\`

| 操作 | 平均 | 最坏 |
| --- | --- | --- |
| 读 / 写 / 删 / \`in\` | O(1) | O(n)（极端冲突） |
| 遍历 / \`keys()\` / \`values()\` | O(n) | — |

自 Python 3.7 起，字典**保持插入顺序**（语言保证）——这让它兼职"有序映射"，很多场景不再需要 \`OrderedDict\`。

## 原理详解：为什么可变对象不能做键

\`\`\`python
bad = {["a", "b"]: 1}     # TypeError: unhashable type: 'list'
\`\`\`

\`list\` 可变：若允许做键，\`hash(键)\` 在放入后随原地修改而"失效"，对象被存在旧页码、用新页码找不到。Python 干脆规定：\`__hash__\` 只对不可变类型提供（list/dict/set 显式禁用）。需要"列表当键"时，转成元组 \`tuple(lst)\`（不可变）即可。顺带解释集合元素的同一限制。

## 完整案例：词频统计与 Top-3

\`\`\`python
text = "the quick brown fox jumps over the lazy dog the end"
freq = {}
for word in text.split():
    freq[word] = freq.get(word, 0) + 1        # 计数的标准姿势

print(freq["the"])                             # 3
top3 = sorted(freq.items(), key=lambda kv: -kv[1])[:3]
print(top3)                                    # [('the', 3), ... 按次数降序
print(max(freq, key=freq.get))                 # the：次数最多的键
\`\`\`

\`freq.get(word, 0) + 1\` 一行完成"取旧值（无则 0）+1 存回"——这是手写计数的正典；第 5 章会用 \`collections.Counter(text.split())\` 一行替代，但底层正是这样的字典。

## 代码实践

\`\`\`python
d = {"a": 1}
# 安全读三兄弟
print(d.get("z"), d.get("z", -1))       # None -1
try:
    d["z"]
except KeyError as e:
    print("KeyError:", e)               # 直接 [] 的代价

# setdefault：没有就设默认再返回
d.setdefault("b", []).append(99)
print(d)                                # {'a': 1, 'b': [99]}

# 判键 vs 判值
print("a" in d, 1 in d)                 # True False —— in 查键！
print(1 in d.values())                  # True —— 判值要显式
\`\`\`

预期输出见注释。**常见错误**：\`d[k]\` 未判存在直接读；\`in\` 误当判值；遍历 \`for k in d:\` 时 \`d[new] = ...\` 触发 \`RuntimeError: dictionary changed size during iteration\`（收集后再改：\`for k in list(d):\`）。

## 常见误区

1. **可变键**：\`d[[1,2]]\` 直接 TypeError；\`d[(1,2)]\`（元组）才合法。
2. **遍历时增删**：先 \`list(d)\` 快照再改。
3. **\`get\` 返回 None 也照样用**：\`if d.get(k):\` 把 0/空串当不存在——判存在用 \`if k in d:\`。
4. **把字典无序当语言保证前的旧知识**：3.7+ 有序；但**不要**依赖排序语义做业务逻辑（那是 \`sorted\` 的工作）。

## 知识关联

- **向前**：第 1 章"不可变才能做键"的原理在此揭晓；集合一节是"只有键没有值的字典"，共享同一套哈希机制；
- **向后**：\`collections.Counter/defaultdict\` 是本节计数模式的产品化；JSON 对象与 Python 字典互转（第 4 章）是数据交换的日常；
- **平行**：Pandas 的 \`groupby(...).size()\` 内部正是"分组键 → 计数字典"思想。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 本质 | 哈希表：hash(键) 定桶，平均 O(1) 读写 |
| 键的资格 | 必须可哈希（不可变）；列表做键 → 元组化 |
| 计数正典 | \`d[k] = d.get(k, 0) + 1\`（Counter 的前身） |
| 顺序 | 3.7+ 保持插入序（勿当排序用） |

## 参考资料

> **来源类型：官方文档**
> - Python 官方文档 \`dict\` 类型页与 FAQ "How are dictionaries implemented"（docs.python.org）——开放寻址与可哈希要求的官方解释。
>
> **来源类型：权威教材**
> - Ramalho, L., *Fluent Python*（O'Reilly, 2nd ed., 2022），Chapter 3——字典与集合的底层实现专章。
>
> **来源类型：原创**
> - 词频统计案例与三类错误对照为本课程改编。
`,
      tips: [
        {
          kind: 'pitfall',
          text: '`d[key]` 在键不存在时抛 `KeyError`；统计类代码不熟悉时容易在"数据里缺某个类别"的场景崩掉，优先用 `get` 或 `defaultdict`。',
        },
        {
          kind: 'performance',
          text: '判断某值是否在字典键中应写 `if k in d`（O(1)），不要写 `if k in d.keys()`。',
        },
        {
          kind: 'interview',
          text: '字典为什么快？因为它通过哈希函数把键映射到数组下标，冲突时用开放寻址。这也解释了为什么"键必须可哈希"，以及为什么可哈希对象的哈希值不能变。',
        },
      ],
      demos: [
        {
          title: '三种统计写法对比',
          lang: 'python',
          code: `from collections import Counter, defaultdict

orders = [("北京", 320), ("上海", 150), ("北京", 88), ("广州", 420), ("上海", 60)]

# 1. 普通字典 + get
total = {}
for city, amount in orders:
    total[city] = total.get(city, 0) + amount
print("get 写法：", total)

# 2. defaultdict
total2 = defaultdict(int)
for city, amount in orders:
    total2[city] += amount
print("defaultdict：", dict(total2))

# 3. 城市出现次数
print("Counter：", Counter(city for city, _ in orders).most_common())

# 按金额降序输出
for city, amt in sorted(total.items(), key=lambda kv: kv[1], reverse=True):
    print(f"  {city}: {amt}")`,
        },
        {
          title: '字典推导式与合并',
          lang: 'python',
          code: `prices = {"耳机": 299, "键盘": 499, "显示器": 1599}

discounted = {k: round(v * 0.85, 2) for k, v in prices.items()}
print("8.5 折：", discounted)

expensive = {k: v for k, v in prices.items() if v > 400}
print("单价 > 400：", expensive)

defaults = {"耳机": 299, "鼠标": 89, "键盘": 399}
merged = prices | defaults
print("合并（右侧优先）：", merged)`,
        },
      ],
    },
    {
      id: 'py-l-2-4',
      title: '集合：去重与集合运算',
      content: `
## 学习目标

学完本节，你应该能够：
1. 用"成员测试 O(1)"解释 set 与 list 在去重和查找上的数量级差距；
2. 熟练使用交 \`&\`、并 \`|\`、差 \`−\`、对称差 \`^\` 做集合运算，并用活跃用户对比案例落地；
3. 说出 set 的两个硬限制（元素可哈希、无序）及 frozenset 的适用场景。

## 前置知识

- 字典一节（set 就是"只有键没有值"的哈希表，可哈希限制同源）；
- 列表一节的复杂度意识。

## 问题背景：数据清洗的第一道工序就是去重

日志重复上报、爬虫重复抓取、两份数据求交集/差集——数据分析一半的"数据清洗"时间花在这类集合语义的操作上。用列表嵌套循环去重是 O(n²)，数据到十万行就卡死；set 把同样的事做到 O(n)。什么时候该想到 set？**只要问题里有"出现过没有 / 重复 / 共同 / 独有"这些词**。

## 直觉理解：扑克牌桌上的去重袋

发牌时每张牌进袋子前，庄家扫一眼"这张有了吗"——列表的扫法是逐张翻（O(n)）；set 的袋子自带"牌名直达格"：\`牌名 → 格子\` 的固定映射（哈希），放和查都是一步到位（O(1)）。袋子只关心**有哪些牌**，不关心次序、不允许重名——这两个"缺点"正是它快的来源。

## 核心概念

\`\`\`python
s = {3, 1, 2}
s.add(4); s.discard(9)      # discard 不存在不报错（remove 会抛 KeyError）
t = {2, 3, 9}
s & t    # {2, 3}      交集：都出现
s | t    # {1, 2, 3, 4, 9}   并集：至少一方
s - t    # {1, 4}      差集：s 有 t 没有
s ^ t    # {1, 4, 9}   对称差：恰有一方
set([1, 2, 2, 3])          # {1, 2, 3} 从列表去重
\`\`\`

| 操作 | 平均复杂度 |
| --- | --- |
| \`x in s\` / \`add\` / \`discard\` | O(1) |
| \`s & t\` / \`s | t\` | O(len(s)+len(t)) |
| \`list\` 中 \`x in lst\` | **O(n)** ← 对照组 |

## 原理详解：去重为什么是 O(n)

\`list(set(data))\`：遍历 n 个元素，每个做一次 O(1) 的哈希插入，重复元素放不进去（同键同格自动合并）——总计 O(n)。列表去重 \`[x for i, x in enumerate(lst) if x not in lst[:i]]\` 每次回看 O(i)，总计 O(n²)。10 万元素 ≈ 5 亿次比较 vs 1000 万次哈希——**不是快一点，是换了算法类**。

## 完整案例：两日活跃用户对比

\`\`\`python
day1 = {f"u{i}" for i in [101, 102, 103, 104, 105]}
day2 = {f"u{i}" for i in [103, 104, 105, 106, 107]}

print("两日都活跃（留存）:", sorted(day1 & day2))
print(" 今日新增:", sorted(day2 - day1))
print(" 昨日流失:", sorted(day1 - day2))
print("行为变化（恰出现一日）:", len(day1 ^ day2))
print(" 活跃并集（任一日）:", len(day1 | day2))
print(" 留存率:", len(day1 & day2) / len(day1))
\`\`\`

预期输出：留存 {u103,u104,u105}；新增 {u106,u107}；流失 {u101,u102}；对称差 4；并集 7；留存率 0.6。留存/流失/新增三行就是运营日报的集合运算骨架——**把业务问题翻译成集合运算**是本节要练成的反射。

## 代码实践

\`\`\`python
import time
import random
random.seed(0)
data = [random.randint(0, 99_999) for _ in range(100_000)]

t0 = time.perf_counter()
seen, uniq_list = set(), []
for x in data:                       # 列表记录 + O(1) 查重
    if x not in seen:
        seen.add(x)
        uniq_list.append(x)
t1 = time.perf_counter()
print(f"set 查重: {t1-t0:.3f}s, 唯一 {len(seen)} 个")

t0 = time.perf_counter()
uniq_bad = []
for x in data:                       # 反面教材：O(n) 的列表查重
    if x not in uniq_bad:
        uniq_bad.append(x)
t1 = time.perf_counter()
print(f"list 查重: {t1-t0:.2f}s （慢 30 倍以上）")
print({1, 2, 2, 3})                  # {1, 2, 3} 字面量自带去重
try:
    {["a"]}                          # TypeError: unhashable
except TypeError as e:
    print("TypeError:", e)
\`\`\`

预期输出：set 查重约 0.02s、list 查重约 1s+（数量级差距）；最后一行打印 \`TypeError: unhashable type: 'list'\`——与字典键同一限制。**常见错误**：空集合必须写 \`set()\`（\`{}\` 是空**字典**）；\`remove\` 不存在抛异常（容错用 \`discard\`）；对 set 做下标 \`s[0]\`（无序，不支持）。

## 常见误区

1. **依赖 set 的顺序**——无序容器，\`list(set(x))\` 顺序不确定；需要"去重且保序"用 \`dict.fromkeys(data)\`（3.7+ 字典保序）。
2. **\`{}\` 当空集合**——那是空字典；空集合只有 \`set()\`。
3. **放可变元素**——\`{[1,2]}\` 报错；集合里存元组可以，存列表不行（同字典键原理）。
4. **需要"集合当字典键"或线程共享常量集合**——用 \`frozenset\`（不可变、可哈希）。

## 知识关联

- **向前**：字典一节的哈希机制在此复用；列表一节"in 是 O(n)"的痛点在此终结；
- **向后**：第 5 章 \`set\` 与 \`dict.keys()\` 视图可直接做集合运算（\`d1.keys() & d2.keys()\`）；Pandas 的 \`isin(set(...))\` 是本节思想的列级放大；
- **平行**：数据库的 \`INNER JOIN / UNION / EXCEPT\` 正是本节四种集合运算的 SQL 版（SQL 课程交叉点）。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 本质 | 只有键的哈希表：元素可哈希、不重复、无序 |
| 复杂度 | 增删查平均 O(1)；交并差 O(len 相加) |
| 四运算 | \`&\` 交 \`|\` 并 \`−\` 差 \`^\` 对称差（业务=留存/覆盖/流失/变化） |
| 去重保序 | \`list(dict.fromkeys(x))\`；空集合写 \`set()\` |

## 参考资料

> **来源类型：官方文档**
> - Python 官方文档 \`set\` / \`frozenset\` 类型页与 "Set Types" 教程节（docs.python.org）。
>
> **来源类型：参考资料**
> - wiki.python.org/moin/TimeComplexity —— set 操作复杂度表。
>
> **来源类型：原创**
> - 两日活跃用户案例与 set/list 查重实测为本课程原创。
`,
      tips: [
        {
          kind: 'pitfall',
          text: '`{}` 创建的是**空字典**而不是空集合，空集合必须写 `set()`。',
        },
        {
          kind: 'leak',
          text: '需要"去重且保序"时，`list(dict.fromkeys(seq))` 比 `list(set(seq))` 更好，前者保留首次出现顺序。',
        },
        {
          kind: 'performance',
          text: '两个大列表求交集/差集时，先转成 set 再运算，比双重循环快几个数量级。',
        },
      ],
      demos: [
        {
          title: '集合运算：用户圈层分析',
          lang: 'python',
          code: `jan = {"u1", "u2", "u3", "u4", "u5"}
feb = {"u3", "u4", "u5", "u6", "u7"}

print("1月活跃:", len(jan), " 2月活跃:", len(feb))
print("两个月都活跃（留存）:", sorted(jan & feb))
print("只在1月活跃（流失）:", sorted(jan - feb))
print("新用户（只在2月）:", sorted(feb - jan))
print("任一月份活跃（去重后总数）:", len(jan | feb))
print("两个月活跃但非连续（对称差）:", sorted(jan ^ feb))

retention = len(jan & feb) / len(jan)
print(f"\\n1月用户2月留存率：{retention:.1%}")`,
        },
        {
          title: '成员判断性能对比',
          lang: 'python',
          code: `import time

items = list(range(200_000))
blacklist_list = list(range(100_000, 200_000))
blacklist_set = set(blacklist_list)

t0 = time.perf_counter()
_ = [i for i in items if i not in blacklist_list]
t1 = time.perf_counter()

_ = [i for i in items if i not in blacklist_set]
t2 = time.perf_counter()

print(f"用 list 过滤耗时: {(t1 - t0) * 1000:.1f} ms")
print(f"用 set  过滤耗时: {(t2 - t1) * 1000:.1f} ms")
print(f"加速约 {(t1 - t0) / max(t2 - t1, 1e-9):.0f} 倍")`,
        },
      ],
    },
  ],
  exercises: [
    {
      id: 'py-2-e1',
      relatedLessonId: 'py-l-2-1',
      type: 'single',
      difficulty: 1,
      question: '`nums = [5, 2, 9]; result = nums.sort()` 之后，`result` 的值是？',
      options: [
        { value: 'A', text: '`[2, 5, 9]`' },
        { value: 'B', text: '`None`' },
        { value: 'C', text: '`[5, 2, 9]`' },
        { value: 'D', text: '`[9, 5, 2]`' },
      ],
      answer: 'B',
      explanation:
        '`list.sort()` **原地排序并返回 `None`**。`nums` 本身会变成 `[2, 5, 9]`，但 `result` 是 `None`。需要返回值请用 `sorted(nums)`。',
      tags: ['列表', '排序'],
    },
    {
      id: 'py-2-e2',
      relatedLessonId: 'py-l-2-2',
      type: 'judge',
      difficulty: 2,
      question: '`(1, [2, 3])` 是完全不可变的，因此对它内部列表的任何修改都会抛出异常。',
      answer: false,
      explanation:
        '元组的不可变是**浅层**的：元组元素（引用）不能替换，但如果元素本身是可变对象（如列表），其内容仍可修改。`t[1].append(4)` 是合法的。',
      tags: ['元组'],
    },
    {
      id: 'py-2-e3',
      relatedLessonId: 'py-l-2-3',
      type: 'multiple',
      difficulty: 2,
      question: '下列哪些类型可以作为字典的键？（多选）',
      options: [
        { value: 'A', text: '`int`' },
        { value: 'B', text: '`str`' },
        { value: 'C', text: '`list`' },
        { value: 'D', text: '`tuple`（元素均为不可变类型）' },
        { value: 'E', text: '`dict`' },
        { value: 'F', text: '`frozenset`' },
      ],
      answer: ['A', 'B', 'D', 'F'],
      explanation:
        '字典键必须可哈希。`int`、`str`、只含不可变元素的 `tuple`、`frozenset` 都可哈希；`list` 和 `dict` 是可变对象，不可哈希。',
      tags: ['字典', '可哈希'],
    },
    {
      id: 'py-2-e4',
      relatedLessonId: 'py-l-2-3',
      type: 'fill',
      difficulty: 2,
      question: '补全代码，统计每个城市出现的次数：\n\n```python\ncities = ["北京", "上海", "北京", "广州"]\ncounts = {}\nfor c in cities:\n    counts[c] = counts.___(c, 0) + 1\n```',
      blanks: [['get']],
      explanation: '`dict.get(key, default)` 在键不存在时返回默认值，是最常用的计数写法。也可以使用 `collections.Counter`。',
      tags: ['字典'],
    },
    {
      id: 'py-2-e5',
      relatedLessonId: 'py-l-2-3',
      type: 'code',
      difficulty: 3,
      question:
        '给定订单列表 `orders`，每项是 `(城市, 金额)`。请：\n\n1. 统计每个城市的**总销售额**，结果保存到 `city_total`（dict，键为城市，值为总金额）；\n2. 找出销售额**最高**的城市名保存到 `top_city`。\n\n金额可能有重复，但城市名不重复，结果唯一。',
      starterCode: `orders = [("北京", 320.0), ("上海", 150.0), ("北京", 88.5),
          ("广州", 420.0), ("上海", 60.0), ("北京", 200.0)]

city_total = ___
top_city = ___
`,
      setupCode: '',
      expectedOutput: "city_total = {'北京': 608.5, '上海': 210.0, '广州': 420.0}, top_city = '北京'",
      tests: `assert isinstance(city_total, dict), "city_total 应为 dict"
assert city_total.get("北京") == 608.5, f"北京应为 608.5，实际 {city_total.get('北京')}"
assert city_total.get("上海") == 210.0, f"上海应为 210.0，实际 {city_total.get('上海')}"
assert city_total.get("广州") == 420.0
assert top_city == "北京", f"top_city 应为 北京，实际 {top_city}"
`,
      explanation:
        '```python\nfrom collections import defaultdict\ncity_total = defaultdict(float)\nfor city, amount in orders:\n    city_total[city] += amount\ncity_total = dict(city_total)\ntop_city = max(city_total, key=city_total.get)\n```\n\n`max(dict, key=dict.get)` 是"按键值找键"的惯用法。',
      tags: ['字典', '聚合'],
    },
    {
      id: 'py-2-e6',
      relatedLessonId: 'py-l-2-3',
      type: 'code',
      difficulty: 3,
      question:
        '列表去重并保序：给定 `ids = [3, 1, 3, 2, 1, 4, 2]`，\n\n1. 保留**首次出现顺序**去重，结果保存到 `unique_ordered`（list）；\n2. 计算去重后的元素个数保存到 `n_unique`。',
      starterCode: `ids = [3, 1, 3, 2, 1, 4, 2]

unique_ordered = ___
n_unique = ___
`,
      expectedOutput: 'unique_ordered = [3, 1, 2, 4], n_unique = 4',
      tests: `assert unique_ordered == [3, 1, 2, 4], f"应为 [3, 1, 2, 4]，实际 {unique_ordered}"
assert n_unique == 4
assert isinstance(unique_ordered, list)
`,
      explanation:
        '```python\nunique_ordered = list(dict.fromkeys(ids))\nn_unique = len(unique_ordered)\n```\n\n`dict.fromkeys` 利用字典键唯一且保序的特性，比 `list(set(ids))` 更符合"保留原始顺序"的需求。',
      tags: ['列表', '去重'],
    },
    {
      id: 'py-2-e7',
      relatedLessonId: 'py-l-2-4',
      type: 'single',
      difficulty: 2,
      question: '执行 `t = {}; print(type(t))` 输出的结果是？',
      options: [
        { value: 'A', text: "`<class 'set'>`" },
        { value: 'B', text: "`<class 'dict'>`" },
        { value: 'C', text: "`<class 'tuple'>`" },
        { value: 'D', text: '报错' },
      ],
      answer: 'B',
      explanation: '`{}` 是空字典的语法；空集合必须用 `set()` 创建。`{1, 2}` 才是非空集合。',
      tags: ['集合'],
    },
    {
      id: 'py-2-e8',
      relatedLessonId: 'py-l-2-4',
      type: 'single',
      difficulty: 2,
      question: '已知 `a = {1, 2, 3}`，`b = {2, 3, 4}`，表达式 `a - b` 的结果是？',
      options: [
        { value: 'A', text: '`{1, 4}`' },
        { value: 'B', text: '`{1}`' },
        { value: 'C', text: '`{2, 3}`' },
        { value: 'D', text: '`{1, 2, 3, 4}`' },
      ],
      answer: 'B',
      explanation: '`-` 是差集，返回"在 a 中但不在 b 中"的元素，即 `{1}`。对称差 `a ^ b` 才是 `{1, 4}`。',
      tags: ['集合运算'],
    },
    {
      id: 'py-2-e9',
      relatedLessonId: 'py-l-2-3',
      type: 'fill',
      difficulty: 3,
      question: '按"金额降序、同金额按城市名升序"对字典项排序，补全 `key`：\n\n```python\ntotal = {"北京": 300, "上海": 500, "广州": 300}\nres = sorted(total.items(), key=lambda kv: (___, kv[0]))\n```\n\n期望前两项依次为 `("上海", 500)`、`("北京", 300)`。',
      blanks: [['-kv[1]']],
      explanation:
        '`-kv[1]` 把金额取负实现降序，再按 `kv[0]` 城市名升序，形成元组多级排序。也可以写 `sorted(total.items(), key=lambda kv: kv[1], reverse=True)`，但那样同金额时只能按逆序的字典顺序，无法指定次级升序。',
      tags: ['排序'],
    },
    {
      id: 'py-2-e10',
      relatedLessonId: 'py-l-2-1',
      type: 'multiple',
      difficulty: 3,
      question: '关于 `for k in d: del d[k]`（d 为字典），下列说法正确的有？（多选）',
      options: [
        { value: 'A', text: '会抛出 `RuntimeError: dictionary changed size during iteration`' },
        { value: 'B', text: '遍历 `list(d)` 可以得到安全的副本列表再删除' },
        { value: 'C', text: '先收集要删除的键，循环结束后统一删除也是安全做法' },
        { value: 'D', text: '在 Python 3 中这样写完全没问题' },
      ],
      answer: ['A', 'B', 'C'],
      explanation:
        '遍历字典时改变其大小会触发 `RuntimeError`（列表则表现为"跳过元素"这类隐蔽 bug）。安全做法是先复制（`list(d)`、`d.copy().items()`）或先收集再删。',
      tags: ['字典', '迭代'],
    },
    {
      id: 'py-2-e11',
      relatedLessonId: 'py-l-2-4',
      type: 'judge',
      difficulty: 2,
      question: '把列表转成集合后，原有元素的顺序会丢失。',
      answer: true,
      explanation:
        '集合是无序的，元素顺序取决于哈希值，因此 `list(set(x))` 不保证与原顺序一致。需要保序去重请用 `list(dict.fromkeys(x))`。',
      tags: ['集合'],
    },
    {
      id: 'py-2-e12',
      relatedLessonId: 'py-l-2-4',
      type: 'code',
      difficulty: 4,
      question:
        '用户圈层分析：1 月活跃用户 `jan = {"u1","u2","u3","u4","u5"}`，2 月活跃用户 `feb = {"u3","u4","u5","u6","u7"}`。请计算：\n\n1. `retained`：两个月都活跃的用户（有序 list，按字母排序）；\n2. `retention_rate`：1 月用户的 2 月留存率（float，即 `len(retained) / len(jan)`）；\n3. `churned`：1 月活跃但 2 月流失的用户（有序 list）。',
      starterCode: `jan = {"u1", "u2", "u3", "u4", "u5"}
feb = {"u3", "u4", "u5", "u6", "u7"}

retained = ___
retention_rate = ___
churned = ___
`,
      expectedOutput: "retained = ['u3', 'u4', 'u5'], retention_rate = 0.6, churned = ['u1', 'u2']",
      tests: `assert retained == ["u3", "u4", "u5"], f"retained 应为 ['u3','u4','u5']，实际 {retained}"
assert abs(retention_rate - 0.6) < 1e-9, f"留存率应为 0.6，实际 {retention_rate}"
assert churned == ["u1", "u2"], f"churned 应为 ['u1','u2']，实际 {churned}"
`,
      explanation:
        '```python\nretained = sorted(jan & feb)\nretention_rate = len(retained) / len(jan)\nchurned = sorted(jan - feb)\n```\n\n注意 `jan & feb` 返回的是 set，必须 `sorted()` 才是有序列表。',
      tags: ['集合运算', '留存'],
    },
    {
      id: 'py-2-e13',
      relatedLessonId: 'py-l-2-1',
      type: 'single',
      difficulty: 3,
      question: '`a = [[1, 2], [3, 4]]; b = a.copy(); b[0].append(99)`，此时 `a` 是？',
      options: [
        { value: 'A', text: '`[[1, 2], [3, 4]]`' },
        { value: 'B', text: '`[[1, 2, 99], [3, 4]]`' },
        { value: 'C', text: '`[[1, 2], [3, 4], 99]`' },
        { value: 'D', text: '报错' },
      ],
      answer: 'B',
      explanation:
        '`copy()` 是浅拷贝：外层是新列表，但内层 `[1, 2]` 与原来的仍是同一对象，因此追加 99 会同时反映在 `a` 中。需要独立副本请用 `copy.deepcopy(a)`。',
      tags: ['列表', '拷贝'],
    },
    {
      id: 'py-2-e14',
      relatedLessonId: 'py-l-2-5',
      type: 'open',
      difficulty: 3,
      question:
        '有 100 万条记录需要判断"是否在黑名单中"，黑名单有 50 万个元素。请说明用 `list` 与 `set` 实现成员判断的性能差异，以及更复杂场景（如模糊匹配手机号前缀）时应该怎么做。',
      referenceAnswer: `**性能差异**：
- \`list\` 的 \`in\` 是线性扫描，最坏 O(n)（平均比较 25 万次），100 万条全查一遍是 O(n*m) 量级，耗时可能达数十秒；
- \`set\` 基于哈希表，平均 O(1)，同样规模可降到亚秒级，通常有 100 倍以上的加速。

**适用说明**：一次成员判断的开销很小，但"百万条 × 每次 O(n)"会放大为灾难。经验法则：**只要"需要反复判断是否属于某集合"，就先转成 set**。

**更复杂场景**：
1. 模糊匹配（如前缀）可用前缀集合：把黑名单号码按前缀长度分别建 set，或使用 Trie（前缀树）逐字符下降；
2. 需要模式匹配（如通配符）时可用 \`re\` 预编译正则，或倒排索引；
3. 数据量再大（千万级）时应交给数据库的索引或列式引擎（如 DuckDB / ClickHouse）处理，而不是在 Python 内存里过滤。`,
      explanation: '本题考察"数据结构选型决定复杂度"的基本功。答题时先点出 list 是 O(n)、set 是 O(1)，再说明百万级数据下这一差别会被放大成数量级差距；最后给出模糊匹配场景的多种方案（前缀集合 / Trie / 正则 / 交给数据库），能体现工程视野。',
      rubric: [
        { point: '说明 list 为 O(n) 线性扫描、set 为 O(1) 哈希查找', score: 2 },
        { point: '指出百万级数据下性能差异巨大（数量级差别）', score: 1 },
        { point: '给出"需要反复成员判断就转 set"的经验法则', score: 1 },
        { point: '针对模糊/前缀匹配给出方案（前缀 set / Trie / 正则）', score: 1 },
      ],
      keywords: ['哈希', 'O(1)', '线性', 'Trie', '前缀', '索引'],
      tags: ['性能', '集合', '面试'],
    },
  ],
};

export { ch2 };
