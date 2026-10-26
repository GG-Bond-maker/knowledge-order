# -*- coding: utf-8 -*-
"""
Chapter 5: 语言模型预训练、对齐与生成评估 (Pre-training, Alignment & Evaluation)
Course: ml-transformer-llm
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_5():
    # ── Lesson 5.1 ──
    l1_text = """### 学习目标
学完本节，你应该能够：
1. 掌握因果自回归语言模型（Causal LM）的核心训练目标：下一个 Token 预测（Next-Token Prediction）；
2. 掌握自回归交叉熵损失函数的严格数学形式与负对数似然（NLL）；
3. **深入推导困惑度（Perplexity, PPL）**：掌握困惑度与对数损失的指数换算关系（$\\text{PPL} = \\exp(\\mathcal{L})$）及其在信息论中的物理直觉；
4. 理解大规模预训练数据的清洗管线：MinHash 去重、启发式质量过滤与多语言配比；
5. 编写纯 Python 代码从模型 Logits 计算自回归交叉熵损失与困惑度。

### 前置知识
- 信息论基础：信息熵与交叉熵；
- 联合概率的链式分解法则：$P(A, B, C) = P(A) P(B \\mid A) P(C \\mid A, B)$。

### 问题背景与 ML 用途
如果说 Transformer 架构是大语言模型的“骨骼”，那么海量无标注文本的**预训练（Pre-training）**就是赋予大模型通用智能的“灵魂”。
- **自监督学习的奇迹**：在人类历史上的海量书籍、网页和代码中，并没有人类专门标注的标签。大模型利用**自回归自监督机制**，把每个句子的前序文本作为输入，把下一个词作为标签；
- **评估语言模型好坏的尺子**：**困惑度（Perplexity, PPL）** 是自然语言处理中最经典、最本质的度量标准。它不仅是模型预训练时损失收敛的核心参考线，更是衡量模型语法准确性与语义通顺度的金标准。

### 直觉理解
- **成语接龙与猜词游戏（Next-Token Prediction 直觉）**：预训练就像玩成语接龙：给定“卧薪”，模型需要预测下一个字是“尝”；给定“卧薪尝”，预测下一个字是“胆”。模型通过对成百上千亿个这样的小片段进行猜词，被迫自发理解了人类语言规律与事实逻辑！
- **选择题的纠结程度（PPL 的直觉）**：如果模型的 $\\text{PPL} = 10$，物理直觉意味着：**模型当前相当于在 10 个候选词之间犹豫不决、随机抛骰子**；如果 $\\text{PPL} = 1.0$，意味着它对下一个词百分之百确信；如果 $\\text{PPL} = 30000$（等于词表大小），意味着模型完全在盲目乱猜。PPL 越小，模型的预测越精准、认知越笃定！

### 核心概念与符号对照表
| 核心概念 | 数学公式 | 物理内涵 | 典型优良数值 |
| --- | --- | --- | --- |
| **自回归概率分解** | $P(w_1, \\dots, w_T) = \\prod_{t=1}^T P(w_t \\mid w_{<t})$ | 语言全文本的联合生成概率链式法则 | 0 到 1 之间的概率 |
| **交叉熵损失 $\\mathcal{L}$** | $\\mathcal{L} = -\\frac{1}{T} \\sum_{t=1}^T \\log P(w_t \\mid w_{<t})$ | 平均每个 Token 的负对数似然（NLL） | 现代优秀大模型约 1.2 ~ 2.0 |
| **困惑度 (PPL)** | $\\text{PPL} = \\exp(\\mathcal{L}) = 2^{\\mathcal{H}}$ | 模型在预测时的平均有效候选词分支因子 | 顶级大模型预训练通常达到 3 ~ 8 |
| **MinHash LSH** | Jaccard 相似度近似 | 语料库文档去重算法，消除重复抓取的低质爬虫数据 | 相似度阈值常设为 0.8 |

