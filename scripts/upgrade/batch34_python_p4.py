# -*- coding: utf-8 -*-
"""batch34 p4：python 第 6 章「综合项目实战」5 节章主题包升级（TS 源 ch6.ts/extra3.ts）。
py-l-6-1 项目拆解 / 6-2 聚合与质量报告 / 6-3 测试文档复用 / 6-4 单元测试与管道回归 / 6-5 交付
用法：python batch34_python_p4.py verify -> 跑章代码；填好 expected 后直接运行打补丁。
"""
from _batch34_lib import Lib, build_md, finish
import sys

lib = Lib("python", [
    "src/content/chapters/python/ch6.ts",
    "src/content/chapters/python/extra3.ts",
])
REF = "本课程整理（可参见 pytest 官方文档 docs.pytest.org 与《The Twelve-Factor App》配置原则相应章节）"

C6 = "python-6"
THEME = dict(
name="ch6 综合项目实战：从原始日志到分析结论",
why=("前五章的知识点是零件，项目章把它们装成一台机器：原始日志有脏行、缺字段、坏金额，"
     "任何一处都会让聚合结果悄悄失真。真实工作里被质疑的不是你的分析，而是你的数字从哪来"
     "——所以口径要先定义、质量要出报告、口径变更要过回归测试、交付要给出可复用的模块与"
     "配置。这一章把「脚本」升级成「别人敢用的管道」。"),
intuition=("把脚本想成一家小型食品厂：进料检验（解析与校验，坏原料进隔离区并计数）、清洗"
           "（去重/补全）、加工（按区域/日期聚合）、出厂检验（质量报告随成品一同交付）。单元"
           "测试是夜班质检员：每天用固定样本跑一遍口径，指标变了立刻拉闸。配置外置是配方卡："
           "改配方（阈值/口径）不动设备（代码）。"),
code='''# ---- 订单分析迷你流水线：解析 -> 清洗 -> 聚合 -> 报告 -> 回归测试 ----
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
print("回归测试通过：口径未漂移")''',
expected=("总输入 5 行, 有效 3, 剔除 2；华东: 订单 2 GMV 244.00 客单 122.00；华北: 订单 1 GMV 88.50 客单 88.50；"
          "剔除明细: ['金额缺失: C-3', \"结构错误: 'bad line'\"]（脏数据有账可查）；回归测试通过：口径未漂移"),
cerr=("解析与聚合写在一起（一发现脏数据就得全链重跑），先解析成记录再聚合才能分阶段测试；"
      "float(amount) 不做校验直接转，脏值变成 inf/NaN 混进下游；测试断言写「等于上次运行"
      "的输出」而不是「等于明确口径」，快照式测试把 bug 也固化了。"),
miscon=("1. **先写 for 循环再说**——需求拆解（输入/输出/口径/异常清单）先于代码，否则每次补需求都在重写；\\n"
        "2. **数据分析不用写测试**——口径回归测试恰恰是分析可信度的核心资产，改口径必跑；\\n"
        "3. **可复用=复制粘贴到新项目**——可复用的是「模块+配置+文档」，复制出去的脚本下次口径变了就是两套真相。"),
connection=("- **向前**：l4 的文件与异常是 load/validate 阶段的底座，l5 的推导式与 Counter 是聚合的主力；\n"
            "- **向后**：pandas 课把本项目的手写聚合升级为 DataFrame 表达式；\n"
            "- **平行**：sql 课的 GROUP BY 质量检查与本节的质量报告同一思想。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 拆解 | 需求→阶段（解析/清洗/聚合/报告）→口径→异常清单，先于代码 |\n"
         "| 质量 | 剔除行计数并随报告交付，脏数据有账可查 |\n"
         "| 测试 | 口径回归测试：固定样本+明确期望，改口径必跑 |\n"
         "| 复用 | 模块划分 + 配置外置（口径唯一真相源）+ docstring |\n"
         "| 交付 | 交付「工厂+手册」，不是一次性模具 |"),
)

GOALS = {
"py-l-6-1": ("1. 把「订单分析」需求拆成解析/清洗/聚合/报告四阶段并画出数据流；\n"
             "2. 用「先解析成记录再聚合」的结构隔离脏数据（try/except 按行剔除并计数）；\n"
             "3. 说出三条工程纪律：不上来写循环、口径先写清、坏数据有账本。"),
"py-l-6-2": ("1. 实现多维聚合（按区域/日期）并计算 GMV、订单数、客单价三个口径明确的指标；\n"
             "2. 生成数据质量报告（总行/有效/剔除明细）并解释为什么要随结果一起交付；\n"
             "3. 把聚合结果安全落盘（CSV/JSON）并保持与屏幕报告口径一致。"),
"py-l-6-3": ("1. 用普通 assert 写最小测试并升级为 pytest 的 test_* 函数；\n"
             "2. 给函数写「为什么型」docstring 并列出交付前自检清单；\n"
             "3. 区分复用的三个层次（函数/模块/模板）并为订单脚本选择合适层次。"),
"py-l-6-4": ("1. 解释数据管道该测什么：解析边界、口径不变性、聚合正确性三层；\n"
             "2. 写出口径回归测试：固定样本 + 明确期望值，口径变更必须显式更新；\n"
             "3. 按构造原则设计测试数据（最小覆盖：正常/边界/脏数据三类各至少一条）。"),
"py-l-6-5": ("1. 把脚本重构成可复用模块（parse/load/aggregate/report 各归其位，__main__ 只做编排）；\n"
             "2. 把口径参数外置成配置（阈值/列名/路径），实现「配置是口径的唯一真相源」；\n"
             "3. 按 Checklist 完成交付：依赖清单、运行说明、测试通过、口径文档四件套。"),
}
PREREQS = {
"py-l-6-1": "- 全部前五章（容器/函数/文件/异常/标准库）；\n- 无新语法。",
"py-l-6-2": "- 「项目拆解」（l6-1）的阶段划分与记录结构。",
"py-l-6-3": "- l6-1/l6-2 的流水线代码作为被测对象。",
"py-l-6-4": "- 「代码质量」（l6-3）的最小测试写法。",
"py-l-6-5": "- l6-1~l6-4 的完整流水线与测试。",
}

if len(sys.argv) > 1 and sys.argv[1] == "verify":
    lib.verify_codes({C6: THEME}, GOALS)
elif not THEME["expected"]:
    lib.verify_codes({C6: THEME}, GOALS)
else:
    for lid in ("py-l-6-1", "py-l-6-2", "py-l-6-3", "py-l-6-4", "py-l-6-5"):
        MD = build_md(lib.orig_content(lid), GOALS[lid], PREREQS[lid], THEME["why"], THEME["intuition"],
                      THEME["code"], THEME["expected"], THEME["cerr"], THEME["miscon"],
                      THEME["connection"], THEME["summary"], REF)
        lib.patch_lesson(lid, MD)
    finish(lib)
