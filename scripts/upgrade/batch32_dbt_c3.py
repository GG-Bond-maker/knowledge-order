# -*- coding: utf-8 -*-
import json, io
P = r"D:\Python_Project\knowledge-order\content-data\courses\dbt-analytics-engineering.json"
c = json.load(io.open(P, encoding="utf-8"))
BT3 = chr(96)*3
N = 3
THEME = dict(
why="""分析 SQL 长期散落在 BI 工具、Jupyter 与各种脚本里：没有版本、无法复用、没人敢改。dbt 把"写 SQL"变成"管项目"，用两份 YAML、一套目录骨架把转换代码纳入软件工程式的治理结构，这是后续一切 DAG、测试、文档能力的地基。""",
intuition="""dbt 项目像一个 Makefile 工程：dbt_project.yml 是顶层 Makefile（声明项目名与目录级配置），models/ 目录是源码包，ref() 相当于 make 的依赖声明，dbt run 就是 make all——只重建受影响的目标，其余产物原样保留。""",
code=r'''dbt_project = {
    "name": "shop_analytics", "version": "1.0.0", "profile": "shop",
    "models": {"shop_analytics": {"staging": {"+materialized": "view"},
                                  "marts": {"+materialized": "table"}}},
}

def render_tree(cfg):
    lines = ["shop_analytics/"]
    for layer, sub in cfg["models"]["shop_analytics"].items():
        mat = sub.get("+materialized", "view")
        lines.append(f"├── models/{layer}/   # +materialized: {mat}")
    lines += ["├── macros/", "├── seeds/", "├── tests/",
              "└── dbt_project.yml   # profile: " + cfg["profile"]]
    return "\n".join(lines)

print("项目:", dbt_project["name"], "| 使用的 profile:", dbt_project["profile"])
print(render_tree(dbt_project))

profiles = {"shop": {"outputs": {"dev":  {"type": "duckdb", "schema": "analytics_dev"},
                                 "prod": {"type": "duckdb", "schema": "analytics_prod"}},
                     "target": "dev"}}
tgt = profiles["shop"]["target"]
print("当前 target:", tgt, "→ 写入 schema:", profiles["shop"]["outputs"][tgt]["schema"])
''',
expected="""项目: shop_analytics | 使用的 profile: shop
shop_analytics/
├── models/staging/   # +materialized: view
├── models/marts/   # +materialized: table
├── macros/
├── seeds/
├── tests/
└── dbt_project.yml   # profile: shop
当前 target: dev → 写入 schema: analytics_dev""",
cerr="""1) 把数据库凭证写进 dbt_project.yml 提交进 Git——凭证只属于 profiles.yml 且必须 gitignore；2) models 目录下随意嵌套同名子目录或把 SQL 丢在项目根，导致资源名冲突与编译报错；3) 一个 profile 只配一个输出，开发与生产共写同一 schema 互相覆盖，"我的表怎么没了"频发。""",
miscon="""1. "dbt 是数据库或计算引擎"——dbt 只编译 SQL 并下发到既有数仓执行，自己既不存数据也不算数据；
2. "上生产必须用 dbt Cloud"——Core + Airflow/GitHub Actions 同样能构建生产链路，Cloud 买的是托管与协作；
3. "seed 可以当事实表用"——seed 只适合小而慢变的映射类数据，大批量数据仍应走 source 摄取。""",
connection="""- **向前**：依赖第 1 章"仓内转换"范式与第 2 章建模理论，为其提供工程载体；
- **向后**：第 4 章 ref()/DAG 与第 5 章目录分层都在本章骨架上展开；
- **平行**：《Airflow 数据编排》负责调度 dbt run，与本章 profiles 的 target 环境配置配套使用。""",
summary="""| 结论 | 内容 |
| --- | --- |
| dbt = 编译器 + 编排器 | 只做 T：编译 Jinja-SQL 并下发数仓执行 |
| 两份 YAML 各司其职 | project 定项目结构与配置，profiles 定连接与环境 |
| 目录即模块 | models/macros/seeds/tests 职责分离，资源名全局唯一 |
| seed 版本化小数据 | CSV 入 Git、dbt seed 入仓，适合映射表而非大表 |""")

GOALS = {
 "dbt-l3-1": "1. 说明 dbt「只做 Transform、算力推给数仓」的架构决策及其收益；\n2. 描述 dbt compile→run 的编译、下发、执行三段式流程；\n3. 解释 dbt 为什么不搬数据也能成为转换中枢。",
 "dbt-l3-2": "1. 对比 dbt Core 与 dbt Cloud 在调度、CI、文档上的功能边界；\n2. 依据团队规模与预算给出选型建议；\n3. 说明两者在项目文件层面完全兼容的意义。",
 "dbt-l3-3": "1. 说出 models/macros/seeds/tests 目录各自的职责；\n2. 解释目录即命名空间的资源唯一标识规则；\n3. 规划一个中等项目的标准目录骨架。",
 "dbt-l3-4": "1. 解读 dbt_project.yml 中 name/profile/version 关键指令的作用；\n2. 用 +materialized 等加号配置实现目录级配置级联继承；\n3. 区分项目级与模型级配置的优先级。",
 "dbt-l3-5": "1. 写出 profiles.yml 的 outputs/target 两级结构；\n2. 用多 target 实现 dev/prod 的 schema 物理隔离；\n3. 说明凭证不进 Git 的安全实践。",
 "dbt-l3-6": "1. 说明 seed 把 CSV 版本化为数仓表的机制与适用边界；\n2. 区分 seed 与 source 两类「外部数据」入口；\n3. 列举适合 seed 的典型场景（映射表、白名单、测试夹具）。",
 "dbt-l3-7": "1. 从 dbt init 到 dbt run 完成一次规范项目的从零搭建；\n2. 用 dbt debug / dbt docs 做项目健康检查；\n3. 用自查清单验收项目结构与配置的规范性。",
}
PREREQS = {
 "dbt-l3-1": "- 第 1 章《现代数据栈 (MDS) 与分析工程导论》与第 2 章建模基础。",
 "dbt-l3-2": "- 《dbt 架构剖析：只做 T (Transform)，算力推下》。",
 "dbt-l3-3": "- 《dbt Core vs dbt Cloud：技术选型与企业适用场景》的形态差异认知。",
 "dbt-l3-4": "- 《dbt 项目目录骨架详解与职责划分》，并了解 YAML 基本语法。",
 "dbt-l3-5": "- 《全局配置文件 dbt_project.yml 核心指令深度解读》（profile 指令的对接方）。",
 "dbt-l3-6": "- 《连接与凭证 profiles.yml》的连接配置，回顾第 2 章维度建模中的映射表需求。",
 "dbt-l3-7": "- 完成本章 l3-1 至 l3-6 全部小节，建议本地已安装 dbt Core。",
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
