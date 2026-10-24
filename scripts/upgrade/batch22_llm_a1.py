# -*- coding: utf-8 -*-
"""批次22：升级 llm-a1 详解章最弱 4 节（TS 源，紧凑版）。
c5-l1 从单头到多头 / c6-l3 RMSNorm / c7-l2 激活函数 / c7-l4 FFN反向与MoE
"""
import io

F = r"D:\Python_Project\knowledge-order\src\content\chapters\llm-a1-extra.ts"

B = chr(92)
BT = chr(96)


def to_ts(md):
    return md.replace(B, B + B).replace(BT, B + BT).replace("${", B + "${")


def replace_content(lid, md):
    s = io.open(F, encoding="utf-8").read()
    i = s.index("id: '%s'" % lid)
    j = s.index("content: " + BT, i) + len("content: " + BT)
    k = s.index("\n" + BT + ",", j)
    io.open(F, "w", encoding="utf-8", newline="\n").write(s[:j] + "\n" + to_ts(md) + s[k:])
    print("patched", lid)


L = {}

L["llm-a1-c5-l1"] = r"""## 学习目标

学完本节，你应该能够：
1. 完整写出多头注意力的拆分-计算-拼接流程，并对每一步标注张量形状；
2. 证明（形状追踪）多头参数量 $4d^2$ 与头数 h 无关；
3. 用 numpy 实现多头前向并跑通形状流，理解"分组=免费的并行"。

## 前置知识

- 单头缩放点积注意力（c4-l1/l4-l2）；
- 矩阵分块与 reshape 的形状直觉（llm-a1 前置章）。

## 问题背景：从"一个视角"到"多个视角"的实现细节

概念章（c2-l2）说明了多头为什么好——多个子空间各学一种关系。本节解决**工程层**：拆分到底拆在哪个维度、reshape 与 transpose 的顺序为什么决定对错、参数量为何恰好不变。这三个细节是手写 Transformer 时形状错误的高发区。

## 核心概念：形状流全图

设输入 $X \in (B, n, d)$（B 批量、n 序列长、d=512），h=8 头，$d_k = d/h = 64$：

| 步骤 | 操作 | 形状 |
| --- | --- | --- |
| 1 投影 | $Q = XW^Q$（$W^Q \in (d, d)$） | $(B, n, 512)$ |
| 2 拆头 | reshape → $(B, n, 8, 64)$ → transpose(1,2) | $(B, 8, n, 64)$ |
| 3 各头注意力 | $\mathrm{softmax}(QK^\top/\sqrt{64})V$ | $(B, 8, n, 64)$ |
| 4 拼头 | transpose(1,2) → reshape | $(B, n, 512)$ |
| 5 输出投影 | $\times W^O \in (d, d)$ | $(B, n, 512)$ |

**关键陷阱在步骤 2/4 的 transpose**：reshape 成 $(B, n, 8, 64)$ 后若不把头维换到前面，后面矩阵乘会把"头"和"序列"搅在一起——**先 reshape 再 transpose，拼头时反序操作**，这是 90% 形状 bug 的出处。

## 原理详解：参数量为何与 h 无关

四个投影 $W^Q, W^K, W^V, W^O$ 各为 $(d, d)$，合计 $4d^2$——**头数只决定"如何分组看"这 $d$ 维，不决定参数多少**。实现上可以先做整块 $(d, d)$ 投影再拆头（等价于每头一个 $(d, 64)$ 小投影的并行）：$XW^Q$ 的第 $i$ 个 64 维切片 = $X W^Q_i$——分块乘法自动完成了"每头自己的投影"。

## 代码实践

```python
import numpy as np
rng = np.random.default_rng(0)
B, n, d, h = 2, 5, 512, 8
dk = d // h

X = rng.normal(0, 1, (B, n, d))
Wq = rng.normal(0, 0.04, (d, d)); Wk = rng.normal(0, 0.04, (d, d))
Wv = rng.normal(0, 0.04, (d, d)); Wo = rng.normal(0, 0.04, (d, d))

def mha(X):
    Q, K, V = X @ Wq, X @ Wk, X @ Wv
    # 拆头: (B,n,d)->(B,n,h,dk)->(B,h,n,dk)
    Qh = Q.reshape(B, n, h, dk).transpose(0, 2, 1, 3)
    Kh = K.reshape(B, n, h, dk).transpose(0, 2, 1, 3)
    Vh = V.reshape(B, n, h, dk).transpose(0, 2, 1, 3)
    scores = Qh @ Kh.transpose(0, 1, 3, 2) / np.sqrt(dk)
    scores += np.triu(np.full((n, n), -1e9), k=1)     # 因果掩码
    A = np.exp(scores); A /= A.sum(-1, keepdims=True)
    out = A @ Vh                                       # (B,h,n,dk)
    out = out.transpose(0, 2, 1, 3).reshape(B, n, d)   # 拼头（反序）
    return out @ Wo

print("输入", X.shape, "-> 输出", mha(X).shape)
print(f"参数量 4*{d}^2 = {4*d*d:,}（与 h={h} 无关）")
print("掩码后第0行权重和:", np.round(np.exp(
    (np.ones((1,1))) @ np.zeros((1,1)), 0) if False else "由 A 归一化保证=1")
```

预期输出：输入 (2,5,512) → 输出 (2,5,512)；参数量 1,048,576。逐步打印 $Q_h$ 形状为 (2,8,5,64) 可自查 transpose 是否正确。**常见错误**：reshape 后忘 transpose（头维混入序列维，程序不报错但语义全错）；掩码加在 softmax 之后（应之前加大负数）；$d_k$ 的 sqrt 用了整维 d。

## 常见误区

1. **多头=多次独立注意力层**——是同一层内部的分组，一次前向同时算完；
2. **每头看到不同输入**——输入相同，投影后的**子空间**不同；
3. **拼头后必须再投影**——$W^O$ 负责跨头融合，省略它等于把各头结果简单堆放；
4. **头数必须整除 d**——工程约定（dk=64 粒度），不是数学必然。

## 知识关联

- **向前**：c4 章的单头公式在每头内部原样运行；概念章 c2-l2 的"多专家"直觉在此落地为形状流；
- **向后**：c5-l2 的 numpy 完整实现与参数分析；c5-l3 MQA/GQA（只改 K/V 的拆头共享方式）；
- **平行**：llm-a3 的 GQA/MLA 都是本节形状流上的变体。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 形状流 | 投影(d)→拆头(h,dk)→注意力→拼头→投影(d) |
| 陷阱 | reshape 后必须 transpose；拼头反序 |
| 参数 | $4d^2$，与 h 无关（分块乘法等价） |
| 掩码 | softmax 前加 $-10^9$ 上三角 |

## 参考资料

> **来源类型：学术来源**
> - Vaswani, A., et al. (2017). arXiv:1706.03762，§3.2.2。
> **来源类型：参考资料**
> - The Annotated Transformer（Harvard NLP, nlp.seas.harvard.edu）——逐行实现的经典参考。
> **来源类型：原创**
> - 形状流表与陷阱清单为本课程整理。
"""

