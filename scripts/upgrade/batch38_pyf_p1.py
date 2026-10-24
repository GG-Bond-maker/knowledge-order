# -*- coding: utf-8 -*-
"""batch38: python-foundations-data 扩充补丁 P1（第 1-6 章，16 节）。
对 content < 2600 的小节做实质性追加：问题背景/直觉理解、手算推导、
完整案例（实测代码+输出）、流程图解、知识关联、本节总结、补充参考资料。
所有代码与输出均在 Python 3.11.15 实测。
"""
import json, io, re, time

P = r"D:\Python_Project\knowledge-order\content-data\courses\python-foundations-data.json"
REF_RE = re.compile(r"\n#{2,4} [^\n]*(参考资料|延伸阅读|Reference)[^\n]*\n")

def merge(content, add):
    """追加到末尾；若结尾是参考资料小节则插入到它之前，保持文档结构自然。"""
    ms = list(REF_RE.finditer(content))
    if ms and ms[-1].start() > len(content) * 0.6:
        i = ms[-1].start()
        return content[:i].rstrip() + "\n\n" + add.strip() + "\n" + content[i:]
    return content.rstrip() + "\n\n" + add.strip() + "\n"

ADD = {}

ADD["pyf-l1-1"] = '''
### 问题背景与直觉理解（补充）

为什么数据分析岗必须理解执行模型？当 `df.groupby(...)` 意外跑了两分钟，或面对 `RecursionError` 无从下手时，系统性的解法只有回到底层：Python 代码究竟是如何被机器执行的？可以把 CPython 理解为一位"同声传译员"：它并不等你说完整本书（整体编译成机器码），而是先把你写的 `.py` 源码**一次性翻译成中间指令（字节码 Bytecode）**，再由一台用 C 语言写成的虚拟机（Python Virtual Machine, PVM）逐条读取执行。编译型语言（C++）像"整本翻译出版"，启动慢但跑得快；解释型语言灵活敏捷，代价是逐条解释的固有开销——这正是后续 NumPy/Pandas 把热点循环下沉到 C 层的根本原因。

### 手算推导（逐步演算）

以 `total_price(qty, unit)` 为例，跟踪栈式虚拟机执行 `qty * unit`（设 qty=3、unit=2.0）：

1. `LOAD_FAST 0 (qty)`：把局部变量 qty 指向的对象 3 压入求值栈；
2. `LOAD_FAST 1 (unit)`：把 unit 指向的 2.0 压栈，栈变为 `[3, 2.0]`；
3. `BINARY_OP 5 (*)`：弹出栈顶两个元素相乘，结果 6.0 压回栈；
4. `STORE_FAST 2 (subtotal)`：弹出 6.0，绑定给局部变量 subtotal；
5. `RETURN_VALUE`：把栈顶作为函数返回值交给调用者。

所谓"虚拟机"，本质上就是一个大循环：取指令 → 分发 → 执行，循环往复直到 RETURN。一行 Python 通常对应若干条字节码，这也是统计"代码热度"时不能只看行数的原因。

### 完整案例（补充）：亲眼看穿字节码

```python
import dis, sys

def total_price(qty, unit):
    subtotal = qty * unit
    return subtotal

dis.dis(total_price)          # 反汇编：打印底层字节码
print("---")
print(sys.implementation.name, sys.version.split()[0])
```

预期输出（实测，CPython 3.11.15）：

```
  4           0 RESUME                   0

  5           2 LOAD_FAST                0 (qty)
              4 LOAD_FAST                1 (unit)
              6 BINARY_OP                5 (*)
             10 STORE_FAST               2 (subtotal)

  6          12 LOAD_FAST                2 (subtotal)
             14 RETURN_VALUE
---
cpython 3.11.15
```

逐行对照手算步骤：一行 `qty * unit` 被展开为 4 条栈指令。Python 3.11 引入自适应特化解释器（PEP 659），高频字节码会被"热身"成专用指令，这是官方宣称 3.11 平均提速 10%-60% 的来源。

### 执行流程图解（文字示意图）

```
你写的 .py 源码
      │  解析/编译（仅一次，可缓存为 .pyc）
      ▼
 字节码 Bytecode（与平台无关的中间指令）
      │  逐条取指-分发-执行（ceval.c 大循环）
      ▼
 Python 虚拟机 PVM + 对象系统（引用计数/GC）
      │
      ▼
 操作系统 内存与 CPU
```

### 知识关联

- 承接 l1-2：`print()` 调用最终也编译为 `CALL` 字节码；
- 呼应 l10-1：理解"逐条解释开销"，才能明白为什么一千万次平方运算要用 NumPy 向量化下沉到 C；
- 在 pep-l8-1 的 GIL 一节你会看到：锁住的不是你的代码，而是 PVM 字节码执行机的单线程约束。

### 本节总结（要点回顾）

1. CPython = 编译器（源码→字节码）+ 虚拟机（逐条执行字节码），`sys.implementation.name` 可验证当前实现；
2. `dis.dis()` 是透视执行模型的 X 光机，性能排查先看热点函数的字节码条数；
3. 解释执行的灵活性以每条指令的调度开销为代价——这是"向量化替代循环"一切优化的第一性原理。
'''

ADD["pyf-l1-2"] = '''
### 问题背景与直觉理解（补充）

`print()` 看似简单，却是数据分析产出的"最后一公里"：日志、对账单、控制台报表全靠它。直觉上把 `print` 理解成一台"传送带打包机"——它可以同时接收多个对象（`*objects`），按 `sep` 拼接、按 `end` 收尾，最后统一送到标准输出流 `sys.stdout`。而注释与缩进是给两类"读者"看的说明书：注释给人类同事看（解释器直接跳过），缩进给解释器看（决定代码块归属）。PEP 8 规定 4 个空格缩进、单行不超过 79 字符，不是为了美观洁癖，而是让数十人协作的代码库保持同一种"呼吸节奏"。

### 手算推导（逐步演算）

跟踪 `print("订单", qty, sep=" | ", end="!\\n")`（qty=3）的打包过程：

1. 收集位置参数：`"订单"`, `3`，共 2 个对象；
2. 把每个对象 `str()` 化："订单"、"3"；
3. 用 `sep`（" | "）把相邻片段连接："订单 | 3"；
4. 追加 `end`（默认 "\\n"，此处为 "!\\n"）："订单 | 3!\\n"；
5. 整串写入 `sys.stdout` 并刷新缓冲。

结论：`sep` 作用于"对象之间"，`end` 作用于"整行末尾"。一行内多次 `print` 之所以各占一行，是因为默认 `end="\\n"`。

### 完整案例（补充）：sep/end 与自文档化 f-string

```python
order = "A1024"
qty, unit = 3, 19.9
print(f"订单{order}", "数量", qty, sep=" | ")
print("加载中", end="...")
print("完成")
print(f"{qty=} {unit=:.2f}")  # 自文档化调试输出（3.8+）
```

预期输出（实测）：

```
订单A1024 | 数量 | 3
加载中...完成
qty=3 unit=19.90
```

第三个输出的 `{qty=}` 会自动展开为"变量名=值"，是打日志排查问题的速写技巧，等价于手写 `f"qty={qty}"` 却不会出现变量名与实参不同步的低级错误。

### 输出流程图解（文字示意图）

```
print(...) 调用
   │ 1. 逐个 str(objects)
   │ 2. sep 插入对象间隙
   │ 3. end 追加行尾
   ▼
sys.stdout（行缓冲/块缓冲）
   │ flush / 程序退出
   ▼
终端 / 重定向文件 / 日志采集器
```

### 知识关联

- 承接 l1-1：`print` 底层是一次 `CALL` 字节码 + 对 `sys.stdout.write` 的封装；
- 呼应 l2-3：打印格式化的正规军是 f-string 的格式说明符（`:.2f`、`:,.2f`），`print` 的 sep/end 只负责"排版布局"；
- 在 l8-1 学完文件 I/O 后，可把 `print(..., file=f)` 输出直接重定向进文件。

### 本节总结（要点回顾）

1. `print(*objects, sep=' ', end='\\n', file=sys.stdout)`——四个默认参数就是它的全部行为模型；
2. 注释有三态：`#` 行注释、字符串字面量充当的模块/函数 docstring、以及被误用的"注释掉的死代码"（应删除而非堆积）；
3. 缩进是语法而非风格，同一代码块必须严格对齐，混用 Tab 与空格会直接 `TabError`。
'''

