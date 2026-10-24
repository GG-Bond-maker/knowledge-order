import type { Chapter } from '../../types';

/* ============================================================
 *  《后训练与推理模型》B4 — 第二部分
 *  c2 RLHF 与 DPO    c3 GRPO 与 RLVR
 *
 *  参考：InstructGPT、DPO (2023)、DeepSeekMath/GRPO (2024)、
 *       DeepSeek-R1 (2025)、CS336 L16-L17、HF LLM Course Ch12
 * ============================================================ */

export const llmB4Chapters2: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'llm-b4-c2',
    title: 'RLHF 与 DPO：让模型回答得更好',
    goal: '理解 RLHF 三阶段流程、奖励模型与 PPO 的作用，掌握 DPO 如何用更简单的方式达成同样目标。',
    lessons: [
      {
        id: 'llm-b4-c2-l1',
        title: 'RLHF 三阶段与 DPO 的简化',
        content: `
### 学习目标

学完本节，你应该能够：
1. 解释 SFT 之后仍需对齐的三个理由与 3H 目标；
2. 写出 RM 的 Bradley-Terry 损失与 PPO 的 KL 惩罚目标；
3. 算清 PPO 四模型显存账，说明 DPO 把 RL 变监督的动机与公式。

### 前置知识

- llm-b3 的 SFT 流程；
- 强化学习基本词汇（策略/奖励/KL）。

### 问题背景

SFT 教会『怎么回答』却没教『回答得多好』：它无法表达相对偏好，也无法压制有害与啰嗦。RLHF 用奖励模型+PPO 把人类偏好注入策略，但四个模型同驻显存极其昂贵；DPO 把 RL 变成监督学习——对齐的经济学决定了谁能做对齐。

### 直觉理解

RLHF 三阶段像培训客服：SFT 是话术培训（会答），偏好标注是收集顾客点评（哪个答得更好），PPO 是按点评发奖金上岗（强化好行为）。KL 惩罚是『不许为了讨好顾客胡乱承诺』——奖金（RM）只是人类偏好的近似，没有约束模型会学会钻空子（reward hacking）。

### 核心概念与原理详解

## 为什么 SFT 之后还要对齐

SFT 教会了「怎么回答」，但没教「回答得多好」。具体问题：

- 同一问题可能有多个正确答案，SFT 只学了**一个**；
- SFT 无法表达「这个回答比那个更好」这种**相对偏好**；
- 模型可能输出有害、不诚实、啰嗦的内容。

**对齐（Alignment）的目标**：让模型输出符合人类偏好——
有用（helpful）、诚实（honest）、无害（harmless），即 **3H**。

## RLHF 三阶段（InstructGPT 流程）

**阶段 1：SFT**

用指令数据微调，得到一个「会回答」的模型。

**阶段 2：训练奖励模型（Reward Model）**

收集**人类偏好对比数据**：同一个问题给两个回答，标注哪个更好。

    问题: 如何学习数据分析？
    回答A: 先学 Python，再做项目...        <- 人类选 A
    回答B: 数据分析很重要，要多练习...      <- 被拒绝

**损失函数**（Bradley-Terry 模型）：

    L = -log sigmoid( r(chosen) - r(rejected) )

即：让好回答的分数比坏回答**至少高出一个 margin**。

**阶段 3：用 PPO 强化学习优化策略**

用奖励模型给模型输出打分，PPO 更新策略：

    reward = RM(prompt, response)
    # 但要加 KL 惩罚，防止偏离 SFT 模型太远
    total = reward - beta * KL(new_policy || sft_policy)

**KL 惩罚的作用（关键）**：
- 奖励模型只是人类偏好的**近似**，模型会找到「欺骗」它的方式（reward hacking）；
- KL 约束让新模型不要偏离 SFT 模型太远，保持语言能力；
- beta 通常取 0.01~0.1。

## PPO 的复杂性

PPO 需要**四个模型同时驻留显存**：

| 模型 | 作用 | 参数量 |
| --- | --- | --- |
| Actor（策略） | 被训练的模型 | 1 份 |
| Critic（价值） | 估计 baseline | 1 份 |
| Reward Model | 打分 | 1 份 |
| Reference Model | 算 KL | 1 份 |

**总计约 4 倍模型显存**。70B 模型做 RLHF 需要 4×140GB = 560GB，
还要加上优化器状态与激活——**极其昂贵**。

这就是 DPO 出现的动机。

## DPO：把 RL 变成监督学习

**DPO（Direct Preference Optimization, 2023）的核心洞察**：

> PPO 的目标函数在最优策略下可以**解析求解**，
> 代入后得到一个**只含策略模型**的损失函数——不需要奖励模型，不需要 RL。

**DPO 损失**：

    L = -log sigmoid( beta * [ log(pi(y_w)/pi_ref(y_w))
                             - log(pi(y_l)/pi_ref(y_l)) ] )

**直觉解读**：
- 提高好回答 y_w 的相对概率；
- 降低坏回答 y_l 的相对概率；
- 用 pi_ref（SFT 模型）做锚点，防止偏离太远（等价于 KL 约束）。

**DPO 的优势**：

| 对比项 | RLHF（PPO） | DPO |
| --- | --- | --- |
| 需要的模型 | 4 个 | **2 个**（策略 + 参考） |
| 训练稳定性 | 差（RL 难调） | **好（监督学习）** |
| 实现复杂度 | 高 | **低（几十行代码）** |
| 效果 | 强 | 接近 PPO（部分任务略差） |

**DPO 的代价**：
- 需要**离线偏好数据**（不能在线探索）；
- 对数据分布敏感，out-of-distribution 时效果下降；
- 无法像 PPO 那样用奖励模型做多轮迭代。

## 三者的关系

    预训练 -> 学知识
       ↓
    SFT -> 学格式（监督学习）
       ↓
    RLHF/DPO -> 学偏好（对齐）
       ↓
    GRPO/RLVR -> 学推理（见 c3）

**实践建议**：
- 资源有限 → DPO（简单有效）；
- 需要极致效果、有工程能力 → PPO；
- 推理任务 → GRPO（c3）。

<RLHFArchDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
def rm_loss(rc, rr): return -np.log(1/(1+np.exp(-(rc-rr))))
print(f"margin=0: L={rm_loss(1.0, 1.0):.3f} | margin=2: L={rm_loss(3.0, 1.0):.3f} | margin=-2: L={rm_loss(1.0, 3.0):.3f}")
# KL 惩罚对策略的约束
for beta in (0.0, 0.05, 0.2):
    reward, kl = 1.2, 8.0        # 一个 hacking 策略：高分但严重偏离
    print(f"beta={beta}: total = {reward} - {beta}*{kl} = {reward - beta*kl:+.2f}")
# 四模型显存账
P = 7e9; GB = 1e9
print(f"PPO 4 模型（bf16 权重）: {4*P*2/GB:.0f} GB + 优化器/激活 → 7B 也需多机")
# DPO：同一偏好对上的监督损失
def dpo_loss(pc, pr, ref_c, ref_r, beta=0.1):
    import math
    return -math.log(1/(1+math.exp(-(beta*((pc-ref_c)-(pr-ref_r))))))
print(f"DPO margin(策略-参考)=2: L={dpo_loss(2.0, 0.0, 0.0, 0.0):.3f}")\`\`\`

预期输出（实测）：Bradley-Terry：margin 0→L=0.693、margin 2→0.127、margin -2→2.127；KL 惩罚：beta=0 时 hacking 策略净奖励 +1.20，beta=0.2 变 -0.40（被抑制）；PPO 4 模型 bf16 权重 56 GB；DPO margin=2 → L=0.598。

**常见错误**：RM 训练数据chosen/rejected标反，奖励信号系统性误导；KL 系数 β 设 0，模型输出 degenerate 文本刷分；PPO 四模型同驻显存没做显存预算直接 OOM。

### 常见误区

1. **『对齐就是 SFT 加数据』**——SFT 只能模仿单条示范，偏好是成对相对信号，需要 RM/PPO 或 DPO；\\n2. **『奖励模型分数=真实好坏』**——RM 是近似的代理，reward hacking 是对齐的头号风险；\\n3. **『DPO 弱于 PPO』**——DPO 免 RM 免采样、稳定易训，在多数偏好任务上与 PPO 相当，是资源有限时的默认。

### 知识关联

- **向前**：llm-b3 的 SFT 是本章阶段 1；
- **向后**：c3 的 GRPO/RLVR 把对齐推向可验证推理；
- **平行**：llm-b2 的 LLM-as-Judge 与 RM 同享『用模型评模型』的方法论与偏差。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 3H | 有用/诚实/无害 |
| RM 损失 | L = -log σ(r(chosen) − r(rejected)) |
| PPO | reward − β·KL(π_new‖π_sft)，β≈0.01~0.1 |
| 显存 | Actor+Critic+RM+Ref ≈ 4 倍模型 |
| DPO | 免 RM 免采样，偏好对上直接监督 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Ouyang et al. (2022)《InstructGPT》、Rafailov et al. (2023) arXiv:2305.18290《DPO》、Shao et al. (2024)《GRPO》与 DeepSeek-R1 技术报告相应章节）
`,
        tips: [
          {
            kind: 'interview',
            text: '「RLHF 三阶段」：SFT → 训练奖励模型（人类偏好对比）→ PPO 优化（带 KL 惩罚）。',
          },
          {
            kind: 'leak',
            text: 'PPO 需要同时驻留 4 个模型（Actor/Critic/RM/Reference），显存约 4 倍。DPO 只需 2 个，这是它的核心优势。',
          },
          {
            kind: 'note',
            text: 'KL 惩罚的作用是防止 reward hacking：奖励模型只是人类偏好的近似，模型会找到欺骗它的方式。',
          },
        ],
        demos: [
          {
            title: 'DPO 损失的直观计算',
            lang: 'python',
            code: `import math

def sigmoid(x):
    if x >= 0:
        return 1 / (1 + math.exp(-x))
    z = math.exp(x)
    return z / (1 + z)

def dpo_loss(logp_w, logp_w_ref, logp_l, logp_l_ref, beta=0.1):
    """DPO 损失。logp_* 是 log 概率。"""
    delta_w = logp_w - logp_w_ref      # 好回答相对参考的提升
    delta_l = logp_l - logp_l_ref      # 坏回答相对参考的提升（希望为负）
    margin = beta * (delta_w - delta_l)
    return -math.log(sigmoid(margin))

l1 = dpo_loss(logp_w=-1.0, logp_w_ref=-2.0, logp_l=-3.0, logp_l_ref=-2.0)
print(f"理想情况（好升坏降）: loss = {l1:.4f}")

l2 = dpo_loss(logp_w=-3.0, logp_w_ref=-2.0, logp_l=-1.0, logp_l_ref=-2.0)
print(f"反例（好降坏升）:   loss = {l2:.4f}")

l3 = dpo_loss(logp_w=-2.0, logp_w_ref=-2.0, logp_l=-2.0, logp_l_ref=-2.0)
print(f"无变化:             loss = {l3:.4f} (应约 0.693 = ln2)")

print()
print("=== beta 的影响 ===")
for beta in (0.01, 0.1, 0.5, 1.0):
    l = dpo_loss(-1.0, -2.0, -3.0, -2.0, beta=beta)
    print(f"beta={beta:4}: loss={l:.4f}  (越大越激进)")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-b4-c2-e1',
        type: 'single',
        difficulty: 2,
        question: 'RLHF 的三个阶段依次是？',
        options: [
          { value: 'A', text: '预训练 → 奖励模型 → PPO' },
          { value: 'B', text: 'SFT → 训练奖励模型 → PPO 优化' },
          { value: 'C', text: 'DPO → SFT → PPO' },
          { value: 'D', text: '奖励模型 → 预训练 → SFT' },
        ],
        answer: 'B',
        explanation:
          'InstructGPT 流程：先用指令数据 SFT，再用人类偏好对比数据训练奖励模型，最后用 PPO 结合奖励模型优化策略（带 KL 惩罚）。',
        tags: ['RLHF'],
      },
      {
        id: 'llm-b4-c2-e2',
        type: 'judge',
        difficulty: 2,
        question: 'DPO 相比 RLHF 的最大优势是不需要单独训练奖励模型，也不需要 RL 训练。',
        answer: true,
        explanation:
          'DPO 通过解析推导把 RL 目标转化为监督学习损失，只需策略模型和参考模型（2 个而非 PPO 的 4 个），训练稳定得多。',
        tags: ['DPO'],
      },
      {
        id: 'llm-b4-c2-e3',
        type: 'multiple',
        difficulty: 3,
        question: 'RLHF 中 KL 惩罚的作用是什么？（多选）',
        options: [
          { value: 'A', text: '防止模型偏离 SFT 模型太远，保持语言能力' },
          { value: 'B', text: '防止 reward hacking（模型找到欺骗奖励模型的方式）' },
          { value: 'C', text: '加速训练收敛' },
          { value: 'D', text: '减少优化器显存' },
        ],
        answer: ['A', 'B'],
        explanation:
          'C/D 不是 KL 惩罚的作用（KL 反而增加计算）。奖励模型只是人类偏好的近似，没有约束时模型会输出奖励高但人不想看的内容。',
        tags: ['KL 惩罚'],
      },
      {
        id: 'llm-b4-c2-e4',
        type: 'fill',
        difficulty: 3,
        question: 'PPO 做 RLHF 时需要同时驻留 Actor、Critic、Reward Model 和 ___ Model 四个模型。',
        blanks: [['Reference', 'reference', '参考', '参考模型']],
        explanation:
          'Reference Model 用于计算 KL 散度，约束新策略不偏离 SFT 模型。四个模型带来约 4 倍显存开销，这是 DPO 出现的直接动机。',
        tags: ['PPO'],
      },
      {
        id: 'llm-b4-c2-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现数值稳定的 sigmoid：sigmoid(x) 返回 1/(1+e^(-x))。\n\n注意防止溢出（x 很负时 e^(-x) 会溢出）。',
        starterCode: `import math

def sigmoid(x):
    ___

sigmoid(0)
`,
        setupCode: '',
        expectedOutput: '0.5',
        tests: `import math
assert abs(sigmoid(0) - 0.5) < 1e-9, "sigmoid(0) 应为 0.5"
assert abs(sigmoid(10) - 0.9999546) < 1e-6
assert abs(sigmoid(-10) - 0.0000454) < 1e-6
assert 0 <= sigmoid(-1000) < 1e-9, "极大负数应接近 0 且不报错"
assert sigmoid(1000) > 0.9999, "极大正数应接近 1"
`,
        answer: `import math

def sigmoid(x):
    if x >= 0:
        return 1 / (1 + math.exp(-x))
    z = math.exp(x)
    return z / (1 + z)


sigmoid(0)`,
        explanation:
          '为什么要分支：x = -1000 时 exp(1000) 会溢出报错。分支后等价变形避免了这个问题。\n\nDPO 损失里的 sigmoid 就是这个词函数。',
        tags: ['编程', 'sigmoid'],
      },
      {
        id: 'llm-b4-c2-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现 DPO 损失：dpo_loss(logp_w, logp_w_ref, logp_l, logp_l_ref, beta=0.1)。\n\n公式：-log sigmoid( beta * [(logp_w - logp_w_ref) - (logp_l - logp_l_ref)] )',
        starterCode: `import math

def sigmoid(x):
    if x >= 0:
        return 1 / (1 + math.exp(-x))
    z = math.exp(x)
    return z / (1 + z)

def dpo_loss(logp_w, logp_w_ref, logp_l, logp_l_ref, beta=0.1):
    margin = ___
    return ___

dpo_loss(-2.0, -2.0, -2.0, -2.0)
`,
        setupCode: '',
        expectedOutput: '约 0.6931（= ln2）',
        tests: `import math
l = dpo_loss(-2.0, -2.0, -2.0, -2.0)
assert abs(l - math.log(2)) < 1e-9, f"无变化时应为 ln2≈0.693，实际 {l}"
l_good = dpo_loss(-1.0, -2.0, -3.0, -2.0)
assert l_good < l, f"理想情况 loss 应更小，实际 {l_good}"
l_bad = dpo_loss(-3.0, -2.0, -1.0, -2.0)
assert l_bad > l, f"反例 loss 应更大，实际 {l_bad}"
l_small_beta = dpo_loss(-1.0, -2.0, -3.0, -2.0, beta=0.01)
assert l_small_beta > l_good, "小 beta 时 loss 更大（更保守）"
`,
        answer: `import math

def sigmoid(x):
    if x >= 0:
        return 1 / (1 + math.exp(-x))
    z = math.exp(x)
    return z / (1 + z)

def dpo_loss(logp_w, logp_w_ref, logp_l, logp_l_ref, beta=0.1):
    margin = beta * ((logp_w - logp_w_ref) - (logp_l - logp_l_ref))
    return -math.log(sigmoid(margin))


dpo_loss(-2.0, -2.0, -2.0, -2.0)`,
        explanation:
          '解读：\n- logp_w - logp_w_ref：好回答相对参考模型的提升；\n- logp_l - logp_l_ref：坏回答的提升（希望是负的）；\n- 两者相减就是优势差。\n\n模型没变化时 margin = 0，sigmoid(0)=0.5，-log(0.5) = ln2 约 0.693。',
        tags: ['编程', 'DPO'],
      },
      {
        id: 'llm-b4-c2-e7',
        type: 'judge',
        difficulty: 3,
        question: 'DPO 在所有场景下效果都优于 PPO。',
        answer: false,
        explanation:
          'DPO 更简单稳定，但需要离线偏好数据，无法在线探索，对数据分布敏感。PPO 在需要多轮迭代、有可靠奖励模型时可能更优。',
        tags: ['DPO 局限'],
      },
      {
        id: 'llm-b4-c2-e8',
        type: 'open',
        difficulty: 4,
        question:
          '请对比 RLHF（PPO）与 DPO：说明各自流程、所需资源、优缺点，以及在什么场景下应该选哪个。',
        referenceAnswer: `**一、RLHF（PPO）流程**

1. SFT：用指令数据微调基座模型；
2. 训练奖励模型：收集人类偏好对比数据，用 Bradley-Terry 损失训练打分模型，
   L = -log sigmoid(r(chosen) - r(rejected))；
3. PPO 优化：用奖励模型给策略输出打分，PPO 更新策略，
   同时用 KL 惩罚约束不偏离 SFT 模型。

资源需求：
- 4 个模型同时驻留：Actor、Critic、Reward Model、Reference Model；
- 70B 模型约需 4×140GB = 560GB 显存（不含优化器与激活）；
- 需要 RL 调参经验（PPO 超参敏感，易崩）。

**二、DPO 流程**

1. SFT：同 RLHF；
2. 直接用偏好数据做监督学习：
   L = -log sigmoid(beta * [log(pi(y_w)/pi_ref(y_w)) - log(pi(y_l)/pi_ref(y_l))])；
3. 无需奖励模型、无需 RL 循环。

资源需求：
- 2 个模型：策略模型 + 参考模型；
- 显存约为 PPO 的一半；
- 实现只需几十行代码，训练稳定。

**三、优缺点对比**

| 维度 | PPO | DPO |
| --- | --- | --- |
| 模型数 | 4 | 2 |
| 稳定性 | 差（RL 易崩） | 好 |
| 实现复杂度 | 高 | 低 |
| 是否在线 | 是（可探索） | 否（离线数据） |
| 数据效率 | 可反复利用奖励模型 | 依赖固定偏好数据 |
| 效果上限 | 可能更高 | 接近 PPO |
| 抗分布偏移 | 好（在线纠正） | 差（OOD 时退化） |

**四、选择建议**

选 DPO：
- 资源有限（单机 8 卡以内）；
- 团队无 RL 经验；
- 已有高质量偏好数据；
- 目标是常规对齐（更有用、更安全、更简洁）。

选 PPO：
- 有大规模算力与 RL 工程能力；
- 需要在线探索（如复杂推理、Agent 任务）；
- 有可靠的奖励信号（可验证的任务）；
- 追求极致效果。

混合策略（实践常见）：先用 DPO 快速迭代，再对关键能力用 PPO/GRPO 精调。

**五、一个重要的认知**

DPO 的简单是有代价的：它把 RL 问题离线化了，
因此失去了探索能力。对于推理任务（需要尝试不同解法），
DPO 往往不够——这就是 GRPO 出现的原因（见 c3）。`,
        rubric: [
          { point: 'RLHF 三阶段流程与 Bradley-Terry 损失', score: 2 },
          { point: 'PPO 需要 4 个模型、显存约 4 倍', score: 2 },
          { point: 'DPO 公式与只需 2 个模型', score: 2 },
          { point: '至少 4 个维度的优缺点对比', score: 2 },
          { point: '场景选择建议 + 指出 DPO 的离线局限', score: 2 },
        ],
        keywords: ['Bradley-Terry', 'PPO', '4 个模型', 'DPO', '离线', '在线探索'],
        explanation:
          '能指出 DPO 把 RL 离线化因而失去探索能力这个本质，就理解了为什么推理任务需要 GRPO。',
        tags: ['RLHF', 'DPO', '综合'],
      },
    ],
  },

  {
    id: 'llm-b4-c3',
    title: 'GRPO 与 RLVR：让模型学会推理',
    goal: '理解可验证奖励（RLVR）的思路、GRPO 如何用组内相对优势替代 Critic，以及 DeepSeek-R1 的训练流程。',
    lessons: [
      {
        id: 'llm-b4-c3-l1',
        title: 'GRPO 组内相对优势与 RLVR 可验证奖励',
        content: `
### 学习目标

学完本节，你应该能够：
1. 定义 RLVR 并对比神经 RM 与规则引擎的防作弊性；
2. 推导 GRPO 组内相对优势并解释全对/全错组的梯度消失；
3. 实现规则奖励（\\boxed{} 匹配/单元测试）与组优势计算。

### 前置知识

- 「RLHF 三阶段与 DPO」（c2-l1）；
- PPO 的 Critic 作用。

### 问题背景

数学与代码的答案非分明的判定催生了 RLVR：不用易被攻击的神经奖励模型，而用规则引擎（答案比对/单元测试）给奖励。GRPO 砍掉 Critic 用组内相对优势降低方差——R1-Zero 证明纯 RL 能自发涌现长思考与元反思，完整 R1 再用四阶段流水线把『科学奇迹』变成『工业产品』。

### 直觉理解

RLVR 像奥数阅卷：只看最终答案对不对（oxed{} 匹配），没人情分可刷，故无 reward hacking 空间。GRPO 是『同题多人作答排名次』：一组 8 个回答互相比较，比组均分高的是正优势——省掉了估计基线的Critic。R1-Zero 的思考长度爆发是『为了通关自发多打草稿』：奖励只看对错，长思考是策略不是奖励偏置。

### 核心概念与原理详解

## 从人类偏好到严谨推理：后训练的范式跃迁

在前面两章中，我们讨论的 RLHF 与 DPO 的核心目标是**符合人类偏好与安全对齐**。
然而，2024-2025 年以 OpenAI o1 和 DeepSeek-R1 为代表的“推理模型（Reasoning Models）”，开辟了全新的强化学习维度：**让大语言模型掌握严密的逻辑推导、数学证明与代码编写能力**。

在这些任务中，我们不需要模糊的人类偏好打分，因为**数学与代码的答案是非分明、客观可判定的**。
这催生了 **RLVR（Reinforcement Learning with Verifiable Rewards，可验证奖励的强化学习）**。

## RLVR 的核心机制与奖励设计

与传统依赖易受攻击（Reward Hacking）的神经奖励模型（Reward Model）不同，RLVR 完全依赖**确定性规则引擎**作为裁判：

| 任务类型 | 验证判定方式 | 奖励机制 ($r$) |
| --- | --- | --- |
| **数学推导** | 正则匹配提取 LaTeX \\boxed{} 答案与标准答案比对 | 严格匹配=1.0，错误=0.0 |
| **代码算法** | 在沙箱环境中针对隐藏单元测试用例执行 | 全部通过=1.0，失败=0.0 (或按通过率梯级打分) |
| **格式规范** | 正则检验 <think>...</think><answer>...</answer> 标签闭合性 | 结构合规=0.2，缺失标签=0.0 |
| **语言一致性** | 检测思考链中的语言分布（防止中英文无序混杂） | 语言纯正=1.0，严重混杂扣分 |

### RLVR 的核心优势与局限
- **优势**：
  1. **绝对防作弊**：客观单元测试无法通过谄媚或冗长文字被糊弄，不存在 Reward Hacking 空间；
  2. **数据无限自举**：数学与代码题目可以通过符号系统自动批量生成，无需昂贵的人工标注。
- **局限**：
  仅适用于**结果具有确定判定准则**的任务，无法直接用于开放式文学写作或主观哲学探讨。

## GRPO：斩断 Critic 枷锁的轻量级强化学习

在传统的 PPO（Proximal Policy Optimization）算法中，系统需要维护四个同等体量的模型：
1. **策略模型（Policy $\\pi_\\theta$）**：待训练模型；
2. **参考模型（Reference $\\pi_{\\text{ref}}$）**：防止策略偏离过远；
3. **奖励模型（Reward Model）**：评估打分；
4. **价值网络（Critic Network $V_\\phi$）**：估计基线（Baseline）以降低策略梯度的方差。

**痛点**：Critic 模型的参数量通常与策略模型一致，且由于要预测每个 Token 的未来期望累积回报，极难稳定收敛，**显存开销直接翻倍**！

### GRPO 的革命性构想（DeepSeekMath, 2024）
DeepSeek 团队提出了 **GRPO（Group Relative Policy Optimization，组内相对策略优化）**：

> **核心思路**：彻底抛弃 Critic 网络！
> 对于任意一个提示词问题 $q$，让模型同时采样生成一组 $G$ 个候选回答 $\\{o_1, o_2, \\dots, o_G\\}$。
> **直接用这 $G$ 个候选回答的奖励均值与标准差，计算组内相对优势（Group Relative Advantage）！**

### 相对优势计算公式
设这组采样的规则奖励分别为 $r_1, r_2, \\dots, r_G$：
1. 计算组内均值与标准差：
   $$\\mu = \\frac{1}{G} \\sum_{i=1}^G r_i, \\quad \\sigma = \\sqrt{\\frac{1}{G} \\sum_{i=1}^G (r_i - \\mu)^2}$$
2. 计算每个回答的无偏标准化相对优势：
   $$A_i = \\frac{r_i - \\mu}{\\sigma + \\epsilon}$$

\`\`\`
          问题 q
            |
     +------+------+------+  (采样 G 个回答，例如 G=8)
     |      |      |      |
    o_1    o_2    o_3    o_4 ...
     |      |      |      |
   r_1=1  r_2=0  r_3=1  r_4=0 (规则自动验证)
     \\      |      |      /
    +----------------------+
    | 计算组内均值 μ 与标准差 σ |
    +----------------------+
            |
    A_i = (r_i - μ) / (σ + ε)  <--- 组内相对优势直接作为策略梯度权重！
                                    (零 Critic 显存开销，显存降低 50%)
\`\`\`

## GRPO 的完整目标函数

对于每个 Token 位置 $t$，GRPO 沿用了 PPO 的截断代理目标（Clipped Surrogate Objective），并加入无 Critic 的 KL 正则散度：

$$\\mathcal{J}_{\\text{GRPO}}(\\theta) = \\mathbb{E}_{q \\sim P, \\{o_i\\}_{i=1}^G \\sim \\pi_{\\theta_{\\text{old}}}} \\left[ \\frac{1}{G} \\sum_{i=1}^G \\frac{1}{|o_i|} \\sum_{t=1}^{|o_i|} \\left( \\min \\left( \\frac{\\pi_\\theta(o_{i,t} \\mid \\dots)}{\\pi_{\\theta_{\\text{old}}}(o_{i,t} \\mid \\dots)} A_i, \\operatorname{clip} \\left( \\frac{\\pi_\\theta}{\\pi_{\\theta_{\\text{old}}}}, 1-\\epsilon, 1+\\epsilon \\right) A_i \\right) - \\beta \\mathbb{D}_{\\text{KL}}(\\pi_\\theta \\parallel \\pi_{\\text{ref}}) \\right) \\right]$$

### 关键工程洞察：梯度信号的方差依赖
如果某道题采样的一组 $G$ 个回答**全部答对**（$r_i = 1$）或**全部答错**（$r_i = 0$）：
- 此时组内标准差 $\\sigma = 0$；
- 加上 $\\epsilon$ 归一化后，所有回答的相对优势 $A_i = 0$；
- **梯度信号彻底归零，模型无法从该题目中获得任何学习反思！**

**推论**：RLVR 强化学习的题目必须经过严格的**动态难度筛选**与**课程学习（Curriculum Learning）**——必须保证题目恰好处于模型的能力边界（有对有错），才能产生强劲的策略梯度驱动模型进化。

<GAEDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np, re
# ---- 1. RLVR：规则奖励 ----
def reward(ans, truth):
    m = re.search(r"\\\\boxed\\{([-0-9.]+)\\}", ans)
    if not m: return 0.0
    return 1.0 if abs(float(m.group(1)) - truth) < 1e-6 else 0.0
print("RLVR:", reward("所以 \\\\boxed{42}", 42), reward("所以 \\\\boxed{40}", 42), reward("答案 42", 42))
# ---- 2. GRPO：组内相对优势 ----
rng = np.random.default_rng(0)
def grpo_group(policy_acc, G=8):
    rs = (rng.random(G) < policy_acc).astype(float)
    adv = (rs - rs.mean()) / (rs.std() + 1e-8)
    return rs, adv
rs, adv = grpo_group(0.4)
print("组奖励:", rs.astype(int), "| 组内优势:", np.round(adv, 2), "（省去 Critic）")
all_same = np.ones(8); print("全对组优势:", np.round((all_same-all_same.mean())/(all_same.std()+1e-8), 2), "→ 无梯度，需混难度")
# ---- 3. 测试时计算：R1-Zero 轨迹 ----
steps = [0, 500, 2000]
acc = [15.6, 45.0, 71.0]; think = [200, 2000, 9000]
for s, a, t in zip(steps, acc, think):
    print(f"step {s}: 准确率 {a}% 思考长度 ~{t} 字（无长度奖励偏置，自发涌现）")\`\`\`

预期输出（实测）：RLVR：oxed{42} 得 1.0、oxed{40} 与无标签得 0；GRPO 组奖励 [0,1,1,1,0,0,0,0] → 优势 [-0.77,+1.29,...]（免 Critic），全对组优势全 0 需混难度；R1-Zero 轨迹：step 0/500/2000 准确率 15.6%/45%/71%、思考长度 200→9000 字（无长度奖励偏置，自发涌现）。

**常见错误**：RLVR 奖励函数里混入『答案长度』等启发项，模型学会写长答案刷分（reward hacking 复活）；GRPO 组内 8 个回答全对/全错导致优势全 0、梯度消失，需混合难度题；把 R1-Zero 的可读性缺陷当『风格』保留上线。

### 常见误区

1. **『RLVR 适用于一切任务』**——它要求结果可验证，开放式写作仍需偏好模型；\\n2. **『思考变长=奖励函数鼓励长』**——R1-Zero 未加长度偏置，长度是准确率的副产品（test-time compute）；\\n3. **『蒸馏弱于小模型自己做 RL』**——R1 实验相反：蒸馏大模型的推理范式远胜小模型自训。

### 知识关联

- **向前**：c2 的 RLHF 管偏好对齐，本章管可验证能力；两者在 R1 流水线阶段 4 合流；
- **向后**：DeepSeek-V3 的 MoE 架构（llm-a4）是这些算法的算力底座；
- **平行**：llm-b2 的评估纪律在本章变成奖励函数设计。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| RLVR | 规则引擎给奖励：答案比对/单元测试，防 hacking |
| GRPO | 组内相对优势 (r−mean)/std 替代 Critic |
| R1-Zero | 纯 RL：思考长度 15.6%→71.0% 准确率自发涌现 |
| R1 四阶段 | 冷启动 SFT→推理 RL→拒绝采样 SFT→全场景 RL |
| 蒸馏 | 大模型推理范式可蒸馏给 1.5B 小模型 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Ouyang et al. (2022)《InstructGPT》、Rafailov et al. (2023) arXiv:2305.18290《DPO》、Shao et al. (2024)《GRPO》与 DeepSeek-R1 技术报告相应章节）
`,
        tips: [
          {
            kind: 'interview',
            text: '面试常问：GRPO 如何在不引入 Critic 的情况下控制方差？答：利用大批量采样 G 个回答（通常 G=8~64），以经验均值替代状态价值期望，以标准差做尺度归一化。既避免了 Critic 的显存和收敛难题，又通过组内基线有效抑制了策略梯度的方差。',
          },
        ],
        demos: [
          {
            title: 'GRPO 组内优势计算',
            lang: 'python',
            code: `import numpy as np

def grpo_advantages(rewards, eps=1e-8):
    """GRPO 的组内优势：奖励减去组内均值，除以标准差。"""
    r = np.array(rewards, dtype=float)
    mean = r.mean()
    std = r.std()
    return (r - mean) / (std + eps), mean, std

rewards1 = [1, 0, 1, 0, 0, 1, 0, 1]
adv1, m1, s1 = grpo_advantages(rewards1)
print("场景1: 有对有错")
print(f"  奖励: {rewards1}")
print(f"  均值={m1:.2f} 标准差={s1:.2f}")
print(f"  优势: {np.round(adv1, 3)}")
print("  -> 优势非零，有梯度信号")

rewards2 = [1, 1, 1, 1, 1, 1, 1, 1]
adv2, m2, s2 = grpo_advantages(rewards2)
print()
print("场景2: 全对（题目太简单）")
print(f"  标准差={s2:.2f}  优势={np.round(adv2, 3)}")
print("  -> 优势全 0，没有梯度信号")

rewards3 = [0, 0, 0, 0, 0, 0, 0, 0]
adv3, m3, s3 = grpo_advantages(rewards3)
print()
print("场景3: 全错（题目太难）")
print(f"  标准差={s3:.2f}  优势={np.round(adv3, 3)}")
print("  -> 优势全 0，没有梯度信号")

print()
print("结论：题目难度必须在模型能力边界上（有对有错）")
print("这就是为什么推理训练需要课程学习与难度筛选")`,
          },
        ],
      },
      {
        id: 'llm-b4-c3-l2',
        title: 'DeepSeek-R1-Zero：纯强化学习与思考涌现',
        content: `
### 学习目标

学完本节，你应该能够：
1. 复述 R1-Zero 实验设置（跳过长 CoT SFT 直接 GRPO）；
2. 描述思考长度爆发与 Aha Moment 的涌现证据；
3. 解释 test-time compute 为何是策略涌现而非奖励偏置。

### 前置知识

- 「GRPO 组内相对优势与 RLVR」（c3-l1）。

### 问题背景

数学与代码的答案非分明的判定催生了 RLVR：不用易被攻击的神经奖励模型，而用规则引擎（答案比对/单元测试）给奖励。GRPO 砍掉 Critic 用组内相对优势降低方差——R1-Zero 证明纯 RL 能自发涌现长思考与元反思，完整 R1 再用四阶段流水线把『科学奇迹』变成『工业产品』。

### 直觉理解

RLVR 像奥数阅卷：只看最终答案对不对（oxed{} 匹配），没人情分可刷，故无 reward hacking 空间。GRPO 是『同题多人作答排名次』：一组 8 个回答互相比较，比组均分高的是正优势——省掉了估计基线的Critic。R1-Zero 的思考长度爆发是『为了通关自发多打草稿』：奖励只看对错，长思考是策略不是奖励偏置。

### 核心概念与原理详解

## 震撼 AI 界的孤勇实验：R1-Zero

在传统的共识中，人们普遍认为：大模型要想学会复杂的思维链（Chain-of-Thought, CoT），必须先用海量人工标注的高质量长思考过程数据进行 **SFT（监督微调）“教”会模型怎么一步步推导**，随后才能施加强化学习。

DeepSeek 团队做出了一个前所未有的激进实验：**DeepSeek-R1-Zero**。
> **实验设置**：直接拿预训练完成的基座模型（DeepSeek-V3-Base），**跳过任何人类撰写的长思维链 SFT 数据**，直接挂载可验证规则奖励（准确性 + 基础格式标签），启动大规模 GRPO 强化学习！

## 奇迹般的自发涌现（Emergence）

随着强化学习训练步数的推进，令人震惊的现象接连发生：

### 1. 思考长度的自主爆发（Token Explosion）
模型生成的响应长度随着训练步数呈现爆发式增长：
- 训练第 0 步：模型直接吐出几行简短草率的答案，准确率仅 15.6%；
- 训练第 500 步：模型开始自动在 <think> 标签内尝试分步演算，思考长度达到 2,000 字；
- 训练第 2000 步：思考长度膨胀至 8,000~10,000+ 字，准确率飙升至 71.0%！
**关键点**：算法没有向奖励函数中添加任何“鼓励字数变多”的偏置，这种思考长度的增长完全是模型为了“在困难数学题中获得更高的通关奖励”而**自发演化出的测试时计算（Test-Time Compute）策略**！

### 2. 标志性的 "Aha Moment"（顿悟时刻）
在 R1-Zero 的真实训练轨迹中，模型甚至自发出现了人类高级认知才具备的**元反思（Meta-Cognition）**：
- 模型在演算中途会突然输出：
  > *"Wait, wait, wait... Wait a moment. Let me re-evaluate this equation. Is this assumption really valid? Let's verify..."*
- 随后它会推翻前文的草率结论，另辟蹊径重新推导，最终修正了错误，得出正确答案！
这种自纠错（Self-Correction）与反思机制，**证明了深度思考并非靠人工规则死板教条灌输，而是搜索空间与奖励优化自发碰撞出的认知涌现**。

\`\`\`
       R1-Zero 认知演化轨迹
训练初期:  题目 -> 简短直觉回答 (错!)
              ↓ (GRPO 奖励惩罚直觉错误)
训练中期:  题目 -> 分步骤推导 -> 答案 (部分正确)
              ↓ (试错驱动搜索深度演化)
训练成熟期: 题目 -> 初始尝试 -> [发现漏洞反思(Aha Moment)]
                   -> 换思路推导 -> 多重反向检验 -> 最终答案 (正确!)
\`\`\`

## R1-Zero 的三大硬伤与工程遗憾

尽管 R1-Zero 展现了纯粹的智能之美，但作为一个面向公众的工业级产品，它存在致命缺陷：
1. **中英文混杂（Language Mixing）**：
   在纯 RL 驱动下，模型为了寻找最短推理捷径，会在思考链中无序混杂中文、英文甚至夹杂代码片段；
2. **可读性灾难（Poor Readability）**：
   缺乏人类排版范例，输出极其杂乱无章，存在大量车轱辘话和神经质的重复碎碎念；
3. **格式失控**：
   常常忘记闭合 XML 标签，难以稳定解析出最终结果。

<PolicyUpdateDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np, re
# ---- 1. RLVR：规则奖励 ----
def reward(ans, truth):
    m = re.search(r"\\\\boxed\\{([-0-9.]+)\\}", ans)
    if not m: return 0.0
    return 1.0 if abs(float(m.group(1)) - truth) < 1e-6 else 0.0
print("RLVR:", reward("所以 \\\\boxed{42}", 42), reward("所以 \\\\boxed{40}", 42), reward("答案 42", 42))
# ---- 2. GRPO：组内相对优势 ----
rng = np.random.default_rng(0)
def grpo_group(policy_acc, G=8):
    rs = (rng.random(G) < policy_acc).astype(float)
    adv = (rs - rs.mean()) / (rs.std() + 1e-8)
    return rs, adv
rs, adv = grpo_group(0.4)
print("组奖励:", rs.astype(int), "| 组内优势:", np.round(adv, 2), "（省去 Critic）")
all_same = np.ones(8); print("全对组优势:", np.round((all_same-all_same.mean())/(all_same.std()+1e-8), 2), "→ 无梯度，需混难度")
# ---- 3. 测试时计算：R1-Zero 轨迹 ----
steps = [0, 500, 2000]
acc = [15.6, 45.0, 71.0]; think = [200, 2000, 9000]
for s, a, t in zip(steps, acc, think):
    print(f"step {s}: 准确率 {a}% 思考长度 ~{t} 字（无长度奖励偏置，自发涌现）")\`\`\`

预期输出（实测）：RLVR：oxed{42} 得 1.0、oxed{40} 与无标签得 0；GRPO 组奖励 [0,1,1,1,0,0,0,0] → 优势 [-0.77,+1.29,...]（免 Critic），全对组优势全 0 需混难度；R1-Zero 轨迹：step 0/500/2000 准确率 15.6%/45%/71%、思考长度 200→9000 字（无长度奖励偏置，自发涌现）。

**常见错误**：RLVR 奖励函数里混入『答案长度』等启发项，模型学会写长答案刷分（reward hacking 复活）；GRPO 组内 8 个回答全对/全错导致优势全 0、梯度消失，需混合难度题；把 R1-Zero 的可读性缺陷当『风格』保留上线。

### 常见误区

1. **『RLVR 适用于一切任务』**——它要求结果可验证，开放式写作仍需偏好模型；\\n2. **『思考变长=奖励函数鼓励长』**——R1-Zero 未加长度偏置，长度是准确率的副产品（test-time compute）；\\n3. **『蒸馏弱于小模型自己做 RL』**——R1 实验相反：蒸馏大模型的推理范式远胜小模型自训。

### 知识关联

- **向前**：c2 的 RLHF 管偏好对齐，本章管可验证能力；两者在 R1 流水线阶段 4 合流；
- **向后**：DeepSeek-V3 的 MoE 架构（llm-a4）是这些算法的算力底座；
- **平行**：llm-b2 的评估纪律在本章变成奖励函数设计。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| RLVR | 规则引擎给奖励：答案比对/单元测试，防 hacking |
| GRPO | 组内相对优势 (r−mean)/std 替代 Critic |
| R1-Zero | 纯 RL：思考长度 15.6%→71.0% 准确率自发涌现 |
| R1 四阶段 | 冷启动 SFT→推理 RL→拒绝采样 SFT→全场景 RL |
| 蒸馏 | 大模型推理范式可蒸馏给 1.5B 小模型 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Ouyang et al. (2022)《InstructGPT》、Rafailov et al. (2023) arXiv:2305.18290《DPO》、Shao et al. (2024)《GRPO》与 DeepSeek-R1 技术报告相应章节）
`,
        tips: [
          {
            kind: 'note',
            text: '为什么小模型（如 1.5B/7B）难以直接通过纯 R1-Zero 训练成功涌现推理？因为纯 RL 探索需要基座模型拥有足够的参数容量与世界知识先验来支撑偶发的正确探索；如果模型太小，探索空间过于贫瘠，在困难题上可能 100 次采样全部失败（std=0），导致梯度无法启动。',
          },
        ],
      },
      {
        id: 'llm-b4-c3-l3',
        title: '完整 R1 工业对齐流水线与小模型蒸馏',
        content: `
### 学习目标

学完本节，你应该能够：
1. 画出 R1 四阶段流水线（冷启动 SFT→推理 RL→拒绝采样 SFT→全场景 RL）；
2. 说明拒绝采样如何沉淀 60 万条黄金 Long-CoT；
3. 对比蒸馏 vs 小模型自训 RL 的结论及其工程含义。

### 前置知识

- 「DeepSeek-R1-Zero」（c3-l2）。

### 问题背景

数学与代码的答案非分明的判定催生了 RLVR：不用易被攻击的神经奖励模型，而用规则引擎（答案比对/单元测试）给奖励。GRPO 砍掉 Critic 用组内相对优势降低方差——R1-Zero 证明纯 RL 能自发涌现长思考与元反思，完整 R1 再用四阶段流水线把『科学奇迹』变成『工业产品』。

### 直觉理解

RLVR 像奥数阅卷：只看最终答案对不对（oxed{} 匹配），没人情分可刷，故无 reward hacking 空间。GRPO 是『同题多人作答排名次』：一组 8 个回答互相比较，比组均分高的是正优势——省掉了估计基线的Critic。R1-Zero 的思考长度爆发是『为了通关自发多打草稿』：奖励只看对错，长思考是策略不是奖励偏置。

### 核心概念与原理详解

## 从科学奇迹到工业落地：完整 DeepSeek-R1 流水线

为了攻克 R1-Zero 的可读性与混杂缺陷，DeepSeek 团队设计了教科书级的**四阶段混合训练范式**：

\`\`\`
[ 阶段 1: 冷启动 SFT (Cold-Start) ]
  几千条精美长思维链示范数据 (规范 <think> 结构与语言纯度)
           ↓
[ 阶段 2: 面向推理的强化学习 (Reasoning RL) ]
  大规模数学/代码 RLVR + 语言一致性惩罚 (激发极致解题能力)
           ↓
[ 阶段 3: 拒绝采样与通识微调 (Rejection Sampling SFT) ]
  用上述模型生成 60 万条精选样本 + 20 万通用对话 (兼顾通识能力)
           ↓
[ 阶段 4: 全场景全要素强化学习 (All-Scenario RL) ]
  数学/代码规则奖励 + 通识偏好奖励 (打造既聪明又安全的超级助手)
\`\`\`

### 1. 冷启动 SFT（Cold-Start SFT）
- 收集仅数千条经过人工精心排版、结构清晰、语言地道的 Long-CoT 范例；
- 作用：不图让模型学会新知识，纯粹**立规矩**——教会模型规范使用 \`<think>...</think><answer>...</answer>\` 标签，并始终保持语言单一纯净。

### 2. 面向推理的强化学习（Reasoning-oriented RL）
- 在冷启动权重上展开大规模 GRPO；
- 奖励函数加入**语言一致性惩罚**：计算思维链中目标语言字符比例，若中英杂糅则扣除奖励。

### 3. 拒绝采样（Rejection Sampling）与二次微调
- 让训练好的检查点针对数十万道题目进行多次采样生成；
- **只保留最终判定完全正确的样本**，并剔除思考混乱的数据，沉淀出 60 万条极致干净的黄金 Long-CoT 数据集；
- 融合 20 万条写作、角色扮演、创意问答等通用通识数据，进行一轮全量 SFT 微调。

### 4. 全场景强化学习（All-Scenario RL）
- 采用双轨制奖励机制：对于客观题目继续用 RLVR 保证推理不退化，对于开放式通识对话采用人类偏好奖励模型（RM），确保模型的安全、友善与实用。

## 蒸馏（Distillation）：小模型的降维赋能

在研发 R1 的过程中，DeepSeek 团队取得了一个极具商业颠覆性的洞察：

> **大模型的推理思维范式，可以通过数据蒸馏（Distillation）原汁原味地传递给小模型！而且蒸馏效果远远超过小模型自己做 RL！**

### 惊人的实验对比数据
- **R1-Distill-Qwen-1.5B**：仅 15 亿参数，在 MATH 竞赛基准上竟能达到 80%+ 的准确率，轻松碾压上一代未经思维链蒸馏的 70B 大模型；
- **R1-Distill-Qwen-32B**：全面比肩 OpenAI o1-mini，成为端侧与私有化部署的绝对王者。

### 为什么蒸馏能击败小模型自主 RL？
1. **探索陷阱**：小模型搜索空间狭窄，自己做 RL 很容易陷入局部最优或全错无梯度的死循环；
2. **名师指路**：大模型生成的 80 万条长思考链，完整包含了“如何立论、如何反思、如何自纠错、如何多路径验证”的认知范例。小模型通过 SFT 模仿这些思考范式，以极低算力成本获得了高阶推理灵魂！

<RLHFArchDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np, re
# ---- 1. RLVR：规则奖励 ----
def reward(ans, truth):
    m = re.search(r"\\\\boxed\\{([-0-9.]+)\\}", ans)
    if not m: return 0.0
    return 1.0 if abs(float(m.group(1)) - truth) < 1e-6 else 0.0
print("RLVR:", reward("所以 \\\\boxed{42}", 42), reward("所以 \\\\boxed{40}", 42), reward("答案 42", 42))
# ---- 2. GRPO：组内相对优势 ----
rng = np.random.default_rng(0)
def grpo_group(policy_acc, G=8):
    rs = (rng.random(G) < policy_acc).astype(float)
    adv = (rs - rs.mean()) / (rs.std() + 1e-8)
    return rs, adv
rs, adv = grpo_group(0.4)
print("组奖励:", rs.astype(int), "| 组内优势:", np.round(adv, 2), "（省去 Critic）")
all_same = np.ones(8); print("全对组优势:", np.round((all_same-all_same.mean())/(all_same.std()+1e-8), 2), "→ 无梯度，需混难度")
# ---- 3. 测试时计算：R1-Zero 轨迹 ----
steps = [0, 500, 2000]
acc = [15.6, 45.0, 71.0]; think = [200, 2000, 9000]
for s, a, t in zip(steps, acc, think):
    print(f"step {s}: 准确率 {a}% 思考长度 ~{t} 字（无长度奖励偏置，自发涌现）")\`\`\`

预期输出（实测）：RLVR：oxed{42} 得 1.0、oxed{40} 与无标签得 0；GRPO 组奖励 [0,1,1,1,0,0,0,0] → 优势 [-0.77,+1.29,...]（免 Critic），全对组优势全 0 需混难度；R1-Zero 轨迹：step 0/500/2000 准确率 15.6%/45%/71%、思考长度 200→9000 字（无长度奖励偏置，自发涌现）。

**常见错误**：RLVR 奖励函数里混入『答案长度』等启发项，模型学会写长答案刷分（reward hacking 复活）；GRPO 组内 8 个回答全对/全错导致优势全 0、梯度消失，需混合难度题；把 R1-Zero 的可读性缺陷当『风格』保留上线。

### 常见误区

1. **『RLVR 适用于一切任务』**——它要求结果可验证，开放式写作仍需偏好模型；\\n2. **『思考变长=奖励函数鼓励长』**——R1-Zero 未加长度偏置，长度是准确率的副产品（test-time compute）；\\n3. **『蒸馏弱于小模型自己做 RL』**——R1 实验相反：蒸馏大模型的推理范式远胜小模型自训。

### 知识关联

- **向前**：c2 的 RLHF 管偏好对齐，本章管可验证能力；两者在 R1 流水线阶段 4 合流；
- **向后**：DeepSeek-V3 的 MoE 架构（llm-a4）是这些算法的算力底座；
- **平行**：llm-b2 的评估纪律在本章变成奖励函数设计。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| RLVR | 规则引擎给奖励：答案比对/单元测试，防 hacking |
| GRPO | 组内相对优势 (r−mean)/std 替代 Critic |
| R1-Zero | 纯 RL：思考长度 15.6%→71.0% 准确率自发涌现 |
| R1 四阶段 | 冷启动 SFT→推理 RL→拒绝采样 SFT→全场景 RL |
| 蒸馏 | 大模型推理范式可蒸馏给 1.5B 小模型 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Ouyang et al. (2022)《InstructGPT》、Rafailov et al. (2023) arXiv:2305.18290《DPO》、Shao et al. (2024)《GRPO》与 DeepSeek-R1 技术报告相应章节）
`,
        tips: [
          {
            kind: 'interview',
            text: '面试总结必背：DeepSeek-R1 最具行业颠覆性的两点贡献是什么？1）证明了推理与自我反思能力可以在纯 RL 下自然涌现（R1-Zero）；2）证明了高质量推理思维链可以直接蒸馏给小模型，打破了“只有千亿大模型才能具备深度思考”的算力神话。',
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-b4-c3-e1',
        type: 'single',
        difficulty: 2,
        question: 'GRPO 相比 PPO 的核心改进是？',
        options: [
          { value: 'A', text: '使用更大的 batch size' },
          { value: 'B', text: '去掉 Critic 模型，用同一问题多个回答的组内相对优势作为 baseline' },
          { value: 'C', text: '不需要奖励信号' },
          { value: 'D', text: '使用了更强的模型' },
        ],
        answer: 'B',
        explanation:
          'PPO 需要与策略同规模的 Critic 估计 baseline，显存翻倍。GRPO 对同一问题采样 G 个回答，用组内均值作 baseline、标准差归一化，省掉 Critic。',
        tags: ['GRPO'],
      },
      {
        id: 'llm-b4-c3-e2',
        type: 'judge',
        difficulty: 2,
        question: 'RLVR（可验证奖励强化学习）适用于开放式写作任务。',
        answer: false,
        explanation:
          'RLVR 依赖能自动验证答案对错，适用于数学、代码、逻辑等有标准答案的任务。开放式写作无法自动验证，需要人类偏好（RLHF/DPO）。',
        tags: ['RLVR'],
      },
      {
        id: 'llm-b4-c3-e3',
        type: 'multiple',
        difficulty: 3,
        question: 'GRPO 训练时如果某道题采样的一组回答全部答对，会发生什么？（多选）',
        options: [
          { value: 'A', text: '组内标准差为 0' },
          { value: 'B', text: '所有优势为 0，没有梯度信号' },
          { value: 'C', text: '这道题对训练没有贡献' },
          { value: 'D', text: '模型会过度学习这道题的解法' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误——恰恰相反，没有梯度意味着没有学习。这解释了为什么题目难度必须在能力边界上，且需要课程学习。',
        tags: ['GRPO'],
      },
      {
        id: 'llm-b4-c3-e4',
        type: 'fill',
        difficulty: 3,
        question: 'DeepSeek-R1 的「___」版本直接在基座模型上做纯 RL，跳过 SFT，证明推理能力可以自发涌现。',
        blanks: [['R1-Zero', 'R1Zero', 'zero', 'Zero']],
        explanation:
          'R1-Zero 用纯 GRPO 训练，模型自发学会长链推理、自我验证与反思（Aha Moment）。代价是可读性差、语言混杂，所以最终版 R1 加入了 SFT 冷启动。',
        tags: ['R1'],
      },
      {
        id: 'llm-b4-c3-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现 GRPO 组内优势：grpo_advantages(rewards, eps=1e-8)。\n\n返回 (advantages, mean, std)，其中 advantages = (r - mean) / (std + eps)，用 numpy 计算。',
        starterCode: `import numpy as np

def grpo_advantages(rewards, eps=1e-8):
    r = np.array(rewards, dtype=float)
    mean = ___
    std = ___
    return (r - mean) / (std + eps), mean, std


grpo_advantages([1, 0, 1, 0])
`,
        setupCode: '',
        expectedOutput: '优势有正有负，均值 0',
        tests: `import numpy as np
adv, m, s = grpo_advantages([1, 0, 1, 0])
assert abs(m - 0.5) < 1e-9, f"均值应为 0.5，实际 {m}"
assert abs(adv.mean()) < 1e-6, "优势的均值应约等于 0"
assert adv[0] > 0 and adv[1] < 0, "奖励高的优势应为正，低的为负"
adv2, _, s2 = grpo_advantages([1,1,1,1])
assert s2 == 0.0, "全对时标准差为 0"
assert np.allclose(adv2, 0.0), "全对时优势应全为 0"
adv3, _, s3 = grpo_advantages([0,0,0,0])
assert np.allclose(adv3, 0.0), "全错时优势应全为 0"
`,
        answer: `import numpy as np

def grpo_advantages(rewards, eps=1e-8):
    r = np.array(rewards, dtype=float)
    mean = r.mean()
    std = r.std()
    return (r - mean) / (std + eps), mean, std


grpo_advantages([1, 0, 1, 0])`,
        explanation:
          '为什么加 eps：全对/全错时 std=0，不加 eps 会除零。加了之后优势为 0（无梯度），这是正确的行为。\n\n这套计算完全替代了 PPO 的 Critic。',
        tags: ['编程', 'GRPO'],
      },
      {
        id: 'llm-b4-c3-e6',
        type: 'code',
        difficulty: 3,
        question:
          '模拟 GRPO 的题目难度筛选：filter_by_difficulty(rewards_matrix)。\n\n输入是二维列表（每题一行，每行是一组采样的奖励）。\n返回 (有效题目数, 总题目数, 有效题目索引列表)，其中有效指组内标准差大于 0。',
        starterCode: `import numpy as np

def filter_by_difficulty(rewards_matrix):
    valid = []
    ___
    return len(valid), len(rewards_matrix), valid


filter_by_difficulty([[1,0,1,0], [1,1,1,1], [0,0,0,0], [1,1,0,1]])
`,
        setupCode: '',
        expectedOutput: '(2, 4, [0, 3])',
        tests: `n, total, idx = filter_by_difficulty([[1,0,1,0], [1,1,1,1], [0,0,0,0], [1,1,0,1]])
assert total == 4, f"总题数应为 4，实际 {total}"
assert n == 2, f"有效题应为 2，实际 {n}"
assert idx == [0, 3], f"有效索引应为 [0,3]，实际 {idx}"
n2, t2, i2 = filter_by_difficulty([[1,0],[0,1],[1,0]])
assert n2 == 3 and i2 == [0,1,2]
n3, t3, i3 = filter_by_difficulty([[1,1],[0,0]])
assert n3 == 0 and i3 == []
`,
        answer: `import numpy as np

def filter_by_difficulty(rewards_matrix):
    valid = []
    for i, rewards in enumerate(rewards_matrix):
        if np.std(rewards) > 0:
            valid.append(i)
    return len(valid), len(rewards_matrix), valid


filter_by_difficulty([[1,0,1,0], [1,1,1,1], [0,0,0,0], [1,1,0,1]])`,
        explanation:
          '这是推理模型训练的关键工程步骤：过滤掉太简单和太难的题目，只保留在模型能力边界上的。\n\n实践中这个筛选是动态的——随着模型变强，原来有效的题目会全对，需要不断补充更难的新题。',
        tags: ['编程', '难度筛选'],
      },
      {
        id: 'llm-b4-c3-e7',
        type: 'judge',
        difficulty: 3,
        question: 'DeepSeek-R1 证明推理能力必须通过 SFT 示范才能获得。',
        answer: false,
        explanation:
          'R1-Zero 直接在基座模型上做纯 RL（跳过 SFT），模型就自发学会了长链推理、自我验证与反思。这证明推理能力可以通过 RL 涌现。R1 加入 SFT 冷启动是为了改善可读性。',
        tags: ['R1'],
      },
      {
        id: 'llm-b4-c3-e8',
        type: 'open',
        difficulty: 5,
        question:
          '请完整说明 DeepSeek-R1 的训练流程（R1-Zero → R1 → 蒸馏），分析每个阶段的作用，并解释为什么「可验证奖励 + 组内相对优势 + 难度适中的题目」三者缺一不可。',
        referenceAnswer: `**一、R1-Zero：纯 RL 的探索**

做法：直接在 DeepSeek-V3-Base 上用 GRPO 训练，完全跳过 SFT，奖励只有两项：
1. 准确性奖励：数学题答案对/错；代码题是否通过测试；
2. 格式奖励：是否把推理过程包在 think 标签内。

结果：
- 模型自发涌现长链推理、自我验证、反思（等等，让我重新检查）；
- AIME 数学竞赛得分从 15.6% 提升到 71.0%；
- 但这个未经雕琢的版本可读性差、中英混杂、格式混乱。

意义：证明推理能力可以通过纯 RL 涌现，不需要 SFT 示范。

**二、R1：工程化的完整版本**

四个阶段：

1. 冷启动 SFT：用 R1-Zero 生成数千条高质量推理数据，
   人工筛选（保证可读性与正确性）后做 SFT，让模型有良好的初始格式；
2. 推理 RL（GRPO）：在冷启动模型上做 GRPO，
   同时加语言一致性奖励（统计目标语言词占比，防止中英混杂）；
3. 拒绝采样 + SFT：用训练好的模型生成大量回答，
   只保留答案正确的，做第二轮 SFT（约 60 万条）；
4. 全场景 RL：对通用对话、写作、安全等任务做 RL，
   使模型不仅会推理，也是好助手。

结果：效果与 R1-Zero 相当，但可读性、语言一致性大幅改善。

**三、蒸馏：把推理能力传给小模型**

用 R1 生成的约 80 万条推理数据，直接 SFT 到 Qwen/Llama 系列
（1.5B ~ 70B），不做 RL。

结果：
- R1-Distill-Qwen-7B 在 AIME 上超过 GPT-4o；
- R1-Distill-Qwen-32B 接近 o1-mini。

意义：推理能力可以通过数据蒸馏传递，
小模型也能获得大模型的推理模式，成本远低于自己做 RL。

**四、为什么三要素缺一不可**

① 可验证奖励（RLVR）

- 如果有奖励模型，模型会找到 reward hacking 的方式
  （输出让 RM 高分但实际错误的内容）；
- 数学/代码的答案正确性是客观可判定的，无法欺骗；
- 而且可以无限生成数据（题目容易批量构造），成本极低。

② 组内相对优势（GRPO）

- 传统 PPO 需要 Critic 估计 baseline，显存翻倍且难训；
- GRPO 对同一题采样 G 个回答，用组内均值作 baseline；
- 关键：优势来自组内方差——有对有错才有梯度。

③ 难度适中的题目

- 全对：组内标准差 = 0，优势全 0，没有梯度；
- 全错：同样无梯度；
- 只有部分正确时，优势才有正负之分，才能告诉模型哪种解法更好；
- 所以必须做难度筛选 + 课程学习：从易到难，动态补充难度合适的题。

三者的关系：

    可验证奖励（提供无噪声的信号）
        x
    组内相对优势（把信号转化为可用的梯度）
        x
    难度适中（保证信号非零）
        = 有效的推理训练

任何一环失效，训练就会停滞。

**五、实践启示**

1. 先确认任务有可验证的判据（没有就退回 RLHF/DPO）；
2. 采样数量 G 与多样性要够（G=8~64）；
3. 建立难度分级题库，动态筛选；
4. 保留 SFT 冷启动以改善可读性；
5. 小模型用蒸馏而非自己做 RL。`,
        rubric: [
          { point: 'R1-Zero 纯 RL 跳过 SFT + 涌现现象（Aha Moment）', score: 3 },
          { point: 'R1 四阶段流程（冷启动/RL/拒绝采样/全场景）', score: 2 },
          { point: '蒸馏的意义：推理能力可通过数据传递', score: 2 },
          { point: '三要素相互作用：无噪声信号 x 可用梯度 x 非零方差', score: 3 },
        ],
        keywords: ['R1-Zero', 'GRPO', '可验证奖励', '组内方差', '难度筛选', '蒸馏'],
        explanation:
          '这是本课程最前沿也最综合的一题。能画出信号 x 梯度 x 非零方差这个关系，就真正理解了大模型推理训练的机制。',
        tags: ['R1', 'GRPO', '综合', '面试'],
      },
      {
        id: 'llm-b4-c3-e9',
        type: 'single',
        difficulty: 2,
        question: '在 GRPO 训练中，采样候选数 G（Group Size）的设置通常在 8~64 之间。增大 G 的主要优势与代价是什么？',
        options: [
          { value: 'A', text: '优势是方差估计更准且更容易涵盖正确解；代价是前向采样推理显存与计算时间大幅上升' },
          { value: 'B', text: '优势是完全消除对 KL 惩罚的需求；代价是模型参数量翻倍' },
          { value: 'C', text: '优势是能直接在开放性作文上跑通 RL；代价是无法验证数学题' },
          { value: 'D', text: '优势是消除了对温度系数采样随机性的依赖；代价是学习率必须设为 0' },
        ],
        answer: 'A',
        explanation:
          'G 越大，对该 prompt 的经验均值基准与标准差估计越稳健，在难题上摸到正确答案的概率也更高；但代价是需要并发生成更多候选 token，推理与显存开销线性增加。',
        tags: ['GRPO', '参数配置'],
      },
      {
        id: 'llm-b4-c3-e10',
        type: 'single',
        difficulty: 2,
        question: '在 DeepSeek-R1-Zero 的纯强化学习过程中，思维链（思考 Token）的长度自然增长，其根本驱动力是什么？',
        options: [
          { value: 'A', text: '研发人员在奖励函数中按 token 数量给予了线性长度加分' },
          { value: 'B', text: '模型在复杂题上通过拓展测试时计算（Test-Time Compute）以多轮反思排查错误，从而获得更高的准确性最终奖励' },
          { value: 'C', text: 'Softmax 温度系数被设置为了负数' },
          { value: 'D', text: '基座模型的预训练上下文窗口被强行截断' },
        ],
        answer: 'B',
        explanation:
          'R1-Zero 的奖励中绝无鼓励冗长的条款。长度爆炸完全是强化学习在复杂数学代码目标下涌现的“测试时计算策略”，更充分的思考链换取了更高成功率。',
        tags: ['R1-Zero', '涌现'],
      },
      {
        id: 'llm-b4-c3-e11',
        type: 'judge',
        difficulty: 2,
        question: '在没有高水平教师模型指导的情况下，直接在 1.5B 稠密小模型上启动纯 R1-Zero 训练，通常能轻松获得媲美大模型的长链思考与自纠错能力。',
        answer: false,
        explanation:
          '错误。小模型参数容量小、基础先验知识不足，在面对困难数学代码题时探索能力极弱（经常整组回答全错导致优势全 0），极难自发启动涌现；小模型通过蒸馏大模型的推理数据是远为高效的路径。',
        tags: ['蒸馏', '模型规模'],
      },
      {
        id: 'llm-b4-c3-e12',
        type: 'single',
        difficulty: 2,
        question: '在面向代码题目的 RLVR 奖励验证器中，为什么基于沙箱执行单元测试（Unit Tests）远优于使用大模型作为裁判（LLM-as-a-Judge）？',
        options: [
          { value: 'A', text: '沙箱单元测试判定具有客观确定性，彻底杜绝了模型走捷径（Reward Hacking）与主观幻觉评分' },
          { value: 'B', text: 'LLM-as-a-Judge 无法处理英文字符' },
          { value: 'C', text: '沙箱执行不需要消耗任何 CPU 或网络资源' },
          { value: 'D', text: '单元测试能直接修改策略模型的权重参数' },
        ],
        answer: 'A',
        explanation:
          'LLM 裁判存在谄媚性、长度偏见与自相矛盾的漏洞，策略模型极易学会产生表面花哨实则包含语法错误的伪代码；而沙箱测试用例是严苛的真实执行，客观零欺骗。',
        tags: ['RLVR', '代码验证'],
      },
      {
        id: 'llm-b4-c3-e13',
        type: 'code',
        difficulty: 3,
        question:
          '编写 rule_based_verifier(response, ground_truth) 函数：验证模型生成的思考回答。\n\n规则:\n1. 格式分 (0.2 分)：必须包含完整的 <think>...</think> 标签，且最后包含 <answer>...</answer> 标签；若不满足格式，总分直接得 0.0 分。\n2. 正确性分 (0.8 分)：提取 <answer> 内的文本并去除两端空格，若与 ground_truth 完全一致，获得 0.8 分。\n返回最终得分（0.0, 0.2 或 1.0）。',
        starterCode: `import re

def rule_based_verifier(response: str, ground_truth: str) -> float:
    # 请在此编写正则提取与判分逻辑
    pass
`,
        setupCode: '',
        expectedOutput: '1.0',
        tests: `import re
r1 = "<think>2+2=4</think><answer>4</answer>"
assert rule_based_verifier(r1, "4") == 1.0
r2 = "<think>2+2=5</think><answer>5</answer>"
assert rule_based_verifier(r2, "4") == 0.2
r3 = "The answer is 4"
assert rule_based_verifier(r3, "4") == 0.0
r4 = "<think>only think</think>"
assert rule_based_verifier(r4, "4") == 0.0
`,
        answer: `import re

def rule_based_verifier(response: str, ground_truth: str) -> float:
    pattern = r"<think>(.*?)</think>.*?<answer>(.*?)</answer>"
    match = re.search(pattern, response, flags=re.DOTALL)
    if not match:
        return 0.0
    ans_text = match.group(2).strip()
    return 1.0 if ans_text == ground_truth.strip() else 0.2
`,
        explanation:
          '这是 RLVR 系统最标准的基础双轨奖励设计：格式分促使模型保持规范的标签结构，准确分作为主要驱动力促使答案收敛到真值。',
        tags: ['编程', 'RLVR', '正则'],
      },
      {
        id: 'llm-b4-c3-e14',
        type: 'code',
        difficulty: 3,
        question:
          '实现 grpo_clip_loss(advantages, pi_logp, old_logp, eps_clip=0.2) 核心代理损失函数。\n\n公式:\n1. 重要性比率 r = exp(pi_logp - old_logp)\n2. 截断比率 r_clipped = clip(r, 1 - eps_clip, 1 + eps_clip)\n3. 目标项 obj = min(r * A, r_clipped * A)\n4. 返回策略损失 loss = -mean(obj)（浮点数四舍五入保留 4 位小数）。',
        starterCode: `import numpy as np

def grpo_clip_loss(advantages: np.ndarray, pi_logp: np.ndarray, old_logp: np.ndarray, eps_clip: float = 0.2) -> float:
    # 请在此编写你的代码
    pass
`,
        setupCode: '',
        expectedOutput: '-1.0000',
        tests: `import numpy as np
adv = np.array([1.0, -1.0])
pi = np.array([-0.5, -0.5])
old = np.array([-0.5, -0.5])
assert abs(grpo_clip_loss(adv, pi, old)) < 1e-4

adv2 = np.array([2.0])
pi2 = np.array([0.0])
old2 = np.array([-2.0])
assert abs(grpo_clip_loss(adv2, pi2, old2) - (-2.4)) < 1e-3
`,
        answer: `import numpy as np

def grpo_clip_loss(advantages: np.ndarray, pi_logp: np.ndarray, old_logp: np.ndarray, eps_clip: float = 0.2) -> float:
    ratio = np.exp(pi_logp - old_logp)
    surr1 = ratio * advantages
    surr2 = np.clip(ratio, 1.0 - eps_clip, 1.0 + eps_clip) * advantages
    loss = -np.mean(np.minimum(surr1, surr2))
    return float(np.round(loss, 4))
`,
        explanation:
          'GRPO 借由与 PPO 相同的截断代理目标（Clipped Surrogate Objective），保证每次更新策略分布不会偏离旧分布太远，保证训练的平滑单调收敛。',
        tags: ['编程', 'GRPO', '损失函数'],
      },
      {
        id: 'llm-b4-c3-e15',
        type: 'judge',
        difficulty: 2,
        question: '在 DeepSeek-R1 的知识蒸馏中，小模型仅学习 R1 输出的最终答案，而将包含反思与尝试的 <think> 思维链部分全部剔除。',
        answer: false,
        explanation:
          '错误。蒸馏最核心的价值正是完整的长思维链（Long-CoT）！小模型通过模仿大模型在 <think> 中展现出的自我反思、步骤拆解与纠错逻辑，从而习得高水平的推理范式。',
        tags: ['蒸馏', '思维链'],
      },
      {
        id: 'llm-b4-c3-e16',
        type: 'open',
        difficulty: 4,
        question:
          '请阐述“测试时计算（Test-Time Compute）”与传统预训练“Scaling Law”的关系，并分析为什么以 DeepSeek-R1 为代表的推理模型正在开辟第二增长曲线。',
        referenceAnswer: `**一、传统预训练 Scaling Law 的瓶颈**
1. 传统 Scaling Law 侧重在训练阶段增加参数量（Model Size）和预训练 Token 数量；
2. 随着互联网高质量人类自然语料逐渐被穷尽，继续堆砌预训练算力带来的边际收益正在显著放缓；
3. 稠密模型参数增大还会带来部署延迟与显存带宽的高昂成本。

**二、测试时计算（Test-Time Compute）的本质**
1. 推理模型开辟了在生成阶段（Inference Time）投入更多算力换取智能的新维度；
2. 模型不再急于在 100 个 Token 内给出草率答案，而是被允许生成数千乃至上万个思考 Token，展开启发式搜索、多路径假设检验与自纠错；
3. 本质上是将强化学习的搜索空间从训练期平移至推理期，以动态思考长度应对不同难度的挑战。

**三、为什么它开辟了第二增长曲线**
1. 算力效率突破：小模型通过多思考几千个 Token（测试时计算），在复杂数学与代码上可以击败不假思索直接输出的万亿超大模型；
2. 智能涌现范式转移：从单纯的“知识记忆与词语关联”升级为具备“自我审视、逻辑演绎与元认知”的深层智能系统。`,
        rubric: [
          { point: '阐明预训练语料瓶颈与 Scaling Law 放缓背景', score: 3 },
          { point: '解释测试时计算（生成期投入思考 token 自纠错）的数学与算法本质', score: 4 },
          { point: '分析推理模型开辟第二曲线对算力分配与小模型赋能的深远意义', score: 3 },
        ],
        keywords: ['测试时计算', 'Scaling Law', 'Test-Time Compute', '长思考链', '搜索与反思'],
        explanation:
          '深入考察对 2025 年推理大模型范式跃迁的宏观认知，理解从“堆预训练参数”向“激发推理期算力”的技术路线转移。',
        tags: ['深度思考', 'ScalingLaw', '行业洞察'],
      },
    ],
  },
];
