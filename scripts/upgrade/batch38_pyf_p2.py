# -*- coding: utf-8 -*-
"""batch38: python-foundations-data 扩充补丁 P2（第 7-12 章，16 节）。
所有代码与输出均在 Python 3.11.15 / pandas 3.0.5 / numpy 2.4.3 实测。
"""
import json, io, re, time

P = r"D:\Python_Project\knowledge-order\content-data\courses\python-foundations-data.json"
REF_RE = re.compile(r"\n#{2,4} [^\n]*(参考资料|延伸阅读|Reference)[^\n]*\n")

def merge(content, add):
    ms = list(REF_RE.finditer(content))
    if ms and ms[-1].start() > len(content) * 0.6:
        i = ms[-1].start()
        return content[:i].rstrip() + "\n\n" + add.strip() + "\n" + content[i:]
    return content.rstrip() + "\n\n" + add.strip() + "\n"

ADD = {}

ADD["pyf-l7-1"] = '''
### 问题背景与直觉理解（补充）

为什么必须先分清"语法错误"与"运行时异常"？因为排查手段完全不同：语法错误发生在**编译期**（解释器逐行 parse 时），代码一行都不会执行，直接看指向的行号改语法即可；运行时异常发生在**执行期**，前几行已经跑过、变量已经产生，需要结合现场数据定位。直觉模型：语法错误是"菜谱本身写错了"（缺步骤、步骤顺序不合法），运行时异常是"照着正确的菜谱做，却发现鸡蛋是坏的"——菜没问题，是原料出了状况。熟记六大异常的"触发指纹"，看到异常名就能秒判病灶在哪一层。

### 手算推导（逐步演算）

六类异常的触发条件逐一推演：

1. `{}["sku-A"]`：字典存在，但键 "sku-A" 不在 → **KeyError**（"容器在，键不在"）；
2. `[1, 2][5]`：列表存在，下标 5 越界（合法范围 0..1）→ **IndexError**；
3. `int("abc")`：int() 接受字符串（类型对），但内容不是合法数字（值不对）→ **ValueError**；
4. `"age: " + 18`：str 只能与 str 拼接，18 是 int → **TypeError**（类型本身不兼容）；
5. `10 / 0`：除数为零 → **ZeroDivisionError**；
6. `None.split()`：None 没有 split 方法 → **AttributeError**——pandas 里 `df['col'].stf` 之类的手滑都会落到它。

记忆口诀：**TypeError 管类型、ValueError 管取值、KeyError/IndexError 管"找不到"、AttributeError 管"没这个能力"**。

### 完整案例（补充）：六连击异常指纹库

```python
def fire(kind):
    if kind == "key":
        {}["sku-A"]
    elif kind == "index":
        [1, 2][5]
    elif kind == "value":
        int("abc")
    elif kind == "type":
        "age: " + 18
    elif kind == "zero":
        10 / 0
    elif kind == "attr":
        None.split()

for k in ("key", "index", "value", "type", "zero", "attr"):
    try:
        fire(k)
    except Exception as e:
        print(f"{type(e).__name__:12s} <- {k}: {e}")
```

预期输出（实测）：

```
KeyError     <- key: 'sku-A'
IndexError   <- index: list index out of range
ValueError   <- value: invalid literal for int() with base 10: 'abc'
TypeError    <- type: can only concatenate str (not "int") to str
ZeroDivisionError <- zero: division by zero
AttributeError <- attr: 'NoneType' object has no attribute 'split'
```

`AttributeError: 'NoneType' object has no attribute ...` 是数据岗出镜率最高的报错——它的上游几乎总是一个"本应有值却返回了 None"的函数调用，修异常先修上游。

### 异常发生时机图解（文字示意图）

```
写代码 ──▶ 保存 .py
   │ 解释器 parse（编译期）
   ├─ 语法不合法 ──▶ SyntaxError（一行都没执行）
   ▼
逐条执行字节码（运行期）
   ├─ 第 1 行成功 → 变量产生
   ├─ 第 2 行 10/0 ──▶ ZeroDivisionError（现场已有部分结果）
   ▼
异常向上冒泡：函数栈逐层退出，直到被 try 捕获或进程终止
```

### 参考资料（补充）

- **Python 官方文档：内置异常层级**
  - 链接：https://docs.python.org/zh-cn/3/library/exceptions.html#exception-hierarchy
- **Python 官方教程：错误与异常**
  - 链接：https://docs.python.org/zh-cn/3/tutorial/errors.html

### 知识关联

- 承接 l2-2：`int("19.9")` 的 ValueError 就是本节指纹库的一员；
- 呼应 l7-2：知道"谁会抛什么"，才能决定 try 该捕获哪一类；
- l11-1 的 `pd.to_numeric(errors="coerce")` 是"把异常转化为 NaN"的向量化容错。

### 本节总结（要点回顾）

1. SyntaxError 在编译期、异常在运行期，二者排查入口不同；
2. 六大指纹：KeyError（键不在）、IndexError（下标越界）、ValueError（值不合法）、TypeError（类型不兼容）、ZeroDivisionError、AttributeError（None 上调方法）；
3. 读异常先看类型名，再读消息里的"值"，最后回溯行号。
'''

ADD["pyf-l7-2"] = '''
### 问题背景与直觉理解（补充）

try-except-else-finally 四段式的分工，直觉上像医院就诊流程：try 是"检查室"（只放可能出问题的那几行），except 是"急诊室"（分类处置），else 是"体检报告正常后的下一步"（**只有 try 完全成功才执行**），finally 是"离院手续"（无论结果如何必办，用于关文件、释放连接、解锁资源）。为什么严禁裸 `except:`？因为它会把 KeyboardInterrupt（Ctrl+C）、SystemExit 甚至代码里的 NameError 一并吞掉，让程序"看起来活着"却早已病入膏肓——捕获范围必须精确到你能处理的异常类型。

### 手算推导（逐步演算）

跟踪 `parse_row("28")` 与 `parse_row("abc")` 两条路径的执行序：

- 路径 A（"28"）：try 内 int 成功 → **except 被跳过** → else 执行（打印"合法年龄 28"）→ finally 执行 → 函数返回 28；
- 路径 B（"abc"）：try 内 int 抛 ValueError → **else 被跳过** → except 执行（打印"非法年龄"，返回 None）→ finally 仍执行；
- 推论：else 的存在让"成功路径"与"失败路径"互不污染——try 块保持最小，成功后的业务逻辑放 else，资源清理放 finally，三条职责互不纠缠。

### 完整案例（补充）：四段式执行时序取证

```python
def parse_row(raw):
    try:
        age = int(raw)
    except ValueError as e:
        print(f"  except: 非法年龄 {raw!r} ({e})")
        return None
    else:
        print(f"  else: 合法年龄 {age}（无异常才执行）")
        return age
    finally:
        print("  finally: 清理现场（必执行）")

parse_row("28")
parse_row("abc")
print("函数未崩溃，继续主流程")
```

预期输出（实测）：

```
  else: 合法年龄 28（无异常才执行）
  finally: 清理现场（必执行）
  except: 非法年龄 'abc' (invalid literal for int() with base 10: 'abc')
  finally: 清理现场（必执行）
函数未崩溃，继续主流程
```

注意一个反直觉细节：即使 try/except 内已经 `return`，**finally 依然会在函数真正返回前执行**——这也是为什么"关闭资源"的代码放 finally 绝对可靠。

### 四段式执行时序图解（文字示意图）

```
进入 try
  │
  ├─ 抛异常 ──▶ 匹配 except 子句 ──▶ 执行处理 ──┐
  │            （无匹配 → 向上冒泡）             │
  └─ 未抛异常 ─▶ 执行 else 块 ──────────────────┤
                                                ▼
                                        执行 finally（必经之路）
                                                │
                                                ▼
                                        函数返回 / 继续主流程
```

### 参考资料（补充）

- **Python 官方教程：处理异常（try 语句完整语义）**
  - 链接：https://docs.python.org/zh-cn/3/tutorial/errors.html#handling-exceptions
- **PEP 344：Exceptions with Tracebacks**——异常链与 raise from 规范
  - 链接：https://peps.python.org/pep-0344/

### 知识关联

- 承接 l7-1：except 子句的"捕获名单"来自异常指纹库，只写你能处理的类型；
- 呼应 l8-1：`with open(...)` 本质是 try/finally + 上下文管理器协议的语法糖；
- pep-l9-1 的配置校验中，`raise ValueError(帮助信息)` 是主动拦截非法配置的标准动作。

### 本节总结（要点回顾）

1. try 最小化：只包裹真正会抛的那两三行，成功逻辑放 else、清理放 finally；
2. except 精确匹配 + `as e` 保留现场，raise 兜底拦截非法业务入参；
3. finally 晚于 return 执行，是资源清理的"绝对保险栓"。
'''

