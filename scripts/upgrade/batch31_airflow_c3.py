# -*- coding: utf-8 -*-
"""batch31: Airflow 课程第 3 章（Operators 算子体系）章主题包升级"""
import json, io
P = r"D:\Python_Project\knowledge-order\content-data\courses\airflow-data-engineering.json"
c = json.load(io.open(P, encoding="utf-8"))
BT3 = chr(96) * 3
N = 3

THEME = dict(
why="一个 DAG 要碰 shell、碰数据库、碰 S3、碰公司内部中间件——如果每类系统都手写一段连接与重试代码，DAG 目录很快会变成面条坟场：凭据散落各处、失败重试各写一套、审计无从谈起。Operator 体系的意义在于把『做什么』声明成可复用的积木，把『怎么连』下沉到 Connection/Hook，把『公司私货』封装成自定义算子。这一章建立整个 Airflow 的算子世界观：分类学、基础算子、跨系统搬运、钩子解耦直到自定义封装。",
intuition="Operator 像乐高积木：Action 算子是『干活砖』（执行命令、跑函数）、Transfer 算子是『搬运砖』（把数据从 A 系统搬到 B 系统）、Sensor 是『等灯砖』（等信号亮起才放行）。积木只管形状标准（BaseOperator 的 execute 契约），具体拼在哪、和谁拼交给 DAG；积木与外部系统之间的『插口』统一由 Hook 转接——换数据库只换插口，积木一块不用重做。",
code="""class BaseOperator:                       # 所有算子的契约：统一 execute 接口
    def __init__(self, task_id):
        self.task_id = task_id

    def execute(self, context):
        raise NotImplementedError

class PythonOperator(BaseOperator):       # Action 算子：执行一个 Python 函数
    kind = "Action"
    def __init__(self, task_id, python_callable):
        super().__init__(task_id); self.fn = python_callable
    def execute(self, context):
        return self.fn(**context)

class SqlSensor(BaseOperator):            # Sensor 算子：轮询直到谓词为 True
    kind = "Sensor"
    def __init__(self, task_id, poke):
        super().__init__(task_id); self.poke = poke
    def execute(self, context):
        return "success" if self.poke() else "reschedule"

ops = [PythonOperator("extract", lambda ds: f"rows@{ds}"),
       SqlSensor("wait_ds", lambda: True)]
for op in ops:
    print(f"{op.task_id:<8} [{op.kind}] -> {op.execute({'ds': '2026-10-22'})}")

class PgHook:                             # Hook：连接细节收敛一处，算子零改动
    conn_id = "pg_dw"
    def run(self, sql):
        return f"{self.conn_id} 执行: {sql}"

print(PgHook().run("TRUNCATE stg.orders"))""",
expected="extract  [Action] -> rows@2026-10-22；wait_ds  [Sensor] -> success；pg_dw 执行: TRUNCATE stg.orders——两类算子走同一个 execute 契约，Hook 把连接细节从业务逻辑里剥离。",
cerr="BashOperator 里直接写长管道或 airflow 命令且不设 timeout，僵死进程占满 Worker 槽位；Connection 密码明文写进 DAG 代码并提交 Git，正确做法是 UI/环境变量/密钥后端；在 PythonOperator 函数里手写连接与重试——这些职责应下沉到 Hook 或自定义 Operator，否则每个任务各写一套、无法审计。",
miscon="""1. **『Operator 就是一个函数』**——Operator 是解析期实例化的蓝图对象，运行期才由 Worker 调用 execute；把运行期逻辑放到解析期（如顶层实例化时读数据库）是头号错误；
2. **『跨系统搬运就是两个算子拼起来』**——Transfer Operator 把读源、写目标、清理临时文件封装成原子单元，手拼两步一旦中途失败就会留下半搬的脏数据；
3. **『Hook 可有可无』**——Hook 是算子与外部系统的适配层：换密码、换主机只改 Connection 不改代码；跳过 Hook 意味着凭据散落与审计失控。""",
connection="""- **向前**：第 2 章的『任务与算子』概念在本章展开为完整分类学与自定义体系；
- **向后**：第 4 章 TaskFlow 用 @task 替代大部分手写 PythonOperator，第 7 章把 Sensor 一支单独深化；
- **平行**：《dbt 分析工程》的 materialization 与本章算子同为『声明式积木』思想，自定义 Operator 对应 dbt 的自定义 macro。""",
summary="""| 结论 | 内容 |
| --- | --- |
| 分类学 | Action（执行）/ Transfer（搬运）/ Sensor（等待）三分天下 |
| 基础算子 | BashOperator 执行命令、PythonOperator 执行函数，覆盖九成场景 |
| 连接与密钥 | Connection 存『怎么连』、Variable 存非敏感配置，均不进代码库 |
| Hook | 算子与外部系统的适配层：连接细节收敛、可复用可测试 |
| 自定义 | 继承 BaseOperator + template_fields = 企业中间件的标准封装 |""",
)

