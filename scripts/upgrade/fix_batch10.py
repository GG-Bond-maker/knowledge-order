# -*- coding: utf-8 -*-
"""批次10 修正：VaR 三法对照的预期输出按实测校准。"""
import io

F = r"D:\Python_Project\knowledge-order\src\content\chapters\quant\quant-portfolio.ts"

old = ("预期输出（形态）：参数法 165/233 万；历史模拟 95 分位约 160–170 万（接近），99 分位升至 300–360 万（厚尾显形）；"
       "**尾部条件期望再高出 VaR99 约 1.2–1.4 倍**——水下很深，VaR 沉默。")
new = ("预期输出（seed=0 实测）：参数法 165/233 万；历史模拟（t4 归一）95 分位约 152 万——**反而低于正态**"
       "（t 分布在中段 95% 处比正态\"瘦\"），99 分位约 253 万（厚尾在更深处显形，超出参数法 9%）；"
       "**尾部条件期望 CVaR99 ≈ 360 万，是 VaR99 的约 1.4 倍**——水下很深，VaR 对此沉默。")

s = io.open(F, encoding="utf-8").read()
n = s.count(old)
print(("OK" if n == 1 else "MISS(%d)" % n))
if n:
    s = s.replace(old, new)
    io.open(F, "w", encoding="utf-8", newline=chr(10)).write(s)
