# -*- coding: utf-8 -*-
"""
Python 基础与数据处理 - 第 9 章至第 12 章数据定义
涵盖：
9. 常用标准库、日期处理与正则表达式基础 (math, random, pathlib, datetime, re)
10. NumPy 数值数组与向量化计算 (ndarray, shape, indexing, vectorized, broadcasting)
11. pandas 核心数据处理与分析操作 (Series, DataFrame, loc/iloc, filter, groupby, merge, to_csv)
12. 数据清洗综合实战与贯穿式结课项目 (缺失值、重复值、类型强转、端到端电商订单/学员分析管道)
"""

CHAPTER_9 = {
    "id": "pyf-c9",
    "courseId": "python-foundations-data",
    "order": 9,
    "title": "常用标准库、日期处理与正则表达式基础",
    "goal": "领会 Python“自带电池 (Batteries Included)”哲学，熟练运用 math、random 与现代化面向对象路径库 pathlib，掌握 datetime 模块的时间解析与跨度计算，掌握正则表达式 re 的模式匹配与文本提取。",
    "lessons": [
        {
            "id": "pyf-l9-1",
            "title": "常用电池包：math、random 与现代面向对象路径工具 pathlib",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握 Python 标准库中的常用工具包，学会用 `math` 解决科学运算、用 `random` 搞定数据随机抽样与打乱，掌握 Python 3.4+ 引入的革命性面向对象路径库 `pathlib.Path`，彻底淘汰老旧易错的 `os.path` 字符串拼接。
- **先修要求**：熟练掌握函数与模块导入基础。

---

### 二、核心概念与术语解释

#### 1. 科学数学库：`math`
提供底层 C 级别的高性能数学函数：
- `math.ceil(x)`（向上取整）、`math.floor(x)`（向下取整）；
- `math.sqrt(x)`（算术平方根）；
- `math.isclose(a, b, rel_tol=1e-9)`（安全比较两浮点数是否近似相等，避免 0.1+0.2 坑）；
- 常量 `math.pi`（圆周率）与 `math.e`。

#### 2. 随机与抽样：`random`
数据分析中常用于构建测试集、数据脱敏与蒙特卡洛模拟：
- `random.random()`：生成 $[0.0, 1.0)$ 之间的伪随机浮点数；
- `random.randint(a, b)`：生成 $[a, b]$ 闭区间内的随机整数；
- `random.choice(seq)`：从序列中随机抽取 1 个元素；
- `random.sample(seq, k)`：无放回随机抽取 $k$ 个独立样本（极适合抽样检验）；
- `random.shuffle(lst)`：原地随机洗牌打乱列表。

#### 3. 现代化跨平台路径处理：`pathlib.Path`
在过去，跨平台处理文件路径需要写极其丑陋的 `os.path.join(os.path.dirname(__file__), 'data', 'sales.csv')`。
现代 Python 强力推荐 **`pathlib`**：
- 使用真正的面向对象方式表达路径，**支持斜杠运算符 `/` 直接拼接路径**！
- 自动抹平 Windows（反斜杠 `\\`）与 Linux/Mac（正斜杠 `/`）的底层差异；
- 核心方法：
  - `p = Path("data") / "2024" / "orders.csv"`
  - `p.exists()`（路径是否存在）、`p.is_file()`（是否为文件）；
  - `p.name`（带扩展名文件名 `'orders.csv'`）、`p.stem`（纯文件名 `'orders'`）、`p.suffix`（扩展名 `'.csv'`）；
  - `p.read_text(encoding="utf-8")`（一键读取纯文本）；
  - `p.glob("*.csv")`（通配符快速搜索目录下所有 CSV 文件）。

---

### 三、逐步代码演练与执行分析

```python
import math
import random
from pathlib import Path

# 1. math 向上取整计算分页总数
total_records = 95
page_size = 20
total_pages = math.ceil(total_records / page_size)
print(f"总记录: {total_records}, 每页: {page_size}, 总页数: {total_pages}")  # 5 页

# 2. random 无放回抽查抽检订单
orders = [f"ORD-{i:04d}" for i in range(1, 101)]
audit_sample = random.sample(orders, 3)
print(f"随机抽检 3 个订单: {audit_sample}")

# 3. pathlib 现代面向对象路径拼接与属性解析
file_path = Path("workspace") / "reports" / "quarterly_2024.xlsx"
print(f"跨平台安全拼接路径: {file_path}")
print(f"文件名: {file_path.name} | 主名: {file_path.stem} | 后缀: {file_path.suffix}")
```

---

### 四、常见易错陷阱与排查技巧
1. **字符串硬编码路径**：
   - 在 Windows 上直接写 `"C:\\Users\\name\\data.csv"`，拿到 Linux 服务器上会直接崩溃；必须使用 `Path("C:/Users/name/data.csv")` 或斜杠拼接。
2. **`random.sample` 的样本数超出总体长度**：
   - 若列表只有 5 项，执行 `random.sample(lst, 10)` 会直接抛出 `ValueError: Sample larger than population`。

---

### 五、本节小结
- `math` 解决高精度科学运算，分页推荐 `math.ceil`。
- `random.sample` 无放回抽样是数据校验利器。
- 全面拥抱 `pathlib.Path`，用 `/` 拼接路径优雅告别 `os.path`。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "全面弃用 os.path.join！现代 Python 统一使用 pathlib.Path，直接用斜杠 / 拼接路径，跨平台自动适配。"
                }
            ],
            "demos": [
                {
                    "title": "pathlib 路径解析与随机抽样实战",
                    "lang": "python",
                    "code": "from pathlib import Path\nimport random\n\n# 模拟扫描报表文件目录\nfake_files = [\n    Path(\"data/sales_2024_01.csv\"),\n    Path(\"data/sales_2024_02.csv\"),\n    Path(\"data/notes.txt\"),\n    Path(\"data/sales_2024_03.csv\")\n]\n\n# 筛选所有的 CSV 数据文件\ncsv_files = [p for p in fake_files if p.suffix == '.csv']\nprint(\"识别出的 CSV 数据集:\", [p.name for p in csv_files])\n\n# 随机挑选 1 个用于抽样审计\nselected = random.choice(csv_files)\nprint(f\"抽样选中的审计数据集: {selected.name} (主名: {selected.stem})\")\n"
                }
            ]
        },
        {
            "id": "pyf-l9-2",
            "title": "时间序列基石：datetime 模块解析、格式化与时间差计算",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握 `datetime` 模块的核心类（`date`, `time`, `datetime`, `timedelta`），熟练进行字符串与时间对象之间的双向转换（`strptime` 解析 vs `strftime` 格式化），掌握基于 `timedelta` 计算时效差与用户生命周期。
- **先修要求**：熟练掌握字符串与格式化操作。

---

### 二、核心概念与术语解释

#### 1. datetime 模块核心类
- **`datetime.date`**：年、月、日（如 `2024-05-18`）；
- **`datetime.time`**：时、分、秒、微秒（如 `14:30:00`）；
- **`datetime.datetime`**：完整时间戳（年、月、日、时、分、秒）；
- **`datetime.timedelta`**：表示两个时间点之间的**时间跨度（Duration / Time Delta）**。

#### 2. 双向转换：记忆口诀
- **`strptime` (Parse)**：**String Parse Time**，将**文本字符串**按照特定格式模板解析为 **datetime 对象**：
  ```python
  dt = datetime.strptime("2024-05-18 15:30:00", "%Y-%m-%d %H:%M:%S")
  ```
- **`strftime` (Format)**：**String Format Time**，将 **datetime 对象** 格式化输出为漂亮的**文本字符串**：
  ```python
  formatted_str = dt.strftime("%Y年%m月%d日 %H时")
  ```

#### 3. 常用格式化指令速查表
| 格式符 | 含义 | 示例 |
| :--- | :--- | :--- |
| `%Y` | 4 位数年份（大写 Y） | `2024` |
| `%m` | 2 位数月份（小写 m） | `05` |
| `%d` | 2 位数日期（小写 d） | `18` |
| `%H` | 24 小时制小时（大写 H） | `15` |
| `%M` | 分钟（大写 M，区分小写 m 月份） | `30` |
| `%S` | 秒（大写 S） | `00` |

#### 4. 时间跨度计算：`timedelta`
两个 `datetime` 对象直接相减，返回的就是 `timedelta` 对象：
```python
delta = dt_end - dt_start
print("经历的天数:", delta.days)
print("总秒数:", delta.total_seconds())

# 计算 7 天后的到期时间
expire_time = dt_start + timedelta(days=7)
```

---

### 三、逐步代码演练与执行分析

```python
from datetime import datetime, timedelta

# 1. 模拟电商订单：计算用户从下单到支付的耗时（分钟）
order_time_str = "2024-05-18 10:15:30"
pay_time_str = "2024-05-18 10:27:50"

t_order = datetime.strptime(order_time_str, "%Y-%m-%d %H:%M:%S")
t_pay = datetime.strptime(pay_time_str, "%Y-%m-%d %H:%M:%S")

diff = t_pay - t_order
diff_minutes = diff.total_seconds() / 60.0
print(f"支付耗时: {diff_minutes:.2f} 分钟 (共 {diff.seconds} 秒)")

# 2. 计算会员到期日并格式化为标准展示文本
start_date = datetime(2024, 1, 1)
membership_duration = timedelta(days=365)
expire_date = start_date + membership_duration
print(f"会员开通日: {start_date.strftime('%Y/%m/%d')}")
print(f"会员到期日: {expire_date.strftime('%Y/%m/%d')}")
```

---

### 四、常见易错陷阱与排查技巧
1. **大小写混淆导致致命解析错误**：
   - `%m` 代表月份（Month），`%M` 代表分钟（Minute）；若在格式化字符串中把时间写成 `"%Y-%M-%d"`，月份会被当成分钟解析！
   - `%Y` 是 4 位完整年份（2024），`%y` 是 2 位缩写年份（24）。

---

### 五、本节小结
- `strptime` 字符串转时间，`strftime` 时间转字符串。
- 区分 `%m`（月份）与 `%M`（分钟），`%Y`（4位年）与 `%y`（2位年）。
- 两个日期直接相减得到 `timedelta`，支持基于天、小时、秒做时效指标统计。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "切记：大写 %M 是分钟，小写 %m 是月份！写成 %Y-%M-%d 会把分钟误当成月份，导致时间完全错乱。"
                }
            ],
            "demos": [
                {
                    "title": "订单履约时效分析：从下单到妥投周期计算",
                    "lang": "python",
                    "code": "from datetime import datetime, timedelta\n\n# 模拟订单全生命周期履约流水\nlogs = [\n    {\"order_id\": \"ORD-1\", \"created\": \"2024-04-01 09:30:00\", \"delivered\": \"2024-04-03 14:15:00\"},\n    {\"order_id\": \"ORD-2\", \"created\": \"2024-04-01 11:20:00\", \"delivered\": \"2024-04-02 18:40:00\"}\n]\n\nfor log in logs:\n    t1 = datetime.strptime(log[\"created\"], \"%Y-%m-%d %H:%M:%S\")\n    t2 = datetime.strptime(log[\"delivered\"], \"%Y-%m-%d %H:%M:%S\")\n    duration = t2 - t1\n    hours = duration.total_seconds() / 3600.0\n    print(f\"订单 {log['order_id']} 履约总耗时: {hours:.1f} 小时 (即 {duration.days} 天 {duration.seconds // 3600} 小时)\")\n"
                }
            ]
        },
        {
            "id": "pyf-l9-3",
            "title": "文本模式提取利器：正则表达式 (re 模块) 核心实战",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握正则表达式（Regular Expressions）的核心元字符与模式匹配规则，理解 Python 原始字符串 `r\"...\"` 的防转义必要性，熟练使用 `re.search`, `re.findall`, `re.sub` 完成脏数据文本提取与模式脱敏。
- **先修要求**：熟练掌握字符串基础操作。

---

### 二、核心概念与术语解释

#### 1. 为什么数据清洗必须掌握正则？
在现实业务中，客户录入的文本充斥着非标准噪声（如“电话：138-1234-5678”，“联系方式13812345678”，“TEL: 138 1234 5678”）。
单纯用 `str.replace` 很难应对千奇百怪的格式。**正则表达式是一种用特殊符号描述文本特征模式的强大工具**。

#### 2. 核心元字符速查
| 元字符 | 匹配含义 | 示例 |
| :--- | :--- | :--- |
| `\\d` | 匹配任意单条数字（0~9） | `\\d{3}` 匹配 3 位数字 |
| `\\w` | 匹配字母、数字、下划线或中文汉字 | `\\w+` 匹配连续单词 |
| `\\s` | 匹配任何空白字符（空格、Tab、换行） | `\\s+` 匹配任意空格 |
| `.` | 匹配除换行符外的任意单个字符 | `a.c` 匹配 abc, a1c |
| `^` / `$` | 分别匹配字符串的**开头**与**结尾** | `^\\d+$` 整个字符串全是纯数字 |
| `+` | 匹配前一个模式 **1 次或多次** | `\\d+` 连续多位数字 |
| `*` | 匹配前一个模式 **0 次或多次** |  |
| `?` | 匹配前一个模式 **0 次或 1 次（可选）** | `https?` 匹配 http 或 https |
| `[...]` | 字符集，匹配中括号内任意一个字符 | `[A-Za-z]` 匹配任意英文字母 |

#### 3. 原始字符串前缀：`r\"...\"`
在普通 Python 字符串中，反斜杠 `\\` 会被当成转义符（如 `\\n` 换行）。
为了避免 Python 转义与正则表达式引擎内部转义打架，**编写所有正则表达式时，必须在引号前加 `r` 前缀**（Raw String，如 `r\"\\d{4}-\\d{2}\"`）。

#### 4. 三大核心函数
- **`re.search(pattern, text)`**：在全文中搜索**第一个**匹配项，成功返回 `Match` 对象，未搜到返回 `None`；
- **`re.findall(pattern, text)`**：搜索**所有**匹配项，直接以**字符串列表**形式返回（做批量提取最常用！）；
- **`re.sub(pattern, replacement, text)`**：将匹配到的所有模式**替换**为指定内容（做敏感信息脱敏与符号清洗极常用！）。

---

### 三、逐步代码演练与执行分析

```python
import re

log_text = \"\"\"
用户投诉单：
1. 客户张三电话: 13812345678，反馈订单 ORD-9527 包装破损。
2. 客户李四电话: 13987654321，反馈订单 ORD-8848 配送超时。
\"\"\"

# 1. 使用 re.findall 批量提取所有订单号与手机号
order_ids = re.findall(r"ORD-\\d{4}", log_text)
phones = re.findall(r"1[3-9]\\d{9}", log_text)
print("提取到的全部订单号:", order_ids)
print("提取到的全部手机号:", phones)

# 2. 使用 re.sub 进行手机号敏感信息打码脱敏（保留前3后4）
masked_log = re.sub(r"(1[3-9]\d)\d{4}(\d{4})", r"\g<1>****\g<2>", log_text)
print("脱敏后的客服日志:")
print(masked_log)
```

---

### 四、常见易错陷阱与排查技巧
1. **忘记在模式前加 `r`**：
   - 写成 `"\\d+"` 时，在复杂正则下容易引发警告或转义混乱，永远规范写为 `r"\\d+"`。
2. **贪婪匹配与非贪婪匹配**：
   - 默认修饰符 `+` 和 `*` 是**贪婪的（Greedy）**，会尽可能匹配最长的文本；
   - 若想匹配最短文本，在其后加问号变为非贪婪：`+?` 或 `*?`。

---

### 五、本节小结
- 正则编写必须加 `r"..."` 原始字符串前缀。
- `re.findall` 快速批量提取，`re.sub` 模式替换脱敏，`re.search` 精确检索首个匹配。
- 掌握 `\d`, `\w`, `+`, `?` 是高效清洗混乱非结构化文本的必备武器。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "牢记：写正则表达式必须加 r 前缀（如 r'\\d+'），否则 Python 解释器本身的字符串转义规则会破坏正则转义。"
                }
            ],
            "demos": [
                {
                    "title": "非结构化地址与金额模式清洗实战",
                    "lang": "python",
                    "code": "# 从杂乱用户备注中提取所有合法的交易金额数字\nimport re\n\nraw_notes = \"本次消费 ¥128.50 元，优惠券抵扣 20.00元，实付 $15.5 现金，杂项 8 元。\"\n\n# 提取所有浮点或整数字符串\namount_pattern = r\"\\d+(?:\\.\\d+)?\"\nmatches = re.findall(amount_pattern, raw_notes)\n\nprint(\"提取到的数值文本:\", matches)\nparsed_floats = [float(x) for x in matches]\nprint(\"转换为浮点数值:\", parsed_floats)\nprint(f\"金额最大值: {max(parsed_floats)}, 最小值: {min(parsed_floats)}\")\n"
                }
            ]
        }
    ],
    "exercises": [
        {
            "id": "pyf-ex-9-1",
            "type": "single",
            "difficulty": 1,
            "question": "在 Python 的 `datetime` 模块中，若要将一个 datetime 对象转换为形如 `\"2024-05-18\"` 的字符串，应该使用哪个方法？",
            "options": [
                {"value": "A", "label": "strftime()（String Format Time）"},
                {"value": "B", "label": "strptime()（String Parse Time）"},
                {"value": "C", "label": "to_string()"},
                {"value": "D", "label": "parse_date()"}
            ],
            "answer": "A",
            "explanation": "strftime（Format）用于将时间对象格式化输出为字符串；strptime（Parse）用于将字符串解析为时间对象。",
            "tags": ["datetime", "strftime"]
        },
        {
            "id": "pyf-ex-9-2",
            "type": "single",
            "difficulty": 1,
            "question": "在编写正则表达式时，用于匹配“一个或多个连续的十进制数字”的经典模式写法是？",
            "options": [
                {"value": "A", "label": "r\"\\d+\""},
                {"value": "B", "label": "r\"\\w*\""},
                {"value": "C", "label": "r\"\\s+\""},
                {"value": "D", "label": "r\"[0-9]?\""}
            ],
            "answer": "A",
            "explanation": "\\d 匹配 0~9 的数字，+ 表示重复 1 次或多次，因此 r\"\\d+\" 匹配连续数字串。",
            "tags": ["正则表达式", "元字符"]
        },
        {
            "id": "pyf-ex-9-3",
            "type": "judge",
            "difficulty": 2,
            "question": "在 Python 中，两个 `datetime.date` 对象直接使用减号（`-`）相减，得到的结果是一个 `datetime.timedelta` 对象。",
            "answer": True,
            "explanation": "正确！两个日期相减表示时间跨度，返回的是表示天数和秒数的 timedelta 对象。",
            "tags": ["datetime", "timedelta"]
        },
        {
            "id": "pyf-ex-9-4",
            "type": "fill",
            "difficulty": 2,
            "question": "在正则表达式中，若要使用 `re.sub(pattern, repl, string)` 将字符串中的所有连续数字替换为单个星号 `*`，`pattern` 处应填写的原始字符串是 `r\"_____\"`。",
            "blanks": [["\\d+"]],
            "explanation": "\\d+ 匹配一个或多个连续数字，替换为 * 即可完成脱敏。",
            "tags": ["re.sub", "正则表达式"]
        },
        {
            "id": "pyf-ex-9-5",
            "type": "single",
            "difficulty": 2,
            "question": "使用现代标准库 `pathlib.Path`，已知 `p = Path(\"workspace/data/sales_2024.csv\")`，表达式 `p.stem` 的返回值是？",
            "options": [
                {"value": "A", "label": "\"sales_2024\"（不含扩展名的文件主名）"},
                {"value": "B", "label": "\"sales_2024.csv\"（完整文件名）"},
                {"value": "C", "label": "\".csv\"（文件后缀名）"},
                {"value": "D", "label": "\"workspace/data\"（父目录路径）"}
            ],
            "answer": "A",
            "explanation": "pathlib.Path 的属性中：name 是带后缀的完整文件名 ('sales_2024.csv')；stem 是纯文件主名 ('sales_2024')；suffix 是扩展名 ('.csv')；parent 是父目录。",
            "tags": ["pathlib", "面向对象路径"]
        },
        {
            "id": "pyf-ex-9-6",
            "type": "multiple",
            "difficulty": 3,
            "question": "关于 Python `re` 模块的核心函数与行为特性，下列哪些描述是正确的？",
            "options": [
                {"value": "A", "label": "re.findall() 会在输入文本中搜索所有非重叠匹配项，并以列表形式一次性返回所有匹配字符串"},
                {"value": "B", "label": "re.search() 只要在文本中找到第一个匹配项就会立即返回 Match 对象，后续内容不再继续检索"},
                {"value": "C", "label": "在编写正则表达式时，在引号前添加前缀 r（原始字符串）可以避免 Python 解释器层面的反斜杠二次转义"},
                {"value": "D", "label": "正则表达式一旦编译后就无法在多线程环境中复用"}
            ],
            "answer": ["A", "B", "C"],
            "explanation": "A、B、C 均为 re 模块的标准行为；D 是错误的，编译后的正则对象（Pattern）是无状态不可变的，完全支持高并发线程安全复用。",
            "tags": ["re模块", "核心特性"]
        },
        {
            "id": "pyf-ex-9-7",
            "type": "single",
            "difficulty": 4,
            "question": "观察以下基于 `datetime` 的运算代码：\n```python\nfrom datetime import datetime, timedelta\nt1 = datetime(2024, 3, 1, 10, 0, 0)\nt2 = t1 + timedelta(days=2, hours=5)\nprint(t2.strftime(\"%Y-%m-%d %H:%M\"))\n```\n最终控制台打印出的时间字符串是：",
            "options": [
                {"value": "A", "label": "2024-03-03 15:00"},
                {"value": "B", "label": "2024-03-03 10:00"},
                {"value": "C", "label": "2024-03-02 15:00"},
                {"value": "D", "label": "2024-03-04 15:00"}
            ],
            "answer": "A",
            "explanation": "原时间是 3月1日 10点，加上 2 天变成 3月3日 10点，再加上 5 小时变成 15点，因此结果是 2024-03-03 15:00。",
            "tags": ["timedelta", "时间计算"]
        },
        {
            "id": "pyf-ex-9-8",
            "type": "code",
            "difficulty": 4,
            "question": "【动手编程】请编写一个订单编码提取函数 `extract_order_ids(log_text: str) -> list`：\n- 传入一段可能包含杂乱日志的文本；\n- 使用 `re.findall` 提取所有符合 `ORD-` 紧跟 5 位数字模式的订单编号（例如 `ORD-12345`）；\n- 返回提取出的订单编号字符串列表（按出现顺序）。",
            "starterCode": "import re\n\ndef extract_order_ids(log_text: str) -> list:\n    # 请在此处使用正则表达式提取符合规范的订单号\n    pass\n",
            "expectedOutput": "['ORD-10001', 'ORD-99999']",
            "answer": "import re\n\ndef extract_order_ids(log_text: str) -> list:\n    if not log_text:\n        return []\n    return re.findall(r'ORD-\\d{5}', log_text)",
            "tests": "text = '用户A下单 ORD-10001 成功，但错误单号 ORD-123 被拦截，随后重试单号 ORD-99999 妥投。'\nres = extract_order_ids(text)\nassert res == ['ORD-10001', 'ORD-99999']\nassert extract_order_ids('无有效订单') == []\nassert extract_order_ids('') == []\n",
            "explanation": "使用正则模式 r'ORD-\\d{5}' 精确匹配 'ORD-' 加上恰好 5 位数字的子串，并由 re.findall 直接返回列表。",
            "tags": ["编程实操", "正则提取"]
        }
    ]
}

