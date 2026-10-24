# methodology-3 对比拆解与归因（纯 Python 模拟加法拆解、杜邦乘法拆解与贡献度）
# ---- 加法拆解：GMV 变化 = 各城市变化之和 ----
gmv = {"北京": (100, 85), "上海": (80, 84), "杭州": (60, 66)}   # (本期, 上期)
delta = {c: cur - prev for c, (cur, prev) in gmv.items()}
total = sum(cur - prev for cur, prev in gmv.values())
print("各城市环比变化：", delta, "；合计 =", total)
drop = min(delta, key=delta.get)
print(f"贡献度最大负向：{drop}（{delta[drop]:+d}，占净变化 {delta[drop] / total:.0%}）——资源先投向这里")

# ---- 乘法拆解（杜邦）：GMV = 访客数 × 转化率 × 客单价 ----
base = {"访客数": 100000, "转化率": 0.030, "客单价": 200.0}
now = {"访客数": 110000, "转化率": 0.027, "客单价": 210.0}
g0 = base["访客数"] * base["转化率"] * base["客单价"]
g1 = now["访客数"] * now["转化率"] * now["客单价"]
print(f"\n上期 GMV = {g0:,.0f}；本期 GMV = {g1:,.0f}；变化 = {g1 - g0:+,.0f}")

# 对数分解法：各因子贡献份额之和 = 总变化（可验证）
import math
contrib = {}
for k in base:
    other0 = math.prod(v for kk, v in base.items() if kk != k)
    contrib[k] = (math.log(now[k]) - math.log(base[k])) * other0 * math.sqrt(base[k] * now[k])
scale = (g1 - g0) / sum(contrib.values())          # 归一化，使贡献和恰等于总变化
for k, v in contrib.items():
    print(f"  {k} 的贡献：{v * scale:+,.0f}（占 {v * scale / (g1 - g0):+.1%}）")
print(f"  贡献之和 = {sum(contrib.values()) * scale:+,.0f} = 总变化（拆解闭合）")
print("结论：访客与客单价是正贡献，转化率下滑吃掉了大部分增长——下一步归因聚焦转化漏斗")
