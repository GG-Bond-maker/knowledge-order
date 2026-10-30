import type { Chapter } from '../../types';
import { llmA1C13Exercises } from './llm-a1-c13-ex';

/* ============================================================
 *  《从零手写大模型》第 13 章：推理模型是什么
 *
 *  c13-l1  推理不是预测：base 模型为什么会「答得很快但答错」
 *  c13-l2  Qwen3-0.6B 解剖：对比你手写的 GPT
 *  c13-l3  加载预训练权重与第一次推理
 *  c13-l4  base vs reasoning：两种模型的分工
 *
 *  口径：结构数字取自 Qwen3-0.6B 的 config.json（实测）；
 *  行为数字取自本站 .venv-pytorch 后端对同一份权重的实测输出。
 *  与 llm-a1 c3-c12 的分工：那边写零件，这边只做「对照 + 装载 + 使用」。
 * ============================================================ */

export const llmA1C13Chapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'llm-a1-c13',
    title: '推理模型是什么：从 GPT 到会思考',
    goal: '把你手写的 GPT 与工业级 Qwen3 逐项对照，搞清「会推理」到底改了哪里；亲手装载 596 M 参数的真实权重并跑出第一个 \\boxed{} 答案，最后分清 base 与 reasoning 两种模型各自该在什么场合出场。',
    lessons: [
      /* ─────────────────────────── l1 ─────────────────────────── */
      {
        id: 'llm-a1-c13-l1',
        title: '推理不是预测：base 模型为什么会「答得很快但答错」',
        difficulty: 2,
        content: `
## 学习目标

学完本节，你应该能够：
1. 说出 base 语言模型的目标函数（下一个 token 的似然），并解释为什么这个目标**不奖励思考**；
2. 用「单次前向的计算量是固定的」这一条，说明模型为什么会「答得很快」——以及快为什么会导致错；
3. 用「token 预算 = 计算预算」解释 CoT（思维链）的本质，并说出它在什么情况下无效。

## 前置知识

- c11 文本生成（采样与解码）：模型一次只吐一个 token，然后把自己吐的 token 接回输入；
- c2 的七步数据流：知道一次前向要经过 Embedding → N×Block → 输出投影。

## 问题背景：一个让人不安的对比

c10-c11 里你把 GPT-2 的权重装进自己写的模型，它能流畅续写英文。现在换一个真实的、2025 年的小模型——Qwen3-0.6B（5.96 亿参数）——问它一道初中代数题：

> Half the value of $3x-9$ is $x+37$. What is the value of $x$?

它秒答：**12**。

正确答案是 **83**。

更让人不安的是：它答错的时候**语气和答对的时候一模一样**。没有犹豫、没有「我不确定」、没有任何信号告诉你该复核。而同一道题，只要在提示词里加一句「请一步一步推理」，它就答对了 83。

**同一个模型、同一份权重、同一个问题，唯一的差别是「让不让它写中间过程」。** 这一节要回答的就是：为什么会这样。

## 直觉理解：系统 1 与系统 2

心理学家 Kahneman 把人的思考分成两套系统：

| | 系统 1（快） | 系统 2（慢） |
| --- | --- | --- |
| 特征 | 直觉、自动、几乎不费力 | 分析、刻意、要消耗注意力 |
| 例子 | 看到 2+2 立刻想到 4 | 心算 17×24 |
| 出错方式 | 快但会掉进陷阱 | 慢但能自我检查 |

大模型的 base 版本是**纯系统 1**：它每次前向传播的计算量是固定的（28 层 × 1024 维，一个 token 就是这么多矩阵乘），不管题目多难，都是这一遍。所以它「想都不想」就给答案——因为它**没有地方可以想**。

CoT 干的事，本质是**给模型一个地方去想**：让它把中间结果写成 token，而这些 token 会成为下一步的输入。于是「思考」变成了「多跑几次前向」。这就是**用 token 换计算**。

## 核心概念与原理详解

### base 模型到底在优化什么

自回归语言模型的训练目标是最大化训练语料里下一个 token 的条件概率：

$$
\\max_\\theta \\sum_{t} \\log P_\\theta(x_t \\mid x_1, \\dots, x_{t-1})
$$

注意这个目标里**没有「答对」这一项**。它只要求「预测得像语料里的下一个词」。如果训练语料里大量出现「问题 → 直接答案」这种格式，那么「直接给答案」就是**统计上正确的行为**——哪怕答案是错的。

**这就是 base 模型答错的根本原因：它在模仿格式，不是在求解问题。**

### 「答得快」的机制：一次前向 = 固定计算量

c2 的七步数据流里，第 ④ 步是 N 层 Block。对 Qwen3-0.6B 来说 N=28、d=1024、FFN 中间维 3072。**每生成一个 token，这套矩阵乘就要完整跑一遍**，计算量与你问的问题有多难**完全无关**。

所以：

| 题目 | 实际需要的推理步数 | base 模型花的前向次数 | 结果 |
| --- | --- | --- | --- |
| $17+25$ | 1（查表级） | 1 次前向出第一个 token，后面在复述答案 | 42 ✅ |
| $12 \\times 4$ | 1 | 同上 | 48 ✅ |
| $100-37$ | 1 | 同上 | 63 ✅ |
| Half of $3x-9$ is $x+37$ | 约 5 步（去分母、移项、合并、求解、代回） | **仍然是 1 次前向** | 12 ❌ |

前三个是「一步就能出结果」的题，所以固定计算量够用。第四题需要五次串行运算，而 base 模型只肯做一次——它只能靠「见过类似题」的模式匹配去猜一个数。

### token 预算就是计算预算

自回归生成有个关键性质：**每多生成一个 token，就多一次完整前向**。所以「允许生成多少 token」直接等于「允许做多少次计算」。

本站后端对同一道题的实测（Qwen3-0.6B，贪心解码，只改 \`max_new_tokens\`）：

| 生成预算 | 实际生成 | 耗时 | 抽出的答案 | 正确（83）？ |
| --- | --- | --- | --- | --- |
| 48 token | 48 | 5.2-5.8 s | 无 \`\\boxed{}\`（还没写完就被截断） | ❌ |
| 240 token | 195（自然结束） | 18.1-21.7 s | 83 | ✅ |

**这是本节最该记住的一张表**：答案的质量取决于给了多少 token。48 个 token 时它连推理都还没展开，240 个 token 时它自己走完了五步。

### CoT 的本质：把中间状态写进上下文

为什么「写出来」会有用？因为 Transformer 的注意力只能看到**上下文里已有的 token**。如果一个中间结果只存在于模型的隐状态里，下一步就没法可靠地取用它；但一旦写成 token，它就成了后续所有位置的可见输入。

用 c2 的形状语言说：

| 做法 | 上下文长度 | 前向次数 | 中间结果在哪 |
| --- | --- | --- | --- |
| 直接答 | $n$ | 1 | 只在隐状态里，下一 token 无法稳定读取 |
| CoT | $n + m$（$m$ 是思考 token 数） | $1 + m$ | 在上下文里，任何位置都能注意到 |

所以 CoT 不是「提示词魔法」，而是**把串行计算外化到序列维度上**。这也解释了它的两个已知局限：

1. **预算不够就无效**：思考被截断，等于没思考（上表 48 token 那一行）；
2. **能力不足时写了也没用**：如果模型本身不具备「去分母」这个能力，写再多行也只是把错误摊开（c15-l3 会给出投票失效的实测）。

## 机制图解

<Diagram type="tensor" steps="问题 token×n|第一次前向|下一个 token|接回上下文|再前向一次|…（每 token 一次）|\\boxed{答案}" note="每个新 token 都要重跑一次完整的 28 层前向。生成 200 个思考 token，就等于把这个模型跑了 200 遍——这就是「用 token 换计算」的字面含义。" />

上图是自回归生成的循环。请注意两件事：

1. **循环的次数 = 生成的 token 数**。想让它多想，就得让它多写；想让它少花钱，就得接受它想得少。
2. **第一个 token 的计算量和最后一个完全一样**。所以「答得快」不是它偷懒，而是它的架构里根本没有「多想一会儿」这个动作——除非你把想法写成字。

## 完整案例：一道题的两种死法

把上面两张表拼起来看同一道题（Half the value of $3x-9$ is $x+37$）：

**路线 A：直接答（系统 1）**

\`\`\`
Question: Half the value of $3x-9$ is $x+37$. What is the value of $x$?
Answer: 12
\`\`\`

模型在第一个 token 就落到了「12」。之后它开始复述「So, the answer is 12」——**后面的 token 全在给第一个 token 找理由**。这是自回归的必然结果：一旦开头错了，后面只会越错越自信。

**路线 B：带 CoT（模拟系统 2）**

\`\`\`
Step 1: Multiply both sides by 2   → 3x - 9 = 2x + 74
Step 2: Subtract 2x               → x - 9 = 74
Step 3: Add 9                     → x = 83
\\boxed{83}
\`\`\`

每一步的结论都写进了上下文，下一步能**看到**上一步的结果。错误可以被后面的步骤发现并纠正（实测模型确实会在中途写出「Wait, let me check that again」，然后改掉）。

**关键对比**：路线 A 用了 1 次有效计算，路线 B 用了 5 次串行计算。这道题的门槛就在「5 次」附近，所以 A 必错、B 必对。

## 代码实践

下面的演示做三件事：

1. 装载真实的 Qwen3-0.6B（596.0 M 参数），打印冷加载耗时；
2. 用**同一套提示格式**问四道题，对比 base 的表现：三道简单题 + 一道中等题；
3. 打印每题的生成 token 数与耗时，让你看到「答得快」的具体数字。

> **注意**：首次装载模型需要约 8.6-10.0 秒（规格基线；本站已启用模型常驻缓存，但 demo 子进程仍需自加载，实测在 5.3-7.9 秒间浮动）。demo 打印的是**当次实测值**。

## 常见误区与安全风险

1. **「模型答错是因为参数太少」**。同一份 596 M 权重，加一句 CoT 就从 12 变成 83。所以「答错」和「容量」不是一回事——**更多时候是计算预算不够**。
2. **「base 模型答错时它自己知道」**。不知道。它的训练目标里没有「置信度校准」这一项，所以答错和答对的输出分布长得一模一样。这也是为什么必须有 c14 的评估环节：**你只能靠判分器知道它错没错，不能靠它的语气。**
3. **「CoT 是万能的」**。它只在「模型具备该能力、但默认不展开」时有效。如果模型根本没学过某个运算，CoT 只会把错误写得更长。c15-l3 会用投票失效的实测数据说明这一点。
4. **安全风险**：base 模型没有任何对齐训练。它会无条件续写你给的任何前缀（包括有害内容）。**生产环境绝不能直接把 base 模型暴露给用户**——c13-l4 会讲清 base 与 instruct 的分工边界。

## 与其他知识点的关联

- **向前**：c2 的七步数据流是本节「一次前向 = 固定计算量」的依据；c11 的自回归解码是「每 token 一次前向」的来源；
- **向后**：c13-l2 解剖 Qwen3 的结构，c13-l3 真正装载它，c13-l4 区分 base 与 reasoning；c15 会把「用 token 换计算」做成系统方法（CoT 提示、self-consistency、Best-of-N）；
- **平行**：本站《大模型训练原理》讲的是「怎么把这个目标函数训出来」，本节只关心「训出来的东西行为如何」；llm-b4 的 RLHF 章节讲的是如何把 base 变成 instruct——那是另一种「改造」，和 CoT 的「推理时改造」不是一回事。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| base 的目标 | 最大化下一个 token 的似然，**不包含「答对」** |
| 为什么快 | 每 token 一次完整前向，计算量与题目难度无关 |
| 为什么错 | 需要 5 步串行运算的题，它只肯做 1 步 |
| CoT 的本质 | 把中间结果写成 token，让它们成为后续位置的可见输入 = 用 token 换计算 |
| 实测证据 | 48 token 预算答不出（无 boxed）；240 token 预算答对 83 |
| 两个局限 | 预算不够就无效；能力不足时写了也没用 |

## 参考资料与延伸阅读

> **来源类型：权威教材**
> - Raschka, S. *Build a Reasoning Model (From Scratch)*. Manning, 2025. ISBN 9781633434677——第 1-2 章「推理模型与 base 模型的差别」「用 token 换计算」；本课程在概念框架上参考该书，全部代码与实测数据为本站自主编写与实测。
> - 原书代码为 Apache 2.0 许可；本课程代码为自主编写，仅参考章节结构与教学方法。
>
> **来源类型：权威教材**
> - Kahneman, D. *Thinking, Fast and Slow*. Farrar, Straus and Giroux, 2011——系统 1 / 系统 2 的原始论述；本课程借用该类比解释 base 模型的行为，但**不声称**二者在机制上等价。
>
> **来源类型：论文**
> - Wei et al. (2022). "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models." *NeurIPS*——CoT 的原始论文。
>
> **来源类型：原创**
> - 「答得快但答错」的四题实测表、token 预算对照表（48 / 240）、机制图解、本节全部习题。

## 动手实验

1. **复现预算效应**：把 demo 里的 \`max_new=16\` 改成 \`48\` 和 \`240\`，观察第四题答案怎么从「无 boxed」变成 \`83\`。记录两次的 token 数与耗时，算一下「多想」的性价比。
2. **换个提问格式**：把 \`Question: ... \\nAnswer:\` 改成 \`Q: ... \\nA:\`，看简单题还对不对。想一想：为什么格式一改，同一个模型的表现会变？
3. **找它的能力边界**：自己出五道需要 2-3 步的算术题（例如「一箱苹果 24 个，卖掉 3/8，还剩几个」），看 base 错在哪一步。把错误类型分类（算错 / 理解错 / 格式跑偏）。

验收标准：你能不看笔记说清「base 为什么答得快」「CoT 为什么有用」「为什么 token 预算会影响答案质量」这三件事，并能用 48 / 240 那组数字作为证据。
`,
        tips: [
          {
            kind: 'pitfall',
            text: '最容易搞混的是「base 模型答错」和「模型能力不足」。同一份 596 M 权重，加 CoT 就从 12 变 83——说明能力在，只是默认不展开。判断时应先问「预算够不够」，再问「会不会」。',
          },
          {
            kind: 'note',
            text: 'base 模型的训练目标里没有「答对」这一项，只有「预测得像语料里的下一个词」。所以它在模仿格式，不是求解问题。这个区别解释了它全部的行为特征，包括答错时的自信语气。',
          },
          {
            kind: 'interview',
            text: '面试题：「CoT 为什么有效？」低分答法说「因为让模型一步一步想」。高分答法要指出机制：Transformer 的注意力只能看到上下文里的 token，中间结果必须写成 token 才能被后续位置可靠取用；因此 CoT 是把串行计算外化到序列维度，代价是 token 数与延迟。',
          },
          {
            kind: 'performance',
            text: '自回归生成的成本与生成 token 数线性相关：每多一个 token 就多一次完整前向。本站实测 Qwen3-0.6B 生成 48 token 约 5.2-5.8 秒、195 token 约 18.1-21.7 秒。生产环境里「让模型多想」直接等于「多花钱、多等」，必须按题目难度分级设置预算。',
          },
        ],
        demos: [
          {
            title: 'base 模型的四题实测：简单题全对，中等题答错',
            lang: 'python',
            code: `import os, sys, time
sys.stdout.reconfigure(encoding="utf-8")

# ── 1. 让 transformers 找到本地已下载的模型（本站把权重放在项目内）──
def find_hf_home():
    cands = []
    if os.environ.get("HF_HOME"):
        cands.append(os.environ["HF_HOME"])
    for base in (r"D:\\Python_Project\\knowledge-order", os.getcwd(),
                 os.path.dirname(os.getcwd()), os.path.dirname(os.path.dirname(os.getcwd()))):
        cands.append(os.path.join(base, ".models", "hf"))
    cands.append(os.path.expanduser("~/.cache/huggingface"))
    for c in cands:
        if c and os.path.isdir(os.path.join(c, "hub")):
            return c
    raise SystemExit("找不到本地模型缓存，请先下载 Qwen/Qwen3-0.6B")

os.environ["HF_HOME"] = find_hf_home()
os.environ["HF_HUB_OFFLINE"] = "1"          # 只用本地缓存，不联网
os.environ["TRANSFORMERS_VERBOSITY"] = "error"

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from transformers.utils import logging as hf_logging
hf_logging.set_verbosity_error()
hf_logging.disable_progress_bar()

MODEL_ID = "Qwen/Qwen3-0.6B"

t0 = time.time()
tok = AutoTokenizer.from_pretrained(MODEL_ID)
model = AutoModelForCausalLM.from_pretrained(MODEL_ID, dtype=torch.float32)
model.eval()                                  # 关键：关掉 dropout
load_s = time.time() - t0
n_param = sum(p.numel() for p in model.parameters())
print(f"冷加载 {load_s:.1f} 秒，参数量 {n_param/1e6:.1f} M")
print("（demo 打印的是当次实测值，会随磁盘缓存冷热浮动）\\n")

def ask(question, max_new=16):
    """让 base 模型「直接给答案」：给一个 Answer: 前缀，不给推理指令。"""
    prompt = f"Question: {question}\\nAnswer:"
    ids = tok(prompt, return_tensors="pt").input_ids
    t = time.time()
    with torch.no_grad():
        out = model.generate(ids, max_new_tokens=max_new, do_sample=False,
                             pad_token_id=tok.pad_token_id or tok.eos_token_id)
    dt = time.time() - t
    n = out.shape[1] - ids.shape[1]
    text = tok.decode(out[0][ids.shape[1]:], skip_special_tokens=True)
    return text.strip().replace("\\n", " / ")[:40], n, dt

print(f"{'题目':<46}{'base 的回答':<44}{'token':>6}{'秒':>7}")
print("-" * 106)
CASES = [
    ("What is $17+25$?",                        "42"),
    ("What is $12 \\\\times 4$?",                 "48"),
    ("What is $100-37$?",                       "63"),
    ("Half the value of $3x-9$ is $x+37$. What is the value of $x$?", "83"),
]
total_tok = 0
for q, gold in CASES:
    ans, n, dt = ask(q)
    total_tok += n
    ok = gold in ans
    print(f"{q[:46]:<46}{ans:<44}{n:>6}{dt:>7.1f}  {'对' if ok else '错'}")

print(f"\\n合计生成 {total_tok} token")
print("\\n观察：前三题 base 全对（42 / 48 / 63），第四题答 12（正确 83）。")
print("它「答得很快」——每题只花两三秒、十几个 token；但中等题直接答错。")
print("这不是参数不够，是它只肯做一次前向的计算。")`,
          },
        ],
      },

      /* ─────────────────────────── l2 ─────────────────────────── */
      {
        id: 'llm-a1-c13-l2',
        title: 'Qwen3-0.6B 解剖：对比你手写的 GPT',
        difficulty: 3,
        content: `
## 学习目标

学完本节，你应该能够：
1. 说出 Qwen3-0.6B 的八个关键结构数字（28 层 / 1024 维 / 16 头 / 8 KV 头 / 词表 151936 / 上下文 40960 / FFN 3072 / 权重共享），并指出它们各自出现在 config 的哪个字段；
2. 用 c2 学过的参数公式，把 596.0 M 参数逐项算出来并验证总和；
3. 列出 Qwen3 相对 GPT-2 改了哪五处，并说出每处改动的动机。

## 前置知识

- c2 的参数账（4d² 注意力 + 2·d·d_ff FFN）；
- c8 的 Pre-LN Block 结构；
- 听过 RoPE / RMSNorm / SwiGLU / GQA 这四个名字（细节在《从 GPT-2 到 LLaMA》课程，本节只做对照，不重讲原理）。

## 问题背景：你手写的 GPT 与真实模型差在哪

c3-c12 你写出了一个 GPT-2 架构的模型。它能跑，但和 2025 年的真实模型比，中间隔了五年。这五年里业界改了一批零件，而且改动是**有明确动机**的——不是为了炫技。

如果只会背「Qwen 用 RoPE」，你遇到一个新模型（DeepSeek、Llama 4、Gemma）还是看不懂。正确的做法是：**拿着你手写的那张图去逐项对照，问「这一处为什么改」**。

## 直觉理解：同一辆车，换了五个零件

想象你造了一辆 1990 年的车（GPT-2）。现在给你一辆 2025 年的车（Qwen3），外观尺寸差不多、开起来也一样（都是自回归 Transformer）。但拆开看：

- 悬挂换了（LayerNorm → RMSNorm）；
- 发动机换了（GELU → SwiGLU）；
- 变速箱换了（绝对位置 → RoPE）；
- 传动比改了（MHA → GQA，KV 头减半）；
- 油箱加大了（词表 50257 → 151936，上下文 1024 → 40960）。

**底盘没动**（Pre-LN + 残差 + 注意力 + FFN 的四件套）。所以你在 c8 学的东西一个字都不用改——变的只是零件选型。

## 核心概念与原理详解

### 八个出厂数字

Qwen3-0.6B 的 \`config.json\` 里，下面这些字段决定了它的全部结构：

| 项 | 字段名 | 数值 | 含义 |
| --- | --- | --- | --- |
| 层数 | \`num_hidden_layers\` | **28** | Block 堆 28 个 |
| 隐藏维 | \`hidden_size\` | **1024** | 残差流的宽度 |
| Q 头数 | \`num_attention_heads\` | **16** | 每头 128 维（16×128 = 2048） |
| KV 头数 | \`num_key_value_heads\` | **8** | 每 2 个 Q 头共享 1 组 KV |
| 词表 | \`vocab_size\` | **151936** | 中英混合的大词表 |
| 上下文 | \`max_position_embeddings\` | **40960** | 约 4 万 token |
| FFN 中间维 | \`intermediate_size\` | **3072** | 是 3d 而不是 4d |
| 权重共享 | \`tie_word_embeddings\` | **True** | 输入嵌入与输出投影共用 |

还有一个不在上表但很关键的：\`head_dim = 128\`。注意 **16 × 128 = 2048 ≠ 1024**——Qwen3 的注意力内部是升维的，投影完再降回 1024。这是很多人的第一个困惑点。

### 把 596.0 M 算出来

用 c2 的公式，逐项算：

| 零件 | 计算式 | 参数量 | 占全模型 |
| --- | --- | --- | --- |
| Embedding | 151936 × 1024 | 155,582,464 | 26.1% |
| 每层 Q 投影 | 1024 × (16×128) | 2,097,152 | — |
| 每层 K 投影 | 1024 × (8×128) | 1,048,576 | — |
| 每层 V 投影 | 1024 × (8×128) | 1,048,576 | — |
| 每层 O 投影 | (16×128) × 1024 | 2,097,152 | — |
| **每层注意力合计** | | **6,291,456** | 占每层 40.0% |
| **每层 FFN（SwiGLU）** | 3 × 1024 × 3072 | **9,437,184** | 占每层 60.0% |
| 每层 RMSNorm ×2 | 2 × 1024 | 2,048 | ≈0% |
| **每层合计** | | **15,730,688** | — |
| 28 层合计 | 28 × 15,730,688 | 440,459,264 | 73.9% |
| final RMSNorm | 1024 × 2 | 2,048 | ≈0% |
| lm_head | 与 Embedding 共享 | **0** | — |
| **总计** | | **596,043,776** | 100% |

三个读数：

1. **FFN : 注意力 = 1.50 : 1**，而 GPT-2 是 2 : 1。原因是 SwiGLU 用了**三个**矩阵（gate / up / down）但中间维只有 3d 而非 4d：$3 \\times 3d^2 = 9d^2$，对比 GPT-2 的 $2 \\times 4d^2 = 8d^2$。**参数略多，但计算量更省**（门控让同样的宽度表达力更强）。
2. **Embedding 占 26.1%**——比 GPT-2 的 28.6% 略低，但仍然很重。小模型的「查表税」压不下去：词表大是为了中英双语，而隐藏维小是因为总共只有 6 亿参数。
3. **lm_head 一个参数都不占**。因为 \`tie_word_embeddings=True\`：同一个 151936×1024 矩阵，既用来把 token 查成向量，也用来把向量打分回词表。这一项直接省下 1.56 亿参数（26%）。

### 五处改动，五个动机

| # | GPT-2 | Qwen3 | 动机 |
| --- | --- | --- | --- |
| 1 | LayerNorm（有 β） | **RMSNorm**（无 β、不减均值） | 少一次减均值、少一组参数；实测训练同样稳，速度更快 |
| 2 | GELU | **SwiGLU**（门控） | 用 $\mathrm{swish}(xW_g) \\odot (xW_u)$ 做门控，同等宽度表达力更强 |
| 3 | 可学习绝对位置（1024 上限） | **RoPE**（\`rope_theta=1e6\`） | 用旋转实现相对位置，可外推到 40960；theta 调大是为了长上下文 |
| 4 | MHA（12 头 = 12 组 KV） | **GQA**（16 Q 头 / 8 KV 头） | KV Cache 减半；生成时显存与带宽都省一半 |
| 5 | 独立 lm_head | **tie_word_embeddings** | 省 26% 参数（小模型尤其重要） |

**为什么第 4 条对推理模型特别重要**：推理模型要生成几百上千个思考 token，KV Cache 会随长度线性增长。GQA 把 KV 头从 16 降到 8，直接砍掉一半缓存。**这就是「架构选型服务于使用场景」的具体例子**。

### 为什么是 28 层 / 1024 维这个组合

总参数约 6 亿，要在「层数」和「宽度」之间分配。Qwen3-0.6B 选了 28 层 × 1024 维。对照 GPT-2 Small 的 12 层 × 768 维：

| | GPT-2 Small | Qwen3-0.6B | 倍数 |
| --- | --- | --- | --- |
| 层数 | 12 | 28 | 2.3× |
| 隐藏维 | 768 | 1024 | 1.33× |
| 每层参数 | 7.08 M | 15.73 M | 2.2× |
| 总参数 | 124 M | 596 M | 4.8× |

**它选择了「更深」而不是「更宽」**。原因：深度带来的是串行计算步数（每层一次非线性变换），宽度带来的是并行容量。对**需要多步推理**的任务，深度更值钱——这和 c13-l1 讲的「串行步数」正好呼应。

## 机制图解

<Diagram type="arch" name="llama-assembly" note="把这张图与 c8 的 transformer-block 对照看：Block 的四件套（Pre-LN + 残差 + 注意力 + FFN）一个都没变，变的全是「零件内部」。这就是为什么 c3-c9 学的东西可以直接迁移到 Qwen3。" />

上图是「从 GPT-2 Block 到 LLaMA 系 Block」的零件替换路径。Qwen3 走的就是这条路。请注意：

1. **外壳完全一致**——两个残差、两个 Norm 在子层之前，这就是 c8 的 Pre-LN；
2. **四处换件都在子层内部**——Norm 的类型、注意力的头共享方式、位置编码的注入方式、FFN 的激活结构；
3. **换完之后参数量要重算**，不能沿用 GPT-2 的 $12d^2$ 公式（SwiGLU 是 $9d^2$、GQA 让注意力的 KV 部分减半）。

## 完整案例：把 596 M 拆成「每层多少」

真实调试时你最常问的问题是「这一层的显存/参数花在哪」。以一层为例：

| 子模块 | 参数量 | 占每层 | 说明 |
| --- | --- | --- | --- |
| \`input_layernorm\` | 1,024 | 0.007% | 只有 gamma，没有 beta |
| \`self_attn.q_proj\` | 2,097,152 | 13.3% | 1024 → 2048 |
| \`self_attn.k_proj\` | 1,048,576 | 6.7% | 1024 → 1024（8 头 ×128） |
| \`self_attn.v_proj\` | 1,048,576 | 6.7% | 同上 |
| \`self_attn.o_proj\` | 2,097,152 | 13.3% | 2048 → 1024 |
| \`post_attention_layernorm\` | 1,024 | 0.007% | |
| \`mlp.gate_proj\` | 3,145,728 | 20.0% | 1024 → 3072 |
| \`mlp.up_proj\` | 3,145,728 | 20.0% | 1024 → 3072 |
| \`mlp.down_proj\` | 3,145,728 | 20.0% | 3072 → 1024 |
| **合计** | **15,730,688** | 100% | |

**注意 FFN 的三个矩阵各占 20%**——这就是 SwiGLU 与 GELU-FFN 的结构差异：GELU 版只有 up / down 两个矩阵，SwiGLU 多一个 gate。所以「SwiGLU 参数更多」是真的（$9d^2$ vs $8d^2$），但它换来了表达力。

## 代码实践

下面的演示做三件事：

1. 用 \`AutoConfig\` 只读配置文件（**不加载 6 亿个权重**，所以快得多），打印八个出厂数字；
2. 用 c2 的公式逐项算参数，验证总和正好 596.0 M；
3. 打印一张 Qwen3 与 GPT-2 Small 的逐项对照表。

> **注意**：\`AutoConfig.from_pretrained\` 只解析 JSON，但仍然要经过 Hugging Face 的缓存查找，本站实测约 12-15 秒（主要是首次访问缓存目录的开销；缓存已热时可降到 12 秒以内）。它比加载完整权重（8.6-10.0 秒 + 596 M 参数读盘）省得多——**这是读结构时的正确姿势**。

## 常见误区与安全风险

1. **「16 头 × 128 维 = 1024，正好等于隐藏维」**。错。Qwen3 的 \`head_dim\` 是 128 而 \`hidden_size / num_heads = 64\`。注意力内部是 **2048 维**（16×128），投影完再降回 1024。算参数时如果按 64 维算，会少算一半。
2. **「GQA 减少的是参数量」**。主要收益不在参数（KV 投影从 2×2.1M 降到 2×1.05M，只省 2M/层），而在**推理时的 KV Cache 显存与带宽**。生成 4000 token 时，KV Cache 减半就是几 GB 的差别。
3. **「SwiGLU 是三个矩阵所以一定更贵」**。参数确实多 12.5%（$9d^2$ vs $8d^2$），但 Qwen3 把中间维从 4d 降到 3d，所以实际是 $9d^2$ 对 GPT-2 的 $8d^2$——**只多一点点**。不要看到「三个矩阵」就以为参数量翻倍。
4. **安全风险**：读 \`config.json\` 是安全的，但**不要**用 \`trust_remote_code=True\` 去加载来路不明的模型。那会执行模型仓库里的任意 Python 代码。本站所有模型都只用官方 transformers 实现。

## 与其他知识点的关联

- **向前**：c2 的参数公式是本节全部计算的依据；c8 的 Pre-LN Block 是「外壳不变」的参照；
- **向后**：c13-l3 用本节算出的数字去实际装载模型（你会看到 596.0 M 与算出来的完全一致）；c13-l4 讨论 base 与 reasoning 的分工；c15 的推理时扩展会用到 GQA 带来的 KV Cache 收益；
- **平行**：《从 GPT-2 到 LLaMA》课程会深入讲 RoPE / RMSNorm / SwiGLU / GQA 的数学细节，本节只做**对照**，不重讲原理；《大模型训练原理》讲这些结构是怎么被训出来的。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 八个数字 | 28 层 / 1024 维 / 16 Q 头 / 8 KV 头 / 151936 词表 / 40960 上下文 / 3072 FFN / tie=True |
| 总参数 | 596,043,776 ≈ 596.0 M（与 \`sum(p.numel())\` 完全一致） |
| 每层构成 | 注意力 40.0% + FFN 60.0% + Norm ≈0% |
| FFN : 注意力 | 1.50 : 1（GPT-2 是 2 : 1，因为 SwiGLU 用 3d 而非 4d） |
| 五处改动 | RMSNorm / SwiGLU / RoPE / GQA / 权重共享 |
| 最省参数的一处 | 权重共享，直接省 1.56 亿（26%） |
| 最影响推理的一处 | GQA，KV Cache 减半 |

## 参考资料与延伸阅读

> **来源类型：权威教材**
> - Raschka, S. *Build a Reasoning Model (From Scratch)*. Manning, 2025. ISBN 9781633434677——第 2 章「用 Qwen3-0.6B 作为推理实验的基座」；本课程把该书的「直接用」改成了「逐项对照 + 自己算参数」，代码与数字为本站自主实测。
> - 原书代码为 Apache 2.0 许可；本课程代码为自主编写，仅参考章节结构与教学方法。
>
> **来源类型：官方文档**
> - Qwen Team. *Qwen3 Technical Report*. 2025——Qwen3 系列的结构与训练说明；本节的八个数字取自模型仓库的 \`config.json\`（实测读取）。
> - Radford et al. (2019). "Language Models are Unsupervised Multitask Learners."（GPT-2 技术报告）——对照表中的 GPT-2 Small 配置来源。
>
> **来源类型：论文**
> - Ainslie et al. (2023). "GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints." *EMNLP*——GQA 的原始论文。
>
> **来源类型：原创**
> - 参数账逐项表、「五处改动五个动机」对照表、每层参数拆解表、本节全部习题。

## 动手实验

1. **改配置重算**：假设 Qwen3 把 \`num_key_value_heads\` 从 8 改成 16（退回 MHA），用本节的公式重算总参数与每层参数，算出 KV Cache 会变成几倍。
2. **验证 head_dim 陷阱**：用 \`hidden_size // num_attention_heads\`（=64）代替 \`head_dim\`（=128）算一遍注意力参数，看结果比 596.0 M 少多少。这个错误在面试和代码 review 里都很常见。
3. **横向对照**：找一个你感兴趣的模型（Llama 3.2 1B、Gemma 2 2B、DeepSeek-V2-Lite），读它的 config，填出同样的八个数字表，看看谁选了更深的层数、谁选了更大的词表。

验收标准：你能不看笔记写出 Qwen3-0.6B 的八个数字、独立算出 596.0 M、并说清五处改动各自的动机（而不是只背名字）。
`,
        tips: [
          {
            kind: 'pitfall',
            text: '最常见的算错点是 head_dim：Qwen3-0.6B 的 head_dim=128，而 hidden_size/num_heads=64。注意力内部是 16×128=2048 维，投影完再降回 1024。按 64 维算会把注意力参数少算一半，总参数就对不上 596.0 M。',
          },
          {
            kind: 'note',
            text: 'Block 的四件套（Pre-LN + 残差 + 注意力 + FFN）从 GPT-2 到 Qwen3 一个都没变。变的只是零件选型。所以 c3-c9 学的东西可以整体迁移——这是本课程先讲 GPT-2 再对照 Qwen3 的理由。',
          },
          {
            kind: 'interview',
            text: '面试题：「GQA 带来什么收益？」低分答法说「减少参数」。高分答法指出：参数量只省一点点（KV 投影减半），真正的收益在推理时的 KV Cache 显存与显存带宽——生成越长收益越大。对需要长思考的推理模型，这一条比参数更重要。',
          },
          {
            kind: 'performance',
            text: 'tie_word_embeddings=True 让 Qwen3-0.6B 直接省下 155,582,464 个参数（26%）。小模型词表大（151936）而隐藏维小（1024），这个「查表税」占比很高，共享权重是性价比最高的一处优化。',
          },
        ],
        demos: [
          {
            title: '只读 config 算参数：验证 596.0 M 与逐项对照',
            lang: 'python',
            code: `import os, sys, time
sys.stdout.reconfigure(encoding="utf-8")

def find_hf_home():
    cands = []
    if os.environ.get("HF_HOME"):
        cands.append(os.environ["HF_HOME"])
    for base in (r"D:\\Python_Project\\knowledge-order", os.getcwd(),
                 os.path.dirname(os.getcwd()), os.path.dirname(os.path.dirname(os.getcwd()))):
        cands.append(os.path.join(base, ".models", "hf"))
    cands.append(os.path.expanduser("~/.cache/huggingface"))
    for c in cands:
        if c and os.path.isdir(os.path.join(c, "hub")):
            return c
    raise SystemExit("找不到本地模型缓存")

os.environ["HF_HOME"] = find_hf_home()
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_VERBOSITY"] = "error"

t0 = time.time()
from transformers import AutoConfig
cfg = AutoConfig.from_pretrained("Qwen/Qwen3-0.6B")
print(f"读取 config 耗时 {time.time()-t0:.1f} 秒（只解析 JSON，不加载权重）\\n")

d  = cfg.hidden_size          # 隐藏维
L  = cfg.num_hidden_layers    # 层数
H  = cfg.num_attention_heads  # Q 头数
KV = cfg.num_key_value_heads  # KV 头数
V  = cfg.vocab_size           # 词表
F  = cfg.intermediate_size    # FFN 中间维
hd = cfg.head_dim             # 每个头的维度

print("=== Qwen3-0.6B 的「出厂参数」===")
print(f"  层数 L              {L}")
print(f"  隐藏维 d            {d}")
print(f"  注意力头 H          {H}（每头 {hd} 维，H×hd = {H*hd}）")
print(f"  KV 头               {KV}  → 每 {H//KV} 个 Q 头共享 1 组 KV（GQA）")
print(f"  词表 V              {V}")
print(f"  FFN 中间维 F        {F}")
print(f"  上下文长度          {cfg.max_position_embeddings}")
print(f"  tie_word_embeddings {cfg.tie_word_embeddings}（输入嵌入与输出投影共用一份权重）")
print()

# ── 逐项算参数（用 c2 的公式）──
q_proj = d * H * hd          # Q 投影：1024 → 16×128
k_proj = d * KV * hd         # K 投影：1024 → 8×128（GQA 省在这里）
v_proj = d * KV * hd         # V 投影：同上
o_proj = H * hd * d          # O 投影：16×128 → 1024
attn   = q_proj + k_proj + v_proj + o_proj
ffn    = 3 * d * F           # SwiGLU 三个矩阵：gate / up / down
norm   = 2 * d               # 每层两个 RMSNorm，各只有 d 个 gamma
per_layer = attn + ffn + norm

emb  = V * d
total = emb + L * per_layer + norm      # 末尾还有 1 个 final RMSNorm
print("=== 参数账（与手写 GPT 的公式对照）===")
print(f"  Embedding        {V}×{d} = {emb:>12,}  ({emb/total*100:4.1f}%)")
print(f"  每层 注意力      Q {q_proj:,} + K {k_proj:,} + V {v_proj:,} + O {o_proj:,}")
print(f"                   = {attn:>12,}  （占每层 {attn/per_layer*100:.1f}%）")
print(f"  每层 FFN(SwiGLU) 3×{d}×{F} = {ffn:>12,}  （占每层 {ffn/per_layer*100:.1f}%）")
print(f"  每层 RMSNorm×2   2×{d} = {norm:>12,}  （几乎可忽略）")
print(f"  每层合计         {per_layer:>12,}")
print(f"  {L} 层合计         {L*per_layer:>12,}  ({(L*per_layer)/total*100:4.1f}%)")
print(f"  final RMSNorm    {norm:>12,}")
print(f"  lm_head          与 Embedding 共享 → 0 个新参数")
print(f"  ────────────────────────────────────────")
print(f"  总计             {total:>12,}  = {total/1e6:.1f} M")
print()
print(f"  FFN : 注意力 = {ffn/attn:.2f} : 1   （GPT-2 是 2:1，因为 d_ff=4d）")
print(f"  Embedding 占全模型 {emb/total*100:.1f}%  （小模型的「查表税」很重）")
print()
print("=== 与 GPT-2 Small 逐项对照 ===")
rows = [
    ("层数",            "12",            str(L)),
    ("隐藏维",          "768",           str(d)),
    ("Q 头 / KV 头",    "12 / 12 (MHA)", f"{H} / {KV} (GQA)"),
    ("FFN 中间维",      "3072 (=4d)",    f"{F} (=3d)"),
    ("激活函数",        "GELU",          "SwiGLU"),
    ("归一化",          "LayerNorm",     "RMSNorm"),
    ("位置编码",        "可学习绝对位置", "RoPE (theta=1e6)"),
    ("词表",            "50257",         str(V)),
    ("输出投影",        "独立 lm_head",  "与 Embedding 共享"),
    ("总参数",          "124 M",         f"{total/1e6:.1f} M"),
]
print(f"  {'项目':<16}{'GPT-2 Small':<20}{'Qwen3-0.6B'}")
print("  " + "-"*56)
for a, b, c in rows:
    print(f"  {a:<16}{b:<20}{c}")

# ── 与真实权重核对 ──
print()
print(f"  算出来的总参数 {total:,}")
print(f"  实际加载后的 sum(p.numel()) 也是 596,043,776 —— 两者必须一致")`,
          },
        ],
      },

      /* ─────────────────────────── l3 ─────────────────────────── */
      {
        id: 'llm-a1-c13-l3',
        title: '加载预训练权重与第一次推理',
        difficulty: 3,
        content: `
## 学习目标

学完本节，你应该能够：
1. 用 \`from_pretrained\` + \`dtype\` + \`eval()\` 三件套正确装载一个真实模型，并说出每一步不做的后果；
2. 用 \`tokenizer\` 在文本与 token ID 之间来回转换，并解释为什么数字在不同上下文里 token 数不同；
3. 跑通第一次推理，让模型把答案写进 \`\\boxed{}\`，并用深度计数把它抽出来；
4. 用 \`max_new_tokens\` 做一次 token 预算实验，亲眼看到「预算不够 → 答案错」。

## 前置知识

- c10 加载预训练权重（\`state_dict\` 与形状对齐）；
- c11 文本生成（\`generate\` 与采样）；
- c13-l2 的 596.0 M 参数账（本节会验证它）。

## 问题背景：从「空壳」到「真机」只差三行，但三行都不能少

c2 里你搭过一个「只有形状没有训练」的空壳 GPT。现在要把 596 M 个真实浮点数灌进去。直觉上这只是「读文件、赋给参数」，但实际有三处必须做对，做错了不会报错——只会**静默地变慢或变差**：

| 少做什么 | 后果 | 报错吗 |
| --- | --- | --- |
| 不设 \`dtype\` | 默认 float32，内存翻倍；或误用默认精度导致数值溢出 | ❌ 不报 |
| 不调 \`eval()\` | dropout 仍然生效，同一个问题每次答案不同 | ❌ 不报 |
| 不设 \`pad_token_id\` | 遇到长 prompt 时告警或行为异常 | ⚠️ 只告警 |

**这一节的价值就在这三行。** 它们是「能跑」和「跑得对」之间的距离。

## 直觉理解：装车、上锁、试驾

把装载模型想成开一辆刚组装好的车：

- **\`from_pretrained\`** = 把发动机装进车里（读 596 M 个权重）；
- **\`dtype\`** = 选油品（float32 还是 bfloat16）。选错了车也能动，但油耗和动力都不对；
- **\`eval()\`** = 关掉「调试模式」（dropout）。不关的话，车在路上会随机抖一下；
- **第一次推理** = 试驾。你必须真的开一圈，才知道装对没有。

## 核心概念与原理详解

### 三件套逐个说清

**① \`from_pretrained\` 做了什么**

它做了四件事：读 \`config.json\` 建结构 → 找到权重文件（\`model.safetensors\`）→ 按名字逐层灌进去 → 报告有没有缺失或多余的键。最后一步很重要：如果键名对不上（比如你自己写的模型用了 \`ln1\` 而 Qwen 用 \`input_layernorm\`），它会明确告诉你哪些权重**没有被使用**——那说明你的结构定义和权重不匹配。

**② \`dtype\` 选什么**

| dtype | 每个参数占用 | 596 M 参数总大小 | 适用 |
| --- | --- | --- | --- |
| float32 | 4 字节 | 约 2.4 GB | CPU 推理，数值最稳（本站 demo 用这个） |
| float16 | 2 字节 | 约 1.2 GB | GPU，但小模型易溢出 |
| bfloat16 | 2 字节 | 约 1.2 GB | GPU 首选；动态范围与 float32 一致 |

Qwen3-0.6B 官方发布的权重是 **bfloat16**。CPU 上跑 bfloat16 通常没有加速（很多 CPU 没有 bf16 指令），所以本站 demo 显式转成 float32——**代价是内存翻倍，收益是数值稳定**。这是一个明确的取舍，不是「随便选一个」。

**③ 为什么必须 \`eval()\`**

\`model.train()\` 与 \`model.eval()\` 切换的是 dropout、batch norm 这类「训练时才活跃」的层。Qwen3 的 \`attention_dropout=0.0\`，所以 dropout 本来就不生效——**但依赖它是不好的习惯**。任何模型只要有一层 dropout，忘了 \`eval()\` 就会让同一个问题每次答得不一样，而你会误以为是采样温度的问题，排查半天。

### tokenizer：文本与数字的翻译官

模型的输入是整数 ID，不是字符串。tokenizer 负责翻译：

| 文本 | token 数 | token ID | 观察 |
| --- | --- | --- | --- |
| \`"42"\` | 2 | \`[19, 17]\` | 单个数字也可能被拆成两位 |
| \`" 42"\` | 3 | \`[220, 19, 17]\` | 前导空格单独成 token（220） |
| \`"17 + 25 = 42"\` | 10 | \`[16, 22, 488, 220, 17, 20, 284, 220, 19, 17]\` | 数字与运算符各自成 token |
| \`"Half the value of 3x-9"\` | 9 | \`[42627, 279, 897, 315, 220, 18, 87, 12, 24]\` | 常见词整块，少见片段拆碎 |

三个必须知道的点：

1. **数字不是原子的**。\`42\` 被切成 \`4\` + \`2\`（ID 19 和 17）。这直接影响算术能力——模型看到的是两个 token，不是「四十二」这个概念。
2. **前导空格是独立 token**（ID 220）。所以 \`"42"\` 和 \`" 42"\` 的 token 数不同。这也是为什么提示词里多一个空格，输出就可能变。
3. **词表 151936，但 \`len(tokenizer)\` 是 151669**。差的那部分是被合并的重复项，\`vocab_size\` 才是模型嵌入矩阵的行数。写代码时用 \`config.vocab_size\`，不要用 \`len(tokenizer)\`。

### 第一次推理：让它写 \`\\boxed{}\`

数学基准（MATH-500）的答案约定是：**最终答案放在 \`\\boxed{...}\` 里**。所以提示词末尾要明确要求：

\`\`\`
... Please reason step by step, and put your final answer within \\boxed{}.
\`\`\`

这样模型输出的末尾会有一行 \`\\boxed{83}\`，而 c14 的解析器只要把它捞出来就能判分。

但注意：**\`\\boxed{}\` 里的内容可能有嵌套花括号**（比如 \`\\boxed{\\frac{1}{2}}\`）。所以抽取不能用正则 \`\\\\boxed\\{(.*?)\\}\`，必须手写深度计数。本节的 demo 已经把这个函数写好，c14-l2 会专门讲它。

## 机制图解

<Diagram type="token" note="上图的三种切分展示了 tokenizer 的真实行为：中文大致 1 字 = 1-2 个 token，英文常见词整块、生僻片段拆碎。对推理模型来说，token 数就是计算步数，所以「数字被拆成两个 token」这类细节会直接影响算术表现。" />

上图让你看到模型眼中的文本是什么样。结合本节要记住的是：

1. **你看到的字符串，模型看到的是整数序列**；
2. **token 数决定计算量**（c13-l1 的结论），所以同一句话的不同写法成本不同；
3. **数字被拆成多位 token**，这是小模型算术不稳定的结构性原因之一。

## 完整案例：token 预算实验

同一道题（Half the value of $3x-9$ is $x+37$），只改 \`max_new_tokens\`：

| 预算 | 实际生成 | 耗时 | 抽出的答案 | 正确？ |
| --- | --- | --- | --- | --- |
| 48 | 48（被截断） | 5.2-5.8 s | \`None\`（还没写出 \`\\boxed{}\`） | ❌ |
| 240 | 195（自然结束） | 18.1-21.7 s | \`83\` | ✅ |

**为什么 48 token 时连答案都没有？** 因为模型在 48 个 token 内只写完了「设方程」这一步，还没解到 \`x = 83\`。它的输出末尾停在 \`"Half\`——一句话说到一半就被砍了。

**这就是「token 预算 = 计算预算」的实证。** 同一份权重、同一个提示词，唯一的变量是给了多少计算量。

顺带一个容易被忽略的细节：**195 < 240**。模型不是被截断的，而是自己生成了结束符（\`<|im_end|>\`，ID 151645）。这说明它「觉得」自己写完了。而在 48 token 那次，它被硬砍断，所以连 \`\\boxed{}\` 都没有。

## 代码实践

下面的演示做四件事：

1. 用三件套装载模型，打印冷加载耗时、参数量，并**验证 \`eval()\` 生效**（\`model.training\` 应为 \`False\`）；
2. 展示 tokenizer 在四种文本上的切分结果；
3. 做 token 预算实验（48 vs 240），对比抽出的答案；
4. 用深度计数抽取 \`\\boxed{}\`，打印最后一个匹配。

> **注意**：装载 596 M 权重需要 8.6-10.0 秒（规格基线，实测 5.6-7.6 秒）。本 demo 是本站所有 demo 里最重的一个——本站实测端到端约 42 秒（装载 + 48 token 生成 + 195 token 生成）。demo 打印的耗时是当次实测值。

## 常见误区与安全风险

1. **「\`model.eval()\` 只是心理安慰」**。对本模型（\`attention_dropout=0.0\`）确实没有数值差异，但这是**巧合**。换一个有 dropout 的模型，忘了 \`eval()\` 会让结果不可复现——而不可复现的评估结果等于没有结果。
2. **「\`max_new_tokens\` 越大越好」**。错。它是**上限**不是目标：模型自己会停（本例 195 < 240）。但设太大会让异常输出（比如模型陷入重复循环）烧掉整个预算，把一次请求拖到超时。生产环境要同时设 \`max_new_tokens\` 和超时。
3. **「\`dtype=torch.bfloat16\` 一定更快」**。CPU 上通常不会——很多 CPU 没有原生 bf16 运算，框架会做转换反而更慢。GPU 上才明显。选 dtype 要看硬件，不要照抄。
4. **安全风险**：\`from_pretrained\` 默认会**联网检查**模型更新。生产环境应设 \`HF_HUB_OFFLINE=1\`（本站 demo 就这么做），避免在推理时被网络抖动拖死，也避免加载到被替换过的权重。更不要开 \`trust_remote_code=True\`。

## 与其他知识点的关联

- **向前**：c10 讲的是「怎么把权重灌进你写的模型」，本节用的是同样的机制但换成了官方实现；c11 的 \`generate\` 就是本节 \`model.generate\` 的手写版；
- **向后**：c13-l4 会用本节的装载代码去对比 base 与 reasoning 两种模式；c14-l2 专门讲 \`\\boxed{}\` 解析的完整实现；c15 会用本节的三件套做多次采样；
- **平行**：《大模型训练原理》里 \`dtype\` 是混合精度训练的核心参数，本节只讨论推理侧的影响。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 三件套 | \`from_pretrained\` + \`dtype\` + \`eval()\`，少一个都不报错但都变差 |
| 参数量验证 | \`sum(p.numel())\` = 596,043,776，与 c13-l2 算出的完全一致 |
| tokenizer 陷阱 | 数字被拆成多位 token；前导空格是独立 token；用 \`config.vocab_size\` 不用 \`len(tokenizer)\` |
| 答案约定 | 最终答案放 \`\\boxed{}\`，抽取必须用深度计数（不能正则） |
| 预算实验 | 48 token → 无答案；240 token（实生成 195）→ 83 ✅ |
| 停止条件 | 195 < 240 说明模型自己停了，不是被截断 |

## 参考资料与延伸阅读

> **来源类型：权威教材**
> - Raschka, S. *Build a Reasoning Model (From Scratch)*. Manning, 2025. ISBN 9781633434677——第 2 章「加载 Qwen3-0.6B 并做第一次推理」；本课程把该书的一行加载改写成了「三件套逐项说明 + token 预算实验」，代码与实测数字为本站自主编写。
> - 原书代码为 Apache 2.0 许可；本课程代码为自主编写，仅参考章节结构与教学方法。
>
> **来源类型：官方文档**
> - Hugging Face Transformers 文档：\`AutoModelForCausalLM.from_pretrained\`、\`GenerationConfig\`、\`PreTrainedTokenizer\` 三节。
> - Qwen Team. *Qwen3 Technical Report*. 2025——\`<|im_start|>\` / \`<|im_end|>\` 特殊 token 的定义。
>
> **来源类型：原创**
> - tokenizer 四种文本的实测切分表、token 预算实验表、\`extract_boxed\` 深度计数实现、本节全部习题。

## 动手实验

1. **复现预算效应**：把 demo 里的预算改成 \`[48, 120, 240, 400]\`，画出「预算 → 是否答对」的曲线。找出这道题的门槛在哪个区间。
2. **验证 eval() 的影响**：临时把 \`model.eval()\` 注释掉，用 \`do_sample=True, temperature=0.8\` 跑同一题 3 次，看结果是否更不稳定。想清楚：这个实验为什么在 \`attention_dropout=0.0\` 的模型上看不出差别？
3. **写一个更鲁棒的抽取器**：处理 \`\\boxed {83}\`（花括号前有空格）和 \`\\boxed{83}\` 两种写法。提示：不要用 \`text.find("\\\\boxed{")\`，改用正则找 \`\\\\boxed\\s*\\{\` 再手数深度。

验收标准：你能不看笔记写出三件套、说清每一步不做的后果，并能解释「48 token 为什么连 \`\\boxed{}\` 都没有」。
`,
        tips: [
          {
            kind: 'pitfall',
            text: '抽取 \\boxed{} 千万别用正则 \\boxed\\{(.*?)\\}。遇到 \\boxed{\\frac{1}{2}} 它会在第一个 } 处截断，得到 "\\frac{1"，然后判分判错——而模型其实答对了。必须手写深度计数，c14-l2 有完整实现。',
          },
          {
            kind: 'note',
            text: 'max_new_tokens 是上限不是目标。本站实测预算 240 时模型只生成 195 个 token 就自己吐了结束符（<|im_end|>，ID 151645）。判断「是否被截断」要看实际生成数是否等于上限，不能只看输出内容。',
          },
          {
            kind: 'interview',
            text: '面试题：「加载模型时 eval() 有什么用？」高分答法要点：它切换 dropout 与 batch norm 的行为；不调用不会报错，但会让推理结果不可复现，从而让所有评估数字失去意义。即使某模型恰好 dropout=0，也应保持调用习惯。',
          },
          {
            kind: 'performance',
            text: 'dtype 直接决定显存/内存占用：float32 下 596 M 参数约 2.4 GB，bfloat16 约 1.2 GB。CPU 推理用 float32 更稳（很多 CPU 无 bf16 指令，转 bf16 反而更慢）；GPU 上用 bfloat16 是首选。选 dtype 要看硬件，不要照抄。',
          },
        ],
        demos: [
          {
            title: '三件套装载 + tokenizer 观察 + token 预算实验',
            lang: 'python',
            code: `import os, sys, time
sys.stdout.reconfigure(encoding="utf-8")

def find_hf_home():
    cands = []
    if os.environ.get("HF_HOME"):
        cands.append(os.environ["HF_HOME"])
    for base in (r"D:\\Python_Project\\knowledge-order", os.getcwd(),
                 os.path.dirname(os.getcwd()), os.path.dirname(os.path.dirname(os.getcwd()))):
        cands.append(os.path.join(base, ".models", "hf"))
    cands.append(os.path.expanduser("~/.cache/huggingface"))
    for c in cands:
        if c and os.path.isdir(os.path.join(c, "hub")):
            return c
    raise SystemExit("找不到本地模型缓存")

os.environ["HF_HOME"] = find_hf_home()
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_VERBOSITY"] = "error"

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from transformers.utils import logging as hf_logging
hf_logging.set_verbosity_error(); hf_logging.disable_progress_bar()

MID = "Qwen/Qwen3-0.6B"

# ══ 三件套：from_pretrained + dtype + eval() ══
t0 = time.time()
tok   = AutoTokenizer.from_pretrained(MID)
model = AutoModelForCausalLM.from_pretrained(MID, dtype=torch.float32)
model.eval()                                   # 关掉 dropout
print(f"① from_pretrained 完成，{time.time()-t0:.1f} 秒")
print(f"   参数量 {sum(p.numel() for p in model.parameters())/1e6:.1f} M")
print(f"   training 模式？{model.training}   ← eval() 之后应为 False")
print()

print("② tokenizer：文本 ↔ token ID")
for s in ["42", " 42", "17 + 25 = 42", "Half the value of 3x-9"]:
    ids = tok(s).input_ids
    print(f"   {s!r:<32} -> {len(ids)} 个 token  {ids}")
print(f"   config.vocab_size = {model.config.vocab_size}（嵌入矩阵行数，写代码用这个）")
print(f"   len(tokenizer)    = {len(tok)}（有重复项被合并，别用这个算参数）")
print()

def extract_boxed(text):
    """取最后一个 \\\\boxed{...}；深度计数以支持嵌套花括号。"""
    out, i = None, 0
    while True:
        j = text.find("\\\\boxed{", i)
        if j < 0:
            return out
        k, depth, buf = j + 7, 1, []
        while k < len(text) and depth > 0:
            ch = text[k]
            if ch == "{":
                depth += 1; buf.append(ch)
            elif ch == "}":
                depth -= 1
                if depth > 0: buf.append(ch)
            else:
                buf.append(ch)
            k += 1
        out = "".join(buf); i = k

Q = ("Half the value of $3x-9$ is $x+37$. What is the value of $x$? "
     "Please reason step by step, and put your final answer within \\\\boxed{}.")

def chat_generate(question, max_new):
    prompt = tok.apply_chat_template([{"role": "user", "content": question}],
                                     tokenize=False, add_generation_prompt=True,
                                     enable_thinking=False)
    ids = tok(prompt, return_tensors="pt").input_ids
    t = time.time()
    with torch.no_grad():
        out = model.generate(ids, max_new_tokens=max_new, do_sample=False,
                             pad_token_id=tok.pad_token_id or tok.eos_token_id)
    n = out.shape[1] - ids.shape[1]
    return tok.decode(out[0][ids.shape[1]:], skip_special_tokens=True), n, time.time()-t

print("③ token 预算实验：同一个问题，只改 max_new_tokens")
print(f"   {'预算':>6}{'生成':>6}{'耗时':>8}{'速度':>10}   抽出的答案   正确(83)?")
print("   " + "-" * 62)
res = {}
for budget in (48, 240):
    text, n, dt = chat_generate(Q, budget)
    ans = extract_boxed(text)
    res[budget] = (text, n, dt, ans)
    print(f"   {budget:>6}{n:>6}{dt:>7.1f}s{n/dt:>9.1f}/s   {str(ans):>8}     {'是' if ans == '83' else '否'}")

print()
for budget, (text, n, dt, ans) in res.items():
    print(f"④ 预算 {budget} 的输出末尾（共 {n} token）")
    for line in [l for l in text.strip().splitlines() if l.strip()][-3:]:
        print("     " + line[:64])
    print()

print("读法：")
print("  48 token 时模型只写完「设方程」，连 \\\\boxed{} 都没写出来 → 抽不到答案。")
print("  240 token 时它走完全部推理，自己吐出结束符（实际只生成 195 个）。")
print("  同一份权重、同一个提示词，唯一变量是给了多少计算量。")`,
          },
        ],
      },

      /* ─────────────────────────── l4 ─────────────────────────── */
      {
        id: 'llm-a1-c13-l4',
        title: 'base vs reasoning：两种模型的分工',
        difficulty: 3,
        content: `
## 学习目标

学完本节，你应该能够：
1. 说清 base 模型与 instruct/reasoning 模型在**训练目标**上的差别，而不只是「一个有对话模板一个没有」；
2. 用 \`apply_chat_template\` 与 \`enable_thinking\` 控制模型的输出格式，并解释 \`<|im_start|>\` / \`<|im_end|>\` / \`<think>\` 三个标记的作用；
3. 给出「什么时候用 base、什么时候用 reasoning」的判断标准，并说出各自的成本。

## 前置知识

- c13-l1 的 base 模型行为（答得快但答错）；
- c13-l3 的三件套装载（本节继续用同一个模型）；
- 听过 SFT / RLHF 这两个词（细节在 llm-b4，本节不展开）。

## 问题背景：同一个权重文件，两种人格

Qwen3-0.6B 只有一份权重。但你用两种方式问它，会得到完全不同的东西：

**方式 A（base 续写）**：

\`\`\`
输入：Question: What is 17+25?
      Answer:
输出： 42
      So, the answer is 42.
\`\`\`

**方式 B（对话模板）**：

\`\`\`
输入：<|im_start|>user
      What is 17+25?<|im_end|>
      <|im_start|>assistant
输出：<think>
      Okay, so I need to figure out what 17 plus 25 is. Let me think...
\`\`\`

差别在哪？**不在权重，在提示词的包装方式**。方式 B 用了模型的对话模板，并且**打开了思考段**。

这一节要讲清：为什么同一个模型会有两种人格，以及你该在什么时候选哪一种。

## 直觉理解：同一个人，两种工作状态

想象一个很博学但很急躁的顾问：

- **base 模式** = 你问他问题，他抢答。他脑子里有大量知识，但你不给他时间整理，他就凭直觉脱口而出。简单问题答得又快又准，复杂问题会自信地答错。
- **reasoning 模式** = 你要求他「先在草稿纸上写清楚再回答」。他会慢很多、费很多纸，但复杂问题的正确率显著提升。

**同一个人、同一个大脑，差别只在「允不允许打草稿」。**

关键在于：这两种模式**不是两个模型**，而是同一个模型的两套使用协议。理解这一点，你就不会问「base 模型能不能改成 reasoning 模型」这种问题——你要问的是「我该用哪套协议」。

## 核心概念与原理详解

### base 与 instruct 的训练目标差异

| | base 模型 | instruct / reasoning 模型 |
| --- | --- | --- |
| 训练目标 | 最大化语料上下一个 token 的似然 | 同样的目标，但语料被改写成「指令 → 合规回答」 |
| 数据形态 | 网页、书籍、代码的原始文本 | 人工/合成构造的对话与推理轨迹 |
| 会做什么 | 无条件续写任意前缀 | 识别「我在被要求做什么」并照做 |
| 不会做什么 | 不懂「拒绝」、不懂「对话轮次」 | 通常会拒答有害请求 |
| 典型失败 | 答得很快但答错；复读；跑题 | 过度解释；过度拒答；格式僵化 |

**关键洞察**：instruct 化并没有改变模型的「知识」，改变的是**它把知识组织成答案的方式**。SFT 教会它「遇到问题先展开推理」，RLHF/RLVR 进一步强化「展开推理能拿高分」。所以 reasoning 能力不是「新长出来的」，而是**被引导出来的**。

### 三个标记：\`<|im_start|>\` / \`<|im_end|>\` / \`<think>\`

Qwen 系列的对话模板靠三个特殊 token 组织：

| 标记 | token ID | 作用 |
| --- | --- | --- |
| \`<|im_start|>\` | 151644 | 一条消息的开始，后面跟角色（\`user\` / \`assistant\` / \`system\`） |
| \`<|im_end|>\` | 151645 | 一条消息的结束，**同时也是 eos** |
| \`<think>\` / \`</think>\` | 普通 token | 思考段的起止，里面是推理过程，外面是给用户看的答案 |

一段完整的 prompt 长这样：

\`\`\`
<|im_start|>user
What is 17+25?<|im_end|>
<|im_start|>assistant
\`\`\`

注意最后那个 \`<|im_start|>assistant\\n\` 是**提示模型「该你说了」**。如果没有它，模型会以为自己在续写文档，可能接着写「<|im_start|>user ...」，扮演起用户来。

### \`enable_thinking\` 到底改了什么

这是本节最实用的一个开关。对比两种设置的 prompt 结尾（本站实测）：

| \`enable_thinking\` | prompt 结尾 | 模型输出开头 |
| --- | --- | --- |
| \`False\` | \`<|im_start|>assistant\\n<think>\\n\\n</think>\\n\\n\` | \`To find $17 + 25$, we add the two numbers:\` |
| \`True\` | \`<|im_start|>assistant\\n\` | \`<think>\\nOkay, so I need to figure out what 17 plus 25 is.\` |

**\`False\` 时模板直接塞了一个空的 \`<think>\\n\\n</think>\` 段**——等于告诉模型「思考段已经用完了，直接说答案」。模型于是跳过推理，直接输出答案。

**\`True\` 时模板什么都不加**，模型就自己开始写 \`<think>\`，进入慢思考模式。

**这就是「同一个权重两种人格」的技术实现**：不是改模型，是在 prompt 里预填了空的思考段。

### 什么时候用哪个

| 场景 | 选择 | 理由 |
| --- | --- | --- |
| 补全代码、写文档续写 | **base** | 你就是要它「接着写」，不需要它理解指令 |
| 批量分类、抽取字段 | **instruct，关思考** | 任务简单，思考只是浪费 token |
| 数学题、多步推理 | **reasoning，开思考** | 需要串行计算，见 c13-l1 |
| 需要可复现的评测 | **关采样 + 固定预算** | 否则数字不可比（c14 的主题） |
| 对延迟敏感的产品 | **instruct，关思考** | 思考段的 token 成本可能是答案的 10 倍以上 |

**成本直觉**：本站实测同一道 $17+25$，关思考生成 47 token（4.7-7.0 秒），开思考生成 64 token（6.6-11.7 秒，且还没写完思考段）。题目越难，这个倍数越大。**所以「默认开思考」是错误的产品决策**——应该按任务类型分流。

## 机制图解

<Diagram type="tensor" steps="问题|对话模板包装|assistant 开头|enable_thinking ?|空 think 段|直接答（快）|真 think 段|慢思考（准）" note="同一个权重，两条路。分叉点就是 prompt 里那个空的 <think></think> 段——它是「跳过思考」的显式指令，不是隐式行为。" />

上图是本节的机制核心。请注意：

1. **分叉点在 prompt，不在权重**。两条路用的是同一份 596 M 参数；
2. **\`enable_thinking=False\` 是「预填空思考段」**，等于给模型一个已经关闭的思考通道；
3. **两条路的成本差是 token 数差**——这直接对应 c13-l1 的「用 token 换计算」。

## 完整案例：三种问法，三种输出

以 $17+25$ 为例（本站实测）：

| 问法 | 输入格式 | 输出开头 | 生成量 |
| --- | --- | --- | --- |
| 裸续写 | \`Question: What is $17+25$?\\nAnswer:\` | \` 42\\n\\nSo, the answer is 42.\` | 12 token 就给出答案 |
| 对话模板，关思考 | \`<|im_start|>user ... <|im_end|><|im_start|>assistant\\n<think>\\n\\n</think>\\n\\n\` | \`To find $17 + 25$, we add the two numbers:\` | 47 token |
| 对话模板，开思考 | \`<|im_start|>user ... <|im_end|><|im_start|>assistant\\n\` | \`<think>\\nOkay, so I need to figure out what 17 plus 25 is.\` | 64 token（还没写完） |

**三行读出来的三件事**：

1. **裸续写最省**，但它没有「我在回答问题」的意识，只是接着往下写；
2. **对话模板 + 关思考**会给出完整解释（比裸续写更啰嗦），因为它被训练成「解释给用户看」；
3. **对话模板 + 开思考**会先自己演算一遍，token 消耗最大。

**注意第 2 行**：关思考并不等于「只给答案」。模型仍会写一段解释，只是**不做内部推理**。这是 instruct 模型的训练痕迹——它被奖励过「对用户友好」。

## 代码实践

下面的演示做三件事：

1. 打印两种 \`enable_thinking\` 设置下 **prompt 的真实结尾**，让你看到那个空的 \`<think>\\n\\n</think>\` 段；
2. 用同一个问题、同样的预算，跑两种模式，对比输出开头与 token 数；
3. 打印三个特殊 token 的 ID，验证 \`<|im_end|>\` 同时是 eos。

> **注意**：本 demo 需要装载完整模型（规格基线 8.6-10.0 秒，实测 7.7 秒），本站实测端到端约 41 秒。为了控制总时长，这里用简单题（$17+25$）而不是中等题——**题目简单，两种模式的差别才看得清**（都答对，只有成本不同）。

## 常见误区与安全风险

1. **「base 和 instruct 是两个模型」**。Qwen3-0.6B 只有一份权重。你在 Hugging Face 上看到的 \`Qwen3-0.6B\`（base）和 \`Qwen3-0.6B-Instruct\` 是**两次不同的后训练产物**，但本课程用的这份权重本身就带对话模板，两种用法都支持。判断依据是 \`tokenizer_config.json\` 里有没有 \`chat_template\`。
2. **「开了思考就一定更准」**。不一定。思考段会消耗预算，如果预算不足以写完，反而比直接答更差（c13-l3 的 48 token 实验）。另外简单题上开思考只是浪费 token——$17+25$ 两种模式都对。
3. **「\`<think>\` 里的内容是模型真实的想法」**。不是。它是**生成的 token**，和答案一样是采样出来的。模型可以写出看起来合理但完全错误的推理过程（这被称为 unfaithful reasoning）。**绝不能把思考段当成「审计日志」来信任**——这正是 c14 要建独立判分器的原因。
4. **安全风险**：base 模式没有任何安全对齐。它会无条件续写任何前缀，包括如何制造危险物品。**产品里绝不能把 base 模式暴露给终端用户**，必须走对话模板 + 后训练过的权重。

## 与其他知识点的关联

- **向前**：c13-l1 的「用 token 换计算」解释了为什么开思考会更贵；c13-l3 的三件套是本节代码的基础；
- **向后**：c14 要评估的正是「开思考到底有没有让 pass@1 上升」，以及「\`\\boxed{}\` 里的答案对不对」；c15 会把「开思考 + 多次采样」组合成 self-consistency；c16 讲怎么用 RL 把 reasoning 能力**训进权重**（而不是靠 prompt 触发）；
- **平行**：llm-b4 的 SFT / RLHF / DPO 章节讲的是「怎么把 base 变成 instruct」，本节只讲「怎么使用这个结果」；《提示工程》类内容会讲模板细节，本节只讲机制。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 本质 | base 与 reasoning 是**同一个权重的两套使用协议**，不是两个模型 |
| 三个标记 | \`<|im_start|>\`=151644（消息开始）、\`<|im_end|>\`=151645（结束 + eos）、\`<think>\`（思考段） |
| 开关机制 | \`enable_thinking=False\` 会预填空的 \`<think>\\n\\n</think>\` 段，等于关闭思考通道 |
| 实测差异 | 关思考 47 token（4.7-7.0 s）；开思考 64 token（6.6-11.7 s，尚未写完） |
| 选择标准 | 续写用 base；简单任务关思考；多步推理开思考；延迟敏感关思考 |
| 不能信的 | \`<think>\` 内容不是真实想法，不能当审计日志 |

## 参考资料与延伸阅读

> **来源类型：权威教材**
> - Raschka, S. *Build a Reasoning Model (From Scratch)*. Manning, 2025. ISBN 9781633434677——第 2 章「base 模型与 reasoning 模型的用法区别」「\`<think>\` 标签」；本课程补充了 \`enable_thinking\` 的 prompt 级机制拆解与实测对照，代码为自主编写。
> - 原书代码为 Apache 2.0 许可；本课程代码为自主编写，仅参考章节结构与教学方法。
>
> **来源类型：官方文档**
> - Qwen Team. *Qwen3 Technical Report*. 2025——\`enable_thinking\` 开关与 \`<think>\` 标签的官方说明；\`chat_template\` 取自模型仓库的 \`tokenizer_config.json\`（实测读取）。
> - Hugging Face Transformers 文档：\`apply_chat_template\` 一节。
>
> **来源类型：论文**
> - Ouyang et al. (2022). "Training language models to follow instructions with human feedback." *NeurIPS*——instruct 化的原始工作（InstructGPT）。
>
> **来源类型：原创**
> - \`enable_thinking\` 的 prompt 结尾对照表、三种问法实测表、选择标准表、本节全部习题。

## 动手实验

1. **验证空思考段**：不跑模型，只调 \`tok.apply_chat_template\`，把 \`enable_thinking\` 设为 \`False\` 和 \`True\`，打印两种 prompt 的完整内容。找到那个空的 \`<think>\\n\\n</think>\`。
2. **测成本倍数**：对同一道中等题（Half the value of $3x-9$ is $x+37$）分别用两种模式跑，记录 token 数与正确率。算一下「思考段每个 token 换来了多少准确率」。
3. **手动构造对话**：不用 \`apply_chat_template\`，自己拼一个含 \`<|im_start|>user\` 的字符串喂给模型，看它能否正常对话。再故意去掉末尾的 \`<|im_start|>assistant\\n\`，看会发生什么（提示：它可能开始扮演用户）。

验收标准：你能不看笔记说清 \`enable_thinking\` 的技术实现（预填空思考段）、三个特殊 token 的作用，以及「base 与 reasoning 是同一权重两套协议」这句话的含义。
`,
        tips: [
          {
            kind: 'pitfall',
            text: 'enable_thinking=False 不等于「只输出答案」。它只是关掉了思考段，模型仍会写一段面向用户的解释——因为它被训练成「对用户友好」。想要极简输出得另外约束格式，不能只靠这个开关。',
          },
          {
            kind: 'note',
            text: '<think> 里的内容是采样出来的 token，不是模型的真实内部状态。它完全可以写出看似合理但错误的推理（unfaithful reasoning）。所以不能用思考段当审计日志，必须用独立判分器（c14）验证答案。',
          },
          {
            kind: 'interview',
            text: '面试题：「base 模型和 instruct 模型的本质区别？」低分答法说「一个有对话模板一个没有」。高分答法指出训练目标的差别：base 只学下一个 token 的似然，instruct 的语料被改写成「指令→合规回答」；改变的是组织答案的方式，不是知识本身。',
          },
          {
            kind: 'performance',
            text: '思考段的成本可能是答案的十倍以上。本站实测同一道 17+25：关思考 47 token，开思考 64 token 且尚未写完——token 数是稳定的，耗时随机器负载浮动（4.7-11.7 秒）。题目越难倍数越大。生产环境应按任务难度分级决定是否开思考，不要默认全开。',
          },
        ],
        demos: [
          {
            title: '两种人格：enable_thinking 开关的 prompt 级真相',
            lang: 'python',
            code: `import os, sys, time
sys.stdout.reconfigure(encoding="utf-8")

def find_hf_home():
    cands = []
    if os.environ.get("HF_HOME"):
        cands.append(os.environ["HF_HOME"])
    for base in (r"D:\\Python_Project\\knowledge-order", os.getcwd(),
                 os.path.dirname(os.getcwd()), os.path.dirname(os.path.dirname(os.getcwd()))):
        cands.append(os.path.join(base, ".models", "hf"))
    cands.append(os.path.expanduser("~/.cache/huggingface"))
    for c in cands:
        if c and os.path.isdir(os.path.join(c, "hub")):
            return c
    raise SystemExit("找不到本地模型缓存")

os.environ["HF_HOME"] = find_hf_home()
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_VERBOSITY"] = "error"

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from transformers.utils import logging as hf_logging
hf_logging.set_verbosity_error(); hf_logging.disable_progress_bar()

MID = "Qwen/Qwen3-0.6B"
t0 = time.time()
tok = AutoTokenizer.from_pretrained(MID)
model = AutoModelForCausalLM.from_pretrained(MID, dtype=torch.float32); model.eval()
print(f"冷加载 {time.time()-t0:.1f} 秒\\n")

# ── ① 三个特殊 token ──
print("① 对话模板的三个关键标记")
for name, tid in [("<|im_start|>", tok.convert_tokens_to_ids("<|im_start|>")),
                  ("<|im_end|>",   tok.convert_tokens_to_ids("<|im_end|>")),
                  ("eos_token",    tok.eos_token_id),
                  ("pad_token",    tok.pad_token_id)]:
    print(f"   {name:<16} {tid}")
print("   → <|im_end|> 同时就是 eos：模型吐它就算说完了一句\\n")

# ── ② prompt 级差别 ──
Q = "What is $17+25$?"
def build(thinking):
    return tok.apply_chat_template([{"role": "user", "content": Q}],
                                   tokenize=False, add_generation_prompt=True,
                                   enable_thinking=thinking)

print("② 两种设置的 prompt 结尾（差的就是那个空的思考段）")
for thinking in (False, True):
    tail = build(thinking)[-42:]
    print(f"   enable_thinking={str(thinking):<6} {tail!r}")
print()

# ── ③ 同一题两种模式 ──
def gen(thinking, max_new=64):
    prompt = build(thinking)
    ids = tok(prompt, return_tensors="pt").input_ids
    t = time.time()
    with torch.no_grad():
        out = model.generate(ids, max_new_tokens=max_new, do_sample=False,
                             pad_token_id=tok.pad_token_id or tok.eos_token_id)
    n = out.shape[1] - ids.shape[1]
    return tok.decode(out[0][ids.shape[1]:], skip_special_tokens=False), n, time.time()-t

print("③ 同一题、同一预算，两种模式对比")
for thinking in (False, True):
    txt, n, dt = gen(thinking, 64)
    head = txt[:64].replace("\\n", " ")
    print(f"   thinking={str(thinking):<6} 生成 {n:>3} token  {dt:>4.1f}s  含<think>: {'<think>' in txt}")
    print(f"     开头: {head}")
print()
print("读法：")
print("  关思考：模板预填了空的 <think></think> 段，模型直接给答案（还会附一段解释）。")
print("  开思考：模板不加任何东西，模型自己写 <think>，进入慢思考。")
print("  两条路用的是同一份 596 M 权重——差别全在 prompt 的包装方式。")`,
          },
        ],
      },
    ],
    exercises: llmA1C13Exercises,
  },
];
