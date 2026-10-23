import type { Chapter } from '../../types';
import { llmB3Extra } from './llm-b3-extra';

/** 《推理与部署工程》章节 */
export const llm_b3Chapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'llm-b3-c1',
    title: '微调、对齐与部署工程',
    goal: '掌握全参微调与 LoRA、QLoRA 等参数高效方法的取舍，能构造指令微调数据、理解 RLHF 与 DPO，并建立上线后的评测、成本与监控闭环。',
    lessons: [
      {
        id: 'llm-b3-c1-l1',
        title: '从预训练到对齐：为什么要后训练',
        content: `
## 预训练模型的"能用"与"好用"

预训练模型学会的是"预测下一个 token"：它知道大量事实、语法与推理模式，但并不天然知道"应该怎么回答用户"。直接让基座模型接任务，常见表现是：

- 把问题续写成新的问题（"北京是中国的什么？首都还有广州、上海……"）；
- 输出格式不可控；
- 对有害请求不拒绝；
- 不知道"回答不清楚时承认不知道"。

后训练（Post-training）就是把"能力"转化为"可用行为"的过程，通常分三步：

1. **监督微调 SFT**：用"指令-回答"对教模型遵循格式与指令；
2. **偏好对齐 RLHF / DPO**：用人类偏好数据调整风格、有用性与安全性；
3. **推理增强与蒸馏**：用更强的模型或可验证奖励提升特定能力（数学、代码）。

## 什么时候该微调，什么时候不该

| 需求 | 推荐做法 |
| --- | --- |
| 改变输出格式/风格 | 提示工程 + few-shot，通常够用 |
| 注入大量私有知识 | RAG，而不是微调（知识更新快、可追溯） |
| 固定领域的细分任务（分类、抽取、改写） | 微调小模型，效果好且便宜 |
| 需要稳定遵循复杂规则（多约束、强格式） | SFT 微调 |
| 需要降低延迟与成本 | 蒸馏到小模型 + 微调 |
| 需要新的推理能力 | 继续预训练 + 大规模后训练（成本极高） |

**关键判断**：微调擅长"改变行为与格式"，不擅长"记住新知识"。知识型需求优先考虑 RAG；两者可以结合——先用 RAG 提供事实，再用微调固定回答的结构与口径。

## 数据、算法、工程三要素

一次成功的微调取决于：

1. **数据**（约 60% 权重）：数量够不够、质量高不高、覆盖是否全面、有无泄漏；
2. **算法**（约 20%）：全参还是 PEFT、学习率、批次、序列长度、loss 掩码；
3. **工程**（约 20%）：显存、并行、评测、部署与服务化。

现实中最常见的失败原因是数据问题，而不是算法选择。

## 一次典型的微调项目流程

1. **定义任务与评测**：先写 100 条测试集，明确"成功的标准"；
2. **构造数据**：人工标注 + 模型生成后人工审核 + 从生产日志挖掘；
3. **基线**：先不微调，用提示工程 + few-shot 跑一遍评测，得到对照基线；
4. **训练**：从小规模 LoRA 开始，只跑几百步看 loss 与生成样例；
5. **评测**：客观指标 + LLM 裁判 + 人工抽检，三者交叉验证；
6. **部署**：量化、合并适配器、压测、灰度；
7. **迭代**：把线上 badcase 转成新的训练样本。

## 常见误区

1. 一上来就全参微调 7B 模型，结果过拟合且改变过多行为；
2. 没有测试集，只凭"看起来变好了"上线；
3. 训练数据里混入了测试集内容（数据泄漏），评测虚高；
4. 忽视 chat template，训练格式与推理格式不一致，效果大打折扣。

<RLHFArchDemo />
`,
        tips: [
          {
            kind: 'interview',
            text: '必答：微调与 RAG 的区别。微调改参数、改变行为与格式、知识更新需重新训练；RAG 不改参数、知识可实时更新、可溯源源文档。二者常配合使用。',
          },
          {
            kind: 'pitfall',
            text: '训练时使用的 chat template 必须与推理完全一致（包括特殊 token、system 段、结束符）。不一致是"SFT 后效果反而变差"的头号原因。',
          },
          {
            kind: 'leak',
            text: '先把评测集写出来再准备数据。没有评测的微调就是盲飞，"感觉变好了"往往只是风格变化。',
          },
          {
            kind: 'note',
            text: '后训练的边际收益递减很快：数据从 1 千条到 1 万条提升明显，从 10 万到 100 万可能只提升一点。先解决数据质量再谈数量。',
          },
        ],
        demos: [
          {
            title: '基座模型的续写倾向与 SFT 后的指令遵循（模拟对比）',
            lang: 'python',
            code: `BASE_TEMPLATE = "{prompt}"                     # 基座：直接续写
SFT_TEMPLATE = "<|system|>你是助手<|end|><|user|>{prompt}<|end|><|assistant|>"

prompts = [
    "请把下面这句话改写成正式书面语：这事儿挺好",
    "中国的首都是哪里？",
]

for p in prompts:
    print("问题:", p)
    print("  基座输入  :", BASE_TEMPLATE.format(prompt=p))
    print("  基座典型输出: （把问题当成续写素材）'中国的首都是哪里？北京是……'")
    print("  SFT 输入  :", SFT_TEMPLATE.format(prompt=p))
    print("  SFT 典型输出: 直接给出答案并结束于 <|end|>")
    print()

print("要点：模板的三处差异都很致命——特殊 token、角色标记、结束符。")
print("若训练用 SFT 模板而推理用 BASE 模板，模型会退化成续写模式。")`,
          },
        ],
      },
      {
        id: 'llm-b3-c1-l2',
        title: '全参微调与 LoRA/QLoRA：原理与显存账本',
        content: `
## 全参微调（Full Fine-tuning）

更新模型全部参数。优点是表达能力强；代价是显存与灾难性遗忘：

- **参数显存**：N 个参数 × 2 字节（BF16）；
- **梯度**：再 × 2 字节；
- **优化器状态**（Adam 的动量与方差）：再 × 8 字节（FP32）。

合计约 **16 N 字节**，7B 模型约 112 GB，远超单卡容量。因此全参微调必须配合 ZeRO（把参数、梯度、优化器状态分片到多卡）、FSDP 或张量并行。

## LoRA：低秩增量

Hu et al.（2021）提出：冻结原权重 W（形状 d 乘 k），只训练一个低秩分解的增量：

W' = W + (alpha / r) · B · A

其中 A 形状 [r, k]、B 形状 [d, r]，r 远小于 d（常见 8、16、32、64）。A 用高斯初始化、B 初始化为零，保证训练开始时增量恰好为 0，不打乱原有能力。

**参数量对比**：原矩阵 d×k，LoRA 为 r×(d+k)。以 d=k=4096、r=16 为例：原 16.7M，LoRA 仅 131K，约为 0.8%。

LoRA 的优势：

1. **显存大降**：只保存适配器的梯度与优化器状态；
2. **可插拔**：一个基座配多个适配器（客服、代码、法务），按请求切换；
3. **易合并**：推理时可把 B·A 加回 W'，零额外延迟；
4. **减轻遗忘**：原权重不动，行为漂移更小。

## 关键超参数

| 参数 | 含义 | 经验值 |
| --- | --- | --- |
| r | 秩，决定容量 | 8~64（简单任务 8，复杂任务 32~64） |
| alpha | 缩放因子 | 常取 2r 或 r |
| target_modules | 应用到哪些层 | 至少 q_proj 与 v_proj，效果更好时加上 k、o 与 MLP |
| dropout | 防过拟合 | 0~0.1 |
| learning_rate | 学习率 | 1e-4 ~ 2e-4（远高于全参微调的 1e-5） |

## QLoRA：4bit 基座 + LoRA

Dettmers et al.（2023）的 QLoRA 用三项技术把 65B 模型塞进 48GB：

1. **4-bit NormalFloat（NF4）**：按正态分位数设计量化区间，适配预训练权重的分布；
2. **双重量化**：对量化常数本身再量化，进一步省显存；
3. **分页优化器**：显存峰值时把优化器状态换出到 CPU，避免 OOM。

效果：4bit 基座 + BF16 LoRA 训练，在多数评测上接近 16bit 全参微调。

## 显存估算公式

训练显存 ≈ 基座权重 + 激活值 + 梯度与优化器（仅可训练部分）

- 基座：N × bytes（BF16 为 2，NF4 约 0.5 加少量常数）
- LoRA 可训练参数 P：P × 16 字节（梯度 2 加 Adam 8，BF16 参数 2 加对齐开销）
- 激活值：与 batch × 序列长度 × 层数 成正比，可用梯度检查点换来更多显存（代价是约 30% 的速度）

## 选型建议

- **数据少、任务窄（< 1 万条）**：LoRA r=8~16，冻结基座，先跑通再调；
- **需要较大行为改变**：LoRA r=32~64 并扩大到全部线性层，或考虑全参微调；
- **单卡资源有限**：QLoRA 4bit；
- **多任务并存**：每个任务一个 LoRA 适配器，共用基座。

**结论**：绝大多数业务微调用 LoRA 就够，全参微调通常只在"改变模型的核心能力"时才必要。

<WeightNoiseDemo />
`,
        tips: [
          {
            kind: 'interview',
            text: '被问"LoRA 为什么能省显存"，要答三点：冻结基座所以没有它的梯度与优化器状态；可训练参数极少；推理时可合并因此没有额外延迟。',
          },
          {
            kind: 'pitfall',
            text: 'alpha 与 r 要一起调。只调 r 而保持 alpha 不变，会让缩放系数 alpha/r 变化，等效学习率也跟着变了，实验结论容易混淆。',
          },
          {
            kind: 'performance',
            text: 'LoRA 的显存瓶颈常常是**激活值**而不是参数。seq_len 翻倍会让激活值近似翻倍，必要时启用梯度检查点或减小 micro-batch 并增加梯度累积。',
          },
          {
            kind: 'note',
            text: 'QLoRA 的基座是 4bit 量化的，合并后的 LoRA 适配器若直接加回量化权重需要反量化；生产部署通常选择"4bit 基座 + 运行时加载 LoRA"，或用 vLLM 的原生适配器支持。',
          },
        ],
        demos: [
          {
            title: 'LoRA 参数量与显存账本计算',
            lang: 'python',
            code: `def lora_params(d, k, r):
    return r * (d + k)

def full_params(d, k):
    return d * k

print("单个线性层 d=k=4096：")
for r in (4, 8, 16, 32, 64):
    lp, fp = lora_params(4096, 4096, r), full_params(4096, 4096)
    print(f"  r={r:2d}  LoRA 参数 {lp / 1e6:6.3f}M  ({lp / fp:.2%} of 全参)")

# 以 LLaMA-7B 量级估算（每层 q,k,v,o 各 4096x4096，FFN 三层）
d = 4096
per_layer = 4 * d * d + 3 * d * 11008
n_layers = 32
total = per_layer * n_layers + 32000 * d
print()
print(f"模型量级参数: {total / 1e9:.2f}B")
r = 16
lora_total = n_layers * 4 * lora_params(d, d, r)
print(f"仅 q/k/v/o 挂 LoRA(r={r}): {lora_total / 1e6:.1f}M 参数  ({lora_total / total:.3%})")

GB = 1024 ** 3
for name, bytes_per in (("全参 BF16", 2), ("全参 + Adam 约", 16)):
    print(f"{name}: {total * bytes_per / GB:.1f} GiB")
print(f"LoRA 可训练参数（约 16 字节/参数）: {lora_total * 16 / GB:.2f} GiB")
print(f"冻结基座 BF16: {total * 2 / GB:.1f} GiB")
print(f"冻结基座 NF4 : {total * 0.5 / GB:.1f} GiB")`,
          },
          {
            title: 'LoRA 初始化与合并等价性验证',
            lang: 'python',
            code: `import numpy as np

rng = np.random.default_rng(0)
d = k = 8
W = rng.normal(0, 0.1, size=(d, k))
A = rng.normal(0, 0.01, size=(2, k))
B = np.zeros((d, 2))
alpha, r = 4.0, 2

def forward(x, W, A, B, alpha, r):
    return x @ W.T + (alpha / r) * (x @ A.T @ B.T)

x = rng.normal(size=(1, k))
out0 = forward(x, W, A, B, alpha, r)
print("B 初始化为 0 时增量是否为 0:", np.allclose(out0, x @ W.T))

B = rng.normal(0, 0.01, size=(d, 2))
out1 = forward(x, W, A, B, alpha, r)
W_merged = W + (alpha / r) * B @ A
out2 = x @ W_merged.T
print("合并后推理结果与训练时一致:", np.allclose(out1, out2, atol=1e-12))

print()
print("增量矩阵秩的上界 = r =", np.linalg.matrix_rank(B @ A), "（远小于 d =", d, "）")
print("这就是低秩假设：任务适配只需在很小的子空间里做修改。")`,
          },
        ],
      },
      {
        id: 'llm-b3-c1-l3',
        title: '指令微调数据：构造、格式与质量控制',
        content: `
## 一条高质量的 SFT 样本长什么样

典型结构（与 chat template 对应）：

\`\`\`json
{"messages": [
  {"role": "system", "content": "你是银行的合规助理，只依据提供的政策回答"},
  {"role": "user", "content": "这笔跨行转账需要多久到账？"},
  {"role": "assistant", "content": "依据《跨行清算说明》第 3 条：……"}
]}
\`\`\`

要点：

1. **只对 assistant 段计算损失**，user 与 system 段 mask 掉。否则模型会学着"自己生成问题"，推理时更容易跑偏；
2. 结尾必须有 eos（结束符），否则模型学不到何时停止；
3. 多轮对话要保留完整历史，并保证角色交替正确。

## 数据来源的四条路

| 来源 | 优点 | 风险 |
| --- | --- | --- |
| 人工标注 | 质量最高 | 贵、慢 |
| 强模型生成 + 人工审核 | 规模与质量兼顾（Self-Instruct、Evol-Instruct） | 需要审核流程，容易同质化 |
| 生产日志挖掘 | 贴近真实分布 | 含隐私与噪声，需脱敏 |
| 规则/模板合成 | 便宜 | 多样性差，容易学到模板 |

实践中通常是**混合**：少量精标种子 + 强模型扩展 + 线上 badcase 补充。

## 数据多样性的几个维度

- **任务类型**：问答、改写、抽取、分类、多步推理、拒答；
- **难度**：简单格式任务与困难推理任务各占一定比例；
- **长度**：短回答与长回答都要有（否则模型只会输出某一长度）；
- **拒答样本**：必须包含"无法回答时怎么说"的样本，否则模型会幻觉；
- **负例**：告诉模型"什么不该做"，可用偏好对承载。

## 质量控制清单

1. **去重**：精确去重（哈希）与近邻去重（MinHash / embedding 相似度）；
2. **格式校验**：可解析、角色交替正确、无空回复；
3. **事实校验**：涉及事实的回答需人工或检索核对；
4. **泄漏检查**：n-gram 重叠度检查训练集与测试集，避免评测虚高；
5. **长度分布**：统计输入输出长度分布，与线上预期一致；
6. **模板化检测**：同一句式占比过高要补充多样性。

## 数据量经验

- 任务简单的格式对齐：500~3000 条往往就够；
- 领域知识问答：1 万~10 万条；
- 通用能力提升：需数十万到百万级，且要与预训练分布混合（防止灾难性遗忘）；
- 记住经验：**质量大于数量**，1000 条精标通常胜过 1 万条机器生成未审核数据。

## 训练中的三个常见坑

1. **模板不一致**：训练用模板 A、推理用模板 B；
2. **padding 未屏蔽**：loss 把 pad 也算进去；
3. **学习率过高**：LoRA 1e-4 到 2e-4 尚可，全参微调用 1e-4 极易发散。
`,
        tips: [
          {
            kind: 'interview',
            text: '被问"SFT 数据如何构造"，按"来源混合（精标、强模型生成加审核、线上日志）、多样性维度、质量控制清单、只对 assistant 段算 loss"四层回答，层次清晰。',
          },
          {
            kind: 'pitfall',
            text: '忘记在样本末尾加 eos，模型学不会停止，推理时会一直生成直到撞到 max_tokens，表现为"话痨"。',
          },
          {
            kind: 'leak',
            text: '用 MinHash 或 embedding 相似度对训练集与评测集做近邻去重。只做精确去重会漏掉改写过的重复样本，造成评测虚高。',
          },
          {
            kind: 'note',
            text: '合成数据要保留生成来源与审核状态字段，便于后续排查"某类问题突然变差"是否由某批合成数据导致。',
          },
        ],
        demos: [
          {
            title: 'SFT 损失掩码：只对 assistant 段计算损失',
            lang: 'python',
            code: `import numpy as np

tokens = ["<|sys|>", "你是助手", "<|end|>", "<|user|>", "北京", "首都", "<|end|>", "<|assist|>", "是", "北京", "<|eos|>"]
roles = ["system", "system", "system", "user", "user", "user", "user", "assistant", "assistant", "assistant", "assistant"]

labels = [t if r == "assistant" else -100 for t, r in zip(tokens, roles)]
mask = np.array([l != -100 for l in labels])

print("token 与标签：")
for t, r, l in zip(tokens, roles, labels):
    print(f"  {t:10s} role={r:9s} label={l}")

n_valid = int(mask.sum())
print()
print("有效训练 token 数:", n_valid, "/", len(tokens))
print("被掩码的比例: %.0f%%" % (100 * (1 - n_valid / len(tokens))))
print()
print("注意：system 与 user 段被设为 -100，不参与损失；assistant 段与 eos 参与。")`,
          },
          {
            title: '训练集与评测集泄漏检查（n-gram 重叠）',
            lang: 'python',
            code: `def grams(text, n=5):
    t = text.replace(" ", "")
    return {t[i:i + n] for i in range(max(0, len(t) - n + 1))}

train = [
    "跨行转账一般需要一到三个工作日到账",
    "本行转账实时到账，跨行需清算时间",
]
test = [
    "跨行转账一般需要几个工作日到账？",
    "信用卡年费如何减免",
]

for q in test:
    gq = grams(q)
    best, best_overlap = None, 0.0
    for t in train:
        gt = grams(t)
        if not gq:
            continue
        ov = len(gq & gt) / len(gq)
        if ov > best_overlap:
            best, best_overlap = t, ov
    flag = "疑似泄漏" if best_overlap > 0.5 else "正常"
    print(f"问题: {q}")
    print(f"  最相似训练样本: {best}")
    print(f"  5-gram 覆盖率: {best_overlap:.2f}  [{flag}]")
    print()

print("提示：阈值要按任务调。问答任务 0.5 以上高度可疑，改写类任务阈值应更高。")`,
          },
        ],
      },
      {
        id: 'llm-b3-c1-l4',
        title: 'RLHF 与 DPO：让模型对齐偏好',
        content: `
## 为什么 SFT 不够

SFT 只教模型"模仿"示教答案，无法表达"两个回答里哪个更好"。而人类偏好往往是**相对的**：同样正确，一个更简洁、更礼貌、更安全。RLHF 与 DPO 就是利用"成对比较"来优化这种相对偏好。

## RLHF 的标准三步

1. **SFT**：得到初始策略 pi_SFT；
2. **奖励建模（RM）**：对同一问题的两个回答 (y_w 好, y_l 差) 训练奖励函数：

L_RM = - log sigma(r(x, y_w) - r(x, y_l))

即让好答案的奖励比差答案高，差值越大越好（Bradley-Terry 模型的极大似然）；

3. **强化学习（PPO）**：最大化

目标 = E[ r(x, y) ] - beta · KL( pi_theta 与 pi_SFT 的 KL 散度 )

其中 KL 项防止策略偏离太远（否则模型会钻奖励模型的漏洞，即 reward hacking）。

PPO 需要同时维护策略、参考、奖励、价值四个模型，显存与工程复杂度都很高。

## DPO：把 RL 变成监督学习

Rafailov et al.（2023）的 Direct Preference Optimization 证明：在 KL 约束下的最优策略有闭式解，可以反推奖励，从而**跳过奖励模型与 RL 循环**，直接用偏好对训练：

L_DPO = - log sigma( beta · [ log(pi(y_w)/pi_ref(y_w)) - log(pi(y_l)/pi_ref(y_l)) ] )

直觉：提高好答案的相对对数概率、同时降低差答案的相对对数概率，beta 控制偏离参考模型的力度。

DPO 的优势：实现简单（一个训练循环、两个前向）、稳定、无需奖励模型。代价：离线偏好数据，无法像在线 RL 那样探索新策略；对数据分布敏感。

## 两者对比

| 维度 | RLHF (PPO) | DPO |
| --- | --- | --- |
| 需要奖励模型 | 是 | 否 |
| 训练复杂度 | 高（四模型） | 低（两模型） |
| 稳定性 | 较难调 | 较稳 |
| 数据利用 | 在线探索 | 离线固定 |
| 典型场景 | 大厂对齐流程 | 中小规模对齐、快速迭代 |

## 偏好数据的质量

一份好的偏好对要满足：同题、两个回答差异明确、比较理由可解释。常见问题：

- 长度偏差：标注者偏爱长回答，模型会学得啰嗦；
- 风格偏差：偏爱 Markdown 排版，导致所有输出都加列表；
- 标注一致率低：需要多人标注并计算一致性（Cohen kappa）。

## 在 LoRA 上做 DPO

实践中常用 LoRA 做 DPO：参考模型与策略模型共享 4bit 基座，只有适配器不同，显存开销可控。这也是开源社区（如 LLaMA-Factory、TRL、Unsloth）的主流做法。

<PreferenceLearningDemo />
`,
        tips: [
          {
            kind: 'interview',
            text: '必答：DPO 相比 PPO 省了什么？省掉奖励模型与在线 RL 采样，用 Bradley-Terry 假设把 KL 约束下的最优策略写成闭式解，直接优化偏好对数比。',
          },
          {
            kind: 'pitfall',
            text: 'DPO 的 beta 太小会让模型偏离参考模型太远（多样性崩溃），太大会几乎不学习。常用范围 0.1~0.5，需要在小规模上试。',
          },
          {
            kind: 'note',
            text: 'RLHF 中的 KL 惩罚是防 reward hacking 的关键。没有它，模型会找到"奖励高但人类不喜欢"的捷径（例如堆砌讨好用语）。',
          },
          {
            kind: 'leak',
            text: '偏好数据要控制长度分布：只拿"长答案作为正例"训练，模型会变成话痨，且推理成本上升。',
          },
        ],
        demos: [
          {
            title: '手算 Bradley-Terry 奖励损失与 DPO 目标',
            lang: 'python',
            code: `import numpy as np

def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-x))

# 奖励建模：让好答案奖励高于差答案
r_good, r_bad = 1.2, 0.4
loss_rm = -np.log(sigmoid(r_good - r_bad))
print(f"奖励差 = {r_good - r_bad:.2f}, RM 损失 = {loss_rm:.4f}")

for gap in (0.0, 1.0, 3.0, 6.0):
    print(f"  奖励差 = {gap:4.1f} -> 损失 = {-np.log(sigmoid(gap)):.4f}")

# DPO：对数概率比之差再乘 beta
beta = 0.1
logp_w, logp_w_ref = -0.8, -1.0
logp_l, logp_l_ref = -1.4, -1.0
margin = beta * ((logp_w - logp_w_ref) - (logp_l - logp_l_ref))
loss_dpo = -np.log(sigmoid(margin))
print()
print(f"好答案相对提升 = {logp_w - logp_w_ref:+.2f}")
print(f"差答案相对提升 = {logp_l - logp_l_ref:+.2f}")
print(f"DPO margin = {margin:+.3f}, 损失 = {loss_dpo:.4f}")
print()
print("若两个答案同时被抬高（如差答案提升更多），margin 变负，损失增大——")
print("这就是 DPO 只学'相对偏好'、不盲目提高所有回答概率的原因。")`,
          },
        ],
      },
      {
        id: 'llm-b3-c1-l5',
        title: '评测、成本与上线监控',
        content: `
## 评测的三层结构

1. **能力层**：通用基准（MMLU、GSM8K、HumanEval、C-Eval、CMMLU）判断模型是否"够聪明"；
2. **任务层**：业务自建的标注测试集，直接对应 KPI；
3. **安全与鲁棒层**：越狱、注入、敏感内容的红队集。

**基准分数高不等于业务好用**。落地时任务层评测权重应最大，通用基准只用于选型初筛。

## 评测方法对比

| 方法 | 优点 | 缺点 |
| --- | --- | --- |
| 精确匹配 / 规则 | 客观、便宜 | 只适合有确定答案的任务 |
| 语义相似度（BERTScore、embedding） | 容忍改写 | 不理解事实对错 |
| LLM 裁判 | 灵活、可扩展 | 有位置偏差与自我偏好，需校准 |
| 人工评估 | 最可靠 | 贵、慢 |

LLM 裁判的工程要点：

- 使用**成对比较**而不是 1~10 打分（绝对分数方差太大）；
- 交换两个候选的位置各评一次，消除位置偏差；
- 给出明确的评分标准（rubric）与示例；
- 定期用人工标注做一致性校准（报告 kappa）。

## 成本优化的五个层次

1. **模型路由**：简单请求用小模型，复杂请求用大模型，靠分类器或置信度路由；
2. **缓存**：精确缓存（相同输入）与语义缓存（相似问题）；
3. **上下文瘦身**：检索 top-k 收紧、历史摘要、prompt caching；
4. **推理优化**：量化、连续批处理、投机解码、speculative；
5. **输出约束**：限制最大输出、结构化输出减少冗余。

## 上线监控的关键指标

- **质量**：抽样人工评分、LLM 裁判分数、格式合法率、拒答率；
- **性能**：首 token 延迟、每 token 延迟的 P50/P95/P99、吞吐；
- **成本**：每请求 token、每千次请求成本、缓存命中率；
- **稳定性**：错误码分布、超时率、OOM、限流触发次数；
- **安全**：注入命中、敏感词命中、越权调用告警。

## 迭代闭环

\`\`\`
线上请求 → 抽样与打标 → badcase 聚类 → 归因（提示/检索/模型/数据）
   → 修复（改提示、补文档、加样本微调） → 回归评测 → 灰度 → 全量
\`\`\`

**关键**：每一次改动都要能回答"哪个指标会变化、如何验证"。没有回归集的团队只能在线上试错，成本极高。

## 灰度与回滚

- 按用户分桶灰度（1% → 5% → 20% → 100%）；
- 同时观察质量指标与性能指标；
- 准备一键回滚（模型版本、提示版本、索引版本都要能独立回退）；
- 版本号写进日志，便于归因。
`,
        tips: [
          {
            kind: 'interview',
            text: '被问"如何评估微调效果"，答题结构：任务层标注集（主）+ LLM 裁判成对比较（校准过）+ 人工抽检（校准裁判）+ 线上 A/B（最终裁决），并强调防数据泄漏。',
          },
          {
            kind: 'pitfall',
            text: 'LLM 裁判存在位置偏好（更爱第一个）与长度偏好（更爱长答案）。必须做位置交换与长度控制，否则评测结论会系统性偏移。',
          },
          {
            kind: 'performance',
            text: '成本优化的第一优先级通常是"上下文瘦身"而不是换模型：RAG 的 top-k 从 10 降到 5、开启 prompt caching，收益往往大于量化。',
          },
          {
            kind: 'leak',
            text: '模型版本、提示版本、检索索引版本三者都要独立版本化并可回退。很多"突然变差"是索引更新引起的，而非模型。',
          },
        ],
        demos: [
          {
            title: '多模型路由的成本与质量权衡',
            lang: 'python',
            code: `import numpy as np

rng = np.random.default_rng(0)
N = 10000
# 假设 70% 的请求是简单任务
is_simple = rng.random(N) < 0.7
accuracy_small = np.where(is_simple, 0.94, 0.62)
accuracy_large = 0.91

PRICE_SMALL = 0.5 / 1e6
PRICE_LARGE = 5.0 / 1e6
TOKENS = 800

def total_cost(acc_choice):
    cost = np.where(acc_choice == "small", TOKENS * PRICE_SMALL, TOKENS * PRICE_LARGE)
    acc = np.where(acc_choice == "small", accuracy_small, accuracy_large)
    return cost.sum(), acc.mean()

all_large = total_cost(np.array(["large"] * N))
all_small = total_cost(np.array(["small"] * N))
routed = total_cost(np.where(is_simple, "small", "large"))

print("策略              总成本(美元)   平均准确率")
for name, (c, a) in (
    ("全部大模型", all_large),
    ("全部小模型", all_small),
    ("按难度路由  ", routed),
):
    print(f"{name:16s} {c:10.2f}   {a:.3f}")

print()
print("路由策略在准确率与成本之间取得了折中——但前提是'难度分类器'本身要足够准。")`,
          },
          {
            title: 'LLM 裁判的位置偏差与交换校正',
            lang: 'python',
            code: `def judge(prompt, a, b):
    """模拟一个有位置偏差的裁判：更偏爱第一个候选。"""
    score_a = len(a) * 0.1 + 0.5      # 位置加分
    score_b = len(b) * 0.1
    return "A" if score_a >= score_b else "B"

candidates = [
    ("回答 A 更准确但更短", "回答 B 更长但啰嗦"),
    ("精简答案", "冗长答案"),
]

for a, b in candidates:
    first = judge("比较", a, b)
    second = judge("比较", b, a)
    # 交换位置后再统一到"A 赢/B 赢"
    second_mapped = "A" if second == "B" else "B"
    agree = first == second_mapped
    print(f"A={a}  B={b}")
    print(f"  原始顺序判定: {first};  交换后判定: {second_mapped};  一致: {agree}")
    if not agree:
        print("  -> 不一致说明存在位置偏差，应视为打平或交给人工")

print()
print("工程做法：成对比较加位置交换；统计不一致率作为裁判可靠性的指标。")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-b3-c1-e1',
        type: 'single',
        difficulty: 4,
        question: '业务需要在问答中注入公司最新一季度的财务数据，最合适的方案是？',
        options: [
          { value: 'A', text: '把数据做成 SFT 样本微调进模型参数' },
          { value: 'B', text: '用 RAG 检索数据并在提示中提供' },
          { value: 'C', text: '继续预训练整个模型' },
          { value: 'D', text: '在系统提示里写"请自行回忆财务数据"' },
        ],
        answer: 'B',
        explanation:
          '财务数据更新频繁且需要可溯源，RAG 可以在不重新训练的情况下更新知识并提供引用。SFT 会让模型"背"数据，更新时需重训且容易张冠李戴；继续预训练成本极高。',
        relatedLessonId: 'llm-b3-c1-l1',
        tags: ['微调 vs RAG', '工程选型'],
      },
      {
        id: 'llm-b3-c1-e2',
        type: 'judge',
        difficulty: 4,
        question: 'LoRA 训练时冻结了基座权重，因此把 LoRA 合并进基座后，推理时会带来额外的矩阵乘法开销。',
        answer: false,
        explanation:
          'LoRA 的增量可以预先合并：W 加 (alpha/r) 乘 B 乘 A 得到一个与原矩阵同形状的新权重，推理时与原模型完全一致、无额外开销。只有在运行时动态切换适配器时才需要额外计算。',
        relatedLessonId: 'llm-b3-c1-l2',
        tags: ['LoRA', '推理'],
      },
      {
        id: 'llm-b3-c1-e3',
        type: 'multiple',
        difficulty: 4,
        question: '关于 LoRA 与 QLoRA，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: 'LoRA 用低秩分解 B 乘 A 表示权重增量，参数量为 r 乘 (d 加 k)' },
          { value: 'B', text: 'QLoRA 用 4bit NF4 量化基座，并用双重量化与分页优化器进一步省显存' },
          { value: 'C', text: 'alpha 与 r 需要一起调整，因为缩放系数是 alpha 除以 r' },
          { value: 'D', text: 'LoRA 的秩 r 越大，训练就越不容易过拟合' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误：r 越大容量越强，越容易过拟合，同时参数与显存也增加。常见做法是先用小 r 试，效果不足再增大。',
        relatedLessonId: 'llm-b3-c1-l2',
        tags: ['LoRA', 'QLoRA'],
      },
      {
        id: 'llm-b3-c1-e4',
        type: 'fill',
        difficulty: 4,
        question: 'LoRA 的前向计算等价于原权重加上缩放后的低秩增量，补全表达式：\n\n```python\ndef lora_forward(x, W, A, B, alpha, r):\n    return x @ W.T + (___ ) * (x @ A.T @ B.T)\n```',
        blanks: [['alpha / r', 'alpha/r']],
        explanation:
          '缩放因子是 alpha 除以 r。B 初始化为 0，所以训练开始时增量恰好为 0，不破坏原有能力——这也是 LoRA 能"安全地"加在任意预训练模型上的原因。',
        relatedLessonId: 'llm-b3-c1-l2',
        tags: ['LoRA', '公式'],
      },
      {
        id: 'llm-b3-c1-e5',
        type: 'code',
        difficulty: 3,
        question:
          '计算 **LoRA 的参数量与占比**：给定 `d`、`k`、`r`，返回单个权重矩阵的 LoRA 参数量 `lora_p`、全参数量 `full_p` 与占比 `ratio`（保留 4 位小数）。\n\n参数设置：d = 4096、k = 4096、r = 16；再计算把 q/k/v/o 四个矩阵都挂 LoRA 后，相对 7B 模型（按 6.8e9 参数计）的占比 `model_ratio`（保留 6 位小数）。',
        starterCode: `d, k, r = 4096, 4096, 16
n_layers = 32
model_params = 6.8e9

lora_p = ___                 # 一个矩阵的 LoRA 参数
full_p = ___                 # 一个矩阵的全参数量
ratio = ___                  # 保留 4 位小数

total_lora = ___             # 32 层 x 4 个矩阵
model_ratio = ___            # 保留 6 位小数
`,
        setupCode: '',
        expectedOutput: 'lora_p = 131072，ratio = 0.0078，model_ratio 约 0.0025',
        tests: `assert lora_p == 131072, f"LoRA 参数量应为 131072，实际 {lora_p}"
assert full_p == 16777216, f"全参数量应为 16777216，实际 {full_p}"
assert abs(ratio - 0.0078) < 1e-9, f"ratio 应约为 0.0078，实际 {ratio}"
assert total_lora == 32 * 4 * 131072, f"total_lora 计算不正确：{total_lora}"
assert abs(model_ratio - 0.002467) < 1e-5, f"model_ratio 约 0.002467，实际 {model_ratio}"
assert lora_p < full_p / 100, "LoRA 参数量应远小于全参"
`,
        answer: `d, k, r = 4096, 4096, 16
n_layers = 32
model_params = 6.8e9

lora_p = r * (d + k)
full_p = d * k
ratio = round(lora_p / full_p, 4)

total_lora = n_layers * 4 * lora_p
model_ratio = round(total_lora / model_params, 6)
`,
        explanation:
          'LoRA 参数 = r 乘 (d + k)：A 是 [r, k] 共 r×k 个，B 是 [d, r] 共 d×r 个。b 本例 16 × 8192 = 131072，而全参是 4096 × 4096 = 16,777,216，占比约 0.78%。32 层乘 4 个矩阵共 1678 万参数，相对 68 亿参数只有约 0.25%。这就是"单卡可训 7B"的底气所在（配合 4bit 基座时更省）。',
        relatedLessonId: 'llm-b3-c1-l2',
        tags: ['LoRA', '参数估算'],
      },
      {
        id: 'llm-b3-c1-e6',
        type: 'code',
        difficulty: 4,
        question:
          '计算**训练显存账本**：给定参数量 `N`（单位：十亿）与是否使用 LoRA（`lora=True` 时基座冻结、可训练参数为 `N * 1e9 * 0.0025`），按以下规则估算并返回结果字典 `context`：\n\n- 全参 BF16：权重 2 字节、梯度 2 字节、Adam 状态 8 字节；\n- LoRA：基座权重 2 字节，可训练部分按 16 字节/参数；\n- 每项保留 2 位小数（单位 GiB，1 GiB = 1024 的 3 次方字节）。',
        starterCode: `GB = 1024 ** 3
BYTES_FULL = ___          # 全参：权重 2 加梯度 2 加 Adam 8
BYTES_LORA = ___          # LoRA 可训练部分：每参数 16 字节
LORA_RATIO = 0.0025

def memory_gib(n_params, lora=False):
    trainable = n_params * LORA_RATIO if lora else n_params
    base_bytes = n_params * 2
    train_bytes = trainable * (BYTES_LORA if lora else BYTES_FULL)
    return {
        "weights": round(base_bytes / GB, 2),
        "train": round(train_bytes / GB, 2),
        "total": round((base_bytes + train_bytes) / GB, 2),
    }

full = memory_gib(7e9, lora=False)
lora = memory_gib(7e9, lora=True)
context = (full, lora)
`,
        setupCode: '',
        expectedOutput: 'full.total 约 104.31 GiB，lora.total 约 13.28 GiB',
        tests: `assert abs(context[0]["total"] - 91.27) < 0.05, f"全参总显存约 91.27 GiB，实际 {context[0]['total']}"
assert abs(context[1]["total"] - 13.28) < 0.05, f"LoRA 总显存约 13.28 GiB，实际 {context[1]['total']}"
assert context[1]["train"] < context[0]["train"], "LoRA 的可训练部分应远小于全参"
assert context[0]["weights"] == context[1]["weights"], "两者基座权重字节数相同"
assert context[0]["total"] > context[1]["total"] * 5, "全参显存应远大于 LoRA"
`,
        answer: `GB = 1024 ** 3
BYTES_FULL = 12
BYTES_LORA = 16
LORA_RATIO = 0.0025

def memory_gib(n_params, lora=False):
    trainable = n_params * LORA_RATIO if lora else n_params
    base_bytes = n_params * 2
    train_bytes = trainable * (BYTES_LORA if lora else BYTES_FULL)
    return {
        "weights": round(base_bytes / GB, 2),
        "train": round(train_bytes / GB, 2),
        "total": round((base_bytes + train_bytes) / GB, 2),
    }

full = memory_gib(7e9, lora=False)
lora = memory_gib(7e9, lora=True)
context = (full, lora)
`,
        explanation:
          '全参：权重 2 + 梯度 2 + Adam 8 = 12 字节每参数（加上对齐与激活，实践中还要更多），7B 约 78 GiB 训练状态，加权重共约 104 GiB；LoRA 只有基座权重 13.04 GiB 加少量可训练状态，总约 13.3 GiB。这正是"单张 24GB 卡可训 7B LoRA"的原因——**注意这只是静态部分**，真实训练还要加上随 batch 与序列长度增长的激活值。',
        relatedLessonId: 'llm-b3-c1-l2',
        tags: ['显存估算', 'LoRA', '工程'],
      },
      {
        id: 'llm-b3-c1-e7',
        type: 'code',
        difficulty: 3,
        question:
          '实现 **SFT 损失掩码**：给定每条对话的 token 列表与角色列表，生成 labels：assistant 段保留 token，其余设为 -100。\n\n- 返回每个样本的 labels 列表 `all_labels`；\n- 返回有效 token 总数 `n_valid` 与占比 `valid_ratio`（保留 3 位小数）。',
        starterCode: `samples = [
    (["<sys>", "你是助手", "<end>", "<u>", "北京", "在哪", "<end>", "北京是首都"], ["system", "system", "system", "user", "user", "user", "user", "assistant"]),
    (["<sys>", "你是助手", "<end>", "<u>", "你好", "<end>", "你好！", "有什么事"], ["system", "system", "system", "user", "user", "user", "assistant", "assistant"]),
]

IGNORE = -100

all_labels = []
for tokens, roles in samples:
    labels = ___
    all_labels.append(labels)

n_total = sum(len(s[0]) for s in samples)
n_valid = ___
valid_ratio = ___
context = (all_labels, n_valid, valid_ratio)
`,
        setupCode: '',
        expectedOutput: "第一组最后 2 个 token 参与损失，第二组最后 4 个参与",
        tests: `assert len(context[0]) == 2, "应返回两个样本的 labels"
assert context[0][0][:4] == [-100, -100, -100, -100], "system 与部分 user 段应被掩码"
assert all(l != -100 for l in context[0][0][7:]), "assistant 段应全部参与损失"
assert all(l != -100 for l in context[0][1][6:]), "第二组 assistant 段应全部参与"
n_assist = sum(1 for t, r in zip(samples[0][0], samples[0][1]) if r == "assistant") + sum(1 for t, r in zip(samples[1][0], samples[1][1]) if r == "assistant")
assert context[1] == n_assist, f"有效 token 数应等于 assistant token 数 {n_assist}，实际 {context[1]}"
assert abs(context[2] - round(n_assist / 16, 3)) < 1e-9, "占比应为有效 token 除以总 token"
assert sum(l != -100 for l in context[0][0]) == 1, "第一组只有 1 个 assistant token 参与损失"
`,
        answer: `samples = [
    (["<sys>", "你是助手", "<end>", "<u>", "北京", "在哪", "<end>", "北京是首都"], ["system", "system", "system", "user", "user", "user", "user", "assistant"]),
    (["<sys>", "你是助手", "<end>", "<u>", "你好", "<end>", "你好！", "有什么事"], ["system", "system", "system", "user", "user", "user", "assistant", "assistant"]),
]

IGNORE = -100

all_labels = []
for tokens, roles in samples:
    labels = [tok for tok, role in zip(tokens, roles)] if False else [
        (token if role == "assistant" else IGNORE) for token, role in zip(tokens, roles)
    ]
    all_labels.append(labels)

n_total = sum(len(s[0]) for s in samples)
n_valid = sum(1 for labels in all_labels for l in labels if l != IGNORE)
valid_ratio = round(n_valid / n_total, 3)
context = (all_labels, n_valid, valid_ratio)
`,
        explanation:
          '掩码的核心是"角色到是否参与损失"的映射：只有 assistant 段（通常还包括它的结束符）保留，system 与 user 全部设为 -100（Hugging Face 的 CrossEntropyLoss 默认忽略该值）。本例中两条样本分别有 2 与 4 个有效 token，共 6 个？注意第二条有 4 个 assistant token，合计 2+4=6；分母 8+8=16，占比 0.375——请对照测试自行核对，理解掩码计算比记住某个具体比例更重要。',
        relatedLessonId: 'llm-b3-c1-l3',
        tags: ['SFT', '损失掩码'],
      },
      {
        id: 'llm-b3-c1-e8',
        type: 'code',
        difficulty: 3,
        question:
          '实现**数据泄漏检查**：用 5-gram 覆盖率判断测试问题是否与训练集样本高度重叠。\n\n- 对每个测试问题，计算它与每条训练样本的 5-gram 覆盖率（交集大小除以测试样本的 gram 数）；\n- 取最大覆盖率 `max_overlap`；若大于阈值 `0.5` 记为"疑似泄漏"；\n- 返回 `leaks`（疑似泄漏的测试问题列表）与 `max_overlap`（保留 2 位小数）。',
        starterCode: `def grams(text, n=5):
    t = text.replace(" ", "")
    return {t[i:i + n] for i in range(max(0, len(t) - n + 1))}

train = [
    "跨行转账一般需要一到三个工作日到账",
    "本行转账实时到账，跨行需清算时间",
]
test = [
    "跨行转账一般需要几个工作日到账",
    "信用卡年费如何减免",
]

THRESHOLD = 0.5
leaks = []
max_overlap = 0.0
for q in test:
    gq = grams(q)
    best = 0.0
    for t in train:
        gt = grams(t)
        best = max(best, ___)
    max_overlap = max(max_overlap, best)
    if ___:
        leaks.append(q)

context = (leaks, round(max_overlap, 2))
`,
        setupCode: '',
        expectedOutput: "第一条疑似泄漏，max_overlap 约为 0.67",
        tests: `assert len(context[0]) == 1, f"应识别 1 条疑似泄漏，实际 {context[0]}"
assert context[0][0].startswith("跨行转账"), "被标记的应是第一条测试问题"
assert abs(context[1] - 0.6) < 0.12, f"max_overlap 约为 0.6~0.7，实际 {context[1]}"
assert "信用卡年费如何减免" not in context[0], "无关问题不应被判为泄漏"
g1 = grams("跨行转账一般需要几个工作日到账")
g2 = grams("跨行转账一般需要一到三个工作日到账")
assert 0 < len(g1 & g2) / len(g1) < 1, "两条文本应部分重叠但不等"
`,
        answer: `def grams(text, n=5):
    t = text.replace(" ", "")
    return {t[i:i + n] for i in range(max(0, len(t) - n + 1))}

train = [
    "跨行转账一般需要一到三个工作日到账",
    "本行转账实时到账，跨行需清算时间",
]
test = [
    "跨行转账一般需要几个工作日到账",
    "信用卡年费如何减免",
]

THRESHOLD = 0.5
leaks = []
max_overlap = 0.0
for q in test:
    gq = grams(q)
    best = 0.0
    for t in train:
        gt = grams(t)
        best = max(best, len(gq & gt) / len(gq) if gq else 0.0)
    max_overlap = max(max_overlap, best)
    if best > THRESHOLD:
        leaks.append(q)

context = (leaks, round(max_overlap, 2))
`,
        explanation:
          'n-gram 集合的交集除以测试样本 gram 数，衡量"测试问题有多少片段已经出现在训练集里"。真实工程还要加上：MinHash 近似近邻、embedding 相似度（抓改写）、以及按任务调阈值（改写类任务阈值应更高）。**不要用精确匹配去重**——那样只能抓到完全一样的样本。',
        relatedLessonId: 'llm-b3-c1-l3',
        tags: ['数据质量', '泄漏检查', '集合'],
      },
      {
        id: 'llm-b3-c1-e9',
        type: 'code',
        difficulty: 4,
        question:
          '实现 **DPO 损失**：给定好/差回答在策略模型与参考模型下的对数概率，按\n\nloss = -log sigma( beta 乘 [ (logp_w - logp_w_ref) - (logp_l - logp_l_ref) ] )\n\n计算 `loss`（保留 4 位小数）与 margin `margin`（保留 4 位小数），并判断 `wins`（margin 是否大于 0）。',
        starterCode: `import numpy as np

logp_w, logp_w_ref = -0.80, -1.00
logp_l, logp_l_ref = -1.40, -1.00
beta = 0.1

def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-x))

margin = ___
loss = ___
wins = ___
context = (loss, margin, wins)
`,
        setupCode: '',
        expectedOutput: 'margin = 0.04，loss 约 0.6931',
        tests: `assert abs(context[1] - 0.06) < 1e-9, f"margin 应为 0.06，实际 {context[1]}"
assert abs(context[0] - 0.6636) < 1e-4, f"loss 约为 0.6636，实际 {context[0]}"
assert context[2] is True, "margin 为正应判为偏好正确"
assert abs(-np.log(sigmoid(0.0)) - 0.6931) < 1e-3, "margin 为 0 时损失约为 0.693"
assert context[0] <= 0.6932, "正 margin 的损失应不高于 0.6931"
`,
        answer: `import numpy as np

logp_w, logp_w_ref = -0.80, -1.00
logp_l, logp_l_ref = -1.40, -1.00
beta = 0.1

def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-x))

