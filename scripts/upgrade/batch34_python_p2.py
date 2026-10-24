# -*- coding: utf-8 -*-
"""batch34 p2：python 第 2 章 3 节 + 第 3 章 1 节章主题包升级（TS 源 ch2.ts/extra2.ts）。
py-l-2-2 元组 / 2-5 容器性能 / 2-6 星号解包 / py-l-3-6 递归与迭代
用法：python batch34_python_p2.py verify -> 跑章代码；填好 expected 后直接运行打补丁。
"""
from _batch34_lib import Lib, build_md, finish
import sys

lib = Lib("python", [
    "src/content/chapters/python/ch2.ts",
    "src/content/chapters/python/extra2.ts",
])
REF2 = "本课程整理（可参见 Python 官方文档「数据结构」timecomplexity 与 PEP 3132 相应章节）"
REF3 = "本课程整理（可参见 Python 官方文档 sys.setrecursionlimit 与《流畅的 Python》相应章节）"

T2 = dict(
expected=("3 4 1 [2,3,4] a ['b','c','d','e'] f（含 a,*b,c 解包）；订单-1: 99.0 元 / 已支付；"
          "10 [20,30,40] 50（head/*mid/tail）；[1, 2, 'k', 4, 5]（dict 展开键）；((1,2),{'k':3})；"
          "list 成员判断约 20~40 ms vs set <0.5 ms，加速数百至上千倍（本机实测约 985 倍）；"
          "列表当键 TypeError；元组当键成功；『不可变』元组内的列表被改成 (1, [2, 3, 4])（浅不可变实锤）"),
name="ch2 列表、元组、字典与集合",
why=("容器的选型是数据处理的性能与正确性分水岭：同一份 2 万行的对账，list 逐个 in 判断要"
     "几十秒，set 只要几十毫秒——差三个数量级。元组与列表的「可变性」之分决定它能否当字典"
     "键、能否做函数默认值；解包语法则是 Python 数据在函数与结构之间流动的「管件」。选错"
     "容器的代码往往不是错，而是慢到没人愿意跑。"),
intuition=("四件收纳家具：列表是抽屉柜（有序、可增删改），元组是封条箱（只读、可哈希、能当"
           "键），字典是编号储物柜（键直取，O(1)），集合是重复剔除漏斗（成员判断 O(1)）。"
           "性能差异的本质是「按编号直取」与「从头翻找」的区别。星号解包是三通管件：head,"
           "*mid, tail 一刀把序列分三段，函数调用里 *args/**kwargs 则把序列/字典摊开成参数。"),
code='''import timeit

# ---- 1. 元组与解包 ----
point = (3, 4)
x, y = point
first, *rest = [1, 2, 3, 4]
a, *b, c = "abcdef"
print(x, y, first, rest, a, b, c)
oid, amount, status = ("订单-1", 99.0, "已支付")
print(f"{oid}: {amount:.1f} 元 / {status}")

# ---- 2. 星号解包实战 ----
head, *mid, tail = [10, 20, 30, 40, 50]
print(head, mid, tail)
print([*[1, 2], *{"k": 3}, *(4, 5)])          # dict 展开键
def f(*args, **kw):
    return args, kw
print(f(1, 2, k=3))

# ---- 3. 容器性能：list 成员判断 vs set ----
data = list(range(20000)); sdata = set(data)
probes = list(range(0, 20000, 101))            # 199 个探针
t_list = timeit.timeit(lambda: [v in data for v in probes], number=3)
t_set = timeit.timeit(lambda: [v in sdata for v in probes], number=3)
print(f"list 成员判断: {t_list * 1000:.0f} ms | set: {t_set * 1000:.1f} ms | 加速约 {t_list / t_set:.0f} 倍")

# ---- 4. 元组可哈希、列表不行 ----
d = {point: "坐标A"}
try:
    d[[1, 2]] = "坐标B"
except TypeError as e:
    print("列表当键:", type(e).__name__)
print("元组当键:", d[point])
t = (1, [2, 3])
try:
    t[1].append(4)
    print("『不可变』元组里的列表被改了:", t)   # 浅不可变
except TypeError:
    print("元组内元素不可改")''',
cerr=("把 list 当字典键（unhashable）或当集合元素；成员判断大数据用 list（O(n)）而不是"
      "set/dict（O(1)）；解包时星号变量个数与左侧不匹配（`a, *b, c, d` 对 3 元素直接 "
      "ValueError）。"),
miscon=("1. **元组是不可变的所以内容全只读**——不可变是『浅』的：元组里的列表照样能改，可哈希性也随之失效；\\n"
        "2. **set 只是为了去重**——成员判断 O(1) 才是数据分析里的最大收益，对账/去重/过滤首选；\\n"
        "3. ***x 只是「剩下的」**——星号收集可以出现在任意位置（head/*mid/tail），且函数调用时是展开语义。"),
connection=("- **向前**：l2-1 列表与 l2-3/l2-4 字典集合的基础操作是本章省下的节；\n"
            "- **向后**：l5-1 推导式是容器构造的语法糖，l6 项目里聚合全靠字典与 Counter；\n"
            "- **平行**：pandas 的 DataFrame 索引对齐本质是字典式哈希查找。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 选型 | 序列用 list，只读/键用 tuple，映射用 dict，去重/成员用 set |\n"
         "| 性能 | in 判断: list O(n) vs set/dict O(1)，万级数据差百倍 |\n"
         "| 解包 | a, *b, c 任意位置收集；调用时 *序列/**字典展开 |\n"
         "| 可哈希 | tuple 可当键；『浅不可变』内含可变对象照样能改 |\n"
         "| 纪律 | 先估查询模式（按键 or 遍历），再选容器 |"),
)