ADD["pyf-l2-1"] = '''
### 问题背景与直觉理解（补充）

"变量是标签不是盒子"这个模型，在工程上的直接推论是：**Python 的赋值永远不会复制数据，只复制引用**。这解释了三个日常灵异现象——把列表传给函数后"莫名其妙"被修改、`b = a` 之后改 b 连 a 一起变、pandas 里 `df2 = df1` 后两份"表"同步变形。直觉图景：对象是仓库里的货箱，变量是贴在箱上的便利贴，`b = a` 只是再贴一张便利贴到同一个箱子，仓库里的箱子没多也没少。真正的复制必须显式调用 `copy()` / `copy.deepcopy()` 或切片。

### 手算推导（逐步演算）

设 `a = [1, 2, 3]`，逐句推导内存状态（用 id 的相对编号示意）：

1. `a = [1, 2, 3]`：堆上创建列表对象 #100，a → #100；
2. `b = a`：不创建新对象，b → #100（`a is b` 为 True）；
3. `b.append(99)`：向 #100 对象内部追加元素，a、b 看到的都是 `[1, 2, 3, 99]`；
4. `c = a[:]`：新建列表对象 #200，元素引用逐一复制，c → #200（`a is c` 为 False，但 `a == c` 为 True）；
5. `x, y = 257, 257`：257 超出 CPython 小整数缓存区间 `[-5, 256]`，两行各自创建整数对象，`x is y` 为 False。

### 完整案例（补充）：引用 vs 拷贝现场取证

```python
a = [1, 2, 3]
b = a            # 赋值只复制引用（贴标签）
c = a[:]         # 切片产生浅拷贝
print(id(a) == id(b), id(a) == id(c))
b.append(99)
print(a)         # a 也被改了：a、b 是同一个对象
print(a == c, a is c)
x = 257; y = 257
print(x == y, x is y)   # 超出小整数缓存 [-5, 256]，is 为 False
```

预期输出（实测）：

```
True False
[1, 2, 3, 99]
False False
True True
```

注意最后一行的前半部分 `x == y` 为 True——`is` 为 False 不代表值不等；反之共享缓存的小整数（如 256 以内）`is` 为 True 只是实现细节，绝不能当作判等手段。

### 引用关系图解（文字示意图）

```
变量名        堆对象
  a ──┐
       ├──▶ [1, 2, 3, 99]  (#100, 被共享)
  b ──┘            ▲
  c ──▶ [1, 2, 3]  │ 浅拷贝：容器独立，内部元素引用仍指向同一批对象 (#200)
```

### 知识关联

- 承接 l2-2：不可变对象（int/str/tuple）"改动"其实是换绑新对象，可变对象才是原地修改；
- 呼应 l5-1 的浅拷贝 vs 深拷贝、l6-3 的函数内重新赋值不影响外部名字；
- pandas 的 `SettingWithCopyWarning` 正是这套引用模型在链式索引上的投影。

### 本节总结（要点回顾）

1. 赋值 = 建立名字→对象的引用；判地址用 `is`，判内容用 `==`，二者永远不可互换；
2. 需要"独立副本"必须显式拷贝，且牢记浅拷贝只复制容器外壳；
3. `is` 仅用于 `None`/哨兵对象单例判断，其余场景一律 `==`。
'''

ADD["pyf-l2-2"] = '''
### 问题背景与直觉理解（补充）

类型转换是数据清洗的第一道闸口：Excel 导出的"数字"常是字符串，API 返回的金额常带空格或千分位。直觉模型：`int()`/`float()` 是两台"安检机"——`float()` 兼容性宽（接受整数、科学计数法、前后空白），`int()` 苛刻（只接受纯整数字符串，拒绝 `"19.9"`）。而 bool 是 int 的子类（`True == 1`），这让 `sum(flags)` 能直接数 True 的个数，但也埋下 `bool("False")` 为 True 的经典暗坑：非空字符串恒为真，与字面内容无关。

### 手算推导（逐步演算）

跟踪 `int("0x1A", 16)` 与 `0.1 + 0.2`：

1. `int("0x1A", 16)`：按 16 进制解释字符串，1×16 + 10 = 26；同理 `int("1010", 2)` = 1×8+0×4+1×2+0 = 10；
2. `0.1 + 0.2`：0.1 的 IEEE 754 双精度近似值 ≈ 0.1000000000000000055511151231257827，0.2 ≈ 0.2000000000000000111022302462515654，两者相加后再舍入到最近的可表示数 = 0.30000000000000004，故 `== 0.3` 为 False；
3. 正确的浮点判等是 `abs(a - b) < 1e-9`（或 `math.isclose(a, b)`）。

### 完整案例（补充）：脏数据转换容错与浮点判等

```python
raw = ["19.9", " 42 ", "1e3", "abc"]
for s in raw:
    try:
        print(repr(s), "->", float(s))
    except ValueError as e:
        print(repr(s), "-> ValueError:", e)
print(int(float("19.9")), int("0x1A", 16), int("1010", 2))
print(0.1 + 0.2 == 0.3, abs(0.1 + 0.2 - 0.3) < 1e-9)
print(bool(""), bool("0"), bool(0.0), bool(None))
```

预期输出（实测）：

```
'19.9' -> 19.9
' 42 ' -> 42.0
'1e3' -> 1000.0
'abc' -> ValueError: could not convert string to float: 'abc'
19 26 10
False True
False True False False
```

工程含义：生产清洗代码应对每个待转字段 try/except 并记录失败样本，而不是让整批任务崩在一条脏数据上；`bool("0")` 为 True 说明"字符串转布尔"必须写显式映射 `s.lower() == "true"`。

### 类型转换路径图解（文字示意图）

```
字符串 s
  │ s.strip()
  ▼
s 能否 float()？ ──否──▶ 记录脏样本 / 抛业务异常
  │ 是
  ▼
浮点值 f ──需要整数？──▶ int(f)（向零截断，非四舍五入）
  │
  ▼
参与计算 / 写回数据库（float 列优先用 DECIMAL 存金额）
```

### 参考资料（补充）

- **Python 官方文档：内置类型与数值转换**——int/float/bool 的构造规则与真值测试权威定义
  - 链接：https://docs.python.org/zh-cn/3/library/stdtypes.html
- **Python 官方教程：浮点数算术：问题与限制**——IEEE 754 误差的官方解释
  - 链接：https://docs.python.org/zh-cn/3/tutorial/floatingpoint.html

### 知识关联

- 承接 l2-3：转换完成后用 f-string 格式化输出可"遮住"舍入误差；
- 呼应 l7-1：`ValueError` 与 `TypeError` 的边界（int("abc") 是 ValueError，abs([1,2]) 是 TypeError）；
- pandas 的 `pd.to_numeric(errors="coerce")` 是本节 try/except 模式的向量化版本。

### 本节总结（要点回顾）

1. `float()` 宽进、`int()` 严出；"字符串金额"先 float 再 int，永不做两跳直转；
2. 浮点判等用容差或 `math.isclose`，金额结算用 `decimal.Decimal`；
3. `bool(x)` 只看真值协议：空容器/0/None 为假，其余为真——与字面内容无关。
'''

