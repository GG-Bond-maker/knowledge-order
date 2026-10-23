# -*- coding: utf-8 -*-
"""Chapter 10: 动态任务映射、SLA 告警与 Airflow + dbt 联合实战"""

from common import (
    lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter
)

def get_chapter_10():
    lessons = [
        lesson(
            "airflow-l10-1",
            "动态任务映射（Dynamic Task Mapping）：Airflow 2.3+ 的 `expand()` 与 `partial()` 革命",
            """### 静态任务生成的痛点

在 Airflow 2.3 之前，如果我们想对多个文件执行相同的处理，通常在 Python 代码里写 for 循环：
```python
# 传统静态循环（伪动态）
files = ['a.csv', 'b.csv', 'c.csv']
for f in files:
    process_task = PythonOperator(task_id=f'process_{f}', ...)
```
#### 这种写法存在致命的硬伤：
- **列表必须在编写代码时静态确定**！
- 如果这些文件是**上游任务在运行期才从 S3 动态扫描出来的**（例如今天扫描出 5 个文件，明天扫描出 100 个文件），传统 for 循环根本无法处理！
- 调度器必须解析 DAG 文件才能生成节点，无法根据运行期数据动态展开！

---

### Airflow 2.3+ 革命性特性：Dynamic Task Mapping

为了解决“运行期未知数量子任务”的动态展开难题，Airflow 2.3 借鉴了函数式编程的 Map-Reduce 思想，推出了 **Dynamic Task Mapping（动态任务映射）**！

动态任务映射由两大核心方法构成：
1. **`partial(...)`**：声明所有被映射子任务**共享的相同静态参数**；
2. **`expand(...)`**：声明需要**动态遍历展开的列表参数**，每个元素会自动生成一个独立的 TaskInstance！

```python
from airflow.decorators import dag, task
from datetime import datetime

@dag(schedule='@daily', start_date=datetime(2024, 1, 1), catchup=False)
def dynamic_mapping_intro():

    @task
    def process_file(prefix: str, filename: str):
        print(f"在 {prefix} 目录下处理文件: {filename}")
        return len(filename)

    # 共享前缀 prefix='s3://bucket'，动态展开 3 个文件
    mapped_task = process_file.partial(prefix='s3://bucket').expand(
        filename=['orders.csv', 'users.csv', 'payments.csv']
    )

dynamic_mapping_intro()
```
在 Web 控制台的 Grid 图谱中，`process_file` 会显示为 `[3]`，代表它在运行时自动动态展开为了 3 个并行独立的任务实例！
""",
            difficulty=2,
            tips="记住配对口诀：`partial` 绑定共享不变的固定参数，`expand` 绑定需要被拆解遍历的动态列表！"
        ),
        lesson(
            "airflow-l10-2",
            "动态映射的高阶形态：动态拉取上游 XCom 列表并在运行时自适应展开",
            """### 真正的端到端自适应：上游扫描 + 下游动态展开

动态任务映射最强大的威力在于：**它的 `expand()` 参数可以直接接收上游任务返回的 XCom 列表！**

```
 任务 1: scan_incoming_bucket
 (去 S3 扫描今天到达的文件列表: ['f1.parquet', 'f2.parquet', ... 'fN.parquet'])
                        │
                        ▼ (返回包含 N 个文件名的列表)
 任务 2: process_chunk.expand(file=上游列表)
 (Airflow 调度器在运行时瞬间自适应展开为 N 个并行任务，并发处理每个文件!)
                        │
                        ▼
 任务 3: aggregate_results (汇总全部动态子任务的结果)
```

---

### 工业级自适应流水线完整代码

```python
from airflow.decorators import dag, task
from datetime import datetime

@dag(schedule='@daily', start_date=datetime(2024, 1, 1), catchup=False)
def adaptive_lake_ingestion():

    # 1. 上游任务：运行时动态检测外部存储
    @task
    def list_s3_partitions(**context) -> list:
        # 模拟从对象存储动态列出待处理分区
        discovered_partitions = [
            "region=apac/dt=20240101",
            "region=emea/dt=20240101",
            "region=latam/dt=20240101"
        ]
        print(f"动态扫描发现待处理分区数量: {len(discovered_partitions)}")
        return discovered_partitions

    # 2. 映射任务：每个分区独立并发执行清洗与入库
    @task
    def ingest_partition(partition_path: str):
        print(f"正在拉取并清洗分区数据: {partition_path}")
        # 模拟处理并返回处理行数
        return 12500

    # 3. 规约任务（Reduce）：汇总所有动态实例的处理总量
    @task
    def summarize_daily_ingestion(row_counts: list):
        total = sum(row_counts)
        print(f"【全网汇总】今天所有动态分区入库总行数为: {total} 行！")
        return total

    # 优雅无缝的数据与控制流编排！
    partitions = list_s3_partitions()
    ingested_rows = ingest_partition.expand(partition_path=partitions)
    summarize_daily_ingestion(ingested_rows)

adaptive_lake_ingestion()
```
无论今天发现 3 个分区还是 300 个分区，调度器都能在运行时自适应伸缩，完全不需要修改任何代码或重新解析 DAG！
""",
            difficulty=3,
            tips="通过 `上游产出列表 -> 中间 .expand() -> 下游接收列表汇总`，你用纯 Python 实现了经典的 Map-Reduce 分布式计算范式！"
        ),
        lesson(
            "airflow-l10-3",
            "SLA（服务等级协议）超时监控机制与 Miss 回调告警",
            """### 什么是数据 SLA（Service Level Agreement）？

在企业级数据交付中，业务部门不仅关心“数据是否计算成功”，更极其严苛地关心：**“今天早晨 8:00 开例会之前，数据报表能不能出来？！”**
如果财务报表在上午 11 点才跑完，即使 100% 成功，也已经造成了重大商业延误！

**SLA（服务等级协议）** 是数据工程团队与业务消费方签署的交付时间承诺。
Airflow 提供了第一流的原生 SLA 监控机制：
**如果某个任务未能在预设的时间窗口内成功完成，系统自动判定为“SLA Miss”，并触发专有的报警回调函数！**

---

### 配置 SLA 监控与告警回调

在 `default_args` 或单个 Task 中配置 `sla` 参数（接收一个 `timedelta` 对象）：

```python
from airflow import DAG
from datetime import datetime, timedelta

def on_sla_miss_callback(dag, task_list, blocking_task_list, slas, blocking_tis):
    # 当发生 SLA 延误超时时自动触发
    print("【重大告警】检测到数据管道触发 SLA Miss 超时延误！")
    print(f"超时的 DAG: {dag.dag_id}")
    print(f"超时的任务列表: {[t.task_id for t in task_list]}")
    # 调用飞书/钉钉机器人接口发送紧急电话/短信告警...

default_args = {
    'owner': 'bi_analytics',
    'sla': timedelta(hours=2),  # 承诺在调度点火后 2 小时内必须产出！
}

with DAG(
    dag_id='executive_morning_dashboard',
    default_args=default_args,
    start_date=datetime(2024, 1, 1),
    schedule='0 6 * * *',  # 早上 6:00 点火，承诺 8:00 前必须完成！
    sla_miss_callback=on_sla_miss_callback,
    catchup=False
) as dag:
    # ...
```
一旦时钟跨过 8:00 而任务仍在运行中，Airflow 立即在后台触发回调，通知值班工程师介入排查，变被动挨骂为主动出击！
""",
            difficulty=2,
            tips="配置合理的 SLA 监控能让数据团队先于业务总监发现管道变慢，是建立企业级数据可信度的护城河。"
        ),
        lesson(
            "airflow-l10-4",
            "现代可观测性：Prometheus 指标导出、Datadog 集成与 Slack/飞书自动化告警",
            """### 走进可观测性：让黑盒调度透明化

在工业级运维中，调度系统绝不能是一个黑盒。我们必须实时监控：
- 当前集群中有多少任务处于 `QUEUED` 等待状态？
- 调度器心跳延迟（Scheduler Heartbeat）是否健康？
- 过去 24 小时各 DAG 的平均运行耗时与失败率如何？

---

### 1. Prometheus / StatsD 指标导出
在 `airflow.cfg` 中开启 StatsD 指标采集：
```ini
[metrics]
statsd_on = True
statsd_host = localhost
statsd_port = 8125
statsd_prefix = airflow
```
通过 StatsD Exporter 将指标暴露给 **Prometheus**，配合预置的 **Grafana Dashboard**，集群并发利用率、任务排队延迟一览无余！

---

### 2. 多渠道告警回调（Failure Callbacks）
在任务最终失败时，不仅需要发邮件，更需要实时推送至工作群：

```python
def send_feishu_alert(context):
    task_instance = context['task_instance']
    log_url = task_instance.log_url
    error_msg = f"任务 {task_instance.task_id} 执行失败！\n批次: {context['ds']}\n排查日志: {log_url}"
    # 调用 Webhook 发送至飞书群机器人
    post_to_feishu_webhook(error_msg)

default_args = {
    'on_failure_callback': send_feishu_alert,  # 任务失败时自动调用
}
```
结合点击直达的 `log_url`，值班同学在手机上就能一键点开查看具体堆栈异常，排障效率大幅飞跃！
""",
            difficulty=2,
            tips="在 `on_failure_callback` 中提取 `context['task_instance'].log_url`，让告警消息直接附带日志链接，是现代工程团队的标配体验！"
        ),
        lesson(
            "airflow-l10-5",
            "编排界的双雄会：为什么需要将 Airflow 与 dbt 联合部署？",
            """### 天作之合：Airflow 与 dbt 的完美互补

在现代数据工程的面试与架构设计中，一个最经典的高频问题是：
**“既然 dbt 已经能够用 ref() 自动生成 DAG 并运行数据转换，为什么我们还要用 Airflow？二者到底是什么关系？”**

答案是：**dbt 是最好的转换工具（T of ELT），而 Airflow 是整个数据生态的总指挥官（The Global Orchestrator）！**

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      Apache Airflow (总调度编排指挥官)                   │
 ├────────────────────────────────────────────────────────────────────────┤
 │ 1. 任务 1: 触发 Fivetran / 传感器探测源端数据是否到达 (E & L)             │
 │ 2. 任务 2: 触发 Spark 大数据作业做重度脱敏预处理                         │
 │ 3. 任务 3: 【调用 dbt 运行数仓建模与质量测试 (T)】                       │
 │      └── dbt 内部维护自己的几百张模型依赖 (stg -> int -> marts)          │
 │ 4. 任务 4: 触发反向 ETL (Hightouch/Census) 将数据回流 Salesforce/CRM   │
 │ 5. 任务 5: 触发机器学习模型离线预测与全链路 SLA 监控                      │
 └────────────────────────────────────────────────────────────────────────┘
```

---

### 架构职责明确划分

| 维度 | Apache Airflow（总编排器） | dbt（数仓转换引擎） |
| :--- | :--- | :--- |
| **关注视野** | **全生态广度（End-to-End）**：跨系统、跨网络、跨任务类型 | **数仓内深度（In-Warehouse）**：专注 SQL/Jinja 内部转换 |
| **核心职责** | 数据摄取、事件感知、外部任务触发、失败告警、集群扩缩容 | 维度建模、指标计算、数据质量测试、SCD 快照、语义层 |
| **执行载体** | API、Bash、Docker、K8s、各类外部 SaaS 驱动 | 数据仓库内部（Snowflake, BigQuery, DuckDB） |
""",
            difficulty=1,
            tips="记住一句话区分二者：dbt 负责‘在数仓内部如何优雅地加工数据’；Airflow 负责‘什么时候叫醒 dbt、前后配合哪些外部系统’！"
        ),
        lesson(
            "airflow-l10-6",
            "Airflow + dbt 联合落地最佳实践：Bash 调用 vs Cosmos (Astronomer) 动态 DAG 转换",
            """### 如何在 Airflow 中调度 dbt？两大主流路线

在企业落地中，将 dbt 接入 Airflow 有两大流派：

---

### 流派 1：传统宏观调用（BashOperator / DockerOperator）

将整个 dbt 项目作为一个或几个粗粒度的大任务进行调用：

```python
with DAG('dbt_daily_flow', schedule='0 3 * * *', ...) as dag:
    
    # 步骤 A: 运行 staging 模型
    run_staging = BashOperator(
        task_id='dbt_run_staging',
        bash_command='dbt run --select staging.*'
    )
    
    # 步骤 B: 运行 marts 模型并测试
    build_marts = BashOperator(
        task_id='dbt_build_marts',
        bash_command='dbt build --select marts.*'
    )

    run_staging >> build_marts
```
- **优点**：配置极其简单，几乎零门槛；
- **缺点**：在 Airflow Web 界面上只能看到一个“黑盒”，无法看清 dbt 内部 200 张模型的具体执行状态，一旦报错只能去日志里搜。

---

### 流派 2：现代细粒度解析——Cosmos（强烈推荐）

Astronomer 开源的 **`astronomer-cosmos`** 是当前业界最先进的集成神器！
它能在 Airflow 运行时，**自动解析 dbt 项目的 `dbt_project.yml` 和 `manifest.json`，将 dbt 项目中的每一张 SQL 模型和测试自动 1:1 映射为 Airflow 的原生 Task 节点！**

```python
from cosmos import DbtDag, ProjectConfig, ProfileConfig

# 一行代码将整座 dbt 项目转换为原生 Airflow DAG！
my_dbt_dag = DbtDag(
    project_config=ProjectConfig("/path/to/my_dbt_project"),
    profile_config=ProfileConfig(...),
    dag_id="cosmos_dbt_enterprise_pipeline",
    schedule_interval="@daily",
    start_date=datetime(2024, 1, 1),
    catchup=False
)
```
- **杀手级体验**：dbt 里的数据血缘图谱，原汁原味地呈现在 Airflow 控制台中！单个模型失败可以直接在 Airflow 上单独重试（Clear），无需重跑全项目！
""",
            difficulty=2,
            tips="现代数据工程首选 Cosmos：将 dbt 项目秒级无损转换为 Airflow 原生 Task 依赖，享受细粒度观测与单模型断点重试的极致体验！"
        ),
        lesson(
            "airflow-l10-7",
            "现代数据工程全景大融合：从 ELT、Airflow 调度到 dbt 数仓交付的端到端项目",
            """### 终局之战：现代数据工程（Data Engineering）全景落地

恭喜你！学到这里，你已经掌握了当今全球现代数据栈（Modern Data Stack）最核心的全部硬核技能。
让我们用一个真正的企业级端到端架构，将前九章与 dbt 课程的全部知识彻底串联融会贯通：

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                    全链路端到端现代分析数据工程全景                       │
 ├────────────────────────────────────────────────────────────────────────┤
 │ 阶段 1: 异步前置探测                                                   │
 │    └── FileSensorAsync / ExternalTaskSensor 监听上游数据就绪            │
 │                                                                        │
 │ 阶段 2: 动态多源并发摄取 (Dynamic Task Mapping)                         │
 │    └── list_tables() >> extract_table.expand(table=...)                │
 │    └── 严格遵循“传递存储指针”黄金法则 (流转 S3 URI，绝不传大对象)      │
 │                                                                        │
 │ 阶段 3: 现代分析工程转换与契约质量网 (Airflow + dbt Cosmos)              │
 │    ├── Staging 层 1:1 标准化清洗 (stg_*)                               │
 │    ├── Intermediate 复杂特征预计算与行转列 (int_*)                     │
 │    ├── Marts 核心事实表与维度表物化 (fct_*, dim_*)                     │
 │    └── 数据质量通用测试 (unique, not_null, contracts 契约熔断保护)     │
 │                                                                        │
 │ 阶段 4: 幂等落地与数据感知广播                                         │
 │    ├── 采用事务两阶段 DELETE + INSERT 或 OVERWRITE 保证无限重跑一致性   │
 │    └── 声明 outlets=[Dataset("s3://dw/gold/daily_sales")]               │
 │                                                                        │
 │ 阶段 5: 全方位可观测性与 SLA 兜底                                      │
 │    ├── 签署 2 小时 SLA 超时告警回调                                    │
 │    └── on_failure_callback 联动飞书/钉钉附带实时日志直达排障链接        │
 └────────────────────────────────────────────────────────────────────────┘
```

#### 数据架构师的结业寄语
数据工程从来不是单纯写写 SQL，它是一门**关于可靠性、幂等性、可观测性与模块化治理的软件工程严密学科**。
现在的你，已经具备了在任何一线大厂或独角兽企业搭建百万级、千万级生产数据平台的完整工程实战能力！
""",
            difficulty=3,
            tips="从今天起，你已经不仅仅是一名写脚本跑数的初学者，而是一名具备现代化架构思维、能够为全公司核心商业决策保驾护航的高级数据工程师！"
        )
    ]

    exercises = [
        single_choice(
            "airflow-c10-e1",
            "在 Airflow 2.3+ 引入的动态任务映射（Dynamic Task Mapping）中，用于声明所有被展开子任务共享的不变静态参数的方法是：",
            [
                {"label": "partial()", "value": "A"},
                {"label": "expand()", "value": "B"},
                {"label": "static()", "value": "C"},
                {"label": "constant()", "value": "D"}
            ],
            "A",
            "`partial()` 负责声明公共静态参数，`expand()` 负责接收需要动态遍历拆解的列表参数并生成独立的任务实例。",
            1,
            "airflow-l10-1",
            ["dynamic-task-mapping", "partial", "expand"]
        ),
        single_choice(
            "airflow-c10-e2",
            "在数据工程中，SLA（Service Level Agreement，服务等级协议）超时监控机制的核心业务价值在于：",
            [
                {"label": "保证在任务未能在承诺的业务时间窗口（如早晨 8 点）前完成时主动触发报警，先于业务方感知延误", "value": "A"},
                {"label": "自动将所有的失败任务从数据库中彻底抹除以防被领导发现", "value": "B"},
                {"label": "强制让 Worker 节点的物理 CPU 主频超频 200%", "value": "C"},
                {"label": "在任务运行时自动禁止任何人打开 Web 控制台", "value": "D"}
            ],
            "A",
            "SLA 监控承诺了业务数据的交付时限。一旦超时未产出，系统自动判定为 SLA Miss 并触发回调通知，保障交付确定性。",
            1,
            "airflow-l10-3",
            ["sla", "monitoring", "business-value"]
        ),
        single_choice(
            "airflow-c10-e3",
            "在现代分析工程与数仓流水线中，业界公认的 Airflow 与 dbt 的角色分工定位是：",
            [
                {"label": "Airflow 作为总编排指挥官管理全生命周期调度与外部系统集成；dbt 专注在数仓内部进行模块化 SQL 转换与质量测试", "value": "A"},
                {"label": "dbt 完全替代了 Airflow，Airflow 已经被业界全面淘汰禁止使用", "value": "B"},
                {"label": "Airflow 只能运行 Python，dbt 只能运行 Java，二者技术完全冲突无法结合", "value": "C"},
                {"label": "dbt 负责管理服务器硬件与网络连线，Airflow 负责写业务报表", "value": "D"}
            ],
            "A",
            "Airflow 负责宏观全链路事件编排与跨系统调度，dbt 专注数据仓库内部的转换与测试建模，二者相辅相成构成了现代数据栈的核心支柱。",
            1,
            "airflow-l10-5",
            ["airflow-vs-dbt", "modern-data-stack", "architecture"]
        ),
        single_choice(
            "airflow-c10-e4",
            "在现代 Airflow 中调度 dbt 项目时，能够自动解析 dbt 项目结构并将每个 dbt 模型和测试 1:1 转换为 Airflow 原生 Task 节点的开源开源集成框架是：",
            [
                {"label": "Astronomer Cosmos", "value": "A"},
                {"label": "dbt-executor", "value": "B"},
                {"label": "Airflow-Spark-Bridge", "value": "C"},
                {"label": "SQL-Translator", "value": "D"}
            ],
            "A",
            "`Astronomer Cosmos` 能够将 dbt 项目自动解析为原生 Airflow DAG 细粒度节点，实现血缘可视化与单个模型的断点重跑。",
            2,
            "airflow-l10-6",
            ["cosmos", "astronomer", "dbt-integration"]
        ),
        multiple_choice(
            "airflow-c10-e5",
            "关于动态任务映射（Dynamic Task Mapping）的能力与表现，下列说法正确的有：",
            [
                {"label": "支持将上游任务在运行时动态扫描返回的列表作为 `expand()` 入参进行自适应展开", "value": "A"},
                {"label": "展开的每个子任务都具有独立的运行状态、日志和生命周期，支持单独重跑", "value": "B"},
                {"label": "下游任务可以直接接收被映射任务的全部输出列表，实现类似 Map-Reduce 的汇聚计算", "value": "C"},
                {"label": "必须在编写 Python 代码时硬编码写死每个子任务的固定数量与名字", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 展现了动态任务映射在运行时自适应伸缩的核心威力。D 错误，它正是为了消除硬编码而生的革命性特性。",
            2,
            "airflow-l10-2",
            ["dynamic-task-mapping", "map-reduce", "runtime-adaptation"]
        ),
        multiple_choice(
            "airflow-c10-e6",
            "在构建企业级数据管道可观测性（Observability）与告警体系时，下列工程实践属于推荐规范的有：",
            [
                {"label": "通过 `on_failure_callback` 捕获异常，并在钉钉/飞书消息中附带 `task_instance.log_url` 直达链接", "value": "A"},
                {"label": "配置 StatsD / Prometheus 导出调度器心跳、任务排队延迟等核心指标并在 Grafana 监控", "value": "B"},
                {"label": "为核心商业报表配置明确的 `sla` 时间窗口及超时告警回调", "value": "C"},
                {"label": "关闭所有的日志记录功能，防止日志文件占用服务器硬盘", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 构成了现代化数据平台全方位可观测性与告警运维基准。D 属于严重违规行为，会导致故障无法排查。",
            2,
            "airflow-l10-4",
            ["observability", "callbacks", "sla", "best-practices"]
        ),
        multiple_choice(
            "airflow-c10-e7",
            "现代数据栈（Modern Data Stack）在端到端落地时，通常包含下列哪些关键阶段与技术协同？",
            [
                {"label": "基于传感器（Sensors）或数据集（Datasets）的事件感知驱动触发", "value": "A"},
                {"label": "Airflow 调度与 dbt 规范化分层（Staging -> Intermediate -> Marts）深度协同", "value": "B"},
                {"label": "遵循严格的幂等性设计与并发控制，确保随时可无损进行历史回溯补数", "value": "C"},
                {"label": "必须把公司所有的商业机密密码以明文打印在控制台标准输出中", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 是现代数据栈高可用落地三大支柱。D 严重违背信息安全规范。",
            2,
            "airflow-l10-7",
            ["modern-data-stack", "end-to-end", "best-practices"]
        ),
        judge(
            "airflow-c10-e8",
            "在动态任务映射中，使用 `my_task.partial(a=1).expand(b=[10, 20])` 语法，底层会生成 2 个独立的任务实例，且每个实例的参数 `a` 均为 1。",
            "正确",
            "`partial(a=1)` 将共享参数注入每个实例，`expand(b=[10, 20])` 展开生成对应两个不同 `b` 值的任务实例。",
            1,
            "airflow-l10-1",
            ["dynamic-mapping", "partial", "expand"]
        ),
        judge(
            "airflow-c10-e9",
            "一旦配置了 `sla_miss_callback`，当任务超时触发 SLA Miss 时，Airflow 调度器会自动杀死该任务的 Worker 进程并将其强行置为 FAILED。",
            "错误",
            "SLA Miss 只负责在后台触发预设的回调报警函数（通知人），并不会强制杀死正在运行的任务，任务依然会继续执行直至完成或自身超时。",
            2,
            "airflow-l10-3",
            ["sla", "sla-miss-behavior"]
        ),
        judge(
            "airflow-c10-e10",
            "使用 Astronomer Cosmos 集成 dbt 时，如果在 dbt 模型中有单张模型执行失败，用户可以在 Airflow 控制台中仅对失败的那张模型执行 Clear 重试，而无需重跑整个 dbt 项目。",
            "正确",
            "这正是 Cosmos 相比传统单块 BashOperator 调用的最大革命性优势之一：细粒度模型映射与单独断点重跑能力。",
            2,
            "airflow-l10-6",
            ["cosmos", "rerun-granularity", "benefits"]
        ),
        fill(
            "airflow-c10-e11",
            "在动态任务映射中，用于声明静态公共参数的方法是 `[BLANK1]()`；用于接收动态列表并自适应展开子任务的方法是 `[BLANK2]()`。",
            [["partial"], ["expand"]],
            "公共参数用 `partial()`，动态展开用 `expand()`。",
            1,
            "airflow-l10-1",
            ["dynamic-task-mapping", "partial", "expand"]
        ),
        fill(
            "airflow-c10-e12",
            "数据交付服务等级协议的英文首字母缩写是 [BLANK1]；将 dbt 项目秒级无损转换为 Airflow 原生细粒度 DAG 拓扑的现代开源框架名称是 Astronomer [BLANK2]。",
            [["SLA"], ["Cosmos", "cosmos"]],
            "服务协议缩写为 SLA，开源框架为 Cosmos。",
            1,
            "airflow-l10-3",
            ["sla", "cosmos"]
        ),
        open_ex(
            "airflow-c10-e13",
            "某跨国电商企业需要设计一条高可靠性的全天核心经营指标链路：\n1. 调度配置：每天早晨 6:00 准时启动，配置 SLA 承诺早晨 8:00 前必须完成并输出到 BI 看板；\n2. 动态并行抽取：上游任务 `discover_market_regions` 动态扫描并返回当天需要处理的海外市场列表（如 `['US', 'UK', 'DE', 'JP']`）；\n3. 动态映射处理：使用 TaskFlow 的动态任务映射（Dynamic Task Mapping / `expand()`），对每个海外市场执行独立的清洗入库；\n4. 规约与汇总：所有海外市场处理完毕后，汇总全部处理数据行数；\n5. 调用 dbt 核心模型：最后使用 Bash 算子触发 `dbt build --select marts.core.*` 生成核心集市表。\n\n请使用 Python 编写出该综合流水线的完整 DAG 代码框架，包含 SLA 配置、动态映射及 dbt 触发编排。",
            '''```python
from datetime import datetime, timedelta
from airflow.decorators import dag, task
from airflow.operators.bash import BashOperator

def on_sla_miss(dag, task_list, blocking_task_list, slas, blocking_tis):
    print(f"【紧急 SLA 告警】核心经营指标链路延误！DAG: {dag.dag_id}, 未按时完成的任务: {[t.task_id for t in task_list]}")

default_args = {
    'owner': 'global_data_team',
    'retries': 2,
    'retry_delay': timedelta(minutes=3),
    'sla': timedelta(hours=2),  # 承诺在启动后 2 小时内（即 8:00 前）必须完成
}

@dag(
    dag_id='global_executive_revenue_pipeline',
    default_args=default_args,
    start_date=datetime(2024, 1, 1),
    schedule='0 6 * * *',  # 每天 6:00 准时点火
    sla_miss_callback=on_sla_miss,
    catchup=False,
    tags=['executive', 'dynamic-mapping', 'dbt']
)
def executive_pipeline():

    # 1. 动态探测当天活跃的海外市场
    @task
    def discover_market_regions() -> list:
        regions = ['US', 'UK', 'DE', 'JP']
        print(f"今日发现活跃出海市场: {regions}")
        return regions

    # 2. 动态任务映射 (每个市场并发独立执行)
    @task
    def ingest_market_data(region_code: str):
        print(f"开始拉取并入库市场: {region_code} 的订单流水...")
        return 25000

    # 3. 规约汇总任务
    @task
    def summarize_global_volume(counts: list) -> int:
        total_volume = sum(counts)
        print(f"全球市场数据入库成功，累计处理记录总数: {total_volume} 行！")
        return total_volume

    # 4. 触发 dbt 核心数仓转换与契约测试
    run_dbt_core_marts = BashOperator(
        task_id='run_dbt_core_marts',
        bash_command='dbt build --select marts.core.* --profiles-dir /home/airflow/.dbt'
    )

    # 编排全局拓扑流转
    active_regions = discover_market_regions()
    ingested_results = ingest_market_data.expand(region_code=active_regions)
    summary_step = summarize_global_volume(ingested_results)

    # 汇总完成后触发 dbt
    summary_step >> run_dbt_core_marts

executive_pipeline()
```''',
            "动态任务映射（Dynamic Task Mapping）、SLA 监控回调与 dbt 跨系统混合编排实战综合考查。",
            [
                {"point": "正确配置 default_args 包含 sla=timedelta(hours=2) 以及在 DAG 中指定 sla_miss_callback", "score": 2},
                {"point": "正确使用 ingest_market_data.expand(region_code=active_regions) 实现动态任务映射与规约汇总", "score": 2},
                {"point": "编写 BashOperator 规范触发 dbt build 并在拓扑中正确连线在汇总任务之后", "score": 1}
            ],
            "配置 sla=timedelta(hours=2) 与 sla_miss_callback；使用 @task 动态扫描并通过 .expand() 自适应展开处理；将规约汇总结果 >> 触发 dbt build 的 BashOperator。",
            4,
            "airflow-l10-7",
            ["dynamic-mapping-coding", "sla-callback", "dbt-integration", "capstone"]
        )
    ]

    return chapter(
        "airflow-c10",
        "airflow-data-engineering",
        10,
        "动态任务映射、SLA 告警与 Airflow + dbt 联合实战",
        "掌握 Airflow 2.3+ 动态任务映射 `partial` 与 `expand` 革命性特性，构建 SLA 超时监控与多渠道告警可观测性体系，深度实践 Airflow 与 dbt 双雄联合架构，落地企业级端到端现代分析工程流水线。",
        lessons,
        exercises
    )
