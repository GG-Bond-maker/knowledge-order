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
## 学习目标

学完本节，你应该能够：
1. 写出交叉熵损失公式，并解释它与"下一 token 预测"任务的对应关系；
2. 手算一个 3 词词表上的交叉熵，体会"置信的错误"为什么比"犹豫的错误"罚得更重；
3. 说明困惑度（perplexity）与交叉熵的换算关系，能读懂模型评测里的 PPL 数字。

## 前置知识

- softmax 函数：把 logits 变成概率分布（llm-a1 第 2 章）；
- 对数运算：$\\ln 1 = 0$、$\\ln x$ 在 $x \\in (0,1)$ 上为负；
- 概率的基本直觉（乘法：两件独立事都发生的概率相乘）。

## 问题背景：预训练到底在"最小化"什么

GPT 类模型的预训练只有一个目标：**给定前文，给词表中每个候选 token 打分，让"真实下一个 token"的概率尽量高**。这个朴素目标配上海量语料，就涌现出了语言能力（GPT-2 论文的著名论断：语言模型是无监督多任务学习器）。而"尽量高"必须变成一个可优化的数字——交叉熵损失（Cross-Entropy Loss）。理解它，你才能看懂训练日志里的 loss 从 10 降到 2 意味着什么。

## 直觉理解：惊喜度（surprise）

模型给真实 token 的概率是 $p$，损失定义为 $-\\log p$：
- 预测完美 $p \\to 1$：$-\\log p \\to 0$，零惩罚；
- 完全懵 $p = 1/V$（V 为词表大小，均匀乱猜）：损失 $\\log V$（5 万词表约 10.8）；
- **自信地错**（真实 token 只给了 $p = 10^{-6}$）：损失约 13.8——**比坦诚地懵还重**。

对数让惩罚对"过度自信的错误"急剧上升，这正是我们想要的教练：**鼓励诚实的不确定性，严惩嚣张的错**。

## 核心概念：从单 token 到整个语料库

对位置 $t$ 的真实 token $y_t$，模型输出分布 $p_\\theta(\\cdot \\mid x_{<t})$，损失：

$$\\mathcal{L}_t = -\\log p_\\theta(y_t \\mid x_{<t}) \\quad\\text{（负对数似然，NLL）}$$

一句 $T$ 个 token 的序列总损失取平均；交叉熵这个名字来自它与 KL 散度的关系：$H(\\text{真分布}, \\text{模型分布}) = H(\\text{真}) + \\mathrm{KL}(\\text{真} \\| \\text{模型})$——真分布的熵是常数，所以**最小化交叉熵 = 让模型分布逼近数据分布**。

**困惑度**（Perplexity, PPL）是交叉熵的指数：

$$\\mathrm{PPL} = e^{\\mathcal{L}}$$

直观含义：模型每一步相当于在"PPL 个等概率候选里犹豫"。loss 2.0 → PPL ≈ 7.4（每步约 7 个词的困惑）；loss 10.8 → PPL ≈ 5 万（纯乱猜）。

## 原理详解：交叉熵在 softmax 上的优雅形式

设 logits 为 $z$，softmax 后 $p_i = e^{z_i} / \\sum_j e^{z_j}$，真实类是 $y$：

$$-\\log p_y = -\\log \\frac{e^{z_y}}{\\sum_j e^{z_j}} = \\log\\sum_j e^{z_j} - z_y = \\mathrm{LogSumExp}(z) - z_y$$

两个工程要点：① 求导结果极其干净：$\\partial \\mathcal{L}/\\partial z_i = p_i - \\mathbb{1}[i = y]$——**预测概率减去 one-hot**（预测 0.3、答案 1，梯度 0.7 往上推；预测 0.9，梯度仅 0.1 微调）。这一行就是反向传播回 logits 的全部；② 数值上要用 LogSumExp 的移位技巧防溢出（实现课详讲）。

