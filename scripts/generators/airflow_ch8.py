# -*- coding: utf-8 -*-
"""Chapter 8: 调度周期、数据间隔与时间哲学"""

from common import (
    lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter
)

def get_chapter_8():
    lessons = [
        lesson(
            "airflow-l8-1",
            "Airflow 最具争议的概念：执行时间 `execution_date` 与逻辑时间 `logical_date` 的本质",
            """### 让无数初学者抓狂的“时间错位”困惑

在学习 Airflow 时，99% 的新手都会遇到这个令人百思不得其解的现象：
“我的 DAG 设置为 `@daily`（每天运行一次），挂在 2024 年 1 月 2 日凌晨 0:05 启动了。
但我打开 Web 控制台一看，为什么系统显示的运行时间（`execution_date`）赫然写着：**`2024-01-01`**？！
难道 Airflow 的钟表慢了一整天？系统出 Bug 了吗？！”

答案是：**这不是 Bug，而是数据工程最严肃的哲学设计！**

---

### “处理哪个区间的数据” vs “在哪个时间点物理运行”

必须严格区分两个时间维度：
1. **物理执行时间（Wall-clock Time / Run Time）**：
   现实世界里挂在墙上的钟表时间。例如任务在现实中的 2024-01-02 00:05:00 被拉起执行。
2. **逻辑数据时间（Logical Date / 早期称为 Execution Date）**：
   **本次批处理任务所负责处理的数据区间的起点（Start of the Period）！**

```
 物理现实世界时间线:
 ───────┼──────────────────────────────┼─────────────────────────>
     2024-01-01                    2024-01-02 00:05:00
     (数据产生区间开始)             (物理现实时间: 任务在此刻启动!)
     
     └─────────────┬────────────────┘
                   │
                   ▼ (负责处理这 24 小时的数据)
                   Airflow 逻辑调度时间 (logical_date) = 2024-01-01
```

#### 为什么必须这么设计？
你不可能在 1 月 1 日上午 10 点去统计“1 月 1 日全天的总营收”，因为 1 月 1 日还没过完，数据还在不断写入！
你**只能等到 1 月 1 日彻底过完（即 1 月 2 日零点以后）**，才能开始计算 1 月 1 日的数据！
因此，在 1 月 2 日运行的任务，其逻辑标签正是 `2024-01-01`！
""",
            difficulty=2,
            tips="记住金句：Airflow 中的 `logical_date`（即旧版 `execution_date`）永远代表‘正在处理的数据区间的起点’，绝不是现实物理钟表时间！"
        ),
        lesson(
            "airflow-l8-2",
            "数据间隔（Data Interval）概念革命：`data_interval_start` 与 `data_interval_end`",
            """### Airflow 2.2 拨乱反正：引入 Data Interval

由于早期版本的 `execution_date` 词不达意，引发了全行业的误解和痛骂。
从 Airflow 2.2 开始，官方进行了里程碑式的概念升级：正式将时间模型重构为**数据间隔（Data Interval）**！

---

### 数据间隔的核心属性：Start 与 End

每一个批处理任务，本质上都是在处理一个**闭开时间区间 `[start, end)`** 的数据：

```
 批处理数据区间: [data_interval_start, data_interval_end)
 
 例子: 每天调度一次的日任务
 data_interval_start = 2024-01-01 00:00:00 (包含)
 data_interval_end   = 2024-01-02 00:00:00 (不包含)
 
 物理触发时刻: 在 data_interval_end 之后立即启动！
```

---

### 在代码与模板中的优雅落地

现在，工程师再也不需要费劲去想昨天是几号，直接使用两个清晰明了的官方时间对象：
- **`data_interval_start`**（简写为 `{{ data_interval_start }}`）：当前批次负责的数据窗口起点；
- **`data_interval_end`**（简写为 `{{ data_interval_end }}`）：当前批次负责的数据窗口终点。

在 SQL 抽取中，区间过滤从未如此纯粹自然：
```sql
SELECT *
FROM raw.orders
WHERE order_time >= '{{ data_interval_start }}'
  AND order_time < '{{ data_interval_end }}';
```
这段 SQL 无论是在今天跑，还是 3 年后历史补数（Backfill）时重跑，数据区间的边界永远精准锁定、绝对不重不漏！
""",
            difficulty=2,
            tips="在现代 Airflow 中，尽量使用 `data_interval_start` 和 `data_interval_end`，彻底摒弃含混不清的旧词汇！"
        ),
        lesson(
            "airflow-l8-3",
            "调度触发时机哲学：“数据间隔结束之后才触发”背后的批处理因果律",
            """### 深度因果律：为什么 DAG 在 Interval 结束之后才跑？

让我们用一个具体的例子彻底剖析 Airflow 的触发时序：

假设你编写了一个 DAG：
- `start_date = datetime(2024, 1, 1)`
- `schedule = '@daily'`（相当于每天 00:00 周期）

```
 时间轴:
 2024-01-01 00:00:00 ──> 批次 1 开始积累数据...
 2024-01-01 23:59:59 ──> 批次 1 正在接收最后一笔订单
 2024-01-02 00:00:00 ──> 【批次 1 数据区间闭合！】
                         Scheduler 判定批次 1 条件满足，生成 DagRun(2024-01-01) 并触发执行！
```

#### 常见疑惑解答：
- **问**：我在 2024 年 1 月 1 日中午 12 点写好了这个 DAG 并启动了 Airflow，它会立刻执行吗？
- **答**：**不会！** 因为 1 月 1 日这一整天的数据间隔要到 1 月 2 日零点才结束。系统会静静等待，直到 1 月 2 日 00:00 准时触发！
- **问**：那小时级任务呢？（`schedule='@hourly'`）
- **答**：针对 `10:00 ~ 11:00` 这个数据间隔的小时任务，将在物理时间 **11:00:00** 准时点火触发！

这就是批处理调度的因果法则：**只有当一个时间窗口完整闭合，下游对该窗口的统计才有意义！**
""",
            difficulty=2,
            tips="牢记心法口诀：‘区间走完，任务始燃’！按天调度的任务在次日零点跑，按小时调度的任务在下一小时整点跑！"
        ),
        lesson(
            "airflow-l8-4",
            "常用内置时间宏全解：`{{ ds }}`、`{{ ds_nodash }}`、`{{ ts }}` 与 Jinja 宏模板运算",
            """### 分析工程师的必备工具箱：内置时间模板变量

在编写 SQL 查询、Shell 脚本或对象存储路径时，我们频繁需要动态注入当前批次的日期字符串。Airflow 内置了一整套经过工业验证的常用 Jinja 模板宏：

---

### 高频核心时间宏速查

| 模板变量 | 输出格式示例 | 典型应用场景 |
| :--- | :--- | :--- |
| **`{{ ds }}`** | `2024-01-01` | **数仓日常分区字段首选**（`dt = '{{ ds }}'`） |
| **`{{ ds_nodash }}`** | `20240101` | **无连字符紧凑路径**（`s3://bucket/20240101/data.csv`） |
| **`{{ ts }}`** | `2024-01-01T00:00:00+00:00` | ISO 8601 标准完整时间戳 |
| **`{{ ts_nodash }}`** | `20240101T000000` | 包含时分秒的无连字符紧凑时间戳 |
| **`{{ prev_ds }}`** | `2023-12-31` | 上一个调度周期的 `ds` 日期 |
| **`{{ next_ds }}`** | `2024-01-02` | 下一个调度周期的 `ds` 日期 |
| **`{{ dag.dag_id }}`** | `my_pipeline` | 获取当前 DAG 的 ID 字符串 |

---

### 高级 Jinja 表达式与宏运算

在 Jinja 模板中，你不仅能直接输出变量，还能调用内置的 `macros` 模块进行日期加减与格式转换：

```sql
-- 场景 1: 计算当前批次日期的前 7 天
SELECT *
FROM staging.events
WHERE event_date >= '{{ macros.ds_add(ds, -7) }}'
  AND event_date <= '{{ ds }}';

-- 场景 2: 自定义格式化时间戳
-- {{ logical_date.strftime('%Y/%m/%d') }} --> 2024/01/01
```
通过这些开箱即用的时间宏，你的数据管道彻底消除了手工拼写日期的风险。
""",
            difficulty=1,
            tips="最常用的是 `{{ ds }}`（'YYYY-MM-DD'）和 `{{ ds_nodash }}`（'YYYYMMDD'）；跨天计算直接用 `{{ macros.ds_add(ds, -1) }}`！"
        ),
        lesson(
            "airflow-l8-5",
            "自定义调度时间表：Timetables 机制突破传统 Cron 限制（交易所交易日日历）",
            """### 当 Cron 表达式无能为力

标准的 Linux Cron 表达式虽然强大，但它完全基于固定的日历时钟（如每 5 分钟、每天 2 点、每周日）。
但在复杂的现实商业世界中，调度的触发往往**是非周期、甚至是不规则的**：
- **证券交易所（A股/美股）数据管道**：只有在周一至周五且**非国家法定节假日**的交易日（Trading Days）下午 15:30 才能运行，休市日绝对不跑；
- **跨月结算对账**：要求在“每个月的最后一个工作日（Last Working Day of Month）”运行。

Cron 根本无法感知“哪些天是法定节假日”或“月末最后一个工作日”。
Airflow 2.2 引入了 **Timetables（自定义调度时间表）** 架构！

---

### 编写自定义 Timetable 的核心原理

所有自定义时间表继承自 `airflow.timetables.base.Timetable`，只需重写两大核心方法：

1. **`infer_manual_data_interval(run_after)`**：
   当用户在 Web 页面手动点击触发按钮时，该批次应该被赋予怎样的数据区间；
2. **`next_dagrun_info(last_automated_data_interval, restriction)`**：
   **核心中枢**。根据上一次执行的数据区间，计算并返回下一次 DagRun 的 `data_interval` 以及物理触发执行的时间点（`run_after`）。

```python
# 自定义交易日时间表在 DAG 中的极简使用
from airflow import DAG
from my_custom_timetables import StockMarketTradingDaysTimetable

with DAG(
    dag_id='stock_market_eod_pipeline',
    timetable=StockMarketTradingDaysTimetable(),  # ✅ 替代传传统的 schedule 参数！
    start_date=datetime(2024, 1, 1),
    catchup=False
) as dag:
    # 任务代码仅在真实交易日收盘后自动运行！
```
Timetables 让 Airflow 具备了适应任何现实复杂商业日历的无限编排能力！
""",
            difficulty=3,
            tips="遇到‘法定节假日跳过’、‘交易日专属’或‘工作日月末’需求，果断采用自定义 Timetable 方案，不要在 Python 脚本里手写丑陋的 IF 判定！"
        ),
        lesson(
            "airflow-l8-6",
            "时区危机与统一治理：UTC 哲学与本地时区（Timezone-aware DAGs）配置",
            """### 现代数据工程的时区灾难

时区问题是每一个跨国或企业级数据团队挥之不去的噩梦：
- 数据库服务器部署在欧洲（UTC+0）；
- 业务系统业务发生在北京时间（UTC+8）；
- 某个开发者本地电脑是纽约时间（EST，受夏令时 Daylight Saving Time 影响）。
如果所有人都在代码里直接写 `datetime(2024, 1, 1, 8, 0)`（天真无时区对象 Naive Datetime）：
到了夏令时切换的那一天，任务要么少跑了一次，要么一天跑了两次，引发天价财务对账事故！

---

### Airflow 的“UTC 绝对基准”哲学

为了消除时区混乱，Airflow 确立了铁律：
**底层调度器、元数据库存储与所有内部时间戳，全部严格统一基于 UTC（世界协调时）！**

---

### 如何正确配置本地时区 DAG？

如果你希望一个 DAG 严格按照“北京时间（Asia/Shanghai）每天早晨 8 点”执行，不要自己在脑子里去心算减去 8 小时写 Cron！
利用 `pendulum` 库声明带时区的 `datetime`：

```python
from airflow import DAG
import pendulum

# 1. 显式声明本地业务时区
local_tz = pendulum.timezone("Asia/Shanghai")

with DAG(
    dag_id='beijing_morning_sync',
    # 2. start_date 必须绑定本地时区对象
    start_date=pendulum.datetime(2024, 1, 1, tz=local_tz),
    # 3. 此时的 Cron 表达式 '0 8 * * *' 将严格按照北京时间早上 8:00 准时触发！
    schedule='0 8 * * *',
    catchup=False
) as dag:
    # ...
```

Airflow 会在底层自动处理夏令时跳变与时区换算，在保证数仓内部 UTC 一致性的同时，为业务方提供完全符合当地作息的触发体验！
""",
            difficulty=2,
            tips="绝不要在 DAG 里使用原生无时区的 `datetime.now()` 或心算 UTC 偏移！永远使用 `pendulum.timezone('Asia/Shanghai')` 声明带时区的 `start_date`！"
        ),
        lesson(
            "airflow-l8-7",
            "时间参数在增量抽取与分区落盘中的全流程落地",
            """### 端到端实战：基于时间的幂等增量分区管道

在本实战中，我们将完整编写一条从业务数据库中按天增量拉取数据、格式化落盘并注册 Hive/S3 分区的端到端数据流水线：
- 抽取时间范围：严格锁定 `[data_interval_start, data_interval_end)`；
- 存储目标分区：`dt={{ ds }}`。

---

### 完整工业级代码实现

```python
from airflow.decorators import dag, task
from airflow.providers.common.sql.operators.sql import SQLExecuteQueryOperator
import pendulum

local_tz = pendulum.timezone("Asia/Shanghai")

@dag(
    dag_id='idempotent_daily_partition_pipeline',
    start_date=pendulum.datetime(2024, 1, 1, tz=local_tz),
    schedule='0 2 * * *',  # 北京时间每天凌晨 2 点准时触发昨日批次
    catchup=False,
    tags=['production', 'incremental']
)
def incremental_sync_flow():

    # 1. 在数仓中创建当天的物理增量分区表
    prepare_partition = SQLExecuteQueryOperator(
        task_id='prepare_partition',
        conn_id='dw_postgres',
        sql='''
            CREATE TABLE IF NOT EXISTS marts.daily_orders_{{ ds_nodash }} (
                LIKE marts.daily_orders INCLUDING ALL
            );
            TRUNCATE TABLE marts.daily_orders_{{ ds_nodash }};
        '''
    )

    # 2. 执行严密的时间区间抽取 (保证 100% 不重不漏)
    sync_incremental_data = SQLExecuteQueryOperator(
        task_id='sync_incremental_data',
        conn_id='dw_postgres',
        sql='''
            INSERT INTO marts.daily_orders_{{ ds_nodash }}
            SELECT *
            FROM raw.source_orders
            WHERE created_at >= '{{ data_interval_start }}'
              AND created_at < '{{ data_interval_end }}';
        '''
    )

    # 3. 后置数据质量行数校验
    @task
    def audit_partition_records(ds=None):
        print(f"对分区 dt={ds} 的数据行数与完整性进行自动化合规审计...")
        return "audit_passed"

    # 编排执行依赖
    audit_step = audit_partition_records()
    prepare_partition >> sync_incremental_data >> audit_step

incremental_sync_flow()
```
""",
            difficulty=2,
            tips="看清楚 `created_at >= '{{ data_interval_start }}' AND created_at < '{{ data_interval_end }}'` 了吗？这种左闭右开的设计能够保证相邻两天的批次数据在毫秒级别严丝合缝，绝不重数也不漏数！"
        )
    ]

    exercises = [
        single_choice(
            "airflow-c8-e1",
            "在 Airflow 的批处理调度模型中，一个配置为 `@daily`、负责处理 2024 年 5 月 1 日全天数据的任务，在现实物理钟表时间中最快会在哪个时刻被调度器触发点火运行？",
            [
                {"label": "2024 年 5 月 1 日凌晨 00:00:00", "value": "A"},
                {"label": "2024 年 5 月 1 日中午 12:00:00", "value": "B"},
                {"label": "2024 年 5 月 2 日凌晨 00:00:00 之后", "value": "C"},
                {"label": "2024 年 4 月 30 日晚上 23:59:59", "value": "D"}
            ],
            "C",
            "Airflow 批处理因果律：只有当整个数据时间窗口（5 月 1 日全天）完整走完闭合后，即在 5 月 2 日零点之后，系统才会触发该批次的 DagRun 执行。",
            1,
            "airflow-l8-3",
            ["scheduling-logic", "data-interval", "dagrun-trigger"]
        ),
        single_choice(
            "airflow-c8-e2",
            "在 Airflow 2.2+ 现代规范中，代表当前调度批次所负责处理的数据窗口起点的官方推荐模板变量是：",
            [
                {"label": "{{ data_interval_start }}", "value": "A"},
                {"label": "{{ start_time }}", "value": "B"},
                {"label": "{{ batch_start_date }}", "value": "C"},
                {"label": "{{ current_timestamp }}", "value": "D"}
            ],
            "A",
            "Airflow 2.2+ 正式引入 `data_interval_start` 与 `data_interval_end` 来清晰界定批处理数据区间的左闭右开时间边界。",
            1,
            "airflow-l8-2",
            ["data_interval_start", "jinja-variables", "terminology"]
        ),
        single_choice(
            "airflow-c8-e3",
            "在 Airflow 内置的 Jinja 宏变量中，输出格式为形如 `'2024-01-01'`（YYYY-MM-DD 格式）的最常用日期字符串变量是：",
            [
                {"label": "{{ ds }}", "value": "A"},
                {"label": "{{ ds_nodash }}", "value": "B"},
                {"label": "{{ ts }}", "value": "C"},
                {"label": "{{ date_now }}", "value": "D"}
            ],
            "A",
            "`{{ ds }}` 是 Airflow 最经典的高频时间宏，输出 'YYYY-MM-DD' 格式的逻辑日期字符串。",
            1,
            "airflow-l8-4",
            ["jinja-macros", "ds", "formatting"]
        ),
        single_choice(
            "airflow-c8-e4",
            "为了让 DAG 严格按照北京时间（UTC+8）每天上午 8 点准时调度，同时避免夏令时跳变带来的时间混乱，在定义 DAG 时最佳的工程做法是：",
            [
                {"label": "直接在本地电脑修改操作系统时钟，并在 Cron 表达式中随意填写", "value": "A"},
                {"label": "在脑子里心算减去 8 小时，将 Cron 写成 UTC 零点触发", "value": "B"},
                {"label": "使用 `pendulum.timezone('Asia/Shanghai')` 声明带时区的 `start_date`", "value": "C"},
                {"label": "在每个 Python 函数开头调用 time.sleep(28800)", "value": "D"}
            ],
            "C",
            "最佳实践是使用 `pendulum.timezone(...)` 为 `start_date` 绑定明确的 IANA 时区，让 Airflow 自动进行高精度时区感知调度。",
            2,
            "airflow-l8-6",
            ["timezones", "pendulum", "asia-shanghai"]
        ),
        multiple_choice(
            "airflow-c8-e5",
            "关于 Airflow 的时间哲学，下列表述符合系统底层设计原理的有：",
            [
                {"label": "`logical_date`（即旧版 `execution_date`）代表的是该任务正在处理的数据区间的起点，而非现实物理运行时间", "value": "A"},
                {"label": "批处理任务在物理现实时间上总是在其负责的数据区间（Data Interval）结束之后才启动", "value": "B"},
                {"label": "采用 `[data_interval_start, data_interval_end)` 的左闭右开区间能保证批处理数据不重不漏", "value": "C"},
                {"label": "Airflow 会在每天调度前向所有员工手机拨打语音电话确认时间", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 准确刻画了 Airflow 严谨的时间哲学与批处理因果律。D 为荒诞选项。",
            1,
            "airflow-l8-1",
            ["time-philosophy", "logical_date", "data-interval"]
        ),
        multiple_choice(
            "airflow-c8-e6",
            "在 SQL 查询或路径拼接中，下列关于常用内置时间模板宏的输出示例正确的有：",
            [
                {"label": "`{{ ds }}` 输出形如 `2024-05-20`", "value": "A"},
                {"label": "`{{ ds_nodash }}` 输出形如 `20240520`（无中划线）", "value": "B"},
                {"label": "`{{ macros.ds_add(ds, -1) }}` 能够获取前一天的日期字符串", "value": "C"},
                {"label": "`{{ ds }}` 会随机输出世界上某一个国家的独立日日期", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 均为标准时间宏的表现与用法。D 纯属捏造。",
            1,
            "airflow-l8-4",
            ["jinja", "built-in-macros", "ds_nodash"]
        ),
        multiple_choice(
            "airflow-c8-e7",
            "当面对无法用简单 Cron 表达式表达的不规则调度需求（例如仅在证券交易所开盘日调度、或每个月最后一个工作日调度）时，现代 Airflow 提供的原生高级架构解决方案是：",
            [
                {"label": "编写继承自 `airflow.timetables.base.Timetable` 的自定义时间表类", "value": "A"},
                {"label": "在自定义时间表中重写 `next_dagrun_info` 方法精确计算下一次调度时间点", "value": "B"},
                {"label": "在 DAG 中通过 `timetable=CustomTimetable()` 替代传统的 `schedule` 参数", "value": "C"},
                {"label": "每隔 10 秒手动打开浏览器在 Web 界面疯狂点击 Trigger 按钮", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 展现了 Airflow Timetables 架构解决复杂非规律日历调度的标准姿态。D 极其原始低效且无法自动化。",
            2,
            "airflow-l8-5",
            ["timetables", "custom-scheduling", "financial-calendars"]
        ),
        judge(
            "airflow-c8-e8",
            "在 Airflow 中，如果一个任务在 2024-06-02 凌晨 00:05 运行，且它的 `logical_date` 是 2024-06-01，这属于调度器异常延迟的严重故障。",
            "错误",
            "这完全正常。对于 `@daily` 任务，2024-06-02 凌晨正是处理 2024-06-01 全天数据批次的法定正常触发时机。",
            1,
            "airflow-l8-1",
            ["logical_date", "scheduling-principles"]
        ),
        judge(
            "airflow-c8-e9",
            "`{{ data_interval_end }}` 永远等于 `data_interval_start` 加上一个调度周期的时间间隔（例如加上 1 天或 1 小时）。",
            "正确",
            "对于规律周期的 DAG，`data_interval_end` 恰好是当前周期区间闭合的终止时间点。",
            1,
            "airflow-l8-2",
            ["data-interval", "interval-math"]
        ),
        judge(
            "airflow-c8-e10",
            "在 SQL 中使用 `WHERE order_time >= '{{ data_interval_start }}' AND order_time < '{{ data_interval_end }}'` 可以实现相邻两次批次数据边界的严密无缝衔接，杜绝重数与漏数。",
            "正确",
            "左闭右开 `[start, end)` 是数据库时间序列切分与批处理抽取的黄金准则。",
            2,
            "airflow-l8-7",
            ["idempotency", "data-interval-bounds"]
        ),
        fill(
            "airflow-c8-e11",
            "在 Airflow 模板中，若要输出没有破折号的年月日紧凑日期格式（如 20240101），应使用的 Jinja 宏名称是 [BLANK1]；在宏函数中将当前 ds 日期增加 3 天的内置语法是 `{{ macros.[BLANK2](ds, 3) }}`。",
            [["{{ ds_nodash }}", "ds_nodash"], ["ds_add"]],
            "使用 `{{ ds_nodash }}` 输出紧凑日期；使用 `macros.ds_add(ds, 3)` 进行日期加减。",
            1,
            "airflow-l8-4",
            ["jinja-macros", "ds_nodash", "ds_add"]
        ),
        fill(
            "airflow-c8-e12",
            "为了定义具有明确时区感知能力的工作流，官方推荐使用第三方 Python 日期库 [BLANK1]；替换传统 Cron 表达式以支持复杂商业交易日历的自定义调度接口是 [BLANK2]（Timetable）。",
            [["pendulum", "Pendulum"], ["timetable", "Timetable", "timetables"]],
            "时区处理首选 `pendulum`，自定义日历调度使用 `timetable`。",
            2,
            "airflow-l8-5",
            ["pendulum", "timetables"]
        ),
        open_ex(
            "airflow-c8-e13",
            "某跨国物流数仓需要编写一个每日包裹流水抽取与指标落地任务：\n1. 每天在本地北京时间（`Asia/Shanghai`）凌晨 01:30 执行一次；\n2. 负责抽取昨日一整天的数据，要求使用最严谨的现代时间参数（`data_interval_start` 与 `data_interval_end`）进行左闭右开 SQL 过滤，插入当天分区 `logistics.daily_shipments_{{ ds_nodash }}`；\n3. 简要说明为什么在时间区间过滤中必须使用 `order_time >= start AND order_time < end`（左闭右开），而不能使用 `BETWEEN ... AND ...`（双闭区间）。\n\n请完整写出该 DAG 的 Python 脚本，并在注释或说明中回答第 3 问的数据库边界原理。",
            "```python\nimport pendulum\nfrom airflow import DAG\nfrom airflow.providers.common.sql.operators.sql import SQLExecuteQueryOperator\n\n# 1. 绑定 Asia/Shanghai 时区\nlocal_tz = pendulum.timezone(\"Asia/Shanghai\")\n\nwith DAG(\n    dag_id='logistics_daily_shipment_sync',\n    start_date=pendulum.datetime(2024, 1, 1, tz=local_tz),\n    schedule='30 1 * * *',  # 北京时间凌晨 01:30 准时触发\n    catchup=False,\n    tags=['logistics', 'idempotent']\n) as dag:\n\n    # 2. 严密的增量抽取并写入目标分区\n    sync_task = SQLExecuteQueryOperator(\n        task_id='sync_yesterday_shipments',\n        conn_id='warehouse_postgres',\n        sql=\"\"\"\n            INSERT INTO logistics.daily_shipments_{{ ds_nodash }}\n            SELECT * \n            FROM source_db.shipments\n            WHERE shipment_created_at >= '{{ data_interval_start }}'\n              AND shipment_created_at < '{{ data_interval_end }}';\n        \"\"\"\n    )\n```\n\n**为什么必须使用左闭右开（`>= start AND < end`）而严禁使用 `BETWEEN`**：\n`BETWEEN start AND end` 在 SQL 标准中是**双闭区间**（包含两端边界值）。如果今天批次过滤 `BETWEEN 00:00:00 AND 23:59:59`，一旦数据库时间戳包含毫秒/微秒（例如 `23:59:59.850`），就会发生漏数；而若写成 `BETWEEN 00:00:00 AND 24:00:00`，两端都在边界上，那么恰好发生在次日 `00:00:00.000` 那个瞬间的记录就会同时被昨天批次和今天批次重复统计两次（发生数据重复 double-counting）！采用 `[start, end)` 左闭右开区间能在数学上保证连续相邻分区 100% 不重不漏、绝对严密！",
            "调度时间哲学、时区配置及左闭右开边界一致性原理综合考查。",
            [
                {"point": "正确使用 pendulum.timezone('Asia/Shanghai') 并配置 schedule='30 1 * * *'", "score": 1},
                {"point": "在 SQL 中正确使用 data_interval_start 与 data_interval_end 及 ds_nodash 分区", "score": 2},
                {"point": "深刻解释左闭右开防止高精度微秒漏数以及防止双闭 BETWEEN 导致 00:00:00 边界重复统计的数学因果原理", "score": 2}
            ],
            "使用 pendulum 时区；使用 SQLExecuteQueryOperator，在 SQL 中写 >= data_interval_start AND < data_interval_end；清晰解释 BETWEEN 双闭区间会导致边界重复统计或微秒截断漏数。",
            4,
            "airflow-l8-7",
            ["idempotency-coding", "boundary-conditions", "between-vs-half-open"]
        )
    ]

    return chapter(
        "airflow-c8",
        "airflow-data-engineering",
        8,
        "调度周期、数据间隔与时间哲学",
        "彻底解开 `logical_date` 与现实时间的错位之谜，深入掌握 Airflow 2.2 数据间隔（Data Interval）革命与批处理因果律，精通常用 Jinja 时间宏与 Pendulum 时区治理，理解自定义 Timetable 突破传统 Cron 限制。",
        lessons,
        exercises
    )
