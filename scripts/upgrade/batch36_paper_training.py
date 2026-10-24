# -*- coding: utf-8 -*-
"""batch36 B 组：paper-training《训练与规模》6 节升级（TS 源，_batch34_lib 模式）。
用法：python batch36_paper_training.py verify -> 跑章代码看输出
     python batch36_paper_training.py         -> 打补丁
"""
from _batch34_lib import Lib, build_md, finish
import sys

lib = Lib("paper-training", [
    "src/content/chapters/paper-training.ts",
    "src/content/chapters/paper-training2.ts",
    "src/content/chapters/paper-training3.ts",
    "src/content/chapters/paper-training4.ts",
    "src/content/chapters/paper-training5.ts",
    "src/content/chapters/paper-training6.ts",
])

C1 = dict(
name="c1 Scaling Laws：损失是规模的幂律",
why=("「更大的模型会更好吗？好多少？」2020 年前只能试试看。Kaplan 等人发现语言模型的损失是参数量、数据量、"
     "计算量的平滑幂律——用小模型的结果可以外推大模型，训练前就能算出「X 算力换多少损失」。这把大模型研发"
     "从玄学变成可规划的工程：GPT-3、Chinchilla 都按它排产。2022 年 Chinchilla 又修正了资源分配公式"
     "（每参数 20 token），证明实验设计本身会影响结论。"),
intuition=("幂律在双对数坐标下是直线：损失像下坡的滑梯，每投入 10 倍算力就下滑固定一格（约 11-20%）。"
             "给预算分蛋糕也遵循简单的账本：C≈6ND（前向 2 份+反向 4 份），Kaplan 说蛋糕要七成给参数、"
             "三成给数据；Chinchilla 说对半分、每参数配 20 token——大模型训练的「配方之争」就是这条账本。"),
code='''import math
E, A, B, a, b = 1.69, 406.4, 410.7, 0.34, 0.28   # Kaplan 论文的拟合常数
L = lambda N, D: E + A/N**a + B/D**b
print("  C(FLOPs) | Kaplan N~C^0.73            | Chinchilla D=20N")
for C in (1e19, 1e21, 1e23):
    lg = math.log10(C)
    Nk = 10**(0.73*lg - 5.87); Dk = C/(6*Nk)          # Kaplan 分配(按论文表定标)
    Nc = math.sqrt(C/120); Dc = 20*Nc                 # Chinchilla: C=6ND=120N^2
    print(f"  {C:.0e} | N={Nk:.1e} D={Dk:.1e} D/N={Dk/Nk:5.1f} L={L(Nk,Dk):.3f} | "
          f"N={Nc:.1e} D={Dc:.1e} L={L(Nc,Dc):.3f}")''',
expected=("实测：C=1e19 时 Kaplan 分配 N=1.0e8/D=1.7e10（D/N=167）损失 3.029，Chinchilla N=2.9e8 损失 2.989；"
          "C=1e21 两者巧合重合（N=2.9e9，D/N=20，L=2.335）；C=1e23 时 Kaplan D/N 跌到 2.4（数据饥饿）、"
          "损失 2.050，Chinchilla 保持 D/N=20、损失 2.012——预算越大，「参数优先」越吃亏。"),
cerr=("把三个一维指数（0.076/0.095/0.050）混用进三维公式（应为 0.34/0.28）；忘算 C=6ND 的系数 6"
      "（前向 2+反向 4），预算换算全错；在小模型上外推任意远——幂律只在观测区间内可信。"),
miscon=("1. **损失低=能力强**——Scaling Law 只预测损失，下游指标可能非线性甚至突变（涌现争议）；\n"
        "2. **Kaplan 与 Chinchilla 有对错之分**——分配结论依赖学习率调度、数据重复等实验设定，是两次测量不是一次纠错；\n"
        "3. **数据越多越好**——重复超过 4 次收益骤减，质量比数量重要。"),
connection=("- **向前**：paper-theory c1 的「损失=编码长度」给幂律以信息论含义；\n"
            "- **向后**：c2 的流水线并行与 c6 的 RLHF 都以「算力可规划」为前提；数据工程（去重/配比）决定 D 的质量；\n"
            "- **平行**：涌现能力争论（Wei 2022 vs Schaeffer 2023 的度量假象说）。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 幂律 | L(N,D)=L∞+A/N^0.34+B/D^0.28，双对数坐标是直线 |\n"
         "| 账本 | C≈6ND（前向 2+反向 4） |\n"
         "| 分配 | Kaplan N∝C^0.73 vs Chinchilla D≈20N（等比例） |\n"
         "| 实测 | C=1e23：Kaplan 2.050 vs Chinchilla 2.012 |\n"
         "| 教训 | 实验设计影响结论 |"),
ref="本课程整理（可参见论文原文：Kaplan et al., Scaling Laws for Neural Language Models, arXiv:2001.08361；Hoffmann et al., Chinchilla, arXiv:2203.15556）",
)