margin = beta * ((logp_w - logp_w_ref) - (logp_l - logp_l_ref))
loss = round(float(-np.log(sigmoid(margin))), 4)
margin = round(margin, 4)
wins = margin > 0
context = (loss, margin, wins)
`,
        explanation:
          '关键在**相对**：好答案提升了 0.2、差答案没变，相对优势 0.2，乘 beta=0.1 得 margin 0.04，损失约 0.693（略低于随机线的 0.6931）。注意 margin 为 0 时损失恰好是 ln2，这是 DPO 的训练起点（策略模型初始化时等于参考模型）。DPO 学的是"相对偏好"，所以不能只看某一个答案的绝对概率。',
        relatedLessonId: 'llm-b3-c1-l4',
        tags: ['DPO', '损失函数', 'numpy'],
      },
      {
        id: 'llm-b3-c1-e10',
        type: 'single',
        difficulty: 4,
        question: 'DPO 相比 RLHF（PPO）的主要优势是？',
        options: [
          { value: 'A', text: 'DPO 一定比 PPO 效果更好' },
          { value: 'B', text: 'DPO 无需单独训练奖励模型，也不用在线 RL 采样，训练更简单稳定' },
          { value: 'C', text: 'DPO 不需要偏好数据' },
          { value: 'D', text: 'DPO 可以反复利用在线探索的新数据' },
        ],
        answer: 'B',
        explanation:
          'DPO 利用 Bradley-Terry 假设把 KL 约束下的最优策略写成闭式解，直接用偏好对做监督式优化。它仍需要偏好数据（C 错），且是离线方法（D 错），效果并不必然优于 PPO（A 错）。',
        relatedLessonId: 'llm-b3-c1-l4',
        tags: ['DPO', 'RLHF'],
      },
      {
        id: 'llm-b3-c1-e11',
        type: 'multiple',
        difficulty: 3,
        question: '下列哪些做法能有效降低线上 LLM 服务的成本？（多选）',
        options: [
          { value: 'A', text: '按难度路由：简单请求用小模型' },
          { value: 'B', text: '对高频问题启用语义缓存' },
          { value: 'C', text: '收紧 RAG 的 top-k 并开启 prompt caching' },
          { value: 'D', text: '把所有请求的 temperature 调成 1.5 以增加创造性' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 与成本无关，且过高温度会降低质量、增加重试。A、B、C 分别对应"模型层、请求层、上下文层"三类优化，是成本治理的标准手段。',
        relatedLessonId: 'llm-b3-c1-l5',
        tags: ['成本优化', '工程'],
      },
      {
        id: 'llm-b3-c1-e12',
        type: 'judge',
        difficulty: 3,
        question: '用 LLM 作为裁判（LLM-as-a-Judge）评估生成质量时，只需要对每个回答打 1~10 分即可，不必考虑位置与长度偏差。',
        answer: false,
        explanation:
          'LLM 裁判存在明显的位置偏好（偏爱第一个）与长度偏好（偏爱更长答案），绝对打分方差也很大。更可靠的做法是成对比较加位置交换，并用人工标注校准裁判。',
        relatedLessonId: 'llm-b3-c1-l5',
        tags: ['评测', 'LLM 裁判'],
      },
      {
        id: 'llm-b3-c1-e13',
        type: 'fill',
        difficulty: 4,
        question: '训练偏好对时常用的 Bradley-Terry 损失为：\n\n```python\nloss = -np.log(sigmoid(r_better - ___ ))\n```',
        blanks: [['r_worse', 'r_l', 'r_bad', 'r_neg']],
        explanation:
          '损失要把"好答案奖励"与"差答案奖励"的**差值**送进 sigmoid。差值越大，sigmoid 越接近 1，损失越小。这也解释了为什么奖励模型的输出只有相对意义（整体加常数不影响结果）。',
        relatedLessonId: 'llm-b3-c1-l4',
        tags: ['RLHF', '奖励模型'],
      },
      {
        id: 'llm-b3-c1-e14',
        type: 'code',
        difficulty: 4,
        question:
          '实现**模型路由**：按问题长度与关键词估计难度（长度大于 40 或含关键词"计算/推理/证明"视为困难），困难调用大模型、简单调用小模型。\n\n- 返回每个问题的模型选择 `route`（"small" 或 "large"）；\n- 返回总成本 `total_cost`（小模型每题 0.0004 美元、大模型 0.004 美元，保留 4 位小数）；\n- 返回大模型占比 `large_ratio`（保留 2 位小数）。',
        starterCode: `questions = [
    "营业时间是多少",
    "请计算这三年的复合增长率并说明推理过程",
    "你好",
    "请证明该命题在无穷维空间也成立，并给出完整的推理链条与反例分析",
    "如何退款",
]

