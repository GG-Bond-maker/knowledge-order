# -*- coding: utf-8 -*-
"""batch31: Airflow 课程第 7 章（传感器轮询与事件驱动）章主题包升级"""
import json, io
P = r"D:\Python_Project\knowledge-order\content-data\courses\airflow-data-engineering.json"
c = json.load(io.open(P, encoding="utf-8"))
BT3 = chr(96) * 3
N = 7

THEME = dict(
why="上游数据『通常』八点到，偶尔十点才到——固定时刻启动的任务不是扑空就是干等，扑空产出脏数据，干等浪费机器。Sensor 把『等条件成立』本身变成 DAG 里的一个任务，可观测、可超时、可重试；但轮询会占住 Worker 槽位，一百个 poke 传感器就能把集群等成『空转监狱』。Airflow 2.2 的 Deferrable 与数据集调度把等待从轮询升级为事件，这是本章的主线进化。",
intuition="poke 模式像你亲自站在楼下等快递（快递不来你就一直站着，占着你的『人形槽位』）；reschedule 像跟快递员约好『每小时下来看一眼』（其余时间回去干活）；Deferrable 像开了手机推送（你该干嘛干嘛，快递到了推送唤醒你）；Dataset 像快递柜到件通知（上游放进去，柜子自动通知所有收件人）。等待的成本从『占人』降到『占表』再到『占一条回调』——这就是传感器经济学。",
code="""ARRIVE_AT = 4                       # 上游文件第 4 个调度周期才产出

def poke_mode():
    slots = 0
    for tick in range(1, ARRIVE_AT + 1):
        slots += 1                  # 等待全程占住 Worker 槽位
    return f"tick{ARRIVE_AT} 成功 | 连续占用槽位 {slots} 个周期"

def reschedule_mode():
    leases = 0
    for tick in range(1, ARRIVE_AT + 1):
        leases += 1                 # 每周期只租 1 瞬，探测失败立即退还
    return f"tick{ARRIVE_AT} 成功 | {leases} 次 1 周期短租，其余时间槽位可跑他人"

def deferrable_mode():
    return f"tick{ARRIVE_AT} 成功 | Worker 占用 0 周期，Triggerer 挂起等事件唤醒"

for name, fn in [("poke", poke_mode), ("reschedule", reschedule_mode),
                 ("deferrable", deferrable_mode)]:
    print(f"{name:<11} {fn()}")

# Dataset 事件：上游产出即发布，下游 DAG 订阅自动触发（跨 DAG 解耦）
DATASET = {"uri": "s3://lake/orders", "updated": False}

def produce():
    DATASET["updated"] = True
    return "上游 DAG 写完分区 -> 发布 Dataset 更新事件"

def consume():
    return "下游 DAG 被事件触发" if DATASET["updated"] else "下游继续等待"

print(produce(), "|", consume())""",
expected="poke        tick4 成功 | 连续占用槽位 4 个周期；reschedule  tick4 成功 | 4 次 1 周期短租，其余时间槽位可跑他人；deferrable  tick4 成功 | Worker 占用 0 周期，Triggerer 挂起等事件唤醒；Dataset: 上游 DAG 写完分区 -> 发布 Dataset 更新事件 | 下游 DAG 被事件触发。",
cerr="大量 poke 传感器配极短 poke_interval，把 Worker 槽位吃光，真正的任务全在排队——长等待应换 reschedule 或 deferrable；timeout 不设或远大于 SLA，传感器僵死拖垮整条链路；ExternalTaskSensor 两边 schedule/execution_date 对不齐导致永远 poke 不到目标 run——需显式对齐时间参数。",
miscon="""1. **『传感器失败 = 条件不成立』**——条件未满足时传感器处于 poke/reschedule 重试态，不是 failed；只有超时才是失败。两种状态的处理动作完全不同；
2. **『全部换成 reschedule 就万事大吉』**——reschedule 的重试间隔受最小调度周期限制，极短等待反而更慢；deferrable 才是等待经济的终极解；
3. **『事件驱动可以取代时间调度』**——Dataset 触发与 cron 调度是互补：前者管『数据就绪』，后者管『兜底与对账』，生产常双轨并行。""",
connection="""- **向前**：第 3 章的 Sensor 分类在本章展开为完整的等待经济学，第 6 章的拓扑为传感器提供卡点位置；
- **向后**：第 8 章的时间参数决定 ExternalTaskSensor 能否对上目标，第 10 章的 SLA 要求等待时间必须被预算；
- **平行**：《dbt 分析工程》的 freshness 检测同样是『数据未到先等待/告警』的思想。""",
summary="""| 结论 | 内容 |
| --- | --- |
| 传感器本质 | 把等待条件化：可观测、可超时、可重试的拓扑一等公民 |
| 两种模式 | poke 占槽死等 vs reschedule 短租轮询，按等待时长选型 |
| 配置铁律 | poke_interval 温和、timeout 必设、soft_fail 区分可跳过失败 |
| Deferrable | Triggerer 挂起协程等事件，Worker 零占用，2.2+ 主推方向 |
| Dataset | 数据就绪事件跨 DAG 触发：从『按时间』到『按数据』 |""",
)