C2 = dict(
name="c2 GPipe：流水线并行",
why=("模型比显存大是常态：数据并行装不下模型，朴素模型并行同一时刻只有一张卡在干活（利用率 1/K）。"
     "GPipe 的答案是「模型切开放 + 微批流水线」：把 mini-batch 切成 M 个 micro-batch 让它们在 K 级流水线上"
     "重叠执行，气泡占比 (K-1)/(M+K-1) 随 M 增大迅速趋零。它还带来两个标配技术：跨 micro-batch 累积 "
     "BatchNorm 统计量、用重计算（多 33% 计算换显存）。今天 Megatron/DeepSpeed 的「张量+流水线+数据」"
     "三维并行，流水线这一维的直接源头就是 GPipe。"),
intuition=("洗车流水线：一辆车（mini-batch）拆成 M 个部件（micro-batch）依次经过 K 个工位。开工和收工时"
           "后面的工位没活干（气泡），但中间满负荷。想省时间不是加人手，而是送更多小部件进来把空档填满——"
           "M=128 时气泡只剩 2%。代价是每个部件太小、质检（BatchNorm）要跨部件累计数据才准。"),
code='''K, M = 4, 8
bubble = lambda K, M: (K-1)/(M+K-1)
print("气泡比例: " + "  ".join(f"M={m}: {bubble(4, m):.0%}" for m in (4, 8, 32, 128)))
print("前向调度(行=GPU级, 列=时间步):")
for k in range(K):
    row = "".join(f"F{t-k:<2d}" if k <= t < k + M else " . " for t in range(K + M - 1))
    print(f"  GPU{k}: {row}")
print(f"总时间=(M+K-1)={M+K-1} 步, 理想 {M} 步, 利用率 {100*M/(M+K-1):.1f}%")''',
expected=("实测：气泡比例 M=4→43%、M=8→27%、M=32→9%、M=128→2%；K=4/M=8 的调度表显示 GPU0~3 依次错开一拍，"
          "中段全部并行；总时间 11 步 vs 理想 8 步，利用率 72.7%——M 翻倍气泡按 (K-1)/(M+K-1) 缩小。"),
cerr=("把气泡公式记成 (K-1)/M——分母漏掉 K-1，小 M 时严重低估；micro-batch 切太碎又不处理 "
      "BatchNorm 统计，精度反而掉；重计算当成「免费」——它多一次前向，计算量 +33%。"),
miscon=("1. **流水线=无代价加速**——气泡、显存不均衡、边界通信都在吃效率，M 要够大才接近线性；\n"
        "2. **模型并行比数据并行高级**——它们切的东西不同（层 vs 数据），实际大训练是三维并行组合；\n"
        "3. **micro-batch 越大越好**——M 大气泡小，但 micro-batch 变小伤害 BN 统计与算术强度。"),
connection=("- **向前**：c1 的 Scaling Law 决定「必须训大」，本节回答「单卡装不下怎么办」；\n"
            "- **向后**：1F1B/PipeDream 优化调度与显存，Megatron-LM 叠加张量并行；\n"
            "- **平行**：数据并行（梯度同步）与张量并行（层内切分）是同一问题的不同切法。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 方案 | 模型按层切 K 级 + mini-batch 切 M 个 micro-batch |\n"
         "| 气泡 | (K-1)/(M+K-1)：实测 M=4→43%，M=128→2% |\n"
         "| 配套 | 跨 micro-batch 累积 BN 统计；重计算省显存（+33% 计算） |\n"
         "| 战绩 | 128 卡近线性加速；ResNet 放大 8 倍 84.3% |\n"
         "| 地位 | Megatron/DeepSpeed 流水线维的源头 |"),
ref="本课程整理（可参见论文原文：Huang et al., GPipe, arXiv:1811.06965；Shoeybi et al., Megatron-LM, arXiv:1909.08053）",
)

