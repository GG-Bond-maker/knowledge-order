# -*- coding: utf-8 -*-
"""batch33 excel p2：第 3-4 章（excel-l-3-1 ~ excel-l-4-4，8 节）章主题包包装升级。"""
import json, io

P = r"D:\Python_Project\knowledge-order\content-data\courses\excel.json"
c = json.load(io.open(P, encoding="utf-8"))
BT3 = chr(96) * 3

THEMES = {
    "excel-3": dict(
        why="真实业务表里的关键字段很少是“现成的”：日期藏在一句备注里、金额带着全角空格、评分被一个异常值拉偏、"
            "排名口径说不清。文本、日期与统计函数就是把“人看的字段”加工成“能算的字段”的工具，也是数据清洗在 Excel 里的主战场。",
        intuition="把文本函数想成“切香肠”：LEFT/RIGHT/MID 是按位置下刀，FIND/SEARCH 先告诉你刀口在第几个字符；"
                  "日期是“数轴上的刻度”（序列号），DATEDIF 是两刻度相减，EDATE 是沿刻度平移整月；"
                  "统计函数里 RANK 是赛跑名次、TRIMMEAN 是评委打分“去掉最高最低再平均”，口径一听就懂。",
        code="""# 纯 Python 模拟 LEFT/MID/FIND/SUBSTITUTE、日期序列号、ROUND/RANK/TRIMMEAN（Excel 章节代码可脱离 Excel 运行）
from datetime import date
import math

EPOCH = date(1899, 12, 30)
serial = lambda d: (d - EPOCH).days            # Excel 日期的本质：天数差

raw = "  订单A-20240301-张三  "
cell = raw.strip()                              # 模拟 TRIM
code, d, name = cell.split("-")                 # 模拟分列 / LEFT+MID+FIND 组合
print("原始：", repr(raw), "-> TRIM 后：", repr(cell))
print("FIND(\\"-\\") =", cell.find("-") + 1, "；MID 取日期段 =", d, "；TEXT 转格式 =", "%s-%s-%s" % (d[:4], d[4:6], d[6:]))
print("SUBSTITUTE 去掉横线：", cell.replace("-", ""))

d0, d1 = date(2024, 1, 31), date(2024, 3, 15)
print("\\n日期序列号：2024-01-31 =", serial(d0), "；两日期直接相减 =", (d1 - d0).days, "天（DATEDIF 的本质）")

print("\\nROUND 家族对照（对 -2.5 与 3.14159）：")
cases = [
    ("ROUND(x, 0) 四舍五入", lambda x: math.floor(x + 0.5) if x >= 0 else math.ceil(x - 0.5)),
    ("INT(x) 向下取整",      math.floor),
    ("TRUNC(x) 截尾",        math.trunc),
]
for label, fn in cases:
    print(f"  {label:24s} -2.5 -> {fn(-2.5):>4}；3.14159 -> {fn(3.14159)}")

print("\\n浮点误差：0.1+0.2 =", 0.1 + 0.2, "；ROUND(0.1+0.2, 1) =", round(0.1 + 0.2, 1))

scores = [8.9, 9.2, 8.8, 9.6, 2.0, 8.5, 9.0]    # 一个异常低分
n_cut = 1                                       # TRIMMEAN(区域, 2/7)：掐头去尾各 1 个
trimmed = sorted(scores)[n_cut:-n_cut]
print("\\nTRIMMEAN 掐头去尾：", sorted(scores), "->", sorted(scores)[n_cut:-n_cut],
      "均值 =", round(sum(trimmed) / len(trimmed), 3))
rank = sorted(scores, reverse=True)
print("RANK(9.2) =", rank.index(9.2) + 1, "；LARGE(区域, 2) = 第 2 大 =", sorted(scores)[-2])""",
        expected="""原始： '  订单A-20240301-张三  ' -> TRIM 后： '订单A-20240301-张三'
FIND("-") = 4 ；MID 取日期段 = 20240301 ；TEXT 转格式 = 2024-03-01
SUBSTITUTE 去掉横线： 订单A20240301张三

日期序列号：2024-01-31 = 45322 ；两日期直接相减 = 44 天（DATEDIF 的本质）

ROUND 家族对照（对 -2.5 与 3.14159）：
  ROUND(x, 0) 四舍五入         -2.5 ->   -3；3.14159 -> 3
  INT(x) 向下取整              -2.5 ->   -3；3.14159 -> 3
  TRUNC(x) 截尾              -2.5 ->   -2；3.14159 -> 3

浮点误差：0.1+0.2 = 0.30000000000000004 ；ROUND(0.1+0.2, 1) = 0.3

TRIMMEAN 掐头去尾： [2.0, 8.5, 8.8, 8.9, 9.0, 9.2, 9.6] -> [8.5, 8.8, 8.9, 9.0, 9.2] 均值 = 8.88
RANK(9.2) = 2 ；LARGE(区域, 2) = 第 2 大 = 9.2""",
        cerr="1. FIND 区分大小写、SEARCH 不区分：中文场景差别不大，但英文编码列混用会“有的找得到有的找不到”；"
             "2. DATEDIF 是隐藏函数，参数顺序必须是(开始,结束,单位)，结束早于开始会报 #NUM!；"
             "3. 用 INT 处理负数取整：INT(-2.5)=-3 是向“负无穷”方向，想“向零取整”应该用 TRUNC。",
        miscon="""1. “日期相减要写复杂公式”——日期就是序列号，直接相减即天数差；跨度按月要 EDATE/ DATEDIF("m")，因为每月天数不同。
2. “ROUND 会丢失精度就不该用”——展示层 ROUND 与计算层全精度是两件事：中间过程不 ROUND，最终展示才 ROUND。
3. “平均分用 AVERAGE 就够了”——有评委异常打分时用 TRIMMEAN 掐头去尾，业务排名用 RANK.EQ 要说明“并列怎么算”。""",
        connection="- **向前**：依赖第 1 章的类型系统（日期序列号、文本型数字）与第 2 章的逻辑函数（IF 处理提取失败）；\n"
                    "- **向后**：第 4 章透视表的“分组”直接消费本章的日期函数（月/季桶），条件格式的阈值规则用本章的分位数；\n"
                    "- **平行**：Pandas 的 .str 访问器、dt 访问器与本章文本/日期函数一一对应，语义完全同构。",
        summary="| 结论 | 内容 |\n| --- | --- |\n| 文本提取 | 位置类 LEFT/MID/RIGHT + 定位类 FIND/SEARCH，先找分隔符再截取 |\n| 日期本质 | 1900 系统天数序列号；DATEDIF 取差、EDATE 平移整月 |\n| 取整口径 | ROUND 四舍五入、INT 向下、TRUNC 向零；浮点误差靠 ROUND 收口 |\n| 稳健统计 | TRIMMEAN 掐头去尾抗异常值；RANK/LARGE/QUARTILE 描述分布 |",
    ),
    "excel-4": dict(
        why="当明细行从几千涨到几十万、报表从一张变成一组，公式逐行硬算就会到达极限：透视表把“分组汇总”变成拖拽，"
            "Power Query 把“清洗步骤”变成可刷新的流水线，Power Pivot 把“多表关系”变成数据模型。"
            "这三件工具决定了 Excel 能不能承接真正的业务数据量，是“会用函数”与“会做分析”的分水岭。",
        intuition="透视表像“自助饺子机”：把字段拖进行/列/值三个格子，机器按组包好汇总；Power Query 像洗菜流水线——"
                  "每一步清洗（去表头、改类型、逆透视）都被记录下来，明天换一批原料按同一个流程重跑；"
                  "Power Pivot 像给多张表拉了关系线的数据仓库，先建关系再统一出数。",
        code="""# 纯 Python 模拟透视表分组汇总、Power Query 逆透视与合并查询（Excel 章节代码可脱离 Excel 运行）
records = [  # 一维明细表（Power Query / 透视表的唯一合格数据源）
    {"区域": "华北", "品类": "饮料", "金额": 120},
    {"区域": "华北", "品类": "零食", "金额": 300},
    {"区域": "华东", "品类": "饮料", "金额": 98},
    {"区域": "华东", "品类": "零食", "金额": 260},
    {"区域": "华南", "品类": "饮料", "金额": 150},
]

# ---- 透视表：行=区域，值=金额求和 / 订单计数（值汇总方式）----
pivot = {}
for r in records:
    g = pivot.setdefault(r["区域"], {"金额": 0, "订单": 0})
    g["金额"] += r["金额"]; g["订单"] += 1

total = sum(r["金额"] for r in records)
print("区域 | 金额合计 | 订单数 | 金额占比（占总计百分比）")
for region, g in pivot.items():
    print(f"{region} | {g['金额']:>7} | {g['订单']:>4} | {g['金额'] / total:.1%}")

# ---- Power Query 逆透视：把二维报表还原成一维明细 ----
wide = [["区域", "Q1", "Q2"], ["华北", 420, 380], ["华东", 358, 401]]   # 报表形态
long_rows = [(row[0], q, row[i])                 # (区域, 季度, 金额)
             for row in wide[1:] for i, q in enumerate(wide[0][1:], start=1)]
print("\\n逆透视结果（前 4 行）：", long_rows[:4], "... 共", len(long_rows), "行")

# ---- Power Query 合并查询：跨表取字段（等价于数据模型里的表间关系）----
targets = [{"区域": "华北", "经理": "李雷"}, {"区域": "华东", "经理": "韩梅梅"},
           {"区域": "华南", "经理": "王小明"}]
merged = [{**r, "经理": next(t["经理"] for t in targets if t["区域"] == r["区域"])} for r in records]
print("\\n合并查询第 1 行：", merged[0], "（多表合并后单表即可出报表，不再需要每行写 VLOOKUP）")""",
        expected="""区域 | 金额合计 | 订单数 | 金额占比（占总计百分比）
华北 |     420 |    2 | 45.3%
华东 |     358 |    2 | 38.6%
华南 |     150 |    1 | 16.2%

逆透视结果（前 4 行）： [('华北', 'Q1', 420), ('华北', 'Q2', 380), ('华东', 'Q1', 358), ('华东', 'Q2', 401)] ... 共 4 行

合并查询第 1 行： {'区域': '华北', '品类': '饮料', '金额': 120, '经理': '李雷'} （多表合并后单表即可出报表，不再需要每行写 VLOOKUP）""",
        cerr="1. 透视表“刷新后数字没变”：数据源是固定区域而非超级表/名称，新增行落在引用范围之外；"
             "2. Power Query 里对“当前值”做类型修改，下一步又引用原列导致类型冲突，类型步骤应紧跟来源步骤；"
             "3. Power Pivot 建立关系时方向选反（多端连多端），出数时重复计数，方向必须是一端对多端。",
        miscon="""1. “透视表是图表工具”——它是分组汇总引擎，值汇总方式（求和/计数/平均值）才是灵魂，图表只是外衣。
2. “Power Query 只是导入向导”——它的核心价值是“步骤可复现”：清洗逻辑记录成 M 代码，下月数据一键重跑。
3. “多表合并就是多贴几次 VLOOKUP”——数据模型（Power Pivot）先建关系再出数，行数不放大、刷新不出错，VLOOKUP 方案在数据量上来后必然卡死。""",
        connection="- **向前**：透视表的数据源必须是第 1 章规范的一维明细表；占比/累计等展示口径用到第 3 章的统计函数；\n"
                    "- **向后**：第 5 章的切片器、动态图表直接驱动透视表；Power Query 的逆透视产出喂给后续所有分析；\n"
                    "- **平行**：透视表对应 Pandas 的 pivot_table、合并查询对应 merge、Power Query 的清洗步骤对应 Pandas 清洗流水线。",
        summary="| 结论 | 内容 |\n| --- | --- |\n| 透视表 | 行/列/值/筛选四区；值汇总方式决定口径；数据源用超级表实现自动扩展 |\n| Power Query | 清洗步骤化、可刷新；逆透视把二维报表还原成一维明细 |\n| Power Pivot | 数据模型建表间关系（一端对多端），DAX 度量值统一口径 |",
    ),
}

