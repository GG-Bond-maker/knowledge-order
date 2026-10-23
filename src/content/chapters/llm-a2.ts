import type { Chapter } from '../../types';
import { llmA2Extra } from './llm-a2-extra';
import { llmA2Extra2 } from './llm-a2-extra3';
import { llmA2Extra4 } from './llm-a2-extra4';

/** 《大模型训练原理》章节 */
export const llm_a2Chapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'llm-a2-c1',
    title: '预训练目标与损失函数',
    goal: '理解自回归预训练目标、交叉熵与困惑度，掌握主流采样策略与 KV Cache 等推理优化手段。',
    lessons: [
      {
        id: 'llm-a2-c1-l1',
        title: '预训练目标：下一 token 预测与交叉熵',
        content: `
## 自回归语言模型的核心

GPT 系列的本质是一个**下一 token 预测器**：给定前文，输出词表中每个 token 作为下一个词的概率。

\`\`\`
输入:  "今天天气真"
输出:  P(好) = 0.42, P(不错) = 0.21, P(热) = 0.12, ...
\`\`\`

训练时采用**teacher forcing**：把真实文本的每个位置都作为预测目标，
一次前向传播就能并行计算所有位置的损失（这正是 Transformer 相比 RNN 的关键优势）。

## 交叉熵损失

对单个位置，模型输出 logits，经 softmax 得到概率 p，真实 token 的索引为 y：

\`\`\`
loss = -log(p[y])
\`\`\`

若模型给正确 token 的概率是 0.9，loss = 0.105；若只有 0.1，loss = 2.303。
整个序列的损失是所有位置的平均。

**直观理解**：交叉熵衡量"模型给正确答案分配的概率有多低"，越低越好。

## 困惑度（Perplexity, PPL）

\`\`\`
PPL = exp(平均交叉熵)
\`\`\`

含义：**模型在每一步平均要在多少个候选词中"犹豫"**。

- PPL = 1：完美预测，每次都 100% 确定；
- PPL = 10：平均相当于在 10 个词中做选择；
- PPL = 词表大小 V：完全随机猜测（均匀分布）。

**参考值**：GPT-2 在 WikiText-103 上 PPL 约 18~20；
一个小 Transformer 在同样数据上可能 PPL > 50。

> 注意：**PPL 只能在同一词表和同一数据集上比较**。不同 tokenizer 的 PPL 不可比。

## 为什么是交叉熵而不是准确率

1. 交叉熵是**可微的**，且能反映"置信度"（给 0.51 和给 0.99 的损失不同）；
2. 准确率对 logits 不可导，无法反向传播；
3. 交叉熵的最小值等价于最大似然估计（MLE）。

## 大规模训练的规模法则（Scaling Law）

Kaplan et al. (2020) 和 Chinchilla (2022) 发现：损失随模型参数量 N、数据量 D、计算量 C 呈幂律下降。

**Chinchilla 关键结论**：在计算预算固定时，参数量与训练 token 数应大致 **1:20** 配比。
例如 70B 参数模型应训练约 1.4T tokens。

这纠正了早期"模型越大越好"的认知——**数据量同样关键**。

## 训练阶段划分

| 阶段 | 目标 | 数据 |
| --- | --- | --- |
| 预训练（Pre-training） | 学习语言与世界知识 | 万亿级 token 的网页、代码、书籍 |
| 指令微调（SFT） | 学会"听指令" | 数万~百万条对话指令 |
| 对齐（RLHF/DPO） | 符合人类偏好 | 偏好对数据 |

> 预训练决定了模型的**知识上限**，后训练决定它**表达得多好**。

<TemperatureSamplingDemo />
`,
        tips: [
          {
            kind: 'interview',
            text: '「PPL 的物理含义」常被考：表示模型平均在每个位置上要在多少个候选词间选择，等于 exp(平均交叉熵)。',
          },
          {
            kind: 'pitfall',
            text: '不同 tokenizer 的 PPL 不可直接比较——词表大小相同才有可比性。比较模型能力应使用下游任务评测。',
          },
          {
            kind: 'note',
            text: 'Chinchilla 的"参数:数据 ≈ 1:20"是训练预算分配的经验法则，不是绝对真理；LLaMA 3 就用了远超此比例的 token。',
          },
        ],
        demos: [
          {
            title: '交叉熵与困惑度的计算',
            lang: 'python',
            code: `import numpy as np

def softmax(logits):
    e = np.exp(logits - np.max(logits, axis=-1, keepdims=True))
    return e / e.sum(axis=-1, keepdims=True)

def cross_entropy(probs, target_idx):
    return -np.log(probs[target_idx] + 1e-12)

# 词表 5 个 token，模型输出的 logits
logits = np.array([2.0, 1.0, 0.5, 0.1, -1.0])
p = softmax(logits)
print("概率分布:", np.round(p, 3))
print("各 token 的损失:", np.round(-np.log(p), 3))

target = 0
ce = cross_entropy(p, target)
print(f"\\n正确 token 索引={target}, 损失={ce:.3f}, 困惑度={np.exp(ce):.3f}")

# 若模型完全随机（均匀分布），PPL 应等于词表大小
uniform = np.ones(5) / 5
print(f"均匀分布时 PPL = {np.exp(cross_entropy(uniform, 0)):.3f}（= 词表大小 5）")`,
          },
        ],
      },
      {
        id: 'llm-a2-c1-l2',
        title: '采样策略：温度、Top-K 与 Top-P',
        content: `
## 为什么需要采样

模型给出的是概率分布。**贪心解码**（每步取最大概率）虽然确定，但会导致：

- 输出呆板、重复；
- 容易陷入循环（如重复同一句话）。

生成质量与多样性需要权衡，因此引入了采样策略。

## 温度（Temperature）

对 logits 除以温度 T 后再 softmax：

\`\`\`
p_i = softmax(logits_i / T)
\`\`\`

| T | 效果 |
| --- | --- |
| T → 0 | 趋近贪心（最确定） |
| T = 1 | 原始分布 |
| T > 1 | 分布变平（更随机、更发散） |
| T < 1 | 分布变尖（更保守、更确定） |

\`\`\`python
def softmax_with_temperature(logits, T=1.0):
    scaled = logits / T
    e = np.exp(scaled - np.max(scaled))
    return e / e.sum()
\`\`\`

**实践建议**：事实性任务用 T=0~0.3；创意写作 T=0.7~1.0。

## Top-K 采样

只从概率最高的 K 个 token 中采样，其余置零后重新归一化。

\`\`\`python
def top_k_filter(logits, k):
    kth = np.sort(logits)[-k]
    filtered = np.where(logits >= kth, logits, -np.inf)
    e = np.exp(filtered - np.max(filtered))
    return e / e.sum()
\`\`\`

**问题**：K 是固定值。当分布很尖时（模型很确定），K=50 可能包含大量垃圾词；
当分布很平时，K=50 又可能删掉合理选项。

## Top-P（核采样 / Nucleus Sampling）

按概率从高到低累加，取累计概率刚好超过 P 的最小集合。

\`\`\`python
def top_p_filter(probs, p=0.9):
    order = np.argsort(-probs)
    sorted_p = probs[order]
    cum = np.cumsum(sorted_p)
    cutoff = np.searchsorted(cum, p) + 1
    keep = order[:cutoff]
    mask = np.zeros_like(probs, dtype=bool)
    mask[keep] = True
    filtered = np.where(mask, probs, 0)
    return filtered / filtered.sum()
\`\`\`

**优势**：候选集合**随分布自适应**——模型确定时集合小，模型犹豫时集合大。
这是 GPT-3、ChatGPT 等的主流配置（常见 p=0.9~0.95）。

## Beam Search

维护 K 个"当前最优的部分序列"，每步扩展并保留得分最高的 K 个。

- **优点**：更可能找到全局更优的序列；
- **缺点**：计算量 ×K，输出趋同、缺乏多样性。

**适用**：机器翻译、摘要等"有唯一正确答案"的任务。
**不适用**：开放式对话、创意写作（需要多样性）。

## 重复惩罚与频率惩罚

\`\`\`
logit[x] -= penalty * count(x)      # 频率惩罚
\`\`\`

降低已出现 token 的概率，减少重复。参数过大则会导致语句不通顺。

## 采样策略速查

| 场景 | 推荐配置 |
| --- | --- |
| 事实问答、代码生成 | T=0~0.2，或贪心 |
| 通用对话 | T=0.7, top_p=0.9 |
| 创意写作 | T=0.9~1.0, top_p=0.95 |
| 需要确定性输出 | T=0（注意可能出现重复） |

<TemperatureSamplingDemo />
`,
        tips: [
          {
            kind: 'interview',
            text: '"Top-K 与 Top-P 的区别"是高频题：K 是固定数量的候选，P 是固定概率质量的自适应候选；P 更鲁棒。',
          },
          {
            kind: 'pitfall',
            text: '温度不要与 top_p 同时大幅调整，容易让输出崩坏。一般固定 top_p，只调温度。',
          },
          {
            kind: 'note',
            text: 'T=0 不等于完全确定：浮点误差、批处理顺序、硬件差异都可能导致微小不同，因此需要"可复现输出"时应固定 seed。',
          },
        ],
        demos: [
          {
            title: '温度与 Top-P 效果的直观对比',
            lang: 'python',
            code: `import numpy as np

def softmax(x, T=1.0):
    s = x / T
    e = np.exp(s - np.max(s))
    return e / e.sum()

logits = np.array([3.0, 2.0, 1.5, 1.0, 0.2])
print("原始概率:", np.round(softmax(logits), 3))
for T in (0.2, 0.7, 1.0, 2.0):
    p = softmax(logits, T)
    print(f"T={T:<4} 概率={np.round(p, 3)}  最大概率={p.max():.3f}")

print()
probs = softmax(logits)
order = np.argsort(-probs)
cum = np.cumsum(probs[order])
print("按概率降序的累计概率:", np.round(cum, 3))
for p in (0.5, 0.9):
    idx = np.searchsorted(cum, p) + 1
    print(f"top_p={p}: 保留前 {idx} 个 token，索引 {order[:idx]}")`,
          },
        ],
      },
      {
        id: 'llm-a2-c1-l3',
        title: '推理侧知识预告：KV Cache 与解码（详见 B3）',
        content: `
## 为什么这里要提一句推理

训练与推理是同一个模型的两套用法。学完损失函数与采样后，你已经知道"模型输出的是概率分布"。
而**把这个分布一步步变成完整文本**的过程（解码），涉及一类完全不同的优化——**缓存历史计算的 K/V**。

## 一句话概括

生成第 t 个 token 时，注意力需要全部历史 token 的 K、V。
由于因果掩码保证历史 K/V 不会改变，可以**缓存下来**，每步只算新 token——
整体复杂度从 O(n³) 降到 O(n²)，代价是显存占用（缓存大小 ∝ 层数 × 序列长度 × KV 头数）。

<Diagram type="arch" name="kv-cache" />

## 这部分完整内容在 B3

KV Cache 属于**推理与部署工程**，包含：

- 显存公式与并发容量估算
- MQA / GQA / MHA 三种结构的显存对比
- PagedAttention 与 vLLM
- Continuous Batching 与吞吐优化

请到 **⚙️ 推理与部署工程 → c2「KV Cache 与显存优化」** 学习完整内容。
本章只保留"解码需要缓存"这个必要认知，避免与本课程主线（损失/优化器/调度）混淆。
`,
        tips: [
          {
            kind: 'note',
            text: 'KV Cache 是推理优化，不属于训练原理。这里只做概念预告，完整讲解见 B3「推理与部署工程」c2 章。',
          },
          {
            kind: 'leak',
            text: '学习顺序建议：先在 A2 掌握"模型怎么学"（损失/梯度/优化器），再在 B3 掌握"模型怎么跑得快"（KV Cache/批处理/量化）。',
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-a2-c1-e1',
        type: 'single',
        difficulty: 2,
        question: '困惑度（Perplexity）的直观含义是？',
        options: [
          { value: 'A', text: '模型参数量的对数' },
          { value: 'B', text: '模型在每一步平均在多少个候选词中做选择' },
          { value: 'C', text: '训练损失的总和' },
          { value: 'D', text: '生成速度的快慢' },
        ],
        answer: 'B',
        explanation:
          'PPL = exp(平均交叉熵)。若 PPL = 10，平均相当于在 10 个词中犹豫。随机猜测时 PPL = 词表大小。',
        tags: ['困惑度'],
      },
      {
        id: 'llm-a2-c1-e2',
        type: 'judge',
        difficulty: 2,
        question: '不同 tokenizer 训练出的模型，其困惑度（PPL）可以直接相互比较。',
        answer: false,
        explanation:
          'PPL 与词表大小和切分方式强相关。同样一段文本，不同 tokenizer 切出的 token 数不同，PPL 差异很大。跨模型比较应使用下游任务评测。',
        tags: ['困惑度'],
      },
      {
        id: 'llm-a2-c1-e3',
        type: 'single',
        difficulty: 2,
        question: '把温度参数 T 调大（如 T=2）会产生什么效果？',
        options: [
          { value: 'A', text: '分布更集中，输出更确定' },
          { value: 'B', text: '分布更平坦，输出更随机多样' },
          { value: 'C', text: '不影响输出' },
          { value: 'D', text: '直接变成贪心解码' },
        ],
        answer: 'B',
        explanation:
          'logits 除以更大的 T 会使数值差异变小，softmax 后分布更平坦，采样更随机。T 调小时分布更尖锐、更确定。',
        tags: ['采样'],
      },
      {
        id: 'llm-a2-c1-e4',
        type: 'multiple',
        difficulty: 3,
        question: '关于 Top-P（核采样），下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '候选集合大小随分布自适应' },
          { value: 'B', text: 'P 越小，输出越保守' },
          { value: 'C', text: '候选数量固定为 K 个' },
          { value: 'D', text: '比 Top-K 更鲁棒' },
        ],
        answer: ['A', 'B', 'D'],
        explanation:
          'C 描述的是 Top-K。Top-P 按累计概率截断，模型确定时候选少、犹豫时候选多，因此更鲁棒。',
        tags: ['采样'],
      },
      {
        id: 'llm-a2-c1-e5',
        type: 'fill',
        difficulty: 3,
        question: '推理时缓存历史 token 的 Key 和 Value 以避免重复计算的技术叫 ___。',
        blanks: [['KV Cache', 'kvcache', 'kv-cache', 'KV 缓存', 'KV缓存']],
        explanation:
          'KV Cache 把自回归生成中每步的 K/V 计算量从 O(n) 降到 O(1)，整体从 O(n²) 降到 O(n)，代价是显存占用。',
        tags: ['推理优化'],
      },
      {
        id: 'llm-a2-c1-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现 `softmax_with_temperature(logits, T)`：对输入 logits 除以温度 T 后做数值稳定的 softmax。\n\n返回概率数组，保留 6 位小数。',
        starterCode: `import numpy as np

def softmax_with_temperature(logits, T=1.0):
    # 先除以温度，再减去最大值保证数值稳定
    ___

out = softmax_with_temperature(np.array([2.0, 1.0, 0.0]), 1.0)
`,
        setupCode: '',
        expectedOutput: '约 [0.665, 0.245, 0.090]',
        tests: `assert np.isclose(out.sum(), 1.0), f"概率和应为 1，实际 {out.sum()}"
assert np.isclose(out[0], 0.665241, atol=1e-4), f"第一个概率不正确：{out[0]}"
assert out[0] > out[1] > out[2], "概率应单调递减"

# 温度升高应使分布更平坦
hot = softmax_with_temperature(np.array([2.0, 1.0, 0.0]), 2.0)
assert hot[0] < out[0], "高温应降低最大概率"
np.testing.assert_allclose(hot.sum(), 1.0, atol=1e-9)
`,
        answer: `import numpy as np

def softmax_with_temperature(logits, T=1.0):
    scaled = np.asarray(logits, dtype=float) / T
    e = np.exp(scaled - np.max(scaled))
    return e / e.sum()

softmax_with_temperature(np.array([2.0, 1.0, 0.0]), 1.0)`,
        explanation:
          '```python\nscaled = np.asarray(logits, dtype=float) / T\ne = np.exp(scaled - np.max(scaled))\nreturn e / e.sum()\n```\n\n**减去最大值**是数值稳定的关键：`exp(2)` 尚可，但 `exp(1000)` 会溢出为 inf。减去最大值后指数最大为 0，不会溢出，而结果不变。',
        tags: ['编程', '采样'],
      },
      {
        id: 'llm-a2-c1-e7',
        type: 'code',
        difficulty: 4,
        question:
          '实现 `top_p_filter(probs, p)`：给定概率分布，返回**核采样（nucleus sampling）**后的新分布——\n\n保留累计概率达到 `p` 的最小 token 集合，其余置 0 并重新归一化。',
        starterCode: `import numpy as np

def top_p_filter(probs, p=0.9):
    probs = np.asarray(probs, dtype=float)
    order = np.argsort(-probs)
    sorted_p = probs[order]
    # 1. 计算累计概率，找到截断位置
    # 2. 构造掩码，保留前 cutoff 个
    ___
    return filtered / filtered.sum()

out = top_p_filter(np.array([0.5, 0.3, 0.15, 0.05]), 0.9)
`,
        setupCode: '',
        expectedOutput: '保留前 3 个，第 4 个为 0',
        tests: `p = np.array([0.5, 0.3, 0.15, 0.05])
res = top_p_filter(p, 0.9)
assert abs(res.sum() - 1.0) < 1e-9, f"归一化后和应为 1，实际 {res.sum()}"
assert res[3] == 0 or res[3] < 1e-12, f"累计前 3 个已达 0.95，第 4 个应被过滤，实际 {res[3]}"
assert res[0] > res[1] > res[2], "保留部分的相对大小关系应不变"
assert np.isclose(res[0], 0.5 / 0.95, atol=1e-6), f"归一化后概率不正确：{res[0]}"
`,
        answer: `import numpy as np

def top_p_filter(probs, p=0.9):
    probs = np.asarray(probs, dtype=float)
    order = np.argsort(-probs)
    sorted_p = probs[order]
    cum = np.cumsum(sorted_p)
    cutoff = int(np.searchsorted(cum, p) + 1)
    keep = order[:cutoff]
    mask = np.zeros_like(probs, dtype=bool)
    mask[keep] = True
    filtered = np.where(mask, probs, 0.0)
    return filtered / filtered.sum()

top_p_filter(np.array([0.5, 0.3, 0.15, 0.05]), 0.9)`,
        explanation:
          '```python\norder = np.argsort(-probs)\ncum = np.cumsum(probs[order])\ncutoff = int(np.searchsorted(cum, p) + 1)\nmask = np.zeros_like(probs, dtype=bool)\nmask[order[:cutoff]] = True\nfiltered = np.where(mask, probs, 0.0)\nreturn filtered / filtered.sum()\n```\n\n累计概率 0.5, 0.8, 0.95 已超过 0.9，因此保留前 3 个；第 4 个被过滤。**重新归一化**保证概率和为 1。',
        tags: ['编程', '采样'],
      },
      {
        id: 'llm-a2-c1-e8',
        type: 'judge',
        difficulty: 3,
        question: 'KV Cache 能减少显存占用。',
        answer: false,
        explanation:
          'KV Cache 用**显存换时间**：它减少重复计算（加速），但增加了显存占用（缓存所有历史 K/V）。长上下文推理的显存瓶颈主要来自它。',
        tags: ['推理优化'],
      },
      {
        id: 'llm-a2-c1-e9',
        type: 'single',
        difficulty: 3,
        question: 'GQA（Grouped-Query Attention）相比 MHA 的主要优势是？',
        options: [
          { value: 'A', text: '更高的模型准确率' },
          { value: 'B', text: '显著减少 KV Cache 的显存占用' },
          { value: 'C', text: '不需要位置编码' },
          { value: 'D', text: '训练速度更快' },
        ],
        answer: 'B',
        explanation:
          'GQA 让多个查询头共享一组 K/V，KV Cache 大小按共享组数成比例减少，同时性能接近 MHA。LLaMA 2/3 都采用此方案。',
        tags: ['注意力变体'],
      },
      {
        id: 'llm-a2-c1-e10',
        type: 'code',
        difficulty: 3,
        question:
          '计算 KV Cache 显存大小（GB）。实现 `kv_cache_gb(layers, seq_len, kv_heads, head_dim, bytes_per=2)`：\n\n公式：2 × layers × seq_len × kv_heads × head_dim × bytes_per / 1024³',
        starterCode: `def kv_cache_gb(layers, seq_len, kv_heads, head_dim, bytes_per=2):
    ___


out = round(kv_cache_gb(32, 4096, 32, 128), 2)
`,
        setupCode: '',
        expectedOutput: '2.0',
        tests: `mha = round(kv_cache_gb(32, 4096, 32, 128), 2)
assert abs(mha - 2.0) < 0.02, f"MHA 配置下应约 2.0GB（32层×4096长×32头×128维，fp16），实际 {mha}"
gqa = round(kv_cache_gb(32, 4096, 8, 128), 2)
assert abs(gqa - 0.5) < 0.02, f"GQA(8组) 应约 0.5GB（MHA 的 1/4），实际 {gqa}"
assert kv_cache_gb(32, 4096, 32, 128, bytes_per=1) < kv_cache_gb(32, 4096, 32, 128, bytes_per=2), "低精度应更省显存"
assert kv_cache_gb(24, 2048, 24, 64) > 0, "应返回正数"
`,
        answer: `def kv_cache_gb(layers, seq_len, kv_heads, head_dim, bytes_per=2):
    return 2 * layers * seq_len * kv_heads * head_dim * bytes_per / (1024 ** 3)


round(kv_cache_gb(32, 4096, 32, 128), 2)`,
        explanation:
          '```python\nreturn 2 * layers * seq_len * kv_heads * head_dim * bytes_per / (1024 ** 3)\n```\n\n系数 2 表示 K 和 V 各一份。2×32×4096×32×128×2 字节 = 2.0 GB。改成 8 组 GQA（K/V 头数从 32 减到 8）后降到 0.5 GB——这就是为什么长上下文模型都用 GQA。',
        tags: ['编程', '显存估算'],
      },
      {
        id: 'llm-a2-c1-e11',
        type: 'multiple',
        difficulty: 3,
        question: '下列哪些属于推理加速技术？（多选）',
        options: [
          { value: 'A', text: 'KV Cache' },
          { value: 'B', text: '量化（INT8/INT4）' },
          { value: 'C', text: '连续批处理（Continuous Batching）' },
          { value: 'D', text: '增大模型参数量' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 会让推理更慢。A 减少重复计算，B 降低显存带宽压力，C 提升硬件利用率。',
        tags: ['推理优化'],
      },
      {
        id: 'llm-a2-c1-e12',
        type: 'fill',
        difficulty: 4,
        question: '用一个小模型快速生成候选、再让大模型一次验证多个 token 的加速技术叫 ___ 解码。',
        blanks: [['投机', 'speculative', '推测']],
        explanation:
          '投机解码（Speculative Decoding）：草稿模型生成 K 个候选，大模型并行验证并接受前缀，保证输出分布与原始模型一致，同时减少串行调用次数。',
        tags: ['推理优化'],
      },
      {
        id: 'llm-a2-c1-e13',
        type: 'open',
        difficulty: 4,
        question:
          '请说明"温度、Top-K、Top-P"三种采样控制手段的原理与适用场景，并解释为什么主流产品通常采用 Top-P 而不只是 Top-K。',
        referenceAnswer: `**温度（Temperature）**：对 logits 除以 T 后再 softmax。

- T < 1：分布更尖锐，输出更确定、保守；
- T > 1：分布更平坦，输出更随机、多样。

适用：整体调控制“确定性 vs 多样性”的强度，是最基础的旋钮。

**Top-K**：只保留概率最高的 K 个 token，其余置 0 后重新归一化。

- 优点：简单、可限制最差情况（避免采样到极低概率词）；
- 缺点：K 是固定值，与当前分布的“形状”无关。模型很确定时（某 token 概率 0.99），
  K=50 会引入 49 个几乎不可能的词；模型很犹豫时（概率平均分散），K=50 又可能删掉合理选项。

**Top-P（核采样）**：按概率降序累加，保留累计概率刚超过 P 的最小集合。

- 候选数量**自适应**：分布尖锐时集合小（甚至只有 1~2 个），分布平坦时集合大；
- 因此比 Top-K 更鲁棒，能同时应对“确定”和“犹豫”两种情形。

**为什么主流用 Top-P**：

1. 自适应候选集合，不用为不同模型/任务重调 K；
2. 保证一个固定的“概率质量”被保留，语义上更合理；
3. 实践中通常配合适度温度（如 T=0.7, top_p=0.9），效果稳定。

**补充**：Top-K 也常与 Top-P 组合使用（先 Top-K 限制上限，再 Top-P 自适应），
但单独使用 Top-P 已能满足大多数场景。`,
        rubric: [
          { point: '说明温度通过缩放 logits 改变分布尖锐程度', score: 1 },
          { point: '说明 Top-K 保留固定数量的候选及其局限', score: 2 },
          { point: '说明 Top-P 保留累计概率达到 P 的最小集合且自适应', score: 2 },
          { point: '解释 Top-P 更鲁棒的原因（与分布形状无关）', score: 1 },
        ],
        keywords: ['温度', 'Top-K', 'Top-P', '自适应', '累计概率'],
        explanation:
          '答题的关键是点出 Top-K 的"固定数量"缺陷，以及 Top-P "固定概率质量"的自适应优势。',
        tags: ['采样', '面试'],
      },
    ],
  },
  ...llmA2Extra,
  ...llmA2Extra2,
  ...llmA2Extra4,
];
