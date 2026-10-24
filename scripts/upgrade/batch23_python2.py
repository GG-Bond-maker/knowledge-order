# -*- coding: utf-8 -*-
"""批次23：升级 Python 剩余最弱 4 节（TS 源，紧凑版）。
l3-1 条件分支与match / l4-2 异常处理 / l4-3 调试与日志 / l5-5 dataclass
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

L["py-l-3-1"] = r"""## 学习目标

学完本节，你应该能够：
1. 用真值规则（l-1-4）简化嵌套 if，把"卫语句"作为默认结构；
2. 用三元表达式与 `and/or` 短路写出无分支的简洁判断；
3. 用 `match` 结构模式匹配替代多层 if-elif 解构复杂数据。

## 前置知识

- 布尔值与真值判断（l-1-4：空容器/0/None 均为假）；
- 字典与解包（第 2 章）。

## 问题背景：分支是复杂度的计量表

圈复杂度随分支数线性增长——嵌套 if 超过三层，bug 率陡增。Python 有三件降复杂度的武器：**卫语句**（早返回砍掉嵌套）、**字典分发**（把"值→动作"查表化）、**结构模式匹配**（match，Python 3.10+，一次解构多层判断）。三者共同点：**让"分支"从代码结构里消失**。

## 核心概念：三种减枝术

**1. 卫语句（guard clause）**：

```python
def process(order):
    if order is None:          return None        # 先排掉异常情况
    if not order.get("items"): return "empty"     # 早返回
    return calc(order)                             # 主逻辑零嵌套
```

**2. 三元与短路**：

```python
level = "vip" if spend > 1000 else "normal"
name = user.get("name") or "匿名"          # None/空串兜底
flag = cfg.get("debug") and log("debug on") # and 短路：False 则不执行右侧
```

**3. match 结构匹配**（对"形状"分支，而非对"值"分支）：

```python
def handle(msg):
    match msg:
        case {"type": "order", "amount": a} if a > 0:   # 字典模式+守卫
            return f"订单 {a}"
        case {"type": "refund"}:
            return "退款"
        case [first, *rest]:                             # 序列解构模式
            return f"批量 {len(rest)+1} 条"
        case _:
            return "未知"
```

## 完整案例：三层嵌套的降枝重构

原始（嵌套 3 层，圈复杂度 8）：检查用户→检查余额→检查库存→执行。重构后（卫语句 + 早返回，圈复杂度不变但**认知嵌套归零**）：每个失败条件一行 return，主路径一目了然。加上把 `type→handler` 的 if-elif 链换成字典 `handlers = {"order": h1, "refund": h2}` + `handlers.get(t, default)(msg)`——**分支彻底从代码里退场**。

## 代码实践

```python
def grade(score, bonus=0):
    total = score + bonus
    if total < 0:
        return "invalid"
    return "A" if total >= 90 else "B" if total >= 75 else "C"

print(grade(88, 5), grade(60), grade(-1))

match_commands = {
    "sum": lambda xs: sum(xs),
    "max": lambda xs: max(xs),
}
def dispatch(cmd, data):
    return match_commands.get(cmd, lambda xs: None)(data)
print(dispatch("sum", [1, 2, 3]), dispatch("avg", [1, 2]))

match [3, 1, 4, 1, 5]:
    case [first, *rest]:
        print(f"首元素 {first}, 其余 {len(rest)} 个")
```

预期输出：`A C invalid`；`6 None`；`首元素 3, 其余 4 个`。**常见错误**：match 后忘 `case _` 兜底（未匹配静默跳过）；用 `== None` 而非 `is None`；把 `or` 兜底用在 0 合法的场景（`x or default` 会把 0 也兜掉，应显式判 None）。

## 常见误区

1. **三元表达式链越长越好**——两层封顶，再深回 if；
2. **match=switch 的换皮**——它的本质是**解构**（按数据形状分支），值匹配只是特例；
3. **字典分发处处用**——分支体很轻时 if-elif 更直白；分发表适合"注册-扩展"场景；
4. **真值判断掩盖 bug**——`if lst:` 无法区分"空列表"与"None 传错"；入口处显式校验。

## 知识关联