ADD["pyf-l7-3"] = '''
### 问题背景与直觉理解（补充）

Traceback 是 Python 送你的"事故现场勘查报告"，但它默认从最底行（异常爆发点）向上堆栈——**正确读法是从下往上看**：最底行是异常类型+消息+行号（病灶），上面每层 Frame 是"怎么走到这里的"（传播路径）。直觉模型：assert 是"生产车间的质检员"，只验内部契约（这个参数**按约定**不可能为负）；raise 是"门口的保安"，拦截的是**外部世界**可能送进来的任何脏东西。两者的根本区别在运行模式：`python -O` 会全局忽略 assert，所以面向用户的校验绝不能交给 assert。

### 手算推导（逐步演算）

1. `dividend(12.5, 4)`：断言 4 > 0 通过 → 12.5 × 4 = 50.0；
2. `dividend(12.5, 0)`：`shares > 0` 为 False → AssertionError("shares 必须为正，收到 0")，消息里的 f-string 把现场值带进报错，调试成本骤降；
3. traceback 的 `limit=1` 只打印最深 1 层调用帧——报错定位从"整条链"聚焦到"最后一跳"；
4. 若用 `python -O script.py` 运行，上述两处 assert 全部失效，`dividend(12.5, 0)` 会静默返回 0.0——契约检查凭空蒸发，这就是"assert 只验内部"的铁证。

### 完整案例（补充）：断言契约与 Traceback 勘查

```python
import traceback

def dividend(price, shares):
    assert shares > 0, f"shares 必须为正，收到 {shares}"
    assert isinstance(price, (int, float)), "price 必须是数值"
    return price * shares

print(dividend(12.5, 4))
try:
    dividend(12.5, 0)
except AssertionError as e:
    print("AssertionError:", e)
try:
    dividend(12.5, -1)
except AssertionError as e:
    traceback.print_exc(limit=1)
print(dividend("x", 4) if False else "跳过非法调用")
```

预期输出（实测，stderr 单独列出）：

```
50.0
AssertionError: shares 必须为正，收到 0
跳过非法调用
```

```
# stderr（traceback.print_exc 输出）
Traceback (most recent call last):
  File "<string>", line 15, in <module>
AssertionError: shares 必须为正，收到 -1
```

最底行 `line 15, in <module>` 告诉你病灶行号，`AssertionError` 尾部的消息直接给出"应收 vs 实收"——一段合格的错误消息应当让读者**不需要复现就能定位**。

### 排错四步法流程图解（文字示意图）

```
① 复现：用最小数据集稳定触发异常
        ▼
② 隔离：traceback 行号 + 二分注释，锁定最小失败单元
        ▼
③ 审查：打印（或断点）该行涉及的全部变量值
        ▼
④ 修复：改代码 → 重跑断言/测试 → 提交时附上回归用例
```

### 参考资料（补充）

- **Python 官方文档：traceback 模块**——程序化读取/打印调用栈
  - 链接：https://docs.python.org/zh-cn/3/library/traceback.html
- **Python 官方 FAQ：如何读懂 Traceback**
  - 链接：https://docs.python.org/zh-cn/3/faq/programming.html

### 知识关联

- 承接 l7-1/l7-2：断言失败抛出的 AssertionError 同样走异常冒泡通道，可被 try 捕获；
- 呼应 l6-3：UnboundLocalError 的定位正是"从下往上读 Traceback"的实战样本；
- pep-l3 章的 pytest 断言会自动重写 assert，给出更丰富的差值报告。

### 本节总结（要点回顾）

1. Traceback 从下往上读：底行=病灶（类型+消息+行号），上层=传播路径；
2. assert 验内部契约、消息用 f-string 带上现场值；`python -O` 会禁用一切 assert；
3. 面向用户的校验一律 `if not ...: raise ValueError(...)`，科学排错四步：复现→隔离→审查→修复。
'''

ADD["pyf-l8-1"] = '''
### 问题背景与直觉理解（补充）

为什么 `with open()` 是强制规范而非建议？操作系统打开文件的句柄数有上限，忘记 close 的文件在 Windows 上还会锁定导致他人无法删除。with 语句把 close 交给上下文管理器协议：**无论缩进块正常结束还是中途爆炸，`__exit__` 都必然执行**——等价于把 try/finally 的样板代码压成一行。编码问题同理：Windows 默认 GBK、Linux 默认 UTF-8，不显式声明 `encoding="utf-8"` 的脚本"在这台机器好好的，换台机器就乱码"，这是跨平台事故的第一来源。

### 手算推导（逐步演算）

1. 句柄生命周期：open → 分配 fd（文件描述符）→ 读写 → close 释放 fd；若中途抛异常且未 close，fd 泄漏，累积到上限（Linux 默认 1024）后整个进程再也无法打开任何文件；
2. 字节数推演：`"中文编码"` 每个汉字 UTF-8 占 3 字节，共 12 字节 + 换行等 ≈ 实测 `len(content.encode("utf-8"))` 可验证；
3. 乱码机理："中文编码" 按 UTF-8 编码得 12 字节，再按 GBK **每 2 字节解一个汉字** → 解出 6 个"字"，其中许多是 GBK 中的生僻字或替换符 → 输出 `涓綘鏂囩紪鐮` 之类的乱码——编码与解码不对称是乱码的全部真相。

### 完整案例（补充）：with 生命周期与乱码现场

```python
import tempfile, os

path = os.path.join(tempfile.gettempdir(), "b38_orders.csv")
with open(path, "w", encoding="utf-8") as f:      # with 结束自动 close
    f.write("name,amount\\n")
    f.write("键盘,129.5\\n")
    f.write("鼠标,89.0\\n")
print("closed =", f.closed)                        # with 退出后已自动关闭

with open(path, encoding="utf-8") as f:            # 流式逐行读，内存恒定
    header = f.readline().strip()
    print("表头:", header)
    for line in f:
        name, amount = line.strip().split(",")
        print(name, float(amount) * 2)

raw = "中文编码".encode("utf-8")
print(raw.decode("gbk", errors="replace"))         # 编码不符的典型乱码现场
os.remove(path)
```

预期输出（实测）：

```
closed = True
表头: name,amount
键盘 259.0
鼠标 178.0
涓枃缂栫爜
```

`for line in f` 是流式读取：文件对象本身是迭代器，每次只加载一行，10GB 日志也能用几 MB 内存处理——这是与 `f.read()` 一次性全量加载的本质区别。

### 打开模式决策图解（文字示意图）

```
要做什么？
 ├─ 从头写（覆盖旧内容）────▶ 'w'  ⚠️ 一开即清空！
 ├─ 续写（日志/追加记录）───▶ 'a'
 ├─ 只读 ──────────────────▶ 'r'（默认）
 └─ 二进制（图片/np.save）──▶ 'rb' / 'wb'
通用铁律：文本文件一律 encoding='utf-8'
（Windows Excel 友好导出另用 'utf-8-sig'）
```

### 参考资料（补充）

- **Python 官方文档：open() 内置函数**——模式与 encoding 参数权威说明
  - 链接：https://docs.python.org/zh-cn/3/library/functions.html#open
- **Joel Spolsky: The Absolute Minimum Every Software Developer Must Know About Unicode**——编码问题经典科普
  - 链接：https://www.joelonsoftware.com/2003/10/08/the-absolute-minimum-every-software-developer-absolutely-positively-must-know-about-unicode-and-character-sets-no-excuses/

### 知识关联

- 承接 l7-2：with 是 try/finally 的语法糖，上下文管理器协议（`__enter__`/`__exit__`）；
- 呼应 l8-2：csv 读写器必须架在以 `newline=""` 打开的文件句柄上；
- pep-l7-1 的生成器管道是本节"逐行流式"思想的通用化。

### 本节总结（要点回顾）

1. `with open(..., encoding="utf-8")` 三件套一体：with + 模式 + 编码缺一不可；
2. `'w'` 开即清空，日志续写用 `'a'`，跨平台乱码先查 encoding；
3. 大文件用 `for line in f:` 流式处理，绝不 `.read()` 一口吞。
'''

