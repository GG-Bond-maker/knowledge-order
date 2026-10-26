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
## 学习目标

学完本节，你应该能够：
1. 复述 Mixtral 8x7B 的关键配置：8 专家、Top-2、46.7B 总参/12.9B 激活；
2. 解释 Top-2 相对 Switch Top-1 的收益（表达力、稳定性）与代价（2 倍专家计算）；
3. 用"重名字"澄清 8x7B ≠ 56B 的参数会计，并说明注意力层不复制的事实。

## 前置知识

- 路由与容量（前两章）；
- FFN 与注意力的参数占比（llm-a1 c2-l5）。

## 问题背景：MoE 从论文走向开放可用

Switch/Shazeer 时代的 MoE 是大厂专属；2023 年 12 月 Mistral 发布 Mixtral of Experts（Jiang et al., 2024），把高质量稀疏 MoE 开放给社区，一举成为当时的最强开放权重模型之一。它刻意选择**保守配置**（8 专家、Top-2、无花哨机制），证明了"简单 Top-2 + 充分数据"就够——工程克制本身就是贡献。

## 直觉理解：两科会诊

Switch 的 Top-1 是单科接诊（快但单薄）；Mixtral 的 Top-2 是**两科联合会诊**：token 同时由最对口的两个专家加工后加权融合——表达力上一个专家管"主诉"、另一个管"合并症"；训练稳定性上，两个专家的梯度互相补充，路由坍缩风险显著低于 Top-1。

## 核心概念：配置表与参数会计

| 项 | Mixtral 8x7B |
| --- | --- |
| 层数 / 维度 | 32 层 / d_model=4096 |
| 专家数 N | 8（每层一组） |
| 路由 | Top-2（softmax 门控，选中权重再归一化） |
| 总参数 | **46.7B** |
| 每 token 激活 | **12.9B**（≈28%） |
| 注意力 | **不复制**（每层 1 份共享） |

**"8x7B" 的名字陷阱**：并非 8×7=56B——只有 FFN 部分被复制 8 份，注意力/嵌入/归一化共享。会计：共享底座（约 4B）+ 8 份 FFN。同理"总参 46.7B、激活 12.9B"——**容量 47B、成本 13B** 是读 Mixtral 的正确姿势。

## 原理详解：Top-2 的甜点位

1. **表达力**：两专家加权混合可表达"主特征 + 修正"的组合，Top-1 做不到；实证上 Top-2 在同计算量下优于 Top-1 与 Top-4+ 的折中（Shazeer 2017 已见此规律，Mixtral 再验证）；
2. **稳定性**：Top-1 的单点路由对 router 噪声极敏感（一次打分抖动换专家）；Top-2 的第二专家提供缓冲；
3. **成本**：Top-k 的 k 直接乘 FFN 计算——Top-2 用 2 倍专家计算换上述收益，在 13B 成本仍远小于 47B 容量的账面下是划算的。

## 完整案例：同成本对比读法

Mixtral 与 Llama 2 70B 同期：Mixtral 以 12.9B 激活在多数基准追平或超过 Llama 2 70B（**约 5 倍计算量的差距**）——这是"稀疏容量"主张最有力的公开证据。但注意两个隐藏成本：① 推理需常驻全部 46.7B 显存（对显存受限部署不友好）；② 批量小时 GPU 利用率低（专家并行需要大 batch 摊薄通信，部署课展开）。

## 代码实践