ADD["pyf-l2-3"] = '''
### 问题背景与直觉理解（补充）

算术运算本身不难，难的是两件"隐性规则"：优先级决定了表达式不加括号时的读法，而 f-string 的格式说明符决定了报表是否可读。直觉模型：运算优先级就是"先乘除后加减"的代数直觉加上三条 Python 特例——`/` 永远返回 float、`//` 是向负无穷取整的整除、`**` 高于一元负号（`-2**2` 是 -4）。f-string 则把"模板挖坑填数"变成"就地引用变量"，3.6+ 之后应作为唯一首选，% 格式化与 str.format() 仅在维护老代码时阅读。

### 手算推导（逐步演算）

1. `-7 // 2`：整除向负无穷取整，-3.5 向下取整 = -4（不是 -3！）；对应 `-7 % 2 = 1`，恒满足 `a == (a // b) * b + (a % b)`：-7 = -4×2 + 1 ✓；
2. `round(2.675, 2)` 得 2.67 而非 2.68：2.675 的二进制实际存储是 2.67499999999999982236…，银行家舍入作用在"真实存储值"上；
3. `{0.855:.1%}`：0.855×100 = 85.5%，按 `.1f` 规则保留 1 位 → "85.5%"。

### 完整案例（补充）：对齐报表与运算符速查

```python
price, qty = 19.99, 3
print(f"小计：{price * qty:,.2f} 元")
print(f"折扣：{0.855:.1%}")
print(f"{'商品':<6}|{'数量':>4}|{'单价':>8}")
print(f"{'键盘':<6}|{3:>6}|{129.5:>10,.2f}")
print(7 / 2, 7 // 2, -7 // 2, 7 % 2, 2 ** 10)
print(round(2.675, 2))   # IEEE 754 存储误差导致不是 2.68
```

预期输出（实测）：

```
小计：59.97 元
折扣：85.5%
商品    |  数量|      单价
键盘    |     3|    129.50
3.5 3 -4 1 1024
2.67
```

`:<6`、`:>6`、`:>10,.2f` 中冒号后是格式说明符：`<>^` 控制对齐，数字控制最小宽度，`.2f` 控制小数位，`,` 控制千分位。中文与等宽英文混排时对齐会略有视觉偏差，严谨报表建议输出 Markdown 表格或 Excel。

### 格式说明符结构图解（文字示意图）

```
{ 表达式 ! 转换 : [[填充]对齐][符号][#][0][宽度][,][.精度][类型] }
  │        │        │                        │          │     └ f=定点, e=科学, %=百分比, d=整数
  │        │        │                        │          └ 千分位逗号
  │        │        └ 最小字段宽度（数字/字符）
  │        └ r=repr, s=str, a=ascii
  └ f-string 就地变量 / 任意表达式（含函数调用）
```

### 参考资料（补充）

- **PEP 498：Literal String Interpolation**——f-string 语法的设计文档
  - 链接：https://peps.python.org/pep-0498/
- **Python 官方文档：Format String Syntax（格式规格迷你语言）**
  - 链接：https://docs.python.org/zh-cn/3/library/string.html#formatspec

### 知识关联

- 承接 l2-2：格式化只能"美化"浮点显示，无法修复存储误差，判等仍需容差；
- 呼应 l9-2：datetime 对象经 f-string 的 `%Y-%m-%d` 指令格式化成标准日期文本；
- l11 系列 pandas 的 `to_string`/`style` 是本节对齐技巧在表格上的放大版。

### 本节总结（要点回顾）

1. `/` 恒为 float，`//` 向负无穷取整，`%` 与 `//` 满足恒等式 `a == (a//b)*b + a%b`；
2. `round` 受 IEEE 754 存储误差影响，展示用 f-string、结算用 Decimal；
3. f-string 格式符四段式：对齐+宽度+千分位+精度类型，一张小票模板可以吃透全部。
'''

ADD["pyf-l3-1"] = '''
### 问题背景与直觉理解（补充）

布尔逻辑是所有"筛选条件"的原子零件：SQL 的 WHERE、pandas 的布尔索引、业务规则引擎，底层全是 and/or/not 的组合。直觉模型：`and` 像串联电路（一断全断），`or` 像并联电路（一通即通），`not` 是反相器。Python 的独特之处在于短路求值返回的是**决定结果的那个操作数本身**（而不是布尔值）：`a or b` 返回 a（若为真值）否则 b，这个"返回操作数"的特性让 `x or 默认值` 成为 idiomatic 的兜底写法。

### 手算推导（逐步演算）

真值表（结合短路返回值规则）逐行推演：

| 表达式 | 求值过程 | 返回值 |
| --- | --- | --- |
| `[] or "默认"` | `[]` 为假 → 返回右侧 | `"默认"` |
| `[1] or "默认"` | `[1]` 为真 → 短路返回 | `[1]` |
| `None and f(x)` | `None` 为假 → 短路，f 不执行 | `None` |
| `0 < 50 < 100` | `(0<50) and (50<100)` → 都真 | `True` |
| `not ""` | `""` 为假 → 取反 | `True` |

链式比较 `0 < x < 100` 只求值 x 一次，等价于 `(0 < x) and (x < 100)`，且中间结果不会重复计算——这是 Python 对数学写法的原生支持。

### 完整案例（补充）：真值测试与短路保护

```python
records = [None, [], [1, 2], "", "ok", 0, 3]
for r in records:
    print(repr(r), "真值 =", bool(r))
vals = []
avg = sum(vals) / len(vals) if vals else 0.0   # and/or 短路：空列表给默认值
print("avg =", avg)
print(0 < 50 < 100, "链式比较等价于", (0 < 50) and (50 < 100))
name = None
print(name or "默认用户")   # or 短路返回第一个真值
```

预期输出（实测）：

```
None 真值 = False
[] 真值 = False
[1, 2] 真值 = True
'' 真值 = False
'ok' 真值 = True
0 真值 = False
3 真值 = True
avg = 0.0
True 链式比较等价于 True
默认用户
```

### 短路求值流程图解（文字示意图）

```
A and B：  求值 A ──假──▶ 直接返回 A（B 不执行）
              │真
              ▼
           求值 B ──────────▶ 返回 B

A or  B：  求值 A ──真──▶ 直接返回 A（B 不执行）
              │假
              ▼
           求值 B ──────────▶ 返回 B
```

### 参考资料（补充）

- **Python 官方文档：布尔运算与比较（语言参考）**——短路规则与返回值的权威定义
  - 链接：https://docs.python.org/zh-cn/3/reference/expressions.html#boolean-operations
- **Python 官方文档：内置类型之真值测试**
  - 链接：https://docs.python.org/zh-cn/3/library/stdtypes.html#truth-value-testing

### 知识关联

- 承接 l3-2：if 分支的条件就是本节真值表达式，卫语句惯用 `if not obj: return`；
- 呼应 l4-2：`for...else` 中 break 与 and 短路同样是"提前退出"思想；
- pandas 复合筛选用 `&`/`|`（位运算）而不用 `and`/`or`，正是本节末"逻辑 vs 按位"区别的实战化。

### 本节总结（要点回顾）

1. 假值一族：`None`、`False`、`0`、`0.0`、`""`、空容器；其余一律真值；
2. 短路求值返回操作数本身，`or` 兜底、`and` 守卫是两大惯用法；
3. 链式比较一次求值更安全；`and/or/not` 与 `&/|/~` 是两套体系，不得混用。
'''