CHAPTER_10 = {
    "id": "pyf-c10",
    "courseId": "python-foundations-data",
    "order": 10,
    "title": "NumPy 数值数组与向量化计算",
    "goal": "理解纯 Python 列表在密集数值计算上的性能瓶颈，掌握 NumPy ndarray 的连续内存与同构类型优势，精通数组重塑、切片索引、向量化操作与广播机制 (Broadcasting)。",
    "lessons": [
        {
            "id": "pyf-l10-1",
            "title": "突破性能瓶颈：为什么大规模数值计算必须使用 NumPy",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握 Python 原生列表（动态指针数组）在内存布局与装箱拆箱上的巨大性能开销，理解 NumPy 的 `ndarray`（N-dimensional Array）连续物理内存模型与 C 级 SIMD 向量化指令加速。
- **先修要求**：已熟练掌握列表的基本操作与循环。

---

### 二、核心概念与术语解释

#### 1. 为什么纯 Python 列表在数值计算上很慢？
Python 的 `list` 具有极其强大的通用性（可以把数字、字符串、甚至另一个列表混在一起装）。但这付出了极高昂的物理代价：
- **指针间接寻址与内存碎片**：Python 列表内部存放的不是原始数值，而是存放**指向堆内存中各个 PyObject 对象的指针**！当用 for 循环遍历列表做加法时，CPU 必须一次次发生指针解引用跳转（Cache Miss 极其严重）；
- **动态类型检查装箱开销**：每次执行 `a + b`，解释器都要动态检查 a 和 b 的类型、分配新对象装箱，性能损耗巨大。

#### 2. NumPy ndarray 的革命性物理架构
NumPy 是几乎整个现代数据科学与 AI 生态（pandas, SciPy, scikit-learn, PyTorch）的最底层物理基石。
- **物理内存紧凑连续（Contiguous Block of Memory）**：所有数据按固定字节（如 64 位双精度 float64）整齐排列在一块连续物理内存中；
- **同构数据类型（Homogeneous `dtype`）**：数组内所有元素的数据类型严格完全相同，彻底消除运行时动态类型检查；
- **底层 C/Fortran 编译与 SIMD 向量加速**：一次 CPU 周期可同时并行处理 4~8 个浮点数计算，性能相比原生 Python for 循环往往**快 50 到 100 倍**！

```
Python 原生列表 list 内存模型 (指针跳转，离散分散):
┌──────────────┐    ┌─────────────────┐
│ 指针 0 ──────┼───>│ PyObject(int 1) │
├──────────────┤    └─────────────────┘
│ 指针 1 ──────┼───────┐
└──────────────┘       ▼
                    ┌─────────────────┐
                    │ PyObject(int 2) │
                    └─────────────────┘

NumPy ndarray 物理内存模型 (整齐平铺，直接寻址，超快):
┌─────────┬─────────┬─────────┬─────────┐
│ float64 │ float64 │ float64 │ float64 │  <-- 连续 32 字节物理缓存，SIMD 并行读取
└─────────┴─────────┴─────────┴─────────┘
```

---

### 三、逐步代码演练与执行分析

```python
import numpy as np
import time

# 性能大比拼：千万次平方计算
size = 500000

# 1. 纯 Python 列表推导式
t0 = time.perf_counter()
py_list = list(range(size))
py_res = [x ** 2 for x in py_list]
t1 = time.perf_counter()

# 2. NumPy 向量化数组计算
t2 = time.perf_counter()
np_arr = np.arange(size)
np_res = np_arr ** 2  # 一行搞定，底层 C 循环
t3 = time.perf_counter()

print(f"原生 Python 耗时: {(t1 - t0)*1000:.2f} ms")
print(f"NumPy 向量化耗时: {(t3 - t2)*1000:.2f} ms")
print(f"NumPy 提速倍数: {(t1 - t0) / max(t3 - t2, 1e-6):.1f}x 倍！")
```

---

### 四、常见易错陷阱与排查技巧
1. **不要在 NumPy 数组上写 Python 的 for 循环！**
   - 很多初学者虽然把数据转成了 NumPy 数组，但依然习惯性写 `for i in range(len(arr)): arr[i] = arr[i] * 2`。这样做不仅享受不到底层 C 的向量化加速，反而因为在 Python 与 C 之间频繁跨界打包解包变得**比原生列表还要慢**！**正确姿势是一律使用向量化表达式 `arr = arr * 2`**。

---

### 五、本节小结
- 列表装指针效率低，NumPy 连续内存同构数组速度快。
- 绝不要在 ndarray 上写慢速 for 循环，拥抱整体向量化计算。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "切记：在 NumPy 数组上写 for x in arr: 会彻底抹杀 C 底层向量化性能，永远使用向量化运算表达式。"
                },
                {
                    "kind": "performance",
                    "text": "NumPy 数组是同构的，一旦指定 dtype（如 int32），就无法塞入字符串；若类型不符会自动尝试强制向下转型。"
                }
            ],
            "demos": [
                {
                    "title": "NumPy ndarray 核心属性探查",
                    "lang": "python",
                    "code": "import numpy as np\n\n# 创建一个 2 行 3 列的二维浮点矩阵\nmatrix = np.array([[1.5, 2.0, 3.5], [4.0, 5.5, 6.0]], dtype=np.float64)\n\nprint(\"数组内容:\\n\", matrix)\nprint(f\"维度数 (ndim): {matrix.ndim}\")\nprint(f\"形状形态 (shape): {matrix.shape}\")\nprint(f\"元素总数 (size): {matrix.size}\")\nprint(f\"数据类型 (dtype): {matrix.dtype}\")\nprint(f\"每个元素占字节数 (itemsize): {matrix.itemsize} 字节\")\n"
                }
            ]
        },
        {
            "id": "pyf-l10-2",
            "title": "ndarray 核心：创建、形态重构 (shape/reshape) 与多维切片",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握 NumPy 多种常用数组构造函数（`zeros`, `ones`, `arange`, `linspace`），掌握 `shape` 查看与 `reshape` 维度重塑规则，精通二维数组的双轴切片语法与视图共享机制。
- **先修要求**：了解 ndarray 基础概念。

---

### 二、核心概念与术语解释

#### 1. 数组创建快速工厂函数
- `np.array(list_obj)`：将现有嵌套列表转换为数组；
- `np.zeros((rows, cols))`：生成全 0 矩阵（常用于初始化缓冲区）；
- `np.ones((rows, cols))`：生成全 1 矩阵；
- `np.arange(start, stop, step)`：生成等差整数序列（类似于 range，但直接返回 ndarray）；
- `np.linspace(start, stop, num)`：在指定区间内生成 `num` 个**等间距**分布的浮点点位（在绘图和科学模拟中极其好用）。

#### 2. 维度形态重构：`reshape`
- 改变数组的几何视图，但不改变其内部元素的内存总数：
  ```python
  a = np.arange(12)          # 一维向量，长度 12
  b = a.reshape(3, 4)        # 重构为 3 行 4 列的二维矩阵
  c = a.reshape(2, -1)       # -1 代表自动推断：12 / 2 = 6 列！
  ```

#### 3. 二维多维切片语法：`arr[行切片, 列切片]`
在 Python 原生列表中，切取二维列表的某一列极其痛苦（必须写推导式 `[row[1] for row in matrix]`）。
而在 NumPy 中，直接用**逗号分隔不同轴（Axis）的切片**：
```python
matrix = np.array([
    [10, 20, 30],
    [40, 50, 60],
    [70, 80, 90]
])

# 提取第 0 行所有列
print(matrix[0, :])     # [10, 20, 30]

# 提取第 1 列所有行（瞬间完成列提取！）
print(matrix[:, 1])     # [20, 50, 80]

# 提取右上角 2x2 子矩阵
print(matrix[0:2, 1:3]) # [[20, 30], [50, 60]]
```

#### 4. 视图 (View) vs 拷贝 (Copy)
> [!CAUTION] 性能与陷阱一体两面
> 在 NumPy 中，**普通的切片操作返回的是原数组的“视图（View）”，它们共享同一份底层物理内存**！修改切片会直接同步修改原始数组！
> 如果需要独立的拷贝，必须显式调用 `.copy()`：`sub_arr = matrix[:, 1].copy()`。

---

### 三、逐步代码演练与执行分析

```python
import numpy as np

# 1. linspace 构造等距采样点
samples = np.linspace(0, 1, 5)
print("0 到 1 之间等距 5 个点:", samples)  # [0. , 0.25, 0.5 , 0.75, 1. ]

# 2. 提取矩阵子块并验证视图机制
grid = np.arange(16).reshape(4, 4)
print("原始 4x4 矩阵:\\n", grid)

sub_view = grid[1:3, 1:3]
print("截取的中心 2x2 子块:\\n", sub_view)

# 修改子块并观察原矩阵
sub_view[0, 0] = 999
print("修改视图后，原矩阵对应的 (1,1) 位置也变成了:", grid[1, 1])  # 999！
```

---

### 四、常见易错陷阱与排查技巧
1. **reshape 元素总数不匹配**：
   - 包含 10 个元素的数组尝试 `reshape(3, 4)`，由于 3*4=12 != 10，会直接报 `ValueError: cannot reshape array of size 10 into shape (3,4)`。

---

### 五、本节小结
- 工厂函数 `arange` 与 `linspace` 灵活构造序列。
- `reshape` 重塑形状，`-1` 支持自动推断未定轴。
- 切片语法 `arr[row_slice, col_slice]`；切片返回视图共享内存，独立修改需 `.copy()`。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "NumPy 切片默认是视图而不是深拷贝！修改 sub = arr[:2] 的元素会直接影响原数组 arr。如需独立副本必须显式写 arr[:2].copy()。"
                }
            ],
            "demos": [
                {
                    "title": "二维矩阵切片与独立副本操作",
                    "lang": "python",
                    "code": "import numpy as np\n\n# 模拟图像灰度通道或时序传感器二维矩阵\nsensors = np.array([\n    [21.5, 22.0, 21.8],\n    [24.1, 25.0, 24.5],\n    [20.0, 20.2, 19.8],\n    [23.5, 23.8, 23.1]\n])\n\n# 提取所有传感器在第 1 号通道的读数 (列切片)\nch1_readings = sensors[:, 1]\nprint(\"第 1 号通道所有读数:\", ch1_readings)\nprint(f\"通道 1 均值: {ch1_readings.mean():.2f}℃, 最高温: {ch1_readings.max():.2f}℃\")\n"
                }
            ]
        },
        {
            "id": "pyf-l10-3",
            "title": "向量化计算与广播机制 (Broadcasting) 深度解密",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握 NumPy 元素级算术运算与常用聚合函数（`sum`, `mean`, `max`, `std` 指定 `axis` 方向），精通布尔掩码（Boolean Masking）条件过滤，深刻理解**广播机制（Broadcasting）**的维度对齐规则。
- **先修要求**：已熟练掌握二维切片与多维数组属性。

---

### 二、核心概念与术语解释

#### 1. 逐元素向量化运算 (Element-wise Operations)
在 NumPy 中，数学运算符直接作用于数组的每一个元素上，彻底省去遍历代码：
```python
a = np.array([1, 2, 3])
print(a + 10)       # [11, 12, 13]
print(a * 2)        # [2, 4, 6]
print(np.sin(a))    # 对每个元素计算正弦值
```

#### 2. 统计聚合函数与轴（`axis`）的概念
- **`arr.sum()`**：对全数组所有元素求和；
- **`axis=0`（沿纵轴/垂直方向跨行聚合）**：**按列计算**，输出每一列的汇总结果；
- **`axis=1`（沿横轴/水平方向跨列聚合）**：**按行计算**，输出每一行的汇总结果。
> 记忆口诀：`axis=0` 压缩行保留列，`axis=1` 压缩列保留行。

#### 3. 布尔掩码条件过滤（Boolean Masking）
可以用比较运算符直接生成一个由 `True/False` 构成的同形态布尔数组，并将其作为索引直接筛选满足条件的元素：
```python
scores = np.array([55, 88, 92, 45, 78])
mask = scores >= 60          # array([False,  True,  True, False,  True])
passed_scores = scores[mask] # array([88, 92, 78]) 瞬间完成过滤！
```

#### 4. 广播机制（Broadcasting）两大匹配铁律
当两个形状不相同的数组进行运算时，NumPy 会在后台自动将较小的数组“广播扩展”为较大数组的形状。
**能否广播成功的严格规则**：
从两个数组的**末尾维度（最右侧轴）开始向前逐一比对**：
1. **两个轴的长度相等**；
2. **或者其中一个轴的长度恰好为 1**。
若以上两个条件对所有维度都满足，则广播合法；否则抛出 `ValueError: operands could not be broadcast together`。

```
数组 A:  (4, 3)    4 行 3 列矩阵
数组 B:     (3,)    1 行 3 列向量 -> 自动扩展为 (1, 3) 再广播为 (4, 3)
结果:    (4, 3)    完美合法！
```

---

### 三、逐步代码演练与执行分析

```python
import numpy as np

# 模拟 3 名学员在 4 门课程上的考试得分
scores = np.array([
    [85, 90, 78, 92],  # 学员 A
    [70, 65, 80, 75],  # 学员 B
    [95, 98, 91, 94]   # 学员 C
])

# 1. 沿不同轴聚合计算
print("各学员的个人平均分 (axis=1):", scores.mean(axis=1).round(1))
print("各单科课程的班级平均分 (axis=0):", scores.mean(axis=0).round(1))

# 2. 广播实战：对各科成绩进行班级去中心化（减去各科均值）
subject_means = scores.mean(axis=0)  # 形状为 (4,)
centered_scores = scores - subject_means  # 形状 (3, 4) 减去 (4,)，触发自动广播！
print("去中心化后的离差矩阵:\\n", centered_scores.round(1))

# 3. 布尔索引：提取所有 90 分以上的优秀成绩
excellent_scores = scores[scores >= 90]
print("优秀单科成绩列表:", excellent_scores)
```

---

### 四、常见易错陷阱与排查技巧
1. **广播形状不兼容报错**：
   - 形状为 `(3, 4)` 的矩阵试图与形状为 `(3,)` 的一维向量相加。因为从右往左比对，4 和 3 既不相等也没有 1，直接抛出 `ValueError`！
   - **解决方案**：使用 `reshape(3, 1)` 或 `[:, np.newaxis]` 将其升维为 `(3, 1)`，即可合法广播。

---

### 五、本节小结
- 向量化算术消灭 Python 慢速循环。
- `axis=0` 纵向压缩求每列指标，`axis=1` 横向压缩求每行指标。
- 布尔掩码是数据清洗与离群值剔除的核心利器。
- 广播机制按末端对齐，长度相等或为 1 即可无缝扩展。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "理解 axis 的核心口诀：axis=0 表示跨行纵向压缩（求每列均值），axis=1 表示跨列横向压缩（求每行均值）。"
                }
            ],
            "demos": [
                {
                    "title": "广播机制与 Z-Score 数据标准化实战",
                    "lang": "python",
                    "code": "# 模拟对多维特征矩阵进行标准的 Z-score 标准化：(X - mean) / std\nimport numpy as np\n\n# 5 个样本，3 种特征观测值\nfeatures = np.array([\n    [10.0, 200.0, 1.2],\n    [12.0, 220.0, 1.5],\n    [9.0,  190.0, 1.1],\n    [15.0, 250.0, 1.8],\n    [11.0, 210.0, 1.4]\n])\n\n# 沿列方向计算均值与标准差\nmu = features.mean(axis=0)    # shape (3,)\nsigma = features.std(axis=0)  # shape (3,)\n\n# 利用广播机制一行完成全矩阵标准化\nz_scores = (features - mu) / sigma\n\nprint(\"特征均值 mu:\", mu.round(2))\nprint(\"特征标准差 sigma:\", sigma.round(2))\nprint(\"标准化后的 Z-score 矩阵 (各列均值逼近 0，方差逼近 1):\\n\", z_scores.round(3))\n"
                }
            ]
        }
    ],
    "exercises": [
        {
            "id": "pyf-ex-10-1",
            "type": "single",
            "difficulty": 1,
            "question": "在大规模密集数值计算中，NumPy 相比纯 Python 原生列表（list）能实现百倍提速的根本原因不包括哪一项？",
            "options": [
                {"value": "A", "label": "NumPy 数组内部物理内存紧凑连续，没有指针间接寻址与 Cache Miss 开销"},
                {"value": "B", "label": "NumPy 数组元素为同构数据类型（固定 dtype），消除了运行时的动态类型检查与装箱拆箱"},
                {"value": "C", "label": "NumPy 底层由 C/Fortran 编译优化，并能利用现代 CPU 的 SIMD 并行指令集"},
                {"value": "D", "label": "NumPy 运行时能够自动重写操作系统的底层操作系统内核"}
            ],
            "answer": "D",
            "explanation": "D 纯属荒谬编造。A（连续物理内存）、B（同构类型消除装箱）、C（C语言与 SIMD 并行）是 NumPy 高性能的三大物理基石。",
            "tags": ["NumPy原理", "底层物理架构"]
        },
        {
            "id": "pyf-ex-10-2",
            "type": "single",
            "difficulty": 2,
            "question": "已知二维数组 `arr` 的形状为 `(4, 5)`，执行聚合计算 `res = arr.mean(axis=0)`，结果 `res` 的形状是？",
            "options": [
                {"value": "A", "label": "(5,)"},
                {"value": "B", "label": "(4,)"},
                {"value": "C", "label": "(4, 1)"},
                {"value": "D", "label": "标量单一数值"}
            ],
            "answer": "A",
            "explanation": "axis=0 表示沿纵轴（跨行方向）压缩聚合，对 4 行做均值收拢，保留原有的 5 列，因此最终输出形状为包含 5 个元素的一维数组 (5,)。",
            "tags": ["axis", "聚合计算"]
        },
        {
            "id": "pyf-ex-10-3",
            "type": "judge",
            "difficulty": 2,
            "question": "在 NumPy 中，对数组执行常规切片（如 `sub = arr[1:3]`）所得到的是一个与原数组共享物理内存的视图（View），修改 `sub` 的元素会导致原数组 `arr` 也发生改变。",
            "answer": True,
            "explanation": "正确！这是 NumPy 追求极端内存效率的设计。切片不会盲目分配新内存，而是创建视图。需要完全独立的副本必须调用 .copy()。",
            "tags": ["视图与拷贝", "内存共享"]
        },
        {
            "id": "pyf-ex-10-4",
            "type": "fill",
            "difficulty": 2,
            "question": "若有 NumPy 数组 `arr`，想要筛选出其中所有严格大于 0 的数值元素，使用布尔索引的优雅写法是 `arr[_____]`。",
            "blanks": [["arr > 0"]],
            "explanation": "表达式 arr > 0 生成布尔掩码数组，作为索引传入 arr[arr > 0] 即可提取所有大于 0 的元素。",
            "tags": ["布尔索引", "条件筛选"]
        },
        {
            "id": "pyf-ex-10-5",
            "type": "single",
            "difficulty": 3,
            "question": "在 NumPy 广播（Broadcasting）规则中，以下哪一组数组形状之间**无法**成功进行算术运算（会抛出 ValueError）？",
            "options": [
                {"value": "A", "label": "形状 (3, 4) 与 形状 (3,)"},
                {"value": "B", "label": "形状 (3, 4) 与 形状 (4,)"},
                {"value": "C", "label": "形状 (3, 4) 与 形状 (1, 4)"},
                {"value": "D", "label": "形状 (3, 1) 与 形状 (1, 4)"}
            ],
            "answer": "A",
            "explanation": "广播必须从末尾维度开始向前对齐。对于 A，末尾是 4 与 3，两者既不相等且都不为 1，无法匹配，会抛出 ValueError；B、C、D 均满足末端相等或为 1 的合法规则。",
            "tags": ["广播机制", "维度对齐"]
        },
        {
            "id": "pyf-ex-10-6",
            "type": "multiple",
            "difficulty": 3,
            "question": "关于使用 NumPy 创建特定形态数组的工厂函数，下列描述正确的有？",
            "options": [
                {"value": "A", "label": "np.zeros((3, 2)) 会创建一个 3 行 2 列且所有元素都为 0.0 的浮点数组"},
                {"value": "B", "label": "np.linspace(0, 10, 5) 会在 0 到 10（含两端点）之间生成 5 个等间距分布的数值"},
                {"value": "C", "label": "np.arange(1, 10, 2) 包含起始点 1，但不包含终止点 10"},
                {"value": "D", "label": "数组的 reshape(-1, 2) 中，-1 代表由 NumPy 根据总元素数自动推断该维度大小"}
            ],
            "answer": ["A", "B", "C", "D"],
            "explanation": "四个选项描述全部符合 NumPy 的标准规范用法：zeros 创建全 0 矩阵；linspace 等距采样；arange 左闭右开；-1 自动推断维度。",
            "tags": ["工厂函数", "reshape"]
        },
        {
            "id": "pyf-ex-10-7",
            "type": "single",
            "difficulty": 4,
            "question": "已知二维数组：\n```python\nimport numpy as np\narr = np.arange(9).reshape(3, 3)\n```\n表达式 `arr[:2, 1:]` 截取出的子矩阵形状及其第一行元素是？",
            "options": [
                {"value": "A", "label": "形状为 (2, 2)，第一行元素为 [1, 2]"},
                {"value": "B", "label": "形状为 (2, 3)，第一行元素为 [0, 1, 2]"},
                {"value": "C", "label": "形状为 (3, 2)，第一行元素为 [1, 2]"},
                {"value": "D", "label": "形状为 (2, 2)，第一行元素为 [0, 1]"}
            ],
            "answer": "A",
            "explanation": "arr 是 [[0,1,2],[3,4,5],[6,7,8]]。行切片 :2 选取第 0, 1 两行；列切片 1: 选取第 1, 2 两列。因此子矩阵包含两行两列，第一行为 [1, 2]，形状为 (2, 2)。",
            "tags": ["多维切片", "代码阅读"]
        },
        {
            "id": "pyf-ex-10-8",
            "type": "code",
            "difficulty": 4,
            "question": "【动手编程】请编写一个矩阵行去中心化函数 `center_rows(mat: list) -> list`：\n- 输入一个由浮点数或整数构成的二维嵌套列表；\n- 使用 `np.array()` 将其转为 NumPy 数组；\n- 计算每一行的平均值（注意设置 `axis=1, keepdims=True`），使每一行元素减去该行自身的平均值；\n- 将计算结果转换为二维嵌套列表返回，数值保留 2 位小数。",
            "starterCode": "import numpy as np\n\ndef center_rows(mat: list) -> list:\n    # 请在此处使用 NumPy 广播机制完成行去中心化\n    pass\n",
            "expectedOutput": "[[-1.0, 1.0], [-2.0, 2.0]]",
            "answer": "import numpy as np\n\ndef center_rows(mat: list) -> list:\n    if not mat:\n        return []\n    arr = np.array(mat, dtype=float)\n    row_means = arr.mean(axis=1, keepdims=True)\n    centered = arr - row_means\n    return np.round(centered, 2).tolist()",
            "tests": "res = center_rows([[1, 3], [2, 6]])\nassert res == [[-1.0, 1.0], [-2.0, 2.0]]\nres2 = center_rows([[10, 10, 10]])\nassert res2 == [[0.0, 0.0, 0.0]]\nassert center_rows([]) == []\n",
            "explanation": "通过 arr.mean(axis=1, keepdims=True) 获得列向量形态的行均值，通过自动广播实现每行减去对应均值，最后用 np.round().tolist() 返回嵌套列表。",
            "tags": ["编程实操", "广播与去中心化"]
        }
    ]
}

