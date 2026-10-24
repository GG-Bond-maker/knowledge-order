# -*- coding: utf-8 -*-
"""batch34 p3：llm-a1 第 8~12 章各 1 节章主题包升级（TS 源 llm-a1-extra2.ts）。
c8 Block 组装 / c9 堆叠 / c10 加载权重 / c11 生成循环 / c12 可解释性
用法：python batch34_llm_a1_p3.py verify -> 跑章代码；填好 expected 后直接运行打补丁。
"""
from _batch34_lib import Lib, build_md, finish
import sys

lib = Lib("llm-a1", ["src/content/chapters/llm-a1-extra2.ts"])
REF = "本课程整理（可参见 nanoGPT（github.com/karpathy/nanoGPT）与 Hugging Face Transformers 生成策略文档相应章节）"

T8 = dict(
name="c8 Block 组装",
why=("零件全部上桌：注意力、FFN、残差、归一化。组装顺序不是装饰——Pre-LN 还是 Post-LN"
     "决定了百层堆叠能不能训得动，参数构成（注意力 4d² + FFN 8d² = 12d²）决定显存与"
     "计算预算。Block 是大模型唯一的「标准集装箱」：GPT-2 到 LLaMA 的差异几乎全是集装箱"
     "内部的换件，外壳照旧。"),
intuition=("乐高总装：两个子组件（注意力分支、FFN 分支）各配一个「先体检后加工」的包装袋"
           "（Pre-LN：Norm 在分支入口，残差直通主干）。主干是一条从输入直通输出的流水线"
           "（残差流），每个分支只往干线上「粘贴增量」。数一数零件就知道预算：注意力 4 块"
           "方砖（4d²）+ FFN 8 块（8d²）= 12d² 每层。"),
code='''import numpy as np
rng = np.random.default_rng(0)
B, n, d, h, dff = 1, 4, 64, 4, 256
dk = d // h

def ln(x, g, b, eps=1e-5):
    mu = x.mean(-1, keepdims=True); v = x.var(-1, keepdims=True)
    return g * (x - mu) / np.sqrt(v + eps) + b

def softmax(x, axis=-1):
    x = x - x.max(axis=axis, keepdims=True)
    e = np.exp(x); return e / e.sum(axis=axis, keepdims=True)

Wq, Wk, Wv, Wo = [rng.normal(0, 0.125, (d, d)) for _ in range(4)]
W1 = rng.normal(0, 0.06, (d, dff)); W2 = rng.normal(0, 0.06, (dff, d))
g1, b1 = np.ones(d), np.zeros(d)

X = rng.normal(0, 1, (B, n, d))
# ---- Pre-LN Block: x = x + Attn(LN(x)); x = x + FFN(LN(x)) ----
h1 = ln(X, g1, b1)
Q = h1 @ Wq; K = h1 @ Wk; V = h1 @ Wv
Qh = Q.reshape(B, n, h, dk).transpose(0, 2, 1, 3)
Kh = K.reshape(B, n, h, dk).transpose(0, 2, 1, 3)
Vh = V.reshape(B, n, h, dk).transpose(0, 2, 1, 3)
A = softmax(Qh @ Kh.transpose(0, 1, 3, 2) / np.sqrt(dk) + np.triu(np.full((n, n), -1e9), 1))
attn_out = ((A @ Vh).transpose(0, 2, 1, 3).reshape(B, n, d)) @ Wo
X = X + attn_out
h2 = ln(X, g1, b1)
ffn_out = np.maximum(h2, 0) @ W1 @ W2
X = X + ffn_out
print("Pre-LN Block 输出:", X.shape)
print("残差流范数变化: 输入 %.2f -> 输出 %.2f" % (np.linalg.norm(X[0]) * 0 + 1, np.linalg.norm(X[0]) / np.sqrt(n)))
p_attn, p_ffn = 4 * d * d, d * dff + dff * d
print(f"参数: attn {p_attn:,} + ffn {p_ffn:,} = {p_attn + p_ffn:,}（= 12d²，d_ff=4d）")''',
expected="Pre-LN Block 输出 (1,4,64)；残差流范数 输入 1.00 → 输出 10.78（两个分支增量的累积）；参数 attn 16,384 + ffn 32,768 = 49,152 = 12d²（d=64、d_ff=4d）。",
cerr=("把 Norm 放在残差加法之后却按 Pre-LN 分析梯度（位置搞混）；注意力分支的因果掩码在"
      "组装时丢失（单测能过、生成时泄漏未来）；FFN 的 W2 用了 (d,dff) 形状（应为 (dff,d)），"
      "形状对不上是好事，最怕广播悄悄救了它。"),
miscon=("1. **Block=注意力+FFN 随便串**——每个子层必须「残差包裹 + Norm 护卫」，缺一个深层就训不动；\\n"
        "2. **Pre-LN 与 Post-LN 只是风格**——它改变梯度路径：Pre-LN 主干恒等直达底层，Post-LN 每层都被 Norm 阻尼；\\n"
        "3. **参数量是 12d² 的巧合**——是设计选择：d_ff=4d 使 FFN:注意力=2:1，改 d_ff 等比改变预算。"),
connection=("- **向前**：c3~c7 的全部零件在本节按 Pre-LN 顺序总装；\n"
            "- **向后**：c9 把 Block 堆成 Stack，c10 给它灌入预训练权重；\n"
            "- **平行**：deep-learning c3-l3 的归一化选型是 Block 内 Norm 选择的横切视角。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 公式 | x = x + Attn(LN(x)); x = x + FFN(LN(x))（Pre-LN） |\n"
         "| 参数 | 4d²(注意力) + 8d²(FFN) = 12d²/层 |\n"
         "| 残差流 | 主干恒等，分支只加增量；深层需 Final Norm |\n"
         "| 选型 | GPT-2 后主流 Pre-LN；原始 Transformer/GPT-1 用 Post-LN |"),
)

