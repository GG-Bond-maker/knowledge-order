import type { Chapter } from '../../types';

/* ============================================================
 *  人工智能基础 · 论文导读 · 训练与规模
 *  22 Deep Speech 2: End-to-End Speech Recognition
 *
 *  来源：
 *  - 论文：Amodei et al. (2015) arXiv:1512.02595
 *  - 参考：Ojhaharsh/30u30 第 22 篇（CC BY-NC-ND 4.0，本地个人使用）
 *  - 本课程为原创导读 + 原创习题
 *
 *  执行说明：本章代码需要 PyTorch，走本地后端执行。
 * ============================================================ */

export const paperTrainingChapters4: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c4: Deep Speech 2
   * ============================================================ */
  {
    id: 'paper-training-c4',
    title: 'Deep Speech 2：端到端语音识别',
    goal: '理解语音识别从"流水线"到"端到端"的转变，掌握 CTC 损失如何解决对齐问题，能手写 CTC 前向与解码。',
    lessons: [
      {
        id: 'paper-training-c4-l1',
        title: '从流水线到端到端',
        difficulty: 5,
        content: `
## 论文信息

| 项目 | 内容 |
| --- | --- |
| **标题** | Deep Speech 2: End-to-End Speech Recognition in English and Mandarin |
| **作者** | Dario Amodei, Rishita Anubhai, Eric Battenberg, et al.（Baidu） |
| **发表** | ICML 2016 |
| **arXiv** | [1512.02595](https://arxiv.org/abs/1512.02595) |
| **一句话贡献** | 用端到端深度网络替代传统语音识别流水线，中英文同一套架构 |

## 传统语音识别流水线

**2015 年前的标准做法**：

    音频 → 特征提取（MFCC） → 声学模型（GMM-HMM） → 发音词典 → 语言模型 → 文本

**每个模块独立训练**：

| 模块 | 作用 | 问题 |
| --- | --- | --- |
| **特征提取** | MFCC/FBANK | 手工设计，可能丢信息 |
| **声学模型** | 音素识别 | 需要强制对齐（帧↔音素） |
| **发音词典** | 音素→词 | 人工编写 |
| **语言模型** | 语法约束 | 单独训练 |

**核心问题**：**每个模块都要单独优化，误差累积**。

## 端到端的核心挑战：对齐

**问题**：输入是音频帧序列（如 1000 帧），输出是字符序列（如 20 个字符）。

    "你好"  →  1000 帧音频
    输出 2 个字符

**对齐是未知的**：

| 帧范围 | 对应字符 |
| --- | --- |
| 1-300 | 你 |
| 301-700 | 好 |
| 701-1000 | 静音 |

**但没人告诉我们这个对应关系！**

**传统做法**：用 HMM 强制对齐（需要预先知道音素边界）。

**端到端需要**：**直接从 (音频, 文本) 对学习，不需要对齐标签**。

## CTC：Connectionist Temporal Classification

**核心思想**：**引入"空白符"（blank），让网络自己决定对齐**。

**做法**：

1. 网络每个时间步输出所有字符 + 一个 blank 的概率
2. 定义一个"折叠"规则，把帧级输出转成字符序列
3. 对所有可能的对齐求和

**折叠规则**：

    ① 合并相邻重复字符
    ② 删除所有 blank

**例子**：

    帧级输出:  - - 你 你 - 好 好 好 -
    合并重复:  - 你 - 好 -
    删 blank:  你 好

<CTCDemo />

**关键**：**同一个输出序列可以有多种对齐**。

    你 好
    对应：-你-好-、你-好--、--你好-、你你好-好...

**CTC 损失**：对所有合法对齐的概率求和。

    P(y|x) = Σ_{π ∈ B^{-1}(y)} P(π|x)

其中 \`B\` 是折叠函数。

<CTCAlignmentDemo />

## CTC 损失的计算

**暴力枚举不可行**（指数级对齐数）。

**动态规划（前向算法）**：

**关键技巧**：在输出序列中插入 blank，构造扩展序列。

    原序列: 你 好
    扩展:   - 你 - 好 -

**递推**：

    α[t][s] = (α[t-1][s] + α[t-1][s-1] + α[t-1][s-2]) · p(y_s | x_t)

**约束**：只有当 \`y_s\` 和 \`y_{s-2}\` 不同时，才能跳过（避免合并错误）。

**复杂度**：O(T × S)，T=帧数，S=扩展序列长度。

<CTCLossDemo />

## Deep Speech 2 的架构

**结构**：

    音频 → 频谱图 → Conv（2-3 层） → RNN（多层 BiGRU） → FC → Softmax（字符 + blank）

**详细**：

| 层 | 配置 |
| --- | --- |
| **输入** | 频谱图（20ms 窗口，10ms 步长） |
| **Conv 1** | 2D 卷积，提取局部声学特征 |
| **Conv 2-3** | 继续提取 |
| **RNN** | 3-7 层 BiGRU（每层 1000+ 单元） |
| **FC** | 全连接 |
| **输出** | 字符集 + blank（英文 ~29，中文 ~6000） |

<DeepSpeechArchDemo />

**关键设计**：

| 设计 | 作用 |
| --- | --- |
| **频谱图输入** | 比 MFCC 保留更多信息 |
| **Conv + RNN** | Conv 提局部特征，RNN 建时序依赖 |
| **BiGRU** | 双向看上下文 |
| **CTC 损失** | 解决对齐 |
| **BatchNorm** | 加速收敛 |
| **SortaGrad** | 先训短句（稳定） |

## SortaGrad：一个实用的训练技巧

**问题**：CTC 损失在长句上方差很大，训练初期容易崩。

**解法**：**第一个 epoch 按长度排序**（短的先训）。

    epoch 1: 按音频长度排序，从短到长
    epoch 2+: 随机打乱

**效果**：训练更稳定，收敛更快。

**为什么**：
- 短句的对齐空间小，梯度方差小
- 先学会短的，再学长的

## 实验结果

**英文（LibriSpeech）**：

| 模型 | WER（词错误率） |
| --- | --- |
| 传统流水线 | ~8% |
| **Deep Speech 2** | **5.3%** |
| 人类（同一测试集） | ~5.8% |

**关键**：**DS2 超过了人类水平**（在这个测试集上）。

**中文（普通话）**：

| 指标 | 结果 |
| --- | --- |
| 字符错误率 | 3.7% |
| 与英文对比 | 同一套架构，只需换输出字符集 |

**关键**：**架构通用性**——不需要为不同语言重新设计。

## 为什么端到端重要

**① 消除人工特征**

    传统：MFCC + 音素 + 词典（大量人工设计）
    端到端：直接从波形/频谱学习

**② 联合优化**

    传统：各模块独立优化，误差累积
    端到端：一个损失函数，端到端反向传播

**③ 数据驱动**

    数据越多，端到端优势越大
    （传统方法的瓶颈是人工设计的模块）

## 局限

| 局限 | 说明 |
| --- | --- |
| **需要大量数据** | 数千小时标注语音 |
| **CTC 的假设** | 输出之间条件独立（不考虑语言模型） |
| **解码复杂** | 需要 beam search + 语言模型 |
| **长音频** | 内存和计算压力 |

**后续改进**：

| 工作 | 改进 |
| --- | --- |
| **Listen-Attend-Spell** | 用注意力替代 CTC |
| **RNN-T** | 流式端到端（Google） |
| **Whisper** | 大规模弱监督 |
| **Conformer** | Conv + Transformer |

## 与现代语音模型的关系

**Whisper（2022）**：

    编码器-解码器 Transformer
    68 万小时弱监督数据
    多语言、多任务

**与 DS2 的共同点**：
- 端到端
- 频谱图输入
- 字符级输出

**不同点**：
- DS2 用 CTC，Whisper 用注意力解码
- DS2 需要对齐假设，Whisper 不需要

## 本节来源

> **来源类型：学术来源**
> - Amodei, D. et al. *Deep Speech 2: End-to-End Speech Recognition in English
>   and Mandarin* arXiv:[1512.02595](https://arxiv.org/abs/1512.02595)（ICML 2016）
> - Graves, A. et al. *Connectionist Temporal Classification: Labelling Unsegmented
>   Sequence Data with Recurrent Neural Networks*（ICML 2006，CTC 原始论文）
> - Radford, A. et al. *Robust Speech Recognition via Large-Scale Weak Supervision*
>   arXiv:[2212.04356](https://arxiv.org/abs/2212.04356)（Whisper）
>
> **来源类型：参考资料（CC BY-NC-ND 4.0，本地个人使用）**
> - Ojhaharsh/30u30 第 22 篇（993 行，含 AudioSample / CharEncoder / ConvBlock）
>
> **来源类型：原创**
> - 全部导读文字、交互图示、代码示例与习题
`,
        tips: [
          {
            kind: 'interview',
            text: '「CTC 的核心」：引入 blank 符号，网络每帧输出"字符+blank"的概率。折叠规则（合并重复+删 blank）把帧级输出转成字符序列。损失对所有合法对齐求和。',
          },
          {
            kind: 'leak',
            text: '「CTC 损失怎么算」：暴力枚举指数级，用动态规划（前向算法）。在输出中插入 blank 构造扩展序列，O(T×S) 递推。',
          },
          {
            kind: 'pitfall',
            text: 'CTC 假设各帧输出条件独立（不考虑语言模型）。所以实际解码需要加语言模型（beam search + LM）。这是 CTC 的局限，也是后续 RNN-T/注意力模型要解决的。',
          },
        ],
        demos: [
          {
            title: 'CTC 折叠与对齐（PyTorch）',
            lang: 'python',
            code: `import numpy as np

def ctc_collapse(path, blank=0):
    """
    CTC 折叠：合并相邻重复 + 删除 blank。

    path: 帧级标签序列（如 [0,0,1,1,0,2,2,0]）
    blank: blank 的索引
    """
    result = []
    prev = None
    for p in path:
        if p != prev and p != blank:
            result.append(p)
        prev = p
    return result


print("=== CTC 折叠演示 ===")
print()
print("blank = 0，字符 1='你', 2='好'")
print()

cases = [
    ([0, 0, 1, 1, 0, 2, 2, 0], "标准情况"),
    ([1, 1, 1, 2, 2, 2], "无 blank"),
    ([0, 1, 0, 1, 0], "相同字符被 blank 分隔"),
    ([1, 1, 2, 2, 1, 1], "重复字符连续"),
    ([0, 0, 0, 0], "全 blank"),
]

for path, desc in cases:
    collapsed = ctc_collapse(path, blank=0)
    chars = ["-", "你", "好"]
    path_str = " ".join(chars[p] for p in path)
    out_str = "".join(chars[p] for p in collapsed) if collapsed else "(空)"
    print(f"{desc}:")
    print(f"  帧级: {path_str}")
    print(f"  折叠: {out_str}")
    print()

print("=== 关键：一个输出对应多种对齐 ===")
print()
target = [1, 2]   # "你好"
print(f"目标输出: 你 好")
print()
print("可能的对齐（T=5 帧）:")
alignments = [
    [1, 1, 0, 2, 2],
    [1, 0, 0, 2, 0],
    [0, 1, 2, 2, 0],
    [1, 0, 2, 0, 0],
    [0, 1, 0, 2, 0],
]
for a in alignments:
    collapsed = ctc_collapse(a, 0)
    ok = collapsed == target
    chars = ["-", "你", "好"]
    print(f"  {' '.join(chars[p] for p in a)}  ->  {''.join(chars[p] for p in collapsed)}  {'OK' if ok else 'X'}")

print()
print("CTC 损失 = 所有这些合法对齐的概率之和")
print("P(你好|x) = sum over alignments P(alignment|x)")

print()
print("=== 为什么需要 blank ===")
print()
print("没有 blank 时的问题：")
print("  '你好' 的对齐必须是 你 你 好 好")
print("  但 '你你' 也是 你 你，无法区分")
print()
print("有 blank 后：")
print("  '你好' = 你 你 - 好 好")
print("  '你你' = 你 - 你")
print("  -> 可以区分！")
print()
print("这就是 blank 的作用：分隔相同字符")

print()
print("=== 用 PyTorch 验证 ===")
import torch
import torch.nn.functional as F

T, C, N = 8, 4, 1   # 8 帧，4 类（blank + 3 字符），1 个样本
log_probs = F.log_softmax(torch.randn(T, N, C), dim=-1)
targets = torch.tensor([[1, 2]], dtype=torch.long)
input_lengths = torch.tensor([T])
target_lengths = torch.tensor([2])

loss = F.ctc_loss(log_probs, targets, input_lengths, target_lengths, blank=0)
print(f"CTC 损失: {loss.item():.4f}")

# 解码（贪心）
pred = log_probs.argmax(dim=-1).squeeze(1).numpy()
print(f"贪心解码帧级: {pred.tolist()}")
print(f"折叠后: {ctc_collapse(pred.tolist(), 0)}")`,
          },
          {
            title: 'CTC 前向算法（动态规划）',
            lang: "python",
            code: `import numpy as np

def ctc_forward(probs, target, blank=0):
    """
    CTC 前向算法（计算 P(target|input)）。

    probs: (T, C) 每帧的字符概率
    target: (S,) 目标字符序列
    """
    T, C = probs.shape
    S = len(target)

    # 构造扩展序列：- y1 - y2 - ... - yS -
    extended = []
    for y in target:
        extended.append(blank)
        extended.append(y)
    extended.append(blank)
    L = len(extended)   # 2S + 1

    # alpha[t][s]
    alpha = np.zeros((T, L))

    # 初始化
    alpha[0][0] = probs[0][extended[0]]
    if L > 1:
        alpha[0][1] = probs[0][extended[1]]

    # 递推
    for t in range(1, T):
        for s in range(L):
            val = alpha[t-1][s]
            if s >= 1:
                val += alpha[t-1][s-1]
            # 跳过 blank 的条件：s-2 的字符和 s 不同
            if s >= 2 and extended[s] != blank and extended[s] != extended[s-2]:
                val += alpha[t-1][s-2]
            alpha[t][s] = val * probs[t][extended[s]]

    # 终止：最后两个位置
    p = alpha[T-1][L-1]
    if L > 1:
        p += alpha[T-1][L-2]
    return p, alpha


print("=== CTC 前向算法演示 ===")
print()

np.random.seed(42)
T = 6
C = 4      # blank=0, 字符 1,2,3
target = [1, 2]   # 输出"12"

# 构造概率（每帧归一化）
probs = np.random.rand(T, C)
probs = probs / probs.sum(axis=1, keepdims=True)

print(f"帧数 T={T}, 类别 C={C}（0=blank）")
print(f"目标序列: {target}")
print()
print("每帧概率:")
chars = ["-", "a", "b", "c"]
print("     " + " ".join(f"{c:>6}" for c in chars))
for t in range(T):
    print(f"t={t}: " + " ".join(f"{p:>6.3f}" for p in probs[t]))

print()
p, alpha = ctc_forward(probs, target, blank=0)
print(f"P(target|input) = {p:.6f}")
print(f"CTC 损失 = -log P = {-np.log(p):.4f}")

print()
print("=== 扩展序列与 alpha 矩阵 ===")
print()
extended = []
for y in target:
    extended.append(0)
    extended.append(y)
extended.append(0)
print(f"扩展序列: {extended} -> {[chars[e] for e in extended]}")
print()
print("alpha 矩阵（行=t, 列=扩展序列位置）:")
print("       " + " ".join(f"{chars[e]:>8}" for e in extended))
for t in range(T):
    print(f"t={t}:   " + " ".join(f"{v:>8.5f}" for v in alpha[t]))

print()
print("=== 验证：与暴力枚举对比 ===")
print()

# 枚举所有长度为 T 的对齐
import itertools
total = 0.0
count = 0
for path in itertools.product(range(C), repeat=T):
    # 折叠
    collapsed = []
    prev = None
    for p_ in path:
        if p_ != prev and p_ != 0:
            collapsed.append(p_)
        prev = p_
    if collapsed == target:
        prob = 1.0
        for t, p_ in enumerate(path):
            prob *= probs[t][p_]
        total += prob
        count += 1

print(f"暴力枚举: {count} 种对齐, P = {total:.6f}")
print(f"前向算法: P = {p:.6f}")
print(f"差异: {abs(total - p):.2e}")
print()
print("-> 完全一致！前向算法只是更高效（O(T*L) vs O(C^T)）")

print()
print("=== 复杂度对比 ===")
print()
for T_ in [10, 20, 50]:
    S = 5
    brute = C ** T_
    dp = T_ * (2*S + 1)
    print(f"T={T_:>2}, S={S}: 暴力 {brute:>15,}, 动态规划 {dp:>6,}")`,
          },
          {
            title: 'Deep Speech 2 架构与频谱图',
            lang: "python",
            code: `import torch
import torch.nn as nn
import numpy as np

class ConvBlock(nn.Module):
    """DS2 的卷积块。"""
    def __init__(self, in_ch, out_ch, kernel, stride, dropout=0.0):
        super().__init__()
        self.conv = nn.Conv2d(in_ch, out_ch, kernel, stride=stride, padding=kernel//2)
        self.bn = nn.BatchNorm2d(out_ch)
        self.relu = nn.ReLU(inplace=True)
        self.dropout = nn.Dropout(dropout) if dropout > 0 else nn.Identity()

    def forward(self, x):
        return self.dropout(self.relu(self.bn(self.conv(x))))


class DeepSpeech2(nn.Module):
    """简化的 Deep Speech 2。"""
    def __init__(self, n_mels=80, n_classes=29, hidden=256, n_layers=3):
        super().__init__()
        # 卷积层（提取局部声学特征）
        self.conv1 = ConvBlock(1, 32, 3, 2)
        self.conv2 = ConvBlock(32, 32, 3, 2)

        # RNN 层（建模时序）
        self.rnn = nn.GRU(32 * (n_mels // 4), hidden, n_layers,
                          batch_first=True, bidirectional=True)

        # 输出层
        self.fc = nn.Linear(hidden * 2, n_classes)

    def forward(self, x):
        # x: (B, 1, n_mels, T)
        x = self.conv1(x)
        x = self.conv2(x)
        B, C, F, T = x.shape
        # 转成序列：(B, T, C*F)
        x = x.permute(0, 3, 1, 2).reshape(B, T, C * F)
        x, _ = self.rnn(x)
        return self.fc(x)   # (B, T, n_classes)


print("=== Deep Speech 2 前向 ===")
torch.manual_seed(42)
model = DeepSpeech2(n_mels=80, n_classes=29)

B = 2
T_frames = 200     # 200 帧（约 2 秒音频，10ms 步长）
x = torch.randn(B, 1, 80, T_frames)

out = model(x)
print(f"输入: {tuple(x.shape)}  (batch, 1, 80 mel, 200 帧)")
print(f"输出: {tuple(out.shape)}  (batch, 时间步, 字符类别)")
print()
print("输出维度解释：")
print(f"  {out.shape[0]} 个样本")
print(f"  {out.shape[1]} 个时间步（卷积下采样后）")
print(f"  {out.shape[2]} 个类别（blank + 28 个字符）")

print()
print("=== 卷积下采样 ===")
print()
print("原音频: 10ms 一帧 -> 200 帧 = 2 秒")
print("conv1 stride=2 -> 100 帧")
print("conv2 stride=2 -> 50 帧")
print()
print("所以输出时间步 = 50")
print("CTC 允许输出长度 <= 输入长度")

print()
print("=== 参数量 ===")
total = sum(p.numel() for p in model.parameters())
for name, m in [("Conv", [model.conv1, model.conv2]),
                ("RNN", [model.rnn]),
                ("FC", [model.fc])]:
    n = sum(p.numel() for mod in m for p in mod.parameters())
    print(f"  {name:>5}: {n:>10,} ({n/total*100:>5.1f}%)")
print(f"  {'总计':>5}: {total:>10,}")

print()
print("=== 频谱图概念 ===")
print()
print("语音识别输入不是原始波形，而是频谱图：")
print()
print("  波形: 1D 信号（16000 采样/秒）")
print("     ↓ 分帧（20ms 窗口，10ms 步长）")
print("     ↓ FFT")
print("     ↓ Mel 滤波器组")
print("  频谱图: 2D（80 mel × T 帧）")
print()
print("为什么用频谱图：")
print("  · 人耳对频率的感知是对数的（Mel 尺度）")
print("  · 波形的高频细节对识别无用")
print("  · 频谱图更紧凑（80×200 vs 32000 采样）")

print()
print("=== SortaGrad：先训短句 ===")
print()
print("问题：长音频的 CTC 损失方差大，训练初期容易崩")
print()
print("解法：")
print("  epoch 1: 按音频长度排序（短 -> 长）")
print("  epoch 2+: 随机打乱")
print()
lengths = [50, 120, 200, 80, 300, 40, 150]
print(f"原始顺序长度: {lengths}")
print(f"排序后:       {sorted(lengths)}")
print()
print("效果：训练更稳定，收敛更快")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'paper-training-c4-e1',
        type: 'single',
        difficulty: 2,
        question: 'CTC 损失解决的核心问题是？',
        options: [
          { value: 'A', text: '训练速度慢' },
          { value: 'B', text: '输入（音频帧）和输出（字符）长度不同且对齐未知' },
          { value: 'C', text: '显存不够' },
          { value: 'D', text: '过拟合' },
        ],
        answer: 'B',
        explanation:
          '音频有 1000 帧但只有 20 个字符，且不知道哪几帧对应哪个字符。CTC 引入 blank 符号，对所有可能的对齐求和，从而不需要对齐标签。',
        tags: ['核心动机'],
      },
      {
        id: 'paper-training-c4-e2',
        type: 'judge',
        difficulty: 2,
        question: 'CTC 的折叠规则是：先合并相邻重复字符，再删除所有 blank。',
        answer: true,
        explanation:
          '顺序很重要。例：`- 你 你 - 好 好 好 -` → 合并重复 → `- 你 - 好 -` → 删 blank → `你 好`。注意必须先合并再删 blank，否则 `你 - 你` 会被错误合并成 `你`。',
        tags: ['折叠规则'],
      },
      {
        id: 'paper-training-c4-e3',
        type: 'multiple',
        difficulty: 3,
        question: 'CTC 引入 blank 符号的作用包括？（多选）',
        options: [
          { value: 'A', text: '分隔相同的字符（如"你你" vs "你好"）' },
          { value: 'B', text: '表示"这一帧没有输出"（静音/过渡）' },
          { value: 'C', text: '让所有合法对齐的概率可以被求和' },
          { value: 'D', text: '减少输出类别数量' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误——blank 反而**增加**了一个类别。A/B/C 是 blank 的三个作用：分隔重复字符、表示无输出、使对齐可枚举。',
        tags: ['blank 作用'],
      },
      {
        id: 'paper-training-c4-e4',
        type: 'fill',
        difficulty: 3,
        question:
          'CTC 损失用 ___ 算法（动态规划）计算，复杂度 O(T×S) 而非指数级。',
        blanks: [['前向', 'forward', '前向算法']],
        explanation:
          '暴力枚举所有对齐是指数级（C^T）。前向算法在扩展序列（插入 blank）上做动态规划，递推 α[t][s]，复杂度 O(T×S)。',
        tags: ['前向算法'],
      },
      {
        id: 'paper-training-c4-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现 CTC 折叠：ctc_collapse(path, blank=0)。\n\n规则：① 合并相邻重复 ② 删除 blank。\n注意顺序：先合并再删除（等价于遍历时判断 prev）。',
        starterCode: `def ctc_collapse(path, blank=0):
    result = []
    prev = None
    for p in path:
        if ___ and ___:
            result.append(p)
        prev = p
    return result
`,
        setupCode: '',
        expectedOutput: '折叠结果',
        tests: `# 标准情况
assert ctc_collapse([0,0,1,1,0,2,2,0]) == [1, 2]

# 无 blank
assert ctc_collapse([1,1,1,2,2,2]) == [1, 2]

# 相同字符被 blank 分隔 -> 应保留两个
assert ctc_collapse([0,1,0,1,0]) == [1, 1]

# 重复字符连续 -> 合并成一个
assert ctc_collapse([1,1,2,2,1,1]) == [1, 2, 1]

# 全 blank
assert ctc_collapse([0,0,0,0]) == []

# 空
assert ctc_collapse([]) == []
`,
        answer: `def ctc_collapse(path, blank=0):
    result = []
    prev = None
    for p in path:
        if p != prev and p != blank:
            result.append(p)
        prev = p
    return result
`,
        explanation:
          '**`p != prev and p != blank`** 两个条件：\n\n1. **`p != prev`**：合并相邻重复\n2. **`p != blank`**：删除 blank\n\n**为什么用 prev 而不是"先合并再删"**：\n一次遍历就够，等价于两步操作。\n\n**关键例子**：\n\n    [1, 1, 2, 2, 1, 1]  ->  [1, 2, 1]\n                          ↑\n                    最后的 1 保留（前面隔了 2）\n\n    [0, 1, 0, 1, 0]  ->  [1, 1]\n                        ↑\n                  blank 分隔，所以两个 1 都保留\n\n**这就是 blank 的核心作用**：让"重复字符"和"两个相同字符"可区分。',
        tags: ['编程', 'CTC 折叠'],
      },
      {
        id: 'paper-training-c4-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现 CTC 前向算法：ctc_forward(probs, target, blank=0)。\n\n- probs: (T, C) 每帧概率\n- target: 目标序列\n- 返回 P(target|input)\n\n扩展序列：- y1 - y2 - ... - yS -',
        starterCode: `import numpy as np

def ctc_forward(probs, target, blank=0):
    T, C = probs.shape
    S = len(target)

    # 构造扩展序列
    extended = []
    for y in target:
        extended.append(blank)
        extended.append(y)
    extended.append(blank)
    L = len(extended)

    alpha = np.zeros((T, L))
    alpha[0][0] = probs[0][extended[0]]
    if L > 1:
        alpha[0][1] = probs[0][extended[1]]

    for t in range(1, T):
        for s in range(L):
            val = alpha[t-1][s]
            if s >= 1:
                ___
            if s >= 2 and ___:
                ___
            alpha[t][s] = ___

    p = alpha[T-1][L-1]
    if L > 1:
        p += alpha[T-1][L-2]
    return p
`,
        setupCode: '',
        expectedOutput: 'P(target|input)',
        tests: `import numpy as np

# 构造确定性概率：每帧只输出一个字符
T, C = 4, 3
probs = np.zeros((T, C))
probs[0, 0] = 1.0   # blank
probs[1, 1] = 1.0   # a
probs[2, 1] = 1.0   # a
probs[3, 0] = 1.0   # blank

# target = [1]（一个 a）
p = ctc_forward(probs, [1], blank=0)
assert abs(p - 1.0) < 1e-6, f"应为 1.0，实际 {p}"

# 不可能的对齐 -> 概率 0
probs2 = np.zeros((4, 3))
probs2[:, 0] = 1.0   # 全是 blank
p2 = ctc_forward(probs2, [1], blank=0)
assert p2 < 1e-10, f"应接近 0，实际 {p2}"

# 概率在 [0,1]
np.random.seed(0)
probs3 = np.random.rand(6, 4)
probs3 = probs3 / probs3.sum(axis=1, keepdims=True)
p3 = ctc_forward(probs3, [1, 2], blank=0)
assert 0 <= p3 <= 1.0

# 概率都在 (0, 1]
p4 = ctc_forward(probs3, [1], blank=0)
p5 = ctc_forward(probs3, [1, 2, 3], blank=0)
assert 0 < p4 <= 1.0 and 0 < p5 <= 1.0, f"概率应在(0,1]: p4={p4}, p5={p5}"

# 空白序列（target=[]）的概率 = 所有帧都输出 blank 的概率
p_empty = ctc_forward(probs3, [], blank=0)
assert abs(p_empty - np.prod(probs3[:, 0])) < 1e-9, "空目标的概率应等于全blank概率"
`,
        answer: `import numpy as np

def ctc_forward(probs, target, blank=0):
    T, C = probs.shape
    S = len(target)

    extended = []
    for y in target:
        extended.append(blank)
        extended.append(y)
    extended.append(blank)
    L = len(extended)

    alpha = np.zeros((T, L))
    alpha[0][0] = probs[0][extended[0]]
    if L > 1:
        alpha[0][1] = probs[0][extended[1]]

    for t in range(1, T):
        for s in range(L):
            val = alpha[t-1][s]
            if s >= 1:
                val += alpha[t-1][s-1]
            if s >= 2 and extended[s] != blank and extended[s] != extended[s-2]:
                val += alpha[t-1][s-2]
            alpha[t][s] = val * probs[t][extended[s]]

    p = alpha[T-1][L-1]
    if L > 1:
        p += alpha[T-1][L-2]
    return p
`,
        explanation:
          '**三步递推**：\n\n    α[t][s] = (α[t-1][s] + α[t-1][s-1] + α[t-1][s-2]) × p(y_s|x_t)\n\n**三个来源的含义**：\n\n| 来源 | 含义 |\n| --- | --- |\n| `α[t-1][s]` | 上一帧已经在同一位置（重复该字符） |\n| `α[t-1][s-1]` | 上一帧在前一个位置（前进一格） |\n| `α[t-1][s-2]` | **跳过 blank**（只有在特定条件下） |\n\n**关键约束**：\n\n    extended[s] != blank  （当前不是 blank）\n    extended[s] != extended[s-2]  （不能跳过重复字符）\n\n**为什么第二个条件**：\n如果 `extended[s-2] == extended[s]`，跳过意味着把两个相同字符合并成一个，\n这与折叠规则矛盾。\n\n**终止**：最后两个位置（最后一个字符 或 最后的 blank）求和。',
        tags: ['编程', 'CTC 前向'],
      },
      {
        id: 'paper-training-c4-e7',
        type: 'code',
        difficulty: 3,
        question:
          '实现贪心解码：ctc_greedy_decode(log_probs, blank=0)。\n\n- log_probs: (T, C)\n- 每帧取 argmax，然后折叠',
        starterCode: `import numpy as np

def ctc_greedy_decode(log_probs, blank=0):
    path = ___
    result = []
    prev = None
    for p in path:
        if p != prev and p != blank:
            ___
        prev = p
    return result
`,
        setupCode: '',
        expectedOutput: '解码结果',
        tests: `import numpy as np

# 构造明确的 log 概率
T, C = 6, 3
log_probs = np.full((T, C), -10.0)
# 帧级: - a a - b -
log_probs[0, 0] = 0.0
log_probs[1, 1] = 0.0
log_probs[2, 1] = 0.0
log_probs[3, 0] = 0.0
log_probs[4, 2] = 0.0
log_probs[5, 0] = 0.0

result = ctc_greedy_decode(log_probs, blank=0)
assert result == [1, 2], f"应为 [1,2]，实际 {result}"

# 全 blank
lp2 = np.zeros((3, 2))
lp2[:, 0] = 0.0
lp2[:, 1] = -10.0
assert ctc_greedy_decode(lp2, 0) == []

# 重复字符被 blank 分隔
lp3 = np.full((4, 3), -10.0)
lp3[0, 1] = 0.0
lp3[1, 0] = 0.0
lp3[2, 1] = 0.0
lp3[3, 0] = 0.0
assert ctc_greedy_decode(lp3, 0) == [1, 1]
`,
        answer: `import numpy as np

def ctc_greedy_decode(log_probs, blank=0):
    path = np.argmax(log_probs, axis=-1)
    result = []
    prev = None
    for p in path:
        if p != prev and p != blank:
            result.append(int(p))
        prev = p
    return result
`,
        explanation:
          '**两步**：\n\n1. **`np.argmax(log_probs, axis=-1)`**：每帧取最可能的类别\n2. **折叠**：合并重复 + 删 blank\n\n**贪心解码的局限**：\n\n它只找"每帧单独最优"的路径，\n但**不保证整体最优**。\n\n**例子**：\n\n    帧1: a=0.4, blank=0.35, b=0.25\n    帧2: a=0.4, blank=0.35, b=0.25\n    帧3: a=0.4, blank=0.35, b=0.25\n\n贪心 -> a a a -> 折叠成 "a"\n但 "abc" 可能整体概率更高（如果各帧的 b 稍低但组合起来更好）\n\n**所以实际用 beam search**：\n保留 top-k 候选路径，最后选总概率最高的。\n\n**再进一步**：加语言模型（shallow fusion）。',
        tags: ['编程', '贪心解码'],
      },
      {
        id: 'paper-training-c4-e8',
        type: 'code',
        difficulty: 4,
        question:
          '用 PyTorch 实现 Deep Speech 2 的简化架构：\n\nDeepSpeech2(n_mels, n_classes)\n- 2 个卷积块（stride 2 下采样）\n- BiGRU\n- FC 输出',
        starterCode: `import torch
import torch.nn as nn

class DS2(nn.Module):
    def __init__(self, n_mels=80, n_classes=29, hidden=128):
        super().__init__()
        self.conv1 = nn.Sequential(
            nn.Conv2d(1, 32, 3, stride=2, padding=1),
            nn.BatchNorm2d(32), nn.ReLU(),
        )
        self.conv2 = nn.Sequential(
            nn.Conv2d(32, 32, 3, stride=2, padding=1),
            nn.BatchNorm2d(32), nn.ReLU(),
        )
        self.rnn = nn.GRU(32 * (n_mels // 4), hidden,
                          batch_first=True, bidirectional=True)
        self.fc = nn.Linear(hidden * 2, n_classes)

    def forward(self, x):
        # x: (B, 1, n_mels, T)
        x = self.conv1(x)
        x = ___
        B, C, F, T = x.shape
        x = ___
        x, _ = self.rnn(x)
        return ___
`,
        setupCode: '',
        expectedOutput: 'DS2 输出',
        tests: `import torch
import torch.nn as nn

model = DS2(n_mels=80, n_classes=29, hidden=64)
x = torch.randn(2, 1, 80, 200)
out = model(x)

assert out.ndim == 3, f"应为 3D，实际 {out.ndim}D"
assert out.shape[0] == 2
assert out.shape[2] == 29
# 时间步应下采样（200 -> 50）
assert out.shape[1] == 50, f"时间步应为 50，实际 {out.shape[1]}"

# 梯度
x2 = torch.randn(1, 1, 80, 100, requires_grad=True)
model(x2).sum().backward()
assert x2.grad is not None
`,
        answer: `import torch
import torch.nn as nn

class DS2(nn.Module):
    def __init__(self, n_mels=80, n_classes=29, hidden=128):
        super().__init__()
        self.conv1 = nn.Sequential(
            nn.Conv2d(1, 32, 3, stride=2, padding=1),
            nn.BatchNorm2d(32), nn.ReLU(),
        )
        self.conv2 = nn.Sequential(
            nn.Conv2d(32, 32, 3, stride=2, padding=1),
            nn.BatchNorm2d(32), nn.ReLU(),
        )
        self.rnn = nn.GRU(32 * (n_mels // 4), hidden,
                          batch_first=True, bidirectional=True)
        self.fc = nn.Linear(hidden * 2, n_classes)

    def forward(self, x):
        x = self.conv1(x)
        x = self.conv2(x)
        B, C, F, T = x.shape
        x = x.permute(0, 3, 1, 2).reshape(B, T, C * F)
        x, _ = self.rnn(x)
        return self.fc(x)
`,
        explanation:
          '**三个关键步骤**：\n\n**① 卷积下采样**：\n\n    输入 (B,1,80,T) -> conv1(stride2) -> (B,32,40,T/2)\n    -> conv2(stride2) -> (B,32,20,T/4)\n\n**② 转成序列**：\n\n    (B, C, F, T) -> permute(0,3,1,2) -> (B, T, C, F)\n    -> reshape -> (B, T, C*F)\n\n**关键**：把频率维度摊平到特征维度，时间维度作为序列长度。\n\n**③ RNN + FC**：\n\n    (B,T,C*F) -> BiGRU -> (B,T,2*hidden) -> FC -> (B,T,n_classes)\n\n**为什么用 BiGRU**：\n语音识别需要看上下文（前后音素互相影响）。\n\n**注意**：真实 DS2 用 3-7 层 BiGRU，这里简化成 1 层。',
        tags: ['编程', 'DS2 架构'],
      },
      {
        id: 'paper-training-c4-e9',
        type: 'judge',
        difficulty: 4,
        question: 'CTC 假设各帧的输出条件独立，因此它隐含地不考虑语言模型。',
        answer: true,
        explanation:
          'CTC 的 P(y|x) = Σ P(π|x)，而 P(π|x) = Π p(π_t|x_t)——每帧独立。这意味着它不建模字符间的语言依赖。所以实际解码需要额外加语言模型（beam search + LM）。',
        tags: ['CTC 局限'],
      },
      {
        id: 'paper-training-c4-e10',
        type: 'open',
        difficulty: 4,
        question:
          '请解释：① 传统语音识别流水线的问题；② CTC 如何解决对齐问题；③ 为什么需要 blank；④ 端到端相比流水线的优势与代价。',
        referenceAnswer: `**① 传统语音识别流水线的问题**

**流水线**：

    音频 → MFCC → 声学模型(GMM-HMM) → 发音词典 → 语言模型 → 文本

**四个模块独立训练**：

| 模块 | 问题 |
| --- | --- |
| **MFCC** | 手工设计，可能丢信息 |
| **声学模型** | 需要强制对齐（帧↔音素） |
| **发音词典** | 人工编写，覆盖有限 |
| **语言模型** | 单独训练，与声学模型脱节 |

**核心问题**：

**a) 误差累积**

    每个模块的误差传递到下一个
    上游错了，下游无法纠正

**b) 无法联合优化**

    每个模块的目标不同
    整体不是端到端最优

**c) 人工设计瓶颈**

    MFCC 的参数、音素集、词典
    都需要专家设计

---

**② CTC 如何解决对齐问题**

**问题**：

    输入：1000 帧音频
    输出：20 个字符
    对齐（哪几帧对应哪个字符）未知

**CTC 的做法**：

**a) 每帧输出一个分布**

    网络每帧输出 |字符集|+1 个概率
    （+1 是 blank）

**b) 定义折叠函数**

    B(π) = 合并相邻重复 + 删除 blank

**c) 对所有对齐求和**

    P(y|x) = Σ_{π: B(π)=y} P(π|x)

**关键**：**不需要对齐标签！**

只需要 (音频, 文本) 对，CTC 自动处理对齐。

**这就是"端到端"的核心**。

---

**③ 为什么需要 blank**

**作用 1：分隔相同字符**

**没有 blank 的问题**：

    "你好"  -> 你 你 好 好
    "你你"  -> 你 你
    折叠后都是 "你好"？无法区分！

**有 blank**：

    "你好"  -> 你 你 - 好 好
    "你你"  -> 你 - 你
    折叠后不同 ✓

**作用 2：表示"无输出"**

    静音段、过渡段 -> 输出 blank

**作用 3：使对齐可枚举**

    blank 让扩展序列成为"字符之间有空隙"
    这样前向算法才能递推

**类比**：
blank 就像"空格"——
没有空格，"helloworld" 无法分词。

---

**④ 端到端 vs 流水线**

**优势**：

| 方面 | 流水线 | 端到端 |
| --- | --- | --- |
| **人工设计** | 多（MFCC/音素/词典） | **少** |
| **优化** | 分模块 | **联合** |
| **误差累积** | 有 | **无** |
| **多语言** | 需重新设计 | **换字符集即可** |
| **数据扩展** | 受限于模块 | **直接受益** |

**DS2 的实证**：

| 语言 | 架构 |
| --- | --- |
| 英文 | 同一套 |
| 中文 | **同一套**（只换输出字符集） |

**代价**：

| 代价 | 说明 |
| --- | --- |
| **数据需求** | 数千小时标注语音 |
| **计算** | 训练成本高 |
| **解码** | CTC 需加语言模型 |
| **可解释性** | 中间过程不可见 |

**关键权衡**：

    传统方法：少数据也能工作（靠先验知识）
    端到端：需要大数据，但上限更高

**这就是为什么 2015 年后端到端成为主流**——
数据变多了。

---

**⑤ 与现代语音模型的关系**

**Whisper（2022）**：

    编码器-解码器 Transformer
    68 万小时弱监督数据
    多语言、多任务（转写/翻译/时间戳）

**与 DS2 的对比**：

| 方面 | DS2 | Whisper |
| --- | --- | --- |
| **架构** | Conv + BiGRU | Transformer |
| **对齐** | CTC | 注意力（无显式对齐） |
| **数据** | 数千小时 | 68 万小时（弱监督） |
| **任务** | 单任务 | 多任务 |

**共同点**：
- 端到端
- 频谱图输入
- 字符级输出

**演进逻辑**：

    2015 DS2：证明端到端可行（CTC）
    2017 LAS：注意力替代 CTC
    2020 RNN-T：流式端到端
    2022 Whisper：大规模弱监督

**每一步都在解决前一步的局限**：
- CTC → 注意力：去掉独立性假设
- 注意力 → RNN-T：支持流式
- RNN-T → Whisper：规模化

**一个诚实的说明**：

DS2 在 LibriSpeech 上 WER 5.3%，超过人类 5.8%——
但那是**特定测试集**。

在真实场景（噪声、口音、远场），
2016 年的 DS2 还很弱。

**Whisper 的意义**：
它在**真实多样化数据**上训练，
所以鲁棒性远超 DS2。

**这印证了一个规律**：
> 端到端的上限由数据决定。`,
        rubric: [
          { point: '流水线四模块 + 误差累积 + 无法联合优化', score: 3 },
          { point: 'CTC：每帧输出分布 + 折叠 + 对所有对齐求和', score: 2 },
          { point: 'blank 三作用：分隔重复、表示无输出、使对齐可枚举', score: 2 },
          { point: '端到端：少人工设计、联合优化、多语言通用；代价是数据需求', score: 2 },
          { point: '演进：DS2(CTC) → LAS(注意力) → RNN-T(流式) → Whisper(规模)', score: 1 },
        ],
        keywords: ['四模块误差累积', '折叠+求和', '分隔重复字符', '换字符集即可', '数据决定上限'],
        explanation:
          '能说清「blank 为什么能区分"你你"和"你好"」以及「端到端的代价是数据需求」，就是理解了 CTC 与端到端方法的本质。',
        tags: ['综合分析'],
      },
    ],
  },
];
