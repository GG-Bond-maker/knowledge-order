# -*- coding: utf-8 -*-
"""batch34 p2：llm-a1 第 3~7 章 16 节章主题包升级（TS 源 llm-a1-extra.ts）。
c3 嵌入与位置编码(4) / c4 自注意力(4) / c5 多头进阶(3) / c6 残差与Norm(3) / c7 FFN(2)
用法：python batch34_llm_a1_p2.py verify -> 跑章代码；填好 expected 后直接运行打补丁。
"""
from _batch34_lib import Lib, build_md, finish
import sys

lib = Lib("llm-a1", [
    "src/content/chapters/llm-a1-extra.ts",
])
REF = "本课程整理（可参见 Attention Is All You Need（arXiv:1706.03762）与 The Annotated Transformer 相应章节）"

T3 = dict(
name="c3 嵌入与位置编码",
why=("token ID 只是货号，模型第一层要把它变成能做矩阵乘法的稠密向量；而自注意力对位置完全"
     "置换不变——「猫咬狗」与「狗咬猫」在它眼里一模一样，所以顺序信息必须显式注入。嵌入层与"
     "位置编码是手写 Transformer 的第一块可学习积木：查表的 O(1) 与梯度稀疏性、正弦编码的"
     "外推性、可学习编码的灵活性、RoPE 的相对距离性质，这组取舍决定后面所有层的输入质量。"),
intuition=("嵌入查表像酒店前台按房号递房卡：ID 3 直接取第 3 行，不用把 1 万张房卡各乘一遍"
           "（one-hot 乘法的慢速等价）。位置编码是给每个座位发一个「钟表」：正弦编码是快慢指针"
           "组合的多指针时钟，任意两座位指针夹角只差固定相位，远处也能认亲；RoPE 更直接——"
           "把每对坐标当成表针旋转，点积只看两只表的相对转角。"),
code='''import numpy as np
rng = np.random.default_rng(0)

# ---- 1. 查表 vs one-hot 乘法：数学等价，复杂度天差地别 ----
V, d = 6, 4
E = rng.normal(0, 1, (V, d))
ids = np.array([2, 0, 5])
print("gather == onehot@E:", np.allclose(E[ids], np.eye(V)[ids] @ E))
grad_rows = np.zeros(V); grad_rows[ids] = 1
print("稀疏梯度: 只有", int(grad_rows.sum()), "/", V, "行被更新")

# ---- 2. 正弦位置编码：每行范数恒定 ----
def pe(max_len, d_model):
    pos = np.arange(max_len)[:, None]
    i = np.arange(0, d_model, 2)
    div = np.exp(-np.log(10000.0) * i / d_model)
    P = np.zeros((max_len, d_model))
    P[:, 0::2] = np.sin(pos * div)
    P[:, 1::2] = np.cos(pos * div)
    return P
P = pe(64, 16)
print("PE 行范数(前3):", np.round(np.linalg.norm(P, axis=1)[:3], 3))

# ---- 3. RoPE：点积只依赖相对距离 m-n ----
def rope(x, pos):
    d = x.shape[-1]
    th = 10000.0 ** (-np.arange(0, d, 2) / d)
    ang = np.asarray(pos)[:, None] * th[None, :]
    c, s = np.cos(ang), np.sin(ang)
    x1, x2 = x[..., 0::2], x[..., 1::2]
    out = np.empty_like(x)
    out[..., 0::2] = x1 * c - x2 * s
    out[..., 1::2] = x1 * s + x2 * c
    return out
q = rng.normal(0, 1, 16)
d1 = float(np.sum(rope(q[None], [7])[0] * rope(q[None], [3])[0]))
d2 = float(np.sum(rope(q[None], [9])[0] * rope(q[None], [5])[0]))
print(f"q7·q3={d1:.4f} vs q9·q5={d2:.4f}（相对距离同为 4，旋转不改变相对几何）")

# ---- 4. 组合嵌入层：词向量×sqrt(d) + 位置 ----
d_model, n = 16, 5
Ew = rng.normal(0, 1, (V, d_model))
ids5 = rng.integers(0, V, n)
Xw = Ew[ids5] * np.sqrt(d_model)
Xin = Xw + P[:n]
print("组合嵌入形状:", Xin.shape, "乘 sqrt(d)≈", round(float(np.sqrt(d_model)), 2))''',
expected= "gather==onehot@E: True；稀疏梯度: 只有 3/6 行被更新；PE 行范数(前3)=[2.828 2.828 2.828] 恒定；q7·q3=4.9544 与 q9·q5=4.9544 完全相等（相对距离同为 4，旋转保持相对几何）；组合嵌入形状 (5,16)，sqrt(16)≈4。",
cerr=("embedding 忘乘 sqrt(d_model)，位置编码相对词向量被淹没；构造 PE 时 pos 与频率维 i 的"
      "广播顺序弄反（形状报错或语义全错）；RoPE 只旋转 Q 不旋转 K，点积的相对距离性质被破坏。"),
miscon=("1. **embedding 是全连接层**——它是一次按行索引（gather），没有任何乘法被真正执行，参数量 V×d 且梯度稀疏；\\n"
        "2. **正弦编码已过时**——它免训练且可外推到更长序列，与可学习编码各有取舍；RoPE 兼顾相对性与长度外推才成为主流；\\n"
        "3. **自注意力天生知道词序**——注意力对输入置换不变，去掉位置编码，句子就成了一袋词。"),
connection=("- **向前**：c1-l3 的查表直觉在本章落地为可学习参数与梯度流；\n"
            "- **向后**：本章输出（词向量+位置）正是 c4 自注意力的输入，RoPE 在 c5 多头与 llm-a3 中反复出现；\n"
            "- **平行**：llm-a2 的位置编码外推（NTK/ALiBi）讨论是本章三种方案的工程续篇。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 查表 | E[ids]，O(1)，梯度稀疏（只更新被查行） |\n"
         "| 缩放 | 输入乘 sqrt(d_model)：方差归一 + 与 PE 量级匹配 |\n"
         "| 正弦 PE | 免训练、每行范数恒定、PE(pos+k) 是 PE(pos) 线性变换 |\n"
         "| RoPE | 把相对位置放进旋转，点积只依赖 m-n |\n"
         "| 选型 | GPT-2 可学习 / LLaMA RoPE / 原始 Transformer 正弦 |"),
)