GOALS = {
    "excel-l-3-1": "1. 用 LEFT/RIGHT/MID/LEN 组合，按分隔符位置从自由文本中提取结构化字段；\n"
                   "2. 区分 FIND 与 SEARCH 的大小写行为，用 SUBSTITUTE/TRIM/CLEAN 完成常见清洗；\n"
                   "3. 用 TEXT 规定输出格式（日期、金额、百分比），用 TEXTJOIN 拼接带分隔符的清单。",
    "excel-l-3-2": "1. 说出日期序列号的本质，用 TODAY/NOW 与拆解函数取出年、月、日、星期；\n"
                   "2. 用 DATEDIF/EDATE/EOMONTH 计算工龄、账期、月末等业务日期口径；\n"
                   "3. 用 NETWORKDAYS/WEEKDAY 处理工作日与休息日判断，并写出三种日期区间判断写法。",
    "excel-l-3-3": "1. 区分 ROUND/ROUNDUP/ROUNDDOWN/INT/TRUNC 五种取整口径，特别是负数方向差异；\n"
                   "2. 解释 0.1+0.2 类浮点误差的成因，并给出展示层 ROUND 的正确用法；\n"
                   "3. 用 MOD 判断奇偶/周期，组合完成评分折算类的实战计算。",
    "excel-l-3-4": "1. 用 RANK 家族完成排名，并说明并列名次的两种口径（RANK.EQ 与 RANK.AVG）；\n"
                   "2. 用 LARGE/SMALL 取第 k 值，用 QUARTILE/MEDIAN 描述分布位置；\n"
                   "3. 用 TRIMMEAN 完成掐头去尾的稳健评分，并用 IQR 思路识别异常值。",
    "excel-l-4-1": "1. 说出透视表行/列/值/筛选四个区域的作用与字段拖放规则；\n"
                   "2. 根据业务问题切换值汇总方式，并区分计算字段与计算项的使用场景；\n"
                   "3. 配置占总计百分比、累计、排名三种展示方式，并遵守数据源与刷新的三条铁律。",
    "excel-l-4-2": "1. 用分组功能把连续日期/数值装进月、季、自定义区间桶；\n"
                   "2. 用切片器与时间线做多透视表联动，用 GETPIVOTDATA 精确取值；\n"
                   "3. 用超级表/名称让透视表数据源自动扩展，避免“刷新后数据缺行”。",
    "excel-l-4-3": "1. 说出 Power Query 适合解决的三类问题（重复清洗、跨表取数、多文件合并）；\n"
                   "2. 按标准工作流（导入→清洗→加载）完成一次可刷新的清洗流水线；\n"
                   "3. 用逆透视把二维报表还原成一维明细，用合并/追加查询替代 VLOOKUP 与手工粘贴。",
    "excel-l-4-4": "1. 判断何时该从透视表升级到 Power Pivot（数据量、多表关系、口径复用）；\n"
                   "2. 走通建数据模型的三步：加表、连关系（一端对多端）、写度量值；\n"
                   "3. 区分 DAX 度量值与计算列的求值时机，并对比多表合并的三种方案优劣。",
}