C3 = dict(
name="c3 PPO：让策略更新别走太远",
why=("策略梯度方差大，一步更新走太远策略就崩；TRPO 用 KL 硬约束稳住，但要算 Fisher 矩阵、共轭梯度，"
     "实现复杂。PPO 的洞察：不用真算 KL，「截断」重要性比率就够了——min(r·A, clip(r,1±ε)·A) 让过度更新"
     "自动失去梯度。一阶优化、实现简单、稳定少调参，使它成为 RL 事实标准，也是 RLHF 三阶段里的第三级火箭"
     "（InstructGPT/ChatGPT 都用它对齐）。"),
intuition=("牵狗散步：TRPO 是给狗画一个「不许出」的圆圈（硬约束，要费劲盯着）；PPO 是用伸缩绳——"
           "在信任范围内自由走（线性梯度），拉太远绳子绷直（clip 区域梯度为零）自动停下。"
           "绳子不阻止正常散步，只在要冲出去的时候拽住——这就是 min 的妙处。"),
code='''import numpy as np
eps = 0.2
def ppo_obj(r, A):
    return np.minimum(r * A, np.clip(r, 1-eps, 1+eps) * A)
for A in (1.0, -1.0):
    rs = np.array([0.7, 0.9, 1.0, 1.1, 1.3])
    print(f"A={A:+.0f}: r={rs} -> 目标={ppo_obj(rs, A)}")
r = np.linspace(0.5, 1.5, 11); d = 1e-6
g = (ppo_obj(r + d, 1.0) - ppo_obj(r - d, 1.0)) / (2*d)
print("A=1 时目标对 r 的梯度:", np.round(g, 2), "(band 外=0)")''',
expected=("实测：A=+1 时目标 [0.7, 0.9, 1.0, 1.1, 1.2]——r>1.2 被 clip 截平；A=-1 时 [-0.8, -0.9, -1.0, "
          "-1.1, -1.3]——r<0.8 被截在 -0.8；数值梯度在 [0.8,1.2] 内恒为 1、带外为 0（边界 0.5 是过渡点）——"
          "过度更新自动失去梯度。"),
cerr=("clip 写成截断 r 本身而不取 min——好动作被截后仍被推高（min 是「只截过度更新」的关键）；"
      "重复使用同一批数据 K 次却不算新策略的比率，退化为普通策略梯度；GAE 的 λ 取 1 还嫌方差大——"
      "λ=0.95 才是偏差方差折中。"),
miscon=("1. **PPO=TRPO 的弱化版**——论文实测多数任务不输 TRPO，复杂度却低一个量级；\n"
        "2. **clip 约束双向对称**——A>0 截上限、A<0 截下限，但另一侧不截（目标是非对称的 p-norm 式设计）；\n"
        "3. **RLHF 里 PPO 不用改**——要加 KL(π‖π_ref) 惩罚，否则模型钻奖励模型空子。"),
connection=("- **向前**：策略梯度/Actor-Critic 的方差问题与 TRPO 的信任域是直接前情；\n"
            "- **向后**：c6 RLHF 用 PPO 做第三阶段，KL 惩罚防 reward hacking；\n"
            "- **平行**：c1 的「预算纪律」与 PPO 的「更新纪律」同为防过冲的工程哲学。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 目标 | L=min(r·A, clip(r,1±ε)·A)，ε=0.2 |\n"
         "| 机制 | 带内线性（正常学）、带外平坦（自动停） |\n"
         "| 实测 | 梯度在 [0.8,1.2] 内=1，带外=0 |\n"
         "| 配套 | GAE(λ=0.95) 估优势；价值损失+熵正则 |\n"
         "| 地位 | RLHF 第三阶段的标准引擎 |"),
ref="本课程整理（可参见论文原文：Schulman et al., Proximal Policy Optimization Algorithms, arXiv:1707.06347；Schulman et al., GAE, arXiv:1506.02438）",
)