CHAPTER_11 = {
    "id": "pyf-c11",
    "courseId": "python-foundations-data",
    "order": 11,
    "title": "pandas 核心数据处理与分析操作",
    "goal": "精通现代数据分析的事实标准 pandas，深入理解 Series 与 DataFrame 结构，熟练运用 .loc 与 .iloc 双重索引系统，掌握复合布尔过滤、groupby 分组聚合、多表 merge 连接与结果导出。",
    "lessons": [
        {
            "id": "pyf-l11-1",
            "title": "表格数据基石：Series 与 DataFrame 核心结构及数据探查",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：理解 pandas 的两大支柱结构——`Series`（带显式索引的一维标注序列）与 `DataFrame`（异构二维结构化数据表），掌握从字典或列表创建 DataFrame，熟练使用数据探索三板斧（`head()`, `info()`, `describe()`）快速摸清陌生数据特征。
- **先修要求**：熟练掌握字典、列表与 NumPy 数组基础。

---

### 二、核心概念与术语解释

#### 1. 为什么有了 NumPy 还需要 pandas？
NumPy 极度擅长同构数值数组的纯矩阵计算，但现实商业数据全部是**异构的表格数据**：
- 第 1 列是字符串姓名；
- 第 2 列是整数年龄；
- 第 3 列是浮点数工资；
- 第 4 列是日期时间；
- 并且每一行都有唯一的业务主键索引（如订单号）。
**pandas 就是为结构化表格数据而生的超级利器**！

#### 2. Series：带索引的 1 维序列
`Series` 可以看作是一个**固定长度的有序字典**，或者是一个**附带显式行标签（Index）的 NumPy 一维数组**：
```python
import pandas as pd
s = pd.Series([100, 200, 300], index=["苹果", "香蕉", "橙子"])
print(s["香蕉"])  # 200，支持按标签名称快速定位
```

#### 3. DataFrame：二维异构表格
`DataFrame` 由多个共用同一个行索引（Index）的 `Series` 拼接而成，每一列可以有不同的数据类型（`dtypes`）。
常见创建方式（由字典列表创建）：
```python
data = {
    "order_id": ["ORD-1", "ORD-2", "ORD-3"],
    "customer": ["Alice", "Bob", "Charlie"],
    "amount": [199.5, 450.0, 88.0]
}
df = pd.DataFrame(data)
```

#### 4. 数据探索三板斧
拿到任何一份陌生数据，永远按顺序执行以下三步：
1. **`df.head(n=5)`**：查看前 5 行样例，肉眼感知各列数据格式；
2. **`df.info()`**：查看每一列的非空值数量（Non-Null Count）与存储数据类型（dtype），快速定位哪一列存在缺失值或类型被错判为 object；
3. **`df.describe()`**：自动计算所有数值列的均值、标准差、分位数（25%, 50%, 75%）、最大最小值，秒级定位业务异常极值。

---

### 三、逐步代码演练与执行分析

```python
import pandas as pd

# 创建电商用户数据集
users_df = pd.DataFrame({
    "user_id": [1001, 1002, 1003, 1004],
    "city": ["北京", "上海", "广州", "北京"],
    "age": [25, 32, 18, 45],
    "spend_usd": [120.5, 380.0, 45.0, 950.2]
})

print("=== DataFrame 基础结构 ===")
print(users_df)

print("\\n=== 数值统计汇总 describe() ===")
print(users_df.describe().round(1))
```

---

### 四、常见易错陷阱与排查技巧
1. **数字列被识别为 object 类型**：
   - 如果 CSV 文件的数字列里混入了一个汉字（如“暂无”），pandas 会把整整一整列的所有数字全部降级推断为 `object`（纯文本）类型！这会导致后续对其做 `.mean()` 或 `.sum()` 时直接报错或拼成大长字符串。
   - **排查方法**：先看 `df.dtypes`，一旦发现金额列是 `object`，立即使用 `pd.to_numeric(df['col'], errors='coerce')` 强制清洗纠偏。

---

### 五、本节小结
- Series 是带标签的一维序列，DataFrame 是由 Series 组成的二维异构表格。
- 探索数据三步走：`head()` 看样例，`info()` 查缺失与类型，`describe()` 找统计极值。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "牢记：拿到新数据第一步必须执行 df.info()！核实各字段的真实 dtype，警惕本该是数值的金额列被悄悄识别为 object。"
                }
            ],
            "demos": [
                {
                    "title": "DataFrame 结构探查与信息汇总",
                    "lang": "python",
                    "code": "import pandas as pd\n\n# 模拟销售流水报表\nsales_data = {\n    'product': ['Python 讲义', 'SQL 实战', '算法导论', 'Excel 进阶'],\n    'sales_volume': [1500, 820, 430, 2100],\n    'unit_price': [89.0, 68.0, 128.0, 45.0],\n    'is_in_stock': [True, True, False, True]\n}\n\ndf = pd.DataFrame(sales_data)\nprint(\"=== 数据表前 2 行 ===\")\nprint(df.head(2))\n\nprint(\"\\n=== 衍生指标列：计算各产品总销售额 GMV ===\")\ndf['gmv'] = df['sales_volume'] * df['unit_price']\nprint(df[['product', 'gmv']])\n"
                }
            ]
        },
        {
            "id": "pyf-l11-2",
            "title": "数据选取与条件过滤：.loc vs .iloc 与复合布尔筛选",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：彻底分清 pandas 最著名的两大多维定位器——基于标签名字的 `.loc` 与基于物理整数下标的 `.iloc`，深刻理解它们在切片右边界包含上的重大差异，掌握使用 `&` 与 `|` 编写复合布尔掩码筛选行。
- **先修要求**：熟练掌握 DataFrame 基本概念。

---

### 二、核心概念与术语解释

#### 1. `.loc` vs `.iloc`：核心本质差异
| 定位器 | 检索依据 | 切片边界规则 | 经典代码 |
| :--- | :--- | :--- | :--- |
| **`.loc`** | **标签名称（Label-based）** | **闭区间（包含右边界！）** | `df.loc['row_label', 'col_name']` |
| **`.iloc`** | **物理整数位置（Integer-based）** | **左闭右开（不含右边界！）** | `df.iloc[0:5, 0:2]` |

> [!IMPORTANT] 史诗级区别：右边界包含性！
> - `df.iloc[0:3]` 提取的是索引为 0, 1, 2 的行（**不包含 3**，完全符合 Python 传统切片惯例）；
> - `df.loc['2024-01':'2024-03']` 提取的是 1月、2月 **并且包含 3月在内** 的所有行（**包含右边界**，符合人类对名称区间的认知）！

#### 2. 复合条件布尔筛选（Filtering）
在 pandas 中对数据行进行条件筛选时，有两个**极其致命的语法铁律**：
1. **多个条件之间必须使用按位运算符：`&`（与）、`|`（或）、`~`（非）**，**绝不能使用 Python 的英文单词 `and` / `or` / `not`**！
2. **每个独立的子条件表达式必须用英文小括号 `()` 紧紧包裹**！

**为什么必须加括号？**
因为在 Python 的运算符优先级中，按位运算符 `&` 的优先级比比较运算符 `>=` 还要高！
如果不加括号写成 `df['age'] >= 18 & df['city'] == '北京'`，解释器会先计算 `18 & df['city']`，直接引发惨烈的 `TypeError`！

```python
# 标准合法的复合条件过滤写法
subset = df[(df["age"] >= 18) & (df["city"] == "北京")]
```

---

### 三、逐步代码演练与执行分析

```python
import pandas as pd

df = pd.DataFrame({
    "name": ["张三", "李四", "王五", "赵六", "钱七"],
    "dept": ["技术", "市场", "技术", "财务", "市场"],
    "salary": [18000, 12000, 25000, 15000, 9000],
    "years": [3, 2, 6, 4, 1]
}, index=["E101", "E102", "E103", "E104", "E105"])

# 1. 使用 .loc 按行标签和列名精准定位
print("E103 员工薪资 (.loc):", df.loc["E103", "salary"])  # 25000

# 2. 使用 .iloc 按物理位置切片前两行、前两列
print("\\n前两行前两列 (.iloc):\\n", df.iloc[:2, :2])

# 3. 复合条件筛选：筛选技术部且薪资大于 20000 的资深专家
tech_seniors = df[(df["dept"] == "技术") & (df["salary"] > 20000)]
print("\\n技术部高薪员工:\\n", tech_seniors)
```

---

### 四、常见易错陷阱与排查技巧
1. **SettingWithCopyWarning 警告**：
   - 当写出诸如 `df[df['age'] > 18]['salary'] = 20000` 这样的链式索引赋值时，pandas 会抛出著名的 `SettingWithCopyWarning`，因为 pandas 无法保证你修改的是视图还是副本！
   - **黄金解决方案**：一律使用 `.loc` 进行显式定位赋值：
     `df.loc[df['age'] > 18, 'salary'] = 20000`。

---

### 五、本节小结
- `.loc` 按标签名且包含右边界；`.iloc` 按物理下标且不含右边界。
- 复合筛选牢记两点：用 `&` 与 `|`，且每个条件必须带括号 `(A) & (B)`。
- 修改赋值永远使用 `df.loc[row_mask, 'col'] = val`，消灭 SettingWithCopyWarning。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "切记：pandas 多条件筛选中，条件间必须用 & 或 |，且每个条件必须加括号，如 df[(df['a'] > 1) & (df['b'] < 5)]。"
                }
            ],
            "demos": [
                {
                    "title": "loc 条件过滤与 SettingWithCopy 规避演示",
                    "lang": "python",
                    "code": "import pandas as pd\n\norders = pd.DataFrame({\n    'order_id': ['O1', 'O2', 'O3', 'O4'],\n    'amount': [120.0, 85.0, 300.0, 45.0],\n    'status': ['PAID', 'PENDING', 'PAID', 'PAID'],\n    'vip_discount': [0.0, 0.0, 0.0, 0.0]\n})\n\n# 正确范式：使用 .loc 对满足条件的特定行进行安全就地修改赋值\norders.loc[(orders['status'] == 'PAID') & (orders['amount'] >= 100), 'vip_discount'] = 0.1\n\nprint(\"=== 规范更新折扣后的订单表 ===\")\nprint(orders)\n"
                }
            ]
        },
        {
            "id": "pyf-l11-3",
            "title": "分组聚合、多表合并与数据持久化：groupby、merge 与导出",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握现代数据分析的灵魂架构——**拆分-应用-合并（Split-Apply-Combine）**机制，熟练使用 `groupby().agg()` 计算复杂多指标报表，掌握类似于 SQL JOIN 的多表关系合并 `pd.merge()`，熟练将干净数据导出为 CSV/Excel。
- **先修要求**：熟练掌握 DataFrame 的筛选与定位。

---

### 二、核心概念与术语解释

#### 1. 分组聚合：Split-Apply-Combine 范式
1. **Split（拆分）**：按照指定的一个或多个维度字段（如城市、部门），把原本完整的大数据表切分为若干个互不重叠的小数据子组；
2. **Apply（应用）**：对每一个独立的小数据子组，分别调用聚合函数（如 `sum`, `mean`, `count`, `max`）计算汇总统计值；
3. **Combine（合并）**：将每个子组的统计结果组装拼回一张规整的指标报表。

```python
# 工业级标准写法：使用 .agg() 为不同列分别指定不同的统计函数
report = df.groupby("city").agg(
    total_revenue=("amount", "sum"),
    avg_order_value=("amount", "mean"),
    order_count=("order_id", "count")
).reset_index()
```
> 提示：分组聚合后分组键默认会变成行索引，最后追加 `.reset_index()` 可以将索引恢复为普通的数据列，便于后续导出和图表绘制。

#### 2. 多表合并：`pd.merge()`（对应 SQL JOIN）
在企业数据仓库中，数据分散在不同的关系表中（如用户表、订单表、商品表），通过共有键关联：
- `how=\"inner\"`（内连接，默认）：只保留两表中关联键都存在的记录；
- `how=\"left\"`（左连接，最常用！）：保留左表的全部行，右表匹配不上的字段自动填充为 `NaN`；
- `how=\"right\"`（右连接）：保留右表全部行；
- `how=\"outer\"`（全外连接）：保留两表所有行。

```python
merged_df = pd.merge(orders_df, users_df, on="user_id", how="left")
```

#### 3. 数据导出：`to_csv()` 与参数防御
清洗和聚合好的数据通常需要导出持久化存储供后续系统消费：
```python
# 必须带上 index=False，否则导出的 CSV 第一列会多出无意义的 0,1,2 数字索引
report.to_csv("daily_summary.csv", index=False, encoding="utf-8-sig")
```
> `utf-8-sig`：包含 UTF-8 BOM 签名，能够确保导出的 CSV 文件直接用 Microsoft Excel 双击打开时中文绝对不会乱码！

---

### 三、逐步代码演练与执行分析

```python
import pandas as pd

# 1. 模拟订单表与客户表
orders = pd.DataFrame({
    "order_id": ["O101", "O102", "O103", "O104"],
    "cust_id": ["C1", "C2", "C1", "C3"],
    "sales": [250.0, 180.0, 320.0, 95.0]
})

customers = pd.DataFrame({
    "cust_id": ["C1", "C2", "C3", "C4"],
    "cust_name": ["腾讯", "阿里巴巴", "字节跳动", "美团"],
    "region": ["华南", "华东", "华北", "华北"]
})

# 2. 关系连接：左合并注入客户名称与所属大区
full_orders = pd.merge(orders, customers, on="cust_id", how="left")
print("=== 关联后的完整明细表 ===")
print(full_orders)

# 3. 分组聚合：按大区分组统计总销售额与单均客单价
region_summary = full_orders.groupby("region").agg(
    total_sales=("sales", "sum"),
    avg_sales=("sales", "mean"),
    order_count=("order_id", "count")
).reset_index()

print("\\n=== 大区分组业绩看板 ===")
print(region_summary.round(2))
```

---

### 四、常见易错陷阱与排查技巧
1. **多表关联后数据行数意外膨胀（笛卡尔积灾难）**：
   - 如果右表中的关联键 `on='user_id'` 存在重复数据（例如右表同一用户有多条记录），左连接会导致左表的一行数据匹配出多行，使得整个数据集行数瞬间爆炸膨胀翻倍！
   - **预防原则**：在 `merge` 之前，必须先对右表的关联键做去重或唯一性校验（`right_df['id'].is_unique`）。

---

### 五、本节小结
- `groupby().agg()` 优雅落地 Split-Apply-Combine 范式，配合 `reset_index()` 扁平化。
- `pd.merge(how='left')` 对应 SQL 左连接，关联前需防范重复键导致行数爆炸。
- 导出 CSV 务必配置 `index=False` 与 `encoding='utf-8-sig'`。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "使用 df.to_csv() 导出报表时，务必加上 index=False，否则导出的表格第一列会自动多出一列无标题的数字行号。"
                },
                {
                    "kind": "performance",
                    "text": "导出的 CSV 如果需要直接给业务人员在 Windows Excel 中双击打开，建议指定 encoding='utf-8-sig' 彻底防止 Excel 中文乱码。"
                }
            ],
            "demos": [
                {
                    "title": "多表关联与多聚合指标计算全流程实战",
                    "lang": "python",
                    "code": "# 模拟从明细表到商业报表的全链路\nimport pandas as pd\n\ntransactions = pd.DataFrame({\n    'tx_id': ['T1', 'T2', 'T3', 'T4', 'T5'],\n    'channel': ['线上', '线下', '线上', '线上', '线下'],\n    'amount': [150.0, 200.0, 99.0, 320.0, 80.0]\n})\n\n# 渠道综合指标统计\nkpi = transactions.groupby('channel').agg(\n    gmv=('amount', 'sum'),\n    avg_ticket=('amount', 'mean'),\n    transactions=('tx_id', 'count')\n).reset_index()\n\nkpi['avg_ticket'] = kpi['avg_ticket'].round(2)\nprint(\"=== 渠道经营看板 ===\")\nprint(kpi)\n"
                }
            ]
        }
    ],
    "exercises": [
        {
            "id": "pyf-ex-11-1",
            "type": "single",
            "difficulty": 1,
            "question": "在 pandas 中，关于 `.loc` 与 `.iloc` 在切片范围（Slice Range）上的右边界包含规则，下列描述正确的是？",
            "options": [
                {"value": "A", "label": ".loc 是包含右边界的闭区间；.iloc 是不包含右边界的左闭右开区间"},
                {"value": "B", "label": ".loc 是不包含右边界的左闭右开区间；.iloc 是包含右边界的闭区间"},
                {"value": "C", "label": "两者都严格不包含右边界"},
                {"value": "D", "label": "两者都严格包含右边界"}
            ],
            "answer": "A",
            "explanation": ".loc 基于标签名称，为了方便按名称区间截取（如 '2024-01':'2024-03' 包含 3 月），采用包含右边界的闭区间；.iloc 基于整数下标，遵循 Python 传统切片的不含右边界规则。",
            "tags": ["loc", "iloc", "切片边界"]
        },
        {
            "id": "pyf-ex-11-2",
            "type": "single",
            "difficulty": 2,
            "question": "在对 DataFrame 进行多条件筛选时，为什么每个子条件必须用括号包裹（例如 `df[(df['a']>1) & (df['b']<5)]`）？",
            "options": [
                {"value": "A", "label": "因为按位运算符 & 的优先级高于比较运算符 > 和 <，不加括号会导致语法或运算顺序错乱"},
                {"value": "B", "label": "因为 Python 解释器在没有括号时会自动把条件全部当成字符串处理"},
                {"value": "C", "label": "纯粹是为了代码排版美观，即使不加括号也完全能正常运行"},
                {"value": "D", "label": "因为 pandas 的底层代码是用 Fortran 编写的"}
            ],
            "answer": "A",
            "explanation": "在 Python 运算符优先级中，位运算符 & 的优先级高于比较运算符 >、< 等。若不加括号，会被优先结合为中间的运算导致 TypeError，因此必须给每个子条件加括号。",
            "tags": ["布尔过滤", "优先级"]
        },
        {
            "id": "pyf-ex-11-3",
            "type": "judge",
            "difficulty": 2,
            "question": "使用 `df.to_csv(\"output.csv\")` 将 DataFrame 导出为 CSV 文件时，如果不传递 `index=False` 参数，导出的文件第一列默认会包含一列由 0 开始的数字行索引。",
            "answer": True,
            "explanation": "正确！to_csv() 默认 index=True 会把当前 DataFrame 的行索引作为第一列输出。在绝大多数商业分析场景中，需显式声明 index=False 避免多出无名列。",
            "tags": ["数据导出", "to_csv"]
        },
        {
            "id": "pyf-ex-11-4",
            "type": "fill",
            "difficulty": 2,
            "question": "在对销售表 `df` 进行多表左连接关联客户表 `customers`（以共有键 `user_id` 关联）时，使用的标准 pandas 函数调用是 `pd._____(df, customers, on=\"user_id\", how=\"left\")`。",
            "blanks": [["merge"]],
            "explanation": "pd.merge() 是 pandas 实现多表关系连接（对应 SQL JOIN）的核心函数。",
            "tags": ["merge", "多表关联"]
        },
        {
            "id": "pyf-ex-11-5",
            "type": "single",
            "difficulty": 3,
            "question": "观察以下代码执行过程：\n```python\nimport pandas as pd\ndf = pd.DataFrame({\"city\": [\"A\", \"B\", \"A\", \"B\"], \"val\": [10, 20, 30, 40]})\nres = df.groupby(\"city\")[\"val\"].mean()\n```\n变量 `res` 的数据类型与内容是：",
            "options": [
                {"value": "A", "label": "一个以 city 为索引的 Series，索引 A 对应 20.0，B 对应 30.0"},
                {"value": "B", "label": "一个包含 2 行 2 列的 DataFrame"},
                {"value": "C", "label": "一个 Python 原生字典"},
                {"value": "D", "label": "单一标量数值 25.0"}
            ],
            "answer": "A",
            "explanation": "对单个列执行 groupby(...)[col].mean() 返回的是一个 pandas Series，分组字段 city 自动变为其 Index，A 的均值为 (10+30)/2=20.0，B 为 (20+40)/2=30.0。",
            "tags": ["groupby", "聚合结果"]
        },
        {
            "id": "pyf-ex-11-6",
            "type": "multiple",
            "difficulty": 3,
            "question": "关于在进行多表合并 `pd.merge(left_df, right_df, on='key', how='left')` 时的工程注意事项，下列说法正确的有？",
            "options": [
                {"value": "A", "label": "若右表 right_df 中的关联键存在重复记录，会导致合并后的行数超过 left_df 原有的行数（数据行数膨胀）"},
                {"value": "B", "label": "左连接保证左表 left_df 的全部记录完整保留，右表匹配不上的字段默认填充为 NaN 缺失值"},
                {"value": "C", "label": "在合并前对右表的关联键进行唯一性核查是防范笛卡尔积膨胀的良好习惯"},
                {"value": "D", "label": "左连接会自动把右表的所有字符串列强行转换为浮点数"}
            ],
            "answer": ["A", "B", "C"],
            "explanation": "A、B、C 均为关系数据库与 pandas 连接时的核心规律与防御性实践；D 是荒谬无依据的表述。",
            "tags": ["merge", "工程防范"]
        },
        {
            "id": "pyf-ex-11-7",
            "type": "single",
            "difficulty": 4,
            "question": "在进行数据清洗时，发现某一列看似全是数字，但 `df.dtypes` 却显示其为 `object`。若希望将该列安全转为浮点数，遇到非数字脏文本时将其转换为 `NaN` 而不使程序崩溃，最佳代码是？",
            "options": [
                {"value": "A", "label": "pd.to_numeric(df['col'], errors='coerce')"},
                {"value": "B", "label": "df['col'].astype(float)"},
                {"value": "C", "label": "df['col'].apply(float)"},
                {"value": "D", "label": "float(df['col'])"}
            ],
            "answer": "A",
            "explanation": "pd.to_numeric(s, errors='coerce') 是工业级转换利器，遇到无法解析的脏字符会自动降级转化为 NaN 缺失值，而不会像 astype(float) 那样直接抛出 ValueError 崩溃中断。",
            "tags": ["类型清洗", "to_numeric"]
        },
        {
            "id": "pyf-ex-11-8",
            "type": "code",
            "difficulty": 4,
            "question": "【动手编程】请编写数据分析函数 `filter_and_aggregate_orders(orders_df)`：\n- 传入包含列 `['order_id', 'city', 'amount', 'status']` 的 DataFrame；\n- 筛选出 `status == 'COMPLETED'` 且 `amount >= 100.0` 的有效订单；\n- 按 `city` 分组，计算每个城市的订单总金额 `total_gmv`（对 `amount` 求和并保留 2 位小数）与有效订单数 `order_count`；\n- 结果通过 `.reset_index()` 重置索引后返回 DataFrame。",
            "starterCode": "import pandas as pd\n\ndef filter_and_aggregate_orders(orders_df: pd.DataFrame) -> pd.DataFrame:\n    # 请在此处完成复合筛选与分组聚合\n    pass\n",
            "expectedOutput": "city, total_gmv, order_count",
            "answer": "import pandas as pd\n\ndef filter_and_aggregate_orders(orders_df: pd.DataFrame) -> pd.DataFrame:\n    if orders_df.empty:\n        return pd.DataFrame(columns=['city', 'total_gmv', 'order_count'])\n    # 复合筛选\n    valid = orders_df[(orders_df['status'] == 'COMPLETED') & (orders_df['amount'] >= 100.0)]\n    # 分组聚合\n    res = valid.groupby('city').agg(\n        total_gmv=('amount', 'sum'),\n        order_count=('order_id', 'count')\n    ).reset_index()\n    res['total_gmv'] = res['total_gmv'].round(2)\n    return res",
            "tests": "import pandas as pd\ndf_sample = pd.DataFrame({\n    'order_id': ['1', '2', '3', '4'],\n    'city': ['北京', '上海', '北京', '广州'],\n    'amount': [150.0, 80.0, 200.0, 300.0],\n    'status': ['COMPLETED', 'COMPLETED', 'REFUNDED', 'COMPLETED']\n})\nres = filter_and_aggregate_orders(df_sample)\nassert len(res) == 2  # 北京 1 单, 广州 1 单 (上海金额 < 100 被筛掉, 北京第 2 单退款被筛掉)\nbj_row = res[res['city'] == '北京'].iloc[0]\nassert bj_row['total_gmv'] == 150.0\nassert bj_row['order_count'] == 1\n",
            "explanation": "使用 (status=='COMPLETED') & (amount>=100.0) 复合过滤，然后按 city 执行 groupby().agg()，最终 reset_index() 返回整洁看板表格。",
            "tags": ["编程实操", "pandas综合"]
        }
    ]
}

