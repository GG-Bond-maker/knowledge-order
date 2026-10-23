# -*- coding: utf-8 -*-
"""批次11 修正 v2：对匹配串套用 to_ts 转义；数值按实测校准。"""
import io

F = r"D:\Python_Project\knowledge-order\src\content\chapters\quant\quant-data.ts"


def to_ts(md):
    return md.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")


# c2-l1 旧代码段（会命中文件的转义形式）
old1 = """```python
import numpy as np

def adjust(close, events):
    # events: [(除权日索引, 基准价/昨收 比值)]，ratio = P_除权/P_昨收
    n = len(close)
    back = np.ones(n)                       # 后复权：从左累乘
    f = 1.0
    j = 0
    evs = sorted(events)
    for t in range(n):
        while j < len(evs) and evs[j][0] == t:
            f /= evs[j][1]                  # 后复权因子放大后续价格
            j += 1
        back[t] = f
    return close * back

close = np.array([10, 10, 10, 7.5, 7.5, 7.5], dtype=float)   # 第3天 10送3 除权
adj = adjust(close, [(3, 7.5/10)])          # 基准价 7.5? 精确=(10-0)/1.3=7.6923
print("原始:", close)
print("后复权:", np.round(adj, 3))
print("除权日前后收益率: 原始", (close[3]/close[2]-1).__round__(3),
      " 复权后", round(adj[3]/adj[2]-1, 4))
```

预期输出：除权日原始收益 −25%（假暴跌），复权后 ≈ 0%——**复权把价值断层还原为真实收益**（若含派息 0.5，用 $(10-0.5)/1.3 = 7.3077$ 作基准价，收益同样归零且现金股息进入因子）。**常见错误**：把除权基准价当"跌停价"；前复权价缓存不重算（历史漂移 bug）；回测用前复权（每次更新历史全变，复现性差）。"""

new1 = """```python
import numpy as np

# 某股 10 送 3（无派息）：昨收 10 元，除权基准价 = 10/1.3 = 7.6923
base = 10 / 1.3
close = np.array([10.0, 10.1, 9.95, 7.65, 7.72, 7.80])   # 第3天除权, 除权后正常波动
back = close.copy()
back[3:] /= base / 10.0                                   # 后复权: 除权日后价格放大 1.3 倍

print("原始 :", close)
print("后复权:", np.round(back, 3))
r_raw = close[3] / close[2] - 1
r_adj = back[3] / back[2] - 1
print(f"除权日收益: 原始 {r_raw:.2%}（假暴跌）, 复权后 {r_adj:.2%}（真实）")
print(f"价值守恒校验: 1.3 * {base:.4f} = {1.3 * base:.4f}")
```

预期输出（实测）：除权日原始收益 −23.1%（10 送 3 的假暴跌），复权后 −0.05%（还原为真实的小幅波动）；价值守恒 1.3 × 7.6923 = 10.0000 精确成立。**常见错误**：把除权基准价当"跌停价"；前复权价缓存不重算（历史漂移 bug，见 c2-l3）；回测用前复权（每次更新历史全变，复现性差）。"""

old2 = """```python
import numpy as np

raw = np.array([10.0, 10.2, 10.1, 10.3, 10.25, 10.5])    # 原始收盘价
events = [(3, 0.95)]                                      # 第3天后复权因子事件(如分红)

def back_adjust(raw, events):
    out = raw.copy()
    for idx, f in events:
        out[idx:] *= 1.0 / f
    return out

adj = back_adjust(raw, events)
print("原始 :", raw)
print("后复权:", np.round(adj, 3))
print("收益率对比(第3天): 原始", f"{raw[3]/raw[2]-1:.2%}", " 复权", f"{adj[3]/adj[2]-1:.2%}")
# 事故复现：缓存旧体系 + 追加新体系
stale = np.concatenate([raw[:3], back_adjust(raw, events)[3:]])
print("拼接事故序列:", np.round(stale, 3), "(第2->3天收益", f"{stale[3]/stale[2]-1:.2%}", ")")
```

预期输出：正确后复权使第 3 天收益 ≈ 8.0%（真实），而事故拼接序列把收益抬到约 13%——**一条看不见的 5% 收益虚增**正是缓存事故的指纹。**常见错误**：用拼接序列"看起来连续"就放心（事故恰好消除断层更显隐蔽）；事件表不存公告日（PIT 违规，见 c3-l2）；重算范围只到"当前持仓"（全历史都要重算）。"""

new2 = """```python
import numpy as np

# 事故构造：t=3 发生分红除权（前复权因子 0.95）
hist_old = np.array([10.0, 10.2, 10.1])          # 缓存中"除权前"的前复权历史
hist_new = hist_old * 0.95                        # 正确：新除权后全量重算的历史
today = 10.3                                       # 今日新数据（最新价=真实价）

correct = np.concatenate([hist_new, [today]])
stale = np.concatenate([hist_old, [today]])       # 事故：缓存未重算直接拼新数据

print("正确序列 :", np.round(correct, 3), " 第2->3天收益", f"{correct[3]/correct[2]-1:.2%}")
print("事故序列 :", np.round(stale, 3),   " 第2->3天收益", f"{stale[3]/stale[2]-1:.2%}")
print("被吞掉的收益:", f"{(stale[3]/stale[2]-1) - (correct[3]/correct[2]-1):.2%}")
```

预期输出（实测）：正确序列第 2→3 天收益 +7.35%，事故序列只有 +1.98%——**整整 5.37 个百分点的真实收益被静默吞掉**（恰等于被忽略的分红因子 0.95 的补偿量）。曲线看起来完全连续、没有任何跳变——这正是缓存事故的可怕之处：它不制造断层，它制造**看不见的偏差**。**常见错误**：以"序列连续无跳变"判断数据健康；事件表不存公告日（PIT 违规，见 c3-l2）；重算范围只到"当前持仓"（全历史都要重算）。"""

s = io.open(F, encoding="utf-8").read()
for name, old, new in [("fix1", old1, new1), ("fix2", old2, new2)]:
    n = s.count(to_ts(old))
    print(("OK  " if n == 1 else "MISS(%d) " % n), name)
    if n:
        s = s.replace(to_ts(old), to_ts(new))

# 数值校准：c3-l1 波动、c3-l3 幸存者
cal = [
    ("0.165 vs 0.208", None),  # 占位检查
]
old_w = "预期输出：前值填充把美股日波动从 0.208 压到 0.165"
new_w = "预期输出（实测）：前值填充把美股日波动从 0.208 压到 0.173"
print("c3-l1 vol:", s.count(old_w)); s = s.replace(old_w, new_w)
old_s = "预期输出（seed=42 实测）：含退市组合年化约 2–3%、幸存者组合约 4–5%——**每年 1–2 个百分点的\"幽灵收益\"**，20 年复利差 30%+；且最差年份被明显美化。"
new_s = "预期输出（seed=42 实测）：含退市组合年化约 4.6%（最差年 +0.9%）、幸存者组合约 6.1%（最差年 +3.0%），活跃股票仅 328/500——**每年约 1.5 个百分点的\"幽灵收益\"**，20 年复利差距超过 30%；且最差年份被明显美化。"
print("c3-l3 surv:", s.count(old_s)); s = s.replace(old_s, new_s)

io.open(F, "w", encoding="utf-8", newline=chr(10)).write(s)