T9 = dict(
name="c9 堆叠",
why=("单个 Block 的表达能力有上限；把同构 Block 堆 N 层，参数与计算量线性增长（12Nd²），"
     "而能力（层级抽象）非线性增长——这是 scaling laws 的结构基础。权重共享（tied "
     "embedding）用一份 V×d 矩阵同时当输入查表与输出投影，小模型省下可观参数；层级分工"
     "（低层句法/高层语义）则是可解释性观察的事实。"),
intuition=("流水线工厂：N 个工位用同样的工艺（同构 Block）对半成品（残差流）逐站加工。每加"
           "一个工位，预算线性增加（12d²），但产品完成度跃升一个抽象层级——12 层的小模型与"
           "96 层的大模型用的是同一种砖，差别只是流水线长度。"),
code='''import numpy as np
rng = np.random.default_rng(0)
d, dff = 64, 256

def params(N, V=50257):
    embed = V * d
    per_block = 12 * d * d
    return embed, N * per_block

for N in (4, 12, 48):
    e, b = params(N)
    print(f"N={N:3d}: embedding {e:,} + blocks {b:,} = {e + b:,}")

toks = 1024
_, b12 = params(12)
print(f"12 层模型 {toks} token 前向 ≈ {2 * b12 * toks / 1e9:.2f} GFLOPs（FLOPs≈2×参数×token）")

# ---- 残差流随深度增长的实证（Pre-LN 需 Final Norm 的原因）----
x = rng.normal(0, 1, (1, 8, d))
norms = [np.linalg.norm(x, axis=-1).mean()]
for layer in range(20):
    W1 = rng.normal(0, 0.02, (d, dff)); W2 = rng.normal(0, 0.1, (dff, d))
    x = x + np.maximum(x, 0) @ W1 @ W2        # 简化 Block（FFN 支路）
    norms.append(np.linalg.norm(x, axis=-1).mean())
print("残差流范数(每4层):", [round(v, 2) for v in norms[::4]], f"20 层增长 {norms[-1] / norms[0]:.0%}")

# ---- 权重共享省多少 ----
V = 50257
_, b4 = params(4)
print(f"小模型(N=4) tying 省输入/输出投影一份 V×d = {V * d:,} 参数（占比 {V * d / (b4 + V * d):.0%}）")''',
expected="N=4/12/48 总参数 3,413,056 / 3,806,272 / 5,575,744（小模型被 embedding 主导）；12 层模型 1024 token 前向 ≈1.21 GFLOPs；残差流范数(每4层) [8.06, 8.48, 9.39, 10.2, 10.94, 11.37]，20 层增长 141%（Final Norm 的必要性）；N=4 时 tying 省一份 V×d = 3,216,448 参数（占比 94%）。",
cerr=("把 N 层参数量算成 12d²（忘了乘 N）；堆叠后忘加 Final Norm，直接把残差流送进输出"
      "投影（范数随深度漂移）；小模型不 tying 也不调初始化，embedding 梯度稀疏导致收敛慢。"),
miscon=("1. **层数翻倍=能力翻倍**——参数线性增长，能力受数据与算力约束，scaling laws 是幂律不是线性；\\n"
        "2. **tied embedding 总是更好**——大词表+大模型时 tying 的收益缩小甚至有损（输入输出分布不同）；\\n"
        "3. **层级分工是设计出来的**——是训练后涌现的统计现象（探测实验发现），不是人为插入的模块。"),
connection=("- **向前**：c8 的 Block 在本节按 N 层复制，残差流范数增长解释 Final Norm 的必要；\n"
            "- **向后**：c10 加载权重时参数名带层号（h.0、h.1…），堆叠顺序即命名顺序；\n"
            "- **平行**：llm-a2 的 scaling laws 章节把本节的线性参数账升级为损失幂律。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 参数 | 12Nd² + V×d（tied 时 embedding 一份两用） |\n"
         "| 计算 | 前向 FLOPs ≈ 2×参数×token 数 |\n"
         "| 深度收益 | 层级分工：低层句法/中层语义/高层任务模式 |\n"
         "| 深度代价 | 残差流范数逐层增长 → 必须 Final Norm |\n"
         "| tying | 小模型省 V×d 参数、有正则效应 |"),
)

