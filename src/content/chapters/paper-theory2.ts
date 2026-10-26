import type { Chapter } from '../../types';

/* ============================================================
 *  人工智能基础 · 论文导读 · 理论与复杂度
 *  04 Keeping Neural Networks Simple (Hinton & van Camp 1993)
 *
 *  来源：
 *  - 论文：Hinton, G. E. & van Camp, D. (1993)
 *          "Keeping Neural Networks Simple by Minimizing the Description Length of the Weights"
 *  - 参考：Ojhaharsh/30u30 第 04 篇（CC BY-NC-ND 4.0，本地个人使用）
 *  - 本课程为原创导读 + 原创习题
 *
 *  执行说明：纯 numpy，走 Pyodide 浏览器内执行。
 * ============================================================ */

export const paperTheoryChapters2: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c2: MDL 用于神经网络
   * ============================================================ */
  {
    id: 'paper-theory-c2',
    title: '让神经网络变简单：权重的最小描述长度',
    goal: '理解 Hinton 如何把 MDL 用于神经网络、权重噪声与描述长度的关系，掌握"最小描述长度 = 贝叶斯推断"的深度学习实现。',
    lessons: [
      {
        id: 'paper-theory-c2-l1',
        title: '权重噪声如何实现 MDL',
        difficulty: 4,
        content: `
### 学习目标

学完本节，你应该能够：
1. 说明「权重精度=描述长度」，写出 w=μ+σε 与 Hinton 损失 L=L_data-Σlog σ 的两项权衡；
2. 识别 Hinton 损失与变分推断 ELBO 的对应（-Σlog σ ≈ KL 项），说明它与固定 σ 的 L2 权重衰减的本质区别（每权重自选精度）；
3. 用蒙特卡洛采样复现 σ 的 MDL 平衡点：太精确 KL 爆炸、太模糊数据损失爆炸。

### 前置知识

- c1 的两部分 MDL；
- 高斯分布的 KL 散度公式；
- 线性回归的 MSE 损失。

### 问题背景

float32 权重每个 32 比特——描述长度固定就没法优化。Hinton 的洞察：权重的「精度」决定描述长度。把权重变成分布 w = μ + σ·ε，让 σ（模糊度）成为可学习参数，惩罚 -Σlog σ（精确权重的描述代价），数据项自动抵抗过度模糊。这正是变分推断 ELBO 的深度学习雏形——比贝叶斯神经网络流行早 20 年，也是今天权重不确定性、MC Dropout、模型压缩的思想源头。

### 直觉理解

描述一个权重像描述朋友的位置：说「在三楼健身房」（μ±大σ）一句话就够；说「北纬 39.9043°、东经 116.4074°」（σ 小）精确但费字。MDL 总账 = 描述成本 + 定位失误成本：太模糊找不对人（数据损失涨），太精确每句话都像电报码（描述长度涨）——最优精度在中间，且每个权重自己决定。

### 核心概念与原理详解

## 论文信息

| 项目 | 内容 |
| --- | --- |
| **标题** | Keeping Neural Networks Simple by Minimizing the Description Length of the Weights |
| **作者** | Geoffrey E. Hinton, Drew van Camp |
| **发表** | COLT 1993 |
| **一句话贡献** | 给权重加噪声并惩罚噪声量，等价于最小化网络描述长度——这是现代变分推断与贝叶斯神经网络的起点 |

## 核心问题：如何"描述"一个神经网络

第 1 篇讲了 MDL 的两部分编码：

    L(数据) = L(模型) + L(数据|模型)

**对于神经网络**：

| 部分 | 含义 |
| --- | --- |
| **L(模型)** | 描述所有权重需要多少比特 |
| **L(数据|模型)** | 给定权重后，描述数据（即预测误差） |

**问题**：**如何量化"描述权重需要多少比特"？**

一个 float32 权重是 32 比特。6000 万参数就是 **19 亿比特**（240 MB）。
但这样"描述长度"是固定的，无法优化。

**Hinton 的关键洞察**：

> **权重的"精度"决定了描述长度。**
> 如果权重可以是"模糊的"（低精度），描述就短；
> 如果必须"精确"，描述就长。

## 权重噪声 = 精度控制

**做法**：把权重表示为"均值 + 噪声"。

    w = μ + ε,  ε ~ N(0, σ²)

**关键**：**σ 越大，权重越"模糊"，描述越短。**

<WeightNoiseDemo />

**描述长度的计算**（信息论）：

描述一个均值 μ、标准差 σ 的高斯分布中的样本，需要：

    L(w) = -log₂ P(w | μ, σ)
         = 0.5·log₂(2πeσ²) + (w-μ)²/(2σ²·ln2)

**当 w ≈ μ 时**（噪声小）：

    L(w) ≈ 0.5·log₂(2πeσ²)

**所以描述长度直接由 σ 决定**：

| σ | 描述长度（比特/权重） | 含义 |
| --- | --- | --- |
| 0.001 | ~4 | 精确（长描述） |
| 0.01 | ~7 | 较精确 |
| 0.1 | ~10 | 模糊 |
| 1.0 | ~13 | 很模糊（短描述） |

**等等，这看起来反了**——σ 越大描述长度越大？

**修正**：Hinton 的做法不是"描述单个权重"，
而是**描述整个权重分布**。

**正确的理解**：

    权重向量 w 的"描述长度" = 编码 w 所需的比特数

    如果 w 精度高（σ 小）→ 需要更多比特表示具体值
    如果 w 精度低（σ 大）→ 可以用更少的比特

**但关键是**：**低精度会损害性能**（L(数据|模型) 变大）。

**这就是权衡**：

| σ | L(模型) | L(数据|模型) | 总计 |
| --- | --- | --- | --- |
| 很小 | 大（精度高） | 小（拟合好） | 中 |
| **适中** | **中** | **中** | **最小** |
| 很大 | 小（精度低） | 大（拟合差） | 中 |

## 论文的目标函数

**Hinton 的损失函数**：

    L = L_data + λ · L_weights

其中：

    L_data = 预测误差（如交叉熵）
    L_weights = Σ log(σ_i) + 常数     # 描述长度

**注意**：\`L_weights\` 用 **log(σ)** 而非 σ。

**为什么**：

- σ 大 → log(σ) 大 → 惩罚重
- 但 σ 大也意味着"权重模糊"，描述短？

**这里容易混淆。让我重新梳理**：

论文的实际做法是：

    w_i ~ N(μ_i, σ_i²)     # 权重是分布
    训练时从分布采样
    L_weights = Σ log(1/σ_i) = -Σ log(σ_i)

**所以是惩罚 log(1/σ)**：

- σ 小（精确）→ log(1/σ) 大 → **惩罚重**
- σ 大（模糊）→ log(1/σ) 小 → **惩罚轻**

**这符合 MDL**：精确的权重需要更长的描述，所以惩罚更重。

**等等，Hinton 的原文用的是**：

    L = L_data - Σ log(σ_i) + 常数

**即"减去 log(σ)"**。当 σ 大时，-log(σ) 更负（更小），所以鼓励大 σ。

**让我用具体数字验证**：

| σ | -log(σ) | 含义 |
| --- | --- | --- |
| 0.01 | +4.6 | 惩罚大（精确的代价） |
| 0.1 | +2.3 | 惩罚中 |
| 1.0 | 0 | 无惩罚 |
| 10 | -2.3 | 奖励（鼓励模糊） |

**所以 \`-log(σ)\` 越小越好（σ 越大越好）**——这鼓励模糊权重。

**但模糊权重会导致 L_data 变大**。所以最终平衡在中间。

**这就是 MDL 的权衡**。

## 训练流程

    for each batch:
        # 1. 从权重分布采样
        w = μ + σ * randn_like(μ)

        # 2. 前向传播，计算数据损失
        loss_data = cross_entropy(model(x, w), y)

        # 3. 加描述长度惩罚
        loss = loss_data - sum(log(σ))    # 或 + λ * sum(log(1/σ))

        # 4. 反向传播，更新 μ 和 σ
        loss.backward()
        optimizer.step()

**关键**：**每次前向都重新采样权重**——这叫"权重扰动"。

**推理时**：
- 方案 A：用均值 μ（点估计）
- 方案 B：采样多次取平均（贝叶斯集成）

## 与贝叶斯神经网络的关系

**Hinton 的损失函数实际上是变分推断的 ELBO**（证据下界）：

    ELBO = E_q[log P(D|w)] - KL(q(w) || P(w))

**对应关系**：

| Hinton 的项 | 变分推断的项 |
| --- | --- |
| \`L_data\` | \`-E_q[log P(D|w)]\`（负对数似然） |
| \`-Σ log(σ)\` | \`KL(q(w) || P(w))\` 的近似 |

**为什么**：如果先验 P(w) 是标准正态，那么

    KL(N(μ,σ²) || N(0,1)) ≈ -log(σ) + (μ²+σ²)/2 - 0.5

**所以 Hinton 在 1993 年就在做变分推断了**——
比"贝叶斯神经网络"流行早了 20 年。

<VariationalInferenceDemo />

## 与权重衰减的关系

**标准权重衰减（L2）**：

    L = L_data + λ·Σ w_i²

**这相当于**：假设权重先验是 N(0, 1/λ)，且 σ 固定。

**Hinton 的方法**：

    L = L_data - Σ log(σ_i) + λ·Σ μ_i²/(2σ_i²)

**区别**：

| | 权重衰减 | Hinton 的 MDL |
| --- | --- | --- |
| σ | 固定 | **可学习** |
| 惩罚 | μ² | μ²/σ² + log(1/σ) |
| 效果 | 简单 | 自动调整每个权重的精度 |

**关键洞察**：**Hinton 的方法让网络自己决定"哪些权重需要精确、哪些可以模糊"**。

- 重要权重 → σ 小（精确）
- 不重要权重 → σ 大（模糊，接近 0）

**这就是"自动剪枝"的雏形**。

## 现代影响

| 现代技术 | 与本文的关系 |
| --- | --- |
| **变分自编码器（VAE）** | 同样的 ELBO 目标 |
| **贝叶斯神经网络** | 直接继承 |
| **权重不确定性估计** | 用于主动学习、OOD 检测 |
| **网络量化** | σ 大 ≈ 低精度 |
| **彩票假说** | 重要权重 vs 不重要权重 |
| **LoRA / 参数高效微调** | 只更新重要参数 |

**一个直接的现代应用**：**MC Dropout**（Gal & Ghahramani 2016）
证明 Dropout 在推理时也开启，等价于贝叶斯近似——
**这正是 Hinton 权重噪声思想的延续**。

## 一个常被忽略的细节

**Hinton 论文的标题是"Keeping Neural Networks Simple"**——
重点不是"提高准确率"，而是"让网络更简单"。

**为什么简单重要**（1993 年的语境）：

- 当时数据集小（几百到几千样本）
- 网络容易过拟合
- 简单模型泛化更好

**这与今天的语境不同**：
- 今天数据巨大，过拟合不是主要矛盾
- 但"模型压缩""参数效率"又让这个思想回归

**所以这篇论文在今天依然相关**——只是关注点从"防过拟合"变成"提效率"。

## 本节来源

> **来源类型：学术来源**
> - Hinton, G. E. & van Camp, D. *Keeping Neural Networks Simple by Minimizing
>   the Description Length of the Weights*（COLT 1993）
> - Blundell, C. et al. *Weight Uncertainty in Neural Networks*（2015，现代贝叶斯神经网络）
>   arXiv:[1505.05424](https://arxiv.org/abs/1505.05424)
> - Gal, Y. & Ghahramani, Z. *Dropout as a Bayesian Approximation*（2016）
>   arXiv:[1506.02142](https://arxiv.org/abs/1506.02142)
>
> **来源类型：参考资料（CC BY-NC-ND 4.0，本地个人使用）**
> - Ojhaharsh/30u30 第 04 篇（335 行，含 BayesianLinear / MDLNetwork）
>
> **来源类型：原创**
> - 全部导读文字、交互图示、代码示例与习题

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
rng = np.random.default_rng(7)
n, xs = 50, np.linspace(-1, 1, 50)
ys = 2.0 * xs + rng.normal(0, 0.1, n)
def kl_stdnormal(mu, s):                       # KL(N(mu,s^2) || N(0,1)) — Hinton 惩罚项
    return -np.log(s) + (mu**2 + s**2 - 1) / 2
for s in (0.05, 0.1, 0.15, 0.2, 0.3, 0.5, 1.0):
    mc = np.mean([((w*xs - ys)**2).sum() for w in 2.0 + s*rng.normal(size=400)])
    print(f"sigma={s:4.2f}: L_data={mc:7.2f}  KL={kl_stdnormal(2.0, s):5.2f}  总计={mc+kl_stdnormal(2.0, s):7.2f}")\`\`\`

预期输出（实测）：实测：σ=0.05→4.97、0.10→4.41、0.15→4.21（最小）、0.20→4.35、0.30→4.71、0.50→7.13、1.00→19.93——总成本在 σ≈0.15 取得内部最优：精确到 0.05 时 KL 惩罚吃掉收益，模糊到 1.0 时采样噪声毁掉拟合。

**常见错误**：把惩罚符号记反（+log σ 会奖励精确、鼓励过拟合）；训练后推理继续采样却只采一次，预测方差大；所有权重共用一个 σ，失去「重要权重精确、冗余权重模糊」的自动分配。

### 常见误区

1. **加噪声=正则化技巧**——它是描述长度目标的组成部分，σ 是被优化的参数而非超参；
2. **-log σ 在惩罚精确**——分清方向：σ 小（精确）→ -log σ 大 → 惩罚重，鼓励在允许处模糊；
3. **与 L2 等价**——L2 是 σ 固定的特例；σ 可学习=每个权重自选精度（自动剪枝雏形）。

### 知识关联

- **向前**：c1 的两部分 MDL 在此进入神经网络参数层；
- **向后**：变分推断/VAE 的 ELBO、Bayes-by-Backprop、MC Dropout 都是本思想的后代；
- **平行**：模型量化与压缩（低精度 ≈ 大 σ 的工程化）。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 洞察 | 权重精度=描述长度，σ 可学习 |
| 损失 | L_data - Σlog σ ≈ ELBO（KL 项） |
| 实测 | 总成本 σ=0.15 最小（4.21），两端爆炸 |
| 对比 | L2=σ 固定；此处每权重自选精度 |
| 后代 | 贝叶斯神经网络、MC Dropout、模型压缩 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见论文原文：Hinton & van Camp, Keeping Neural Networks Simple by Minimizing the Description Length of the Weights, COLT 1993）
`,
        tips: [
          {
            kind: 'interview',
            text: '「Hinton 如何用 MDL 做正则化」：给权重加噪声 w = μ + ε（ε~N(0,σ²)），惩罚 -log(σ)。σ 大→描述短但拟合差，σ 小→描述长但拟合好，训练自动找平衡。',
          },
          {
            kind: 'leak',
            text: '「这其实是变分推断」：L = L_data - Σlog(σ) 就是 ELBO 的负值。Hinton 在 1993 年就在做变分推断，比贝叶斯神经网络流行早 20 年。',
          },
          {
            kind: 'pitfall',
            text: 'σ 可学习意味着网络自己决定"哪些权重需要精确"——重要权重 σ 小，不重要权重 σ 大（接近 0）。这是自动剪枝的雏形。',
          },
        ],
        demos: [
          {
            title: 'MDL 网络：权重噪声与描述长度',
            lang: 'python',
            code: `import numpy as np

class MDLLayer:
    """
    带 MDL 正则化的线性层。

    权重表示为分布：w ~ N(mu, sigma^2)
    损失 = 数据损失 - sum(log(sigma))
    """
    def __init__(self, in_dim, out_dim, seed=0):
        rng = np.random.default_rng(seed)
        # 可学习参数：均值和 log(sigma)
        self.mu = rng.normal(0, 0.1, (in_dim, out_dim))
        self.log_sigma = np.full((in_dim, out_dim), -3.0)   # sigma ≈ 0.05
        self.rng = rng

    @property
    def sigma(self):
        return np.exp(self.log_sigma)

    def sample_weights(self):
        """从权重分布采样。"""
        eps = self.rng.normal(0, 1, self.mu.shape)
        return self.mu + self.sigma * eps

    def description_length(self):
        """
        权重的描述长度（比特）。

        L = -sum(log2(sigma)) + 常数
        sigma 越小 -> 需要越精确 -> 描述越长
        """
        return -np.sum(np.log2(self.sigma + 1e-10))

    def forward(self, x, sample=True):
        w = self.sample_weights() if sample else self.mu
        return x @ w


print("=== 描述长度与 sigma 的关系 ===")
print()
print(f"{'sigma':>8} | {'每权重比特':>12} | {'说明'}")
print("-" * 46)
for sigma in [0.001, 0.01, 0.05, 0.1, 0.5, 1.0]:
    bits = -np.log2(sigma)
    note = "极精确" if sigma < 0.01 else "精确" if sigma < 0.1 else "模糊" if sigma < 0.5 else "很模糊"
    print(f"{sigma:>8.3f} | {bits:>12.2f} | {note}")

print()
print("=== 训练中的权衡 ===")
print()
print("总损失 = 数据损失 + 描述长度惩罚")
print("       = L_data     - lambda * sum(log(sigma))")
print()
print("sigma 小 -> 描述长度大（惩罚重），但拟合好（L_data 小）")
print("sigma 大 -> 描述长度小（惩罚轻），但拟合差（L_data 大）")
print()

# 模拟训练过程
np.random.seed(0)
layer = MDLLayer(10, 5)

# 假数据：y = x @ W_true
W_true = np.random.randn(10, 5) * 0.5
X = np.random.randn(100, 10)
Y = X @ W_true

print("=== 模拟训练（简化版：只有梯度下降 mu）===")
lr = 0.05
for epoch in range(1, 201):
    # 采样权重
    W = layer.sample_weights()

    # 前向 + 损失
    pred = X @ W
    loss_data = np.mean((pred - Y) ** 2)

    # 描述长度
    dl = layer.description_length()
    total = loss_data + 0.001 * dl

    # 简化：只用梯度下降更新 mu（实际应更新 log_sigma）
    grad_mu = 2 * X.T @ (pred - Y) / len(X)
    layer.mu -= lr * grad_mu

    if epoch % 50 == 0:
        print(f"  epoch {epoch:3d}: L_data={loss_data:.4f}, 描述长度={dl:.1f} 比特, 总计={total:.4f}")

print()
print(f"最终描述长度: {layer.description_length():.1f} 比特")
print(f"参数总数: {layer.mu.size}")
print(f"平均每权重: {layer.description_length()/layer.mu.size:.2f} 比特")
print()
print("对比 float32 的固定 32 比特/权重：")
print(f"  MDL 节省: {(1 - layer.description_length()/layer.mu.size/32)*100:.1f}%")`,
          },
          {
            title: '变分推断视角：ELBO 的推导',
            lang: 'python',
            code: `import numpy as np

print("=== 从 Hinton 的损失到变分推断 ===")
print()
print("Hinton (1993):")
print("  L = L_data - sum(log(sigma))")
print()
print("变分推断 (ELBO):")
print("  ELBO = E_q[log P(D|w)] - KL(q(w) || P(w))")
print("  负 ELBO = -E_q[log P(D|w)] + KL(q||P)")
print()
print("对应关系：")
print("  -E_q[log P(D|w)]  <->  L_data（负对数似然）")
print("  KL(q||P)          <->  -sum(log(sigma)) + 常数")
print()

def kl_gaussian_to_standard(mu, sigma):
    """
    KL(N(mu, sigma^2) || N(0, 1)) 的解析解。
    """
    return 0.5 * (mu**2 + sigma**2 - 1 - 2*np.log(sigma + 1e-10))

print("=== 验证 KL 与 -log(sigma) 的近似关系 ===")
print()
print(f"{'mu':>6} | {'sigma':>7} | {'KL 精确值':>11} | {'-log(sigma)':>12} | {'差异':>8}")
print("-" * 58)
for mu in [0.0, 0.5, 1.0]:
    for sigma in [0.1, 0.3, 0.5]:
        kl = kl_gaussian_to_standard(mu, sigma)
        neg_log_s = -np.log(sigma)
        print(f"{mu:>6.1f} | {sigma:>7.2f} | {kl:>11.4f} | {neg_log_s:>12.4f} | {kl-neg_log_s:>8.4f}")

print()
print("观察：")
print("  当 mu ≈ 0 且 sigma 不太大时，KL ≈ -log(sigma) + 常数")
print("  所以 Hinton 的惩罚项就是 KL 散度的近似！")
print()

print("=== 完整 ELBO 计算 ===")
print()

def elbo(mu, sigma, X, Y, n_samples=10, seed=0):
    """计算 ELBO（用蒙特卡洛采样估计）。"""
    rng = np.random.default_rng(seed)
    n, d = X.shape
    out_dim = Y.shape[1]

    # E_q[log P(D|w)]：采样估计
    log_lik_sum = 0
    for _ in range(n_samples):
        W = mu + sigma * rng.normal(0, 1, mu.shape)
        pred = X @ W
        # 高斯似然，方差为 1
        log_lik = -0.5 * np.sum((Y - pred)**2) - 0.5 * n * out_dim * np.log(2*np.pi)
        log_lik_sum += log_lik
    expected_log_lik = log_lik_sum / n_samples

    # KL 项
    kl = np.sum(kl_gaussian_to_standard(mu, sigma))

    return expected_log_lik - kl

# 简单测试
np.random.seed(1)
mu = np.random.randn(5, 3) * 0.1
sigma = np.full((5, 3), 0.1)
X = np.random.randn(50, 5)
Y = X @ (np.random.randn(5, 3) * 0.5)

e = elbo(mu, sigma, X, Y)
print(f"ELBO = {e:.2f}")
print()
print("训练目标：最大化 ELBO")
print("  = 最大化拟合（第一项） - 最小化复杂度（第二项）")
print()
print("这与 Hinton 的'最小化描述长度'完全一致：")
print("  MDL: L = L_data + L_weights  (最小化)")
print("  VI:  负ELBO = -E[logP] + KL  (最小化)")
print()
print("所以：最小描述长度 = 最大证据下界 = 变分推断")`,
          },
          {
            title: 'σ 可学习：自动发现重要权重',
            lang: 'python',
            code: `import numpy as np
import matplotlib.pyplot as plt

print("=== sigma 可学习意味着什么 ===")
print()
print("如果让网络自己学 sigma：")
print("  · 重要权重 -> sigma 小（精确，不能模糊）")
print("  · 不重要权重 -> sigma 大（模糊，接近 0 也没关系）")
print()

# 模拟：假设有 20 个权重，只有 5 个重要
np.random.seed(42)
n_weights = 20
true_importance = np.array([1.0]*5 + [0.05]*15)   # 前 5 个重要

print("=== 训练前后的 sigma 分布 ===")
print()
print(f"{'权重':>4} | {'真实重要性':>10} | {'初始 sigma':>10} | {'训练后 sigma':>12}")
print("-" * 52)

# 初始：所有 sigma 相同
sigma_init = np.full(n_weights, 0.5)

# 训练后：重要权重 sigma 小，不重要的大
sigma_trained = np.where(true_importance > 0.5, 0.01, 2.0)

for i in range(n_weights):
    if i < 8 or i >= 18:
        print(f"{i:>4} | {true_importance[i]:>10.2f} | {sigma_init[i]:>10.2f} | {sigma_trained[i]:>12.2f}")
    elif i == 8:
        print(f"  ... (省略中间 {n_weights-10} 个)")

print()
print("=== 描述长度对比 ===")
dl_init = -np.sum(np.log2(sigma_init))
dl_trained = -np.sum(np.log2(sigma_trained))
print(f"训练前: {dl_init:.1f} 比特")
print(f"训练后: {dl_trained:.1f} 比特")
print()
print("注意：训练后描述长度反而可能变大（重要权重更精确了）")
print("但 L_data 会显著下降，总体损失更小。")

print()
print("=== 权重幅度的分布 ===")
# 重要权重大，不重要权重接近 0
w_important = np.random.randn(5) * 0.8
w_unimportant = np.random.randn(15) * 0.01
all_w = np.concatenate([w_important, w_unimportant])

print(f"重要权重的 |w| 均值:   {np.abs(w_important).mean():.3f}")
print(f"不重要权重的 |w| 均值: {np.abs(w_unimportant).mean():.3f}")
print()
print("关键洞察：")
print("  sigma 大的权重，其 mu 会趋向 0（因为模糊的权重必须小才不伤害性能）")
print("  -> 这自动实现了'剪枝'：不重要权重趋于 0")

print()
print("=== 与现代技术的关系 ===")
print()
relations = [
    ("网络量化", "sigma 大 ≈ 低精度 ≈ 少比特"),
    ("彩票假说", "重要权重 vs 不重要权重的区分"),
    ("LoRA", "只更新重要的低秩方向"),
    ("MC Dropout", "推理时开 dropout ≈ 贝叶斯近似"),
    ("模型剪枝", "sigma 大 + mu≈0 的权重可删除"),
]
for name, rel in relations:
    print(f"  {name:12} -> {rel}")

# 可视化
fig, axes = plt.subplots(1, 2, figsize=(12, 4))

axes[0].bar(range(n_weights), sigma_trained, color=['#22c55e' if i < 5 else '#94a3b8' for i in range(n_weights)])
axes[0].set_xlabel('Weight index'); axes[0].set_ylabel('Learned sigma')
axes[0].set_title('Learned sigma: important weights get small sigma')
axes[0].set_yscale('log'); axes[0].grid(alpha=0.3, axis='y')

axes[1].bar(range(n_weights), np.abs(all_w), color=['#22c55e' if i < 5 else '#94a3b8' for i in range(n_weights)])
axes[1].set_xlabel('Weight index'); axes[1].set_ylabel('|weight|')
axes[1].set_title('Weight magnitude: unimportant -> near zero')
axes[1].grid(alpha=0.3, axis='y')

plt.tight_layout()
plt.savefig('mdl_sigma.png', dpi=80, bbox_inches='tight')
print()
print("已生成图表 mdl_sigma.png")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'paper-theory-c2-e1',
        relatedLessonId: 'paper-theory-c2-l1',
        type: 'single',
        difficulty: 2,
        question: 'Hinton 如何把 MDL 应用到神经网络？',
        options: [
          { value: 'A', text: '减少网络层数' },
          { value: 'B', text: '把权重表示为分布 w~N(μ,σ²)，惩罚 -log(σ)，让网络自动决定权重精度' },
          { value: 'C', text: '只用 float16 存储' },
          { value: 'D', text: '删除小权重' },
        ],
        answer: 'B',
        explanation:
          '权重是"均值 + 噪声"。σ 大表示权重模糊（描述短但拟合差），σ 小表示精确（描述长但拟合好）。训练自动找平衡，同时发现哪些权重重要（σ 小）。',
        tags: ['核心方法'],
      },
      {
        id: 'paper-theory-c2-e2',
        relatedLessonId: 'paper-theory-c2-l1',
        type: 'judge',
        difficulty: 2,
        question: 'Hinton 的损失函数 L = L_data - Σlog(σ) 实际上就是变分推断中负 ELBO 的形式。',
        answer: true,
        explanation:
          'L_data 对应 -E_q[log P(D|w)]，-Σlog(σ) 对应 KL(q(w)||P(w)) 的近似（先验为标准正态时）。所以 Hinton 在 1993 年就在做变分推断了。',
        tags: ['变分推断'],
      },
      {
        id: 'paper-theory-c2-e3',
        relatedLessonId: 'paper-theory-c2-l1',
        type: 'multiple',
        difficulty: 3,
        question: 'σ 可学习带来的效果包括？（多选）',
        options: [
          { value: 'A', text: '重要权重获得小的 σ（精确），不重要权重获得大的 σ（模糊）' },
          { value: 'B', text: 'σ 大的权重其 μ 会趋向 0，形成自动剪枝' },
          { value: 'C', text: '网络能表达"不确定性"（哪些参数不可靠）' },
          { value: 'D', text: '训练速度显著提升' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 不一定——引入噪声和额外的 σ 参数通常会让训练更慢。A/B/C 是 σ 可学习的核心价值，尤其 C 是贝叶斯神经网络的基础。',
        tags: ['σ 学习'],
      },
      {
        id: 'paper-theory-c2-e4',
        relatedLessonId: 'paper-theory-c2-l1',
        type: 'fill',
        difficulty: 3,
        question:
          'Hinton 方法中，权重的描述长度主要由 ___ 决定：它越小，描述越长（越精确）。',
        blanks: [['σ', 'sigma', '标准差']],
        explanation:
          '描述长度 ≈ -log₂(σ)。σ=0.001 时约 10 比特/权重，σ=0.1 时约 3.3 比特。所以精确的权重需要更长的描述，这符合 MDL 的直觉。',
        tags: ['描述长度'],
      },
      {
        id: 'paper-theory-c2-e5',
        relatedLessonId: 'paper-theory-c2-l1',
        type: 'code',
        difficulty: 2,
        question:
          '计算权重的描述长度：weight_description_length(sigma)。\n\n- sigma: 标准差（标量或数组）\n- 返回 -sum(log₂(σ))，σ 很小时用 1e-10 兜底',
        starterCode: `import numpy as np

def weight_description_length(sigma):
    sigma = np.maximum(np.asarray(sigma, dtype=float), 1e-10)
    return ___
`,
        setupCode: '',
        expectedOutput: '描述长度',
        tests: `import numpy as np
# 单个权重
assert abs(weight_description_length(0.5) - 1.0) < 1e-9
assert abs(weight_description_length(0.25) - 2.0) < 1e-9
# sigma 越小，描述越长
assert weight_description_length(0.01) > weight_description_length(0.5)
# 数组
s = np.array([0.5, 0.25])
assert abs(weight_description_length(s) - 3.0) < 1e-9
# 零值兜底
assert np.isfinite(weight_description_length(0.0))
`,
        answer: `import numpy as np

def weight_description_length(sigma):
    sigma = np.maximum(np.asarray(sigma, dtype=float), 1e-10)
    return -np.sum(np.log2(sigma))
`,
        explanation:
          '**这是 Hinton 方法的核心计算**：描述长度 = -log₂(σ)。\n\n**注意 `np.maximum(..., 1e-10)`**：σ=0 会导致 log(0)=-inf，需要兜底。\n\n**为什么是 -log 而非 log**：\n- σ 小（精确）→ -log(σ) 大 → 惩罚重\n- σ 大（模糊）→ -log(σ) 小 → 惩罚轻\n\n这符合 MDL：精确的东西需要更长的描述。',
        tags: ['编程', '描述长度'],
      },
      {
        id: 'paper-theory-c2-e6',
        relatedLessonId: 'paper-theory-c2-l1',
        type: 'code',
        difficulty: 3,
        question:
          '实现权重采样：sample_weights(mu, log_sigma, seed=None)。\n\n重参数化技巧：w = μ + σ·ε，其中 ε~N(0,1)，σ=exp(log_sigma)。',
        starterCode: `import numpy as np

def sample_weights(mu, log_sigma, seed=None):
    rng = np.random.default_rng(seed)
    mu = np.asarray(mu, dtype=float)
    sigma = ___
    eps = ___
    return ___
`,
        setupCode: '',
        expectedOutput: '权重采样',
        tests: `import numpy as np
mu = np.zeros((3, 4))
log_sigma = np.full((3, 4), np.log(0.1))

w = sample_weights(mu, log_sigma, seed=42)
assert w.shape == (3, 4)
# 均值约 0
assert abs(w.mean()) < 0.1
# 标准差约 0.1
assert abs(w.std() - 0.1) < 0.05, f"标准差应约 0.1，实际 {w.std()}"

# 相同 seed 结果相同
w2 = sample_weights(mu, log_sigma, seed=42)
assert np.allclose(w, w2)

# 不同 mu
mu2 = np.full((3, 4), 5.0)
w3 = sample_weights(mu2, log_sigma, seed=1)
assert abs(w3.mean() - 5.0) < 0.1
`,
        answer: `import numpy as np

def sample_weights(mu, log_sigma, seed=None):
    rng = np.random.default_rng(seed)
    mu = np.asarray(mu, dtype=float)
    sigma = np.exp(np.asarray(log_sigma, dtype=float))
    eps = rng.normal(0, 1, mu.shape)
    return mu + sigma * eps
`,
        explanation:
          '**重参数化技巧（reparameterization trick）**：\n\n    w = μ + σ·ε,  ε ~ N(0,1)\n\n**为什么重要**：把随机性从 `w ~ N(μ,σ²)` 转移到 `ε`。\n\n- 采样过程可导（对 μ 和 σ）\n- 梯度可以通过 ε 回传\n\n**这是 VAE 的核心技术**（Kingma & Welling 2013），但 Hinton 在 1993 年就用了这个思想。\n\n**用 log_sigma 而非 sigma**：保证 σ > 0（exp 恒正），且数值更稳定。',
        tags: ['编程', '重参数化'],
      },
      {
        id: 'paper-theory-c2-e7',
        relatedLessonId: 'paper-theory-c2-l1',
        type: 'code',
        difficulty: 3,
        question:
          '计算 KL 散度：kl_to_standard_normal(mu, sigma)。\n\nKL(N(μ,σ²) || N(0,1)) = 0.5·(μ² + σ² - 1 - 2·ln(σ))',
        starterCode: `import numpy as np

def kl_to_standard_normal(mu, sigma):
    mu = np.asarray(mu, dtype=float)
    sigma = np.maximum(np.asarray(sigma, dtype=float), 1e-10)
    return ___
`,
        setupCode: '',
        expectedOutput: 'KL 散度',
        tests: `import numpy as np
# 标准正态对自身：KL = 0
assert abs(kl_to_standard_normal(0.0, 1.0)) < 1e-9
# mu != 0 增加 KL
assert kl_to_standard_normal(1.0, 1.0) > 0
assert abs(kl_to_standard_normal(1.0, 1.0) - 0.5) < 1e-9
# sigma < 1 增加 KL
assert kl_to_standard_normal(0.0, 0.5) > 0
# sigma > 1 也增加 KL
assert kl_to_standard_normal(0.0, 2.0) > 0
# 数组
k = kl_to_standard_normal(np.array([0.0, 1.0]), np.array([1.0, 1.0]))
assert abs(k - 0.5) < 1e-9
`,
        answer: `import numpy as np

def kl_to_standard_normal(mu, sigma):
    mu = np.asarray(mu, dtype=float)
    sigma = np.maximum(np.asarray(sigma, dtype=float), 1e-10)
    return 0.5 * np.sum(mu**2 + sigma**2 - 1 - 2*np.log(sigma))
`,
        explanation:
          '**这是变分推断的核心公式**。\n\n**三项的含义**：\n- `μ²`：均值偏离 0 的代价\n- `σ² - 1`：方差偏离 1 的代价\n- `-2ln(σ)`：σ 太小（太精确）的代价\n\n**关键**：当 μ=0、σ=1 时 KL=0（完全匹配先验）。\n\n**与 Hinton 的联系**：当 μ≈0 且 σ 适中时，`KL ≈ -2ln(σ)/2 = -ln(σ)`，正是 Hinton 的惩罚项。',
        tags: ['编程', 'KL 散度'],
      },
      {
        id: 'paper-theory-c2-e8',
        relatedLessonId: 'paper-theory-c2-l1',
        type: 'code',
        difficulty: 4,
        question:
          '实现 MDL 损失：mdl_loss(pred, target, mu, log_sigma, lambda_reg=0.001)。\n\n- 数据损失：均方误差\n- 描述长度：-sum(log₂(exp(log_sigma)))\n- 总损失 = L_data + lambda_reg * L_weights',
        starterCode: `import numpy as np

def mdl_loss(pred, target, mu, log_sigma, lambda_reg=0.001):
    L_data = ___
    sigma = ___
    L_weights = ___
    return L_data + lambda_reg * L_weights
`,
        setupCode: '',
        expectedOutput: 'MDL 损失',
        tests: `import numpy as np
pred = np.array([[1.0, 2.0]])
target = np.array([[1.0, 2.0]])
mu = np.zeros((2, 2))
log_sigma = np.zeros((2, 2))   # sigma = 1

# 完美预测，L_data = 0
loss = mdl_loss(pred, target, mu, log_sigma, lambda_reg=0.0)
assert abs(loss) < 1e-9

# 有误差
pred2 = np.array([[2.0, 4.0]])
loss2 = mdl_loss(pred2, target, mu, log_sigma, lambda_reg=0.0)
assert loss2 > 0

# 描述长度惩罚生效（sigma<1 时）
log_sigma_small = np.full((2, 2), -3.0)   # sigma=0.05
loss3 = mdl_loss(pred, target, mu, log_sigma_small, lambda_reg=0.1)
assert loss3 > 0, "sigma 小时应有描述长度惩罚"

# lambda 越大惩罚越重
loss4 = mdl_loss(pred2, target, mu, log_sigma_small, lambda_reg=1.0)
loss5 = mdl_loss(pred2, target, mu, log_sigma_small, lambda_reg=0.01)
assert loss4 > loss5
`,
        answer: `import numpy as np

def mdl_loss(pred, target, mu, log_sigma, lambda_reg=0.001):
    L_data = np.mean((np.asarray(pred) - np.asarray(target))**2)
    sigma = np.exp(np.asarray(log_sigma, dtype=float))
    L_weights = -np.sum(np.log2(np.maximum(sigma, 1e-10)))
    return L_data + lambda_reg * L_weights
`,
        explanation:
          '**这是完整的 MDL 目标函数**。\n\n**两部分**：\n- `L_data`：拟合误差（MSE）\n- `L_weights`：描述长度（-log₂σ 求和）\n\n**λ 的作用**：控制正则化强度。\n- λ=0：无正则（纯拟合）\n- λ 大：强正则（倾向模糊权重）\n\n**实践注意**：λ 的量级取决于数据量和参数量的比例。数据多时 λ 可以小，参数多时 λ 要大。',
        tags: ['编程', 'MDL 损失'],
      },
      {
        id: 'paper-theory-c2-e9',
        relatedLessonId: 'paper-theory-c2-l1',
        type: 'judge',
        difficulty: 4,
        question: 'Hinton 这篇论文的主要目标是提高神经网络的准确率。',
        answer: false,
        explanation:
          '标题是"Keeping Neural Networks Simple"——重点是让网络更简单，而非更准。1993 年数据集小，过拟合严重，简单模型泛化更好。今天这个思想在模型压缩、参数效率等场景重新受关注。',
        tags: ['论文目标'],
      },
      {
        id: 'paper-theory-c2-e10',
        relatedLessonId: 'paper-theory-c2-l1',
        type: 'open',
        difficulty: 4,
        question:
          '请解释：① Hinton 如何用权重噪声实现 MDL；② 为什么 σ 可学习等价于"自动剪枝"；③ 这个损失函数与变分推断的关系；④ 这个 1993 年的思想在今天有哪些应用。',
        referenceAnswer: `**① 如何用权重噪声实现 MDL**

**核心做法**：把权重表示为分布。

    w = μ + σ·ε,  ε ~ N(0, 1)

**损失函数**：

    L = L_data - Σ log(σ)

**两项的权衡**：

| σ | 描述长度 | 拟合能力 | 总损失 |
| --- | --- | --- | --- |
| 很小 | 大（精确） | 好 | 中 |
| **适中** | **中** | **中** | **最小** |
| 很大 | 小（模糊） | 差 | 中 |

**为什么这符合 MDL**：

- σ 小 → 权重精确 → 需要更多比特描述 → L(模型) 大
- σ 大 → 权重模糊 → 需要更少比特 → L(模型) 小
- 但 σ 大 → 拟合差 → L(数据|模型) 大

**MDL 的两部分编码在这里具体化了**：

    L(模型)   = -Σ log(σ)        # 权重的描述长度
    L(数据|模型) = L_data          # 给定权重后的预测误差

---

**② 为什么 σ 可学习等价于"自动剪枝"**

**训练后会发生什么**：

| 权重类型 | 学到的 σ | 学到的 μ | 效果 |
| --- | --- | --- | --- |
| **重要** | 小（精确） | 大 | 必须精确表示 |
| **不重要** | 大（模糊） | **趋向 0** | 接近删除 |

**为什么 μ 会趋向 0**：

如果 σ 很大（权重模糊），那么 μ 必须是小的——
否则每次采样得到的权重都在 μ 附近大幅波动，
会造成很大的预测误差。

**所以"σ 大 + μ≈0"的权重 = 可以删除的权重**。

**这就是自动剪枝**：

    prune_mask = (sigma > threshold) & (|mu| < threshold)
    # 这些权重可以直接置 0

**与彩票假说的联系**：
彩票假说认为大网络中存在"中奖彩票"（重要子网络）。
Hinton 的方法让网络**自己识别**哪些权重重要。

---

**③ 与变分推断的关系**

**变分推断的目标**：最大化 ELBO。

    ELBO = E_q[log P(D|w)] - KL(q(w) || P(w))

**负 ELBO**（要最小化的）：

    -ELBO = -E_q[log P(D|w)] + KL(q(w) || P(w))

**对应关系**：

| Hinton 的项 | 变分推断的项 | 说明 |
| --- | --- | --- |
| \`L_data\` | \`-E_q[log P(D\|w)]\` | 负对数似然 |
| \`-Σ log(σ)\` | \`KL(N(μ,σ²) \|\| N(0,1))\` 的近似 | 复杂度惩罚 |

**验证 KL 的近似**：

    KL(N(μ,σ²) || N(0,1)) = 0.5(μ² + σ² - 1 - 2ln σ)

当 μ≈0、σ 不太大时：

    KL ≈ 0.5(-2ln σ) = -ln σ

**这正是 Hinton 的惩罚项**（差一个常数倍，可被 λ 吸收）。

**历史意义**：

    1993  Hinton & van Camp：权重噪声 + MDL
    2013  Kingma & Welling：VAE（重参数化 + ELBO）
    2015  Blundell et al.：Bayes by Backprop（现代贝叶斯神经网络）
    2016  Gal & Ghahramani：MC Dropout（dropout = 贝叶斯近似）

**Hinton 早了 20 年。**

---

**④ 今天的应用**

**a) 贝叶斯神经网络（BNN）**

用权重分布表示不确定性：

    # 预测时采样多次
    preds = [model(x, sample_weights=True) for _ in range(100)]
    mean = np.mean(preds)
    uncertainty = np.std(preds)

**用途**：
- 医疗/自动驾驶：知道"我不确定"
- 主动学习：优先标注高不确定样本
- OOD 检测：分布外输入不确定性高

**b) MC Dropout**

Gal & Ghahramani 证明：**推理时也开启 Dropout = 贝叶斯近似**。

    model.train()   # 保持 dropout 开启（而非 eval）
    preds = [model(x) for _ in range(50)]
    uncertainty = np.std(preds, axis=0)

**这是 Hinton 权重噪声思想最直接的现代应用**——成本极低。

**c) 模型量化**

σ 大 ≈ 低精度。

现代量化方法（INT8、INT4）本质上是"用更少的比特描述权重"。
Hinton 的框架提供了理论解释：**量化误差 ≈ 权重噪声**。

**d) 参数高效微调（LoRA）**

LoRA 假设"微调只需要低秩更新"。
这与"只有少数权重重要"的假设一致。

**联系**：Hinton 用 σ 识别重要权重，LoRA 用低秩结构限制更新空间。
目标相同：**减少有效参数量**。

**e) 模型压缩与剪枝**

现代剪枝方法（Magnitude Pruning、Movement Pruning）
都在做"Hinton 当年做的事"——识别不重要权重。

**f) 不确定性估计**

在 LLM 中，不确定性估计是热点问题：
- 幻觉检测
- 置信度校准
- 拒答机制

贝叶斯方法（包括 MC Dropout）是主要技术路线之一。

---

**⑤ 一个方法论启示**

**Hinton 1993 年的论文只有几页，但包含的思想影响了 30 年**：

| 思想 | 今天的形式 |
| --- | --- |
| 权重是分布 | 贝叶斯神经网络 |
| 权重噪声正则化 | MC Dropout |
| 描述长度惩罚 | 变分推断 / ELBO |
| 自动精度控制 | 量化 / 剪枝 |
| 识别重要参数 | LoRA / 稀疏训练 |

**这告诉我们**：
> 好的理论工作不追求即时效果，而是提供**理解问题的框架**。

MDL 框架让我们能统一理解：
- 为什么正则化有效
- 为什么量化不太损伤性能
- 为什么稀疏网络能工作

**框架的价值远超具体方法。**`,
        rubric: [
          { point: '权重分布 + (-log σ) 惩罚 + 权衡机制', score: 3 },
          { point: 'σ 大 → μ 趋向 0 → 自动剪枝；与彩票假说的联系', score: 2 },
          { point: '与变分推断：L_data ↔ 负对数似然，-Σlog σ ↔ KL 近似', score: 2 },
          { point: '现代应用：BNN、MC Dropout、量化、LoRA、剪枝', score: 2 },
          { point: '方法论启示：框架的价值远超具体方法', score: 1 },
        ],
        keywords: ['权重分布', 'σ 可学习', 'μ 趋 0', 'ELBO', 'MC Dropout', '框架价值'],
        explanation:
          '能指出「σ 大导致 μ 趋 0 从而自动剪枝」以及「Hinton 在 1993 年就在做变分推断」，就是理解了这篇论文的超前性。',
        tags: ['综合分析'],
      },
    ],
  },
];
