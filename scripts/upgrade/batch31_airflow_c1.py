# -*- coding: utf-8 -*-
"""batch31: Airflow 课程第 1 章（调度演进与架构）章主题包升级"""
import json, io
P = r"D:\Python_Project\knowledge-order\content-data\courses\airflow-data-engineering.json"
c = json.load(io.open(P, encoding="utf-8"))
BT3 = chr(96) * 3
N = 1

THEME = dict(
why="凌晨两点，服务器上的几十个 Crontab 脚本按各自时刻醒来：extract 失败了没人重试，transform 却照跑并把空结果写进数仓，早晨的报表数字悄悄少了一半，直到业务方发现才有人救火。裸脚本调度在依赖、重试、观测、回溯四个维度上全是空白，这正是工作流编排器存在的理由。本章回答数据工程的第一问：为什么必须告别 Crontab，以及 Airflow 用哪五大组件、怎样的执行生命周期与部署基线来兜住生产级管道。",
intuition="把 Crontab 想成一排各干各的闹钟，把 Airflow 想成一家有监控大屏（Webserver）、调度前台（Scheduler）、档案室（元数据库）、施工队（Executor/Worker）的装修公司：每道工序开工前先查档案室确认上道工序已完工，失败会自动登记并安排重试，所有状态实时可查。工序之间不再靠『祈祷上游成功』，而是靠状态机驱动——这就是从『到点即发』到『状态驱动』的范式差。",
code="""import random
random.seed(42)

# ---- Crontab 模式：到点即发，成败不问，下游照跑 ----
JOBS = {"fetch": 0.4, "clean": 0.5}          # 两个脚本的失败概率
for name, p in JOBS.items():
    ok = random.random() > p
    print(f"[crontab] {name}: {'ok' if ok else 'FAILED（无人重试）'}")

# ---- 编排器模式：元数据库状态机 + 依赖卡点 + 自动重试 ----
state = {"fetch": "pending", "clean": "pending"}
deps, attempt = {"clean": ["fetch"]}, {}
for tick in range(1, 5):
    for task in state:
        if state[task] == "pending" and all(state.get(d) == "success" for d in deps.get(task, [])):
            if random.random() > JOBS[task]:
                state[task] = "success"
                print(f"[tick{tick}] {task}: success（状态回写元数据库）")
            else:
                attempt[task] = attempt.get(task, 0) + 1
                print(f"[tick{tick}] {task}: 第{attempt[task]}次失败，登记后等待下轮重试")
print("最终状态:", state)""",
expected="crontab 模式：fetch ok、clean FAILED（无人重试）；编排器模式：fetch 连续 2 次失败被登记重试，tick3 转为 success 后 clean 才被放行，最终 {'fetch': 'success', 'clean': 'success'}——同样的随机故障，两种调度两种命运。",
cerr="把 Airflow 当更漂亮的 Crontab 用（单脚本 DAG、无依赖无重试），五大组件形同虚设；Scheduler 与重任务 Worker 挤在同一台小机器上，解析与执行互相抢占资源导致调度延迟；在 DAG 文件顶层写重 IO 代码，Scheduler 每隔几秒解析一遍全部文件，直接把解析过程拖垮。",
miscon="""1. **『Crontab 加个重试脚本就够用』**——重试只是编排器的一小块：依赖卡点、状态持久化、历史回溯补数、UI 观测缺一不可，自研这些的代价远超部署 Airflow；
2. **『组件越多越复杂，不如单体』**——五大组件各司其职正是水平扩展的前提：Webserver 挂了调度照跑、Worker 加机器即扩容，单体架构两者都做不到；
3. **『DAG 文件就是普通 Python 脚本，随便写』**——顶层代码会在每个解析周期被反复执行，重 IO/重计算必须挪进任务函数内部。""",
connection="""- **向前**：本课程第 2 章（DAG 核心三要素）把本章的架构图落到第一份可运行的 DAG 代码；
- **向后**：第 4 章 TaskFlow、第 7 章传感器与 Deferrable 是『任务怎么写/怎么等』的现代演进，第 9 章幂等性则是『重试与补数安全』的前提；
- **平行**：《dbt 分析工程》中 dbt 自身只有单机执行能力，长链路编排同样依赖本章的调度器思想。""",
summary="""| 结论 | 内容 |
| --- | --- |
| 调度演进 | Crontab（到点即发）→ 编排器（状态机 + 依赖 + 重试 + 观测） |
| 五大组件 | Webserver（观测）、Scheduler（决策）、元数据库（状态）、Executor（分配）、Worker（执行） |
| 生命周期 | 解析 DAG 文件 → 排队 TaskInstance → Worker 执行 → 状态回写 |
| 头号禁忌 | 顶层代码在解析期被反复执行，重逻辑必须放进任务内 |
| 部署基线 | 生产至少 LocalExecutor + 外置元数据库，容器化起步用 Docker Compose |""",
)

