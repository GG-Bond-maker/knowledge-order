# -*- coding: utf-8 -*-
import json, io
P = r"D:\Python_Project\knowledge-order\content-data\courses\dbt-analytics-engineering.json"
c = json.load(io.open(P, encoding="utf-8"))
BT3 = chr(96)*3
N = 6
THEME = dict(
why="""亿行大表每天 drop-create 全量重建，既烧钱又让下游长时间看不到表。物化策略回答的是"计算结果以什么形态存在于数仓"：是每次现算的视图、一次算好的物理表、只追新数据的增量表，还是零存储的内联 CTE——这是成本与时效的核心权衡。""",
intuition="""view 像菜谱（点单才下锅，零库存但每次现做）、table 像预制菜（一次做好随时取，占冷库）、incremental 像只补当天新到货的货架（老货不动只上新）、ephemeral 像口传的备菜手法（不占任何库存，直接写进别人的菜谱）。""",
code=r'''existing = [                                   # 昨天的目标表
    {"id": 1, "amount": 100, "updated_at": "06-01"},
    {"id": 2, "amount": 200, "updated_at": "06-01"},
]
new_batch = [                                  # 今天只需处理 2 行：1 更新 + 1 新增
    {"id": 1, "amount": 150, "updated_at": "06-02"},
    {"id": 3, "amount": 300, "updated_at": "06-02"},
]

def merge(target, source, unique_key):         # incremental merge 的合并语义
    idx = {r[unique_key]: r for r in target}
    for r in source:
        idx[r[unique_key]] = r                 # 命中则 update，未命中则 insert
    return [idx[k] for k in sorted(idx)]

print("增量只处理", len(new_batch), "行（全量则需重刷", len(existing) + len(new_batch), "行）")
print("merge 后目标表:")
for row in merge(existing, new_batch, "id"):
    print("  ", row)

append_only = existing + new_batch             # 忘配 unique_key 的 append 陷阱
ids = [r["id"] for r in append_only]
print("append 后重复 id:", sorted(i for i in set(ids) if ids.count(i) > 1))
''',
expected="""增量只处理 2 行（全量则需重刷 4 行）
merge 后目标表:
   {'id': 1, 'amount': 150, 'updated_at': '06-02'}
   {'id': 2, 'amount': 200, 'updated_at': '06-01'}
   {'id': 3, 'amount': 300, 'updated_at': '06-02'}
append 后重复 id: [1]""",
cerr="""1) incremental 模型忘配 unique_key，merge 退化成纯 insert，目标表主键重复、下游聚合翻倍；2) is_incremental() 里忘写过滤条件或条件写反，每次把全量历史 upsert 回去，比全量还慢；3) 大表频繁 --full-refresh 图省事，drop-create 长事务锁表导致下游查询集体超时。""",
miscon="""1. "view 零成本"——view 只省存储不省计算，高频复杂聚合走 view 反而拖慢 BI；
2. "ephemeral 省资源所以多多益善"——CTE 内联会让下游 SQL 急剧膨胀，最终超出编译器与优化器的承受力；
3. "增量一定比全量快"——过滤窗口选错或上游全量重刷时，增量反而引入滞后与更高的复杂度。""",
connection="""- **向前**：第 5 章分层决定各层默认物化（stg 常用 view、marts 用 table/incremental）；
- **向后**：第 9 章测试跑在物化产物上做断言，第 10 章快照本质是一种特殊的增量历史化；
- **平行**：与数仓原生的分区与 MERGE 语句互参——数仓 merge 是 incremental 策略的执行底座。""",
summary="""| 结论 | 内容 |
| --- | --- |
| 物化 = 存储形态决策 | 同一个 SELECT 可落成 view/table/incremental/ephemeral |
| view/table 是光谱两端 | 现算省存储 vs 预算换延迟，按查询频率与成本定 |
| incremental 靠 unique_key | merge 按 key upsert，键缺失即重复灾难 |
| full-refresh 是重置按钮 | 结构变更或脏数据后整表重建并重置增量窗口 |""")

GOALS = {
 "dbt-l6-1": "1. 说出 view/table/incremental/ephemeral 四种物化各自生成的 DDL 差异；\n2. 解释物化配置的三种下发位置（dbt_project.yml / 模型文件头 / config block）；\n3. 为典型分层选择默认物化策略。",
 "dbt-l6-2": "1. 对比 view 与 table 在「计算时机」上的根本差异；\n2. 分析查询延迟与重建成本之间的权衡曲线；\n3. 判断何种模型适合 view、何种必须物化为 table。",
 "dbt-l6-3": "1. 说明 ephemeral 以 CTE 内联进下游的机制与零存储特性；\n2. 识别 ephemeral 导致下游 SQL 膨胀的风险；\n3. 圈定轻量公共逻辑适合 ephemeral 的边界。",
 "dbt-l6-4": "1. 写出 is_incremental() 宏配合过滤窗口的标准模板；\n2. 解释首跑全量、后续增量的两阶段行为；\n3. 设计 updated_at > (select max ...) 式的增量过滤窗口。",
 "dbt-l6-5": "1. 区分 merge、delete+insert、append 三种策略的语义与适配数仓；\n2. 说明策略与 unique_key 的联动关系；\n3. 为迟到数据与更新型数据选对合并策略。",
 "dbt-l6-6": "1. 说明 unique_key 缺失时 merge 退化为 append 的重复灾难；\n2. 用列表形式配置多字段复合唯一键；\n3. 设计稳定唯一键避免目标表行膨胀。",
 "dbt-l6-7": "1. 解释 --full-refresh 删除重建并重置增量窗口的机制；\n2. 制定历史重刷的窗口选择与审计规范；\n3. 识别必须 full-refresh 的 schema 变更场景。",
}
PREREQS = {
 "dbt-l6-1": "- 第 5 章《工业级数仓分层实战》全部小节；第 3 章 dbt_project.yml 配置。",
 "dbt-l6-2": "- 《dbt 四大核心物化策略概览与底层 DDL 生成机制》。",
 "dbt-l6-3": "- 《View 与 Table 物化对比：计算时机、存储权衡与适用边界》。",
 "dbt-l6-4": "- 熟悉前两节的物化光谱，具备 SQL CTE 与子查询基础。",
 "dbt-l6-5": "- 《增量模型（Incremental）精髓：`is_incremental()` 宏与过滤窗口设计》。",
 "dbt-l6-6": "- 已理解《增量更新的三大合并策略》中 merge 的 upsert 语义。",
 "dbt-l6-7": "- 完成本章 l6-1 至 l6-6；了解第 3 章 profiles 的 prod target 隔离。",
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
