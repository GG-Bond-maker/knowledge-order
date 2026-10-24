# -*- coding: utf-8 -*-
"""batch35 p2：llm-a3 剩余 15 节章主题包升级（TS 源 llm-a3.ts / llm-a3-extra.ts）。"""
from _batch34_lib import Lib, build_md, finish
import sys

lib = Lib("llm-a3", ["src/content/chapters/llm-a3.ts", "src/content/chapters/llm-a3-extra.ts"])
REF = "本课程整理（可参见 Zhang & Sennrich (2019)《Root Mean Square Layer Normalization》、Shazeer (2020) arXiv:2002.05202、Su et al. (2021) arXiv:2104.09864《RoFormer》与 DeepSeek-V2/V3 技术报告相应章节）"

T = {}
T["c1"] = dict(
expected="手算对照：LayerNorm 输出 [-1.3416,-0.4472,0.4472,1.3416]，RMSNorm 输出 [0.3651,0.7303,1.0954,1.4606]（均值 0.9129 不为 0、均方 1.0000）；RMSNorm 正缩放不变=True、平移敏感=True，LayerNorm 平移不变=True；形状不变=True、每行均方≈1=True，keepdims=False 广播报错；fp16 下 300^2=inf（必须 fp32 归约）；GPT-2 LN 参数 36864 vs LLaMA RMSNorm 266240（LN 则 524288）。",
why=("训练 LLM 时损失曲线上莫名其妙的尖刺、深层网络不做 warmup 就不收敛，很多都能追到归一化层的设计。"
     "GPT-2 的 LayerNorm 在每个位置同时算均值和方差，而 LLaMA 换成了只除均方根的 RMSNorm——"
     "删掉的东西比留下的还多，效果反而更好。本章回答三个问题：归一化在解决什么、RMSNorm 删了什么、为什么敢删。"),
intuition=("LayerNorm 像给每行数据做两次校准：先减去平均身高（居中），再除以身高的波动幅度（缩放）。"
           "RMSNorm 发现第二个动作才是主角——它只除以『平均功率的平方根』（信号学上的 RMS 音量），"
           "不再减均值。就像调音师只统一音量、不强行把所有轨道的中心频率归零；只要后续电路（线性层）"
           "不在乎直流偏移，去掉居中就白赚一半计算。"),
cerr=("eps 写在 sqrt 外面，全常数输入时梯度变 nan；RMSNorm 的 weight 用随机初始化而不是全 1，开局就打乱残差流；"
      "把 LayerNorm 的预训练权重直接加载进 RMSNorm——beta 无处安放且数值分布偏移。"),
miscon=("1. **『RMSNorm 是 LayerNorm 的数学等价改写』**——不是：输出均值不为 0、对整体平移敏感，只是实证差距可忽略；\\n"
        "2. **『省参数是 RMSNorm 的主要收益』**——几十万参数相对 67 亿是噪声，真正省的是约一半元素级运算与访存；\\n"
        "3. **『归一化统计该在 batch 维做』**——那是 BatchNorm 的思路，NLP 的变长与 padding 会污染统计量，必须按最后一维逐 token 独立。"),
connection=("- **向前**：c2 的 SwiGLU 同样遵循 LLaMA『全家无偏置』的思路；\n"
            "- **向后**：c3 RoPE 的尺度守恒与 RMSNorm 的正缩放不变性配合干净；\n"
            "- **平行**：llm-a1 讲训练稳定性时的 LayerNorm 是本章的对照原型。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| LayerNorm | 减均值 + 除标准差 + gamma/beta，2d 参数 |\n"
         "| RMSNorm | 只除均方根 + gamma，d 参数；对正缩放不变、对平移敏感 |\n"
         "| 主要收益 | 元素级运算约 6d→3d（省一半），参数收益可忽略 |\n"
         "| 工程细节 | fp32 归约、weight 全 1 初始化、eps=1e-5（LLaMA）|\n"
         "| Pre-Norm | 残差路径纯恒等，末尾仍需一个 final Norm |"),
)
T["c2"] = dict(
expected="标准 FFN 每层 134,217,728 参数；SwiGLU 若用 4d 则 201,326,592（多 50%）；等参 d_ff_swiglu=10922.7→取 256 倍数 11008（与 LLaMA 一致），参数比 1.0078（0.8% 内守恒）；numpy 前向输出形状 (1,3,64)，三矩阵合计 33024=3*d*d_ff；激活放错支路输出差均值 0.0153（结构已退化）。",
why=("FFN 占 Transformer 约三分之二的参数，激活函数从 ReLU→GELU→门控 GLU 系的每一步都在『同等参数下换质量』。"
     "Shazeer 2020 系统比较后 SwiGLU 胜出、LLaMA 跟进；但它有三个矩阵，d_ff 必须 (2/3)·4d = 8/3·d "
     "才能参数守恒——11008 这种『丑数字』就是这么来的。"),
intuition=("标准 FFN 是一根『硬阈值水管』：进水加压（升维）、ReLU 只留正压、再汇回（降维）。"
           "SwiGLU 是『带调音台的双管』：一支管出信号（up），另一支管出音量旋钮（gate，SiLU 让旋钮平滑连续），"
           "逐元素相乘就是按旋钮调音，最后混回原声道。3 个矩阵比 2 个多 50% 参数，所以中间层从 4d 收窄到 8/3·d"
           "——总量不变，控制权翻倍。"),
cerr=("把 SiLU 同时用在 gate 和 value 两支（正确做法是只激活 gate 支）；d_ff 直接写 4d，每层 FFN 参数多 50%"
      "（32 层约多 21 亿）；照抄 BERT 公式算参数量，没注意 LLaMA 三个矩阵全部无 bias。"),
miscon=("1. **『SwiGLU 一定更快』**——参数守恒但多一次矩阵乘与逐元素乘，kernel 融合做不好反而更慢；\\n"
        "2. **『d_ff=4d 是铁律』**——LLaMA-7B 是 11008≈2.69d，70B 是 28672≈3.5d，都是权衡结果；\\n"
        "3. **『8/3 是调参调出来的』**——它是『三矩阵参数 = 标准两矩阵参数』这一约束的直接推论，不是魔法数字。"),
connection=("- **向前**：c4 的 GQA 同样在做『参数换效率』；\n"
            "- **向后**：c5 组装时『FFN 占总参数 64%』的账要在这里算清；\n"
            "- **平行**：deep-learning 课程激活函数一节的 ReLU/GELU 家族是本章的门控化起点。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| SwiGLU | (SiLU(xW1) ⊙ xW3)W2，gate 支路激活、value 支路不激活 |\n"
         "| 8/3 的由来 | 3·d·d_ff_sw = 2·d·4d ⟹ d_ff_sw = 8/3·d |\n"
         "| 对齐 | 10922.67 向上取整到 256 的倍数 = 11008 |\n"
         "| 参数占比 | FFN≈注意力 2 倍，占总参数约 64% |\n"
         "| 偏置 | LLaMA 全部无 bias，与 RMSNorm 去 beta 一脉相承 |"),
)
T["c3"] = dict(
expected="逐位置模长差 max≈2.2e-16（旋转保模长）；dot(m=5,n=2)=dot(m=9,n=6)=0.3086（相对位置性质成立）；i=0 秒针：PI 后角 5.96 rad 被压缩、NTK 保持 5.01 rad 不变；i=2/3 时针：波长 628.3→1583.3、6283.2→25132.7（低频放慢，远距编码拉伸）。",
why=("GPT-2 用可学习的绝对位置表，训多长用多长，出训练长度就崩。RoPE 把『位置』变成对 q/k 的纯旋转——"
     "零参数、天然相对、还能外推。LLaMA、Qwen、DeepSeek 全家都用它；长上下文（PI/NTK/YaRN）这门生意"
     "也建在它上面。"),
intuition=("把二维向量想成时钟指针：RoPE 给第 m 个 token 的 q/k 各转一个与 m 成正比的角度。注意力打分是指针"
           "夹角（内积），只取决于『指针相差多少格』——即相对位置。d 维向量拆成 d/2 根指针：秒针（高频）转得快、"
           "区分近距离，时针（低频）转得慢、编码远距离。外推时别动秒针，只把时针放慢（NTK 的本质）。"),
cerr=("rotate_half 的配对约定混用（相邻配对与对半配对等价但不可混）；cos/sin 表按训练 base 预计算后，"
      "改 base 外推时忘了重算；只给 q 加 RoPE 忘了 k（q、k 都要加，v 不能加）。"),
miscon=("1. **『RoPE 是绝对位置编码』**——它用绝对位置算角度，但内积只依赖相对位置差；\\n"
        "2. **『位置插值就是位置号除以 s』**——PI 压缩所有频率、近距分辨率受损；NTK 只放慢低频，两者微调步数也不同；\\n"
        "3. **『支持 128K = 128K 质量不掉』**——外推必须配长文本继续训练，纯改参数往往只能撑 2 倍。"),
connection=("- **向前**：c4 的 KV Cache 缓存 RoPE 后的 k，外推方案直接决定缓存与 cos/sin 表策略；\n"
            "- **向后**：c6 MLA 的解耦 RoPE 是本章思想在低秩压缩下的突围；\n"
            "- **平行**：llm-a1 的正弦位置编码是 RoPE 的『加法表亲』，对比着学最快。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 核心 | R(m)q · R(n)k 只依赖 m−n，正交旋转保模长 |\n"
         "| 结构 | d 维拆 d/2 个二维平面，角频率 base^(-2i/d) 几何级数 |\n"
         "| 复数视角 | 乘单位复数 e^{iθ}，旋转变标量乘法 |\n"
         "| PI | 位置号 × L_train/L_target，简单但损近距分辨率 |\n"
         "| NTK | 改 base：高频几乎不动、低频放慢，YaRN 再加温度补偿 |"),
)
T["c4"] = dict(
expected="MHA 4K 单请求 2.00 GiB、8 并发 16.0 GiB（超 13.5 GiB 权重）、128K 单请求 64 GiB；GQA(8) 128K 降为 16 GiB；每 token KV：GPT-2 36 KiB、LLaMA-2 7B 512 KiB、LLaMA-3 8B 128 KiB、Qwen2.5 7B 56 KiB；numpy GQA 前向输出 (1,3,64) 且第 0 行注意力=只看自己（因果掩码生效）。",
why=("部署 7B 模型时真正的显存杀手不是权重（13.5 GiB 固定），而是随 batch×上下文线性膨胀的 KV Cache："
     "MHA 下 8 并发 4K 上下文就要 16 GiB。GQA 让 K/V 只保留 8 组头，显存直降 4 倍而质量几乎不掉——"
     "LLaMA-2 7B 到 LLaMA-3 8B 最值钱的一处改动就是它。"),
intuition=("MHA 是每个 Q 头配一副专属的 K/V 耳机；MQA 是全队共用一副（省到极致但串音）；GQA 是 4 个 Q 头"
           "共用一副（8 副耳机服务 32 个头）。缓存的是『耳机』（K/V），所以显存按组数缩放；注意力计算前的"
           "广播只是逻辑视图，不真的复制内存。"),
cerr=("把 GQA 的显存收益当成训练收益（训练不做 KV Cache）；用 np.repeat 真复制 K/V 导致峰值显存反升，应该用广播视图；"
      "分组数 g 取了不是 h 约数的值，reshape 直接失败。"),
miscon=("1. **『GQA 是无损压缩』**——强压缩比（g=1 的 MQA）有可测的容量损失，g=h/4~h/8 是经验甜点；\\n"
        "2. **『KV Cache 显存等于权重显存』**——权重固定、KV 随 batch×seq 线性涨，长上下文/高并发时 KV 才是第一瓶颈；\\n"
        "3. **『head_dim 也能靠 GQA 缩小』**——GQA 只缩组数，head_dim 通常固定 128。"),
connection=("- **向前**：c5 组装 LLaMA-7B 的参数账里 K/V 投影因此缩水 3/4；\n"
            "- **向后**：c6 MLA 把『少缓存』推向潜向量压缩的极限；\n"
            "- **平行**：《推理与部署工程》的显存估算一节直接使用本章公式。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 显存公式 | 2·L·B·seq·n_kv·d_head·b 字节 |\n"
         "| 7B 实测 | MHA 4K 单请求 2.0 GiB；8 并发 16 GiB 超权重 |\n"
         "| GQA | KV 按组数 g 缩放，g=h/8 几乎不掉点 |\n"
         "| 每 token | LLaMA-2 7B 512 KiB vs LLaMA-3 8B 128 KiB |\n"
         "| 注意 | 收益全在推理；因果掩码与头/组无关 |"),
)
T["c5"] = dict(
expected="每层 = 注意力 67,108,864 + FFN 135,266,304 + 2*Norm 8,192 = 202,383,360；总参数 = 嵌入 1.31 亿 + 32 层 64.76 亿 + final norm + lm_head 1.31 亿 = 6,738,415,616（≈6.74B）；占比 FFN 64.2%、注意力 31.9%、嵌入+head 3.9%；换 GQA(8) 每层注意力降至 41,943,040（省 37.5%）。",
why=("四个零件各自都懂了，拼起来那一刻才见工程功力：LLaMA 与 GPT-2 的骨架（Pre-Norm+双残差）一模一样，"
     "改进全在效率零件上。本节把 7B 的每一项参数算到个位数——32 层 × (注意力 67.1M + FFN 135.3M + Norm 8K)"
     " + 词嵌入 1.31 亿，合计约 67 亿。算清这张表，你就能对任何新模型快速做参数体检。"),
intuition=("把 LLaMA 想成一台用 GPT-2 图纸但全面升级零件的机器：机身结构不动（Pre-Norm 残差流），换上更省油的"
           "引擎（RMSNorm）、带调音台的进气管（SwiGLU）、自导航的陀螺仪（RoPE）和共享耳机架（GQA）。"
           "总参数 67 亿里 FFN 占约 64%——『参数大头在 FFN 不在注意力』这句常识，拼完才算真的信。"),
cerr=("忘了最终 Norm（LLaMA 的 norm / GPT-2 的 ln_f），输出尺度失控；给 LLaMA 的 Linear 加 bias 参数，"
      "参数量与权重加载全错；把位置嵌入参数（wpe）算进 LLaMA——它没有位置嵌入，位置信息全靠 RoPE。"),
miscon=("1. **『LLaMA 是架构革命』**——骨架与 GPT-2 相同，是零件级效率改进的累积；\\n"
        "2. **『词嵌入参数可忽略』**——7B 里 vocab×d≈1.3 亿只占 2%，但 0.5B 小模型里嵌入能占一半以上；\\n"
        "3. **『lm_head 独立于嵌入』**——通常与输入嵌入共享权重（tie word embeddings）。"),
connection=("- **向前**：c6 的 MLA 是注意力零件的下一代替代方案；\n"
            "- **向后**：《大模型训练原理》的数据与配方决定这些参数怎么被『填』；\n"
            "- **平行**：llm-a2 的 KV Cache 优化工程算的是同一本显存账。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 骨架 | Pre-Norm + 注意力/FFN 双残差，与 GPT-2 相同 |\n"
         "| 零件 | RMSNorm / SwiGLU(8/3d) / RoPE / GQA，全部无 bias |\n"
         "| 7B 账本 | 每层≈2.03 亿 ×32 层 + 嵌入 1.31 亿 ≈ 67 亿 |\n"
         "| 占比 | FFN≈64%、注意力≈32%、嵌入≈2% |\n"
         "| 洞察 | 2019→2023 改进全在效率，读懂一个即读懂所有 |"),
)
T["c6"] = dict(
expected="128K/60 层显存：MHA 240 GiB、GQA(8) 30 GiB、MLA 8.4 GiB（比 GQA 再省 3.6x）；Q 侧吸收打分等价=True、V-O 侧吸收输出等价=True（矩阵结合律精确成立）；每 token 每层缓存元素 MHA 16384 → MLA 576（缩 28.4x）。",
why=("GQA 把 KV 缩到 1/g，但 128K 上下文 × 高并发的时代，30 GiB 依然放不下几个请求。DeepSeek 的 MLA 换了一条路："
     "不在『头数』上妥协，而是把 K/V 压进 512 维潜向量，推理时用矩阵吸收直接在潜空间打分——显存比 GQA 再小 3~4 倍，"
     "训练期却保住 128 个独立头的表达力。"),
intuition=("GQA 是『多个人共用一副耳机』；MLA 是『把所有耳机的内容压进一支 U 盘（512 维潜向量），谁要听再插耳机"
           "放出来』。妙处在于放音（上投影）可以和收音（输出投影）预先『焊接』成一个矩阵（吸收），U 盘永远不必解开。"
           "位置信息怕被压缩扰乱，就单独走一条 64 维『秒针专线』（解耦 RoPE），与语义 U 盘并联。"),
cerr=("忘记解耦 RoPE，直接对潜向量做旋转，位置信息被上投影扰乱；推理时老老实实还原多头 K/V，"
      "把压缩省下的带宽全吐回去；把解耦位置 Key k^R 也做低秩压缩（它必须独立生成、全头共享）。"),
miscon=("1. **『MLA 就是更强的 MQA』**——MQA 砍头数损容量；MLA 砍维度，上投影后仍有 128 个独立头子空间；\\n"
        "2. **『矩阵吸收是近似』**——矩阵结合律是精确等式，数值上 allclose 到浮点误差；\\n"
        "3. **『缓存 512 维就够了』**——还必须缓存 64 维位置 Key，它无法被吸收。"),
connection=("- **向前**：注意力零件演化路线 MHA→MQA→GQA→MLA 到本章闭环；\n"
            "- **向后**：《推理与部署工程》里 MLA 的显存账直接决定单卡并发数；\n"
            "- **平行**：c4 的 KV Cache 公式是本章显存对比的基准线。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 压缩 | 只缓存 c_KV(512)+k^R(64)，MHA 128K 240GiB→MLA 约 8.4GiB |\n"
         "| 解耦 RoPE | 语义走低秩压缩、位置走 64 维专线，内积天然分两项 |\n"
         "| 吸收 | W_UK 吸进 Q、W_UV·W_O 焊成 W'，历史 K/V 永不还原 |\n"
         "| 不可能三角 | 显存轻量 + 算力高效 + 容量无损三者兼得 |\n"
         "| 代价 | 实现复杂、RoPE 兼容需专门设计 |"),
)

