# -*- coding: utf-8 -*-
"""批次12：升级 llm-a3（从 GPT-2 到 LLaMA）最弱 5 节。
数值已实跑核验：GELU/Swish 对照、3×(8/3)d²=2×4d²、RoPE 复数恒等式、GQA 显存 2.62/0.33/0.04 MB/token。
"""
import io, glob

FILES = glob.glob(r"D:\Python_Project\knowledge-order\src\content\chapters\llm-a3*.ts")


def to_ts(md):
    return md.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")


def replace_content(lid, md):
    for f in FILES:
        s = io.open(f, encoding="utf-8").read()
        if "id: '%s'" % lid not in s:
            continue
        i = s.index("id: '%s'" % lid)
        j = s.index("content: `", i) + len("content: `")
        k = s.index("\n`,", j)
        io.open(f, "w", encoding="utf-8", newline="\n").write(s[:j] + "\n" + to_ts(md) + s[k:])
        print("patched", lid, "->", f.split("\\")[-1])
        return
    raise SystemExit("not found: " + lid)


L = {}

L["llm-a3-c2-l1"] = r"""## 学习目标

学完本节，你应该能够：
1. 说明激活函数在 FFN 中的三重角色（引入非线性/可导/计算廉价），没有它两层 MLP 会塌缩成一层；
2. 手算 ReLU 与 GELU 在关键点的取值差异（如 x=−1 时 0 vs −0.159），解释"软 ReLU"的平滑价值；
3. 说出 ReLU→GELU→SiLU 的演进线索及各代代表的模型。

## 前置知识

- FFN 的升维-激活-降维结构（llm-a1 c2-l5）；
- sigmoid 函数与标准正态 CDF Φ(x) 的形状。

## 问题背景：没有非线性，再深也是一层

线性变换的复合仍是线性：$W_2(W_1 x) = (W_2 W_1)x$——两层不带激活的 MLP 等价于一层矩阵。**激活函数是网络表达力的唯一来源**，但它的选择直接决定梯度行为：ReLU 负区梯度恒 0（死神经元）、导数不连续（优化面有棱）；GPT 系的演进 ReLU→GELU→SiLU 是一条"把硬开关换成软开关"的路线。

## 直觉理解：闸门 vs 调光器

- **ReLU 是闸门**：负数一刀切死（输出 0），正数全通过——快，但负区神经元永久失明的风险（dead ReLU）；
- **GELU/SiLU 是调光器**：负区不是全关，而是"调到很暗"（小负值输出，如 x=−1 时 GELU 输出 −0.159），且处处光滑可导——微小信号仍能传梯度，优化面平滑。

## 核心概念：三代激活函数

$$\mathrm{ReLU}(x) = \max(0, x), \quad \mathrm{GELU}(x) = x \cdot \Phi(x), \quad \mathrm{SiLU}(x) = x \cdot \sigma(x)$$

其中 Φ 是标准正态 CDF（工程上用 tanh 近似），σ 是 sigmoid。SiLU 又名 Swish。

**关键点取值对照（实算）**：

| x | ReLU | GELU | SiLU |
| --- | --- | --- | --- |
| −2 | 0 | −0.046 | −0.238 |
| −1 | 0 | **−0.159** | −0.269 |
| 0.5 | 0.5 | 0.346 | 0.311 |
| 1 | 1 | 0.841 | 0.731 |
| 2 | 2 | 1.954 | 1.762 |

三个观察：① 负区：ReLU 全 0，GELU 给小的负值（且在 x≈−0.75 处有最小值），SiLU 负值更深；② 正区：GELU/SiLU 略低于 ReLU（有比例缩放效果，自带轻微正则）；③ 全程光滑：GELU/SiLU 处处可导。

## 原理详解：为什么"软"更好

1. **梯度连续性**：ReLU 在 0 点导数跳变，GELU/SiLU 导数处处连续——高学习率下优化轨迹更平滑；
2. **负区小泄漏的价值**：完全截断（ReLU）使负区梯度为 0，神经元一旦长期为负便"死亡"；GELU 负区保留约 −0.17 的最小值量级，梯度仍可回流；
3. **零中心化倾向**：GELU/SiLU 的均值比 ReLU 更接近 0，缓解深层叠加的偏置漂移。

实证注记：GELU 与 SiLU 的差距通常在千分位损失级别（GELU 出自 BERT/GPT-2 时代，SiLU 因形式更简单且与门控天然契合被 LLaMA 世代随 SwiGLU 一起采用）——**工程上"光不光滑"比"哪个略好"更主导选择**。

## 代码实践

```python
import math

Phi = lambda z: 0.5 * (1 + math.erf(z / math.sqrt(2)))   # 标准正态 CDF
gelu = lambda x: x * Phi(x)
silu = lambda x: x / (1 + math.exp(-x))

for x in (-2, -1, -0.5, 0.5, 1, 2):
    print(f"x={x:5}: ReLU={max(x,0):5.2f}  GELU={gelu(x):7.4f}  SiLU={silu(x):7.4f}")

# 导数连续性体验：在 0 附近扫一小段
h = 1e-6
print("GELU 在 0 处左导数", round((gelu(0)-gelu(-h))/h, 3), "右导数", round((gelu(h)-gelu(0))/h, 3))
```

预期输出：与上表一致；GELU 在 0 处左右导数几乎相等（≈0.5）——光滑性的直接证据（ReLU 左导数 0、右导数 1，跳变）。**常见错误**：GELU 近似式（tanh 版）与精确式混用导致对不上基准；训练时手写激活忘了数值稳定（大 |x| 的 exp 溢出）。

## 常见误区

1. **"激活函数越新越好"**——代际差距远小于数据与规模的影响；ReLU 在 CNN/小型网络仍是默认；
2. **负区小输出"违反直觉所以没用"**——恰恰是防止死神经元与保持光滑的来源；
3. **把 Swish 与 SwiGLU 混同**——Swish 是激活函数，SwiGLU 是用 Swish 构造的门控结构（下一节）；
4. **在 softmax/归一化处再套激活**——激活只放 FFN 中间层，别处乱加会破坏概率语义。

## 知识关联

- **向前**：llm-a1 的 FFN 结构（升维-激活-降维）中激活正是本节主角；
- **向后**：下一节 GLU/SwiGLU 用 SiLU 做门控；第 5 章组装 LLaMA Block 时激活进入 FFN；
- **平行**：深度学习课程对比过更多激活（tanh/LeakyReLU），本节聚焦 GPT 谱系三代。

## 本节总结

| 代际 | 函数 | 特征 | 代表 |
| --- | --- | --- | --- |
| 1 | ReLU | 硬闸门、负区全灭 | 原始 Transformer |
| 2 | GELU = x·Φ(x) | 光滑、负区小泄漏 | GPT-2/3、BERT |
| 3 | SiLU = x·σ(x) | 光滑、形式最简、适配门控 | LLaMA（随 SwiGLU） |

## 参考资料

> **来源类型：学术来源**
> - Hendrycks, D., & Gimpel, K. (2016). "Gaussian Error Linear Units (GELUs)." arXiv:1606.08415。
> - Ramachandran, P., Zoph, B., & Le, Q. V. (2017). "Searching for Activation Functions." arXiv:1710.05941（Swish）。
>
> **来源类型：原创**
> - 闸门/调光器比喻与取值对照表为本课程改编。
"""

