# -*- coding: utf-8 -*-
"""batch34 p3：python 第 4 章 3 节 + 第 5 章 4 节章主题包升级（TS 源 ch4.ts/ch5.ts/extra3.ts）。
py-l-4-1 with与编码 / 4-4 CSV与JSON / 4-5 自定义异常
py-l-5-1 推导式 / 5-2 collections与itertools / 5-3 模块包导入 / 5-4 functools与operator
用法：python batch34_python_p3.py verify -> 跑章代码；填好 expected 后直接运行打补丁。
"""
from _batch34_lib import Lib, build_md, finish
import sys

lib = Lib("python", [
    "src/content/chapters/python/ch4.ts",
    "src/content/chapters/python/ch5.ts",
    "src/content/chapters/python/extra3.ts",
])
REF4 = "本课程整理（可参见 Python 官方文档 csv/json 模块与 PEP 3134（异常链）相应章节）"
REF5 = "本课程整理（可参见 Python 官方文档 collections/itertools/functools 模块与 PEP 328 相应章节）"

T4 = dict(
name="ch4 文件读写与异常处理",
why=("文件是脚本与真实世界的边界，也是事故高发区：编码用错一个参数，中文全变乱码；忘记"
     "关闭句柄，Windows 下文件被锁、Linux 下句柄泄漏；CSV 的引号与逗号、JSON 的层级与"
     "类型，都能让「看起来对」的数据悄悄坏掉。异常处理是第二道防线——用自定义异常给错误"
     "贴上「哪个部门负责」的标签，才能分级处置而不是一崩了之。"),
intuition=("with 是自动关门器：进屋开门、出屋关门，哪怕屋里着火（异常）也保证门关上。编码"
           "是翻译字典：写入用 UTF-8 编、读取也必须用 UTF-8 解，两边字典不同，字节还是那些"
           "字节，意思全错。CSV 是「穿了电子表格外衣的文本」：引号包住的逗号不是分隔符——"
           "所以永远用 csv 模块而不是 split(', ')。自定义异常是错误分诊台：SchemaError 送"
           "「整行拒绝」，ValueRangeError 送「标记修复」，互不误伤。"),
code='''import csv, json, tempfile, os

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
        print("数值错误(标记修复):", e)''',
expected=("读回: ['订单,金额', 'A-1,99.5']；用错编码: UnicodeDecodeError；"
        "CSV 读回: [{'id': '1', 'note': '含,逗号和\"引号\"'}]（引号逗号都保住了）；"
        "JSON 读回: 杭州 7；安全取值: 默认；"
        "分级处置: 结构错误(整行拒绝) 缺 id 字段 / 数值错误(标记修复) 金额为负 / OK {'id': 2, 'amount': 9}"),
cerr=("open 不写 encoding（Windows 默认 GBK，换机器中文全乱）；写 CSV 忘 newline=''，"
      "Windows 下空行翻倍；json.load 之后再 .get 链取嵌套字段，中间一层是 None 就崩——"
      "要先判层再取值。"),
miscon=("1. **with 只是为了省一行 close**——它保证异常路径也关闭，这是文件安全的核心而非语法糖；\\n"
        "2. **CSV 用 split(',') 拆就行**——引号内的逗号、换行、转义全会被拆错，csv 模块处理 RFC 4180 全部边界；\\n"
        "3. **except Exception 一把抓最省事**——它把该崩的 bug 也吞了，分级捕获+异常链（raise ... from e）才可运维。"),
connection=("- **向前**：l1-3 的字符串方法（split/strip）是解析行数据的基础；\n"
            "- **向后**：l6 项目的 load/validate 阶段就是本节三件套的组合拳；\n"
            "- **平行**：pandas.read_csv 的 encoding/dtype 参数是本节概念的高层封装。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| with | 异常安全关闭，等价 try/finally |\n"
         "| 编码 | 显式 UTF-8 写读成对；乱码先查编码再查数据 |\n"
         "| CSV | csv 模块处理引号/换行；DictReader 按列名取 |\n"
         "| JSON | ensure_ascii=False 保中文；indent 调试；嵌套逐层 get |\n"
         "| 异常 | 自定义层级 + 分级捕获 + raise from 保留根因 |"),
)