- **向前**：l-1-4 真值表是所有简化的依据；
- **向后**：异常处理（下一章）承接"防御分支"的另一半职责；
- **平行**：Pandas 的 `np.select`/`map` 是向量化的多分支——同一思想换层面。

## 本节总结

| 武器 | 场景 |
| --- | --- |
| 卫语句 | 排异常、早返回，砍嵌套 |
| 三元/短路/or 兜底 | 单行轻判断 |
| 字典分发 | 值→动作的注册式扩展 |
| match 解构 | 按数据形状分支（3.10+） |

## 参考资料

> **来源类型：官方文档**
> - Python 文档 §4.9 "match Statements"（docs.python.org，PEP 634）。
> **来源类型：原创**
> - 降枝重构案例为本课程改编。
"""

L["py-l-4-2"] = r"""## 学习目标

学完本节，你应该能够：
1. 按"EAFP 优先"用 try/except 处理可预期异常，并用 else/finally 各就其位；
2. 写出自定义异常层级（继承 Exception），说明"捕获要具体"的原因；
3. 用代码演示"裸 except 吞 KeyboardInterrupt"与"异常链 raise from"两个工程大坑。

## 前置知识

- 函数与返回值（第 3 章）；
- 类的继承概念（进阶课预热即可，本节只用到最小子集）。

## 问题背景：异常是"失败的语言"

返回 None/错误码的函数把失败处理推给每个调用者（总会有人忘）；异常把失败**沿调用栈上抛**，直到有人接住——失败路径一条主干。Python 哲学 EAFP（Easier to Ask Forgiveness than Permission）：**先干，错了再接**，比 LBYL（先检查再干）更简洁且天然线程安全。

## 核心概念：完整语法与四段职责

```python
try:
    data = parse(raw)            # 只有"可能炸"的代码放这里
except json.JSONDecodeError as e:   # 捕具体异常，接住后能处理的
    data = {}; log(e)
except (KeyError, TypeError):    # 多类型元组
    raise ValueError("结构错误") from e   # 链式上抛：保留原始病因
else:
    cache(data)                  # try 成功才执行（不放 try 里=不让缓存错误混进来）
finally:
    release()                    # 无条件清理（文件/连接）
```

四段职责一句话：**try 放危险、except 接得住、else 放成功、finally 管清理**。

## 原理详解：两个工程大坑

1. **裸 `except:`**：连 `KeyboardInterrupt`/`SystemExit` 都吞——用户 Ctrl+C 杀不死循环、进程关不掉；最低限度写 `except Exception`，最好精确到类型；
2. **吞异常不记录**：`except: pass` 是"静默腐烂"——错误在别处以更离奇的样子爆发。正确姿势：要么处理，要么 `raise`（原样上抛）或 `raise NewType(...) from e`（转译并保留链）。

## 完整案例：数据管道的异常分级

```python
class PipelineError(Exception): ...          # 管道基类
class SchemaError(PipelineError): ...        # 结构错：可修复
class SourceError(PipelineError): ...        # 数据源挂：重试

def ingest(raw):
    try:
        obj = json.loads(raw)
        if "id" not in obj:
            raise SchemaError("缺 id 字段")
    except json.JSONDecodeError as e:
        raise SchemaError("非 JSON") from e
    return obj

for raw in ['{"id":1}', '{bad', '{"x":1}']:
    try:
        print(ingest(raw))
    except SchemaError as e:
        print("修复分支:", e)
```

预期输出：`{'id': 1}`、两个修复分支。**调用方只捕 PipelineError 家族**——异常层级即"错误分类学"：顶层捕获决定重试/告警/人工的策略粒度。

## 代码实践

```python
import math

def safe_div(a, b):
    try:
        result = a / b
    except ZeroDivisionError:
        return math.inf * (1 if a >= 0 else -1)
    except TypeError as e:
        raise ValueError("需要数字") from e
    else:
        print("ok:", result)
        return result
    finally:
        print("-- 清理完成 --")

print(safe_div(10, 4))
print(safe_div(1, 0))
try:
    safe_div("a", 1)
except ValueError as e:
    print("转译:", e, "| 病因:", e.__cause__)
```