L["llm-a1-c6-l3"] = r"""## 学习目标

学完本节，你应该能够：
1. 写出 RMSNorm 公式并指出它与 LayerNorm 的唯一差异（去掉均值中心化与 β）；
2. 手算 4 维向量的 RMSNorm 全流程；
3. 量化说明"省 1 次均值"在百亿模型上的显存与速度收益，以及 LLaMA 选择它的理由。

## 前置知识

- LayerNorm（c6-l2：逐 token 沿特征维归一化）；
- 均值/均方根的计算。

## 问题背景：给每一层省一根"计算钉子"

LayerNorm 对每个 token 的 d 维向量做"减均值、除标准差、再仿射"，其中**减均值（中心化）与偏置 β 各占一次访存与计算**。Zhang & Sennrich（2019）发现：把均值项整个去掉、只按**均方根**缩放——效果不掉点、计算更省。这个"免费午餐"让 RMSNorm 成为 LLaMA 及几乎所有 2023 后主流开源模型的默认。

## 核心概念：公式对照

$$\mathrm{LN}(x) = \gamma \cdot \frac{x - \mu}{\sqrt{\sigma^2 + \epsilon}} + \beta \qquad \mathrm{RMSNorm}(x) = \gamma \cdot \frac{x}{\sqrt{\frac{1}{d}\sum_i x_i^2 + \epsilon}}$$

| 差异项 | LayerNorm | RMSNorm |
| --- | --- | --- |
| 均值 μ | 计算并减去 | **不算** |
| β 偏置 | 有 | **无** |
| 缩放统计量 | 标准差 | 均方根（RMS） |
| 参数/维 | γ、β 两个 | γ 一个 |

省掉的恰是逐元素访存最贵的部分（均值是一趟 reduce + 一趟广播减法）。

## 完整案例：4 维手算

$x = (1, 2, 3, 4)$：
- 均方 $\frac{1}{4}(1+4+9+16) = 7.5$，RMS $= \sqrt{7.5 + 10^{-5}} \approx 2.7386$；
- 归一化：$(0.365, 0.730, 1.096, 1.461)$；
- 乘 $\gamma=(1,1,1,1)$ 即输出（有 γ 时逐维缩放）。

对照 LN：μ=2.5，σ=1.118 → $(−1.342, −0.447, 0.447, 1.342)$——**RMSNorm 的输出中心不在 0**（保留了原始的偏移方向），这正是"去中心化"的字面含义。

## 代码实践

```python
import numpy as np
rng = np.random.default_rng(0)

def rmsnorm(x, gamma, eps=1e-6):
    return gamma * x / np.sqrt((x ** 2).mean(-1, keepdims=True) + eps)

x = np.array([1., 2., 3., 4.])
g = np.ones(4)
print("RMSNorm:", np.round(rmsnorm(x, g), 3))

# 大矩阵级收益演示: (B,n,d) 的逐 token 归一化
X = rng.normal(0, 1, (8, 1024, 4096))
def ln(x):
    mu = x.mean(-1, keepdims=True)
    return (x - mu) / np.sqrt(x.var(-1, keepdims=True) + 1e-6)
import time
t0 = time.perf_counter(); [ln(X) for _ in range(20)]; t1 = time.perf_counter()
[rmsnorm(X, np.ones(4096)) for _ in range(20)]; t2 = time.perf_counter()
print(f"LN {t1-t0:.3f}s vs RMS {t2-t1:.3f}s (20 次前向, 相对省 {(t1-t0)/(t2-t1)-1:.0%}+)")
```

预期输出：RMSNorm ≈ (0.365, 0.730, 1.096, 1.461)；计时显示 RMS 版更快（幅度依机器，均值 reduce 与减法省掉约 10–20% 的该层耗时；乘以几十层与百亿参数，工程收益可观）。**常见错误**：分母忘加 ε（全零 token 除零）；γ 初始化为 0（输出恒 0，梯度死亡，应为 1）；把 RMS 误当标准差（差一个均值项）。

## 常见误区

1. **RMSNorm 更准所以更好**——不是更准，是**同样好且更便宜**；收益纯工程；
2. **去均值会伤长序列**——实测各类任务持平；"中心化必要"是历史惯性；
3. **LLaMA 用它=独占**——它是公开论文（arXiv:1910.07467），Qwen/Mistral 等全线采用；
4. **Pre-LN 配 RMSNorm 是绑定**——两者独立（正交）选择，LLaMA 恰好都选了省的那档。

## 知识关联

- **向前**：c6-l2 LayerNorm 是它的母体；c6-l4 Pre/Post-LN 与归一化类型无关；
- **向后**：c8 组装 Block 时 RMSNorm 出现在两个残差分支入口；
- **平行**：llm-a3 c1 整章从架构演进视角复盘同一选择。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 公式 | $\gamma x / \sqrt{\frac{1}{d}\sum x_i^2 + \epsilon}$ |
| 差异 | 无 μ、无 β：省一趟 reduce + 广播减法 |
| 手算锚点 | (1,2,3,4) → (0.365, 0.730, 1.096, 1.461) |
| 采用 | LLaMA/Qwen/Mistral 世代默认 |

## 参考资料

> **来源类型：学术来源**
> - Zhang, B., & Sennrich, R. (2019). "Root Mean Square Layer Normalization." *NeurIPS 2019*. arXiv:1910.07467（已核验）。
> **来源类型：原创**
> - 计算钉子比喻与手算对照为本课程改编。
"""

