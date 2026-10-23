# scripts/generators/dbt_ch5.py
# -*- coding: utf-8 -*-
"""Chapter 5: 工业级数仓分层实战：Staging / Intermediate / Marts"""

from common import (
    lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter
)

def get_chapter_5():
    lessons = [
        lesson(
            "dbt-l5-1",
            "经典数仓三层架构：Staging、Intermediate 与 Marts 的定位与职责边界",
            """### 现代分析工程的分层哲学

在传统的“写脚本洗数据”时代，数据工程师往往写出一个包含数百行甚至数千行、堆叠了无数 LEFT JOIN 和 CASE WHEN 的大 SQL，直接从原始表生成报表。这种“单体大黑盒”模式面临三大致命痛点：
1. **逻辑无法复用**：不同报表各自写一套清洗逻辑，导致指标口径不一致。
2. **调试与测试极其艰难**：一旦最终数字出现异常，排查数千行嵌套子查询如同大海捞针。
3. **计算冗余与资源浪费**：相同的复杂清洗与关联逻辑在数十张模型中反复计算。

dbt 倡导将软件工程的**模块化（Modularity）**与**关注点分离（Separation of Concerns）**理念引入 SQL 建模，确立了业界标准的**数仓三层架构**：
- **Staging 层（贴源清洗层 / `stg_`）**：一对一清洗，消除底层异构性；
- **Intermediate 层（中间业务层 / `int_`）**：多对一或多对多抽象，封装高复用性复杂逻辑；
- **Marts 层（核心集市层 / `dim_`, `fct_`）**：面向最终业务消费（BI/业务分析师），交付直观的维度表与事实表。

```
 原始数据源 (Raw Sources)
   └── stripe.charges, app.users, salesforce.leads
           │
           ▼ (1:1 清洗、转换、标准化)
 ┌────────────────────────────────────────────────────────┐
 │ Staging 层 (models/staging/stripe/stg_stripe__charges.sql)  │
 └────────────────────────────────────────────────────────┘
           │
           ▼ (跨模型 JOIN、复杂清洗、预聚合)
 ┌────────────────────────────────────────────────────────┐
 │ Intermediate 层 (models/intermediate/int_payments_pivoted.sql) │
 └────────────────────────────────────────────────────────┘
           │
           ▼ (面向业务域：事实表与维度表)
 ┌────────────────────────────────────────────────────────┐
 │ Marts 层 (models/marts/finance/fct_orders.sql / dim_customers.sql)│
 └────────────────────────────────────────────────────────┘
           │
           ▼ (最终消费)
 BI 工具 (Metabase/Looker/Superset) / 数据科学 / 反向 ETL (Census/Hightouch)
```

---

### 三层架构的核心职责对比

| 维度 | Staging 层 (贴源清洗) | Intermediate 层 (中间抽象) | Marts 层 (业务集市) |
| :--- | :--- | :--- | :--- |
| **模型命名** | `stg_<source>__<entities>.sql` | `int_<entities>_<verb/desc>.sql` | `fct_<entities>.sql` / `dim_<entities>.sql` |
| **来源表引用** | 仅且只能引用 `source()` | 引用 `stg_` 或其他 `int_` 模型 | 引用 `stg_` 或 `int_` 模型 |
| **关系比例** | 必须与底层原始表 **1:1** 对应 | 1:1、多:1 或多:多 | 面向业务实体组织 |
| **允许的操作** | 重命名、类型转换、常量替换、轻量过滤 | 跨表关联 (JOIN)、分组聚合、行转列 (Pivot) | 维度整合、事实度量聚集、保证宽表易用性 |
| **严禁的操作** | **严禁 JOIN 其它表**、严禁 GROUP BY 聚合 | 严禁被 BI 工具直接查询 | 严禁向上引用（如引用其他 Marts） |
| **物化推荐** | `view` (轻量无存储负担) | `view` 或 `ephemeral` (复杂模型可用 `table`) | `table` 或 `incremental` (追求查询性能) |
| **使用者/受众** | 数据工程与分析工程团队内部 | 数据工程与分析工程团队内部 | 业务分析师、业务看板、商业智能团队 |
""",
            difficulty=1,
            tips="记住黄金法则：Staging 负责格式清洗，绝不能出现 JOIN；Intermediate 负责业务积木，外部不可见；Marts 负责终端交付，必须极致易用！"
        ),
        lesson(
            "dbt-l5-2",
            "Staging 层的规范清洗：字段重命名、类型强制转换与布尔标准化 (stg_*)",
            """### Staging 层的神圣职责

Staging 层是进入可控数据世界的第一道门禁（The Gateway）。它的核心目标是：**将混乱、不可控、异构的原始数据转化为整洁、强类型、命名统一的标准积木**。

#### 1. 命名规则规范化 (snake_case)
原始数据库中字段命名千奇百怪：`user_ID`、`CreatedDate`、`cust_nm`、`is_active_flag`。Staging 层必须全部重构为标准的下划线命名法（`snake_case`）：
- 统一业务名词：例如所有主键使用 `<entity>_id`，如 `order_id`, `customer_id`。
- 统一时间名词：时间戳统一后缀 `_at`（如 `created_at`, `shipped_at`），日期统一后缀 `_date`（如 `order_date`）。

#### 2. 显式类型强制转换 (Explicit Casting)
永远不要信任源系统的隐式类型推导。源系统可能会把时间戳存储为字符串或微秒毫秒整数，或者把金额存储为浮点数：
```sql
-- 不推荐隐式推导
created_time,

-- 推荐显式强转
cast(created_time as timestamp) as created_at,
cast(amount_in_cents / 100.0 as numeric(16, 2)) as amount_usd,
```

#### 3. 布尔字段标准化
源数据常使用 `1/0`、`'Y'/'N'`、`'true'/'false'` 甚至字符串 `'active'` 表示布尔状态。Staging 层统一转为真正的布尔型，并加上 `is_` 或 `has_` 前缀：
```sql
cast(status = 'active' as boolean) as is_active,
cast(payment_count > 0 as boolean) as has_paid,
```

#### 4. 消除技术字段与系统垃圾
过滤掉数据库 CDC 复制产生的脏字段（如 `_fivetran_synced`, `_airbyte_emitted_at`），只保留业务需要的字段，或重命名系统字段。

---

### 标准 Staging 模型工程模板

```sql
-- models/staging/jaffle_shop/stg_jaffle_shop__orders.sql
with 

source as (
    select * from {{ source('jaffle_shop', 'orders') }}
),

renamed as (
    select
        -- 1. 主键与外键 ID
        cast(id as integer) as order_id,
        cast(user_id as integer) as customer_id,

        -- 2. 业务状态与描述字段
        cast(lower(status) as varchar(32)) as order_status,

        -- 3. 布尔标识
        cast(status = 'completed' as boolean) as is_completed,

        -- 4. 日期与时间戳（统一时区 UTC）
        cast(order_date as date) as order_date,
        cast(created_at as timestamp) as created_at

    from source
)

select * from renamed
```
""",
            difficulty=2,
            tips="在 Staging 层中写 SQL 时，严格遵循 CTE (Common Table Expression) 结构：先用 `source` CTE 拉取，再用 `renamed` 进行列清洗转换，最后 `select * from renamed`。"
        ),
        lesson(
            "dbt-l5-3",
            "Intermediate 中间层业务抽象：跨实体关联、聚合与复杂维度预计算 (int_*)",
            """### 为什么需要 Intermediate 层？

当数据离开 Staging 层后，很多工程师会犯一个错误：直接在 Marts 层（如 `fct_orders.sql`）里写了 20 个 JOIN、3 个子查询窗口函数。
这样做的问题在于：另一个模型（如 `fct_customer_lifespan.sql`）也需要相同的客户订单聚合数据时，必须把那一段复杂的聚合逻辑复制一遍。

**Intermediate（中间层）**就是为了**消除 Marts 层中的重复计算与过度复杂性**而生的。
它像乐高积木中的预装模块（Sub-assembly）：
- 组合多个 Staging 模型；
- 预计算复杂的窗口函数（如 `row_number() over (partition by ...)`）；
- 行转列（Pivot）操作；
- 过滤或补充业务中间派生指标。

---

### 典型应用场景与实战

#### 场景 1：行转列（Pivot Payments）
一个订单可能通过多种支付方式支付（信用卡、礼品卡、优惠券）。原始支付明细表是一对多行，需要在订单粒度进行支付渠道透视：

```sql
-- models/intermediate/finance/int_payments_pivoted_to_orders.sql
with 

payments as (
    select * from {{ ref('stg_stripe__payments') }}
),

pivoted as (
    select
        order_id,
        sum(case when payment_method = 'credit_card' then amount else 0 end) as credit_card_amount,
        sum(case when payment_method = 'coupon' then amount else 0 end) as coupon_amount,
        sum(case when payment_method = 'bank_transfer' then amount else 0 end) as bank_transfer_amount,
        sum(amount) as total_payment_amount
    from payments
    where payment_status = 'success'
    group by 1
)

select * from pivoted
```

#### 场景 2：用户首次与末次行为预计算（User Lifetime Flags）
计算每位用户的首单时间、尾单时间及累计消费金额：

```sql
-- models/intermediate/ecommerce/int_customer_orders_aggregated.sql
with 

orders as (
    select * from {{ ref('stg_jaffle_shop__orders') }}
),

customer_orders as (
    select
        customer_id,
        min(order_date) as first_order_date,
        max(order_date) as most_recent_order_date,
        count(order_id) as total_order_count
    from orders
    group by 1
)

select * from customer_orders
```
""",
            difficulty=2,
            tips="Intermediate 模型永远不对终端业务用户暴露，它们只是数仓管道的内部零件。命名务必表明动词或聚合逻辑，例如 `int_<entity>_<verb/transformation>.sql`。"
        ),
        lesson(
            "dbt-l5-4",
            "Marts 业务集市建模：面向业务域的维度表 (dim_*) 与事实表 (fct_*) 设计",
            """### 走进 Marts：终端消费者的门面

Marts 层（数据集市）是整个现代数据栈直接交付给业务决策者、BI 仪表盘（Tableau / Metabase / Looker）以及业务分析师的核心资产。
Marts 层完全遵循 **Kimball 维度建模**体系，主要包含两大类模型：
1. **维度表（`dim_*`）**：描述业务的实体（Who, What, Where, When），包含丰富的上下文属性与分类标签。
2. **事实表（`fct_*`）**：记录业务事件的度量（Metrics, Quantities, Currency amounts），包含外键与数值字段。

---

### 1. 维度表设计 (`dim_customers.sql`)

维度表应该包含关于实体的“全景视图”（360 View）。它通过关联 Staging 层的基础信息与 Intermediate 层的行为聚合特征，提供即插即用的分析宽表：

```sql
-- models/marts/marketing/dim_customers.sql
with 

customers as (
    select * from {{ ref('stg_jaffle_shop__customers') }}
),

customer_orders as (
    select * from {{ ref('int_customer_orders_aggregated') }}
),

final as (
    select
        customers.customer_id,
        customers.first_name,
        customers.last_name,
        customers.email,

        -- 聚合维度特征
        customer_orders.first_order_date,
        customer_orders.most_recent_order_date,
        coalesce(customer_orders.total_order_count, 0) as total_order_count,

        -- 衍生分类标签 (RFM / 活跃状态)
        case 
            when customer_orders.total_order_count is null or customer_orders.total_order_count = 0 then 'churned_unconverted'
            when customer_orders.total_order_count >= 5 then 'vip'
            else 'regular'
        end as customer_tier

    from customers
    left join customer_orders using (customer_id)
)

select * from final
```

---

### 2. 事实表设计 (`fct_orders.sql`)

事实表必须颗粒度明确。对于一个订单事实表，其单行粒度（Grain）必须严格为“一个订单（One record per order）”：

```sql
-- models/marts/finance/fct_orders.sql
with 

orders as (
    select * from {{ ref('stg_jaffle_shop__orders') }}
),

payments as (
    select * from {{ ref('int_payments_pivoted_to_orders') }}
),

final as (
    select
        orders.order_id,
        orders.customer_id,
        orders.order_date,
        orders.order_status,

        -- 数值度量
        coalesce(payments.total_payment_amount, 0) as amount_usd,
        coalesce(payments.credit_card_amount, 0) as credit_card_amount,
        coalesce(payments.coupon_amount, 0) as coupon_amount

    from orders
    left join payments using (order_id)
)

select * from final
```
""",
            difficulty=2,
            tips="Marts 层的设计必须满足业务分析直觉。分析师查询 `dim_customers` 时不需要再写 GROUP BY 和复杂的 CASE WHEN；数据必须是清洗聚合完毕、开箱即用的！"
        ),
        lesson(
            "dbt-l5-5",
            "命名规范与目录结构：子目录划分与 YAML 配置级联继承",
            """### 规范化工程目录结构

在规模化的 dbt 项目中，成百上千个 SQL 文件的组织结构至关重要。dbt 官方推荐的最佳实践是按**分层 + 业务域（Domain / Source）**进行两级目录划分：

```
models/
├── staging/                     # 1. 贴源清洗层
│   ├── jaffle_shop/             # 数据源 1 (按照 source 命名)
│   │   ├── _jaffle_shop__sources.yml
│   │   ├── _jaffle_shop__models.yml
│   │   ├── stg_jaffle_shop__customers.sql
│   │   └── stg_jaffle_shop__orders.sql
│   └── stripe/                  # 数据源 2
│       ├── _stripe__sources.yml
│       ├── _stripe__models.yml
│       └── stg_stripe__payments.sql
├── intermediate/                # 2. 中间业务逻辑层
│   ├── finance/                 # 按照业务域划分
│   │   ├── _int_finance__models.yml
│   │   └── int_payments_pivoted_to_orders.sql
│   └── marketing/
│       └── int_customer_orders_aggregated.sql
└── marts/                       # 3. 业务集市层
    ├── core/                    # 全公司通用的核心实体 (dim_users, dim_dates)
    │   ├── _core__models.yml
    │   └── dim_customers.sql
    ├── finance/                 # 财务域
    │   ├── _finance__models.yml
    │   └── fct_orders.sql
    └── marketing/               # 营销域
        └── fct_campaign_conversions.sql
```

---

### YAML 配置的级联继承 (Cascade Inheritance)

在 `dbt_project.yml` 中，你可以通过目录路径为不同层级赋予全局统一的物化配置和标签，而不需要在每个 SQL 头部手写 `config()`：

```yaml
# dbt_project.yml
name: 'ecommerce_analytics'
version: '1.0.0'

models:
  ecommerce_analytics:
    # 1. staging 目录下默认所有模型都是 view，并打上 staging 标签
    staging:
      +materialized: view
      +tags:
        - staging

    # 2. intermediate 目录下默认物化为 view (避免浪费物理存储)
    intermediate:
      +materialized: view
      +tags:
        - intermediate

    # 3. marts 目录下默认物化为 table，生产高性能实体
    marts:
      +materialized: table
      +tags:
        - marts
      finance:
        +schema: finance       # 输出到独立的 finance schema
      marketing:
        +schema: marketing     # 输出到独立的 marketing schema
```

通过 YAML 的 `+` 语法，子目录不仅继承父目录的属性，还能局部覆盖或补充（例如把个别特别庞大的中间表单独声明为 `table` 或 `incremental`）。
""",
            difficulty=2,
            tips="统一在 dbt_project.yml 中按目录层级配置物化策略，能够让你的 SQL 模型文件极其纯粹，只需关注数据转换逻辑，大幅降低维护成本。"
        ),
        lesson(
            "dbt-l5-6",
            "避免循环依赖与反模式：禁止向上依赖与跨层穿透的防护准则",
            """### 分析工程中的反模式（Anti-Patterns）

DAG（有向无环图）是 dbt 运行的命脉。一旦数仓分层设计失控，就会出现难以维护、性能崩溃甚至死循环的灾难性问题。
以下是数据架构师必须死守的**四大防护准则**：

```
   [正向流动] (严禁逆向与跨层穿透)
   Source ──> Staging ──> Intermediate ──> Marts ──> BI Tools
      │          │               │           ▲
      │          └───────────────┴───────────┘ (合规)
      │
      └─── 跨层穿透 (Marts 直接引用 Source) ───✖ [严重反模式]
      
   Marts A <─── 相互循环引用 ───> Marts B ────✖ [循环死锁]
```

---

### 1. 绝对严禁：Marts 直接引用原始 Source (Bypassing Staging)
- **反模式**：在 `fct_orders.sql` 中直接调用 `{{ source('raw_db', 'orders') }}`。
- **危害**：如果底层源数据库字段发生变更（如将 `amount_cents` 改为 `amount_dollars`），缺乏 Staging 缓冲层，会导致数十个上层 Marts 瞬间报错瘫痪。
- **正解**：任何原始数据必须先经过 `stg_` 模型的标准化清洗，上层永远只消费 `stg_` 或 `int_`。

### 2. 绝对严禁：向上依赖与倒流 (Reverse Dependency)
- **反模式**：Staging 模型去 `ref()` 一个 Marts 模型，或者 Intermediate 去 `ref()` Marts。
- **危害**：打破了分层抽象的层次结构，造成语义倒挂。分层必须单向单调流动：`Raw -> Staging -> Intermediate -> Marts`。

### 3. 严禁 Marts 之间的横向过度缠绕 (Marts Inter-dependency)
- **反模式**：`fct_order_revenue.sql` 依赖了 `fct_orders.sql`，而 `fct_orders.sql` 又通过视图间接引用了 `fct_order_revenue.sql`。
- **危害**：引发 dbt 编译器直接报错 `CycleDetectedException`（循环依赖死锁）。
- **正解**：若多个 Marts 需要同一块上游数据，必须将这部分共享逻辑提炼下沉到 `Intermediate` 模型中！

### 4. 严禁 Staging 内部互相 JOIN
- **反模式**：`stg_orders.sql` 里直接 `join stg_customers.sql`。
- **危害**：破坏了 Staging 1:1 对齐原始数据源的映射契约。
- **正解**：跨表关联属于业务集成，必须放到 `Intermediate` 或 `Marts` 层进行。
""",
            difficulty=3,
            tips="代码审查（Code Review）中必须铁腕执行：Staging 只能一对一且只能引用 source()；遇到跨模型复用，第一时间想到下沉到 Intermediate，绝不让 Marts 之间互相勾连！"
        ),
        lesson(
            "dbt-l5-7",
            "分层模型端到端实战：电商订单流 (stg_orders -> int_order_items_joined -> fct_orders)",
            """### 综合实战：电商订单端到端全链路构建

在本实战中，我们将完整编写一条从原始数据源到业务分析大宽表的工业级数据管道：
- 源表：`raw.orders`（订单表）与 `raw.order_items`（订单明细表）
- 目标：产出 `fct_orders` 事实表，不仅包含订单状态，还包含从明细表汇总计算的商品总件数、总金额和平均单件售价。

---

#### 步骤 1：编写 Staging 层模型

```sql
-- models/staging/ecommerce/stg_ecommerce__orders.sql
with source as (
    select * from {{ source('ecommerce', 'orders') }}
),
renamed as (
    select
        cast(order_id as integer) as order_id,
        cast(user_id as integer) as customer_id,
        cast(status as varchar(32)) as order_status,
        cast(created_at as timestamp) as order_created_at
    from source
)
select * from renamed;

-- models/staging/ecommerce/stg_ecommerce__order_items.sql
with source as (
    select * from {{ source('ecommerce', 'order_items') }}
),
renamed as (
    select
        cast(id as integer) as order_item_id,
        cast(order_id as integer) as order_id,
        cast(product_id as integer) as product_id,
        cast(quantity as integer) as item_quantity,
        cast(price_cents / 100.0 as numeric(10, 2)) as item_price_usd
    from source
)
select * from renamed;
```

---

#### 步骤 2：编写 Intermediate 层模型（订单项聚合并挂载单件统计）

```sql
-- models/intermediate/ecommerce/int_order_items_aggregated.sql
with items as (
    select * from {{ ref('stg_ecommerce__order_items') }}
),
aggregated as (
    select
        order_id,
        sum(item_quantity) as total_items_count,
        sum(item_quantity * item_price_usd) as subtotal_amount_usd,
        avg(item_price_usd) as average_item_price_usd
    from items
    group by 1
)
select * from aggregated;
```

---

#### 步骤 3：编写 Marts 层最终交付事实表

```sql
-- models/marts/finance/fct_orders.sql
{{ config(
    materialized='table'
) }}

with orders as (
    select * from {{ ref('stg_ecommerce__orders') }}
),
items_agg as (
    select * from {{ ref('int_order_items_aggregated') }}
),
final as (
    select
        orders.order_id,
        orders.customer_id,
        orders.order_status,
        orders.order_created_at,

        -- 挂载计算度量
        coalesce(items_agg.total_items_count, 0) as total_items_count,
        coalesce(items_agg.subtotal_amount_usd, 0.00) as subtotal_amount_usd,
        coalesce(items_agg.average_item_price_usd, 0.00) as average_item_price_usd,

        -- 业务衍生标签
        case 
            when orders.order_status = 'cancelled' then true
            else false
        end as is_cancelled

    from orders
    left join items_agg on orders.order_id = items_agg.order_id
)
select * from final;
```
""",
            difficulty=3,
            tips="看到整个流水线是多么清晰纯粹了吗？一旦明细聚合逻辑有变，只需修改 int_order_items_aggregated；一旦源表增减字段，只需修改 stg 模型，Marts 始终保持高内聚低耦合！"
        )
    ]

    exercises = [
        single_choice(
            "dbt-c5-e1",
            "在 dbt 推荐的标准数仓三层架构中，关于 Staging 层的定位，下列说法正确的是：",
            [
                {"label": "Staging 层应该与原始源表保持 1:1 关系，主要负责重命名、强类型转换与清理，严禁进行多表 JOIN", "value": "A"},
                {"label": "Staging 层应该直接将订单表与客户表 JOIN 成宽表，以减少后续模型的文件数量", "value": "B"},
                {"label": "Staging 层应该物化为物理表（table），并且直接对业务 BI 仪表盘开放查询", "value": "C"},
                {"label": "Staging 模型的 SQL 文件可以直接写在 models/marts 根目录下", "value": "D"}
            ],
            "A",
            "Staging 层的黄金准则是：与源系统表保持 1:1 映射，只负责清洗、命名转换与类型强转，严禁进行业务多表 JOIN，绝不破坏原子性。",
            1,
            "dbt-l5-1",
            ["staging", "architecture", "data-layers"]
        ),
        single_choice(
            "dbt-c5-e2",
            "以下哪个是符合 dbt 命名约定的 Intermediate 中间层模型文件名？",
            [
                {"label": "stg_stripe__charges.sql", "value": "A"},
                {"label": "dim_customers.sql", "value": "B"},
                {"label": "int_payments_pivoted_to_orders.sql", "value": "C"},
                {"label": "fct_daily_revenue.sql", "value": "D"}
            ],
            "C",
            "Intermediate 层模型前缀统一为 `int_`，后接实体名词及描述其转换逻辑的动词/特征词，如 `int_payments_pivoted_to_orders.sql`。",
            1,
            "dbt-l5-3",
            ["intermediate", "naming-conventions"]
        ),
        single_choice(
            "dbt-c5-e3",
            "在 `dbt_project.yml` 中，如果需要给 `models/staging/` 目录下的所有模型统一配置物化为 `view`，正确的语法是：",
            [
                {"label": "staging: { materialized: view }", "value": "A"},
                {"label": "staging: { +materialized: view }", "value": "B"},
                {"label": "staging: { config: view }", "value": "C"},
                {"label": "staging: { -materialized: view }", "value": "D"}
            ],
            "B",
            "在 dbt_project.yml 的模型层级配置中，必须在配置项前添加前缀 `+`（如 `+materialized: view`），以指示 dbt 进行级联属性继承与应用。",
            2,
            "dbt-l5-5",
            ["yaml-config", "inheritance", "materialization"]
        ),
        single_choice(
            "dbt-c5-e4",
            "如果两个 Marts 模型（如 `fct_orders.sql` 与 `fct_invoices.sql`）都需要一段相同的复杂客户信用分预计算逻辑，最佳工程实践是：",
            [
                {"label": "让 `fct_orders` 依赖 `fct_invoices`，直接从 `fct_invoices` 拿结果", "value": "A"},
                {"label": "将这段信用分计算逻辑抽取为 `Intermediate` 层模型，让两个 Marts 分别 ref 它", "value": "B"},
                {"label": "在两个 Marts SQL 里把相同的计算逻辑各复制粘贴一遍", "value": "C"},
                {"label": "直接在 Staging 层的 `stg_customers` 中写大 SQL 聚合计算", "value": "D"}
            ],
            "B",
            "Intermediate 层的核心职责就是消除 Marts 层的重复计算。将公共逻辑下沉为 `int_customer_credit_scores`，不仅复用了逻辑，还彻底解耦了两个 Marts 之间的横向依赖。",
            2,
            "dbt-l5-6",
            ["modularity", "intermediate", "refactoring"]
        ),
        multiple_choice(
            "dbt-c5-e5",
            "在设计 Staging 模型时，下列哪些属于推荐的标准清洗操作？",
            [
                {"label": "将字段重命名为统一规范的 snake_case 风格（如 `user_ID` -> `customer_id`）", "value": "A"},
                {"label": "使用 `cast()` 将日期时间字符串显式转为 `timestamp` 或 `date`", "value": "B"},
                {"label": "将 'Y'/'N' 或 1/0 统一转为真正的布尔型，并加上 `is_` 或 `has_` 前缀", "value": "C"},
                {"label": "通过 LEFT JOIN 关联 3 张关联源表以提前准备好宽表数据", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 均为 Staging 层的标准职责。选项 D 严重违反了 Staging 保持与源表 1:1 映射且严禁多表 JOIN 的架构原则。",
            2,
            "dbt-l5-2",
            ["staging", "best-practices", "sql-style"]
        ),
        multiple_choice(
            "dbt-c5-e6",
            "关于 Marts 层（集市层）中维度表（`dim_*`）与事实表（`fct_*`）的特征，下列说法正确的有：",
            [
                {"label": "维度表主要描述业务实体上下文（Who, What, Where），包含较多字符串与分类属性", "value": "A"},
                {"label": "事实表记录事件的发生与度量（Metrics），行粒度必须严格清晰", "value": "B"},
                {"label": "Marts 层模型通常物化为 `table` 或 `incremental`，以保障 BI 查询的高响应速度", "value": "C"},
                {"label": "Marts 层的模型可以随意 ref 底层未被 Staging 清洗的原始 source() 表", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 正确。D 属于严重反模式（穿透绕过 Staging 门禁层），上层模型只能消费经过 Staging 标准化后的模型，严禁直接引用原始 source 表。",
            2,
            "dbt-l5-4",
            ["marts", "kimball", "dimension", "fact"]
        ),
        multiple_choice(
            "dbt-c5-e7",
            "下列哪些操作属于 dbt 项目开发中应极力避免的反模式（Anti-Patterns）？",
            [
                {"label": "在 Staging 模型中调用 `ref('dim_customers')` 向上依赖业务集市表", "value": "A"},
                {"label": "在 Marts 模型中直接编写 `{{ source('raw_data', 'orders') }}` 绕过 Staging", "value": "B"},
                {"label": "模型 A ref 模型 B，同时模型 B 也直接或间接 ref 模型 A，形成循环回路", "value": "C"},
                {"label": "在 `dbt_project.yml` 中按目录结构级联配置默认物化属性", "value": "D"}
            ],
            ["A", "B", "C"],
            "A（向上逆向依赖）、B（绕过 Staging 穿透依赖）、C（导致 CycleDetectedException 循环死锁）均为经典反模式。D 是推荐的最佳实践。",
            3,
            "dbt-l5-6",
            ["anti-patterns", "dag", "best-practices"]
        ),
        judge(
            "dbt-c5-e8",
            "Staging 层的模型应该默认直接向 BI 报表用户开放，让分析师自由在原始字段上编写计算口径。",
            "错误",
            "Staging 层只是数仓内部的清洗中间构件，不应直接暴露给最终业务分析师；直接消费的应该是 Marts 层经过业务整合与度量定义的维度表与事实表。",
            1,
            "dbt-l5-1",
            ["staging", "governance"]
        ),
        judge(
            "dbt-c5-e9",
            "在 dbt 中，Intermediate（中间层）模型不仅可以引用 Staging 模型，还可以引用其他更早阶段的 Intermediate 模型。",
            "正确",
            "Intermediate 内部可以有子步骤的递进（如 `int_order_items_prepped` -> `int_order_items_pivoted`），只要保持 DAG 有向且无环即可。",
            2,
            "dbt-l5-3",
            ["intermediate", "dag"]
        ),
        judge(
            "dbt-c5-e10",
            "为了代码整洁，所有维度的聚合计算（例如统计用户历史购买次数）都应该尽量在最终的 `dim_customers.sql` 里现场写子查询聚合，而不该拆分到 Intermediate 模型中。",
            "错误",
            "将多行事实聚集计算提取到单独的 Intermediate 模型中（如 `int_customer_orders_aggregated`），可以大幅简化 `dim_customers` 的主逻辑，并便于该聚合特征被其他业务模型复用。",
            2,
            "dbt-l5-3",
            ["intermediate", "refactoring"]
        ),
        fill(
            "dbt-c5-e11",
            "在 dbt 标准数仓三层架构中，贴源清洗层的模型文件命名规范前缀是 [BLANK1]__，业务集市层的维度表文件名前缀是 [BLANK2]__，事实表文件名前缀是 [BLANK3]__。",
            [["stg_"], ["dim_"], ["fct_"]],
            "三层命名规范：Staging 用 `stg_`，维度表用 `dim_`，事实表用 `fct_`，中间层用 `int_`。",
            2,
            "dbt-l5-1",
            ["naming-conventions", "architecture"]
        ),
        fill(
            "dbt-c5-e12",
            "在 dbt 项目中，如果两个模型相互之间直接或间接调用 `ref()` 形成了闭环，dbt 在编译构建 DAG 时会抛出 [BLANK1] 异常错误。",
            [["CycleDetectedException", "CycleDetected"]],
            "dbt 要求依赖关系必须是有向无环图（DAG），一旦存在闭环回路，编译器会抛出 `CycleDetectedException` 错误中断编译。",
            3,
            "dbt-l5-6",
            ["dag", "cycle-error"]
        ),
        open_ex(
            "dbt-c5-e13",
            "某电商数仓原始数据有 `raw_db.events`（页面点击事件）和 `raw_db.users`（注册用户）。现业务方需要在看板中查看每个用户的“首访渠道”、“最后活跃时间”以及“总浏览页面数”，并结合用户注册属性形成最终的 `dim_users` 维度宽表。\n请按照工业级三层数仓规范，设计出该链路包含的 3 个阶段的 SQL 模型（包含命名、层级归属、引用关系与核心转换思路）。",
            "1. Staging 层：\n- `stg_web__events.sql`：引用 `source('raw_db', 'events')`，清洗 `event_id`, `user_id`, `event_type`, `channel`, 强转时间戳 `event_at`；\n- `stg_web__users.sql`：引用 `source('raw_db', 'users')`，清洗 `user_id`, `user_name`, `email`, 强转注册时间 `registered_at`。\n\n2. Intermediate 层：\n- `int_user_events_aggregated.sql`：引用 `ref('stg_web__events')`，按 `user_id` 进行 GROUP BY，计算 `min(case when event_type = 'visit' then channel end) as first_channel`, `max(event_at) as last_active_at`, 以及 `count(case when event_type = 'page_view' then 1 end) as total_page_views`。\n\n3. Marts 层：\n- `dim_users.sql`（物化为 table）：通过 `ref('stg_web__users')` LEFT JOIN `ref('int_user_events_aggregated')` using (user_id)，生成包含用户基础资料与行为汇总属性的完整维度宽表。",
            "分层架构实践考查：Staging 1:1 纯清洗，Intermediate 处理复杂事件聚合与窗口过滤，Marts 最终组装维度宽表。",
            [
                {"point": "准确给出 Staging 层的两张表定义（stg_web__events, stg_web__users）且声明只能 ref source()", "score": 2},
                {"point": "设计 Intermediate 层（int_user_events_aggregated）完成事件维度的聚合与首访渠道逻辑计算", "score": 2},
                {"point": "设计 Marts 层（dim_users）完成用户表与聚合表的主键连接并输出宽表", "score": 1}
            ],
            "1. Staging: stg_web__events (从 source 读取, 格式化字段), stg_web__users (从 source 读取, 格式化字段);\n2. Intermediate: int_user_events_aggregated (从 stg_web__events 进行 group by user_id，聚合计算 first_channel, last_active_at, total_page_views);\n3. Marts: dim_users (stg_web__users left join int_user_events_aggregated using user_id, 物化为 table 供业务分析)。",
            4,
            "dbt-l5-7",
            ["architecture-design", "end-to-end", "case-study"]
        )
    ]

    return chapter(
        "dbt-c5",
        "dbt-analytics-engineering",
        5,
        "工业级数仓分层实战：Staging / Intermediate / Marts",
        "掌握现代数据栈标准数仓三层架构（Staging/Intermediate/Marts）的核心分工、命名规范、目录组织与反模式规避，具备设计并落地模块化企业级模型管道的能力。",
        lessons,
        exercises
    )