ADD["pyf-l8-2"] = '''
### 问题背景与直觉理解（补充）

为什么不能用 `line.split(",")` 解析 CSV？因为真实 CSV 里有三类"地雷"：**引号包裹的逗号**（`"45.5",1` 中的字段内逗号）、**字段内换行**（多行备注）、**转义引号**（`""` 表示一个引号字符）。csv 模块是有状态的解析器，能正确处理全部三类，split 一遇到就碎成错误列数。DictReader 的价值则在于"列名即接口"：`row["price"]` 比 `row[1]` 多一层语义，上游加列/调列序时下游代码纹丝不动——这是从"位置耦合"升级到"名字耦合"的工程收益。

### 手算推导（逐步演算）

1. 逐行推演 DictReader：首行 `sku,price,qty` 成为字段名；第二行 `A-1,19.9,3` → `{"sku": "A-1", "price": "19.9", "qty": "3"}`；第三行带引号 `"45.5"` → 引号被剥除，price="45.5"；
2. 金额计算（注意读出的全是 str）：A-1：19.9×3 = 59.7；B-2：45.5×1 = 45.5；C-3：7.0×10 = 70.0；总额 175.2；
3. 写回推演：`DictWriter` 按指定 fieldnames 顺序输出 `sku,total`，header + `A-1,175.2`——列序由 fieldnames 决定而与 dict 插入序无关。

### 完整案例（补充）：DictReader 解析与 DictWriter 导出

```python
import csv, io

text = 'sku,price,qty\\nA-1,19.9,3\\nB-2,"45.5",1\\nC-3,7.0,10\\n'
rows = list(csv.DictReader(io.StringIO(text)))
for r in rows:
    total = float(r["price"]) * int(r["qty"])
    print(f"{r['sku']}  {float(r['price']):>6.2f} x {r['qty']:>2} = {total:>7.2f}")
grand = sum(float(r["price"]) * int(r["qty"]) for r in rows)
print("订单总额:", round(grand, 2))
out = io.StringIO()
w = csv.DictWriter(out, fieldnames=["sku", "total"], lineterminator="\\n")
w.writeheader()
w.writerow({"sku": "A-1", "total": grand})
print(out.getvalue(), end="")
```

预期输出（实测）：

```
A-1   19.90 x  3 =   59.70
B-2   45.50 x  1 =   45.50
C-3    7.00 x 10 =   70.00
订单总额: 175.2
sku,total
A-1,175.2
```

（真实文件场景把 `io.StringIO(text)` 换成 `open(path, encoding="utf-8", newline="")`，写侧 `open(..., "w", encoding="utf-8", newline="")`——`newline=""` 防止 Windows 下出现空行翻倍。）

### CSV 读写链路图解（文字示意图）

```
磁盘 CSV 字节流（utf-8）
   │ open(newline='') + encoding
   ▼
csv.DictReader ──逐行解析──▶ {"sku": "A-1", "price": "19.9", ...}   ← 全是 str！
   │ 业务层：float() / int() 显式转换
   ▼
计算/聚合 ──▶ DictWriter ──▶ open('w', newline='') ──▶ 磁盘
                              （index/序号不写文件，列序由 fieldnames 定）
```

### 参考资料（补充）

- **Python 官方文档：csv 模块**——方言、引号规则与 newline 说明
  - 链接：https://docs.python.org/zh-cn/3/library/csv.html
- **RFC 4180：CSV 格式规范**——引号转义与换行的国际标准
  - 链接：https://www.rfc-editor.org/rfc/rfc4180

### 知识关联

- 承接 l8-1：csv 读写器建立在 with open 句柄之上，newline/encoding 两个参数是组合关键；
- 呼应 l11 系列：`pd.read_csv` 就是 csv 模块的向量化工业版，dtype 转换被 `pd.to_numeric` 批量接管；
- l8-3 的 JSON 与 CSV 构成半结构化/结构化数据的两大标准入口。

### 本节总结（要点回顾）

1. csv 模块处理引号内逗号/换行/转义三类地雷，split(",") 一个都扛不住；
2. DictReader 以列名取数，代码与表结构解耦；读出的值永远是 str，计算前必须显式转换；
3. 写 CSV 固定参数 `open(..., "w", encoding="utf-8", newline="")`，防空行、防乱码。
'''

ADD["pyf-l8-3"] = '''
### 问题背景与直觉理解（补充）

JSON 是 Web 世界的"普通话"：API 响应、配置文件、消息队列载荷全用它。掌握 JSON 的关键是**类型映射表**——JSON 的 object/array/string/number/boolean/null 精确对应 Python 的 dict/list/str/(int|float)/bool/None，反序列化就是按表"归位"。两对函数的分工口诀：带 **s** 的是字符串（`loads`/`dumps` 在内存里转 str），不带 s 的是文件（`load`/`dump` 直读直写文件句柄）。`ensure_ascii=False` 则决定中文是"原样输出"还是被转成 `\\uXXXX` 转义序列。

### 手算推导（逐步演算）

1. 类型归位推演：`"paid": true` → Python True（bool）；`"memo": null` → None；`"items": [...]` → list[dict]；字符串 "A1024" 保持 str；
2. `ensure_ascii` 对照：`{"标签": "新品"}` 默认序列化 → `'{"\\u6807\\u7b7e": "\\u65b0\\u54c1", ...}'`（ASCII 安全但人不可读）；加 `ensure_ascii=False` → 中文原样；两种结果 `json.loads` 后完全等价，差异只在存储与可读性；
3. 往返一致性：loads(dumps(x)) == x 对 dict/list/str/int/float/bool/None 全部成立；但 tuple 会被 dumps 成 array，loads 回来变 list——**往返不对称**的类型（tuple/set/datetime）需要自定义 default 编码器。

### 完整案例（补充）：API 报文解码与中文序列化

```python
import json

api_resp = '{"order_id": "A1024", "items": [{"sku": "A-1", "qty": 3}], "paid": true, "memo": null}'
data = json.loads(api_resp)          # JSON -> Python
print(type(data).__name__, data["items"][0]["sku"], data["paid"], data["memo"])
data["amount"] = 59.7
py_obj = {"标签": "新品", "score": 0.95}
s = json.dumps(py_obj, ensure_ascii=False, indent=2)   # Python -> JSON
print(s)
print(json.dumps(py_obj))            # 默认 ensure_ascii=True 的对比
```

预期输出（实测）：

```
dict A-1 True None
{
  "标签": "新品",
  "score": 0.95
}
{"\\u6807\\u7b7e": "\\u65b0\\u54c1", "score": 0.95}
```

（上例最后一行的 `\\uXXXX` 是实测输出的字面内容，即默认转义行为。）写配置/落盘选 `indent=2, ensure_ascii=False`；走 HTTP 或对存储敏感时可用默认转义，两者解析结果等价。

### JSON ↔ Python 类型映射图解（文字示意图）

```
   JSON 文本                 Python 对象
 ┌─────────────┐  loads   ┌──────────────┐
 │ {"k": [...]} │ ───────▶ │ {"k": [...]}  │ dict / list
 │  42, 3.14    │          │  42, 3.14     │ int / float
 │  true/false  │          │  True/False   │ bool
 │  null        │          │  None         │ NoneType
 │  "text"      │          │  'text'       │ str
 └─────────────┘ ◀─────── └──────────────┘
                dumps（ensure_ascii 控制 \\uXXXX）
 文件版：load()/dump() 直连文件句柄；tuple→array 往返会退化为 list
```

### 参考资料（补充）

- **Python 官方文档：json 模块**——编码器/解码器与类型对照权威表
  - 链接：https://docs.python.org/zh-cn/3/library/json.html
- **RFC 8259：The JavaScript Object Notation (JSON) Data Interchange Format**
  - 链接：https://www.rfc-editor.org/rfc/rfc8259

### 知识关联

- 承接 l8-1：`json.dump(obj, f, ensure_ascii=False)` 的 f 正是 with open 打开的句柄；
- 呼应 l9-3：正则常用于对 JSON 之外的"非结构化文本"做补充抽取；
- llma-l2-1 的 Strict Structured Outputs 本质是"让大模型输出能通过 json.loads 的字符串"，本节是它的地基。

### 本节总结（要点回顾）

1. 类型映射表背熟：object↔dict、array↔list、null↔None、true↔True；
2. 带 s 走内存（loads/dumps），不带 s 走文件（load/dump）；中文落盘必带 `ensure_ascii=False`；
3. JSON 语法只认双引号，`json.loads("{'a': 1}")` 直接 JSONDecodeError；datetime 等“往返不对称”类型需自定义 default。
'''