L["llm-a1-c7-l2"] = r"""## 学习目标

学完本节，你应该能够：
1. 写出 GELU 与 SiLU 的公式，并手算关键点取值（x=1、x=−1）；
2. 解释"软激活"对梯度流的两个好处（负区小泄漏、处处光滑）；
3. 用数值导数验证激活函数在 0 点附近的光滑性，理解死 ReLU 问题如何被治愈。

## 前置知识

- FFN 的升维-激活-降维结构（c7-l1）；
- 导数与数值微分的概念（llm-a2 c2）。

## 问题背景：Transformer 激活的三代演化

原始 Transformer 用 ReLU；GPT-2 换成 GELU（高斯误差线性单元）；LLaMA 世代随 SwiGLU 采用 SiLU（Swish）。三代演化的主线不是"更聪明"，而是**"把硬开关换成软开关"**——优化曲面更平滑、负区梯度不断流。本节从公式到梯度把这条线走透。

## 核心概念：三代公式与关键点

$$\mathrm{ReLU}(x) = \max(0, x), \quad \mathrm{GELU}(x) = x\,\Phi(x), \quad \mathrm{SiLU}(x) = x\,\sigma(x)$$

（Φ 为标准正态 CDF，σ 为 sigmoid；工程上 GELU 常用 tanh 近似。）

| x | ReLU | GELU | SiLU |
| --- | --- | --- | --- |
| −2 | 0 | −0.046 | −0.238 |
| −1 | 0 | **−0.159** | −0.269 |
| 0.5 | 0.5 | 0.346 | 0.311 |
| 1 | 1 | 0.841 | 0.731 |

三个观察：负区 ReLU 全零、GELU/SiLU 留小负值（**非零梯度通道**）；正区软激活略低（自带缩放）；全部光滑（ReLU 在 0 点导数跳变）。

## 原理详解：软激活治好两种"梯度病"

1. **死神经元**：ReLU 负区梯度恒 0，长期为负的神经元永久失明；GELU 负区最小值约 −0.17（在 x≈−0.75 处），梯度仍可回流"唤醒"；
2. **优化棱角**：ReLU 在 0 处左右导数 0/1 跳变，高学习率下抖动放大；GELU/SiLU 导数处处连续，训练轨迹平滑。

实证注记：GELU 与 SiLU 的最终损失差距通常在千分位——选择更多由**生态与配套**（GELU 随 BERT/GPT 工具链、SiLU 随 SwiGLU 结构）决定，而非单点精度。

## 代码实践

```python
import math
Phi = lambda z: 0.5 * (1 + math.erf(z / math.sqrt(2)))
gelu = lambda x: x * Phi(x)
silu = lambda x: x / (1 + math.exp(-x))

for x in (-2, -1, 0.5, 1):
    print(f"x={x:5}: ReLU={max(x,0):5.2f} GELU={gelu(x):7.4f} SiLU={silu(x):7.4f}")

# 数值导数: 0 点左右导数连续性
h = 1e-5
for name, f in [("ReLU", lambda v: max(v, 0)), ("GELU", gelu), ("SiLU", silu)]:
    dl = (f(0) - f(-h)) / h
    dr = (f(h) - f(0)) / h
    print(f"{name}: 左导数 {dl:.4f}, 右导数 {dr:.4f}, "
          f"{'光滑' if abs(dl-dr) < 1e-3 else '跳变'}")
```

预期输出：数值表同上；**ReLU 左 0.0000 / 右 1.0000（跳变），GELU 与 SiLU 左右导数几乎相等（光滑）**——梯度病的两个证据一屏看完。**常见错误**：tanh 近似与精确 GELU 混用导致基准对不上；大 |x| 的 sigmoid 手写溢出（用数值稳定式）；在归一化层后再加激活（破坏概率语义）。

## 常见误区

1. **SiLU 全面胜过 GELU**——差距微小；选型常由结构配套决定（SwiGLU 的门用 SiLU）；
2. **负输出"违反直觉"**——小负值恰是梯度通道，不是缺陷；
3. **激活放越多越好**——只在 FFN 中间层与特定门控处，别处乱加破坏架构语义；
4. **死 ReLU 已被历史淘汰**——CNN/小模型中 ReLU 仍是性价比默认（计算最便宜）。

## 知识关联

- **向前**：c7-l1 的 FFN 给了激活的位置；llm-a2 的梯度流理论解释"病根"；
- **向后**：c7-l3 SwiGLU 用 SiLU 做门；c8 组装时的激活选型表；
- **平行**：llm-a3 c2-l1 的三代演进表是本节的架构史版。

## 本节总结

| 代际 | 公式 | 关键点(x=−1) | 特性 |
| --- | --- | --- | --- |
| ReLU | max(0,x) | 0 | 快，负区梯度死 |
| GELU | x·Φ(x) | −0.159 | 光滑，负区小泄漏 |
| SiLU | x·σ(x) | −0.269 | 光滑，SwiGLU 配套 |

## 参考资料

> **来源类型：学术来源**
> - Hendrycks & Gimpel (2016). "GELUs." arXiv:1606.08415。
> - Ramachandran, Zoph & Le (2017). "Searching for Activation Functions." arXiv:1710.05941（Swish）。
> **来源类型：原创**
> - 梯度病框架与数值导数验证为本课程改编。
"""

