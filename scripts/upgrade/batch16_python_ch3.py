# -*- coding: utf-8 -*-
"""批次16：升级 Python 第3章核心 4 节（TS 源，紧凑版）。
py-l-3-2 循环 / py-l-3-3 函数 / py-l-3-4 作用域闭包生成器 / py-l-3-5 函数式工具
"""
import io, glob

FILES = glob.glob(r"D:\Python_Project\knowledge-order\src\content\chapters\python\*.ts")

B = chr(92)
BT = chr(96)


def to_ts(md):
    return md.replace(B, B + B).replace(BT, B + BT).replace("${", B + "${")


def replace_content(lid, md):
    for f in FILES:
        s = io.open(f, encoding="utf-8").read()
        if "id: '%s'" % lid not in s:
            continue
        i = s.index("id: '%s'" % lid)
        j = s.index("content: " + BT, i) + len("content: " + BT)
        k = s.index("\n" + BT + ",", j)
        io.open(f, "w", encoding="utf-8", newline="\n").write(s[:j] + "\n" + to_ts(md) + s[k:])
        print("patched", lid)
        return
    raise SystemExit("not found: " + lid)


L = {}

L["py-l-3-2"] = r"""## 学习目标

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

```python
for i in range(3): ...              # 计数循环
for idx, x in enumerate(lst): ...   # 带下标（不要手写 i=0; while i<len）
for a, b in zip(xs, ys): ...        # 多序列并行（不要下标取两个列表）
while 条件: ...                      # 次数未知（重试、收敛、读流）
```

`break` 跳出最近循环；`continue` 跳到下一次迭代；**循环 else**：循环**没有被 break 中断**时才执行——天然适合"查找失败"分支：

```python
for u in users:
    if u.id == target:
        print("找到"); break
else:                                # 循环自然结束（没找到）才进来
    print("未找到")
```

## 完整案例：找第一个合格订单的三种写法

```python
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
```

三种等价；写法三把"找第一个"的语义压进一行，`next` 的第二个参数兜底未找到。

## 代码实践

```python
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
```

预期输出：重试结果（依随机而定，else 分支可能触发）；diffs 形如 ['10->12 (+2)', ...]；`True True`——any/all 接收生成器，**找到即短路**，不全量扫描。**常见错误**：while 忘记更新条件（死循环）；`zip` 两序列长度不齐（默认截断，需 `strict=True` 报错或 `itertools.zip_longest`）；在循环里用 `lst.remove(x)`（跳元素，见 l-2-1）。

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
"""

L["py-l-3-3"] = r"""## 学习目标

学完本节，你应该能够：
1. 熟练使用位置/关键字/默认/可变参数（`*args`/`**kwargs`）四类参数并说出解包场景；
2. 解释可变默认参数陷阱的内存机制（第 1 章对象模型的直接应用）并给出正确写法；
3. 用类型注解（`list[dict]`、`-> float`）为函数写"自解释签名"。

## 前置知识

- 对象与名字绑定（l-1-1：函数默认参数的陷阱根源）；
- 列表/字典（第 2 章）。

## 问题背景：函数是代码复用的最小单元，也是第一坑现场

数据分析脚本变长的第一信号：同一段清洗逻辑复制三遍。函数化是解药，但 Python 参数系统有几个**教科书级陷阱**——可变默认参数首当其冲：`def f(x, acc=[])` 的 `acc` 在**多次调用间共享同一个列表**。不懂其机制的人改 `[]` 为 `None` 了事，懂的人能讲清为什么。

## 核心概念：四类参数一张表

| 类型 | 语法 | 调用示例 | 说明 |
| --- | --- | --- | --- |
| 位置 | `def f(a, b)` | `f(1, 2)` | 按顺序绑定 |
| 关键字 | 同上 | `f(b=2, a=1)` | 按名绑定，可读性优先 |
| 默认值 | `def f(a, sep=",")` | `f(x)` | **定义时求值一次**（陷阱根源） |
| 可变收集 | `def f(*args, **kw)` | `f(1, k=2)` | 收集成元组/字典 |
| 解包传递 | `def f(a, b, c)` | `f(*[1,2,3])` | 序列/字典展开成参数 |

顺序规则：`def f(位置, 默认=..., *args, **kwargs)`，关键字参数不能在位置参数前。

## 原理详解：可变默认参数为什么共享

`def f(acc=[])` 中 `[]` 在 **def 执行时创建一次**，成为函数对象的一个属性（`f.__defaults__`）；此后每次调用不传 `acc`，绑定的都是**同一个列表对象**——与 `b = a` 别名共享（l-1-1）完全同源。验证：两次调用后 `f.__defaults__[0]` 是同一个 id。正确写法用哨兵：

```python
def add_item(item, acc=None):
    if acc is None:
        acc = []            # 每次调用新建
    acc.append(item)
    return acc
```

**为什么默认值不在调用时求值？** def 是语句，执行一次即创建函数对象——默认值作为对象状态随之固定（性能考虑：避免每次调用重复求值）。

## 完整案例：一个带完整签名的清洗函数

```python
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
```

预期输出：`[11.0, 33.0] {'dropped': 1, 'kept': 2, 'source': 'demo'}`——注解+docstring+关键字参数让调用处几乎不需要读函数体。

## 代码实践

```python
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
```

预期输出依次见注释；最后一行 `**cfg` 把字典解包成关键字参数——**配置对象转函数调用**的日常桥梁。**常见错误**：默认值用 `[]`/`{}`/`set()`（一律 None 哨兵）；`*args` 当万能签名（丢失可读性，IDE 无法提示）；返回 None 表示失败（应抛异常或返回哨兵值）。

## 常见误区

1. **默认参数每次调用新建**——def 时创建一次，可变默认值跨调用共享；
2. **参数越多家越好**——超过 5 个考虑打包成 dataclass/字典（l-5-5）；
3. **函数内修改传入的可变参数**——副作用污染调用方（要么文档声明，要么复制后改）；
4. **注解只是装饰**——IDE/mypy 用它做静态检查，是大型项目的第一道防线。

## 知识关联

- **向前**：l-1-1 的对象模型解释本节唯一大坑；第 2 章容器是默认值的主角；
- **向后**：l-3-4 作用域讲函数内的名字从哪来；lambda（l-3-5）是无名函数；
- **平行**：Pandas 的 `fillna(value=..., inplace=...)` 签名就是四类参数的工业示范。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 四类参数 | 位置/关键字/默认/可变收集，顺序固定 |
| 头号陷阱 | 可变默认值 def 时求值一次、跨调用共享——None 哨兵 |
| 解包 | `f(*lst)`、`f(**dict)` 双向桥梁 |
| 签名 | 注解 + docstring = 自解释函数 |

## 参考资料

> **来源类型：官方文档**
> - Python 教程 §4.8 "More on Defining Functions"（默认参数求值时机、*args/**kwargs）。
> - FAQ "Why are default values shared between objects?"——陷阱的官方解释。
>
> **来源类型：原创**
> - 清洗函数案例与陷阱现场为本课程改编。
"""

