# excel-5 条件格式 / 图表选择 / 公式审计（纯 Python 模拟条件格式规则的求值顺序）
rows = [  # 区域 | 销售额 | 同比
    ["华北", 1200, 0.08],
    ["华东", 980,  -0.12],
    ["华南", 1500, 0.15],
    ["西南", 620,  -0.05],
    ["华北", 1200, 0.08],        # 重复行
]

def rule1(r):   # 规则 1（公式规则）：=AND($B2>1000, $A2="华北") —— 红底加粗
    return r[1] > 1000 and r[0] == "华北"

def rule2(r):   # 规则 2（突出重复值）：整行出现超过一次 —— 黄底
    return [x[:2] for x in rows].count(r[:2]) > 1

vals = [r[1] for r in rows]
q1, q3 = sorted(vals)[len(vals) // 4], sorted(vals)[3 * len(vals) // 4]   # 近似四分位
iqr = q3 - q1
def rule3(r):   # 规则 3（IQR 法标记异常值，与箱线图一致）
    return not (q1 - 1.5 * iqr <= r[1] <= q3 + 1.5 * iqr)

print("Excel 按规则列表自上而下求值，命中即停（“如果为真则停止”）")
for r in rows:
    hit = next((name for name, fn in [("规则1 红色", rule1), ("规则2 黄色", rule2),
                                      ("规则3 IQR 异常", rule3)] if fn(r)), "无格式")
    bar = "#" * int(r[1] / 100)               # 模拟数据条：长度与值成比例
    print(f"  {r[0]} {r[1]:>5} 同比 {r[2]:+.0%} -> {hit:12s} 数据条：{bar}")

print("\nQ1 =", q1, "Q3 =", q3, "IQR =", iqr, "；下界 = 980-1.5×220 = 650，西南 620 < 650 命中 IQR 异常")
print("审计要点：规则优先级 = 列表顺序；末行“重复值”规则被规则 1 挡住，这就是“命中即停”的效果")
