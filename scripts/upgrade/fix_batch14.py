# -*- coding: utf-8 -*-
"""批次14 修正：MAD z 值与容量曲线按实测重写。"""
import io

F = r"D:\Python_Project\knowledge-order\src\content\chapters\quant\quant-project.ts"


def to_ts(md):
    return md.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${})


def replace_section(lid, sec_start, sec_end, new_body):
    s = io.open(F, encoding="utf-8").read()
    i = s.index("id: '%s'" % lid)
    a = s.index(sec_start, i) + len(sec_start)
    b = s.index(sec_end, a)
    s = s[:a] + "\n\n" + to_ts(new_body) + "\n\n" + s[b:]
    io.open(F, "w", encoding="utf-8", newline=chr(10)).write(s)
    print("done:", lid)


replace_section("quant-project-c1-l3", "## 代码实践", "## 常见误区", """```python
import numpy as np
x = np.array([1, 2, 3, 4, 5, 6, 7, 100.0])
med = np.median(x)
mad = 1.4826 * np.median(np.abs(x - med))
lo, hi = med - 3 * mad, med + 3 * mad
w = np.clip(x, lo, hi)
z = (w - w.mean()) / w.std()
print(f"MAD={mad:.2f}, 界[{lo:.1f},{hi:.1f}]")
print("截断后 z =", np.round(z, 2))
```

预期输出（实测）：MAD=2.97，界 [−4.4, 13.4]；z ≈ [−1.15, −0.88, −0.60, −0.32, −0.05, 0.23, 0.50, **2.27**]——一只妖股被驯服为 +2.27σ，其余七只保持原有分辨力。对照：若不去极值直接 z-score，100 的 z ≈ +2.5 且**其余全部被压成 −0.4σ 左右的负值**（均值被 100 拉高），整条截面信息尽失。**常见错误**：用均值±3σ 去极值（死循环）；截面标准化泄漏为全时间序列标准化。""")

replace_section("quant-project-c3-l3", "## 代码实践", "## 常见误区", """```python
import numpy as np
Q = np.array([1, 2, 4, 8, 16, 32])               # 规模（亿）
gross = 0.16 * (1 - np.log2(Q) / 5)               # 小容量机会随规模摊薄
impact = 0.005 * np.sqrt(Q / 8)                   # 冲击按 sqrt(Q) 上升
net = gross - impact
for q, g, i, n in zip(Q, gross, impact, net):
    print(f"规模 {q:2d} 亿: 毛 {g:.1%}, 冲击 {i:.2%}, 净 {n:.1%}")
print("容量上限（净>4%）:", Q[net > 0.04].max(), "亿")
```

预期输出（实测）：净超额从 1 亿的 15.8% 单调下滑（毛收益随规模摊薄 + 冲击按 √Q 上升），8 亿处 5.9%，16 亿处 2.5% 跌破 4% 线——**容量上限约 8 亿**。两类效应缺一不可：只有摊薄没有冲击，曲线缓降无拐点；只有冲击没有摊薄，容量虚高。**容量是算出来的，不是感觉出来的**。""")
