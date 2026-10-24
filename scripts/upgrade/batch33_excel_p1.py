# -*- coding: utf-8 -*-
"""batch33 excel p1：第 1-2 章（excel-l-1-1 ~ excel-l-2-6，10 节）章主题包包装升级。"""
import json, io

P = r"D:\Python_Project\knowledge-order\content-data\courses\excel.json"
c = json.load(io.open(P, encoding="utf-8"))
BT3 = chr(96) * 3

THEMES = {
    "excel-1": dict(
        why="Excel 分析中九成的“函数用不出来”“透视表字段拖不动”，根源都不是函数本身，而是表结构与数据类型："
            "合并单元格、表头重复、数字被存成文本、日期被存成序列号。先把“数据进表的规范”立起来，"
            "后面的函数、透视表与 Power Query 才能一路顺畅，这一章就是整个课程的地基。",
        intuition="把工作表当成数据库里的一张表来对待：一行一条记录、一列一个字段、表头唯一且绝不合并——"
                  "就像图书馆的书架，每本书只有一个正确位置。单元格格式只是“包装纸”，格子里实际存的值"
                  "（数值、文本、错误值、日期序列号）才是内容，换包装纸不会改变内容本身。",
        code="""# 纯 Python 模拟单元格与公式复制时的引用平移（Excel 章节代码可脱离 Excel 运行）
from datetime import date

EPOCH = date(1899, 12, 30)          # Excel 1900 日期系统的第 0 天
serial = lambda d: (d - EPOCH).days  # 日期序列号

print("日期序列号：2024-03-01 ->", serial(date(2024, 3, 1)))

rate = 7.2                            # B1：汇率（绝对引用 $B$1）
sheet = {"A2": 100, "A3": 200}        # A 列：美元金额

def translate(ref, dr, dc, abs_row=False, abs_col=False):
    \"\"\"模拟公式向下复制 dr 行、向右复制 dc 列时的引用平移\"\"\"
    col, row = ref[0], int(ref[1:])
    if not abs_col: col = chr(ord(col) + dc)
    if not abs_row: row += dr
    return f"{col}{row}"

print("\\nC2 填公式后向下拖一格：")
print("  =A2*$B$1 ->", "= %s*$B$1" % translate("A2", 1, 0), "（正确：汇率仍指向 B1，算 200*7.2 =", 200 * rate, "）")
print("  =A2*B1   ->", "= %s*B2" % translate("A2", 1, 0), "（错误：B2 是空单元格，结果 = 0）")

# ---- 一维表（明细表）vs 二维表：同样的数据，只有前者能直接聚合 ----
long = [["北京", "Q1", 120], ["北京", "Q2", 150], ["上海", "Q1", 98], ["上海", "Q2", 132]]  # 一维明细

total = sum(r[2] for r in long)                     # 一维表：一行代码求总计
beijing = sum(r[2] for r in long if r[0] == "北京")  # 一维表：按城市筛选汇总
print("\\n一维表直接聚合：总计 =", total, "；北京 =", beijing)
print("二维表必须先逆透视才能做这两件事——这就是「先规范表结构，再写公式」的原因")""",
        expected="""日期序列号：2024-03-01 -> 45352

C2 填公式后向下拖一格：
  =A2*$B$1 -> = A3*$B$1 （正确：汇率仍指向 B1，算 200*7.2 = 1440.0 ）
  =A2*B1   -> = A3*B2 （错误：B2 是空单元格，结果 = 0）

一维表直接聚合：总计 = 500 ；北京 = 270
二维表必须先逆透视才能做这两件事——这就是「先规范表结构，再写公式」的原因""",
        cerr="1. 把二维报表（行列都是维度）直接拿来写公式或做透视表，导致字段名都取错；"
             "2. 混合引用的 $ 加错方向：$A2 与 A$1 拖拽方向不同，公式一次性批量错位；"
             "3. 身份证号等长数字未先设为文本，被转成科学计数法后末位丢失且不可恢复。",
        miscon="""1. “单元格显示 120 就是数字”——显示格式不等于存储类型，文本型 120 参与求和结果为 0，用 `=ISTEXT()` 一测便知。
2. “合并单元格更整齐”——合并后只有左上角有值，筛选、排序、COUNTIF、透视表全部算错，规范表里禁止合并。
3. “日期就是个日期文本”——日期本质是 1900 系统下的天数序列号（2024-03-01 即 45352），能直接相减得到天数差。""",
        connection="- **向前**：本节的一维表（明细表）与后续 Pandas 的 DataFrame、SQL 的表同构，规范一次处处受益；\n"
                    "- **向后**：第 2 章的 VLOOKUP/SUMIFS、第 4 章的透视表与 Power Query 都要求一维明细表作为数据源；\n"
                    "- **平行**：数据清洗工具（分列、数据验证）与第 1 章的类型陷阱互为因果：先懂类型，才会用工具。",
        summary="| 结论 | 内容 |\n| --- | --- |\n| 分析的唯一正确形态 | 一维明细表：一行一条记录、一列一个字段，字段名不进格子 |\n| 引用四形态 | A1（全相对）、$A$1（全绝对）、A$1（锁行）、$A1（锁列），$ 贴在谁前面谁不动 |\n| 日期本质 | 1900 系统天数序列号，日期相减即天数差 |",
    ),
    "excel-2": dict(
        why="查找引用与逻辑判断是 Excel 职场使用频率最高的一族函数：把别的表的字段“带过来”（VLOOKUP/INDEX+MATCH/XLOOKUP）、"
            "按条件汇总（SUMIFS 家族）、按规则打标（IF/IFS）。它们也是最出名的“错位重灾区”——近似匹配、类型不一致、"
            "条件顺序写反，都会让结果“看起来对、其实错”，必须建立系统化的写法与排查习惯。",
        intuition="VLOOKUP 像在电话簿里查号码：拿着名字（查找值）在第一列从上往下扫，找到那一行后往右数几列取值；"
                  "INDEX+MATCH 则是把“定位”和“取值”拆开，先由 MATCH 求出行号、列号，再让 INDEX 按坐标取值，"
                  "好比先查地图坐标再去取货，自然不受“返回列必须在右侧”的限制。SUMIFS 是“先过滤再求和”的流水线。",
        code="""# 纯 Python 模拟 VLOOKUP / INDEX+MATCH / SUMIFS / IFS 的语义（Excel 章节代码可脱离 Excel 运行）
products = [  # 模拟查找区域 A2:D5：产品编码 | 品名 | 类别 | 单价
    ["P001", "苏打水", "饮料", 3.5],
    ["P002", "薯片",   "零食", 8.9],
    ["P003", "洗衣液", "日用", 25.0],
    ["P004", "坚果",   "零食", 19.9],
]

def vlookup(key, table, col_index):   # 模拟 =VLOOKUP(键, 区域, 列号, 0) 精确匹配
    for row in table:
        if row[0] == key:
            return row[col_index - 1]
    return "#N/A"

def index_match(key, table, return_col):   # INDEX+MATCH：不受“返回列在右侧”限制
    keys = [r[0] for r in table]
    return table[keys.index(key)][return_col] if key in keys else "#N/A"

print("VLOOKUP(\\"P003\\", A2:D5, 4, 0) =", vlookup("P003", products, 4))
print("VLOOKUP(\\"p003\\", ...) 小写字母 ->", vlookup("p003", products, 4), "（看起来一样，其实不一样）")
print("INDEX+MATCH 取品名：", index_match("P002", products, 1))

def ifs(score):   # 模拟 =IFS(B2>=90,"优",B2>=80,"良",B2>=60,"及格",TRUE,"不及格")
    return "优" if score >= 90 else "良" if score >= 80 else "及格" if score >= 60 else "不及格"

print("\\nIFS 分档：95 ->", ifs(95), "；85 ->", ifs(85), "；60 ->", ifs(60), "（边界值 60 归“及格”档）")

sales = [  # 模拟明细表：区域 | 产品 | 月份 | 金额
    ["华北", "苏打水", "1月", 120], ["华北", "薯片", "1月", 300],
    ["华东", "苏打水", "1月", 98],  ["华北", "苏打水", "2月", 150],
    ["华东", "薯片",   "2月", 260],
]
def sumifs(rows, *conds):   # 模拟 =SUMIFS(求和列, 条件列1, 条件1, ...)
    return sum(r[3] for r in rows if all(r[i] == v for i, v in conds))

def countifs(rows, *conds):
    return sum(1 for r in rows if all(r[i] == v for i, v in conds))

print("\\nSUMIFS(金额, 区域=\\"华北\\", 产品=\\"苏打水\\") =", sumifs(sales, (0, "华北"), (1, "苏打水")))
print("COUNTIFS(区域=\\"华北\\", 月份=\\"1月\\") =", countifs(sales, (0, "华北"), (2, "1月")))""",
        expected="""VLOOKUP("P003", A2:D5, 4, 0) = 25.0
VLOOKUP("p003", ...) 小写字母 -> #N/A （看起来一样，其实不一样）
INDEX+MATCH 取品名： 薯片

IFS 分档：95 -> 优 ；85 -> 良 ；60 -> 及格 （边界值 60 归“及格”档）

SUMIFS(金额, 区域="华北", 产品="苏打水") = 270
COUNTIFS(区域="华北", 月份="1月") = 2""",
        cerr="1. VLOOKUP 第四参数省略（近似匹配）：未排序数据下返回“错误但不报错”的值，务必写 0/FALSE；"
             "2. 查找两边类型不一致：一边是文本型数字一边是数值，结果 #N/A，先用 ISTEXT/VALUE 统一；"
             "3. SUMIFS 参数顺序写反（把求和列放到最后）：SUMIF 与 SUMIFS 的参数顺序不同，混记是高频错误。",
        miscon="""1. “VLOOKUP 查不到就是没有”——不可见空格、全半角、大小写、文本 vs 数值都会导致“有却查不到”，先用 TRIM/精确对比排查再下结论。
2. “IF 套得越深越精确”——超过三层就该换 IFS/SWITCH 或辅助列，嵌套 IF 的括号错位是报表事故高发点。
3. “SUMPRODUCT 和 SUMIFS 一样”——SUMPRODUCT 走数组运算可做加权、或/与非条件组合，但大表上明显更慢，条件求和优先 SUMIFS。""",
        connection="- **向前**：依赖第 1 章的一维表规范与数据类型判断（ISTEXT、错误值含义）；\n"
                    "- **向后**：第 4 章透视表能替代大部分 SUMIFS 报表；Power Query 合并查询可替代批量 VLOOKUP；\n"
                    "- **平行**：SQL 的 JOIN 与 VLOOKUP/INDEX+MATCH 同构，Pandas 的 merge 提供同样的四种连接语义。",
        summary="| 结论 | 内容 |\n| --- | --- |\n| 查找首选 | 新版用 XLOOKUP，旧版用 INDEX+MATCH；VLOOKUP 必须写第四参数 0 |\n| 类型一致 | 查找值与被查找列的类型必须一致，文本/数值混用必得 #N/A |\n| 条件汇总 | SUMIFS 参数顺序为“先求和列后条件对”；或条件用 SUMPRODUCT 的 + 表达 |",
    ),
}