T4 = dict(
name="c4 自注意力",
why=("注意力是 Transformer 唯一的「信息搬运引擎」：任何两个位置一步直达，同时解决 RNN 的"
     "顺序墙与长程墙。但把公式变成能训练的代码，四个细节决定成败——点积为什么能当相关性、"
     "为什么必须除以 sqrt(d_k)（方差爆炸会让 softmax 变 one-hot）、因果掩码加在哪一侧、"
     "softmax 为什么要先减最大值。这四问每一问都对应一类真实的形状/数值 bug。"),
intuition=("图书馆软检索：你手里的问题（Q）与每本书的书脊标签（K）做匹配打分，按分值把书里的"
           "内容（V）按比例借出——分数经 softmax 变成一组「借阅配比」。sqrt(d_k) 是给打分"
           "降温：高维下点积方差随维度增大，不除就让一个人独占全部配比。因果掩码是考场挡板："
           "第 i 个位置只许看 ≤i 的答案卷。"),
code='''import numpy as np
rng = np.random.default_rng(0)
B, n, d = 1, 32, 64
X = rng.normal(0, 1, (B, n, d))
Wq = rng.normal(0, 0.125, (d, d)); Wk = rng.normal(0, 0.125, (d, d)); Wv = rng.normal(0, 0.125, (d, d))

def softmax(x, axis=-1):
    x = x - x.max(axis=axis, keepdims=True)   # 数值稳定
    e = np.exp(x); return e / e.sum(axis=axis, keepdims=True)

Q, K, V = X @ Wq, X @ Wk, X @ Wv
raw = Q @ K.transpose(0, 2, 1)                       # (B,n,n)
scaled = raw / np.sqrt(d)
print(f"原始 score std={raw.std():.2f} -> 除以 sqrt({d})={np.sqrt(d):.2f} 后 std={scaled.std():.2f}")
print(f"不缩放 softmax 最大权重={softmax(raw).max():.3f}（趋近 one-hot），缩放后={softmax(scaled).max():.3f}")

# ---- 因果掩码：加 -1e9 再 softmax ----
A = softmax(scaled + np.triu(np.full((n, n), -1e9), k=1))
print("上三角权重全 0:", bool(np.allclose(np.triu(A[0], 1), 0)), "| 每行和=1:", bool(np.allclose(A.sum(-1), 1)))
out = A @ V
print("形状流: X", X.shape, "-> out", out.shape, "| 参数量 Wq/Wk/Wv/WO = 4d^2 =", 4 * d * d)''',
expected= "原始 score std=7.74 → 除 sqrt(64)=8 后 std=0.97；不缩放 softmax 最大权重 1.000（塌缩 one-hot），缩放后 0.281（平滑分布）；上三角权重全 0=True、每行和=1=True；形状流 X(1,32,64)→out(1,32,64)，参数 4d²=16384。",
cerr=("softmax 忘减最大值，大 score 直接 exp 溢出为 inf；掩码加在 softmax 之后（权重已经"
      "泄漏了未来信息）；点积忘了转置 K（形状报错）或忘了除 sqrt(d_k)（训练能跑但注意力"
      "塌缩成检索）。"),
miscon=("1. **Q/K/V 是三种不同数据**——它们来自同一输入的三次线性投影，语义分工（查什么/被检索/被取用）由训练学出；\\n"
        "2. **sqrt(d_k) 是为了防过拟合**——它是纯数值稳定性：控制点积方差使 softmax 梯度不消失；\\n"
        "3. **掩码能省计算**——因果掩码不省 FLOPs（照样算满 n² 打分），只是把未来权重置零。"),
connection=("- **向前**：c3 的组合嵌入是本层输入，c2 概念章的「软检索」直觉在此变成形状流；\n"
            "- **向后**：c5 把本层拆成多头，c8 组装进 Block；KV 缓存（c5-l3）缓存的就是本章的 K/V；\n"
            "- **平行**：deep-learning c7 的 Bahdanau 加性注意力是同一「打分-加权」范式的加性版本。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 公式 | softmax(QK^T/sqrt(d_k))V，复杂度 O(n²·d) |\n"
         "| 缩放 | 高维点积方差 ~d，除 sqrt(d_k) 保 softmax 梯度 |\n"
         "| 掩码 | softmax 前上三角加 -1e9（不是 -inf，留数值余地） |\n"
         "| 稳定性 | softmax 先减行最大值 |\n"
         "| 参数 | Wq/Wk/Wv/WO 各 d×d，共 4d² |"),
)

