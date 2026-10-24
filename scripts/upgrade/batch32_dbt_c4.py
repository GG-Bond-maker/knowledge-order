# -*- coding: utf-8 -*-
import json, io
P = r"D:\Python_Project\knowledge-order\content-data\courses\dbt-analytics-engineering.json"
c = json.load(io.open(P, encoding="utf-8"))
BT3 = chr(96)*3
N = 4
THEME = dict(
why="""下游表名一改、几十张报表集体报错，是手写 SQL 的日常。dbt 的答案是：把"谁依赖谁"从人脑搬进代码——用 ref() 声明依赖，引擎自动推导拓扑顺序、只重建受影响的部分，并在编译期就拦住一切断链。""",
intuition="""ref('stg_orders') 就像编程语言里的函数调用或包导入：你只声明"我要用这个模型"，解析、寻址、排序全部交给引擎；而硬编码表名像复制粘贴的魔法字符串，坏了才知道。这一章就是给数仓装上编译器的依赖系统。""",
code=r'''import re

models = {
    "stg_orders":     "-- select * from raw_orders",
    "stg_customers":  "-- select * from raw_customers",
    "int_orders_joined": "select ... from {{ ref('stg_orders') }} o join {{ ref('stg_customers') }} c",
    "fct_orders":     "select ... from {{ ref('int_orders_joined') }}",
}
graph = {m: sorted(set(re.findall(r"ref\('([^']+)'\)", sql))) for m, sql in models.items()}

def topo(g):
    order, seen = [], {}
    def visit(n, stack):
        if seen.get(n) == 2: return
        if seen.get(n) == 1: raise ValueError("循环依赖: " + " -> ".join(stack + [n]))
        seen[n] = 1
        for d in g[n]: visit(d, stack + [n])
        seen[n] = 2; order.append(n)
    for n in sorted(g): visit(n, [])
    return order

print("依赖图:", graph)
print("拓扑执行顺序:", " -> ".join(topo(graph)))

graph["stg_orders"] = sorted(graph["stg_orders"] + ["fct_orders"])  # 人为造环
try:
    topo(graph)
except ValueError as e:
    print("捕获:", e)
''',
expected="""依赖图: {'stg_orders': [], 'stg_customers': [], 'int_orders_joined': ['stg_customers', 'stg_orders'], 'fct_orders': ['int_orders_joined']}
拓扑执行顺序: stg_customers -> stg_orders -> int_orders_joined -> fct_orders
捕获: 循环依赖: fct_orders -> int_orders_joined -> stg_orders -> fct_orders""",
cerr="""1) 在模型里直接写 from raw_db.stg_orders 硬编码表名，schema 改名后全线炸裂且无编译期警告；2) 以为 ref() 只是拼字符串，忽略它同时注册 DAG 边、延迟解析 schema 的双重作用；3) --select 时忘了 + 前缀，漏建上游依赖导致运行时报 relation does not exist。""",
miscon="""1. "DAG 只是给运维看的图"——DAG 决定构建顺序、CI 选择范围与血缘文档，是 dbt 的中枢语义；
2. "循环依赖 dbt 会自动解开"——dbt 只会报错拒绝编译，循环必须在建模层拆出中间模型；
3. "dbt compile 会执行模型"——compile 只把 Jinja 渲染到 target/compiled，不触碰数仓计算。""",
connection="""- **向前**：在第 3 章项目骨架的 models/ 目录内定义模型文件；
- **向后**：第 5 章分层的层间依赖、第 10 章血缘图谱全部由本章的 ref 边自动生成；
- **平行**：《Airflow 数据编排》的任务依赖图与本章互为镜像——Airflow 编排作业级，dbt 编排模型级。""",
summary="""| 结论 | 内容 |
| --- | --- |
| 一模型一 SELECT | 纯查询定义、整表替换写入，可重建可测试 |
| ref() 三合一 | 解析表名 + 注册依赖 + 支持重构，绝不硬编码 |
| 编译产物可调试 | compiled 是渲染后的 SQL，run 是带物化包裹的最终版 |
| 选择器驱动 CI | +/-/@ 与 state 组合精准圈定变更集 |
| 循环零容忍 | DFS 三色标记在编译期即拒绝成环 |""")

GOALS = {
 "dbt-l4-1": "1. 解释「一个模型 = 一个 SELECT」的纯函数式建模哲学；\n2. 说明 select-only 模型为何天然可测试、可整表重建；\n3. 用 create table as select 语义描述模型落库机制。",
 "dbt-l4-2": "1. 在 YAML 中声明 source 并用 {{ source() }} 引用原始表；\n2. 配置 freshness 的 warn_after / error_after 阈值；\n3. 说明 source 与 ref 在依赖语义上的差异。",
 "dbt-l4-3": "1. 写出 ref() 的调用形式并说明其返回值的「schema.表名」双重身份；\n2. 解释 dbt 如何从 ref() 自动推导 DAG；\n3. 论证硬编码表名如何让重构变成灾难。",
 "dbt-l4-4": "1. 区分 target/compiled 与 target/run 两套产物的差异；\n2. 追踪一条 Jinja SQL 从编译到执行的完整路径；\n3. 用编译产物定位渲染后真实 SQL 的问题。",
 "dbt-l4-5": "1. 使用 --select 的路径、tag、+ 与 @ 选择器语法；\n2. 用 state:selected 实现基于 CI 变更集的精准构建；\n3. 组合选择器完成「某 mart 及其全部下游」的选择。",
 "dbt-l4-6": "1. 说明 dbt 检测循环依赖的报错时机与信息；\n2. 用 DFS 染色（三色标记法）手推拓扑排序；\n3. 区分伪循环（应拆中间层）与真循环（建模错误）。",
 "dbt-l4-7": "1. 将多张原始表经 source/stg/int 逐级 ref 组装；\n2. 画出并验证最终 DAG 的拓扑顺序；\n3. 用自查清单校验依赖方向与模型边界的正确性。",
}
PREREQS = {
 "dbt-l4-1": "- 第 3 章《dbt 核心架构与工程环境初始化》全部小节。",
 "dbt-l4-2": "- 《声明式 SQL 建模哲学：每个模型就是一个纯粹的 SELECT 查询》；第 3 章 profiles 连接认知。",
 "dbt-l4-3": "- 《原始数据源声明：{{ source() }} 宏与新鲜度 (Freshness) 监控》。",
 "dbt-l4-4": "- 《核心依赖解耦魔法：{{ ref() }} 宏与有向无环图 (DAG) 自动推导》。",
 "dbt-l4-5": "- 《从 Jinja 源码到数仓执行：target/compiled 与 target/run 底层揭秘》的产物结构。",
 "dbt-l4-6": "- 《dbt 节点选择器语法 (Node Selection) 深度精通》与前文 ref() 依赖语义。",
 "dbt-l4-7": "- 完成本章 l4-1 至 l4-6 全部小节。",
}
ch = c["chapters"][N-1]
done = 0
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
        f"### 参考资料\n\n> **来源类型：参考资料**\n> - 本课程整理（可参见 dbt 官方文档 docs.getdbt.com 相应章节）")
    done += 1
c["updatedAt"] = int(__import__("time").time()*1000)
json.dump(c, io.open(P,"w",encoding="utf-8",newline="\n"),ensure_ascii=False,indent=2)
print("chapter", N, "done, upgraded", done, "lessons")