GOALS = {
    "excel-l-1-1": "1. 说出一维表（明细表）与二维表（交叉表）的结构差异，并判断一张表能否直接用于函数与透视分析；\n"
                   "2. 复述建表的五条硬规则（表头唯一、一列一字段、不合并单元格、不留空行空列、字段名不重复）；\n"
                   "3. 区分相对引用、绝对引用与混合引用，能推演 `=A2*$B$1` 向下、向右填充后引用如何平移。",
    "excel-l-1-2": "1. 说出文本型数字的三种成因，并按推荐度选用五种转换方法中合适的一种；\n"
                   "2. 解释日期序列号的本质（1900 系统下的天数差），完成日期与数字的互相换算；\n"
                   "3. 对照速查表说出 #N/A、#VALUE!、#REF!、#DIV/0!、#NAME? 的典型成因与处理动作。",
    "excel-l-1-3": "1. 使用查找替换的通配符与“按格式查找”完成批量清理任务；\n"
                   "2. 用分列同时完成拆字段与类型转换，用数据验证在录入源头拦截脏数据；\n"
                   "3. 说出排序与筛选的典型坑（合并单元格导致排序断链、标题行判断、多列排序优先级）及规避方法。",
    "excel-l-1-4": "1. 说出 Excel 的几种真实数据类型（数值、文本、逻辑值、错误值、日期序列号）；\n"
                   "2. 判断“求和为 0”类问题的根源是否为文本型数字，并给出至少两种修复方案；\n"
                   "3. 区分单元格显示格式与实际存储值，解释长数字变科学计数法的原因与预防做法。",
    "excel-l-2-1": "1. 写出嵌套 IF 与 IFS 的等价形式，并正确处理临界值归档（如 60 分算及格）；\n"
                   "2. 用 AND/OR/NOT 组合多条件，并说明布尔值与乘加运算的等价关系（`--` 与 `*`）；\n"
                   "3. 用 IFERROR/IFNA 包裹易错公式，做到既不满屏红字、也不掩盖真实错误。",
    "excel-l-2-2": "1. 说出 VLOOKUP 四个参数的含义，解释第四参数省略（近似匹配）的风险场景；\n"
                   "2. 系统排查“看起来一样却查不到”的三类原因（不可见空格、文本 vs 数字、大小写/全半角）；\n"
                   "3. 用拼接键实现多条件查找，用 IFNA 让无匹配显示为空白而不是 #N/A。",
    "excel-l-2-3": "1. 写出 INDEX+MATCH 组合并说出它相对 VLOOKUP 的三个优势（可向左查、插列不受影响、大表更快）；\n"
                   "2. 说出 MATCH 三种匹配类型（0、1、-1）的语义及其对数据排序的前置要求；\n"
                   "3. 写出 XLOOKUP 的典型形式，用 if_not_found 参数优雅处理无匹配。",
    "excel-l-2-4": "1. 正确写出 SUMIFS/COUNTIFS/AVERAGEIFS 的参数顺序（先求和列/目标列，后条件对）；\n"
                   "2. 用 SUMPRODUCT 完成多条件求和与加权平均，并说明它与 SUMIFS 的分工边界；\n"
                   "3. 指出用 `+` 表达“或”条件时的重复计数风险，并给出规避写法。",
    "excel-l-2-5": "1. 用 SUMPRODUCT 一次遍历完成多条件统计，解释其数组运算的计算过程；\n"
                   "2. 区分加权平均与简单平均的口径差异，并能手算一组小数据的加权平均验证；\n"
                   "3. 列出 COUNTIF 家族的高频用法（标记重复、区间计数、配合数据验证防重复录入）。",
    "excel-l-2-6": "1. 说出查找引用四大坑（近似匹配、查找列不在第一列、类型不一致、#REF!）各自的触发条件；\n"
                   "2. 面对一个 #N/A 结果，按“类型 → 空格 → 范围 → 顺序”的路径完成系统化排查；\n"
                   "3. 说明 XLOOKUP 如何统一化解这些坑，以及它的版本兼容限制。",
}