HARD_WORDS = ("计算", "推理", "证明")
COST = {"small": 0.0004, "large": 0.004}

def is_hard(q):
    return ___ or ___

route = [___ for q in questions]
total_cost = ___
large_ratio = ___
context = (route, total_cost, large_ratio)
`,
        setupCode: '',
        expectedOutput: "困难问题走 large，总成本与占比按规则计算",
        tests: `assert context[0][1] == "large" and context[0][3] == "large", "两个困难问题应走大模型"
assert context[0][0] == "small" and context[0][2] == "small", "简单问题应走小模型"
assert context[0].count("large") == 2, f"大模型请求数应为 2，实际 {context[0].count('large')}"
assert abs(context[1] - 0.0092) < 1e-9, f"总成本应为 0.0092，实际 {context[1]}"
assert abs(context[2] - 0.40) < 1e-9, f"大模型占比应为 0.40，实际 {context[2]}"
`,
        answer: `questions = [
    "营业时间是多少",
    "请计算这三年的复合增长率并说明推理过程",
    "你好",
    "请证明该命题在无穷维空间也成立，并给出完整的推理链条与反例分析",
    "如何退款",
]

HARD_WORDS = ("计算", "推理", "证明")
COST = {"small": 0.0004, "large": 0.004}

def is_hard(q):
    return len(q) > 40 or any(w in q for w in HARD_WORDS)