GOALS = {
"llm-a3-c1-l1": ("1. 写出 LayerNorm 在最后一维的完整公式（mu/sigma/gamma/beta）并说明统计轴为何是特征维；\n"
                 "2. 解释 BatchNorm 在 NLP 上失效的两个原因（batch 依赖、padding 污染）；\n"
                 "3. 区分 Pre-Norm 与 Post-Norm 的梯度路径差异，说明为什么需要 final Norm。"),
"llm-a3-c1-l2": ("1. 写出 RMSNorm 公式 y = gamma·x/sqrt(mean(x²)+eps)，并手算 x=[1,2,3,4] 的输出；\n"
                 "2. 对比 LayerNorm/RMSNorm 在减均值、分母、参数量、平移敏感性上的差异；\n"
                 "3. 说明『常数偏移可被下一层偏置吸收』为何让 beta 变得冗余。"),
"llm-a3-c1-l3": ("1. 解释『经验性发现』的含义：重中心化的收益是实验观察而非数学等价；\n"
                 "2. 用共同模式（common mode）敏感性说明 RMSNorm 适用与不适用的场景；\n"
                 "3. 算清归一化层元素级运算约省一半、参数省 2d/处，但相对 67 亿总参数是噪声。"),
"llm-a3-c1-l4": ("1. 按 (2,3,4096)→(2,3,1) 的 keepdims 广播流程标注 RMSNorm 每步形状；\n"
                 "2. 用 numpy 实现并验证三条性质：形状不变、正缩放不变、输出均方为 1；\n"
                 "3. 解释『低精度存储 + 高精度归约』为什么是归约型算子的通用纪律。"),
"llm-a3-c2-l3": ("1. 写出 SwiGLU 公式 (SiLU(xW1)⊙xW3)W2 并指出 gate/value 支路的激活位置；\n"
                 "2. 三步推导 d_ff_swiglu = 8/3·d：参数守恒约束 3·d·d_ff_sw = 2·d·4d；\n"
                 "3. 验证 LLaMA 的 11008：10922.67 取 256 倍数 + 参数比标准 FFN 差 0.8% 以内。"),
"llm-a3-c2-l4": ("1. 逐组件估算 LLaMA-7B 单层 FFN 参数 3·4096·11008 = 1.35 亿；\n"
                 "2. 避开五个误区（4d 铁律、必然更快、激活位置、bias、与 head_dim 混淆）；\n"
                 "3. 用霍纳法则心算 4096×11008≈4.5e7 并复核 FFN 占总参数 64%。"),
"llm-a3-c3-l2": ("1. 从二维旋转矩阵出发写出 RoPE 的复数形式，证明正交（保模长）与可加（R(a)R(b)=R(a+b)）；\n"
                 "2. 说明 d 维拆 d/2 个二维平面、角频率 base^(-2i/d) 的几何级数分布；\n"
                 "3. 证明 (R_m q)·(R_n k) 只依赖 m−n，即注意力打分的相对位置性质。"),
"llm-a3-c3-l4": ("1. 对比直接外推/PI/NTK/YaRN 四条路线的处理位置方式与代价；\n"
                 "2. 解释 PI 的分辨率损失与 NTK『高频不动、低频放慢』的直觉；\n"
                 "3. 记住实践要点：外推需少量继续训练、要用长文本任务评测而非只看困惑度。"),
"llm-a3-c4-l1": ("1. 写出 KV Cache 显存公式 2·L·B·seq·n_kv·d_head·b 并算出 7B MHA 4K 单请求 2.0 GiB；\n"
                 "2. 说明权重（固定）与 KV Cache（随 B×seq 线性涨）谁是瓶颈的判据；\n"
                 "3. 用 batch 与显存的矛盾解释 GQA 的动机：每 token KV 显存降到 1/g。"),
"llm-a3-c4-l3": ("1. 查表对比 GPT-2/LLaMA-2/LLaMA-3/Qwen2.5 的 L·2·g·d_head 每 token KV 元素；\n"
                 "2. 按 g=h/4~h/8 的经验起点为给定模型选分组数，并说明收益递减与 h 约数约束；\n"
                 "3. 指出 LLaMA-2 7B→LLaMA-3 8B 的核心结构差异就是 MHA→GQA(8)。"),
"llm-a3-c4-l4": ("1. 标注 GQA 从 (1,3,4096) 到输出的全部形状（Q 32 头、K/V 8 组、广播不复制）；\n"
                 "2. 算清参数量：Wk/Wv 各缩为 1/4，注意力参数降 37.5%；\n"
                 "3. 用 numpy 实现 GQA 前向，验证因果掩码与头/组无关。"),
"llm-a3-c5-l1": ("1. 画出 LLaMA Block 的 Pre-Norm 双残差结构并写出伪代码；\n"
                 "2. 填出 GPT-2 vs LLaMA 的九项对比表（Norm/位置/FFN/偏置/词表/上下文）；\n"
                 "3. 逐组件算清 7B 参数：每层注意力+FFN+Norm、词嵌入、lm_head 共享。"),
"llm-a3-c6-l1": ("1. 算出 60 层/128K/d=8192 的 MHA KV Cache≈240 GiB、GQA(8)≈30 GiB；\n"
                 "2. 写出 MLA 的 c_KV = W_DKV·h_t 低秩压缩与 W_UK/W_UV 上投影；\n"
                 "3. 解释『在维度上压缩而非在头数上妥协』为何保住多头容量。"),
"llm-a3-c6-l2": ("1. 说明 R·W ≠ W·R 导致 RoPE 与低秩投影的死结；\n"
                 "2. 写出解耦组装：内容 Key（可压缩）+ 位置 Key k^R（独立 64 维、全头共享）；\n"
                 "3. 展开内积分解：q^T·k = 语义项 + 位置项两项天然正交。"),
"llm-a3-c6-l3": ("1. 用结合律推导 Q 侧吸收 q' = W_UK^T·q（与历史长度无关、只算一次）；\n"
                 "2. 推导 V-O 侧吸收 W' = W_UV·W_O，历史潜向量永不还原；\n"
                 "3. 总结 MLA 兼得显存、算力、容量的『不可能三角』及其实现代价。"),
}
PREREQ = {
"llm-a3-c1-l1": "- llm-a1 的 Transformer Block 结构与残差连接；\n- numpy 的 mean(axis, keepdims) 用法。",
"llm-a3-c1-l2": "- 「LayerNorm 回顾」（l1）的公式与统计轴；\n- 均方根（RMS）的定义。",
"llm-a3-c1-l3": "- 「RMSNorm 公式」（l2）的手算结果；\n- 对『参数量影响可忽略』的数量级直觉。",
"llm-a3-c1-l4": "- 「RMSNorm 公式」（l2）；\n- numpy 广播规则与 keepdims 语义。",
"llm-a3-c2-l3": "- llm-a1 的 FFN 与 GELU；\n- SiLU(z)=z·sigmoid(z) 的曲线形状。",
"llm-a3-c2-l4": "- 「SwiGLU 公式与 8/3 倍 d_ff 的由来」（l3）的守恒推导。",
"llm-a3-c3-l2": "- llm-a1 的正弦位置编码；\n- 线性代数：正交矩阵与复数乘法。",
"llm-a3-c3-l4": "- 「复数视角」（l2）的角频率 base^(-2i/d)；\n- KV Cache 的位置概念。",
"llm-a3-c4-l1": "- llm-a1 的 MHA 前向与自回归解码循环；\n- GiB/字节换算。",
"llm-a3-c4-l3": "- 「KV Cache 显存公式与瓶颈分析」（l1）。",
"llm-a3-c4-l4": "- 「KV Cache 显存公式」（l1）与「分组数怎么选」（l3）；\n- numpy reshape/transpose/repeat。",
"llm-a3-c5-l1": "- c1 RMSNorm、c2 SwiGLU、c3 RoPE、c4 GQA 全部内容。",
"llm-a3-c6-l1": "- c4 的 KV Cache 显存公式与 GQA；\n- 低秩（low-rank）分解的直觉。",
"llm-a3-c6-l2": "- 「KV Cache 显存瓶颈与 MLA 低秩潜在压缩」（c6-l1）；\n- c3 的 RoPE 旋转矩阵。",
"llm-a3-c6-l3": "- 「解耦位置编码」（c6-l2）的内容/位置拆分；\n- 矩阵乘法结合律。",
}
CODES = {}
CODES["c1"] = '''import numpy as np
np.set_printoptions(precision=4, suppress=True)

def layer_norm(x, gamma=1.0, beta=0.0, eps=1e-6):
    mu = x.mean(-1, keepdims=True)
    var = ((x - mu) ** 2).mean(-1, keepdims=True)
    return gamma * (x - mu) / np.sqrt(var + eps) + beta

def rms_norm(x, gamma=1.0, eps=1e-6):
    rms = np.sqrt((x ** 2).mean(-1, keepdims=True) + eps)
    return gamma * x / rms

# ---- 1. 手算对照：x=[1,2,3,4] ----
x = np.array([1., 2., 3., 4.])
print("LayerNorm:", layer_norm(x))
print("RMSNorm :", rms_norm(x))
print("RMSNorm 输出均值 %.4f（不为0），输出均方 %.4f（≈1）" % (rms_norm(x).mean(), (rms_norm(x)**2).mean()))

# ---- 2. 不变性对比 ----
print("正缩放不变(RMSNorm):", np.allclose(rms_norm(10*x), rms_norm(x)))
print("整体平移 LayerNorm 不变:", np.allclose(layer_norm(x+10), layer_norm(x)))
print("整体平移 RMSNorm 变了:", not np.allclose(rms_norm(x+10), rms_norm(x)))

# ---- 3. 张量形状与 keepdims ----
X = np.random.default_rng(0).normal(size=(2, 3, 4096))
y = rms_norm(X)
print("形状不变:", X.shape == y.shape, "| 每行均方≈1:", bool(np.allclose((y**2).mean(-1), 1, atol=1e-4)))
try:
    X / np.sqrt((X**2).mean(-1))
except ValueError as e:
    print("keepdims=False 广播失败:", e)

# ---- 4. 低精度平方溢出：必须 fp32 归约 ----
v16 = np.float16(300.0)
print("fp16 下 300^2 =", v16 * v16, "-> LLaMA 在 RMSNorm 内部转 fp32 再归约")

# ---- 5. 参数量对比 ----
print("GPT-2 LN 参数:", 12*2*2*768)
print("LLaMA-2 7B RMSNorm 参数:", (32*2+1)*4096, "（若用 LN:", 32*2*2*4096, "）")'''
CODES["c2"] = '''import numpy as np
d, d_ff = 4096, 11008

# ---- 1. 8/3 推导与验证 ----
print("标准 FFN 参数/层:", 2*d*(4*d))
print("SwiGLU 若也用 4d:", 3*d*(4*d), "（多 50%）")
d_ff_s = (2/3)*(4*d)
print("等参 d_ff_swiglu = %.1f -> 取 256 倍数 = %d（LLaMA 实际 11008）" % (d_ff_s, int(np.ceil(d_ff_s/256))*256))
print("参数比 SwiGLU(11008)/标准FFN:", 3*d*11008/(2*d*16384))

# ---- 2. SwiGLU 前向（numpy，缩小维度）----
def silu(z): return z / (1 + np.exp(-z))
rng = np.random.default_rng(0)
dd, df = 64, 172                       # 缩放版 d / d_ff
x = rng.normal(0, 1, (1, 3, dd))
W1 = rng.normal(0, 0.05, (dd, df)); W3 = rng.normal(0, 0.05, (dd, df)); W2 = rng.normal(0, 0.05, (df, dd))
h = silu(x @ W1) * (x @ W3)            # gate 支路激活，value 支路不激活
out = h @ W2
print("输出形状:", out.shape, "| 三矩阵参数合计:", W1.size + W3.size + W2.size, "= 3*d*d_ff")
wrong = ((x @ W1) * silu(x @ W3)) @ W2 # 激活放错支路
print("激活放错支路的输出差均值: %.4f（不为0，结构已退化）" % float(np.abs(out - wrong).mean()))'''
CODES["c3"] = '''import numpy as np
np.set_printoptions(precision=4, suppress=True)

def rope_cos_sin(n, half, base=10000.0):
    theta = base ** (-np.arange(half) / half)     # d=2*half -> base^(-2i/d)
    ang = np.outer(np.arange(n), theta)
    return np.cos(ang), np.sin(ang)

def apply_rope(X, base=10000.0):                  # X: [n, d]，对半配对
    n, d = X.shape; half = d // 2
    cos, sin = rope_cos_sin(n, half, base)
    cos = np.concatenate([cos, cos], -1); sin = np.concatenate([sin, sin], -1)
    x1, x2 = X[:, :half], X[:, half:]
    return np.concatenate([x1*cos[: ,:half] - x2*sin[:, :half],
                           x1*sin[:, half:] + x2*cos[:, half:]], -1)

# ---- 1. 旋转保模长 ----
X = np.random.default_rng(1).normal(size=(4, 8))
XR = apply_rope(X)
print("逐位置模长差 max:", float(np.abs(np.linalg.norm(XR, axis=1) - np.linalg.norm(X, axis=1)).max()))

# ---- 2. 相对位置性质：dot 只依赖 m-n ----
rng = np.random.default_rng(2)
q, k = rng.normal(size=8), rng.normal(size=8)
def dot(m, n):
    return float(apply_rope(q[None, :].repeat(max(m, n)+1, 0))[m] @ apply_rope(k[None, :].repeat(max(m, n)+1, 0))[n])
d1, d2 = dot(5, 2), dot(9, 6)
print("dot(m=5,n=2)=%.4f  dot(m=9,n=6)=%.4f  相等: %s" % (d1, d2, abs(d1-d2) < 1e-5))

# ---- 3. PI vs NTK：位置 8192 的角频率变化 ----
s, d, base, m = 4, 8, 10000.0, 8192
base2 = base * s**(d/(d-2))
print("i=0（秒针）PI 后角 %.2f rad, NTK 后角 %.2f rad（不变）" % ((m/s) % (2*np.pi), (m*1.0) % (2*np.pi)))
for i in (2, 3):
    t = base ** (-2*i/d); t2 = base2 ** (-2*i/d)
    print(f"  i={i}: 波长 {2*np.pi/t:.1f} -> {2*np.pi/t2:.1f}（时针放慢，远距编码拉伸）")'''