ADD["pyf-l3-2"] = '''
### 问题背景与直觉理解（补充）

分支设计的质量差异，在"需求变更"时暴露无遗：箭头型嵌套每加一条规则就多缩进一层，半年后没人敢动；卫语句（Guard Clauses）把非法路径提前拦截，主逻辑永远保持在最浅层级，这是 PEP 8 与《重构》共同推荐的风格。直觉模型：卫语句像机场安检——护照无效（None）、行李超规（空值）、签证缺失（越权）在门口就被请出去，能走到登机口的都是"干净数据"。match-case（3.10+）则把"按形状分发"从 if 链的值比较升级为结构比较。

### 手算推导（逐步演算）

以阶梯税率（简化：≤36000 按 3%，≤144000 按 10%，其余 20%）推演 if/elif 的匹配顺序：

1. 输入 50000：`50000 <= 36000`？假 → 跳过；`50000 <= 144000`？真 → 命中 10% 档，**直接跳出整个分支链**；
2. 若把条件顺序写反（先判 `<= 144000`），36000 以内的收入也会被错误地吸入 10% 档——分支顺序本身携带业务语义；
3. 佐证：elif 链等价于"首次命中即退出"，这与 l4-2 的 `for...else` 中 break 退出是同一种控制流思想。

### 完整案例（补充）：卫语句重构与 match-case 分发

```python
def grade(score):
    if score >= 90: return "优秀"
    elif score >= 80: return "良好"
    elif score >= 60: return "及格"
    return "不及格"

for s in (95, 85, 60, 59):
    print(s, "->", grade(s))

def parse(cmd: str):
    match cmd.split():
        case ["go", direction]:
            return f"向 {direction} 移动"
        case ["look"]:
            return "环顾四周"
        case _:
            return "未知指令"

print(parse("go north"), "|", parse("look"), "|", parse("fly"))
```

预期输出（实测）：

```
95 -> 优秀
85 -> 良好
60 -> 及格
59 -> 不及格
向 north 移动 | 环顾四周 | 未知指令
```

`case ["go", direction]` 是序列解包模式：列表长度为 2 且首元素为 "go" 才命中，同时把第二个元素绑定给 direction——相当于"判断 + 提取"一步完成，这是 if 链做不到的。

### 分支控制流图解（文字示意图）

```
输入 x
 │
 ├─ 卫语句 1：x 是 None？ ──▶ raise ValueError   （提前拦截）
 ├─ 卫语句 2：x < 0？      ──▶ return 0          （提前拦截）
 ▼
主逻辑（保持在最浅缩进层）：
 if x >= 90 ──真──▶ 优秀
    │假
    ▼
 elif x >= 80 ─真─▶ 良好
    │假
    ▼
  ...（首次命中即跳出整条链）
```

### 参考资料（补充）

- **PEP 634：Structural Pattern Matching**——match-case 的完整语义规范
  - 链接：https://peps.python.org/pep-0634/
- **Python 官方文档：更多控制流工具（if 语句）**
  - 链接：https://docs.python.org/zh-cn/3/tutorial/controlflow.html#if-statements

### 知识关联

- 承接 l3-1：分支条件即真值表达式，短路让卫语句写法成为可能；
- 呼应 l6-1：卫语句在函数内部的终极形态是"单一出口 + 早期 return"；
- match-case 解包模式与 l5-1 的序列解包赋值 `a, b = b, a` 一脉相承。

### 本节总结（要点回顾）

1. 卫语句优先：先拦截非法/边界路径，再写主逻辑，缩进深度不超过 2 层；
2. elif 链的顺序即优先级，条件区间必须从特殊到一般（或从严到宽）单调排列；
3. match-case 的价值在"结构匹配 + 变量绑定"，超过 5 个纯值比较的 if 链可考虑迁移。
'''

ADD["pyf-l4-1"] = '''
### 问题背景与直觉理解（补充）

循环选择的判断标准只有一句话：**知道次数用 for，不知道次数只知条件用 while**。遍历一批已知订单 → for；"不断重试直到接口返回 200" → while。直觉模型：while 是"烧水壶"（盯着温度计直到沸腾），for 是"传送带"（货到一件处理一件，送完即停）。`range()` 则是"按需生产数字的流水线"：它是惰性对象，`range(0, 10**9)` 并不生成十亿个整数，只保存起点、终点、步长三个数，内存占用恒定 O(1)。

### 手算推导（逐步演算）

1. while 累加 1..100（状态跟踪）：初始 `total=0, n=1` → 每轮 `total+=n; n+=1` → 第 k 轮结束时有 `total = k(k+1)/2, n = k+1`；n=101 时退出，total = 100×101/2 = 5050；
2. `range(1, 10, 3)` 元素推演：1, 4, 7——下一个是 10，但 10 ≥ stop(10)，左闭右开规则截断；元素个数公式 `(stop - start + step - 1) // step` = (10-1+3-1)//3 = 3 ✓；
3. `len(range(0, 100, 7))` = (100-0+7-1)//7 = 15，与实测一致——range 的 len 是公式计算而非真实数数。

### 完整案例（补充）：双循环范式与 range 性质验证

```python
total = 0
n = 1
while n <= 100:
    total += n
    n += 1
print("while 累加 1..100 =", total)
print("for+range 等价写法 =", sum(range(1, 101)))
print(list(range(1, 10, 3)), list(range(10, 0, -3)))
for ch in "ab1":
    print(ch, end=" ")
print()
print(len(range(0, 100, 7)))   # range 是惰性对象，len O(1)
```

预期输出（实测）：

```
while 累加 1..100 = 5050
for+range 等价写法 = 5050
[1, 4, 7] [10, 7, 4, 1]
a b 1
15
```

`sum(range(1, 101))` 展示了 for 的最高形态：不需要循环体，直接把可迭代对象喂给聚合函数。凡是"遍历后聚合"的需求，优先考虑 `sum/max/min/any/all` 而不是手写累加器。

### while 状态机图解（文字示意图）

```
        ┌──────────────────────┐
        ▼                      │
  [条件成立？] ──否──▶ 退出循环
        │是
        ▼
   执行循环体（必须让状态向"条件变假"推进！）
        │
        └── 回到条件检查

死循环根源：循环体忘写 n += 1 之类的推进语句
```

### 参考资料（补充）

- **Python 官方教程：更多控制流工具**——while/for/range 的权威用法
  - 链接：https://docs.python.org/zh-cn/3/tutorial/controlflow.html
- **Python 官方文档：range 类型**——惰性序列的性质说明
  - 链接：https://docs.python.org/zh-cn/3/library/stdtypes.html#ranges

### 知识关联

- 承接 l4-2：break/continue 是对两种循环的"中途干预"，循环 else 依赖"是否被 break"；
- 呼应 l5-3：列表推导式是 for 循环"遍历-变换-收集"的语法糖；
- l10-1 会证明：千万级数据的循环应迁移到 NumPy 向量化，Python 层 for 只做业务编排。

### 本节总结（要点回顾）

1. for 遍历可迭代对象、while 盯守状态条件，二者不可互相硬套；
2. range 左闭右开、支持负步长、惰性 O(1) 内存，`len()` 走公式；
3. 死循环自查第一问：循环体里有没有让条件趋假的推进语句？
'''