L["llm-a3-c2-l2"] = r"""## 学习目标

学完本节，你应该能够：
1. 写出 GLU 的门控形式 $(xW) \otimes \sigma(xV)$，解释"信息门"与"值"的分工；
2. 手推 SwiGLU 的参数量守恒：为什么中间维取 $\frac{8}{3}d$；
3. 用代码验证门控与无门控 FFN 在同一输入下的行为差异。

## 前置知识

- 上一节的 SiLU 激活；
- FFN 两层结构与参数量 $2 \times d \times 4d$（llm-a1 c2-l5）。

## 问题背景：从"过滤后变换"到"边变换边控制流量"

标准 FFN：先过激活（非线性过滤），再线性降维——**控制与变换是串行的两步**。GLU（Gated Linear Unit，Dauphin et al. 2017）提出更灵活的结构：让输入同时生成两路，一路做"内容"（要传什么），一路过 sigmoid 做"门"（放行多少），逐元素相乘——**门控与内容并行、由数据自己学会开关**。Shazeer (2020) 系统测试了 GLU 变体，SwiGLU 胜出，成为 LLaMA 世代标配。

## 直觉理解：水管上的智能阀门

普通 FFN 像"先净化（激活）再送水"；GLU 像水管上装了**随水质自动调节的阀门**：主管的水（value 路）照常流，旁路的水质传感器（gate 路过 sigmoid）实时决定阀门开度（0~1），两路相乘=按需放行。**哪些特征放行、放行多少，训练中由数据学出**——比固定激活的死规则灵活得多。

## 核心概念：从 GLU 到 SwiGLU

$$\mathrm{GLU}(x) = (xW + b) \otimes \sigma(xV + c) \quad\text{（sigmoid 门）}$$

把 σ 换成 Swish(SiLU) 即 **SwiGLU**（Swish-门控线性单元）：

$$\mathrm{SwiGLU\text{-}FFN}(x) = \big(\mathrm{SiLU}(xW_1)\big) \otimes (xW_3)\, W_2$$

三路投影：$W_1$（门）、$W_3$（值）、$W_2$（输出融合），各 $d \times d_{ff}$。

**参数量守恒**：原 FFN 是 2 个矩阵（$2 \times 4d^2 = 8d^2$）；SwiGLU 有 3 个矩阵，若维持 $4d$ 中间维则参数变为 $12d^2$（+50%）。为公平对比，LLaMA 把中间维调成 $\frac{8}{3}d$：

$$3 \times d \times \tfrac{8}{3}d = 8d^2 \;\equiv\; 2 \times d \times 4d$$

（$d = 4096$ 时两边都是 134M 参数——实算可验。$\frac{8}{3}d$ 取整到 64 的倍数是工程细节。）

## 原理详解：门控为什么有效

1. **乘性交互的表达力**：相乘让两个线性空间的特征做逐维调制——等价于一个输入依赖的、可微的"特征选择器"，加性激活做不到；
2. **与残差的配合**：门控输出天然带"关闭"能力（门≈0 时该特征不进入下一层），Block 的残差流保持干净；
3. **实证**：Shazeer (2020) 在同一预算下对比 ReLU/GELU FFN 与各 GLU 变体，SwiGLU 在翻译与语言建模任务稳定占优——效率来源被归结为"门控引入的额外非线性与梯度路径"。

## 完整案例：手算一个 2 维门控

设 $x = [1, -2]$，权重取单位阵简化（$W_1 = W_3 = I$）：
- 值路：$xW_3 = [1, -2]$；
- 门路：$\mathrm{SiLU}([1, -2]) = [0.731, -0.269]$（上一节实算值）；
- 相乘：$[1 \times 0.731, -2 \times (-0.269)] = [0.731, 0.538]$。

注意第二维：值为负、门为负，**负负得正**——门控不仅调幅还可能翻相，这是纯激活 FFN 没有的自由度。

## 代码实践

```python
import numpy as np
rng = np.random.default_rng(0)
d, dff = 64, 64           # 教学尺寸（工程上 dff = 8/3*d）

W1 = rng.normal(0, 0.05, (d, dff))   # 门
W3 = rng.normal(0, 0.05, (d, dff))   # 值
W2 = rng.normal(0, 0.05, (dff, d))   # 输出
x = rng.normal(0, 1, d)

def swiglu(x):
    gate = x @ W1 / (1 + np.exp(-(x @ W1)))     # SiLU(xW1)
    value = x @ W3
    return (gate * value) @ W2

def relu_ffn(x):
    h = np.maximum(x @ W1, 0)                   # 同参数量的 ReLU 版
    return h @ W2

out_g, out_r = swiglu(x), relu_ffn(x)
print("SwiGLU 输出前4维:", np.round(out_g[:4], 3))
print("ReLU  输出前4维:", np.round(out_r[:4], 3))
print("门控负值占比:", round((x @ W1 < 0).mean(), 2))
```

预期输出：两路输出量级相近但具体值差异显著；约一半维度的门处于负区（SiLU 负值→小幅翻相/抑制）——**门控在逐维动态决定信息去留**。**常见错误**：门与值两路用同一矩阵（退化为激活 FFN）；中间维仍取 4d 导致参数超预算；把 SwiGLU 的 $\frac{8}{3}$ 当精确值（须取整对齐硬件）。

## 常见误区

1. **"GLU 是激活函数"**——它是**结构**（两路投影+逐元素乘），激活只是门路上的一个部件；
2. **门=0~1 的概率**——SwiGLU 用 SiLU，门可为负（允许翻相），比 sigmoid 门表达力强；
3. **参数账算不清**——三矩阵结构必须把 $d_{ff}$ 调到 $\frac{8}{3}d$ 才与原 FFN 同预算；
4. **以为门控处处更优**——小模型/短训练下差异可能不显著；收益在大规模语言建模中最稳。

## 知识关联

- **向前**：上一节的 SiLU 是 SwiGLU 的门激活；llm-a1 的 FFN 结构是本节的改造对象；
- **向后**：c2-l3/c2-l4 的参数估算；第 5 章把 SwiGLU-FNN 装进 LLaMA Block；
- **平行**：LSTM 的遗忘门是门控思想的循环网络前辈；MoE 的路由门控（llm-a4）是"稀疏版门控"。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| GLU | $(xW) \otimes \sigma(xV)$：内容 × 门的乘性调制 |
| SwiGLU | SiLU 门 + 值路 + 输出投影，LLaMA 世代标配（Shazeer 2020） |
| 参数守恒 | $3 \times d \times \frac{8}{3}d = 2 \times d \times 4d = 8d^2$ |
| 力量来源 | 输入依赖的逐维特征选择 + 翻相自由度 |

## 参考资料

> **来源类型：学术来源**
> - Dauphin, Y. N., et al. (2017). "Language Modeling with Gated Convolutional Networks." *ICML 2017*——GLU 原始定义。
> - Shazeer, N. (2020). "GLU Variants Improve Transformer." arXiv:2002.05202（已核验）——SwiGLU 的系统对比。
> - Touvron, H., et al. (2023). "LLaMA: Open and Efficient Foundation Language Models." arXiv:2302.13971（已核验）——采用 SwiGLU 与 $\frac{8}{3}d$ 的工程决策。
>
> **来源类型：原创**
> - 智能阀门比喻与 2 维手算为本课程改编。
"""