route = [("large" if is_hard(q) else "small") for q in questions]
total_cost = round(sum(COST[r] for r in route), 4)
large_ratio = round(route.count("large") / len(route), 2)
context = (route, total_cost, large_ratio)
`,
        explanation:
          '规则路由只是起点，生产上常用"小模型置信度 + 分类器"来判断难度：小模型先答，置信度低或自评"不确定"时升级到大模型（cascade）。本例中 5 题里 2 题走大模型，成本 2×0.004 + 3×0.0004 = 0.0088，若全部走大模型则是 0.02，节省约 56%。',
        relatedLessonId: 'llm-b3-c1-l5',
        tags: ['成本优化', '路由', '工程'],
      },
      {
        id: 'llm-b3-c1-e15',
        type: 'code',
        difficulty: 4,
        question:
          '实现**评测结果统计**：给定每条样本的评测记录（含 correct、latency_ms、tokens），返回准确率 `accuracy`（保留 3 位小数）、P50 与 P95 延迟（用 `np.percentile` 线性插值，保留 1 位小数）、以及每请求平均 token `avg_tokens`（保留 1 位小数）。',
        starterCode: `import numpy as np

records = [
    {"correct": True, "latency_ms": 820, "tokens": 300},
    {"correct": True, "latency_ms": 1200, "tokens": 420},
    {"correct": False, "latency_ms": 2400, "tokens": 380},
    {"correct": True, "latency_ms": 950, "tokens": 260},
    {"correct": True, "latency_ms": 5200, "tokens": 800},
    {"correct": False, "latency_ms": 610, "tokens": 210},
    {"correct": True, "latency_ms": 1100, "tokens": 340},
    {"correct": True, "latency_ms": 760, "tokens": 290},
    {"correct": True, "latency_ms": 890, "tokens": 310},
    {"correct": False, "latency_ms": 3000, "tokens": 520},
]

