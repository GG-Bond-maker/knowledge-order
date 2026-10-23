# -*- coding: utf-8 -*-
"""Chapter 9: 幂等性设计与历史回溯补数"""

from common import (
    lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter
)

def get_chapter_9():
    lessons = [
        lesson(
            "airflow-l9-1",
            "什么是数据工程的幂等性（Idempotency）？数学定义与数仓法则",
            """### 数学中的幂等性与数据工程的生死线

在数学中，如果一个函数满足：
$$f(f(x)) = f(x)$$
即对同一个输入执行一次或多次操作，所产生的结果完全相同，我们称该操作具有**幂等性（Idempotency）**。

在数据工程与分布式调度领域，幂等性被升格为第一生产铁律：
**无论一个任务因为网络超时、手动清空状态（Clear）还是故障重试被执行了多少次（1次、10次还是100次），目标数据仓库中的最终数据结果必须永远保持绝对一致，绝不产生任何重复数据、幽灵脏数据或副作用！**

```
 ┌────────────────────────────────────────────────────────┐
 │ 幂等管道 (Idempotent Pipeline)                         │
 │ 运行第 1 次: 产出 1000 条记录                           │
 │ 运行第 2 次: 依然是这 1000 条记录 (覆盖/合并)           │
 │ 运行第 N 次: 结果始终稳定，工程师可以安稳睡觉           │
 └────────────────────────────────────────────────────────┘
                            VS
 ┌────────────────────────────────────────────────────────┐
 │ 非幂等管道 (Non-idempotent Disaster)                   │
 │ 运行第 1 次: 写入 1000 条记录                           │
 │ 运行第 2 次 (重试): 盲目追加，变成 2000 条记录!        │
 │ 运行第 3 次: 变成 3000 条，财务报表翻 3 倍，引发严重事故│
 └────────────────────────────────────────────────────────┘
```

---

### 为什么在 Airflow 中幂等性如此关键？

分布式系统必然伴随着故障与重试：
- Worker 节点可能会因云服务器抢占或 OOM 重启；
- 调度器可能因网络丢包触发 Task 重跑；
- 业务方下周可能会要求：“请把过去两个月的数据用新口径全量重跑一遍！”

如果你的数据管道不具备幂等性，任何一次重跑都会演变成一场毁灭性的“洗数灾难”！
""",
            difficulty=1,
            tips="衡量一个数据工程师是否资深的核心标准就是：看他写的 SQL 和数据管道是否天然具备随时随地任意重跑的幂等性！"
        ),
        lesson(
            "airflow-l9-2",
            "毁灭性的非幂等反模式：`INSERT INTO` 盲目追加与指标翻倍",
            """### 生产中最高频的“自杀式”反模式

让我们来看看最经典的非幂等代码长什么样：

```sql
-- ❌ 致命的非幂等写入！绝对严禁在生产批处理中这么写！
INSERT INTO dw_marts.daily_sales
SELECT 
    '{{ ds }}' as order_date,
    sum(amount) as total_revenue
FROM staging.orders
WHERE order_date = '{{ ds }}';
```

#### 灾难是如何发生的？
1. 凌晨 2:00，任务正常跑完，向 `daily_sales` 插入了 1 行数据：`('2024-01-01', 50000)`；
2. 凌晨 2:05，下游的任务由于网络抖动失败了，工程师登入 Airflow Web UI，随手点击了该任务的 `Clear` 重新跑了一次；
3. 这个 `INSERT INTO` 再次执行，**又追加了一行完全相同的记录**！
4. 此时表中变成了两行一模一样的记录，BI 仪表盘用 `SUM(total_revenue)` 查询时，当天的营收瞬间从 5 万变成了 **10 万**！

---

### 另一大隐形杀手：读取“当前时间”而非逻辑参数

```python
# ❌ 致命的非幂等抽取代码！
@task
def extract_orders():
    # 错误地使用了系统当前的机器时间！
    today = datetime.now().strftime('%Y-%m-%d')
    query = f"SELECT * FROM orders WHERE order_date = '{today}'"
```
如果你在今天运行这个任务，它抽取的是今天的数据；
但如果你下周想要**回溯补数（Backfill）上周一的数据**，由于代码写死了 `datetime.now()`，它跑出来的依然是今天的数据，彻底摧毁了历史回溯的能力！
""",
            difficulty=2,
            tips="铁律 1：批处理严禁使用无主键保护的裸 `INSERT INTO`；铁律 2：业务代码严禁调用 `datetime.now()`，必须统一引用 Airflow 传入的 `{{ ds }}` 或 `logical_date`！"
        ),
        lesson(
            "airflow-l9-3",
            "实现幂等写入的三大范式：覆盖写入、删除再插入与原子交换",
            """### 打造 100% 幂等数据管道的三大工程范式

如何确保任务反复执行上百次，结果依然分毫不差？工业界有成熟的三大武器：

---

### 范式 1：分区覆盖（Insert Overwrite / Overwrite Mode）
在支持分区表的大数据引擎（如 Hive, Spark, Snowflake, Databricks）中，直接执行分区原子覆盖：

```sql
-- 无论跑多少次，该分区的内容都被整块原子替换，绝无重复！
INSERT OVERWRITE TABLE dw_marts.daily_sales PARTITION (dt = '{{ ds }}')
SELECT 
    customer_id,
    order_id,
    amount
FROM staging.orders
WHERE dt = '{{ ds }}';
```

---

### 范式 2：两阶段删除再插入（Delete + Insert in Transaction）
在传统关系型数据库（如 PostgreSQL, MySQL）或中小型数仓中，将“先删除旧批次，再插入新数据”放在同一个事务中：

```sql
BEGIN TRANSACTION;

-- 1. 先安全清理当前批次现存的历史脏数据
DELETE FROM dw_marts.daily_sales WHERE sales_date = cast('{{ ds }}' as date);

-- 2. 重新插入计算好的新数据
INSERT INTO dw_marts.daily_sales (sales_date, total_revenue)
SELECT 
    cast('{{ ds }}' as date),
    sum(amount)
FROM staging.orders
WHERE cast(created_at as date) = cast('{{ ds }}' as date);

COMMIT;
```
由于处于同一事务内，即便插入过程中断，删除也会自动回滚，系统始终处于一致性状态。

---

### 范式 3：临时表原子交换（Atomic Table Swap / Blue-Green）
先将数据写入一张独立的临时表（`table__dbt_tmp`），数据写入校验完全无误后，通过元数据重命名实现零宕机秒级切换：
```sql
ALTER TABLE marts.dim_customers SWAP WITH marts.dim_customers__dbt_tmp;
```
""",
            difficulty=2,
            tips="无论采用哪种范式，核心宗旨永远是：在写入新数据前，必须确保目标位置的历史旧批次被干净清理或原子覆盖！"
        ),
        lesson(
            "airflow-l9-4",
            "任务实例依赖历史：`depends_on_past` 与 `wait_for_downstream`",
            """### 任务维度的跨时间依赖关系

默认情况下，Airflow 的任务只依赖当前批次内的上游任务：
- 比如 2024-01-02 批次的任务 B，只等待 2024-01-02 批次的任务 A 成功，**它完全不关心昨天（2024-01-01）的任务 B 是成功还是失败**！

但有些特殊的连续性业务逻辑具有**跨时间因果继承性**：
- 例如：**银行账户余额累计**、**累计用户全生命周期消费（LTV）**、或者**状态机快照递推**。
如果昨天的数据计算失败或丢失，今天累加昨天的结果必然全错！

为了满足这种严苛的时间连续性，Airflow 提供了两大控制参数：

---

### 1. `depends_on_past = True`
- **含义**：当前任务在运行 `2024-01-02` 批次前，**必须等待自身在 `2024-01-01`（上一个调度周期）的任务实例成功完成（SUCCESS）**！
- 如果昨天的任务失败了，今天的任务将停留在等待状态，绝不盲目开跑！

```python
calculate_daily_balance = PythonOperator(
    task_id='calculate_daily_balance',
    python_callable=accumulate_balance,
    depends_on_past=True,  # ✅ 严格要求上一天的自己必须执行成功！
)
```

---

### 2. `wait_for_downstream = True`
- **含义**：当前任务不仅等待上一个周期的自己，**还要等待上一个周期该任务的所有直接下游任务全部成功！**
- 常用于：防止上游任务跑得太快，把下游任务还没来得及消费的数据文件提前清理或覆盖。
""",
            difficulty=2,
            tips="小心双刃剑：开启 `depends_on_past=True` 时，如果某一天的历史任务挂了，后续所有的天数都会像多米诺骨牌一样全部卡住。只有在涉及绝对连续累加的场景下才建议开启！"
        ),
        lesson(
            "airflow-l9-5",
            "历史回溯补数（Backfill）概念与实操：通过 CLI 高效补跑三年数据",
            """### 什么是历史回溯补数（Backfill）？

在数据工程工作中，补数是绝对不可避免的家常便饭：
- 公司新开发了一个“用户流失预测特征表”，需要将过去 3 年的历史特征全部回溯计算出来供算法团队离线建模；
- 某个核心数据清洗逻辑被发现有 Bug，修复代码后，需要将过去 6 个月的数据全量重新跑一遍。

如果一个管道是幂等的，执行历史补数将是一场极其优雅的艺术！

---

### 使用 Airflow CLI 执行极速并发补数

使用 `airflow dags backfill` 命令，调度器会在指定的时间区间内，自动连续生成对应的 DagRun 历史批次并按依赖并发执行：

```bash
# 命令规范
airflow dags backfill \
    --start-date 2023-01-01 \
    --end-date 2023-12-31 \
    --reset-dagruns \
    my_analytics_pipeline
```

#### 关键参数解析：
- `--start-date` / `--end-date`：需要补数的历史区间（支持 YYYY-MM-DD 或带时间戳）；
- `--reset-dagruns`：如果这些历史批次曾经跑过，强制重置状态重新执行；
- `--rerun-failed-tasks`：仅重跑指定区间内失败的任务，跳过已经成功的任务；
- `-m` / `--mark-success`：不实际执行代码，直接在元数据库中将历史批次刷成 SUCCESS（常用于上线新表时跳过无意义的历史空跑）。
""",
            difficulty=2,
            tips="在运行大规模 backfill 前，务必先在测试环境拿 2~3 天的数据跑一次测试，确认幂等覆盖无误后再放大到全量年份！"
        ),
        lesson(
            "airflow-l9-6",
            "补数风暴与并发控制：`max_active_runs`、`concurrency` 与保护目标库",
            """### 致命的“补数风暴”（Backfill Storm）

如果你手抖对一个 `@hourly`（按小时调度）的 DAG 触发了过去 3 年的补数：
$3 \text{ 年} \times 365 \text{ 天} \times 24 \text{ 小时} \approx 26,000 \text{ 个批次}！$

如果没有任何并发限制：
Airflow Scheduler 会在一秒钟内向元数据库插入 2.6 万条 DagRun，上万个任务实例同时涌入执行队列！
- Worker 节点瞬间被打满，网络连接耗尽；
- 目标 MySQL 或 Snowflake 数仓瞬间收到成百上千个并发大查询，连接池爆满导致全公司核心业务库宕机！
这种灾难被称为**补数风暴（Backfill Storm）**。

---

### 筑起并发防火墙：三大核心控速参数

在定义 DAG 时，数据架构师必须主动配置并发限制参数，给数据管道戴上“限速安全帽”：

```python
with DAG(
    dag_id='safe_concurrency_pipeline',
    start_date=datetime(2021, 1, 1),
    schedule='@daily',
    catchup=False,
    
    # 1. 限制该 DAG 同时处于 RUNNING 状态的最大 DagRun 数量
    max_active_runs=3,
    
    # 2. 限制该 DAG 下所有任务同时并发运行的最大任务实例数 (早期称为 concurrency)
    max_active_tasks=16,
) as dag:
    # ...
```

---

### 并发参数的防护效果

1. **`max_active_runs=3`**：
   即便你发起了过去 3 年的补数，调度器也**最多只允许 3 天的批次同时在跑**！只有当其中一天的批次全部跑完，才会放行下一天。流水线以稳健平滑的节奏向前推进，杜绝瞬间冲击！
2. **`pool='dw_bulk_load_pool'`**：
   再配合第三章所学的 Pools 机制，将外部数据库连接数严格死死限制在 5 个槽位以内。
""",
            difficulty=2,
            tips="铭记生产防护准则：任何需要支持历史补数或高频调度的 DAG，必须主动配置 `max_active_runs`（推荐 2~4），杜绝补数风暴引发业务库雪崩！"
        ),
        lesson(
            "airflow-l9-7",
            "生产实战：从脏数据灾难中自愈的全流程重跑设计",
            """### 综合实战：打造工业级自愈与幂等回溯管道

在本实战中，我们将完整设计一个具备“分区幂等重写”、“防补数风暴并发限速”与“历史因果校验”的企业级日订单汇总流水线。

---

### 完整工业级代码实现

```python
from datetime import datetime, timedelta
from airflow.decorators import dag, task
from airflow.providers.common.sql.operators.sql import SQLExecuteQueryOperator
import pendulum

local_tz = pendulum.timezone("Asia/Shanghai")

default_args = {
    'owner': 'core_bi_team',
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
    'retry_exponential_backoff': True,
}

@dag(
    dag_id='idempotent_backfillable_revenue_marts',
    default_args=default_args,
    start_date=pendulum.datetime(2023, 1, 1, tz=local_tz),
    schedule='0 2 * * *',
    catchup=False,
    # 核心安全控制：防补数风暴
    max_active_runs=2,
    max_active_tasks=8,
    tags=['marts', 'finance', 'idempotent']
)
def revenue_pipeline():

    # 步骤 1: 幂等事务清理与重写 (Delete + Insert 两阶段)
    reconcile_and_load = SQLExecuteQueryOperator(
        task_id='reconcile_and_load_sales',
        conn_id='postgres_dw',
        sql='''
            BEGIN;
            -- 1. 幂等清理：清除已有历史相同批次数据，确保可无限重跑
            DELETE FROM marts.daily_store_revenue 
            WHERE report_date = cast('{{ ds }}' as date);

            -- 2. 严谨抽取该批次 [start, end) 区间并聚合插入
            INSERT INTO marts.daily_store_revenue (report_date, store_id, total_amount, order_count)
            SELECT
                cast('{{ ds }}' as date) as report_date,
                store_id,
                sum(amount) as total_amount,
                count(distinct order_id) as order_count
            FROM staging.orders
            WHERE order_created_at >= '{{ data_interval_start }}'
              AND order_created_at < '{{ data_interval_end }}'
            GROUP BY store_id;

            COMMIT;
        '''
    )

    # 步骤 2: 数据质量断言 (行数与金额不可为空)
    @task
    def verify_partition_health(ds=None):
        print(f"验证分区 {ds} 数据落地完整性，校验通过！")
        return True

    # 编排依赖
    reconcile_and_load >> verify_partition_health()

revenue_pipeline()
```

#### 本管道的工程健壮性亮点：
1. **随时随地可重跑**：无论手动在 UI 上重刷、失败重试、还是通过 CLI 跑过去两年的补数，数据库数据永远分毫不差；
2. **并发安全保护**：`max_active_runs=2` 确保补数时目标数仓永远不会遭受连接池冲击。
""",
            difficulty=3,
            tips="这就是高可用分析工程的魅力：优雅的幂等 SQL + 合理的调度窗口 + 严密的并发限制 = 7x24 小时零故障安心睡眠！"
        )
    ]

    exercises = [
        single_choice(
            "airflow-c9-e1",
            "在数据工程与调度编排中，“幂等性（Idempotency）”的核心定义是指：",
            [
                {"label": "对同一个批次的数据任务无论执行一次还是重复执行多次，最终在目标存储中产生的业务数据结果完全一致且无副作用", "value": "A"},
                {"label": "任务必须在 1 毫秒之内极速执行完毕", "value": "B"},
                {"label": "任务每次执行后都必须自动向团队全员发送庆祝邮件", "value": "C"},
                {"label": "任务只能在每个月的 1 号执行一次", "value": "D"}
            ],
            "A",
            "幂等性的数学与工程定义为：同一操作反复执行多次与执行一次的效果完全相同，保证重跑和失败重试时绝不产生数据翻倍或脏数据。",
            1,
            "airflow-l9-1",
            ["idempotency", "data-engineering-principles"]
        ),
        single_choice(
            "airflow-c9-e2",
            "如果在一个按天调度的 ETL 任务中，SQL 逻辑写为纯粹的 `INSERT INTO target_table SELECT ...`（无任何查重或清理逻辑），当该任务因为网络抖动在同一天内重试执行了 3 次时，会导致什么灾难后果？",
            [
                {"label": "Airflow 会自动识别并删除多余的重试任务", "value": "A"},
                {"label": "目标表中会出现 3 份完全相同的重复数据，导致所有按该表聚合的金额与指标统计翻 3 倍", "value": "B"},
                {"label": "数据库会自动回滚到一年前的状态", "value": "C"},
                {"label": "所有的字段类型都会自动被强制转换为字符串", "value": "D"}
            ],
            "B",
            "纯 `INSERT INTO` 盲目追加属于典型非幂等反模式。每次重试都会向表中追加一批重复数据，导致下游报表统计翻倍失真。",
            2,
            "airflow-l9-2",
            ["anti-patterns", "non-idempotent", "duplicate-data"]
        ),
        single_choice(
            "airflow-c9-e3",
            "在关系型数据仓库（如 PostgreSQL）中，为了使每日汇总任务具备 100% 幂等性，通常推荐采用哪种写入范式？",
            [
                {"label": "直接执行 `INSERT INTO`，并在末尾加上 `LIMIT 1000`", "value": "A"},
                {"label": "在同一个数据库事务中，先通过 `DELETE FROM target WHERE date = '{{ ds }}'` 清除历史旧数据，再执行 `INSERT INTO` 插入新数据", "value": "B"},
                {"label": "禁止该任务进行任何自动重试，一旦报错让人工手动去数据库修改数据", "value": "C"},
                {"label": "每次运行前将整座数据库完全删除并重建", "value": "D"}
            ],
            "B",
            "两阶段事务（`DELETE + INSERT in Transaction`）先清理当前批次现存旧数据再写入新数据，保证任务无论重跑多少次结果都恒定一致，是经典幂等范式。",
            2,
            "airflow-l9-3",
            ["idempotent-patterns", "delete-insert", "transactions"]
        ),
        single_choice(
            "airflow-c9-e4",
            "若某任务涉及历史累计资产计算（如每日累计账户余额），必须要求上一个调度周期（昨天）的该任务实例必须执行成功后，今天才允许启动，应在任务参数中配置：",
            [
                {"label": "depends_on_past = True", "value": "A"},
                {"label": "wait_forever = True", "value": "B"},
                {"label": "serial_execution = True", "value": "C"},
                {"label": "block_all = True", "value": "D"}
            ],
            "A",
            "`depends_on_past=True` 强制要求该任务在上一个调度周期的实例状态必须为 `SUCCESS`，自身才会放行执行，专门用于处理连续时序继承业务。",
            2,
            "airflow-l9-4",
            ["depends_on_past", "temporal-dependencies"]
        ),
        multiple_choice(
            "airflow-c9-e5",
            "在执行历史补数（Backfill）时，如果不加节制可能引发“补数风暴（Backfill Storm）”，导致下列哪些严重系统性危害？",
            [
                {"label": "瞬间产生数千个并发 DagRun，瞬间耗尽 Worker 进程与操作系统资源", "value": "A"},
                {"label": "成百上千个并发大查询涌入外部业务数据库，将数据库连接池与 CPU 彻底打满引发线上宕机", "value": "B"},
                {"label": "元数据库（PostgreSQL）瞬间并发写过高，导致全集群所有正常任务陷入调度卡死", "value": "C"},
                {"label": "导致公司所有员工的办公电脑屏幕自动变黑", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 展现了无限制补数风暴对 Worker、目标数仓和调度元数据库的毁灭性打击。D 属于荒诞选项。",
            2,
            "airflow-l9-6",
            ["backfill-storm", "concurrency-risks", "infrastructure-health"]
        ),
        multiple_choice(
            "airflow-c9-e6",
            "为了防止历史回溯补数时产生补数风暴冲击目标数仓，数据架构师应该在 DAG 中主动配置哪些并发防护参数？",
            [
                {"label": "`max_active_runs`：限制当前 DAG 同时处于活跃运行状态的最大 DagRun 数量（如设置为 2~4）", "value": "A"},
                {"label": "`max_active_tasks`：限制当前 DAG 下允许同时并发运行的最大任务实例数", "value": "B"},
                {"label": "为访问数据库的任务绑定特定的 `pool`（连接池）并限制槽位上限", "value": "C"},
                {"label": "将所有数据库密码从系统中完全删除", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 构成了防止调度并发过载的三层安全防护网。D 属于无稽之谈。",
            2,
            "airflow-l9-6",
            ["concurrency-control", "max_active_runs", "pools"]
        ),
        multiple_choice(
            "airflow-c9-e7",
            "在大数据平台中，下列属于工业界实现批处理幂等写入的标准技术方案的有：",
            [
                {"label": "在大数据湖（Hive / Spark / Iceberg）中使用 `INSERT OVERWRITE` 按分区覆盖写入", "value": "A"},
                {"label": "在数仓中采用两阶段事务（先 DELETE 当前批次，再 INSERT 写入）", "value": "B"},
                {"label": "先将数据写入临时表，校验通过后执行原子表名互换（Atomic Table Swap）", "value": "C"},
                {"label": "直接向生产表连续写入两次以进行冗余备份", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 是业界三大核心幂等写入范式。D 违背幂等性，属于典型的数据污染反模式。",
            2,
            "airflow-l9-3",
            ["idempotency-patterns", "insert-overwrite", "atomic-swap"]
        ),
        judge(
            "airflow-c9-e8",
            "在编写数据抽取逻辑时，使用 Python 原生的 `datetime.now()` 替代 Airflow 传入的逻辑时间变量（如 `{{ ds }}`），不会影响历史补数（Backfill）的执行结果。",
            "错误",
            "`datetime.now()` 永远返回当前时刻，在回溯历史补数时会导致抽取的全是现实今天的数据，彻底破坏了历史补数能力，属于严重反模式。",
            1,
            "airflow-l9-2",
            ["datetime.now", "anti-patterns", "backfill-hazard"]
        ),
        judge(
            "airflow-c9-e9",
            "通过 Airflow CLI 执行 `airflow dags backfill` 命令，可以在不修改任何 DAG 代码的前提下，为指定历史时间区间批量触发并执行调度任务。",
            "正确",
            "`airflow dags backfill` 是官方强大的历史补数运维命令，支持时间区间、状态重置与并发调控。",
            1,
            "airflow-l9-5",
            ["cli", "backfill", "operations"]
        ),
        judge(
            "airflow-c9-e10",
            "配置了 `max_active_runs=2` 的 DAG，在执行过去 365 天的历史回溯补数时，调度器会严格保证最多只有 2 个历史批次同时在运行，前序批次完成才会放行下一批次。",
            "正确",
            "`max_active_runs` 能够有效遏制 DagRun 瞬间激增，让历史补数平滑稳健推进，保护集群基础设施。",
            2,
            "airflow-l9-6",
            ["max_active_runs", "concurrency-limits"]
        ),
        fill(
            "airflow-c9-e11",
            "无论任务被反复重跑多少次，最终在数据仓库中产生的状态与数据结果均保持完全一致的特性被称为 [BLANK1]（幂等性）；在 Airflow CLI 中执行历史数据回溯重跑的核心命令关键词是 `airflow dags [BLANK2]`。",
            [["幂等性", "Idempotency", "idempotency", "幂等"], ["backfill"]],
            "核心特性为幂等性（Idempotency），补数命令为 `airflow dags backfill`。",
            1,
            "airflow-l9-1",
            ["idempotency", "backfill-cli"]
        ),
        fill(
            "airflow-c9-e12",
            "为了让任务在运行当前周期批次时，严格等待上一个调度周期的自己成功运行结束，应将任务参数配置为 [BLANK1]=True；限制单个 DAG 同时处于运行态的最大 DagRun 数量参数是 [BLANK2]。",
            [["depends_on_past"], ["max_active_runs"]],
            "配置 `depends_on_past=True` 依赖历史自身；配置 `max_active_runs` 限制并发 DagRun 数。",
            2,
            "airflow-l9-4",
            ["depends_on_past", "max_active_runs"]
        ),
        open_ex(
            "airflow-c9-e13",
            "某电商核心财务模型 `marts.daily_store_revenue`（字段：`report_date`, `store_id`, `revenue`）目前由一个 Airflow 任务每天凌晨 2 点调度构建。\n由于近期需要修复历史口径并回溯过去两年的全量数据（约 730 个批次），请设计出一套兼具**绝对幂等性**与**防并发雪崩**的生产级实施方案，要求包含：\n1. 针对目标表的 SQL 写入幂等性设计（防止重试或补数时数据翻倍）；\n2. DAG 级别的并发控制参数配置；\n3. 执行历史补数的标准 CLI 命令格式（回溯从 2022-01-01 到 2023-12-31）。",
            "1. **SQL 写入幂等性设计（两阶段事务覆盖）**：\n在执行写入的 SQL 算子中，使用原子事务保证覆盖：\n```sql\nBEGIN;\n-- 每次写入前，强制删除当前批次的已有记录（支持无限次重跑）\nDELETE FROM marts.daily_store_revenue \nWHERE report_date = cast('{{ ds }}' as date);\n\n-- 抽取左闭右开区间并重新聚合插入\nINSERT INTO marts.daily_store_revenue (report_date, store_id, revenue)\nSELECT\n    cast('{{ ds }}' as date) as report_date,\n    store_id,\n    sum(amount) as revenue\nFROM staging.orders\nWHERE order_time >= '{{ data_interval_start }}'\n  AND order_time < '{{ data_interval_end }}'\nGROUP BY store_id;\nCOMMIT;\n```\n\n2. **DAG 级并发控制参数配置**：\n在 `DAG(...)` 定义中配置限速，防止 730 个批次瞬间打爆数据库：\n```python\nmax_active_runs=3,      # 最多同时允许 3 个历史天的批次在跑\nmax_active_tasks=8,     # 限制并发总任务实例数\n```\n\n3. **执行历史回溯的标准 CLI 命令**：\n```bash\nairflow dags backfill \\\n    --start-date 2022-01-01 \\\n    --end-date 2023-12-31 \\\n    --reset-dagruns \\\n    store_revenue_daily_marts\n```",
            "数仓幂等性设计、并发防护与自动化历史补数综合落地实操考查。",
            [
                {"point": "设计两阶段事务（DELETE where report_date = '{{ ds }}' + INSERT）实现严格幂等覆盖", "score": 2},
                {"point": "在 DAG 中合理配置 max_active_runs（如 2~4）防止补数风暴冲击目标库", "score": 1},
                {"point": "给出规范完整的 airflow dags backfill 命令行，包含 start-date、end-date 及 dag_id", "score": 2}
            ],
            "使用事务先 DELETE 当天再 INSERT；在 DAG 中配置 max_active_runs=3；使用 airflow dags backfill --start-date 2022-01-01 --end-date 2023-12-31 --reset-dagruns <dag_id>。",
            4,
            "airflow-l9-7",
            ["idempotency-design", "backfill-command", "concurrency-defense"]
        )
    ]

    return chapter(
        "airflow-c9",
        "airflow-data-engineering",
        9,
        "幂等性设计与历史回溯补数",
        "深刻掌握数据工程幂等性第一法则，识别并杜绝非幂等追加反模式，精通三大幂等写入范式与 `depends_on_past` 机制，熟练运用 `max_active_runs` 筑起并发防火墙，通过 CLI 高效实施大规模历史回溯补数。",
        lessons,
        exercises
    )
