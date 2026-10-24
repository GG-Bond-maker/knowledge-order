# -*- coding: utf-8 -*-
"""batch34 p1：python 第 1 章「变量与基础数据类型」5 节章主题包升级（TS 源 ch1.ts+extra.ts）。
py-l-1-3 字符串 / 1-4 布尔 / 1-5 注解与IO / 1-6 运算符 / 1-7 注释与PEP8
用法：python batch34_python_p1.py verify -> 跑章代码；填好 expected 后直接运行打补丁。
"""
from _batch34_lib import Lib, build_md, finish
import sys

lib = Lib("python", [
    "src/content/chapters/python/ch1.ts",
    "src/content/chapters/python/extra.ts",
])
REF = "本课程整理（可参见 Python 官方文档 docs.python.org「字符串方法」与 PEP 8 相应章节）"

C1 = "python-1"
THEME = dict(
name="ch1 变量与基础数据类型",
why=("数据分析的原料几乎都以字符串形态抵达：CSV 的列、JSON 的字段、日志的行、Excel 的单元格。"
     "第一公里的三个工程决定——类型转换、切片取值、格式化输出——出错率最高；布尔真值判断"
     "控制着每一行过滤逻辑；类型注解与命名风格则决定脚本能被团队读多久。把这一章的地基打"
     "瓷实，后面列表/字典/文件的所有花样都省力。"),
intuition=("字符串是一列编了号的车厢：索引从 0 开始，切片 s[a:b] 是「从 a 号车厢上車、到 b 号"
           "车厢前下车」（左闭右开）。布尔值是数据管道上的道岔，真值放行、假值筛掉，Python 还"
           "规定了一批「天生为假」的值（0、空串、空容器、None）。类型注解是给变量贴「内容标签」"
           "——解释器不强制，但读代码的人和 IDE 全靠它。运算符优先级是接线图：先乘方、再乘除、"
           "后加减，比较在算术之后、逻辑在最后。"),
code='''# -*- coding: utf-8 -*-
# ---- 1. 字符串：切片左闭右开 + 三种格式化 ----
s = "数据分析 2026"
print(s[0], s[-1], s[1:4], s[::-1])
name, score = "小明", 92.567
print("%s 的成绩是 %.1f" % (name, score))
print("{} 的成绩是 {:.1f}".format(name, score))
print(f"{name} 的成绩是 {score:.2f}")

# ---- 2. 布尔：int 子类、短路求值、假值 ----
print(True + True, isinstance(True, int))
print([] or {} or "第一个真值")            # 短路: 返回第一个真值
one = 1
print(0 == False, one is True, one == True)  # 值相等不等于同一对象；is 只用于 None
print(bool(0), bool(""), bool("0"), bool([0]))

# ---- 3. 链式比较与三目 ----
x = 75
print(60 <= x < 90, "及格" if x >= 60 else "不及格")

# ---- 4. 运算符例外与优先级 ----
print(7 / 2, 7 // 2, 7 % 2, 7 ** 2, divmod(7, 2))
print(2 + 3 * 4 ** 2, (2 + 3) * 4 ** 2)
print(True and False or not False)         # not > and > or

# ---- 5. 类型注解与命名风格 ----
def mean(xs: list[float]) -> float:
    """均值：文档字符串写『为什么/注意什么』。"""
    return sum(xs) / len(xs)
print(f"{mean([1, 2, 3]):.2f}")
MAX_RETRY = 3                               # 常量全大写
print(MAX_RETRY)''',
expected=("数 6 据分析 6202 析分据数（s[0]/s[-1]/s[1:4]/s[::-1]）；三种格式化均输出 小明 的成绩是 92.6/92.6/92.57；"
          "True+True=2 且 bool 是 int 子类；or 短路返回第一个真值『第一个真值』；0==False 为 True 而 1 is True 为 False；"
          "bool(0)=False、bool('')=False、bool('0')=True、bool([0])=True（非空容器恒真）；60<=x<90=True、三目=及格；"
          "7/2=3.5、7//2=3、7%2=1、7**2=49、divmod=(3,1)；优先级 2+3*4**2=50 vs (2+3)*4**2=80；not>and>or 链=True；均值 2.00；常量 3"),
cerr=("切片以为 s[a:b] 含 b 号元素（左闭右开），差一位取错列；用 input() 的返回值直接做算术"
      "（它是字符串，要先 int()/float()）；把 `1 is True` 当 True 用（值相等不等于同一对象，"
      "is 只该用于 None 比较）。"),
miscon=("1. **字符串可原地修改**——str 不可变，所有「修改」都返回新对象，大循环拼接要用 join；\\n"
        "2. **0、空串是 False，所以『非空即可用』**——「0」是合法数据（字符串），过滤条件要按业务语义写，不能全靠真值；\\n"
        "3. **类型注解是运行时检查**——CPython 不校验注解，它是给人与工具（mypy/IDE）看的契约。"),
connection=("- **向前**：l1-1/l1-2 的变量与数字类型是本章地基；\n"
            "- **向后**：l2 章的容器装满字符串与布尔，l4 章的文件读写输出全靠格式化；\n"
            "- **平行**：pandas 课的 dtype 概念（str/int/bool）与本章类型一一对应。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 字符串 | 不可变序列；切片左闭右开；f-string 优先 |\n"
         "| 布尔 | int 子类；假值: 0/空串/空容器/None；短路返回操作数 |\n"
         "| 注解 | 给人看 + IDE/mypy，不约束运行时 |\n"
         "| 优先级 | ** > 算术 > 比较 > not > and > or |\n"
         "| 风格 | snake_case 变量、全大写常量、PascalCase 类（PEP 8） |"),
)

