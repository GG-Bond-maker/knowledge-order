# -*- coding: utf-8 -*-
"""批次14 修正 v2：MAD z 值与容量曲线按实测重写（锚点：c1-l3 代码实践段、c3-l3 代码实践段）。"""
import io

F = r"D:\Python_Project\knowledge-order\src\content\chapters\quant\quant-project.ts"

B = chr(92)
BT = chr(96)


def to_ts(md):
    return md.replace(B, B + B).replace(BT, B + BT).replace("${", B + "${")


def replace_section(lid, sec_start, sec_end, new_body):
    s = io.open(F, encoding="utf-8").read()
    i = s.index("id: '%s'" % lid)
    a = s.index(sec_start, i) + len(sec_start)
    b = s.index(sec_end, a)
    s = s[:a] + "\n\n" + to_ts(new_body) + "\n\n" + s[b:]
    io.open(F, "w", encoding="utf-8", newline=chr(10)).write(s)
    print("done:", lid)


c1_code = (
    "```python\n"
    "import numpy as np\n"
    "x = np.array([1, 2, 3, 4, 5, 6, 7, 100.0])\n"
    "med = np.median(x)\n"
    "mad = 1.4826 * np.median(np.abs(x - med))\n"
    "lo, hi = med - 3 * mad, med + 3 * mad\n"
    "w = np.clip(x, lo, hi)\n"
    "z = (w - w.mean()) / w.std()\n"
    'print(f"MAD={mad:.2f}, 界[{lo:.1f},{hi:.1f}]")\n'
    'print("截断后 z =", np.round(z, 2))\n'
    "```\n\n"
    "预期输出（实测）：MAD=2.97，界 [−4.4, 13.4]；z ≈ [−1.15, −0.88, −0.60, −0.32, −0.05, 0.23, 0.50, **2.27**]——一只妖股被驯服为 +2.27σ，其余七只保持分辨力。对照：若不去极值直接 z-score，100 的 z ≈ +2.5 且**其余全部被压成 −0.4σ 左右**（均值被 100 拉高），整条截面信息尽失。**常见错误**：用均值±3σ 去极值（死循环）；截面标准化泄漏为全时间序列标准化。"
)

c3_code = (
    "```python\n"
    "import numpy as np\n"
    "Q = np.array([1, 2, 4, 8, 16, 32])               # 规模（亿）\n"
    "gross = 0.16 * (1 - np.log2(Q) / 5)               # 小容量机会随规模摊薄\n"
    "impact = 0.005 * np.sqrt(Q / 8)                   # 冲击按 sqrt(Q) 上升\n"
    "net = gross - impact\n"
    "for q, g, i, n in zip(Q, gross, impact, net):\n"
    '    print(f"规模 {q:2d} 亿: 毛 {g:.1%}, 冲击 {i:.2%}, 净 {n:.1%}")\n'
    'print("容量上限（净>4%）:", Q[net > 0.04].max(), "亿")\n'
    "```\n\n"
    "预期输出（实测）：净超额从 1 亿的 15.8% 单调下滑（毛收益随规模摊薄 + 冲击按 √Q 上升），8 亿处 5.9%、16 亿处 2.5% 跌破 4% 线——**容量上限约 8 亿**。两类效应缺一不可：只有摊薄没有冲击，曲线缓降无拐点；只有冲击没有摊薄，容量虚高。**容量是算出来的，不是感觉出来的**。"
)

replace_section("quant-project-c1-l3", "## 完整案例", "## 常见误区", c1_code)
replace_section("quant-project-c3-l3", "## 原理详解", "## 完整案例", c3_code)