PREREQS = {
    "excel-l-1-1": "- 无硬性前置，适合作为开篇；只需熟悉 Excel 的基本录入、选中与填充操作。",
    "excel-l-1-2": "- 先学「数据表规范与引用方式」（excel-l-1-1）的一维表与建表规则，再理解类型陷阱为何在规范表里更少出现。",
    "excel-l-1-3": "- 先学「格式陷阱」（excel-l-1-2）与「数据类型」（excel-l-1-4），知道分列转类型解决的是哪类问题。",
    "excel-l-1-4": "- 无硬性前置；本节与 excel-l-1-2 互为补充，两节都属第 1 章的类型地基。",
    "excel-l-2-1": "- 先掌握第 1 章的相对/绝对引用（excel-l-1-1）与错误值含义（excel-l-1-2），本节的 IFERROR 会直接用到。",
    "excel-l-2-2": "- 先学 IFERROR（excel-l-2-1）与文本/数字类型差异（excel-l-1-2），#N/A 排查依赖这两节。",
    "excel-l-2-3": "- 先学 VLOOKUP 的四参数与三大坑（excel-l-2-2），才能理解 INDEX+MATCH/XLOOKUP 到底改进了什么。",
    "excel-l-2-4": "- 先掌握混合引用（excel-l-1-1）与条件写法（excel-l-2-1）；条件对 `(列, 值)` 的形式与逻辑函数一脉相承。",
    "excel-l-2-5": "- 先学条件统计基础（excel-l-2-4）与布尔值算术（excel-l-2-1 的 `--` 与 `*`），SUMPRODUCT 是二者的组合应用。",
    "excel-l-2-6": "- 先学完 VLOOKUP（excel-l-2-2）与 INDEX+MATCH/XLOOKUP（excel-l-2-3），本节是它们的坑位总结与复习地图。",
}

