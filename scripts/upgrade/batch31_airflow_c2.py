# -*- coding: utf-8 -*-
"""batch31: Airflow 课程第 2 章（DAG 核心三要素）章主题包升级"""
import json, io
P = r"D:\Python_Project\knowledge-order\content-data\courses\airflow-data-engineering.json"
c = json.load(io.open(P, encoding="utf-8"))
BT3 = chr(96) * 3
N = 2

THEME = dict(
why="为什么同一个 ETL 需求，有人写成 20 行可测试、可评审的 Python，有人却写成谁也不敢动的祖传脚本？差别在于是否把管道抽象成一张『有向无环图』，并用三大要素（dag_id、start_date、schedule）严格声明身份、起点与节奏。这一章把图论里的 DAG 翻译成数据管道语言，从顶点和边的语义讲到 default_args、依赖语法与上下文管理器风格，最终写出第一个端到端可运行的工业级 DAG。",
intuition="把管道想象成地铁线路图：站点是任务，轨道方向是依赖（extract 站不通车，transform 站绝不发车）；『无环』保证列车不会绕圈回到出发站；dag_id 是线路名（全网唯一），start_date 是通车纪念日（必须是固定时刻，不是『今天』），schedule 是发车间隔。三大要素缺一，调度台就没法排班——这就是『声明式』的力量：说清规则，调度器自己推演时刻表。",
code="""from datetime import datetime

DAGS = {}   # 元数据库里的 dag 表：dag_id 必须全网唯一

def register(dag_id, start_date, schedule, tasks):
    if dag_id in DAGS:
        raise ValueError(f"duplicate dag_id: {dag_id}")
    DAGS[dag_id] = dict(start_date=start_date, schedule=schedule, tasks=tasks)

register("etl_daily", datetime(2026, 1, 1), "0 2 * * *",
         {"extract": [], "transform": ["extract"], "load": ["transform"]})
try:
    register("etl_daily", datetime(2026, 6, 1), "0 3 * * *", {})
except ValueError as e:
    print("三要素校验拦截:", e)

# Kahn 拓扑排序：DAG 无环才存在拓扑序 —— 这就是「可调度」的数学前提
tasks = {t: list(d) for t, d in DAGS["etl_daily"]["tasks"].items()}
order, ready = [], sorted(t for t, d in tasks.items() if not d)
while ready:
    t = ready.pop(0); order.append(t)
    for other, deps in tasks.items():
        if t in deps:
            deps.remove(t)
            if not deps:
                ready.append(other)
print("拓扑序:", " -> ".join(order))
print("schedule =", DAGS["etl_daily"]["schedule"],
      "| start_date =", DAGS["etl_daily"]["start_date"].date())""",
expected="三要素校验拦截: duplicate dag_id: etl_daily；拓扑序: extract -> transform -> load；schedule = 0 2 * * * | start_date = 2026-01-01——撞名的 DAG 在注册期即被拒绝，拓扑序证明依赖图可调度。",
cerr="dag_id 撞名导致后解析的 DAG 覆盖同名者或任务找不到预期归属；start_date 写成 datetime.now()——每次解析都变化，DAG 行为漂移、回溯边界失控，必须用固定时刻；以为 start_date 当天就会首跑——首个数据间隔结束后才触发，常被误判为『调度没生效』。",
miscon="""1. **『start_date 是第一次运行的时间』**——它是调度轴起点（第一个数据间隔的左端点），首次触发发生在第一个间隔结束之后，通常比 start_date 晚一个周期；
2. **『链式调用 >> 只是代码风格』**——依赖决定拓扑与并行度，是调度器的核心输入而非注释，写错边等于改错生产流程；
3. **『retries 会拖慢正常流程，不配也行』**——生产网络抖动是常态，default_args 里配好 retries/retry_delay 才是工业级 DAG 的基线。""",
connection="""- **向前**：第 1 章的五大组件与生命周期解释了这份 Python 文件由谁解析、任务何时排队；
- **向后**：第 6 章把本章的线性依赖扩展为汇聚/扇出/条件分支，第 8 章深挖 start_date/schedule 背后的数据间隔哲学；
- **平行**：《dbt 分析工程》的 ref() 依赖图与本章 DAG 同构——dbt 在仓库内建图，Airflow 在系统之间建图。""",
summary="""| 结论 | 内容 |
| --- | --- |
| DAG 定义 | 有向（依赖有方向）无环（不绕圈）图：站点 = 任务，轨道 = 依赖 |
| 三要素 | dag_id 全网唯一；start_date 固定不动；schedule 决定节奏 |
| 拓扑序 | 无环 ⇔ 存在拓扑序，调度器按序解锁任务 |
| 依赖语法 | `a >> b`、`[a, b] >> c` 与 set_downstream 等价 |
| 工业基线 | `with DAG(...)` 上下文 + default_args 统一 retries/owner |""",
)

