# -*- coding: utf-8 -*-
"""batch34 p4：deep-learning 第 7 章 3 节章主题包升级（TS 源 deep-learning.ts）。
c7 注意力与 Transformer(3)
用法：python batch34_dl_p4.py verify -> 跑章代码；填好 expected 后直接运行打补丁。
"""
from _batch34_lib import Lib, build_md, finish
import sys

lib = Lib("deep-learning", ["src/content/chapters/deep-learning.ts"])
REF = "本课程整理（可参见 Bahdanau et al. (2014)、Vaswani et al. (2017) arXiv:1706.03762 相应章节）"

C7 = "deep-learning-c7"
THEME = dict(
name="c7 注意力机制、Transformer 与大模型奠基",
why=("Seq2Seq 把整句源文压成一个定长向量——长句信息在「最后一站」挤爆，这是神经机器"
     "翻译早期的信息瓶颈。Bahdanau 注意力让解码器每写一个词都能回看全部编码器状态，"
     "Transformer 更进一步：彻底拆掉循环，全靠自注意力并行建模任意距离的依赖。再配"
     "上混合精度、学习率退火、梯度累加三大工程杠杆，就是千亿大模型训练的全部地基。"),
intuition=("翻译不是逐词转录而是「回头看原文再落笔」：写每个译词前，眼睛在原文各词上扫出"
           "权重（对齐分数），加权汇聚出上下文——这就是软对齐。自注意力是「全场互看」："
           "每个词同时 query 所有词，一步直达且完全并行。混合精度是「粗活用 fp16、记账"
           "用 fp32」；warmup+余弦退火是「先热车再匀速滑行」；梯度累加是「小胃分几口吃"
           "下大 batch」。"),
code='''import numpy as np
import math
rng = np.random.default_rng(0)

def softmax(x, axis=-1):
    x = x - x.max(axis=axis, keepdims=True)
    e = np.exp(x); return e / e.sum(axis=axis, keepdims=True)

# ---- 1. Bahdanau 式对齐：解码态对编码器全状态打分 ----
n_enc, d = 6, 8
H_enc = rng.normal(0, 1, (n_enc, d))
s_t = rng.normal(0, 1, d)
W = rng.normal(0, 0.4, (d, d))
e = np.tanh(H_enc @ W + s_t) @ np.ones(d)
a = softmax(e)
print("对齐权重:", np.round(a, 2), "| 和 =", round(float(a.sum()), 2))
print("上下文向量:", (a @ H_enc).shape)

# ---- 2. 缩放点积注意力 + 因果掩码 ----
n, dk = 4, 8
Q = rng.normal(0, 1, (n, dk)); K = rng.normal(0, 1, (n, dk)); V = rng.normal(0, 1, (n, dk))
A = softmax(Q @ K.T / np.sqrt(dk) + np.triu(np.full((n, n), -1e9), 1))
print("因果掩码后上三角全零:", bool(np.allclose(np.triu(A, 1), 0)), "| 每行和=1:", bool(np.allclose(A.sum(-1), 1)))

# ---- 3. fp16 溢出：混合精度为何要 fp32 主权重 ----
a16 = np.array([4e4], dtype=np.float16)
print("fp16 上限 65504；4e4+4e4 =", (a16 + a16)[0], "-> 溢出为 inf")
loss16 = np.array([6e4], dtype=np.float16)
print("fp16 存 loss 6e4*2 ->", (loss16 * 2)[0])

# ---- 4. warmup + cosine 退火 ----
total, warm, base = 100, 10, 0.01
lrs = []
for step in range(1, total + 1):
    if step <= warm:
        lr = base * step / warm
    else:
        lr = base * 0.5 * (1 + math.cos(math.pi * (step - warm) / (total - warm)))
    lrs.append(lr)
print("前 12 步 lr:", [f"{v:.4f}" for v in lrs[:12]])
print(f"峰值 {max(lrs):.4f} @ step{int(np.argmax(lrs)) + 1}, 末值 {lrs[-1]:.4f}")''',
expected=("对齐权重 [0.08, 0.04, 0.26, 0.03, 0.38, 0.19] 且和=1.0，上下文向量形状 (8,)；"
        "因果掩码后上三角全零=True、每行和=1=True；fp16 溢出：4e4+4e4=inf、6e4*2=inf（fp32 主权重的必要性）；"
        "warmup 前 10 步 lr 线性升至 0.0100，余弦退火后末值≈0.0000"),
cerr=("fp16 下累加 loss（超 65504 立即 inf，要用 fp32 累加器）；warmup 阶段反而从大学习率"
      "开始（初始梯度大+方差高，直接冲大步会发散）；注意力打分忘了除 sqrt(d_k)（softmax "
      "饱和，并行训练的前几步就卡死）。"),
miscon=("1. **注意力权重=词对词的翻译对齐**——早期确实呈现对齐结构，但多层多头之后权重语义混杂，只能当证据不能当对齐表；\\n"
        "2. **Transformer 比 RNN「理解更好」**——它的胜利先是工程性的（可并行、长程直达），语言能力来自规模与数据；\\n"
        "3. **混合精度只是把 dtype 换掉**——需要 loss scaling、fp32 主权重、fp32 归一化统计量三件套配合，否则要么溢出要么不收敛。"),
connection=("- **向前**：本课程至此完成从感知机到 Transformer 的全部拼图；\n"
            "- **向后**：llm-a1 全课就是把本章的自注意力/位置编码/Block 手写一遍；\n"
            "- **平行**：paper-transformer 课程逐段精读 Attention Is All You Need 原文。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 瓶颈 | Seq2Seq 定长向量 → Bahdanau 软对齐 → 自注意力全并行 |\n"
         "| 注意力 | softmax(QK^T/sqrt(d_k))V + 因果掩码 |\n"
         "| 位置 | 正弦/可学习编码注入顺序（置换不变性的解药） |\n"
         "| AMP | fp16 算力 + fp32 主权重/累加 + loss scaling |\n"
         "| 调度 | warmup 热车 + 余弦退火；梯度累加等效大 batch |"),
)

