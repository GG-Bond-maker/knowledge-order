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
## 学习目标

学完本节，你应该能够：
1. 写出 SFT 训练样本的三要素：指令、回答、损失掩码（只对回答算损失）；
2. 说明 Chat 模板的角色标记如何与掩码配合，防止"学着复述问题"；
3. 用代码构造一个最小训练 batch（含掩码），并解释掩码错误的三种典型症状。

## 前置知识

- 交叉熵与下一 token 预测（llm-a2 c1-l1）；
- 分词与模板（llm-a1 c1）。

## 问题背景：预训练模型不会"听话"，SFT 教它

预训练目标是"续写全网文本"——你问"写一首诗"，它可能续写"这个问题在知乎上有很多讨论"。SFT（Supervised Fine-Tuning）用**指令-回答对**微调：模型学的不是"接话"，而是**"在指令后生成回答"**。决定成败的除了数据质量，还有一个低调的主角：**损失掩码**——算损失时只看回答部分、忽略指令部分。

## 直觉理解：改卷只改答题区

SFT 样本像一张试卷：题干（指令+历史）+ 答题区（回答）。**改卷只改答题区**——若把题干也算进损失，模型会学着"复述问题"（把指令 token 也当预测目标），风格跑偏且浪费容量。损失掩码就是那张"只圈答题区"的红笔：题干位置 label 置 −100（PyTorch 交叉熵忽略值），只在回答位置照常计损失。

## 核心概念：样本结构与模板

\`\`\`text
<|im_start|>user
把下句翻译成英文：今天天气很好<|im_end|>
<|im_start|>assistant
The weather is nice today.<|im_end|>
\`\`\`

三要素对齐到 token 级：
- \`input_ids\`：整段全文的 token；
- \`labels\`：**user 段全部 −100**；assistant 段（含结尾标记）保留 token id；
- 结尾标记（\`<|im_end|>\`）**必须计损失**——否则模型不知道何时停笔，生成到天荒地老。

## 原理详解：掩码错误的三种症状

1. **漏掩 user 段**：模型学会"复读指令再回答"，且对提示词过拟合；
2. **漏掩结尾标记**：不会停——每次回答后继续编造下一轮对话；
3. **掩到结尾标记（−100 吃掉 im_end）**：与 2 同症状的反向操作错误；
4. **多轮对话只训最后一轮**：常见模板把历史轮全部掩掉——对"多轮指令跟随"任务丢失训练信号（业界两种做法都存在，须知自己选了哪种）。

## 完整案例：最小 batch 构造

\`\`\`python
# 简化字典: 词汇表 {"<|im_start|>":1, "user":2, "\\n":3, "assistant":4,
#   "<|im_end|>":5, "今天":6, "天气":7, "很好":8, "The":9, ...}
ids  = [1,2,3, 6,7,8, 5, 1,4,3, 9,10,11, 5]     # 全文 token（示意）
roles = ["S","S","S", "U","U","U", "U", "S","S","S", "A","A","A", "A"]
labels = [t if r == "A" else -100 for t, r in zip(ids, roles)]
print(list(zip(ids, labels)))
loss_tokens = sum(1 for l in labels if l != -100)
print(f"计损失 token 数: {loss_tokens}/{len(ids)}")
\`\`\`

预期输出：前 10 个位置全为 −100，仅 assistant 段 4 个位置计损失（含结尾标记）——**14 token 的样本只有 4 个在"改卷"**。**常见错误**：掩码按字符切再对齐 token（边界错位）；训练与推理模板不一致（模板漂移是 SFT 头号翻车点）；打包多条样本时跨样本掩码泄漏。

## 常见误区

1. **SFT 数据越多越好**——1 万条高质量 > 100 万条噪声（LIMA 论文"少而精"路线：arXiv:2305.11206）；
2. **回答越长越好**——长度偏差会传染给模型（变啰嗦）；
3. **损失掩码是框架自动的**——取决于实现与模板配置，**必须检查** labels 的实际分布；
4. **多轮全训 vs 末轮训练随便选**——影响模型行为（是否会主动引导对话），要按任务选并记录。

## 知识关联

- **向前**：交叉熵（llm-a2）+ 分词模板（llm-a1）在此会师；
- **向后**：b4-c2 的 DPO/RLHF 都以 SFT 产物为起点；
- **平行**：quant 课的"样本泄漏防护"与掩码对齐同为"训练信号边界"问题。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 三要素 | 指令 / 回答 / 损失掩码（只训回答） |
| 停笔标记 | 结尾 token 必须计损失 |
| 锚点 | 14 token 样本仅 4 个计损失 |
| 头号坑 | 训练-推理模板不一致、掩码边界错位 |

## 参考资料

> **来源类型：学术来源**
> - Zhou, C., et al. (2023). "LIMA: Less Is More for Alignment." *NeurIPS 2023*. arXiv:2305.11206——千条级精选数据的 SFT 路线。
> **来源类型：官方文档**
> - HuggingFace TRL \`SFTTrainer\` 文档——completion_only_loss 与模板处理。
> **来源类型：原创**
> - 改卷比喻与最小 batch 演示为本课程改编。
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
        relatedLessonId: 'llm-b4-c1-l1',
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
        relatedLessonId: 'llm-b4-c1-l1',
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
        relatedLessonId: 'llm-b4-c1-l1',
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
        relatedLessonId: 'llm-b4-c1-l1',
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
        relatedLessonId: 'llm-b4-c1-l1',
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
        relatedLessonId: 'llm-b4-c1-l1',
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
        relatedLessonId: 'llm-b4-c1-l1',
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
        relatedLessonId: 'llm-b4-c1-l1',
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