T5 = dict(
name="c5 多头进阶",
why=("单头注意力只能学一种「关系型」；多头把 d 维拆成 h 个子空间让各头分工（句法/指代/位置），"
     "而总参数量与总计算量不变——免费的并行表达力。推理侧的另一本账是 KV Cache：n 个位置的"
     "K/V 全程驻留显存，长上下文下 MHA 的 KV 头是最大开销，MQA/GQA 因此成为现代推理的标配。"),
intuition=("多个专家审同一份合同：每人一支自己的荧光笔（各自的 W_Q/W_K/W_V 子空间），圈出各自"
           "关心的条款（各头注意力），最后秘书（W_O）把各色批注融合成一份意见。GQA 是「一组"
           "审阅人共用一份批注」：Q 头照旧多，K/V 头减半甚至归一，显存立省。"),
code='''import numpy as np
rng = np.random.default_rng(0)
B, n, d, h = 2, 6, 512, 8
dk = d // h
X = rng.normal(0, 1, (B, n, d))
Wq = rng.normal(0, 0.04, (d, d)); Wk = rng.normal(0, 0.04, (d, d))
Wv = rng.normal(0, 0.04, (d, d)); Wo = rng.normal(0, 0.04, (d, d))

def softmax(x, axis=-1):
    x = x - x.max(axis=axis, keepdims=True)
    e = np.exp(x); return e / e.sum(axis=axis, keepdims=True)

def mha(X, kv_heads=None):
    kh = kv_heads or h
    Q = X @ Wq
    Qh = Q.reshape(B, n, h, dk).transpose(0, 2, 1, 3)              # (B,h,n,dk)
    Kh = (X @ Wk).reshape(B, n, h, dk).transpose(0, 2, 1, 3)[:, :kh]   # (B,kh,n,dk) 只保留 kh 个头
    Vh = (X @ Wv).reshape(B, n, h, dk).transpose(0, 2, 1, 3)[:, :kh]
    Kh, Vh = np.repeat(Kh, h // kh, 1), np.repeat(Vh, h // kh, 1)  # 共享 KV 头
    A = softmax(Qh @ Kh.transpose(0, 1, 3, 2) / np.sqrt(dk))
    O = (A @ Vh).transpose(0, 2, 1, 3).reshape(B, n, d)
    return O @ Wo

print("MHA:", mha(X).shape, "| GQA-4:", mha(X, 4).shape, "| MQA:", mha(X, 1).shape)
print(f"参数量 4d^2 = {4*d*d:,}（与头数无关）")

n_ctx = 4096
for name, kv in (("MHA", 8), ("GQA-4", 4), ("MQA", 1)):
    mb = n_ctx * kv * dk * 2 * 2 / 1024**2      # K+V 两份, fp16
    print(f"{name}: KV Cache ≈ {mb:.0f} MB/层 (n={n_ctx}, fp16)")''',
expected= "MHA/GQA-4/MQA 输出形状同为 (2,6,512)；参数量 4d²=1,048,576 与头数无关；n=4096、fp16 下每层 KV Cache：MHA≈8 MB、GQA-4≈4 MB、MQA≈1 MB。",
cerr=("reshape 成 (B,n,h,dk) 后忘了 transpose 把头维换到序列前，注意力把「头」当「位置」混算；"
      "拼头时先 reshape 后 transpose（正确顺序是 transpose 再 reshape）；用整维 d 而不是 dk "
      "去除打分，softmax 再次过尖。"),
miscon=("1. **头越多参数越多**——四投影各 (d,d) 共 4d²，头数只决定怎么分组看，参数量不变；\\n"
        "2. **多头=多层注意力**——是同一层内部的分组并行，一次前向同时算完；\\n"
        "3. **GQA 只是省显存别无代价**——K/V 表达力下降，任务上通常近乎无损但不是严格零损（消融可见）。"),
connection=("- **向前**：c5-l1 的拆头-拼接形状流是本代码的逐行注释；\n"
            "- **向后**：llm-a3 的 GQA/MLA 架构演进直接复用本节 KV Cache 显存公式；\n"
            "- **平行**：deep-learning c7-l2 的多头自注意力是本节的教科书叙述版。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 形状流 | 投影(d) → 拆头(h,dk) → 各头注意力 → 拼头 → W_O 融合 |\n"
         "| 参数 | 4d² 与 h 无关；d_ff 与 d 同理由结构决定 |\n"
         "| KV Cache | n×kv×dk×2×bytes，GQA-4 约 MHA 一半，MQA 1/8 |\n"
         "| 陷阱 | reshape 后必 transpose；拼头反序；除 dk 不是 d |"),
)