L["llm-a3-c3-l1"] = r"""## 学习目标

学完本节，你应该能够：
1. 说明绝对位置编码（正弦/可学习）的两大局限：**外推断崖**与**相对位置不可直接表达**；
2. 用实验思维描述"训练 2K、推理 4K"时可学习 PE 的失效形态；
3. 解释注意力打分 $q_m \cdot k_n$ 的平移敏感性——为什么绝对编码进词向量无法保证"只看相对距离"。

## 前置知识

- 三种位置编码方案概览（llm-a1 c2-l3）；
- 点积对输入扰动的敏感性（矩阵乘法直觉）。

## 问题背景：GPT-2 的位置编码撑不起长上下文时代

可学习绝对 PE（GPT-2/3 时代）：给每个位置 0..L−1 发一张可训练的向量牌，加进词嵌入。简单有效，但两个结构性问题在长上下文时代爆发：① 训练长度 2048，推理时第 2049 个位置**没有牌可发**（查找表越界）；硬外推（重复/截断）导致注意力分布崩坏。② 即使正弦编码理论上外推，绝对编码进入词向量后，位置 m 与 n 的交互项 $q_m \cdot k_n$ 无法写成"只依赖 m−n"的形式——**模型要自己从绝对坐标里学出相对关系**，浪费容量且泛化差。

## 直觉理解：座位号印在脸上 vs 面对面站位差

- **绝对 PE = 座位号印在每个人脸上**：两人交流（注意力）要各自"读对方脸上的号"再心算差值——费劲且没见过的号（超长位置）直接懵；
- **RoPE = 让每个人按座位旋转一个角度**：两人点积时角度差自动出现——**交流本身只携带"我们相距多少"的信息**，从没见过绝对座位 4096 也无妨，只要"相距 5"这个关系见过。

## 核心概念：两大局限的数学表述

**局限一（外推）**：可学习 PE 是查找表 $E \in \mathbb{R}^{L \times d}$，位置 $t \ge L$ 无定义；正弦 PE 虽可计算任意 t，但训练分布外的频率组合从未被注意力"校准"，实测长文本困惑度仍会恶化。

**局限二（相对性）：设加性编码 $x_m + p_m$，注意力打分展开：

$$(x_m + p_m)^\top W^Q{}^\top W^K (x_n + p_n) = x_m^\top A x_n + x_m^\top A p_n + p_m^\top A x_n + p_m^\top A p_n$$

四项中只有第一项与位置无关——位置信息以**绝对坐标的交叉项**混入，没有任何一项天然只是 $(m - n)$ 的函数。模型必须用容量去拟合"每个绝对距离上的行为"，而不是直接参数化相对距离。

## 完整案例：外推断崖的思维实验

设 GPT-2 小模型训练上下文 1024。分别喂 512、1024、2048 token 的文本测困惑度：
- 512 / 1024：正常（训练分布内）；
- 2048：前 1024 个位置正常，第 1025 个起要么截断（后文全部丢失）、要么把位置 1024 的牌重复用（两个"位置 1024"互相注意，语义混乱）——**困惑度在越过训练长度那一刻断崖式跳升**。正弦编码的软化版本：不崩溃但明显劣化（外推质量差的实证，催生 ALiBi/NTK/YaRN 等补丁，见 c3-l4）。

## 代码实践

```python
import numpy as np
rng = np.random.default_rng(0)
d, L_train = 32, 100

E = rng.normal(0, 0.5, (L_train, d))          # 可学习位置表（训练长度 100）

def attend(pos_q, pos_k, x_q, x_k):
    # 简化注意力打分：(x+p)W_q · (x+p)W_k，W 取单位阵
    q = x_q + E[pos_q % L_train]
    k = x_k + E[pos_k % L_train]
    return q @ k

x_q, x_k = rng.normal(0, 1, d), rng.normal(0, 1, d)
print("分布内  q@40,k@45 :", round(attend(40, 45, x_q, x_k), 2))
print("分布内  q@90,k@95 :", round(attend(90, 95, x_q, x_k), 2))
print("越界    q@140,k@145(回绕到 40/45):", round(attend(140, 145, x_q, x_k), 2))
print("同一内容，越界打分与分布内 40/45 完全相同 -> 位置身份坍缩")
```

预期输出：越界位置回绕后与分布内 40/45 的打分**完全相同**——模型把"相距 105"误认成"相距 5"，绝对位置身份坍缩，这就是外推失败的最小复现。**常见错误**：以为截断（只看前 L）无害（后文信息全丢）；正弦编码外推"免费"（质量仍衰减，需插值补丁）。

## 常见误区

1. **"正弦编码彻底解决外推"**——只是"可计算"，不是"性能不降"；ALiBi 线性惩罚、NTK/YaRN 频率缩放才是针对外推的专门设计；
2. **绝对 PE 一无是处**——短上下文、任务简单时它便宜稳定；工程演进是"够用→不够→换"；
3. **把"加进词向量"当唯一注入方式**——注入可以在输入层（加性）、注意力内（RoPE/T5 偏置）等不同层面，相对性问题的根源在"加性绝对注入"；
4. **外推问题只关于长度**——还关于**分布**：训练从未见过"远距离高相关性"的样本对。

## 知识关联

- **向前**：llm-a1 c2-l3 的三方案概览给出本节的动机铺垫；
- **向后**：下一节复数视角、c3-l3 相对性质推导（RoPE 如何根治局限二）、c3-l4 外推补丁（缓解局限一）；
- **平行**：RAG 长上下文、推理部署的上下文扩展全都踩在本节的问题上。

## 本节总结

| 局限 | 表现 | 根源 |
| --- | --- | --- |
| 外推断崖 | 越过训练长度困惑度跳升 | 查找表无越界定义 / 频率组合未校准 |
| 相对不可表达 | $q \cdot k$ 混入绝对坐标交叉项 | 加性绝对注入的位置进入点积 |
| 解法预告 | RoPE（相对性）+ 插值/缩放（外推） | c3-l2/c3-l3/c3-l4 |

## 参考资料

> **来源类型：学术来源**
> - Vaswani, A., et al. (2017). arXiv:1706.03762，§3.5——正弦编码的" hoped extrapolation"原话（作者自己也只是希望）。
> - Su, J., et al. (2021). arXiv:2104.09864——对绝对编码相对性缺陷的论述动机。
> - Press, O., Smith, N., & Lewis, M. (2022). "Train Short, Test Long: Attention with Linear Biases (ALiBi)." *EMNLP 2022*——外推断崖与补丁的实证。
>
> **来源类型：原创**
> - 座位号比喻与回绕复现实验为本课程原创。
"""