CHAPTER_12 = {
    "id": "pyf-c12",
    "courseId": "python-foundations-data",
    "order": 12,
    "title": "数据清洗综合实战与贯穿式结课项目",
    "goal": "系统掌握生产级脏数据识别与治理原则（缺失值填充/剔除、重复行识别、数据契约校验），独立完成贯穿式电商销售与学员订单全流程清洗、聚合统计与指标导出综合项目。",
    "lessons": [
        {
            "id": "pyf-l12-1",
            "title": "真实业务数据清洗法则：缺失值 (NaN)、重复记录与类型校验",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握现实世界中脏数据的三大主要形态（缺失、重复、类型不合规），熟练运用 `isna()`, `dropna()`, `fillna()`, `drop_duplicates()` 制定科学的清洗治理策略，建立生产级数据管道质量防御思维。
- **先修要求**：熟练掌握 pandas 的 Series、DataFrame 与向量化操作。

---

### 二、核心概念与术语解释

#### 1. 缺失值（Missing Data / NaN）的治理策略
在 pandas 中，数值型缺失值用浮点型的特殊标记 `NaN`（Not a Number）或 `None` 表示。
- **探测缺失**：`df.isna().sum()`（按列统计每列各有多少个缺失值）；
- **策略一：整行/整列删除（`dropna`）**：
  - `df.dropna(subset=['order_id'])`：业务主键缺失的数据没有任何意义，必须果断直接剔除；
  - `df.dropna(thresh=5)`：整行有效数据不足 5 个字段的严重残缺行予以删除；
- **策略二：合理填充插补（`fillna`）**：
  - 固定默认值填充：`df['discount'].fillna(0.0)`（未填优惠券默认为无优惠）；
  - 统计学均值/中位数填充：`df['age'].fillna(df['age'].median())`（适合偏态分布）；
  - 前向/后向时序填充：`df['price'].ffill()`（用最近一次有效价格填充断点）。

#### 2. 重复记录（Duplicates）治理
- **探测重复**：`df.duplicated(subset=['order_id'])` 返回布尔序列；
- **剔除重复**：`df.drop_duplicates(subset=['order_id'], keep='last')`
  - `keep='first'`（默认保留第一次出现的记录）；
  - `keep='last'`（保留最后一次出现的记录，常用于以最新更新时间戳为准覆盖旧状态）。

#### 3. 字段清洗三步走
1. **字符串前后空格与异常符号清洗**：`df['name'] = df['name'].str.strip()`；
2. **去除货币符号与标点**：`df['amount'] = df['amount'].str.replace('¥', '').str.replace(',', '')`；
3. **强制转为标准数据类型**：`df['amount'] = pd.to_numeric(df['amount'], errors='coerce')`。

---

### 三、逐步代码演练与执行分析

```python
import pandas as pd
import numpy as np

# 构建一份典型的脏业务数据表
dirty_data = pd.DataFrame({
    "order_id": ["ORD-1", "ORD-2", "ORD-2", "ORD-3", None],
    "amount_str": ["¥199.00", "¥85.50", "¥85.50", "未知", "¥320.00"],
    "discount": [20.0, None, None, 10.0, 50.0],
    "city": ["北京 ", " 上海", "上海", "广州", "深圳"]
})

print("=== 原始脏数据 ===")
print(dirty_data)

# 1. 剔除业务主键缺失的无效行
step1 = dirty_data.dropna(subset=["order_id"]).copy()

# 2. 剔除订单号重复的记录
step2 = step1.drop_duplicates(subset=["order_id"], keep="first").copy()

# 3. 清洗城市列空格
step2["city"] = step2["city"].str.strip()

# 4. 清洗金额：去除货币符号并强制转数值（无法解析的变为 NaN）
clean_amount_str = step2["amount_str"].str.replace("¥", "")
step2["amount"] = pd.to_numeric(clean_amount_str, errors="coerce")

# 5. 优惠券缺失填充为 0
step2["discount"] = step2["discount"].fillna(0.0)

# 6. 金额缺失用中位数填充
median_amt = step2["amount"].median()
step2["amount"] = step2["amount"].fillna(median_amt)

# 7. 计算实付金额并保留最终结果
step2["final_paid"] = step2["amount"] - step2["discount"]

print("\\n=== 清洗后的高可用整洁数据 ===")
print(step2[["order_id", "city", "amount", "discount", "final_paid"]])
```

---

### 四、常见易错陷阱与排查技巧
1. **使用 `df == np.nan` 判断缺失值**：
   - 根据 IEEE 754 浮点规范，**`np.nan == np.nan` 的结果永远是 `False`**！
   - 严禁使用等于号判断缺失值，必须使用 `pd.isna(x)` 或 `df['col'].isna()`！

---

### 五、本节小结
- 缺失值处理：关键业务键删除，可选数值根据业务逻辑填默认值、均值或中位数。
- 去重使用 `drop_duplicates`，按业务主键指定 `subset`。
- 文本转数值必须完成“strip -> replace符号 -> to_numeric(errors='coerce')”流水线。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "绝对不要写 df['col'] == np.nan！在计算机科学中 NaN 不等于任何值包括它自身，判断缺失必须写 df['col'].isna()。"
                }
            ],
            "demos": [
                {
                    "title": "缺失值按列探查与中位数智能填充实战",
                    "lang": "python",
                    "code": "# 模拟学员成绩缺失值诊断与插补\nimport pandas as pd\nimport numpy as np\n\nscores = pd.DataFrame({\n    'student': ['小明', '小红', '小刚', '小丽', '小强'],\n    'math': [95.0, np.nan, 88.0, 75.0, np.nan],\n    'english': [85.0, 92.0, np.nan, 80.0, 89.0]\n})\n\nprint(\"=== 各科目缺失值数量统计 ===\")\nprint(scores.isna().sum())\n\n# 对数学和英语分别用班级中位数填充\nclean_scores = scores.copy()\nclean_scores['math'] = clean_scores['math'].fillna(clean_scores['math'].median())\nclean_scores['english'] = clean_scores['english'].fillna(clean_scores['english'].median())\n\nprint(\"\\n=== 中位数插补后的成绩单 ===\")\nprint(clean_scores)\n"
                }
            ]
        },
        {
            "id": "pyf-l12-2",
            "title": "贯穿式综合结课项目：电商多渠道销售与学员订单全流程清洗统计导出",
            "difficulty": 1,
            "content": """### 一、项目背景与能力目标
本结课项目将前面 11 个模块的所有核心知识（文件读写、异常处理、正则表达式、日期转换、NumPy 向量化计算与 pandas 聚合）融会贯通，**构建一个工业级端到端数据清洗与经营分析流水线（Pipeline）**。

#### 核心能力目标
1. 从模拟的非结构化 CSV 数据源中，加载包含各种现实噪声的脏数据；
2. 识别并剔除主键缺失、非法日期与重复刷单记录；
3. 规范化字段格式：解析混杂的日期时间、去除金额与汇率字符；
4. 运用向量化计算衍生商业特征：计算实付总额（GMV）、优惠抵扣率；
5. 分组聚合统计各渠道的总营收、客单价、高价值订单占比；
6. 格式化输出商业分析仪表盘，并导出规整的数据资产。

---

### 二、内置项目原始数据集剖析
以下为模拟某多渠道教育与电商平台在 2024 年 5 月份采集到的原始交易数据片段（已内置在代码中，学习者可一键运行）：

```csv
order_id,cust_name,channel,raw_amount,discount,status,order_time
ORD-2024-001,张伟,APP线上,¥199.00,20.0,PAID,2024-05-01 10:20:00
ORD-2024-002,李芳,天猫旗舰店,¥350.50,50.0,PAID,2024-05-01 11:35:12
ORD-2024-003,王磊,微信小程序,¥88.00,,PAID,2024-05-02 09:10:00
ORD-2024-002,李芳,天猫旗舰店,¥350.50,50.0,PAID,2024-05-01 11:35:12
ORD-2024-004,赵强,APP线上,¥450.00,0.0,REFUNDED,2024-05-02 14:20:00
,匿名,线下门店,¥100.00,0.0,PAID,2024-05-02 16:00:00
ORD-2024-005,钱进,微信小程序,¥1280.00,150.0,PAID,2024-05-03 18:45:00
ORD-2024-006,孙浩,天猫旗舰店,无效金额,0.0,PAID,2024-05-03 20:10:00
ORD-2024-007,周敏,APP线上,¥299.00,30.0,PAID,2024-05-04 12:05:00
```

**该数据包含典型的 6 处业务数据暗坑**：
1. `ORD-2024-002` 存在完全重复上传记录；
2. 第 6 行缺少关键主键 `order_id`；
3. `raw_amount` 混杂货币符号 `¥` 与脏文本 `'无效金额'`；
4. `discount` 字段存在空值缺失；
5. `status` 包含已退款 `'REFUNDED'` 订单（不能计入有效营业额）；
6. `order_time` 为纯字符串，无法直接按日期天数聚合。

---

### 三、全流程清洗流水线代码实现

```python
import io
import pandas as pd
import numpy as np

# 1. 模拟数据载入
RAW_CSV = '''order_id,cust_name,channel,raw_amount,discount,status,order_time
ORD-2024-001,张伟,APP线上,¥199.00,20.0,PAID,2024-05-01 10:20:00
ORD-2024-002,李芳,天猫旗舰店,¥350.50,50.0,PAID,2024-05-01 11:35:12
ORD-2024-003,王磊,微信小程序,¥88.00,,PAID,2024-05-02 09:10:00
ORD-2024-002,李芳,天猫旗舰店,¥350.50,50.0,PAID,2024-05-01 11:35:12
ORD-2024-004,赵强,APP线上,¥450.00,0.0,REFUNDED,2024-05-02 14:20:00
,匿名,线下门店,¥100.00,0.0,PAID,2024-05-02 16:00:00
ORD-2024-005,钱进,微信小程序,¥1280.00,150.0,PAID,2024-05-03 18:45:00
ORD-2024-006,孙浩,天猫旗舰店,无效金额,0.0,PAID,2024-05-03 20:10:00
ORD-2024-007,周敏,APP线上,¥299.00,30.0,PAID,2024-05-04 12:05:00
'''

def run_etl_pipeline(csv_raw_text: str):
    print(">>> 步骤 1: 载入原始数据流...")
    df = pd.read_csv(io.StringIO(csv_raw_text.strip()))
    print(f"原始记录总行数: {len(df)}")
    
    print("\\n>>> 步骤 2: 主键治理与去重...")
    # 剔除 order_id 缺失的数据
    df = df.dropna(subset=['order_id']).copy()
    # 剔除重复订单号
    df = df.drop_duplicates(subset=['order_id'], keep='first').copy()
    print(f"主键清洗与去重后剩余行数: {len(df)}")
    
    print("\\n>>> 步骤 3: 格式清洗与类型规范化...")
    # 清洗金额列：去除人民币符号，强制转数值
    clean_amt = df['raw_amount'].str.replace('¥', '')
    df['amount'] = pd.to_numeric(clean_amt, errors='coerce')
    # 剔除金额解析失败的脏行
    df = df.dropna(subset=['amount']).copy()
    # 优惠金额缺失填 0.0
    df['discount'] = df['discount'].fillna(0.0)
    # 解析日期时间
    df['order_dt'] = pd.to_datetime(df['order_time'])
    df['order_date'] = df['order_dt'].dt.date
    
    print("\\n>>> 步骤 4: 业务规则过滤与指标衍生...")
    # 仅保留支付成功且未退款的有效订单
    valid_orders = df[df['status'] == 'PAID'].copy()
    # 计算实际支付金额 (Net Amount)
    valid_orders['final_paid'] = valid_orders['amount'] - valid_orders['discount']
    # 标记是否为高价值订单（实付 >= 300）
    valid_orders['is_high_value'] = valid_orders['final_paid'] >= 300.0
    
    print("\\n>>> 步骤 5: 商业聚合大屏输出...")
    channel_kpi = valid_orders.groupby('channel').agg(
        gmv=('final_paid', 'sum'),
        avg_order_value=('final_paid', 'mean'),
        total_orders=('order_id', 'count'),
        high_value_orders=('is_high_value', 'sum')
    ).reset_index()
    
    channel_kpi['gmv'] = channel_kpi['gmv'].round(2)
    channel_kpi['avg_order_value'] = channel_kpi['avg_order_value'].round(2)
    
    return valid_orders, channel_kpi

cleaned_orders, channel_report = run_etl_pipeline(RAW_CSV)
print("\\n=== 全渠道销售业绩汇总看板 ===")
print(channel_report)
```

---

### 四、执行分析与成果验收
- **输入**：9 行杂乱无章的原始文本。
- **输出 1**：一份经过 100% 格式纠偏、无重复、无缺失的可信明细资产 `cleaned_orders`；
- **输出 2**：一份按业务渠道自动统计 GMV、客单价、高客单笔数的核心经营看板 `channel_report`。
- **结论**：整个数据处理过程完全自动化、幂等可重跑，学员已完全具备编写真实工程级数据处理脚本的独立能力！

---

### 五、权威参考资料与全课程结语
- **NumPy 官方教程**：《NumPy: the absolute basics for beginners》 (NumPy Documentation, BSD License)
  - 链接：https://numpy.org/doc/stable/user/absolute_beginners.html
- **pandas 官方入门**：《10 Minutes to pandas》 (pandas Development Team, BSD License)
  - 链接：https://pandas.pydata.org/docs/getting_started/intro_tutorials/
- **《Python for Everybody》**：Chapter 11-14 "Data Analysis & Visualization" (Charles R. Severance)
  - 链接：https://www.py4e.com/
""",
            "tips": [
                {
                    "kind": "note",
                    "text": "恭喜完成全部 12 个模块的学习！现在你已经具备了独立阅读和编写数据清洗、分析与报表自动化脚本的完整技能。"
                }
            ],
            "demos": [
                {
                    "title": "贯穿式数据管道完整运行演示",
                    "lang": "python",
                    "code": "# 运行端到端数据清洗与各渠道 GMV 测算管道\nimport io\nimport pandas as pd\n\nraw_data = '''id,channel,price_str,qty,status\n101,线上,¥199.0,2,SUCCESS\n102,线下,¥450.0,1,SUCCESS\n103,线上,¥80.0,3,CANCELLED\n101,线上,¥199.0,2,SUCCESS\n104,线上,¥120.0,1,SUCCESS\n'''\n\ndf = pd.read_csv(io.StringIO(raw_data.strip()))\n# 去重与状态过滤\ndf = df.drop_duplicates(subset=['id']).copy()\ndf = df[df['status'] == 'SUCCESS'].copy()\n# 金额清洗\ndf['price'] = df['price_str'].str.replace('¥', '').astype(float)\ndf['subtotal'] = df['price'] * df['qty']\n\n# 渠道统计\nkpi = df.groupby('channel').agg(\n    gmv=('subtotal', 'sum'),\n    orders=('id', 'count')\n).reset_index()\n\nprint(\"=== 清洗聚合管道执行成功 ===\")\nprint(kpi)\n"
                }
            ]
        }
    ],
    "exercises": [
        {
            "id": "pyf-ex-12-1",
            "type": "single",
            "difficulty": 2,
            "question": "在 Python 中，如果试图执行 `float('nan') == float('nan')`，其比较运算结果是？",
            "options": [
                {"value": "A", "label": "False（因为 NaN 不等于任何值，包括其自身）"},
                {"value": "B", "label": "True"},
                {"value": "C", "label": "抛出 NaNComparisonError 异常"},
                {"value": "D", "label": "返回 None"}
            ],
            "answer": "A",
            "explanation": "根据 IEEE 754 国际浮点标准，NaN（非数值）具有特殊的性质：任何对 NaN 的相等性比较（==）结果都严格为 False。因此判断缺失值必须使用 math.isnan() 或 pd.isna()。",
            "tags": ["NaN特性", "IEEE 754"]
        },
        {
            "id": "pyf-ex-12-2",
            "type": "single",
            "difficulty": 2,
            "question": "在对 DataFrame 执行去重操作 `df.drop_duplicates(subset=['order_id'], keep='last')` 时，参数 `keep='last'` 的具体含义是？",
            "options": [
                {"value": "A", "label": "遇到重复的 order_id 时，保留最后一次出现的记录，剔除前面较早的记录"},
                {"value": "B", "label": "只保留第一次出现的记录，删除后续重复项"},
                {"value": "C", "label": "将所有重复的记录全部删除，一条都不留"},
                {"value": "D", "label": "将重复项全部移到数据表的末尾"}
            ],
            "answer": "A",
            "explanation": "keep='last' 表示当遇到重复记录时，保留最后出现的行；keep='first'（默认）保留首行；keep=False 则把所有出现过重复的行全部丢弃。",
            "tags": ["drop_duplicates", "去重策略"]
        },
        {
            "id": "pyf-ex-12-3",
            "type": "judge",
            "difficulty": 2,
            "question": "在构建商业级数据清洗流水线时，如果订单表中的业务唯一主键（如 `order_id`）字段出现缺失（NaN），推荐的做法通常是使用上一行的值或者平均值进行填充，而不是删除该行。",
            "answer": False,
            "explanation": "错误！业务唯一主键（Primary Key）是标识实体的核心锚点。主键缺失属于致命的源端错误数据，无法确定归属，如果盲目填充会导致数据严重错乱，标准处理原则是一律果断 dropna(subset=['order_id']) 删除该行并记录审计报警日志。",
            "tags": ["数据清洗原则", "主键治理"]
        },
        {
            "id": "pyf-ex-12-4",
            "type": "fill",
            "difficulty": 3,
            "question": "在清洗可能包含空值的用户优惠券列 `df['coupon']` 时，若希望将所有缺失值平稳填充为数值 `0.0`，应调用的方法是 `df['coupon']._____(0.0)`。",
            "blanks": [["fillna"]],
            "explanation": "pandas 中填充缺失值的标准函数是 fillna()。",
            "tags": ["fillna", "缺失填充"]
        },
        {
            "id": "pyf-ex-12-5",
            "type": "single",
            "difficulty": 3,
            "question": "观察以下数据清洗管道代码：\n```python\nimport pandas as pd\ndf = pd.DataFrame({\"code\": [\"A1\", \"A2\", \"A2\", None], \"score\": [80, 90, 90, 70]})\ndf = df.dropna(subset=[\"code\"]).drop_duplicates(subset=[\"code\"])\n```\n最终 `len(df)` 的结果是多少？",
            "options": [
                {"value": "A", "label": "2"},
                {"value": "B", "label": "3"},
                {"value": "C", "label": "4"},
                {"value": "D", "label": "1"}
            ],
            "answer": "A",
            "explanation": "原始数据共 4 行。dropna 剔除了第四行（code 为 None）；剩余 3 行（A1, A2, A2）。drop_duplicates 剔除了重复的 A2 一行，最终剩余 A1 与 A2 共 2 行。",
            "tags": ["数据清洗", "管道计算"]
        },
        {
            "id": "pyf-ex-12-6",
            "type": "multiple",
            "difficulty": 4,
            "question": "建立工业级、生产可用的数据清洗与转换（ETL）流水线时，下列哪些设计原则属于核心质量防线？",
            "options": [
                {"value": "A", "label": "流水线应具备幂等性（Idempotency）：使用相同的输入数据多次重复运行，产生的结果应完全一致"},
                {"value": "B", "label": "在关键节点记录数据流转审计指标（如初始行数、过滤行数、丢弃异常行原因）"},
                {"value": "C", "label": "对最终交付的集市结果表进行关键契约断言（如主键唯一性、金额非负性）"},
                {"value": "D", "label": "遇到任何报错时，直接在最外层加 except: pass，确保流水线永远静默返回"}
            ],
            "answer": ["A", "B", "C"],
            "explanation": "A（幂等性）、B（审计日志可追踪）、C（数据质量契约校验）是工业级数据工程基石；D 是极其危险的掩耳盗铃反模式，会导致严重脏数据流入业务决策系统。",
            "tags": ["ETL设计", "生产工程规范"]
        },
        {
            "id": "pyf-ex-12-7",
            "type": "single",
            "difficulty": 4,
            "question": "有一列日期字符串数据，格式混合了 `'2024-05-01'`、`'2024/05/02'` 以及脏数据 `'invalid_date'`。使用哪种方法可以将其统一转换为规范的 `datetime` 类型，同时把脏数据安全置为 `NaT`（Not a Time）？",
            "options": [
                {"value": "A", "label": "pd.to_datetime(df['date_col'], errors='coerce')"},
                {"value": "B", "label": "df['date_col'].astype('datetime64')"},
                {"value": "C", "label": "datetime.strptime(df['date_col'])"},
                {"value": "D", "label": "pd.to_date(df['date_col'])"}
            ],
            "answer": "A",
            "explanation": "pd.to_datetime 能够自动智能推断并兼容多种日期分隔符（- 或 /），且参数 errors='coerce' 保证遇到非法日期字符串时静默转换为 NaT 缺失值而不使程序崩溃。",
            "tags": ["to_datetime", "日期清洗"]
        },
        {
            "id": "pyf-ex-12-8",
            "type": "code",
            "difficulty": 5,
            "question": "【结课大作业】请编写全流程端到端数据清洗与分析函数 `clean_and_analyze_sales(raw_df: pd.DataFrame) -> pd.DataFrame`：\n- 输入包含脏数据的 DataFrame，列包含：`['order_id', 'city', 'price_str', 'status']`；\n- 步骤 1：剔除 `order_id` 为空的记录，并对 `order_id` 去重（保留首个）；\n- 步骤 2：过滤出 `status == 'SUCCESS'` 的订单；\n- 步骤 3：清洗 `price_str` 列：去除字符串中的 `'¥'` 符号与空格，使用 `pd.to_numeric(..., errors='coerce')` 转为浮点数，并剔除价格解析失败（NaN）的行；\n- 步骤 4：按 `city` 分组，统计各城市的成交总额 `total_amount`（保留 2 位小数）和订单数 `order_count`；\n- 步骤 5：使用 `.reset_index()` 重置索引后返回最终的看板 DataFrame。",
            "starterCode": "import pandas as pd\n\ndef clean_and_analyze_sales(raw_df: pd.DataFrame) -> pd.DataFrame:\n    # 请在此处构建端到端清洗与聚合流水线\n    pass\n",
            "expectedOutput": "city, total_amount, order_count",
            "answer": "import pandas as pd\n\ndef clean_and_analyze_sales(raw_df: pd.DataFrame) -> pd.DataFrame:\n    if raw_df.empty:\n        return pd.DataFrame(columns=['city', 'total_amount', 'order_count'])\n    # 1. 主键缺失与去重\n    df = raw_df.dropna(subset=['order_id']).drop_duplicates(subset=['order_id']).copy()\n    # 2. 状态过滤\n    df = df[df['status'] == 'SUCCESS'].copy()\n    # 3. 价格清洗\n    clean_p = df['price_str'].astype(str).str.replace('¥', '').str.strip()\n    df['price'] = pd.to_numeric(clean_p, errors='coerce')\n    df = df.dropna(subset=['price']).copy()\n    if df.empty:\n        return pd.DataFrame(columns=['city', 'total_amount', 'order_count'])\n    # 4. 分组聚合\n    res = df.groupby('city').agg(\n        total_amount=('price', 'sum'),\n        order_count=('order_id', 'count')\n    ).reset_index()\n    res['total_amount'] = res['total_amount'].round(2)\n    return res",
            "tests": "import pandas as pd\ntest_df = pd.DataFrame({\n    'order_id': ['O1', 'O2', 'O2', None, 'O3', 'O4'],\n    'city': ['北京', '上海', '上海', '广州', '北京', '上海'],\n    'price_str': ['¥100.5', '¥200.0', '¥200.0', '¥50.0', '非法', '¥150.0'],\n    'status': ['SUCCESS', 'SUCCESS', 'SUCCESS', 'SUCCESS', 'SUCCESS', 'FAILED']\n})\nres = clean_and_analyze_sales(test_df)\n# O1(北京, 100.5, SUCCESS) -> 进\n# O2(上海, 200.0, SUCCESS) -> 进 (第2个O2去重剔除)\n# None(广州) -> 主键空剔除\n# O3(北京, 非法) -> 金额非法剔除\n# O4(上海, 150.0, FAILED) -> status非SUCCESS剔除\nassert len(res) == 2\nbj = res[res['city'] == '北京'].iloc[0]\nsh = res[res['city'] == '上海'].iloc[0]\nassert bj['total_amount'] == 100.5\nassert bj['order_count'] == 1\nassert sh['total_amount'] == 200.0\nassert sh['order_count'] == 1\n",
            "explanation": "完整流水线：主键非空与去重 -> 状态过滤 -> 字符串货币符号剔除与 to_numeric(errors='coerce') 强转 -> 剔除 NaN -> groupby('city').agg() 分组计算总额与计数 -> reset_index() 返回指标表。",
            "tags": ["编程实操", "结课大作业", "全流程清洗"]
        }
    ]
}