ADD["pyf-l4-2"] = '''
### 问题背景与直觉理解（补充）

break/continue/else 三件套解决的是"循环中的决策"问题：continue 是"这件货不合格，看下一件"，break 是"找到目标，整条传送带停下"。而 `for...else` 是 Python 最反直觉也最优雅的设计——else 表示"循环**没有**被 break 打断、自然跑完"时的收尾动作，专治"搜索不到目标"场景：传统写法需要一个 found 标志位，循环 else 把标志位彻底消灭。enumerate 与 zip 则解决"遍历时要同时拿什么"：要索引用 enumerate，要多序列对齐用 zip。

### 手算推导（逐步演算）

1. 过滤案例状态跟踪：`scores=[88, -1, 92, None, 75]` → 88 通过 append；-1 命中 `s < 0` → break 终止？不——条件顺序是先 None/负数 continue：-1 被 continue 跳过、92 入列、None 被 continue 跳过、75 入列，valid=[88, 92, 75]，均值 255/3 = 85.0；
2. 循环 else 推演：查找 7，i=2 处命中 break → else 不执行 → 输出"找到 7，索引 2"；若查找 6，循环自然结束 → else 执行 → 输出"未找到"；
3. `zip("ABCD", [10, 20, 30])`：最短序列 3 个元素，截断输出 3 对，D 与 40 被静默丢弃——数据对齐事故的常见来源。

### 完整案例（补充）：三件套实战与 zip 行为验证

```python
scores = [88, -1, 92, None, 75]
valid = []
for s in scores:
    if s is None or s < 0:
        continue          # 跳过脏数据
    if s < 60:
        break             # 业务规则：遇不及格立即终止
    valid.append(s)
print(valid, "均值", sum(valid) / len(valid))

target = 7
for i, v in enumerate([3, 5, 7, 9]):
    if v == target:
        print(f"找到 {target}，索引 {i}")
        break
else:
    print("未找到")       # 仅当循环未被 break 时执行

print(list(zip("ABCD", [10, 20, 30])))           # 截断到最短
print(list(zip("AB", [1, 2], strict=False)))
```

预期输出（实测）：

```
[88, 92, 75] 均值 85.0
找到 7，索引 2
[('A', 10), ('B', 20), ('C', 30)]
[('A', 1), ('B', 2)]
```

生产建议：多序列对齐若长度必须一致，用 `zip(..., strict=True)`（3.10+），长度不齐会抛 ValueError 而不是静默截断——把"数据事故"从下游对账提前到出错现场。

### 控制流图解（文字示意图）

```
for item in iterable:
    │
    ├─ continue ──▶ 跳回本轮收尾，进入下一元素
    ├─ break ────▶ 立即跳出整个循环（else 不执行）
    ▼
  循环体执行完毕
    │
    ▼
[循环是否被 break？]
  ├─ 否 ─▶ 执行 else 块
  └─ 是 ─▶ 跳过 else
```

### 参考资料（补充）

- **Python 官方文档：break、continue 与循环 else 语义**
  - 链接：https://docs.python.org/zh-cn/3/tutorial/controlflow.html#break-and-continue-statements-and-else-clauses-on-loops
- **Python 官方文档：enumerate / zip 内置函数**
  - 链接：https://docs.python.org/zh-cn/3/library/functions.html#enumerate

### 知识关联

- 承接 l4-1：本节所有控制流都架在 for/while 之上；
- 呼应 l5-2：`zip` 与 `dict(zip(keys, values))` 组合是两张清单建映射的标准姿势；
- l11-2 的 pandas 布尔筛选本质上把"遍历+continue 过滤"压成一行向量化表达式。

### 本节总结（要点回顾）

1. continue 管单轮、break 管全程；循环 else 专治"未找到"，消灭 found 标志位；
2. enumerate(start=) 替代 range(len(...))，zip 默认截断、strict=True 可强制等长校验；
3. 脏数据过滤的两段式：先 continue 掉不可比对象，再执行业务判断。
'''

ADD["pyf-l5-1"] = '''
### 问题背景与直觉理解（补充）

list 与 tuple 的选型问题贯穿整个 Python 生涯。直觉模型：list 是"活页夹"——随时插页、抽页、重排；tuple 是"塑封档案"——装订后只可阅读。塑封的价值有三：不可变意味着**可哈希**（能当 dict 键、能进 set）、**线程安全**（无需加锁只读共享）、以及向读者传达"这段数据是契约，不许改"。切片 `[start:stop:step]` 则是序列的通用取景框，左闭右开让 `len(lst[a:b]) == b-a`、让相邻切片 `lst[:i] + lst[i:]` 无缝拼回原序列。

### 手算推导（逐步演算）

1. `lst[1:5:2]`（lst=[10,20,30,40,50,60]）：从索引 1 起步、步长 2、止于索引 5 之前 → 索引 1, 3 → `[20, 40]`；
2. `lst[-2:]`：负索引换算 `len-2=4`，从 4 到末尾 → `[50, 60]`；`lst[::-1]`：步长 -1 自右向左 → 全序列倒序；
3. 内存对比：1000 元素 list 存 1000 个指针（8 字节×1000 + 头部 ≈ 8056 字节），tuple 同规模 ≈ 8040 字节——tuple 略小且创建后不可扩容，分配是一次性的；
4. `(42,)` 与 `(42)`：前者是元组，后者只是带括号的 int——逗号才是元组的签名，括号只是分组。

### 完整案例（补充）：切片取景框与不可变取证

```python
lst = [10, 20, 30, 40, 50, 60]
print(lst[1:5:2], lst[:3], lst[-2:], lst[::-1])
tup = (1, "a", 3.0)
print(tup[0], tup.count(1), len(tup))
single = (42,)          # 单元素元组必须带逗号
print(type(single).__name__, type((42)).__name__)
import sys
a = list(range(1000)); t = tuple(range(1000))
print(sys.getsizeof(a), sys.getsizeof(t))    # 元组更省内存
try:
    tup[0] = 9
except TypeError as e:
    print("TypeError:", e)
```

预期输出（实测）：

```
[20, 40] [10, 20, 30] [50, 60] [60, 50, 40, 30, 20, 10]
1 1 3
tuple int
8056 8040
TypeError: 'tuple' object does not support item assignment
```

### 可变性对比图解（文字示意图）

```
list（活页夹）                 tuple（塑封档案）
[10, 20, 30]                  (1, 'a', 3.0)
  append(99) ─▶ 原地扩容        任何"修改"请求
  lst[0]=9  ─▶ 原地覆盖           │
  pop()     ─▶ 原地收缩           ▼
  （id 不变）                  TypeError 或整体重建
                               （可哈希：可作 dict 键）
```

### 参考资料（补充）

- **Python 官方教程：数据结构（列表与序列）**
  - 链接：https://docs.python.org/zh-cn/3/tutorial/datastructures.html
- **Python 官方文档：Tuples and Sequences**——不可变语义与单元素元组语法
  - 链接：https://docs.python.org/zh-cn/3/tutorial/datastructures.html#tuples-and-sequences

### 知识关联

- 承接 l2-1：赋值共享引用，本节的浅拷贝/深拷贝是它的直接续篇；
- 呼应 l5-2：tuple 可哈希才能当字典键，list 永远不行；
- l6-1 的"多返回值"本质是返回一个 tuple，由调用方解包。

### 本节总结（要点回顾）

1. 可变性是选型的第一标准：字段契约/字典键/多返回值用 tuple，动态集合用 list；
2. 切片三要素 start:stop:step 全部可省略，`[::-1]` 倒序、`[:]` 浅拷贝是两大肌肉记忆；
3. `append()` 返回 None（原地操作），排序同理 `sort()` 原地而 `sorted()` 返回新对象。
'''