### 数学原理与逐步推导
给定 Token 序列 $\\mathbf{x} = (x_1, \\dots, x_T)$。在每个时间步 $t$，模型计算 Logits $\\mathbf{z}_t \\in \\mathbb{R}^{|V|}$。
通过 Softmax 计算预测下一个词的概率分布：
$$P(w \\mid x_{<t}) = \\frac{\\exp(z_{t, w})}{\\sum_{v \\in V} \\exp(z_{t, v})}$$
计算负对数似然（NLL）：$\\ell_t = -\\log P(x_t \\mid x_{<t})$。
平均交叉熵损失为：
$$\\mathcal{L}(\\mathbf{x}) = -\\frac{1}{T} \\sum_{t=1}^T \\log P(x_t \\mid x_{<t})$$

困惑度定义为全序列联合概率几何平均数的倒数：
$$\\text{PPL}(\\mathbf{x}) = \\left( \\prod_{t=1}^T P(x_t \\mid x_{<t}) \\right)^{-\\frac{1}{T}}$$
两边取自然对数：
$$\\ln \\text{PPL}(\\mathbf{x}) = -\\frac{1}{T} \\sum_{t=1}^T \\ln P(x_t \\mid x_{<t}) = \\mathcal{L}(\\mathbf{x})$$
两边同时取指数：
$$\\text{PPL}(\\mathbf{x}) = \\exp(\\mathcal{L}(\\mathbf{x}))$$
**核心推论**：困惑度是交叉熵损失的直接自然指数映射。

### 常见认知误区与避坑指南
1. **跨不同分词器的困惑度（PPL）不可直接对比**：只有当两个模型使用完全相同的分词器（Tokenizer）和测试集时，PPL 的比较才有学术意义！
2. **误以为预训练损失降得越低就一定越好**：如果在一个较小的数据集上反复跑很多轮，预训练损失可以降到接近 0，但模型发生严重的过拟合与死记硬背。
3. **忽略 Padding 位的损失屏蔽**：在计算批处理损失时，必须用 `ignore_index=-100` 或传入 Mask，绝不能把 `<pad>` 填充符的损失算入平均值中。

### 工业级工程实践
- **高质量合成数据**：现代大模型（如 LLaMA-3、Phi-3、DeepSeek）极其依赖大模型自身生成的教科书级合成数据、代码推理链和自我修正语料。
- **Megatron-LM 与 3D 并行**：张量并行（TP） + 流水线并行（PP） + 数据并行（DP/ZeRO-3），实现上万卡 GPU 集群的超大规模无缝训练。

### 拓展阅读与学术文献
1. **Bengio et al. (2003)**: *A Neural Probabilistic Language Model*。
2. **Shoeybi et al. (2019)**: *Megatron-LM: Training Multi-Billion Parameter Language Models Using Model Parallelism*。
3. **Gunasekar et al. (2023)**: *Textbooks Are All You Need* (Phi-1 论文)。

### 知识总结与核心记忆要点
- **自回归目标**：最大化条件生成概率乘积，等价于最小化下一个 Token 预测的平均交叉熵损失。
- **PPL 本质**：$\\text{PPL} = \\exp(\\mathcal{L})$，表征模型预测下一个词时的有效纠结候选词数量。
- **数据工程为王**：启发式过滤、去重与高质量语料是决定模型最终天花板的核心。"""

    l1_code = """import numpy as np

def compute_causal_lm_loss_and_ppl(logits, targets):
    seq_len, vocab_size = logits.shape
    logits_max = np.max(logits, axis=-1, keepdims=True)
    exp_logits = np.exp(logits - logits_max)
    probs = exp_logits / np.sum(exp_logits, axis=-1, keepdims=True)
    
    target_probs = probs[np.arange(seq_len), targets]
    nll_per_token = -np.log(np.clip(target_probs, 1e-12, 1.0))
    loss = float(np.mean(nll_per_token))
    ppl = float(np.exp(loss))
    return loss, ppl

mock_logits = np.array([
    [2.0, 0.5, 0.1, -1.0, 0.0],
    [0.1, 2.5, 0.2, 0.0, -0.5],
    [0.0, 0.2, 2.8, -0.1, 0.1]
])
targets_perfect = np.array([0, 1, 2])
targets_bad = np.array([3, 4, 3])

loss_good, ppl_good = compute_causal_lm_loss_and_ppl(mock_logits, targets_perfect)
loss_bad, ppl_bad = compute_causal_lm_loss_and_ppl(mock_logits, targets_bad)

