import type { Chapter } from '../../types';

/* ============================================================
 *  《后训练与推理模型》B4 — 第一部分
 *  c1 SFT 与指令微调    c2 RLHF 与 DPO
 *
 *  参考：InstructGPT (2022)、DPO (2023)、LIMA、
 *       CS336 L15 (Alignment - SFT/RLHF)、HF LLM Course Ch11
 * ============================================================ */

export const llmB4Chapters1: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'llm-b4-c1',
    title: 'SFT：把基座模型变成助手',
    goal: '理解监督微调的数据构造、Chat Template 格式与损失掩码，知道 SFT 能做什么、不能做什么。',
    lessons: [
      {
        id: 'llm-b4-c1-l1',
        title: 'SFT 的数据、模板与损失掩码',
        content: `
## 预训练模型为什么不会聊天

预训练的目标只有一个：**预测下一个 token**。
所以基座模型看到「中国的首都是」会续写「北京」，
但看到「请介绍一下中国的首都」时，它可能**继续编造更多问题**——
因为在它的训练分布里，这种句式后面常常跟着另一个问题。

**SFT（Supervised Fine-Tuning，监督微调）** 就是：
用「指令 → 期望回答」的成对数据，教会模型「看到指令就给出回答」这个格式。

## 三个阶段的位置

    预训练（Pre-training）→ 学知识与语言能力
        ↓
    SFT（指令微调）→ 学「按指令回答」的格式
        ↓
    偏好对齐（RLHF/DPO/GRPO）→ 学「回答得更好」

**SFT 是让模型会说话，对齐是让模型说得好。**

## Chat Template：对话的序列化格式

模型只认识 token 序列，多轮对话必须序列化成固定格式。**不同模型的模板不同**。

**ChatML 风格**（Qwen 与很多开源模型）：

    <|im_start|>system
    你是一个助手<|im_end|>
    <|im_start|>user
    1+1等于几？<|im_end|>
    <|im_start|>assistant
    2<|im_end|>

**LLaMA-2 风格**：

    <s>[INST] <<SYS>>
    你是一个助手
    <</SYS>>

    1+1等于几？ [/INST] 2 </s>

**两个关键点**：
- **特殊 token 必须加入词表**（如 im_start 这类标记），否则会被切成多个普通 token，效果大降；
- 推理时必须用**训练时相同的模板**，否则效果断崖式下降——这是最常见的部署事故。

## 损失掩码：只学回答，不学问题

SFT 时**只在 assistant 的回复上计算损失**：

    labels = input_ids.clone()
    labels[prompt_mask] = -100     # 把指令部分掩掉
    loss = cross_entropy(logits, labels)

**为什么必须掩码**：
1. 我们不想让模型学会「生成用户的问题」；
2. 指令部分的 token 数量往往远多于回答，不掩码会主导梯度；
3. 掩码后模型专注于「如何回答」。

## SFT 的数据构造

**质量远比数量重要**。业界经验：

| 数据量 | 效果 |
| --- | --- |
| 1K~10K 高质量 | 已能显著改变模型行为 |
| 50K~100K | 主流开源模型的量级 |
| 数百万 | 需极高质量，否则噪声主导 |

**LIMA 的发现**：1000 条精心挑选的指令数据，
就能让 LLaMA-65B 达到接近 GPT-4 的对话质量——**质量是关键**。

**数据构成建议**：
- 任务类型均衡（问答、摘要、改写、代码、推理、多轮）；
- 难度分层（简单到复杂都要有）；
- 语言覆盖（中文场景要有足够中文数据）；
- 拒绝样本（教模型说「我不知道」）。

## SFT 的三个常见问题

**① 灾难性遗忘**

SFT 后模型可能在通用任务上退化——因为它过度拟合了指令数据分布。

**缓解**：学习率要小（1e-5 ~ 2e-5，远小于预训练）；
数据中混入少量预训练数据；只训练 1~3 个 epoch。

**② 过拟合**

SFT 数据通常很小，很容易过拟合。
**表现**：训练 loss 持续下降但评测不升反降。
**缓解**：早停、LoRA（参数少不易过拟合）、数据增强。

**③ 风格单一**

如果 SFT 数据都来自同一个标注者或同一个模型生成，
模型会学到一个固定的腔调，缺乏多样性。

**缓解**：多来源混合，包括不同风格的人工标注。

## SFT 能做什么、不能做什么

| 能做 | 不能做 |
| --- | --- |
| 教会格式（怎么回答） | 提升知识准确性（知识来自预训练） |
| 教会风格（语气、长度） | 纠正深层错误（需要偏好对齐） |
| 激活潜在能力 | 创造预训练中不存在的能力 |
| 拒答与安全边界 | 复杂推理的稳定提升 |

**关键认知**：**SFT 是激活而非注入**。
模型做不到的事，SFT 也教不会——它只是让模型把已有的能力表现出来。

<MaskDemo />
`,
        tips: [
          {
            kind: 'interview',
            text: '「SFT 的核心作用」：教会模型按指令回答的格式与风格，激活预训练已学到的能力。它不注入新知识。',
          },
          {
            kind: 'leak',
            text: 'Chat Template 必须训练与推理一致，且特殊 token 必须加入词表。这是最常见的部署事故来源。',
          },
          {
            kind: 'pitfall',
            text: 'SFT 要只对 assistant 回复算损失（loss masking），否则模型会学会生成用户问题，且指令 token 主导梯度。',
          },
        ],
        demos: [
          {
            title: '构造 SFT 训练样本与损失掩码',
            lang: 'python',
            code: `def build_chatml(messages):
    """把对话序列化成 ChatML 格式。"""
    parts = []
    for m in messages:
        parts.append(f"<|im_start|>{m['role']}\\n{m['content']}<|im_end|>\\n")
    parts.append("<|im_start|>assistant\\n")
    return "".join(parts)

def build_labels(input_ids, prompt_len, ignore_index=-100):
    """只保留 assistant 部分的标签。"""
    return [ignore_index] * prompt_len + list(input_ids[prompt_len:])

messages = [
    {"role": "system", "content": "你是一个数据分析助手"},
    {"role": "user", "content": "1+1等于几？"},
]
prompt = build_chatml(messages)
answer = "2<|im_end|>"

print("=== 序列化后的 prompt ===")
print(prompt)
print("=== 完整训练样本 ===")
print(prompt + answer)

prompt_ids = list(range(len(prompt)))
answer_ids = list(range(1000, 1000 + len(answer)))
input_ids = prompt_ids + answer_ids

labels = build_labels(input_ids, len(prompt_ids))
print()
print(f"input_ids 长度: {len(input_ids)}")
print(f"labels 中 -100 的数量: {labels.count(-100)} (prompt 部分被掩掉)")
print(f"labels 中有效标签数: {len(labels) - labels.count(-100)} (只有 answer 参与损失)")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-b4-c1-e1',
        type: 'single',
        difficulty: 2,
        question: 'SFT（监督微调）的核心作用是？',
        options: [
          { value: 'A', text: '给模型注入新的知识' },
          { value: 'B', text: '教会模型按指令回答的格式与风格，激活预训练已有能力' },
          { value: 'C', text: '提升模型的参数规模' },
          { value: 'D', text: '替代预训练' },
        ],
        answer: 'B',
        explanation:
          'SFT 是激活而非注入。模型做不到的事 SFT 也教不会，它只是让模型把预训练中已具备的能力以正确格式表现出来。',
        tags: ['SFT'],
      },
      {
        id: 'llm-b4-c1-e2',
        type: 'judge',
        difficulty: 2,
        question: 'SFT 训练时应该在整条序列（包括用户指令部分）上计算损失。',
        answer: false,
        explanation:
          '应该只对 assistant 回复部分算损失（loss masking，其余位置设为 -100）。否则模型会学会生成用户问题，且指令 token 往往更多会主导梯度。',
        tags: ['损失掩码'],
      },
      {
        id: 'llm-b4-c1-e3',
        type: 'multiple',
        difficulty: 3,
        question: 'SFT 可能带来的问题有？（多选）',
        options: [
          { value: 'A', text: '灾难性遗忘：通用能力退化' },
          { value: 'B', text: '过拟合：数据量小导致评测不升反降' },
          { value: 'C', text: '风格单一：数据来源单一时学到固定腔调' },
          { value: 'D', text: '模型参数量减少' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误。A/B/C 都是真实问题，缓解方法分别是：小学习率 + 混入预训练数据、早停 + LoRA、多来源数据混合。',
        tags: ['SFT 问题'],
      },
      {
        id: 'llm-b4-c1-e4',
        type: 'fill',
        difficulty: 3,
        question: '推理时使用的对话模板必须与训练时 ___，否则模型效果会断崖式下降。',
        blanks: [['一致', '相同', '一样', '保持一致']],
        explanation:
          'Chat Template 不一致是最常见的部署事故。模型学到的格式是精确的 token 序列，换了模板等于换了输入分布。',
        tags: ['Chat Template'],
      },
      {
        id: 'llm-b4-c1-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现 ChatML 序列化：build_chatml(messages)，把消息列表转成 ChatML 格式字符串。\n\n每条消息格式为 im_start 标记 + role + 换行 + content + im_end 标记 + 换行。\n最后追加一行只含 assistant 起始标记（不带 im_end）。',
        starterCode: `def build_chatml(messages):
    parts = []
    for m in messages:
        parts.append(f"<|im_start|>{m['role']}\\n{m['content']}<|im_end|>\\n")
    ___
    return "".join(parts)


build_chatml([{"role":"user","content":"你好"}])
`,
        setupCode: '',
        expectedOutput: '以 assistant 起始标记结尾',
        tests: `out = build_chatml([{"role":"user","content":"你好"}])
assert "<|im_start|>user" in out, "应包含 user 起始标记"
assert "你好" in out
assert "<|im_end|>" in out
assert out.endswith("<|im_start|>assistant\\n"), "应以后缀 assistant 标记结尾"
out2 = build_chatml([{"role":"system","content":"助手"},{"role":"user","content":"问"}])
assert out2.count("<|im_start|>") == 3, "应有 3 个起始标记"
assert out2.count("<|im_end|>") == 2, "应有 2 个结束标记"
`,
        answer: `def build_chatml(messages):
    parts = []
    for m in messages:
        parts.append(f"<|im_start|>{m['role']}\\n{m['content']}<|im_end|>\\n")
    parts.append("<|im_start|>assistant\\n")
    return "".join(parts)


build_chatml([{"role":"user","content":"你好"}])`,
        explanation:
          '关键在最后一行：追加 assistant 起始标记但不闭合，因为模型要接着生成回答。\n\n生成的第一个 token 就是回答的开头，模型会一直生成直到输出 im_end 标记。',
        tags: ['编程', 'Chat Template'],
      },
      {
        id: 'llm-b4-c1-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现损失掩码：build_labels(input_ids, prompt_len, ignore_index=-100)。\n\n前 prompt_len 个位置设为 ignore_index，其余保持不变。',
        starterCode: `def build_labels(input_ids, prompt_len, ignore_index=-100):
    return ___

build_labels([10,11,12,13,14], 3)
`,
        setupCode: '',
        expectedOutput: '[-100, -100, -100, 13, 14]',
        tests: `out = build_labels([10,11,12,13,14], 3)
assert out == [-100,-100,-100,13,14], f"结果不正确: {out}"
assert len(out) == 5, "长度应与输入一致"
assert build_labels([1,2,3], 0) == [1,2,3], "prompt_len=0 应全部保留"
assert build_labels([1,2,3], 3) == [-100,-100,-100], "prompt_len=全长应全部掩掉"
assert build_labels([1,2], 1, ignore_index=0) == [0, 2], "应支持自定义 ignore_index"
`,
        answer: `def build_labels(input_ids, prompt_len, ignore_index=-100):
    return [ignore_index] * prompt_len + list(input_ids[prompt_len:])


build_labels([10,11,12,13,14], 3)`,
        explanation:
          '-100 是 PyTorch CrossEntropyLoss 的默认 ignore_index——该位置不参与损失计算也不产生梯度。\n\n这是 SFT 训练最关键的一行代码。',
        tags: ['编程', '损失掩码'],
      },
      {
        id: 'llm-b4-c1-e7',
        type: 'judge',
        difficulty: 3,
        question: 'SFT 数据量越多效果越好，所以应该尽可能收集海量指令数据。',
        answer: false,
        explanation:
          'LIMA 论文证明 1000 条精选数据就能显著改变模型行为。数据量过大会引入噪声，质量才是关键。主流开源模型多用 5 万~10 万条高质量数据。',
        tags: ['数据质量'],
      },
      {
        id: 'llm-b4-c1-e8',
        type: 'open',
        difficulty: 4,
        question:
          '请解释 SFT 的完整流程：从数据构造、模板序列化、损失掩码到训练配置，并说明为什么 SFT 只能「激活」而不能「注入」能力。',
        referenceAnswer: `**一、数据构造**

1. 任务类型均衡：问答、摘要、改写、代码、推理、多轮对话都要有；
2. 难度分层：简单到复杂都有；
3. 拒绝样本：教模型在不知道时说「我不确定」；
4. 规模：5 万~10 万条高质量数据通常足够（LIMA 证明 1000 条精选也能显著改行为）；
5. 去重与去污染：与评测集做 n-gram 重叠检查。

**二、模板序列化（ChatML 示例）**

    im_start system / 你是一个助手 / im_end
    im_start user / 问题 / im_end
    im_start assistant / 回答 / im_end

关键点：
- 特殊 token 必须加入词表并参与训练；
- 训练与推理必须用完全相同的模板。

**三、损失掩码**

    labels = input_ids.clone()
    labels[:prompt_len] = -100
    loss = cross_entropy(logits, labels)

为什么必须掩码：
1. 不掩码会让模型学会生成用户问题；
2. 指令部分 token 通常远多于回答，会主导梯度方向；
3. 掩码后梯度聚焦在如何回答上。

**四、训练配置**

| 超参 | 典型值 | 说明 |
| --- | --- | --- |
| 学习率 | 1e-5 ~ 2e-5 | 远小于预训练，防遗忘 |
| epoch | 1~3 | 多了过拟合 |
| batch size | 32~128 | 视显存 |
| 序列长度 | 2048~4096 | 覆盖多轮对话 |
| warmup | 3%~5% | 稳定初期 |
| LoRA | 可选 | 参数少、不易过拟合、成本低 |

**五、为什么 SFT 只能激活不能注入**

根本原因：SFT 用的是交叉熵损失，它最大化训练数据的似然。
这只可能重新加权模型已有的输出分布，不能创造新的分布。

具体地：
- 如果模型在预训练时从未见过某个知识，SFT 数据里出现它，
  模型只能靠记忆这一条样本，无法泛化；
- 如果某个推理能力在预训练中已存在（只是没被调出来），
  SFT 少量数据就能激活它。

类比：SFT 像教一个人用正确的方式表达他已经懂的东西，
而不是教他全新的知识——后者需要预训练、RAG 或工具调用。

实证：LIMA 论文的核心发现正是少量高质量数据就能让基座模型表现出对话能力，
说明这些能力本就在预训练中存在，SFT 只是激活它们。`,
        rubric: [
          { point: '数据构造：均衡、分层、拒绝样本、去污染', score: 2 },
          { point: 'ChatML 格式正确且强调特殊 token 入词表', score: 2 },
          { point: '损失掩码的实现与三条理由', score: 2 },
          { point: '训练配置（学习率/epoch/LoRA）', score: 2 },
          { point: '解释激活而非注入的根本原因（交叉熵只重加权）', score: 2 },
        ],
        keywords: ['ChatML', '损失掩码', 'LIMA', '学习率', '重加权', '激活'],
        explanation:
          '这是 SFT 的综合题。能说清交叉熵只重加权已有分布这个本质，就真正理解了 SFT 的能力边界。',
        tags: ['SFT', '综合'],
      },
    ],
  },
];
