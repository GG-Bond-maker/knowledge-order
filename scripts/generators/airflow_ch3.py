# -*- coding: utf-8 -*-
"""Chapter 3: 传统 Operators 体系与跨系统连接"""

from common import (
    lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter
)

def get_chapter_3():
    lessons = [
        lesson(
            "airflow-l3-1",
            "Airflow 算子分类学：Action Operators, Transfer Operators 与 Sensors",
            """### 算子世界的三大家族

在 Airflow 生态中，存在着数以百计由官方和各大云厂商（AWS、Google Cloud、Azure、Snowflake）维护的算子（Operators）。
从**行为意图与系统交互**的维度，所有算子可以清晰划分为三大阵营：

```
                           Airflow Operators
                                   │
      ┌────────────────────────────┼────────────────────────────┐
      ▼                            ▼                            ▼
 Action Operators             Transfer Operators             Sensors
 (动作执行算子)                (跨系统传输算子)               (状态探测传感器)
 ├── BashOperator              ├── S3ToRedshiftOperator     ├── FileSensor
 ├── PythonOperator            ├── GCSToBigQueryOperator    ├── ExternalTaskSensor
 └── SQLExecuteQueryOperator   └── PostgresToS3Operator     └── SqlSensor
```

---

### 三大家族职责深度拆解

#### 1. Action Operators（动作执行算子）
- **职责**：在某个特定系统内部触发一段计算、执行一个命令或运行一段脚本。
- **特点**：有明确的执行开始与结束，主要关注“执行逻辑的输出或结果”。
- **代表**：`BashOperator`（跑终端脚本）、`PythonOperator`（跑本地函数）、`SQLExecuteQueryOperator`（在数仓内执行一段 SQL 转换）。

#### 2. Transfer Operators（跨系统传输算子）
- **职责**：专门负责在两个异构系统之间高效搬运数据（从 A 系统读，写入 B 系统）。
- **特点**：内置了特定跨源传输的最佳协议（如从 S3 高速 COPY 到 Snowflake，或从 MySQL 批量导出到 S3 数据湖）。
- **代表**：`PostgresToGCSOperator`、`S3ToSnowflakeOperator`。

#### 3. Sensors（传感器算子）
- **职责**：在指定系统或路径上持续“监听或轮询探测”，**直到某个条件满足（如文件已上传、上游外部 DAG 已跑完、SQL 查询返回数字 > 0）才放行下游任务**。
- **特点**：等待状态，不执行实质性的数据重写。
- **代表**：`FileSensor`、`HttpSensor`、`ExternalTaskSensor`。
""",
            difficulty=1,
            tips="记住三大家族的口诀：Action 负责‘干活’，Transfer 负责‘搬货’，Sensor 负责‘放哨站岗’！"
        ),
        lesson(
            "airflow-l3-2",
            "基础算子实战：`BashOperator` 与 `PythonOperator` 深度应用",
            """### 两大出镜率最高的基础算子

在日常数据工程开发中，`BashOperator` 和 `PythonOperator` 构成了 80% 自定义业务调度的基石。

---

### 1. `BashOperator` 进阶指南

`BashOperator` 用于执行 Shell 脚本、触发编译命令或调用本地二进制工具：

```python
from airflow.operators.bash import BashOperator

run_dbt_model = BashOperator(
    task_id='run_dbt_model',
    bash_command='dbt run --select fct_orders --profiles-dir /home/airflow/.dbt',
    env={'ENV': 'production'},      # 注入临时环境变量
    append_env=True,                 # 保留系统现有环境变量
)
```

⚠️ **Jinja 模板渲染陷阱（空格与脚本文件）**：
如果 `bash_command` 的字符串以 `.sh` 结尾，Airflow 会将其识别为一个本地脚本文件路径并尝试读取；
**如果你传递的是一段内联 bash 命令且末尾带参数，务必在末尾加一个空格**，防止 Airflow 误把命令当作文件查找导致 `TemplateNotFound` 报错！

---

### 2. `PythonOperator` 进阶指南与参数传递

`PythonOperator` 用于调用 Python 函数，支持传递参数与获取运行期元数据上下文：

```python
from airflow.operators.python import PythonOperator

def calculate_metrics(country, threshold, **context):
    # 1. 接收自定义入参
    print(f"正在计算国家: {country}, 阈值: {threshold}")
    
    # 2. 从 **context 中提取 Airflow 运行期核心上下文
    logical_date = context['logical_date']     # 当前批次的逻辑执行时间
    task_instance = context['task_instance']   # 当前 TaskInstance 对象
    print(f"当前调度批次逻辑时间: {logical_date}")
    
    # 3. 函数返回值会自动推送到 XCom
    return {"status": "success", "processed_records": 8800}

compute_task = PythonOperator(
    task_id='compute_country_metrics',
    python_callable=calculate_metrics,
    op_kwargs={'country': 'CN', 'threshold': 100},  # 关键字参数字典
)
```
""",
            difficulty=2,
            tips="在 PythonOperator 对应的 callable 函数中声明 `**context`，你可以像哆啦A梦口袋一样获取当前批次的所有调度时间戳、DAG 元数据与运行时信息！"
        ),
        lesson(
            "airflow-l3-3",
            "数据库交互算子：`SQLExecuteQueryOperator` 与数据库连接池管理",
            """### 淘汰旧算子，拥抱现代化通用 SQL 算子

在早期 Airflow 版本中，每种数据库都有专属算子（如 `PostgresOperator`, `MySqlOperator`, `SnowflakeOperator`），导致维护割裂。
在现代 Airflow（2.5+）中，官方推出了统一的通用数据库算子：**`SQLExecuteQueryOperator`**（位于 `airflow.providers.common.sql`）。

---

### 现代化 SQL 算子标准用法

```python
from airflow.providers.common.sql.operators.sql import SQLExecuteQueryOperator

execute_daily_rollup = SQLExecuteQueryOperator(
    task_id='execute_daily_rollup',
    conn_id='warehouse_postgres_conn',  # 引用 Airflow 中维护的数据库连接凭据
    sql='''
        INSERT INTO marts.daily_sales_summary (sales_date, total_revenue)
        SELECT 
            cast('{{ ds }}' as date) as sales_date,
            sum(amount) as total_revenue
        FROM staging.orders
        WHERE cast(order_time as date) = cast('{{ ds }}' as date);
    ''',
    # 也可以直接引用外置独立的 .sql 模板文件：
    # sql='dags/sqls/daily_sales_rollup.sql',
    autocommit=True
)
```

---

### 数据库连接池（Pools）与并发熔断保护

在大规模数仓作业中，同时有 50 个任务并发向同一台 PostgreSQL 或 MySQL 发送大查询，极易将数据库的连接池占满（Max connections reached），导致业务系统崩溃。
Airflow 提供了 **连接池（Pools）** 限流机制：
1. 在 Airflow Web 界面 `Admin -> Pools` 中创建一个连接池，例如 `postgres_pool`，设置 `Slot: 5`（最多同时允许 5 个任务跑查询）；
2. 在 Task 中声明：
```python
SQLExecuteQueryOperator(
    task_id='heavy_query',
    pool='postgres_pool',   # 声明所属连接池
    ...
)
```
当 5 个槽位被占满时，其他并发查询任务会自动在队列中等待释放，实现优雅削峰！
""",
            difficulty=2,
            tips="数据库操作千万不要写在 Python 函数里用 psycopg2 手动直连；使用 SQLExecuteQueryOperator + Pools 既安全合规，又具备连接池削峰保护！"
        ),
        lesson(
            "airflow-l3-4",
            "连接（Connections）与密钥存储：Web UI 配置、环境变量与安全审计",
            """### 严禁代码硬编码凭据：Airflow Connections 机制

在数据管道中，我们每天都要连接 MySQL、Snowflake、AWS S3、SFTP 等数十个外部系统。
**在 Python 脚本中硬编码用户名密码是极其严重的生产事故级别漏洞！**
Airflow 提供了 **Connections（连接凭据体系）**，将数据连接配置与代码逻辑彻底解耦。

---

### 1. 在 Web UI 集中维护连接
在控制台导航栏 `Admin -> Connections` 中点击新增：
- **Connection Id**：连接唯一代号（如 `dw_snowflake_prod`）；
- **Connection Type**：连接类型（如 `Snowflake`, `Postgres`, `HTTP`）；
- **Host / Schema / Login / Password / Port**：目标数据库网络信息；
- **Extra**：专有驱动扩展参数（如时区、SSL 证书配置、仓库名称等）。

在所有 Operator 中，只需传递 `conn_id='dw_snowflake_prod'`，系统会自动拉取凭证并在底层加密建立连接！

---

### 2. 通过环境变量注入连接（CI/CD 与容器化首选）

在现代 Kubernetes 或 Docker 部署中，我们不希望手动在 UI 界面点击录入，而是通过基础设施即代码（IaC）自动化配置。
Airflow 支持通过特定命名规范的环境变量直接注册 Connection：

```bash
# 格式规范: AIRFLOW_CONN_<CONN_ID的大写>
export AIRFLOW_CONN_MY_POSTGRES_DB='postgresql://db_user:secret_pwd@192.168.1.100:5432/analytics_db'
```
只要系统存在该环境变量，Airflow 就能无缝通过 `conn_id='my_postgres_db'` 读取到该配置，无需任何人工 UI 干预！

---

### 3. 企业级外部密钥保管库（Secrets Backends）
在金融与大型安全要求高的企业中，Airflow 支持集成 **HashiCorp Vault** 或 **AWS Secrets Manager**。凭证每次在运行期动态拉取，内存使用完毕立刻销毁，彻底消除静态密钥泄露风险。
""",
            difficulty=2,
            tips="永远不要把密码写在 DAG 脚本里！统一使用 `conn_id` 配合 UI 配置或 `AIRFLOW_CONN_*` 环境变量，打造符合 SOC2 安全审计规范的数据管道！"
        ),
        lesson(
            "airflow-l3-5",
            "跨系统数据搬运：S3FileTransformOperator 与云厂商 Providers 插件生态",
            """### 强大的开源生态：Airflow Providers 体系

在过去，Airflow 所有的云厂商插件都打包在同一个巨型包中。
从 Airflow 2.0 开始，社区对架构进行了彻底的微内核重构：**核心调度引擎与外部提供商（Providers）解耦！**

根据公司使用的技术栈，你可以像安装乐高积木一样按需通过 pip 安装官方维护的 Providers：
- `apache-airflow-providers-amazon`（AWS S3, Redshift, EMR, Athena）
- `apache-airflow-providers-google`（GCS, BigQuery, Dataproc）
- `apache-airflow-providers-snowflake`（Snowflake 数仓全套）
- `apache-airflow-providers-dbt-cloud`（dbt Cloud 官方调度对接）

---

### 跨系统传输算子实战：从 S3 卸载数据到 Snowflake

```python
from airflow.providers.snowflake.transfers.s3_to_snowflake import S3ToSnowflakeOperator

load_s3_to_warehouse = S3ToSnowflakeOperator(
    task_id='load_orders_s3_to_snowflake',
    snowflake_conn_id='snowflake_default',
    s3_keys=['raw/orders/{{ ds }}/orders.csv'],
    table='raw_orders',
    schema='staging',
    database='analytics',
    file_format="(type = 'CSV', field_delimiter = ',', skip_header = 1)",
    copy_options="ON_ERROR = 'CONTINUE'"
)
```

这种传输算子在底层会自动调用云数仓最高效的原生数据加载引擎（如 Snowflake 的 `COPY INTO`），耗时比通过 Python 中转读取快上百倍，且内存开销极低！
""",
            difficulty=2,
            tips="数据搬运尽量使用官方专属的 TransferOperator（如 S3ToSnowflake），不要自己用 pandas read_csv 再逐行 insert，效率有天壤之别！"
        ),
        lesson(
            "airflow-l3-6",
            "钩子（Hooks）底层设计：解耦“连接细节”与“业务逻辑”",
            """### Operator 背后的无名英雄：什么是 Hook？

很多工程师写了很久 Airflow，却从没接触过 Hook。其实，**所有数据库和云厂商 Operator 的底层，都在使用 Hook！**

```
 ┌────────────────────────────────────────────────────────┐
 │ Operator（算子）                                      │
 │ - 负责编排的“表层逻辑”：关注参数校验、任务生命周期、重试   │
 └───────────────────────────┬────────────────────────────┘
                             │ (调用 execute 方法)
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ Hook（钩子）                                           │
 │ - 负责底层的“通信管道”：连接外部系统、管理 Socket/Session │
 │ - 封装底层 SDK 与网络协议 (如 boto3, psycopg2, snowflake)│
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
                      外部目标数据系统
```

---

### 为什么需要 Hook？

如果我们在自定义 Python 函数中需要连接数据库进行灵活查询，但又不想手写繁琐的获取凭据和建立连接代码：
**直接使用 Hook！**

```python
from airflow.providers.postgres.hooks.postgres import PostgresHook

def advanced_data_auditing():
    # 1. 实例化 Hook，自动从元数据库读取 'analytics_postgres' 的连接密码与主机
    pg_hook = PostgresHook(postgres_conn_id='analytics_postgres')
    
    # 2. 一行代码获取底层的标准 psycopg2 connection 对象
    conn = pg_hook.get_conn()
    
    # 3. 也可以直接调用 Hook 封装好的高层辅助方法
    records = pg_hook.get_records(sql="SELECT status, count(*) FROM staging.orders GROUP BY 1")
    for status, count in records:
        print(f"状态: {status}, 记录数: {count}")
```
Hook 替你接管了所有底层的连接打开、异常处理、连接池复用与安全鉴权！
""",
            difficulty=3,
            tips="记住架构分工：Operator 负责 Task 的构建与编排；Hook 负责与外部系统底层建立安全通信！在自定义 Python 函数中需要连数据库时，Hook 是你的最佳武器！"
        ),
        lesson(
            "airflow-l3-7",
            "编写自定义 Operator：继承 `BaseOperator` 与封装企业内部中间件",
            """### 当现成算子无法满足需求：开发企业级自定义 Operator

每个大型企业都有内部自研的中间件：
- 比如自研的分布式文件推送网关、私有短信/钉钉告警系统、专有大数据计算平台。
为了让全公司的分析工程师能够像使用官方算子一样开箱即用，数据架构师需要编写**自定义算子（Custom Operator）**。

---

### 开发自定义 Operator 的三步法

所有自定义算子必须直接或间接继承 `airflow.models.baseoperator.BaseOperator`：

```python
# plugins/operators/dingtalk_alert_operator.py
from airflow.models.baseoperator import BaseOperator
from airflow.utils.decorators import apply_defaults
import requests

class DingTalkAlertOperator(BaseOperator):
    # 声明支持 Jinja 模板渲染的字段名称
    template_fields = ('message_text',)
    ui_color = '#e0f2fe'  # 在 Web UI 图谱中显示的定制背景色

    def __init__(self, webhook_token, message_text, **kwargs):
        super().__init__(**kwargs)
        self.webhook_token = webhook_token
        self.message_text = message_text

    def execute(self, context):
        # execute 是算子的核心执行入口
        self.log.info("准备向钉钉群发送通知...")
        
        # 此时 self.message_text 已经被 Airflow 引擎用 Jinja 渲染完毕！
        url = f"https://oapi.dingtalk.com/robot/send?access_token={self.webhook_token}"
        payload = {
            "msgtype": "text",
            "text": {"content": f"【数仓调度通知】: {self.message_text}"}
        }
        
        response = requests.post(url, json=payload, timeout=10)
        if response.status_code != 200:
            raise ValueError(f"钉钉接口调用失败: {response.text}")
            
        self.log.info("钉钉通知发送成功！")
        return response.json()
```

#### 在 DAG 中优雅复用：
```python
send_ding_msg = DingTalkAlertOperator(
    task_id='alert_team',
    webhook_token='sec-abcdef123456',
    message_text='批次 {{ ds }} 订单清洗已圆满完成！'  # 自动支持 Jinja 渲染！
)
```
""",
            difficulty=3,
            tips="编写自定义算子关键点：1. 继承 BaseOperator；2. 在 execute(self, context) 中实现核心业务；3. 在 template_fields 元组中声明需要支持 Jinja 模板的属性！"
        )
    ]

    exercises = [
        single_choice(
            "airflow-c3-e1",
            "在 Airflow 的算子分类体系中，专门用于在两个异构存储或计算系统之间进行高效数据拷贝与迁移（如将 S3 数据直接导入到 Snowflake 中）的算子家族是：",
            [
                {"label": "Action Operators", "value": "A"},
                {"label": "Transfer Operators", "value": "B"},
                {"label": "Sensors", "value": "C"},
                {"label": "Branching Operators", "value": "D"}
            ],
            "B",
            "`Transfer Operators`（如 `S3ToSnowflakeOperator`, `PostgresToGCSOperator`）专门负责在两个异构数据源之间进行高速批量数据转移。",
            1,
            "airflow-l3-1",
            ["operators", "transfer-operators", "taxonomy"]
        ),
        single_choice(
            "airflow-c3-e2",
            "在 Airflow 架构中，负责在底层与外部数据库或外部云存储建立网络连接、管理 Session 与通信凭证的底层抽象构件是：",
            [
                {"label": "Hook（钩子）", "value": "A"},
                {"label": "Operator（算子）", "value": "B"},
                {"label": "Sensor（传感器）", "value": "C"},
                {"label": "Triggerer（触发器）", "value": "D"}
            ],
            "A",
            "`Hook` 是 Airflow 与外部系统通信的底层客户端抽象，Operator 负责上层任务编排，底层通过 Hook 与具体数据库或云 SDK 建立通信连接。",
            2,
            "airflow-l3-6",
            ["hook", "architecture", "abstraction"]
        ),
        single_choice(
            "airflow-c3-e3",
            "为了保障数据仓库的安全，严禁在 Python DAG 代码中明文写入数据库密码。在 Airflow 中通过环境变量注册名为 `prod_db` 的数据库连接时，标准的环境变量命名格式是：",
            [
                {"label": "AIRFLOW_CONN_PROD_DB", "value": "A"},
                {"label": "DB_CONN_PROD_DB", "value": "B"},
                {"label": "CONNECTION_PROD_DB_URL", "value": "C"},
                {"label": "AIRFLOW_SECRET_PROD_DB", "value": "D"}
            ],
            "A",
            "Airflow 约定的连接环境变量前缀为 `AIRFLOW_CONN_` 加上大写的连接代号，即 `AIRFLOW_CONN_PROD_DB`。",
            2,
            "airflow-l3-4",
            ["connections", "environment-variables", "security"]
        ),
        single_choice(
            "airflow-c3-e4",
            "当编写继承自 `BaseOperator` 的自定义算子时，如果希望让某个传入参数（如 `sql_script` 或 `message`）在执行前自动支持 Jinja 模板语法替换（例如解析 `{{ ds }}`），必须在类属性中进行声明的元组是：",
            [
                {"label": "template_fields", "value": "A"},
                {"label": "jinja_vars", "value": "B"},
                {"label": "rendered_inputs", "value": "C"},
                {"label": "dynamic_params", "value": "D"}
            ],
            "A",
            "`template_fields` 是 Airflow 引擎识别哪些实例属性需要进行 Jinja 模板渲染的官方规范元组声明。",
            2,
            "airflow-l3-7",
            ["custom-operator", "template_fields", "jinja"]
        ),
        multiple_choice(
            "airflow-c3-e5",
            "关于现代 Airflow 官方推荐的通用数据库操作算子 `SQLExecuteQueryOperator`，下列说法正确的有：",
            [
                {"label": "位于 `airflow.providers.common.sql` 提供商包中，统一替代了旧版碎片化的数据库专属算子", "value": "A"},
                {"label": "可以通过 `conn_id` 引用在 Airflow 中统一托管的外部数据库安全凭据", "value": "B"},
                {"label": "`sql` 参数既可以接收内联 SQL 字符串，也可以直接指向外部独立的 `.sql` 模板文件路径", "value": "C"},
                {"label": "执行 SQL 时完全无法支持任何 Jinja 宏和时间上下文参数渲染", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 均为 SQLExecuteQueryOperator 的标准能力。D 错误，该算子的 sql 字段原生完全支持 Jinja 模板渲染。",
            2,
            "airflow-l3-3",
            ["sql-operator", "sqlexecutequeryoperator", "providers"]
        ),
        multiple_choice(
            "airflow-c3-e6",
            "在大规模并发调度环境中，为了防止数十个并发数据任务瞬间打垮目标业务数据库的连接池，可以采用的高可用防护手段包括：",
            [
                {"label": "在 Airflow Web 界面中创建连接池（Pools）并限制最大允许 Slot 槽位数", "value": "A"},
                {"label": "在需要限流的数据库 Task 中声明 `pool='my_db_pool'` 属性实现排队排期", "value": "B"},
                {"label": "为任务配置合理的重试等待时间与指数退避机制", "value": "C"},
                {"label": "强制让所有任务都在同一秒钟内同时启动以快速执行完毕", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 是科学且标准的并发限流与弹性容灾方案。D 会加剧数据库瞬间打满崩溃，属于严重反模式。",
            2,
            "airflow-l3-3",
            ["pools", "concurrency", "resilience"]
        ),
        multiple_choice(
            "airflow-c3-e7",
            "在自定义 PythonOperator 调用的函数中，声明 `**context` 可以获取到下列哪些 Airflow 运行期上下文元数据？",
            [
                {"label": "`context['logical_date']`：当前批次的逻辑调度时间点", "value": "A"},
                {"label": "`context['task_instance']`：当前任务实例（TaskInstance）对象", "value": "B"},
                {"label": "`context['dag']`：当前任务所属的 DAG 对象", "value": "C"},
                {"label": "`context['hacker_wallet']`：当前任务分配的比特币挖矿钱包", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 均为标准上下文变量。D 属于无稽之谈。",
            1,
            "airflow-l3-2",
            ["context", "python-operator", "runtime-metadata"]
        ),
        judge(
            "airflow-c3-e8",
            "在 Airflow 2.0+ 之后，所有的云厂商连接算子（如 AWS, GCP, Snowflake）都必须与 Airflow 核心调度器强绑定发布，无法通过 pip 单独安装升级提供商（Providers）包。",
            "错误",
            "Airflow 2.0 实施了 Providers 解耦架构，用户可以通过独立 pip 安装和升级 `apache-airflow-providers-*`，与核心调度版本解耦。",
            2,
            "airflow-l3-5",
            ["providers", "architecture", "decoupling"]
        ),
        judge(
            "airflow-c3-e9",
            "在 Python 业务函数内部需要查询数据库时，使用 `PostgresHook` 可以自动复用 Airflow 管理的安全凭证，无需手动硬编码主机、端口和密码。",
            "正确",
            "Hook 的核心设计目标就是接管底层网络连接与鉴权细节，通过 `conn_id` 自动拉取凭据建立连接，安全且标准化。",
            1,
            "airflow-l3-6",
            ["hook", "security", "credentials"]
        ),
        judge(
            "airflow-c3-e10",
            "在编写继承自 `BaseOperator` 的自定义算子时，任务的核心业务执行逻辑代码必须写在重写的 `execute(self, context)` 方法中。",
            "正确",
            "`execute(self, context)` 是 Airflow Worker 执行任务时调用的核心抽象方法入口。",
            1,
            "airflow-l3-7",
            ["custom-operator", "execute-method"]
        ),
        fill(
            "airflow-c3-e11",
            "在 Airflow 算子分类中，用于在特定系统上持续轮询探测直到某个条件就绪（如探测 S3 路径是否出现目标文件）的算子家族被称为 [BLANK1]（传感器）；其常用的基类名称是 [BLANK2]。",
            [["Sensors", "Sensor", "传感器"], ["BaseSensorOperator"]],
            "探测状态的算子属于 Sensors，基类为 `BaseSensorOperator`。",
            1,
            "airflow-l3-1",
            ["sensors", "taxonomy"]
        ),
        fill(
            "airflow-c3-e12",
            "在 Airflow 中，为了防止数据库连接被瞬时大量任务打满，可以通过 Web 界面创建 [BLANK1]（连接池）并为任务指定槽位数；在自定义算子中，声明允许支持 Jinja 渲染的字段元组名称是 [BLANK2]。",
            [["Pools", "Pool", "连接池"], ["template_fields"]],
            "通过 Pools 控制限流；通过 `template_fields` 声明支持模板渲染的属性名。",
            2,
            "airflow-l3-3",
            ["pools", "template_fields"]
        ),
        open_ex(
            "airflow-c3-e13",
            "某企业需要开发一个自定义企业微信机器人通知算子 `WeComWebhookOperator`，用于在重要数据任务完成或失败时向企业微信群推送 Markdown 格式的告警消息。\n业务要求：\n1. 继承 `BaseOperator`；\n2. 构造函数接收 `webhook_key`（机器人的 key 凭证）和 `content`（消息正文）；\n3. 允许 `content` 字段支持 Jinja 模板渲染；\n4. 重写 `execute(self, context)` 方法，利用 `requests.post` 将消息以 markdown 类型发送至 `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=<webhook_key>`；若响应码非 200 或响应 JSON 中 `errcode != 0`，抛出异常。\n\n请编写出该自定义 Operator 类的完整 Python 代码。",
            "```python\nfrom airflow.models.baseoperator import BaseOperator\nimport requests\n\nclass WeComWebhookOperator(BaseOperator):\n    # 1. 声明允许 Jinja 渲染的字段\n    template_fields = ('content',)\n    ui_color = '#22c55e'\n\n    def __init__(self, webhook_key: str, content: str, **kwargs):\n        super().__init__(**kwargs)\n        self.webhook_key = webhook_key\n        self.content = content\n\n    def execute(self, context):\n        self.log.info(\"开始向企业微信群机器人发送 Markdown 消息...\")\n        url = f\"https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key={self.webhook_key}\"\n        payload = {\n            \"msgtype\": \"markdown\",\n            \"markdown\": {\n                \"content\": self.content\n            }\n        }\n\n        response = requests.post(url, json=payload, timeout=15)\n        if response.status_code != 200:\n            raise RuntimeError(f\"请求企业微信接口 HTTP 失败, 状态码: {response.status_code}, 内容: {response.text}\")\n\n        res_json = response.json()\n        if res_json.get('errcode') != 0:\n            raise ValueError(f\"企业微信返回业务错误: errcode={res_json.get('errcode')}, errmsg={res_json.get('errmsg')}\")\n\n        self.log.info(\"企业微信消息推送成功！\")\n        return res_json\n```",
            "自定义 Operator 完整开发考查：BaseOperator 继承、template_fields 声明、构造函数传参与 execute 业务实现及异常防御。",
            [
                {"point": "正确继承 BaseOperator 并声明 template_fields = ('content',)", "score": 2},
                {"point": "正确编写 __init__ 构造函数调用 super().__init__(**kwargs) 并保存 webhook_key 与 content", "score": 1},
                {"point": "在 execute(self, context) 中使用 requests.post 发送标准格式 json 并进行 HTTP 状态与 errcode 错误校验抛出异常", "score": 2}
            ],
            "继承 BaseOperator；声明 template_fields=('content',)；实现 __init__ 与 execute 方法；用 requests 发送 POST 并校验 status_code == 200 与 errcode == 0。",
            4,
            "airflow-l3-7",
            ["custom-operator", "wecom", "api-integration"]
        )
    ]

    return chapter(
        "airflow-c3",
        "airflow-data-engineering",
        3,
        "传统 Operators 体系与跨系统连接",
        "全面掌握 Action/Transfer/Sensors 算子分类体系，熟练运用现代化 SQLExecuteQueryOperator 与 Pools 熔断削峰，深入理解 Connections 凭据治理、Hook 底层通信机制与自定义 Operator 封装开发。",
        lessons,
        exercises
    )
