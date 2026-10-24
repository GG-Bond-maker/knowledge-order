# -*- coding: utf-8 -*-
"""batch36 B 组：paper-transformer《Transformer 家族》3 节升级（TS 源，_batch34_lib 模式）。
用法：python batch36_paper_transformer.py verify -> 跑章代码看输出
     python batch36_paper_transformer.py         -> 打补丁
"""
from _batch34_lib import Lib, build_md, finish
import sys

lib = Lib("paper-transformer", [
    "src/content/chapters/paper-transformer.ts",
    "src/content/chapters/paper-transformer2.ts",
    "src/content/chapters/paper-transformer3.ts",
])

C1 = dict(
name="c1 Attention Is All You Need：用注意力取代循环",
why=("RNN 一词一词排队处理：无法并行（GPU 上万核只用到 1 个）、长距离依赖衰减、梯度消失。"
     "Attention Is All You Need 用「圆桌会议」取代「传话游戏」：每个词直接看所有词，任意两位置距离 1；"
     "缩放点积注意力 softmax(QK^T/√d_k)·V 全程矩阵乘法，训练并行度提升一个数量级。"
     "GPT/BERT/Claude/Llama 的骨架全部来自这 8 页论文。代价是 O(n²) 复杂度与「无位置概念」"
     "（需要位置编码补课）。"),
intuition=("传话游戏 vs 圆桌会议：RNN 里第 1 个词的话要经过 99 张嘴才到第 100 个词，早面目全非；"
           "注意力让所有人同时发言、每个人按相关度决定听谁多少——距离永远是 1 步。查字典类比："
           "Q 是「我要查什么」，K 是「索引」，V 是「释义」；√d_k 缩放像稳定器，防止 softmax 进入饱和区。"),
code='''import numpy as np
rng = np.random.default_rng(20)
n, d, d_k = 5, 8, 4
X = rng.normal(0, 1, (n, d))
Wq, Wk, Wv = (rng.normal(0, .5, (d, d_k)) for _ in range(3))
def attention(X, scale=True):
    Q, K, V = X @ Wq, X @ Wk, X @ Wv
    s = Q @ K.T / (np.sqrt(d_k) if scale else 1)
    e = np.exp(s - s.max(1, keepdims=True))
    return e / e.sum(1, keepdims=True), V
P0, _ = attention(X)
P1, _ = attention(X, scale=False)
print("注意力矩阵形状:", P0.shape, "| 每行和 =", np.round(P0.sum(1), 2))
print(f"平均注意力熵: 缩放 {-(P0*np.log(P0+1e-12)).sum(1).mean():.2f} vs 不缩放 {-(P1*np.log(P1+1e-12)).sum(1).mean():.2f}")
perm = [3, 0, 4, 1, 2]
Pp, _ = attention(X[perm])
print("置换等变:", bool(np.allclose(Pp, P0[np.ix_(perm, perm)])), "-> 无位置编码时是词袋")''',
expected=("实测：注意力矩阵 (5,5) 每行和=1；缩放版平均注意力熵 0.61 明显高于不缩放的 0.21（不缩放时点积"
          "方差≈d_k，softmax 饱和、分布趋 one-hot）；打乱输入行后注意力矩阵按相同置换重排"
          "（allclose=True）——纯注意力对置换等变，是「词袋」，位置信息必须由位置编码外挂。"),
cerr=("忘除 √d_k，d_k=64 时点积标准差≈8，softmax 饱和梯度消失；mask 用 -inf 导致整行全屏蔽时 softmax 出 "
      "nan（用 -1e9）；以为多头增加总维度——d_model=h·d_k，只是切分子空间再拼回。"),
miscon=("1. **注意力=本文首次提出**——Bahdanau 2015 已有，本文的贡献是「只用注意力」（去掉 RNN）；\n"
        "2. **自注意力知道词序**——它对输入置换等变，顺序信息全靠位置编码；\n"
        "3. **O(n²) 是小问题**——序列翻倍计算 4 倍、显存吃 n²，长上下文是当前工程主战场"
        "（FlashAttention/稀疏/线性注意力）。"),
connection=("- **向前**：c2 的加性注意力提供 Q/K/V 原型，本文换成乘性并行版；\n"
            "- **向后**：c3 逐行实现全部细节；paper-foundation c1 的 RNN 瓶颈是被取代的对象；\n"
            "- **平行**：paper-vision c3 的 Pre-LN 与本课残差+LayerNorm 同源。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 核心式 | softmax(QK^T/√d_k)·V，全程矩阵乘可并行 |\n"
         "| 三瓶颈 | 串行/长距衰减/梯度消失 → 距离 1 步 |\n"
         "| 缩放 | 除 √d_k 控方差防饱和（熵 0.61 vs 0.21） |\n"
         "| 位置 | 置换等变 → sin/cos 位置编码外挂 |\n"
         "| 代价 | O(n²) 复杂度与显存 |"),
ref="本课程整理（可参见论文原文：Vaswani et al., Attention Is All You Need, arXiv:1706.03762）",
)

