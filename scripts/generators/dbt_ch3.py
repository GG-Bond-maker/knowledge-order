# -*- coding: utf-8 -*-
"""
dbt Analytics Engineering - Chapter 3: dbt Architecture & Project Environment Setup
"""

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_3():
    c3_lessons = [
        lesson(
            "dbt-l3-1",
            "dbt 架构剖析：只做 T (Transform)，算力推下 (In-warehouse Compute)",
            """### 一、dbt (data build tool) 的定位与核心哲学
dbt 并不是数据库，也不是数据抽取工具，更不是数据可视化看板。
它的官方自我定义非常纯粹：**“dbt does the T in ELT（dbt 专精于 ELT 中的 Transform 转换层）”**。

### 二、传统计算模式 vs dbt 算力下推机制
1. **传统转换工具（如 Spark, Pandas 脚本, Kettle）**：
   - 必须通过网络将数 GB 甚至数 TB 的海量原始数据从数据库逐行**拉取 (Pull)** 到专用的外部计算节点；
   - 在外部内存中计算完成后，再通过网络将结果大批量**写回 (Write)** 目标数据库。
   - **痛点**：网络传输带宽巨大瓶颈、序列化反序列化开销、外部机器内存易 OOM 崩溃。
2. **dbt 的算力推下 (Push-down Computation)**：
   - **数据完全不离开数仓**！
   - dbt 充当一个轻量级的“指挥官与编译器”：它在本地或 CI 容器中运行（甚至只需 512MB 内存），解析开发者的 SQL 模型与 Jinja 宏，将其编译为目标数仓（如 Snowflake、BigQuery、DuckDB、Postgres）原生高效的执行计划与 SQL 语句；
   - 通过数据库连接驱动，dbt 将编译后的 SQL 下发给数仓执行；**数仓利用自身高度优化的分布式集群或列式向量化引擎在存储原地完成计算与表物化**！
   - 计算完成后，dbt 仅接收执行耗时、成功行数和状态元数据。

### 三、dbt 带来的三大质的飞跃
- **零数据传输网络拥堵**：计算紧贴存储，百亿级数据转换在数仓内部局域网秒级完成；
- **极致安全合规**：敏感业务数据永远留在企业自己的云数仓合规边界内，dbt 客户端不接触也不缓存任何真实业务明细行；
- **无限弹性算力**：需要计算大模型时，只需在数仓端动态调大虚拟数仓规格 (如从 XS 扩容到 XL)，无需对 dbt 客户端做任何硬件升级。""",
            difficulty=1,
            tips=[
                tip("为什么本地笔记本能跑百亿级数据建模？", "因为你笔记本上的 dbt 只负责几毫秒的 SQL 文本编译，真正的几十台分布式数仓服务器在云端替你流汗计算！")
            ],
            demos=[
                demo("dbt 算力推下架构", "开发者 dbt CLI (发出编译SQL) -> 驱动协议 (ODBC/JDBC/REST) -> 目标云数仓 (原地执行 CREATE TABLE AS SELECT ...)")
            ]
        ),
        lesson(
            "dbt-l3-2",
            "dbt Core vs dbt Cloud：技术选型与企业适用场景",
            """### 一、两种发行版本的血缘与异同
dbt 生态提供了两种主要形态：
1. **dbt Core（开源内核 CLI）**：
   - **本质**：开源的 Python 命令行工具 (`pip install dbt-core dbt-duckdb dbt-snowflake`)；
   - **运行机制**：在本地终端、个人电脑、自建 Jenkins、Docker 容器或 Apache Airflow 集群中自由运行；
   - **成本与控制**：完全免费、Apache-2.0 开源协议；拥有 100% 的自主可控性，深度支持定制化内部脚手架与自动化集成。
2. **dbt Cloud（官方商业托管 SaaS 平台）**：
   - **本质**：基于 Web 界面的托管企业级服务；
   - **核心增值特性**：
     - **Web-based IDE**：在浏览器中直接编写 SQL、即时预览结果与血缘图谱，免去本地复杂的 Python/Git 环境配置；
     - **开箱即用的调度器 (Scheduler)**：内置定时跑批、状态告警与自动化日志流；
     - **原生 Slim CI 门禁**：与 GitHub/GitLab 深度打通，提 PR 时自动开启短暂测试环境；
     - **托管语义层服务 (Hosted Semantic Layer)**。

### 二、企业技术选型决策树
- **选 dbt Core**：
  - 团队已具备成熟的编排调度基础设施（如公司已有强大的 **Apache Airflow** 或 Kubernetes 集群）；
  - 对数据出境、网络安全有严苛内网隔离审计要求的金融、政企与大型科技团队；
  - 想要彻底避免商业 SaaS 订阅许可成本。
- **选 dbt Cloud**：
  - 初创公司或数据团队规模较小，缺乏专业的底层运维与调度平台工程人员；
  - 希望快速上手，让不懂 Linux 终端的商业分析师也能通过浏览器即时协同开发。""",
            difficulty=2,
            tips=[
                tip("学习路径建议", "本课程以全行业最为通用、最硬核的 **dbt Core CLI** 为基准展开，掌握了底层的 CLI 命令与架构机制，切换到 dbt Cloud 界面如同水到渠成。")
            ]
        ),
        lesson(
            "dbt-l3-3",
            "dbt 项目目录骨架详解与职责划分",
            """### 一、标准化 dbt 项目文件目录树
通过运行 `dbt init <project_name>`，dbt 会自动为我们生成一套极其严谨的工程化骨架：
```text
my_dbt_project/
├── dbt_project.yml        # 全局项目核心配置文件（项目灵魂）
├── packages.yml           # 外部扩展依赖包清单（如 dbt-utils）
├── models/                # 核心 SQL 模型与测试 YAML 存放目录
│   ├── staging/           # 贴源清洗层模型
│   ├── intermediate/      # 跨业务中间整合模型
│   └── marts/             # 业务集市分析模型 (维度与事实)
├── tests/                 # 自定义奇异测试 (Singular Tests)
├── seeds/                 # 静态 CSV 码表、字典文件存放目录
├── snapshots/             # SCD Type 2 历史快照定义文件
├── macros/                # 可复用的 Jinja 宏函数
├── analyses/              # 临时性一次性分析 SQL（只编译不落地）
└── target/                # dbt 编译生成的临时原生 SQL 与清单产物
```

### 二、各核心目录的黄金职责分工
1. **`models/`（绝对核心）**：
   - 所有数据建模转换 SQL 必须存放在这里；支持按照业务线与数仓分层建立多级子目录；
   - 模型文件同级通常配有 `.yml` 文件（用于声明字段文档、测试约束与模型契约）；
2. **`seeds/`（静态基础数据）**：
   - 存放少量的静态数据文件（如 `country_codes.csv`, `payment_channel_map.csv`）；
   - 执行 `dbt seed` 命令时，dbt 会自动在数据库建立物理表并导入数据，供后续模型直接 `{{ ref() }}`；
3. **`snapshots/`（快照捕获）**：
   - 专门用于存放声明 SCD Type 2 慢变化维的 SQL 文件，记录源头实体的全生命周期历史；
4. **`macros/`（宏函数库）**：
   - 存放跨模型复用的 Jinja 宏（相当于数仓的公共函数库，如自定义日期格式化、跨表分摊计算）；
5. **`target/`（编译产物目录）**：
   - **严禁手动修改，必须加入 `.gitignore`**！
   - `target/compiled/` 存放 Jinja 宏被替换解析后的纯原生 SQL；
   - `target/run/` 存放被封装了 `CREATE VIEW AS ...` 或 `CREATE TABLE AS ...` 的最终执行指令。""",
            difficulty=1,
            tips=[
                tip("不要在 seeds 里塞几千万行数据", "Seeds 专为数十行到几千行的字典码表设计。如果是千万级业务数据，必须通过正常的 ELT 摄取工具入仓，严禁当做 seed 塞进代码仓库。")
            ]
        ),
        lesson(
            "dbt-l3-4",
            "全局配置文件 dbt_project.yml 核心指令深度解读",
            """### 一、dbt_project.yml 的核心地位
`dbt_project.yml` 是每个 dbt 工程的身份证与总指挥部，它告诉 dbt：
- 这个项目叫什么名字、遵循什么版本；
- 它连接哪一个凭证配置 (`profile`)；
- 模型应该默认物化成视图还是物理表，以及如何继承全局配置。

### 二、经典工业级 dbt_project.yml 结构拆解
```yaml
name: 'ecommerce_analytics'      # 项目唯一标识符（必须小写加下划线）
version: '1.0.0'                 # 项目内部语义化版本号
config-version: 2                # dbt 配置文件规范版本（当前固定为 2）

profile: 'ecommerce_dw'          # 关键映射：指明去 profiles.yml 寻找哪个连接凭证！

model-paths: ["models"]          # 模型存放目录
analysis-paths: ["analyses"]
test-paths: ["tests"]
seed-paths: ["seeds"]
macro-paths: ["macros"]
snapshot-paths: ["snapshots"]

clean-targets:                   # 执行 dbt clean 时需要自动清理的构建产物目录
  - "target"
  - "dbt_packages"

# 核心层次化配置：模型物化与 Schema 规则继承
models:
  ecommerce_analytics:           # 必须与顶部的项目 name 保持完全一致！
    # 针对 staging 贴源层的默认物化规则：全为快速视图 (view)
    staging:
      +materialized: view
      +schema: staging
    
    # 针对 marts 业务集市层的默认物化规则：全为高性能物理表 (table)
    marts:
      +materialized: table
      +schema: marts
      # 可以针对核心事实表单独覆盖配置增量物化
      core:
        fct_orders:
          +materialized: incremental
```

### 三、配置前缀 `+` 号的深层含义
在 `dbt_project.yml` 的 `models:` 层级下：
- 不带 `+` 的是**目录路径与模型名称**（如 `staging`, `marts`, `fct_orders`）；
- 带有 `+` 前缀的是**应用于该目录或模型下的配置属性指令**（如 `+materialized`, `+schema`, `+tags`, `+enabled`）；
- **配置的级联覆盖特性**：子目录的配置自动继承父目录配置，但子目录定义的配置拥有更高优先级，可以直接覆盖父级！""",
            difficulty=2,
            tips=[
                tip("语法踩坑警示", "YAML 文件对缩进极其严格！必须使用空格进行 2 格缩进，绝对严禁混入 Tab 制表符，否则执行 `dbt debug` 会直接报解析语法错误。")
            ]
        ),
        lesson(
            "dbt-l3-5",
            "连接与凭证 profiles.yml：开发与生产环境物理隔离",
            """### 一、为什么 profiles.yml 默认不放在项目代码仓库中？
新手最容易犯的一个重大安全错误：把数仓的用户名、密码和主机地址直接写在 Git 仓库里！
为了保护企业核心资产与数据安全：
- dbt 架构强制要求：**`profiles.yml` 默认存放在用户的本地家目录下（`~/.dbt/profiles.yml`，Windows 上为 `C:\\Users\\<用户名>\\.dbt\\profiles.yml`）**；
- 项目目录只放没有敏感信息的逻辑代码；连接数仓的真实机密密码存放在个人本地，**天然与 Git 仓库物理隔离，彻底防止机密泄漏至 GitHub**！

### 二、多环境目标 (Targets) 隔离设计
一个规范的企业级 `profiles.yml` 必须具备至少两个执行环境目标 (`dev` 与 `prod`)：
```yaml
ecommerce_dw:                    # 对应 dbt_project.yml 中的 profile 字段名
  target: dev                    # 本地开发时默认指向的环境目标
  outputs:
    # 开发者个人本地环境：写到个人独立 schema，杜绝误伤生产数据！
    dev:
      type: duckdb               # 数据库类型 (duckdb, snowflake, bigquery, postgres)
      path: 'dev_analytics.duckdb'
      schema: dbt_alice          # 自动带上个人名字的隔离 schema

    # 线上生产环境：只有 CI/CD 流水线与调度器使用生产管理员凭证连接！
    prod:
      type: snowflake
      account: "xy12345.ap-southeast-1"
      user: "AIRFLOW_ROBOT"
      password: "{{ env_var('DBT_PROD_PASSWORD') }}"  # 安全注入生产环境变量！
      role: "ANALYTICS_PROD_ROLE"
      database: "ANALYTICS_PROD"
      warehouse: "TRANSFORM_WH"
      schema: "analytics"
      threads: 8                 # 并发执行线程数
```

### 三、环境切换命令与安全保障
- 本地开发调试：直接运行 `dbt run`，默认自动连接 `dev`，所有生成的表全部规规矩矩落在 `dbt_alice` 个人测试库中；
- 模拟生产测试：运行 `dbt run --target prod`，dbt 会自动切换为生产连接（前提是拥有相应权限）；
- 密码绝不硬编码：在生产环境中，使用 `{{ env_var('SECRET_NAME') }}` 宏从操作系统环境变量安全读取密码，完美契合企业安全合规审计。""",
            difficulty=2,
            tips=[
                tip("健康自检命令", "配置完项目后，第一步永远是运行 `dbt debug`！它会自动测试 Python 依赖、Git 状态、profiles.yml 配置解析以及与数仓的网络连通性。")
            ]
        ),
        lesson(
            "dbt-l3-6",
            "静态数据种子管理：dbt seed 的应用与最佳实践",
            """### 一、什么是 dbt Seed？
在商业分析中，经常需要用到一些低频变动的轻量级参考对照数据：
- 国家/地区二字码与大洲映射 (`country_codes.csv`)；
- 渠道推广活动代码与归因渠道 (`campaign_channels.csv`)；
- 员工工号与业务条线对应关系 (`employee_departments.csv`)。
在过去，这些静态小表要么被散落在业务员的个人电脑里，要么需要 DBA 在生产库手动执行 `CREATE TABLE` 加 `LOAD DATA`，版本极其混乱。
**dbt Seed** 提供了一种优雅解法：
- 将这些小规模 CSV 文件直接放进项目的 `seeds/` 目录中，纳入 Git 严密版本控制；
- 执行 `dbt seed` 命令，dbt 会自动扫描该目录，在数仓中建表并将 CSV 行数据完整载入！

### 二、dbt seed 配置文件与数据类型强制声明
默认情况下，dbt 会根据 CSV 内容自动推断字段类型。但为了防止出现将邮政编码 `'01002'` 错误解析为数字 `1002`（丢失前导零）的经典踩坑惨剧，我们可以在 `dbt_project.yml` 中显式指定列的数据类型：
```yaml
seeds:
  ecommerce_analytics:
    country_codes:
      +column_types:
        country_code: varchar(2)
        postal_code: varchar(10)     # 强制保持字符串文本，防止丢失前导零
        is_eu_member: boolean
```

### 三、在模型中像引用表一样引用 Seed
在后续的 dbt SQL 模型中，直接使用 `{{ ref('seed_file_name') }}` 即可安全引用：
```sql
-- models/staging/stg_customers.sql
SELECT
    c.customer_id,
    c.country_code,
    coalesce(cc.country_name, 'Unknown') AS country_name,
    cc.is_eu_member
FROM {{ source('raw_store', 'customers') }} AS c
LEFT JOIN {{ ref('country_codes') }} AS cc
    ON c.country_code = cc.country_code
```

### 四、Seed 使用红线纪律
1. **数据体量红线**：只适合放置小微型参考表（通常建议低于 5,000 行，文件小于 10MB）；
2. **严禁包含敏感机密数据**：严禁在 CSV 中放置真实用户的个人手机号、身份证或薪酬机密，因为这些 CSV 会被提交到代码仓库！""",
            difficulty=2,
            tips=[
                tip("快速重载命令", "运行 `dbt seed --full-refresh` 会先删除旧物理表再全量重建，保证数据与 CSV 文件完全 100% 镜像同步。")
            ]
        ),
        lesson(
            "dbt-l3-7",
            "实战拆解：从零搭建规范 dbt 项目与健康检查自查清单",
            """### 一、从零初始化规范 dbt 项目完整实操全景
**【环境说明】**：以本地零依赖、性能狂暴的 DuckDB 为引擎，演示端到端初始化规范流程：

**第 1 步：创建虚拟环境并安装适配器**：
```bash
python -m venv venv
source venv/bin/activate  # Windows: .\\venv\\Scripts\\activate
pip install dbt-core dbt-duckdb
```

**第 2 步：初始化项目与目录解构**：
```bash
dbt init my_modern_dw
# 交互式选择数据库适配器 duckdb
cd my_modern_dw
```

**第 3 步：配置本地凭证与环境隔离**：
编辑 `~/.dbt/profiles.yml`：
```yaml
my_modern_dw:
  target: dev
  outputs:
    dev:
      type: duckdb
      path: "warehouse.duckdb"
      schema: main
```

**第 4 步：注入静态字典种子并测试全链路连通性**：
在 `seeds/order_status_lookup.csv` 写入：
```csv
status_code,status_label,is_terminal
1,待支付,false
2,已发货,false
3,已完成,true
4,已取消,true
```
执行连通性自检与种子入库：
```bash
dbt debug    # 校验网络、配置与环境（必须全部通过输出 All checks passed!）
dbt seed     # 在本地 DuckDB 中构建 order_status_lookup 物理表
```

---
### 二、dbt 工程环境初始化自查清单
1. [ ] **依赖完备**：`dbt --version` 确认已安装 `dbt-core` 及对应数据库适配器插件？
2. [ ] **连接健康**：运行 `dbt debug` 是否全绿灯通过（Connection test: OK）？
3. [ ] **凭证隔离**：生产密码是否已通过 `env_var` 隔离，确保 `profiles.yml` 未误提交入 Git 仓库？
4. [ ] **层级配置**：`dbt_project.yml` 中模型根路径名是否与 `name` 严格保持一致？""",
            difficulty=2,
            tips=[
                tip("dbt debug 报错排查第一步", "如果 `dbt debug` 提示 `Could not find profile`，检查 `dbt_project.yml` 里的 `profile: xxx` 字符串是否与 `~/.dbt/profiles.yml` 最外层的键名 100% 严格一致（区分大小写！）。")
            ]
        )
    ]

    c3_exercises = [
        single_choice(
            "dbt-c3-e1",
            "在现代分析工程架构中，dbt 客户端自身不承担任何重度数据计算，而是采用‘算力推下 (Push-down Computation)’机制。这种机制的最主要优势是：",
            [
                {"label": "数据不需要在网络间来回搬运，直接在企业安全边界内利用数仓本地高并发列存引擎进行高效原地计算，极大保障了性能与数据合规", "value": "A"},
                {"label": "让工程师不再需要向云数仓支付任何账单费用", "value": "B"},
                {"label": "可以使得单台电脑在没有联网的情况下直接操作远程 Snowflake 集群", "value": "C"},
                {"label": "能够自动将所有 SQL 查询转换为手机 App 界面", "value": "D"},
            ],
            "A",
            "算力推下使数据完全停留在数仓原地计算，消除了大数据在外部服务器间长距离网络传输的瓶颈，兼具顶尖性能与最高数据主权安全性。",
            difficulty=1,
            related_lesson_id="dbt-l3-1",
            tags=["算力推下", "Push-down", "dbt架构"],
        ),
        single_choice(
            "dbt-c3-e2",
            "在大型企业团队协作开发时，为了彻底防止数据库账号密码和机密凭证被意外提交泄露到公开 Git 代码仓库，dbt 在架构设计上强制采取的安全防范措施是：",
            [
                {"label": "将包含数据库连接凭据的 `profiles.yml` 默认存放在操作系统的用户主目录下 (`~/.dbt/`)，与工程代码仓库做严格的物理路径解耦隔离", "value": "A"},
                {"label": "强制所有员工每天下班后更换一次电脑硬盘", "value": "B"},
                {"label": "禁止在 SQL 中使用 WHERE 和 GROUP BY 关键词", "value": "C"},
                {"label": "要求所有的数据库连接必须使用空白密码", "value": "D"},
            ],
            "A",
            "dbt 将项目模型逻辑（放在 git 仓库里的 dbt_project.yml）与个人/环境凭证（存放在系统用户家目录的 profiles.yml）做物理隔离，从根本上杜绝了敏感密码被 git push 泄漏的风险。",
            difficulty=1,
            related_lesson_id="dbt-l3-5",
            tags=["profiles.yml", "机密安全", "隔离原则"],
        ),
        single_choice(
            "dbt-c3-e3",
            "在 `dbt_project.yml` 配置文件中，针对模型配置层级（如 `+materialized: table`），配置属性键名前面带有一个加号 `+` 的主要原因是：",
            [
                {"label": "用来明确区分哪些是目录层级/模型名称，哪些是需要层级级联向下继承覆盖的配置指令 (Configuration Keys)", "value": "A"},
                {"label": "表明该配置项必须执行浮点数加法运算", "value": "B"},
                {"label": "加号表示这个配置项只在周末生效", "value": "C"},
                {"label": "这是 Python 语法强制要求的关键字前缀", "value": "D"},
            ],
            "A",
            "在 dbt_project.yml 中，无加号的代表项目模型目录层级（如 staging, marts），带加号的前缀（如 +materialized, +schema）代表施加在当前层级及子层级上的配置指令。",
            difficulty=2,
            related_lesson_id="dbt-l3-4",
            tags=["dbt_project.yml", "YAML规范", "配置继承"],
        ),
        single_choice(
            "dbt-c3-e4",
            "关于 dbt 提供的静态数据种子功能 (`dbt seed`)，下列场景中最为合理适用的最佳实践是：",
            [
                {"label": "将 200 行的国家代码与洲别对照字典表 (`country_codes.csv`) 存入 seeds/ 目录，纳入 Git 版本控制并一键加载入仓", "value": "A"},
                {"label": "将包含 5000 万行用户全量交易订单的 CSV 文件通过 dbt seed 直接导入数仓", "value": "B"},
                {"label": "将所有员工的身份证号与个人银行卡明文密码通过 seed 提交入开源仓库", "value": "C"},
                {"label": "用 dbt seed 代替每小时产生的传感器高频物联网时序日志流", "value": "D"},
            ],
            "A",
            "dbt seed 是专为低频变动、小体量（通常<5000行）的静态码表、映射字典设计的。海量业务数据或流数据必须走正常的摄取流水线，绝不能当做 seed 挤占代码仓库。",
            difficulty=2,
            related_lesson_id="dbt-l3-6",
            tags=["dbt seed", "最佳实践", "静态字典"],
        ),
        single_choice(
            "dbt-c3-e5",
            "当分析工程师刚完成 dbt 项目初始化或连接配置修改后，用于一键全面体检当前开发环境、数据库连通性以及凭证解析是否健康的最权威官方诊断命令是：",
            [
                {"label": "dbt debug", "value": "A"},
                {"label": "dbt test", "value": "B"},
                {"label": "dbt clean", "value": "C"},
                {"label": "dbt snapshot", "value": "D"},
            ],
            "A",
            "`dbt debug` 会完整校验当前 Git 仓库状态、dbt_project.yml 语法、profiles.yml 配置解析以及与数仓的真实网络握手连接，输出清晰的排错诊断报告。",
            difficulty=1,
            related_lesson_id="dbt-l3-7",
            tags=["dbt debug", "环境自检", "核心命令"],
        ),
        single_choice(
            "dbt-c3-e6",
            "在 dbt 项目中，执行 `dbt compile` 或 `dbt run` 之后会自动生成一个 `target/` 目录。关于该目录的工程管理规范，下列描述正确的是：",
            [
                {"label": "target/ 目录属于本地编译与运行生成的临时物理产物，必须被加入 `.gitignore`，严禁提交到远程 Git 代码仓库", "value": "A"},
                {"label": "开发者必须每天手动修改 target/ 内部的 SQL 并提交推送到生产库", "value": "B"},
                {"label": "target/ 目录存放的是数仓的底层备份文件，删除会导致数据永久丢失", "value": "C"},
                {"label": "target/ 目录必须每小时通过邮件附件发送给项目经理审批", "value": "D"},
            ],
            "A",
            "target/ 目录是 dbt 的中间临时编译结果（类似 C 语言的 obj/bin 目录），会随每次运行动态生成或覆盖，必须加入 .gitignore 忽略管理。",
            difficulty=1,
            related_lesson_id="dbt-l3-3",
            tags=["target目录", "gitignore", "工程规范"],
        ),
        multiple_choice(
            "dbt-c3-e7",
            "在一个标准成熟的 `profiles.yml` 凭证配置文件中，通常需要明确定义哪些关键要素？（多选）",
            [
                {"label": "数仓连接类型（如 `type: snowflake` 或 `type: duckdb`）", "value": "A"},
                {"label": "当前开发使用的默认目标环境（如 `target: dev`）", "value": "B"},
                {"label": "开发环境 (`dev`) 与生产环境 (`prod`) 的隔离输出配置集合 (`outputs`)", "value": "C"},
                {"label": "开发者的本地隔离 Schema（如 `schema: dbt_zhangsan`），防止污染全局生产表", "value": "D"},
                {"label": "开发者个人家中宽带路由器的 Wi-Fi 登录密码", "value": "E"},
            ],
            ["A", "B", "C", "D"],
            "profiles.yml 负责规范数据库类型、连接凭据、多目标环境定义以及个人隔离 schema。E 属于无关离谱项。",
            difficulty=2,
            related_lesson_id="dbt-l3-5",
            tags=["profiles.yml", "多环境隔离", "环境配置"],
        ),
        multiple_choice(
            "dbt-c3-e8",
            "下列关于 dbt Core 与 dbt Cloud 两大发行形态的对比中，正确的有：（多选）",
            [
                {"label": "dbt Core 是开源且免费的 Python 命令行工具，可以无缝运行在个人电脑、Docker 容器或自建 Airflow 集群中", "value": "A"},
                {"label": "dbt Cloud 是官方商业托管的 SaaS 平台，提供了免配本地环境的 Web IDE、托管调度器与 Slim CI 自动化", "value": "B"},
                {"label": "无论使用 dbt Core 还是 dbt Cloud，底层所编写的 SQL 模型、Jinja 宏与测试语法 100% 完全通用兼容", "value": "C"},
                {"label": "dbt Core 无法连接到任何云端数据库，只能在本地单机运行", "value": "D"},
                {"label": "拥有自主研发运维能力与内网隔离合规要求的成熟工程团队，常常选用 dbt Core 配合 Airflow 搭建完全自主可控的数据平台", "value": "E"},
            ],
            ["A", "B", "C", "E"],
            "dbt Core 是强大的开源内核，可以通过各云厂商适配器连接任何云端数仓（D 错误）；二者语法完全通用，A、B、C、E 均准确反映了两者定位。",
            difficulty=2,
            related_lesson_id="dbt-l3-2",
            tags=["dbtCore", "dbtCloud", "技术选型对比"],
        ),
        judge(
            "dbt-c3-e9",
            "在生产部署环境中，为了符合企业数据安全审计规范，严禁在 `profiles.yml` 中直接硬编码明文密码，而应使用 `{{ env_var('DBT_PASSWORD') }}` 语法从操作系统安全环境变量中动态读取密码。",
            "正确",
            "正确。使用 `env_var` 宏动态读取环境变量是生产环境机密管理的金科玉律，能彻底防范机密泄漏并满足 DevSecOps 合规要求。",
            difficulty=1,
            related_lesson_id="dbt-l3-5",
            tags=["环境变量", "env_var", "安全规范"],
        ),
        judge(
            "dbt-c3-e10",
            "在 dbt 项目中，`dbt_project.yml` 文件中声明的项目名称 (`name: my_project`) 可以与 `models:` 配置块下的根命名空间完全不一致，dbt 会自动通过模糊拼音进行自动匹配绑定。",
            "错误",
            "错误！`models:` 下的顶级配置键名必须与顶部的 `name` 字符串严格完全一致（大小写完全相同），否则 dbt 会抛出配置解析异常，无法对任何模型施加配置规则。",
            difficulty=2,
            related_lesson_id="dbt-l3-4",
            tags=["配置绑定", "项目命名", "避坑要点"],
        ),
        fill(
            "dbt-c3-e11",
            "在初始化或构建 dbt 工程时，用于在当前目录下快速脚手架生成标准项目目录结构的 CLI 交互式命令为 `dbt [blank1]`；而用于在数仓中将 seeds/ 目录下的 CSV 文件物化为物理表的命令为 `dbt [blank2]`。",
            [["init"], ["seed"]],
            "项目初始化使用 `dbt init`；加载静态种子数据使用 `dbt seed`。",
            difficulty=1,
            related_lesson_id="dbt-l3-7",
            tags=["dbt命令", "CLI基础", "填空题"],
        ),
        fill(
            "dbt-c3-e12",
            "在 `profiles.yml` 中，如果需要声明从当前运行环境的系统变量中读取名为 `WAREHOUSE_SECRET` 的敏感密码，应使用的 dbt Jinja 核心宏表达式为 `{{ [blank1]('WAREHOUSE_SECRET') }}`。",
            [["env_var"]],
            "读取环境变量的专用内置宏为 `env_var`，语法为 `{{ env_var('VARIABLE_NAME') }}`。",
            difficulty=2,
            related_lesson_id="dbt-l3-5",
            tags=["env_var", "内置宏", "填空题"],
        ),
        open_ex(
            "dbt-c3-e13",
            "【dbt 工程架构配置大作业】企业级多环境 profiles.yml 与 dbt_project.yml 规范化设计实战",
            """你作为某拟上市跨境金融科技公司的数据平台负责人，正在为团队搭建全新规范的 dbt Core 项目基础设施。
团队技术底座与开发管理规范如下：
1. **项目基础属性**：
   - 项目名称：`fintech_dbt_dw`；
   - 适配数据库：基于云端高性能 Snowflake（本地开发阶段支持 DuckDB 作为备选）；
2. **多环境分权分立要求**：
   - **本地开发环境 (`dev`)**：
     - 分析师各自在独立本地环境调试，所有模型默认写入个人专属 Schema（统一格式为 `dbt_<developer_username>`，如 `dbt_steven`）；
     - 为了追求快速调试迭代与最低计算成本，开发环境全局默认物化为 `view`（轻量视图）；
   - **生产发布环境 (`prod`)**：
     - 只运行在托管的 Airflow / CI/CD 机器上；
     - 数据库账户名固定为 `PROD_TRANSFORMER_SVC`，密码必须从环境变量 `DBT_SNOWFLAKE_PROD_PW` 安全动态读取；
     - 默认物化策略必须全局提升为 `table`（物理表）；
3. **数仓分层覆盖策略**：
   - 贴源层模型（存放在 `models/staging/` 目录下）：无论开发还是生产环境，必须强制固定物化为 `view`；
   - 业务集市模型（存放在 `models/marts/` 目录下）：在生产环境中必须强制物化为 `table`，并自动写入目标 `marts` Schema；
4. **静态码表种子**：
   - 团队维护一份 `seeds/iso_currency_codes.csv`（国际货币代码与汇率基准表），其中的 `currency_code` 必须显式声明为 `varchar(3)` 避免截断。

**【任务要求】**：
(1) 请完整手写出符合上述规范的 `dbt_project.yml` 核心配置代码（涵盖项目命名、profile 绑定、models 分层物化覆盖以及 seeds 字段类型声明）；
(2) 请完整手写出存储在个人家目录的 `profiles.yml` 核心配置代码（包含 `dev` 与 `prod` 两个目标的 Snowflake 差异化配置与环境变量注入）；
(3) 当新入职分析师配置完上述文件后，应指导其按顺序执行哪两组 dbt 核心命令来验证“网络配置全健康通过”并“将静态货币码表加载入库”？""",
            """【标准配置代码与操作指南】

(1) 规范的 `dbt_project.yml` 配置：
```yaml
name: 'fintech_dbt_dw'
version: '1.0.0'
config-version: 2

# 绑定对应的 profile 名称
profile: 'fintech_snowflake_profile'

model-paths: ["models"]
analysis-paths: ["analyses"]
test-paths: ["tests"]
seed-paths: ["seeds"]
macro-paths: ["macros"]
snapshot-paths: ["snapshots"]

clean-targets:
  - "target"
  - "dbt_packages"

# 分层模型物化与 Schema 规则
models:
  fintech_dbt_dw:
    # 全局默认：在开发环境继承 view，生产环境可被覆盖
    +materialized: view
    
    # Staging 层强制固定为轻量视图
    staging:
      +materialized: view
      +schema: staging

    # Marts 业务集市层在生产环境落地为物理表
    marts:
      +materialized: table
      +schema: marts

# 静态数据种子字段类型声明
seeds:
  fintech_dbt_dw:
    iso_currency_codes:
      +column_types:
        currency_code: varchar(3)
```

(2) 规范的 `~/.dbt/profiles.yml` 配置（物理隔离于 Git 之外）：
```yaml
fintech_snowflake_profile:
  target: dev                            # 本地开发默认执行 dev
  outputs:
    # 开发者个人本地环境
    dev:
      type: snowflake
      account: "fintech_org.ap-east-1"
      user: "steven_developer"
      password: "{{ env_var('DBT_DEV_PASSWORD') }}"
      role: "ANALYST_DEV_ROLE"
      database: "FINTECH_DEV"
      warehouse: "DEV_XS_WH"
      schema: "dbt_steven"               # 个人隔离测试 Schema
      threads: 4

    # 自动化 CI / 生产调度环境
    prod:
      type: snowflake
      account: "fintech_org.ap-east-1"
      user: "PROD_TRANSFORMER_SVC"
      password: "{{ env_var('DBT_SNOWFLAKE_PROD_PW') }}"  # 安全注入环境变量！
      role: "ANALYTICS_PROD_ROLE"
      database: "FINTECH_PROD"
      warehouse: "PROD_TRANSFORM_WH"
      schema: "public"
      threads: 8
```

(3) 新人验证与初始化的标准化命令执行流：
1. **健康体检与连通性验证**：
   ```bash
   dbt debug
   ```
   - 作用：完整检查 Python 适配器、Git 环境、`dbt_project.yml` 解析、`profiles.yml` 密码注入以及能否与 Snowflake 云数仓成功建立网络握手，必须确保全部项输出绿色的 `OK`；
2. **载入静态货币字典种子**：
   ```bash
   dbt seed
   ```
   - 作用：根据 `dbt_project.yml` 声明的字段类型规范，在数仓中自动创建 `iso_currency_codes` 物理数据表并一次性注入 CSV 内容，供后续所有的汇率换算模型直接调用！""",
            [
                {"point": "规范手写出包含项目名绑定、Staging 与 Marts 差异化物化继承以及 Seed 字段类型约束的完整 dbt_project.yml", "score": 2},
                {"point": "正确编写多环境 profiles.yml，区分 dev 与 prod，并精准运用 env_var 注入生产敏感密码", "score": 1},
                {"point": "严格在 dev 环境配置个人专属隔离 schema (dbt_steven) 保障生产安全", "score": 1},
                {"point": "准确给出 dbt debug 与 dbt seed 核心验证与加载指令流", "score": 1},
            ],
            exemplar="""【企业级 dbt 基础设施配置文件】
一、dbt_project.yml：
name: 'fintech_dbt_dw'
version: '1.0.0'
config-version: 2
profile: 'fintech_snowflake_profile'
models:
  fintech_dbt_dw:
    +materialized: view
    staging:
      +materialized: view
      +schema: staging
    marts:
      +materialized: table
      +schema: marts
seeds:
  fintech_dbt_dw:
    iso_currency_codes:
      +column_types:
        currency_code: varchar(3)

二、~/.dbt/profiles.yml：
fintech_snowflake_profile:
  target: dev
  outputs:
    dev:
      type: snowflake
      account: "my_acc.region"
      user: "steven"
      password: "{{ env_var('DBT_DEV_PW') }}"
      role: "DEV_ROLE"
      database: "DEV_DB"
      warehouse: "DEV_WH"
      schema: "dbt_steven"
      threads: 4
    prod:
      type: snowflake
      account: "my_acc.region"
      user: "PROD_TRANSFORMER_SVC"
      password: "{{ env_var('DBT_SNOWFLAKE_PROD_PW') }}"
      role: "PROD_ROLE"
      database: "PROD_DB"
      warehouse: "PROD_WH"
      schema: "public"
      threads: 8

三、验证与加载操作流：
1. 运行 `dbt debug`：全面验证网络连通性与配置解析。
2. 运行 `dbt seed`：在数仓自动创建 iso_currency_codes 物理表并导入数据。""",
            difficulty=5,
            related_lesson_id="dbt-l3-7",
            tags=["dbt_project配置", "profiles隔离", "企业大作业", "初始化实践"],
        ),
    ]

    ch3 = chapter(
        "dbt-c3",
        "dbt-analytics-engineering",
        3,
        "dbt 核心架构与工程环境初始化",
        "掌握分析工程核心开发工具 dbt：算力推下 (Push-down) 原理、dbt Core vs dbt Cloud 选型、标准化项目目录骨架、dbt_project.yml 指令系统、profiles.yml 多环境凭证安全隔离、静态种子数据管理 (dbt seed) 与端到端健康检查自查清单。",
        c3_lessons,
        c3_exercises,
    )
    return ch3

if __name__ == "__main__":
    ch = get_chapter_3()
    print(f"Chapter 3 validated: {len(ch['lessons'])} lessons, {len(ch['exercises'])} exercises.")
