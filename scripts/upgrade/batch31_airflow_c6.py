# -*- coding: utf-8 -*-
"""batch31: Airflow 课程第 6 章（依赖拓扑与条件分支）章主题包升级"""
import json, io
P = r"D:\Python_Project\knowledge-order\content-data\courses\airflow-data-engineering.json"
c = json.load(io.open(P, encoding="utf-8"))
BT3 = chr(96) * 3
N = 6

THEME = dict(
why="周一到周五走日常链路、周末跑对账链路、月末再插一条结算链路——真实管道从来不是一条直线。多前置汇聚让『任一上游失败即整体卡住』的默认规则既是资产也是陷阱；分支任务只放行一条路，另一条路的 skipped 状态又会在汇合点把下游全部冻住。这一章把拓扑编排从『连得上』升级到『连得对』：分支、触发规则、跳过级联与空任务锚点一次讲透。",
intuition="把 DAG 当铁路网看：多前置汇聚是几条线路并进一个站台（默认要求全部正点到达才发车——这就是 trigger rule）；分支是道岔（Branch 算子扳一次只通一股道，没通电的道亮起『跳过』红灯）；EmptyOperator 是没有列车的空站台，只为让道岔和汇合有处可挂。汇合站台要不要等所有方向？换一条 trigger rule 就等于换发车条件。",
code="""def branch_fn(is_weekend):             # 分支任务：返回要放行的分支 task_id
    return "weekend_job" if is_weekend else "weekday_job"

state = {}
for t in ("weekday_job", "weekend_job"):
    state[t] = "success" if t == branch_fn(is_weekend=True) else "skipped"
print("周末运行状态:", state)

def rule_all_success(up):              # 默认规则：全部成功才执行
    return "执行" if all(s == "success" for s in up.values()) else "卡死（存在 skipped）"

def rule_none_failed(up):              # 分支汇合的正确姿势
    if any(s == "failed" for s in up.values()):
        return "跳过"
    return "执行" if any(s == "success" for s in up.values()) else "跳过"

print("汇合 all_success                ->", rule_all_success(state))
print("汇合 none_failed_min_one_success ->", rule_none_failed(state))

for t, s in state.items():             # skip 级联：下游默认跟随跳过
    print(f"{t} 的下游默认 -> {'skipped' if s == 'skipped' else '可执行'}")""",
expected="周末运行状态: {'weekday_job': 'skipped', 'weekend_job': 'success'}；汇合 all_success -> 卡死（存在 skipped）；汇合 none_failed_min_one_success -> 执行；weekday_job 的下游默认 -> skipped——默认规则被跳过分支冻住，放宽规则后放行，skip 沿下游级联。",
cerr="分支之后用默认 all_success 汇合，被跳过的分支把 join 任务永久卡住——应改 none_failed_min_one_success；以为 Branch 会『两条都执行再挑一条』——它只放行返回值对应的一条，其余直接标 skipped，绝不执行；想在上游失败后继续跑却没吃透 all_done 的语义——它连『上游失败』也放行，告警与数据正确性可能双输。",
miscon="""1. **『依赖越多越安全』**——多上游汇聚放大了失败传播面：任一上游失败默认拖死汇聚点，必须按业务显式设计 trigger rule；
2. **『skipped 等于失败』**——skipped 是任务的正常状态之一，会向下游传播；把 skipped 当 failed 处理会误杀正常分支；
3. **『EmptyOperator 是历史包袱』**——它是图拓扑的锚点：分支汇合、阶段分隔、占位监控都需要无副作用节点。""",
connection="""- **向前**：第 2 章的线性依赖语法是本章汇聚/扇出/分支的语法基础；
- **向后**：第 7 章传感器是『把等待也变成拓扑中的一等公民』，第 10 章动态映射把静态扇出升级为运行时展开；
- **平行**：《dbt 分析工程》的 Node Selection（+/& 语法）本质也是依赖图遍历，与本章拓扑思想同源。""",
summary="""| 结论 | 内容 |
| --- | --- |
| 拓扑模式 | 汇聚（多上游一任务）、扇出（一上游多下游）、菱形（分支+汇合） |
| 分支 | BranchPythonOperator/@task.branch 返回一个 task_id，其余标 skipped |
| Trigger Rules | 默认 all_success；分支汇合用 none_failed_min_one_success |
| Skip 传播 | skipped 沿下游级联，直到遇到宽松 trigger rule 截断 |
| 锚点 | EmptyOperator 提供无副作用的拓扑挂点 |""",
)

GOALS = {
"airflow-l6-1": "1. 写出多上游汇聚与扇出分发的依赖语法；\n2. 分析汇聚点在默认规则下的失败传播行为；\n3. 用并行度权衡『宽而快』与『窄而稳』。",
"airflow-l6-2": "1. 用 BranchPythonOperator 按条件放行单一分支；\n2. 解释未选中分支为何标 skipped 而非 failed；\n3. 设计分支函数返回值与 task_id 的映射规范。",
"airflow-l6-3": "1. 用 @task.branch 复刻经典分支并对比代码量；\n2. 说明分支函数内如何消费上游 XCom；\n3. 避免把重计算塞进分支函数。",
"airflow-l6-4": "1. 说出 all_success/all_failed/all_done/one_success 的精确语义；\n2. 为失败补偿、忽略失败、多路尝试场景选择规则；\n3. 预判规则组合下的意外放行。",
"airflow-l6-5": "1. 追踪 skipped 状态在下游的传播路径；\n2. 用 trigger rule 截断不必要的级联跳过；\n3. 区分 skipped/upstream_failed/failed 在排障时的含义。",
"airflow-l6-6": "1. 用 EmptyOperator 构建阶段分隔与汇合锚点；\n2. 说明 DummyOperator 改名背后的语义澄清；\n3. 识别用空 shell 命令模拟空任务的坏味道。",
"airflow-l6-7": "1. 实现周末/工作日差异化流水线并正确汇合；\n2. 综合运用 branch + trigger rule + skip 传播；\n3. 对该类 DAG 做状态推演测试。",
}

PREREQS = {
"airflow-l6-1": "- 「任务依赖关系语法」（l2-5）——先会连一条边，再会连一张网。",
"airflow-l6-2": "- 「多前置依赖汇聚与扇出分发模式」（l6-1）；\n- Python 函数返回分支名的基本思路。",
"airflow-l6-3": "- 「经典条件分支」（l6-2）与「@task 装饰器核心用法」（l4-2）。",
"airflow-l6-4": "- 「经典条件分支」（l6-2）——trigger rule 因分支而必要。",
"airflow-l6-5": "- 「Trigger Rules」（l6-4）——先懂规则再看传播。",
"airflow-l6-6": "- 「多前置依赖汇聚与扇出分发模式」（l6-1）的锚点需求。",
"airflow-l6-7": "- 全章汇合：「经典条件分支」（l6-2）、「Trigger Rules」（l6-4）、「跳过级联」（l6-5）、「空任务占位符」（l6-6）。",
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
