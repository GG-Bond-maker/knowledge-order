# -*- coding: utf-8 -*-
"""Chapter 10: 快照管理、数据血缘与语义层 MetricFlow"""

from common import (
    lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter
)

def get_chapter_10():
    lessons = [
        lesson(
            "dbt-l10-1",
            "业务历史变更捕获：Kimball SCD Type 2 与 dbt Snapshot 机制",
            """### 业务系统抹去历史的“破坏性更新”

在常规业务系统（OLTP 数据库）中，数据通常是原地覆盖更新（In-place Update）的：
- 比如用户张三的收货地址原本在“上海市”，昨天他搬家修改为了“北京市”；业务数据库直接执行了 `UPDATE users SET address = '北京市' WHERE user_id = 1`。
- 如果数据仓库只是简单同步最新表，那么当财务或供应链分析师统计“去年各城市的总销售额”时，张三去年在上海买的所有订单，统计口径全都会被错误地算到北京头上！

这种由于业务系统直接覆盖修改导致的“历史追溯断裂”，在经典数仓理论中被称为**缓慢变化维（Slowly Changing Dimensions, SCD）**。

---

### Kimball SCD Type 2 历史版本保存标准

为了完美追溯历史真实切片，Ralph Kimball 提出了 **SCD Type 2（增加新行保留历史版本）**：
- 每当实体发生属性变更，**不在原记录上覆盖，而是新增一条记录**；
- 通过引入生命周期有效时间戳字段（如 `valid_from` 开始有效时间 与 `valid_to` 失效时间），记录该状态生效的具体历史区间。

```
 原始系统 (原地覆盖):
 user_id=1, name='张三', address='北京市'  <-- 曾经在上海的历史彻底消失！

 dbt Snapshot (SCD Type 2):
 ┌─────────┬────────┬────────┬─────────────────────┬─────────────────────┐
 │ user_id │ name   │ address│ dbt_valid_from      │ dbt_valid_to        │
 ├─────────┼────────┼────────┼─────────────────────┼─────────────────────┤
 │ 1       │ 张三   │ 上海市 │ 2023-01-01 00:00:00 │ 2024-05-10 14:30:00 │ (历史版本)
 │ 1       │ 张三   │ 北京市 │ 2024-05-10 14:30:00 │ NULL                │ (当前生效中)
 └─────────┴────────┴────────┴─────────────────────┴─────────────────────┘
```

---

### dbt Snapshot：自动实现 SCD Type 2

在传统数仓中，编写维护 SCD Type 2 的存储过程极其复杂（需要复杂的比对、关停旧行有效时间、插入新版本、加事务锁）。
而 dbt 将这一极其繁琐的过程浓缩为了 **`Snapshot（快照）`** 机制！
只需在 `snapshots/` 目录下声明一段配置和 SELECT 语句，每次运行 `dbt snapshot`，dbt 会自动比对源表与快照表的差异，自动关闭旧行并追加新行！
""",
            difficulty=2,
            tips="Snapshot 是分析工程捕获历史真相的神器。对于状态不断更新且源端没有保留变更日志的业务表（如用户档案、商品价格、店铺状态），必须通过 dbt Snapshot 进行 SCD Type 2 封存！"
        ),
        lesson(
            "dbt-l10-2",
            "Snapshot 实战策略：`check` 列对比与 `timestamp` 时间戳策略",
            """### dbt 快照的两大捕获策略（Strategies）

在定义快照时，dbt 提供了两种判断“源表某一行是否发生变更”的策略：

---

### 1. `timestamp` 策略（强烈推荐、性能最优）
- **前提条件**：源业务表中必须有一个可靠的最后更新时间戳字段（如 `updated_at`）。
- **运行机理**：dbt 每次运行快照时，仅需比对源表的 `updated_at` 是否大于现有快照中的最新记录时间戳。一旦大于，说明该行数据发生更新，自动生成新版本。

```sql
-- snapshots/snp_users.sql
{% snapshot snp_users %}

{{
    config(
      target_database='analytics',
      target_schema='snapshots',
      unique_key='id',
      strategy='timestamp',
      updated_at='updated_at',
    )
}}

select * from {{ source('app_db', 'users') }}

{% endsnapshot %}
```

---

### 2. `check` 策略（无更新时间戳时的救火方案）
- **适用场景**：源表设计极其简陋，根本没有维护 `updated_at` 字段。
- **运行机理**：dbt 会逐行计算并比对一组指定列的哈希值或值内容；一旦指定列中的任何一列发生变化，即触发生成新版本。
- **配置示例**：
```sql
-- snapshots/snp_product_prices.sql
{% snapshot snp_product_prices %}

{{
    config(
      target_database='analytics',
      target_schema='snapshots',
      unique_key='product_id',
      strategy='check',
      check_cols=['price_cents', 'discount_percent', 'is_in_stock'],
    )
}}

select * from {{ source('inventory', 'products') }}

{% endsnapshot %}
```
*提示：也可以配置 `check_cols='all'` 来检测所有字段，但在宽表时性能开销较大。*
""",
            difficulty=2,
            tips="只要源表有靠谱的 `updated_at`，坚决优先选择 `strategy='timestamp'`；只有在源表缺失更新时间戳时才退回到 `strategy='check'`。"
        ),
        lesson(
            "dbt-l10-3",
            "`dbt snapshot` 命令的底层建表机制：`dbt_valid_from` 与 `dbt_valid_to`",
            """### 深入 Snapshot 生成的元数据列

当我们在数仓中查询 dbt 生成的快照表时，会发现 dbt 自动在尾部追加了 4 个系统级元数据列：

| 字段名称 | 类型 | 业务含义与取值规则 |
| :--- | :--- | :--- |
| **`dbt_scd_id`** | `varchar(32)` | 该历史快照版本的全局唯一代理键（Surrogate Key），通常是 `md5(unique_key + valid_from)` |
| **`dbt_updated_at`** | `timestamp` | 源记录发生变更时记录的业务时间戳 |
| **`dbt_valid_from`**| `timestamp` | 本快照版本开始生效的起始时间戳 |
| **`dbt_valid_to`**  | `timestamp` | 本快照版本的失效时间戳；**若该版本当前仍在生效中，此字段严格为 `NULL`！** |

---

### 如何优雅消费 Snapshot 历史数据？

#### 场景 1：仅查询实体的当前最新切片（Current State）
只需在 WHERE 条件中过滤 `dbt_valid_to is null` 即可：
```sql
select *
from {{ ref('snp_users') }}
where dbt_valid_to is null;
```

#### 场景 2：基于事件发生时间实现“历史时光机穿梭（Point-in-Time Join）”
当需要为历史事实表（如 2023 年的一笔订单）关联当时的客户维度时：
```sql
select
    orders.order_id,
    orders.order_date,
    orders.order_amount,
    users.user_id,
    users.address as historical_shipping_address
from {{ ref('fct_orders') }} as orders
left join {{ ref('snp_users') }} as users
  on orders.customer_id = users.id
 and orders.order_date >= users.dbt_valid_from
 and (orders.order_date < users.dbt_valid_to or users.dbt_valid_to is null);
```
通过上述时间区间条件，无论用户后续改过多少次地址，订单总能精准还原其下单当时那个瞬间的真实地址！
""",
            difficulty=2,
            tips="记住两大消费模式：查当前最新切片用 `dbt_valid_to is null`；历史对齐用 `order_time >= dbt_valid_from and (order_time < dbt_valid_to or dbt_valid_to is null)`。"
        ),
        lesson(
            "dbt-l10-4",
            "文档生成与血缘图谱：`dbt docs generate`、`dbt docs serve` 与 DAG 资产盘点",
            """### 数据血缘（Lineage）与开箱即用的活文档

在现代企业中，最令数据分析师痛苦的事之一莫过于“找不到字段定义”和“不知道这个报表依赖了哪张上游表”。
传统基于 Wiki 或 Word 维护的数据字典，往往在写完的第二天就过时了。
dbt 的革命性在于：**文档即代码（Docs as Code），文档与数据模型共存且自动保持最新！**

---

### 两行命令生成现代化数据资产门户

#### 1. 编译并提取全仓元数据
在终端运行：
```bash
dbt docs generate
```
dbt 会在本地 `target/` 目录下生成三个核心 JSON 文件：
- `manifest.json`：包含全项目的完整 DAG 依赖图谱、模型配置、源码表定义；
- `catalog.json`：从数据仓库真实元数据中提取的列类型、大小、行数统计；
- `index.html`：轻量单页前端展示应用。

#### 2. 本地一键启动交互式文档网站
```bash
dbt docs serve --port 8080
```
该命令会自动在浏览器打开一个全功能数据门户网站。

```
 ┌────────────────────────────────────────────────────────┐
 │ dbt Docs 交互式资产门户界面                             │
 │ ├── 左侧目录树: Models / Sources / Seeds / Macros      │
 │ ├── 中间详情页: 表描述、列名、数据类型、关联的质量测试   │
 │ └── 右下角【View Lineage Graph】交互式血缘有向无环图   │
 └────────────────────────────────────────────────────────┘
```

---

### 交互式血缘图谱（Lineage Graph）的核心威力

点击文档右下角的“Lineage”按钮，你将获得整个数据仓库的端到端交互式拓扑图：
- **影响面评估（Impact Analysis）**：修改某个底层源表前，在血缘图中一键高亮所有下游依赖它的 50 张报表，彻底告别未知事故；
- **排障溯源（Root Cause Analysis）**：当某个财务报表出现异常数字时，逆向追踪上游所有链路，快速锁定问题模型；
- **资产盘点与去重**：直观发现没有下游消费的“孤儿模型”，及时清理无效算力开销。
""",
            difficulty=1,
            tips="在 CI/CD 流程中将 `dbt docs generate` 产物托管到内部 Web 服务器（如 S3/Nginx/GitHub Pages），是为全公司分析师提供数据字典的最佳实践！"
        ),
        lesson(
            "dbt-l10-5",
            "数据语义层（Semantic Layer）诞生背景：指标唯一定义的“北极星”",
            """### 指标分裂危机与语义层的黎明

虽然我们在 dbt 中建好了整洁的三层数仓宽表，但在企业日常消费中，一个经典的尴尬场景依然屡见不鲜：
- 财务团队在 Looker 上建了个指标叫“活跃营收（Active Revenue）”，定义是扣除退款；
- 营销团队在 Tableau 上也建了个“营收”，定义却包含了优惠券补贴；
- 数据科学家在 Python 笔记本里直接查询 SQL，自己写了一套过滤逻辑算营收。
最终，在管理层例会上，**三份报表得出了三个截然不同的“公司总营收”**！大家不再讨论业务策略，而是花两个小时吵“到底谁的数字是对的”！

造成该乱象的根本原因在于：**指标计算逻辑被硬编码分散在各个下游 BI 工具和分析师个人的 SQL 片段中！**

```
 [传统痛点：指标逻辑分裂在各个 BI 工具端]
 数仓物理表 (fct_orders)
    ├── Looker (手写定义 Metric: revenue = amount - refund)
    ├── Tableau (手写定义 Metric: revenue = amount + subsidy)
    └── Metabase (手写定义 Metric: revenue = amount)
            └── 结果：全公司指标口径彻底混乱分裂！

 [现代解决：dbt 语义层 (统一单点定义指标，下游透明消费)]
 dbt Semantic Layer (单一真实指标权威中心 MetricFlow)
    └── 统一声明: metric: revenue = sum(amount) - sum(refund)
            │
            ├── Looker 消费 ────────────┐
            ├── Tableau 消费 ───────────┼──> 所有终端展现完全一致的唯一真实数字！
            └── Python/Excel 消费 ──────┘
```

---

### dbt Semantic Layer 的使命：单一真实数据源（SSOT）

dbt 语义层的核心理念是：**将指标（Metrics）定义从 BI 工具中剥离出来，统一提升到代码仓库中集中管理！**
在代码中定义一次指标公式，无论通过任何下游工具消费，底层自动通过编译引擎动态生成标准的聚合 SQL，彻底保障全公司指标的绝对一致性（Single Source of Truth）。
""",
            difficulty=2,
            tips="语义层的精髓一句话概括：‘Define Once, Consume Anywhere’（一次定义，随处消费）！"
        ),
        lesson(
            "dbt-l10-6",
            "MetricFlow 核心概念：实体（Entities）、度量（Measures）与语义维度",
            """### MetricFlow 核心语义对象解密

dbt 语义层的核心执行引擎是 **MetricFlow**。
在 MetricFlow 中，我们通过 YAML 文件声明语义模型（Semantic Models），它由三大核心要素构成：

---

### 1. 语义模型（Semantic Model）与实体（Entities）
语义模型绑定到具体的 dbt 物理模型（如 `fct_orders`）。
**实体（Entity）** 是业务分析中的主谓宾角色与连接纽带，分为：
- `primary`（主键，如 `order_id`）
- `foreign`（外键，如 `customer_id`）

```yaml
# models/marts/finance/semantic_models/orders_semantic_model.yml
semantic_models:
  - name: orders_source
    model: ref('fct_orders')
    description: "订单明细语义源"
    entities:
      - name: order_id
        type: primary
      - name: customer_id
        type: foreign
```

---

### 2. 度量（Measures）：最底层的聚合数值基石
度量必须是纯粹的可聚合统计量（如 `sum`, `count`, `average`, `count_distinct`）：
```yaml
    measures:
      - name: order_total
        description: "订单总金额"
        agg: sum
        expr: amount_usd

      - name: order_count
        description: "完成的订单总数"
        agg: count
        expr: 1
```

---

### 3. 语义维度（Dimensions）：切片与切块的视角
维度用于对度量进行分组观察（时间、分类、布尔标签）：
```yaml
    dimensions:
      - name: is_food_order
        type: categorical
        expr: case when category = 'food' then true else false end
      - name: ordered_at
        type: time
        type_params:
          time_granularity: day
```

---

### 4. 最终消费指标（Metrics）：向外发布的业务指标
度量组合而成最终指标，支持简单度量指标、派生比率指标（Ratio）以及累计指标（Cumulative）：
```yaml
# models/marts/finance/metrics/financial_metrics.yml
metrics:
  # 简单汇总指标
  - name: total_revenue
    description: "总营业额"
    type: simple
    label: "Total Revenue"
    type_params:
      measure: order_total

  # 派生比率指标（如：客单价 = 总金额 / 总订单数）
  - name: average_order_value
    description: "平均客单价 AOV"
    type: ratio
    label: "Average Order Value (AOV)"
    type_params:
      numerator: total_revenue
      denominator: order_count
```
现在，任何工具只需请求 `average_order_value` 并按 `customer__country` 分组，MetricFlow 引擎便会自动生成精准的 JOIN 和除法 SQL 计算并交付结果！
""",
            difficulty=3,
            tips="牢记层级关系：Semantic Model 包含 Entities, Measures, Dimensions；然后由 Metrics 对 Measures 进行数学组合与定义！"
        ),
        lesson(
            "dbt-l10-7",
            "dbt 现代分析工程全景图与生产发布落地最佳实践",
            """### 现代分析工程全景回顾

经过前 10 章的系统化学习，我们已经完整走完了现代数据栈与分析工程的登顶之路：

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                     现代数据栈 (MDS) 全景拓扑                           │
 ├────────────────────────────────────────────────────────────────────────┤
 │ 1. 抽取与加载 (EL): Fivetran / Airbyte / Debezium CDC ──> 原始落地库    │
 │ 2. 存储与算力: Snowflake / BigQuery / Databricks / DuckDB              │
 │ 3. 分析工程与转换 (dbt):                                                │
 │    ├── 源码注册 (source() 与 freshness)                                │
 │    ├── 三层数仓 (Staging 1:1 -> Intermediate 组合 -> Marts 维度/事实)  │
 │    ├── 物化策略 (View / Table / 增量 Incremental 与 回溯安全窗口)      │
 │    ├── 动态编程 (Jinja 宏 / 环境隔离 / dbt-utils 扩展包)               │
 │    ├── 质量护城河 (四大约束测试 / 自定义断言 / 契约 Contract)          │
 │    └── 历史与语义 (Snapshot SCD2 / Docs 血缘 / MetricFlow 语义层)      │
 │ 4. 生产调度编排 (Orchestration): Apache Airflow / Dagster / Prefect    │
 │ 5. 下游消费与交付: BI 仪表盘 (Looker/Metabase) / 反向 ETL (Hightouch)  │
 └────────────────────────────────────────────────────────────────────────┘
```

---

### 企业级 dbt 落地黄金法则清单

1. **版本控制与分支工作流**：
   所有 SQL 变更必须走 Git PR 审查；配置 Slim CI（仅构建被修改的模型及其下游：`dbt build --select state:modified+`），极速提升持续集成速度。
2. **环境彻底隔离**：
   本地个人开发环境使用个人独立 Schema（`dbt_yourname`）；自动化测试环境（CI）每次自动创建临时 Schema 并在跑完后销毁；线上生产环境（Prod）由 Airflow 等自动化服务号独占写入。
3. **监控与告警闭环**：
   将 `dbt build` 的执行结果与 Slack、钉钉或企业微信对接。任何模型构建失败或质量测试不达标，立刻推送责任人和失败脏数据上下文。
4. **指标代码化文化普及**：
   推动业务分析师直接参与编写 YAML 测试与模型注释，让整个数据团队从“被动接需求跑数的苦力”转型为“打造高质量数据产品的工程师”！
""",
            difficulty=2,
            tips="恭喜你完成 dbt 分析工程的完整知识体系！你现在已经掌握了现代数据团队最核心的代码化工程思维与实战技能！"
        )
    ]

    exercises = [
        single_choice(
            "dbt-c10-e1",
            "在经典维度建模与分析工程中，当用户地址等属性被源业务系统直接覆盖更新时，用于在数仓中通过插入新行并记录生效时间段来完整保存历史版本的方法被称为：",
            [
                {"label": "Kimball SCD Type 1（覆盖更新）", "value": "A"},
                {"label": "Kimball SCD Type 2（新增历史行）", "value": "B"},
                {"label": "Kimball SCD Type 3（增加历史属性列）", "value": "C"},
                {"label": "Kimball SCD Type 0（固定不变）", "value": "D"}
            ],
            "B",
            "SCD Type 2（缓慢变化维第二种类型）通过为实体在发生变更时追加新记录行，配合有效时间戳区间（valid_from 到 valid_to）来追踪完整历史变迁。",
            1,
            "dbt-l10-1",
            ["scd2", "snapshots", "kimball"]
        ),
        single_choice(
            "dbt-c10-e2",
            "在 dbt Snapshot 生成的元数据列中，用于标识当前版本记录“仍在持续生效中、尚未被后续新版本替代”的标记特征是：",
            [
                {"label": "dbt_valid_to 字段的值为 NULL", "value": "A"},
                {"label": "dbt_valid_from 字段的值为 NULL", "value": "B"},
                {"label": "dbt_scd_id 字段的值为 0", "value": "C"},
                {"label": "dbt_updated_at 字段的值为当前服务器时间", "value": "D"}
            ],
            "A",
            "当某一行快照记录处于最新生效状态时，其 `dbt_valid_to` 字段严格保持为 `NULL`；一旦出现新版本，该字段会被更新为新版本的生效时间戳。",
            1,
            "dbt-l10-3",
            ["snapshots", "dbt_valid_to", "metadata"]
        ),
        single_choice(
            "dbt-c10-e3",
            "在命令行中，用于提取当前 dbt 项目元数据、表依赖结构与 Catalog 信息并生成文档静态 JSON 文件的核心命令是：",
            [
                {"label": "dbt run --docs", "value": "A"},
                {"label": "dbt docs generate", "value": "B"},
                {"label": "dbt lineage create", "value": "C"},
                {"label": "dbt make-manual", "value": "D"}
            ],
            "B",
            "`dbt docs generate` 负责扫描项目与数据库，生成包含完整 DAG 血缘和元数据的 `manifest.json` 与 `catalog.json` 文件。",
            1,
            "dbt-l10-4",
            ["cli", "dbt-docs", "lineage"]
        ),
        single_choice(
            "dbt-c10-e4",
            "在 dbt Semantic Layer (MetricFlow) 中，如果想定义一个业务指标“客单价（Average Order Value）= 总营收 / 订单总数”，该指标的 `type` 应该配置为：",
            [
                {"label": "simple", "value": "A"},
                {"label": "ratio", "value": "B"},
                {"label": "cumulative", "value": "C"},
                {"label": "derived_text", "value": "D"}
            ],
            "B",
            "`type: ratio` 专门用于定义由分子（numerator）和分母（denominator）两个度量相除计算得到的比率指标。",
            2,
            "dbt-l10-6",
            ["metricflow", "metrics", "ratio"]
        ),
        multiple_choice(
            "dbt-c10-e5",
            "关于 dbt 快照（Snapshot）的变更捕获策略，下列说法正确的有：",
            [
                {"label": "`strategy='timestamp'` 依赖源表的最后更新时间字段，性能高且最推荐", "value": "A"},
                {"label": "`strategy='check'` 适用于源表缺失更新时间戳字段的场景，通过比对指定列内容判断变更", "value": "B"},
                {"label": "快照模型存放在项目根目录下的 `snapshots/` 目录中，文件使用 `{% snapshot %}` 语法块声明", "value": "C"},
                {"label": "快照运行完成后会自动将源数据库中的原始表彻底清空以节约空间", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 均为 dbt Snapshot 的核心策略与规范。D 错误，快照只在数仓内只读抽取并构建历史版本，绝不会清空或破坏业务源系统数据。",
            2,
            "dbt-l10-2",
            ["snapshots", "strategies", "best-practices"]
        ),
        multiple_choice(
            "dbt-c10-e6",
            "通过 dbt Docs 生成的交互式数据血缘图谱（Lineage Graph），分析工程团队能够高效完成下列哪些任务？",
            [
                {"label": "在重构或删除模型前，进行影响面分析（Impact Analysis），评估下游依赖受波及范围", "value": "A"},
                {"label": "当终端报表数据异常时，逆向追溯上游全部链路（Root Cause Analysis）锁定问题表", "value": "B"},
                {"label": "识别没有下游任何消费的“孤儿模型”，优化清理冗余计算以节省云账单", "value": "C"},
                {"label": "让系统自动替分析师与业务部门开会决定公司年度 KPI 指标", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 展现了数据血缘图谱在架构治理、排错溯源与成本优化中的巨大价值。D 是纯管理决策，与血缘图谱无关。",
            2,
            "dbt-l10-4",
            ["lineage", "governance", "impact-analysis"]
        ),
        multiple_choice(
            "dbt-c10-e7",
            "为什么现代数据团队需要引入以 MetricFlow 为代表的数据语义层（Semantic Layer）？",
            [
                {"label": "解决不同 BI 工具中各自写计算逻辑导致的指标口径分裂、数字对不上的痛点", "value": "A"},
                {"label": "实现指标的集中代码化管理（Single Source of Truth），实现“一次定义，随处消费”", "value": "B"},
                {"label": "解耦业务指标与底层物理 SQL 结构，让业务人员通过统一的维度和指标名称自由自助分析", "value": "C"},
                {"label": "完全替代所有的关系型数据库与列存数据仓库底层存储引擎", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 正确反映了语义层诞生和风靡的核心驱动力。D 错误，语义层是建立在数据仓库之上的抽象语义与编译层，不替代底层数仓存储。",
            2,
            "dbt-l10-5",
            ["semantic-layer", "metricflow", "ssot"]
        ),
        judge(
            "dbt-c10-e8",
            "在 dbt 中，`dbt docs serve` 命令不仅能在本地启动文档服务器，还能允许用户在网页端直接修改模型 SQL 并反向写回 Git 仓库。",
            "错误",
            "`dbt docs serve` 启动的是纯只读的数据字典与血缘静态展示站点，无法在网页端编辑或反写底层 Git 代码。",
            1,
            "dbt-l10-4",
            ["dbt-docs", "limitations"]
        ),
        judge(
            "dbt-c10-e9",
            "使用 `timestamp` 策略配置 Snapshot 时，如果源表中的某一行被修改但 `updated_at` 时间戳没有发生变化，dbt 会自动识别字段内容并依然触发新增快照版本。",
            "错误",
            "`timestamp` 策略完全依赖 `updated_at` 时间戳的递增。如果源表数据变了但时间戳未更新，dbt 将无法检测到变更，此种情况应选用 `strategy='check'`。",
            2,
            "dbt-l10-2",
            ["snapshots", "strategies", "timestamp-behavior"]
        ),
        judge(
            "dbt-c10-e10",
            "在 MetricFlow 语义模型中，Entities（实体）分为主键（primary）和外键（foreign），它们是 MetricFlow 在多表之间自动计算指标并智能生成 JOIN 条件的语法桥梁。",
            "正确",
            "MetricFlow 正是通过定义好的 primary 与 foreign 实体关系，在用户请求跨多实体指标时自动推导并生成正确的关联路径。",
            2,
            "dbt-l10-6",
            ["metricflow", "entities", "joins"]
        ),
        fill(
            "dbt-c10-e11",
            "在 dbt 项目中，存放缓慢变化维快照模型文件的专门目录是 [BLANK1]/；执行快照更新与版本维护的专用终端命令是 `dbt [BLANK2]`。",
            [["snapshots"], ["snapshot"]],
            "快照文件存放于 `snapshots/` 目录下，通过 `dbt snapshot` 命令执行。",
            1,
            "dbt-l10-1",
            ["cli", "snapshots"]
        ),
        fill(
            "dbt-c10-e12",
            "在 dbt 语义层架构中，底层最基础的可加或不可加聚合数值（如 sum(amount)）被称为 [BLANK1]（Measure）；而向上交付给业务报表消费、支持加减乘除计算的业务实体被称为 [BLANK2]（Metric）。",
            [["Measures", "度量", "measure"], ["Metrics", "指标", "metric"]],
            "在 MetricFlow 中，度量（Measure）是聚合物理列的基础单元，指标（Metric）是面向业务最终消费的逻辑实体。",
            2,
            "dbt-l10-6",
            ["metricflow", "measures", "metrics"]
        ),
        open_ex(
            "dbt-c10-e13",
            "某电商平台商品价格表 `raw.products` 包含字段：`product_id`、`category`、`price_cents`、`updated_at`。商家会频繁在后台修改商品售价。\n现需要构建一个完整的历史价格追溯与订单核算闭环：\n1. 编写快照文件 `snapshots/snp_products.sql`，使用 `timestamp` 策略实现 SCD Type 2 快照；\n2. 假设已有订单事实表 `fct_orders`（包含 `order_id`、`product_id`、`order_date`）。请写出一段 SQL 查询，通过与上述快照表进行时光机穿梭（Point-in-Time Join），准确获取每笔订单在下单当时的真实商品单价（`price_at_order_time`）。",
            "1. **快照定义文件 `snapshots/snp_products.sql`**：\n```sql\n{% snapshot snp_products %}\n\n{{\n    config(\n      target_schema='snapshots',\n      unique_key='product_id',\n      strategy='timestamp',\n      updated_at='updated_at'\n    )\n}}\n\nselect * from {{ source('raw', 'products') }}\n\n{% endsnapshot %}\n```\n\n2. **历史对齐查询（Point-in-Time Join）**：\n```sql\nselect\n    o.order_id,\n    o.product_id,\n    o.order_date,\n    p.price_cents / 100.0 as price_at_order_time\nfrom {{ ref('fct_orders') }} as o\nleft join {{ ref('snp_products') }} as p\n  on o.product_id = p.product_id\n and o.order_date >= p.dbt_valid_from\n and (o.order_date < p.dbt_valid_to or p.dbt_valid_to is null);\n```",
            "SCD Type 2 快照定义与时间点关联（Point-in-Time Join）综合实践考查。",
            [
                {"point": "正确编写 {% snapshot snp_products %} 并在 config 中配置 unique_key, strategy='timestamp', updated_at", "score": 2},
                {"point": "在关联查询中正确连接 o.product_id = p.product_id", "score": 1},
                {"point": "在关联条件中准确实现时间段匹配：order_date >= dbt_valid_from and (order_date < dbt_valid_to or dbt_valid_to is null)", "score": 2}
            ],
            "正确编写 snapshot 配置（unique_key, timestamp 策略及 updated_at）；在订单表中与快照进行 left join，利用 >= dbt_valid_from 并且 (< dbt_valid_to 或 is null) 锁定下单瞬时价格。",
            4,
            "dbt-l10-3",
            ["snapshot-coding", "point-in-time-join", "scd2"]
        )
    ]

    return chapter(
        "dbt-c10",
        "dbt-analytics-engineering",
        10,
        "快照管理、数据血缘与语义层 MetricFlow",
        "系统掌握 Kimball SCD Type 2 历史版本追踪机制与 dbt Snapshot 落地实战，精通数据字典与交互式 DAG 血缘分析，深度理解 MetricFlow 语义层原理与“定义一次、随处消费”的指标治理哲学。",
        lessons,
        exercises
    )
