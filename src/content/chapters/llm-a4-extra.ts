import type { Chapter } from '../../types';

/* ============================================================
 *  《MoE 论文研读》进阶模块（前沿现代架构）
 *  c4：Mixtral 与 DeepSeek-MoE：细粒度与共享专家革新
 *  c5：DeepSeek-V3：无辅助损失负载均衡与超大规模 MoE 工程
 * ============================================================ */

export const llmA4ModernChapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c4：Mixtral 与 DeepSeek-MoE：细粒度与共享专家革新
   * ============================================================ */
  {
    id: 'llm-a4-c4',
    title: '细粒度与共享专家：从 Mixtral 到 DeepSeek-MoE',
    goal: '掌握现代开源 MoE 的核心演进路径：从 Mixtral 的 Top-2 路由与 SwiGLU 专家，到 DeepSeek-MoE 的细粒度专家切分与共享专家解耦机制，理解组合爆炸与通用知识隔离的数学本质。',
    lessons: [
      {
        id: 'llm-a4-c4-l1',
        title: 'Mixtral 8x7B 与 Top-2 门控路由',
        content: `
## 开源 MoE 的分水岭：Mixtral 8x7B

在 2024 年初，Mistral AI 发布的 **Mixtral 8x7B** 彻底引爆了开源 MoE 浪潮。它以仅 12.9B 的每 Token 激活参数量，在各项基准测试中全面匹敌甚至超越了 70B 的稠密 LLaMA-2。

与 Switch Transformer 采用激进的 Top-1 路由不同，Mixtral 回归并优化了 **Top-2 路由**，并在专家内部采用了前沿的 **SwiGLU** 激活函数。

## Top-2 门控与重新归一化（Re-normalization）

设输入表征向量为 $x \\in \\mathbb{R}^d$，门控网络权重为 $W_g \\in \\mathbb{R}^{d \\times N}$（其中 $N=8$ 为专家总数）。

### 1. 计算未归一化亲和度打分
$$S = x W_g \\quad (S \\in \\mathbb{R}^N)$$

### 2. 选取 Top-2 专家索引
$$\\mathcal{T} = \\operatorname{Top-2}(S) = \\{e_1, e_2\\}$$

### 3. Softmax 重新归一化
仅对入选的两个专家的打分施加 Softmax，确保其权重和严格等于 1：
$$w_i = \\frac{\\exp(S_i)}{\\sum_{j \\in \\mathcal{T}} \\exp(S_j)}, \\quad i \\in \\mathcal{T}$$

### 4. 混合加权输出
$$y = w_{e_1} \\cdot \\text{Expert}_{e_1}(x) + w_{e_2} \\cdot \\text{Expert}_{e_2}(x)$$

> **为什么必须重新归一化？**
> 如果直接取全局 Softmax 后截取前两项，两者的权重之和通常小于 1（例如 0.45 + 0.35 = 0.80），这会导致残差分支上的信号发生尺度缩放漂移，破坏 Pre-RMSNorm 的数值稳定性。重新归一化保证了激活能量的守恒。

## 专家的内部结构：SwiGLU FFN

Mixtral 的每个专家并不是原始的双层 ReLU FFN，而是现代 LLM 标配的 **SwiGLU** 门控前馈网络：

$$\\text{Expert}_i(x) = \\left( (x W_{1,i}) \\odot \\operatorname{SiLU}(x W_{3,i}) \\right) W_{2,i}$$

- **总参数量**：$8 \\times \\text{FFN 参数} + \\text{共享注意力参数}$ $\\approx 46.7\\text{B}$。
- **激活参数量**：$2 \\times \\text{FFN 参数} + \\text{共享注意力参数}$ $\\approx 12.9\\text{B}$。
- **组合空间**：从 8 个专家中选取 2 个，共有 $\\binom{8}{2} = 28$ 种专家组合模式。

## 传统粗粒度 MoE 的三大软肋

尽管 Mixtral 8x7B 极其成功，但以 Mixtral 和 GShard 为代表的“**粗粒度专家（Coarse-Grained Experts）**”存在结构性缺陷：

1. **知识混杂（Knowledge Hybridity）**：
   每个专家模型容量很大（约相当于 7B 稠密模型的 FFN），单个专家被迫同时学习语法、代码、数学、多语言翻译等八竿子打不着的知识，无法形成极致专精。
2. **知识冗余（Knowledge Redundancy）**：
   语言模型必须掌握通用的基础语法和高频共性表达。在 Top-2 竞争下，**每个专家都在各自的权重里重复记忆这些通用常识**，浪费了宝贵的参数容量。
3. **组合表达能力受限**：
   $\\binom{8}{2} = 28$ 种组合在面对海量复杂上下文时，组合多样性远远不足。

<MultiHeadDemo />
`,
        tips: [
          {
            kind: 'interview',
            text: '面试常考：为什么 Mixtral 8x7B 总参数是 47B 而不是 56B（8×7B）？因为 Transformer 的注意力层（Self-Attention）与 Embedding 层在 8 个专家之间是完全共享的，只有 FFN 层被复制了 8 份！',
          },
        ],
      },
      {
        id: 'llm-a4-c4-l2',
        title: 'DeepSeek-MoE：细粒度专家切分',
        content: `
## 核心思路：化整为零，细粒度切分

为了解决粗粒度专家的知识混杂与组合不足，DeepSeek 团队提出了 **细粒度专家切分（Fine-Grained Expert Segmentation）** 策略：

> **思想**：保持激活计算量（FLOPs）严格不变的前提下，把原本庞大的大专家，**切碎成更多更小的子专家**，并成倍增加激活专家的数量！

## 数学切分方案

设原本的粗粒度 MoE 拥有 $N$ 个专家，每个专家 FFN 的中间隐层维度为 $d_{\\text{ff}}$，每个 Token 激活 $K$ 个专家。

DeepSeek-MoE 将每个专家沿中间维度切分成 $m$ 个更小的细粒度专家：
- **总专家数**：$N_{\\text{fine}} = m \\times N$
- **单专家隐层维度**：$d_{\\text{fine}} = \\frac{d_{\\text{ff}}}{m}$
- **激活专家数**：$K_{\\text{fine}} = m \\times K$

### 计算量（FLOPs）守恒证明
每个 Token 经过激活专家的计算开销为：
$$\\text{FLOPs} \\propto K_{\\text{fine}} \\times d_{\\text{fine}} = (m \\cdot K) \\times \\left( \\frac{d_{\\text{ff}}}{m} \\right) = K \\cdot d_{\\text{ff}}$$
计算量**丝毫不增**，显存访存带宽需求完全一致！

## 惊人的组合爆炸（Combinatorial Explosion）

以典型配置对比组合空间的变化：

| 架构策略 | 候选专家数 $N$ | 激活专家数 $K$ | 专家组合可能性 $\\binom{N}{K}$ |
| --- | --- | --- | --- |
| **传统粗粒度 (Mixtral 风格)** | $8$ | $2$ | $\\binom{8}{2} = \\mathbf{28}$ |
| **细粒度切分 ($m=4$)** | $32$ | $8$ | $\\binom{32}{8} = \\mathbf{10,518,300}$ (1050 万) |
| **深度切分 ($m=8$)** | $64$ | $16$ | $\\binom{64}{16} \\approx \\mathbf{4.88 \\times 10^{14}}$ (488 万亿) |

从区区 28 种可能跃升到万亿级组合！这赋予了模型近乎无限的**动态神经通路定制能力**：
- 面对一段 Python 数据分析代码：可以同时激活“Python 语法专家”、“Pandas 算子专家”、“数学推导专家”与“类型检查专家”；
- 每个小专家只需要专精于极小维度的概念，从根本上消除了单个神经元/专家的知识污染与干扰。

<TransformerArchDemo />
`,
        tips: [
          {
            kind: 'note',
            text: '细粒度专家切分越细越好吗？并非无上限。过细的切分会导致单专家的 GEMM 矩阵尺寸变窄（Memory-bound 严重），降低 GPU Tensor Core 矩阵乘法的硬件算力利用率（MFU），同时增加路由门控与网络通信调度的调度开销。工程上通常切分因子 m 取 4~16 为黄金平衡点。',
          },
        ],
      },
      {
        id: 'llm-a4-c4-l3',
        title: '共享专家机制（Shared Experts）',
        content: `
## 为什么必须有“共享专家”？

在细粒度切分之后，DeepSeek-MoE 观察到了另一个关键痛点：**共性常识冗余**。

无论一个 Token 是属于代数公式、古诗词还是 C++ 指针，它们都需要依赖共同的基础语义理解（如标点符号规律、主谓宾连接词、代词指代）。
如果所有专家都是动态竞争路由的：
1. 那些被分到不同领域的专家，不得不在各自的参数空间里重新学习一遍这些基础语言常识；
2. 宝贵的路由容量（Routing Capacity）被大量消耗在平庸的通用知识上。

## 共享 + 路由专家混合架构

DeepSeek-MoE 提出：**将专家划分为“共享专家（Shared Experts）”与“路由专家（Routed Experts）”两类**。

\`\`\`
          输入表征 x
         /         \\
        /           \\
 [共享专家]      [门控路由器]
 (无条件全激活)        |
      |          Top-K 选路
      |               |
      |          [路由专家池]
      |          (稀疏激活)
      \\              /
       \\            /
        \\          /
         [ 加权求和输出 y ]
\`\`\`

### 严格的数学形式
设共享专家集合为 $\\mathcal{S} = \\{1, \\dots, K_s\\}$，路由专家集合为 $\\mathcal{R} = \\{1, \\dots, N_r\\}$。
对于输入 $x$：

$$y = \\underbrace{\\sum_{i \\in \\mathcal{S}} \\text{SharedExpert}_i(x)}_{\\text{共享专家分支（无条件全量参与）}} + \\underbrace{\\sum_{j \\in \\text{Top-}K_r} g_j(x) \\cdot \\text{RoutedExpert}_j(x)}_{\\text{路由专家分支（稀疏动态激活）}}$$

其中路由门控权重 $g_j(x)$ 仅在选出的 $K_r$ 个路由专家打分之间进行 Softmax 归一化。

## 架构优势与实证结论

1. **常识沉淀**：
   共享专家像一块海绵，主动吸收所有数据中高度共享的通识规律、句法结构与常识逻辑。
2. **专长聚焦**：
   路由专家彻底卸下常识包袱，能够心无旁骛地专精于差异化极强的特定领域或专业长尾知识。
3. **无缝平替与超越**：
   在相同总参数量与相同计算 FLOPs 下，DeepSeek-MoE 相比传统 GShard/Switch 架构，在 Pile 代码、GSM8K 数学及多语言评测中展现出全面且显著的 Perplexity 优势。

<TransformerArchDemo />
`,
        tips: [
          {
            kind: 'interview',
            text: '面试高频追问：共享专家有门控权重吗？没有！共享专家无条件参与所有 token 的计算，其权重固定为 1（或直接作为残差分支叠加），不参与 Top-K 竞争，从而保证底层通用表征永不丢失。',
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-a4-c4-e1',
        question: '某 Token 经过 Mixtral 8x7B 门控网络后，未归一化的 Top-2 专家 logits 分别为 3.0 和 1.0（其余专家打分极小可忽略）。求经过重新归一化（Re-normalization）后，第 1 个专家的最终门控权重。',
        type: 'single',
        difficulty: 2,
        options: [
          { value: 'a', text: '约 0.88' },
          { value: 'b', text: '约 0.50' },
          { value: 'c', text: '约 0.95' },
          { value: 'd', text: '约 0.73' },
        ],
        answer: 'a',
        explanation:
          '重新归一化只在选中的 Top-2 专家打分上执行 Softmax：w1 = exp(3.0) / (exp(3.0) + exp(1.0)) = 20.0855 / (20.0855 + 2.7183) = 20.0855 / 22.8038 ≈ 0.8808。',
      },
      {
        id: 'llm-a4-c4-e2',
        question: 'Mixtral 8x7B 拥有 8 个专家并采用 Top-2 路由。在单个 Transformer 层中，理论上最多存在多少种不同的专家组合激活模式？',
        type: 'single',
        difficulty: 1,
        options: [
          { value: 'a', text: '16 种' },
          { value: 'b', text: '28 种' },
          { value: 'c', text: '56 种' },
          { value: 'd', text: '64 种' },
        ],
        answer: 'b',
        explanation:
          '从 8 个互不相同的专家中无序挑选 2 个，组合数为 C(8, 2) = (8 × 7) / (2 × 1) = 28 种。',
      },
      {
        id: 'llm-a4-c4-e3',
        question: '一个粗粒度 MoE 层包含 8 个专家，隐层维度 4096，每个 Token 激活 2 个专家。若采用细粒度切分，将每个专家切为 4 个子专家（共 32 个），且激活专家数增加为 8 个。此时每个 Token 的 FFN 计算量（FLOPs）如何变化？',
        type: 'single',
        difficulty: 2,
        options: [
          { value: 'a', text: '减少为原来的 1/4' },
          { value: 'b', text: '保持严格相等' },
          { value: 'c', text: '增加为原来的 4 倍' },
          { value: 'd', text: '增加为原来的 2 倍' },
        ],
        answer: 'b',
        explanation:
          '原粗粒度专家激活总隐层维度 = 2 × 4096 = 8192。细粒度切分后，每个小专家隐层维度 = 4096 / 4 = 1024，激活 8 个小专家后的总隐层维度 = 8 × 1024 = 8192。因此每个 Token 的激活矩阵乘法计算量严格保持不变！',
      },
      {
        id: 'llm-a4-c4-e4',
        question: '对于上述粗粒度 MoE（8 选 2，共 28 种组合）切分为细粒度 MoE（32 选 8），其专家激活组合数大约扩大了多少倍？',
        type: 'single',
        difficulty: 2,
        options: [
          { value: 'a', text: '约 4 倍' },
          { value: 'b', text: '约 375 倍' },
          { value: 'c', text: '约 37.5 万倍（> 1000 万种组合）' },
          { value: 'd', text: '约 100 万倍' },
        ],
        answer: 'c',
        explanation:
          'C(32, 8) = 10,518,300。原组合数 C(8, 2) = 28。10,518,300 / 28 ≈ 375,653 倍（约 37.5 万倍）！组合表达能力发生质的飞跃。',
      },
      {
        id: 'llm-a4-c4-e5',
        question: '在 DeepSeek-MoE 中，共享专家（Shared Experts）的主要设计目的是什么？',
        type: 'single',
        difficulty: 1,
        options: [
          { value: 'a', text: '专门处理长文档尾部 token' },
          { value: 'b', text: '无条件吸收各领域通用的基础语言常识，避免动态路由专家重复学习冗余知识' },
          { value: 'c', text: '在所有 GPU 节点之间同步梯度' },
          { value: 'd', text: '替代 Self-Attention 层的位置编码' },
        ],
        answer: 'b',
        explanation:
          '共享专家无条件参与所有 Token 计算，专门捕获全局高频通用语言特征，使路由专家能够专注专精于细分特异领域。',
      },
      {
        id: 'llm-a4-c4-e6',
        question: '在 Mixtral 8x7B 和 DeepSeek-MoE 中，多头自注意力（Self-Attention）和嵌入层也分别被每个专家独立复制了一份。',
        type: 'judge',
        difficulty: 1,
        answer: false,
        explanation:
          '错误。几乎所有主流 MoE 模型中，自注意力（Attention）、LayerNorm/RMSNorm 和词嵌入（Embedding）都是全局共享的，仅仅将前馈网络（FFN）替换为多个专家网络。',
      },
      {
        id: 'llm-a4-c4-e7',
        question: '在 DeepSeek-MoE 前向传播中，共享专家的输出会乘以门控路由网络生成的 Top-K 归一化 Softmax 权重。',
        type: 'judge',
        difficulty: 1,
        answer: false,
        explanation:
          '错误。共享专家独立于路由专家之外，不参与门控的 Top-K 选拔，也不乘以 Softmax 权重，而是直接全量前向后与路由专家的加权结果相加。',
      },
      {
        id: 'llm-a4-c4-e8',
        question: '实现 top2_gating 函数：接收 logits 向量（形状为 (num_experts,)），找出最大的 2 个专家的索引及其重新归一化后的 Softmax 权重。',
        type: 'code',
        difficulty: 3,
        explanation:
          '利用 argsort 提取 logits 最大的前 2 个专家下标并反转为降序，接着对这 2 个专家的 logits 进行局部 Softmax 归一化，得到权重和严格为 1.0 的门控分布。',
        starterCode: `import numpy as np

def top2_gating(logits: np.ndarray):
    """
    输入:
      logits: 形状为 (num_experts,) 的一维 numpy 浮点数组
    输出:
      indices: 包含 2 个选中专家下标的列表（按打分从大到小排序）
      weights: 包含 2 个对应权重的列表（两者之和必须为 1.0）
    """
    # 请在此编写你的代码
    pass
`,
        expectedOutput: `indices: [3, 0], weights: [0.880797, 0.119203]`,
        answer: `import numpy as np

def top2_gating(logits: np.ndarray):
    top2_idx = np.argsort(logits)[-2:][::-1]
    top2_logits = logits[top2_idx]
    # Softmax on top-2
    exp_vals = np.exp(top2_logits - np.max(top2_logits))
    weights = exp_vals / np.sum(exp_vals)
    return list(top2_idx), list(np.round(weights, 6))

logits = np.array([1.0, -0.5, 0.2, 3.0, -1.2])
idx, w = top2_gating(logits)
print(f"indices: {idx}, weights: [{w[0]:.6f}, {w[1]:.6f}]")
`,
        tests: `import numpy as np
logits = np.array([1.0, -0.5, 0.2, 3.0, -1.2])
idx, w = top2_gating(logits)
assert idx == [3, 0]
assert abs(sum(w) - 1.0) < 1e-4
assert round(float(w[0]), 4) == 0.8808`,
      },
      {
        id: 'llm-a4-c4-e9',
        question: '实现 fine_grained_moe_forward 函数：结合共享专家输出与路由专家加权输出，计算最终的 MoE 隐层输出。',
        type: 'code',
        difficulty: 3,
        explanation:
          '共享专家无条件直接累加（权重为 1），各路由专家按其 Softmax 权重加权求和，两者相加得到最终的 MoE 隐层输出。',
        starterCode: `import numpy as np

def fine_grained_moe_forward(shared_outputs: list, routed_outputs: list, routed_weights: list) -> np.ndarray:
    """
    输入:
      shared_outputs: 包含各共享专家输出向量的列表，每个元素形状为 (d_model,)
      routed_outputs: 包含入选路由专家输出向量的列表，每个元素形状为 (d_model,)
      routed_weights: 包含入选路由专家权重的浮点数列表（与 routed_outputs 一一对应）
    输出:
      final_y: 加权求和后的 (d_model,) 输出向量
    """
    # 请在此编写你的代码
    pass
`,
        expectedOutput: `final_y sum: 15.0000`,
        answer: `import numpy as np

def fine_grained_moe_forward(shared_outputs: list, routed_outputs: list, routed_weights: list) -> np.ndarray:
    y = np.zeros_like(shared_outputs[0], dtype=float)
    for so in shared_outputs:
        y += so
    for ro, rw in zip(routed_outputs, routed_weights):
        y += rw * ro
    return y

s_outs = [np.ones(4) * 2.0]
r_outs = [np.ones(4) * 3.0, np.ones(4) * 1.0]
r_weights = [0.75, 0.25]
res = fine_grained_moe_forward(s_outs, r_outs, r_weights)
print(f"final_y sum: {np.sum(res):.4f}")
`,
        tests: `import numpy as np
s = [np.ones(4) * 2.0]
r = [np.ones(4) * 3.0, np.ones(4) * 1.0]
w = [0.75, 0.25]
res = fine_grained_moe_forward(s, r, w)
assert np.allclose(res, np.ones(4) * 4.5)
assert round(float(np.sum(res)), 2) == 18.0`,
      },
      {
        id: 'llm-a4-c4-e10',
        question: '简要说明 DeepSeek-MoE 相比传统粗粒度 MoE（如 Mixtral）能够取得更好性能的两个核心结构原因。',
        type: 'open',
        difficulty: 3,
        explanation:
          '细粒度专家切分化整为零，组合空间呈组合数爆炸增长，减少了知识混杂与干扰；共享专家机制承接通用语法常识，避免动态专家重复学习冗余知识。',
        referenceAnswer:
          '1. 细粒度专家切分（Fine-Grained Segmentation）：在保持总计算 FLOPs 不变的前提下，将大专家切为小专家并增加激活专家数，组合空间从十几种爆发至数千万种，大幅减少知识混杂与干扰，带来更精准的专业化分工；\n2. 共享专家机制（Shared Experts）：设置常驻无条件激活的共享专家集中学习所有领域的通用语法与基础常识，解除路由专家的常识记忆负担，让动态路由专家专注于特定领域的专业表征。',
        rubric: [
          { point: '细粒度切分减少知识混杂并扩大组合空间', score: 5 },
          { point: '共享专家机制承接通用知识释放路由专家专精能力', score: 5 },
        ],
        keywords: ['细粒度', '组合爆炸', '共享专家', '知识混杂', '常识'],
      },
    ],
  },

  /* ============================================================
   *  c5：DeepSeek-V3：无辅助损失负载均衡与超大规模 MoE 工程
   * ============================================================ */
  {
    id: 'llm-a4-c5',
    title: 'DeepSeek-V3 核心架构：无辅助损失负载均衡与工程落地',
    goal: '深入理解现代千亿级 MoE 的最高工程范式：掌握传统辅助负载损失的根本缺陷、DeepSeek-V3 创新的无辅助损失动态偏置算法、设备受限路由通信优化，以及在集群中部署大规模 MoE 的核心挑战。',
    lessons: [
      {
        id: 'llm-a4-c5-l1',
        title: '传统辅助损失的困境与动态偏置校准',
        content: `
## 经典负载均衡辅助损失的双刃剑

在 Switch Transformer 和 GShard 中，为了防止门控网络退化为只路由到少数几个热门专家的“胜者全拿（Winner-Takes-All）”崩溃现象，模型引入了**辅助负载均衡损失（Auxiliary Loss）**：

$$\\mathcal{L}_{\\text{aux}} = \\alpha \\cdot N \\sum_{i=1}^N f_i \\cdot P_i$$

其中 $f_i$ 是路由到专家 $i$ 的 Token 实际比例，$P_i$ 是门控对专家 $i$ 的平均预测概率，$\\alpha$ 是超参数（如 0.01）。

### 为什么说辅助损失是在“自残”？
1. **强行拉平违背了知识的自然分布**：
   现实语言中，常见动词、语法连接词的出现频率本就远高于“量子力学”或“病理学诊断”。辅助损失强行要求所有专家被选中的概率均等，**迫使模型将无关 Token 强行塞给冷门专家**。
2. **伤害模型核心表现**：
   超参数 $\\alpha$ 形成致命死锁：
   - $\\alpha$ 太大：模型将主要梯度消耗在满足平衡惩罚上，语言建模的主任务损失（Cross-Entropy）明显恶化；
   - $\\alpha$ 太小：无法遏制专家负载倾斜，引发严重的显存溢出与 GPU 节点空等气泡。

## DeepSeek-V3 破局：无辅助损失负载均衡

DeepSeek-V3 彻底革新了这一思路，提出了 **Auxiliary-Loss-Free Load Balancing（无辅助损失负载均衡）**：

> **核心洞察**：**坚决不向反向传播的目标函数中引入任何破坏主任务学习的惩罚梯度！**
> 负载均衡不通过梯度下降解决，而是在前向推理选路阶段，通过一个自适应的**动态偏置项（Dynamic Bias）**进行在线校准！

### 算法运行机制

门控网络在计算专家亲和度时，为每个专家维护一个动态偏置标量 $b_i$：

$$\\text{Routing Score}_i = S_i + b_i$$

其中 $S_i$ 为 Token 与专家的原始投影亲和度（经 Sigmoid 或归一化计算）。

在训练每一步的批次（Step）结束之后，系统根据当前 Batch 内各专家的实际 Token 接收量，**直接更新偏置项 $b_i$**：

$$b_i \\leftarrow \\begin{cases} b_i - \\gamma & \\text{如果专家 } i \\text{ 超载（Token 数量过多）} \\\\ b_i + \\gamma & \\text{如果专家 } i \\text{ 饥饿（Token 数量过少）} \\end{cases}$$

其中 $\\gamma$ 为极小的步长调整量。

\`\`\`
          [ Token 表征 x ]
                 |
      [ 计算原始打分 S_i ]
                 |
        [ 叠加密度偏置 + b_i ] (在线反馈自适应调整)
                 |
        [ Top-K 选路决策 ]
                 |
    +------------+------------+
    | 选出路由专家            | 门控主干反向传播
    v                         v
 [专家前向计算]         (梯度仅流经原始 S_i，
                         偏置项 b_i 梯度被 detach 截断！)
\`\`\`

### 为什么这种设计极其强大？
1. **零性能惩罚**：
   偏置项 $b_i$ 的更新独立于反向传播链（在计算图上被 \`detach\`），**反向传播梯度 100% 专注于语言建模本身**，保留了纯粹的知识表征！
2. **实时鲁棒收敛**：
   若某专家变热，其 $b_i$ 迅速下调，后续 token 就会自动转向其他专家；若某专家过冷，其 $b_i$ 上调获得更多曝光机会。系统在训练全流程中自然维持准完美的负载均衡。

<PPOClipDemo />
`,
        tips: [
          {
            kind: 'interview',
            text: '面试核心考察点：DeepSeek-V3 无辅助损失负载均衡的本质是什么？答：它是控制论中的在线负反馈机制（Online Feedback Control），将传统依赖梯度下降的“硬约束惩罚”转变为前向路由层面的“自适应动态偏置调整”，彻底解耦了负载均衡与表征学习。',
          },
        ],
      },
      {
        id: 'llm-a4-c5-l2',
        title: '设备受限路由与 All-to-All 通信瓶颈',
        content: `
## 分布式 MoE 的天堑：专家并行（EP）与通信

在千亿参数规模下（例如 DeepSeek-V3 拥有 256 个路由专家，总参数 671B），单一 GPU 显卡无法容纳全部专家，必须采用 **专家并行（Expert Parallelism, EP）**：
- 将 256 个专家均匀分散在由许多台服务器构成的 GPU 集群中（例如 32 台服务器，每台 8 张 H800，共 256 卡，每卡存放 1 个专家）。

### 致命的跨机 All-to-All 通信
每个 Token 被不同 GPU 上的注意力层计算完成后，需要根据门控决策，**通过网络发送给对应的专家所在的 GPU**。
在专家计算完成后，还要通过网络将结果发回原始 GPU。
这构成了极度密集的 **All-to-All 全交换跨机网络通信**！

跨机网络带宽（以太网 RoCE 或 InfiniBand 400Gbps）远小于机内 NVLink（900GB/s），跨机网络拥堵会直接导致整个 GPU 集群长时间陷入通信等待停顿！

## DeepSeek-V3 的设备受限路由（Device-Limited Routing）

为了斩断跨机通信的咽喉，DeepSeek-V3 提出了 **设备受限路由机制**：

> **规则**：对于任意一个 Token，尽管它需要激活 8 个路由专家，但门控路由施加硬性约束：**选出的这 8 个专家，所驻留的物理机节点数量最多不能超过 $M$ 个（例如 $M \\le 4$）**！

\`\`\`
             Token 待选 8 个专家
               /              \\
    [传统无约束路由]          [设备受限路由]
    专家分散在 8 个不同机柜   专家被约束在最多 4 台机器内
    产生 8 条跨机传输流       产生跨机通信流减半，机内 NVLink 分担
    网络拥塞，通信成为瓶颈   极致压减跨机吞吐，通信开销大幅降低
\`\`\`

### 实施策略
1. 首先计算每个专家所在的节点综合打分（Node Affinity）；
2. 选出得分最高的 $M$ 个候选物理机节点；
3. 随后仅在这 $M$ 个物理机所包含的专家子集中挑选出 Top-$K$ 个路由专家。

这种通信拓扑感知路由（Topology-Aware Routing）将集群跨节点网络的并发链接数和传输量削减了 50% 以上，使得千卡集群的专家并行扩展效率维持在 90% 以上！

<PipelineScheduleDemo />
`,
        tips: [
          {
            kind: 'note',
            text: '为什么限制在 M 个节点不会大幅损失模型精度？因为 DeepSeek-V3 拥有 256 个细粒度小专家，在单个物理节点（8 张 GPU）上就驻留了多达 8 个专家。候选池足够深厚，即使限制在 4 个节点（共 32 个候选小专家）中挑选 8 个，组合数依然庞大，足以提供充足的模型表征自由度。',
          },
        ],
      },
      {
        id: 'llm-a4-c5-l3',
        title: 'MoE 推理部署与显存显卡选型算网工程',
        content: `
## 训练爽快，推理头疼：MoE 的部署实战法则

许多团队在第一次落地 MoE 时会陷入误区：“既然 DeepSeek-V3 激活参数只有 37B，那我拿两张 80G A100 是不是就能把它跑起来？”
**答案是绝对不行！**

### 1. 显存占用的残酷现实：总参数决定显存下限
- **训练/推理显存占用**：
  即便每个 Token 只经过 37B 激活参数，**模型全部 671B 参数必须常驻在显存中**！
  - FP16/BF16 权重：$671 \\text{B} \\times 2 \\approx 1342 \\text{ GB}$（至少需要 17 张 80G GPU 才能放得下权重！）；
  - FP8 量化权重：$671 \\text{B} \\times 1 \\approx 671 \\text{ GB}$（至少需要 9~10 张 80G GPU）；
  - INT4 量化权重：约 $340 \\text{ GB}$（至少 5 张 80G GPU）。
- **结论**：**MoE 节省的是计算算力（FLOPs）与生成时间（延迟），而不是显存容量！**

## 推理阶段的专家负载倾斜（Expert Skewing）

在离线批量生成或高并发在线推理时，MoE 面临严重的**长尾倾斜**：
- 某些通用领域的专家（如处理日常对话的专家）命中率极高，承载了大量 Token；
- 某些专业领域的冷门专家处理的 Token 很少。

在张量并行与专家并行服务中，这会导致承载热门专家的 GPU 跑满算力，而其他 GPU 处于闲置等待状态，拖慢整个 Batch 的生成速度。

### 生产级应对方案
1. **动态批处理（Dynamic Batching）与 Token 重组**：
   vLLM 等现代推理引擎通过建立专家维度的 Token Queue，将分配给同一专家的 Token 跨请求打包成致密的 GEMM 计算，提升硬件 MFU；
2. **多副本部署（Replicated Hot Experts）**：
   通过在线统计，将最高频的前 5% 热门专家复制多份并放置在所有 GPU 上（类似于共享专家），分流流量热点；
3. **推测解码（Speculative Decoding）加速**：
   利用小型稠密模型或者共享专家快速生成草稿 Token，再由完整 MoE 进行并行验证，进一步榨干 GPU 内存带宽。
`,
        tips: [
          {
            kind: 'interview',
            text: '面试总结必背金句：MoE 模型在经济学上的本质，是用“显存容量（RAM/VRAM）”置换“计算延迟（Compute Latency）”。对于高并发场景，MoE 的吞吐量和单 Token 成本具有稠密模型无可比拟的巨大优势。',
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-a4-c5-e1',
        question: '在传统 MoE 训练中，当辅助负载均衡损失权重 alpha 设置过高时，通常会导致以下哪种不良后果？',
        type: 'single',
        difficulty: 2,
        options: [
          { value: 'a', text: '门控网络崩溃为单一专家，发生死锁' },
          { value: 'b', text: '模型主任务交叉熵损失（Perplexity）恶化，强行将无关 token 路由给冷门专家' },
          { value: 'c', text: 'GPU 通信带宽被降至零' },
          { value: 'd', text: '注意力矩阵出现梯度爆炸' },
        ],
        answer: 'b',
        explanation:
          '辅助损失若权重过大，模型会把优化重心偏向“让专家利用率看起来均等”，导致 token 被错误地强行分配到不对口的不匹配专家，从而损害语言建模本身的质量。',
      },
      {
        id: 'llm-a4-c5-e2',
        question: '在 DeepSeek-V3 的无辅助损失负载均衡机制中，如果在当前训练步中，专家 A 接收到的 Token 总量超过了平均目标水平（处于过载状态），系统会如何调整专家 A 的门控偏置项 b_A？',
        type: 'single',
        difficulty: 1,
        options: [
          { value: 'a', text: '将 b_A 加上一个正步长 gamma' },
          { value: 'b', text: '将 b_A 减去一个正步长 gamma，降低其在后续选路中的竞争力' },
          { value: 'c', text: '直接将 b_A 重置为零' },
          { value: 'd', text: '通过反向传播计算 dLoss/db_A 梯度更新' },
        ],
        answer: 'b',
        explanation:
          '当某个专家过载时，自适应控制器会向下微调其偏置项（b_i ← b_i - gamma），使其得分在后续 token 的竞争中略微处于劣势，从而平滑地将流量引导至其他相对空闲的专家。',
      },
      {
        id: 'llm-a4-c5-e3',
        question: '在 DeepSeek-V3 中，动态偏置项 b_i 会作为可学习参数参与反向传播，其梯度会直接更新门控路由器的线性层权重。',
        type: 'judge',
        difficulty: 2,
        answer: false,
        explanation:
          '错误。动态偏置项 b_i 是通过训练步结束后的统计信息独立更新的，在计算图上完全脱离反向传播（detached），不会向门控网络传播任何对抗主任务的梯度。',
      },
      {
        id: 'llm-a4-c5-e4',
        question: 'DeepSeek-V3 限制每个 Token 激活的 8 个专家最多分布在 M 个物理节点（机器）上。这种“设备受限路由”最主要的收益是什么？',
        type: 'single',
        difficulty: 1,
        options: [
          { value: 'a', text: '大幅减少跨节点（跨机）All-to-All 网络通信的并发链接数和传输拥塞' },
          { value: 'b', text: '完全省去自注意力计算' },
          { value: 'c', text: '使模型参数量减少一半' },
          { value: 'd', text: '消除对 RoPE 位置编码的需求' },
        ],
        answer: 'a',
        explanation:
          '在超大规模专家并行（EP）集群中，跨机网络带宽是最大吞吐瓶颈。限制每个 token 的跨机路由范围，能成倍减少慢速跨机网络的数据包交换，显著降低通信开销。',
      },
      {
        id: 'llm-a4-c5-e5',
        question: 'DeepSeek-V3 拥有约 671B 的总参数量，但在处理每个 Token 时，其激活的参数量仅约为多少？',
        type: 'single',
        difficulty: 1,
        options: [
          { value: 'a', text: '约 7B' },
          { value: 'b', text: '约 37B（含共享专家与注意力）' },
          { value: 'c', text: '约 120B' },
          { value: 'd', text: '约 671B' },
        ],
        answer: 'b',
        explanation:
          'DeepSeek-V3 的总参数为 671B，但凭借 256 选 8 的细粒度路由专家加上 1 个常驻共享专家，每 token 的激活参数仅约 37B，计算成本极其亲民。',
      },
      {
        id: 'llm-a4-c5-e6',
        question: '由于 671B 的 MoE 模型每个 Token 仅激活 37B 参数，因此在部署推理服务时，我们只需要准备足以容纳 37B 稠密模型的 GPU 显存即可运行完整模型。',
        type: 'judge',
        difficulty: 1,
        answer: false,
        explanation:
          '错误。虽然单 token 激活 37B，但所有 671B 的专家权重都必须常驻在 GPU 显存中待命（因为任何 token 都可能路由到任意专家），因此显存容量必须满足全部 671B 权重的存放需求。',
      },
      {
        id: 'llm-a4-c5-e7',
        question: '实现 update_expert_biases 函数：根据当前 Batch 内各专家的分配 Token 计数与目标平均配额，按固定步长调整偏置数组。',
        type: 'code',
        difficulty: 2,
        explanation:
          '偏置项自适应控制器：对高于均值的专家扣减偏置以平抑流量，对低于均值的专家增加偏置以补充流量，实现无辅助损失的实时负载均衡。',
        starterCode: `import numpy as np

def update_expert_biases(current_biases: np.ndarray, token_counts: np.ndarray, gamma: float = 0.01) -> np.ndarray:
    """
    输入:
      current_biases: 当前各专家的偏置数组，形状为 (num_experts,)
      token_counts: 当前批次各专家接收到的 Token 数量，形状为 (num_experts,)
      gamma: 调整步长
    规则:
      设 target = np.mean(token_counts)
      若 token_counts[i] > target: biases[i] 减去 gamma
      若 token_counts[i] < target: biases[i] 加上 gamma
      若 token_counts[i] == target: 保持不变
    输出:
      更新后的 biases 数组（四舍五入保留 4 位小数）
    """
    # 请在此编写你的代码
    pass
`,
        expectedOutput: `updated: [-0.01  0.01 -0.01  0.01]`,
        answer: `import numpy as np

def update_expert_biases(current_biases: np.ndarray, token_counts: np.ndarray, gamma: float = 0.01) -> np.ndarray:
    target = np.mean(token_counts)
    new_biases = current_biases.copy()
    for i in range(len(new_biases)):
        if token_counts[i] > target:
            new_biases[i] -= gamma
        elif token_counts[i] < target:
            new_biases[i] += gamma
    return np.round(new_biases, 4)

b = np.zeros(4)
counts = np.array([120, 80, 150, 50])
res = update_expert_biases(b, counts, gamma=0.01)
print(f"updated: {res}")
`,
        tests: `import numpy as np
b = np.zeros(4)
c = np.array([120, 80, 150, 50])
res = update_expert_biases(b, c, 0.01)
assert list(res) == [-0.01, 0.01, -0.01, 0.01]`,
      },
      {
        id: 'llm-a4-c5-e8',
        question: '实现 device_limited_routing 函数：根据专家所属节点，首先挑选打分最高的 M 个物理节点，再在这些节点包含的专家中挑选 Top-K 专家。',
        type: 'code',
        difficulty: 3,
        explanation:
          '设备受限选路：先按节点聚合专家得分选出 Top-M 机器节点，再从候选节点所包含的专家池中挑选最终的 Top-K 专家，有效限制跨机通信域。',
        starterCode: `import numpy as np

def device_limited_routing(scores: np.ndarray, expert_to_node: dict, max_nodes: int, top_k: int) -> list:
    """
    输入:
      scores: 各专家的路由得分，长度为 num_experts 的一维数组
      expert_to_node: 字典，键为专家下标（int），值为节点编号（int）
      max_nodes: 允许跨越的最大节点数 M
      top_k: 最终选取的专家数量 K
    步骤:
      1. 计算每个节点的分数（该节点下所有专家 scores 的最大值）
      2. 选出得分最高的 max_nodes 个节点
      3. 在属于这 M 个节点的专家中，选出得分最高的 top_k 个专家下标
    输出:
      选出的 top_k 个专家下标列表（按得分从高到低排序）
    """
    # 请在此编写你的代码
    pass
`,
        expectedOutput: `selected experts: [4, 5, 0]`,
        answer: `import numpy as np

def device_limited_routing(scores: np.ndarray, expert_to_node: dict, max_nodes: int, top_k: int) -> list:
    node_to_experts = {}
    for exp_id, node_id in expert_to_node.items():
        node_to_experts.setdefault(node_id, []).append(exp_id)
    
    # 1. 节点分数（节点内专家最高分）
    node_scores = {nid: max(scores[eid] for eid in eids) for nid, eids in node_to_experts.items()}
    
    # 2. 选出 top M 节点
    sorted_nodes = sorted(node_scores.keys(), key=lambda n: node_scores[n], reverse=True)[:max_nodes]
    
    # 3. 候选专家池
    candidate_experts = []
    for nid in sorted_nodes:
        candidate_experts.extend(node_to_experts[nid])
        
    # 4. 在候选池中选 top K
    selected = sorted(candidate_experts, key=lambda eid: scores[eid], reverse=True)[:top_k]
    return selected

scores = np.array([2.5, 1.2, 0.5, 0.8, 4.0, 3.1])
# 专家 0,1 在节点 0；专家 2,3 在节点 1；专家 4,5 在节点 2
exp_node = {0: 0, 1: 0, 2: 1, 3: 1, 4: 2, 5: 2}
sel = device_limited_routing(scores, exp_node, max_nodes=2, top_k=3)
print(f"selected experts: {sel}")
`,
        tests: `import numpy as np
s = np.array([2.5, 1.2, 0.5, 0.8, 4.0, 3.1])
en = {0: 0, 1: 0, 2: 1, 3: 1, 4: 2, 5: 2}
sel = device_limited_routing(s, en, 2, 3)
assert sel == [4, 5, 0]`,
      },
      {
        id: 'llm-a4-c5-e9',
        question: '某 MoE 模型总参数为 400B，其中自注意力与嵌入等共享参数为 40B，其余 360B 均分在 64 个路由专家中。每个 Token 激活 4 个专家。求：1）该模型单个 Token 前向计算时的等效激活参数量；2）若采用 FP8 格式部署权重，至少需要多少 GB 显存？',
        type: 'single',
        difficulty: 2,
        options: [
          { value: 'a', text: '1）62.5B；2）约 400 GB' },
          { value: 'b', text: '1）40B；2）约 200 GB' },
          { value: 'c', text: '1）100B；2）约 800 GB' },
          { value: 'd', text: '1）22.5B；2）约 360 GB' },
        ],
        answer: 'a',
        explanation:
          '1）单专家参数量 = 360B / 64 = 5.625B。激活 4 个专家的参数量 = 4 × 5.625B = 22.5B。加上共享参数 40B，总激活参数量 = 40B + 22.5B = 62.5B；2）FP8 权重每参数占 1 字节，400B 参数需要 400 GB 显存。',
      },
      {
        id: 'llm-a4-c5-e10',
        question: '简要总结 DeepSeek-V3 在 MoE 架构和工程落地上的两项标志性技术创新及其解决的核心痛点。',
        type: 'open',
        difficulty: 3,
        explanation:
          '无辅助损失负载均衡解耦了负反馈偏置校准与梯度反向传播，消除了主任务损失上升；设备受限路由降低了千卡专家并行 All-to-All 跨机网络通信拥塞。',
        referenceAnswer:
          '1. 无辅助损失负载均衡（Auxiliary-Loss-Free Load Balancing）：放弃向训练损失中添加惩罚项，通过在线动态调整每个专家的路由偏置 b_i 来平衡专家负载，彻底解除了传统平衡损失对模型语言建模精度造成的损伤；\n2. 设备受限路由（Device-Limited Routing）：约束每个 Token 激活的多个专家最多分布在 M 个物理机节点内，大幅削减千卡专家并行（EP）集群间的跨机 All-to-All 网络通信量，突破了分布式 MoE 扩展的通信瓶颈。',
        rubric: [
          { point: '无辅助损失负载均衡与动态偏置校准解耦梯度反传', score: 5 },
          { point: '设备受限路由削减跨机通信拓扑拥塞', score: 5 },
        ],
        keywords: ['无辅助损失', '动态偏置', '设备受限路由', '通信瓶颈', 'All-to-All'],
      },
    ],
  },
];
