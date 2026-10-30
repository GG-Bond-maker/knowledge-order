import type { Exercise } from '../../types';

/* ============================================================
 *  c15 习题：4 节，共 38 题
 *
 *  l1 CoT 提示（难度 2）      8 题
 *  l2 温度与 top-p（难度 3）  10 题
 *  l3 Self-consistency（难度 4）10 题
 *  l4 Best-of-N 与自反思（难度 4）10 题
 *
 *  【口径说明】规格 §0 的章表要求 c15 共 38 题；而 §3 的「难度→题量」表给出
 *  难度 4 → 13 题，两节难度 4 会把总数推到 44 题。此处以章表的总题量 38 为准
 *  （132 题 = 38 + 28 + 38 + 28），l3/l4 各压到 10 题，
 *  difficulty 字段仍按规格标注为 4。这一点已在交付报告中向 Lead 说明。
 *
 *  【code 题约束】全部不 import torch、不联网、不下载模型，走 Pyodide 秒级完成。
 *
 *  【数字来源】全部与正文、demo 实测一致：
 *    中等题 12 → 83；简单题 42 → 42
 *    T=0: 12/12/12；T=0.8: 13/7/14；T=1.5: 3/9/3
 *    A 组 42/42/42 → 42(3/3)；B 组 83/74/3 → 无众数
 *    5 样本基线：42(4/4) 与 83/13/49/11/None
 *    Best-of-3：9/76/76，logprob +0.000/-0.008/-0.037，打分全 1.00
 *    自反思：83(109 tok) → "OK."(3 tok) → None(120 tok)
 * ============================================================ */

