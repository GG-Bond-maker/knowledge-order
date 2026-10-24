# viz-2 常用基础图表（实跑验证：直方图分桶、五数概括与 ECDF 用 numpy 手算后交给 Matplotlib）
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

rng = np.random.default_rng(7)
prices = rng.normal(50, 12, 200)                  # 模拟 200 笔订单金额

counts, edges = np.histogram(prices, bins=8)      # 直方图 = 切桶计数
print("直方图 bins=8：")
for c, lo, hi in zip(counts, edges[:-1], edges[1:]):
    print(f"  [{lo:5.1f}, {hi:5.1f}) {c:>3} {'#' * c}")

q1, med, q3 = np.percentile(prices, [25, 50, 75])
iqr = q3 - q1
outliers = prices[(prices < q1 - 1.5 * iqr) | (prices > q3 + 1.5 * iqr)]
print(f"\n五数概括：min={prices.min():.1f}，Q1={q1:.1f}，中位数={med:.1f}，Q3={q3:.1f}，max={prices.max():.1f}")
print(f"IQR={iqr:.1f}；箱线图须外点（<Q1-1.5IQR 或 >Q3+1.5IQR）：{np.round(outliers, 1).tolist() or '无'}")

xs = np.sort(prices); ys = np.arange(1, len(xs) + 1) / len(xs)     # ECDF：比直方图更稳的分布图
for q in (0.25, 0.5, 0.75):
    print(f"ECDF 读数：约 {int(q * 100)}% 的订单金额 <= {xs[np.searchsorted(ys, q)]:.1f} 元")

fig, ax = plt.subplots(2, 2, figsize=(8, 6))      # 一图四形态：同一数据的不同表达
ax[0, 0].plot(np.sort(prices)); ax[0, 1].bar(["A", "B"], [prices.mean(), prices.std()])
ax[1, 0].hist(prices, bins=8); ax[1, 1].boxplot(prices)
print("\n2x2 子图已构建：fig.axes 数 =", len(fig.axes), "（均值=%.1f，标准差=%.1f）" % (prices.mean(), prices.std()))