预期输出：ok 2.5 + 清理；inf + 清理；转译 ValueError 且 `__cause__` 保留 TypeError——**raise from 的病因链**可追溯。**常见错误**：except 里 return 跳过 finally 语义（finally 仍会执行，但顺序易误判）；用异常做正常流程控制（开销大且难读）；捕太宽（BaseException 连退出信号都吃）。

## 常见误区

1. **try 范围越大越安全**——恰恰相反：try 只包"可能炸的那一行"，否则真 bug 被误捕成业务异常；
2. **LBYL 更稳**——`if key in d: d[key]` 两步间可能被并发改写；EAFP 一步原子；
3. **异常必须当场处理**——接不住就上抛；中间层硬接是"假装处理"；
4. **finally 里 return/raise**——会吞掉 try 里正在传播的异常（语言级陷阱）。

## 知识关联

- **向前**：函数返回值（第 3 章）是失败处理的另一极；真值判断（l-1-4）管常态，异常管失败态；
- **向后**：l-4-5 自定义异常分级；工程课的重试装饰器/上下文管理器；
- **平行**：Pandas 读取的 `on_bad_lines` 参数、requests 的超时重试——库级异常策略。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 哲学 | EAFP：先干再接，优于 LBYL |
| 四段 | try 危险 / except 接具体 / else 成功 / finally 清理 |
| 铁律 | 不裸 except；要么处理要么 `raise ... from e` |
| 分级 | 自定义异常家族=错误分类学 |

## 参考资料

> **来源类型：官方文档**
> - Python 教程 §8 "Errors and Exceptions"（docs.python.org）——EAFP 与异常链的权威表述（PEP 3134）。
> **来源类型：原创**
> - 管道分级案例与四段口诀为本课程改编。
"""

L["py-l-4-3"] = r"""## 学习目标

学完本节，你应该能够：
1. 用 print → 断言 → logging 的三级工具按场景选型，并配置分级日志；
2. 读一条真实的 traceback 自顶向下定位"最后一个自己写的帧"；
3. 用 `pdb.set_trace()`/断点做交互式调试，掌握最短路径排错法。

## 前置知识

- 异常处理（l-4-2：traceback 是异常的尸体报告）；
- 函数调用栈的概念（第 3 章）。

### 问题背景：排错时间的分配决定交付速度

数据分析脚本出错，新手在"改一行猜一次"里循环；熟手先读 traceback、再放断点、最多两次命中根因。**调试是技能不是运气**：工具三级（print/assert/logging）+ 交互式调试器 + 读栈方法论，把排错从玄学变流程。

## 核心概念：三级工具与分级日志

| 工具 | 场景 | 淘汰理由 |
| --- | --- | --- |
| `print` | 一次性速查 | 无法分级/开关/落盘，交代码前删 |
| `assert` | 契约检查（开发期） | `python -O` 下被剥离，不能当业务校验 |
| `logging` | 一切留存需求 | —— |

```python
import logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("pipeline")
log.debug("细节数据")            # 默认 INFO 起步，不输出
log.info("处理 %d 行", 1000)      # 惰性格式化（省 CPU）
log.warning("空批次 %s", batch_id)
log.error("失败", exc_info=True)  # 附带完整 traceback
```

五级 DEBUG/INFO/WARNING/ERROR/CRITICAL 由一条 level 开关全局控制——**同一份代码，开发看细节、生产只报警**。

## 原理详解：读 traceback 的方法论

```
Traceback (most recent call last):
  File "etl.py", line 40, in <module>      ← 入口
    run(config)
  File "etl.py", line 31, in run            ← 中间层
    df = load(cfg["path"])
  File "etl.py", line 12, in load           ← 最后一个"自己写的"帧
    with open(path) as f:
FileNotFoundError: [Errno 2] No such file: 'data/x.csv'
```

读法三步：① **从底读错误类型与消息**（真相）；② **回找最深的自己代码帧**（line 12 的 load）——更下面的帧是标准库，问题几乎总在你代码与库的交界；③ 检查该行的输入（此处 cfg["path"] 从哪来）。**"最后一帧是库"不等于"库有错"**——99% 是你喂给它的参数不对。

## 完整案例：一次交互式排错