L["py-l-3-4"] = r"""## 学习目标

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
- **赋值即局部**：函数内 `x = 1` 让 x 成为局部（哪怕外层有同名）；
- 要在函数内**改**全局/外层变量：`global x` / `nonlocal x` 显式声明（写出来的意图比隐式坑好）；
- 循环变量泄漏：for 的变量在循环后仍可见（Python 无块级作用域）。

## 核心概念二：闭包

闭包 = 内层函数 + 捕获的外层环境。识别三条件：嵌套函数、内层引用外层变量、外层返回内层。捕获的是**变量（绑定）而非值**——这是理解"循环里建闭包全拿到同一个值"类经典坑的钥匙：

```python
def make_counter():
    count = 0
    def inc():
        nonlocal count          # 要修改外层绑定
        count += 1
        return count
    return inc

c = make_counter()
print(c(), c(), c())            # 1 2 3 —— inc 记住了自己的 count
```

## 核心概念三：生成器（yield）

函数体含 `yield` 即为生成器函数：调用它**不执行函数体**，返回生成器对象；每次 `next` 执行到下一个 yield 暂停并交出值，**局部状态完整保留**：

```python
def read_big(path):
    with open(path, encoding="utf-8") as f:
        for line in f:          # 文件对象本身也是惰性迭代器
            yield line.strip()

total = sum(1 for line in read_big("huge.log") if "ERROR" in line)
```

任意大的日志只占一行内存。生成器表达式 `(x*x for x in data)` 是它的匿名形态；与列表推导式的唯一区别是 `[...]` 立即物化、`(...)` 惰性产出。

## 代码实践

```python
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
```

预期输出：`L: local / E: enclosing / G: global`；`20 30`；列表约 0.4MB vs 生成器约 200 字节——**同一数据，内存差两千倍以上**（生成器只存状态不存元素）。**常见错误**：函数内改全局忘 `global`（UnboundLocalError）；循环建闭包捕获循环变量（全部拿到末值——用默认参数 `lambda v, i=i:` 固化）；生成器只能消费一次（耗尽后再 next 抛 StopIteration）。

## 常见误区

1. **闭包捕获的是"值"**——捕获的是变量绑定；循环变量结束后统一等于末值；
2. **生成器当列表反复用**——一次性，要复用先 `list()` 或重建；
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
"""