GOALS = {
"deep-learning-c7-l1": ("1. 指出 Seq2Seq 定长向量的信息瓶颈并量化其随句长的恶化；\n"
                        "2. 写出 Bahdanau 加性注意力的打分与加权公式，说明「每步动态上下文」的含义；\n"
                        "3. 对比点积/加性/缩放点积三种打分函数的复杂度与适用条件。"),
"deep-learning-c7-l2": ("1. 用 Q/K/V 的检索哲学解释缩放点积注意力并推导 sqrt(d_k) 缩放；\n"
                        "2. 说明多头注意力的子空间分工与 O(n²·d) 全并行的工程意义；\n"
                        "3. 解释位置编码（正弦）与因果掩码如何分别补上顺序性与单向性。"),
"deep-learning-c7-l3": ("1. 说明混合精度三件套（fp16 计算/fp32 主权重/loss scaling）各自的必要性；\n"
                        "2. 实现线性 warmup + 余弦退火调度并解释为什么不热车会发散；\n"
                        "3. 用梯度累加把小显存 batch 等效放大，并复述本课程从感知机到大模型的完整脉络。"),
}
PREREQS = {
"deep-learning-c7-l1": "- c5 的 Seq2Seq/RNN 上下文；\n- softmax 的概率语义。",
"deep-learning-c7-l2": "- 「Bahdanau 注意力」（c7-l1）；\n- 矩阵乘法与形状追踪（c2-l1）。",
"deep-learning-c7-l3": "- c3 的优化器与学习率概念；\n- c7-l2 的 Transformer 基本结构。",
}

if len(sys.argv) > 1 and sys.argv[1] == "verify":
    lib.verify_codes({C7: THEME}, GOALS)
elif not THEME["expected"]:
    lib.verify_codes({C7: THEME}, GOALS)
else:
    for lid in ("deep-learning-c7-l1", "deep-learning-c7-l2", "deep-learning-c7-l3"):
        MD = build_md(lib.orig_content(lid), GOALS[lid], PREREQS[lid], THEME["why"], THEME["intuition"],
                      THEME["code"], THEME["expected"], THEME["cerr"], THEME["miscon"],
                      THEME["connection"], THEME["summary"], REF)
        lib.patch_lesson(lid, MD)
    finish(lib)