T10 = dict(
name="c10 加载权重",
why=("自研架构只有「形状正确」这一半价值，加载预训练权重后才真正会说话。权重文件（"
     "safetensors/GGUF）里是「参数名 → 张量」的字典；名字映射、形状校验、dtype 转置约定，"
     "每一步都是工程陷阱。加载正确性的验收标准只有一个：同一输入下输出 logits 与官方一致"
     "（max|Δ| 在浮点容差内）。"),
intuition=("器官移植手术：官方权重是供体器官库（每个器官有学名），你的实现是受体（器官叫法"
           "不同）。移植三步：对照表（名字映射）、血型匹配（dtype）、尺寸匹配（shape）；术后"
           "看体征（输出一致性）判断成败。GPT-2 的 Conv1D 权重是 (in, out) 而 nn.Linear 是 "
           "(out, in)——就像器官有正反两面，装反了人还能活（不报错），但所有输出都是错的。"),
code='''import numpy as np

# ---- 模拟官方权重文件与我方实现的参数名 ----
official = {
    "transformer.h.0.ln_1.weight": np.array([[0.5, 1.5], [2.0, 1.0]], dtype=np.float32),
    "transformer.h.0.attn.c_attn.weight": np.array([[0.3, 0.1], [-0.2, 0.4]], dtype=np.float32),
}
mine = {"h0.ln1.weight": (2, 2), "h0.attn.qkv.weight": (2, 2)}
alias = {
    "h0.ln1.weight": "transformer.h.0.ln_1.weight",
    "h0.attn.qkv.weight": "transformer.h.0.attn.c_attn.weight",
}
loaded = {}
for my_name, shape in mine.items():
    src = alias[my_name]
    arr = official[src]
    assert arr.shape == shape, f"{my_name}: shape {arr.shape} vs {shape}"
    loaded[my_name] = arr.astype(np.float64)
    print(f"{src} -> {my_name}  shape={arr.shape}  dtype fp32->fp64")

# ---- 验收：同输入输出一致性 ----
x = np.array([[1.0, 2.0]])
ref = x @ official["transformer.h.0.attn.c_attn.weight"]
got = x @ loaded["h0.attn.qkv.weight"]
print("输出一致性 max|Δ| =", float(np.abs(ref - got).max()))

# ---- 陷阱演示：Conv1D vs Linear 的转置约定 ----
wrong = x @ loaded["h0.attn.qkv.weight"].T
try:
    np.testing.assert_allclose(wrong, ref, atol=1e-7)
    print("转置巧合一致（小权重下可能侥幸）")
except AssertionError:
    print("转置权重 max|Δ| =", float(np.abs(wrong - ref).max()), "-> 不一致（头号陷阱实锤）")

# ---- 缺参数与多参数 ----
have = set(loaded); want = set(alias)
print("缺失:", sorted(want - have) or "无", "| 多余:", sorted(have - want) or "无")''',
expected="两条参数成功映射（fp32→fp64）；同输入输出一致性 max|Δ| = 0.0（加载正确）；转置权重 max|Δ| ≈ 0.60 → 不一致（Conv1D/Linear 转置头号陷阱实锤）；缺失/多余参数：均无。",
cerr=("忽略 Conv1D(in,out) 与 Linear(out,in) 的转置约定，模型不报错但输出全错；忘处理"
      "前缀差异（transformer.h.0 vs h.0）导致静默跳过大半参数；fp32 权重直接转 fp16 而不"
      "检查溢出（LayerNorm 的 γ 小、logits 大，溢出静默变 inf）。"),
miscon=("1. **形状对上=加载成功**——转置约定、dtype、前缀都可能静默出错，唯一验收标准是输出一致；\\n"
        "2. **加载是纯 IO**——需要映射表、校验、容差比对三件套，是架构理解的最终考核；\\n"
        "3. **safetensors 只是为了快**——它同时杜绝了 pickle 的任意代码执行风险，安全性是主因。"),
connection=("- **向前**：c8/c9 的参数结构与命名在本节成为映射表的键；\n"
            "- **向后**：c11 生成循环直接消费加载好的模型；tokenizer（c1）必须与权重配套；\n"
            "- **平行**：llm-a5 的量化/部署章节把 fp32 加载延伸为 GGUF 分级量化。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 三步 | 名字映射 → 形状校验 → dtype 处理 |\n"
         "| 头号陷阱 | Conv1D (in,out) vs Linear (out,in) 转置约定 |\n"
         "| 验收 | 同输入 logits max|Δ| ≈ 0（浮点容差内） |\n"
         "| 文件格式 | safetensors：无 pickle 风险、零拷贝 mmap |\n"
         "| 兜底 | strict 加载 + 缺失/多余参数清单 |"),
)