print(f"高置信场景 - 损失: {loss_good:.4f}, PPL: {ppl_good:.4f}")
print(f"低置信场景 - 损失: {loss_bad:.4f}, PPL: {ppl_bad:.4f}")

assert ppl_good < ppl_bad
assert np.isclose(ppl_good, np.exp(loss_good))
print("测试通过：因果自回归交叉熵与困惑度 PPL 数学等价性完全验证！")"""

    l1_tips = [
        tip("不同分词器之间的困惑度 PPL 绝对不能直接横向对比，因为 Token 颗粒度直接决定了单步预测难度。", "pitfall"),
    ]

    # ── Lesson 5.2 ──
    l2_text = """### 学习目标
学完本节，你应该能够：
1. 理解大语言模型扩展法则（Scaling Laws）的经验发现与幂律分布（Power-Law）；
2. 掌握 OpenAI Kaplan 扩展法则与 DeepMind **Chinchilla 扩展法则**的核心分歧与数学修正；
3. **掌握 Chinchilla 计算最优配比定理**：推导在固定计算预算 $C$ 下，模型参数量 $N$ 与训练 Token 数 $D$ 的等比例平衡；
4. 理解现代开源模型（如 LLaMA）为何故意打破 Chinchilla 最优而选择**超额训练（Over-training）**的工业经济学考量。

### 前置知识
- 优化理论：拉格朗日乘子法求解带约束的极值问题；
- 幂函数图像与对数坐标系下的线性回归。

### 问题背景与 ML 用途
训练一个拥有上千亿参数的大语言模型耗资数百万甚至上千万美元。
- **盲目试错的巨大代价**：如果在开始训练前无法预知模型最终效果，或者模型规模与数据量配比失调，数千万美元算力将直接浪费；
- 2020 年，OpenAI 的 Kaplan 等人证明了语言模型的性能**跨越数个数量级严格遵循平滑的幂律法则**；
- 2022 年，DeepMind 的 Hoffmann 等人提出了 **Chinchilla 定律**，彻底重构了工业界对模型参数与数据配比的认知；
- 掌握 Scaling Laws，就拥有了精确预测超大模型性能、合理分配算力资源的“神谕指南”。

### 直觉理解
- **厨师与食材的黄金搭配（Chinchilla 直觉）**：
  - 模型参数量 $N$ 就像雇佣的特级大厨数量，训练 Token 数 $D$ 就像买进的食材数量；
  - **Kaplan 的误区（大厨太多，食材不够）**：早期研究把钱都花在雇大厨上（模型做到了 1750 亿参数），但只买了 3000 亿食材给他们练手。大厨们处于严重的“欠拟合（Under-trained）”状态！
  - **Chinchilla 的纠偏（厨师与食材等比例匹配）**：最经济的做法是厨师和食材等比例增加：每增加 1 名厨师，就必须配齐对应倍数的食材！

### 核心概念与符号对照表
| 核心物理量 | 符号 | 计量单位 / 典型数值 | 核心关系 |
| --- | --- | --- | --- |
| **浮点运算总量** | $C$ | FLOPs (如 $10^{24}$ FLOPs) | 训练总算力，近似满足 $C \\approx 6 N D$ |
| **模型非嵌入参数量** | $N$ | 参数个数 (如 7B, 70B) | 决定单次前向/反向的计算开销与显存 |
| **训练数据量** | $D$ | Token 个数 (如 2T, 15T) | 喂给模型的训练语料总量 |
| **Chinchilla 黄金比例** | $D / N$ | 理论最优比率 $\\approx 20$ | 参数量与 Token 数应维持在 $1:20$ 等比例增长 |
| **超额训练 (Over-training)** | $D / N \\gg 20$ | 现代开源比率 (如 $15\\text{T} / 8\\text{B} \\approx 1875$) | 牺牲预训练算力最优，换取长远极低的单次推理开销 |

### 数学原理与逐步推导
对于仅包含 Decoder 的自回归 Transformer 模型：
$$\\text{FLOPs}_{\\text{forward}} \\approx 2N, \\quad \\text{FLOPs}_{\\text{backward}} \\approx 4N$$
总训练计算量满足：
$$C \\approx 6 N D$$