ADD["pyf-l9-1"] = '''
### 问题背景与直觉理解（补充）

标准库的"电池包"哲学：常见需求不必装第三方包。`math` 管科学运算（分页数、对数、开方），`random` 管抽样（质检抽查、A/B 分流），`pathlib` 管路径（跨平台拼路径、读属性）。三者的共同气质是**确定性的边界**：math 结果确定；random 通过 `random.seed(n)` 生成可复现的伪随机序列——复现实验、单元测试、评审对齐全靠 seed；pathlib 则把"字符串拼路径"的 `/` 与 `\\` 平台差异彻底封装。分页公式 `math.ceil(n / size)` 值得单独记忆：103 条、每页 15 条，7 页，`103/15=6.87` 而 `//` 会给出错误的 6。

### 手算推导（逐步演算）

1. 分页：`103 / 15 = 6.867`，ceil → 7；若用 `103 // 15 = 6` 会漏掉最后 13 条——"整除"与"向上取整"在分页上是对立语义；
2. 抽样：seed(42) 后 Mersenne Twister 生成器状态确定，`random.sample(orders, 3)` 每次重跑结果一致（['O001', 'O002', 'O005']）；去掉 seed 则每次不同——**可复现性是显式注入的，不是天然免费的**；
3. 路径解剖：`Path("data/raw") / "orders_2024.csv"` → name="orders_2024.csv"、stem="orders_2024"、suffix=".csv"、parents 逐级向上——`with_suffix(".parquet")` 一行完成格式切换，Windows/Linux 自动选对分隔符。

### 完整案例（补充）：分页、可复现抽样与路径解剖

```python
import math, random
from pathlib import Path

records, page_size = 103, 15
print("总页数 =", math.ceil(records / page_size))
print("sqrt(2) =", round(math.sqrt(2), 6), "| log2(1024) =", math.log2(1024))

random.seed(42)
orders = [f"O{i:03d}" for i in range(1, 11)]
print("抽查 3 单:", sorted(random.sample(orders, 3)))
print("掷硬币:", [random.choice("HT") for _ in range(8)])

p = Path("data/raw") / "orders_2024.csv"
print(p.name, "|", p.stem, "|", p.suffix, "|", str(p.with_suffix(".parquet")))
print("parents:", [str(x) for x in p.parents])
```

预期输出（实测，Python 3.11.15，抽样结果在 seed(42) 下可复现）：

```
总页数 = 7
sqrt(2) = 1.414214 | log2(1024) = 10.0
抽查 3 单: ['O001', 'O002', 'O005']
掷硬币: ['H', 'H', 'H', 'H', 'H', 'T', 'H', 'H']
orders_2024.csv | orders_2024 | .csv | data\\raw\\orders_2024.parquet
parents: ['data\\\\raw', 'data', '.']
```

安全红线：`random` 是**伪随机**且可预测，密码学场景（token、密钥）必须用 `secrets` 模块，业务抽检/A/B 分流才用 random。

### 标准库工具选择图解（文字示意图）

```
需求 ─┬─ 数学取整/对数/开方 ──▶ math.ceil / log / sqrt
      ├─ 可复现抽样/模拟 ────▶ random（先 seed！）
      │     └─ 安全令牌/密钥 ─▶ secrets（禁用 random）
      └─ 路径拼接/属性/遍历 ──▶ pathlib.Path（告别 os.path 字符串拼接）
                                  p / "file.csv"  p.suffix  p.exists()
```

### 参考资料（补充）

- **Python 官方文档：math 模块**
  - 链接：https://docs.python.org/zh-cn/3/library/math.html
- **Python 官方文档：pathlib——面向对象的文件系统路径**
  - 链接：https://docs.python.org/zh-cn/3/library/pathlib.html

### 知识关联

- 承接 l8-1：Path 与 with open 是天作之合，`Path.iterdir()` 让目录批处理不再手拼字符串；
- 呼应 l9-2：datetime 与 math 一样属于"先想清语义再写代码"的标准库；
- l10-1 的 NumPy 随机模块（`np.random.default_rng`）是 random 的向量化升级版。

### 本节总结（要点回顾）

1. 分页取整用 `math.ceil(a/b)`，`//` 在此处是 bug 制造机；
2. `random.seed(n)` 是可复现性的开关；安全场景换 `secrets`；
3. pathlib 用 `/` 拼路径、`.name/.stem/.suffix/.parents` 解剖路径、`with_suffix` 换格式，跨平台零成本。
'''

ADD["pyf-l9-2"] = '''
### 问题背景与直觉理解（补充）

时间处理的一切混乱，源于"时间的三张面孔"：字符串（给人看，格式五花八门）、datetime 对象（给程序算，可加减可比较）、时间戳（给机器存，UTC 秒数）。直觉模型：strptime 是"入境海关"——按你申报的格式 `%Y-%m-%d %H:%M:%S` 逐位验收字符串，申报错一位直接 ValueError；strftime 是"出境包装"——把 datetime 按目标格式打包装箱。两个对象相减得到 timedelta，它自带 `days/seconds/total_seconds()` 三把尺子，时耗指标的整个计算体系就建在它身上。

### 手算推导（逐步演算）

1. 时耗推演：09:30:00 → 10:05:30，差 35 分 30 秒；`delta.total_seconds()` = 2130.0，÷60 = 35.5 分钟——"支付耗时"这类分钟级指标的正确姿势是先转总秒数再除，**绝不要用 delta.seconds 单独拼**（它会丢弃天位）；
2. 到期日推演：2026-03-14 + 30 天 → 3 月剩 17 天（31-14），4 月吃 13 天 → 2026-04-13，与实测一致；
3. 比较推演：datetime 对象直接 `>` `<` 比较（内部比时间戳），`datetime(2026, 4, 20) > expire` 为 True → "已过期"。

### 完整案例（补充）：支付时耗与到期日推算

```python
from datetime import datetime, timedelta

order_at = datetime.strptime("2026-03-14 09:30:00", "%Y-%m-%d %H:%M:%S")
pay_at = datetime.strptime("2026-03-14 10:05:30", "%Y-%m-%d %H:%M:%S")
delta = pay_at - order_at
print("支付耗时(分钟) =", round(delta.total_seconds() / 60, 2))
expire = order_at + timedelta(days=30)
print("到期日 =", expire.strftime("%Y年%m月%d日"))
print("ISO =", order_at.isoformat(sep=" "))
print("是否过期:", datetime(2026, 4, 20) > expire)
```

预期输出（实测）：

```
支付耗时(分钟) = 35.5
到期日 = 2026年04月13日
ISO = 2026-03-14 09:30:00
是否过期: True
```

`isoformat()` 产出的是 ISO 8601 标准串，存数据库、写 API、跨语言交换一律用它，别自造格式。

### 时间三面孔转换图解（文字示意图）

```
  字符串 "2026-03-14 09:30:00"
      │ strptime(格式串)   ← 申报制：格式错→ValueError
      ▼
  datetime 对象（可加减/比较/取属性）
      │ + timedelta(days=30)          │ timestamp()
      ▼                               ▼
  新 datetime                    浮点秒（机器存储）
      │ strftime("%Y年%m月%d日")
      ▼
  展示字符串（给人看）
```

### 参考资料（补充）

- **Python 官方文档：datetime 模块**——strftime/strptime 指令全表
  - 链接：https://docs.python.org/zh-cn/3/library/datetime.html#strftime-and-strptime-format-codes
- **ISO 8601 标准**——`isoformat()` 输出的国际规范
  - 链接：https://www.iso.org/iso-8601-date-and-time-format.html

### 知识关联

- 承接 l9-1：datetime 与 pathlib 同属"标准库优先"的电池包哲学；
- 呼应 l2-3：`f"{dt:%Y-%m-%d}"` 让 f-string 直接吃 datetime（调用其 __format__）；
- pandas 的 `pd.to_datetime` 是本节批量版，时区处理（tz_localize/tz_convert）在 pep 课程进阶。

### 本节总结（要点回顾）

1. 口诀：**strptime 字符串进、strftime 字符串出**，p 与 parse 对应"解析"；
2. `%m` 是月份、`%M` 是分钟，`%Y` 四位年、`%y` 两位年——大小写即语义；
3. 时耗计算用 `total_seconds()`，日期推算用 timedelta，交换用 isoformat。
'''

