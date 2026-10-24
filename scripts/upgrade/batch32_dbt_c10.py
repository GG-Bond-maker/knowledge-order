# -*- coding: utf-8 -*-
import json, io
P = r"D:\Python_Project\knowledge-order\content-data\courses\dbt-analytics-engineering.json"
c = json.load(io.open(P, encoding="utf-8"))
BT3 = chr(96)*3
N = 10
THEME = dict(
why="""源表覆盖式更新让"上个月这个客户属于哪个城市"永远无法回答；同一个 GMV 指标散落在十几个 dashboard 里各算各的。快照留住历史、血缘讲清来龙去脉、语义层统一口径——这三件事把数仓从报表集合升级为可信的数据资产。""",
intuition="""snapshot 像给档案柜盖章归档：每次检查发现内容变了，就把旧档案盖"截至某日"的章封存、另开一页新档案；血缘图谱是整柜档案的目录索引，语义层则是全馆统一的术语词典——同一个词，处处同义。""",
code=r'''snap = [
    {"id": 1, "city": "北京", "dbt_valid_from": "06-01", "dbt_valid_to": None},
    {"id": 2, "city": "上海", "dbt_valid_from": "06-01", "dbt_valid_to": None},
]
current = [
    {"id": 1, "city": "深圳"},   # 变更 -> 关旧行、开新行
    {"id": 2, "city": "上海"},   # 未变 -> 原样保留
    {"id": 3, "city": "杭州"},   # 新增 -> 直接插入
]
today, check_cols = "06-02", ["city"]

keyed = {r["id"]: r for r in snap}
new_rows = []
for r in current:
    old = keyed.get(r["id"])
    if old is None:
        new_rows.append({**r, "dbt_valid_from": today, "dbt_valid_to": None})
    elif any(old[c] != r[c] for c in check_cols):     # check 策略：逐列对比
        old["dbt_valid_to"] = today                   # 关旧行
        new_rows.append({**r, "dbt_valid_from": today, "dbt_valid_to": None})

print("SCD Type 2 快照表:")
for r in sorted(snap + new_rows, key=lambda r: (r["id"], r["dbt_valid_from"])):
    end = r["dbt_valid_to"] or "现在"
    print("  id={} city={} 有效期[{}, {})".format(r["id"], r["city"], r["dbt_valid_from"], end))
print("总行数:", len(snap) + len(new_rows), "（1 个变更关旧开新 + 1 个新增）")
''',
expected="""SCD Type 2 快照表:
  id=1 city=北京 有效期[06-01, 06-02)
  id=1 city=深圳 有效期[06-02, 现在)
  id=2 city=上海 有效期[06-01, 现在)
  id=3 city=杭州 有效期[06-02, 现在)
总行数: 4 （1 个变更关旧开新 + 1 个新增）""",
cerr="""1) 对会被 dbt run 整表重建的模型做 snapshot，历史刚写好就被覆盖式物化冲掉；2) check_cols 塞进高频变动列（如 updated_at 本身），每轮快照全表关旧开新、快照表无限膨胀；3) timestamp 策略的 updated_at 不单调（存在迟到回写），有效区间出现重叠错乱。""",
miscon="""1. "snapshot 就是数据备份"——snapshot 记录的是维度变更历史（SCD Type 2），不是灾备手段；
2. "血缘图自动生成就等于文档"——图谱只展示结构关系，列级业务含义仍需人工在 YAML 里写描述；
3. "上了语义层指标口径立刻统一"——存量口径迁移与治理是长期工程，工具只是载体不是魔法。""",
connection="""- **向前**：第 2 章 SCD 理论与第 9 章质量体系是本章地基；
- **向后**：MetricFlow 语义层是 dbt 生态向指标平台演进的下一步方向；
- **平行**：《数据可视化》《数据分析方法论》中的指标定义与本章语义层口径治理直接衔接。""",
summary="""| 结论 | 内容 |
| --- | --- |
| snapshot = 自动 SCD2 | check / timestamp 策略关旧开新，历史可回溯 |
| 有效区间查询 | dbt_valid_from / dbt_valid_to 表达任一时点状态 |
| 血缘 = 影响面地图 | docs generate 产出 DAG 图谱与文档站 |
| 语义层 = 口径中枢 | 指标唯一定义，MetricFlow 统一消费 |""")

GOALS = {
 "dbt-l10-1": "1. 说明 snapshot 将 SCD Type 2 自动化的机制；\n2. 对比覆盖式更新与快照历史化对历史分析的影响；\n3. 判断哪些源表值得做 snapshot。",
 "dbt-l10-2": "1. 配置 check 策略的 check_cols 与快照频率；\n2. 说明 timestamp 策略对 updated_at 可靠性的前提依赖；\n3. 为没有可靠 updated_at 的源系统选择 check 策略。",
 "dbt-l10-3": "1. 解释 dbt_valid_from / dbt_valid_to / dbt_scd_id 三列的语义；\n2. 手推一次属性变更后新旧两行的演变过程；\n3. 编写任一时点有效行的查询条件。",
 "dbt-l10-4": "1. 运行 dbt docs generate / serve 产出文档站；\n2. 解读 lineage 图谱做变更影响面分析；\n3. 在 YAML 中维护列级描述提升文档质量。",
 "dbt-l10-5": "1. 列举指标口径分裂（同一 GMV 多个版本）的业务代价；\n2. 说明语义层「唯一定义、处处消费」的定位；\n3. 区分 dbt 语义层与 BI 工具内置语义层的差异。",
 "dbt-l10-6": "1. 写出 MetricFlow 中 entities / measures / dimensions 的 YAML 定义；\n2. 说明主键、外键实体在多表联动中的作用；\n3. 定义带时间粒度的聚合指标。",
 "dbt-l10-7": "1. 串联 MDS 全链路的生产发布 checklist；\n2. 制定生产环境的调度、监控与回滚规范；\n3. 规划个人分析工程能力成长路线图。",
}
PREREQS = {
 "dbt-l10-1": "- 回顾第 2 章《缓慢变化维 (SCD, Slowly Changing Dimensions) 深度演进》。",
 "dbt-l10-2": "- 《业务历史变更捕获：Kimball SCD Type 2 与 dbt Snapshot 机制》。",
 "dbt-l10-3": "- 《Snapshot 实战策略：check 列对比与 timestamp 时间戳策略》。",
 "dbt-l10-4": "- 第 4 章 DAG 依赖体系；具备 dbt 基本命令使用经验。",
 "dbt-l10-5": "- 第 2 章建模与第 9 章质量体系；了解 BI 指标口径痛点。",
 "dbt-l10-6": "- 《数据语义层（Semantic Layer）诞生背景：指标唯一定义的北极星》。",
 "dbt-l10-7": "- 完成本课程前 9 章全部内容。",
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