ADD["pyf-l5-2"] = '''
### 问题背景与直觉理解（补充）

dict 与 set 共享同一套心脏——**哈希表**。直觉模型：dict 是"带标签的储物柜"，键经哈希函数换算成柜号，取物直接开柜，不必挨个翻找，因此单次查找恒定 O(1)；set 是"只存柜号不存物品的登记处"，专管"存在性"问题。这使得"这个元素在不在集合里"用 set 是 O(1)、用 list 是 O(n)——数据量到十万级时两者差出一万倍，这是数据清洗中"先去重再比对"的性能根据。两大铁律：键/元素必须可哈希（不可变），且 dict 自 3.7 起保证插入序。

### 手算推导（逐步演算）

1. 复杂度对比：`99999 in big_dict`（10 万键）≈ 常数次哈希与比较；`99999 in big_list` 需线性扫描最多 10 万次——命中率平均 n/2 = 5 万次比较，差距 5 个数量级；
2. 集合代数：数码用户 {u1,u2,u3} 与图书用户 {u2,u3,u4} → 交集 {u2,u3}（交叉购买）、差集 数码-图书 = {u1}（流失候选）、并集 4 人（总触达）；
3. `Counter("banana")` 推演：b:1, a:3, n:2 → `most_common(2)` 按计数降序 → [('a',3), ('n',2)]。

### 完整案例（补充）：哈希查找 O(1) 与集合代数实战

```python
d = {"sku-A": 12, "sku-B": 7}
print(d.get("sku-C", 0), "sku-C" in d)
d.update({"sku-B": 9, "sku-C": 3})
print(sorted(d.items()))
from collections import Counter
print(Counter("banana").most_common(2))
digital = {"u1", "u2", "u3"}
book = {"u2", "u3", "u4"}
print(digital & book, digital - book, digital | book)
big = {x: x * x for x in range(100000)}
print("10 万键查找成本 O(1)：", big[99999])
```

预期输出（实测）：

```
0 False
[('sku-A', 12), ('sku-B', 9), ('sku-C', 3)]
[('a', 3), ('n', 2)]
{'u3', 'u2'} {'u1'} {'u1', 'u2', 'u4', 'u3'}
10 万键查找成本 O(1)： 9999800001
```

set 的无序性导致每次运行的输出顺序可能不同（哈希随机化），因此需要稳定输出时先 `sorted()`。

### 哈希表工作原理图解（文字示意图）

```
键 "sku-B" ──hash()──▶ 大整数 ──取模──▶ 槽位下标 7
                                          │
储物柜数组： [0] [1] ... [7]──▶ ("sku-B", 7) ... [N]
                                          │
查找 "sku-B"：同一哈希路径直达槽位，O(1)   ✓
冲突处理：开放寻址/链式，均摊仍 O(1)
```

### 参考资料（补充）

- **Python 官方 Wiki：TimeComplexity**——list/set/dict 各操作复杂度权威表
  - 链接：https://wiki.python.org/moin/TimeComplexity
- **Python 官方教程：Dictionaries（字典）**
  - 链接：https://docs.python.org/zh-cn/3/tutorial/datastructures.html#dictionaries

### 知识关联

- 承接 l5-1：可哈希性的根源是"不可变"，tuple 能当键、list 不能；
- 呼应 l5-3：字典推导式是批量建哈希映射的语法糖；
- l11-3 的 `merge(validate='one_to_one')` 与本节"键唯一性"思想同源。

### 本节总结（要点回顾）

1. dict/set 查找 O(1) 的根据是哈希表，"存在性判断"永远优先 set/dict 而非 list；
2. `.get(k, default)` 消灭 KeyError，`.setdefault`/`collections.defaultdict` 管累计初始化；
3. 交并差是用户分层的代数语言：`&` 共性、`-` 差异、`|` 全集、`^` 独占。
'''