ADD["pyf-l9-3"] = '''
### 问题背景与直觉理解（补充）

正则是"文本世界的坐标系统"：当清洗目标无法用 split/strip 表达（从混排文本中抓所有手机号、把身份证号脱敏）时，正则是唯一称手的工具。核心心智模型：模式是一台"扫描模板机"，从左到右逐位尝试匹配，`\d{4}` 表示"连续 4 个数字"，`[A-Z]` 表示"任一大写字母"，`+` 表示"至少一次"。三大函数分工：`findall` 抓全部（返回列表）、`sub` 边找边换（脱敏/清洗）、`search` 找第一处并给出位置（返回 match 对象，可 group 提取）。`r"..."` 原始字符串前缀则是防止 Python 把 `\\d` 先解释成转义的必要护甲。

### 手算推导（逐步演算）

1. 订单号 `[A-Z]-?\\d{4}` 扫描 "订单 A1024 …；订单 B-7788"：A1024 → A(大写)+无连字符+1024(4位) ✓；B-7788 → B + 连字符 + 7788 ✓ → 两个命中；
2. 手机号 `1[3-9]\\d{9}`：第一位 1，第二位 3-9，再 9 位数字 → 13812345678（11 位 ✓）与 15987654321 ✓；
3. 脱敏分组 `r"(1[3-9]\\d)\\d{4}(\\d{4})"`：组 1 = 前 3 位、组 2 = 后 4 位，中间 4 位被 `\\d{4}` 吃掉不进组 → 替换串 `\\1****\\2` → 138****5678；
4. `fullmatch` 要求**整串**匹配："23812345678" 第二位是 2，不在 [3-9] → False。

### 完整案例（补充）：提取、脱敏与校验三连

```python
import re

text = "订单 A1024 于 13812345678 下单，备用 15987654321；订单 B-7788 已发货"
print(re.findall(r"[A-Z]-?\\d{4}", text))
print(re.findall(r"1[3-9]\\d{9}", text))
masked = re.sub(r"(1[3-9]\\d)\\d{4}(\\d{4})", r"\\1****\\2", text)
print(masked)
m = re.search(r"订单\\s+([A-Z]-?\\d+)", text)
print(m.group(0), "|", m.group(1))
print(bool(re.fullmatch(r"1[3-9]\\d{9}", "13812345678")), bool(re.fullmatch(r"1[3-9]\\d{9}", "23812345678")))
```

预期输出（实测）：

```
['A1024', 'B-7788']
['13812345678', '15987654321']
订单 A1024 于 138****5678 下单，备用 159****4321；订单 B-7788 已发货
订单 A1024 | A1024
True False
```

`search` 返回的 match 对象中，`group(0)` 是整段命中、`group(1)` 是第一个括号捕获组——"先 search 后 group"是比 findall 更精确的定位工作流。

### 正则匹配流程图解（文字示意图）

```
模式：1[3-9]\d{9}      文本：…13812345678…
        │
 逐字符滑动窗口：
   "1" ──▶ 命中字面 1
   "3" ──▶ 命中 [3-9] 字符类
   后 9 位 ──▶ 逐位命中 \d{9}
        │
        ▼
 匹配成功 → 记录 (起, 止) 位置 → 从止点继续扫描下一个候选
贪婪量词（+/*）尽量多吃；加 ? 变非贪婪尽量少吃
```

### 参考资料（补充）

- **Python 官方文档：re 模块（正则 HOWTO）**
  - 链接：https://docs.python.org/zh-cn/3/howto/regex.html
- **regex101 在线调试器**——实时可视化匹配过程（选 Python 方言）
  - 链接：https://regex101.com/

### 知识关联

- 承接 l8-2：CSV/JSON 管结构化数据，正则管"结构化手段失效后"的最后一公里；
- 呼应 l2-3：替换串里的 `\\1` 分组引用与 f-string 的占位思想同源；
- pep-l3 的参数校验中，`re.fullmatch` 是邮箱/手机号格式门禁的最低成本实现。

### 本节总结（要点回顾）

1. 一律 `r"..."` 写模式；findall 抓全部、sub 边找边换、search 定位第一处；
2. 分组括号既定提取范围又定替换引用（`\\1`），脱敏模板 = 组保留 + 中间打码；
3. 贪婪与非贪婪一字之差（`+` vs `+?`），复杂模式先在 regex101 验证再进代码。
'''

ADD["pyf-l10-1"] = '''
### 问题背景与直觉理解（补充）

纯 Python 慢在哪？列表是"指针数组"：一千万个元素就是一千万个指针，每个指向散落在堆里的 int 对象，做一次平方要经历"解引用 → 检查类型 → 装箱新对象"三道弯。NumPy 数组则是"连续内存同构块"：一千万个 C 层 int64 紧密排列，一次平方就是一条 SIMD 向量指令扫过整块内存。直觉模型：Python 列表像"一万个快递柜各存一件货"，NumPy 像"一整节集装箱货柜"。凡"对每个元素做同样运算"的场景，向量化一次到位，加速比通常 10-100 倍。

### 手算推导（逐步演算）

1. 内存账：100 万元素，Python 列表 ≈ 100 万 × 8 字节指针（不含 int 对象本体，小整数外另占 28 字节/个）；NumPy int64 数组 = 100 万 × 8 字节总账 8MB，且**无逐元素装箱**；
2. 时间账（实测本机）：列表推导式 164.5 ms vs NumPy `arr * arr` 5.768 ms，加速比 ≈ 29 倍——元素越多、运算越简单，差距越大（复杂自定义函数场景差距会收窄）；
3. `a.itemsize` = 8（int64 每元素 8 字节），`a.nbytes` = 5×8 = 40——dtype 决定了数组的"物理粒度"，float32 比 float64 省一半内存。

### 完整案例（补充）：百万级平方运算对垒

```python
import numpy as np, timeit

n = 1_000_000
lst = list(range(n))
arr = np.arange(n)
t1 = timeit.timeit("[x*x for x in lst]", globals=globals(), number=3)
t2 = timeit.timeit("arr * arr", globals=globals(), number=3)
print(f"纯 Python 100 万元素平方: {t1*1000:.1f} ms")
print(f"NumPy 向量化          : {t2*1000:.3f} ms")
print(f"加速比 ≈ {t1/t2:.0f}x")
a = np.arange(5)
print(a.dtype, a.itemsize, "字节数/元素；总字节 =", a.nbytes)
```

预期输出（实测，时间数据机器相关，量级稳定）：

```
纯 Python 100 万元素平方: 164.5 ms
NumPy 向量化          : 5.768 ms
加速比 ≈ 29x
int64 8 字节数/元素；总字节 = 40
```

反模式警告：拿到 ndarray 后又写 `for i in range(len(arr)): arr[i] = arr[i] * 2`——不仅丢掉向量化加速，还因"每步在 Python 与 C 间跨界"比原生列表更慢。正确姿势永远是整体表达式 `arr = arr * 2`。

### 两种存储模型图解（文字示意图）

```
Python list[int]                 NumPy ndarray(int64)
┌──┬──┬──┬──┐ 指针数组           ┌────┬────┬────┬────┐ 连续数据块
│ ●│ ●│ ●│ ●│                    │ 0  │ 1  │ 2  │ 3  │
└─┬┴─┬┴─┬┴─┬┘                    └────┴────┴────┴────┘
  ▼  ▼  ▼  ▼  堆上散落的对象          一条 SIMD 指令整体运算
 每元素：解引用+类型检查+装箱      dtype 统一、步长固定、零逐元素开销
```

### 参考资料（补充）

- **NumPy 官方文档：The absolute basics for beginners**——向量化心智模型
  - 链接：https://numpy.org/doc/stable/user/absolute_beginners.html
- **NumPy 官方文档：ndarray.dtype 与内存布局**
  - 链接：https://numpy.org/doc/stable/reference/arrays.ndarray.html

### 知识关联

- 承接 l1-1：解释器逐条执行字节码的开销，正是循环慢的第一性原因；
- 呼应 l10-3：广播机制是向量化在"多数组不同形状"下的推广；
- pep-l8-1 的 GIL 一节解释了为什么 NumPy 大计算反而能绕开 GIL（释放 GIL 进 C 层）。

### 本节总结（要点回顾）

1. 列表存指针、数组存裸数据——存储模型决定运算速度的天花板；
2. "逐元素同样运算"一律向量化，实测加速比常达 10-100 倍；
3. `dtype/itemsize/nbytes` 是数组内存账的三把尺子，大数据集先算内存再动手。
'''

