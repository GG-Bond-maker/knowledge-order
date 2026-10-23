import type { Chapter } from '../../types';

/* ============================================================
 *  人工智能基础 · 论文导读 · 记忆与推理
 *  20 Relational Recurrent Neural Networks
 *
 *  来源：
 *  - 论文：Santoro et al. (2018) arXiv:1806.01822
 *  - 参考：Ojhaharsh/30u30 第 20 篇（CC BY-NC-ND 4.0，本地个人使用）
 *  - 本课程为原创导读 + 原创习题
 *
 *  执行说明：本章代码需要 PyTorch，走本地后端执行。
 * ============================================================ */

export const paperReasoningChapters4: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c4: Relational RNNs
   * ============================================================ */
  {
    id: 'paper-reasoning-c4',
    title: '关系记忆：让 RNN 的记忆槽之间互相交流',
    goal: '理解 LSTM 记忆"无交互"的局限，掌握关系记忆核心（RMC）用多头自注意力让记忆槽交互，能手写 RelationalMemory 并验证。',
    lessons: [
      {
        id: 'paper-reasoning-c4-l1',
        title: 'LSTM 记忆的孤立性问题',
        difficulty: 4,
        content: `
## 论文信息

| 项目 | 内容 |
| --- | --- |
| **标题** | Relational recurrent neural networks |
| **作者** | Adam Santoro, Ryan Faulkner, David Raposo, Jack Rae, Mike Chrzanowski, Theophane Weber, Daan Wierstra, Oriol Vinyals, Razvan Pascanu, Timothy Lillicrap（DeepMind） |
| **发表** | NeurIPS 2018 |
| **arXiv** | [1806.01822](https://arxiv.org/abs/1806.01822) |
| **一句话贡献** | 把 LSTM 的"孤立记忆"换成"互相交流的记忆槽"，用多头自注意力实现 |

## LSTM 记忆的问题

**LSTM 的记忆是"扁平"的**：

    c_t ∈ R^H    （单个向量，H 维）

**问题**：**维度之间没有显式交互**。

**例子**：假设记忆要表示 3 个实体的状态：

    c = [实体1_位置, 实体1_速度, 实体2_位置, 实体2_速度, 实体3_位置, ...]

**问题**：

| 问题 | 说明 |
| --- | --- |
| **无结构** | 维度只是"槽位"，不知道哪个属于哪个实体 |
| **无交互** | 实体1 和实体2 的关系无法显式建模 |
| **难扩展** | 增加实体就要加维度，且要重新学 |
| **干扰** | 更新实体1 可能影响实体2 的表示 |

<LSTMMemoryLimitDemo />

**类比**：

    LSTM 的记忆 = 一排便利贴（各自独立，只能整体读写）
    关系记忆 = 一张白板（所有信息可以互相引用）

## 关系记忆核心（RMC）

**核心改动**：把记忆从"向量"变成"矩阵"。

    LSTM:  c_t ∈ R^H                    （1 个向量）
    RMC:   M_t ∈ R^{N_slots × W}        （N 个槽位，每个 W 维）

**关键**：**槽位之间用多头自注意力互相交流**。

<RMCArchDemo />

**一步更新的流程**：

**① 输入注入**

    M_in = [M_{t-1} ; x_t]      # 每行拼接投影后的输入

**具体**：

    x_proj = W_x · x_t          # (W,)
    M_in[i] = concat(M_{t-1}[i], x_proj)   # 每行变成 2W 维

**② 多头自注意力**

    M_att = MultiHeadAttention(M_in)

**这是核心**：每个槽位 attend 所有槽位（包括自己）。

**③ 残差 + LayerNorm**

    M_out = LayerNorm(M_att + M_{t-1})

**④ 前馈 + 残差 + LayerNorm**

    M_t = LayerNorm(FFN(M_out) + M_out)

**这就是一个 Transformer 层的结构**，但作用于记忆矩阵。

## 为什么"多头"很重要

**多头让不同的槽位关注不同方面**：

| 头 | 可能学到的 |
| --- | --- |
| 头 1 | 相邻槽位的关系 |
| 头 2 | 相同类型实体的关系 |
| 头 3 | 因果关系 |
| 头 4 | 时间先后 |

**单头 vs 多头**（论文的消融）：

| 配置 | 任务表现 |
| --- | --- |
| 单头 | 较差 |
| **多头（4 个）** | **最好** |
| 8 头 | 略好但更慢 |

<MultiHeadMemoryDemo />

## 论文的实验

### 任务 1：程序化任务（需要追踪多个实体）

**例**：追踪多个球的位置（有遮挡）。

**为什么难**：
- 需要同时记住多个物体的位置
- 需要处理"这个物体被遮挡了，它应该还在原处"
- LSTM 容易"忘记"某个物体

**结果**：

| 模型 | 准确率 |
| --- | --- |
| LSTM | 60~70% |
| **RMC** | **95%+** |

### 任务 2：强化学习（需要记忆与推理）

**环境**：需要记住之前的观察才能做决策。

**结果**：RMC 比 LSTM 学得更快、表现更好。

### 任务 3：语言建模

**结果**：RMC 略好于 LSTM，但优势不大。

**为什么**：
- 语言建模的"关系"不那么显式
- Transformer 更适合（可以直接看全序列）

## 与 Transformer 的关系

**RMC 本质上是"RNN + Transformer 层"**：

    for t in range(T):
        M = TransformerLayer(M, x_t)     # 每步用 Transformer 更新记忆

**对比**：

| 维度 | RMC | Transformer |
| --- | --- | --- |
| **处理方式** | 逐时间步（RNN） | 全序列并行 |
| **记忆** | 固定 N 个槽位 | 全部 token 的表示 |
| **长序列** | ✅ 线性复杂度 | ❌ O(T²) |
| **短期记忆** | 显式（矩阵） | 隐式（注意力） |

**RMC 的价值**：

> **在长序列场景下，用固定大小的记忆矩阵代替"全部历史"**。
> 复杂度 O(T·N²) 而非 O(T²)，N 是固定的小数。

**这就是后来"线性注意力""状态空间模型"的思路**。

## 局限

| 局限 | 说明 |
| --- | --- |
| **槽位数固定** | N 要预先设定，太小学不够，太大浪费 |
| **复杂** | 比 LSTM 多很多参数和计算 |
| **被 Transformer 取代** | 大多数任务上 Transformer 更好 |
| **训练难** | 需要仔细调参 |

**论文的诚实**：
RMC 在"需要追踪多个实体"的任务上优势明显，
但在一般任务上不如直接用 Transformer。

## 与现代架构的联系

| 现代技术 | 与 RMC 的关系 |
| --- | --- |
| **Transformer-XL** | 用"记忆"缓存历史（类似 RMC 的槽位） |
| **Compressive Transformer** | 压缩旧记忆 |
| **Memorizing Transformers** | 用外部记忆存长上下文 |
| **状态空间模型（Mamba）** | 固定大小的隐状态 |
| **RWKV** | 线性注意力的 RNN 形式 |

**核心问题相同**：

> **如何在固定计算/内存预算下，保留尽可能多的历史信息？**

**RMC 是一个早期的重要尝试。**

## 本节来源

> **来源类型：学术来源**
> - Santoro, A. et al. *Relational recurrent neural networks*
>   arXiv:[1806.01822](https://arxiv.org/abs/1806.01822)（NeurIPS 2018）
> - Santoro, A. et al. *A Simple Neural Network Module for Relational Reasoning*
>   arXiv:[1706.01427](https://arxiv.org/abs/1706.01427)（RN，前作）
> - Dai, Z. et al. *Transformer-XL: Attentive Language Models Beyond a Fixed-Length Context*
>   arXiv:[1901.02860](https://arxiv.org/abs/1901.02860)（记忆机制）
>
> **来源类型：参考资料（CC BY-NC-ND 4.0，本地个人使用）**
> - Ojhaharsh/30u30 第 20 篇（218 行，含 RelationalMemory / RelationalRNN / StandardLSTM）
>
> **来源类型：原创**
> - 全部导读文字、交互图示、代码示例与习题
`,
        tips: [
          {
            kind: 'interview',
            text: '「RMC 的核心改动」：把 LSTM 的单向量记忆 c∈R^H 换成矩阵 M∈R^{N×W}，每步用多头自注意力让槽位互相交流。本质是"RNN + Transformer 层"。',
          },
          {
            kind: 'leak',
            text: '「为什么多头重要」：不同头关注不同关系（相邻、同类、因果、时序）。论文消融显示 4 头最好，单头明显较差。',
          },
          {
            kind: 'pitfall',
            text: 'RMC 的优势场景是"需要追踪多个实体"的任务（如遮挡下的物体追踪）。一般任务上不如 Transformer——它主要解决长序列的复杂度问题（O(T·N²) vs O(T²)）。',
          },
        ],
        demos: [
          {
            title: '关系记忆核心实现（PyTorch）',
            lang: 'python',
            code: `import torch
import torch.nn as nn
import math

class MultiHeadAttention(nn.Module):
    """多头自注意力（用于记忆槽之间交流）。"""
    def __init__(self, mem_size, num_heads):
        super().__init__()
        assert mem_size % num_heads == 0
        self.num_heads = num_heads
        self.head_dim = mem_size // num_heads
        self.q_proj = nn.Linear(mem_size, mem_size)
        self.k_proj = nn.Linear(mem_size, mem_size)
        self.v_proj = nn.Linear(mem_size, mem_size)
        self.out_proj = nn.Linear(mem_size, mem_size)

    def forward(self, x):
        B, N, D = x.shape
        H = self.num_heads
        d = self.head_dim

        q = self.q_proj(x).view(B, N, H, d).transpose(1, 2)   # (B,H,N,d)
        k = self.k_proj(x).view(B, N, H, d).transpose(1, 2)
        v = self.v_proj(x).view(B, N, H, d).transpose(1, 2)

        scores = torch.matmul(q, k.transpose(-2, -1)) / math.sqrt(d)
        attn = torch.softmax(scores, dim=-1)
        out = torch.matmul(attn, v)                            # (B,H,N,d)
        out = out.transpose(1, 2).contiguous().view(B, N, D)
        return self.out_proj(out), attn


class RelationalMemory(nn.Module):
    """
    关系记忆核心（RMC）。

    M_t = LayerNorm(FFN(LayerNorm(Attn(M_in) + M_{t-1})) + ...)
    其中 M_in = [M_{t-1} ; x_proj]
    """
    def __init__(self, mem_slots, mem_size, input_size, num_heads=4):
        super().__init__()
        self.mem_slots = mem_slots
        self.mem_size = mem_size

        # 输入投影
        self.input_proj = nn.Linear(input_size, mem_size)

        # 注意力（输入是 [M; x] 拼接，所以维度 2*mem_size）
        self.attn_qkv_dim = mem_size
        self.attn = MultiHeadAttention(mem_size, num_heads)

        # 门控（控制新信息与旧记忆的混合）
        self.gate = nn.Linear(2 * mem_size, mem_size)

        # 前馈
        self.ffn = nn.Sequential(
            nn.Linear(mem_size, mem_size * 2),
            nn.ReLU(),
            nn.Linear(mem_size * 2, mem_size),
        )
        self.ln1 = nn.LayerNorm(mem_size)
        self.ln2 = nn.LayerNorm(mem_size)

    def init_memory(self, batch_size, device):
        return torch.randn(batch_size, self.mem_slots, self.mem_size, device=device) * 0.1

    def forward(self, x, memory):
        """
        x: (B, input_size)      当前输入
        memory: (B, N, W)       上一步记忆
        返回: (B, N, W) 新记忆
        """
        B = x.shape[0]

        # ① 输入投影并拼接到每个槽位
        x_proj = self.input_proj(x)                              # (B, W)
        x_tiled = x_proj.unsqueeze(1).expand(B, self.mem_slots, self.mem_size)

        # ② 注意力：让槽位互相交流
        attn_out, attn_weights = self.attn(memory)               # (B,N,W)

        # ③ 门控混合（新信息 vs 旧记忆）
        gate_input = torch.cat([memory, x_tiled], dim=-1)        # (B,N,2W)
        gate = torch.sigmoid(self.gate(gate_input))              # (B,N,W)
        mixed = gate * attn_out + (1 - gate) * x_tiled

        # ④ 残差 + LayerNorm
        h = self.ln1(mixed + memory)

        # ⑤ 前馈 + 残差 + LayerNorm
        out = self.ln2(self.ffn(h) + h)

        return out, attn_weights


print("=== 关系记忆前向 ===")
torch.manual_seed(42)
B, N, W, D = 2, 6, 16, 8
rm = RelationalMemory(N, W, D, num_heads=4)

memory = rm.init_memory(B, 'cpu')
x = torch.randn(B, D)

new_memory, attn = rm(x, memory)

print(f"输入 x: {tuple(x.shape)}")
print(f"记忆槽位数 N: {N}, 每槽维度 W: {W}")
print(f"旧记忆: {tuple(memory.shape)}")
print(f"新记忆: {tuple(new_memory.shape)}")
print(f"注意力权重: {tuple(attn.shape)}  (B, heads, N, N)")

print()
print("=== 关键：记忆槽之间互相交流 ===")
print()
print("注意力矩阵（头0，样本0）:")
for i in range(N):
    row = " ".join(f"{v:.2f}" for v in attn[0, 0, i].detach().numpy())
    print(f"  槽位{i}: [{row}]")
print()
print("每行和为 1 -> 每个槽位对所有槽位（含自己）分配注意力")
print("这就是'关系'：槽位之间显式交互")

print()
print("=== 对比 LSTM：无交互 ===")
print()
print("LSTM: c_t = f_t * c_{t-1} + i_t * g_t")
print("  -> 每个维度独立更新，维度间无显式交互")
print("RMC:  M_t = Attention(M_{t-1}) 后更新")
print("  -> 每个槽位都能看到所有其他槽位")

print()
print("=== 参数量 ===")
total = sum(p.numel() for p in rm.parameters())
print(f"RMC 参数量: {total:,}")
print()
lstm = nn.LSTM(D, N * W, batch_first=True)
n_lstm = sum(p.numel() for p in lstm.parameters())
print(f"同容量 LSTM 参数量: {n_lstm:,}")
print(f"RMC / LSTM = {total / n_lstm:.2f}x")`,
          },
          {
            title: 'RMC vs LSTM：多实体追踪任务',
            lang: 'python',
            code: `import torch
import torch.nn as nn
import math

class SimpleRMC(nn.Module):
    def __init__(self, mem_slots, mem_size, input_size, num_heads=4):
        super().__init__()
        self.N = mem_slots
        self.W = mem_size
        self.input_proj = nn.Linear(input_size, mem_size)
        self.q = nn.Linear(mem_size, mem_size)
        self.k = nn.Linear(mem_size, mem_size)
        self.v = nn.Linear(mem_size, mem_size)
        self.out = nn.Linear(mem_size, mem_size)
        self.num_heads = num_heads
        self.head_dim = mem_size // num_heads
        self.gate = nn.Linear(2 * mem_size, mem_size)
        self.ffn = nn.Sequential(nn.Linear(mem_size, mem_size*2), nn.ReLU(),
                                 nn.Linear(mem_size*2, mem_size))
        self.ln1 = nn.LayerNorm(mem_size)
        self.ln2 = nn.LayerNorm(mem_size)

    def init_memory(self, B, device):
        return torch.randn(B, self.N, self.W, device=device) * 0.1

    def forward(self, x, memory):
        B = x.shape[0]
        xp = self.input_proj(x)
        xt = xp.unsqueeze(1).expand(B, self.N, self.W)

        # attention
        H, d = self.num_heads, self.head_dim
        q = self.q(memory).view(B, self.N, H, d).transpose(1, 2)
        k = self.k(memory).view(B, self.N, H, d).transpose(1, 2)
        v = self.v(memory).view(B, self.N, H, d).transpose(1, 2)
        scores = torch.matmul(q, k.transpose(-2, -1)) / math.sqrt(d)
        attn = torch.softmax(scores, dim=-1)
        a = torch.matmul(attn, v).transpose(1, 2).contiguous().view(B, self.N, self.W)
        a = self.out(a)

        g = torch.sigmoid(self.gate(torch.cat([memory, xt], dim=-1)))
        mixed = g * a + (1 - g) * xt
        h = self.ln1(mixed + memory)
        return self.ln2(self.ffn(h) + h)


class StandardLSTM(nn.Module):
    def __init__(self, input_size, hidden_size):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, batch_first=True)

    def forward(self, x, hidden):
        out, hidden = self.lstm(x.unsqueeze(1), hidden)
        return out.squeeze(1), hidden


def make_tracking_task(batch_size, n_steps=20, n_entities=4, dim=4, seed=None):
    """
    多实体追踪任务：
    - n_entities 个实体，每个有 dim 维位置
    - 每步随机移动
    - 随机遮挡某些实体（输入为 0）
    - 任务：预测被遮挡实体的位置
    """
    if seed is not None:
        torch.manual_seed(seed)

    positions = torch.randn(batch_size, n_entities, dim)
    inputs = []
    targets = []

    for t in range(n_steps):
        # 移动
        positions = positions + torch.randn_like(positions) * 0.1

        # 随机遮挡
        mask = (torch.rand(batch_size, n_entities) > 0.3).float()
        masked_pos = positions * mask.unsqueeze(-1)

        inputs.append(masked_pos.reshape(batch_size, -1))
        targets.append(positions.clone())

    return torch.stack(inputs, 1), torch.stack(targets, 1), mask


print("=== 多实体追踪任务 ===")
torch.manual_seed(0)
N_ENT = 4
DIM = 4
INPUT = N_ENT * DIM

rmc = SimpleRMC(mem_slots=8, mem_size=32, input_size=INPUT, num_heads=4)
lstm = StandardLSTM(INPUT, hidden_size=8 * 32)

print(f"实体数: {N_ENT}, 每实体维度: {DIM}")
print(f"输入维度: {INPUT}")
print(f"RMC 记忆: 8 槽 × 32 维 = {8*32} 维")
print(f"LSTM 隐藏: {8*32} 维（同容量）")
print()

# 简单对比参数量
n_rmc = sum(p.numel() for p in rmc.parameters())
n_lstm = sum(p.numel() for p in lstm.parameters())
print(f"RMC 参数: {n_rmc:,}")
print(f"LSTM 参数: {n_lstm:,}")
print()

print("=== 单步前向对比 ===")
x, targets, _ = make_tracking_task(4, 5, N_ENT, DIM, seed=1)

# RMC
mem = rmc.init_memory(4, 'cpu')
for t in range(3):
    mem = rmc(x[:, t], mem)
print(f"RMC 记忆形状: {tuple(mem.shape)}")

# LSTM
h = (torch.zeros(1, 4, 8*32), torch.zeros(1, 4, 8*32))
out, h = lstm(x[:, 0], h)
print(f"LSTM 隐藏形状: {tuple(out.shape)}")
print()
print("=== 关键差异 ===")
print()
print("LSTM: 隐藏状态是扁平向量，维度间无显式结构")
print("RMC:  记忆是 8×32 矩阵，槽位之间用注意力交流")
print()
print("在'多实体追踪'任务上：")
print("  · 每个实体可以对应一个/几个槽位")
print("  · 槽位间注意力建模'实体间关系'")
print("  · 遮挡时可以'从其他槽位推断'")
print("  -> 这就是 RMC 的优势来源")`,
          },
          {
            title: '注意力模式分析',
            lang: "python",
            code: `import torch
import torch.nn as nn
import math
import numpy as np

class MultiHeadAttention(nn.Module):
    def __init__(self, mem_size, num_heads):
        super().__init__()
        self.num_heads = num_heads
        self.head_dim = mem_size // num_heads
        self.q_proj = nn.Linear(mem_size, mem_size)
        self.k_proj = nn.Linear(mem_size, mem_size)
        self.v_proj = nn.Linear(mem_size, mem_size)
        self.out_proj = nn.Linear(mem_size, mem_size)

    def forward(self, x):
        B, N, D = x.shape
        H, d = self.num_heads, self.head_dim
        q = self.q_proj(x).view(B, N, H, d).transpose(1, 2)
        k = self.k_proj(x).view(B, N, H, d).transpose(1, 2)
        v = self.v_proj(x).view(B, N, H, d).transpose(1, 2)
        scores = torch.matmul(q, k.transpose(-2, -1)) / math.sqrt(d)
        attn = torch.softmax(scores, dim=-1)
        out = torch.matmul(attn, v).transpose(1, 2).contiguous().view(B, N, D)
        return self.out_proj(out), attn


print("=== 多头注意力的模式差异 ===")
torch.manual_seed(42)
N, D, H = 8, 32, 4
attn = MultiHeadAttention(D, H)

# 构造有结构的记忆：前4个槽位相似，后4个相似
memory = torch.randn(1, N, D)
memory[0, 1] = memory[0, 0] + torch.randn(D) * 0.1
memory[0, 2] = memory[0, 0] + torch.randn(D) * 0.1
memory[0, 5] = memory[0, 4] + torch.randn(D) * 0.1

_, weights = attn(memory)
print(f"注意力权重形状: {tuple(weights.shape)}  (B, H, N, N)")
print()

for h in range(H):
    w = weights[0, h]
    # 每个头的"聚焦度"
    max_w = w.max(dim=-1).values.mean().item()
    entropy = -(w * torch.log(w + 1e-10)).sum(dim=-1).mean().item()
    print(f"头 {h}: 平均最大权重={max_w:.3f}, 平均熵={entropy:.3f}")

print()
print("=== 头0 的注意力矩阵 ===")
w0 = weights[0, 0].detach().numpy()
print("      " + " ".join(f"{i:>5}" for i in range(N)))
for i in range(N):
    print(f"槽{i}: " + " ".join(f"{v:>5.2f}" for v in w0[i]))

print()
print("=== 头1 的注意力矩阵 ===")
w1 = weights[0, 1].detach().numpy()
print("      " + " ".join(f"{i:>5}" for i in range(N)))
for i in range(N):
    print(f"槽{i}: " + " ".join(f"{v:>5.2f}" for v in w1[i]))

print()
print("=== 关键观察 ===")
print()
print("不同头的注意力模式不同：")
print("  · 有的头关注'相邻槽位'（局部）")
print("  · 有的头关注'相似槽位'（内容）")
print("  · 有的头关注'全局'（平均分配）")
print()
print("这就是为什么多头有效：")
print("  单个头只能学一种关系")
print("  多个头并行学多种关系")
print()
print("论文消融实验：")
print("  1 头: 较差")
print("  4 头: 最好")
print("  8 头: 略好但更慢")

print()
print("=== 熵的含义 ===")
print()
print("熵低 = 注意力集中（'我知道该看谁'）")
print("熵高 = 注意力分散（'大家平均看'）")
print()
print("最优：不同头有不同的熵（有的聚焦、有的全局）")
print("这样既能看到细节，又能看到全局")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'paper-reasoning-c4-e1',
        type: 'single',
        difficulty: 2,
        question: 'Relational RNN（RMC）相比 LSTM 的核心改动是？',
        options: [
          { value: 'A', text: '用更深的网络' },
          { value: 'B', text: '把记忆从单向量换成矩阵，用多头自注意力让槽位互相交流' },
          { value: 'C', text: '用卷积替代循环' },
          { value: 'D', text: '增加隐藏层维度' },
        ],
        answer: 'B',
        explanation:
          'LSTM 的 c∈R^H 是扁平向量，维度间无显式交互。RMC 用 M∈R^{N×W}，每步用多头自注意力让所有槽位互相 attend——本质是"RNN + Transformer 层"。',
        tags: ['核心改动'],
      },
      {
        id: 'paper-reasoning-c4-e2',
        type: 'judge',
        difficulty: 2,
        question: 'RMC 在每个时间步都用自注意力更新记忆矩阵。',
        answer: true,
        explanation:
          '每个时间步：① 输入投影并拼接到每个槽位；② 多头自注意力让槽位交流；③ 门控混合；④ 残差+LayerNorm；⑤ 前馈+残差+LayerNorm。这就是一个 Transformer 层的结构。',
        tags: ['更新机制'],
      },
      {
        id: 'paper-reasoning-c4-e3',
        type: 'multiple',
        difficulty: 3,
        question: 'RMC 适合哪些场景？（多选）',
        options: [
          { value: 'A', text: '需要追踪多个实体的任务（如遮挡下的物体追踪）' },
          { value: 'B', text: '需要长序列但内存有限（O(T·N²) vs Transformer 的 O(T²)）' },
          { value: 'C', text: '需要实体间关系推理的任务' },
          { value: 'D', text: '任何任务上都优于 Transformer' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误——一般任务上 Transformer 更好（可以看全序列）。RMC 的优势在"长序列 + 需要实体关系"的场景。',
        tags: ['适用场景'],
      },
      {
        id: 'paper-reasoning-c4-e4',
        type: 'fill',
        difficulty: 3,
        question:
          'RMC 用 ___ 自注意力让记忆槽之间互相交流，不同的头可以学到不同的关系。',
        blanks: [['多头', 'multi-head', 'multihead']],
        explanation:
          '多头让不同的槽位关注不同方面：有的头关注相邻槽位，有的关注相似内容，有的关注全局。论文消融显示 4 头最好，单头明显较差。',
        tags: ['多头'],
      },
      {
        id: 'paper-reasoning-c4-e5',
        type: 'code',
        difficulty: 2,
        question:
          '计算多头注意力的分头维度：head_dim(mem_size, num_heads)。\n\n要求 mem_size 能被 num_heads 整除。',
        starterCode: `def head_dim(mem_size, num_heads):
    assert mem_size % num_heads == 0, "mem_size 必须能被 num_heads 整除"
    return ___
`,
        setupCode: '',
        expectedOutput: '分头维度',
        tests: `assert head_dim(32, 4) == 8
assert head_dim(64, 8) == 8
assert head_dim(128, 4) == 32
assert head_dim(16, 1) == 16

# 不整除应报错
try:
    head_dim(10, 3)
    assert False, "应报错"
except AssertionError as e:
    if "整除" not in str(e):
        raise
`,
        answer: `def head_dim(mem_size, num_heads):
    assert mem_size % num_heads == 0, "mem_size 必须能被 num_heads 整除"
    return mem_size // num_heads
`,
        explanation:
          '**`mem_size // num_heads`**：把总维度均分给每个头。\n\n**为什么必须整除**：\n\n    总维度 = num_heads × head_dim\n    不能整除就无法均分\n\n**例**：mem_size=32, heads=4 → head_dim=8。\n\n**注意**：分头不改变总维度——4 个头各 8 维，合并后还是 32 维。\n这与 Transformer 的多头注意力完全一致。',
        tags: ['编程', '分头'],
      },
      {
        id: 'paper-reasoning-c4-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现记忆初始化：init_memory(batch_size, mem_slots, mem_size, scale=0.1, seed=None)。\n\n返回 (batch_size, mem_slots, mem_size) 的小随机张量。',
        starterCode: `import numpy as np

def init_memory(batch_size, mem_slots, mem_size, scale=0.1, seed=None):
    rng = np.random.default_rng(seed)
    return ___
`,
        setupCode: '',
        expectedOutput: '初始记忆',
        tests: `import numpy as np
m = init_memory(2, 6, 16, seed=0)
assert m.shape == (2, 6, 16)

# 数值应较小
assert np.abs(m).max() < 0.5, f"初始化值应较小: {np.abs(m).max()}"

# 标准差接近 scale
assert 0.05 < m.std() < 0.15, f"标准差应接近0.1: {m.std()}"

# 确定性
m2 = init_memory(2, 6, 16, seed=0)
assert np.allclose(m, m2)

# 不同 seed 不同
m3 = init_memory(2, 6, 16, seed=1)
assert not np.allclose(m, m3)
`,
        answer: `import numpy as np

def init_memory(batch_size, mem_slots, mem_size, scale=0.1, seed=None):
    rng = np.random.default_rng(seed)
    return rng.normal(0, scale, (batch_size, mem_slots, mem_size))
`,
        explanation:
          '**`rng.normal(0, scale, shape)`**：均值 0、标准差 scale 的正态分布。\n\n**为什么用小 scale（0.1）**：\n\n    初始记忆太大 -> 注意力分数差异过大 -> softmax 饱和\n    初始记忆太小 -> 所有槽位相似 -> 注意力均匀，学不到区分\n\n**0.1 是个经验值**：既能让槽位有区分度，又不会让 softmax 饱和。\n\n**对比 Transformer 的初始化**：\nTransformer 的 embedding 通常也用较小的初始化（如 N(0, 0.02)）。\n\n**注意**：实际实现中通常用 `nn.Parameter` 让记忆可学习，\n或每次 forward 时初始化（如论文的做法）。',
        tags: ['编程', '初始化'],
      },
      {
        id: 'paper-reasoning-c4-e7',
        type: 'code',
        difficulty: 4,
        question:
          '实现 RMC 的一步更新（numpy 示意版）：\n\nrmc_step(memory, x_proj, attn_out, gate) -> new_memory\n\n- memory: (N, W)\n- x_proj: (W,)  投影后的输入\n- attn_out: (N, W)  注意力输出\n- gate: (N, W)  门控值 in [0,1]\n\n流程：mixed = gate*attn + (1-gate)*x_tiled; h = ln(mixed + memory)',
        starterCode: `import numpy as np

def rmc_step(memory, x_proj, attn_out, gate):
    N, W = memory.shape
    x_tiled = ___
    mixed = ___
    h = ___
    # 简化 LayerNorm
    mean = h.mean(axis=-1, keepdims=True)
    std = h.std(axis=-1, keepdims=True)
    return (h - mean) / (std + 1e-5)
`,
        setupCode: '',
        expectedOutput: 'RMC 单步',
        tests: `import numpy as np
np.random.seed(0)
N, W = 4, 8
memory = np.random.randn(N, W)
x_proj = np.random.randn(W)
attn_out = np.random.randn(N, W)
gate = np.random.rand(N, W)

out = rmc_step(memory, x_proj, attn_out, gate)
assert out.shape == (N, W), f"形状错误: {out.shape}"

# LayerNorm 后每行均值≈0，标准差≈1
assert np.allclose(out.mean(axis=-1), 0, atol=1e-5)
assert np.allclose(out.std(axis=-1), 1, atol=1e-2)

# 验证公式
x_tiled = np.tile(x_proj, (N, 1))
mixed = gate * attn_out + (1 - gate) * x_tiled
h = mixed + memory
expected = (h - h.mean(-1, keepdims=True)) / (h.std(-1, keepdims=True) + 1e-5)
assert np.allclose(out, expected)
`,
        answer: `import numpy as np

def rmc_step(memory, x_proj, attn_out, gate):
    N, W = memory.shape
    x_tiled = np.tile(x_proj, (N, 1))
    mixed = gate * attn_out + (1 - gate) * x_tiled
    h = mixed + memory
    mean = h.mean(axis=-1, keepdims=True)
    std = h.std(axis=-1, keepdims=True)
    return (h - mean) / (std + 1e-5)
`,
        explanation:
          '**三个关键操作**：\n\n**① `np.tile(x_proj, (N, 1))`**：把输入复制到每个槽位。\n\n**② 门控混合**：\n\n    mixed = gate * attn_out + (1 - gate) * x_tiled\n\n- gate≈1：用注意力结果（槽位交流）\n- gate≈0：用新输入（覆盖）\n\n**③ 残差 + LayerNorm**：\n\n    h = mixed + memory      # 残差\n    out = LN(h)             # 归一化\n\n**注意 LayerNorm 沿最后一维**（每个槽位内部归一化），\n不是跨槽位——这与 Transformer 一致。\n\n**完整的 RMC 还有前馈层**，这里简化了。',
        tags: ['编程', 'RMC 单步'],
      },
      {
        id: 'paper-reasoning-c4-e8',
        type: 'code',
        difficulty: 4,
        question:
          '分析注意力模式：analyze_attention(weights)。\n\n- weights: (num_heads, N, N) numpy 数组\n- 返回 dict：{entropies, focus, head_similarity}\n  - entropies: 每个头的平均熵\n- focus: 每个头的平均最大权重\n- head_similarity: 头之间的平均相似度（衡量多样性）',
        starterCode: `import numpy as np

def analyze_attention(weights):
    weights = np.asarray(weights, dtype=float)
    H, N, _ = weights.shape

    entropies = []
    focus = []
    for h in range(H):
        w = weights[h]
        entropies.append(___)   # 平均熵
        focus.append(___)       # 平均最大权重

    # 头之间的相似度（用矩阵的余弦相似度）
    head_similarity = ___

    return {
        "entropies": np.array(entropies),
        "focus": np.array(focus),
        "head_similarity": head_similarity,
    }
`,
        setupCode: '',
        expectedOutput: '注意力分析',
        tests: `import numpy as np

# 4 个头，每个都是完美对角（完全聚焦）
W = np.zeros((4, 5, 5))
for h in range(4):
    for i in range(5):
        W[h, i, i] = 1.0

r = analyze_attention(W)
assert len(r["entropies"]) == 4
assert len(r["focus"]) == 4
assert np.allclose(r["focus"], 1.0)
assert np.all(r["entropies"] < 0.01), f"对角熵应接近0: {r['entropies']}"
# 所有头相同 -> 相似度接近 1
assert r["head_similarity"] > 0.99, f"相同的头相似度应高: {r['head_similarity']}"

# 均匀注意力
W2 = np.ones((2, 4, 4)) / 4
r2 = analyze_attention(W2)
assert np.allclose(r2["focus"], 0.25)
assert np.all(r2["entropies"] > 1.9), f"均匀分布熵应大: {r2['entropies']}"

# 不同的头
W3 = np.zeros((2, 4, 4))
for i in range(4):
    W3[0, i, i] = 1.0        # 头0 对角
W3[1] = np.ones((4, 4)) / 4  # 头1 均匀
r3 = analyze_attention(W3)
assert r3["head_similarity"] < 0.9, f"不同的头相似度应低: {r3['head_similarity']}"
`,
        answer: `import numpy as np

def analyze_attention(weights):
    weights = np.asarray(weights, dtype=float)
    H, N, _ = weights.shape

    entropies = []
    focus = []
    for h in range(H):
        w = weights[h]
        ent = -(w * np.log2(w + 1e-10)).sum(axis=-1).mean()
        entropies.append(ent)
        focus.append(w.max(axis=-1).mean())

    # 头之间的相似度：把每个头的注意力矩阵展平后算余弦
    flat = weights.reshape(H, -1)
    norms = np.linalg.norm(flat, axis=-1, keepdims=True) + 1e-10
    flat_n = flat / norms
    sim_matrix = flat_n @ flat_n.T
    # 取上三角的平均（不含对角线）
    iu = np.triu_indices(H, k=1)
    head_similarity = float(sim_matrix[iu].mean()) if len(iu[0]) > 0 else 1.0

    return {
        "entropies": np.array(entropies),
        "focus": np.array(focus),
        "head_similarity": head_similarity,
    }
`,
        explanation:
          '**三个指标的物理含义**：\n\n**① entropies（熵）**：\n\n    低 = 注意力集中（知道该看谁）\n高 = 注意力分散（平均看）\n均匀分布时熵 = log2(N)\n\n**② focus（聚焦度）**：\n\n    平均最大权重\n对角矩阵 = 1.0（完全聚焦）\n均匀矩阵 = 1/N\n\n**③ head_similarity（头多样性）**：\n\n    高 = 所有头学到的模式相似（冗余）\n低 = 头之间有分工（好）\n\n**论文的发现**：\n训练好的 RMC 中，不同头的熵差异明显——\n有的聚焦（低熵），有的全局（高熵），这就是"分工"。\n\n**如果所有头都一样**：说明多头没起作用，应该减少头数。',
        tags: ['编程', '注意力分析'],
      },
      {
        id: 'paper-reasoning-c4-e9',
        type: 'judge',
        difficulty: 4,
        question: 'RMC 在所有任务上都优于 LSTM 和 Transformer。',
        answer: false,
        explanation:
          '不是。RMC 在"需要追踪多个实体"的任务上优势明显（如遮挡物体追踪 95% vs LSTM 60-70%），在长序列场景有复杂度优势（O(T·N²) vs O(T²)）。但一般任务上 Transformer 更好，语言建模上 RMC 只是略好于 LSTM。',
        tags: ['局限性'],
      },
      {
        id: 'paper-reasoning-c4-e10',
        type: 'open',
        difficulty: 4,
        question:
          '请解释：① LSTM 记忆的孤立性问题；② RMC 如何用注意力解决；③ 多头的作用与消融结果；④ RMC 与 Transformer/现代架构的关系。',
        referenceAnswer: `**① LSTM 记忆的孤立性问题**

**LSTM 的记忆**：

    c_t ∈ R^H    （单个 H 维向量）

**问题：维度之间没有显式交互。**

**具体例子**：追踪 3 个物体

    c = [物1_x, 物1_y, 物2_x, 物2_y, 物3_x, 物3_y]

**问题**：

| 问题 | 说明 |
| --- | --- |
| **无结构** | 维度只是槽位，不知道哪个属于哪个物体 |
| **无交互** | 物1 和物2 的关系无法显式建模 |
| **干扰** | 更新物1 可能影响物2 的表示 |
| **难扩展** | 加物体就要加维度并重新学 |

**更新方式**：

    c_t = f_t ⊙ c_{t-1} + i_t ⊙ g_t

**每个维度独立更新**——\`f_t\` 是逐元素的，维度间不交流。

**类比**：

    LSTM 记忆 = 一排便利贴（各自独立）
    需要的是 = 一张白板（可以互相引用）

---

**② RMC 如何用注意力解决**

**核心改动**：记忆从向量变矩阵。

    LSTM: c_t ∈ R^H
    RMC:  M_t ∈ R^{N_slots × W}

**每个槽位可以"专门"记一个实体**。

**一步更新的四步**：

**① 输入注入**

    x_proj = W_x · x_t
    M_in[i] = concat(M_{t-1}[i], x_proj)

**② 多头自注意力**

    M_att = MultiHeadAttention(M_in)

**这是核心**：每个槽位 attend 所有槽位（含自己）。

**③ 门控混合**

    gate = σ(W_g · [M_{t-1}, x_tiled])
    mixed = gate ⊙ M_att + (1-gate) ⊙ x_tiled

**④ 残差 + LayerNorm + FFN**

    h = LayerNorm(mixed + M_{t-1})
    M_t = LayerNorm(FFN(h) + h)

**本质**：**每个时间步应用一个 Transformer 层**。

**为什么这解决了孤立性**：

    槽位 i 的输出 = Σ_j α_ij · V_j
    包含了所有其他槽位的信息

所以：
- 物1 的槽位可以看到物2 的槽位
- 可以建模"物1 在物2 左边"这种关系
- 遮挡时可以从其他槽位推断

---

**③ 多头的作用与消融**

**多头让不同槽位关注不同方面**：

| 头 | 可能学到的 |
| --- | --- |
| 头 1 | 相邻槽位（局部关系） |
| 头 2 | 相似内容（同类实体） |
| 头 3 | 因果关系 |
| 头 4 | 全局（平均） |

**消融实验**（论文）：

| 头数 | 表现 |
| --- | --- |
| 1 | 明显较差 |
| **4** | **最好** |
| 8 | 略好但更慢 |

**为什么 1 头不行**：

单个头只能学一种相似度度量。
需要同时建模多种关系时，单头不够。

**为什么 8 头没有更好**：

- 记忆槽位只有 N 个（如 8~16）
- 头太多会导致每个头的维度太小（head_dim = mem_size/8）
- 表达能力反而下降

**经验法则**：heads ≈ sqrt(mem_slots) 或固定 4。

---

**④ RMC 与 Transformer/现代架构的关系**

**RMC ≈ RNN + Transformer 层**

    for t in range(T):
        M = TransformerLayer(M, x_t)

**与 Transformer 的对比**：

| 维度 | RMC | Transformer |
| --- | --- | --- |
| **处理方式** | 逐时间步 | 全序列并行 |
| **记忆** | 固定 N 槽位 | 全部 token |
| **复杂度** | O(T·N²) | O(T²) |
| **长序列** | ✅ 优势 | ❌ 瓶颈 |
| **训练** | 慢（串行） | 快（并行） |

**RMC 的价值**：

> **用固定大小的记忆矩阵，压缩任意长的历史。**

**这是"线性复杂度"路线的早期尝试。**

**与现代架构的联系**：

| 架构 | 与 RMC 的关系 |
| --- | --- |
| **Transformer-XL** | 用"记忆"缓存前一段的 KV（类似 RMC 槽位） |
| **Compressive Transformer** | 压缩旧记忆成更少的槽位 |
| **Memorizing Transformers** | 外部记忆库 |
| **状态空间模型（S4/Mamba）** | 固定大小的隐状态，线性复杂度 |
| **RWKV** | 线性注意力的 RNN 形式 |

**核心问题相同**：

> **如何在固定内存/计算预算下，保留尽可能多的历史？**

**RMC 的答案是**：固定 N 个槽位 + 注意力交流。

**现代架构的答案**：
- Transformer-XL：缓存 KV
- Mamba：选择性状态空间
- RWKV：线性注意力递推

**都是同一个问题的不同解法。**

---

**⑤ 一个诚实的评价**

**RMC 的历史地位**：

| 方面 | 评价 |
| --- | --- |
| **思想** | 有价值——"记忆要有结构" |
| **效果** | 特定任务好，一般任务不如 Transformer |
| **影响** | 中等——不如 RN 或 Transformer 影响大 |
| **现状** | 被 Transformer 变体取代 |

**为什么没有成为主流**：

1. **串行**：逐时间步，无法并行（训练慢）
2. **复杂**：比 LSTM 多很多参数
3. **Transformer 更强**：并行 + 效果好

**但它的洞察仍然有效**：

> **记忆不应该是一个扁平的向量，应该有结构、能交互。**

这个洞察在：
- 图神经网络（节点间消息传递）
- 记忆增强网络
- 状态空间模型

中都得到了体现。

**一个方法论的启示**：

> 不是所有"好想法"都会成为主流。
> 但好的想法会被吸收到后来的工作中。

**RMC 的"结构化记忆"思想，今天活在各种 memory-augmented 模型里。**`,
        rubric: [
          { point: 'LSTM 记忆孤立：扁平向量、维度无交互、干扰、难扩展', score: 3 },
          { point: 'RMC：矩阵记忆 + 多头自注意力 + 门控 + 残差/LN', score: 2 },
          { point: '多头消融：1 头差、4 头最好、8 头过拟合/维度不足', score: 2 },
          { point: '与 Transformer 对比：O(T·N²) vs O(T²)，串行 vs 并行', score: 2 },
          { point: '诚实评价：思想有价值但被取代，洞察被吸收', score: 1 },
        ],
        keywords: ['扁平记忆', '矩阵记忆', '每步一个Transformer层', '4头最好', '结构化记忆'],
        explanation:
          '能说清「RMC 本质是每步应用一个 Transformer 层」以及「它解决的是固定内存下的长序列问题」，就是理解了 RMC 的定位。',
        tags: ['综合分析'],
      },
    ],
  },
];