acc_list = [___ for r in records]
accuracy = ___

lat = np.array([r["latency_ms"] for r in records])
p50 = ___
p95 = ___

avg_tokens = ___
context = (accuracy, p50, p95, avg_tokens)
`,
        setupCode: '',
        expectedOutput: "accuracy = 0.700，p50 与 p95 由百分位计算得出",
        tests: `assert abs(context[0] - 0.700) < 1e-9, f"准确率应为 0.700，实际 {context[0]}"
assert context[1] == round(float(np.percentile(lat, 50)), 1), "P50 计算不正确"
assert context[2] == round(float(np.percentile(lat, 95)), 1), "P95 计算不正确"
assert context[2] > context[1], "P95 应大于 P50"
assert abs(context[3] - 383.0) < 1e-6, f"平均 token 应为 383.0，实际 {context[3]}"
assert 0 <= context[0] <= 1
`,
        answer: `import numpy as np

records = [
    {"correct": True, "latency_ms": 820, "tokens": 300},
    {"correct": True, "latency_ms": 1200, "tokens": 420},
    {"correct": False, "latency_ms": 2400, "tokens": 380},
    {"correct": True, "latency_ms": 950, "tokens": 260},
    {"correct": True, "latency_ms": 5200, "tokens": 800},
    {"correct": False, "latency_ms": 610, "tokens": 210},
    {"correct": True, "latency_ms": 1100, "tokens": 340},
    {"correct": True, "latency_ms": 760, "tokens": 290},
    {"correct": True, "latency_ms": 890, "tokens": 310},
    {"correct": False, "latency_ms": 3000, "tokens": 520},
]