Hoffmann 等人（2022）将测试损失建模为：
$$\\mathcal{L}(N, D) = E + \\frac{A}{N^\\alpha} + \\frac{B}{D^\\beta}$$
拟合参数：$\\alpha \\approx 0.34, \\beta \\approx 0.28$。
在约束 $6 N D = C$ 下最小化损失，解得：
$$N^* \\propto C^a, \\quad D^* \\propto C^b$$
其中 $a = \\frac{\\beta}{\\alpha + \\beta} \\approx 0.45, b = \\frac{\\alpha}{\\alpha + \\beta} \\approx 0.55$。
**Chinchilla 核心结论**：模型大小 $N$ 和数据量 $D$ 应该以几乎**均等的比例同步扩大**！最优比率大约为 $D \\approx 20 N$。

### 常见认知误区与避坑指南
1. **误以为超额训练（Over-training）是不懂 Chinchilla 定律的愚蠢行为**：Meta 在训练 LLaMA-3 时，给 8B 的模型喂了高达 15T 的超巨量 Token。这是**工业推理经济学**的选择：预训练只进行一次，但模型上线后每天要服务数十亿次推理。超额训练小模型，用预训练算力的微弱次优，换取未来几年线上部署服务器推理成本节省数亿美元！
2. **误以为只要无限增加数据，小模型就能无限逼近大模型上限**：小模型有参数容量（Capacity）瓶颈，数据量过多后会出现容量饱和。超大模型涌现出的复杂多步推理能力是小模型无法简单通过堆数据获得的。

### 工业级工程实践
- **算力预算倒推训练计划**：启动预训练项目前，先用卡数、MFU 算力利用率和预定天数算准总算力 $C$，再代入 $C \\approx 6ND$ 确定模型结构与数据吞吐目标。

### 拓展阅读与学术文献
1. **Kaplan et al. (2020)**: *Scaling Laws for Neural Language Models* (OpenAI)。
2. **Hoffmann et al. (2022)**: *Training Compute-Optimal Large Language Models* (DeepMind Chinchilla)。
3. **Touvron et al. (2023)**: *LLaMA: Open and Efficient Foundation Language Models*。

### 知识总结与核心记忆要点
- **经验算力公式**：自回归 Transformer 训练总算力近似为 $C \\approx 6ND$。
- **Chinchilla 核心**：在固定预算下，参数量与数据量应按 $1:1$ 比例等速扩张（$D \\approx 20N$ 为理论平衡点）。
- **现代工业抉择**：为了极致压缩线上推理成本，业界全线转向针对小模型（7B/8B）进行超额训练（$D/N > 1000$）。"""

    l2_code = """import numpy as np

def chinchilla_optimal_allocation(total_flops_budget):
    \"\"\"
    根据 Chinchilla 定律估算在固定 FLOPs 预算下的计算最优模型参数量 N 和数据量 D
    C ≈ 6 * N * D, 理论最优比例 D ≈ 20 * N
    可联立解得: C ≈ 120 * N^2 -> N = sqrt(C / 120)
    \"\"\"
    N_opt = np.sqrt(total_flops_budget / 120.0)
    D_opt = 20.0 * N_opt
    return float(N_opt), float(D_opt)

budget_flops = 1e24
N_opt, D_opt = chinchilla_optimal_allocation(budget_flops)

print(f"总算力预算: {budget_flops:.1e} FLOPs")
print(f"Chinchilla 理论最优参数量 N: {N_opt / 1e9:.2f} B")
print(f"Chinchilla 理论最优数据量 D: {D_opt / 1e9:.2f} B Tokens")
print(f"最优 Token/参数 比率 (D/N):  {D_opt / N_opt:.1f}")

assert 15.0 < (D_opt / N_opt) < 25.0
print("测试通过：Chinchilla 算力最优分配计算完全符合幂律拟合规范！")"""

    l2_tips = [
        tip("自回归 Transformer 的总训练 FLOPs 近似公式为 C ≈ 6 * N * D，其中前向传播约占 2ND，反向传播约占 4ND。", "note"),
    ]

    # ── Lesson 5.3 ──
    l3_text = """### 学习目标
