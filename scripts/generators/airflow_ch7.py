# -*- coding: utf-8 -*-
"""Chapter 7: 传感器与事件驱动异步调度"""

from common import (
    lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter
)

def get_chapter_7():
    lessons = [
        lesson(
            "airflow-l7-1",
            "什么是传感器（Sensors）？主动轮询与被动等待的调度模型",
            """### 为什么数据管道需要“站岗放哨”？

在真实的数据系统集成中，很多上游依赖是**不可控的第三方异步事件**：
- 比如第三方合作伙伴承诺在“每天凌晨 2 点到 6 点之间”上传对账文件到 SFTP 或 S3，但具体哪一分哪一秒上传无法事先预知；
- 比如数仓模型依赖外部跨部门维护的 CRM 库，只有当 CRM 库中的 `audit_status` 变为 `'READY'` 时，我们才能开始抽取。

如果只是靠时间硬编码猜测，极易发生“还没上传就开始抽取”的灾难。
**传感器（Sensor）就是 Airflow 中专门用于“持续等待和监听特定外部状态就绪”的特殊算子！**

```
 ┌────────────────────────────────────────────────────────┐
 │ Airflow Sensor (传感器)                                │
 │ 1. 周期性向外部系统发送探测 (如: 文件存在吗? SQL>0 吗?) │
 │ 2. 如果未就绪: 等待一段时间，继续下一次探测             │
 │ 3. 如果已就绪 (返回 True): 传感器判定 SUCCESS，放行下游! │
 └───────────────────────────┬────────────────────────────┘
                             │ (条件满足，放行触发)
                             ▼
                    下游真实数据处理任务
```

---

### 轮询与探测机制：`poke` 方法

所有传感器在底层都实现了一个名为 `poke(self, context)` 的核心方法：
- `poke()` 返回一个布尔值：
  - 如果返回 `True`：条件已经满足！Sensor 立即变为 `SUCCESS`，下游任务启动；
  - 如果返回 `False`：条件尚未满足。Sensor 会休眠一段预设时间（由 `poke_interval` 控制），醒来后再次执行 `poke()`。
- 如果在规定的最大超时时间（`timeout`）内一直返回 `False`，Sensor 会主动抛出 `AirflowSensorTimeout` 异常，将任务置为 `FAILED` 并触发报警！
""",
            difficulty=1,
            tips="Sensor 不做重度数据转换，它的唯一使命就是‘放哨站岗’：检查外部条件是否成立，成了放行，超时报警！"
        ),
        lesson(
            "airflow-l7-2",
            "常用内置传感器实战：`FileSensor`、`SqlSensor` 与 `ExternalTaskSensor`",
            """### 现代数据工程最常用的三大神级传感器

Airflow 官方与 Providers 提供了丰富的开箱即用传感器，覆盖绝大多数文件系统与数仓场景：

---

### 1. `FileSensor`：本地或网络共享文件探测
探测本地路径中是否存在特定文件或目录（支持通配符 glob）：
```python
from airflow.sensors.filesystem import FileSensor

wait_for_sales_csv = FileSensor(
    task_id='wait_for_sales_csv',
    filepath='/data/incoming/sales_{{ ds }}.csv',
    fs_conn_id='fs_default',
    poke_interval=60,          # 每 60 秒检查一次
    timeout=60 * 60 * 2,       # 最多等待 2 小时
    mode='reschedule'
)
```

---

### 2. `SqlSensor`：数据库记录状态探测
在数据库中执行一段 SQL 查询，**只要返回的第一行第一列的值不是 0 / NULL / False / 空字符串，即判定条件就绪！**
```python
from airflow.providers.common.sql.sensors.sql import SqlSensor

wait_for_db_sync = SqlSensor(
    task_id='wait_for_db_sync',
    conn_id='postgres_oltp',
    sql='''
        SELECT count(*) 
        FROM crm.sync_logs 
        WHERE sync_date = '{{ ds }}' AND status = 'COMPLETED';
    ''',
    poke_interval=120,
    timeout=3600,
    mode='reschedule'
)
```

---

### 3. `ExternalTaskSensor`：跨 DAG 依赖协调之王
如果你的公司拆分了不同的业务 DAG：DAG-B（财务核算）必须等待 DAG-A（订单抽取）跑完后才能开始：
```python
from airflow.sensors.external_task import ExternalTaskSensor

wait_for_orders_dag = ExternalTaskSensor(
    task_id='wait_for_orders_dag',
    external_dag_id='orders_extraction_pipeline',  # 目标外部 DAG
    external_task_id='final_upload_step',          # 目标外部 Task (不指定则等待整个 DAG)
    allowed_states=['success'],
    check_existence=True,
    mode='reschedule'
)
```
""",
            difficulty=2,
            tips="在跨 DAG 协作中，使用 ExternalTaskSensor 是无需把所有任务塞进单个巨型 DAG 的架构解耦神器！"
        ),
        lesson(
            "airflow-l7-3",
            "传感器工作模式对比：`poke`（占用 Worker 槽位）vs `reschedule`（释放 Worker 槽位）",
            """### 导致集群瘫痪的“传感器死锁事故”

很多工程师刚学 Sensor 时，随手写了一个等待 S3 文件的任务，设置了超时 4 小时。
如果同时有 16 个这样的 DAG 实例在跑，而你的 Worker 节点池总共只有 16 个并发槽位（Slots）：
**整座集群将瞬间彻底瘫痪（Sensor Deadlock）！**
因为这 16 个传感器把所有的 Worker 槽位全部占满并陷入 sleep 等待，没有任何空闲槽位能分配给其他真正干活的任务，包括那些能够上传文件的任务，大家一起饿死！

造成该灾难的根源就是选错了 **`mode`（工作模式）**！

---

### 两大工作模式的本质区别

```
 ┌────────────────────────────────────────────────────────┐
 │ mode='poke' (阻塞独占模式 / 早期默认)                 │
 │ ├── Worker 进程被该任务永久占领                        │
 │ ├── 在两次探测之间执行 time.sleep()                    │
 │ └── 哪怕睡 4 个小时，Worker 槽位也绝不释放！[极度危险]   │
 └────────────────────────────────────────────────────────┘
                            VS
 ┌────────────────────────────────────────────────────────┐
 │ mode='reschedule' (协作释放模式 / 现代生产首选)         │
 │ ├── 探测一次如果返回 False，立刻主动交出 Worker 槽位    │
 │ ├── 状态变更为 UP_FOR_RESCHEDULE，进程彻底退出退出回收 │
 │ └── 等到达下一次 poke_interval 时，调度器重新调度排队   │
 └────────────────────────────────────────────────────────┘
```

| 对比维度 | `mode='poke'` | `mode='reschedule'` |
| :--- | :--- | :--- |
| **Worker 槽位占用** | **永久独占**，直到成功或超时 | **仅在探测瞬间占用**，休眠期完全释放 |
| **适用等待时长** | 仅适用于**极短时间等待**（如 1 分钟以内） | **适用于任何常规等待**（数分钟到数小时） |
| **集群资源开销** | 极高，容易引发全局并发槽位死锁 | 极低，单台 Worker 可轻松支撑上百个传感器 |
| **生产推荐指数** | ❌ 严禁在长时等待中使用 | ✅ **99% 生产场景的唯一首选！** |
""",
            difficulty=2,
            tips="生产铁律：在编写任何可能等待超过 2 分钟的 Sensor 时，必须无条件显式声明 `mode='reschedule'`！"
        ),
        lesson(
            "airflow-l7-4",
            "传感器配置铁律：`poke_interval`、`timeout` 与死锁自愈",
            """### 编写健壮传感器的四大黄金防御参数

一个未经仔细参数调优的传感器，就是潜伏在生产集群中的定时炸弹。在定义任何 Sensor 时，必须牢牢死守四大配置：

```python
FileSensor(
    task_id='safe_sensor',
    filepath='/data/sales.csv',
    # 1. 探测频率 (秒)
    poke_interval=300,             # 5 分钟检查一次 (严禁设为 1 秒!)
    
    # 2. 超时保护 (秒)
    timeout=3600 * 4,              # 最多等待 4 小时 (严禁不设超时无限死等!)
    
    # 3. 槽位释放模式
    mode='reschedule',             # 释放 Worker 资源
    
    # 4. 指数退避 (可选增强)
    exponential_backoff=True,      # 随时间逐渐拉长探测间隔，减轻外部系统压力
    max_poke_interval=1800,        # 退避最大上限为 30 分钟
)
```

---

### 参数配置避坑准则

1. **`poke_interval` 严禁过短**：
   有初学者设置 `poke_interval=1`，导致 Sensor 每秒向 MySQL 或 S3 发起一次查询，一天发起数万次请求，最终外部数据库被自身的传感器打挂；建议生产环境探测间隔设置为 60 秒到 300 秒。
2. **`timeout` 严禁缺失**：
   若不配置 `timeout`，某些旧版系统的默认超时可能长达数天（7 天）；如果外部系统永远没有产生该文件，该任务会连续跑 7 天，耗费大量元数据库存储和调度性能。
3. **软失败（`soft_fail=True`）**：
   如果某个文件是“可选的”（例如周末允许没有此文件），可以配置 `soft_fail=True`。一旦等待超时，任务状态会被标记为 **`SKIPPED`** 而非 `FAILED`，避免产生误报报警！
""",
            difficulty=2,
            tips="配置清单：`mode='reschedule'` + 合理的 `poke_interval`（>=60s） + 明确的 `timeout` + 可选的 `soft_fail`，四件套护航高可用！"
        ),
        lesson(
            "airflow-l7-5",
            "异步触发器革命：Airflow 2.2+ Deferrable Operators 与 Triggerer 组件架构",
            """### 彻底终结轮询：什么是可延迟算子（Deferrable Operators）？

即使使用了 `mode='reschedule'`，传感器每次重新唤醒时，调度器仍然需要生成 TaskInstance、放入队列、让 Worker 认领进程并连接外部系统探测。
如果集群有 1000 个传感器每 5 分钟醒来一次，依然会产生相当可观的调度震荡开销。

Airflow 2.2 引入了革命性的云原生异步事件架构：**Deferrable Operators（可延迟算子）** 与 **`Triggerer` 组件**！

```
 传统 Sensor (轮询模型)          可延迟算子 (异步事件驱动模型)
 ┌──────────────────────┐        ┌─────────────────────────────────────────┐
 │ Worker 频繁唤醒      │        │ Worker 启动任务，将事件移交给 Triggerer   │
 │ 消耗进程资源探测      │   VS   │ 随后 Worker 进程立刻退出！               │
 │ 哪怕不干活也在反复跑  │        │ Triggerer 进程利用 Python asyncio 异步循环│
 └──────────────────────┘        │ 单个进程单核轻松同时监听 10,000+ 个外部事件!│
                                 └─────────────────────────────────────────┘
```

---

### `Triggerer` 的工作机制

1. **移交挂起（Deferral）**：
   任务启动后，调用 `self.defer(...)` 方法，将当前的等待工作委托给一个轻量的 Trigger 对象，当前 Worker 立即完全释放；
2. **超高并发异步监听**：
   Airflow 后台的 `airflow-triggerer` 进程基于 Python 的 `asyncio` 事件循环运行。它不需要为每个等待任务开线程或进程，**单个 Triggerer 守护进程单核即可轻松支撑数万个正在等待的异步事件**（如等待 Databricks 任务完成、等待 S3 文件上传）；
3. **事件唤醒（Wake-up）**：
   一旦外部异步条件满足，Triggerer 会向元数据库发送事件信号，调度器直接将任务重新排队派发给 Worker 快速收尾！

在现代 Airflow 中，官方提供的带有 `SensorAsync` 后缀或配置了 `deferrable=True` 的算子（如 `DateTimeSensorAsync`, `HttpSensorAsync`）均全面升级为该异步架构！
""",
            difficulty=3,
            tips="Deferrable Operators 是 Airflow 架构演进的巅峰之作：让数据平台在支撑海量事件监听时，Worker 机器成本直降 90%！"
        ),
        lesson(
            "airflow-l7-6",
            "数据集驱动调度（Data-aware Scheduling）：基于 Dataset URI 的跨 DAG 事件响应",
            """### 调度理念的范式跃迁：从“时间驱动”到“数据驱动”

在过去，所有的 DAG 几乎都是由“时间（Cron）”驱动的（如每天 2 点跑）。
但真实世界中：**“下游任务关心的根本不是现在几点了，而是上游的那份数据到底更新了没有！”**

Airflow 2.4 引入了颠覆性的核心特性：**基于数据集的感知调度（Data-aware Scheduling / Datasets）**！

---

### Dataset 的核心语法

`Dataset` 以全局唯一的 URI 字符串命名（例如 `s3://bucket/orders.parquet` 或 `postgres://prod_db/public/orders`）：

#### 1. 生产者 DAG（Producer）：声明生产数据集
当某个任务成功运行并写入了新数据时，通过 `outlets` 声明它更新了该 Dataset：
```python
from airflow import DAG, Dataset
from airflow.operators.bash import BashOperator

orders_dataset = Dataset("s3://company-lake/gold/orders.parquet")

with DAG('producer_extract_orders', schedule='@hourly', ...) as dag:
    extract_task = BashOperator(
        task_id='extract_and_write',
        bash_command='...',
        outlets=[orders_dataset]  # ✅ 任务成功时，自动向集群广播：该数据集已更新！
    )
```

#### 2. 消费者 DAG（Consumer）：由数据集驱动触发
下游 DAG 不再配置 `@daily` 或 Cron 表达式，而是**直接把 Dataset 作为它的 `schedule`**：
```python
from airflow import DAG, Dataset

orders_dataset = Dataset("s3://company-lake/gold/orders.parquet")
users_dataset = Dataset("s3://company-lake/gold/users.parquet")

# 只要这两个数据集都被更新过一次，本 DAG 立即被自动触发执行！
with DAG(
    dag_id='consumer_customer_churn_analysis',
    schedule=[orders_dataset, users_dataset],  # 声明输入数据集依赖列表
    ...
) as dag:
    # 业务处理任务...
```
无需复杂的 ExternalTaskSensor，无需繁琐的时间对齐，完全依靠数据状态实现端到端全自动事件响应！
""",
            difficulty=2,
            tips="现代数据栈架构首选：Producer 声明 `outlets=[dataset]`，Consumer 配置 `schedule=[dataset]`，数据就绪即刻开跑！"
        ),
        lesson(
            "airflow-l7-7",
            "编写自定义传感器：从 `BaseSensorOperator` 到异步可延迟传感器",
            """### 企业自研系统对接：打造自定义 Sensor

当企业内部有自研的任务调度系统（如自研 Flink 平台、自研算法推理集群）时，我们需要编写专有的 Sensor 来监听任务状态。

---

### 实战：编写 `FlinkJobStatusSensor`

所有同步传感器继承自 `airflow.sensors.base.BaseSensorOperator`，核心只需重写 `poke(self, context)` 方法：

```python
# plugins/sensors/flink_sensor.py
from airflow.sensors.base import BaseSensorOperator
import requests

class FlinkJobStatusSensor(BaseSensorOperator):
    template_fields = ('job_id',)
    ui_color = '#fed7aa'

    def __init__(self, flink_endpoint: str, job_id: str, **kwargs):
        # 默认推荐将 mode 设为 reschedule
        super().__init__(mode='reschedule', **kwargs)
        self.flink_endpoint = flink_endpoint
        self.job_id = job_id

    def poke(self, context) -> bool:
        self.log.info(f"正在探测 Flink 任务状态: {self.job_id}...")
        url = f"{self.flink_endpoint}/jobs/{self.job_id}"
        
        try:
            res = requests.get(url, timeout=10)
            res.raise_for_status()
            status = res.json().get('state')
            self.log.info(f"当前 Flink 任务状态为: {status}")

            if status == 'FINISHED':
                self.log.info("Flink 批作业已成功完成！")
                return True
            elif status in ('FAILED', 'CANCELED'):
                raise ValueError(f"Flink 任务异常终止: {status}")
            else:
                # 状态仍为 RUNNING 或 INITIALIZING，返回 False 继续等待
                return False

        except requests.RequestException as e:
            self.log.warning(f"探测请求网络抖动: {e}, 等待下次重试")
            return False
```

#### 在工作流中使用自研传感器：
```python
wait_flink = FlinkJobStatusSensor(
    task_id='wait_flink_rollup',
    flink_endpoint='http://flink-cluster.internal:8081',
    job_id='job_abcdef_123',
    poke_interval=120,
    timeout=7200
)
```
""",
            difficulty=3,
            tips="重写自定义 Sensor 极其纯粹：只要 `poke` 返回 `True` 代表成功，返回 `False` 代表继续等待，抛异常代表立即失败报警！"
        )
    ]

    exercises = [
        single_choice(
            "airflow-c7-e1",
            "在 Airflow 传感器的底层执行机制中，每次周期性探测外部系统状态所调用的核心方法是：",
            [
                {"label": "execute_loop()", "value": "A"},
                {"label": "poke(context)", "value": "B"},
                {"label": "wait_forever()", "value": "C"},
                {"label": "scan_once()", "value": "D"}
            ],
            "B",
            "`poke(self, context)` 是所有 Sensor 的核心探测方法，返回布尔值 `True`（放行）或 `False`（继续等待）。",
            1,
            "airflow-l7-1",
            ["sensor", "poke-method", "lifecycle"]
        ),
        single_choice(
            "airflow-c7-e2",
            "在 Sensor 的两大工作模式中，如果一个传感器需要长时间等待数小时，为了防止 Worker 并发槽位被 `time.sleep()` 永久独占导致整个集群死锁，必须配置的工作模式是：",
            [
                {"label": "mode='poke'", "value": "A"},
                {"label": "mode='reschedule'", "value": "B"},
                {"label": "mode='blocking'", "value": "C"},
                {"label": "mode='infinite'", "value": "D"}
            ],
            "B",
            "`mode='reschedule'` 在探测未就绪时会立刻交出 Worker 槽位退出进程，彻底避免长时间 sleep 占满 Worker 引发全局死锁。",
            1,
            "airflow-l7-3",
            ["sensor-modes", "reschedule", "deadlock-prevention"]
        ),
        single_choice(
            "airflow-c7-e3",
            "在 Airflow 2.2+ 引入的可延迟算子（Deferrable Operators）体系中，负责使用 Python asyncio 异步循环以单核单进程极高并发监听外部事件的核心后台服务是：",
            [
                {"label": "Webserver", "value": "A"},
                {"label": "Triggerer", "value": "B"},
                {"label": "Scheduler", "value": "C"},
                {"label": "Worker", "value": "D"}
            ],
            "B",
            "`Triggerer` 是异步事件驱动架构的核心组件，利用 Python asyncio 单进程轻松支撑数万个可延迟事件监听，大幅削减 Worker 资源开销。",
            2,
            "airflow-l7-5",
            ["triggerer", "deferrable-operators", "asyncio"]
        ),
        single_choice(
            "airflow-c7-e4",
            "在 Airflow 2.4+ 的“数据集驱动调度（Data-aware Scheduling）”体系中，生产者任务在成功更新某个数据集后，应该在其算子参数中通过哪个字段进行声明？",
            [
                {"label": "inlets", "value": "A"},
                {"label": "outlets", "value": "B"},
                {"label": "datasets", "value": "C"},
                {"label": "emit_event", "value": "D"}
            ],
            "B",
            "生产者任务使用 `outlets=[my_dataset]` 声明产出数据集更新；消费者 DAG 使用 `schedule=[my_dataset]` 监听并驱动触发。",
            2,
            "airflow-l7-6",
            ["datasets", "data-aware-scheduling", "outlets"]
        ),
        multiple_choice(
            "airflow-c7-e5",
            "关于生产环境中常用的内置传感器，下列对应关系与场景正确的有：",
            [
                {"label": "`FileSensor`：用于探测本地或挂载目录中特定路径文件是否已生成", "value": "A"},
                {"label": "`SqlSensor`：在数据库中执行查询，当返回值不为空或不为 0 时放行", "value": "B"},
                {"label": "`ExternalTaskSensor`：用于监听另一个跨外部 DAG 或特定 TaskInstance 的完成状态", "value": "C"},
                {"label": "`FileSensor` 能够自动替客户手写所有的商业报表逻辑", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 展现了三大常用传感器的经典业务定位。D 纯属荒谬捏造。",
            1,
            "airflow-l7-2",
            ["filesensor", "sqlsensor", "externaltasksensor"]
        ),
        multiple_choice(
            "airflow-c7-e6",
            "在生产环境配置传感器时，为了避免资源浪费与集群故障，下列哪些属于必须遵循的最佳安全实践？",
            [
                {"label": "显式设置合理的 `timeout` 超时保护，杜绝无限死等", "value": "A"},
                {"label": "设置适度的 `poke_interval`（如 60~300 秒），防止高频刷屏打垮目标外部数据库", "value": "B"},
                {"label": "长时等待一律采用 `mode='reschedule'` 释放并发槽位", "value": "C"},
                {"label": "对于非必须的旁路文件，可配置 `soft_fail=True`，超时后标记为 SKIPPED 避免误报", "value": "D"}
            ],
            ["A", "B", "C", "D"],
            "全选。这四条构成了企业级传感器治理的黄金防御法则体系。",
            2,
            "airflow-l7-4",
            ["sensor-best-practices", "governance", "resilience"]
        ),
        multiple_choice(
            "airflow-c7-e7",
            "相比传统基于时间（Cron）的定时调度，Airflow 基于 Dataset 的数据感知调度具有哪些核心优势？",
            [
                {"label": "数据就绪立即触发下游，消除时间硬编码预估带来的不必要时延", "value": "A"},
                {"label": "避免因上游数据抽取延迟导致下游在错误时间点读取空数据或半成品", "value": "B"},
                {"label": "代码表达清晰，直接基于全局唯一的数据集 URI 建立依赖关系", "value": "C"},
                {"label": "完全不需要任何 Python 代码即可实现自动人工智能计算", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 准确阐述了事件驱动/数据驱动调度对传统时钟调度的范式超越。D 错误。",
            2,
            "airflow-l7-6",
            ["data-aware-scheduling", "event-driven", "datasets"]
        ),
        judge(
            "airflow-c7-e8",
            "在 `mode='poke'` 模式下，传感器在休眠等待的整个周期内会一直霸占 Worker 的执行槽位，这在长时等待时极易引发并发死锁。",
            "正确",
            "`poke` 模式采用阻塞 sleep 机制，导致槽位无法释放，是引发集群传感器死锁的罪魁祸首。",
            1,
            "airflow-l7-3",
            ["sensor-modes", "poke-danger"]
        ),
        judge(
            "airflow-c7-e9",
            "编写继承自 `BaseSensorOperator` 的自定义传感器时，只要在 `poke` 方法中返回 `False`，该任务就会立即被判定为执行失败并抛出致命错误中断工作流。",
            "错误",
            "`poke` 返回 `False` 代表“条件尚未就绪，继续休眠等待下次探测”，只有当探测累计耗时超过 `timeout` 时才会抛出超时失败异常。",
            1,
            "airflow-l7-7",
            ["poke-lifecycle", "custom-sensor"]
        ),
        judge(
            "airflow-c7-e10",
            "在 Airflow 2.4+ 中，一个下游消费者 DAG 可以同时依赖多个不同的 Dataset，只有当所有声明的数据集都在上游被更新过之后，下游 DAG 才会触发执行。",
            "正确",
            "`schedule=[ds1, ds2]` 支持多数据集依赖汇聚，只有所有依赖的数据集都满足更新事件时才触发消费。",
            2,
            "airflow-l7-6",
            ["datasets", "multiple-datasets"]
        ),
        fill(
            "airflow-c7-e11",
            "在 Airflow 传感器中，配置探测间隔时间的参数名称是 [BLANK1]（单位为秒）；配置最大等待时长的超时参数名称是 [BLANK2]。",
            [["poke_interval"], ["timeout"]],
            "配置探测间隔 `poke_interval`，配置超时 `timeout`。",
            1,
            "airflow-l7-4",
            ["parameters", "poke_interval", "timeout"]
        ),
        fill(
            "airflow-c7-e12",
            "Airflow 2.2+ 异步事件架构的核心守护进程是 [BLANK1]；所有同步传感器的官方标准基类是 [BLANK2]。",
            [["Triggerer", "triggerer"], ["BaseSensorOperator"]],
            "异步组件为 Triggerer，传感器基类为 `BaseSensorOperator`。",
            2,
            "airflow-l7-5",
            ["triggerer", "BaseSensorOperator"]
        ),
        open_ex(
            "airflow-c7-e13",
            "某跨国零售系统的财务数据链路中，存在跨部门 DAG 依赖：\n1. 财务结算 DAG（`finance_settlement_dag`）必须等待核心交易 DAG（`core_trade_dag`）当天的最终完成任务 `trade_daily_finalized` 执行成功后，方可启动；\n2. 此外，财务结算还需要等待共享 SFTP 目录 `/sftp/finance/rates_{{ ds }}.csv` 汇率牌价文件到位后，才可开始计算；\n3. 汇率牌价文件通常在上午 8 点前到达，最长容忍等待 3 小时；\n4. 要求所有等待任务均采用高可用防死锁规范配置。\n\n请使用 Python 编写出该财务结算 DAG（`finance_settlement_dag`）的前置探测与汇聚编排代码，包含合理的 `ExternalTaskSensor` 与 `FileSensor` 实例配置以及依赖连线。",
            "```python\nfrom datetime import datetime, timedelta\nfrom airflow import DAG\nfrom airflow.sensors.external_task import ExternalTaskSensor\nfrom airflow.sensors.filesystem import FileSensor\nfrom airflow.operators.empty import EmptyOperator\n\ndefault_args = {\n    'owner': 'finance_data_team',\n    'retries': 2,\n    'retry_delay': timedelta(minutes=3),\n}\n\nwith DAG(\n    dag_id='finance_settlement_dag',\n    default_args=default_args,\n    start_date=datetime(2024, 1, 1),\n    schedule='0 8 * * *',\n    catchup=False,\n    tags=['finance', 'sensors']\n) as dag:\n\n    # 1. 跨 DAG 依赖传感器：等待核心交易完成\n    wait_core_trade = ExternalTaskSensor(\n        task_id='wait_core_trade_finalized',\n        external_dag_id='core_trade_dag',\n        external_task_id='trade_daily_finalized',\n        allowed_states=['success'],\n        poke_interval=120,          # 每 2 分钟检查一次\n        timeout=3600 * 3,           # 最多等待 3 小时\n        mode='reschedule',          # 关键：释放 Worker 槽位防死锁\n        check_existence=True\n    )\n\n    # 2. 汇率文件传感器：等待 SFTP 文件到达\n    wait_rates_file = FileSensor(\n        task_id='wait_rates_file',\n        filepath='/sftp/finance/rates_{{ ds }}.csv',\n        fs_conn_id='fs_default',\n        poke_interval=60,           # 每 60 秒检查一次\n        timeout=3600 * 3,           # 最多等待 3 小时\n        mode='reschedule'           # 关键：释放 Worker 槽位防死锁\n    )\n\n    # 3. 双前置就绪汇聚锚点\n    preconditions_ready = EmptyOperator(task_id='preconditions_ready')\n\n    # 4. 实际财务核算主任务 (占位演示)\n    run_settlement = EmptyOperator(task_id='execute_settlement_calculations')\n\n    # 依赖编排 (扇入汇聚)\n    [wait_core_trade, wait_rates_file] >> preconditions_ready >> run_settlement\n```",
            "工业级传感器（ExternalTaskSensor + FileSensor）防死锁配置与双前置扇入编排考查。",
            [
                {"point": "正确使用 ExternalTaskSensor 监听 core_trade_dag 和 trade_daily_finalized", "score": 2},
                {"point": "正确使用 FileSensor 监听 rates_{{ ds }}.csv 文件", "score": 1},
                {"point": "两个 Sensor 均严谨显式配置 mode='reschedule'、poke_interval 与 timeout 保护", "score": 1},
                {"point": "利用 [wait_core_trade, wait_rates_file] >> 汇聚节点 完成依赖拓扑", "score": 1}
            ],
            "正确实例化 ExternalTaskSensor 与 FileSensor；显式配置 mode='reschedule'、poke_interval 与 timeout=10800；用 [wait_core_trade, wait_rates_file] >> preconditions_ready >> run_settlement 编排拓扑。",
            4,
            "airflow-l7-2",
            ["sensors-coding", "external-task-sensor", "file-sensor", "reschedule"]
        )
    ]

    return chapter(
        "airflow-c7",
        "airflow-data-engineering",
        7,
        "传感器与事件驱动异步调度",
        "掌握传感器主动轮询机制，深度掌握 `mode='reschedule'` 规避集群死锁核心铁律，精通 ExternalTaskSensor 与 SqlSensor 跨系统协调，掌握 Deferrable Operators 异步架构与 Dataset 数据感知驱动调度。",
        lessons,
        exercises
    )
