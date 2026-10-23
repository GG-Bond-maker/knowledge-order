# -*- coding: utf-8 -*-
"""Chapter 7: Jinja 模板引擎与动态 SQL 编程"""

from common import (
    lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter
)

def get_chapter_7():
    lessons = [
        lesson(
            "dbt-l7-1",
            "当 SQL 遇见 Python 哲学：Jinja 模板在 dbt 中的核心角色与表达式基础",
            """### 为什么纯 SQL 不够用？

SQL 是一种极佳的声明式数据查询语言，但在工程化场景中，纯 SQL 存在明显的表达力瓶颈：
- **缺乏控制流**：SQL 无法直接通过循环（Loop）根据列清单自动生成多行聚合逻辑；
- **缺乏动态环境感知**：无法在本地开发环境与生产环境之间无缝切换数据表前缀或日期范围；
- **缺乏模块化与代码复用**：相同的业务片段（如货币换算、电话号码脱敏）只能在几十个 SQL 文件里复制粘贴。

dbt 通过引入 Python 世界最著名的模板引擎 **Jinja**，将 SQL 从“静态文本”升格为“可编程的数据流水线代码”！

---

### Jinja 的三大基本语法结构

在 dbt 中，任何 `.sql` 文件在被发送到目标数据仓库执行之前，都会先经过 dbt 编译器的 Jinja 渲染。Jinja 主要使用三种定界符（Delimiters）：

#### 1. 表达式（Expressions）: `{{ ... }}`
用于**输出结果或调用函数**。求值结果将被直接转换并打印到编译后的 SQL 文本中：
```jinja
{{ 1 + 2 }}  --> 渲染为: 3
{{ ref('stg_orders') }}  --> 渲染为: analytics.stg_orders
{{ var('start_date') }}  --> 渲染为: 2024-01-01
```

#### 2. 控制流声明（Statements）: `{% ... %}`
用于**逻辑控制**，如 `for` 循环、`if` 判断、变量赋值 `set` 等：
```jinja
{% set payment_methods = ['credit_card', 'coupon', 'bank_transfer'] %}

{% for method in payment_methods %}
  sum(case when payment_method = '{{ method }}' then amount else 0 end) as {{ method }}_amount{% if not loop.last %},{% endif %}
{% endfor %}
```

#### 3. 注释（Comments）: `{# ... #}`
用于**源码内部注释**。这些注释会在编译阶段直接被剥离，**绝不会**被包含在发送给数据库执行的最终 SQL 语句中（区别于 SQL 原生 `--` 或 `/* */` 注释）：
```jinja
{# 这是 dbt 内部维护者注记，数据库日志看不到这句话 #}
```
""",
            difficulty=1,
            tips="记住三者的形象记忆口诀：双大括号 `{{ }}` 是‘喇叭’（用来输出字符串），百分号 `{% %}` 是‘大脑’（用来做判断和循环），井号 `{# #}` 是‘私语’（编译器自动过滤的注释）。"
        ),
        lesson(
            "dbt-l7-2",
            "变量（Variables）与环境隔离：`var()`、`env_var()` 与跨环境动态配置",
            """### 动态配置的两大利器：var 与 env_var

在数据工程实践中，我们绝不能把可变参数（如日期截断、采样比率）或敏感信息（如 API 密钥、数据库连接凭据）硬编码在 SQL 文件中。dbt 提供了两大获取变量的核心函数：

---

### 1. `var()`：业务与项目级动态变量

`var()` 用于获取在 `dbt_project.yml` 中定义的变量，或者在命令行执行时动态注入的参数：

#### 在 `dbt_project.yml` 中声明默认值
```yaml
vars:
  start_date: '2020-01-01'
  enable_experimental_features: false
```

#### 在 SQL 模型中消费变量（带兜底默认值）
```sql
select *
from {{ ref('stg_orders') }}
where order_date >= '{{ var("start_date", "2020-01-01") }}'
```

#### 在命令行 CLI 中临时覆盖参数
在日常排错或历史补数时，分析师可以无需修改任何代码，直接通过命令行传参：
```bash
dbt run --select fct_orders --vars '{"start_date": "2024-06-01"}'
```

---

### 2. `env_var()`：操作系统环境变量获取（环境隔离基石）

生产系统中的敏感凭证（如数据库密码）或 CI/CD 构建元数据（如 `GIT_SHA`、`ENVIRONMENT=prod/dev`），必须从宿主机的系统环境变量中读取：

```yaml
# profiles.yml
my_profile:
  target: dev
  outputs:
    prod:
      type: snowflake
      account: "xy12345"
      user: "dbt_robot"
      password: "{{ env_var('DBT_ENV_SECRET_PASSWORD') }}"
      role: "ANALYTICS_PROD"
```

在 SQL 模型中，也可以根据运行环境动态切换采样逻辑：
```sql
select *
from {{ ref('stg_billion_clickstream') }}
{% if env_var('DBT_ENVIRONMENT', 'dev') == 'dev' %}
  -- 本地开发环境仅拉取前 10,000 条，极速节约开发开销与等待时间
  limit 10000
{% endif %}
```
""",
            difficulty=2,
            tips="使用 `var('my_var', 'default_val')` 时始终建议提供第二个参数作为默认备选值；获取涉及系统与密钥的配置则一律使用 `env_var()`。"
        ),
        lesson(
            "dbt-l7-3",
            "控制流实战：循环 `for` 语句在批量指标生成与自动列扩展中的应用",
            """### 告别枯燥的复制粘贴：Jinja For 循环

很多业务模型需要对数十个支付渠道、广告渠道或状态码进行透视汇总（Pivot）。传统 SQL 开发者不得不手动编写上百行几乎相同的 `CASE WHEN`，一旦新增渠道，极易漏改出错。
借由 Jinja 的 `for` 循环，这一痛点被彻底攻克。

---

### 经典案例：订单支付渠道多列透视（Pivot）

假设我们在电商业务中，有 5 种支持的支付方式：
- `credit_card`
- `coupon`
- `bank_transfer`
- `gift_card`
- `crypto`

#### 手写静态 SQL（脆弱且冗长）：
```sql
select
    order_id,
    sum(case when payment_method = 'credit_card' then amount else 0 end) as credit_card_amount,
    sum(case when payment_method = 'coupon' then amount else 0 end) as coupon_amount,
    sum(case when payment_method = 'bank_transfer' then amount else 0 end) as bank_transfer_amount,
    sum(case when payment_method = 'gift_card' then amount else 0 end) as gift_card_amount,
    sum(case when payment_method = 'crypto' then amount else 0 end) as crypto_amount
from {{ ref('stg_payments') }}
group by 1;
```

#### 使用 Jinja For 循环重构（高内聚、秒级扩展）：
```sql
{% set payment_methods = ['credit_card', 'coupon', 'bank_transfer', 'gift_card', 'crypto'] %}

select
    order_id,
    {% for method in payment_methods %}
    sum(case when payment_method = '{{ method }}' then amount else 0 end) as {{ method }}_amount{% if not loop.last %},{% endif %}
    {% endfor %}
from {{ ref('stg_payments') }}
group by 1;
```

---

### Jinja 内置循环变量 `loop` 的魔法

在 `{% for item in collection %}` 循环体内部，Jinja 提供了强大的特殊变量 `loop`：
- `loop.index`：当前循环的序号（从 1 开始计数）；
- `loop.index0`：从 0 开始计数的索引序号；
- `loop.first`：布尔值，是否是循环的第一项；
- `loop.last`：布尔值，**是否是循环的最后一项**！

在 SQL 中，列与列之间需要逗号 `,` 分隔，但最后一列之后如果有多余的逗号，会导致 SQL 语法解析报错（Trailing comma error）。
使用 `{% if not loop.last %},{% endif %}` 能够极为优雅地解决逗号难题！
""",
            difficulty=2,
            tips="熟练使用 `loop.last` 可以完美处理 SQL 中的列表逗号分隔符问题。未来新增支付方式只需在数组里加一个元素，整个报表自动完成更新！"
        ),
        lesson(
            "dbt-l7-4",
            "条件分支：`if/elif/else` 在多引擎方言兼容与调试模式开关中的落地",
            """### 条件分支的工业级应用

Jinja 的条件判断分支 `{% if %} ... {% elif %} ... {% else %} ... {% endif %}` 在分析工程中有两大杀手级应用：
1. **开发与生产环境隔离（调试快照与数据采样）**；
2. **跨数据仓库方言兼容（跨 Snowflake / BigQuery / DuckDB 抽象）**。

---

### 场景 1：开发环境限流采样开关

在包含数十亿行数据的日志模型中，分析工程师如果在本地做轻微改动，每次运行几十分钟是无法忍受的。通过条件分支与环境变量或 `target.name` 配合：

```sql
-- models/marts/marketing/fct_web_events.sql
with events as (
    select * from {{ ref('stg_web_events') }}
)

select *
from events
{% if target.name == 'dev' %}
    -- 在本地 dev 模式下，仅处理过去 7 天的数据，且只取前 50000 行
    where event_timestamp >= current_date - interval '7 days'
    limit 50000
{% endif %}
```
当你在终端执行 `dbt run --target dev` 时，该过滤条件被编译进去，秒级执行；而在生产部署 `dbt run --target prod` 时，整段条件自动消失，全量处理！

---

### 场景 2：跨 SQL 引擎方言兼容适配

如果你开发的数据模型或宏需要同时支持多种数仓引擎（如既要在本地 DuckDB 运行单元测试，又要在生产 Snowflake 运行）：
- 在 Snowflake 中，提取当前日期是 `current_date()`；
- 在 BigQuery 中，是 `current_date('UTC')`；
- 在 SQL Server / T-SQL 中，是 `cast(getdate() as date)`。

```jinja
{% if target.type == 'snowflake' %}
    date_trunc('month', created_at)
{% elif target.type == 'bigquery' %}
    date_trunc(created_at, month)
{% else %}
    date_trunc('month', created_at)
{% endif %}
```
通过条件分支，你编写的模型拥有了极强的跨平台移植能力。
""",
            difficulty=2,
            tips="通过 `target.name` 判定环境，并在 dev 环境中加入采样或短时间范围限制，是每个高级分析工程师保护团队云算力预算的必备基本功！"
        ),
        lesson(
            "dbt-l7-5",
            "内置上下文对象与工具：`target`、`schema`、`flags` 与运行期元数据获取",
            """### 揭开 dbt 上下文变量（Context Variables）的面纱

在任何 Jinja 块中，dbt 都自动注入了丰富的上下文对象，让 SQL 代码在执行时能够“感知自我与运行环境”：

---

### 核心上下文对象速查

#### 1. `target`：当前目标数据库连接配置
包含了当前运行的连接上下文：
- `target.name`：当前连接的 target 别名（如 `'dev'`, `'staging'`, `'prod'`）；
- `target.schema`：当前默认的目标 schema 名称；
- `target.database`：当前默认的目标数据库名称；
- `target.type`：当前适配器驱动类型（如 `'snowflake'`, `'bigquery'`, `'duckdb'`, `'postgres'`）。

#### 2. `schema`：当前模型绑定的目标 Schema
在模型中可以直接调用 `{{ schema }}` 查看当前模型计算完毕后将要写入的具体 schema 路径。

#### 3. `flags`：命令行传递的系统标志
可以捕获当前命令是否处于特定系统模式，例如：
- `flags.FULL_REFRESH`：布尔值，是否开启了 `--full-refresh`；
- `flags.WHICH`：当前执行的顶级命令名（如 `'run'`, `'test'`, `'compile'`）。

---

### 上下文对象实战：动态 Schema 路由

很多企业要求：**在开发环境（dev），所有表都必须写入带个人花名的独立 schema（如 `dbt_alice_finance`），防止不同开发者互相踩踏；而在生产环境（prod），必须严格写入标准业务 schema（如 `finance`）**。

在 `macros/generate_schema_name.sql` 宏中，dbt 正是借助 `target` 对象实现这一核心治理逻辑：
```jinja
{% macro generate_schema_name(custom_schema_name, node) -%}
    {%- set default_schema = target.schema -%}
    {%- if target.name == 'prod' and custom_schema_name is not none -%}
        {{ custom_schema_name | trim }}
    {%- else -%}
        {{ default_schema }}_{{ custom_schema_name | trim }}
    {%- endif -%}
{%- endmacro %}
```
""",
            difficulty=2,
            tips="理解 `target` 上下文是企业级数仓权限治理与个人工作区隔离（Schema Sandboxing）的核心关键。"
        ),
        lesson(
            "dbt-l7-6",
            "数据字典遍历与自动代码生成：告别百行重复 CASE WHEN",
            """### 高级编程：字典（Dictionary）在 Jinja 中的妙用

Jinja 完全支持 Python 风格的数据结构：列表（List `[...]`）与字典（Dictionary `{...}`）。
当我们需要做**跨维度的指标矩阵计算**或**多值映射**时，字典能展现出令人惊叹的表达能力。

---

### 业务实战：多货币与多口径自动化矩阵

假设财务部门需要同时计算三项业务指标（`gmv` 成交总额、`net_revenue` 净收入、`refund_amount` 退款金额），并且要求同时折算为三种货币（`USD`、`EUR`、`CNY`）。
若手写 SQL，需要编写 9 个冗长的聚合表达式；利用 Jinja 字典与嵌套循环：

```sql
-- models/marts/finance/fct_daily_financial_matrix.sql
{% set metrics = {
    'gmv': 'raw_amount',
    'net_revenue': 'raw_amount - tax_amount - fee_amount',
    'refund_amount': 'refunded_amount'
} %}

{% set exchange_rates = {
    'usd': 1.0,
    'eur': 0.92,
    'cny': 7.23
} %}

select
    report_date,
    {% for metric_name, formula in metrics.items() %}
        {% for curr, rate in exchange_rates.items() %}
            sum(({{ formula }}) * {{ rate }}) as {{ metric_name }}_{{ curr }}{% if not (loop.last and loop.parent.loop.last) %},{% endif %}
        {% endfor %}
    {% endfor %}
from {{ ref('stg_transactions') }}
group by 1;
```

#### 魔法解析：
1. `metrics.items()` 与 `exchange_rates.items()` 完全遵循 Python 字典遍历语法；
2. 嵌套循环中，外层循环状态可通过 `loop.parent.loop` 访问；
3. 仅仅十几行优雅的代码，通过笛卡尔积自动展开生成了 9 个工业级精准命名与计算的指标字段！
""",
            difficulty=3,
            tips="当发现自己的 SQL 出现了成规律重复的行列模式时，立刻停下粘贴的双手，用 Jinja 字典组织元数据，让编译器为你写代码！"
        ),
        lesson(
            "dbt-l7-7",
            "Jinja 编译与排错调试：`dbt compile`、Whitespace 控制 (`{%- -%}`) 与日志打印",
            """### 驾驭 Jinja 的工程调试技巧

编写 Jinja 模板代码时，初学者常常遇到两大困惑：
1. “我写的 Jinja 到底被翻译成了怎样的真实 SQL？为什么数仓报错说有语法错误？”
2. “为什么编译出来的 SQL 里有几百行乱七八糟的空白换行？”

---

### 1. 终极调试命令：`dbt compile`
当你运行 `dbt compile --select my_model` 时：
- dbt **不会**在数据库中执行任何建表操作；
- 而是仅仅运行 Jinja 解析引擎，并将最终生成的标准 SQL 文件写入本地项目目录：`target/compiled/my_project/models/.../my_model.sql`！
- **日常排错第 1 步**：打开对应的 target 文件，肉眼查看编译出来的纯 SQL 是否合法、逗号是否有多余、括号是否闭合。

---

### 2. 空白控制符（Whitespace Trimming）: `{%-` 与 `-%}`
在 Jinja 中，默认情况下，每一个 `{% ... %}` 标签所在的空行和缩进都会被忠实保留，导致最终编译出来的 SQL 充满空行。
通过在定界符两端添加连字符减号 `-`，可以自动剥离标签前后的多余空格与换行：
- `{%-`：剔除该标签**左侧**的所有空白字符；
- `-%}`：剔除该标签**右侧**的所有空白字符。

```jinja
-- 含有多余空行
{% for i in [1, 2] %}
select {{ i }};
{% endfor %}

-- 紧凑排版，剔除空白
{%- for i in [1, 2] %}
select {{ i }};
{%- endfor %}
```

---

### 3. 日志打印调试：`{{ log(...) }}` 与 `{{ print(...) }}`
在复杂的循环或字典遍历中，如果你不确定某个变量在运行期的值，可以使用 dbt 内置的 `log()` 函数将调试信息直接输出到终端控制台：

```jinja
{% set current_val = var('sample_rate', 1.0) %}
{{ log("正在处理采样率, 当前值为: " ~ current_val, info=True) }}
```
参数 `info=True` 会将该行日志直接打印在命令行界面上，并同步记录到 `logs/dbt.log` 文件中。
""",
            difficulty=2,
            tips="遇到 Jinja 报错时，永远不要猜：跑一次 `dbt compile`，直接查看 `target/compiled/` 目录下的纯 SQL，90% 的拼写或逗号错误一目了然！"
        )
    ]

    exercises = [
        single_choice(
            "dbt-c7-e1",
            "在 dbt 的 Jinja 语法中，用于在模板内部编写不会被编译进最终 SQL、仅供工程维护者阅读的注释定界符是：",
            [
                {"label": "/* 这是注释 */", "value": "A"},
                {"label": "-- 这是注释", "value": "B"},
                {"label": "{# 这是注释 #}", "value": "C"},
                {"label": "{{ # 这是注释 }}", "value": "D"}
            ],
            "C",
            "`{# ... #}` 是 Jinja 的模板注释定界符，在编译期会被完全丢弃，不会输出到目标数据库执行的 SQL 文本中。",
            1,
            "dbt-l7-1",
            ["jinja", "comments", "syntax"]
        ),
        single_choice(
            "dbt-c7-e2",
            "如果想在命令行执行 dbt 任务时，动态将变量 `start_date` 的值覆盖设置为 `'2024-01-01'`，正确的命令参数是：",
            [
                {"label": "dbt run --vars '{\"start_date\": \"2024-01-01\"}'", "value": "A"},
                {"label": "dbt run --set start_date='2024-01-01'", "value": "B"},
                {"label": "dbt run --env start_date='2024-01-01'", "value": "C"},
                {"label": "dbt run --args start_date='2024-01-01'", "value": "D"}
            ],
            "A",
            "dbt CLI 使用 `--vars` 参数接收 JSON 格式或 YAML 格式的键值对字典来动态覆盖变量。",
            1,
            "dbt-l7-2",
            ["cli", "vars", "runtime"]
        ),
        single_choice(
            "dbt-c7-e3",
            "在 Jinja 的 `for` 循环内部，用于判断当前项是否为该循环最后一次迭代的内置布尔变量是：",
            [
                {"label": "loop.end", "value": "A"},
                {"label": "loop.last", "value": "B"},
                {"label": "loop.is_final", "value": "C"},
                {"label": "loop.tail", "value": "D"}
            ],
            "B",
            "`loop.last` 是 Jinja 内置循环状态变量，当处于循环的最后一项时返回 `True`，常用于避免 SQL 字段列表末尾多余逗号的语法错误。",
            2,
            "dbt-l7-3",
            ["jinja", "for-loop", "loop-last"]
        ),
        single_choice(
            "dbt-c7-e4",
            "如果仅想查看 dbt 模型被 Jinja 渲染解析后的纯 SQL 文本，而不希望对数据仓库进行任何实际的建表或执行，应该使用的命令是：",
            [
                {"label": "dbt run --dry-run", "value": "A"},
                {"label": "dbt compile", "value": "B"},
                {"label": "dbt parse", "value": "C"},
                {"label": "dbt test --preview", "value": "D"}
            ],
            "B",
            "`dbt compile` 专门负责编译项目，将所有 Jinja 宏和 ref 解析为标准 SQL，保存在 `target/compiled/` 目录下，不触碰数据库做任何写入。",
            1,
            "dbt-l7-7",
            ["cli", "compile", "debugging"]
        ),
        multiple_choice(
            "dbt-c7-e5",
            "关于 Jinja 三大核心语法定界符的功能定位，下列对应关系正确的有：",
            [
                {"label": "`{{ ... }}`：表达式求值并输出文本到 SQL 中", "value": "A"},
                {"label": "`{% ... %}`：控制流语句，执行 for 循环、if 判断或变量赋值 set", "value": "B"},
                {"label": "`{# ... #}`：Jinja 注释，编译时完全剔除", "value": "C"},
                {"label": "`<% ... %>`：dbt 专用的数据库驱动直连定界符", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 均为标准 Jinja 语法规范。D 属于无效伪语法。",
            1,
            "dbt-l7-1",
            ["jinja", "syntax", "delimiters"]
        ),
        multiple_choice(
            "dbt-c7-e6",
            "在 dbt 模型开发中，关于环境变量 `env_var()` 的使用场景，下列合理的有：",
            [
                {"label": "在 `profiles.yml` 中安全读取数据库连接密码，避免明文硬编码泄露", "value": "A"},
                {"label": "通过环境变量判断当前部署环境（如 CI、Staging 或 Production）以控制不同分支行为", "value": "B"},
                {"label": "在本地开发测试时自动挂载采样过滤（如 `limit 1000`）加速开发循环", "value": "C"},
                {"label": "必须在所有数据清洗 `CASE WHEN` 逻辑中强制使用 `env_var` 替代纯 SQL 表达式", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 正确。D 是典型的技术滥用，业务清洗与标准指标转换应该保持标准 SQL 语义，不应过度引入外部环境变量。",
            2,
            "dbt-l7-2",
            ["env-var", "security", "best-practices"]
        ),
        multiple_choice(
            "dbt-c7-e7",
            "下列哪些是 Jinja 编译排错与代码美化的高效手段？",
            [
                {"label": "检查 `target/compiled/` 目录下的 SQL 文件排查真实执行语句", "value": "A"},
                {"label": "使用 `{%-` 和 `-%}` 剥离控制流标签带来的多余换行与空格", "value": "B"},
                {"label": "使用 `{{ log('调试信息', info=True) }}` 在终端控制台输出即时计算变量", "value": "C"},
                {"label": "将所有 SQL 代码全部写在一行内以防止 Jinja 编译错误", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 均为推荐的高级调试与模板优化手段。D 严重违背可读性规范且无法解决编译错误。",
            2,
            "dbt-l7-7",
            ["debugging", "whitespace", "logging"]
        ),
        judge(
            "dbt-c7-e8",
            "在 dbt 中，使用 `var('my_variable')` 时，若未在 `dbt_project.yml` 或命令行中定义该变量且未提供默认值，dbt 将抛出编译错误中断运行。",
            "正确",
            "当调用的变量未被定义且未提供备用默认值（如 `var('my_variable', 'default_value')`）时，编译器会直接抛出 `Compilation Error`。",
            2,
            "dbt-l7-2",
            ["vars", "compilation-error"]
        ),
        judge(
            "dbt-c7-e9",
            "通过 `target.name` 变量，dbt 可以在同一个 SQL 模型文件中，为本地开发环境（dev）和线上生产环境（prod）编译出不同的 SQL 过滤逻辑。",
            "正确",
            "`target.name` 能让模型感知当前连接目标，实现本地开发采样提速、生产环境全量计算的平滑隔离。",
            1,
            "dbt-l7-4",
            ["target", "environment-isolation"]
        ),
        judge(
            "dbt-c7-e10",
            "Jinja 注释 `{# 注释内容 #}` 与 SQL 标准行注释 `-- 注释内容` 的效果完全相同，都会被原样发送到 Snowflake 或 BigQuery 数据库的查询历史中。",
            "错误",
            "Jinja 注释在 dbt 本地编译阶段就被丢弃了，根本不会进入发送给数据库的 SQL 文件；而 SQL 标准注释会被数据库引擎接收并在 Query History 中展示。",
            1,
            "dbt-l7-1",
            ["jinja", "comments"]
        ),
        fill(
            "dbt-c7-e11",
            "在 Jinja 模板中，若要给控制流定界符左侧或右侧剔除多余的空格与换行符，应在百分号紧邻处添加的符号是 [BLANK1]；用于获取宿主机操作系统环境变量的 dbt 核心宏函数是 [BLANK2]()。",
            [["-"], ["env_var"]],
            "使用 `{%-` 或 `-%}` 剔除空白字符；使用 `env_var('KEY_NAME')` 读取操作系统环境变量。",
            2,
            "dbt-l7-2",
            ["whitespace", "env_var", "jinja"]
        ),
        fill(
            "dbt-c7-e12",
            "在循环列表 `{% for col in columns %}` 中，若想在非最后一项元素后追加逗号分隔符，通常配合使用的 Jinja 条件判断是 `{% if not [BLANK1].[BLANK2] %},{% endif %}`。",
            [["loop"], ["last"]],
            "`loop.last` 返回当前迭代是否为最后一次，`if not loop.last` 保证最后一项后面不输出多余的逗号。",
            2,
            "dbt-l7-3",
            ["jinja", "for-loop", "loop"]
        ),
        open_ex(
            "dbt-c7-e13",
            "假设你需要对用户行为日志表 `stg_user_actions` 进行事件类型汇总统计。平台目前有三种活跃事件：`'click'`（点击）、`'share'`（分享）、`'purchase'`（购买）。\n请使用 Jinja 循环（`for` 循环）编写一段 dbt SQL 模型代码，动态生成各事件的汇总计数（如 `total_click_count`, `total_share_count` 等），要求：\n1. 在 Jinja 块中定义事件名称列表；\n2. 遍历该列表，使用 `case when` 进行汇总统计；\n3. 正确处理行尾逗号（最后一项后面不能有多余逗号）；\n4. 针对开发环境（`target.name == 'dev'`），在末尾增加仅取前 10,000 条记录的限制。",
            "```sql\n{% set event_types = ['click', 'share', 'purchase'] %}\n\nselect\n    user_id,\n    {% for event in event_types %}\n        sum(case when action_type = '{{ event }}' then 1 else 0 end) as total_{{ event }}_count{% if not loop.last %},{% endif %}\n    {% endfor %}\nfrom {{ ref('stg_user_actions') }}\ngroup by 1\n{% if target.name == 'dev' %}\nlimit 10000\n{% endif %};\n```",
            "Jinja 综合应用考查：包含 set 列表定义、for 循环生成 CASE WHEN、loop.last 逗号防护、以及 target.name 环境分支控制。",
            [
                {"point": "正确使用 {% set event_types = [...] %} 定义事件列表", "score": 1},
                {"point": "正确编写 {% for event in event_types %} 循环并使用 {{ event }} 输出动态列名和判断条件", "score": 2},
                {"point": "使用 {% if not loop.last %},{% endif %} 优雅处理列尾逗号", "score": 1},
                {"point": "使用 {% if target.name == 'dev' %} 正确实现开发环境 limit 10000 过滤", "score": 1}
            ],
            "定义 set 列表；for 循环遍历 sum(case when action_type = '...' then 1 else 0 end) as total_..._count；用 loop.last 控制逗号；使用 if target.name == 'dev' limit 10000。",
            4,
            "dbt-l7-3",
            ["jinja-coding", "loop", "environment-control"]
        )
    ]

    return chapter(
        "dbt-c7",
        "dbt-analytics-engineering",
        7,
        "Jinja 模板引擎与动态 SQL 编程",
        "熟练掌握 Jinja 表达式、控制流、循环与字典遍历，精通 `var()` 与 `env_var()` 变量体系及环境隔离技术，利用 `dbt compile` 与 Whitespace 控制编写高扩展性动态 SQL 管道。",
        lessons,
        exercises
    )