acc_list = [1 if r["correct"] else 0 for r in records]
accuracy = round(sum(acc_list) / len(acc_list), 3)

lat = np.array([r["latency_ms"] for r in records])
p50 = round(float(np.percentile(lat, 50)), 1)
p95 = round(float(np.percentile(lat, 95)), 1)

avg_tokens = round(sum(r["tokens"] for r in records) / len(records), 1)
context = (accuracy, p50, p95, avg_tokens)
`,
        explanation:
          '线上看延迟必须看分位而不是平均值：本例平均约 1660ms，但 P95 达到数千毫秒——用户感知的是尾延迟。`np.percentile` 默认线性插值，不同库（如 pandas 与 numpy）在边界上可能略有差异，跨工具对比时要注意口径。平均 token 用于估算成本，与准确率一起构成"质量-性能-成本"三角。',
        relatedLessonId: 'llm-b3-c1-l5',
        tags: ['评测', '延迟', 'numpy'],
      },
      {
        id: 'llm-b3-c1-e16',
        type: 'single',
        difficulty: 3,
        question: 'SFT 训练时，下列哪项做法是正确且必要的？',
        options: [
          { value: 'A', text: '对 system、user、assistant 全部 token 计算损失' },
          { value: 'B', text: '只对 assistant 段（含结束符）计算损失，其余设为 -100' },
          { value: 'C', text: '对 pad 位置也计算损失以增加监督信号' },
          { value: 'D', text: '训练与推理使用不同的 chat template' },
        ],
        answer: 'B',
        explanation:
          '只对 assistant 段计算损失，模型才能学到"被问到问题后如何回答"，而不是学着自己生成问题。A、C 会引入噪声，D 是最常见的效果劣化原因。',
        relatedLessonId: 'llm-b3-c1-l3',
        tags: ['SFT', '数据格式'],
      },
      {
        id: 'llm-b3-c1-e17',
        type: 'multiple',
        difficulty: 4,
        question: '关于 RLHF 与 DPO 中的 KL 约束（或 beta 系数），下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: 'KL 惩罚用于防止策略偏离参考模型太远' },
          { value: 'B', text: '缺少 KL 约束时，模型可能利用奖励模型的漏洞（reward hacking）' },
          { value: 'C', text: 'DPO 中的 beta 起到类似 KL 约束强度的作用' },
          { value: 'D', text: 'KL 惩罚越大，模型的可塑性越强' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误：KL 惩罚（或 beta）越大，策略越贴近参考模型，可塑性越弱、越保守。A、B、C 是 RLHF 与 DPO 的标准理解。',
        relatedLessonId: 'llm-b3-c1-l4',
        tags: ['RLHF', 'DPO', 'KL'],
      },
      {
        id: 'llm-b3-c1-e18',
        type: 'open',
        difficulty: 5,
        question:
          '公司计划把一个通用 7B 模型改造成"合同条款审核助手"，要求：(1) 输出固定结构的 JSON；(2) 识别 12 类风险条款；(3) 单次审核延迟低于 6 秒；(4) 成本可控；(5) 上线后可持续迭代。请给出完整的技术方案，包括数据、训练、评测、部署与迭代。',
        referenceAnswer: `**1. 任务与评测先行**

