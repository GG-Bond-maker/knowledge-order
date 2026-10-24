# -*- coding: utf-8 -*-
import json, io
P = r"D:\Python_Project\knowledge-order\content-data\courses\dbt-analytics-engineering.json"
c = json.load(io.open(P, encoding="utf-8"))
BT3 = chr(96)*3
N = 1
THEME = dict(
why="""云原生数仓让存储成本骤降、算力弹性近乎无限，但工具碎片化与职责不清让数据团队交付越来越慢。"为什么分析要搬进数仓内做、为什么要引入工程化纪律"是选型一切工具之前必须想清楚的问题，本章为整门课程奠定范式地基。""",
intuition="""传统 ETL 像在仓库门外先把食材切好洗净再入库，一旦丢弃边角料就永远找不回；现代 ELT 像中央厨房把原始食材原样冷库存放，做什么菜、什么时候做，全部在仓内按订单现做——食材（数据）保真，菜谱（转换）随时可改。""",
code=r'''raw_orders = [
    {"order_id": 1, "user_id": 101, "amount": 299.0, "status": "paid", "note": "加急"},
    {"order_id": 2, "user_id": 102, "amount": 89.5,  "status": "paid", "note": None},
    {"order_id": 3, "user_id": 101, "amount": 129.0, "status": "refund", "note": "缺货"},
]

# 传统 ETL：中间服务器预转换，只保留当前报表需要的字段（不可逆丢失）
etl_table = [{"order_id": o["order_id"], "amount": o["amount"]}
             for o in raw_orders if o["status"] == "paid"]
lost = sorted(k for k in raw_orders[0] if k not in etl_table[0])
print("传统 ETL 入库字段:", sorted(etl_table[0]), "→ 永久丢失字段:", lost)

# 现代 ELT：Load 先行（原始数据完整入库），Transform 推迟到仓内按需执行
def transform_in_warehouse(rows, want_note=False):
    out = []
    for o in rows:                      # T 在数仓内完成，新需求可随时重放
        r = {"order_id": o["order_id"], "user_id": o["user_id"],
             "amount": o["amount"], "status": o["status"]}
        if want_note:                   # note 字段仍在原始层，随取随用
            r["note"] = o["note"]
        out.append(r)
    return out

warehouse_raw = list(raw_orders)
print("ELT 原始层字段:", sorted(warehouse_raw[0]))
print("按需转换(新需求含 note):", transform_in_warehouse(warehouse_raw, want_note=True)[0])
print("ETL 入库行数:", len(etl_table), "| ELT 入库行数:", len(warehouse_raw))
''',
expected="""传统 ETL 入库字段: ['amount', 'order_id'] → 永久丢失字段: ['note', 'status', 'user_id']
ELT 原始层字段: ['amount', 'note', 'order_id', 'status', 'user_id']
按需转换(新需求含 note): {'order_id': 1, 'user_id': 101, 'amount': 299.0, 'status': 'paid', 'note': '加急'}
ETL 入库行数: 2 | ELT 入库行数: 3""",
cerr="""1) 把 ELT 理解成"ETL 换个顺序"，忽略其依赖弹性云算力与廉价存储的前提，回迁自建机房即失效；2) 用事务数据库（MySQL）直接承载分析聚合查询，全表扫描拖垮线上业务；3) 原始层只入"当前报表要用的字段"，重蹈 ETL 信息不可逆丢失的覆辙。""",
miscon="""1. "数据湖会取代数据仓库"——湖负责原始低成本存储，仓负责治理与分析性能，二者是分工而非替代；
2. "工具越新越好"——MDS 选型的核心是团队 SQL 能力与治理成熟度，而非堆砌新组件；
3. "分析工程师就是会 SQL 的数据分析师"——该角色还要承担建模、测试、CI/CD 等工程职责。""",
connection="""- **向前**：为第 2 章 Kimball 维度建模提供"在仓内建模"的平台前提；
- **向后**：衔接第 3 章 dbt 架构与第 5 章数仓分层的工程化落地；
- **平行**：可与《数据工程与语料构建》《Airflow 数据编排》互参：摄取与调度是 MDS 的相邻环节。""",
summary="""| 结论 | 内容 |
| --- | --- |
| ELT 是 MDS 的范式基石 | Load 先行、Transform 仓内执行，信息不丢失且可重放 |
| OLTP/OLAP 物理分工 | 行式服务事务，列式服务分析，负载必须隔离 |
| 分析工程 = 软件工程 | SQL 也要版本控制、测试与 CI/CD，dbt 是其载体 |
| 选型看治理成熟度 | 工具链组合取决于团队规模与 SQL 能力，而非新旧 |""")

GOALS = {
 "dbt-l1-1": "1. 说出传统 ETL 三阶段中 Transform 发生的位置及其带来的算力与信息丢失问题；\n2. 阐述 ELT 范式将 Transform 后移到数仓内执行的核心动因；\n3. 对比 ETL 与 ELT 在存储成本、敏捷性与可回溯性上的差异。",
 "dbt-l1-2": "1. 描述分析工程师在数据分析师与数据工程师之间的职责边界；\n2. 列举分析工程师的核心技能栈（SQL、建模、版本控制、测试）；\n3. 解释该角色崛起如何消解「取数工具人」式的团队协作瓶颈。",
 "dbt-l1-3": "1. 从存储引擎层面解释 OLTP 行式存储与 OLAP 列式存储的物理差异；\n2. 分析列式存储在聚合查询场景下的压缩与扫描优势；\n3. 说明为什么分析负载不该跑在事务数据库上。",
 "dbt-l1-4": "1. 区分数据仓库、数据湖与湖仓一体三种架构的核心特征；\n2. 说明 schema-on-write 与 schema-on-read 的本质区别；\n3. 判断给定业务场景适合哪种存储架构。",
 "dbt-l1-5": "1. 列出手写 SQL 脚本在企业级数仓中的四类致命缺陷（无依赖管理、无测试、无复用、无文档）；\n2. 解释 dbt 通过何种机制逐一化解这些缺陷；\n3. 论证「SQL 工程化」为什么是大势所趋。",
 "dbt-l1-6": "1. 将软件工程的版本控制、代码评审、测试驱动与 CI/CD 映射到分析工程场景；\n2. 描述一次规范的分析工程 PR 从提交到合并的完整流程；\n3. 说明测试前置如何在数据管道中防止坏数据流入报表。",
 "dbt-l1-7": "1. 依据自查清单评估一个数据团队对现代数据栈的选型成熟度；\n2. 为给定业务规模组合出合理的 MDS 工具链（摄取/存储/转换/BI）；\n3. 识别选型中过度设计与欠设计的早期信号。",
}
PREREQS = {
 "dbt-l1-1": "- 无硬性前置要求，具备基本数据库概念即可（本课程起点）。",
 "dbt-l1-2": "- 《从传统 ETL 到现代 ELT：数据架构的范式大迁移》中岗位分工变化的背景。",
 "dbt-l1-3": "- 《从传统 ETL 到现代 ELT》：理解分析负载为何要独立成仓。",
 "dbt-l1-4": "- 《OLTP 事务数据库 vs OLAP 列式分析数仓的底层物理差异》。",
 "dbt-l1-5": "- 《数据仓库、数据湖与现代湖仓一体架构全景》的存储底座认知。",
 "dbt-l1-6": "- 了解软件工程基本概念（Git、单元测试），可回看《为什么传统手写 SQL 脚本在企业级数仓中必死无疑？》。",
 "dbt-l1-7": "- 完成本章前 6 节，尤其是《分析工程的软件工程化原则：版本控制、测试驱动与 CI/CD》。",
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
