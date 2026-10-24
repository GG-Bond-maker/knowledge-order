# -*- coding: utf-8 -*-
"""batch34 p1：deep-learning 第 1~2 章 6 节章主题包升级（TS 源 deep-learning.ts）。
c1 感知机与激活函数(3) / c2 MLP 与反向传播(3)
用法：python batch34_dl_p1.py verify -> 跑章代码；填好 expected 后直接运行打补丁。
"""
from _batch34_lib import Lib, build_md, finish
import sys

lib = Lib("deep-learning", ["src/content/chapters/deep-learning.ts"])
REF1 = "本课程整理（可参见 Minsky & Papert《Perceptrons》(1969) 与 Goodfellow《Deep Learning》Ch.6 相应章节）"
REF2 = "本课程整理（可参见 Rumelhart et al. (1986) 反向传播原文与 Karpathy micrograd 相应章节）"

T1 = dict(
name="c1 神经网络启蒙：从生物神经元到感知机",
why=("一切要从 1943 年的 MCP 神经元讲起：加权求和加阈值，这就是现代深度学习的原子积木。"
     "1969 年明斯基用 XOR 证明单层感知机连最简单的非线性问题都解不了，直接把连接主义推进"
     "寒冬——而解药（多层网络+非线性激活）恰恰是深度学习的全部起点。理解这段历史，就理解"
     "了「深度」与「非线性」为什么缺一不可。"),
intuition=("神经元是加权投票的评委：各证据（输入）有不同话语权（权重），评委还有入场门槛"
           "（偏置）。AND/OR 是一条直线能切开的「纸笔题」，XOR 是四个点两两交叉——任何一条"
           "直线都切不开，除非先「折叠空间」：隐藏层把平面弯一弯，XOR 就线性可分了。激活函数"
           "是折叠空间的那双手：没有它，一百层线性叠加仍是一层。"),
code='''import numpy as np
rng = np.random.default_rng(0)
X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]], float)

# ---- 1. 单层感知机训练 AND / OR / XOR ----
def train_gate(Y, lr=0.5, epochs=60):
    w = rng.normal(0, 0.3, 2)
    b = 0.0
    for _ in range(epochs):
        for x, y in zip(X, Y):
            p = 1.0 if x @ w + b > 0 else 0.0
            w += lr * (y - p) * x
            b += lr * (y - p)
    return (X @ w + b > 0).astype(int)
for name, Y in (("AND", np.array([0, 0, 0, 1])), ("OR", np.array([0, 1, 1, 1])),
                ("XOR", np.array([0, 1, 1, 0]))):
    pred = train_gate(Y)
    print(f"单层感知机 {name}: 预测 {pred.tolist()} 正确率 {(pred == Y).mean():.0%}")

# ---- 2. 两层网络破局 XOR（隐藏层折叠空间）----
Wh = np.array([[1.0, 1.0], [1.0, 1.0]]); bh = np.array([0.0, -1.0])
Wo = np.array([1.0, -2.0]); bo = 0.0
H = np.maximum(X @ Wh + bh, 0)          # h1=relu(x1+x2), h2=relu(x1+x2-1)
out = (H @ Wo + bo > 0).astype(int)     # XOR = h1 - 2*h2
print("两层 ReLU 网络 XOR 输出:", out.tolist(), "正确率", (out == np.array([0, 1, 1, 0])).mean())

# ---- 3. 激活函数速览 ----
z = np.array([-2.0, -1.0, 0.0, 1.0, 2.0])
sig = 1 / (1 + np.exp(-z))
relu = np.maximum(z, 0)
print("sigmoid:", np.round(sig, 3))
print("ReLU    :", relu, "| ReLU 导数在 0 点两侧: 0/1 跳变")''',
expected=("单层感知机 AND/OR 各 100%（预测 [0,0,0,1] 与 [0,1,1,1]）；XOR 50%（预测 [1,1,0,0]，恰好是反相——线性不可分实锤）；"
        "两层 ReLU 网络 XOR 输出 [0,1,1,0] 正确率 1.0（h1-h2·2 折叠空间破局）；"
        "sigmoid 五点 [0.119, 0.269, 0.5, 0.731, 0.881]；ReLU [0,0,0,1,2]，0 点导数 0/1 跳变"),
cerr=("把偏置写死为 0 还训练 XOR（决策边界被迫过原点，永远切不开）；用 sigmoid 而忘记"
      "初始化（输入大时梯度消失，训练看起来「卡住」）；两层网络的手工权重符号写错一位，"
      "输出全反还以为学习率问题。"),
miscon=("1. **感知机=弱化版神经网络**——它是历史起点与线性分类器，不是现代意义上的「网络」；多层+非线性才是分水岭；\\n"
        "2. **激活函数随便选**——必须非线性（否则深度坍缩），还要可导（或近似可导）以支持反向传播；\\n"
        "3. **XOR 危机已无关紧要**——它确立了「线性不可分需多层」的第一性结论，今天的核方法/深度网络都在回答同一个问题。"),
connection=("- **向前**：本课程的 MCP/XOR 直觉在 c2 展开成完整的 MLP 前向与反向；\n"
            "- **向后**：c3 的优化器与正则化解决「能训练」之后「训练得好」的问题；\n"
            "- **平行**：llm-a1 c6 的残差连接是「让深层可训」这条主线的现代续章。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 原子积木 | z = w·x + b，激活 f(z)，MCP(1943) → 感知机(1958) |\n"
         "| XOR 危机 | 单层线性不可分（1969），第一次 AI 寒冬 |\n"
         "| 破局 | 隐藏层折叠空间 + 非线性激活 |\n"
         "| 家族 | Sigmoid/Tanh（饱和）、ReLU（稀疏、快）、GELU/LeakyReLU（软/防死） |\n"
         "| 深度 | 无非线性则 N 层=1 层线性 |"),
)

