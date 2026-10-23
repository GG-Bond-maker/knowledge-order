import type { Exercise, Lesson } from '../../../types';

/* ============================================================
 *  Python 课程扩展包
 *
 *  本文件只存放"补充内容"：
 *   - lessons  ：追加的知识点小节（id 形如 py-l-<章>-<节>，与 ch1~ch6 不重复）
 *   - exercises：追加的习题（id 形如 py-<章>-x<序号>，与 ch1~ch6 不重复）
 *
 *  写作约定（务必遵守）：
 *   1. 题干 / 解析 / tips 中的行内代码用转义反引号 \`代码\` 书写；
 *   2. 代码类字段（code / starterCode / tests / setupCode）内部禁止出现反引号；
 *   3. 编程题的 tests 每行一个 assert（或函数定义），判分器逐行计分；
 *   4. 编程题必须在 Pyodide 环境（Python 3.13 + numpy + pandas + matplotlib）可运行，
 *      不使用 scipy / sklearn，且避免用到 CPython 3.13.5+ 才有的新语法。
 *
 *  难度分级：第 1 章 1~3；第 2~3 章 2~4；第 4~5 章 3~5；第 6 章 4~5，并保证每章
 *  入门巩固题（difficulty 1~2）占一定比例。
 * ============================================================ */

