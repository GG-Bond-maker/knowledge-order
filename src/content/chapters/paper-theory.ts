import type { Chapter } from '../../types';

/* ============================================================
 *  人工智能基础 · 论文导读 · 理论与复杂度
 *  05 MDL Principle（最小描述长度）
 *
 *  来源：
 *  - 论文：Grünwald, "A Tutorial Introduction to the Minimum Description Length Principle"
 *  - 参考：Ojhaharsh/30u30 第 05 篇（CC BY-NC-ND 4.0，本地个人使用）
 *  - 本课程为原创导读 + 原创习题
 *
 *  执行说明：纯 numpy，走 Pyodide 浏览器内执行。
 * ============================================================ */

export const paperTheoryChapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c1: MDL 最小描述长度
   * ============================================================ */
  {
    id: 'paper-theory-c1',
    title: 'MDL：用"描述长度"做模型选择',
    goal: '理解 MDL 原理的直觉与数学形式，掌握两部分编码与贝叶斯信息准则 BIC 的关系，能手算并比较不同模型的描述长度。',
    lessons: [
      {
        id: 'paper-theory-c1-l1',
        title: '奥卡姆剃刀的定量化',
        difficulty: 4,
        content: `
### 学习目标

学完本节，你应该能够：
1. 用两部分编码 L = L(模型)+L(数据|模型) 手算直线 vs 四次多项式的描述长度，解释为什么拟合更准的模型反而输；
2. 说出「编码长度=-log₂P」的桥梁作用与 BIC=k·ln(n)-2lnL̂ 是 MDL 的近似（比 AIC 惩罚更重）；
3. 用 numpy 对 0~4 阶多项式计算两部分 MDL，验证真实阶数 d=1 的总长最短。

### 前置知识

- 极大似然与交叉熵（深度学习/统计基础）；
- 多项式最小二乘拟合；
- 对数与比特的关系。

### 问题背景

拟合 5 个点，四次多项式误差为 0——但没人会选它。「过拟合」长期只有直觉、没有度量。MDL 把奥卡姆剃刀变成可计算的账本：总描述长度 = 描述模型本身 + 给定模型描述数据，选模型就是选压缩得最短的那本账——无需测试集、无需手调正则系数。它还是「压缩即智能」假说的理论源头：语言模型的交叉熵损失就是平均编码长度，压缩得越好=规律抓得越准。

### 直觉理解

寄数据像寄快递：可以附一本厚说明书（复杂模型）+ 一小包待修正的误差，或一本薄说明书（简单模型）+ 一大包误差。总运费最少的方案赢。完美拟合的四次多项式说明书太厚（5 个参数 × 32 比特），运费反而输给直线——奥卡姆剃刀从此有了价签。

### 核心概念与原理详解

## 论文信息

| 项目 | 内容 |
| --- | --- |
| **标题** | A Tutorial Introduction to the Minimum Description Length Principle |
| **作者** | Peter D. Grünwald |
| **发表** | 2004（技术报告 + 后续成书） |
| **一句话贡献** | 把"奥卡姆剃刀"变成可计算的量：最好的模型是能把数据压缩得最短的模型 |

## 一个根本问题：如何选择模型

假设你有一组数据点，想拟合一条曲线：

    (1, 2.1), (2, 4.2), (3, 5.9), (4, 8.1), (5, 10.2)

**三个候选模型**：

| 模型 | 参数个数 | 拟合效果 |
| --- | --- | --- |
| **直线** y = ax + b | 2 | 还行 |
| **二次** y = ax² + bx + c | 3 | 更好 |
| **四次** y = ax⁴ + ... + e | 5 | **完美穿过每个点** |

**问题**：四次多项式误差为 0，是不是最好的模型？

**答案：不是。** 它过拟合了——把噪声也当成了规律。

**但怎么定量判断"过拟合"？** 这就是 MDL 要回答的。

## MDL 的核心思想

> **最好的模型，是能把数据压缩得最短的模型。**

**为什么**：

    模型 + 用模型描述的数据 = 总描述长度

    简单模型 → 模型本身短，但数据描述长（拟合差）
    复杂模型 → 模型本身长，但数据描述短（拟合好）

    **最优模型在两者之间取得平衡**

<MDLTradeoffDemo />

**关键洞察**：**"压缩"和"学习"是同一件事**。

如果你能真正压缩数据，说明你发现了数据中的规律。
随机数据无法压缩（没有规律可学）。

## 两部分编码（Two-Part Code）

**MDL 的经典形式**：

    L(数据) = L(模型) + L(数据 | 模型)

| 部分 | 含义 | 直觉 |
| --- | --- | --- |
| **L(模型)** | 描述模型本身要多少比特 | 模型复杂度惩罚 |
| **L(数据&#124;模型)** | 给定模型后，描述数据要多少比特 | 拟合误差 |

**举例**：用多项式拟合 5 个点

**模型 A（直线，2 参数）**：

    L(模型) = 编码 2 个参数 ≈ 2 × 32 = 64 比特
    L(数据|模型) = 残差较大，假设每个残差需 10 比特 → 5 × 10 = 50 比特
    总计 = 114 比特

**模型 C（四次多项式，5 参数）**：

    L(模型) = 编码 5 个参数 ≈ 5 × 32 = 160 比特
    L(数据|模型) = 残差为 0，每个只需 1 比特 → 5 × 1 = 5 比特
    总计 = 165 比特

**结论**：直线（114）优于四次（165）——**尽管四次拟合得更准**。

**这就是 MDL 自动实现"奥卡姆剃刀"的机制。**

## 编码长度怎么算：从概率到比特

**关键联系**：**编码长度 = 负对数概率**。

    L(x) = -log₂ P(x)

**为什么**：

| 概率 | 编码长度 | 直觉 |
| --- | --- | --- |
| 1/2 | 1 比特 | 两种可能，1 位就够 |
| 1/4 | 2 比特 | 四种可能，2 位 |
| 1/1024 | 10 比特 | 千分之一，需要 10 位 |

**概率越小的事件，编码越长**——这符合直觉（罕见事件需要更多信息量来描述）。

**这就是 MDL 与概率模型的桥梁**：

    L(数据) = -log₂ P(数据 | 模型) - log₂ P(模型)

    = 负对数似然 + 模型先验

**所以 MDL ≈ 贝叶斯推断**（用"最可能"的点估计代替积分）。

## 与 BIC 的关系

**BIC（Bayesian Information Criterion）** 是 MDL 的常用近似：

    BIC = k·ln(n) - 2·ln(L̂)

其中：
- k = 参数个数
- n = 样本数
- L̂ = 最大似然

**为什么 BIC 惩罚 k·ln(n)**：

    参数 k 每个约需 log₂(n)/2 比特编码
    → 惩罚项与 ln(n) 成正比

**与 AIC 的对比**：

| 准则 | 惩罚项 | 倾向 |
| --- | --- | --- |
| **AIC** | 2k | 偏向复杂模型（预测导向） |
| **BIC** | k·ln(n) | 偏向简单模型（解释导向） |
| **MDL** | 精确编码长度 | 理论上最优，但计算复杂 |

**关键区别**：当 n > 8 时，ln(n) > 2，所以 **BIC 比 AIC 惩罚更重**。

<AICvsBICDemo />

## MDL 的三种形式

### ① 两部分编码（Two-Part MDL）

    L = L(模型) + L(数据|模型)

**优点**：直观、易实现。
**缺点**：模型描述长度依赖具体编码方式（不是唯一的）。

### ② 前序编码（Prequential MDL）

**做法**：按顺序预测每个数据点，累加预测损失。

    L = Σᵢ -log₂ P(xᵢ | x₁...xᵢ₋₁)

**优点**：无需显式描述模型，天然防止过拟合。
**直觉**：如果一个模型真的学到了规律，它应该能**逐点预测得很好**。

**类比**：在线学习——每来一个数据，先用当前模型预测，再更新。

### ③ 归一化最大似然（NML）

    L = -log₂ [ P(x | θ̂(x)) / Σ_y P(y | θ̂(y)) ]

**优点**：理论上最精确（minimax 最优）。
**缺点**：分母的求和通常无法计算（需要遍历所有可能数据）。

## 一个具体例子：选择多项式阶数

假设数据由 y = 2x + 1 + 噪声 生成。

**用两部分 MDL 选阶数**：

    对 d = 0, 1, 2, 3, 4, 5:
      L_model = (d+1) × 32 比特     # 每个参数 32 位
      L_data  = n × (残差的标准差编码)  # 残差越小，编码越短
      L_total = L_model + L_data

**预期结果**：d=1 时总长度最小（真实模型是直线）。

**d=0（常数）**：模型短，但残差大 → 数据部分长
**d=5（四次）**：数据部分短，但模型长 → 模型部分长
**d=1（直线）**：两者平衡 → **总长度最小** ✓

<PolynomialMDLDemo />

## MDL 为什么重要

| 意义 | 说明 |
| --- | --- |
| **理论统一** | 把"学习""压缩""推断"统一在一个框架下 |
| **自动防过拟合** | 无需调正则化系数，模型复杂度自动被惩罚 |
| **可解释** | 描述长度有明确的信息论含义 |
| **模型选择** | 提供客观标准（不依赖测试集） |

## MDL 的局限

| 局限 | 说明 |
| --- | --- |
| **编码方案不唯一** | 不同的编码方式给出不同长度（但差异通常不影响模型选择） |
| **计算复杂** | 精确 MDL 需要对模型空间求和，通常不可行 |
| **依赖数据表示** | 同样的数据用不同单位表示，编码长度不同 |
| **NML 不可计算** | 分母是"所有可能数据"的和，实际无法算 |

**实践建议**：用 **BIC** 作为 MDL 的近似——简单、够用、有理论保证。

## 与深度学习的关系

**现代大模型的"压缩即智能"假说**：

> 一个能更好压缩数据的模型，就是更理解数据的模型。

**证据**：

| 现象 | 解释 |
| --- | --- |
| 语言模型越好，压缩率越高 | 预测下一个 token 越准 = 熵越低 |
| Scaling Laws 与压缩率相关 | 更大的模型压缩得更好 |
| "涌现能力" | 压缩率跨过阈值后的相变 |

**Hutter Prize**：奖励能最好压缩 enwik8（100MB 维基百科）的程序——
本质就是"用 MDL 衡量智能"。

## 本节来源

> **来源类型：学术来源**
> - Grünwald, P. D. *A Tutorial Introduction to the Minimum Description Length Principle*
>   （2004，arXiv 有相关技术报告版本）
> - Rissanen, J. *Modeling by shortest data description*（1978，MDL 原始论文）
> - Schwarz, G. *Estimating the dimension of a model*（1978，BIC 原始论文）
>
> **来源类型：参考资料（CC BY-NC-ND 4.0，本地个人使用）**
> - Ojhaharsh/30u30 第 05 篇（含两部分 MDL / 前序 MDL / NML 的完整实现）
>
> **来源类型：原创**
> - 全部导读文字、交互图示、代码示例与习题

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
rng = np.random.default_rng(6)
n = 20
x = np.linspace(0, 1, n)
y = 2*x + 1 + rng.normal(0, 0.15, n)          # 真实模型: 直线+噪声
eps = 0.01                                     # 残差量化精度
for d in range(5):
    c = np.polyfit(x, y, d)
    sigma = max((y - np.polyval(c, x)).std(), 1e-6)
    L_model = (d + 1) * 32                     # 每参数 32 比特
    L_data = n * max(0.5*np.log2(2*np.pi*np.e*sigma**2 / eps**2), 0.0)
    print(f"d={d}: 总长 {L_model + L_data:6.1f} = 模型 {L_model} + 数据 {L_data:.1f}")\`\`\`

预期输出（实测）：实测：d=0/1/2/3/4 的总描述长度 193.2 / 185.1 / 216.3 / 248.0 / 280.0 比特——d=1（真实模型）最短；d≥2 后数据部分几乎不再下降（残差已到噪声水平），模型部分每加一阶贵 32 比特，惩罚立即生效。

**常见错误**：残差方差趋 0 时直接取对数得 -inf，必须设量化下限；只算 L(数据|模型) 忘加 L(模型)，永远选最复杂模型；把 BIC 惩罚记成 2k——那是 AIC，n>8 后两者可能给出相反排序。

### 常见误区

1. **拟合最准=最好**——MDL 证明「描述最短」才是好：完美拟合噪声要付模型描述的代价；
2. **MDL 只是又一种信息准则**——它是原理（压缩=学习），AIC/BIC 是预测/解释目标下的近似；
3. **编码方案不同结论就不同**——方案差异是 O(1) 量级，通常不影响模型排序。

### 知识关联

- **向前**：信息论「编码长度=-log₂P」是本节全部计算的地基；
- **向后**：c2 把 MDL 搬进神经网络权重，c4 柯尔莫哥洛夫复杂度给「最短描述」严格定义；
- **平行**：语言模型损失=平均编码长度；Hutter Prize 用压缩衡量智能。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 核心等式 | L(数据) = L(模型) + L(数据|模型) |
| 桥梁 | 编码长度 = -log₂P → MDL ≈ 负对数似然 + 复杂度惩罚 |
| 实测 | d=0..4 → 193/185/216/248/280 比特，d=1 最短 |
| 近似 | BIC = k·ln(n) - 2lnL̂（比 AIC=2k 惩罚更重） |
| 现代回声 | LM 损失=编码长度；压缩即智能 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见论文原文：Grünwald, A Tutorial Introduction to the Minimum Description Length Principle；Rissanen 1978；Schwarz 1978）
`,
        tips: [
          {
            kind: 'interview',
            text: '「MDL 的核心思想」：最好的模型是能把数据压缩得最短的模型。总描述长度 = 模型描述长度 + 数据描述长度，两者权衡自动实现奥卡姆剃刀。',
          },
          {
            kind: 'leak',
            text: '「编码长度与概率的关系」：L(x) = -log₂P(x)。概率越小的事件编码越长。这是 MDL 与贝叶斯推断的桥梁。',
          },
          {
            kind: 'pitfall',
            text: 'BIC 与 AIC 的区别：AIC 惩罚 2k，BIC 惩罚 k·ln(n)。n>8 时 BIC 惩罚更重，更偏向简单模型。AIC 适合预测，BIC 适合解释。',
          },
        ],
        demos: [
          {
            title: '两部分 MDL：选择多项式阶数',
            lang: 'python',
            code: `import numpy as np

def two_part_mdl(x, y, degree, param_bits=32):
    """
    计算两部分 MDL 长度。

    L = L(model) + L(data|model)
      = 参数个数 × 每参数比特 + n × 残差的编码长度
    """
    n = len(x)

    # ① 模型描述长度
    n_params = degree + 1
    L_model = n_params * param_bits

    # ② 数据描述长度（给定模型）
    # 用多项式拟合，计算残差
    coeffs = np.polyfit(x, y, degree)
    pred = np.polyval(coeffs, x)
    residuals = y - pred

    # 残差的标准差 -> 每个数据点的编码长度
    # 用高斯编码：L = 0.5 * log2(2πe σ²)
    sigma = np.std(residuals) if np.std(residuals) > 1e-12 else 1e-12
    bits_per_point = 0.5 * np.log2(2 * np.pi * np.e * sigma**2)
    L_data = n * max(bits_per_point, 0.5)   # 至少 0.5 比特

    return L_model, L_data, L_model + L_data, sigma


# 生成真实为直线的数据
np.random.seed(42)
n = 20
x = np.linspace(0, 5, n)
y_true = 2 * x + 1
y = y_true + np.random.randn(n) * 0.5     # 加噪声

print("=== 数据：真实模型 y = 2x + 1 + 噪声 ===")
print(f"样本数: {n}, 噪声标准差: 0.5")
print()

print(f"{'阶数':>4} | {'模型比特':>8} | {'数据比特':>8} | {'总计':>8} | {'残差σ':>8}")
print("-" * 55)

best_degree = None
best_total = float('inf')

for d in range(0, 8):
    L_m, L_d, L_total, sigma = two_part_mdl(x, y, d)
    marker = ""
    if L_total < best_total:
        best_total = L_total
        best_degree = d
        marker = " ←"
    print(f"{d:>4} | {L_m:>8.1f} | {L_d:>8.1f} | {L_total:>8.1f} | {sigma:>8.4f}{marker}")

print()
print(f"=== MDL 选择的最优阶数: {best_degree} ===")
print(f"（真实模型是 1 阶直线）")
print()
print("观察：")
print("  · 阶数 0：模型最短，但残差大 -> 数据部分长")
print("  · 阶数 6+：残差趋近 0，但模型部分急剧增长")
print("  · 阶数 1：两者平衡 -> 总长度最小 ✓")`,
          },
          {
            title: '编码长度 vs 概率：-log₂P 的直觉',
            lang: 'python',
            code: `import numpy as np

print("=== 编码长度与概率的关系 ===")
print()
print("L(x) = -log2 P(x)")
print()
print(f"{'概率 P':>12} | {'编码长度':>10} | {'直觉'}")
print("-" * 50)

cases = [
    (0.5, "两种等可能，1 位够"),
    (0.25, "四种可能，2 位"),
    (0.125, "八种可能，3 位"),
    (1/1024, "千分之一，10 位"),
    (1/1e6, "百万分之一，20 位"),
    (0.99, "几乎必然，很短"),
]
for p, intuition in cases:
    L = -np.log2(p)
    print(f"{p:>12.6f} | {L:>10.2f} | {intuition}")

print()
print("=== 为什么这是 MDL 的桥梁 ===")
print()
print("贝叶斯公式：")
print("  P(model | data) ∝ P(data | model) × P(model)")
print()
print("取负对数：")
print("  -log P(model|data) = -log P(data|model) - log P(model) + const")
print("                     = L(data|model) + L(model) + const")
print()
print("所以：")
print("  最可能的模型 = 描述长度最短的模型")
print("  MDL 与贝叶斯推断在本质上是同一件事")

print()
print("=== 香农熵：平均编码长度 ===")
def entropy(probs):
    """香农熵 = 平均编码长度（最优编码下）"""
    p = np.array([x for x in probs if x > 0])
    return -np.sum(p * np.log2(p))

dists = [
    ("均匀分布 (1/4 each)", [0.25]*4),
    ("偏斜 (0.7,0.1,0.1,0.1)", [0.7,0.1,0.1,0.1]),
    ("极偏 (0.97,0.01,0.01,0.01)", [0.97,0.01,0.01,0.01]),
]
print()
print(f"{'分布':30} {'熵(比特)':>10}")
print("-" * 44)
for name, p in dists:
    print(f"{name:30} {entropy(p):>10.3f}")
print()
print("熵越低 -> 平均编码越短 -> 数据越'可压缩'")
print("这正是'压缩即理解'的数学基础。")`,
          },
          {
            title: 'BIC 与 AIC：惩罚项的差异',
            lang: 'python',
            code: `import numpy as np
import matplotlib.pyplot as plt

def fit_polynomial(x, y, degree):
    """拟合多项式并返回 (RSS, 参数量)"""
    coeffs = np.polyfit(x, y, degree)
    pred = np.polyval(coeffs, x)
    rss = np.sum((y - pred) ** 2)
    return rss, degree + 1

def aic(rss, n, k):
    """AIC = 2k - 2ln(L)，高斯假设下 ln(L) ∝ -n/2 * ln(RSS/n)"""
    if rss <= 0:
        return -np.inf
    log_lik = -n / 2 * np.log(rss / n)
    return 2 * k - 2 * log_lik

def bic(rss, n, k):
    """BIC = k*ln(n) - 2ln(L)"""
    if rss <= 0:
        return -np.inf
    log_lik = -n / 2 * np.log(rss / n)
    return k * np.log(n) - 2 * log_lik


np.random.seed(0)
n = 30
x = np.linspace(0, 5, n)
y = 2 * x + 1 + np.random.randn(n) * 1.0   # 真实是 1 阶

print("=== 数据：y = 2x + 1 + 噪声(σ=1)，n=30 ===")
print()
print(f"{'阶数':>4} {'参数k':>6} {'RSS':>10} {'AIC':>9} {'BIC':>9}")
print("-" * 45)

aic_scores, bic_scores, degrees = [], [], []
for d in range(0, 8):
    rss, k = fit_polynomial(x, y, d)
    a = aic(rss, n, k)
    b = bic(rss, n, k)
    aic_scores.append(a); bic_scores.append(b); degrees.append(d)
    print(f"{d:>4} {k:>6} {rss:>10.2f} {a:>9.2f} {b:>9.2f}")

best_aic = degrees[int(np.argmin(aic_scores))]
best_bic = degrees[int(np.argmin(bic_scores))]
print()
print(f"AIC 选择: {best_aic} 阶")
print(f"BIC 选择: {best_bic} 阶")
print()
print(f"n={n}, ln(n)={np.log(n):.3f}")
print(f"BIC 惩罚系数 k·ln(n)，AIC 惩罚 2k")
print(f"因为 ln(30)={np.log(n):.2f} > 2，BIC 惩罚更重 -> 更偏向简单模型")

# 可视化
fig, ax = plt.subplots(figsize=(8, 4))
ax.plot(degrees, aic_scores, 'o-', label='AIC', linewidth=2)
ax.plot(degrees, bic_scores, 's-', label='BIC', linewidth=2)
ax.axvline(best_aic, color='#2f6bff', linestyle='--', alpha=0.4)
ax.axvline(best_bic, color='#f59e0b', linestyle='--', alpha=0.4)
ax.set_xlabel('Polynomial degree')
ax.set_ylabel('Criterion (lower is better)')
ax.set_title('AIC vs BIC model selection')
ax.legend(); ax.grid(alpha=0.3)
plt.tight_layout()
plt.savefig('aic_bic.png', dpi=80, bbox_inches='tight')
print()
print("已生成图表 aic_bic.png")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'paper-theory-c1-e1',
        type: 'single',
        difficulty: 2,
        question: 'MDL（最小描述长度）原理的核心思想是？',
        options: [
          { value: 'A', text: '模型的参数越少越好' },
          { value: 'B', text: '最好的模型是能把数据压缩得最短的模型（模型长度 + 数据长度最小）' },
          { value: 'C', text: '训练误差越小越好' },
          { value: 'D', text: '模型训练越快越好' },
        ],
        answer: 'B',
        explanation:
          'MDL 不是简单追求参数少（A 太粗糙），也不是追求拟合好（C 会过拟合）。它权衡两者：总描述长度 = L(模型) + L(数据|模型)，最优模型在两者之间取得平衡。',
        tags: ['MDL 核心'],
      },
      {
        id: 'paper-theory-c1-e2',
        type: 'judge',
        difficulty: 2,
        question: '在 MDL 框架下，一个能把训练数据完美拟合（误差为 0）的模型一定是最优的。',
        answer: false,
        explanation:
          '完美拟合通常意味着模型参数很多，L(模型) 很长。比如 5 个点用 5 参数多项式完美拟合，但模型描述需要 160 比特，总长度反而大于直线的 114 比特。',
        tags: ['过拟合'],
      },
      {
        id: 'paper-theory-c1-e3',
        type: 'multiple',
        difficulty: 3,
        question: 'MDL 的三种主要形式是？（多选）',
        options: [
          { value: 'A', text: '两部分编码：L(模型) + L(数据|模型)' },
          { value: 'B', text: '前序编码：按顺序累加预测损失' },
          { value: 'C', text: '归一化最大似然 NML' },
          { value: 'D', text: '梯度下降' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 是优化方法，不是 MDL 的形式。三种形式各有优劣：两部分编码直观易实现，前序编码天然防过拟合，NML 理论最优但不可计算。',
        tags: ['MDL 形式'],
      },
      {
        id: 'paper-theory-c1-e4',
        type: 'fill',
        difficulty: 3,
        question:
          '编码长度与概率的关系是 L(x) = ___ P(x)，即概率越小的事件编码越长。',
        blanks: [['-log2', '-log₂', '负对数', '−log2']],
        explanation:
          '这是 MDL 与贝叶斯推断的桥梁。取负对数后，贝叶斯公式 P(model|data) ∝ P(data|model)P(model) 就变成"描述长度相加"，最可能的模型 = 描述最短的模型。',
        tags: ['编码与概率'],
      },
      {
        id: 'paper-theory-c1-e5',
        type: 'code',
        difficulty: 2,
        question:
          '计算编码长度：code_length(p)。\n\n给定概率 p，返回编码长度 -log₂(p)（比特）。\np <= 0 时返回 float("inf")。',
        starterCode: `import numpy as np

def code_length(p):
    if p <= 0:
        return float("inf")
    return ___
`,
        setupCode: '',
        expectedOutput: '编码长度',
        tests: `import numpy as np
assert abs(code_length(0.5) - 1.0) < 1e-9
assert abs(code_length(0.25) - 2.0) < 1e-9
assert abs(code_length(0.125) - 3.0) < 1e-9
assert abs(code_length(1.0) - 0.0) < 1e-9
assert code_length(0) == float("inf")
assert code_length(-0.1) == float("inf")
# 概率越小，编码越长
assert code_length(0.01) > code_length(0.5)
`,
        answer: `import numpy as np

def code_length(p):
    if p <= 0:
        return float("inf")
    return -np.log2(p)
`,
        explanation:
          '**这是 MDL 最基本的计算单元**——所有描述长度最终都归结为这个公式。\n\n**为什么是 log₂**：以比特为单位。用自然对数（ln）则单位是"纳特"（nat），两者只差常数倍。\n\n**p=1 时长度为 0**：必然事件不需要任何信息来描述，符合直觉。\n\n**p→0 时长度→∞**：几乎不可能的事件需要无限多信息——这也是 MDL 自动惩罚复杂模型的原因。',
        tags: ['编程', '编码长度'],
      },
      {
        id: 'paper-theory-c1-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现两部分 MDL：two_part_mdl_length(n_points, n_params, residual_std, param_bits=32)。\n\n- L_model = n_params × param_bits\n- L_data = n_points × 0.5 × log₂(2πe·σ²)\n- 返回 (L_model, L_data, L_total)\n\nresidual_std 很小时（<1e-12）按 1e-12 处理。',
        starterCode: `import numpy as np

def two_part_mdl_length(n_points, n_params, residual_std, param_bits=32):
    L_model = ___
    sigma = max(residual_std, 1e-12)
    L_data = ___
    return L_model, L_data, L_model + L_data
`,
        setupCode: '',
        expectedOutput: 'MDL 长度',
        tests: `import numpy as np
# 2 参数模型，20 个点，残差 0.5
Lm, Ld, Lt = two_part_mdl_length(20, 2, 0.5)
assert Lm == 64, f"模型长度应为 64，实际 {Lm}"
expected_Ld = 20 * 0.5 * np.log2(2 * np.pi * np.e * 0.25)
assert abs(Ld - expected_Ld) < 1e-6, f"数据长度错误: {Ld}"
assert abs(Lt - (Lm + Ld)) < 1e-9

# 更多参数 -> 模型更长
Lm2, _, _ = two_part_mdl_length(20, 5, 0.5)
assert Lm2 == 160

# 残差更小 -> 数据部分更短
_, Ld_small, _ = two_part_mdl_length(20, 2, 0.1)
assert Ld_small < Ld
`,
        answer: `import numpy as np

def two_part_mdl_length(n_points, n_params, residual_std, param_bits=32):
    L_model = n_params * param_bits
    sigma = max(residual_std, 1e-12)
    L_data = n_points * 0.5 * np.log2(2 * np.pi * np.e * sigma**2)
    return L_model, L_data, L_model + L_data
`,
        explanation:
          '**公式来源**：高斯分布的微分熵是 `0.5·log₂(2πeσ²)`，这是"用最优编码描述一个高斯随机变量"所需的平均比特数。\n\n**权衡的体现**：\n- 参数多 → `L_model` 大\n- 参数多 → 拟合好 → `residual_std` 小 → `L_data` 小\n- 最优在两者之间\n\n**实践中的关键**：`param_bits` 的取值会影响结果。用 32 位浮点是常见假设，但也可用更精细的编码（如量化后的实际比特数）。',
        tags: ['编程', '两部分 MDL'],
      },
      {
        id: 'paper-theory-c1-e7',
        type: 'code',
        difficulty: 3,
        question:
          '实现 BIC 计算：bic_score(rss, n, k)。\n\n高斯假设下：\n- log_lik = -n/2 × ln(rss/n)\n- BIC = k×ln(n) - 2×log_lik\n\nrss <= 0 时返回 -inf。',
        starterCode: `import numpy as np

def bic_score(rss, n, k):
    if rss <= 0:
        return float("-inf")
    log_lik = ___
    return ___
`,
        setupCode: '',
        expectedOutput: 'BIC 分数',
        tests: `import numpy as np
# n=100, k=3, rss=50
b = bic_score(50, 100, 3)
expected = 3 * np.log(100) - 2 * (-100/2 * np.log(50/100))
assert abs(b - expected) < 1e-9, f"BIC 错误: {b} vs {expected}"

# 相同 rss 下，参数多的 BIC 更大（更差）
b1 = bic_score(50, 100, 2)
b2 = bic_score(50, 100, 5)
assert b2 > b1, "参数多应有更大惩罚"

# rss 为 0
assert bic_score(0, 100, 3) == float("-inf")
`,
        answer: `import numpy as np

def bic_score(rss, n, k):
    if rss <= 0:
        return float("-inf")
    log_lik = -n / 2 * np.log(rss / n)
    return k * np.log(n) - 2 * log_lik
`,
        explanation:
          '**BIC 是 MDL 的实用近似**——不需要真正做编码，只需算 RSS 和参数个数。\n\n**惩罚项 `k·ln(n)` 的来历**：每个参数约需 `log₂(n)/2` 比特编码，k 个参数共 `k·log₂(n)/2` 比特，换算成 BIC 的尺度（乘 2ln2）就是 `k·ln(n)`。\n\n**注意 BIC 越小越好**（与 AIC 一致）。有些教材定义相反符号，使用时要注意约定。',
        tags: ['编程', 'BIC'],
      },
      {
        id: 'paper-theory-c1-e8',
        type: 'code',
        difficulty: 4,
        question:
          '用 MDL 选择多项式阶数：select_degree_mdl(x, y, max_degree=6, param_bits=32)。\n\n对每个阶数 d（0 到 max_degree）：\n1. 用 np.polyfit 拟合\n2. 计算残差标准差\n3. 用两部分 MDL 算总长度\n返回总长度最小的阶数。',
        starterCode: `import numpy as np

def select_degree_mdl(x, y, max_degree=6, param_bits=32):
    best_degree = 0
    best_length = float("inf")
    for d in range(max_degree + 1):
        coeffs = np.polyfit(x, y, d)
        pred = np.polyval(coeffs, x)
        residuals = y - pred
        sigma = np.std(residuals)
        ___
        if total < best_length:
            best_length = total
            best_degree = d
    return best_degree
`,
        setupCode: '',
        expectedOutput: '最优阶数',
        tests: `import numpy as np
np.random.seed(42)
x = np.linspace(0, 5, 30)
# 真实是 1 阶
y1 = 2 * x + 1 + np.random.randn(30) * 0.3
assert select_degree_mdl(x, y1) <= 2, f"应选 0-2 阶，实际 {select_degree_mdl(x,y1)}"

# 真实是 2 阶
np.random.seed(7)
y2 = 0.5 * x**2 - x + 2 + np.random.randn(30) * 0.3
d2 = select_degree_mdl(x, y2)
assert 1 <= d2 <= 4, f"应选 1-4 阶，实际 {d2}"

# 纯噪声 -> 应选低阶
np.random.seed(1)
y3 = np.random.randn(30)
assert select_degree_mdl(x, y3) <= 3, "纯噪声应选低阶"
`,
        answer: `import numpy as np

def select_degree_mdl(x, y, max_degree=6, param_bits=32):
    best_degree = 0
    best_length = float("inf")
    n = len(x)
    for d in range(max_degree + 1):
        coeffs = np.polyfit(x, y, d)
        pred = np.polyval(coeffs, x)
        residuals = y - pred
        sigma = max(float(np.std(residuals)), 1e-12)
        L_model = (d + 1) * param_bits
        L_data = n * 0.5 * np.log2(2 * np.pi * np.e * sigma**2)
        total = L_model + L_data
        if total < best_length:
            best_length = total
            best_degree = d
    return best_degree
`,
        explanation:
          '**这是 MDL 做模型选择的完整流程**：\n\n1. 遍历候选模型\n2. 各自计算 L(模型) + L(数据|模型)\n3. 选总长度最小的\n\n**为什么能自动防过拟合**：高阶模型虽然残差小（L_data 小），但参数多（L_model 大），总长度反而增加。\n\n**实践提醒**：`param_bits` 的选择会影响结果。用 32（float32）是常见假设，但如果参数实际用更少比特编码，最优阶数可能更高。',
        tags: ['编程', 'MDL 模型选择'],
      },
      {
        id: 'paper-theory-c1-e9',
        type: 'judge',
        difficulty: 3,
        question: 'AIC 和 BIC 的惩罚项相同，都惩罚 2k（k 为参数个数）。',
        answer: false,
        explanation:
          'AIC 惩罚 2k，BIC 惩罚 k·ln(n)。当 n > 8 时 ln(n) > 2，BIC 惩罚更重，更偏向简单模型。AIC 倾向预测精度，BIC 倾向解释性/真实模型识别。',
        tags: ['AIC vs BIC'],
      },
      {
        id: 'paper-theory-c1-e10',
        type: 'open',
        difficulty: 4,
        question:
          '请解释 MDL 原理：① 核心思想与两部分编码的形式；② 为什么它能自动防止过拟合；③ 与贝叶斯推断的关系；④ 在现代大模型"压缩即智能"假说中的应用。',
        referenceAnswer: `**① 核心思想与两部分编码**

**核心命题**：

> 最好的模型，是能把数据压缩得最短的模型。

**两部分编码形式**：

    L(数据) = L(模型) + L(数据 | 模型)
             ↑              ↑
        模型复杂度惩罚    拟合误差

**直觉**：
- 模型太简单 → L(模型) 小，但拟合差，L(数据|模型) 大
- 模型太复杂 → L(数据|模型) 小，但 L(模型) 大
- **最优在两者平衡点**

**编码长度与概率的关系**：\`L(x) = -log₂P(x)\`
概率越小的事件编码越长——这是整个理论的基石。

---

**② 为什么能自动防过拟合**

**过拟合的本质**：模型把噪声也当成规律学了。

**MDL 的机制**：噪声是不可压缩的。

**具体例子**（5 个点，真实是直线）：

| 模型 | L(模型) | L(数据&#124;模型) | 总计 |
| --- | --- | --- | --- |
| 直线（2 参数） | 64 | 50 | **114** ✓ |
| 四次（5 参数） | 160 | 5 | 165 |

四次多项式**完美拟合**（残差为 0，数据部分只需 5 比特），
但模型描述需要 160 比特，总长度反而更大。

**关键洞察**：
- **真正的规律可压缩**（学会"y=2x+1"后，数据只需描述噪声）
- **噪声不可压缩**（强行拟合噪声会让模型变复杂，但压缩率没提升）

**所以"最短描述"自动等于"学到真规律"。**

---

**③ 与贝叶斯推断的关系**

**贝叶斯公式**：

    P(θ | D) ∝ P(D | θ) · P(θ)

**取负对数**：

    -log P(θ|D) = -log P(D|θ) - log P(θ) + const
                = L(D|θ) + L(θ) + const

**这正好是两部分 MDL 的形式！**

所以：
- **MDL ≈ 贝叶斯推断**（用 MAP 点估计代替积分）
- **L(模型) = -log P(模型)** = 先验的负对数
- **L(数据|模型) = -log P(数据|模型)** = 负对数似然

**区别**：
- 贝叶斯做**完整积分**（考虑所有参数值）
- MDL 两部分编码用**单点估计**（通常 MAP）
- **NML（归一化最大似然）** 才真正逼近贝叶斯积分

---

**④ 在现代大模型中的应用**

**"压缩即智能"假说**：

> 一个能更好压缩数据的模型，就是更理解数据的模型。

**三个证据**：

**a) 语言模型 = 压缩器**

    交叉熵损失 H = -Σ log₂ P(token | context)
    → 这就是"用模型压缩文本"的编码长度

**语言模型越好（困惑度越低）= 压缩率越高。**

**b) Scaling Laws 与压缩率**

模型越大 → 困惑度越低 → 压缩率越高。
这与 MDL 的预测一致：更强的模型找到更深的规律。

**c) 涌现能力 = 压缩的相变**

某些能力在模型规模跨过阈值后突然出现——
可以理解为**压缩率跨过某个临界点后的相变**。

**实践例子**：

| 系统 | 压缩率（bits/char） |
| --- | --- |
| gzip | ~2.9 |
| 早期语言模型 | ~1.5 |
| GPT-4 级别 | ~0.6~0.8 |
| 人类水平 | ~0.5~1.0（估计） |

**Hutter Prize**：奖励能最好压缩 enwik8（100MB 维基百科）的程序。
本质就是**用 MDL 衡量智能**——压缩得越好，说明理解得越深。

---

**⑤ 一个重要的澄清**

**"压缩即智能"不是说"能压缩就是智能"，而是：**

> **好的压缩器必须理解数据的生成机制。**

**反例**：随机数生成器能"压缩"它自己生成的序列（因为知道种子），
但它不理解任何东西。

**正例**：能压缩人类文本的模型，必然学到了语法、语义、常识、推理模式。

**所以 MDL 提供了一个可测量、可优化的智能代理指标**——
这正是它在深度学习时代重新受到关注的原因。`,
        rubric: [
          { point: '两部分编码形式 + 权衡直觉（简单模型/复杂模型两端）', score: 2 },
          { point: '防过拟合机制：噪声不可压缩，最短描述 = 学到真规律', score: 3 },
          { point: '与贝叶斯的关系：L = -logP，两部分 MDL ≈ MAP 估计', score: 2 },
          { point: '压缩即智能：语言模型 = 压缩器，Scaling Laws 对应压缩率', score: 2 },
          { point: '澄清「压缩 ≠ 智能」：好的压缩器必须理解生成机制', score: 1 },
        ],
        keywords: ['两部分编码', '噪声不可压缩', '-logP', 'MAP', '困惑度', 'Hutter Prize'],
        explanation:
          '能指出「噪声不可压缩所以 MDL 自动防过拟合」以及「好的压缩器必须理解生成机制」，就是理解了 MDL 与智能的深层联系。',
        tags: ['综合分析'],
      },
    ],
  },
];