ADD["pyf-l10-2"] = '''
### 问题背景与直觉理解（补充）

reshape 与切片是 NumPy "零拷贝哲学"的两位代言人：reshape 只改写形状元信息（每维长度+步长），数据块纹丝不动；切片也不复制数据，只生成一个**视图**（view）——一块记录"从哪里开始、每维走几步"的窗体。收益是极致省内存、飞快；代价是**写视图 = 写本体**。直觉模型：视图是"透明玻璃上写的字"，擦玻璃（视图）上的字，底稿（本体）同步变化；`.copy()` 才是"复印一份在复印件上改"。

### 手算推导（逐步演算）

1. reshape 推演：`arange(12).reshape(3, 4)` → 按行优先（C order）填充：第 0 行 0-3、第 1 行 4-7、第 2 行 8-11；12 = 3×4，乘积不符直接 ValueError；
2. 切片推演：`m[1, :]` → 第 1 行 [4 5 6 7]；`m[:, 2]` → 第 2 列 [2 6 10]；`m[1:3, 2:4]` → 行 1-2、列 2-3 的 2×2 子块 [[6,7],[10,11]]——四条切片一次表达式完成，无循环；
3. 视图取证：`v = m[:, 1]` 后 `v[0] = 999`，原矩阵 `m[0]` 变 [0 999 2 3]（写视图动本体）；`c = m[:, 1].copy()` 后改 c[0]=-1，m[0,1] 仍是 999（copy 隔离）；
4. `m.T.shape` = (4, 3)：转置同样只换形状与步长元信息，不搬 12 个数。

### 完整案例（补充）：视图机制现场取证

```python
import numpy as np

a = np.arange(12)              # 0..11
m = a.reshape(3, 4)
print(m)
print("第 1 行:", m[1, :], "| 第 2 列:", m[:, 2])
print("右下 2x2:\\n", m[1:3, 2:4])
v = m[:, 1]
v[0] = 999                     # 切片是视图，写视图动本体
print("修改视图后原矩阵第 0 行:", m[0])
c = m[:, 1].copy()
c[0] = -1
print("copy 后原矩阵不受影响:", m[0, 1])
print(m.T.shape, "<- 转置只改元信息不搬数据")
```

预期输出（实测）：

```
[[ 0  1  2  3]
 [ 4  5  6  7]
 [ 8  9 10 11]]
第 1 行: [4 5 6 7] | 第 2 列: [ 2  6 10]
右下 2x2:
 [[ 6  7]
 [10 11]]
修改视图后原矩阵第 0 行: [  0 999   2   3]
copy 后原矩阵不受影响: 999
(4, 3) <- 转置只改元信息不搬数据
```

判断"是视图还是拷贝"的一行口诀：切片/reshape/转置 → 视图；花式索引（布尔数组/整数列表）、算术运算、`.copy()` → 拷贝。

### 视图与拷贝关系图解（文字示意图）

```
        m.reshape / m[:, 1] / m.T
                 │ 只记形状+步长
 本体数据块 ◀────┤
 [0 1 2 ... 11]  │ 视图 v（写 v = 写本体！）
                 ▼
        m[:, 1].copy() / m[[0,2]]
                 │ 复制数据到新块
 新数据块 [0 999 ...]（与本体完全隔离）
```

### 参考资料（补充）

- **NumPy 官方文档：Copies and views**——视图语义权威说明
  - 链接：https://numpy.org/doc/stable/user/basics.copies.html
- **NumPy 官方文档：Indexing（基础索引与切片）**
  - 链接：https://numpy.org/doc/stable/user/basics.indexing.html

### 知识关联

- 承接 l10-1：连续内存是"零拷贝视图"得以成立的物理前提；
- 呼应 l10-3：`reshape(3, 1)` / `newaxis` 升维是广播的前置操作；
- pandas 的 `df.loc` 切片同样返回视图倾向的引用，SettingWithCopyWarning 是本节知识的表格版回声。

### 本节总结（要点回顾）

1. reshape/转置/切片全是零拷贝视图，`-1` 维让 NumPy 自动推断；
2. 切片语法 `arr[行切片, 列切片]` 逗号分隔两轴，一次表达式完成子块提取；
3. 写视图动本体——要独立修改必须 `.copy()`；花式索引与运算产生的是拷贝。
'''

ADD["pyf-l10-3"] = '''
### 问题背景与直觉理解（补充）

axis 是 NumPy 最容易迷糊的概念，一句话定音：**axis 是"被压缩掉的那个方向"**。`mean(axis=0)` 沿行方向压缩，行没了，每列剩一个数（按列统计）；`axis=1` 列没了（按行统计）。广播则是"形状不同的数组如何配对运算"的仲裁规则：从**最右维**向左对齐，每维要么相等、要么一方为 1（自动复制扩展）、要么一方缺失（视作 1）。去中心化 `scores - scores.mean(axis=0)` 之所以合法，正是因为 (3,4) 与 (4,) 按右对齐规则等价于 (3,4)-(1,4)。

### 手算推导（逐步演算）

1. axis=0 按列均值：第 0 列 (85+74+90)/3 = 83.0；第 1 列 (92+88+70)/3 = 83.33…；axis=1 按行均值：第 0 行 (85+92+78+90)/4 = 86.25；
2. 去中心化取证：centered 每列再求均值全为 0（浮点下 ±0）——证明"减列均值"这一步把每列拉回零均值，这是数据标准化的第一步；
3. 广播配对：(3,4) vs (4,) → 右对齐 (4,)↔(4,) 相等、左侧缺维视作 1 → 合法；(3,1) vs (3,4) → 第二维 1 可扩展为 4 → 合法，行均值正确地对每行广播；(3,4) vs (3,) → 右对齐 4≠3 且无一方为 1 → ValueError；
4. 布尔掩码 `(scores >= 90).sum()`：True 计数为 4——布尔数组求和即"满足条件的元素个数"。

### 完整案例（补充）：axis、广播与掩码三合一

```python
import numpy as np

scores = np.array([[85, 92, 78, 90],
                   [74, 88, 95, 81],
                   [90, 70, 84, 88]])
print("按列均值(axis=0):", scores.mean(axis=0))
print("按行均值(axis=1):", scores.mean(axis=1))
centered = scores - scores.mean(axis=0)      # 广播：(3,4)-(4,)
print("去中心化后各列均值:", centered.mean(axis=0).round(6))
print(">=90 优秀数:", (scores >= 90).sum(), "| 掩码:\\n", scores >= 90)
avg = scores.mean(axis=1, keepdims=True)
print("keepdims 形状:", avg.shape, "-> 广播减行均值:\\n", (scores - avg).round(1))
```

预期输出（实测）：

```
按列均值(axis=0): [83.         83.33333333 85.66666667 86.33333333]
按行均值(axis=1): [86.25 84.5  83.  ]
去中心化后各列均值: [ 0.  0. -0.  0.]
>=90 优秀数: 4 | 掩码:
 [[False  True False  True]
 [False False  True False]
 [ True False False False]]
keepdims 形状: (3, 1) -> 广播减行均值:
 [[ -1.2   5.8  -8.2   3.8]
 [-10.5   3.5  10.5  -3.5]
 [  7.  -13.    1.    5. ]]
```

`keepdims=True` 让行均值保持 (3,1) 形状，广播才能"逐行减自己的均值"——不保维则得 (3,)，与 (3,4) 右对齐成 (1,3) 直接报错。这一参数是 axis 易错点的官方解药。

### 广播对齐规则图解（文字示意图）

```
(3, 4)  与  (4,)      →  (4,) 右对齐补成 (1, 4)  →  ✓ 每列配对
(3, 1)  与  (3, 4)    →  第 2 维 1 扩展为 4     →  ✓ 每行配对
(3, 4)  与  (3,)      →  4 ≠ 3 且无 1          →  ✗ ValueError

对齐口诀：从最右维起，相等 / 为 1 / 缺失，三者其一即可广播
axis 记忆：axis=k 就是"把第 k 维压扁"，聚合结果少一维
```

### 参考资料（补充）

- **NumPy 官方文档：Broadcasting**
  - 链接：https://numpy.org/doc/stable/user/basics.broadcasting.html
- **NumPy 官方文档：Boolean indexing**
  - 链接：https://numpy.org/doc/stable/user/basics.indexing.html#boolean-array-indexing

### 知识关联

- 承接 l10-2：`newaxis`/`keepdims` 升维保维，是操纵广播方向的 две把钥匙；
- 呼应 l11-2：pandas 布尔筛选 `df[(df.a>1) & (df.b<5)]` 正是布尔掩码的表格版；
- l11-1 的 groupby 聚合可理解为"带键的 axis=0 压缩"。

### 本节总结（要点回顾）

1. axis=k = 压掉第 k 维：axis=0 按列统计、axis=1 按行统计；
2. 广播右对齐三规则：相等、为 1、缺失；形状不合先 `reshape/newaxis` 再运算；
3. 布尔掩码一体两面：`.sum()` 计数、直接索引取值，是清洗离群值的标准武器。
'''