\`\`\`python
import numpy as np
rng = np.random.default_rng(1)
d, N, k = 32, 8, 2

x = rng.normal(0, 1, (6, d))                  # 6 个 token
Wg = rng.normal(0, 1, (d, N))
g = np.exp(x @ Wg); g /= g.sum(1, keepdims=True)

for t in range(3):
    top2 = np.argsort(g[t])[::-1][:2]
    w = g[t][top2] / g[t][top2].sum()
    print(f"token{t}: Top-2 专家 {top2}, 归一权重 {np.round(w, 2)},"
          f" 落选最高分 {g[t][np.argsort(g[t])[::-1][2]]:.3f}")
\`\`\`

预期输出：每个 token 得到 2 个不同专家与权重（和为 1）；第三个专家的分数可见但不参与——Top-2 的全部语义就在这几行。**常见错误**：把 8x7B 当 56B 报参数；Top-2 权重忘了再归一化；推理框架按稠密模型加载（显存直接爆）。

## 常见误区

1. **"Mixtral 每层 8 专家都算"**——只算 2 个；显存却要 8 个都装下；
2. **Top-2 万能**——DeepSeek 系改用细粒度多专家（c4-l2）：把大专家切小、Top 更多小专家，容量利用率更高；
3. **8 专家是超参孤例**——它是"专家数/激活数/通信成本"的工程折中，规模与硬件变了折中就变；
4. **MoE 一定赢稠密**——同**训练 FLOPs** 下 MoE 常胜；同**参数量**（显存）下未必——比较口径必须写清。

## 知识关联

- **向前**：c1/c2 的路由与容量是 Mixtral 的地基；它跳过了辅助损失的复杂设计（用均衡数据与容量兜底）；
- **向后**：c4-l2/l3 的细粒度与共享专家是对"8 大专家"的两次迭代；c5 的 DeepSeek-V3 集大成；
- **平行**：B3 部署课的专家并行与显存选型以 Mixtral 为第一案例。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 配置 | 8 专家 / Top-2 / 46.7B 总 / 12.9B 激活 / 注意力共享 |
| 会计 | 8x7B ≠ 56B：只复制 FFN |
| Top-2 甜点 | 表达力+稳定性 换 2 倍专家计算 |
| 实证 | 12.9B 激活 ≈ 70B 稠密的表现（同口径比较） |

## 参考资料

> **来源类型：学术来源**
> - Jiang, A. Q., et al. (2024). "Mixtral of Experts." arXiv:2401.04088（已核验：46.7B/12.9B/Top-2）。
>
> **来源类型：原创**
> - 会诊比喻与参数会计为本课程改编。
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
### 学习目标

学完本节，你应该能够：
1. 推导细粒度切分的 FLOPs 守恒式 K_fine×d_fine = K·d_ff；
2. 计算 m=4/8 时组合空间 C(mN,mK) 的爆炸量级；
3. 说明共享专家隔离通用知识的机制与 Mixtral→DeepSeek-MoE 的演进逻辑。

### 前置知识

- c3 的训练稳定性技巧；
- 组合数 C(n,k) 概念。

### 问题背景

粗粒度专家像『全能科室』：知识混杂、组合有限（C(8,2)=28 条通路）。DeepSeek-MoE 在 FLOPs 守恒下把大专家切碎、成倍增加激活数——组合空间从 28 爆炸到 488 万亿，每个小专家只需专精一件事。

### 直觉理解

细粒度切分像把 8 个大科室拆成 64 个专科诊室：每次会诊叫 16 个专科（激活数×8）但每个诊室只有 1/8 的设备（隐层÷8），总算力不变；可定制的『会诊组合』却从 28 种暴增到百万亿种——面对 Python 数据分析代码可以同时叫上语法、Pandas、数学、类型检查四个专科。

### 核心概念与原理详解

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

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import math
N, K, d_ff = 8, 2, 14336
for m in (1, 4, 8):
    Nf, Kf, df = m*N, m*K, d_ff//m
    flops_ratio = Kf*df/(K*d_ff)
    print(f"m={m}: 专家 {Nf}, 激活 {Kf}, 单专家隐层 {df}, FLOPs 比 {flops_ratio:.2f}, 组合 C({Nf},{Kf})={math.comb(Nf, Kf):.3e}")
print(f"粗粒度组合 C(8,2)={math.comb(8,2)}；细粒度 m=8 后 {math.comb(64,16):.2e}（组合空间爆炸）")\`\`\`

预期输出（实测）：FLOPs 恒为 1.00（K_fine×d_fine=K·d_ff 守恒）；组合空间 C(8,2)=28 → C(32,8)=1.05e7（m=4）→ C(64,16)=4.89e14（m=8）——万倍于粗粒度的动态通路定制能力。

**常见错误**：切分后忘记等比例放大激活专家数 K，总 FLOPs 缩水为 1/m；共享专家与路由专家的输出没相加；细粒度后仍用粗粒度的容量因子，token 大量溢出。

### 常见误区

1. **『细粒度=更多参数』**——FLOPs 守恒：K_fine×d_fine = K·d_ff，参数总量不变；\\n2. **『组合爆炸自动等于强』**——组合多只是『可能性』，需要共享专家隔离通用知识与足够的训练数据；\\n3. **『Mixtral 式粗粒度已过时』**——粗细粒度是算力/通信/专业化的三方权衡，混合方案（细粒度+共享）是主流。

### 知识关联

- **向前**：c3 的负载均衡在专家数暴涨后更关键；
- **向后**：c5 的 DeepSeek-V3 无辅助损失均衡是本思想的生产版；
- **平行**：llm-a3 的 SwiGLU 8/3d 与本章同为『参数守恒下的结构换效』。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 切分 | N_fine=mN、d_fine=d_ff/m、K_fine=mK |
| FLOPs 守恒 | K_fine×d_fine = K·d_ff |
| 组合爆炸 | C(8,2)=28 → C(64,16)≈4.9e14 |
| 共享专家 | 隔离通用知识，路由专家管专业 |
| 效果 | 同算力下专家专业化度显著提升 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Fedus et al. (2022)《Switch Transformer》、Jiang et al. (2024)《Mixtral》、DeepSeek-MoE/V3 技术报告相应章节）
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
## 学习目标

学完本节，你应该能够：
1. 写出共享专家机制：每层 1 个（或多个）**常开**专家 + N 个路由专家；
2. 解释共享专家解决的两个问题：通用知识冗余（每个专家各自学一遍）与路由噪声（关键共性特征被随机分摊）；
3. 对比 Mixtral（无共享）与 DeepSeek 系（1 共享 + 256 路由）在"知识组织"上的差异。

## 前置知识

- 路由机制与前两节的专家设计；
- FFN 作为键值记忆的观点（llm-a1 c2-l5）。

## 问题背景：每个专家都在重复学习"的、了、是"

语言里存在大量**通用知识**（高频词搭配、基础语法、常识模式），它们对所有 token 都有用。纯路由 MoE 中这些知识被摊派：每个专家都得自己学一份（参数冗余），且路由器对"通用 token"的选择近乎随机（选谁都行→学不稳）。DeepSeek-MoE（2024）的方案：**把通用知识收归一个常开专家**，路由专家只存差异化知识。

## 直觉理解：每家都配的"水电基础设施"

一栋楼 256 户（路由专家），各有专长装修（差异化知识）；但**水电网（通用知识）是公共基础设施**——专门一支施工队（共享专家）统一铺设、家家常通。若让每户自装水电：重复建设（参数冗余）且质量参差（学不稳）。共享专家 = 模型里的公共设施。

## 核心概念：结构与公式

每层 FFN 输出改为：

$$y = \\underbrace{E_{sh}(x)}_{\\text{共享专家（常开）}} + \\sum_{j \\in \\mathrm{TopK}} g_j(x)\\, E_j(x)$$

| 部件 | 激活 | 承担 |
| --- | --- | --- |
| 共享专家 $E_{sh}$ | **所有 token 无条件经过** | 通用/共性知识 |
| 路由专家 $\\{E_j\\}$ | Top-k 条件经过 | 差异化/专门知识 |

DeepSeek-V3 的配置即"1 共享 + 256 路由 + Top-8"（671B 总参 / 37B 激活）。

## 原理详解：两个机理收益

1. **去冗余**：消融显示无共享专家时，各路由专家的键值记忆里高度相似（都在记通用模式）——共享专家把这些收编后，路由专家的参数让给专门知识，**同参数量下知识容量有效提升**；
2. **降路由噪声**：通用特征不再依赖"抽签"进入哪个专家（Top-k 对它们近乎随机），梯度经共享专家稳定回流——**基础表示的训练更稳**，路由器也更聚焦于真正的差异化决策。

附加工程红利：共享专家还缓解负载均衡压力——通用流量被固定管道吸收，路由专家的到达率更均匀。

## 完整案例：手算一个 V3 风格层的激活参数

设 d=7168，每层 FFN 中间维：共享专家一份 + 256 份路由专家（细粒度小专家，中间维约为 Mixtral 单专家的 1/4）。每 token 激活：共享 1 份 + 路由 8 份（小份）≈ 相当于 3 份"满尺寸"FFN 的量级，而容量是 257 份——**激活/容量 ≈ 1~2%**（V3 全模型口径 37B/671B ≈ 5.5%，含注意力共享部分）。对比 Mixtral 的 28%：**共享 + 细粒度让稀疏度再上一个数量级**。

\`\`\`python
import numpy as np
rng = np.random.default_rng(2)
d, N, k = 16, 8, 2

Wsh = rng.normal(0, 0.5, (d, d))                # 共享专家（常开）
E = [rng.normal(0, 0.5, (d, d)) for _ in range(N)]
Wg = rng.normal(0, 1, (d, N))

def moe_layer(x):
    g = np.exp(Wg.T @ x); g /= g.sum()
    top = np.argsort(g)[::-1][:k]
    w = g[top] / g[top].sum()
    routed = sum(wi * np.tanh(E[i] @ x) for wi, i in zip(w, top))
    return np.tanh(Wsh @ x) + routed            # 共享 + 路由 相加

x = rng.normal(0, 1, d)
print("输出范数:", round(np.linalg.norm(moe_layer(x)), 2))
print("共享专家贡献范数:", round(np.linalg.norm(np.tanh(Wsh @ x)), 2))
\`\`\`

预期输出：共享部分的贡献与路由部分同量级——**每层都有一份稳定的"公共底座"输出叠加在路由结果上**。**常见错误**：给共享专家也加门控（那就成了第 N+1 个路由专家）；共享专家过多挤占路由专家预算（V3 只留 1 个）。

## 常见误区

1. **共享专家 = 备胎/热备**——它是**常开的知识分工**，不是冗余备份；
2. **所有 MoE 都有共享专家**——Mixtral 没有；这是 DeepSeek 系（及 Qwen 等后续）的设计；
3. **共享专家越大越好**——它每 token 全额计算，过大会吃掉稀疏节省；
4. **"通用/专门"是人为指定**——分工是训练自发涌现的，共享专家学到的就是高复用模式。

## 知识关联

- **向前**：c4-l2 细粒度切分解决了"专家太大"，本节解决"知识错放"——两者共同构成 DeepSeek-MoE 的两大主张；
- **向后**：c5-l1 无辅助损失均衡与共享专家正交（可叠加）；V3 = 细粒度 + 共享 + MLA + 均衡新法的集大成；
- **平行**：残差连接也是某种"常开通路"——公共信息直通、模块学增量的思想一脉相承。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 结构 | 1 个常开共享专家 + Top-k 路由专家，输出相加 |
| 收益 | 去通用知识冗余 + 降路由噪声 + 缓解均衡压力 |
| 标杆 | DeepSeek-V3：1 共享 + 256 路由 + Top-8（37B/671B） |
| 对比 | Mixtral 无共享（28% 激活）→ V3 共享+细粒度（5.5%） |

## 参考资料

> **来源类型：学术来源**
> - DeepSeek-AI (2024). "DeepSeek-V3 Technical Report." arXiv:2412.19437（已核验：671B/37B/256+1/Top-8）。
> - Dai, D., et al. (2024). "DeepSeekMoE: Towards Ultimate Expert Specialization in Mixture-of-Experts Language Models." arXiv:2401.06066——共享专家与细粒度切分的原始消融。
>
> **来源类型：原创**
> - 公共设施比喻与激活参数手算为本课程改编。
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
        relatedLessonId: 'llm-a4-c4-l1',
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
        relatedLessonId: 'llm-a4-c4-l1',
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
        relatedLessonId: 'llm-a4-c4-l2',
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
        relatedLessonId: 'llm-a4-c4-l2',
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
        relatedLessonId: 'llm-a4-c4-l3',
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
        relatedLessonId: 'llm-a4-c4-l3',
        question: '在 Mixtral 8x7B 和 DeepSeek-MoE 中，多头自注意力（Self-Attention）和嵌入层也分别被每个专家独立复制了一份。',
        type: 'judge',
        difficulty: 1,
        answer: false,
        explanation:
          '错误。几乎所有主流 MoE 模型中，自注意力（Attention）、LayerNorm/RMSNorm 和词嵌入（Embedding）都是全局共享的，仅仅将前馈网络（FFN）替换为多个专家网络。',
      },
      {
        id: 'llm-a4-c4-e7',
        relatedLessonId: 'llm-a4-c4-l1',
        question: '在 DeepSeek-MoE 前向传播中，共享专家的输出会乘以门控路由网络生成的 Top-K 归一化 Softmax 权重。',
        type: 'judge',
        difficulty: 1,
        answer: false,
        explanation:
          '错误。共享专家独立于路由专家之外，不参与门控的 Top-K 选拔，也不乘以 Softmax 权重，而是直接全量前向后与路由专家的加权结果相加。',
      },
      {
        id: 'llm-a4-c4-e8',
        relatedLessonId: 'llm-a4-c4-l1',
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
        relatedLessonId: 'llm-a4-c4-l3',
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
        relatedLessonId: 'llm-a4-c4-l2',
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
## 学习目标

学完本节，你应该能够：
1. 说明辅助均衡损失的内在代价（与语言损失互相拉扯、超参敏感）；
2. 写出 DeepSeek-V3 的无辅助损失方案：路由得分加动态偏置 $b_i$，过载则降、欠载则升；
3. 用代码模拟偏置动态调节的负反馈回路，说明它为何"均衡而不抢戏"。

## 前置知识

- 负载均衡问题与辅助损失（c2-l1：均衡是 MoE 的命门）；
- 梯度下降中"损失项互相竞争"的直觉（llm-a2 c3）。

## 问题背景：用损失逼均衡，像用罚款治堵车

传统方案（Switch/Shazeer）在总损失里加一项均衡损失 $\\mathcal{L}_{bal} = \\alpha \\cdot N \\sum_i f_i \\cdot P_i$（$f_i$ 为实际分派比例，$P_i$ 为平均路由概率）——**软性罚款**：路由偏了就罚。代价：① 权重 $\\alpha$ 两难——大了干扰语言学习（为均衡牺牲能力），小了均衡不动；② 均衡信号要经反向传播绕一圈才作用到路由，响应慢。DeepSeek-V3（2024）改为**直接调控**：不进损失函数，给每个专家的路由得分加一个可调偏置。

## 直觉理解：动态定价治拥堵

网约车高峰定价：某区域（专家）订单过多 → **涨价**（降偏置 $b_i$），乘客（token）流向邻近区域；某区域空车多 → 降价（升 $b_i$）吸引订单。价格（偏置）只影响"选择"，**不进入收入核算（损失函数）**——主业（语言建模）不被均衡目标绑架。这是一个标准的**负反馈控制器**。

## 核心概念：动态偏置校准

路由得分改为 $s_i = g_i(x) + b_i$（Top-k 仍按 $s_i$ 选择，**混合权重仍用原始 $g_i$**——偏置只管选择不管加权）：

$$b_i \\leftarrow b_i - \\gamma \\quad \\text{若专家 } i \\text{ 过载（负载 > 均值）}$$
$$b_i \\leftarrow b_i + \\gamma \\quad \\text{若专家 } i \\text{ 欠载（负载 < 均值）}$$

$\\gamma$ 为步长（V3 用小常数，每个训练步调节）。关键细节：偏置**不参与梯度**——它是控制器状态，不是可学习参数。

## 原理详解：负反馈回路为什么稳

1. 过载专家偏置被压低 → 下一步 Top-k 更少选中它 → 负载回落（负反馈）；
2. 欠载专家偏置抬高 → 更多 token 流入 → 负载回升；
3. 稳态：各专家负载围绕均值小幅波动，偏置稳定在小幅差异上。

与辅助损失的本质区别：辅助损失是**间接的、全局的**（信号混入语言梯度，靠学习率慢慢调）；偏置校准是**直接的、局部的**（每步按实测负载立刻调，不经梯度）。V3 报告的收益：均衡质量 comparable 且**语言损失性能更优**（没有均衡项与主损失抢梯度）。

## 完整案例：模拟负反馈

\`\`\`python
import numpy as np
rng = np.random.default_rng(0)
N, k, T, gamma = 8, 2, 200, 0.05
g = rng.dirichlet(np.ones(N) * 0.8, size=1)[0]   # 初始偏好不均
b = np.zeros(N)

for step in range(T):
    score = g + b
    top = np.argsort(score)[::-1][:k]
    load = np.zeros(N); load[top] += 1            # 本步分派
    mean = load.sum() / N
    b[load > mean] -= gamma                       # 过载降价
    b[load < mean] += gamma                       # 欠载涨价
    if step in (0, 5, 50, 199):
        print(f"step {step:3d}: 偏置 {np.round(b, 2)}")

score = g + b
print("稳态 Top-k:", np.argsort(score)[::-1][:k],
      " vs 初偏好 Top-k:", np.argsort(g)[::-1][:k])
\`\`\`

预期输出（形态）：初偏好最强的专家偏置被逐步压低、弱者抬高；几十步后偏置稳定成"补偿图案"，**稳态 Top-k 已被再平衡**。真实训练中 g 本身也在变（路由器学习），控制器与学习器互相追逐——但负反馈的方向始终把负载拉回均值。**常见错误**：偏置参与加权（应只影响选择）；步长 γ 过大（路由震荡）；只降不升（长期全员偏置塌缩）。
预期输出（实测）：偏置整体缓慢抬升（升多降少的记账偏差），但**专家间的相对差异收敛为小幅补偿图案（±0.2 量级）**；初始偏好最强的专家被挤出 Top-k、初始较弱者进入——**选择已被再平衡**。真实训练中 g 本身也在变（路由器学习），控制器与学习器互相追逐——负反馈始终把负载拉回均值。**常见错误**：偏置参与加权（应只影响选择）；步长 γ 过大（路由震荡）；只降不升（长期全员偏置塌缩）。
## 常见误区

1. **无辅助损失 = 不管均衡**——只是换了工具：控制器替代罚款；
2. **偏置是可学习参数**——它不进梯度、按规则调节，属于系统状态；
3. **该方案消灭了丢弃**——容量与丢弃机制仍保留（c2-l1），偏置让丢弃率保持在低位；
4. **一步到位的均衡**——负反馈需要几百步收敛，训练早期仍有波动。

## 知识关联

- **向前**：c2-l1 的容量/丢弃是被动的保险丝，本节是主动的控制器——三代均衡手段（辅助损失→容量→偏置）的演进终点；
- **向后**：c5-l2/l3 的设备受限路由与部署：均衡还牵涉跨卡通信与显存，工程上多层联动；
- **平行**：llm-a2 学习率调度同为"不经梯度的控制器"思想；控制论的负反馈是共同原型。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 旧方案代价 | 辅助损失与主损失抢梯度、α 难调 |
| 新方案 | 路由得分 + 动态偏置；过载降、欠载升；偏置不进梯度 |
| 性质 | 直接、局部、负反馈；语言性能不牺牲 |
| 保留 | 容量与丢弃仍是兜底 |

## 参考资料

> **来源类型：学术来源**
> - DeepSeek-AI (2024). "DeepSeek-V3 Technical Report." arXiv:2412.19437（已核验）——无辅助损失负载均衡（auxiliary-loss-free）章节。
> - Fedus, Zoph, & Shazeer (2022)——辅助均衡损失的对照基线。
>
> **来源类型：原创**
> - 动态定价比喻与负反馈模拟为本课程原创。
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
### 学习目标

学完本节，你应该能够：
1. 解释专家并行的 all-to-all 为何是跨机瓶颈；
2. 模拟设备受限路由（M≤4）对跨机流量的压减比例；
3. 复述拓扑感知路由的三步实施策略与集群扩展效率收益。

### 前置知识

- c3 的专家并行与 all-to-all；
- llm-a2 的 3D 并行。

### 问题背景

DeepSeek-V3 的 256 个路由专家装不进任何单卡：专家并行把专家铺到千卡集群，跨机 all-to-all 成为咽喉。设备受限路由用『最多 M 台机』的硬约束把跨机流量砍半；而部署侧的现实是——MoE 省算力不省显存，671B 参数必须全量常驻。

### 直觉理解

专家并行像全国会诊网络：每个患者（token）按挂号单寄往对应专家所在医院，看完再寄回来——两次全国快递（all-to-all）就是瓶颈。设备受限路由是『挂号单最多跨 4 家医院』：优先在本机=NVLink 内解决，跨机快递直接减半。部署像开一家 671 件藏品全要入库的博物馆：观众每次只看 37 件（激活 37B），但仓库（显存）必须装下全部 671 件。

### 核心概念与原理详解

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

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
rng = np.random.default_rng(1)
# ---- 1. 设备受限路由：跨机流量 ----
N, K, M, nodes = 256, 8, 4, 32
exp_node = rng.choice(nodes, N)                   # 专家随机分布到 32 台机
T = 2000
top = np.argsort(-rng.normal(0, 1, (T, N)), 1)[:, :K]
cross_full = np.mean([len(set(exp_node[row])) for row in top])
limited = []
for row in top:
    nodes_score = {nd: 0.0 for nd in set(exp_node[row])}
    for e in row: nodes_score[exp_node[e]] += 1
    keep = set(sorted(nodes_score, key=nodes_score.get, reverse=True)[:M])
    limited.append(len(keep))
print(f"无约束平均跨机 {cross_full:.1f} 台 → 设备受限 ≤{M} 台（跨机流 ~{cross_full/np.mean(limited):.1f}x 压减）")
# ---- 2. 显存下限 ----
P = 671e9
for name, b in [("bf16", 2), ("fp8", 1), ("int4", 0.5)]:
    gb = P*b/1e9
    print(f"{name}: {gb:.0f} GB → 至少 {int(np.ceil(gb/80))} 张 80G")
# ---- 3. 专家倾斜 ----
load = rng.pareto(1.2, N); load = load/load.sum()
print(f"专家负载 top5% 占比: {np.sort(load)[-13:].sum():.0%}（热点倾斜 → 复制热门专家+token 重组）")\`\`\`

预期输出（实测）：无约束路由平均跨机 7.2 台 → 设备受限 ≤4 台（跨机流约 1.8x 压减）；显存下限：bf16 1342GB（≥17 张 80G）、fp8 671GB（9 张）、int4 336GB（5 张）；专家负载 top5% 占 51%（热点倾斜）。

**常见错误**：以为激活 37B 就能用 2 张卡部署 V3（权重 1342GB 至少 17 张 80G）；设备受限路由的 M 设太大，跨机通信未压缩；热门专家所在 GPU 过载而其他卡闲置（需动态批+token 重组/热门副本）。

### 常见误区

1. **『MoE 推理便宜』**——省的是每 token FLOPs 与延迟；显存下限由总参数决定，量化后也要数百 GB；\\n2. **『负载均衡损失一劳永逸』**——V3 用无辅助损失的偏置调整避免均衡与主损失的冲突；\\n3. **『专家负载天然均匀』**——通用领域专家被高频命中，需统计在线热点并复制多份。

### 知识关联

- **向前**：c3 的 all-to-all 通信与本章 EP 部署是同一枚硬币的两面；
- **向后**：llm-b3 的 continuous batching/PagedAttention 是本章 token 重组的工具箱；
- **平行**：llm-a2 的 3D 并行是本章 EP 的地基（DP/TP/PP/EP 组合）。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| EP | 专家分片到千卡，每层两次 all-to-all |
| 设备受限路由 | 8 专家最多 M=4 台机，跨机流量减半 |
| 显存现实 | 671B：bf16≈1342GB（≥17×80G）|
| 专家倾斜 | 热门专家 GPU 跑满 → 副本+token 重组 |
| 加速 | 推测解码：小模型草稿+MoE 验证 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Fedus et al. (2022)《Switch Transformer》、Jiang et al. (2024)《Mixtral》、DeepSeek-MoE/V3 技术报告相应章节）
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
### 学习目标

学完本节，你应该能够：
1. 算清 V3 三种精度的显存下限（bf16 1342GB→≥17 张 80G）；
2. 解释专家负载倾斜的成因与三大生产级应对；
3. 破除『激活 37B 就能小卡部署』的误区并给出选型公式。

### 前置知识

- 「设备受限路由与 All-to-All」（c5-l2）；
- llm-b3 的推理引擎概念。

### 问题背景

DeepSeek-V3 的 256 个路由专家装不进任何单卡：专家并行把专家铺到千卡集群，跨机 all-to-all 成为咽喉。设备受限路由用『最多 M 台机』的硬约束把跨机流量砍半；而部署侧的现实是——MoE 省算力不省显存，671B 参数必须全量常驻。

### 直觉理解

专家并行像全国会诊网络：每个患者（token）按挂号单寄往对应专家所在医院，看完再寄回来——两次全国快递（all-to-all）就是瓶颈。设备受限路由是『挂号单最多跨 4 家医院』：优先在本机=NVLink 内解决，跨机快递直接减半。部署像开一家 671 件藏品全要入库的博物馆：观众每次只看 37 件（激活 37B），但仓库（显存）必须装下全部 671 件。

### 核心概念与原理详解

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

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
rng = np.random.default_rng(1)
# ---- 1. 设备受限路由：跨机流量 ----
N, K, M, nodes = 256, 8, 4, 32
exp_node = rng.choice(nodes, N)                   # 专家随机分布到 32 台机
T = 2000
top = np.argsort(-rng.normal(0, 1, (T, N)), 1)[:, :K]
cross_full = np.mean([len(set(exp_node[row])) for row in top])
limited = []
for row in top:
    nodes_score = {nd: 0.0 for nd in set(exp_node[row])}
    for e in row: nodes_score[exp_node[e]] += 1
    keep = set(sorted(nodes_score, key=nodes_score.get, reverse=True)[:M])
    limited.append(len(keep))
print(f"无约束平均跨机 {cross_full:.1f} 台 → 设备受限 ≤{M} 台（跨机流 ~{cross_full/np.mean(limited):.1f}x 压减）")
# ---- 2. 显存下限 ----
P = 671e9
for name, b in [("bf16", 2), ("fp8", 1), ("int4", 0.5)]:
    gb = P*b/1e9
    print(f"{name}: {gb:.0f} GB → 至少 {int(np.ceil(gb/80))} 张 80G")
# ---- 3. 专家倾斜 ----
load = rng.pareto(1.2, N); load = load/load.sum()
print(f"专家负载 top5% 占比: {np.sort(load)[-13:].sum():.0%}（热点倾斜 → 复制热门专家+token 重组）")\`\`\`

预期输出（实测）：无约束路由平均跨机 7.2 台 → 设备受限 ≤4 台（跨机流约 1.8x 压减）；显存下限：bf16 1342GB（≥17 张 80G）、fp8 671GB（9 张）、int4 336GB（5 张）；专家负载 top5% 占 51%（热点倾斜）。

**常见错误**：以为激活 37B 就能用 2 张卡部署 V3（权重 1342GB 至少 17 张 80G）；设备受限路由的 M 设太大，跨机通信未压缩；热门专家所在 GPU 过载而其他卡闲置（需动态批+token 重组/热门副本）。

### 常见误区

1. **『MoE 推理便宜』**——省的是每 token FLOPs 与延迟；显存下限由总参数决定，量化后也要数百 GB；\\n2. **『负载均衡损失一劳永逸』**——V3 用无辅助损失的偏置调整避免均衡与主损失的冲突；\\n3. **『专家负载天然均匀』**——通用领域专家被高频命中，需统计在线热点并复制多份。

### 知识关联

- **向前**：c3 的 all-to-all 通信与本章 EP 部署是同一枚硬币的两面；
- **向后**：llm-b3 的 continuous batching/PagedAttention 是本章 token 重组的工具箱；
- **平行**：llm-a2 的 3D 并行是本章 EP 的地基（DP/TP/PP/EP 组合）。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| EP | 专家分片到千卡，每层两次 all-to-all |
| 设备受限路由 | 8 专家最多 M=4 台机，跨机流量减半 |
| 显存现实 | 671B：bf16≈1342GB（≥17×80G）|
| 专家倾斜 | 热门专家 GPU 跑满 → 副本+token 重组 |
| 加速 | 推测解码：小模型草稿+MoE 验证 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Fedus et al. (2022)《Switch Transformer》、Jiang et al. (2024)《Mixtral》、DeepSeek-MoE/V3 技术报告相应章节）
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
        relatedLessonId: 'llm-a4-c5-l1',
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
        relatedLessonId: 'llm-a4-c5-l1',
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
        relatedLessonId: 'llm-a4-c5-l1',
        question: '在 DeepSeek-V3 中，动态偏置项 b_i 会作为可学习参数参与反向传播，其梯度会直接更新门控路由器的线性层权重。',
        type: 'judge',
        difficulty: 2,
        answer: false,
        explanation:
          '错误。动态偏置项 b_i 是通过训练步结束后的统计信息独立更新的，在计算图上完全脱离反向传播（detached），不会向门控网络传播任何对抗主任务的梯度。',
      },
      {
        id: 'llm-a4-c5-e4',
        relatedLessonId: 'llm-a4-c5-l2',
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
        relatedLessonId: 'llm-a4-c5-l2',
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
        relatedLessonId: 'llm-a4-c5-l3',
        question: '由于 671B 的 MoE 模型每个 Token 仅激活 37B 参数，因此在部署推理服务时，我们只需要准备足以容纳 37B 稠密模型的 GPU 显存即可运行完整模型。',
        type: 'judge',
        difficulty: 1,
        answer: false,
        explanation:
          '错误。虽然单 token 激活 37B，但所有 671B 的专家权重都必须常驻在 GPU 显存中待命（因为任何 token 都可能路由到任意专家），因此显存容量必须满足全部 671B 权重的存放需求。',
      },
      {
        id: 'llm-a4-c5-e7',
        relatedLessonId: 'llm-a4-c5-l1',
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
        relatedLessonId: 'llm-a4-c5-l2',
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
        relatedLessonId: 'llm-a4-c5-l3',
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
        relatedLessonId: 'llm-a4-c5-l2',
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
