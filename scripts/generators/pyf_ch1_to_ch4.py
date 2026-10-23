# -*- coding: utf-8 -*-
"""
Python 基础与数据处理 - 第 1 章至第 4 章数据定义
涵盖：
1. 编程入门、Python 环境与代码运行
2. 变量、基本数据类型、表达式与输入输出
3. 条件分支与流程控制
4. 循环控制与迭代进阶
"""

CHAPTER_1 = {
    "id": "pyf-c1",
    "courseId": "python-foundations-data",
    "order": 1,
    "title": "编程入门、Python 环境与代码运行",
    "goal": "从零建立对计算机程序与 Python 执行模型的认知，掌握交互式命令行与脚本运行方式，熟练使用 print() 与规范注释编写第一个程序。",
    "lessons": [
        {
            "id": "pyf-l1-1",
            "title": "什么是编程与 Python 执行模型：解释器、字节码与虚拟机",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：理解计算机底层如何执行程序指令，搞清“编译型语言”与“解释型语言”的区别，掌握 Python 代码从文本到屏幕输出的完整流转过程。
- **先修要求**：无需任何编程或计算机基础，只要会使用鼠标键盘与文本编辑器即可。

---

### 二、核心概念与术语解释

#### 1. 什么是编程？
计算机本质上是一台执行极简单电信号指令的机器（只能理解 0 和 1 的机器语言）。所谓**编程（Programming）**，就是程序员使用人类易于理解的高级语言（如 Python、C++、Java），按照严密的逻辑编写一系列指令，指挥计算机自动完成数据计算、文字处理或业务流程。

#### 2. 编译型 vs 解释型：为什么 Python 如此灵活？
- **编译型语言（如 C, C++, Rust）**：在运行前必须经过编译器，一次性将所有源代码翻译成目标机器的二进制机器码（`.exe` 或可执行二进制文件）。优点是运行速度快，缺点是跨平台需要重新编译，修改后必须整体重新编译。
- **解释型语言（以 Python 为代表）**：代码在运行时由**解释器（Interpreter）**逐行读取并动态执行。在 Python 官方实现（CPython）中，执行过程分为两步：
  1. **语法解析与字节码生成**：将 `.py` 源代码解析为跨平台的中间表示——**字节码（Bytecode，常缓存为 `.pyc` 文件）**；
  2. **虚拟机执行**：由 **Python 虚拟机（Python Virtual Machine, PVM）** 逐条执行字节码指令，并调用操作系统底层完成计算和 I/O。

```
[你编写的 Python 源码 (.py)]
            │
            ▼ (CPython 编译器：词法/语法分析)
   [跨平台字节码 (.pyc)]
            │
            ▼ (Python 虚拟机 PVM：逐条解释并调度)
[操作系统 / 物理 CPU 执行机器指令]
            │
            ▼
    [屏幕打印 / 数据结果输出]
```

#### 3. 两种代码运行模式
- **交互式环境（REPL: Read-Eval-Print Loop）**：在终端输入 `python` 或在 Jupyter Notebook 中，输入一行立即执行一行并显示结果。非常适合数据探索与语法验证。
- **脚本文件模式（Script Mode）**：将完整代码保存在扩展名为 `.py` 的文本文件中（如 `main.py`），通过命令行 `python main.py` 一次性启动执行。这是构建生产项目和自动化脚本的标准方式。

---

### 三、逐步代码演练与执行分析

在 Python 中，想要检查当前运行的 Python 解释器版本和操作系统底层环境，可以直接使用标准库 `sys` 和 `platform`：

```python
import sys
import platform

print("当前 Python 版本:", platform.python_version())
print("操作系统平台:", platform.system(), platform.release())
print("解释器执行路径:", sys.executable)
```

**执行过程剖析**：
1. `import` 语句加载内建模块；
2. Python 虚拟机调用底层 C 函数获取环境信息；
3. `print()` 将字符串输出到系统标准输出流（stdout）。

---

### 四、常见易错陷阱与排查技巧
1. **中英文符号混淆**：初学者最常见错误是把英文标点（括号 `()`、引号 `""`、分号 `;`）打成中文全角标点（`（）`、`“”`、`；`），这会直接引发 `SyntaxError: invalid character`。
2. **文件名与系统模块冲突**：千万不要将自己的脚本命名为与内置库重名的文件（如命名为 `sys.py` 或 `test.py` 或 `email.py`），否则当其他代码 `import sys` 时会优先加载当前文件，导致循环导入或找不到属性错误。

---

### 五、本节小结
- Python 是解释型、动态类型的高级编程语言，源码先转为字节码，再由 PVM 虚拟机调度执行。
- 交互式 REPL 适合探索调试，脚本文件适合持久化工程化运行。
- 书写代码必须保证使用纯半角英文标点符号。

---

### 六、权威参考资料与延伸阅读
- **Python 官方文档**：《Python 教程 - 使用 Python 解释器》 (Python 3.12 Documentation, Section 1 & 2)
  - 链接：https://docs.python.org/3/tutorial/interpreter.html
  - 授权：Python Software Foundation License (PSF, 开源免费)
- **MIT OpenCourseWare 6.100L**：《Introduction to CS and Programming in Python》Lecture 1 "What is Computation" (Ana Bell, John Guttag)
  - 链接：https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/
  - 授权：CC BY-NC-SA 4.0
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "切勿将自己的脚本文件命名为 math.py, random.py 或 sys.py，否则会导致 Python 标准库被自己覆盖引发难以排查的导入错误。"
                },
                {
                    "kind": "note",
                    "text": "在终端中输入 python -V 可以随时快速查看当前环境所安装的 Python 主次版本号。"
                }
            ],
            "demos": [
                {
                    "title": "探查 Python 解释器与执行环境",
                    "lang": "python",
                    "code": "import sys\nimport platform\n\nprint(\"Python 解释器版本:\", platform.python_version())\nprint(\"操作系统类型:\", platform.system())\nprint(\"字节序 (Byte Order):\", sys.byteorder)\nprint(\"内存整数最大值范围 (sys.maxsize):\", sys.maxsize)\nprint(\"✓ Python 解释器运行正常！\")\n"
                }
            ]
        },
        {
            "id": "pyf-l1-2",
            "title": "第一个程序与标准输出：print()、注释与代码书写规范",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握 `print()` 函数的高级用法（`sep` 分隔符与 `end` 结束符），理解单行与多行注释的规范，深刻领会 Python 中“缩进即语法”的强制规范。
- **先修要求**：已了解代码的基本执行模型。

---

### 二、核心概念与术语解释

#### 1. 标准输出函数 `print()`
`print()` 是 Python 最基础、最常用的内建函数，用于把内容输出到控制台。
它的完整签名如下：
```python
print(*objects, sep=' ', end='\\n', file=sys.stdout, flush=False)
```
- `*objects`：可以同时传入任意多个对象，用逗号隔开；
- `sep`：各对象之间的分隔符，默认为一个空格 `' '`；
- `end`：输出所有对象后追加的结束符，默认为换行符 `'\\n'`；
- `flush`：是否强制立即刷新输出缓冲区（默认为 False，在实时日志场景常用 True）。

#### 2. 注释（Comments）：写给人类看的说明书
注释在程序执行时会被解释器直接忽略，主要用于解释“为什么这么写”而不是“写了什么”。
- **单行注释**：使用井号 `#`，从 `#` 开始到该行末尾均为注释；
- **多行注释/文档字符串**：使用三个单引号 `'''` 或三个双引号 `\"\"\"`。

#### 3. 缩进（Indentation）：Python 最独特的语法特征
在 C/C++ 或 Java 中，代码块是用大括号 `{}` 界定的；而 **Python 强制使用严格的空格缩进（Indentation）来确定代码的层次与归属**！
- 官方 **PEP 8** 风格指南强制推荐：**每层缩进使用 4 个半角空格**；
- 严禁混用制表符（Tab）和空格，否则会抛出致命的 `TabError: inconsistent use of tabs and spaces in indentation`。

---

### 三、逐步代码演练与执行分析

```python
# 1. 基础打印
print("Hello, Python!")

# 2. 多个参数与自定义分隔符 sep
print("2024", "05", "18", sep="-")  # 输出: 2024-05-18

# 3. 自定义行尾符 end（不换行）
print("正在载入数据", end="...")
print("完成!")  # 输出: 正在载入数据...完成!
```

---

### 四、常见易错陷阱与排查技巧
1. **缩进不一致 (IndentationError)**：如果第一行代码前面莫名多了一个空格，Python 会直接报 `IndentationError: unexpected indent`。顶层语句绝不能有缩进。
2. **把 print 当赋值**：`result = print("hello")` 会导致 `result` 变成 `None`！因为 `print` 仅仅是在屏幕上显示内容，它的函数返回值永远是 `None`。

---

### 五、本节小结
- `print()` 默认用空格连接多个参数，以换行符结尾，通过 `sep` 与 `end` 可以灵活定制输出格式。
- 单行注释用 `#`，文档字符串用三引号。
- 缩进是 Python 语法结构的核心，必须使用统一的 4 个空格缩进。

---

### 六、权威参考资料与延伸阅读
- **Python 官方文档**：《Built-in Functions - print》 (Python 3.12 Documentation)
  - 链接：https://docs.python.org/3/library/functions.html#print
- **PEP 8**：《Style Guide for Python Code - Indentation & Comments》 (Guido van Rossum)
  - 链接：https://peps.python.org/pep-0008/
- **Think Python (3rd Edition)**：Chapter 1 "The way of the program" (Allen B. Downey, Green Tea Press)
  - 链接：https://greenteapress.com/wp/think-python-3rd-edition/
  - 授权：CC BY-NC-SA 4.0
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "不要在没有控制流语句（如 if/for/def）的情况下随意在代码行首加空格，否则会报 IndentationError。"
                },
                {
                    "kind": "performance",
                    "text": "在生产环境中大规模写日志时，频繁调用 print 会造成 I/O 阻塞，建议后续使用 logging 模块配合异步缓冲区。"
                }
            ],
            "demos": [
                {
                    "title": "print 自定义分隔符与行尾符格式化输出",
                    "lang": "python",
                    "code": "# 演示 sep 与 end 参数的强大排版能力\nprint(\"用户ID\", \"订单号\", \"金额\", sep=\" | \")\nprint(\"-\" * 30)\nprint(\"U1001\", \"ORD-202401\", \"￥99.50\", sep=\" | \")\nprint(\"U1002\", \"ORD-202402\", \"￥188.00\", sep=\" | \")\n\n# 模拟进度条单行刷新效果\nfor char in [\"[\", \"=\", \"=\", \"=\", \">\", \"] 100%\"]:\n    print(char, end=\"\")\nprint()  # 换行\n"
                }
            ]
        }
    ],
    "exercises": [
        {
            "id": "pyf-ex-1-1",
            "type": "single",
            "difficulty": 1,
            "question": "关于 Python 语言的执行模型，下列说法中最为准确的是哪一项？",
            "options": [
                {"value": "A", "label": "Python 源码直接由 CPU 硬件指令集直接执行，不需要任何中间转换"},
                {"value": "B", "label": "Python 源码首先由解释器编译为中间字节码（Bytecode），再由 Python 虚拟机（PVM）逐条解释执行"},
                {"value": "C", "label": "Python 是一种纯编译型语言，必须预先生成特定操作系统的 .exe 二进制机器码才能运行"},
                {"value": "D", "label": "Python 代码由操作系统的 Bash / PowerShell 命令行直接逐词翻译执行"}
            ],
            "answer": "B",
            "explanation": "CPython（官方标准实现）先将 .py 源码做词法语法分析并编译成平台无关的字节码（常缓存为 .pyc 文件），然后由 Python 虚拟机（PVM）调度执行，因此属于解释型语言。",
            "tags": ["Python 基础", "执行模型"]
        },
        {
            "id": "pyf-ex-1-2",
            "type": "single",
            "difficulty": 1,
            "question": "在 Python 中，关于代码注释的写法与规范，下列说法错误的是哪一项？",
            "options": [
                {"value": "A", "label": "单行注释使用井号 # 开头，解释器在执行时会自动忽略从 # 到行尾的内容"},
                {"value": "B", "label": "三个单引号 ''' 或三个双引号 \"\"\" 常用于函数或模块的多行文档字符串（Docstring）"},
                {"value": "C", "label": "注释越多越好，最好给每一行最简单的赋值语句都写一句注释解释其字面含义"},
                {"value": "D", "label": "根据 PEP 8 规范，行内注释与代码之间建议至少保留 2 个空格"}
            ],
            "answer": "C",
            "explanation": "优秀的注释应该解释代码背后的“设计意图”或“业务逻辑（Why）”，而不是机械复述代码本身已经非常明显的字面语法（What）。过量的废话注释反而会降低代码可读性与可维护性。",
            "tags": ["代码规范", "PEP 8"]
        },
        {
            "id": "pyf-ex-1-3",
            "type": "judge",
            "difficulty": 1,
            "question": "在 Python 语言中，缩进（Indentation）只是为了使代码在排版上更加美观整洁，不影响代码的逻辑从属关系与程序运行结果。",
            "answer": False,
            "explanation": "错误！在 Python 中，缩进是强制性的语法组成部分，用来界定代码块（Code Block）的层级与从属范围。缩进错误会导致 SyntaxError 或 IndentationError，甚至改变执行逻辑。",
            "tags": ["缩进", "语法基础"]
        },
        {
            "id": "pyf-ex-1-4",
            "type": "fill",
            "difficulty": 2,
            "question": "若要让代码 `print(\"apple\", \"banana\", \"cherry\", _____=\"/\")` 在控制台输出结果为 `apple/banana/cherry`，空格处应填写的关键字参数名称是？",
            "blanks": [["sep"]],
            "explanation": "print() 函数中用于指定多个打印项之间连接符的参数是 sep（separator 的缩写）。",
            "tags": ["print", "内置函数"]
        },
        {
            "id": "pyf-ex-1-5",
            "type": "single",
            "difficulty": 2,
            "question": "观察以下两行 Python 代码：\n```python\nprint(\"A\", \"B\", sep=\"*\", end=\"#\")\nprint(\"C\")\n```\n控制台最终打印的输出结果是：",
            "options": [
                {"value": "A", "label": "A*B#C (且末尾有换行)"},
                {"value": "B", "label": "A B*#C"},
                {"value": "C", "label": "A*B\\n#C"},
                {"value": "D", "label": "A*B#\\nC"}
            ],
            "answer": "A",
            "explanation": "第一行输出 A 和 B，中间用 * 隔开，且末尾以 # 结束而不换行（得到 A*B#）；第二行接着输出 C 并默认换行，因此拼接起来输出结果为 A*B#C 并换行。",
            "tags": ["代码阅读", "print"]
        },
        {
            "id": "pyf-ex-1-6",
            "type": "multiple",
            "difficulty": 3,
            "question": "初学者刚开始编写 Python 程序时，下列哪些错误会导致程序无法通过语法解析直接报错？",
            "options": [
                {"value": "A", "label": "在英文代码中误输入了中文全角冒号（：）或全角括号（）"},
                {"value": "B", "label": "同一代码块中混用了 Tab 制表符和 4 个空格作为缩进"},
                {"value": "C", "label": "在一行代码最开始莫名其妙加了 2 个空格缩进（顶层代码意外缩进）"},
                {"value": "D", "label": "在一行代码末尾写了以 # 开头的中文注释"}
            ],
            "answer": ["A", "B", "C"],
            "explanation": "A 会引发 SyntaxError（非法字符）；B 会引发 TabError；C 会引发 IndentationError（意外缩进）；而 D 是完全合法的注释写法，解释器会正常跳过，不会报错。",
            "tags": ["排错调试", "异常初探"]
        },
        {
            "id": "pyf-ex-1-7",
            "type": "single",
            "difficulty": 3,
            "question": "执行如下代码段：\n```python\nval = print(\"Data Cleaning\")\n```\n变量 `val` 的实际值是什么？",
            "options": [
                {"value": "A", "label": "字符串 \"Data Cleaning\""},
                {"value": "B", "label": "整数 13（输出字符长度）"},
                {"value": "C", "label": "None"},
                {"value": "D", "label": "抛出 TypeError 异常，因为 print 不能赋值给变量"}
            ],
            "answer": "C",
            "explanation": "print() 函数的核心职责是将内容写入输出流，它自身没有返回值，因此返回内建单例对象 None。赋值给 val 后，val 的值为 None。",
            "tags": ["函数返回值", "None"]
        },
        {
            "id": "pyf-ex-1-8",
            "type": "code",
            "difficulty": 3,
            "question": "【动手编程】请编写代码，使用一次或多次 `print()` 输出两行文本：\n第一行输出：`Status: OK`\n第二行输出：`Code: 200`\n要求输出格式与大小写完全一致。",
            "starterCode": "# 请在下方编写代码输出指定格式文本\n",
            "expectedOutput": "Status: OK\nCode: 200",
            "answer": "print(\"Status: OK\")\nprint(\"Code: 200\")",
            "tests": "import io, sys\n# 验证输出\nbuf = io.StringIO()\nsys.stdout = buf\nprint(\"Status: OK\")\nprint(\"Code: 200\")\nsys.stdout = sys.__stdout__\nassert buf.getvalue().strip() == 'Status: OK\\nCode: 200'\n",
            "explanation": "使用两次 print() 默认分别换行打印两行字符串；或者使用 print('Status: OK\\nCode: 200') 均可实现标准换行输出。",
            "tags": ["编程实操", "print"]
        }
    ]
}

