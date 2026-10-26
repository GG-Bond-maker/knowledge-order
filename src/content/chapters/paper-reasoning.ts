import type { Chapter } from '../../types';

/* ============================================================
 *  人工智能基础 · 论文导读 · 记忆与推理
 *  17 Neural Turing Machines
 *
 *  来源：
 *  - 论文：Graves, Wayne, Danihelka (2014) arXiv:1410.5401
 *  - 参考：Ojhaharsh/30u30 第 17 篇（CC BY-NC-ND 4.0，本地个人使用）
 *  - 本课程为原创导读 + 原创习题
 *
 *  执行说明：本章代码需要 PyTorch，走本地后端执行。
 * ============================================================ */

export const paperReasoningChapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c1: Neural Turing Machines
   * ============================================================ */
  {
    id: 'paper-reasoning-c1',
    title: '神经图灵机：给神经网络一个外部记忆',
    goal: '理解 NTM 如何用可微的读写操作扩展 RNN，掌握内容寻址与位置寻址两种寻址机制，能手写 NTM 并训练复制任务。',
    lessons: [
      {
        id: 'paper-reasoning-c1-l1',
        title: '可微的读写头',
        difficulty: 5,
        content: `
### 学习目标

学完本节，你应该能够：
1. 说明 RNN 隐藏状态记忆的四大限制（容量固定/不可寻址/难扩展/互相干扰）与 NTM「外部记忆+可微读写」的应对思路；
2. 手推内容寻址三步（余弦相似度→softmax 锐化→加权读出）与位置寻址三步（插值→移位→锐化），解释每一步为什么必须可微；
3. 用 numpy 实现软寻址读写，验证 key 靠近哪个槽位注意力就指向哪里，以及擦除-添加写入门控的工作方式。

### 前置知识

- RNN/LSTM 的门控与隐藏状态（深度学习课程）；
- softmax 与余弦相似度的计算。

### 问题背景

RNN/LSTM 的记忆是一块固定维度的隐藏状态——容量封顶、无法寻址、扩容要重训、新旧信息互相覆盖。任何「先记住、再按需取用」的任务（复制、联想回忆、多实体追踪）都撞这堵墙。NTM 的回答是把记忆搬出网络：外挂一块可微的记忆矩阵，用注意力做软寻址，让「存」与「取」也参与梯度下降。它是「记忆与计算分离」的第一次端到端演示，软寻址思想直接通向注意力机制与 RAG。

### 直觉理解

控制器像图书管理员，记忆矩阵是书架。内容寻址=报书名找书（相似度检索），位置寻址=报书架号翻页（在上一步位置的邻格移动）。关键在于「翻到第 3 页」这种离散动作无法求导，所以 NTM 把它软化成按注意力权重把所有槽位的内容按比例混合——每个格子都读一点，越相关读得越多，梯度于是能流回控制器，端到端学会一套读写算法。

### 核心概念与原理详解

## 论文信息

| 项目 | 内容 |
| --- | --- |
| **标题** | Neural Turing Machines |
| **作者** | Alex Graves, Greg Wayne, Ivo Danihelka（DeepMind） |
| **发表** | arXiv 2014 |
| **arXiv** | [1410.5401](https://arxiv.org/abs/1410.5401) |
| **一句话贡献** | 给神经网络接一个可微的外部记忆矩阵，用注意力做读写，端到端训练 |

## 核心问题：RNN 的记忆不够用

**RNN/LSTM 的记忆限制**：

| 问题 | 说明 |
| --- | --- |
| **容量固定** | 隐藏状态维度固定（如 512 维） |
| **不可寻址** | 无法"读取第 3 个位置" |
| **难以扩展** | 想存更多就要更大的隐藏层 |
| **干扰** | 新信息覆盖旧信息（catastrophic forgetting） |

**类比**：

    RNN 的记忆 = 便利贴（写满就擦掉旧的）
    我们需要 = 笔记本（可以翻到任意一页）

## NTM 的核心设计

**结构**：

    控制器（Controller，可以是 RNN）
        ↓ 发出读写指令
    记忆矩阵 M（N × W）
        ↓ 返回读到的内容
    控制器继续计算

<NTMArchDemo />

**关键**：**所有操作必须可微**，否则无法反向传播。

**记忆矩阵**：

    M ∈ R^{N × W}
    N：记忆槽位数（如 128）
    W：每个槽位的向量维度（如 20）

**控制器**：

    RNN 或 LSTM 或前馈网络
    输入：当前输入 x_t + 上一步读出的 r_{t-1}
    输出：读写头参数

## 寻址机制（核心创新）

**问题**：如何"选择"记忆位置并保持可微？

**答案**：**用注意力权重做软选择**。

### 内容寻址（Content-based Addressing）

**思想**：按内容查找——"找到和我查询向量最像的槽位"。

**步骤**：

**① 计算相似度**（余弦相似度）：

    K[u, i] = (key_t · M_t[i]) / (||key_t|| · ||M_t[i]||)

**② 转成权重**：

    w^c_t[i] = exp(β_t · K[u, i]) / Σ_j exp(β_t · K[u, j])

\`β_t\` 是"锐度"参数（越大越聚焦）。

**③ 得到读向量**：

    r_t = Σ_i w^c_t[i] · M_t[i]

<ContentAddressingDemo />

### 位置寻址（Location-based Addressing）

**思想**：按位置查找——"读取第 3 个槽位"、"向前移动 2 格"。

**三个子步骤**：

**① 插值（Interpolation）**

混合"上一步的位置权重"和"当前内容权重"：

    w^g_t = g_t · w^c_t + (1 - g_t) · w_{t-1}

\`g_t ∈ [0,1]\` 是"门控"：1 表示用内容寻址，0 表示沿用上一步位置。

**② 移位（Shift）**

按 \`shift\` 向量循环移动：

    w̃_t[i] = Σ_j w^g_t[j] · s_t[i - j]

\`s_t\` 是移位分布（如"向前 1 格" = [0, 0, 1, 0, 0]）。

**③ 锐化（Sharpening）**

用 γ ≥ 1 提高聚焦度：

    w_t[i] = w̃_t[i]^γ / Σ_j w̃_t[j]^γ

<LocationAddressingDemo />

## 读与写

### 读（Read）

    r_t = Σ_i w^r_t[i] · M_t[i]

**纯加权求和**——可微、无副作用。

### 写（Write）

**写分两步：擦除 + 添加**。

**① 擦除**：

    M̃_t[i] = M_{t-1}[i] · (1 - w^w_t[i] · e_t)

\`e_t ∈ [0,1]^W\` 是擦除向量（1 表示该维度完全擦除）。

**② 添加**：

    M_t[i] = M̃_t[i] + w^w_t[i] · a_t

\`a_t\` 是添加向量。

**关键**：权重 \`w^w_t[i]\` 控制"这个槽位写多少"——
0 表示不写，1 表示完全覆盖。

<WriteOperationDemo />

## 论文的实验

### 任务 1：复制（Copy）

**任务**：输入一个序列，输出相同的序列。

    Input:  a b c d e f
    Output: a b c d e f

**为什么这个任务有意义**：
- RNN 必须"记住"整个输入再输出
- 序列长度超出训练长度时，RNN 会失败
- NTM 可以把内容存在记忆里，**长度无关**

**结果**：

| 模型 | 序列长度 10 | 长度 20 | 长度 50 |
| --- | --- | --- | --- |
| LSTM | 好 | 差 | 失败 |
| **NTM** | 好 | **好** | **好**（超出训练长度） |

### 任务 2：联想回忆（Associative Recall）

**任务**：给一串 (key, value) 对，然后给一个 key，输出对应 value。

    Input:  [k1,v1] [k2,v2] [k3,v3] ... [q]
    Output: v_q

**为什么 NTM 擅长**：
- 内容寻址天然适合"按 key 查找"
- LSTM 只能顺序扫描

### 任务 3：排序（Sorting）

**任务**：输入乱序数字，输出排序后结果。

**NTM 的做法**：
- 用内容寻址找最小值
- 读出来写到输出
- 用位置寻址移动到下一个

## 为什么 NTM 重要

**① 记忆与计算分离**

    传统 RNN：记忆 = 计算（隐藏状态）
    NTM：记忆（外部矩阵）+ 计算（控制器）分离

**这与计算机架构类似**（CPU + 内存）。

**② 可微编程的雏形**

NTM 可以学到"算法"：

| 任务 | 学到的行为 |
| --- | --- |
| 复制 | 顺序写入，顺序读出 |
| 排序 | 反复找最小值 |
| 联想回忆 | 内容寻址 |

**③ 为后续工作铺路**

| 模型 | 改进 |
| --- | --- |
| **DNC**（可微神经计算机，2016） | 加入"链接矩阵"追踪顺序 |
| **Transformer** | 用注意力做"软查找"（本质相似） |
| **Retrieval-Augmented LM** | 外部知识库 |
| **Memorizing Transformers** | 长上下文记忆 |

## NTM 的局限

| 局限 | 说明 |
| --- | --- |
| **训练不稳定** | 寻址机制对初始化敏感 |
| **难以调参** | 记忆大小、头数、学习率都要精调 |
| **慢** | 每步多次矩阵操作 |
| **被 Transformer 取代** | 注意力机制更简单有效 |

**论文的诚实**：
Graves 等人承认 NTM 训练困难，需要仔细调参。

**但思想没有过时**：
- 外部记忆 → RAG（检索增强生成）
- 软寻址 → 注意力机制
- 可微编程 → 神经符号推理

## 与 Transformer 的对比

| 维度 | NTM | Transformer |
| --- | --- | --- |
| **记忆** | 显式矩阵（可写） | 隐式（KV cache） |
| **寻址** | 内容 + 位置 | 纯内容（Q·K） |
| **可写** | ✅ 可写 | ❌ 只读 |
| **并行** | ❌ 串行 | ✅ 并行 |
| **训练** | 难 | 易 |

**关键差异**：**NTM 的记忆可写，Transformer 的只能读**。

**这就是为什么 RAG 需要额外的检索系统**——
Transformer 本身没有"写记忆"的机制。

## 本节来源

> **来源类型：学术来源**
> - Graves, A., Wayne, G., Danihelka, I. *Neural Turing Machines*
>   arXiv:[1410.5401](https://arxiv.org/abs/1410.5401)（2014）
> - Graves, A. et al. *Hybrid computing using a neural network with dynamic external memory*
>   Nature 538, 471-476（2016，DNC）
> - Weston, J., Chopra, S., Bordes, A. *Memory Networks*
>   arXiv:[1410.3916](https://arxiv.org/abs/1410.3916)（同期工作）
>
> **来源类型：参考资料（CC BY-NC-ND 4.0，本地个人使用）**
> - Ojhaharsh/30u30 第 17 篇（241 行，含 NTMMemory / NTMHead / NTM）
>
> **来源类型：原创**
> - 全部导读文字、交互图示、代码示例与习题

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
rng = np.random.default_rng(0)
N, W = 4, 3
M = rng.normal(0, 1, (N, W))                 # 记忆矩阵 N×W
key = M[2] + 0.05 * rng.normal(0, 1, W)      # 查询向量 ≈ 槽位2
sim = M @ key / (np.linalg.norm(M, axis=1) * np.linalg.norm(key))
w = np.exp(2.5 * sim); w /= w.sum()          # 内容寻址: softmax(β·cos)
print("寻址权重:", np.round(w, 3), "-> 槽位", int(w.argmax()))
e, a = np.ones(W), np.array([1.0, 0.0, 0.0])
M = M * (1 - np.outer(w, e)) + np.outer(w, a)   # 擦除+添加
print("写入后槽位2:", np.round(M[2], 2))
print("读出 r =", np.round(w @ M, 2))\`\`\`

预期输出（实测）：实测：寻址权重 [0.028, 0.018, 0.946, 0.009] → 指向槽位 2（key 由槽位 2 加噪声生成）；擦除+添加写入后槽位 2 变为 [1.02, 0.05, -0.04]（第 0 维被添加向量写入）；按权重读出 r=[0.96, 0.03, -0.01]——约 95% 的注意力集中在目标槽位，软寻址把「翻到第 3 页」变成可求导的加权平均。

**常见错误**：softmax 前忘乘锐度 β，权重平坦到读不出目标槽位；写操作漏掉 (1-w·e) 擦除步，旧记忆残留污染后续读取；把 argmax 硬寻址直接写进前向传播，梯度断流无法训练。

### 常见误区

1. **NTM 记忆=更大的隐藏层**——它是独立矩阵：可寻址、容量与控制器参数解耦、读写有显式协议；
2. **注意力=查表返回一条**——是加权混合所有槽位，权重只决定「多读少读」，不存在硬命中；
3. **被 Transformer 取代=思想过时**——可写外部记忆活在 RAG/DNC 里，软寻址活在每个注意力层里。

### 知识关联

- **向前**：承接深度学习课 RNN/LSTM 的记忆瓶颈，本节给出「外挂记忆」的第一性方案；
- **向后**：c2 指针网络把注意力权重直接当输出，c4 关系记忆给记忆槽加自注意力交互，RAG 的检索-读写是外部记忆的工程化；
- **平行**：Transformer 的 Q·K 注意力与内容寻址同构（但只读、可并行）。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 记忆瓶颈 | RNN 隐藏状态容量固定、不可寻址、新旧互相干扰 |
| 结构 | 控制器（计算）+ 记忆矩阵 N×W（存储），全部操作可微 |
| 寻址 | 内容寻址（cos+softmax）与位置寻址（插值+移位+锐化） |
| 读写 | 读=加权求和；写=擦除 (1-w·e) 再添加 w·a |
| 遗产 | 软寻址→注意力机制；外部记忆→RAG/DNC |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见论文原文：Graves, Wayne & Danihelka, Neural Turing Machines, arXiv:1410.5401）
`,
        tips: [
          {
            kind: 'interview',
            text: '「NTM 的核心创新」：给神经网络接一个外部记忆矩阵，用可微的注意力权重做读写（软寻址）。这样记忆容量与控制器解耦，且能"按内容查找"。',
          },
          {
            kind: 'leak',
            text: '「两种寻址」：内容寻址（按 key 相似度找槽位）+ 位置寻址（插值→移位→锐化）。写操作分擦除和添加两步，都乘权重保持可微。',
          },
          {
            kind: 'pitfall',
            text: 'NTM 训练不稳定（对初始化敏感、要精调超参），已被 Transformer 在多数任务上取代。但"外部记忆 + 软寻址"的思想影响了 RAG 和记忆增强模型。',
          },
        ],
        demos: [
          {
            title: 'NTM 核心：内容寻址与读写（PyTorch）',
            lang: 'python',
            code: `import torch
import torch.nn as nn
import torch.nn.functional as F

class NTMMemory(nn.Module):
    """NTM 的记忆矩阵 M (N x W)。"""
    def __init__(self, n_slots, slot_dim):
        super().__init__()
        self.N = n_slots
        self.W = slot_dim
        # 初始化为小的随机值
        self.register_buffer('M', torch.randn(n_slots, slot_dim) * 0.1)

    def reset(self, batch_size):
        self.M = torch.randn(batch_size, self.N, self.W) * 0.1

    def content_address(self, key, beta):
        """
        内容寻址：按 key 与各槽位的余弦相似度分配权重。

        key:  (B, W)
        beta: (B, 1) 锐度
        返回: 权重 (B, N)
        """
        # 余弦相似度 (B, N)
        key_norm = key / (key.norm(dim=-1, keepdim=True) + 1e-8)
        M_norm = self.M / (self.M.norm(dim=-1, keepdim=True) + 1e-8)
        similarity = torch.bmm(M_norm, key_norm.unsqueeze(-1)).squeeze(-1)

        # 用 beta 缩放后 softmax
        weights = F.softmax(beta * similarity, dim=-1)
        return weights

    def read(self, weights):
        """读取：加权求和。weights (B, N) -> (B, W)"""
        return torch.bmm(weights.unsqueeze(1), self.M).squeeze(1)

    def write(self, weights, erase, add):
        """
        写入：擦除 + 添加。

        weights: (B, N)
        erase:   (B, W)  in [0,1]
        add:     (B, W)
        """
        # 擦除：M = M * (1 - w⊗e)
        w_expand = weights.unsqueeze(-1)              # (B, N, 1)
        e_expand = erase.unsqueeze(1)                 # (B, 1, W)
        self.M = self.M * (1 - w_expand * e_expand)

        # 添加：M = M + w⊗a
        a_expand = add.unsqueeze(1)                   # (B, 1, W)
        self.M = self.M + w_expand * a_expand
        return self.M


print("=== 内容寻址演示 ===")
torch.manual_seed(42)
B, N, W = 1, 8, 4
mem = NTMMemory(N, W)
mem.reset(B)

print(f"记忆矩阵形状: {tuple(mem.M.shape)}")
print()
print("记忆内容（每行一个槽位）:")
for i in range(N):
    print(f"  槽位{i}: {mem.M[0, i].numpy()}")

print()
print("=== 场景：查询接近槽位 3 ===")
key = mem.M[0, 3] + torch.randn(W) * 0.1   # 接近槽位3的内容
beta = torch.tensor([[10.0]])

weights = mem.content_address(key.unsqueeze(0), beta)
print(f"查询 key: {key.numpy()}")
print(f"注意力权重: {[f'{w:.3f}' for w in weights[0].numpy()]}")
print(f"最大权重槽位: {weights[0].argmax().item()}")

read_vec = mem.read(weights)
print(f"读出的向量: {read_vec[0].numpy()}")
print(f"与槽位3的差异: {(read_vec[0] - mem.M[0,3]).norm().item():.4f}")

print()
print("=== beta 的作用（锐度）===")
print()
for b in [1.0, 5.0, 20.0]:
    w = mem.content_address(key.unsqueeze(0), torch.tensor([[b]]))
    max_w = w.max().item()
    entropy = -(w * torch.log(w + 1e-10)).sum().item()
    print(f"beta={b:>5.1f}: 最大权重={max_w:.3f}, 熵={entropy:.3f}")
print()
print("beta 越大 -> 权重越集中（熵越小）-> 越'锐利'")

print()
print("=== 写操作演示 ===")
print()
mem2 = NTMMemory(4, 3)
mem2.reset(1)
print("写入前:")
for i in range(4):
    print(f"  槽位{i}: {mem2.M[0, i].numpy()}")

# 只写槽位 1
w_write = torch.tensor([[0.0, 1.0, 0.0, 0.0]])
erase = torch.zeros(1, 3)
add = torch.tensor([[9.0, 9.0, 9.0]])

mem2.write(w_write, erase, add)
print()
print("写入槽位1（erase=0, add=[9,9,9]）后:")
for i in range(4):
    print(f"  槽位{i}: {mem2.M[0, i].numpy()}")

print()
print("=== 擦除 + 添加 ===")
mem3 = NTMMemory(4, 3)
mem3.reset(1)
mem3.M[0, 1] = torch.tensor([5.0, 5.0, 5.0])
print("初始槽位1: [5,5,5]")
mem3.write(w_write, erase=torch.ones(1, 3), add=torch.tensor([[1.0, 1.0, 1.0]]))
print(f"erase=1, add=[1,1,1] 后: {mem3.M[0, 1].numpy()}")
print("-> 先完全擦除（变0），再加1")`,
          },
          {
            title: '位置寻址：插值、移位、锐化',
            lang: 'python',
            code: `import torch
import torch.nn.functional as F

def interpolate(w_prev, w_content, gate):
    """① 插值：混合上一步位置和内容权重。"""
    return gate * w_content + (1 - gate) * w_prev


def shift(w, shift_vec):
    """
    ② 移位：循环卷积。

    w: (N,) 位置权重
    shift_vec: (3,) 对应 [-1, 0, +1] 的移位权重
    """
    N = w.shape[0]
    # 构造循环卷积矩阵
    shifted = torch.zeros_like(w)
    for i in range(N):
        for j, offset in enumerate([-1, 0, 1]):
            src = (i - offset) % N
            shifted[i] += w[src] * shift_vec[j]
    return shifted


def sharpen(w, gamma):
    """③ 锐化：提高聚焦度。"""
    w_gamma = w ** gamma
    return w_gamma / (w_gamma.sum() + 1e-10)


print("=== 位置寻址三步演示 ===")
print()
N = 8
w_prev = torch.zeros(N)
w_prev[2] = 1.0          # 上一步在位置 2
w_content = torch.zeros(N)
w_content[5] = 1.0       # 内容寻址指向位置 5

print(f"上一步位置权重 w_prev:   {w_prev.numpy()}")
print(f"内容寻址权重 w_content:  {w_content.numpy()}")

print()
print("--- ① 插值（gate=0.3，偏向上一步）---")
w_g = interpolate(w_prev, w_content, torch.tensor(0.3))
print(f"结果: {w_g.numpy()}")
print(f"说明: 位置2 权重 {(1-0.3):.1f}, 位置5 权重 0.3")

print()
print("--- ② 移位（向前 1 格）---")
shift_vec = torch.tensor([0.0, 0.0, 1.0])   # 只有 +1 方向
w_shifted = shift(w_g, shift_vec)
print(f"移位前: {w_g.numpy()}")
print(f"移位后: {w_shifted.numpy()}")
print(f"说明: 位置2 -> 位置3, 位置5 -> 位置6")

print()
print("--- ③ 锐化（gamma=2）---")
w_sharp = sharpen(w_shifted, 2.0)
print(f"锐化前: {w_shifted.numpy()}")
print(f"锐化后: {w_sharp.numpy()}")
print()
print("说明: gamma>1 让大的更大、小的更小")

print()
print("=== 完整的 NTM 头部寻址流程 ===")
print()

def ntm_head(w_prev, key, M, beta, gate, shift_vec, gamma):
    """完整的位置寻址流程。"""
    # ① 内容寻址
    key_norm = key / (key.norm() + 1e-8)
    M_norm = M / (M.norm(dim=-1, keepdim=True) + 1e-8)
    sim = M_norm @ key_norm
    w_content = F.softmax(beta * sim, dim=0)

    # ② 插值
    w_g = gate * w_content + (1 - gate) * w_prev

    # ③ 移位
    w_shifted = shift(w_g, shift_vec)

    # ④ 锐化
    w_final = sharpen(w_shifted, gamma)
    return w_final


torch.manual_seed(0)
N, W = 6, 3
M = torch.randn(N, W)
w_prev = torch.zeros(N); w_prev[0] = 1.0
key = M[3] + torch.randn(W) * 0.2

print(f"记忆矩阵形状: {tuple(M.shape)}")
print(f"查询 key 接近槽位 3")
print()

w_final = ntm_head(
    w_prev, key, M,
    beta=torch.tensor(5.0),
    gate=torch.tensor(0.9),      # 主要用内容寻址
    shift_vec=torch.tensor([0.0, 0.0, 1.0]),   # 向前 1 格
    gamma=torch.tensor(2.0),
)

print(f"最终位置权重: {[f'{w:.3f}' for w in w_final.numpy()]}")
print(f"峰值位置: {w_final.argmax().item()}")
print()
print("流程: 内容找到位置3 -> 插值 -> 移位到位置4 -> 锐化")
print()
print("这就是 NTM 的'可微寻址'——所有操作都是矩阵运算，可反向传播。")`,
          },
          {
            title: '训练 NTM 做复制任务',
            lang: 'python',
            code: `import torch
import torch.nn as nn
import torch.nn.functional as F

class NTM(nn.Module):
    """简化版 NTM（单读头 + 单写头）。"""
    def __init__(self, input_dim, output_dim, n_slots=16, slot_dim=8, ctrl_dim=32):
        super().__init__()
        self.N = n_slots
        self.W = slot_dim
        self.ctrl_dim = ctrl_dim

        # 控制器：LSTM
        self.controller = nn.LSTMCell(input_dim + slot_dim, ctrl_dim)

        # 从控制器输出生成头部参数
        # 读头：key(W) + beta(1) + gate(1) + shift(3) + gamma(1)
        read_out = slot_dim + 6
        # 写头：key(W) + beta(1) + gate(1) + shift(3) + gamma(1) + erase(W) + add(W)
        write_out = slot_dim + 6 + 2 * slot_dim

        self.read_head = nn.Linear(ctrl_dim, read_out)
        self.write_head = nn.Linear(ctrl_dim, write_out)
        self.output = nn.Linear(ctrl_dim + slot_dim, output_dim)

    def init_state(self, batch_size, device):
        self.M = torch.randn(batch_size, self.N, self.W, device=device) * 0.1
        self.wr = torch.zeros(batch_size, self.N, device=device)
        self.ww = torch.zeros(batch_size, self.N, device=device)
        self.h = torch.zeros(batch_size, self.ctrl_dim, device=device)
        self.c = torch.zeros(batch_size, self.ctrl_dim, device=device)
        self.r_prev = torch.zeros(batch_size, self.W, device=device)

    def _address(self, params, w_prev):
        """解析头部参数并计算位置权重。"""
        W = self.W
        key = params[:, :W]
        beta = F.softplus(params[:, W:W+1]) + 1.0
        gate = torch.sigmoid(params[:, W+1:W+2])
        shift_logits = params[:, W+2:W+5]
        gamma = F.softplus(params[:, W+5:W+6]) + 1.0

        # 内容寻址
        key_n = key / (key.norm(dim=-1, keepdim=True) + 1e-8)
        M_n = self.M / (self.M.norm(dim=-1, keepdim=True) + 1e-8)
        sim = torch.bmm(M_n, key_n.unsqueeze(-1)).squeeze(-1)
        w_content = F.softmax(beta * sim, dim=-1)

        # 插值
        w_g = gate * w_content + (1 - gate) * w_prev

        # 移位（用 softmax 后的 shift 分布做循环卷积）
        shift = F.softmax(shift_logits, dim=-1)   # (B, 3)
        B, N = w_g.shape
        w_shifted = torch.zeros_like(w_g)
        for i in range(N):
            for j, off in enumerate([-1, 0, 1]):
                src = (i - off) % N
                w_shifted[:, i] += w_g[:, src] * shift[:, j]

        # 锐化
        w_final = w_shifted ** gamma
        w_final = w_final / (w_final.sum(dim=-1, keepdim=True) + 1e-10)
        return w_final

    def step(self, x):
        """单步前向。"""
        ctrl_in = torch.cat([x, self.r_prev], dim=-1)
        self.h, self.c = self.controller(ctrl_in, (self.h, self.c))

        # 读
        rp = self.read_head(self.h)
        self.wr = self._address(rp, self.wr)
        r = torch.bmm(self.wr.unsqueeze(1), self.M).squeeze(1)
        self.r_prev = r

        # 写
        wp = self.write_head(self.h)
        W = self.W
        self.ww = self._address(wp[:, :W+6], self.ww)
        erase = torch.sigmoid(wp[:, W+6:W+6+W])
        add = torch.tanh(wp[:, W+6+W:])

        w_exp = self.ww.unsqueeze(-1)
        self.M = self.M * (1 - w_exp * erase.unsqueeze(1))
        self.M = self.M + w_exp * add.unsqueeze(1)

        # 输出
        out = self.output(torch.cat([self.h, r], dim=-1))
        return out

    def forward(self, x):
        # x: (B, T, input_dim)
        B, T, _ = x.shape
        self.init_state(B, x.device)
        outs = []
        for t in range(T):
            outs.append(self.step(x[:, t]))
        return torch.stack(outs, 1)


print("=== NTM 复制任务 ===")
torch.manual_seed(42)

INPUT_DIM = 8
SEQ_LEN = 10
BATCH = 8

model = NTM(INPUT_DIM, INPUT_DIM, n_slots=16, slot_dim=8)
optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)

# 生成复制任务数据：输出 = 输入
def make_batch(batch_size, seq_len):
    x = torch.randint(0, 2, (batch_size, seq_len, INPUT_DIM)).float()
    return x, x.clone()

print(f"输入/输出维度: {INPUT_DIM}")
print(f"序列长度: {SEQ_LEN}")
print()

# 训练
for epoch in range(1, 201):
    x, y = make_batch(BATCH, SEQ_LEN)
    out = model(x)
    loss = F.binary_cross_entropy_with_logits(out, y)

    optimizer.zero_grad()
    loss.backward()
    torch.nn.utils.clip_grad_norm_(model.parameters(), 5.0)
    optimizer.step()

    if epoch % 40 == 0:
        with torch.no_grad():
            pred = (out > 0).float()
            acc = (pred == y).float().mean().item()
        print(f"epoch {epoch:>3}: loss={loss.item():.4f}, 准确率={acc:.3f}")

print()
print("=== 泛化测试：更长序列 ===")
print()
for test_len in [10, 20, 30]:
    x, y = make_batch(4, test_len)
    with torch.no_grad():
        out = model(x)
        pred = (out > 0).float()
        acc = (pred == y).float().mean().item()
    print(f"长度 {test_len:>2}: 准确率 = {acc:.3f}")

print()
print("关键：NTM 可以在比训练更长的序列上工作")
print("因为它把内容存在记忆里，而不是压缩进隐藏状态")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'paper-reasoning-c1-e1',
        relatedLessonId: 'paper-reasoning-c1-l1',
        type: 'single',
        difficulty: 2,
        question: 'NTM（神经图灵机）的核心创新是？',
        options: [
          { value: 'A', text: '更深的网络' },
          { value: 'B', text: '给网络接一个可微的外部记忆矩阵，用注意力做读写' },
          { value: 'C', text: '更好的激活函数' },
          { value: 'D', text: '更大的词表' },
        ],
        answer: 'B',
        explanation:
          'RNN 的记忆是隐藏状态（容量固定、不可寻址）。NTM 用外部记忆矩阵 M (N×W)，控制器通过可微的读写头操作它——可以按内容查找，容量与控制器解耦。',
        tags: ['核心创新'],
      },
      {
        id: 'paper-reasoning-c1-e2',
        relatedLessonId: 'paper-reasoning-c1-l1',
        type: 'judge',
        difficulty: 2,
        question: 'NTM 的写操作是直接把新值赋给某个记忆槽位。',
        answer: false,
        explanation:
          '不是直接赋值——那样不可微。NTM 的写分两步：① 擦除 M*(1-w·e)；② 添加 M+w·a。权重 w 控制"写多少"，整个过程是矩阵运算，可反向传播。',
        tags: ['写操作'],
      },
      {
        id: 'paper-reasoning-c1-e3',
        relatedLessonId: 'paper-reasoning-c1-l1',
        type: 'multiple',
        difficulty: 3,
        question: 'NTM 的位置寻址包含哪些子步骤？（多选）',
        options: [
          { value: 'A', text: '插值：混合上一步位置权重和内容权重' },
          { value: 'B', text: '移位：按 shift 分布循环移动' },
          { value: 'C', text: '锐化：用 gamma 提高聚焦度' },
          { value: 'D', text: '量化：把权重变成 one-hot' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误——量化（变 one-hot）会破坏可微性。NTM 全程用软权重：插值 → 移位 → 锐化，每步都是可微的矩阵运算。',
        tags: ['位置寻址'],
      },
      {
        id: 'paper-reasoning-c1-e4',
        relatedLessonId: 'paper-reasoning-c1-l1',
        type: 'fill',
        difficulty: 3,
        question:
          'NTM 的内容寻址用 ___ 相似度衡量 key 与各记忆槽位的匹配程度。',
        blanks: [['余弦', 'cosine', '余弦相似度']],
        explanation:
          'K[u,i] = (key·M[i]) / (||key||·||M[i]||)。余弦相似度对向量长度不敏感，只看方向——适合"按内容查找"。然后用 β 缩放后 softmax 得到权重。',
        tags: ['内容寻址'],
      },
      {
        id: 'paper-reasoning-c1-e5',
        relatedLessonId: 'paper-reasoning-c1-l1',
        type: 'code',
        difficulty: 2,
        question:
          '实现内容寻址的权重计算：content_weights(key, M, beta)。\n\n- key: (W,)\n- M: (N, W)\n- 返回 (N,) 权重，用余弦相似度 + softmax',
        starterCode: `import numpy as np

def content_weights(key, M, beta=1.0):
    key_norm = ___
    M_norm = ___
    similarity = ___
    exp_s = ___
    return ___
`,
        setupCode: '',
        expectedOutput: '内容寻址权重',
        tests: `import numpy as np
np.random.seed(0)
N, W = 6, 4
M = np.random.randn(N, W)
key = M[2] + np.random.randn(W) * 0.05   # 接近槽位2

w = content_weights(key, M, beta=10.0)
assert w.shape == (N,)
assert abs(w.sum() - 1.0) < 1e-9
assert w[2] > 0.8, f"应聚焦到槽位2，实际 {w}"

# beta 越大越聚焦
w_low = content_weights(key, M, beta=0.5)
assert w[2] > w_low[2], "beta 大时更聚焦"

# 权重非负
assert (w >= 0).all()
`,
        answer: `import numpy as np

def content_weights(key, M, beta=1.0):
    key_norm = key / (np.linalg.norm(key) + 1e-8)
    M_norm = M / (np.linalg.norm(M, axis=-1, keepdims=True) + 1e-8)
    similarity = M_norm @ key_norm
    exp_s = np.exp(beta * similarity - np.max(beta * similarity))
    return exp_s / exp_s.sum()
`,
        explanation:
          '**余弦相似度**：归一化后点积，只看方向不看长度。\n\n**`- np.max(...)` 是数值稳定**：防止 exp 溢出。\n\n**beta 的作用**：\n- beta 小 → 权重平缓（"大概看看几个槽位"）\n- beta 大 → 权重集中（"精确查找某个槽位"）\n\n**为什么用余弦而非欧氏距离**：\n记忆槽位的向量长度可能不同，余弦只看方向更鲁棒。',
        tags: ['编程', '内容寻址'],
      },
      {
        id: 'paper-reasoning-c1-e6',
        relatedLessonId: 'paper-reasoning-c1-l1',
        type: 'code',
        difficulty: 3,
        question:
          '实现 NTM 的读操作：ntm_read(weights, M)。\n\n- weights: (N,) 位置权重\n- M: (N, W) 记忆矩阵\n- 返回 (W,) 读出的向量',
        starterCode: `import numpy as np

def ntm_read(weights, M):
    return ___
`,
        setupCode: '',
        expectedOutput: '读向量',
        tests: `import numpy as np
M = np.array([[1.0, 0.0], [0.0, 1.0], [2.0, 2.0]])

# 纯 one-hot：读出对应槽位
w = np.array([1.0, 0.0, 0.0])
assert np.allclose(ntm_read(w, M), [1.0, 0.0])

w2 = np.array([0.0, 1.0, 0.0])
assert np.allclose(ntm_read(w2, M), [0.0, 1.0])

# 加权混合
w3 = np.array([0.5, 0.5, 0.0])
assert np.allclose(ntm_read(w3, M), [0.5, 0.5])

# 三个都参与
w4 = np.array([0.2, 0.3, 0.5])
expected = 0.2*M[0] + 0.3*M[1] + 0.5*M[2]
assert np.allclose(ntm_read(w4, M), expected)
`,
        answer: `import numpy as np

def ntm_read(weights, M):
    return weights @ M
`,
        explanation:
          '**读操作就是加权求和**：`r = Σ_i w[i] · M[i]`。\n\n**这就是矩阵乘**：`weights @ M` → (N,) @ (N,W) → (W,)。\n\n**为什么这么简单**：\n\n读不需要修改记忆，只是"提取信息"。\n用软权重混合多个槽位 → 可微。\n\n**对比写操作**：\n\n    读：r = w @ M          （只读，无副作用）\n写：M = M*(1-w·e) + w·a  （修改记忆）\n\n**注意**：读是"软"的——权重不是 one-hot 时，读出的向量是多个槽位的混合。\n这正是可微性的来源。',
        tags: ['编程', '读操作'],
      },
      {
        id: 'paper-reasoning-c1-e7',
        relatedLessonId: 'paper-reasoning-c1-l1',
        type: 'code',
        difficulty: 3,
        question:
          '实现 NTM 的写操作：ntm_write(M, weights, erase, add)。\n\n- M: (N, W)\n- weights: (N,)\n- erase: (W,) in [0,1]\n- add: (W,)\n返回新的 M（不要原地修改）。',
        starterCode: `import numpy as np

def ntm_write(M, weights, erase, add):
    w = weights[:, None]      # (N, 1)
    e = erase[None, :]        # (1, W)
    a = add[None, :]          # (1, W)
    erased = ___
    return ___
`,
        setupCode: '',
        expectedOutput: '写后的记忆',
        tests: `import numpy as np
M = np.ones((3, 2)) * 5.0

# 只写槽位 1，完全擦除后加 [1,1]
w = np.array([0.0, 1.0, 0.0])
new_M = ntm_write(M, w, np.ones(2), np.ones(2))

assert np.allclose(new_M[0], [5.0, 5.0]), "槽位0不应变"
assert np.allclose(new_M[1], [1.0, 1.0]), "槽位1应变成 [1,1]"
assert np.allclose(new_M[2], [5.0, 5.0]), "槽位2不应变"

# 不擦除只添加
M2 = np.ones((2, 2)) * 3.0
new2 = ntm_write(M2, np.array([1.0, 0.0]), np.zeros(2), np.array([2.0, 2.0]))
assert np.allclose(new2[0], [5.0, 5.0]), "不擦除应累加"

# 部分权重
M3 = np.ones((2, 2)) * 10.0
new3 = ntm_write(M3, np.array([0.5, 0.0]), np.ones(2), np.zeros(2))
assert np.allclose(new3[0], [5.0, 5.0]), "权重0.5应擦除一半"

# 不修改原数组
assert np.allclose(M, np.ones((3,2)) * 5.0)
`,
        answer: `import numpy as np

def ntm_write(M, weights, erase, add):
    w = weights[:, None]      # (N, 1)
    e = erase[None, :]        # (1, W)
    a = add[None, :]          # (1, W)
    erased = M * (1 - w * e)
    return erased + w * a
`,
        explanation:
          '**两步公式**：\n\n    ① 擦除：M̃ = M ⊙ (1 - w⊗e)\n    ② 添加：M = M̃ + w⊗a\n\n**`w * e` 的形状**：(N,1) × (1,W) → (N,W)，广播。\n\n**物理含义**：\n\n| w[i] | e[j] | 效果 |\n| --- | --- | --- |\n| 0 | 任意 | 槽位 i 的第 j 维不变 |\n| 1 | 1 | 完全擦除 |\n| 1 | 0 | 保留原值 |\n| 0.5 | 1 | 擦除一半 |\n\n**`+ w * a`**：添加时也按权重缩放——权重小则加得少。\n\n**这是可微的关键**：w 是连续的，梯度可以流经它。',
        tags: ['编程', '写操作'],
      },
      {
        id: 'paper-reasoning-c1-e8',
        relatedLessonId: 'paper-reasoning-c1-l1',
        type: 'code',
        difficulty: 4,
        question:
          '实现位置寻址的移位操作：shift_weights(w, shift)。\n\n- w: (N,) 位置权重\n- shift: (3,) 对应 [-1, 0, +1] 的移位权重\n- 返回循环移位后的 (N,) 权重',
        starterCode: `import numpy as np

def shift_weights(w, shift):
    N = len(w)
    result = np.zeros(N)
    for i in range(N):
        for j, offset in enumerate([-1, 0, 1]):
            src = ___
            result[i] += ___
    return result
`,
        setupCode: '',
        expectedOutput: '移位后的权重',
        tests: `import numpy as np
# 向前 1 格
w = np.array([1.0, 0.0, 0.0, 0.0, 0.0])
shifted = shift_weights(w, np.array([0.0, 0.0, 1.0]))
assert np.allclose(shifted, [0.0, 1.0, 0.0, 0.0, 0.0]), f"实际 {shifted}"

# 向后 1 格
shifted2 = shift_weights(w, np.array([1.0, 0.0, 0.0]))
assert np.allclose(shifted2, [0.0, 0.0, 0.0, 0.0, 1.0]), "应循环到末尾"

# 不动
shifted3 = shift_weights(w, np.array([0.0, 1.0, 0.0]))
assert np.allclose(shifted3, w)

# 权重和为 1（保持归一化）
w2 = np.array([0.2, 0.3, 0.5, 0.0])
s = shift_weights(w2, np.array([0.0, 0.0, 1.0]))
assert abs(s.sum() - 1.0) < 1e-9
`,
        answer: `import numpy as np

def shift_weights(w, shift):
    N = len(w)
    result = np.zeros(N)
    for i in range(N):
        for j, offset in enumerate([-1, 0, 1]):
            src = (i - offset) % N
            result[i] += w[src] * shift[j]
    return result
`,
        explanation:
          '**`(i - offset) % N` 实现循环**：\n\n    offset=+1（向前移）: src = i-1，即从左边取\n    offset=-1（向后移）: src = i+1，即从右边取\n    offset=0:  src = i，不动\n\n**为什么用 `% N`**：处理边界，让最后一个位置能循环到第一个。\n\n**移位矩阵的形式**：\n\n这等价于一个循环卷积矩阵（circulant matrix）：\n\n    w_shifted = S @ w\n    其中 S 的每行是 shift 的循环移位\n\n**保持归一化**：如果 w 和 shift 都和为 1，结果也和为 1。',
        tags: ['编程', '移位'],
      },
      {
        id: 'paper-reasoning-c1-e9',
        relatedLessonId: 'paper-reasoning-c1-l1',
        type: 'judge',
        difficulty: 4,
        question: 'NTM 的记忆矩阵在训练后可以处理任意长度的序列，因为记忆槽位数固定。',
        answer: false,
        explanation:
          '半对半错。记忆槽位数 N 确实固定，但 NTM 可以在**比训练更长**的序列上工作（论文演示了这一点）——因为内容存在记忆里而非压缩进隐藏状态。但如果序列长度超过记忆容量 N，就会失败。',
        tags: ['泛化'],
      },
      {
        id: 'paper-reasoning-c1-e10',
        relatedLessonId: 'paper-reasoning-c1-l1',
        type: 'open',
        difficulty: 5,
        question:
          '请解释：① NTM 相比 RNN 的记忆优势；② 内容寻址与位置寻址的机制；③ 写操作如何保持可微；④ NTM 与 Transformer/RAG 的关系。',
        referenceAnswer: `**① NTM 相比 RNN 的记忆优势**

**RNN 的记忆限制**：

| 问题 | 说明 |
| --- | --- |
| **容量固定** | 隐藏状态维度固定（如 512 维） |
| **不可寻址** | 无法"读取第 3 个位置" |
| **干扰** | 新信息覆盖旧信息 |
| **长度敏感** | 序列超出训练长度就失败 |

**NTM 的记忆**：

    M ∈ R^{N × W}
    N = 128 个槽位，W = 20 维

**优势**：

| 方面 | RNN | NTM |
| --- | --- | --- |
| 容量 | 固定且小 | **可调（N×W）** |
| 寻址 | 无 | **内容 + 位置** |
| 读写 | 隐式 | **显式、可控** |
| 长度 | 敏感 | **超出训练长度仍可用** |

**关键**：**记忆与计算分离**——就像 CPU 和内存分离。

---

**② 内容寻址与位置寻址**

**内容寻址**（"按内容查找"）：

    K[u, i] = (key · M[i]) / (||key|| · ||M[i]||)
    w^c[i] = softmax(β · K[u, i])

- 用余弦相似度衡量 key 与每个槽位的匹配
- β 控制锐度（大 = 精确匹配，小 = 模糊）
- 适合"联想回忆"（给 key 找 value）

**位置寻址**（"按位置查找"）：

**① 插值**：

    w^g = g · w^c + (1 - g) · w_{t-1}

门控 g 决定"用内容还是沿用上一步位置"。

**② 移位**：

    w̃[i] = Σ_j w^g[j] · s[i - j]

\`s\` 是移位分布，如"向前 1 格" = [0, 0, 1, 0, 0]。

**③ 锐化**：

    w[i] = w̃[i]^γ / Σ w̃[j]^γ

γ ≥ 1 提高聚焦度。

**为什么要位置寻址**：
内容寻址无法表达"移动到下一个位置"这种操作。
排序、遍历需要位置信息。

---

**③ 写操作如何保持可微**

**朴素做法（不可微）**：

    M[i] = new_value      # 直接赋值

问题：\`i\` 是离散索引，梯度无法传过。

**NTM 的做法**：**软写入**。

**① 擦除**：

    M̃[i] = M[i] · (1 - w^w[i] · e)

- \`w^w[i]\` 是软权重（0~1），不是 one-hot
- \`e\` 是擦除向量（每维独立控制）
- 权重 0.5 表示"擦除一半"

**② 添加**：

    M[i] = M̃[i] + w^w[i] · a

- \`a\` 是添加内容
- 权重缩放控制"加多少"

**可微性来源**：

    整个操作是 M 和 w 的连续函数
    ∂M_new/∂w 存在
    梯度可以从损失传回 w，再传回控制器

**关键洞察**：
> 不是"选择位置后赋值"，而是"按权重在所有位置同时部分写入"。

**代价**：写入是"模糊"的——可能同时影响多个槽位。
但这正是可微的代价，也是它 work 的原因。

---

**④ NTM 与 Transformer/RAG 的关系**

**与 Transformer 的对比**：

| 维度 | NTM | Transformer |
| --- | --- | --- |
| **记忆** | 显式矩阵（可写） | 隐式（KV cache，只读） |
| **寻址** | 内容 + 位置 | 纯内容（Q·K） |
| **并行** | ❌ 串行 | ✅ 并行 |
| **训练** | 难（不稳定） | 易 |
| **现状** | 被取代 | 主流 |

**关键差异**：

    NTM:  记忆可以"写"（更新内容）
    Transformer: KV cache 只读（生成时不能改）

**这解释了为什么需要 RAG**：

Transformer 无法在推理时"记住新知识"——
权重是固定的，KV cache 只存当前上下文。

**RAG（检索增强生成）**：

    用户问题 → 检索外部知识库 → 拼进 prompt → LLM 生成

**这本质上是"外挂记忆"**，只是：

| 方面 | NTM | RAG |
| --- | --- | --- |
| 记忆位置 | 模型内部 | 外部数据库 |
| 写入 | 可微、端到端 | 离线索引 |
| 寻址 | 注意力权重 | 向量检索（相似） |
| 训练 | 联合训练 | 分开 |

**思想传承**：

    2014 NTM（可微外部记忆）
      ↓
    2016 DNC（加入链接矩阵追踪顺序）
      ↓
    2020 RAG（检索 + 生成）
      ↓
    2023 Memorizing Transformers（长上下文记忆）
      ↓
    2024+ 各种 memory-augmented LLM

**NTM 的核心思想没有过时**：

> **记忆应该是显式的、可寻址的、可扩展的。**

只是实现方式从"可微矩阵"变成了"向量数据库 + 检索"。

---

**⑤ 一个诚实的评价**

**NTM 为什么没有成为主流**：

| 问题 | 说明 |
| --- | --- |
| **训练不稳定** | 寻址对初始化极敏感 |
| **超参敏感** | 记忆大小、头数、学习率都要精调 |
| **慢** | 每步多次矩阵运算，无法并行 |
| **被 Transformer 超越** | 注意力更简单、更快、更好 |

**但它的历史价值**：

1. **首次证明**神经网络可以学会"算法"（复制、排序）
2. **首次系统提出**可微外部记忆
3. **启发了**后续所有 memory-augmented 模型

**Graves 后来做了 DNC**（Nature 2016），解决了 NTM 的部分问题，
但同样被 Transformer 的浪潮盖过。

**科学研究的常态**：
> 很多工作的价值不在于"最终胜出"，
> 而在于**提出了新的可能性**。

NTM 证明了"神经网络可以有外部记忆"，
这个想法今天以 RAG 的形式活了下来。`,
        rubric: [
          { point: 'RNN 记忆限制：容量固定、不可寻址、干扰、长度敏感', score: 3 },
          { point: '内容寻址（余弦+β）+ 位置寻址（插值/移位/锐化）', score: 2 },
          { point: '写操作可微：软权重部分写入而非直接赋值', score: 2 },
          { point: '与 Transformer（只读 KV）对比 + 为什么需要 RAG', score: 2 },
          { point: '诚实评价：训练难被取代，但思想传承到 RAG', score: 1 },
        ],
        keywords: ['外部记忆', '余弦寻址', '软写入', 'KV 只读', '思想传承'],
        explanation:
          '能说清「NTM 的记忆可写而 Transformer 的 KV 只读，所以需要 RAG」以及「软写入是可微性的代价与来源」，就是理解了 NTM 的核心贡献与局限。',
        tags: ['综合分析'],
      },
    ],
  },
];
