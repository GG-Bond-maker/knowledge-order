import type { Exercise, Lesson } from '../../../types';

/* ============================================================
 *  Python 课程扩展包（二）：第 2~6 章的补充知识点与分级练习
 *
 *  写作约定：
 *   1. 题干 / 解析 / tips 中的行内代码用转义反引号 \`代码\`；
 *   2. 代码类字段（code / starterCode / tests / setupCode）内部禁止出现反引号；
 *   3. 编程题 tests 每行一个 assert，判分器逐行计分，可用变量 out；
 *   4. 编程题必须在 Pyodide（Python 3.13 + numpy + pandas + matplotlib）可运行。
 *
 *  难度分级：第 2~3 章 2~3 为主；第 4~5 章 3~4 为主；第 6 章 4~5 为主。
 * ============================================================ */

export const pythonExtra2: {
  chapterId: string;
  lessons?: Lesson[];
  exercises: Exercise[];
}[] = [
  /* ============================================================
   *  第 2 章：列表、元组、字典与集合（扩展 20 题 + 2 个小节）
   * ============================================================ */
  {
    chapterId: 'python-2',
    lessons: [
      {
        id: 'py-l-2-5',
        title: '容器的性能与选型',
        content: `
## 为什么"选对容器"比"写对代码"更影响性能

同样一段统计逻辑，用 \`list\` 做成员判断和用 \`set\` 做，在百万级数据上可能差 100 倍以上。这一节把四种内置容器的复杂度摆在一起，让你在写代码前就能做出正确选择。

## 复杂度对照表

| 操作 | list | tuple | dict | set |
| --- | --- | --- | --- | --- |
| 按下标访问 | O(1) | O(1) | — | — |
| 按值查找 \`in\` | **O(n)** | O(n) | **O(1)** | **O(1)** |
| 尾部追加 | O(1) | — | — | — |
| 头部插入 | **O(n)** | — | — | — |
| 按 key 取值 | — | — | O(1) | — |
| 删除指定值 | O(n) | — | O(1) | O(1) |
| 内存占用（同元素数） | 中 | 小 | 大 | 中 |

**关键结论**：

1. \`in\` 在 list 上是线性扫描，在 set/dict 上是哈希查找；
2. list 的 \`insert(0, x)\` 与 \`pop(0)\` 都会移动全部元素，是 O(n)；
3. tuple 比 list 更省内存，适合"只读的定长记录"。

## 三个常见选型错误

**错误一：用 list 做"已见过"的去重集合**

\`\`\`python
seen = []
for x in data:
    if x not in seen:      # 每次都线性扫描
        seen.append(x)
\`\`\`

数据量到 10 万时，这段代码要比较约 50 亿次。正确做法是 \`seen = set()\`。

**错误二：用 list 当队列**

\`\`\`python
queue = [1, 2, 3]
queue.pop(0)               # O(n)，元素越移动越慢
\`\`\`

应该用 \`collections.deque\`，\`popleft()\` 是 O(1)。

**错误三：用 set 保存需要顺序的结果**

集合无序，输出顺序不可预期，且相同元素会被去重。需要"去重且保序"时用 \`dict.fromkeys()\`。

## 内存与哈希的代价

set 和 dict 用哈希表实现，为了保持查找效率，装载因子不会超过 2/3，
所以**内存开销明显大于 list**。元素很少时（例如 3 个元素），set 反而比 list 慢——
哈希计算和扩容的开销超过了线性扫描的收益。

> 经验法则：**元素数超过几十个、且需要频繁成员判断时，才值得换成 set/dict。**

## 一个真实的对账例子

\`\`\`python
# 找出"订单表里有但明细表里没有"的孤儿订单
order_ids = {o["order_id"] for o in orders}        # set：O(n) 构建
item_ids = {i["order_id"] for i in items}          # set：O(m) 构建
orphans = order_ids - item_ids                      # 集合差：O(n+m)
\`\`\`

如果用双重循环，复杂度是 O(n×m)，10 万单 × 10 万明细几乎跑不完。
`,
        tips: [
          {
            kind: 'performance',
            text: '把 `for x in big_list: if x in another_big_list` 改成先把后者转成 set，是数据分析脚本提速最立竿见影的一步。',
          },
          {
            kind: 'pitfall',
            text: '`set` 的元素顺序由哈希值决定，且会去重。需要"保持原始顺序"时用 `list(dict.fromkeys(seq))`。',
          },
          {
            kind: 'interview',
            text: '面试常问"为什么 dict 查找是 O(1)"：因为它用哈希函数算出下标直接定位，冲突时用开放寻址解决，平均只需 O(1) 次比较。',
          },
          {
            kind: 'note',
            text: '元素数量很少（< 50）时，list 的线性扫描可能比 set 更快，因为省掉了哈希与扩容开销。',
          },
        ],
        demos: [
          {
            title: 'list vs set 成员判断耗时对比',
            lang: 'python',
            code: `import time

n = 200_000
items = list(range(n))
check = list(range(n // 2, n))        # 需要判断的元素

t0 = time.perf_counter()
_ = [x for x in items if x in check]
t1 = time.perf_counter()

check_set = set(check)
_ = [x for x in items if x in check_set]
t2 = time.perf_counter()

print(f"list 成员判断：{(t1 - t0) * 1000:8.1f} ms")
print(f"set  成员判断：{(t2 - t1) * 1000:8.1f} ms")
print(f"加速比：约 {(t1 - t0) / (t2 - t1):.0f} 倍")`,
          },
          {
            title: '用集合运算做对账',
            lang: 'python',
            code: `orders = [{"order_id": i} for i in range(1, 11)]
items = [{"order_id": i} for i in [1, 1, 2, 3, 3, 3, 5, 8]]

order_ids = {o["order_id"] for o in orders}
item_ids = {i["order_id"] for i in items}

print("有订单无明细（孤儿订单）:", sorted(order_ids - item_ids))
print("有明细无订单（脏数据）:", sorted(item_ids - order_ids))
print("正常订单数:", len(order_ids & item_ids))
print("订单覆盖率: {:.0%}".format(len(order_ids & item_ids) / len(order_ids)))`,
          },
        ],
      },
      {
        id: 'py-l-2-6',
        title: '解包与星号表达式的实战用法',
        content: `
## 解包不只是"拆开元组"

Python 的解包（unpacking）能力远超多数人的认知，它在数据处理代码里能显著减少样板代码。

## 基础形式

\`\`\`python
x, y = 3, 4
a, b = b, a                       # 交换
name, age, city = ("张三", 28, "北京")
\`\`\`

## 星号收集

\`\`\`python
first, *rest = [1, 2, 3, 4]       # first=1, rest=[2, 3, 4]
*init, last = [1, 2, 3, 4]        # init=[1, 2, 3], last=4
head, *middle, tail = [1, 2, 3, 4, 5]
\`\`\`

星号只能出现一次，且收集到的永远是 **list**。

## 嵌套解包（常用于坐标、Records）

\`\`\`python
points = [(1, 2), (3, 4), (5, 6)]
for x, y in points:               # 循环变量直接解包
    print(x + y)

(data, (lat, lon)) = ("北京", (39.9, 116.4))
\`\`\`

## 函数调用中的星号展开

\`\`\`python
def report(title, *metrics, unit="元"):
    ...

args = ["销售", 100, 200]
report(*args)                     # 等价于 report("销售", 100, 200)

kwargs = {"unit": "万元"}
report("利润", 88, **kwargs)      # 等价于 report("利润", 88, unit="万元")
\`\`\`

这是"把配置字典传给函数"的标准写法，在调用第三方库时极其常见。

## 用星号解包构造新容器

\`\`\`python
a = [1, 2, 3]
b = [4, 5]
merged = [*a, *b]                 # [1, 2, 3, 4, 5]
more = [0, *a, 99]                # 在任意位置插入
\`\`\`

比 \`a + b\` 更灵活（可以在中间插值），可读性也更好。

## 解包与"忽略字段"

做数据清洗时经常只关心部分字段：

\`\`\`python
for row in rows:
    _, city, amount, _ = row       # 用下划线占位
    if amount > 1000:
        ...
\`\`\`

**注意**：多次使用同一个 \`_\` 不会报错，但会让静态检查工具报警告。
团队规范里通常把 \`_\` 约定为"故意忽略"。

## 解包的常见错误

\`\`\`python
# 数量不匹配
a, b = [1, 2, 3]        # ValueError: too many values to unpack

# 忘记星号
head, tail = [1, 2, 3]  # ValueError
\`\`\`

> 处理外部数据时（JSON、CSV 行），**先校验长度再解包**，否则一个脏行就能让整个任务崩掉。
`,
        tips: [
          {
            kind: 'pitfall',
            text: '对不确定长度的数据直接用 `a, b = row` 解包，遇到脏数据会抛 `ValueError` 并中断整个循环。生产代码应先用 `len(row)` 校验或用星号收集。',
          },
          {
            kind: 'leak',
            text: '`merged = [*a, *b, 99]` 比 `a + b + [99]` 更清晰，还能避免多次创建中间列表。',
          },
          {
            kind: 'interview',
            text: '"Python 里怎么交换两个变量"的答案 `a, b = b, a` 就是解包的应用——右侧先构造元组，再依次赋给左侧。',
          },
        ],
        demos: [
          {
            title: '星号解包的多种玩法',
            lang: 'python',
            code: `rows = [
    ["A1001", "北京", 320.5, "已完成"],
    ["A1002", "上海", 99.0, "已完成"],
    ["A1003", "广州", 1500.0, "已取消"],
]

total = 0.0
for oid, city, amount, status in rows:
    if status != "已完成":
        continue
    total += amount
print("有效销售额:", total)

first, *others = rows
print("第一行:", first, " 其余行数:", len(others))

merged = [*[1, 2], 3, *[4, 5]]
print("星号合并:", merged)

head, *middle, tail = [1, 2, 3, 4, 5]
print("head/middle/tail:", head, middle, tail)`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'py-2-x1',
        type: 'single',
        difficulty: 1,
        question:
          '执行 `lst = [1, 2, 3]; lst.append([4, 5]); print(len(lst))` 后，输出是？',
        options: [
          { value: 'A', text: '`3`' },
          { value: 'B', text: '`4`' },
          { value: 'C', text: '`5`' },
          { value: 'D', text: '报错' },
        ],
        answer: 'B',
        explanation:
          '`append` 把 `[4, 5]` 当作**一个元素**加进去，列表变成 `[1, 2, 3, [4, 5]]`，长度 4。若想展开插入，应使用 `extend([4, 5])`，结果是 `[1, 2, 3, 4, 5]`，长度为 5。',
        tags: ['列表', '方法'],
      },
      {
        id: 'py-2-x2',
        type: 'judge',
        difficulty: 1,
        question: '`[1, 2] + [3, 4]` 会得到 `[1, 2, 3, 4]`。',
        answer: true,
        explanation:
          '列表的 `+` 是**拼接**，返回新列表，不会修改原列表。注意 `[1, 2] * 2` 得到 `[1, 2, 1, 2]`（重复），这是另一个常用操作。',
        tags: ['列表', '运算符'],
      },
      {
        id: 'py-2-x3',
        type: 'single',
        difficulty: 2,
        question:
          '`d = {"a": 1}`; `print(d.setdefault("b", 0), d)` 的输出是？',
        options: [
          { value: 'A', text: '`0 {"a": 1, "b": 0}`' },
          { value: 'B', text: '`None {"a": 1}`' },
          { value: 'C', text: '`KeyError`' },
          { value: 'D', text: '`0 {"a": 1}`' },
        ],
        answer: 'A',
        explanation:
          '`setdefault(key, default)` 在键不存在时**写入**默认值并返回该值；键已存在时直接返回当前值、不做修改。它一次调用同时完成"判断 + 赋值 + 返回"。',
        tags: ['字典'],
      },
      {
        id: 'py-2-x4',
        type: 'multiple',
        difficulty: 2,
        question: '关于 `lst.extend(x)` 与 `lst.append(x)`，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '`append` 把 x 作为单个元素加入' },
          { value: 'B', text: '`extend` 把 x 中的元素逐个加入' },
          { value: 'C', text: '`extend("abc")` 会把字符串拆成 a、b、c 三个元素' },
          { value: 'D', text: '`extend` 只能接收列表' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          '`extend` 接受任意可迭代对象（字符串、元组、生成器都行），因此 `extend("abc")` 会拆成单个字符——这是常见误用。D 错误。',
        tags: ['列表'],
      },
      {
        id: 'py-2-x5',
        type: 'fill',
        difficulty: 2,
        question: '按分数从高到低排序列表 `records`（每项形如 `(姓名, 分数)`），补全代码：\n\n```python\nrecords.sort(key=___, reverse=True)\n```',
        blanks: [['lambda r: r[1]', 'lambda x: x[1]', 'itemgetter(1)']],
        explanation:
          '`key` 接收一个函数，返回用于比较的值。`lambda r: r[1]` 表示按元组第二项排序。也可用 `operator.itemgetter(1)`，性能略优。',
        tags: ['列表', '排序'],
      },
      {
        id: 'py-2-x6',
        type: 'single',
        difficulty: 3,
        question:
          '`a = [1, 2, 3]; b = a; b += [4]; print(a)` 的输出是？',
        options: [
          { value: 'A', text: '`[1, 2, 3]`' },
          { value: 'B', text: '`[1, 2, 3, 4]`' },
          { value: 'C', text: '`None`' },
          { value: 'D', text: '报错' },
        ],
        answer: 'B',
        explanation:
          '关键区别：`b += [4]` 对列表调用的是 `__iadd__`（就地扩展），**修改的是同一个列表对象**，因此 a 也变了。而 `b = b + [4]` 会创建新列表，a 不变。同理 `b *= 2` 也是原地操作。',
        tags: ['列表', '引用'],
      },
      {
        id: 'py-2-x7',
        type: 'judge',
        difficulty: 2,
        question: '`dict.keys()` 返回的视图对象会随字典的修改而动态更新。',
        answer: true,
        explanation:
          '`keys()` / `values()` / `items()` 返回的是**视图（view）**而不是列表副本，因此字典变化后视图内容也会变化。这也是不能在遍历视图时修改字典的原因。',
        tags: ['字典'],
      },
      {
        id: 'py-2-x8',
        type: 'multiple',
        difficulty: 3,
        question: '下列哪些操作会抛出 `KeyError`？（多选）',
        options: [
          { value: 'A', text: '`{"a": 1}["b"]`' },
          { value: 'B', text: '`{"a": 1}.get("b")`' },
          { value: 'C', text: '`{"a": 1}.pop("b")`' },
          { value: 'D', text: '`{"a": 1}.pop("b", None)`' },
        ],
        answer: ['A', 'C'],
        explanation:
          '`get` 不存在时返回 None（或指定默认值）；`pop(key, default)` 带默认值时不报错。只有下标访问 A 与不带默认值的 `pop` C 会抛 `KeyError`。',
        tags: ['字典', '异常'],
      },
      {
        id: 'py-2-x9',
        type: 'fill',
        difficulty: 3,
        question: '把两个列表 `keys = ["a", "b"]` 与 `vals = [1, 2]` 配对成字典，补全代码：\n\n```python\nd = ___(keys, vals)\n```',
        blanks: [['dict', 'zip']],
        explanation:
          '`dict(zip(keys, vals))` 用 `zip` 生成键值对，`dict` 构造函数直接转换。注：长度不等时 `zip` 按短的截断。',
        tags: ['字典', 'zip'],
      },
      {
        id: 'py-2-x10',
        type: 'code',
        difficulty: 2,
        question:
          '列表操作练习：给定 `nums = [5, 3, 8, 1, 9, 2]`，请：\n\n1. 计算最大值与最小值之和保存到 `extremes_sum`；\n2. 计算所有元素的平均值保存到 `avg`（保留 2 位小数）；\n3. 找出所有大于平均值的元素，存入列表 `above_avg`（保持原顺序）。',
        starterCode: `nums = [5, 3, 8, 1, 9, 2]

extremes_sum = ___
avg = ___
above_avg = ___
`,
        setupCode: '',
        expectedOutput: 'extremes_sum = 10, avg = 4.67, above_avg = [5, 8, 9]',
        tests: `assert extremes_sum == 10, f"extremes_sum 应为 10，实际 {extremes_sum}"
assert abs(avg - 4.67) < 1e-9, f"avg 应为 4.67，实际 {avg}"
assert above_avg == [5, 8, 9], f"above_avg 应为 [5, 8, 9]，实际 {above_avg}"
`,
        explanation:
          '```python\nextremes_sum = max(nums) + min(nums)\navg = round(sum(nums) / len(nums), 2)\nabove_avg = [n for n in nums if n > avg]\n```\n\n注意 `above_avg` 要用**未四舍五入**的均值比较更严谨，但本题数值恰好一致。总数为 28，均值 4.666…，四舍五入 4.67。',
        tags: ['列表', '聚合'],
      },
      {
        id: 'py-2-x11',
        type: 'code',
        difficulty: 2,
        question:
          '字典操作练习：给定 `prices = {"耳机": 299, "键盘": 499, "显示器": 1599, "鼠标": 89}`，请：\n\n1. 计算总价保存到 `total`；\n2. 找出最贵商品的名称保存到 `most_expensive`；\n3. 生成"涨价 10% 且四舍五入到整数"的新字典保存到 `new_prices`。',
        starterCode: `prices = {"耳机": 299, "键盘": 499, "显示器": 1599, "鼠标": 89}

total = ___
most_expensive = ___
new_prices = ___
`,
        setupCode: '',
        expectedOutput: "total = 2486, most_expensive = '显示器'",
        tests: `assert total == 2486, f"total 应为 2486，实际 {total}"
assert most_expensive == "显示器", f"最贵的应是 显示器，实际 {most_expensive}"
assert new_prices["显示器"] == 1759, f"显示器涨价后应为 1759，实际 {new_prices['显示器']}"
assert new_prices["鼠标"] == 98, f"鼠标涨价后应为 98（89*1.1=97.9 四舍五入），实际 {new_prices['鼠标']}"
`,
        explanation:
          '```python\ntotal = sum(prices.values())\nmost_expensive = max(prices, key=prices.get)\nnew_prices = {k: round(v * 1.1) for k, v in prices.items()}\n```\n\n`max(dict, key=dict.get)` 是"按键值找键"的惯用法。89 × 1.1 = 97.9，`round` 后为 98。',
        tags: ['字典'],
      },
      {
        id: 'py-2-x12',
        type: 'code',
        difficulty: 3,
        question:
          '集合运算实战：两个班级名单 `class_a` 与 `class_b`（可能有重复姓名）。请计算：\n\n1. 两个班都有的学生数保存到 `both_count`；\n2. 只在 A 班的学生名单（按姓名排序）保存到 `only_a`；\n3. 两班合并后的去重总人数保存到 `total_unique`。',
        starterCode: `class_a = ["张三", "李四", "王五", "赵六", "张三"]
class_b = ["王五", "赵六", "孙七", "周八"]

both_count = ___
only_a = ___
total_unique = ___
`,
        setupCode: '',
        expectedOutput: "both_count = 2, only_a = ['张三', '李四'], total_unique = 6",
        tests: `assert both_count == 2, f"both_count 应为 2，实际 {both_count}"
assert only_a == ["张三", "李四"], f"only_a 应为 ['张三', '李四']，实际 {only_a}"
assert total_unique == 6, f"total_unique 应为 6，实际 {total_unique}"
`,
        explanation:
          '```python\nset_a = set(class_a)\nset_b = set(class_b)\nboth_count = len(set_a & set_b)\nonly_a = sorted(set_a - set_b)\ntotal_unique = len(set_a | set_b)\n```\n\n必须先转成 set 才能做集合运算；`class_a` 中"张三"重复，转 set 后自动去重，所以 A 班实际 4 人。',
        tags: ['集合'],
      },
      {
        id: 'py-2-x13',
        type: 'single',
        difficulty: 3,
        question: '`t = (1, 2, 3)`，执行 `t2 = t + (4,)` 后，`t` 和 `t2` 分别是？',
        options: [
          { value: 'A', text: '`t` 变成 `(1,2,3,4)`，`t2` 相同' },
          { value: 'B', text: '`t` 仍是 `(1,2,3)`，`t2` 是 `(1,2,3,4)`' },
          { value: 'C', text: '两者都是 `None`' },
          { value: 'D', text: '报错，元组不能相加' },
        ],
        answer: 'B',
        explanation:
          '元组不可变，`+` 返回**新元组**，原元组不变。注意 `(4,)` 的逗号不能少，`(4)` 只是整数 4。',
        tags: ['元组'],
      },
      {
        id: 'py-2-x14',
        type: 'fill',
        difficulty: 2,
        question:
          '统计句子中每个单词出现的次数并取出前 3 名，补全代码：\n\n```python\nfrom collections import Counter\ncnt = Counter(sentence.split())\nprint(cnt.___(3))\n```',
        blanks: [['most_common']],
        explanation: '`Counter.most_common(n)` 返回按次数降序的前 n 项列表，每项是 `(元素, 次数)` 元组。',
        tags: ['Counter'],
      },
      {
        id: 'py-2-x15',
        type: 'code',
        difficulty: 3,
        question:
          '嵌套结构处理：`orders` 是"城市 → 订单金额列表"的字典。请计算每个城市的销售总额与订单数，并按总额降序返回列表，每项为 `{"city": ..., "total": float, "count": int}`，保存到 `report`。',
        starterCode: `orders = {
    "北京": [320.0, 88.5, 200.0],
    "上海": [150.0, 60.0],
    "广州": [420.0],
}

report = ___
`,
        setupCode: '',
        expectedOutput: "北京 total=608.5 count=3 排第一",
        tests: `assert [r["city"] for r in report] == ["北京", "广州", "上海"], f"排序不正确：{[r['city'] for r in report]}"
assert report[0]["total"] == 608.5 and report[0]["count"] == 3, f"北京数据不正确：{report[0]}"
assert report[1]["total"] == 420.0 and report[1]["count"] == 1
`,
        explanation:
          '```python\nreport = [\n    {"city": c, "total": round(sum(v), 2), "count": len(v)}\n    for c, v in orders.items()\n]\nreport.sort(key=lambda r: -r["total"])\n```\n\n遍历 `dict.items()` 同时拿到键和值；排序键用 `-r["total"]` 实现降序。',
        tags: ['字典', '排序'],
      },
      {
        id: 'py-2-x16',
        type: 'judge',
        difficulty: 2,
        question: '`list("abc")` 的结果是 `["a", "b", "c"]`。',
        answer: true,
        explanation:
          '`list()` 构造函数接受任意可迭代对象，字符串是可迭代的，因此会被拆成单个字符。同理 `list(range(3))` 得到 `[0, 1, 2]`。',
        tags: ['列表', '类型转换'],
      },
      {
        id: 'py-2-x17',
        type: 'multiple',
        difficulty: 3,
        question: '关于 `copy.deepcopy` 与浅拷贝（`list.copy()` / `[:]`），下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '浅拷贝只复制最外层容器，内层可变对象仍共享' },
          { value: 'B', text: '`deepcopy` 递归复制所有层级，开销更大' },
          { value: 'C', text: '对一维列表，浅拷贝与深拷贝效果相同' },
          { value: 'D', text: '`deepcopy` 无法处理循环引用' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          '`deepcopy` 内部维护了已复制对象的内存表（memo），**能够**正确处理循环引用，D 错误。A、B、C 都正确——一维列表没有嵌套可变对象，所以两种拷贝效果一致。',
        tags: ['拷贝'],
      },
      {
        id: 'py-2-x18',
        type: 'open',
        difficulty: 3,
        question:
          '在处理一份 100 万条的交易记录时，你需要：(1) 判断每笔交易是否属于黑名单用户；(2) 统计每个描述字段的出现次数；(3) 保持用户 ID 的原始顺序。请分别说明你会选用哪种容器，并说明理由。',
        referenceAnswer: `**(1) 黑名单判断 → 用 set**

黑名单是"只读、需要大量重复成员判断"的场景。set 的 \`in\` 是 O(1)，
100 万次判断也只需线性总时间；用 list 则是 O(n×m)，百万级会慢 100 倍以上。

**(2) 频次统计 → 用 dict 或 collections.Counter**

Counter 是 dict 的子类，\`c[word] += 1\` 是 O(1)，
总复杂度 O(n)。它还能直接拿到 \`most_common(n)\`，省掉排序代码。

**(3) 保序去重 → 用 dict（\`dict.fromkeys\`）**

set 无序，无法保证原始顺序；\`dict.fromkeys(ids)\` 利用 dict 键唯一且插入有序的特性，
返回保持首次出现顺序的去重结果，再 \`list()\` 转换即可。

**注意内存**：set/dict 的哈希表内存开销大于 list，
若只做一次线性处理（如求和），应直接用 list 或生成器遍历，不必转成 set。`,
        rubric: [
          { point: '黑名单判断选 set，并说明 O(1) 查找', score: 2 },
          { point: '频次统计选 dict/Counter，说明 O(1) 累加', score: 1 },
          { point: '保序去重选 dict.fromkeys，说明 dict 保序', score: 2 },
          { point: '提及内存开销或"只遍历一次用 list"的取舍', score: 1 },
        ],
        keywords: ['set', '哈希', 'O(1)', 'Counter', 'dict.fromkeys', '保序', '内存'],
        explanation:
          '本题的核心是"容器选型 = 操作复杂度 + 语义需求"的双重判断。能同时说出复杂度理由与保序/内存取舍的回答质量较高。',
        tags: ['容器选型', '性能'],
      },
      {
        id: 'py-2-x19',
        type: 'code',
        difficulty: 4,
        question:
          '综合：给定 `sales = [(城市, 品类, 金额), ...]`，请按 `(城市, 品类)` 汇总金额，返回按金额降序的列表，每项 `{"city","cat","amount"}`，保存到 `summary`。金额为负数视为退货，不计入汇总（但要记数到 `refund_count`）。',
        starterCode: `from collections import defaultdict

sales = [
    ("北京", "数码", 320.0),
    ("北京", "数码", -50.0),
    ("上海", "服装", 150.0),
    ("北京", "服装", 88.0),
    ("上海", "服装", 200.0),
    ("广州", "数码", 420.0),
    ("广州", "数码", -20.0),
]

summary = ___
refund_count = ___
`,
        setupCode: '',
        expectedOutput: 'summary 前三项按金额降序；refund_count = 2',
        tests: `assert refund_count == 2, f"refund_count 应为 2，实际 {refund_count}"
assert summary[0] == {"city": "广州", "cat": "数码", "amount": 420.0}, f"第一名应为广州数码 420，实际 {summary[0]}"
assert summary[1]["amount"] == 408.5, f"第二名应为 408.5，实际 {summary[1]}"
assert summary[2]["amount"] == 350.0, f"第三名应为上海服装 350，实际 {summary[2]}"
assert len(summary) == 4, f"应汇总出 4 个组合，实际 {len(summary)}"
assert all(set(r.keys()) == {"city", "cat", "amount"} for r in summary)
`,
        explanation:
          '```python\nagg = defaultdict(float)\nrefund_count = 0\nfor city, cat, amt in sales:\n    if amt < 0:\n        refund_count += 1\n        continue\n    agg[(city, cat)] += amt\nsummary = [{"city": c, "cat": k, "amount": round(v, 2)} for (c, k), v in agg.items()]\nsummary.sort(key=lambda r: -r["amount"])\n```\n\n关键点：用元组作为复合键；先过滤退货再聚合；排序键取负实现降序。',
        tags: ['综合', '字典', '聚合'],
      },
      {
        id: 'py-2-x20',
        type: 'single',
        difficulty: 1,
        question: '`len({1, 2, 2, 3})` 的结果是？',
        options: [
          { value: 'A', text: '`4`' },
          { value: 'B', text: '`3`' },
          { value: 'C', text: '`2`' },
          { value: 'D', text: '报错' },
        ],
        answer: 'B',
        explanation: '集合自动去重，`{1, 2, 2, 3}` 实际是 `{1, 2, 3}`，长度为 3。',
        tags: ['集合'],
      },
    ],
  },

  /* ============================================================
   *  第 3 章：控制流与函数（扩展 20 题 + 2 个小节）
   * ============================================================ */
  {
    chapterId: 'python-3',
    lessons: [
      {
        id: 'py-l-3-5',
        title: '函数式工具：map / filter / sorted 与高阶函数',
        content: `
## 为什么数据分析离不开高阶函数

数据清洗本质上是"对一堆数据反复施加变换"。高阶函数（把函数作为参数传入的函数）让你用**声明式**写法表达这些变换，代码更短、意图更清晰，也更容易与 pandas 的 map/apply 衔接。

## 四件套：map、filter、sorted、sum

| 函数 | 作用 | 等价的推导式 |
| --- | --- | --- |
| \`map(f, seq)\` | 对每个元素应用 f | \`[f(x) for x in seq]\` |
| \`filter(p, seq)\` | 保留使 p 为真的元素 | \`[x for x in seq if p(x)]\` |
| \`sorted(seq, key=f)\` | 按 f 的值排序 | 无直接等价 |
| \`sum(seq)\` | 求和 | 无直接等价 |

\`\`\`python
nums = ["1", "2", "3"]
print(list(map(int, nums)))            # [1, 2, 3]
print(list(filter(lambda x: x > "1", nums)))   # ['2', '3']
print(sorted(nums, key=int, reverse=True))     # ['3', '2', '1']
\`\`\`

## map 返回的是迭代器

这是最容易被忽略的细节：

\`\`\`python
m = map(int, ["1", "2"])
print(m)              # <map object at 0x...>
print(list(m))        # [1, 2]
print(list(m))        # []  ← 只能消费一次！
\`\`\`

想多次使用必须先转成 list，否则第二次得到空结果，而且**不会报错**。

## 推导式 vs map

多数情况下推导式更易读。但在**已有现成函数**时，\`map\` 更简洁：

\`\`\`python
# 有现成函数
list(map(float, values))
# 需要现场写逻辑
[f(x) * 2 for x in values]
\`\`\`

性能上两者接近，\`map\` 在调用内置函数时略快（少了 Python 层循环）。

## sorted 的 key 是万能排序器

\`\`\`python
records = [{"name": "张三", "score": 88}, {"name": "李四", "score": 95}]

# 按分数降序
sorted(records, key=lambda r: r["score"], reverse=True)

# 多级排序：分数降序、姓名升序
sorted(records, key=lambda r: (-r["score"], r["name"]))

# 按长度排序字符串
sorted(["bbb", "a", "cc"], key=len)
\`\`\`

**稳定排序**意味着：键相同时保持原有相对顺序，因此可以"先按次要条件排，再按主要条件排"。

## 与 pandas 的衔接

\`\`\`python
df["level"] = df["score"].map(lambda s: "高" if s >= 90 else "低")
df["city"].apply(str.strip)
\`\`\`

理解 map 的语义后，pandas 的 \`Series.map\` / \`apply\` 就会非常自然——
它们本质上就是对每个元素或每一行应用同一个函数。
`,
        tips: [
          {
            kind: 'pitfall',
            text: '`map` / `filter` 返回迭代器，只能遍历一次。重复 `list(map(...))` 前要先确认它还是同一个对象——第二次往往是空列表。',
          },
          {
            kind: 'performance',
            text: '调用内置函数（`int`、`float`、`str.strip`）时 `map` 通常比推导式略快；需要现场写逻辑时，推导式的可读性更好。',
          },
          {
            kind: 'leak',
            text: '`sorted(seq, key=...)` 不会修改原序列，且 Python 的排序是稳定的。多级排序可以先用 `key` 返回元组，也可以"先次后主"连排两次。',
          },
        ],
        demos: [
          {
            title: 'map / filter 的迭代器陷阱',
            lang: 'python',
            code: `raw = [" 12 ", "7", "abc", " 9"]

# 安全转换：过滤掉非法值
def to_int(s):
    try:
        return int(s.strip())
    except ValueError:
        return None

cleaned = list(filter(lambda x: x is not None, map(to_int, raw)))
print("清洗后:", cleaned)
print("求和:", sum(cleaned), " 均值:", round(sum(cleaned) / len(cleaned), 2))

# 迭代器只能消费一次
m = map(int, ["1", "2"])
print("第一遍:", list(m))
print("第二遍:", list(m))`,
          },
          {
            title: '多级排序实战',
            lang: 'python',
            code: `orders = [
    ("A1", "北京", 320.0, "金卡"),
    ("A2", "上海", 150.0, "银卡"),
    ("A3", "北京", 320.0, "银卡"),
    ("A4", "广州", 420.0, "金卡"),
]

# 金额降序，同金额按城市升序，再按会员等级
result = sorted(orders, key=lambda o: (-o[2], o[1], o[3]))
for o in result:
    print(o)

print("\\n只按金额排序（稳定排序，同金额保持原顺序）：")
for o in sorted(orders, key=lambda o: -o[2]):
    print(o[0], o[2])`,
          },
        ],
      },
      {
        id: 'py-l-3-6',
        title: '递归与迭代的取舍',
        content: `
## 递归的本质

递归是"函数调用自身"来解决问题，核心要素有两个：

1. **基线条件（base case）**：什么时候停止；
2. **递推关系**：如何把问题缩小成同类子问题。

\`\`\`python
def factorial(n):
    if n <= 1:          # 基线条件
        return 1
    return n * factorial(n - 1)   # 递推关系
\`\`\`

## 递归的代价：调用栈

每次递归调用都会在**调用栈**上新增一帧，保存局部变量和返回地址。Python 默认递归深度约 1000 层，超过就抛 \`RecursionError\`：

\`\`\`python
def count_down(n):
    return 0 if n == 0 else count_down(n - 1)

count_down(5000)     # RecursionError: maximum recursion depth exceeded
\`\`\`

可以用 \`sys.setrecursionlimit()\` 调高，但这只是把崩溃点往后推——每层仍占用真实内存，深度太大可能直接导致进程崩溃。

## 递归 vs 迭代

| 维度 | 递归 | 迭代 |
| --- | --- | --- |
| 可读性 | 树形/嵌套结构更自然 | 线性逻辑更清晰 |
| 性能 | 每次调用有额外开销，通常更慢 | 更快 |
| 深度限制 | 受调用栈限制（约 1000 层） | 无限制 |
| 内存 | 每层一个栈帧 | 常数级 |

**经验法则**：

- 处理**树、嵌套 JSON、文件目录**等天然递归结构时，递归更清晰；
- 处理**列表、序列**时，用循环或推导式；
- 数据量大的场景，优先迭代或生成器。

## 尾递归与"Python 不支持尾递归优化"

某些语言会把"最后一步是自身调用"的尾递归优化成循环，Python **不会**。
因此即使写成尾递归形式，深度限制依然存在。

\`\`\`python
# 即使这样写，Python 也不会优化
def sum_tail(n, acc=0):
    if n == 0:
        return acc
    return sum_tail(n - 1, acc + n)
\`\`\`

## 把递归改写成迭代

最常见的做法是用**显式栈**模拟调用栈：

\`\`\`python
def flatten(node):
    """把嵌套列表拍平，避免递归深度限制。"""
    stack = [node]
    result = []
    while stack:
        cur = stack.pop()
        if isinstance(cur, list):
            stack.extend(reversed(cur))   # 反转保证顺序
        else:
            result.append(cur)
    return result

flatten([1, [2, [3, [4, 5]]], 6])   # [1, 2, 3, 4, 5, 6]
\`\`\`

## 数据分析中的实际场景

- **解析嵌套 JSON**（接口返回的多层结构）：递归最自然；
- **计算目录大小**：递归或 \`os.walk\`（内部是迭代）；
- **树形结构展开成宽表**（如商品类目树）：递归，但深度通常很浅（< 10 层），完全安全。
`,
        tips: [
          {
            kind: 'pitfall',
            text: '忘记写基线条件，或基线条件永远无法到达（如 `n <= 1` 但参数是负数递减），都会导致 `RecursionError`。写递归前先把终止条件想清楚。',
          },
          {
            kind: 'performance',
            text: '递归比循环慢，因为每次调用都要构建栈帧。能用 \`sum()\`、推导式、生成器表达的逻辑，不要用递归。',
          },
          {
            kind: 'interview',
            text: '"Python 有尾递归优化吗"的答案是**没有**。这个知识点常被用来考察候选人对语言实现细节的了解。',
          },
        ],
        demos: [
          {
            title: '递归与迭代对比',
            lang: 'python',
            code: `def fact_rec(n):
    return 1 if n <= 1 else n * fact_rec(n - 1)

def fact_iter(n):
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result

print("递归 10! =", fact_rec(10))
print("迭代 10! =", fact_iter(10))

# 用显式栈拍平嵌套列表（不受递归深度限制）
def flatten(node):
    stack, out = [node], []
    while stack:
        cur = stack.pop()
        if isinstance(cur, list):
            stack.extend(reversed(cur))
        else:
            out.append(cur)
    return out

print("拍平结果:", flatten([1, [2, [3, [4, 5]]], 6]))`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'py-3-x1',
        type: 'single',
        difficulty: 1,
        question: '`if` 语句中，下列哪个条件的写法是**正确**的？',
        options: [
          { value: 'A', text: '`if x = 5:`' },
          { value: 'B', text: '`if x == 5:`' },
          { value: 'C', text: '`if x === 5:`' },
          { value: 'D', text: '`if x eq 5:`' },
        ],
        answer: 'B',
        explanation:
          '`=` 是赋值，`==` 是比较。`if x = 5:` 在 Python 中是语法错误（不像某些语言允许在条件里赋值）。`===` 是 JavaScript 的写法，Python 没有。',
        tags: ['条件分支'],
      },
      {
        id: 'py-3-x2',
        type: 'judge',
        difficulty: 1,
        question: '`elif` 分支可以有任意多个，但 `else` 分支只能有一个。',
        answer: true,
        explanation:
          '一个 `if` 可以跟任意多个 `elif`，但最多一个 `else`，且 `else` 必须放在最后。',
        tags: ['条件分支'],
      },
      {
        id: 'py-3-x3',
        type: 'single',
        difficulty: 2,
        question: '`range(1, 10, 3)` 生成的结果是？',
        options: [
          { value: 'A', text: '`[1, 4, 7]`' },
          { value: 'B', text: '`[1, 4, 7, 10]`' },
          { value: 'C', text: '`[1, 3, 5, 7, 9]`' },
          { value: 'D', text: '`[3, 6, 9]`' },
        ],
        answer: 'A',
        explanation:
          '`range(start, stop, step)` 从 1 开始、步长 3、不含 10，得到 1、4、7。注意 `range` 返回的是惰性对象，`list(range(1, 10, 3))` 才能看到具体内容。',
        tags: ['循环'],
      },
      {
        id: 'py-3-x4',
        type: 'multiple',
        difficulty: 2,
        question: '关于函数的 `return`，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '没有 `return` 的函数返回 `None`' },
          { value: 'B', text: '`return` 可以返回多个值（其实是返回元组）' },
          { value: 'C', text: '执行到 `return` 后，函数立即结束' },
          { value: 'D', text: '一个函数只能有一个 `return` 语句' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          '一个函数可以有多个 `return`（例如不同分支各自返回），但每次调用只会执行到其中一个。D 错误。',
        tags: ['函数'],
      },
      {
        id: 'py-3-x5',
        type: 'fill',
        difficulty: 2,
        question: '补全代码，让循环在找到目标后立即结束：\n\n```python\nfor item in items:\n    if item == target:\n        print("找到了")\n        ___\n```',
        blanks: [['break']],
        explanation: '`break` 立即跳出整个循环；`continue` 只是跳过本次迭代继续下一次。',
        tags: ['循环'],
      },
      {
        id: 'py-3-x6',
        type: 'single',
        difficulty: 3,
        question:
          '```python\ndef f(x, lst=[]):\n    lst.append(x)\n    return lst\nf(1); f(2); print(f(3))\n```\n输出是？',
        options: [
          { value: 'A', text: '`[3]`' },
          { value: 'B', text: '`[1, 2, 3]`' },
          { value: 'C', text: '`[1]`' },
          { value: 'D', text: '报错' },
        ],
        answer: 'B',
        explanation:
          '默认参数在**定义时**只求值一次，`[]` 被所有调用共享，因此三次调用累积成 `[1, 2, 3]`。正确写法是把默认值设为 `None`，在函数体内判断后再创建列表。',
        tags: ['函数', '默认参数'],
      },
      {
        id: 'py-3-x7',
        type: 'judge',
        difficulty: 2,
        question: '函数内部对传入列表做 `append` 操作，会修改调用方的原列表。',
        answer: true,
        explanation:
          '列表是可变对象，按"对象引用"传递，函数内的原地修改会反映到外部。但如果在函数内重新赋值（`lst = [...]`），只改变了局部变量指向，不影响外部。',
        tags: ['函数', '引用'],
      },
      {
        id: 'py-3-x8',
        type: 'multiple',
        difficulty: 3,
        question: '下列哪些是良好的函数设计实践？（多选）',
        options: [
          { value: 'A', text: '一个函数只做一件事' },
          { value: 'B', text: '有清晰的 docstring 说明参数与返回值' },
          { value: 'C', text: '尽量使用全局变量传递中间结果' },
          { value: 'D', text: '把"输入 → 输出"做成纯函数，减少副作用' },
        ],
        answer: ['A', 'B', 'D'],
        explanation:
          '使用全局变量会让数据流难以追踪、函数难以测试，是反模式。A、B、D 都是公认的最佳实践。',
        tags: ['函数', '最佳实践'],
      },
      {
        id: 'py-3-x9',
        type: 'fill',
        difficulty: 3,
        question:
          '写一个仅限关键字参数：函数定义为 `def f(a, *, b)`，调用时必须写成 `f(1, ___)`。',
        blanks: [['b=2', 'b = 2', 'b=0']],
        explanation:
          '`*` 之后的参数只能按关键字传递。这种设计能避免调用方按位置传参时"传错位置"的低级错误，常用于参数较多或含义容易混淆的函数。',
        tags: ['函数', '参数'],
      },
      {
        id: 'py-3-x10',
        type: 'code',
        difficulty: 2,
        question:
          '条件分支练习：编写 `grade(score)`，返回等级字符串：\n\n- ≥90 → `优秀`；60~89 → `及格`；<60 → `不及格`；非数字 → `无效`',
        starterCode: `def grade(score):
    # 在这里实现
    return ___

out = [grade(95), grade(72), grade(50), grade("abc")]
`,
        setupCode: '',
        expectedOutput: "['优秀', '及格', '不及格', '无效']",
        tests: `assert out == ["优秀", "及格", "不及格", "无效"], f"结果不正确：{out}"
assert grade(90) == "优秀", "边界值 90 应为优秀"
assert grade(60) == "及格", "边界值 60 应为及格"
assert grade(59.9) == "不及格"
`,
        explanation:
          '```python\ndef grade(score):\n    if not isinstance(score, (int, float)) or isinstance(score, bool):\n        return "无效"\n    if score >= 90:\n        return "优秀"\n    if score >= 60:\n        return "及格"\n    return "不及格"\n```\n\n先做类型校验（护栏），再按**从高到低**判断区间——如果先判断 `>= 60`，95 分也会返回"及格"。',
        tags: ['条件分支', '函数'],
      },
      {
        id: 'py-3-x11',
        type: 'code',
        difficulty: 2,
        question:
          '循环练习：给定 `values = [3, -1, 4, -1, 5, -9, 2]`，请：\n\n1. 过滤掉所有负数，得到 `positives`；\n2. 计算正数的和 `pos_sum`；\n3. 找出第一个负数在**原列表**中的下标 `first_neg_idx`（找不到则为 -1）。',
        starterCode: `values = [3, -1, 4, -1, 5, -9, 2]

positives = ___
pos_sum = ___
first_neg_idx = ___
`,
        setupCode: '',
        expectedOutput: 'positives=[3,4,5,2], pos_sum=14, first_neg_idx=1',
        tests: `assert positives == [3, 4, 5, 2], f"positives 不正确：{positives}"
assert pos_sum == 14, f"pos_sum 应为 14，实际 {pos_sum}"
assert first_neg_idx == 1, f"first_neg_idx 应为 1，实际 {first_neg_idx}"
`,
        explanation:
          '```python\npositives = [v for v in values if v >= 0]\npos_sum = sum(positives)\nfirst_neg_idx = next((i for i, v in enumerate(values) if v < 0), -1)\n```\n\n`next(生成器, 默认值)` 是"找第一个满足条件的元素"的优雅写法，比手写循环 + break 更简洁。',
        tags: ['循环', '列表'],
      },
      {
        id: 'py-3-x12',
        type: 'code',
        difficulty: 3,
        question:
          '函数练习：编写 `stats(values)`，返回 `(最小值, 最大值, 平均值)` 三元组，平均值保留 2 位小数。**空列表返回 `(None, None, None)`**。\n\n调用 `out = stats([3, 8, 1, 9, 5])`。',
        starterCode: `def stats(values):
    # 在这里实现（注意空列表的处理）
    return ___

out = stats([3, 8, 1, 9, 5])
`,
        setupCode: '',
        expectedOutput: '(1, 9, 5.2)',
        tests: `assert out == (1, 9, 5.2), f"结果不正确：{out}"
assert stats([]) == (None, None, None), "空列表应返回 (None, None, None)"
assert stats([7]) == (7, 7, 7.0), f"单元素结果不正确：{stats([7])}"
`,
        explanation:
          '```python\ndef stats(values):\n    if not values:\n        return None, None, None\n    return min(values), max(values), round(sum(values) / len(values), 2)\n```\n\n**提前返回**（guard clause）处理空输入，避免 `ZeroDivisionError`；主逻辑保持在最外层、不做多余缩进。',
        tags: ['函数', '边界处理'],
      },
      {
        id: 'py-3-x13',
        type: 'single',
        difficulty: 3,
        question: '下列关于作用域的说法，正确的是？',
        options: [
          { value: 'A', text: '函数内可以直接修改全局变量，无需任何声明' },
          { value: 'B', text: '在函数内给变量赋值会创建局部变量，除非用 `global` 声明' },
          { value: 'C', text: '`nonlocal` 用于声明全局变量' },
          { value: 'D', text: 'Python 没有作用域概念' },
        ],
        answer: 'B',
        explanation:
          '函数内赋值默认创建局部变量；要修改模块级变量需 `global`，要修改外层函数变量需 `nonlocal`。A 会因为创建局部变量而报 `UnboundLocalError`（先读后赋）。',
        tags: ['作用域'],
      },
      {
        id: 'py-3-x14',
        type: 'code',
        difficulty: 4,
        question:
          '嵌套循环优化：给定 `products`（含 `id`、`price`）与 `items`（含 `pid`、`qty`），请用字典索引的方式计算这批明细的总销售额 `total` 与涉及的**不同商品数** `n_products`。',
        starterCode: `products = [{"id": 1, "price": 19.9}, {"id": 2, "price": 35.0}, {"id": 3, "price": 8.5}]
items = [
    {"pid": 1, "qty": 3},
    {"pid": 2, "qty": 1},
    {"pid": 3, "qty": 4},
    {"pid": 1, "qty": 1},
]

total = ___
n_products = ___
`,
        setupCode: '',
        expectedOutput: 'total = 148.6, n_products = 3',
        tests: `assert abs(total - 148.6) < 1e-9, f"total 应为 148.6，实际 {total}"
assert n_products == 3, f"n_products 应为 3，实际 {n_products}"
`,
        explanation:
          '```python\nprice_map = {p["id"]: p["price"] for p in products}\ntotal = 0.0\nids = set()\nfor it in items:\n    price = price_map.get(it["pid"])\n    if price is None:\n        continue\n    total += price * it["qty"]\n    ids.add(it["pid"])\nn_products = len(ids)\n```\n\n19.9×3 + 35 + 8.5×4 + 19.9 = 148.6。用字典把"每次遍历商品表"的 O(n×m) 降为 O(n+m)。',
        tags: ['循环', '性能'],
      },
      {
        id: 'py-3-x15',
        type: 'judge',
        difficulty: 2,
        question: '`while True:` 循环如果没有 `break`，程序会一直运行下去。',
        answer: true,
        explanation:
          '`while True` 是无限循环，必须靠 `break`、`return`、`raise` 或 `sys.exit()` 退出。在数据处理中常用于"不断读取下一批数据直到读完"的模式。',
        tags: ['循环'],
      },
      {
        id: 'py-3-x16',
        type: 'multiple',
        difficulty: 3,
        question: '下列哪些写法能正确遍历字典的键和值？（多选）',
        options: [
          { value: 'A', text: '`for k, v in d.items():`' },
          { value: 'B', text: '`for k in d: v = d[k]`' },
          { value: 'C', text: '`for k, v in d:`' },
          { value: 'D', text: '`for k in d.keys(): v = d[k]`' },
        ],
        answer: ['A', 'B', 'D'],
        explanation:
          '直接 `for k, v in d` 会尝试把每个键解包成两个值，键是字符串时会按字符拆分或直接报错，是常见错误。A 是推荐写法。',
        tags: ['字典', '循环'],
      },
      {
        id: 'py-3-x17',
        type: 'fill',
        difficulty: 3,
        question: '补全代码，用最短路写法实现"找不到则返回 -1"：\n\n```python\nidx = next((i for i, v in enumerate(lst) if v == target), ___)\n```',
        blanks: [['-1']],
        explanation: '`next(iterable, default)` 在迭代器耗尽时返回 default，避免抛 `StopIteration`。',
        tags: ['循环', '内置函数'],
      },
      {
        id: 'py-3-x18',
        type: 'open',
        difficulty: 4,
        question:
          '请解释"可变默认参数"陷阱的成因，说明它为什么危险，并给出两种正确的写法。',
        referenceAnswer: `**成因**：函数的默认参数值在**函数定义时**只求值一次，而不是每次调用时重新求值。
\`def f(x, bucket=[])\` 中的 \`[]\` 在定义时创建了**唯一一个**列表对象，
此后所有未传 \`bucket\` 的调用都共享这一个对象。

**危险之处**：

1. **跨调用累积**：第一次的结果会"泄漏"到第二次，产生难以解释的数据；
2. **难以察觉**：代码不报错，只是结果错误，排查成本极高；
3. **线程不安全**：在多线程/异步场景下，共享列表可能被并发修改；
4. **测试不可靠**：单元测试的通过与否取决于执行顺序。

**正确写法**：

\`\`\`python
# 写法一：默认 None，函数体内初始化
def add(item, bucket=None):
    if bucket is None:
        bucket = []
    bucket.append(item)
    return bucket

# 写法二：让调用方显式传入（无默认值）
def add(item, bucket):
    bucket.append(item)
    return bucket
\`\`\`

**补充**：不可变默认值（数字、字符串、元组、\`None\`）是安全的；
只有 \`list\`、\`dict\`、\`set\` 这类可变对象才有这个问题。`,
        rubric: [
          { point: '说明默认参数在定义时只求值一次', score: 2 },
          { point: '指出共享同一对象导致跨调用累积', score: 1 },
          { point: '列举实际危害（结果错误、难以排查、线程/测试问题）', score: 2 },
          { point: '给出 None + 初始化的正确写法', score: 1 },
        ],
        keywords: ['默认参数', '定义时求值', '共享', 'None', '可变对象'],
        explanation:
          '这是 Python 面试中最经典的问题之一。答题时能说清"定义时求值一次"这个机制，基本就抓住了核心。',
        tags: ['函数', '面试题'],
      },
      {
        id: 'py-3-x19',
        type: 'code',
        difficulty: 4,
        question:
          '综合练习：实现 `word_count(text, min_len=3)`，统计文本中长度 ≥ min_len 的单词出现次数，返回按次数降序、同次数按字典序升序排列的列表，每项为 `(单词, 次数)`。\n\n文本需要先统一转小写，并去掉常见的标点（`.,!?`）。',
        starterCode: `import re

text = "Data is data. Analysis data, analysis! Python is python."

def word_count(text, min_len=3):
    # 在这里实现
    return ___

out = word_count(text)
`,
        setupCode: '',
        expectedOutput: "[('data', 3), ('analysis', 2), ('python', 2)]",
        tests: `assert out[0] == ("data", 3), f"第一名应为 ('data', 3)，实际 {out[0]}"
assert ("analysis", 2) in out and ("python", 2) in out, f"结果缺少 analysis/python：{out}"
assert [w for w, _ in out] == ["data", "analysis", "python"], f"排序不正确：{out}"
assert all(len(w) >= 3 for w, _ in out), "min_len 过滤不正确"
assert word_count("ab cde ab", min_len=2)[0] == ("ab", 2), "min_len 参数未生效"
`,
        explanation:
          '```python\ndef word_count(text, min_len=3):\n    words = re.findall(r"[a-z]+", text.lower())\n    words = [w for w in words if len(w) >= min_len]\n    from collections import Counter\n    cnt = Counter(words)\n    return sorted(cnt.items(), key=lambda kv: (-kv[1], kv[0]))\n```\n\n`re.findall(r"[a-z]+", ...)` 一次性去掉标点和数字；排序键 `(-次数, 单词)` 实现"次数降序、同次数字典升序"。',
        tags: ['综合', 'Counter', '排序'],
      },
      {
        id: 'py-3-x20',
        type: 'single',
        difficulty: 2,
        question: '`x = 5; print(1 < x < 10)` 的输出是？',
        options: [
          { value: 'A', text: '`True`' },
          { value: 'B', text: '`False`' },
          { value: 'C', text: '`1`' },
          { value: 'D', text: '报错' },
        ],
        answer: 'A',
        explanation:
          'Python 支持链式比较，`1 < x < 10` 等价于 `1 < x and x < 10`，结果为 True。这种写法比 `x > 1 and x < 10` 更简洁且不会重复计算 `x`。',
        tags: ['运算符'],
      },
    ],
  },
];