C4 = dict(
name="c4 Deep Speech 2：端到端语音识别",
why=("传统语音识别是五段流水线：手工特征→声学模型→发音词典→语言模型，各模块独立优化、误差累积，"
     "每换一种语言都要重造一遍。Deep Speech 2 用「频谱图→Conv→BiGRU→CTC」一套架构端到端打通中英文，"
     "在 LibriSpeech 上超过人类水平。核心技术坎是「对齐」：1000 帧音频对 20 个字符，谁对谁没人标注——"
     "CTC 用一个 blank 符号让网络自己学对齐，对所有合法对齐求和，动态规划 O(T·S) 精确计算。"),
intuition=("CTC 像让一个口译者「自由发挥停顿」：帧级输出可以任意拖长音（重复）或停顿（blank），"
           "最后按「合并相邻重复+删 blank」折叠成句子。同一句「你好」有无数种节奏都算对——损失就是"
           "把这些合法节奏的概率全部加起来。训练时不需要告诉模型每个字占几帧，折叠规则保证了殊途同归。"),
code='''import numpy as np, re
from itertools import product
probs = np.array([[0.8, 0.2], [0.5, 0.5], [0.9, 0.1]])   # 每帧 P(blank), P(a)
ext = "-a-"; pi = {"-": 0, "a": 1}
fold = lambda p: re.sub(r"(.)\\1+", r"\\1", p).replace("-", "")
enum = sum(np.prod([probs[t, pi[c]] for t, c in enumerate(p)])
           for p in map("".join, product("-a", repeat=3)) if fold(p) == "a")
alpha = np.zeros((3, 3)); alpha[0, 0], alpha[0, 1] = probs[0, 0], probs[0, 1]
for t in range(1, 3):
    for s in range(3):
        tr = alpha[t-1, s] + (alpha[t-1, s-1] if s else 0)
        if s == 2 and ext[s] != ext[s-2]: tr += alpha[t-1, s-2]      # 跳跃规则
        alpha[t, s] = tr * probs[t, pi[ext[s]]]
print("暴力枚举 P('a'|x) =", round(float(enum), 4))
print("CTC 前向 DP  P('a'|x) =", round(float(alpha[-1, 1] + alpha[-1, 2]), 4), "(两者应一致)")''',
expected=("实测：暴力枚举 6 条合法对齐（--a/-a-/-aa/a--/aa-/aaa）的概率和 = 0.63；CTC 前向 DP = 0.63，"
          "两者完全一致——指数级的对齐枚举被 O(T·S) 动态规划精确替代，跳跃规则防止「aa 被折叠成 a」的错误合并。"),
cerr=("折叠规则记反——先删 blank 再合并重复会把「a-a」错叠成「a」；DP 跳跃转移漏掉 ext[s]≠ext[s-2] "
      "的判断，重复字符的词永远学不出；解码只用贪心不用 beam search+语言模型，WER 高出几个点。"),
miscon=("1. **CTC 知道每帧对应哪个字**——它只定义折叠等价类，对齐是隐变量被边缘化掉；\n"
        "2. **帧级输出可直接当结果**——必须先折叠（合并重复+删 blank）；\n"
        "3. **端到端=不要语言模型**——DS2 解码仍叠加外部 LM，端到端指训练目标一体化。"),
connection=("- **向前**：c2 的「大数据+大模型工程化」（1.1 万小时数据、多 GPU）是 DS2 的底座；\n"
            "- **向后**：注意力对齐（LAS）、RNN-T 流式、Whisper 弱监督都是本范式的后代；\n"
            "- **平行**：paper-reasoning c2 指针网络——同样是「输出位置未知的序列映射」问题。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 转变 | 五段流水线 → 一套端到端架构（中英文通用） |\n"
         "| 对齐 | CTC：blank+折叠规则，所有合法对齐求和 |\n"
         "| 计算 | 前向 DP O(T·S)，实测与枚举一致（0.63） |\n"
         "| 技巧 | SortaGrad 先训短句稳定训练 |\n"
         "| 战绩 | LibriSpeech WER 5.3%，超人类 5.8% |"),
ref="本课程整理（可参见论文原文：Amodei et al., Deep Speech 2, arXiv:1512.02595；Graves et al., CTC, ICML 2006）",
)

