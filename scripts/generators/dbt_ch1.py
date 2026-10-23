# -*- coding: utf-8 -*-
"""
dbt Analytics Engineering - Chapter 1: Introduction to Modern Data Stack & Analytics Engineering
"""

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_1():
    c1_lessons = [
        lesson(
            "dbt-l1-1",
            "从传统 ETL 到现代 ELT：数据架构的范式大迁移",
            """### 一、传统 ETL 架构的黄昏与痛点
在 2000~2015 年的大数据与传统商业智能 (BI) 时代，企业构建数据仓库的标准工作流是 **ETL (Extract - Transform - Load)**：
1. **Extract（抽取）**：从生产 MySQL、Oracle 业务库抽取原始数据；
2. **Transform（转换）**：在专用的中间转换服务器（如 Informatica、DataStage、Kettle、自建 Python 脚本）中进行昂贵的数据清洗、过滤、反规范化与跨表关联；
3. **Load（加载）**：将最终计算完成的聚合报表数据写入目标数据仓库。

**传统 ETL 的致命瓶颈**：
- **算力错配与硬件瓶颈**：中间 ETL 服务器硬件成本高昂、扩容困难，一旦遇到业务高峰或复杂多表 JOIN，服务器 CPU 瞬间拉满，导致报表产出频繁延迟；
- **黑盒与信息不可逆丢失**：转换发生在数据进入数仓之前，为了节省存储，数据工程师往往在清洗过程中丢弃未被当前报表使用的字段。一旦业务方提出新的分析维度，必须重新寻找源头数据库全量回溯，周期长达数周；
- **业务敏捷度极差**：数据工程师沦为“取数工具人”，上游一旦改动表结构，下游报表大面积瘫痪。

### 二、现代 ELT 范式的崛起 (Extract - Load - Transform)
随着云原生列式数据仓库（如 **Snowflake、Google BigQuery、AWS Redshift、ClickHouse、DuckDB**）的横空出世，存储成本骤降，弹性计算算力近乎无限。
数据架构迎来了颠覆性的范式大反转 —— **ELT**：
1. **Extract（抽取） & Load（加载）**：
   - 借助现代摄取工具（如 Fivetran、Airbyte、Debezium、自建 CDC），将生产业务库的原始数据**毫无保留地、原汁原味地全量复制到数仓的原始层 (Raw / Staging)**；
2. **Transform（数仓内部转换）**：
   - 数据全部落地数仓后，**利用数仓强大的大规模并行处理 (MPP) 算力，直接通过 SQL 在数仓内部完成清洗、建模与聚合**！

| 比较维度 | 传统 ETL | 现代 ELT (现代数据栈 MDS) |
| :--- | :--- | :--- |
| **计算引擎** | 独立的中间转换服务器 (Informatica/Python) | 现代高性能分布式/列式数仓自身算力 |
| **原始数据保留** | 通常不保留原始全量数据，只保留转换结果 | 原始数据永久完整保留在 Raw 数据湖/数仓 |
| **业务敏捷性** | 极低（修改口径需重新抽取源库） | 极高（仅需修改转换 SQL 并重新运行模型） |
| **核心工具** | Kettle, DataStage, SSIS, 自建脚本 | Airbyte (抽取加载) + **dbt (转换核心)** |
| **工程规范** | 黑盒专有配置、难以代码评审 (PR) | **纯 SQL + Git 协作、CI/CD 自动化集成测试** |""",
            difficulty=1,
            tips=[
                tip("ELT 核心心法", "在现代 ELT 架构中，数据仓库不再仅仅是'数据的最终停机坪'，而是变成了'数据转换的核心计算引擎'。这正是 dbt (data build tool) 能够风靡全球的底层技术土壤。")
            ],
            demos=[
                demo("ELT 流水线", "MySQL/API (业务源) -> [Airbyte/Fivetran] -> Raw数仓 -> [dbt 内部SQL转换] -> Marts分析集市 -> BI/报表")
            ]
        ),
        lesson(
            "dbt-l1-2",
            "分析工程师 (Analytics Engineer) 角色崛起与职责边界",
            """### 一、现代数据团队的“马里亚纳海沟”
在传统组织架构中，数据团队通常被机械地割裂为两个互不理解的阵营：
1. **数据分析师 / 商业分析师 (Data Analyst / BI Developer)**：
   - 极其懂业务商业逻辑，精通可视化看板（Tableau、Power BI、Metabase）；
   - 但缺乏软件工程素养：不会 Git 版本控制，不懂自动化测试与 CI/CD，经常在 BI 报表后台编写长达 3000 行的“意面式 (Spaghetti) 嵌套子查询 SQL”，一旦离职无人能维护。
2. **数据工程师 (Data Engineer)**：
   - 懂底层分布式系统（Spark、Flink、Kafka、K8s），精通 Java/Scala/Python 与网络协议；
   - 但往往缺乏对商业细节的敏锐洞察（如“什么是活跃用户的留存漏斗”、“GMV 如何剔除退款”），难以设计出业务方顺手好用的集市宽表。
**结果就是沟通成本极高，报表口径频繁打架，两方互相推诿**。

### 二、分析工程师 (Analytics Engineer, AE) 的诞生
为了填补这道巨大的鸿沟，**分析工程师 (Analytics Engineer)** 成为过去五年硅谷及全球最炽手可热的数据新工种：
- **定义**：将**现代软件工程的最佳实践（版本控制、模块化重构、自动化测试、文档代码化、CI/CD）**引入到**数据建模与商业分析领域**的复合型专家。
- **武器库核心**：以 **dbt (data build tool)** 为核心中枢，配合 SQL、Git、现代数仓与编排器。

```
[数据工程师 Data Engineer] ────> 负责管线基建：API/CDC 抽取、数据湖存储、基础设施搭建
             │
[分析工程师 Analytics Engineer] ──> 负责核心建模：清洗转换、Kimball 维度建模、dbt 测试与指标语义层
             │
[数据分析师 / 业务方 Data Analyst] ─> 负责业务变现：探索性分析、A/B 测试、看板与战略决策
```

### 三、分析工程师的核心价值
1. **消除“数据孤岛与口径冲突”**：在数仓底层提供唯一事实源 (Single Source of Truth)；
2. **消灭“重复造轮子”**：将重复出现的商业逻辑封装为可复用的 dbt 模型与宏；
3. **保障“数据质量与契约”**：上游数据源变更时，通过自动化测试在第一时间熔断拦截，不把脏数据漏给 CEO 的看板。""",
            difficulty=1,
            tips=[
                tip("AE 与 DA 的区别", "Data Analyst 回答'过去发生了什么、为什么发生'；Analytics Engineer 负责'为回答这些问题铺平高质量、可复用、高可靠的数据底座'。")
            ]
        ),
        lesson(
            "dbt-l1-3",
            "OLTP 事务数据库 vs OLAP 列式分析数仓的底层物理差异",
            """### 一、为什么不能直接拿 MySQL / PostgreSQL 生产库做复杂报表查询？
很多初学者常问：“为什么不直接在业务 MySQL 库上写统计报表 SQL，非要折腾一个数据仓库？”
答案在于两者底层物理存储结构与设计目标的根本冲突：
1. **OLTP (On-Line Transaction Processing，联机事务处理)**：
   - 典型代表：MySQL, PostgreSQL, Oracle；
   - 业务目标：支撑高并发、低延迟的日常业务读写（用户下单、注册、修改密码）；
   - 核心特征：**高频单条记录的增删改查 (CRUD)**，强调 ACID 强事务，防止多扣用户一分钱；
   - 存储架构：**行式存储 (Row-oriented Storage)**。整行记录的数据紧密存放在相邻的磁盘块中。
2. **OLAP (On-Line Analytical Processing，联机分析处理)**：
   - 典型代表：Snowflake, ClickHouse, Google BigQuery, DuckDB, Amazon Redshift；
   - 业务目标：支撑海量历史数据的统计、聚合与关联洞察（分析过去 3 年所有品类的销售走势）；
   - 核心特征：**海量数据读取与大范围聚合（SUM, AVG, COUNT, GROUP BY）**，几乎无单行点查与更新；
   - 存储架构：**列式存储 (Column-oriented Storage)**。同一列的所有数据紧凑存放在一起。

### 二、行存 vs 列存的物理读写与压缩革命
假设有一张包含 100 个字段、1 亿行记录的电商订单表，我们只想计算：`SELECT category, SUM(amount) FROM orders GROUP BY category;`
- **行式存储的处理过程**：
  必须把这 1 亿行记录从磁盘完整读入内存！包括用户姓名、收货地址、身份证号、备注等完全无关的 98 个字段，产生高达 **98% 的无效磁盘 I/O**，极易导致生产数据库 I/O 堵塞崩溃！
- **列式存储的处理过程**：
  数仓只读取磁盘上物理存放 `category` 和 `amount` 的两个列数据块，其余 98 个字段的磁盘块**根本无需触碰**！I/O 吞吐量瞬间骤降 50 倍！
- **惊人的压缩比**：
  同一列的数据类型完全相同（如全是日期或整数），列式存储可以应用极高效的压缩算法（Run-length 游程编码、字典编码、ZSTD），压缩率通常达到 **3x ~ 10x**，极大节约存储费用并进一步提升查询吞吐量。""",
            difficulty=2,
            tips=[
                tip("分析工程师的数仓选型", "本地学习演练建议直接使用 DuckDB（嵌入式 OLAP 界的 SQLite，单机性能狂暴且完全兼容 Postgres SQL）；企业云端建议使用 Snowflake 或 BigQuery。")
            ],
            demos=[
                demo("行存与列存内存布局对比", "行存: [ID1, Name1, Age1][ID2, Name2, Age2]... | 列存: [ID1, ID2, ...][Name1, Name2, ...][Age1, Age2, ...]")
            ]
        ),
        lesson(
            "dbt-l1-4",
            "数据仓库、数据湖与现代湖仓一体架构全景",
            """### 一、数据架构的历史演进三部曲
1. **第一代：传统数据仓库 (Enterprise Data Warehouse, EDW，如 Teradata、Oracle RAC)**：
   - 优点：高度规范，SQL 体验成熟，质量高；
   - 缺点：硬件专有昂贵，只支持结构化表格数据，无法承载半结构化日志与海量音视频非结构化数据。
2. **第二代：大数据与数据湖 (Data Lake，如 Hadoop HDFS、AWS S3 裸文件)**：
   - 核心思想：低成本对象存储。无论什么数据（JSON、Parquet、CSV、图片），先原封不动倒进湖里；
   - 致命缺陷：缺乏事务支持 (No ACID)，无法并发可靠更新；没有统一元数据治理，最终迅速退化为无人敢用的**“数据沼泽 (Data Swamp)”**。
3. **第三代：湖仓一体 (Lakehouse，如 Apache Iceberg, Delta Lake, Snowflake, Databricks)**：
   - **集二者之大成**：底层基于极低成本的对象存储 (S3/GCS/MinIO)，中间引入基于 Parquet 的开源开放表格式（**Apache Iceberg** 或 **Delta Lake**）赋予其 ACID 事务、时间旅行 (Time Travel) 与模式演进 (Schema Evolution)，顶层提供高性能 SQL 引擎。

### 二、现代数据栈 (Modern Data Stack, MDS) 标准版图
在湖仓一体的底层基座之上，现代数据栈形成了清晰的模块化分工：
1. **摄取层 (Ingestion)**：Fivetran, Airbyte, Debezium (CDC)；
2. **存储与计算层 (Storage & Compute)**：Snowflake, Databricks, BigQuery, ClickHouse, DuckDB；
3. **转换与建模层 (Transformation - MDS 绝对心脏)**：**dbt (data build tool)**；
4. **调度与编排层 (Orchestration)**：**Apache Airflow**, Dagster, Prefect；
5. **观测与测试层 (Observability & Governance)**：Elementary, Monte Carlo, Soda；
6. **消费与 BI 层 (Consumption)**：Metabase, Superset, Tableau, Lightdash, Hex。""",
            difficulty=2,
            tips=[
                tip("dbt 在现代数据栈中的定位", "无论底层用的是 Snowflake、BigQuery、Redshift、Databricks 还是本地 DuckDB，转换层的语言和工具全行业高度统一为 dbt！掌握 dbt 即掌握了现代数据栈的通用操作系统。")
            ]
        ),
        lesson(
            "dbt-l1-5",
            "为什么传统手写 SQL 脚本在企业级数仓中必死无疑？",
            """### 一、传统手写 SQL 脚本的“七宗罪”
在没有引入 dbt 之前，很多公司的数仓是通过写一堆 `.sql` 文件并挂在 Crontab 上运行的。这会导致灾难性的混乱：
1. **硬编码表名与环境死锁**：
   - SQL 中充斥着 `INSERT INTO prod_analytics.dws_order SELECT ... FROM prod_raw.orders;`
   - 开发人员想在测试环境调试，只能小心翼翼地把表名前缀手动替换成 `dev_`，稍不留神在测试时直接误删生产库真数据！
2. **依赖关系纯属玄学**：
   - 如果表 C 依赖表 B，表 B 依赖表 A。在传统 Crontab 中，工程师只能靠“拍脑袋猜时间”：
     - 表 A 调度设在凌晨 01:00，表 B 设在 01:30，表 C 设在 02:00；
     - 一旦某天表 A 发生数据膨胀跑了 40 分钟，表 B 会在表 A 还没跑完时强行启动读取半截脏数据，引发全公司报表数据全面失真！
3. **样板代码 (Boilerplate) 铺天盖地**：
   - 每次建表必须手写数十行冗长的 `CREATE TABLE IF NOT EXISTS ... DROP TABLE ...`，分析师的精力全浪费在写 DDL 语法上；
4. **零测试、零断言**：
   - 主键是否唯一？金额是否为负数？外键是否关联失效？完全没有自动化测试，全靠业务方在看板发现数据翻车后打电话质问；
5. **文档与代码脱节**：
   - 字段含义写在早已落满灰尘的 Excel 字典里，代码改了三次，文档一次没更，新人入职甚至不知道某个状态字段 `status=9` 代表什么意思；
6. **无版本控制与团队协作冲突**：
   - SQL 脚本散落在各种调度后台的文本框里，没有 Git 记录，没有 Code Review，不知道是谁在什么时候改掉了核心营收口径。

### 二、dbt 的救赎之道
dbt 将**现代软件工程的一切武器**原原本本赋予了数据转换：
- 把建表和删表的脏活累活交给 dbt 物化引擎，分析师**只需编写纯粹的 SELECT 查询**；
- 用 `{{ ref('upstream_model') }}` 替代硬编码表名，**自动推导完美的依赖图谱 DAG**；
- 环境自动隔离：本地开发自动写 `dev_user`，生产环境自动写 `prod`，无缝平滑切换；
- 代码即文档、模型即测试：数据质量断言直接内嵌在 YAML 中，作为持续集成 CI 门禁！""",
            difficulty=1,
            tips=[
                tip("软件工程的核心教条", "Treat your data like software（像对待生产级软件代码一样对待你的数据管道）。这也是分析工程区别于传统报表取数的根本分水岭。")
            ]
        ),
        lesson(
            "dbt-l1-6",
            "分析工程的软件工程化原则：版本控制、测试驱动与 CI/CD",
            """### 一、分析工程四大核心支柱
dbt 能够彻底颠覆数据行业，靠的不是某种晦涩的新算法，而是将成熟的软件工程纪律移植到数据世界：
1. **版本控制与 Pull Request 代码评审 (Git-based Workflow)**：
   - 所有 SQL 模型、宏、测试配置文件均作为代码保存在 Git 仓库（GitHub / GitLab）；
   - 严禁任何人直接在生产数仓里“热修改”表结构；必须在独立分支开发，通过 PR (Pull Request) 经资深工程师审查后方可合并主分支。
2. **测试驱动的数据可靠性 (Test-Driven Quality)**：
   - 任何新增模型必须同时配套编写数据质量断言（主键不重复、外键关系完整、字段值在有效枚举范围内）；
   - 在测试未全部绿灯通过前，禁止该模型数据暴露给任何下游看板与用户。
3. **持续集成与精简编译 (CI/CD & Slim CI)**：
   - 当开发者提交代码 PR 时，CI 自动化系统（如 GitHub Actions）自动启动临时沙箱环境；
   - 仅对被修改的模型及其受影响的下游依赖执行编译与单元测试 (`dbt build --select state:modified+`)，测试通过方允许合并。
4. **自描述文档与血缘图谱 (Living Documentation & Lineage)**：
   - 字段描述与业务注释直接定义在模型同级的 `.yml` 文件中；
   - 通过 `dbt docs generate` 一键自动生成漂亮的静态网页与可交互式端到端血缘依赖图 (Data Lineage Graph)。

### 二、现代数据开发闭环流程
```
[提出业务指标需求] 
       ↓
[拉取 git checkout -b feature/user-metrics] 
       ↓
[在本地 dev 环境编写 dbt SQL 与 YAML 测试] 
       ↓
[本地运行 dbt build 验证模型与测试通过] 
       ↓
[提交 Git PR 触发自动化 CI Slim 测试] 
       ↓
[同行 Code Review 审核逻辑并合并入 main] 
       ↓
[生产环境调度器 (Airflow) 自动编译生效]
```""",
            difficulty=2,
            tips=[
                tip("Code Review 关注点", "在数据 PR 评审中，重点审查：① 字段命名是否符合团队统一规范；② 是否有笛卡尔积或性能极差的深层关联；③ 是否为新增主键和外键添加了 not_null 和 unique 测试。")
            ]
        ),
        lesson(
            "dbt-l1-7",
            "算例拆解与现代数据栈选型自查清单",
            """### 一、经典选型对比实战场景拆解
**【场景】**：某跨国跨境电商公司，日均新增订单 1000 万行，历史订单已积累 20 亿行。
原有架构采用单台 MySQL 只读从库 + Crontab 跑 Python 脚本计算每日活跃与 GMV，频繁发生数据库 I/O 堵死、凌晨跑批长达 9 小时无法按时产出报表、退货口径混乱等重大生产事故。

**【现代数据工程重构方案拆解】**：
1. **业务库解耦与数据抽取**：
   - 废除 Python 脚本直接对生产 MySQL 执行大范围全表扫描；
   - 采用 CDC (Change Data Capture) 增量日志抓取工具（如 Airbyte / Debezium），无感、低延迟地将订单变更流水复制到云数仓的 `raw_ecommerce.orders` 原始表；
2. **计算底座升级**：
   - 引入列式分析引擎（Snowflake 或 ClickHouse），利用其强大的列式压缩与并行聚合能力，将 20 亿行的全表分组聚合从 9 小时缩短至 15 秒！
3. **dbt 规范分层重构**：
   - `stg_orders.sql`：轻量重命名、时间戳时区转换；
   - `int_order_payments_joined.sql`：订单与支付流多表打宽；
   - `fct_orders.sql`（采用增量物化 `incremental`）：每天只扫描处理近 3 天新增与变更订单，计算开销暴降 95%；
4. **数据质量守门人**：
   - 在 `schema.yml` 中为 `order_id` 施加 `unique` 与 `not_null` 测试；为 `order_status` 施加枚举值检查；
5. **最终业务成果**：
   - 晨间报表产出时间由上午 09:30 提前至凌晨 01:10，数据质量事故归零，业务看板口径完全统一。

---
### 二、现代数据栈工程化落地自查清单
1. [ ] **架构范式**：团队是否已彻底将复杂转换从中间脚本迁移至数仓内部 (ELT)？
2. [ ] **环境隔离**：开发人员本地是否拥有完全隔离的 dev schema，杜绝向生产表硬编码写入？
3. [ ] **代码规范**：所有数据转换是否以纯 SELECT 形式存在于 Git 仓库中？
4. [ ] **质量门禁**：所有核心模型的主键是否全部配置了唯一性与非空自动化测试？""",
            difficulty=2,
            tips=[
                tip("自查建议", "进入下一章前，请务必建立起'数据即代码、数仓做计算、dbt管转换'的核心思维模型。")
            ]
        )
    ]

    c1_exercises = [
        single_choice(
            "dbt-c1-e1",
            "在现代数据栈 (Modern Data Stack, MDS) 架构中，数据处理范式从传统的 ETL 转向了现代的 ELT。这种范式转变的底层技术驱动力主要是：",
            [
                {"label": "云原生分布式/列式数据仓库（如 Snowflake、BigQuery、ClickHouse、DuckDB）的兴起，使存储成本大幅下降且数仓自身具备强大的大规模并行计算算力", "value": "A"},
                {"label": "业务端不再需要进行任何数据清洗与类型转换", "value": "B"},
                {"label": "Python 编程语言被国际标准化组织强制淘汰", "value": "C"},
                {"label": "关系型数据库的单行写入性能超越了硬件物理极限", "value": "D"},
            ],
            "A",
            "ELT 能够取代传统 ETL，核心在于云列存数仓算力澎湃且存储低廉。数据可以原样全量进数仓后，直接利用数仓自身算力做高并发 SQL 转换，极大提升了敏捷性并彻底保留了原始数据。",
            difficulty=1,
            related_lesson_id="dbt-l1-1",
            tags=["ELT范式", "现代数据栈", "MDS概念"],
        ),
        single_choice(
            "dbt-c1-e2",
            "关于分析工程师 (Analytics Engineer, AE) 在现代数据组织中的定位与职责，下列描述最为准确的是：",
            [
                {"label": "处于数据工程师与数据分析师之间，运用软件工程规范（Git、模块化、测试、CI/CD）在数仓内部构建高质量、自测试、可复用数据模型的专业技术角色", "value": "A"},
                {"label": "专门负责在机房布线、组装服务器机架并管理物理路由器的硬件工程师", "value": "B"},
                {"label": "只负责在 Excel 中手动录入数据并制作折线图的业务实习生", "value": "C"},
                {"label": "主要负责维护 Kafka 底层 C++ 内核源码与分布式文件系统的底层网络研发", "value": "D"},
            ],
            "A",
            "分析工程师填补了“懂业务不懂工程”与“懂底层基建不懂商业逻辑”之间的鸿沟，其核心使命是用软件工程方法论打造稳固可靠的数据模型底座。",
            difficulty=1,
            related_lesson_id="dbt-l1-2",
            tags=["分析工程师", "角色定位", "AE定义"],
        ),
        single_choice(
            "dbt-c1-e3",
            "在大型数据仓库中执行类似于 `SELECT category, SUM(amount) FROM orders GROUP BY category;` 的聚合报表查询时，列式存储 (Column-oriented) 相比行式存储 (Row-oriented) 能够带来数十倍甚至上百倍性能飞跃的物理根本原因在于：",
            [
                {"label": "列存只从磁盘读取查询中真正涉及的 category 与 amount 两个列数据块，彻底避免了读取未引用字段产生的巨额无效磁盘 I/O", "value": "A"},
                {"label": "列式存储可以彻底绕过计算机的 CPU 与内存直接输出结果", "value": "B"},
                {"label": "列式存储使得所有数学加法运算在光纤传输过程中自动完成", "value": "C"},
                {"label": "行式存储无法存储金额超过 1000 元的订单数据", "value": "D"},
            ],
            "A",
            "列存将同列数据连续存放，分析查询只需载入相关列，无用的几十甚至上百个字段完全不发生磁盘 I/O 读取；同时同类型数据压缩比极高，极大节省带宽和算力。",
            difficulty=2,
            related_lesson_id="dbt-l1-3",
            tags=["列式存储", "OLAP原理", "IO优化"],
        ),
        single_choice(
            "dbt-c1-e4",
            "数据湖 (Data Lake) 在早期企业建设中常常退化为‘数据沼泽 (Data Swamp)’，而现代‘湖仓一体 (Lakehouse)’架构能够成功解决这一难题的核心技术依托是：",
            [
                {"label": "在廉价对象存储之上引入了如 Apache Iceberg、Delta Lake 等现代开源表格式，赋予其 ACID 事务、版本控制、模式演进与元数据管理能力", "value": "A"},
                {"label": "强制禁止业务方将任何日志文件写入存储系统", "value": "B"},
                {"label": "将全部历史数据强制转换为无法修改的单张 CSV 文件", "value": "C"},
                {"label": "彻底放弃 SQL 查询语言，改用汇编语言直接操作磁盘扇区", "value": "D"},
            ],
            "A",
            "湖仓一体（如 Iceberg, Delta Lake）在对象存储和计算引擎之间搭建了强大的元数据与事务管理层，具备了数仓的 ACID、模式管理能力与数据湖的低成本弹性扩展优势。",
            difficulty=2,
            related_lesson_id="dbt-l1-4",
            tags=["湖仓一体", "Lakehouse", "Iceberg"],
        ),
        single_choice(
            "dbt-c1-e5",
            "在没有引入 dbt 的传统数仓开发中，工程师常常采用在脚本中硬编码表名（如 `INSERT INTO prod_dw.fct_sales SELECT ...`）并在 Crontab 中定时触发的做法。这种做法最容易引发的致命缺陷是：",
            [
                {"label": "无法进行安全的本地开发与环境隔离（极易误操作破坏生产数据），且上游任务一旦延迟将导致下游读取半截脏数据产生静默严重失真", "value": "A"},
                {"label": "会导致服务器电源短路并损坏硬件主板", "value": "B"},
                {"label": "使 SQL 脚本的代码行数强制增加十倍", "value": "C"},
                {"label": "使得数据库无法执行大于 100 行的查询", "value": "D"},
            ],
            "A",
            "硬编码表名使得开发环境与生产环境无法无缝隔离，而基于定时猜时间的调度缺乏真实的依赖感知 (DAG)，上游延迟必然导致下游报表全面跑飞算错。",
            difficulty=1,
            related_lesson_id="dbt-l1-5",
            tags=["传统数仓弊端", "硬编码风险", "环境隔离"],
        ),
        single_choice(
            "dbt-c1-e6",
            "在现代分析工程实践中，CI/CD 流水线常常引入‘精简编译测试 (Slim CI)’。Slim CI 的核心运行逻辑与价值是：",
            [
                {"label": "利用 Git 状态对比，只针对在当前 PR 分支中被新增/修改的模型及其受影响的直接下游模型进行编译和测试 (`state:modified+`)，大幅缩减 CI 耗时与云数仓算力开销", "value": "A"},
                {"label": "每次提交代码时强制将全公司所有的数仓模型无论是否修改全量重跑一遍", "value": "B"},
                {"label": "自动删除所有未通过测试的模型以加快构建速度", "value": "C"},
                {"label": "将所有模型的 SQL 自动压缩并删除换行符", "value": "D"},
            ],
            "A",
            "Slim CI 借助元数据状态比较，只编译测试被修改的模型及受影响下游，避免全量重建数万张模型，将 PR 验证时间从数小时缩减至几分钟，大幅节约计算账单。",
            difficulty=2,
            related_lesson_id="dbt-l1-6",
            tags=["SlimCI", "持续集成", "精简测试"],
        ),
        multiple_choice(
            "dbt-c1-e7",
            "在现代数据栈 (Modern Data Stack) 体系中，dbt (data build tool) 专注于解决数据管道中的哪些核心痛点？（多选）",
            [
                {"label": "通过 `{{ ref() }}` 解耦硬编码表名，自动推导构建完整的依赖拓扑 DAG", "value": "A"},
                {"label": "将建表、删表、增量合并等冗长 DDL/DML 抽象为声明式物化策略 (view/table/incremental)", "value": "B"},
                {"label": "在 YAML 中提供开箱即用的自动化数据质量断言（如主键唯一性、外键完整性校验）", "value": "C"},
                {"label": "从模型 SQL 及其元数据注释一键自动生成交互式文档与数据血缘图谱", "value": "D"},
                {"label": "直接替代物理机房管理交换机与机柜供电散热系统", "value": "E"},
            ],
            ["A", "B", "C", "D"],
            "dbt 的核心价值就在于：DAG依赖推导、声明式物化、自动化质量测试与自描述文档/血缘图谱。E 属于底层物理机房运维，与 dbt 无关。",
            difficulty=2,
            related_lesson_id="dbt-l1-5",
            tags=["dbt核心功能", "MDS核心", "分析工程优势"],
        ),
        multiple_choice(
            "dbt-c1-e8",
            "下列关于 OLTP 关系型事务数据库与 OLAP 列式分析型数据仓库的对比中，正确的有：（多选）",
            [
                {"label": "OLTP 侧重高并发小事务（单行插入、点查更新），强调强 ACID 事务保障", "value": "A"},
                {"label": "OLAP 侧重大范围批量读取与多行聚合统计，通常采用列式存储与高效向量化计算", "value": "B"},
                {"label": "列式存储对于同类型数据列（如全整型或时间列）具有极高的物理压缩比，显著降低磁盘 I/O", "value": "C"},
                {"label": "OLTP 适合直接用于数亿级历史数据跨年趋势多维钻取聚合分析", "value": "D"},
                {"label": "现代分析架构提倡将数据从 OLTP 库抽取复制到 OLAP 数仓中进行深度分析，避免争抢生产业务资源", "value": "E"},
            ],
            ["A", "B", "C", "E"],
            "OLTP 不适合做跨年数亿级复杂多维钻取分析（极易锁表或打满磁盘 I/O 导致生产瘫痪，D 错误）；其余 A、B、C、E 均是 OLTP 与 OLAP 的经典准确对比。",
            difficulty=2,
            related_lesson_id="dbt-l1-3",
            tags=["OLTPvsOLAP", "数仓设计", "多选对比"],
        ),
        judge(
            "dbt-c1-e9",
            "在现代分析工程 ELT 架构中，dbt 本身并不存储任何业务数据，也不拥有独立的数据计算引擎；它充当一个精密的编译和编排编译器，将编写的 SQL 和 Jinja 模板编译为原生数仓 SQL，并指挥目标数据仓库（如 Snowflake、DuckDB）利用数仓自身算力执行计算。",
            "正确",
            "正确。dbt 的口号是“dbt does the T in ELT”。它是一个控制平面编译器，纯粹负责在数仓内部下达 SQL 任务指令，所有数据依然安全存放在企业自己的数仓中。",
            difficulty=1,
            related_lesson_id="dbt-l1-1",
            tags=["dbt工作机制", "算力推下", "In-warehouse"],
        ),
        judge(
            "dbt-c1-e10",
            "分析工程要求数据团队遵循软件工程的最佳实践，因此在开发新模型或修改指标口径时，分析师应当直接登录生产环境数据仓库，使用管理员账号在生产 Schema 下直接执行 `CREATE OR REPLACE TABLE` 进行热修改，以保证最高开发效率。",
            "错误",
            "错误！直接在生产数仓热修改是极其危险的反模式！分析工程要求通过 Git 分支开发、在个人独立 dev 环境调试、通过自动化 CI 测试并经 Code Review 审查后，由生产调度系统统一部署上线。",
            difficulty=1,
            related_lesson_id="dbt-l1-6",
            tags=["软件工程纪律", "生产隔离", "Git流程"],
        ),
        fill(
            "dbt-c1-e11",
            "现代数据栈倡导的从源头到分析的数据流动范式英文缩写为 [blank1]（请填入三个大写字母，代表抽取、加载、转换）；而在该体系中扮演数据建模与转换核心中枢的开源工具名称为 [blank2]。",
            [["ELT"], ["dbt"]],
            "现代数据栈核心范式为 ELT (Extract - Load - Transform)，其中转换层的事实标准工具为 dbt (data build tool)。",
            difficulty=1,
            related_lesson_id="dbt-l1-1",
            tags=["ELT", "dbt", "填空题"],
        ),
        fill(
            "dbt-c1-e12",
            "在关系型数据存储中，MySQL 默认采用的存储组织方式是 [blank1] 式存储（更适合高并发事务 CRUD）；而 Snowflake、ClickHouse、DuckDB 等专为大数据分析设计的现代数仓主要采用 [blank2] 式存储（更适合批量聚集计算）。",
            [["行", "行式"], ["列", "列式"]],
            "MySQL 采用行式存储 (Row-oriented)；现代 OLAP 数仓采用列式存储 (Column-oriented)。",
            difficulty=1,
            related_lesson_id="dbt-l1-3",
            tags=["行存列存", "数仓基础", "填空题"],
        ),
        open_ex(
            "dbt-c1-e13",
            "【分析工程架构演进综合案例题】传统 ETL 故障复盘与现代数据栈 (MDS) 重构方案设计",
            """你作为新入职某独角兽电商企业的 Lead Analytics Engineer（首席分析工程师），面对如下严重的数仓技术债务危机：
公司现有架构：
- 生产库是 5 台 MySQL 实例，每晚凌晨 1 点，运维通过 Linux Crontab 定时触发一组 Python 脚本；
- 脚本中直接硬编码 SQL：`SELECT * FROM prod_mysql.orders WHERE date = yesterday`，并在单台 16GB 内存的 ETL 虚机中进行多表 Python 内存拼接清洗；
- 处理完成后，脚本通过 `INSERT INTO dw_bi.daily_kpi` 写入目标分析库。

**【近期发生的重大故障】**：
1. 故障 A：因双十一大促订单暴增，Python 脚本在内存中拼接关联时发生 `OOM (Out of Memory)` 崩溃，导致 CEO 在早上 9 点管理层会议上看到的大屏看板全为空白；
2. 故障 B：上游业务开发人员在 MySQL 订单表中新增了一个 `cancelled_reason` 字段并修改了支付状态码定义（将原先已取消状态从 `9` 改为了 `'CANCEL'`），导致旧 Python 脚本直接静默算错，连续两周将取消订单误计入全公司实收 GMV，引发严重的虚假繁荣决策误导；
3. 故障 C：多位数据分析师各自在自己的个人文件夹写定时脚本统计指标，导致同一天“全公司 GMV”在财务总监、运营总监和市场总监三个部门的报表呈现出完全不同的三个冲突数字。

**【任务要求】**：
(1) 结合课程所学，逐一深入剖析上述故障 A、B、C 产生的底层架构根源；
(2) 请运用**现代数据栈 (MDS) 与 dbt 分析工程方法论**，为该公司重新设计一套高可靠、可测试、口径统一的重构架构方案（画出数据流走向并说明各层核心组件选型）；
(3) 针对故障 B 中上游字段及枚举值非法变更的隐患，详细说明分析工程师如何在 dbt 中设计“数据质量防线”与“模型契约”实现自动化提前预警熔断？""",
            """【标准分析与重构设计方案】

(1) 传统架构三大故障底层根源剖析：
1. **故障 A (OOM 崩溃) 的根源**：
   - 违背了现代 ELT 架构原则，将高吞吐的数据计算硬塞在中间单机转换服务器 (16G 虚机) 的内存中；面对海量峰值大促，单机内存无法横向扩展，计算成为致命单点故障 (SPOF)。
2. **故障 B (状态码变更导致静默算错两周) 的根源**：
   - 缺乏现代数据测试驱动 (Data Testing) 与模型契约 (Contracts) 机制；
   - 传统脚本中对状态枚举值采用硬编码，上游模式 (Schema) 变更缺乏版本发布协商与自动化断言验证，故障发生时没有任何错误报警，导致脏数据静默流向下游看板长达两周。
3. **故障 C (口径三家打架) 的根源**：
   - 缺乏统一的数仓建模分层与“唯一事实源 (Single Source of Truth)”管理；
   - 分析师各自为政、编写未受版本控制的私有脚本，核心商业逻辑（如 GMV 剔除哪些状态、是否含税、退款如何冲抵）被重复且不一致地实现。

(2) 现代数据栈 (MDS) 重构架构方案设计：
1. **数据流动与组件选型全景图**：
   `[生产 MySQL 业务库集群]`
             │  (通过 CDC 增量日志无损实时抽取，如 Airbyte / Debezium)
             ▼
   `[现代分布式云/列式数仓 Raw/Staging 原始层 (Snowflake / BigQuery / DuckDB)]`
             │  (保留全量原始历史副本，原汁原味)
             ▼
   `[dbt 转换中枢：标准化分层建模 (In-warehouse Compute)]`
      ├── Staging 模块 (`stg_orders`): 清洗重命名、类型强转、状态码标准映射
      ├── Intermediate 模块 (`int_order_payments`): 跨源关联打宽
      └── Marts 业务集市模块 (`fct_orders`, `dim_customers`): 面向业务统一建模
             │
             ▼
   `[统一指标语义层 / BI 消费端 (Metabase / Superset / Tableau)]`
2. **协同保障**：
   - 编排调度采用 **Apache Airflow** 替代混乱的 Linux Crontab；
   - 代码全面纳入 **Git 版本控制**，实施严格的 PR 评审与 Slim CI 自动化测试集成。

(3) 应对上游非法变更的 dbt 数据防线与契约设计：
1. **施加通用与枚举测试 (Generic & Accepted Values Test)**：
   在 `stg_orders.yml` 中对订单状态字段配置断言：
   ```yaml
   models:
     - name: stg_orders
       columns:
         - name: order_id
           tests: [unique, not_null]
         - name: status
           tests:
             - accepted_values:
                 values: ['placed', 'shipped', 'completed', 'return_pending', 'cancelled']
                 quote: true
   ```
   一旦上游再次随意变更状态码（或新增未定义的值），dbt 测试将当场亮红灯报错 (`FAIL`)；
2. **配置运行失败熔断机制**：
   在 Airflow 或 CI 中将测试结果与下游任务强绑定；一旦测试失败，立即中断下游 Marts 模型的刷新，阻断脏数据生成；
3. **启用模型契约 (Model Contracts)**：
   在关键入口模型启用 `contract: {enforced: true}`，严格校验每个列的数据类型，当上游擅自变更字段类型时数仓直接拒绝写入，并在企微/Slack 自动向数据与业务团队发出告警！""",
            [
                {"point": "深入剖析故障 A (算力单机错配与OOM)、B (缺乏质量测试契约与静默污染)、C (口径不一缺少单一事实源) 的底层根源", "score": 2},
                {"point": "设计规范的现代 ELT 架构方案，涵盖 CDC 抽取、列存数仓底层、dbt 分层建模及 BI 消费的清晰链路", "score": 1},
                {"point": "精准运用 dbt accepted_values 枚举测试、unique/not_null 测试对状态码与主键构建质量防线", "score": 1},
                {"point": "阐述模型契约 (Model Contracts) 与测试失败自动拦截熔断机制，杜绝脏数据污染看板", "score": 1},
            ],
            exemplar="""【现代数据架构重构立项白皮书】
一、现状痛点诊断：
- 故障 A：中间 Python 虚机单机算力瓶颈，在大促峰值发生 OOM，违背 ELT 计算推下数仓原则。
- 故障 B：没有数据测试与模式契约，上游状态码私自变更造成长达两周的静默指标污染。
- 故障 C：各自手写私有脚本，缺乏唯一事实源 (Single Source of Truth) 与 Git 版本控制审查。

二、MDS 架构重构蓝图：
1. 抽取与加载：采用 Airbyte/CDC 将 MySQL 增量日志无损复制到 Snowflake/DuckDB 原始层。
2. 转换层 (dbt)：
   - Staging 层：对订单做统一类型转换与状态标准化映射。
   - Marts 层：构建标准 fct_orders 事实表，统一全公司 GMV 口径。
3. 调度与版本控制：Airflow 编排调度，GitHub 托管并集成 Slim CI。

三、质量熔断与契约防御：
在 stg_orders.yml 中为 status 字段配置 accepted_values 测试，为 order_id 配置 unique 与 not_null 测试，并开启 Model Contracts 强约束。CI 流水线中只要出现未定义的状态码，立即触发测试 Fail 并阻断下游生成，同步向飞书/Slack 推送警报，从根源消除脏数据隐患。""",
            difficulty=5,
            related_lesson_id="dbt-l1-7",
            tags=["架构设计", "MDS大作业", "故障复盘", "数据质量防线"],
        ),
    ]

    ch1 = chapter(
        "dbt-c1",
        "dbt-analytics-engineering",
        1,
        "现代数据栈 (MDS) 与分析工程导论",
        "掌握现代数据工程范式大迁移：从传统 ETL 到现代 ELT、分析工程师 (Analytics Engineer) 角色崛起、OLTP 行存与 OLAP 列存数仓底层物理差异、湖仓一体架构全景以及版本控制与测试驱动的软件工程化原则。",
        c1_lessons,
        c1_exercises,
    )
    return ch1

if __name__ == "__main__":
    ch = get_chapter_1()
    print(f"Chapter 1 validated: {len(ch['lessons'])} lessons, {len(ch['exercises'])} exercises.")