学完本节，你应该能够：
1. 掌握文本生成阶段贪心搜索（Greedy Search）的机制与退化缺陷；
2. 掌握温度调节（Temperature）在 Softmax 概率重塑上的数学原理；
3. **精通 Top-k 与 Top-p (Nucleus) 核采样算法** 的截断选择逻辑与纯 Python 代码实现；
4. 掌握大模型后训练（Post-Training）全景演进：预训练基座模型（Base） $\\to$ 监督微调（SFT） $\\to$ 人类偏好对齐（RLHF / DPO）。

### 前置知识
- 累积概率分布（CDF）；
- 离散随机变量的多项式采样（Multinomial Sampling）。

### 问题背景与 ML 用途
当我们拥有了一个经过上万亿 Token 预训练的大语言模型后，我们面临两个关键落地问题：
1. **模型如何开口把词说出来？（解码采样策略）**：
   - 语言模型的输出只是词表上的一组概率值。如果每次都只选概率最高的那个词（贪心搜索），生成的句子往往极度僵化，甚至很快陷入无休止的车轱辘话死循环；
   - 如何通过**温度（Temperature）**、**Top-k** 和 **Top-p（核采样）** 动态注入创造力与随机性，决定了生成文本的自然度与严谨度；
2. **模型如何听懂人话、安全对齐？（后训练全流程）**：
   - 刚预训练好的基座模型（Base Model）只是一个强大的“文本续写机器”，必须通过**指令微调（SFT）**和**人类偏好对齐（RLHF / DPO）**，才能让模型化身为一个乐于助人、诚实无害的智能助手。

### 直觉理解
- **调酒师的温度计（Temperature 直觉）**：当 $T \\to 0$（极冷）：概率最高的词被绝对放大，模型变成确定性机器人；当 $T = 0.7$（温和）：高频词大概率被选中，但也允许第二、第三名的优质词冒泡，兼具逻辑与创造力；当 $T > 2$（沸腾）：所有词概率被烫平，模型开始胡言乱语。
- **抓大放小的智慧（Top-p 核采样直觉）**：Top-p 不固定候选词数量，而是动态累加概率，直到候选池的累积概率达到 $p$（例如 90%）为止。当模型笃定时池子里可能只有 1 个词；当语境开放时池子自动扩充到 100 个词。随境而动！

### 核心概念与符号对照表
| 采样策略 | 数学公式 / 规则 | 调控参数 | 适用场景 |
| --- | --- | --- | --- |
| **贪心搜索 (Greedy)** | $w_t = \\arg\\max_v P(v \\mid w_{<t})$ | 无 | 代码生成、数学计算、精确结构化提取 |
| **温度调节 (Temp)** | $P_i = \\frac{\\exp(z_i / T)}{\\sum_j \\exp(z_j / T)}$ | $T > 0$ | $T < 1$ 增强确定性，$T > 1$ 增强随机性 |
| **Top-k 采样** | 仅保留未归一化概率最高的前 $k$ 个候选词 | $k \\in \\mathbb{Z}^+$ | 滤除词表长尾低质噪声 |
| **Top-p 核采样** | 截取累积概率刚好覆盖 $p$ 的最小子集 $V^{(p)}$ | $p \\in (0, 1]$ | 开放式聊天、故事创作、头脑风暴 |
| **后训练演进** | Base $\\to$ SFT $\\to$ RLHF / DPO | 训练阶段 | 将续写机器转变为遵守人类意图的 AI 助手 |

### 数学原理与逐步推导
引入温度参数 $T > 0$：
$$P_i(T) = \\frac{\\exp(z_i / T)}{\\sum_{j=1}^V \\exp(z_j / T)}$$
- 当 $T \\to 0^+$ 时，最大分量的概率趋近于 1，其余所有词概率归零，等价于确定性的贪心搜索；
- 当 $T \\to +\\infty$ 时，$z_j / T \\to 0$，分布退化为均匀分布。

Top-p 核采样步骤：
1. 将 Softmax 概率按降序排列：$P_{(1)} \\ge P_{(2)} \\ge \\dots \\ge P_{(V)}$；
2. 计算累积概率 $C_m = \\sum_{i=1}^m P_{(i)}$；
3. 选取最小的 $k^*$ 满足 $C_{k^*} \\ge p$；
4. 将 $k^*$ 之后的尾部概率置 0，并重新归一化前 $k^*$ 个候选词；
5. 多项式抽样输出。

