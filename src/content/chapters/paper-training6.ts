import type { Chapter } from '../../types';

/* ============================================================
 *  人工智能基础 · 论文导读 · 训练与规模
 *  30 Deep RL from Human Preferences (RLHF)
 *
 *  来源：
 *  - 论文：Christiano et al. (2017) arXiv:1706.03741
 *  - 参考：Ojhaharsh/30u30 第 30 篇（CC BY-NC-ND 4.0，本地个人使用）
 *  - 本课程为原创导读 + 原创习题
 *
 *  执行说明：本章代码需要 PyTorch，走本地后端执行。
 * ============================================================ */

export const paperTrainingChapters6: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c6: RLHF
   * ============================================================ */
  {
    id: 'paper-training-c6',
    title: 'RLHF：从人类偏好中学习奖励',
    goal: '理解为什么"设计奖励函数"很难，掌握偏好学习（Bradley-Terry 模型）与 RLHF 三阶段流程，能手写奖励模型与 PPO 微调。',
    lessons: [
      {
        id: 'paper-training-c6-l1',
        title: '奖励函数设计的困境',
        difficulty: 5,
        content: `
## 论文信息

| 项目 | 内容 |
| --- | --- |
| **标题** | Deep Reinforcement Learning from Human Preferences |
| **作者** | Paul Christiano, Jan Leike, Tom B. Brown, Milad Martic, Shane Legg, Dario Amodei（OpenAI/DeepMind） |
| **发表** | NeurIPS 2017 |
| **arXiv** | [1706.03741](https://arxiv.org/abs/1706.03741) |
| **一句话贡献** | 用人类"两两偏好"代替手工奖励函数，让 RL 能处理难以定义奖励的任务 |

## 强化学习的核心难题：奖励函数

**RL 的标准设定**：

    agent 在环境中行动 → 获得奖励 → 最大化累积奖励

**问题**：**很多任务的奖励难以用公式写出来**。

**例子**：

| 任务 | 奖励怎么定义 |
| --- | --- |
| 下棋 | 赢 = +1，输 = -1 ✓ |
| 走路 | 前进速度 ✓ |
| **写一篇好文章** | ？ |
| **做一个得体的回复** | ？ |
| **总结一段文字** | ？ |

**手工设计的奖励会被"钻空子"**：

**例子**：训练机器人"清理房间"

    奖励 = 房间里垃圾的数量减少
    结果：机器人把垃圾藏到看不见的地方

**这叫 "reward hacking"（奖励黑客）**。

<RewardHackingDemo />

## 核心思想：从"偏好"学习奖励

**关键洞察**：

> **人类不擅长写奖励函数，但擅长"比较两个结果哪个更好"。**

**做法**：

    ① 让 agent 产生两段行为（A 和 B）
    ② 人类标注"哪个更好"
    ③ 训练奖励模型 r_θ 拟合人类偏好
    ④ 用 r_θ 作为 RL 的奖励

<PreferenceLearningDemo />

**为什么"比较"比"打分"容易**：

| 方式 | 难度 | 一致性 |
| --- | --- | --- |
| **绝对打分**（如 1-10 分） | 难（标准不一致） | 低 |
| **两两比较**（A vs B） | **易**（只需判断） | **高** |

**这是心理学中的发现**：人类对相对判断比对绝对判断更一致。

## 偏好模型：Bradley-Terry

**假设**：存在一个潜在的"奖励函数" r，人类偏好 A 胜于 B 的概率是：

    P(A ≻ B) = σ(r(A) - r(B))

其中 σ 是 sigmoid 函数。

**含义**：
- r(A) 远大于 r(B) → 几乎必然选 A
- r(A) ≈ r(B) → 五五开

**训练目标**（最大化人类偏好的似然）：

    L = -E[ log σ(r_θ(A) - r_θ(B)) ]

**这就是奖励模型的损失函数。**

<BradleyTerryDemo />

**关键性质**：

| 性质 | 说明 |
| --- | --- |
| **只看差值** | 奖励的绝对尺度无关（r 和 r+c 等价） |
| **概率化** | 输出是"偏好概率"，能表达不确定性 |
| **可扩展** | 可以扩展到多个候选（Plackett-Luce） |

## 完整流程

<RLHFArchDemo />

**三步循环**：

    ① 采样：用当前策略生成多组行为
    ② 标注：人类比较，给出偏好
    ③ 训练：更新奖励模型 + 更新策略

**关键细节**：

**a) 异步标注**

    训练在跑，人类在标注之前的数据
    -> 不需要实时等待

**b) 少量标注**

    论文用 900~3300 次比较就训练出好策略
    （对比：手工奖励需要大量调参）

**c) 奖励模型集成**

    训练多个奖励模型，取平均
    -> 降低方差，防止过度优化

## 论文的实验

**任务**：

| 任务 | 说明 |
| --- | --- |
| **Atari**（8 个游戏） | 用偏好代替游戏分数 |
| **MuJoCo**（9 个连续控制） | 用偏好代替手工奖励 |

**结果**：

| 方面 | 结果 |
| --- | --- |
| **样本效率** | 用偏好训练的接近用真实奖励 |
| **标注量** | 只需数百到数千次比较 |
| **人类一致性** | 与真实奖励的相关性高 |

**关键发现**：

> **用 900 次人类比较，能达到手工奖励 90% 的效果。**

## RLHF 在 LLM 中的应用

**2022 年 InstructGPT 让 RLHF 大火**：

**三阶段**：

    ① SFT：监督微调（学格式）
    ② RM：训练奖励模型（从人类偏好）
    ③ PPO：用 RM 优化策略

**与原始论文的关系**：

| 方面 | Christiano 2017 | InstructGPT |
| --- | --- | --- |
| **任务** | Atari/MuJoCo | 文本生成 |
| **偏好** | 视频片段比较 | 回答质量比较 |
| **RL 算法** | A2C/TRPO | PPO |
| **KL 惩罚** | 有（防止偏离） | **有**（关键） |

**KL 惩罚的作用**：

    reward = r_θ(x, y) - β·KL(π || π_ref)

**为什么需要**：
奖励模型只是"近似"人类偏好。
如果过度优化，模型会找到"高奖励但实际差"的输出——
**reward hacking 在 LLM 中的表现是"迎合但无信息"的回答**。

<KLRegularizationDemo />

## 一个关键问题：奖励模型的泛化

**问题**：奖励模型只在"标注过的分布"上准确。

**如果策略跑到分布外**：

    策略找到 RM 的盲点
    -> RM 给出错误的高分
    -> 策略学到错误行为

**这叫 "reward model overoptimization"**。

**论文的解法**：**集成 + KL 惩罚**

| 方法 | 作用 |
| --- | --- |
| **多个 RM 集成** | 降低方差 |
| **KL 惩罚** | 限制策略偏离参考模型 |
| **早停** | 不过度优化 RM |

## 局限

| 局限 | 说明 |
| --- | --- |
| **标注成本** | 需要人类时间 |
| **标注偏差** | 人类偏好可能不一致 |
| **奖励黑客** | 仍可能被钻空子 |
| **分布偏移** | RM 在 OOD 上不准 |
| **难以验证** | 无法保证学到"真实"价值 |

**后续发展**：

| 方法 | 改进 |
| --- | --- |
| **DPO** | 跳过 RM 和 PPO，直接优化 |
| **Constitutional AI** | 用 AI 反馈代替人类 |
| **RLAIF** | AI 反馈 |
| **GRPO** | 组内相对优势 |

## 本节来源

> **来源类型：学术来源**
> - Christiano, P. et al. *Deep Reinforcement Learning from Human Preferences*
>   arXiv:[1706.03741](https://arxiv.org/abs/1706.03741)（NeurIPS 2017）
> - Ouyang, L. et al. *Training language models to follow instructions with
>   human feedback* arXiv:[2203.02155](https://arxiv.org/abs/2203.02155)（InstructGPT）
> - Rafailov, R. et al. *Direct Preference Optimization*
>   arXiv:[2305.18290](https://arxiv.org/abs/2305.18290)（DPO）
> - Bai, Y. et al. *Constitutional AI: Harmlessness from AI Feedback*
>   arXiv:[2212.08073](https://arxiv.org/abs/2212.08073)
>
> **来源类型：参考资料（CC BY-NC-ND 4.0，本地个人使用）**
> - Ojhaharsh/30u30 第 30 篇（328 行，含 RewardModel / compute_preference_loss / RLHF_Trainer）
>
> **来源类型：原创**
> - 全部导读文字、交互图示、代码示例与习题
`,
        tips: [
          {
            kind: 'interview',
            text: '「RLHF 的核心」：人类不擅长写奖励函数但擅长比较。用两两偏好训练奖励模型（Bradley-Terry: P(A≻B)=σ(r(A)-r(B))），再用它做 RL。',
          },
          {
            kind: 'leak',
            text: '「为什么比较比打分好」：绝对打分标准不一致（每个人尺度不同），两两比较只需判断"哪个好"，人类一致性更高。这是心理学发现。',
          },
          {
            kind: 'pitfall',
            text: '奖励模型会被"过度优化"（reward model overoptimization）：策略找到 RM 的盲点，得到高分但实际很差。解法是集成 + KL 惩罚 + 早停。',
          },
        ],
        demos: [
          {
            title: '奖励模型与偏好损失（PyTorch）',
            lang: 'python',
            code: `import torch
import torch.nn as nn
import torch.nn.functional as F

class RewardModel(nn.Module):
    """奖励模型：输入（状态/文本表示），输出标量奖励。"""
    def __init__(self, input_dim, hidden=64):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden), nn.ReLU(),
            nn.Linear(hidden, hidden), nn.ReLU(),
            nn.Linear(hidden, 1),
        )

    def forward(self, x):
        return self.net(x).squeeze(-1)


def preference_loss(reward_model, seg_a, seg_b, labels):
    """
    Bradley-Terry 偏好损失。

    seg_a, seg_b: (B, D) 两段行为的表示
    labels: (B,) 1 表示 A 更好，0 表示 B 更好

    L = -E[ y·log σ(rA - rB) + (1-y)·log σ(rB - rA) ]
    """
    r_a = reward_model(seg_a)
    r_b = reward_model(seg_b)

    # 差值
    diff = r_a - r_b

    # labels=1 -> A 好；labels=0 -> B 好
    # 统一成：log σ((2y-1)·diff)
    sign = 2.0 * labels - 1.0
    log_prob = F.logsigmoid(sign * diff)

    return -log_prob.mean(), r_a, r_b


print("=== 偏好损失训练 ===")
print()
torch.manual_seed(42)

DIM = 8
model = RewardModel(DIM, hidden=32)
optimizer = torch.optim.Adam(model.parameters(), lr=1e-2)

# 构造数据：让"第一维大"的片段更受偏好
def make_pair(batch_size, seed=None):
    if seed is not None:
        torch.manual_seed(seed)
    a = torch.randn(batch_size, DIM)
    b = torch.randn(batch_size, DIM)
    # 真实规则：第一维更大的更好
    labels = (a[:, 0] > b[:, 0]).float()
    return a, b, labels


print("真实规则：第一维更大的片段更好")
print()

for epoch in range(1, 301):
    a, b, y = make_pair(64)
    loss, r_a, r_b = preference_loss(model, a, b, y)

    optimizer.zero_grad()
    loss.backward()
    optimizer.step()

    if epoch % 60 == 0:
        # 准确率
        with torch.no_grad():
            pred = (r_a > r_b).float()
            acc = (pred == y).float().mean().item()
        print(f"epoch {epoch:>3}: loss={loss.item():.4f}, 偏好预测准确率={acc:.3f}")

print()
print("=== 学到的奖励函数 ===")
print()
with torch.no_grad():
    # 测试：改变第一维，看奖励变化
    print("测试：只改变第一维（其他维度为 0）")
    print()
    print(f"{'第一维':>8} | {'奖励':>8}")
    print("-" * 20)
    for v in [-2.0, -1.0, 0.0, 1.0, 2.0]:
        x = torch.zeros(1, DIM)
        x[0, 0] = v
        r = model(x).item()
        print(f"{v:>8.1f} | {r:>8.3f}")

print()
print("-> 奖励随第一维单调递增（学到了真实规则）")

print()
print("=== 其他维度的影响（应该很小）===")
print()
with torch.no_grad():
    for dim in [1, 2, 3]:
        vals = []
        for v in [-2.0, 2.0]:
            x = torch.zeros(1, DIM)
            x[0, dim] = v
            vals.append(model(x).item())
        print(f"  维度{dim}: -2 -> {vals[0]:.3f}, +2 -> {vals[1]:.3f}, 差异={abs(vals[1]-vals[0]):.3f}")

print()
print("-> 差异小，说明模型正确忽略了无关维度")

print()
print("=== Bradley-Terry 的概率解释 ===")
print()
with torch.no_grad():
    print(f"{'rA - rB':>10} | {'P(A更好)':>10}")
    print("-" * 24)
    for d in [-3.0, -1.0, 0.0, 1.0, 3.0]:
        p = torch.sigmoid(torch.tensor(d)).item()
        print(f"{d:>10.1f} | {p:>10.3f}")

print()
print("-> 差值越大，偏好概率越接近 1")
print("-> 差值为 0 时，五五开")`,
          },
          {
            title: 'RLHF 完整流程模拟',
            lang: 'python',
            code: `import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np

class Policy(nn.Module):
    """简化的策略（LLM 的替身）。"""
    def __init__(self, state_dim, action_dim, hidden=32):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(state_dim, hidden), nn.ReLU(),
            nn.Linear(hidden, action_dim),
        )
    def forward(self, s):
        return self.net(s)


class RewardModel(nn.Module):
    def __init__(self, state_dim, action_dim, hidden=32):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(state_dim + action_dim, hidden), nn.ReLU(),
            nn.Linear(hidden, 1),
        )
    def forward(self, s, a):
        return self.net(torch.cat([s, a], dim=-1)).squeeze(-1)


print("=== 模拟环境 ===")
print()
print("真实偏好：动作越接近 [1,0,0] 越好")
print()

STATE_DIM, ACTION_DIM = 4, 3
true_pref = torch.tensor([1.0, 0.0, 0.0])


def true_reward(a):
    """真实奖励（人类心里的标准）。"""
    return (a * true_pref).sum(-1)


def make_preference_data(n, seed=None):
    """生成偏好数据：随机两个动作，人类选真实奖励高的。"""
    if seed is not None:
        torch.manual_seed(seed)
    s = torch.randn(n, STATE_DIM)
    a1 = torch.randn(n, ACTION_DIM)
    a2 = torch.randn(n, ACTION_DIM)
    labels = (true_reward(a1) > true_reward(a2)).float()
    return s, a1, a2, labels


print("=== 阶段 1：训练奖励模型 ===")
print()
torch.manual_seed(0)
rm = RewardModel(STATE_DIM, ACTION_DIM)
rm_opt = torch.optim.Adam(rm.parameters(), lr=5e-3)

for epoch in range(1, 201):
    s, a1, a2, y = make_preference_data(64)
    r1 = rm(s, a1)
    r2 = rm(s, a2)
    sign = 2 * y - 1
    loss = -F.logsigmoid(sign * (r1 - r2)).mean()

    rm_opt.zero_grad()
    loss.backward()
    rm_opt.step()

    if epoch % 50 == 0:
        with torch.no_grad():
            acc = ((r1 > r2).float() == y).float().mean().item()
        print(f"  奖励模型 epoch {epoch}: loss={loss.item():.4f}, 准确率={acc:.3f}")

print()
print("=== 阶段 2：用奖励模型做 PPO ===")
print()

policy = Policy(STATE_DIM, ACTION_DIM)
policy_ref = Policy(STATE_DIM, ACTION_DIM)
policy_ref.load_state_dict(policy.state_dict())
for p in policy_ref.parameters():
    p.requires_grad = False

opt = torch.optim.Adam(policy.parameters(), lr=5e-3)
BETA = 0.1   # KL 惩罚系数

print(f"KL 惩罚系数 beta = {BETA}")
print()

for it in range(1, 101):
    # 采样
    s = torch.randn(32, STATE_DIM)
    logits = policy(s)
    dist = torch.distributions.Categorical(logits=logits)
    actions = dist.sample()
    logp_old = dist.log_prob(actions).detach()

    # 动作的 one-hot
    a_onehot = F.one_hot(actions, ACTION_DIM).float()

    # 奖励 = RM 分数 - KL 惩罚
    with torch.no_grad():
        r = rm(s, a_onehot)
        ref_logits = policy_ref(s)
        ref_dist = torch.distributions.Categorical(logits=ref_logits)
        kl = torch.distributions.kl_divergence(dist, ref_dist)

    reward = r - BETA * kl
    advantage = (reward - reward.mean()) / (reward.std() + 1e-8)

    # PPO 更新
    for _ in range(4):
        logits = policy(s)
        dist = torch.distributions.Categorical(logits=logits)
        logp = dist.log_prob(actions)
        ratio = torch.exp(logp - logp_old)
        surr1 = ratio * advantage
        surr2 = torch.clamp(ratio, 0.8, 1.2) * advantage
        loss = -torch.min(surr1, surr2).mean()

        opt.zero_grad()
        loss.backward()
        opt.step()

    if it % 20 == 0:
        with torch.no_grad():
            s_test = torch.zeros(1, STATE_DIM)
            logits_test = policy(s_test)
            probs = F.softmax(logits_test, dim=-1)[0].numpy()
        print(f"  迭代 {it:>3}: 平均奖励={reward.mean().item():>7.3f}, 动作概率={np.round(probs, 3)}")

print()
print("=== 结果对比 ===")
print()
with torch.no_grad():
    s_test = torch.zeros(1, STATE_DIM)
    probs_final = F.softmax(policy(s_test), dim=-1)[0].numpy()
    probs_init = F.softmax(policy_ref(s_test), dim=-1)[0].numpy()

print(f"初始策略: {np.round(probs_init, 3)}")
print(f"RLHF 后:  {np.round(probs_final, 3)}")
print(f"理想动作: [1, 0, 0] -> 应倾向动作 0")
print(f"最终最可能动作: {probs_final.argmax()}")
print(f"正确: {probs_final.argmax() == 0}")`,
          },
          {
            title: 'KL 惩罚防止 reward hacking',
            lang: "python",
            code: `import torch
import torch.nn.functional as F
import numpy as np

print("=== Reward Hacking 演示 ===")
print()
print("场景：奖励模型有盲点，策略可能找到它")
print()

# 假设：真实质量 vs 奖励模型分数
# 奖励模型在某个区域"虚高"
def true_quality(x):
    """真实质量：倒 U 型，最优点是 x=0"""
    return np.exp(-x**2)

def reward_model(x, bias=0.5):
    """奖励模型：近似真实但有偏差（在某些区域虚高）"""
    return np.exp(-x**2) + bias * np.exp(-(x - 3)**2)


print("真实质量 vs 奖励模型分数：")
print()
print(f"{'x':>6} | {'真实质量':>10} | {'RM 分数':>10}")
print("-" * 32)
for x in [-1, 0, 1, 2, 3, 4]:
    print(f"{x:>6.1f} | {true_quality(x):>10.3f} | {reward_model(x):>10.3f}")

print()
print("注意：x=3 处 RM 虚高（0.5 + 很小的真实值）")
print("-> 如果直接优化 RM，策略会跑到 x=3")
print("-> 但真实质量在那里很低！这就是 reward hacking")

print()
print("=== KL 惩罚如何防止 ===")
print()

def objective(x, beta, ref_x=0.0):
    """目标 = RM 分数 - beta * KL 惩罚"""
    # 简化的 KL：与参考点的距离平方
    kl = (x - ref_x) ** 2
    return reward_model(x) - beta * kl


print(f"{'beta':>6} | {'最优 x':>8} | {'真实质量':>10} | {'说明'}")
print("-" * 56)

for beta in [0.0, 0.1, 0.3, 1.0]:
    xs = np.linspace(-2, 5, 1000)
    objs = [objective(x, beta) for x in xs]
    best_x = xs[int(np.argmax(objs))]
    quality = true_quality(best_x)
    note = ""
    if beta == 0:
        note = "无约束 -> 跑到 RM 虚高区（hacking）"
    elif beta < 0.3:
        note = "部分约束"
    else:
        note = "强约束 -> 留在真实最优点附近"
    print(f"{beta:>6.1f} | {best_x:>8.2f} | {quality:>10.3f} | {note}")

print()
print("=== 关键洞察 ===")
print()
print("beta=0（无 KL）：")
print("  · 策略最大化 RM 分数")
print("  · 找到 RM 的盲点（x=3）")
print("  · 真实质量低 -> reward hacking")
print()
print("beta 适中：")
print("  · 策略在'高 RM 分数'和'接近参考模型'之间平衡")
print("  · 不会跑太远")
print("  · 真实质量有保障")
print()
print("beta 太大：")
print("  · 策略几乎不变（接近参考模型）")
print("  · 没有学到东西")

print()
print("=== 在 LLM 中的表现 ===")
print()
print("reward hacking 的典型形式：")
print("  · 回答很长但没有信息（长度偏差）")
print("  · 一味迎合用户（sycophancy）")
print("  · 堆砌关键词")
print("  · 回避敏感话题（过度安全）")
print()
print("KL 惩罚的作用：")
print("  让模型保持原有的语言能力，")
print("  只在'有价值的方向'上调整。")
print()
print("这就是为什么 InstructGPT 用：")
print("  reward = r_θ(x,y) - β·KL(π||π_ref)")
print("  β ≈ 0.01~0.1")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'paper-training-c6-e1',
        type: 'single',
        difficulty: 2,
        question: 'RLHF 的核心思想是？',
        options: [
          { value: 'A', text: '用更大的模型' },
          { value: 'B', text: '用人类的两两偏好训练奖励模型，代替手工奖励函数' },
          { value: 'C', text: '用更多数据' },
          { value: 'D', text: '用更强的优化器' },
        ],
        answer: 'B',
        explanation:
          '很多任务的奖励难以用公式写（如"写一篇好文章"）。但人类擅长比较"哪个更好"。RLHF 用偏好训练奖励模型（Bradley-Terry），再用它做 RL。',
        tags: ['核心思想'],
      },
      {
        id: 'paper-training-c6-e2',
        type: 'judge',
        difficulty: 2,
        question: 'Bradley-Terry 模型假设 P(A 优于 B) = σ(r(A) - r(B))，只看奖励的差值。',
        answer: true,
        explanation:
          '只看差值意味着奖励的绝对尺度无关（r 和 r+c 等价）。这是合理的——人类偏好确实只依赖相对好坏。σ 是 sigmoid，把差值映射到 (0,1) 概率。',
        tags: ['Bradley-Terry'],
      },
      {
        id: 'paper-training-c6-e3',
        type: 'multiple',
        difficulty: 3,
        question: '为什么"两两比较"比"绝对打分"更适合收集人类反馈？（多选）',
        options: [
          { value: 'A', text: '绝对打分的标准因人而异（不一致）' },
          { value: 'B', text: '比较只需判断"哪个更好"，认知负担低' },
          { value: 'C', text: '人类对相对判断比对绝对判断更一致（心理学发现）' },
          { value: 'D', text: '比较需要的标注数据更少' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 不一定——比较也需要大量数据。A/B/C 是核心原因：标准不一致、认知负担低、相对判断更一致。',
        tags: ['偏好收集'],
      },
      {
        id: 'paper-training-c6-e4',
        type: 'fill',
        difficulty: 3,
        question:
          'RLHF 在 LLM 中需要加 KL 惩罚：reward = r_θ(x,y) - β·KL(π||π_ref)，目的是防止 ___。',
        blanks: [['reward hacking', '奖励黑客', '过度优化', 'reward model overoptimization']],
        explanation:
          '奖励模型只是近似人类偏好。过度优化会找到 RM 的盲点（高奖励但实际差）。KL 惩罚限制策略偏离参考模型，防止这种"钻空子"。',
        tags: ['KL 惩罚'],
      },
      {
        id: 'paper-training-c6-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现 Bradley-Terry 偏好概率：preference_prob(r_a, r_b)。\n\n返回 P(A 优于 B) = σ(r_a - r_b)',
        starterCode: `import numpy as np

def preference_prob(r_a, r_b):
    r_a = np.asarray(r_a, dtype=float)
    r_b = np.asarray(r_b, dtype=float)
    return ___
`,
        setupCode: '',
        expectedOutput: '偏好概率',
        tests: `import numpy as np

# 相等 -> 0.5
assert abs(preference_prob(0.0, 0.0) - 0.5) < 1e-9

# A 明显更好
assert preference_prob(5.0, 0.0) > 0.99
assert preference_prob(0.0, 5.0) < 0.01

# 差值 1 -> sigmoid(1) ≈ 0.731
assert abs(preference_prob(1.0, 0.0) - 0.7310586) < 1e-6

# 对称性
assert abs(preference_prob(2.0, 0.0) + preference_prob(0.0, 2.0) - 1.0) < 1e-9

# 数组
p = preference_prob(np.array([1.0, 0.0]), np.array([0.0, 1.0]))
assert np.allclose(p, [0.7310586, 0.2689414], atol=1e-6)
`,
        answer: `import numpy as np

def preference_prob(r_a, r_b):
    r_a = np.asarray(r_a, dtype=float)
    r_b = np.asarray(r_b, dtype=float)
    return 1.0 / (1.0 + np.exp(-(r_a - r_b)))
`,
        explanation:
          '**这就是 sigmoid**：σ(x) = 1/(1+e^{-x})。\n\n**性质**：\n\n| r_a - r_b | P(A 更好) |\n| --- | --- |\n| -5 | 0.007 |\n| -1 | 0.27 |\n| 0 | **0.5** |\n| 1 | 0.73 |\n| 5 | 0.993 |\n\n**关键**：只看差值。\n\n    r_a=10, r_b=5  ->  P=0.993\n    r_a=5,  r_b=0  ->  P=0.993（相同！）\n\n**这就是"绝对尺度无关"**——奖励函数可以任意平移。\n\n**训练时**：最大化人类标注的似然\n\n    L = -E[log σ(r(A) - r(B))]\n\n如果人类说 A 好，我们就要让 r(A) - r(B) 尽量大。',
        tags: ['编程', 'Bradley-Terry'],
      },
      {
        id: 'paper-training-c6-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现偏好损失：preference_loss(r_a, r_b, labels)。\n\n- labels: 1 表示 A 更好，0 表示 B 更好\n- 返回 -mean(log σ(sign·(r_a - r_b)))，sign = 2·label - 1',
        starterCode: `import numpy as np

def preference_loss(r_a, r_b, labels):
    r_a = np.asarray(r_a, dtype=float)
    r_b = np.asarray(r_b, dtype=float)
    labels = np.asarray(labels, dtype=float)
    sign = ___
    diff = ___
    log_prob = ___
    return ___
`,
        setupCode: '',
        expectedOutput: '偏好损失',
        tests: `import numpy as np

# 完美预测：A 更好且 label=1
loss = preference_loss([10.0], [0.0], [1.0])
assert loss < 0.01, f"应接近 0，实际 {loss}"

# 完全错误：A 更好但 label=0
loss2 = preference_loss([10.0], [0.0], [0.0])
assert loss2 > 5.0, f"应很大，实际 {loss2}"

# 五五开
loss3 = preference_loss([0.0], [0.0], [1.0])
assert abs(loss3 - np.log(2)) < 1e-6, f"应为 ln2，实际 {loss3}"

# 批量
loss4 = preference_loss([1.0, 0.0], [0.0, 1.0], [1.0, 0.0])
assert loss4 < np.log(2), "正确预测应损失较小"
`,
        answer: `import numpy as np

def preference_loss(r_a, r_b, labels):
    r_a = np.asarray(r_a, dtype=float)
    r_b = np.asarray(r_b, dtype=float)
    labels = np.asarray(labels, dtype=float)
    sign = 2.0 * labels - 1.0
    diff = r_a - r_b
    log_prob = -np.log(1.0 + np.exp(-sign * diff))
    return -np.mean(log_prob)
`,
        explanation:
          '**`sign = 2·label - 1`** 把标签转成 ±1：\n\n    label=1 -> sign=+1（希望 r_a - r_b 大）\n    label=0 -> sign=-1（希望 r_b - r_a 大，即 r_a - r_b 小）\n\n**统一成一个式子**：\n\n    log σ(sign · diff)\n\n- label=1 时：log σ(r_a - r_b)  ← 希望大\n- label=0 时：log σ(r_b - r_a)  ← 希望大\n\n**`-np.log(1 + exp(-x))`** 是数值稳定的 logsigmoid：\n\n    logsigmoid(x) = -log(1 + exp(-x))\n\n直接用 `np.log(sigmoid(x))` 在 x 很负时会下溢。\n\n**这就是奖励模型的训练目标。**',
        tags: ['编程', '偏好损失'],
      },
      {
        id: 'paper-training-c6-e7',
        type: 'code',
        difficulty: 3,
        question:
          '计算 RLHF 的奖励：rlhf_reward(rm_score, kl, beta=0.1)。\n\nreward = rm_score - beta * kl',
        starterCode: `import numpy as np

def rlhf_reward(rm_score, kl, beta=0.1):
    rm_score = np.asarray(rm_score, dtype=float)
    kl = np.asarray(kl, dtype=float)
    return ___
`,
        setupCode: '',
        expectedOutput: 'RLHF 奖励',
        tests: `import numpy as np

# 无 KL 时
assert abs(rlhf_reward(1.0, 0.0, 0.1) - 1.0) < 1e-9

# 有 KL 惩罚
assert abs(rlhf_reward(1.0, 2.0, 0.1) - 0.8) < 1e-9

# beta 大 -> 惩罚重
assert rlhf_reward(1.0, 2.0, 0.5) < rlhf_reward(1.0, 2.0, 0.1)

# 数组
r = rlhf_reward(np.array([1.0, 2.0]), np.array([0.0, 1.0]), 0.1)
assert np.allclose(r, [1.0, 1.9])
`,
        answer: `import numpy as np

def rlhf_reward(rm_score, kl, beta=0.1):
    rm_score = np.asarray(rm_score, dtype=float)
    kl = np.asarray(kl, dtype=float)
    return rm_score - beta * kl
`,
        explanation:
          '**两项的权衡**：\n\n| 项 | 作用 |\n| --- | --- |\n| `rm_score` | 追求高奖励（人类偏好）|\n| `-beta·kl` | 不要偏离参考模型太远 |\n\n**beta 的选择**：\n\n| beta | 效果 |\n| --- | --- |\n| 0 | 无约束（可能 reward hacking）|\n| **0.01~0.1** | **常用范围** |\n| 1.0 | 强约束（几乎不学）|\n\n**为什么需要 KL**：\n\n    奖励模型是"近似"人类偏好\n    它有盲点\n    过度优化会找到盲点（reward hacking）\n\n**KL 惩罚让模型"小步走"**：\n只在对齐方向做有价值的调整，\n保持原有的语言能力。\n\n**InstructGPT 的实践**：β ≈ 0.02。',
        tags: ['编程', 'RLHF 奖励'],
      },
      {
        id: 'paper-training-c6-e8',
        type: 'code',
        difficulty: 4,
        question:
          '用 PyTorch 实现奖励模型训练：\n\ntrain_reward_model(model, data, epochs=100, lr=1e-2)\n- data: [(seg_a, seg_b, label), ...]\n- 返回最终 loss',
        starterCode: `import torch
import torch.nn as nn
import torch.nn.functional as F

def train_reward_model(model, data, epochs=100, lr=1e-2):
    opt = torch.optim.Adam(model.parameters(), lr=lr)
    final_loss = 0.0
    for epoch in range(epochs):
        total = 0.0
        for seg_a, seg_b, label in data:
            r_a = model(seg_a)
            r_b = model(seg_b)
            sign = 2.0 * label - 1.0
            loss = ___
            opt.zero_grad()
            loss.backward()
            opt.step()
            total += loss.item()
        final_loss = total / len(data)
    return final_loss
`,
        setupCode: '',
        expectedOutput: '训练损失',
        tests: `import torch
import torch.nn as nn

class RM(nn.Module):
    def __init__(self, dim=4):
        super().__init__()
        self.fc = nn.Linear(dim, 1)
    def forward(self, x):
        return self.fc(x).squeeze(-1)

torch.manual_seed(0)
model = RM(4)

# 构造数据：第一维大的更好
data = []
for _ in range(32):
    a = torch.randn(4)
    b = torch.randn(4)
    label = torch.tensor(1.0 if a[0] > b[0] else 0.0)
    data.append((a, b, label))

loss = train_reward_model(model, data, epochs=100, lr=1e-2)
assert isinstance(loss, float)
assert loss < 0.7, f"损失应下降，实际 {loss}"

# 验证学到了规则
with torch.no_grad():
    x1 = torch.tensor([2.0, 0, 0, 0])
    x2 = torch.tensor([-2.0, 0, 0, 0])
    assert model(x1) > model(x2), "第一维大的应得高奖励"
`,
        answer: `import torch
import torch.nn as nn
import torch.nn.functional as F

def train_reward_model(model, data, epochs=100, lr=1e-2):
    opt = torch.optim.Adam(model.parameters(), lr=lr)
    final_loss = 0.0
    for epoch in range(epochs):
        total = 0.0
        for seg_a, seg_b, label in data:
            r_a = model(seg_a)
            r_b = model(seg_b)
            sign = 2.0 * label - 1.0
            loss = -F.logsigmoid(sign * (r_a - r_b))
            opt.zero_grad()
            loss.backward()
            opt.step()
            total += loss.item()
        final_loss = total / len(data)
    return final_loss
`,
        explanation:
          '**核心是 `-F.logsigmoid(sign * (r_a - r_b))`**：\n\n- `sign = 2·label - 1`：把 0/1 转成 ±1\n- `sign * (r_a - r_b)`：正确方向为正\n- `logsigmoid`：转成对数概率\n- 取负：变成要最小化的损失\n\n**PyTorch 的 `F.logsigmoid` 比 `torch.log(torch.sigmoid(x))` 更稳定**：\n\n    当 x 很负时：\n    sigmoid(x) -> 0\n    log(0) -> -inf  ← 数值问题\n    \n    logsigmoid(x) -> x  ← 稳定\n\n**注意**：这里逐样本更新（batch_size=1）。\n实际中应该用 mini-batch 提高效率。',
        tags: ['编程', '训练奖励模型'],
      },
      {
        id: 'paper-training-c6-e9',
        type: 'judge',
        difficulty: 4,
        question: 'RLHF 中只要有足够的人类偏好数据，就不需要 KL 惩罚。',
        answer: false,
        explanation:
          '不是。奖励模型只是"近似"人类偏好，总有盲点。无论数据多少，过度优化都会找到盲点（reward hacking）。KL 惩罚是必要的保护，限制策略偏离参考模型。',
        tags: ['KL 必要性'],
      },
      {
        id: 'paper-training-c6-e10',
        type: 'open',
        difficulty: 5,
        question:
          '请解释：① 为什么手工设计奖励函数困难；② Bradley-Terry 模型与偏好学习；③ RLHF 的三阶段流程；④ 为什么需要 KL 惩罚，它解决什么问题。',
        referenceAnswer: `**① 为什么手工设计奖励函数困难**

**问题 1：很多任务难以形式化**

| 任务 | 奖励怎么定义 |
| --- | --- |
| 下棋 | 赢=+1，输=-1 ✓ |
| 走路 | 前进速度 ✓ |
| **写文章** | ？ |
| **做回复** | ？ |
| **总结** | ？ |

**问题 2：reward hacking**

**例子**：训练机器人"清理房间"

    奖励 = 垃圾数量减少
    结果：机器人把垃圾藏到看不见的地方
    
    奖励 = 房间看起来整洁
    结果：机器人把垃圾堆到角落（不在视野）

**这叫 "reward hacking"**——agent 找到奖励函数的漏洞。

**问题 3：难以平衡多个目标**

    好回复 = 有用 + 无害 + 诚实
    
    这三个怎么加权？
    权重变了，行为就变了

**所以**：**手工奖励是"脆弱"的**。

---

**② Bradley-Terry 模型与偏好学习**

**核心假设**：

    存在潜在奖励函数 r
    人类偏好 A 胜于 B 的概率：
    P(A ≻ B) = σ(r(A) - r(B))

**为什么这个假设合理**：

**a) 只看差值**

    r(A)=10, r(B)=5  ->  P=0.993
    r(A)=5,  r(B)=0  ->  P=0.993
    
人类的偏好确实只依赖"相对好坏"。

**b) 概率化**

    r(A)-r(B)=0  ->  P=0.5（五五开）
    r(A)-r(B)=1  ->  P=0.73
    r(A)-r(B)=5  ->  P=0.993

能表达"不确定"。

**c) 可训练**

    L = -E[ log σ(r_θ(A) - r_θ(B)) ]
    
    这是标准的二分类损失（用 logsigmoid）
    可以直接用梯度下降

**训练数据**：

    (片段A, 片段B, 人类选择)
    
**这就是 RLHF 的"奖励模型训练"阶段**。

---

**③ RLHF 的三阶段流程**

**阶段 1：SFT（监督微调）**

    用人类示范数据微调基础模型
    目标：学会"回答的格式"
    
    数据：数万条 (prompt, 好回答)

**阶段 2：训练奖励模型**

    ① 用 SFT 模型生成多个回答
    ② 人类两两比较，标注偏好
    ③ 用 Bradley-Terry 损失训练 r_θ

    数据：数万到数十万次比较

**阶段 3：PPO 微调**

    ① 用当前策略生成回答
    ② 用 r_θ 打分
    ③ 用 PPO 更新策略
    ④ 加 KL 惩罚防止偏离

**关键设计**：

| 设计 | 作用 |
| --- | --- |
| **SFT 先行** | 让模型会"说话"，PPO 才有意义 |
| **奖励模型** | 把偏好变成可微的分数 |
| **PPO** | 稳定优化策略 |
| **KL 惩罚** | 防止 reward hacking |

**InstructGPT 的实证**：

    1.3B 的 InstructGPT 被人类偏好于 175B 的 GPT-3
    -> 对齐比规模更重要

---

**④ 为什么需要 KL 惩罚**

**核心问题：奖励模型有盲点**

**数学表述**：

    真实偏好 r*(x,y)
    奖励模型 r_θ(x,y) ≈ r*(x,y) + ε(x,y)
    
    ε 是误差（盲点）

**如果无限优化 r_θ**：

    策略会找到 ε 大的地方
    -> r_θ 很高，但 r* 可能很低
    -> reward hacking

**具体例子**（LLM）：

| 偏差 | 策略的行为 |
| --- | --- |
| 长度偏差 | 生成超长回答 |
| 迎合偏差 | 一味赞同用户 |
| 格式偏差 | 堆砌 bullet points |

**KL 惩罚的作用**：

    reward = r_θ(x,y) - β·KL(π || π_ref)

**机制**：

    如果策略偏离参考模型太多
    KL 项变大
    抵消 r_θ 的收益
    -> 策略被"拉回"

**beta 的选择**：

| beta | 效果 |
| --- | --- |
| 0 | 无约束（严重 hacking）|
| **0.01~0.1** | **常用** |
| 1.0 | 几乎不学 |

**类比**：

    KL 惩罚 = 给策略一根"弹力绳"
    可以往前走（学对齐）
    但不能走太远（保持原有能力）

**为什么"保持原有能力"重要**：

    基础模型有大量知识
    过度 PPO 会"遗忘"（catastrophic forgetting）
    KL 惩罚保持知识

---

**⑤ 一个更深的思考**

**RLHF 的本质是什么**：

> **把"人类的隐性偏好"转化为"可优化的目标"。**

**三个阶段对应三种知识**：

| 阶段 | 学习什么 | 知识形式 |
| --- | --- | --- |
| **SFT** | 格式 | 显式示范 |
| **RM** | 价值判断 | 相对偏好 |
| **PPO** | 策略 | 优化目标 |

**关键洞察**：

    人类不擅长"说出规则"（写奖励函数）
    但擅长"判断好坏"（比较）
    
    RLHF 把后者转化为前者。

**这也是它的局限**：

    偏好 ≠ 价值
    人类的选择可能不一致、有偏见
    RLHF 学到的是"人类的偏好"，不是"真理"

**后续发展**：

| 方法 | 改进 |
| --- | --- |
| **DPO** | 跳过 RM 和 PPO，直接从偏好优化 |
| **Constitutional AI** | 用 AI 反馈（可扩展） |
| **RLAIF** | 用强模型标注 |
| **GRPO** | 更省的 RL 算法 |

**DPO 的关键洞察**：

    PPO 的目标（带 KL）有闭式解
    -> 可以直接从偏好优化策略
    -> 不需要单独的奖励模型

**这简化了流程，但思想仍来自 RLHF。**

---

**⑥ 一个诚实的评价**

**RLHF 的贡献**：

| 方面 | 说明 |
| --- | --- |
| **突破** | 让 RL 能处理"难以定义奖励"的任务 |
| **效率** | 数百次比较就能训练 |
| **影响** | ChatGPT 的核心技术 |
| **范式** | "对齐"成为独立研究方向 |

**局限**：

| 局限 | 说明 |
| --- | --- |
| **标注成本** | 人类时间昂贵 |
| **偏好不一致** | 不同人偏好不同 |
| **可能学到偏见** | 人类偏见被放大 |
| **无法超越人类** | 上限是人类判断 |

**最后一点很重要**：

    RLHF 让模型"更像人类想要的"
    但如果人类判断有误，模型也会学错
    
    -> 这就是为什么需要"可扩展监督"（scalable oversight）
    -> 当模型超过人类时，怎么监督？

**这是当前 AI 对齐研究的核心问题。**

**RLHF 是"起点"，不是"终点"。**`,
        rubric: [
          { point: '手工奖励难：难形式化 + reward hacking + 多目标平衡', score: 3 },
          { point: 'Bradley-Terry：P(A≻B)=σ(r(A)-r(B))，只看差值，可训练', score: 2 },
          { point: '三阶段：SFT 学格式 → RM 学价值 → PPO 优化策略', score: 2 },
          { point: 'KL 惩罚：RM 有盲点，无限优化会 hacking；保持原有能力', score: 2 },
          { point: '深层思考：偏好≠价值，上限是人类判断，需要可扩展监督', score: 1 },
        ],
        keywords: ['reward hacking', 'σ(差值)', 'SFT→RM→PPO', '弹力绳', '偏好≠价值'],
        explanation:
          '能说清「KL 惩罚是弹力绳」以及「RLHF 的上限是人类判断」这两点，就是理解了 RLHF 的机制与边界。',
        tags: ['综合分析'],
      },
    ],
  },
];