C5 = dict(
name="c5 VLAE：让 VAE 学会丢信息",
why=("VAE 的两大顽疾：生成模糊（像素级重建损失倾向于把多种可能「平均」成一团）与后验坍塌"
     "（decoder 太强时 q(z|x)≈p(z)，z 完全不带信息）。VLAE 的解法是信息瓶颈式的分工：限制 encoder 的"
     "感受野，让 z 无法逐像素复制，被迫编码「全局语义」；用 PixelCNN 级别的强 decoder 生成局部细节。"
     "z 管「这是什么」，decoder 管「长什么样」——这个分工思想直接通向 VQ-VAE 与 Latent Diffusion。"),
intuition=("画家临摹照片：如果允许他每画一笔都瞄一眼原图（z 能复制像素），他什么都不记，画得平庸且千人一面"
           "（后验坍塌）。VLAE 只让他看一眼局部速写（受限感受野的 z），剩余全靠理解补全——为了画对，"
           "z 被迫记住「这是只猫还是只狗」这种全局语义，细节由绘画功底（自回归 decoder）现场生成，反而清晰。"),
code='''import numpy as np
rng = np.random.default_rng(11)
N, D = 4000, 16
s = rng.choice([-1.0, 1.0], N)                     # 全局语义(如数字类别)
u = rng.normal(0, 1, D); u /= np.linalg.norm(u)
x = s[:, None] * u * 3 + rng.normal(0, 1, (N, D))  # 每个像素都含全局信号 -> 局部相关
acc2 = float(((x[:, [0, 1]].mean(1) > 0) == (s > 0)).mean())
acc1 = float(((x[:, 15] > 0) == (s > 0)).mean())
print(f"从相邻 2 像素判类别: {acc2:.2f} -> 强 decoder 可局部自足(z 有坍塌风险)")
print(f"从最远 1 像素判类别: {acc1:.2f} -> 感受野受限时 z 必须补全局信息")
zval = float(((s[:, None] * u * 3)**2).mean()); noise = 1.0
print(f"z 可解释方差 {zval:.2f} vs 噪声 {noise:.2f} -> 信息瓶颈: z 编码全局, decoder 生成细节")''',
expected=("实测：从相邻 2 像素就能以 0.93 准确率判别全局类别——decoder 局部自足时 z 有坍塌风险；"
          "把感受野限制到单个远端像素准确率降到 0.78——局部信息不足迫使 z 编码全局；z（类别方向）可解释"
          "方差 0.56 vs 噪声 1.00——信息瓶颈把「全局给 z、细节给 decoder」的分工量化出来。"),
cerr=("KL 项权重 β 调到极小防坍塌——生成会变糊，VLAE 主张改架构（感受野）而非只拧 β；"
      "判定坍塌只看重构质量——要用 KL(q(z|x)‖p(z))≈0 或 z 消融来诊断；用强 decoder 却不给 z 全局信息，"
      "两头都想省力，重建崩塌。"),
miscon=("1. **模糊是 VAE 宿命**——模糊来自「逐像素平均」的重建目标与复制型 z，分工设计可以消除；\n"
        "2. **后验坍塌=训练失败**——它是 ELBO 下的合法解（z 无用最省 KL），要靠架构归纳偏置打破；\n"
        "3. **z 编码越多越好**——信息瓶颈的价值恰在丢弃：噪声与细节交给 decoder 的先验。"),
connection=("- **向前**：VAE 的 ELBO 与 KL 项在 paper-theory c2（Hinton 的 -Σlog σ ≈ KL）里已见雏形；\n"
            "- **向后**：VQ-VAE 的离散隐变量、Latent Diffusion 的「压缩+生成」两阶段继承同一分工；\n"
            "- **平行**：paper-vision 的自编码/扩散路线对比。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 两病 | 生成模糊 + 后验坍塌（q≈p，z 无信息） |\n"
         "| 药方 | 限制 encoder 感受野 + 强自回归 decoder |\n"
         "| 分工 | z 编码全局语义，decoder 生成局部细节 |\n"
         "| 实测 | 局部自足 0.93 vs 受限 0.78；z 方差占比 0.56/1.56 |\n"
         "| 战绩 | MNIST NLL ≈80 nats，接近纯 PixelCNN |"),
ref="本课程整理（可参见论文原文：Chen et al., Variational Lossy Autoencoder, arXiv:1611.02731；Kingma & Welling, Auto-Encoding Variational Bayes, arXiv:1312.6114）",
)

