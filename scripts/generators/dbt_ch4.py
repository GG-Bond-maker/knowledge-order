# -*- coding: utf-8 -*-
"""
dbt Analytics Engineering - Chapter 4: dbt Models & DAG Dependency Decoupling
"""

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_4():
    c4_lessons = [
        lesson(
            "dbt-l4-1",
            "声明式 SQL 建模哲学：每个模型就是一个纯粹的 SELECT 查询",
            """### 一、告别繁重的 DDL/DML 样板代码
在传统数据开发中，工程师编写一个数仓任务往往需要写满冗长且易错的 DDL 与 DML：
```sql
-- 传统数仓开发痛苦的样板代码
DROP TABLE IF EXISTS analytics.fct_orders_temp;
CREATE TABLE analytics.fct_orders_temp (
    order_id INT, customer_id INT, total_amount DECIMAL(10,2)
);
INSERT INTO analytics.fct_orders_temp
SELECT order_id, customer_id, SUM(amount) FROM raw.orders GROUP BY 1, 2;
DROP TABLE analytics.fct_orders;
ALTER TABLE analytics.fct_orders_temp RENAME TO fct_orders;
```
一旦底层数据库从 PostgreSQL 迁移到 Snowflake，所有的 `CREATE TABLE` 方言和重命名语法全部需要推倒重写！

### 二、dbt 的声明式核心思想：只需关注“怎么查”，不用管“怎么建”
dbt 提出了颠覆性的开发范式：
- **一个 `.sql` 文件对应数据仓库中的一张表或视图**；
- 文件名即表名（例如 `models/marts/fct_orders.sql` 会在数仓中生成名为 `fct_orders` 的物理表/视图）；
- **文件内部只包含一段纯粹的、标准的 `SELECT` 查询语句**！
```sql
-- models/marts/fct_orders.sql
SELECT 
    order_id,
    customer_id,
    SUM(amount) AS total_amount
FROM {{ ref('stg_orders') }}
GROUP BY 1, 2
```
- **背后发生了什么？**
  执行 `dbt run` 时，dbt 自动在外部包裹目标数仓适配的包装层（根据配置自动生成 `CREATE OR REPLACE VIEW ... AS` 或 `CREATE TABLE ... AS` 甚至是增量 `MERGE INTO`）；分析工程师的注意力被 100% 释放回**商业逻辑与 SQL 业务表达本身**！""",
            difficulty=1,
            tips=[
                tip("金科玉律", "在 dbt 模型 `.sql` 文件中，绝对不允许出现 `CREATE`, `DROP`, `INSERT`, `UPDATE`, `ALTER` 或分号 `;`！只写 SELECT 查询即可。")
            ],
            demos=[
                demo("声明式转换", "代码声明: SELECT * FROM upstream -> dbt编译: CREATE TABLE target.model AS SELECT * FROM ...")
            ]
        ),
        lesson(
            "dbt-l4-2",
            "原始数据源声明：{{ source() }} 宏与新鲜度 (Freshness) 监控",
            """### 一、为什么不能在模型中直接硬编码底层源表？
很多新手初写 dbt 时，常常随手写下：
`SELECT * FROM raw_postgres.public.orders;`
这会导致严重问题：
1. 一旦源头数据库名变动，必须在全项目几十个 SQL 文件中挨个查找替换；
2. dbt 无法感知最顶层原始数据源的存在，导致生成的依赖血缘图出现缺失的断头节点。

### 二、声明数据源：sources.yml
规范的做法是在 `models/staging/` 目录下创建一个 `_sources.yml` 文件声明所有原始数据源：
```yaml
version: 2

sources:
  - name: jaffle_shop            # 数据源逻辑名称（通常对应业务系统库名）
    database: raw_pos_system     # 物理数据库名称
    schema: public               # 物理模式名称
    description: "自营线上电商交易系统原始数据库镜像"
    tables:
      - name: orders             # 物理表名
        description: "未清洗的原始订单流水日志"
      - name: customers
        description: "用户注册原始明细表"
```

### 三、在模型中通过 `{{ source() }}` 动态引用
在 SQL 模型中，永远通过内置宏引用数据源：
```sql
-- models/staging/stg_orders.sql
SELECT
    id AS order_id,
    user_id AS customer_id,
    order_date,
    status
FROM {{ source('jaffle_shop', 'orders') }}
```

### 四、源数据新鲜度监听 (Source Freshness)
数据仓库最怕上游抽取管道静默挂掉，数仓还在基于前天的数据计算假报表。dbt 内置了强大的**数据新鲜度检测机制**：
```yaml
tables:
  - name: orders
    freshness:
      warn_after: {count: 12, period: hour}   # 超过 12 小时无新数据写入发出警告
      error_after: {count: 24, period: hour}  # 超过 24 小时无新数据直接报警熔断！
    loaded_at_field: _etl_loaded_at           # 用于判断新鲜度的时间戳字段
```
在 CI/CD 中定期运行 `dbt source freshness`，能够先于业务方第一时间精准捕获源头抽取断流故障！""",
            difficulty=2,
            tips=[
                tip("Source 的唯一职责", "在整个 dbt 项目中，只有最底层的贴源层 Staging 模型才允许出现 `{{ source() }}`；上层的 Intermediate 和 Marts 模型必须全部通过 `{{ ref() }}` 引用经过清洗的 Staging 模型，严禁跨层直接抓取 Raw 裸表！")
            ]
        ),
        lesson(
            "dbt-l4-3",
            "核心依赖解耦魔法：{{ ref() }} 宏与有向无环图 (DAG) 自动推导",
            """### 一、{{ ref() }}：dbt 整个生态系统最核心的神奇函数
在传统 SQL 脚本中，表与表之间的依赖关系深深埋藏在文本字符串中，计算机无法自动感知谁先执行、谁后执行。
dbt 通过单一内置函数 `{{ ref('model_name') }}`，优雅地同时解决了**环境隔离**与**依赖图谱构建**两大世纪难题：
```sql
-- models/marts/fct_customer_orders.sql
WITH orders AS (
    SELECT * FROM {{ ref('stg_orders') }}
),
customers AS (
    SELECT * FROM {{ ref('stg_customers') }}
)
SELECT ...
```

### 二、{{ ref() }} 带来的双重魔力
1. **自动环境解析 (Environment Aware)**：
   - 当你在本地 `dev` 环境运行：`{{ ref('stg_orders') }}` 会被自动编译为：`"my_duckdb"."dbt_steven"."stg_orders"`；
   - 当 CI/CD 在 `prod` 生产环境运行：同一行代码会被自动编译为：`"analytics_prod"."marts"."stg_orders"`；
   - **完全无需人工修改表名前缀，彻底消灭了测试环境误伤生产数据的低级错误**！
2. **自动构建拓扑依赖 DAG (Directed Acyclic Graph)**：
   - dbt 在运行前会先静态扫描所有 SQL 文件里的 `{{ ref() }}` 与 `{{ source() }}` 调用；
   - 自动画出一张完美的树状有向无环图 (DAG)：
     ```text
     source.jaffle_shop.orders ──> stg_orders ──┐
                                                ├──> fct_orders
     source.jaffle_shop.customers ─> stg_customers ─┘
     ```
   - **自动化最大并行调度**：dbt 自动分析出 `stg_orders` 与 `stg_customers` 互不依赖，会启动两个并行线程同时并发构建它们；等到两者均顺利完成后，才触发下游的 `fct_orders`。再也不需要人工在 Crontab 上猜时间设定时！""",
            difficulty=1,
            tips=[
                tip("不要在 ref 里写 .sql 后缀", "参数必须是纯模型名字符串，例如 `{{ ref('stg_orders') }}`，严禁写成 `{{ ref('stg_orders.sql') }}`。")
            ]
        ),
        lesson(
            "dbt-l4-4",
            "从 Jinja 源码到数仓执行：target/compiled 与 target/run 底层揭秘",
            """### 一、dbt 代码的双重蜕变全流程
很多初学者感到神秘：“dbt 是怎么把那些花里胡哨的 `{{ ref() }}` 变成数据库真正能跑的代码的？”
让我们通过底层目录窥探编译内幕：
- **源代码 (`models/marts/fct_orders.sql`)**：
  ```sql
  SELECT order_id, amount FROM {{ ref('stg_orders') }}
  ```
- **第 1 阶段编译：`dbt compile` -> `target/compiled/`**：
  dbt 解析 Jinja 语法，将所有的宏和引用替换为当前环境的目标物理全限定表名：
  ```sql
  -- target/compiled/my_project/models/marts/fct_orders.sql
  SELECT order_id, amount FROM "analytics_dw"."dbt_alice"."stg_orders"
  ```
- **第 2 阶段封装：`dbt run` -> `target/run/`**：
  根据模型的物化配置（如 `materialized: table`），在外部套上对应的数据库方言 DDL 包装壳：
  ```sql
  -- target/run/my_project/models/marts/fct_orders.sql
  CREATE OR REPLACE TABLE "analytics_dw"."dbt_alice"."fct_orders" AS (
      SELECT order_id, amount FROM "analytics_dw"."dbt_alice"."stg_orders"
  );
  ```

### 二、排查调试的核心心法
当你在本地运行模型报 SQL 语法错误时：
- **第一步**：绝对不要盲猜，直接打开 `target/run/<project_name>/models/...` 找到报错对应的那个 `.sql` 文件；
- **第二步**：复制里面的完整原生 SQL，粘贴到 DBeaver、DataGrip 或 Snowflake 工作台手动执行；
- **第三步**：数仓的真实错误光标会精准定位到第几行第几列，排错效率提升十倍！""",
            difficulty=2,
            tips=[
                tip("compile 是安全只读命令", "`dbt compile` 仅仅在本地解析并生成 target/compiled 目录下的原生 SQL，完全不会对数仓进行任何物理建表写入，是非常安全的排查工具。")
            ]
        ),
        lesson(
            "dbt-l4-5",
            "dbt 节点选择器语法 (Node Selection) 深度精通",
            """### 一、为什么必须掌握节点选择器？
在一个拥有 500 个模型的中大型数仓项目中，每次开发一个新报表，绝不能盲目执行全局 `dbt run`（这可能要跑 3 小时并消耗数千美元云数仓算力）！
你必须能够精准指定：“只跑我修改的这个模型以及依赖它的下游报表”。

### 二、选择器核心语法速查表
1. **单一模型运行**：
   - `dbt run --select stg_orders`（只运行单个 `stg_orders` 模型）。
2. **上游追溯依赖 (+ 在左侧)**：
   - `dbt run --select +fct_orders`：
   - **含义**：运行 `fct_orders` 以及它的**所有直接和间接上游依赖模型**（自底向上构建其完整血缘底座）。
3. **下游扩散影响 (+ 在右侧)**：
   - `dbt run --select stg_orders+`：
   - **含义**：运行 `stg_orders` 以及**所有依赖它的下游模型**（修改基础源模型后，批量刷新受影响的所有下游集市）。
4. **全血缘沙漏分支 (@ 语法)**：
   - `dbt run --select @int_order_payments`：
   - **含义**：运行该模型本身、它的所有上游依赖，以及所有受其影响的下游分支！
5. **按目录与标签过滤**：
   - `dbt run --select staging.*`（只跑 staging 目录下的所有清洗模型）；
   - `dbt run --select tag:finance`（只跑打上了财务标签的模型）。
6. **组合与排除逻辑**：
   - `dbt run --select marts.* --exclude marts.fct_huge_clicks`（运行 marts 下除超大点击流表外的所有模型）。""",
            difficulty=2,
            tips=[
                tip("记忆口诀", "加号在左看上游（追本溯源），加号在右跑下游（顺流而下）；@符号最霸道，上下两头全跑掉！")
            ]
        ),
        lesson(
            "dbt-l4-6",
            "循环引用 (Circular Dependencies) 检测与拓扑排序算法直觉",
            """### 一、致命死锁：循环引用 (Circular Dependency)
有向无环图的核心底线是**“无环 (Acyclic)”**！
如果模型 A 引用了模型 B，而模型 B 又直接或间接通过模型 C 引用了模型 A：
```text
fct_orders ──> int_revenue ──> stg_payments ──> fct_orders (死循环！)
```
此时没有任何一个任务可以作为合法的起点执行，系统产生死锁！

### 二、dbt 的拓扑排序 (Topological Sorting) 原理
在执行任何实际的数据库任务前，dbt 编译器在内存中运用经典的图论算法（基于入度统计的 **Kahn 算法** 或 **深度优先搜索 DFS 染色法**）：
1. 遍历所有节点，计算每个模型的**入度 (In-degree)**（即它依赖的上游节点总数）；
2. 找到所有入度为 0 的节点（即只依赖原始 `source` 的顶级 Staging 模型），将其放入就绪队列；
3. 每当一个模型构建完成，将所有依赖它的下游节点的入度减 1；
4. 重复上述过程，直到所有模型调度完毕。
**如果发现队列已经为空，但还有未执行的模型，说明图中存在环状回路！**
dbt 会立即停止运行并抛出明晰的报错：
`Found a cycle: model.fct_orders -> model.int_revenue -> model.fct_orders`，精准指示成环的闭环路径。""",
            difficulty=3,
            tips=[
                tip("破解循环引用的架构心法", "如果你发现两个模型必须互相引用，说明业务职责划分出现了严重混淆！必须引入第三个更底层的中间模型 (Intermediate) 提取共同依赖，将双向循环拆解为单向流动的 Y 字形依赖。")
            ]
        ),
        lesson(
            "dbt-l4-7",
            "算例拆解：多路源表通过 ref() 自动解耦组装的 DAG 实战与自查清单",
            """### 一、多源关联电商模型完整搭建推演
**【业务目标】**：构建一张用于高管分析的客户全景消费集市表 `dim_customers.sql`，需整合原始用户注册表与订单明细表。

**第 1 步：贴源清洗模型（各自独立解耦）**：
```sql
-- models/staging/stg_customers.sql
SELECT 
    id AS customer_id,
    first_name || ' ' || last_name AS full_name,
    created_at AS registered_at
FROM {{ source('jaffle_shop', 'customers') }}
```

```sql
-- models/staging/stg_orders.sql
SELECT 
    id AS order_id,
    user_id AS customer_id,
    order_date,
    status
FROM {{ source('jaffle_shop', 'orders') }}
```

**第 2 步：中间聚合模型 (`int_customer_orders_summary.sql`)**：
```sql
-- models/intermediate/int_customer_orders_summary.sql
SELECT
    customer_id,
    min(order_date) AS first_order_date,
    max(order_date) AS most_recent_order_date,
    count(order_id) AS total_orders
FROM {{ ref('stg_orders') }}
GROUP BY 1
```

**第 3 步：最终集市维度表 (`dim_customers.sql`)**：
```sql
-- models/marts/dim_customers.sql
WITH customers AS (
    SELECT * FROM {{ ref('stg_customers') }}
),
order_summary AS (
    SELECT * FROM {{ ref('int_customer_orders_summary') }}
)
SELECT
    c.customer_id,
    c.full_name,
    c.registered_at,
    coalesce(s.total_orders, 0) AS lifetime_orders,
    s.first_order_date,
    s.most_recent_order_date
FROM customers AS c
LEFT JOIN order_summary AS s
    ON c.customer_id = s.customer_id
```

**【编译执行与 DAG 生成】**：
执行 `dbt build --select dim_customers+`：
dbt 自动解析依赖，以最快并发度完成 `stg_customers` 与 `stg_orders` 的并行处理，随后执行 `int_customer_orders_summary`，最后完成 `dim_customers` 的组装落表！

---
### 二、dbt 模型开发避坑自查清单
1. [ ] **纯粹 SELECT**：模型内部是否 100% 为只读 SELECT 查询，未混入任何 CREATE TABLE 或分号？
2. [ ] **无硬编码**：除 `_sources.yml` 外，所有跨模型连接是否严格使用了 `{{ ref() }}`？
3. [ ] **无双向环路**：模型间流动方向是否严格保持单向依赖（Staging -> Intermediate -> Marts）？
4. [ ] **选择器精准**：本地调试时是否运用 `--select model+` 等精细选择器，杜绝浪费算力？""",
            difficulty=2,
            tips=[
                tip("一键查看血缘图", "在本地终端运行 `dbt docs generate && dbt docs serve`，点击右下角蓝色的 Lineage Graph 按钮，即可在网页端亲眼看到上面三层模型优美漂亮的拓扑依赖流动图！")
            ]
        )
    ]

    c4_exercises = [
        single_choice(
            "dbt-c4-e1",
            "在编写 dbt 模型 (`models/xxx.sql`) 时，关于 SQL 语法的核心规范要求，下列描述正确的是：",
            [
                {"label": "每个 `.sql` 文件只需包含一段纯粹的、不带结尾分号的 `SELECT` 查询语句，物化建表与表替换语法由 dbt 底层引擎自动包装处理", "value": "A"},
                {"label": "必须在文件开头手写 `CREATE TABLE IF NOT EXISTS`", "value": "B"},
                {"label": "每个模型文件必须以 `DROP TABLE` 语句开头防止重名冲突", "value": "C"},
                {"label": "文件结尾必须手写五个连续的分号 `;;;;;` 作为终止符", "value": "D"},
            ],
            "A",
            "dbt 的核心是声明式建模。开发者只需写纯 SELECT 查询，禁止出现 DDL/DML 样板代码与结尾分号，dbt 自动在外部包裹目标数仓适配的 CREATE/INSERT 包装层。",
            difficulty=1,
            related_lesson_id="dbt-l4-1",
            tags=["声明式SQL", "模型语法", "纯SELECT原则"],
        ),
        single_choice(
            "dbt-c4-e2",
            "在 dbt 中，跨模型引用的最核心内置函数是 `{{ ref('model_name') }}`。关于该函数的底层实现机理与价值，下列描述最完整准确的是：",
            [
                {"label": "它根据运行环境自动将逻辑模型名解析为对应环境的目标物理全限定表名（如在开发环境自动前缀个人 schema），并静态分析自动构建起数仓的拓扑依赖图 (DAG)", "value": "A"},
                {"label": "它会自动将普通 SQL 查询加密为不可逆的 Base64 编码", "value": "B"},
                {"label": "它专门用于在数仓中生成随机假数据", "value": "C"},
                {"label": "它的唯一作用是在控制台打印模型名称", "value": "D"},
            ],
            "A",
            "`ref()` 宏是 dbt 的灵魂：它不仅实现了跨环境平滑迁移（dev与prod物理表名自动替换），更在编译期自动推导出了全项目的有向无环依赖图 (DAG)。",
            difficulty=1,
            related_lesson_id="dbt-l4-3",
            tags=["ref宏", "DAG依赖", "环境隔离"],
        ),
        single_choice(
            "dbt-c4-e3",
            "当某数据分析师在本地修改了基础清洗模型 `stg_orders` 的字段类型后，希望仅运行该模型以及所有直接或间接依赖于它的全部下游模型，应该在终端执行的标准选择器命令是：",
            [
                {"label": "dbt run --select stg_orders+", "value": "A"},
                {"label": "dbt run --select +stg_orders", "value": "B"},
                {"label": "dbt run --select @stg_orders", "value": "C"},
                {"label": "dbt run --select stg_orders.sql", "value": "D"},
            ],
            "A",
            "加号在右侧（`stg_orders+`）表示包含自身及其所有下游扩散依赖；加号在左侧（`+model`）表示包含自身及其所有上游依赖；@语法表示包含上下游全分支。",
            difficulty=2,
            related_lesson_id="dbt-l4-5",
            tags=["节点选择器", "下游追溯", "选择器语法"],
        ),
        single_choice(
            "dbt-c4-e4",
            "在数据源管理中，dbt 提供了源数据新鲜度检测机制 (`dbt source freshness`)。关于该功能的核心应用价值，下列描述最为准确的是：",
            [
                {"label": "通过指定表中的加载时间戳字段，自动检测原始数据是否在约定的 SLA 窗口内正常写入，及时捕获上游抽取管道静默中断故障", "value": "A"},
                {"label": "自动删除所有超过 3 天未被读取的冷数据", "value": "B"},
                {"label": "自动对数仓所有历史数据进行压缩加密", "value": "C"},
                {"label": "强制要求开发人员每天上午 9 点向数据库发送签到打卡消息", "value": "D"},
            ],
            "A",
            "source freshness 监控原始表是否有按时流入新数据，防止数仓基于断流的过期数据计算报表，是现代数据观测与 SLA 防御的第一道哨兵。",
            difficulty=2,
            related_lesson_id="dbt-l4-2",
            tags=["source freshness", "数据源治理", "SLA监控"],
        ),
        single_choice(
            "dbt-c4-e5",
            "在 dbt 项目编译执行过程中，若模型 A 引用了模型 B，模型 B 引用了模型 C，而模型 C 又在代码中通过 `{{ ref('A') }}` 引用了模型 A，dbt 编译器在运行前会产生的结果是：",
            [
                {"label": "通过拓扑排序算法立即检测出死循环依赖 (Circular Dependency)，中断运行并抛出包含成环路径的明确异常提示", "value": "A"},
                {"label": "自动无限循环执行这三个模型直至电脑蓝屏死机", "value": "B"},
                {"label": "随机选择一个模型强制删除其全部数据以打破循环", "value": "C"},
                {"label": "将三个模型自动融合成一张空白表格并继续运行", "value": "D"},
            ],
            "A",
            "有向无环图 (DAG) 严禁出现环状回路。dbt 在内存中执行拓扑排序，一旦发现入度依赖无法解开的循环引用，会立刻中断并准确报错成环路径。",
            difficulty=2,
            related_lesson_id="dbt-l4-6",
            tags=["循环引用", "拓扑排序", "DAG死锁"],
        ),
        single_choice(
            "dbt-c4-e6",
            "在日常调试时，如果某个复杂的 dbt 模型在数仓运行抛出报错，分析师想要查看‘Jinja 宏被完全展开替换后的纯原生数仓 SQL’，应当查阅项目根目录下的哪个路径？",
            [
                {"label": "target/compiled/<project_name>/models/... 对应的 .sql 文件", "value": "A"},
                {"label": "seeds/ 目录下的同名文件", "value": "B"},
                {"label": "macros/ 目录下的系统配置文件", "value": "C"},
                {"label": "dbt_project.yml 文件的最后两行", "value": "D"},
            ],
            "A",
            "`target/compiled/` 存放的是纯 SELECT 的原生解析结果，`target/run/` 存放的是包裹了 CREATE TABLE/VIEW 的最终落表执行指令，是调试排查的首要阵地。",
            difficulty=1,
            related_lesson_id="dbt-l4-4",
            tags=["target目录", "编译排查", "调试心法"],
        ),
        multiple_choice(
            "dbt-c4-e7",
            "关于 dbt 中原始数据源声明 (`source`) 与跨模型引用 (`ref`) 的使用规范，下列说法正确的有：（多选）",
            [
                {"label": "在 YAML 中通过 `sources:` 集中声明原始数据源，并在 SQL 中通过 `{{ source('source_name', 'table_name') }}` 动态调用", "value": "A"},
                {"label": "规范架构提倡只在最底层的贴源清洗层 (Staging) 引用 `{{ source() }}`", "value": "B"},
                {"label": "业务集市层 (Marts) 与中间层 (Intermediate) 应当统一使用 `{{ ref() }}` 引用经过治理的中间模型", "value": "C"},
                {"label": "应当在所有模型中随意混用直接硬编码的物理表名 `FROM my_raw_db.public.raw_orders`", "value": "D"},
                {"label": "`{{ ref('model_name') }}` 的参数不需要也不应该携带 `.sql` 扩展名", "value": "E"},
            ],
            ["A", "B", "C", "E"],
            "A、B、C、E 均为 dbt 的官方最佳工程规范。D 是严重破坏血缘图谱与环境隔离的硬编码反模式，必须严格禁止。",
            difficulty=2,
            related_lesson_id="dbt-l4-2",
            tags=["source规范", "ref规范", "数仓架构准则"],
        ),
        multiple_choice(
            "dbt-c4-e8",
            "在 dbt 节点选择器命令行语法中，下列命令的含义解读正确的有：（多选）",
            [
                {"label": "`dbt run --select +fct_orders`：构建 fct_orders 及其全部直接和间接上游依赖模型", "value": "A"},
                {"label": "`dbt run --select stg_payments+`：构建 stg_payments 及其全部下游受影响的模型", "value": "B"},
                {"label": "`dbt run --select staging.*`：只构建 staging 目录下的全部模型", "value": "C"},
                {"label": "`dbt run --select tag:nightly`：只构建打上了 `nightly` 标签的模型", "value": "D"},
                {"label": "`dbt run --select *`：只运行名字叫星号的模型，并删除其他全部表", "value": "E"},
            ],
            ["A", "B", "C", "D"],
            "A（上游）、B（下游）、C（路径过滤）、D（标签过滤）均为官方权威选择器语法。E 选项解读错误。",
            difficulty=2,
            related_lesson_id="dbt-l4-5",
            tags=["NodeSelection", "多选解析", "选择器实战"],
        ),
        judge(
            "dbt-c4-e9",
            "在 dbt 核心模型中，`dbt compile` 命令是只读的本地语法解析与环境渲染过程，完全不会连接远程数据仓库并修改任何物理表结构，因此可以在本地安全频繁运行。",
            "正确",
            "正确。`dbt compile` 仅在本地渲染 Jinja 并在 target/compiled 目录生成纯 SQL，不执行任何写操作，非常适合快速静态语法自检。",
            difficulty=1,
            related_lesson_id="dbt-l4-4",
            tags=["dbt compile", "只读命令", "安全编译"],
        ),
        judge(
            "dbt-c4-e10",
            "如果在 `fct_orders.sql` 中写入了 `{{ ref('fct_orders') }}`，试图在当前模型内部递归引用自己上一秒生成的数据，dbt 会自动识别该行为并无条件支持死循环递归迭代写入。",
            "错误",
            "错误！`ref` 自身会直接导致自循环死锁（入度无法为0）。dbt 的有向无环图 (DAG) 严格禁止任何形式的自我引用或回路依赖。",
            difficulty=1,
            related_lesson_id="dbt-l4-6",
            tags=["自我引用禁忌", "DAG回路", "循环死锁"],
        ),
        fill(
            "dbt-c4-e11",
            "在 dbt 依赖管理中，用于声明跨模型引用的核心内置 Jinja 宏名称为 [blank1]；而用于引用在 YAML 中定义的外部原始数据源的宏名称为 [blank2]。",
            [["ref"], ["source"]],
            "跨模型引用使用 `ref`（如 `{{ ref('model') }}`）；原始数据源引用使用 `source`（如 `{{ source('src', 'tbl') }}`）。",
            difficulty=1,
            related_lesson_id="dbt-l4-3",
            tags=["ref", "source", "核心宏填空"],
        ),
        fill(
            "dbt-c4-e12",
            "在 dbt CLI 选择器语法中，如果希望一次性构建模型 `int_payments` 本身、其全部上游依赖模型以及其全部下游分支模型（全血缘沙漏状贯通运行），所使用的前缀修饰符号为 [blank1]（请填入单个特殊符号，如 + 或 @）。",
            [["@"]],
            "`@model_name` 语法能够同时向上和向下抓取全部分支血缘，属于全包容沙漏型选择器。",
            difficulty=2,
            related_lesson_id="dbt-l4-5",
            tags=["@选择器", "全血缘运行", "填空题"],
        ),
        open_ex(
            "dbt-c4-e13",
            "【dbt 依赖图谱与分层建模大作业】流媒体会员订阅与观看时长集市 DAG 架构设计与代码实战",
            """你作为某知名在线视频流媒体平台（类似 Netflix/爱奇艺）的 Senior Analytics Engineer，正在为运营与内容采购团队构建数仓核心数据集市模型。
业务原始数据源存在于原始库 `raw_streaming` 中，包含两张原始表：
1. `raw_streaming.subscription_logs`：会员付费与订阅流水日志（包含字段 `id`, `user_id`, `plan_type`, `amount_paid_cents`, `start_date`, `end_date`, `status`）；
2. `raw_streaming.video_play_events`：海量播放事件埋点日志（包含字段 `event_id`, `user_id`, `video_id`, `duration_seconds`, `event_timestamp`）。

最终业务目标：
为商业智能看板提供一张高层集市汇总表 `marts/finance/fct_user_monthly_activity.sql`，输出每个用户在每个月份的：**月度订阅金额（转为元）、有效会员天数、月度累计观影时长（转为小时）、观影次数**。

**【任务要求】**：
(1) 请编写数据源声明文件 `models/staging/_streaming_sources.yml`，对上述两张原始表进行规范的 Source 声明，并为播放事件表配置超过 6 小时即警告的数据新鲜度 (freshness) 规则；
(2) 分别编写贴源清洗模型 `models/staging/stg_subscription_logs.sql` 与 `models/staging/stg_video_play_events.sql` 的核心 SQL 代码（必须规范使用 `{{ source() }}`，完成金额分转元、时长秒转小时及关键字段规范重命名）；
(3) 编写最终集市事实表 `models/marts/finance/fct_user_monthly_activity.sql` 的 SQL 代码（必须严格规范使用 `{{ ref() }}` 进行多路数据安全整合）；
(4) 画出本项目的完整血缘依赖图谱拓扑结构 (DAG)；并写出一条精准的 dbt CLI 命令：**仅运行该最终集市表及其所有直接和间接上游依赖模型**。""",
            """【标准项目代码与架构设计方案】

(1) 原始数据源声明 (`models/staging/_streaming_sources.yml`)：
```yaml
version: 2

sources:
  - name: streaming_app
    database: raw_streaming
    schema: public
    description: "流媒体业务系统原始数据库与播放埋点流镜像"
    tables:
      - name: subscription_logs
        description: "会员订阅与充值原始流水日志"
      - name: video_play_events
        description: "客户端播放心跳与完播事件日志"
        freshness:
          warn_after: {count: 6, period: hour}
          error_after: {count: 24, period: hour}
        loaded_at_field: event_timestamp
```

(2) 贴源清洗层模型代码：
1. `models/staging/stg_subscription_logs.sql`：
```sql
SELECT
    id AS subscription_id,
    user_id,
    plan_type,
    round(amount_paid_cents / 100.0, 2) AS amount_paid_yuan,
    cast(start_date AS date) AS start_date,
    cast(end_date AS date) AS end_date,
    lower(status) AS subscription_status
FROM {{ source('streaming_app', 'subscription_logs') }}
```

2. `models/staging/stg_video_play_events.sql`：
```sql
SELECT
    event_id,
    user_id,
    video_id,
    round(duration_seconds / 3600.0, 4) AS duration_hours,
    cast(event_timestamp AS date) AS event_date,
    date_trunc('month', event_timestamp) AS event_month
FROM {{ source('streaming_app', 'video_play_events') }}
```

(3) 业务集市事实表代码 (`models/marts/finance/fct_user_monthly_activity.sql`)：
```sql
WITH subscriptions AS (
    SELECT
        user_id,
        date_trunc('month', start_date) AS activity_month,
        sum(amount_paid_yuan) AS monthly_subscription_revenue
    FROM {{ ref('stg_subscription_logs') }}
    WHERE subscription_status = 'active'
    GROUP BY 1, 2
),

watch_activity AS (
    SELECT
        user_id,
        event_month AS activity_month,
        count(distinct event_id) AS total_watch_sessions,
        sum(duration_hours) AS total_watch_hours
    FROM {{ ref('stg_video_play_events') }}
    GROUP BY 1, 2
),

all_user_months AS (
    SELECT user_id, activity_month FROM subscriptions
    UNION
    SELECT user_id, activity_month FROM watch_activity
)

SELECT
    u.user_id,
    u.activity_month,
    coalesce(s.monthly_subscription_revenue, 0.00) AS monthly_subscription_revenue,
    coalesce(w.total_watch_sessions, 0) AS total_watch_sessions,
    coalesce(w.total_watch_hours, 0.0000) AS total_watch_hours
FROM all_user_months AS u
LEFT JOIN subscriptions AS s
    ON u.user_id = s.user_id AND u.activity_month = s.activity_month
LEFT JOIN watch_activity AS w
    ON u.user_id = w.user_id AND u.activity_month = w.activity_month
```

(4) 拓扑血缘 DAG 与精准执行命令：
1. **DAG 依赖血缘流向图**：
```text
source.streaming_app.subscription_logs ──> stg_subscription_logs ──┐
                                                                   ├──> fct_user_monthly_activity
source.streaming_app.video_play_events ──> stg_video_play_events ─┘
```
2. **仅运行集市表及其全部上游的 CLI 命令**：
```bash
dbt run --select +fct_user_monthly_activity
```
（加号在模型名称左侧，代表逆流向上抓取所有依赖并按正确拓扑顺序自底向上执行）。""",
            [
                {"point": "正确编写 sources.yml 声明两个源表并为播放事件配置 6 小时 freshness 阈值", "score": 1},
                {"point": "编写两个规范的 Staging 模型，正确调用 source 宏并完成单位换算与重命名", "score": 1},
                {"point": "编写最终 Marts 事实表，规范使用 ref 宏进行多路聚合关联，逻辑严谨无笛卡尔积", "score": 1},
                {"point": "清晰展示双源分流再汇聚的拓扑血缘 DAG 结构", "score": 1},
                {"point": "准确写出 dbt run --select +fct_user_monthly_activity 上游追溯命令", "score": 1},
            ],
            exemplar="""【流媒体会员与观影集市 dbt 架构实现】
一、sources.yml：
声明 source: streaming_app，包含 subscription_logs 与 video_play_events，为后者配置 freshness warn_after: 6 hours。

二、Staging 模型：
- stg_subscription_logs：通过 {{ source('streaming_app', 'subscription_logs') }} 抽取，完成分转元 (amount_paid_cents / 100.0)。
- stg_video_play_events：通过 {{ source('streaming_app', 'video_play_events') }} 抽取，完成秒转小时 (duration_seconds / 3600.0)。

三、Marts 事实表 (fct_user_monthly_activity)：
通过 {{ ref('stg_subscription_logs') }} 与 {{ ref('stg_video_play_events') }} 分别按月度和用户预聚合，在顶层通过全用户月份全连接并 COALESCE 补零输出。

四、DAG 与命令：
- DAG：两路源 -> 两路 Staging -> 汇聚至 fct_user_monthly_activity。
- 仅构建该集市及其上游：`dbt run --select +fct_user_monthly_activity`。""",
            difficulty=5,
            related_lesson_id="dbt-l4-7",
            tags=["DAG设计", "跨源关联", "选型实战", "多层建模大作业"],
        ),
    ]

    ch4 = chapter(
        "dbt-c4",
        "dbt-analytics-engineering",
        4,
        "dbt 模型构建与 DAG 依赖解耦",
        "掌握 dbt 声明式建模核心：纯 SELECT 查询规范、数据源声明与 Freshness 新鲜度监控、ref() 宏依赖动态解耦与环境自适应、编译全过程解密 (target/compiled/run)、高级选择器语法以及拓扑排序与循环引用规避。",
        c4_lessons,
        c4_exercises,
    )
    return ch4

if __name__ == "__main__":
    ch = get_chapter_4()
    print(f"Chapter 4 validated: {len(ch['lessons'])} lessons, {len(ch['exercises'])} exercises.")