T6 = dict(
name="c6 残差与 Norm",
why=("深层的两堵墙：梯度连乘让信号到不了底层（消失），激活分布在层间漂移让训练失稳。残差"
     "连接给梯度开一条「直通高速」，LayerNorm 给每个 token 的表示做逐层体检（均值/方差归一）。"
     "而归一化放在残差加法之前（Pre-LN）还是之后（Post-LN），直接决定百层网络能不能训得动"
     "——GPT-2 之后所有主流模型都选了 Pre-LN。"),
intuition=("残差是高速路的应急车道：主干道（F(x)）堵车时，梯度可以沿应急车道（恒等映射）直达"
           "起点，学到的只是「相对改进」而不是全部重写。LayerNorm 像体检：每个 token 入科前把"
           "各项指标（均值/方差）调到标准范围。Pre-LN 是「先体检再加工」（结果平稳可深堆），"
           "Post-LN 是「加工完再体检」（表达力强但深层易失控）。"),
code='''import numpy as np
rng = np.random.default_rng(0)

# ---- 1. 残差 vs 无残差：30 层梯度范数 ----
d, L = 64, 30
Ws = [rng.normal(0, 0.12, (d, d)) for _ in range(L)]
x0, g = rng.normal(0, 1, d), np.ones(d)

h = x0; acts = [x0]
for W in Ws:                                   # 无残差前向
    h = np.tanh(h @ W); acts.append(h)
grad = g
for i in reversed(range(L)):
    grad = (grad * (1 - acts[i + 1] ** 2)) @ Ws[i].T
print(f"无残差 {L} 层梯度范数: {np.linalg.norm(grad):.2e}")

h = x0; cache = [x0]
for W in Ws:                                   # 有残差前向
    cache.append(h)
    h = np.tanh(h @ W) + h
grad = g
for i in reversed(range(L)):
    t = np.tanh(cache[i] @ Ws[i])
    grad = (grad * (1 - t ** 2)) @ Ws[i].T + grad   # 恒等支路直通
print(f"有残差 {L} 层梯度范数: {np.linalg.norm(grad):.2e}")

# ---- 2. LayerNorm 实现 + Pre/Post-LN 堆叠稳定性 ----
def ln(x, eps=1e-5):
    mu = x.mean(-1, keepdims=True)
    return (x - mu) / np.sqrt(x.var(-1, keepdims=True) + eps)
X = rng.normal(0, 1, (2, 5, d))
Y = ln(X)
print("LN 后行均值≈0:", bool(np.allclose(Y.mean(-1), 0, atol=1e-7)),
      "行方差≈1:", bool(np.allclose(Y.var(-1), 1, atol=1e-3)))

x = X[0]
for i in range(24):                            # Pre-LN 24 层堆叠
    x = x + np.tanh(ln(x) @ rng.normal(0, 0.12, (d, d)))
print(f"Pre-LN 24 层残差流范数 {np.linalg.norm(x):.1f}（平稳增长，需 Final Norm 收口）")''',
expected= "无残差 30 层梯度范数 4.63e-01 vs 有残差 1.22e+02（约 260 倍差距）；LN 后行均值≈0、行方差≈1（allclose=True）；Pre-LN 24 层残差流范数 57.0 平稳增长，需 Final Norm 收口。",
cerr=("LayerNorm 的方差忘了加 eps，全零向量除零出 NaN；归一化沿 batch 维而不是特征维算统计量"
      "（那是 BatchNorm）；Pre-LN 堆叠后忘加 Final Norm，输出范数逐层漂移无法接 softmax。"),
miscon=("1. **残差让网络变深所以更强**——核心是恒等支路让「学恒等」零成本、梯度直通，深度只是收益之一；\\n"
        "2. **LayerNorm 和 BatchNorm 可互换**——统计切片维度不同（特征维 vs batch 维），变长序列与小 batch 下 BatchNorm 失效；\\n"
        "3. **Pre-LN 表达力一定更强**——Post-LN 在浅层（原始 Transformer）同样能训好，Pre-LN 的优势是深层稳定性。"),
connection=("- **向前**：c6-l1 的梯度量级实验是本代码第 1 段的展开；c6-l2 的 LN 反向手推对应实现；\n"
            "- **向后**：c8 组装 Block 时两个残差分支（注意力/FFN）入口各放一个 Norm；\n"
            "- **平行**：deep-learning c3-l3 的 BN/LN/RMSNorm 对照是本章的横向扩展。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 残差 | y = x + F(x)：梯度含恒等项，30 层仍直通 |\n"
         "| LayerNorm | 逐 token 沿特征维归一，带 γ/β 仿射 |\n"
         "| Pre-LN | Norm 在分支入口，深层可训，需 Final Norm |\n"
         "| Post-LN | Norm 在加法后，浅层可用，深层梯度失稳 |\n"
         "| 现代替代 | RMSNorm（去均值去 β）成为 LLaMA 世代默认 |"),
)