C6 = dict(
name="c6 RLHF：从人类偏好中学习奖励",
why=("「写一篇好文章」的奖励函数没法用公式写——手工设计必被钻空子（奖励=垃圾减少，机器人把垃圾藏起来）。"
     "Christiano 等人的洞察：人类不擅长打分，但擅长比较「A 和 B 哪个好」。用 Bradley-Terry 模型 "
     "P(A≻B)=σ(r(A)-r(B)) 从数百到数千次两两比较中学出奖励模型，再用 RL 优化它——这条路经 InstructGPT "
     "发扬成 SFT→RM→PPO 三阶段，成为大模型对齐的工业标准。"),
intuition=("米其林评审不写「美味方程式」，只做一件事：两道菜盲测选一道。无数个「A 优于 B」的判断，"
           "会自动拼出一张潜在的口味地图（奖励模型）。但地图只是近似——模型会专挑地图画错的地方冲刺"
           "（reward hacking），所以要拴上 KL 绳子不许离参考模型太远，还要集成多张地图互相纠错。"),
code='''import numpy as np
rng = np.random.default_rng(12)
def r_true(x): return 2.0 * x - 0.5 * x**2          # 真实奖励: 峰值在 x=2
X = rng.uniform(-1, 3, 3000)
def sample_pair(n):
    a = X[rng.integers(0, len(X), n)]; b = X[rng.integers(0, len(X), n)]
    pref = rng.random(n) < 1/(1 + np.exp(-(r_true(a) - r_true(b))))
    return a, b, pref
w = 0.0
for _ in range(300):
    a, b, pref = sample_pair(256)
    z = w * (a - b)
    w += 0.5 * np.mean((pref - 1/(1 + np.exp(-z))) * (a - b))   # BT 损失梯度
xs = np.linspace(-1, 3, 41)
print(f"学到的线性奖励 r=w·x, w={w:.3f}; 与真实奖励相关 {np.corrcoef(w*xs, r_true(xs))[0,1]:.3f}")
best = xs[int(np.argmax(w*xs))]
print(f"RM 最优点 x={best:.1f}(边界) vs 真实最优 x=2.0 -> 分布外盲点=reward hacking 风险")''',
expected=("实测：300 轮两两比较训练后，线性奖励模型 w=0.857，与真实奖励的相关 0.884——偏好数据足以还原"
          "奖励的大形状；但 RM 的最优点落在采样边界 x=3.0，而真实最优在 x=2.0（r(3)=1.5<r(2)=2.0）——"
          "模型分布外的外推盲点正是 reward hacking 的温床，KL 惩罚与集成是标准护栏。"),
cerr=("奖励模型在「策略生成的分布」之外训练后就不更新——策略漂移到 OOD 后 RM 打分离谱；"
      "BT 损失忘了奖励平移不变性去做绝对值校准；PPO 阶段不加拉 KL 惩罚，模型学会「迎合但无信息」的输出。"),
miscon=("1. **人类偏好=真实奖励**——偏好只是样本，RM 是有盲点的近似，过度优化必然发生；\n"
        "2. **比较比打分信息少**——相对判断的一致性远高于绝对打分，少量比较反而更高效；\n"
        "3. **RLHF=监督学习换皮**——它是在 RM 定义的非 stationary 奖励上做 RL，分布漂移是本质挑战。"),
connection=("- **向前**：c3 的 PPO 是本节第三阶段的引擎，KL 惩罚与 c2 的资源纪律同为「防过冲」设计；\n"
            "- **向后**：DPO 跳过显式 RM、Constitutional AI/RLAIF 用 AI 反馈替代人类标注；\n"
            "- **平行**：paper-theory c6 的「智能=广泛环境表现」——对齐正是给这个度量填上人类价值。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 困境 | 好奖励写不出，手工奖励必被 hack |\n"
         "| 方案 | 两两偏好 + Bradley-Terry: P(A≻B)=σ(r(A)-r(B)) |\n"
         "| 实测 | 300 轮比较后 corr=0.884，但 RM 最优在外推盲点 |\n"
         "| 流程 | SFT → RM → PPO（+KL 惩罚防偏离） |\n"
         "| 护栏 | RM 集成、KL 正则、早停 |"),
ref="本课程整理（可参见论文原文：Christiano et al., Deep Reinforcement Learning from Human Preferences, arXiv:1706.03741；Ouyang et al., InstructGPT, arXiv:2203.02155）",
)

THEMES = {
    "paper-training-c1": C1, "paper-training-c2": C2, "paper-training-c3": C3,
    "paper-training-c4": C4, "paper-training-c5": C5, "paper-training-c6": C6,
}

