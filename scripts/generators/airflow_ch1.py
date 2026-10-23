# -*- coding: utf-8 -*-
"""Chapter 1: 现代数据调度哲学与 Airflow 架构解密"""

from common import (
    lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter
)

def get_chapter_1():
    lessons = [
        lesson(
            "airflow-l1-1",
            "从 Crontab 脚本到工作流编排器：数据工程调度的演进之痛",
            """### 为什么需要工作流编排（Orchestration）？

在数据工程的蛮荒早期，几乎所有的定时批处理任务都依赖 Linux 系统的 **Crontab（定时任务服务）**：
```bash
# 传统的 crontab 配置
0 2 * * * /usr/bin/python /scripts/extract_orders.py
0 3 * * * /usr/bin/python /scripts/clean_orders.py
0 4 * * * /usr/bin/python /scripts/generate_sales_report.py
```

看似美好的定时计划，在真实生产环境中却隐藏着巨大隐患，被称为**“Crontab 噩梦”**：
1. **隐式依赖，时序极其脆弱**：
   `clean_orders.py` 在 3:00 启动，是因为工程师“预估”抽取脚本 1 小时内能跑完。但如果双十一订单暴增，抽取跑了 70 分钟，3:00 清洗脚本启动时就会读取不完整的数据，导致下游报表全面失真！
2. **缺乏状态追踪与集中观测**：
   如果某个脚本静默报错，Crontab 没有任何可视化的 UI 界面。工程师必须在成百上千台服务器的 `/var/log` 中盲目 grep 错误日志。
3. **不支持自动重试（Retry）与报警**：
   网络瞬间抖动导致抽取中断后，Crontab 不具备重试机制，只能干等到人工上班发现。
4. **无法进行历史回溯与补数（Backfill）**：
   如果需要为过去两年的历史数据重新运行清洗逻辑，Crontab 毫无用武之地，只能手写一次性循环脚本，极易引发生产雪崩。

---

### 工作流编排器的诞生

为了解决上述痛点，Airbnb 于 2014 年开源了 **Apache Airflow**，确立了现代数据编排的标准范式：
- **拓扑依赖显式化**：任务之间通过有向无环图（DAG）严格定义依赖关系，前置任务成功后才触发下游；
- **配置即代码（Configuration as Code）**：工作流使用纯 Python 代码定义，享有版本控制（Git）、单元测试和动态生成能力；
- **全功能控制台 Webserver**：一站式可视化查看任务状态、甘特图、耗时分布与实时日志；
- **自动化生命周期管理**：原生支持指数退避重试、SLAs 超时监控与多渠道告警。
""",
            difficulty=1,
            tips="记住：编排器（Orchestrator）的核心价值是调度依赖管理、状态跟踪与自动化容灾，彻底终结 Crontab 时间硬编码的猜测游戏！"
        ),
        lesson(
            "airflow-l1-2",
            "代码即配置（Configuration as Code）：为什么纯 Python 声明战胜了 XML/GUI",
            """### 两种流派的决战：配置界面/XML vs 纯 Python

在 Airflow 出现之前，市场上存在诸多基于 GUI 拖拽或 XML/JSON 配置的调度工具（如 Oozie、Informatica、Kettle）。
但现代数据工程师最终全面倒向了 Airflow 的 **“代码即配置（Configuration as Code）”** 哲学。

---

### Python 声明 DAG 的降维打击优势

```
 ┌────────────────────────────────────────────────────────┐
 │ 传统拖拽/XML 调度器                                    │
 │ ├── 无法使用 Git 优雅对比代码 Diff                      │
 │ ├── 无法编写循环批量生成 100 张表的同步任务              │
 │ └── 无法导入第三方 Python 库与企业内部 SDK             │
 └────────────────────────────────────────────────────────┘
                            VS
 ┌────────────────────────────────────────────────────────┐
 │ Apache Airflow (纯 Python 声明)                        │
 │ ├── Git PR Review 审查完整依赖变更                     │
 │ ├── 使用 for 循环与字典实现任务元编程与动态 DAG 伸缩     │
 │ ├── 单元测试 pytest 本地校验逻辑                       │
 │ └── 任意调用 requests, boto3, pandas 等全球开源生态    │
 └────────────────────────────────────────────────────────┘
```

#### 1. 动态生成任务（Dynamic Pipeline Generation）
如果公司有 50 个不同国家的广告数据需要按小时抓取，在 XML 或拖拽工具中必须手画 50 个节点；而在 Airflow 中，只需一个 Python 循环：
```python
countries = ['US', 'UK', 'DE', 'FR', 'JP']
for c in countries:
    fetch_task = PythonOperator(
        task_id=f'fetch_{c}_ads',
        python_callable=fetch_ads_data,
        op_kwargs={'country': c}
    )
```

#### 2. 软件工程全套基础设施复用
代码可以被规范化格式化（Black / Flake8）、自动化 Lint 检查、在 GitHub Actions 中跑 CI 校验，把数据调度任务完全提升到工业级软件工程的高度。
""",
            difficulty=1,
            tips="Airflow 中的每一个 DAG 都是一个标准的 Python 脚本。这意味着你在 Python 里学到的循环、列表推导、类继承与异常处理，都能直接用于构建工作流！"
        ),
        lesson(
            "airflow-l1-3",
            "Airflow 核心五大组件：Webserver, Scheduler, Metadata Database, Executor, Worker",
            """### Airflow 的分布式架构大揭秘

Apache Airflow 是一个模块化、分布式的系统，其核心骨架由五大组件协同构成：

```
                    ┌─────────────────────────┐
                    │ Webserver (Flask 应用)  │ <── 用户浏览器 (UI 查看与手动触发)
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │  Metadata Database      │ <── 元数据数据库 (PostgreSQL / MySQL)
                    │  (存 DAG、状态、历史记录)  │
                    └───────────▲─────────────┘
                                │
       ┌────────────────────────┼────────────────────────┐
       │                        │                        │
┌──────┴──────────────┐ ┌───────┴─────────────┐ ┌────────┴─────────────┐
│ Scheduler (调度器)   │ │ Executor (执行器)   │ │ Workers (工作节点)   │
│ - 扫描 dags/ 目录    │ │ - 任务队列中介抽象   │ │ - 真实执行任务代码   │
│ - 状态状态机心跳轮询  │ │ - Celery/K8s/Local  │ │ - 消耗 CPU/内存运算  │
└─────────────────────┘ └─────────────────────┘ └──────────────────────┘
```

---

### 五大核心组件职责拆解

1. **Metadata Database（元数据数据库）**：
   - 系统的“心脏与账本”。通常采用高可用 PostgreSQL 或 MySQL。
   - 存储所有的 DAG 结构、任务实例状态（Success/Failed/Running）、用户认证信息、全局变量与连接凭证。
2. **Scheduler（调度器）**：
   - 系统的“中枢神经大脑”。
   - 以高频死循环轮询 `dags/` 目录解析 Python 脚本，根据时间周期与任务依赖，判断哪些 Task 已经满足运行条件，将其状态标记为 `SCHEDULED` 并推送到执行队列。
3. **Webserver（网页管理服务）**：
   - 基于 Flask 实现的可视化控制台。
   - 读取元数据库，提供树状图、甘特图、实时日志流、手动重跑与触发功能。
4. **Executor（执行器）**：
   - 调度器与 Worker 之间的“后勤调度官”。
   - 负责决定任务**“在哪里、如何被分配执行”**（单进程、多线程、Celery 队列还是 Kubernetes Pod）。
5. **Worker（工作进程/节点）**：
   - 实际搬砖的“劳动力”。
   - 监听任务队列，领取任务并拉起 Python 环境执行真正的业务逻辑代码。
""",
            difficulty=2,
            tips="理解 Airflow 架构的关键：Webserver 不执行任务代码，Scheduler 也不执行业务代码；业务代码只在 Worker 上运行，所有组件均通过元数据库交换状态！"
        ),
        lesson(
            "airflow-l1-4",
            "执行器（Executors）大比拼：Sequential, Local, Celery 与 KubernetesExecutor",
            """### 选对 Executor：决定集群吞吐与弹性上限

Executor（执行器）是 Airflow 分布式扩展的核心机制。在 `airflow.cfg` 的 `executor = ...` 中配置。不同执行器适用于截然不同的环境阶段：

---

### 四大主流执行器横向对比

| 执行器名称 | 并发机制 | 是否需要外部组件 | 适用场景与优劣势 |
| :--- | :--- | :--- | :--- |
| **`SequentialExecutor`** | 单进程单任务串行 | 仅需 SQLite | **开发测试专属**。默认开箱配置，无法并发执行任何任务，生产严禁使用！ |
| **`LocalExecutor`** | 本地多进程并发 | PostgreSQL / MySQL | **单机中型生产**。利用单台大服务器的多核 CPU 并发，架构简单无运维负担。 |
| **`CeleryExecutor`** | 分布式多节点 Worker | Redis/RabbitMQ + Worker 节点池 | **传统高并发集群**。跨多台虚机水平扩缩容 Worker，吞吐量极大，需维护消息队列。 |
| **`KubernetesExecutor`**| 动态按需拉起 K8s Pod | Kubernetes 集群 | **云原生现代生产首选**。每个任务独占一个 Pod，环境严格隔离，按需弹性收缩，零资源闲置浪费。 |

---

### 架构演进路线建议

1. **个人本地学习 / 小型团队初期**：
   使用 **`LocalExecutor`** 搭配独立 Docker 容器的 PostgreSQL。配置极简，单机支持数十个并发任务，运维零心智负担。
2. **大规模企业云原生平台**：
   拥抱 **`KubernetesExecutor`**（或其混合模式 `CeleryKubernetesExecutor`）。不同的任务可以使用不同的 Docker 镜像（例如任务 A 需要 Python 3.8 + PyTorch，任务 B 需要 Python 3.11 + dbt），彻底告别依赖冲突问题！
""",
            difficulty=2,
            tips="初学者本地开发千万不要用默认的 SQLite + SequentialExecutor，它无法并行执行两个任务！请第一时间改用 LocalExecutor + PostgreSQL！"
        ),
        lesson(
            "airflow-l1-5",
            "DAG 的生命周期：从 Python 文件解析、任务排队到 Worker 执行",
            """### 一条任务是如何跑起来的？——端到端全链路剖析

很多工程师在调试 Airflow 时经常困惑：“为什么我改了代码，Web 界面没有变？”或者“任务为什么一直卡在 Queued 状态不动？”
理解 DAG 与 Task 的完整生命周期是解决这类问题的必备内功。

```
 1. DagFileProcessor (代码解析)
    Scheduler 后台定期扫描 dags/*.py，执行文件并将 DAG 拓扑写入元数据库
           │
           ▼
 2. 触发时机满足 (创建 DagRun)
    到达 schedule_interval 时间点，生成一条状态为 QUEUED 的 DagRun
           │
           ▼
 3. 任务依赖就绪 (TaskInstance 状态跃迁)
    任务的前置依赖全部为 SUCCESS，TaskInstance 从 NONE -> SCHEDULED
           │
           ▼
 4. 派发给 Executor (QUEUED)
    Executor 将任务放入消息队列 (Celery) 或创建 Pod 声明 (K8s)
           │
           ▼
 5. Worker 认领并执行 (RUNNING)
    Worker 启动子进程，拉取日志，执行 execute() 方法
           │
           ▼
 6. 状态回写与持久化 (SUCCESS / FAILED)
    执行完毕，Worker 将结果与终止时间写回元数据库，触发下游 Task
```

---

### 经典状态机跃迁图（State Transitions）

- `None`：任务被调度器发现，但上游依赖未完成；
- `Scheduled`：上游依赖已全部就绪，等待 Executor 派发；
- `Queued`：任务已被放入排队队列，等待 Worker 认领；
- `Running`：Worker 正在全力运行中；
- `Success` / `Failed`：执行终态；
- `Up_for_retry`：执行失败但尚未超过设定的重试次数，等待进入下一次重试；
- `Upstream_failed`：由于直接或间接上游任务失败，本任务被自动跳过执行。
""",
            difficulty=2,
            tips="如果发现任务一直卡在 `Queued` 状态，排查方向有两个：一是 Worker 进程死掉了或者没有连接到队列；二是 Worker 并发上限（worker_concurrency）被占满了！"
        ),
        lesson(
            "airflow-l1-6",
            "DAG 编写的第一禁忌：顶层代码（Top-level Code）执行陷阱与性能崩塌",
            """### 致命陷阱：千万不要在 DAG 文件顶部执行耗时操作！

这是几乎所有 Airflow 初学者都会踩中的“核弹级”大坑，也是导致 Airflow Scheduler CPU 爆满 100%、调度严重滞后的头号元凶！

#### 调度器解析的底层事实
**Airflow 的 Scheduler 进程默认每隔几十秒（由 `min_file_process_interval` 控制）就会将 `dags/` 目录下的所有 `.py` 文件从头到尾 import 执行一次！**
调度器执行这些脚本的目的仅仅是：**提取 DAG 对象的结构与参数**，而不是运行具体的任务逻辑！

---

### 反模式示例：在顶层写耗时查询或网络请求

```python
# 致命错误代码示范：dags/bad_dag.py
from airflow import DAG
import requests
import psycopg2

# ❌ 灾难！以下代码在 Python 文件顶层直接执行！
# 调度器每 30 秒解析该文件时，都会同步发起一次 HTTP 请求并连一次数据库！
response = requests.get("https://api.my-service.com/config")
api_config = response.json()

conn = psycopg2.connect("...")
cursor = conn.cursor()
cursor.execute("SELECT count(*) FROM big_table")
total_rows = cursor.fetchone()[0]

with DAG(dag_id='disaster_dag', ...) as dag:
    # ...
```

#### 严重后果：
1. **外部服务被自身打挂**：调度器几十秒解析一次，一天向外部 API 发送数千次无效请求；
2. **调度瘫痪**：如果外部 API 响应变慢（如卡顿 10 秒），调度器扫描全目录耗时剧增，导致全公司正常任务全部错过调度时间点！

---

### 正确工程规范：将所有业务与耗时逻辑封装在 Task 内部

```python
# 正确优雅规范代码：dags/good_dag.py
from airflow import DAG
from airflow.operators.python import PythonOperator

def safe_execution_callable():
    # ✅ 只有当 Worker 真正开始执行该 Task 时，这段代码才会被运行一次！
    import requests
    response = requests.get("https://api.my-service.com/config")
    # 业务处理...

with DAG(dag_id='clean_dag', ...) as dag:
    run_task = PythonOperator(
        task_id='fetch_config',
        python_callable=safe_execution_callable
    )
```
""",
            difficulty=3,
            tips="铁律：DAG 文件顶层（Top-level）只能包含 DAG 定义、Operator 实例化和基础变量声明；严禁在顶层执行 SQL 查询、网络请求或重度数据处理！"
        ),
        lesson(
            "airflow-l1-7",
            "生产环境部署模式：Docker Compose 一键起步与生产配置基线",
            """### 5 分钟在本地拉起完整 Airflow 生产级集群

Apache Airflow 官方维护了标准生产级 `docker-compose.yaml` 文件，它是本地开发和中小型企业最可靠的部署基线。

---

### 极速上手三部曲

#### 1. 下载官方模板
```bash
curl -LfO 'https://airflow.apache.org/docs/apache-airflow/2.8.1/docker-compose.yaml'
```

#### 2. 初始化环境与目录结构
Airflow 容器在运行时需要访问本地主机的宿主目录：
```bash
# 创建映射目录
mkdir -p ./dags ./logs ./plugins ./config

# 配置 AIRFLOW_UID 防止容器权限问题 (Linux/macOS)
echo -e "AIRFLOW_UID=$(id -u)" > .env

# 初始化元数据库 (执行数据库迁移)
docker compose up airflow-init
```

#### 3. 启动全套服务
```bash
docker compose up -d
```
启动成功后，docker 会拉起：
- `airflow-webserver`（默认端口 8080）
- `airflow-scheduler`
- `airflow-worker`
- `airflow-triggerer`（用于支持异步异步事件）
- `postgres`（元数据库）
- `redis`（Celery 任务队列中介）

打开浏览器访问 `http://localhost:8080`，输入默认账号 `airflow` / 密码 `airflow`，即可进入现代数据工程调度的全景控制台！
""",
            difficulty=1,
            tips="使用官方 Docker Compose 方案能完全免去本地安装 Python 依赖库与 PostgreSQL 驱动的繁琐报错，是进行 Airflow 实操学习的最佳利器！"
        )
    ]

    exercises = [
        single_choice(
            "airflow-c1-e1",
            "在传统的 Linux Crontab 定时脚本体系中，导致数据批处理经常读取不完整或产生脏数据的最核心根本痛点是：",
            [
                {"label": "Crontab 必须依赖时间硬编码进行猜测调度，缺乏任务间显式的依赖感知与状态流转", "value": "A"},
                {"label": "Crontab 无法在 Linux 操作系统中运行 Python 脚本", "value": "B"},
                {"label": "Crontab 每次只能调度一个命令，不能配置多行计划", "value": "C"},
                {"label": "Crontab 会自动清空目标数据库的数据", "value": "D"}
            ],
            "A",
            "Crontab 仅仅是基于时钟触发，无法感知前置任务是否真正成功执行完成，一旦前置任务延迟，后置任务依然盲目启动，极易导致脏读和计算失真。",
            1,
            "airflow-l1-1",
            ["crontab", "orchestration", "evolution"]
        ),
        single_choice(
            "airflow-c1-e2",
            "在 Apache Airflow 架构中，负责轮询解析 `dags/` 目录下的 Python 脚本并判定任务依赖是否满足、将任务状态转为 SCHEDULED 的核心组件是：",
            [
                {"label": "Webserver", "value": "A"},
                {"label": "Scheduler", "value": "B"},
                {"label": "Worker", "value": "C"},
                {"label": "Triggerer", "value": "D"}
            ],
            "B",
            "`Scheduler` 是 Airflow 的核心中枢神经，负责解析脚本拓扑、监听状态机、并在依赖与时间满足时将任务推进到排队队列中。",
            1,
            "airflow-l1-3",
            ["architecture", "scheduler"]
        ),
        single_choice(
            "airflow-c1-e3",
            "在 Airflow 的执行器（Executor）选型中，默认开箱配置、基于 SQLite 且由于单进程限制无法并发执行任何两个任务的执行器是：",
            [
                {"label": "LocalExecutor", "value": "A"},
                {"label": "CeleryExecutor", "value": "B"},
                {"label": "SequentialExecutor", "value": "C"},
                {"label": "KubernetesExecutor", "value": "D"}
            ],
            "C",
            "`SequentialExecutor` 是默认极简测试执行器，仅支持 SQLite 单线程串行执行，完全不支持任务并行，生产环境严禁使用。",
            1,
            "airflow-l1-4",
            ["executors", "sequential-executor"]
        ),
        single_choice(
            "airflow-c1-e4",
            "在编写 Airflow DAG 的 Python 脚本时，下列哪种做法属于严重违背最佳实践并会导致调度器 CPU 爆满的“顶层代码（Top-level Code）陷阱”？",
            [
                {"label": "在 Python 文件顶层直接调用 requests 发送 HTTP 请求或连接数据库执行 SQL", "value": "A"},
                {"label": "在 Python 脚本顶层导入 `from airflow import DAG`", "value": "B"},
                {"label": "在 PythonOperator 对应的 python_callable 函数内部处理数据", "value": "C"},
                {"label": "使用 `with DAG(...) as dag:` 上下文管理器声明任务", "value": "D"}
            ],
            "A",
            "调度器每隔几十秒就会全量 import 并执行一次 DAG 文件顶层代码。在顶层发起网络请求或重度查询会导致调度器心跳卡死甚至外部接口被打垮，属于绝对禁忌。",
            2,
            "airflow-l1-6",
            ["top-level-code", "performance", "anti-patterns"]
        ),
        multiple_choice(
            "airflow-c1-e5",
            "相比传统的 XML 配置或 GUI 拖拽式调度工具，Airflow 采用“代码即配置（Configuration as Code）”带来的核心工程优势包括：",
            [
                {"label": "可以使用 Git 等版本控制系统优雅追踪每一次 DAG 逻辑与依赖变更的 Diff", "value": "A"},
                {"label": "可以利用 Python 的 for 循环、字典与列表动态批量生成数十上百个任务节点", "value": "B"},
                {"label": "可以无缝引入 pytest 等现代测试框架在本地与 CI 中运行单元测试", "value": "C"},
                {"label": "完全不需要任何服务器硬件和数据库支持即可自动永久运行", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 展现了代码化编排的巨大工业价值。D 错误，Airflow 同样需要依赖元数据库（PostgreSQL）与计算节点支撑。",
            1,
            "airflow-l1-2",
            ["code-as-configuration", "python-advantages"]
        ),
        multiple_choice(
            "airflow-c1-e6",
            "在现代云原生架构中，关于 `KubernetesExecutor` 的特征与优势，下列描述正确的有：",
            [
                {"label": "每一个 Airflow 任务实例在运行时都会由执行器动态拉起一个独立的 Kubernetes Pod 执行", "value": "A"},
                {"label": "不同任务之间可以独占不同规格的资源（CPU/内存）与专用的 Docker 容器镜像", "value": "B"},
                {"label": "任务执行完成后 Pod 自动销毁释放资源，实现真正的高效弹性与零资源常驻闲置", "value": "C"},
                {"label": "要求整个调度系统只能使用 SQLite 作为后端元数据存储", "value": "D"}
            ],
            ["A", "B", "C"],
            "A、B、C 是 KubernetesExecutor 的核心杀手级优势。D 错误，K8s 生产环境必须使用高可用 PostgreSQL 或 MySQL。",
            2,
            "airflow-l1-4",
            ["kubernetes-executor", "cloud-native", "isolation"]
        ),
        multiple_choice(
            "airflow-c1-e7",
            "在 Airflow 任务实例（TaskInstance）的生命周期状态流转中，下列状态属于有效合法状态的有：",
            [
                {"label": "`scheduled`：依赖满足，已被调度器标记等待派发", "value": "A"},
                {"label": "`queued`：已发送到队列，等待空闲 Worker 领取执行", "value": "B"},
                {"label": "`running`：Worker 正在全力执行该任务代码", "value": "C"},
                {"label": "`upstream_failed`：由于上游前置任务失败，本任务被自动跳过", "value": "D"}
            ],
            ["A", "B", "C", "D"],
            "四者均为 Airflow 官方状态机的标准合法状态。",
            2,
            "airflow-l1-5",
            ["state-machine", "task-lifecycle"]
        ),
        judge(
            "airflow-c1-e8",
            "Airflow Webserver 负责直接执行用户编写的重度 Python 数据处理任务和大规模 SQL 计算。",
            "错误",
            "Webserver 仅负责读取元数据并渲染前端 Web 页面与接收用户指令；真正的业务代码是由 Worker 节点（或 K8s Pod）执行的，Webserver 绝对不执行耗时业务代码。",
            1,
            "airflow-l1-3",
            ["webserver", "architecture"]
        ),
        judge(
            "airflow-c1-e9",
            "Airflow 的调度器（Scheduler）在解析 DAG 脚本时，只要检测到语法正确，就会自动永久缓存结构，后续如果修改了 Python 文件内容，必须重启调度器才能生效。",
            "错误",
            "Scheduler 拥有周期性循环扫描机制（默认几十秒），会自动重新解析并感知 `dags/` 目录下被更新的 Python 代码，无需手动重启整个调度器进程。",
            2,
            "airflow-l1-5",
            ["scheduler", "dag-processing"]
        ),
        judge(
            "airflow-c1-e10",
            "在单机生产环境中，使用 `LocalExecutor` 配合 PostgreSQL 元数据库可以利用本地多进程并发执行任务，是极具性价比且稳定的中小型部署方案。",
            "正确",
            "`LocalExecutor` 充分利用单机多核 CPU 资源，架构极简无需维护 RabbitMQ/Redis，非常适合数据量适中的企业生产落地。",
            2,
            "airflow-l1-4",
            ["local-executor", "production-setup"]
        ),
        fill(
            "airflow-c1-e11",
            "Airflow 中所有 DAG 的拓扑结构、任务执行历史、连接配置与系统变量均集中保存在核心组件 [BLANK1]（元数据库）中，生产环境最推荐使用的数据库类型是 [BLANK2]。",
            [["Metadata Database", "元数据库", "Metadata DB"], ["PostgreSQL", "Postgres"]],
            "Airflow 强依赖 Metadata Database 存储全局状态，生产环境官方首推 PostgreSQL。",
            1,
            "airflow-l1-3",
            ["metadata-database", "postgresql"]
        ),
        fill(
            "airflow-c1-e12",
            "官方提供的本地一键部署方案基于 [BLANK1]（工具名），该方案默认启动 Web 访问服务的外部端口是 [BLANK2]。",
            [["docker-compose", "Docker Compose", "docker compose"], ["8080"]],
            "官方提供 `docker-compose.yaml` 极速起步，Web 控制台端口默认为 `8080`。",
            1,
            "airflow-l1-7",
            ["docker-compose", "deployment"]
        ),
        open_ex(
            "airflow-c1-e13",
            "某初级数据开发工程师小李写了一个 Airflow 脚本，代码片段如下：\n```python\nfrom airflow import DAG\nfrom datetime import datetime\nimport requests\n\n# 小李在文件顶层执行了如下代码\napi_token = requests.post('https://auth.company.internal/login', data={'user': 'etl'}).json()['token']\nuser_ids = requests.get('https://api.company.internal/users', headers={'Authorization': api_token}).json()\n\nwith DAG(dag_id='user_sync_pipeline', start_date=datetime(2024, 1, 1), schedule_interval='@daily') as dag:\n    # 后续使用 user_ids 动态创建任务\n```\n请指出这段代码存在什么严重的架构隐患，并说明会导致 Airflow 系统发生什么故障；最后给出符合生产规范的重构思路。",
            "1. **严重架构隐患（顶层代码陷阱）**：\n小李在 Python 文件的顶层（Top-level）直接发起了两次同步阻塞的网络 HTTP 请求（登录认证获取 token 和拉取用户列表）。\n\n2. **系统故障后果**：\n- Airflow Scheduler 会周期性（默认每 30 秒）全量扫描并执行该文件。这意味着调度器每隔几十秒就会对公司的登录认证服务发起一次无效登录和重度拉取；\n- 一旦内部认证服务出现抖动、延迟或网络超时，Scheduler 的解析线程将被直接挂起阻塞，导致整个 Airflow 集群的调度循环心跳变慢，全公司所有其他 DAG 的正常任务错过执行时间；\n- 当用户量激增时，频繁在解析期拉取大 JSON 会导致调度器内存泄漏或 OOM 崩溃。\n\n3. **生产重构思路**：\n- 严禁在顶层执行网络请求。将获取 token 与拉取用户数据的逻辑封装在特定的 Task（例如使用 `PythonOperator` 或 `@task` 装饰的函数）内部；\n- 任务内部通过 XCom 或持久化存储（如 S3/数据库）传递拉取到的数据；或者若需动态生成任务，应结合 Airflow 2.3+ 的“动态任务映射（Dynamic Task Mapping / `expand()`）”机制实现运行时按需展开。",
            "Airflow 核心调度机制与顶层代码反模式深度排错考查。",
            [
                {"point": "明确指出在 DAG 文件顶层直接发起网络请求属于典型的“顶层代码陷阱（Top-level code trap）”", "score": 2},
                {"point": "深入解释调度器周期性解析机制导致的高频无效请求与调度心跳卡顿/全集群阻塞后果", "score": 2},
                {"point": "给出合理的重构方案（将逻辑移入 Task 内部运行，或使用 Dynamic Task Mapping）", "score": 1}
            ],
            "指出在顶层发起 HTTP 违背最佳实践；解释调度器定期解析会导致频繁轰炸接口及阻塞调度器心跳；建议移入 Task 内部执行或采用 Dynamic Task Mapping。",
            4,
            "airflow-l1-6",
            ["top-level-code", "troubleshooting", "best-practices"]
        )
    ]

    return chapter(
        "airflow-c1",
        "airflow-data-engineering",
        1,
        "现代数据调度哲学与 Airflow 架构解密",
        "深入理解从 Crontab 到现代代码化编排器的演进历程，精通 Airflow 五大核心组件协同机制、四大执行器横向权衡、DAG 生命周期状态机及顶层代码性能陷阱规避。",
        lessons,
        exercises
    )
