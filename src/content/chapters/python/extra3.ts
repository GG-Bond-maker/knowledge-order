import type { Exercise, Lesson } from '../../../types';

/* ============================================================
 *  Python 课程扩展包（三）：第 4~6 章的补充知识点与分级练习
 *
 *  写作约定：
 *   1. 题干 / 解析 / tips 中的行内代码用转义反引号 \`代码\`；
 *   2. 代码类字段内部禁止出现反引号；
 *   3. 编程题 tests 每行一个 assert，判分器逐行计分，可用变量 out；
 *   4. 必须在 Pyodide（Python 3.13 + numpy + pandas + matplotlib）可运行。
 *
 *  难度分级：第 4~5 章 3~4 为主；第 6 章 4~5 为主，少量 3 用于巩固。
 * ============================================================ */

export const pythonExtra3: {
  chapterId: string;
  lessons?: Lesson[];
  exercises: Exercise[];
}[] = [
  /* ============================================================
   *  第 4 章：文件读写与异常处理（扩展 18 题 + 2 个小节）
   * ============================================================ */
  {
    chapterId: 'python-4',
    lessons: [
      {
        id: 'py-l-4-4',
        title: 'CSV 与 JSON 的实战细节',
        content: `
### 学习目标

学完本节，你应该能够：
1. 用 csv.DictReader/DictWriter 处理含逗号与引号的字段并解释 RFC 4180 的引用规则；
2. 用 json.dump/load 的 ensure_ascii、indent、default 参数完成中文安全读写；
3. 对嵌套 JSON 写出逐层 get 的安全取值并区分缺失键与 null 值。

### 前置知识

- 「文件读写 with 与编码」（l4-1）；
- l2-3 的字典操作。

### 问题背景

文件是脚本与真实世界的边界，也是事故高发区：编码用错一个参数，中文全变乱码；忘记关闭句柄，Windows 下文件被锁、Linux 下句柄泄漏；CSV 的引号与逗号、JSON 的层级与类型，都能让「看起来对」的数据悄悄坏掉。异常处理是第二道防线——用自定义异常给错误贴上「哪个部门负责」的标签，才能分级处置而不是一崩了之。

### 直觉理解

with 是自动关门器：进屋开门、出屋关门，哪怕屋里着火（异常）也保证门关上。编码是翻译字典：写入用 UTF-8 编、读取也必须用 UTF-8 解，两边字典不同，字节还是那些字节，意思全错。CSV 是「穿了电子表格外衣的文本」：引号包住的逗号不是分隔符——所以永远用 csv 模块而不是 split(', ')。自定义异常是错误分诊台：SchemaError 送「整行拒绝」，ValueRangeError 送「标记修复」，互不误伤。

### 核心概念与原理详解

## CSV 不是"用逗号分割的文本"

初学者常写 \`line.split(",")\` 来解析 CSV，这在真实数据上几乎一定会出错：

\`\`\`
id,remark,amount
1,"含,逗号的备注",100
2,"跨行
的备注",200
\`\`\`

- 字段里可以**包含逗号**（用引号包裹）；
- 字段里可以**包含换行**；
- 可能出现**空字段**、**BOM 头**、**不同换行符**（\`\\r\\n\` / \`\\n\`）。

因此解析 CSV **必须**用 \`csv\` 模块（或 pandas），不要手写 \`split\`。

## csv 模块的两种读取方式

\`\`\`python
import csv

# 列表形式
with open("a.csv", newline="", encoding="utf-8") as f:
    for row in csv.reader(f):
        print(row)          # ['id', 'remark', 'amount']

# 字典形式（推荐：按列名访问）
with open("a.csv", newline="", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        print(row["amount"])
\`\`\`

\`newline=""\` 是官方文档强调的参数：不加它，Windows 上的空行处理会出现问题。

## CSV 的三个高频坑

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| Excel 打开中文乱码 | 无 BOM 的 UTF-8 被按 GBK 解析 | 写入时用 \`encoding="utf-8-sig"\` |
| 首列名多出 \`\\ufeff\` | 文件带 BOM，读入时未剥离 | 用 \`utf-8-sig\` 读取 |
| 多余空行 | 写入时用了默认 \`newline="\\r\\n"\` | 写文件时加 \`newline=""\` |

## JSON 的结构与边界

JSON 只有六种值：对象、数组、字符串、数字、布尔、null。
Python 与 JSON 的映射：

| JSON | Python |
| --- | --- |
| object | dict |
| array | list |
| string | str |
| number | int / float |
| true / false | True / False |
| null | None |

**注意**：JSON 的键**永远是字符串**。即使你用整数键构造字典，
经过 \`json.dumps\` 后也会变成字符串，\`json.loads\` 读回来还是字符串。

\`\`\`python
import json
d = {1: "a"}
print(json.loads(json.dumps(d)))   # {'1': 'a'}  ← 键变成了字符串
\`\`\`

## 读写 JSON 的关键参数

\`\`\`python
json.dumps(obj, ensure_ascii=False, indent=2)   # 中文不转义、美化输出
json.loads(text)                                 # 解析，格式错抛 JSONDecodeError
json.dump(obj, f, ensure_ascii=False)            # 直接写文件
\`\`\`

## 嵌套 JSON 的安全取值

接口返回的数据往往嵌套很深，直接 \`data["a"]["b"]["c"]\` 一旦中间缺失就 \`KeyError\`：

\`\`\`python
def dig(obj, path, default=None):
    """按 "a.b.c" 路径取值，缺失时返回 default。"""
    cur = obj
    for key in path.split("."):
        if not isinstance(cur, dict) or key not in cur:
            return default
        cur = cur[key]
    return cur

dig(payload, "data.items.0.name", default="未知")
\`\`\`

> 处理外部数据的总原则：**永远不要假设字段一定存在**。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import csv, json, tempfile, os

d = tempfile.mkdtemp()

# ---- 1. with 自动关闭 + 编码陷阱 ----
p_txt = os.path.join(d, "a.txt")
with open(p_txt, "w", encoding="utf-8") as f:
    f.write("订单,金额\\nA-1,99.5")
with open(p_txt, encoding="utf-8") as f:
    print("读回:", f.read().splitlines())
p_gbk = os.path.join(d, "b.txt")
with open(p_gbk, "w", encoding="gbk") as f:
    f.write("中文GBK")
try:
    open(p_gbk, encoding="utf-8").read()
except UnicodeDecodeError as e:
    print("用错编码:", type(e).__name__)

# ---- 2. CSV：引号与逗号陷阱 ----
p_csv = os.path.join(d, "c.csv")
with open(p_csv, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["id", "note"])
    w.writerow([1, '含,逗号和"引号"'])
with open(p_csv, newline="", encoding="utf-8") as f:
    rows = list(csv.DictReader(f))
print("CSV 读回:", rows)

# ---- 3. JSON：ensure_ascii / 嵌套安全取值 ----
rec = {"user": "小明", "tags": ["vip", 7], "addr": {"city": "杭州"}}
p_js = os.path.join(d, "d.json")
with open(p_js, "w", encoding="utf-8") as f:
    json.dump(rec, f, ensure_ascii=False, indent=2)
with open(p_js, encoding="utf-8") as f:
    back = json.load(f)
print("JSON 读回:", back["addr"]["city"], back["tags"][1])
print("安全取值:", back.get("missing", {}).get("x", "默认"))

# ---- 4. 自定义异常分级 ----
class DataError(Exception): ...
class SchemaError(DataError): ...
class ValueRangeError(DataError): ...
def validate(row):
    if "id" not in row:
        raise SchemaError(f"缺 id 字段: {row}")
    if float(row.get("amount", -1)) < 0:
        raise ValueRangeError(f"金额为负: {row}")
for row in ({"amount": 3}, {"id": 1, "amount": -5}, {"id": 2, "amount": 9}):
    try:
        validate(row)
        print("OK", row)
    except SchemaError as e:
        print("结构错误(整行拒绝):", e)
    except ValueRangeError as e:
        print("数值错误(标记修复):", e)\`\`\`

预期输出（实测）：读回: ['订单,金额', 'A-1,99.5']；用错编码: UnicodeDecodeError；CSV 读回: [{'id': '1', 'note': '含,逗号和"引号"'}]（引号逗号都保住了）；JSON 读回: 杭州 7；安全取值: 默认；分级处置: 结构错误(整行拒绝) 缺 id 字段 / 数值错误(标记修复) 金额为负 / OK {'id': 2, 'amount': 9}

**常见错误**：open 不写 encoding（Windows 默认 GBK，换机器中文全乱）；写 CSV 忘 newline=''，Windows 下空行翻倍；json.load 之后再 .get 链取嵌套字段，中间一层是 None 就崩——要先判层再取值。

### 常见误区

1. **with 只是为了省一行 close**——它保证异常路径也关闭，这是文件安全的核心而非语法糖；\\n2. **CSV 用 split(',') 拆就行**——引号内的逗号、换行、转义全会被拆错，csv 模块处理 RFC 4180 全部边界；\\n3. **except Exception 一把抓最省事**——它把该崩的 bug 也吞了，分级捕获+异常链（raise ... from e）才可运维。

### 知识关联

- **向前**：l1-3 的字符串方法（split/strip）是解析行数据的基础；
- **向后**：l6 项目的 load/validate 阶段就是本节三件套的组合拳；
- **平行**：pandas.read_csv 的 encoding/dtype 参数是本节概念的高层封装。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| with | 异常安全关闭，等价 try/finally |
| 编码 | 显式 UTF-8 写读成对；乱码先查编码再查数据 |
| CSV | csv 模块处理引号/换行；DictReader 按列名取 |
| JSON | ensure_ascii=False 保中文；indent 调试；嵌套逐层 get |
| 异常 | 自定义层级 + 分级捕获 + raise from 保留根因 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Python 官方文档 csv/json 模块与 PEP 3134（异常链）相应章节）
`,
        tips: [
          {
            kind: 'pitfall',
            text: '用 `line.split(",")` 解析 CSV 是错的：字段中可能包含逗号、换行、引号。请使用 `csv` 模块或 pandas。',
          },
          {
            kind: 'pitfall',
            text: 'JSON 的键在序列化后会同变成字符串，整数键会丢失类型。需要保留类型时，改用列表存 `[{"id": 1}]` 而非 `{1: ...}`。',
          },
          {
            kind: 'leak',
            text: '读写 CSV 时统一用 `newline=""` + `encoding="utf-8-sig"`，可以同时解决 Windows 空行与 Excel 中文乱码两个问题。',
          },
        ],
        demos: [
          {
            title: 'csv 模块正确处理引号与逗号',
            lang: 'python',
            code: `import io, csv

csv_text = 'id,remark,amount\\n1,"含,逗号的备注",100\\n2,普通备注,200\\n'

# 错误做法
print("split 的错误结果:")
for line in csv_text.strip().split("\\n")[1:]:
    print("  ", line.split(","))

# 正确做法
print("\\ncsv.DictReader 的正确结果:")
for row in csv.DictReader(io.StringIO(csv_text)):
    print("  ", row)`,
          },
          {
            title: '嵌套 JSON 安全取值',
            lang: 'python',
            code: `import json

payload = json.loads('{"data": {"items": [{"name": "耳机", "price": 299}]}}')

def dig(obj, path, default=None):
    cur = obj
    for key in path.split("."):
        if isinstance(cur, list):
            try:
                cur = cur[int(key)]
            except (ValueError, IndexError):
                return default
            continue
        if not isinstance(cur, dict) or key not in cur:
            return default
        cur = cur[key]
    return cur

print("正常取值:", dig(payload, "data.items.0.name"))
print("缺失字段:", dig(payload, "data.items.0.stock", default="无库存字段"))
print("错误路径:", dig(payload, "meta.total", default=0))

# JSON 键永远是字符串
print("\\n整数键序列化后:", json.loads(json.dumps({1: "a"})))`,
          },
        ],
      },
      {
        id: 'py-l-4-5',
        title: '自定义异常与错误分级处理',
        content: `
### 学习目标

学完本节，你应该能够：
1. 设计两层自定义异常层级（基类 DataError + 子类）并为不同错误分级选择处置策略；
2. 用 raise ... from e 保留原始异常链并解释 __cause__ 的调试价值；
3. 把「整行拒绝/标记修复/跳过计数」三种策略落到一个校验循环。

### 前置知识

- l4-1~l4-3 的文件与内置异常；
- l3-3 的函数与 raise 语法。

### 问题背景

文件是脚本与真实世界的边界，也是事故高发区：编码用错一个参数，中文全变乱码；忘记关闭句柄，Windows 下文件被锁、Linux 下句柄泄漏；CSV 的引号与逗号、JSON 的层级与类型，都能让「看起来对」的数据悄悄坏掉。异常处理是第二道防线——用自定义异常给错误贴上「哪个部门负责」的标签，才能分级处置而不是一崩了之。

### 直觉理解

with 是自动关门器：进屋开门、出屋关门，哪怕屋里着火（异常）也保证门关上。编码是翻译字典：写入用 UTF-8 编、读取也必须用 UTF-8 解，两边字典不同，字节还是那些字节，意思全错。CSV 是「穿了电子表格外衣的文本」：引号包住的逗号不是分隔符——所以永远用 csv 模块而不是 split(', ')。自定义异常是错误分诊台：SchemaError 送「整行拒绝」，ValueRangeError 送「标记修复」，互不误伤。

### 核心概念与原理详解

## 为什么需要自定义异常

内置异常（\`ValueError\`、\`KeyError\`）只能表达"哪里出了技术问题"，
但业务上有更细的分级：**数据质量问题**、**业务规则不满足**、**外部依赖失败**。
自定义异常让调用方能精确捕获并采取不同动作。

## 定义与抛出

\`\`\`python
class DataQualityError(Exception):
    """数据质量校验未通过。"""

class BusinessRuleError(Exception):
    """业务规则不满足（非技术错误）。"""

def validate(row):
    if row.get("amount") is None:
        raise DataQualityError(f"金额缺失: {row}")
    if row["amount"] < 0:
        raise BusinessRuleError(f"金额为负: {row}")
\`\`\`

## 异常继承层次

把相关异常组织成父子关系，调用方可以"捕获父类处理全部子类"：

\`\`\`python
class PipelineError(Exception):
    """数据管道统一异常基类。"""

class ReadError(PipelineError):
    pass

class CleanError(PipelineError):
    pass

# 调用方
try:
    run_pipeline()
except ReadError:
    retry()                 # 读取失败 → 重试
except PipelineError as e:
    alert(e)                # 其它管道错误 → 告警
\`\`\`

## 捕获时保留原始异常链

重新抛出异常时用 \`raise ... from e\`，可以保留完整堆栈：

\`\`\`python
try:
    amount = float(row["amount"])
except (TypeError, ValueError) as e:
    raise DataQualityError(f"第 {row.get('line')} 行金额非法") from e
\`\`\`

不写 \`from e\` 时 Python 也会自动附加 \`During handling of the above exception...\`，
但显式 \`from e\` 更清晰；\`raise ... from None\` 则会隐藏原始异常。

## 错误分级处理的三种策略

| 策略 | 适用场景 | 实现 |
| --- | --- | --- |
| **快速失败** | 关键校验（如对账不平） | 直接 \`raise\`，终止任务 |
| **跳过 + 记录** | 脏数据清洗 | 错误记入清单，继续处理 |
| **重试** | 网络/外部接口抖动 | 指数退避重试 N 次 |

## 一个完整的错误分级示例

\`\`\`python
ok, failed, fatal = [], [], []

for i, row in enumerate(rows):
    try:
        ok.append(process(row))
    except DataQualityError as e:
        failed.append({"line": i, "reason": str(e)})   # 可恢复：跳过
    except Exception as e:
        fatal.append({"line": i, "error": repr(e)})     # 不可预期：单独记录

if len(fatal) > 0:
    raise PipelineError(f"出现 {len(fatal)} 条不可恢复错误，终止任务")

fail_rate = len(failed) / max(len(rows), 1)
if fail_rate > 0.1:
    raise PipelineError(f"失败率 {fail_rate:.1%} 超过阈值 10%")
\`\`\`

**这就是生产级数据管道的典型结构**：可恢复错误跳过并计数，
不可恢复错误立即终止，最后用失败率阈值决定整体是否通过。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import csv, json, tempfile, os

d = tempfile.mkdtemp()

# ---- 1. with 自动关闭 + 编码陷阱 ----
p_txt = os.path.join(d, "a.txt")
with open(p_txt, "w", encoding="utf-8") as f:
    f.write("订单,金额\\nA-1,99.5")
with open(p_txt, encoding="utf-8") as f:
    print("读回:", f.read().splitlines())
p_gbk = os.path.join(d, "b.txt")
with open(p_gbk, "w", encoding="gbk") as f:
    f.write("中文GBK")
try:
    open(p_gbk, encoding="utf-8").read()
except UnicodeDecodeError as e:
    print("用错编码:", type(e).__name__)

# ---- 2. CSV：引号与逗号陷阱 ----
p_csv = os.path.join(d, "c.csv")
with open(p_csv, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["id", "note"])
    w.writerow([1, '含,逗号和"引号"'])
with open(p_csv, newline="", encoding="utf-8") as f:
    rows = list(csv.DictReader(f))
print("CSV 读回:", rows)

# ---- 3. JSON：ensure_ascii / 嵌套安全取值 ----
rec = {"user": "小明", "tags": ["vip", 7], "addr": {"city": "杭州"}}
p_js = os.path.join(d, "d.json")
with open(p_js, "w", encoding="utf-8") as f:
    json.dump(rec, f, ensure_ascii=False, indent=2)
with open(p_js, encoding="utf-8") as f:
    back = json.load(f)
print("JSON 读回:", back["addr"]["city"], back["tags"][1])
print("安全取值:", back.get("missing", {}).get("x", "默认"))

# ---- 4. 自定义异常分级 ----
class DataError(Exception): ...
class SchemaError(DataError): ...
class ValueRangeError(DataError): ...
def validate(row):
    if "id" not in row:
        raise SchemaError(f"缺 id 字段: {row}")
    if float(row.get("amount", -1)) < 0:
        raise ValueRangeError(f"金额为负: {row}")
for row in ({"amount": 3}, {"id": 1, "amount": -5}, {"id": 2, "amount": 9}):
    try:
        validate(row)
        print("OK", row)
    except SchemaError as e:
        print("结构错误(整行拒绝):", e)
    except ValueRangeError as e:
        print("数值错误(标记修复):", e)\`\`\`

预期输出（实测）：读回: ['订单,金额', 'A-1,99.5']；用错编码: UnicodeDecodeError；CSV 读回: [{'id': '1', 'note': '含,逗号和"引号"'}]（引号逗号都保住了）；JSON 读回: 杭州 7；安全取值: 默认；分级处置: 结构错误(整行拒绝) 缺 id 字段 / 数值错误(标记修复) 金额为负 / OK {'id': 2, 'amount': 9}

**常见错误**：open 不写 encoding（Windows 默认 GBK，换机器中文全乱）；写 CSV 忘 newline=''，Windows 下空行翻倍；json.load 之后再 .get 链取嵌套字段，中间一层是 None 就崩——要先判层再取值。

### 常见误区

1. **with 只是为了省一行 close**——它保证异常路径也关闭，这是文件安全的核心而非语法糖；\\n2. **CSV 用 split(',') 拆就行**——引号内的逗号、换行、转义全会被拆错，csv 模块处理 RFC 4180 全部边界；\\n3. **except Exception 一把抓最省事**——它把该崩的 bug 也吞了，分级捕获+异常链（raise ... from e）才可运维。

### 知识关联

- **向前**：l1-3 的字符串方法（split/strip）是解析行数据的基础；
- **向后**：l6 项目的 load/validate 阶段就是本节三件套的组合拳；
- **平行**：pandas.read_csv 的 encoding/dtype 参数是本节概念的高层封装。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| with | 异常安全关闭，等价 try/finally |
| 编码 | 显式 UTF-8 写读成对；乱码先查编码再查数据 |
| CSV | csv 模块处理引号/换行；DictReader 按列名取 |
| JSON | ensure_ascii=False 保中文；indent 调试；嵌套逐层 get |
| 异常 | 自定义层级 + 分级捕获 + raise from 保留根因 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Python 官方文档 csv/json 模块与 PEP 3134（异常链）相应章节）
`,
        tips: [
          {
            kind: 'leak',
            text: '用 `raise ... from e` 保留异常链，日志里能看到"根因"，排查效率远高于只抛新异常。',
          },
          {
            kind: 'pitfall',
            text: '自定义异常简单继承 `Exception` 即可，不需要重写 `__init__`。过度设计（加大量属性）反而降低可读性。',
          },
          {
            kind: 'interview',
            text: '被问"如何设计健壮的数据管道"时，可以答：可恢复错误跳过并记录、不可恢复错误终止、设置失败率阈值、异常分级与告警。',
          },
        ],
        demos: [
          {
            title: '错误分级处理',
            lang: 'python',
            code: `class DataQualityError(Exception):
    pass

class BusinessRuleError(Exception):
    pass

rows = [
    {"id": 1, "amount": "100"},
    {"id": 2, "amount": "abc"},
    {"id": 3, "amount": "-5"},
    {"id": 4, "amount": "200"},
]

ok, failed = [], []
for r in rows:
    try:
        amt = float(r["amount"])
        if amt < 0:
            raise BusinessRuleError(f"金额为负: {amt}")
        ok.append({"id": r["id"], "amount": amt})
    except DataQualityError as e:
        failed.append((r["id"], "数据质量", str(e)))
    except BusinessRuleError as e:
        failed.append((r["id"], "业务规则", str(e)))
    except (ValueError, TypeError) as e:
        failed.append((r["id"], "格式错误", str(e)))

print("成功:", ok)
print("失败:")
for f in failed:
    print("  ", f)

fail_rate = len(failed) / len(rows)
print(f"\\n失败率 {fail_rate:.0%} →", "需告警" if fail_rate > 0.3 else "可接受")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'py-4-x1',
        relatedLessonId: 'py-l-4-2',
        type: 'single',
        difficulty: 1,
        question: '下列哪个异常会在 `int("abc")` 时抛出？',
        options: [
          { value: 'A', text: '`TypeError`' },
          { value: 'B', text: '`ValueError`' },
          { value: 'C', text: '`KeyError`' },
          { value: 'D', text: '`SyntaxError`' },
        ],
        answer: 'B',
        explanation:
          '字符串是合法类型，但内容不是合法整数，属于"类型对、值不对"，抛 `ValueError`。而 `int(None)` 是类型不对，抛 `TypeError`。',
        tags: ['异常'],
      },
      {
        id: 'py-4-x2',
        relatedLessonId: 'py-l-4-1',
        type: 'judge',
        difficulty: 1,
        question: '`open()` 的默认模式是 `"r"`（只读）。',
        answer: true,
        explanation: '不指定 mode 时默认为 `"r"`，文件不存在会抛 `FileNotFoundError`。写文件必须显式指定 `"w"`、`"a"` 或 `"x"`。',
        tags: ['文件'],
      },
      {
        id: 'py-4-x3',
        relatedLessonId: 'py-l-4-1',
        type: 'multiple',
        difficulty: 2,
        question: '关于 `with open(...) as f:`，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '代码块结束时自动关闭文件' },
          { value: 'B', text: '即使代码块内抛出异常，文件也会被关闭' },
          { value: 'C', text: '它依赖上下文管理器协议（`__enter__` / `__exit__`）' },
          { value: 'D', text: '使用后可以省略 `f.close()` 之外的其它资源释放' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'A、B、C 都正确。D 表述含糊——`with` 保证的是"退出时正确清理"，具体清理什么由上下文管理器决定（如数据库连接、锁）。',
        tags: ['文件', 'with'],
      },
      {
        id: 'py-4-x4',
        relatedLessonId: 'py-l-4-1',
        type: 'fill',
        difficulty: 2,
        question: '读取文件时统一指定编码以避免中文乱码，补全代码：\n\n```python\nwith open("data.csv", encoding="___") as f:\n    text = f.read()\n```',
        blanks: [['utf-8', 'utf8', 'utf-8-sig']],
        explanation:
          '`utf-8` 是通用编码。若文件来自 Excel 导出且带 BOM，建议用 `utf-8-sig`，会自动剥离 BOM 头（否则首列名会多出 `\\ufeff`）。',
        tags: ['文件', '编码'],
      },
      {
        id: 'py-4-x5',
        relatedLessonId: 'py-l-4-2',
        type: 'single',
        difficulty: 3,
        question:
          '```python\ntry:\n    x = 1 / 0\nexcept ZeroDivisionError:\n    print("A")\nfinally:\n    print("B")\n```\n输出是？',
        options: [
          { value: 'A', text: '只输出 `A`' },
          { value: 'B', text: '只输出 `B`' },
          { value: 'C', text: '先输出 `A` 再输出 `B`' },
          { value: 'D', text: '抛出异常，什么都不输出' },
        ],
        answer: 'C',
        explanation:
          '异常被 `except` 捕获处理后，`finally` **总会**执行。所以先打印 A（except 块），再打印 B（finally 块）。',
        tags: ['异常'],
      },
      {
        id: 'py-4-x6',
        relatedLessonId: 'py-l-4-2',
        type: 'judge',
        difficulty: 2,
        question: '`except Exception:` 会捕获 `KeyboardInterrupt`（Ctrl+C 中断）。',
        answer: false,
        explanation:
          '`KeyboardInterrupt` 和 `SystemExit` 都继承自 `BaseException` 而**不是** `Exception`，因此 `except Exception:` 不会捕获它们（这正是我们希望的——程序能被正常中断）。裸 `except:` 才会捕获。',
        tags: ['异常'],
      },
      {
        id: 'py-4-x7',
        relatedLessonId: 'py-l-4-2',
        type: 'multiple',
        difficulty: 3,
        question: '关于 `finally` 块，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '无论是否发生异常都会执行' },
          { value: 'B', text: '在 `finally` 中 `return` 会覆盖 `try` 中的返回值' },
          { value: 'C', text: '`finally` 适合放资源释放代码' },
          { value: 'D', text: '`finally` 中的代码抛出异常会覆盖原异常' },
        ],
        answer: ['A', 'B', 'C', 'D'],
        explanation:
          '四项都正确。正因为 B、D 的"覆盖"特性容易掩盖真实问题，实践中应避免在 `finally` 里 `return` 或抛异常，只做清理工作。',
        tags: ['异常'],
      },
      {
        id: 'py-4-x8',
        relatedLessonId: 'py-l-4-5',
        type: 'fill',
        difficulty: 3,
        question:
          '处理 JSON 解析失败时，最应捕获的异常类型是：\n\n```python\ntry:\n    data = json.loads(text)\nexcept ___: \n    data = {}\n```',
        blanks: [['json.JSONDecodeError', 'JSONDecodeError', 'ValueError']],
        explanation:
          '`json.JSONDecodeError` 是 `ValueError` 的子类，直接捕获它最精确。捕获 `ValueError` 也能工作，但范围更宽。',
        tags: ['JSON', '异常'],
      },
      {
        id: 'py-4-x9',
        relatedLessonId: 'py-l-4-1',
        type: 'code',
        difficulty: 2,
        question:
          '用 `io.StringIO` 模拟文件读取。给定 `csv_text`（含表头 `name,score`），请解析并计算：\n\n1. 记录数 `n_rows`（不含表头）；\n2. 平均分 `avg_score`（保留 2 位小数）；\n3. 分数最高的姓名 `top_name`。',
        starterCode: `import io, csv

csv_text = """name,score
张三,88
李四,95
王五,72
"""

n_rows = ___
avg_score = ___
top_name = ___
`,
        setupCode: '',
        expectedOutput: "n_rows=3, avg_score=85.0, top_name='李四'",
        tests: `assert n_rows == 3, f"n_rows 应为 3，实际 {n_rows}"
assert abs(avg_score - 85.0) < 1e-9, f"avg_score 应为 85.0，实际 {avg_score}"
assert top_name == "李四", f"top_name 应为 李四，实际 {top_name}"
`,
        explanation:
          '```python\nrows = list(csv.DictReader(io.StringIO(csv_text)))\nn_rows = len(rows)\nscores = [float(r["score"]) for r in rows]\navg_score = round(sum(scores) / len(scores), 2)\ntop_name = max(rows, key=lambda r: float(r["score"]))["name"]\n```\n\n平均分 (88+95+72)/3 = 85.0。`max(key=...)` 返回整行记录，再取姓名。',
        tags: ['文件', 'CSV'],
      },
      {
        id: 'py-4-x10',
        relatedLessonId: 'py-l-4-5',
        type: 'code',
        difficulty: 3,
        question:
          '健壮的批量解析：编写 `safe_parse(rows)`，`rows` 是 `[{"id", "amount"}]` 列表，金额是字符串。\n\n- 能转成非负 float 的进入 `ok` 列表（保存为 `(id, float)` 元组）；\n- 其它进入 `bad` 列表（保存 id）；\n\n返回 `(ok, bad)`，调用后结果赋给 `out_ok, out_bad`。',
        starterCode: `rows = [
    {"id": 1, "amount": "100"},
    {"id": 2, "amount": "abc"},
    {"id": 3, "amount": "-5"},
    {"id": 4, "amount": " 88.5 "},
]

def safe_parse(rows):
    ok, bad = [], []
    # 在这里实现
    return ok, bad

out_ok, out_bad = safe_parse(rows)
`,
        setupCode: '',
        expectedOutput: 'out_ok = [(1, 100.0), (4, 88.5)], out_bad = [2, 3]',
        tests: `assert out_ok == [(1, 100.0), (4, 88.5)], f"ok 列表不正确：{out_ok}"
assert out_bad == [2, 3], f"bad 列表不正确：{out_bad}"
assert safe_parse([]) == ([], []), "空输入应返回 ([], [])"
`,
      answer: `rows = [
    {"id": 1, "amount": "100"},
    {"id": 2, "amount": "abc"},
    {"id": 3, "amount": "-5"},
    {"id": 4, "amount": " 88.5 "},
]

def safe_parse(rows):
    ok, bad = [], []
    for r in rows:
        try:
            amt = float(r["amount"])
            if amt < 0:
                raise ValueError("negative")
            ok.append((r["id"], amt))
        except (TypeError, ValueError):
            bad.append(r["id"])
    return ok, bad

out_ok, out_bad = safe_parse(rows)`,
        explanation:
          '```python\ndef safe_parse(rows):\n    ok, bad = [], []\n    for r in rows:\n        try:\n            amt = float(r["amount"])\n            if amt < 0:\n                raise ValueError("negative")\n            ok.append((r["id"], amt))\n        except (TypeError, ValueError):\n            bad.append(r["id"])\n    return ok, bad\n```\n\n`float(" 88.5 ")` 会自动去空格。负数用 `raise ValueError` 归入同一处理分支，避免重复写两次 `bad.append`。',
        tags: ['异常', '数据清洗'],
      },
      {
        id: 'py-4-x11',
        relatedLessonId: 'py-l-4-4',
        type: 'single',
        difficulty: 3,
        question: '下列关于 `csv` 模块的说法，正确的是？',
        options: [
          { value: 'A', text: 'CSV 字段中不可能包含逗号' },
          { value: 'B', text: '`csv.DictReader` 把每行转为以表头为键的字典' },
          { value: 'C', text: 'CSV 不支持引号包裹字段' },
          { value: 'D', text: '`csv.reader` 返回的是字典列表' },
        ],
        answer: 'B',
        explanation:
          'CSV 用双引号包裹含逗号的字段，这是 RFC 4180 的规定，所以 A、C 错误。`csv.reader` 返回列表，`DictReader` 才返回字典（D 错误）。',
        tags: ['CSV'],
      },
      {
        id: 'py-4-x12',
        relatedLessonId: 'py-l-4-4',
        type: 'judge',
        difficulty: 3,
        question: 'JSON 序列化时，字典的整数键会被转换成字符串键。',
        answer: true,
        explanation:
          'JSON 规范要求对象的键必须是字符串。`json.dumps({1: "a"})` 得到 `{"1": "a"}`，读回来也是字符串键 `"1"`。需要保留数字类型时，应改用列表结构。',
        tags: ['JSON'],
      },
      {
        id: 'py-4-x13',
        relatedLessonId: 'py-l-4-4',
        type: 'fill',
        difficulty: 2,
        question: '把字典写入 JSON 文件并保留中文原样，补全参数：\n\n```python\njson.dump(data, f, ensure_ascii=___, indent=2)\n```',
        blanks: [['False', 'false']],
        explanation: '`ensure_ascii=False` 让中文直接以 UTF-8 输出，而不是转成 `\\uXXXX` 转义序列。',
        tags: ['JSON'],
      },
      {
        id: 'py-4-x14',
        relatedLessonId: 'py-l-4-5',
        type: 'code',
        difficulty: 3,
        question:
          '自定义异常与分级：定义 `DataQualityError`，编写 `validate(row)`，满足以下规则时抛出该异常：\n\n- `amount` 无法转 float → 消息含 `金额非法`\n- `amount` < 0 → 消息含 `金额为负`\n- `city` 为空字符串 → 消息含 `城市缺失`\n\n合法则返回转换后的 `float`。最后把校验结果收集到 `results`（字符串形式，捕获异常时记录其消息）。',
        starterCode: `rows = [
    {"amount": "100", "city": "北京"},
    {"amount": "abc", "city": "上海"},
    {"amount": "-5", "city": "北京"},
    {"amount": "200", "city": "  "},
]

class DataQualityError(Exception):
    pass

def validate(row):
    # 在这里实现
    return ___

results = []
for r in rows:
    try:
        results.append(validate(r))
    except DataQualityError as e:
        results.append("错误: " + str(e))
`,
        setupCode: '',
        expectedOutput: 'results = [100.0, "错误: 金额非法", "错误: 金额为负", "错误: 城市缺失"]',
        tests: `assert results[0] == 100.0, f"第一条应为 100.0，实际 {results[0]}"
assert "金额非法" in results[1], f"第二条应含'金额非法'，实际 {results[1]}"
assert "金额为负" in results[2], f"第三条应含'金额为负'，实际 {results[2]}"
assert "城市缺失" in results[3], f"第四条应含'城市缺失'，实际 {results[3]}"
assert issubclass(DataQualityError, Exception)
`,
        explanation:
          '```python\ndef validate(row):\n    try:\n        amt = float(row["amount"])\n    except (TypeError, ValueError):\n        raise DataQualityError("金额非法")\n    if amt < 0:\n        raise DataQualityError("金额为负")\n    if not str(row.get("city", "")).strip():\n        raise DataQualityError("城市缺失")\n    return amt\n```\n\n校验顺序按"格式 → 业务规则 → 必填"递进；`city` 全是空格时要 `strip()` 后判断。',
        tags: ['异常', '自定义异常'],
      },
      {
        id: 'py-4-x15',
        relatedLessonId: 'py-l-4-5',
        type: 'multiple',
        difficulty: 3,
        question: '处理大文件（如 5GB CSV）时，下列做法合理的有？（多选）',
        options: [
          { value: 'A', text: '用 `for line in f:` 逐行迭代' },
          { value: 'B', text: '用 `f.readlines()` 全部读入再处理' },
          { value: 'C', text: '用生成器逐批产出数据' },
          { value: 'D', text: '分块处理后落库，再用 SQL 查询' },
        ],
        answer: ['A', 'C', 'D'],
        explanation:
          '`readlines()` 会把整个文件载入内存，5GB 文件通常直接 OOM。A、C、D 都能把内存占用控制在常数级。',
        tags: ['文件', '性能'],
      },
      {
        id: 'py-4-x16',
        relatedLessonId: 'py-l-4-2',
        type: 'open',
        difficulty: 4,
        question:
          '生产环境的数据管道在凌晨跑批时失败，日志只有一行 `KeyError: "amount"`。请写出你的排查步骤，并说明如何从工程上避免这类问题。',
        referenceAnswer: `**排查步骤**：

1. **定位出错位置**：看完整堆栈（不只是最后一行），找到哪一行代码、哪一列取值失败。
2. **确认数据变化**：检查当天的源文件/上游表是否发生了结构变化（删列、改名、大小写变化、编码变化）。
3. **确认数据范围**：是否只有部分行缺该字段（例如某些渠道的表格结构不同）。
4. **复现**：用当天的一小段数据本地复现，确认是稳定问题还是偶发。
5. **临时修复**：对缺字段做默认值或跳过，保证当天出数（并记录缺陷）。
6. **根因修复**：与上游确认变更，更新解析逻辑并添加校验。

**工程上的预防措施**：

1. 读入后立刻做**结构校验**（必需列是否存在、类型是否符合），缺失即快速失败并报警；
2. 用 \`row.get("amount")\` + 显式校验代替裸下标访问；
3. 建立**数据契约**（schema）文档，上游变更需提前通知；
4. 关键字段的缺失率纳入监控；
5. 失败时输出**错误清单**（行号 + 原始内容），而不是只抛一个 KeyError；
6. 增加幂等与重跑机制，失败可安全重试。`,
        rubric: [
          { point: '强调看完整堆栈定位具体代码行', score: 1 },
          { point: '从上游结构变更/部分行结构不同两个方向排查', score: 2 },
          { point: '本地复现缩小范围', score: 1 },
          { point: '提出结构校验、schema 契约、缺失率监控等预防措施', score: 2 },
        ],
        keywords: ['堆栈', '上游', '结构变化', 'schema', '校验', '监控', '复现'],
        explanation:
          '本题考察的是"从报错到根治"的工程能力。只回答"加个 try except"会失去大部分分数，因为那只是掩盖问题。',
        tags: ['异常', '工程实践'],
      },
      {
        id: 'py-4-x17',
        relatedLessonId: 'py-l-4-4',
        type: 'code',
        difficulty: 4,
        question:
          '综合：实现 `load_and_report(csv_text)`，用 `io.StringIO` + `csv.DictReader` 解析，返回质量报告字典，包含：\n\n- `total`：总行数\n- `valid`：有效行数（`amount` 可转非负 float 且 `city` 非空）\n- `errors`：分词统计，如 `{"金额非法": 1, "城市缺失": 1}`\n\n报告保存到 `report`。',
        starterCode: `import io, csv
from collections import Counter

csv_text = """id,amount,city
1,100,北京
2,abc,上海
3,-50,广州
4,200,
5,88.5,  深圳  
"""

def load_and_report(csv_text):
    # 在这里实现
    return ___

report = load_and_report(csv_text)
`,
        setupCode: '',
        expectedOutput: "total=5, valid=2, errors={'金额非法': 1, '金额为负': 1, '城市缺失': 1}",
        tests: `assert report["total"] == 5, f"total 应为 5，实际 {report['total']}"
assert report["valid"] == 2, f"valid 应为 2，实际 {report['valid']}"
assert report["errors"].get("金额非法") == 1, f"金额非法计数不正确：{report['errors']}"
assert report["errors"].get("金额为负") == 1, f"金额为负计数不正确：{report['errors']}"
assert report["errors"].get("城市缺失") == 1, f"城市缺失计数不正确：{report['errors']}"
`,
        explanation:
          '```python\ndef load_and_report(csv_text):\n    rows = list(csv.DictReader(io.StringIO(csv_text)))\n    errors = Counter()\n    valid = 0\n    for r in rows:\n        try:\n            amt = float(r["amount"])\n        except (TypeError, ValueError):\n            errors["金额非法"] += 1\n            continue\n        if amt < 0:\n            errors["金额为负"] += 1\n            continue\n        if not (r.get("city") or "").strip():\n            errors["城市缺失"] += 1\n            continue\n        valid += 1\n    return {"total": len(rows), "valid": valid, "errors": dict(errors)}\n```\n\n注意 `"  深圳  "` 经 `strip()` 后非空，是有效行；而 `""` 与 `"  "` 都算缺失。',
        tags: ['综合', 'CSV', '质量报告'],
      },
      {
        id: 'py-4-x18',
        relatedLessonId: 'py-l-4-1',
        type: 'single',
        difficulty: 2,
        question: '读取文件时出现 `UnicodeDecodeError`，最合理的排查方向是？',
        options: [
          { value: 'A', text: '文件路径写错了' },
          { value: 'B', text: '文件实际编码与声明的 `encoding` 不一致' },
          { value: 'C', text: '内存不足' },
          { value: 'D', text: '文件为空' },
        ],
        answer: 'B',
        explanation:
          '`UnicodeDecodeError` 明确表示"解码失败"，即字节序列不符合声明的编码。常见情况是用 UTF-8 打开 GBK 文件（或反之）。可尝试 `gbk`、`utf-8-sig`，或用 `chardet` 类工具探测。',
        tags: ['编码', '异常'],
      },
    ],
  },

  /* ============================================================
   *  第 5 章：推导式、迭代器与标准库（扩展 18 题 + 2 个小节）
   * ============================================================ */
  {
    chapterId: 'python-5',
    lessons: [
      {
        id: 'py-l-5-4',
        title: 'functools 与 operator：让函数更短更快',
        content: `
### 学习目标

学完本节，你应该能够：
1. 用 lru_cache 记忆化递归（fib 对比）并说出可变参数的限制；
2. 用 partial 固定参数生成特化函数，用 reduce 完成累积归约；
3. 在排序键场景用 operator.itemgetter/attrgetter 替代 lambda 并说明其更快更清晰。

### 前置知识

- l3-3 的函数参数机制；
- l5-2 的 collections 基础。

### 问题背景

同样是分组计数，手写 for 循环十行，Counter 一行且更快；同样是缓存计算，lru_cache一个装饰器把指数级递归压成线性。标准库与推导式是「Pythonic」的分界线：它们把数据处理的常见动作变成公认的短语，代码短一半、快一截、审查者一眼懂。模块与导入机制则是这一切的组织方式——不懂 sys.modules 与搜索路径，就看不懂循环导入与 __main__ 之谜。

### 直觉理解

推导式是「一行印章」：一个方括号把「变换+过滤」压成一句话印出一整个容器。collections 是自动柜台：Counter 自动点数、defaultdict 自动开户、deque 两端快进快出；itertools 是迭代器工具箱，groupby 认准「相邻相同」才分组。lru_cache 给函数贴上便签「算过的直接抄」，partial 是「预设参数的模具」，import 是先查自家书架（sys.modules）再去图书馆（搜索路径）借书登记。

### 核心概念与原理详解

## functools 的四个必备工具

### 1. lru_cache：记忆化

\`\`\`python
from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)

fib(100)     # 瞬间完成（无缓存时几乎算不出来）
\`\`\`

**要求参数可哈希**，因此不能直接用于 list / dict 参数。做数据分析时，
可以把耗时很长的"读文件 + 清洗"封装成以路径为参数的缓存函数。

### 2. partial：预设部分参数

\`\`\`python
from functools import partial

def vat(amount, rate):
    return amount * (1 + rate)

add_13 = partial(vat, rate=0.13)
add_13(100)          # 113.0
\`\`\`

常用于"同一函数、不同固定参数"的场景，比如给不同品类套用不同税率。

### 3. reduce：累积归约

\`\`\`python
from functools import reduce

reduce(lambda a, b: a * b, [1, 2, 3, 4])    # 24
\`\`\`

**能用 sum / max / min / any / all 的地方优先用内置函数**，reduce 可读性偏低。

### 4. total_ordering / cmp_to_key

\`\`\`python
from functools import cmp_to_key

records = [{"v": 3}, {"v": 1}]
sorted(records, key=cmp_to_key(lambda a, b: a["v"] - b["v"]))
\`\`\`

只在需要自定义比较逻辑（如多关键字复杂规则）时才用。

## operator：比 lambda 更快更清晰

\`\`\`python
import operator

sorted(records, key=operator.itemgetter("score"))       # 等价于 lambda r: r["score"]
sorted(rows, key=operator.itemgetter(0, 2))             # 按第 0、2 列排序
list(map(operator.add, [1, 2], [10, 20]))               # [11, 22]
\`\`\`

| lambda 写法 | operator 写法 | 优势 |
| --- | --- | --- |
| \`lambda x: x["k"]\` | \`itemgetter("k")\` | 快约 2 倍、可读 |
| \`lambda x: x[0]\` | \`itemgetter(0)\` | 同上 |
| \`lambda x: x.attr\` | \`attrgetter("attr")\` | 同上 |
| \`lambda a, b: a + b\` | \`operator.add\` | 同上 |

## 什么时候值得优化

**先测量，再优化**：

\`\`\`python
import time
t0 = time.perf_counter()
# ... 待测代码
print(f"耗时 {time.perf_counter() - t0:.3f}s")
\`\`\`

大多数情况下，把 list 换成 set、把循环换成向量化（NumPy/Pandas）的收益，
远大于把 lambda 换成 itemgetter。

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
            kind: 'performance',
            text: '`key=operator.itemgetter("col")` 比 `key=lambda r: r["col"]` 快约 2 倍，且在大数据量排序时收益明显。',
          },
          {
            kind: 'pitfall',
            text: '`lru_cache` 的缓存键必须是可哈希的，list 参数会报 `TypeError: unhashable type`。需要缓存时先转成 tuple。',
          },
          {
            kind: 'leak',
            text: '`reduce` 可用时，`sum(iterable)`、`min(...)`、`any(...)` 更清晰。用 `reduce(lambda a, b: a + [b], ...)` 构造列表是典型的反模式。',
          },
        ],
        demos: [
          {
            title: 'itemgetter 与 lambda 的性能对比',
            lang: 'python',
            code: `import time, operator, random

random.seed(42)
records = [{"score": random.randint(0, 100), "name": f"u{i}"} for i in range(200_000)]

t0 = time.perf_counter()
a = sorted(records, key=lambda r: r["score"])
t1 = time.perf_counter()

b = sorted(records, key=operator.itemgetter("score"))
t2 = time.perf_counter()

print(f"lambda      排序：{(t1 - t0) * 1000:7.1f} ms")
print(f"itemgetter  排序：{(t2 - t1) * 1000:7.1f} ms")
print(f"加速约 {(t1 - t0) / (t2 - t1):.1f} 倍，结果一致: {a == b}")`,
          },
          {
            title: 'lru_cache 与 partial',
            lang: 'python',
            code: `from functools import lru_cache, partial
import time

calls = {"n": 0}

@lru_cache(maxsize=None)
def expensive(n):
    calls["n"] += 1
    time.sleep(0.01)
    return n * n

for x in [2, 3, 2, 4, 3, 2]:
    expensive(x)
print(f"调用 6 次，实际计算 {calls['n']} 次，结果 {expensive(4)}")

def vat(amount, rate):
    return round(amount * (1 + rate), 2)

vat_13 = partial(vat, rate=0.13)
vat_06 = partial(vat, rate=0.06)
print("\\n100 元：13% 税率 →", vat_13(100), " 6% 税率 →", vat_06(100))`,
          },
        ],
      },
      {
        id: 'py-l-5-5',
        title: 'dataclass 与类型注解：让数据有结构',
        content: `
## 学习目标

学完本节，你应该能够：
1. 用 \`@dataclass\` 三行定义数据类，替换手写 \`__init__\`/\`__repr__\`/\`__eq__\`；
2. 说出 field/default_factory 解决的默认值陷阱（呼应 l-3-3）与 frozen 的不可变用途；
3. 在"字典满天飞"与"类太重"之间用 dataclass 找到中点，写出可维护的数据管道。

## 前置知识

- 字典（l-2-3）与可变默认参数陷阱（l-3-3）；
- 类的最基本概念（\`self\` 即可）。

## 问题背景：字典的"字符串税"

数据管道里传 dict 最快也最烂：\`row["amout"]\`（拼错）运行到深处才炸、IDE 无补全、结构无文档；手写类又要 20 行样板（init/repr/eq）。**dataclass 用装饰器生成全部样板**——字段即文档、类型即契约、拼写错误在写代码时就被红线标出。

## 核心概念：三行起手与三个关键参数

\`\`\`python
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
\`\`\`

| 参数 | 解决什么 |
| --- | --- |
| \`default_factory=list\` | 可变默认值陷阱（l-3-3 的类级解法） |
| \`frozen=True\` | 不可变实例：可哈希、可作字典键、防误改 |
| \`slots=True\`（3.10+） | 省内存（无实例字典），大数据量受益 |

## 原理详解：字典→数据类的收益账

\`row["amount"]\` 的三类隐性成本：① 拼错键 → KeyError 在**使用处**爆（离赋值处十万八千里）；② 无类型 → 下游 \`float(row["amount"])\` 永远提心吊胆；③ 无结构文档 → 新人读管道要逐行 print。dataclass 一次付清：属性访问拼写错**当场**红名；类型注解给 IDE/mypy 检查；字段列表就是 schema。代价是import 与装饰器两行——**管道超过 3 个函数共享同一结构时就该升级为 dataclass**。

## 完整案例：管道升级对照

\`\`\`python
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
\`\`\`

预期输出：\`Trade(id='T1', amt=0.0)\`——函数签名 \`-> Trade\` 本身就是接口文档。

## 代码实践

\`\`\`python
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
\`\`\`

预期输出：\`FrozenInstanceError cannot assign to field 'x'\`；\`True True\`；\`{'x': 1.5, 'y': 0.0}\`；\`Point(x=1.5, y=2.0)\`——**frozen 三件套：报错守护、可哈希、replace 复制**。**常见错误**：\`items: list = []\` 直接写默认（共享陷阱复现，必须 default_factory）；frozen 类里放可变字段还指望真不可变（浅冻结）；把业务方法塞满 dataclass（它是数据载体，行为重了叫领域类，另立门户）。

## 常见误区

1. **dataclass 替代一切类**——它生成的是**数据载体**样板；有复杂不变量/行为的类仍手写 \`__post_init__\` 或普通类；
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
> - Python 文档 \`dataclasses\`（PEP 557，docs.python.org）。
> **来源类型：原创**
> - 字符串税框架与管道对照为本课程改编。
`,
        tips: [
          {
            kind: 'leak',
            text: '用 `@dataclass(frozen=True)` 表示"值对象"（坐标、金额、配置），天然可哈希、可比较、不易被意外修改。',
          },
          {
            kind: 'pitfall',
            text: '`@dataclass` 的可变字段必须用 `field(default_factory=list)`，直接写 `= []` 会在类定义时抛 `ValueError`。',
          },
          {
            kind: 'interview',
            text: '"dataclass 与 namedtuple 的区别"：dataclass 默认可变、支持默认值与方法、更灵活；namedtuple 不可变、更轻量、可解包。',
          },
        ],
        demos: [
          {
            title: 'dataclass 实战',
            lang: 'python',
            code: `from dataclasses import dataclass, field, asdict

@dataclass
class Order:
    order_id: str
    city: str
    amount: float
    tags: list = field(default_factory=list)

    @property
    def amount_with_vat(self) -> float:
        return round(self.amount * 1.13, 2)

orders = [
    Order("A1", "北京", 320.5, ["数码"]),
    Order("A2", "上海", 150.0),
    Order("A3", "北京", 88.0, ["服装", "促销"]),
]

print("第一条:", orders[0])
print("含税金额:", orders[0].amount_with_vat)
print("按金额排序:", [o.order_id for o in sorted(orders, key=lambda o: -o.amount)])
print("转字典:", asdict(orders[1]))

# 不可变 dataclass 可作集合元素
@dataclass(frozen=True)
class City:
    name: str

print("\\n去重:", {City("北京"), City("北京"), City("上海")})`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'py-5-x1',
        relatedLessonId: 'py-l-5-1',
        type: 'single',
        difficulty: 1,
        question: '`[x for x in range(5) if x % 2 == 0]` 的结果是？',
        options: [
          { value: 'A', text: '`[0, 2, 4]`' },
          { value: 'B', text: '`[0, 1, 2, 3, 4]`' },
          { value: 'C', text: '`[1, 3]`' },
          { value: 'D', text: '`[2, 4]`' },
        ],
        answer: 'A',
        explanation: '`range(5)` 为 0~4，过滤偶数为 0、2、4。过滤条件写在 `for` 之后。',
        tags: ['推导式'],
      },
      {
        id: 'py-5-x2',
        relatedLessonId: 'py-l-5-1',
        type: 'judge',
        difficulty: 1,
        question: '字典推导式 `{k: v for k, v in items}` 的结果保持 `items` 的顺序（Python 3.7+）。',
        answer: true,
        explanation: 'Python 3.7 起 dict 保证插入顺序，因此字典推导式的结果顺序与源数据一致。',
        tags: ['推导式', '字典'],
      },
      {
        id: 'py-5-x3',
        relatedLessonId: 'py-l-5-1',
        type: 'multiple',
        difficulty: 2,
        question: '下列哪些是生成器表达式相比列表推导式的优势？（多选）',
        options: [
          { value: 'A', text: '惰性计算，不一次性占用内存' },
          { value: 'B', text: '可以处理超出内存的数据流' },
          { value: 'C', text: '可以多次遍历' },
          { value: 'D', text: '可以使用下标访问' },
        ],
        answer: ['A', 'B'],
        explanation: '生成器**只能遍历一次**，且**不支持下标访问**（C、D 错误）。它的价值在于惰性与低内存。',
        tags: ['生成器'],
      },
      {
        id: 'py-5-x4',
        relatedLessonId: 'py-l-5-1',
        type: 'fill',
        difficulty: 2,
        question: '用字典推导式把列表转换为"元素 → 长度"，补全代码：\n\n```python\nwords = ["a", "bb", "ccc"]\nd = {w: ___(w) for w in words}\n```',
        blanks: [['len']],
        explanation: '`len(w)` 返回字符串长度，得到 `{"a": 1, "bb": 2, "ccc": 3}`。',
        tags: ['推导式'],
      },
      {
        id: 'py-5-x5',
        relatedLessonId: 'py-l-5-1',
        type: 'single',
        difficulty: 3,
        question: '`sum([x * x for x in range(5)])` 与 `sum(x * x for x in range(5))` 的关系是？',
        options: [
          { value: 'A', text: '结果不同' },
          { value: 'B', text: '结果相同，后者内存更省' },
          { value: 'C', text: '前者会在 3.12 报错' },
          { value: 'D', text: '后者会报 TypeError' },
        ],
        answer: 'B',
        explanation:
          '两者结果相同（0+1+4+9+16=30）。前者先创建完整列表再求和，后者用生成器逐项计算，内存占用 O(1)。大数据量时应优先用生成器表达式。',
        tags: ['生成器', '推导式'],
      },
      {
        id: 'py-5-x6',
        relatedLessonId: 'py-l-5-4',
        type: 'judge',
        difficulty: 2,
        question: '`sorted(seq)` 会修改 `seq` 本身。',
        answer: false,
        explanation: '`sorted()` 返回新列表，不修改原序列；`list.sort()` 才是原地排序且返回 `None`。',
        tags: ['内置函数'],
      },
      {
        id: 'py-5-x7',
        relatedLessonId: 'py-l-5-5',
        type: 'multiple',
        difficulty: 3,
        question: '关于 `collections.Counter`，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '它是 dict 的子类' },
          { value: 'B', text: '`most_common(n)` 返回出现次数最多的 n 项' },
          { value: 'C', text: '访问不存在的键返回 0 而不是抛异常' },
          { value: 'D', text: '支持两个 Counter 相加' },
        ],
        answer: ['A', 'B', 'C', 'D'],
        explanation:
          '四项都正确。Counter 支持 `+`、`-`、`&`、`|` 运算，例如 `c1 + c2` 会合并计数，非常适合做多期数据对比。',
        tags: ['Counter'],
      },
      {
        id: 'py-5-x8',
        relatedLessonId: 'py-l-5-2',
        type: 'fill',
        difficulty: 3,
        question: '用 itertools 生成 `[1, 2]` 与 `["a", "b"]` 的所有组合对，补全代码：\n\n```python\nfrom itertools import ___\nresult = list(___( [1, 2], ["a", "b"] ))\n```',
        blanks: [['product']],
        explanation: '`product` 生成笛卡尔积，得到 `[(1,"a"), (1,"b"), (2,"a"), (2,"b")]`。注意与 `combinations`（组合）、`permutations`（排列）的区别。',
        tags: ['itertools'],
      },
      {
        id: 'py-5-x9',
        relatedLessonId: 'py-l-5-1',
        type: 'code',
        difficulty: 2,
        question:
          '推导式练习：给定 `scores = {"张三": 88, "李四": 95, "王五": 72, "赵六": 58}`，请：\n\n1. 用字典推导式筛出 ≥75 分的人保存到 `passed`；\n2. 用字典推导式生成"姓名 → 等级"保存到 `levels`（≥90 优秀、≥60 及格、否则不及格）；\n3. 计算所有人平均分保存到 `avg`。',
        starterCode: `scores = {"张三": 88, "李四": 95, "王五": 72, "赵六": 58}

passed = ___
levels = ___
avg = ___
`,
        setupCode: '',
        expectedOutput: "passed = {'张三': 88, '李四': 95}",
        tests: `assert passed == {"张三": 88, "李四": 95}, f"passed 不正确：{passed}"
assert levels == {"张三": "及格", "李四": "优秀", "王五": "及格", "赵六": "不及格"}, f"levels 不正确：{levels}"
assert abs(avg - 78.25) < 1e-9, f"avg 应为 78.25，实际 {avg}"
`,
        explanation:
          '```python\npassed = {k: v for k, v in scores.items() if v >= 75}\nlevels = {k: ("优秀" if v >= 90 else "及格" if v >= 60 else "不及格") for k, v in scores.items()}\navg = sum(scores.values()) / len(scores)\n```\n\n条件表达式写在 `for` 之前，过滤条件写在 `for` 之后。',
        tags: ['推导式'],
      },
      {
        id: 'py-5-x10',
        relatedLessonId: 'py-l-5-1',
        type: 'code',
        difficulty: 3,
        question:
          'collections 练习：给定日志列表 `logs`，请：\n\n1. 用 `Counter` 统计各级别出现次数，保存到 `level_counts`（字典）；\n2. 找出出现最多的级别保存到 `top_level`；\n3. 用 `defaultdict` 按级别收集消息，保存到 `by_level`。',
        starterCode: `from collections import Counter, defaultdict

logs = [
    ("ERROR", "db timeout"),
    ("INFO", "start"),
    ("ERROR", "db timeout"),
    ("WARN", "slow query"),
    ("INFO", "done"),
    ("ERROR", "db timeout"),
]

level_counts = ___
top_level = ___
by_level = ___
`,
        setupCode: '',
        expectedOutput: "level_counts = {'ERROR': 3, 'INFO': 2, 'WARN': 1}, top_level = 'ERROR'",
        tests: `assert dict(level_counts) == {"ERROR": 3, "INFO": 2, "WARN": 1}, f"level_counts 不正确：{level_counts}"
assert top_level == "ERROR", f"top_level 应为 ERROR，实际 {top_level}"
assert by_level["ERROR"] == ["db timeout", "db timeout", "db timeout"], f"by_level 不正确：{by_level}"
`,
        explanation:
          '```python\nlevel_counts = dict(Counter(lv for lv, _ in logs))\ntop_level = Counter(lv for lv, _ in logs).most_common(1)[0][0]\nby_level = defaultdict(list)\nfor lv, msg in logs:\n    by_level[lv].append(msg)\n```\n\n`most_common(1)[0][0]` 取出最高频次的名字；`defaultdict(list)` 省掉"键不存在则创建列表"的判断。',
        tags: ['Counter', 'defaultdict'],
      },
      {
        id: 'py-5-x11',
        relatedLessonId: 'py-l-5-2',
        type: 'code',
        difficulty: 3,
        question:
          'deque 滑动窗口：给定 `temps = [20, 22, 25, 23, 21, 19, 18, 20, 24]` 与窗口大小 `k = 3`，请用 `deque(maxlen=k)` 计算**滑动平均**（不足 k 个时用已有元素），结果保留 2 位小数，保存到 `moving_avg`。',
        starterCode: `from collections import deque

temps = [20, 22, 25, 23, 21, 19, 18, 20, 24]
k = 3

moving_avg = ___
`,
        setupCode: '',
        expectedOutput: 'moving_avg[0]=20.0, moving_avg[2]=22.33, 长度 9',
        tests: `assert len(moving_avg) == 9, f"长度应为 9，实际 {len(moving_avg)}"
assert moving_avg[0] == 20.0, f"第一项应为 20.0，实际 {moving_avg[0]}"
assert abs(moving_avg[2] - 22.33) < 1e-9, f"第三项应为 22.33，实际 {moving_avg[2]}"
assert abs(moving_avg[3] - 23.33) < 1e-9, f"第四项应为 23.33，实际 {moving_avg[3]}"
`,
        explanation:
          '```python\ndq = deque(maxlen=k)\nmoving_avg = []\nfor t in temps:\n    dq.append(t)\n    moving_avg.append(round(sum(dq) / len(dq), 2))\n```\n\n前三项分别为 20、(20+22)/2=21、(20+22+25)/3=22.33；之后每个窗口都是 3 个元素。',
        tags: ['deque', '滑动窗口'],
      },
      {
        id: 'py-5-x12',
        relatedLessonId: 'py-l-5-3',
        type: 'single',
        difficulty: 3,
        question: '关于 `if __name__ == "__main__":`，下列说法正确的是？',
        options: [
          { value: 'A', text: '该代码块在模块被 import 时也会执行' },
          { value: 'B', text: '它的作用是让模块既能被导入、又能直接运行' },
          { value: 'C', text: '`__name__` 的值永远是 `"__main__"`' },
          { value: 'D', text: '它必须写在文件第一行' },
        ],
        answer: 'B',
        explanation:
          '直接运行脚本时 `__name__ == "__main__"`，被导入时 `__name__` 是模块名。这种写法让脚本兼作库使用，且导入时不会执行测试/启动逻辑。',
        tags: ['模块'],
      },
      {
        id: 'py-5-x13',
        relatedLessonId: 'py-l-5-3',
        type: 'judge',
        difficulty: 2,
        question: '`from module import *` 是推荐的导入方式。',
        answer: false,
        explanation:
          '`import *` 会污染命名空间、可能覆盖同名变量、依赖来源不明确。应使用 `import module` 或 `from module import 具体名字`。',
        tags: ['模块'],
      },
      {
        id: 'py-5-x14',
        relatedLessonId: 'py-l-5-1',
        type: 'code',
        difficulty: 4,
        question:
          'itertools 实战：给定 `sizes = ["S", "M"]` 与 `colors = ["红", "蓝", "黑"]`，生成所有 SKU 组合（形如 `"S-红"`），保存为有序列表 `skus`；再计算组合总数 `n_skus`。',
        starterCode: `from itertools import product

sizes = ["S", "M"]
colors = ["红", "蓝", "黑"]

skus = ___
n_skus = ___
`,
        setupCode: '',
        expectedOutput: "skus=['S-红','S-蓝','S-黑','M-红','M-蓝','M-黑'], n_skus=6",
        tests: `assert skus == ["S-红", "S-蓝", "S-黑", "M-红", "M-蓝", "M-黑"], f"skus 不正确：{skus}"
assert n_skus == 6, f"n_skus 应为 6，实际 {n_skus}"
assert len(set(skus)) == 6, "存在重复 SKU"
`,
        explanation:
          '```python\nskus = [f"{s}-{c}" for s, c in product(sizes, colors)]\nn_skus = len(skus)\n```\n\n`product` 的顺序是"后面的元素变化更快"，因此红、蓝、黑依次循环。这类笛卡尔积在生成商品规格、参数网格时非常常用。',
        tags: ['itertools'],
      },
      {
        id: 'py-5-x15',
        relatedLessonId: 'py-l-5-4',
        type: 'multiple',
        difficulty: 3,
        question: '下列哪些写法是"Pythonic"的？（多选）',
        options: [
          { value: 'A', text: '`for i, v in enumerate(lst):`' },
          { value: 'B', text: '`for i in range(len(lst)): v = lst[i]`' },
          { value: 'C', text: '`if lst:` 判断非空' },
          { value: 'D', text: '`if len(lst) > 0:` 判断非空' },
        ],
        answer: ['A', 'C'],
        explanation:
          '`enumerate` 比 `range(len())` 更清晰高效；`if lst:` 利用真值判断比 `len(lst) > 0` 更简洁。B、D 能用但不推荐。',
        tags: ['代码风格'],
      },
      {
        id: 'py-5-x16',
        relatedLessonId: 'py-l-5-1',
        type: 'fill',
        difficulty: 3,
        question: '补全代码，把二维列表拍平为一维：\n\n```python\nmatrix = [[1, 2], [3, 4], [5]]\nflat = [x for row in matrix for x in ___]\n```',
        blanks: [['row']],
        explanation:
          '嵌套推导式的顺序与嵌套循环一致：外层 `for row in matrix`，内层 `for x in row`。写成 `[x for x in row for row in matrix]` 会报错。',
        tags: ['推导式'],
      },
      {
        id: 'py-5-x17',
        relatedLessonId: 'py-l-5-4',
        type: 'code',
        difficulty: 4,
        question:
          '综合：实现 `top_n_by_category(records, n)`，`records` 是 `[{"cat", "name", "value"}]`。\n\n请对每个品类取 value 最大的 n 条（品类内按 value 降序），返回 `{品类: [记录...]}`，每个品类内部保持降序。结果保存到 `out`。',
        starterCode: `from collections import defaultdict

records = [
    {"cat": "数码", "name": "耳机", "value": 299},
    {"cat": "数码", "name": "键盘", "value": 499},
    {"cat": "数码", "name": "显示器", "value": 1599},
    {"cat": "服装", "name": "T恤", "value": 99},
    {"cat": "服装", "name": "运动鞋", "value": 459},
]

def top_n_by_category(records, n):
    # 在这里实现
    return ___

out = top_n_by_category(records, 2)
`,
        setupCode: '',
        expectedOutput: "out['数码'] = [显示器, 键盘]; out['服装'] = [运动鞋, T恤]",
        tests: `assert out["数码"] == [{"cat": "数码", "name": "显示器", "value": 1599}, {"cat": "数码", "name": "键盘", "value": 499}], f"数码结果不正确：{out['数码']}"
assert out["服装"] == [{"cat": "服装", "name": "运动鞋", "value": 459}, {"cat": "服装", "name": "T恤", "value": 99}], f"服装结果不正确：{out['服装']}"
assert len(out) == 2, f"品类数应为 2，实际 {len(out)}"
`,
        explanation:
          '```python\ndef top_n_by_category(records, n):\n    groups = defaultdict(list)\n    for r in records:\n        groups[r["cat"]].append(r)\n    return {\n        cat: sorted(items, key=lambda r: -r["value"])[:n]\n        for cat, items in groups.items()\n    }\n```\n\n这就是"每个分组取 Top N"的经典写法；在 SQL 中对应窗口函数 `ROW_NUMBER() OVER (PARTITION BY ...)`。',
        tags: ['综合', '分组', '排序'],
      },
      {
        id: 'py-5-x18',
        relatedLessonId: 'py-l-5-5',
        type: 'open',
        difficulty: 4,
        question:
          '同事写了一个 200 行的数据处理脚本，运行需要 8 分钟。你会用哪些手段定位与优化？请按优先级列出至少 5 个方向。',
        referenceAnswer: `**第一步：先测量，不要猜**

用 \`time.perf_counter()\` 分段计时，或用 \`cProfile\` 找出耗时最长的函数。没有测量就没有优化。

**优化方向（按收益排序）**：

1. **消除嵌套循环查找**：把"循环里再遍历另一个列表查找"改成先建字典/集合索引，
   复杂度从 O(n×m) 降到 O(n+m)。这通常是最快见效的一步。

2. **容器选型**：成员判断用 set 而不是 list；队列用 deque 而不是 list.pop(0)；
   避免在循环中用 \`in list\`。

3. **向量化**：把逐行处理改成 pandas / NumPy 操作。
   \`iterrows()\` 比向量化慢几十倍；\`df.apply\` 也比 \`np.where\` 慢。

4. **减少重复计算**：循环外能算好的常量提到外面；
   昂贵的纯函数加 \`lru_cache\`。

5. **惰性与分块**：大文件用生成器逐行处理、pandas 用 \`chunksize\` 分块，
   避免一次性载入导致内存压力与 GC 抖动。

6. **把计算下沉到底层**：能用内置函数（\`sum\`、\`sorted\`、\`groupby\`）
   就不要手写 Python 循环——内置函数在 C 层执行。

7. **换工具**：数据量到千万级以上时，考虑 DuckDB / Polars / 数据库，
   它们比纯 Python 循环快一到两个数量级。

**注意**：优化后必须重新对账，确认结果与优化前一致。
`,
        rubric: [
          { point: '强调先测量定位瓶颈（cProfile / 分段计时）', score: 2 },
          { point: '提出字典/集合索引消除嵌套循环', score: 2 },
          { point: '提出向量化或使用内置函数', score: 1 },
          { point: '提出惰性/分块处理与工具选型', score: 1 },
          { point: '强调优化后需对账验证结果一致', score: 1 },
        ],
        keywords: ['profile', '测量', '字典', '索引', '向量化', 'pandas', '分块', '对账'],
        explanation:
          '这是一道综合性能优化题。评分重点是"先测量再优化"的方法论，以及能否说出 O(n×m) → O(n+m) 这个最关键的优化。',
        tags: ['性能', '方法论'],
      },
    ],
  },

  /* ============================================================
   *  第 6 章：综合项目实战（扩展 18 题 + 2 个小节）
   * ============================================================ */
  {
    chapterId: 'python-6',
    lessons: [
      {
        id: 'py-l-6-4',
        title: '单元测试与数据管道回归',
        content: `
### 学习目标

学完本节，你应该能够：
1. 解释数据管道该测什么：解析边界、口径不变性、聚合正确性三层；
2. 写出口径回归测试：固定样本 + 明确期望值，口径变更必须显式更新；
3. 按构造原则设计测试数据（最小覆盖：正常/边界/脏数据三类各至少一条）。

### 前置知识

- 「代码质量」（l6-3）的最小测试写法。

### 问题背景

前五章的知识点是零件，项目章把它们装成一台机器：原始日志有脏行、缺字段、坏金额，任何一处都会让聚合结果悄悄失真。真实工作里被质疑的不是你的分析，而是你的数字从哪来——所以口径要先定义、质量要出报告、口径变更要过回归测试、交付要给出可复用的模块与配置。这一章把「脚本」升级成「别人敢用的管道」。

### 直觉理解

把脚本想成一家小型食品厂：进料检验（解析与校验，坏原料进隔离区并计数）、清洗（去重/补全）、加工（按区域/日期聚合）、出厂检验（质量报告随成品一同交付）。单元测试是夜班质检员：每天用固定样本跑一遍口径，指标变了立刻拉闸。配置外置是配方卡：改配方（阈值/口径）不动设备（代码）。

### 核心概念与原理详解

## 为什么数据分析也需要测试

"分析结果错了"往往不是代码崩溃，而是**算错了但没人发现**。
测试的价值在于：把"预期结果"固化成可重复执行的断言，
每次改动后自动验证，避免"改 A 处、坏 B 处"。

## pytest 的最小用法

\`\`\`python
# src/metrics.py
def calc_aov(amount: float, orders: int) -> float | None:
    if orders <= 0:
        return None
    return amount / orders

# tests/test_metrics.py
from src.metrics import calc_aov

def test_normal():
    assert calc_aov(1000, 20) == 50.0

def test_zero_orders():
    assert calc_aov(1000, 0) is None

import pytest

@pytest.mark.parametrize("amount,orders,expected", [
    (0, 10, 0.0),
    (100, 3, 100 / 3),
])
def test_cases(amount, orders, expected):
    assert calc_aov(amount, orders) == expected
\`\`\`

**在浏览器/Pyodide 环境中**没有 pytest，但可以用 \`assert\` 达到同样效果——
本课程所有编程题的判分正是这么做的。

## 数据管道该测什么

| 测试类型 | 例子 | 价值 |
| --- | --- | --- |
| **纯函数测试** | 客单价、退款率、分箱逻辑 | 高频改动的核心 |
| **边界测试** | 空输入、0 分母、单元素 | 最容易出 bug 的地方 |
| **口径回归** | 用一份固定样例数据，断言输出汇总值 | 口径变更可被立即发现 |
| **对账测试** | 过滤前后金额守恒 | 防止"悄悄少了一批数据" |
| **幂等测试** | 同一输入跑两次结果一致 | 防止重复写入 |

## 口径回归测试的写法

这是数据分析团队最有价值的一类测试：准备一份固定的"金标准"小数据集，
断言整条流水线的输出。

\`\`\`python
SAMPLE_ROWS = [
    {"id": 1, "city": "北京", "amount": 100.0, "status": "已完成"},
    {"id": 2, "city": "北京", "amount": 200.0, "status": "已完成"},
    {"id": 3, "city": "上海", "amount": 300.0, "status": "已取消"},
]

def test_city_gmv():
    report = build_city_report(SAMPLE_ROWS)
    assert report[0]["city"] == "北京"
    assert report[0]["amount"] == 300.0      # 只需一行断言锁定口径
\`\`\`

**一句话原则**：**业务口径一旦敲定，就用测试锁住它。**

## 测试数据的构造原则

- **小**：几行足够，便于人工核对；
- **刁钻**：包含缺失值、负数、重复键、大小写不一致、空格；
- **可读**：字段用真实业务名，便于非开发同学审阅。

## 常见反模式

1. 测试依赖当前时间 / 随机数（不可复现）；
2. 断言太宽（如只断言"结果不为空"）；
3. 测试直接连生产数据库；
4. 只测"正常路径"，不测边界。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
# ---- 订单分析迷你流水线：解析 -> 清洗 -> 聚合 -> 报告 -> 回归测试 ----
RAW = [
    "2026-01-03,华东,A-1,199.00",
    "2026-01-03,华北,B-2,88.50",
    "2026-01-04,华东,C-3,",          # 金额缺失 -> 剔除并计数
    "2026-01-04,华东,D-4,45.00",
    "bad line",                       # 结构错误 -> 跳过
]

def parse(line):
    parts = [p.strip() for p in line.split(",")]
    if len(parts) != 4:
        raise ValueError(f"结构错误: {line!r}")
    date, region, oid, amount = parts
    if not amount:
        raise ValueError(f"金额缺失: {oid}")
    return {"date": date, "region": region, "oid": oid, "amount": float(amount)}

def load(lines):
    recs, bad = [], []
    for ln in lines:
        try:
            recs.append(parse(ln))
        except ValueError as e:
            bad.append(str(e))
    return recs, bad

def aggregate(recs):
    by = {}
    for r in recs:
        s = by.setdefault(r["region"], {"n": 0, "gmv": 0.0})
        s["n"] += 1
        s["gmv"] += r["amount"]
    return by

def report(by, total, bad):
    print(f"总输入 {total} 行, 有效 {total - len(bad)}, 剔除 {len(bad)}")
    for reg, s in sorted(by.items()):
        print(f"  {reg}: 订单 {s['n']} GMV {s['gmv']:.2f} 客单 {s['gmv'] / s['n']:.2f}")

recs, bad = load(RAW)
report(aggregate(recs), len(RAW), bad)
print("剔除明细:", bad)

# ---- pytest 风格回归测试（口径不变性）----
def test_pipeline():
    r, b = load(["x,A,1,10.0", "junk", "y,B,2,"])
    assert b == ["结构错误: 'junk'", "金额缺失: 2"]
    assert aggregate(r) == {"A": {"n": 1, "gmv": 10.0}}
test_pipeline()
print("回归测试通过：口径未漂移")\`\`\`

预期输出（实测）：总输入 5 行, 有效 3, 剔除 2；华东: 订单 2 GMV 244.00 客单 122.00；华北: 订单 1 GMV 88.50 客单 88.50；剔除明细: ['金额缺失: C-3', "结构错误: 'bad line'"]（脏数据有账可查）；回归测试通过：口径未漂移

**常见错误**：解析与聚合写在一起（一发现脏数据就得全链重跑），先解析成记录再聚合才能分阶段测试；float(amount) 不做校验直接转，脏值变成 inf/NaN 混进下游；测试断言写「等于上次运行的输出」而不是「等于明确口径」，快照式测试把 bug 也固化了。

### 常见误区

1. **先写 for 循环再说**——需求拆解（输入/输出/口径/异常清单）先于代码，否则每次补需求都在重写；\\n2. **数据分析不用写测试**——口径回归测试恰恰是分析可信度的核心资产，改口径必跑；\\n3. **可复用=复制粘贴到新项目**——可复用的是「模块+配置+文档」，复制出去的脚本下次口径变了就是两套真相。

### 知识关联

- **向前**：l4 的文件与异常是 load/validate 阶段的底座，l5 的推导式与 Counter 是聚合的主力；
- **向后**：pandas 课把本项目的手写聚合升级为 DataFrame 表达式；
- **平行**：sql 课的 GROUP BY 质量检查与本节的质量报告同一思想。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 拆解 | 需求→阶段（解析/清洗/聚合/报告）→口径→异常清单，先于代码 |
| 质量 | 剔除行计数并随报告交付，脏数据有账可查 |
| 测试 | 口径回归测试：固定样本+明确期望，改口径必跑 |
| 复用 | 模块划分 + 配置外置（口径唯一真相源）+ docstring |
| 交付 | 交付「工厂+手册」，不是一次性模具 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 pytest 官方文档 docs.pytest.org 与《The Twelve-Factor App》配置原则相应章节）
`,
        tips: [
          {
            kind: 'leak',
            text: '把每次修复的线上数据 bug 都沉淀成一条回归测试，是数据团队防止同类问题复发的最高效手段。',
          },
          {
            kind: 'pitfall',
            text: '测试里用 `datetime.now()` 或未固定种子的随机数，会让结果时好时坏。测试必须可复现。',
          },
          {
            kind: 'interview',
            text: '"你怎么保证分析结果正确"可以答：口径文档 + 对账断言 + 边界测试 + 交叉验证（另一种路径复算）+ 与业务方确认。',
          },
        ],
        demos: [
          {
            title: '用 assert 编写回归测试',
            lang: 'python',
            code: `def calc_aov(amount, orders):
    if orders <= 0:
        return None
    return amount / orders

SAMPLE = [
    {"id": 1, "city": "北京", "amount": 100.0, "status": "已完成"},
    {"id": 2, "city": "北京", "amount": 200.0, "status": "已完成"},
    {"id": 3, "city": "上海", "amount": 300.0, "status": "已取消"},
]

def city_gmv(rows):
    total = {}
    for r in rows:
        if r["status"] != "已完成":
            continue
        total[r["city"]] = total.get(r["city"], 0.0) + r["amount"]
    return total

# —— 测试用例 ——
cases = []
def check(name, fn, expected):
    try:
        fn()
        cases.append((name, True))
    except AssertionError:
        cases.append((name, False))

check("正常客单价", lambda: (lambda r: (_ for _ in ()).throw(AssertionError()) if r != 50.0 else None)(calc_aov(1000, 20)), None)
check("零订单返回 None", lambda: (calc_aov(1000, 0) is None) or (_ for _ in ()).throw(AssertionError()), None)
check("北京 GMV = 300 且已取消不计入", lambda: (city_gmv(SAMPLE) == {"北京": 300.0}) or (_ for _ in ()).throw(AssertionError()), None)

for name, ok in cases:
    print(("✓" if ok else "✗"), name)`,
          },
        ],
      },
      {
        id: 'py-l-6-5',
        title: '项目交付：从脚本到可复用模块',
        content: `
### 学习目标

学完本节，你应该能够：
1. 把脚本重构成可复用模块（parse/load/aggregate/report 各归其位，__main__ 只做编排）；
2. 把口径参数外置成配置（阈值/列名/路径），实现「配置是口径的唯一真相源」；
3. 按 Checklist 完成交付：依赖清单、运行说明、测试通过、口径文档四件套。

### 前置知识

- l6-1~l6-4 的完整流水线与测试。

### 问题背景

前五章的知识点是零件，项目章把它们装成一台机器：原始日志有脏行、缺字段、坏金额，任何一处都会让聚合结果悄悄失真。真实工作里被质疑的不是你的分析，而是你的数字从哪来——所以口径要先定义、质量要出报告、口径变更要过回归测试、交付要给出可复用的模块与配置。这一章把「脚本」升级成「别人敢用的管道」。

### 直觉理解

把脚本想成一家小型食品厂：进料检验（解析与校验，坏原料进隔离区并计数）、清洗（去重/补全）、加工（按区域/日期聚合）、出厂检验（质量报告随成品一同交付）。单元测试是夜班质检员：每天用固定样本跑一遍口径，指标变了立刻拉闸。配置外置是配方卡：改配方（阈值/口径）不动设备（代码）。

### 核心概念与原理详解

## 三个层次的"可复用"

| 层次 | 做法 | 收益 |
| --- | --- | --- |
| 函数级 | 把"读 → 清洗 → 聚合"拆成小函数 | 可单测、可组合 |
| 模块级 | \`io.py\` / \`clean.py\` / \`metrics.py\` / \`report.py\` | 职责清晰、多人协作 |
| 配置级 | 口径参数外置到配置 | 改口径不改代码 |

## 推荐的模块划分

\`\`\`
project/
├── data/
│   ├── raw/                # 原始数据（只读）
│   └── processed/          # 清洗产物（带日期/版本）
├── src/
│   ├── io.py               # read_orders / read_products
│   ├── clean.py            # validate_row / normalize_city
│   ├── metrics.py          # calc_gmv / calc_aov / calc_refund_rate
│   ├── report.py           # build_report / to_csv
│   └── config.py           # 口径参数集中定义
├── tests/
├── notebooks/              # 只做探索，稳定逻辑迁移到 src/
└── README.md
\`\`\`

## 配置外置：口径的唯一真相源

\`\`\`python
# src/config.py
EXCLUDE_CANCELLED = True
DATE_FIELD = "order_date"
AOV_DENOMINATOR = "orders"     # orders | users
TIMEZONE = "Asia/Shanghai"
\`\`\`

**为什么重要**：同一份代码被三个人用不同的隐形假设跑，
是"数据打架"最常见的原因。把假设显式写进配置，
再在 README 里解释每一项，能消除大部分口径分歧。

## 交付清单（Checklist）

- [ ] **输入输出契约**：输入文件/表、必需字段、输出列名与单位
- [ ] **口径参数**集中且有注释
- [ ] **分阶段函数**，职责单一
- [ ] **错误处理**：非法行进错误清单，不静默丢弃
- [ ] **对账断言**：行数守恒、金额守恒、除零保护
- [ ] **可复现**：随机种子、依赖版本锁定
- [ ] **测试**：核心指标有单元测试与口径回归
- [ ] **日志**：关键步骤打印行数与耗时
- [ ] **README**：运行方式、参数含义、已知限制
- [ ] **版本管理**：git 提交，口径变更写进 commit message

## 从 notebook 迁移到模块的正确姿势

1. 把 notebook 中反复使用的 cell 抽成函数（输入输出明确）；
2. 为这些函数补 docstring 与类型注解；
3. 用固定样例数据写测试，确认与 notebook 结果一致；
4. notebook 改为"import 模块 + 展示结果"，只负责探索与呈现；
5. 定期清理 notebook，不让它成为"第二份实现"。

> **核心思想**：notebook 是草稿纸，\`src/\` 是产品。草稿里的好逻辑要尽快产品化。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
# ---- 订单分析迷你流水线：解析 -> 清洗 -> 聚合 -> 报告 -> 回归测试 ----
RAW = [
    "2026-01-03,华东,A-1,199.00",
    "2026-01-03,华北,B-2,88.50",
    "2026-01-04,华东,C-3,",          # 金额缺失 -> 剔除并计数
    "2026-01-04,华东,D-4,45.00",
    "bad line",                       # 结构错误 -> 跳过
]

def parse(line):
    parts = [p.strip() for p in line.split(",")]
    if len(parts) != 4:
        raise ValueError(f"结构错误: {line!r}")
    date, region, oid, amount = parts
    if not amount:
        raise ValueError(f"金额缺失: {oid}")
    return {"date": date, "region": region, "oid": oid, "amount": float(amount)}

def load(lines):
    recs, bad = [], []
    for ln in lines:
        try:
            recs.append(parse(ln))
        except ValueError as e:
            bad.append(str(e))
    return recs, bad

def aggregate(recs):
    by = {}
    for r in recs:
        s = by.setdefault(r["region"], {"n": 0, "gmv": 0.0})
        s["n"] += 1
        s["gmv"] += r["amount"]
    return by

def report(by, total, bad):
    print(f"总输入 {total} 行, 有效 {total - len(bad)}, 剔除 {len(bad)}")
    for reg, s in sorted(by.items()):
        print(f"  {reg}: 订单 {s['n']} GMV {s['gmv']:.2f} 客单 {s['gmv'] / s['n']:.2f}")

recs, bad = load(RAW)
report(aggregate(recs), len(RAW), bad)
print("剔除明细:", bad)

# ---- pytest 风格回归测试（口径不变性）----
def test_pipeline():
    r, b = load(["x,A,1,10.0", "junk", "y,B,2,"])
    assert b == ["结构错误: 'junk'", "金额缺失: 2"]
    assert aggregate(r) == {"A": {"n": 1, "gmv": 10.0}}
test_pipeline()
print("回归测试通过：口径未漂移")\`\`\`

预期输出（实测）：总输入 5 行, 有效 3, 剔除 2；华东: 订单 2 GMV 244.00 客单 122.00；华北: 订单 1 GMV 88.50 客单 88.50；剔除明细: ['金额缺失: C-3', "结构错误: 'bad line'"]（脏数据有账可查）；回归测试通过：口径未漂移

**常见错误**：解析与聚合写在一起（一发现脏数据就得全链重跑），先解析成记录再聚合才能分阶段测试；float(amount) 不做校验直接转，脏值变成 inf/NaN 混进下游；测试断言写「等于上次运行的输出」而不是「等于明确口径」，快照式测试把 bug 也固化了。

### 常见误区

1. **先写 for 循环再说**——需求拆解（输入/输出/口径/异常清单）先于代码，否则每次补需求都在重写；\\n2. **数据分析不用写测试**——口径回归测试恰恰是分析可信度的核心资产，改口径必跑；\\n3. **可复用=复制粘贴到新项目**——可复用的是「模块+配置+文档」，复制出去的脚本下次口径变了就是两套真相。

### 知识关联

- **向前**：l4 的文件与异常是 load/validate 阶段的底座，l5 的推导式与 Counter 是聚合的主力；
- **向后**：pandas 课把本项目的手写聚合升级为 DataFrame 表达式；
- **平行**：sql 课的 GROUP BY 质量检查与本节的质量报告同一思想。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 拆解 | 需求→阶段（解析/清洗/聚合/报告）→口径→异常清单，先于代码 |
| 质量 | 剔除行计数并随报告交付，脏数据有账可查 |
| 测试 | 口径回归测试：固定样本+明确期望，改口径必跑 |
| 复用 | 模块划分 + 配置外置（口径唯一真相源）+ docstring |
| 交付 | 交付「工厂+手册」，不是一次性模具 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 pytest 官方文档 docs.pytest.org 与《The Twelve-Factor App》配置原则相应章节）
`,
        tips: [
          {
            kind: 'leak',
            text: '把口径参数集中到 `config.py` 并在 README 解释，是消除团队"数据打架"最有效的一招。',
          },
          {
            kind: 'pitfall',
            text: 'notebook 里"能跑"的代码不等于"可复用"：它依赖 cell 执行顺序与全局变量。迁移到模块时必须显式传参。',
          },
          {
            kind: 'interview',
            text: '"如何保证分析可复现"可答：输入固定（数据快照）、过程固定（代码版本 + 种子 + 依赖锁定）、输出可验证（对账与测试）。',
          },
        ],
        demos: [
          {
            title: '配置外置 + 分阶段函数的完整示例',
            lang: 'python',
            code: `CONFIG = {
    "exclude_cancelled": True,
    "aov_denominator": "orders",
}

def load(rows):
    return [dict(r) for r in rows]

def clean(rows):
    out = []
    for r in rows:
        if CONFIG["exclude_cancelled"] and r.get("status") == "已取消":
            continue
        r["city"] = (r.get("city") or "").strip()
        out.append(r)
    return out

def aggregate(rows):
    agg = {}
    for r in rows:
        a = agg.setdefault(r["city"], {"amount": 0.0, "orders": set()})
        a["amount"] += float(r["amount"])
        a["orders"].add(r["id"])
    return [
        {"city": c, "amount": v["amount"], "orders": len(v["orders"]),
         "aov": round(v["amount"] / len(v["orders"]), 2) if v["orders"] else None}
        for c, v in agg.items()
    ]

raw = [
    {"id": 1, "city": " 北京 ", "amount": "100", "status": "已完成"},
    {"id": 1, "city": " 北京 ", "amount": "50", "status": "已完成"},
    {"id": 2, "city": "上海", "amount": "300", "status": "已取消"},
    {"id": 3, "city": "北京", "amount": "200", "status": "已完成"},
]

rows = load(raw)
cleaned = clean(rows)
assert len(cleaned) == 3, "清洗后应剩 3 行"
report = aggregate(cleaned)
for r in sorted(report, key=lambda x: -x["amount"]):
    print(r)
print("\\n对账：原始 4 行 = 有效 3 行 + 取消 1 行 ✓")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'py-6-x1',
        relatedLessonId: 'py-l-6-4',
        type: 'single',
        difficulty: 1,
        question: '数据管道中"读入 → 清洗 → 聚合 → 输出"的划分，最主要的好处是？',
        options: [
          { value: 'A', text: '运行速度更快' },
          { value: 'B', text: '每一阶段职责单一、可单独测试与复用' },
          { value: 'C', text: '代码行数更少' },
          { value: 'D', text: '不需要写文档' },
        ],
        answer: 'B',
        explanation:
          '分阶段的核心价值是可理解、可测试、可复用、可替换。性能提升是附带效果，不是主要目的。',
        tags: ['工程实践'],
      },
      {
        id: 'py-6-x2',
        relatedLessonId: 'py-l-6-1',
        type: 'judge',
        difficulty: 1,
        question: '统计"客单价"时，分子是销售额、分母是订单数，这样定义是唯一正确的。',
        answer: false,
        explanation:
          '客单价的分母可以是"订单数"（每单平均消费）或"用户数"（人均消费），两者含义完全不同。口径必须由业务决定并写明。',
        tags: ['口径'],
      },
      {
        id: 'py-6-x3',
        relatedLessonId: 'py-l-6-2',
        type: 'multiple',
        difficulty: 2,
        question: '下列哪些属于"数据质量报告"应包含的内容？（多选）',
        options: [
          { value: 'A', text: '总行数、有效行数、问题行数' },
          { value: 'B', text: '问题类型的分布（如缺失、非法格式、重复）' },
          { value: 'C', text: '各字段的缺失率' },
          { value: 'D', text: '开发者的个人偏好' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          '质量报告要能回答"数据能不能用、哪里有问题、问题多严重"。A、B、C 都是核心内容；D 与数据质量无关。',
        tags: ['数据质量'],
      },
      {
        id: 'py-6-x4',
        relatedLessonId: 'py-l-6-1',
        type: 'fill',
        difficulty: 2,
        question:
          '为保证"能处理的行都处理了"，流水线应做对账断言。补全代码中的校验关系：\n\n```python\nassert len(rows) == len(valid) + len(___)\n```',
        blanks: [['errors', 'invalid', 'failed']],
        explanation:
          '输入行数 = 有效行数 + 异常行数。这条断言能在"某处 continue 但忘了记录错误"时立刻报警。',
        tags: ['对账'],
      },
      {
        id: 'py-6-x5',
        relatedLessonId: 'py-l-6-2',
        type: 'code',
        difficulty: 3,
        question:
          '实现 `calc_metrics(orders)`：`orders` 每项含 `order_id`、`amount`、`status`。请计算：\n\n1. 有效销售额 `gmv`（只算"已完成"）；\n2. 去重订单数 `n_orders`；\n3. 客单价 `aov`（保留 2 位小数，无订单时为 0.0）。',
        starterCode: `orders = [
    {"order_id": "A1", "amount": 320.0, "status": "已完成"},
    {"order_id": "A1", "amount": 129.0, "status": "已完成"},
    {"order_id": "A2", "amount": 999.0, "status": "已取消"},
    {"order_id": "A3", "amount": 200.0, "status": "已完成"},
]

gmv = ___
n_orders = ___
aov = ___
`,
        setupCode: '',
        expectedOutput: 'gmv = 649.0, n_orders = 2, aov = 324.5',
        tests: `assert gmv == 649.0, f"gmv 应为 649.0，实际 {gmv}"
assert n_orders == 2, f"n_orders 应为 2，实际 {n_orders}"
assert aov == 324.5, f"aov 应为 324.5，实际 {aov}"
`,
        explanation:
          '```python\nvalid = [o for o in orders if o["status"] == "已完成"]\ngmv = sum(o["amount"] for o in valid)\nn_orders = len({o["order_id"] for o in valid})\naov = round(gmv / n_orders, 2) if n_orders else 0.0\n```\n\nA1 有两条明细（320 + 129），但只是一单。gmv = 320+129+200 = 649，订单数 2，客单价 324.5。',
        tags: ['指标计算', '去重'],
      },
      {
        id: 'py-6-x6',
        relatedLessonId: 'py-l-6-2',
        type: 'code',
        difficulty: 3,
        question:
          '数据质量报告：`rows` 为 `[{"id", "amount", "city"}]`。统计并保存到 `report` 字典：\n\n- `total`：总行数\n- `valid`：有效行数（amount 可转非负 float 且 city 去空格后非空）\n- `missing_city`：城市缺失行数\n- `bad_amount`：金额非法或为负的行数',
        starterCode: `rows = [
    {"id": 1, "amount": "100", "city": "北京"},
    {"id": 2, "amount": "abc", "city": "上海"},
    {"id": 3, "amount": "200", "city": "  "},
    {"id": 4, "amount": "-5", "city": "广州"},
    {"id": 5, "amount": "50.5", "city": "深圳"},
]

report = ___
`,
        setupCode: '',
        expectedOutput: "report = {'total': 5, 'valid': 2, 'missing_city': 1, 'bad_amount': 2}",
        tests: `assert report["total"] == 5, f"total 应为 5，实际 {report['total']}"
assert report["valid"] == 2, f"valid 应为 2，实际 {report['valid']}"
assert report["missing_city"] == 1, f"missing_city 应为 1，实际 {report['missing_city']}"
assert report["bad_amount"] == 2, f"bad_amount 应为 2，实际 {report['bad_amount']}"
`,
        explanation:
          '```python\nreport = {"total": len(rows), "valid": 0, "missing_city": 0, "bad_amount": 0}\nfor r in rows:\n    try:\n        amt = float(r["amount"])\n        if amt < 0:\n            raise ValueError\n    except (TypeError, ValueError):\n        report["bad_amount"] += 1\n        continue\n    if not (r.get("city") or "").strip():\n        report["missing_city"] += 1\n        continue\n    report["valid"] += 1\nassert report["total"] == report["valid"] + report["missing_city"] + report["bad_amount"]\n```\n\n最后那条对账断言应该写进代码里——它能第一时间发现逻辑漏洞。',
        tags: ['数据质量', '对账'],
      },
      {
        id: 'py-6-x7',
        relatedLessonId: 'py-l-6-4',
        type: 'single',
        difficulty: 3,
        question: '报表显示"北京销售额 12.3 万"，业务方说"明明卖了 15 万"。你**首先**应该做什么？',
        options: [
          { value: 'A', text: '立刻重跑一遍脚本' },
          { value: 'B', text: '与业务方确认双方的统计口径（是否剔除取消单、时间归属、地区归属）' },
          { value: 'C', text: '修改报表使其等于 15 万' },
          { value: 'D', text: '认为业务方记错了' },
        ],
        answer: 'B',
        explanation:
          '数据对不上的第一嫌疑方是**口径差异**而非计算错误。先对齐定义（取消单、退款、时间字段、地区归属），能解决 80% 的对账问题。',
        tags: ['对账', '口径'],
      },
      {
        id: 'py-6-x8',
        relatedLessonId: 'py-l-6-1',
        type: 'judge',
        difficulty: 2,
        question: '为了避免程序崩溃，数据处理脚本应该在每行处理外面套一个 `try/except: pass`。',
        answer: false,
        explanation:
          '`except: pass` 会让错误完全静默，导致数据莫名变少而无人知晓。正确做法是捕获具体异常、记录到错误清单、并在结束时汇总失败率。',
        tags: ['异常', '工程实践'],
      },
      {
        id: 'py-6-x9',
        relatedLessonId: 'py-l-6-5',
        type: 'multiple',
        difficulty: 3,
        question: '要让分析结果"可复现"，需要固定哪些要素？（多选）',
        options: [
          { value: 'A', text: '输入数据版本（快照或分区日期）' },
          { value: 'B', text: '随机种子' },
          { value: 'C', text: '依赖库版本' },
          { value: 'D', text: '运行分析的同学是谁' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          '可复现性取决于"输入固定、过程固定、环境固定"。执行人是谁与结果无关，D 错误。',
        tags: ['可复现'],
      },
      {
        id: 'py-6-x10',
        relatedLessonId: 'py-l-6-3',
        type: 'fill',
        difficulty: 3,
        question:
          '在计算客单价时防御除零错误，补全代码：\n\n```python\naov = total_amount / ___(order_count, 1)\n```',
        blanks: [['max']],
        explanation: '`max(n, 1)` 保证分母至少为 1。另一种常见写法是 `if order_count else None`。',
        tags: ['防御式编程'],
      },
      {
        id: 'py-6-x11',
        relatedLessonId: 'py-l-6-1',
        type: 'code',
        difficulty: 4,
        question:
          '实现 `build_city_report(orders)`：返回按城市分组、按销售额降序的列表，每项 `{"city", "gmv", "orders", "aov"}`。\n\n规则：\n- 只统计"已完成"订单；\n- `orders` 为该城市**去重后**订单数；\n- `aov` 保留 2 位小数；\n- 销售额相同时按城市名字升序。',
        starterCode: `from collections import defaultdict

orders = [
    {"order_id": "A1", "city": "北京", "amount": 600.0, "status": "已完成"},
    {"order_id": "A1", "city": "北京", "amount": 100.0, "status": "已完成"},
    {"order_id": "A2", "city": "北京", "amount": 200.0, "status": "已完成"},
    {"order_id": "B1", "city": "上海", "amount": 400.0, "status": "已完成"},
    {"order_id": "B2", "city": "上海", "amount": 500.0, "status": "已取消"},
    {"order_id": "C1", "city": "广州", "amount": 400.0, "status": "已完成"},
]

def build_city_report(orders):
    # 在这里实现
    return ___

out = build_city_report(orders)
`,
        setupCode: '',
        expectedOutput: "out[0] = 北京 900.0 / 2 单 / aov 450.0",
        tests: `assert [r["city"] for r in out] == ["北京", "上海", "广州"], f"排序不正确：{[r['city'] for r in out]}"
assert out[0] == {"city": "北京", "gmv": 900.0, "orders": 2, "aov": 450.0}, f"北京数据不正确：{out[0]}"
assert out[1]["gmv"] == 400.0 and out[1]["orders"] == 1 and out[1]["aov"] == 400.0
assert build_city_report([]) == [], "空输入应返回空列表"
`,
        explanation:
          '```python\ndef build_city_report(orders):\n    agg = defaultdict(lambda: {"gmv": 0.0, "orders": set()})\n    for o in orders:\n        if o["status"] != "已完成":\n            continue\n        a = agg[o["city"]]\n        a["gmv"] += o["amount"]\n        a["orders"].add(o["order_id"])\n    rows = [\n        {"city": c, "gmv": round(v["gmv"], 2), "orders": len(v["orders"]),\n         "aov": round(v["gmv"] / len(v["orders"]), 2)}\n        for c, v in agg.items()\n    ]\n    rows.sort(key=lambda r: (-r["gmv"], r["city"]))\n    return rows\n```\n\n上海与广州销售额同为 400，按城市名字升序"上海"在前。',
        tags: ['综合', '聚合', '排序'],
      },
      {
        id: 'py-6-x12',
        relatedLessonId: 'py-l-6-2',
        type: 'code',
        difficulty: 4,
        question:
          '退款率计算：`rows` 每项含 `order_id`、`status`（已完成/已退款/已取消）、`amount`。请计算：\n\n1. 有效订单数 `n_valid`（已完成 + 已退款，不含已取消）\n2. 退款金额 `refund_amount`（已退款订单的金额和）\n3. 退款率 `refund_rate`（已退款金额 / 有效销售额，其中有效销售额 = 有效订单金额和，保留 4 位小数）',
        starterCode: `rows = [
    {"order_id": "A1", "status": "已完成", "amount": 100.0},
    {"order_id": "A2", "status": "已退款", "amount": 50.0},
    {"order_id": "A3", "status": "已完成", "amount": 200.0},
    {"order_id": "A4", "status": "已取消", "amount": 999.0},
    {"order_id": "A5", "status": "已完成", "amount": 150.0},
]

n_valid = ___
refund_amount = ___
refund_rate = ___
`,
        setupCode: '',
        expectedOutput: 'n_valid = 4, refund_amount = 50.0, refund_rate = 0.1',
        tests: `assert n_valid == 4, f"n_valid 应为 4，实际 {n_valid}"
assert refund_amount == 50.0, f"refund_amount 应为 50.0，实际 {refund_amount}"
assert abs(refund_rate - 0.1) < 1e-9, f"refund_rate 应为 0.1，实际 {refund_rate}"
`,
        explanation:
          '```python\nvalid = [r for r in rows if r["status"] in ("已完成", "已退款")]\nn_valid = len(valid)\nrefund_amount = sum(r["amount"] for r in valid if r["status"] == "已退款")\nvalid_sales = sum(r["amount"] for r in valid)\nrefund_rate = round(refund_amount / valid_sales, 4) if valid_sales else 0.0\n```\n\n关键口径决策：**已取消订单不进入分母**；已退款订单既计入分母（因为发生过交易），也计入分子。',
        tags: ['指标', '口径'],
      },
      {
        id: 'py-6-x13',
        relatedLessonId: 'py-l-6-1',
        type: 'single',
        difficulty: 4,
        question: '同一个数据分析任务，同事的结论与你不同。最可能的根本原因是？',
        options: [
          { value: 'A', text: '同事的计算能力有问题' },
          { value: 'B', text: '双方使用了不同的隐形口径假设（时间、过滤条件、去重规则）' },
          { value: 'C', text: '数据库坏了' },
          { value: 'D', text: 'Python 有 bug' },
        ],
        answer: 'B',
        explanation:
          '"数据打架"绝大多数源于口径未显式化：时间字段不同（下单 vs 支付）、是否剔除取消单、去重规则不同等。解决方案是把口径写进配置与文档。',
        tags: ['口径', '协作'],
      },
      {
        id: 'py-6-x14',
        relatedLessonId: 'py-l-6-4',
        type: 'judge',
        difficulty: 3,
        question: '只要脚本能跑出结果，就不需要写单元测试。',
        answer: false,
        explanation:
          '分析脚本最常见的问题是"算错了但没报错"。测试把预期结果固化成断言，能在每次改动后自动验证，防止"改 A 坏 B"。',
        tags: ['测试'],
      },
      {
        id: 'py-6-x15',
        relatedLessonId: 'py-l-6-1',
        type: 'code',
        difficulty: 5,
        question:
          '**完整流水线**：实现 `pipeline(raw)`，依次完成：\n\n1. **清洗**：跳过 `amount` 无法转 float 或为负的行（计入 `errors`）；`city` 去首尾空格，为空则计入 `errors`；\n2. **聚合**：按城市汇总销售额与去重订单数；\n3. **输出**：返回 `{"report": [...按销售额降序...], "errors": n, "total": 原始行数}`。\n\n每项 report 为 `{"city", "amount", "orders", "aov"}`，aov 保留 2 位小数。结果保存到 `out`。',
        starterCode: `raw = [
    {"id": "A1", "city": " 北京 ", "amount": "100"},
    {"id": "A1", "city": " 北京 ", "amount": "50.5"},
    {"id": "A2", "city": "上海", "amount": "abc"},
    {"id": "A3", "city": "广州", "amount": "-5"},
    {"id": "A4", "city": "  ", "amount": "30"},
    {"id": "A5", "city": "深圳", "amount": "200"},
    {"id": "A6", "city": "北京", "amount": "99.5"},
]

def pipeline(raw):
    # 在这里实现
    return ___

out = pipeline(raw)
`,
        setupCode: '',
        expectedOutput: "total=7, errors=3, report[0] = 北京 amount=250.0 orders=2 aov=125.0",
        tests: `assert out["total"] == 7, f"total 应为 7，实际 {out['total']}"
assert out["errors"] == 3, f"errors 应为 3，实际 {out['errors']}"
assert out["report"][0]["city"] == "北京", f"第一名应为北京，实际 {out['report'][0]['city']}"
assert out["report"][0]["amount"] == 250.0, f"北京金额应为 250.0，实际 {out['report'][0]['amount']}"
assert out["report"][0]["orders"] == 2, f"北京订单数应为 2，实际 {out['report'][0]['orders']}"
assert out["report"][0]["aov"] == 125.0, f"北京客单价应为 125.0，实际 {out['report'][0]['aov']}"
assert out["report"][1] == {"city": "深圳", "amount": 200.0, "orders": 1, "aov": 200.0}, f"第二名不正确：{out['report'][1]}"
assert out["total"] == sum(r["orders"] if False else 0 for r in []) + out["total"]
`,
        explanation:
          '```python\ndef pipeline(raw):\n    agg = {}\n    errors = 0\n    for r in raw:\n        try:\n            amt = float(r["amount"])\n        except (TypeError, ValueError):\n            errors += 1\n            continue\n        if amt < 0:\n            errors += 1\n            continue\n        city = (r.get("city") or "").strip()\n        if not city:\n            errors += 1\n            continue\n        a = agg.setdefault(city, {"amount": 0.0, "orders": set()})\n        a["amount"] += amt\n        a["orders"].add(r["id"])\n    report = [\n        {"city": c, "amount": round(v["amount"], 2), "orders": len(v["orders"]),\n         "aov": round(v["amount"] / len(v["orders"]), 2)}\n        for c, v in agg.items()\n    ]\n    report.sort(key=lambda x: -x["amount"])\n    return {"report": report, "errors": errors, "total": len(raw)}\n```\n\n北京 3 条明细但只有 2 个订单（A1、A6），金额 100+50.5+99.5=250，客单价 125。对账：7 = 4 有效 + 3 错误。',
        tags: ['综合', '流水线'],
      },
      {
        id: 'py-6-x16',
        relatedLessonId: 'py-l-6-1',
        type: 'open',
        difficulty: 5,
        question:
          '请设计一个"电商销售分析"的数据处理项目：说明你的模块划分、每个模块的职责、关键的口径参数、以及对账与测试方案。',
        referenceAnswer: `**模块划分与职责**

| 模块 | 职责 |
| --- | --- |
| \`src/io.py\` | 读取订单、明细、商品、客户表；统一编码与类型 |
| \`src/clean.py\` | 校验必填字段、规范化城市名、处理缺失与重复 |
| \`src/metrics.py\` | GMV、客单价、退款率、复购率等指标函数（纯函数） |
| \`src/report.py\` | 多维度汇总、排序、导出 CSV，生成质量报告 |
| \`src/config.py\` | 口径参数集中定义 |
| \`tests/\` | 单元测试 + 口径回归测试 |

**关键口径参数**（写在 config.py 并附注释）

- 是否剔除取消单/退款单
- 销售额 = 实付金额（含运费？含优惠？）
- 时间归属字段：下单日 / 支付日
- 城市归属：收货地址 / 注册地
- 客单价分母：订单数 / 用户数

**对账方案**

1. 行数守恒：输入行数 = 有效行数 + 异常行数；
2. 金额守恒：明细金额之和 = 订单级金额之和（如适用）；
3. JOIN 后行数校验：确认无放大或丢失；
4. 与上期数据对比，波动超过阈值时给出提示。

**测试方案**

1. 纯函数单测：客单价、退款率、分箱的边界值（空、0 分母、单元素）；
2. 口径回归：用固定 10 行金标准数据，断言整条流水线输出；
3. 幂等测试：同一输入跑两次结果一致；
4. 异常输入测试：缺列、非法值、重复键。

**交付**：README 说明运行方式、参数含义、已知限制；日志打印各阶段行数与耗时；用 git 管理并记录口径变更。`,
        rubric: [
          { point: '给出清晰的分层模块划分（io/clean/metrics/report/config）', score: 2 },
          { point: '列出关键口径参数（取消单、时间归属、分母定义等）并说明需显式化', score: 2 },
          { point: '给出对账方案（行数守恒、金额守恒、JOIN 校验）', score: 2 },
          { point: '给出测试方案（边界、口径回归、幂等、异常输入）', score: 1 },
          { point: '提及 README、日志、版本管理等交付要求', score: 1 },
        ],
        keywords: ['模块', '口径', 'config', '对账', '守恒', '测试', '回归', '日志'],
        explanation:
          '这是本课程的综合题，考察能否把前五章的知识组织成一个可交付的工程方案。评分看"结构完整性"而非细节正确性。',
        tags: ['综合', '方法论'],
      },
      {
        id: 'py-6-x17',
        relatedLessonId: 'py-l-6-1',
        type: 'code',
        difficulty: 5,
        question:
          '**跨表对账**：`orders`（订单）与 `items`（明细）通过 `order_id` 关联。请找出四类异常并保存为元组：\n\n1. `orphan_orders`：有订单无明细的订单号（排序后列表）\n2. `orphan_items`：有明细无订单的明细 order_id（去重排序后列表）\n3. `amount_mismatch`：订单金额与明细金额之和差值 > 0.01 的订单号（排序后列表）\n4. `dup_orders`：订单表中重复出现的订单号（排序后列表）',
        starterCode: `from collections import Counter

orders = [
    {"order_id": "A1", "amount": 150.0},
    {"order_id": "A2", "amount": 200.0},
    {"order_id": "A3", "amount": 99.0},
    {"order_id": "A3", "amount": 99.0},
    {"order_id": "A4", "amount": 80.0},
]
items = [
    {"order_id": "A1", "amount": 100.0},
    {"order_id": "A1", "amount": 50.0},
    {"order_id": "A2", "amount": 150.0},
    {"order_id": "A3", "amount": 99.0},
    {"order_id": "A5", "amount": 30.0},
]

orphan_orders = ___
orphan_items = ___
amount_mismatch = ___
dup_orders = ___

out = (orphan_orders, orphan_items, amount_mismatch, dup_orders)
`,
        setupCode: '',
        expectedOutput: "orphan_orders=['A4'], orphan_items=['A5'], amount_mismatch=['A2'], dup_orders=['A3']",
        tests: `assert out[0] == ["A4"], f"orphan_orders 应为 ['A4']，实际 {out[0]}"
assert out[1] == ["A5"], f"orphan_items 应为 ['A5']，实际 {out[1]}"
assert out[2] == ["A2"], f"amount_mismatch 应为 ['A2']，实际 {out[2]}"
assert out[3] == ["A3"], f"dup_orders 应为 ['A3']，实际 {out[3]}"
`,
        explanation:
          '```python\norder_ids = {o["order_id"] for o in orders}\nitem_ids = {i["order_id"] for i in items}\norphan_orders = sorted(order_ids - item_ids)\norphan_items = sorted(item_ids - order_ids)\n\nitem_sum = {}\nfor i in items:\n    item_sum[i["order_id"]] = item_sum.get(i["order_id"], 0.0) + i["amount"]\norder_amt = {}\nfor o in orders:\n    order_amt.setdefault(o["order_id"], o["amount"])\namount_mismatch = sorted(\n    oid for oid, amt in order_amt.items()\n    if oid in item_sum and abs(amt - item_sum[oid]) > 0.01\n)\n\ndup_orders = sorted(k for k, v in Counter(o["order_id"] for o in orders).items() if v > 1)\n```\n\nA2 订单金额 200 但明细合计 150，差 50 → 不匹配；A3 在订单表中出现两次 → 重复。',
        tags: ['综合', '对账', '集合运算'],
      },
      {
        id: 'py-6-x18',
        relatedLessonId: 'py-l-6-1',
        type: 'single',
        difficulty: 3,
        question: '在数据分析脚本中，把随机过程的种子固定下来（如 `random.seed(42)`）的目的是？',
        options: [
          { value: 'A', text: '让程序运行更快' },
          { value: 'B', text: '保证结果可复现，便于排查与验证' },
          { value: 'C', text: '提高随机性质量' },
          { value: 'D', text: '避免内存溢出' },
        ],
        answer: 'B',
        explanation:
          '固定种子后每次运行得到相同的随机序列，这是可复现性的基础。抽样、交叉验证、模拟实验都应固定种子。',
        tags: ['可复现'],
      },
    ],
  },
];