L["llm-a3-c3-l3"] = r"""## 学习目标

学完本节，你应该能够：
1. 用复数乘法完成 RoPE 相对性质的两行核心证明：$\langle R_m q, R_n k \rangle = \langle q, R_{n-m} k \rangle$；
2. 说明"两维一对、不同对不同频率"的实现细节，以及它为何等价于多分辨率尺；
3. 指出 RoPE 只旋转 q、k 不旋转 v 的原因。

## 前置知识

- 复数乘法 $e^{i\theta}$ = 旋转角 θ（欧拉公式）；
- 共轭复数与内积：$\langle a, b\rangle = \mathrm{Re}(a^* b)$（二维实向量视为复数时）；
- 上一节"绝对编码无法表达相对位置"的痛点。

## 问题背景：让"绝对旋转"在点积中只留下"相对差"

RoPE 的目标极简：给位置 m 的 q 旋转角 $m\theta$、位置 n 的 k 旋转角 $n\theta$，要求它们的点积**只依赖 $(n-m)$**。如果能做到，注意力天然变成相对位置函数——外推与泛化的根基。证明只需复数两行。

## 原理详解：两行核心证明（2 维情形）

把 2 维 q、k 视为复数。RoPE 定义：$q'_m = q\, e^{im\theta}$，$k'_n = k\, e^{in\theta}$。内积（取实部的共轭乘积）：

$$\langle q'_m, k'_n \rangle = \mathrm{Re}\left[(q\, e^{im\theta})^*\, (k\, e^{in\theta})\right] = \mathrm{Re}\left[q^* k\; e^{i(n-m)\theta}\right]$$

**绝对角 m、n 消失，只剩余 $(n-m)$**——第一行完证。第二行换个视角：$q^* k\, e^{i(n-m)\theta}$ 恰是"先算 $q^*k$ 再旋转相对角 $(n-m)\theta$"，即

$$\langle R_m q, R_n k \rangle = \langle q, R_{n-m}\, k \rangle$$

（$R_t$ 表示旋转 $t\theta$。）**q 与 k 各自带着绝对位置旋转，但它们的"对话"只由位置差决定**——这正是 c3-l1 痛点的根治。

数值验证（本页可跑，断言恒等式在随机复数、随机位置下成立）：

```python
import cmath
q, k = 3 + 4j, 1 - 2j
for m, n in ((3, 5), (10, 12), (0, 2)):
    lhs = (q * cmath.exp(1j * m * 0.5)).conjugate() * (k * cmath.exp(1j * n * 0.5))
    rhs = q.conjugate() * k * cmath.exp(1j * (n - m) * 0.5)
    assert abs(lhs - rhs) < 1e-9        # 恒等
print("RoPE 相对性质数值验证通过")
```

## 核心概念：从 2 维到多维——分块旋转

$d$ 维向量按 (2i, 2i+1) 分成 $d/2$ 对，第 i 对用频率 $\theta_i = 10000^{-2i/d}$ 旋转——与正弦编码同一套频率表。效果：
- **每对是一把尺**：高频对（θ 大）旋转快，分辨近邻距离（距离 1~10）；低频对（θ 小）旋转慢，分辨远距离（数百上千）；
- **多对联合编码**：两个位置的"距离指纹" = 各对相位差组成的向量——远近都能唯一刻画（时钟的时针/分针/秒针同理）。

**为什么只旋转 q、k**：注意力只需在 $q \cdot k$ 打分处携带相对位置；v 承载内容、不参与打分，旋转 v 毫无作用还引入失真。同理，输出投影、FFN 一概不转。

## 完整案例：手算一对维度的旋转

设某对维度 $\theta = 0.5$（rad/位置），q 该对坐标 $(1, 0)$（即复数 1），m = 2：$q'_m = e^{i \cdot 1} = \cos 1 + i\sin 1 \approx 0.540 + 0.842i$。k 该对 $= 1$（复数 1），n = 5：$k'_n = e^{i \cdot 2.5} \approx -0.801 + 0.598i$。内积：

$$\langle q'_m, k'_n \rangle = \mathrm{Re}(e^{-i \cdot 1} \cdot e^{i \cdot 2.5}) = \cos(1.5) \approx 0.071$$

直接用相对式：$\cos((5-2) \times 0.5) = \cos 1.5 \approx 0.071$ ✓——两条路径同一答案，绝对角从未出现。

## 常见误区

1. **"RoPE 给模型注入了位置向量"**——没有可学习的位置参数（0 新增参数）；位置信息只存在于 q、k 旋转后的几何关系里；
2. **旋转矩阵要显式构造**——实现上每对维度是 2×2 旋转的稀疏分块，可用 `(x1, x2) → (x1cos−x2sin, x1sin+x2cos)` 逐对计算，无需大矩阵乘；
3. **每层都要转**——是的，RoPE 在**每层注意力**的 q、k 上施加（与加性 PE 只在输入层一次不同），这是它保持相对性的必要条件；
4. **远距离信息随旋转"模糊"**——低频对覆盖远距离，但超训练长度仍需 NTK/YaRN 频率调整（下一节）。

## 知识关联

- **向前**：c3-l1 的两大局限分别被本节（相对性）与 c3-l4（外推）处理；llm-a1 c2-l3 的旋转直觉在此完成证明；
- **向后**：c4/c5 组装 LLaMA（RoPE 施加点在注意力内部）；B3 部署课程的 KV Cache 与 RoPE 的施加顺序是常见实现 bug 源；
- **平行**：DeepSeek 的解耦 RoPE（c6-l2）把位置与内容维度分离——本节思想的多维扩展。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 核心恒等式 | $\langle R_m q, R_n k\rangle = \langle q, R_{n-m} k\rangle$（复数两行可证） |
| 实现 | d 维分对旋转，$\theta_i = 10000^{-2i/d}$，多分辨率尺 |
| 只转 q、k | 打分才需要位置；v/输出/FFN 不转 |
| 性质 | 零新增参数；每层施加；相对位置天然外推友好 |

## 参考资料

> **来源类型：学术来源**
> - Su, J., et al. (2021). "RoFormer: Enhanced Transformer with Rotary Position Embedding." arXiv:2104.09864（已核验）——本节推导的原始出处（§3.2）。
>
> **来源类型：参考资料**
> - EleutherAI Blog "Rotary Embeddings: A Relative Revolution"——复数视角的独立讲法（与本节同路线）。
>
> **来源类型：原创**
> - 时钟多针比喻与数值验证脚本为本课程改编。
"""

