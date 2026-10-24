# -*- coding: utf-8 -*-
import json, io
P = r"D:\Python_Project\knowledge-order\content-data\courses\dbt-analytics-engineering.json"
c = json.load(io.open(P, encoding="utf-8"))
BT3 = chr(96)*3
N = 2
THEME = dict(
why="""业务方要的是"按城市看销售额"这类直观查询，而业务系统给的是几十张互相纠缠的规范化表。没有一套稳定的建模语法，数仓很快退化成一张张一次性报表的黑盒——口径互相打架、性能无法预测。维度建模就是数仓与世界沟通的语法。""",
intuition="""星型模型像图书馆的索引卡体系：事实表是流水账账本（只记金额、数量和一串编号），维度表是一叠可查阅的卡片（按编号查到"北京""键盘"这些可读描述）。账本保持精瘦跑得快，卡片负责把编号翻译成人话。""",
code=r'''flat = [
    {"oid": 1, "cust": "Alice", "city": "北京", "prod": "键盘", "cat": "外设", "qty": 2, "price": 199},
    {"oid": 2, "cust": "Bob",   "city": "上海", "prod": "显卡", "cat": "硬件", "qty": 1, "price": 3999},
    {"oid": 3, "cust": "Alice", "city": "北京", "prod": "鼠标", "cat": "外设", "qty": 3, "price": 99},
]

dim_customer, dim_product, fct = {}, {}, []
for r in flat:
    ck, pk = r["cust"], r["prod"]
    dim_customer.setdefault(ck, {"sk": len(dim_customer) + 1, "name": ck, "city": r["city"]})
    dim_product.setdefault(pk, {"sk": len(dim_product) + 1, "name": pk, "cat": r["cat"]})
    fct.append({"order_key": r["oid"], "customer_sk": dim_customer[ck]["sk"],
                "product_sk": dim_product[pk]["sk"],
                "qty": r["qty"], "amount": r["qty"] * r["price"]})   # 手算: 2*199=398

print("dim_customer:", dim_customer)
print("dim_product: ", dim_product)
print("fct_orders:  ", fct)

city_amt = {}
for f in fct:
    city = next(d["city"] for d in dim_customer.values() if d["sk"] == f["customer_sk"])
    city_amt[city] = city_amt.get(city, 0) + f["amount"]
print("星型 JOIN 按城市聚合:", city_amt)
print("扁平表行数:", len(flat), "| 事实行数:", len(fct),
      "| 维度行数:", len(dim_customer) + len(dim_product))
''',
expected="""dim_customer: {'Alice': {'sk': 1, 'name': 'Alice', 'city': '北京'}, 'Bob': {'sk': 2, 'name': 'Bob', 'city': '上海'}}
dim_product:  {'键盘': {'sk': 1, 'name': '键盘', 'cat': '外设'}, '显卡': {'sk': 2, 'name': '显卡', 'cat': '硬件'}, '鼠标': {'sk': 3, 'name': '鼠标', 'cat': '外设'}}
fct_orders:   [{'order_key': 1, 'customer_sk': 1, 'product_sk': 1, 'qty': 2, 'amount': 398}, {'order_key': 2, 'customer_sk': 2, 'product_sk': 2, 'qty': 1, 'amount': 3999}, {'order_key': 3, 'customer_sk': 1, 'product_sk': 3, 'qty': 3, 'amount': 297}]
星型 JOIN 按城市聚合: {'北京': 695, '上海': 3999}
扁平表行数: 3 | 事实行数: 3 | 维度行数: 5""",
cerr="""1) 在事实表中存放城市名、品类等描述性属性，维度爆炸且维度更新时要回刷海量事实行；2) 粒度未声明就开工，同一张事实表混入订单级与订单行级度量，聚合结果成倍重复；3) 直接用自然键（手机号、业务 UUID 字符串）做关联键，维度历史被覆盖式更新冲掉后无法回溯。""",
miscon="""1. "雪花模型更规范所以更先进"——规范化省了存储却增加 JOIN 与理解成本，分析场景默认星型；
2. "维度表不重要，事实才是主角"——维度是全公司口径一致性的载体，是总线矩阵的核心资产；
3. "SCD Type 2 记得越细越好"——只对影响分析结论的属性追踪历史，无脑全追踪会让快照表无限膨胀。""",
connection="""- **向前**：以第 1 章的仓内 ELT 为运行平台，为"在哪里建模"提供答案；
- **向后**：第 5 章 stg/int/marts 分层与第 10 章 snapshot（SCD Type 2 自动化）直接落地本章理论；
- **平行**：与《数据分析方法论》的指标口径定义互参——一致性维度是指标一致性的前提。""",
summary="""| 结论 | 内容 |
| --- | --- |
| 事实 = 度量 + 外键 | 事实表只存数值度量与维度外键，瘦而长 |
| 维度 = 可读描述 | 代理键定位行，宽表承载业务语境 |
| 粒度是第一戒律 | 建模前先声明"一行是什么"，粒度混杂必出重复计算 |
| 星型默认优先 | 少 JOIN、好理解，现代 MPP 数仓下规范化收益有限 |
| SCD2 保历史 | 关旧开新记录维度变迁，第 10 章快照可自动化 |""")

