# -*- coding: utf-8 -*-
"""
Visual and Interactive Diagrams for Apache Airflow Data Engineering (70 lessons).
"""

AIRFLOW_DIAGRAMS = {
    # ── Chapter 1: Airflow 生产架构与现代编排底座 ──
    "airflow-l1-1": """### 痛点对比图解：单机 Linux Crontab 的死穴 vs 现代工作流编排
```
[传统 Linux Crontab: 孤立盲跑、无依赖感知]
0 2 * * * /scripts/extract.py   ──> 若凌晨 2 点抽取脚本失败 (网络断开)，
0 3 * * * /scripts/transform.py ──> 凌晨 3 点转换脚本依然盲目启动，用脏数据污染报表！
0 4 * * * /scripts/report.py    ──> 最终产生灾难性错误，排查只能逐台登录服务器 tail 查看日志。

[现代 Apache Airflow: 基于有向无环图 (DAG) 的拓扑保障]
extract_task ────(只有前序成功才启动)────> transform_task ────────> report_task
      │ (若网络波动失败)
      ▼
自动触发指数退避重试 (Retry)，若重试耗尽则下游自动标记为 upstream_failed，
绝不向下扩散脏数据，同时向飞书/钉钉群推送告警卡片！
```""",

    "airflow-l1-2": """### 核心架构图解：Airflow 五大组件拓扑与调度循环
<Diagram type="airflow-arch" />

```
┌─────────────────────────────────┐
│     Airflow Webserver (UI)      │ ──> 提供 Web 可视化看板、手动触发与日志查看
└────────────────┬────────────────┘
                 │ 读取与展现
                 ▼
┌─────────────────────────────────┐
│  Metadata Database (PostgreSQL) │ ──> 全局唯一状态中心，保存 DAG、TaskInstance、变量与连接
└────────────────┬────────────────┘
                 ▲ 写入待执行状态      ▲ 心跳与状态回写
                 │                    │
┌────────────────┴────────────────┐   │
│    Airflow Scheduler (调度器)   │   │
│ • 解析 DAG 脚本并计算依赖       │   │
│ • 将可运行任务发送给 Executor   │   │
└────────────────┬────────────────┘   │
                 │ 提交任务           │
                 ▼                    │
┌─────────────────────────────────┐   │
│    Executor (Celery / K8s)      │   │
│ • 协调任务执行资源与并发分发    │   │
└────────────────┬────────────────┘   │
                 │ 派发到具体的运行节点
                 ▼                    │
┌─────────────────────────────────┐   │
│  Worker Nodes (工作执行进程)   │ ───┘
│ 真正拉起 Python / Bash 任务代码 │
└─────────────────────────────────┘
```""",

    "airflow-l1-3": """### 拓扑规范图解：有向无环图 (DAG) 依赖与环路检测
<Diagram type="dag-structure" />

```
合法拓扑 (无环):
  extract_users ────┐
                    ├──> clean_users ────> load_to_dw
  extract_orders ───┘
• 存在明确的执行方向 (有向 Directed)
• 不存在任何可能陷入死循环的闭环 (无环 Acyclic)

非法环路 (Cycle):
  task_a ────> task_b ────> task_c
    ▲                         │
    └─────────────────────────┘
调度器检测到死锁依赖，抛出 AirflowDagCycleException 并拒绝上线！
```""",

    "airflow-l1-4": """### 核心状态机图解：TaskInstance 全生命周期演化
<Diagram type="task-lifecycle" />

```
             ┌──────────┐
             │   none   │ 初始无状态
             └────┬─────┘
                  ▼
             ┌──────────┐
             │scheduled │ 上游依赖已满足，调度器生成执行计划
             └────┬─────┘
                  ▼
             ┌──────────┐
             │  queued  │ 任务已进入消息队列 (Redis/RabbitMQ)，等待 Worker 领取
             └────┬─────┘
                  ▼
             ┌──────────┐
             │ running  │ Worker 正在执行具体代码
             └────┬─────┘
                  ├─── 执行成功 ──> [ success ]
                  │
                  └─── 捕获异常 ──> 是否还有重试次数？
                                     ├── 是 ──> [ up_for_retry ] ──(延迟退避)──> 重新 queued
                                     └── 否 ──> [ failed ] ──> 下游标记为 [ upstream_failed ]
```""",

    "airflow-l1-5": """### 调度解析图解：dag_dir_list_interval 与文件解析时序
```
DagFileProcessorProcess (调度器子进程)
      │
      ├── 每隔 dag_dir_list_interval 秒扫描 dags/ 目录下的所有 .py 文件
      ├── 在独立沙箱中执行文件，抓取其中的 dag 实例与任务定义
      ├── 将最新依赖拓扑与 schedule 参数序列化并同步至元数据库 (SerializedDagModel)
      └── Webserver 直接从元数据库读取渲染，避免 Web 进程直接加载 Python 代码造成安全隐患！
```""",

    "airflow-l1-6": """### 容器环境图解：Docker Compose 本地编排架构
```
┌────────────────────────────────────────────────────────┐
│ docker-compose.yaml 容器网络                            │
│                                                        │
│  ┌───────────────┐     ┌───────────────┐               │
│  │   webserver   │     │   scheduler   │               │
│  │  (端口: 8080) │     │  (调度与编译) │               │
│  └───────┬───────┘     └───────┬───────┘               │
│          │                     │                       │
│          ▼                     ▼                       │
│  ┌─────────────────────────────────────┐               │
│  │    postgres:15 (元数据存储)         │               │
│  └─────────────────────────────────────┘               │
│          ▲                     ▲                       │
│          │                     │                       │
│  ┌───────┴───────┐     ┌───────┴───────┐               │
│  │ redis:7 (队列)│ <── │ worker (执行) │               │
│  └───────────────┘     └───────────────┘               │
│  挂载目录: ./dags ➔ /opt/airflow/dags                   │
└────────────────────────────────────────────────────────┘
```""",

    "airflow-l1-7": """### 运维巡检图解：Airflow Web UI 核心视图
```
┌───────────────────┬────────────────────────────────────────────────────────┐
│ 视图名称          │ 核心功能与运维价值                                     │
├───────────────────┼────────────────────────────────────────────────────────┤
│ 1. Grid 视图      │ 以网格形式展示历史运行批次与状态，一眼发现连续失败红块 │
├───────────────────┼────────────────────────────────────────────────────────┤
│ 2. Graph 视图     │ 可视化 DAG 拓扑连线，点击单个 Task 可查看日志或手动重跑│
├───────────────────┼────────────────────────────────────────────────────────┤
│ 3. Gantt 视图     │ 甘特图直观呈现各任务真实耗时与等待时间，精准定位木桶短板│
├───────────────────┼────────────────────────────────────────────────────────┤
│ 4. Admin 菜单     │ 管理 Variables、Connections 凭据与 SLA 未履约记录      │
└───────────────────┴────────────────────────────────────────────────────────┘
```""",

    # ── Chapter 2: DAG 核心规范与定义范式 ──
    "airflow-l2-1": """### 范式对比图解：现代 @dag 装饰器 vs 经典 with 上下文管理器
```
[ 经典上下文范式: with DAG(...) as dag ]
with DAG(dag_id='classic_etl', ...) as dag:
    t1 = BashOperator(task_id='op1', ...)
    t2 = PythonOperator(task_id='op2', ...)
    t1 >> t2

[ 现代 TaskFlow 范式: @dag 与 @task 装饰器 (推荐) ]
@dag(schedule='@daily', start_date=datetime(2024, 1, 1), catchup=False)
def modern_etl():
    @task
    def extract(): return [1, 2, 3]
    @task
    def transform(data): return [x * 2 for x in data]

    raw = extract()
    transform(raw)  <── 纯 Python 函数式调用，依赖自动隐式建立！

modern_etl()
```""",

    "airflow-l2-2": """### 参数继承图解：default_args 向所有 Task 级联传递
```
default_args = {
    'owner': 'data_platform',
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
    'email_on_failure': True,
}

DAG(..., default_args=default_args)
  │
  ├── Task A: 自动继承 3 次重试、5 分钟退避
  ├── Task B: 自动继承 3 次重试、5 分钟退避
  └── Task C: 显式覆盖 retries=0 (非关键任务不重试)
```""",

    "airflow-l2-3": """### 依赖表达图解：链式与网格依赖表达范式
```
1. 线性依赖: task_a >> task_b >> task_c

2. 扇出与扇入 (Fan-out / Fan-in):
                  ┌──> task_b1 ──┐
   task_a >> [task_b1, task_b2] >> task_c: task_a ──┤               ├──> task_c
                  └──> task_b2 ──┘

3. 全连接网格 (cross_downstream):
   cross_downstream([a1, a2], [b1, b2]):
   a1 ──┬──> b1
        └──> b2
   a2 ──┬──> b1
        └──> b2
```""",

    "airflow-l2-4": """### 雪崩陷阱图解：DAG 顶级代码执行陷阱 (Top-Level Code Pitfall)
```
❌ 危险反模式 (在 DAG 文件顶层编写数据库连接或外部 API 请求):
# DAG 顶层作用域
db_conn = create_engine('postgresql://...')  <── 调度器每 30 秒解析一次文件，
data = db_conn.execute("SELECT * ...")       <── 导致数千次连接瞬间打爆生产库！

✅ 正确规范:
所有重型计算、网络 I/O、数据库查询必须封装在 @task 函数内部或 Operator 的 execute() 中，
在顶层只声明纯粹的拓扑结构与元数据！
```""",

    "airflow-l2-5": """### 容错退避图解：指数退避重试与 SLA 监控
<Diagram type="sla-monitoring" />

```
任务执行失败 (网络超时)
        │
        ├── 尝试 1 失败 ──> 等待 2 分钟 (2^1 * delay)
        ├── 尝试 2 失败 ──> 等待 4 分钟 (2^2 * delay)
        ├── 尝试 3 失败 ──> 等待 8 分钟 (2^3 * delay)
        └── 重试机会耗尽 ──> 标记 failed，触发 on_failure_callback 告警！
```""",

    "airflow-l2-6": """### 仓库骨架图解：Airflow 生产级工程目录划分
```
my_airflow_repo/
├── dags/                        <── 仅存放 DAG 拓扑定义文件
│   ├── finance/
│   │   └── daily_revenue_dag.py
│   └── user_growth/
│       └── retention_dag.py
├── plugins/                     <── 自定义 Hooks、Operators 与 Web 界面扩展
│   ├── hooks/
│   └── operators/
├── include/                     <── 辅助脚本、SQL 模版文件、静态配置文件
│   └── sql/
│       └── aggregate_orders.sql
├── tests/                       <── 自动化测试用例
│   └── test_dag_integrity.py   <── 静态检查无环、无语法错误
└── Dockerfile                   <── 基础镜像与生产依赖安装
```""",

    "airflow-l2-7": """### 自动化测试图解：pytest 校验 DAG 拓扑完整性
```
pytest tests/test_dag_integrity.py
       │
       ├── 1. 遍历 dags/ 目录下所有 Python 脚本
       ├── 2. 验证 dagbag.import_errors == {} (零导入异常与语法错误)
       ├── 3. 调用 dag.test_cycle() 确保零死锁循环
       └── 4. 检查所有 DAG 是否设置了明确的 owner 与 retries 参数
```""",

    # ── Chapter 3: 核心算子深度实战与生态集成 ──
    "airflow-l3-1": """### 算子职责分工图解：Operators vs Sensors vs Hooks
```
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ 核心抽象            │ 核心职责与设计原则                                     │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ 1. Operators (算子) │ 执行具体动作：如运行一段 Bash 脚本、执行一条 SQL、拉起 │
│                     │ 一个 Spark 任务。一个任务对应一个具体操作。            │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ 2. Sensors (传感器) │ 阻塞等待外部条件就绪：如探测 S3 是否有文件上传、探测   │
│                     │ 某个上游数据分区是否生成。满足条件后自动放行。         │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ 3. Hooks (连接钩子) │ 底层通信管道：封装特定外部系统的认证、连接池管理与网络 │
│                     │ I/O（如 S3Hook、PostgresHook、SlackHook），供算子复用。│
└─────────────────────┴────────────────────────────────────────────────────────┘
```""",

    "airflow-l3-2": """### 隔离执行图解：BashOperator 环境变量注入与进程沙箱
```
调度器向 Worker 派发任务: BashOperator(bash_command="python sync.py")
                               │
                               ▼
        Worker 拉起一个独立的 Linux 子进程 (Subprocess Sandbox):
        • 注入 Airflow 上下文环境变量 (AIRFLOW_CTX_DAG_ID, AIRFLOW_CTX_EXECUTION_DATE)
        • 执行命令并重定向 stdout/stderr 实时流式写入任务日志
        • 捕获子进程退出码 (Return Code: 0 为成功，非 0 触发重试)
```""",

    "airflow-l3-3": """### 环境隔离图解：PythonVirtualenvOperator 解决依赖冲突
```
生产环境痛点: DAG A 需要 pandas==1.5，DAG B 需要 pandas==2.2，发生不可调和的冲突！

解决方案: PythonVirtualenvOperator:
1. 任务启动时，在 Worker 临时目录动态创建独立的 Python venv
2. pip install requirements=['pandas==2.2.0', 'scikit-learn']
3. 序列化入参并执行目标 Python 函数
4. 捕获返回值并彻底销毁临时虚拟环境，实现 100% 依赖环境物理隔离！
```""",

    "airflow-l3-4": """### TaskFlow 编译图解：@task 装饰器向原生算子转换
```
@task
def compute_metrics(raw_data: list) -> dict:
    return {'count': len(raw_data)}

                 │
                 ▼ Airflow 底层自动将其编译为:
_PythonDecoratedOperator(
    python_callable=compute_metrics,
    multiple_outputs=False,
    do_xcom_push=True,  <── 返回值自动 push 到 XCom
)
```""",

    "airflow-l3-5": """### 传感器模式图解：poke 模式 vs reschedule 模式
```
[ poke 模式 (默认模式): 持续霸占 Worker 槽位 ]
Worker 槽位: [=== 探测等待 (休眠60秒) ===] ➔ [=== 探测等待 ===] ➔ 资源浪费极其严重！

[ reschedule 模式 (推荐生产模式): 探测完毕立即释放槽位 ]
Worker 槽位: [探测1秒:未就绪] ──> 立即释放 Worker 槽位，任务状态置为 up_for_reschedule
                                 调度器休眠 60 秒后，再重新排队入队探测！
• 支持成百上千个传感器并发等待外部数据，绝不耗死集群 Worker 资源！
```""",

    "airflow-l3-6": """### 数据库算子图解：SQLExecuteQueryOperator 与通用 Hooks
```
SQLExecuteQueryOperator(conn_id='postgres_warehouse', sql='CALL proc_daily_etl();')
                             │
                             ▼ 通过 Airflow Connection 模块读取加密凭据
                  PostgresHook (驱动连接池)
                             │
                             ▼ 建立 TLS 安全通道并下推 SQL
                    PostgreSQL / Redshift 云数仓
```""",

    "airflow-l3-7": """### 容器算子图解：KubernetesPodOperator 动态隔离
```
KubernetesPodOperator(image='my_data_pipeline:v2.1', cmds=['python', 'train.py'])
                             │
                             ▼ 调用 K8s API
               动态拉起独立 Pod: k8s-task-instance-pod-998
               • 独立 CPU / 内存 Limit 配额
               • 独立专有 Docker 镜像与系统包
               • 执行完毕后 Pod 自动销毁，元数据回写
```""",

    # ── Chapter 4: Task 内部通信与数据交换哲学 ──
    "airflow-l4-1": """### 核心通信图解：XCom 引用传递 vs 大对象灾难
<Diagram type="xcom-passing" />

```
❌ 反模式 (直接在 XCom 传递 2GB 的 Pandas DataFrame):
Task A ──> 序列化 2GB 字典 ──> 写入元数据库 airflow.xcom 表
──> PostgreSQL 内存打爆、网络卡死、所有并发调度全部陷入僵死！

✅ 正确规范 (引用传递 Pass-by-Reference):
Task A ──> 将 2GB 数据保存至 s3://my-bucket/data/orders_20240301.parquet
       ──> XCom 仅传递字符串 URI 指针: "s3://my-bucket/data/orders_20240301.parquet" (仅50字节!)
Task B ──> 从 XCom 读取 URI 字符串，自行通过 S3Hook 流式拉取处理！
```""",

    "airflow-l4-2": """### 隐式传递图解：TaskFlow API 管道化数据流
```
@task
def step_a() -> str:
    return "s3://bucket/part-0.parquet"

@task
def step_b(path: str):
    print("Processing:", path)

uri = step_a()
step_b(uri)  <── 调度器自动将 uri 识别为 XComArg，隐式建立 step_a >> step_b 依赖！
```""",

    "airflow-l4-3": """### 存储对比图解：XCom 存储限制与开销分析
```
┌──────────────────┬─────────────────┬─────────────────────────────────────────┐
│ 存储后端         │ 传输对象大小    │ 潜在风险与开销                          │
├──────────────────┼─────────────────┼─────────────────────────────────────────┤
│ 默认 PostgreSQL  │ 建议 < 48 KB    │ 超过 1MB 会导致元数据库 I/O 阻塞、备份膨│
│ (元数据库存储)   │ (仅传状态与指针)│ 胀与连接池枯竭                          │
├──────────────────┼─────────────────┼─────────────────────────────────────────┤
│ 对象存储后端     │ 无限制          │ 需配置 AWS S3 / GCS 凭据，底层通过自定义│
│ (S3 / GCS / OSS) │ (可传 GB 级)    │ BaseXCom 拦截器无缝自动序列化上传       │
└──────────────────┴─────────────────┴─────────────────────────────────────────┘
```""",

    "airflow-l4-4": """### 自定义后端图解：Custom XCom Backend 自动拦截
```
编写自定义类: CustomS3XComBackend(BaseXCom)
                      │
                      ├── serialize_value(value):
                      │     若对象体积 > 10KB ──> 自动上传 S3 并返回 s3:// 链接字符串
                      └── deserialize_value(result):
                            若结果为 s3:// 协议 ──> 自动流式下载并反序列化回 Python 对象
开发人员写代码完全无感知，系统底层自动保障元数据库安全！
```""",

    "airflow-l4-5": """### 变量安全图解：Airflow Variables 与 Fernet 加密
```
UI 界面配置变量: Variable.set("secret_token", "abc123456")
                         │
                         ▼
        Fernet 对称加密密钥 (airflow.cfg: fernet_key)
                         │
                         ▼ 密文物理存储于元数据库
        PostgreSQL.variable: "gAAAAABl..."
                         │
                         ▼ 仅在运行时由 Worker 按需解密注入
```""",

    "airflow-l4-6": """### 凭据解耦图解：Connections 与秘密管理器 (Secret Backends)
```
生产环境禁止在 Web UI 手动存密码！使用云原生秘密管理器：
Airflow 调度器请求 connection: 'aws_snowflake_conn'
                         │
                         ▼ 自动路由至外部安全中心
┌────────────────────────────────────────────────────────┐
│ HashiCorp Vault / AWS Secrets Manager / GCP Secret Mgr │
│ 动态返回具备短期时效的访问凭据 (Token / Temp Credentials) │
└────────────────────────────────────────────────────────┘
```""",

    "airflow-l4-7": """### 跨 DAG 触发对比图解：ExternalTaskSensor vs Dataset 触发
```
[ 传统模式: ExternalTaskSensor (轮询等待) ]
DAG_B 中的 Sensor 任务每隔 30 秒轮询元数据库一次，探测 DAG_A 是否成功。
弊端：空耗调度器资源与轮询请求。

[ 现代模式: Dataset 事件驱动触发 (推荐) ]
DAG_A 产出数据后更新: outlets=[Dataset("s3://dw/orders")]
DAG_B 声明以其为调度源: schedule=[Dataset("s3://dw/orders")]
DAG_A 结束瞬间，调度器自动创建 DAG_B 的执行实例，零轮询开销！
```""",

    # ── Chapter 5: 调度机制深度解构 ──
    "airflow-l5-1": """### 核心调度图解：Data Interval [start, end) 与次日调度时间线
<Diagram type="data-interval" />

```
每日批处理调度逻辑心法 (以 2024年3月1日 为例):
• 数据时间区间 (Data Interval): [2024-03-01 00:00, 2024-03-02 00:00)
• 调度触发时间 (Trigger Time):  2024-03-02 00:00:00 (次日凌晨)

核心常识：3月1日整天的业务数据，必须等到 3月1日 最后一秒过完（即 3月2日零点）
才能保证数据完全入库！因此在次日凌晨跑前一天的数据是绝对正确的数学与工程逻辑。
```""",

    "airflow-l5-2": """### 调度参数对比图解：Cron vs Timetable vs Dataset
```
┌─────────────────────┬──────────────────┬─────────────────────────────────────┐
│ 调度方式            │ 典型语法         │ 适用场景                            │
├─────────────────────┼──────────────────┼─────────────────────────────────────┤
│ 1. Cron 表达式      │ "0 2 * * *"      │ 固定周期（每日凌晨两点、每小时一次）│
├─────────────────────┼──────────────────┼─────────────────────────────────────┤
│ 2. 自定义 Timetable │ WorkdayTimetable │ 排除法定节假日、仅工作日执行        │
├─────────────────────┼──────────────────┼─────────────────────────────────────┤
│ 3. Dataset (数据集) │ [my_dataset]     │ 上游数据生产者任务一旦完成立即触发  │
└─────────────────────┴──────────────────┴─────────────────────────────────────┘
```""",

    "airflow-l5-3": """### 回填风暴图解：catchup=True vs False 的历史执行
```
当前系统时间: 2024-03-10，新上线 DAG 设置 start_date=2024-01-01 (相距 70 天)

[ 若配置 catchup=True (未受控的回填风暴): ]
调度器瞬间生成并排队过去 70 天的所有 DAGRuns ──> 数百个任务瞬间并发抢占 Worker，
直接造成数据库雪崩和网络拥堵！

[ 若配置 catchup=False (生产安全默认): ]
调度器忽略过去 70 天的历史区间，仅从当前最新一个周期 (2024-03-09 批次) 开始正常调度。
若需要补历史数据，使用 CLI 命令受控回填！
```""",

    "airflow-l5-4": """### 核心幂等图解：重复重跑与幂等性保障
<Diagram type="idempotency" />

```
非幂等管道 (重复跑导致数据爆炸):
  INSERT INTO dw.fct_sales SELECT * FROM source_table;
  ──> 运行第 1 次: 100 行
  ──> 运行第 2 次 (重跑): 变为 200 行 (严重重复计算，报表翻倍！)

幂等管道 (运行 100 次结果依然完全一致):
  DELETE FROM dw.fct_sales WHERE dt = '{{ ds }}';
  INSERT INTO dw.fct_sales SELECT * FROM source_table WHERE dt = '{{ ds }}';
  ──> 无论因为故障重跑多少次，该日期的行数永远固定精准！
```""",

    "airflow-l5-5": """### 业务日历图解：自定义 Timetable 过滤节假日
```
股市交易日调度器 (TradingDayTimetable):
日历时间轴:  周一 ──── 周二 ──── 周三 ──── 周四(中秋节) ──── 周五 ──── 周六(休市)
调度执行:    执行     执行     执行        跳过             执行       跳过
Timetable 动态查询外部金融日历 API，计算出精准合法的 next_dagrun_info() 数据区间！
```""",

    "airflow-l5-6": """### 生产者消费者图解：Datasets 数据驱动的网状编排
```
[ 生产者 DAG: ingest_orders ]
task_load ──> outlets=[Dataset("s3://lake/orders.parquet")]
                     │
                     ▼ 自动触发监听该 Dataset 的两个独立消费者 DAG：
       ┌─────────────┴─────────────┐
       ▼                           ▼
[ 消费者 1: dbt_build_marts ]  [ 消费者 2: ml_feature_pipeline ]
```""",

    "airflow-l5-7": """### 吞吐调优图解：调度并发参数调节罗盘
```
┌───────────────────────────────┬──────────────────────────────────────────────┐
│ 配置参数                      │ 作用与调优建议                               │
├───────────────────────────────┼──────────────────────────────────────────────┤
│ max_active_runs_per_dag = 3   │ 限制单个 DAG 同时并发运行的实例数，防止堆积  │
│ max_active_tasks_per_dag = 16 │ 限制单个 DAG 内部同时占用的最大 Worker 槽位数│
│ parallelism = 64              │ 整个 Airflow 集群允许同时处于 running 的总数 │
└───────────────────────────────┴──────────────────────────────────────────────┘
```""",

    # ── Chapter 6: 管道容错、SLA 告警与高级触发规则 ──
    "airflow-l6-1": """### 告警流水线图解：on_failure_callback 异常分发
```
任务执行抛出未捕获异常: ValueError("API 响应 500")
                       │
                       ▼ 调度器拦截失败事件
        触发 on_failure_callback(context)
                       │
                       ▼ 提取 context['task_instance'], context['exception']
        格式化飞书 / 钉钉 Markdown 告警卡片:
        • 告警项目: daily_revenue_dag / sync_task
        • 执行批次: 2024-03-01
        • 查看日志直达链接: https://airflow.corp/log?dag_id=...
```""",

    "airflow-l6-2": """### 履约监控图解：SLA 监控与超时告警流转
```
声明任务 SLA: sla=timedelta(hours=2) (要求每天凌晨 2 点前必须产出)
                         │
                         ▼ 凌晨 02:00:01 调度器 SLA 巡检
任务仍在 running 或处于 queued 状态 ──> 判定为 SLA Miss (违背服务等级协议)
                         │
                         ▼
        记录元数据库 sla_miss 表 + 触发 sla_miss_callback
        向数仓值班经理手机发送 PagerDuty 紧急电话/短信！
```""",

    "airflow-l6-3": """### 超时硬杀图解：execution_timeout 释放死锁槽位
```
某 Python 脚本遭遇网络死锁，卡在 socket.read() 挂起 10 小时
                         │
                         ▼ 设定 execution_timeout=timedelta(minutes=30)
调度器检测到运行耗时超过 30 分钟:
1. 向子进程发送 SIGTERM 优雅退出信号；若无响应则发送 SIGKILL 强杀
2. 将该 TaskInstance 标记为 failed，立即释放 Worker 槽位，避免僵尸死锁！
```""",

    "airflow-l6-4": """### 核心触发规则图解：Trigger Rules 动态求值
<Diagram type="trigger-rules" />

```
┌────────────────────────────┬─────────────────────────────────────────────────┐
│ 触发规则 (trigger_rule)    │ 触发条件 (何时允许下游运行)                     │
├────────────────────────────┼─────────────────────────────────────────────────┤
│ all_success (默认)         │ 所有直接上游任务必须全部为 success              │
├────────────────────────────┼─────────────────────────────────────────────────┤
│ none_failed_min_one_success│ 没有任何上游失败，且至少一个上游成功 (允许跳过) │
├────────────────────────────┼─────────────────────────────────────────────────┤
│ all_done                   │ 无论上游是成功还是失败，只要全部执行完毕就运行  │
│                            │ (极其适合最后无论如何都要运行的清理与汇总任务)  │
├────────────────────────────┼─────────────────────────────────────────────────┤
│ one_success                │ 只要有一个上游成功就立即运行，不等待其他上游    │
└────────────────────────────┴─────────────────────────────────────────────────┘
```""",

    "airflow-l6-5": """### 分支路由图解：BranchPythonOperator 条件分支
```
                  ┌──> branch_credit_card ──> charge_card
check_payment ────┤ (未选中的分支自动被标记为 skipped 状态)
                  └──> [branch_alipay] ────> charge_alipay (仅此分支运行)
                               │
                               ▼ 下游汇聚任务需设置 trigger_rule='none_failed_min_one_success'
                          send_receipt (开具发票)
```""",

    "airflow-l6-6": """### 短路拦截图解：ShortCircuitOperator 数据质量守门
```
check_row_count ──(返回 False: 发现源端今日只有 0 行数据!)
      │
      ▼
ShortCircuitOperator 立即短路！
自动将下游所有的 transform_data、load_to_dw、notify 全部标记为 skipped，
优雅终止今日管线，不产生红块报错，也不浪费任何后续计算资源！
```""",

    "airflow-l6-7": """### 状态重置图解：Web 界面 Clear 与状态级联重置
```
某个关键中间任务 task_transform 修复了代码 Bug，需要重跑:
在 UI 界面对 task_transform 点击 [ Clear ]:
• Downstream (级联下游勾选): 自动将所有依赖它的下游任务全部置为 none/scheduled
• Recursive (递归): 自动清空重跑历史重试计数
调度器立即重新排队拉起该任务及其全部下游，实现快速自愈！
```""",

    # ── Chapter 7: 动态任务编排与高级拓扑结构 ──
    "airflow-l7-1": """### 核心动态映射图解：Dynamic Task Mapping 运行时自适应
<Diagram type="dynamic-mapping" />

```
传统静态 DAG:
  代码中必须写死具体的 Task 数量，无法处理每天动态变动的待处理文件列表。

现代动态任务映射 (.expand()):
  get_files() ──> 运行时扫描 S3，返回列表: ['a.csv', 'b.csv', 'c.csv'] (3个文件)
       │
       ▼ process_file.expand(file=files) 运行时自动裂变成 3 个并行实例:
  ┌───────────────────┬───────────────────┬───────────────────┐
  │ process_file [0]  │ process_file [1]  │ process_file [2]  │
  └───────────────────┴───────────────────┴───────────────────┘
       │
       ▼ 下游统一汇聚: summarize(results)
```""",

    "airflow-l7-2": """### 语法矩阵图解：.partial() 与 .expand() 核心语法
```
@task
def resize_image(image_url: str, quality: int, bucket: str): ...

resize_image.partial(quality=85, bucket='prod-cdn').expand(
    image_url=['img1.jpg', 'img2.jpg', 'img3.jpg']
)
• partial(): 传入所有实例共享的静态固定参数
• expand():  传入按列表动态展开映射的动态参数
```""",

    "airflow-l7-3": """### 分布式汇总图解：动态映射的 Map-Reduce 范式
```
               [ Map 阶段: 并发分布式处理 ]
               fetch_user_ids() ──> 产出 10 个批次 ID
                               │
       ┌───────────────┬───────┴───────┬───────────────┐
       ▼               ▼               ▼               ▼
  batch_clean[0]  batch_clean[1]  batch_clean[2] ... batch_clean[9]
       │               │               │               │
       └───────────────┼───────────────┴───────────────┘
                       │
                       ▼ [ Reduce 阶段: 集中汇总 ]
               aggregate_all_metrics(cleaned_data)
```""",

    "airflow-l7-4": """### 模块折叠图解：TaskGroup 任务组视觉分层
```
未做分组 (UI 上混乱的 50 个散乱节点)

使用 TaskGroup 封装:
daily_dag
├── TaskGroup: ingest_group (点击可在 UI 上一键展开/折叠)
│   ├── extract_mysql
│   └── extract_mongo
└── TaskGroup: mart_group
    ├── fct_orders
    └── dim_users
```""",

    "airflow-l7-5": """### 工业工厂图解：动态 DAG 生成 (Dynamic DAG Generation)
```
configs/
├── pipeline_a.yaml
├── pipeline_b.yaml
└── pipeline_c.yaml
       │
       ▼ 单个 generator.py 脚本遍历目录
for config in load_configs():
    dag_id = f"generated_pipeline_{config['name']}"
    globals()[dag_id] = create_dag(config)
以一份模板脚本批量驱动数百个结构相同但参数不同的业务管道！
```""",

    "airflow-l7-6": """### 跨管道通信图解：TriggerDagRunOperator 触发子 DAG
```
[ 核心主数仓 DAG: master_dw_dag ]
build_core_marts ──> TriggerDagRunOperator(
                        trigger_dag_id='marketing_downstream_dag',
                        conf={'batch_id': '20240301'},
                        wait_for_completion=False
                     )
                     ──> 成功解耦核心数据平台团队与下游业务线开发团队！
```""",

    "airflow-l7-7": """### 拓扑治理图解：复杂网状工作流防混乱治理
```
治理军规：
1. 单个 DAG 的 Task 数量尽量控制在 30 个以内，超大规模任务必须拆分为子 DAG
2. 杜绝蜘蛛网式的跨层任意交叉连线，使用虚拟空任务 (EmptyOperator) 统一汇聚收拢
3. 严格禁止在 Task 之间直接通过文件系统本地路径隐式共享数据
```""",

    # ── Chapter 8: 生产环境部署、执行器选型与高可用 ──
    "airflow-l8-1": """### 核心执行器图解：执行器架构选型罗盘
<Diagram type="executor-compare" />

```
┌─────────────────────┬──────────────────┬─────────────────────────────────────┐
│ 执行器类型          │ 并发与扩容能力   │ 优缺点与适用场景                    │
├─────────────────────┼──────────────────┼─────────────────────────────────────┤
│ 1. LocalExecutor    │ 单机多进程       │ 零额外组件依赖，架构极简。适合中小型│
│                     │ (上限由单机核数) │ 企业单机大规格虚拟机部署。          │
├─────────────────────┼──────────────────┼─────────────────────────────────────┤
│ 2. CeleryExecutor   │ 分布式多节点     │ 结合 Redis 队列分发，毫秒级任务响应 │
│                     │ (支持横向加机器) │ 适合成熟企业稳定、高并发数仓调度。  │
├─────────────────────┼──────────────────┼─────────────────────────────────────┤
│ 3. KubernetesExec   │ 弹性容器 Pod     │ 动态拉起独立 Pod，极致环境隔离与弹性│
│                     │ (由 K8s 集群调度)│ 适合有波峰波谷的大算力、容器化集群。│
└─────────────────────┴──────────────────┴─────────────────────────────────────┘
```""",

    "airflow-l8-2": """### 集群架构图解：CeleryExecutor 高可用集群架构
```
                ┌─────────────────────────────────┐
                │        Airflow Scheduler        │
                └────────────────┬────────────────┘
                                 │ 任务状态写入元数据库，并将任务 payload 推入队列
                                 ▼
                ┌─────────────────────────────────┐
                │   Redis / RabbitMQ (消息队列)   │
                └────────────────┬────────────────┘
                                 │ 分发任务
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Celery Worker 01 │    │ Celery Worker 02 │    │ Celery Worker 03 │
│ 8个并发进程池     │    │ 8个并发进程池     │    │ 8个并发进程池     │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```""",

    "airflow-l8-3": """### 云原生调度图解：KubernetesExecutor 动态 Pod 时序
```
1. 调度器生成任务 ──> 调用 K8s API: client.create_namespaced_pod(...)
2. K8s 集群调度并在空闲节点上拉起专属 Pod: airflow-task-instance-4567
3. Pod 挂载数据卷与密钥，执行 Python 算子代码
4. 任务执行完成 ➔ 将结果与退出码写入元数据库 ➔ K8s Pod 自动退出并回收 CPU/内存
```""",

    "airflow-l8-4": """### 混合架构图解：CeleryKubernetesExecutor 优势互补
```
调度器接收到任务
        │
        ├── 简单轻量任务 (queue='celery'):
        │   ──> 发往常驻 Celery Worker，零延迟极速执行
        │
        └── 重型算力/隔离任务 (queue='kubernetes'):
            ──> 动态向 K8s 申请专用 Pod，按需弹性申请 64GB 内存与 GPU！
```""",

    "airflow-l8-5": """### 连接池治理图解：PostgreSQL 与 PgBouncer 代理
```
数百个并发 Worker 进程频繁建立短连接 ──> 直接耗尽 PostgreSQL max_connections！
                               │
                               ▼ 引入连接池代理
┌────────────────────────────────────────────────────────┐
│ Worker 进程池 ──> PgBouncer (事务级连接池复用) ──> PG 库 │
└────────────────────────────────────────────────────────┘
保证数千个任务高并发冲击下，底层元数据库连接数始终稳定在安全阈值以内！
```""",

    "airflow-l8-6": """### 无主高可用图解：Multi-Scheduler HA 分布式调度
```
┌─────────────────────────┐           ┌─────────────────────────┐
│  Scheduler 节点 A (主备) │           │  Scheduler 节点 B (主备) │
└────────────┬────────────┘           └────────────┬────────────┘
             │                                     │
             └──────────────────┬──────────────────┘
                                │ 利用 PostgreSQL 行级锁 (SELECT ... FOR UPDATE)
                                ▼ 互斥领取待调度任务
               ┌─────────────────────────────────┐
               │    PostgreSQL Metadata DB       │
               └─────────────────────────────────┘
零单点故障 (No SPOF)：任何一台调度器宕机，另一台立即自动承接全部调度流量！
```""",

    "airflow-l8-7": """### 权限控制图解：RBAC 角色权限矩阵与安全审计
```
┌─────────────┬────────────────────────────────────────────────────────┐
│ 角色        │ 权限矩阵                                               │
├─────────────┼────────────────────────────────────────────────────────┤
│ Admin       │ 拥有全部权限，可配置全局 Variables 与凭据 Connections  │
├─────────────┼────────────────────────────────────────────────────────┤
│ Op (运维)   │ 允许触发、Clear、暂停 DAG，但不可查看生产敏感密码      │
├─────────────┼────────────────────────────────────────────────────────┤
│ User (开发) │ 仅可查看和操作自己团队归属的项目 DAG (按 Tag 权限过滤) │
├─────────────┼────────────────────────────────────────────────────────┤
│ Viewer (只读│ 仅能查看任务运行状态看板与日志，禁止任何写入与重跑操作 │
└─────────────┴────────────────────────────────────────────────────────┘
```""",

    # ── Chapter 9: 现代端到端联合编排实战 ──
    "airflow-l9-1": """### 核心联合图解：Airflow + dbt Cosmos 细粒度任务映射
<Diagram type="airflow-dbt-cosmos" />

```
传统粗暴模式 (BashOperator 单块黑盒):
  Airflow 任务: bash_command="dbt build"
  ──> 运行 20 分钟，若最后一个模型失败，整个大任务红牌报错！
  ──> 无法在 Airflow UI 上精确定位到底哪张表失败，重跑必须全量重新计算！

现代 Cosmos 映射模式:
  Airflow 原生解析 dbt 编译产物，自动将每个 dbt 模型生成独立 Task:
  stg_orders ──> stg_payments ──> fct_orders ──> test_fct_orders_unique
  • 精准定位：哪张表测试不通过，对应单节点变红
  • 细粒度重跑：只需在 Airflow Web UI 单独 Clear 失败模型，上游无需重跑！
```""",

    "airflow-l9-2": """### 架构映射图解：Astronomer Cosmos 框架内部机制
```
dbt 项目源码 (models/*.sql)
            │
            ▼ [ Cosmos 静态解析 manifest.json ]
Airflow DbtDag / DbtTaskGroup 自动转换:
• 每个 dbt model 映射为一个 Airflow ModelTask
• 每个 dbt test 映射为一个 Airflow TestTask
• 自动保持与 dbt 完全一致的 DAG 拓扑依赖！
```""",

    "airflow-l9-3": """### 过滤调度图解：Cosmos 模型选择器 (Selectors)
```
DbtTaskGroup(
    group_id='marts_core',
    select='tag:daily and path:marts/core',
    exclude='tag:hourly'
)
按标签与目录精准切分：将庞大的企业数仓项目按业务线拆分成不同的调度频率组！
```""",

    "airflow-l9-4": """### 端到端闭环图解：感知 ➔ 转换 ➔ 报表预热全流程
```
┌─────────────────────┐
│ 1. 传感器感知阶段   │ 探测到源端 MySQL 凌晨分库备份已完成
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 2. dbt Cosmos 阶段  │ 自动按序物化 Staging ➔ Intermediate ➔ Marts 宽表，
└──────────┬──────────┘ 并在落盘后立即执行 unique / not_null 质量门禁拦截
           ▼
┌─────────────────────┐
│ 3. 报表与激活阶段   │ 调用 Metabase API 预热缓存大屏，
└─────────────────────┘ 通过 Hightouch 将流失预警用户推入企业微信回访！
```""",

    "airflow-l9-5": """### 门禁阻断图解：dbt test 失败阻断下游任务
```
fct_orders (构建成功) ──> test_orders_unique (检测到主键冲突，返回 1 行!)
                               │
                               ▼ 发生 FAIL 报错
下游报表刷新任务 (refresh_bi_dashboard) 自动置为 upstream_failed！
绝对不把含主键重复的脏数据开放给管理层看板！
```""",

    "airflow-l9-6": """### 事件驱动图解：Kafka / Webhook 驱动的事件触发
```
外部业务系统完成月末账单封账
           │
           ▼ 发送 HTTP POST 请求至 Airflow REST API:
/api/v1/dags/monthly_accounting_dag/dagRuns
           │
           ▼ 传递运行时 JSON 参数: {"month": "2024-02", "operator": "finance"}
Airflow 调度器实时响应事件，瞬间拉起该 DAG 开始处理！
```""",

    "airflow-l9-7": """### Monorepo 图解：生产级 Airflow + dbt 统一工程骨架
```
enterprise_data_platform/
├── dags/                        <── Airflow 编排调度流
│   └── cosmos_marts_dag.py
├── dbt_project/                 <── 纯净的 dbt 建模工程
│   ├── dbt_project.yml
│   └── models/
├── plugins/
├── docker/
└── .github/workflows/           <── 统一 CI/CD 流水线
```""",

    # ── Chapter 10: 管道排障、性能调优与可观测性生产治理 ──
    "airflow-l10-1": """### 故障排查图解：僵死任务 (Zombie Tasks) 与 Worker OOM 诊断
```
任务处于 running 状态但日志突然停止更新超过 30 分钟？

排查路径:
1. 查看 Linux 内核日志: dmesg -T | grep -i oom
   ──> 若输出 "Killed process (python)"，证实 Worker 内存被大 DataFrame 撑爆！
2. 调度器心跳探针 (Zombie Detection):
   ──> 调度器发现元数据库中任务标记为 running，但对应的 Worker 进程已不在心跳列表中，
       自动将其打标为 failed 并根据配置触发重试。
```""",

    "airflow-l10-2": """### 核心幂等图解：数据管道幂等性设计规范
<Diagram type="idempotency" />

```
生产黄金幂等范式三步法:
1. 准备临时表: CREATE TEMPORARY TABLE staging_tmp AS ...
2. 执行业务清洗与去重校验
3. 原子替换目标分区:
   INSERT OVERWRITE TABLE marts.sales PARTITION (dt = '2024-03-01')
   SELECT * FROM staging_tmp;
• 无论管道由于断电、网络超时或手动重复重跑多少次，最终结果 100% 精确如一！
```""",

    "airflow-l10-3": """### 延迟定位图解：调度延迟瓶颈排查全流程
```
任务出现 Scheduling Delay (从计划时间到真正开始跑延迟了 10 分钟？)
                        │
                        ▼ 检查以下三处瓶颈
┌─────────────────────────────────┬─────────────────────────────────┐
│ 检查项                          │ 治理方案                        │
├─────────────────────────────────┼─────────────────────────────────┤
│ 1. DAG 文件解析耗时 > 2 秒      │ 检查顶层作用域是否有网络请求    │
│ 2. Worker 并发槽位全部占满      │ 调大 worker_concurrency 或加机器│
│ 3. 消息队列堆积 (Redis 队列过长)│ 检查是否有重型任务长时阻塞      │
└─────────────────────────────────┴─────────────────────────────────┘
```""",

    "airflow-l10-4": """### 可观测性大屏图解：Prometheus + Grafana 监控体系
```
Airflow Scheduler (开启 StatsD 指标导出)
                 │
                 ▼ statsd-exporter 转换为 Prometheus 指标格式
Prometheus Server (时序采集数据库)
                 │
                 ▼ Grafana 大屏展示核心指标:
• airflow.scheduler.heartbeat_latency (调度器心跳健康度)
• airflow.dagrun.duration.success (各 DAG 历史耗时趋势)
• airflow.executor.queued_tasks / open_slots (队列拥堵度与空闲槽位)
```""",

    "airflow-l10-5": """### 日志归档图解：集中式日志存储与快速检索
```
Worker 执行任务 ──> 流式将 stdout 输出写入本地临时日志
                       │
                       ▼ 任务结束触发 Remote Logging
上传至云对象存储: s3://my-airflow-logs/dag_id/task_id/execution_date/attempt_1.log
                       │
                       ▼
Webserver 界面直接通过预签名 URL 实时在线拉取，无需登录任何一台底层服务器！
```""",

    "airflow-l10-6": """### 元数据维护图解：airflow db clean 定期归档维护
```
元数据库运行 2 年后产生数千万行历史 TaskInstance 导致调度极其卡顿？

建立每周日凌晨的定期维护维护 DAG:
airflow db clean --clean-before-timestamp '2023-01-01' --tables task_instance,dag_run,xcom
• 物理清理过期历史运行记录
• 执行 VACUUM ANALYZE 重建索引，元数据库性能瞬间满血复活！
```""",

    "airflow-l10-7": """### 生产军规图解：数据管道 SLA 生产就绪度十条军规
```
┌────────────────────────────────────────────────────────┐
│ 生产就绪度 CheckList (上线前必过):                     │
│ 1. [ ] catchup 明确设为 False，严防上线触发历史回填风暴 │
│ 2. [ ] 顶层作用域绝对零数据库/外部网络请求             │
│ 3. [ ] 关键数据抽取设置了 retries=3 与指数退避        │
│ 4. [ ] 写入逻辑严格遵循分区覆盖或 MERGE 幂等设计       │
│ 5. [ ] 传感器必须采用 mode='reschedule' 释放 Worker    │
│ 6. [ ] XCom 绝不传递大对象，统一使用 URI 引用传递      │
│ 7. [ ] 配置了 on_failure_callback 与告警机器人通知     │
│ 8. [ ] 所有任务均设置了 execution_timeout 超时硬杀保护 │
│ 9. [ ] 核心模型接入了 dbt test 质量断言门禁            │
│ 10.[ ] CI/CD 流水线中集成了 pytest 拓扑无环静态检查    │
└────────────────────────────────────────────────────────┘
```"""
}
