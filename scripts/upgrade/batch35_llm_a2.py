# -*- coding: utf-8 -*-
"""batch35 p5：llm-a2 剩余 9 节章主题包升级（TS 源 llm-a2.ts / extra/extra3/extra4）。"""
from _batch34_lib import Lib, build_md, finish
import sys

lib = Lib("llm-a2", ["src/content/chapters/llm-a2.ts", "src/content/chapters/llm-a2-extra.ts",
                     "src/content/chapters/llm-a2-extra3.ts", "src/content/chapters/llm-a2-extra4.ts"])
REF = "本课程整理（可参见 Vaswani et al. (2017)、Hoffmann et al. (2022) arXiv:2203.15556《Chinchilla》、Rajbhandari et al. (2020) ZeRO 论文与 PyTorch FSDP 文档相应章节）"

T = {}
T["c1"] = dict(
expected="温度：T=0.5 时分布 [0.74,0.20,0.05,...] 熵 1.05；T=1.0 熵 1.66；T=2.0 变平熵 1.75；Top-K=2 保留前两名重归一 [0.79,0.21,0,...]；Top-P=0.9 自适应保留前 3 个；贪心解码输出『the cat sat on the cat sat on the...』陷入循环，随机采样则路径多样。",
why=("预训练目标（下一个 token 预测）与交叉熵损失决定模型学到什么；采样策略决定同样的模型给出什么样的输出——"
     "温度、Top-K、Top-P 是每次调用 API 都在拧的旋钮，拧错轻则呆板重复，重则胡言乱语。"),
intuition=("模型每步输出一张『下一个字的概率表』。温度是搅拌力度：T 低=只信最高分（保守），T 高=大家都有机会（发散）；"
           "Top-K 是『只从前 K 名里抽签』，Top-P 是『从累计概率够 90% 的头部集合里抽签』——后者人数随模型把握自动伸缩。"
           "贪心解码像永远只点销量第一的菜：安全，但容易绕回原地打转。"),
cerr=("手写 softmax 没减 max(logits)，大 logit 下 exp 溢出为 inf；Top-P 按原始顺序累加概率而不是排序后累加，"
      "截断集合错乱；创意任务用 T=0 千篇一律，事实任务用 T=1.2 幻觉率飙升。"),
miscon=("1. **『温度改变模型』**——温度只重塑输出分布，参数纹丝不动；\\n"
        "2. **『Top-K 和 Top-P 二选一』**——工业界常同时用（K 截尾 + P 自适应），还叠加重复惩罚；\\n"
        "3. **『beam search 万事皆优』**——开放生成任务常产出平淡甚至退化的高频文本，主流对话模型都用采样。"),
connection=("- **向前**：c5 的学习率调度建立在交叉熵损失可导的基础上；\n"
            "- **向后**：KV Cache 把采样循环的算力账重写一遍；\n"
            "- **平行**：llm-a1 手写的 softmax 是本章温度版的特例（T=1）。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 温度 | logits/T 再 softmax：T<1 变尖、T>1 变平 |\n"
         "| Top-K | 固定 K 个候选，尖/平分布下都不自适应 |\n"
         "| Top-P | 累计概率 ≥P 的最小头部集合，自适应主流 |\n"
         "| 贪心 | 确定但易重复循环，适合事实性短答 |\n"
         "| 实践 | 事实任务 T=0~0.3；创意写作 T=0.7~1.0 |"),
)
T["c5"] = dict(
expected="调度取值：step=2500 时 cosine 2.82e-4 / linear 2.55e-4 / invsqrt 1.90e-4；step=10000 时 cosine 与 linear 均到 min_lr=3e-5，invsqrt 仍 9.49e-5；Adam 风险：前 5 步 v≈3.5e-6 时一个大梯度到来，步长 lr/√v=0.16（参数一步被推出 0.1 量级）→ 必须 warmup；Transformer 调度峰值出现在 step=4000（lr≈7e-4）。",
why=("学习率是训练里最敏感的单个超参：太大一步跳飞、太小原地踏步。warmup 与衰减不是玄学，而是对『初期 Adam "
     "二阶矩不稳、后期需精调』两个物理事实的工程回应——LLaMA/GPT 的训练配方里它排在最前面。"),
intuition=("训练像开车下山路：warmup 是起步缓踩油门（发动机还没热，Adam 的『后视镜』v 里几乎没有历史信息，一脚油门"
           "容易冲出弯道）；余弦衰减是快到山脚逐渐刹车，最后 min_lr 滑行；逆平方根则是长途巡航，越接近终点越松油门。"),
cerr=("warmup 期间用衰减公式反向算出负学习率；cosine 衰减没设 min_lr，最后几千步学习率趋 0 白白烧卡；"
      "warmup 步数占比过大（>10%），有效训练步数缩水。"),
miscon=("1. **『学习率恒定最简单最好』**——恒定 lr 在接近最优点时震荡，损失降不下去；\\n"
        "2. **『warmup 只是小技巧』**——它直接源于 Adam 分母 √v 在初期的不稳定估计，不 warmup 大模型常在前几千步直接 NaN；\\n"
        "3. **『衰减曲线形状决定性最强』**——峰值 lr 与 batch size 的匹配比形状更重要，形状间差距通常很小。"),
connection=("- **向前**：c6 的分布式训练把 batch 放大数千倍，warmup 因此从 1k 步变成数万步；\n"
            "- **向后**：c7 混合精度里 loss scale 与 lr 同为数值稳定的两个旋钮；\n"
            "- **平行**：llm-a1 训练循环的恒定学习率是本章的对照基线。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| warmup | 前 1%~5% 线性升到峰值，保 Adam v 稳定 |\n"
         "| 余弦 | 预训练首选：缓降-快降-趋平，配 min_lr≈10% 峰值 |\n"
         "| 线性/阶梯 | T5 用线性；传统 CNN 用阶梯 |\n"
         "| 逆平方根 | 原版 Transformer：快速衰减适合长训 |\n"
         "| 公式 | lr = d^-0.5 · min(step^-0.5, step·warmup^-1.5) |"),
)
T["c6"] = dict(
expected="7B 显存账：权重 14 + 梯度 14 + Adam 56 = 84 GB；ZeRO-1 35.0 / ZeRO-2 22.8 / ZeRO-3 10.5 GB；列切与行切均数值等价（allclose=True）；气泡比例：P=4,m=1 → 3.0（利用率 25%）、P=4,m=8 → 0.38、P=8,m=16 → 0.44。",
why=("7B 全参训练起步 100+ GB、175B 起步数 TB——单卡物理放不下，分布式不是提速手段而是必需品。DP/TP/PP/SP "
     "四种并行切的东西不同、通信代价不同，ZeRO/FSDP 则把数据并行里最冗余的显存也切开。"),
intuition=("训练巨型模型像盖一张巨大拼图：DP 是复印整张图给每人一块拼图（各自拼不同区域再对答案）；TP 是把一层图案"
           "按列裁开给一组人（每步都要对缝，必须在同一房间 NVLink）；PP 是把上下半张图分给流水线工人（传接少但要"
           "微批流水防空转）；ZeRO 则发现大家复印的整张图和橡皮擦完全一样，索性每人只留 1/N，用时再借。"),
cerr=("把 TP 放到跨机（以太网撑不住每层 all-reduce），训练慢 10 倍；PP 微批数 m 没调大，气泡比例 (P-1)/m 高达 75%，"
      "八卡只用上两卡；ZeRO-3 用了却没按 block 预取，all-gather 串行等待抵消显存收益。"),
miscon=("1. **『数据并行省显存』**——DP 每卡放完整模型，只提速不省显存；省显存靠 ZeRO/FSDP；\\n"
        "2. **『并行度越高越快』**——TP 通信量最大，通信超过计算收益后线性度崩塌，3D 并行是平衡艺术；\\n"
        "3. **『梯度检查点免费』**——用约 30% 额外计算换显存，与 ZeRO 组合才划算。"),
connection=("- **向前**：c7 混合精度进一步把每卡显存除以 2；\n"
            "- **向后**：llm-a4 的 MoE 在并行之上再加专家维度；\n"
            "- **平行**：llm-a3 的 GQA/MLA 从模型结构侧砍显存，本章从系统侧砍，两面夹击。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 显存账 | 7B fp16：权重14 + 梯度14 + Adam56 ≈ 84 GiB |\n"
         "| 四并行 | DP 切 batch / TP 切矩阵 / PP 切层 / SP 切序列 |\n"
         "| 3D 组合 | TP≤8 占满单机 NVLink，PP 跨机，DP 填余 |\n"
         "| 气泡 | 朴素 PP 利用率 1/P → 1F1B 微批，气泡 ≈ (P-1)/m |\n"
         "| ZeRO | 1 切优化器 / 2 切梯度 / 3 切权重；FSDP=官方 ZeRO-3 |"),
)
T["c7"] = dict(
expected="fp16 上限 65504：1e5 与 65520 均 inf、1e-8 下溢为 0；bf16 全部保留量程（65520→65536、1e5→99840、1e-8→1.00117e-08）；顺序累加 0.01×10000：fp32=100.00，fp16 在 32 附近饱和（ulp>0.01 加不上去）——梯度累加必须 fp32。",
why=("fp32 训练 7B 光权重就 28GB，bf16 直接减半且张量核算力翻倍——混合精度是现代 LLM 训练的默认开关。"
     "但 fp16 的 65504 上限与 1e-8 下限随时引爆 NaN：理解位分配与 loss scaling，是排查训练崩溃的第一技能。"),
intuition=("浮点数像科学计数法：fp32 给 8 位指数（量程）和 23 位尾数（刻度）；fp16 把两者都砍——量程只剩 ±65504；"
           "bf16 聪明在保住 8 位指数只砍尾数——『量程不变、刻度变粗』。训练里致命的是溢出（激活 1e5 直接 inf）"
           "而不是 2 位精度，所以 bf16 胜出。混合配方一句话：算用低精度（快），存和加用高精度（准）。"),
cerr=("fp16 训练没加 loss scaling，小梯度 1e-8 全部下溢为 0，模型『看起来在训但不动』；把 master weights 也存成 fp16，"
      "万次更新误差累积吞掉学习效果；softmax/LayerNorm 也跑 bf16，数值敏感操作放大误差。"),
miscon=("1. **『bf16 精度低所以不如 fp16』**——训练瓶颈是溢出不是精度，bf16 量程与 fp32 相同，实践更稳；\\n"
        "2. **『混合精度=全部半精度』**——master weights/优化器状态/归约仍 fp32，纯 fp16 训练几乎必炸；\\n"
        "3. **『loss scaling 适用于 bf16』**——bf16 量程大基本不需要 scaling，它是 fp16 专属补丁。"),
connection=("- **向前**：c8 数据质量决定模型上限，精度只决定下限；\n"
            "- **向后**：c6 的 all-reduce 要求 fp32 归约与本章精度纪律一致；\n"
            "- **平行**：llm-a3 的 RMSNorm fp32 归约是『低精度存储+高精度归约』的单层缩影。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 位分配 | fp32 1+8+23 / fp16 1+5+10 / bf16 1+8+7 |\n"
         "| fp16 风险 | ±65504 溢出、1e-8 下溢 → 需 loss scaling |\n"
         "| bf16 优势 | 量程=fp32 不易溢出，尾数 7 位够用 |\n"
         "| 混合配方 | 矩阵乘 bf16 + master weights/累加/归约 fp32 |\n"
         "| 排查 | NaN 先查 fp16 溢出位置，再查 lr 与 warmup |"),
)
T["c8"] = dict(
expected="原文 13 个 3-shingle；Jaccard(原文,转载)=0.37、(原文,无关)=0.00；MinHash 64 维签名估计 0.33 与 0.00（接近真值）；LSH(b=32,r=2) 只撞出候选对 (原文,转载)，理论撞桶概率 ≈0.99，无关对不撞。",
why=("『数据决定上限』：同样的 7B 架构，喂垃圾语料就是垃圾模型。Chinchilla 之后高质量 token 成了最稀缺资源——"
     "来源配比、七道清洗关、MinHash 模糊去重，是数据工程的地图（深入版在 A5 展开）。"),
intuition=("语料像食材：Common Crawl 是刚捞上来的海产（量大但混着塑料袋），维基是净菜，书籍是精品肉，代码是提鲜的"
           "高汤（带推理能力）。清洗是洗菜七步：去壳（正文提取）、挑产地（语言识别）、挑品质（质量过滤）、去重"
           "（精确+模糊）、挑安全（有害内容）、配菜（配比）。MinHash 则是『闻味道认菜』：改了几个字的转载，"
           "shingle 集合高度重合，签名大概率相同。"),
cerr=("去重只做精确哈希，改字转载全数漏网，25% 冗余数据白白烧卡；MinHash 签名长度太短（<32），估计方差大到把"
      "不相似文档判成重复；shingle 的 k 取 1，Jaccard 被高频词淹没失去区分度。"),
miscon=("1. **『数据越多越好』**——重复数据边际收益趋零，C4 去重 25% 后等效 4 倍数据效果（Lee et al. 2021）；\\n"
        "2. **『清洗规则拍脑袋定』**——每条规则都要抽样人审校准，规则过猛会把方言/诗歌/代码一起误杀；\\n"
        "3. **『配比照抄 LLaMA 就行』**——配比依赖目标语言与下游任务，中文模型照搬 67% 英文网页必翻车。"),
connection=("- **向前**：c9 的 Scaling Laws 里 D 是与 N 同级的一等公民；\n"
            "- **向后**：A5（数据工程与语料构建）把本章每一步展开成完整流水线；\n"
            "- **平行**：mining-prep 的预处理思想同源，只是对象从网页换成表格。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 上限观 | 同构模型，数据差 10% 效果可差 30% |\n"
         "| 来源 | CC 67% / C4 15% / GitHub/Wiki/书/arXiv（LLaMA 配比）|\n"
         "| 七道关 | 提取→语言→质量→去重→安全→配比 |\n"
         "| 质量过滤 | 长度/词长/符号比/重复行启发式 + 分类器打分 |\n"
         "| MinHash | P(签名相同)=Jaccard；LSH 分带降为近似 O(n) |"),
)
T["c9"] = dict(
expected="GPT-3 175B/300B：tok/参数 1.7、loss≈2.00；Gopher 280B/300B：1.99；Chinchilla 70B/1.4T：20.0、loss≈1.94（同算力反超 Gopher）；LLaMA-1 7B 143:1、LLaMA-3 8B 1875:1（极端过训）；20N 规则复现 compute-optimal N≈70B、D≈1.40T。",
why=("给定 1e24 FLOPs 预算，训 100B 模型 2T token 还是 10B 模型 200T token？Scaling Law 把这个拍脑袋问题变成"
     "可计算的公式——Kaplan 说优先堆参数，Chinchilla 修正为参数与数据同比增，LLaMA 再修正为『推理优先故意过训』。"
     "三次范式转变全在这一章。"),
intuition=("幂律像往水池注水：模型翻 10 倍，loss 只降一个固定比例——收益递减但从不停止。Chinchilla 最优是『训练侧"
           "最省钱』：每参数 20 token；LLaMA 的过训是『推理侧最省钱』：模型上线服务百万次请求，小一号参数省下的"
           "推理费远超多花的训练费。两者的分歧不在公式，在『谁的账本』。"),
cerr=("用 Kaplan 配比把 175B 模型只训 300B token，如今看是严重欠训；拿 Chinchilla 20N 批评 LLaMA『浪费』——"
      "忽略推理成本才是主要成本；拟合 Scaling Law 时学习率调度与训练时长不匹配，测出的损失偏高（Kaplan 偏差来源）。"),
miscon=("1. **『Scaling Law 是精确预言』**——幂律是拟合外推，数据分布突变（换语料/加代码）后系数要重估；\\n"
        "2. **『20N 是铁律』**——它只在『训练算力固定』前提下最优，推理优先场景故意过训 100~2000N；\\n"
        "3. **『loss 越低模型越好』**——下游能力与 loss 不完全同步，基准评测与红队测试不可省。"),
connection=("- **向前**：A2 收官——本章算力账与 c6 显存账、c7 精度账合成一本总账；\n"
            "- **向后**：A5 的数据工程决定 D 的质量上限，llm-a4 的 MoE 改写 N 的定义；\n"
            "- **平行**：llm-b1 的训练实践把本章公式落成预算表。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 幂律 | L ∝ N^-α / D^-β（Kaplan：α≈0.076、β≈0.095）|\n"
         "| Kaplan | 优先堆参数：N∝C^0.73，D∝C^0.27 |\n"
         "| Chinchilla | 修正：D≈20N；70B/1.4T 胜 280B/300B |\n"
         "| 参数化 | L = 1.69 + 406.4/N^0.34 + 410.7/D^0.28 |\n"
         "| 过训逻辑 | 推理成本主导 → LLaMA 用 15T token 训 8B |"),
)

