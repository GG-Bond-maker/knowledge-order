# -*- coding: utf-8 -*-
"""batch31: Airflow 课程第 9 章（幂等性设计与历史回溯补数）章主题包升级"""
import json, io
P = r"D:\Python_Project\knowledge-order\content-data\courses\airflow-data-engineering.json"
c = json.load(io.open(P, encoding="utf-8"))
BT3 = chr(96) * 3
N = 9

THEME = dict(
why="任务会重试、DAG 会重跑、三年历史要补数——生产管道的每个环节都被默认假设『可以再来一遍』。非幂等的 INSERT 让一次重试把 GMV 翻倍，一次补数把整张表污染成『没人敢用的数字』。幂等性不是加分项，而是数据工程的第一公民：这一章定义它、实现它（三大幂等写入范式），再用 backfill 与并发控制把它扩展到三年历史，最后拼出从脏数据灾难自愈的全流程。",
intuition="幂等管道像电梯按钮：按一次和按十次，来的都是同一部电梯；非幂等管道像自动售货机：每按一次就掉一罐——重试即重复扣货。把每次写入设计成『针对固定分区的覆盖式摆放』（先清空这一格再摆），无论调度器紧张地按了多少次按钮，货架上的货始终与最后一次摆放一致——重试从『危险动作』变成『安全默认』，补数从『灾难现场』变成『日常操作』。",
code="""import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE metric(dt TEXT, revenue REAL)")
BATCH = [("2026-10-21", 100.0), ("2026-10-22", 150.0)]

def run_append():                       # 反模式：盲目追加，重跑 = 翻倍
    conn.executemany("INSERT INTO metric VALUES (?, ?)", BATCH)

def run_delete_insert():                # 幂等范式：先删分区再插入
    ph = ",".join("?" * len(BATCH))     # DELETE ... WHERE dt IN (?,?)
    conn.execute(f"DELETE FROM metric WHERE dt IN ({ph})", [b[0] for b in BATCH])
    conn.executemany("INSERT INTO metric VALUES (?, ?)", BATCH)

for name, fn in [("盲目 INSERT 跑两遍", run_append),
                 ("先删后插跑两遍 ", run_delete_insert)]:
    fn(); fn()                          # 模拟「重试/重跑」让同一任务再执行一次
    n, s = conn.execute("SELECT COUNT(*), SUM(revenue) FROM metric").fetchone()
    print(f"{name}: 行数={n}, 累计={s:.0f}")
    conn.execute("DELETE FROM metric")  # 清场，给下一种方式同一起点""",
expected="盲目 INSERT 跑两遍: 行数=4, 累计=500；先删后插跑两遍 : 行数=2, 累计=250——同一批数据（2 行 250），追加式重跑行数翻倍，幂等式分毫不变。",
cerr="重跑前忘了历史已被非幂等写入污染——先做数据体检（行数/去重计数）再覆盖，否则旧脏行永远留在表里；backfill 并发不设限，三年补数瞬间开出上千个 run 打穿目标库——必须配 max_active_runs 限流；depends_on_past 误当万能保险——它把管道串行化并制造单点卡死，只该给确实无法幂等的管道兜底。",
miscon="""1. **『重试成功 = 数据正确』**——重试只保证任务状态 success，不保证数据不重复；没有幂等写入，重试正是污染数据的帮凶；
2. **『覆盖写入永远最优』**——大分区全量覆盖代价高，先删后插/原子交换要按规模与下游读取模式选型；关键是『同输入同结果』而非某种固定写法；
3. **『backfill 就是把 start_date 调早』**——backfill 按数据间隔逐段建 run 并重放；改 start_date 会改变调度边界，是另一种操作。""",
connection="""- **向前**：第 8 章的 data interval 给『幂等的最小单元』划定边界——一个分区；
- **向后**：第 10 章的动态映射让补数对象（分区列表）在运行时展开，SLA 为补数窗口定价；
- **平行**：《dbt 分析工程》的 incremental model + unique_key 正是本章『先删后插』的仓内实现。""",
summary="""| 结论 | 内容 |
| --- | --- |
| 幂等定义 | 同一输入执行一次与多次，系统状态相同：f(f(x)) = f(x) |
| 三大范式 | 覆盖写入 / 先删后插（delete+insert）/ 原子交换（swap） |
| 反模式 | 盲目 INSERT 追加：重试翻倍、补数翻 N 倍 |
| 补数 | backfill 按数据间隔逐段重放，配 max_active_runs 限流 |
| 兜底链 | depends_on_past / wait_for_downstream 只给非幂等管道上保险 |""",
)

GOALS = {
"airflow-l9-1": "1. 用 f(f(x))=f(x) 陈述幂等定义并映射到 SQL 语义；\n2. 说明重试/重跑/补数为何以幂等为前提；\n3. 判定给定写入语句是否幂等。",
"airflow-l9-2": "1. 复盘 INSERT 追加导致指标翻倍的事故链路；\n2. 量化重试 N 次后的数据偏差；\n3. 写出反模式的三个修正方向。",
"airflow-l9-3": "1. 实现覆盖写入/先删后插/原子交换三种幂等范式；\n2. 按分区大小与下游读取模式选型；\n3. 说明原子交换对读取方的一致性收益。",
"airflow-l9-4": "1. 说明 depends_on_past/wait_for_downstream 的精确语义与代价；\n2. 判断哪些管道真正需要历史依赖；\n3. 避免把串行依赖误当幂等替代品。",
"airflow-l9-5": "1. 用 airflow dags backfill 按间隔补跑历史数据；\n2. 设置补数起止与 reset-dagruns 的边界；\n3. 验证补数结果的分区对齐。",
"airflow-l9-6": "1. 配置 max_active_runs 等并发参数保护目标库；\n2. 推算补数吞吐与限流的平衡点；\n3. 设计分批分段的补数计划。",
"airflow-l9-7": "1. 设计从脏数据灾难中自愈的全流程重跑方案；\n2. 组织体检-清理-重放-验证四步剧本；\n3. 把事故教训固化为幂等性验收清单。",
}

PREREQS = {
"airflow-l9-1": "- 「数据间隔概念革命」（l8-2）——幂等的最小单元是分区；\n- 函数复合的基本数学概念。",
"airflow-l9-2": "- 「什么是数据工程的幂等性」（l9-1）；\n- 《SQL 数据库查询》的 INSERT/UPDATE 语义。",
"airflow-l9-3": "- 「毁灭性的非幂等反模式」（l9-2）。",
"airflow-l9-4": "- 「实现幂等写入的三大范式」（l9-3）——能幂等就不必依赖历史。",
"airflow-l9-5": "- 「任务实例依赖历史」（l9-4）与「数据间隔」（l8-2）。",
"airflow-l9-6": "- 「历史回溯补数」（l9-5）；\n- 「执行器大比拼」（l1-4）的并发资源观。",
"airflow-l9-7": "- 全章汇合，尤其「补数风暴与并发控制」（l9-6）与「三大范式」（l9-3）。",
}

ch = c["chapters"][N-1]
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
        f"### 参考资料\n\n> **来源类型：参考资料**\n> - 本课程整理（可参见 Apache Airflow 官方文档 docs.airflow.io 相应章节）")
c["updatedAt"] = int(__import__("time").time()*1000)
json.dump(c, io.open(P,"w",encoding="utf-8",newline="\n"),ensure_ascii=False,indent=2)
print("chapter", N, "done,", len(ch["lessons"]), "lessons")
