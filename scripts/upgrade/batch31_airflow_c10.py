# -*- coding: utf-8 -*-
"""batch31: Airflow 课程第 10 章（动态映射/SLA/Airflow+dbt）章主题包升级"""
import json, io
P = r"D:\Python_Project\knowledge-order\content-data\courses\airflow-data-engineering.json"
c = json.load(io.open(P, encoding="utf-8"))
BT3 = chr(96) * 3
N = 10

THEME = dict(
why="分区从 30 个涨到 300 个、老板要求『数据晚到一小时就告警』、数仓团队全面转向 dbt——生产后期的三大考题恰好落在 Airflow 的三大现代能力上：动态任务映射让『一个任务定义、N 个运行实例』成为可能；SLA 与可观测性把时间承诺变成监控闭环；Airflow+dbt 分工让调度与建模各归其位。这一章收束全课程，拼出现代数据平台 ELT 到交付的完整版图。",
intuition="动态映射像酒店排房：一个『入住流程』模板（@task），客人名单（上游列表）到了才按人头复制成 N 个实例——名单变长不用改代码；SLA 像外卖超时赔付：下单时就定好承诺时刻，超时系统自动打电话（Miss 回调告警）；Airflow+dbt 像总包与装修队：总包（Airflow）管工地节奏与材料进场时间，装修队（dbt）专注房间内的精装工艺——谁也别抢谁的活。",
code="""from datetime import datetime, timedelta

# 1) 动态映射：编译期 1 个任务定义，运行期按上游列表展开 N 个实例
def expand(mapped_args, partial_cmd):    # expand=逐实例变化, partial=全体共享
    return [f"{partial_cmd} --partition {p}" for p in mapped_args]

PARTITIONS = [f"dt=2026-10-{d:02d}" for d in range(20, 23)]
instances = expand(PARTITIONS, "dbt run")
print(f"1 个映射任务 -> {len(instances)} 个实例")
for ins in instances:
    print("  ", ins)

# 2) SLA：承诺 02:10 出数，实际 02:41 —— 超时即 Miss 回调
sla, done = datetime(2026, 10, 22, 2, 10), datetime(2026, 10, 22, 2, 41)
late = done - sla
print("SLA 检查:", f"MISS 超时 {late} -> 回调告警" if late > timedelta(0) else "达标")

# 3) 分工：Airflow 只编排「何时/何序」，dbt 负责「仓内怎么建」
def build(select):
    return "dbt build --select " + " ".join(select)

print("Airflow 下发:", build(["stg_orders", "fct_orders"]))""",
expected="1 个映射任务 -> 3 个实例（dbt run --partition dt=2026-10-20 / 21 / 22）；SLA 检查: MISS 超时 0:31:00 -> 回调告警；Airflow 下发: dbt build --select stg_orders fct_orders。",
cerr="expand() 塞进运行期才拿到的超大列表又不设并发上限，映射实例数打爆 Worker——需配 max_active_tis_per_dag 限流；SLA 设在任务上却忘了调度延迟本身可能吃掉余量，Miss 频发但根因在调度积压；用 Airflow 逐个调用 dbt model 再手拼依赖——应交给 dbt 自身 DAG（ref）或 Cosmos 渲染，避免两套依赖图漂移。",
miscon="""1. **『动态映射 = 循环创建任务』**——循环在解析期展开（DAG 文件爆炸），expand 在运行期按 run 展开实例，DAG 大小与实例数解耦才是核心收益；
2. **『SLA 就是 timeout』**——timeout 杀任务，SLA 只记账并触发回调告警、不干预执行；两者常配合但语义不同；
3. **『有了 dbt 就不需要 Airflow』**——dbt 只覆盖仓内转换，抽取、跨系统搬运、周边校验仍需编排器，双雄各守一层。""",
connection="""- **向前**：第 4 章的 XComArg 与第 5 章的 XCom 列表是 expand 的数据来源，第 8 章的时间语义是 SLA 时钟的基准；
- **向后**：本课程收官——现代数据平台的下一站是《dbt 分析工程》的建模深水区与数据可观测性体系；
- **平行**：《dbt 分析工程》的 ref/DAG 与本章联合实战互为里外两面。""",
summary="""| 结论 | 内容 |
| --- | --- |
| 动态映射 | expand(逐实例参数) + partial(共享参数)，运行期按上游展开 |
| 映射源 | 上游 XCom 列表是典型输入：先拉清单再展开实例 |
| SLA | 承诺时刻 + Miss 回调告警；只记账不杀任务（timeout 才杀） |
| 可观测性 | Prometheus 指标 + Datadog + Slack/飞书告警三件套闭环 |
| Airflow×dbt | Bash 调用起步、Cosmos 渲染进阶；编排归 Airflow，建模归 dbt |""",
)

GOALS = {
"airflow-l10-1": "1. 说出 expand/partial 各自绑定什么参数；\n2. 对比解析期循环创建任务与运行期映射的差异；\n3. 用映射重写硬编码的多分区任务。",
"airflow-l10-2": "1. 用上游 XCom 列表驱动 expand；\n2. 处理映射实例的依赖与失败隔离；\n3. 平衡映射规模与并发控制。",
"airflow-l10-3": "1. 区分 SLA 与 timeout 的语义与作用层；\n2. 配置 sla 与 Miss 回调实现主动告警；\n3. 设计 P0/P1 管道的分级 SLA 体系。",
"airflow-l10-4": "1. 导出 Prometheus 指标接入现有监控；\n2. 打通 Slack/飞书告警闭环；\n3. 定义调度健康的核心看板指标。",
"airflow-l10-5": "1. 论证 Airflow 与 dbt 为什么天生互补；\n2. 划清编排层与建模层的职责边界；\n3. 识别单用其一的能力缺口。",
"airflow-l10-6": "1. 用 Bash/Operator 调用 dbt 并管理退出码；\n2. 用 Cosmos 把 dbt DAG 动态渲染进 Airflow；\n3. 对比两种集成的维护成本与观测粒度。",
"airflow-l10-7": "1. 串联 ELT 全链路：抽取→dbt 建模→检验→发布；\n2. 综合运用映射/SLA/告警于端到端项目；\n3. 为项目制定交接级文档与验收清单。",
}

PREREQS = {
"airflow-l10-1": "- 「@task 装饰器核心用法」（l4-2）——映射建立在 TaskFlow 之上。",
"airflow-l10-2": "- 「动态任务映射」（l10-1）与第 5 章「XCom 通信」的列表传递。",
"airflow-l10-3": "- 「数据间隔概念革命」（l8-2）——SLA 时钟基于逻辑时间；\n- 「传感器工作模式对比」（l7-3）的等待成本观。",
"airflow-l10-4": "- 「SLA 超时监控机制」（l10-3）；\n- Webhook 与指标导出的基本概念。",
"airflow-l10-5": "- 全课程编排能力（c1–c9）的汇合视角；\n- 对 dbt 定位的基本认知（可先看《dbt 分析工程》第 1 章）。",
"airflow-l10-6": "- 「编排界的双雄会」（l10-5）；\n- 「基础算子实战」（l3-2）与「动态任务映射」（l10-1）。",
"airflow-l10-7": "- 「Airflow + dbt 联合落地最佳实践」（l10-6）与全课程主线收束。",
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