```python
import pdb

def parse_rows(path):
    rows = []
    with open(path, encoding="utf-8") as f:
        for i, line in enumerate(f):
            parts = line.strip().split(",")
            rows.append({"id": parts[0], "amt": float(parts[1])})
    return rows

# 命令行运行至第 305 行抛 ValueError: could not convert 'N/A'
# 交互式复现：
# pdb.set_trace() 插在循环内 → n 逐行 → p parts → 看到 ['912', 'N/A']
# 修复：amt = float(parts[1]) if parts[1] != "N/A" else None（并记 warning）
```

pdb 四命令起步：`n`（下一行）、`p 变量`（打印）、`c`（继续）、`q`（退出）；现代 IDE 断点即图形版 pdb。**先猜后改是大忌：让程序停在事故现场，而不是脑内重演**。

## 代码实践

```python
import logging, io
buf = io.StringIO()
logging.basicConfig(stream=buf, level=logging.DEBUG, format="%(levelname)s %(message)s")
log = logging.getLogger("demo")

def divide(a, b):
    assert b != 0, "契约: 分母非零（开发期检查）"
    return a / b

log.debug("准备计算")
try:
    divide(1, 0)
except AssertionError as e:
    log.error("契约破裂: %s", e)
finally:
    print(buf.getvalue().strip())
```

预期输出：`DEBUG 准备计算` 与 `ERROR 契约破裂: 契约: 分母非零（开发期检查）`——assert 与 logging 各司其职；`python -O` 运行时 assert 消失（同一代码分级剥离）。**常见错误**：生产代码留 print；assert 做用户输入校验（-O 下失效）；日志 format 里手写 f-string（失去惰性与统一格式，用 `%s` 占位）。

## 常见误区

1. **日志越多越好**——ERROR 满天飞=没人看；分级纪律：ERROR 必须可行动；
2. **traceback 从上往下读**——从最底部的错误读起，再回跳自己的帧；
3. **调试靠注释代码**——二分注释会破坏状态；断点才是无损检查；
4. **exc_info 手写 traceback**——`log.error(..., exc_info=True)` 一行内建。

## 知识关联

- **向前**：l-4-2 异常体系是 traceback 的来源；
- **向后**：工程课的日志轮转/结构化日志（JSON）/ELK 聚合；
- **平行**：量化课"先复现再修"与断点方法论同构——事故现场第一。

## 本节总结

| 工具 | 一句话 |
| --- | --- |
| print/assert/logging | 速查/契约/留存，按场景三级 |
| traceback | 从底读错误，回找自己的帧 |
| pdb/断点 | 停在事故现场，n/p/c 三命令起步 |
| 分级纪律 | ERROR 必须可行动 |

## 参考资料

> **来源类型：官方文档**
> - Python 文档 `logging` HOWTO（docs.python.org）——分级的官方指南。
> - `pdb` 文档与 PEP 3134（异常链）。
> **来源类型：原创**
> - 读栈三步法与排错案例为本课程改编。
"""

L["py-l-5-5"] = r"""## 学习目标

学完本节，你应该能够：
1. 用 `@dataclass` 三行定义数据类，替换手写 `__init__`/`__repr__`/`__eq__`；
2. 说出 field/default_factory 解决的默认值陷阱（呼应 l-3-3）与 frozen 的不可变用途；
3. 在"字典满天飞"与"类太重"之间用 dataclass 找到中点，写出可维护的数据管道。

## 前置知识

- 字典（l-2-3）与可变默认参数陷阱（l-3-3）；
- 类的最基本概念（`self` 即可）。

## 问题背景：字典的"字符串税"

数据管道里传 dict 最快也最烂：`row["amout"]`（拼错）运行到深处才炸、IDE 无补全、结构无文档；手写类又要 20 行样板（init/repr/eq）。**dataclass 用装饰器生成全部样板**——字段即文档、类型即契约、拼写错误在写代码时就被红线标出。

## 核心概念：三行起手与三个关键参数

```python
from dataclasses import dataclass, field

@dataclass
class Order:
    id: str
    items: list[str] = field(default_factory=list)   # 可变默认 → 工厂
    paid: bool = False
    tags: dict = field(default_factory=dict)

o = Order("A1")
print(o)                       # Order(id='A1', items=[], paid=False, tags={}) 自动 repr
print(o == Order("A1"))        # True：按字段值比较（自动 __eq__）
```