GOALS = {
"airflow-l2-1": "1. 用图论语言（顶点/有向边/环）解释数据管道为什么天然是 DAG；\n2. 说明若依赖图出现环，调度器将陷入什么死局；\n3. 把 extract→transform→load 与扇出汇聚场景画成依赖图。",
"airflow-l2-2": "1. 说出 dag_id、start_date、schedule 各自的语义与默认行为；\n2. 解释 start_date 为何必须固定、写成 now() 会造成什么漂移；\n3. 组合三要素推算某 DAG 的首次触发时刻。",
"airflow-l2-3": "1. 写出含 retries、retry_delay、owner 的 default_args 并说明作用域；\n2. 解释『任务级参数覆盖 DAG 级默认』的优先级规则；\n3. 说明重试策略对任务幂等性的隐含要求（联动第 9 章）。",
"airflow-l2-4": "1. 区分 Operator（蓝图）与 Task/TaskInstance（执行实例）；\n2. 说明同一 Operator 声明为何能在不同日期生成不同 TaskInstance；\n3. 用『菜谱与一顿饭』类比解释两层抽象的成本与收益。",
"airflow-l2-5": "1. 熟练使用 >>、<< 声明链式与多上游依赖；\n2. 用列表语法实现扇出与汇聚；\n3. 说明 set_upstream/set_downstream 与位移运算符的等价性。",
"airflow-l2-6": "1. 用 `with DAG(...) as dag:` 风格重写脚本式 DAG 声明；\n2. 说明上下文管理器如何消除『忘记挂载 Operator』类错误；\n3. 对比两种风格在同一 DAG 下的可读性与安全性。",
"airflow-l2-7": "1. 独立写出含 Bash/Python 算子、依赖与 default_args 的完整 DAG 文件；\n2. 用 `airflow dags test` / `tasks test` 在本地验证 DAG 逻辑；\n3. 在 UI 上按状态核对每个 TaskInstance 的执行结果。",
}

PREREQS = {
"airflow-l2-1": "- 「代码即配置」（l1-2）——DAG 文件由 Scheduler 解析；\n- 图与树的基本数学概念。",
"airflow-l2-2": "- 「什么是 DAG（有向无环图）」（l2-1）——先有图的抽象，再谈参数。",
"airflow-l2-3": "- 「声明 DAG 的三大核心要素」（l2-2）；\n- Python 字典与函数默认参数机制。",
"airflow-l2-4": "- 「声明 DAG 的三大核心要素」（l2-2）；\n- Python 类与实例的基本概念。",
"airflow-l2-5": "- 「任务与算子」（l2-4）——依赖挂在任务之间。",
"airflow-l2-6": "- 「任务依赖关系语法」（l2-5）；\n- Python with 语句（上下文管理器）用法。",
"airflow-l2-7": "- 「default_args 字典设计」（l2-3）、「任务依赖关系语法」（l2-5）与「上下文管理器声明风格」（l2-6）的汇合。",
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