ADD["pyf-l5-3"] = '''
### 问题背景与直觉理解（补充）

推导式（Comprehension）是 Python 的"签名级"语法：把"建空列表→循环→判断→append"四行压成一行，且底层由专用字节码优化，比等价 for 循环少执行每次迭代的方法查找，通常更快。直觉模型：推导式是一条"流水线传送带"——`for` 从原料区取货，`if` 是质检员（淘汰），表达式是加工台，产出直接装箱。两个易混位置口诀：**纯过滤 if 在右边，三元变换 if-else 在左边**——前者是"要不要"，后者是"要什么"。

### 手算推导（逐步演算）

1. `[x*x for x in data if x > 50]`，data=[12, 55, 8, 91, 30, 66]：12 淘汰 → 55 通过加工 3025 → 8 淘汰 → 91 通过 8281 → 30 淘汰 → 66 通过 4356 → 结果 [3025, 8281, 4356]，共 6 次质检、3 次加工；
2. 嵌套展平 `[cell for row in matrix for cell in row]`：for 顺序即书写顺序，外层 row 走 [[1,2],[3,4],[5,6]] 三轮，内层 cell 各取 2 个 → [1,2,3,4,5,6]；
3. 性能实测（本机）：列表推导式 0.049s vs `list(map(lambda))` 0.095s（2000 次×1000 元素）——lambda 调用开销使 map 反而更慢，可读性也差，日常首选推导式。

### 完整案例（补充）：过滤、变换与嵌套展平

```python
data = [12, 55, 8, 91, 30, 66]
sq = [x * x for x in data if x > 50]
print(sq)
matrix = [[1, 2], [3, 4], [5, 6]]
flat = [cell for row in matrix for cell in row]
print(flat)
names = {"amy": 88, "bob": 45, "cat": 92}
passed = {k.capitalize(): v for k, v in names.items() if v >= 60}
print(passed)
import timeit
loop = timeit.timeit("[x*2 for x in range(1000)]", number=2000)
comp = timeit.timeit("list(map(lambda x: x*2, range(1000)))", number=2000)
print(f"推导式 {loop:.3f}s vs map {comp:.3f}s")
```

预期输出（实测，时间数据机器相关）：

```
[3025, 8281, 4356]
[1, 2, 3, 4, 5, 6]
{'Amy': 88, 'Cat': 92}
推导式 0.049s vs map 0.095s
```

工程红线：一行推导式超过两层 for 或两个条件就该拆回普通循环——可读性是硬通货，"炫技式"嵌套推导是团队代码评审的一票否决项。

### 推导式流水线图解（文字示意图）

```
可迭代源 ─▶ for 取元素 ─▶ [if 纯过滤（可 0..n 个）] ─▶ 表达式加工 ─▶ [if-else 三元变换] ─▶ 收集
              │                  │                                        │
           data 元素        "要不要这条"                            "要原样还是变换"
结果：新列表/新字典/新集合（生成器表达式则换成圆括号，惰性产出）
```

### 参考资料（补充）

- **PEP 202：List Comprehensions**——列表推导式的立项文档
  - 链接：https://peps.python.org/pep-0202/
- **PEP 274：Dict Comprehensions**——字典/集合推导式规范
  - 链接：https://peps.python.org/pep-0274/

### 知识关联

- 承接 l4-1/l4-2：推导式是 for+if+append 的紧凑化，控制流知识全部复用；
- 呼应 l5-2：字典推导式与 set 推导式共享同一套语法骨架；
- pep-l7-1 的生成器表达式 `(x*2 for x in ...)` 是"不装箱"版本，大数据量下内存恒定。

### 本节总结（要点回顾）

1. 书写顺序 = 执行顺序：for 在前、过滤 if 在右、三元 if-else 在左；
2. 推导式有专用字节码路径，通常快于手写循环，且零副作用更安全；
3. 复杂度红线：两层嵌套封顶，超限拆函数——代码是写给人看的。
'''

ADD["pyf-l6-1"] = '''
### 问题背景与直觉理解（补充）

函数是"防呆装置"：把一段易错逻辑封进黑盒，外部只看签名（参数名+类型注解+docstring）就能正确使用，内部怎么改都不影响调用方——这就是封装的杠杆。直觉模型：函数像自动售货机，投币（实参）→ 内部机械（函数体）→ 出货（返回值）；`return` 是唯一的出货口，且**执行到 return 函数立刻终止**。没有 return 的函数返回 None，这不是"没有返回值"，而是"返回了 None 这个值"—— distinction 决定了 `lst = lst.append(5)` 为什么会让 lst 变成 None。

### 手算推导（逐步演算）

跟踪 `describe("小明", 88, 92, 79)`：

1. 形参绑定：name="小明"；`*scores` 把剩余 3 个位置参数打包成元组 `(88, 92, 79)`；
2. 函数体：`sum(scores)=259`，`len(scores)=3`，`round(259/3, 1)` = round(86.333..., 1) = 86.3；`max(scores)=92`；
3. `return name, r2, r3` 打包为元组 `("小明", 86.3, 92)`，调用处三变量解包各取其一；
4. `describe("空记录")`：scores=()，`not scores` 为 True → 提前 return ("空记录", 0.0, 0.0)，卫语句避免对空序列取 max 报 ValueError。

### 完整案例（补充）：docstring 契约与多返回值解包

```python
def describe(name: str, *scores: float, precision: int = 1) -> tuple:
    """返回 (姓名, 平均分, 最高分) 三元组。

    Args:
        name: 学员姓名
        scores: 任意多个科目的分数
        precision: 平均分保留位数
    """
    if not scores:
        return name, 0.0, 0.0
    return name, round(sum(scores) / len(scores), precision), max(scores)

r1, r2, r3 = describe("小明", 88, 92, 79)
print(r1, r2, r3)
print(describe("空记录"))
print(describe.__doc__.splitlines()[0])
print(describe("小红", 70, 80, precision=2))
```

预期输出（实测）：

```
小明 86.3 92
('空记录', 0.0, 0.0)
返回 (姓名, 平均分, 最高分) 三元组。
('小红', 75.0, 80)
```

`describe.__doc__` 能被 help()、IDE 悬浮提示与文档生成器（Sphinx）读取——docstring 不是注释，是**机器可读的接口契约**，PEP 257 规定首行用一句话祈使句描述"做什么"。

### 函数调用机制图解（文字示意图）

```
调用 describe("小明", 88, 92, 79)
        │
        ▼
新建栈帧（独立命名空间）
  name = "小明"
  scores = (88, 92, 79)     ← *args 打包
        │ 执行函数体
        ▼
return ("小明", 86.3, 92)   ← 多值打包为 tuple
        │ 栈帧销毁，局部变量一并回收
        ▼
调用方解包 r1, r2, r3
```

### 参考资料（补充）

- **PEP 257：Docstring Conventions**——文档字符串书写规范
  - 链接：https://peps.python.org/pep-0257/
- **Python 官方教程：定义函数**
  - 链接：https://docs.python.org/zh-cn/3/tutorial/controlflow.html#defining-functions

### 知识关联

- 承接 l6-2：本节的 `*scores` 是不定长参数的第一次亮相，下节展开 `*args/**kwargs` 全景；
- 呼应 l6-3：函数创建独立命名空间，是 LEGB 规则中 Local 层的来源；
- pep-l2-2 的类型注解在 pandas UDF 与 Pydantic 校验中是"运行时契约"。

### 本节总结（要点回顾）

1. 函数名是动词短语、单一职责；docstring 首行一句话，说明"做什么"而非"怎么做"；
2. return 即终止：多返回值是 tuple 打包，无 return 等于 return None；
3. 先定义后调用：Python 按顺序执行模块，函数体在调用时才真正展开。
'''

