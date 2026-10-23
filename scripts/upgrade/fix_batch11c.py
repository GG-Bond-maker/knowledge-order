# -*- coding: utf-8 -*-
"""批次11 修正 v3：锚点手术——按『## 代码实践』到『## 常见误区』段落边界替换。"""
import io

F = r"D:\Python_Project\knowledge-order\src\content\chapters\quant\quant-data.ts"


def to_ts(md):
    return md.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")


NEW_CODE = {}

NEW_CODE["quant-data-c2-l1"] = """```python
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

NEW_CODE["quant-data-c2-l3"] = """```python
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
for lid, new_code in NEW_CODE.items():
    i = s.index("id: '%s'" % lid)
    a = s.index("## 代码实践", i) + len("## 代码实践")
    b = s.index("## 常见误区", a)
    s = s[:a] + "\n\n" + to_ts(new_code) + "\n\n" + s[b:]
    print("surgery done:", lid)

io.open(F, "w", encoding="utf-8", newline=chr(10)).write(s)
