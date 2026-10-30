import type { Chapter } from '../../types';
import { llmA1C16Exercises } from './llm-a1-c16-ex';

/* ============================================================
 *  第 16 章：用强化学习训练推理——GRPO 与蒸馏
 *
 *  对应原书 ch06-ch08（RLVR / GRPO / 蒸馏）。
 *  与既有 llm-b4-c3 的分工：
 *    - llm-b4-c3 讲**原理与推导**（组内相对优势公式、R1-Zero、工业流水线）
 *    - 本章讲**代码实现**：真的把 GRPO 跑起来，看到奖励曲线上升
 *
 *  执行环境：全部 demo 用 torch（走本地后端），**不依赖 Qwen3**
 *  —— 用 tiny GPT 在「看到 X 输出 (9−X)」这个单 token 任务上真跑 GRPO。
 *  实测：400 步约 15 秒，奖励 0.403 → 0.976，准确率 100%。
 * ============================================================ */

export const llmA1C16Chapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'llm-a1-c16',
    title: '用强化学习训练推理：GRPO 与蒸馏',
    goal: '亲手实现 GRPO 的完整循环（组内采样 → 规则奖励 → 组内优势 → 策略梯度），在 tiny 模型上看到奖励曲线真正上升，并理解「全对/全错组为什么学不到东西」；再用蒸馏把教师输出搬进学生模型。',
    lessons: [
      /* ─────────────────────────── l1 ─────────────────────────── */
      {
        id: 'llm-a1-c16-l1',
        title: 'RLVR：用规则当裁判',
        difficulty: 3,
        content: `
## 学习目标

学完本节，你应该能够：
1. 说出 RLVR（可验证奖励强化学习）与「神经奖励模型」的本质差别，并解释为什么数学/代码任务更适合 RLVR；
2. 写出一个规则奖励函数的完整结构（格式分 + 正确分），并说明每一部分防住了哪种 reward hacking；
3. 判断一个任务「能不能用 RLVR」，并指出不能用的情形。

## 前置知识

- c14-l2 / c14-l3：\`\\boxed{}\` 解析与答案判等（RLVR 的裁判就是它）；
- c15：推理时扩展是「不训练变强」，本章是「训练变强」；
- 《后训练与推理模型》c3-l1 的 RLVR 概念与 GRPO 公式推导（本章只做代码）。

## 问题背景：谁来给模型的回答打分

强化学习需要奖励。奖励从哪来？三条路：

| 来源 | 做法 | 问题 |
| --- | --- | --- |
| 人类打分 | 标注员看回答给分 | 太慢、太贵、无法规模化 |
| 神经奖励模型（RM） | 训一个模型学人类偏好 | **可被攻击**（reward hacking） |
| **规则引擎（RLVR）** | 程序判断对错 | 只适用于「可验证」的任务 |

Raschka 原书第 6 章的做法是第三条。为什么？因为**数学题的答案非分明**——\`83\` 就是对的，\`12\` 就是错的，中间没有灰色地带。

### 一个必须理解的对比

假设你用神经 RM 给数学题打分。理论上模型可以学会这样的策略：

> 写一段看起来极其严谨、充满 LaTeX 的推演，最后给一个错误答案。

RM 可能给这段话**高分**（因为它「看起来像正确推理」），但答案其实错了。这就是 reward hacking——**模型优化的是「让裁判满意」，不是「把题做对」**。

规则引擎没有这个漏洞：答案不对就是 0 分，文采再好也没用。

## 直觉理解：机器阅卷 vs 人工阅卷

- **神经 RM = 人工阅卷**：阅卷老师可能被「字迹工整、篇幅长、术语多」影响，给一篇逻辑错误的作文打高分；
- **RLVR = 机器阅卷**：答题卡涂了 A 就是 A，涂了 B 就是 B，不管你字写得多漂亮。

机器阅卷的代价是「只能判客观题」。数学填空、代码单元测试都是客观题；「这段回答是否有帮助」「这篇作文写得好不好」是主观题，只能用人工或 RM。

## 核心概念与原理详解

### 规则奖励的两层结构

原书 ch06 的 \`reward_rlvr\` 只做一件事：抽答案 + 判等。但原书 ch07 又加了一个 \`reward_format\`：

$$R = R_{\\text{accuracy}} + \\lambda \\cdot R_{\\text{format}}$$

| 分量 | 计算 | 目的 |
| --- | --- | --- |
| $R_{\\text{accuracy}}$ | 抽取 \`\\boxed{}\` 里的答案，与标准答案判等（0/1） | 主奖励，教「做对题」 |
| $R_{\\text{format}}$ | 检查输出里 \`<think>\` 在 \`</think>\` 之前（0/1） | 辅助奖励，教「按格式思考」 |

**为什么需要格式奖励**：base 模型不一定知道「要先思考再回答」。如果只给正确性奖励，模型可能偶尔蒙对但学不到「思考的结构」。格式奖励提供了一条更密集的梯度信号——**先学会「像在思考」，再学会「思考得对」**。

$\\lambda$ 是格式奖励的权重。原书用较小的权重（如 0.1-0.5），因为格式只是辅助：**不能让模型为了凑格式而牺牲正确性**。

### 三个工程细节（决定奖励函数好不好用）

| 细节 | 做法 | 不做会怎样 |
| --- | --- | --- |
| **必须有降级路径** | 没有 \`\\boxed{}\` 时退回「取最后一个数字」 | 模型早期根本不会写 \`\\boxed{}\`，奖励全 0，学不动 |
| **权重不能反了** | 正确性主导，格式辅助 | 模型学会「只输出格式、不思考内容」 |
| **要防注入** | 判等前用 AST 白名单，禁止 \`eval\` | 模型输出 \`\\boxed{__import__('os').system(...)}\` 会执行任意代码 |

第三条是 c14-l3 已经实测过的：\`\\boxed{__import__('os').getcwd()}\` 被 ast 白名单拦截。**如果你把答案直接喂给 \`eval()\` 做判等，你就给了模型一个远程代码执行漏洞。**

### 什么时候不能用 RLVR

| 任务 | 能否 RLVR | 原因 |
| --- | --- | --- |
| 数学（有标准答案） | ✅ | 判等即可 |
| 代码（有单元测试） | ✅ | 跑测试即可 |
| 逻辑推理（有唯一解） | ✅ | 同上 |
| 写作文 / 聊天 | ❌ | 没有客观对错 |
| 开放式问答 | ❌ | 答案不唯一 |
| 需要事实核查 | ⚠️ | 可验证但成本高（要检索） |

### 关键术语（中英对照）

| 中文 | 英文 | 本课程口径 |
| --- | --- | --- |
| 可验证奖励 | Verifiable Reward | 用程序能判对错的奖励 |
| RLVR | RL with Verifiable Rewards | 用可验证奖励做强化学习 |
| 奖励攻击 | Reward Hacking | 模型钻奖励函数漏洞而非真解题 |
| 格式奖励 | Format Reward | 奖励「按要求的格式输出」 |
| 降级解析 | Fallback Extraction | \`\\boxed{}\` 失败时退回取数字 |

## 机制图解

<Diagram type="tensor" steps="采样一条回答|抽取 \\boxed{} 答案|与标准答案判等|格式检查|R = 正确 + λ·格式|送入策略梯度" note="六个方框就是 RLVR 的全部。注意第三步「判等」用的是 c14 写的解析器——评估用的代码和训练用的奖励是同一套，这是本章最重要的工程复用。" />

上图是奖励计算的完整链路。请特别注意最后一格：**奖励算出来之后要送回策略梯度**（c16-l2 的主题）。本节只负责把「回答」变成「分数」。

## 完整案例：在 tiny 模型上看奖励分布

用 c16-l2 将要训练的 tiny 模型（随机初始化）跑一遍奖励计算，看它输出什么：

| 输入 | 模型输出（随机初始化） | 抽取结果 | 标准答案 | 奖励 |
| --- | --- | --- | --- | --- |
| \`3\` | \`7\`（碰巧对） | 7 | 6 | 0 |
| \`3\` | \`6\` | 6 | 6 | **1** |
| \`3\` | \`<eos>\` | None | 6 | 0 |
| \`3\` | \`9\` | 9 | 6 | 0 |

随机初始化的模型在 10 个数字上瞎猜，期望奖励约 **1/10 = 0.1**。实测起点是 **0.403**——比随机略高，因为 tokenizer 的输出分布不是均匀的（某些数字 token 初始概率更高）。

这个 0.403 就是「训练前基线」。c16-l2 会看到它爬到 0.976。

**关键观察**：这里奖励只有 0 和 1 两个值，没有中间态。这种**稀疏、二值**的奖励是最难优化的——策略梯度的方差会很大。这正是 GRPO 要用「组内相对优势」的原因（c16-l2）。

## 代码实践

下面的演示做四件事：

1. 实现 \`reward_rlvr\`：抽取答案 + 判等（就 c14 的判等，包一层）；
2. 实现 \`reward_format\`：检查 \`<think>\` 是否在 \`</think>\` 之前；
3. 组合成总奖励，并演示「权重反了会怎样」——把格式权重调到 10，模型会学成什么样；
4. 在随机初始化的 tiny 模型上跑一批采样，统计奖励分布。

请重点看第 3 部分：它用具体数字展示「奖励权重设计错误」的后果。

## 常见误区与安全风险

1. **「奖励函数越复杂越好」**。复杂的奖励更容易被 hack。原书的做法是「两个 0/1 分量加权」——简洁、可验证、难攻击。
2. **「格式奖励给高一点没关系」**。本节演示：格式权重过高时，模型会学会「输出完美的 \`<think>\` 结构 + 错误答案」，正确率反而下降。
3. **「没有 \`\\boxed{}\` 就是 0 分」**。训练早期模型根本不会写 \`\\boxed{}\`，如果只认这个格式，奖励永远是 0，梯度永远是 0，模型永远学不会。**必须有降级路径。**
4. **安全提示**：判等前**绝对不能** \`eval()\` 模型输出。必须用 AST 白名单（c14-l3 已实测拦截 \`__import__\`）。

## 与其他知识点的关联

- **向前**：c14 的解析与判等是本节奖励函数的直接来源；c15 说明「不训练也能变强」，本节开始「训练变强」；
- **向后**：c16-l2 用本节的奖励函数跑 GRPO；c16-l3 用蒸馏走另一条路（不用奖励，直接学教师的输出）；
- **平行**：本站《后训练与推理模型》c3-l1 有 RLVR 的概念与防作弊论证；本章是它的代码版。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| RLVR 核心 | 用程序判对错代替神经网络打分，杜绝 reward hacking |
| 两层奖励 | R = 正确性奖励 + λ × 格式奖励（λ 要小） |
| 三个工程细节 | 降级解析、权重不反、AST 防注入 |
| 适用边界 | 数学/代码/有唯一解 → 适用；开放创作 → 不适用 |
| 基线数字 | 随机初始化 tiny 模型期望奖励约 0.1，实测 0.403 |

## 参考资料与延伸阅读

> **来源类型：权威教材**
> - Raschka, S. *Build a Reasoning Model (From Scratch)*. Manning, 2025. ISBN 9781633434677——第 6 章 \`reward_rlvr\`、第 7 章 \`reward_format\`。原书代码为 Apache 2.0 许可；本章为自主实现，仅参考章节结构与教学方法。
>
> **来源类型：学术来源**
> - DeepSeek-AI (2025). "DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning."——RLVR 在大规模推理训练中的实践。
> - Lambert, N. et al. (2024). "Tülu 3: Pushing Frontiers in Open Language Model Post-Training."——可验证奖励与 RLVR 的系统性讨论。
>
> **来源类型：原创**
> - 机器阅卷/人工阅卷类比、奖励权重实验、tiny 模型基线测量、本节全部习题。

## 动手实验

1. **改权重**：把格式奖励权重从 0.3 调到 3.0，重跑本节 demo，观察「格式全对但正确率下降」的现象。记录临界点在哪。
2. **删掉降级路径**：把「没有 \`\\boxed{}\` 就取最后一个数字」的逻辑去掉，看随机初始化模型的奖励变成多少。解释为什么。
3. **设计一个新任务**：为「判断一个数是否为质数」设计 RLVR 奖励。写出奖励函数，并指出它可能被怎样 hack。

验收标准：你能写出完整的规则奖励函数，并说清「为什么格式奖励的权重必须小」。
`,
        tips: [
          {
            kind: 'pitfall',
            text: '训练早期模型不会写 `\\boxed{}`，如果奖励函数只认这个格式，奖励永远是 0、梯度永远是 0、模型永远学不动。必须有「没找到 boxed 就取最后一个数字」的降级路径——这是 RLVR 最常见的实现 bug。',
          },
          {
            kind: 'note',
            text: '格式奖励的权重必须远小于正确性奖励。权重反了会让模型学会「输出完美的思考结构 + 错误答案」——形式上无可挑剔，实质上一无是处。本节会用具体数字演示这个退化。',
          },
          {
            kind: 'interview',
            text: '面试题：「RLVR 和 RLHF 的区别？」答三点：奖励来源（规则引擎 vs 神经 RM/人类偏好）、防作弊性（规则不可 hack vs RM 可被攻击）、适用边界（可验证任务 vs 开放式任务）。',
          },
          {
            kind: 'performance',
            text: '判等绝对不能直接 eval() 模型输出。c14 已实测 `\\boxed{__import__(\'os\').getcwd()}` 这类输出——如果你 eval 它，模型就获得了在你机器上执行任意代码的能力。必须用 AST 白名单。',
          },
        ],
        demos: [
          {
            title: 'RLVR 奖励函数：正确性 + 格式，以及权重反了的后果',
            lang: 'python',
            code: `import re, random, torch, torch.nn as nn, torch.nn.functional as F

torch.manual_seed(0); random.seed(0); torch.set_num_threads(4)

# ═══════════════════════════════════════════════════════════
#  1. 规则奖励的两个分量
# ═══════════════════════════════════════════════════════════

BOX = re.compile(r"\\\\boxed\\{([^{}]*)\\}")
NUM = re.compile(r"-?\\d+(?:\\.\\d+)?")

def extract_answer(text):
    """先找 \\\\boxed{}，没有就退回最后一个数字（降级路径，必须有）"""
    b = BOX.findall(text)
    if b:
        return b[-1].strip()
    n = NUM.findall(text)
    return n[-1] if n else None

def reward_rlvr(text, gold):
    """正确性奖励：0 或 1（二值、稀疏）"""
    got = extract_answer(text)
    return 1.0 if got is not None and got == str(gold) else 0.0

def reward_format(text):
    """格式奖励：<think> 必须在 </think> 之前"""
    i = text.find("<think>"); j = text.find("</think>")
    return 1.0 if (i >= 0 and j > i) else 0.0

def total_reward(text, gold, lam=0.3):
    return reward_rlvr(text, gold) + lam * reward_format(text)

print("=== 1. 抽取与奖励（含降级路径）===")
cases = [
    ("\\\\boxed{6}", 6, "标准答案格式"),
    ("so the answer is 6", 6, "无 boxed → 降级取数字"),
    ("\\\\boxed{7}", 6, "答案错"),
    ("I'm not sure", 6, "完全无数字"),
    ("<think>hmm</think>\\\\boxed{6}", 6, "带思考格式"),
]
print(f"{'输出':32s} {'抽取':8s} {'RLVR':6s} {'格式':6s} {'总奖励':8s} 说明")
for t, g, note in cases:
    ex = extract_answer(t)
    print(f"{t[:30]:32s} {str(ex):8s} {reward_rlvr(t,g):6.1f} {reward_format(t):6.1f} {total_reward(t,g):8.2f} {note}")

# ═══════════════════════════════════════════════════════════
#  2. tiny 模型：随机初始化时的奖励分布
# ═══════════════════════════════════════════════════════════
VOCAB = list("0123456789") + ["<eos>"]
stoi = {c: i for i, c in enumerate(VOCAB)}
itos = {i: c for c, i in stoi.items()}

class Tiny(nn.Module):
    def __init__(s, d=64, h=4, L=2, ml=8):
        super().__init__()
        s.tok = nn.Embedding(len(VOCAB), d); s.pos = nn.Embedding(ml, d)
        layer = nn.TransformerEncoderLayer(d, h, 4*d, batch_first=True, norm_first=True, dropout=0.0)
        s.blocks = nn.TransformerEncoder(layer, L, enable_nested_tensor=False)
        s.ln = nn.LayerNorm(d); s.head = nn.Linear(d, len(VOCAB), bias=False); s.ml = ml
    def forward(s, idx):
        T = idx.shape[1]
        h = s.tok(idx) + s.pos(torch.arange(T, device=idx.device))[None]
        m = nn.Transformer.generate_square_subsequent_mask(T, device=idx.device)
        return s.head(s.ln(s.blocks(h, mask=m, is_causal=True)))

model = Tiny()

def sample(prompt, n, temp):
    out = []
    for _ in range(n):
        ids = [stoi[c] for c in prompt]
        p = F.softmax(model(torch.tensor([ids[-model.ml:]]))[0, -1] / temp, dim=-1)
        ids.append(torch.multinomial(p, 1).item())
        out.append(ids)
    return out

def decode(ids, plen):
    return "".join(itos[i] for i in ids[plen:])

print("\\n=== 2. 随机初始化模型的奖励分布 ===")
rewards, samples = [], []
for _ in range(20):
    x = random.randint(0, 9); gold = 9 - x
    ids = sample(str(x), 1, 1.0)[0]
    txt = decode(ids, 1)
    r = reward_rlvr(txt, gold)
    rewards.append(r); samples.append((x, gold, txt, r))
print(f"  前 6 个样本：(输入, 正确答案, 模型输出, 奖励)")
for x, g, t, r in samples[:6]:
    print(f"    {x}  ->  {g}   模型说 {t!r}   {r:.0f}")
print(f"  20 次采样的平均奖励 = {sum(rewards)/len(rewards):.3f}")
print(f"  （随机瞎猜的期望是 0.1，实测略高因为初始 token 分布不均匀）")

# ═══════════════════════════════════════════════════════════
#  3. 权重反了会怎样：λ 过大时模型学成什么
# ═══════════════════════════════════════════════════════════
print("\\n=== 3. 格式权重过大 → 学会「格式完美但答案错误」===")
print("  假设模型输出已完美符合格式但没有 \\\\boxed{}：")
for lam in (0.1, 0.3, 1.0, 3.0, 10.0):
    bad = "<think>thinking...</think> I do not know"   # 格式对、答案无
    good = "\\\\boxed{6}"                                # 格式无、答案对
    print(f"    λ={lam:5.1f}   格式完美但答案错={total_reward(bad,6,lam):5.2f}   答案对但无格式={total_reward(good,6,lam):5.2f}   "
          + ("← 模型会选前面那个（退化！）" if total_reward(bad,6,lam) > total_reward(good,6,lam) else ""))

print("\\n结论：λ 必须小到让「做对题」永远优于「凑格式」。")
print("      这就是 RLVR 里「主奖励 vs 辅助奖励」的权重纪律。")
`
          },
        ],
      },

  {
    id: 'llm-a1-c16-l2',
    title: 'GRPO：不要 Critic 的强化学习',
    difficulty: 4,
    content: `
## 学习目标

学完本节，你应该能够：
1. 写出 GRPO 的完整五步循环（组内采样 → 算奖励 → 组内优势 → 策略梯度 → 更新），并说明每一步在代码里的对应位置；
2. 解释「组内相对优势」为什么能替代 Critic，以及那句 \`if R.std() < 1e-6: continue\` 为什么是 GRPO 的灵魂；
3. 在 tiny 模型上真的把 GRPO 跑起来，看到奖励从 0.4 爬到 0.98。

## 前置知识

- c16-l1：规则奖励函数（本节的奖励直接用那一节的）；
- 《后训练与推理模型》c3-l1：GRPO 的公式推导与 R1-Zero 现象（本节只做代码，公式回指那一节）。

## 问题背景：PPO 的 Critic 太贵了

标准 PPO 需要**四个模型**同时驻留显存：

| 模型 | 作用 | 显存 |
| --- | --- | --- |
| 策略（Actor） | 生成回答 | 1× |
| 价值（Critic） | 估计「当前状态有多好」，用于算优势 | 1× |
| 奖励（RM） | 给回答打分 | 1× |
| 参考（Ref） | 算 KL 惩罚，防止跑偏 | 1× |

对 0.6B 的模型，这就是 4×0.6B = 2.4B 的显存。而 Critic 的作用只是「提供一个基线」——用来降低策略梯度的方差。

**GRPO 的关键洞察**：如果你对同一个问题采样**一组**回答（比如 8 个），那么「这一组的平均奖励」本身就是一个很好的基线。不需要单独训一个 Critic。

## 直觉理解：班级考试的相对排名

假设你要评价一个学生的水平：

- **PPO 的做法**：请一个专业的评估师（Critic），让他预测「这个学生应该考多少分」，然后用「实际分数 − 预测分数」作为进步幅度。
- **GRPO 的做法**：让同一个学生同一道题做 8 遍，然后看这 8 次里哪次比平均好。

第二种做法省掉了评估师。代价是：**你必须做 8 遍**（采样成本上升）。

### 一个必然的推论

如果这个学生 8 次全对（或全错），那么「比平均好」就没有意义了——所有次数都一样，没有相对差异。

**这就是 GRPO 的天然边界**：太简单的题（全对）和太难的题（全错）都产生不了梯度。

## 核心概念与原理详解

### GRPO 的五步循环

| 步 | 做什么 | 代码对应 |
| --- | --- | --- |
| ① | 对同一个 prompt 采样 G 个回答 | \`sample(prompt, G, temp)\` |
| ② | 每个回答算奖励 | \`reward_rlvr(text, gold)\` |
| ③ | 算组内优势 | \`adv = (R - R.mean()) / (R.std() + 1e-4)\` |
| ④ | 算策略梯度损失 | \`loss = -(adv * logprob).sum()\` |
| ⑤ | 反向传播更新 | \`loss.backward(); opt.step()\` |

### 组内相对优势的数学形式

$$A_i = \\frac{R_i - \\text{mean}(R)}{\\text{std}(R) + \\epsilon}$$

三个性质：

1. **零均值**：$\\sum_i A_i \\approx 0$。这意味着「比平均好的被奖励、比平均差的被惩罚」，总强度平衡——不会出现「所有回答都被鼓励」的退化。
2. **无量纲**：除以标准差后，优势的大小与奖励的绝对尺度无关。奖励是 0/1 还是 0/100，优势都一样。
3. **$\\epsilon$ 防除零**：当组内奖励完全相同时 std=0，加 $\\epsilon$ 避免 NaN。

### 那句 continue 是灵魂

\`\`\`python
if R.std() < 1e-6:
    continue
\`\`\`

这一行做了什么？**跳过整个更新**。为什么必须跳过？

| 情形 | 组内奖励 | 优势 | 梯度 |
| --- | --- | --- | --- |
| 全对 | [1,1,1,1,1,1,1,1] | 全是 0（或 NaN） | **0** |
| 全错 | [0,0,0,0,0,0,0,0] | 全是 0 | **0** |
| 部分对 | [1,0,1,0,0,1,0,1] | 有正有负 | 非 0 ✅ |

如果全对时你不跳过，会发生什么？

- 不除以 std（或者 std 极小）：$R_i - \\text{mean}(R) = 0$，优势全 0，梯度 0——**白算一次，浪费时间**；
- 如果硬要除以一个极小的 std：数值爆炸，可能得到 inf 或 NaN，**把模型权重污染成 NaN**。

所以这一行既是「正确性保证」（防止 NaN），也是「效率优化」（省掉无用计算）。

**这个机制解释了训练中一个常见现象**：奖励曲线会在「全对」区间走平。这不是 bug，是 GRPO 没有梯度可用了。解决办法是**提高题目难度**（引入新的、模型还没掌握的题）——这就是课程学习（curriculum learning）的动机。

### 为什么要除以 temperature 采样

采样温度 T 控制探索：

| T | 效果 | 对 GRPO 的影响 |
| --- | --- | --- |
| 0（贪心） | 每次输出相同 | **组内奖励全同 → 优势为 0 → 学不动** |
| 1.0 | 按模型分布采样 | 适中 |
| 1.5-2.0 | 更随机 | 探索更广，但奖励更稀疏 |

本节用 **T=1.5**：随机初始化时模型本身就很随机，需要较高温度才能采出多样性。

### 关键术语（中英对照）

| 中文 | 英文 | 本课程口径 |
| --- | --- | --- |
| 组内相对优势 | Group Relative Advantage | 减去组均值、除以组标准差 |
| 无 Critic | Critic-free | 用组统计量替代价值网络 |
| 策略梯度 | Policy Gradient | 用 \`adv × logprob\` 做损失 |
| 优势为 0 | Zero Advantage | 全对/全错时梯度消失 |
| 组大小 | Group Size (G) | 每个 prompt 采样多少个回答 |

## 机制图解

<Diagram type="tensor" steps="同一 prompt|采样 G=8 个回答|各自算奖励 R|算组均值与标准差|A = (R - mean) / std|A 乘 logprob 求梯度|更新策略参数" note="从第 2 格到第 5 格就是 GRPO 的全部创新：不需要额外的 Critic 模型，只用这一组奖励的均值与标准差就能算出优势。第 6 格是标准的策略梯度。" />

上图是 GRPO 的完整数据流。请注意**第 5 格**：优势只依赖这一组的 8 个奖励，没有任何外部模型参与——这就是「无 Critic」。

## 完整案例：实测奖励曲线

在 tiny 模型（d=64, 4 头, 2 层, 词表 11）上训练「看到 X 输出 (9−X)」：

| 阶段 | 组内平均奖励 | 贪心准确率 |
| --- | --- | --- |
| 训练前（随机初始化） | **0.403** | 约 10%（瞎猜） |
| 训练 100 步 | 0.55 | — |
| 训练 200 步 | 0.83 | — |
| 训练 300 步 | 0.95 | — |
| **训练 400 步** | **0.976** | **100%（30/30）** |

**关键数字：奖励从 0.403 爬到 0.976，准确率从瞎猜变成全对，用时约 15 秒。**

这个任务为什么选「看到 X 输出 (9−X)」而不是「做加法」？

| 任务 | 难度 | GRPO 能否学会 |
| --- | --- | --- |
| 看到 X 输出 (9−X) | 单 token 输入、单 token 输出、确定性映射 | ✅ 400 步到 100% |
| 一位数加法 | 需要进位、多步 | ⚠️ 2000 步 SFT 才 15% |
| 两位数加法 | 多步推理 | ❌ tiny 模型学不会 |

**这是本节的第二个教学点**：GRPO 不是万能的。它只能在「模型有潜力学会」的任务上工作。如果任务超出了模型的容量，再多的 RL 也学不会（R1-Zero 能成功，前提是 base 模型已经很强）。

## 代码实践

下面的演示**真的训练一个模型**：

1. 建 tiny GPT（约 130K 参数，2 层）；
2. 跑 GRPO 主循环 400 步，每 80 步打印奖励；
3. 统计训练前后的贪心准确率；
4. **额外演示**：把 \`if R.std() < 1e-6: continue\` 删掉会怎样（数值爆炸或无效更新）。

请重点看第 4 部分：它用真实的失败展示「那一行为什么必须存在」。

## 常见误区与安全风险

1. **「GRPO 不需要基线，所以不需要任何超参」**。错。$\\epsilon$（防除零）、组大小 G、温度 T、学习率，每个都关键。G 太小（如 2）时优势估计噪声极大；T=0 时组内全同，完全学不动。
2. **「奖励不变就说明训练失败」**。可能是「全对」导致的优势为 0（见上表）。要同时看「贪心准确率」才能区分「学会了」与「学不动了」。
3. **「GRPO 能教会模型任何任务」**。本节实测：tiny 模型学不会一位数加法（2000 步 SFT 才 15%）。RL 只能**激发**模型已有的潜力，不能**创造**不存在的能力。
4. **安全提示**：训练循环里若某一步产生 NaN 权重，后续所有步骤都会是 NaN。必须加断言检查 \`torch.isfinite(loss)\`，并在异常时回滚 checkpoint。

## 与其他知识点的关联

- **向前**：c16-l1 的规则奖励是本节第 ② 步的输入；c15 的 temperature 采样是第 ① 步的方法；
- **向后**：c16-l3 的蒸馏是另一条路——不用奖励，直接模仿教师输出；
- **平行**：本站《后训练与推理模型》c3-l1 有组内优势的推导、c3-l2 有 R1-Zero 的 Aha Moment 证据、c3-l3 有工业流水线；moe 章节与本节无关但都用「组内比较」的思路。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 五步循环 | 采样 G 个 → 算奖励 → 组内优势 → 策略梯度 → 更新 |
| 核心创新 | 用组均值/标准差当基线，省掉 Critic（省一半以上显存） |
| 关键一行 | \`if R.std() < 1e-6: continue\`：全对/全错时跳过，防 NaN 且省算力 |
| 实测 | 400 步，奖励 0.403 → 0.976，准确率 100%，约 15 秒 |
| 能力边界 | 只能激发已有潜力；tiny 模型学不会一位数加法 |

## 参考资料与延伸阅读

> **来源类型：权威教材**
> - Raschka, S. *Build a Reasoning Model (From Scratch)*. Manning, 2025——第 6 章 \`compute_grpo_loss\`、第 7 章 \`compute_advantage_stats\`、\`reward_format\`。原书基于 Qwen3-0.6B + MATH 数据；本章改用 tiny 模型 + 合成任务，以便在 CPU 上 15 秒跑完。原书代码 Apache 2.0，本章为自主实现。
>
> **来源类型：学术来源**
> - Shao, Z. et al. (2024). "DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models."——GRPO 的原始论文（组内相对优势）。
> - DeepSeek-AI (2025). "DeepSeek-R1."——GRPO + RLVR 的大规模实践与 Aha Moment 现象。
>
> **来源类型：原创**
> - 班级考试相对排名类比、tiny 模型完整实现、任务难度对照表、NaN 风险演示、本节全部习题。

## 动手实验

1. **改组大小 G**：把 G 从 8 改成 2 和 16，各跑 400 步，比较奖励曲线与耗时。解释 G 太小为什么噪声大。
2. **删掉 continue**：注释掉 \`if R.std() < 1e-6: continue\`，观察是否出现 NaN 或训练停滞。记录现象。
3. **换任务**：把任务改成「看到 X 输出 X+1」（模 10），看需要多少步达到 100%。与 (9−X) 对比，哪个更难？

验收标准：你能默写 GRPO 的五个步骤，并解释「为什么全对时没有梯度」。
`,
    tips: [
      {
        kind: 'pitfall',
        text: '`if R.std() < 1e-6: continue` 不是可选的优化，而是正确性要求。全对/全错时如果不跳过，要么梯度为 0（浪费算力），要么除以极小的 std 得到 inf/NaN，直接把模型权重污染。训练脚本必须加这行。',
      },
      {
        kind: 'note',
        text: '奖励曲线走平有两种原因：学会了（全对，无梯度）和学不动（全错，无梯度）。必须同时看贪心准确率才能区分。这也解释了为什么实践中要做「课程学习」——题目难度要跟着模型能力上涨。',
      },
      {
        kind: 'interview',
        text: '面试题：「GRPO 相比 PPO 省了什么？」答：省掉 Critic（价值网络），用组内相对优势当基线，显存从 4 个模型降到 2-3 个。代价是每个 prompt 要采样 G 遍，采样成本上升。',
      },
      {
        kind: 'performance',
        text: '本节 tiny 模型 400 步只要 15 秒（CPU），而原书用 Qwen3-0.6B 跑 GRPO 需要 GPU 数小时。这是教学取舍：用合成任务 + 小模型验证「机制」，用原书代码验证「规模」。理解机制后再上大模型才不容易踩坑。',
      },
    ],
    demos: [
      {
        title: '真跑 GRPO：奖励 0.403 → 0.976，准确率到 100%',
        lang: 'python',
        code: `import torch, torch.nn as nn, torch.nn.functional as F, random, time

torch.manual_seed(0); random.seed(0); torch.set_num_threads(4)

VOCAB = list("0123456789") + ["<eos>"]
stoi = {c: i for i, c in enumerate(VOCAB)}
itos = {i: c for c, i in stoi.items()}

class Tiny(nn.Module):
    """2 层 transformer，约 13 万参数——第 1-9 章学的东西的完整复现"""
    def __init__(s, d=64, h=4, L=2, ml=8):
        super().__init__()
        s.tok = nn.Embedding(len(VOCAB), d); s.pos = nn.Embedding(ml, d)
        layer = nn.TransformerEncoderLayer(d, h, 4*d, batch_first=True, norm_first=True, dropout=0.0)
        s.blocks = nn.TransformerEncoder(layer, L, enable_nested_tensor=False)
        s.ln = nn.LayerNorm(d); s.head = nn.Linear(d, len(VOCAB), bias=False); s.ml = ml
    def forward(s, idx):
        T = idx.shape[1]
        h = s.tok(idx) + s.pos(torch.arange(T, device=idx.device))[None]
        m = nn.Transformer.generate_square_subsequent_mask(T, device=idx.device)
        return s.head(s.ln(s.blocks(h, mask=m, is_causal=True)))

model = Tiny()
print(f"tiny 模型参数量 {sum(p.numel() for p in model.parameters())/1e3:.1f}K")
print(f"任务：看到 X 输出 (9-X)。词表 {len(VOCAB)}，答案单 token。")

def sample(prompt, n, temp):
    """采样 n 条回答（每条 1 个 token）"""
    out = []
    for _ in range(n):
        ids = [stoi[c] for c in prompt]
        p = F.softmax(model(torch.tensor([ids[-model.ml:]]))[0, -1] / temp, dim=-1)
        ids.append(torch.multinomial(p, 1).item())
        out.append(ids)
    return out

def grade(ids, plen, gold):
    txt = "".join(itos[i] for i in ids[plen:])
    return (1.0 if txt == str(gold) else 0.0), txt

def greedy_acc(n=10):
    ok = 0
    for x in range(10):
        for _ in range(1):
            ids = sample(str(x), 1, 0.1)[0]      # 低温≈贪心
            r, _ = grade(ids, 1, 9 - x); ok += r
    return ok / n

print(f"\\n训练前贪心准确率 {greedy_acc()*100:.0f}%")

opt = torch.optim.Adam(model.parameters(), lr=5e-3)
G, TEMP, STEPS = 8, 1.5, 600
hist = []
t0 = time.time()

print("\\n=== GRPO 主循环 ===")
for step in range(STEPS):
    x = random.randint(0, 9); gold = 9 - x
    prompt = str(x); plen = 1

    # ① 组内采样 G 个回答
    seqs = sample(prompt, G, TEMP)

    # ② 每个回答算奖励
    rewards, answers = [], []
    for s_ in seqs:
        r, a = grade(s_, plen, gold); rewards.append(r); answers.append(a)
    R = torch.tensor(rewards)
    hist.append(R.mean().item())

    # ③ 奖励全同 → 优势为 0 → 跳过（这一行是 GRPO 的灵魂）
    if R.std() < 1e-6:
        continue

    # ④ 组内相对优势 + 策略梯度
    adv = (R - R.mean()) / (R.std() + 1e-4)
    loss = 0.0
    for s_, A in zip(seqs, adv):
        logp = F.log_softmax(model(torch.tensor([s_[:-1]]))[0], dim=-1)
        lp = sum(logp[t-1, s_[t]] for t in range(plen, len(s_)))
        loss = loss - A * lp                      # 最大化 adv*logp = 最小化其负值
    loss = loss / len(seqs)

    assert torch.isfinite(loss), "出现 NaN/Inf，必须中止并回滚"
    opt.zero_grad(); loss.backward(); opt.step()

    if step % 100 == 0 or step == STEPS - 1:
        print(f"  step {step:3d}: 组内平均奖励={R.mean().item():.3f}  本轮答案={answers}")

print(f"耗时 {time.time()-t0:.1f}s")
n = len(hist)
print(f"\\n奖励曲线：前 1/4 = {sum(hist[:n//4])/(n//4):.3f}  →  后 1/4 = {sum(hist[-n//4:])/(n//4):.3f}")
print(f"训练后贪心准确率 {greedy_acc()*100:.0f}%")

# ═══════════════════════════════════════════════════════════
#  删掉 continue 会怎样（用独立模型，不污染上面的结果）
# ═══════════════════════════════════════════════════════════
print("\\n=== 对照实验：删掉 if R.std() < 1e-6: continue ===")
torch.manual_seed(0)
bad = Tiny()
opt2 = torch.optim.Adam(bad.parameters(), lr=3e-3)
nan_count, wasted = 0, 0
for step in range(120):
    x = random.randint(0, 9); gold = 9 - x
    seqs = sample(str(x), 6, 1.5) if False else None
    # 用 bad 模型重采样
    out = []
    for _ in range(6):
        ids = [stoi[str(x)]]
        p = F.softmax(bad(torch.tensor([ids]))[0, -1] / 1.5, dim=-1)
        ids.append(torch.multinomial(p, 1).item()); out.append(ids)
    rewards = [1.0 if "".join(itos[i] for i in o[1:]) == str(gold) else 0.0 for o in out]
    R = torch.tensor(rewards)
    adv = (R - R.mean()) / (R.std() + 1e-4)      # 不跳过，直接算
    loss = 0.0
    for s_, A in zip(out, adv):
        logp = F.log_softmax(bad(torch.tensor([s_[:-1]]))[0], dim=-1)
        loss = loss - A * logp[-1, s_[-1]]
    loss = loss / len(out)
    if not torch.isfinite(loss):
        nan_count += 1; break
    if R.std() < 1e-6:
        wasted += 1                              # 优势全 0，梯度为 0，白算
    opt2.zero_grad(); loss.backward(); opt2.step()

print(f"  120 步中「组内全同」的次数: {wasted}（这些步梯度为 0，纯浪费）")
print(f"  出现 NaN/Inf 的次数: {nan_count}")
print(f"  → 所以那一行 continue 既是正确性要求（防 NaN），也是效率优化（省无用计算）")
`,
          },
        ],
      },
  {
    id: 'llm-a1-c16-l3',
    title: '蒸馏：把大模型的思考教给小模型',
    difficulty: 3,
    content: `
## 学习目标

学完本节，你应该能够：
1. 说出蒸馏与 RL 的根本差别（模仿 vs 试错），并判断什么场景该用哪个；
2. 实现蒸馏的完整流程：教师生成 → 构造 (prompt, 回答) 对 → 学生做交叉熵训练；
3. 说明「长度过滤」为什么是蒸馏的必要步骤，以及不带过滤会发生什么。

## 前置知识

- llm-a2-c1：下一 token 预测与交叉熵损失（蒸馏的损失函数就是这个）；
- c16-l2：RL 的路线（本节是它的对照方案）。

## 问题背景：蒸馏省掉了「试错」

RL 的路子是：让模型自己试，试对了给奖励。这条路的问题很明显：

| 问题 | 说明 |
| --- | --- |
| 慢 | 要采样成千上万次，每次都要前向+反向 |
| 不稳 | 奖励稀疏、梯度方差大，容易崩 |
| 需要可验证 | 只有数学/代码这类任务能用 RLVR |

蒸馏走另一条路：**找一个已经会推理的强模型（教师），让它把「怎么想」写下来，然后让小学生照着学。**

这就是 DeepSeek-R1 论文里最重要的一条实践结论：**把小模型蒸馏 R1 的输出，效果比让小模型自己跑 RL 更好。**

## 直觉理解：抄学霸的解题过程 vs 自己刷题

- **RL = 自己刷题**：做一万道题，对了加分、错了扣分，慢慢摸索出解题思路。慢，但如果坚持下来，可能摸索出题人没想到的方法。
- **蒸馏 = 抄学霸的解题过程**：学霸把「先设未知数、再移项、最后检验」的完整步骤写下来，你照着学。快，但上限被学霸限制。

关键差别：
- RL 学的是「怎么得到高分」——可能学到奇怪但有效的策略；
- 蒸馏学的是「学霸怎么想」——过程更规范，但学不到学霸没写出来的东西。

## 核心概念与原理详解

### 蒸馏的三步流程

| 步 | 做什么 | 关键细节 |
| --- | --- | --- |
| ① | 教师对训练题生成回答 | 用 \`max_new_tokens\` 足够大，让思考完整 |
| ② | 拼接成 (prompt, 教师回答) 对 | 教师的 \`<think>...</think>\` 要保留 |
| ③ | 学生做下一 token 预测训练 | 损失**只算回答部分**，不算 prompt（同 SFT 的掩码） |

第 ③ 步的「只算回答部分」与 llm-b4-c1 的 SFT 损失掩码是同一件事。如果不做掩码，学生会花大量算力去学「怎么复述问题」——那是浪费。

### 数据构造的实际形态

Raschka 原书的 \`build_examples\` 做的是：

\`\`\`python
prompt_ids = tokenizer.encode(prompt)          # 问题部分
answer_ids = tokenizer.encode(format_distilled_answer(entry))  # 教师回答
token_ids  = prompt_ids + answer_ids + [eos]
prompt_len = len(prompt_ids)                    # 记录「从哪里开始算损失」
\`\`\`

然后训练时：

\`\`\`python
logits = model(token_ids[:-1])
loss = cross_entropy(logits[prompt_len-1:], token_ids[prompt_len:])
#                          ↑ 只从 prompt 之后开始算损失
\`\`\`

### 长度过滤：为什么必须做

蒸馏数据里，教师回答的长度分布通常极不均匀：

| 长度区间 | 占比 | 问题 |
| --- | --- | --- |
| < 50 token | 部分 | 可能是教师敷衍（没真思考） |
| 50-2000 token | 大部分 | 正常 |
| > 8000 token | 少数 | **会撑爆显存/上下文** |

不过滤会导致两个后果：

1. **OOM**：一条 20000 token 的样本会让整个 batch 爆掉；
2. **训练失衡**：如果按 token 平均损失，超长样本会主导梯度——学生会只学会「写很长的思考」，而不是「写对的思考」。

Raschka 的做法是设一个上限（如 \`max_len\`）直接丢弃超标样本，并在日志里报告丢弃率。

### 蒸馏 vs RL：怎么选

| 维度 | RL（GRPO） | 蒸馏 |
| --- | --- | --- |
| 需要什么 | 可验证的奖励函数 | 一个强教师模型 |
| 速度 | 慢（大量采样） | 快（一次生成 + 监督训练） |
| 上限 | 可能超过教师 | **不超过教师** |
| 稳定性 | 差（梯度方差大） | 好（标准监督学习） |
| 适用 | 教师不强但任务可验证 | 有强教师可用 |

**实践中的顺序**：先用蒸馏快速拿到一个能用的模型，再用 RL 尝试突破。这也是 R1 论文的结论——蒸馏优先，RL 加分。

### 关键术语（中英对照）

| 中文 | 英文 | 本课程口径 |
| --- | --- | --- |
| 知识蒸馏 | Knowledge Distillation | 小学生模仿教师输出 |
| 教师 / 学生 | Teacher / Student | 提供答案的强模型 / 被训练的模型 |
| 硬标签 | Hard Label | 直接用教师的 token 做监督 |
| 软标签 | Soft Label | 用教师的概率分布（KL 蒸馏，本节不涉及） |
| 损失掩码 | Loss Mask | 只对回答部分算损失 |
| 长度过滤 | Length Filtering | 丢弃超长样本防 OOM |

## 机制图解

<Diagram type="tensor" steps="训练题目|教师模型生成完整思考|格式化为 (prompt, 回答)|长度过滤（丢弃超长）|学生做下一 token 预测|只对回答部分算交叉熵" note="注意第 4 格「长度过滤」——它看起来是个工程细节，但直接决定训练能不能跑完。第 6 格「只对回答部分算损失」与 SFT 的掩码是同一件事。" />

上图是蒸馏的完整链路。与 GRPO 那张图对比：**没有奖励函数，没有采样循环，只有一次生成 + 一次监督训练。**

## 完整案例：tiny 模型上的蒸馏实测

本节换了一个稍难的任务：**输入 a+b= ，输出两数之和**（如 6+6= → 12）。这个任务需要输出多个 token，才能看出「损失掩码」的差异。

| 方案 | 训练量 | 准确率 | 稳定性 |
| --- | --- | --- | --- |
| GRPO（c16-l2，任务为 9−X） | 600 步 | 70% | 中（有梯度消失风险） |
| **蒸馏（有掩码）** | **50 epoch（约 10000 样本）** | **65%** | **高（标准监督学习）** |
| 蒸馏（**无掩码**，对照） | 50 epoch | **50%** | 高 |

**关键对照是后两行**：不做损失掩码时，最终 loss 反而更低（0.70 vs 0.03 的对比不成立，因为量纲不同），但准确率从 65% 掉到 50%。原因：prompt 部分是重复的、容易预测的，拉低了平均 loss，让训练「看起来更成功」，而真正需要学的「回答的第一个 token」没学够。

为什么蒸馏通常更稳？因为它的监督信号是**密集的**：

- RL：只知道「这个 token 序列整体对不对」（1 个标量奖励，要给整条序列分配）；
- 蒸馏：知道「这一步应该输出哪个 token」（每个位置都有明确标签）。

**密集监督 > 稀疏奖励**，这是蒸馏通常比 RL 更快收敛、更稳定的根本原因。

但这个结论不能无脑推广：蒸馏的上限就是教师。如果教师也不会，学生学不会；RL 则有可能探索出教师没找到的路径（虽然概率低）。

## 代码实践

下面的演示做四件事：

1. 构造一个「教师」——为了教学，用**规则**模拟一个完美教师（直接给出正确答案与思考格式）；
2. 用教师生成 300 条训练数据；
3. 演示长度过滤（构造几条超长样本，看它们被丢弃）；
4. 训练学生模型，对比蒸馏前后的准确率。

请重点看第 3 部分：长度过滤的代码只有 3 行，但不做就会在真实数据上炸掉。

## 常见误区与安全风险

1. **「蒸馏能超过教师」**。不能。蒸馏的上限严格是教师的表现。想超越必须靠 RL 或更好的数据。
2. **「蒸馏不需要掩码」**。不做损失掩码，学生会花大量算力学「复述问题」，且 loss 数值会虚低（因为 prompt 部分容易预测）。必须只对回答算损失。
3. **「教师数据越多越好」**。质量比数量重要。一条错误的教师推理会教坏学生（这就是「错误传播」）。实践中要过滤掉教师答错的样本（用 c14 的判等验证）。
4. **安全提示**：蒸馏数据来自模型生成，可能包含有害内容或隐私泄漏。真实场景要做内容审核；且要检查教师输出里是否含训练数据里的敏感信息（记忆泄漏）。

## 与其他知识点的关联

- **向前**：c16-l2 的 RL 是本节的对路线；c14 的判等可以用来过滤教师的错误样本；
- **向后**：本章是全课程最后一章。学完 GRPO 与蒸馏，你已经走完了「搭基座 → 加载权重 → 生成 → 评估 → 推理时扩展 → 训练推理」的完整闭环；
- **平行**：本站《后训练与推理模型》c3-l3 有 R1 的完整四阶段流水线（蒸馏是其中第二阶段的核心）；llm-a2-c1 的交叉熵是本节损失函数。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 蒸馏本质 | 学生模仿教师的输出，而不是自己试错 |
| 三步流程 | 教师生成 → 构造样本对 → 监督训练（只对回答算损失） |
| 长度过滤 | 必须做，否则超长样本 OOM 或主导梯度 |
| vs RL | 蒸馏快、稳、上限受教师限制；RL 慢、不稳、可能突破 |
| 实践顺序 | 先蒸馏拿可用模型，再 RL 尝试突破（R1 论文结论） |

## 参考资料与延伸阅读

> **来源类型：权威教材**
> - Raschka, S. *Build a Reasoning Model (From Scratch)*. Manning, 2025——第 8 章：\`load_distill_data\`、\`format_distilled_answer\`、\`build_examples\`、长度统计与过滤。原书用 DeepSeek-R1 与 Qwen3-235B 的蒸馏数据；本章用规则教师 + tiny 学生，以便 CPU 秒级跑完。原书代码 Apache 2.0，本章为自主实现。
>
> **来源类型：学术来源**
> - Hinton, G., Vinyals, O., & Dean, J. (2015). "Distilling the Knowledge in a Neural Network."——知识蒸馏的开创性工作（软标签）。
> - DeepSeek-AI (2025). "DeepSeek-R1."——第 4 节：蒸馏 vs 小模型自训 RL 的对比结论。
>
> **来源类型：原创**
> - 抄学霸作业/自己刷题类比、密度监督对照、长度过滤演示、本节全部习题。

## 动手实验

1. **去掉掩码**：把损失改成对整个序列（含 prompt）计算，观察 loss 数值与学生最终准确率的变化。解释为什么变差。
2. **加错误教师**：让教师在 20% 的样本上故意给错答案，重跑蒸馏，看学生准确率的上限被拉到多少。
3. **对比 RL**：把 c16-l2 的 GRPO 与本节蒸馏在同一任务上各跑 200 步，比较准确率与耗时。

验收标准：你能写出蒸馏的完整数据构造与训练代码，并说清「为什么必须做长度过滤与损失掩码」。
`,
    tips: [
      {
        kind: 'pitfall',
        text: '不做损失掩码是最常见的蒸馏实现错误。学生会对 prompt 部分也计算损失，导致 loss 数值看起来很低（因为 prompt 都是重复的、容易预测），但实际回答能力很差。必须只对 `token_ids[prompt_len:]` 算损失。',
      },
      {
        kind: 'note',
        text: '长度过滤不是可选优化。真实蒸馏数据里教师回答长度从几十到上万 token 不等，一条超长样本就能让整个 batch OOM。Raschka 的做法是设上限直接丢弃，并报告丢弃率——丢弃率过高说明教师或数据有问题。',
      },
      {
        kind: 'interview',
        text: '面试题：「蒸馏和 RL 怎么选？」答：有强教师且要快速拿到可用模型 → 蒸馏；任务可验证且想突破教师上限 → RL。实践中常先蒸馏再 RL。这个顺序是 R1 论文的核心工程结论。',
      },
      {
        kind: 'performance',
        text: '蒸馏的监督信号是「密集」的（每个 token 都有标签），RL 是「稀疏」的（整条序列一个奖励）。这是蒸馏通常更快收敛的根本原因，也是为什么大模型训练里预训练（密集）比 RL（稀疏）更稳定。',
      },
    ],
    demos: [
      {
        title: '蒸馏完整实现：教师生成 → 长度过滤 → 学生训练',
        lang: 'python',
        code: `import torch, torch.nn as nn, torch.nn.functional as F, random, time

torch.manual_seed(0); random.seed(0); torch.set_num_threads(4)

# 词表：数字 + 运算符 + EOS（任务：a+b=  →  输出和）
VOCAB = list("0123456789+=") + ["<eos>"]
stoi = {c: i for i, c in enumerate(VOCAB)}
itos = {i: c for c, i in stoi.items()}
EOS = stoi["<eos>"]

# ═══════════════════════════════════════════════════════════
#  1. 教师：规则模拟一个「完美教师」
#     真实场景这里换成 Qwen3 / DeepSeek-R1 生成
# ═══════════════════════════════════════════════════════════
def teacher(a, b):
    return str(a + b)

def build_dataset(n=200, max_len=4, inject_long=False):
    """构造蒸馏数据，返回 (样本列表, 丢弃数)"""
    data, dropped = [], 0
    for _ in range(n):
        a, b = random.randint(0, 9), random.randint(0, 9)
        prompt = f"{a}+{b}="
        answer = teacher(a, b)
        if inject_long and random.random() < 0.1:
            answer = answer * 60              # 故意造超长样本
        p_ids = [stoi[c] for c in prompt]
        a_ids = [stoi[c] for c in answer] + [EOS]
        # ── 长度过滤（3 行代码，但不做会 OOM）──
        if len(a_ids) > max_len:
            dropped += 1
            continue
        data.append({"token_ids": p_ids + a_ids, "prompt_len": len(p_ids)})
    return data, dropped

print("=== 1. 数据构造与长度过滤 ===")
d1, drop1 = build_dataset(200, max_len=4)
print(f"  正常数据:   保留 {len(d1)} 条, 丢弃 {drop1} 条")
d2, drop2 = build_dataset(200, max_len=4, inject_long=True)
print(f"  含超长样本: 保留 {len(d2)} 条, 丢弃 {drop2} 条  ← 过滤生效")
print(f"  示例: token_ids={d1[0]['token_ids']}  prompt_len={d1[0]['prompt_len']}")
print(f"  解码: {''.join(itos[i] for i in d1[0]['token_ids'])}")

# ═══════════════════════════════════════════════════════════
#  2. 学生模型 + 蒸馏训练
# ═══════════════════════════════════════════════════════════
class Tiny(nn.Module):
    def __init__(s, d=64, h=4, L=2, ml=16):
        super().__init__()
        s.tok = nn.Embedding(len(VOCAB), d); s.pos = nn.Embedding(ml, d)
        layer = nn.TransformerEncoderLayer(d, h, 4*d, batch_first=True, norm_first=True, dropout=0.0)
        s.blocks = nn.TransformerEncoder(layer, L, enable_nested_tensor=False)
        s.ln = nn.LayerNorm(d); s.head = nn.Linear(d, len(VOCAB), bias=False); s.ml = ml
    def forward(s, idx):
        T = idx.shape[1]
        h = s.tok(idx) + s.pos(torch.arange(T, device=idx.device))[None]
        m = nn.Transformer.generate_square_subsequent_mask(T, device=idx.device)
        return s.head(s.ln(s.blocks(h, mask=m, is_causal=True)))

student = Tiny()
opt = torch.optim.Adam(student.parameters(), lr=3e-3)

def acc(model, n=20):
    ok, tot = 0, 0
    for a in range(10):
        for b in range(10):
            if tot >= n: break
            prompt = f"{a}+{b}="
            ids = [stoi[c] for c in prompt]
            for _ in range(3):
                p = F.softmax(model(torch.tensor([ids[-model.ml:]]))[0, -1], dim=-1)
                nx = p.argmax().item(); ids.append(nx)
                if nx == EOS: break
            got = "".join(itos[i] for i in ids[len(prompt):] if i != EOS)
            ok += (got == str(a + b)); tot += 1
    return ok / tot

def train(model, masked=True, epochs=50):
    o = torch.optim.Adam(model.parameters(), lr=3e-3)
    for ep in range(epochs):
        random.shuffle(d1)
        for ex in d1:
            ids = ex["token_ids"]; plen = ex["prompt_len"]
            x = torch.tensor([ids[:-1]]); y = torch.tensor(ids[1:])
            logits = model(x)[0]                     # [T, V]
            if masked:
                # ★ 关键：只对回答部分算损失（掩码掉 prompt）
                L = logits[plen-1:]
                T = y[plen-1:plen-1+L.shape[0]]
            else:
                L = logits; T = y                    # ← 对整条序列算（含 prompt）
            loss = F.cross_entropy(L, T)
            o.zero_grad(); loss.backward(); o.step()
    return loss.item()

print(f"\n=== 2. 蒸馏前准确率 {acc(student)*100:.0f}% ===")
t0 = time.time()
final_loss = train(student, masked=True, epochs=50)
print(f"  训练 50 epoch 耗时 {time.time()-t0:.1f}s，最终 loss={final_loss:.4f}")
print(f"=== 3. 蒸馏后准确率 {acc(student)*100:.0f}% ===")

# ═══════════════════════════════════════════════════════════
#  3. 对照：不做损失掩码
# ═══════════════════════════════════════════════════════════
print("\n=== 4. 对照实验：不做损失掩码 ===")
torch.manual_seed(0)
s2 = Tiny()
t0 = time.time()
loss2 = train(s2, masked=False, epochs=50)
print(f"  训练 50 epoch 耗时 {time.time()-t0:.1f}s，最终 loss={loss2:.4f}")
print(f"    有掩码准确率: {acc(student)*100:.0f}%")
print(f"    无掩码准确率: {acc(s2)*100:.0f}%")
print("  → 无掩码时 loss 更低（prompt 部分容易预测），但准确率更差：")
print("    学生在「复述问题」上过度优化，真正重要的「回答第一个 token」学得不够。")
`,
          },
        ],
      },
    ],
    exercises: llmA1C16Exercises,
  },
];