T7 = dict(
name="c7 FFN",
why=("注意力负责「搬运」信息，FFN 负责「加工与存储」：它占 Block 参数的三分之二，被广泛视为"
     "模型的知识库存（key-value 记忆）。结构却简单到极致——升维、非线性、降维；现代模型把"
     "ReLU 换成门控 SwiGLU，用同样的参数预算换来稳定涨点，这是手写大模型绕不开的一次升级。"),
intuition=("注意力是图书馆管理员取书，FFN 是读者在桌上消化：把 512 维摘要摊开成 2048 维草稿纸"
           "（升维），每维过一道非线性开关（激活），再压缩成 512 维结论（降维）。SwiGLU 的门控"
           "像「边读边决定什么值得记」：一条路出内容、一条路出权重门，逐元素相乘即加权记录。"),
code='''import numpy as np
rng = np.random.default_rng(0)
d, dff = 512, 2048
x = rng.normal(0, 1, (2, 8, d))
W1 = rng.normal(0, 0.02, (d, dff)); W2 = rng.normal(0, 0.02, (dff, d))

relu = lambda z: np.maximum(z, 0)
gelu = lambda z: 0.5 * z * (1 + np.tanh(np.sqrt(2 / np.pi) * (z + 0.044715 * z ** 3)))
silu = lambda z: z / (1 + np.exp(-z))

for name, act in (("ReLU", relu), ("GELU", gelu)):
    y = act(x @ W1) @ W2
    print(f"{name}-FFN: x{x.shape} -> y{y.shape}")

attn, ffn = 4 * d * d, 2 * d * dff
print(f"参数: attn {attn:,} + ffn {ffn:,}，FFN 占 {ffn / (attn + ffn):.0%}")

d_ff_s = 8 * d // 3                              # SwiGLU 等参缩放
W1s = rng.normal(0, 0.02, (d, d_ff_s)); W3s = rng.normal(0, 0.02, (d, d_ff_s))
W2s = rng.normal(0, 0.02, (d_ff_s, d))
y = (silu(x @ W1s) * (x @ W3s)) @ W2s
print(f"SwiGLU: d_ff={d_ff_s}≈8d/3, 参数 {2*d*d_ff_s + d_ff_s*d:,} ≈ ReLU-FFN {2*d*dff:,}")''',
expected= "ReLU/GELU-FFN 均 x(2,8,512)→y(2,8,512)；参数 attn 1,048,576 + ffn 2,097,152，FFN 占 67%；SwiGLU d_ff=1365≈8d/3，参数 2,096,640 ≈ 基线 2,097,152。",
cerr=("FFN 的激活忘在升维之后（等价于两层线性叠加，失去非线性）；SwiGLU 用 d_ff=4d 导致参数"
      "比基线多 50%（门控引入第三矩阵后应缩到 8d/3）；SiLU 手写 sigmoid 在大 |x| 溢出。"),
miscon=("1. **FFN 只是普通 MLP 凑数**——它是逐 token 独立的知识变换，参数占比最大，剪 FFN 对能力伤害最重；\\n"
        "2. **升维 4 倍是拍脑袋**——参数预算与表达力的工程折中（d_ff=4d 时 FFN 占 Block 2/3）；\\n"
        "3. **SwiGLU 涨点来自更多参数**——同参数预算下对比仍稳定更优，收益来自门控这条乘法通路。"),
connection=("- **向前**：c7-l1 的参数量估算与 c7-l3 的门控结构在本代码逐段对应；\n"
            "- **向后**：c8 组装 Block 的第二残差分支就是本章的 FFN；c7-l4 的反向推导以它为标本；\n"
            "- **平行**：llm-a3 的 MoE（把 FFN 复制 N 份加路由）是本章结构的稀疏化演进。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 结构 | 逐 token 两层 MLP：d→4d→d，块内唯一强非线性 |\n"
         "| 参数 | 2·d·d_ff = 8d²，占 Block 2/3 |\n"
         "| 激活 | ReLU → GELU（GPT-2）→ SwiGLU/SiLU（LLaMA） |\n"
         "| 门控 | SwiGLU：SiLU(xW1)⊗(xW3) 再 W2，d_ff 缩至 8d/3 |\n"
         "| 角色 | 模型的知识库存（key-value 记忆假说） |"),
)

