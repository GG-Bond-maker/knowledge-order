# -*- coding: utf-8 -*-
"""批次6 数值修正（第二版：按文件实际文本双反斜杠匹配）。"""
import io

B2 = chr(92) * 2  # 文件内字面双反斜杠

fixes = [
    (r"D:\Python_Project\knowledge-order\src\content\chapters\llm-a2.ts",
     "- 损失：$-" + B2 + "ln 0.628 = 0.465$",
     "- 损失：$-" + B2 + "ln 0.628 = 0.464$"),
    (r"D:\Python_Project\knowledge-order\src\content\chapters\llm-a2.ts",
     "损失 $-" + B2 + "ln 0.140 = 1.97$——错得自信，惩罚翻了 4 倍。",
     "损失 $-" + B2 + "ln 0.140 = 1.96$——错得自信，惩罚翻了 4 倍多。"),
    (r"D:\Python_Project\knowledge-order\src\content\chapters\llm-a2-extra.ts",
     "预期输出（理论最优 x=4，此处 k=2、发散阈值 $" + B2 + "eta=1$）：eta=0.05 → 缓慢逼近（约 3.1）；eta=0.95 → 震荡但收敛到 4.0；eta=1.05 → 震荡发散（x 冲向 1e20 级/inf）。",
     "预期输出（实测，最优 x=4，k=2、发散阈值 $" + B2 + "eta = 1$）：eta=0.05 → 25 步后 x=3.71（缓慢单调逼近）；eta=0.95 → 25 步后 4.29、100 步后 4.0000（震荡收敛）；eta=1.05 → 25 步后 47.3、100 步后 -5.5e+04（每步误差放大 1.1 倍，指数发散）。"),
    (r"D:\Python_Project\knowledge-order\src\content\chapters\llm-a2-extra.ts",
     "预期输出：SGD 的 $" + B2 + "eta$ 被陡维（k=2000，阈值 $2/2000=0.001$）压到 0.0009 苟活，300 步后仍在 $[0.05, 6.5]$ 附近（平维极慢）；Adam 用 50 倍的学习率反而两个维度同时逼近 0（约 $[" + B2 + "pm 0.01, 0.01]$ 量级）",
     "预期输出（实测）：SGD 的 $" + B2 + "eta$ 被陡维（k=2000，阈值 $2/2000=0.001$）压到 0.0009 苟活，300 步后陡维归零但平维仍卡在 5.83；Adam 用 50 多倍的学习率，两个维度同时收敛到约 0.90——狭谷两维齐头并进"),
]

for f, old, new in fixes:
    s = io.open(f, encoding="utf-8").read()
    n = s.count(old)
    print(("OK  " if n == 1 else "MISS(%d)" % n), old[:26])
    if n:
        s = s.replace(old, new)
        io.open(f, "w", encoding="utf-8", newline=chr(10)).write(s)