T3 = dict(
expected=("3628800 3628800（递归=迭代同答案）；递归深度上限: 1000；boom -> RecursionError；"
          "树求和：递归 15 = 显式栈迭代 15（等价性验证）；尾递归形式 fact(10)=3628800（形式而已）"),
name="ch3 控制流与函数",
why=("递归的优雅与危险同源：每层调用都占一段栈，Python 默认只给一千层，且从不做尾递归"
     "优化。数据分析里的目录树、JSON 解析、组织架构聚合都是天然的递归场景——会用递归"
     "表达结构，也要能在深度失控时改写成显式栈迭代。这是脚本从「能跑」到「稳」的分界。"),
intuition=("递归是俄罗斯套娃：打开一层停一下（调用栈记录现场），直到最里层，再逐层合上"
           "（返回时逐层计算）。栈就是「没合上的套娃清单」，一千层是默认上限。迭代是传送带："
           "用一个手动清单（栈/队列）记住待处理项，逐个搬走——不占调用栈，深度不限。"),
code='''import sys

# ---- 1. 递归 vs 迭代：同一答案 ----
def fact_r(n):
    return 1 if n <= 1 else n * fact_r(n - 1)
def fact_i(n):
    r = 1
    for i in range(2, n + 1):
        r *= i
    return r
print(fact_r(10), fact_i(10))

# ---- 2. 调用栈上限 ----
print("递归深度上限:", sys.getrecursionlimit())
def boom(n):
    return boom(n + 1)
try:
    boom(0)
except RecursionError:
    print("boom -> RecursionError（默认约 1000 层耗尽）")

# ---- 3. 树求和：递归改显式栈 ----
tree = {"a": {"a1": 3, "a2": {"a21": 5}}, "b": 7}
def size_r(node):
    if isinstance(node, dict):
        return sum(size_r(v) for v in node.values())
    return node
def size_i(node):
    total, stack = 0, [node]
    while stack:
        cur = stack.pop()
        if isinstance(cur, dict):
            stack.extend(cur.values())
        else:
            total += cur
    return total
print("递归求和:", size_r(tree), "| 显式栈迭代:", size_i(tree))

# ---- 4. 尾递归式写法（Python 不优化，等价迭代）----
def fact_tail(n, acc=1):
    return acc if n <= 1 else fact_tail(n - 1, acc * n)
print("尾递归形式 fact(10) =", fact_tail(10), "（解释器仍不优化，只是形式）")''',
cerr=("递归没有终止条件或终止条件永假，一层层吃光栈；把 sys.setrecursionlimit 调到十万"
      "当「修复」（C 栈溢出直接段错误）；改写迭代时用队列却忘了「后进先出/先进先出」的语义"
      "差异，遍历顺序变了还以为等价。"),
miscon=("1. **递归=慢**——树形结构上递归往往比手动模拟栈更清晰，性能差异通常可忽略，先看深度；\\n"
        "2. **Python 支持尾递归优化**——CPython 明确不做（Guido 的设计决定），尾递归形式只是好看；\\n"
        "3. **调大 recursionlimit 就安全**——Python 栈帧在堆上但 C 栈有限，超限是段错误不是异常。"),
connection=("- **向前**：l3-1~l3-5 的 for/while、参数机制、作用域是本节的语法底座；\n"
            "- **向后**：l5-3 的模块导入也依赖调用栈与帧概念，l6 的管道错误栈回溯要会读；\n"
            "- **平行**：SQL 的递归 CTE、文件系统的目录遍历都是同一「自相似结构」问题。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 本质 | 递归=调用栈上的延迟计算；迭代=显式清单逐项处理 |\n"
         "| 上限 | CPython 默认约 1000 层，无尾递归优化 |\n"
         "| 改写 | 用 list 当栈（LIFO）可等价消除递归 |\n"
         "| 选型 | 深度可控、结构自相似→递归；深度未知/可能很深→迭代 |\n"
         "| 红线 | setrecursionlimit 不是修复手段 |"),
)