THEMES = {"llm-a1-c3": T3, "llm-a1-c4": T4, "llm-a1-c5": T5, "llm-a1-c6": T6, "llm-a1-c7": T7}

GOALS = {
"llm-a1-c3-l1": ("1. 说明 embedding 查表（gather）与 one-hot 乘法数学等价但 O(1)，并能解释梯度稀疏性（只更新被查行）；\n"
                 "2. 给出乘 sqrt(d_model) 的两个理由：方差归一与位置编码量级匹配；\n"
                 "3. 说出 weight tying（输入 embedding 与输出 softmax 共享矩阵）省多少参数、为什么有效。"),
"llm-a1-c3-l2": ("1. 演示自注意力的置换不变性，说明为什么必须显式注入位置；\n"
                 "2. 写出正弦编码公式，解释波长指数分布（2π→10000·2π）的设计动机；\n"
                 "3. 用 numpy 实现正弦编码并验证两个性质：PE(pos+k) 是 PE(pos) 的线性变换、每行范数恒定。"),
"llm-a1-c3-l3": ("1. 对比可学习位置编码（GPT-2 路线）与正弦编码在灵活性与外推上的取舍；\n"
                 "2. 推导 RoPE 的核心操作：把 q/k 按二维一对旋转 θ_m 角，使内积只依赖 m-n；\n"
                 "3. 为给定场景（短文本分类/长上下文对话/推理加速）选择位置编码方案并陈述理由。"),
"llm-a1-c3-l4": ("1. 写出组合嵌入层完整流程：token embedding × sqrt(d) + 位置编码 →（可选 dropout）；\n"
                 "2. 逐站标注形状：(B,n) → (B,n,d)，说明 padding 位置在注意力中的掩码配合；\n"
                 "3. 估算嵌入层参数量 V×d 与输出层共享后的净增量。"),
"llm-a1-c4-l1": ("1. 用「图书馆软检索」说明 Q（查询）/K（标签）/V（内容）的分工，及三个矩阵都来自同一输入的投影；\n"
                 "2. 解释点积衡量相关性：同向大、正交零，且是可微的软检索而非硬选择；\n"
                 "3. 用 numpy 写出 Q=XW_Q 等投影并跑通 (B,n,d) 形状流。"),
"llm-a1-c4-l2": ("1. 推导缩放因子：假设 q、k 各分量独立零均值单位方差，点积方差为 d_k，除 sqrt(d_k) 归一；\n"
                 "2. 演示不缩放的后果：score 方差爆炸 → softmax 饱和 one-hot → 梯度消失；\n"
                 "3. 实现数值稳定的 softmax（先减行最大值）并说明其数学等价性。"),
"llm-a1-c4-l3": ("1. 说明语言模型为何不能看见未来（训练目标=逐位预测下一个 token）；\n"
                 "2. 实现因果掩码：softmax 前上三角加 -1e9，并解释为何不用 -inf（softmax 行全 -inf 出 NaN）；\n"
                 "3. 处理 padding mask 与 causal mask 的叠加，保持每行权重和为 1。"),
"llm-a1-c4-l4": ("1. 组装完整自注意力模块：投影→打分→缩放→掩码→softmax→加权→输出投影；\n"
                 "2. 逐站标注形状并解释批量化广播（(B,h,n,dk) 的四维张量流）；\n"
                 "3. 按自测清单验收：权重行和=1、上三角=0、输出形状不变、参数 4d²。"),
"llm-a1-c5-l2": ("1. 写出多头完整实现：reshape (B,n,h,dk) → transpose(0,2,1,3) → 各头注意力 → 反序拼接；\n"
                 "2. 用循环版对照矩阵版验证等价，建立「分组=分块乘法」的直觉；\n"
                 "3. 证明参数量 4d² 与头数无关，并按 (n²d + nd²) 分解注意力 FLOPs。"),
"llm-a1-c5-l3": ("1. 估算 KV Cache：n×kv×dk×2(K,V)×bytes，说明长上下文下它是推理显存的大头；\n"
                 "2. 说明 MQA/GQA 的改动只在 K/V 投影的输出头数（Q 照旧），h/qkh 组广播实现共享；\n"
                 "3. 换算 GQA-4 相对 MHA 的显存/带宽节省并解释精度几乎不掉的原因。"),
"llm-a1-c5-l4": ("1. 引用注意力头分工的实证观察（句法头/位置头/稀有词头），说明「头≠人话解释」；\n"
                 "2. 列出实现四坑：transpose 顺序、掩码 dtype 广播、dropout 位置、GQA 的 repeat 语义；\n"
                 "3. 权衡训练（MHA 全并行）与推理（GQA/MQA 省带宽）的不同最优。"),
"llm-a1-c6-l1": ("1. 用梯度直通解释残差 y=x+F(x) 为何缓解消失：反向含恒等项，30 层范数不塌缩；\n"
                 "2. 说明「学残差」的优化含义：恒等解零成本、网络学的是相对修正；\n"
                 "3. 指出残差流（residual stream）概念与「分支只做增量读写」的架构视角。"),
"llm-a1-c6-l2": ("1. 写出 LayerNorm 定义（沿特征维的均值/方差归一 + γ/β 仿射），说明与 BatchNorm 的切片差异；\n"
                 "2. 手推 LN 的反向传播（μ、σ² 两条路径的梯度合并）；\n"
                 "3. 实现 LN 并验证行均值≈0、行方差≈1，解释 ε 的防零除作用。"),
"llm-a1-c6-l4": ("1. 画出 Pre-LN 与 Post-LN 的数据流差异并说明梯度路径（Pre-LN 恒等主干直达底层）；\n"
                 "2. 解释 Pre-LN 深层稳定的代价：残差流范数逐层增长，必须加 Final Norm 收口；\n"
                 "3. 按模型深度给出选择：浅层可 Post-LN，深层/现代模型 Pre-LN（GPT-2 后主流）。"),
"llm-a1-c7-l1": ("1. 说明 FFN 逐 token 独立（无跨位置混合）与「先升维再降维」的结构理由；\n"
                 "2. 证明没有激活函数时两层线性坍缩为一层线性；\n"
                 "3. 估算 FFN 参数 2·d·d_ff 与占比（d_ff=4d 时为 Block 的 2/3）。"),
"llm-a1-c7-l3": ("1. 写出 SwiGLU 前向：SiLU(xW1)⊗(xW3) 再投影 W2，指出它把 FFN 变成三矩阵；\n"
                 "2. 解释等参缩放：三矩阵下 d_ff 取 8d/3 使参数与 ReLU-FFN 相当；\n"
                 "3. 说明门控为何有效：乘法通路让「内容路由」变成可学习的逐维选择。"),
}
PREREQS = {
"llm-a1-c3-l1": "- 「Embedding 查表与数字的碎片化表示」（c1-l3）的货号/材质卡直觉；\n- 矩阵按行索引的形状意识。",
"llm-a1-c3-l2": "- 「Embedding 查表」（c3-l1）的输出形状 (B,n,d)；\n- 三角函数与相位（sin/cos）的基本记忆。",
"llm-a1-c3-l3": "- 「正弦位置编码」（c3-l2）的波长分布与线性变换性质。",
"llm-a1-c3-l4": "- c3-l1 的查表与缩放、c3-l2/l3 的位置编码；\n- dropout 的训练/推理差异。",
"llm-a1-c4-l1": "- 「组合嵌入层」（c3-l4）的输入 (B,n,d)；\n- 矩阵乘法形状法则与 softmax 的概率语义。",
"llm-a1-c4-l2": "- 「Q/K/V 软检索」（c4-l1）的打分矩阵；\n- 期望与方差的基本运算。",
"llm-a1-c4-l3": "- 「缩放点积注意力」（c4-l2）的 softmax 实现；\n- 语言模型的下一 token 预测目标（c1 章）。",
"llm-a1-c4-l4": "- c4-l1/l2/l3 的全部组件：投影、缩放、掩码。",
"llm-a1-c5-l2": "- 「完整的自注意力模块」（c4-l4）的单头实现与形状流。",
"llm-a1-c5-l3": "- 「多头 numpy 实现」（c5-l2）的拆头/拼头；\n- 推理 KV Cache 的存在（c10/c11 会展开）。",
"llm-a1-c5-l4": "- c5-l2/l3 的实现与 KV Cache 概念。",
"llm-a1-c6-l1": "- 反向传播的链式法则直觉（deep-learning c2 或等价知识）；\n- c4/c7 的 Block 内部件。",
"llm-a1-c6-l2": "- 「残差连接」（c6-l1）的残差流视角；\n- 均值/方差的定义。",
"llm-a1-c6-l4": "- 「LayerNorm」（c6-l2）的定义与实现。",
"llm-a1-c7-l1": "- c6 的残差视角（FFN 是第二残差分支）；\n- 矩阵乘法与非线性激活的作用。",
"llm-a1-c7-l3": "- 「FFN 的结构」（c7-l1）与 GELU/SiLU 的公式（batch22 c7-l2 已升级节）。",
}

