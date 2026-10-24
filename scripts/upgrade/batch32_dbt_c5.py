# -*- coding: utf-8 -*-
import json, io
P = r"D:\Python_Project\knowledge-order\content-data\courses\dbt-analytics-engineering.json"
c = json.load(io.open(P, encoding="utf-8"))
BT3 = chr(96)*3
N = 5
THEME = dict(
why="""当模型数从 10 涨到 300，扁平结构里"谁引用谁"再也说不清，一次上游改动像推倒多米诺。分层把复杂度切成有纪律的流水线：清洗、组装、出餐各归其位，每层只对下一层负责，变更影响面变得可预测、可审计。""",
intuition="""三层像中央厨房的三个分区：Staging 是清洗区（每样食材洗切改刀、绝不改菜谱），Intermediate 是备菜区（把食材搭配腌制成半成品），Marts 是出餐区（按菜单组装成品直接上桌给 BI 客人端走）。""",
code=r'''raw_orders = [
    {"order_id": "1", "user_id": "101", "amt_cents": 29900, "ts": "2024-06-01"},
    {"order_id": "2", "user_id": "102", "amt_cents": 8950,  "ts": "2024-06-02"},
    {"order_id": "1", "user_id": "101", "amt_cents": 29900, "ts": "2024-06-01"},
]
raw_users = [{"user_id": 101, "user_name": "Alice"}, {"user_id": 102, "user_name": "Bob"}]

# Staging 层：一源一模型，重命名 + 类型强制转换 + 去重（不改业务语义）
stg_orders = [{"order_id": int(o["order_id"]), "user_id": int(o["user_id"]),
               "amount": o["amt_cents"] / 100, "ts": o["ts"]} for o in raw_orders]
stg_orders = [dict(t) for t in {tuple(sorted(s.items())) for s in stg_orders}]
print("stg_orders:", stg_orders)

# Intermediate 层：跨实体关联，产出可复用的业务中间产物
int_joined = [{"order_id": s["order_id"], "user_name": u["user_name"],
               "amount": s["amount"], "ts": s["ts"]}
              for s in stg_orders for u in raw_users if s["user_id"] == u["user_id"]]

# Marts 层：面向业务的最终事实（BI 直接消费）
fct = {"fct_order_amount": sum(r["amount"] for r in int_joined),
       "order_cnt": len(int_joined)}
print("int_orders_joined:", int_joined)
print("fct_orders:", fct)
''',
expected="""stg_orders: [{'amount': 299.0, 'order_id': 1, 'ts': '2024-06-01', 'user_id': 101}, {'amount': 89.5, 'order_id': 2, 'ts': '2024-06-02', 'user_id': 102}]
int_orders_joined: [{'order_id': 1, 'user_name': 'Alice', 'amount': 299.0, 'ts': '2024-06-01'}, {'order_id': 2, 'user_name': 'Bob', 'amount': 89.5, 'ts': '2024-06-02'}]
fct_orders: {'fct_order_amount': 388.5, 'order_cnt': 2}""",
cerr="""1) 在 staging 层做业务 JOIN 或聚合，下游全部继承不可逆的语义污染，出问题无法回退；2) marts 直接引用 source 原始表抄近路，分层防护被打穿、血缘图变成毛线球；3) 命名随意（final_v2、tmp_xxx），前缀体系与目录级配置、DAG 选择器全部失效。""",
miscon="""1. "Intermediate 层可有可无，stg 直连 marts 就行"——复杂 JOIN 挤进 marts 后无法复用，集市之间复制粘贴成灾；
2. "层数越多越专业"——层数是复杂度的产物而非目标，小项目两层（stg+marts）即可起步；
3. "staging 顺便做业务过滤也没事"——staging 只做格式规范化，业务过滤是 int/marts 层的语义决策，位置错了无法追溯口径。""",
connection="""- **向前**：第 2 章 dim/fct 理论与第 4 章 ref 依赖是分层的原料；
- **向后**：第 6 章按层选择物化策略（stg 常用 view、marts 常用 table/incremental）；
- **平行**：与《数据工程与语料构建》的清洗流水线互参——分层是所有数据管道的通用治理形态。""",
summary="""| 结论 | 内容 |
| --- | --- |
| Staging = 格式规范化 | 一源一模型：重命名、转类型、标准化，绝不加业务逻辑 |
| Intermediate = 业务组装 | 跨实体 JOIN 与预计算，吸收复杂度供多处复用 |
| Marts = 业务出餐 | dim_/fct_ 直接对 BI，按业务域组织目录 |
| 单向依赖是铁律 | 只许向下引用，反模式靠 code review 与命名前缀拦截 |""")

GOALS = {
 "dbt-l5-1": "1. 说出 Staging/Intermediate/Marts 三层的定位与进出边界；\n2. 解释「每层只做一类事」的单一职责原则；\n3. 判断一个给定转换应该放在哪一层。",
 "dbt-l5-2": "1. 列举 staging 层的规范动作（字段重命名、类型强制转换、布尔标准化）；\n2. 说明 stg_ 模型「一源一模型、不加业务逻辑」的戒律；\n3. 用 dbt_utils 风格表达式完成字段规范化。",
 "dbt-l5-3": "1. 描述 int_ 层的跨实体关联与复杂维度预计算职责；\n2. 说明中间层如何吸收复杂度让 marts 保持轻；\n3. 识别应下沉到 int 层的重复 JOIN 逻辑。",
 "dbt-l5-4": "1. 按第 2 章理论落地 dim_*/fct_* 命名的集市模型；\n2. 设计面向业务域的 marts 目录组织；\n3. 让集市模型直接、稳定地服务 BI 查询。",
 "dbt-l5-5": "1. 制定 stg_/int_/dim_/fct_ 前缀命名规范；\n2. 用 YAML 目录级联继承批量下发配置；\n3. 说明命名一致性对 DAG 可读性与选择器的价值。",
 "dbt-l5-6": "1. 识别向上依赖、跨层穿透等分层反模式；\n2. 用中间层拆解伪循环依赖；\n3. 制定团队分层防护规则（code review 检查项）。",
 "dbt-l5-7": "1. 独立跑通 stg_orders → int_order_items_joined → fct_orders 全链路；\n2. 在每一层验证数据形状与语义的变化；\n3. 用自查清单验收分层的正确性。",
}
PREREQS = {
 "dbt-l5-1": "- 第 4 章《dbt 模型构建与 DAG 依赖解耦》，回顾第 2 章维度建模。",
 "dbt-l5-2": "- 《经典数仓三层架构：Staging、Intermediate 与 Marts 的定位与职责边界》。",
 "dbt-l5-3": "- 《Staging 层的规范清洗：字段重命名、类型强制转换与布尔标准化 (stg_*)》。",
 "dbt-l5-4": "- 《Intermediate 中间层业务抽象》与第 2 章 dim/fct 建模理论。",
 "dbt-l5-5": "- 完成本章前四节；了解第 3 章《dbt_project.yml 核心指令》的配置体系。",
 "dbt-l5-6": "- 本章全部建模小节 + 第 4 章《循环依赖 (Circular Dependencies) 检测与拓扑排序算法直觉》。",
 "dbt-l5-7": "- 完成本章 l5-1 至 l5-6 全部小节。",
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
