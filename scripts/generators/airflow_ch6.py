# -*- coding: utf-8 -*-
"""Chapter 6: 任务依赖关系拓扑与条件分支"""

from common import (
    lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter
)

def get_chapter_6():
    lessons = [
        lesson(
            "airflow-l6-1",
            "DAG 拓扑编排进阶：多前置依赖汇聚与扇出分发模式",
            """### 现实数据世界的拓扑结构

在简单的教学 Demo 中，任务往往是简单的一字排开（`A >> B >> C`）。
但在真实生产环境中，数据流转是高度非线性的。最常见的高阶拓扑结构有两类：

```
 [1. 扇出分发 (Fan-out)]              [2. 扇入汇聚 (Fan-in)]
          ┌──> 任务 B (风控特征)         任务 A (MySQL) ──┐
 任务 A ──┼──> 任务 C (财务日报)         任务 B (POS)   ──┼──> 任务 D (全公司宽表)
          └──> 任务 D (推荐模型)         任务 C (CRM)   ──┘
```

---

### Python 语法糖的高级连缀表达

Airflow 的位移运算符 `>>` 允许任意组合列表与单任务，生成优雅且极具表现力的 DAG：

#### 1. 菱形拓扑（Diamond Pattern）
```python
# 提取 -> 并行清洗两张表 -> 合并加载 -> 统一质检
extract >> [clean_orders, clean_customers] >> merge_data >> data_quality_check
```

#### 2. 多对多网状依赖（Many-to-Many）
```python
# 两个前置就绪后，同时触发后续三个下游
[upstream_1, upstream_2] >> [downstream_1, downstream_2, downstream_3]
```
Airflow 会自动在后台将上游列表中的**每一个任务**与下游列表中的**每一个任务**建立笛卡尔积边（Edges），无需手动写双层嵌套循环！

---

### 避免混乱的连线：保持依赖清晰可读

当 DAG 节点超过 30 个时，若到处都是交叉连线，Web 控制台的拓扑图将变成“意大利面（Spaghetti DAG）”。
最佳工程实践：
- 使用统一的起始锚点和结束锚点（如 `start_task >> ... >> end_task`）；
- 保持数据流单向从左向右推进，切忌跨越多个层级随意横向穿透。
""",
            difficulty=1,
            tips="利用列表批量连线 `[t1, t2] >> [t3, t4]` 可以自动生成 4 条依赖边，让复杂网状拓扑代码大幅精简！"
        ),
        lesson(
            "airflow-l6-2",
            "经典条件分支：`BranchPythonOperator` 与路径分流选择",
            """### 业务决策树的分支需求

在很多场景下，我们并不希望每条链路都无脑执行：
- 比如：如果是周一，执行“生成全周周报任务”；如果是平时，执行“生成普通日报任务”；
- 比如：如果上游数据源检测到今天有超过 1000 条异常数据，走“人工工单审批流”；否则走“自动化直接入库流”。

在传统的基于类的算子体系中，Airflow 提供了 **`BranchPythonOperator`** 来实现条件分流！

---

### `BranchPythonOperator` 核心工作法则

```
                           ┌──> branch_a (task_id='process_vip') ──> ...
 [BranchPythonOperator] ───┤
                           └──> branch_b (task_id='process_regular') [SKIPPED]
```

**核心法则**：
`BranchPythonOperator` 绑定的 Python 函数必须**返回一个目标下游任务的 `task_id` 字符串（或包含多个 task_id 的列表）**！
- 被选中的目标任务将被正常触发执行；
- **未被选中的所有其他分支链路上的任务，将被 Airflow 自动标记为 `SKIPPED`（已跳过）！**

---

### 经典实战代码

```python
from airflow import DAG
from airflow.operators.python import BranchPythonOperator
from airflow.operators.bash import BashOperator
from datetime import datetime

def choose_branch(**context):
    execution_date = context['logical_date']
    # 判断是否为周一 (0 代表周一)
    if execution_date.weekday() == 0:
        return 'run_weekly_digest'    # 走向周报分支
    else:
        return 'run_daily_digest'     # 走向日报分支

with DAG('branch_classic_pipeline', start_date=datetime(2024, 1, 1), schedule='@daily') as dag:
    branch_task = BranchPythonOperator(
        task_id='check_day_of_week',
        python_callable=choose_branch
    )

    weekly_task = BashOperator(task_id='run_weekly_digest', bash_command='echo "生成周报"')
    daily_task = BashOperator(task_id='run_daily_digest', bash_command='echo "生成日报"')

    branch_task >> [weekly_task, daily_task]
```
""",
            difficulty=2,
            tips="记住：Branch 算子的返回值必须是目标任务的 `task_id`（字符串），绝不是布尔值 True/False！"
        ),
        lesson(
            "airflow-l6-3",
            "现代 TaskFlow 条件分支：`@task.branch` 装饰器极速实现",
            """### TaskFlow 时代的优雅分支：`@task.branch`

在现代 TaskFlow API 中，我们不再需要显式定义 `BranchPythonOperator`，而是使用更地道的装饰器：**`@task.branch`**。

---

### 实战：电商节庆活动自适应流水线

```python
from airflow.decorators import dag, task
from datetime import datetime

@dag(schedule='@daily', start_date=datetime(2024, 1, 1), catchup=False)
def modern_branching_pipeline():

    @task
    def fetch_inventory_count():
        # 模拟拉取库存
        return 150

    @task.branch
    def decide_restock_path(inventory: int) -> str:
        # 函数直接返回目标任务的 task_id 字符串
        if inventory < 200:
            print("库存告急，触发紧急采购补货！")
            return 'emergency_restock'
        else:
            print("库存充裕，继续正常销售分发。")
            return 'standard_dispatch'

    @task
    def emergency_restock():
        print("发送采购补货申请单...")

    @task
    def standard_dispatch():
        print("执行常规出库流程...")

    # 编排数据与控制流
    inv = fetch_inventory_count()
    branch_decision = decide_restock_path(inv)

    # 将分支决策连接到各个候选下游
    branch_decision >> [emergency_restock(), standard_dispatch()]

modern_branching_pipeline()
```

#### 优势：
1. 业务逻辑与入参天然绑定；
2. 无需在函数签名中写死繁琐的 `**context`；
3. 支持返回字符串列表以同时激活多条分支（例如 `return ['task_a', 'task_b']`）。
""",
            difficulty=2,
            tips="用 `@task.branch` 替代传统 BranchOperator，让分支判断逻辑像编写普通 Python 业务函数一样清晰纯粹。"
        ),
        lesson(
            "airflow-l6-4",
            "关键机制 Trigger Rules：`all_success`、`all_done`、`one_success` 与 `none_failed_min_one_success`",
            """### 为什么需要 Trigger Rules（触发规则）？

默认情况下，Airflow 中每个任务的触发规则都是 **`all_success`**。
这意味着：**该任务必须等待其所有的直接上游任务状态都变为 `SUCCESS`，自身才会被触发执行！**

但在条件分支场景中，这会引发一个著名的**下游汇聚死锁陷阱**：
- 分支 A 成功执行（`SUCCESS`）；
- 分支 B 被跳过（`SKIPPED`）；
- 最终汇聚任务 `final_join` 默认是 `all_success`。因为它发现上游的分支 B 并不是 `SUCCESS`，于是 `final_join` **也自动被标记为 `SKIPPED`，导致管道后续全部瘫痪！**

为了破局，必须配置 **`trigger_rule`**！

```
                     ┌──> 分支 A (SUCCESS) ──┐
 分支选择器 ─────────┤                       ├──> 最终汇报任务
                     └──> 分支 B (SKIPPED) ──┘    (默认 all_success 导致也被跳过!)
                                                  【修改 trigger_rule 解决!】
```

---

### 六大核心 Trigger Rules 规则全景表

| 触发规则名称 | 触发条件 | 典型应用场景 |
| :--- | :--- | :--- |
| **`all_success`**（默认） | 所有直接上游任务必须全部为 `SUCCESS` | 常规强因果依赖数据管道 |
| **`none_failed_min_one_success`** | 没有直接上游任务失败（Failed/Upstream_failed），且**至少有 1 个上游为 Success** | **分支合并汇聚（Branching Join）的绝对首选黄金规则！** |
| **`one_success`** | 只要有任意 1 个上游变为 `SUCCESS` 就立刻触发，不等待其他上游执行完毕 | 竞赛并行计算、快速通道触发 |
| **`all_done`** | 所有直接上游任务都已结束（不论成功、失败还是跳过） | **资源清理任务（Cleanup）、最终兜底告警** |
| **`all_failed`** | 所有直接上游都必须彻底失败才触发 | 容灾降级通道、全链路故障紧急处理 |
| **`one_failed`** | 只要有任意 1 个上游失败就立刻提前触发 | 快速告警熔断 |
""",
            difficulty=2,
            tips="分支汇聚黄金法则：当多条分支合并到一个汇聚任务时，务必将汇聚任务的 `trigger_rule` 设置为 `none_failed_min_one_success`！"
        ),
        lesson(
            "airflow-l6-5",
            "任务跳过（Skipped）状态的级联传播与下游汇合陷阱",
            """### 深入理解“跳过（Skipped）的病毒式蔓延”

在 Airflow 的状态机中，`SKIPPED` 具有很强的传染性：
- 当一个任务被分支算子判定跳过时，它的状态变为 `SKIPPED`；
- 如果它的直接下游任务采用默认的 `all_success` 触发规则，由于无法满足“全部上游成功”，该下游也会被自动标记为 `SKIPPED`；
- 这种跳过状态会顺着 DAG 的边一路向右蔓延，直到遇到配置了特殊 `trigger_rule` 的节点为止！

---

### 分支合并汇聚的避坑对比

#### 错误示例（导致整条下游失联）：
```python
branch_task >> [path_a, path_b] >> finalize_step
# ❌ finalize_step 默认 trigger_rule='all_success'
# 结果: 只要 path_a 或 path_b 有一个被 skip，finalize_step 必然被 skip！
```

#### 正确工程写法：
```python
from airflow.utils.trigger_rule import TriggerRule

finalize_step = BashOperator(
    task_id='finalize_step',
    bash_command='echo "合并分支，执行最终业务归档"',
    trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS  # ✅ 正确放行！
)

branch_task >> [path_a, path_b] >> finalize_step
```
通过 `TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS`：
- 被跳过的分支（`SKIPPED`）不会被视作失败（Failed）；
- 只要走通的那条分支是 `SUCCESS`，汇聚任务就能顺利点火运行！
""",
            difficulty=2,
            tips="在代码中配置 trigger_rule 时，建议通过 `from airflow.utils.trigger_rule import TriggerRule` 引用枚举常量，避免手写字符串拼写错误！"
        ),
        lesson(
            "airflow-l6-6",
            "空任务占位符：`EmptyOperator`（原 DummyOperator）在图拓扑中的锚点价值",
            """### 为什么需要“什么都不干”的算子？

很多初学者看到 **`EmptyOperator`**（早期版本称为 `DummyOperator`）时会感到奇怪：这个算子明明什么代码都不执行，秒进秒出，为什么要多此一举把它加进 DAG？

在大中型复杂工作流中，`EmptyOperator` 是不可或缺的**拓扑锚点与流量汇聚器**！

---

### 典型三大架构应用场景

#### 场景 1：分支汇聚与下游解耦（Joiner Anchor）
如果分支之后有 5 个后续公共任务，与其让 2 个分支节点各自与这 5 个下游连线（需要维护 10 条连接关系，且每个下游都要单独配置 `trigger_rule`）：
**不如在中间插入一个 `EmptyOperator` 作为唯一的汇聚锚点！**

```
              ┌──> 分支 A ──┐
 分支选择器 ──┤             ├──> [join_branch (EmptyOperator)] ──> 下游任务 1..5
              └──> 分支 B ──┘    (仅此一个节点配置 trigger_rule!)
```

#### 场景 2：明确 DAG 唯一起点与终点（Start / End Anchors）
在 Web UI 图谱中，放置明确的 `start` 和 `end` 空任务，可以让整个数据管道在可视化界面上一目了然：
```python
start = EmptyOperator(task_id='start')
end = EmptyOperator(task_id='end')
start >> [extract_a, extract_b] >> ... >> [report_1, report_2] >> end
```

#### 场景 3：外部依赖探测的虚拟桩
在跨团队协作时，可以先用 `EmptyOperator` 作为尚未开发完毕的模块占位符，跑通全图的调度依赖骨架。
""",
            difficulty=1,
            tips="用 `EmptyOperator` 作为分支汇聚节点，只需在这个空节点上配置一次 `TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS`，其后的所有下游任务都可以恢复为默认的 `all_success`，极为优雅！"
        ),
        lesson(
            "airflow-l6-7",
            "动态条件分支实战：周末与工作日差异化计算流水线",
            """### 综合实战：差异化财报调度流水线

在很多金融和电商企业中，周末与工作日的数据处理流程截然不同：
- 工作日（周一至周五）：股市开盘，执行高频实时结算并生成交易日报；
- 周末（周六与周日）：市场休市，跳过实时结算，转而执行全周风控回溯与重度模型重训练。

我们将运用本章所学，完整构建一个带有分支决策、空算子锚点与科学 Trigger Rule 的工业级流水线。

---

### 完整端到端实战代码

```python
from datetime import datetime
from airflow.decorators import dag, task
from airflow.operators.empty import EmptyOperator
from airflow.utils.trigger_rule import TriggerRule

@dag(
    dag_id='trading_day_branching_pipeline',
    start_date=datetime(2024, 1, 1),
    schedule='@daily',
    catchup=False,
    tags=['finance', 'branching']
)
def financial_flow():

    start = EmptyOperator(task_id='start')

    @task.branch
    def evaluate_calendar_day(**context) -> str:
        execution_date = context['logical_date']
        # weekday 0-4 为周一至周五，5-6 为周六与周日
        if execution_date.weekday() < 5:
            print("当前为工作交易日，分流至工作日通道！")
            return 'weekday_flow.process_daily_trades'
        else:
            print("当前为周末休市，分流至周末重度回溯通道！")
            return 'weekend_flow.retrain_risk_models'

    # 工作日分支任务
    @task(task_id='weekday_flow.process_daily_trades')
    def process_trades():
        print("执行工作日交易流水撮合与对账...")

    # 周末分支任务
    @task(task_id='weekend_flow.retrain_risk_models')
    def retrain_models():
        print("执行周末历史风控模型离线重训练...")

    # 汇聚锚点 (关键：必须配置 NONE_FAILED_MIN_ONE_SUCCESS)
    join_branches = EmptyOperator(
        task_id='join_branches',
        trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS
    )

    # 终态通知任务
    @task
    def send_pipeline_status():
        print("向财务与运维总监推送当日流水线执行完毕报告！")

    end = EmptyOperator(task_id='end')

    # 编排完整拓扑
    branch_choice = evaluate_calendar_day()
    t_weekday = process_trades()
    t_weekend = retrain_models()
    notify_step = send_pipeline_status()

    start >> branch_choice
    branch_choice >> [t_weekday, t_weekend]
    [t_weekday, t_weekend] >> join_branches >> notify_step >> end

financial_flow()
```
""",
            difficulty=2,
            tips="看到整个流程的闭环了吗？通过 EmptyOperator + trigger_rule 汇聚，无论走哪条分支，最终的 notify_step 都能稳健触发，绝无死锁！"
        )
    ]

    exercises = [
        single_choice(
            "airflow-c6-e1",
            "在使用 `BranchPythonOperator` 或 `@task.branch` 实现工作流条件分流时，分支判定函数必须返回的内容是：",
            [
                {"label": "布尔值 True 或 False", "value": "A"},
                {"label": "目标被激活任务的 `task_id` 字符串（或包含多个目标 task_id 的列表）", "value": "B"},
                {"label": "下游全部任务执行完毕的预估秒数", "value": "C"},
                {"label": "当前 Worker 宿主机的 IP 地址", "value": "D"}
            ],
            "B",
            "分支算子核心要求：必须返回期望走通的下游任务 `task_id` 字符串（或列表），未被命中的分支将被标记为 `SKIPPED`。",
            1,
            "airflow-l6-2",
            ["branching", "task_id", "branch-python-operator"]
        ),
        single_choice(
            "airflow-c6-e2",
            "在条件分支汇聚的节点中，为了防止由于未被选中的分支处于 `SKIPPED` 状态导致汇聚任务也连锁被跳过，该汇聚任务最推荐设置的触发规则（Trigger Rule）是：",
            [
                {"label": "all_success", "value": "A"},
                {"label": "none_failed_min_one_success", "value": "B"},
                {"label": "all_failed", "value": "C"},
                {"label": "dummy_rule", "value": "D"}
            ],
            "B",
            "`none_failed_min_one_success` 是分支合并的标准配置：只要没有上游失败，且至少有一条分支成功执行，汇聚任务就会被正常放行触发。",
            2,
            "airflow-l6-4",
            ["trigger-rule", "none_failed_min_one_success", "branch-join"]
        ),
        single_choice(
            "airflow-c6-e3",
            "在工作流末尾负责清理临时 Docker 容器或临时存储目录的清理任务（Cleanup Task），无论前面的所有数据计算任务是成功、失败还是被跳过，都必须强制执行，该任务应配置的触发规则是：",
            [
                {"label": "all_success", "value": "A"},
                {"label": "all_done", "value": "B"},
                {"label": "one_success", "value": "C"},
                {"label": "none_skipped", "value": "D"}
            ],
            "B",
            "`all_done` 规则在所有直接上游全部执行完毕（无论终态是 SUCCESS, FAILED 还是 SKIPPED）后触发，是兜底资源回收清理任务的标准配置。",
            2,
            "airflow-l6-4",
            ["trigger-rule", "all_done", "cleanup"]
        ),
        single_choice(
            "airflow-c6-e4",
            "在 Airflow 中，本身不执行任何具体计算或 Shell 命令，专门用于在 DAG 拓扑中充当逻辑起点、终点或分支汇聚锚点的算子是：",
            [
                {"label": "EmptyOperator（原 DummyOperator）", "value": "A"},
                {"label": "WaitOperator", "value": "B"},
                {"label": "HoldOperator", "value": "C"},
                {"label": "AnchorOperator", "value": "D"}
            ],
            "A",
            "`EmptyOperator`（早期版本名为 `DummyOperator`）是 Airflow 内置的空操作算子，用于图结构的组织、汇聚与解耦。",
            1,
            "airflow-l6-6",
            ["empty-operator", "dummy-operator", "anchors"]
        ),
        multiple_choice(
            "airflow-c6-e5",
            "关于 Airflow 任务的 `SKIPPED`（跳过）状态行为，下列说法正确的有：",
            [
                {"label": "未被条件分支命中的分支节点，其状态会被置为 `SKIPPED`", "value": "A"},
                {"label": "如果直接下游任务采用默认的 `all_success` 触发规则，上游的 `SKIPPED` 状态会级联导致下游也被标记为 `SKIPPED`", "value": "B"},
                {"label": "`SKIPPED` 会被直接视作系统严重 FAILED 故障并向运维手机发送报警短信", "value": "C"},
                {"label": "可以通过为下游任务配置 `none_failed_min_one_success` 阻断跳过状态的无序蔓延", "value": "D"}
            ],
            ["A", "B", "D"],
            "A、B、D 正确。C 错误，`SKIPPED` 属于正常的逻辑旁路跳过，系统不会视作执行报错，也不会触发失败重试或错误警报。",
            2,
            "airflow-l6-5",
            ["skipped-state", "cascading-skips", "trigger-rules"]
        ),
        multiple_choice(
            "airflow-c6-e6",
            "在现代 Airflow 中，关于 `@task.branch` 装饰器的使用，下列说法正确的有：",
            [
                {"label": "被装饰的函数既可以返回单个 `task_id` 字符串，也可以返回包含多个 `task_id` 的列表以激活多条分支", "value": "A"},
                {"label": "与传统的 `BranchPythonOperator` 相比，减少了大量模板样板代码", "value": "B"},
                {"label": "函数的入参可以直接接收上游普通 `@task` 的返回值，数据与分支决策浑然一体", "value": "C"},
                {"label": "分支函数内部绝对不允许使用任何 if / else 条件判断语句", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 展现了 `@task.branch` 的现代工程优势。D 荒谬错误，分支函数的初衷就是进行条件分支选择。",
            2,
            "airflow-l6-3",
            ["task-branch", "decorators", "taskflow"]
        ),
        multiple_choice(
            "airflow-c6-e7",
            "在复杂的 DAG 编排中，使用 `EmptyOperator` 作为分支汇聚节点带来的工程优势包括：",
            [
                {"label": "避免每个后续下游任务都重复单独配置复杂的 `trigger_rule`", "value": "A"},
                {"label": "降低网状依赖的连接边（Edges）数量，使 Web 控制台拓扑图更加清晰整洁", "value": "B"},
                {"label": "充当明确的阶段完成里程碑锚点", "value": "C"},
                {"label": "能够自动将代码部署到外太空火星探测器上", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 准确归纳了 EmptyOperator 的拓扑解耦与可视化价值。D 为荒唐选项。",
            1,
            "airflow-l6-6",
            ["empty-operator", "best-practices", "topology-design"]
        ),
        judge(
            "airflow-c6-e8",
            "Airflow 的默认任务触发规则是 `all_success`，即只有在所有直接前置任务都处于 `SUCCESS` 状态时，当前任务才会被触发执行。",
            "正确",
            "`all_success` 是 Airflow 官方任务的默认全局触发规则，保障了强依赖顺序下的数据一致性。",
            1,
            "airflow-l6-4",
            ["trigger-rule", "all_success"]
        ),
        judge(
            "airflow-c6-e9",
            "若任务 A 被条件分支判定为 `SKIPPED`，但在 `none_failed_min_one_success` 的规则下，`SKIPPED` 并不会被当作 `FAILED`，只要另一条分支任务 B 为 `SUCCESS`，下游节点即可成功触发。",
            "正确",
            "这正是 `none_failed_min_one_success` 能够完美解决分支汇合死锁的核心机理（没失败且至少有一个成功即可触发）。",
            2,
            "airflow-l6-4",
            ["trigger-rule", "none_failed_min_one_success"]
        ),
        judge(
            "airflow-c6-e10",
            "在编写任务依赖时，语法 `[task_1, task_2] >> [task_3, task_4]` 是非法的，Airflow 强制要求列表只能与单个任务相连。",
            "错误",
            "Airflow 原生完全支持列表与列表之间的直接位移操作，会在底层自动建立多对多的全部笛卡尔积依赖边。",
            1,
            "airflow-l6-1",
            ["bitshift-operators", "list-dependencies"]
        ),
        fill(
            "airflow-c6-e11",
            "在现代 TaskFlow API 中，用于实现条件分支分流的专门装饰器是 @task.[BLANK1]；用于占位和汇聚锚点的空操作算子类是 [BLANK2]。",
            [["branch"], ["EmptyOperator"]],
            "使用 `@task.branch` 声明分支；使用 `EmptyOperator` 充当拓扑锚点。",
            1,
            "airflow-l6-3",
            ["decorators", "empty-operator"]
        ),
        fill(
            "airflow-c6-e12",
            "如果希望某个任务在其所有直接上游任务无论执行成功、失败还是跳过，只要全部运行完毕就立刻被触发，应将其 `trigger_rule` 属性设置为 [BLANK1]；在官方代码中推荐从模块 `airflow.utils.[BLANK2]` 导入枚举类使用。",
            [["all_done"], ["trigger_rule"]],
            "全部执行完毕触发用 `all_done`；枚举类位于 `airflow.utils.trigger_rule.TriggerRule`。",
            2,
            "airflow-l6-4",
            ["all_done", "trigger_rule", "enums"]
        ),
        open_ex(
            "airflow-c6-e13",
            "某在线商城每天凌晨 3 点需要处理来自各大支付渠道的账单对账流水线：\n1. 任务 `check_vip_channel`：判断当天大额 VIP 渠道是否有账单文件（返回 `process_vip` 或 `skip_vip`）；\n2. 若有文件，走向 `process_vip`（处理 VIP 账单）；若无文件，走向 `skip_vip`（EmptyOperator 占位）；\n3. 无论 VIP 分支走哪条路，最终都要与常规渠道任务 `process_standard` 汇聚到汇总任务 `merge_daily_ledger`；\n4. 在最后，无论对账成功还是报错失败，都必须执行 `cleanup_temp_files` 清理临时暂存。\n\n请使用 Python 编写出该流水线的完整 DAG 代码（包含合理的 TriggerRule 配置、@task 装饰器与 EmptyOperator 锚点）。",
            "```python\nfrom datetime import datetime\nfrom airflow.decorators import dag, task\nfrom airflow.operators.empty import EmptyOperator\nfrom airflow.utils.trigger_rule import TriggerRule\n\n@dag(\n    dag_id='payment_reconciliation_flow',\n    start_date=datetime(2024, 1, 1),\n    schedule='0 3 * * *',\n    catchup=False,\n    tags=['finance', 'reconciliation']\n)\ndef reconciliation_pipeline():\n\n    # 1. 常规渠道处理\n    @task\n    def process_standard():\n        print(\"处理常规渠道订单流水完成\")\n\n    # 2. 分支判断是否有 VIP 大额账单\n    @task.branch\n    def check_vip_channel() -> str:\n        has_vip_file = True  # 模拟判断逻辑\n        if has_vip_file:\n            return 'process_vip'\n        else:\n            return 'skip_vip'\n\n    # 3. VIP 处理任务\n    @task\n    def process_vip():\n        print(\"处理 VIP 渠道大额流水完成\")\n\n    # VIP 跳过占位符\n    skip_vip = EmptyOperator(task_id='skip_vip')\n\n    # 4. 汇聚节点 (关键：TriggerRule 必须为 NONE_FAILED_MIN_ONE_SUCCESS)\n    @task(trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS)\n    def merge_daily_ledger():\n        print(\"汇总 VIP 渠道与常规渠道，生成财务最终总账！\")\n\n    # 5. 最终清理任务 (关键：TriggerRule 必须为 ALL_DONE)\n    cleanup_temp_files = EmptyOperator(\n        task_id='cleanup_temp_files',\n        trigger_rule=TriggerRule.ALL_DONE\n    )\n\n    # 编排依赖拓扑\n    t_standard = process_standard()\n    branch_decision = check_vip_channel()\n    t_vip = process_vip()\n    t_merge = merge_daily_ledger()\n\n    # 分支选择连接\n    branch_decision >> [t_vip, skip_vip]\n    \n    # 汇聚到总账 (常规任务 + VIP已处理或已跳过 汇聚)\n    [t_standard, t_vip, skip_vip] >> t_merge >> cleanup_temp_files\n\nreconciliation_pipeline()\n```",
            "条件分支、分支汇合与资源清理的综合 TriggerRule 编排考查。",
            [
                {"point": "正确使用 @task.branch 实现 check_vip_channel 并返回目标 task_id", "score": 1},
                {"point": "为汇总任务 merge_daily_ledger 配置 TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS 避免跳过死锁", "score": 2},
                {"point": "为清理任务 cleanup_temp_files 配置 TriggerRule.ALL_DONE 保证无论成功失败均兜底执行", "score": 1},
                {"point": "正确编排位移依赖拓扑", "score": 1}
            ],
            "使用 @task.branch；在 merge 节点配置 TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS；在 cleanup 节点配置 TriggerRule.ALL_DONE；连线 branch >> [vip, skip] 以及 [standard, vip, skip] >> merge >> cleanup。",
            4,
            "airflow-l6-7",
            ["branching-coding", "trigger-rules", "practical-dag"]
        )
    ]

    return chapter(
        "airflow-c6",
        "airflow-data-engineering",
        6,
        "任务依赖关系拓扑与条件分支",
        "精通复杂 DAG 扇出扇入拓扑编排，掌握 BranchPythonOperator 与 `@task.branch` 条件分流，深度剖析六大 Trigger Rules 工作机制与任务跳过级联效应，利用 EmptyOperator 实现高内聚拓扑解耦。",
        lessons,
        exercises
    )
