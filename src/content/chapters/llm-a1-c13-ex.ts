import type { Exercise } from '../../types';

/* ============================================================
 *  c13 习题：难度 2 / 3 / 3 / 3 → 8 / 10 / 10 / 10，共 38 题
 *
 *  设计原则：
 *  - code 题一律不 import torch，走 Pyodide 秒级完成（参数账、解析器都是纯 Python）；
 *  - 所有数字与正文、demo 实测一致（596.0 M / 28 层 / 151936 词表 / 12 vs 83 / 48 vs 240 token）。
 * ============================================================ */

export const llmA1C13Exercises: Exercise[] = [
  /* ─────────────── l1：推理不是预测（难度 2，8 题）─────────────── */
  {
    id: 'llm-a1-c13-e1',
    relatedLessonId: 'llm-a1-c13-l1',
    type: 'single',
    difficulty: 1,
    question: 'base 语言模型的训练目标是什么？',
    options: [
      { value: 'A', text: '最大化「答对题目」的概率' },
      { value: 'B', text: '最大化训练语料中下一个 token 的条件似然' },
      { value: 'C', text: '最小化推理过程与标准答案之间的编辑距离' },
      { value: 'D', text: '最大化人类对回答的偏好打分' },
    ],
    answer: 'B',
    explanation:
      '自回归语言模型只优化 $\\sum_t \\log P(x_t \\mid x_{<t})$。这个目标里没有「答对」这一项——它只要求预测得像语料里的下一个词。所以 base 模型在模仿格式，不是求解问题。D 是 RLHF 的目标，那是后训练阶段的事。',
    tags: ['base 模型', '训练目标'],
  },
  {
    id: 'llm-a1-c13-e2',
    relatedLessonId: 'llm-a1-c13-l1',
    type: 'single',
    difficulty: 2,
    question:
      '本站实测：同一道「Half the value of $3x-9$ is $x+37$」，48 token 预算时抽不到答案，240 token 预算时答对 83。最直接的解释是？',
    options: [
      { value: 'A', text: '240 token 时模型被切换到了更大的权重' },
      { value: 'B', text: 'token 预算决定可用的计算量，48 token 时推理还没展开就被截断' },
      { value: 'C', text: '48 token 时温度参数被自动调高了' },
      { value: 'D', text: '240 token 时模型开启了联网检索' },
    ],
    answer: 'B',
    explanation:
      '自回归生成每多一个 token 就多一次完整前向，所以 token 预算就是计算预算。48 token 时模型只写完「设方程」这一步，连 \\boxed{} 都没输出；240 token 时它走完五步自己吐出结束符（实测只生成 195 个）。权重、温度都没变。',
    tags: ['token 预算', '实测'],
  },
  {
    id: 'llm-a1-c13-e3',
    relatedLessonId: 'llm-a1-c13-l1',
    type: 'judge',
    difficulty: 2,
    question: 'base 模型答错时，它的输出语气通常会和答对时明显不同，因此可以从语气判断答案是否可靠。',
    answer: false,
    explanation:
      '错。base 模型的训练目标里没有置信度校准这一项，所以答错和答对的输出分布长得几乎一样。实测它答 12（错）时照样写「So, the answer is 12」并加粗 Final Answer。这正是必须有独立判分器（c14）的原因——不能靠模型自己的语气。',
    tags: ['base 模型', '误区'],
  },
  {
    id: 'llm-a1-c13-e4',
    relatedLessonId: 'llm-a1-c13-l1',
    type: 'judge',
    difficulty: 2,
    question: 'CoT（思维链）有效的机制之一是：中间结果被写成 token 后，成为后续位置可以注意到的上下文。',
    answer: true,
    explanation:
      '对。Transformer 的注意力只能看到上下文里已有的 token。中间结果如果只存在于隐状态里，下一步无法可靠取用；一旦写成 token，任何后续位置都能注意到。所以 CoT 本质是把串行计算外化到序列维度，代价是 token 数与延迟。',
    tags: ['CoT', '机制'],
  },
  {
    id: 'llm-a1-c13-e5',
    relatedLessonId: 'llm-a1-c13-l1',
    type: 'fill',
    difficulty: 2,
    question:
      '本站实测 Qwen3-0.6B 在四道题上的表现：$17+25$ 答 ____、$12\\times 4$ 答 ____、$100-37$ 答 ____（三题全对）；而「Half the value of $3x-9$ is $x+37$」答 ____（错，正确答案 83）。',
    blanks: [['42'], ['48'], ['63'], ['12']],
    explanation:
      '前三题都是一步就能出结果的题，base 的固定计算量够用；第四题需要五步串行运算（去分母、移项、合并、求解、代回），而 base 只肯做一次前向，于是靠模式匹配猜了 12。加 CoT 后答 83。',
    tags: ['实测', 'base 模型'],
  },
  {
    id: 'llm-a1-c13-e6',
    relatedLessonId: 'llm-a1-c13-l1',
    type: 'multiple',
    difficulty: 2,
    question: '下面哪些说法正确？（多选）',
    options: [
      { value: 'A', text: 'base 模型每生成一个 token 都要跑一次完整的前向' },
      { value: 'B', text: '题目越难，base 模型单次前向的计算量会自动变大' },
      { value: 'C', text: 'CoT 的效果受 token 预算限制：预算不够时思考会被截断' },
      { value: 'D', text: '即使模型能力不足，CoT 也总能通过延长思考把答案纠正过来' },
    ],
    answer: ['A', 'C'],
    explanation:
      'B 错：单次前向的计算量由结构决定（28 层 × 1024 维），与题目难度无关——这正是「答得快但答错」的根源。D 错：CoT 只在「模型具备该能力、但默认不展开」时有效；能力不足时写再多也只是把错误摊开（c15-l3 有投票失效的实测）。',
    tags: ['base 模型', 'CoT'],
  },
  {
    id: 'llm-a1-c13-e7',
    relatedLessonId: 'llm-a1-c13-l1',
    type: 'code',
    difficulty: 3,
    question:
      '实现 `token_budget_cost(prompt_tokens, budget_list, tok_per_sec)`：给定 prompt 的 token 数、一组候选生成预算、以及实测速度（token/s），返回每个预算下的预计总 token 数与预计耗时（秒，保留 2 位小数）的列表。\n\n返回形如 `[(budget, total_tokens, seconds), ...]`。\n\n例：`token_budget_cost(20, [48, 240], 9.0)` → 第一个元素 `(48, 68, 7.56)`。',
    starterCode: `def token_budget_cost(prompt_tokens, budget_list, tok_per_sec):
    pass


print(token_budget_cost(20, [48, 240], 9.0))`,
    expectedOutput: '[(48, 68, 7.56), (240, 260, 28.89)]',
    tests: `r = token_budget_cost(20, [48, 240], 9.0)
assert len(r) == 2, f"应返回 2 项，实际 {len(r)}"
assert r[0][0] == 48 and r[0][1] == 68, f"第一项错：{r[0]}"
assert abs(r[0][2] - 7.56) < 0.01, f"耗时应为 7.56，实际 {r[0][2]}"
assert r[1][1] == 260, f"第二项 token 数应为 260，实际 {r[1][1]}"
assert abs(r[1][2] - 28.89) < 0.01, f"耗时应为 28.89，实际 {r[1][2]}"
# 预算越大，耗时越长（单调）
assert r[1][2] > r[0][2], "预算增大后耗时应增加"
# 速度翻倍则耗时减半
r2 = token_budget_cost(20, [48], 18.0)
assert abs(r2[0][2] - 3.78) < 0.01, f"速度翻倍后应为 3.78，实际 {r2[0][2]}"
`,
    answer: `def token_budget_cost(prompt_tokens, budget_list, tok_per_sec):
    out = []
    for b in budget_list:
        total = prompt_tokens + b
        out.append((b, total, round(total / tok_per_sec, 2)))
    return out


print(token_budget_cost(20, [48, 240], 9.0))`,
    explanation:
      '```python\nfor b in budget_list:\n    total = prompt_tokens + b\n    out.append((b, total, round(total / tok_per_sec, 2)))\n```\n\n**注意 prompt 也要算进去**：prefill 阶段同样要跑一次前向。这道题是「token 预算 = 计算预算」的最简量化模型——它解释了为什么「让模型多想」直接等于「多花钱、多等」。',
    tags: ['编程', 'token 预算'],
  },
  {
    id: 'llm-a1-c13-e8',
    relatedLessonId: 'llm-a1-c13-l1',
    type: 'open',
    difficulty: 3,
    question:
      '请解释：为什么 base 模型会「答得很快但答错」？请从（1）训练目标、（2）单次前向的计算量、（3）CoT 的作用机制三个角度回答，并用本站的实测数字作为证据。',
    referenceAnswer: `**（1）训练目标**

base 模型的优化目标是最大化训练语料中下一个 token 的条件似然：

    max Σ log P(x_t | x_<t)

这个目标里**没有「答对」这一项**。如果语料里大量出现「问题 → 直接答案」的格式，
那么「直接给答案」在统计上就是正确行为——哪怕答案是错的。
所以 base 模型在**模仿格式**，不是求解问题。

**（2）单次前向的计算量是固定的**

每生成一个 token，都要跑一次完整的 28 层 × 1024 维前向。
这个计算量与题目难度**完全无关**：

| 题目 | 需要的推理步数 | base 实际花的前向次数 | 结果 |
|---|---|---|---|
| 17+25 | 1 | 1 | 42 ✅ |
| 12×4 | 1 | 1 | 48 ✅ |
| 100−37 | 1 | 1 | 63 ✅ |
| Half of 3x−9 is x+37 | 约 5 步 | **仍然是 1** | 12 ❌ |

前三题一步就能出结果，固定计算量够用；第四题需要五步串行运算，
而 base 只肯做一次，只能靠模式匹配猜一个数。

**（3）CoT 的作用机制**

Transformer 的注意力只能看到**上下文里已有的 token**。
中间结果若只存在于隐状态里，下一步无法可靠取用；
一旦写成 token，它就成为后续所有位置的可见输入。

所以 CoT 的本质是**把串行计算外化到序列维度**，即「用 token 换计算」。
自回归生成每多一个 token 就多一次完整前向，因此：

    token 预算 == 计算预算

**实测证据**

同一道中等题，只改 max_new_tokens：

| 预算 | 实际生成 | 耗时 | 抽出的答案 | 正确？ |
|---|---|---|---|---|
| 48 | 48（被截断） | 5.8 s | None（还没写 boxed） | ❌ |
| 240 | 195（自然结束） | 21.7 s | 83 | ✅ |

**结论**：答错不是因为参数太少——同一份 596 M 权重，
只要给够 token，它自己就能走完五步得出 83。
判断时应先问「预算够不够」，再问「会不会」。`,
    rubric: [
      { point: '指出训练目标里没有「答对」，只有下一个 token 的似然', score: 2 },
      { point: '说明单次前向计算量固定、与题目难度无关', score: 2 },
      { point: '用四题实测表（42/48/63 对，12 错）作为证据', score: 1 },
      { point: '指出 CoT 把中间结果写成 token 从而可被后续位置注意', score: 2 },
      { point: '用 48 vs 240 token 的实测说明「预算 = 计算量」', score: 2 },
    ],
    keywords: ['下一个 token 的似然', '固定计算量', 'token 换计算', '48', '240', '12', '83', '注意力只能看到上下文'],
    explanation:
      '这题考的是「把行为现象归因到机制」。三个角度缺一不可：目标解释了动机（为什么它不思考）、计算量解释了现象（为什么答得快）、CoT 解释了补救（为什么写出来就有用）。能用 48/240 那组数字收尾，说明你真的跑过。',
    tags: ['base 模型', 'CoT', '综合'],
  },
  {
    id: 'llm-a1-c13-e9',
    relatedLessonId: 'llm-a1-c13-l2',
    type: 'single',
    difficulty: 2,
    question: 'Qwen3-0.6B 的 `head_dim` 是 128，而 `hidden_size / num_attention_heads` = 1024/16 = 64。这说明什么？',
    options: [
      { value: 'A', text: '配置写错了，head_dim 应该等于 64' },
      { value: 'B', text: '注意力内部是 16×128 = 2048 维，投影完再降回 1024' },
      { value: 'C', text: '模型实际只有 8 个头' },
      { value: 'D', text: 'Q 和 K 的维度不同，K 用的是 64 维' },
    ],
    answer: 'B',
    explanation:
      'Qwen3 的注意力内部是升维的：Q 投影把 1024 映射到 16×128=2048，O 投影再降回 1024。算参数时如果按 64 维算，注意力部分会少算一半，总数就对不上 596.0 M。这是本节最常踩的坑。',
    tags: ['head_dim', '注意力'],
  },
  {
    id: 'llm-a1-c13-e10',
    relatedLessonId: 'llm-a1-c13-l2',
    type: 'single',
    difficulty: 3,
    question: 'Qwen3-0.6B 的 FFN : 注意力 参数比约为 1.50 : 1，而 GPT-2 Small 是 2 : 1。主要原因是？',
    options: [
      { value: 'A', text: 'Qwen3 的 FFN 用了更小的中间维（3d 而非 4d），但 SwiGLU 需要三个矩阵' },
      { value: 'B', text: 'Qwen3 的注意力头数更多，所以注意力参数变大' },
      { value: 'C', text: 'Qwen3 去掉了 FFN 的降维矩阵' },
      { value: 'D', text: 'GPT-2 的 d_ff 其实等于 8d' },
    ],
    answer: 'A',
    explanation:
      'SwiGLU 用三个矩阵（gate/up/down），但中间维只有 3d 而非 4d：$3 \\times 3d^2 = 9d^2$，对比 GPT-2 的 $2 \\times 4d^2 = 8d^2$。所以 FFN 略大、但比例反而下降（分母的注意力也因为 GQA 与 head_dim 变化而调整）。不要看到「三个矩阵」就以为参数翻倍。',
    tags: ['SwiGLU', '参数量'],
  },
  {
    id: 'llm-a1-c13-e11',
    relatedLessonId: 'llm-a1-c13-l2',
    type: 'judge',
    difficulty: 2,
    question: 'Qwen3-0.6B 的 `tie_word_embeddings=True`，意味着输出投影（lm_head）不占额外参数。',
    answer: true,
    explanation:
      '对。同一个 151936×1024 的矩阵既做输入嵌入、又做输出投影，直接省下 155,582,464 个参数——占全模型 26%。这是小模型性价比最高的一处优化（词表大、隐藏维小，「查表税」很重）。',
    tags: ['权重共享', '参数量'],
  },
  {
    id: 'llm-a1-c13-e12',
    relatedLessonId: 'llm-a1-c13-l2',
    type: 'judge',
    difficulty: 3,
    question: 'GQA 的主要收益是显著减少模型参数量。',
    answer: false,
    explanation:
      '错。KV 投影从 2×2,097,152 降到 2×1,048,576，每层只省约 2 M（相对 596 M 微不足道）。真正的收益在**推理时的 KV Cache 显存与带宽**：KV 头从 16 降到 8，缓存直接减半。生成越长收益越大——这对需要长思考的推理模型特别重要。',
    tags: ['GQA', '误区'],
  },
  {
    id: 'llm-a1-c13-e13',
    relatedLessonId: 'llm-a1-c13-l2',
    type: 'fill',
    difficulty: 2,
    question:
      'Qwen3-0.6B 的关键结构：层数 ____、隐藏维 ____、Q 头 ____、KV 头 ____、词表 ____、FFN 中间维 ____。',
    blanks: [['28'], ['1024'], ['16'], ['8'], ['151936'], ['3072']],
    explanation:
      '这六个数字加上 `max_position_embeddings=40960`、`tie_word_embeddings=True`，构成全部结构信息。用它们可以独立算出 596,043,776 个参数——与 `sum(p.numel())` 完全一致。',
    tags: ['配置', 'Qwen3'],
  },
  {
    id: 'llm-a1-c13-e14',
    relatedLessonId: 'llm-a1-c13-l2',
    type: 'multiple',
    difficulty: 3,
    question: 'Qwen3-0.6B 相对 GPT-2 Small 做了哪些改动？（多选）',
    options: [
      { value: 'A', text: 'LayerNorm → RMSNorm（去掉减均值与 β）' },
      { value: 'B', text: 'GELU → SwiGLU（门控激活）' },
      { value: 'C', text: '可学习绝对位置 → RoPE' },
      { value: 'D', text: 'MHA → GQA（16 Q 头 / 8 KV 头）' },
      { value: 'E', text: 'Pre-LN → Post-LN' },
    ],
    answer: ['A', 'B', 'C', 'D'],
    explanation:
      'E 错：Qwen3 仍然是 Pre-LN（归一化在子层之前，残差路径干净）。Block 的四件套（Pre-LN + 残差 + 注意力 + FFN）从 GPT-2 到 Qwen3 一个都没变——变的只是零件选型。这正是 c3-c9 能整体迁移的理由。',
    tags: ['架构对照', 'Qwen3'],
  },
  {
    id: 'llm-a1-c13-e15',
    relatedLessonId: 'llm-a1-c13-l2',
    type: 'code',
    difficulty: 3,
    question:
      '实现 `qwen3_params(cfg)`：给定配置 dict（含 `hidden_size`、`num_hidden_layers`、`num_attention_heads`、`num_key_value_heads`、`vocab_size`、`intermediate_size`、`head_dim`、`tie_word_embeddings`），返回各部分的参数量 dict，键为 `embedding`、`attn_per_layer`、`ffn_per_layer`、`norm_per_layer`、`per_layer`、`total`。\n\n公式：\n- Q 投影 = d × (H×hd)，K/V 投影各 = d × (KV×hd)，O 投影 = (H×hd) × d\n- FFN（SwiGLU）= 3 × d × F\n- 每层 Norm = 2 × d\n- total = embedding + L×per_layer + 2d + (0 if tie else d×vocab)',
    starterCode: `def qwen3_params(cfg):
    pass


cfg = dict(hidden_size=1024, num_hidden_layers=28, num_attention_heads=16,
           num_key_value_heads=8, vocab_size=151936, intermediate_size=3072,
           head_dim=128, tie_word_embeddings=True)
r = qwen3_params(cfg)
print({k: f"{v:,}" for k, v in r.items()})`,
    expectedOutput: 'total = 596,043,776',
    tests: `cfg = dict(hidden_size=1024, num_hidden_layers=28, num_attention_heads=16,
           num_key_value_heads=8, vocab_size=151936, intermediate_size=3072,
           head_dim=128, tie_word_embeddings=True)
r = qwen3_params(cfg)
for k in ("embedding", "attn_per_layer", "ffn_per_layer", "norm_per_layer", "per_layer", "total"):
    assert k in r, f"缺少键 {k}"
assert r["embedding"] == 151936 * 1024, f"embedding 错：{r['embedding']}"
# 注意力：Q + K + V + O（注意 head_dim=128，不是 64）
assert r["attn_per_layer"] == 1024*16*128 + 2*(1024*8*128) + 16*128*1024, f"注意力错：{r['attn_per_layer']}"
assert r["attn_per_layer"] == 6_291_456, f"注意力应为 6291456，实际 {r['attn_per_layer']}"
# FFN：SwiGLU 三个矩阵
assert r["ffn_per_layer"] == 3 * 1024 * 3072, f"FFN 错：{r['ffn_per_layer']}"
assert r["ffn_per_layer"] == 9_437_184, f"FFN 应为 9437184，实际 {r['ffn_per_layer']}"
assert r["norm_per_layer"] == 2 * 1024, f"Norm 错：{r['norm_per_layer']}"
assert r["per_layer"] == r["attn_per_layer"] + r["ffn_per_layer"] + r["norm_per_layer"]
# 总计必须精确等于 596,043,776
assert r["total"] == 596_043_776, f"总计应为 596043776，实际 {r['total']}"
# FFN 应大于注意力
assert r["ffn_per_layer"] > r["attn_per_layer"], "FFN 应大于注意力"
# 若改成不共享权重，总数应多出 d*vocab
cfg2 = dict(cfg, tie_word_embeddings=False)
assert qwen3_params(cfg2)["total"] == 596_043_776 + 1024*151936, "不共享权重时应多出 d*vocab"
`,
    answer: `def qwen3_params(cfg):
    d  = cfg["hidden_size"]
    L  = cfg["num_hidden_layers"]
    H  = cfg["num_attention_heads"]
    KV = cfg["num_key_value_heads"]
    V  = cfg["vocab_size"]
    F  = cfg["intermediate_size"]
    hd = cfg["head_dim"]

    q = d * H * hd
    k = d * KV * hd
    v = d * KV * hd
    o = H * hd * d
    attn = q + k + v + o
    ffn  = 3 * d * F
    norm = 2 * d
    per_layer = attn + ffn + norm

    emb = V * d
    lm_head = 0 if cfg["tie_word_embeddings"] else d * V
    total = emb + L * per_layer + norm + lm_head

    return dict(embedding=emb, attn_per_layer=attn, ffn_per_layer=ffn,
                norm_per_layer=norm, per_layer=per_layer, total=total)


cfg = dict(hidden_size=1024, num_hidden_layers=28, num_attention_heads=16,
           num_key_value_heads=8, vocab_size=151936, intermediate_size=3072,
           head_dim=128, tie_word_embeddings=True)
r = qwen3_params(cfg)
print({k: f"{v:,}" for k, v in r.items()})`,
    explanation:
      '```python\nq = d * H * hd        # 1024 -> 16*128 = 2048\nk = d * KV * hd       # 1024 -> 8*128  = 1024（GQA 省在这）\nffn = 3 * d * F       # SwiGLU: gate / up / down\n```\n\n**两个陷阱**：① 用 `head_dim` 而不是 `d // H`；② SwiGLU 是三个矩阵不是两个。算对了正好是 596,043,776，与 `sum(p.numel())` 一致。',
    tags: ['编程', '参数量'],
  },
  {
    id: 'llm-a1-c13-e16',
    relatedLessonId: 'llm-a1-c13-l2',
    type: 'code',
    difficulty: 3,
    question:
      '实现 `kv_cache_bytes(seq_len, n_layers, n_kv_heads, head_dim, dtype_bytes)`：估算生成 `seq_len` 个 token 时 KV Cache 的字节数（只算 K 和 V，且不区分层间的额外开销）。\n\n公式：`2 × n_layers × n_kv_heads × head_dim × seq_len × dtype_bytes`。\n\n返回整数字节数。',
    starterCode: `def kv_cache_bytes(seq_len, n_layers, n_kv_heads, head_dim, dtype_bytes):
    pass


print(kv_cache_bytes(4096, 28, 8, 128, 2))`,
    expectedOutput: '约 0.47 GB（469,762,048 字节）',
    tests: `b = kv_cache_bytes(4096, 28, 8, 128, 2)
assert b == 2 * 28 * 8 * 128 * 4096 * 2, f"公式错：{b}"
assert b == 469_762_048, f"应为 469762048，实际 {b}"
# 长度翻倍 -> 缓存翻倍（线性）
assert kv_cache_bytes(8192, 28, 8, 128, 2) == 2 * b, "长度翻倍时缓存应翻倍"
# KV 头从 8 增到 16（退回 MHA）-> 缓存翻倍
assert kv_cache_bytes(4096, 28, 16, 128, 2) == 2 * b, "KV 头翻倍时缓存应翻倍"
# float32 是 bf16 的两倍
assert kv_cache_bytes(4096, 28, 8, 128, 4) == 2 * b, "float32 应为 bf16 的 2 倍"
# 空序列
assert kv_cache_bytes(0, 28, 8, 128, 2) == 0
`,
    answer: `def kv_cache_bytes(seq_len, n_layers, n_kv_heads, head_dim, dtype_bytes):
    return 2 * n_layers * n_kv_heads * head_dim * seq_len * dtype_bytes


print(kv_cache_bytes(4096, 28, 8, 128, 2))`,
    explanation:
      '```python\nreturn 2 * n_layers * n_kv_heads * head_dim * seq_len * dtype_bytes\n```\n\n**2 是 K 和 V 两份**。注意公式里是 `n_kv_heads` 不是 `n_attention_heads`——这正是 GQA 的收益所在：KV 头减半，缓存就减半。生成 4096 token 时约 0.47 GB（bf16）；如果退回 16 个 KV 头就是 0.94 GB。**推理模型的思考越长，这个差距越致命。**',
    tags: ['编程', 'KV Cache'],
  },
  {
    id: 'llm-a1-c13-e17',
    relatedLessonId: 'llm-a1-c13-l2',
    type: 'open',
    difficulty: 4,
    question:
      '请把 Qwen3-0.6B 与你手写的 GPT-2 逐项对照：列出至少五处结构改动，说明每处改动的动机（解决了什么问题），并指出其中哪一处对「推理模型」这个使用场景最关键，为什么。',
    referenceAnswer: `**五处改动与动机**

| # | GPT-2 | Qwen3-0.6B | 动机 |
|---|---|---|---|
| 1 | LayerNorm（有 β） | RMSNorm（无 β、不减均值） | 少一次减均值运算、少一组参数；训练同样稳，速度更快 |
| 2 | GELU | SwiGLU（门控） | 用 swish(xW_g) ⊙ (xW_u) 做门控，同等宽度表达力更强 |
| 3 | 可学习绝对位置（上限 1024） | RoPE（theta=1e6） | 用旋转实现相对位置，可外推到 40960；theta 调大是为长上下文 |
| 4 | MHA（12 头 = 12 组 KV） | GQA（16 Q 头 / 8 KV 头） | KV Cache 减半，推理时显存与带宽都省一半 |
| 5 | 独立 lm_head | tie_word_embeddings | 省 26% 参数（小模型尤其重要） |

**不变的部分**

Block 的四件套一个都没改：Pre-LN（归一化在子层前）+ 两个残差 + 多头注意力 + FFN。
所以 c3-c9 学的零件可以整体迁移到 Qwen3。

**哪一处对推理模型最关键：GQA**

理由要分三层说：

1. **推理模型的成本结构变了**。普通对话回答 50-200 token，
   而推理模型要生成几百到几千个思考 token。KV Cache 随长度**线性增长**，
   于是它从「可以忽略」变成「主要显存开销」。

2. **GQA 直接砍掉一半**。KV 头 16 → 8，缓存减半。
   实测公式：2 × 28 × 8 × 128 × seq_len × dtype_bytes，
   4096 token 时 bf16 约 0.47 GB；若退回 MHA（16 KV 头）就是 0.94 GB。
   生成长度到 32K 时，这个差距是几 GB 级别。

3. **它让「长思考」在经济上可行**。没有 GQA，
   推理模型的长思考会被显存直接卡死——不是算不动，是装不下。

（也可以论证第 3 条 RoPE：40960 的上下文是长思考的前提。
但 RoPE 解决的是「能不能装下输入」，GQA 解决的是「生成时缓存会不会爆」，
后者更直接约束推理场景。）`,
    rubric: [
      { point: '列出至少五处改动并正确配对（RMSNorm / SwiGLU / RoPE / GQA / 权重共享）', score: 3 },
      { point: '每处改动都给出动机，而不是只写名字', score: 2 },
      { point: '指出 Block 四件套未变、因此 c3-c9 知识可迁移', score: 1 },
      { point: '论证 GQA 对推理场景最关键（KV Cache 随长度线性增长）', score: 3 },
      { point: '给出量化估算（如 4096 token 时约 0.47 GB，退回 MHA 翻倍）', score: 1 },
    ],
    keywords: ['RMSNorm', 'SwiGLU', 'RoPE', 'GQA', 'tie_word_embeddings', 'KV Cache', '线性增长', '0.47 GB'],
    explanation:
      '这题的关键不是「背出五个名字」，而是「说清每个名字解决什么问题」。最后的论证题没有唯一答案——选 RoPE 也能自圆其说，但必须给出「为什么它更直接约束推理场景」的理由。GQA 的优势在于它能被量化（缓存字节数公式）。',
    tags: ['架构对照', 'GQA', '综合'],
  },
  {
    id: 'llm-a1-c13-e18',
    relatedLessonId: 'llm-a1-c13-l2',
    type: 'judge',
    difficulty: 3,
    question: 'Qwen3-0.6B 选择了 28 层 × 1024 维，而 GPT-2 Small 是 12 层 × 768 维——它倾向于「更深」而不是「更宽」。',
    answer: true,
    explanation:
      '对。总参数约 6 亿时，Qwen3 把预算更多花在层数上（2.3×），隐藏维只增加 1.33×。深度带来的是串行计算步数（每层一次非线性变换），对需要多步推理的任务更值钱——这与 c13-l1 的「串行步数」正好呼应。',
    tags: ['架构选型', 'Qwen3'],
  },
  {
    id: 'llm-a1-c13-e19',
    relatedLessonId: 'llm-a1-c13-l3',
    type: 'single',
    difficulty: 2,
    question: '加载模型后忘记调用 `model.eval()` 会有什么后果？',
    options: [
      { value: 'A', text: '会直接抛出异常，程序无法运行' },
      { value: 'B', text: 'dropout 等训练层仍然生效，导致推理结果不可复现' },
      { value: 'C', text: '模型的参数量会翻倍' },
      { value: 'D', text: 'tokenizer 无法正常分词' },
    ],
    answer: 'B',
    explanation:
      '不会报错，但 dropout / batch norm 会保持训练模式的行为，同一个问题每次答案可能不同。而不可复现的评估结果等于没有结果。即使某模型恰好 `attention_dropout=0.0`（如 Qwen3），也应保持调用 `eval()` 的习惯。',
    tags: ['eval', '三件套'],
  },
  {
    id: 'llm-a1-c13-e20',
    relatedLessonId: 'llm-a1-c13-l3',
    type: 'single',
    difficulty: 3,
    question: '本站实测：`max_new_tokens=240` 时模型只生成了 195 个 token。这说明什么？',
    options: [
      { value: 'A', text: '模型被截断了，输出不完整' },
      { value: 'B', text: '模型自己生成了结束符（`<|im_end|>`，ID 151645），认为写完了' },
      { value: 'C', text: 'tokenizer 丢掉了 45 个 token' },
      { value: 'D', text: '生成速度太快导致计数错误' },
    ],
    answer: 'B',
    explanation:
      '`max_new_tokens` 是**上限**不是目标。195 < 240 说明模型主动吐了 eos（`<|im_end|>` 同时就是 eos，ID 151645）。判断「是否被截断」要看实际生成数是否等于上限，不能只看输出内容。',
    tags: ['生成', 'max_new_tokens'],
  },
  {
    id: 'llm-a1-c13-e21',
    relatedLessonId: 'llm-a1-c13-l3',
    type: 'judge',
    difficulty: 2,
    question: '抽取 `\\boxed{}` 内容时可以用正则 `\\\\boxed\\{(.*?)\\}`，因为它能正确处理所有情况。',
    answer: false,
    explanation:
      '错，这是最常见的实现 bug。遇到 `\\boxed{\\frac{1}{2}}` 时，惰性匹配会在第一个 `}` 处截断，得到 `\\frac{1`，然后判分判错——而模型其实答对了。必须手写深度计数来支持嵌套花括号。',
    tags: ['boxed 解析', '误区'],
  },
  {
    id: 'llm-a1-c13-e22',
    relatedLessonId: 'llm-a1-c13-l3',
    type: 'judge',
    difficulty: 3,
    question: 'Qwen3-0.6B 的 `len(tokenizer)` 等于 `config.vocab_size`。',
    answer: false,
    explanation:
      '不等。实测 `config.vocab_size = 151936`，而 `len(tokenizer) = 151669`。差的部分是被合并的重复项。写代码算参数时必须用 `config.vocab_size`（嵌入矩阵的行数），用 `len(tokenizer)` 会算错。',
    tags: ['tokenizer', '配置'],
  },
  {
    id: 'llm-a1-c13-e23',
    relatedLessonId: 'llm-a1-c13-l3',
    type: 'fill',
    difficulty: 3,
    question:
      '装载模型的「三件套」是：用 `______` 读入权重、显式指定 `______` 控制精度、调用 `______` 关闭 dropout。',
    blanks: [['from_pretrained'], ['dtype', 'torch_dtype'], ['eval', 'model.eval', 'eval()']],
    explanation:
      '三件套少一个都不会报错，但都会静默变差：不设 dtype 内存翻倍或数值溢出；不调 eval() 结果不可复现；不设 pad_token_id 时长 prompt 会告警。**「能跑」和「跑得对」的距离就在这三行。**',
    tags: ['三件套', '装载'],
  },
  {
    id: 'llm-a1-c13-e24',
    relatedLessonId: 'llm-a1-c13-l3',
    type: 'multiple',
    difficulty: 3,
    question: '关于 tokenizer 的行为，下面哪些说法正确？（多选）',
    options: [
      { value: 'A', text: '数字 `42` 可能被切成两个 token（如 `[19, 17]`）' },
      { value: 'B', text: '前导空格会单独成为一个 token（ID 220）' },
      { value: 'C', text: '中文通常比英文更「贵」，1 个字约 1-2 个 token' },
      { value: 'D', text: '所有数字都必然对应一个独立 token，与长度无关' },
    ],
    answer: ['A', 'B', 'C'],
    explanation:
      'D 错。实测 `"42"` → `[19, 17]`（两个 token），`"17 + 25 = 42"` → 10 个 token。数字不是原子的，这是小模型算术不稳定的结构性原因之一——模型看到的是两位数字 token，不是「四十二」这个概念。',
    tags: ['tokenizer'],
  },
  {
    id: 'llm-a1-c13-e25',
    relatedLessonId: 'llm-a1-c13-l3',
    type: 'code',
    difficulty: 3,
    question:
      '实现 `extract_boxed(text)`：从自由文本中抽取**最后一个** `\\boxed{...}` 的内容，必须用深度计数支持嵌套花括号。找不到时返回 `None`。\n\n要求：\n- `extract_boxed(r"\\boxed{83}")` → `"83"`\n- `extract_boxed(r"\\boxed{\\frac{1}{2}}")` → `"\\\\frac{1}{2}"`\n- 有多个时取最后一个。',
    starterCode: `def extract_boxed(text):
    pass


print(extract_boxed(r"\\boxed{83}"))
print(extract_boxed(r"\\boxed{\\frac{1}{2}}"))`,
    expectedOutput: '83 然后 \\frac{1}{2}',
    tests: `assert extract_boxed(r"\\boxed{83}") == "83"
nested = extract_boxed(r"\\boxed{\\frac{1}{2}}")
assert nested == r"\\frac{1}{2}", "嵌套失败，实际：" + repr(nested)
assert extract_boxed(r"so \\boxed{12} then \\boxed{83}") == "83", "应取最后一个"
spaced = extract_boxed(r"\\boxed{ 42 }")
assert spaced.strip() == "42", "内容应包含 42，实际：" + repr(spaced)
assert extract_boxed("no box here") is None, "无匹配应返回 None"
assert extract_boxed(r"\\boxed{2+3}") == "2+3"
# 三层嵌套
deep = extract_boxed(r"\\boxed{\\frac{\\frac{1}{2}}{3}}")
assert deep == r"\\frac{\\frac{1}{2}}{3}", "三层嵌套失败，实际：" + repr(deep)
# 正则方案会失败的那一种
assert extract_boxed(r"\\boxed{\\dfrac{3}{4}}") == r"\\dfrac{3}{4}"
`,
    answer: `def extract_boxed(text):
    out, i = None, 0
    while True:
        j = text.find("\\\\boxed{", i)
        if j < 0:
            return out
        k, depth, buf = j + 7, 1, []
        while k < len(text) and depth > 0:
            ch = text[k]
            if ch == "{":
                depth += 1
                buf.append(ch)
            elif ch == "}":
                depth -= 1
                if depth > 0:
                    buf.append(ch)
            else:
                buf.append(ch)
            k += 1
        out = "".join(buf)
        i = k


print(extract_boxed(r"\\boxed{83}"))
print(extract_boxed(r"\\boxed{\\frac{1}{2}}"))`,
    explanation:
      '```python\nwhile True:\n    j = text.find("\\\\boxed{", i)\n    if j < 0: return out\n    k, depth, buf = j + 7, 1, []\n    while k < len(text) and depth > 0:\n        ch = text[k]\n        if ch == "{": depth += 1; buf.append(ch)\n        elif ch == "}":\n            depth -= 1\n            if depth > 0: buf.append(ch)\n        else: buf.append(ch)\n        k += 1\n    out = "".join(buf); i = k\n```\n\n**三个要点**：① 用 `depth` 计数而不是惰性匹配；② 只有 `depth > 0` 时才把 `}` 放进结果；③ 外层循环取**最后一个**——模型经常先写中间答案再自我纠正。',
    tags: ['编程', 'boxed 解析'],
  },
  {
    id: 'llm-a1-c13-e26',
    relatedLessonId: 'llm-a1-c13-l3',
    type: 'code',
    difficulty: 3,
    question:
      '实现 `generate_cost(prompt_tokens, generated_tokens, tok_per_sec, load_sec)`：返回总耗时（秒，保留 2 位小数）与有效吞吐（生成的 token / 总耗时，保留 3 位小数）。\n\n返回 `(total_seconds, effective_tok_per_sec)`。\n\n注意：**加载时间必须计入总耗时**——这是评估「一次性脚本」和「常驻服务」差异的关键。',
    starterCode: `def generate_cost(prompt_tokens, generated_tokens, tok_per_sec, load_sec):
    pass


print(generate_cost(40, 195, 9.0, 8.6))`,
    expectedOutput: '(34.71, 5.618)',
    tests: `r = generate_cost(40, 195, 9.0, 8.6)
assert isinstance(r, tuple) and len(r) == 2, f"应返回二元组，实际 {r}"
total, eff = r
assert abs(total - 34.71) < 0.01, f"总耗时应为 34.71，实际 {total}"
assert abs(eff - 5.618) < 0.01, f"有效吞吐应为 5.618，实际 {eff}"
# 不计加载时：235/9 = 26.111 秒
assert total > 235 / 9.0, "总耗时必须包含加载时间"
# 加载时间为 0 且无 prompt 时，有效吞吐等于标称速度
t2, e2 = generate_cost(0, 195, 9.0, 0.0)
assert abs(e2 - 9.0) < 0.01, f"无加载无 prompt 时应为 9.0，实际 {e2}"
# prompt 也占时间，所以有效吞吐低于标称速度
_, e2b = generate_cost(40, 195, 9.0, 0.0)
assert abs(e2b - 7.468) < 0.01, f"含 prompt 时应为 7.468，实际 {e2b}"
# 生成越多，加载摊薄越多
_, e3 = generate_cost(40, 1000, 9.0, 8.6)
assert e3 > eff, "生成更多时有效吞吐应更高（加载被摊薄）"
`,
    answer: `def generate_cost(prompt_tokens, generated_tokens, tok_per_sec, load_sec):
    total = load_sec + (prompt_tokens + generated_tokens) / tok_per_sec
    eff = generated_tokens / total
    return round(total, 2), round(eff, 3)


print(generate_cost(40, 195, 9.0, 8.6))`,
    explanation:
      '```python\ntotal = load_sec + (prompt_tokens + generated_tokens) / tok_per_sec\neff = generated_tokens / total\n```\n\n**这道题解释了为什么必须有「模型常驻服务」**：冷加载 8.6 秒，生成 195 token 只要 26 秒——加载占了 25% 的时间。一次性脚本的有效吞吐只有 5.618 token/s，而标称速度是 9.0。生成越长，加载摊得越薄。',
    tags: ['编程', '性能'],
  },
  {
    id: 'llm-a1-c13-e27',
    relatedLessonId: 'llm-a1-c13-l3',
    type: 'open',
    difficulty: 4,
    question:
      '你在一个脚本里这样写：`model = AutoModelForCausalLM.from_pretrained(MID); out = model.generate(...)`。请指出这段代码有哪些问题、每个问题会导致什么后果（是否报错），并给出修正后的完整写法。',
    referenceAnswer: `**问题清单**

| # | 问题 | 后果 | 报错吗 |
|---|---|---|---|
| 1 | 没指定 \`dtype\` | 默认 float32 或跟随权重精度（Qwen3 是 bf16）；CPU 上 bf16 往往更慢，float32 内存翻倍（596 M 约 2.4 GB） | ❌ 不报 |
| 2 | 没调 \`model.eval()\` | dropout / batch norm 保持训练行为，同一问题每次结果可能不同 | ❌ 不报 |
| 3 | 没设 \`pad_token_id\` | 长 prompt 或 batch 生成时告警，行为不确定 | ⚠️ 只告警 |
| 4 | 没设 \`max_new_tokens\` | 会用默认值（可能很小）或跑到上下文上限，耗时不可控 | ❌ 不报 |
| 5 | 没设 \`do_sample=False\` | 会用 \`generation_config.json\` 里的默认（Qwen3 默认 \`do_sample=true, T=0.6\`），结果不可复现 | ❌ 不报 |
| 6 | 没做 \`torch.no_grad()\` | 会构建计算图，显存/内存白白增加 | ❌ 不报 |
| 7 | 没设 \`HF_HUB_OFFLINE\` | 每次启动都联网检查模型更新，网络抖动会拖死推理 | ❌ 不报（只变慢） |

**关键点**：这七个问题**没有一个会报错**。它们只会让程序变慢、变不稳、或结果不可复现。
这就是「能跑」和「跑得对」的距离。

**修正后的完整写法**

    import os
    os.environ["HF_HUB_OFFLINE"] = "1"          # 只用本地缓存
    os.environ["TRANSFORMERS_VERBOSITY"] = "error"

    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer

    MID = "Qwen/Qwen3-0.6B"

    tok = AutoTokenizer.from_pretrained(MID)
    model = AutoModelForCausalLM.from_pretrained(MID, dtype=torch.float32)
    model.eval()                                 # 关掉 dropout

    prompt = "Question: What is 17+25?\\nAnswer:"
    ids = tok(prompt, return_tensors="pt").input_ids

    with torch.no_grad():                        # 不建计算图
        out = model.generate(
            ids,
            max_new_tokens=32,                   # 明确上限
            do_sample=False,                     # 贪心，可复现
            pad_token_id=tok.pad_token_id or tok.eos_token_id,
        )

    text = tok.decode(out[0][ids.shape[1]:], skip_special_tokens=True)

**补充说明**

- \`dtype\` 的选择要看硬件：CPU 用 float32 更稳（很多 CPU 无 bf16 指令），
  GPU 用 bfloat16 更省显存。Qwen3 官方权重是 bfloat16。
- \`do_sample=False\` 是**评估**的前提。如果要做 self-consistency（c15-l3），
  反而需要 \`do_sample=True\` 加固定 \`seed\`，否则样本之间不可比。
- 生产环境还应加：超时控制、\`max_new_tokens\` 与题难度的分级、
  以及模型常驻（避免每次冷加载 8.6-10.0 秒）。`,
    rubric: [
      { point: '指出缺 dtype 及其后果（内存/速度/精度）', score: 2 },
      { point: '指出缺 eval() 及其后果（不可复现）', score: 2 },
      { point: '指出缺 pad_token_id / max_new_tokens / do_sample 中的至少两项', score: 2 },
      { point: '强调这些问题是「静默」的——不会报错', score: 2 },
      { point: '给出可运行的修正版本（含 no_grad 与 decode）', score: 2 },
    ],
    keywords: ['dtype', 'eval()', 'pad_token_id', 'max_new_tokens', 'do_sample', 'no_grad', '静默失败'],
    explanation:
      '这题的核心是「静默失败」这个概念。初学者以为 bug 会报错，但深度学习里最贵的 bug 都是静默的——程序正常跑完，结果就是错的。能列出七条并说清「都不报错」，说明你有了工程直觉。',
    tags: ['三件套', '工程', '综合'],
  },
  {
    id: 'llm-a1-c13-e28',
    relatedLessonId: 'llm-a1-c13-l3',
    type: 'judge',
    difficulty: 3,
    question: '`<|im_end|>` 在 Qwen 系列中同时充当消息结束标记和 eos token。',
    answer: true,
    explanation:
      '对。实测 `<|im_end|>` 的 ID 是 151645，而 `eos_token_id` 也是 151645。所以模型吐出 `<|im_end|>` 就等于说「我说完了」——这也是判断「是否自然结束」的依据（c13-l3 的 195 < 240）。',
    tags: ['特殊 token'],
  },
  {
    id: 'llm-a1-c13-e29',
    relatedLessonId: 'llm-a1-c13-l4',
    type: 'single',
    difficulty: 2,
    question: '`enable_thinking=False` 在 prompt 层面到底做了什么？',
    options: [
      { value: 'A', text: '把模型的思考层参数临时置零' },
      { value: 'B', text: '在 assistant 开头预填一个空的 `<think>\\n\\n</think>` 段' },
      { value: 'C', text: '切换到另一个不含推理能力的小模型' },
      { value: 'D', text: '把温度参数强制设为 0' },
    ],
    answer: 'B',
    explanation:
      '本站实测：`enable_thinking=False` 时 prompt 结尾是 `<|im_start|>assistant\\n<think>\\n\\n</think>\\n\\n`——等于告诉模型「思考段已经用完了，直接说答案」。`True` 时模板什么都不加，模型就自己开始写 `<think>`。权重完全没变。',
    tags: ['enable_thinking', 'prompt'],
  },
  {
    id: 'llm-a1-c13-e30',
    relatedLessonId: 'llm-a1-c13-l4',
    type: 'single',
    difficulty: 3,
    question: '关于 `<think>` 标签里的内容，下面哪个说法最准确？',
    options: [
      { value: 'A', text: '它是模型真实的内部思考过程，可以作为审计日志信任' },
      { value: 'B', text: '它是采样生成的 token，可能看似合理但实际错误，不能当审计日志' },
      { value: 'C', text: '它由另一个独立的推理模型生成' },
      { value: 'D', text: '它一定是正确的，因为模型会自我验证' },
    ],
    answer: 'B',
    explanation:
      '思考段和答案一样是采样出来的 token，不是模型的真实内部状态。它完全可以写出看起来合理但错误的推理（unfaithful reasoning）。**所以必须用独立判分器验证最终答案**——这正是 c14 存在的理由。',
    tags: ['think 标签', '安全'],
  },
  {
    id: 'llm-a1-c13-e31',
    relatedLessonId: 'llm-a1-c13-l4',
    type: 'judge',
    difficulty: 2,
    question: 'base 模型与 reasoning 模型必须是两份不同的权重文件。',
    answer: false,
    explanation:
      '不一定。本课程用的 Qwen3-0.6B 只有一份权重，靠 prompt 包装（对话模板 + `enable_thinking` 开关）就能呈现两种人格。当然，业界也存在经过专门 RL 训练、思考能力被「训进权重」的 reasoning 模型——但「两种模式必须两个文件」这个说法是错的。',
    tags: ['base', 'reasoning'],
  },
  {
    id: 'llm-a1-c13-e32',
    relatedLessonId: 'llm-a1-c13-l4',
    type: 'fill',
    difficulty: 2,
    question:
      'Qwen 对话模板的三个关键标记：`________`（ID 151644，消息开始）、`________`（ID 151645，消息结束兼 eos）、`________`（思考段的起止）。',
    blanks: [['<|im_start|>'], ['<|im_end|>'], ['<think>', 'think', '<think></think>']],
    explanation:
      '一段完整 prompt 是：`<|im_start|>user\\n问题<|im_end|>\\n<|im_start|>assistant\\n`。最后那个 `<|im_start|>assistant\\n` 是「该你说了」的信号——去掉它，模型可能开始扮演用户接着往下写。',
    tags: ['特殊 token'],
  },
  {
    id: 'llm-a1-c13-e33',
    relatedLessonId: 'llm-a1-c13-l4',
    type: 'multiple',
    difficulty: 3,
    question: '下面哪些场景适合「关闭思考」？（多选）',
    options: [
      { value: 'A', text: '批量文本分类（判断情感倾向）' },
      { value: 'B', text: '多步数学证明' },
      { value: 'C', text: '从简历里抽取结构化字段' },
      { value: 'D', text: '对延迟敏感的实时客服' },
    ],
    answer: ['A', 'C', 'D'],
    explanation:
      'B 需要串行推理，必须开思考。A/C 是单步任务，思考只是浪费 token；D 的成本直接由延迟决定。**「默认开思考」是错误的产品决策**——应按任务类型分流。实测同一道 17+25：关思考 47 token，开思考 64 token 且尚未写完（耗时随机器负载浮动，实测区间 4.7-11.7 秒）。',
    tags: ['应用场景', '成本'],
  },
  {
    id: 'llm-a1-c13-e34',
    relatedLessonId: 'llm-a1-c13-l4',
    type: 'code',
    difficulty: 3,
    question:
      '实现 `split_think(text)`：把模型输出拆成 `(thinking, answer)` 两部分。\n\n规则：\n- 有 `<think>...</think>` 时，`thinking` 是标签内的内容，`answer` 是 `</think>` 之后的内容；\n- 没有 `<think>` 标签时，`thinking` 为 `None`，`answer` 为全文；\n- 两边都要 `strip()`。',
    starterCode: `def split_think(text):
    pass


print(split_think("<think>1+1=2</think>The answer is 2"))`,
    expectedOutput: "('1+1=2', 'The answer is 2')",
    tests: `t, a = split_think("<think>1+1=2</think>The answer is 2")
assert t == "1+1=2", f"thinking 错：{t!r}"
assert a == "The answer is 2", f"answer 错：{a!r}"
# 无标签
t2, a2 = split_think("Just the answer")
assert t2 is None, f"无标签时 thinking 应为 None，实际 {t2!r}"
assert a2 == "Just the answer"
# 两侧空白要被 strip
t3, a3 = split_think("<think>\\n  reasoning  \\n</think>\\n\\n  final  ")
assert t3 == "reasoning", f"应 strip，实际 {t3!r}"
assert a3 == "final", f"应 strip，实际 {a3!r}"
# 空思考段（enable_thinking=False 的形态）
t4, a4 = split_think("<think>\\n\\n</think>\\n\\nDirect answer")
assert t4 == "", f"空思考段应为空串，实际 {t4!r}"
assert a4 == "Direct answer"
# 只有开始标签（被截断）
t5, a5 = split_think("<think>unfinished")
assert t5 is None or a5 == "", "只有开始标签时应视为未完成"
`,
    answer: `def split_think(text):
    if "<think>" not in text:
        return None, text.strip()
    start = text.find("<think>") + len("<think>")
    end = text.find("</think>")
    if end < 0:
        return text[start:].strip(), ""
    return text[start:end].strip(), text[end + len("</think>"):].strip()


print(split_think("<think>1+1=2</think>The answer is 2"))`,
    explanation:
      '```python\nif "<think>" not in text:\n    return None, text.strip()\nstart = text.find("<think>") + len("<think>")\nend = text.find("</think>")\nif end < 0:\n    return text[start:].strip(), ""\nreturn text[start:end].strip(), text[end + len("</think>"):].strip()\n```\n\n**两个边界要处理**：① 没有标签（base 模式输出）；② 只有开始标签（被截断）。后者在 `max_new_tokens` 设太小时非常常见——这时答案是空串，判分应当直接算错。',
    tags: ['编程', 'think 标签'],
  },
  {
    id: 'llm-a1-c13-e35',
    relatedLessonId: 'llm-a1-c13-l4',
    type: 'code',
    difficulty: 3,
    question:
      '实现 `build_chat_prompt(question, thinking, has_template=True)`：模拟 `apply_chat_template` 的输出。\n\n规则：\n- `has_template=False` 时返回裸续写格式：`f"Question: {question}\\nAnswer:"`；\n- `has_template=True` 时返回：`f"<|im_start|>user\\n{question}<|im_end|>\\n<|im_start|>assistant\\n"`；\n- 且当 `thinking=False` 时，末尾再追加 `<think>\\n\\n</think>\\n\\n`。\n\n返回值末尾不要多余换行（除了规则里明确的那几个）。',
    starterCode: `def build_chat_prompt(question, thinking, has_template=True):
    pass


print(repr(build_chat_prompt("What is 17+25?", thinking=False)))`,
    expectedOutput: "'<|im_start|>user\\nWhat is 17+25?<|im_end|>\\n<|im_start|>assistant\\n<think>\\n\\n</think>\\n\\n'",
    tests: `# 裸续写
r0 = build_chat_prompt("Q", True, has_template=False)
assert r0 == "Question: Q\\nAnswer:", f"裸续写格式错：{r0!r}"

# 对话模板 + 开思考
r1 = build_chat_prompt("Q", True)
assert r1 == "<|im_start|>user\\nQ<|im_end|>\\n<|im_start|>assistant\\n", f"模板格式错：{r1!r}"

# 对话模板 + 关思考：末尾多一个空思考段
r2 = build_chat_prompt("Q", False)
expect = "<|im_start|>user\\nQ<|im_end|>\\n<|im_start|>assistant\\n<think>\\n\\n</think>\\n\\n"
assert r2 == expect, f"关思考格式错：{r2!r}"

# 关键差异：关思考的 prompt 更长，且含空思考段
assert len(r2) > len(r1), "关思考的 prompt 应更长（多了空思考段）"
assert "<think>" in r2 and "<think>" not in r1

# 角色标记必须正确
assert r1.count("<|im_start|>") == 2, "应有两个 im_start（user + assistant）"
assert r1.count("<|im_end|>") == 1, "应有一个 im_end（user 消息结束）"
`,
    answer: `def build_chat_prompt(question, thinking, has_template=True):
    if not has_template:
        return f"Question: {question}\\nAnswer:"
    prompt = (
        f"<|im_start|>user\\n{question}<|im_end|>\\n"
        f"<|im_start|>assistant\\n"
    )
    if not thinking:
        prompt += "<think>\\n\\n</think>\\n\\n"
    return prompt


print(repr(build_chat_prompt("What is 17+25?", thinking=False)))`,
    explanation:
      '```python\nprompt = f"<|im_start|>user\\n{question}<|im_end|>\\n<|im_start|>assistant\\n"\nif not thinking:\n    prompt += "<think>\\n\\n</think>\\n\\n"\n```\n\n**这道题把「同一个权重两种人格」的机制写成了代码**：两条路的差别就是末尾那 14 个字符。注意 `im_start` 出现两次（user 与 assistant 各一次），`im_end` 只出现一次（user 消息结束后）——assistant 的消息由模型自己生成。',
    tags: ['编程', 'prompt 构造'],
  },
  {
    id: 'llm-a1-c13-e36',
    relatedLessonId: 'llm-a1-c13-l4',
    type: 'open',
    difficulty: 4,
    question:
      '你在做一个面向学生的数学辅导产品。请设计一套「何时用 base 模式、何时用 reasoning 模式」的分流策略：说明判断依据、两种模式各自的成本、以及你会怎么验证这个策略有效。',
    referenceAnswer: `**一、判断依据**

按「任务是否需要串行推理」分流，具体可以用三个可测信号：

1. **题型**：单步查表型（17+25、12×4）→ base 模式；
   多步推理型（需要设方程、移项、代回）→ reasoning 模式。
   实现上可以先用一次极短的分类调用（8 token 以内）判断题型。

2. **用户显式请求**：「快速给答案」→ 关思考；「详细讲解」→ 开思考。
   这是最便宜也最准的信号，应当优先用。

3. **首轮失败后的升级**：先用关思考跑，抽出 \\boxed{} 后**判分**
   （有标准答案的题库可以直接判；开放题用更弱的启发式）。
   判错则自动升级到开思考重跑一次。这是「成本最优 + 质量兜底」的组合。

**二、两种模式的成本**

实测数据（同一道 17+25，Qwen3-0.6B，float32 CPU）：

| 模式 | 生成 token | 耗时 | 说明 |
|---|---|---|---|
| 关思考 | 47 | 4.7-7.0 s | 直接给答案 + 一段解释 |
| 开思考 | 64 | 6.6-11.7 s | 尚未写完思考段 |

题目越难，倍数越大。另外还有两个隐含成本：

- **冷加载 8.6-10.0 秒**。产品必须用常驻服务，
  否则单次请求的有效吞吐会从 9 token/s 掉到 5.6 token/s。
- **KV Cache 显存随思考长度线性增长**。
  4096 token 时 bf16 约 0.47 GB（Qwen3 用 GQA 已经是减半后的数字）。
  并发请求时要按「最坏情况思考长度」预留。

**三、怎么验证策略有效**

1. **固定评估集**：从 MATH-500 里取 100 题，
   按难度分层（level 1-2 / 3 / 4-5 各 30-40 题），避免难度分布偏移。

2. **两条基线 + 一条策略**：
   - 全部关思考
   - 全部开思考
   - 你的分流策略
   在同一评估集上比 **pass@1**（不是 pass@k，见 c14-l1）与**平均 token 成本**。

3. **看「性价比」而不是单看准确率**：
   画一条曲线，横轴是平均 token 数、纵轴是 pass@1。
   好的策略应当落在**帕累托前沿**上——
   即在同等成本下准确率最高，或同等准确率下成本最低。

4. **做消融**：把「首轮失败后升级」这一条去掉，看准确率掉多少。
   如果几乎不掉，说明升级策略可以砍掉，进一步省钱。

5. **防评估泄漏**：评估集不能进入任何提示词或微调数据。
   每次都跑一遍判分器，不要相信模型自己的语气（base 模型答错时语气一样自信）。

**四、一个必须写进产品的约束**

关思考时仍会输出一段面向用户的解释（instruct 训练痕迹）。
如果产品要求「只要答案」，得另外约束输出格式，不能只靠 \`enable_thinking=False\`。`,
    rubric: [
      { point: '给出可测的分流信号（题型 / 用户请求 / 判分后升级）', score: 3 },
      { point: '用实测数字说明两种模式的成本差（47 vs 64 token，且开思考尚未写完）', score: 2 },
      { point: '提到冷加载与 KV Cache 这两个隐含成本', score: 2 },
      { point: '评估方案用 pass@1 而非 pass@k，且有分层与基线对比', score: 2 },
      { point: '提到「性价比」/ 帕累托前沿，而不是只追求最高准确率', score: 1 },
    ],
    keywords: ['分流', 'pass@1', '帕累托', 'token 成本', 'KV Cache', '冷加载', '判分升级', '消融'],
    explanation:
      '这题没有标准答案，但有两个硬要求：① 成本数字必须来自实测而不是估算；② 验证方案必须用 pass@1 和分层评估集。能做到这两点的答案，说明你已经从「会跑模型」进到了「会做产品决策」。',
    tags: ['应用设计', '综合'],
  },
  {
    id: 'llm-a1-c13-e37',
    relatedLessonId: 'llm-a1-c13-l4',
    type: 'judge',
    difficulty: 3,
    question: '在生产环境中可以把 base 模式直接暴露给终端用户，因为它和 instruct 模式是同一份权重。',
    answer: false,
    explanation:
      '绝对不行。base 模式没有任何安全对齐，会无条件续写任何前缀（包括如何制造危险物品、如何攻击他人）。权重相同不代表行为相同——**同一份权重在 base 协议下没有任何拒答能力**。产品必须走对话模板 + 后训练过的权重。',
    tags: ['安全', 'base'],
  },
  {
    id: 'llm-a1-c13-e38',
    relatedLessonId: 'llm-a1-c13-l4',
    type: 'multiple',
    difficulty: 4,
    question: '下面哪些关于「推理模型」的说法是正确的？（多选）',
    options: [
      { value: 'A', text: '推理能力可以被「训进权重」（如 RL 训练），也可以被「prompt 触发」（如 CoT）' },
      { value: 'B', text: '只要开启思考，任何题目的准确率都会提升' },
      { value: 'C', text: '思考段消耗的 token 会直接转化为延迟和成本' },
      { value: 'D', text: '思考段的内容可以当作模型真实推理过程的审计日志' },
    ],
    answer: ['A', 'C'],
    explanation:
      'B 错：简单题上开思考只是浪费 token（$17+25$ 两种模式都对）；预算不足时开思考反而更差（48 token 实验）。D 错：思考段是采样的 token，可能看似合理但错误（unfaithful reasoning），不能当审计日志——必须用独立判分器。',
    tags: ['推理模型', '综合'],
  },
];