GOALS = {
"llm-a2-c1-l2": ("1. 手写带温度的 softmax 并预测 T 变化对分布熵的影响；\n"
                 "2. 实现 Top-K 与 Top-P 过滤，解释 Top-P 候选集的自适应性；\n"
                 "3. 说明贪心解码的重复循环风险与 beam search 的算力代价。"),
"llm-a2-c5-l1": ("1. 解释 warmup 的三个理由（Adam v 不稳/初期梯度剧烈/残差激活大）；\n"
                 "2. 实现余弦/线性/逆平方根三种调度并读数对比曲线形状；\n"
                 "3. 写出 Transformer 原版调度公式，说明 warmup 常占总步数 1%~5%。"),
"llm-a2-c6-l1": ("1. 算清 7B fp16 训练显存账（权重 14 + 梯度 14 + Adam 56 ≈ 84 GiB）；\n"
                 "2. 填出四种并行的『切什么/解决什么/通信特点』对照表；\n"
                 "3. 解释 DDP 的通信-计算重叠与 ring all-reduce 通信量 2(N-1)/N 的含义。"),
"llm-a2-c6-l2": ("1. 推导 Megatron 列并行（无通信）与行并行（一次 all-reduce）并数值验证等价性；\n"
                 "2. 说明 MLP『列切+行切』与注意力按 head 切的标准方案及 TP≤8 的原因；\n"
                 "3. 计算 PP 气泡比例 (P-1)/m，解释 1F1B 微批调度如何填满流水线。"),
"llm-a2-c6-l3": ("1. 列出 ZeRO 三阶段各切什么及显存/通信代价；\n"
                 "2. 算出 7B 在 DP=8 下 ZeRO-1/2/3 的每卡显存（35 / 22.75 / 10.5 GiB）；\n"
                 "3. 说明 FSDP 与 ZeRO-3 的对应关系及按 block 包装 + 预取的实现要点。"),
"llm-a2-c7-l1": ("1. 画出 fp32/fp16/bf16 位分配表，解释 fp16 与 bf16 取舍方向相反；\n"
                 "2. 演示 fp16 的 65504 溢出与 1e-8 下溢，解释 bf16 成为默认的原因；\n"
                 "3. 复述混合精度配方：计算用低精度、存储与累加用高精度。"),
"llm-a2-c8-l1": ("1. 列出六大数据来源与 LLaMA 配比，说明代码数据对推理能力的增益；\n"
                 "2. 写出网页清洗七道关流水线（提取→语言→质量→去重→安全→配比）；\n"
                 "3. 用启发式规则表过滤低质文本，并说明质量分类器打分方案。"),
"llm-a2-c8-l2": ("1. 计算 shingle 集合的 Jaccard 相似度并解释 k 的典型取值（5 或 9）；\n"
                 "2. 实现 MinHash 签名并验证 P(签名相同)=Jaccard 定理；\n"
                 "3. 用 LSH 分带把 O(n²) 降到近似 O(n)，说明 b/r 对召回与精确的权衡。"),
"llm-a2-c9-l1": ("1. 写出幂律形式 L∝N^-α、L∝D^-β 并解释『收益递减但不停』；\n"
                 "2. 用 Chinchilla 参数化损失复算 Gopher vs Chinchilla（同算力 70B/1.4T 胜出）；\n"
                 "3. 区分 Chinchilla-optimal 与 inference-optimal，解释 LLaMA 过训的经济学。"),
}
PREREQ = {
"llm-a2-c1-l2": "- llm-a1 的 softmax 与解码循环。",
"llm-a2-c5-l1": "- llm-a1 的训练循环；\n- Adam 优化器 m/v 的概念。",
"llm-a2-c6-l1": "- c5 的 batch 与梯度概念；\n- GiB/字节换算。",
"llm-a2-c6-l2": "- 「为什么单卡训不动：显存都花在哪了」（c6-l1）；\n- 矩阵分块乘法。",
"llm-a2-c6-l3": "- 「张量并行与流水线并行」（c6-l2）；\n- all-reduce/all-gather 概念。",
"llm-a2-c7-l1": "- c5/c6 的训练流程；\n- 二进制与科学计数法。",
"llm-a2-c8-l1": "- 无课内硬前置；\n- 知道 token 概念即可。",
"llm-a2-c8-l2": "- 「预训练数据全景」（c8-l1）；\n- 集合运算与哈希基础。",
"llm-a2-c9-l1": "- c5 的学习率、c8 的数据量概念；\n- 幂函数与对数。",
}
CODES = {}
CODES["c1"] = '''import numpy as np, random
random.seed(0); np.set_printoptions(precision=3, suppress=True)
logits = np.array([4.0, 3.2, 2.6, 1.8, 1.0, 0.5])
def softmax(z):
    e = np.exp(z - z.max()); return e / e.sum()

# ---- 1. 温度对分布的影响 ----
for T in (0.5, 1.0, 2.0):
    p = softmax(logits / T)
    print(f"T={T}: {p}  熵={-(p*np.log(p)).sum():.3f}")

# ---- 2. Top-K 与 Top-P 过滤 ----
def top_k(logits, k):
    idx = np.argsort(-logits)[:k]
    m = np.full_like(logits, -np.inf); m[idx] = logits[idx]
    return softmax(m)
def top_p(logits, p):
    ps = softmax(logits); order = np.argsort(-ps)
    cum = np.cumsum(ps[order]); cut = np.searchsorted(cum, p) + 1
    keep = order[:cut]
    return softmax(np.where(np.isin(np.arange(len(logits)), keep), logits, -np.inf))
print("Top-K=2:", top_k(logits, 2), "| Top-P=0.9:", top_p(logits, 0.9))

# ---- 3. 贪心解码的重复循环 ----
trans = {"the": ["cat", "cat", "dog"], "cat": ["sat"], "sat": ["on", "on", "there"],
         "on": ["the"], "dog": ["sat"], "there": ["the"]}
def gen(w, n, greedy):
    out = [w]
    for _ in range(n):
        c = trans.get(out[-1], ["the"])
        out.append(c[0] if greedy else random.choice(c))
    return out
print("贪心:", " ".join(gen("the", 8, True)))
print("采样:", " ".join(gen("the", 8, False)))'''
CODES["c5"] = '''import math, random
random.seed(0)
peak, warmup, total, min_lr = 3e-4, 1000, 10000, 3e-5
def cosine(step):
    if step < warmup: return peak*step/warmup
    prog = (step-warmup)/(total-warmup)
    return min_lr + 0.5*(peak-min_lr)*(1+math.cos(math.pi*prog))
def linear(step):
    if step < warmup: return peak*step/warmup
    prog = (step-warmup)/(total-warmup)
    return min_lr + (peak-min_lr)*(1-prog)
def invsqrt(step):
    if step < warmup: return peak*step/warmup
    return peak*math.sqrt(warmup/step)
print("step     cosine     linear     invsqrt")
for s in (500, 1000, 2500, 5000, 10000):
    print(f"{s:5}  {cosine(s):.2e}  {linear(s):.2e}  {invsqrt(s):.2e}")

# ---- Adam 前几步 v 不稳定：warmup 的物理来源 ----
grads = [1e-3, 2e-3, 1.5e-3, 1e-3, 3e-3]      # 初期碰巧全是小梯度
v = sum(g*g for g in grads)/5
step = 3e-4 / math.sqrt(v + 1e-8)
print(f"前 5 步 v≈{v:.1e}，此时一个 g=1 的大梯度到来：Adam 步长 ≈ lr/√v = {step:.2f}（参数被一步推出 0.1 量级）→ 必须先 warmup 让 v 积累")

# ---- 原版 Transformer 调度 ----
d_model, ws = 512, 4000
tlr = lambda s: d_model**-0.5 * min(s**-0.5, s*ws**-1.5)
for s in (100, 4000, 40000):
    print(f"Transformer step={s}: lr={tlr(s):.6f}")'''
