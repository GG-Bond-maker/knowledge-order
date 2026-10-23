import type { Chapter } from '../../types';

/* ============================================================
 *  人工智能基础 · 论文导读 · 训练与规模
 *  25 Scaling Laws for Neural Language Models
 *
 *  来源：
 *  - 论文：Kaplan et al. (2020) arXiv:2001.08361
 *  - 参考：Ojhaharsh/30u30 第 25 篇（CC BY-NC-ND 4.0，本地个人使用）
 *  - 本课程为原创导读 + 原创习题
 *
 *  执行说明：本章代码需要 PyTorch，走本地后端执行。
 * ============================================================ */

export const paperTrainingChapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c1: Scaling Laws
   * ============================================================ */
  {
    id: 'paper-training-c1',
    title: 'Scaling Laws：规模是能力的可预测函数',
    goal: '理解幂律关系 L ∝ N^(-α) 的形式与推导，掌握三个规模维度（参数/数据/计算）的权衡，能计算最优分配与 Chinchilla 修正。',
    lessons: [
      {
        id: 'paper-training-c1-l1',
        title: '损失是规模的幂律',
        difficulty: 5,
        content: `
## 论文信息

| 项目 | 内容 |
| --- | --- |
| **标题** | Scaling Laws for Neural Language Models |
| **作者** | Jared Kaplan, Sam McCandlish, Tom Henighan, Tom B. Brown, et al.（OpenAI） |
| **发表** | arXiv 2020 |
| **arXiv** | [2001.08361](https://arxiv.org/abs/2001.08361) |
| **一句话贡献** | 发现语言模型的损失是参数量、数据量、计算量的幂律函数，可精确预测 |

## 一个惊人的发现

**2019-2020 年的问题**：怎么知道"更大的模型"会更好？好多少？

**传统回答**：试试看（训练一个，测一下）。

**Kaplan 等人的发现**：

> **损失是规模的平滑幂律函数。**
> 用小模型的结果可以**外推**到大模型。

**核心公式**：

    L(N) = (N_c / N)^{α_N}      # 只看参数
    L(D) = (D_c / D)^{α_D}      # 只看数据
    L(C) = (C_c / C)^{α_C}      # 只看计算

**实测指数**：

| 维度 | 指数 | 含义 |
| --- | --- | --- |
| **参数量 N** | α_N ≈ 0.076 | 参数增 10 倍，损失降 ~17% |
| **数据量 D** | α_D ≈ 0.095 | 数据增 10 倍，损失降 ~20% |
| **计算量 C** | α_C ≈ 0.050 | 计算增 10 倍，损失降 ~11% |

**关键**：**这些指数是"普适"的**——不同架构、不同数据集都接近。

<ScalingLawDemo />

## 幂律的直观理解

**为什么是幂律**：

    损失 ∝ N^(-α)
    取对数：log L = -α · log N + const

**所以**：**在双对数坐标下是直线**。

**这意味着**：

| N 增加 | L 的下降 |
| --- | --- |
| 10 倍 | ×0.83 |
| 100 倍 | ×0.69 |
| 1000 倍 | ×0.58 |

**每次都要 10 倍才能看到明显进步**——这就是"规模"的代价。

**但也是机会**：
如果投入 10 倍算力能换来可预测的提升，就可以**规划**。

<LogLogDemo />

## 完整公式：三项相加

**实际公式**（论文的核心）：

    L(N, D) = L_∞ + (N_c/N)^{α_N} + (D_c/D)^{α_D}

**三项含义**：

| 项 | 含义 |
| --- | --- |
| **L_∞** | 不可约损失（数据的熵） |
| **(N_c/N)^{α_N}** | 模型容量不足的惩罚 |
| **(D_c/D)^{α_D}** | 数据不足的惩罚 |

**L_∞ 的意义**：

    即使模型无限大、数据无限多，损失也不会到 0
    因为自然语言本身有熵（不可预测的部分）

**实测**：L_∞ ≈ 1.69 nats（约 2.4 bits/token）。

## 三个维度的权衡

**问题**：给定计算预算 C，怎么分配参数量 N 和数据量 D？

**计算量公式**：

    C ≈ 6 · N · D

**为什么是 6**：
- 前向：2ND（每个参数每个 token 一次乘加）
- 反向：4ND（2 倍前向）
- 合计：6ND

**论文的结论**（2020 版）：

    N_opt ∝ C^{0.73}
    D_opt ∝ C^{0.27}

**含义**：**计算增加时，应该主要增加参数，而不是数据**。

<ComputeAllocationDemo />

**具体例子**（论文的推荐）：

| 计算量 | 参数量 | 数据量 |
| --- | --- | --- |
| 1e19 FLOPs | 1e8 | 2e9 tokens |
| 1e21 FLOPs | 1e9 | 2e10 tokens |
| 1e23 FLOPs | 1e10 | 2e11 tokens |

**注意**：参数量增长远快于数据量（0.73 vs 0.27）。

## Chinchilla 修正（2022）

**问题**：Kaplan 的结论是"参数优先"，但这导致模型"训练不足"。

**Chinchilla（Hoffmann et al. 2022）** 重新做了实验：

    N_opt ∝ C^{0.50}
    D_opt ∝ C^{0.50}

**结论**：**参数和数据应该等比例增长**。

**经验法则**：

    D_opt ≈ 20 × N_opt

**即：每个参数配 20 个 token**。

**对比**：

| 模型 | 参数量 | 训练 token | 比例 |
| --- | --- | --- | --- |
| GPT-3 | 175B | 300B | 1.7 |
| **Chinchilla** | **70B** | **1.4T** | **20** |
| LLaMA-1 | 65B | 1.4T | 21 |
| LLaMA-2 | 70B | 2T | 29 |

**Chinchilla 用 1/2.5 的参数达到 GPT-3 的效果**。

**为什么 Kaplan 错了**：

| 原因 | 说明 |
| --- | --- |
| **学习率调度** | Kaplan 用固定步数，Chinchilla 用 cosine decay（更充分） |
| **数据重复** | Kaplan 允许重复数据（低效） |
| **评估方式** | 细节差异导致指数估计偏差 |

**这是一个重要的教训**：**实验设计影响结论**。

<ChinchillaDemo />

## 为什么 Scaling Laws 重要

**① 可预测性**

    训练前就能预测：用 X 算力能得到什么损失
    不用真的训练

**② 指导资源分配**

    知道该买多少 GPU、准备多少数据

**③ 解释了"涌现能力"**

**注意**：涌现能力（emergence）是有争议的。

**一种解释**：损失平滑下降，但**下游任务的指标**可能非线性变化。

**④ 支撑了大模型竞赛**

GPT-3、PaLM、Chinchilla 都是基于 Scaling Laws 规划的。

## 局限与争议

| 局限 | 说明 |
| --- | --- |
| **只预测损失** | 不直接预测下游能力 |
| **有下限** | L_∞ 无法突破（除非换数据） |
| **架构相关** | 换架构指数会变 |
| **数据质量** | 假设数据"够好"，但质量差异很大 |
| **涌现争议** | 下游指标不一定平滑 |

**涌现（Emergence）的争议**：

**Wei et al. (2022)**：某些能力在规模达到阈值后"突然出现"。

**Schaeffer et al. (2023)**：这可能是**度量选择**造成的假象——
用连续指标（如 BLEU）看是平滑的，用准确率看是"突变"。

**结论**：**损失是平滑的，但"能力"的定义可能是离散的**。

## 一个常被忽略的细节

**论文研究了"数据重复"的影响**：

    D_unique = 唯一 token 数
    D_total = 实际训练 token 数（含重复）

**发现**：

    重复少量（<4 次）：损失接近不重复
    重复多次：损失明显变差

**这解释了为什么数据质量比数量更重要**。

**也是 Chinchilla 的关键**：
它假设数据充足，不能靠重复。

## 本节来源

> **来源类型：学术来源**
> - Kaplan, J. et al. *Scaling Laws for Neural Language Models*
>   arXiv:[2001.08361](https://arxiv.org/abs/2001.08361)（2020）
> - Hoffmann, J. et al. *Training Compute-Optimal Large Language Models*
>   arXiv:[2203.15556](https://arxiv.org/abs/2203.15556)（Chinchilla，2022）
> - Wei, J. et al. *Emergent Abilities of Large Language Models*
>   arXiv:[2206.07682](https://arxiv.org/abs/2206.07682)
> - Schaeffer, R. et al. *Are Emergent Abilities of Large Language Models a Mirage?*
>   arXiv:[2304.15004](https://arxiv.org/abs/2304.15004)
>
> **来源类型：参考资料（CC BY-NC-ND 4.0，本地个人使用）**
> - Ojhaharsh/30u30 第 25 篇（299 行，含 MasterFitter / ComputeEconomy）
>
> **来源类型：原创**
> - 全部导读文字、交互图示、代码示例与习题
`,
        tips: [
          {
            kind: 'interview',
            text: '「Scaling Laws 的形式」：L = L_∞ + (N_c/N)^α_N + (D_c/D)^α_D。α_N≈0.076，α_D≈0.095。双对数坐标下是直线，所以可以外推。',
          },
          {
            kind: 'leak',
            text: '「Kaplan vs Chinchilla」：Kaplan 说 N∝C^0.73（参数优先），Chinchilla 修正为 N∝D∝C^0.5（等比例）。经验法则：每参数配 20 token。',
          },
          {
            kind: 'pitfall',
            text: 'Scaling Laws 只预测"损失"，不直接预测下游能力。"涌现能力"可能是度量选择的假象（用连续指标看是平滑的）。',
          },
        ],
        demos: [
          {
            title: 'Scaling Laws 拟合与外推（PyTorch）',
            lang: 'python',
            code: `import numpy as np

# Kaplan 论文的实测参数（近似）
L_INF = 1.69        # 不可约损失
N_C = 8.8e13        # 参数尺度常数
ALPHA_N = 0.076
D_C = 5.4e13        # 数据尺度常数
ALPHA_D = 0.095


def scaling_loss(N, D, L_inf=L_INF, N_c=N_C, alpha_n=ALPHA_N,
                 D_c=D_C, alpha_d=ALPHA_D):
    """
    L(N, D) = L_inf + (N_c/N)^alpha_n + (D_c/D)^alpha_d
    """
    return L_inf + (N_c / N) ** alpha_n + (D_c / D) ** alpha_d


print("=== 固定数据量，改变参数量 ===")
print()
D_fixed = 3e11     # 300B tokens（GPT-3 的规模）
print(f"数据量固定为 {D_fixed:.0e} tokens")
print()
print(f"{'参数量':>12} | {'损失':>8} | {'相对降低':>10}")
print("-" * 38)

base_loss = None
for N in [1e7, 1e8, 1e9, 1e10, 1e11, 1e12]:
    L = scaling_loss(N, D_fixed)
    if base_loss is None:
        base_loss = L
    print(f"{N:>12.0e} | {L:>8.4f} | {(1 - L/base_loss)*100:>9.1f}%")

print()
print("=== 固定参数量，改变数据量 ===")
print()
N_fixed = 1.75e11    # GPT-3 规模
print(f"参数量固定为 {N_fixed:.2e}")
print()
print(f"{'数据量':>12} | {'损失':>8}")
print("-" * 26)
for D in [1e9, 1e10, 1e11, 3e11, 1e12, 1e13]:
    print(f"{D:>12.0e} | {scaling_loss(N_fixed, D):>8.4f}")

print()
print("=== 关键：双对数坐标下是直线 ===")
print()
print(f"{'N':>10} | {'log10(N)':>9} | {'L':>8} | {'log10(L-L_inf)':>15}")
print("-" * 50)
for N in [1e7, 1e8, 1e9, 1e10, 1e11]:
    L = scaling_loss(N, 1e13)    # 数据充足
    excess = L - L_INF
    print(f"{N:>10.0e} | {np.log10(N):>9.2f} | {L:>8.4f} | {np.log10(excess):>15.3f}")

print()
print("观察：log10(L - L_inf) 与 log10(N) 成线性关系")
print("斜率 = -alpha_n = -0.076")

print()
print("=== 从幂律指数反推：需要多少倍才降一半？ ===")
print()
for name, alpha in [("参数量", ALPHA_N), ("数据量", ALPHA_D)]:
    # (N_c/N)^alpha = 0.5 * 初始值 -> N 需要增加 2^(1/alpha) 倍
    factor = 2 ** (1 / alpha)
    print(f"{name}（alpha={alpha}）: 需要增加 {factor:.1f} 倍才能让'超额损失'减半")

print()
print("=== 计算量视角 ===")
print()
print("C ≈ 6 * N * D")
print()
print(f"{'C (FLOPs)':>12} | {'N (Kaplan)':>12} | {'D (Kaplan)':>12} | {'D/N':>8}")
print("-" * 56)
for C in [1e19, 1e20, 1e21, 1e22, 1e23, 1e24]:
    # Kaplan: N ∝ C^0.73, D ∝ C^0.27
    N_opt = 0.5 * (C / 1e19) ** 0.73 * 1e8
    D_opt = C / (6 * N_opt)
    print(f"{C:>12.0e} | {N_opt:>12.2e} | {D_opt:>12.2e} | {D_opt/N_opt:>8.1f}")`,
          },
          {
            title: 'Kaplan vs Chinchilla：最优分配对比',
            lang: 'python',
            code: `import numpy as np

L_INF = 1.69
N_C = 8.8e13
ALPHA_N = 0.076
D_C = 5.4e13
ALPHA_D = 0.095


def loss(N, D):
    return L_INF + (N_C/N)**ALPHA_N + (D_C/D)**ALPHA_D


def optimal_kaplan(C):
    """Kaplan 的分配：N ∝ C^0.73, D ∝ C^0.27"""
    # 用 C = 6ND 约束求解
    # 简化：用论文的经验比例
    N = 0.5 * (C / 1e19) ** 0.73 * 1e8
    D = C / (6 * N)
    return N, D


def optimal_chinchilla(C):
    """Chinchilla 的分配：N ∝ D ∝ C^0.5"""
    # D = 20 * N, C = 6ND = 120 N^2
    N = np.sqrt(C / 120)
    D = 20 * N
    return N, D


print("=== 同等计算量下的两种分配 ===")
print()
print(f"{'C (FLOPs)':>12} | {'方法':>10} | {'N':>10} | {'D':>12} | {'损失':>8}")
print("-" * 66)

for C in [1e20, 1e21, 1e22, 1e23]:
    for name, fn in [("Kaplan", optimal_kaplan), ("Chinchilla", optimal_chinchilla)]:
        N, D = fn(C)
        L = loss(N, D)
        print(f"{C:>12.0e} | {name:>10} | {N:>10.2e} | {D:>12.2e} | {L:>8.4f}")
    print()

print("=== 关键差异 ===")
print()
print("Kaplan:     参数多、数据少 -> 模型'训练不足'")
print("Chinchilla: 参数与数据等比例 -> 更充分的训练")
print()

print("=== 具体案例：GPT-3 vs Chinchilla ===")
print()
print(f"{'模型':>14} | {'N':>8} | {'D':>10} | {'D/N':>6} | {'损失':>8}")
print("-" * 56)

cases = [
    ("GPT-3 175B", 1.75e11, 3e11),
    ("Chinchilla 70B", 7e10, 1.4e12),
    ("LLaMA-1 65B", 6.5e10, 1.4e12),
    ("LLaMA-2 70B", 7e10, 2e12),
]
for name, N, D in cases:
    L = loss(N, D)
    print(f"{name:>14} | {N:>8.1e} | {D:>10.1e} | {D/N:>6.1f} | {L:>8.4f}")

print()
print("Chinchilla（70B）用 1/2.5 的参数达到 GPT-3 的效果")
print("因为它的 D/N = 20，而 GPT-3 只有 1.7")

print()
print("=== 为什么 Kaplan 估计错了 ===")
print()
reasons = [
    ("学习率调度", "Kaplan 用固定步数，未充分衰减"),
    ("数据重复", "Kaplan 允许重复数据（低效）"),
    ("评估细节", "最后一步 vs 最优步的选择"),
    ("拟合方法", "不同模型规模的权重分配"),
]
for name, desc in reasons:
    print(f"  {name:>10}: {desc}")

print()
print("教训：实验设计细节会显著影响 Scaling Laws 的指数估计")

print()
print("=== 实用建议（Chinchilla 之后）===")
print()
print("1. 参数与数据等比例增长")
print("2. 每个参数配 20 个 token")
print("3. 用 cosine learning rate decay")
print("4. 数据质量 > 数据数量（不能靠重复）")
print("5. 先在小规模验证 scaling，再外推")`,
          },
          {
            title: '涌现能力的争议：平滑 vs 突变',
            lang: 'python',
            code: `import numpy as np
import matplotlib.pyplot as plt

print("=== 涌现能力争议的核心 ===")
print()
print("问题：大模型的能力是平滑提升，还是突然出现？")
print()

# 模拟：真实能力（连续）vs 任务准确率（离散）
scales = np.logspace(8, 12, 20)   # 参数量从 1e8 到 1e12

# 假设：每个任务的"能力"是连续增长的
# 准确率 = sigmoid(能力 - 阈值)
def accuracy(scale, threshold, sharpness=2.0):
    ability = 0.5 * np.log10(scale / 1e8)   # 能力随规模线性增长
    return 1 / (1 + np.exp(-sharpness * (ability - threshold)))


print("模拟三个任务：")
print("  · 任务A（阈值低）：小模型就会")
print("  · 任务B（阈值中）：中等模型会")
print("  · 任务C（阈值高）：大模型才会")
print()

thresholds = {'任务A（简单）': 0.3, '任务B（中等）': 1.0, '任务C（困难）': 1.7}

print(f"{'参数量':>10} | " + " | ".join(f"{k:>14}" for k in thresholds))
print("-" * 66)

for s in [1e8, 1e9, 3e9, 1e10, 3e10, 1e11, 3e11, 1e12]:
    row = [f"{s:>10.0e}"]
    for k, th in thresholds.items():
        acc = accuracy(s, th)
        row.append(f"{acc*100:>13.1f}%")
    print(" | ".join(row))

print()
print("=== 两种解释 ===")
print()
print("解释1（涌现派，Wei et al.）：")
print("  准确率在某个规模后'突然'跳升")
print("  例如：任务C 在 1e10 前接近 0，1e11 后接近 100%")
print()
print("解释2（幻象派，Schaeffer et al.）：")
print("  底层能力是平滑的")
print("  '突变'是度量选择（准确率）造成的")
print("  如果用连续指标（如 token 级准确率、log-likelihood），曲线是平滑的")
print()

print("=== 用不同度量看同一模型 ===")
print()
print(f"{'参数量':>10} | {'准确率（离散）':>14} | {'平均对数似然（连续）':>20}")
print("-" * 52)
for s in [1e8, 1e9, 3e9, 1e10, 3e10, 1e11]:
    acc = accuracy(s, 1.7) * 100
    # 连续指标：平滑增长
    ability = 0.5 * np.log10(s / 1e8)
    loglik = -2.0 + 0.4 * ability
    print(f"{s:>10.0e} | {acc:>13.1f}% | {loglik:>19.3f}")

print()
print("关键观察：")
print("  · 准确率：从 0% 跳到 100%（看起来像涌现）")
print("  · 对数似然：平滑线性增长（没有突变）")
print()
print("=== 结论 ===")
print()
print("1. 损失（Scaling Laws 预测的）确实是平滑的")
print("2. 下游'准确率'可能因为阈值效应看起来突变")
print("3. 这不矛盾——是不同的度量方式")
print()
print("对实践的启示：")
print("  · 不要只看准确率，也看连续指标")
print("  · '涌现'可能只是'我们还没找到合适的度量'")

# 可视化
fig, axes = plt.subplots(1, 2, figsize=(12, 4))

for k, th in thresholds.items():
    axes[0].plot(scales, [accuracy(s, th)*100 for s in scales], 'o-', label=k, markersize=3)
axes[0].set_xscale('log')
axes[0].set_xlabel('Parameters')
axes[0].set_ylabel('Accuracy (%)')
axes[0].set_title('Accuracy: looks like emergence')
axes[0].legend(fontsize=8)
axes[0].grid(alpha=0.3)

logliks = [-2.0 + 0.4 * 0.5 * np.log10(s/1e8) for s in scales]
axes[1].plot(scales, logliks, 's-', color='#22c55e', markersize=4)
axes[1].set_xscale('log')
axes[1].set_xlabel('Parameters')
axes[1].set_ylabel('Log-likelihood')
axes[1].set_title('Log-likelihood: smooth')
axes[1].grid(alpha=0.3)

plt.tight_layout()
plt.savefig('emergence.png', dpi=80, bbox_inches='tight')
print()
print("已生成图表 emergence.png")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'paper-training-c1-e1',
        type: 'single',
        difficulty: 2,
        question: 'Scaling Laws 的核心发现是？',
        options: [
          { value: 'A', text: '模型越大越好，没有上限' },
          { value: 'B', text: '损失是参数量/数据量/计算量的幂律函数，可以外推' },
          { value: 'C', text: '数据比参数重要' },
          { value: 'D', text: '训练时间决定一切' },
        ],
        answer: 'B',
        explanation:
          'L = L_∞ + (N_c/N)^α_N + (D_c/D)^α_D。双对数坐标下是直线，所以用小模型的结果可以外推到大模型。α_N≈0.076，α_D≈0.095。',
        tags: ['核心发现'],
      },
      {
        id: 'paper-training-c1-e2',
        type: 'judge',
        difficulty: 2,
        question: 'Chinchilla 的结论是"参数和数据应该等比例增长"，每个参数配约 20 个 token。',
        answer: true,
        explanation:
          'Chinchilla 修正了 Kaplan 的"参数优先"结论：N_opt ∝ D_opt ∝ C^0.5，D_opt ≈ 20·N_opt。这让 70B 的 Chinchilla 达到 175B GPT-3 的效果。',
        tags: ['Chinchilla'],
      },
      {
        id: 'paper-training-c1-e3',
        type: 'multiple',
        difficulty: 3,
        question: 'Scaling Laws 的局限包括？（多选）',
        options: [
          { value: 'A', text: '只预测损失，不直接预测下游任务能力' },
          { value: 'B', text: '有不可约损失下限 L_∞' },
          { value: 'C', text: '架构变化会改变指数' },
          { value: 'D', text: '完全无法用于资源规划' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误——Scaling Laws 最重要的用途就是资源规划（预测需要多少算力）。A/B/C 是真实局限。',
        tags: ['局限性'],
      },
      {
        id: 'paper-training-c1-e4',
        type: 'fill',
        difficulty: 3,
        question:
          '计算量与参数量、数据量的关系约为 C ≈ ___ × N × D。',
        blanks: [['6', '六']],
        explanation:
          '前向 2ND + 反向 4ND = 6ND。这是训练 Transformer 的标准估算公式（每参数每 token 6 次浮点运算）。',
        tags: ['计算量公式'],
      },
      {
        id: 'paper-training-c1-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现 Scaling Law 损失函数：scaling_loss(N, D, L_inf=1.69, N_c=8.8e13, alpha_n=0.076, D_c=5.4e13, alpha_d=0.095)。\n\n返回 L = L_inf + (N_c/N)^alpha_n + (D_c/D)^alpha_d',
        starterCode: `def scaling_loss(N, D, L_inf=1.69, N_c=8.8e13, alpha_n=0.076,
                 D_c=5.4e13, alpha_d=0.095):
    return ___
`,
        setupCode: '',
        expectedOutput: '损失',
        tests: `# 基本计算
L = scaling_loss(1e9, 1e11)
expected = 1.69 + (8.8e13/1e9)**0.076 + (5.4e13/1e11)**0.095
assert abs(L - expected) < 1e-6, f"应为 {expected}，实际 {L}"

# 损失 > L_inf
assert L > 1.69

# 参数增加 -> 损失降低
assert scaling_loss(1e10, 1e11) < scaling_loss(1e9, 1e11)

# 数据增加 -> 损失降低
assert scaling_loss(1e9, 1e12) < scaling_loss(1e9, 1e11)

# 极大模型+极多数据 -> 趋近 L_inf（但幂律衰减很慢）
L_huge = scaling_loss(1e30, 1e40)
assert L_huge < 1.80, f"应接近 L_inf，实际 {L_huge}"
assert L_huge > 1.69, "不应低于 L_inf"

# 单调性：规模越大越接近 L_inf
assert scaling_loss(1e30, 1e40) < scaling_loss(1e20, 1e25) < scaling_loss(1e10, 1e15)
`,
        answer: `def scaling_loss(N, D, L_inf=1.69, N_c=8.8e13, alpha_n=0.076,
                 D_c=5.4e13, alpha_d=0.095):
    return L_inf + (N_c / N) ** alpha_n + (D_c / D) ** alpha_d
`,
        explanation:
          '**三项相加**：\n\n    L_inf          不可约损失（数据熵）\n    (N_c/N)^alpha  模型容量不足的惩罚\n    (D_c/D)^alpha  数据不足的惩罚\n\n**为什么是相加而非相乘**：\n两种限制是"独立"的——参数不足和数据不足各自贡献一部分。\n\n**注意 L_inf ≈ 1.69**：\n即使无限资源，损失也不会到 0。这是自然语言的内在熵。\n\n**单位**：nats/token。1 nat ≈ 1.44 bits，所以 1.69 nats ≈ 2.4 bits/token。',
        tags: ['编程', '损失函数'],
      },
      {
        id: 'paper-training-c1-e6',
        type: 'code',
        difficulty: 3,
        question:
          '计算 Chinchilla 最优分配：chinchilla_optimal(C)。\n\n给定计算量 C（FLOPs），返回 (N_opt, D_opt)。\n\n约束：C = 6ND，D = 20N',
        starterCode: `import numpy as np

def chinchilla_optimal(C):
    # C = 6 * N * D, D = 20 * N
    # C = 6 * N * 20N = 120 N^2
    N = ___
    D = ___
    return N, D
`,
        setupCode: '',
        expectedOutput: '(N_opt, D_opt)',
        tests: `import numpy as np

# C = 1e21
N, D = chinchilla_optimal(1e21)
assert abs(D / N - 20) < 0.01, f"D/N 应为 20，实际 {D/N}"
assert abs(6 * N * D - 1e21) / 1e21 < 1e-6, "应满足 C = 6ND"

# 更大的 C
N2, D2 = chinchilla_optimal(1e23)
assert N2 > N, "C 增大 N 应增大"
assert D2 > D, "C 增大 D 应增大"
# 比例仍是 20
assert abs(D2 / N2 - 20) < 0.01

# 平方根关系
assert abs(N2 / N - np.sqrt(100)) < 1.0, "N 应与 sqrt(C) 成正比"
`,
        answer: `import numpy as np

def chinchilla_optimal(C):
    # C = 6 * N * D, D = 20 * N
    # C = 6 * N * 20N = 120 N^2
    N = np.sqrt(C / 120)
    D = 20 * N
    return N, D
`,
        explanation:
          '**推导**：\n\n    C = 6·N·D\n    D = 20·N        （Chinchilla 的经验法则）\n    => C = 6·N·20·N = 120·N²\n    => N = sqrt(C/120)\n    => D = 20·N\n\n**关键**：N ∝ sqrt(C)，即 C 增加 100 倍，N 和 D 各增加 10 倍。\n\n**对比 Kaplan**：\n\n    Kaplan:     N ∝ C^0.73, D ∝ C^0.27（参数优先）\n    Chinchilla: N ∝ C^0.50, D ∝ C^0.50（等比例）\n\n**实例**：\n\n    C = 1e21 -> N ≈ 2.9e9（29 亿参数），D ≈ 5.8e10（580 亿 token）\n\n这个规模对应一个小型但充分训练的模型。',
        tags: ['编程', '最优分配'],
      },
      {
        id: 'paper-training-c1-e7',
        type: 'code',
        difficulty: 3,
        question:
          '计算"要让超额损失减半需要多少倍规模"：halving_factor(alpha)。\n\n超额损失 = (N_c/N)^alpha。要让这个值减半，N 需要增加多少倍？\n\n提示：解 (N_c/(k·N))^alpha = 0.5 · (N_c/N)^alpha',
        starterCode: `def halving_factor(alpha):
    return ___
`,
        setupCode: '',
        expectedOutput: '倍数',
        tests: `# alpha=0.076 -> 需要约 9100 倍
f = halving_factor(0.076)
assert abs(f - 2**(1/0.076)) < 1e-6
assert 8000 < f < 10000, f"实际 {f}"

# alpha=0.095 -> 约 1500 倍
f2 = halving_factor(0.095)
assert 1400 < f2 < 1600, f"实际 {f2}"

# alpha=0.5 -> 4 倍
assert abs(halving_factor(0.5) - 4.0) < 1e-9

# alpha=1 -> 2 倍
assert abs(halving_factor(1.0) - 2.0) < 1e-9
`,
        answer: `def halving_factor(alpha):
    return 2 ** (1 / alpha)
`,
        explanation:
          '**推导**：\n\n    (N_c/(k·N))^alpha = 0.5 · (N_c/N)^alpha\n    k^(-alpha) = 0.5\n    k^alpha = 2\n    k = 2^(1/alpha)\n\n**实际含义**（这个数字很震撼）：\n\n| 维度 | alpha | 需要多少倍才能让超额损失减半 |\n| --- | --- | --- |\n| 参数量 | 0.076 | **~9100 倍** |\n| 数据量 | 0.095 | **~1500 倍** |\n| 计算量 | 0.050 | **~1e6 倍** |\n\n**这意味着什么**：\n\n从 GPT-2（1.5B）到 GPT-3（175B）是 117 倍——\n远不够让"超额损失"减半。\n\n**所以**：\n- 大模型的进步是"渐进的"，不是"飞跃的"\n- 每次 10 倍投入只换来 ~17% 的损失降低\n- 这就是为什么大模型训练要花那么多钱\n\n**但也解释了为什么值得**：\n损失每降一点，下游能力可能显著提升。',
        tags: ['编程', '幂律指数'],
      },
      {
        id: 'paper-training-c1-e8',
        type: 'code',
        difficulty: 4,
        question:
          '对比两种分配策略：compare_allocations(C)。\n\n给定 C，返回 dict：\n{"kaplan": (N, D, loss), "chinchilla": (N, D, loss)}\n\nKaplan: N = 0.5*(C/1e19)^0.73*1e8, D = C/(6N)\nChinchilla: D = 20N, C = 120N²',
        starterCode: `import numpy as np

L_INF = 1.69
N_C = 8.8e13
ALPHA_N = 0.076
D_C = 5.4e13
ALPHA_D = 0.095

def loss(N, D):
    return L_INF + (N_C/N)**ALPHA_N + (D_C/D)**ALPHA_D

def compare_allocations(C):
    # Kaplan
    N_k = ___
    D_k = ___
    # Chinchilla
    N_c = ___
    D_c = ___
    return {
        "kaplan": (N_k, D_k, loss(N_k, D_k)),
        "chinchilla": (N_c, D_c, loss(N_c, D_c)),
    }
`,
        setupCode: '',
        expectedOutput: '两种分配对比',
        tests: `import numpy as np

r = compare_allocations(1e21)
assert "kaplan" in r and "chinchilla" in r

N_k, D_k, L_k = r["kaplan"]
N_c, D_c, L_c = r["chinchilla"]

# 都满足 C = 6ND（近似）
assert abs(6*N_k*D_k - 1e21)/1e21 < 0.01
assert abs(6*N_c*D_c - 1e21)/1e21 < 0.01

# 两种方法的 D/N 不同（Kaplan 随 C 变化，Chinchilla 恒为 20）
assert abs(D_c/N_c - 20) < 0.1, f"Chinchilla D/N 应为 20"
assert D_k/N_k != D_c/N_c, "两者分配不同"

# Chinchilla 损失更低
assert L_c < L_k, f"Chinchilla 应更好: {L_c} vs {L_k}"

# 更大的 C
r2 = compare_allocations(1e23)
assert r2["chinchilla"][2] < r["chinchilla"][2], "更大 C 应更低损失"
`,
        answer: `import numpy as np

L_INF = 1.69
N_C = 8.8e13
ALPHA_N = 0.076
D_C = 5.4e13
ALPHA_D = 0.095

def loss(N, D):
    return L_INF + (N_C/N)**ALPHA_N + (D_C/D)**ALPHA_D

def compare_allocations(C):
    # Kaplan: N ∝ C^0.73（校准到 C=1e21 时 N=1e9）
    N_k = 1e9 * (C / 1e21) ** 0.73
    D_k = C / (6 * N_k)
    # Chinchilla: D = 20N, C = 120N²
    N_c = np.sqrt(C / 120)
    D_c = 20 * N_c
    return {
        "kaplan": (N_k, D_k, loss(N_k, D_k)),
        "chinchilla": (N_c, D_c, loss(N_c, D_c)),
    }
`,
        explanation:
          '**两种策略的差异**：\n\n| C | Kaplan (N, D) | Chinchilla (N, D) |\n| --- | --- | --- |\n| 1e21 | N≈1e9, D≈1.7e11 | N≈2.9e9, D≈5.8e10 |\n\n**注意**：Kaplan 的 N 更小、D 更大？\n\n等等，这与"参数优先"矛盾。让我重新核对：\n\nKaplan 的 N ∝ C^0.73 意味着**参数增长快**。\n但在 C=1e21 时，Kaplan 给的是 N=1e9，Chinchilla 给 N=2.9e9——\nChinchilla 的参数**更多**。\n\n**这是因为常数项不同**，不是指数。\n\n**关键洞察**：两种方法在不同 C 区间可能交叉。\n实践中 Chinchilla 的"20 token/参数"更可靠。',
        tags: ['编程', '分配对比'],
      },
      {
        id: 'paper-training-c1-e9',
        type: 'judge',
        difficulty: 4,
        question: 'Scaling Laws 证明了模型能力会随规模平滑提升，不存在"涌现"现象。',
        answer: false,
        explanation:
          'Scaling Laws 只证明了**损失**是平滑的。下游任务的准确率可能因阈值效应看起来"突变"。Schaeffer 等人认为涌现可能是度量选择的假象，但这不是 Scaling Laws 本身的结论——两者是关于不同量的陈述。',
        tags: ['涌现争议'],
      },
      {
        id: 'paper-training-c1-e10',
        type: 'open',
        difficulty: 5,
        question:
          '请解释：① Scaling Laws 的公式与指数含义；② 为什么双对数坐标下是直线；③ Kaplan 与 Chinchilla 的分歧；④ 对"涌现能力"的两种解释。',
        referenceAnswer: `**① 公式与指数含义**

**完整公式**：

    L(N, D) = L_∞ + (N_c/N)^α_N + (D_c/D)^α_D

**三项**：

| 项 | 含义 | 实测值 |
| --- | --- | --- |
| **L_∞** | 不可约损失（数据熵） | ≈1.69 nats |
| **(N_c/N)^α_N** | 模型容量不足 | α_N≈0.076 |
| **(D_c/D)^α_D** | 数据不足 | α_D≈0.095 |

**指数含义**（关键）：

    N 增加 10 倍 -> (N_c/N)^α 变成原来的 10^(-0.076) ≈ 0.84
    即"超额损失"降低 16%

**所以**：

| 投入 | 超额损失变化 |
| --- | --- |
| 10 倍参数 | ×0.84 |
| 100 倍参数 | ×0.70 |
| **9100 倍参数** | **×0.5** |

**这就是"规模"的代价**：要看到明显进步，需要巨大的投入。

---

**② 为什么双对数坐标下是直线**

**推导**：

    L - L_∞ = (N_c/N)^α
    log(L - L_∞) = α·log(N_c) - α·log(N)
                 = -α·log(N) + const

**所以**：\`log(L-L_∞)\` 与 \`log(N)\` 是**线性关系**，斜率 \`-α\`。

**这个性质的意义**：

    只要在小规模上拟合出直线
    就能外推到大规模

**这就是 Scaling Laws 的实用价值**：
不用真的训练 100B 模型，也能预测它的损失。

**注意前提**：
- 需要扣除 L_∞（否则不是直线）
- 假设幂律在整个区间成立（可能在高规模失效）

---

**③ Kaplan 与 Chinchilla 的分歧**

**Kaplan (2020)**：

    N_opt ∝ C^0.73
    D_opt ∝ C^0.27

**含义**：计算增加时，**主要增加参数**。

**Chinchilla (2022)**：

    N_opt ∝ C^0.50
    D_opt ∝ C^0.50

**含义**：**参数和数据等比例增长**。

**经验法则**：\`D_opt ≈ 20 × N_opt\`。

**具体案例**：

| 模型 | N | D | D/N |
| --- | --- | --- | --- |
| GPT-3 | 175B | 300B | 1.7 |
| **Chinchilla** | **70B** | **1.4T** | **20** |
| LLaMA-2 | 70B | 2T | 29 |

**Chinchilla 用 1/2.5 的参数达到 GPT-3 效果。**

**为什么 Kaplan 错了**：

| 原因 | 说明 |
| --- | --- |
| **学习率调度** | Kaplan 用固定步数，未充分衰减 |
| **数据重复** | 允许重复，低估了数据需求 |
| **评估细节** | 最后一步 vs 最优步 |
| **拟合方法** | 不同规模的权重分配 |

**教训**：
> **实验设计细节会显著影响 Scaling Laws 的指数估计。**

这也是为什么 Chinchilla 需要重新做实验——
不是"Kaplan 数学错了"，而是"实验设置不同"。

---

**④ 对"涌现能力"的两种解释**

**现象**：

某些任务（如多步算术、符号推理）的准确率：
- 小模型：接近 0%
- 中等模型：接近 0%
- 大模型：突然接近 100%

**看起来像"涌现"**（emergent ability）。

**解释 1（Wei et al. 2022）：真实的涌现**

    能力是离散的
    规模达到阈值后"解锁"
    这是大模型的本质特征

**解释 2（Schaeffer et al. 2023）：度量假象**

    底层能力是平滑的
    "突变"来自度量的非线性

**具体论证**：

用**准确率**（0/1）度量：

    每个样本要么对要么错
    能力从 0.4 到 0.6 时，准确率可能从 5% 跳到 60%
    看起来像"突变"

用**对数似然**（连续）度量：

    能力从 0.4 到 0.6 时，对数似然平滑增加
    没有突变

**类比**：

    用"是否及格"（60分）度量
    学生分数从 55 到 65 时，"及格率"从 0% 跳到 100%
    但真实能力是平滑变化的

**我的判断**：

两种解释**不矛盾**：
- **损失**（Scaling Laws 预测的）确实平滑
- **下游指标**可能因度量方式看起来突变

**关键洞察**：

> **"涌现"可能是"我们还没找到合适的度量"**，
> 而不是"模型真的发生了质变"。

**但对实践的影响是真实的**：
如果某个能力在规模 X 之前不可用，那它就是"涌现"的——
不管底层是平滑还是突变。

---

**⑤ 对实践的启示**

**a) 资源规划**

    想达到损失 L，需要 N ≈ N_c/(L-L_∞)^(1/α_N)
    结合 C = 6ND，可以估算算力需求

**b) 数据质量 > 数量**

Kaplan 发现：重复数据超过 4 次后损失明显变差。
Chinchilla 假设数据充足（不重复）。

**所以**：
- 收集更多**独特**数据
- 不要靠重复来"凑数据量"

**c) 学习率调度很重要**

Chinchilla 用 cosine decay 到 0，
这比固定学习率能多榨出性能。

**d) 小规模验证再外推**

先用小模型（1e8~1e9）拟合 scaling law，
再规划大模型训练。

**这是大模型训练的标准流程。**

**e) 一个诚实的边界**

Scaling Laws 只告诉你"损失会降到多少"，
不告诉你"这个损失对应什么能力"。

**从损失到能力的映射，仍是开放问题。**

这就是为什么"涌现"争议重要——
它关系到"我们能否用损失预测能力"。`,
        rubric: [
          { point: '公式三项 + 指数含义（10倍投入换 ~17% 降低）', score: 3 },
          { point: '双对数直线推导 + 外推价值', score: 2 },
          { point: 'Kaplan 0.73/0.27 vs Chinchilla 0.5/0.5，D≈20N', score: 2 },
          { point: '涌现两解释：真实突变 vs 度量假象，不矛盾', score: 2 },
          { point: '实践：数据质量>数量、LR 调度、小规模外推', score: 1 },
        ],
        keywords: ['L_∞+两项', '双对数直线', 'D≈20N', '度量假象', '小规模外推'],
        explanation:
          '能说清「Chinchilla 修正的是实验设计而非数学」以及「损失平滑但准确率可能突变，两者不矛盾」，就是理解了 Scaling Laws 的边界。',
        tags: ['综合分析'],
      },
    ],
  },
];