L["py-l-3-5"] = r"""## 学习目标

学完本节，你应该能够：
1. 把 map/filter 换写成推导式，把 sorted 的 key 用活（含 lambda 与 operator.itemgetter）；
2. 用 functools.reduce 完成累积折叠，并说出它与 sum/join 的关系；
3. 判断"函数式三件套 vs 普通循环"的取舍标准（可读性优先）。

## 前置知识

- 函数是一等公民（l-3-3：函数可作参数与返回值）；
- lambda 匿名函数语法（`lambda 参数: 表达式`）。

## 问题背景：把"对每个元素做什么"写成参数

数据处理的三大动词：**变换**（每个 x → f(x)）、**筛选**（留下载 f 为真的）、**折叠**（把序列缩成一个值）。Python 的函数式工具把这三大动词从"循环的语法细节"中抽象出来，让代码的形状直接表达意图——这是从"会循环"到"会表达"的一步。

## 核心概念：三件套对照表

| 动词 | 函数式 | 推导式（首选） | 说明 |
| --- | --- | --- | --- |
| 变换 | `map(f, xs)` | `[f(x) for x in xs]` | 推导式在 Python 中更可读 |
| 筛选 | `filter(p, xs)` | `[x for x in xs if p(x)]` | 同上 |
| 排序 | `sorted(xs, key=f)` | 无对应 | key 是灵魂 |
| 折叠 | `reduce(g, xs, init)` | 手写循环 | 内置 sum/max/min/join 已覆盖 90% |

**sorted 的 key** 是最值得练的一件：它对每个元素算一次排序键，代替"造中间元组"：

```python
orders = [{"id": 1, "amt": 800}, {"id": 2, "amt": 50}, {"id": 3, "amt": 1200}]
by_amt = sorted(orders, key=lambda o: -o["amt"])            # 按金额降序
top2 = sorted(orders, key=lambda o: o["amt"], reverse=True)[:2]
from operator import itemgetter
by_amt2 = sorted(orders, key=itemgetter("amt"), reverse=True) # itemgetter 略快
```

## 原理详解：reduce 折叠

`reduce(lambda acc, x: acc + [f(x)], xs, [])` 这类"边扫边积累"的通用形态，把序列压成单值：

```python
from functools import reduce
total = reduce(lambda a, b: a + b, [1, 2, 3, 4], 0)     # 10 —— 就是 sum
longest = reduce(lambda a, b: a if len(a) >= len(b) else b, ["py", "python", "pandas"])
# 'python' —— 就是 max(xs, key=len)
```

见到 reduce 先问：内置（sum/max/min/any/all/str.join）是否已覆盖？90% 场景答案是"是"——reduce 留给真正自定义的折叠逻辑（如逐条合并字典）。

## 完整案例：一段管道式清洗

```python
rows = [
    {"city": "BJ", "sales": 1200}, {"city": "SH", "sales": 800},
    {"city": "BJ", "sales": None}, {"city": "SZ", "sales": 450},
]

clean = [r for r in rows if r["sales"] is not None]          # 筛选
boosted = [{**r, "sales": r["sales"] * 1.1} for r in clean]   # 变换（字典解包合并）
top = sorted(boosted, key=lambda r: r["sales"], reverse=True)[0]
total = sum(r["sales"] for r in boosted)                      # 折叠用内置 sum

print(top, round(total, 1))
```

预期输出：`{'city': 'BJ', 'sales': 1320.0} 2695.0`——筛选→变换→排序→聚合，四步一屏读完，没有一处手写循环计数器。

## 代码实践

```python
from functools import reduce
import operator

words = ["data", "science", "is", "fun"]
print(list(map(str.upper, words)))                    # 变换
print([w for w in words if len(w) > 2])               # 筛选（推导式版）
print(sorted(words, key=len, reverse=True))           # key 排序
print(reduce(operator.add, words, ""))                # 折叠 = "".join(words)

# 陷阱：map/filter 返回惰性迭代器
m = map(str.upper, words)
print(list(m))                                        # 第二次消费为空
print(list(m))                                        # []
```

预期输出依次如注释；最后两行演示**map 是一次性迭代器**（同生成器）。**常见错误**：map/filter 结果当列表二次使用（先 list()）；lambda 里写语句（只允许表达式）；reduce 无初值且序列为空（TypeError）。

## 常见误区

1. **函数式一定更好**——Python 之禅：可读性优先；简单循环常胜嵌套函数式；
2. **lambda 强行复杂化**——超过一个表达式就 def 具名函数（栈回溯也友好）；
3. **map 与推导式混战争执**——团队统一即可；推导式在 Python 社区是事实标准；
4. **sorted 的 key 返回元组不知道**——`key=lambda r: (-r["sales"], r["city"])` 一行实现多级排序（降序+同额按城市）。

## 知识关联

- **向前**：l-3-3 的一等函数是全部地基；l-3-4 生成器表达式是 filter/map 的惰性亲戚；
- **向后**：functools.partial/cached_property（l-5-4）；Pandas 的 assign/query/sort_values 是三件套的 DataFrame 版；
- **平行**：SQL 的 SELECT/WHERE/ORDER BY/sum() 与本节三大动词一一对应（SQL 课程互文）。

## 本节总结

| 动词 | 首选写法 |
| --- | --- |
| 变换/筛选 | 推导式（可读性标准） |
| 排序 | sorted + key（多级用元组） |
| 折叠 | 内置 sum/max/join 优先，reduce 兜底 |
| 惰性 | map/生成器一次性消费 |

## 参考资料

> **来源类型：官方文档**
> - `functools` 与内置函数文档（map/filter/sorted/reduce 的签名与说明，docs.python.org）。
>
> **来源类型：原创**
> - 管道式清洗案例与陷阱演示为本课程改编。
"""

for lid, md in L.items():
    replace_content(lid, md.strip("\n"))
print("done")
