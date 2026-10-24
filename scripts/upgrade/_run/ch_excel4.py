# excel-4 透视表 / Power Query / Power Pivot（纯 Python 模拟分组汇总、逆透视与合并查询）
records = [  # 一维明细表（Power Query / 透视表的唯一合格数据源）
    {"区域": "华北", "品类": "饮料", "金额": 120},
    {"区域": "华北", "品类": "零食", "金额": 300},
    {"区域": "华东", "品类": "饮料", "金额": 98},
    {"区域": "华东", "品类": "零食", "金额": 260},
    {"区域": "华南", "品类": "饮料", "金额": 150},
]

# ---- 透视表：行=区域，值=金额求和 / 订单计数（值汇总方式）----
pivot = {}
for r in records:
    g = pivot.setdefault(r["区域"], {"金额": 0, "订单": 0})
    g["金额"] += r["金额"]; g["订单"] += 1

total = sum(r["金额"] for r in records)
print("区域 | 金额合计 | 订单数 | 金额占比（占总计百分比）")
for region, g in pivot.items():
    print(f"{region} | {g['金额']:>7} | {g['订单']:>4} | {g['金额'] / total:.1%}")

# ---- Power Query 逆透视：把二维报表还原成一维明细 ----
wide = [["区域", "Q1", "Q2"], ["华北", 420, 380], ["华东", 358, 401]]   # 报表形态
long_rows = [(row[0], q, row[i])                 # (区域, 季度, 金额)
             for row in wide[1:] for i, q in enumerate(wide[0][1:], start=1)]
print("\n逆透视结果（前 4 行）：", long_rows[:4], "... 共", len(long_rows), "行")

# ---- Power Query 合并查询：跨表取字段（等价于数据模型里的表间关系）----
targets = [{"区域": "华北", "经理": "李雷"}, {"区域": "华东", "经理": "韩梅梅"},
           {"区域": "华南", "经理": "王小明"}]
merged = [{**r, "经理": next(t["经理"] for t in targets if t["区域"] == r["区域"])} for r in records]
print("\n合并查询第 1 行：", merged[0], "（多表合并后单表即可出报表，不再需要每行写 VLOOKUP）")
