# viz-3 统计图形与多变量（实跑验证：相关矩阵热力图 + 拟合线 + 分面统计）
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

rng = np.random.default_rng(3)
n = 60
temp = rng.uniform(15, 35, n)                     # 气温
sales = 50 + 4.5 * temp + rng.normal(0, 18, n)    # 销量 = 截距 + 斜率×气温 + 噪声
orders = rng.poisson(np.clip(temp - 10, 5, None)) # 订单量（离散）

df_ = np.column_stack([temp, sales, orders])
corr = np.corrcoef(df_, rowvar=False)             # 相关矩阵：热力图的数据来源
labels = ["气温", "销量", "订单"]
print("相关矩阵（行=变量，列=变量）：")
print("      " + "  ".join(f"{l:>4}" for l in labels))
for l, row in zip(labels, corr):
    print(f"{l:>4}  " + "  ".join(f"{v:+.2f}" for v in row))

slope, intercept = np.polyfit(temp, sales, 1)     # 最小二乘拟合：回归图的拟合线
resid = sales - (slope * temp + intercept)
print(f"\n拟合线：销量 = {intercept:.1f} + {slope:.2f}×气温；残差标准差 = {resid.std():.1f}")

fig, ax = plt.subplots(figsize=(4, 4))
im = ax.imshow(corr, vmin=-1, vmax=1, cmap="coolwarm")   # 热力图本质：矩阵 + 颜色映射
for i in range(3):
    for j in range(3):
        ax.text(j, i, f"{corr[i, j]:+.2f}", ha="center", va="center")
fig.colorbar(im)
print("热力图已构建（imshow + 单元格文本标注），色标范围固定为 [-1, 1] 防止颜色夸大差异")

for city in ["北京", "上海"]:                      # 分面（facet）：同一张图按组重复
    m = rng.random(n) < 0.5
    print(f"分面统计 {city}：n={m.sum()}，销量均值={sales[m].mean():.1f}")
print("原则：颜色编码第三变量时只用一种顺序色；大小编码面积要与数值成比例；变量再多用分面而不是堆图例")