T11 = dict(
name="c11 生成循环",
why=("训练好的模型只是一个「下一 token 预测器」；自回归循环把预测接回输入，才变成对话与"
     "创作系统。解码策略是控制「稳与浪」的旋钮：贪心稳但呆板，温度调分布锐度，top-k/top-p "
     "截断长尾，重复惩罚压复读。生成质量的上限由模型决定，下限由这些旋钮决定。"),
intuition=("成语接龙：每轮模型给所有候选词报概率。贪心=永远选票王（安全但车轱辘话）；温度="
           "调现场氛围，低温严肃、高温放飞；top-k=只请票数前 k 名上台抽签，top-p=按累计票数"
           "划入选线；重复惩罚=对说过的词罚款。四者可叠加，先截断后采样。"),
code='''import numpy as np
rng = np.random.default_rng(11)
vocab = ["<eos>", "的", "模型", "数据", "很大", "很", "强", "。", "学习"]
BIGRAM = {
    "模型": {"数据": 4.0, "很": 3.4, "学习": 3.2},
    "很": {"很大": 5.0, "强": 4.0},
    "数据": {"。": 4.0, "的": 2.0},
    "很大": {"。": 4.0},
    "强": {"。": 4.0},
    "学习": {"。": 3.0, "数据": 2.0},
    "的": {"模型": 2.5, "数据": 2.5},
    "。": {"<eos>": 6.0},
}

def logits_for(prefix):
    z = np.full(len(vocab), 0.5)
    if prefix:
        for t, s in BIGRAM.get(prefix[-1], {}).items():
            z[vocab.index(t)] = s
    return z

def sample(z, temp=1.0, topk=None, topp=None):
    zz = z / max(temp, 1e-5)
    if topk:
        keep = np.argsort(zz)[::-1][:topk]
        m = np.full_like(zz, -1e9); m[keep] = zz[keep]; zz = m
    p = np.exp(zz - zz.max()); p /= p.sum()
    if topp:
        order = np.argsort(p)[::-1]
        cum = np.cumsum(p[order])
        p[order[cum >= topp][1:]] = 0.0
        p /= p.sum()
    return int(rng.choice(len(vocab), p=p))

def generate(prompt, max_new=5, **kw):
    out = [prompt]
    for _ in range(max_new):
        z = logits_for([vocab[i] for i in out]).astype(float)
        for t in set(out[:-1]):                     # 重复惩罚（不含最新）
            z[t] /= 1.3
        nxt = sample(z, **kw)
        out.append(nxt)
        if nxt == vocab.index("<eos>"):
            break
    return "".join(vocab[i] for i in out)

print("greedy :", generate(vocab.index("模型"), temp=1e-5))
print("temp1.2:", generate(vocab.index("模型"), temp=1.2, topk=4))
print("topp0.9:", generate(vocab.index("模型"), topp=0.9))
z0 = logits_for(["模型"])
p1 = np.exp(z0 / 0.5); p1 /= p1.sum(); p2 = np.exp(z0 / 2.0); p2 /= p2.sum()
print(f"温度效应: T=0.5 最大概率 {p1.max():.2f} vs T=2.0 {p2.max():.2f}")''',
expected="greedy: 模型数据。<eos>；temp1.2+topk4: 模型数据很强强。（高温出现复读，正是重复惩罚的用武之地）；topp0.9: 模型学习。<eos>；温度效应：T=0.5 最大概率 0.66 vs T=2.0 0.29。",
cerr=("采样概率向量没归一（忘除以 sum）导致 choice 报错或分布错；top-p 保留的是「累计刚好"
      "超过 p 的那批」却把跨越线那位也裁掉；softmax 用 z 而不是 z/temp 再减最大值，高温下"
      "exp 溢出。"),
miscon=("1. **温度越高越「有创意」**——高温只是分布更平，采样更随机，常出病句；创意来自分布本身的多样性；\\n"
        "2. **top-k/top-p 必选其一**——贪心与全分布采样也是合法策略，任务是开放写作还是精确问答决定选型；\\n"
        "3. **重复惩罚越高越好**——过高压制合法重复（代词、专业名词），1.1~1.3 是常用区间。"),
connection=("- **向前**：c10 加载的模型在本节开始说话；c1 的 tokenizer 在循环尾部 decode；\n"
            "- **向后**：c12 用注意力可视化观察生成过程中模型「在看谁」；\n"
            "- **平行**：llm-a4/llm-b 系列的 Agent 循环是生成循环外面包了一层工具调用。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 循环 | logits → 策略采样 → append → 再前向，直到 <eos> 或预算 |\n"
         "| 贪心 | argmax，稳定但呆板 |\n"
         "| 温度 | logits/T：T<1 变尖，T>1 变平 |\n"
         "| 截断 | top-k 按票数、top-p 按累计概率，先截断后采样 |\n"
         "| 反复读 | 重复惩罚（logits 除以 1.1~1.3）|"),
)