PREREQS = {
    "excel-l-3-1": "- 先掌握第 1 章的数据类型判断（excel-l-1-4）：知道提取结果默认是文本，必要时用 VALUE/分列转回数值。",
    "excel-l-3-2": "- 先学「格式陷阱」（excel-l-1-2）中日期序列号的概念，本节的 DATEDIF/EDATE 全部建立在它之上。",
    "excel-l-3-3": "- 需要基本算术与单元格引用（excel-l-1-1）；浮点误差部分建议先看过 excel-l-1-4 的类型系统。",
    "excel-l-3-4": "- 需要基本统计概念（均值/中位数）；分位数与第 5 章条件格式的 IQR 异常标记互相呼应。",
    "excel-l-4-1": "- 必须先学第 1 章一维表规范（excel-l-1-1）：透视表的数据源必须是一维明细表；SUMIFS（excel-l-2-4）是透视表的公式版对照。",
    "excel-l-4-2": "- 先学「透视表基础」（excel-l-4-1）与日期函数（excel-l-3-2），分组与时间线直接消费日期字段。",
    "excel-l-4-3": "- 先学清洗工具（excel-l-1-3）与查找引用（excel-l-2-2/2-3）：Power Query 的合并查询是它们的全自动升级版。",
    "excel-l-4-4": "- 先学「透视表」（excel-l-4-1）与「Power Query」（excel-l-4-3），理解单表透视与流水线的局限后再上数据模型。",
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
