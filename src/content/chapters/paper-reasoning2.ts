import type { Chapter } from '../../types';

/* ============================================================
 *  人工智能基础 · 论文导读 · 记忆与推理
 *  18 Pointer Networks (Vinyals, Fortunato, Jaitly 2015)
 *  19 A Simple Neural Network Module for Relational Reasoning (Santoro et al. 2017)
 *
 *  来源：
 *  - arXiv:1506.03134 Pointer Networks
 *  - arXiv:1706.01427 Relational Reasoning
 *  - 参考：Ojhaharsh/30u30 第 18/19 篇（CC BY-NC-ND 4.0，本地个人使用）
 *  - 本课程为原创导读 + 原创习题
 *
 *  执行说明：本章代码需要 PyTorch，走本地后端执行。
 * ============================================================ */

export const paperReasoningChapters2: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c2: Pointer Networks
   * ============================================================ */
  {
    id: 'paper-reasoning-c2',
    title: '指针网络：输出是输入的位置',
    goal: '理解为什么传统 seq2seq 无法处理"输出是输入的子集/排列"，掌握指针机制如何用注意力权重直接当输出分布，能手写指针注意力。',
    lessons: [
      {
        id: 'paper-reasoning-c2-l1',
        title: '从"生成词"到"指向位置"',
        difficulty: 4,
        content: `
### 学习目标

学完本节，你应该能够：
1. 说清凸包/TSP/排序的输出为何是「输入位置的排列/子集」，以及固定词表 seq2seq 的两难（词表爆炸、位置对应关系学不到）；
2. 手推加性指针注意力 u_i=v^T tanh(W1 h_i + W2 s_t) 经 softmax 得到 n 维输出分布，说出它与标准注意力的唯一差别（不聚合、直接输出）；
3. 用 numpy 实现指针分布并完成贪心 TSP 演算，验证输出维度随输入长度自适应。

### 前置知识

- seq2seq 与注意力机制（编码器-解码器框架）；
- softmax 与 argmax 解码；
- c1 的软寻址直觉。

### 问题背景

凸包、TSP、排序这类问题的答案是「输入位置的排列/子集」：输出空间随输入长度变化，n=50 的 TSP 有 50! 种排列——固定词表的 seq2seq 从原理上就装不下。Pointer Networks 的洞察极其锋利：注意力权重本来就是「关注哪个输入」的分布，那就不做加权求和，直接把它当输出分布。于是输出维度=输入长度，n 变了分布跟着变，还能泛化到训练没见过的 n。抽取式问答预测答案起止位置、指代消解、摘要复制机制，都是这个思想的直系后代。

### 直觉理解

词表生成像「从字典里挑词」，指针像「用手指点名单」：答案不在字典里，而在到场名单（输入序列）上。解码器每一步举手提问「下一个该谁」，注意力对每个输入位置打分做 softmax，得分最高的位置被点名。n 增减只是名单变长变短，手指还是那根手指——这就是输出空间随输入自适应的含义。

### 核心概念与原理详解

## 论文信息

| 项目 | 内容 |
| --- | --- |
| **标题** | Pointer Networks |
| **作者** | Oriol Vinyals, Meir Fortunato, Navdeep Jaitly（Google Brain） |
| **发表** | NeurIPS 2015 |
| **arXiv** | [1506.03134](https://arxiv.org/abs/1506.03134) |
| **一句话贡献** | 用注意力权重直接作为输出分布，让网络输出"输入序列的位置"而非词表里的词 |

## 三类问题的困境

**问题 1：凸包（Convex Hull）**

    输入：平面上的 n 个点
    输出：构成凸包的点的**索引序列**

**问题 2：TSP（旅行商）**

    输入：n 个城市坐标
    输出：访问顺序（城市的**索引排列**）

**问题 3：排序**

    输入：n 个乱序数字
    输出：排序后的**索引序列**

**共同点**：**输出是输入位置的排列/子集**。

**输出空间大小**：

| 问题 | 输出空间 |
| --- | --- |
| 翻译（词表 10000） | 10000^T |
| **凸包（n=50）** | **2^50（子集）** |
| **TSP（n=50）** | **50!（排列）** |

**关键**：输出空间**随输入长度变化**，且巨大到无法枚举。

<PointerProblemDemo />

## 传统 seq2seq 为什么不行

**标准 seq2seq**：

    输出 = softmax(W·h_t)  →  从固定词表选一个词

**问题**：

| 问题 | 说明 |
| --- | --- |
| **词表固定** | 无法处理"输出第 17 个点"这种 |
| **词表爆炸** | 如果词表 = 所有位置，n 变化时要重建 |
| **无对应关系** | 学不到"输出指向输入哪个" |

**如果硬要用 seq2seq**：

    把位置当成词：词表 = {1, 2, 3, ..., n}
    n=50 时词表 50 个，还行
    但 n=100 时词表要 100 个，n=1000 时...

**而且**：模型要学"位置 17 对应输入的第 17 个元素"——
这个映射是任意的，很难学。

## 指针网络的核心思想

**关键洞察**：

> **注意力权重本身就是"指向哪个输入"的概率分布！**

**标准注意力**：

    α_i = softmax(score(s_t, h_i))     # 对输入位置的权重
    c_t = Σ α_i · h_i                  # 加权求和成上下文

**指针网络**：

    α_i = softmax(score(s_t, h_i))     # 完全一样
    **输出 = α**                        # 不求和，直接用 α 当输出！

**所以**：

    标准 seq2seq:  output = softmax(W·h)      # 词表分布
    指针网络:      output = attention_weights  # 输入位置分布

<PointerMechanismDemo />

**优势**：

| 方面 | seq2seq | Pointer Net |
| --- | --- | --- |
| 输出空间 | 固定词表 | **输入长度** |
| n 变化 | 需重建词表 | **自动适应** |
| 泛化 | 训练长度 | **可超出训练长度** |
| 可解释 | 无 | **直接看到指向哪** |

## 数学形式

**编码器**（同 seq2seq）：

    h_i = Encoder(x_i),  i = 1..n

**解码器**（第 t 步）：

    s_t = Decoder(s_{t-1}, y_{t-1})

**指针注意力**（论文的加性形式）：

    u_i = v^T · tanh(W_1·h_i + W_2·s_t)      # 打分
    p(C_t | C_1..C_{t-1}, P) = softmax(u)     # 输出分布

**注意**：\`softmax(u)\` 的维度是 **n（输入长度）**，不是词表大小！

**输出**：

    y_t = argmax_i  p_i     # 选概率最大的位置

**训练**：用交叉熵，标签是"正确的输入索引"。

## 论文的实验

### 任务 1：凸包

**输入**：n 个点的坐标（2n 个数）
**输出**：凸包顶点的索引序列（从最左点开始，逆时针）

**结果**：

| 方法 | n=5 | n=10 | n=50 |
| --- | --- | --- | --- |
| seq2seq | 好 | 差 | 失败 |
| **Pointer Net** | **好** | **好** | **好** |

**关键**：**Pointer Net 能泛化到训练时没见过的 n**。

### 任务 2：TSP

**输入**：n 个城市坐标
**输出**：访问顺序

**结果**：

| n | Pointer Net 的近似比 |
| --- | --- |
| 5 | 1.004（接近最优） |
| 10 | 1.011 |
| 50 | 1.036 |

**注意**：TSP 是 NP-hard，Pointer Net 给出近似解。

### 任务 3：排序

**输入**：n 个数字
**输出**：排序后的索引

**结果**：n=50 时准确率 > 99%。

## 训练技巧：beam search

**贪心解码的问题**：每步选最大的，可能陷入局部最优。

**beam search**：

    保留 top-k 个候选序列
    每步扩展，保留概率最高的 k 个

**论文发现**：beam search 对 TSP 提升明显（k=5 时接近最优）。

## 局限

| 局限 | 说明 |
| --- | --- |
| **需要监督** | 训练需要"正确答案"（最优解） |
| **NP-hard 问题** | 大 n 时仍不够好 |
| **串行解码** | 每步依赖上一步 |
| **无约束** | 不保证输出是合法排列（可能重复） |

**后续改进**：

| 工作 | 改进 |
| --- | --- |
| **Pointer-Generator** | 混合"生成词"和"复制输入" |
| **Copy Mechanism** | 摘要任务中复制原文 |
| **Transformer-TSP** | 用 Transformer + 强化学习 |
| **AlphaFold** | 用注意力预测残基对（本质是指针） |

## 与 Transformer 的关系

**共同点**：都用注意力权重。

**关键差异**：

| 维度 | Pointer Net | Transformer |
| --- | --- | --- |
| 注意力用途 | **直接当输出** | 中间表示 |
| 输出维度 | 输入长度 | 词表 |
| 结构 | RNN + 注意力 | 纯注意力 |

**Pointer Net 的思想在 Transformer 里也有**：
- 指代消解（coreference）：输出指向输入中的实体
- 抽取式问答：输出答案的起止位置（span）

**抽取式 QA 就是指针网络的直接应用**：
输出 = 起始位置 + 结束位置的索引。

## 本节来源

> **来源类型：学术来源**
> - Vinyals, O., Fortunato, M., Jaitly, N. *Pointer Networks*
>   arXiv:[1506.03134](https://arxiv.org/abs/1506.03134)（NeurIPS 2015）
> - See, A., Liu, P. J., Manning, C. D. *Get To The Point: Summarization with
>   Pointer-Generator Networks* arXiv:[1704.04368](https://arxiv.org/abs/1704.04368)
> - Bello, I. et al. *Neural Combinatorial Optimization with Reinforcement Learning*
>   arXiv:[1611.09940](https://arxiv.org/abs/1611.09940)
>
> **来源类型：参考资料（CC BY-NC-ND 4.0，本地个人使用）**
> - Ojhaharsh/30u30 第 18 篇（155 行，含 PointerAttention / PointerNetwork）
>
> **来源类型：原创**
> - 全部导读文字、交互图示、代码示例与习题

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
rng = np.random.default_rng(1)
n = 6
pts = rng.uniform(0, 10, (n, 2))
tour, cur, total = [0], 0, 0.0
while len(tour) < n:
    d2 = np.linalg.norm(pts - pts[cur], axis=1)      # 指针打分: 到当前城市距离
    score = np.where(np.isin(np.arange(n), tour), -np.inf, -d2)
    p = np.exp(score - score.max()); p /= p.sum()    # 指针分布(维度 n)
    nxt = int(p.argmax())
    total += d2[nxt]; tour.append(nxt); cur = nxt
total += np.linalg.norm(pts[tour[-1]] - pts[tour[0]])
print("指针路径:", tour, "| 总长:", round(total, 2))
print("指针分布维度 =", n, "(=输入长度, 与词表无关)")\`\`\`

预期输出（实测）：实测：6 城市指针路径 [0, 1, 2, 5, 3, 4]（每步取指针分布的 argmax 指向最近未访问城市），闭合总长 29.2；指针分布维度 = 6 = 输入长度，与词表无关；已访问城市打分置 -inf 后 softmax 自动把概率让给未访问者。

**常见错误**：softmax 前忘屏蔽已访问位置，路径出现重复城市（非法排列）；打分忘减 max 直接 exp，大 n 时数值溢出；误以为指针网络保证全局最优——它是贪心近似，TSP 大 n 还需 beam search 或强化学习。

### 常见误区

1. **指针网络输出「词」**——输出的是输入位置索引，分布维度是 n 不是词表大小；
2. **它保证输出是合法排列**——不保证，可能重复指向，需屏蔽已选位置或后处理；
3. **只用于组合优化**——抽取式 QA 的 span 预测、Pointer-Generator 摘要的复制门控都是它的日常形态。

### 知识关联

- **向前**：注意力机制（编码器-解码器）是其计算基座，c1 NTM 的内容寻址同源；
- **向后**：c6 Order Matters 处理「输入是无序集合」的另一半问题，两者的 Write 阶段可结合（输出指向输入位置）；
- **平行**：Transformer 抽取式 QA、Copy Mechanism、AlphaFold 的残基对注意力。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 矛盾 | 输出是输入位置的排列/子集，输出空间随 n 变化 |
| 机制 | softmax(注意力打分) 直接当输出分布，维度 = n |
| 优势 | n 自适应、可超训练长度泛化、指向可解释 |
| 手算锚点 | 6 城市 TSP 指针路径 [0,1,2,5,3,4]，总长 29.2 |
| 后代 | 抽取式 QA、Pointer-Generator、AlphaFold |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见论文原文：Vinyals, Fortunato & Jaitly, Pointer Networks, arXiv:1506.03134）
`,
        tips: [
          {
            kind: 'interview',
            text: '「指针网络的核心」：把注意力权重直接当输出分布（维度=输入长度），而不是再接一个固定词表的 softmax。这样输出可以是输入位置的任意排列/子集。',
          },
          {
            kind: 'leak',
            text: '「为什么 seq2seq 不行」：输出空间随输入长度变化（子集 2^n、排列 n!），固定词表无法表达，且"位置 17 对应第 17 个元素"这种映射很难学。',
          },
          {
            kind: 'pitfall',
            text: '指针网络不保证输出是合法排列——可能重复指向同一位置。实际应用需要加约束（如 mask 已选位置）或用 beam search。',
          },
        ],
        demos: [
          {
            title: '指针注意力实现（PyTorch）',
            lang: 'python',
            code: `import torch
import torch.nn as nn
import torch.nn.functional as F

class PointerAttention(nn.Module):
    """
    指针注意力（Bahdanau 风格的加性打分）。

    与普通注意力的区别：输出直接用权重，不做加权求和。
    """
    def __init__(self, hidden_dim):
        super().__init__()
        self.W_enc = nn.Linear(hidden_dim, hidden_dim, bias=False)
        self.W_dec = nn.Linear(hidden_dim, hidden_dim, bias=False)
        self.v = nn.Linear(hidden_dim, 1, bias=False)

    def forward(self, encoder_outputs, decoder_hidden, mask=None):
        """
        encoder_outputs: (B, n, H)   输入序列的编码
        decoder_hidden:  (B, H)      当前解码器状态
        mask:            (B, n)      已选位置（1=可选，0=已选）

        返回:
          probs: (B, n)  指向每个输入位置的概率
        """
        # 打分：(B, 1, H) + (B, n, H) -> (B, n, H) -> (B, n)
        energy = torch.tanh(
            self.W_enc(encoder_outputs) + self.W_dec(decoder_hidden).unsqueeze(1)
        )
        scores = self.v(energy).squeeze(-1)          # (B, n)

        # mask 已选位置
        if mask is not None:
            scores = scores.masked_fill(mask == 0, -1e9)

        # 直接用 softmax 当输出分布
        probs = F.softmax(scores, dim=-1)            # (B, n)
        return probs


print("=== 指针注意力的关键：输出维度 = 输入长度 ===")
torch.manual_seed(42)
B, n, H = 2, 7, 16
attn = PointerAttention(H)

enc = torch.randn(B, n, H)
dec = torch.randn(B, H)

probs = attn(enc, dec)
print(f"输入序列长度 n = {n}")
print(f"encoder 输出: {tuple(enc.shape)}")
print(f"输出概率分布: {tuple(probs.shape)}   <- 维度是 n，不是词表！")
print()
for b in range(B):
    print(f"  样本{b}: {[f'{p:.3f}' for p in probs[b].detach().numpy()]}")
    print(f"         指向位置 {probs[b].argmax().item()}")

print()
print("=== 对比普通注意力 ===")
print()
print("普通注意力:")
print("  context = Σ α_i · h_i     -> (B, H)  加权求和")
print("指针注意力:")
print("  output  = α              -> (B, n)  直接用权重当输出")
print()

print("=== mask 已选位置（避免重复）===")
print()
mask = torch.ones(B, n)
mask[0, 3] = 0    # 样本0 已选位置3
mask[1, 0] = 0    # 样本1 已选位置0

probs_masked = attn(enc, dec, mask=mask)
print("样本0（位置3已选）:")
print(f"  位置3 的概率: {probs_masked[0, 3].item():.6f}  <- 应为 0")
print(f"  其他位置之和: {probs_masked[0].sum().item() - probs_masked[0,3].item():.6f}")
print()
print("样本1（位置0已选）:")
print(f"  位置0 的概率: {probs_masked[1, 0].item():.6f}  <- 应为 0")

print()
print("=== 这就是为什么能保证输出是合法排列 ===")
print("每步 mask 掉已选位置 -> 强制选未选过的 -> 输出一定是排列")`,
          },
          {
            title: '完整指针网络：排序任务',
            lang: 'python',
            code: `import torch
import torch.nn as nn
import torch.nn.functional as F

class PointerNetwork(nn.Module):
    """指针网络（简化版：单层 GRU 编码器 + GRU 解码器）。"""
    def __init__(self, input_dim=1, hidden=64, max_len=20):
        super().__init__()
        self.hidden = hidden
        self.max_len = max_len

        # 编码器
        self.encoder_rnn = nn.GRU(input_dim, hidden, batch_first=True, bidirectional=True)
        self.enc_proj = nn.Linear(hidden * 2, hidden)

        # 解码器
        self.decoder_rnn = nn.GRU(hidden + 1, hidden, batch_first=True)

        # 指针注意力
        self.W_enc = nn.Linear(hidden, hidden, bias=False)
        self.W_dec = nn.Linear(hidden, hidden, bias=False)
        self.v = nn.Linear(hidden, 1, bias=False)

    def forward(self, x):
        """
        x: (B, n, 1)  输入数字序列
        返回: (B, n)  指向位置的 log 概率
        """
        B, n, _ = x.shape

        # 编码
        enc_out, enc_h = self.encoder_rnn(x)          # (B,n,2H), (2,B,H)
        enc_out = self.enc_proj(enc_out)              # (B,n,H)

        # 解码器初始状态
        dec_h = torch.tanh(enc_h[0] + enc_h[1]).unsqueeze(0)   # (1,B,H)
        dec_input = torch.zeros(B, 1, 1)              # 起始符号

        mask = torch.ones(B, n)
        outputs = []
        probs_all = []

        for t in range(n):
            dec_out, dec_h = self.decoder_rnn(dec_input, dec_h)   # (B,1,H)
            s = dec_out.squeeze(1)                                 # (B,H)

            # 指针打分
            energy = torch.tanh(self.W_enc(enc_out) + self.W_dec(s).unsqueeze(1))
            scores = self.v(energy).squeeze(-1)                    # (B,n)
            scores = scores.masked_fill(mask == 0, -1e9)
            probs = F.softmax(scores, dim=-1)                      # (B,n)

            outputs.append(probs)
            probs_all.append(probs)

            # 更新 mask（贪心选择）
            idx = probs.argmax(dim=-1)                             # (B,)
            mask = mask.scatter(1, idx.unsqueeze(1), 0)

            # 下一步输入：选中的元素的标量值
            chosen = torch.gather(x.squeeze(-1), 1, idx.unsqueeze(1))  # (B,1)
            dec_input = chosen.unsqueeze(-1)                        # (B,1,1)

        return torch.stack(outputs, 1), probs_all


def make_sorting_batch(batch_size, n):
    """生成排序任务：输入乱序数字，输出排序后的索引。"""
    x = torch.rand(batch_size, n, 1)
    target = torch.argsort(x.squeeze(-1), dim=-1)   # (B, n) 排序后的索引
    return x, target


print("=== 训练指针网络做排序 ===")
torch.manual_seed(42)
N = 8
model = PointerNetwork(input_dim=1, hidden=64)
optimizer = torch.optim.Adam(model.parameters(), lr=3e-3)

print(f"任务：给 {N} 个随机数，输出从小到大的索引")
print()

for epoch in range(1, 401):
    x, target = make_sorting_batch(32, N)
    log_probs, _ = model(x)

    loss = F.nll_loss(
        log_probs.reshape(-1, N),
        target.reshape(-1)
    )

    optimizer.zero_grad()
    loss.backward()
    torch.nn.utils.clip_grad_norm_(model.parameters(), 2.0)
    optimizer.step()

    if epoch % 100 == 0:
        with torch.no_grad():
            pred = log_probs.argmax(dim=-1)
            acc = (pred == target).float().mean().item()
            # 整序列全对的比例
            seq_acc = (pred == target).all(dim=-1).float().mean().item()
        print(f"epoch {epoch:>3}: loss={loss.item():.4f}, 逐位准确率={acc:.3f}, 整序列全对={seq_acc:.3f}")

print()
print("=== 泛化到更长序列 ===")
print()
for test_n in [8, 10, 12]:
    x, target = make_sorting_batch(20, test_n)
    with torch.no_grad():
        log_probs, _ = model(x)
        pred = log_probs.argmax(dim=-1)
        acc = (pred == target).float().mean().item()
        seq_acc = (pred == target).all(dim=-1).float().mean().item()
    print(f"n={test_n:>2}: 逐位={acc:.3f}, 整序列={seq_acc:.3f}")

print()
print("注意：模型只在 n=8 上训练，但能处理 n=10/12")
print("因为指针网络输出维度自动适应输入长度")`,
          },
          {
            title: '凸包任务：指针网络的经典应用',
            lang: 'python',
            code: `import numpy as np
import torch

def convex_hull_indices(points):
    """
    计算凸包（Andrew monotone chain）。

    points: (n, 2)
    返回: 凸包顶点的索引列表（逆时针）
    """
    n = len(points)
    idx = sorted(range(n), key=lambda i: (points[i][0], points[i][1]))

    def cross(o, a, b):
        return ((points[a][0] - points[o][0]) * (points[b][1] - points[o][1])
                - (points[a][1] - points[o][1]) * (points[b][0] - points[o][0]))

    lower = []
    for i in idx:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], i) <= 0:
            lower.pop()
        lower.append(i)

    upper = []
    for i in reversed(idx):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], i) <= 0:
            upper.pop()
        upper.append(i)

    return lower[:-1] + upper[:-1]


print("=== 凸包任务演示 ===")
print()
np.random.seed(42)
n = 12
points = np.random.rand(n, 2)
hull = convex_hull_indices(points)

print(f"输入 {n} 个点:")
for i, p in enumerate(points):
    mark = " <- 凸包" if i in hull else ""
    print(f"  点{i}: ({p[0]:.3f}, {p[1]:.3f}){mark}")

print()
print(f"凸包顶点索引: {hull}")
print(f"凸包顶点数: {len(hull)} / {n}")

print()
print("=== 指针网络要学什么 ===")
print()
print("输入: 2n 个数（每个点的 x, y）")
print("输出: 凸包顶点的索引序列")
print()
print("难点：")
print("  1. 输出长度不固定（取决于有多少点在凸包上）")
print("  2. 输出是输入的'子集'，不是固定词表")
print("  3. 需要几何推理（判断哪些点在凸包上）")
print()
print("指针网络的解法：")
print("  · 编码所有点")
print("  · 每步用指针注意力选一个点")
print("  · 输出 = 该点的索引")
print()
print("关键优势：")
print("  · 输出空间 = 输入点数（自动适应）")
print("  · 可以学到'几何关系'（哪些点在外围）")
print("  · 能泛化到不同 n")

print()
print("=== 用 numpy 模拟指针注意力的输出 ===")
print()
# 模拟：用"到中心的距离"作为打分（凸包点通常离中心远）
center = points.mean(axis=0)
dist = np.linalg.norm(points - center, axis=1)
probs = np.exp(dist * 3) / np.exp(dist * 3).sum()

print("模拟注意力权重（基于到中心的距离）:")
for i in range(n):
    mark = " <- 凸包" if i in hull else ""
    print(f"  点{i}: 距离={dist[i]:.3f}, 权重={probs[i]:.4f}{mark}")

print()
print("观察：凸包点的距离确实更大，权重更高")
print("真实网络学到的打分函数比这复杂得多，但直觉类似")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'paper-reasoning-c2-e1',
        relatedLessonId: 'paper-reasoning-c2-l1',
        type: 'single',
        difficulty: 2,
        question: '指针网络（Pointer Networks）的核心创新是？',
        options: [
          { value: 'A', text: '用更深的网络' },
          { value: 'B', text: '把注意力权重直接作为输出分布，输出输入序列的位置' },
          { value: 'C', text: '用强化学习训练' },
          { value: 'D', text: '增加词表大小' },
        ],
        answer: 'B',
        explanation:
          '标准 seq2seq 输出是固定词表的 softmax。指针网络直接用注意力权重（维度=输入长度）当输出——所以能输出"第 17 个点"这种位置索引，且输出空间自动适应输入长度。',
        tags: ['核心创新'],
      },
      {
        id: 'paper-reasoning-c2-e2',
        relatedLessonId: 'paper-reasoning-c2-l1',
        type: 'judge',
        difficulty: 2,
        question: '指针网络的输出维度是固定词表大小。',
        answer: false,
        explanation:
          '恰恰相反——输出维度等于**输入序列长度 n**，不是词表大小。这是它能处理变长输入（凸包、TSP）的关键。',
        tags: ['输出维度'],
      },
      {
        id: 'paper-reasoning-c2-e3',
        relatedLessonId: 'paper-reasoning-c2-l1',
        type: 'multiple',
        difficulty: 3,
        question: '指针网络适合哪些任务？（多选）',
        options: [
          { value: 'A', text: '凸包计算（输出点的索引序列）' },
          { value: 'B', text: 'TSP（输出城市的访问顺序）' },
          { value: 'C', text: '排序（输出排序后的索引）' },
          { value: 'D', text: '图像分类（输出类别）' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 不合适——图像分类输出是固定类别，用普通 softmax 即可，不需要"指向输入位置"。A/B/C 都是"输出是输入的排列/子集"。',
        tags: ['适用任务'],
      },
      {
        id: 'paper-reasoning-c2-e4',
        relatedLessonId: 'paper-reasoning-c2-l1',
        type: 'fill',
        difficulty: 3,
        question:
          '指针网络训练时，标签是"正确的输入 ___"，用交叉熵损失。',
        blanks: [['索引', '位置', 'index', '下标']],
        explanation:
          '标签是目标输出对应的输入位置索引（如凸包顶点在输入数组中的下标）。损失 = 交叉熵(预测分布, 正确索引)。这与普通 seq2seq 用词表 id 做标签是对应的。',
        tags: ['训练方式'],
      },
      {
        id: 'paper-reasoning-c2-e5',
        relatedLessonId: 'paper-reasoning-c2-l1',
        type: 'code',
        difficulty: 2,
        question:
          '实现指针注意力的打分：pointer_scores(enc, dec, W_enc, W_dec, v)。\n\n- enc: (n, H) 编码器输出\n- dec: (H,) 解码器状态\n- W_enc: (H, H), W_dec: (H, H), v: (H,)\n返回 (n,) 打分 u_i = v^T·tanh(W_enc·h_i + W_dec·s)',
        starterCode: `import numpy as np

def pointer_scores(enc, dec, W_enc, W_dec, v):
    proj_enc = ___
    proj_dec = ___
    energy = ___
    return ___
`,
        setupCode: '',
        expectedOutput: '指针打分',
        tests: `import numpy as np
np.random.seed(0)
n, H = 5, 4
enc = np.random.randn(n, H)
dec = np.random.randn(H)
W_enc = np.random.randn(H, H) * 0.5
W_dec = np.random.randn(H, H) * 0.5
v = np.random.randn(H) * 0.5

scores = pointer_scores(enc, dec, W_enc, W_dec, v)
assert scores.shape == (n,), f"形状错误: {scores.shape}"

# 验证公式
expected = np.array([v @ np.tanh(W_enc @ enc[i] + W_dec @ dec) for i in range(n)])
assert np.allclose(scores, expected), "公式错误"
`,
        answer: `import numpy as np

def pointer_scores(enc, dec, W_enc, W_dec, v):
    proj_enc = enc @ W_enc.T          # (n, H)
    proj_dec = W_dec @ dec            # (H,)
    energy = np.tanh(proj_enc + proj_dec)   # (n, H) 广播
    return energy @ v                  # (n,)
`,
        explanation:
          '**这就是 Bahdanau 加性打分**——指针网络用的就是它。\n\n**`enc @ W_enc.T`**：(n,H) @ (H,H) → (n,H)，批量投影。\n\n**`proj_dec`**：(H,)，广播到 (n,H)。\n\n**`energy @ v`**：(n,H) @ (H,) → (n,)，每个位置一个标量。\n\n**接下来**：`softmax(scores)` 就是"指向每个位置的概率"。\n\n**与普通注意力的唯一区别**：\n\n    普通：context = softmax(scores) @ enc    -> (H,)\n指针：output  = softmax(scores)          -> (n,)\n\n**不聚合，直接输出权重。**',
        tags: ['编程', '指针打分'],
      },
      {
        id: 'paper-reasoning-c2-e6',
        relatedLessonId: 'paper-reasoning-c2-l1',
        type: 'code',
        difficulty: 3,
        question:
          '实现带 mask 的指针分布：pointer_probs(scores, mask)。\n\n- scores: (n,)\n- mask: (n,)，1=可选，0=已选\n- 返回 (n,) 概率，已选位置概率为 0',
        starterCode: `import numpy as np

def pointer_probs(scores, mask):
    scores = np.asarray(scores, dtype=float)
    masked = ___
    exp_s = ___
    return ___
`,
        setupCode: '',
        expectedOutput: '指针分布',
        tests: `import numpy as np
# 无 mask
p = pointer_probs(np.array([1.0, 2.0, 3.0]), np.array([1, 1, 1]))
assert abs(p.sum() - 1.0) < 1e-9
assert p[2] > p[1] > p[0]

# mask 位置 2
p2 = pointer_probs(np.array([1.0, 2.0, 3.0]), np.array([1, 1, 0]))
assert p2[2] == 0.0, "mask 位置应为 0"
assert abs(p2.sum() - 1.0) < 1e-9

# 全 mask
p3 = pointer_probs(np.array([1.0, 2.0]), np.array([0, 0]))
assert not np.isnan(p3).any(), "不应产生 nan"

# 只剩一个可选
p4 = pointer_probs(np.array([1.0, 5.0, 2.0]), np.array([0, 1, 0]))
assert abs(p4[1] - 1.0) < 1e-6
`,
        answer: `import numpy as np

def pointer_probs(scores, mask):
    scores = np.asarray(scores, dtype=float)
    masked = np.where(mask == 1, scores, -1e9)
    exp_s = np.exp(masked - np.max(masked))
    return exp_s / exp_s.sum()
`,
        explanation:
          '**`np.where(mask == 1, scores, -1e9)`** 把已选位置的分数压到 -1e9。\n\n**softmax 后**：`exp(-1e9) ≈ 0`，所以已选位置概率为 0。\n\n**为什么用 -1e9 而非 -inf**：\n\n    如果所有位置都被 mask（-inf），softmax 会得 0/0 = nan\n-1e9 时 exp 仍是很小的正数，不会 nan\n\n**这就是保证"输出是合法排列"的关键**：\n\n每选一个位置就 mask 掉\n下一步只能从剩下的选\n最终一定是排列\n\n**注意**：全 mask 时结果虽然不 nan，但语义上无意义（说明没有可选位置了）。',
        tags: ['编程', 'mask'],
      },
      {
        id: 'paper-reasoning-c2-e7',
        relatedLessonId: 'paper-reasoning-c2-l1',
        type: 'code',
        difficulty: 3,
        question:
          '用 PyTorch 实现指针注意力的完整前向：\n\nPointerAttention(H).forward(enc, dec, mask) -> probs (B, n)',
        starterCode: `import torch
import torch.nn as nn
import torch.nn.functional as F

class PointerAttention(nn.Module):
    def __init__(self, hidden_dim):
        super().__init__()
        self.W_enc = nn.Linear(hidden_dim, hidden_dim, bias=False)
        self.W_dec = nn.Linear(hidden_dim, hidden_dim, bias=False)
        self.v = nn.Linear(hidden_dim, 1, bias=False)

    def forward(self, enc, dec, mask=None):
        energy = ___
        scores = ___
        if mask is not None:
            ___
        return ___
`,
        setupCode: '',
        expectedOutput: 'PointerAttention',
        tests: `import torch
import torch.nn as nn

torch.manual_seed(0)
B, n, H = 2, 6, 8
attn = PointerAttention(H)
enc = torch.randn(B, n, H)
dec = torch.randn(B, H)

probs = attn(enc, dec)
assert probs.shape == (B, n), f"形状错误: {probs.shape}"
assert torch.allclose(probs.sum(dim=-1), torch.ones(B), atol=1e-5)
assert (probs >= 0).all()

# mask
mask = torch.ones(B, n)
mask[0, 2] = 0
p2 = attn(enc, dec, mask=mask)
assert p2[0, 2].item() < 1e-6, "mask 位置应为 0"
assert torch.allclose(p2.sum(dim=-1), torch.ones(B), atol=1e-5)

# 梯度
probs.sum().backward()
assert attn.W_enc.weight.grad is not None
`,
        answer: `import torch
import torch.nn as nn
import torch.nn.functional as F

class PointerAttention(nn.Module):
    def __init__(self, hidden_dim):
        super().__init__()
        self.W_enc = nn.Linear(hidden_dim, hidden_dim, bias=False)
        self.W_dec = nn.Linear(hidden_dim, hidden_dim, bias=False)
        self.v = nn.Linear(hidden_dim, 1, bias=False)

    def forward(self, enc, dec, mask=None):
        energy = torch.tanh(self.W_enc(enc) + self.W_dec(dec).unsqueeze(1))
        scores = self.v(energy).squeeze(-1)
        if mask is not None:
            scores = scores.masked_fill(mask == 0, -1e9)
        return F.softmax(scores, dim=-1)
`,
        explanation:
          '**四个关键点**：\n\n1. **`unsqueeze(1)`**：(B,H) → (B,1,H) 以便广播\n2. **`self.v(energy).squeeze(-1)`**：(B,n,H) → (B,n,1) → (B,n)\n3. **`masked_fill(mask==0, -1e9)`**：屏蔽已选\n4. **`F.softmax(dim=-1)`**：沿位置维度归一化\n\n**注意 `dim=-1`**：必须沿输入长度维度，不是 batch 维度。\n\n**为什么这个模块能 work**：\n\n它把"选哪个位置"变成"在 n 个位置上做分类"\n而 n 是动态的——所以能泛化到不同输入长度',
        tags: ['编程', 'PointerAttention'],
      },
      {
        id: 'paper-reasoning-c2-e8',
        relatedLessonId: 'paper-reasoning-c2-l1',
        type: 'code',
        difficulty: 4,
        question:
          '实现排序任务的贪心解码：greedy_sort_indices(values)。\n\n- values: (n,) 数字\n- 返回 (n,) 索引，按值从小到大排列\n\n不用 np.argsort，用"反复找最小值 + mask"模拟指针网络解码。',
        starterCode: `import numpy as np

def greedy_sort_indices(values):
    values = np.asarray(values, dtype=float)
    n = len(values)
    mask = np.ones(n)
    result = []
    for _ in range(n):
        masked = ___
        idx = ___
        result.append(idx)
        ___
    return np.array(result)
`,
        setupCode: '',
        expectedOutput: '排序索引',
        tests: `import numpy as np
# 基本排序
idx = greedy_sort_indices(np.array([3.0, 1.0, 2.0]))
assert list(idx) == [1, 2, 0], f"实际 {idx}"

# 已排序
idx2 = greedy_sort_indices(np.array([1.0, 2.0, 3.0]))
assert list(idx2) == [0, 1, 2]

# 逆序
idx3 = greedy_sort_indices(np.array([5.0, 4.0, 3.0, 2.0, 1.0]))
assert list(idx3) == [4, 3, 2, 1, 0]

# 与 argsort 一致
np.random.seed(0)
v = np.random.randn(10)
assert list(greedy_sort_indices(v)) == list(np.argsort(v))

# 不修改原数组
v2 = np.array([3.0, 1.0])
_ = greedy_sort_indices(v2)
assert np.allclose(v2, [3.0, 1.0])
`,
        answer: `import numpy as np

def greedy_sort_indices(values):
    values = np.asarray(values, dtype=float)
    n = len(values)
    mask = np.ones(n)
    result = []
    for _ in range(n):
        masked = np.where(mask == 1, values, np.inf)
        idx = int(np.argmin(masked))
        result.append(idx)
        mask[idx] = 0
    return np.array(result)
`,
        explanation:
          '**这就是指针网络的贪心解码过程**：\n\n1. 用 mask 屏蔽已选位置\n2. 在剩下的位置里找最"优"的（这里是最小值）\n3. 选中后 mask 掉\n4. 重复 n 次\n\n**`np.where(mask==1, values, np.inf)`**：已选的变成 inf，不会被 argmin 选中。\n\n**与真实指针网络的区别**：\n\n    这里：用真实值找最小（手工规则）\n指针网络：用学到的打分函数\n\n**但流程完全一样**——这就是为什么指针网络能学排序。\n\n**注意**：必须 mask 已选，否则会重复选同一个位置。',
        tags: ['编程', '贪心解码'],
      },
      {
        id: 'paper-reasoning-c2-e9',
        relatedLessonId: 'paper-reasoning-c2-l1',
        type: 'judge',
        difficulty: 4,
        question: '指针网络保证输出的索引序列是合法的排列（不重复、不遗漏）。',
        answer: false,
        explanation:
          '不保证。不加约束时可能重复指向同一位置。实践中需要 mask 已选位置（或用 beam search + 合法性检查）。论文的原始版本在 TSP 上就用了 beam search。',
        tags: ['合法性'],
      },
      {
        id: 'paper-reasoning-c2-e10',
        relatedLessonId: 'paper-reasoning-c2-l1',
        type: 'open',
        difficulty: 4,
        question:
          '请解释：① 为什么 seq2seq 无法处理凸包/TSP；② 指针网络如何用注意力解决；③ 如何保证输出是合法排列；④ 指针思想在现代模型中的体现。',
        referenceAnswer: `**① 为什么 seq2seq 无法处理凸包/TSP**

**问题特征**：

| 任务 | 输入 | 输出 |
| --- | --- | --- |
| 凸包 | n 个点 | 凸包顶点的**索引子集** |
| TSP | n 个城市 | 访问顺序（**索引排列**） |
| 排序 | n 个数 | 排序后的**索引** |

**输出空间**：

    凸包：2^n（所有子集）
    TSP：n!（所有排列）
    排序：n!

**随 n 指数增长**，且 n 是变化的。

**seq2seq 的三个问题**：

**a) 固定词表**

    output = softmax(W·h)   # 词表大小固定

无法表达"输出第 17 个点"（除非把位置当词，但 n 变化时要重建词表）。

**b) 输出空间无法枚举**

n=50 时 TSP 有 50! ≈ 3e64 种排列，不可能为每种分配一个词。

**c) 学不到对应关系**

"位置 17 对应输入第 17 个元素"这个映射是**任意的**——
seq2seq 需要从数据中学到"输出 17 意味着指向输入 17"，很难。

---

**② 指针网络如何用注意力解决**

**核心洞察**：

> **注意力权重本身就是"指向哪个输入"的概率分布。**

**标准注意力**（用于上下文）：

    α = softmax(score(s, h))    # (n,)
    c = Σ α_i · h_i             # (H,)  加权求和

**指针网络**：

    α = softmax(score(s, h))    # (n,)
    **output = α**               # 直接当输出！

**数学形式**：

    u_i = v^T · tanh(W_1·h_i + W_2·s_t)
    p(位置 = i) = softmax(u)_i

**关键**：

| 方面 | seq2seq | Pointer Net |
| --- | --- | --- |
| 输出维度 | 词表大小 | **输入长度 n** |
| n 变化 | 需重建 | **自动适应** |
| 位置语义 | 需学习 | **天然对应** |

**为什么"天然对应"**：
注意力的第 i 个分量就对应输入的第 i 个元素——
不需要学任何映射。

---

**③ 如何保证输出是合法排列**

**问题**：不加约束时可能重复选同一位置。

**解法 1：mask 已选位置**

    mask = ones(n)
    for t in range(n):
        scores = pointer_scores(enc, dec)
        scores = scores.masked_fill(mask == 0, -1e9)   # 屏蔽已选
        probs = softmax(scores)
        idx = argmax(probs)
        mask[idx] = 0                                   # 标记已选
        dec = update(dec, x[idx])

**效果**：每步只能从剩下的选 → 保证是排列。

**解法 2：beam search**

保留 top-k 候选序列，每步扩展。
配合 mask 可以避免重复。

**解法 3：后处理**

允许重复，最后做合法性修正（如匈牙利算法）。

**论文的做法**：
- 训练时用 teacher forcing（给定正确前缀）
- 推理时用贪心或 beam search

**注意**：mask 是**推理时**的约束。
训练时如果也用 mask，可能导致 exposure bias（训练/推理不一致）。

---

**④ 指针思想在现代模型中的体现**

**a) 抽取式问答（Extractive QA）**

    输入：问题 + 段落
    输出：答案在段落中的起始位置 + 结束位置

**这就是指针网络**：

    start_logits = W_s · h_i     # 每个位置的起始概率
    end_logits   = W_e · h_i     # 每个位置的结束概率

**BERT 的 SQuAD 微调就是这样做的**——
输出维度是段落长度，不是词表。

**b) 指代消解（Coreference Resolution）**

    输入：文档
    输出：每个代词指向哪个实体（索引）

