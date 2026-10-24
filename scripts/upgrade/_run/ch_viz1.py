# viz-1 可视化原则与 Matplotlib 基础（实跑验证：Agg 后端生成真实图形对象）
import matplotlib
matplotlib.use("Agg")                 # 无界面后端：只构建图形对象，不弹窗口
import matplotlib.pyplot as plt
import io

months, sales = ["1月", "2月", "3月", "4月"], [120, 135, 118, 150]

fig, ax = plt.subplots(figsize=(6, 3))            # 面向对象风格：Figure 持有 Axes
ax.plot(["Jan", "Feb", "Mar", "Apr"], sales, marker="o", label="sales")
ax.set_title("Monthly Sales", fontsize=12)        # 本地无中文字体时图内文本用英文，避免缺字形
ax.set_xlabel("Month"); ax.set_ylabel("Sales")
ax.legend()
print("Figure 尺寸 =", fig.get_size_inches().tolist(), "；包含 Axes 数 =", len(fig.axes))
print("折线数据 =", ax.lines[0].get_ydata().tolist(), "（Artist 层保存了真实数据）")

plt.figure(figsize=(4, 2))                        # pyplot 状态机风格：当前图/当前坐标区
plt.bar(months, sales)
print("pyplot 当前图编号 = ", plt.gcf().number, "；两种风格操作的是同一套 Figure/Axes/Artist")

buf = io.BytesIO()
fig.savefig(buf, format="png", dpi=50)            # 保存不依赖 show()
print("savefig 生成 PNG 字节数 =", len(buf.getvalue()), "> 0，说明图形已真实构建")

choice = {("随时间变化", 1): "折线图", ("类别比较", 1): "柱/条形图",
          ("分布", 1): "直方图/箱线图", ("相关性", 2): "散点图", ("构成占比", 1): "堆叠柱/环形图"}
print("\n图表选择矩阵（关系 -> 图）：" + "；".join(f"{k[0]}->{v}" for k, v in choice.items()))
print("原则：一张图只回答一个问题；先写结论，再决定图的类型")