T5 = dict(
name="ch5 推导式、迭代器与常用标准库",
why=("同样是分组计数，手写 for 循环十行，Counter 一行且更快；同样是缓存计算，lru_cache"
     "一个装饰器把指数级递归压成线性。标准库与推导式是「Pythonic」的分界线：它们把数据"
     "处理的常见动作变成公认的短语，代码短一半、快一截、审查者一眼懂。模块与导入机制则是"
     "这一切的组织方式——不懂 sys.modules 与搜索路径，就看不懂循环导入与 __main__ 之谜。"),
intuition=("推导式是「一行印章」：一个方括号把「变换+过滤」压成一句话印出一整个容器。"
           "collections 是自动柜台：Counter 自动点数、defaultdict 自动开户、deque 两端"
           "快进快出；itertools 是迭代器工具箱，groupby 认准「相邻相同」才分组。lru_cache"
           " 给函数贴上便签「算过的直接抄」，partial 是「预设参数的模具」，import 是先查"
           "自家书架（sys.modules）再去图书馆（搜索路径）借书登记。"),
code='''from collections import Counter, defaultdict, deque
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
print(pow2(10), sorted([(2, "b"), (1, "a")], key=operator.itemgetter(0)))''',
expected=("[9, 16, 25, 81, 36]；{3: 9, 1: 1, ...}（字典推导去重保后）；{0, 1, 2}；生成器 3 1 15；"
        "Counter.most_common(2)=[('apple', 3), ('pear', 2)]；defaultdict 分组 {5: [apple×3], 4: [pear×2], 3: [fig]}；"
        "deque(maxlen=3) 后 [2, 3, 4]；未排序 groupby 只剩 {'a': [4], 'b': [3]}（前两组被吞！）而先 sorted 得 {'a': [1,2,4], 'b': [3]}；"
        "fib(120)=5358...840（25 位，装饰器下瞬时）；reduce=10；partial 1024；itemgetter 排序 [(1,'a'),(2,'b')]"),
cerr=("推导式里做带副作用的操作（写文件/改外部变量），一行印章变成陷阱；groupby 忘了先"
      "按 key 排序，同组被切成多段；lru_cache 缓存了可变参数（list/dict）直接 TypeError，"
      "或缓存了随时间变化的函数导致脏读。"),
miscon=("1. **推导式只是更短的 for**——它是独立作用域的表达式，循环变量不泄漏，且构造专用字节码更快；\\n"
        "2. **defaultdict 访问不存在的键会报错**——它自动创建默认值并写入（这正是它和 dict.get 的区别，也常制造脏数据）；\\n"
        "3. **import 只是找文件**——它是 sys.modules 缓存查询 + 搜索路径查找 + 执行模块顶层代码三步，循环导入卡在第三步。"),
connection=("- **向前**：l2 容器与 l3 函数是推导式与装饰器的语法基础；\n"
            "- **向后**：l6 项目的解析/聚合/报告三阶段由本节工具串成；\n"
            "- **平行**：pandas 的 groupby.agg 与 Counter/itertools.groupby 是同一思想的两层封装。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 推导式 | 列表/字典/集合/生成器四形态；带过滤；独立作用域 |\n"
         "| collections | Counter 点数、defaultdict 分组、deque 双端队列 |\n"
         "| itertools | groupby 只认相邻，先排序；islice/chunk 迭代器常备 |\n"
         "| functools | lru_cache 记忆化、partial 预设参数、reduce 归约 |\n"
         "| 导入 | sys.modules 缓存 → 搜索路径 → 执行顶层代码 |"),
)