T2 = dict(
name="c2 MLP 与反向传播",
why=("MLP 是一切深度网络的母版：前向是矩阵「流过流水线」，反向是链式法则把误差「逐站"
     "退回」。c2 的三节把万能近似定理、计算图局部梯度、矩阵微积分与数值梯度检验一次讲透"
     "——以后遇到 CNN/RNN/Transformer 的任何反向，都只是这套原语的重新拼装。数值梯度"
     "检查则是手写层的标准验收：解析梯度算错不报错，只有对照才暴露。"),
intuition=("前向是流水线：原料（输入 X）经两道工序（仿射+激活）变成成品（输出 Y）。反向是"
           "售后追溯：成品误差沿着工序单逆向逐站传递，每站用「本地规则」（局部梯度）换算"
           "自己该赔多少（权重梯度）。加法门是分账、乘法门是换汇、分支门是复印、max 门是"
           "路由——四种门电路就能拼出整个自动微分引擎。"),
code='''import numpy as np
rng = np.random.default_rng(0)
X = rng.normal(0, 1, (4, 3)); Y = rng.normal(0, 1, (4, 2))
W1 = rng.normal(0, 0.5, (3, 5)); b1 = np.zeros(5)
W2 = rng.normal(0, 0.5, (5, 2)); b2 = np.zeros(2)

def forward(X, W1, b1, W2, b2):
    H = np.tanh(X @ W1 + b1)                 # (B,5)
    out = H @ W2 + b2                        # (B,2)
    return out, H

def loss(out, Y):
    return ((out - Y) ** 2).mean()

def backward(out, Y, W2, H, X):
    B = X.shape[0]
    d_out = 2 * (out - Y) / (B * out.shape[1])
    dW2 = H.T @ d_out; db2 = d_out.sum(0)
    d_H = d_out @ W2.T * (1 - H ** 2)        # tanh 局部梯度
    dW1 = X.T @ d_H; db1 = d_H.sum(0)
    return dW1, db1, dW2, db2

out, H = forward(X, W1, b1, W2, b2)
g1, gb1, g2, gb2 = backward(out, Y, W2, H, X)
print(f"MSE = {loss(out, Y):.4f}")

# ---- 双边数值梯度检验 ----
def num_grad(f, p, eps=1e-5):
    g = np.zeros_like(p)
    it = np.nditer(p, flags=["multi_index"])
    for _ in it:
        i = it.multi_index
        old = p[i]
        p[i] = old + eps; lp = f()
        p[i] = old - eps; lm = f()
        p[i] = old
        g[i] = (lp - lm) / (2 * eps)
    return g

for name, p, g in (("W1", W1, g1), ("b2", b2, gb2)):
    ng = num_grad(lambda: loss(forward(X, W1, b1, W2, b2)[0], Y), p)
    rel = np.abs(g - ng).max() / (np.abs(g).max() + np.abs(ng).max() + 1e-12)
    print(f"{name}: 解析/数值相对误差 {rel:.2e} -> {'通过' if rel < 1e-6 else '未通过'}")

# ---- 一阶梯度的张量形状链 ----
print("形状链: X(4,3) W1(3,5) H(4,5) W2(5,2) out(4,2) | dW1=X^T d_H -> (3,5)")''',
expected=("MSE = 1.6667；数值梯度检验 W1 相对误差 3.03e-11、b2 相对误差 3.20e-12，均 <1e-6 通过；"
        "形状链 X(4,3)→H(4,5)→out(4,2)，dW1=X^T·d_H 形状 (3,5) 与 W1 一致"),
cerr=("反向里忘了乘激活导数（tanh 的 1-H²），梯度形状对但数值错，只能靠梯度检查抓；MSE 的"
      "归一化因子丢了（1/(B·C)），学习率被迫调小数百倍；数值检查用单边差分（O(ε) 误差），"
      "相对误差 1e-3 也「看着像对」。"),
miscon=("1. **万能近似定理=一层就够**——它只保证存在性不保证可学性；宽度爆炸+泛化差，深度才是效率来源；\\n"
        "2. **反向传播是一种不同的微积分**——它只是链式法则的动态规划式复用，共用中间结果把 O(指数) 降到 O(图大小)；\\n"
        "3. **梯度检查只在新层做一次**——每次改前向（改激活/加归一化）都要重检，它是层实现的一部分。"),
connection=("- **向前**：c2-l3 的矩阵微积分是本代码 backward 的逐行依据；\n"
            "- **向后**：c3 优化器消费这些梯度，c5 的 BPTT 是本节在时间维的展开；\n"
            "- **平行**：llm-a1 c7-l4 的 FFN 反向是同一套「转置回传+逐元素导数」的具体化。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 前向 | H=act(XW1+b1), Y=HW2+b2；形状链 X→H→out |\n"
         "| 反向 | dW=X^T·δ、db=Σδ、dX=δW^T + 激活导数 |\n"
         "| 门电路 | 加法分配、乘法交换缩放、分支累加、max 路由 |\n"
         "| 验收 | 双边差分数值梯度检查，相对误差 <1e-6 |\n"
         "| 万能近似 | 单隐层可逼近，但深度效率与泛化才是深度学习的理由 |"),
)

