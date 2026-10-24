# methodology-2 指标体系与数据建模（纯 Python 模拟口径固定、漏斗/留存与“平均的平均”）
# ---- 指标字典：五个必须固定的要素 ----
metric = {
    "指标名": "支付转化率",
    "口径": "成功支付 UV / 进入结算页 UV",
    "时间窗": "自然日 00:00-24:00",
    "去重规则": "按 user_id 去重，跨端合并",
    "单位与精度": "百分比，保留 2 位小数",
}
print("指标字典示例：", metric["指标名"], "=", metric["口径"])
for k, v in metric.items():
    if k != "指标名":
        print(f"  {k}：{v}")

# ---- 漏斗：分母用“上一步”还是“首步”，结论完全不同 ----
steps = {"浏览详情页": 10000, "加购": 3000, "下单": 1200, "支付": 900}
prev, first = None, steps["浏览详情页"]
print("\n漏斗（分母=上一步 vs 分母=首步）：")
for name, uv in steps.items():
    if prev:
        print(f"  {name}：{uv}，逐步转化 {uv / prev:.1%}，整体转化 {uv / first:.1%}")
    prev = uv

# ---- 留存：曲线形状比单点更重要 ----
cohort = {0: 1000, 1: 420, 3: 260, 7: 180, 14: 120, 30: 80}
print("\n新客第 1/7/30 日留存：", ", ".join(f"{k}日 {v / 1000:.0%}" for k, v in cohort.items() if k in (1, 7, 30)))

# ---- 比率类指标的陷阱：平均的平均 ----
regions = {"A 城": (120000, 2400), "B 城": (20000, 800)}   # (GMV, 订单数)
wrong = sum(g / o for g, o in regions.values()) / len(regions)      # 先算各城客单价再简单平均
gmv, orders = sum(x[0] for x in regions.values()), sum(x[1] for x in regions.values())
right = gmv / orders                                                # 加权：总 GMV / 总订单
print(f"\n客单价——各城平均的平均：{wrong:.1f}；总额相除：{right:.1f}（后者才是公司真实客单价）")
