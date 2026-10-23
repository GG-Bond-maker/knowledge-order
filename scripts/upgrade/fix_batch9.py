# -*- coding: utf-8 -*-
"""批次9 修正：OU 估计预期输出（按 TS 文件内双反斜杠文本匹配）。"""
import io

F = r"D:\Python_Project\knowledge-order\src\content\chapters\quant\quant-strategy.ts"
B2 = chr(92) * 2

old = ("预期输出：" + "$" + B2 + "hat" + B2 + "phi " + B2 + "approx 0.86$" + "、" +
       "$" + B2 + "hat" + B2 + "theta " + B2 + "approx 0.15$" + "、" +
       "半衰期 ≈ 4.6 天（2000 样本下估计误差 ±0.3 天量级）。")
new = ("预期输出（seed=9 实测）：" + "$" + B2 + "hat" + B2 + "phi " + B2 + "approx 0.839$" + "、" +
       "$" + B2 + "hat" + B2 + "theta " + B2 + "approx 0.176$" + "、" +
       "半衰期 ≈ 3.9 天（真值 4.6 天——有限样本下 θ 估计偏高是 OU 的小样本偏差，实务用更长历史或滚动窗口缓解）。")

s = io.open(F, encoding="utf-8").read()
n = s.count(old)
print(("OK" if n == 1 else "MISS(%d)" % n))
if n:
    s = s.replace(old, new)
    io.open(F, "w", encoding="utf-8", newline=chr(10)).write(s)