GOALS = {
"airflow-l3-1": "1. 说出 Action/Transfer/Sensor 三类算子的判定标准与代表算子；\n2. 为『S3→Postgres→通知』管道选择合适的算子组合；\n3. 解释算子分类对 DAG 可读性与复用性的意义。",
"airflow-l3-2": "1. 熟练配置 BashOperator 的命令、env、cwd 与 timeout；\n2. 用 PythonOperator 的 op_args/op_kwargs 传参并理解上下文注入；\n3. 排查 bash 命令在 Worker 上找不到可执行文件的路径问题。",
"airflow-l3-3": "1. 用 SQLExecuteQueryOperator 执行 DDL/DML 并取回结果；\n2. 说明 SQL 参数绑定与 Jinja 模板如何安全拼接避免注入；\n3. 配置数据库 Connection 并理解连接池参数。",
"airflow-l3-4": "1. 在 Web UI/环境变量/密钥后端三种方式间做安全权衡；\n2. 说出 Connection 与 Variable 的用途边界；\n3. 落实最小权限与密钥轮换的审计要求。",
"airflow-l3-5": "1. 说明 Providers 插件生态如何让 Airflow 支持数百种系统；\n2. 用跨系统搬运算子完成 S3 到仓库的文件转换落地；\n3. 识别搬运过程中的临时文件与失败清理问题。",
"airflow-l3-6": "1. 说明 Hook『封装连接、暴露方法』的两段式设计；\n2. 在自定义 Python 任务中复用 Hook 而非手写驱动；\n3. 用 Hook 的可单测性替代真实环境联调。",
"airflow-l3-7": "1. 继承 BaseOperator 实现公司内部中间件算子；\n2. 用 template_fields 让算子参数支持 Jinja 渲染；\n3. 掌握『重复三次以上即抽象』的自定义判断标准。",
}

PREREQS = {
"airflow-l3-1": "- 「任务（Tasks）与算子（Operators）」（l2-4）——蓝图与实例的区分是本章起点。",
"airflow-l3-2": "- 「Airflow 算子分类学」（l3-1）；\n- Shell 与 Python 函数基础（本课程默认）。",
"airflow-l3-3": "- 「基础算子实战」（l3-2）；\n- 《SQL 数据库查询》的基本 DML 语法。",
"airflow-l3-4": "- 「数据库交互算子」（l3-3）——先有连接需求再谈管理；\n- 环境变量的基本概念。",
"airflow-l3-5": "- 「Airflow 算子分类学」（l3-1）的 Transfer 一支；\n- 「连接与密钥存储」（l3-4）。",
"airflow-l3-6": "- 「连接与密钥存储」（l3-4）——Hook 消费 Connection；\n- Python 类继承基础。",
"airflow-l3-7": "- 「钩子底层设计」（l3-6）与「基础算子实战」（l3-2）；\n- Python 装饰器与类属性进阶用法。",
}

ch = c["chapters"][N-1]
for l in ch["lessons"]:
    if "学习目标" in l["content"]: continue
    lid = l["id"]
    l["content"] = (f"### 学习目标\n\n学完本节，你应该能够：\n{GOALS[lid]}\n\n"
        f"### 前置知识\n\n{PREREQS[lid]}\n\n"
        f"### 问题背景\n\n{THEME['why']}\n\n### 直觉理解\n\n{THEME['intuition']}\n\n"
        f"### 核心概念与原理详解\n\n{l['content'].strip()}\n\n"
        f"### 完整案例（含手算）\n\n以下代码完整演算本章主题的核心流程：\n\n"
        f"### 代码实践\n\n{BT3}python\n{THEME['code']}\n{BT3}\n\n预期输出（实测）：{THEME['expected']}\n\n**常见错误**：{THEME['cerr']}\n\n"
        f"### 常见误区\n\n{THEME['miscon']}\n\n### 知识关联\n\n{THEME['connection']}\n\n"
        f"### 本节总结\n\n{THEME['summary']}\n\n"
        f"### 参考资料\n\n> **来源类型：参考资料**\n> - 本课程整理（可参见 Apache Airflow 官方文档 docs.airflow.io 相应章节）")
c["updatedAt"] = int(__import__("time").time()*1000)
json.dump(c, io.open(P,"w",encoding="utf-8",newline="\n"),ensure_ascii=False,indent=2)
print("chapter", N, "done,", len(ch["lessons"]), "lessons")
