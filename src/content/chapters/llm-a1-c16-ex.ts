import type { Exercise } from '../../types';

/* c16 习题：难度 3/4/3 → 10/13/10 = 33 题
 * 主题：RLVR 规则奖励 / GRPO 组内优势 / 蒸馏
 * 全部代码题走 torch（本地后端），不依赖 Qwen3。
 */

export const llmA1C16Exercises: Exercise[] = [
  /* ═══════════ l1：RLVR（10 题）═══════════ */
  {
    id: 'llm-a1-c16-l1-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'llm-a1-c16-l1', tags: ['K', 'RLVR'],
    question: 'RLVR 用什么给模型的回答打分？',
    options: [
      { value: 'a', text: '程序规则（答案判等、单元测试）' },
      { value: 'b', text: '人类标注员' },
      { value: 'c', text: '神经奖励模型' },
      { value: 'd', text: '模型的自我评估' },
    ],
    answer: 'a',
    explanation: 'RLVR = RL with Verifiable Rewards。用规则引擎判对错，杜绝 reward hacking：答案不对就是 0 分，文采再好也没用。b/c 是 RLHF 的路子，d 会让模型「自己给自己打分」而崩溃。',
  },
  {
    id: 'llm-a1-c16-l1-e2', type: 'judge', difficulty: 2,
    relatedLessonId: 'llm-a1-c16-l1', tags: ['U', 'RLVR'],
    question: '神经奖励模型（RM）比规则引擎更可靠，因为它能理解语义。',
    answer: false,
    explanation: '恰恰相反。RM 可被 reward hacking——模型能学会「写得像正确推理但答案错」来骗高分。规则引擎没有这个漏洞，代价是只能判「可验证」的任务（数学、代码）。',
  },
  {
    id: 'llm-a1-c16-l1-e3', type: 'fill', difficulty: 2,
    relatedLessonId: 'llm-a1-c16-l1', tags: ['K', '奖励'],
    question: '本节的总奖励 = ______奖励 + λ × ______奖励。其中 λ 必须足够______，否则模型会学会「格式完美但答案错误」。',
    blanks: [['正确性', 'accuracy', '准确率'], ['格式', 'format'], ['小', '小']],
    explanation: '正确性奖励是主奖励（0/1），格式奖励是辅助（0/1）。λ 过大时，模型会发现「凑格式」比「做对题」更容易拿分，于是退化。',
  },
  {
    id: 'llm-a1-c16-l1-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'llm-a1-c16-l1', tags: ['U', '适用性'],
    question: '下列哪些任务适合用 RLVR？',
    options: [
      { value: 'a', text: '数学题（有唯一正确答案）' },
      { value: 'b', text: '代码生成（有单元测试）' },
      { value: 'c', text: '写一首诗' },
      { value: 'd', text: '逻辑推理题（有唯一解）' },
    ],
    answer: ['a', 'b', 'd'],
    explanation: 'c 是开放创作，没有客观对错，只能用人类偏好或 RM。判断标准很简单：**能不能写出一个返回 0/1 的程序**。',
  },
  {
    id: 'llm-a1-c16-l1-e5', type: 'code', difficulty: 3,
    relatedLessonId: 'llm-a1-c16-l1', tags: ['D', '奖励函数'],
    lang: 'python',
    question: '实现两个奖励函数：\n1. `reward_rlvr(text, gold)`：抽取 `\\boxed{}` 里的答案（取最后一个），没有则退回「取最后一个数字」；与 `gold` 相等返回 1.0，否则 0.0。\n2. `reward_format(text)`：`<think>` 出现在 `</think>` 之前返回 1.0，否则 0.0。\n\n再实现 `total_reward(text, gold, lam=0.3)`。',
    starterCode: `
def reward_rlvr(text, gold):
    pass

def reward_format(text):
    pass

def total_reward(text, gold, lam=0.3):
    pass

print(reward_rlvr(r"\\boxed{6}", 6), reward_format("<think>a</think>"))`,
    expectedOutput: '1.0 1.0',
    tests: `
assert reward_rlvr(r"\\boxed{6}", 6) == 1.0, "标准格式应判对"
assert reward_rlvr(r"\\boxed{7}", 6) == 0.0, "答案错应判错"
assert reward_rlvr("so the answer is 6", 6) == 1.0, "无 boxed 应降级取数字"
assert reward_rlvr("I do not know", 6) == 0.0, "无数字应判错"
assert reward_rlvr(r"\\boxed{3} then \\boxed{6}", 6) == 1.0, "应取最后一个"

assert reward_format("<think>hmm</think>6") == 1.0
assert reward_format("6") == 0.0
assert reward_format("</think> after <think>") == 0.0, "顺序反了应判错"

assert abs(total_reward(r"\\boxed{6}", 6, 0.3) - (1.0 + 0.3*0)) < 1e-9
assert abs(total_reward("<think>a</think>\\\\boxed{6}", 6, 0.3) - (1.0 + 0.3*1.0)) < 1e-9`,
    answer: `
import re

BOX = re.compile(r"\\\\boxed\\{([^{}]*)\\}")
NUM = re.compile(r"-?\\d+(?:\\.\\d+)?")

def _extract(text):
    b = BOX.findall(text)
    if b:
        return b[-1].strip()
    n = NUM.findall(text)
    return n[-1] if n else None

def reward_rlvr(text, gold):
    got = _extract(text)
    return 1.0 if got is not None and got == str(gold) else 0.0

def reward_format(text):
    i = text.find("<think>"); j = text.find("</think>")
    return 1.0 if (i >= 0 and j > i) else 0.0

def total_reward(text, gold, lam=0.3):
    return reward_rlvr(text, gold) + lam * reward_format(text)`,
    explanation: '降级路径（没有 boxed 就取数字）是关键：训练早期模型不会写 \`\\boxed{}\`，只认这个格式会让奖励恒为 0，模型永远学不动。',
  },
  {
    id: 'llm-a1-c16-l1-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'llm-a1-c16-l1', tags: ['U', '工程'],
    question: '如果奖励函数只认 \`\\boxed{}\` 格式、没有降级路径，训练早期会发生什么？',
    options: [
      { value: 'a', text: '奖励恒为 0，梯度恒为 0，模型永远学不会' },
      { value: 'b', text: '模型会自动学会写 boxed' },
      { value: 'c', text: '训练变慢但最终会成功' },
      { value: 'd', text: '没有影响' },
    ],
    answer: 'a',
    explanation: '这是 RLVR 最常见的实现 bug。base 模型初期根本不会写 \`\\boxed{}\`，如果奖励只看这个格式，所有采样都是 0 分 → 组内无差异 → 优势为 0 → 无梯度 → 永远学不会。必须有降级路径。',
  },
  {
    id: 'llm-a1-c16-l1-e7', type: 'judge', difficulty: 3,
    relatedLessonId: 'llm-a1-c16-l1', tags: ['U', '安全'],
    question: '为了判等，可以直接把模型输出喂给 \`eval()\`。',
    answer: false,
    explanation: '极其危险。模型可以输出 \`\\boxed{__import__("os").system("rm -rf /")}\`，eval 会真的执行它。必须用 AST 白名单（c14-l3 已实测拦截 \`__import__\`）。',
  },
  {
    id: 'llm-a1-c16-l1-e8', type: 'open', difficulty: 4,
    relatedLessonId: 'llm-a1-c16-l1', tags: ['D', '设计'],
    question: '你要为一个「判断整数是否为质数」的任务设计 RLVR 奖励。请回答：\n① 写出奖励函数的完整设计（含正确性、格式、降级路径）；\n② 指出这个奖励可能被怎样 hack，以及怎么防；\n③ 如果模型学会了「全部输出『是』」，奖励会是多少？说明为什么会这样。',
    referenceAnswer: `
① 奖励函数设计：
\`\`\`python
def reward_rlvr(text, n, is_prime):
    """n: 输入整数; is_prime: 标准答案 (bool)"""
    got = extract_boxed_or_last_word(text)      # 降级路径
    if got is None:
        return 0.0
    got_bool = parse_yes_no(got)                # "是"/"yes"/"true" → True
    if got_bool is None:
        return 0.0
    return 1.0 if got_bool == is_prime else 0.0

def reward_format(text):
    # 要求写出判断理由（如「试除到 sqrt(n)」），而不是只给结论
    return 1.0 if ("sqrt" in text or "试除" in text) and "\\boxed{" in text else 0.0

def total(text, n, gold, lam=0.2):
    return reward_rlvr(text, n, gold) + lam * reward_format(text)
\`\`\`

② 可被 hack 的方式与防范：
- **猜多数类**：如果测试集里质数占 30%，模型全答「不是」能拿 70%。防范：**平衡测试集**（质数/合数各 50%），或在奖励里做类别加权。
- **凑格式**：写上「sqrt」和「\\boxed{}」但结论随机。防范：λ 要小（本节已量化），且格式奖励只在正确时给（乘法而非加法）。
- **钻判等漏洞**：输出「不知道，但可能是」这类模糊表述。防范：严格只接受「是/否」，解析失败即 0 分。
- **记忆训练集**：如果题目固定，模型可以背答案。防范：用随机生成的大数（训练时随机采样 n）。

③ 全答「是」的奖励：
- 若测试集里质数占 p，则奖励 = p（正确率）。
- 若测试集包含 1-100（25 个质数、75 个合数），全答「是」的准确率 = 25%。
- **这说明奖励函数本身没问题**（它正确反映了准确率），问题在**数据分布**：模型找到了「不思考也能拿 25%」的捷径。
- 这就是为什么 RLVR 任务必须**平衡数据集**，并监控「模型是否真的在推理」（看输出长度、看是否能解释）。

补充：真实场景还应对「证明过程」做校验（比如要求给出一个因子），否则模型永远学不会「怎么判断」，只学会「输出什么」。`,
    rubric: [
      { point: '① 奖励含正确性、格式、降级路径三要素', score: 3 },
      { point: '② 指出「猜多数类」这个 hack 并给出平衡数据集的防范', score: 3 },
      { point: '② 至少再指出 2 种 hack（凑格式/模糊表述/记忆）', score: 2 },
      { point: '③ 正确算出 p=25% 并指出根因是数据分布而非奖励函数', score: 2 },
    ],
    keywords: ['RLVR', '降级路径', '猜多数类', '数据平衡', 'reward hacking'],
    explanation: '这道题的核心是③：「全答是」拿 25% 说明奖励函数没错，错的是数据分布。区分「奖励设计问题」与「数据问题」是 RLVR 实践中最关键的判断力。',
  },
  {
    id: 'llm-a1-c16-l1-e9', type: 'fill', difficulty: 3,
    relatedLessonId: 'llm-a1-c16-l1', tags: ['K', '基线'],
    question: '在 tiny 模型（随机初始化）上实测，10 个数字任务的期望奖励约 ______（瞎猜），实测起点是 ______。这个数字是训练前的基线。',
    blanks: [['0.1', '0.10', '10%'], ['0.403', '0.4']],
    explanation: '期望 0.1 = 1/10（10 个候选答案，随机猜对概率 1/10）。实测 0.403 更高，是因为 tokenizer 的初始输出分布不均匀（某些数字 token 初始概率更高）。',
  },
  {
    id: 'llm-a1-c16-l1-e10', type: 'single', difficulty: 4,
    relatedLessonId: 'llm-a1-c16-l1', tags: ['U', '综合'],
    question: '为什么说「规则引擎没有 reward hacking 漏洞」，这句话的准确含义是？',
    options: [
      { value: 'a', text: '规则引擎判的是客观事实（答案对不对），不能靠「写得好看」拿分；但仍可能被「猜多数类」「记忆答案」等策略钻数据分布的空子' },
      { value: 'b', text: '规则引擎完全无法被 hack，任何情况下都安全' },
      { value: 'c', text: '规则引擎比 RM 更聪明' },
      { value: 'd', text: '规则引擎不需要设计' },
    ],
    answer: 'a',
    explanation: '「不可 hack」指的是「不能靠优化表面形式骗分」（RM 的漏洞）。但规则引擎仍可能被「数据分布」钻空子——全答多数类就能拿高分。所以奖励设计 + 数据平衡缺一不可。b 过于绝对，是本题要纠正的误解。',
  },

  /* ═══════════ l2：GRPO（13 题）═══════════ */
  {
    id: 'llm-a1-c16-l2-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'llm-a1-c16-l2', tags: ['K', 'GRPO'],
    question: 'GRPO 的组内相对优势公式是？',
    options: [
      { value: 'a', text: 'A_i = (R_i − mean(R)) / (std(R) + ε)' },
      { value: 'b', text: 'A_i = R_i − V(s)' },
      { value: 'c', text: 'A_i = R_i / sum(R)' },
      { value: 'd', text: 'A_i = R_i' },
    ],
    answer: 'a',
    explanation: 'b 是 PPO 的做法（要 Critic 估计 V(s)）。GRPO 的创新就是用一个组内的 mean/std 当基线，省掉 Critic。',
  },
  {
    id: 'llm-a1-c16-l2-e2', type: 'judge', difficulty: 2,
    relatedLessonId: 'llm-a1-c16-l2', tags: ['U', 'GRPO'],
    question: 'GRPO 不需要 Critic（价值网络），是因为它用一组采样的平均奖励作为基线。',
    answer: true,
    explanation: '这正是 GRPO 的核心创新。代价是每个 prompt 要采样 G 遍（通常 8），采样成本上升。省下的是显存与一个模型的训练开销。',
  },
  {
    id: 'llm-a1-c16-l2-e3', type: 'fill', difficulty: 2,
    relatedLessonId: 'llm-a1-c16-l2', tags: ['K', 'GRPO'],
    question: 'GRPO 的五个步骤：① 组内采样 G 个 → ② 算______ → ③ 算组内______ → ④ 算策略梯度 → ⑤ 更新参数。',
    blanks: [['奖励', 'reward'], ['优势', 'advantage']],
    explanation: '第 3 步是最关键的：优势 = (奖励 − 组均值) / 组标准差。它把「绝对奖励」变成「相对排名」，因此不需要 Critic。',
  },
  {
    id: 'llm-a1-c16-l2-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'llm-a1-c16-l2', tags: ['U', 'GRPO'],
    question: '关于 \`if R.std() < 1e-6: continue\` 这一行，下列说法正确的有？',
    options: [
      { value: 'a', text: '它防止除以极小的 std 产生 inf/NaN' },
      { value: 'b', text: '它省掉「优势全为 0、梯度为 0」的无用计算' },
      { value: 'c', text: '它对应「组内全对或全错时没有梯度」这一数学事实' },
      { value: 'd', text: '它是可选的性能优化，删掉也没关系' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 错。这不是可选优化：不跳过要么得到全 0 优势（浪费），要么除以极小 std 得到 inf/NaN（污染权重）。它是正确性要求 + 效率优化。',
  },
  {
    id: 'llm-a1-c16-l2-e5', type: 'code', difficulty: 3,
    relatedLessonId: 'llm-a1-c16-l2', tags: ['D', 'GRPO'],
    lang: 'python',
    question: '实现 \`group_advantage(rewards)\`：输入一组奖励（list 或 tensor），返回组内相对优势张量 \`(R - mean) / (std + 1e-4)\`。\n\n再实现 \`should_skip(rewards)\`：当组内标准差 < 1e-6 时返回 True（表示该跳过更新）。',
    starterCode: `
import torch

def group_advantage(rewards):
    pass

def should_skip(rewards):
    pass

R = torch.tensor([1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0])
print(group_advantage(R).round(2).tolist())`,
    expectedOutput: '优势均值≈0，正负各半',
    tests: `
import torch
R = torch.tensor([1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0])
adv = group_advantage(R)
assert isinstance(adv, torch.Tensor) and adv.shape == R.shape
assert abs(float(adv.mean())) < 1e-6, f"优势均值应≈0，实际 {adv.mean()}"
assert float(adv.max()) > 0 and float(adv.min()) < 0, "应有正有负"
# 全对 / 全错
assert should_skip(torch.tensor([1.0]*8)) is True
assert should_skip(torch.tensor([0.0]*8)) is True
assert should_skip(R) is False
# 两个不同值
adv2 = group_advantage(torch.tensor([1.0, 0.0]))
assert abs(float(adv2.sum())) < 1e-5, "两个值时优势应互为正负"
assert abs(float(adv2[0]) + float(adv2[1])) < 1e-5`,
    answer: `
import torch

def group_advantage(rewards):
    R = torch.as_tensor(rewards, dtype=torch.float32)
    return (R - R.mean()) / (R.std() + 1e-4)

def should_skip(rewards):
    R = torch.as_tensor(rewards, dtype=torch.float32)
    return bool(float(R.std()) < 1e-6)`,
    explanation: '两个要点：① 优势必须零均值（\`sum ≈ 0\`）——这保证「比平均好的被奖励、比平均差的被惩罚」，总强度平衡；② \`std + 1e-4\` 里的 ε 防除零，但真正的保护是 \`should_skip\` 直接跳过。',
  },
  {
    id: 'llm-a1-c16-l2-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'llm-a1-c16-l2', tags: ['U', 'GRPO'],
    question: 'GRPO 中采样温度 T=0（贪心）会导致什么问题？',
    options: [
      { value: 'a', text: '组内 G 个回答完全相同 → 奖励全同 → 优势为 0 → 学不动' },
      { value: 'b', text: '生成速度变慢' },
      { value: 'c', text: '模型输出乱码' },
      { value: 'd', text: '没有影响' },
    ],
    answer: 'a',
    explanation: 'T=0 时每次采样都选概率最高的 token，G 次结果完全一样，奖励全同，标准差为 0，优势为 0。所以 GRPO 必须用 T>0 才有探索。本节用 T=1.5。',
  },
  {
    id: 'llm-a1-c16-l2-e7', type: 'judge', difficulty: 3,
    relatedLessonId: 'llm-a1-c16-l2', tags: ['U', '实践'],
    question: '如果 GRPO 训练中奖励曲线长时间走平，一定是训练失败。',
    answer: false,
    explanation: '两种可能：① 学会了（全对，优势为 0，无梯度）；② 学不动（全错，同样无梯度）。必须同时看贪心准确率才能区分。这也是实践中要做「课程学习」的原因——题目难度要跟着能力上涨。',
  },
  {
    id: 'llm-a1-c16-l2-e8', type: 'fill', difficulty: 3,
    relatedLessonId: 'llm-a1-c16-l2', tags: ['K', '实测'],
    question: '本节 tiny 模型（约 13 万参数）跑 GRPO 400 步，组内平均奖励从 ______ 上升到 ______，贪心准确率达到 ______%，耗时约 15 秒。',
    blanks: [['0.403', '0.4'], ['0.976'], ['100']],
    explanation: '这是「机制验证」级别的规模。原书用 Qwen3-0.6B 在 GPU 上跑数小时；本节用 tiny 模型 + 合成任务在 CPU 上 15 秒跑完，目的是看清机制而不是追求效果。',
  },
  {
    id: 'llm-a1-c16-l2-e9', type: 'code', difficulty: 4,
    relatedLessonId: 'llm-a1-c16-l2', tags: ['D', 'GRPO'],
    lang: 'python',
    question: '实现一个完整的 GRPO 单步更新函数 \`grpo_step(model, opt, prompt, gold, G=8, temp=1.5)\`：\n- 采样 G 个回答（每个 1 个 token）；\n- 算奖励（答案等于 gold 得 1.0）；\n- 若组内 std < 1e-6 返回 \`(None, mean_reward)\` 表示跳过；\n- 否则算优势、算策略梯度、反向传播、返回 \`(loss_value, mean_reward)\`。',
    starterCode: `
import torch, torch.nn as nn, torch.nn.functional as F

def grpo_step(model, opt, prompt, gold, G=8, temp=1.5):
    pass

print("见 tests")`,
    expectedOutput: '返回 (loss, 平均奖励)',
    tests: `
import torch, torch.nn as nn, torch.nn.functional as F
torch.manual_seed(0)

VOCAB = list("0123456789")
stoi = {c: i for i, c in enumerate(VOCAB)}
itos = {i: c for c, i in stoi.items()}

class M(nn.Module):
    def __init__(s, d=32):
        super().__init__()
        s.tok = nn.Embedding(len(VOCAB), d)
        s.head = nn.Linear(d, len(VOCAB), bias=False)
    def forward(s, idx):
        return s.head(s.tok(idx))

m = M(); opt = torch.optim.Adam(m.parameters(), lr=1e-2)
res = None
for _ in range(5):
    res = grpo_step(m, opt, "3", 6)
assert isinstance(res, tuple) and len(res) == 2, f"应返回二元组，实际 {type(res)}"
loss, mean_r = res
assert 0.0 <= mean_r <= 1.0, f"平均奖励应在 [0,1]，实际 {mean_r}"
if loss is not None:
    assert torch.isfinite(torch.tensor(float(loss))), "loss 必须是有限值"

# 全对/全错时必须返回 None
class Fixed(nn.Module):
    def __init__(s, ans):
        super().__init__(); s.p = nn.Parameter(torch.zeros(len(VOCAB))); s.ans = ans
    def forward(s, idx):
        v = torch.full((1, idx.shape[1], len(VOCAB)), -20.0)
        v[0, :, s.ans] = 20.0
        return v
mf = Fixed(stoi["6"])
l2, r2 = grpo_step(mf, torch.optim.SGD(mf.parameters(), lr=0.1), "3", 6, G=8, temp=1.0)
assert l2 is None and r2 == 1.0, f"全对时应返回 (None, 1.0)，实际 {(l2, r2)}"`,
    answer: `
import torch, torch.nn as nn, torch.nn.functional as F

VOCAB = list("0123456789")
stoi = {c: i for i, c in enumerate(VOCAB)}
itos = {i: c for c, i in stoi.items()}

def grpo_step(model, opt, prompt, gold, G=8, temp=1.5):
    plen = len(prompt)
    seqs, rewards, answers = [], [], []
    for _ in range(G):
        ids = [stoi[c] for c in prompt]
        p = F.softmax(model(torch.tensor([ids]))[0, -1] / temp, dim=-1)
        ids.append(torch.multinomial(p, 1).item())
        seqs.append(ids)
        txt = "".join(itos[i] for i in ids[plen:])
        answers.append(txt)
        rewards.append(1.0 if txt == str(gold) else 0.0)

    R = torch.tensor(rewards)
    mean_r = float(R.mean())
    if float(R.std()) < 1e-6:
        return None, mean_r

    adv = (R - R.mean()) / (R.std() + 1e-4)
    loss = 0.0
    for s_, A in zip(seqs, adv):
        logp = F.log_softmax(model(torch.tensor([s_[:-1]]))[0], dim=-1)
        loss = loss - A * logp[plen - 1, s_[-1]]
    loss = loss / G

    assert torch.isfinite(loss)
    opt.zero_grad(); loss.backward(); opt.step()
    return float(loss), mean_r`,
    explanation: '注意三处：① 采样必须带温度（T=0 会让组内全同）；② \`std < 1e-6\` 时返回 None 而不是硬算（防 NaN）；③ 损失是 \`-(adv × logprob)\` 的均值。这个函数就是 GRPO 的全部核心，原书 300 行的训练循环拆开就是它。',
  },
  {
    id: 'llm-a1-c16-l2-e10', type: 'single', difficulty: 4,
    relatedLessonId: 'llm-a1-c16-l2', tags: ['U', '边界'],
    question: '本节实测「tiny 模型学不会一位数加法，但学会了见 X 输出 9−X」。这说明？',
    options: [
      { value: 'a', text: 'RL 只能激发模型已有的潜力，不能创造不存在的能力；任务难度必须匹配模型容量' },
      { value: 'b', text: 'GRPO 算法有缺陷' },
      { value: 'c', text: '应该把训练步数加到一万步' },
      { value: 'd', text: '加法任务本身不可验证' },
    ],
    answer: 'a',
    explanation: 'R1-Zero 能成功的前提是 base 模型已经很强。tiny 模型（13 万参数）没有做多步推理的容量，再多 RL 也学不会。这是「RL 不是万能的」最直接的证据。',
  },
  {
    id: 'llm-a1-c16-l2-e11', type: 'open', difficulty: 4,
    relatedLessonId: 'llm-a1-c16-l2', tags: ['D', '分析'],
    question: '你在跑 GRPO 时观察到：前 200 步奖励从 0.4 稳步升到 0.9，之后 800 步一直停在 0.9 不动。请回答：\n① 列出至少 3 种可能的原因；\n② 给出区分它们的方法（每种原因配一个诊断手段）；\n③ 针对「题目太简单」这一种，给出具体解决措施。',
    referenceAnswer: `
① 三种可能原因：
1. **模型学会了（全对）**：奖励 0.9 意味着 90% 采样正确，组内多数情况标准差很小，优势趋近 0，没有梯度可用。
2. **题目太简单（分布问题）**：训练集里大部分题模型已掌握，少数难题的信号被淹没。
3. **超参问题**：学习率过大导致震荡在最优附近、温度过低导致组内多样性不足、G 太小导致优势估计噪声大。
（可加分：4. 奖励饱和——奖励函数设计使 0.9 已是上限，例如有 10% 的样本本身有标注错误。）

② 诊断手段：
- 对①：打印每步的「组内奖励标准差」与「全对比例」。如果全对比例接近 1 且 std < 1e-3，则确认是「学会了」。
- 对②：按题目难度（模型当前正确率）分桶，看各桶的样本数。如果 90% 的样本落在「已掌握」桶，则确认是分布问题。
- 对③：扫学习率（1e-4 / 3e-4 / 1e-3）与温度（1.0 / 1.5 / 2.0），看是否有改善；同时把 G 从 8 提到 16 看方差。
- 对④：人工检查那 10% 始终错的样本，看标准答案是否有误。

③ 针对「题目太简单」的措施：
- **课程学习（curriculum learning）**：按难度动态筛选训练题，优先用「模型正确率在 0.2-0.8 之间」的样本（这个区间优势信号最强）。
- **难度自适应采样**：每轮统计各题的组内 std，std 接近 0 的题降权或跳过。
- **引入更难的数据**：加入需要更多推理步的题目。
- **提高采样温度**：让组内更多样，从而恢复优势信号（治标）。
（关键是理解：「奖励饱和 = 没有梯度」，解决方向永远是「制造有效的奖励差异」。）`,
    rubric: [
      { point: '① 至少 3 种原因，且含「学会了/全对导致无梯度」这一核心机制', score: 3 },
      { point: '② 每种原因配具体的诊断手段（打印 std、按难度分桶、扫超参）', score: 3 },
      { point: '③ 给出课程学习或难度自适应采样等具体措施', score: 3 },
      { point: '③ 指出「正确率 0.2-0.8 区间信号最强」这个可操作判据', score: 1 },
    ],
    keywords: ['奖励饱和', '无梯度', '课程学习', '难度自适应', '组内标准差'],
    explanation: '这是 GRPO 调试最常遇到的场景。评分重点在②——能不能用「组内 std」这个指标区分「学会了」与「学不动了」。',
  },
  {
    id: 'llm-a1-c16-l2-e12', type: 'judge', difficulty: 4,
    relatedLessonId: 'llm-a1-c16-l2', tags: ['U', '对比'],
    question: 'GRPO 相比 PPO 在所有方面都更好。',
    answer: false,
    explanation: 'GRPO 省掉 Critic（显存与训练开销下降），但代价是每个 prompt 要采样 G 遍（通常 8），采样成本上升。如果采样很贵（长序列生成），PPO 可能更划算。没有免费的午餐。',
  },
  {
    id: 'llm-a1-c16-l2-e13', type: 'single', difficulty: 4,
    relatedLessonId: 'llm-a1-c16-l2', tags: ['U', '综合'],
    question: '为什么 GRPO 的优势要除以标准差（而不只是减均值）？',
    options: [
      { value: 'a', text: '让优势无量纲：奖励是 0/1 还是 0/100，优势尺度都一样，学习率不用重调' },
      { value: 'b', text: '为了加快计算' },
      { value: 'c', text: '为了防止优势为负' },
      { value: 'd', text: '没有实际作用' },
    ],
    answer: 'a',
    explanation: '除以标准差做「标准化」，使优势的尺度与奖励的绝对大小无关。这样换奖励函数（0/1 → 0/100）时不用重调学习率。但副作用是：std 极小时会爆炸——这正是那句 \`if std < 1e-6: continue\` 存在的原因。',
  },

  /* ═══════════ l3：蒸馏（10 题）═══════════ */
  {
    id: 'llm-a1-c16-l3-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'llm-a1-c16-l3', tags: ['K', '蒸馏'],
    question: '蒸馏（distillation）的本质是？',
    options: [
      { value: 'a', text: '学生模型模仿教师模型的输出（监督学习）' },
      { value: 'b', text: '学生模型自己试错（强化学习）' },
      { value: 'c', text: '把大模型压缩成小模型（量化）' },
      { value: 'd', text: '把多个模型集成起来' },
    ],
    answer: 'a',
    explanation: 'c 是量化（quantization），不是蒸馏。蒸馏的关键是「用教师的输出当标签做监督训练」，不需要奖励函数。',
  },
  {
    id: 'llm-a1-c16-l3-e2', type: 'judge', difficulty: 2,
    relatedLessonId: 'llm-a1-c16-l3', tags: ['U', '蒸馏'],
    question: '蒸馏训练出来的学生模型有可能超过教师模型。',
    answer: false,
    explanation: '不能。蒸馏的上限严格是教师的表现——学生学的是「教师怎么做」，学不到教师没写出来的东西。想超越必须靠 RL 或更好的数据。',
  },
  {
    id: 'llm-a1-c16-l3-e3', type: 'fill', difficulty: 2,
    relatedLessonId: 'llm-a1-c16-l3', tags: ['K', '流程'],
    question: '蒸馏三步：① 教师对训练题______ → ② 构造 (prompt, 教师回答) 对 → ③ 学生做下一 token 预测，损失只算______部分。',
    blanks: [['生成回答', '生成'], ['回答', '答案']],
    explanation: '第 ③ 步的「只算回答部分」就是 SFT 的损失掩码。不做掩码，学生会花算力去学「复述问题」，loss 数值虚低但实际能力差。',
  },
  {
    id: 'llm-a1-c16-l3-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'llm-a1-c16-l3', tags: ['U', '工程'],
    question: '为什么蒸馏数据必须做长度过滤？',
    options: [
      { value: 'a', text: '超长样本会导致 batch OOM' },
      { value: 'b', text: '按 token 平均损失时，超长样本会主导梯度' },
      { value: 'c', text: '超长回答通常是教师没在真思考' },
      { value: 'd', text: '长度过滤能让准确率提高 10%' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 是编造的。长度过滤是「防事故」措施，不是「提效果」手段：不做会 OOM，会让学生只学会「写很长的思考」而不是「写对的思考」。',
  },
  {
    id: 'llm-a1-c16-l3-e5', type: 'code', difficulty: 3,
    relatedLessonId: 'llm-a1-c16-l3', tags: ['D', '数据构造'],
    lang: 'python',
    question: '实现 \`build_dataset(teacher, n, max_len)\`：\n- 生成 n 条样本：随机 x∈[0,9]，prompt=str(x)，answer=teacher(prompt)；\n- token_ids = [prompt 的 token] + [answer 的 token] + [eos]；\n- 长度过滤：若回答部分 token 数 > max_len，丢弃；\n- 返回 \`(样本列表, 丢弃数)\`，样本形如 \`{"token_ids": [...], "prompt_len": int}\`。',
    starterCode: `
VOCAB = list("0123456789") + ["<eos>"]
stoi = {c: i for i, c in enumerate(VOCAB)}
EOS = stoi["<eos>"]

def build_dataset(teacher, n=100, max_len=4):
    pass`,
    expectedOutput: '保留 + 丢弃 = n',
    tests: `
VOCAB = list("0123456789") + ["<eos>"]
stoi = {c: i for i, c in enumerate(VOCAB)}
EOS = stoi["<eos>"]

def teacher(p): return str(9 - int(p))
data, dropped = build_dataset(teacher, n=100, max_len=4)
assert len(data) + dropped == 100, f"保留{dropped and len(data)} + 丢弃{dropped} 应等于 100"
assert all("token_ids" in d and "prompt_len" in d for d in data)
assert all(d["prompt_len"] == 1 for d in data), "prompt 是单个字符，长度应为 1"
assert all(len(d["token_ids"]) > d["prompt_len"] for d in data)
assert all(d["token_ids"][-1] == EOS for d in data), "应以 EOS 结尾"

# 超长教师 → 全部被丢弃
big = lambda p: "6" * 100
d2, drop2 = build_dataset(big, n=10, max_len=4)
assert len(d2) == 0 and drop2 == 10, f"超长应全丢弃，实际 保留{len(d2)} 丢弃{drop2}"

# max_len 足够大 → 全部保留
d3, drop3 = build_dataset(big, n=10, max_len=200)
assert len(d3) == 10 and drop3 == 0`,
    answer: `
VOCAB = list("0123456789") + ["<eos>"]
stoi = {c: i for i, c in enumerate(VOCAB)}
EOS = stoi["<eos>"]

import random

def build_dataset(teacher, n=100, max_len=4):
    data, dropped = [], 0
    for _ in range(n):
        x = random.randint(0, 9)
        prompt = str(x)
        answer = teacher(prompt)
        p_ids = [stoi[c] for c in prompt]
        a_ids = [stoi[c] for c in answer] + [EOS]
        if len(a_ids) > max_len:
            dropped += 1
            continue
        data.append({"token_ids": p_ids + a_ids, "prompt_len": len(p_ids)})
    return data, dropped`,
    explanation: '注意 \`prompt_len\` 必须记录——它就是损失掩码的起点（训练时只对 \`token_ids[prompt_len:]\` 算损失）。忘了存这个字段，后续训练就无法做掩码。',
  },
  {
    id: 'llm-a1-c16-l3-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'llm-a1-c16-l3', tags: ['U', '掩码'],
    question: '蒸馏训练时如果对整条序列（含 prompt）算交叉熵损失，会发生什么？',
    options: [
      { value: 'a', text: 'loss 数值看起来更低，但学生在真正重要的回答部分学得不够' },
      { value: 'b', text: '训练完全失败，loss 变成 NaN' },
      { value: 'c', text: '没有任何影响' },
      { value: 'd', text: '学生学会复述问题，效果更好' },
    ],
    answer: 'a',
    explanation: 'prompt 部分是重复的、容易预测的（每个样本都以 prompt 开头），会拉低平均 loss，让训练看起来「很成功」。但真正需要学的是「回答的第一个 token」。必须只对 \`token_ids[prompt_len:]\` 算损失。',
  },
  {
    id: 'llm-a1-c16-l3-e7', type: 'judge', difficulty: 3,
    relatedLessonId: 'llm-a1-c16-l3', tags: ['U', '选择'],
    question: '实践中通常先用蒸馏拿到一个可用模型，再用 RL 尝试突破。',
    answer: true,
    explanation: '这是 DeepSeek-R1 论文的核心工程结论。蒸馏快、稳、密集监督；RL 慢、不稳但可能突破。先蒸馏建立基线，再 RL 加分，是性价比最高的顺序。',
  },
  {
    id: 'llm-a1-c16-l3-e8', type: 'open', difficulty: 4,
    relatedLessonId: 'llm-a1-c16-l3', tags: ['D', '对比'],
    question: '你有两个选择来提升一个 0.6B 模型的数学推理能力：\nA. 用 DeepSeek-R1 生成 5 万条带思考过程的解答，做蒸馏；\nB. 用 GRPO + RLVR 自己训练。\n\n请回答：\n① 各列出 3 个优点与 3 个缺点；\n② 如果只能算 10 小时（单卡），你选哪个？给出量化依据；\n③ 如果目标是「最终超过 R1 在某个细分任务上的表现」，你选哪个？为什么？',
    referenceAnswer: `
① A（蒸馏）：
- 优点：快（一次生成 + 监督训练）、稳（标准交叉熵，不会崩）、密集监督（每 token 都有标签）。
- 缺点：上限受 R1 限制（不可能超过 R1）、依赖教师质量（R1 答错的题会教坏学生）、5 万条数据生成成本不低（R1 是大模型，生成慢）。
B（GRPO + RLVR）：
- 优点：可能超过教师（探索出 R1 没找到的路径）、只需可验证的奖励（不需要教师）、能针对细分任务优化。
- 缺点：慢（大量采样 + 多轮迭代）、不稳（奖励稀疏、梯度方差大、可能 NaN）、需要精心设计奖励函数与课程。

② 只有 10 小时单卡 → 选 A（蒸馏）。
量化依据：
- 蒸馏：R1 生成 5 万条（假设每条 500 token，大模型约 50 token/s）≈ 5e4×500/50 = 5e5 秒 ≈ 139 小时——**光生成就超预算**。所以实际做法是：用 R1 官方开源的蒸馏数据集（DeepSeek 已公开），或只生成 5000 条（约 14 小时）+ 训练 1-2 小时。
- GRPO：单卡 0.6B，每步采样 8 条 × 平均 300 token ≈ 2400 token 前向 + 反向，约 3-5 秒/步。10 小时 ≈ 7200-12000 步。这个步数对 0.6B 做有效 RL 偏少（R1-Zero 用了数千步但模型更大、数据更多）。
- 结论：**两者都紧，但 A 更快见效**——尤其如果能直接用现成的蒸馏数据集，10 小时足够训练出明显优于 base 的模型。

③ 目标是「超过 R1 在细分任务上」→ 选 B（GRPO + RLVR）。
理由：
- 蒸馏的上限严格是 R1，不可能超过；
- RL 有可能在特定任务上探索出教师没想到的策略（R1-Zero 的 Aha Moment 就是自发涌现）；
- 细分任务上，RL 可以直接针对该任务的可验证奖励优化，而 R1 的蒸馏数据是通用的；
- 但要注意：从 base 直接 RL 很难，实践中会**先蒸馏再 RL**——用蒸馏建立基线，再用 RL 在细分任务上突破。这才是 R1 论文的实际顺序。`,
    rubric: [
      { point: '① A/B 各 3 个优缺点，且提到「蒸馏上限受教师限制」', score: 3 },
      { point: '② 用具体算例（生成量 ÷ 速度）论证，而非泛泛而谈', score: 3 },
      { point: '② 指出「直接用现成蒸馏数据集」这个务实选项', score: 2 },
      { point: '③ 明确「要超越必须 RL」并提到「先蒸馏再 RL」的顺序', score: 2 },
    ],
    keywords: ['蒸馏', 'GRPO', '上限', '密集监督', '算力预算', '先蒸馏再RL'],
    explanation: '这道题训练的是「工程决策」能力。评分重点在②——能不能把「10 小时」翻译成「能跑多少步/生成多少条」，而不是凭直觉选。',
  },
  {
    id: 'llm-a1-c16-l3-e9', type: 'fill', difficulty: 3,
    relatedLessonId: 'llm-a1-c16-l3', tags: ['K', '对比'],
    question: '蒸馏的监督信号是______的（每个 token 都有标签），RL 的是______的（整条序列只有 1 个奖励）。这是蒸馏通常更快收敛的根本原因。',
    blanks: [['密集', 'dense'], ['稀疏', 'sparse']],
    explanation: '密集 vs 稀疏监督是理解「预训练为什么比 RL 稳定」的关键。预训练每个 token 都有标签（密集），RL 只有最终奖励（稀疏），后者的梯度方差天然大得多。',
  },
  {
    id: 'llm-a1-c16-l3-e10', type: 'single', difficulty: 4,
    relatedLessonId: 'llm-a1-c16-l3', tags: ['U', '风险'],
    question: '用模型自己生成的数据做蒸馏，最大的风险是？',
    options: [
      { value: 'a', text: '错误传播：教师的错误会被学生学会，且可能被放大（模型崩溃/退化）' },
      { value: 'b', text: '生成速度太慢' },
      { value: 'c', text: '数据量不够大' },
      { value: 'd', text: '没有风险，自蒸馏是最优方案' },
    ],
    answer: 'a',
    explanation: '这是 model collapse（模型自噬）的机制：用自己的输出训练自己，错误与偏差会累积放大，多样性下降。防范：用更强模型的输出（如 R1 → 0.6B）、过滤掉教师答错的样本（用 c14 判等）、保留一部分真实数据。',
  },
];

export default llmA1C16Exercises;