ADD["pyf-l11-1"] = '''
### 问题背景与直觉理解（补充）

有了 NumPy 为什么还要 pandas？因为真实表格是**异构**的：姓名是字符串、年龄是整数、金额有小数，NumPy 的同构数组装不下；而且列名、缺失值（NaN）、时间索引这些"表格常识"NumPy 一概不管。直觉模型：DataFrame 是"一组共享行索引的 Series 的字典"——每列一支 Series（带名字的一维数组），行索引是公共的"身份证号"。探索三板斧的分工：`head()` 看长相（前 5 行样例）、`info()` 查底子（行数、每列非空数、dtype、内存）、`describe()` 摸分布（均值/四分位/极值）。

### 手算推导（逐步演算）

1. dtype 归位：user/dept 是文本 → StringDtype（pandas 3.0 起默认专用字符串类型）；age/salary 是整数 → int64。**dtype 是整列的属性**，一列混进一个 "N/A" 字符串，整列退化为 object——这就是金额列变 object 的病根；
2. describe 推演：age 均值 (25+32+28+41)/4 = 31.5、最大 41；salary 均值 65000/4... 精确为 (20000+15000+22000+18000)/4 = 18750.0；max=22000；
3. shape=(4, 4)：4 行 4 列；`df.columns` 返回列名序列——"先量尺寸再看列"是接手任何陌生数据的第一动作。

### 完整案例（补充）：三板斧探查实战

```python
import pandas as pd

df = pd.DataFrame({
    "user": ["u1", "u2", "u3", "u4"],
    "dept": ["技术", "销售", "技术", "人事"],
    "age": [25, 32, 28, 41],
    "salary": [20000, 15000, 22000, 18000],
})
print(df.head(3))
print(df.info())
print(df.describe().loc[["mean", "max"]].round(1))
print(df.dtypes.to_dict())
print("shape =", df.shape, "| 列 =", list(df.columns))
```

预期输出（实测，pandas 3.0.5）：

```
  user dept  age  salary
0   u1   技术   25   20000
1   u2   销售   32   15000
2   u3   技术   28   22000
<class 'pandas.DataFrame'>
RangeIndex: 4 entries, 0 to 3
Data columns (total 4 columns):
 #   Column  Non-Null Count  Dtype
---  ------  --------------  ----- 
 0   user    4 non-null      str  
 1   dept    4 non-null      str  
 2   age     4 non-null      int64
 3   salary  4 non-null      int64
dtypes: int64(2), str(2)
memory usage: 260.0 bytes
None
       age   salary
mean  31.5  18750.0
max   41.0  22000.0
{'user': <StringDtype(storage='python', na_value=nan)>, 'dept': <StringDtype(storage='python', na_value=nan)>, 'age': dtype('int64'), 'salary': dtype('int64')}
shape = (4, 4) | 列 = ['user', 'dept', 'age', 'salary']
```

`info()` 的 Non-Null Count 一列就是"缺失侦察兵"：某列 non-null 小于总行数，说明有 NaN 藏在那里——比肉眼扫表快一万倍。

### DataFrame 结构解剖图解（文字示意图）

```
              columns（列名 = Series 名）
                user    dept    age   salary
              ┌───────┬───────┬──────┬────────┐
 index（行键）│  u1   │ 技术  │  25  │ 20000  │
              │  u2   │ 销售  │  32  │ 15000  │   每列一支 Series
              │  u3   │ 技术  │  28  │ 22000  │   （同构 dtype）
              │  u4   │ 人事  │  41  │ 18000  │   列间可异构
              └───────┴───────┴──────┴────────┘
  一列 Series = values(ndarray) + index(行键) + name(列名)
```

### 参考资料（补充）

- **pandas 官方文档：10 minutes to pandas**
  - 链接：https://pandas.pydata.org/docs/user_guide/10min.html
- **pandas 官方文档：DataFrame 结构总览**
  - 链接：https://pandas.pydata.org/docs/user_guide/dsintro.html#dataframe

### 知识关联

- 承接 l10-2：DataFrame 底层正是"每列一个 ndarray"，视图/拷贝语义一脉相承；
- 呼应 l11-2：`.loc/.iloc` 的选取规则建立在本节的 index 概念上；
- l12-1 的缺失治理（isna/fillna）就是 `info()` 里 Non-Null 缺口的后续处置。

### 本节总结（要点回顾）

1. Series = values + index + name；DataFrame = 共享 index 的 Series 字典；
2. 探索三连：head 看样例、info 查缺失与 dtype、describe 摸分布；
3. dtype 是列级属性：金额列出现 object 即刻 `pd.to_numeric(errors="coerce")` 纠偏。
'''

ADD["pyf-l11-2"] = '''
### 问题背景与直觉理解（补充）

`.loc` 与 `.iloc` 的一个字母之差，是标签世界与位置世界的分界线：`.loc["e2"]` 查"行键叫 e2 的那行"（**含右端点**），`.iloc[2]` 查"物理第 3 行"（**不含右端点**，与 Python 切片一致）。为什么复合筛选必须用 `&`/`|` 且每个条件加括号？因为 pandas 要对"整个布尔序列"逐元素求与，`and` 只懂单个布尔值会直接报错；而 `>` 的优先级高于 `&`，不写括号时 `df.a > 1 & df.b` 会先算 `1 & df.b`——优先级陷阱的表格版。

### 手算推导（逐步演算）

1. `.loc["e2", "name"]` → 行键 e2 与列名 name 的交叉点 → Bob；`.iloc[2, 0]` → 第 3 行第 1 列 → Cathy；
2. `.iloc[0:2, 2]` → 物理行 0-1（不含 2）、第 3 列 salary → [25000, 18000]；换成 `.loc["e1":"e2", "salary"]` 结果相同但语义是"标签含两端"；
3. 复合筛选推演：`(df["dept"] == "技术")` → [True, False, True, False]；`(df["salary"] > 21000)` → [True, False, True, False]；逐元素 `&` → [True, False, True, False] → 命中 Alice、Cathy；
4. 条件赋值 `df.loc[mask, "level"] = "B"`：只有 mask 为 True 的行的 level 被写——"选哪儿写哪儿"一步完成且不触发链式索引警告。

### 完整案例（补充）：定位、切片与条件赋值

```python
import pandas as pd

df = pd.DataFrame({
    "name": ["Alice", "Bob", "Cathy", "Dan"],
    "dept": ["技术", "销售", "技术", "人事"],
    "salary": [25000, 18000, 22000, 16000],
}, index=["e1", "e2", "e3", "e4"])
print(df.loc["e2", "name"], "|", df.loc["e2", "salary"])
print(df.iloc[2, 0], "|", df.iloc[0:2, 2].tolist())
tech_high = df.loc[(df["dept"] == "技术") & (df["salary"] > 21000), "name"]
print("技术部高薪:", tech_high.tolist())
df.loc[df["salary"] < 20000, "level"] = "B"
df.loc[df["salary"] >= 20000, "level"] = "A"
print(df[["name", "salary", "level"]].to_string(index=False))
```

预期输出（实测）：

```
Bob | 18000
Cathy | [25000, 18000]
技术部高薪: ['Alice', 'Cathy']
  name  salary level
Alice   25000     A
  Bob   18000     B
Cathy   22000     A
  Dan   16000     B
```

条件赋值的标准姿势只有一种：`df.loc[行掩码, 列名] = 值`。链式写法 `df[df.salary < 20000]["level"] = "B"` 修改的可能是临时副本，pandas 会抛 SettingWithCopyWarning，且结果不可靠。

### 选取决策图解（文字示意图）

```
要选数据？
 ├─ 知道行键/列名 ──▶ df.loc["e2", "salary"]        （标签，含端点）
 ├─ 知道物理位置 ──▶ df.iloc[2, 0] / df.iloc[0:2]    （位置，不含端点）
 ├─ 条件筛选 ─────▶ df.loc[(A) & (B), "col"]         （括号+位运算符）
 └─ 条件赋值 ─────▶ df.loc[mask, "col"] = value      （唯一安全写法）
 反模式：df[df.a>1]["b"]=x  ←→  SettingWithCopyWarning
```

### 参考资料（补充）

- **pandas 官方文档：Indexing and selecting data**
  - 链接：https://pandas.pydata.org/docs/user_guide/indexing.html
- **pandas 官方文档：Returning a view versus a copy（SettingWithCopy 解释）**
  - 链接：https://pandas.pydata.org/docs/user_guide/indexing.html#returning-a-view-versus-a-copy

### 知识关联

- 承接 l10-3：布尔筛选与 NumPy 掩码同源，`&`/`|` 优先级规则完全一致；
- 呼应 l10-2：pandas 的视图/拷贝语义比 NumPy 更谨慎，警告机制替你踩雷；
- l11-3 的 merge/groupby 是"选出来之后"的下一步：关联与聚合。

### 本节总结（要点回顾）

1. loc 按标签含端点、iloc 按位置不含端点——一个字母，两种世界观；
2. 复合条件两铁律：位运算符 `&`/`|`，条件必加括号；
3. 赋值只走 `df.loc[mask, col] = v`，链式赋值是 SettingWithCopyWarning 的唯一来源。
'''