CHAPTER_2 = {
    "id": "pyf-c2",
    "courseId": "python-foundations-data",
    "order": 2,
    "title": "变量、基本数据类型、表达式与输入输出",
    "goal": "理解 Python“变量是标签不是盒子”的内存引用模型，熟练掌握四大核心标量（int/float/str/bool）及类型转换，掌握运算符优先级与现代 f-string 格式化输出。",
    "lessons": [
        {
            "id": "pyf-l2-1",
            "title": "变量绑定与内存引用模型：变量是标签而不是盒子",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：彻底理解 Python 中变量的本质——**变量不是存放数据的容器盒子，而是贴在内存对象上的名字标签**；掌握动态类型与强类型语言特征。
- **先修要求**：已掌握基本的 Python 运行方式。

---

### 二、核心概念与术语解释

#### 1. 变量不是“盒子”，是“名字标签”
在 C/C++ 语言中，声明变量 `int a = 10;` 相当于在内存中开辟了一块固定大小的抽屉，往盒子里写入二进制数值 10。
但在 Python 中，执行：
```python
score = 95
```
底层发生了三件事：
1. **在内存堆中创建对象**：开辟一块内存，创建类型为 `int` 且值为 95 的对象；
2. **在当前命名空间创建名字**：记录标识符 `score`；
3. **建立引用绑定（Binding）**：让 `score` 指向这个对象，该对象的**引用计数（Reference Count）**加 1。

```
命名空间 (Namespaces)               内存堆空间 (Heap Memory)
┌──────────────┐                 ┌───────────────────────┐
│    score     ├────────────────>│  类型: int            │
└──────────────┘                 │  值: 95               │
                                 │  引用计数: 1          │
                                 └───────────────────────┘
```

#### 2. 多变量指向同一对象
当执行 `b = a` 时，并不会把对象复制一份，而是让 `b` 也贴在 `a` 所指向的同一个对象上：
```python
a = [1, 2, 3]
b = a          # b 和 a 指向同一个内存列表
b.append(4)
print(a)       # 输出 [1, 2, 3, 4]！a 也变了！
```

#### 3. 动态类型 (Dynamic) 与 强类型 (Strong)
- **动态类型**：变量本身没有任何类型，类型属于内存里的对象。同一个名字可以随时重新绑定到其他类型的对象上：
  ```python
  x = 100       # x 当前指向 int
  x = "hello"   # x 重新绑定指向 str，完全合法
  ```
- **强类型**：类型之间不会发生不可控的隐式转换。例如尝试在 Python 中执行 `"Age: " + 18`，Python 会直接抛出 `TypeError`，绝不会像 JavaScript 那样悄悄变成 `"Age: 18"`。

---

### 三、逐步代码演练与执行分析

```python
# 使用 id() 查看对象的内存地址
x = 256
y = 256
print("x 的地址:", id(x))
print("y 的地址:", id(y))
print("x is y?", x is y)      # is 检查是否是同一物理内存对象
print("x == y?", x == y)      # == 检查两个对象的值是否相等
```

---

### 四、常见易错陷阱与排查技巧
1. **误把 is 当 == 使用**：
   - `==` 判断两个对象包含的**数值内容是否相等**；
   - `is` 判断两个变量是否指向**完全相同的同一块内存地址**。
   - 在数据清洗和日常逻辑中，判断数值比较务必使用 `==`。只有在与单例对象比较时（如 `val is None`）才规范使用 `is`。
2. **链式赋值可变对象陷阱**：
   - `list1 = list2 = []` 会导致两个变量共享同一个空列表，后续修改一方将影响另一方！正确做法是分别初始化：`list1 = []; list2 = []`。

---

### 五、本节小结
- 变量是贴在内存对象上的标签，赋值语句是建立引用。
- Python 是动态强类型语言：变量无类型、对象有类型；跨类型操作不发生隐式胡乱转换。
- `==` 比内容，`is` 比内存地址。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "判断变量是否为 None 时，永远推荐写 if val is None:，因为 None 在 Python 全局是唯一的单例对象。"
                },
                {
                    "kind": "interview",
                    "text": "面试高频题：可变对象（列表/字典）赋值传递的是引用，修改原对象会导致所有指向该对象的变量发生同步变动。"
                }
            ],
            "demos": [
                {
                    "title": "探查变量的引用与物理地址",
                    "lang": "python",
                    "code": "# 演示变量引用与 is / == 的本质区别\na = [10, 20, 30]\nb = a\nc = [10, 20, 30]\n\nprint(f\"a 的内存地址: {id(a)}\")\nprint(f\"b 的内存地址: {id(b)} (与 a 完全相同)\")\nprint(f\"c 的内存地址: {id(c)} (独立创建的新列表)\")\nprint(f\"a is b: {a is b}\")\nprint(f\"a is c: {a is c}  <- 虽然内容相等，但不是同一个内存对象！\")\nprint(f\"a == c: {a == c}  <- 内容完全相等！\")\n"
                }
            ]
        },
        {
            "id": "pyf-l2-2",
            "title": "四大基础标量类型与显式类型转换：int、float、str、bool",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握 Python 最核心的四大标量类型（整数、浮点数、字符串、布尔值）的物理特性与精度陷阱，熟练使用 `int()`, `float()`, `str()`, `bool()` 进行数据清洗中的类型转换。
- **先修要求**：理解变量引用概念。

---

### 二、核心概念与术语解释

#### 1. 整数（int）：无限精度的数学整数
在 Python 3 中，整数不受 32 位或 64 位机器字长的溢出限制！只要物理内存足够，整数可以达到成百上千位，绝不会发生 C/Java 中的整数溢出（Integer Overflow）。

#### 2. 浮点数（float）：IEEE 754 双精度浮点陷阱
Python 浮点数底层采用 C 语言的 `double`（64 位双精度，符号位 1 位，指数位 11 位，尾数位 52 位）。
由于二进制无法精确表示某些十进制小数（例如 0.1 和 0.2 在二进制下是无限循环小数）：
```python
print(0.1 + 0.2)  # 0.30000000000000004
print(0.1 + 0.2 == 0.3)  # False!
```
> [!IMPORTANT]
> 在金融、电商结算等对精度极度敏感的场景中，**严禁直接用 float 做等值比较**，应使用标准库 `decimal.Decimal` 或 `math.isclose()`。

#### 3. 字符串（str）：不可变的 Unicode 文本
- 字符串可以用单引号 `'...'`、双引号 `\"...\"` 包裹，两者完全等价；
- 字符串是**不可变对象（Immutable）**，无法对其中某个字符就地修改；
- 支持常用转义字符：`\\n` 换行、`\\t` 制表符、`\\\\` 反斜杠。

#### 4. 布尔值（bool）：真与假
只有两个常量值：`True` 与 `False`。
注意：`bool` 是 `int` 的子类，在数值计算中 `True == 1` 且 `False == 0`。

#### 5. 显式类型转换（Type Casting）
从外部读取数据（如 CSV 文本或用户输入）时，读进来的全部是字符串，必须手动显式转换：
```python
age_str = "25"
age_num = int(age_str)       # 转为整数 25
price_num = float("19.90")   # 转为浮点数 19.9
status = bool(1)             # 转为布尔值 True
```

---

### 三、逐步代码演练与执行分析

```python
raw_sales = "1280.50"
raw_qty = "4"

# 数据清洗：将文本转为数值并计算单价
total_sales = float(raw_sales)
quantity = int(raw_qty)
unit_price = total_sales / quantity

print(f"总金额: {total_sales}, 销售数量: {quantity}, 计算单价: {unit_price:.2f}")
```

---

### 四、常见易错陷阱与排查技巧
1. **直接把浮点数字符串传给 int()**：
   - 执行 `int("19.9")` 会直接抛出 `ValueError: invalid literal for int() with base 10: '19.9'`！
   - 正确做法是先转 float 再转 int：`int(float("19.9"))`。
2. **空字符串与布尔判定**：
   - 字符串 `"False"` 转换为布尔值 `bool("False")` 是 **True**！因为任何非空字符串的真值都是 True。

---

### 五、本节小结
- int 精度无限；float 底层基于 IEEE 754，存在微小舍入误差。
- str 是不可变序列，单双引号等价。
- 类型转换是数据清洗的第一步，使用 int()/float() 需防范 ValueError。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "bool('False') 的结果是 True！因为 bool() 对非空字符串一律返回 True，只有 bool('') 空字符串才返回 False。"
                },
                {
                    "kind": "performance",
                    "text": "需要精确进行商业货币计算时，请从 decimal 模块导入 Decimal，不要使用 float 累加零钱。"
                }
            ],
            "demos": [
                {
                    "title": "浮点精度误差与 Decimal 高精度对比",
                    "lang": "python",
                    "code": "from decimal import Decimal\nimport math\n\n# 浮点数直接计算\na = 0.1 + 0.2\nprint(f\"普通 float 计算 0.1 + 0.2 = {a}\")\nprint(f\"普通 float 比较 0.1 + 0.2 == 0.3 是: {a == 0.3}\")\nprint(f\"使用 math.isclose(a, 0.3) 比较是: {math.isclose(a, 0.3)}\")\n\n# 使用 Decimal 消除二进制舍入误差\nd1 = Decimal(\"0.1\")\nd2 = Decimal(\"0.2\")\nprint(f\"使用 Decimal 计算结果: {d1 + d2} (严格等于 0.3)\")\n"
                }
            ]
        },
        {
            "id": "pyf-l2-3",
            "title": "算术运算、优先级与现代 f-string 格式化输出",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握 Python 的完整算术运算符体系（整除、取模、幂运算），搞清运算优先级，熟练掌握 Python 3.6+ 的 f-string 格式化语法（浮点截断、百分比、千分位、对齐）。
- **先修要求**：了解 int 与 float 的基础运算。

---

### 二、核心概念与术语解释

#### 1. 核心算术运算符
| 运算符 | 描述 | 示例 | 结果 |
| :--- | :--- | :--- | :--- |
| `+`, `-` | 加法、减法 | `5 + 3` | `8` |
| `*` | 乘法 | `4 * 3` | `12` |
| `/` | **真除法（永远返回 float）** | `10 / 2` | `5.0` |
| `//` | **整除（向下取整 Floor Division）** | `17 // 5` | `3` |
| `%` | **取模（求余数）** | `17 % 5` | `2` |
| `**` | **幂运算（次方）** | `2 ** 8` | `256` |

> 提示：在 Python 中，即使 `10` 和 `2` 都是整数，单斜杠 `/` 的结果也必定是浮点数 `5.0`！如果需要整数结果，应使用双斜杠 `//`。

#### 2. 运算符优先级规则
从高到低：
1. 括号 `()`（最高优先级，善用括号可增强代码可读性）；
2. 幂运算 `**`；
3. 正负号 `+x`, `-x`；
4. 乘除系 `*`, `/`, `//`, `%`；
5. 加减系 `+`, `-`。

#### 3. 现代 f-string (Formatted String Literals)
在 Python 3.6 之前，拼接字符串常用 `%` 或 `.format()`，繁琐且可读性差。
现代 Python 强力推荐 **f-string**（在字符串前加前缀 `f` 或 `F`）：
```python
name = "知序"
score = 98.4567

# 1. 变量直接插值
print(f"学员: {name}")

# 2. 小数点保留 2 位
print(f"得分: {score:.2f}")  # 98.46 (自动四舍五入)

# 3. 千分位逗号分隔（财务报表极常用）
revenue = 12500000
print(f"年营收: {revenue:,}")  # 12,500,000

# 4. 百分比格式化
rate = 0.856
print(f"转化率: {rate:.1%}")   # 85.6%

# 5. 指定字符宽度与对齐 (<左对齐, >右对齐, ^居中)
print(f"{'商品名称':<10}{'价格':>8}")
```

---

### 三、逐步代码演练与执行分析

```python
product = "MacBook Pro"
original_price = 14999.0
discount = 0.88
final_price = original_price * discount

# 制作一张格式对齐的账单小票
print("=" * 30)
print(f"{'商品明细':^26}")
print("=" * 30)
print(f"商品: {product}")
print(f"原价: ¥{original_price:,.2f}")
print(f"折扣: {discount:.0%}")
print(f"实付: ¥{final_price:,.2f}")
print("=" * 30)
```

---

### 四、常见易错陷阱与排查技巧
1. **漏掉前缀字母 f**：初学者经常写成 `\"{name}: {score}\"`，忘记在引号外加上前导字母 `f`，导致输出的就是字面文本 `\"{name}: {score}\"`。
2. **在 f-string 花括号内写反斜杠**：在 Python 3.12 之前，f-string 的 `{}` 内部禁止出现转义字符 `\\`。若需要转义，应预先计算保存在临时变量中。

---

### 五、本节小结
- 单斜杠 `/` 永远返回浮点数，双斜杠 `//` 为整除。
- 幂运算符是 `**`，不是 `^`（`^` 在 Python 中是按位异或！）。
- 熟练使用 f-string 的 `:.2f`, `:,`, `:.1%` 格式符，是数据分析产出可读报表的核心基本功。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "不要用 ^ 计算次方！在 Python 中 2^3 表示二进制按位异或运算（结果是 1），计算 2 的 3 次方必须写成 2 ** 3。"
                },
                {
                    "kind": "note",
                    "text": "在 Python 3.8+ 中，f-string 支持调试语法 f'{x=}'，会同时打印变量名和当前值，非常适合日常调试。"
                }
            ],
            "demos": [
                {
                    "title": "电商结算与 f-string 报表排版",
                    "lang": "python",
                    "code": "# 模拟电商订单结算并用 f-string 优雅排版\nitems = [\n    (\"Python 数据分析\", 89.0, 2),\n    (\"机械键盘\", 299.0, 1),\n    (\"显示器支架\", 158.5, 1)\n]\n\nprint(f\"{'商品名称':<14} | {'单价':>8} | {'数量':>4} | {'小计':>8}\")\nprint(\"-\" * 44)\ntotal = 0.0\nfor name, price, qty in items:\n    subtotal = price * qty\n    total += subtotal\n    print(f\"{name:<14} | {price:>8.2f} | {qty:>4} | {subtotal:>8.2f}\")\n\nprint(\"-\" * 44)\nprint(f\"{'合计实付:':<24} ¥{total:,.2f}\")\n"
                }
            ]
        }
    ],
    "exercises": [
        {
            "id": "pyf-ex-2-1",
            "type": "single",
            "difficulty": 1,
            "question": "在 Python 中执行 `x = 100` 后，关于变量 `x` 与数字 `100` 在内存中的关系，以下描述最准确的是？",
            "options": [
                {"value": "A", "label": "x 是一个名字标签，它指向内存中独立存在的整型对象 100"},
                {"value": "B", "label": "x 是一个固定大小的物理盒子，数值 100 被硬编码存放在盒子内"},
                {"value": "C", "label": "数字 100 会复制自身并嵌入到变量 x 的字符串名内"},
                {"value": "D", "label": "变量 x 在创建时必须预先指定不可更改的静态数据类型"}
            ],
            "answer": "A",
            "explanation": "Python 的内存模型是基于对象引用的。内存中先创建对象 100，变量名 x 仅仅是命名空间中指向该对象的引用标签。",
            "tags": ["变量", "内存引用"]
        },
        {
            "id": "pyf-ex-2-2",
            "type": "single",
            "difficulty": 1,
            "question": "在 Python 交互式环境中，表达式 `19 // 4` 和 `19 % 4` 的计算结果分别是什么？",
            "options": [
                {"value": "A", "label": "4 和 3"},
                {"value": "B", "label": "4.75 和 3"},
                {"value": "C", "label": "4 和 0.75"},
                {"value": "D", "label": "5 和 1"}
            ],
            "answer": "A",
            "explanation": "19 除以 4，商为 4，余数为 3。整除运算符 // 返回商的整数部分 4；取模运算符 % 返回余数 3。",
            "tags": ["算术运算符", "整除"]
        },
        {
            "id": "pyf-ex-2-3",
            "type": "judge",
            "difficulty": 1,
            "question": "在 Python 中，表达式 `0.1 + 0.2 == 0.3` 的求值结果为 True。",
            "answer": False,
            "explanation": "错误！由于二进制浮点数（IEEE 754）无法完全精确表示 0.1 和 0.2，0.1 + 0.2 的实际计算值为 0.30000000000000004，因此与 0.3 进行等值判断结果为 False。",
            "tags": ["浮点陷阱", "IEEE 754"]
        },
        {
            "id": "pyf-ex-2-4",
            "type": "fill",
            "difficulty": 2,
            "question": "若有变量 `pi = 3.1415926`，使用 f-string 将其格式化为保留两位小数的字符串 `f\"{pi:_____}\"`，横线处应填写的内容是？",
            "blanks": [[".2f"]],
            "explanation": "在格式化字符串中，:.2f 表示保留两位小数的浮点数格式。",
            "tags": ["f-string", "格式化"]
        },
        {
            "id": "pyf-ex-2-5",
            "type": "single",
            "difficulty": 2,
            "question": "观察以下代码执行过程：\n```python\na = 10\nb = a\na = a + 5\n```\n此时变量 `b` 的值是多少？",
            "options": [
                {"value": "A", "label": "10"},
                {"value": "B", "label": "15"},
                {"value": "C", "label": "None"},
                {"value": "D", "label": "抛出 UnboundLocalError"}
            ],
            "answer": "A",
            "explanation": "int 是不可变对象。a = a + 5 会计算出新对象 15 并让 a 重新绑定指向 15；而 b 依然指向原来的对象 10，因此 b 的值仍然是 10。",
            "tags": ["不可变对象", "变量绑定"]
        },
        {
            "id": "pyf-ex-2-6",
            "type": "multiple",
            "difficulty": 3,
            "question": "关于 Python 数据类型转换，下列哪些表达式执行时会抛出异常或结果与直觉不符？",
            "options": [
                {"value": "A", "label": "int(\"12.5\") 会抛出 ValueError 异常"},
                {"value": "B", "label": "bool(\"False\") 的求值结果是 True 而不是 False"},
                {"value": "C", "label": "\"Order \" + 100 会直接抛出 TypeError 异常"},
                {"value": "D", "label": "float(\"3.14\") 会正常返回浮点数 3.14"}
            ],
            "answer": ["A", "B", "C", "D"],
            "explanation": "四个选项描述全部符合 Python 的真实行为：A中int无法直接解析带小数点的字符串；B中非空字符串布尔值均为True；C中强类型不会隐式将int转为str相加；D是合法的浮点解析。",
            "tags": ["类型转换", "易错考点"]
        },
        {
            "id": "pyf-ex-2-7",
            "type": "fill",
            "difficulty": 3,
            "question": "若要计算数值 3 的 4 次方（即 81），在 Python 中最标准且直观的运算符写法是 `3 _____ 4`。",
            "blanks": [["**"]],
            "explanation": "Python 中的幂（次方）运算符为双星号 **。",
            "tags": ["幂运算", "运算符"]
        },
        {
            "id": "pyf-ex-2-8",
            "type": "code",
            "difficulty": 4,
            "question": "【动手编程】请编写一个汇率计算函数 `convert_currency(cny_amount, exchange_rate=7.2)`：\n输入人民币金额 `cny_amount` 与汇率（默认 7.2），返回折算后的美元金额，结果四舍五入保留 2 位小数（返回 float 类型）。",
            "starterCode": "def convert_currency(cny_amount: float, exchange_rate: float = 7.2) -> float:\n    # 请在此处编写计算并返回结果\n    pass\n",
            "expectedOutput": "100.0",
            "answer": "def convert_currency(cny_amount: float, exchange_rate: float = 7.2) -> float:\n    return round(cny_amount / exchange_rate, 2)",
            "tests": "res = convert_currency(720.0, 7.2)\nassert res == 100.0, f'Expected 100.0, got {res}'\nres2 = convert_currency(100.0, 7.2)\nassert res2 == 13.89, f'Expected 13.89, got {res2}'\n",
            "explanation": "用人民币金额除以美元汇率，并使用 round(val, 2) 保留 2 位小数返回。",
            "tags": ["编程实操", "数据计算"]
        }
    ]
}