**e2e-coref（Lee et al. 2017）** 用指针网络选先行词。

**c) 摘要中的 Copy Mechanism**

**Pointer-Generator**（See et al. 2017）：

    P(w) = p_gen · P_vocab(w) + (1-p_gen) · Σ_{i: w_i=w} α_i

- \`p_gen\`：生成概率（学出来的）
- \`P_vocab\`：从词表生成
- \`α_i\`：从输入复制（指针）

**这解决了 OOV 问题**（未登录词可以复制原文）。

**d) 关系抽取**

给定实体对，预测关系类型——
可以用指针指向"关系的证据位置"。

**e) 代码生成**

输出"复制哪个变量名"——指针思想。

**f) 检索增强（RAG）**

严格说不是指针网络，但思想相似：
**输出依赖"指向哪个检索文档"**。

---

**⑤ 一个更深的理解**

**指针网络揭示了一件事**：

> **"生成"和"选择"是两种不同的输出方式。**

| 方式 | 输出空间 | 例子 |
| --- | --- | --- |
| **生成** | 固定词表 | 翻译、写作 |
| **选择/指向** | 输入位置 | 凸包、QA、排序 |

**大多数实际任务需要混合两者**：
- 摘要：既要生成新词，也要复制原文
- 对话：既要生成回复，也要引用用户说的内容

**Pointer-Generator 就是这个混合的经典实现。**

**所以指针网络的价值不只是"解决组合优化"**——
它提出了"输出可以是输入的子集"这个通用模式，
后来被广泛借鉴。

**一个技术史的角度**：

    2015 Pointer Networks      -> 输出 = 输入位置
    2016 Copy Mechanism        -> 混合生成与复制
    2017 Pointer-Generator     -> 摘要中的经典应用
    2017 Transformer           -> 注意力成为通用组件
    2018 BERT-SQuAD            -> 抽取式 QA 用指针
    2023+ RAG                  -> 检索 + 生成
    
**指针思想的本质**：
> 让模型能"引用"输入，而不是只能"重新生成"。`,
        rubric: [
          { point: 'seq2seq 三问题：固定词表、输出空间爆炸、映射难学', score: 3 },
          { point: '指针 = 注意力权重直接当输出（维度 n 而非词表）', score: 2 },
          { point: 'mask 已选位置保证合法排列 + beam search', score: 2 },
          { point: '现代应用：抽取式 QA、指代消解、Pointer-Generator', score: 2 },
          { point: '洞察：生成 vs 选择两种输出方式，实际任务需混合', score: 1 },
        ],
        keywords: ['注意力当输出', '维度=n', 'mask 已选', '抽取式QA', '生成vs选择'],
        explanation:
          '能说清「注意力权重直接当输出，所以维度自动等于输入长度」以及「BERT 抽取式 QA 就是指针网络」，就是真正理解了指针思想。',
        tags: ['综合分析'],
      },
    ],
  },
];