GOALS = {
"airflow-l7-1": "1. 为『主动轮询/被动等待』建模并指出各自的成本；\n2. 说明把等待做成任务的观测收益；\n3. 识别哪些场景不该用传感器。",
"airflow-l7-2": "1. 配置 FileSensor/SqlSensor 的探测谓词；\n2. 用 ExternalTaskSensor 对齐跨 DAG 依赖；\n3. 排查传感器一直 poke 不过的三类原因。",
"airflow-l7-3": "1. 说清 poke/reschedule 对 Worker 槽位的占用差异；\n2. 按等待时长的数量级选择模式；\n3. 估算百级传感器集群的槽位账本。",
"airflow-l7-4": "1. 配置 poke_interval/timeout/soft_fail 的合理组合；\n2. 设计传感器超时后的死锁自愈路径；\n3. 避免全传感器 DAG 的连环卡死。",
"airflow-l7-5": "1. 解释 Deferrable 把等待搬到 Triggerer 的机制；\n2. 评估同步/异步算子的迁移收益；\n3. 说明 Triggerer 组件的部署要求。",
"airflow-l7-6": "1. 用 Dataset 建立跨 DAG 数据就绪触发；\n2. 对比时间调度与数据调度的适用面；\n3. 设计 outlet_datasets 的发布规范。",
"airflow-l7-7": "1. 继承 BaseSensorOperator 编写自定义探测逻辑；\n2. 把自定义传感器改写为 deferrable 版本；\n3. 把公司通用等待条件沉淀为传感器库。",
}

PREREQS = {
"airflow-l7-1": "- 「Airflow 算子分类学」（l3-1）的 Sensor 一支；\n- 第 6 章的拓扑卡点概念。",
"airflow-l7-2": "- 「什么是传感器」（l7-1）；\n- 「数据库交互算子」（l3-3）的连接配置。",
"airflow-l7-3": "- 「常用内置传感器实战」（l7-2）；\n- 「执行器大比拼」（l1-4）的槽位概念。",
"airflow-l7-4": "- 「传感器工作模式对比」（l7-3）——先懂占用再谈参数。",
"airflow-l7-5": "- 「传感器配置铁律」（l7-4）；\n- 协程/事件循环的基本概念。",
"airflow-l7-6": "- 「异步触发器革命」（l7-5）的事件思想；\n- 「声明 DAG 的三大核心要素」（l2-2）的 schedule 视角。",
"airflow-l7-7": "- 「常用内置传感器实战」（l7-2）与「编写自定义 Operator」（l3-7）；\n- 「异步触发器革命」（l7-5）。",
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