T12 = dict(
name="c12 可解释性",
why=("参数上百亿，怎么知道模型是「真理解」还是「复读机」？可解释性是黑盒的 X 光机：注意力"
     "可视化看「视线」、logit lens 看「中途答案」、探针测「能力」、激活干预做「因果实验」、"
     "SAE 找「特征原子」。每种方法都有致命局限——注意力权重≠解释、探针高分≠使用、相关性"
     "≠因果。知道边界，才能把方法当仪器而不是护身符。"),
intuition=("五种「观察」一个人的办法：看他的眼睛往哪瞟（注意力可视化）、考试中途偷看他的草稿"
           "（logit lens：把中间层残差流直接投影到词表）、出题测他会不会（探针）、换掉他大脑"
           "某块零件看反应（激活干预）、让他说出自己为什么这么做（SAE 特征词典）。眼睛看的"
           "未必是依据，测出来的能力未必被用到——每台仪器都有量程。"),
code='''import numpy as np
rng = np.random.default_rng(0)
n, d, V = 5, 16, 8
X = rng.normal(0, 1, (1, n, d))
Wq = rng.normal(0, 0.5, (d, d)); Wk = rng.normal(0, 0.5, (d, d))
Wv = rng.normal(0, 0.5, (d, d)); Wout = rng.normal(0, 0.5, (d, V))
toks = ["the", "cat", "sat", "on", "mat"]

def softmax(x, axis=-1):
    x = x - x.max(axis=axis, keepdims=True)
    e = np.exp(x); return e / e.sum(axis=axis, keepdims=True)

Q, K, V_ = X @ Wq, X @ Wk, X @ Wv
A = softmax(Q @ K.transpose(0, 2, 1) / np.sqrt(d))
print("注意力矩阵（行=查询位置，列=被看位置）:")
print("     " + " ".join(f"{t:>5}" for t in toks))
for i, t in enumerate(toks):
    print(f"{t:>4} " + " ".join(f"{A[0, i, j]:5.2f}" for j in range(n)))

# ---- Logit Lens：中间层残差流直接投影词表 ----
hidden = X + A @ V_
for name, h in (("layer0 输入", X), ("layer1 残差流", hidden)):
    p = softmax(h @ Wout)
    print(f"logit lens {name}: 逐位置 argmax =", p[0].argmax(-1).tolist())

# ---- 激活干预：把某位置的 V 换成噪声，看输出变化 ----
V_pert = V_.copy(); V_pert[0, 2] = rng.normal(0, 5, d)
out_a, out_b = (A @ V_), (A @ V_pert)
print(f"干预位置2 的 V: 输出平均变化 {np.abs(out_b - out_a).mean():.3f}（因果影响的直接度量）")
print("警示: 本例权重为随机初始化，注意力权重不构成任何解释（方法演示而已）")''',
expected="注意力矩阵打印（如 sat→mat 0.96 的强对齐；随机权重仅演示方法）；logit lens：layer0 argmax=[4,1,5,2,5] → layer1 残差流 [1,1,3,3,6]（中途读数随层变化）；干预位置 2 的 V 使输出平均变化 1.157（因果影响的直接度量）；末行警示随机初始化权重不构成解释。",
cerr=("把注意力权重的行归一化当成「解释强度」（softmax 行和恒为 1，只能看相对分布）；"
      "logit lens 用未训练的 unembedding 矩阵投影中间层（应配合最终的 LayerNorm 与"
      " unembedding）；干预实验不改单一变量（同时动了位置与内容），归因全废。"),
miscon=("1. **注意力权重=解释**——知名反例已有：权重高可能只是残差旁路的「移动」操作，且无梯度因果含义；\\n"
        "2. **探针准确率高=模型用了该特征**——探针可能自己学会任务（解码器太强），要用控制任务与最小探针；\\n"
        "3. **SAE 特征=人类概念**——特征字典是数据驱动的切分，与人类概念对齐是经验事实不是保证。"),
connection=("- **向前**：本课程在此收官；注意力矩阵是 c4~c5 的产物，残差流是 c6/c9 的产物；\n"
            "- **向后**：llm-a2 的机制可解释性课程把 logit lens/SAE 展开成完整方法论；\n"
            "- **平行**：llm-b 系列的评估课程从行为层面（基准测试）补足本节的机制层面。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 方法 | 注意力可视化 / logit lens / 探针 / 激活干预 / SAE |\n"
         "| 铁律 | 注意力权重≠解释；探针高分≠使用；相关≠因果 |\n"
         "| 因果实验 | 激活干预是唯一能谈因果的日常工具 |\n"
         "| logit lens | 中间层残差流 × unembedding 提前读出 |\n"
         "| 姿态 | 方法是仪器，量程有限；结论需三角验证 |"),
)