GOALS = {
"deep-learning-c1-l1": ("1. 用「加权打分+门槛」复述 MCP 神经元模型并写出 z = w·x + b；\n"
                        "2. 在二维平面上解释权重向量的方向、偏置的平移作用与决策边界的关系；\n"
                        "3. 手工设定权重让一个神经元实现 AND/OR 门。"),
"deep-learning-c1-l2": ("1. 复述 1969 XOR 危机的几何本质：四点两两交叉，单条直线不可分；\n"
                        "2. 用布尔代数 XOR = OR AND (NOT AND) 说明两层组合的破局思路；\n"
                        "3. 用两层 ReLU 网络手工构造 XOR 解并验证真值表。"),
"deep-learning-c1-l3": ("1. 证明无激活的深层网络坍缩为单层线性（W2W1 仍是一个矩阵）；\n"
                        "2. 对比 Sigmoid/Tanh/ReLU/GELU 的值域、饱和区与梯度特性并手算关键点；\n"
                        "3. 按场景选激活函数（隐藏层默认 ReLU/GELU、二分类输出 Sigmoid）并说明理由。"),
"deep-learning-c2-l1": ("1. 陈述万能近似定理的内容与「存在性≠可学性」的边界；\n"
                        "2. 画出两层 MLP 的计算图并逐站标注批处理张量形状 (B,in)→(B,h)→(B,out)；\n"
                        "3. 用 numpy 实现批处理前向传播并验证形状链。"),
"deep-learning-c2-l2": ("1. 用「局部梯度×上游梯度」复述链式法则的电路视角；\n"
                        "2. 推演加法/乘法/分支/max 四种门电路的梯度行为；\n"
                        "3. 手写一个标量自动微分引擎（micrograd 式）并跑通一个小计算图。"),
"deep-learning-c2-l3": ("1. 推导全连接层三公式：dW=X^Tδ、db=Σδ、dX=δW^T 并标注每个矩阵形状；\n"
                        "2. 解释双边差分（O(ε²)）优于单边差分（O(ε)）的原因与相对误差判定准则；\n"
                        "3. 对 2 层 MLP 完成解析梯度与数值梯度的对照检验（相对误差 <1e-6）。"),
}
PREREQS = {
"deep-learning-c1-l1": "- 线性方程与平面几何的常识；\n- 无编程前置（本章 numpy 示例可读即可）。",
"deep-learning-c1-l2": "- 「MCP 神经元」（c1-l1）的加权求和与阈值；\n- 布尔代数基本运算。",
"deep-learning-c1-l3": "- c1-l1/l1-2 的感知机模型；\n- 导数的几何意义。",
"deep-learning-c2-l1": "- c1 章的激活函数家族；\n- 矩阵乘法形状法则。",
"deep-learning-c2-l2": "- 「MLP 前向与计算图」（c2-l1）；\n- 一元链式法则。",
"deep-learning-c2-l3": "- c2-l2 的门电路与局部梯度；\n- 矩阵转置与形状追踪习惯。",
}

if len(sys.argv) > 1 and sys.argv[1] == "verify":
    lib.verify_codes({"deep-learning-c1": T1, "deep-learning-c2": T2}, GOALS)
elif T1["expected"] == "" or T2["expected"] == "":
    lib.verify_codes({"deep-learning-c1": T1, "deep-learning-c2": T2}, GOALS)
else:
    CIDS = {"deep-learning-c1-l1": T1, "deep-learning-c1-l2": T1, "deep-learning-c1-l3": T1,
            "deep-learning-c2-l1": T2, "deep-learning-c2-l2": T2, "deep-learning-c2-l3": T2}
    REFS = {k: (REF1 if "c1" in k else REF2) for k in CIDS}
    for lid, t in CIDS.items():
        MD = build_md(lib.orig_content(lid), GOALS[lid], PREREQS[lid], t["why"], t["intuition"],
                      t["code"], t["expected"], t["cerr"], t["miscon"], t["connection"], t["summary"], REFS[lid])
        lib.patch_lesson(lid, MD)
    finish(lib)