CODES["c4"] = '''import numpy as np
GiB = 1024**3
def kv_gb(L, B, seq, kv_heads, d_head, b=2):
    return 2*L*B*seq*kv_heads*d_head*b / GiB

# ---- 1. LLaMA-2 7B 的 KV Cache 显存 ----
print("MHA 4K 单请求: %.2f GiB" % kv_gb(32, 1, 4096, 32, 128))
print("MHA 4K 8 并发: %.1f GiB（fp16 权重才 13.5 GiB）" % kv_gb(32, 8, 4096, 32, 128))
print("MHA 128K 单请求: %.0f GiB" % kv_gb(32, 1, 131072, 32, 128))
print("GQA(8) 128K 单请求: %.0f GiB（降为 1/4）" % kv_gb(32, 1, 131072, 8, 128))

# ---- 2. 每 token KV 元素对照表 ----
for name, L, g, dh in [("GPT-2 small", 12, 12, 64), ("LLaMA-2 7B", 32, 32, 128),
                       ("LLaMA-3 8B", 32, 8, 128), ("Qwen2.5 7B", 28, 4, 128)]:
    e = L*2*g*dh
    print(f"{name}: {e} 元素/token = {e*2/1024:.0f} KiB/token")

# ---- 3. numpy GQA 前向（小尺寸）+ 因果掩码 ----
B, n, d, h, g, dh = 1, 3, 64, 8, 2, 8
rng = np.random.default_rng(0)
x = rng.normal(size=(B, n, d))
Wq, Wk, Wv, Wo = (rng.normal(0, 0.1, (d, h*dh)) for _ in range(3)), None, None, None
Wq = rng.normal(0, 0.1, (d, h*dh)); Wk = rng.normal(0, 0.1, (d, g*dh)); Wv = rng.normal(0, 0.1, (d, g*dh)); Wo = rng.normal(0, 0.1, (h*dh, d))
Q = x @ Wq; K = x @ Wk; V = x @ Wv
Q = Q.reshape(B, n, h, dh).transpose(0, 2, 1, 3)
K = np.repeat(K.reshape(B, n, g, dh).transpose(0, 2, 1, 3), h//g, axis=1)
V = np.repeat(V.reshape(B, n, g, dh).transpose(0, 2, 1, 3), h//g, axis=1)
s = Q @ K.transpose(0, 1, 3, 2) / np.sqrt(dh)
s = np.where(np.triu(np.ones((n, n), bool), 1), -1e9, s)
p = np.exp(s - s.max(-1, keepdims=True)); p /= p.sum(-1, keepdims=True)
o = (p @ V).transpose(0, 2, 1, 3).reshape(B, n, d) @ Wo
print("GQA 输出形状:", o.shape, "| 第0行注意力=只看自己:", bool(np.allclose(p[0, :, 0, 0], 1.0)))'''
CODES["c5"] = '''d, L, h, kv, d_ff, vocab, dh = 4096, 32, 32, 32, 11008, 32000, 128

# ---- LLaMA-7B 逐项参数账 ----
attn = d*d + d*kv*dh + d*kv*dh + d*d          # Wq Wk Wv Wo（MHA: kv=h）
ffn = 3*d*d_ff                                # gate/up/down 无 bias
norm = d                                       # 每个 RMSNorm 只有 gamma
per_layer = attn + ffn + 2*norm
total = vocab*d + L*per_layer + d + vocab*d    # 嵌入 + 层 + final norm + lm_head
print(f"每层: 注意力 {attn:,} + FFN {ffn:,} + 2*Norm {2*norm:,} = {per_layer:,}")
print(f"总参数: 嵌入 {vocab*d:,} + {L} 层 {L*per_layer:,} + final norm {d:,} + lm_head {vocab*d:,} = {total:,} (≈{total/1e9:.2f}B)")
print(f"占比: FFN {L*ffn/total:.1%} | 注意力 {L*attn/total:.1%} | 嵌入+head {2*vocab*d/total:.1%}")
gqa_attn = d*d + 2*d*8*dh + d*d                # 若换 GQA(8)
print(f"换 GQA(8) 后每层注意力: {gqa_attn:,}（省 {(attn-gqa_attn)/attn:.1%}）")'''
CODES["c6"] = '''import numpy as np

# ---- 1. 显存对比：MHA / GQA(8) / MLA（60 层、128K、d=8192）----
L, seq, d, byte = 60, 131072, 8192, 2
mha = 2*L*seq*d*byte
gqa = 2*L*seq*8*128*byte
mla = L*seq*(512+64)*byte
print(f"MHA: {mha/2**30:.0f} GiB | GQA(8): {gqa/2**30:.0f} GiB | MLA: {mla/2**30:.1f} GiB（比 GQA 再省 {gqa/mla:.1f}x）")

# ---- 2. 矩阵吸收的数值验证（精确等式，非近似）----
rng = np.random.default_rng(0)
d0, dc, dh = 16, 4, 8
h_t = rng.normal(size=d0)
W_DKV = rng.normal(size=(dc, d0))     # 下投影：d -> dc
W_UK  = rng.normal(size=(dh, dc))     # 上投影：dc -> dh（单头）
q     = rng.normal(size=dh)
score_direct = q @ (W_UK @ (W_DKV @ h_t))      # 先还原 K 再打分
score_absorb = (W_UK.T @ q) @ (W_DKV @ h_t)    # 吸收：直接点乘潜向量
print("Q 侧吸收打分等价:", np.allclose(score_direct, score_absorb))

W_UV = rng.normal(size=(dh, dc)); W_O = rng.normal(size=(d0, dh)); a = 0.3
c = W_DKV @ h_t
out_direct = a * W_O @ (W_UV @ c)              # 先还原 V 再加权投影
out_absorb = a * (W_O @ W_UV) @ c              # W_UV·W_O 焊成一个矩阵
print("V-O 侧吸收输出等价:", np.allclose(out_direct, out_absorb))
print("每 token 每层缓存元素: MHA %d -> MLA %d（缩 %.1fx）" % (2*d, 512+64, 2*d/576))'''

WHY = {k: T[k]["why"] for k in T}; INTU = {k: T[k]["intuition"] for k in T}
for _k in T: T[_k].setdefault("expected", "")

MD = {}
for lid, g in GOALS.items():
    cid = "c" + lid.split("-c")[1].split("-")[0]
    MD[lid] = build_md(lib.orig_content(lid), g, PREREQ[lid], WHY[cid], INTU[cid],
                       CODES[cid], T[cid]["expected"], T[cid]["cerr"], T[cid]["miscon"],
                       T[cid]["connection"], T[cid]["summary"], REF)

if len(sys.argv) > 1 and sys.argv[1] == "verify":
    for cid in ("c1", "c2", "c3", "c4", "c5", "c6"):
        print("=" * 20, cid)
        exec(compile(CODES[cid], cid, "exec"), dict(globals()))
    print("VERIFY-ONLY")
elif not all(T[c]["expected"] for c in T):
    print("expected 未填，先 verify")
else:
    for lid in GOALS:
        lib.patch_lesson(lid, MD[lid])
    finish(lib)
