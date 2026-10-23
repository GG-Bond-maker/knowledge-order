# -*- coding: utf-8 -*-
"""Chapter 9: 数据质量测试体系与模型契约"""

from common import (
    lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter
)

def get_chapter_9():
    lessons = [
        lesson(
            "dbt-l9-1",
            "现代数仓的数据质量危机与 dbt 测试驱动开发 (TDD) 哲学",
            """### 数据工程的“静默故障”危机

在传统软件开发中，如果后端接口出现 Bug，通常会直接抛出 HTTP 500 异常或系统崩溃，告警系统会立刻通知工程师修复。
但在数据仓库领域，**最可怕的故障往往是“静默发生”的**：
- 生产环境的订单表没有任何报错，任务正常执行完毕；
- 但由于上游业务改版，某个字段被填入了 NULL；
- 或者由于 JOIN 逻辑出现笛卡尔积，导致原本 1 万条的订单翻倍变成了 2 万条；
- 最终，CEO 和业务总监在周一早晨看到了一份虚假翻倍的营收看板，做出了错误的商业决策！

这种数据质量问题被称为**数据静默腐化（Silent Data Corruption）**。

---

### dbt 的测试驱动开发（TDD）哲学

dbt 将现代软件工程的**自动化测试体系（Testing）**全面引入数据转换流中。
在 dbt 的哲学里：
1. **测试是一等公民**：测试不是上线后的附庸，而是与 SQL 转换模型平起平坐的核心资产；
2. **声明式测试（Declarative Testing）**：只需在 YAML 文件中写下一行配置，dbt 就会自动构建对应的校验查询；
3. **熔断机制（Circuit Breaker）**：通过 `dbt build`，一旦上游清洗或核心主键测试失败，下游所有依赖模型立刻自动中止构建，将脏数据死死拦截在生产大门之外！

```
                     dbt build
                         │
      ┌──────────────────┴──────────────────┐
      ▼                                     ▼
 运行模型 SQL (fct_orders)           运行质量测试 (unique, not_null)
      │                                     │
      └──────────────────┬──────────────────┘
                         │
              ┌──────────┴──────────┐
              ▼ (测试通过)          ▼ (测试失败)
        继续构建下游模型          【熔断拦截】停止构建
      (fct_finance_report)      保护下游 BI 避免被脏数据污染！
```
""",
            difficulty=1,
            tips="记住：没有测试的数据管道就是一颗定时炸弹！在 dbt 中，交付一个模型的标准是‘SQL 代码 + YAML 质量测试’缺一不可！"
        ),
        lesson(
            "dbt-l9-2",
            "四大开箱即用通用测试：`unique`、`not_null`、`accepted_values` 与 `relationships`",
            """### dbt 四大核心基础通用测试

dbt 官方内置了四种最常用、最核心的开箱即用通用测试（Generic Tests）。我们无需手写任何 SQL，只需在模型的 YAML 模式文件中声明即可：

```yaml
# models/staging/jaffle_shop/_jaffle_shop__models.yml
version: 2

models:
  - name: stg_jaffle_shop__orders
    description: "清洗后的标准订单表"
    columns:
      - name: order_id
        description: "订单唯一业务主键"
        tests:
          - unique        # 1. 唯一性测试
          - not_null      # 2. 非空测试

      - name: status
        description: "订单生命周期状态"
        tests:
          - accepted_values: # 3. 枚举允许值测试
              values: ['placed', 'shipped', 'completed', 'return_pending', 'returned']

      - name: customer_id
        description: "外键关联用户主键"
        tests:
          - relationships:   # 4. 外键引用完整性测试
              to: ref('stg_jaffle_shop__customers')
              field: customer_id
```

---

### 四大测试的职责与业务保障

| 测试名称 | 验证规则 | 典型应用场景 | 违反时的业务危害 |
| :--- | :--- | :--- | :--- |
| **`unique`** | 该列中的每一个非空值都必须全局唯一，不可重复 | 主键 ID、订单号、用户哈希代理键 | 发生 JOIN 膨胀，导致指标翻倍计算 |
| **`not_null`** | 该列中严禁存在任何 `NULL` 空值 | 主键、时间戳、重要度量金额 | 导致关联断裂（Drop）或空指针统计失真 |
| **`accepted_values`**| 该列的值必须严格属于给定的白名单枚举列表 | 状态码（status）、渠道（channel）、币种（currency） | 上游偷偷新增了未经治理的新状态，导致下游 CASE WHEN 漏兜底 |
| **`relationships`** | 当前表的外键值必须能在被引用的父表指定字段中找到（外键约束） | `fct_orders.customer_id` 必须存在于 `dim_customers` 中 | 产生孤儿记录（Orphan records），导致无法关联出用户信息 |
""",
            difficulty=1,
            tips="主键两件套（unique + not_null）是每一张 dbt 模型的强制底线配置；任何带外键的模型都必须配置 relationships 测试！"
        ),
        lesson(
            "dbt-l9-3",
            "测试底层揭秘：测试本质是一段“预期返回 0 行”的断言查询",
            """### 揭开 dbt 测试的底层运行机制

很多初学者觉得 dbt 测试很神秘，以为数据仓库里安装了某种特殊的监控探针。
其实，**dbt 测试的底层原理极其朴素且纯粹**：
**每一个 dbt 测试，在本质上都是一段纯粹的 SQL 查询！它的成功判断准则永远只有一条：预期返回 0 行！**

```
   ┌────────────────────────────────────────────────────────┐
   │ dbt 运行测试 SQL                                       │
   │ SELECT ... FROM table WHERE 存在违规条件               │
   └────────────────────────────────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼ (返回 0 行记录)             ▼ (返回 > 0 行记录)
          【 PASS（通过）】             【 FAIL（失败）】
          没有任何数据违背约束          返回的行就是具体的脏数据样本！
```

---

### 探秘四大内置测试编译出的真实 SQL

以我们在 YAML 里声明的测试为例，看看 `dbt test` 在后台究竟向数据库发了什么语句：

#### 1. `not_null` 的底层 SQL
```sql
select *
from {{ ref('stg_jaffle_shop__orders') }}
where order_id is null
```
*如果数据库里查出了哪怕 1 行 `order_id is null` 的数据，返回行数 > 0，测试直接被判定为 FAIL！*

#### 2. `unique` 的底层 SQL
```sql
select
    order_id,
    count(*) as n_records
from {{ ref('stg_jaffle_shop__orders') }}
where order_id is not null
group by order_id
having count(*) > 1
```
*通过 `having count(*) > 1` 找出所有重复的主键值。如果存在重复，测试即刻暴毙！*

#### 3. `accepted_values` 的底层 SQL
```sql
select status
from {{ ref('stg_jaffle_shop__orders') }}
where status not in ('placed', 'shipped', 'completed', 'return_pending', 'returned')
```

#### 4. `relationships` 的底层 SQL
```sql
select child.customer_id
from {{ ref('stg_orders') }} as child
left join {{ ref('stg_customers') }} as parent
  on child.customer_id = parent.customer_id
where parent.customer_id is null
  and child.customer_id is not null
```
*通过经典的 LEFT JOIN 判断外键悬空（孤儿外键），一网打尽！*
""",
            difficulty=2,
            tips="理解‘测试就是返回 0 行的查询’是掌握 dbt 高级测试与编写自定义测试的钥匙：查出的每一行都是脏数据样本，没有返回任何行就是世界和平！"
        ),
        lesson(
            "dbt-l9-4",
            "自定义通用测试（Generic Tests）开发：编写可配置参数的断言宏",
            """### 当官方测试不够用：编写自定义 Generic Test

官方的四大测试虽然强大，但真实业务中的数据质量规则千奇百怪：
- 金额必须大于等于 0（或者大于某个给定的阈值）；
- 结束时间必须严格晚于开始时间；
- 手机号格式必须符合特定正则。

在 dbt 中，你可以把任意一段返回脏数据行的 SQL 封装在 `macros/` 目录下，并以 `test_` 开头命名宏，它就会**自动升格为全局通用的通用测试**！

---

### 实战：编写 `assert_column_greater_than` 通用测试

在 `macros/test_assert_column_greater_than.sql` 中编写：

```sql
-- macros/test_assert_column_greater_than.sql
{% test assert_column_greater_than(model, column_name, min_value=0) %}

select
    {{ column_name }} as invalid_value
from {{ model }}
where {{ column_name }} < {{ min_value }}
   or {{ column_name }} is null

{% endtest %}
```

#### 语法规则解析：
1. 宏定界符使用 `{% test 测试名称(model, column_name, 自定义参数...) %}` 与 `{% endtest %}`；
2. 前两个入参必须是 `model` 和 `column_name`，由 dbt 自动注入；
3. 内部查询必须返回所有**不符合规则（违规）**的记录。

---

### 在 YAML 文件中像内置测试一样轻松调用！

编写完上述宏后，项目中任何模型的任何字段都能在 YAML 中直接使用它：

```yaml
# models/marts/finance/_finance__models.yml
models:
  - name: fct_orders
    columns:
      - name: amount_usd
        tests:
          - assert_column_greater_than:
              min_value: 0.01   # 业务要求订单金额必须大于 1 美分
```
运行 `dbt test --select fct_orders`，你的自定义规则便与官方测试并肩作战！
""",
            difficulty=3,
            tips="自定义通用测试非常适合在整个团队中沉淀行业专用规则（如：运单重量必须大于零、折扣率必须在 0 到 1 之间）。"
        ),
        lesson(
            "dbt-l9-5",
            "单数测试（Singular Tests）在复杂多表业务合规校验中的落地",
            """### 什么是单数测试（Singular Tests）？

通用测试（Generic Tests）适合定义在 YAML 里的单个列上。但如果遇到**高度特定、不可复用、跨多张表的大型业务合规断言**，该怎么办？
例如：
- 财务合规铁律：**“任何一天，支付成功的总流水必须等于财务账单系统的入账总和，误差不得超过 1 美元！”**
- 运力平衡铁律：**“仓库中已出库但未送达的包裹数，不能大于全网活跃配送员的最大载货上限！”**

针对这种一对一的复杂场景，dbt 提供了**单数测试（Singular Tests）**：
- 存放在项目根目录下的 `tests/` 目录中；
- 每一个 `.sql` 文件就是一个独立的测试；
- 内部可以直接自由调用 `{{ ref(...) }}` 关联任意多张表；
- **同样的黄金准则：如果查询返回了任何行，测试判定失败！**

---

### 实战：校验全天订单金额与支付明细总额是否完全一致

```sql
-- tests/assert_daily_order_payments_reconciliation.sql
with 

daily_orders as (
    select
        order_date,
        sum(amount_usd) as total_order_amount
    from {{ ref('fct_orders') }}
    group by 1
),

daily_payments as (
    select
        payment_date as order_date,
        sum(payment_amount) as total_payment_amount
    from {{ ref('fct_payments') }}
    where payment_status = 'success'
    group by 1
),

diff as (
    select
        o.order_date,
        o.total_order_amount,
        p.total_payment_amount,
        abs(o.total_order_amount - p.total_payment_amount) as diff_amount
    from daily_orders o
    join daily_payments p using (order_date)
    where abs(o.total_order_amount - p.total_payment_amount) > 1.00 -- 容忍 1 美元以内汇率四舍五入误差
)

-- 只要有任何一天的差异超过 1 美元，这里就会返回记录，导致测试报错！
select * from diff
```
运行 `dbt test --select assert_daily_order_payments_reconciliation`，数仓财务对账完全自动化！
""",
            difficulty=2,
            tips="单数测试写在 `tests/` 目录下，适合承担跨表对账、端到端财务平衡校验等复杂任务。查不出数据即通过，查出差异即告警！"
        ),
        lesson(
            "dbt-l9-6",
            "测试严重级别与阈值容忍：`severity: warn / error` 与 `threshold: >= 10`",
            """### 避免“测试狼来了”：严重级别与阈值治理

在真实的大型生产环境中，如果任何微小的数据波动都直接抛出致命 ERROR 并中断管道构建，往往会导致数据团队疲于奔命：
- 比如第三方爬虫源偶尔漏了 3 行无序数据，如果为此阻断了公司整个核心财务报表构建，代价过大；
- 但如果完全不报，日积月累又会酿成大祸。

dbt 提供了精细化的**测试严重级别（Severity）**与**故障阈值（Thresholds）**配置机制：

---

### 配置 `severity: warn`（警告而不中断构建）

通过在 YAML 测试下声明 `severity: warn`，当测试未通过时，dbt 仅在控制台与日志中输出橙色 WARNING 警告，**但不会中止后续下游模型的构建**：

```yaml
# models/marts/marketing/_marketing__models.yml
models:
  - name: dim_users
    columns:
      - name: email
        tests:
          - not_null:
              config:
                severity: warn   # 允许存在少量未绑定邮箱的用户，报警告即可
```

---

### 配置容忍阈值：`error_if` 与 `warn_if`

你可以根据业务容忍度，设置允许违规的样本行数阈值：

```yaml
models:
  - name: stg_web_traffic
    columns:
      - name: referrer_url
        tests:
          - not_null:
              config:
                severity: error
                error_if: ">50"    # 违规行数超过 50 行才中断管道阻断发布
                warn_if: ">5"      # 违规行数在 6~50 行之间时仅输出告警
```

---

### 自动化故障排查：`--store-failures`

当测试失败时，我们往往需要知道“到底哪几行数据违规了”。
在终端执行：
```bash
dbt test --store-failures
```
dbt 会自动在数据仓库的测试 schema 中，把那段测试 SQL 返回的所有违规行**持久化保存为一张真实的物理表**！
数据工程师只需直接 `SELECT * FROM test_failures_schema.assert_not_null_stg_orders_order_id`，违规脏数据原形毕露，排查效率提升 10 倍！
""",
            difficulty=2,
            tips="善用 `--store-failures` 可以在测试报错时自动固化脏数据样本，彻底省去工程师手动把测试 SQL 拷出来现场排查的痛苦！"
        ),
        lesson(
            "dbt-l9-7",
            "模型契约（Model Contracts）与版本化变更管理：将数据管道升级为工业级 API",
            """### 数据即接口：模型契约（Model Contracts）

在过去，上游数据团队重构模型时，可能会悄悄删掉一列、或者将原本的 `integer` 类型改成了 `varchar`，导致下游依赖该模型的数十个报表或反向 ETL 任务在生产中瞬时雪崩。
**模型契约（Model Contracts）** 是 dbt 为解决这一痛点引入的“防御性软件工程规范”。
它强制要求模型向外发布时，**显式声明并承诺字段名称、数据类型以及约束条件**。一旦构建出来的 SQL 产出不符合契约，dbt 在物化入库之前就会强行拒绝！

---

### 声明模型契约与字段强约束

在 YAML 文件中开启 `contract.enforced: true`：

```yaml
# models/marts/core/_core__models.yml
models:
  - name: dim_customers
    config:
      contract:
        enforced: true    # 强制启用模型契约！
    columns:
      - name: customer_id
        data_type: integer
        constraints:
          - type: not_null
          - type: primary_key
      - name: email
        data_type: varchar
      - name: first_order_date
        data_type: date
```

#### 契约的强制保护机制：
1. **类型一致性**：若 SQL 中 `customer_id` 输出了 `varchar`，构建直接失败；
2. **列数一致性**：若 SQL 中漏掉了 `email` 字段，或者未经契约声明额外输出了其他未登记列，构建直接失败；
3. **数据库级约束下推**：对于支持的云数仓（如 Snowflake, BigQuery, PostgreSQL），dbt 会在建表 DDL 中真正下推物理主键与非空约束！

---

### 模型的版本化管理（Model Versioning）

当模型发生破坏性不可向后兼容的改动（Breaking Changes）时，dbt 支持类似 Web API 的版本化管理（如 `v1`, `v2`）：

```yaml
models:
  - name: dim_customers
    latest_version: 2
    versions:
      - v: 1
      - v: 2
        config:
          contract:
            enforced: true
```
下游团队可以平滑迁移，在确认无误前继续依赖稳定版本，全面告别下游“不知情猝死”！
""",
            difficulty=3,
            tips="模型契约将数仓交付物从‘随手写的 SQL 结果’升格为‘具有严格类型承诺的工业级数据产品（Data Product）’！"
        )
    ]

    exercises = [
        single_choice(
            "dbt-c9-e1",
            "关于 dbt 内置的四大通用数据质量测试，下列用于验证某外键字段的值必须全部存在于另一张父表的主键列中的测试是：",
            [
                {"label": "unique", "value": "A"},
                {"label": "not_null", "value": "B"},
                {"label": "accepted_values", "value": "C"},
                {"label": "relationships", "value": "D"}
            ],
            "D",
            "`relationships` 测试负责校验两张表之间的外键引用完整性（Referential Integrity），检测是否存在孤儿记录。",
            1,
            "dbt-l9-2",
            ["testing", "relationships", "referential-integrity"]
        ),
        single_choice(
            "dbt-c9-e2",
            "在 dbt 的测试底层执行机制中，一个数据质量测试判断为“测试通过（PASS）”的充要条件是测试 SQL 查询：",
            [
                {"label": "返回的行数必须恰好等于 1 行，且结果为 true", "value": "A"},
                {"label": "返回的行数必须严格等于 0 行（没有违规脏数据）", "value": "B"},
                {"label": "在 10 秒之内快速执行完毕", "value": "C"},
                {"label": "返回的第一个字段值大于 100", "value": "D"}
            ],
            "B",
            "dbt 测试的底层核心哲学是“断言反例”：测试 SQL 负责检索所有不符合规则的行。只有当返回行数严格为 0 时，才意味着没有任何数据违背约束，判定为 PASS。",
            1,
            "dbt-l9-3",
            ["testing-mechanism", "assertion", "zero-rows"]
        ),
        single_choice(
            "dbt-c9-e3",
            "存放在项目根目录 `tests/` 下、采用纯 SQL 编写且通常用于执行跨多张表复杂业务对账的测试属于：",
            [
                {"label": "单数测试（Singular Tests）", "value": "A"},
                {"label": "通用测试（Generic Tests）", "value": "B"},
                {"label": "模型契约（Model Contracts）", "value": "C"},
                {"label": "单元快照（Unit Snapshots）", "value": "D"}
            ],
            "A",
            "写在 `tests/*.sql` 中的独立特定业务查询测试被称为单数测试（Singular Tests），专门用于高度客制化、跨表的特定质量与财务对账校验。",
            1,
            "dbt-l9-5",
            ["singular-tests", "testing"]
        ),
        single_choice(
            "dbt-c9-e4",
            "如果希望在执行 `dbt test` 发现质量测试失败时，将所有违规的脏数据行自动固化保存为数据库物理表以供离线审查，应在命令行追加的参数是：",
            [
                {"label": "--debug-sql", "value": "A"},
                {"label": "--store-failures", "value": "B"},
                {"label": "--save-errors", "value": "C"},
                {"label": "--freeze-tables", "value": "D"}
            ],
            "B",
            "`--store-failures` 参数会让 dbt 将所有失败测试查询出的样本结果持久化写入测试 schema 中，极大简化了脏数据排查工作。",
            2,
            "dbt-l9-6",
            ["cli", "store-failures", "debugging"]
        ),
        multiple_choice(
            "dbt-c9-e5",
            "在 dbt 项目中，下列关于通用测试（Generic Tests）的描述正确的有：",
            [
                {"label": "四大核心测试为 `unique`、`not_null`、`accepted_values` 与 `relationships`", "value": "A"},
                {"label": "通用测试通常直接声明在 YAML 模式文件中的 `columns.tests` 节点下", "value": "B"},
                {"label": "可以通过在 `macros/` 目录下编写 `{% test ... %}` 宏自定义通用的跨模型可复用测试", "value": "C"},
                {"label": "通用测试只能检测物理表（table），绝不能检测视图（view）", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 均为通用测试的标准特性。D 错误，通用测试底层是执行 SELECT 过滤，无论底层物化为 table 还是 view 均可正常执行测试。",
            2,
            "dbt-l9-2",
            ["generic-tests", "yaml", "best-practices"]
        ),
        multiple_choice(
            "dbt-c9-e6",
            "关于 dbt 的“模型契约（Model Contracts）”，下列说法正确的有：",
            [
                {"label": "通过配置 `contract: { enforced: true }` 开启强制契约保障", "value": "A"},
                {"label": "模型契约要求在 YAML 中显式声明字段的名称与数据类型（data_type）", "value": "B"},
                {"label": "若编译出的 SQL 输出字段与契约声明不一致，dbt 将中断构建并拒绝写入数据库", "value": "C"},
                {"label": "模型契约会完全禁止对表进行任何增量（incremental）更新", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 正确。D 错误，模型契约完全兼容并保护增量模型，确保增量写入时列结构与类型丝毫不差。",
            2,
            "dbt-l9-7",
            ["contracts", "data-governance", "api-mindset"]
        ),
        multiple_choice(
            "dbt-c9-e7",
            "在大型复杂数仓中，为了防止数据测试因轻微异常频繁造成误报阻断，可以采取的治理手段包括：",
            [
                {"label": "将部分非核心字段测试严重级别配置为 `severity: warn`", "value": "A"},
                {"label": "使用 `error_if: '>50'` 配置允许容忍 50 行以内的异常波动", "value": "B"},
                {"label": "将 `dbt build` 命令拆分，利用 `--store-failures` 异步固化异常数据供报警系统消费", "value": "C"},
                {"label": "直接将项目中所有 YAML 测试配置全部删除，眼不见心不烦", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 是科学的数据质量治理和告警降噪手段。D 属于掩耳盗铃，彻底摧毁了数仓的可靠性。",
            2,
            "dbt-l9-6",
            ["alerting", "governance", "thresholds"]
        ),
        judge(
            "dbt-c9-e8",
            "在 dbt 中，`dbt build` 命令不仅会按依赖顺序运行各个模型的构建 SQL，还会在模型构建完成后自动运行其关联的数据质量测试。",
            "正确",
            "`dbt build` 是现代 dbt 推荐的核心全能命令，它将 `run`、`test`、`seed`、`snapshot` 统一编排，且在测试报错时自动熔断下游构建。",
            1,
            "dbt-l9-1",
            ["dbt-build", "workflow"]
        ),
        judge(
            "dbt-c9-e9",
            "单数测试（Singular Tests）的文件名必须以 `test_` 开头，且文件内严禁使用 `{{ ref(...) }}` 宏。",
            "错误",
            "单数测试是放置在 `tests/` 目录下的纯 `.sql` 文件，文件名即测试名，内部完全可以且推荐使用 `{{ ref(...) }}` 来引用数仓模型。",
            2,
            "dbt-l9-5",
            ["singular-tests", "syntax"]
        ),
        judge(
            "dbt-c9-e10",
            "使用 `accepted_values` 测试时，如果数据仓库该列中存在 NULL 值，该测试默认会因为 NULL 不在枚举列表中而立即判定失败，除非显式配置忽略空值。",
            "错误",
            "在 dbt 官方设计中，`accepted_values` 测试默认只校验非 NULL 的值是否属于枚举集，忽略 NULL 值（针对 NULL 的校验由 `not_null` 测试独立承担，实现关注点分离）。",
            2,
            "dbt-l9-2",
            ["accepted_values", "null-handling"]
        ),
        fill(
            "dbt-c9-e11",
            "在模型 YAML 文件中，声明某字段不可为空的测试名称是 [BLANK1]，声明某字段全局无重复值的测试名称是 [BLANK2]。",
            [["not_null"], ["unique"]],
            "两大最核心基础测试：`not_null` 与 `unique`。",
            1,
            "dbt-l9-2",
            ["testing", "unique", "not_null"]
        ),
        fill(
            "dbt-c9-e12",
            "如果希望某个测试在违规样本产生时仅输出警告而不中止后续下游模型的构建，应在其 `config` 下将严重级别字段配置为 `severity: [BLANK1]`。",
            [["warn", "warning"]],
            "设置 `severity: warn` 可以让测试只报警告而不中断流水线构建。",
            2,
            "dbt-l9-6",
            ["severity", "warn"]
        ),
        open_ex(
            "dbt-c9-e13",
            "某电商核心事实表 `fct_orders` 包含字段：`order_id`、`customer_id`、`order_status`、`total_amount`。\n业务规则要求：\n1. `order_id` 必须为主键（唯一且非空）；\n2. `customer_id` 必须关联自 `dim_customers` 表的 `customer_id`；\n3. `order_status` 仅允许取值为 `['pending', 'paid', 'cancelled', 'refunded']`；\n4. `total_amount` 必须大于等于 0。\n请完整写出 `models/marts/finance/_finance__models.yml` 文件中对 `fct_orders` 表上述全部质量规则的 YAML 测试配置代码（对于规则 4，请编写符合规范的自定义测试配置或基于 dbt-expectations / 宏的配置）。",
            "```yaml\nversion: 2\n\nmodels:\n  - name: fct_orders\n    description: \"电商订单核心事实表\"\n    columns:\n      - name: order_id\n        description: \"订单唯一主键\"\n        tests:\n          - unique\n          - not_null\n\n      - name: customer_id\n        description: \"客户外键\"\n        tests:\n          - relationships:\n              to: ref('dim_customers')\n              field: customer_id\n\n      - name: order_status\n        description: \"订单生命周期状态\"\n        tests:\n          - accepted_values:\n              values: ['pending', 'paid', 'cancelled', 'refunded']\n\n      - name: total_amount\n        description: \"订单总金额\"\n        tests:\n          - not_null\n          - dbt_utils.expression_is_true:\n              expression: \">= 0\"\n```\n*(注：金额大于等于 0 亦可配置自定义通用测试如 `assert_column_greater_than` 或 `dbt_expectations.expect_column_values_to_be_between`)*",
            "YAML 质量测试综合实战考查：涵盖四大基础测试（unique, not_null, relationships, accepted_values）以及数值边界校验的 YAML 组织。",
            [
                {"point": "正确为 order_id 配置 unique 和 not_null 测试", "score": 1},
                {"point": "正确为 customer_id 配置 relationships 测试并声明 to: ref('dim_customers') 和 field", "score": 1},
                {"point": "正确为 order_status 配置 accepted_values 测试并列出 4 种枚举值", "score": 1},
                {"point": "为 total_amount 配置合理的数值边界校验测试（如 expression_is_true 或自定义宏）", "score": 1}
            ],
            "在 YAML 中为 order_id 配置 unique/not_null；为 customer_id 配置 relationships(to, field)；为 order_status 配置 accepted_values(values)；为 total_amount 配置大于等于 0 的测试断言。",
            4,
            "dbt-l9-2",
            ["yaml-testing", "data-quality", "practical-case"]
        )
    ]

    return chapter(
        "dbt-c9",
        "dbt-analytics-engineering",
        9,
        "数据质量测试体系与模型契约",
        "深入理解 dbt 测试驱动开发哲学，掌握四大开箱即用通用测试、自定义断言宏开发与单数跨表对账测试，熟练运用阈值熔断与模型契约（Model Contracts）打造企业级防御性数据工程管道。",
        lessons,
        exercises
    )