CIDS = {"llm-a1-c3-l1": "llm-a1-c3", "llm-a1-c3-l2": "llm-a1-c3", "llm-a1-c3-l3": "llm-a1-c3", "llm-a1-c3-l4": "llm-a1-c3",
        "llm-a1-c4-l1": "llm-a1-c4", "llm-a1-c4-l2": "llm-a1-c4", "llm-a1-c4-l3": "llm-a1-c4", "llm-a1-c4-l4": "llm-a1-c4",
        "llm-a1-c5-l2": "llm-a1-c5", "llm-a1-c5-l3": "llm-a1-c5", "llm-a1-c5-l4": "llm-a1-c5",
        "llm-a1-c6-l1": "llm-a1-c6", "llm-a1-c6-l2": "llm-a1-c6", "llm-a1-c6-l4": "llm-a1-c6",
        "llm-a1-c7-l1": "llm-a1-c7", "llm-a1-c7-l3": "llm-a1-c7"}

if len(sys.argv) > 1 and sys.argv[1] == "verify":
    lib.verify_codes(THEMES, GOALS)
elif any(t["expected"] == "" for t in THEMES.values()):
    lib.verify_codes(THEMES, GOALS)
else:
    for lid in GOALS:
        t = THEMES[CIDS[lid]]
        MD = build_md(lib.orig_content(lid), GOALS[lid], PREREQS[lid], t["why"], t["intuition"],
                      t["code"], t["expected"], t["cerr"], t["miscon"], t["connection"], t["summary"], REF)
        lib.patch_lesson(lid, MD)
    finish(lib)