CHAPTER_3 = {
    "id": "pyf-c3",
    "courseId": "python-foundations-data",
    "order": 3,
    "title": "条件分支与流程控制",
    "goal": "掌握布尔逻辑运算符与短路求值机制，理解 Python 中的真值测试规范，熟练编写 if/elif/else 分支与卫语句，防范过深嵌套。",
    "lessons": [
        {
            "id": "pyf-l3-1",
            "title": "布尔逻辑、真值测试与短路求值：and、or、not",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握比较运算符与三大逻辑运算符（`and`, `or`, `not`），深入理解 Python 的“真值测试（Truth Value Testing）”机制与“短路求值（Short-circuit Evaluation）”。
- **先修要求**：已掌握布尔类型 bool 的基础概念。

---

### 二、核心概念与术语解释

#### 1. 比较运算符
用于判断两个对象之间的大小与相对关系，运算结果必定是布尔值 `True` 或 `False`：
- `==`（值相等）、`!=`（不相等）；
- `<`, `<=`, `>`, `>=`；
- **链式比较（Python 特色）**：在 Python 中，你可以像数学公式一样直接写 `18 <= age < 60`，它完全等价于 `(18 <= age) and (age < 60)`，极其简洁优美！

#### 2. 真值测试（Truthiness）：哪些值在 Python 中被视为假？
在 Python 的条件判断中，任何类型的对象都可以直接作为条件，不需要显式写 `== True`。
以下对象在布尔上下文中**一律被判定为 False（假）**：
1. 常量 `None` 和 `False`；
2. 任何数值类型的零：`0`, `0.0`, `Decimal(0)`；
3. **任何空的数据序列或容器集合**：空字符串 `\"\"`、空列表 `[]`、空元组 `()`、空字典 `{}`、空集合 `set()`。
**除上述之外的所有其他对象，一律视为 True（真）！**

#### 3. 短路求值（Short-circuit Evaluation）
逻辑运算符 `and` 和 `or` 并不总是返回布尔值，而是返回**决定表达式最终结果的那个操作数本身**！
- **`A and B`**：
  - 如果 `A` 为假，整体必为假，立即返回 `A`，不再计算 `B`；
  - 如果 `A` 为真，则取决于 `B`，返回 `B`。
- **`A or B`**：
  - 如果 `A` 为真，整体必为真，立即返回 `A`，不再计算 `B`；
  - 如果 `A` 为假，则取决于 `B`，返回 `B`。

```python
# 短路求值极简应用：安全防御 None 或空值默认值
user_name = input_name or "匿名用户"
```

---

### 三、逐步代码演练与执行分析

```python
# 演示短路求值与对象返回
x = 0 or "默认名称"
print(f"0 or '默认名称' 结果: {repr(x)}")  # 输出: '默认名称'

y = "知序" and [1, 2, 3]
print(f"'知序' and [1, 2, 3] 结果: {y}")  # 输出: [1, 2, 3]

# 避免除以零的短路保护
divisor = 0
result = (divisor != 0) and (100 / divisor)
print(f"安全除法结果: {result}")  # 输出: False，不会触发 ZeroDivisionError 崩溃！
```

---

### 四、常见易错陷阱与排查技巧
1. **多此一举写 `if has_permission == True:`**：
   - 这是初学者最常见的“啰嗦代码”。根据 PEP 8 规范，应该直接写 `if has_permission:`。
   - 同理，判断列表是否为空，直接写 `if not items:`，切忌写 `if len(items) == 0:`。
2. **逻辑运算符与位运算符混淆**：
   - 逻辑运算使用英文单词 `and`, `or`, `not`；
   - 符号 `&`, `|`, `~` 是按位运算符（在后续 pandas 过滤中会用到，但在普通 if 判断中切勿混用）。

---

### 五、本节小结
- 链式比较 `0 <= x < 100` 优雅且高效。
- 空容器、零值、None 在条件中均自动为假。
- `and` 和 `or` 具有短路特性，善用可防止程序因访问空对象抛错。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "切勿在条件语句中写 if lst == True:，因为非空列表在布尔上下文中为真，但它并不等于 True 常量（[1] == True 是 False）。应直接写 if lst:。"
                },
                {
                    "kind": "performance",
                    "text": "将计算成本低或更容易快速为假的条件写在 and 的左边，可以充分利用短路特性跳过后续昂贵的计算。"
                }
            ],
            "demos": [
                {
                    "title": "真值测试与短路默认值设置实战",
                    "lang": "python",
                    "code": "# 模拟数据清洗中的缺失默认值赋值与安全检查\nraw_data = {'username': '', 'vip_level': 0, 'tags': None}\n\n# 利用 or 赋默认值\nusername = raw_data['username'] or '普通游客'\nvip = raw_data['vip_level'] or 1\ntags = raw_data['tags'] or []\n\nprint(f\"清洗后用户名: {username}\")\nprint(f\"清洗后VIP级别: {vip}\")\nprint(f\"清洗后标签容器: {tags}\")\n"
                }
            ]
        },
        {
            "id": "pyf-l3-2",
            "title": "条件分支设计：if / elif / else、卫语句与模式匹配",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：熟练运用 `if-elif-else` 构建多分支决策树，掌握“卫语句（Guard Clauses）”优化嵌套代码结构，了解 Python 3.10+ 的 `match-case` 模式匹配。
- **先修要求**：理解布尔表达式与比较运算符。

---

### 二、核心概念与术语解释

#### 1. 多分支结构执行时序
```python
if 条件1:
    代码块 1
elif 条件2:
    代码块 2
else:
    代码块 3
```
- **互斥性**：解释器从上往下依次评估条件，**一旦某个条件为真，执行对应代码块后立即跳出整个分支结构**，后续分支不再被执行！
- **条件覆盖顺序**：编写范围判断时，必须按由严到宽（或由大到小）的严格顺序排列，否则宽泛条件会“拦截”掉窄条件。

#### 2. 反模式：箭头型过深嵌套 vs 卫语句（Guard Clauses）
很多初学者写代码像一棵向右倾斜的树（Nested If Hell），嵌套了 5~6 层 if。
**工程重构法则：使用卫语句提前返回或抛错**，将异常情况在前排快速过滤掉，让核心主线逻辑保持在最外层缩进！

```python
# 糟糕的深层嵌套代码
def process_order(order):
    if order is not None:
        if order.get("paid"):
            if order.get("amount") > 0:
                return "发货成功"
    return "订单异常"

# 优雅的卫语句扁平结构（PEP 8 强烈推荐）
def process_order_clean(order):
    if not order or not order.get("paid"):
        return "订单异常"
    if order.get("amount") <= 0:
        return "金额异常"
    return "发货成功"
```

#### 3. Python 3.10+ match-case 模式匹配
类似于其他语言的 `switch-case`，但功能更强大，支持结构解包：
```python
status_code = 404
match status_code:
    case 200:
        msg = "请求成功"
    case 404:
        msg = "资源未找到"
    case 500 | 502:
        msg = "服务器内部故障"
    case _:
        msg = "未知状态码"
```

---

### 三、逐步代码演练与执行分析

```python
# 阶梯式个人所得税税率测算示例
taxable_income = 48000.0  # 应纳税所得额

if taxable_income <= 36000:
    rate = 0.03
    quick_deduction = 0
elif taxable_income <= 144000:
    rate = 0.10
    quick_deduction = 2520
elif taxable_income <= 300000:
    rate = 0.20
    quick_deduction = 16920
else:
    rate = 0.25
    quick_deduction = 31920

tax = taxable_income * rate - quick_deduction
print(f"应税所得: ¥{taxable_income:,.2f} | 适用税率: {rate:.0%} | 应缴个税: ¥{tax:,.2f}")
```

---

### 四、常见易错陷阱与排查技巧
1. **elif 顺序颠倒导致逻辑失效**：
   - 例如先写 `if score >= 60: grade = '及格'`，后面再写 `elif score >= 90: grade = '优秀'`。当分数为 95 时，直接命中 60 的及格分支退出了，永远无法走到 90 的优秀分支！
2. **遗漏边界情况**：
   - 比较运算符切记分清 `<` 还是 `<=`，避免漏掉等于边界（如恰好 60 分）。

---

### 五、本节小结
- if 结构按从上到下顺序匹配，一旦命中立即跳出。
- 拒绝箭头型多重嵌套，善用卫语句提前 return 保证代码扁平。
- 模式匹配 match-case 是处理多值映射分发的新利器。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "区间判断 elif 的条件切忌从宽到严书写，例如 if score >= 60 必须放在 if score >= 90 之后，否则高分会被低门槛提前截流。"
                },
                {
                    "kind": "interview",
                    "text": "代码评审核心考点：遇到超过 3 层的嵌套 if，应立即考虑用卫语句（Guard Clause）提前返回或拆分成小函数。"
                }
            ],
            "demos": [
                {
                    "title": "根据订单特征进行会员权益与运费计算",
                    "lang": "python",
                    "code": "# 模拟根据订单金额、会员等级计算运费与赠礼\ndef checkout(amount: float, is_vip: bool):\n    if amount <= 0:\n        return \"无效订单金额\"\n    \n    # 运费计算规则\n    if is_vip or amount >= 99:\n        shipping = 0.0\n    else:\n        shipping = 10.0\n        \n    # 赠品判断\n    gift = \"定制水杯\" if amount >= 299 else \"无\"\n    \n    return f\"实付商品: ¥{amount:.2f} | 运费: ¥{shipping:.2f} | 赠品: {gift}\"\n\nprint(checkout(45.0, False))\nprint(checkout(120.0, False))\nprint(checkout(320.0, True))\n"
                }
            ]
        }
    ],
    "exercises": [
        {
            "id": "pyf-ex-3-1",
            "type": "single",
            "difficulty": 1,
            "question": "在 Python 的条件测试中，下列哪一个值会被视作真（True）？",
            "options": [
                {"value": "A", "label": "字符串 \"0\"（包含字符 0 的非空字符串）"},
                {"value": "B", "label": "数值 0"},
                {"value": "C", "label": "空列表 []"},
                {"value": "D", "label": "单例对象 None"}
            ],
            "answer": "A",
            "explanation": "在 Python 中，非空字符串的真值一律为 True，哪怕字符串内容是 \"0\" 或 \"False\"；而数值 0、空容器 []、None 均为假。",
            "tags": ["真值测试", "布尔逻辑"]
        },
        {
            "id": "pyf-ex-3-2",
            "type": "single",
            "difficulty": 1,
            "question": "Python 中三大逻辑运算符 not、and、or 的默认计算优先级顺序由高到低是？",
            "options": [
                {"value": "A", "label": "not > and > or"},
                {"value": "B", "label": "and > or > not"},
                {"value": "C", "label": "or > and > not"},
                {"value": "D", "label": "三者优先级完全相同，严格从左向右计算"}
            ],
            "answer": "A",
            "explanation": "Python 逻辑运算符默认优先级为：not 最高，其次是 and，最低的是 or。在复杂表达式中，建议使用括号显式明确计算顺序。",
            "tags": ["运算符优先级", "逻辑运算"]
        },
        {
            "id": "pyf-ex-3-3",
            "type": "judge",
            "difficulty": 2,
            "question": "表达式 `[] or \"Hello\"` 的最终求值结果是字符串 `\"Hello\"`，而不是布尔值 True。",
            "answer": True,
            "explanation": "正确！Python 中的 or 具有短路特性，由于前操作数 [] 为假，因此直接返回后操作数 \"Hello\"（保留原对象与类型），而不是强制转换为 True。",
            "tags": ["短路求值", "真值"]
        },
        {
            "id": "pyf-ex-3-4",
            "type": "fill",
            "difficulty": 2,
            "question": "在 Python 中，若想表达“变量 x 在 10 到 50 之间（包含 10 但不包含 50）”，使用 Python 独有的链式比较语法可以优雅地写为 `10 <= x _____ 50`。",
            "blanks": [["<"]],
            "explanation": "Python 允许直接书写数学风格的链式比较：10 <= x < 50。",
            "tags": ["链式比较", "语法特性"]
        },
        {
            "id": "pyf-ex-3-5",
            "type": "single",
            "difficulty": 2,
            "question": "观察以下代码段：\n```python\nval = 15\nif val > 20:\n    res = \"A\"\nelif val > 10:\n    res = \"B\"\nelif val > 5:\n    res = \"C\"\nelse:\n    res = \"D\"\n```\n最终变量 `res` 的值是：",
            "options": [
                {"value": "A", "label": "\"B\""},
                {"value": "B", "label": "\"C\""},
                {"value": "C", "label": "\"B\" 和 \"C\""},
                {"value": "D", "label": "\"D\""}
            ],
            "answer": "A",
            "explanation": "if-elif 具有互斥性，从上到下评估，val=15 满足 val > 10，命中该分支赋值 res='B' 后，立即跳出整个条件结构，不会再走后面的 elif val > 5。",
            "tags": ["流程控制", "代码阅读"]
        },
        {
            "id": "pyf-ex-3-6",
            "type": "multiple",
            "difficulty": 3,
            "question": "关于编写高质量、易维护的条件分支代码，下列哪些做法属于推荐的工程实践？",
            "options": [
                {"value": "A", "label": "在函数头部使用卫语句（Guard Clauses）优先处理异常与边界情况并提前 return"},
                {"value": "B", "label": "对于超过 3 层的嵌套 if 语句进行拆解或重构"},
                {"value": "C", "label": "尽量写 if is_active == True 而不是 if is_active"},
                {"value": "D", "label": "利用布尔表达式短路求值特性来防止访问 None 属性或避免除以零错误"}
            ],
            "answer": ["A", "B", "D"],
            "explanation": "C 选项是反模式，PEP 8 规定布尔变量直接写 if is_active 即可，不需要与 == True 进行冗余比较；A、B、D 均为推荐实践。",
            "tags": ["代码重构", "工程规范"]
        },
        {
            "id": "pyf-ex-3-7",
            "type": "single",
            "difficulty": 3,
            "question": "以下哪种简写语法（三元条件表达式）在 Python 中是合法且标准的？",
            "options": [
                {"value": "A", "label": "result = \"Pass\" if score >= 60 else \"Fail\""},
                {"value": "B", "label": "result = score >= 60 ? \"Pass\" : \"Fail\""},
                {"value": "C", "label": "result = if score >= 60 then \"Pass\" else \"Fail\""},
                {"value": "D", "label": "result = \"Pass\" ? score >= 60 : \"Fail\""}
            ],
            "answer": "A",
            "explanation": "Python 的三元条件表达式语法格式固定为：[真值结果] if [条件] else [假值结果]；问号冒号语法属于 C/Java/JS，在 Python 中是非法语法。",
            "tags": ["三元表达式", "语法"]
        },
        {
            "id": "pyf-ex-3-8",
            "type": "code",
            "difficulty": 4,
            "question": "【动手编程】请编写一个折扣结算函数 `calculate_discount(total_amount: float, is_member: bool) -> float`：\n规则如下：\n- 若金额小于等于 0，返回 0.0；\n- 会员用户（is_member 为 True）：金额满 200 打 8 折（乘 0.8），否则打 9 折（乘 0.9）；\n- 非会员用户：金额满 300 打 9 折，否则不打折（原价）；\n- 最终返回计算后的实付金额（保留 2 位小数）。",
            "starterCode": "def calculate_discount(total_amount: float, is_member: bool) -> float:\n    # 请在此处编写折扣逻辑\n    pass\n",
            "expectedOutput": "160.0",
            "answer": "def calculate_discount(total_amount: float, is_member: bool) -> float:\n    if total_amount <= 0:\n        return 0.0\n    if is_member:\n        rate = 0.8 if total_amount >= 200 else 0.9\n    else:\n        rate = 0.9 if total_amount >= 300 else 1.0\n    return round(total_amount * rate, 2)",
            "tests": "assert calculate_discount(-10, True) == 0.0\nassert calculate_discount(200.0, True) == 160.0\nassert calculate_discount(100.0, True) == 90.0\nassert calculate_discount(350.0, False) == 315.0\nassert calculate_discount(150.0, False) == 150.0\n",
            "explanation": "利用卫语句先拦截 <= 0 的情况，再区分会员与非会员进行阶梯折扣计算，最后使用 round(..., 2) 返回结果。",
            "tags": ["编程实操", "分支综合"]
        }
    ]
}