ADD["pyf-l11-3"] = '''
### 问题背景与直觉理解（补充）

groupby 与 merge 是 pandas 的"SQL 双子星"：groupby 对应 GROUP BY（分组聚合），merge 对应 JOIN（多表连接）。Split-Apply-Combine 直觉模型：把订单表按大区"切成几摞"（Split）→ 每摞各算一个总数（Apply）→ 把结果"摞回一张表"（Combine）。merge 的 `how="left"` 则像"以订单表为花名册，逐行去客户表查户口"——查到的补上地区，查不到的留 NaN，订单行数一列不少。关联前先验右表键唯一（`is_unique`），否则一对多匹配会让行数悄悄翻倍，报表总额凭空虚增。

### 手算推导（逐步演算）

1. merge 推演：orders 4 行，uid u1×2、u2×1、u3×1；users 每键唯一 → 左连接后仍是 4 行，u1 两行都补"华东"；
2. 分组推演：华东组 = u1 的 120+80 与 u3 的 50 → total=250、n=3、客单价 250/3 = 83.3；华北组 = u2 的 200 → total=200、n=1、客单价 200.0——n 列顺便揭示了"华东笔数多但单笔小"的业务差异；
3. 命名聚合语法 `.agg(total=("amount", "sum"), n=("amount", "count"))`：左边是输出列名，右边 (源列， 函数)——一列出处一目了然，避免 MultiIndex 列名泥潭。

### 完整案例（补充）：连接-聚合-导出全链路

```python
import pandas as pd

orders = pd.DataFrame({"uid": ["u1", "u1", "u2", "u3"], "amount": [120, 80, 200, 50]})
users = pd.DataFrame({"uid": ["u1", "u2", "u3"], "region": ["华东", "华北", "华东"]})
merged = orders.merge(users, on="uid", how="left")
print(merged.to_string(index=False))
agg = (merged.groupby("region")
             .agg(total=("amount", "sum"), n=("amount", "count"))
             .reset_index())
agg["avg_ticket"] = (agg["total"] / agg["n"]).round(1)
print(agg.to_string(index=False))
agg.to_csv("qa/_b38_tmp_agg.csv", index=False, encoding="utf-8-sig")
print("已导出列:", open("qa/_b38_tmp_agg.csv", encoding="utf-8-sig").readline().strip())
```

预期输出（实测）：

```
uid  amount region
 u1     120     华东
 u1      80     华东
 u2     200     华北
 u3      50     华东
region  total  n  avg_ticket
    华东    250  3        83.3
    华北    200  1       200.0
已导出列: region,total,n,avg_ticket
```

导出三参数的防御组合：`index=False`（不写 0,1,2 序号列）、`encoding="utf-8-sig"`（Excel 双击打开不乱码）、必要时 `float_format="%.2f"`（统一小数位）。

### Split-Apply-Combine 流程图解（文字示意图）

```
orders ──merge(users, on=uid, how='left')──▶ 带地区明细表
                                              │
        Split：按 region 切摞                  ▼
        ┌────────┬────────┐            华东摞[120,80,50]  华北摞[200]
        │ 华东   │ 华北   │                    │                │
        └────────┴────────┘            Apply：sum/count        │
                                              │                │
        Combine：摞回一张表 ◀──────────────────┴────────────────┘
        region  total  n  avg_ticket   ──reset_index()──▶ 扁平列
```

### 参考资料（补充）

- **pandas 官方文档：Group by（split-apply-combine）**
  - 链接：https://pandas.pydata.org/docs/user_guide/groupby.html
- **pandas 官方文档：merging（merge/how 参数全解）**
  - 链接：https://pandas.pydata.org/docs/user_guide/merging.html

### 知识关联

- 承接 l11-2：merge 前的键唯一性校验用本课 `.is_unique`，属于 .loc 之外又一基础动作；
- 呼应 l5-2：merge 的键匹配正是哈希表 O(1) 查找的表格化应用；
- l12-1 的缺失治理是 merge 后 NaN 行（how="left" 未命中）的直接下游。

### 本节总结（要点回顾）

1. groupby = SQL GROUP BY，`命名聚合 agg(出列=("源列", fn))` 可读性最佳，收尾 `reset_index()`；
2. merge 左连接保主表行数，关联前必验右表键唯一，防一对多行数爆炸；
3. 导出三件套 `index=False` + `encoding="utf-8-sig"` + 必要的 `float_format`。
'''

ADD["pyf-l12-1"] = '''
### 手算推导（逐步演算）：缺失治理决策链

对一张 5 行小表逐步推演清洗流水线的每一步产出：

1. `df.isna().sum()` 清点损失：oid 缺 1、amount 缺 1、coupon 缺 3——先看"伤在哪"再决定"怎么治"；
2. oid 是业务主键 → 缺失行**删除**（没法关联、没法去重）；`dropna(subset=["oid"])` 后剩 4 行；
3. `drop_duplicates(subset=["oid"])` 按主键去重，保留首条；
4. amount 列混有 "unknown" 字符串 → `pd.to_numeric(errors="coerce")` 把非法值转 NaN → 中位数填充（对离群值稳健，均值会被极端金额拉偏）；
5. coupon 是"没领券"而非"数据丢失" → 业务语义填充为 0；
6. 铁律：**同列不同语义的 NaN 用不同策略**——"没填"与"没有"是两个业务世界。

### 完整案例（补充）：六步清洗流水线实测

```python
import pandas as pd
import numpy as np

df = pd.DataFrame({"oid": ["A1", "A2", "A2", None, "A5"],
                   "amount": [100, np.nan, 100, 80, "unknown"],
                   "coupon": [np.nan, 5, np.nan, np.nan, 3]})
print("各列缺失数:\\n", df.isna().sum().to_dict())
print("重复行数(全列):", df.duplicated().sum())
df = df.dropna(subset=["oid"]).drop_duplicates(subset=["oid"])
df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
df["amount"] = df["amount"].fillna(df["amount"].median())
df["coupon"] = df["coupon"].fillna(0)
print(df.to_string(index=False))
```

预期输出（实测，pandas 3.0.5）：

```
各列缺失数:
 {'oid': 1, 'amount': 1, 'coupon': 3}
重复行数(全列): 0
oid  amount  coupon
 A1   100.0     0.0
 A2   100.0     5.0
 A5   100.0     3.0
```

注意 "unknown" 被 coerce 转为 NaN 后按中位数 100 填充——如果填充策略选错（比如填 0），A5 的客单统计会凭空被拉低，清洗决策直接影响下游结论。

### 清洗决策流程图解（文字示意图）

```
读入脏表
  │ ① isna().sum() 摸清缺口 → ② duplicated() 摸清重复
  ▼
主键缺失？──是──▶ dropna(subset=[key])（宁缺毋滥）
  │否
  ▼
文本金额？──是──▶ strip → 去货币符号 → to_numeric(errors='coerce')
  │否
  ▼
数值缺失？──┬─ 关键指标 ──▶ 中位数/业务规则填充并记录
            └─ 语义为"没有" ─▶ 填 0（如优惠券）
  ▼
清洗后校验：dtype 恢复数值型 + isna().sum()==0（或可解释）
```

### 知识关联

- 承接 l11-1：`info()` 的 Non-Null 缺口就是本节 isna 清点的入口；
- 呼应 l11-3：merge 后 how="left" 未命中的 NaN 行，同样走本节决策链；
- l2-2 的 int()/float() 转换规则在 to_numeric(errors="coerce") 中被向量化接管。

### 本节总结（要点回顾）

1. 清洗先侦察后动手：isna().sum() + duplicated() 两份体检报告先行；
2. 主键缺失必删、金额用中位数、语义性缺失（优惠券）填 0——策略绑定业务含义；
3. `np.nan != np.nan`，判缺失只用 pd.isna / .isna()，绝不写 `== np.nan`。
'''

def main():
    c = json.load(io.open(P, encoding="utf-8"))
    n = 0
    for ch in c["chapters"]:
        for l in ch["lessons"]:
            if l["id"] in ADD and len(l.get("content", "")) < 2800:   # 含 l12-1(2680) 补足到 2800+
                l["content"] = merge(l["content"], ADD[l["id"]])
                n += 1
                print(l["id"], "->", len(l["content"]))
    c["updatedAt"] = int(time.time() * 1000)
    json.dump(c, io.open(P, "w", encoding="utf-8", newline="\n"), ensure_ascii=False, indent=2)
    print("expanded", n)

if __name__ == "__main__":
    main()