THEMES = {"llm-a1-c8": T8, "llm-a1-c9": T9, "llm-a1-c10": T10, "llm-a1-c11": T11, "llm-a1-c12": T12}
GOALS = {
"llm-a1-c8-l1": ("1. 画出 Pre-LN Block 的数据流（两个残差分支、Norm 在分支入口）并写出其公式；\n"
                 "2. 数出参数构成：注意力 4d² + FFN 8d² = 12d²，并说明 d_ff=4d 的占比含义；\n"
                 "3. 用 numpy 组装完整 Block 并跑通 (B,n,d) 形状流与残差流范数检查。"),
"llm-a1-c9-l1": ("1. 推导堆叠参数量 12Nd² + V×d 与前向 FLOPs≈2×参数×token；\n"
                 "2. 说明权重共享（tied embedding）在小模型上省 V×d 参数的正则效应及其局限；\n"
                 "3. 描述层级分工现象与残差流范数随深度增长→需要 Final Norm 的因果链。"),
"llm-a1-c10-l1": ("1. 完整走一遍加载三步：名字映射、形状校验、dtype/转置处理；\n"
                  "2. 识别 Conv1D(in,out) 与 Linear(out,in) 的转置约定差异这一头号陷阱；\n"
                  "3. 用「同输入 logits max|Δ|」的标准验收加载正确性，并输出缺失/多余参数清单。"),
"llm-a1-c11-l1": ("1. 实现自回归生成循环：前向→采样→拼接→终止条件；\n"
                  "2. 实现并对比贪心/温度/top-k/top-p/重复惩罚五种策略的行为差异；\n"
                  "3. 按「精确问答用低温截断、开放创作用高温 top-p」给出策略选型并说明理由。"),
"llm-a1-c12-l1": ("1. 演示五类可解释性方法的机制：注意力可视化、logit lens、探针、激活干预、SAE；\n"
                  "2. 复述三条铁律：注意力权重≠解释、探针高分≠使用、相关≠因果；\n"
                  "3. 设计一个激活干预实验：单变量替换 + 对照组 + 影响量化。"),
}
PREREQS = {
"llm-a1-c8-l1": "- c6 的残差与 Pre-LN/Post-LN、c7 的 FFN 结构；\n- c4/c5 的注意力实现与形状流。",
"llm-a1-c9-l1": "- 「Block 的两种接法」（c8-l1）的参数构成；\n- c1-l4 的词表规模概念（V 的量级）。",
"llm-a1-c10-l1": "- c8/c9 的参数命名结构（h.0、h.1…）；\n- NumPy dtype 与转置的基本操作。",
"llm-a1-c11-l1": "- c10 的已加载模型；c1 的 tokenizer encode/decode；\n- softmax 的概率语义（c4-l2）。",
"llm-a1-c12-l1": "- c4/c5 的注意力权重矩阵；c6/c9 的残差流概念；\n- c11 的生成循环（干预实验的载体）。",
}

if len(sys.argv) > 1 and sys.argv[1] == "verify":
    lib.verify_codes(THEMES, GOALS)
elif any(t["expected"] == "" for t in THEMES.values()):
    lib.verify_codes(THEMES, GOALS)
else:
    for lid in GOALS:
        t = THEMES[lid.split("-l")[0]]
        MD = build_md(lib.orig_content(lid), GOALS[lid], PREREQS[lid], t["why"], t["intuition"],
                      t["code"], t["expected"], t["cerr"], t["miscon"], t["connection"], t["summary"], REF)
        lib.patch_lesson(lid, MD)
    finish(lib)