CHAPTER_4 = {
    "id": "pyf-c4",
    "courseId": "python-foundations-data",
    "order": 4,
    "title": "循环控制与迭代结构",
    "goal": "掌握 while 状态循环与 for 集合遍历，理解 range 的区间机制，熟练使用 break、continue、for-else 与内置迭代工具 enumerate、zip。",
    "lessons": [
        {
            "id": "pyf-l4-1",
            "title": "循环基石：while 状态循环与 for 序列遍历",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握 Python 的两种循环结构（`while` 与 `for`），搞清何时选择 while、何时选择 for，掌握 `range(start, stop, step)` 的左闭右开区间与逆序步长。
- **先修要求**：已熟练掌握条件分支判断。

---

### 二、核心概念与术语解释

#### 1. while 循环：条件驱动的状态循环
当满足指定条件时持续执行，常用于**循环次数未知、依赖某种外部状态发生改变**的场景（如读取数据流直到末尾、重试网络连接直到成功）。
```python
count = 0
while count < 3:
    print(f"正在尝试连接第 {count + 1} 次...")
    count += 1
```
> [!CAUTION] 死循环风险
> while 循环体内部**必须有使循环条件最终趋向于 False 的状态更新代码**（如计数器累加、状态标志翻转），否则会导致程序陷入 CPU 100% 占用的死循环！

#### 2. for 循环：可迭代对象（Iterable）的逐一遍历
Python 的 `for` 循环与传统 C 语言的 `for(i=0; i<n; i++)` 本质完全不同！
Python 的 for 循环是标准的 **for-each 迭代器模式**：直接从列表、元组、字符串、字典等任意**可迭代对象（Iterable）**中逐个取出元素，直到取尽为止。

#### 3. 数值计数器利器：`range()`
当确实需要按数字次数循环时，配合 `range()` 使用：
```python
range(stop)             # 从 0 开始，到 stop 结束（不含 stop）
range(start, stop)      # 从 start 开始，到 stop 结束（左闭右开）
range(start, stop, step)# 步长为 step（可为负数）
```
- `range(5)` -> `0, 1, 2, 3, 4`（共 5 次）
- `range(1, 10, 2)` -> `1, 3, 5, 7, 9`
- `range(10, 0, -2)` -> `10, 8, 6, 4, 2`（逆序递减）

> **内存友好机制**：`range()` 在 Python 3 中是一个惰性序列对象，它不管跨度是 10 还是 10 亿，占用的内存大小永远是固定的几个指针字节，只有在被 for 循环迭代到时才会动态计算当前值。

---

### 三、逐步代码演练与执行分析

```python
# 计算 1 到 100 的累加和
total = 0
for num in range(1, 101):  # 注意：必须写到 101 才能包含 100
    total += num
print(f"1 到 100 累加和: {total}")  # 5050

# 遍历字符串中的每一个字符
word = "Python"
for char in word:
    print(char, end="-")
print()  # P-y-t-h-o-n-
```

---

### 四、常见易错陷阱与排查技巧
1. **差一错误（Off-by-one Error）**：
   - 因为 `range(start, stop)` 是左闭右开 `[start, stop)`，初学者想循环 10 次包含 10 时，常常错写成 `range(1, 10)`（实际只有 1~9，共 9 次）。切记：右边界永远不包含！
2. **在 for 循环内部直接删除正在遍历的列表元素**：
   - 边遍历边 `list.remove()` 会导致列表索引内部塌陷，产生跳过元素的不符合预期的灵异现象。正确做法是遍历列表的浅拷贝 `for item in lst.copy():` 或使用列表推导式过滤。

---

### 五、本节小结
- while 适合不确定次数的状态驱动，for 适合已知集合或次数的逐项遍历。
- `range()` 采用经典的左闭右开原则，支持正负步长，内存开销恒定。
- 绝不要在循环遍历列表的同时就地删除其自身元素。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "绝对不要在 for x in my_list: 循环体中执行 my_list.remove(x)，元素前移会导致后续元素被漏掉遍历。"
                },
                {
                    "kind": "performance",
                    "text": "range() 是惰性求值的生成序列，即使写 range(10**9) 也不会预先分配大内存。"
                }
            ],
            "demos": [
                {
                    "title": "while 模拟指数退避重试机制",
                    "lang": "python",
                    "code": "# 模拟数据加载中的重试控制（带最大次数与等待时间退避）\nmax_attempts = 4\nattempt = 1\nsuccess = False\n\nwhile attempt <= max_attempts and not success:\n    print(f\"[尝试 {attempt}/{max_attempts}] 正在尝试读取外部数据源...\")\n    if attempt == 3:  # 模拟第 3 次成功\n        success = True\n        print(\"✓ 数据加载成功！\")\n    else:\n        print(f\"  × 失败，等待重试...\")\n    attempt += 1\n"
                }
            ]
        },
        {
            "id": "pyf-l4-2",
            "title": "循环控制进阶：break、continue、循环 else 与遍历利器",
            "difficulty": 1,
            "content": """### 一、学习目标与先修要求
- **学习目标**：掌握 `break`（立刻截断）与 `continue`（跳过当次）的控制差异，领会 Python 独有的 `for...else` 语法的精妙之处，熟练运用 `enumerate()` 与 `zip()`。
- **先修要求**：熟练掌握 for 与 while 基本语法。

---

### 二、核心概念与术语解释

#### 1. break vs continue
- **`break`**：**彻底终止并跳出**当前所在的最内层循环，不再执行循环体中剩余的代码和后续所有迭代；
- **`continue`**：**仅跳过当次循环**剩余代码，立即跳转到循环头部准备执行下一次迭代。

#### 2. Python 独有的 `for...else` 结构
很多人只知道 `if...else`，不知道 `for` 后面也能接 `else`！
- **执行规则**：**当且仅当 for 循环正常迭代完毕（没有被 break 中途强制掐断）时，才会执行 else 代码块**！
- 经典使用场景：**在集合中搜索目标元素**。如果搜到了执行 break 跳出；如果搜遍整个列表都没找到，自动触发 else 块进行“未找到”的兜底处理，无需额外维护一个 `found = False` 的标记变量！

```python
for item in database:
    if item["id"] == target_id:
        print("找到目标数据:", item)
        break
else:
    print("未找到该目标数据！")  # 只有循环没有被 break 时才执行
```

#### 3. 遍历利器一：`enumerate(iterable, start=0)`
在数据处理时，经常需要**同时获取当前元素的下标索引和值**。
初学者常写 `for i in range(len(items)): val = items[i]`（被视为反模式），Python 的地道写法是使用 `enumerate`：
```python
fruits = ["苹果", "香蕉", "橙子"]
for idx, fruit in enumerate(fruits, start=1):
    print(f"第 {idx} 名: {fruit}")
```

#### 4. 遍历利器二：`zip(*iterables)`
用于将多个可迭代对象**像拉链一样两两配对**打包成元组：
```python
names = ["Alice", "Bob", "Charlie"]
scores = [95, 88, 92]
for name, score in zip(names, scores):
    print(f"{name}: {score}分")
```
> 若序列长度不一致，默认 `zip` 会以最短的序列为准截断（需要以最长为准可用 `itertools.zip_longest`）。

---

### 三、逐步代码演练与执行分析

```python
# 过滤非法数据并计算有效均值
raw_records = [12.5, -1.0, 18.0, None, 25.5, "error", 30.0]
valid_sum = 0.0
valid_count = 0

for idx, rec in enumerate(raw_records):
    # 遇到脏数据跳过当次处理
    if rec is None or not isinstance(rec, (int, float)) or rec < 0:
        continue
    valid_sum += rec
    valid_count += 1

print(f"有效数据条数: {valid_count}, 均值: {valid_sum / valid_count:.2f}")
```

---

### 四、常见易错陷阱与排查技巧
1. **误以为 break 会跳出所有多层嵌套循环**：
   - `break` 只能跳出当前所在的那一层直接循环。若有两层嵌套循环（如循环行和列），内层循环的 break 只能退出内层，外层循环依然会继续执行。若想彻底退出多层循环，应将逻辑封装为函数直接使用 `return`。
2. **`zip` 长度不对齐被悄悄吞噬**：
   - 如果 A 列表有 100 项，B 列表只有 3 项，`zip(A, B)` 只会迭代 3 次就戛然而止，剩余 97 项不会报错也不会被处理。

---

### 五、本节小结
- `break` 彻底退出，`continue` 跳过当次。
- `for...else` 在循环没有被 break 打断时触发，是搜索逻辑的极简实现。
- 拒绝 `range(len(...))`，使用 `enumerate()` 获取索引，使用 `zip()` 多流聚合。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "不要写 for i in range(len(lst)): print(i, lst[i])，在 Python 社区中这是不地道的反模式，应一律使用 for i, val in enumerate(lst):。"
                },
                {
                    "kind": "interview",
                    "text": "for...else 的核心逻辑是'没有被 break 时才执行 else'，常用于素数判定、目标检索等场景。"
                }
            ],
            "demos": [
                {
                    "title": "enumerate 与 zip 在多维报表合并中的综合应用",
                    "lang": "python",
                    "code": "# 模拟合并用户信息、部门与绩效评分并输出序号\nemployees = [\"张伟\", \"王芳\", \"李强\", \"刘洋\"]\ndepartments = [\"市场部\", \"技术部\", \"财务部\", \"运营部\"]\nscores = [88.5, 95.0, 91.0, 84.0]\n\nprint(f\"{'序号':<4} | {'姓名':<6} | {'部门':<6} | {'绩效得分':>8}\")\nprint(\"-\" * 34)\nfor rank, (name, dept, score) in enumerate(zip(employees, departments, scores), start=1):\n    print(f\"{rank:<4} | {name:<6} | {dept:<6} | {score:>8.1f}\")\n"
                }
            ]
        }
    ],
    "exercises": [
        {
            "id": "pyf-ex-4-1",
            "type": "single",
            "difficulty": 1,
            "question": "执行 `list(range(2, 10, 3))` 得到的结果列表是哪一个？",
            "options": [
                {"value": "A", "label": "[2, 5, 8]"},
                {"value": "B", "label": "[2, 5, 8, 11]"},
                {"value": "C", "label": "[2, 4, 6, 8]"},
                {"value": "D", "label": "[3, 6, 9]"}
            ],
            "answer": "A",
            "explanation": "range(2, 10, 3) 从 2 开始，步长为 3，依次产生 2, 5, 8。下一个数是 11，但右边界是 10（不包含 10），因此只有 [2, 5, 8]。",
            "tags": ["range", "迭代器"]
        },
        {
            "id": "pyf-ex-4-2",
            "type": "single",
            "difficulty": 2,
            "question": "在循环体内部，关于关键字 `break` 与 `continue` 的区别，描述最准确的是？",
            "options": [
                {"value": "A", "label": "break 直接终止并彻底跳出当前循环；continue 仅跳过当次循环剩余代码并进入下一次迭代"},
                {"value": "B", "label": "break 只能用在 while 中；continue 只能用在 for 中"},
                {"value": "C", "label": "break 跳过当次循环；continue 彻底退出当前循环"},
                {"value": "D", "label": "两者没有任何区别，可以随意互换"}
            ],
            "answer": "A",
            "explanation": "break 用于强行结束整个循环；continue 只是提前结束当前这一次迭代，立刻回到循环开头继续执行下一个元素。",
            "tags": ["break", "continue"]
        },
        {
            "id": "pyf-ex-4-3",
            "type": "judge",
            "difficulty": 2,
            "question": "在 Python 的 `for...else` 结构中，如果 for 循环中途执行了 `break` 语句跳出，紧跟在后的 `else` 代码块依然会被执行。",
            "answer": False,
            "explanation": "错误！for...else 的核心语义是：只有当 for 循环自然遍历完毕全部元素（未被 break 中断）时，才会执行 else 块。若中途触发 break，else 块会被直接跳过。",
            "tags": ["for-else", "控制流"]
        },
        {
            "id": "pyf-ex-4-4",
            "type": "fill",
            "difficulty": 2,
            "question": "想要在遍历列表 `items` 时同时获得从 0 开始的数字索引与元素值，最地道规范的写法是 `for idx, val in _____(items):`。",
            "blanks": [["enumerate"]],
            "explanation": "Python 内置的 enumerate() 函数专门用于将可迭代对象包装为 (index, value) 对。",
            "tags": ["enumerate", "常用内置函数"]
        },
        {
            "id": "pyf-ex-4-5",
            "type": "single",
            "difficulty": 3,
            "question": "观察以下代码：\n```python\ns = 0\nfor i in range(1, 6):\n    if i % 2 == 0:\n        continue\n    s += i\n```\n最终 `s` 的值是多少？",
            "options": [
                {"value": "A", "label": "9"},
                {"value": "B", "label": "15"},
                {"value": "C", "label": "6"},
                {"value": "D", "label": "10"}
            ],
            "answer": "A",
            "explanation": "range(1, 6) 产生 1, 2, 3, 4, 5。当 i 为偶数（2, 4）时触发 continue 跳过；只对奇数 1, 3, 5 进行累加：1 + 3 + 5 = 9。",
            "tags": ["代码阅读", "continue"]
        },
        {
            "id": "pyf-ex-4-6",
            "type": "multiple",
            "difficulty": 3,
            "question": "使用内置函数 `zip(list_a, list_b)` 并行迭代两个列表时，下列说法正确的有？",
            "options": [
                {"value": "A", "label": "若两列表长度相同，每次迭代产出一个包含两列表对应位置元素的元组"},
                {"value": "B", "label": "若两列表长度不一致，默认会以较短的列表长度为准截断，多余元素被忽略"},
                {"value": "C", "label": "若两列表长度不一致，会自动抛出 ValueError 异常"},
                {"value": "D", "label": "zip() 返回的是一个惰性可迭代对象，可以通过 list() 将其一次性转为列表"}
            ],
            "answer": ["A", "B", "D"],
            "explanation": "zip 默认截断到最短序列，绝不会自动报错（如需报错需在 Python 3.10+ 中显式传 strict=True）；zip 返回迭代器，可以通过 list() 物化为元组列表。",
            "tags": ["zip", "多序列迭代"]
        },
        {
            "id": "pyf-ex-4-7",
            "type": "single",
            "difficulty": 4,
            "question": "在包含内层与外层的双重嵌套循环中，若在内层循环中执行了 `break`，下列关于程序行为的描述正确的是？",
            "options": [
                {"value": "A", "label": "仅跳出当前最内层循环，外层循环继续正常执行下一轮迭代"},
                {"value": "B", "label": "会直接跳出所有嵌套循环，并退出当前函数"},
                {"value": "C", "label": "会导致外层循环也立即执行其对应的 else 块"},
                {"value": "D", "label": "程序会抛出 BreakLevelException 异常"}
            ],
            "answer": "A",
            "explanation": "Python 的 break 只作用于直接包围它的那一层最近的循环；要一次性跳出多层循环，应将逻辑封装为函数并执行 return，或者设置标志变量。",
            "tags": ["嵌套循环", "break"]
        },
        {
            "id": "pyf-ex-4-8",
            "type": "code",
            "difficulty": 4,
            "question": "【动手编程】请编写函数 `sum_even_squares(nums: list) -> int`：\n输入一个整数列表，计算并返回其中**所有偶数的平方和**。若列表为空或没有偶数，返回 0。",
            "starterCode": "def sum_even_squares(nums: list) -> int:\n    # 请在此处使用循环完成计算\n    pass\n",
            "expectedOutput": "20",
            "answer": "def sum_even_squares(nums: list) -> int:\n    total = 0\n    for n in nums:\n        if n % 2 == 0:\n            total += n ** 2\n    return total",
            "tests": "assert sum_even_squares([1, 2, 3, 4]) == 20  # 2^2 + 4^2 = 4 + 16 = 20\nassert sum_even_squares([1, 3, 5]) == 0\nassert sum_even_squares([]) == 0\nassert sum_even_squares([0, -2]) == 4\n",
            "explanation": "遍历列表，对能被 2 整除的偶数计算 n**2 并累加到 total 中返回。",
            "tags": ["编程实操", "循环计算"]
        }
    ]
}