- 定义 12 类风险条款的判定标准文档（每类给出正例、反例、边界例）；
- 构造 300 条评测集（覆盖 12 类，正负样本均衡），先跑"提示工程 + few-shot"基线，记录准确率、格式合法率、延迟与成本；
- 明确上线门槛：类别召回率、JSON 合法率、P95 延迟。

**2. 数据构造**

- 来源混合：法务专家精标 500~1000 条（质量核心）+ 强模型生成后人工审核扩展 + 历史合同与审核记录脱敏挖掘（注意隐私与合规）；
- 格式：统一 JSON schema（包含 clause_id、risk_type、evidence、severity、confidence）；
- 多样性：不同合同类型（采购、服务、劳动、租赁）、不同长度、不同意译风格；
- 质量：去重（含近邻去重）、schema 校验、测试集泄漏检查（n-gram 与 embedding 双重）、统计长度分布。

**3. 训练方案**

- 首选 LoRA（r=16~32，target_modules 覆盖 q/k/v/o 与 MLP），基座 7B，单卡或双卡即可训练；
- 若显存紧张用 QLoRA 4bit；
- 训练配置：学习率 1e-4~2e-4、batch 与梯度累积凑够有效 batch 32~64、序列长度覆盖最长合同片段、只对 assistant 段算 loss、样本末尾加 eos；
- 若格式遵循仍不稳定，追加"结构化输出约束"（约束解码或函数调用模式）；
- 长合同采用"先切分再逐条审核"的两阶段流程，而不是把整份合同塞进上下文。