GOALS = {
"py-l-1-3": ("1. 用索引/切片（左闭右开）与步长（含 s[::-1] 反转）取出子串，并说出 str 不可变的含义；\n"
             "2. 在 %、format、f-string 三种格式化中选用合适的一种，并控制小数位与对齐；\n"
             "3. 用 strip/split/replace/in 组合完成一次真实的日志行清洗。"),
"py-l-1-4": ("1. 复述 Python 的假值清单（0/0.0/空串/空容器/None）并解释 bool 是 int 子类的后果（True+True==2）；\n"
             "2. 追踪 and/or 的短路求值返回值（返回操作数而非布尔）；\n"
             "3. 用链式比较与三目表达式改写一段 if/else 过滤逻辑。"),
"py-l-1-5": ("1. 给函数签名加类型注解（参数/返回值/容器内型）并说明其「契约」作用；\n"
             "2. 用 print 的 sep/end/f-string 控制输出格式；\n"
             "3. 安全地用 input() 读入并显式转换类型（记住它永远返回 str）。"),
"py-l-1-6": ("1. 说出算术四例外：/ 得 float、// 向下取整、% 取余、** 乘方，并用 divmod 演示；\n"
             "2. 用优先级表（** > 算术 > 比较 > not > and > or）心算混合表达式的结果；\n"
             "3. 在 pandas 布尔索引里用 & | ~ 代替 and/or/not（位运算优先级高于比较，要加括号）。"),
"py-l-1-7": ("1. 区分三种注释形态（行注释/块场景/docstring）并给函数写出标准的「为什么型」docstring；\n"
             "2. 应用 PEP 8 最小集：snake_case、常量大写、类 PascalCase、两空行分节；\n"
             "3. 用编辑器格式化（Black/Ruff）替代手工排版，并解释为什么禁止「注释掉的代码」入库存活。"),
}
PREREQS = {
"py-l-1-3": "- 「变量是标签」（l1-1）与数字类型（l1-2）；\n- 无其他前置。",
"py-l-1-4": "- 字符串比较（l1-3）：了解 == 与 in 的语义即可。",
"py-l-1-5": "- l1-1~l1-4 的四种基础类型；\n- 函数调用的一般形态（第 3 章展开）。",
"py-l-1-6": "- l1-2 数字类型与 l1-4 布尔值。",
"py-l-1-7": "- l1-3 的字符串与 l1-5 的函数签名注解。",
}

CODE, WHY, INTU = THEME["code"], THEME["why"], THEME["intuition"]
CERR, MISCON, CONN, SUMM = THEME["cerr"], THEME["miscon"], THEME["connection"], THEME["summary"]

if len(sys.argv) > 1 and sys.argv[1] == "verify":
    lib.verify_codes({C1: THEME}, GOALS)
elif not THEME["expected"]:
    lib.verify_codes({C1: THEME}, GOALS)
else:
    for lid in ("py-l-1-3", "py-l-1-4", "py-l-1-5", "py-l-1-6", "py-l-1-7"):
        MD = build_md(lib.orig_content(lid), GOALS[lid], PREREQS[lid], WHY, INTU,
                      CODE, THEME["expected"], CERR, MISCON, CONN, SUMM, REF)
        lib.patch_lesson(lid, MD)
    finish(lib)
