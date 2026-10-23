# -*- coding: utf-8 -*-
"""Chapter 8: 自定义宏与包管理 (dbt-utils)"""

from common import (
    lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter
)

def get_chapter_8():
    lessons = [
        lesson(
            "dbt-l8-1",
            "什么是 dbt 宏（Macros）？将 SQL 逻辑封装为函数式积木",
            """### 从“重复代码”到“可复用函数”

在常规的数据仓库开发中，你可能会发现很多通用的 SQL 片段被复制了上百次：
- 将分（cents）转换为元（dollars）并四舍五入保留两位小数：`round(cast(amount_cents as numeric) / 100.0, 2)`；
- 清洗并脱敏手机号：`concat(substr(phone, 1, 3), '****', substr(phone, 8, 4))`；
- 将 UTC 时间戳按指定规则截断并转换到东八区（Asia/Shanghai）。

如果某天业务发生变化（例如精度从 2 位调整为 4 位），你必须在数十个 SQL 模型中全项目全局搜索替换，极易疏漏。
**dbt 宏（Macro）就是 SQL 世界中的函数（Functions）！**
它允许你将重复的 SQL 转换逻辑封装在 `macros/` 目录下的 `.sql` 文件中，然后在整个项目的任何模型、测试或钩子中自由调用。

```
 ┌────────────────────────────────────────────────────────┐
 │ macros/cents_to_dollars.sql                            │
 │   {% macro cents_to_dollars(column_name, scale=2) %}   │
 │       round(cast({{ column_name }} as numeric) / 100.0, {{ scale }}) │
 │   {% endmacro %}                                       │
 └────────────────────────────────────────────────────────┘
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
 models/stg_payments.sql         models/fct_orders.sql
 select                          select
   {{ cents_to_dollars('amount') }}   {{ cents_to_dollars('total_price', 4) }}
 from raw_payments;              from raw_orders;
```

---

### 宏的核心价值
1. **DRY 原则（Don't Repeat Yourself）**：逻辑集中在单点维护，修改宏即全局生效；
2. **抽象跨数仓方言差异**：宏可以根据 `target.type` 在底层自动生成不同数据库的方言语法；
3. **元数据驱动与动态代码生成**：宏可以在编译期间向数仓发送查询，利用查询结果动态构建 SQL。
""",
            difficulty=1,
            tips="宏存放在项目的 `macros/` 目录下，文件后缀同样为 `.sql`。牢记：只要一段逻辑在两个以上的模型中被复制，就应该立刻将其抽象为宏！"
        ),
        lesson(
            "dbt-l8-2",
            "宏的定义与参数传递：`{% macro %}`、默认参数与类型处理",
            """### 宏的定义语法规范

在 `macros/` 目录下的 `.sql` 文件中，使用 `{% macro %}` 和 `{% endmacro %}` 块来声明宏：

```jinja
{% macro 宏名称(参数1, 参数2=默认值) %}
    -- 这里是生成的 SQL 文本
{% endmacro %}
```

---

### 实战：编写一个带默认参数的货币转换宏

```sql
-- macros/cents_to_dollars.sql
{% macro cents_to_dollars(column_name, decimal_places=2) -%}
    round(cast({{ column_name }} as numeric) / 100.0, {{ decimal_places }})
{%- endmacro %}
```

#### 在模型中调用宏
你可以像调用常规编程语言函数一样传参（支持位置参数与关键字参数）：
```sql
-- models/marts/finance/fct_revenue.sql
select
    order_id,
    -- 采用默认小数位 2
    {{ cents_to_dollars('subtotal_cents') }} as subtotal_usd,
    
    -- 显式指定小数位 4
    {{ cents_to_dollars('tax_cents', decimal_places=4) }} as tax_usd
from {{ ref('stg_orders') }}
```

---

### 宏的空白字符控制与格式化

在宏的定界符末尾添加减号 `-%}` 和 `{%-`（如上文代码所示），可以消除宏展开后产生的多余空行，保证生成的 SQL 排版整洁、紧凑：
```jinja
{% macro my_macro() -%}
    select 1
{%- endmacro %}
```
如果不加减号，宏被调用时往往会在生成的 SQL 中留下多余的空行和换行。
""",
            difficulty=2,
            tips="设计宏时，为次要参数设置合理的默认值（如 `decimal_places=2`），可以极大简化绝大多数调用者的心智负担。"
        ),
        lesson(
            "dbt-l8-3",
            "常用业务宏封装实战：货币单位换算、时间时区标准化与哈希主键生成",
            """### 企业高频常用宏实战精选

在企业级数仓研发中，有三类宏是每个团队都会首先沉淀的标准基础设施：

---

### 实战 1：时区标准化转换宏 (`to_local_timezone.sql`)
全球化业务中，数据库存储的时间通常为 UTC 时间戳，而运营和财务分析师需要按本地时区（如北京时间 UTC+8、纽约时间 EST）进行统计：

```sql
-- macros/to_local_timezone.sql
{% macro to_local_timezone(column_name, tz='Asia/Shanghai') -%}
    {% if target.type == 'snowflake' %}
        convert_timezone('UTC', '{{ tz }}', {{ column_name }}::timestamp_ntz)
    {% elif target.type == 'bigquery' %}
        datetime({{ column_name }}, '{{ tz }}')
    {% else %}
        {{ column_name }} + interval '8 hour'
    {% endif %}
{%- endmacro %}
```
调用方式：
```sql
select
    order_id,
    {{ to_local_timezone('created_at') }} as order_time_cst
from {{ ref('stg_orders') }};
```

---

### 实战 2：跨列复合哈希主键生成宏 (`generate_surrogate_key.sql`)
为防止自然主键为 NULL 或跨字段拼接出现空指针碰撞：

```sql
-- macros/generate_surrogate_key.sql
{% macro generate_surrogate_key(field_list) -%}
    md5(concat(
        {% for field in field_list -%}
            coalesce(cast({{ field }} as varchar), '_null_')
            {%- if not loop.last %} || '|' || {% endif -%}
        {% endfor -%}
    ))
{%- endmacro %}
```
调用方式：
```sql
select
    {{ generate_surrogate_key(['customer_id', 'order_date', 'store_id']) }} as row_hash_pk,
    amount
from {{ ref('stg_store_sales') }};
```
""",
            difficulty=2,
            tips="用 `md5(concat(coalesce(col, '_null_')))` 处理复合主键能有效防止 `null` 导致整串被截断为 null 的经典 SQL 漏洞！"
        ),
        lesson(
            "dbt-l8-4",
            "复杂宏进阶：利用 `run_query` 宏在编译期动态查询数仓元数据",
            """### 从数据库中“反向读取元数据”：run_query

普通的 Jinja 宏只能做文本模板替换。但有时候，我们的 SQL 逻辑**取决于数据库中现存的数据内容**！
例如：
- 你想把支付明细表中的每一种 `payment_method` 透视为一列，但你不想在 SQL 代码里写死有哪些渠道，而是希望 dbt **先去数据库里查一次 `select distinct payment_method from raw_payments`，然后根据查出来的渠道动态生成对应的列**！

dbt 提供了杀手级内部宏：`run_query(sql)`！

---

### `run_query` 工作机制与执行保护

`run_query` 会在 dbt **编译阶段**向目标数据仓库发送查询，并将返回的结果集包装为一个内存表格对象（`agate.Table`）。

#### 关键保护准则：`execute` 上下文变量
dbt 的运行分为“解析期（Parsing）”和“执行期（Execution）”。在解析期，dbt 仅用于构建依赖图，此时数仓连接可能并未完全就绪。
因此，任何包含 `run_query` 的代码**必须包裹在 `{% if execute %}` 中**，否则会在 `dbt compile` 初始阶段报错！

---

### 完整实战：自动动态获取渠道列

```sql
-- macros/get_distinct_column_values.sql
{% macro get_distinct_column_values(table_relation, column_name) %}
    {% set query %}
        select distinct {{ column_name }} as val
        from {{ table_relation }}
        where {{ column_name }} is not null
        order by 1
    {% endset %}

    {% if execute %}
        {% set results = run_query(query) %}
        {% set values = results.columns[0].values() %}
    {% else %}
        {% set values = [] %}
    {% endif %}

    {{ return(values) }}
{% endmacro %}
```

#### 在模型中动态使用：
```sql
-- models/marts/int_dynamic_payment_pivot.sql
{% set payment_methods = get_distinct_column_values(ref('stg_payments'), 'payment_method') %}

select
    order_id,
    {% for method in payment_methods %}
        sum(case when payment_method = '{{ method }}' then amount else 0 end) as {{ method }}_amount{% if not loop.last %},{% endif %}
    {% endfor %}
from {{ ref('stg_payments') }}
group by 1;
```
现在，无论运营团队下周上线了 `apple_pay` 还是 `wechat_pay`，只要数据库里出现了新值，下一次运行 dbt，对应的报表列就会**完全自动生成**！
""",
            difficulty=3,
            tips="牢记黄金守则：使用 `run_query` 宏必须包裹在 `{% if execute %}` 判定块中，并在 else 中返回空数组 `[]` 兜底，避免解析期抛出空指针异常！"
        ),
        lesson(
            "dbt-l8-5",
            "dbt 包生态与 `packages.yml`：引入第三方开源神级工具库",
            """### 站在巨人的肩膀上：dbt Package 生态

分析工程不需要重复造轮子。软件工程有 `npm`、`pip`、`cargo`，而 dbt 拥有专门的包生态系统（dbt Packages）。
全球的分析工程师和数仓专家已经开发并开源了大量经过生产验证的高质量宏与模型库。

---

### 如何在项目中引入第三方包？

在 dbt 项目根目录下创建一个 `packages.yml` 文件，声明需要依赖的包名称与版本范围：

```yaml
# packages.yml
packages:
  # 1. 现代数据栈必装神器：dbt-utils
  - package: dbt-labs/dbt_utils
    version: 1.1.1

  # 2. 数据预期与高级质量测试包：dbt-expectations
  - package: metaplane/dbt_expectations
    version: 0.10.1

  # 3. 也可以直接通过 Git 仓库地址引入团队内网私有包
  - git: "https://github.com/my-company/dbt-internal-macros.git"
    revision: v2.0.0
```

---

### 包的安装与更新命令：`dbt deps`

编辑完 `packages.yml` 之后，在终端运行：
```bash
dbt deps
```
dbt 会自动连接 dbt Hub 或 Git 远程仓库，下载指定版本的包代码并解压到本地的 `dbt_packages/` 目录下。
安装完成后，你就可以在整个项目中无缝调用这些开源宏（例如 `{{ dbt_utils.surrogate_key(...) }}`）！
""",
            difficulty=1,
            tips="在运行 `dbt build` 或 `dbt run` 之前，如果项目中新添加了依赖包，务必先在终端执行 `dbt deps` 进行依赖安装。"
        ),
        lesson(
            "dbt-l8-6",
            "工业级瑞士军刀：`dbt-utils` 核心宏深度实践 (surrogate_key / pivot / get_column_values)",
            """### 分析工程师的瑞士军刀：`dbt_utils`

在所有开源包中，官方维护的 `dbt-labs/dbt_utils` 是每个生产级 dbt 项目的**绝对必装基石**。
它囊括了现代数仓开发最常用的一批高级宏工具：

---

### 1. `dbt_utils.generate_surrogate_key`：工业级代理主键
自动处理多字段字符串转换、NULL 值替代与 MD5 哈希计算，彻底消除手写拼接哈希出错的隐患：
```sql
select
    {{ dbt_utils.generate_surrogate_key(['order_id', 'product_id']) }} as order_item_pk,
    quantity,
    price
from {{ ref('stg_order_items') }}
```

---

### 2. `dbt_utils.pivot`：一行代码实现优雅行转列
不再需要手写几屏 `SUM(CASE WHEN ...)`！`dbt_utils.pivot` 接受列名与候选值数组，自动展开为聚合透视：
```sql
select
    customer_id,
    {{ dbt_utils.pivot(
        column='status',
        values=['active', 'pending', 'cancelled'],
        agg='count',
        prefix='count_status_'
    ) }}
from {{ ref('stg_orders') }}
group by 1;
```

---

### 3. `dbt_utils.get_column_values`：内置元数据查询
无需手写底层的 `run_query` 和 `execute` 判断，直接一行获取某张表某列的去重列表：
```sql
{% set all_regions = dbt_utils.get_column_values(
    table=ref('stg_stores'),
    column='region'
) %}
```

---

### 4. `dbt_utils.union_relations`：自动合并多张异构表
如果你有多个地区或年份的分表（如 `raw_sales_2022`, `raw_sales_2023`），各表字段略有差异，`union_relations` 会自动比对列定义，缺少列的表自动填充 `NULL` 并安全 UNION ALL 在一起！
""",
            difficulty=2,
            tips="熟练使用 dbt_utils 能让你的代码量减少 40% 以上，并大幅提高 SQL 的健壮性与团队可读性。"
        ),
        lesson(
            "dbt-l8-7",
            "企业内部共享宏库的发布与多团队协作治理",
            """### 规模化协作：构建企业内部的 dbt 宏标准库

当企业的数据团队扩张到数十人、分属营销、供应链、财务、风险等多个独立域时，不同项目如果各自手写一套脱敏规则或汇率计算，会导致全公司指标口径分裂。
企业级解决方案是：**构建中心化的内部公共 Macro 仓库（Private dbt Package）**。

```
 ┌────────────────────────────────────────────────────────┐
 │ 内部代码仓: git@git.company.internal/data/dbt-common   │
 │   ├── macros/                                          │
 │   │   ├── masking/ (手机/身份证敏感脱敏宏)                │
 │   │   ├── finance/ (全集团统一会计确认与汇率折算宏)        │
 │   │   └── audit/   (统一数仓审计列与元数据注入宏)          │
 │   └── dbt_project.yml                                  │
 └────────────────────────────────────────────────────────┘
                              │
               ┌──────────────┴──────────────┐
               ▼ (通过 Git revision 引用)    ▼
 营销域 dbt 项目 (packages.yml)     财务域 dbt 项目 (packages.yml)
```

---

### 内部包治理的最佳实践

1. **严格语义化版本（SemVer）打 Tag**：
   公共宏库必须遵循 `MAJOR.MINOR.PATCH`。破坏性改动（如修改宏入参名称或类型）必须升大版本号，禁止直接在业务项目中使用 `revision: main` 分支！
2. **自动化测试防护（CI Pipeline）**：
   在公共宏库的 CI 流程中，编写模拟测试模型（Integration Tests），在 DuckDB 或真实测试数据库中验证宏在不同参数下的输出正确性。
3. **宏的命名空间隔离（Namespacing）**：
   当调用第三方或内部包中的宏时，显式指定包名作为前缀（如 `{{ my_company_utils.mask_phone(...) }}`），避免与局部自定义宏发生命名冲突。
""",
            difficulty=2,
            tips="团队协作规模化之后，严禁在 packages.yml 里直接指向 master/main 分支；务必锁定在固定 tag（如 revision: v1.2.0），保障构建的稳定性！"
        )
    ]

    exercises = [
        single_choice(
            "dbt-c8-e1",
            "在 dbt 项目中，存放所有自定义宏（Macro）代码文件的标准工程目录是：",
            [
                {"label": "models/", "value": "A"},
                {"label": "macros/", "value": "B"},
                {"label": "seeds/", "value": "C"},
                {"label": "analyses/", "value": "D"}
            ],
            "B",
            "dbt 规范约定所有宏定义文件存放在项目根目录下的 `macros/` 目录中，文件后缀为 `.sql`。",
            1,
            "dbt-l8-1",
            ["project-structure", "macros"]
        ),
        single_choice(
            "dbt-c8-e2",
            "在项目根目录下，用于声明第三方依赖包（如 `dbt-utils`）名称与版本的配置文件是：",
            [
                {"label": "dependencies.json", "value": "A"},
                {"label": "packages.yml", "value": "B"},
                {"label": "requirements.txt", "value": "C"},
                {"label": "plugins.yml", "value": "D"}
            ],
            "B",
            "dbt 依靠项目根目录下的 `packages.yml`（或 `dependencies.yml`）来管理和声明外部包依赖。",
            1,
            "dbt-l8-5",
            ["packages-yml", "package-management"]
        ),
        single_choice(
            "dbt-c8-e3",
            "当在 `packages.yml` 中新增了一个外部包依赖后，需要在终端执行哪个命令来自动下载并解压包文件到本地 `dbt_packages/` 目录？",
            [
                {"label": "dbt install", "value": "A"},
                {"label": "dbt deps", "value": "B"},
                {"label": "dbt get", "value": "C"},
                {"label": "dbt pull", "value": "D"}
            ],
            "B",
            "`dbt deps` 是 dbt 用于下载与安装 `packages.yml` 中所声明依赖包的标准 CLI 命令。",
            1,
            "dbt-l8-5",
            ["cli", "dbt-deps"]
        ),
        single_choice(
            "dbt-c8-e4",
            "在使用 `run_query(sql)` 宏执行元数据查询时，为了防止在 dbt 的初次解析编译阶段抛出数据库连接未就绪的异常，必须将该查询代码包裹在哪种条件判断块中？",
            [
                {"label": "{% if execute %}", "value": "A"},
                {"label": "{% if is_incremental() %}", "value": "B"},
                {"label": "{% if compile %}", "value": "C"},
                {"label": "{% if target.connected %}", "value": "D"}
            ],
            "A",
            "`execute` 是 dbt 内置的布尔变量。在解析依赖图阶段 `execute` 为 `false`，仅在进入真实执行阶段才变为 `true`。包裹在 `{% if execute %}` 中是防止解析期抛错的官方黄金守则。",
            2,
            "dbt-l8-4",
            ["run-query", "execute", "jinja"]
        ),
        multiple_choice(
            "dbt-c8-e5",
            "关于 dbt 宏（Macro）的优势，下列叙述正确的有：",
            [
                {"label": "实现 DRY 原则，将高频重复的复杂 SQL 转换逻辑集中在单点维护", "value": "A"},
                {"label": "可以通过参数传递与默认值机制，提供灵活的定制能力", "value": "B"},
                {"label": "能够封装底层数据库方言差异（如 Snowflake vs BigQuery），提高代码跨引擎兼容性", "value": "C"},
                {"label": "宏能够自动将数据仓库直接升级为流式计算系统（如 Apache Flink）", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 均为宏的核心工程价值。D 错误，宏是 dbt 编译期的模板函数，无法改变数仓底层的批处理或计算引擎本质。",
            2,
            "dbt-l8-1",
            ["macros", "advantages", "dry"]
        ),
        multiple_choice(
            "dbt-c8-e6",
            "在现代分析工程中，安装官方推荐的 `dbt-utils` 包后，你可以直接使用下列哪些神级宏？",
            [
                {"label": "`dbt_utils.generate_surrogate_key`：自动防 NULL 拼接并生成唯一哈希主键", "value": "A"},
                {"label": "`dbt_utils.pivot`：一行代码实现优雅行转列透视统计", "value": "B"},
                {"label": "`dbt_utils.union_relations`：自动合并多张列结构微有差异的同构/异构表", "value": "C"},
                {"label": "`dbt_utils.hack_database_password`：自动破解远端数据库密码", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 均为 `dbt_utils` 最经典的内置实用宏。D 纯属捏造。",
            2,
            "dbt-l8-6",
            ["dbt-utils", "built-in-macros"]
        ),
        multiple_choice(
            "dbt-c8-e7",
            "在企业级多团队协作与发布内部公共 dbt 宏库时，下列哪些做法符合治理规范？",
            [
                {"label": "遵循语义化版本规范（SemVer），通过 Release Tag 进行发版管理", "value": "A"},
                {"label": "在子项目中通过 `git` 引用时严格锁定固定版本 Tag，避免直接引用 main/master 不稳定分支", "value": "B"},
                {"label": "为公共宏库建立 CI 自动化测试流水线，在 PR 合并前验证宏在各场景下的编译结果", "value": "C"},
                {"label": "为方便各团队随意修改，允许所有开发者直接在各自本地项目中随意覆盖公共宏核心逻辑", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 正确。D 会导致公司内部宏标准分裂、口径失控，违背了共享宏库的集中治理原则。",
            2,
            "dbt-l8-7",
            ["governance", "ci-cd", "semver"]
        ),
        judge(
            "dbt-c8-e8",
            "dbt 的宏（Macro）既可以定义在项目的 `macros/` 目录下，也可以直接定义在第三方 package 依赖包中并通过包名前缀调用。",
            "正确",
            "宏具有命名空间机制，既可定义在当前项目的 `macros/` 下本地使用，也可打包发布并在其他项目中通过 `{{ package_name.macro_name() }}` 调用。",
            1,
            "dbt-l8-1",
            ["macros", "namespacing"]
        ),
        judge(
            "dbt-c8-e9",
            "在定义宏时，参数只能是字符串或数值，不能传递数组（List）或字典（Dictionary）。",
            "错误",
            "Jinja 宏完全支持 Python 风格的复杂数据类型作为参数传入，包括列表 `list`、字典 `dict` 等，例如 `generate_surrogate_key(['col1', 'col2'])` 接收的就是列表。",
            2,
            "dbt-l8-2",
            ["macros", "parameters", "types"]
        ),
        judge(
            "dbt-c8-e10",
            "使用 `dbt_utils.generate_surrogate_key` 生成代理键时，如果其中某个输入字段的值为 NULL，会自动引发空指针异常导致编译中断。",
            "错误",
            "`dbt_utils.generate_surrogate_key` 内部会自动使用 `coalesce` 将 NULL 值替换为特定的占位字符串，确保哈希拼接过程安全且稳定，绝不引发空指针异常。",
            2,
            "dbt-l8-6",
            ["surrogate-key", "null-handling"]
        ),
        fill(
            "dbt-c8-e11",
            "在 dbt 中，声明一个自定义宏的起始语法标签是 `{% [BLANK1] 宏名称(参数) %}`，闭合语法标签是 `{% [BLANK2] %}`。",
            [["macro"], ["endmacro"]],
            "Jinja 宏使用 `{% macro name(...) %}` 开头，以 `{% endmacro %}` 结束。",
            1,
            "dbt-l8-2",
            ["jinja", "syntax", "macro-definition"]
        ),
        fill(
            "dbt-c8-e12",
            "在编写需要从目标数据仓库执行动态 SQL 查询元数据的复杂宏时，应调用的 dbt 内置核心宏是 [BLANK1](query)；并且在结果返回前通常使用 `results.columns[0].[BLANK2]()` 来提取该列的值列表。",
            [["run_query"], ["values"]],
            "使用 `run_query()` 执行 SQL 查询，通过返回对象的 `results.columns[0].values()` 提取列值数组。",
            3,
            "dbt-l8-4",
            ["run-query", "agate", "metadata"]
        ),
        open_ex(
            "dbt-c8-e13",
            "某跨国零售系统中有大量涉及金额的原始表，金额存储的单位是分（Cents），币种包括 `'USD'`、`'CNY'`、`'EUR'`。现财务总监要求在数仓清洗层统一定义一个可复用的宏 `cents_to_formatted_currency(column_name, currency='USD', scale=2)`。\n要求：\n1. 将分除以 100.0 并转换为指定的精度（`scale`，默认 2 位）；\n2. 若币种为 `'CNY'`，在前缀拼接 `'¥'`；若币种为 `'EUR'`，拼接 `'€'`；其他情况默认拼接 `'$'`；\n3. 写出该宏在 `macros/cents_to_formatted_currency.sql` 中的完整代码，并展示在模型中如何调用该宏清洗 `raw_orders` 表的 `amount_cents` 字段（按默认 USD 转换）。",
            "```sql\n-- macros/cents_to_formatted_currency.sql\n{% macro cents_to_formatted_currency(column_name, currency='USD', scale=2) -%}\n    {%- if currency == 'CNY' -%}\n        concat('¥', round(cast({{ column_name }} as numeric) / 100.0, {{ scale }}))\n    {%- elif currency == 'EUR' -%}\n        concat('€', round(cast({{ column_name }} as numeric) / 100.0, {{ scale }}))\n    {%- else -%}\n        concat('$', round(cast({{ column_name }} as numeric) / 100.0, {{ scale }}))\n    {%- endif -%}\n{%- endmacro %}\n```\n\n**模型中的调用示例**：\n```sql\n-- models/staging/ecommerce/stg_orders.sql\nselect\n    order_id,\n    {{ cents_to_formatted_currency('amount_cents') }} as formatted_amount_usd\nfrom {{ source('ecommerce', 'raw_orders') }};\n```",
            "自定义业务宏编写与调用考查：参数与默认值声明、Jinja 条件分支判断、SQL 表达式拼接及在模型中的调用。",
            [
                {"point": "正确使用 {% macro cents_to_formatted_currency(column_name, currency='USD', scale=2) %} 声明参数与默认值", "score": 1},
                {"point": "编写除以 100.0 并正确应用 scale 精度的类型转换逻辑", "score": 1},
                {"point": "正确使用 if/elif/else 分支判断货币前缀（¥, €, $）", "score": 1},
                {"point": "给出在模型中的规范调用示例，包含字段名传参", "score": 1}
            ],
            "声明包含 column_name, currency='USD', scale=2 的 macro；根据 currency 的 if/elif 分支 concat 对应符号并 round(cast(col as numeric)/100.0, scale)；展示在模型 select 中调用该宏。",
            4,
            "dbt-l8-3",
            ["macro-coding", "jinja", "formatting"]
        )
    ]

    return chapter(
        "dbt-c8",
        "dbt-analytics-engineering",
        8,
        "自定义宏与包管理 (dbt-utils)",
        "掌握 dbt 宏的封装设计、默认参数、类型保护与空白字符控制，熟练掌握 `run_query` 动态元数据查询与 `packages.yml` 生态治理，深度落地 `dbt-utils` 打造高质量模块化代码库。",
        lessons,
        exercises
    )
