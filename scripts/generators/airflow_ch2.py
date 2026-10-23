# -*- coding: utf-8 -*-
"""Chapter 2: Airflow 核心概念与首个工业级 DAG"""

from common import (
    lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter
)

def get_chapter_2():
    lessons = [
        lesson(
            "airflow-l2-1",
            "什么是 DAG（有向无环图）？图论基础与数据管道的映射",
            """### 图论与数据流动的完美契合

在 Apache Airflow 中，所有工作流都以 **DAG（Directed Acyclic Graph，有向无环图）** 的形式组织。
理解这三个单词背后的图论数学原理，是掌握数据编排的起点：

```
     有向 (Directed)           无环 (Acyclic)               图 (Graph)
   A ────> B ────> C         A ───> B ───> C          节点 (Nodes) = 任务 Task
           │                        │                 边 (Edges)   = 依赖关系
           └───> D                  └───> A (严禁闭环!)
```

1. **有向（Directed）**：
   - 数据处理必须具有明确的**方向性与先后因果顺序**。
   - 任务 A（抽取订单）必须在任务 B（清洗订单）之前运行；任务之间的箭头严格从上游（Upstream）指向下游（Downstream）。
2. **无环（Acyclic）**：
   - 管道中**绝对不允许存在死循环闭环（No Cycles）**！
   - 如果任务 A 依赖任务 B，任务 B 依赖任务 C，而任务 C 又反过来依赖任务 A，那么系统将陷入无限递归等待，没有任何任务能够启动。
   - Airflow 编译器会在解析时运行环路检测算法（Cycle Detection），一旦发现回路直接抛错。
3. **图（Graph）**：
   - 由**节点（Nodes，代表具体的任务 Task）**与**边（Edges，代表执行依赖关系）**组成的拓扑结构。

---

### 现实业务管道在 DAG 中的自然映射

现实中的商业数据流往往是树状分支或漏斗汇聚的拓扑，而 DAG 提供了无与伦比的表达自由度：
- **扇出（Fan-out / 并行分发）**：一个原始抽取任务完成后，同时触发风控模型、财务报表和推荐系统特征构建；
- **扇入（Fan-in / 汇聚等待）**：订单事实表与库存事实表分别计算完毕后，统一汇聚到全公司经营日报任务。
""",
            difficulty=1,
            tips="只要记住：DAG 的核心就是‘单向流动，绝不死循环’！有前置后置依赖，允许多对多，但绝不能绕回自己！"
        ),
        lesson(
            "airflow-l2-2",
            "声明 DAG 的三大核心要素：`dag_id`、`start_date` 与 `schedule`",
            """### 实例化一个 DAG 的三大必填属性

在 Airflow 中创建一个 DAG，最核心的三个配置参数构成了它的时空坐标：

```python
from airflow import DAG
from datetime import datetime

my_dag = DAG(
    dag_id='ecommerce_daily_sales_pipeline',  # 1. 唯一标识符
    start_date=datetime(2024, 1, 1),           # 2. 管道开始生效的基准时间
    schedule='@daily',                          # 3. 调度频率周期
    catchup=False                               # 4. 是否补跑历史（工业级强烈建议显式声明）
)
```

---

### 三大参数深度剖析

#### 1. `dag_id`（唯一标识）
- **全局唯一键**：在整个 Airflow 集群中必须保持唯一，作为 Web UI 搜索、日志路径存储和命令行执行的基准标识。
- **命名规范**：建议采用 `snake_case`，结构为 `<业务域>_<周期>_<核心动作>`，例如 `finance_daily_reconciliation`。

#### 2. `start_date`（起始基准时间戳）
- 必须是 Python 的 `datetime` 对象（建议配置 UTC 时区）。
- 它**不是**“工作流在物理现实时间中第一次点火运行的绝对时间”，而是**“该工作流需要负责处理的最早历史数据区间起点”**！
- ⚠️ **动态时间陷阱（Dynamic start_date Anti-pattern）**：
  严禁将 `start_date` 写为 `datetime.now()`！因为调度器每隔几十秒重新解析时，`start_date` 会不断向后滑动变大，导致任务永远无法触发！必须配置为一个**固定的静态历史时间**。

#### 3. `schedule`（调度周期 / 早期版本为 schedule_interval）
定义了任务触发的频率与间隔：
- **Cron 表达式**：如 `'0 2 * * *'`（每天凌晨 2 点）；
- **预设快捷常量**：`'@daily'`（每天）、`'@hourly'`（每小时）、`'@weekly'`（每周）；
- **`timedelta` 对象**：如 `timedelta(hours=4)`（每 4 小时）；
- **`None`**：永不自动定时触发，只供手动点击或外部 API 触发（Ad-hoc）。
""",
            difficulty=2,
            tips="牢记两个死规矩：第一，start_date 绝对不能写 datetime.now()，必须是固定日期；第二，为了防止意外产生几千个历史补数任务，写新 DAG 时先加上 catchup=False！"
        ),
        lesson(
            "airflow-l2-3",
            "`default_args` 字典设计：重试策略 (retries / retry_delay) 与所有者规范",
            """### 为什么需要 `default_args`？

一个复杂的 DAG 可能包含几十甚至上百个任务节点。如果每个任务都要手写一遍“重试 3 次”、“邮件通知谁”、“超时时间是多少”，代码将充斥着大量冗余。
Airflow 提供了 **`default_args`（默认参数字典）** 机制：
**在 DAG 级别定义一套基准参数字典，DAG 下属的所有任务会自动继承这些配置，同时允许个别任务进行局部重写（Override）！**

---

### 工业级生产环境 `default_args` 标准模板

```python
from datetime import datetime, timedelta

default_args = {
    # 1. 任务归属者与责任人 (便于在 Web 界面过滤与故障定位)
    'owner': 'data_platform_team',
    'depends_on_past': False,       # 默认不依赖上一次调度实例的成功状态
    
    # 2. 弹性容灾与重试机制 (关键基础设施)
    'retries': 3,                                      # 失败后自动重试 3 次
    'retry_delay': timedelta(minutes=5),               # 每次重试等待 5 分钟
    'retry_exponential_backoff': True,                 # 启用指数退避 (5m -> 10m -> 20m)
    'max_retry_delay': timedelta(minutes=30),          # 最大重试等待上限
    
    # 3. 告警通知策略
    'email': ['alerts-data@company.com'],
    'email_on_failure': True,                          # 最终重试失败后发告警邮件
    'email_on_retry': False,                           # 重试期间不轰炸告警
    
    # 4. 超时保护
    'execution_timeout': timedelta(hours=2),           # 单个任务运行超 2 小时强制终止 (防死锁)
}
```

---

### 指数退避（Exponential Backoff）的妙用

在云数据集成中，任务失败往往是因为第三方 API 限流（Rate Limit）或数据库瞬间连接数打满。
如果设置固定每 5 秒重试一次，短时间内连续重试会加剧目标服务的压力；
配置 `'retry_exponential_backoff': True` 会让等待时间呈指数翻倍（如 1 分钟、2 分钟、4 分钟...），给上游系统充足的恢复喘息时间！
""",
            difficulty=2,
            tips="配置合理的 retries 与 retry_delay 能自动平息 90% 的夜间瞬时网络抖动报警，是构建自愈型数据系统的黄金参数！"
        ),
        lesson(
            "airflow-l2-4",
            "任务（Tasks）与算子（Operators）：蓝图与执行实例的类比",
            """### 搞清这组核心概念：Operator, Task 与 TaskInstance

初学者经常将 Operator、Task 和 TaskInstance 混为一谈。可以用面向对象的经典思想来建立极其清晰的映射：

```
       类 (Class)                   对象 (Object)                运行时状态 (Runtime)
 ┌───────────────────────┐    ┌───────────────────────┐    ┌───────────────────────┐
 │       Operator        │    │         Task          │    │     TaskInstance      │
 │  (算子模板 / 零件原型) │ ──>│   (任务声明 / 逻辑节点)│ ──>│    (具体批次运行实例)   │
 │   如 PythonOperator   │    │    如 clean_user_task │    │  2024-01-01 运行状态   │
 └───────────────────────┘    └───────────────────────┘    └───────────────────────┘
```

---

### 1. Operator（算子）
- **算子是“施工模板 / 积木”**。
- 它是一个预先封装好的 Python 类（如 `BashOperator`, `PythonOperator`, `PostgresOperator`），定义了**“如何执行一类特定工作”**（包含输入参数定义与 `execute()` 执行逻辑）。

### 2. Task（任务）
- **任务是“被实例化的节点”**。
- 当你在 DAG 脚本中对一个 Operator 进行参数赋值并实例化时，它就变成了一个 Task（例如 `task1 = BashOperator(task_id='echo_hello', ...)`）。
- 它代表了 DAG 拓扑图中的**一个静态节点**。

### 3. TaskInstance（任务实例 / TI）
- **任务实例是“特定执行时间点的运行时存在”**。
- 当调度器运行 2024 年 1 月 1 日的数据批次时，Task 与具体的运行上下文（`execution_date`）结合，生成一个 TaskInstance。
- 它拥有真实的生命周期状态：`RUNNING`、`SUCCESS`、`FAILED`、耗时统计与执行日志。
""",
            difficulty=1,
            tips="打个比方：Operator 是汽车的设计蓝图；Task 是根据蓝图制造出的一辆具体汽车；TaskInstance 则是这辆车在今天早上 8 点具体的行驶记录！"
        ),
        lesson(
            "airflow-l2-5",
            "任务依赖关系语法：位移运算符 `>>` 与 `<<` 及 `set_upstream / set_downstream`",
            """### 任务编排的连线法则

在确定了各个 Task 之后，如何告诉 Airflow 它们之间的执行先后次序？
Airflow 提供了非常具象的**位移运算符（Bitshift Operators）**来声明依赖关系：

---

### 1. 右位移运算符 `>>`（推荐，最直观）
`task_a >> task_b` 表示：**任务 A 是任务 B 的上游；任务 A 成功后，才允许执行任务 B**（即 A 走向 B）。
```python
# 单个任务线性串联
extract_task >> transform_task >> load_task
```

### 2. 列表批量依赖（Fan-out / Fan-in 扇出扇入）
位移运算符完全支持对 Python 列表进行整体操作：
```python
# 1 对多扇出：start 成功后，并发触发 3 个国家的抽取
start_task >> [extract_us, extract_uk, extract_jp]

# 多对 1 扇入：3 个国家抽取都成功后，才执行汇总
[extract_us, extract_uk, extract_jp] >> aggregate_task

# 也可以链式连缀
start_task >> [extract_us, extract_uk] >> aggregate_task >> end_task
```

### 3. 传统方法调用（等价语法）
早期 Airflow 支持面向对象方法：
- `task_b.set_upstream(task_a)` 等价于 `task_a >> task_b`
- `task_a.set_downstream(task_b)` 等价于 `task_a >> task_b`

在现代数据工程中，位移运算符 `>>` 因其形似箭头的极致可读性，已成为业界 100% 普遍采用的标准范式！
""",
            difficulty=1,
            tips="只记一个符号即可：永远使用 `>>`（从左往右走）！箭头的起点是上游前置任务，箭头的终点是下游后置任务！"
        ),
        lesson(
            "airflow-l2-6",
            "上下文管理器声明风格：`with DAG(...) as dag:`",
            """### 两种 DAG 声明风格对比

在 Python 脚本中声明 DAG 和挂载任务，有两种主流写法：

#### 风格 A：传统传参风格（繁琐不推荐）
在创建每一个 Task 时，都必须显式通过 `dag=my_dag` 传参：
```python
my_dag = DAG('legacy_dag', start_date=datetime(2024, 1, 1), schedule='@daily')

task_1 = BashOperator(task_id='t1', bash_command='echo 1', dag=my_dag)
task_2 = BashOperator(task_id='t2', bash_command='echo 2', dag=my_dag)
```

---

#### 风格 B：Python 上下文管理器风格（现代标准推荐）
利用 Python 的 `with` 语法，所有在 `with` 代码块内部实例化的 Operator 会**自动隐式注册**到当前 DAG 中，无需重复手写 `dag=dag`：

```python
from airflow import DAG
from airflow.operators.bash import BashOperator
from datetime import datetime

with DAG(
    dag_id='modern_recommended_dag',
    start_date=datetime(2024, 1, 1),
    schedule='@daily',
    catchup=False
) as dag:

    task_1 = BashOperator(task_id='t1', bash_command='echo 1')
    task_2 = BashOperator(task_id='t2', bash_command='echo 2')

    task_1 >> task_2
```

---

### 上下文管理器的工程优势
1. **防止任务挂错 DAG**：当一个文件中包含辅助 DAG 时，避免因为手抖把任务赋给了错误的变量；
2. **结构清晰分明**：视觉上由 `with` 缩进圈定整个工作流的边界，提升代码可读性；
3. **支持标准 Python 作用域**：可以在上下文内部自由声明循环、辅助变量或临时函数。
""",
            difficulty=1,
            tips="在任何新的 Airflow 项目中，始终遵循 `with DAG(...) as dag:` 风格编写工作流，这是官方与开源社区的标准规范。"
        ),
        lesson(
            "airflow-l2-7",
            "首个端到端 DAG 实战：Bash 算子、Python 算子协同与本地运行测试",
            """### 综合实战：构建首个生产级 ETL 工作流

在本实战中，我们将完整编写一个涵盖 Bash 脚本执行、Python 业务清洗与多任务依赖编排的标准 DAG 文件：`dags/first_production_etl.py`。

---

### 完整工业级代码实现

```python
# dags/first_production_etl.py
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator

# 1. 定义默认参数
default_args = {
    'owner': 'data_engineering',
    'retries': 2,
    'retry_delay': timedelta(minutes=1),
}

# 2. 定义具体的 Python 业务处理函数
def process_user_records(**context):
    print("开始清洗用户交易数据...")
    # 模拟数据处理逻辑
    cleaned_rows = 1500
    print(f"清洗成功完成，累计处理有效记录行数: {cleaned_rows}")
    return cleaned_rows

# 3. 实例化 DAG 上下文
with DAG(
    dag_id='first_production_etl',
    default_args=default_args,
    description='我的第一个生产级 ETL 编排流水线',
    start_date=datetime(2024, 1, 1),
    schedule='@daily',
    catchup=False,
    tags=['tutorial', 'etl']
) as dag:

    # 任务 A: 初始化工作目录 (BashOperator)
    init_task = BashOperator(
        task_id='init_staging_dir',
        bash_command='mkdir -p /tmp/airflow_data && echo "目录初始化就绪"'
    )

    # 任务 B: 执行 Python 清洗计算 (PythonOperator)
    clean_task = PythonOperator(
        task_id='clean_user_transactions',
        python_callable=process_user_records
    )

    # 任务 C: 发送完成通知 (BashOperator)
    notify_task = BashOperator(
        task_id='send_completion_signal',
        bash_command='echo "ETL 全链路任务已成功执行完成"'
    )

    # 4. 编排线性拓扑依赖
    init_task >> clean_task >> notify_task
```

---

### 本地测试与排错 CLI 命令

编写完 DAG 后，无需在 Web 界面苦等调度，可以直接在终端通过 Airflow CLI 进行秒级本地单测：

```bash
# 1. 验证 DAG 文件是否存在语法错误或导入异常 (无输出即为语法完全正确)
python dags/first_production_etl.py

# 2. 查看 Airflow 是否成功识别并加载该 DAG
airflow dags list | grep first_production_etl

# 3. 单独测试运行特定任务 (无需启动 Scheduler 守护进程即可本地干跑)
airflow tasks test first_production_etl clean_user_transactions 2024-01-01
```
`airflow tasks test` 会在本地直接调用该任务的 `execute()` 方法并将标准输出实时打印到控制台，是日常排障效率最高的开发神技！
""",
            difficulty=2,
            tips="记住本地测试两板斧：先用 `python dags/my_dag.py` 查语法错误，再用 `airflow tasks test <dag_id> <task_id> <date>` 验证单任务逻辑！"
        )
    ]

    exercises = [
        single_choice(
            "airflow-c2-e1",
            "在 Airflow DAG 的概念定义中，“无环（Acyclic）”的核心要求与意义是：",
            [
                {"label": "工作流中绝对不允许存在循环依赖回路，避免任务陷入无限等待与死锁", "value": "A"},
                {"label": "工作流不能每天重复运行，只能运行一次就销毁", "value": "B"},
                {"label": "工作流中的任务只能单线程串行，不能有任何并行分支", "value": "C"},
                {"label": "每个任务的名字不能含有大写字母", "value": "D"}
            ],
            "A",
            "无环图（Acyclic）的本质是杜绝循环闭环（如 A -> B -> C -> A），保证任务的执行依赖具有清晰的拓扑排序，能够顺利从起点推进到终点。",
            1,
            "airflow-l2-1",
            ["dag", "graph-theory", "acyclic"]
        ),
        single_choice(
            "airflow-c2-e2",
            "在定义 DAG 时，如果将 `start_date` 动态配置为 `datetime.now()`，会导致什么严重后果？",
            [
                {"label": "Airflow 会在编译阶段直接崩溃无法启动", "value": "A"},
                {"label": "由于调度器周期性解析脚本，start_date 会随时间持续向后推移变大，导致任务永远错过触发时间点而无法自动运行", "value": "B"},
                {"label": "系统会自动将元数据库中的全部历史表清空", "value": "C"},
                {"label": "所有的任务都会以 1 秒一次的频率疯狂刷屏运行", "value": "D"}
            ],
            "B",
            "`datetime.now()` 属于经典反模式。每次调度器解析文件时该值都会滑动变大，调度器永远认为“还没到触发该批次的时机”，造成任务持续挂起无法触发。",
            2,
            "airflow-l2-2",
            ["start-date", "dynamic-start-date", "anti-patterns"]
        ),
        single_choice(
            "airflow-c2-e3",
            "在现代 Airflow 任务编排中，若要声明“任务 A 成功后触发任务 B 执行”（即 A 是 B 的直接上游），最推荐使用的位移运算符是：",
            [
                {"label": "task_a >> task_b", "value": "A"},
                {"label": "task_a << task_b", "value": "B"},
                {"label": "task_a == task_b", "value": "C"},
                {"label": "task_a // task_b", "value": "D"}
            ],
            "A",
            "位移运算符 `>>`（右移）是 Airflow 最经典、最直观的依赖声明语法，箭头由上游指向下游：`task_a >> task_b`。",
            1,
            "airflow-l2-5",
            ["bitshift-operators", "dependencies"]
        ),
        single_choice(
            "airflow-c2-e4",
            "在开发调试过程中，如果想在本地直接单独运行测试某个任务节点（如 `clean_task`），而无需启动复杂的 Scheduler 守护进程，应使用的 CLI 命令是：",
            [
                {"label": "airflow tasks test <dag_id> <task_id> <execution_date>", "value": "A"},
                {"label": "airflow run --all-now", "value": "B"},
                {"label": "airflow dags trigger-now <dag_id>", "value": "C"},
                {"label": "airflow worker start-single <task_id>", "value": "D"}
            ],
            "A",
            "`airflow tasks test` 会在本地直接实例化并运行该 TaskInstance，并将所有标准输出打印在控制台上，无需依赖 Scheduler 或外部队列中介。",
            2,
            "airflow-l2-7",
            ["cli", "tasks-test", "debugging"]
        ),
        multiple_choice(
            "airflow-c2-e5",
            "关于 Operator、Task 与 TaskInstance 三者之间的关系，下列描述正确的有：",
            [
                {"label": "Operator 是面向对象的类模板（如 PythonOperator），定义了某类操作的执行逻辑", "value": "A"},
                {"label": "Task 是 Operator 的具体实例化对象，代表 DAG 拓扑图中的一个静态节点", "value": "B"},
                {"label": "TaskInstance 是 Task 结合具体运行时间点（批次）在运行时的具体体现，具有 SUCCESS/FAILED 等动态状态", "value": "C"},
                {"label": "TaskInstance 是写在 Python 代码里的静态代码，Operator 才是数据库里的执行历史", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 准确阐述了这三者的类比关系。D 说法颠倒错误。",
            2,
            "airflow-l2-4",
            ["operator", "task", "task-instance"]
        ),
        multiple_choice(
            "airflow-c2-e6",
            "在 DAG 的 `default_args` 字典中，下列哪些属于推荐在生产环境中配置的高可用容灾参数？",
            [
                {"label": "`retries: 3`（失败后自动重试 3 次）", "value": "A"},
                {"label": "`retry_delay: timedelta(minutes=5)`（重试前等待 5 分钟）", "value": "B"},
                {"label": "`retry_exponential_backoff: True`（启用指数退避等待，避免雪崩冲击）", "value": "C"},
                {"label": "`execution_timeout: timedelta(hours=2)`（超时保护，防止单任务挂起卡死）", "value": "D"}
            ],
            ["A", "B", "C", "D"],
            "全选。这四项配置是打造自愈型、防死锁生产数据管道的黄金参数标配。",
            2,
            "airflow-l2-3",
            ["default-args", "retries", "resilience"]
        ),
        multiple_choice(
            "airflow-c2-e7",
            "在现代 Airflow 中，使用 `with DAG(...) as dag:` 上下文管理器声明工作流，相比传统方式有哪些优势？",
            [
                {"label": "在 `with` 代码块内实例化的任务会自动挂载到当前 DAG，无需重复手写 `dag=dag`", "value": "A"},
                {"label": "视觉层级结构清晰，一眼能看出 DAG 的作用域范围", "value": "B"},
                {"label": "有效防止手写失误将任务挂到同文件中的其他 DAG 上", "value": "C"},
                {"label": "能够将 Python 脚本自动转换为 C++ 语言以提升 100 倍执行性能", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 均为上下文管理器带来的工程红利。D 纯属捏造。",
            1,
            "airflow-l2-6",
            ["context-manager", "syntax", "best-practices"]
        ),
        judge(
            "airflow-c2-e8",
            "在 Airflow DAG 中，可以使用位移运算符将一个任务同时连接到一个包含多个任务的列表，如 `start_task >> [task_a, task_b, task_c]`，以实现扇出（Fan-out）并发触发。",
            "正确",
            "Airflow 原生支持单任务对列表、以及列表对单任务的位移操作，能够极其优雅地声明扇出与扇入拓扑。",
            1,
            "airflow-l2-5",
            ["bitshift-operators", "fan-out"]
        ),
        judge(
            "airflow-c2-e9",
            "新建一个每天调度的 DAG 时，如果不显式声明 `catchup=False`，且 `start_date` 设置为一年前，Airflow 在首次启动时会尝试为过去 365 天的历史批次连续触发 365 次 DagRun 补数。",
            "正确",
            "Airflow 默认的 `catchup` 行为是 `True`。若 `start_date` 设定较早，系统会疯狂触发历史补数，可能对数据库造成巨大压力。因此推荐显式配置 `catchup=False`。",
            2,
            "airflow-l2-2",
            ["catchup", "dag-configuration"]
        ),
        judge(
            "airflow-c2-e10",
            "在 Python 脚本中声明任务依赖时，`task_a >> task_b` 与 `task_b.set_upstream(task_a)` 在底层的作用与效果是完全一致的。",
            "正确",
            "`>>` 仅仅是 `set_downstream` 和 `set_upstream` 在 Python 操作符重载层面的语法糖，底层调用逻辑完全等价。",
            1,
            "airflow-l2-5",
            ["syntax-sugar", "set-upstream"]
        ),
        fill(
            "airflow-c2-e11",
            "在 Airflow 中，工作流拓扑图的英文全称首字母缩写是 [BLANK1]（有向无环图）；在定义该对象时，必须指定的全局唯一名称字符串参数是 [BLANK2]。",
            [["DAG"], ["dag_id"]],
            "工作流被称为 DAG，唯一标识为 `dag_id`。",
            1,
            "airflow-l2-1",
            ["dag", "dag_id"]
        ),
        fill(
            "airflow-c2-e12",
            "若任务失败后需要自动重试，可在 `default_args` 中配置重试次数参数 [BLANK1]，并通过传入 `timedelta` 对象配置单次重试等待时长的参数 [BLANK2]。",
            [["retries"], ["retry_delay"]],
            "配置重试次数 `retries` 与重试间隔 `retry_delay`。",
            1,
            "airflow-l2-3",
            ["default-args", "retries", "retry_delay"]
        ),
        open_ex(
            "airflow-c2-e13",
            "某公司数据平台需要搭建一个订单数据同步与分析流水线，业务拓扑流程如下：\n1. 任务 `init_check`：使用 BashOperator 检查数据落地目录；\n2. 检查完成后，需要**并行并发**执行两个抽取任务：\n   - `fetch_mysql_orders`（PythonOperator，调用函数 `extract_mysql`）\n   - `fetch_pos_orders`（PythonOperator，调用函数 `extract_pos`）\n3. 当上述两个抽取任务**全部成功**后，执行汇总任务 `merge_and_load`（PythonOperator，调用函数 `merge_data`）；\n4. 最后执行清理任务 `cleanup_temp`（BashOperator）。\n\n请使用 Python 编写出该流水线的完整 DAG 脚本（采用 `with DAG(...) as dag:` 风格），包含 `default_args`、DAG 参数定义（`dag_id='orders_sync_pipeline'`，每天凌晨 2 点调度，不补跑历史）以及完整的依赖关系连接代码。",
            "```python\nfrom datetime import datetime, timedelta\nfrom airflow import DAG\nfrom airflow.operators.bash import BashOperator\nfrom airflow.operators.python import PythonOperator\n\ndef extract_mysql():\n    print(\"抽取 MySQL 订单数据完成\")\n\ndef extract_pos():\n    print(\"抽取 POS 门店订单数据完成\")\n\ndef merge_data():\n    print(\"双源数据合并加载完成\")\n\ndefault_args = {\n    'owner': 'data_platform',\n    'retries': 2,\n    'retry_delay': timedelta(minutes=5),\n}\n\nwith DAG(\n    dag_id='orders_sync_pipeline',\n    default_args=default_args,\n    start_date=datetime(2024, 1, 1),\n    schedule='0 2 * * *',\n    catchup=False,\n    tags=['orders', 'sync']\n) as dag:\n\n    init_check = BashOperator(\n        task_id='init_check',\n        bash_command='test -d /tmp/data || mkdir -p /tmp/data'\n    )\n\n    fetch_mysql_orders = PythonOperator(\n        task_id='fetch_mysql_orders',\n        python_callable=extract_mysql\n    )\n\n    fetch_pos_orders = PythonOperator(\n        task_id='fetch_pos_orders',\n        python_callable=extract_pos\n    )\n\n    merge_and_load = PythonOperator(\n        task_id='merge_and_load',\n        python_callable=merge_data\n    )\n\n    cleanup_temp = BashOperator(\n        task_id='cleanup_temp',\n        bash_command='echo \"清理临时文件完成\"'\n    )\n\n    # 依赖编排 (扇出与扇入)\n    init_check >> [fetch_mysql_orders, fetch_pos_orders] >> merge_and_load >> cleanup_temp\n```",
            "DAG 基础编排与扇出/扇入拓扑综合考查：default_args、DAG 声明、Operators 实例化以及利用列表实现并行依赖连线。",
            [
                {"point": "正确声明 default_args 并实例化 with DAG(...) 上下文（含 dag_id, start_date, schedule='0 2 * * *', catchup=False）", "score": 2},
                {"point": "正确使用 BashOperator 和 PythonOperator 声明 5 个任务节点", "score": 2},
                {"point": "准确使用位移运算符实现 init_check >> [fetch_mysql_orders, fetch_pos_orders] >> merge_and_load >> cleanup_temp 的扇出扇入拓扑", "score": 1}
            ],
            "定义 default_args；with DAG(dag_id='orders_sync_pipeline', schedule='0 2 * * *', catchup=False)；实例化 5 个 Operator；用 init_check >> [fetch_mysql_orders, fetch_pos_orders] >> merge_and_load >> cleanup_temp 连线。",
            4,
            "airflow-l2-7",
            ["dag-coding", "fan-out-fan-in", "operators"]
        )
    ]

    return chapter(
        "airflow-c2",
        "airflow-data-engineering",
        2,
        "Airflow 核心概念与首个工业级 DAG",
        "掌握 DAG 有向无环图论基础与三大核心元属性，设计工业级 `default_args` 弹性重试策略，透彻理解 Operator/Task/TaskInstance 关系，熟练运用 `>>` 编排扇出与扇入依赖拓扑。",
        lessons,
        exercises
    )
