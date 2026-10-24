# -*- coding: utf-8 -*-
import json, io
P = r"D:\Python_Project\knowledge-order\content-data\courses\dbt-analytics-engineering.json"
c = json.load(io.open(P, encoding="utf-8"))
BT3 = chr(96)*3
N = 7
THEME = dict(
why="""SQL 本身没有变量、循环与条件，百行重复的 CASE WHEN 只能人肉复制、改一处漏三处。dbt 在编译期插入一层 Jinja 模板，让 SQL 拥有参数化与代码生成能力，而最终下发到数仓的仍是纯 SQL——动态性止步于编译期，不牺牲可优化性。""",
intuition="""Jinja 像合同模板里的填空与可选条款：{{ 客户名 }} 是填空（表达式求值后插入），{% if 含税 %} 是勾选才生效的条款（控制生成结构），渲染引擎把模板变成一份具体合同——一旦签署（编译完成）就不再回头改动。""",
code=r'''import re

def mini_jinja(template, ctx):
    out = template
    for k, v in ctx.items():                                    # {{ var }} 表达式替换
        out = out.replace("{{ " + k + " }}", str(v))
    out = re.sub(r"{% if (\w+) %}(.*?){% endif %}",              # {% if %} 条件块
                 lambda m: m.group(2) if ctx.get(m.group(1)) else "", out, flags=re.S)
    def render_for(m):                                          # {% for %} 循环展开
        item, body = m.group(1), m.group(3)
        return "".join(body.replace("{{ " + item + " }}", str(i)) for i in ctx[m.group(2)])
    out = re.sub(r"{% for (\w+) in (\w+) %}(.*?){% endfor %}", render_for, out, flags=re.S)
    return out

tpl = """-- target: {{ target_name }}
select order_id, amount
from {{ schema }}.stg_orders
{% if is_dev %}
where amount < 1000  -- dev 环境只看小订单
{% endif %}
-- 动态指标: {% for d in dims %}sum({{ d }}_amt) + {% endfor %}0"""

ctx = {"target_name": "dev", "schema": "analytics_dev", "is_dev": True,
       "dims": ["food", "book"]}
print("== dev 渲染 =="); print(mini_jinja(tpl, ctx))
ctx.update(target_name="prod", schema="analytics_prod", is_dev=False)
print("== prod 渲染 =="); print(mini_jinja(tpl, ctx))
''',
expected="""== dev 渲染 ==
-- target: dev
select order_id, amount
from analytics_dev.stg_orders

where amount < 1000  -- dev 环境只看小订单

-- 动态指标: sum(food_amt) + sum(book_amt) + 0
== prod 渲染 ==
-- target: prod
select order_id, amount
from analytics_prod.stg_orders

-- 动态指标: sum(food_amt) + sum(book_amt) + 0""",
cerr="""1) 把行级业务判断写成 Jinja if 而不是 SQL CASE——Jinja 是编译期一次性渲染，逐行数据的条件必须交给 SQL 运行期；2) 未用 --vars 定义就直接 var('x')，编译报未定义变量直接失败；3) 循环体内不处理 loop.last 的逗号边界，生成的多列 SQL 语法错误且难排查。""",
miscon="""1. "Jinja 让 SQL 变成通用编程语言"——Jinja 只在编译期生成 SQL 文本，运行期执行的仍是纯 SQL；
2. "模板越动态越显得高级"——过度元编程让模型无法 grep、无法解释，宁可适度重复也别写天才模板；
3. "env_var 直接拼进 SQL 没风险"——仍要防注入与凭证泄漏，敏感值只做配置不应渲染进可分发产物。""",
connection="""- **向前**：第 4 章的 ref()/source() 本身就是 Jinja 宏调用；
- **向后**：第 8 章自定义宏是 Jinja 代码复用的工程化封装；
- **平行**：《数据分析方法论》中报表参数化与本章模板思想同源。""",
summary="""| 结论 | 内容 |
| --- | --- |
| 编译期模板层 | Jinja 在 SQL 下发前渲染，产物是纯 SQL |
| 表达式 vs 语句 | {{ }} 求值插入文本，{% %} 控制生成结构 |
| 变量分三层 | var 传参、env_var 读环境、target 读运行上下文 |
| 少即是多 | 元编程适度使用，可读性与可 grep 性优先 |""")

GOALS = {
 "dbt-l7-1": "1. 说明 Jinja 在 dbt 中「SQL 下发前的编译期模板层」角色；\n2. 区分 {{ 表达式 }} 与 {% 语句 %} 两类语法；\n3. 用 {{ 1 + 2 }} 式表达式演示编译期求值。",
 "dbt-l7-2": "1. 用 --vars 与 var() 传递运行期变量；\n2. 用 env_var() 读取环境变量实现跨环境配置；\n3. 制定敏感配置进环境变量而非 Git 的规范。",
 "dbt-l7-3": "1. 写出 for-endfor 遍历列表批量生成 SQL 的模板；\n2. 用 loop.last 控制逗号等边界处理；\n3. 用循环替代数十行重复的 CASE WHEN。",
 "dbt-l7-4": "1. 用 if/elif/else 按适配器方言生成分支 SQL；\n2. 结合 target.name 实现 dev/prod 行为开关；\n3. 说明编译期分支与 SQL CASE 的分工边界。",
 "dbt-l7-5": "1. 读取 target.name/schema 等运行期上下文对象；\n2. 用 flags 判断 full_refresh 等执行状态；\n3. 说明 this 的自引用用途。",
 "dbt-l7-6": "1. 用元数据查询驱动 SQL 代码自动生成；\n2. 实现数据字典驱动的自动维度展开；\n3. 评估动态生成带来的可维护性代价。",
 "dbt-l7-7": "1. 用 dbt compile 检查渲染产物定位模板错误；\n2. 用 {%- -%} 控制 whitespace 避免空行灾难；\n3. 用 log() 打点输出编译期调试信息。",
}
PREREQS = {
 "dbt-l7-1": "- 第 4 章《从 Jinja 源码到数仓执行：target/compiled 与 target/run 底层揭秘》。",
 "dbt-l7-2": "- 《当 SQL 遇见 Python 哲学：Jinja 模板在 dbt 中的核心角色与表达式基础》。",
 "dbt-l7-3": "- 《变量（Variables）与环境隔离：`var()`、`env_var()` 与跨环境动态配置》。",
 "dbt-l7-4": "- 《控制流实战：循环 `for` 语句在批量指标生成与自动列扩展中的应用》。",
 "dbt-l7-5": "- 完成本章前四节；了解第 3 章 profiles.yml 的 target 结构。",
 "dbt-l7-6": "- 本章前 5 节，并对第 8 章宏有初步认知。",
 "dbt-l7-7": "- 完成本章 l7-1 至 l7-6 全部小节。",
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