export const pythonExtra: {
  chapterId: string;
  lessons?: Lesson[];
  exercises: Exercise[];
}[] = [
  /* ============================================================
   *  第 1 章：变量与基础数据类型（扩展 23 题 + 2 个小节）
   * ============================================================ */
  {
    chapterId: 'python-1',
    lessons: [
      {
        id: 'py-l-1-6',
        title: '运算符与优先级',
        content: `
## 为什么需要单独学运算符

数据清洗代码里出现 \`if x == 1 or 2\` 这种情况非常多。它**不报错**，但永远为真——这类错误比语法错误更难发现，因为程序跑得通、结果却是错的。掌握优先级与"返回值语义"，是写出正确条件表达式的前提。

## 算术运算符的四个例外

优先级从高到低：\`**\` > 一元负号 > \`* / // %\` > \`+ -\`。

\`\`\`python
print(2 ** 3 ** 2)     # 512，幂运算右结合：2 ** (3 ** 2)
print(-2 ** 2)         # -4，幂运算优先于一元负号：-(2 ** 2)
print(7 // 2 * 2)      # 6，同级从左到右
print(10 / 4)          # 2.5，/ 的结果永远是 float
print(10 // 4)         # 2，// 向下取整
print(-7 // 2, -7 % 2) # -4 1，取整方向是"负无穷"，不是"向零截断"
\`\`\`

**整除与取余满足恒等式** \`a == (a // b) * b + (a % b)\`。正数时取余结果非负；负数时结果与除数同号：\`-7 % 2\` 是 1，而 \`7 % -2\` 是 -1。用 \`% 2 == 1\` 判断奇数是常见 bug——负数不满足，正确写法是 \`% 2 != 0\` 或 \`x % 2 == 1\` 前先取绝对值。

## 赋值类运算符与"海象"

\`\`\`python
n = 10
n += 5      # 15
n //= 2     # 7
n **= 2     # 49

# 海象运算符 :=（3.8+）：在表达式里赋值
if (rows := len(data)) > 1000:
    print(f"数据量偏大：{rows} 行")
\`\`\`

注意 \`+=\` 对**可变对象是原地修改**（列表的 \`+=\` 等价于 \`extend\`），对不可变对象是重新绑定。\`t = ([1],); t[0] += [2]\` 会报 \`TypeError\`，但列表其实已经被改掉了——这是著名的历史遗留怪癖。

## 比较与逻辑的优先级

比较运算符（\`< > <= >= == !=\`）高于 \`not\`，\`not\` 高于 \`and\`，\`and\` 高于 \`or\`：

\`\`\`python
# not a == b 等价于 not (a == b)，不是 (not a) == b
print(not 1 == 2)          # True
# and 的优先级高于 or，所以下面等价于  False or (True and True)
print(False or True and True)   # True
\`\`\`

**实践建议**：只要条件里同时出现 \`and\`、\`or\`、\`not\`，就加括号。可读性收益远大于"少写两个括号"的优雅感。

## 位运算符（pandas 里一定要用）

| 运算符 | 含义 | 对整数 | 对布尔 |
| --- | --- | --- | --- |
| \`&\` | 按位与 | 逐位与 | 逻辑与（不短路） |
| \`\\|\` | 按位或 | 逐位或 | 逻辑或 |
| \`^\` | 按位异或 | 逐位异或 | 不等 |
| \`~\` | 按位取反 | \`-x - 1\` | 逻辑非 |

\`\`\`python
print(6 & 3, 6 | 3, 6 ^ 3, ~6)   # 2 7 5 -7

# NumPy / Pandas 的条件筛选必须用 & | ~，且每个条件要加括号
mask = (df["amount"] > 100) & (df["city"] == "北京")
\`\`\`

原因：\`and\` 无法对数组做"逐元素"运算，会直接抛出 \`ValueError: The truth value of a Series is ambiguous\`。

## 成员、身份与链式比较

\`\`\`python
print("a" in "data", 3 not in [1, 2])   # True True
print(1 < 2 < 3 < 4)                    # True，等价于 1<2 and 2<3 and 3<4
x = None
print(x is None)                        # 推荐：身份比较
\`\`\`

## 一张优先级速查表（从高到低）

| 级别 | 运算符 |
| --- | --- |
| 1 | \`()\`、\`[]\`、\`{}\`、属性访问 \`.\` |
| 2 | \`**\` |
| 3 | \`+x\`、\`-x\`、\`~x\` |
| 4 | \`* / // % @\` |
| 5 | \`+ -\` |
| 6 | \`<< >>\` |
| 7 | \`& \` |
| 8 | \`^ \` |
| 9 | \`| \` |
| 10 | 比较、\`in\`、\`is\` |
| 11 | \`not\` |
| 12 | \`and\` |
| 13 | \`or\` |
| 14 | 条件表达式 \`a if c else b\`、\`lambda\`、赋值 |

记不住时最简单的办法：**加括号**。括号永远是最清晰、也最不会出错的选择。
`,
        tips: [
          {
            kind: 'pitfall',
            text: '负数整除与取模的方向是"向负无穷"，`-7 // 2` 得 `-4`、`-7 % 2` 得 `1`。要截断取整请用 `int(a / b)` 或 `math.trunc`，别用 `//`。',
          },
          {
            kind: 'pitfall',
            text: '`if x == 1 or 2:` 恒为真，因为 `or` 只判断 `2` 的真假。正确写法是 `if x in (1, 2):`，既清晰又不会写错。',
          },
          {
            kind: 'interview',
            text: '高频面试点：`and` / `or` 返回的是**操作数本身**而不是布尔值，`3 and 5` 得 `5`、`0 or "x"` 得 `"x"`；而 `&` / `|` 对整数做按位运算、对布尔值做不短路的逻辑运算。',
          },
          {
            kind: 'performance',
            text: '`x in (1, 2, 3)` 对元组做线性扫描；如果候选值超过十几个且需要反复判断，改为 `frozenset` 可降到 O(1)。',
          },
        ],
        demos: [
          {
            title: '优先级与结合性实验',
            lang: 'python',
            code: `print("2 ** 3 ** 2 =", 2 ** 3 ** 2)      # 右结合
print("-2 ** 2 =", -2 ** 2)               # 一元负号优先级更低
print("7 // 2 * 2 =", 7 // 2 * 2)         # 同级从左往右
print("-7 // 2 =", -7 // 2, " -7 % 2 =", -7 % 2)

print("\\n恒等式 a == (a // b) * b + (a % b)：")
for a, b in [(7, 2), (-7, 2), (7, -2)]:
    print(f"  a={a:>2} b={b:>2} → {a // b} * {b} + {a % b} = {(a // b) * b + (a % b)}")

print("\\n逻辑运算返回值：")
print("  3 and 5 =", 3 and 5, " | 0 or 'x' =", 0 or "x", " | not 1 == 2 =", not 1 == 2)

print("\\n位运算：")
print("  6 & 3 =", 6 & 3, " 6 | 3 =", 6 | 3, " 6 ^ 3 =", 6 ^ 3, " ~6 =", ~6)`,
          },
          {
            title: '复合赋值对可变对象的影响',
            lang: 'python',
            code: `a = [1, 2]
b = a
a += [3]          # 等价于 a.extend([3])，原地修改
print("a =", a, " b =", b, "→ b 也变了:", a is b)

x = (1, 2)
y = x
x += (3,)         # 元组不可变：创建新对象并重新绑定
print("x =", x, " y =", y, "→ y 不受影响:", x is y)

# 海象运算符：在条件里赋值
rows = [10] * 5
if (n := len(rows)) > 3:
    print(f"\\n行数 {n} 超过阈值 3")`,
          },
        ],
      },
      {
        id: 'py-l-1-7',
        title: '注释、文档字符串与 PEP 8 风格',
        content: `
## 注释的三种形态

\`\`\`python
# 1. 单行注释：解释"为什么"，而不是"做什么"

"""
2. 模块级 docstring：写在文件第一行，说明模块用途
"""

def clean_city(name: str) -> str:
    """3. 函数 docstring：说明参数、返回与约定（由 help() 可查看）。"""
    return name.strip()
\`\`\`

**最重要的一条原则**：注释解释**为什么**，代码本身表达**做什么**。看到 \`i += 1  # i 加 1\` 这种注释，说明代码或注释至少有一个是多余的。

## docstring 的标准写法

\`\`\`python
def calc_growth(current: float, previous: float) -> float | None:
    """计算同比增长率。

    Args:
        current: 本期值，单位为元。
        previous: 上期值，单位为元。

    Returns:
        增长率（0.12 表示 12%）；上期值为 0 时返回 None。

    Raises:
        TypeError: 参数不是数值类型时。

    Note:
        分母为 0 时不做"无穷大"处理，而是返回 None，由调用方决定口径。
    """
\`\`\`

对数据分析脚本而言，docstring 里最有价值的是 **Note 部分的口径说明**——它能让接手的人明白"这个指标到底怎么算的"。

## 快捷键 \`Ctrl + /\` 与"注释掉的代码"

被注释掉的整段旧代码应直接删除（有 git 兜底）。留在文件里的死代码会让阅读者反复确认"这段是不是还要用"。

## PEP 8 核心规则（团队协作的最小公约数）

| 项目 | 规范 | 示例 |
| --- | --- | --- |
| 变量 / 函数 | \`snake_case\` | \`order_total\` |
| 类名 | \`PascalCase\` | \`DataLoader\` |
| 常量 | \`UPPER_CASE\` | \`MAX_RETRY = 3\` |
| 缩进 | 4 个空格，禁止 Tab | — |
| 运算符两侧 | 各一个空格 | \`x = a + b\` |
| 逗号后 | 一个空格 | \`f(a, b)\` |
| 行宽 | 不超过 79 字符（团队常用 100/120） | — |
| 导入顺序 | 标准库 → 第三方 → 本项目 | 空行分组 |
| 空行 | 顶层定义之间 2 个，类内方法之间 1 个 | — |

\`\`\`python
# 不符合 PEP 8
import os,sys
def  Calc_Total( items ):
    total=0
    for i in items : total+=i
    return total

# 符合 PEP 8
import os
import sys


def calc_total(items: list[float]) -> float:
    total = 0.0
    for item in items:
        total += item
    return total
\`\`\`

## 自动化工具链

1. **格式化**：\`black\`（几乎零配置）或 \`ruff format\`；
2. **静态检查**：\`ruff check\` 或 \`flake8\`（未使用的导入、未定义变量）；
3. **类型检查**：\`mypy\` / \`pyright\`（配合类型注解）；
4. **导入排序**：\`isort\` 或 \`ruff\` 的 I 规则。

在项目根目录放一个 \`pyproject.toml\` 配置后，编辑器保存即自动整理——把风格问题交给工具，评审精力才能放在逻辑上。

## 变量命名的三个实战建议

1. **单位进名字**：\`amount_yuan\`、\`duration_ms\`、\`rate_pct\`，避免"999 元被当成 999 分"这类事故；
2. **布尔用问句**：\`is_valid\`、\`has_duplicate\`、\`can_retry\`；
3. **避免无意义缩写**：\`df_train\` 可以，\`dft\`、\`t1\`、\`tmp2\` 不行。
`,
        tips: [
          {
            kind: 'pitfall',
            text: 'docstring 只是字符串表达式，不会被执行；写在函数体中间但不紧贴 \`def\` 下一行的字符串，不会被 \`__doc__\` 收集，也不起作用。',
          },
          {
            kind: 'note',
            text: 'PEP 8 是"多数项目遵循"的风格指南而非语法约束。团队已有约定时跟随团队，不要为了统一到 PEP 8 而制造无意义的大 diff。',
          },
          {
            kind: 'leak',
            text: '把格式化与静态检查接进 pre-commit hook，风格问题就不会再出现在 code review 里，评审也能专注于口径与逻辑本身。',
          },
        ],
        demos: [
          {
            title: '好的命名与 docstring',
            lang: 'python',
            code: `MAX_RETRY = 3

def calc_growth(current: float, previous: float) -> float | None:
    """计算同比增长率。

    Args:
        current: 本期值。
        previous: 上期值。

    Returns:
        增长率；上期值为 0 时返回 None。
    """
    if previous == 0:
        return None
    return (current - previous) / previous

print(calc_growth(120, 100))
print(calc_growth(120, 0))
print("\\ndocstring:\\n" + calc_growth.__doc__)
print("\\n常量:", MAX_RETRY)

# 布尔变量用问句命名，读起来像自然语言
orders = [{"amount": 120, "paid": True}, {"amount": 80, "paid": False}]
has_unpaid = any(not o["paid"] for o in orders)
all_amounts_valid = all(o["amount"] > 0 for o in orders)
print("\\nhas_unpaid =", has_unpaid, " all_amounts_valid =", all_amounts_valid)`,
          },
          {
            title: '风格检查的"人肉版"',
            lang: 'python',
            code: `import re

snippet = """import os,sys
def  Calc_Total( items ):
    total=0
    for i in items : total+=i
    return total
"""

checks = {
    "行尾多余字符": r"[ \\t]+$",
    "逗号后缺空格": r",\\S",
    "函数名不是 snake_case": r"def [A-Z]",
    "运算符两侧缺空格": r"\\w[+\\-*/]=\\w",
}

lines = snippet.splitlines()
for name, pattern in checks.items():
    hits = [i + 1 for i, line in enumerate(lines) if re.search(pattern, line)]
    print(f"{name:<16} 命中行：{hits}")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'py-1-x1',
        type: 'single',
        difficulty: 1,
        question: '`print(7 // 2, 7 % 2, 7 / 2)` 的输出是？',
        options: [
          { value: 'A', text: '`3 1 3.5`' },
          { value: 'B', text: '`3 1 3`' },
          { value: 'C', text: '`4 1 3.5`' },
          { value: 'D', text: '`3.5 1 3.5`' },
        ],
        answer: 'A',
        explanation:
          '`//` 是整除，结果类型跟随操作数（两个整数得到整数 `3`）；`%` 取余得 `1`；`/` 的真除法结果**永远是 float**，得 `3.5`。注意 `7 / 2` 不会自动截断，这是从 C 语言转过来最容易出错的地方。',
        tags: ['运算符', '基础数据类型'],
        relatedLessonId: 'py-l-1-2',
      },
      {
        id: 'py-1-x2',
        type: 'judge',
        difficulty: 1,
        question: '`int("3.5") + 1` 的结果是 `4`。',
        answer: false,
        explanation:
          '`int("3.5")` 会抛 `ValueError: invalid literal for int() with base 10`，因为字符串 `"3.5"` 不是整数字面量。必须先转 `float` 再截断：`int(float("3.5")) + 1` 得 `4`。这一点和 \`int(3.5)\` 不同——后者参数本来就是数值，直接向零截断为 `3`。',
        tags: ['类型转换'],
      },
      {
        id: 'py-1-x3',
        type: 'multiple',
        difficulty: 2,
        question: '关于 `name = " 张三 "`，下列哪些说法**正确**？（多选）',
        options: [
          { value: 'A', text: '`len(name)` 等于 `4`' },
          { value: 'B', text: '`name.strip()` 返回新字符串，`name` 本身不变' },
          { value: 'C', text: '`name[1:]` 的结果是 `"张三 "`' },
          { value: 'D', text: '`name.strip().upper()` 的结果是 `" 张三 "`' },
          { value: 'E', text: '`"张三" in name` 的结果是 `True`' },
          { value: 'F', text: '`name[0] = "李"` 可以就地替换第一个字符' },
        ],
        answer: ['A', 'B', 'C', 'E'],
        explanation:
          'A 正确：字符串长度按**字符**计，前导 1 个空格 + 2 个汉字 + 尾部 1 个空格 = 4。B 正确：字符串不可变，`strip` 返回新对象，原变量不受影响。C 正确：切片左闭右开，从下标 1 取到末尾，只剩 `"张三 "`。E 正确：子串判断。\n\nD 错误：`strip().upper()` 的结果是 `"张三"`（中文字符不受 `upper` 影响），不是带空格的原文。F 错误：字符串不支持下标赋值，`name[0] = "李"` 会抛 `TypeError`，正确写法是 `"李" + name[1:]`。\n\n这四个错误选项都是数据清洗中最常见的误解：把"方法返回新对象"误当成"就地修改"。',
        tags: ['字符串', '切片', '不可变'],
        relatedLessonId: 'py-l-1-3',
      },
      {
        id: 'py-1-x4',
        type: 'fill',
        difficulty: 1,
        question: '把字符串 `s = "  华东-上海  "` 清洗为 `"华东-上海"`（去掉首尾空白），补全方法名：\n\n```python\ns = "  华东-上海  "\nclean = s.___()\nassert clean == "华东-上海"\n```',
        blanks: [['strip']],
        explanation:
          '`str.strip()` 不加参数时默认去掉首尾所有空白字符（空格、`\\t`、`\\n`、`\\r`）。配套还有 `lstrip()` / `rstrip()` 只去掉一侧。注意它返回新字符串，必须把返回值赋回去才会生效。',
        tags: ['字符串', '数据清洗'],
        relatedLessonId: 'py-l-1-3',
      },
      {
        id: 'py-1-x5',
        type: 'single',
        difficulty: 2,
        question: '下列表达式中，哪个的值为 `True`？',
        options: [
          { value: 'A', text: '`0.1 + 0.2 == 0.3`' },
          { value: 'B', text: '`1 == 1.0`' },
          { value: 'C', text: '`"1" == 1`' },
          { value: 'D', text: '`[] == False`' },
        ],
        answer: 'B',
        explanation:
          'B 正确：`==` 比较的是**值**，`1` 与 `1.0` 数值相等，故为 `True`。A 是浮点误差（得 `0.30000000000000004`）。C 为 `False`：Python 是强类型，字符串与整数不相等（也不会隐式转换，`"1" + 1` 还会直接抛 `TypeError`）。D 为 `False`：`bool([])` 为 `False` 只是"真值判断"的结果，`[] == False` 比较的是"空列表是否等于布尔假值"，二者不相等。\n\n这题的价值在于区分**真值（bool 转换）**与**相等比较**——\`if x:\` 用前者，\`x == y\` 用后者。',
        tags: ['运算符', '布尔值'],
        relatedLessonId: 'py-l-1-4',
      },
      {
        id: 'py-1-x6',
        type: 'judge',
        difficulty: 2,
        question: '\`0.1 + 0.2 == 0.3\` 为 \`False\`，因此 \`0.1 + 0.2 > 0.3\` 也一定为 \`False\`。',
        answer: false,
        explanation:
          '恰恰相反：`0.1 + 0.2` 实际是 `0.30000000000000004`，它**大于** `0.3`，所以 `0.1 + 0.2 > 0.3` 为 `True`。很多人以"两个数都不相等，那至少不小于"来推理，结果就错了。正确的判断方式用 `math.isclose(0.1 + 0.2, 0.3, rel_tol=1e-9)`，或用 `Decimal` 做精确十进制运算。',
        tags: ['浮点数'],
        relatedLessonId: 'py-l-1-2',
      },
      {
        id: 'py-1-x7',
        type: 'multiple',
        difficulty: 2,
        question: '关于 f-string 格式化 \`f"{1234.5678:,.2f}"\`，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '输出为 `"1,234.57"`' },
          { value: 'B', text: '`,` 表示千分位分隔符' },
          { value: 'C', text: '`.2f` 表示保留 2 位小数' },
          { value: 'D', text: '`,` 只能用于整数，用于小数会报错' },
          { value: 'E', text: '输出的结果是字符串类型' },
        ],
        answer: ['A', 'B', 'C', 'E'],
        explanation:
          'A 正确：四舍五入到 2 位小数并加千分位。B、C 是格式说明符的标准含义。E 正确：f-string 的结果总是 `str`，因此不能直接参与算术运算。D 错误：`,` 对浮点数完全合法，`f"{1234567.891:,}"` 得到 `"1,234,567.891"`。\n\n金额展示常用组合：`f"{amount:,.2f}"`；百分比用 `f"{rate:.1%}"`；左对齐表格用 `f"{name:<8}"`。',
        tags: ['字符串格式化'],
        relatedLessonId: 'py-l-1-3',
      },
      {
        id: 'py-1-x8',
        type: 'fill',
        difficulty: 2,
        question: '把 \`s = "order_id,city,amount"\` 按逗号切分，再把结果用 \`|\` 连接起来，得到 \`"order_id|city|amount"\`。补全两个方法名：\n\n```python\ns = "order_id,city,amount"\nparts = s.___(",")\nresult = "|".___(parts)\nassert result == "order_id|city|amount"\n```',
        blanks: [['split'], ['join']],
        explanation:
          '`str.split(sep)` 把字符串切成列表；`sep.join(iterable)` 是 `split` 的逆操作，注意 `join` 的调用方是**分隔符**而不是列表。这两个方法在处理 CSV 风格数据时最常用。',
        tags: ['字符串'],
        relatedLessonId: 'py-l-1-3',
      },
      {
        id: 'py-1-x9',
        type: 'single',
        difficulty: 2,
        question: '关于元组赋值 \`a, b = a + b, a\`，执行后 \`b\` 的值是？',
        options: [
          { value: 'A', text: '新的 `a + b`' },
          { value: 'B', text: '执行前的 `a`' },
          { value: 'C', text: '执行前的 `b`' },
          { value: 'D', text: '抛出异常，因为 \`a\` 被覆盖了' },
        ],
        answer: 'B',
        explanation:
          '右侧先被**整体求值**成元组 `(a + b, a)`，此时用的都是旧值，然后才依次赋值给左侧。这是 Python 交换变量 \`a, b = b, a\` 能够生效的原理，不需要临时变量，也不会出现"先赋值后取值"的顺序问题。',
        tags: ['变量', '解包'],
        relatedLessonId: 'py-l-1-1',
      },
      {
        id: 'py-1-x10',
        type: 'judge',
        difficulty: 1,
        question: '在 Python 中 \`a = b = []\` 之后，\`a\` 和 \`b\` 指向同一个列表对象，对 \`a\` 执行 \`append\` 后续 \`b\` 也会变。',
        answer: true,
        explanation:
          '链式赋值按"从右往左"执行：先创建列表对象 \`[]\`，再让两个名字都指向它。因此 `a`、`b` 是同一对象的两个标签。要得到两个独立列表必须分别赋值 `a, b = [], []`（右侧两个字面量是两次独立求值）。',
        tags: ['变量', '引用'],
        relatedLessonId: 'py-l-1-1',
      },
      {
        id: 'py-1-x11',
        type: 'multiple',
        difficulty: 3,
        question: '下列哪些操作会**创建新的对象**（原对象不受影响）？（多选）',
        options: [
          { value: 'A', text: '`s = "abc"; s2 = s.upper()`' },
          { value: 'B', text: '`lst = [1, 2]; lst2 = lst.append(3)`' },
          { value: 'C', text: '`t = (1, 2); t2 = t + (3,)`' },
          { value: 'D', text: '`d = {"a": 1}; d2 = d.update({"b": 2})`' },
          { value: 'E', text: '`x = 1; y = x; y = y + 1`' },
        ],
        answer: ['A', 'C', 'E'],
        explanation:
          'A：字符串不可变，`upper` 必然返回新对象。C：元组拼接生成新元组。E：`y = y + 1` 创建了新整数对象并重新绑定 `y`，`x` 仍是 1。\n\nB、D 是陷阱：`append` / `update` 都是**原地修改**并在成功时返回 `None`，所以 `lst2`、`d2` 得到的都是 `None`，并且原对象已经被改掉了。这说明"有返回值的方法"和"原地方法"必须区分清楚。',
        tags: ['对象', '可变性'],
        relatedLessonId: 'py-l-1-1',
      },
      {
        id: 'py-1-x12',
        type: 'fill',
        difficulty: 3,
        question: '判断用户输入是否为空字符串 \`""\`，为了可读性不想写 \`not s\`，而用一个"表示长度"的内置函数：\n\n```python\ns = ""\nis_empty = ___(s) == 0\nassert is_empty is True\n```',
        blanks: [['len']],
        explanation:
          '`len(s) == 0` 与 `not s` 等价，但语义更直白。在团队代码里，显式表达"长度为 0"往往比隐式的真值判断更容易被新手读懂。注意 \`is_empty\` 存的是 \`len(...) == 0\` 的结果（`bool`），所以 \`is True\` 成立。',
        tags: ['内置函数', '布尔值'],
        relatedLessonId: 'py-l-1-4',
      },
      {
        id: 'py-1-x13',
        type: 'single',
        difficulty: 3,
        question:
          '阅读代码：\n\n```python\nx = 0.1\ny = 0.1\ntotal = 0.0\nfor _ in range(10):\n    total += y\nprint(total == 1.0, round(total, 10) == 1.0)\n```\n\n输出是？',
        options: [
          { value: 'A', text: '`True True`' },
          { value: 'B', text: '`False True`' },
          { value: 'C', text: '`False False`' },
          { value: 'D', text: '`True False`' },
        ],
        answer: 'B',
        explanation:
          '0.1 的二进制表示有误差，累加 10 次得到 `0.9999999999999999`，与 `1.0` 不相等，所以第一个为 `False`；`round(total, 10)` 抹掉末位误差后得到 `1.0`，第二个为 `True`。\n\n这题说明：累积误差会随运算次数放大，**越长的累加链越不能直接用 `==` 比较**。生产代码应使用 `math.isclose`、`Decimal` 或（金额场景）以"分"为单位的整数。',
        tags: ['浮点数', '调试'],
        relatedLessonId: 'py-l-1-2',
      },
      {
        id: 'py-1-x14',
        type: 'judge',
        difficulty: 2,
        question: '`type(True)` 返回 `<class \'bool\'>`，所以 `isinstance(True, int)` 为 `False`。',
        answer: false,
        explanation:
          '`bool` 是 `int` 的子类，因此 `isinstance(True, int)` 为 `True`，`True + True` 等于 `2`。这也是 \`sum([True, True, False])\` 能得到 `2` 的原因。反过来的检查 \`type(True) is int\` 却是 `False`，这就是为什么推荐用 `isinstance` 而不是 `type(...) is ...`。',
        tags: ['布尔值', '类型检查'],
        relatedLessonId: 'py-l-1-5',
      },
      {
        id: 'py-1-x15',
        type: 'code',
        difficulty: 2,
        question:
          '编写函数 `describe_score(score)`，按分数返回等级：\n\n- `score >= 90` → `"优秀"`\n- `60 <= score < 90` → `"及格"`\n- 其余 → `"不及格"`\n\n然后对 `scores = [95, 60, 59.9, 72]` 逐个调用，把结果列表保存到变量 `out`。',
        starterCode: `scores = [95, 60, 59.9, 72]

def describe_score(score):
    if score >= 90:
        return ___
    elif score >= 60:
        return ___
    return ___

out = [describe_score(s) for s in scores]
`,
        setupCode: '',
        expectedOutput: "['优秀', '及格', '不及格', '及格']",
        tests: `assert out == ["优秀", "及格", "不及格", "及格"], f"结果不正确：{out}"
assert describe_score(90) == "优秀", "90 分应为优秀"
assert describe_score(60) == "及格", "60 分应为及格（含边界）"
assert describe_score(89.99) == "及格"
assert describe_score(0) == "不及格"
`,
        explanation:
          '```python\ndef describe_score(score):\n    if score >= 90:\n        return "优秀"\n    elif score >= 60:\n        return "及格"\n    return "不及格"\n```\n\n三个要点：\n1. `elif` 链是短路的，所以第二个分支只会在 `score < 90` 时被判断，无需重复写 `60 <= score < 90`；\n2. 边界值（90、60）属于"更严格"的那一档，条件必须**从高到低**排列；\n3. 最后的 `return "不及格"` 不需要 `else`，这种"提前返回"写法能减少缩进层级。',
        tags: ['条件分支', '函数'],
        relatedLessonId: 'py-l-1-4',
      },
      {
        id: 'py-1-x16',
        type: 'code',
        difficulty: 2,
        question:
          '用 `math.isclose` 做浮点比较：给出两个列表 `a = [0.1 + 0.2, 1 / 3, 2.675]` 与 `b = [0.3, 0.3333333, 2.68]`，逐对比较是否"近似相等"（相对误差 `1e-6`），结果保存到布尔列表 `flags`；同时统计近似相等的对数为变量 `n_close`。',
        starterCode: `import math

a = [0.1 + 0.2, 1 / 3, 2.675]
b = [0.3, 0.3333333, 2.68]

flags = [___ for x, y in zip(a, b)]
n_close = ___
`,
        setupCode: '',
        expectedOutput: 'flags = [True, True, False]，n_close = 2',
        tests: `assert flags == [True, True, False], f"flags 应为 [True, True, False]，实际 {flags}"
assert n_close == 2, f"n_close 应为 2，实际 {n_close}"
assert flags[0] is True and flags[2] is False, "元素类型应为 bool"
assert all(isinstance(f, bool) for f in flags)
`,
        explanation:
          '```python\nflags = [math.isclose(x, y, rel_tol=1e-6) for x, y in zip(a, b)]\nn_close = sum(flags)\n```\n\n第 1 对：`0.1 + 0.2` 与 `0.3` 只差末位误差，相对误差约 `7.4e-17`，判为近似相等。第 2 对：`1 / 3` 与 `0.3333333` 差约 `3e-8`，也在容差内。第 3 对：`2.675` 与 `2.68` 相差 `0.005`，远大于容差，判为不相等——注意 `round(2.675, 2)` 因为浮点表示而得到 `2.67`，并不是 2.68。\n\n另外，`sum(flags)` 直接统计 `True` 的个数，这是统计"满足条件条数"的常用技巧。',
        tags: ['浮点数', 'math'],
        relatedLessonId: 'py-l-1-2',
      },
      {
        id: 'py-1-x17',
        type: 'code',
        difficulty: 3,
        question:
          '电商订单的运费计算规则写在需求文档里：\n\n- 订单金额 `amount >= 99` → 包邮（运费 0）\n- `amount` 在 `[50, 99)` → 运费 8 元\n- `amount < 50` → 运费 12 元\n- 订单金额为负或缺失（`None`）→ 返回 `None` 表示需要人工处理\n\n实现 `shipping_fee(amount)`，对 `[120, 99, 60, 49.99, -1, None]` 求值，结果保存到 `fees`。',
        starterCode: `amounts = [120, 99, 60, 49.99, -1, None]

def shipping_fee(amount):
    if amount is None or amount < 0:
        return None
    if amount >= ___:
        return 0
    if amount >= ___:
        return 8
    return ___

fees = [shipping_fee(_) for _ in amounts]
`,
        setupCode: '',
        expectedOutput: 'fees = [0, 0, 8, 12, None, None]',
        tests: `assert fees == [0, 0, 8, 12, None, None], f"费率结果不正确：{fees}"
assert shipping_fee(None) is None, "缺失金额应返回 None"
assert shipping_fee(-5) is None, "负数金额应返回 None"
assert shipping_fee(50) == 8, "50 元属于 [50, 99) 档"
assert shipping_fee(99) == 0, "99 元应包邮"
`,
        explanation:
          '```python\ndef shipping_fee(amount):\n    if amount is None or amount < 0:\n        return None\n    if amount >= 99:\n        return 0\n    if amount >= 50:\n        return 8\n    return 12\n```\n\n两个工程细节：\n1. 把"异常输入"的守卫条件放在最前面（guard clause），主逻辑就不再需要嵌套，也不用写成 `else` 链；\n2. 用 `amount is None` 而不是 `not amount`——否则 `amount = 0` 会被误判为"缺失"，虽然 0 元订单很少见，但这是 \`if x:\` 与 \`if x is not None:\` 的经典区别。\n\n\`fees\` 里用 `_` 作为临时变量名表示"这个值不重要"，是常见的风格约定。',
        tags: ['条件分支', '边界值'],
        relatedLessonId: 'py-l-1-4',
      },
      {
        id: 'py-1-x18',
        type: 'code',
        difficulty: 3,
        question:
          '给定一段订单编号 \`code = "ORD-20240315-0087"\`，请只用**字符串切片与方法**返回一个字典，包含：\n\n- \`prefix\`：前缀 `"ORD"`\n- \`year\`：年份 `"2024"`\n- \`month_day\`：`"0315"`\n- \`serial\`：流水号对应的整数 `87`\n- \`len\`：原字符串长度\n\n把结果保存到变量 \`out\`。',
        starterCode: `code = "ORD-20240315-0087"

def parse(code):
    parts = code.split("-")
    date_part = parts[1]
    return {
        "prefix": parts[___],
        "year": date_part[:___],
        "month_day": date_part[___:],
        "serial": ___(parts[2]),
        "len": ___(code),
    }

out = parse(code)
`,
        setupCode: '',
        expectedOutput: "{'prefix': 'ORD', 'year': '2024', 'month_day': '0315', 'serial': 87, 'len': 18}",
        tests: `assert out["prefix"] == "ORD", f"prefix 不正确：{out}"
assert out["year"] == "2024", f"year 不正确：{out}"
assert out["month_day"] == "0315", f"month_day 不正确：{out}"
assert out["serial"] == 87 and isinstance(out["serial"], int), f"serial 应为整数 87：{out}"
assert out["len"] == 18, f"原串长度应为 18，实际 {out['len']}"
`,
        explanation:
          '```python\ndef parse(code):\n    parts = code.split("-")\n    date_part = parts[1]\n    return {\n        "prefix": parts[0],\n        "year": date_part[:4],\n        "month_day": date_part[4:],\n        "serial": int(parts[2]),\n        "len": len(code),\n    }\n```\n\n- `split("-")` 得到 `["ORD", "20240315", "0087"]`；\n- 切片左闭右开：`date_part[:4]` 取前 4 位年份，`date_part[4:]` 取剩余部分；\n- `int("0087")` 会自动丢弃前导零得到 `87`，而如果先用 `strip("0")` 再去转，空串或全零串会出错；\n- 注意 `len` 作为字典键会**遮蔽内置函数名**，字典键场景允许，但不要用 \`len\` 作变量名。',
        tags: ['字符串', '切片'],
        relatedLessonId: 'py-l-1-3',
      },
      {
        id: 'py-1-x19',
        type: 'code',
        difficulty: 3,
        question:
          '用 `Decimal` 做金额计算：`price = Decimal("19.99")`，`qty = 3`，折扣 `0.85`。请计算：\n\n1. `subtotal`：单价 × 数量，按 \`ROUND_HALF_UP\` 保留 2 位小数；\n2. `total`：折扣后的应付金额，同样保留 2 位小数；\n3. `saved`：优惠金额（`subtotal - total`），保留 2 位小数。\n\n三个变量都应为 `Decimal` 类型。',
        starterCode: `from decimal import Decimal, ROUND_HALF_UP

price = Decimal("19.99")
qty = 3
discount = Decimal("0.85")
CENT = Decimal("0.01")

subtotal = ___
total = ___
saved = ___
`,
        setupCode: '',
        expectedOutput: 'subtotal = 59.97, total = 50.97, saved = 9.00',
        tests: `from decimal import Decimal
assert isinstance(subtotal, Decimal) and isinstance(total, Decimal) and isinstance(saved, Decimal), "三个结果都应为 Decimal"
assert subtotal == Decimal("59.97"), f"subtotal 应为 59.97，实际 {subtotal}"
assert total == Decimal("50.97"), f"total 应为 50.97，实际 {total}"
assert saved == Decimal("9.00"), f"saved 应为 9.00，实际 {saved}"
assert saved == subtotal - total, "优惠金额应等于 subtotal - total"
`,
        explanation:
          '```python\nsubtotal = (price * qty).quantize(CENT, rounding=ROUND_HALF_UP)\ntotal = (subtotal * discount).quantize(CENT, rounding=ROUND_HALF_UP)\nsaved = subtotal - total\n```\n\n计算过程：`19.99 × 3 = 59.97`；`59.97 × 0.85 = 50.9745`，`ROUND_HALF_UP` 得 `50.97`；`59.97 - 50.97 = 9.00`（Decimal 会保留尾随零，所以是 `9.00` 而不是 `9`）。\n\n如果全程用 float：`19.99 * 3 = 59.970000000000006`，再乘 0.85 得 `50.97450000000001`，四舍五入时末位误差可能让结果显示成 `50.97` 或 `50.98` 不稳定。**金额必须用 Decimal 或整数分**。',
        tags: ['Decimal', '浮点数'],
        relatedLessonId: 'py-l-1-2',
      },
      {
        id: 'py-1-x20',
        type: 'code',
        difficulty: 3,
        question:
          '实现安全类型转换函数 `to_number(value, default=0.0)`，规则：\n\n- 已经是 \`int\` / \`float\`（但**不包括** \`bool\`，因为 \`True\` / \`False\` 不应被当成 1 / 0 的金额）→ 原样返回数值；\n- 字符串（含首尾空格，如 \`" 12.5 "\`）→ 转为 `float`；\n- 其他情况（`None`、`"abc"`、`bool`、列表）→ 返回 `default`。\n\n对 \`["12.5", None, True, "abc", 3, "  7 ", [1]]\` 逐个调用，结果保存到 \`out\`。',
        starterCode: `def to_number(value, default=0.0):
    if isinstance(value, bool):
        return ___
    if isinstance(value, (int, float)):
        return value
    try:
        return float(value)
    except (TypeError, ValueError):
        return ___

out = [to_number(v) for v in ["12.5", None, True, "abc", 3, "  7 ", [1]]]
`,
        setupCode: '',
        expectedOutput: 'out = [12.5, 0.0, 0.0, 0.0, 3, 7.0, 0.0]',
        tests: `assert out == [12.5, 0.0, 0.0, 0.0, 3, 7.0, 0.0], f"结果不正确：{out}"
assert to_number("abc") == 0.0
assert to_number("abc", default=None) is None, "应支持自定义默认值"
assert to_number(True, default=-1) == -1, "bool 应视为非法值"
assert to_number(" 42 ") == 42.0, "应能处理首尾空格"
`,
        explanation:
          '```python\ndef to_number(value, default=0.0):\n    if isinstance(value, bool):\n        return default\n    if isinstance(value, (int, float)):\n        return value\n    try:\n        return float(value)\n    except (TypeError, ValueError):\n        return default\n```\n\n三个关键点：\n1. `bool` 必须先判断——因为 `bool` 是 `int` 的子类，`isinstance(True, int)` 为 `True`，不先拦截就会被当成 1；\n2. 捕获 `(TypeError, ValueError)`：`float(None)` 是 `TypeError`，`float("abc")` 是 `ValueError`，只捕一种会漏；\n3. 不要用 `try/except` 包住"判断类型"的逻辑，"EAFP"只用在真正会失败的值转换上。',
        tags: ['类型转换', '异常处理', 'isinstance'],
        relatedLessonId: 'py-l-1-5',
      },
      {
        id: 'py-1-x21',
        type: 'code',
        difficulty: 2,
        question:
          '统计真值：给定 `raw = ["北京", "", None, "0", 0, [], "上海"]`，请统计其中**真值**（在 `if` 中为真）的个数保存到 `n_truthy`，并把所有真值按原顺序收集到列表 `truthy`。',
        starterCode: `raw = ["北京", "", None, "0", 0, [], "上海"]

truthy = ___
n_truthy = ___
`,
        setupCode: '',
        expectedOutput: 'truthy = [\'北京\', \'0\', \'上海\']，n_truthy = 3',
        tests: `assert truthy == ["北京", "0", "上海"], f"truthy 不正确：{truthy}"
assert n_truthy == 3, f"n_truthy 应为 3，实际 {n_truthy}"
assert raw == ["北京", "", None, "0", 0, [], "上海"], "不应修改原列表"
`,
        explanation:
          '```python\ntruthy = [v for v in raw if v]\nn_truthy = len(truthy)\n```\n\n`if v` 直接使用对象的真值：空字符串、`None`、`0`、空列表都为假；而 `"0"` 是**非空字符串**所以为真——这正是"CSV 读入的 0 变成字符串后被误判"的原因。\n\n对应的显式写法是 `bool(v)`；而 `len(truthy)` 与 `sum(1 for v in raw if v)` 都能得到个数，前者更易读。',
        tags: ['布尔值', '推导式'],
        relatedLessonId: 'py-l-1-4',
      },
      {
        id: 'py-1-x22',
        type: 'code',
        difficulty: 5,
        question:
          '实现一个"四舍五入到分"的金额工具函数 `round_to_cent(x)`：\n\n- 输入可以是 `float`、`int`、`str` 或 `Decimal`；\n- 输出为 `Decimal`，采用 \`ROUND_HALF_UP\`（遇 5 进位，而不是 Python `round` 的银行家舍入）；\n- 必须**避免**先做 float 运算带来的误差，也就是说 \`round_to_cent("2.675")\` 必须得到 `Decimal("2.68")\`。\n\n对 \`[2.675, "2.675", Decimal("1.005"), 3, "0.1"]\` 求值，结果保存为列表 \`out\`。',
        starterCode: `from decimal import Decimal, ROUND_HALF_UP

CENT = Decimal("0.01")

def round_to_cent(x):
    if isinstance(x, Decimal):
        d = x
    elif isinstance(x, float):
        d = Decimal(___)
    else:
        d = Decimal(___)
    return d.quantize(CENT, rounding=ROUND_HALF_UP)

out = [round_to_cent(v) for v in [2.675, "2.675", Decimal("1.005"), 3, "0.1"]]
`,
        setupCode: '',
        expectedOutput: "[Decimal('2.68'), Decimal('2.68'), Decimal('1.01'), Decimal('3.00'), Decimal('0.10')]",
        tests: `from decimal import Decimal
assert all(isinstance(v, Decimal) for v in out), "结果都应为 Decimal"
assert out[1] == Decimal("2.68"), f"字符串 2.675 应进位到 2.68，实际 {out[1]}"
assert out[2] == Decimal("1.01"), f"Decimal 1.005 应进位到 1.01，实际 {out[2]}"
assert out[3] == Decimal("3.00"), "整数 3 应格式化为 3.00"
assert out[4] == Decimal("0.10"), f"'0.1' 应为 0.10，实际 {out[4]}"
assert round_to_cent("1.004") == Decimal("1.00")
assert round_to_cent("1.005") == Decimal("1.01"), "恰好 5 时应向上进位"
`,
        explanation:
          '```python\ndef round_to_cent(x):\n    if isinstance(x, Decimal):\n        d = x\n    elif isinstance(x, float):\n        d = Decimal(str(x))\n    else:\n        d = Decimal(str(x))\n    return d.quantize(CENT, rounding=ROUND_HALF_UP)\n```\n\n关键点在于 **`Decimal(str(x))` 而不是 `Decimal(x)`**：\n- `Decimal(2.675)` 会把 float 的二进制真值完整展开成 `2.67499999999999982236431605997495353221893310546875`，舍入后得到 `2.67`；\n- `Decimal(str(2.675))` 得到的是十进制字面量 `2.675`，`ROUND_HALF_UP` 后正确进位为 `2.68`。\n\n第二条纪律：**统一用 `str` 转换**，这样 `int`、`str`、`float` 三种输入走同一条路径，行为一致、也避免分支遗漏。',
        tags: ['Decimal', '浮点数', '综合'],
        relatedLessonId: 'py-l-1-2',
      },
      {
        id: 'py-1-x23',
        type: 'open',
        difficulty: 3,
        question:
          '同事的清洗脚本里有这么一行：\n\n```python\nif amount or amount == 0:\n    valid.append(amount)\n```\n\n请指出这段代码的问题，并说明"判断一个值是否缺席"的正确写法（分 `None`、空字符串、数值 0 三种情况讨论）。',
        referenceAnswer: `**问题分析**

1. \`amount or amount == 0\` 实际上等价于"金额为真值，或金额恰好等于 0"。它想表达的是"只要不是缺失值就保留"，但用真值判断来实现，语义完全不匹配。
2. 更隐蔽的是 \`or\` 与 \`==\` 的优先级：\`or\` 优先级低于 \`==\`，所以这句是 \`amount or (amount == 0)\`。如果金额是字符串 \`""\`，第一部分为假，第二部分 \`"" == 0\` 也为假，行被丢弃——**行为看起来"对"，但只是因为巧合**。
3. 在 pandas / NumPy 场景下，若 \`amount\` 是 Series，\`or\` 会直接抛 \`ValueError: The truth value of a Series is ambiguous\`。
4. 如果上游传入的是字符串 \`"0"\`，它是真值，会被保留；而数值 \`0\` 依赖后半句才被保留。两类"0"的处理路径不同，极易产生口径不一致。

**正确写法**

\`\`\`python
# 明确表达"不是缺失值"
if amount is not None:
    valid.append(amount)

# 同时排除空字符串（清洗阶段）
if amount is not None and str(amount).strip() != "":
    valid.append(amount)
\`\`\`

**三种情况分别讨论**

| 值 | \`if x:\` | \`if x is not None:\` | 建议判断方式 |
| --- | --- | --- | --- |
| \`None\` | 假 | 假 | \`x is None\` 判断缺失 |
| \`""\` | 假 | **真** | \`str(x).strip() == ""\` 判断空串 |
| \`0\` | 假 | **真** | \`x == 0\` 或直接用数值 |

**结论**：\`if x:\` 只适合"容器是否为空"这类语义；判断"参数是否传入 / 是否为缺失值"必须用 \`is None\`；判断"字符串是否为空"用 \`strip() == ""\`；数值 \`0\` 是合法业务值，绝不能用真值判断把它过滤掉（否则"0 元订单""0 次点击"这类合法记录会凭空消失，是一种非常隐蔽的数据丢失）。`,
        explanation:
          '本题考察"真值判断 vs 显式缺失判断"。高分答案要能说清三点：一是 `or` / `==` 的优先级导致实际语义与作者意图不符；二是 \`if x:\` 会对 `0`、`""`、`[]` 一律判假，造成合法的 0 值被静默丢弃；三是给出按 `None` / 空串 / 0 分别处理的正确写法。能提到 NumPy/pandas 下 `or` 直接报错、以及"0 被过滤是隐蔽的数据丢失"会明显加分。',
        rubric: [
          { point: '指出 `if x:` 会把 0、空字符串、空容器都判为假', score: 2 },
          { point: '说明 and/or/== 的优先级与实际语义偏差', score: 1 },
          { point: '给出 `is None` 判断缺失值的正确写法', score: 1 },
          { point: '区分空字符串与 None 的不同处理', score: 1 },
          { point: '指出数值 0 是合法值、被过滤即数据丢失（或提及 pandas 下 or 报错）', score: 1 },
        ],
        keywords: ['真值', 'is None', '空字符串', '优先级', '0', '数据丢失'],
        tags: ['布尔值', '数据清洗', '面试'],
        relatedLessonId: 'py-l-1-4',
      },
    ],
  },
];