GOALS = {
"airflow-l1-1": "1. 列出裸 Crontab 调度的四类结构性缺陷（无依赖、无重试、无观测、无回溯）；\n2. 说明工作流编排器分别用哪些机制补齐这些缺陷；\n3. 用「到点即发 vs 状态机驱动」一句话讲清两种调度的本质差别。",
"airflow-l1-2": "1. 对比 XML/GUI 声明与纯 Python 声明在版本控制、复用与测试上的差异；\n2. 解释「DAG 文件是给 Scheduler 解析的，不是给业务执行的」这句忠告；\n3. 说出 Configuration as Code 带来的 CI/CD 与代码评审能力。",
"airflow-l1-3": "1. 说出 Webserver、Scheduler、元数据库、Executor、Worker 的职责边界与数据流；\n2. 解释元数据库为什么是『单一事实来源』，各组件如何通过它协同；\n3. 定位一个『任务卡在 queued』的问题应依次检查哪些组件。",
"airflow-l1-4": "1. 区分 Sequential/Local/Celery/Kubernetes 四类 Executor 的资源模型与适用规模；\n2. 说明 Executor 如何决定任务在哪跑、Worker 槽位如何分配；\n3. 为给定团队规模与任务负载做执行器选型并说明理由。",
"airflow-l1-5": "1. 描述一个 DAG 从 Python 文件到任务完成所经历的解析、调度、排队、执行、回写五阶段；\n2. 区分 DAG Run 与 Task Instance 两个运行单元；\n3. 根据 UI 状态（queued/running/failed）推断卡点在哪一阶段。",
"airflow-l1-6": "1. 说明 Scheduler 周期性解析 DAG 文件带来的顶层代码放大效应；\n2. 判断变量读取、Jinja 渲染等操作属于解析期还是执行期；\n3. 把一段含顶层重 IO 的错误 DAG 重构为符合规范的安全写法。",
"airflow-l1-7": "1. 用 Docker Compose 拉起含元数据库、Scheduler、Worker、Webserver 的最小生产拓扑；\n2. 指出生产配置基线中的关键项（executor、数据库、密钥后端、日志）；\n3. 说明为什么本地 SequentialExecutor 的成功不能代表生产环境没问题。",
}

PREREQS = {
"airflow-l1-1": "- 了解 Linux crontab 五个时间位的基本含义；\n- 具备命令行执行 Python 脚本的经验。",
"airflow-l1-2": "- 「从 Crontab 脚本到工作流编排器：数据工程调度的演进之痛」（l1-1）；\n- Git 基本操作（本课程默认已知）。",
"airflow-l1-3": "- 「从 Crontab 脚本到工作流编排器」（l1-1）的调度痛点；\n- 「代码即配置」（l1-2）——知道 DAG 文件由谁解析。",
"airflow-l1-4": "- 「Airflow 核心五大组件」（l1-3）——Executor 是其中一支的深化。",
"airflow-l1-5": "- 「Airflow 核心五大组件」（l1-3）与「执行器大比拼」（l1-4）。",
"airflow-l1-6": "- 「代码即配置」（l1-2）与「DAG 的生命周期」（l1-5）——先知道解析期会发生什么。",
"airflow-l1-7": "- 「DAG 的生命周期」（l1-5）与「执行器大比拼」（l1-4）；\n- Docker 基本概念（镜像/容器/卷）。",
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