| 参数 | 解决什么 |
| --- | --- |
| `default_factory=list` | 可变默认值陷阱（l-3-3 的类级解法） |
| `frozen=True` | 不可变实例：可哈希、可作字典键、防误改 |
| `slots=True`（3.10+） | 省内存（无实例字典），大数据量受益 |

## 原理详解：字典→数据类的收益账

`row["amount"]` 的三类隐性成本：① 拼错键 → KeyError 在**使用处**爆（离赋值处十万八千里）；② 无类型 → 下游 `float(row["amount"])` 永远提心吊胆；③ 无结构文档 → 新人读管道要逐行 print。dataclass 一次付清：属性访问拼写错**当场**红名；类型注解给 IDE/mypy 检查；字段列表就是 schema。代价是import 与装饰器两行——**管道超过 3 个函数共享同一结构时就该升级为 dataclass**。

## 完整案例：管道升级对照

```python
# 之前：三段字典传递
def load(raw): return {"id": raw[0], "amt": float(raw[1])}
def validate(row): 
    if row["amt"] < 0: row["amt"] = 0.0      # 拼写 amt/amount 无人守护
    return row

# 之后：契约内联
from dataclasses import dataclass

@dataclass
class Trade:
    id: str
    amt: float = 0.0

def load2(raw) -> Trade:
    return Trade(id=raw[0], amt=float(raw[1]))

def validate2(t: Trade) -> Trade:
    return Trade(t.id, max(t.amt, 0.0))

print(validate2(Trade("T1", -5)))            # Trade(id='T1', amt=0.0)
```

预期输出：`Trade(id='T1', amt=0.0)`——函数签名 `-> Trade` 本身就是接口文档。

## 代码实践

```python
from dataclasses import dataclass, field, asdict, replace

@dataclass(frozen=True)
class Point:
    x: float
    y: float = 0.0

p = Point(1.5)
try:
    p.x = 9                    # frozen 禁改
except Exception as e:
    print(type(e).__name__, e)
print(hash(p) is not None, p == Point(1.5))     # 可哈希 + 值相等
print(asdict(p))                                 # {'x': 1.5, 'y': 0.0} 一行回字典
print(replace(p, y=2.0))                         # 复制修改（frozen 的"改法"）
```

预期输出：`FrozenInstanceError cannot assign to field 'x'`；`True True`；`{'x': 1.5, 'y': 0.0}`；`Point(x=1.5, y=2.0)`——**frozen 三件套：报错守护、可哈希、replace 复制**。**常见错误**：`items: list = []` 直接写默认（共享陷阱复现，必须 default_factory）；frozen 类里放可变字段还指望真不可变（浅冻结）；把业务方法塞满 dataclass（它是数据载体，行为重了叫领域类，另立门户）。

## 常见误区

1. **dataclass 替代一切类**——它生成的是**数据载体**样板；有复杂不变量/行为的类仍手写 `__post_init__` 或普通类；
2. **类型注解会强制类型**——注解只供检查工具，运行时不拦（mypy/IDE 才拦）；要运行时校验配 pydantic；
3. **frozen 影响性能**——只是拦截赋值，几乎零成本；
4. **asdict 深拷贝嵌套对象**——序列化方便但大对象有开销，热路径直接用属性。

## 知识关联

- **向前**：l-3-3 默认参数陷阱在此获得类级终结（default_factory）；
- **向后**：工程课的 pydantic/TypedDict 谱系；大模型课程的消息结构（Message role/content）即 dataclass 典型场景；
- **平行**：SQL 课程的表结构声明与 dataclass 同为"schema 即代码"。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 定位 | 字典与类的中点：字段即 schema |
| 自动获得 | __init__/__repr__/__eq__ 三件套 |
| 关键参数 | default_factory / frozen / slots |
| 时机 | 同一结构穿过 ≥3 个函数即升级 |

## 参考资料

> **来源类型：官方文档**
> - Python 文档 `dataclasses`（PEP 557，docs.python.org）。
> **来源类型：原创**
> - 字符串税框架与管道对照为本课程改编。
"""

for lid, md in L.items():
    replace_content(lid, md.strip("\n"))
print("done")