GOALS = {
"paper-training-c1-l1": ("1. 写出 L(N,D)=L∞+A/N^α+B/D^β 的三项含义（不可约熵/容量惩罚/数据惩罚），"
                         "解释幂律在双对数坐标下是直线意味着什么；\n"
                         "2. 用 C≈6ND 的账本比较 Kaplan（N∝C^0.73）与 Chinchilla（D≈20N）两种分配，"
                         "并说出两种结论差异的实验根源；\n"
                         "3. 用 numpy 计算三种预算下两种分配的损失，验证预算越大 Chinchilla 分配越优。"),
"paper-training-c2-l1": ("1. 对比数据/模型/流水线三种并行的切分对象与适用场景，指出朴素模型并行"
                         "利用率 1/K 的问题；\n"
                         "2. 手推气泡比例 (K-1)/(M+K-1) 与总时间公式，说明 micro-batch 数 M 如何填满流水线；\n"
                         "3. 用代码输出 K=4 的调度表，解释累积 BN 统计与重计算（+33% 计算换显存）两个配套技巧。"),
"paper-training-c3-l1": ("1. 说明策略梯度的方差问题与 TRPO 信任域思想的代价，写出 PPO 的 clip 目标函数；\n"
                         "2. 分 A>0/A<0 两种情况解释 min+clip 为何「只截过度更新、不阻止正常更新」；\n"
                         "3. 用数值梯度验证 clip 带内梯度为 1、带外为 0，并说出 GAE 的 λ 如何折中偏差与方差。"),
"paper-training-c4-l1": ("1. 对比传统五段流水线与端到端架构的误差传播方式，说出「对齐未知」是端到端的核心坎；\n"
                         "2. 写出 CTC 的折叠规则（合并相邻重复+删 blank）与损失定义（所有合法对齐求和），"
                         "手推前向 DP 的递推与跳跃条件；\n"
                         "3. 用代码对同一小例子分别做暴力枚举与前向 DP，验证两者一致（O(T·S) 的正确性）。"),
"paper-training-c5-l1": ("1. 解释 VAE 生成模糊与后验坍塌的成因（逐像素平均、强 decoder 下 z 无用武之地）；\n"
                         "2. 说明 VLAE 的信息瓶颈分工：限制 encoder 感受野迫使 z 编码全局语义，"
                         "强自回归 decoder 负责细节；\n"
                         "3. 用合成数据量化「局部自足 vs 感受野受限」下 z 的信息负载与可解释方差占比。"),
"paper-training-c6-l1": ("1. 用「垃圾藏起来」的例子解释 reward hacking，说明为什么两两偏好比绝对打分更可靠；\n"
                         "2. 写出 Bradley-Terry 模型 P(A≻B)=σ(r(A)-r(B)) 与奖励模型损失，"
                         "复述 SFT→RM→PPO 三阶段流程；\n"
                         "3. 用合成偏好数据训练线性 RM，验证其与真实奖励相关但最优解落在外推盲点——"
                         "理解 KL 惩罚与集成的必要性。"),
}

PREREQS = {
"paper-training-c1-l1": "- 幂函数与对数坐标；\n- 交叉熵损失的含义（paper-theory c1）；\n- 训练/参数量的基本概念。",
"paper-training-c2-l1": "- 反向传播需要保存中间激活（显存去向）；\n- 数据并行的梯度同步；\n- c1 的算力账本 C=6ND。",
"paper-training-c3-l1": "- 策略梯度与 Actor-Critic 基础（强化学习入门）；\n- 重要性采样比率的概念；\n- KL 散度。",
"paper-training-c4-l1": "- 序列建模与 RNN/卷积基础；\n- 动态规划（前向算法）直觉；\n- 交叉熵损失。",
"paper-training-c5-l1": "- VAE 的 ELBO 与 KL 项（变分推断基础）；\n- 自回归模型（PixelCNN 思想）；\n- paper-theory c2 的 KL 惩罚视角。",
"paper-training-c6-l1": "- 强化学习基本设定（状态/动作/回报）；\n- sigmoid 与 logistic 回归；\n- c3 的 PPO。",
}

MD = {}
for cid, t in THEMES.items():
    lid = cid + "-l1"
    MD[lid] = build_md(lib.orig_content(lid), GOALS[lid], PREREQS[lid],
                       t["why"], t["intuition"], t["code"], t["expected"],
                       t["cerr"], t["miscon"], t["connection"], t["summary"], t["ref"])

if len(sys.argv) > 1 and sys.argv[1] == "verify":
    lib.verify_codes(THEMES, GOALS)
else:
    for cid in THEMES:
        lib.patch_lesson(cid + "-l1", MD[cid + "-l1"])
    finish(lib)
