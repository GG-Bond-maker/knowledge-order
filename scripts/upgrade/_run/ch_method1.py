# methodology-1 业务问题拆解与需求澄清（纯 Python 模拟四步改写与提问清单）
vague = "帮我看一下最近的销售情况"          # 一个典型的模糊需求

CLARIFY = {                              # 提问清单：5W1H 逐项补全
    "Why(为什么问)":    "北方区上周被总部点名，需要一份给大区经理的归因说明",
    "What(看什么)":     "北方区 10 月 GMV 及环比变化，拆到城市与品类",
    "When(时间范围)":   "10 月 vs 9 月，环比口径",
    "Who(受众与决策)":  "大区经理，据此决定下周的补货与促销资源分配",
    "How(交付形式)":    "一页结论 + 一张趋势图 + 一个异常清单",
}
rewritten = "北方区 10 月 GMV 环比下降多少？下降主要来自哪些城市、哪些品类？"
print("模糊需求：", vague)
print("\n提问清单补全（5W1H）：")
for k, v in CLARIFY.items():
    print(f"  {k}：{v}")

def is_answerable(q):                    # 判定一：可被数据回答——有指标、有时间范围
    return ("GMV" in q) and ("10 月" in q) and ("环比" in q)

def is_actionable(q):                    # 判定二：有决策指向——受众拿它能做动作
    return "补货" in CLARIFY["Who(受众与决策)"] or "促销" in CLARIFY["Who(受众与决策)"]

print("\n改写后的好问题：", rewritten)
print("可被数据回答(Answerable)：", is_answerable(rewritten))
print("有决策指向(Actionable)：", is_actionable(rewritten))
print("\n对照原需求的差别：原问题既无时间范围也无受众，改写后四步=对齐背景->锁定指标->"
      "确定口径->明确决策，任何一步缺失，分析师都会返工")
