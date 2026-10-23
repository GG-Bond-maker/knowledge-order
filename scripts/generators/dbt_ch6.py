# -*- coding: utf-8 -*-
"""Chapter 6: 物化策略深度剖析 (view / table / incremental / ephemeral)"""

from common import (
    lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter
)

def get_chapter_6():
    lessons = [
        lesson(
            "dbt-l6-1",
            "dbt 四大核心物化策略概览与底层 DDL 生成机制",
            """### 什么是物化策略（Materializations）？

在 dbt 中，你编写的代码几乎始终只是纯粹的 `SELECT` 查询语句。你**不需要**手写 `CREATE TABLE`、`CREATE VIEW`、`DROP TABLE` 或复杂的 `MERGE INTO`。
那么，dbt 如何将这一段 `SELECT` 变成数据仓库中可供 BI 和分析师查询的实体对象？
这就是**物化策略（Materialization）**的核心功能。

物化策略是 dbt 的编译器模板，它定义了**“如何将一段 SELECT 查询落地到数据仓库中”**。dbt 预置了四大官方核心物化类型：
1. **`view`（视图）**：在数据库中运行 `CREATE OR REPLACE VIEW ... AS SELECT ...`，不消耗额外物理存储，查询时动态实时计算。
2. **`table`（物理表）**：在数据库中运行两阶段事务替换（通常是 `CREATE TABLE ...__dbt_tmp AS ...`，然后原子 `SWAP` 或 `DROP & RENAME`），将结果物化为物理表。
3. **`incremental`（增量表）**：首次运行时创建物理表；后续运行时仅转换并插入/合并“新产生或发生变更”的数据行，节省海量计算资源。
4. **`ephemeral`（轻量临时表 / CTE）**：不在数据库中创建任何实际的表或视图，而是将该模型的 SQL 直接作为公共表表达式（CTE / `WITH ... AS (...)`）内联注入到下游引用它的模型中。

---

### 物化策略的底层 DDL 转换剖析

| 物化类型 | 数据库内部实际对象 | 存储消耗 | 查询时性能 | dbt build 耗时 |
| :--- | :--- | :--- | :--- | :--- |
| **`view`** | `VIEW` 逻辑对象 | 零（仅元数据） | 取决于底层查询复杂度 | 极快（毫秒级元数据注册） |
| **`table`** | `TABLE` 物理存储表 | 全量物理存储 | 极快（无需重复计算转换） | 较慢（每次全量重算重写） |
| **`incremental`** | `TABLE` 物理存储表 | 全量物理存储 | 极快 | 极快（日常增量只算增量部分） |
| **`ephemeral`** | **无**（纯内存 CTE 内联） | 零 | 取决于下游引用方的优化器 | 零（纯本地文本替换） |

---

### 如何配置物化策略？

可以通过两种方式配置物化策略：
1. **模型文件内局部显式配置**（推荐针对特殊模型）：
```sql
-- models/marts/finance/fct_orders.sql
{{ config(
    materialized='table'
) }}

select * from ...
```
2. **`dbt_project.yml` 按目录全局级联配置**（推荐作为基准规范）：
```yaml
# dbt_project.yml
models:
  my_project:
    staging:
      +materialized: view
    marts:
      +materialized: table
```
""",
            difficulty=1,
            tips="理解物化策略的本质是：dbt 替你接管了所有的 DDL 和数据迁移事务。你只负责写业务纯函数式 SELECT，底层建表建视图由 dbt 智能完成！"
        ),
        lesson(
            "dbt-l6-2",
            "View 与 Table 物化对比：计算时机、存储权衡与适用边界",
            """### 深度权衡：View vs Table

在现代云数据仓库（如 Snowflake, BigQuery, Databricks, Redshift, DuckDB）中，视图与物理表的选择绝不仅是语法差异，它直接决定了**云账单成本**与**查询响应延迟**。

```
       ┌────────────────────────┐
       │   View (按需计算)       │
       │   - 零物理存储开销      │
       │   - 每次查询都重新计算  │
       │   - 保证数据 100% 实时  │
       └────────────────────────┘
                    VS
       ┌────────────────────────┐
       │   Table (预先计算)      │
       │   - 占用物理磁盘存储    │
       │   - 查询极快直接读取    │
       │   - 数据新鲜度取决于定时│
       └────────────────────────┘
```

---

### 1. View（视图）的核心优势与软肋

#### 优势
- **永远最新**：任何时候查询 View，它都会穿透查询底层原始表，数据新鲜度 100% 保持最新。
- **存储开销为零**：没有磁盘数据副本，不会产生存储租金。
- **构建极其敏捷**：在 CI/CD 测试或本地开发时，`dbt run` 瞬间完成。

#### 软肋
- **多层视图嵌套的“爆炸效应”**：如果 `view_a` 依赖 `view_b`，`view_b` 依赖 `view_c`，当下游 BI 仪表盘查询 `view_a` 时，底层执行引擎需要同时展开并执行 3 层的全部计算，引发查询超时或高额的并发计算费用！

---

### 2. Table（物理表）的核心优势与软肋

#### 优势
- **BI 查询极致性能**：数据在模型构建时已经计算完毕并按列存格式写入磁盘，分析师查询时几乎可以秒级返回。
- **阻断依赖计算风暴**：一旦将底层复杂中间层物化为物理表，后续所有下游查询只需要直接读表，不再重复触发上游的昂贵计算。

#### 软肋
- **更新需要定时重跑**：数据新鲜度取决于 Airflow 或定时调度器运行 `dbt run` 的频次。
- **全量计算开销巨大**：如果表数据量达到数千万甚至数十亿行，每次运行全量 `CREATE TABLE ... AS SELECT` 将极其缓慢且极其昂贵。

---

### 最佳工程实践决策树

1. **Staging 层**：优先 `view`。因为源数据本身已在物理表，Staging 只是 1:1 轻量类型转换，无需额外存储。
2. **Intermediate 层**：轻量级关联用 `view` 或 `ephemeral`；如果有重度窗口函数或笛卡尔积过滤，改用 `table` 阻断计算下推。
3. **Marts 维度表**：统一使用 `table`。因为维度表通常行数有限（数千至数百万行），物理表能为 BI 报表带来最快响应。
4. **Marts 事实表**：中小型事实表（几百万行以内）用 `table`；千万/亿级以上流水表必须采用 `incremental`（增量表）。
""",
            difficulty=2,
            tips="记住一个实用准则：在研发初期默认 staging/intermediate 采用 view，marts 采用 table；当监控发现某张表运行时长或下游查询变慢时，再进行针对性调整。"
        ),
        lesson(
            "dbt-l6-3",
            "Ephemeral 虚拟临时公共表表达式 (CTE) 与零物理开销复用",
            """### 什么是 Ephemeral 物化？

在传统的数仓管理中，为了复用一段中间代码，你可能不得不让 DBA 建一个 `VIEW`。
但在大型数仓中，成百上千个微小的中间视图会导致数据库 Catalog（元数据目录）极度混乱，充斥着大量业务根本用不到的“垃圾视图”。

dbt 引入了 **`ephemeral`（短暂的/虚无的）** 物化策略：
- **不产生物理对象**：在目标数据仓库中，你看不到任何以该模型命名的 TABLE 或 VIEW。
- **代码级内联（Inlined CTE）**：当模型 B `ref('model_a')`（而 `model_a` 是 `ephemeral`）时，dbt 编译器在渲染模型 B 的 SQL 时，会把 `model_a` 的整段 SQL 自动包装成一个 CTE，注入到模型 B 的顶部！

```
[模型定义]
models/intermediate/int_active_users.sql (materialized='ephemeral')
select user_id, email from raw_users where is_active = true;

[下游模型]
models/marts/dim_customers.sql (materialized='table')
select * from {{ ref('int_active_users') }};

[dbt 编译输出的真实 SQL]
with __dbt__cte__int_active_users as (
    select user_id, email from raw_users where is_active = true
)
select * from __dbt__cte__int_active_users;
```

---

### Ephemeral 的适用场景与限制

#### 适用场景
1. **超轻量的内部公用逻辑**：比如对某个代码表进行状态映射、轻度字段拼接，不需要在数仓里留存实体。
2. **保持数仓模式干净**：防止 BI 工具在连接数据库时扫描出一堆以 `int_` 开头的中间过渡视图。

#### 局限性与避坑指南
1. **不能直接被 `dbt test` 单独测试**：因为数据库里没有真实实体，常规的针对数据库列的测试会受到限制。
2. **多处引用导致重复执行**：如果模型 C 和模型 D 都引用了同一个 `ephemeral` 模型，该 CTE 会被分别注入到 C 和 D 中，在执行时被重复计算两次！
3. **不能作为增量模型的目标或直接源**：某些复杂依赖会导致增量逻辑的 SQL 嵌套过深，调试困难。
""",
            difficulty=2,
            tips="用好 ephemeral 可以让你的数据库只暴露核心商业资产；但切记：只要某个模型逻辑重、计算耗时多，就绝对不要设为 ephemeral，请设为 view 或 table！"
        ),
        lesson(
            "dbt-l6-4",
            "增量模型（Incremental）精髓：`is_incremental()` 宏与过滤窗口设计",
            """### 增量模型的核心思想

当你的事实表数据量增长到 1 亿行、10 亿行时，每天运行一次 `CREATE TABLE AS SELECT` 全量重算将面临：
- 耗时从 5 分钟激增到 2 个小时；
- 云数仓按运行时间或扫描字节收费，单次账单成百上千美元；
- 管道运行失败重试成本极高。

**增量模型（Incremental Materialization）** 的核心思想是：
**首次运行时全量构建；后续运行时，只转换并写入“自上次运行以来产生的新数据或变更数据”！**

---

### `is_incremental()` 核心宏语法

在增量模型中，dbt 提供了内置的 Jinja 条件宏 `is_incremental()`。
`is_incremental()` 在同时满足以下条件时返回 `true`：
1. 目标表已经在数据仓库中真实存在；
2. dbt 没有传入 `--full-refresh` 参数；
3. 本模型的物化类型为 `incremental`。

#### 标准增量模型代码结构

```sql
-- models/marts/telecom/fct_call_logs.sql
{{ config(
    materialized='incremental',
    unique_key='call_id'
) }}

with source_calls as (
    select * from {{ ref('stg_telecom__calls') }}
),

final as (
    select
        call_id,
        user_id,
        call_duration_seconds,
        call_start_time,
        created_at
    from source_calls
    
    {% if is_incremental() %}
        -- 核心：增量过滤窗口（只捞取比现有表中最大时间戳更新的数据）
        where created_at > (select max(created_at) from {{ this }})
    {% endif %}
)

select * from final
```

---

### 理解神秘的 `{{ this }}` 指针

在上面的代码中，`{{ this }}` 是 dbt 内置的特殊上下文对象，它代表**“当前正在构建的模型在数据库中现存的已物化表对象”**。
- 当 `is_incremental()` 生效时，`{{ this }}` 指向数仓里昨天跑完的那张 `fct_call_logs`；
- `(select max(created_at) from {{ this }})` 会直接查出数据库中现存的最大时间戳，实现自动的高水位线（High-Water Mark）定位！
""",
            difficulty=3,
            tips="牢记 `{{ this }}` 永远指代当前模型自己在数据库中已存在的物理表。通过 `select max(...) from {{ this }}`，你的增量模型就拥有了自动追踪高水位线的能力！"
        ),
        lesson(
            "dbt-l6-5",
            "增量更新的三大合并策略：`merge`、`delete+insert` 与 `append` 详解",
            """### 增量数据如何写入现有物理表？

当 dbt 通过增量过滤查出今天的 5 万条增量数据后，它该以什么方式写入已经存有 1000 万条历史记录的物理表中？
dbt 提供了三大主流策略（Strategy），可通过 `incremental_strategy` 配置：

---

### 1. `merge` 策略（最常用、现代云数仓默认推荐）
- **适用适配器**：Snowflake, BigQuery, Databricks, PostgreSQL (v15+), DuckDB。
- **机制**：底层使用标准 SQL `MERGE INTO target USING staging ON target.unique_key = staging.unique_key WHEN MATCHED THEN UPDATE ... WHEN NOT MATCHED THEN INSERT ...`。
- **特点**：既能插入新行（Insert），又能自动更新发生变更的已有行（Update）。
- **配置示例**：
```sql
{{ config(
    materialized='incremental',
    unique_key='order_id',
    incremental_strategy='merge'
) }}
```

---

### 2. `delete+insert` 策略
- **适用适配器**：不支持原生 `MERGE` 的传统数据库或某些特殊分布式仓库（如早期 Redshift 或自建 Postgres）。
- **机制**：
  1. 首先执行两阶段事务：在目标表中删除所有在当前批次中出现的主键：
     `DELETE FROM target WHERE unique_key IN (SELECT unique_key FROM incoming_batch);`
  2. 然后将所有增量批次数据追加插入：
     `INSERT INTO target SELECT * FROM incoming_batch;`
- **特点**：规避了复杂的 `MERGE` 语法，性能在特定引擎中甚至比 MERGE 更稳定。

---

### 3. `append` 策略（只追加、不可变流水）
- **机制**：不论主键是否存在，直接执行 `INSERT INTO target SELECT ...`。
- **特点**：速度极快，不执行任何查重对比。
- **适用场景**：**天然只读不可变（Append-Only）**的事件流数据，例如用户点击流日志（Clickstream Logs）、IoT 传感器读数、系统告警日志。由于历史数据绝不会被篡改，完全不需要消耗性能去匹配主键更新。
- **配置示例**：
```sql
{{ config(
    materialized='incremental',
    incremental_strategy='append'
) }}
```
""",
            difficulty=3,
            tips="如果业务数据存在状态流转（例如订单从 pending 变为 paid），必须使用 `merge` 或 `delete+insert` 配合 `unique_key`；如果是不可变日志流，使用 `append` 能大幅减少合并开销！"
        ),
        lesson(
            "dbt-l6-6",
            "`unique_key` 设计陷阱与多字段复合唯一键处理",
            """### 增量合并的生命线：`unique_key`

在使用 `merge` 或 `delete+insert` 时，dbt 必须依靠 `unique_key` 来判断增量批次里的某一行到底对应历史表里的哪一行。
如果 `unique_key` 配置不当，会导致灾难性的数据重复或数据丢失！

---

### 1. 单字段唯一键
如果模型中存在天然的全局唯一业务主键（如 `order_id`、`invoice_id`），直接声明字符串即可：
```sql
{{ config(
    materialized='incremental',
    unique_key='order_id'
) }}
```

### 2. 复合唯一键（Composite Unique Key）的处理
在很多业务场景中，单一字段无法唯一确定一行。例如：
- 电商库存快照表：唯一性由 `snapshot_date` 和 `warehouse_id` 以及 `sku_id` 共同决定；
- 用户广告转化归因：唯一性由 `user_id` 和 `ad_campaign_id` 决定。

dbt 支持两种方式处理复合主键：

#### 方案 A：原生数组语法（推荐）
在支持该特性的现代适配器（如 Snowflake, BigQuery, Databricks）中，直接以列表形式传递多个字段：
```sql
{{ config(
    materialized='incremental',
    unique_key=['snapshot_date', 'warehouse_id', 'sku_id']
) }}
```
底层 dbt 会自动将其渲染为 `ON t.snapshot_date = s.snapshot_date AND t.warehouse_id = s.warehouse_id AND t.sku_id = s.sku_id`。

#### 方案 B：生成代理哈希主键（Surrogate Key）
对于通用跨平台项目，最佳工程实践是在 SQL 内部使用哈希函数拼装一个全局唯一的主键列：
```sql
with source as (
    select * from {{ ref('stg_inventory') }}
),
prepped as (
    select
        -- 使用 MD5 或 dbt_utils.generate_surrogate_key
        md5(concat(coalesce(snapshot_date, ''), '|', coalesce(warehouse_id, ''), '|', coalesce(sku_id, ''))) as inventory_pk,
        snapshot_date,
        warehouse_id,
        sku_id,
        quantity_on_hand
    from source
)
select * from prepped
```
然后在头部声明 `unique_key='inventory_pk'`。这种方式兼容所有 SQL 引擎，且主键清晰明了。

---

### 致命陷阱：迟到数据与滑动安全窗口（Lookback Window）

在高并发生产环境中，往往存在**网络延迟或跨时区上传导致的数据延迟到达（Late-Arriving Data）**。
如果增量条件仅写 `where created_at > (select max(created_at) from {{ this }})`，那么昨天由于网络中断今天才补报的历史订单就会被**永久遗漏**！

**生产级解决方案：滑动回溯安全窗口（Lookback Window）**：
```sql
{% if is_incremental() %}
    -- 不是只看最大值，而是向前回溯 3 天，覆盖延迟数据与退款更新
    where updated_at >= (
        select dateadd('day', -3, max(updated_at)) from {{ this }}
    )
{% endif %}
```
配合 `unique_key='order_id'`，任何在过去 3 天内迟到或变更的数据行都会被扫描出来并安全更新到物理表中，杜绝漏数！
""",
            difficulty=3,
            tips="工业级增量模型标配：永远监控更新时间 `updated_at` 而非只看创建时间 `created_at`，并且必须设置 2~3 天的回溯安全窗口搭配 unique_key 进行幂等合并！"
        ),
        lesson(
            "dbt-l6-7",
            "全量重建参数 `--full-refresh` 的执行逻辑与历史重刷规范",
            """### 何时需要打破增量，全量重刷？

增量模型一旦在数据库中建好，就会像滚雪球一样持续运转。但遇到以下几种情况时，现有的增量表结构或历史数据将不再可信：
1. **上游新增了历史字段**：例如你在模型中新增了一列 `customer_tier`，如果不全量重算，只有未来的新增行会有这个字段，历史几千万行全都是 NULL。
2. **核心业务逻辑变更**：公司修改了收入确认公式（例如从前含税现在不含税），全量历史指标需要重算纠偏。
3. **主键规则或分层架构重构**：修改了 `unique_key` 或表结构。

此时，必须强制进行**全量重建（Full Refresh）**！

---

### `--full-refresh` 的执行机制

在命令行执行：
```bash
dbt run --select fct_orders --full-refresh
```
当传入 `--full-refresh` 参数时：
1. dbt 会临时忽略模型的 `is_incremental()` 内部逻辑（该宏在此次编译中强制求值为 `false`）；
2. 整个 `{% if is_incremental() %} ... {% endif %}` 过滤块直接失效；
3. dbt 在底层执行原子的 `DROP TABLE IF EXISTS target CASCADE; CREATE TABLE target AS SELECT ...`，从原始源表抓取所有历史数据从头全量洗一遍！

```
                     dbt run --select fct_orders
                                  │
                   ┌──────────────┴──────────────┐
                   ▼                             ▼
        未加 --full-refresh              加了 --full-refresh
  ┌─────────────────────────────┐  ┌─────────────────────────────┐
  │ is_incremental() = true     │  │ is_incremental() = false    │
  │ 执行增量过滤与 MERGE/APPEND   │  │ 忽略增量过滤，执行全量重写      │
  │ 扫描最近几天数据，耗时极短   │  │ 扫描全量历史数据，彻底刷平数据  │
  └─────────────────────────────┘  └─────────────────────────────┘
```

---

### 生产环境全量重刷规范与禁忌

1. **绝对禁止在全公司定时调度中常态化挂载 `--full-refresh`**：
   曾经有初学者把 Airflow 每日调度命令写成了 `dbt run --full-refresh`，导致价值几千美元的算力每日空转烧毁，彻底丧失了增量模型的意义。
2. **选择业务低谷期手动执行**：
   对于包含数亿行记录的核心表，全量重刷需要扫描大量数据并消耗高额 CPU/内存，务必在凌晨业务低峰期或独立维护窗口执行。
3. **蓝绿部署与只读副本保护**：
   在企业级数仓中，为了防止全量重刷期间出现短暂的“查不到数据”断档，dbt 默认采用“创建临时表 (`__dbt_tmp`) -> 写入成功 -> 原子表名互换（Atomic Swap）”的事务机制，确保下游分析师的查询零宕机中断。
""",
            difficulty=2,
            tips="记住：日常调度绝不能带 `--full-refresh`；只有当修改了表结构、新增了历史计算列或业务口径发生追溯调整时，才手动执行一次全量重刷！"
        )
    ]

    exercises = [
        single_choice(
            "dbt-c6-e1",
            "在 dbt 中，如果不希望在数据库中创建任何真实的物理 TABLE 或 VIEW，而是希望将该模型的 SQL 仅作为公共表表达式（CTE）直接内联注入到下游引用它的模型中，应该选择哪种物化策略？",
            [
                {"label": "view", "value": "A"},
                {"label": "table", "value": "B"},
                {"label": "ephemeral", "value": "C"},
                {"label": "incremental", "value": "D"}
            ],
            "C",
            "`ephemeral` 物化不会在数据库中创建任何实际对象，dbt 会在编译下游模型时将其整段代码作为 CTE（`with ... as`）内嵌进去。",
            1,
            "dbt-l6-3",
            ["materialization", "ephemeral"]
        ),
        single_choice(
            "dbt-c6-e2",
            "关于增量模型中的 `is_incremental()` 宏，下列哪种情况下它会返回 `false`？",
            [
                {"label": "目标表已经在数仓中存在，且日常正常增量运行", "value": "A"},
                {"label": "在命令行中显式执行了 `dbt run --full-refresh`", "value": "B"},
                {"label": "模型头部的配置声明了 `materialized='incremental'`", "value": "C"},
                {"label": "当前运行的是生产环境定时增量调度任务", "value": "D"}
            ],
            "B",
            "当用户在命令行显式加上 `--full-refresh` 参数，或者数据库中目标表尚不存在（首次初建）时，`is_incremental()` 均会强制返回 `false`，从而触发全量扫描与全量建表。",
            2,
            "dbt-l6-4",
            ["incremental", "full-refresh", "jinja"]
        ),
        single_choice(
            "dbt-c6-e3",
            "在增量模型配置中，宏变量 `{{ this }}` 指代的是：",
            [
                {"label": "上游来源表中最古老的一张表", "value": "A"},
                {"label": "当前正在执行的 dbt 项目中的 `dbt_project.yml` 文件", "value": "B"},
                {"label": "当前模型在数据库中现存的已物化关系对象（表或视图）", "value": "C"},
                {"label": "当前执行 dbt 命令的操作者数据库用户名", "value": "D"}
            ],
            "C",
            "`{{ this }}` 是 dbt 内置的关系对象指针，指向当前模型在数据库中已经存在的真实物理表/视图，常用于 `select max(updated_at) from {{ this }}` 来确定增量高水位线。",
            2,
            "dbt-l6-4",
            ["this-variable", "incremental", "jinja"]
        ),
        single_choice(
            "dbt-c6-e4",
            "某电商系统的订单存在状态变更（如从 `pending` 变为 `shipped` 再变为 `delivered`）。在构建订单增量事实表时，如果采用 `append` 策略，会导致什么严重后果？",
            [
                {"label": "dbt 编译直接报错无法运行", "value": "A"},
                {"label": "目标表中会出现同一订单的多条历史状态记录，导致按 order_id 计数或汇总金额时数据重复翻倍", "value": "B"},
                {"label": "所有的历史数据都会被自动删除，只保留今天的新订单", "value": "C"},
                {"label": "底层数仓会自动将旧记录覆盖为最新记录", "value": "D"}
            ],
            "B",
            "`append` 策略完全不做主键去重，只管无脑向目标表插入新行。如果订单发生状态流转，每次抓取都会插入新行，导致相同的 `order_id` 在表中重复出现，指标统计彻底失真。此类场景必须使用 `merge` 搭配 `unique_key`。",
            2,
            "dbt-l6-5",
            ["incremental-strategy", "append", "merge"]
        ),
        multiple_choice(
            "dbt-c6-e5",
            "关于 dbt 四大核心物化策略的适用场景，下列说法合理的有：",
            [
                {"label": "Staging 层模型通常推荐物化为 `view`，避免多余的物理存储开销", "value": "A"},
                {"label": "Marts 层中行数较小的核心维度表（如 `dim_customers`）通常物化为 `table` 以保障 BI 交互查询秒级返回", "value": "B"},
                {"label": "数据量达上亿条、更新频繁的事实表（如 `fct_orders`）非常适合物化为 `incremental`", "value": "C"},
                {"label": "所有模型不论大小一律物化为 `view` 是最完美的工程实践，因为完全不占存储", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 均为工业界公认的最佳物化选择。D 是极度危险的反模式：如果所有层级全都是 view，多层复杂嵌套会导致最终 BI 查询每次都要穿透重算亿级数据，引发查询崩溃并产生天价计算账单。",
            2,
            "dbt-l6-1",
            ["materialization", "best-practices", "performance"]
        ),
        multiple_choice(
            "dbt-c6-e6",
            "在设计生产级增量模型时，为了防止网络延迟、批处理失败导致的“迟到数据（Late-arriving data）”丢失，下列哪些手段是正确的？",
            [
                {"label": "增量过滤条件应基于 `updated_at`（最后更新时间）而非单一的 `created_at`", "value": "A"},
                {"label": "在过滤条件中使用滑动安全回溯窗口（如往前倒推 2~3 天）", "value": "B"},
                {"label": "配合配置明确的 `unique_key`，确保回溯重新拉取到的已有记录能够被幂等合并更新", "value": "C"},
                {"label": "直接把增量过滤条件去掉，每天定时任务自动全量重建整个数仓", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 构成了工业级增量管道“回溯窗口 + 幂等更新”的黄金组合。D 在千万级以上数据量时不可行，会带来巨大的计算资源浪费与调度延迟。",
            3,
            "dbt-l6-6",
            ["late-arriving-data", "lookback-window", "incremental"]
        ),
        multiple_choice(
            "dbt-c6-e7",
            "下列哪些情况下，数据工程师必须对增量模型执行 `dbt run --full-refresh`？",
            [
                {"label": "在模型中新增了一个依赖历史数据的业务计算列（如 `customer_tier`）", "value": "A"},
                {"label": "历史业务逻辑或收入统计口径发生变更，需要重刷全量历史指标", "value": "B"},
                {"label": "修改了模型的 `unique_key` 定义或调整了底层物理表主键策略", "value": "C"},
                {"label": "日常每小时正常的增量补数任务调度", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 改变了表结构或历史全量口径，必须执行 `--full-refresh`。D 属于日常正常增量运行，绝对不能带 `--full-refresh`。",
            2,
            "dbt-l6-7",
            ["full-refresh", "governance", "operations"]
        ),
        judge(
            "dbt-c6-e8",
            "将模型物化为 `ephemeral` 后，可以在 dbt 中通过独立的 `dbt test` 对该模型执行直接的数据质量断言测试。",
            "错误",
            "`ephemeral` 模型在数据库中不留下任何物理表或视图，因此无法被 dbt 的常规表级测试直接运行查询断言。",
            2,
            "dbt-l6-3",
            ["ephemeral", "testing"]
        ),
        judge(
            "dbt-c6-e9",
            "在现代云数仓（如 Snowflake, BigQuery）中，增量模型的 `unique_key` 配置既可以是一个单独的字段名字符串，也可以是由多个字段名组成的 Python/YAML 列表。",
            "正确",
            "现代 dbt 适配器支持列表语法（如 `unique_key=['date', 'store_id', 'product_id']`）来原生支持多列复合主键增量合并。",
            1,
            "dbt-l6-6",
            ["unique-key", "composite-key"]
        ),
        judge(
            "dbt-c6-e10",
            "对于日志类、只追加不更新（Append-Only）的只读事件流数据，使用 `append` 增量策略通常比 `merge` 策略具有更高的执行速度和更低的计算开销。",
            "正确",
            "`append` 策略直接执行批次 `INSERT`，完全无需在目标大表中扫描和匹配主键更新，资源开销和耗时远低于 `merge`。",
            2,
            "dbt-l6-5",
            ["append", "performance"]
        ),
        fill(
            "dbt-c6-e11",
            "在编写增量模型时，用于判断当前构建是否处于增量模式的 Jinja 宏函数是 [BLANK1]()；在增量宏条件内部，指代当前模型自身在数据库中已有实体对象的指针变量是 [BLANK2]。",
            [["is_incremental"], ["{{ this }}", "this"]],
            "通过 `{% if is_incremental() %}` 来控制只在增量时生效的过滤条件；通过 `{{ this }}` 访问当前物理表现存数据以获取最大时间戳。",
            2,
            "dbt-l6-4",
            ["jinja", "is_incremental", "this"]
        ),
        fill(
            "dbt-c6-e12",
            "如果想在命令行强制对名为 `fct_orders` 的增量模型执行全量重刷建表，忽略增量高水位线限制，应执行的命令是 `dbt run --select fct_orders [BLANK1]`。",
            [["--full-refresh"]],
            "添加 `--full-refresh` 选项即可强制全量重刷重建增量模型。",
            1,
            "dbt-l6-7",
            ["cli", "full-refresh"]
        ),
        open_ex(
            "dbt-c6-e13",
            "某在线教育平台的学习行为事件表 `raw_db.student_events` 每天新增 2000 万条数据，包含字段 `event_id`（主键）、`student_id`、`course_id`、`event_type`、`event_timestamp`、`updated_at`。\n请为你设计的 `fct_student_events` 增量模型写出完整的 dbt SQL 定义代码，要求：\n1. 正确配置物化类型与唯一键；\n2. 运用 `is_incremental()` 宏；\n3. 设计向后回溯 3 天的防丢安全窗口（假设使用通用 `dateadd` 或类似日期计算函数）；\n4. 简要说明为什么要使用 3 天回溯窗口。",
            "```sql\n{{ config(\n    materialized='incremental',\n    unique_key='event_id',\n    incremental_strategy='merge'\n) }}\n\nwith source_events as (\n    select * from {{ ref('stg_learning__events') }}\n),\n\nfinal as (\n    select\n        event_id,\n        student_id,\n        course_id,\n        event_type,\n        event_timestamp,\n        updated_at\n    from source_events\n    {% if is_incremental() %}\n        where updated_at >= (\n            select dateadd(day, -3, max(updated_at)) from {{ this }}\n        )\n    {% endif %}\n)\n\nselect * from final;\n```\n\n**回溯 3 天窗口的原因**：\n真实生产环境中常因客户端离线、网络重传或第三方系统数据同步延迟，出现早前发生但今天才写入数仓的“迟到数据（Late-arriving data）”，或者历史事件的元数据在几天内发生了异步修复更新。向前回溯 3 天能保证这部分变更被重新捞出，再通过 `unique_key='event_id'` 的 `merge` 机制实现幂等更新覆盖，避免增量管道出现历史漏数或脏数据。",
            "增量模型高级工程实践考查：配置、is_incremental、this 对象指针、滑动安全回溯窗口及防漏数原理。",
            [
                {"point": "正确声明 config(materialized='incremental', unique_key='event_id', ...)", "score": 1},
                {"point": "正确使用 {% if is_incremental() %} 宏语法", "score": 1},
                {"point": "正确引用 {{ this }} 并在时间戳过滤中实现向前回溯（如 dateadd(..., -3, max(...))）", "score": 2},
                {"point": "清晰解释滑动回溯安全窗口解决“迟到数据/异步状态更新”的工程机理", "score": 1}
            ],
            "正确声明增量配置与 unique_key；在 is_incremental 块中使用 {{ this }} 并向前回溯 3 天；清晰说明回溯窗口能捕获网络延迟与离线迟到数据并通过 unique_key 幂等更新。",
            4,
            "dbt-l6-6",
            ["incremental-design", "lookback-window", "sql-coding"]
        )
    ]

    return chapter(
        "dbt-c6",
        "dbt-analytics-engineering",
        6,
        "物化策略深度剖析 (view / table / incremental / ephemeral)",
        "深入掌握 dbt 四大核心物化机制的底层 DDL 转换与运行开销，熟练运用 `is_incremental()`、`unique_key`、回溯安全窗口与全量重刷机制打造高性能生产级增量数仓管道。",
        lessons,
        exercises
    )