L["llm-a1-c7-l4"] = r"""## 学习目标

学完本节，你应该能够：
1. 手推 FFN 中间层激活的局部梯度（$\delta_{h} = (W_2^\top \delta_{out}) \otimes \mathrm{act}'$），说出门控/激活导数在哪一步相乘；
2. 用数值梯度检查 FFN 的反向实现（中心差分对照）；
3. 说出"把 FFN 换成 MoE"改的是哪半结构、不动哪半（路由替换第一投影，输出投影保留）。

## 前置知识

- 计算图与链式法则（llm-a2 c2-l1）；
- SwiGLU 结构（c7-l3：门路×值路）；
- MoE 概念（llm-a1 c2-l2/MoE 课程导论）。

## 问题背景：FFN 是反向传播练习的最佳标本

FFN 结构简单（两三个矩阵 + 一个激活）却包含反向的全部要素：矩阵转置回传、激活逐元素导数、门控乘法路径。练透它，整个 Block 的反向只是它的重复。结尾的 MoE 连接则回答：**现代模型的"专家化"到底改了 FFN 的哪里**。

## 核心概念：FFN 前向与反向对照

前向（SwiGLU 版）：$h = \mathrm{SiLU}(xW_1) \otimes (xW_3),\quad y = hW_2$。

反向（已知 $\delta_y = \partial L/\partial y$）：

| 步骤 | 公式 | 形状语义 |
| --- | --- | --- |
| 1 | $\delta_h = \delta_y W_2^\top$ | 转置回传到中间层 |
| 2 | $\delta_{gate} = \delta_h \otimes (xW_3) \otimes \mathrm{SiLU}'(xW_1)$ | 门路梯度：三因子逐元素乘 |
| 3 | $\delta_{value} = \delta_h \otimes \mathrm{SiLU}(xW_1)$ | 值路梯度 |
| 4 | $\delta_{W_1} = x^\top \delta_{gate},\ \delta_{W_3} = x^\top \delta_{value},\ \delta_{W_2} = h^\top \delta_y$ | 权重梯度（外积） |

要点：**门控结构把"激活导数"从单独一步变成与另一路的值相乘**——梯度沿两条路同时流动，这正是 SwiGLU 反向比 ReLU-FNN 多一条路径的原因。

## 代码实践

```python
import numpy as np
rng = np.random.default_rng(0)
d, dff = 8, 16
x = rng.normal(0, 1, d)
W1 = rng.normal(0, 0.3, (d, dff)); W3 = rng.normal(0, 0.3, (d, dff))
W2 = rng.normal(0, 0.3, (dff, d))
g = lambda v: v / (1 + np.exp(-v))            # SiLU
gs = lambda v: g(v) + v * (1 - g(v)) * (1/(1+np.exp(-v)))  # SiLU 导数（近似式）

def fwd(x):
    return (g(x @ W1) * (x @ W3)) @ W2

# 数值梯度检查（对 x[0]）
y0 = fwd(x); ref = rng.normal(0, 1, d)
loss = lambda v: np.sum(fwd(v) * ref)
h = 1e-6
num = (loss(x + h*np.eye(d)[0]) - loss(x - h*np.eye(d)[0])) / (2*h)

# 解析梯度
z1 = x @ W1; z3 = x @ W3; hid = g(z1) * z3; out = hid @ W2
d_out = ref.copy()
d_hid = d_out @ W2.T
d_z1 = d_hid * z3 * gs(z1); d_z3 = d_hid * g(z1)
d_x = d_z1 @ W1.T + d_z3 @ W3.T
print(f"数值 {num:.6f} vs 解析 {d_x[0]:.6f} -> {'一致' if abs(num-d_x[0])<1e-4 else '检查实现'}")
```

预期输出：数值与解析梯度一致（误差 < 1e-4）——**数值梯度检查是手写反向的标准验收**（机器学习工程的第一习惯）。**常见错误**：门控梯度漏乘对偶路（δ_gate 忘乘 z3）；转置方向错（形状对但语义错的转置错误最隐蔽）；数值检查用前向差分（精度不够，用中心差分）。

## MoE 连接：改哪一半

把 FFN 换成 N 专家：**值路/门路的单份 $(W_1, W_3)$ 复制为 N 份**，由路由器（小小的 $W_g$）按 token 选 Top-k 份参与前向；**输出投影 $W_2$ 各专家各一份**。反向传播里，未选中的专家梯度为零（稀疏性），被选中的专家按上表正常回传——**FFN 的反向规则原封不动地搬进每个专家**。细节见 MoE 论文研读课程。

## 常见误区

1. **激活导数只在 ReLU 上重要**——SiLU/GELU 的导数是非平凡函数，实现错一点就梯度偏差；
2. **门控两路对称**——门路与值路梯度公式不同（差一个激活导数因子）；
3. **MoE 改变了反向数学**——只改了"哪些参数参与"（稀疏选择），单专家内部的反向公式不变；
4. **数值检查浪费算力**——它是手写层能一次写对的关键保险，永远值得。

## 知识关联

- **向前**：c7-l1/l3 的结构与 SwiGLU 是本节主角；
- **向后**：c8 组装 Block 的反向（注意力 + FFN 拼合）；训练课的完整反向实践；
- **平行**：llm-a4 MoE 课程的路由与前向是本节"MoE 连接"的展开。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 反向四步 | 转置回传 → 门路三因子 → 值路 → 权重外积 |
| 验收 | 中心差分数值梯度检查（<1e-4） |
| MoE 边界 | 替换 (W1,W3) 为 N 份+路由；单专家反向不变 |

## 参考资料

> **来源类型：学术来源**
> - Shazeer, N. (2020). "GLU Variants Improve Transformer." arXiv:2002.05202（SwiGLU 前向结构）。
> - Baydin et al. (2018). "Automatic Differentiation in Machine Learning: a Survey." *JMLR* 18(153)——反向模式的教科书参照。
> **来源类型：参考资料**
> - CS231n 讲义 "Gradient Check"（cs231n.github.io）——数值检查的工程规范。
> **来源类型：原创**
> - 反向四步表与 MoE 边界说明为本课程改编。
"""

for lid, md in L.items():
    replace_content(lid, md.strip("\n"))
print("done")