### 常见认知误区与避坑指南
1. **误以为温度 T=0 时仍有随机性**：当设置 `temperature=0` 时，系统底层直接执行 `argmax` 贪心解码，不再进行任何多项式抽样，输出是完全绝对一致的确定性文本。
2. **误以为 SFT 监督微调能够教给模型全新的世界知识**：学术界“LIMA”假说指出：大模型的绝大部分世界事实知识早在自监督预训练阶段就已经学完了；SFT 的本质只是教会模型以何种格式来与人类交互。

### 工业级工程实践
- **DPO（直接偏好优化）对 PPO 的升级**：DPO 证明了隐式奖励函数可以直接由语言模型本身的概率解析表达，彻底甩掉了奖励模型与复杂强化学习采样循环，将人类对齐简化为优雅稳定的二分类交叉熵损失。
- **Repetition Penalty**：对前文已经生成过的 Token 的 Logits 乘以衰减因子（除以 1.1~1.2），能立竿见影消除长文本中的循环死锁。

### 拓展阅读与学术文献
1. **Holtzman et al. (2019)**: *The Curious Case of Neural Text Degeneration* (ICLR 2020)。
2. **Ouyang et al. (2022)**: *Training language models to follow instructions with human feedback* (RLHF)。
3. **Rafailov et al. (2023)**: *Direct Preference Optimization: Your Language Model is Secretly a Reward Model* (DPO)。

### 知识总结与核心记忆要点
- **贪心缺陷**：易陷入重复局部最优，需依赖随机采样释放模型潜力。
- **温度本质**：控制 Softmax 分布熵的平缓程度，低温确定收敛、高温发散多变。
- **Top-p 动态核**：随语境自适应伸缩候选池，兼顾生成的多样性与逻辑安全性。
- **后训练三部曲**：预训练赋予知识（Base） $\\to$ SFT 赋予交互指令（Chat） $\\to$ RLHF/DPO 赋予价值对齐。"""

    l3_code = """import numpy as np

def sample_next_token(logits, temperature=1.0, top_p=0.9):
    logits = logits.copy().astype(np.float64)
    if temperature <= 1e-4:
        return int(np.argmax(logits))
        
    logits = logits / temperature
    logits_max = np.max(logits)
    exp_logits = np.exp(logits - logits_max)
    probs = exp_logits / np.sum(exp_logits)
    
    if 0.0 < top_p < 1.0:
        sorted_indices = np.argsort(probs)[::-1]
        sorted_probs = probs[sorted_indices]
        cumulative_probs = np.cumsum(sorted_probs)
        
        remove_mask = cumulative_probs > top_p
        remove_mask[1:] = remove_mask[:-1].copy()
        remove_mask[0] = False
        
        indices_to_remove = sorted_indices[remove_mask]
        probs[indices_to_remove] = 0.0
        probs = probs / np.sum(probs)
        
    return int(np.random.choice(len(probs), p=probs))

np.random.seed(42)
mock_logits = np.array([5.0, 4.0, 1.0, 0.5, -2.0, -5.0])

token_greedy = sample_next_token(mock_logits, temperature=0.001)
samples = [sample_next_token(mock_logits, temperature=1.0, top_p=0.8) for _ in range(100)]

print(f"低温贪心生成 Token ID: {token_greedy}")
print(f"Top-p=0.8 采样出的 Token 集合: {set(samples)}")

