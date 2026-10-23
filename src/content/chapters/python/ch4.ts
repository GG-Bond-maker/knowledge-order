import type { Chapter } from '../../../types';

/* ============================================================
 *  第 4 章：文件读写与异常处理
 * ============================================================ */

const ch4: Omit<Chapter, 'courseId' | 'order'> = {
  id: 'python-4',
  title: '文件读写与异常处理',
  goal: '学会用 with 安全地读写文本 / CSV / JSON 文件，理解编码问题，并掌握异常处理与调试的基本方法。',
  lessons: [
    {
      id: 'py-l-4-1',
      title: '文件读写：with 语句与编码',
      content: `
## 为什么一定要用 with

\`\`\`python
# 不推荐：忘记 close 会导致文件句柄泄漏、数据未刷盘
f = open("data.txt", "w", encoding="utf-8")
f.write("hello")
f.close()

# 推荐：with 保证即使中途异常也会关闭文件
with open("data.txt", "w", encoding="utf-8") as f:
    f.write("hello")
\`\`\`

\`with\` 依赖**上下文管理器协议**（\`__enter__\` / \`__exit__\`），退出代码块时自动调用 \`__exit__\` 关闭文件，异常也不例外。

## 打开模式

| 模式 | 含义 | 文件不存在时 |
| --- | --- | --- |
| \`"r"\` | 只读（默认） | 报 \`FileNotFoundError\` |
| \`"w"\` | 只写，**清空原内容** | 创建新文件 |
| \`"a"\` | 追加 | 创建新文件 |
| \`"x"\` | 独占创建 | 文件已存在则报错 |
| \`"r+"\` | 读写 | 报错 |
| 加 \`"b"\` | 二进制模式（如 \`"rb"\`） | — |

> **最容易造成事故的是 \`"w"\`**：打开即清空。如果程序在写入前崩溃，原数据就丢了。重要文件应先写临时文件再替换。

## 读写方法

\`\`\`python
with open("a.txt", "r", encoding="utf-8") as f:
    text = f.read()            # 一次读全部
with open("a.txt", encoding="utf-8") as f:
    lines = f.readlines()      # 列表，每行含 \\n
with open("a.txt", encoding="utf-8") as f:
    for line in f:             # 推荐：逐行迭代，内存友好
        print(line.rstrip("\\n"))
\`\`\`

## 编码：中文乱码的根源

- Windows 中文系统默认编码是 \`GBK\`，而现代数据几乎都用 \`UTF-8\`；
- 读文件时显式写 \`encoding="utf-8"\` 可避免 90% 的乱码问题；
- 遇到 \`UnicodeDecodeError\`，常见处理是用 \`errors="ignore"\` 跳过坏字节，或 \`errors="replace"\` 替换成 \`�\`，但**都意味着数据有损**，更应优先确认源文件编码。

\`\`\`python
# 用 UTF-8 打开 GBK 文件时：
# UnicodeDecodeError: 'utf-8' codec can't decode byte 0xd6 in position 0
\`\`\`

## 路径处理：用 pathlib

\`\`\`python
from pathlib import Path

p = Path("data") / "orders.csv"     # 跨平台拼接路径
print(p.suffix, p.stem, p.parent)
list(Path("data").glob("*.csv"))     # 批量找文件
\`\`\`

## 读写 CSV 与 JSON（标准库）

\`\`\`python
import csv, json

with open("out.csv", "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.writer(f)
    writer.writerow(["id", "name", "amount"])
    writer.writerows([[1, "张三", 100], [2, "李四", 200]])

with open("out.json", "w", encoding="utf-8") as f:
    json.dump({"a": 1, "中文": "可读"}, f, ensure_ascii=False, indent=2)
\`\`\`

- \`newline=""\`：避免 Windows 下 CSV 出现多余空行；
- \`encoding="utf-8-sig"\`：写出的 CSV 带 BOM，用 Excel 双击打开中文不乱码；
- \`ensure_ascii=False\`：JSON 中保留中文原文而非 \`\\uXXXX\`。

> 浏览器 / Pyodide 环境没有真实文件系统（只能在虚拟 FS 中操作），所以本课程的文件练习会使用**字符串模拟**或 \`io.StringIO\`，思路与真实文件完全一致。
`,
      tips: [
        {
          kind: 'pitfall',
          text: '用 `"w"` 模式打开一个已有文件会**立即清空**。做数据清洗时应先输出到新文件名，验证无误后再替换。',
        },
        {
          kind: 'pitfall',
          text: 'Windows 下用 `encoding="utf-8"` 写入的 CSV，用 Excel 直接打开会乱码（因为 Excel 默认按 GBK 解析），改用 `utf-8-sig` 即可。',
        },
        {
          kind: 'leak',
          text: '大文件不要 `read()` 或 `readlines()` 一次性读入；用 `for line in f` 逐行处理，内存占用保持常数级。',
        },
      ],
      demos: [
        {
          title: '用 io.StringIO 模拟文件读写',
          lang: 'python',
          code: `import io, csv

csv_text = """order_id,city,amount
1001,北京,320.5
1002,上海,150.0
1003,北京,88.0
"""

# 读：StringIO 与真实文件对象的行为一致
reader = csv.DictReader(io.StringIO(csv_text))
rows = list(reader)
print("解析到", len(rows), "行")
for r in rows:
    print("  ", r)

# 计算总金额
total = sum(float(r["amount"]) for r in rows)
print("总金额:", total)

# 写：同样用 StringIO
out = io.StringIO()
writer = csv.writer(out)
writer.writerow(["city", "total"])
writer.writerows([["北京", 408.5], ["上海", 150.0]])
print("\\n写出的 CSV：")
print(out.getvalue())`,
        },
        {
          title: 'JSON 读写要点',
          lang: 'python',
          code: `import json

data = {"user": "张三", "cities": ["北京", "上海"], "active": True}

print("默认 ensure_ascii=True：")
print(json.dumps(data))
print("\\nensure_ascii=False：")
print(json.dumps(data, ensure_ascii=False, indent=2))

# 读回
text = '{"a": 1, "b": [1, 2]}'
print("\\n解析结果:", json.loads(text))

try:
    json.loads("{bad json}")
except json.JSONDecodeError as e:
    print("\\n解析失败：", e)`,
        },
      ],
    },
    {
      id: 'py-l-4-2',
      title: '异常处理：try / except / else / finally',
      content: `
## 基本结构

\`\`\`python
try:
    value = int(user_input)
except ValueError:
    print("不是合法整数")
\`\`\`

完整结构：

\`\`\`python
try:
    result = risky_operation()
except (ValueError, TypeError) as e:     # 捕获多种异常
    print(f"处理失败：{e}")
except Exception as e:                   # 兜底
    print(f"未知错误：{type(e).__name__}: {e}")
else:
    print("没有异常时才执行")            # 与 try 主体放一起更清晰
finally:
    print("无论是否异常都会执行")        # 释放资源、关闭连接
\`\`\`

## 常见内置异常

| 异常 | 典型触发场景 |
| --- | --- |
| \`ValueError\` | 类型对但值不合法：\`int("abc")\` |
| \`TypeError\` | 类型不匹配：\`"a" + 1\` |
| \`KeyError\` | 字典键不存在 |
| \`IndexError\` | 列表下标越界 |
| \`FileNotFoundError\` | 文件不存在（\`OSError\` 子类） |
| \`ZeroDivisionError\` | 除以 0 |
| \`AttributeError\` | 对象没有该属性 |

## 五条异常处理原则

1. **不要捕获后什么都不做**（\`except: pass\`）。沉默的异常会让 bug 潜伏数月。
2. **捕获得越具体越好**。\`except Exception\` 只在程序边界（如批量任务的外层循环）使用。
3. **不要用异常控制正常流程**。能用 \`if\` 判断的就不用 \`try\`。
4. **异常信息要有上下文**：打日志时带上关键参数（订单号、文件路径）。
5. **不要吞掉原始异常**：重新抛出时用 \`raise ... from e\` 保留异常链。

## 自定义异常

\`\`\`python
class DataQualityError(Exception):
    """数据质量校验未通过。"""

def validate(row):
    if row["amount"] < 0:
        raise DataQualityError(f"金额为负：{row}")
\`\`\`

## assert 与异常的区别

- \`assert\` 用于**开发者自检**（不变量、前置条件），\`python -O\` 运行时会被移除；
- \`raise\` 用于**业务校验**，生产代码里两者都该用 \`raise\` 的业务异常。

## 批量任务：逐行报错不应中断全局

\`\`\`python
errors = []
for i, row in enumerate(rows):
    try:
        process(row)
    except Exception as e:
        errors.append({"row": i, "error": str(e)})
print(f"成功 {len(rows) - len(errors)} 行，失败 {len(errors)} 行")
\`\`\`
`,
      tips: [
        {
          kind: 'pitfall',
          text: '`except:`（裸 except）会连键盘中断 `KeyboardInterrupt`、系统退出 `SystemExit` 都捕获，导致程序无法被 Ctrl+C 停止。至少写成 `except Exception:`。',
        },
        {
          kind: 'leak',
          text: '数据管道里，单行失败要让整行进入"错误队列"并继续处理，最终输出失败清单。全量中断会让已成功的部分白跑。',
        },
        {
          kind: 'interview',
          text: '"try/except 为什么不能滥用"是常见面试题。核心答案：异常开销大（异常栈展开），且会掩盖真实错误、降低可读性；应只处理预期内的失败。',
        },
      ],
      demos: [
        {
          title: '异常分类捕获与 finally',
          lang: 'python',
          code: `def parse_amount(text):
    """把字符串解析为金额，失败时返回 None 并说明原因。"""
    try:
        value = float(text)
    except (TypeError, ValueError) as e:
        print(f"  [解析失败] {text!r} → {type(e).__name__}: {e}")
        return None
    else:
        if value < 0:
            print(f"  [校验失败] 金额为负: {value}")
            return None
        return value
    finally:
        pass

for t in ["19.9", "abc", None, "-5", " 30 "]:
    print("输入:", repr(t))
    print("  结果:", parse_amount(t))`,
        },
        {
          title: '批量处理：收集错误而不是中断',
          lang: 'python',
          code: `rows = [
    {"id": 1, "qty": 2, "price": 10},
    {"id": 2, "qty": "x", "price": 20},
    {"id": 3, "qty": 1, "price": 5},
    {"id": 4, "qty": 3, "price": None},
]

results, errors = [], []
for r in rows:
    try:
        amount = int(r["qty"]) * float(r["price"])
    except (TypeError, ValueError) as e:
        errors.append({"id": r["id"], "error": f"{type(e).__name__}: {e}"})
        continue
    results.append({"id": r["id"], "amount": amount})

print("成功:", results)
print("失败:", errors)
print(f"成功率 {len(results)}/{len(rows)}")`,
        },
      ],
    },
    {
      id: 'py-l-4-3',
      title: '调试技巧与日志',
      content: `
## 三种调试手段

### 1. print 调试（简单但有效）

\`\`\`python
print(f"{df.shape = }, {df.dtypes = }")   # 3.8+ 的 = 语法自动打印变量名
\`\`\`

### 2. 断言（快速定位不变量）

\`\`\`python
def calc_avg(values):
    assert values, "values 不能为空"
    return sum(values) / len(values)
\`\`\`

### 3. 断点（pdb / IDE 调试器）

\`\`\`python
def buggy(a, b):
    breakpoint()     # 执行到这里会进入交互式调试
    return a / b
\`\`\`

常用命令：\`n\` 下一行、\`s\` 步入函数、\`c\` 继续、\`p expr\` 打印、\`q\` 退出。

> 在 Pyodide 中 \`breakpoint()\` 不可用（没有 stdin），请使用 print 或把中间变量显示在输出中。

## 看懂 Traceback

\`\`\`
Traceback (most recent call last):
  File "main.py", line 8, in <module>
    result = calc(10, 0)
  File "main.py", line 4, in calc
    return a / b
ZeroDivisionError: division by zero
\`\`\`

**从下往上读**：最后一行是异常类型与消息，上面是调用栈（最深处在最后）。定位顺序建议：

1. 看异常类型 → 大概知道问题类别；
2. 看最深层那一帧的代码行 → 具体出错位置；
3. 若涉及库内部，继续往上找**自己代码**的那一帧。

## logging：比 print 更适合长期使用

\`\`\`python
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

logger.debug("调试细节")
logger.info("开始处理 %s 行", len(rows))
logger.warning("发现 %d 条异常数据", n_bad)
logger.error("文件读取失败: %s", path)
\`\`\`

级别从低到高：\`DEBUG < INFO < WARNING < ERROR < CRITICAL\`。

**最佳实践**：库代码里只创建 logger（\`logging.getLogger(__name__)\`），不要在库中调用 \`basicConfig\`，由应用统一配置输出格式与级别。

## 数据脚本的调试套路

1. 先用 10~100 行样本跑通逻辑；
2. 打印中间表的行数与关键列的分布（\`df.info()\`、\`value_counts()\`）；
3. 每一步都做**对账**：过滤前后的行数、金额合计是否守恒；
4. 把可复现的问题固化成单元测试。
`,
      tips: [
        {
          kind: 'leak',
          text: '数据处理的每一步都做"行数/金额对账"，是排查口径问题最快的手段。例如 join 后行数爆炸，往往说明右表有重复键。',
        },
        {
          kind: 'performance',
          text: '在循环里 `logger.debug(f"...")` 会无条件执行字符串拼接。改用 `logger.debug("x=%s", x)` 惰性格式化，或用 `logger.isEnabledFor(logging.DEBUG)` 判断。',
        },
        {
          kind: 'interview',
          text: '被问到"如何排查一个线上数据异常"，可按"先确认是不是数据问题（口径、延迟、重复）→ 再看代码逻辑 → 最后看上游变更"的顺序回答。',
        },
      ],
      demos: [
        {
          title: 'logging 输出到控制台',
          lang: 'python',
          code: `import logging, io

stream = io.StringIO()
handler = logging.StreamHandler(stream)
handler.setFormatter(logging.Formatter("%(levelname)-7s | %(message)s"))
logger = logging.getLogger("demo")
logger.handlers.clear()
logger.addHandler(handler)
logger.setLevel(logging.DEBUG)

logger.debug("开始加载数据")
logger.info("共读取 %d 行", 1000)
logger.warning("发现 %d 行缺失关键字段", 12)
logger.error("导出失败：权限不足")

print(stream.getvalue())`,
        },
        {
          title: '读 Traceback：从下往上',
          lang: 'python',
          code: `import traceback

def parse_qty(value):
    return int(value)

def process(rows):
    total = 0
    for i, r in enumerate(rows):
        total += parse_qty(r["qty"])
    return total

rows = [{"qty": "2"}, {"qty": "abc"}]
try:
    process(rows)
except Exception as e:
    tb = traceback.format_exc()
    print(tb)
    print("---")
    print("异常类型:", type(e).__name__)
    print("最内层代码行错误:", tb.strip().splitlines()[-2].strip())`,
        },
      ],
    },
  ],
  exercises: [
    {
      id: 'py-4-e1',
      type: 'single',
      difficulty: 1,
      question: '下列哪种模式在打开**已存在**的文件时会立即清空其内容？',
      options: [
        { value: 'A', text: '`"r"`' },
        { value: 'B', text: '`"a"`' },
        { value: 'C', text: '`"w"`' },
        { value: 'D', text: '`"x"`' },
      ],
      answer: 'C',
      explanation:
        '`"w"` 打开即截断（清空）文件。`"a"` 追加、`"r"` 只读、`"x"` 要求文件不存在（已存在则报错）。这是最容易造成数据误删的模式。',
      tags: ['文件'],
    },
    {
      id: 'py-4-e2',
      type: 'judge',
      difficulty: 2,
      question: '`except:` 不写具体异常类型，可以确保捕获所有错误，因此是推荐的写法。',
      answer: false,
      explanation:
        '裸 `except:` 会捕获 `KeyboardInterrupt`、`SystemExit` 等，导致程序无法正常中断，还会掩盖真实 bug。应捕获具体异常，或至少写成 `except Exception:`。',
      tags: ['异常'],
    },
    {
      id: 'py-4-e3',
      type: 'multiple',
      difficulty: 2,
      question: '关于 `try / except / else / finally`，下列说法正确的有？（多选）',
      options: [
        { value: 'A', text: '`else` 块只在 `try` 中没有发生异常时执行' },
        { value: 'B', text: '`finally` 块无论是否发生异常都会执行' },
        { value: 'C', text: '一个 `try` 可以对应多个 `except`' },
        { value: 'D', text: '`finally` 中有 `return` 会覆盖 `try` 中的 `return`' },
      ],
      answer: ['A', 'B', 'C', 'D'],
      explanation:
        '四项都正确。特别注意 D：`finally` 中写 `return` 会吞掉原返回值与已抛出的异常，是隐蔽的 bug 来源，应避免在 `finally` 里 `return`。',
      tags: ['异常'],
    },
    {
      id: 'py-4-e4',
      type: 'fill',
      difficulty: 2,
      question: '补全代码，保证文件在出现异常时也能被正确关闭：\n\n```python\n___ open("data.txt", encoding="utf-8") as f:\n    content = f.read()\n```',
      blanks: [['with']],
      explanation: '`with` 语句依赖上下文管理器，在退出代码块时自动关闭文件，异常情况下也不会遗漏。',
      tags: ['文件', 'with'],
    },
    {
      id: 'py-4-e5',
      type: 'code',
      difficulty: 3,
      question:
        '`csv_text` 是一段 CSV 文本（含表头 `city,amount`）。请用 `io.StringIO` + `csv.DictReader` 解析，并计算：\n\n1. 每个城市的总金额，保存为字典 `city_total`；\n2. 总金额保存到 `grand_total`。\n\n金额可能含空值（空字符串），空值视为 0。',
      starterCode: `import io, csv

csv_text = """city,amount
北京,320.5
上海,150
北京,88
广州,
深圳,99.5
"""

city_total = {}
grand_total = 0.0

reader = csv.DictReader(io.StringIO(csv_text))
for row in reader:
    amount = float(row["amount"]) if row["amount"] else 0.0
    city_total[row["city"]] = ___
    grand_total += amount
`,
      setupCode: '',
      expectedOutput: "city_total = {'北京': 408.5, '上海': 150.0, '广州': 0.0, '深圳': 99.5}, grand_total = 658.0",
      tests: `assert city_total.get("北京") == 408.5, f"北京应为 408.5，实际 {city_total.get('北京')}"
assert city_total.get("广州") == 0.0, f"广州（空值）应为 0.0，实际 {city_total.get('广州')}"
assert abs(grand_total - 658.0) < 1e-9, f"总金额应为 658.0，实际 {grand_total}"
`,
      explanation:
        '```python\nreader = csv.DictReader(io.StringIO(csv_text))\nfor row in reader:\n    amount = float(row["amount"]) if row["amount"] else 0.0\n    city_total[row["city"]] = city_total.get(row["city"], 0.0) + amount\n    grand_total += amount\n```\n\n注意空字符串必须显式当作 0 处理，直接 `float("")` 会抛 `ValueError`。',
      tags: ['文件', 'CSV'],
    },
    {
      id: 'py-4-e6',
      type: 'code',
      difficulty: 3,
      question:
        '批量解析金额：编写 `parse_amounts(values)`，对列表中的每个值尝试转换为 `float`：\n\n- 转换成功返回数值；\n- 转换失败（如 `"abc"`、`None`）返回 `None` 并把该失败计入失败列表。\n\n函数应返回 `(ok_values, failed_values)` 两个列表。对 `data = ["12.5", "abc", "3", None, "  7 "]` 调用后，`out_ok`、`out_failed` 分别为结果。',
      starterCode: `data = ["12.5", "abc", "3", None, "  7 "]

def parse_amounts(values):
    ok, failed = [], []
    for v in values:
        ___
    return ok, failed

out_ok, out_failed = parse_amounts(data)
`,
      setupCode: '',
      expectedOutput: "out_ok = [12.5, 3.0, 7.0], out_failed = ['abc', None]",
      tests: `assert out_ok == [12.5, 3.0, 7.0], f"ok 列表不正确：{out_ok}"
assert out_failed == ["abc", None], f"failed 列表不正确：{out_failed}"
assert parse_amounts([]) == ([], [])
assert parse_amounts(["1", "2"]) == ([1.0, 2.0], [])
`,
      explanation:
        '```python\ndef parse_amounts(values):\n    ok, failed = [], []\n    for v in values:\n        try:\n            ok.append(float(v))\n        except (TypeError, ValueError):\n            failed.append(v)\n    return ok, failed\n```\n\n`float("  7 ")` 会自动去掉两侧空白得到 7.0，而 `float(None)` 抛的是 `TypeError`，所以两种异常都要捕获。',
      tags: ['异常', '数据清洗'],
    },
    {
      id: 'py-4-e7',
      type: 'single',
      difficulty: 2,
      question: '在 Windows 上用 `encoding="utf-8"` 写出的 CSV，双击用 Excel 打开时中文乱码。最合适的解决方式是？',
      options: [
        { value: 'A', text: '改用 `encoding="gbk"` 写入' },
        { value: 'B', text: '改用 `encoding="utf-8-sig"` 写入' },
        { value: 'C', text: '给每列加引号' },
        { value: 'D', text: '把扩展名改成 `.xlsx`' },
      ],
      answer: 'B',
      explanation:
        'Excel 打开 CSV 时默认按本地编码解析，遇到没有 BOM 的 UTF-8 文件会误判为 GBK。`utf-8-sig` 会在文件头写入 BOM（`EF BB BF`），Excel 据此识别为 UTF-8。',
      tags: ['编码'],
    },
    {
      id: 'py-4-e8',
      type: 'judge',
      difficulty: 3,
      question: '在 `finally` 块中使用 `return` 会覆盖 `try` 块中的 `return` 值。',
      answer: true,
      explanation:
        '`finally` 会在 `return` 真正生效前执行，若其中也有 `return`，则会用新的返回值覆盖原值（同时会吞掉正在传播的异常）。这是应当避免的写法。',
      tags: ['异常'],
    },
    {
      id: 'py-4-e9',
      type: 'fill',
      difficulty: 2,
      question: '把字典序列化为 JSON 字符串时保留中文原文（不转成 `\\uXXXX`），补全参数：\n\n```python\njson.dumps({"city": "北京"}, ___)  # 输出 {"city": "北京"}\n```',
      blanks: [['ensure_ascii=False', 'ensure_ascii = False']],
      explanation: '`ensure_ascii=False` 允许输出非 ASCII 字符，文件体积更小、日志更易读。',
      tags: ['JSON'],
    },
    {
      id: 'py-4-e10',
      type: 'multiple',
      difficulty: 3,
      question: '处理一个 50GB 的 CSV 文件时，下列哪些做法是合理的？（多选）',
      options: [
        { value: 'A', text: '用 `for line in f:` 逐行读取并聚合' },
        { value: 'B', text: '用 pandas 的 `chunksize` 分块读取处理' },
        { value: 'C', text: '先用 `f.read()` 全部读入内存再处理' },
        { value: 'D', text: '清洗后写入数据库或列式存储，再用 SQL 查询' },
      ],
      answer: ['A', 'B', 'D'],
      explanation:
        '50GB 全部读入内存通常会导致 OOM。逐行迭代、分块读取、落库后查询都只占用可控内存；C 是最不可行的做法。',
      tags: ['文件', '性能'],
    },
    {
      id: 'py-4-e11',
      type: 'code',
      difficulty: 4,
      question:
        '编写 `aggregate(rows)`：`rows` 是 `[{"city": str, "amount": str}]` 列表，金额是字符串且可能非法。\n\n- 非法金额（无法转 float）的行直接**跳过**，并计数到 `skipped`；\n- 返回 `(city_total, skipped)`，其中 `city_total` 是"城市 → 金额合计"的 dict。\n\n对给定数据调用后，结果保存到 `out_total` 与 `out_skipped`。',
      starterCode: `rows = [
    {"city": "北京", "amount": "100"},
    {"city": "上海", "amount": "abc"},
    {"city": "北京", "amount": "50.5"},
    {"city": "上海", "amount": "20"},
]

def aggregate(rows):
    city_total = {}
    skipped = 0
    for r in rows:
        ___
    return city_total, skipped

out_total, out_skipped = aggregate(rows)
`,
      setupCode: '',
      expectedOutput: "out_total = {'北京': 150.5, '上海': 20.0}, out_skipped = 1",
      tests: `assert abs(out_total.get("北京", 0) - 150.5) < 1e-9, f"北京金额不正确：{out_total}"
assert abs(out_total.get("上海", 0) - 20.0) < 1e-9, f"上海金额不正确：{out_total}"
assert out_skipped == 1, f"跳过行数应为 1，实际 {out_skipped}"
assert "abc" not in str(out_total)
`,
      explanation:
        '```python\ndef aggregate(rows):\n    city_total = {}\n    skipped = 0\n    for r in rows:\n        try:\n            amt = float(r["amount"])\n        except (TypeError, ValueError):\n            skipped += 1\n            continue\n        city_total[r["city"]] = city_total.get(r["city"], 0.0) + amt\n    return city_total, skipped\n```\n\n生产环境中，`skipped` 的明细（行号与原始值）应写入错误清单，便于回查。',
      tags: ['异常', '聚合'],
    },
    {
      id: 'py-4-e12',
      type: 'single',
      difficulty: 2,
      question: '阅读 traceback 时，定位出错位置最有效的做法是？',
      options: [
        { value: 'A', text: '从上往下读到第一行' },
        { value: 'B', text: '只读最后一行异常类型就够了' },
        { value: 'C', text: '先看最后一行的异常类型，再从下往上找到自己代码中最深的一帧' },
        { value: 'D', text: '直接搜索报错信息到网上找答案' },
      ],
      answer: 'C',
      explanation:
        '最后一行给出异常类型与消息，越下方越接近实际出错点；但深层可能是库内部代码，因此应找"自己代码"中最靠下的那一帧。',
      tags: ['调试'],
    },
    {
      id: 'py-4-e13',
      type: 'open',
      difficulty: 3,
      question:
        '你在一个数据管道里加了 `except Exception: pass` 来"避免程序崩溃"。请说明这种做法可能带来的问题，并给出一个更合理的替代方案。',
      referenceAnswer: `**问题**：
1. **掩盖真实错误**：类型错误、字段名写错、连接失败都会被静默吞掉，结果表现为"数据莫名变少"或为空，排查成本极高；
2. **数据质量无声恶化**：可能产生部分写入、字段丢失的结果，下游据此得出错误结论；
3. **无法告警**：监控系统看不到异常，问题被推迟到业务方发现；
4. **吞掉非业务异常**：如 \`KeyboardInterrupt\`、内存错误等，程序行为不可预期。

**替代方案**：
1. 捕获**具体类型**（如 \`ValueError\`、\`KeyError\`），并且只包住可能出错的最小代码段；
2. 把失败行记录到错误清单（行号 + 原始值 + 异常信息），并在结束时汇总输出失败率；
3. 用 \`logger.exception(...)\` 记录完整堆栈（含 traceback）；
4. 设定阈值：失败率超过 X% 时整体任务失败并告警；
5. 重新抛出时使用 \`raise DataQualityError(...) from e\` 保留异常链。`,
      explanation: '裸捕获并静默跳过是数据管道中最常见、代价最隐蔽的错误。回答要指出"错误被掩盖 → 结果无声错误 → 无人知道"的链条，并给出可落地的替代：捕获具体异常、记录错误清单、记录完整堆栈、设置失败率阈值并告警。',
      rubric: [
        { point: '指出静默吞异常会掩盖真实错误、导致数据质量无声恶化', score: 2 },
        { point: '说明影响排查与监控告警', score: 1 },
        { point: '给出捕获具体异常类型的替代做法', score: 1 },
        { point: '给出错误清单/失败率阈值/记录堆栈等工程化做法', score: 2 },
      ],
      keywords: ['掩盖', '具体异常', '日志', '失败率', '堆栈', '告警'],
      tags: ['异常', '工程实践'],
    },
  ],
};

export { ch4 };