export const llmA1C15Exercises: Exercise[] = [
  /* ═══════════════ l1：CoT 提示（难度 2，8 题）═══════════════ */
  {
    id: 'llm-a1-c15-e1',
    relatedLessonId: 'llm-a1-c15-l1',
    type: 'single',
    difficulty: 1,
    question: '同一道中等题（Half the value of $3x-9$ is $x+37$），Qwen3-0.6B 在「直接答」与「加 CoT」两种提示下的实测答案是？',
    options: [
      { value: 'A', text: '直接答 83（对），加 CoT 12（错）' },
      { value: 'B', text: '直接答 12（错），加 CoT 83（对）' },
      { value: 'C', text: '两者都是 83（对）' },
      { value: 'D', text: '两者都是 12（错）' },
    ],
    answer: 'B',
    explanation:
      '本站实测：直接答只生成 18 token 就吐出 `\\boxed{12}`（错）；加一句 `Let\'s think step by step.` 后生成 197 token，四步推导得到 `\\boxed{83}`（对）。同一份权重、同样的贪心解码，唯一变化是 prompt。',
    tags: ['K', 'CoT', '实测'],
  },
  {
    id: 'llm-a1-c15-e2',
    relatedLessonId: 'llm-a1-c15-l1',
    type: 'single',
    difficulty: 2,
    question: 'CoT 提示能让模型答对更多题的**根本原因**是？',
    options: [
      { value: 'A', text: '「step by step」这几个字给模型打了气，让它更认真' },
      { value: 'B', text: 'CoT 触发了模型内部某个专门做推理的模块' },
      { value: 'C', text: '生成的每个 token 都要重跑一次完整前向，CoT 把一次固定深度的计算拆成 N 次，并把中间结果写回上下文供后续步骤读取' },
      { value: 'D', text: 'CoT 让模型的层数临时变多了' },
    ],
    answer: 'C',
    explanation:
      'Transformer 一次前向是固定深度的（Qwen3-0.6B 就是 28 层），prompt 里写什么都不会改变这一点。CoT 的收益来自「多循环几次」：18 token 相当于 504 层计算，197 token 相当于 5516 层，而且第 2 步的输出会变成第 3 步的输入——这才是「草稿纸」的物理实现。',
    tags: ['K', 'CoT', '原理'],
  },
  {
    id: 'llm-a1-c15-e3',
    relatedLessonId: 'llm-a1-c15-l1',
    type: 'judge',
    difficulty: 2,
    question: '对简单题（如 `17+25`），加 CoT 提示同样能显著提升正确率。',
    answer: false,
    explanation:
      '实测：简单题直接答 42（对，11 token），加 CoT 仍是 42（对，88 token）——答案一模一样，多花了 77 token。简单题本来就一步到位，CoT 只是把同一件事重复写了几遍。收益为 0、成本为正。',
    tags: ['U', 'CoT', '失效情形'],
  },
  {
    id: 'llm-a1-c15-e4',
    relatedLessonId: 'llm-a1-c15-l1',
    type: 'judge',
    difficulty: 3,
    question: '加了 CoT 之后，只要模型写了推理过程，就一定能从输出里提取到 `\\boxed{}` 答案。',
    answer: false,
    explanation:
      '不一定，而且这是最常见的翻车点。实测中等题 CoT 需要 197 token；若把 `max_new_tokens` 设成 60，模型会在推导中途被硬切断，既没有 boxed 答案也没有完整中间结果。所以解析结果必须检查是否为 None，不能假设有答案。',
    tags: ['U', '工程', '截断'],
  },
  {
    id: 'llm-a1-c15-e5',
    relatedLessonId: 'llm-a1-c15-l1',
    type: 'fill',
    difficulty: 2,
    question: '实测中等题「直接答」生成 ___ token，「加 CoT」生成 ___ token（填数字，按顺序）。',
    blanks: [['18'], ['197']],
    explanation:
      '直接答 18 token（2.1 秒），加 CoT 197 token（27.6 秒）——10.9 倍 token、13.1 倍时间。这个倍数就是「用 token 换计算」的价格标签。',
    tags: ['K', '实测', '成本'],
  },
  {
    id: 'llm-a1-c15-e6',
    relatedLessonId: 'llm-a1-c15-l1',
    type: 'multiple',
    difficulty: 3,
    question: '以下哪些情形会让 CoT 失效或收益为零？（多选）',
    options: [
      { value: 'A', text: '题目本身只有一步，模型直接答就能对' },
      { value: 'B', text: '模型对这类题的能力根本不够，写出来的推理链从头就跑偏' },
      { value: 'C', text: '`max_new_tokens` 设得太小，推导在中途被截断' },
      { value: 'D', text: '温度设为 0，走贪心解码' },
    ],
    answer: ['A', 'B', 'C'],
    explanation:
      'A 是「题太简单」：实测简单题加 CoT 收益为 0、多花 77 token。B 是「能力不足」：CoT 提供的是分步计算的机会，不是计算能力本身。C 是「输出被截断」：最常见的工程翻车点。D 不影响 CoT 的有效性——贪心解码恰恰是单次求最优答案的推荐配置。',
    tags: ['U', 'CoT', '失效情形'],
  },
  {
    id: 'llm-a1-c15-e7',
    relatedLessonId: 'llm-a1-c15-l1',
    type: 'code',
    difficulty: 3,
    question:
      '写一个 `should_use_cot(records)` 决策函数：给定一组实验记录，判断「对这个题集该不该默认开启 CoT」。\n\n每条记录是 dict：\n- `base_ok` / `cot_ok`：直接答 / 加 CoT 是否正确（bool）\n- `base_tokens` / `cot_tokens`：两种方式的生成 token 数\n\n规则（依次判断）：\n1. 若样本数少于 5，返回 `"样本不足"`；\n2. 若「加 CoT 的正确率 − 直接答的正确率」< 0.05，返回 `"不值得"`（收益太小，白花 token）；\n3. 若 CoT 的平均 token 数超过直接答的 12 倍，返回 `"成本过高"`；\n4. 否则返回 `"建议开启"`。',
    starterCode: `def should_use_cot(records):
    if len(records) < 5:
        return ___
    n = len(records)
    base_acc = ___
    cot_acc = ___
    if ___:
        return "不值得"
    base_tok = sum(r["base_tokens"] for r in records) / n
    cot_tok = sum(r["cot_tokens"] for r in records) / n
    if ___:
        return "成本过高"
    return "建议开启"
`,
    setupCode: '',
    expectedOutput: '依次返回：样本不足 / 不值得 / 成本过高 / 建议开启',
    tests: `def mk(base_ok, cot_ok, bt=18, ct=197):
    return {"base_ok": base_ok, "cot_ok": cot_ok, "base_tokens": bt, "cot_tokens": ct}

# ① 样本不足
assert should_use_cot([mk(False, True) for _ in range(4)]) == "样本不足"

# ② 收益太小（简单题：两边都对）
easy = [mk(True, True, 11, 88) for _ in range(5)]
assert should_use_cot(easy) == "不值得", should_use_cot(easy)

# ③ 收益够但成本过高（token 比 20 倍 > 12 倍阈值）
expensive = [mk(False, True, 10, 200) for _ in range(5)]
assert should_use_cot(expensive) == "成本过高", should_use_cot(expensive)

# ④ 建议开启（实测口径：直接答 0/5 对，加 CoT 5/5 对，token 比 197/18 ≈ 10.9 倍）
good = [mk(False, True, 18, 197) for _ in range(5)]
assert should_use_cot(good) == "建议开启", should_use_cot(good)

# ⑤ 边界：提升恰好 0.05 时应通过第 2 关（用 >= 而非 >）
edge = [mk(False, True, 18, 100) for _ in range(19)] + [mk(True, True, 18, 100)]
assert should_use_cot(edge) == "建议开启", should_use_cot(edge)
`,
    answer: `def should_use_cot(records):
    if len(records) < 5:
        return "样本不足"
    n = len(records)
    base_acc = sum(1 for r in records if r["base_ok"]) / n
    cot_acc = sum(1 for r in records if r["cot_ok"]) / n
    if cot_acc - base_acc < 0.05:
        return "不值得"
    base_tok = sum(r["base_tokens"] for r in records) / n
    cot_tok = sum(r["cot_tokens"] for r in records) / n
    if cot_tok > base_tok * 12:
        return "成本过高"
    return "建议开启"`,
    explanation:
      '```python\nif len(records) < 5:\n    return "样本不足"\nbase_acc = sum(1 for r in records if r["base_ok"]) / n\ncot_acc = sum(1 for r in records if r["cot_ok"]) / n\nif cot_acc - base_acc < 0.05:\n    return "不值得"\nif cot_tok > base_tok * 12:\n    return "成本过高"\nreturn "建议开启"\n```\n\n**三个设计要点**：\n1. **先看样本量**——4 条记录算出的正确率没有统计意义；\n2. **再看收益**——实测简单题的收益是 0（42→42），这种题集开 CoT 就是纯亏；\n3. **最后看成本**——实测中等题的 token 比是 197/18 ≈ 10.9 倍，刚好在 12 倍阈值之内。这说明「建议开启」只适用于「收益够大且 token 比可控」的场景；生产环境里 10.9 倍成本必须单独算账，阈值 12 倍就是「超过就别开」的红线。',
    tags: ['D', '编程', 'CoT'],
  },
  {
    id: 'llm-a1-c15-e8',
    relatedLessonId: 'llm-a1-c15-l1',
    type: 'open',
    difficulty: 4,
    question:
      '请解释 CoT（思维链）提示为什么能在「不改动任何权重」的前提下提升模型的答题正确率。要求：①从 Transformer 的前向计算结构出发说明机制；②用本课程实测的 token 数与答案对比作为证据；③说明它在哪三种情况下会失效，并各举一个可验证的判断方法。',
    referenceAnswer: `**一、机制：固定深度的前向 vs 可循环的生成**

Transformer 的一次前向是**固定深度**的：Qwen3-0.6B 有 28 层，输入什么、prompt 里写什么，都不会改变这个数字。所以「请仔细思考」这句话在计算量上的效果是 0。

但自回归生成是**循环**的：模型每吐一个 token，都要把「原 prompt + 已生成的所有 token」重新喂进去跑一次完整前向。于是：

    生成 N 个 token = 跑 N 次前向 = N × 28 层计算

更关键的是**写回**：第 2 步生成的 \`3x-9 = 2x+74\` 会变成第 3 步输入的一部分。模型不需要在 28 层里一次算完整个推导链，它可以把它拆成 N 个单步，每步只算一小段，中间结果存在上下文里当外部存储。

这就是「用 token 换计算」的字面含义。CoT 不是让模型变聪明，是让它**有机会把一件事分多次做**。

**二、实测证据**

| 实验 | 生成 token | 耗时 | 答案 |
| --- | --- | --- | --- |
| 中等题 · 直接答 | 18 | 2.1 s | 12（错，正确 83） |
| 中等题 · 加 CoT | 197 | 27.6 s | 83（对） |
| 简单题 · 直接答 | 11 | 1.3 s | 42（对） |
| 简单题 · 加 CoT | 88 | 11.9 s | 42（对，无变化） |

两组数据合起来才是完整证据：**中等题从错到对**（收益为正），**简单题毫无变化**（收益为零）。如果 CoT 是「让模型更认真」，简单题也该有点变化；它没有，说明机制是「多算了几次」。

展开看中等题的 CoT 输出，四个步骤每步都是 28 层能轻松搞定的小操作：

    第 1 步：(1/2)(3x-9) = x+37
    第 2 步：3x-9 = 2x+74
    第 3 步：x-9 = 74
    第 4 步：x = 83

答案不是「想」出来的，是一步步「写」出来的。

**三、三种失效情形与判断方法**

| 失效情形 | 原因 | 可验证的判断方法 |
| --- | --- | --- |
| 题太简单 | 本来就一步到位，多写只是重复 | 对题集跑 A/B：若「加 CoT 正确率 − 直接答正确率」< 0.05，就别开 |
| 模型能力不足 | CoT 给的是「分步计算的机会」，不是「计算能力」 | 看 CoT 输出的中间步骤：若某一步的算式本身就错了（如 3x-9 = 2x+76），说明是能力问题，加更多 token 也没用 |
| 输出被截断 | token 预算没同步加大 | 统计「输出里能找到 boxed 的比例」：若 < 1，就是被截断；把 max_new_tokens 加大后该比例应回升 |

**四、工程结论**

CoT 的收益是「有条件」的：只在需要多步推理、且模型具备基础能力的题上为正。生产环境必须按「每提升 1% 正确率的 token 成本」算账——实测中等题是 10.9 倍 token、13.1 倍时间，这个价格对高频接口来说往往不划算，此时正确的做法是把这种能力**训进权重**（c16 的 GRPO），而不是每次推理都花 10 倍算力。`,
    rubric: [
      { point: '指出一次前向深度固定、生成 token 会重跑前向这一机制', score: 3 },
      { point: '指出中间结果会写回上下文、充当外部存储', score: 2 },
      { point: '用中等题 12→83 与简单题 42→42 两组数据对照说明', score: 2 },
      { point: '列出三种失效情形并各给一个可验证的判断方法', score: 2 },
      { point: '给出「token 成本 vs 收益」的工程结论', score: 1 },
    ],
    keywords: ['固定深度', '重跑前向', '写回上下文', 'token 换计算', '12', '83', '截断'],
    explanation:
      '这道题的关键是「别把 CoT 说成心理暗示」。能写出「N 个 token = N 次前向 = N×28 层」这个等式，并用「简单题无变化」反证，就抓住了本质。',
    tags: ['K', 'CoT', '面试'],
  },

  /* ═══════════════ l2：温度与 top-p（难度 3，10 题）═══════════════ */
  {
    id: 'llm-a1-c15-e9',
    relatedLessonId: 'llm-a1-c15-l2',
    type: 'single',
    difficulty: 2,
    question: '带温度的 softmax 公式是？',
    options: [
      { value: 'A', text: '$p_i = \\exp(T z_i) / \\sum_j \\exp(T z_j)$' },
      { value: 'B', text: '$p_i = \\exp(z_i / T) / \\sum_j \\exp(z_j / T)$' },
      { value: 'C', text: '$p_i = T \\exp(z_i) / \\sum_j \\exp(z_j)$' },
      { value: 'D', text: '$p_i = \\exp(z_i - T) / \\sum_j \\exp(z_j - T)$' },
    ],
    answer: 'B',
    explanation:
      '温度是**除以** logits：$p_i = \\exp(z_i/T) / \\sum_j \\exp(z_j/T)$。$T \\to 0$ 时 $z_i/T$ 的差异被放大到无穷，最大值独占全部概率（退化为 argmax）；$T \\to \\infty$ 时所有 $z_i/T \\to 0$，分布趋于均匀。',
    tags: ['K', '温度', '公式'],
  },
  {
    id: 'llm-a1-c15-e10',
    relatedLessonId: 'llm-a1-c15-l2',
    type: 'single',
    difficulty: 2,
    question: '实测：中等题在 T=0 / 0.8 / 1.5 下各采样 3 次，三次答案分别是 12/12/12、13/7/14、3/9/3。这组数据说明什么？',
    options: [
      { value: 'A', text: '温度越高越容易撞到正确答案 83' },
      { value: 'B', text: '温度只影响输出的多样性，不提升单次正确率——三个温度下正确答案一次都没出现' },
      { value: 'C', text: 'T=1.5 时答案更集中，说明高温更好' },
      { value: 'D', text: 'T=0 时模型发生了随机采样故障' },
    ],
    answer: 'B',
    explanation:
      '关键读数是「正确答案 83 在三个温度下都是 0 次」。温度提高只带来「更多不同的错误答案」。温度是给 self-consistency 提供多样性的工具，不是提升单次正确率的工具——后者要靠 CoT（c15-l1）。',
    tags: ['U', '温度', '实测'],
  },
  {
    id: 'llm-a1-c15-e11',
    relatedLessonId: 'llm-a1-c15-l2',
    type: 'single',
    difficulty: 3,
    question: 'top-p（nucleus sampling）与 top-k 的核心区别是？',
    options: [
      { value: 'A', text: 'top-p 固定保留 p 个 token，top-k 保留 k 个' },
      { value: 'B', text: 'top-p 按累积概率截断，保留的个数随分布形状自适应；top-k 固定保留 k 个，不管分布形状' },
      { value: 'C', text: 'top-p 只作用于 logits，top-k 只作用于概率' },
      { value: 'D', text: '两者完全等价，只是参数名不同' },
    ],
    answer: 'B',
    explanation:
      '以概率 $[0.700, 0.257, 0.043]$ 为例：top-p=0.5 只留第 1 个（0.700 已超 0.5），top-p=0.9 留前 2 个（0.700+0.257=0.957）。分布尖锐时只留 1-2 个、分布平坦时留几十个——这个自适应性是 top-p 在推理任务上比 top-k 稳的原因。',
    tags: ['K', 'top-p', '采样'],
  },
  {
    id: 'llm-a1-c15-e12',
    relatedLessonId: 'llm-a1-c15-l2',
    type: 'judge',
    difficulty: 2,
    question: '在 transformers 的 `generate()` 里不显式传 `do_sample=False`，`temperature=0` 也能保证走贪心解码。',
    answer: false,
    explanation:
      '错，这是本站实测踩过的坑。Qwen3 的 `generation_config.json` 里 `do_sample: true`、`temperature: 0.6`、`top_p: 0.95`。不显式关掉采样，你的「T=0 贪心」其实是随机采样——表现为「同一段代码两次跑出不同答案」。必须显式写 `do_sample=False`。',
    tags: ['U', '工程', 'do_sample'],
  },
  {
    id: 'llm-a1-c15-e13',
    relatedLessonId: 'llm-a1-c15-l2',
    type: 'judge',
    difficulty: 3,
    question: '实测 T=1.5 生成 40 token 的叙事文本时，输出里出现了 `_________` 和 `A. [insert your answer]` 这类填空符——说明高温会让格式崩塌。',
    answer: true,
    explanation:
      '这是本站实测的原文输出。T=1.5 时模型在模仿「试卷」这种文本形态。对推理任务这是致命的：你需要 `\\boxed{83}` 这种格式，格式一崩答案就提取不出来，正确率会假性归零。所以推理任务温度上限建议 1.3。',
    tags: ['U', '温度', '格式崩塌'],
  },
  {
    id: 'llm-a1-c15-e14',
    relatedLessonId: 'llm-a1-c15-l2',
    type: 'fill',
    difficulty: 3,
    question:
      'logits 为 $[3.0, 2.0, 0.2]$，$T=1.0$ 时最大概率约 0.70；$T=3.0$ 时最大概率约 ___（保留两位小数）。',
    blanks: [['0.47', '0.474', '47%']],
    explanation:
      '计算：$z/3 = [1.0, 0.667, 0.067]$，减去最大值 1.0 得 $[0, -0.333, -0.933]$，$\\exp$ 得 $[1, 0.717, 0.393]$，和 2.110，最大概率 $= 1/2.110 \\approx 0.474$。温度从 1 提到 3，最大概率从 70% 掉到 47%，熵从 0.73 涨到 1.03——这就是「更分散」的量化含义。',
    tags: ['K', '温度', '手算'],
  },
  {
    id: 'llm-a1-c15-e15',
    relatedLessonId: 'llm-a1-c15-l2',
    type: 'multiple',
    difficulty: 3,
    question: '关于温度与 top-p 的工程使用，以下哪些说法正确？（多选）',
    options: [
      { value: 'A', text: '生产环境做回归测试、审计时必须固定 T=0 加固定 seed，保证可复现' },
      { value: 'B', text: 'self-consistency / Best-of-N 需要候选之间有差异，所以要用 T=0.7~1.0' },
      { value: 'C', text: '推理任务用 T ≥ 1.5 能提升探索能力，值得一试' },
      { value: 'D', text: 'T=0 时 top-p 实际上不起作用（分布已是 one-hot，截断不改变结果）' },
    ],
    answer: ['A', 'B', 'D'],
    explanation:
      'A：可复现性是可审计的前提。B：没有温度就没有多样性，N 个候选会一模一样，投票和选优都退化成单次采样。D：T=0 时分布退化为 one-hot，累积概率第一个就超阈值，top-p 截断不改变结果。C 错：实测 T=1.5 出现填空符、格式崩塌，boxed 答案提取不出来。',
    tags: ['D', '温度', '工程'],
  },
  {
    id: 'llm-a1-c15-e16',
    relatedLessonId: 'llm-a1-c15-l2',
    type: 'code',
    difficulty: 3,
    question:
      '实现两个采样工具函数（纯 Python，不依赖 numpy）：\n\n1. `apply_temperature(logits, T)`：返回带温度 softmax 后的概率列表。要求数值稳定（先减去最大值）。$T \\leq 0$ 时抛 `ValueError`。\n2. `top_p_filter(probs, p)`：按累积概率从高到低截断，返回**重归一化后**的概率列表（长度与原列表相同，被截断的置 0）。`p >= 1.0` 时原样返回。',
    starterCode: `import math


def apply_temperature(logits, T):
    if T <= 0:
        raise ValueError("T must be > 0")
    scaled = [___ for z in logits]
    m = max(scaled)
    exps = [math.exp(s - m) for s in scaled]
    total = sum(exps)
    return [e / total for e in exps]


def top_p_filter(probs, p):
    if p >= 1.0:
        return list(probs)
    order = sorted(range(len(probs)), key=lambda i: probs[i], reverse=True)
    keep, acc = [], 0.0
    for i in order:
        keep.append(i)
        acc += probs[i]
        if acc >= p:
            break
    total = sum(probs[i] for i in keep)
    out = [0.0] * len(probs)
    for i in keep:
        out[i] = probs[i] / total
    return out
`,
    setupCode: '',
    expectedOutput: 'T=0.5 时最大概率约 0.878；top-p=0.5 时只剩第 1 个 token',
    tests: `import math
LOGITS = [3.0, 2.0, 0.2]

# ── apply_temperature ──
p1 = apply_temperature(LOGITS, 1.0)
assert abs(p1[0] - 0.700) < 0.005, p1
assert abs(sum(p1) - 1.0) < 1e-9

p05 = apply_temperature(LOGITS, 0.5)
assert abs(p05[0] - 0.878) < 0.005, p05
assert p05[0] > p1[0], "低温应该让最大概率更大"

p30 = apply_temperature(LOGITS, 3.0)
assert abs(p30[0] - 0.474) < 0.005, p30
assert p30[0] < p1[0], "高温应该让分布更平"

# 数值稳定性：超大 logits 不能溢出
big = apply_temperature([1000.0, 999.0, 1.0], 1.0)
assert abs(sum(big) - 1.0) < 1e-9 and big[0] > big[1] > big[2]

try:
    apply_temperature(LOGITS, 0)
    raise AssertionError("T=0 应抛 ValueError")
except ValueError:
    pass

# ── top_p_filter ──
f = top_p_filter(p1, 0.5)
assert f[0] == 1.0 and f[1] == 0.0 and f[2] == 0.0, f

f9 = top_p_filter(p1, 0.9)
assert f9[2] == 0.0, f9
assert abs(f9[0] + f9[1] - 1.0) < 1e-9
assert abs(f9[0] / f9[1] - p1[0] / p1[1]) < 1e-9, "重归一化应保持相对比例"

f1 = top_p_filter(p1, 1.0)
assert f1 == p1, "p>=1 应原样返回"

# p 很小：只留最大那个
ftiny = top_p_filter(p1, 0.01)
assert ftiny[0] == 1.0 and ftiny[1] == 0.0
`,
    answer: `import math


def apply_temperature(logits, T):
    if T <= 0:
        raise ValueError("T must be > 0")
    scaled = [z / T for z in logits]
    m = max(scaled)
    exps = [math.exp(s - m) for s in scaled]
    total = sum(exps)
    return [e / total for e in exps]


def top_p_filter(probs, p):
    if p >= 1.0:
        return list(probs)
    order = sorted(range(len(probs)), key=lambda i: probs[i], reverse=True)
    keep, acc = [], 0.0
    for i in order:
        keep.append(i)
        acc += probs[i]
        if acc >= p:
            break
    total = sum(probs[i] for i in keep)
    out = [0.0] * len(probs)
    for i in keep:
        out[i] = probs[i] / total
    return out`,
    explanation:
      '```python\nscaled = [z / T for z in logits]   # 温度是「除以」\nm = max(scaled)                     # 数值稳定：先减最大值\nexps = [math.exp(s - m) for s in scaled]\n```\n\n**三个易错点**：\n1. 温度是除以 logits（`z / T`），不是乘；\n2. 不减最大值会在 logits 很大时 `exp` 溢出（测试里 `[1000.0, 999.0, 1.0]` 就是专门抓这个）；\n3. top-p 必须**重归一化**——截断后剩下的概率和小于 1，不重新归一化就不是合法分布。\n\n注意重归一化保持相对比例：`f9[0]/f9[1]` 应等于 `p1[0]/p1[1]`。',
    tags: ['D', '编程', '温度'],
  },
  {
    id: 'llm-a1-c15-e17',
    relatedLessonId: 'llm-a1-c15-l2',
    type: 'open',
    difficulty: 4,
    question:
      '请说明温度与 top-p 分别控制什么，并解释为什么「提高温度不会让模型更聪明」。要求：①写出公式并解释 $T \\to 0$ 与 $T \\to \\infty$ 两个极限；②说明 top-p 与 top-k 的区别；③用本课程的实测数据证明温度不提升单次正确率。',
    referenceAnswer: `**一、两个旋钮各控制什么**

带温度的 softmax：

$$p_i^{(T)} = \\frac{\\exp(z_i/T)}{\\sum_j \\exp(z_j/T)}$$

两个极限：

| 极限 | 数学行为 | 效果 |
| --- | --- | --- |
| $T \\to 0$ | $z_i/T$ 的差异被放大到无穷，最大项独占全部概率 | 退化为 argmax（贪心解码），完全确定 |
| $T \\to 1$ | 不做缩放 | 模型原始分布 |
| $T \\to \\infty$ | 所有 $z_i/T \\to 0$，$p_i \\to 1/|V|$ | 均匀分布，完全随机 |

温度调的是**分布的形状**（尖锐 vs 平坦）。

top-p 调的是**保留的范围**：按概率从高到低累加，攒到 $p$ 就停，后面的全部置 0 再重归一化。

**二、top-p 与 top-k 的区别**

以 $T=1$ 的 $[0.700, 0.257, 0.043]$ 为例：

| 配置 | 保留 | 结果 |
| --- | --- | --- |
| top-k=2 | 固定前 2 个 | 不管分布多尖，永远留 2 个 |
| top-p=0.5 | 只留第 1 个（0.700 已超 0.5） | 分布尖锐时自动收紧 |
| top-p=0.9 | 留前 2 个（0.700+0.257=0.957） | 分布平坦时自动放宽 |

关键区别：**top-p 保留的个数随分布形状自适应**。分布很尖时它只留 1 个（不引入噪声），分布很平时它留几十个（保留多样性）。top-k 固定 k 个，两种情况下都会错——这是推理任务推荐 top-p 的原因。

**三、为什么高温不等于更聪明（实测证据）**

同一道中等题（$\\frac{3x-9}{2} = x+37$，正确 83），三个温度各采样 3 次：

| 温度 | 3 次答案 | 不同答案数 | 出现 83 的次数 |
| --- | --- | --- | --- |
| T=0 | 12 / 12 / 12 | 1 | 0 |
| T=0.8 | 13 / 7 / 14 | 3 | 0 |
| T=1.5 | 3 / 9 / 3 | 2 | **0** |

**三个温度下正确答案一次都没出现。** 温度提高只带来了「更多不同的错误答案」。

原因：温度只是在**已有的概率分布上重新分配质量**，它不能创造分布里原本概率极低的正确路径。模型的 28 层里没有「解这个方程」的能力，把分布调平只会让它更容易选中那些本来概率很低的错误 token。

直觉类比：手电筒的亮度是固定的。温度调的是光斑的散开程度——散得开只让你照到更多东西，不会让原本照不到的地方变亮。

**四、工程结论**

| 目标 | 该调什么 |
| --- | --- |
| 提升单次正确率 | CoT（c15-l1）——增加前向次数，不是调温度 |
| 让多次采样有差异 | 温度 0.7~0.8 + top-p 0.95 |
| 可复现 / 可审计 | T=0 + 固定 seed |
| 创意写作 | T=1.0~1.3（超过 1.5 会格式崩塌） |

温度与 CoT 是**配合**关系：CoT 提供值得采样的长输出，温度提供多样性，投票（c15-l3）再把多样性收敛成答案。单靠温度不解决任何正确性问题。`,
    rubric: [
      { point: '正确写出带温度 softmax 公式（是除以 T）', score: 2 },
      { point: '说清 T→0 退化为 argmax、T→∞ 趋于均匀', score: 2 },
      { point: '说清 top-p 按累积概率自适应截断、top-k 固定个数', score: 2 },
      { point: '用 T=0/0.8/1.5 三组实测数据证明温度不提升正确率', score: 2 },
      { point: '给出「温度给多样性、CoT 给能力」的分工结论', score: 1 },
    ],
    keywords: ['除以 T', 'argmax', '均匀分布', '累积概率', '自适应', '多样性', '83'],
    explanation:
      '最容易失分的地方是把 top-p 说成「保留 p% 的 token」——它不是按个数，是按累积概率。另一个失分点是只讲「高温更发散」而不给实测数据证明它没提升正确率。',
    tags: ['K', '温度', 'top-p'],
  },
  {
    id: 'llm-a1-c15-e18',
    relatedLessonId: 'llm-a1-c15-l2',
    type: 'single',
    difficulty: 3,
    question: '做 Best-of-N（c15-l4）时，如果把温度设成 0，会发生什么？',
    options: [
      { value: 'A', text: 'N 个候选会完全相同，选优退化成单次采样，白花 N 倍算力' },
      { value: 'B', text: 'N 个候选会更多样，选优效果更好' },
      { value: 'C', text: '模型会报错' },
      { value: 'D', text: '答案会自动变成正确答案' },
    ],
    answer: 'A',
    explanation:
      'T=0 是确定性的：同样的输入必然得到同样的输出。实测中等题 T=0 连跑 3 次都是 12/12/12。所以 Best-of-N 必须配 T=0.7~1.0，否则 N 个候选一模一样，打分器面对 N 个副本，选哪个都一样。',
    tags: ['D', 'Best-of-N', '温度'],
  },

  /* ═══════════════ l3：Self-consistency（难度 4，10 题）═══════════════ */
  {
    id: 'llm-a1-c15-e19',
    relatedLessonId: 'llm-a1-c15-l3',
    type: 'single',
    difficulty: 2,
    question: 'self-consistency（自洽性投票）的三步流程是？',
    options: [
      { value: 'A', text: '采样 N 个 → 打分选最高 → 输出' },
      { value: 'B', text: '采样 N 个 → 提取答案 → 多数投票' },
      { value: 'C', text: '采样 1 个 → 自我批评 → 重答' },
      { value: 'D', text: '采样 N 个 → 取第一个 → 输出' },
    ],
    answer: 'B',
    explanation:
      '三步：①高温采样 N 个（各自独立）；②从每个样本里提取答案（正则捞 `\\boxed{}`）；③统计频次取众数。A 是 Best-of-N（c15-l4），C 是自反思（c15-l4）。',
    tags: ['K', 'self-consistency', '流程'],
  },
  {
    id: 'llm-a1-c15-e20',
    relatedLessonId: 'llm-a1-c15-l3',
    type: 'single',
    difficulty: 3,
    question: '实测：中等题 T=0.8 采样 3 个样本，答案是 83 / 74 / 3。此时 self-consistency 的投票结果是？',
    options: [
      { value: 'A', text: '83，因为它是正确答案' },
      { value: 'B', text: '无众数——每个答案只出现一次，投票机制没有可投的东西' },
      { value: 'C', text: '3，因为它是最后一个生成的' },
      { value: 'D', text: '74，因为它出现了两次' },
    ],
    answer: 'B',
    explanation:
      '三个答案各出现 1 次，**无众数**。这是本节最重要的实测：投票不是「从错误中挑出正确」，而是「从多数中挑出答案」——当多数本身是错的、且错得各不相同，投票就只能瞎选。用 `Counter.most_common(1)` 会静默返回「按插入顺序的第一个」，看起来像答案，其实等价于随机。',
    tags: ['U', 'self-consistency', '实测'],
  },
  {
    id: 'llm-a1-c15-e21',
    relatedLessonId: 'llm-a1-c15-l3',
    type: 'judge',
    difficulty: 3,
    question: 'self-consistency 的样本数越多，正确率就一定越高。',
    answer: false,
    explanation:
      '边际收益递减，而且方向可能反。实测中等题从 3 样本加到 5 样本，答案从「83/74/3」变成「83/13/49/11/None」——不同答案数从 2 种变成 4 种，投票更没希望。多数票的置信度大致按 $\\sqrt{N}$ 增长，成本按 $N$ 线性增长。',
    tags: ['U', 'self-consistency', '边际收益'],
  },
  {
    id: 'llm-a1-c15-e22',
    relatedLessonId: 'llm-a1-c15-l3',
    type: 'judge',
    difficulty: 3,
    question: '实测中「简单题 T=0.7 采样 3 次得 42/42/42」与「中等题 T=0.8 采样 3 次得 83/74/3」这两组结果说明：模型能力不足时，多采样只会得到更多不同的错误答案。',
    answer: true,
    explanation:
      '这是本章最重要的教学点。简单题单次正确率接近 100%，三票一致、投票有效；中等题单次正确率约 1/3，三个样本给出三个不同答案，投票失效。同一套投票代码，两个题集，两个结果——差别只在模型能力。',
    tags: ['K', 'self-consistency', '实测'],
  },
  {
    id: 'llm-a1-c15-e23',
    relatedLessonId: 'llm-a1-c15-l3',
    type: 'fill',
    difficulty: 3,
    question:
      '规格基线的 5 样本口径：简单题（17+25，T=0.7）5 个样本投票结果是 ___（4/4 一致）；中等题（T=0.8）5 个样本是 83/13/49/11/None，即投票 ___（填「失效」或「有效」）。',
    blanks: [['42'], ['失效', '无效']],
    explanation:
      '简单题 42（4/4，1 个样本解析失败为 None）投票正确；中等题 5 个样本给出 4 个不同答案 + 1 个 None，全不一致，投票失效。注意样本数从 3 加到 5，只是让「不同的错误答案」从 2 种变成 4 种。',
    tags: ['K', 'self-consistency', '基线'],
  },
  {
    id: 'llm-a1-c15-e24',
    relatedLessonId: 'llm-a1-c15-l3',
    type: 'multiple',
    difficulty: 4,
    question: 'self-consistency 三个环节各自的失败模式，以下哪些描述正确？（多选）',
    options: [
      { value: 'A', text: '采样环节：温度太低，N 个样本完全相同，投票退化成单次采样' },
      { value: 'B', text: '提取环节：解析器捞不到 boxed，答案列表里一堆 None，有效样本数不足' },
      { value: 'C', text: '投票环节：所有答案各出现一次，无众数，结果等价于随机挑一个' },
      { value: 'D', text: '只要 N ≥ 5，三个环节的失败都不会发生' },
    ],
    answer: ['A', 'B', 'C'],
    explanation:
      'A/B/C 分别是采样、提取、投票三个环节的典型失败。实测中等题 3 样本（83/74/3）三个环节全中：温度 0.8 给了多样性（好），提取器正常工作（好），但投票无众数（坏）。D 错：加大 N 不能修复任何一个环节的问题，反而让票数更分散。',
    tags: ['U', 'self-consistency', '失败模式'],
  },
  {
    id: 'llm-a1-c15-e25',
    relatedLessonId: 'llm-a1-c15-l3',
    type: 'code',
    difficulty: 4,
    question:
      '实现一个健壮的多数投票器 `majority_vote(answers)`，返回 `(answer, confidence)` 二元组。要求：\n\n1. 过滤掉 `None` 和空字符串；\n2. 没有有效答案时返回 `(None, 0.0)`；\n3. **无众数**（所有有效答案各出现一次且种类数 > 1）时返回 `(None, 0.0)`——不能静默取第一个；\n4. **平票**（最高频次被多个答案共享）时返回 `(None, 0.0)`；\n5. 否则返回 `(众数, 众数频次 / 有效答案总数)`。',
    starterCode: `def majority_vote(answers):
    valid = [a for a in answers if a is not None and a != ""]
    if not valid:
        return (None, 0.0)

    counts = {}
    for a in valid:
        counts[a] = counts.get(a, 0) + 1

    top = max(counts.values())
    winners = [a for a, c in counts.items() if c == top]

    if len(winners) != 1:
        return (None, 0.0)
    if top == 1 and len(counts) > 1:
        return (None, 0.0)
    return (winners[0], top / len(valid))
`,
    setupCode: '',
    expectedOutput: '简单题 3 票一致返回 ("42", 1.0)；中等题 83/74/3 返回 (None, 0.0)',
    tests: `# ── 实测 A 组：简单题 3 票一致 ──
assert majority_vote(["42", "42", "42"]) == ("42", 1.0)

# ── 实测 B 组：中等题 83/74/3，无众数 ──
assert majority_vote(["83", "74", "3"]) == (None, 0.0)

# ── 5 样本基线：简单题 42×4 + None ──
a, c = majority_vote(["42", "42", "42", "42", None])
assert a == "42", a
assert abs(c - 1.0) < 1e-9, c   # 4/4 有效票

# ── 5 样本基线：中等题全不一致 ──
assert majority_vote(["83", "13", "49", "11", None]) == (None, 0.0)

# ── 平票：两票对两票 ──
assert majority_vote(["83", "83", "74", "74"]) == (None, 0.0)

# ── 空输入 / 全 None ──
assert majority_vote([]) == (None, 0.0)
assert majority_vote([None, None]) == (None, 0.0)
assert majority_vote(["", ""]) == (None, 0.0)

# ── 有明确多数 ──
a, c = majority_vote(["83", "83", "74"])
assert a == "83" and abs(c - 2 / 3) < 1e-9, (a, c)

# ── 单个答案 ──
assert majority_vote(["83"]) == ("83", 1.0)

# ── 过滤 None 后形成多数（4 有效票里 3 票一致）──
a, c = majority_vote(["83", "83", "83", "74", None])
assert a == "83" and abs(c - 0.75) < 1e-9, (a, c)
`,
    answer: `def majority_vote(answers):
    valid = [a for a in answers if a is not None and a != ""]
    if not valid:
        return (None, 0.0)

    counts = {}
    for a in valid:
        counts[a] = counts.get(a, 0) + 1

    top = max(counts.values())
    winners = [a for a, c in counts.items() if c == top]

    if len(winners) != 1:
        return (None, 0.0)
    if top == 1 and len(counts) > 1:
        return (None, 0.0)
    return (winners[0], top / len(valid))`,
    explanation:
      '```python\nif len(winners) != 1:      # 平票 → 承认失败\n    return (None, 0.0)\nif top == 1 and len(counts) > 1:   # 无众数 → 承认失败\n    return (None, 0.0)\nreturn (winners[0], top / len(valid))\n```\n\n**为什么必须返回 None**：实测 B 组 83/74/3 各一票，用 `Counter.most_common(1)` 会静默返回「按插入顺序的第一个」——换个实现顺序就选中 74 或 3。生产环境里这会变成一个看起来像答案的随机值，比直接报错更危险。\n\n**置信度的分母是有效票数**（过滤 None 之后），不是原始样本数——否则 `["42","42","42","42",None]` 会算出 0.8 而不是 1.0。',
    tags: ['D', '编程', 'self-consistency'],
  },
  {
    id: 'llm-a1-c15-e26',
    relatedLessonId: 'llm-a1-c15-l3',
    type: 'code',
    difficulty: 4,
    question:
      '实现 `vote_is_reliable(answers)`，判断这组答案的投票结果**是否可信**。返回 `True` / `False`。\n\n判定规则：\n1. 过滤 `None` 与空串；\n2. 有效答案数 < 3 → 不可信；\n3. 最高频次 / 有效答案数 < 0.6 → 不可信（票数太散）；\n4. 最高频次的答案必须唯一（平票 → 不可信）；\n5. 其余情况可信。',
    starterCode: `def vote_is_reliable(answers):
    valid = [a for a in answers if a is not None and a != ""]
    if len(valid) < 3:
        return ___

    counts = {}
    for a in valid:
        counts[a] = counts.get(a, 0) + 1

    top = max(counts.values())
    if len([a for a, c in counts.items() if c == top]) != 1:
        return ___
    if ___:
        return False
    return True
`,
    setupCode: '',
    expectedOutput: '42/42/42 → True；83/74/3 → False',
    tests: `# 实测 A 组：3 票一致，可信
assert vote_is_reliable(["42", "42", "42"]) is True

# 实测 B 组：83/74/3，无众数
assert vote_is_reliable(["83", "74", "3"]) is False

# 5 样本基线：42×4 + None → 4/4 = 1.0，可信
assert vote_is_reliable(["42", "42", "42", "42", None]) is True

# 5 样本基线：全不一致
assert vote_is_reliable(["83", "13", "49", "11", None]) is False

# 有效票不足
assert vote_is_reliable(["42", "42"]) is False
assert vote_is_reliable([None, None, None]) is False

# 票数太散：2/5 = 0.4 < 0.6
assert vote_is_reliable(["83", "83", "74", "3", "9"]) is False

# 恰好 0.6：3/5，可信（用 >= 而非 >）
assert vote_is_reliable(["83", "83", "83", "74", "3"]) is True

# 平票：2/4 最高频次被两个答案共享
assert vote_is_reliable(["83", "83", "74", "74"]) is False

# 全部相同（含 None 被过滤）
assert vote_is_reliable(["83", "83", "83", None, ""]) is True
`,
    answer: `def vote_is_reliable(answers):
    valid = [a for a in answers if a is not None and a != ""]
    if len(valid) < 3:
        return False

    counts = {}
    for a in valid:
        counts[a] = counts.get(a, 0) + 1

    top = max(counts.values())
    if len([a for a, c in counts.items() if c == top]) != 1:
        return False
    if top / len(valid) < 0.6:
        return False
    return True`,
    explanation:
      '```python\nif len(valid) < 3:\n    return False                      # 样本太少\nif len([a for a, c in counts.items() if c == top]) != 1:\n    return False                      # 平票\nif top / len(valid) < 0.6:\n    return False                      # 票数太散\nreturn True\n```\n\n**这就是「先测再投票」的工程化版本**：不是问「N 取多少」，而是问「这一组的投票结果值不值得信」。实测 B 组（83/74/3）在第 2 关就返回 False——正好对应正文里「投票失效」的结论。\n\n注意 `top / len(valid)` 用的是有效票数作分母，`None` 不算票。',
    tags: ['D', '编程', 'self-consistency'],
  },
  {
    id: 'llm-a1-c15-e27',
    relatedLessonId: 'llm-a1-c15-l3',
    type: 'open',
    difficulty: 4,
    question:
      '本课程实测了两组 self-consistency 结果：简单题 3 样本得 42/42/42（投票正确），中等题 3 样本得 83/74/3（投票失效）。请解释为什么同一套投票代码在两个题集上结果截然不同，并给出一个可操作的判据，让工程师能事先判断「这个题集该不该上投票」。',
    referenceAnswer: `**一、两组实测数据**

| 组 | 题目 | 温度 | 3 个样本的答案 | 不同答案数 | 投票结果 |
| --- | --- | --- | --- | --- | --- |
| A | $17+25$（简单） | 0.7 | 42 / 42 / 42 | 1 | 42（3/3）✓ |
| B | $\\frac{3x-9}{2}=x+37$（中等） | 0.8 | 83 / 74 / 3 | 3 | 无众数 ✗ |

5 样本口径下结论相同：A 组 42（4/4 有效票）✓；B 组 83/13/49/11/None，全不一致 ✗。

**二、为什么结果截然不同**

投票的数学前提是：**正确答案的出现次数严格多于任何一个错误答案**。

设模型单次正确率为 $p$，错误答案分散在 $M$ 个不同的值上。投票有效的粗略条件是：

$$p > \\frac{1}{M+1}$$

- A 组：$p \\approx 1$（模型对简单题几乎必对），三票必然全落在 42 上，投票当然有效；
- B 组：$p \\approx 1/3$（3 个样本只有 1 个对），而错误答案有 2 种，$1/3 < 1/3$ 的边界——正确答案没有任何数量优势，投票结果就是噪声。

**关键机制**：模型在能力边界附近时，随机性会让推理链从中间某个随机点开始跑偏，落到**各自不同**的错误答案上。错误答案越分散，投票越不可能选对——这和第 2 章讲的集成学习完全相反（集成的前提是各学习器独立且各自优于随机）。

一句话总结：**投票不是「从错误中挑出正确」，而是「从多数中挑出答案」。当多数本身是错的、且错得各不相同，投票就只能瞎选。**

**三、可操作的判据**

工程上按这个顺序做：

1. **先测单次正确率** $p$：固定 T=0，在同一题集上跑（建议 ≥ 30 题），得到 $p$；
2. **估计错误答案分散度** $M$：在 T=0.8 下对错题各采样 3-5 次，统计「错误答案有几种」；
3. **判据**：若 $p < \\frac{1}{M+1}$，**不要上投票**——去改 prompt（CoT）、换更大模型，或走 c16 的训练路线；
4. **若 $p \\geq 0.7$**：可以上 N=3 的投票，先小规模验证；
5. **若 $p \\geq 0.9$**：投票收益有限，直接 T=0 更省钱。

**四、运行时的兜底检查**

即使事先判据通过，运行时也要检查：投票结果是否「无众数」或「平票」。若是，必须显式返回 None 而不是静默取 \`max()\`——否则你会得到一个看起来像答案的随机值。实测 B 组的 83/74/3，用 \`Counter.most_common(1)\` 会按插入顺序返回 83，换实现顺序就变成 74 或 3。

**五、这笔账怎么算**

投票的成本是 $N$ 倍 token。实测 B 组 3 样本花了 409 token，得到的却是随机值——**负收益**。A 组 3 样本 258 token 全对，但单次采样本来也全对，收益同样是 0。这说明：**在这两个题集上，投票都不划算**。真正划算的场景是「$p$ 在 0.7~0.9 之间，且错误答案比较集中」——只有那里，投票才能用 $N$ 倍成本换到稳定的几个百分点。`,
    rubric: [
      { point: '准确复述两组实测数据（42/42/42 与 83/74/3）', score: 2 },
      { point: '指出投票有效的数学前提是 p > 1/(M+1)', score: 3 },
      { point: '解释「能力边界附近错误答案分散」这一机制', score: 2 },
      { point: '给出可操作的四步判据（先测 p、再测 M、再决定）', score: 2 },
      { point: '指出运行时必须处理无众数/平票，不能静默取 max', score: 1 },
    ],
    keywords: ['无众数', 'p > 1/(M+1)', '单次正确率', '错误答案分散', '42', '83', '74'],
    explanation:
      '这道题的核心是「把失败讲清楚」。只讲成功案例（42/42/42）是不合格的——必须解释 83/74/3 为什么失效，并把它转成一个可执行的判据。',
    tags: ['K', 'self-consistency', '综合'],
  },
  {
    id: 'llm-a1-c15-e28',
    relatedLessonId: 'llm-a1-c15-l3',
    type: 'single',
    difficulty: 4,
    question: '关于 pass@k 与 self-consistency 的区别，以下哪个说法正确？',
    options: [
      { value: 'A', text: '两者完全等价，只是名字不同' },
      { value: 'B', text: 'pass@k 只要求 N 个样本里有 1 个对就算成功；self-consistency 要求多数票对。实测 B 组（含 83）pass@3 会成功，投票会失败' },
      { value: 'C', text: 'self-consistency 比 pass@k 更宽松' },
      { value: 'D', text: 'pass@k 只能用于代码任务' },
    ],
    answer: 'B',
    explanation:
      '这是评测口径的经典混淆。实测 B 组 83/74/3 里有一个正确答案：pass@3 = 1/1 = 100%（只要有一个对就算过）；self-consistency = 无众数 = 失败。**同一个实验，两个指标给出相反结论。** 评测口径选错，会得出完全错误的工程决策。',
    tags: ['U', '评测', 'pass@k'],
  },

  /* ═══════════════ l4：Best-of-N 与自反思（难度 4，10 题）═══════════════ */
  {
    id: 'llm-a1-c15-e29',
    relatedLessonId: 'llm-a1-c15-l4',
    type: 'single',
    difficulty: 2,
    question: 'Best-of-N 与 self-consistency 的核心区别是？',
    options: [
      { value: 'A', text: 'Best-of-N 选众数（要求多数对），self-consistency 选最优（要求打分器准）' },
      { value: 'B', text: 'Best-of-N 用打分器选最优（要求打分器准），self-consistency 选众数（要求多数对）' },
      { value: 'C', text: '两者都需要打分器' },
      { value: 'D', text: 'Best-of-N 不需要采样多个候选' },
    ],
    answer: 'B',
    explanation:
      '投票选「众数」，依赖「群体正确率」；Best-of-N 选「最优」，依赖「验证器质量」。Best-of-N 更强（不要求正确答案占多数），但引入了新依赖：打分器本身可能错。可验证任务（数学、代码）用 Best-of-N 更强，开放问答投票更稳。',
    tags: ['K', 'Best-of-N', '对比'],
  },
  {
    id: 'llm-a1-c15-e30',
    relatedLessonId: 'llm-a1-c15-l4',
    type: 'single',
    difficulty: 3,
    question: '实测：3 个候选的答案分别是 9 / 76 / 76，平均 logprob 分别是 +0.000 / -0.008 / -0.037，启发式打分全为 1.00。这说明什么？',
    options: [
      { value: 'A', text: '平均 logprob 能准确反映答案正确性' },
      { value: 'B', text: '三个候选全部接近 100% 置信度，但答案全错；打分器无区分度，max() 只是按顺序返回第一个' },
      { value: 'C', text: 'Best-of-N 一定比单次采样差' },
      { value: 'D', text: '温度 0.8 太低，应该用 2.0' },
    ],
    answer: 'B',
    explanation:
      '局部置信度推不出全局正确性——一条从头就错但错得很「顺」的推理链，每步 logprob 都可以很高。三个候选打分相同（都缺格式分 1.0，都拿到形态分 0.5 + 置信分 0.5 = 1.00），打分器给不出任何区分度。而且正确答案 83 根本不在候选里——这是三重失败叠加。',
    tags: ['U', 'Best-of-N', 'logprob'],
  },
  {
    id: 'llm-a1-c15-e31',
    relatedLessonId: 'llm-a1-c15-l4',
    type: 'judge',
    difficulty: 3,
    question: '实测：自反思（critique → revise）在第 1 轮已经答对（83）的情况下，第 2 轮把答案改成了 None。这说明自反思在「已经答对」时会引入风险。',
    answer: true,
    explanation:
      '实测数据：第 1 轮 83（109 token，11.3 秒）→ 批评环节只输出「OK.」（3 token）→ 第 2 轮 None（120 token，12.8 秒，被截断）。三重原因：①批评说 OK 时没有新信息 ②重写改变了 prompt 结构把模型推离正确路径 ③第 2 轮 120 token 预算不足以走完 CoT。',
    tags: ['U', '自反思', '实测'],
  },
  {
    id: 'llm-a1-c15-e32',
    relatedLessonId: 'llm-a1-c15-l4',
    type: 'judge',
    difficulty: 3,
    question: '自反思循环应该返回「最后一轮」的答案，因为后面的轮次总是更好。',
    answer: false,
    explanation:
      '错，而且方向正好相反。实测第 1 轮 83（对）→ 第 2 轮 None（错）。正确做法是**保留历史最优**：每轮都打分，最后返回分数最高的那一轮，而不是最后一轮。另外循环必须设上限（轮数 + 总 token），否则线上会烧掉大量配额且越往后越差。',
    tags: ['U', '自反思', '工程'],
  },
  {
    id: 'llm-a1-c15-e33',
    relatedLessonId: 'llm-a1-c15-l4',
    type: 'fill',
    difficulty: 3,
    question:
      '打分器谱系从弱到强大致是：启发式规则 → 平均 ___ → ORM（结果奖励模型）→ PRM（___ 奖励模型）→ 可验证奖励。',
    blanks: [['logprob', 'logprob 值', '对数概率'], ['过程', '逐步']],
    explanation:
      '启发式规则（格式 + 长度 + 置信度）成本几乎为 0 但准确度低；平均 logprob 相关性弱；ORM 给整段回答打分；PRM 逐步给推理链打分（Lightman et al. 2023）；可验证奖励用规则真的验算答案，准确度最高但要求任务可验证。',
    tags: ['K', '打分器', '谱系'],
  },
  {
    id: 'llm-a1-c15-e34',
    relatedLessonId: 'llm-a1-c15-l4',
    type: 'multiple',
    difficulty: 4,
    question: 'Best-of-N 的三个独立失败点是什么？（多选）',
    options: [
      { value: 'A', text: '采样环节：正确的候选根本不在 N 个里面' },
      { value: 'B', text: '打分环节：打分器给不出区分度（所有候选同分）' },
      { value: 'C', text: '打分环节：打分器偏向错误特征（如偏好确信而非正确）' },
      { value: 'D', text: '温度太低导致 N 个候选完全相同（这是采样环节的一个具体表现）' },
    ],
    answer: ['A', 'B', 'C', 'D'],
    explanation:
      '四项都对。A 是采样的根本限制（再准的打分器也救不了）；B 是本节实测（三个候选全 1.00 分）；C 是打分器的系统偏见（实测里答 85 的候选因置信度高而可能压过答 83 的）；D 是 A 的一个具体成因——T=0 时 N 个候选一模一样。',
    tags: ['U', 'Best-of-N', '失败模式'],
  },
  {
    id: 'llm-a1-c15-e35',
    relatedLessonId: 'llm-a1-c15-l4',
    type: 'multiple',
    difficulty: 4,
    question: '自反思（critique → revise）在什么条件下更可能有效？（多选）',
    options: [
      { value: 'A', text: '第 1 轮确实答错了，有改进空间' },
      { value: 'B', text: '批评环节能给出**具体**的错误位置（如「第 2 步移项符号错了」）' },
      { value: 'C', text: '第 2 轮的 token 预算充足，不会在中途被截断' },
      { value: 'D', text: '批评来自外部验证器（可执行测试、规则验算）而非模型自评' },
    ],
    answer: ['A', 'B', 'C', 'D'],
    explanation:
      '四项都是有效条件。核心洞察：**自反思的有效性完全取决于批评的质量**。如果批评来自真正能判断对错的验证器（SymPy 判等、单元测试），critique → revise 可靠；如果批评来自模型自己，就是「让学生自己批改自己的卷子」——他要是能批对，当初就不会做错。实测的反例正是 B 缺失（批评只说「OK.」）+ C 不满足（120 token 截断）。',
    tags: ['K', '自反思', '条件'],
  },
  {
    id: 'llm-a1-c15-e36',
    relatedLessonId: 'llm-a1-c15-l4',
    type: 'code',
    difficulty: 4,
    question:
      '实现 Best-of-N 的选优函数 `select_best(candidates)`，返回 `(index, score)`。每个候选是 dict，含 `ans`（答案字符串或 None）、`boxed`（bool）、`avg_logp`（float）。\n\n打分规则（满分 2.0）：\n- 有 `boxed` 加 1.0；\n- `ans` 非空且长度 ≤ 4 加 0.5；\n- 置信分：`avg_logp` 加 1.0，再裁剪到 `[0, 0.5]`。\n\n选优规则：取最高分；**若所有候选同分**，返回 `(-1, score)` 表示「打分器无区分度，拒绝选择」。',
    starterCode: `def score_candidate(c):
    s = 0.0
    if c["boxed"]:
        s += ___
    if c["ans"] and len(c["ans"]) <= 4:
        s += ___
    conf = max(0.0, min(0.5, c["avg_logp"] + 1.0))
    return round(s + conf, 2)


def select_best(candidates):
    scores = [score_candidate(c) for c in candidates]
    best = max(scores)
    if len(scores) > 1 and ___:      # 多个候选全同分 → 打分器无区分度
        return (-1, best)
    return (scores.index(best), best)
`,
    setupCode: '',
    expectedOutput: '实测候选组（9/76/76，打分全 1.00）返回 (-1, 1.0)',
    tests: `def mk(ans, boxed, lp):
    return {"ans": ans, "boxed": boxed, "avg_logp": lp}

# ── 实测组：9/76/76，logprob +0.000/-0.008/-0.037，全 1.00 分 ──
group = [mk("9", False, 0.000), mk("76", False, -0.008), mk("76", False, -0.037)]
idx, sc = select_best(group)
assert (idx, sc) == (-1, 1.0), (idx, sc)

# ── 有区分度：正确答案格式合规，应该被选中 ──
good = [mk("85", True, -0.010), mk("83", True, -0.240), mk(None, False, 0.0)]
idx, sc = select_best(good)
assert idx == 0, (idx, sc)          # 85 置信度高，打分器偏好「确信」而非「正确」

# ── 格式分是硬门槛：正确但没 boxed 的拿不到 1.0 ──
fmt = [mk("83", False, -0.300), mk("85", True, -0.010)]
idx, _ = select_best(fmt)
assert idx == 1

# ── 单个候选 ──
assert select_best([mk("83", True, 0.0)]) == (0, 2.0)

# ── 空列表 ──
try:
    select_best([])
    raise AssertionError("空列表应抛异常")
except (ValueError, IndexError):
    pass

# ── 打分细节校验 ──
assert score_candidate(mk("83", True, 0.0)) == 2.0
assert score_candidate(mk("83", False, 0.0)) == 1.0   # 缺格式分 1.0
assert score_candidate(mk("x = 83", True, 0.0)) == 1.5  # 长度 6 > 4，丢掉形态分
assert score_candidate(mk("x=83", True, 0.0)) == 2.0   # len("x=83")==4，仍算「短小」
assert score_candidate(mk(None, False, -5.0)) == 0.0
`,
    answer: `def score_candidate(c):
    s = 0.0
    if c["boxed"]:
        s += 1.0
    if c["ans"] and len(c["ans"]) <= 4:
        s += 0.5
    conf = max(0.0, min(0.5, c["avg_logp"] + 1.0))
    return round(s + conf, 2)


def select_best(candidates):
    scores = [score_candidate(c) for c in candidates]
    best = max(scores)
    if len(scores) > 1 and len(set(scores)) == 1:
        return (-1, best)
    return (scores.index(best), best)`,
    explanation:
      '```python\nif len(set(scores)) == 1:      # 全同分 → 打分器无信号\n    return (-1, best)\nreturn (scores.index(best), best)\n```\n\n**这一行 `len(set(scores)) == 1` 是本节的核心**：实测组三个候选全 1.00 分，`max()` 会按顺序返回索引 0（答案 9，错）。显式拒绝选择，比静默返回一个随机候选诚实得多。\n\n注意测试里 `good` 那组的结果：答 85（错）因置信度高（-0.010）压过了答 83（对，置信度 -0.240）。这就是打分器的系统偏见——它偏好「确信」而非「正确」。',
    tags: ['D', '编程', 'Best-of-N'],
  },
  {
    id: 'llm-a1-c15-e37',
    relatedLessonId: 'llm-a1-c15-l4',
    type: 'open',
    difficulty: 4,
    question:
      '请对比 self-consistency（投票）与 Best-of-N（打分选优）两种方法：说明各自的依赖前提、失败模式，并解释为什么本课程认为「Best-of-N 的升级路径是把可验证奖励用来训练而不是用来选择」。',
    referenceAnswer: `**一、两种方法的流程与依赖**

| 维度 | self-consistency | Best-of-N |
| --- | --- | --- |
| 流程 | 采样 N 个 → 提取答案 → 多数投票 | 采样 N 个 → 打分器打分 → 取最高 |
| 选择依据 | 众数（出现次数） | 分数（质量估计） |
| 依赖前提 | **多数样本已经对了** | **打分器能识别正确** |
| 需要的额外组件 | 无 | 打分器（启发式 / logprob / ORM / PRM / 可验证奖励） |
| 不要求 | 正确答案在候选里（只要占多数即可） | 正确答案占多数（只要在候选里且能被识别） |

关键差别：投票不需要「知道对错」，只需要「数票」；Best-of-N 需要「知道对错」，但不要求正确答案占多数。所以 Best-of-N 理论更强，代价是引入了打分器这个新的失败点。

**二、各自的失败模式**

**self-consistency 的三种失败**：

1. 温度太低 → N 个样本完全相同，投票退化成单次采样；
2. 提取失败 → 解析器捞不到 boxed，有效票不足；
3. 无众数 → 所有答案各出现一次，投票等价于随机。

本课程实测的第 3 种：中等题 83/74/3，三个答案各 1 票。用 \`Counter.most_common(1)\` 会静默返回「按插入顺序的第一个」——看起来像答案，其实等价于抛硬币。

**Best-of-N 的三种失败**：

1. 采样失败 → 正确的候选根本不在 N 个里面（**再准的打分器也救不了**）；
2. 打分器无区分度 → 所有候选同分，\`max()\` 只是按顺序取第一个；
3. 打分器偏向错误特征 → 主动选中错的那个。

本课程实测同时中了第 1 和第 2 种：3 个候选答案 9/76/76，平均 logprob +0.000/-0.008/-0.037（置信度全接近 100%），启发式打分全 1.00，正确答案 83 不在候选里。

**三、为什么平均 logprob 不能当正确性用**

实测反例：三个候选的平均 logprob 全部接近 0（即接近 100% 置信度），而答案全错。

原因：模型是自回归地确信**每一步**，而每一步的局部概率高，不等于整条推理链正确。一条从头就错但错得很「顺」的推理链，每步的 logprob 都可以很高。**局部置信度推不出全局正确性。**

**四、为什么升级路径是「用奖励来训练」而不是「用奖励来选择」**

Best-of-N 的根本浪费在于：它每次推理都要采样 N 次、打分 N 次，然后**只保留 1 个**。那 N-1 个候选（包括其中正确的那些）被直接丢弃了——信息被扔掉了。

而如果把可验证奖励用来**训练**（c16 的 GRPO），同样的 N 个候选会变成 N 条训练信号：

| 维度 | Best-of-N（用来选） | GRPO（用来训） |
| --- | --- | --- |
| 每次推理成本 | N 倍（永久） | 1 倍（训练完成后） |
| 对 N 个候选的利用 | 只留 1 个 | 全部转成梯度信号 |
| 提升的持久性 | 仅当次 | 写进权重，永久 |
| 需要 | 打分器（推理时可用） | 可验证奖励（训练时） |

一句话：**Best-of-N 用 N 倍推理成本换一次正确答案；GRPO 用一次训练成本换永久能力提升。** 前者是「花钱买答案」，后者是「花钱买能力」。

**五、什么时候还是该用 Best-of-N**

并非所有场景都能训：

- 任务不可验证（开放问答、创意写作）→ 没有可靠奖励，只能投票或 Best-of-N；
- 不能改模型（调用第三方 API）→ 只能用推理时方法；
- 需求量小、训练不划算 → N 倍推理成本可能比训练更便宜；
- 需要快速验证「这个模型到底能不能做这个任务」→ Best-of-N 的 pass@N 是最快的探针。

结论：**推理时扩展（c15）和训练时扩展（c16）不是替代关系，而是同一条能力曲线的两个工作点。** 先用手工方法验证「这个任务模型有潜力」，再用训练把潜力固化下来。`,
    rubric: [
      { point: '准确对比两者的依赖前提（多数对 vs 打分器准）', score: 2 },
      { point: '列出各自的失败模式，并用实测数据佐证', score: 3 },
      { point: '解释平均 logprob 为什么不能当正确性用', score: 2 },
      { point: '说明 Best-of-N 浪费 N-1 个候选、GRPO 把 N 个都转成梯度', score: 2 },
      { point: '给出「什么时候仍该用 Best-of-N」的边界条件', score: 1 },
    ],
    keywords: ['众数', '打分器', '局部置信度', '全局正确性', 'N-1 个候选', 'GRPO', '永久'],
    explanation:
      '这道题把 c15 和 c16 接起来。核心是最后那个对比：Best-of-N 是「花钱买答案」，GRPO 是「花钱买能力」——前者成本永久、后者成本一次性。',
    tags: ['K', 'Best-of-N', '综合'],
  },
  {
    id: 'llm-a1-c15-e38',
    relatedLessonId: 'llm-a1-c15-l4',
    type: 'single',
    difficulty: 4,
    question: '为什么本课程说「Best-of-N 的升级路径是把可验证奖励用来训练，而不是用来选择」？',
    options: [
      { value: 'A', text: '因为训练比推理更快' },
      { value: 'B', text: '因为 Best-of-N 每次推理都要花 N 倍成本却只保留 1 个候选，而 GRPO 把 N 个候选全部转成梯度信号，能力写进权重后推理只需 1 倍成本' },
      { value: 'C', text: '因为 Best-of-N 的数学是错的' },
      { value: 'D', text: '因为可验证奖励只能用于训练' },
    ],
    answer: 'B',
    explanation:
      'Best-of-N 用 N 倍推理成本换一次正确答案，那 N-1 个候选（包括其中正确的）被直接丢弃——信息被浪费。GRPO 用同样的 N 个候选算出组内相对优势，全部转成梯度，训练完成后推理只需 1 倍成本。前者「花钱买答案」（成本永久），后者「花钱买能力」（成本一次性）。',
    tags: ['K', 'Best-of-N', 'GRPO'],
  },
];