GOALS = {
"py-l-2-2": ("1. 说出元组的三何时（结构不变/字典键/多返回值）并演示与列表的语义差异；\n"
             "2. 用位置解包、星号收集、命名元组改写一段多返回值代码；\n"
             "3. 演示「浅不可变」：元组内列表可变，及其对可哈希性的影响。"),
"py-l-2-5": ("1. 复述四种容器的核心操作复杂度（in/索引/增删）并解释 set/dict 为什么 O(1)；\n"
             "2. 用 timeit 实测 list vs set 的成员判断差距并给出量级结论；\n"
             "3. 按查询模式为给定场景选容器（按键查→dict、去重/成员→set、有序可变→list）。"),
"py-l-2-6": ("1. 用 head,*mid,tail 与嵌套解包拆分序列/记录，替代手工索引；\n"
             "2. 在函数定义（*args/**kwargs）与调用（*展开/**展开）两侧正确使用星号；\n"
             "3. 识别解包元素数不匹配的 ValueError 并用星号收集修复。"),
"py-l-3-6": ("1. 说出递归的本质（调用栈上的自调用）与 CPython 默认深度上限；\n"
             "2. 把树形求和从递归改写为显式栈迭代并验证等价；\n"
             "3. 按深度可控性为场景选型，并说明为什么调大 recursionlimit 不是修复。"),
}
PREREQS = {
"py-l-2-2": "- 「列表：有序可变序列」（l2-1）的操作与切片。",
"py-l-2-5": "- l2-1~l2-4 四种容器的基本操作；\n- l2-2 的元组可哈希概念。",
"py-l-2-6": "- l2-2 的解包基础与 l2-1 的列表操作。",
"py-l-3-6": "- l3-1/l3-2 的 if 与循环；\n- l3-3 的函数定义与返回值。",
}

if len(sys.argv) > 1 and sys.argv[1] == "verify":
    lib.verify_codes({"python-2": T2, "python-3": T3}, GOALS)
elif T2["expected"] == "" or T3["expected"] == "":
    lib.verify_codes({"python-2": T2, "python-3": T3}, GOALS)
else:
    CIDS = {"py-l-2-2": T2, "py-l-2-5": T2, "py-l-2-6": T2, "py-l-3-6": T3}
    REFS = {"py-l-2-2": REF2, "py-l-2-5": REF2, "py-l-2-6": REF2, "py-l-3-6": REF3}
    for lid, t in CIDS.items():
        MD = build_md(lib.orig_content(lid), GOALS[lid], PREREQS[lid], t["why"], t["intuition"],
                      t["code"], t["expected"], t["cerr"], t["miscon"], t["connection"], t["summary"], REFS[lid])
        lib.patch_lesson(lid, MD)
    finish(lib)