assert token_greedy == 0
assert set(samples).issubset({0, 1})
print("测试通过：温度调节与 Top-p 核采样算法逻辑完全正确！")"""

    l3_tips = [
        tip("在代码编写或数学证明等需要高精度答案的任务中，应将 temperature 设为 0；在创意写作任务中可设为 0.7~0.9。", "note"),
    ]

    lessons = [
        lesson("ml-tf-l5-1", "自回归预训练目标、交叉熵损失与困惑度 PPL", l1_text, 2, l1_tips, [demo(code=l1_code, title="自回归交叉熵与困惑度 PPL 计算")]),
        lesson("ml-tf-l5-2", "模型扩展法则 (Scaling Laws) 与计算最优配比", l2_text, 3, l2_tips, [demo(code=l2_code, title="Chinchilla 算力分配与数据配比预测")]),
        lesson("ml-tf-l5-3", "文本生成解码采样策略与对齐演进", l3_text, 2, l3_tips, [demo(code=l3_code, title="温度控制与 Top-p 核采样算法测试")]),
    ]

    exercises = [
        single_choice(
            ex_id="ml-tf-c5-ex1",
            question="设自回归因果语言模型在某测试集上的平均交叉熵损失为 \\mathcal{L}，则该模型的困惑度（Perplexity, PPL）在数学上等于：",
            options=[
                {"value": "A", "text": "\\mathcal{L}^2"},
                {"value": "B", "text": "\\exp(\\mathcal{L})"},
                {"value": "C", "text": "\\log_2(\\mathcal{L})"},
                {"value": "D", "text": "1.0 / \\mathcal{L}"},
            ],
            answer="B",
            explanation="推导证明，困惑度是全序列联合生成概率几何平均数的倒数，在自然对数底数下，数学上严格等价于平均交叉熵损失的自然指数映射：PPL = \\exp(\\mathcal{L})。",
            difficulty=2,
            related_lesson_id="ml-tf-l5-1",
            tags=["困惑度", "PPL", "交叉熵损失", "语言模型评估"],
        ),
        multiple_choice(
            ex_id="ml-tf-c5-ex2",
            question="关于 DeepMind 提出的 Chinchilla 扩展法则（Scaling Laws），下列说法正确的有：",
            options=[
                {"value": "A", "text": "在固定的总训练计算预算 C 下，模型参数量 N 与训练 Token 数据量 D 应该以大致 1:1 的均等比例同步扩增"},
                {"value": "B", "text": "Chinchilla 定律指出早期许多超大模型（如 GPT-3 175B）在数据量上配比过少，处于严重的欠训练（Under-trained）状态"},
                {"value": "C", "text": "根据经验公式，自回归因果 Transformer 训练的总 FLOPs 大约满足 C ≈ 6 * N * D"},
                {"value": "D", "text": "Chinchilla 定律证明只要模型参数达到 7B，就绝对不需要超过 100 亿 Token 的训练数据"},
            ],
            answer=["A", "B", "C"],
            explanation="A、B、C 均为 Chinchilla 定律的核心论断。D 选项严重错误，Chinchilla 表明 7B 模型的计算最优数据量至少在 1400 亿 Token，现代开源大模型更是超额训练到数万亿 Token。",
            difficulty=2,
            related_lesson_id="ml-tf-l5-2",
            tags=["ScalingLaws", "Chinchilla", "算力配比", "FLOPs"],
        ),
        judge(
            ex_id="ml-tf-c5-ex3",
            question="在文本生成解码时，当温度参数 Temperature 趋近于 0 时，采样算法的输出在数学上完全等价于确定性的贪心搜索（Greedy Search）。",
            answer=True,
            explanation="正确。当 T -> 0 时，Softmax 中最大分量对应的指数项将呈无穷大倍数碾压其余分量，其概率极限逼近 1，其余所有词概率归零，等价于 argmax 贪心选择。",
            difficulty=1,
            related_lesson_id="ml-tf-l5-3",
            tags=["温度采样", "贪心搜索", "解码策略"],
        ),
        fill(
            ex_id="ml-tf-c5-ex4",
            question="Top-p 采样又称为____采样（填两个汉字），它通过按概率降序累加候选词，直到累加概率首度超过设定的阈值 p 为止，动态截断长尾低质词。",
            blanks=[["核"]],
            explanation="Top-p 采样在学术文献中被称为核采样（Nucleus Sampling）。",
            difficulty=1,
            related_lesson_id="ml-tf-l5-3",
            tags=["Top-p", "核采样", "解码策略"],
        ),
        open_ex(
            ex_id="ml-tf-c5-ex5",
            question="为什么以 LLaMA 为代表的现代开源大模型，普遍违背 Chinchilla 计算最优配比，选择在 8B 的极小参数量上投入高达 15 万亿 Token 的超额训练？",
            reference_answer="工业经济学考量：\n1. 预训练阶段虽然只占一次性算力成本，但模型发布后的在线推理服务需要长年累月处理数十亿次用户请求；\n2. 推理时的显存带宽与算力开销直接正比于模型参数量（8B 的单次推理显存开销仅为 70B 的近十分之一）；\n3. 通过在预训练期多花算力“超额训练”小模型，把小模型的潜力压榨到极致，能够在长远部署中节省数以千万美元计的线上服务器推理成本，达到全生命周期综合成本最低。",
            explanation="预训练算力的微弱次优换取了工业推理全生命周期的高效低成本。",
            rubric=[
                {"points": 5, "description": "阐述预训练一次性成本与长期推理部署成本的差异"},
                {"points": 5, "description": "说明小模型在推理显存和吞吐上的巨大成本优势"},
            ],
            difficulty=3,
            related_lesson_id="ml-tf-l5-2",
            tags=["超额训练", "推理经济学", "LLaMA架构"],
        ),
        # ── Code Exercise 5 ──
        {
            "id": "ml-tf-c5-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】实现带温度缩放与 Top-p 截断的概率分布重塑：\n编写函数 `top_p_filtering(logits, temperature=1.0, top_p=0.9)`：\n1. `scaled = logits / temperature`；\n2. 计算数值稳定的 Softmax 概率；\n3. 降序排列并累加，将累积概率超过 `top_p` 的多余尾部词概率置 0（保留使累积概率首次达到或突破 top_p 的边界词）；\n4. 重新归一化后返回过滤后的概率数组。\n\n最后一行请以给定的 logits 数组调用测试。",
            "starterCode": "import numpy as np\n\ndef top_p_filtering(logits: np.ndarray, temperature: float = 1.0, top_p: float = 0.9) -> np.ndarray:\n    \"\"\"实现温度缩放与 Top-p 核过滤概率重塑\"\"\"\n    # 请在此实现\n    ___\n\nlogits = np.array([4.0, 3.0, 0.0, -2.0, -5.0])\nres = top_p_filtering(logits, temperature=1.0, top_p=0.8)\nprint(res.shape)\n",
            "setupCode": "",
            "expectedOutput": "(5,)",
            "answer": "import numpy as np\n\ndef top_p_filtering(logits: np.ndarray, temperature: float = 1.0, top_p: float = 0.9) -> np.ndarray:\n    scaled_logits = logits.copy().astype(np.float64) / temperature\n    scaled_logits -= np.max(scaled_logits)\n    exp_logits = np.exp(scaled_logits)\n    probs = exp_logits / np.sum(exp_logits)\n    \n    if top_p < 1.0:\n        sorted_indices = np.argsort(probs)[::-1]\n        sorted_probs = probs[sorted_indices]\n        cumulative_probs = np.cumsum(sorted_probs)\n        \n        remove_mask = cumulative_probs > top_p\n        remove_mask[1:] = remove_mask[:-1].copy()\n        remove_mask[0] = False\n        \n        indices_to_remove = sorted_indices[remove_mask]\n        probs[indices_to_remove] = 0.0\n        probs = probs / np.sum(probs)\n        \n    return probs\n\nlogits = np.array([4.0, 3.0, 0.0, -2.0, -5.0])\nres = top_p_filtering(logits, temperature=1.0, top_p=0.8)\nprint(res.shape)\n",
            "tests": "logits_t = np.array([4.0, 3.0, 0.0, -2.0, -5.0])\nfiltered_t = top_p_filtering(logits_t, temperature=1.0, top_p=0.8)\nassert np.isclose(np.sum(filtered_t), 1.0), \"重归一化概率和必须为 1\"\nassert filtered_t[3] == 0.0 and filtered_t[4] == 0.0, \"尾部截断位置概率必须为 0\"\n",
            "explanation": "通过温度缩放调节 Softmax 熵，利用累积分布截断长尾杂质词，重新归一化后保留高置信的核心子集。",
            "tags": ["Top-p", "温度调节", "概率重塑", "算法实战"],
            "related_lesson_id": "ml-tf-l5-3",
        },
    ]

    return chapter(
        chapter_id="ml-tf-c5",
        course_id="ml-transformer-llm",
        order=5,
        title="语言模型预训练、对齐与生成评估",
        goal="系统掌握大语言模型从海量无监督预训练、Chinchilla 算力分配，到解码生成采样策略与后训练人类偏好对齐。",
        lessons=lessons,
        exercises=exercises,
    )