patched = 0
for ch in c["chapters"]:
    th = THEMES.get(ch["id"])
    if not th:
        continue
    for l in ch["lessons"]:
        if "学习目标" in l["content"] or l["id"] not in GOALS:
            continue
        lid = l["id"]
        l["content"] = (f"### 学习目标\n\n学完本节，你应该能够：\n{GOALS[lid]}\n\n"
            f"### 前置知识\n\n{PREREQS[lid]}\n\n"
            f"### 问题背景\n\n{th['why']}\n\n### 直觉理解\n\n{th['intuition']}\n\n"
            f"### 核心概念与原理详解\n\n{l['content'].strip()}\n\n"
            f"### 完整案例（含手算）\n\n以下代码完整演算本章主题的核心流程：\n\n"
            f"### 代码实践\n\n{BT3}python\n{th['code']}\n{BT3}\n\n预期输出（实测）：\n\n{BT3}\n{th['expected']}\n{BT3}\n\n**常见错误**：{th['cerr']}\n\n"
            f"### 常见误区\n\n{th['miscon']}\n\n### 知识关联\n\n{th['connection']}\n\n"
            f"### 本节总结\n\n{th['summary']}\n\n"
            f"### 参考资料\n\n> **来源类型：参考资料**\n> - 本课程整理（可参见相应官方文档）")
        patched += 1

c["updatedAt"] = int(__import__("time").time() * 1000)
json.dump(c, io.open(P, "w", encoding="utf-8", newline="\n"), ensure_ascii=False, indent=2)
print("patched", patched)
