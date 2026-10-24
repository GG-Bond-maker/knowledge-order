# -*- coding: utf-8 -*-
"""批次22 修正：c7-l4 代码实践段的 SiLU 导数公式（σ + xσ(1−σ)），实测一致。"""
import io

F = r"D:\Python_Project\knowledge-order\src\content\chapters\llm-a1-extra.ts"

B = chr(92)
BT = chr(96)


def to_ts(md):
    return md.replace(B, B + B).replace(BT, B + BT).replace("${", B + "${")


NEW_CODE = """```python
import numpy as np
rng = np.random.default_rng(0)
d, dff = 8, 16
x = rng.normal(0, 1, d)
W1 = rng.normal(0, 0.3, (d, dff)); W3 = rng.normal(0, 0.3, (d, dff))
W2 = rng.normal(0, 0.3, (dff, d))
ref = rng.normal(0, 1, d)                     # 损失方向的参考向量

sig = lambda v: 1 / (1 + np.exp(-v))
g = lambda v: v * sig(v)                      # SiLU
gs = lambda v: sig(v) + v * sig(v) * (1 - sig(v))   # SiLU 导数 = sigma + x*sigma*(1-sigma)

def fwd(x):
    return (g(x @ W1) * (x @ W3)) @ W2

# 数值梯度检查（中心差分，对 x[0]）
loss = lambda v: np.sum(fwd(v) * ref)
h = 1e-6
num = (loss(x + h * np.eye(d)[0]) - loss(x - h * np.eye(d)[0])) / (2 * h)

# 解析梯度（反向四步）
z1 = x @ W1; z3 = x @ W3; hid = g(z1) * z3
d_hid = ref @ W2.T                            # 步1 转置回传
d_z1 = d_hid * z3 * gs(z1)                    # 步2 门路三因子
d_z3 = d_hid * g(z1)                          # 步3 值路
d_x = d_z1 @ W1.T + d_z3 @ W3.T               # 步4 两条路汇合
print(f"数值 {num:.6f} vs 解析 {d_x[0]:.6f} -> "
      f"{'一致' if abs(num - d_x[0]) < 1e-4 else '检查实现'}")
```

预期输出（实测）：数值 −0.255135 vs 解析 −0.255135——完全一致。**SiLU 导数是本节最容易写错的一步**：$\mathrm{SiLU}'(x) = \sigma(x) + x\,\sigma(x)(1-\sigma(x))$，把 $\sigma(1-\sigma)$ 误写成别的形式是高频事故，数值梯度检查正是抓这种 bug 的唯一防线。**常见错误**：门控梯度漏乘对偶路（δ_z1 忘乘 z3）；数值检查用前向差分（精度不足，用中心差分）；导数公式与激活版本不匹配（tanh-GELU 与精确 GELU 的导数不同）。"""

s = io.open(F, encoding="utf-8").read()
i = s.index("id: 'llm-a1-c7-l4'")
a = s.index("## 代码实践", i) + len("## 代码实践")
b = s.index("## 常见误区", a)
s = s[:a] + "\n\n" + to_ts(NEW_CODE) + "\n\n" + s[b:]
io.open(F, "w", encoding="utf-8", newline=chr(10)).write(s)
print("c7-l4 code section replaced")
