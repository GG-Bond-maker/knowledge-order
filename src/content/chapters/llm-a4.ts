import type { Chapter } from '../../types';
import { llmA4ModernChapters } from './llm-a4-extra';

/* ============================================================
 *  《MoE 论文研读》
 *  核心论文：Switch Transformers (Fedus et al., 2022)
 *  补充：Shazeer 2017、GShard (2021)、Mixtral (2024)、DeepSeek-MoE (2024)
 * ============================================================ */

export const llm_a4Chapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c1：MoE 与单专家路由
   * ============================================================ */
  {
    id: 'llm-a4-c1',
    title: 'MoE 与单专家路由',
    goal: '理解稀疏专家混合的动机、Top-1 路由的数学形式，以及"参数量大但计算量小"这一核心权衡。',
    lessons: [
      {
        id: 'llm-a4-c1-l1',
        title: '为什么需要 MoE：容量与算力的解耦',
        content: `
## 学习目标

学完本节，你应该能够：
1. 用"参数量与计算量解耦"一句话说清 MoE 的价值：容量涨、单 token 计算不涨；
2. 写出稀疏门控公式（softmax 打分 + Top-k 选择 + 加权混合），解释每个部件的作用；
3. 手算 Mixtral 的激活比例（12.9B/46.7B ≈ 28%），说明"大而不贵"的会计原理。

## 前置知识

- FFN 的结构（llm-a1 c2-l5：FFN 占一层约 2/3 参数——MoE 改造的正是它）；
- softmax 与 Top-k 操作。

## 问题背景：稠密模型的边际收益递减

稠密模型每涨参数，**每个 token 的计算量同比例上涨**——训练贵、推理慢。但知识记忆（参数）与单步推理（计算）未必需要同量：人类医生也不必在每次问诊时调动全部医学知识。MoE（Mixture of Experts）的思想：把 FFN 复制成 N 份（专家），**每个 token 只激活其中 k 个**——参数容量随 N 增长，单 token 计算量只随 k 增长。Shazeer et al. (2017) 的稀疏门控层让这条路线首次在大规模 LSTM 上可行；Fedus et al. (2022) 的 Switch Transformer 把它带进 Transformer 主流。

## 直觉理解：医院分诊台

稠密模型 = 每个病人都由"全科超级医生"接诊（什么都懂，但挂号费随知识量上涨）；MoE = 分诊台（路由器）把病人送到最对症的 2 个科室（专家）——医院总共有 8 个科室的储备（参数容量），但**单个病人只占用 2 个科室的接诊时间（计算）**。医院越大，科室越多、单次就诊成本不变。

## 核心概念：稀疏门控公式

设 FFN 层被替换为 N 个专家 $\\{E_1..E_N\\}$，门控（路由器）对 token x 打分：

$$g(x) = \\mathrm{softmax}(W_g x), \\qquad \\mathrm{TopK}(g(x), k) = \\{g_{i_1}..g_{i_k}\\}$$

$$y = \\sum_{j \\in \\mathrm{TopK}} g_{i_j}(x) \\cdot E_{i_j}(x)$$

| 部件 | 作用 | 没有它会怎样 |
| --- | --- | --- |
| softmax 打分 | 给每个专家一个归一化"对口程度" | 分数无界、不可比 |
| Top-k 硬选择 | 只留 k 个专家，其余权重置 0 | 全部专家参与 = 稠密、失去稀疏性 |
| 权重再归一化（对 k 个） | 混合时按对口度加权 | 专家输出量纲不一致 |

路由器本身极小（$d \\times N$ 的一个矩阵），计算可忽略；**稀疏性的全部收益来自 Top-k 的"置零"**——被选中专家之外的前向与反向都不发生。

## 完整案例：Mixtral 的会计学

Mixtral 8x7B（Jiang et al., 2024）：8 个专家、每 token Top-2。总参数 46.7B，激活 12.9B——**激活比例 ≈ 28%**。粗算验证：注意力与嵌入等共享参数约 4B + 激活的 2 个 FFN 专家；若每专家约 6.6B，2×6.6 + 共享 ≈ 17B？——正确口径是：Mixtral 的 8x7B 意为"以 7B 稠密模型为底座、FFN 部分复制 8 份"，注意力层不复制。于是：共享部分（注意力+嵌入+LN）≈ 4B 常开，FFN 部分每专家 ≈ (46.7−4)/8 ≈ 5.3B，激活 2 个 ≈ 10.6B + 4B ≈ 14.6B，与论文口径 12.9B 同量级（差异来自精确分层计数）。**结论性读法：它有 47B 的知识容量、13B 的推理成本**。

## 代码实践

\`\`\`python
import numpy as np
rng = np.random.default_rng(0)
d, N, k = 16, 8, 2

Wg = rng.normal(0, 1, (d, N))            # 路由器
E = [rng.normal(0, 1, (d, d)) for _ in range(N)]   # 8 个"专家"（示意：单矩阵）
x = rng.normal(0, 1, d)

g = np.exp(Wg.T @ x); g /= g.sum()       # softmax 打分
top = np.argsort(g)[::-1][:k]            # Top-2
w = g[top] / g[top].sum()                # 选中者权重再归一化
y = sum(wi * np.tanh(E[i] @ x) for wi, i in zip(w, top))
print("各专家得分:", np.round(g, 3))
print(f"Top-{k} 专家: {top}, 权重: {np.round(w, 3)}")
print(f"未激活专家数: {N - k}/{N} -> 其参数本次前后向均不参与")
\`\`\`

预期输出：8 个得分和为 1，Top-2（如专家 6、2）拿到约 0.5–0.7 的选中权重并再归一化；其余 6 个专家**完全静默**——稀疏性的最小可视化。**常见错误**：对全部 N 个专家算 FFN 再乘权重（那是"软 MoE"，计算不省）；Top-k 不可导处的梯度处理（仅选中专家的门控权重接收梯度）。

## 常见误区

1. **"专家 = 领域专家（数学专家/代码专家）"**——实证上专家分工常按 token 分布（标点、数字、语法角色）而非人类语义领域；解释要谨慎；
2. **MoE 省显存**——省的是**计算**；推理部署时全部 N 个专家都要常驻显存（部署课的痛点）；
3. **激活比例越低越好**——Top-1（Switch）训练不稳定需额外技巧；Top-k 太小容量利用不足；
4. **路由器可学坏（坍缩）**——少数专家吸走全部 token，其余饿死；这是下一节负载均衡的主题。

## 知识关联

- **向前**：llm-a1 的 FFN 是被替换的底座；llm-a2 的反向传播解释"未选中专家零梯度"；
- **向后**：下一节容量与丢弃、c4/c5 的 Mixtral/DeepSeek 演进；
- **平行**：GLU 门控（llm-a3 c2-l2）是"特征级门"，MoE 路由是"参数级门"——同一思想的两个尺度。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 一句话 | 参数容量与单 token 计算解耦：容量随 N、计算随 k |
| 公式 | softmax 打分 → Top-k 置零 → 加权混合选中者 |
| Mixtral 会计 | 46.7B 总量 / 12.9B 激活 ≈ 28%，"47B 知识、13B 成本" |
| 命门 | 负载不均（下一节）与部署显存（c5-l3） |

## 参考资料

> **来源类型：学术来源**
> - Shazeer, N., et al. (2017). "Outrageously Large Neural Networks: The Sparsely-Gated Mixture-of-Experts Layer." *ICLR 2017*. arXiv:1701.06538（已核验）——稀疏门控原始论文。
> - Fedus, W., Zoph, B., & Shazeer, N. (2022). "Switch Transformers: Scalable and Efficient Sparsity." *JMLR*, 23(120). arXiv:2101.03961（已核验）——Top-1 路由 + 辅助损失。
>
> **来源类型：原创**
> - 医院分诊比喻与激活比例会计为本课程改编。
`,
        tips: [
          {
            kind: 'interview',
            text: '「MoE 解决什么问题」：把参数量与每 token 计算量解耦。参数很大（容量高）但激活参数很少（算力低）。',
          },
          {
            kind: 'note',
            text: 'MoE 通常只替换 FFN，不动注意力层。FFN 占 Transformer 约 2/3 参数，专家化性价比最高。',
          },
          {
            kind: 'leak',
            text: 'Switch 简化为 Top-1 是重要贡献：通信量、计算量、实现复杂度都显著降低，效果依然优异。',
          },
        ],
        demos: [
          {
            title: '稠密 vs MoE 的参数量与算力对比',
            lang: 'python',
            code: `def dense_params(d_model, d_ff, n_layers):
    per_layer = 4 * d_model ** 2 + 2 * d_model * d_ff
    return n_layers * per_layer

def moe_params(d_model, d_ff, n_layers, n_experts):
    per_layer = 4 * d_model ** 2 + n_experts * 2 * d_model * d_ff
    return n_layers * per_layer

def active_params(d_model, d_ff, n_layers, top_k=1):
    per_layer = 4 * d_model ** 2 + top_k * 2 * d_model * d_ff
    return n_layers * per_layer

d, f, L = 768, 2048, 12
print("=== 稠密 T5-Base 规模 ===")
p_dense = dense_params(d, f, L)
print("总参数", round(p_dense / 1e6), "M")

print()
print("=== MoE（Top-1） ===")
for E in (8, 64, 128):
    p_total = moe_params(d, f, L, E)
    p_act = active_params(d, f, L, 1)
    print(f"  {E:3d} 专家: 总参数 {p_total/1e9:6.2f} B, 激活 {p_act/1e6:5.0f} M")

print()
print("结论：专家数增加时总参数线性增长，但每 token 激活参数几乎不变")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-a4-c1-e1',
        relatedLessonId: 'llm-a4-c1-l1',
        type: 'single',
        difficulty: 2,
        question: 'MoE（混合专家）解决的核心问题是？',
        options: [
          { value: 'A', text: '减少训练数据需求' },
          { value: 'B', text: '把模型参数量与每个 token 的计算量解耦' },
          { value: 'C', text: '消除注意力机制' },
          { value: 'D', text: '减少层数' },
        ],
        answer: 'B',
        explanation: 'MoE 让模型拥有巨大的总参数量（容量高），但每个 token 只激活少数专家（算力低）。这让"参数量"与"推理成本"不再绑定。',
        tags: ['MoE'],
      },
      {
        id: 'llm-a4-c1-e2',
        relatedLessonId: 'llm-a4-c1-l1',
        type: 'judge',
        difficulty: 2,
        question: 'MoE 通常只把 FFN 层替换为多个专家，而注意力层在所有 token 间共享。',
        answer: true,
        explanation: 'FFN 占 Transformer 约 2/3 参数，专家化性价比最高；注意力本身已逐 token 不同，再专家化收益有限且通信开销大。',
        tags: ['MoE 结构'],
      },
      {
        id: 'llm-a4-c1-e3',
        relatedLessonId: 'llm-a4-c1-l1',
        type: 'single',
        difficulty: 3,
        question: 'Switch Transformer 相比此前的 MoE 工作，最重要的简化是？',
        options: [
          { value: 'A', text: '去掉负载均衡损失' },
          { value: 'B', text: '把 Top-2 路由简化为 Top-1 路由' },
          { value: 'C', text: '不再使用门控网络' },
          { value: 'D', text: '只用一个专家' },
        ],
        answer: 'B',
        explanation: 'Top-1 大幅降低了通信量、计算量与实现复杂度，同时通过一系列稳定性技巧保证效果。这证明了"最简单的路由也足够好"。',
        tags: ['Switch Transformer'],
      },
      {
        id: 'llm-a4-c1-e4',
        relatedLessonId: 'llm-a4-c1-l1',
        type: 'multiple',
        difficulty: 3,
        question: '关于 MoE 的"稀疏性"，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '每个 token 只激活部分专家，其余专家不参与计算' },
          { value: 'B', text: '总参数量 = 专家数 × 单专家参数量 + 共享层参数' },
          { value: 'C', text: '每 token 计算量与专家总数成正比' },
          { value: 'D', text: '激活参数量远小于总参数量' },
        ],
        answer: ['A', 'B', 'D'],
        explanation: 'C 错误：每 token 计算量只与 top-k（激活的专家数）成正比，与专家总数无关——这正是稀疏性的价值所在。',
        tags: ['稀疏性'],
      },
      {
        id: 'llm-a4-c1-e5',
        relatedLessonId: 'llm-a4-c1-l1',
        type: 'fill',
        difficulty: 3,
        question: 'MoE 中决定每个 token 分配到哪些专家的模块叫___网络。',
        blanks: [['门控', 'gating', 'Gating', '路由', 'router']],
        explanation: '门控网络对每个 token 输出各专家的分数，选 top-k 后归一化作为权重。它的质量直接决定 MoE 的训练稳定性。',
        tags: ['门控'],
      },
      {
        id: 'llm-a4-c1-e6',
        relatedLessonId: 'llm-a4-c1-l1',
        type: 'code',
        difficulty: 3,
        question:
          '实现 `moe_param_ratio(d_model, d_ff, n_layers, n_experts, top_k=1)`，返回 `(total_params, active_params, ratio)`，ratio = active/total 保留 4 位小数。\n\n- 每层：注意力 4×d_model²（共享）+ 专家 n_experts × 2×d_model×d_ff\n- 激活：注意力 4×d_model² + top_k × 2×d_model×d_ff',
        starterCode: `def moe_param_ratio(d_model, d_ff, n_layers, n_experts, top_k=1):
    attn = 4 * d_model ** 2
    expert_ffn = 2 * d_model * d_ff
    total = ___
    active = ___
    return total, active, round(active / total, 4)


moe_param_ratio(768, 2048, 12, 64, 1)
`,
        setupCode: '',
        expectedOutput: 'ratio 远小于 1',
        tests: `total, active, ratio = moe_param_ratio(768, 2048, 12, 64, 1)
assert total > active, "总参数应大于激活参数"
assert 0 < ratio < 1, f"ratio 应在 (0,1)，实际 {ratio}"
assert ratio < 0.2, f"64 专家 Top-1 时激活比例应很小，实际 {ratio}"
t2, a2, r2 = moe_param_ratio(768, 2048, 12, 128, 1)
assert t2 > total, "专家翻倍总参数应增加"
assert a2 == active, "激活参数不应变化"
assert r2 < ratio, "激活比例应更低"
t3, a3, r3 = moe_param_ratio(768, 2048, 12, 64, 2)
assert a3 > active, "Top-2 激活参数应更多"
`,
        answer: `def moe_param_ratio(d_model, d_ff, n_layers, n_experts, top_k=1):
    attn = 4 * d_model ** 2
    expert_ffn = 2 * d_model * d_ff
    total = n_layers * (attn + n_experts * expert_ffn)
    active = n_layers * (attn + top_k * expert_ffn)
    return total, active, round(active / total, 4)


moe_param_ratio(768, 2048, 12, 64, 1)`,
        explanation:
          '```python\nattn = 4 * d_model ** 2\nexpert_ffn = 2 * d_model * d_ff\ntotal = n_layers * (attn + n_experts * expert_ffn)\nactive = n_layers * (attn + top_k * expert_ffn)\nreturn total, active, round(active / total, 4)\n```\n\n**关键差异**：总参数用 `n_experts`，激活参数用 `top_k`。\n\n这就是 MoE 的核心：专家数增加时总参数线性增长（容量变大），但激活参数不变（算力不变）。',
        tags: ['编程', '参数量'],
      },
      {
        id: 'llm-a4-c1-e7',
        relatedLessonId: 'llm-a4-c1-l1',
        type: 'judge',
        difficulty: 3,
        question: 'MoE 模型的推理成本与同等参数量的稠密模型相同。',
        answer: false,
        explanation: 'MoE 的推理成本接近"激活参数量"对应的稠密模型，远低于同等总参数量的稠密模型。但显存占用仍需容纳全部专家参数，这是 MoE 的主要代价。',
        tags: ['推理成本'],
      },
      {
        id: 'llm-a4-c1-e8',
        relatedLessonId: 'llm-a4-c1-l1',
        type: 'single',
        difficulty: 3,
        question: 'MoE 模型部署时的主要挑战是？',
        options: [
          { value: 'A', text: '计算量太大' },
          { value: 'B', text: '显存要容纳全部专家参数，且专家并行带来通信开销' },
          { value: 'C', text: '无法训练' },
          { value: 'D', text: '不支持 GPU' },
        ],
        answer: 'B',
        explanation: 'MoE 的算力虽低，但所有权重都必须加载（如 Mixtral 8×7B 约 47B 总参数）。此外专家分布在不同设备上，路由需要 all-to-all 通信。',
        tags: ['部署'],
      },
      {
        id: 'llm-a4-c1-e9',
        relatedLessonId: 'llm-a4-c1-l1',
        type: 'open',
        difficulty: 4,
        question:
          '请解释 MoE 为什么能"用更少的算力获得更大的模型容量"，并说明这个优势在训练和推理两个阶段分别体现在哪里、又各自付出什么代价。',
        referenceAnswer: `**为什么能解耦容量与算力**

稠密模型每个 token 都必须流过全部参数，计算量 ∝ 参数量。
MoE 通过门控 + Top-K 路由让每个 token 只进入 K 个专家：

    总参数量   = 共享层（注意力等） + N_experts × 单专家 FFN
    每token算力 = 共享层 + K × 单专家 FFN

当 N_experts 很大而 K 恒为 1~2 时，参数量随 N 线性增长，而算力几乎不变。

**训练阶段**

优势：
- 相同 FLOPs 预算下可使用更大的模型容量，样本效率更高
  （Switch 论文显示同等算力下 MoE 收敛更快、效果更好）；
- 专家可以按设备切分（专家并行），实现超大模型训练。

代价：
- 显存：所有专家参数都要存，还要存优化器状态；
- 通信：路由是动态的，需要 all-to-all 把 token 发到对应设备再收回；
- 训练不稳定：路由容易坍缩，需要辅助负载均衡损失、z-loss、容量因子等技巧。

**推理阶段**

优势：
- 每 token 只算 K 个专家，FLOPs 接近小模型，速度快；
- 可以做到"大模型效果 + 小模型速度"。

代价：
- 显存仍是全部专家（Mixtral 8×7B 需约 47B 参数的显存）；
- 专家并行下需要跨设备通信，延迟增加；
- 批处理效率：不同 token 路由到不同专家，每个专家收到的 batch 变小，
  负载不均时需要冗余专家缓解。

**结论**：MoE 的本质是"用显存和通信换算力效率"。`,
        rubric: [
          { point: '写出总参数 vs 激活参数的公式差异（N_experts vs top_k）', score: 2 },
          { point: '训练优势：同等算力下更大容量、样本效率高', score: 2 },
          { point: '训练代价：显存、all-to-all 通信、负载均衡不稳定', score: 2 },
          { point: '推理代价：仍需全部专家显存、批处理负载不均', score: 2 },
        ],
        keywords: ['解耦', 'top-k', '显存', 'all-to-all', '负载均衡', '样本效率'],
        explanation: '这道题考察对 MoE 权衡的完整理解。能同时说出训练与推理两侧的代价，说明真正理解了架构。',
        tags: ['MoE', '权衡', '面试'],
      },
    ],
  },

  /* ============================================================
   *  c2：专家容量与负载均衡
   * ============================================================ */
  {
    id: 'llm-a4-c2',
    title: '专家容量与负载均衡',
    goal: '理解容量因子与 token 丢弃机制，掌握辅助负载均衡损失与专家坍缩问题。',
    lessons: [
      {
        id: 'llm-a4-c2-l1',
        title: '容量因子与 token 丢弃',
        content: `
## 学习目标

学完本节，你应该能够：
1. 写出专家容量公式 capacity = (tokens/batch ÷ N) × capacity_factor，解释 CF 的缓冲作用；
2. 说明 token 溢出（dropping）的机制与代价（经残差直通），以及为什么 Switch 论文反而推荐低 CF；
3. 用代码模拟路由坍缩与容量截断，观察丢弃率如何随 CF 变化。

## 前置知识

- 上一节的路由公式（Top-k 选择）；
- 残差连接（llm-a1 c2-l4：溢出 token 的逃生通道）。

## 问题背景：路由不均，专家旱涝不均

路由器是"学出来的"，训练早期可能把大量 token 送往少数专家（路由坍缩）：热门专家被打爆、冷门专家饿死（拿不到梯度、永远学不会）。工程解法是**给每个专家设容量上限**：超过的 token 被丢弃（不再经过 FFN，直接走残差连接到下一层）。容量怎么定、丢弃怎么权衡——Switch Transformers 的核心工程贡献。

## 直觉理解：餐厅翻台限流

每桌（专家）座位数 = 客流均摊 × 翻台系数（CF）。CF=1 恰好平均分配；CF=1.25 留 25% 缓冲——**宁可空座，不可让某桌排队到瘫痪**。被拒的客人（溢出 token）走"外卖通道"（残差连接）：不至于饿死（信息仍传给下一层），但没吃到这层专家的菜（该层 FFN 处理缺失，轻微质量损失）。

## 核心概念：容量公式与三方权衡

$$\\text{expert\\_capacity} = \\frac{\\text{tokens per batch}}{N} \\times \\text{CF}$$

| CF 取值 | 丢弃率 | 计算/显存 | 质量影响 |
| --- | --- | --- | --- |
| 1.0 | 较高 | 最省 | Switch 实测**反而更好** |
| 1.25 | 低 | 略增 | 常用默认 |
| ≥2.0 | 近零 | 大增 | 早已不划算 |

Switch 的反直觉发现：**低 CF（1.0–1.25）训练质量更高**——丢弃本身就是一种正则：它强迫路由器学会"别把宝押在热门专家上"（被丢的 token 造成损失，梯度反过来纠正路由）。这把工程约束变成了隐式负载均衡训练信号。

## 原理详解：丢弃为何能当正则

被丢弃的 token 损失了该层 FFN 的加工，其在下游任务上的损失偏大 → 反传时**路由器收到"送错门"的惩罚信号**（若分散路由，谁都不到容量，无人被丢）。宏观效果：辅助损失之外的第二重均衡压力。代价的对称面：丢弃率过高 = 有效层数变薄，质量掉；所以 CF 不能无限低——Switch 的消融显示 1.0–1.25 是甜点区。

## 完整案例：手算一个 batch 的容量与丢弃

Batch 内 1024 个 token、N=8 专家、k=1（Switch 设定）、CF=1.25：
- capacity = 1024/8 × 1.25 = **160 token/专家**；总接待能力 1280 > 1024（平均情形够用）；
- 若路由坍缩：专家 A 收到 400 个请求 → 240 个被丢（丢率 240/1024 ≈ 23%）；其余专家空转；
- 均衡理想态：每专家 128 ± 32，0 丢弃。

\`\`\`python
import numpy as np
rng = np.random.default_rng(0)
T, N, k = 1024, 8, 1

def route(cf, skew):
    # skew>1: 前几个专家更热门（模拟不均衡路由）
    logits = rng.normal(0, 1, (T, N))
    logits[:, :2] *= skew
    choice = logits.argmax(1)                      # Top-1 路由
    cap = int(T / N * cf)
    dropped = sum(max((choice == i).sum() - cap, 0) for i in range(N))
    return dropped / T

for skew in (1.0, 1.5, 2.5):
    print(f"偏斜度 {skew}: CF=1.0 丢弃率 {route(1.0, skew):.1%}", end="  ")
    print(f"CF=1.25 丢弃率 {route(1.25, skew):.1%}", end="  ")
    print(f"CF=2.0 丢弃率 {route(2.0, skew):.1%}")
\`\`\`

预期输出（形态）：均衡路由（skew=1）三档丢弃率都≈0；偏斜加大后 CF=1.0 丢弃率先升（5–15%），CF=2.0 几乎免丢但容量翻倍——**CF 是用算力买丢弃率保险**。**常见错误**：容量按序列长度而非 batch 总 token 算；丢弃 token 忘了走残差（直接丢信息）；推理期仍丢 token（推理常把 CF 调大或用 capacity-free 路由保证不丢）。
预期输出（实测）：均衡路由（skew=1）下 CF=1.25/2.0 丢弃率 0%，CF=1.0 也仅 2% 上下；偏斜加大后 CF=1.0 丢弃率升到 13–26%，CF=2.0 仍几乎免丢但容量翻倍——**CF 是用算力买丢弃率保险，甜点在 1.0–1.25**。**常见错误**：容量按序列长度而非 batch 总 token 算；丢弃 token 忘了走残差（直接丢信息）；推理期仍丢 token（推理常把 CF 调大或用 capacity-free 路由保证不丢）。
## 常见误区

1. **丢弃=bug**——训练期是设计好的正则；推理期才要避免（丢不起质量）；
2. **CF 越大越稳**——Switch 消融表明低 CF 质量更好且更省；盲目调大浪费算力；
3. **容量解决一切不均**——它只是保险丝；根治靠负载均衡损失（c5-l1 的演进主线）；
4. **丢弃率只看总均值**——要看**分专家分布**（单专家 90% 丢弃是坍缩警报）。

## 知识关联

- **向前**：上一节路由公式 + llm-a1 残差是本节全部积木；
- **向后**：c3-l1 训练稳定性（丢弃与精度策略联动）；c5-l1 无辅助损失的均衡新路线；
- **平行**：分布式训练的 All-to-All 通信也按容量分桶（c5-l2）——容量是 MoE 系统的第一约束。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 容量公式 | (batch tokens ÷ N) × CF |
| 溢出处理 | 丢弃该层 FFN，经残差直通 |
| 反直觉结论 | CF 1.0–1.25 质量最好（丢弃即正则） |
| 监控 | 分专家丢弃率是坍缩的第一警报 |

## 参考资料

> **来源类型：学术来源**
> - Fedus, Zoph, & Shazeer (2022). *JMLR* 23(120). arXiv:2101.03961（已核验）——容量因子消融与低 CF 结论的原始出处。
>
> **来源类型：原创**
> - 餐厅限流比喻与偏斜模拟为本课程原创。
`,
        tips: [
          {
            kind: 'interview',
            text: '「容量因子的作用」：为专家预分配固定缓冲区以支持并行计算；超出的 token 被丢弃。太小丢太多，太大浪费算力，常用 1.0~1.5。',
          },
          {
            kind: 'leak',
            text: 'MoE 训练必须加辅助负载均衡损失（α≈0.01），否则专家坍缩会让模型只剩少数几个专家在工作。',
          },
          {
            kind: 'pitfall',
            text: '辅助均衡损失会轻微损害主任务性能（约束了路由自由度），α 不能太大。它只在训练时使用。',
          },
        ],
        demos: [
          {
            title: '容量因子与 token 丢弃模拟',
            lang: 'python',
            code: `import numpy as np

def simulate_capacity(expert_loads, n_tokens, n_experts, capacity_factor):
    capacity = int(np.ceil(n_tokens / n_experts) * capacity_factor)
    kept = [min(l, capacity) for l in expert_loads]
    dropped = sum(l - k for l, k in zip(expert_loads, kept))
    return capacity, kept, dropped

rng = np.random.default_rng(0)
n_tokens, n_experts = 4096, 64
loads = rng.integers(10, 200, size=n_experts)
print("总 token", n_tokens, "专家", n_experts)
print("实际负载：最大", loads.max(), "最小", loads.min())
print()

for cf in (0.5, 1.0, 1.25, 1.5, 2.0):
    cap, kept, dropped = simulate_capacity(loads, n_tokens, n_experts, cf)
    rate = dropped / loads.sum()
    util = np.mean([k / cap for k in kept])
    print("capacity_factor=", cf, " 容量", cap, " 丢弃", dropped,
          "(", round(rate * 100, 1), "%)  平均利用率", round(util * 100), "%")

print()
print("容量因子太小 -> 大量丢弃；太大 -> 缓冲区浪费、利用率低")
print("1.0~1.5 是经验最优区间")`,
          },
          {
            title: '辅助负载均衡损失',
            lang: 'python',
            code: `import numpy as np

def aux_load_balance_loss(expert_counts, gate_probs, n_experts, alpha=0.01):
    total = expert_counts.sum()
    f = expert_counts / total
    P = gate_probs.mean(axis=0)
    loss = alpha * n_experts * float(np.sum(f * P))
    return loss, f

def imbalance_ratio(f):
    return f.max() / (1.0 / len(f))

cases = {
    "完全均衡": np.array([64, 64, 64, 64]),
    "轻微不均": np.array([80, 60, 60, 56]),
    "严重不均": np.array([200, 40, 8, 8]),
    "坍缩":    np.array([250, 3, 1, 2]),
}

for name, counts in cases.items():
    probs = np.tile(counts / counts.sum(), (len(counts), 1))
    loss, f = aux_load_balance_loss(counts, probs, 4)
    print(name, " 负载=", counts, " 辅助损失=", round(loss, 4),
          " 不均衡度=", round(imbalance_ratio(f), 1), "x")

print()
print("完全均衡时损失 = alpha = 0.01（最小值）")
print("越不均衡，损失越大 -> 梯度推动路由走向均衡")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-a4-c2-e1',
        relatedLessonId: 'llm-a4-c2-l1',
        type: 'single',
        difficulty: 2,
        question: '容量因子（capacity_factor）的作用是？',
        options: [
          { value: 'A', text: '控制模型参数量' },
          { value: 'B', text: '为每个专家预分配固定大小的缓冲区，超出容量的 token 被丢弃' },
          { value: 'C', text: '决定专家数量' },
          { value: 'D', text: '控制学习率' },
        ],
        answer: 'B',
        explanation: 'GPU 上专家计算需要固定形状的张量才能并行。容量因子决定缓冲区大小：平均水平 × 因子。太小丢弃多，太大浪费算力。',
        tags: ['容量因子'],
      },
      {
        id: 'llm-a4-c2-e2',
        relatedLessonId: 'llm-a4-c2-l1',
        type: 'judge',
        difficulty: 2,
        question: '被 token 丢弃机制丢弃的 token 会完全从模型中消失，不再参与后续计算。',
        answer: false,
        explanation: '被丢弃的 token 只是跳过这一层的专家计算，仍通过残差连接传递到下一层，信息不会完全丢失。但这一层确实没学到东西。',
        tags: ['token 丢弃'],
      },
      {
        id: 'llm-a4-c2-e3',
        relatedLessonId: 'llm-a4-c2-l1',
        type: 'single',
        difficulty: 3,
        question: '「专家坍缩（Expert Collapse）」指的是？',
        options: [
          { value: 'A', text: '专家参数被初始化得太小' },
          { value: 'B', text: '门控倾向于始终选择少数几个专家，导致其余专家几乎不被训练' },
          { value: 'C', text: '专家数量减少' },
          { value: 'D', text: '显存不足导致专家被卸载' },
        ],
        answer: 'B',
        explanation: '这是一个正反馈：被选中的专家获得更多训练信号 → 变得更擅长 → 被选中更多。最终模型有效容量大幅缩水，是 MoE 训练最核心的难点。',
        tags: ['专家坍缩'],
      },
      {
        id: 'llm-a4-c2-e4',
        relatedLessonId: 'llm-a4-c2-l1',
        type: 'multiple',
        difficulty: 3,
        question: '缓解专家坍缩的手段有哪些？（多选）',
        options: [
          { value: 'A', text: '加入辅助负载均衡损失' },
          { value: 'B', text: '训练时在门控 logits 上加噪声' },
          { value: 'C', text: '改用 Top-2 路由' },
          { value: 'D', text: '增大容量因子到 10' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: 'D 错误：容量因子过大会让缓冲区远超实际需求，浪费算力，且不能解决路由本身的不均衡。',
        tags: ['负载均衡'],
      },
      {
        id: 'llm-a4-c2-e5',
        relatedLessonId: 'llm-a4-c2-l1',
        type: 'fill',
        difficulty: 3,
        question:
          'Switch Transformer 的辅助负载均衡损失为 α · N · Σ f_i · P_i，其中 α 通常取 ___（填数量级）。',
        blanks: [['0.01', '1e-2', '0.01 级别']],
        explanation: 'α=0.01 是 Switch 论文的经验值。太大（如 0.1）会明显损害主任务性能，因为它过度约束了路由的自由度。',
        tags: ['辅助损失'],
      },
      {
        id: 'llm-a4-c2-e6',
        relatedLessonId: 'llm-a4-c2-l1',
        type: 'code',
        difficulty: 2,
        question:
          '实现 `expert_capacity(n_tokens, n_experts, capacity_factor)`：返回 `ceil(n_tokens / n_experts * capacity_factor)`（整数）。',
        starterCode: `import math

def expert_capacity(n_tokens, n_experts, capacity_factor=1.25):
    ___

expert_capacity(4096, 64, 1.25)
`,
        setupCode: '',
        expectedOutput: '80',
        tests: `assert expert_capacity(4096, 64, 1.25) == 80, f"应为 80，实际 {expert_capacity(4096,64,1.25)}"
assert expert_capacity(4096, 64, 1.0) == 64, "factor=1.0 时应为平均水平"
assert expert_capacity(100, 8, 1.0) == 13, "ceil(12.5)=13"
assert expert_capacity(4096, 64, 2.0) == 128
assert isinstance(expert_capacity(100, 8, 1.0), int), "应返回整数"
`,
        answer: `import math

def expert_capacity(n_tokens, n_experts, capacity_factor=1.25):
    return int(math.ceil(n_tokens / n_experts * capacity_factor))


expert_capacity(4096, 64, 1.25)`,
        explanation:
          '```python\nreturn int(math.ceil(n_tokens / n_experts * capacity_factor))\n```\n\n必须先乘因子再向上取整。4096/64 = 64，×1.25 = 80。\n\n返回整数很重要——它要作为张量维度使用。',
        tags: ['编程', '容量'],
      },
      {
        id: 'llm-a4-c2-e7',
        relatedLessonId: 'llm-a4-c2-l1',
        type: 'code',
        difficulty: 3,
        question:
          '实现辅助负载均衡损失 `aux_loss(expert_counts, gate_probs, n_experts, alpha=0.01)`：\n\n返回 `alpha * n_experts * sum(f_i * P_i)`（保留 6 位小数），f 是实际分配比例，P 是门控平均概率。',
        starterCode: `import numpy as np

def aux_loss(expert_counts, gate_probs, n_experts, alpha=0.01):
    total = expert_counts.sum()
    f = ___
    P = ___
    return round(float(alpha * n_experts * np.sum(f * P)), 6)


counts = np.array([64, 64, 64, 64])
probs = np.tile(np.array([0.25, 0.25, 0.25, 0.25]), (256, 1))
aux_loss(counts, probs, 4)
`,
        setupCode: '',
        expectedOutput: '0.01（完全均衡时）',
        tests: `import numpy as np
counts = np.array([64, 64, 64, 64])
probs = np.tile(np.array([0.25, 0.25, 0.25, 0.25]), (256, 1))
loss = aux_loss(counts, probs, 4)
assert abs(loss - 0.01) < 1e-6, f"均衡时损失应为 alpha=0.01，实际 {loss}"
counts2 = np.array([200, 40, 8, 8])
probs2 = np.tile(counts2 / counts2.sum(), (256, 1))
loss2 = aux_loss(counts2, probs2, 4)
assert loss2 > loss, f"不均衡时损失应更大（{loss2} vs {loss}）"
c8 = np.ones(8) * 32
p8 = np.tile(np.ones(8) / 8, (256, 1))
assert abs(aux_loss(c8, p8, 8) - 0.01) < 1e-6, "8 专家均衡时也应为 alpha"
`,
        answer: `import numpy as np

def aux_loss(expert_counts, gate_probs, n_experts, alpha=0.01):
    total = expert_counts.sum()
    f = expert_counts / total
    P = gate_probs.mean(axis=0)
    return round(float(alpha * n_experts * np.sum(f * P)), 6)


counts = np.array([64, 64, 64, 64])
probs = np.tile(np.array([0.25, 0.25, 0.25, 0.25]), (256, 1))
aux_loss(counts, probs, 4)`,
        explanation:
          '```python\ntotal = expert_counts.sum()\nf = expert_counts / total\nP = gate_probs.mean(axis=0)\nreturn round(float(alpha * n_experts * np.sum(f * P)), 6)\n```\n\n**为什么乘 n_experts**：完全均衡时 Σ f_i·P_i = N × (1/N)² = 1/N，乘 N 后归一化为 1，损失恰好等于 α。\n\n**f 用实际分配（硬路由），P 用门控概率（软输出）**——这正是它能把梯度回传给 router 的原因。',
        tags: ['编程', '辅助损失'],
      },
      {
        id: 'llm-a4-c2-e8',
        relatedLessonId: 'llm-a4-c2-l1',
        type: 'judge',
        difficulty: 3,
        question: '辅助负载均衡损失在推理时也必须计算并加入损失。',
        answer: false,
        explanation: '辅助损失只用于训练时引导路由走向均衡。推理时没有梯度、没有损失，自然不需要它，且它不参与前向计算。',
        tags: ['辅助损失'],
      },
      {
        id: 'llm-a4-c2-e9',
        relatedLessonId: 'llm-a4-c2-l1',
        type: 'code',
        difficulty: 4,
        question:
          '模拟 token 丢弃：实现 `simulate_drop(expert_loads, capacity)`，返回 `(总token数, 被丢弃数, 丢弃率)`，丢弃率保留 4 位小数。',
        starterCode: `def simulate_drop(expert_loads, capacity):
    total = ___
    dropped = ___
    return total, dropped, round(dropped / total, 4) if total else 0.0


simulate_drop([200, 40, 8, 8], 80)
`,
        setupCode: '',
        expectedOutput: '(256, 120, 0.4688)',
        tests: `total, dropped, rate = simulate_drop([200, 40, 8, 8], 80)
assert total == 256, f"总数应为 256，实际 {total}"
assert dropped == 120, f"丢弃应为 200-80=120，实际 {dropped}"
assert abs(rate - 0.46875) < 1e-3, f"丢弃率应约 0.4688，实际 {rate}"
t2, d2, r2 = simulate_drop([10, 20, 5], 50)
assert d2 == 0 and r2 == 0.0, "容量足够不应丢弃"
t3, d3, r3 = simulate_drop([], 10)
assert t3 == 0 and r3 == 0.0, "空输入应返回 0"
`,
        answer: `def simulate_drop(expert_loads, capacity):
    total = sum(expert_loads)
    dropped = sum(max(0, x - capacity) for x in expert_loads)
    return total, dropped, round(dropped / total, 4) if total else 0.0


simulate_drop([200, 40, 8, 8], 80)`,
        explanation:
          '```python\ntotal = sum(expert_loads)\ndropped = sum(max(0, x - capacity) for x in expert_loads)\nreturn total, dropped, round(dropped / total, 4) if total else 0.0\n```\n\n**`max(0, x - capacity)`** 保证未超容量的专家不贡献丢弃数。\n\n本例只有第一个专家超限（200 > 80），丢弃 120 个，丢弃率 46.9%——说明路由严重不均，必须加辅助均衡损失。',
        tags: ['编程', 'token 丢弃'],
      },
      {
        id: 'llm-a4-c2-e10',
        relatedLessonId: 'llm-a4-c2-l1',
        type: 'single',
        difficulty: 3,
        question: '容量因子从 1.0 增大到 2.0，最可能的后果是？',
        options: [
          { value: 'A', text: '丢弃率下降，但显存与算力浪费增加' },
          { value: 'B', text: '模型效果必定大幅提升' },
          { value: 'C', text: '不再需要辅助均衡损失' },
          { value: 'D', text: '专家数量增加' },
        ],
        answer: 'A',
        explanation: '容量因子越大，缓冲区越大，被丢弃的 token 越少；但每个专家都要按 cap 分配张量，实际利用率下降，浪费显存与算力。1.0~1.5 是经验最优。',
        tags: ['容量因子'],
      },
      {
        id: 'llm-a4-c2-e11',
        relatedLessonId: 'llm-a4-c2-l1',
        type: 'open',
        difficulty: 4,
        question:
          '你在训练一个 64 专家的 MoE 模型时发现：训练 loss 下降缓慢，监控显示专家负载严重不均（热门专家处理 60% 的 token，多个专家几乎为空）。请分析原因并给出完整的解决步骤。',
        referenceAnswer: `**一、现象与根因**

专家负载严重不均（热门 60%、部分为空）是典型的专家坍缩：

    热门专家被选中更多 → 获得更多梯度 → 学得更好 → 被选中更多（正反馈）

根因通常有四类：
1. 缺少或过弱的负载均衡约束；
2. 门控初始化不佳（初始 logits 差异大）；
3. 学习率过大，路由器过早收敛到局部解；
4. 数据分布本身倾斜。

**二、诊断步骤**

1. 打印每步的专家负载直方图与辅助损失值。
   若辅助损失持续远大于 α，说明均衡约束未生效。
2. 检查容量因子与丢弃率。丢率 > 20% 说明已严重不均。
3. 检查门控 logits 的幅值。若标准差极大，说明 router 饱和。
4. 对比训练早期与后期的负载分布——若早期就坍缩是初始化/学习率问题；
   若逐渐坍缩是正反馈未被约束。

**三、解决方案（按优先级）**

1. 加入/加强辅助负载均衡损失
   - α 从 0.01 起调，仍坍缩可提到 0.02~0.05（但会损害主任务，需权衡）；
   - 确认实现正确：用硬路由比例 f 与软概率 P 的乘积，且梯度能回传到 router。

2. 加 router z-loss
   - 惩罚 logits 的 logsumexp 幅值（系数 1e-3），防止 router 过早饱和。

3. 调整初始化与学习率
   - 门控权重初始化为小值（std≈0.02），起始接近均匀；
   - router 可用更低学习率或单独 warmup。

4. 训练时给 logits 加噪声
   - 早期加高斯噪声增加探索，帮助冷门专家获得机会；尺度随训练衰减。

5. 改用 Top-2 路由
   - 每个 token 用两个专家，降低对单一专家的依赖。

6. 调整容量因子
   - 从 1.25 提到 1.5，先缓解丢弃，再靠均衡损失改善根本。

7. 检查数据分布
   - 若某类数据占比过高，考虑重采样或调整 batch 内配比。

**四、验证**

监控：专家负载直方图的变异系数、辅助损失值、丢弃率。
目标是各专家负载接近均匀（变异系数 < 0.3），
同时确认主任务 loss 没有因均衡约束而明显变差——α 不是越大越好。`,
        rubric: [
          { point: '正确识别为专家坍缩并解释正反馈机制', score: 2 },
          { point: '诊断步骤：负载直方图、辅助损失、丢弃率、logits 幅值', score: 2 },
          { point: '辅助均衡损失 + router z-loss', score: 2 },
          { point: '初始化/学习率/噪声/Top-2/容量因子等具体调整', score: 2 },
          { point: '强调均衡与主任务效果的权衡', score: 1 },
        ],
        keywords: ['专家坍缩', '正反馈', '辅助损失', 'z-loss', 'Top-2', '变异系数'],
        explanation: '这是 MoE 训练最常见的故障。能说清正反馈机制并给出分层解决方案，就是资深水平。',
        tags: ['MoE', '排障', '训练'],
      },
    ],
  },

  /* ============================================================
   *  c3：训练稳定性、结论与局限
   * ============================================================ */
  {
    id: 'llm-a4-c3',
    title: '训练稳定性、结论与局限',
    goal: '掌握 Switch Transformer 的稳定性技巧与核心实验结论，理解 MoE 的通信、显存与部署局限。',
    lessons: [
      {
        id: 'llm-a4-c3-l1',
        title: '训练稳定性技巧与实验结论',
        content: `
### 学习目标

学完本节，你应该能够：
1. 复述 MoE 不稳定的三个结构性来源（稀疏梯度/离散路由/负载波动）；
2. 演示 router fp32+专家 bf16 的选择性精度策略；
3. 用负载直方图对比加/不加均衡损失的专家利用率与 all-to-all 通信量级。

### 前置知识

- c1/c2 的 MoE 路由与辅助损失；
- llm-a2 的混合精度。

### 问题背景

MoE 把『每次该用哪个专家』的离散选择引入训练：梯度只流向被选中的专家、路由在离散空间跳变、负载波动搅动数值尺度——不稳定性是结构性的。bf16 路由、小初始化、辅助损失与 all-to-all 通信是让千卡 MoE 跑起来的四大件。

### 直觉理解

MoE 像一家分科室的医院：患者（token）挂号（router），只看被挂到的科室。fp16 像小数点会溢出的老式计算器（路由分一极端就爆），bf16 量程与 fp32 相同所以稳；初始化缩小 10 倍是『新科室开张别一上来就开大剂量』；辅助损失是科室 KPI——没有它，人人挤热门科室，冷门科室永久闲置。

### 核心概念与原理详解

## MoE 训练为什么不稳定

稀疏路由引入了**动态的、不可微的**选择：
- 梯度只流向被选中的专家（未选中的专家没有梯度）；
- 路由决策在离散空间中跳变；
- 专家负载波动导致数值尺度变化。

Switch Transformer 论文系统总结了让 MoE 稳定训练的技巧。

## 1. 选择性精度：用 bfloat16 而非 float16

**问题**：fp16 的动态范围只有约 ±65504，MoE 中路由与专家输出容易出现极大/极小值，导致溢出。

**方案**：用 **bfloat16**——指数位与 fp32 相同（8 位），
动态范围与 fp32 一致，只是尾数精度低（7 位）。

**关键实践**：
- router 的 logits 与 softmax 用 float32（精度敏感）；
- 专家内部的矩阵乘用 bf16（吞吐优先）。

## 2. 更小的初始化

**问题**：MoE 专家数量多，若用常规初始化，输出尺度容易失控。

**方案**：把专家权重与嵌入层的初始化尺度**缩小 10 倍**（如 std 从 0.02 降到 0.002）。

Switch 论文明确指出这一步显著改善稳定性。

## 3. 增大 dropout（仅在微调阶段）

论文发现在**微调**阶段，MoE 需要比稠密模型更大的 dropout
（如 0.1 而非 0.01），否则容易过拟合。

## 4. 专家并行与 all-to-all 通信

大规模训练时，专家分布在不同设备上：

    1. 每个设备算本地 token 的门控分数
    2. all-to-all：把 token 发送到对应专家所在设备
    3. 各设备本地计算自己的专家
    4. all-to-all：把结果发回原设备

**通信量**：每层两次 all-to-all，数据量 ∝ token 数 × d_model。
这是 MoE 在大规模下的主要瓶颈，也是为什么 MoE 通常需要高速互联（NVLink/InfiniBand）。

## 核心实验结论

**1. 相同算力下 MoE 更优**

在固定 FLOPs 预算下，Switch-Base 相比稠密 T5-Base：
- 预训练速度提升约 **7 倍**；
- 在多个下游任务（SuperGLUE 等）上效果更好。

**2. 相同的计算量，MoE 效果超过更大的稠密模型**

Switch-XXL（395B 参数）在多任务上显著优于 T5-XXL（11B 稠密），
而每 token 算力相近。

**3. 专家数量的收益递减**

从 2 到 64 专家收益明显；继续增加到 256、512 时收益递减，
而通信与显存成本继续上升。

## 局限与代价

**1. 显存**：所有专家权重都必须加载（Mixtral 8×7B 约 47B 总参数）。

**2. 通信开销**：专家并行需要 all-to-all，跨节点时可能成为瓶颈。

**3. 负载不均与批处理低效**：不同 token 路由到不同专家，每个专家收到的 batch 变小。
部署时常用**冗余专家**缓解。

**4. 微调困难**：比稠密模型更容易过拟合，需要更大 dropout。

**5. 可解释性**：专家学到的分工不明确。

## 后续发展

| 模型 | 特点 |
| --- | --- |
| Mixtral 8×7B | Top-2 路由，8 个专家，激活约 13B |
| DeepSeek-MoE | **细粒度专家** + 共享专家（捕获通用知识） |
| DeepSeek-V2/V3 | 细粒度专家 + 大量共享专家，激活参数大幅降低 |
| Qwen-MoE | 类似思路的工程优化 |

**趋势**：专家越拆越细，再加若干**共享专家**（所有 token 都经过，负责通用知识），
让专门专家更专注。

<GradientFlowDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
rng = np.random.default_rng(0)
# ---- 1. fp16 vs bf16 量程（router 稳定性）----
print("fp16 max:", np.finfo(np.float16).max, "| logit 7e4 -> fp16:", np.float16(np.float32(7e4)))
# ---- 2. 无均衡 vs 有均衡损失：专家负载 ----
N, K, T = 8, 2, 10000
bias = rng.normal(0, 0.6, N)                     # 天然热门专家
logits = bias[None, :] + rng.normal(0, 1, (T, N))
top = np.argsort(-logits, 1)[:, :K]
load0 = np.bincount(top.ravel(), minlength=N)/T/K
print("无均衡负载:", np.round(load0, 2), "| 变异系数:", round(load0.std()/load0.mean(), 2))
# 简化模拟均衡损失：对热门专家打分施加惩罚
penalized = logits - 2.5*load0[None, :]
top2 = np.argsort(-penalized, 1)[:, :K]
load1 = np.bincount(top2.ravel(), minlength=N)/T/K
print("加均衡后负载:", np.round(load1, 2), "| 变异系数:", round(load1.std()/load1.mean(), 2))
# ---- 3. all-to-all 通信量 ----
d_model, tokens = 4096, 4096
bytes_sent = 2 * tokens * d_model * 2            # 每层两次 all-to-all（bf16）
print(f"每层 all-to-all ≈ {bytes_sent/2**20:.0f} MiB → 60 层每步 ≈ {60*bytes_sent/2**30:.1f} GiB")\`\`\`

预期输出（实测）：fp16 下 logit 7e4 溢出为 inf（router 必须 fp32）；无均衡负载变异系数 0.43（最热专家占 23%），模拟均衡后降至 0.25；all-to-all 每层 64 MiB → 60 层每步 ≈ 3.8 GiB。

**常见错误**：router logits 用 fp16 计算，极端 logit 溢出为 inf 全批次报废；不加负载均衡损失，几个专家吃掉全部token 其余闲置；专家并行忘了 all-to-all 的两次通信成本，跨机带宽被打爆。

### 常见误区

1. **『MoE 省显存』**——省的是每 token FLOPs，全部专家权重仍须常驻显存；\\n2. **『专家越多越强』**——64 之后收益递减，通信与显存成本继续上升；\\n3. **『辅助损失权重越大越均衡』**——过强会干扰主损失，路由退化成近似均匀，失去稀疏意义。

### 知识关联

- **向前**：c1/c2 的路由与容量因子是本章稳定性的上游；
- **向后**：c4/c5 的细粒度与设备受限路由是稳定性在规模化下的演进；
- **平行**：llm-a2 的混合精度与本章共享『敏感计算用 fp32』纪律。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 精度 | router 用 fp32、专家矩阵乘 bf16 |
| 初始化 | 专家/嵌入 std 缩小 10 倍 |
| 微调 | dropout 0.1（比稠密大）|
| 专家并行 | 每层两次 all-to-all，需高速互联 |
| 结论 | 同 FLOPs 下 MoE 快约 7 倍；>64 专家收益递减 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Fedus et al. (2022)《Switch Transformer》、Jiang et al. (2024)《Mixtral》、DeepSeek-MoE/V3 技术报告相应章节）
`,
        tips: [
          {
            kind: 'interview',
            text: 'Switch 的稳定性三件套：router 用 fp32（其余 bf16）、专家初始化缩小 10 倍、微调时加大 dropout。',
          },
          {
            kind: 'leak',
            text: 'MoE 训练要用 bf16 而不是 fp16——bf16 的动态范围与 fp32 相同，能避免溢出。router 计算仍建议用 fp32。',
          },
          {
            kind: 'note',
            text: '专家数量不是越多越好：2→64 收益明显，64→512 收益递减而通信与显存成本持续上升。',
          },
        ],
        demos: [
          {
            title: '专家数量与收益的权衡',
            lang: 'python',
            code: `import math

def moe_cost_benefit(n_experts, base_params=100_000_000, expert_params=50_000_000):
    total_params = base_params + n_experts * expert_params
    benefit = math.log2(n_experts + 1)
    comm_cost = n_experts ** 0.5
    efficiency = benefit / (total_params / 1e9) / comm_cost
    return total_params, benefit, comm_cost, efficiency

print("专家数 | 总参数 | 收益 | 通信成本 | 效率")
print("-" * 46)
prev = None
for n in (2, 4, 8, 16, 64, 128, 256, 512):
    p, b, c, e = moe_cost_benefit(n)
    trend = ""
    if prev is not None:
        trend = "↑" if e > prev else "↓"
    print(f"{n:6d} | {p/1e9:5.1f}B | {b:4.2f} | {c:8.1f} | {e:7.3f} {trend}")
    prev = e

print()
print("收益随专家数对数增长，参数量线性增长——存在最优区间")
print("实践中 8~64 个专家是主流选择")`,
          },
          {
            title: 'bf16 vs fp16 的动态范围',
            lang: 'python',
            code: `values = [1e-8, 1e-5, 1.0, 1e4, 1e5, 1e8]
FP16_MAX = 65504.0
BF16_MAX = 3.4e38

print("fp16 动态范围: 约 ±65504")
print("bf16 动态范围: 约 ±3.4e38（与 fp32 相同）")
print()
print("数值".ljust(10), "| fp16".ljust(12), "| bf16")
print("-" * 40)
for v in values:
    fp16_ok = "是" if v <= FP16_MAX else "溢出!"
    bf16_ok = "是" if v <= BF16_MAX else "溢出!"
    print(("%.0e" % v).ljust(10), "|", fp16_ok.ljust(10), "|", bf16_ok)

print()
print("MoE 路由与专家输出容易出现大数值 -> 必须用 bf16")
print("但 bf16 尾数只有 7 位，所以 router 计算用 fp32")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-a4-c3-e1',
        relatedLessonId: 'llm-a4-c3-l1',
        type: 'single',
        difficulty: 2,
        question: 'MoE 训练推荐使用 bf16 而非 fp16 的主要原因是？',
        options: [
          { value: 'A', text: 'bf16 精度更高' },
          { value: 'B', text: 'bf16 的动态范围与 fp32 相同，避免 MoE 中的数值溢出' },
          { value: 'C', text: 'bf16 速度更快' },
          { value: 'D', text: 'bf16 显存占用更小' },
        ],
        answer: 'B',
        explanation: 'fp16 最大约 65504，MoE 的路由与专家输出容易出现极大/极小值导致溢出。bf16 的指数位与 fp32 相同，动态范围一致。',
        tags: ['bf16'],
      },
      {
        id: 'llm-a4-c3-e2',
        relatedLessonId: 'llm-a4-c3-l1',
        type: 'judge',
        difficulty: 2,
        question: 'Switch Transformer 论文建议把专家权重和嵌入层的初始化尺度缩小约 10 倍。',
        answer: true,
        explanation: 'MoE 专家数量多，常规初始化下输出尺度容易失控。缩小初始化尺度是论文明确指出的稳定性技巧之一。',
        tags: ['初始化'],
      },
      {
        id: 'llm-a4-c3-e3',
        relatedLessonId: 'llm-a4-c3-l1',
        type: 'multiple',
        difficulty: 3,
        question: 'MoE 的主要局限包括？（多选）',
        options: [
          { value: 'A', text: '需加载全部专家权重，显存需求大' },
          { value: 'B', text: '专家并行带来 all-to-all 通信开销' },
          { value: 'C', text: '不同 token 路由到不同专家，导致专家收到的 batch 变小' },
          { value: 'D', text: '每 token 计算量随专家总数线性增长' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: 'D 错误：每 token 计算量只与 top-k 有关，与专家总数无关（这正是 MoE 的优势）。',
        tags: ['MoE 局限'],
      },
      {
        id: 'llm-a4-c3-e4',
        relatedLessonId: 'llm-a4-c3-l1',
        type: 'fill',
        difficulty: 3,
        question: 'MoE 专家分布在不同设备上时，token 需要被发送到对应专家并收回结果，这种通信模式叫 ___。',
        blanks: [['all-to-all', 'all to all', 'alltoall', '全对全']],
        explanation: 'all-to-all 是集合通信原语，每个设备向所有其他设备发送不同数据。MoE 每层需要两次，是主要通信瓶颈。',
        tags: ['专家并行'],
      },
      {
        id: 'llm-a4-c3-e5',
        relatedLessonId: 'llm-a4-c3-l1',
        type: 'single',
        difficulty: 3,
        question: 'Switch Transformer 的核心实验结论之一是？',
        options: [
          { value: 'A', text: 'MoE 比稠密模型慢' },
          { value: 'B', text: '相同算力下，MoE 的预训练速度明显更快（约 7 倍）' },
          { value: 'C', text: '专家越多效果一定越好' },
          { value: 'D', text: 'MoE 不需要负载均衡' },
        ],
        answer: 'B',
        explanation: '论文报告相同 FLOPs 预算下 Switch-Base 达到相同 loss 的速度约为稠密 T5-Base 的 7 倍。但专家数量存在收益递减。',
        tags: ['实验结论'],
      },
      {
        id: 'llm-a4-c3-e6',
        relatedLessonId: 'llm-a4-c3-l1',
        type: 'code',
        difficulty: 2,
        question:
          '计算 MoE 的总参数量：实现 `moe_total_params(n_experts, expert_params, shared_params)`，返回 `shared_params + n_experts * expert_params`。',
        starterCode: `def moe_total_params(n_experts, expert_params, shared_params):
    ___

moe_total_params(8, 5_000_000_000, 7_000_000_000)
`,
        setupCode: '',
        expectedOutput: '47000000000（约 47B，类似 Mixtral 8x7B）',
        tests: `p = moe_total_params(8, 5_000_000_000, 7_000_000_000)
assert p == 47_000_000_000, f"应为 47e9，实际 {p}"
assert moe_total_params(1, 100, 50) == 150, "单专家时应为共享+1份"
assert moe_total_params(0, 100, 50) == 50, "零专家时只剩共享参数"
assert isinstance(p, int), "应返回整数"
`,
        answer: `def moe_total_params(n_experts, expert_params, shared_params):
    return shared_params + n_experts * expert_params


moe_total_params(8, 5_000_000_000, 7_000_000_000)`,
        explanation:
          '```python\nreturn shared_params + n_experts * expert_params\n```\n\n这就是"Mixtral 8×7B"命名的由来：8 个专家，每个约 7B 规模的参数块，加上共享的注意力层，总参数约 47B——但每 token 只激活约 13B。',
        tags: ['编程', '参数量'],
      },
      {
        id: 'llm-a4-c3-e7',
        relatedLessonId: 'llm-a4-c3-l1',
        type: 'judge',
        difficulty: 3,
        question: 'MoE 模型的专家数量越多效果一定越好。',
        answer: false,
        explanation: '从 2 到 64 专家收益明显，但继续增加到 256/512 时收益递减（每 token 能用的专家比例变小），而通信与显存成本持续上升。',
        tags: ['专家数量'],
      },
      {
        id: 'llm-a4-c3-e8',
        relatedLessonId: 'llm-a4-c3-l1',
        type: 'code',
        difficulty: 3,
        question:
          '估算 all-to-all 通信量：实现 `alltoall_bytes(n_tokens, d_model, n_layers, bytes_per=2)`。\n\n每层 2 次 all-to-all（发送 + 收回），每次传输 n_tokens × d_model 个元素。返回总字节数。',
        starterCode: `def alltoall_bytes(n_tokens, d_model, n_layers, bytes_per=2):
    ___

alltoall_bytes(4096, 4096, 32)
`,
        setupCode: '',
        expectedOutput: '约 2.1 GB',
        tests: `b = alltoall_bytes(4096, 4096, 32)
assert b == 2 * 2 * 32 * 4096 * 4096, f"公式不正确：{b}"
assert b == 2_147_483_648, f"应为 2^31 字节，实际 {b}"
assert alltoall_bytes(8192, 4096, 32) == 2 * b, "token 翻倍通信应翻倍"
assert isinstance(b, int)
`,
        answer: `def alltoall_bytes(n_tokens, d_model, n_layers, bytes_per=2):
    return 2 * n_layers * n_tokens * d_model * bytes_per


alltoall_bytes(4096, 4096, 32)`,
        explanation:
          '```python\nreturn 2 * n_layers * n_tokens * d_model * bytes_per\n```\n\n系数 2 来自"发送 + 收回"两次 all-to-all。\n\n4096 token × 4096 维 × 32 层 × 2 字节 × 2 ≈ 2.1 GB——每处理一个 batch 就要传输 2GB，\n这就是 MoE 需要 NVLink/InfiniBand 这类高速互联的原因。',
        tags: ['编程', '通信'],
      },
      {
        id: 'llm-a4-c3-e9',
        relatedLessonId: 'llm-a4-c3-l1',
        type: 'single',
        difficulty: 4,
        question: 'DeepSeek-MoE 相比经典 MoE 的关键改进是？',
        options: [
          { value: 'A', text: '完全去掉了门控网络' },
          { value: 'B', text: '细粒度专家划分 + 共享专家（捕获通用知识）' },
          { value: 'C', text: '只用一个专家' },
          { value: 'D', text: '不再需要负载均衡' },
        ],
        answer: 'B',
        explanation: '把专家拆得更细（更多更小的专家）提高组合灵活性；再加若干共享专家让所有 token 都经过，负责通用知识，让其他专家更专注专门知识。',
        tags: ['DeepSeek-MoE'],
      },
      {
        id: 'llm-a4-c3-e10',
        relatedLessonId: 'llm-a4-c3-l1',
        type: 'open',
        difficulty: 5,
        question:
          '请综合评估：在什么场景下你会选择 MoE 架构而不是稠密模型？从训练成本、推理成本、显存占用、工程复杂度、适用业务五个维度给出判断，并举出一个不适合用 MoE 的具体场景并说明理由。',
        referenceAnswer: `**五个维度的判断**

**① 训练成本**

- MoE 优势：相同 FLOPs 下收敛更快、效果更好（Switch 论文约 7 倍速度提升）；
- MoE 劣势：需存全部专家与优化器状态，显存与通信成本高，需要高速互联。

**② 推理成本（算力侧）**

- MoE 显著优势：每 token 只激活少量专家，FLOPs 接近小模型。
- 例：Mixtral 8×7B 总参数 47B、激活约 13B，速度接近 13B 稠密模型而效果接近 70B 级别。

**③ 显存占用**

- MoE 劣势明显：必须加载全部专家（47B vs 13B），单卡部署困难。

**④ 工程复杂度**

- 路由、负载均衡、容量因子、专家并行、all-to-all 通信、
  训练稳定性技巧都需要专门经验；调试困难。

**⑤ 适用业务**

- 适合：通用能力要求高、请求量大、有 GPU 集群、多领域混合任务；
- 不适合：单一垂直任务、边缘部署、预算有限的小团队。

**不适合 MoE 的具体场景举例**

**场景：面向个人用户的开源桌面应用，需要在消费级显卡（8~16GB）本地运行。**

理由：
1. 显存：47B 模型 fp16 需 94GB，量化到 4bit 也要约 24GB，超出主流消费卡；
2. 推理优势无法体现：单用户没有高并发，"低 FLOPs"带来的吞吐优势无用，
   真正卡脖子的是显存；
3. 工程成本：本地难以部署支持专家并行的引擎；
4. 更优选择：用 7B~13B 稠密模型 + 量化（GGUF/INT4）+ LoRA 垂直微调。

**总结判断**

    有大规模 GPU 集群 and 请求量大 and 效果要求高 → 选 MoE
    显存受限 / 单机部署 / 团队经验不足 → 选稠密模型
    其余 → 小规模 MoE 实验，用评估集对比后决定`,
        rubric: [
          { point: '训练成本：同等算力下更高效但需高速互联', score: 2 },
          { point: '推理算力：激活参数少、速度优势明显', score: 2 },
          { point: '显存：需加载全部专家，是最大劣势', score: 2 },
          { point: '工程复杂度与团队经验要求', score: 1 },
          { point: '举出显存受限场景的具体反例并给出替代方案', score: 2 },
        ],
        keywords: ['训练成本', '推理算力', '显存', '工程复杂度', '边缘部署', '量化'],
        explanation: '这是 MoE 落地的决策题。核心是理解"MoE 用显存和工程复杂度换算力效率"，因此显存受限场景正好是它的反面。',
        tags: ['MoE', '选型', '系统设计'],
      },
    ],
  },
  ...llmA4ModernChapters,
];