CODES["c6"] = '''import numpy as np
GB = 1e9
P = 7e9
w, g, opt = P*2/GB, P*2/GB, P*8/GB      # fp16 权重/梯度；fp32 m+v 各 4 字节
print(f"7B: 权重 {w:.0f} + 梯度 {g:.0f} + Adam {opt:.0f} = {w+g+opt:.0f} GB（不含激活）")
N = 8
print(f"ZeRO-1: {w+g+opt/N:.1f} | ZeRO-2: {w+g/N+opt/N:.1f} | ZeRO-3: {(w+g+opt)/N:.1f} GB")

# ---- 张量并行数值验证 ----
rng = np.random.default_rng(0)
X = rng.normal(size=(4, 8)); W = rng.normal(size=(8, 6)); Y = X @ W
print("列切等价:", np.allclose(np.hstack([X@W[:, :3], X@W[:, 3:]]), Y))
print("行切等价:", np.allclose(X[:, :4]@W[:4, :] + X[:, 4:]@W[4:, :], Y))

# ---- 流水线气泡 ----
for P_, m in [(4, 1), (4, 8), (8, 16)]:
    print(f"P={P_}, 微批 m={m}: 气泡比例 ≈ (P-1)/m = {(P_-1)/m:.2f}")'''
CODES["c7"] = '''import numpy as np
print("fp16 max:", np.finfo(np.float16).max, "| fp16(1e-8) =", np.float16(np.float32(1e-8)))
def to_bf16(x):     # fp32 舍入到 bf16（尾数截到 7 位）
    x = np.float32(x)
    bits = x.view(np.uint32)
    bits = (bits + np.uint32(0x7FFF) + ((bits >> np.uint32(16)) & np.uint32(1))) & np.uint32(0xFFFF0000)
    return bits.view(np.float32)
for v in (3.14159, 1e-8, 1e5, 65520.0):
    f16 = np.float16(np.float32(v)) if abs(np.float32(v)) <= 65504 else np.float16(np.inf)
    print(f"{v}: fp32={np.float32(v):.6g}  bf16≈{to_bf16(v):.6g}  fp16={f16}")
s32 = np.float32(0); s16 = np.float16(0)
for _ in range(10000):                          # 顺序累加（模拟梯度累加）
    s32 = np.float32(s32 + np.float32(0.01))
    s16 = np.float16(s16 + np.float16(0.01))
print(f"顺序累加 0.01×10000: fp32={float(s32):.2f} | fp16={float(s16):.2f}（期望 100，fp16 在 32 附近饱和：ulp>0.01 加不上去）")'''
CODES["c8"] = '''import hashlib

def shingles(text, k=3):
    w = text.split()
    return set(" ".join(w[i:i+k]) for i in range(len(w)-k+1))
def jaccard(a, b): return len(a & b) / len(a | b)

docs = {
    "原文": "今天 天气 很好 我们 一起 去 公园 散步 然后 吃 了 午饭 感觉 很 开心",
    "转载": "今天 天气 不错 我们 一起 去 公园 走走 然后 吃 了 午饭 感觉 很 开心",
    "无关": "机器 学习 模型 需要 大量 数据 训练 参数 量 决定 上限 数据 质量 决定 效果",
}
S = {n: shingles(t) for n, t in docs.items()}
print("shingle 数: 原文 %d | Jaccard(原文,转载)=%.2f | Jaccard(原文,无关)=%.2f"
      % (len(S['原文']), jaccard(S['原文'], S['转载']), jaccard(S['原文'], S['无关'])))

def h(x, seed): return int(hashlib.md5((str(seed) + x).encode()).hexdigest()[:8], 16)
def signature(S_, n=64): return [min(h(x, s) for x in S_) for s in range(n)]
sig = {n: signature(S_) for n, S_ in S.items()}
sig_sim = lambda a, b: sum(x == y for x, y in zip(sig[a], sig[b])) / 64
print("MinHash 估计: 原文-转载 %.2f | 原文-无关 %.2f" % (sig_sim('原文', '转载'), sig_sim('原文', '无关')))

b, r = 32, 2
buckets = {}
for n, s in sig.items():
    for i in range(b):
        buckets.setdefault((i, tuple(s[i*r:(i+1)*r])), []).append(n)
pairs = {(v[i], v[j]) for v in buckets.values() if len(v) > 1 for i in range(len(v)) for j in range(i+1, len(v))}
print(f"LSH(b=32,r=2) 候选重复对: {pairs or '-'}（相似对以概率 1-(1-J^r)^b≈{1-(1-0.37**2)**32:.2f} 撞桶，无关对不撞）")'''
CODES["c9"] = '''E, A, alpha, B, beta = 1.69, 406.4, 0.34, 410.7, 0.28   # Chinchilla 参数化损失
loss = lambda N, D: E + A/N**alpha + B/D**beta
models = [("GPT-3", 175e9, 300e9), ("Gopher", 280e9, 300e9), ("Chinchilla", 70e9, 1.4e12),
          ("LLaMA-1 7B", 7e9, 1e12), ("LLaMA-3 8B", 8e9, 15e12)]
print("模型          N      D     tok/参数  训练FLOPs   loss")
for name, N, D in models:
    print(f"{name:12} {N/1e9:4.0f}B {D/1e12:5.2f}T  {D/N:8.1f}  {6*N*D:.2e}  {loss(N, D):.3f}")
C = 6*70e9*1.4e12                       # 与 Chinchilla 同算力
Nopt = (C/(6*20))**0.5
print(f"C={C:.2e} 下 compute-optimal: N≈{Nopt/1e9:.0f}B, D≈{20*Nopt/1e12:.2f}T（20N 规则复现 Chinchilla 配置）")
print("Gopher vs Chinchilla 同算力: loss %.3f -> %.3f" % (loss(280e9, 300e9), loss(70e9, 1.4e12)))'''

WHY = {k: T[k]["why"] for k in T}; INTU = {k: T[k]["intuition"] for k in T}
for _k in T: T[_k].setdefault("expected", "")

MD = {}
for lid, g in GOALS.items():
    cid = "c" + lid.split("-c")[1].split("-")[0]
    MD[lid] = build_md(lib.orig_content(lid), g, PREREQ[lid], WHY[cid], INTU[cid],
                       CODES[cid], T[cid]["expected"], T[cid]["cerr"], T[cid]["miscon"],
                       T[cid]["connection"], T[cid]["summary"], REF)

if len(sys.argv) > 1 and sys.argv[1] == "verify":
    for cid in ("c1", "c5", "c6", "c7", "c8", "c9"):
        print("=" * 20, cid)
        exec(compile(CODES[cid], cid, "exec"), dict(globals()))
    print("VERIFY-ONLY")
elif not all(T[c]["expected"] for c in T):
    print("expected 未填，先 verify")
else:
    for lid in GOALS:
        lib.patch_lesson(lid, MD[lid])
    finish(lib)
