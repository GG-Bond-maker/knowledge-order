# -*- coding: utf-8 -*-
"""batch31: Airflow 课程第 4 章（TaskFlow @task）章主题包升级"""
import json, io
P = r"D:\Python_Project\knowledge-order\content-data\courses\airflow-data-engineering.json"
c = json.load(io.open(P, encoding="utf-8"))
BT3 = chr(96) * 3
N = 4

THEME = dict(
why="传统 PythonOperator 写法里，推数据要手写 xcom_push/xcom_pull、传参要拼 op_kwargs、依赖要另起一行 >>——每行都是样板，每行都可能错，业务逻辑被调度样板淹没。Airflow 2.0 的 TaskFlow 用一个 @task 装饰器把『定义任务、声明依赖、传递数据』压缩回普通 Python 函数调用的样子：代码量减半、类型更清晰、测试更容易。这一章完成从模板代码到函数式声明的范式迁移，并说清混合编排与多返回值等生产必备形态。",
intuition="@task 像给函数戴上『工牌』：戴上后再调用它并不会立刻干活，而是登记一张任务卡片并返回一张『提货单』（XCom 引用）；你把提货单传给下一个戴工牌的函数，Airflow 就知道先干谁后干谁、干完的货放到哪。依赖图与数据流被一次函数调用同时声明——写 DAG 终于长得像写普通 Python 程序，但执行语义仍是调度器说了算。",
code="""from functools import wraps

NODES, EDGES = {}, {}                  # 解析期登记的任务蓝图与依赖边

class XComRef:                         # 「提货单」：只携带来源，不携带数据
    def __init__(self, task_id):
        self.task_id = task_id

def task(fn):
    @wraps(fn)
    def wrapper(*args):
        NODES[fn.__name__] = fn
        for a in args:                 # 参数里的提货单 = 上游
            if isinstance(a, XComRef):
                EDGES.setdefault(fn.__name__, set()).add(a.task_id)
        return XComRef(fn.__name__)    # 不执行！只登记并返回引用
    return wrapper

@task
def extract():
    return 21

@task
def transform(x):
    return x * 2

ref = transform(extract())             # 一行调用 = 依赖 + 数据流同时声明
print("登记任务:", sorted(NODES))
print("推断依赖:", {k: sorted(v) for k, v in EDGES.items()})

results = {}                           # 运行期：调度器按拓扑序执行并注入返回值
for name in ["extract", "transform"]:
    args = [results[u] for u in sorted(EDGES.get(name, []))]
    results[name] = NODES[name](*args)
    print(f"运行 {name} -> {results[name]}")""",
expected="登记任务: ['extract', 'transform']；推断依赖: {'transform': ['extract']}；运行 extract -> 21；运行 transform -> 42——调用发生时只登记不执行，依赖从参数自动推断，运行期按拓扑序执行并注入返回值。",
cerr="把 @task 函数当普通函数在 DAG 顶层直接取返回值（解析期求值），拿到的是 XComArg 引用而不是数据，解析期即报错或得到 None；在 @task 之外调用被装饰函数并消费其结果，导致依赖缺失或解析期执行业务逻辑；混编时把经典 Operator 实例直接当参数传给 @task 函数而不经 .output/XComArg 桥接，依赖与数据流都对不上。",
miscon="""1. **『@task 只是语法糖』**——它同时改写了执行语义：解析期不执行、返回 XComArg、参数即依赖；当普通函数用会在解析期暴露问题；
2. **『TaskFlow 能完全取代传统算子』**——碰 shell、数据库、外部系统仍需经典 Operator，Hybrid 混编才是生产常态；
3. **『多返回值要手工打包再 pull』**——直接返回 dict/tuple，下游按键解构消费即可，手工 push/pull 反而退回老写法。""",
connection="""- **向前**：第 3 章的 PythonOperator 是 @task 的底层实现载体，理解前者才能看懂装饰器做了什么；
- **向后**：第 5 章 XCom 讲清『提货单』背后的元数据库机制与大小限制，第 6 章 @task.branch、第 10 章 .expand() 都建立在 XComArg 之上；
- **平行**：《Python 工程实践》的装饰器原理是读懂本章模拟代码的钥匙。""",
summary="""| 结论 | 内容 |
| --- | --- |
| 范式迁移 | 手写 push/pull + op_kwargs → 函数调用即依赖与数据流 |
| 核心对象 | XComArg：解析期引用，运行期由调度器解析注入 |
| 混合编排 | @task 与经典 Operator 可自由混搭（Hybrid DAG） |
| 多返回值 | 返回 dict/tuple 自动拆为多个可订阅输出 |
| 边界 | 外部系统交互仍靠经典算子；@task 不改变 XCom 大小限制 |""",
)

GOALS = {
"airflow-l4-1": "1. 对比传统 PythonOperator 写法与 TaskFlow 写法的样板代码差异；\n2. 解释『解析期登记、运行期执行』的两阶段语义；\n3. 说出范式迁移对单测与代码评审的收益。",
"airflow-l4-2": "1. 用 @task 装饰任意函数并配置多参数任务；\n2. 说明被装饰函数在何时、哪个进程真正执行；\n3. 处理 @task 函数的导入路径与序列化要求。",
"airflow-l4-3": "1. 用函数参数自动绑定上游返回值；\n2. 解释 XComArg 的惰性与运行期解析机制；\n3. 排查『返回值为什么是 None/XComArg』类问题。",
"airflow-l4-4": "1. 用自然调用与 >> 两种方式声明依赖并混用；\n2. 说明 TaskFlow 下依赖与数据流合一的推导规则；\n3. 画出一段混编 DAG 的真实拓扑。",
"airflow-l4-5": "1. 在同一 DAG 融合 @task 与 Bash/SQL 经典算子；\n2. 用 .output 桥接经典算子输出到 @task 参数；\n3. 识别混编时 Jinja 模板与 XComArg 的渲染先后。",
"airflow-l4-6": "1. 返回 dict/tuple 并在下游解构消费；\n2. 说明多输出在 XCom 中按键存储的结构；\n3. 用多返回值避免下游重复拉取整个大对象。",
"airflow-l4-7": "1. 说出 @task.docker/@task.kubernetes 的沙箱隔离价值与代价；\n2. 为多语言/重依赖任务选择运行沙箱；\n3. 评估镜像管理与冷启动成本。",
}

PREREQS = {
"airflow-l4-1": "- 「基础算子实战」（l3-2）中 PythonOperator 的样板代码——先见旧世界的痛。",
"airflow-l4-2": "- 「TaskFlow API 革命」（l4-1）；\n- Python 装饰器基本语法。",
"airflow-l4-3": "- 「@task 装饰器核心用法」（l4-2）。",
"airflow-l4-4": "- 「任务间数据流传」（l4-3）与「任务依赖关系语法」（l2-5）。",
"airflow-l4-5": "- 「TaskFlow 时代的依赖编排」（l4-4）与「基础算子实战」（l3-2）。",
"airflow-l4-6": "- 「任务间数据流传」（l4-3）——先懂单一返回值。",
"airflow-l4-7": "- 「混合编排」（l4-5）；\n- Docker 基本概念（l1-7 已铺垫）。",
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
