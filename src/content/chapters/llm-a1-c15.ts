import type { Chapter } from '../../types';
import { llmA1C15Exercises } from './llm-a1-c15-ex';

/* ============================================================
 *  《从零手写大模型》第 15 章：推理时扩展
 *
 *  c15-l1  CoT 提示：一句「step by step」的威力
 *  c15-l2  温度与 top-p：控制探索的旋钮
 *  c15-l3  Self-consistency：多采样再投票
 *  c15-l4  Best-of-N 与自反思
 *
 *  口径：模型为 Qwen3-0.6B（596.0 M / 28 层 / 1024 维 / 16 头 8 KV / 词表 151936）；
 *  全部数字来自本站 .venv-pytorch 后端对同一份权重的实测，
 *  与 docs/llm-reasoning-spec.md §1.2 的基线一致。
 *  与 c13/c14 的分工：c13 讲「模型是什么」，c14 讲「怎么判分」，
 *  本章讲「不改一个参数，怎么让它答对」。
 * ============================================================ */

export const llmA1C15Chapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'llm-a1-c15',
    title: '推理时扩展：不训练也能变强',
    goal:
      '在不改动任何权重的前提下，用四种手段把 Qwen3-0.6B 的答题正确率提上去：CoT 提示、温度/top-p 采样、self-consistency 投票、Best-of-N 与自反思。同时记住每种手段的失效边界——本章最重要的结论不是「这些技巧有用」，而是「它们什么时候没用」。',
    lessons: [
      /* ─────────────────────────── l1 ─────────────────────────── */
      {
        id: 'llm-a1-c15-l1',
        title: 'CoT 提示：一句「step by step」的威力',
        difficulty: 2,
        content: `
## 学习目标

学完本节，你应该能够：
1. 复述本节实测：同一道中等题，直接问得 **12**（错），加一句「Let's think step by step」得 **83**（对）；
2. 用「token 预算 = 计算预算」解释 CoT 为什么有效，并说明它**不是**在教模型新知识；
3. 说出 CoT 失效的三种情形，并能在自己的题集上判断该不该用它。

## 前置知识

- c13-l1 的结论：base 模型一次前向的计算量是固定的，「答得快」是架构决定的；
- c14-l2 的 \`\\boxed{}\` 解析：本章所有答案都从 boxed 里捞，捞不到就退回「最后一个数字」；
- c11 文本生成：模型一次只吐一个 token，再把自己吐的接回输入。

## 问题背景：一个不改权重就能翻盘的杠杆

c13 里你已经看到 Qwen3-0.6B 的尴尬：简单题全对，中等题答错。按常规思路，要修这个错，你得收集数据、微调、再评测——一轮下来几小时起步。

但有个更便宜的办法：**在提问里加一句话**。

| 提问方式 | 模型输出（实测） | 生成 token | 答案 |
| --- | --- | --- | --- |
| \`Half the value of 3x-9 is x+37. What is x?\` + 「只给数字」 | \`The value of x is: \\boxed{12}\` | 18 | **12（错）** |
| 同一句 + \`Let's think step by step.\` | 完整四步推导，最后 \`\\boxed{83}\` | 197 | **83（对）** |

同一份权重、同一个 tokenizer、同样的贪心解码。唯一变化是 prompt 里多了 4 个单词（外加模型因此多写了 179 个 token）。

**这就是推理时扩展（inference-time scaling）**：不动参数，只动「推理时花多少算力」。

## 直觉理解：让考生把草稿纸用起来

想象一个心算很强但很毛躁的学生。你问「$\\frac{3x-9}{2}=x+37$ 求 $x$」，他张口就答 12——因为他的「心算」只够走一步：看到 $3x-9$ 和 $x+37$，脑子里第一个冒出来的数是 12。

但如果你说「把过程写下来」，他会一行行写：

    (3x-9)/2 = x+37
    3x-9 = 2x+74
    x-9 = 74
    x = 83

每一步都很简单，四步走完答案就对了。

**关键洞察**：这个学生的心算能力没变，变的是**他有了纸**。纸让他能把中间结果存下来，供下一步使用。对语言模型来说，「纸」就是它自己生成的 token。

## 核心概念与原理详解

### CoT 的本质：用 token 换计算

Transformer 的一次前向是**固定深度**的：Qwen3-0.6B 就是 28 层，不管题目多难，都是 28 层。你在 prompt 里写「请仔细思考」，模型的计算量一点没变——它只是读到了这几个字，然后照样 28 层。

那 CoT 为什么有用？因为**生成的每个 token 都要重新跑一次完整的前向**。

| 阶段 | 前向次数 | 相当于多少层计算 | 中间结果存在哪 |
| --- | --- | --- | --- |
| 直接答（18 token） | 18 次 | $18 \\times 28 = 504$ 层 | 只在残差流里，答完就丢 |
| 加 CoT（197 token） | 197 次 | $197 \\times 28 = 5516$ 层 | **写进上下文，下一步能读回来** |

后者不只是「多算了 11 倍」，而是多了一个**外部存储**：第 2 步生成的 \`3x-9 = 2x+74\` 变成了第 3 步的输入。模型不需要在 28 层里一次算完整个推导链，它可以把链条拆成 197 个单步，每步只算一小段。

这就是「用 token 换计算」的字面含义。CoT 不是让模型变聪明，是让它**有机会把一件事分多次做**。

### 一个必须澄清的误解：CoT 不是「让它更努力」

很多人以为 CoT 是在给模型「打气」或「提示它要认真」。不对。证据是：**对简单题，CoT 毫无收益**。

| 题目 | 直接答 | 加 CoT | 差异 |
| --- | --- | --- | --- |
| \`17+25\`（简单） | 42（对，11 token） | 42（对，88 token） | 答案一样，**多花 77 token** |
| \`Half of 3x-9 = x+37\`（中等） | 12（错，18 token） | 83（对，197 token） | 从错到对，多花 179 token |

简单题本来就是一步到位，多写 88 个 token 只是把同一件事重复了三遍（实测输出里甚至有「Step-by-step explanation」把 $17+25=42$ 又写了两遍）。**CoT 只在「需要多步推理」的题上有收益**。

### CoT 什么时候无效

这是本节最该记住的部分。三种情形：

**① 题太简单。** 收益为 0，成本为正。上面那张表就是证据。

**② 模型能力根本不够。** 这个更隐蔽，c15-l3 会用实测数据展开：如果你让模型在它**完全不会**的题上做 CoT，它会写出一大段看起来很像推理的东西，然后给出一个错答案。CoT 提供的是「分步计算的机会」，不是「计算能力本身」。一个不会解方程的学生，给他草稿纸他也解不出来，只是错得更工整。

**③ 输出被截断。** CoT 的代价是 token 数暴涨。实测里中等题 CoT 平均要 197 token；如果你把 \`max_new_tokens\` 设成 60，模型会在推导到一半时被硬切断，你既拿不到 boxed 答案，也拿不到可用的中间结果。**加 CoT 必须同时加 token 预算**，这是工程上最常见的翻车点。

## 机制图解

<Diagram type="tensor" steps="prompt 4 词|前向 1|「Let's」|前向 2|「think」|…|前向 197|\\boxed{83}" note="每个生成的 token 都要重跑一次完整的 28 层前向，并且会写回上下文供后续步骤读取。CoT 的收益来自这个「写回」动作，而不是来自 prompt 里那几个字的语义。" />

上图把 CoT 拆成了「前向次数」这一个可数的量。请注意两件事：

1. **直接答和 CoT 用的是同一个模型、同样的 28 层**，差别只在循环了几次；
2. **循环产生的 token 会变成后续步骤的输入**——这是「草稿纸」的物理实现。

## 完整案例：一道题的两种死法

把实测的完整输出摊开看。**直接答**（18 token，2.1 秒）：

    The value of $ x $ is:
    $$
    \boxed{12}
    $$

模型连方程都没写，直接给答案。它的 28 层里没有任何一步真正做过「乘 2、移项、加 9」，它是靠模式匹配蹦出了一个数。

**加 CoT**（197 token，27.6 秒，节选）：

    ### Step 1: Translate the statement into an equation
    "Half the value of $3x - 9$ is $x + 37$" means:
    (1/2)(3x - 9) = x + 37

    ### Step 2: Multiply both sides by 2 to eliminate the fraction
    3x - 9 = 2x + 74

    ### Step 3: Subtract 2x from both sides
    x - 9 = 74

    ### Step 4: Add 9 to both sides
    x = 83

    ### ✅ Final Answer:
    \boxed{83}

四步，每步都是 28 层能轻松搞定的小操作。**答案不是「想」出来的，是一步步「写」出来的**。

代价：197 token ÷ 8.6 token/s ≈ 23 秒（实测 27.6 秒，含首次前向开销）。比直接答慢 13 倍。

| 指标 | 直接答 | 加 CoT | 倍数 |
| --- | --- | --- | --- |
| 生成 token | 18 | 197 | 10.9× |
| 耗时 | 2.1 s | 27.6 s | 13.1× |
| 答案正确 | ✗（12） | ✓（83） | — |
| 每 token 耗时 | 0.117 s | 0.140 s | 1.2× |

最后一行的差异来自首 token 的 prefill：短输出里它占的比例更大。这也说明**长输出的单位成本更低**，但总成本更高。

## 代码实践

下面的 demo 在**同一份权重**上跑四组对照：简单题/中等题 × 直接答/加 CoT。它会打印每组的 token 数、耗时和提取到的答案，最后汇总成一张表。

注意三个工程细节，它们决定了这段代码能不能在 120 秒内跑完：

1. \`do_sample=False\` 是**必须显式传**的。Qwen3 的 \`generation_config.json\` 里 \`do_sample: true\`，不显式关掉，你的「贪心解码」其实是随机采样；
2. 中等题 CoT 给 230 token 的预算（实测用掉 197），给少了会被截断；
3. 答案提取先找 \`\\boxed{}\`，找不到再退回「最后一个数字」——这是 c14-l2 写的解析器的最小版。

四组总 token 数 314，实测 42.9 秒，在预算内。

## 常见误区与安全风险

1. **「CoT 让模型更聪明」**。不。它让模型**多跑几次前向**。同一个模型的参数一个都没变，简单题加 CoT 的答案是 42 而不是「更准的 42」——因为本来就对。
2. **「所有题都该加 CoT」**。简单题上你花 8 倍 token 换 0 收益。生产环境里这是纯亏。
3. **「加了 CoT 就一定有 boxed 答案」**。不一定。模型可能写了一大段然后在最后一句跑偏，也可能被 \`max_new_tokens\` 截断在半路。**必须检查解析结果是否为 None**，不能假设有答案。
4. **安全提示**：CoT 输出里会包含完整的中间步骤。如果你把 CoT 用在生产环境，这些中间步骤会暴露你的 prompt、题目结构，甚至被用来做 prompt injection 的载体。对外暴露 CoT 前先想清楚：这些内容能不能给用户看。

## 与其他知识点的关联

- **向前**：c13-l1 的「token 预算 = 计算预算」是本节的理论基础；c11 的自回归生成是它的实现机制；c14-l2 的 \`\\boxed{}\` 解析是它的评测前提；
- **向后**：c15-l2 讲怎么让「多次采样」产生差异（温度），c15-l3 讲怎么把多次采样合并成一个答案（投票），c15-l4 讲怎么从中选最好的一个（Best-of-N）；c16 讲怎么把这种能力**训进权重**（GRPO）；
- **平行**：本站《大模型训练原理》的 llm-b4 会讲 CoT 数据怎么构造（SFT 阶段），本章讲的是不训练怎么用。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 实测 | 中等题：直接答 12（错）→ 加 CoT 83（对）；简单题：42 → 42（无变化） |
| 本质 | CoT = 用生成的 token 换额外的前向次数，不是让模型变聪明 |
| 机制 | 每个 token 重跑一次 28 层前向，且写回上下文供后续读取 |
| 成本 | 中等题 18 → 197 token（10.9×），2.1 → 27.6 秒（13.1×） |
| 失效 | ①题太简单 ②模型能力不足 ③输出被截断（最常见） |
| 工程 | \`do_sample=False\` 必须显式传；token 预算必须同步加大 |

## 参考资料与延伸阅读

> **来源类型：权威教材**
> - Raschka, S. *Build a Reasoning Model (From Scratch)*. Manning, 2025. ISBN 9781633434677——第 4 章 Chain-of-Thought Prompting；本课程在「token 预算 = 计算预算」的解释框架与全部实测数字上做了自主编写，未搬运原书代码。
> - Wei, J. et al. (2022). "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models." *NeurIPS*——CoT 的原始论文。
> - Kojima, T. et al. (2022). "Large Language Models are Zero-Shot Reasoners." *NeurIPS*——「Let's think step by step」这句话的来源。
>
> **来源类型：原创**
> - 「让考生把草稿纸用起来」类比、四组对照实测表、token/耗时倍数表、三种失效情形分类、本节全部习题。
>
> **许可说明**：原书代码为 Apache 2.0 许可；本课程代码为自主编写，仅参考章节结构与教学方法。

## 动手实验

1. **复现 12 → 83**：跑一遍 demo，把中等题的 \`max_new\` 从 230 改成 60，看会发生什么。记录「有 boxed 答案的样本数 / 总样本数」。
2. **找 CoT 的无效区**：自己出三道题——一道一步算术（如 \`48/6\`）、一道两步、一道需要设方程。三道题各跑「直接答」和「加 CoT」，填一张 2×3 的表。你会发现收益随步数增长。
3. **量化成本**：把四组的 token 数与耗时记下来，算「每提升 1% 正确率要花多少 token」。再用这个数去估算：如果你的应用每天 10 万次请求，加 CoT 一天多花多少钱。

验收标准：你能不看笔记说出「CoT 为什么有效（用 token 换前向次数）」「为什么简单题上没用」「哪三种情况会让它失效」，并给出 12 / 83 这组数字作为证据。
`,
        tips: [
          {
            kind: 'pitfall',
            text: '最常见翻车：加了 CoT 却没加 max_new_tokens。实测中等题 CoT 要 197 token，你给 60 就会在推导中途被硬切，既没有 boxed 答案也没有可用的中间结果。加 CoT 必须同步加预算。',
          },
          {
            kind: 'note',
            text: 'Qwen3 的 generation_config.json 里 do_sample 默认是 true。你不显式传 do_sample=False，所谓的「贪心解码」其实是随机采样——这是本站实测时踩过的坑，会导致「同一段代码两次跑出不同答案」。',
          },
          {
            kind: 'interview',
            text: '面试题：「CoT 为什么有效？」满分答法不是「帮模型理清思路」，而是「每个 token 都要重跑一次前向，CoT 把一次固定深度的计算拆成 N 次，并把中间结果写进上下文当外部存储」。',
          },
          {
            kind: 'performance',
            text: '实测倍数：中等题直接答 18 token / 2.1 秒，加 CoT 197 token / 27.6 秒——10.9 倍 token、13.1 倍时间。生产环境要按「每提升 1% 正确率的 token 成本」算账，而不是无脑全加 CoT。',
          },
        ],
        demos: [
          {
            title: '四组对照实测：简单题/中等题 × 直接答/加 CoT',
            lang: 'python',
            code: `# ── 定位本地模型缓存（本站把权重放在项目内，不依赖全局 ~/.cache）──
import os as _os
def _find_hf():
    for c in [_os.environ.get("HF_HOME"),
              r"D:\Python_Project\knowledge-order\.models\hf",
              _os.path.join(_os.getcwd(), ".models", "hf")]:
        if c and _os.path.isdir(_os.path.join(c, "hub")):
            return c
    return None
_h = _find_hf()
if _h:
    _os.environ["HF_HOME"] = _h
_os.environ.setdefault("HF_HUB_OFFLINE", "1")
_os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
_os.environ.setdefault("TRANSFORMERS_VERBOSITY", "error")

import os, re, time
os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

torch.set_num_threads(4)
MODEL = "Qwen/Qwen3-0.6B"
tok = AutoTokenizer.from_pretrained(MODEL)
model = AutoModelForCausalLM.from_pretrained(MODEL, dtype=torch.float32)
model.eval()          # 关掉 dropout，推理必须

Q_EASY = "What is $17+25$?"
Q_MED  = "Half the value of $3x-9$ is $x+37$. What is the value of $x$?"
ONLY = " Answer with only the number, no explanation."
COT  = "\\n\\nLet's think step by step."
BOX  = re.compile(r"\\\\boxed\\{([^{}]*)\\}")
NUM  = re.compile(r"-?\\d+(?:\\.\\d+)?")


def extract(text):
    """先找 \\\\boxed{}，没有就退回最后一个数字（c14-l2 解析器的最小版）"""
    b = BOX.findall(text)
    if b:
        return b[-1].strip()
    n = NUM.findall(text)
    return n[-1] if n else None


def generate(prompt, max_new):
    """注意：do_sample=False 必须显式传，否则会读 generation_config 里的 do_sample=true"""
    p = tok.apply_chat_template([{"role": "user", "content": prompt}], tokenize=False,
                                add_generation_prompt=True, enable_thinking=False)
    enc = tok(p, return_tensors="pt")
    t0 = time.time()
    with torch.no_grad():
        out = model.generate(**enc, max_new_tokens=max_new, do_sample=False,
                             pad_token_id=tok.eos_token_id)
    n_new = out.shape[1] - enc["input_ids"].shape[1]
    txt = tok.decode(out[0][enc["input_ids"].shape[1]:], skip_special_tokens=True)
    return txt, n_new, time.time() - t0


CASES = [
    ("简单题 · 直接答", Q_EASY + ONLY, 30),
    ("中等题 · 直接答", Q_MED + ONLY, 40),
    ("简单题 · + CoT", Q_EASY + COT, 120),
    ("中等题 · + CoT", Q_MED + COT, 230),
]

print("=" * 64)
print("CoT 对照实验（同一份权重、贪心解码 T=0）")
print("=" * 64)
rows = []
t_all = time.time()
for name, prompt, mx in CASES:
    text, n, dt = generate(prompt, mx)
    a = extract(text)
    rows.append((name, n, dt, a))
    print(f"\\n[{name}]  {n} token / {dt:.1f}s  答案 = {a}")
    print("  " + text.replace("\\n", " ")[:150] + ("…" if len(text) > 150 else ""))

print("\\n" + "=" * 64)
print(f"{'实验':<18}{'token':>8}{'秒':>8}{'答案':>8}")
print("-" * 64)
for name, n, dt, a in rows:
    print(f"{name:<18}{n:>8}{dt:>8.1f}{str(a):>8}")
print("-" * 64)
print(f"中等题：直接答 {rows[1][3]}（错，正确 83）→ 加 CoT {rows[3][3]}（对）")
print(f"简单题：直接答 {rows[0][3]} → 加 CoT {rows[2][3]}（本来就对，多花 {rows[2][1]-rows[0][1]} token）")
print(f"总 token {sum(r[1] for r in rows)}，总耗时 {time.time()-t_all:.1f}s")`,
          },
        ],
      },

      /* ─────────────────────────── l2 ─────────────────────────── */
      {
        id: 'llm-a1-c15-l2',
        title: '温度与 top-p：控制探索的旋钮',
        difficulty: 3,
        content: `
## 学习目标

学完本节，你应该能够：
1. 写出带温度的 softmax 公式，并解释 $T \\to 0$ 为什么等于贪心解码；
2. 说出 top-p（nucleus）截断在做什么，以及它和 top-k 的区别；
3. 用本节实测说明：**温度不是「越高越聪明」，它只是让输出更分散**——对推理任务，T=0 往往最优。

## 前置知识

- c11 文本生成的采样策略（softmax / 温度 / top-k / top-p）；
- c15-l1 的结论：CoT 把一次计算拆成多次前向，而多次采样是 self-consistency 的前提。

## 问题背景：你需要「同一个问题问很多遍」

c15-l1 让模型答对了一道题。但如果你想让它在难题上**更稳**，一个自然的想法是：多问几遍，然后挑答案。

问题是——如果每次都问出一样的结果，多问几遍毫无意义。实测：

| 采样方式 | 中等题连问 3 次的答案 | 不同答案数 |
| --- | --- | --- |
| T=0（贪心） | 12 / 12 / 12 | 1 |
| T=0.8 | 13 / 7 / 14 | 3 |
| T=1.5 | 3 / 9 / 3 | 2 |

T=0 时三次完全相同——这是确定性的。要让「多问几遍」有价值，你必须先让输出产生**差异**，而控制这个差异的旋钮就是温度。

## 直觉理解：手电筒的光斑

把模型对下一个 token 的预测想成一支手电筒照在词表上：

- **温度**决定光斑的**散开程度**。T 小 = 光斑收得很紧，只照亮最亮的那一个 token；T 大 = 光斑散成一片，连暗处的 token 也有机会被选中。
- **top-p** 决定**只保留多亮的部分**。它把暗到看不见的 token 直接切掉（概率置 0），剩下的重新归一化。

两者配合的效果：温度调「形状」，top-p 调「范围」。

| 配置 | 光斑 | 结果 |
| --- | --- | --- |
| T=0 | 只照一个点 | 完全确定，可复现 |
| T=0.7 + top-p=0.95 | 收窄但不唯一 | 有变化，但大体合理 |
| T=1.5 | 散得很开 | 出现不通顺的句子、格式崩塌 |

## 核心概念与原理详解

### 带温度的 softmax

模型输出的是 logits $z \\in \\mathbb{R}^{|V|}$（Qwen3-0.6B 的 $|V| = 151936$）。标准 softmax：

$$p_i = \\frac{\\exp(z_i)}{\\sum_j \\exp(z_j)}$$

带温度：

$$p_i^{(T)} = \\frac{\\exp(z_i / T)}{\\sum_j \\exp(z_j / T)}$$

$T$ 的三种行为：

| $T$ | 效果 | 数学解释 |
| --- | --- | --- |
| $T \\to 0$ | 变成 one-hot（argmax） | $z_i/T$ 的差异被放大到无穷，最大值独占全部概率 |
| $T = 1$ | 原始分布 | 不做任何缩放 |
| $T > 1$ | 分布变平 | 差异被压缩，冷门 token 概率上升 |
| $T \\to \\infty$ | 均匀分布 | 所有 $z_i/T \\to 0$，$p_i \\to 1/|V|$ |

一个具体的数（假设只有 3 个候选 token，logits 为 $[3.0, 2.0, 0.2]$）：

| $T$ | 概率分布 | 最大概率 | 熵（nat） |
| --- | --- | --- | --- |
| 0.1 | [1.000, 0.000, 0.000] | 100.0% | 0.00 |
| 0.5 | [0.878, 0.119, 0.003] | 87.8% | 0.39 |
| 1.0 | [0.700, 0.257, 0.043] | 70.0% | 0.73 |
| 1.5 | [0.600, 0.308, 0.093] | 60.0% | 0.89 |
| 3.0 | [0.474, 0.340, 0.186] | 47.4% | 1.03 |

温度从 1.0 提到 3.0，最大概率只从 70% 掉到 47%，但**熵从 0.73 涨到 1.03（+41%）**。这就是「更分散」的量化含义：最大概率的变化是温和的，熵的变化更明显。

### top-p（nucleus sampling）：按累积概率截断

温度调完形状后，top-p 做一件很实际的事：**从高到低累加概率，攒到 p 就停，后面的全部丢掉**。

以 $T=1$ 的 $[0.700, 0.257, 0.043]$ 为例：

| top-p | 累积 | 保留 | 重归一化后 |
| --- | --- | --- | --- |
| 0.5 | 0.700 ≥ 0.5 → 停 | 只留 token 1 | [1.0] |
| 0.7 | 0.700 + 0.257 = 0.957 ≥ 0.7 → 停 | token 1、2 | [0.731, 0.269] |
| 0.9 | 0.700 + 0.257 = 0.957 ≥ 0.9 → 停 | token 1、2 | [0.731, 0.269] |
| 1.0 | 全部 | 三个都留 | [0.700, 0.257, 0.043] |

注意 0.7 和 0.9 的结果相同——因为前两个 token 的累积概率已经到 0.957，两者都在第二个 token 就停了。**top-p 不是「保留 p% 的 token」，而是「累积概率攒到 p 就停」**，所以不同的 p 值可能给出相同结果。

**top-p 和 top-k 的区别**：top-k 固定保留 k 个，不管分布形状；top-p 保留的个数随分布形状变——分布尖锐时只留 1-2 个，分布平坦时留几十个。这让 top-p 在「有时很确定、有时很不确定」的场景下更稳。

### 关键：温度影响的是「多样性」，不是「正确性」

这是本节最容易被误解的一点。看实测：

| 温度 | 中等题 3 次采样 | 不同答案数 | 其中正确答案 83 |
| --- | --- | --- | --- |
| T=0 | 12 / 12 / 12 | 1 | 0 次 |
| T=0.8 | 13 / 7 / 14 | 3 | 0 次 |
| T=1.5 | 3 / 9 / 3 | 2 | 0 次 |

**三个温度下，正确答案一次都没出现。** 温度提高只带来了「更多不同的错误答案」。

这和很多人的直觉相反。直觉是「高温 = 更多探索 = 更有机会撞到对的」。但在能力边界之外，探索只是让你在错误空间里走得更散——它不会凭空造出模型不具备的解题能力。

正确的用法是：**温度是给 self-consistency 提供多样性的工具，不是提升单次正确率的工具**。要提升单次正确率，用 CoT（c15-l1）。要让多次采样有意义，用温度。两者是配合关系，不是替代关系。

## 机制图解

<Diagram type="slider" name="softmax-temperature" note="拖动滑块看温度如何改变概率分布。注意两个极端：T→0 时分布变成一个尖峰（贪心），T→3 时接近均匀（胡言乱语）。中间那段「既有多样性又不崩」的区间才是可用的。" />

上图就是带温度 softmax 的实时演算。请对照本节的三张表看：

1. **T 越小，分布越尖**——这是 $\\exp(z/T)$ 放大了 logits 差异的直接结果；
2. **T 越大，熵越高**——多样性上来了，但「合理 token」的占比在下降；
3. **top-p 是在这个分布上再做一次截断**，两者串联使用。

## 完整案例：同一句话开头，三种温度

用一段**叙事**（不是数学题）来看温度对「文本质量」的影响，效果更直观。prompt 固定为 \`Continue this story in one short paragraph: The old lighthouse keeper opened the door and\`，各生成 40 token：

| T | 观察 |
| --- | --- |
| 0 | 通顺、连贯、可预测 |
| 0.7 | 通顺但句式变碎，出现重复 |
| 1.5 | **崩了**：出现填空符 \`_________\` 和 \`A. [insert your answer]\` |

三种温度的实际输出（节选）：

\`\`\`
T=0.0 → found the door was locked. He looked around and saw that
        the only way out was through the window...

T=0.7 → noticed something strange. The door was locked. He looked
        for the key. The room was quiet...

T=1.5 → noticed something strange, the door was rusted. The ______
        of his eyes caught his attention... A. [insert your answer]
\`\`\`

T=1.5 的输出里出现了 \`_________\`（下划线填空）和 \`A. [insert your answer]\`——模型在模仿「试卷」这种文本形态。这在 40 token 的短生成里就已经发生了。

这就是「高温会让格式崩塌」的具体样子。对推理任务这是致命的：你需要 \`\\boxed{83}\` 这种**格式**，而格式一旦崩了，答案就提取不出来。

### 一张配置选择表

| 场景 | 推荐配置 | 理由 |
| --- | --- | --- |
| 单次求最优答案 | T=0（+ top-p 无关） | 确定性、可复现、格式最稳 |
| self-consistency（c15-l3） | T=0.7 ~ 0.8，top-p=0.95 | 够多样，又不至于崩格式 |
| Best-of-N（c15-l4） | T=0.8 ~ 1.0 | 需要候选之间有差异，否则 N 个候选会一模一样 |
| 创意写作 | T=1.0 ~ 1.3 | 要的就是发散 |
| **不要用** | T ≥ 1.5 做推理 | 实测格式崩塌，boxed 消失 |

## 代码实践

demo 做两组实验，总共约 30 秒：

**实验 A（叙事，3×40 token）**：同一句开头、三个温度，直接看文本质量怎么变。这一段用 raw completion（不加 chat template），因为续写任务更接近 base 模型的原生行为。

**实验 B（数学，3 温度 × 3 采样 × 25 token）**：同一道中等题，三个温度各采样三次，统计「不同答案数」。这一段会复现本节的核心结论：T=0 三次相同，T>0 三次不同，**但没有一个是正确答案**。

注意代码里的那个分支：

\`\`\`python
if T == 0:
    kw["do_sample"] = False      # 关键：显式关掉采样
else:
    kw.update(do_sample=True, temperature=T, top_p=top_p)
\`\`\`

不写这个分支，Qwen3 的 \`generation_config.json\` 会让 T=0 也走随机采样，你就永远拿不到「三次相同」这个对照。

## 常见误区与安全风险

1. **「温度越高，模型越有创造力、也越聪明」**。前半句对，后半句错。实测三个温度下正确答案 83 一次都没出现。温度调的是分布形状，不是模型能力。
2. **「T=0 就是 argmax」**。数学上 $T \\to 0$ 才是 argmax。实际实现里 \`temperature=0\` 通常被当作「关闭采样」的开关，走 \`do_sample=False\` 的贪心路径。这两条路在数值上等价，但**代码路径不同**——不显式设 \`do_sample=False\` 就可能踩到 generation_config 的默认值。
3. **「top-p 和 top-k 可以随便选一个」**。top-k 在分布尖锐时会保留过多噪声 token，在分布平坦时会切掉合理候选。做推理任务推荐 top-p=0.95 配低温，比 top-k 稳。
4. **安全提示**：温度是**可复现性**的开关。生产环境做审计、做回归测试时必须固定 T=0 + 固定 seed，否则同一份输入两次跑出不同结果，你无法定位是模型问题还是采样噪声。

## 与其他知识点的关联

- **向前**：c11 讲采样策略的实现；c15-l1 讲 CoT 提供了「值得多次采样的长输出」；
- **向后**：c15-l3 的 self-consistency 直接依赖本节——没有温度就没有多样性，没有多样性投票就退化成「同一个答案数 N 遍」；c15-l4 的 Best-of-N 同理；
- **平行**：本站《大模型训练原理》会讲训练时的 temperature scaling 与蒸馏里的 soft target（那里的温度是「软化教师分布」用的，和本节目的不同，别混淆）。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 公式 | $p_i = \\exp(z_i/T) / \\sum_j \\exp(z_j/T)$；$T \\to 0$ 退化为 argmax |
| top-p | 按累积概率截断，保留的个数随分布形状自适应（比 top-k 稳） |
| 实测（数学题） | T=0：12/12/12（1 种）；T=0.8：13/7/14（3 种）；T=1.5：3/9/3（2 种） |
| 关键结论 | 三个温度下正确答案 83 **一次都没出现**——温度给多样性，不给能力 |
| 实测（叙事） | T=1.5 时出现 \`_________\` 与 \`A. [insert your answer]\`，格式崩塌 |
| 选型 | 求最优用 T=0；要多采样用 T=0.7~0.8 + top-p=0.95；推理别超 T=1.3 |

## 参考资料与延伸阅读

> **来源类型：权威教材**
> - Raschka, S. *Build a Reasoning Model (From Scratch)*. Manning, 2025——第 4 章「Sampling and top-p filtering」；本课程的公式推导、手算概率表与全部实测数字为自主编写。
> - Holtzman, A. et al. (2020). "The Curious Case of Neural Text Degeneration." *ICLR*——nucleus sampling（top-p）的原始论文。
>
> **来源类型：原创**
> - 「手电筒光斑」类比、温度-熵对照表、top-p 累积截断手算表、三种温度下的实测答案分布、配置选择表、本节全部习题。
>
> **许可说明**：原书代码为 Apache 2.0 许可；本课程代码为自主编写。

## 动手实验

1. **画温度-熵曲线**：写一段纯 numpy 代码，固定一组 logits（如 \`[3.0, 2.0, 1.5, 1.0, 0.2]\`），让 T 从 0.1 扫到 3.0，画出熵随 T 变化的曲线。你会发现它在 T<1 时急剧上升、T>2 后趋于饱和。
2. **找格式崩塌的临界温度**：把 demo 实验 B 的温度扫成 0.5 / 0.8 / 1.0 / 1.2 / 1.5，每个温度跑 5 次，统计「输出里有 boxed 的比例」。找出这个模型做数学题时格式开始崩的那个温度。
3. **验证 top-p 的收益**：固定 T=0.8，把 top-p 设成 1.0 / 0.95 / 0.9 / 0.8，各跑 5 次，统计「不同答案数」。看 top-p 收紧到什么程度会让多样性消失（退化成 T=0 的效果）。

验收标准：你能不看笔记写出带温度的 softmax 公式、说清 top-p 和 top-k 的区别，并解释「为什么温度提高没有让正确答案出现」。
`,
        tips: [
          {
            kind: 'pitfall',
            text: 'Qwen3 的 generation_config.json 里 do_sample=true、temperature=0.6、top_p=0.95。你不显式传 do_sample=False，所谓「T=0 贪心」其实是随机采样——本站实测时踩过这个坑，表现为「同一段代码两次跑出不同答案」。',
          },
          {
            kind: 'note',
            text: 'top-p 比 top-k 更适合推理任务：分布尖锐时 top-p 只留 1-2 个候选（不会引入噪声），分布平坦时才放宽到几十个。top-k 固定保留 k 个，两种情况下都会错。',
          },
          {
            kind: 'interview',
            text: '面试题：「T=0 和 temperature 很小的采样有什么区别？」高分答法是：数学上 T→0 才收敛到 argmax，工程实现里 temperature=0 通常直接走 do_sample=False 的贪心分支，两者数值等价但代码路径不同，混用会踩配置默认值。',
          },
          {
            kind: 'performance',
            text: '实测：T=1.5 生成 40 token 就出现 ________ 与 A. [insert your answer] 这种格式崩塌。做推理任务时格式一崩，boxed 答案就提取不出来，正确率会假性归零。温度上限建议 1.3。',
          },
        ],
        demos: [
          {
            title: '温度实验：叙事文本质量 + 数学题答案分散度',
            lang: 'python',
            code: `# ── 定位本地模型缓存（本站把权重放在项目内，不依赖全局 ~/.cache）──
import os as _os
def _find_hf():
    for c in [_os.environ.get("HF_HOME"),
              r"D:\Python_Project\knowledge-order\.models\hf",
              _os.path.join(_os.getcwd(), ".models", "hf")]:
        if c and _os.path.isdir(_os.path.join(c, "hub")):
            return c
    return None
_h = _find_hf()
if _h:
    _os.environ["HF_HOME"] = _h
_os.environ.setdefault("HF_HUB_OFFLINE", "1")
_os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
_os.environ.setdefault("TRANSFORMERS_VERBOSITY", "error")

import os, re, time
os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

torch.set_num_threads(4)
MODEL = "Qwen/Qwen3-0.6B"
tok = AutoTokenizer.from_pretrained(MODEL)
model = AutoModelForCausalLM.from_pretrained(MODEL, dtype=torch.float32)
model.eval()

Q_MED = "Half the value of $3x-9$ is $x+37$. What is the value of $x$?"
ONLY = " Answer with only the number, no explanation."
NUM = re.compile(r"-?\\d+(?:\\.\\d+)?")


def chat(p):
    return tok.apply_chat_template([{"role": "user", "content": p}], tokenize=False,
                                   add_generation_prompt=True, enable_thinking=False)


def gen(prompt, max_new, T, top_p=1.0, seed=0, raw=False):
    enc = tok(prompt if raw else chat(prompt), return_tensors="pt")
    kw = dict(max_new_tokens=max_new, pad_token_id=tok.eos_token_id)
    if T == 0:
        kw["do_sample"] = False      # 关键：显式关采样，否则会读 generation_config 的 do_sample=true
    else:
        torch.manual_seed(seed)
        kw.update(do_sample=True, temperature=T, top_p=top_p)
    with torch.no_grad():
        out = model.generate(**enc, **kw)
    n = out.shape[1] - enc["input_ids"].shape[1]
    return tok.decode(out[0][enc["input_ids"].shape[1]:], skip_special_tokens=True), n


t0 = time.time()
print("=" * 70)
print("实验 A：同一句开头、只改温度（叙事任务，T=0 是贪心）")
print("=" * 70)
PROMPT = "Continue this story in one short paragraph: The old lighthouse keeper opened the door and"
for T in [0, 0.7, 1.5]:
    txt, n = gen(PROMPT, 40, T, 1.0, 7, raw=True)
    print(f"\\nT={T}  ({n} token):")
    print("  " + txt.strip().replace("\\n", " "))

print("\\n" + "=" * 70)
print("实验 B：同一道题、只改温度（数学任务，每档 3 次采样）")
print("=" * 70)
for T in [0, 0.8, 1.5]:
    ans = []
    for s in range(3):
        txt, n = gen(Q_MED + ONLY, 25, T, 1.0, 40 + s)
        m = NUM.findall(txt)
        ans.append(m[-1] if m else None)
    print(f"  T={T:<4} 三次答案 = {ans}   不同答案数 = {len(set(ans))}")

print(f"\\n（正确答案是 83。T=0 三次相同，T>0 三次不同，但没有一个是 83。）")
print(f"全程 {time.time()-t0:.0f} 秒")`,
          },
        ],
      },

      /* ─────────────────────────── l3 ─────────────────────────── */
      {
        id: 'llm-a1-c15-l3',
        title: 'Self-consistency：多采样再投票',
        difficulty: 4,
        content: `
## 学习目标

学完本节，你应该能够：
1. 写出 self-consistency 的三步流程（采样 N 个 → 提取答案 → 多数投票），并说清它为什么能提升正确率；
2. **复述本节两组实测对照**：简单题 3 票全一致 → 投票正确；中等题 3 票全不一致 → 投票失效；
3. 解释「模型能力不足时，多采样只会得到更多不同的错误答案」，并据此判断一个题集该不该上投票。

## 前置知识

- c15-l1 的 CoT（投票的样本必须是带推理链的长输出，否则「提取答案」这一步没有意义）；
- c15-l2 的温度（没有温度就没有多样性，投票退化成同一个答案数 N 遍）；
- c14-l2 的 \`\\boxed{}\` 解析（提取器决定了投票的输入质量）。

## 问题背景：一个看起来很美的想法

c15-l1 让模型答对了一道题，c15-l2 让它的输出有了多样性。把两者接起来，就得到一个很自然的方法：

> 同一道题，用高温采样 N 次，得到 N 个答案，取出现次数最多的那个。

这就是 **self-consistency**（自洽性投票），2022 年由 Wang 等提出。它在论文里的数字很漂亮：GSM8K 上 pass@1 从 17.9% 提到 56.5%。

但本节要告诉你的是：**它在你的模型上很可能不起作用**。

先看两组实测（同一份 Qwen3-0.6B 权重）：

| 组 | 题目 | 温度 | 样本数 | 提取到的答案 | 投票结果 |
| --- | --- | --- | --- | --- | --- |
| A | \`17+25\`（简单） | 0.7 | 3 | 42 / 42 / 42 | **42（3/3）✓** |
| B | \`Half of 3x-9 = x+37\`（中等） | 0.8 | 3 | 83 / 74 / 3 | **83（1/3）→ 失效** |

A 组完美：三票一致，答案正确。B 组崩了：三个样本给出**三个完全不同的答案**，每个只出现一次。「多数票」在这种情况下没有任何意义——1/3 的票数和抛硬币一样。

而 B 组里那个正确的 83 确实出现了，但只出现一次。投票机制**把一个正确样本投掉了**。

## 直觉理解：投票的前提是「大部分人不会一起犯同样的错」

想象你问 100 个人一道算术题：

- 如果**大部分人都会做**，那么他们的答案会趋于一致，个别算错的人被投票淹没 → 投票有效；
- 如果**大部分人不会做**，那么每个人会给出各自不同的错误答案 → 票数分散，投票结果随机 → 投票无效，甚至有害。

第二种情况就是本节 B 组的样子。Qwen3-0.6B 对这道题的能力**在边界上**：加 CoT 用贪心解码能答对（c15-l1 实测 83），但一旦引入随机性，它的推理链会从中间某个随机点开始跑偏，最后落到各自不同的错误答案上。

**投票不是「从错误中挑出正确」，而是「从多数中挑出答案」。当多数本身是错的、而且错得各不相同，投票就只能瞎选。**

## 核心概念与原理详解

### 三步流程

    ┌─────────────┐
    │ 问题 + CoT  │
    └──────┬──────┘
           │ 高温采样 N 次（各自独立）
           ▼
    ┌─────────────────────────────┐
    │ 样本1  样本2  …  样本N      │
    │ 各自的推理链 + boxed 答案    │
    └──────────────┬──────────────┘
                   │ 提取器：正则捞 \boxed{}
                   ▼
    ┌─────────────────────────────┐
    │ 答案列表 [83, 74, 3]        │
    └──────────────┬──────────────┘
                   │ 统计频次，取众数
                   ▼
    ┌─────────────────────────────┐
    │ 最终答案（可能无众数）        │
    └─────────────────────────────┘

三个环节各有自己的失败模式：

| 环节 | 失败模式 | 症状 |
| --- | --- | --- |
| 采样 | 温度太低 → N 个样本完全相同 | 投票退化成单次采样，白花 N 倍算力 |
| 提取 | 解析器捞不到 boxed | 答案列表里一堆 None，投票样本数不足 |
| 投票 | 所有答案各出现一次 | 无众数，结果等价于随机挑一个 |

**本节 B 组三个环节全中**：温度 0.8 给了多样性（好），提取器正常工作（好），但投票环节因为无众数而失效（坏）。

### 为什么它「有时候」有效

self-consistency 有效的严格前提是：**模型的正确率显著高于「随机分布」**。

设模型单次正确率为 $p$，错误答案分散在 $M$ 个不同的值上。投票正确的条件是：正确答案的出现次数严格多于任何一个错误答案。粗略地，当 $p > 1/(M+1)$ 时投票才开始有优势。

| 单次正确率 $p$ | 错误答案种类 $M$ | 投票有用吗 |
| --- | --- | --- |
| 0.9 | 3 | 有用。正确答案几乎每次都占多数 |
| 0.5 | 3 | 边缘。$0.5 > 0.25$，勉强有用 |
| 0.3 | 5 | 无效。$0.3 < 0.17$ 的边界已经接近 |
| 0.15 | 8 | 有害。正确答案永远是最少数 |

本节的实测正好落在「边缘 → 无效」这一档：简单题 $p \\approx 1$，投票当然有效；中等题单次正确率大约 1/3（3 个样本里只有 1 个对），而错误答案有 2-3 种，投票结果就变成了噪声。

### 边际收益递减：N 该取多少

即使投票有效，收益也会随 N 递减。原因很直接：多数票的置信度大致按 $\\sqrt{N}$ 增长，而成本按 $N$ 线性增长。

| N | 成本（相对 N=1） | 投票稳定性（相对） | 性价比 |
| --- | --- | --- | --- |
| 1 | 1× | 基线 | — |
| 3 | 3× | 约 1.7× | **最高** |
| 5 | 5× | 约 2.2× | 一般 |
| 11 | 11× | 约 3.3× | 差 |
| 21 | 21× | 约 4.6× | 很差 |

论文里的 self-consistency 常用 N=40，因为那是在**大模型 + 高正确率**的前提下，为了挤出最后几个百分点。对 0.6B 这个量级的模型，N 从 3 加到 5 往往只是把「三个不同的错误答案」变成「五个不同的错误答案」。

### 一个更重要的判断：先测单次正确率，再决定要不要投票

工程上的正确顺序是：

1. **先测单次正确率** $p$（T=0，同一题集，比如 50 题）；
2. 若 $p < 0.5$：**不要上投票**，去改 prompt（c15-l1）或换更大的模型；
3. 若 $p \\geq 0.7$：可以上 N=3 的投票，先小规模验证；
4. 若 $p \\geq 0.9$：投票收益有限，直接 T=0 更省钱。

本节 B 组的单次正确率（T=0.8 采样口径）约 1/3，按这个规则就不该上投票。这不是 self-consistency 的错，是**用错了场景**。

## 机制图解

<Diagram type="tensor" steps="问题+CoT|采样 N 次|提取 boxed|答案列表|统计频次|众数存在?|是→输出|否→失效" note="第三步的「众数存在?」是整个方法的生死线。本节 B 组就是在这里断掉的：三个样本三个答案，每个只出现一次，没有众数。" />

上图把 self-consistency 拆成六个环节。请注意最后那个分支——

**它不是一个异常分支，而是一个常见分支**。在模型能力边界附近，无众数才是常态。一个健壮的实现必须显式处理它：要么返回 None（承认失败），要么退回「第一个样本」（至少可复现），**不能静默地取 \`max()\` 的结果**——那会给你一个看起来像答案的随机数。

## 完整案例：两组对照的完整数据

### 对照组 A：简单题，投票有效

题目 \`What is 17+25?\`，T=0.7，3 个样本（实测）：

| 样本 | 生成 token | 提取答案 | 是否正确 |
| --- | --- | --- | --- |
| 1 | 97 | 42 | ✓ |
| 2 | 116 | 42 | ✓ |
| 3 | 45 | 42 | ✓ |
| **投票** | 共 258 token | **42（3/3）** | **✓** |

三个样本的 token 数差异很大（45 / 97 / 116），说明它们的推理链长度不同——但都收敛到了同一个答案。这正是投票理想的工作状态：**路径不同，结论相同**。

### 对照组 B：中等题，投票失效

题目 \`Half the value of 3x-9 is x+37. What is x?\`，T=0.8，3 个样本（实测）：

| 样本 | 生成 token | 提取答案 | 是否正确 |
| --- | --- | --- | --- |
| 1 | 129 | **83** | ✓ |
| 2 | 140 | 74 | ✗ |
| 3 | 140 | 3 | ✗ |
| **投票** | 共 409 token | **83（1/3）** | 无众数 |

三个样本给出三个不同答案，每个频次 1。**投票机制选中了 83 只是因为它在列表里排第一**（\`Counter.most_common(1)\` 在频次相同时按插入顺序返回），换一个实现顺序就会选中 74 或 3。

这就是「投票失效」的真面目：它不是投错了，而是**根本没有可投的东西**。

### 补充：5 样本口径下的同样结论

把样本数提到 5（这是规格 §1.2 的基线口径，用于和论文对照）：

| 组 | 题目 | 温度 | 5 个样本的答案 | 结论 |
| --- | --- | --- | --- | --- |
| 简单题 | \`17+25\` | 0.7 | 42 / 42 / 42 / 42（4 个有效票，1 个 None） | **42（4/4）✓ 投票正确** |
| 中等题 | \`3x-9\` 半值 | 0.8 | 83 / 13 / 49 / 11 / None | **全不一致 ✗ 投票失效** |

两组结论与 3 样本版完全一致，且中等题这一组更极端：5 个样本给出 4 个不同的错误答案 + 1 个解析失败。**样本数从 3 加到 5，只是让「不同的错误答案」从 2 种变成 4 种。**

| 指标 | 对照组 A（简单题） | 对照组 B（中等题） |
| --- | --- | --- |
| 单次正确率（采样口径） | ≈ 100% | ≈ 33% |
| 3 样本答案 | 42 / 42 / 42 | 83 / 74 / 3 |
| 5 样本答案 | 42×4 + None | 83 / 13 / 49 / 11 / None |
| 不同答案数 | 1 | 3 ~ 4 |
| 投票结果 | ✓ 正确 | ✗ 无众数 |
| 增加样本数的效果 | 无变化（已经全对） | **更分散，没有变好** |

## 代码实践

demo 复现上表的两组对照，跑两遍结果完全一致（seed 固定）。总耗时约 72 秒，在 120 秒预算内。

三个关键实现细节：

**① 提取器必须能返回 None。** 用 \`boxed 优先 + 最后一个数字兜底\` 的策略，但**兜底不是万能的**：当输出被 \`max_new_tokens\` 截断时，「最后一个数字」可能是推导过程中的中间量（比如 74），而不是答案。实测里 74 和 3 就是这么来的。这不是解析器的 bug，是采样预算不足的直接后果。

**② 投票要显式处理「无众数」。** 代码里用 \`Counter.most_common(1)\` 拿到了一个结果，但**同时打印了频次**——频次为 1 就说明这次投票无效。生产代码里必须把这个分支显式化：

\`\`\`python
cnt = collections.Counter(a for a in answers if a is not None)
top, freq = cnt.most_common(1)[0] if cnt else (None, 0)
if freq == 1 and len(cnt) > 1:
    return None          # 无众数：承认失败，别静默返回随机值
return top
\`\`\`

**③ 温度按题难度分开设。** 简单题用 T=0.7 就够了（实测 3 票全一致），中等题用 T=0.8。温度设太高（1.5）会让格式崩塌，连 boxed 都捞不到，投票样本数直接减半。

## 常见误区与安全风险

1. **「self-consistency 一定比单次采样好」**。错。本节 B 组就是反例：3 个样本花了 409 token，投票结果是个随机值。它只在「单次正确率显著高于 1/(错误答案种类+1)」时有效。
2. **「样本数越多越准」**。边际收益递减，而且方向可能反。B 组从 3 样本加到 5 样本，不同答案数从 2 种变成 4 种，投票更没希望。
3. **「投票能纠正模型的错误」**。不能。投票只能在「多数样本已经对了」的情况下把多数挑出来。它不能创造模型不具备的能力——这和第 2 章讲的「集成学习能提升弱学习器」有本质区别：集成的前提是各学习器**独立**且**各自优于随机**。
4. **安全提示**：self-consistency 的算力成本是 N 倍。如果 N=5、每题 200 token，一天 10 万请求就是 1 亿 token 的推理量。上线前先算账，别让「提几个百分点」变成「成本翻五倍」。另外，**无众数时静默返回随机值**是严重的工程隐患：用户会以为这是模型的确定答案。

## 与其他知识点的关联

- **向前**：c15-l1 的 CoT 提供长推理链（投票的对象），c15-l2 的温度提供多样性（投票的前提），c14-l2 的解析器提供答案提取；
- **向后**：c15-l4 的 Best-of-N 是 self-consistency 的「换目标版」——不投票选众数，而是打分选最优；c16 的 GRPO 是「把投票的结果训进权重」，让模型第一次就答对，从而彻底省掉 N 倍成本；
- **平行**：本站《大模型训练原理》的 llm-b4 会讲 pass@k 指标——注意 pass@k 和 self-consistency 的区别：pass@k 只要 N 个样本里有 1 个对就算成功（B 组会得满分），self-consistency 要求多数票对（B 组得零分）。这两个指标常被混用。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 流程 | 高温采样 N 个 → 提取 boxed 答案 → 统计频次取众数 |
| 实测 A（简单题 T=0.7，3 样本） | 42 / 42 / 42 → **42（3/3）✓** |
| 实测 B（中等题 T=0.8，3 样本） | 83 / 74 / 3 → **无众数，投票失效** |
| 5 样本基线 | 简单题 42（4/4）✓；中等题 83/13/49/11/None **全不一致 ✗** |
| 核心教训 | 模型能力不足时，多采样只会得到**更多不同的错误答案** |
| 有效前提 | 单次正确率 $p$ 显著高于 $1/(M+1)$，$M$ 为错误答案种类数 |
| 边际收益 | 稳定性 $\u221aN$ 增长，成本 $N$ 线性增长；N=3 性价比最高 |
| 工程红线 | 无众数必须显式返回 None，不能静默取 \`max()\` 的随机结果 |

## 参考资料与延伸阅读

> **来源类型：权威教材**
> - Raschka, S. *Build a Reasoning Model (From Scratch)*. Manning, 2025——第 5 章「Self-consistency and best-of-N」；本课程的两组实测对照、「无众数」工程处理与全部数字为自主编写。
> - Wang, X. et al. (2023). "Self-Consistency Improves Chain of Thought Reasoning in Language Models." *ICLR*——self-consistency 原始论文（GSM8K 17.9% → 56.5%）。
> - Cobbe, K. et al. (2021). "Training Verifiers to Solve Math Word Problems."（GSM8K 数据集与 pass@k 指标）
>
> **来源类型：原创**
> - 「问 100 个人算术」类比、$p > 1/(M+1)$ 的有效性判据表、N 与边际收益表、两组实测的完整 token 级数据、本节全部习题。
>
> **许可说明**：原书代码为 Apache 2.0 许可；本课程代码为自主编写。

## 动手实验

1. **复现两组对照**：跑 demo，确认「简单题 3 票一致 / 中等题 3 票全散」。然后把中等题的温度改成 0.5 和 1.0 各跑一遍，看「不同答案数」怎么变——你会发现低温让票数集中，但集中的往往还是错答案。
2. **量化「投票何时有用」**：自建一个 10 题的小题集（5 道简单 + 5 道中等），对每题跑 T=0 的单次正确率和 N=3 的投票正确率，填一张 10 行表。算出「投票相对单次的提升」和「token 成本倍数」，判断这笔账划不划算。
3. **写一个健壮的投票器**：实现 \`vote(answers)\`，要求：①过滤 None；②无众数时返回 \`None\`；③平票时返回 \`None\` 而不是按顺序取第一个；④返回 \`(answer, confidence)\` 二元组。用本节 A/B 两组数据当测试用例。

验收标准：你能不看笔记说出两组实测的具体数字（42/42/42 与 83/74/3），解释「为什么 B 组投票失效」，并说出 self-consistency 有效的单次正确率前提。
`,
        tips: [
          {
            kind: 'pitfall',
            text: '无众数时用 Counter.most_common(1) 会静默返回「按插入顺序的第一个」——看起来像答案，其实是随机的。实测 B 组 83/74/3 各一票，换实现顺序就会选中 74 或 3。必须显式判断频次，频次为 1 且种类>1 就返回 None。',
          },
          {
            kind: 'note',
            text: 'pass@k 和 self-consistency 是两回事：pass@k 只要 N 个样本里有 1 个对就算成功，实测 B 组（含 83）会得满分；self-consistency 要求多数票对，B 组得零分。评测口径选错，会得出完全相反的结论。',
          },
          {
            kind: 'interview',
            text: '面试题：「self-consistency 什么时候失效？」答：当单次正确率 p 不显著高于 1/(M+1)（M 为错误答案种类数）时。此时正确答案永远是最少数，投票只会把它投掉。本课程实测：中等题 3 样本得 83/74/3，正确的 83 被投掉。',
          },
          {
            kind: 'performance',
            text: '实测成本：A 组 3 样本 258 token 全对，B 组 3 样本 409 token 得随机值。N 从 3 加到 5 时 B 组不同答案数从 2 变 4，更没希望。投票的稳定性按 √N 涨，成本按 N 涨——先测单次正确率再决定要不要投票。',
          },
        ],
        demos: [
          {
            title: 'self-consistency 两组对照：简单题投票成功 vs 中等题投票失效',
            lang: 'python',
            code: `# ── 定位本地模型缓存（本站把权重放在项目内，不依赖全局 ~/.cache）──
import os as _os
def _find_hf():
    for c in [_os.environ.get("HF_HOME"),
              r"D:\Python_Project\knowledge-order\.models\hf",
              _os.path.join(_os.getcwd(), ".models", "hf")]:
        if c and _os.path.isdir(_os.path.join(c, "hub")):
            return c
    return None
_h = _find_hf()
if _h:
    _os.environ["HF_HOME"] = _h
_os.environ.setdefault("HF_HUB_OFFLINE", "1")
_os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
_os.environ.setdefault("TRANSFORMERS_VERBOSITY", "error")

import os, re, time, collections
os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

torch.set_num_threads(4)
T0 = time.time()
MODEL = "Qwen/Qwen3-0.6B"
tok = AutoTokenizer.from_pretrained(MODEL)
model = AutoModelForCausalLM.from_pretrained(MODEL, dtype=torch.float32)
model.eval()
print(f"模型加载 {time.time()-T0:.1f} 秒\\n")

Q_EASY = "What is $17+25$?"
Q_MED  = "Half the value of $3x-9$ is $x+37$. What is the value of $x$?"
COT = "\\n\\nLet's think step by step."
BOX = re.compile(r"\\\\boxed\\{([^{}]*)\\}")
NUM = re.compile(r"-?\\d+(?:\\.\\d+)?")


def extract(text):
    b = BOX.findall(text)
    if b:
        return b[-1].strip()
    n = NUM.findall(text)
    return n[-1] if n else None


def sample(q, max_new, T, seed):
    torch.manual_seed(seed)
    p = tok.apply_chat_template([{"role": "user", "content": q}], tokenize=False,
                                add_generation_prompt=True, enable_thinking=False)
    enc = tok(p, return_tensors="pt")
    with torch.no_grad():
        out = model.generate(**enc, max_new_tokens=max_new, do_sample=True,
                             temperature=T, pad_token_id=tok.eos_token_id)
    n = out.shape[1] - enc["input_ids"].shape[1]
    txt = tok.decode(out[0][enc["input_ids"].shape[1]:], skip_special_tokens=True)
    return extract(txt), n


def vote(title, question, T, max_new):
    print("=" * 66)
    print(title)
    print("=" * 66)
    answers = []
    for i in range(3):
        a, n = sample(question + COT, max_new, T, 500 + i)
        answers.append(a)
        print(f"    样本{i+1}: {n:>3} token   答案 = {a}")

    cnt = collections.Counter(a for a in answers if a is not None)
    top, freq = cnt.most_common(1)[0] if cnt else (None, 0)
    print(f"  答案分布 = {dict(cnt)}   不同答案数 = {len(cnt)}")

    # 关键：无众数（每个答案只出现一次）时必须显式承认失败
    if freq == 1 and len(cnt) > 1:
        print(f"  → 无众数（每个答案仅 1 票），投票失效，返回 None\\n")
        return answers, None
    print(f"  → 多数票 = {top}（{freq}/3）\\n")
    return answers, top


a1, w1 = vote("对照组 A：简单题 What is 17+25？  T=0.7，3 个样本", Q_EASY, 0.7, 120)
a2, w2 = vote("对照组 B：中等题 Half of 3x-9 = x+37  T=0.8，3 个样本", Q_MED, 0.8, 140)

print("=" * 66)
print("结论")
print("=" * 66)
print(f"  简单题：答案 {a1} → 投票 {w1}（正确 42？{w1 == '42'}）")
print(f"  中等题：答案 {a2} → 投票 {w2}（正确 83？{w2 == '83'}）")
print(f"  正确答案 83 出现在 {sum(1 for a in a2 if a == '83')}/3 个样本里")
print(f"\\n  教训：模型能力不足时，多采样只会得到更多不同的错误答案。")
print(f"  全程 {time.time()-T0:.0f} 秒")`,
          },
        ],
      },

      /* ─────────────────────────── l4 ─────────────────────────── */
      {
        id: 'llm-a1-c15-l4',
        title: 'Best-of-N 与自反思',
        difficulty: 4,
        content: `
## 学习目标

学完本节，你应该能够：
1. 写出 Best-of-N 的流程，并说清它和 self-consistency 的区别（打分选优 vs 投票选众）；
2. 设计一个可用的启发式打分器（格式分 + 形态分 + 置信分），并解释为什么它不能是「真正的正确性判断」；
3. **复述本节两个失效实测**：3 个候选全部同分（打分器无信号）、critique 说「OK」但 revise 后答案变差；
4. 说出自反思（critique → revise）在什么条件下会变好、什么条件下会变差。

## 前置知识

- c15-l3 的 self-consistency（本节的对照组）；
- c15-l2 的温度（Best-of-N 需要候选之间有差异）；
- c14-l3 的判分（理解「判断答案对不对」本身有多难）。

## 问题背景：投票不管用，那换个选法

c15-l3 的教训是：投票要求「多数样本已经对了」。如果多数样本是错的，投票就失效。

那有没有一种方法，能在**多数样本都错**的情况下，仍然挑出对的那个？

理论上有：**只要有一个候选是对的，而你能判断哪个对，就能选出来。** 这就是 Best-of-N（也叫 rejection sampling / 拒绝采样）：

> 采样 N 个候选，用一个打分器给每个候选打分，取分数最高的那个。

它比 self-consistency 更强，因为不要求「正确答案占多数」——只要求「正确答案在候选里」且「打分器能识别它」。

**但它引入了一个新的依赖：打分器。** 而打分器本身可能就是错的。

本节会先讲清楚机制，再用两个实测告诉你它怎么翻车。

## 直觉理解：面试多招几个人，但面试官会看走眼

self-consistency 像「小组讨论后投票」——前提是组里大多数人靠谱。

Best-of-N 像「多招几个候选人，让面试官挑一个」——前提是面试官眼光准。

| 方法 | 类比 | 依赖 |
| --- | --- | --- |
| self-consistency | 小组投票 | 多数人靠谱 |
| Best-of-N | 面试官挑选 | 面试官眼光准 |
| 自反思 | 让候选人自己检查再改 | 候选人会自我纠错 |

三种方法各自依赖一个不同的前提，**没有一个能凭空创造能力**。

## 核心概念与原理详解

### Best-of-N 的流程

    问题
      │
      ├── 采样 1（T=0.8）→ 候选 1 ──┐
      ├── 采样 2（T=0.8）→ 候选 2 ──┤
      └── 采样 3（T=0.8）→ 候选 3 ──┤
                                     ▼
                            打分器 score(候选)
                                     │
                                     ▼
                              argmax → 最终答案

三个环节，三个可能的失败点：

| 环节 | 失败模式 | 后果 |
| --- | --- | --- |
| 采样 | 正确候选不在 N 个里面 | 无论打分器多准都没用（本节实测就中了这条） |
| 打分 | 打分器给不出区分度（全同分） | 退化成「随机取第一个」 |
| 打分 | 打分器偏向错误特征 | 主动选中错的那个 |

### 打分器可以是什么

真实系统里有四种选择，代价和准确度递增：

| 打分器 | 原理 | 成本 | 准确度 |
| --- | --- | --- | --- |
| **启发式规则** | 格式合规 + 长度合规 + 模型置信度 | 几乎为 0 | 低，但对「格式崩了」很敏感 |
| **平均 logprob** | 用模型自己的概率判断「它有多确信」 | 采样时顺手算 | 中低，和正确性相关性弱 |
| **奖励模型（ORM）** | 训一个模型给整段回答打分 | 需要训练 | 中高 |
| **过程奖励模型（PRM）** | 逐步给推理链打分 | 需要训练 + 标注 | 高 |
| **可验证奖励** | 用规则真的验算答案 | 低（但需要可验证任务） | **最高** |

本节 demo 用的是第一种（启发式）。它的打分函数：

\`\`\`python
def score(ans, boxed, avg_logp):
    s = 0.0
    s += 1.0 if boxed else 0.0                    # 格式分：有 \\boxed{}
    s += 0.5 if ans and len(ans) <= 4 else 0.0    # 形态分：答案短小像个数
    s += max(0.0, min(0.5, avg_logp + 1.0))       # 置信分：模型平均 logprob
    return s
\`\`\`

注意这个打分器的**根本局限**：它检查的是「答案长得像不像答案」，而不是「答案对不对」。一个格式完美、置信度极高的错误答案，会拿满分。

本节第一个 demo 用 5 个构造好的候选演示了这一点：

| 候选 | 答案 | 有 boxed | 平均 logprob | 打分 | 说明 |
| --- | --- | --- | --- | --- | --- |
| 1 | 83（对） | ✓ | -0.900 | 1.60 | 正确但模型不确信 |
| 2 | 85（错） | ✓ | +0.000 | **2.00** | **错误但模型极确信 → 被选中** |
| 3 | None | ✗ | +0.000 | 0.50 | 被截断 |
| 4 | \`x = 83\`（对） | ✓ | -0.180 | 1.50 | 正确但带了前缀 |
| 5 | 83（对） | ✗ | -0.300 | 1.00 | 正确但没按格式写 |

**正确答案 83 出现了三次（候选 1/4/5），一次都没被选中。** 打分器把 2.00 分给了那个答 85 的候选——因为它「确信」、格式合规、答案短小。这三项都跟「正确」无关。

### 平均 logprob 为什么不能当正确性用

直觉上「模型越确信越可能对」。实测数据打破这个直觉。

本节第二个 demo（真实模型）采样 3 个候选，平均 logprob 分别是 +0.000 / -0.008 / -0.037——**全部接近 0**（也就是接近 100% 的置信度），而它们的答案分别是 9 / 76 / 76，**没有一个是正确的 83**。

原因：模型在生成时是「自回归地确信每一步」，而每一步的局部概率高，不等于整条推理链正确。一条从头就错但错得很「顺」的推理链，每一步的 logprob 都可以很高。**局部置信度不能推出全局正确性。**

| 候选 | 生成 token | 答案 | 有 boxed | 平均 logprob | 打分 |
| --- | --- | --- | --- | --- | --- |
| 1 | 170 | 9 | ✗ | +0.000 | 1.00 |
| 2 | 170 | 76 | ✗ | -0.008 | 1.00 |
| 3 | 170 | 76 | ✗ | -0.037 | 1.00 |
| **Best-of-3 选中** | | **9** | | | **✗ 错** |

三个候选**全部同分 1.00**（都缺格式分 1.0，都拿到形态分 0.5 和置信分 0.5）。打分器给不出任何区分度，\`max()\` 只是按顺序返回了第一个。

这就是 Best-of-N 的第一个死法：**候选全是坏的，打分器无信号，选出来的和随机挑一样**。

### 自反思：critique → revise

另一个思路：让模型**检查自己**的输出，然后改。

    第 1 轮：模型答题 → 答案 A1
              │
              ▼
    批评：把题目 + A1 给模型，让它找错
              │
              ▼
    第 2 轮：把题目 + A1 + 批评 一起给模型，让它重答 → 答案 A2

听起来很合理：多一轮检查总能发现问题吧？实测：

| 轮次 | 生成 token | 耗时 | 答案 |
| --- | --- | --- | --- |
| 第 1 轮（答题） | 109 | 11.3 s | **83 ✓** |
| 批评 | 3 | 0.9 s | **「OK.」** |
| 第 2 轮（改答） | 120 | 12.8 s | **None ✗** |

第 1 轮就答对了。批评环节只输出了 3 个 token：「OK.」——它认为答案正确（这次它是对的）。然后第 2 轮**把正确答案改坏了**：输出在推导中途被截断，boxed 答案消失。

这是自反思的经典失败模式，有三个原因叠加：

1. **批评环节在「同意」时没有提供新信息**，但它改变了 prompt 的长度和结构，把模型推离了原本正确的路径；
2. **第 2 轮的 token 预算不够**：120 token 对这道题（CoT 需要 190+）偏紧，导致截断；
3. **模型有「必须改点什么」的倾向**：即使批评说 OK，它也会重写一遍，而重写就可能引入新错误。

### 自反思什么时候有用

| 条件 | 有用 | 有害 |
| --- | --- | --- |
| 第 1 轮确实错了 | ✓ 有机会纠正 | |
| 第 1 轮已经对了 | | ✗ 可能改坏（本节实测） |
| 批评环节能给出**具体**错误位置 | ✓ | |
| 批评环节只说「OK」或泛泛而谈 | | ✗ 纯噪声 |
| 第 2 轮 token 预算充足 | ✓ | |
| 第 2 轮预算不足 | | ✗ 截断（本节实测） |
| 有外部验证器（如真的验算） | ✓ 可靠 | |
| 只靠模型自评 | | ✗ 不可靠 |

关键洞察：**自反思的有效性完全取决于「批评的质量」**。如果批评来自一个真正能判断对错的验证器（比如 c14-l3 的 SymPy 判等、或者可执行的单元测试），那么 critique → revise 是可靠的。如果批评来自模型自己，那就是「让学生自己批改自己的卷子」——他要是能批对，当初就不会做错。

## 机制图解

<Diagram type="factoryloop" note="自反思是一个闭环：答题 → 验证 → 反馈 → 再答。闭环能不能收敛，取决于「验证」这一站的质量。如果验证站只是个复读机（说 OK 或说些泛泛的话），闭环就会漂移——本节实测里它就漂到了 None。" />

上图是自反思的循环结构。请对照实测看那个「验证」节点：

1. **它输出「OK.」时只花了 3 个 token**——没有提供任何可用于改进的信息；
2. **循环没有终止条件**：实测里第 2 轮比第 1 轮差，如果没有外部判分，你根本不知道应该停在第 1 轮；
3. **每一轮都在消耗预算**：109 + 3 + 120 = 232 token，比单次答题贵 2 倍多。

**工程结论**：自反思必须有终止条件。最常见的做法是「保留历史最优」——每轮都打分，最后返回分数最高的那一轮，而不是最后一轮。

## 完整案例：两个失效的完整数据

### 失效一：Best-of-3 全同分

| 项 | 值 |
| --- | --- |
| 题目 | \`Half the value of 3x-9 is x+37\` |
| 温度 / 每候选 token | T=0.8 / 170 |
| 候选答案 | 9 / 76 / 76 |
| 平均 logprob | +0.000 / -0.008 / -0.037 |
| 打分 | 1.00 / 1.00 / 1.00（全同分） |
| Best-of-3 结果 | 9（错） |
| 正确答案 83 在候选里吗 | **不在** |
| 采样耗时 | 55 秒 |

三重失败叠加：**正确候选没被采到**（采样环节）+ **打分器无区分度**（打分环节）+ **token 预算不足导致 boxed 消失**（工程环节）。

### 失效二：critique → revise 把对的改错

| 项 | 值 |
| --- | --- |
| 第 1 轮答案 | 83 ✓（109 token，11.3 秒） |
| 批评输出 | 「OK.」（3 token，0.9 秒） |
| 第 2 轮答案 | None ✗（120 token，12.8 秒，截断） |
| 净效果 | 从对变错，多花 123 token |
| 总耗时 | 35 秒 |

注意第 2 轮的行为：它**没有**因为批评说 OK 就保留原答案，而是从头重写了一遍——重写到 120 token 时被截断，boxed 还没出现。

## 代码实践

两个 demo，覆盖本节的两条主线：

**demo 1（纯函数，秒级）**：用一个**不调模型**的打分器演示 Best-of-N 的机制。它把 5 个预设候选（含正确答案、含格式崩坏的、含超长的）喂给打分器，打印每个候选的分数明细和最终选择。这一段的价值是让你看清「打分器怎么工作」和「它的偏见在哪」——比如它会偏好短答案，而短答案未必对。

**demo 2（真实模型，约 76 秒）**：真的采样 3 个候选、真的算平均 logprob、真的打分选优。它复现上表的「全同分」结果。

两个 demo 放在一起看，你会得到本节最重要的认识：**机制很简单，难的是打分器**。

## 常见误区与安全风险

1. **「Best-of-N 一定比 self-consistency 好」**。不一定。Best-of-N 依赖打分器，self-consistency 依赖多数正确。哪个更好取决于你的场景：如果任务是**可验证的**（数学、代码），用规则验算当打分器，Best-of-N 更强；如果不可验证（开放问答），打分器不可靠，投票可能更稳。
2. **「平均 logprob 能当正确性用」**。实测反例：3 个候选平均 logprob 全部接近 0（置信度极高），答案全是错的。局部置信度推不出全局正确性。
3. **「自反思总能让答案变好」**。实测反例：第 1 轮就答对（83），批评说「OK」，第 2 轮改成 None。**自反思在「已经答对」时会引入风险，而你没有判分器时无法察觉。**
4. **「多轮反思 = 更多思考 = 更准」**。反思的收益完全取决于批评的质量。模型自评时，它判断对错的能力和它答题的能力是同一个——答不对的题，它也看不出自己错在哪。
5. **安全提示**：自反思的循环必须设上限（轮数 + 总 token）。没有上限的循环在线上会烧掉大量配额，而且如本节实测所示，**越往后越差**。另外，如果 Best-of-N 的候选会被展示给用户，注意候选里可能包含被截断的、格式崩坏的文本，别直接透出。

## 与其他知识点的关联

- **向前**：c15-l3 的 self-consistency 是本节对照组；c15-l2 的温度提供候选多样性；c14-l3 的判分是「理想打分器」的参照；
- **向后**：c16 的 RLVR 与 GRPO 直接承接本节——**把「可验证奖励」当打分器，并且不止用来选，还用来训练**。这是 Best-of-N 的升级路径：从「N 个里选 1 个」变成「把选中的行为训进权重，下次第一个就对」；
- **平行**：本站《大模型训练原理》的 llm-b4 会讲 RLHF 里的奖励模型（ORM/PRM），那正是本节「打分器」的工业级版本。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| Best-of-N 流程 | 采样 N 个 → 打分器打分 → 取最高分 |
| 与投票的区别 | 投票选「众数」（要求多数对），Best-of-N 选「最优」（要求打分器准） |
| 实测失效一 | 3 候选答案 9/76/76，平均 logprob 全 ≈ 0，打分全 1.00 → 选中 9（错），正确 83 不在候选里 |
| 实测失效二 | 第 1 轮 83 ✓ → 批评「OK.」（3 token）→ 第 2 轮 None ✗（截断），从对变错 |
| 打分器谱系 | 启发式 < 平均 logprob < ORM < PRM < 可验证奖励 |
| 自反思前提 | 批评必须来自**真正能判断对错**的验证器；模型自评不可靠 |
| 工程红线 | 循环必须设上限；必须保留历史最优（返回最高分那轮，不是最后一轮） |

## 参考资料与延伸阅读

> **来源类型：权威教材**
> - Raschka, S. *Build a Reasoning Model (From Scratch)*. Manning, 2025——第 5 章「Best-of-N and self-refinement」；本课程的两个失效实测、「保留历史最优」的工程结论为自主编写。
> - Lightman, H. et al. (2023). "Let's Verify Step by Step." *ICLR*——过程奖励模型（PRM），即「逐步打分」的原始论文。
> - Shinn, N. et al. (2023). "Reflexion: Language Agents with Verbal Reinforcement Learning." *NeurIPS*——自反思循环的代表工作。
> - Madaan, A. et al. (2023). "Self-Refine: Iterative Refinement with Self-Feedback." *NeurIPS*——本节 critique → revise 的原型。
>
> **来源类型：原创**
> - 「面试官挑人」类比、打分器谱系表、平均 logprob 反例数据、自反思有效性条件表、两个失效的完整 token 级数据、本节全部习题。
>
> **许可说明**：原书代码为 Apache 2.0 许可；本课程代码为自主编写。

## 动手实验

1. **改造打分器**：把 demo 2 的打分器加上「必须有 boxed 才给分」（把格式分改成 gate：没 boxed 直接 0 分）。重跑，看结果会不会变。再试「平均 logprob 权重加大到 2.0」，看它会不会选错得更厉害。
2. **给自反思加终止条件**：把 demo 里的 critique → revise 改成「跑 3 轮，每轮都打分，返回最高分那轮」。用本节这道题测，看它能不能保住第 1 轮的 83。
3. **换一个可靠打分器**：用 c14-l3 写的判分器（数值容差 + SymPy 判等）替代启发式打分器，重跑 Best-of-3。如果 N=3 时正确候选没被采到，把 N 提到 5 再试——记录「正确候选出现率」随 N 的变化。

验收标准：你能不看笔记说出 Best-of-N 和 self-consistency 的区别，解释「为什么平均 logprob 不能当正确性用」，并说出自反思在什么条件下会变差。
`,
        tips: [
          {
            kind: 'pitfall',
            text: '实测：3 个候选平均 logprob 全是 +0.000 / -0.008 / -0.037（置信度接近 100%），答案却是 9/76/76，全错。局部置信度高推不出全局正确性——一条从头就错但错得顺的推理链，每步 logprob 都能很高。',
          },
          {
            kind: 'note',
            text: 'Best-of-N 有三个独立失败点：①正确候选没采到 ②打分器无区分度（全同分） ③打分器偏向错误特征。本节实测同时中了 ①和②：候选 9/76/76 全无 boxed，打分全 1.00，max() 只是按顺序返回第一个。',
          },
          {
            kind: 'interview',
            text: '面试题：「Best-of-N 和 self-consistency 的区别？」答：投票选众数，要求多数样本已对；Best-of-N 选最优，要求打分器能识别正确。前者依赖「群体正确率」，后者依赖「验证器质量」。可验证任务用 Best-of-N 更强，开放问答投票更稳。',
          },
          {
            kind: 'performance',
            text: '自反思必须有终止条件，且要「保留历史最优」而不是返回最后一轮。实测：第 1 轮 83（对）→ 批评 OK（3 token）→ 第 2 轮 None（截断，错）。返回最后一轮会把对的换成错的，还多花 123 token。',
          },
        ],
        demos: [
          {
            title: 'Best-of-N 打分器（纯函数，不调模型，秒级）',
            lang: 'python',
            code: `"""Best-of-N 的打分器：不调模型，纯规则演示机制与偏见。
真实场景里打分器可以换成 ORM / PRM / 可验证奖励（c16 的主题）。"""


def score(cand):
    """启发式打分：格式分 + 形态分 + 置信分，满分 2.0"""
    s = 0.0
    s += 1.0 if cand["boxed"] else 0.0                       # 有没有 \\boxed{}
    s += 0.5 if cand["ans"] and len(cand["ans"]) <= 4 else 0.0  # 答案短小像个数
    s += max(0.0, min(0.5, cand["avg_logp"] + 1.0))          # 模型平均 logprob
    return round(s, 2)


CANDS = [
    {"name": "候选1", "ans": "83",    "boxed": True,  "avg_logp": -0.900, "note": "正确，但模型不太确信"},
    {"name": "候选2", "ans": "85",    "boxed": True,  "avg_logp": +0.000, "note": "错误，但模型非常确信"},
    {"name": "候选3", "ans": None,    "boxed": False, "avg_logp": +0.000, "note": "被截断，boxed 都没出现"},
    {"name": "候选4", "ans": "x = 83", "boxed": True,  "avg_logp": -0.180, "note": "正确，但答案带了前缀"},
    {"name": "候选5", "ans": "83",    "boxed": False, "avg_logp": -0.300, "note": "正确，但没按格式写"},
]

print("=" * 78)
print("Best-of-N：给 5 个候选打分，取最高分")
print("=" * 78)
print(f"{'候选':<8}{'答案':<10}{'boxed':<8}{'avg_logp':>10}{'打分':>8}   说明")
print("-" * 78)
for c in CANDS:
    c["s"] = score(c)
    print(f"{c['name']:<8}{str(c['ans']):<10}{str(c['boxed']):<8}"
          f"{c['avg_logp']:>10.3f}{c['s']:>8.2f}   {c['note']}")

best = max(CANDS, key=lambda c: c["s"])
print("-" * 78)
print(f"Best-of-5 选中 {best['name']} → 答案 {best['ans']}   正确（83）？{best['ans'] == '83'}")

print()
print("=" * 78)
print("打分器的三个偏见（这就是它不可靠的原因）")
print("=" * 78)
c1 = next(c for c in CANDS if c["name"] == "候选1")
c2 = next(c for c in CANDS if c["name"] == "候选2")
c4 = next(c for c in CANDS if c["name"] == "候选4")
c5 = next(c for c in CANDS if c["name"] == "候选5")
print(f"  ① 偏好「确信」而非「正确」：")
print(f"     候选1 答 83（对）置信度低（logp -0.900）→ {c1['s']:.2f} 分")
print(f"     候选2 答 85（错）置信度高（logp +0.000）→ {c2['s']:.2f} 分  ← 被选中")
print(f"  ② 惩罚「格式不合规」而非「答案错误」：候选5 答 83（对）但没写 boxed → {c5['s']:.2f} 分")
print(f"  ③ 讨厌「多余字符」：候选4 写 x = 83（对）但长度 6 > 4 → {c4['s']:.2f} 分")

print()
print("结论：打分器检查的是「答案长得像不像答案」，不是「答案对不对」。")
print("      正确答案 83 有三次机会（候选1/4/5），却一次都没被选中。")
print("      要真正判断对错，必须用可验证奖励（规则验算）——那是 c16 的主题。")`,
          },
          {
            title: '真实模型 Best-of-3：采样 + 平均 logprob + 打分选优',
            lang: 'python',
            code: `# ── 定位本地模型缓存（本站把权重放在项目内，不依赖全局 ~/.cache）──
import os as _os
def _find_hf():
    for c in [_os.environ.get("HF_HOME"),
              r"D:\Python_Project\knowledge-order\.models\hf",
              _os.path.join(_os.getcwd(), ".models", "hf")]:
        if c and _os.path.isdir(_os.path.join(c, "hub")):
            return c
    return None
_h = _find_hf()
if _h:
    _os.environ["HF_HOME"] = _h
_os.environ.setdefault("HF_HUB_OFFLINE", "1")
_os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
_os.environ.setdefault("TRANSFORMERS_VERBOSITY", "error")

import os, re, time
os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
import torch
import torch.nn.functional as F
from transformers import AutoModelForCausalLM, AutoTokenizer

torch.set_num_threads(4)
T0 = time.time()
MODEL = "Qwen/Qwen3-0.6B"
tok = AutoTokenizer.from_pretrained(MODEL)
model = AutoModelForCausalLM.from_pretrained(MODEL, dtype=torch.float32)
model.eval()
print(f"模型加载 {time.time()-T0:.1f} 秒", flush=True)

Q = "Half the value of $3x-9$ is $x+37$. What is the value of $x$?"
COT = "\\n\\nLet's think step by step."
BOX = re.compile(r"\\\\boxed\\{([^{}]*)\\}")
NUM = re.compile(r"-?\\d+(?:\\.\\d+)?")


def candidate(prompt, max_new, T, seed):
    """采样一个候选，顺便算最后 10 个 token 的平均 logprob"""
    torch.manual_seed(seed)
    p = tok.apply_chat_template([{"role": "user", "content": prompt}], tokenize=False,
                                add_generation_prompt=True, enable_thinking=False)
    enc = tok(p, return_tensors="pt")
    with torch.no_grad():
        out = model.generate(**enc, max_new_tokens=max_new, do_sample=True, temperature=T,
                             pad_token_id=tok.eos_token_id, return_dict_in_generate=True,
                             output_scores=True)
    ids = out.sequences[0]
    n = ids.shape[0] - enc["input_ids"].shape[1]
    txt = tok.decode(ids[enc["input_ids"].shape[1]:], skip_special_tokens=True)
    lp, c = 0.0, 0
    for i, sc in enumerate(out.scores):
        if i >= n - 10:
            lp += F.log_softmax(sc[0].float(), -1)[ids[enc["input_ids"].shape[1] + i]].item()
            c += 1
    return txt, n, lp / max(c, 1)


def score(ans, boxed, avg_lp):
    s = 0.0
    s += 1.0 if boxed else 0.0
    s += 0.5 if ans and len(ans) <= 4 else 0.0
    s += max(0.0, min(0.5, avg_lp + 1.0))
    return round(s, 2)


print("\\n采样 3 个候选（T=0.8）：", flush=True)
cands = []
t = time.time()
for i in range(3):
    txt, n, alp = candidate(Q + COT, 170, 0.8, 300 + i)
    b = BOX.findall(txt)
    a = b[-1].strip() if b else (NUM.findall(txt)[-1] if NUM.findall(txt) else None)
    s = score(a, bool(b), alp)
    cands.append(dict(ans=a, boxed=bool(b), lp=alp, n=n, s=s))
    print(f"  候选{i+1}: {n:>3} token  答案={a!s:<5} 有boxed={bool(b)} "
          f"平均logprob={alp:+.3f} 打分={s:.2f}", flush=True)

print("\\n选优：", flush=True)
best = max(cands, key=lambda c: c["s"])
print(f"  Best-of-3 选中 候选{cands.index(best)+1} → {best['ans']}  "
      f"（正确 83？{best['ans'] == '83'}）", flush=True)
print(f"  候选里有正确答案 83：{any(c['ans'] == '83' for c in cands)}", flush=True)

scores = [c["s"] for c in cands]
if len(set(scores)) == 1:
    print(f"\\n  ⚠ 三个候选打分完全相同（{scores[0]:.2f}），打分器没有区分度：")
    print(f"    max() 只是按顺序返回了第一个。这就是 Best-of-N 的典型失效。")
print(f"\\n采样耗时 {time.time()-t:.0f} 秒，总 {time.time()-T0:.0f} 秒")`,
          },
          {
            title: 'critique → revise：自反思循环（含「越改越差」实测）',
            lang: 'python',
            code: `# ── 定位本地模型缓存（本站把权重放在项目内，不依赖全局 ~/.cache）──
import os as _os
def _find_hf():
    for c in [_os.environ.get("HF_HOME"),
              r"D:\Python_Project\knowledge-order\.models\hf",
              _os.path.join(_os.getcwd(), ".models", "hf")]:
        if c and _os.path.isdir(_os.path.join(c, "hub")):
            return c
    return None
_h = _find_hf()
if _h:
    _os.environ["HF_HOME"] = _h
_os.environ.setdefault("HF_HUB_OFFLINE", "1")
_os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
_os.environ.setdefault("TRANSFORMERS_VERBOSITY", "error")

import os, re, time
os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

torch.set_num_threads(4)
T0 = time.time()
MODEL = "Qwen/Qwen3-0.6B"
tok = AutoTokenizer.from_pretrained(MODEL)
model = AutoModelForCausalLM.from_pretrained(MODEL, dtype=torch.float32)
model.eval()
print(f"模型加载 {time.time()-T0:.1f} 秒", flush=True)

Q = "Half the value of $3x-9$ is $x+37$. What is the value of $x$?"
BOX = re.compile(r"\\\\boxed\\{([^{}]*)\\}")
BRIEF = ("\\n\\nThink in at most 3 short lines, then put the final answer in \\\\boxed{} "
         "as the very last thing you write.")


def gen(q, max_new):
    p = tok.apply_chat_template([{"role": "user", "content": q}], tokenize=False,
                                add_generation_prompt=True, enable_thinking=False)
    enc = tok(p, return_tensors="pt")
    t = time.time()
    with torch.no_grad():
        out = model.generate(**enc, max_new_tokens=max_new, do_sample=False,
                             pad_token_id=tok.eos_token_id)
    n = out.shape[1] - enc["input_ids"].shape[1]
    return tok.decode(out[0][enc["input_ids"].shape[1]:], skip_special_tokens=True), n, time.time() - t


def ans(t):
    b = BOX.findall(t)
    return b[-1].strip() if b else None


# ── 第 1 轮：答题 ──
r0, n0, d0 = gen(Q + BRIEF, 120)
a0 = ans(r0)
print(f"\\n第 1 轮（答题）: {n0} token / {d0:.1f}s   答案 = {a0}")
print(f"  末尾: ...{r0[-70:]}")

# ── 批评：让它检查自己的答案 ──
crit_prompt = (f"Question: {Q}\\n\\nA student's solution:\\n{r0}\\n\\n"
               "Check every arithmetic step. If all correct, reply exactly 'OK'. "
               "Otherwise name the first wrong step in one sentence.")
rc, nc, dc = gen(crit_prompt, 70)
print(f"\\n批评环节: {nc} token / {dc:.1f}s")
print(f"  输出: {rc[:200]!r}")

# ── 第 2 轮：带着批评重答 ──
rev_prompt = (f"Question: {Q}\\n\\nYour previous solution:\\n{r0}\\n\\n"
              f"Reviewer feedback:\\n{rc[:250]}\\n\\n"
              "Now give the corrected solution. End with \\\\boxed{N}.")
r1, n1, d1 = gen(rev_prompt, 120)
a1 = ans(r1)
print(f"\\n第 2 轮（改答）: {n1} token / {d1:.1f}s   答案 = {a1}")

print("\\n" + "=" * 60)
print("结论")
print("=" * 60)
verdict = "变好" if a1 == "83" and a0 != "83" else ("变差" if a0 == "83" and a1 != "83" else "不变")
print(f"  第 1 轮 = {a0}  →  第 2 轮 = {a1}   判定：{verdict}")
print(f"  总 token = {n0 + nc + n1}（比单次答题多花 {nc + n1}）")
print()
print("  为什么变差：批评只输出 'OK.'（没有新信息），但重写改变了 prompt 结构，")
print("  而第 2 轮的 120 token 预算又不足以走完 CoT —— 结果被截断，boxed 消失。")
print("  工程结论：自反思必须「保留历史最优」，返回打分最高的那轮，而不是最后一轮。")
print(f"\\n总耗时 {time.time()-T0:.0f} 秒")`,
          },
        ],
      },
    ],
    exercises: llmA1C15Exercises,
  },
];
