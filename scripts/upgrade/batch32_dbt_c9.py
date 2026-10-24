# -*- coding: utf-8 -*-
import json, io
P = r"D:\Python_Project\knowledge-order\content-data\courses\dbt-analytics-engineering.json"
c = json.load(io.open(P, encoding="utf-8"))
BT3 = chr(96)*3
N = 9
THEME = dict(
why="""一次主键重复就能让 GMV 报表虚增一倍，而业务方发现时错误决策已经做出。dbt 把"测试"作为一等公民搬进数据管道：每次构建自动运行断言查询，坏数据在进入 BI 之前就被拦截——信任是数仓唯一的硬通货。""",
intuition="""dbt 测试像机场安检：每件行李（每一行数据）过几道固定关卡（unique、not_null、accepted_values、relationships），任何一件触发警报就拦下整个航班（构建失败退出非 0），安检记录（failing rows 日志）告诉你具体是谁的箱子出了问题。""",
code=r'''rows = [
    {"order_id": 1, "status": "paid",    "user_id": 101},
    {"order_id": 2, "status": "shipped", "user_id": 101},
    {"order_id": 2, "status": "weird",   "user_id": None},   # 一行三处犯规
]
users = [101]                                           # 外键参照表

def run_tests(model, ref=None):
    res = {}
    ids = [r["order_id"] for r in model]
    res["unique(order_id)"] = len(ids) == len(set(ids))     # 断言：重复行数 == 0
    res["not_null(user_id)"] = all(r["user_id"] is not None for r in model)
    accepted = {"paid", "shipped", "refunded"}
    res["accepted_values(status)"] = all(r["status"] in accepted for r in model)
    if ref is not None:
        res["relationships(user_id)"] = all(
            r["user_id"] is None or r["user_id"] in ref for r in model)
    return res

results = run_tests(rows, users)
for test, ok in results.items():
    print(("PASS" if ok else "FAIL"), test)
print("失败数:", sum(1 for v in results.values() if not v), "-> dbt build 返回非 0，CI 拦截")
''',
expected="""FAIL unique(order_id)
FAIL not_null(user_id)
FAIL accepted_values(status)
PASS relationships(user_id)
失败数: 3 -> dbt build 返回非 0，CI 拦截""",
cerr="""1) 测试全绿就高枕无忧——四大通用测试只覆盖结构完整性，业务口径（金额非负、状态机合法）必须自写断言；2) severity 全用默认 error，上游偶发迟到数据让管道天天红屏，团队对失败信号逐渐麻木；3) 把复杂多表对账硬塞进通用测试凑参数，不如直接写 singular test 直白可读。""",
miscon="""1. "测试是 QA 的事"——数据测试必须由模型作者随代码同一 PR 提交，才能形成随代码演进的防护网；
2. "threshold 容忍就是放水"——它是基于已知脏数据存量的过渡策略，必须配合清理计划收敛；
3. "契约会拖慢迭代"——契约 + 版本化恰恰是让下游敢消费、上游敢重构的前提。""",
connection="""- **向前**：测试对象是第 5 章分层产出的模型，语法复用第 7/8 章宏（通用测试即宏）；
- **向后**：第 10 章快照与血缘把质量保障延伸到历史回溯与影响面分析；
- **平行**：与《软件测试》的单元测试思想完全同构，CI 拦截语义一致。""",
summary="""| 结论 | 内容 |
| --- | --- |
| 测试 = 0 行断言 | 一条 SELECT，返回任何行即失败 |
| 四大通用测试 | unique / not_null / accepted_values / relationships 覆盖结构完整性 |
| 分级响应 | warn / error + threshold 让告警可信、不麻木 |
| 契约 = 数据 API | 列级契约 + 模型版本化让下游消费有保障 |""")

GOALS = {
 "dbt-l9-1": "1. 列举脏数据流入报表后的信任崩塌链；\n2. 将软件 TDD 的红-绿-重构循环映射到 dbt 测试先行；\n3. 说明测试左移到建模期的收益。",
 "dbt-l9-2": "1. 写出 unique/not_null/accepted_values/relationships 的 YAML 配置；\n2. 为每类测试各举一个业务反例；\n3. 组合四大测试覆盖主键与外键完整性。",
 "dbt-l9-3": "1. 说出「测试 = 预期返回 0 行的 SELECT」的本质；\n2. 手写 unique 测试的底层断言 SQL；\n3. 解读日志中 failing rows 的呈现与排查方法。",
 "dbt-l9-4": "1. 用 {% test %} 定义带参数的自定义通用测试；\n2. 在 YAML 中传 arguments 复用同一断言；\n3. 封装金额非负等业务口径校验。",
 "dbt-l9-5": "1. 将 singular SQL 放入 tests/ 目录表达复杂多表校验；\n2. 区分通用测试与单数测试的适用边界；\n3. 用单数测试表达跨表对账逻辑。",
 "dbt-l9-6": "1. 配置 severity: warn 与 error 实现分级响应；\n2. 用 threshold 设定失败容忍阈值；\n3. 制定告警升级与修复 SLA。",
 "dbt-l9-7": "1. 启用模型契约强制列名与类型约束；\n2. 用模型版本化（v1/v2）做不破坏下游的变更；\n3. 说明契约如何让管道成为可依赖的数据 API。",
}
PREREQS = {
 "dbt-l9-1": "- 第 5 章分层与第 6 章物化产物；第 1 章《分析工程的软件工程化原则》。",
 "dbt-l9-2": "- 《现代数仓的数据质量危机与 dbt 测试驱动开发 (TDD) 哲学》。",
 "dbt-l9-3": "- 《四大开箱即用通用测试》的 YAML 配置形态。",
 "dbt-l9-4": "- 第 7/8 章宏语法 + 《测试底层揭秘：测试本质是一段预期返回 0 行的断言查询》。",
 "dbt-l9-5": "- 《自定义通用测试（Generic Tests）开发》与 SQL 多表查询基础。",
 "dbt-l9-6": "- 完成本章前 5 节。",
 "dbt-l9-7": "- 完成本章 l9-1 至 l9-6；了解第 3 章 YAML 配置体系。",
}
ch = c["chapters"][N-1]
done = 0
for l in ch["lessons"]:
    if "学习目标" in l["content"]: continue
    lid = l["id"]
    l["content"] = (f"### 学习目标\n\n学完本节，你应该能够：\n{GOALS[lid]}\n\n"
        f"### 前置知识\n\n{PREREQS[lid]}\n\n"
        f"### 问题背景\n\n{THEME['why']}\n\n### 直觉理解\n\n{THEME['intuition']}\n\n"
        f"### 核心概念与原理详解\n\n{l['content'].strip()}\n\n"
        f"### 完整案例（含手算）\n\n以下代码完整演算本章主题的核心流程：\n\n"
        f"### 代码实践\n\n{BT3}python\n{THEME['code']}\n{BT3}\n\n预期输出（实测）：{THEME['expected']}\n\n**常见错误**：{THEME['cerr']}\n\n"
        f"### 常见误区\n\n{THEME['miscon']}\n\n### 知识关联\n\n{THEME['connection']}\n\n"
        f"### 本节总结\n\n{THEME['summary']}\n\n"
        f"### 参考资料\n\n> **来源类型：参考资料**\n> - 本课程整理（可参见 dbt 官方文档 docs.getdbt.com 相应章节）")
    done += 1
c["updatedAt"] = int(__import__("time").time()*1000)
json.dump(c, io.open(P,"w",encoding="utf-8",newline="\n"),ensure_ascii=False,indent=2)
print("chapter", N, "done, upgraded", done, "lessons")
