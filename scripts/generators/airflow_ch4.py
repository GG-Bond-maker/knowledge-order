# -*- coding: utf-8 -*-
"""Chapter 4: 现代 TaskFlow API 与 @task 装饰器"""

from common import (
    lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter
)

def get_chapter_4():
    lessons = [
        lesson(
            "airflow-l4-1",
            "TaskFlow API 革命：Airflow 2.0 对传统模板代码的范式重构",
            """### 传统 PythonOperator 的痛点与样板代码轰炸

在 Airflow 1.x 时代，编写一个最简单的 Python 数据管道，代码往往极其繁琐。工程师必须写出大量的模板样板代码（Boilerplate Code）：

```python
# 传统的 Airflow 1.x 模式（繁琐脆弱）
def extract(**context):
    return {"order_count": 100}

def transform(**context):
    # 必须手动从上游任务的 XCom 中拉取数据，需要记住上游 task_id
    val = context['task_instance'].xcom_pull(task_ids='extract_step')
    return val['order_count'] * 2

extract_task = PythonOperator(task_id='extract_step', python_callable=extract)
transform_task = PythonOperator(task_id='transform_step', python_callable=transform)
extract_task >> transform_task
```
#### 痛点：
1. **侵入性过强**：业务代码里充斥着 `context['task_instance'].xcom_pull(...)`，导致函数无法脱离 Airflow 在本地作为纯 Python 函数进行单元测试；
2. **重构极度脆弱**：一旦上游 `task_id` 改名，下游 `xcom_pull` 就会静默拿不到数据抛出 `NoneType` 异常；
3. **可读性极差**：数据在任务间流动的因果链条被隐藏在隐式字符串调用中。

---

### TaskFlow API 的诞生：重归原生 Python 体验

Airflow 2.0 引入了划时代的 **TaskFlow API**。
它的核心理念是：**让数据工程师像写最地道、最自然的 Python 函数一样写数据工作流！**
- 函数只需要添加一个 `@task` 装饰器，自动变为 Airflow Task；
- 任务间的数据流动，直接体现为普通的**函数传参和返回值（Function Call & Return）**；
- 底层的 XCom 传输与依赖关系生成，完全由 Airflow 编译器自动完成！
""",
            difficulty=1,
            tips="TaskFlow API 是现代 Airflow 最受欢迎的特性。它把繁琐的 PythonOperator 模板代码减少了 70%，并让数据流向一目了然！"
        ),
        lesson(
            "airflow-l4-2",
            "`@task` 装饰器核心用法：将原生 Python 函数秒变一流任务",
            """### `@task` 装饰器极速入门

使用现代 TaskFlow API，只需从 `airflow.decorators` 导入 `task`：

```python
from airflow.decorators import dag, task
from datetime import datetime

@dag(schedule='@daily', start_date=datetime(2024, 1, 1), catchup=False)
def simple_taskflow_pipeline():

    @task
    def extract_numbers():
        # 普通纯 Python 函数
        return [10, 20, 30]

    @task
    def calculate_sum(numbers: list):
        total = sum(numbers)
        print(f"总和为: {total}")
        return total

    # 像普通 Python 代码一样调用函数！
    raw_data = extract_numbers()
    result = calculate_sum(raw_data)

# 实例化 DAG
simple_taskflow_pipeline()
```

---

### 发生了什么魔法？
1. `@task` 会将原生的 Python 函数自动包装成一个底层由 `_PythonDecoratedOperator` 管理的任务节点；
2. 任务名称（`task_id`）默认**自动采用该 Python 函数的函数名**（例如 `extract_numbers`）；
3. 当你写下 `result = calculate_sum(raw_data)` 时，Airflow 会：
   - 自动在底层将 `extract_numbers` 产生的返回值写入 XCom；
   - 自动在 `calculate_sum` 执行时通过 XCom 将其作为入参注入；
   - **自动推导并建立 `extract_numbers >> calculate_sum` 的 DAG 依赖拓扑！**
""",
            difficulty=1,
            tips="用 `@task` 编写的函数就是标准的原生 Python 函数！在编写单元测试时，可以直接跳过 Airflow 环境直接进行断言校验！"
        ),
        lesson(
            "airflow-l4-3",
            "任务间数据流传（Data Passing）：函数返回值与参数自动绑定的黑魔法",
            """### 告别手动 xcom_push 与 xcom_pull

在 TaskFlow API 中，**“数据流即控制流”**。
通过函数的入参与出参，Airflow 在编译期就能精准识别任务拓扑：

```python
from airflow.decorators import task

@task
def extract_partner_sales():
    # 上游任务返回一个业务字典
    return {"partner": "Shopify", "gross_revenue": 50000.0, "tax_rate": 0.08}

@task
def calculate_net_income(sales_info: dict):
    # 下游任务直接以常规入参形式接收数据字典
    gross = sales_info['gross_revenue']
    tax = gross * sales_info['tax_rate']
    net = gross - tax
    return net

@task
def publish_to_bi(net_income: float):
    print(f"最终上报财务看板的净利润为: ${net_income}")
```

#### 编排调用链条：
```python
sales_data = extract_partner_sales()
net_income = calculate_net_income(sales_data)
publish_to_bi(net_income)
```

Airflow 在后台生成的拓扑图为：
`extract_partner_sales >> calculate_net_income >> publish_to_bi`！
没有任何字符串硬编码，没有任何底层 XCom API 泄露，一切浑然天成。
""",
            difficulty=2,
            tips="入参可以是标量数字、字符串、字典或列表。底层全部通过 JSON 序列化在 XCom 中流转，既保证了隔离性，又兼具极致的可读性！"
        ),
        lesson(
            "airflow-l4-4",
            "TaskFlow 时代的依赖编排：自然函数调用与位移运算符的和谐共存",
            """### 当数据不流转，如何声明执行顺序？

有时，两个任务之间**没有直接的数据入参传递**，但业务上必须要求 A 跑完才能跑 B（例如：任务 A 负责将文件上传到 S3，任务 B 负责在 Snowflake 中执行 SQL COPY 指令）。

在 TaskFlow API 中，你可以继续自由使用经典的位移运算符 `>>`：

```python
@dag(schedule='@daily', start_date=datetime(2024, 1, 1), catchup=False)
def hybrid_flow():

    @task
    def prepare_directory():
        print("创建本地暂存目录")

    @task
    def extract_data():
        return "data.csv"

    @task
    def upload_to_cloud(filename: str):
        print(f"将 {filename} 上传到对象存储")

    @task
    def clean_local_storage():
        print("清理本地文件")

    # 1. 混合自然函数调用
    file_ref = extract_data()
    upload_step = upload_to_cloud(file_ref)

    # 2. 结合位移运算符声明纯顺序依赖
    prepare_directory() >> file_ref
    upload_step >> clean_local_storage()
```

#### 拓扑图解析：
`prepare_directory >> extract_data >> upload_to_cloud >> clean_local_storage`
TaskFlow 的设计极为包容：**有数据传递用函数调用，纯顺序控制用 `>>` 补充，二者可以完美交融！**
""",
            difficulty=2,
            tips="函数调用的返回值代表任务的 XCom 抽象；即使没有传参，直接对函数调用结果使用 `>>`（如 `task_a() >> task_b()`）也能正确连接依赖！"
        ),
        lesson(
            "airflow-l4-5",
            "混合编排（Hybrid DAGs）：在同一个工作流中融合 `@task` 与经典 Operators",
            """### 现实工业界常态：TaskFlow 与传统算子混搭

在真实的企业数据工程项目中，我们很少能 100% 只用 `@task`。
因为官方和云厂商已经提供了极其高效的现有算子：
- 你不想在 `@task` 里面手写上传 S3 的代码，因为官方有完善的 `LocalFilesystemToS3Operator`；
- 你不想在 `@task` 里面手写几百行 SQL，因为官方有 `SQLExecuteQueryOperator`。

**混合编排（Hybrid Orchestration）** 是现代 Airflow 开发的标配技能！

---

### 实战：在同一个 DAG 中无缝串联

```python
from airflow.decorators import dag, task
from airflow.providers.common.sql.operators.sql import SQLExecuteQueryOperator
from datetime import datetime

@dag(schedule='@daily', start_date=datetime(2024, 1, 1), catchup=False)
def hybrid_enterprise_pipeline():

    # 1. 传统数据库算子 (创建目标临时表)
    create_table_step = SQLExecuteQueryOperator(
        task_id='create_staging_table',
        conn_id='postgres_dw',
        sql="CREATE TABLE IF NOT EXISTS staging.tmp_records (id int, val text);"
    )

    # 2. 现代 TaskFlow 算子 (复杂自定义清洗逻辑)
    @task
    def parse_api_payload():
        return [
            {"id": 1, "val": "alpha"},
            {"id": 2, "val": "beta"}
        ]

    # 3. 现代 TaskFlow 算子 (将数据格式化)
    @task
    def generate_insert_statement(payload: list):
        values = ", ".join([f"({row['id']}, '{row['val']}')" for row in payload])
        return f"INSERT INTO staging.tmp_records VALUES {values};"

    # 4. 执行混合连接
    parsed_data = parse_api_payload()
    insert_sql = generate_insert_statement(parsed_data)

    # 传统 Operator 接收 TaskFlow 产出的 XCom 字符串
    execute_insert_step = SQLExecuteQueryOperator(
        task_id='execute_insert',
        conn_id='postgres_dw',
        sql=insert_sql  # 直接注入 TaskFlow 产出的返回值！
    )

    # 编排全局拓扑
    create_table_step >> parsed_data
    insert_sql >> execute_insert_step

hybrid_enterprise_pipeline()
```
""",
            difficulty=2,
            tips="在 TaskFlow 中，传统 Operator 的输出可以通过 `.output` 属性传给 `@task`；而 `@task` 的返回值也可以直接赋给传统 Operator 的参数字段！"
        ),
        lesson(
            "airflow-l4-6",
            "多返回值（Multiple Outputs）：解构字典与元组返回值为独立下游输入",
            """### 一个任务产出多组业务数据：`multiple_outputs=True`

在数据处理中，经常有一个任务需要同时输出多个不同的维度结果：
- 比如特征工程任务需要同时产出 `train_data_path`、`test_data_path` 以及 `metadata_dict`；
- 如果下游的任务 A 只需要训练集，任务 B 只需要测试集。

默认情况下，函数返回一个字典会被整个作为单一 XCom 存储。
通过在装饰器中显式配置 **`multiple_outputs=True`**（或者在类型注解中返回 `dict`），Airflow 会**自动将字典的每一个 Key 解构为独立的 XCom 键**！

---

### 实战：多返回值解构示例

```python
from airflow.decorators import task

@task(multiple_outputs=True)
def split_user_dataset() -> dict:
    # 模拟数据拆分
    return {
        "train_set": "s3://bucket/data/train.parquet",
        "test_set": "s3://bucket/data/test.parquet",
        "record_count": 50000
    }

@task
def train_model(train_path: str):
    print(f"仅加载训练集进行模型拟合: {train_path}")

@task
def evaluate_model(test_path: str):
    print(f"仅加载验证集进行离线打分: {test_path}")

@task
def audit_sample_size(count: int):
    print(f"样本总数核查: {count} 行")

# 编排调用 (字典键名直接作为属性解构访问！)
data_bundle = split_user_dataset()

train_model(data_bundle['train_set'])
evaluate_model(data_bundle['test_set'])
audit_sample_size(data_bundle['record_count'])
```

#### 底层拓扑：
`split_user_dataset` 将分别并行扇出连接到 `train_model`、`evaluate_model` 与 `audit_sample_size`！
下游任务按需索取各自关心的字段，逻辑清晰解耦！
""",
            difficulty=2,
            tips="当函数返回字典且添加了 `multiple_outputs=True`（或返回类型提示为 `dict`）时，可以通过 `result['key']` 精确分发给不同的下游任务！"
        ),
        lesson(
            "airflow-l4-7",
            "进阶装饰器生态：`@task.docker`, `@task.kubernetes` 与多语言运行沙箱",
            """### 超越纯 Python：高级容器化任务装饰器

虽然 `@task` 极其优雅，但在企业级机器学习与大数据场景中，经常面临环境冲突问题：
- 任务 A 需要特定版本的 C 库依赖（如 GDAL、OpenCV）；
- 任务 B 是算法团队用 PyTorch 2.0 编写的，而宿主机是 Python 3.9。

Airflow TaskFlow 提供了强大的**容器化扩展装饰器**，无需繁琐编写 Docker/K8s YAML，直接以 Python 函数语法在独立沙箱中运行！

---

### 1. `@task.docker`：本地 Docker 容器隔离执行
```python
from airflow.decorators import task

@task.docker(
    image="python:3.10-slim",
    auto_remove=True,
    network_mode="bridge"
)
def compute_in_clean_container():
    import sys
    print(f"当前运行在独立干净的 Docker 容器中: {sys.version}")
    return "docker_done"
```

---

### 2. `@task.kubernetes`：云原生 Pod 沙箱弹性运行
```python
from airflow.decorators import task

@task.kubernetes(
    image="my-registry.company.com/ml-models/churn:v2.1",
    namespace="airflow-compute",
    in_cluster=True
)
def run_heavy_gpu_inference():
    import torch
    # 独占申请 GPU 算力并在容器中执行模型推理
    print("模型推理完毕")
    return {"accuracy": 0.94}
```

---

### 3. `@task.virtualenv`：轻量级动态隔离虚拟环境
如果不想启动重量级 Docker，只是临时需要一个带特殊 pip 包的环境：
```python
@task.virtualenv(
    requirements=["colorama==0.4.6", "scipy==1.10.1"],
    system_site_packages=False
)
def run_in_temp_venv():
    from colorama import Fore
    print(Fore.GREEN + "在临时虚拟环境中运行！")
```
每次运行时，Airflow 会自动在 Worker 上临时创建一个独立的 Python venv，执行完毕后自动销毁，彻底根除 pip 版本地狱！
""",
            difficulty=3,
            tips="利用 `@task.virtualenv`、`@task.docker` 和 `@task.kubernetes`，你可以在同一个 DAG 中随意调度不同 Python 版本与不同环境的计算任务！"
        )
    ]

    exercises = [
        single_choice(
            "airflow-c4-e1",
            "在 Airflow 2.0 引入的现代 TaskFlow API 规范中，将一个普通的 Python 函数声明为一流 Airflow 任务的标准装饰器是：",
            [
                {"label": "@task", "value": "A"},
                {"label": "@operator", "value": "B"},
                {"label": "@airflow_job", "value": "C"},
                {"label": "@pipeline_node", "value": "D"}
            ],
            "A",
            "`@task`（来自 `airflow.decorators`）是现代 TaskFlow API 声明任务的核心标准装饰器。",
            1,
            "airflow-l4-2",
            ["taskflow", "task-decorator", "syntax"]
        ),
        single_choice(
            "airflow-c4-e2",
            "在 TaskFlow API 中，两个任务之间通过“函数调用与返回值传递”（例如 `data = task_a(); task_b(data)`）进行编排时，Airflow 底层会自动：",
            [
                {"label": "通过 XCom 传递数据并自动建立 `task_a >> task_b` 的依赖拓扑", "value": "A"},
                {"label": "将两个函数合并为单进程单线程执行，忽略 DAG 图结构", "value": "B"},
                {"label": "在本地磁盘的 /tmp 目录生成一个名为 data 的文本文件", "value": "C"},
                {"label": "直接抛出语法错误，要求必须手写位移运算符 `>>`", "value": "D"}
            ],
            "A",
            "TaskFlow 的精髓是“数据流自动映射控制流”：通过入参传递自动在底层挂载 XCom 关联，并自动生成 DAG 的先后执行依赖。",
            1,
            "airflow-l4-3",
            ["taskflow", "data-passing", "xcom"]
        ),
        single_choice(
            "airflow-c4-e3",
            "当一个 `@task` 装饰的 Python 函数返回一个包含多个字段的字典，且希望下游的不同任务分别只接收其中特定的键值时，应在装饰器中配置的属性是：",
            [
                {"label": "multiple_outputs=True", "value": "A"},
                {"label": "split_keys=True", "value": "B"},
                {"label": "enable_dict_unpack=True", "value": "C"},
                {"label": "fanout=True", "value": "D"}
            ],
            "A",
            "设置 `multiple_outputs=True`（或返回类型提示为 dict），Airflow 会自动将字典的每个 key 解构为独立的 XCom，支持 `res['key_name']` 细粒度下游分发。",
            2,
            "airflow-l4-6",
            ["multiple-outputs", "task-decorator", "xcom"]
        ),
        single_choice(
            "airflow-c4-e4",
            "如果某个任务仅需要安装一两个特定的第三方 pip 包（例如 `scipy==1.10.1`），而不希望污染 Worker 主机的全局 Python 环境，最轻量级且无需拉起 Docker 的高级装饰器是：",
            [
                {"label": "@task.virtualenv", "value": "A"},
                {"label": "@task.docker", "value": "B"},
                {"label": "@task.kubernetes", "value": "C"},
                {"label": "@task.conda", "value": "D"}
            ],
            "A",
            "`@task.virtualenv` 能够在运行时自动创建干净隔离的临时 Python 虚拟环境，按需安装指定的 requirements，执行完自动回收。",
            2,
            "airflow-l4-7",
            ["task-virtualenv", "isolation", "environments"]
        ),
        multiple_choice(
            "airflow-c4-e5",
            "相比 Airflow 1.x 传统的 `PythonOperator`，现代 TaskFlow API 带来的巨大改进包括：",
            [
                {"label": "大幅消除模板样板代码，代码行数精简 50% 以上", "value": "A"},
                {"label": "无需在业务函数内部强耦合编写 `context['task_instance'].xcom_pull`", "value": "B"},
                {"label": "函数保持纯净的原生 Python 语义，便于脱离 Airflow 环境直接进行 pytest 本地单测", "value": "C"},
                {"label": "彻底消除了对元数据数据库 PostgreSQL 的依赖", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 均为 TaskFlow API 革命性体验提升。D 错误，底层状态机与元数据库依然必不可少。",
            1,
            "airflow-l4-1",
            ["taskflow-benefits", "pythonic", "testability"]
        ),
        multiple_choice(
            "airflow-c4-e6",
            "关于在同一个工作流中将 TaskFlow 任务（`@task`）与传统 Operator（如 `SQLExecuteQueryOperator`）进行混合编排，下列说法正确的有：",
            [
                {"label": "传统算子的输出结果可以通过 `.output` 属性传给 `@task` 函数作为入参", "value": "A"},
                {"label": "`@task` 函数的返回值可以直接作为参数赋值给传统算子的参数（如 sql 字段）", "value": "B"},
                {"label": "依然可以自由使用位移运算符 `>>` 为它们连接纯时间先后依赖", "value": "C"},
                {"label": "官方强制要求一个 DAG 只能纯用 `@task` 或纯用传统算子，二者严禁混用", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 正确。D 错误，混合编排是官方强烈鼓励且工业界广泛使用的最佳实践方案。",
            2,
            "airflow-l4-5",
            ["hybrid-dags", "mixing-operators", "best-practices"]
        ),
        multiple_choice(
            "airflow-c4-e7",
            "在现代 Airflow 中，下列属于 TaskFlow 进阶容器化与沙箱运行装饰器的有：",
            [
                {"label": "`@task.docker`：在指定的 Docker 容器镜像内运行函数代码", "value": "A"},
                {"label": "`@task.kubernetes`：在云原生 Kubernetes 独立 Pod 中执行任务", "value": "B"},
                {"label": "`@task.virtualenv`：在动态创建的临时 Python 虚拟环境中执行代码", "value": "C"},
                {"label": "`@task.magic`：自动将代码发送给外星超级计算机求解", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 均为官方支持的容器化与多环境隔离装饰器。D 为胡编乱造。",
            2,
            "airflow-l4-7",
            ["task-decorators", "containerization", "kubernetes"]
        ),
        judge(
            "airflow-c4-e8",
            "在 TaskFlow API 中，被 `@task` 装饰的函数名称（Function Name）默认会自动作为该任务在 DAG 图中的 `task_id`。",
            "正确",
            "Airflow 默认将函数名提取为 `task_id`，若需要自定义，也可以在装饰器参数中显式指定，如 `@task(task_id='custom_name')`。",
            1,
            "airflow-l4-2",
            ["task_id", "naming", "taskflow"]
        ),
        judge(
            "airflow-c4-e9",
            "在 TaskFlow API 中，如果两个任务之间没有直接的数据参数传递，就绝对无法使用位移运算符 `>>` 来指定它们的执行先后依赖关系。",
            "错误",
            "TaskFlow API 与 `>>` 完美兼容。对于无数据传递的纯执行先后控制，直接写 `task_a() >> task_b()` 即可。",
            1,
            "airflow-l4-4",
            ["dependencies", "bitshift", "compatibility"]
        ),
        judge(
            "airflow-c4-e10",
            "使用 `@task.docker` 装饰器时，宿主机 Worker 必须已安装并运行 Docker 守护进程，否则任务将因无法连接 Docker 引擎而报错。",
            "正确",
            "`@task.docker` 依赖底层的 Docker API 在宿主机上拉取镜像和启动容器，必须保证 Docker 守护进程正常可用。",
            2,
            "airflow-l4-7",
            ["docker-task", "prerequisites"]
        ),
        fill(
            "airflow-c4-e11",
            "在现代 Airflow 中，声明 DAG 与 Task 的装饰器分别来自模块 [BLANK1]，其中用于声明 DAG 上下文的装饰器名称是 [BLANK2]。",
            [["airflow.decorators"], ["@dag", "dag"]],
            "现代装饰器位于 `airflow.decorators`，包含 `@dag` 和 `@task`。",
            1,
            "airflow-l4-2",
            ["decorators", "airflow.decorators"]
        ),
        fill(
            "airflow-c4-e12",
            "当希望某个 `@task` 函数返回的字典能被下游多个任务按字典键名单独引用时，应在装饰器参数中开启 [BLANK1]=True；临时创建独立 Python 虚拟环境的装饰器是 @task.[BLANK2]。",
            [["multiple_outputs"], ["virtualenv"]],
            "配置 `multiple_outputs=True` 解构字典；使用 `@task.virtualenv` 创建临时独立环境。",
            2,
            "airflow-l4-6",
            ["multiple_outputs", "virtualenv"]
        ),
        open_ex(
            "airflow-c4-e13",
            "某电商团队需要重构一个传统的订单风控流水线。原逻辑包含三个步骤：\n1. `extract_orders`：拉取当日高额订单，返回字典 `{'orders': [101, 102, 103], 'audit_timestamp': '2024-05-01T12:00:00'}`；\n2. `score_fraud`：接收订单 ID 列表，逐一计算风控欺诈分，返回被拦截的高危订单列表（例如 `[102]`）；\n3. `notify_security`：接收高危订单列表与审计时间戳，打印报警日志。\n\n请使用现代 TaskFlow API（包含 `@dag` 与 `@task` 装饰器、类型提示、`multiple_outputs=True`）完整实现该数据工作流，展示出地道、纯净的 Python 式数据流传递风格。",
            "```python\nfrom datetime import datetime, timedelta\nfrom airflow.decorators import dag, task\n\ndefault_args = {\n    'owner': 'risk_team',\n    'retries': 2,\n    'retry_delay': timedelta(minutes=3),\n}\n\n@dag(\n    dag_id='fraud_detection_taskflow',\n    default_args=default_args,\n    schedule='@hourly',\n    start_date=datetime(2024, 1, 1),\n    catchup=False,\n    tags=['risk', 'taskflow']\n)\ndef fraud_detection_pipeline():\n\n    # 1. 抽取任务：开启 multiple_outputs 解构字典\n    @task(multiple_outputs=True)\n    def extract_orders() -> dict:\n        print(\"拉取当日高额订单清单...\")\n        return {\n            'orders': [101, 102, 103],\n            'audit_timestamp': '2024-05-01T12:00:00'\n        }\n\n    # 2. 风控打分任务：接收订单列表\n    @task\n    def score_fraud(order_ids: list) -> list:\n        print(f\"对订单 {order_ids} 进行离线欺诈模型打分...\")\n        # 模拟 102 号订单为欺诈高危订单\n        flagged = [oid for oid in order_ids if oid == 102]\n        return flagged\n\n    # 3. 告警推送任务：接收拦截列表与审计时间\n    @task\n    def notify_security(flagged_orders: list, audit_time: str):\n        print(f\"[风控告警] 审计批次: {audit_time}\")\n        print(f\"[拦截通知] 命中高危黑名单的订单: {flagged_orders}\")\n\n    # 自然函数调用与多返回值数据流转绑定\n    extracted_bundle = extract_orders()\n    flagged_result = score_fraud(extracted_bundle['orders'])\n    notify_security(flagged_result, extracted_bundle['audit_timestamp'])\n\n# 实例化 DAG\nfraud_detection_pipeline()\n```",
            "TaskFlow API 综合编写考查：@dag 与 @task 装饰器、multiple_outputs=True、函数传参及数据流自动依赖拓扑。",
            [
                {"point": "正确使用 @dag 装饰器声明工作流（包含 dag_id, start_date, schedule, catchup=False）", "score": 1},
                {"point": "在 extract_orders 中正确使用 @task(multiple_outputs=True) 并返回字典", "score": 2},
                {"point": "在下游任务中通过 extracted_bundle['orders'] 和 extracted_bundle['audit_timestamp'] 进行解构数据传递并完成依赖连线", "score": 2}
            ],
            "使用 @dag 与 @task；在 extract_orders 声明 multiple_outputs=True 返回包含 orders 和 audit_timestamp 的字典；将字典解构入参传递给 score_fraud 与 notify_security，形成纯 Python 数据流编排。",
            4,
            "airflow-l4-6",
            ["taskflow-coding", "decorators", "multiple_outputs"]
        )
    ]

    return chapter(
        "airflow-c4",
        "airflow-data-engineering",
        4,
        "现代 TaskFlow API 与 @task 装饰器",
        "掌握 Airflow 2.0 TaskFlow API 范式重构，精通 `@task` 装饰器、多返回值解构与参数自动传递机制，熟练融合传统 Operators 打造混合编排 DAG，运用 `@task.docker` 与 `@task.virtualenv` 解决多环境隔离难题。",
        lessons,
        exercises
    )