C2 = dict(
name="c2 Bahdanau 注意力：让翻译看着原文输出",
why=("2014 年的 seq2seq 把整句压进一个固定向量——500 页书压成一页摘要，长句 BLEU 急剧下降。"
     "Bahdanau 的洞察：翻译每个词时只需要看源句的相关部分。编码器输出全部时间步的隐状态，"
     "解码器每一步用加性注意力 e=v^T tanh(W_s·s+W_h·h) 动态算权重，加权求和出上下文。"
     "对齐是学出来的副产品（cat↔chat 无人标注），软对齐可视化也成为可解释性的起点——"
     "Q/K/V 的原型在此定型。"),
intuition=("同传译员不做「整句听完再默背」：翻到哪、看哪。解码器每生成一个词，回头扫一眼源句（对齐分数），"
           "把目光焦点（注意力权重）落在相关的词上，取一勺信息（加权求和）继续翻。源句再长也不怕——"
           "「摘要本」变成了「可以反复回看的原文」。"),
code='''import numpy as np
words = ["The", "cat", "sat", "on", "the", "mat"]
h = np.array([[-0.5, 1, 0], [2, 0, 0], [0, 2, 0], [-0.5, 0, 1], [-0.5, 1, 0], [0, 0, 2]], float)
s = np.array([2.0, 0.5, 0.5])                      # 解码器状态: 正想生成「猫」
Ws = Wh = 0.5 * np.eye(3); v = np.array([4.0, 0, 0])   # 演示投影(真实模型中学出)
e = np.tanh(Ws @ s + h @ Wh.T) @ v                 # e_i = v^T tanh(Ws·s + Wh·h_i)
p = np.exp(e - e.max()); p /= p.sum()
for w, pi in zip(words, p):
    print(f"  {w:>4}: {pi:.3f} " + "#" * int(pi * 40))
print("软对齐: 行和 =", round(float(p.sum()), 2), "| 解码「猫」时权重集中于 cat(均匀基线 0.167)")''',
expected=("实测：解码状态指向「猫」时，6 个源词的对齐权重最大落在 cat（0.371，均匀基线 0.167 的两倍余），"
          "功能词 The/on/the 仅 0.100；权重行随机（和=1）且为软对齐（次要词 sat/mat 仍分得 0.165）——"
          "对齐无需标注、由注意力自学。"),
cerr=("打分函数输入用 s_t 而非 s_{t-1}（泄露当前步信息）；softmax 前忘减 max 数值溢出；"
      "把对齐当硬 1-1 映射做解码约束——软对齐本来就是分布。"),
miscon=("1. **注意力权重=翻译对齐的真值**——它是对齐的软近似，可视化是诊断工具不是金标准；\n"
        "2. **加性比乘性好**——长句略好但慢，Transformer 选乘性为并行；\n"
        "3. **encoder 必须双向**——BiRNN 提升质量但失去流式能力，流式架构（RNN-T）反向取舍。"),
connection=("- **向前**：paper-foundation c2 的 RNN/LSTM 是 encoder/decoder 的载体；\n"
            "- **向后**：c1 把打分换成缩放点积并去掉循环，c3 的交叉注意力（Q=decoder, K/V=encoder）是直系；\n"
            "- **平行**：paper-reasoning c2 指针网络——注意力权重当输出的另一种用法。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 瓶颈 | 固定向量 c：长句 BLEU 急剧下降 |\n"
         "| 机制 | e=v^T tanh(W_s s+W_h h) → softmax → 加权求和 |\n"
         "| 对齐 | 软对齐自学（cat↔chat 无标注） |\n"
         "| 谱系 | 加性(慢/长句略好) vs 乘性(快/并行) |\n"
         "| 地位 | Q/K/V 原型，Transformer 的直接前身 |"),
ref="本课程整理（可参见论文原文：Bahdanau, Cho & Bengio, Neural Machine Translation by Jointly Learning to Align and Translate, arXiv:1409.0473）",
)