**4. 评测**

- 任务层：类别级召回率与误报率、JSON schema 合法率、字段缺失率、引用证据是否来自原文（忠实度）；
- 裁判：成对比较加位置交换，人工校准 200 条，报告一致性；
- 回归：绿/红测试集（包含历史 badcase），每次改动必跑；
- 与基线对比：提示工程基线 vs 微调模型，用同一测试集。

**5. 部署**

- LoRA 合并进基座（BF16 或 INT8/INT4 量化），用 vLLM/TensorRT-LLM 部署，开启连续批处理与前缀缓存；
- 延迟控制：限制 max_tokens、合同按条款切块并行审核、必要时蒸馏到 3B 处理简单条款；
- 灰度：按客户分桶 1% → 10% → 50% → 100%，监控准确率与 P95 延迟；
- 安全：只读工具，审核结果需人工复核后才落库；敏感条款输出脱敏。

**6. 持续迭代**

- 日志：保存输入片段、模型输出、人工复核结论、耗时与成本；
- badcase 闭环：每周聚类 badcase → 归因（数据缺失 / 提示问题 / 模型能力 / 切片策略）→ 补样本再训练；
- 版本化：模型版本、prompt 版本、schema 版本、切片策略版本独立记录，可独立回滚；
- 定期重估：法律条款标准变化时同步更新评测集。`,
        rubric: [
          { point: '先建立评测集与基线，再决定是否微调', score: 2 },
          { point: '数据方案覆盖来源混合、JSON 格式、去重与泄漏检查', score: 2 },
          { point: '训练方案合理（LoRA/QLoRA、仅 assistant 段算 loss、长文切片）', score: 2 },
          { point: '评测含类别指标、格式合法率、忠实度与回归集', score: 1 },
          { point: '部署与迭代含延迟控制、灰度、日志与 badcase 闭环', score: 1 },
        ],
        keywords: ['LoRA', 'QLoRA', 'JSON schema', '评测集', '泄漏', '灰度', '延迟', 'badcase'],
        explanation:
          '这是综合题，考察能否把"微调"放回完整工程闭环里。高分答案会明确"评测先行""先做提示基线""长文档切片"三点——它们决定了项目是否可行。',
        tags: ['综合', '微调', '工程'],
      },
      {
        id: 'llm-b3-c1-e19',
        type: 'open',
        difficulty: 4,
        question:
          '请比较全参微调、LoRA、QLoRA 三种方案的原理、显存开销与适用场景，并说明如果你只有一张 24GB 显卡、需要微调 7B 模型并且数据只有 3000 条，会选择哪种方案以及为什么。',
        referenceAnswer: `**原理对比**

1. **全参微调**：更新全部参数。需要为每个参数保存梯度（2 字节）与 Adam 状态（8 字节），加权重本身共约 12~16 字节/参数，7B 模型约 84~112 GiB，必须借助 ZeRO/FSDP 多卡。

2. **LoRA**：冻结基座，在指定线性层旁路加低秩增量 B 乘 A（A 为 [r,k]、B 为 [d,r]），缩放 alpha/r，B 初始化为 0 保证起步无扰动。参数量从 d 乘 k 降为 r 乘 (d + k)，通常只有基座的 0.1%~1%。

3. **QLoRA**：在 LoRA 基础上把基座量化为 4bit NF4，并叠加双重量化与分页优化器，使 7B 基座从约 13 GiB 降到约 3.5 GiB，可以在单张 24GB 卡上训练更大模型或更长序列。

**显存对比（7B 量级，粗略）**

| 方案 | 基座 | 训练状态 | 合计（不含激活） |
| --- | --- | --- | --- |
| 全参 | 13 GiB | 约 78 GiB | 约 91 GiB 起 |
| LoRA (0.25% 参数) | 13 GiB | 约 0.3 GiB | 约 13.3 GiB |
| QLoRA | 约 3.5 GiB | 约 0.3 GiB | 约 3.8 GiB |

**注意**：以上不含激活值。激活随 batch 乘序列长度增长，长序列时常常成为瓶颈，需要梯度检查点（可换约 30% 速度）。

**适用场景**

- 全参：需要大幅改变模型能力的场景（继续预训练、领域大改造），有充足算力；
- LoRA：绝大多数业务微调、需要多任务多适配器并存、快速迭代；
- QLoRA：单卡资源严格受限、需要训练较大模型或长上下文。

**针对本题的选择：LoRA（必要时 QLoRA）**

理由：

1. **显存**：3000 条数据的有效 batch 不需要很大，LoRA 在 24GB 上可轻松运行，还能开较长序列；
2. **数据量**：3000 条是小数据，全参微调极易灾难性遗忘与过拟合，LoRA 冻结基座天然更稳；
3. **迭代速度**：每次实验只需训练几十 MB 的适配器，可以同时保留多个版本做 A/B；
4. **部署**：适配器可合并进基座，推理零额外开销；
5. **风险控制**：如果 LoRA 效果不足，再考虑提高 r、扩展到全部线性层，或退而使用 QLoRA 换取更长上下文与更大 batch。

**具体配置建议**：r=16、alpha=32、target_modules 覆盖 q/k/v/o 以及 gate/up/down、dropout 0.05、学习率 1e-4、有效 batch 32、只对 assistant 段算 loss，先用 500 条做小规模跑通，观察生成样例再全量训练。`,
        rubric: [
          { point: '说明三种方案的原理差异（全参更新、低秩增量、4bit 基座）', score: 2 },
          { point: '给出显存估算并指出激活值这一容易忽略的部分', score: 2 },
          { point: '结合"24GB 加 3000 条数据"给出明确选择与 3 条以上理由', score: 2 },
        ],
        keywords: ['LoRA', 'QLoRA', '全参', '显存', '激活值', '过拟合', '适配器'],
        explanation:
          '本题的关键不是背结论，而是能"从显存与数据量两个约束反推方案"。能提到激活值、灾难性遗忘与适配器可插拔的答案，说明有真实微调经验。',
        tags: ['微调方案', '显存', '工程'],
      },
    ],
  },
  ...llmB3Extra,
];