GOALS = {
"py-l-4-1": ("1. 说明 with 的异常安全语义并用它完成文本文件的写与读（含追加模式 a）；\n"
             "2. 复述打开模式 r/w/a/x 与 +/-/b 组合的行为，避免 w 误清空事故；\n"
             "3. 显式指定 encoding 并复现一次 UnicodeDecodeError 以理解乱码根源。"),
"py-l-4-4": ("1. 用 csv.DictReader/DictWriter 处理含逗号与引号的字段并解释 RFC 4180 的引用规则；\n"
             "2. 用 json.dump/load 的 ensure_ascii、indent、default 参数完成中文安全读写；\n"
             "3. 对嵌套 JSON 写出逐层 get 的安全取值并区分缺失键与 null 值。"),
"py-l-4-5": ("1. 设计两层自定义异常层级（基类 DataError + 子类）并为不同错误分级选择处置策略；\n"
             "2. 用 raise ... from e 保留原始异常链并解释 __cause__ 的调试价值；\n"
             "3. 把「整行拒绝/标记修复/跳过计数」三种策略落到一个校验循环。"),
"py-l-5-1": ("1. 写出列表/字典/集合/生成器四种推导式并加上过滤条件；\n"
             "2. 判断何时应退回普通 for（多步逻辑、带副作用、嵌套过深）；\n"
             "3. 用生成器表达式替代临时列表完成一次惰性聚合（sum/any/all）。"),
"py-l-5-2": ("1. 用 Counter 完成计数与 most_common，用 defaultdict(list) 完成分组；\n"
             "2. 解释 itertools.groupby「只认相邻」的契约并写出先排序的规范用法；\n"
             "3. 用 deque 固定窗口维护「最近 N 条」并在 random 场景设种子保证可复现。"),
"py-l-5-3": ("1. 区分 import 的四种形式及各自对命名空间的污染面；\n"
             "2. 复述导入三步（sys.modules 缓存→搜索路径→执行顶层代码）并解释循环导入的成因；\n"
             "3. 用 if __name__ == '__main__' 隔离脚本入口，并说明相对导入为何只能在包内使用。"),
"py-l-5-4": ("1. 用 lru_cache 记忆化递归（fib 对比）并说出可变参数的限制；\n"
             "2. 用 partial 固定参数生成特化函数，用 reduce 完成累积归约；\n"
             "3. 在排序键场景用 operator.itemgetter/attrgetter 替代 lambda 并说明其更快更清晰。"),
}
PREREQS = {
"py-l-4-1": "- l1-3 的字符串方法；\n- l4-2（路径与 pathlib）或等价知识。",
"py-l-4-4": "- 「文件读写 with 与编码」（l4-1）；\n- l2-3 的字典操作。",
"py-l-4-5": "- l4-1~l4-3 的文件与内置异常；\n- l3-3 的函数与 raise 语法。",
"py-l-5-1": "- l2 的四种容器与 l3 的函数调用。",
"py-l-5-2": "- l5-1 的推导式与生成器；\n- l2-3/l2-4 的字典与集合。",
"py-l-5-3": "- l3 的函数定义；\n- l5-1/l5-2 的标准库使用经验。",
"py-l-5-4": "- l3-3 的函数参数机制；\n- l5-2 的 collections 基础。",
}

if len(sys.argv) > 1 and sys.argv[1] == "verify":
    lib.verify_codes({"python-4": T4, "python-5": T5}, GOALS)
elif T4["expected"] == "" or T5["expected"] == "":
    lib.verify_codes({"python-4": T4, "python-5": T5}, GOALS)
else:
    CIDS = {"py-l-4-1": T4, "py-l-4-4": T4, "py-l-4-5": T4,
            "py-l-5-1": T5, "py-l-5-2": T5, "py-l-5-3": T5, "py-l-5-4": T5}
    REFS = {"py-l-4-1": REF4, "py-l-4-4": REF4, "py-l-4-5": REF4,
            "py-l-5-1": REF5, "py-l-5-2": REF5, "py-l-5-3": REF5, "py-l-5-4": REF5}
    for lid, t in CIDS.items():
        MD = build_md(lib.orig_content(lid), GOALS[lid], PREREQS[lid], t["why"], t["intuition"],
                      t["code"], t["expected"], t["cerr"], t["miscon"], t["connection"], t["summary"], REFS[lid])
        lib.patch_lesson(lid, MD)
    finish(lib)