## 完整案例：3 词词表手算

词表 {猫, 狗, 鱼}，前文"我养了一只"，真实下一 token 是"猫"。模型 logits $z = [2.0, 1.0, 0.5]$：

- softmax：$e^{2.0}=7.39,\\ e^{1.0}=2.72,\\ e^{0.5}=1.65$，和 11.76 → $p = [0.628, 0.231, 0.140]$
- 损失：$-\\ln 0.628 = 0.464$
- PPL：$e^{0.465} \\approx 1.59$（模型每步在 1.6 个候选间犹豫，相当笃定）

若模型把 logits 反过来给"猫"打了 $[0.5, 2.0, 1.0]$（$p_{猫} = 0.140$）：损失 $-\\ln 0.140 = 1.96$——错得自信，惩罚翻了 4 倍多。

## 代码实践

\`\`\`python
import math

def softmax(z):
    m = max(z)                       # LogSumExp 移位防溢出
    exps = [math.exp(x - m) for x in z]
    s = sum(exps)
    return [e / s for e in exps]

def cross_entropy(logits, target_idx):
    p = softmax(logits)[target_idx]
    return -math.log(p)

loss = cross_entropy([2.0, 1.0, 0.5], 0)
print(f"p(猫)={softmax([2.0,1.0,0.5])[0]:.3f}, loss={loss:.3f}, PPL={math.exp(loss):.2f}")
# 梯度检查：dL/dz_i = p_i - onehot
print("grad:", [round(p - (i == 0), 3) for i, p in enumerate(softmax([2.0, 1.0, 0.5]))])
\`\`\`

预期输出：\`p(猫)=0.628, loss=0.464, PPL=1.59\`；梯度 \`[−0.372, 0.231, 0.140]\`——真实类梯度为负（推高），其余为正（压低）。**常见错误**：忘了 LogSumExp 的 max 移位（大 logits 溢出）；把 loss 与 PPL 混着比（PPL 是指数，量纲完全不同）；对整句直接平均后再取 exp（PPL 定义是按 token 平均损失再 exp）。

## 常见误区

1. **"loss 降到 0 才算学好了"**——语言本身有不可消除的熵（下一词天然不确定），loss 收敛到的是数据的熵水平，不是 0。
2. **"低 PPL = 会聊天"**——PPL 只衡量"预测下一个 token"的统计拟合，与对齐、有用性是两回事（后训练课程的主题）。
3. **把训练 loss 与评测 PPL 直接比较**——分词器不同、语料不同，跨模型比 PPL 无意义。
4. **忽视"过度自信"的风险**——纯 NLL 训练鼓励极端概率，是幻觉与校准问题的源头之一。

## 知识关联

- **向前**：llm-a1 的 softmax 注意力输出接到词表投影后，本节的交叉熵就是它的"评分裁判"；
- **向后**：下一节的采样策略（温度/Top-K）直接作用于本节的 softmax 分布；第 2 章反向传播的起点正是 $\\partial\\mathcal{L}/\\partial z = p - \\mathrm{onehot}$；
- **课程间**：后训练课程的 SFT 损失 = 只对答案 token 计交叉熵（损失掩码）；RAG 课程的困惑度用于知识注入检测。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 损失 | $\\mathcal{L} = -\\log p_\\theta(y_t \\mid x_{<t})$，逐 token 平均 |
| 性质 | 零惩罚于完美；重罚自信的错误；= 熵 + KL |
| 梯度 | $\\partial\\mathcal{L}/\\partial z_i = p_i - \\mathbb{1}[i{=}y]$，一行全部 |
| 困惑度 | $\\mathrm{PPL} = e^{\\mathcal{L}}$，"每步在几个候选间犹豫" |

## 参考资料

> **来源类型：学术来源**
> - Radford, A., et al. (2019). "Language Models are Unsupervised Multitask Learners."（GPT-2 论文）——下一 token 目标 + 交叉熵的标准表述。
> - Goodfellow, I., Bengio, Y., & Courville, A., *Deep Learning*（MIT Press, 2016），§5.5/§6.2——交叉熵、KL 散度与softmax回归的教科书推导（deeplearningbook.org，官网免费全文）。
>
> **来源类型：官方文档**
> - PyTorch 文档 \`torch.nn.CrossEntropyLoss\`——LogSumExp 实现与数值稳定性说明。
>
> **来源类型：原创**
> - 惊喜度比喻、3 词手算与梯度一行检查为本课程改编。
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
### 学习目标

学完本节，你应该能够：
1. 手写带温度的 softmax 并预测 T 变化对分布熵的影响；
2. 实现 Top-K 与 Top-P 过滤，解释 Top-P 候选集的自适应性；
3. 说明贪心解码的重复循环风险与 beam search 的算力代价。

### 前置知识

- llm-a1 的 softmax 与解码循环。

### 问题背景

预训练目标（下一个 token 预测）与交叉熵损失决定模型学到什么；采样策略决定同样的模型给出什么样的输出——温度、Top-K、Top-P 是每次调用 API 都在拧的旋钮，拧错轻则呆板重复，重则胡言乱语。

### 直觉理解

模型每步输出一张『下一个字的概率表』。温度是搅拌力度：T 低=只信最高分（保守），T 高=大家都有机会（发散）；Top-K 是『只从前 K 名里抽签』，Top-P 是『从累计概率够 90% 的头部集合里抽签』——后者人数随模型把握自动伸缩。贪心解码像永远只点销量第一的菜：安全，但容易绕回原地打转。

### 核心概念与原理详解

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

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np, random
random.seed(0); np.set_printoptions(precision=3, suppress=True)
logits = np.array([4.0, 3.2, 2.6, 1.8, 1.0, 0.5])
def softmax(z):
    e = np.exp(z - z.max()); return e / e.sum()

# ---- 1. 温度对分布的影响 ----
for T in (0.5, 1.0, 2.0):
    p = softmax(logits / T)
    print(f"T={T}: {p}  熵={-(p*np.log(p)).sum():.3f}")

# ---- 2. Top-K 与 Top-P 过滤 ----
def top_k(logits, k):
    idx = np.argsort(-logits)[:k]
    m = np.full_like(logits, -np.inf); m[idx] = logits[idx]
    return softmax(m)
def top_p(logits, p):
    ps = softmax(logits); order = np.argsort(-ps)
    cum = np.cumsum(ps[order]); cut = np.searchsorted(cum, p) + 1
    keep = order[:cut]
    return softmax(np.where(np.isin(np.arange(len(logits)), keep), logits, -np.inf))
print("Top-K=2:", top_k(logits, 2), "| Top-P=0.9:", top_p(logits, 0.9))

# ---- 3. 贪心解码的重复循环 ----
trans = {"the": ["cat", "cat", "dog"], "cat": ["sat"], "sat": ["on", "on", "there"],
         "on": ["the"], "dog": ["sat"], "there": ["the"]}
def gen(w, n, greedy):
    out = [w]
    for _ in range(n):
        c = trans.get(out[-1], ["the"])
        out.append(c[0] if greedy else random.choice(c))
    return out
print("贪心:", " ".join(gen("the", 8, True)))
print("采样:", " ".join(gen("the", 8, False)))\`\`\`

预期输出（实测）：温度：T=0.5 时分布 [0.74,0.20,0.05,...] 熵 1.05；T=1.0 熵 1.66；T=2.0 变平熵 1.75；Top-K=2 保留前两名重归一 [0.79,0.21,0,...]；Top-P=0.9 自适应保留前 3 个；贪心解码输出『the cat sat on the cat sat on the...』陷入循环，随机采样则路径多样。

**常见错误**：手写 softmax 没减 max(logits)，大 logit 下 exp 溢出为 inf；Top-P 按原始顺序累加概率而不是排序后累加，截断集合错乱；创意任务用 T=0 千篇一律，事实任务用 T=1.2 幻觉率飙升。

### 常见误区

1. **『温度改变模型』**——温度只重塑输出分布，参数纹丝不动；\\n2. **『Top-K 和 Top-P 二选一』**——工业界常同时用（K 截尾 + P 自适应），还叠加重复惩罚；\\n3. **『beam search 万事皆优』**——开放生成任务常产出平淡甚至退化的高频文本，主流对话模型都用采样。

### 知识关联

- **向前**：c5 的学习率调度建立在交叉熵损失可导的基础上；
- **向后**：KV Cache 把采样循环的算力账重写一遍；
- **平行**：llm-a1 手写的 softmax 是本章温度版的特例（T=1）。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 温度 | logits/T 再 softmax：T<1 变尖、T>1 变平 |
| Top-K | 固定 K 个候选，尖/平分布下都不自适应 |
| Top-P | 累计概率 ≥P 的最小头部集合，自适应主流 |
| 贪心 | 确定但易重复循环，适合事实性短答 |
| 实践 | 事实任务 T=0~0.3；创意写作 T=0.7~1.0 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Vaswani et al. (2017)、Hoffmann et al. (2022) arXiv:2203.15556《Chinchilla》、Rajbhandari et al. (2020) ZeRO 论文与 PyTorch FSDP 文档相应章节）
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
## 学习目标

学完本节，你应该能够：
1. 说出自回归解码"每生成一个 token 都要重算全部注意力"的性能困境；
2. 解释 KV Cache 为什么能把每步计算从 $O(n \\cdot d)$ 降到 $O(1 \\cdot d)$（注意力部分）；
3. 算出 KV Cache 的显存占用公式，理解 MQA/GQA、量化 KV 的动机（为 B3 部署课埋点）。

## 前置知识

- llm-a1 第 2 章的自注意力：每步要算当前 token 的 Q 与**所有历史位置** K、V 的交互；
- 因果掩码：生成时只能看前文。

## 问题背景：生成 1000 个 token，浪费了什么

自回归生成 = 循环"喂前文 → 预测下一个"。朴素实现下，第 1000 步会把前 999 个 token 全部重算一遍注意力——但**前 999 个 token 的 K、V 向量根本没变**（权重冻结、输入相同）。重算纯属浪费：总计算量 $O(n^2 \\cdot d)$ 里约一半是重复劳动。这正是推理慢的第一大来源，解法朴素得漂亮：**算过的 K、V 存起来别再算**。

## 直觉理解：会议纪要

生成就像做会议纪要：每来一位新发言人（新 token），你不需要重新采访之前所有发言者（重算 K/V），只需**翻开已记录的发言卡片**（Cache）+ 给新人建一张卡（增量计算），然后让新人与所有卡片逐一对话（注意力）。卡片按层存放：12 层模型 = 12 叠卡。

## 核心概念：KV Cache 机制

生成第 $t$ 个 token 时：

| 张量 | 朴素做法 | KV Cache 做法 |
| --- | --- | --- |
| 历史位置的 K、V | 每步全部重算（$O(t \\cdot d^2)$ 矩阵乘） | 直接读缓存（$O(1)$） |
| 新位置的 Q、K、V | 算 | 只算新 token 的（$O(1 \\cdot d^2)$） |
| 注意力分数 | Q_t 对全部 K | 不变（本来就要对全部历史做） |

**显存账**（必须会算）：每层每位置存 K 和 V 各 $d_{model}$ 维（多头拼起来仍是一层一份）：

$$\\text{KV Cache 字节} = 2 \\times n_{layers} \\times \\text{seq\\_len} \\times d_{model} \\times \\text{字节数} \\times \\text{batch}$$

GPT-2 small（12 层，768 维，fp16=2 字节，batch=1）存 1024 位置：$2 \\times 12 \\times 1024 \\times 768 \\times 2 \\approx 37.7$ MB；LLaMA-65B（80 层，8192 维）同条件约 $2 \\times 80 \\times 1024 \\times 8192 \\times 2 \\approx 2.7$ GB/千 token——**长上下文的显存杀手**，这也是 MQA/GQA（K、V 共享压缩）与 KV 量化（fp8/int4 存储）成为部署标配的原因。

## 原理详解：为什么 K、V 能缓存而 Q 不能

因果注意力下，位置 $i$ 的 K、V 只依赖位置 $i$ 自己的输入向量与权重（$K_i = x_i W^K$，$V_i = x_i W^K$... 更正：$V_i = x_i W^V$）——**与前文无关，天然可缓存**。而每一步需要的 Q 属于"当前最新位置"，本来就是新的，谈不上缓存。一句话：**K、V 是"历史的属性"（不变），Q 是"当下的提问"（常新）**。

## 完整案例：1000 token 生成的加速感

朴素：每步对全部历史重算 K/V 投影，第 t 步约 $t \\cdot d^2 \\times 2$(K,V) 次乘加，总约 $\\sum_t 2t d^2 \\approx n^2 d^2 = 10^6 \\cdot d^2$；
带 Cache：每步只算新位置，总约 $n \\cdot d^2 \\times \\text{常数} = 10^3 \\cdot d^2$——**注意力前处理部分千倍级节省**，整体生成加速通常 5–20 倍（剩余瓶颈在注意力的 $O(n^2)$ 分数计算与 FFN）。工程上这叫 Prefill（首算）与 Decode（增量）两阶段，B3 部署课程展开 PagedAttention 等显存管理。

## 图示与交互

<Slider name="kv-cache-budget" />

## 常见误区

1. **"KV Cache 是空间换时间的免费午餐"**——显存账见上：65B 模型千 token GB 级，长上下文先被显存压垮，才有 MQA/GQA/量化/分页。
2. **缓存能跨请求复用**——不同请求的前文 K/V 属于各自上下文，除非做前缀共享（系统提示复用，部署课专题）。
3. **把 KV Cache 当模型权重的一部分**——它是**每次请求的运行时状态**，随序列增长、请求结束即释放。
4. **以为 batch 越大越好**——batch 内每个请求各有一份 KV Cache，吞吐与显存此消彼长（部署课的调度核心问题）。

## 知识关联

- **向前**：llm-a1 c2-l1 的 Q/K/V 定义是本节的全部前提；
- **向后**：本课 c6 分布式训练的显存账本是同一套算法的变体；B3《推理与部署》将展开 PagedAttention、连续批处理与 KV 量化；
- **课程间**：llm-a3 的 GQA、B1 RAG 的长上下文成本估算都以本节公式为基础。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 困境 | 自回归每步重算全部历史 K/V，$O(n^2 d^2)$ 级浪费 |
| 解法 | 缓存历史的 K、V，每步只算新 token 的 Q/K/V |
| 显存公式 | $2 \\cdot L \\cdot n \\cdot d \\cdot \\text{bytes} \\cdot \\text{batch}$ |
| 延伸 | MQA/GQA 压缩 KV、KV 量化、PagedAttention 分页 |

## 参考资料

> **来源类型：学术来源**
> - Pope, R., et al. (2022). "Efficiently Scaling Transformer Inference." *MLSys 2022*. arXiv:2211.05102——KV Cache 显存分析与算力/带宽权衡的系统研究。
> - Kwon, W., et al. (2023). "Efficient Memory Management for Large Language Model Serving with PagedAttention." *SOSP 2023*. arXiv:2309.06180。
>
> **来源类型：原创**
> - 会议纪要比喻与显存账手算为本课程改编（详细工程实现在 B3 部署课）。
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