L["llm-a3-c4-l2"] = r"""## 学习目标

学完本节，你应该能够：
1. 写出 MHA/MQA/GQA 三种结构的 KV 头数配置，并手算各自的 KV Cache 显存（2.62 / 0.04 / 0.33 MB·token⁻¹）；
2. 解释 MQA 为什么快但质量受损、GQA 如何在两者之间取折中（"组内共享"）；
3. 说出 Llama 2 70B 的具体配置（64 查询头 / 8 KV 组）及其权衡理由。

## 前置知识

- 多头注意力与 KV Cache 显存公式（llm-a1 c2-l2、llm-a2 c1-l3：$2 \times L \times n \times d \times \text{bytes}$）；
- 上一章 RoPE（GQA 不改变位置机制，只改 KV 的组织方式）。

## 问题背景：推理的成本在"读 KV"

推理解码阶段每生成一个 token，都要拿新 q 与**全部历史 K、V** 做注意力。70B 级模型：80 层 × 64 头 × 128 维 × 2(K,V) × 2 字节 = **每 token 2.62 MB** 的 KV Cache——4K 上下文就是 10 GB+。显存带宽成为解码速度的第一瓶颈：**KV 越大，每步搬运越多，token/s 越低**。出路：砍 KV 的头数。

## 直觉理解：会议室的资料份数

64 个查询头像 64 位与会者，每人讨论时都要翻阅历史资料（K、V）：
- **MHA**：每位一份专属资料（64 份）——最全但搬运最重；
- **MQA**：全会议室**共用 1 份**投影资料——搬运减到 1/64，但 64 人兴趣各异，一份资料众口难调（质量下降）；
- **GQA**：分成 8 组，**每组 8 人共用一份**——8 份资料，组内兴趣相近，众口不再难调。

## 核心概念：三结构对照（以 Llama 2 70B 尺寸为例）

| 结构 | 查询头 | KV 头 | KV Cache（每 token，80 层×128 维×fp16） | 质量/速度 |
| --- | --- | --- | --- | --- |
| MHA | 64 | 64 | $2×80×64×128×2 = 2.62$ MB | 质量上限 / 最慢 |
| GQA-8 | 64 | **8** | $2×80×8×128×2 = 0.33$ MB | 质量近 MHA / 快 8× |
| MQA | 64 | **1** | $2×80×1×128×2 = 0.04$ MB | 质量受损 / 最快 |

GQA 的机制：64 个查询头分成 G 组（G=8），**组内 8 个查询头共享同一组 K、V 头**；实现上 K/V 投影矩阵从 $d \times 64 \cdot 128$ 缩为 $d \times 8 \cdot 128$，注意力计算时将共享 KV 按组广播（或等价地用 repeat_interleave 对齐查询头）。

## 原理详解：为什么 GQA 几乎不掉点

Ainslie et al. (2023) 的发现：训练好的 MHA 模型里，**大量 KV 头的 K/V 投影彼此高度相似**（冗余）——这正是 llm-a1 c2-l2 "头有冗余可剪"结论的 KV 侧版本。GQA 直接参数化这种共享：从头训练时每组学一份"组内平均意义"的 KV；论文还给出**升级训练（uptraining）**：把现成 MHA 检查点的 KV 头合并初始化为 GQA，再用原训练语料的一小部分（约 5%）继续训练——质量几乎无损地获得 MQA 级速度。Llama 2 70B 正是采用 GQA-8（64 Q / 8 KV）。

## 完整案例：吞吐粗算

设 H100 显存带宽 3.35 TB/s，70B 模型单 batch 解码。每 token 需读：权重（fp16 约 140 GB，量化后另计）+ KV Cache。4K 上下文时：
- MHA：KV = 4096 × 2.62 MB ≈ 10.7 GB → 仅 KV 搬运耗时 ≈ 10.7/3350 ≈ **3.2 ms/token**；
- GQA-8：KV ≈ 1.34 GB → ≈ 0.4 ms/token——**KV 侧提速约 8 倍**，长上下文批量推理的总吞吐显著提升（权重搬运是另一部分，GQA 不改变它；总提速介于两者之间）。

## 代码实践

```python
import numpy as np
rng = np.random.default_rng(0)
d, n_q, n_kv, dh = 512, 8, 2, 64          # 教学尺寸：8 查询头 / 2 KV 组

Wq = rng.normal(0, 0.04, (d, n_q * dh))
Wk = rng.normal(0, 0.04, (d, n_kv * dh))
Wv = rng.normal(0, 0.04, (d, n_kv * dh))
x = rng.normal(0, 1, (3, d))               # 3 个 token

q = (x @ Wq).reshape(3, n_q, dh)           # (3, 8, 64)
k = (x @ Wk).reshape(3, n_kv, dh)          # (3, 2, 64)
v = (x @ Wv).reshape(3, n_kv, dh)

# GQA 对齐：每 4 个查询头共享 1 个 KV 头
rep = n_q // n_kv
k_g = np.repeat(k, rep, axis=1)            # (3, 8, 64)
v_g = np.repeat(v, rep, axis=1)
print("q 形状", q.shape, " 共享 k 广播后", k_g.shape)
print("KV 参数量: MHA", d * n_q * dh * 2, " GQA", d * n_kv * dh * 2,
      f" (降至 {n_kv/n_q:.0%})")
```

预期输出：q (3,8,64)，广播后 k (3,8,64)；KV 投影参数降至 25%（8→2 头）。**常见错误**：repeat 方向弄错（沿 head 维而非 batch/seq 维）；KV 头数不能整除查询头数（须 n_q % n_kv == 0）；训练用 GQA、推理代码仍按 MHA 读取权重（形状错配）。

## 常见误区

1. **GQA 改变注意力数学**——缩放点积公式不变，只是 K/V 的**来源被共享**；
2. **"KV 头越少越快越好"**——MQA 在小模型/短上下文可行，大模型质量损失可感；GQA 的组数是新超参（1=MQA，n_q=MHA，中间=GQA）；
3. **只算显存不算带宽**——解码瓶颈是搬运（带宽）而非容量；GQA 同时改善两者；
4. **忽视升级训练路径**——多数存量 MHA 模型可用 uptraining 低成本转 GQA（论文核心贡献之一）。

## 知识关联

- **向前**：KV Cache 显存公式（llm-a2 c1-l3）是本节全部动机；多头冗余（llm-a1 c2-l2）预示了 KV 可共享；
- **向后**：c4-l3 分组数选择、c4-l4 完整数据流；B3 部署课的 PagedAttention 与量化 KV 在 GQA 之上再叠加；
- **平行**：DeepSeek MLA（c6）用低秩压缩替代分组共享——同一问题的另一条路。

## 本节总结

| 结构 | KV 头 | Cache/token (70B 尺寸) | 一句话 |
| --- | --- | --- | --- |
| MHA | 64 | 2.62 MB | 质量上限，搬运最重 |
| GQA-8 | 8 | 0.33 MB | 组内共享，质量近 MHA（Llama 2 70B 采用） |
| MQA | 1 | 0.04 MB | 极快但质量受损 |

## 参考资料

> **来源类型：学术来源**
> - Ainslie, J., et al. (2023). "GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints." *EMNLP 2023*. arXiv:2305.13245（已核验）。
> - Shazeer, N. (2019). "Fast Transformer Decoding: One Write-Head is All You Need." arXiv:1911.02150——MQA 原始论文。
>
> **来源类型：原创**
> - 会议室资料比喻与吞吐粗算为本课程改编。
"""

for lid, md in L.items():
    replace_content(lid, md.strip("\n"))
print("done")