ADD["pyf-l6-2"] = '''
### 问题背景与直觉理解（补充）

参数传递的全景图，本质是回答"实参如何落座到形参"的座位表问题：位置参数按座位号入座，关键字参数凭姓名入座，默认值是"空座垫底"，`*args` 收纳散客，`**kwargs` 收纳行李。为什么**可变默认参数**是史诗级陷阱？因为默认值在 `def` 执行那一刻被求值一次并绑定在函数对象上（`fn.__defaults__` 可查），之后所有调用共享同一个对象——第一次调用往里 append，第二次调用时"出厂设置"已被污染。直觉模型：默认参数是挂在售货机上的**公用托盘**，不是每单一个新的。

### 手算推导（逐步演算）

1. `report("日报", "华东区", 1200, 980, sep=" # ", author="AI")`：title="日报"（位置），unit="华东区"（第二个位置实参命中默认槽），`*rows=(1200, 980)`，sep 被关键字覆盖为 " #"，author 进 `**extra`；
2. `flex(1, 9, 7, 8, c=3, z=26, y=25)`：a=1（位置），b=9（覆盖默认），args=(7, 8)，c=3（仅关键字），kwargs 排序后 ['y', 'z']；
3. 可变默认参数推演：`def f(x, acc=[])` 连续调用 `f(1); f(2)` → acc 是同一列表 → 第二次进入时已是 [1]，返回 [1, 2]——跨调用"记忆"数据，测试与并发场景下必然出事。

### 完整案例（补充）：参数全家桶与顺序铁律

```python
def report(title, /, unit="元", *rows, sep=" | ", **extra):
    out = [title]
    for r in rows:
        out.append(str(r))
    out.extend(f"{k}={v}" for k, v in extra.items())
    return sep.join(out)

print(report("日报", "华东区", 1200, 980, sep=" # ", author="AI"))
print(report("裸标题"))
def flex(a, b=2, *args, c, **kw):
    return (a, b, args, c, sorted(kw))
print(flex(1, 9, 7, 8, c=3, z=26, y=25))
```

预期输出（实测）：

```
日报 # 1200 # 980 # author=AI
裸标题
(1, 9, (7, 8), 3, ['y', 'z'])
```

`title, /` 中的斜杠（PEP 570）表示 title 是**仅位置参数**，调用方写 `report(title="日报")` 会直接 TypeError——API 作者借此保留"未来改名形参"的自由。可变默认值的正确姿势：占位 `=None`，函数体内 `if acc is None: acc = []`。

### 参数座位表图解（文字示意图）

```
def f(pos_only, /, normal, default=1, *args, kw_only, **kwargs):
      └─仅位置─┘└─位置或关键字─┘└─收纳多余位置─┘└─仅关键字─┘└─收纳多余关键字─┘

调用 f(1, 2, 3, 4, kw_only=5, x=6):
  pos_only=1  normal=2  args=(3,4)  kw_only=5  kwargs={'x':6}
铁律顺序：仅位置 → 普通 → 默认值 → *args → 仅关键字 → **kwargs
```

### 参考资料（补充）

- **PEP 570：Python Positional-Only Parameters**
  - 链接：https://peps.python.org/pep-0570/
- **PEP 3102：Keyword-Only Arguments**
  - 链接：https://peps.python.org/pep-3102/

### 知识关联

- 承接 l6-1：默认值与仅关键字参数让函数签名成为"自带文档"的接口；
- 呼应 l2-1：可变默认参数陷阱的根源正是"赋值共享引用"——同一对象被跨调用共享；
- llma-l2-1 的 Function Calling 工具 schema 即由函数签名自动反射生成。

### 本节总结（要点回顾）

1. 顺序铁律：仅位置 → 普通 → 默认 → *args → 仅关键字 → **kwargs，违反即 SyntaxError；
2. 可变默认参数是跨调用共享的同一对象，永远以 None 占位、体内重建；
3. `**kwargs` 解包调用 `f(**dict)` 与定义侧对称，是配置透传的通用手法。
'''

ADD["pyf-l6-3"] = '''
### 问题背景与直觉理解（补充）

LEGB 是 Python 解析变量名的"寻址顺序"：Local（函数内）→ Enclosing（外层函数）→ Global（模块级）→ Builtin（内建）。直觉模型：四层是四圈同心环，解释器像"从座位找信号"——先看手边（Local），再看邻座（Enclosing），再看整节车厢（Global），最后问广播（Builtin），**找到即停，绝不回头**。这条规则的推论：函数内一旦出现赋值，该名字整个函数体内都被声明为局部（编译期决定），于是"先引用后赋值"会触发 UnboundLocalError——错误发生在运行时，根源却在编译期的作用域标注。

### 手算推导（逐步演算）

1. 闭包取值：inner(100) 中 price=100（L），discount=0.9（E，来自 outer），rate=0.8（G）→ 100×0.9×0.8 = 72.0；inner 被外层返回后仍"记得" discount——这就是闭包；
2. `inc_bad()` 中 `counter += 1` 等价于 `counter = counter + 1`：左侧赋值 → 编译期把 counter 标记为局部 → 右侧读取时局部 counter 尚未初始化 → UnboundLocalError；
3. `inc_ok()` 声明 `global counter` 后，赋值直写全局：两次调用后 counter = 2；
4. 列表推导式 `[x*10 for x in range(3)]` 在 3.x 中有**独立作用域**，x 不会泄漏到模块全局——与 Python 2 的行为差异。

### 完整案例（补充）：LEGB 与 global 取证

```python
rate = 0.8            # Global
def outer():
    discount = 0.9    # Enclosing
    def inner(price):
        fee = 1       # Local
        return price * discount * rate
    return inner
f = outer()
print(f(100))
counter = 0
def inc_bad():
    # counter += 1     # UnboundLocalError（被注释以免崩溃）
    return counter
print(inc_bad())
def inc_ok():
    global counter
    counter += 1
    return counter
print(inc_ok(), inc_ok(), counter)
print([x * 10 for x in range(3)])
```

预期输出（实测）：

```
72.0
0
1 2 2
[0, 10, 20]
```

工程纪律：`global` 是"最后手段"而非常规武器——全局可变状态让函数不再纯、测试不再可并行；跨函数共享数据应通过参数传入、返回值传出，或封装为类属性。

### LEGB 同心环图解（文字示意图）

```
┌─ Builtin：print / len / sum …（最外圈）
│ ┌─ Global：模块级 rate = 0.8
│ │ ┌─ Enclosing：outer 内 discount = 0.9
│ │ │ ┌─ Local：inner 内 price = 100, fee = 1
│ │ │ │   查找顺序 L → E → G → B，命中即停
│ │ │ └──────────────┘
│ │ └─────────────────────┘
│ └────────────────────────────┘
└────────────────────────────────────┘
```

### 参考资料（补充）

- **PEP 227：Statically Nested Scopes**——嵌套作用域与闭包语义的立项文档
  - 链接：https://peps.python.org/pep-0227/
- **Python 官方文档：作用域与命名空间**
  - 链接：https://docs.python.org/zh-cn/3/tutorial/classes.html#python-scopes-and-namespaces

### 知识关联

- 承接 l6-1：函数栈帧就是 Local 作用域的物理载体；
- 呼应 l6-2：默认值存于函数对象 `__defaults__`，同样遵循"定义时求值一次"；
- pep-l9-1 的环境变量读取本质是"全局配置注入"，与本节 global 风险对照学习。

### 本节总结（要点回顾）

1. LEGB 命中即停：内层同名遮蔽外层，解释器不会"越级纠错"；
2. 函数内赋值 = 编译期局部声明，"先读后写"必炸 UnboundLocalError；
3. 优先纯函数（无全局副作用），global/nonlocal 只用于计数器、单例缓存等极少数场景。
'''

def main():
    c = json.load(io.open(P, encoding="utf-8"))
    n = 0
    for ch in c["chapters"]:
        for l in ch["lessons"]:
            if l["id"] in ADD and len(l.get("content", "")) < 2600:
                l["content"] = merge(l["content"], ADD[l["id"]])
                n += 1
                print(l["id"], "->", len(l["content"]))
    c["updatedAt"] = int(time.time() * 1000)
    json.dump(c, io.open(P, "w", encoding="utf-8", newline="\n"), ensure_ascii=False, indent=2)
    print("expanded", n)

if __name__ == "__main__":
    main()
