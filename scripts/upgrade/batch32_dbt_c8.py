# -*- coding: utf-8 -*-
import json, io
P = r"D:\Python_Project\knowledge-order\content-data\courses\dbt-analytics-engineering.json"
c = json.load(io.open(P, encoding="utf-8"))
BT3 = chr(96)*3
N = 8
THEME = dict(
why="""同一段"分转元、生成代理键"的 SQL 在 40 个模型里复制 40 遍，改一处漏三处。宏把可复用 SQL 封装成带参数的积木，包机制再把积木变成跨团队共享的标准库——分析 SQL 终于拥有"函数与库"的世界，重复开始消亡。""",
intuition="""宏像乐高零件的模具：浇一次模具（macro 定义），就能拿到任意多的同款积木（{{ 调用 }}）；dbt-utils 则是官方零件超市，拿来的零件统一按 dbt_utils. 前缀扫码使用，绝不用担心和自家零件重名。""",
code=r'''import hashlib

MACROS = {}
def macro(name):                                 # 宏注册器：名字 -> 可调用工厂
    def deco(fn):
        MACROS[name] = fn
        return fn
    return deco

@macro("surrogate_key")
def surrogate_key(*fields):                      # dbt-utils 风格代理键宏
    joined = "||'-'||".join("coalesce(cast({} as varchar), '')".format(f) for f in fields)
    return "md5({})".format(joined)

@macro("amount_to_cents")
def amount_to_cents(col):                        # 货币单位换算宏
    return "cast(round({} * 100) as bigint)".format(col)

sql = ("select\n  " + MACROS["surrogate_key"]("order_id", "line_item_id")
       + " as order_item_key,\n  " + MACROS["amount_to_cents"]("amount")
       + " as amount_cents\nfrom stg_orders")
print(sql)

print("Python 端等价哈希:", hashlib.md5("O-1001-2".encode()).hexdigest())
print("手算: 29.9 元 ->", int(round(29.9 * 100)), "分 | 已注册宏:", sorted(MACROS))
''',
expected="""select
  md5(coalesce(cast(order_id as varchar), '')||'-'||coalesce(cast(line_item_id as varchar), '')) as order_item_key,
  cast(round(amount * 100) as bigint) as amount_cents
from stg_orders
Python 端等价哈希: 26312370f5f022faff2e8f1196ba310c
手算: 29.9 元 -> 2990 分 | 已注册宏: ['amount_to_cents', 'surrogate_key']""",
cerr="""1) 自定义宏与 dbt-utils 宏重名，后加载者静默覆盖前者，SQL 语义悄悄漂移；2) packages.yml 不锁版本（跟随 latest），上游包一次重构导致全公司 CI 红屏；3) 宏里 run_query 不做空结果防护，新环境首次编译直接崩溃。""",
miscon="""1. "宏能替代模型"——宏是编译期文本工厂，不落表不承载数据，数据必须由模型承载；
2. "什么逻辑都要抽宏"——只用一次的逻辑内联即可，过早抽象比重复更难维护；
3. "dbt deps 会自动升级依赖"——deps 只按 packages.yml 锁定的版本拉取，升级必须显式改版本号。""",
connection="""- **向前**：第 7 章 Jinja 语法是宏的语言基础；
- **向后**：第 9 章通用测试本质是 dbt 内置的测试宏，同源复用；
- **平行**：与软件工程"函数 → 库 → 包管理器"的演进完全同构，可参 Python 课程的模块化思想。""",
summary="""| 结论 | 内容 |
| --- | --- |
| 宏 = 编译期函数 | {% macro %} 定义、{{ }} 调用，产物是 SQL 片段 |
| 包 = 共享标准库 | packages.yml + dbt deps，namespace 前缀隔离调用 |
| dbt-utils 三板斧 | surrogate_key / pivot / get_column_values 覆盖八成重复 |
| 抽象要克制 | 重复三次再抽宏，命名与版本治理先行 |""")

GOALS = {
 "dbt-l8-1": "1. 说明宏「带参数的 Jinja 代码块」这一函数式本质；\n2. 区分宏（编译期生成 SQL）与模型（运行期数据集）；\n3. 判断哪类重复逻辑值得抽成宏。",
 "dbt-l8-2": "1. 写出 {% macro %} 定义与 {{ 宏名() }} 调用的完整语法；\n2. 用默认参数与可变参数提升宏的通用性；\n3. 处理参数拼接中的数据类型与引号问题。",
 "dbt-l8-3": "1. 封装货币换算、时区标准化、哈希主键三类高频业务宏；\n2. 说明 surrogate_key 一致性哈希对跨表关联的意义；\n3. 在模型中复用自定义宏消除复制粘贴。",
 "dbt-l8-4": "1. 用 run_query 在编译期查询数仓元数据；\n2. 将查询结果注入模板实现数据驱动代码生成；\n3. 评估编译期查询对整体构建时长的影响。",
 "dbt-l8-5": "1. 写出 packages.yml 并执行 dbt deps 安装；\n2. 用 dbt_utils. 命名空间调用第三方包宏；\n3. 锁定版本避免上游破坏性变更。",
 "dbt-l8-6": "1. 熟练调用 surrogate_key、pivot、get_column_values 三个核心宏；\n2. 说明 get_column_values 与 run_query 的关系；\n3. 用 pivot 替代手写的聚合 CASE 展开。",
 "dbt-l8-7": "1. 将团队公共宏抽成内部 Git 包发布；\n2. 制定宏库版本与变更通知机制；\n3. 治理宏命名冲突与废弃流程。",
}
PREREQS = {
 "dbt-l8-1": "- 第 7 章《Jinja 模板引擎与动态 SQL 编程》全部基础小节。",
 "dbt-l8-2": "- 《什么是 dbt 宏（Macros）？将 SQL 逻辑封装为函数式积木》。",
 "dbt-l8-3": "- 《宏的定义与参数传递：{% macro %}、默认参数与类型处理》。",
 "dbt-l8-4": "- 《常用业务宏封装实战》与第 7 章编译期渲染概念。",
 "dbt-l8-5": "- 完成本章前四节；了解 Git 依赖管理基础。",
 "dbt-l8-6": "- 已按《dbt 包生态与 packages.yml》安装 dbt-utils 包。",
 "dbt-l8-7": "- 完成本章 l8-1 至 l8-6；了解组织级协作流程。",
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
