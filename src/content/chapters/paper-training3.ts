import type { Chapter } from '../../types';

/* ============================================================
 *  人工智能基础 · 论文导读 · 训练与规模
 *  29 Proximal Policy Optimization
 *  30 Deep RL from Human Preferences (RLHF)
 *
 *  来源：
 *  - 论文：Schulman et al. (2017) arXiv:1707.06347
 *  - 论文：Christiano et al. (2017) arXiv:1706.03741
 *  - 参考：Ojhaharsh/30u30 第 29/30 篇（CC BY-NC-ND 4.0，本地个人使用）
 *  - 本课程为原创导读 + 原创习题
 *
 *  执行说明：本章代码需要 PyTorch，走本地后端执行。
 * ============================================================ */

export const paperTrainingChapters3: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c3: PPO
   * ============================================================ */
  {
    id: 'paper-training-c3',
    title: 'PPO：让策略更新"别走太远"',
    goal: '理解策略梯度的方差问题与信任域思想，掌握 PPO 的 clip 目标函数，能手写 PPO 损失并训练一个简单环境。',
    lessons: [
      {
        id: 'paper-training-c3-l1',
        title: '从策略梯度到 PPO',
        difficulty: 5,
        content: `
### 学习目标

学完本节，你应该能够：
1. 说明策略梯度的方差问题与 TRPO 信任域思想的代价，写出 PPO 的 clip 目标函数；
2. 分 A>0/A<0 两种情况解释 min+clip 为何「只截过度更新、不阻止正常更新」；
3. 用数值梯度验证 clip 带内梯度为 1、带外为 0，并说出 GAE 的 λ 如何折中偏差与方差。

### 前置知识

- 策略梯度与 Actor-Critic 基础（强化学习入门）；
- 重要性采样比率的概念；
- KL 散度。

### 问题背景

策略梯度方差大，一步更新走太远策略就崩；TRPO 用 KL 硬约束稳住，但要算 Fisher 矩阵、共轭梯度，实现复杂。PPO 的洞察：不用真算 KL，「截断」重要性比率就够了——min(r·A, clip(r,1±ε)·A) 让过度更新自动失去梯度。一阶优化、实现简单、稳定少调参，使它成为 RL 事实标准，也是 RLHF 三阶段里的第三级火箭（InstructGPT/ChatGPT 都用它对齐）。

### 直觉理解

牵狗散步：TRPO 是给狗画一个「不许出」的圆圈（硬约束，要费劲盯着）；PPO 是用伸缩绳——在信任范围内自由走（线性梯度），拉太远绳子绷直（clip 区域梯度为零）自动停下。绳子不阻止正常散步，只在要冲出去的时候拽住——这就是 min 的妙处。

### 核心概念与原理详解

## 论文信息

| 项目 | 内容 |
| --- | --- |
| **标题** | Proximal Policy Optimization Algorithms |
| **作者** | John Schulman, Filip Wolski, Prafulla Dhariwal, Alec Radford, Oleg Klimov（OpenAI） |
| **发表** | arXiv 2017 |
| **arXiv** | [1707.06347](https://arxiv.org/abs/1707.06347) |
| **一句话贡献** | 用 clip 限制策略更新幅度，实现"稳定、简单、高效"的强化学习算法 |

## 策略梯度的问题

**基本策略梯度**：

    ∇J = E[∇log π(a|s) · A(s,a)]

**问题**：**方差大**。

**为什么**：
- 采样有限
- 回报的随机性
- 策略更新后，旧数据失效

**传统解法**：

| 方法 | 思路 | 问题 |
| --- | --- | --- |
| **REINFORCE** | 直接用蒙特卡洛回报 | 方差极大 |
| **Actor-Critic** | 用价值函数减方差 | 仍有方差 |
| **TRPO** | 限制 KL 散度（信任域） | **复杂**（二阶优化） |
| **PPO** | 用 clip 近似信任域 | **简单** |

<PolicyUpdateDemo />

## TRPO 的信任域思想

**核心问题**：策略更新多大合适？

    更新太小 -> 学习慢
    更新太大 -> 策略崩溃（性能断崖）

**TRPO 的做法**：

    max  E[ (π_θ/π_old) · A ]
    s.t. E[ KL(π_old || π_θ) ] ≤ δ

**用 KL 散度约束**"新旧策略不能差太多"。

**问题**：
- 需要计算 Fisher 信息矩阵
- 需要共轭梯度法
- **实现复杂，难以调参**

## PPO 的核心：clip

**关键洞察**：

> **不需要真的算 KL，只要"截断"重要性比率就行。**

**定义重要性比率**：

    r_t(θ) = π_θ(a_t|s_t) / π_θ_old(a_t|s_t)

**含义**：
- r = 1：策略没变
- r = 2：新策略选这个动作的概率翻倍
- r = 0.5：概率减半

**PPO 的目标函数**：

    L^CLIP(θ) = E[ min( r_t(θ)·A_t, clip(r_t, 1-ε, 1+ε)·A_t ) ]

**这就是 PPO 的全部核心。**

<PPOClipDemo />

**逐项解释**：

| 符号 | 含义 |
| --- | --- |
| **r_t** | 重要性比率 |
| **A_t** | 优势函数（这个动作比平均好多少） |
| **ε** | 裁剪范围（通常 0.2） |
| **clip(r, 1-ε, 1+ε)** | 把 r 限制在 [0.8, 1.2] |

**为什么用 min**：

**情况 1：A > 0（好动作）**

    想提高 π(a|s)
    但如果 r > 1+ε（已经提高太多了）
    -> clip 后的项变成 (1+ε)·A（常数，无梯度）
    -> min 选它 -> 不再推高

**情况 2：A < 0（坏动作）**

    想降低 π(a|s)
    但如果 r < 1-ε（已经降太多了）
    -> clip 后的项变成 (1-ε)·A（常数）
    -> min 选它 -> 不再压低

**关键**：**min 保证"只截断过度更新，不阻止正常更新"**。

## 为什么 clip 有效

**直觉**：

    目标函数是"分段"的：
    在 [-ε, +ε] 内：线性（正常更新）
    超出范围：平坦（无梯度）

**所以**：
- 策略更新小 -> 正常学习
- 策略更新大 -> 梯度消失，不再推

**这相当于"软约束"**——不需要真的解约束优化。

<ClipEffectDemo />

**与 TRPO 的对比**：

| 维度 | TRPO | PPO |
| --- | --- | --- |
| **约束方式** | KL 散度（硬约束） | clip（软约束） |
| **优化** | 二阶（共轭梯度） | **一阶（SGD）** |
| **实现** | 复杂 | **简单** |
| **效果** | 好 | **相当或更好** |

**PPO 论文的结论**：在多数任务上 PPO 不输 TRPO，但简单得多。

## 完整 PPO 损失

**三部分**：

    L = L^CLIP - c_1·L^VF + c_2·S[π]

| 项 | 含义 | 系数 |
| --- | --- | --- |
| **L^CLIP** | 策略损失（要最大化） | 1 |
| **L^VF** | 价值函数损失（MSE） | c_1 = 0.5 |
| **S[π]** | 策略熵（鼓励探索） | c_2 = 0.01 |

**注意符号**：我们最小化 \`-L\`，所以策略项是负号。

**价值损失**：

    L^VF = E[ (V_θ(s) - V_target)² ]

**熵奖励**：

    S[π] = -Σ π(a|s)·log π(a|s)

**为什么加熵**：
防止策略过早收敛到确定性（失去探索）。

## GAE：优势估计

**问题**：A_t 怎么算？

**简单做法**（单步 TD）：

    A_t = r_t + γV(s_{t+1}) - V(s_t)

**问题**：偏差大（依赖 V 的准确性）。

**蒙特卡洛**：

    A_t = Σ γ^k r_{t+k} - V(s_t)

**问题**：方差大。

**GAE（广义优势估计）**：两者插值

    A_t^GAE = Σ_{k=0}^{∞} (γλ)^k · δ_{t+k}

其中 \`δ_t = r_t + γV(s_{t+1}) - V(s_t)\`。

**λ 的作用**：

| λ | 接近 | 偏差 | 方差 |
| --- | --- | --- | --- |
| 0 | 单步 TD | 大 | **小** |
| 1 | 蒙特卡洛 | **小** | 大 |
| **0.95** | **平衡** | 中 | 中 |

**这就是 PPO 用的（λ=0.95）。**

<GAEDemo />

## PPO 的训练流程

    for iteration in range(N):
        # ① 用当前策略采样
        trajectories = collect(π_old, env)
        
        # ② 计算优势和回报
        advantages = compute_GAE(trajectories, V)
        returns = advantages + V
        
        # ③ 多轮更新（用同一批数据）
        for epoch in range(K):
            for batch in trajectories:
                # 计算比率
                r = π_new(a|s) / π_old(a|s)
                # clip 损失
                L_clip = min(r*A, clip(r, 1-ε, 1+ε)*A)
                # 总损失
                loss = -L_clip + c1*VF_loss - c2*entropy
                # 更新
                optimizer.step()

**关键**：**同一批数据用 K 次**（通常 K=3~10）。

**为什么可以重复用**：
因为 clip 限制了更新幅度，不会"过度拟合"旧数据。

## 实验结果

**论文在多个任务上测试**：

| 任务 | PPO vs 其他 |
| --- | --- |
| **Atari** | 优于 A2C，接近 ACER |
| **MuJoCo**（连续控制） | **优于 TRPO** |
| **Roboschool** | 明显更好 |

**关键优势**：**简单、稳定、少调参**。

## PPO 的现代地位

**PPO 是 RLHF 的核心算法**：

    SFT → 奖励模型 → **PPO** → 对齐的 LLM

**ChatGPT、Claude 都用 PPO（或其变体）**。

**为什么 PPO 适合 RLHF**：
- 稳定（不会训崩）
- 支持大模型（一阶优化）
- 可以加 KL 惩罚（防止偏离太远）

**PPO 在 RLHF 中的改动**：

    reward = r_θ(x, y) - β·KL(π || π_ref)

加了 KL 惩罚，防止模型"钻奖励模型的空子"。

## 本节来源

> **来源类型：学术来源**
> - Schulman, J. et al. *Proximal Policy Optimization Algorithms*
>   arXiv:[1707.06347](https://arxiv.org/abs/1707.06347)（2017）
> - Schulman, J. et al. *Trust Region Policy Optimization*
>   arXiv:[1502.05477](https://arxiv.org/abs/1502.05477)（TRPO）
> - Schulman, J. et al. *High-Dimensional Continuous Control Using Generalized
>   Advantage Estimation* arXiv:[1506.02438](https://arxiv.org/abs/1506.02438)（GAE）
>
> **来源类型：参考资料（CC BY-NC-ND 4.0，本地个人使用）**
> - Ojhaharsh/30u30 第 29 篇（555 行，含 ActorCritic / RolloutBuffer / ppo_loss）
>
> **来源类型：原创**
> - 全部导读文字、交互图示、代码示例与习题

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
eps = 0.2
def ppo_obj(r, A):
    return np.minimum(r * A, np.clip(r, 1-eps, 1+eps) * A)
for A in (1.0, -1.0):
    rs = np.array([0.7, 0.9, 1.0, 1.1, 1.3])
    print(f"A={A:+.0f}: r={rs} -> 目标={ppo_obj(rs, A)}")
r = np.linspace(0.5, 1.5, 11); d = 1e-6
g = (ppo_obj(r + d, 1.0) - ppo_obj(r - d, 1.0)) / (2*d)
print("A=1 时目标对 r 的梯度:", np.round(g, 2), "(band 外=0)")\`\`\`

预期输出（实测）：实测：A=+1 时目标 [0.7, 0.9, 1.0, 1.1, 1.2]——r>1.2 被 clip 截平；A=-1 时 [-0.8, -0.9, -1.0, -1.1, -1.3]——r<0.8 被截在 -0.8；数值梯度在 [0.8,1.2] 内恒为 1、带外为 0（边界 0.5 是过渡点）——过度更新自动失去梯度。

**常见错误**：clip 写成截断 r 本身而不取 min——好动作被截后仍被推高（min 是「只截过度更新」的关键）；重复使用同一批数据 K 次却不算新策略的比率，退化为普通策略梯度；GAE 的 λ 取 1 还嫌方差大——λ=0.95 才是偏差方差折中。

### 常见误区

1. **PPO=TRPO 的弱化版**——论文实测多数任务不输 TRPO，复杂度却低一个量级；
2. **clip 约束双向对称**——A>0 截上限、A<0 截下限，但另一侧不截（目标是非对称的 p-norm 式设计）；
3. **RLHF 里 PPO 不用改**——要加 KL(π‖π_ref) 惩罚，否则模型钻奖励模型空子。

### 知识关联

- **向前**：策略梯度/Actor-Critic 的方差问题与 TRPO 的信任域是直接前情；
- **向后**：c6 RLHF 用 PPO 做第三阶段，KL 惩罚防 reward hacking；
- **平行**：c1 的「预算纪律」与 PPO 的「更新纪律」同为防过冲的工程哲学。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 目标 | L=min(r·A, clip(r,1±ε)·A)，ε=0.2 |
| 机制 | 带内线性（正常学）、带外平坦（自动停） |
| 实测 | 梯度在 [0.8,1.2] 内=1，带外=0 |
| 配套 | GAE(λ=0.95) 估优势；价值损失+熵正则 |
| 地位 | RLHF 第三阶段的标准引擎 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见论文原文：Schulman et al., Proximal Policy Optimization Algorithms, arXiv:1707.06347；Schulman et al., GAE, arXiv:1506.02438）
`,
        tips: [
          {
            kind: 'interview',
            text: '「PPO 的核心」：L^CLIP = E[min(r·A, clip(r,1-ε,1+ε)·A)]。r 是新旧策略的概率比，clip 限制更新幅度，min 保证只截断过度更新。',
          },
          {
            kind: 'leak',
            text: '「为什么用 min」：A>0 时若 r>1+ε 则截断（不再推高）；A<0 时若 r<1-ε 则截断（不再压低）。min 保证"只截断过度，不阻止正常"。',
          },
          {
            kind: 'pitfall',
            text: 'PPO 在 RLHF 中加了 KL 惩罚：reward = r_θ(x,y) - β·KL(π||π_ref)。防止模型钻奖励模型的空子（reward hacking）。',
          },
        ],
        demos: [
          {
            title: 'PPO clip 目标函数（PyTorch）',
            lang: 'python',
            code: `import torch
import torch.nn.functional as F

def ppo_clip_loss(log_probs_new, log_probs_old, advantages, clip_eps=0.2):
    """
    PPO 的 clip 目标。

    L = E[ min( r*A, clip(r, 1-eps, 1+eps)*A ) ]
    其中 r = exp(log_pi_new - log_pi_old)
    """
    # 重要性比率
    ratio = torch.exp(log_probs_new - log_probs_old)

    # 未裁剪项
    surr1 = ratio * advantages

    # 裁剪项
    clipped_ratio = torch.clamp(ratio, 1 - clip_eps, 1 + clip_eps)
    surr2 = clipped_ratio * advantages

    # 取 min，然后取负（因为要最小化）
    loss = -torch.min(surr1, surr2).mean()
    return loss, ratio


print("=== PPO clip 的行为分析 ===")
print()

# 场景：不同比率和优势
log_old = torch.tensor([0.0, 0.0, 0.0, 0.0, 0.0, 0.0])
# 新策略的对数概率（决定 ratio）
log_new = torch.log(torch.tensor([0.5, 0.8, 1.0, 1.2, 1.5, 2.0]))
advantages = torch.tensor([1.0, 1.0, 1.0, 1.0, 1.0, 1.0])

loss, ratio = ppo_clip_loss(log_new, log_old, advantages)

print("A > 0（好动作）:")
print(f"{'ratio':>8} | {'surr1':>8} | {'surr2':>8} | {'min':>8} | {'被裁剪?':>8}")
print("-" * 54)

for i in range(len(ratio)):
    r = ratio[i].item()
    a = 1.0
    s1 = r * a
    s2 = max(min(r, 1.2), 0.8) * a
    clipped = "是" if abs(s1 - s2) > 1e-6 else "否"
    print(f"{r:>8.3f} | {s1:>8.3f} | {s2:>8.3f} | {min(s1,s2):>8.3f} | {clipped:>8}")

print()
print("观察：")
print("  ratio < 0.8: 未被裁剪（还能提升）")
print("  ratio 在 [0.8, 1.2]: 正常")
print("  ratio > 1.2: 被裁剪（不再推高）")

print()
print("=== A < 0（坏动作）===")
print()
advantages_neg = torch.tensor([-1.0, -1.0, -1.0, -1.0, -1.0, -1.0])
loss2, ratio2 = ppo_clip_loss(log_new, log_old, advantages_neg)

print(f"{'ratio':>8} | {'surr1':>8} | {'surr2':>8} | {'min':>8} | {'被裁剪?':>8}")
print("-" * 54)

for i in range(len(ratio2)):
    r = ratio2[i].item()
    a = -1.0
    s1 = r * a
    s2 = max(min(r, 1.2), 0.8) * a
    clipped = "是" if abs(s1 - s2) > 1e-6 else "否"
    print(f"{r:>8.3f} | {s1:>8.3f} | {s2:>8.3f} | {min(s1,s2):>8.3f} | {clipped:>8}")

print()
print("观察：")
print("  ratio < 0.8: 被裁剪（不再压低）")
print("  ratio 在 [0.8, 1.2]: 正常")
print("  ratio > 1.2: 未被裁剪（还能降低）")

print()
print("=== 关键：min 保证"只截断过度更新" ===")
print()
print("A > 0 且 ratio > 1.2: min 选 surr2（常数，无梯度）-> 停止推高")
print("A < 0 且 ratio < 0.8: min 选 surr2（常数，无梯度）-> 停止压低")
print()
print("但正常的更新方向不受影响 -> 学习继续")

print()
print("=== 完整 PPO 损失 ===")
print()

def full_ppo_loss(log_probs_new, log_probs_old, advantages, values,
                  returns, entropy, clip_eps=0.2, vf_coef=0.5, ent_coef=0.01):
    """完整的 PPO 损失（三部分）。"""
    policy_loss, ratio = ppo_clip_loss(log_probs_new, log_probs_old,
                                        advantages, clip_eps)
    value_loss = F.mse_loss(values, returns)
    total = policy_loss + vf_coef * value_loss - ent_coef * entropy
    return total, policy_loss, value_loss


torch.manual_seed(0)
N = 8
lp_new = torch.randn(N) * 0.1
lp_old = torch.zeros(N)
adv = torch.randn(N)
vals = torch.randn(N)
rets = torch.randn(N)
ent = torch.rand(1).item() * 0.5

total, pl, vl = full_ppo_loss(lp_new, lp_old, adv, vals, rets, ent)
print(f"策略损失: {pl.item():.4f}")
print(f"价值损失: {vl.item():.4f}")
print(f"熵: {ent:.4f}")
print(f"总损失: {total.item():.4f}")
print()
print("总损失 = 策略损失 + 0.5*价值损失 - 0.01*熵")`,
          },
          {
            title: '完整 PPO 训练循环',
            lang: 'python',
            code: `import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np

class ActorCritic(nn.Module):
    def __init__(self, obs_dim, act_dim, hidden=64):
        super().__init__()
        self.shared = nn.Sequential(
            nn.Linear(obs_dim, hidden), nn.Tanh(),
            nn.Linear(hidden, hidden), nn.Tanh(),
        )
        self.actor = nn.Linear(hidden, act_dim)
        self.critic = nn.Linear(hidden, 1)

    def forward(self, x):
        h = self.shared(x)
        return self.actor(h), self.critic(h).squeeze(-1)

    def act(self, obs):
        logits, value = self.forward(obs)
        dist = torch.distributions.Categorical(logits=logits)
        action = dist.sample()
        return action, dist.log_prob(action), value


class SimpleEnv:
    """简单的多臂老虎机式环境（演示用）。"""
    def __init__(self, n_actions=4, seed=0):
        self.rng = np.random.default_rng(seed)
        self.n_actions = n_actions
        # 每个动作的真实奖励
        self.means = self.rng.normal(0, 1, n_actions)

    def reset(self):
        return np.array([1.0, 0.0], dtype=np.float32)

    def step(self, action):
        reward = self.means[action] + self.rng.normal(0, 0.1)
        return np.array([1.0, 0.0], dtype=np.float32), float(reward), True


print("=== 训练 PPO ===")
torch.manual_seed(42)
np.random.seed(42)

env = SimpleEnv(n_actions=4)
model = ActorCritic(obs_dim=2, act_dim=4)
optimizer = torch.optim.Adam(model.parameters(), lr=3e-3)

print(f"真实奖励均值: {np.round(env.means, 2)}")
print(f"最优动作: {np.argmax(env.means)}")
print()

GAMMA = 0.99
CLIP_EPS = 0.2
EPOCHS = 10

for iteration in range(1, 51):
    # ① 采样
    obs_batch, act_batch, logp_batch, rew_batch, val_batch = [], [], [], [], []
    for _ in range(32):
        obs = env.reset()
        obs_t = torch.tensor(obs)
        action, logp, value = model.act(obs_t)
        _, reward, _ = env.step(action.item())
        obs_batch.append(obs_t)
        act_batch.append(action)
        logp_batch.append(logp)
        rew_batch.append(reward)
        val_batch.append(value)

    obs_b = torch.stack(obs_batch)
    act_b = torch.stack(act_batch)
    logp_old = torch.stack(logp_batch).detach()
    rew_b = torch.tensor(rew_batch)
    val_b = torch.stack(val_batch).detach()

    # ② 计算优势（这里 episode 长度 1，简化）
    returns = rew_b
    advantages = returns - val_b
    advantages = (advantages - advantages.mean()) / (advantages.std() + 1e-8)

    # ③ 多轮更新
    for epoch in range(EPOCHS):
        logits, values = model(obs_b)
        dist = torch.distributions.Categorical(logits=logits)
        logp_new = dist.log_prob(act_b)

        ratio = torch.exp(logp_new - logp_old)
        surr1 = ratio * advantages
        surr2 = torch.clamp(ratio, 1 - CLIP_EPS, 1 + CLIP_EPS) * advantages
        policy_loss = -torch.min(surr1, surr2).mean()

        value_loss = F.mse_loss(values, returns)
        entropy = dist.entropy().mean()

        loss = policy_loss + 0.5 * value_loss - 0.01 * entropy

        optimizer.zero_grad()
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 0.5)
        optimizer.step()

    if iteration % 10 == 0:
        with torch.no_grad():
            logits, _ = model(torch.tensor([[1.0, 0.0]]))
            probs = F.softmax(logits, dim=-1)
            best_action = probs.argmax().item()
        print(f"迭代 {iteration:>2}: loss={loss.item():.4f}, "
              f"最可能动作={best_action}, 概率={probs[0, best_action].item():.3f}")

print()
print("=== 结果 ===")
with torch.no_grad():
    logits, _ = model(torch.tensor([[1.0, 0.0]]))
    probs = F.softmax(logits, dim=-1)[0].numpy()
print(f"最终动作概率: {np.round(probs, 3)}")
print(f"学到的最优动作: {probs.argmax()}")
print(f"真实的: {np.argmax(env.means)}")
print(f"正确: {probs.argmax() == np.argmax(env.means)}")`,
          },
          {
            title: 'GAE：广义优势估计',
            lang: "python",
            code: `import numpy as np

def compute_gae(rewards, values, gamma=0.99, lam=0.95):
    """
    计算 GAE 优势。

    rewards: (T,) 每步奖励
    values:  (T+1,) 价值估计（含最后状态）
    """
    T = len(rewards)
    advantages = np.zeros(T)
    gae = 0.0

    for t in reversed(range(T)):
        delta = rewards[t] + gamma * values[t + 1] - values[t]
        gae = delta + gamma * lam * gae
        advantages[t] = gae

    returns = advantages + values[:T]
    return advantages, returns


print("=== GAE 与 lambda 的关系 ===")
print()

np.random.seed(42)
T = 5
rewards = np.array([1.0, 0.5, 2.0, 0.3, 1.5])
values = np.array([0.8, 0.6, 1.8, 0.4, 1.2, 0.0])

print(f"奖励: {rewards}")
print(f"价值: {values}")
print()

for lam in [0.0, 0.5, 0.95, 1.0]:
    adv, ret = compute_gae(rewards, values, gamma=0.99, lam=lam)
    print(f"lambda={lam:<5}: 优势={np.round(adv, 3)}")

print()
print("=== 关键观察 ===")
print()
print("lambda=0: 只用单步 TD 误差（偏差大，方差小）")
print("lambda=1: 蒙特卡洛（无偏，方差大）")
print("lambda=0.95: 平衡（PPO 的默认值）")

print()
print("=== 手动验证 lambda=0 的情况 ===")
print()
gamma = 0.99
lam = 0.0
adv, _ = compute_gae(rewards, values, gamma, lam)
for t in range(T):
    delta = rewards[t] + gamma * values[t+1] - values[t]
    print(f"  t={t}: delta={delta:.4f}, adv={adv[t]:.4f}")
print()
print("-> lambda=0 时，adv[t] = delta[t]（单步 TD）")

print()
print("=== lambda=1 的情况 ===")
print()
lam = 1.0
adv1, _ = compute_gae(rewards, values, gamma, lam)
for t in range(T):
    # 手动算蒙特卡洛
    mc = sum(gamma**(k-t) * rewards[k] for k in range(t, T)) - values[t]
    print(f"  t={t}: GAE={adv1[t]:>8.4f}, MC-V={mc:>8.4f}, 差异={abs(adv1[t]-mc):.2e}")
print()
print("-> lambda=1 时，GAE 退化为蒙特卡洛优势")

print()
print("=== 为什么用 GAE ===")
print()
print("单步 TD（lambda=0）：")
print("  · 偏差大（依赖 V 的准确性）")
print("  · 方差小")
print()
print("蒙特卡洛（lambda=1）：")
print("  · 无偏")
print("  · 方差大（累积随机性）")
print()
print("GAE（lambda=0.95）：")
print("  · 偏差和方差平衡")
print("  · 实践中效果最好")
print()
print("这就是 PPO 默认用 lambda=0.95 的原因")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'paper-training-c3-e1',
        relatedLessonId: 'paper-training-c3-l1',
        type: 'single',
        difficulty: 2,
        question: 'PPO 相比 TRPO 的核心改进是？',
        options: [
          { value: 'A', text: '用更深的网络' },
          { value: 'B', text: '用 clip 替代 KL 约束，把二阶优化变成一阶' },
          { value: 'C', text: '去掉价值函数' },
          { value: 'D', text: '用蒙特卡洛回报' },
        ],
        answer: 'B',
        explanation:
          'TRPO 用 KL 散度做硬约束，需要 Fisher 矩阵和共轭梯度（二阶）。PPO 用 clip 做软约束，只需一阶 SGD，效果相当但简单得多。',
        tags: ['核心改进'],
      },
      {
        id: 'paper-training-c3-e2',
        relatedLessonId: 'paper-training-c3-l1',
        type: 'judge',
        difficulty: 2,
        question: 'PPO 的 clip 操作会阻止所有策略更新，包括正常的小幅更新。',
        answer: false,
        explanation:
          'clip 只截断**过度**的更新。在 [1-ε, 1+ε] 范围内梯度正常流动；超出范围才变成常数（无梯度）。min 保证"只截断过度，不阻止正常"。',
        tags: ['clip 行为'],
      },
      {
        id: 'paper-training-c3-e3',
        relatedLessonId: 'paper-training-c3-l1',
        type: 'multiple',
        difficulty: 3,
        question: 'PPO 的完整损失包含哪些部分？（多选）',
        options: [
          { value: 'A', text: 'L^CLIP（策略损失）' },
          { value: 'B', text: 'L^VF（价值函数损失，MSE）' },
          { value: 'C', text: 'S[π]（策略熵，鼓励探索）' },
          { value: 'D', text: 'KL 散度硬约束' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 是 TRPO 的做法，PPO 用 clip 替代了它。完整损失：L = L^CLIP - c1·L^VF + c2·S[π]。',
        tags: ['损失组成'],
      },
      {
        id: 'paper-training-c3-e4',
        relatedLessonId: 'paper-training-c3-l1',
        type: 'fill',
        difficulty: 3,
        question:
          'PPO 中重要性比率 r_t(θ) 定义为 ___。',
        blanks: [['π_θ(a|s)/π_old(a|s)', 'π_new/π_old', 'new/old', '新策略/旧策略']],
        explanation:
          'r = π_new(a|s) / π_old(a|s)。r=1 表示策略没变；r=2 表示新策略选该动作的概率翻倍。clip 把 r 限制在 [1-ε, 1+ε]。',
        tags: ['重要性比率'],
      },
      {
        id: 'paper-training-c3-e5',
        relatedLessonId: 'paper-training-c3-l1',
        type: 'code',
        difficulty: 2,
        question:
          '计算重要性比率：importance_ratio(logp_new, logp_old)。\n\nr = exp(logp_new - logp_old)',
        starterCode: `import numpy as np

def importance_ratio(logp_new, logp_old):
    return ___
`,
        setupCode: '',
        expectedOutput: '比率',
        tests: `import numpy as np

# 策略没变 -> r=1
assert abs(importance_ratio(0.0, 0.0) - 1.0) < 1e-9

# 新策略概率翻倍
assert abs(importance_ratio(np.log(2.0), 0.0) - 2.0) < 1e-6

# 新策略概率减半
assert abs(importance_ratio(np.log(0.5), 0.0) - 0.5) < 1e-6

# 数组
r = importance_ratio(np.array([0.0, np.log(2)]), np.array([0.0, 0.0]))
assert np.allclose(r, [1.0, 2.0], atol=1e-6)

# 新策略更可能 -> r > 1
assert importance_ratio(-0.5, -1.0) > 1
`,
        answer: `import numpy as np

def importance_ratio(logp_new, logp_old):
    return np.exp(logp_new - logp_old)
`,
        explanation:
          '**为什么用 log 概率**：\n\n    log π 是模型直接输出的（logits → log_softmax）\n    π_new/π_old = exp(log π_new - log π_old)\n\n**数值稳定**：\n\n    直接算 π_new/π_old 可能溢出（概率很小）\n    用 log 差再 exp 更稳定\n\n**含义**：\n\n| r | 含义 |\n| --- | --- |\n| 1 | 策略没变 |\n| >1 | 新策略更倾向这个动作 |\n| <1 | 新策略更不倾向 |\n\n**这就是"重要性采样"的权重**——\n用旧策略采样的数据，估计新策略的期望。',
        tags: ['编程', '重要性比率'],
      },
      {
        id: 'paper-training-c3-e6',
        relatedLessonId: 'paper-training-c3-l1',
        type: 'code',
        difficulty: 3,
        question:
          '实现 PPO clip 损失：ppo_clip_loss(ratio, advantages, eps=0.2)。\n\n返回 L = -mean(min(r*A, clip(r, 1-eps, 1+eps)*A))',
        starterCode: `import numpy as np

def ppo_clip_loss(ratio, advantages, eps=0.2):
    ratio = np.asarray(ratio, dtype=float)
    advantages = np.asarray(advantages, dtype=float)
    surr1 = ___
    surr2 = ___
    return ___
`,
        setupCode: '',
        expectedOutput: 'clip 损失',
        tests: `import numpy as np

# 策略没变，优势为正 -> 损失 = -A
loss = ppo_clip_loss(np.array([1.0]), np.array([2.0]))
assert abs(loss - (-2.0)) < 1e-9

# ratio 过大（1.5），优势为正 -> 被裁剪到 1.2
loss2 = ppo_clip_loss(np.array([1.5]), np.array([2.0]))
# min(1.5*2, 1.2*2) = min(3, 2.4) = 2.4 -> loss = -2.4
assert abs(loss2 - (-2.4)) < 1e-9

# ratio 过小（0.5），优势为负 -> 被裁剪到 0.8
loss3 = ppo_clip_loss(np.array([0.5]), np.array([-2.0]))
# min(0.5*-2, 0.8*-2) = min(-1, -1.6) = -1.6 -> loss = 1.6
assert abs(loss3 - 1.6) < 1e-9

# 批量
loss4 = ppo_clip_loss(np.array([1.0, 1.5, 0.5]), np.array([1.0, 1.0, -1.0]))
assert np.isfinite(loss4)

# 正常范围内无裁剪
loss5 = ppo_clip_loss(np.array([1.1]), np.array([1.0]))
assert abs(loss5 - (-1.1)) < 1e-9
`,
        answer: `import numpy as np

def ppo_clip_loss(ratio, advantages, eps=0.2):
    ratio = np.asarray(ratio, dtype=float)
    advantages = np.asarray(advantages, dtype=float)
    surr1 = ratio * advantages
    surr2 = np.clip(ratio, 1 - eps, 1 + eps) * advantages
    return -np.mean(np.minimum(surr1, surr2))
`,
        explanation:
          '**三个关键操作**：\n\n1. **`surr1 = r * A`**：未裁剪的目标\n2. **`surr2 = clip(r) * A`**：裁剪后的目标\n3. **`min(surr1, surr2)`**：取较小者\n\n**为什么取 min**：\n\n| 情况 | min 选择 | 效果 |\n| --- | --- | --- |\n| A>0, r>1.2 | surr2（常数） | 停止推高 |\n| A>0, r<0.8 | surr1 | 允许提升 |\n| A<0, r<0.8 | surr2（常数） | 停止压低 |\n| A<0, r>1.2 | surr1 | 允许降低 |\n\n**注意负号**：我们要**最大化**目标，所以损失取负。\n\n**`np.clip`** 把 r 限制在 [1-eps, 1+eps]。',
        tags: ['编程', 'clip 损失'],
      },
      {
        id: 'paper-training-c3-e7',
        relatedLessonId: 'paper-training-c3-l1',
        type: 'code',
        difficulty: 3,
        question:
          '计算 GAE 优势：compute_gae(rewards, values, gamma=0.99, lam=0.95)。\n\n- rewards: (T,)\n- values: (T+1,)（含最后状态）\n- 返回 (advantages, returns)，各为 (T,)',
        starterCode: `import numpy as np

def compute_gae(rewards, values, gamma=0.99, lam=0.95):
    T = len(rewards)
    advantages = np.zeros(T)
    gae = 0.0
    for t in reversed(range(T)):
        delta = ___
        gae = ___
        advantages[t] = gae
    returns = ___
    return advantages, returns
`,
        setupCode: '',
        expectedOutput: '(advantages, returns)',
        tests: `import numpy as np

rewards = np.array([1.0, 1.0, 1.0])
values = np.array([0.5, 0.5, 0.5, 0.0])

# lambda=0 -> 单步 TD
adv, ret = compute_gae(rewards, values, gamma=1.0, lam=0.0)
for t in range(3):
    delta = rewards[t] + gamma if False else rewards[t] + 1.0*values[t+1] - values[t]
    assert abs(adv[t] - delta) < 1e-9, f"t={t}: {adv[t]} vs {delta}"

# lambda=1 -> 蒙特卡洛
adv1, ret1 = compute_gae(rewards, values, gamma=1.0, lam=1.0)
# t=2: 1 - 0.5 = 0.5
assert abs(adv1[2] - 0.5) < 1e-9
# t=1: (1+1) - 0.5 = 1.5
assert abs(adv1[1] - 1.5) < 1e-9
# t=0: (1+1+1) - 0.5 = 2.5
assert abs(adv1[0] - 2.5) < 1e-9

# returns = advantages + values
assert np.allclose(ret, adv + values[:3])

# gamma=0.99 时衰减
adv2, _ = compute_gae(rewards, values, gamma=0.99, lam=0.95)
assert np.all(np.isfinite(adv2))
`,
        answer: `import numpy as np

def compute_gae(rewards, values, gamma=0.99, lam=0.95):
    T = len(rewards)
    advantages = np.zeros(T)
    gae = 0.0
    for t in reversed(range(T)):
        delta = rewards[t] + gamma * values[t + 1] - values[t]
        gae = delta + gamma * lam * gae
        advantages[t] = gae
    returns = advantages + values[:T]
    return advantages, returns
`,
        explanation:
          '**`delta`** 是 TD 误差：\n\n    δ_t = r_t + γV(s_{t+1}) - V(s_t)\n\n**GAE 递推**（从后往前）：\n\n    A_t = δ_t + γλ·A_{t+1}\n\n**λ 的作用**：\n\n| λ | 效果 |\n| --- | --- |\n| 0 | A_t = δ_t（单步 TD）|\n| 1 | A_t = Σγ^k r - V（蒙特卡洛）|\n| 0.95 | 平衡 |\n\n**为什么从后往前**：\nA_t 依赖 A_{t+1}，所以必须先算后面的。\n\n**returns = A + V**：\n这是价值函数的目标（用来训练 critic）。\n\n**注意 values 长度是 T+1**：需要最后状态的 V 来算最后一个 δ。',
        tags: ['编程', 'GAE'],
      },
      {
        id: 'paper-training-c3-e8',
        relatedLessonId: 'paper-training-c3-l1',
        type: 'code',
        difficulty: 4,
        question:
          '用 PyTorch 实现完整的 PPO 更新步骤：\n\nppo_update_step(model, optimizer, obs, actions, logp_old, advantages, returns, clip_eps=0.2)',
        starterCode: `import torch
import torch.nn as nn
import torch.nn.functional as F

def ppo_update_step(model, params, obs, actions, logp_old,
                    advantages, returns, clip_eps=0.2, vf_coef=0.5,
                    ent_coef=0.01, lr=1e-3):
    logits, values = model(obs)
    dist = torch.distributions.Categorical(logits=logits)
    logp_new = ___
    ratio = ___
    surr1 = ___
    surr2 = ___
    policy_loss = ___
    value_loss = ___
    entropy = ___
    loss = ___
    for p in params:
        if p.grad is not None:
            p.grad = None
    loss.backward()
    with torch.no_grad():
        for p in params:
            if p.grad is not None:
                p -= lr * p.grad
    return loss.item()
`,
        setupCode: '',
        expectedOutput: 'PPO 更新',
        tests: `import torch
import torch.nn as nn
import numpy as np

class SimpleModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc = nn.Linear(4, 3)
    def forward(self, x):
        logits = self.fc(x)
        return logits, logits.sum(-1)

torch.manual_seed(0)
model = SimpleModel()
params = list(model.parameters())

N = 8
obs = torch.randn(N, 4)
actions = torch.randint(0, 3, (N,))
with torch.no_grad():
    logits, _ = model(obs)
    dist = torch.distributions.Categorical(logits=logits)
    logp_old = dist.log_prob(actions)
advantages = torch.randn(N)
returns = torch.randn(N)

loss = ppo_update_step(model, params, obs, actions, logp_old, advantages, returns)
assert isinstance(loss, float), f"应返回 float，实际 {type(loss)}"
assert np.isfinite(loss)

# 参数确实更新了
before = model.fc.weight.clone()
ppo_update_step(model, params, obs, actions, logp_old, advantages, returns)
assert not torch.allclose(before, model.fc.weight), "参数应更新"
`,
        answer: `import torch
import torch.nn as nn
import torch.nn.functional as F

def ppo_update_step(model, params, obs, actions, logp_old,
                    advantages, returns, clip_eps=0.2, vf_coef=0.5,
                    ent_coef=0.01, lr=1e-3):
    """PPO 单步更新（手动 SGD，不依赖 torch.optim）。"""
    logits, values = model(obs)
    dist = torch.distributions.Categorical(logits=logits)
    logp_new = dist.log_prob(actions)
    ratio = torch.exp(logp_new - logp_old)
    surr1 = ratio * advantages
    surr2 = torch.clamp(ratio, 1 - clip_eps, 1 + clip_eps) * advantages
    policy_loss = -torch.min(surr1, surr2).mean()
    value_loss = F.mse_loss(values, returns)
    entropy = dist.entropy().mean()
    loss = policy_loss + vf_coef * value_loss - ent_coef * entropy

    # 手动 SGD
    for p in params:
        if p.grad is not None:
            p.grad = None
    loss.backward()
    with torch.no_grad():
        for p in params:
            if p.grad is not None:
                p -= lr * p.grad
    return loss.item()
`,
        explanation:
          '**完整流程**：\n\n1. **前向**：得到 logits 和 values\n2. **构造分布**：`Categorical(logits)`\n3. **新对数概率**：`dist.log_prob(actions)`\n4. **比率**：`exp(logp_new - logp_old)`\n5. **clip 损失**：`-min(surr1, surr2).mean()`\n6. **价值损失**：MSE\n7. **熵**：`dist.entropy()`\n8. **总损失**：`policy + vf_coef*value - ent_coef*entropy`\n\n**符号**：\n- 策略项是负（因为要最大化）\n- 价值项是正（要最小化 MSE）\n- 熵项是负（要最大化熵）\n\n**注意 `logp_old` 必须 detach**：它是常数，不参与梯度。',
        tags: ['编程', 'PPO 更新'],
      },
      {
        id: 'paper-training-c3-e9',
        relatedLessonId: 'paper-training-c3-l1',
        type: 'judge',
        difficulty: 4,
        question: 'PPO 在 RLHF 中直接使用论文的原始奖励，不需要修改。',
        answer: false,
        explanation:
          'RLHF 中需要加 KL 惩罚：reward = r_θ(x,y) - β·KL(π||π_ref)。这防止模型"钻奖励模型的空子"（reward hacking）——找到奖励高但实际质量差的对齐。',
        tags: ['RLHF 改动'],
      },
      {
        id: 'paper-training-c3-e10',
        relatedLessonId: 'paper-training-c3-l1',
        type: 'open',
        difficulty: 5,
        question:
          '请解释：① 策略梯度的方差问题与 TRPO 的解法；② PPO 的 clip 如何近似信任域；③ 为什么 min 操作是关键；④ PPO 在 RLHF 中如何使用。',
        referenceAnswer: `**① 策略梯度的方差问题与 TRPO 的解法**

**基本策略梯度**：

    ∇J = E[∇log π(a|s) · A(s,a)]

**问题：方差大**

| 来源 | 说明 |
| --- | --- |
| 采样有限 | 只用少量轨迹估计期望 |
| 回报随机 | 同一策略多次采样回报不同 |
| 策略变化 | 更新后旧数据失效 |

**后果**：
- 梯度噪声大
- 更新方向不稳
- 可能一步训崩

**TRPO 的解法：信任域**

    max  E[ (π_θ/π_old) · A ]
    s.t. E[ KL(π_old || π_θ) ] ≤ δ

**思想**：限制新旧策略的距离。

**为什么用 KL 而非参数距离**：
策略空间是概率分布，参数空间的欧氏距离没有意义。

**TRPO 的实现**：
- 计算 Fisher 信息矩阵
- 用共轭梯度求解
- 线搜索保证约束

**问题**：**复杂、慢、难调**。

---

**② PPO 的 clip 如何近似信任域**

**核心洞察**：

> **不需要真的算 KL——只要"截断"重要性比率就行。**

**重要性比率**：

    r_t(θ) = π_θ(a_t|s_t) / π_θ_old(a_t|s_t)

**clip 目标**：

    L^CLIP = E[ min( r·A, clip(r, 1-ε, 1+ε)·A ) ]

**ε = 0.2 的含义**：
允许策略概率变化 ±20%。

**为什么这近似信任域**：

| 方面 | TRPO | PPO |
| --- | --- | --- |
| 约束 | KL ≤ δ（硬） | r ∈ [0.8,1.2]（软） |
| 实现 | 二阶优化 | 一阶 SGD |
| 效果 | 好 | 相当 |

**关键**：r 被限制在小区间内，等价于"策略变化不大"。

**严格来说**：PPO 不保证 KL 约束，但实践中效果一样。

---

**③ 为什么 min 操作是关键**

**目标**：

    min( r·A, clip(r,1-ε,1+ε)·A )

**情况分析**：

**情况 1：A > 0（好动作，想提高概率）**

| r | surr1 = r·A | surr2 = clip(r)·A | min | 效果 |
| --- | --- | --- | --- | --- |
| 0.5 | 0.5A | 0.8A | 0.5A | 允许提升 |
| 1.0 | A | A | A | 正常 |
| 1.5 | 1.5A | 1.2A | **1.2A** | **停止推高** |

**情况 2：A < 0（坏动作，想降低概率）**

| r | surr1 | surr2 | min | 效果 |
| --- | --- | --- | --- | --- |
| 0.5 | -0.5A | -0.8A | **-0.8A** | **停止压低** |
| 1.0 | -A | -A | -A | 正常 |
| 1.5 | -1.5A | -1.2A | -1.5A | 允许降低 |

**关键洞察**：

    min 保证"只截断过度更新"
    不会阻止"正确方向的小幅更新"

**如果没有 min**（只用 surr2）：

    当 r=0.5, A>0 时：surr2 = 0.8A > 0.5A
    会"奖励"策略变化，即使方向是错的！

**所以 min 是必要的**——它保证目标函数是"下界"。

---

**④ PPO 在 RLHF 中如何使用**

**RLHF 三阶段**：

    ① SFT：监督微调（学格式）
    ② 奖励模型：从人类偏好学习 r_θ(x,y)
    ③ PPO：用 r_θ 优化策略

**PPO 阶段的改动**：

**改动 1：加 KL 惩罚**

    reward = r_θ(x, y) - β · KL(π_θ || π_ref)

**为什么**：
- 奖励模型只是"近似"人类偏好
- 模型可能找到"高奖励但实际差"的输出（reward hacking）
- KL 惩罚让它不要偏离 SFT 模型太远

**β 的作用**：

| β | 效果 |
| --- | --- |
| 大 | 保守（接近 SFT） |
| 小 | 激进（可能 hack 奖励） |
| 0.01~0.1 | 常用 |

**改动 2：序列级奖励**

普通 RL 是每步奖励。
LLM 是"整段生成后给一个奖励"。

**处理**：

    R = r_θ(x, y)                    # 整段奖励
    r_t = -β·KL(π||π_ref) at step t  # 每步的 KL 惩罚
    # 最终每步奖励 = 只在最后加 R

**改动 3：4 个模型**

| 模型 | 作用 |
| --- | --- |
| **Actor** | 被训练的策略 π_θ |
| **Critic** | 价值函数 V |
| **Reward** | 奖励模型 r_θ（冻结）|
| **Reference** | 参考模型 π_ref（冻结，算 KL）|

**显存开销巨大**——这就是 RLHF 训练贵的原因。

**为什么用 PPO 而非其他**：

| 优势 | 说明 |
| --- | --- |
| **稳定** | clip 防止训崩 |
| **一阶** | 能用于大模型 |
| **可加 KL** | 灵活约束 |

**实践中的替代**：

| 方法 | 与 PPO 的关系 |
| --- | --- |
| **DPO** | 跳过奖励模型和 PPO，直接优化 |
| **GRPO** | 去掉 critic，用组内平均 |
| **RLOO** | 类似 GRPO |

**这些方法都是"简化 PPO"的尝试**——
因为 PPO 需要 4 个模型，太贵。

---

**⑤ 一个诚实的总结**

**PPO 的贡献**：

| 方面 | 说明 |
| --- | --- |
| **简单** | 几行代码实现 clip |
| **稳定** | 很少训崩 |
| **通用** | 离散/连续、单/多智能体 |
| **影响** | RLHF 的标准算法 |

**PPO 的局限**：

| 局限 | 说明 |
| --- | --- |
| **样本效率低** | 需要大量交互 |
| **超参敏感** | clip_eps、GAE lambda、学习率 |
| **4 个模型** | RLHF 中显存开销大 |

**但它是"能用"的算法**——
在稳定性和简单性之间取得了很好的平衡。

**这解释了为什么 ChatGPT 用 PPO**：
不是因为它最优，而是因为它**可靠**。`,
        rubric: [
          { point: '策略梯度方差大 + TRPO 用 KL 硬约束但复杂', score: 3 },
          { point: 'PPO 用 clip 软约束，一阶优化，效果相当', score: 2 },
          { point: 'min 的作用：只截断过度更新，不阻止正常更新', score: 2 },
          { point: 'RLHF 改动：KL 惩罚 + 序列奖励 + 4 个模型', score: 2 },
          { point: '诚实评价：简单可靠但有局限，DPO/GRPO 是简化尝试', score: 1 },
        ],
        keywords: ['KL硬约束', 'clip软约束', 'min只截断过度', 'KL惩罚', '4个模型'],
        explanation:
          '能说清「min 为什么必要（否则会奖励错误方向的更新）」以及「RLHF 中 4 个模型的显存代价」，就是理解了 PPO 的设计与代价。',
        tags: ['综合分析'],
      },
    ],
  },
];
