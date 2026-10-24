# excel-3 文本、日期与统计函数（纯 Python 模拟 LEFT/MID/FIND/SUBSTITUTE、日期序列号、ROUND/RANK/TRIMMEAN）
from datetime import date

EPOCH = date(1899, 12, 30)
serial = lambda d: (d - EPOCH).days            # Excel 日期的本质：天数差

raw = "  订单A-20240301-张三  "
cell = raw.strip()                              # 模拟 TRIM
code, d, name = cell.split("-")                 # 模拟分列 / LEFT+MID+FIND 组合
print("原始：", repr(raw), "-> TRIM 后：", repr(cell))
print("FIND(\"-\") =", cell.find("-") + 1, "；MID 取日期段 =", d, "；TEXT 转格式 =", "%s-%s-%s" % (d[:4], d[4:6], d[6:]))
print("SUBSTITUTE 去掉横线：", cell.replace("-", ""))

d0, d1 = date(2024, 1, 31), date(2024, 3, 15)
print("\n日期序列号：2024-01-31 =", serial(d0), "；两日期直接相减 =", (d1 - d0).days, "天（DATEDIF 的本质）")

print("\nROUND 家族对照（对 -2.5 与 3.14159）：")
import math
cases = [
    ("ROUND(x, 0) 四舍五入", lambda x: math.floor(x + 0.5) if x >= 0 else math.ceil(x - 0.5)),
    ("INT(x) 向下取整",      math.floor),
    ("TRUNC(x) 截尾",        math.trunc),
]
for label, fn in cases:
    print(f"  {label:24s} -2.5 -> {fn(-2.5):>4}；3.14159 -> {fn(3.14159)}")

print("\n浮点误差：0.1+0.2 =", 0.1 + 0.2, "；ROUND(0.1+0.2, 1) =", round(0.1 + 0.2, 1))

scores = [8.9, 9.2, 8.8, 9.6, 2.0, 8.5, 9.0]    # 一个异常低分
n_cut = 1                                       # TRIMMEAN(区域, 2/7)：掐头去尾各 1 个
trimmed = sorted(scores)[n_cut:-n_cut]
print("\nTRIMMEAN 掐头去尾：", sorted(scores), "->", sorted(scores)[n_cut:-n_cut],
      "均值 =", round(sum(trimmed) / len(trimmed), 3))
rank = sorted(scores, reverse=True)
print("RANK(9.2) =", rank.index(9.2) + 1, "；LARGE(区域, 2) = 第 2 大 =", sorted(scores)[-2])