GOALS = {
 "dbt-l2-1": "1. 复述 Kimball 方法论「为分析性能与人类直觉而设计」的核心诉求；\n2. 区分 Kimball 总线矩阵自底向上与 Inmon 自顶向下两条建设路线；\n3. 解释维度建模为何天然适配星型查询模式。",
 "dbt-l2-2": "1. 区分可加、半可加与不可加三类度量并各举一例；\n2. 识别事务事实表、周期快照与累积快照三种经典形态；\n3. 判断给定业务事件应落成哪种事实表。",
 "dbt-l2-3": "1. 区分代理键与自然键的用途与生成方式；\n2. 识别退化维度、杂项维度等特殊维度形态；\n3. 说明维度表为何要宽而扁、描述尽量取满。",
 "dbt-l2-4": "1. 画出同一业务下星型与雪花模型的结构差异；\n2. 从 JOIN 成本与人类理解成本两个维度对比两模型；\n3. 说明现代数仓默认选星型的底层原因。",
 "dbt-l2-5": "1. 用一句话陈述粒度宣言（grain statement）并说明其为何是第一戒律；\n2. 识别粒度混杂导致度量重复计算的典型症状；\n3. 为订单头、订单行两类事件分别声明正确粒度。",
 "dbt-l2-6": "1. 区分 SCD Type 0/1/2/3/6 的适用场景；\n2. 手工推导一次 Type 2 变更后新旧两行的有效期字段；\n3. 说明第 10 章 snapshot 如何自动化 SCD Type 2。",
 "dbt-l2-7": "1. 独立完成电商订单流的事实/维度拆分；\n2. 用自查清单校验模型的粒度、键与一致性维度；\n3. 识别违反总线矩阵的一致性维度冲突。",
}
PREREQS = {
 "dbt-l2-1": "- 第 1 章《OLTP 事务数据库 vs OLAP 列式分析数仓的底层物理差异》的分析场景认知。",
 "dbt-l2-2": "- 《维度建模核心哲学：为分析查询性能与人类直觉理解而设计》。",
 "dbt-l2-3": "- 《事实表 (Fact Table) 深度解构：度量类型与三大经典形态》中事实/维度的二分。",
 "dbt-l2-4": "- 《维度表 (Dimension Table) 深度解构：代理键、自然键与退化维度》中的维度规范化概念。",
 "dbt-l2-5": "- 《事实表深度解构》的度量类型 + 《星型模型 vs 雪花模型》的结构观。",
 "dbt-l2-6": "- 《维度表深度解构》的代理键概念，可回看《事实表粒度 (Grain) 原则》。",
 "dbt-l2-7": "- 完成本章 l2-1 至 l2-6 全部小节。",
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
