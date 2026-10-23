# -*- coding: utf-8 -*-
"""
Visual and Interactive Diagrams for dbt Analytics Engineering (70 lessons).
"""

DBT_DIAGRAMS = {
    # ── Chapter 1: MDS 与分析工程全景 ──
    "dbt-l1-1": """### 核心架构图解：现代数据栈 ELT 范式演进
<Diagram type="mds-arch" />

```
[传统 ETL: 算力集中于昂贵的独立中间服务器]
业务源库 (OLTP) ────> [中间 ETL 服务器: 昂贵/慢/清洗丢字段] ────> 传统目标数仓 (只存汇总结果)

[现代 ELT: 原始数据完整落地，依托数仓内 MPP 算力转换]
业务源库 (OLTP) ──(Airbyte/Fivetran)──> 原始层 (Raw Staging) ──[dbt 内部转换]──> 分析集市 (Marts) ──> BI / 语义层
                                    └────────────── 云数仓 (Snowflake/DuckDB) ──────────────┘
```""",

    "dbt-l1-2": """### 核心职责图解：现代数据团队角色与协作边界
```
┌─────────────────────────────────┐
│ 数据工程师 (Data Engineer)      │ 负责底座基础设施：
│ 重点技能: Python / Spark / K8s  │ • 数据源抽取 (CDC / API) 与数据湖存储
└────────────────┬────────────────┘ • 基础设施稳定性、计算资源调度与高吞吐
                 │ 交付原始表 (Raw Data)
                 ▼
┌─────────────────────────────────┐
│ 分析工程师 (Analytics Engineer) │ 负责核心数仓建模与质量治理：
│ 重点技能: dbt / SQL / Git / 建模 │ • Kimball 维度建模、星型模型与指标定义
└────────────────┬────────────────┘ • 编写自动化数据测试、CI/CD 部署与文档
                 │ 交付可信集市 (Marts / Metrics)
                 ▼
┌─────────────────────────────────┐
│ 数据分析师 (Data Analyst / BI)  │ 负责商业洞察与价值变现：
│ 重点技能: 业务逻辑 / 可视化 / A/B │ • 业务看板搭建 (Metabase / PowerBI)
└─────────────────────────────────┘ • 深度归因分析、A/B 实验评估与经营决策
```""",

    "dbt-l1-3": """### 原理图解：dbt 声明式建模生命周期
```
开发人员只需编写干净的 SELECT 查询
        │
        ▼
   [ dbt compile ] ──> Jinja 引擎自动展开宏与 ref() 引用依赖
        │
        ▼
   [ dbt run ]     ──> 自动包装平台专有 DDL/DML：
                       CREATE VIEW AS SELECT ... (视图物化)
                       CREATE TABLE AS SELECT ... (表物化)
                       MERGE INTO target USING ... (增量物化)
        │
        ▼
目标数据库执行完成，状态写入 manifest.json 与 run_results.json
```""",

    "dbt-l1-4": """### 全景生态图解：现代数据栈 (MDS) 五层架构
```
┌────────────────────────────────────────────────────────┐
│ 1. 摄取层 (Ingestion): Fivetran / Airbyte / Debezium    │
└───────────────────────────┬────────────────────────────┘
                            │ Raw 表写入
                            ▼
┌────────────────────────────────────────────────────────┐
│ 2. 存储与计算底座: Snowflake / BigQuery / DuckDB / S3    │
└───────────────────────────┬────────────────────────────┘
                            │ 算力就地计算
                            ▼
┌────────────────────────────────────────────────────────┐
│ 3. 转换与建模核心 (Transformation): dbt (SQL + Jinja)    │
│    • 模型依赖解析 (DAG) • 自动化数据测试 • 数据契约与文档│
└───────────────────────────┬────────────────────────────┘
                            │ 产出可信 Marts
                            ▼
┌────────────────────────────────────────────────────────┐
│ 4. 语义与编排层: MetricFlow 语义层 + Apache Airflow 调度│
└───────────────────────────┬────────────────────────────┘
                            │ 指标分发 / 业务闭环
                            ▼
┌────────────────────────────────────────────────────────┐
│ 5. 消费与激活层: BI 看板 (Metabase) + 反向 ETL (Hightouch)│
└────────────────────────────────────────────────────────┘
```""",

    "dbt-l1-5": """### 架构对比图解：dbt Core (CLI) vs dbt Cloud
```
┌───────────────────────────────┐         ┌───────────────────────────────┐
│     dbt Core (开源命令行)     │         │       dbt Cloud (托管 SaaS)   │
├───────────────────────────────┤         ├───────────────────────────────┤
│ • 纯 CLI 终端运行 (dbt run)   │         │ • Web 浏览器集成开发环境 (IDE) │
│ • 需自建 CI/CD (GitHub Actions)│         │ • 开箱即用 Slim CI 与自动部署 │
│ • 调度需配合 Airflow / Cron    │         │ • 内置任务调度器与 Webhook 告警│
│ • 完全免费、私有化部署无合规风险│         │ • 按席位收费、免运维成本      │
└───────────────────────────────┘         └───────────────────────────────┘
```""",

    "dbt-l1-6": """### 安全隔离图解：profiles.yml 凭据与环境隔离
```
~/.dbt/profiles.yml (绝对禁止提交到 Git 仓库)
        │
        ├── target: dev (本地分析师开发环境)
        │     ├── database: analytics_dev
        │     └── schema: dbt_alice  <── 每个人独立专属 Schema，互不冲突
        │
        └── target: prod (生产 CI/CD 流水线环境)
              ├── database: analytics_prod
              └── schema: analytics  <── 生产真实可信集市，需严格权限控制
```""",

    "dbt-l1-7": """### 命令执行时序图：dbt 命令族与构建流水线
```
           ┌─────────────┐
           │ dbt compile │ 仅语法与 Jinja 宏编译，输出 target/compiled 目录
           └──────┬──────┘
                  ▼
           ┌─────────────┐
           │   dbt run   │ 在数仓执行 DDL/DML，物化视图与表 (不跑测试)
           └──────┬──────┘
                  ▼
           ┌─────────────┐
           │  dbt test   │ 校验数据约束 (unique, not_null...)，查到脏数据则报警
           └──────┬──────┘
                  ▼
           ┌─────────────┐
           │  dbt build  │ 现代最佳实践：按 DAG 拓扑交替执行 Run + Test，
           └─────────────┘ 测试失败立即熔断，阻止脏数据扩散至下游模型！
```""",

    # ── Chapter 2: Kimball 维度建模理论与三层数仓分层实战 ──
    "dbt-l2-1": """### 核心架构图解：Kimball 星型模型 (Star Schema)
<Diagram type="kimball-star" />

```
               ┌───────────────────────┐
               │    dim_customers      │
               │ PK: customer_id       │
               │ name, email, tier     │
               └───────────┬───────────┘
                           │ 1:N
                           ▼
┌──────────────────┐  N:1 ┌───────────────────────┐ 1:N  ┌───────────────────────┐
│     dim_date     │ <─── │      fct_orders       │ ───> │     dim_products      │
│ PK: date_key     │      │ PK: order_id          │      │ PK: product_id        │
│ year, quarter    │      │ FK: customer_id       │      │ name, category, price │
└──────────────────┘      │ FK: date_key          │      └───────────────────────┘
                          │ FK: product_id        │
                          │ 度量: amount, quantity│
                          └───────────────────────┘
```""",

    "dbt-l2-2": """### 事实表分类图解：三大事实表对比与应用场景
```
┌─────────────────────────┬────────────────────────────────────────────────────────┐
│ 事实表类型              │ 核心特征与业务场景                                     │
├─────────────────────────┼────────────────────────────────────────────────────────┤
│ 1. 事务事实表           │ 粒度最细，一条记录对应一次瞬间业务事件（如一笔订单、   │
│    (Transaction Fact)   │ 一次扫码支付）。产生后不可更改，数据量最大。           │
├─────────────────────────┼────────────────────────────────────────────────────────┤
│ 2. 周期快照事实表       │ 固定周期（每日/每月）对业务状态拍一张“快照”（如每日账户│
│    (Periodic Snapshot)  │ 余额、每日库存余量）。用于观察趋势变化与时序波动。     │
├─────────────────────────┼────────────────────────────────────────────────────────┤
│ 3. 累积快照事实表       │ 针对具有明确生命周期的业务流（如订单履约：下单 ➔ 支付 ➔│
│    (Accumulating Fact)  │ 出库 ➔ 签收）。单行包含多个里程碑时间戳，随状态持续更新│
└─────────────────────────┴────────────────────────────────────────────────────────┘
```""",

    "dbt-l2-3": """### 维度表规范图解：代理键 (Surrogate Key) 与自然键解耦
```
业务源系统 (MySQL A/B)            数仓维度表 (dim_customers)
┌───────────────────────┐       ┌────────────────────────────────────────────────────────┐
│ 源系统自然键 (Natural)│ ────> │ 代理键 (Surrogate Key) = MD5(source_sys || natural_id) │
│ id: 1001 (易冲突/重用)│       │ 业务自然键 (Natural Key) = 1001                        │
└───────────────────────┘       │ 属性扁平化: customer_name, vip_level, is_active        │
                                └────────────────────────────────────────────────────────┘
                                 • 屏蔽源系统 ID 变更与合库合表主键冲突
                                 • 保持数仓维度关联键的稳定与高效整数/哈希索引
```""",

    "dbt-l2-4": """### 缓慢变化维决策图解：SCD Type 0 / 1 / 2 演化策略
```
                  业务源属性发生变更 (例如用户修改居住城市)
                                    │
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
     [ SCD Type 0 ]           [ SCD Type 1 ]           [ SCD Type 2 ]
   保留原始值，绝不更新     直接覆盖旧值，不留痕迹   追加新行，维护版本有效期
   适用：出生日期/注册时间   适用：纠正拼写错误       适用：业绩归属/历史地址变更
   历史价值：不可变事实     历史价值：无法历史回溯   历史价值：100% 完美历史回溯
```""",

    "dbt-l2-5": """### 粒度原则图解：事实表原子粒度与度量可加性
```
         原始最细粒度: 订单明细行 (One Row per Order Item)
         包含度量: item_quantity (可加), item_price (非可加)
                               │
               ┌───────────────┴───────────────┐
               ▼ (GROUP BY order_id)           ▼ (GROUP BY date, store)
         订单级事实表                     每日门店汇总事实表
         (One Row per Order)             (One Row per Store-Day)
         度量: order_total_amount        度量: daily_store_revenue
```""",

    "dbt-l2-6": """### 核心分层图解：Staging ➔ Intermediate ➔ Marts 三层架构
<Diagram type="dbt-layers" />

```
┌──────────────────────┐      1:1 映射/清洗/重命名      ┌──────────────────────┐
│  Raw Sources 原始表  │ ────────────────────────────> │  Staging (stg_*)     │ (物化: View)
│  (来自业务数据库)    │                               │  字段重命名、类型强转│
└──────────────────────┘                               └──────────┬───────────┘
                                                                  │ 跨表 JOIN / 窗口聚合
                                                                  ▼
┌──────────────────────┐      Kimball 维度建模          ┌──────────────────────┐
│  Marts 分析集市      │ <──────────────────────────── │ Intermediate (int_*) │ (物化: Ephemeral/View)
│  (dim_* / fct_*)     │   暴露给 BI 看板与业务方       │ 可复用业务中间积木   │
└──────────────────────┘                               └──────────────────────┘
```""",

    "dbt-l2-7": """### 工程组织图解：dbt 推荐目录结构与文件树
```
models/
├── staging/                     <── Staging 层：与源表 1:1，统一字段风格
│   ├── stripe/
│   │   ├── src_stripe.yml       <── 声明数据源与新鲜度
│   │   └── stg_stripe__payments.sql
│   └── jaffle_shop/
│       ├── src_jaffle_shop.yml
│       ├── stg_jaffle_shop__customers.sql
│       └── stg_jaffle_shop__orders.sql
├── intermediate/                <── Intermediate 层：内部复杂多表 JOIN 积木
│   └── finance/
│       └── int_orders_pivoted_to_payments.sql
└── marts/                       <── Marts 层：业务事实表与维度表，供 BI 查询
    ├── core/
    │   ├── dim_customers.sql
    │   └── fct_orders.sql
    └── marketing/
        └── dim_marketing_campaigns.sql
```""",

    # ── Chapter 3: dbt 核心开发与项目组织工程化规范 ──
    "dbt-l3-1": """### 架构图解：sources.yml 声明与源端解耦
```
外部物理表命名变更 (如 raw.payments ➔ raw.stripe_payments_v2)
                             │
                             ▼ 仅需修改配置文件，所有上百个模型代码完全免改！
           ┌───────────────────────────────────┐
           │ models/staging/stripe/src_pay.yml │
           │   name: stripe                    │
           │   tables:                         │
           │     - name: payments              │
           │       identifier: stripe_payments │
           └─────────────────┬─────────────────┘
                             │
                             ▼ 调用 {{ source('stripe', 'payments') }}
           ┌───────────────────────────────────┐
           │ models/staging/stg_payments.sql   │
           └───────────────────────────────────┘
```""",

    "dbt-l3-2": """### 监控时序图解：source freshness 新鲜度告警机制
```
当前系统时间: 2024-03-02 12:00:00
源表最新记录时间 (loaded_at_field): 2024-03-01 08:00:00 (数据延迟 28 小时)

    0h ──正常── 12h ──warn_after: 12h── 24h ──error_after: 24h──> 28h
                                                    ▲
                                                    │
                                     [dbt source freshness] 报告 ERROR!
                                     触发 CI 告警，阻止基于过期数据的报表计算
```""",

    "dbt-l3-3": """### DAG 依赖图解：ref() 引用与自动化有向无环图
```
models/staging/stg_orders.sql ────┐
                                  ├──> models/marts/fct_orders.sql
models/staging/stg_payments.sql ──┘               │
                                                  ▼
                                      models/marts/dim_customers.sql
• dbt 通过静态解析代码中的 {{ ref('stg_orders') }} 自动推断拓扑依赖顺序
• 支持高并发并行编译：无依赖的模型同时并发物化，极大缩短构建耗时
```""",

    "dbt-l3-4": """### 代码组织图解：dbt 黄金 CTE 模块化开发模式
```
┌────────────────────────────────────────────────────────┐
│ 1. 导入 CTE (Import CTEs): 集中调用 source / ref       │
│    WITH orders AS (SELECT * FROM {{ ref('stg_orders')}})│
├────────────────────────────────────────────────────────┤
│ 2. 逻辑/转换 CTE (Logical CTEs): 执行业务过滤与窗口计算 │
│    , customer_metrics AS (SELECT customer_id, SUM... ) │
├────────────────────────────────────────────────────────┤
│ 3. 最终组装 CTE (Final CTE): 多表 JOIN 与最终字段选择  │
│    , final AS (SELECT ... FROM orders JOIN ... )        │
├────────────────────────────────────────────────────────┤
│ 4. 纯净输出 (Final Select): SELECT * FROM final;       │
└────────────────────────────────────────────────────────┘
```""",

    "dbt-l3-5": """### 清洗规范图解：源端脏乱字段到统一 snake_case 标准化
```
原始源字段 (格式异构)                  dbt Staging 洗礼后规范字段
ID / CustomerId / Cust_Num   ───>   customer_id (统一命名)
status = '1' / '0' / 'Y'     ───>   is_active (转换为标准 boolean 布尔值)
order_date ('2024-01-01')    ───>   ordered_at (显式 CAST 为 timestamp 类型)
amount_cents (以分为单位)    ───>   amount_usd (显式除以 100 转换标准货币单位)
```""",

    "dbt-l3-6": """### 哈希主键图解：generate_surrogate_key 代理键生成
```
多列业务自然键 (可能含 NULL)
[ customer_id: 'C1001', store_id: 'S20', order_date: '2024-03-01' ]
                             │
                             ▼ 自动拼接、处理 NULL 为字符串标量
        _dbt_utils_surrogate_key_str: 'C1001-S20-2024-03-01'
                             │
                             ▼ 统一 MD5 哈希计算
        surrogate_key (32位固定长度十六进制): 'e4d909c290d0fb1ca068ffaddf22cbd0'
```""",

    "dbt-l3-7": """### 元数据流向图解：dbt docs 自动化文档与血缘图谱
```
代码与 YAML 注释 (models/*.sql + schema.yml)
                 │
                 ▼ [ dbt docs generate ]
解析生成 target/manifest.json (全仓依赖树) + target/catalog.json (列级元数据)
                 │
                 ▼ [ dbt docs serve ]
启动轻量 Web 静态站点：
• 交互式 DAG 血缘图 (Lineage Graph)，点击即可上探下游
• 字段级字典、数据类型、测试覆盖状态、所有者信息一应俱全
```""",

    # ── Chapter 4: dbt 四大核心物化机制深度剖析与选型 ──
    "dbt-l4-1": """### 核心物化图解：四大物化机制全景权衡
<Diagram type="dbt-materialization" />

```
┌──────────────────┬────────────────┬────────────────┬───────────────────────────┐
│ 物化方式         │ 存储成本       │ 查询计算耗时   │ 底层实现机制              │
├──────────────────┼────────────────┼────────────────┼───────────────────────────┤
│ view (视图)      │ 零 (仅存 SQL)  │ 慢 (每次现算)  │ CREATE VIEW AS SELECT ... │
├──────────────────┼────────────────┼────────────────┼───────────────────────────┤
│ table (物理表)   │ 高 (落地磁盘)  │ 极快 (预先算好)│ CTAS 临时表 ➔ 原子重命名  │
├──────────────────┼────────────────┼────────────────┼───────────────────────────┤
│ incremental(增量)│ 高 (追加合并)  │ 极快 (仅刷增量)│ MERGE / DELETE + INSERT   │
├──────────────────┼────────────────┼────────────────┼───────────────────────────┤
│ ephemeral(内联)  │ 零 (数仓无痕迹)│ 取决于下游查询 │ 编译时作为 CTE 嵌入下游   │
└──────────────────┴────────────────┴────────────────┴───────────────────────────┘
```""",

    "dbt-l4-2": """### 视图计算时序图解：View 物化查询下推
```
客户端发出查询请求: SELECT * FROM stg_orders WHERE status = 'shipped';
                           │
                           ▼
          数仓查询解析器重写查询 (Query Rewriting):
          SELECT * FROM ( SELECT id AS order_id, ... FROM raw_orders )
          WHERE status = 'shipped';
                           │
                           ▼
          数仓执行谓词下推，实时从原始底层表中扫盘计算结果
```""",

    "dbt-l4-3": """### 原子落地时序图解：Table 物化创建与重命名
```
1. dbt 编译目标 SQL 并在目标数仓创建临时表:
   CREATE TABLE marts.dim_customers__dbt_tmp AS (SELECT ...);
                           │
2. 完整写入完毕且无报错后，数仓执行原子重命名 (Atomic Rename):
   ALTER TABLE marts.dim_customers RENAME TO marts.dim_customers__dbt_backup;
   ALTER TABLE marts.dim_customers__dbt_tmp RENAME TO marts.dim_customers;
                           │
3. 删除旧版本临时备份表，实现下游终端查询零秒卡顿与零中间残缺数据！
```""",

    "dbt-l4-4": """### CTE 展开图解：Ephemeral 物化的文本内联
```
[ ephemeral 模型: models/int_active_users.sql ]
SELECT user_id, last_login_date FROM raw_users WHERE is_active = true

                             │
                             ▼ 下游模型引用 {{ ref('int_active_users') }}
[ 最终编译生成的数仓原生 SQL ]
WITH __dbt__cte__int_active_users AS (
    SELECT user_id, last_login_date FROM raw_users WHERE is_active = true
)
SELECT * FROM __dbt__cte__int_active_users WHERE ...
```""",

    "dbt-l4-5": """### 选型决策树：dbt 模型物化选型决策逻辑
```
                           该模型的数据规模多大？
                                     │
                  ┌──────────────────┴──────────────────┐
                  ▼ (< 100万行)                          ▼ (> 100万行)
           下游计算耗时可否接受？                   数据是否包含频繁的历史更新？
             │                │                       │                │
             ▼ (是)           ▼ (否)                  ▼ (否，只追加)   ▼ (是，有状态变更)
         [ view ]          [ table ]             [ incremental ]  [ incremental ]
                                                 (append 策略)    (merge 策略)
```""",

    "dbt-l4-6": """### 配置继承图解：dbt_project.yml 级联继承模型
```
dbt_project.yml (全局默认)
└── models:
      my_project:
        +materialized: view  <── 全局默认物化为 view
        staging:
          +materialized: view  <── staging 保持轻量 view
        marts:
          +materialized: table <── marts 继承覆盖，默认物理落地为 table
          core:
            fct_orders:
              +materialized: incremental <── 重点单表针对性优化为增量
```""",

    "dbt-l4-7": """### 容灾保护图解：临时表发布机制与事务隔离
```
阶段 A (构建中):
  [生产生效表: fct_orders] ─── 持续提供对外稳定 BI 查询
  [后台临时表: fct_orders__dbt_tmp] ─── 写入 1 亿行新数据

若阶段 A 遭遇算力耗尽或 SQL 语法报错：
  ❌ 临时表被直接清理，原生产生效表毫发无损！

若阶段 A 写入成功：
  ✅ 原子交换 (Atomic Rename) 瞬间生效，下游无缝过渡到新数据版本。
```""",

    # ── Chapter 5: 增量模型 (Incremental Models) 高级实操 ──
    "dbt-l5-1": """### 核心增量图解：晚到数据回溯与合并
<Diagram type="incremental-window" />

```
第一次运行 (全量冷启动):
  is_incremental() 判定为 FALSE ──> 执行全量 CTAS 建表，载入全部历史数据

后续常规运行 (增量模式):
  is_incremental() 判定为 TRUE  ──> 注入 WHERE updated_at > MAX(updated_at) 增量过滤
                                ──> 仅扫描处理最近新增与修改的少量批次
                                ──> 执行 MERGE INTO 合并入目标生产表
```""",

    "dbt-l5-2": """### 增量策略对比图解：merge vs delete+insert vs append
```
┌──────────────────┬────────────────────────────────────────────────────────┐
│ 增量更新策略     │ 机制与引擎支持                                         │
├──────────────────┼────────────────────────────────────────────────────────┤
│ 1. merge         │ 利用目标表 unique_key 匹配：存在则 UPDATE，不存在则     │
│    (现代云数仓)  │ INSERT。Snowflake / BigQuery / Databricks 默认推荐。   │
├──────────────────┼────────────────────────────────────────────────────────┤
│ 2. delete+insert │ 先 DELETE 目标表中匹配 unique_key 的旧行，再 INSERT     │
│    (传统关系型)  │ 新行。适用于不支持标准 MERGE 语法的 Postgres / Redshift│
├──────────────────┼────────────────────────────────────────────────────────┤
│ 3. append        │ 盲追加模式，只执行 INSERT INTO，不做任何重复键查重。   │
│    (日志流水型)  │ 适用于纯时序埋点、机器日志等单调递增的不变数据。       │
└──────────────────┴────────────────────────────────────────────────────────┘
```""",

    "dbt-l5-3": """### 主键判定图解：unique_key 唯一键对齐与 UPSERT
```
目标表已有记录:
  order_id: 1001, status: 'pending', amount: 100

今日增量批次待入库:
  order_id: 1001, status: 'completed', amount: 100 (已支付更新)
  order_id: 1002, status: 'pending',   amount: 50  (全新订单)

MERGE 执行结果:
  ✅ 匹配 unique_key=1001: 触发 UPDATE 覆盖 status 为 'completed'
  ✅ 未匹配 unique_key=1002: 触发 INSERT 写入新行
```""",

    "dbt-l5-4": """### 回溯保护图解：Lookback Window 应对晚到数据 (Late-Arriving)
```
时间轴 ────────────>
T-3 天                T-1 天                当前 T
  │                     │                     │
  └─────────────────────┴─────────────────────┘
        回溯安全窗口 (Lookback Window: 3 Days)

• 若不用回溯窗口：仅抓取 updated_at >= T，若某笔订单在源库离线 2 天后补录，将永远被遗漏！
• 使用回溯窗口：WHERE updated_at >= (MAX(updated_at) - INTERVAL '3 DAY')
  即使由于网络中断或第三方 API 延迟上报的晚到数据，也能被准确扫描并更新！
```""",

    "dbt-l5-5": """### 重刷机制图解：--full-refresh 增量表全量重构
```
触发全量重刷场景：
• 业务定义口径重大重构 (例如历史退款扣减逻辑变更)
• 模型 SQL 新增了字段，需要对过去 3 年历史数据全部补齐
• 数据源曾发生大规模脏数据污染，需推倒重来

运行指令: dbt run --select fct_orders --full-refresh
执行流程: 强制将 is_incremental() 置为 False ➔ DROP TABLE ➔ 全量重新建表
```""",

    "dbt-l5-6": """### Schema 演进图解：on_schema_change 字段变更策略
```
源表/模型新增了字段: discount_rate
                             │
            ┌────────────────┴────────────────┐
            ▼ (默认 ignore)                   ▼ (推荐 sync_all_columns)
   忽略新字段，目标表不变更          目标表自动 ALTER TABLE ADD COLUMN
   新数据在该列的值被直接丢弃        新数据自动写入新字段，历史旧数据补 NULL
```""",

    "dbt-l5-7": """### 性能调优图解：分区剪裁 (Partition Pruning) 优化
```
未做分区剪裁 (Full Table Scan):
  扫描目标全表 5 亿行 ──> 算力账单爆炸，耗时 15 分钟

启用分区剪裁过滤 (WHERE date_key >= '2024-03-01'):
  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
  │ 2024-01 分区 │ │ 2024-02 分区 │ │ 2024-03 分区 │
  │   (跳过扫描) │ │   (跳过扫描) │ │   (仅扫描此) │
  └──────────────┘ └──────────────┘ └──────────────┘
  仅扫描最近 1 个分区 500 万行 ──> 扫描成本降低 99%，耗时缩短至 10 秒！
```""",

    # ── Chapter 6: Jinja 模板引擎、通用宏 (Macros) 与跨平台包 ──
    "dbt-l6-1": """### 模板渲染图解：Jinja 编译期向原生 SQL 展开
```
[ 开发阶段编写的 dbt Jinja 代码 ]
SELECT
  order_id,
  {% set payment_methods = ['credit_card', 'coupon', 'bank_transfer'] %}
  {% for method in payment_methods %}
  SUM(CASE WHEN method = '{{ method }}' THEN amount ELSE 0 END) AS {{ method }}_amount
  {%- if not loop.last %},{% endif %}
  {% endfor %}
FROM raw_payments GROUP BY 1;

                             │
                             ▼ [ dbt compile 阶段 ]
[ 目标数仓接收到的原生编译 SQL ]
SELECT
  order_id,
  SUM(CASE WHEN method = 'credit_card' THEN amount ELSE 0 END) AS credit_card_amount,
  SUM(CASE WHEN method = 'coupon' THEN amount ELSE 0 END) AS coupon_amount,
  SUM(CASE WHEN method = 'bank_transfer' THEN amount ELSE 0 END) AS bank_transfer_amount
FROM raw_payments GROUP BY 1;
```""",

    "dbt-l6-2": """### 变量注入图解：dbt 预置上下文与环境变量
```
            ┌──────────────────┐
            │   env_var(...)   │ ──> 从操作系统安全读取数据库密码与 API Key
            └──────────────────┘
            ┌──────────────────┐
            │     var(...)     │ ──> 读取 dbt_project.yml 中配置的业务参数或命令行入参
            └──────────────────┘
            ┌──────────────────┐
            │    target.name   │ ──> 运行时判断当前是 'dev' 还是 'prod'，动态限制数据量
            └──────────────────┘
```""",

    "dbt-l6-3": """### 宏封装流程图解：Macro 的入参、逻辑与复用
```
定义宏: macros/cents_to_dollars.sql
┌────────────────────────────────────────────────────────┐
│ {% macro cents_to_dollars(column_name, scale=2) %}     │
│   ROUND(CAST({{ column_name }} AS NUMERIC) / 100, {{ scale }})│
│ {% endmacro %}                                         │
└────────────────────────────────────────────────────────┘
                           │
                           ▼ 全项目多模型无缝直接复用
SELECT
  order_id,
  {{ cents_to_dollars('amount_in_cents') }} AS total_amount_usd
FROM {{ ref('stg_payments') }};
```""",

    "dbt-l6-4": """### 跨平台方言图解：dbt 宏消除方言差异
```
统一业务调用: {{ dbt.dateadd(datepart='day', interval=1, from_date_or_timestamp='created_at') }}
                               │
            ┌──────────────────┼──────────────────┐
            ▼                  ▼                  ▼
     [ Snowflake 适配 ]  [ BigQuery 适配 ]   [ Postgres 适配 ]
   DATEADD(day, 1, ...)  DATE_ADD(..., DAY)  ... + INTERVAL '1 day'
```""",

    "dbt-l6-5": """### 包依赖管理图解：packages.yml 与 dbt-utils 生态
```
packages.yml 声明依赖
  - package: dbt-labs/dbt_utils
    version: 1.1.1
               │
               ▼ [ dbt deps ] 从官方包索引仓库下载代码至 dbt_packages/
               │
               ▼ 模型中即可直接调用世界顶级数仓团队封装的成熟宏：
• dbt_utils.generate_surrogate_key (多列哈希代理键)
• dbt_utils.pivot (动态列转行)
• dbt_utils.star (批量选择排除指定列)
```""",

    "dbt-l6-6": """### 动态透视时序图解：Pivot 宏的“先查后拼”两阶段
```
阶段 1: run_query 宏在编译期先执行一次查询:
  SELECT DISTINCT payment_method FROM raw_payments;
  ──> 查出动态枚举列表: ['alipay', 'wechat', 'apple_pay']

阶段 2: 将枚举列表传入 Jinja for 循环，动态拼装聚合 SQL:
  SUM(CASE WHEN method = 'alipay' THEN ...) AS alipay_amount,
  SUM(CASE WHEN method = 'wechat' THEN ...) AS wechat_amount...
  ──> 彻底消灭手工维护数十个支付渠道 CASE WHEN 的机械繁琐！
```""",

    "dbt-l6-7": """### 调试诊断图解：dbt 编译诊断与 log 打印
```
开发时遇到 Jinja 渲染异常或计算错误
                   │
  ┌────────────────┴────────────────┐
  ▼                                 ▼
[ 终端执行 dbt compile ]          [ 代码中嵌入 {{ log("变量值: " ~ var, info=True) }} ]
查看 target/compiled/ 下的真实 SQL 终端直接输出变量值，无需盲人摸象
```""",

    # ── Chapter 7: 测试与数据契约体系 ──
    "dbt-l7-1": """### 核心测试图解：数据质量断言与门禁熔断
<Diagram type="dbt-testing" />

```
dbt test 底层黄金法则:
所有测试在本质上都是一条「寻找违规脏数据」的 SQL 查询:
• 若查询返回 行数 == 0 ──> 恭喜，数据完全干净，测试 PASS！
• 若查询返回 行数 > 0  ──> 警告！查出 N 条违例脏行，测试 FAIL！
```""",

    "dbt-l7-2": """### 四大通用测试图解：Generic Tests 校验矩阵
```
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ 测试类型            │ 底层自动编译生成的 SQL 断言逻辑                        │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ 1. unique           │ SELECT col, COUNT(*) FROM t GROUP BY 1 HAVING COUNT(*)>1│
│    (主键无重复)     │ 返回重复出现的 key 列表                                │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ 2. not_null         │ SELECT * FROM t WHERE col IS NULL;                     │
│    (非空完整性)     │ 返回该列为空的残缺脏记录                               │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ 3. accepted_values  │ SELECT * FROM t WHERE col NOT IN ('pending','shipped');│
│    (枚举值域约束)   │ 返回不在合法业务值域内的异常记录                       │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ 4. relationships    │ SELECT child.fk FROM child LEFT JOIN parent ...        │
│    (外键引用完整性) │ WHERE parent.pk IS NULL; 找出孤儿外键记录              │
└─────────────────────┴────────────────────────────────────────────────────────┘
```""",

    "dbt-l7-3": """### 单例测试流程图解：Singular Tests 拦截特定业务漏洞
```
编写专有 SQL 测试: tests/assert_total_discount_never_exceeds_revenue.sql
┌────────────────────────────────────────────────────────┐
│ -- 业务规则：任何订单的折扣金额绝对不能超过订单总原价 │
│ SELECT order_id, total_discount, gross_revenue         │
│ FROM {{ ref('fct_orders') }}                           │
│ WHERE total_discount > gross_revenue                   │
└────────────────────────────────────────────────────────┘
                           │
                           ▼ [ dbt test ]
若返回 0 行 ➔ 业务合规；若返回 > 0 行 ➔ 拦截财务漏洞，发出警报！
```""",

    "dbt-l7-4": """### 自定义测试图解：Custom Generic Test 参数化封装
```
定义测试宏: tests/generic/test_is_even.sql
{% test is_even(model, column_name) %}
  SELECT {{ column_name }} FROM {{ model }} WHERE {{ column_name }} % 2 != 0
{% endtest %}

                           │
                           ▼ schema.yml 中直接像原生测试一样使用
columns:
  - name: batch_size
    tests:
      - is_even
```""",

    "dbt-l7-5": """### 高级测试扩展图解：dbt-expectations 规则矩阵
```
dbt-expectations (移植 Great Expectations 精髓):
• 列级统计测试: dbt_expectations.expect_column_quantile_values_to_be_between
• 字符串模式:   dbt_expectations.expect_column_values_to_match_regex (邮箱/手机号)
• 多列复合约束: dbt_expectations.expect_table_columns_to_match_ordered_list
```""",

    "dbt-l7-6": """### 告警阈值流向图解：warn_if vs error_if 容错分流
```
                    测试查询返回脏行数 N
                             │
            ┌────────────────┴────────────────┐
            ▼ (0 < N <= 10)                   ▼ (N > 10)
     [ severity: warn ]                [ severity: error ]
  软性警告：Slack 发送提醒通知       硬性熔断：构建直接返回退出码 1
  不中断 CI/CD，允许次日人工核查     立即终止后续 Marts 构建，防止扩散
```""",

    "dbt-l7-7": """### 数据契约时序图解：Data Contracts 编译期强约束
```
定义模型契约: contract: { enforced: true }
┌────────────────────────────────────────────────────────┐
│ columns:                                               │
│   - name: order_id,    data_type: integer              │
│   - name: order_total, data_type: numeric(10,2)        │
└────────────────────────────────────────────────────────┘
                           │
                           ▼ [ dbt build 编译期校验 ]
若上游开发人员私自删除了 order_total 列或修改类型为 string：
❌ 数仓拒绝执行，直接报错契约违例，将破坏性变更扼杀在开发分支中！
```""",

    # ── Chapter 8: 快照 (Snapshots) 与缓慢变化维 (SCD Type 2) 工业级落地 ──
    "dbt-l8-1": """### 核心快照图解：SCD Type 2 时间线演化
<Diagram type="scd-type2" />

```
客户 Alice 地址发生变迁 (2023年北京 ➔ 2024年6月迁移至上海):
┌──────────┬──────┬──────────────┬────────────┬──────────────┐
│ cust_id  │ city │ dbt_valid_from│dbt_valid_to│dbt_is_current│
├──────────┼──────┼──────────────┼────────────┼──────────────┤
│ C1001    │ 北京 │ 2023-01-01   │ 2024-06-15 │ false (过期) │
│ C1001    │ 上海 │ 2024-06-15   │ null       │ true (当前)  │
└──────────┴──────┴──────────────┴────────────┴──────────────┘
• 关联 2023 年历史订单时：精确匹配北京（真实反映当时地域销量）
• 关联 2024 年下半年新订单时：精确匹配上海（正确反映当前运营数据）
```""",

    "dbt-l8-2": """### 快照存储图解：专用 snapshot schema 与元数据维护
```
业务数据库 (OLTP)                       数仓快照专用 Schema (snapshots)
┌──────────────────┐                  ┌────────────────────────────────────────┐
│ raw.users        │  dbt snapshot 抓取│ snapshots.snap_users                   │
│ (只保留当前最新) │ ────────────────> │ 自动追加系统维护列:                    │
│ 任何 UPDATE 覆盖 │                  │ • dbt_scd_id (主键+时间哈希)           │
│ 历史数据永久丢失 │                  │ • dbt_valid_from / dbt_valid_to        │
└──────────────────┘                  └────────────────────────────────────────┘
```""",

    "dbt-l8-3": """### 时间戳策略图解：timestamp 策略捕获时序
```
源表配置: strategy='timestamp', updated_at='updated_at'

源表 updated_at 发生更新: 从 T1 变为 T2
                       │
                       ▼
dbt 判定: T2 > 旧记录的 dbt_valid_from
                       │
                       ▼
执行合并: 将旧版本打标 dbt_valid_to = T2；新记录入库 dbt_valid_from = T2, dbt_valid_to = null
```""",

    "dbt-l8-4": """### 哈希比较图解：check 策略应对无时间戳源表
```
源表没有 updated_at 时间戳字段？使用 check 策略！
check_cols = ['user_name', 'email', 'billing_address']
                       │
                       ▼ dbt 自动计算这几列组合的 MD5 指纹
今日计算指纹: md5('Alice-alice@work.com-NewYork')
昨日快照指纹: md5('Alice-alice@work.com-Boston')
                       │
                       ▼ 指纹不一致 ➔ 判定该行被更新，自动触发新版本生成！
```""",

    "dbt-l8-5": """### 点对点时态查询图解：Point-in-Time Join
```
查询任意历史订单发生时的真实客户属性:
SELECT
    o.order_id,
    o.order_date,
    c.city AS customer_city_at_purchase_time
FROM {{ ref('fct_orders') }} o
JOIN {{ ref('snap_customers') }} c
  ON o.customer_id = c.customer_id
 AND o.order_date >= c.dbt_valid_from
 AND (o.order_date < c.dbt_valid_to OR c.dbt_valid_to IS NULL);
```""",

    "dbt-l8-6": """### 硬删除处理图解：invalidate_hard_deletes 策略
```
源表执行了物理 DELETE: 用户 C1001 被直接从业务数据库中移除！
                           │
                           ▼ invalidate_hard_deletes=True
快照表自动发现该记录在源表已消失:
将旧版本的 dbt_valid_to 置为当前扫描时间戳，dbt_is_current 设为 false。
既保护历史数据绝不物理丢失，又准确标记该实体在源端已消亡！
```""",

    "dbt-l8-7": """### 维度集市接入图解：快照表向 Marts 维度表供给
```
snapshots.snap_customers (底层物理快照底座)
                 │
                 ├── 视图 1: 仅取当前有效 (WHERE dbt_is_current = true)
                 │   ──> dim_customers (供 90% 的日常当前报表极速查询)
                 │
                 └── 视图 2: 保留全生命周期 (含所有 valid_from/to 区间)
                     ──> dim_customers_history (供合规审计与历史重述查询)
```""",

    # ── Chapter 9: 指标语义层 (Semantic Layer) 与反向 ETL 闭环 ──
    "dbt-l9-1": """### 核心语义图解：规避扇出陷阱与统一指标定义
<Diagram type="semantic-layer" />

```
传统报表模式 (口径打架):
• 财务看板 SQL: SUM(amount) WHERE status = 'paid'
• 运营看板 SQL: SUM(order_total) - SUM(refund_amount)
• 市场看板 SQL: SUM(revenue) INCLUDING tax
──> 最终 CEO 看到的三个月度营收数字完全不同！

现代指标语义层模式:
所有客户端统一通过 MetricFlow 请求 metric: monthly_revenue
底座唯一声明，全公司 100% 共享唯一真实数字！
```""",

    "dbt-l9-2": """### 语义三要素图解：Entities、Dimensions 与 Measures
```
┌────────────────────────────────────────────────────────┐
│ 1. Entities (实体主键/外键):                           │
│    • customer_id (primary), order_id (primary)         │
├────────────────────────────────────────────────────────┤
│ 2. Dimensions (切片维度):                              │
│    • order_date (time), country (categorical)          │
├────────────────────────────────────────────────────────┤
│ 3. Measures (可聚合度量):                              │
│    • order_amount (agg: sum), user_count (agg: count)  │
└────────────────────────────────────────────────────────┘
```""",

    "dbt-l9-3": """### YAML 映射图解：Semantic Model 声明结构
```
semantic_models:
  - name: orders
    model: ref('fct_orders')
    entities:
      - name: order_id
        type: primary
    measures:
      - name: revenue
        agg: sum
        expr: amount
metrics:
  - name: total_revenue
    type: simple
    type_params:
      measure: revenue
```""",

    "dbt-l9-4": """### 复合指标图解：派生指标与滚动窗口聚合
```
┌──────────────────────────┐      ┌──────────────────────────┐
│   Measure: sum(revenue)  │  ÷   │ Measure: count(orders)   │
└─────────────┬────────────┘      └─────────────┬────────────┘
              │                                 │
              └────────────────┬────────────────┘
                               ▼
        Derived Metric: average_order_value (客单价 AOV)
                               │
                               ▼
        Cumulative Metric: 28_day_rolling_revenue (28日滚动营收)
```""",

    "dbt-l9-5": """### 关联防膨胀图解：MetricFlow 先聚合后联接机制
```
普通 SQL 先 JOIN 后 SUM (扇出灾难):
  orders (1行: ¥1000) ──LEFT JOIN──> order_items (3行) ──> 结果变3行 ──> SUM()=¥3000 (虚增3倍!)

MetricFlow 智能优化执行计划 (防扇出):
  1. 在 orders 表独立完成 SUM(amount) = ¥1000
  2. 在 order_items 表独立完成 COUNT(*) = 3
  3. 最终通过主键进行等度聚合后的安全对齐 ──> 保证数据 100% 精确！
```""",

    "dbt-l9-6": """### 服务广播图解：语义层统一接口分发
```
              ┌─────────────────────────────────┐
              │ dbt Semantic Layer (MetricFlow) │
              └────────────────┬────────────────┘
                               │ 统一 JDBC / GraphQL API
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ BI 看板         │   │ 算法建模        │   │ AI Agent 问数   │
│ Tableau/Metabase│   │ Python Notebook │   │ Slack 机器人    │
└─────────────────┘   └─────────────────┘   └─────────────────┘
```""",

    "dbt-l9-7": """### 业务闭环图解：反向 ETL (Reverse ETL) 数据激活
```
┌─────────────────────────────────┐
│ 现代数仓 (Snowflake / BigQuery) │
│ 高价值集市: fct_customer_churn  │
└────────────────┬────────────────┘
                 │ 反向 ETL 工具 (Hightouch / Census)
                 ▼ 周期将高流失风险客户打标
┌────────────────────────────────────────────────────────┐
│ 业务生产工具接收数据并立即触发运营动作:               │
│ • Salesforce CRM: 销售代表跟进回访任务                 │
│ • Zendesk: VIP 客服优先工单接入                        │
│ • 极光推送 / 邮件网关: 自动定向发放 50 元关怀大礼包券   │
└────────────────────────────────────────────────────────┘
```""",

    # ── Chapter 10: 生产级 CI/CD 自动化部署、环境隔离与 Slim CI 提速 ──
    "dbt-l10-1": """### 分支模型图解：数据团队 Git 工作流规范
```
main 分支 (生产环境受保护分支) ───────────────────────────────> 生产部署
       │
       └── 创建特性分支: feature/add-churn-model
               │
               ├── 本地修改并提交 SQL/YAML
               ├── 发起 GitHub Pull Request (PR)
               ├── 触发 Slim CI 自动化构建与测试流水线
               │     ✅ Slim CI 全部通过
               │     ✅ 同事 Code Review 审批通过
               ▼
       合并回 main 分支 ──> 自动触发生产级无损发布
```""",

    "dbt-l10-2": """### 隔离矩阵图解：多环境物理隔离设计
```
┌─────────────────────┬──────────────────┬─────────────────────────────────────┐
│ 环境                │ 物理数据库       │ 访问凭据与权限                      │
├─────────────────────┼──────────────────┼─────────────────────────────────────┤
│ 本地开发 (dev)      │ analytics_dev    │ 分析师专属 schema (如 dbt_alice)，  │
│                     │                  │ 随便折腾测试，损坏无影响            │
├─────────────────────┼──────────────────┼─────────────────────────────────────┤
│ PR 集成测试 (ci)    │ analytics_ci     │ CI/CD 临时动态 schema (pr_104_run)，│
│                     │                  │ 测试跑完自动 DROP 销毁              │
├─────────────────────┼──────────────────┼─────────────────────────────────────┤
│ 正式生产 (prod)     │ analytics_prod   │ 生产只读权限，仅 CI/CD 服务账号     │
│                     │                  │ 具备写入和构建权限                  │
└─────────────────────┴──────────────────┴─────────────────────────────────────┘
```""",

    "dbt-l10-3": """### 核心 CI 图解：Slim CI 增量构建加速机制
<Diagram type="slim-ci" />

```
全量 CI (痛苦慢速):
  全库 300 个模型全部重跑 ──> 耗时 45 分钟，每天几十次 PR 导致云数仓算力耗尽

Slim CI (智能极速):
  对比 main 分支的 manifest.json 元数据:
  指令: dbt build --select state:modified+ --defer --state path/to/prod/artifacts
  • 仅构建本次 PR 修改的 1 个模型及其直接下游 2 个模型
  • 未变更的上游直接引用生产表 (--defer)，耗时缩短至 40 秒，提速 98%！
```""",

    "dbt-l10-4": """### 流水线时序图解：GitHub Actions CI/CD 流水线
```
开发者提交 PR
      │
      ├── 1. 静态代码 Lint 检查 (sqlfluff lint)
      ├── 2. 下载生产最新 manifest.json 归档文件
      ├── 3. 运行 Slim CI: dbt build --select state:modified+ --defer
      │        ├── 编译受影响模型
      │        ├── 运行变更模型的数据测试 (unique, not_null)
      └── 4. 向 PR 评论区自动回写测试耗时报告卡片
```""",

    "dbt-l10-5": """### 蓝绿发布图解：Blue-Green 零停机原子上线
```
当前状态:
  [生产生效集市: analytics_prod] ─── BI 看板正在持续查询中

后台影子构建 (Green):
  在 analytics_prod_next 构建全部模型并执行严格测试门禁
               │
               ▼ 全部模型构建且测试 100% 成功
原子 Schema 互换:
  ALTER SCHEMA analytics_prod SWAP WITH analytics_prod_next;
  ──> 切换仅耗时 10 毫秒，零查询中断，零脏数据风险！
```""",

    "dbt-l10-6": """### 静态发布图解：dbt docs 自动化部署链路
```
生产 dbt run 构建完成
          │
          ▼ [ dbt docs generate ]
生成 index.html, manifest.json, catalog.json
          │
          ▼ [ AWS S3 Sync / GCS 静态网站托管 ]
内部团队访问 https://docs.data.company.com 实时查看最新全景数据字典与血缘！
```""",

    "dbt-l10-7": """### 监控大屏图解：执行耗时、测试告警与数仓成本治理
```
dbt 构建完成自动输出 target/run_results.json
                 │
                 ▼ 解析指标并写入监控数据库
┌─────────────────────────────────┬─────────────────────────────────┐
│ 告警指标                        │ 治理动作                        │
├─────────────────────────────────┼─────────────────────────────────┤
│ 单个模型构建耗时 > 10 分钟      │ 触发钉钉告警，重点重构为增量模型│
│ 某测试连续失败超过 2 天         │ 催办对应业务方核实源端数据口径  │
│ 每日数仓扫描字节数异常攀升 50%  │ 检查是否缺少分区剪裁或笛卡尔积  │
└─────────────────────────────────┴─────────────────────────────────┘
```"""
}
