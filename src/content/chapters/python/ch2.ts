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
## 列表的本质

列表是**有序、可变**的序列，内部实现是**动态数组**（会预留额外容量，所以尾部 \`append\` 平均是 O(1)）。

\`\`\`python
orders = ["A1001", "A1002", "A1003"]
\`\`\`

## 增删改查

| 操作 | 代码 | 复杂度 |
| --- | --- | --- |
| 追加 | \`lst.append(x)\` | O(1) |
| 批量追加 | \`lst.extend([1, 2])\` | O(k) |
| 指定位置插入 | \`lst.insert(0, x)\` | **O(n)**（元素后移） |
| 按值删除 | \`lst.remove(x)\`（找不到抛 ValueError） | O(n) |
| 按索引删除并返回 | \`lst.pop(i)\`（默认末尾） | 末尾 O(1)，中间 O(n) |
| 清空 | \`lst.clear()\` | O(1) |
| 查找下标 | \`lst.index(x)\` | O(n) |
| 计数 | \`lst.count(x)\` | O(n) |
| 排序（原地） | \`lst.sort(key=..., reverse=True)\` | O(n log n) |
| 排序（新列表） | \`sorted(lst)\` | O(n log n) |
| 反转（原地） | \`lst.reverse()\` | O(n) |

\`\`\`python
nums = [3, 1, 4, 1, 5]
nums.append(9)          # [3, 1, 4, 1, 5, 9]
nums.insert(0, 0)       # [0, 3, 1, 4, 1, 5, 9]
nums.remove(1)          # 删除第一个 1
last = nums.pop()       # 9
nums.sort(reverse=True) # [5, 4, 3, 1, 0]
\`\`\`

## 切片与赋值

切片**返回新列表**，而"切片赋值"可以整段替换：

\`\`\`python
a = [1, 2, 3, 4, 5]
print(a[1:3])     # [2, 3]
a[1:3] = [20, 30, 40]   # [1, 20, 30, 40, 4, 5]
a[::2] = [0, 0, 0]      # 步长为 2 赋值时，两边长度必须一致
del a[0]                # 删除单个元素
\`\`\`

## 排序与排序键

\`\`\`python
records = [("张三", 82), ("李四", 95), ("王五", 82)]
records.sort(key=lambda r: r[1], reverse=True)  # 按成绩降序
records.sort(key=lambda r: (-r[1], r[0]))       # 多级排序：成绩降序，同分按姓名升序
\`\`\`

> \`sort\` 是**稳定排序**：键相同时保持原有相对顺序，所以可以先按次要条件排、再按主要条件排。

## 列表的浅拷贝问题

\`\`\`python
matrix = [[1, 2], [3, 4]]
bad = matrix.copy()      # 浅拷贝：外层新列表，但内层仍是同一批列表
bad[0][0] = 99
print(matrix[0][0])      # 99  ← 被连带修改

import copy
good = copy.deepcopy(matrix)  # 深拷贝
good[0][0] = 0
print(matrix[0][0])      # 99（不受影响）
\`\`\`

## 列表推导式

\`\`\`python
squares = [x * x for x in range(10)]
evens = [x for x in range(20) if x % 2 == 0]
labels = ["高" if s >= 90 else "中" if s >= 60 else "低" for s in [95, 70, 50]]
\`\`\`

推导式在大数据量下并非万能：当逻辑复杂到需要多层嵌套时，可读性会急剧下降，此时宁可用普通循环。

<PythonMemoryDemo />
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
## 字典的核心特性

字典是**哈希表**实现，基于键的**平均 O(1)** 查找、插入、删除；键必须可哈希（不可变）。Python 3.7+ 保证**插入顺序**。

\`\`\`python
product = {"id": 101, "name": "耳机", "price": 299.0}
print(product["name"])        # 耳机
print(product.get("stock", 0))  # 0  ← 不存在时返回默认值，不报错
\`\`\`

## 增删改查

\`\`\`python
d = {"a": 1}
d["b"] = 2                 # 新增
d.update({"c": 3, "a": 10})  # 批量更新，已有键被覆盖
del d["b"]                 # 删除
val = d.pop("c", None)     # 删除并返回值
keys = d.keys()            # dict_keys(['a'])
items = d.items()          # dict_items([('a', 10)])
d.setdefault("x", 0)       # 键不存在时设置默认值并返回
\`\`\`

## 三种"安全取值"的写法

\`\`\`python
d = {"北京": 3}

# 1. get：最常用
count = d.get("上海", 0)

# 2. defaultdict：适合循环累加
from collections import defaultdict
cnt = defaultdict(int)
for city in ["北京", "上海", "北京"]:
    cnt[city] += 1        # 不存在的键自动初始化为 0

# 3. setdefault：一次完成"不存在则创建"
groups = {}
for city, amount in [("北京", 10), ("上海", 20), ("北京", 5)]:
    groups.setdefault(city, []).append(amount)
\`\`\`

## Counter：一行完成频次统计

\`\`\`python
from collections import Counter

words = ["apple", "banana", "apple", "cherry", "apple"]
c = Counter(words)
print(c.most_common(2))   # [('apple', 3), ('banana', 1)]
\`\`\`

## 字典推导式

\`\`\`python
prices = {"耳机": 299, "键盘": 499}
discounted = {k: round(v * 0.9, 2) for k, v in prices.items()}
long_names = {k: v for k, v in prices.items() if len(k) >= 3}
swapped = {v: k for k, v in prices.items()}   # 注意：值必须唯一，否则丢失
\`\`\`

## 合并字典（3.9+ 的 | 运算符）

\`\`\`python
a = {"x": 1, "y": 2}
b = {"y": 20, "z": 30}
print(a | b)      # {'x': 1, 'y': 20, 'z': 30}，右侧优先
\`\`\`

## 遍历时修改的错误

\`\`\`python
d = {"a": 1, "b": 2}
# for k in d: del d[k]   ← RuntimeError: dictionary changed size during iteration
for k in list(d):
    del d[k]
\`\`\`

<HashTableDemo />
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
## 集合的特性

集合是**无序、元素唯一**的容器，底层同样是哈希表。常用于两件事：**去重**和**成员判断**。

\`\`\`python
s = {1, 2, 3}
s2 = set([1, 2, 2, 3])   # {1, 2, 3}，自动去重
empty = set()            # 注意：{} 是空字典，不是空集合
\`\`\`

## 集合运算

| 运算 | 运算符 | 方法 | 说明 |
| --- | --- | --- | --- |
| 并集 | \`a \\| b\` | \`a.union(b)\` | 都包含 |
| 交集 | \`a & b\` | \`a.intersection(b)\` | 同时包含 |
| 差集 | \`a - b\` | \`a.difference(b)\` | 在 a 不在 b |
| 对称差 | \`a ^ b\` | \`a.symmetric_difference(b)\` | 只属于其中一个 |
| 子集判断 | \`a <= b\` | \`a.issubset(b)\` | 是否全在 b 中 |
| 超集判断 | \`a >= b\` | \`a.issuperset(b)\` | 是否包含 b |

## 成员判断：O(1) vs O(n)

\`\`\`python
items = list(range(1_000_000))
blacklist = set(range(500_000, 1_000_000))

x = 750_000
# x in items       ← O(n)，可能要比较几十万次
# x in blacklist   ← O(1)，一次哈希即可

new_list = [i for i in items if i not in blacklist]   # 常用：用 set 加速过滤
\`\`\`

在数据量到百万级时，这一条能把"过滤黑名单"的耗时从几十秒降到不到一秒，是**性能优化中最简单有效的技巧之一**。

## frozenset：不可变集合

\`\`\`python
fs = frozenset([1, 2, 3])
# fs.add(4)   ← AttributeError
d = {fs: "可作为字典键"}
\`\`\`

## 什么时候不该用集合

- 需要保持顺序 → 用列表或 \`dict.fromkeys()\`（字典保序去重）
- 需要按索引访问 → 用列表
- 元素不可哈希（如列表、字典）→ 无法放入集合

<HashTableDemo />
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
      type: 'fill',
      difficulty: 2,
      question: '补全代码，统计每个城市出现的次数：\n\n```python\ncities = ["北京", "上海", "北京", "广州"]\ncounts = {}\nfor c in cities:\n    counts[c] = counts.___(c, 0) + 1\n```',
      blanks: [['get']],
      explanation: '`dict.get(key, default)` 在键不存在时返回默认值，是最常用的计数写法。也可以使用 `collections.Counter`。',
      tags: ['字典'],
    },
    {
      id: 'py-2-e5',
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