C3 = dict(
name="c3 The Annotated Transformer：逐行实现",
why=("论文公式简洁，实现细节全靠猜：多头是切分还是独立投影？mask 加在哪？为什么用 -1e9 不用 -inf？"
     "Annotated Transformer 把每个公式变成可运行代码并逐行注释，是学习 Transformer 实现的权威材料。"
     "它还用 Pre-LN（x+Sublayer(LayerNorm(x))）替代原论文的 Post-LN——与 ResNet v2 预激活同一思想，"
     "训练更稳定（GPT-2 之后的主流）。"),
intuition=("论文是「建筑效果图」，Annotated Transformer 是「施工图」：每一根钢筋（mask、reshape、transpose）"
           "都有尺寸标注。读施工图的关键动作是「跟踪形状」：(B,T,512) 进、view 成 (B,T,8,64)、"
           "transpose 成 (B,8,T,64)、注意力后拼回——形状对上了，实现就对了。"),
code='''import numpy as np
T = 4
rng = np.random.default_rng(22)
S = rng.normal(0, 1, (T, T))
Sm = np.where(np.tril(np.ones((T, T))) > 0, S, -1e9)     # causal mask
P = np.exp(Sm - Sm.max(1, keepdims=True)); P /= P.sum(1, keepdims=True)
print("causal 注意力(行=当前步):")
print(np.round(P, 2))
print("上三角=0, 第 t 步只看 0..t; 行和 =", np.round(P.sum(1), 2))
print("多头形状链: (2,10,512) -> (2,10,8,64) -> (2,8,10,64) -> (2,10,512)  [d_model=h·d_k]")''',
expected=("实测：causal mask 后的注意力矩阵严格下三角（上三角被 -1e9 压成 0），每行和=1——第 t 步只看 "
          "0..t；多头形状链 (2,10,512)→(2,10,8,64)→(2,8,10,64)→(2,10,512)：view+transpose 分头、"
          "逆操作合头，d_model=h·d_k 分头不改变总维度。"),
cerr=("causal mask 用 -inf，softmax 整行 -inf 时输出 nan（用 -1e9）；多头 reshape 顺序错"
      "（先 transpose 后 view 会打乱数据）；把 Annotated 的 2 层教学配置当原论文配置对标性能。"),
miscon=("1. **多头=多个完整 Transformer**——只是同一层内 8 个 64 维子空间并行注意力再拼接；\n"
        "2. **mask 只有 decoding 需要**——padding mask 在批量训练同样必需；\n"
        "3. **教学版能直接上生产**——Annotated 用 2 层+小数据集，用于理解实现而非部署。"),
connection=("- **向前**：c1 的公式与 c2 的交叉注意力在本节全部落到代码；\n"
            "- **向后**：Pre-LN 延续到 GPT-2/ViT（与 paper-vision c3 的预激活同源）；\n"
            "- **平行**：causal 生成与 paper-foundation c1 的自回归「预测下一个」一脉相承。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 价值 | 公式→逐行可运行代码，细节不再靠猜 |\n"
         "| 三细节 | √d_k 缩放、-1e9 mask、先 softmax 后乘 V |\n"
         "| 形状链 | (B,T,512)→(B,h,T,64)→(B,T,512) |\n"
         "| mask | causal 下三角实测：第 t 步只见 0..t |\n"
         "| Pre-LN | x+Sublayer(LayerNorm(x))，与 ResNet v2 同源 |"),
ref="本课程整理（可参见原文：Rush, The Annotated Transformer（2018，Harvard NLP）；Vaswani et al., Attention Is All You Need, arXiv:1706.03762）",
)

THEMES = {
    "paper-transformer-c1": C1, "paper-transformer-c2": C2, "paper-transformer-c3": C3,
}

GOALS = {
"paper-transformer-c1-l1": ("1. 说出 RNN 的三大瓶颈与注意力「任意两位置距离为 1」的对应解法；\n"
                            "2. 手推 softmax(QK^T/√d_k)·V 四步，解释 √d_k 缩放对方差与 softmax 饱和的作用；\n"
                            "3. 用 numpy 实现自注意力并验证：行随机、缩放提升注意力熵、置换等变性"
                            "（无位置编码即词袋）。"),
"paper-transformer-c2-l1": ("1. 用 BLEU 随句长下降的证据说明固定向量瓶颈，说出「动态对齐」如何取消该瓶颈；\n"
                            "2. 手推加性注意力三步（对齐分数→softmax→加权求和），对比 Bahdanau 加性与 "
                            "Luong/Transformer 乘性的参数与并行性差异；\n"
                            "3. 用 numpy 实现 BahdanauAttention，观察解码「猫」时权重向 cat 集中的软对齐行为。"),
"paper-transformer-c3-l1": ("1. 手写缩放点积注意力并解释三个实现细节（√d_k、-1e9 mask、先 softmax 后乘 V）；\n"
                            "2. 跟踪多头注意力的形状链 (B,T,d)→(B,h,T,d_k)→(B,T,d)，说明 view+transpose "
                            "的分头/合头机制；\n"
                            "3. 构造 causal mask 并验证第 t 步只看 0..t；区分 Post-LN 与 Pre-LN 及其与 "
                            "ResNet v2 的同源性。"),
}

PREREQS = {
"paper-transformer-c1-l1": "- c2 Bahdanau 注意力（Q/K/V 概念的来源）；\n- softmax 与点积相似度；\n- paper-foundation c1 的 RNN 瓶颈。",
"paper-transformer-c2-l1": "- seq2seq 编码器-解码器结构；\n- softmax；\n- paper-foundation c2 的双向 RNN（encoder 用 BiRNN 的原因）。",
"paper-transformer-c3-l1": "- c1 的缩放点积注意力；\n- c2 的交叉注意力概念；\n- LayerNorm 与残差连接（paper-foundation c3）。",
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
