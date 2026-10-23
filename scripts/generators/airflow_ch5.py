# -*- coding: utf-8 -*-
"""Chapter 5: 任务通信 XCom 机制与大对象陷阱"""

from common import (
    lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter
)

def get_chapter_5():
    lessons = [
        lesson(
            "airflow-l5-1",
            "XCom 的本质：基于元数据库跨任务交换的“小纸条”",
            """### 分布式系统中的“孤岛任务”困境

在 Airflow 分布式集群中（例如使用 CeleryExecutor 或 KubernetesExecutor）：
- 任务 A 可能在 Worker-1 虚拟机的进程里运行；
- 任务 B 可能在 Worker-2 虚拟机的容器里运行。
由于各个任务在物理空间和进程内存上是**完全隔离的**，任务 A 内存中的变量，任务 B 根本无法直接访问！

为了解决任务间状态与元数据的共享问题，Airflow 设计了 **XCom（Cross-Communication，跨任务通信机制）**。

```
 Worker 1 (任务 A: extract)                Worker 2 (任务 B: train)
 ┌──────────────────────┐                 ┌──────────────────────┐
 │ 生成模型版本号: v2.1  │                 │ 需要获取上游版本号   │
 └──────────┬───────────┘                 └──────────▲───────────┘
            │ xcom_push                              │ xcom_pull
            ▼                                        │
     ┌───────────────────────────────────────────────────────┐
     │           Airflow 元数据数据库 (xcom 数据表)           │
     │ 包含字段: dag_id, task_id, execution_date, key, value│
     └───────────────────────────────────────────────────────┘
```

---

### XCom 的底层本质：“小纸条”通信

XCom 在底层不过是**元数据库（PostgreSQL/MySQL）中的一张普通数据表**（名为 `xcom`）。
- 当任务 A 执行 `xcom_push` 时，本质上是在数据库的 `xcom` 表里执行了一条 `INSERT`；
- 当任务 B 执行 `xcom_pull` 时，本质上是在数据库的 `xcom` 表里执行了一条 `SELECT WHERE dag_id=... AND task_id=...`。

因为所有的数据都需要经过 JSON 序列化并存入关系型数据库的文本列，所以 **XCom 的设计初衷仅仅是充当任务间传递轻量级元数据的“小纸条”**（如文件路径、状态标识、生成的日期分区、行数统计），而绝不能当作大数据集缓存池！
""",
            difficulty=1,
            tips="记住 XCom 的定位：它是用来传‘小纸条’（元数据、指针、状态）的，绝对不是用来传‘货柜集装箱’（海量业务数据）的！"
        ),
        lesson(
            "airflow-l5-2",
            "底层 API：`xcom_push` 与 `xcom_pull` 的精确寻址机制",
            """### 深入传统 XCom API 的精确寻址

在不使用 TaskFlow API 或者需要进行精细化跨任务寻址时，我们需要直接调用底层的 `xcom_push` 与 `xcom_pull` 方法。

---

### 1. `xcom_push`：发送小纸条
任务实例（TaskInstance）提供了推送方法：
```python
def push_metadata(**context):
    ti = context['task_instance']
    
    # 显式推送自定义 Key
    ti.xcom_push(key='model_version', value='v1.4.2')
    ti.xcom_push(key='training_loss', value=0.035)
    
    # 函数的 return 返回值，会被 Airflow 默认自动以 key='return_value' 推送！
    return 10000
```

---

### 2. `xcom_pull`：精确提取小纸条
下游任务可以通过指定 `task_ids` 和 `key` 进行精确定位：

```python
def pull_metadata(**context):
    ti = context['task_instance']
    
    # 1. 提取上游任务默认的 return_value
    rows = ti.xcom_pull(task_ids='push_task')
    
    # 2. 按指定 key 精确提取
    version = ti.xcom_pull(task_ids='push_task', key='model_version')
    loss = ti.xcom_pull(task_ids='push_task', key='training_loss')
    
    print(f"收到上游模型版本: {version}, 训练损失: {loss}, 样本数: {rows}")
    
    # 3. 跨多个上游任务批量拉取
    results = ti.xcom_pull(task_ids=['task_a', 'task_b'])
```

#### 寻址约束：
默认情况下，`xcom_pull` 只会查找**属于同一个 DAG、同一个批次执行时间（logical_date / execution_date）**的 XCom 记录。如果需要跨批次或跨 DAG 拉取，需要额外指定 `dag_id` 与时间范围参数。
""",
            difficulty=2,
            tips="牢记默认机制：Python 函数的 `return` 值会自动存为 `key='return_value'`；因此在下游使用 `ti.xcom_pull(task_ids='upstream_task')` 默认拉取的就是其返回值。"
        ),
        lesson(
            "airflow-l5-3",
            "致命反模式：使用 XCom 传递大规模 Pandas DataFrame 与内存打爆事故",
            """### 生产事故警示：XCom 大对象陷阱

初入数据工程领域的开发者，很容易把 Python 单机思维带入 Airflow：
“既然 `@task` 能够自动传递参数，那我为什么不能在任务 A 读取 500 万行数据的 Pandas DataFrame，然后直接 `return df` 传给任务 B 呢？”

#### 这种做法在生产中会引发连环核弹级灾难！

```
 [致命操作]: @task def load(): return pandas_df (500 万行, 占用 2GB 内存)
      │
      ▼ (Airflow 尝试将 2GB 的 DataFrame 序列化转为 JSON 字符串)
 ┌────────────────────────────────────────────────────────┐
 │ 灾难 1: Worker 进程内存暴涨 3~5 倍，直接触发 OOM 崩溃    │
 └───────────────────────────┬────────────────────────────┘
                             │ (如果 Worker 勉强没崩，将 2GB 文本写入数据库)
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ 灾难 2: PostgreSQL 元数据库磁盘 IO 打满，连接池挂起死锁  │
 │ 灾难 3: 元数据库急剧膨胀，全公司所有 Airflow 调度瘫痪    │
 └────────────────────────────────────────────────────────┘
```

---

### 各大数据库对 XCom 字段的物理限制

Airflow 元数据库的 `xcom` 表中的 `value` 字段：
- **SQLite**：通常限制约 2GB（但极其脆弱）；
- **MySQL**：如果字段定义为 `BLOB`，最大限制仅为 **64 KB**！超过立刻抛出 `DataError: Data too long for column` 异常；
- **PostgreSQL**：虽然底层 `bytea` 支持到 1GB，但一旦插入数百兆的序列化字符串，PostgreSQL 的 WAL 日志和 autovacuum 机制将被彻底击穿。

#### 黄金准则（The Iron Rule）：
**永远不要在 XCom 中传递任何数据量超过几 KB 的对象！严禁传递 Pandas DataFrame、Spark RDD、大字典大列表或原始文件二进制流！**
""",
            difficulty=2,
            tips="把这句话刻在脑子里：XCom 传递上限建议在 48KB 以内；一旦发现自己在 return 一个 DataFrame，请立刻敲响警钟！"
        ),
        lesson(
            "airflow-l5-4",
            "元数据库限制与排障：PostgreSQL 字节限制、序列化异常与垃圾回收",
            """### XCom 序列化黑盒与经典排障

Airflow 在将 XCom 推送到数据库时，默认使用 **JSON 序列化器**。这引入了一系列开发者必须掌握的运行期约束：

---

### 1. 经典报错：`TypeError: Object of type ... is not JSON serializable`
如果你尝试返回不可 JSON 序列化的复杂 Python 原生对象（例如：打开的文件句柄 `file`、未转换的自定义 Python Class 对象、未格式化的原生 `datetime` 或 `numpy.ndarray`）：
Airflow 会在任务执行完毕即将退出的最后一刻抛出 `TypeError` 崩溃！

#### 解决方案：
- 确保返回的对象是原生基础类型（`int`, `float`, `str`, `dict`, `list`, `bool`）；
- 如果涉及时间对象，显式转换为 ISO 8601 字符串：`dt.isoformat()`；
- 如果涉及 NumPy 数组，显式转换为列表：`arr.tolist()`。

---

### 2. 数据库膨胀与垃圾回收（XCom Bloat）

在一个中大型企业集群中：
- 每天运行 5000 个任务实例，每个任务即便只产生 5KB 的 XCom 数据；
- 一年累计下来将生成近 200 万行 XCom 记录，占用数十 GB 空间；
- 如果历史 XCom 长期未被清理，PostgreSQL 在执行调度器查询时由于缺少有效过滤索引，会导致查询响应从 5 毫秒飙升到数秒，拖垮整个调度系统的响应效率。

因此，建立定期的 XCom 垃圾回收作业（Housekeeping Job）是运维生产 Airflow 集群的核心必修课。
""",
            difficulty=2,
            tips="不可序列化对象的报错往往发生在函数的 return 语句之后。遇到此类报错，逐一检查函数返回字典中的字段类型是否为基础 JSON 类型！"
        ),
        lesson(
            "airflow-l5-5",
            "自定义 XCom 后端（Custom XCom Backend）：将元数据桥接至 S3 / GCS",
            """### 解放元数据库：什么是 Custom XCom Backend？

如果我们既想享受 TaskFlow API 自由传递复杂对象（如大字典、特征数组）的丝滑体验，又坚决不能把大对象存入 PostgreSQL 元数据库，该如何破局？

Airflow 提供了架构级的解耦方案：**自定义 XCom 后端（Custom XCom Backend）**！

```
 任务 A: return large_result
      │
      ▼ (Airflow 拦截该返回值)
 ┌────────────────────────────────────────────────────────┐
 │ Custom XCom Backend (如 GCSXComBackend / S3XComBackend)│
 │ 1. 自动将实际数据写入对象存储: s3://my-bucket/xcom/uuid│
 │ 2. 仅向 PostgreSQL 元数据库写入该 S3 URI 字符串引用！    │
 └────────────────────────────────────────────────────────┘
                              │
               ┌──────────────┴──────────────┐
               ▼ (下游任务执行 xcom_pull)    ▼
 从元数据库读取 S3 URI 引用 ──> 自动从 S3 下载并反序列化回内存对象！
 对用户代码 100% 透明！
```

---

### 如何配置使用 S3 / GCS 作为 XCom 后端？

在 `airflow.cfg`（或通过环境变量）配置后置类：

```ini
[core]
xcom_backend = airflow.providers.amazon.aws.transfers.base.S3XComBackend
```

#### 自定义过滤逻辑（仅对大对象使用 S3）：
你也可以自己继承 `BaseXCom`，实现大小自适应分流：
```python
from airflow.models.xcom import BaseXCom
import json

class SmartS3XComBackend(BaseXCom):
    @staticmethod
    def serialize_value(value):
        raw_bytes = json.dumps(value).encode('utf-8')
        if len(raw_bytes) > 48 * 1024:  # 超过 48KB 自动转存 S3
            s3_path = upload_to_s3(raw_bytes)
            return super(SmartS3XComBackend, SmartS3XComBackend).serialize_value({"_s3_ref": s3_path})
        return super(SmartS3XComBackend, SmartS3XComBackend).serialize_value(value)
```
通过这种方案，元数据库彻底摆脱大对象污染，同时开发者的代码逻辑完全保持不变！
""",
            difficulty=3,
            tips="Custom XCom Backend 是企业级 Airflow 架构演进的关键一环，让大厂数据管道在保持代码优雅的同时拥有无限的扩展弹性！"
        ),
        lesson(
            "airflow-l5-6",
            "生产级安全传递法则：传递“对象存储指针 / 表名”而非“数据本身”",
            """### 现代数据工程的黄金传输法则：传递指针（Passing References）

在没有配置 Custom XCom Backend 的通用标准环境中，**工业级生产数据管道究竟该如何安全传递大规模数据？**

答案是：**“传递指针，不传数据”（Pass the Reference, Not the Data）！**

```
 ❌ [反模式：传递数据实体]
 Task A ──[100 万行 DataFrame JSON]──> XCom (Postgres) ──> Task B (内存爆裂)

 ✅ [生产级黄金模式：传递对象指针]
 Task A ──(写入 Parquet)──> S3 / GCS 数据湖 / Snowflake 物理表
   │
   └──[传递路径字符串: 's3://lake/orders/20240101.parquet']──> XCom
                                                                │
 Task B <───────────────────────────────────────────────────────┘
   │
   └──(根据指针只读加载或通过 SQL COPY 高速执行)
```

---

### 实战代码对比演示

#### 规范生产代码：
```python
from airflow.decorators import task

@task
def extract_and_dump_to_lake(ds=None) -> str:
    # 1. 抽取海量数据并在本地处理
    destination_uri = f"s3://my-company-lake/staging/orders_{ds}.parquet"
    
    # 2. 将数据以列存 Parquet 格式直接流式写入 S3 / 本地分布式存储
    # dump_to_parquet(large_dataset, destination_uri)
    print(f"数据已安全持久化写入: {destination_uri}")
    
    # 3. XCom 仅仅返回目标存储路径（轻量字符串，仅几十字节！）
    return destination_uri

@task
def load_parquet_into_dw(s3_pointer: str):
    # 下游拿到指针，直接调用数仓高速加载协议（如 COPY INTO）
    print(f"从指定路径加载数据到数仓: {s3_pointer}")
```
无论底层数据量是 100 行、1000 万行还是 10 亿行，流经 XCom 的永远只是一行几十字节的轻量字符串指针！
系统获得了绝对的稳定性与极高的吞吐能力！
""",
            difficulty=2,
            tips="永远牢记数据工程通信口诀：‘大货走水运（对象存储/分布式表），信使只送信（XCom 传 URI 指针）’！"
        ),
        lesson(
            "airflow-l5-7",
            "XCom 清理与维护作业：自动化元数据瘦身最佳实践",
            """### 生产集群的“排毒清道夫”：XCom 自动清理

即使大家都遵守了“传递指针”的规范，随着业务 DAG 数量的爆发式增长，每天成千上万个任务依然会产生海量常规小记录。
元数据库的 `xcom` 表如果三年不清理，会导致备份变慢、数据库索引性能退化。

---

### 编写专门的维护 DAG（Maintenance DAG）

在大型团队中，基础设施团队通常会配置一个每周运行一次的运维 DAG，专门清理超过保留期（如 30 天以前）的历史 XCom 数据：

```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.utils.db import provide_session
from airflow.models.xcom import XCom
from datetime import datetime, timedelta

default_args = {'owner': 'infra_admin'}

@provide_session
def cleanup_old_xcoms(session=None, **context):
    # 保留期设为过去 30 天
    retention_days = 30
    cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
    
    # 查询并删除早于 cutoff_date 的历史 XCom 记录
    deleted_rows = session.query(XCom).filter(XCom.timestamp < cutoff_date).delete()
    session.commit()
    print(f"历史 XCom 瘦身完成，累计安全清理过期记录: {deleted_rows} 行！")

with DAG(
    dag_id='airflow_system_xcom_cleanup',
    default_args=default_args,
    schedule='@weekly',
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=['admin', 'maintenance']
) as dag:

    clean_step = PythonOperator(
        task_id='cleanup_old_xcom_records',
        python_callable=cleanup_old_xcoms
    )
```

通过自动化清理任务，Airflow 元数据库始终保持轻盈健康，保障调度系统长期稳定运行。
""",
            difficulty=2,
            tips="定期清理历史 XCom 和 TaskInstance 运行日志，是保障 Airflow 集群 7x24 小时高可用运转不可或缺的运维底线。"
        )
    ]

    exercises = [
        single_choice(
            "airflow-c5-e1",
            "关于 Airflow 任务间通信机制 XCom 的本质与底层存储载体，下列说法正确的是：",
            [
                {"label": "XCom 是存放在各个 Worker 节点的物理本地内存中的共享内存队列", "value": "A"},
                {"label": "XCom 的底层本质是存储在 Airflow 元数据库（如 PostgreSQL/MySQL）中的一张数据表", "value": "B"},
                {"label": "XCom 会将所有数据自动上传到公共 GitHub 仓库中托管", "value": "C"},
                {"label": "XCom 只能在同一个任务实例内部读写，不能跨任务访问", "value": "D"}
            ],
            "B",
            "XCom（Cross-Communication）底层存储在 Airflow 元数据数据库的 `xcom` 表中，通过数据库读写实现分布式跨进程通信。",
            1,
            "airflow-l5-1",
            ["xcom", "metadata-database", "architecture"]
        ),
        single_choice(
            "airflow-c5-e2",
            "在自定义 Python 函数中，函数的普通 `return` 返回值，会被 Airflow 默认以哪个键名（key）自动存入 XCom？",
            [
                {"label": "default_key", "value": "A"},
                {"label": "return_value", "value": "B"},
                {"label": "output_data", "value": "C"},
                {"label": "system_res", "value": "D"}
            ],
            "B",
            "Airflow 默认将 Python 函数的返回值自动打包写入 XCom，默认的键名统一为 `return_value`。",
            1,
            "airflow-l5-2",
            ["return_value", "xcom_push", "defaults"]
        ),
        single_choice(
            "airflow-c5-e3",
            "某初学者在 `@task` 函数中直接 `return` 了一个包含 500 万行记录的 Pandas DataFrame，最直接且高频引发的系统灾难是：",
            [
                {"label": "Worker 序列化时内存暴涨触发 OOM 崩溃，且海量数据冲击元数据库导致调度延迟卡死", "value": "A"},
                {"label": "Airflow 会自动将 Pandas DataFrame 编译为 C 语言并在 1 秒内完成计算", "value": "B"},
                {"label": "系统会自动为每个开发者发放现金红包奖励", "value": "C"},
                {"label": "所有上游任务都会被强制自动删除", "value": "D"}
            ],
            "A",
            "在 XCom 中传递大对象属于极度危险的反模式：JSON 序列化会消耗数倍内存导致 Worker OOM，同时大体积文本会导致元数据库 IO 饱和甚至连接挂死。",
            2,
            "airflow-l5-3",
            ["xcom-anti-patterns", "oom", "database-bloat"]
        ),
        single_choice(
            "airflow-c5-e4",
            "在工业级数据管道开发中，当上游任务产出海量数据需要交给下游任务消费时，官方推荐的“黄金传递法则”是：",
            [
                {"label": "将全部海量数据转换为 Base64 字符串硬塞入 XCom", "value": "A"},
                {"label": "传递数据本身的副本，每个任务各存一份", "value": "B"},
                {"label": "传递存储指针（如 S3 对象存储路径或数据库物理表名），数据本身持久化存放在专门的存储介质中", "value": "C"},
                {"label": "将海量数据直接打印到标准输出控制台日志中供下游解析", "value": "D"}
            ],
            "C",
            "黄金法则是“传递指针而非数据本身（Pass the Reference, Not the Data）”：数据写入 S3/数仓，XCom 仅流转轻量的文件 URI 或表名字符串。",
            1,
            "airflow-l5-6",
            ["pass-by-reference", "best-practices", "storage-pointers"]
        ),
        multiple_choice(
            "airflow-c5-e5",
            "在默认情况下，下列哪些 Python 数据类型能够被 Airflow 安全直接进行 JSON 序列化并存入 XCom？",
            [
                {"label": "基础整数（int）、浮点数（float）与字符串（str）", "value": "A"},
                {"label": "结构只包含基本类型的字典（dict）与列表（list）", "value": "B"},
                {"label": "Python 原生打开的本地文件句柄对象（如 `open('file.txt')`）", "value": "C"},
                {"label": "未定义自定义序列化器的第三方复数类型或数据库游标（Cursor）", "value": "D"}
            ],
            ["A", "B"],
            "A、B 属于标准 JSON 序列化类型。C（文件句柄）和 D（游标对象）均无法直接 JSON 序列化，会导致任务在退出时报 TypeError 崩溃。",
            2,
            "airflow-l5-4",
            ["serialization", "json", "type-safety"]
        ),
        multiple_choice(
            "airflow-c5-e6",
            "关于自定义 XCom 后端（Custom XCom Backend），下列描述正确的有：",
            [
                {"label": "允许将实际的 XCom 大数据自动卸载到外部对象存储（如 AWS S3 或 Google Cloud Storage）", "value": "A"},
                {"label": "在元数据库的 `xcom` 表中仅保存外部存储路径的轻量引用", "value": "B"},
                {"label": "在下游任务调用 `xcom_pull` 时，系统底层会自动透明地从外部存储下载并反序列化", "value": "C"},
                {"label": "完全不需要任何存储系统，直接将数据永久缓存在空气中", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 展现了 Custom XCom Backend 架构级解耦的核心机制。D 为荒谬言论。",
            2,
            "airflow-l5-5",
            ["custom-xcom-backend", "s3", "gcs"]
        ),
        multiple_choice(
            "airflow-c5-e7",
            "在长期高并发运转的 Airflow 生产集群中，为了防止元数据库膨胀导致调度变慢，应采取的维护治理措施包括：",
            [
                {"label": "编写定时维护 DAG，定期根据保留周期（如 30 天）清理历史过期 XCom 记录", "value": "A"},
                {"label": "对团队数据开发人员进行代码审查，严格禁止在 XCom 中传递 DataFrame 或大二进制流", "value": "B"},
                {"label": "为元数据库定期执行 VACUUM 和索引重构优化", "value": "C"},
                {"label": "每天手动直接删除 PostgreSQL 的全部元数据表且不留任何备份", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 是科学系统的元数据库日常治理最佳实践。D 会直接摧毁整个集群所有历史与配置。",
            2,
            "airflow-l5-7",
            ["maintenance", "xcom-cleanup", "database-health"]
        ),
        judge(
            "airflow-c5-e8",
            "XCom 支持在不同 DAG 之间无限制地随意拉取数据，无需指定任何 `dag_id` 参数即可自动推导并获取目标值。",
            "错误",
            "`xcom_pull` 默认仅限于“同一 DAG、同一执行批次”内查找。若要跨不同 DAG 访问，必须显式指定目标 `dag_id` 与执行时间戳。",
            2,
            "airflow-l5-2",
            ["xcom_pull", "cross-dag", "scoping"]
        ),
        judge(
            "airflow-c5-e9",
            "在 TaskFlow API 中，如果一个函数添加了 `@task` 装饰器，它的返回值会自动走 XCom 流程；如果函数返回了一个大型字典，这行字典在底层依然会被写入元数据库。",
            "正确",
            "TaskFlow API 的底层机制依然是 XCom。返回的字典会被序列化存入元数据表，因此字典内容同样必须控制大小，严禁塞入海量数据。",
            1,
            "airflow-l5-3",
            ["taskflow", "xcom-internals"]
        ),
        judge(
            "airflow-c5-e10",
            "MySQL 数据库的默认 BLOB 字段限制会导致单条 XCom 数据超过约 64KB 时直接抛错，因此在 MySQL 作为元数据库的集群中更需警惕大对象写入。",
            "正确",
            "MySQL 的 `BLOB` 限制为 64KB，写入超出长度会直接报错 `DataError: Data too long for column`，相较 PostgreSQL 容忍度更低。",
            2,
            "airflow-l5-3",
            ["mysql", "blob-limit", "exceptions"]
        ),
        fill(
            "airflow-c5-e11",
            "Airflow 跨任务通信机制的英文缩写是 [BLANK1]；底层对应在元数据库中的数据表表名是 [BLANK2]。",
            [["XCom", "XCOM", "xcom"], ["xcom"]],
            "跨任务通信机制为 XCom，对应元数据表名是 `xcom`。",
            1,
            "airflow-l5-1",
            ["xcom", "terminology"]
        ),
        fill(
            "airflow-c5-e12",
            "在底层 API 中，向通信表写入键值对的方法是 `task_instance.[BLANK1](key, value)`；拉取键值对的方法是 `task_instance.[BLANK2](task_ids, key)`。",
            [["xcom_push"], ["xcom_pull"]],
            "写入用 `xcom_push`，拉取用 `xcom_pull`。",
            1,
            "airflow-l5-2",
            ["xcom_push", "xcom_pull"]
        ),
        open_ex(
            "airflow-c5-e13",
            "某初级算法工程师在编写一个每日模型离线预测流水线时，写出了如下代码：\n```python\n@task\ndef generate_predictions(ds=None):\n    # 针对 1000 万用户进行特征拉取与预测\n    import pandas as pd\n    df_predictions = pd.DataFrame({'user_id': range(10000000), 'score': [0.85]*10000000})\n    # 该工程师直接 return 了该大 DataFrame\n    return df_predictions\n\n@task\ndef send_sms_alerts(predictions):\n    print(f\"收到预测样本行数: {len(predictions)}\")\n    # 模拟逐行发送短信\n```\n请分析上述代码在生产环境执行时必然发生的三大系统性故障风险；并利用“传递存储指针（Reference）”的工业级思想，完整重构出符合规范的 Python 代码。",
            "1. **三大系统性故障风险**：\n- **Worker 节点 OOM 崩溃**：1000 万行的 DataFrame 序列化为 JSON 文本至少占用数 GB 内存，Worker 进程在序列化推送到 XCom 时会发生瞬间内存暴涨，被操作系统 OOM Killer 直接强制杀死；\n- **元数据库严重打满挂起**：若数据勉强尝试写入，数 GB 的 JSON 文本将直接打爆元数据库（如 MySQL 报 64KB 限制，PostgreSQL 导致 WAL 阻塞与连接池耗尽），全公司所有其他 DAG 的调度陷入卡死；\n- **网络与序列化开销巨大**：即便勉强存入，下游任务反序列化耗时极长，完全失去分布式调度系统的高性能意义。\n\n2. **符合规范的重构代码**：\n```python\nfrom airflow.decorators import task\n\n@task\ndef generate_predictions(ds=None) -> str:\n    import pandas as pd\n    import pyarrow.parquet as pq\n    \n    # 1. 计算产出海量预测结果\n    df_predictions = pd.DataFrame({'user_id': range(10000000), 'score': [0.85]*10000000})\n    \n    # 2. 将数据以高效列存 Parquet 格式直接持久化写入对象存储/数据湖\n    output_s3_path = f\"s3://company-ml-lake/predictions/dt={ds}/preds.parquet\"\n    df_predictions.to_parquet(output_s3_path, index=False)\n    print(f\"全量预测数据已成功落盘至对象存储: {output_s3_path}\")\n    \n    # 3. 严格遵循黄金法则：XCom 仅流转轻量字符串路径指针！\n    return output_s3_path\n\n@task\ndef send_sms_alerts(s3_pointer: str):\n    import pandas as pd\n    print(f\"下游根据轻量指针读取数据: {s3_pointer}\")\n    # 可以在此处通过流式批次读取 (如 chunksize 或 pyarrow dataset) 消费数据，杜绝一次性内存打满\n```",
            "XCom 大对象陷阱与生产级“传递指针”重构深度考查。",
            [
                {"point": "深入且精准分析出 3 大风险（Worker 内存 OOM 崩溃、元数据库被打满死锁、网络与序列化开销击穿）", "score": 2},
                {"point": "在重构代码中将海量数据持久化写入对象存储（如 Parquet / S3 路径）", "score": 2},
                {"point": "让 generate_predictions 仅通过 return 返回文件路径字符串指针并在下游接收", "score": 1}
            ],
            "分析出 Worker 内存爆掉、元数据库打满及网络序列化开销；重构代码中将 DataFrame to_parquet 写入 S3，return s3_path 字符串指针，下游接收字符串指针后再读取消费。",
            4,
            "airflow-l5-6",
            ["troubleshooting", "pass-by-reference", "code-refactoring"]
        )
    ]

    return chapter(
        "airflow-c5",
        "airflow-data-engineering",
        5,
        "任务通信 XCom 机制与大对象陷阱",
        "深入洞悉 XCom 基于元数据库的“小纸条”通信本质与精确寻址 API，深刻认知传递 DataFrame 引发的 OOM 与数据库崩溃灾难，熟练运用“传递存储指针”黄金法则及 Custom XCom Backend 架构方案。",
        lessons,
        exercises
    )
