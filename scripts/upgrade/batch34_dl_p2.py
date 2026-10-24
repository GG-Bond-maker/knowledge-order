# -*- coding: utf-8 -*-
"""batch34 p2：deep-learning 第 3~4 章 5 节章主题包升级（TS 源 deep-learning.ts）。
c3 优化器/正则化/归一化(3) / c4 卷积与池化(2)
用法：python batch34_dl_p2.py verify -> 跑章代码；填好 expected 后直接运行打补丁。
"""
from _batch34_lib import Lib, build_md, finish
import sys

lib = Lib("deep-learning", ["src/content/chapters/deep-learning.ts"])
REF3 = "本课程整理（可参见 Kingma & Ba (2014) arXiv:1412.6980、Loshchilov & Hutter (2017) AdamW 与 Ioffe & Szegedy (2015) BN 相应章节）"
REF4 = "本课程整理（可参见 LeCun et al. (1998) LeNet 与 He et al. (2016) ResNet 相应章节）"

T3 = dict(
name="c3 现代优化器与正则化武器库",
why=("损失曲面在高维空间里布满鞍点与病态峡谷（各方向曲率差千倍），SGD 在峡谷里之字震荡"
     "寸步难行——优化器的进化史就是「对地形自适应」的历史。而模型默认的命运是过拟合："
     "L2 把权重压小、Dropout 强迫冗余表征、早停在泛化拐点收手。BN/LN 则从「切片维度」"
     "重新定义归一化——batch 维还是特征维，决定了它们分别属于 CV 与 NLP 两个世界。"),
intuition=("下山雾很大，只能感觉脚下坡度：SGD 每步都信当下，峡谷两壁来回撞；Momentum 是"
           " bowling 球，惯性抹平震荡；RMSProp 给常走的陡坡换小步幅；Adam 同时记「平均方向」"
           "和「平均坡度」两本账。Dropout 是「随机让一半员工回家」，剩下的人被迫个个全能；"
           "BN 按列（同一特征跨样本）体检，LN 按行（同一样本全特征）体检——NLP 变长序列"
           "没有稳定的「列」，所以 LN 赢。"),
code='''import numpy as np
rng = np.random.default_rng(0)

# ---- 1. 病态峡谷: f = x^2 + 20y^2，三种优化器（各用合适学习率，150 步）----
def run(opt, steps=150):
    p = np.array([8.0, 3.0]); m = np.zeros(2); v = np.zeros(2)
    for t in range(1, steps + 1):
        g = np.array([2 * p[0], 40 * p[1]])
        if opt == "SGD":
            upd = 0.01 * g
        elif opt == "Momentum":
            m = 0.9 * m + g; upd = 0.01 * m
        else:  # Adam
            m = 0.9 * m + 0.1 * g
            v = 0.999 * v + 0.001 * g * g
            upd = 0.5 * (m / (1 - 0.9 ** t)) / (np.sqrt(v / (1 - 0.999 ** t)) + 1e-8)
        p = p - upd
    return p
for name in ("SGD", "Momentum", "Adam"):
    p = run(name)
    print(f"{name:9s} 终点 ({p[0]:+.4f}, {p[1]:+.4f}) |p|={np.linalg.norm(p):.4f}")

# ---- 2. Inverted Dropout：期望保持 ----
def dropout(x, p=0.5, train=True):
    if not train:
        return x
    mask = (rng.random(x.shape) >= p) / (1 - p)
    return x * mask
x = np.ones((8, 64))
means = [round(dropout(x).mean(), 2) for _ in range(5)]
print("train 均值≈1:", means, "| eval 恒等:", bool(np.allclose(dropout(x, train=False), x)))

# ---- 3. BN vs LN 切片维度 ----
Xb = rng.normal(2, 5, (4, 6))
bn = (Xb - Xb.mean(0, keepdims=True)) / Xb.std(0, keepdims=True)
lnn = (Xb - Xb.mean(1, keepdims=True)) / Xb.std(1, keepdims=True)
print("BN 按列: 每列均值", np.round(bn.mean(0), 6)[:3], "(跨样本归一)")
print("LN 按行: 每行均值", np.round(lnn.mean(1), 6)[:3], "(每样本归一)")''',
expected=("病态峡谷 150 步: SGD 终点 |p|=0.39（沿谷底爬行未达），Momentum 0.0013、Adam 0.0012（惯性/自适应解决峡谷）；"
        "Inverted Dropout 训练均值 [1.11, 0.99, 0.99, 0.86, 0.95]≈1（期望保持），eval 恒等=True；"
        "BN 按列均值全 0（跨样本归一），LN 按行均值全 0（每样本归一）"),
cerr=("Momentum 把学习率又乘进速度里（等效步长爆炸）；Dropout 推理时还开着或训练时忘了"
      "按 1/(1-p) 缩放（期望漂移一倍）；把 BN 用在变长序列的小 batch 上（统计量噪声巨大，"
      "NLP 应换 LN/RMSNorm）。"),
miscon=("1. **Adam 一定优于 SGD**——泛化上 SGD+动量在 CV 常更好，Adam 的自适应在大 batch/Transformer 更稳，是选型不是优劣；\\n"
        "2. **L2 与权重衰减完全等价**——在自适应优化器里两者路径不同（AdamW 因此修正），耦合在梯度更新里的 L2 被自适应缩放扭曲；\\n"
        "3. **归一化就是为了加速**——它同时改变损失曲面平滑度、允许更大学习率、有轻微正则效应，加速只是最显眼的收益。"),
connection=("- **向前**：c2 的梯度是三种优化器的原料，c4~c7 的网络都靠本章组件训练；\n"
            "- **向后**：c7-l3 的混合精度与学习率调度是优化器章的工程续篇；\n"
            "- **平行**：llm-a1 c6 的 LayerNorm/RMSNorm 与本节 LN 是同一机制的两种深度。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 优化器 | SGD → Momentum(惯性) → RMSProp(自适应) → Adam(双矩) → AdamW(解耦衰减) |\n"
         "| 正则 | L2 压权重、Dropout 冗余化、早停守泛化拐点 |\n"
         "| Dropout | 训练随机置零×1/(1-p)，推理恒等（Inverted） |\n"
         "| BN | 按 batch 维切片：CV 友好，小 batch/序列失效 |\n"
         "| LN/RMSNorm | 按特征维切片：NLP 默认；RMS 省均值 |"),
)

T4 = dict(
name="c4 卷积神经网络与计算机视觉",
why=("一张 224×224×3 的图接 1000 个神经元的全连接层要 1.5 亿参数——全连接对图像是灾难。"
     "卷积用「局部连接+权值共享」两条先验把参数砍到千分之一，还免费获得平移等变性。"
     "尺寸黄金公式与感受野递推是网络设计的算术基础：为什么 VGG 用两个 3×3 堆叠代替 5×5、"
     "为什么 ResNet 的跳连能救百层网络，都能用这两把算尺算出来。"),
intuition=("卷积核是一支「小手电」：3×3 的灯罩扫过全图，走到哪照到哪，一支手电（一组权重）"
           "只认一种纹理——这就是权值共享。池化是「缩小地图只留要点」：max pooling 每 2×2 "
           "只留最亮的一个。感受野是「这个神经元见过多少原图」：两层 3×3 堆叠看到的范围与"
           "一层 5×5 相同，但参数 18 vs 25 更少、还多一次非线性——VGG 的账就是这么算的。"),
code='''import numpy as np
rng = np.random.default_rng(0)

def conv2d(img, kernel, pad=0, stride=1):
    k = kernel.shape[0]
    if pad:
        img = np.pad(img, pad)
    Ho = (img.shape[0] - k) // stride + 1
    Wo = (img.shape[1] - k) // stride + 1
    out = np.zeros((Ho, Wo))
    for i in range(Ho):
        for j in range(Wo):
            out[i, j] = (img[i * stride:i * stride + k, j * stride:j * stride + k] * kernel).sum()
    return out

# ---- 1. 尺寸黄金公式 + Sobel 边缘 ----
img = np.zeros((8, 8)); img[2:6, 2:6] = 1.0
sx = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], float)
edge = conv2d(img, sx)
print(f"尺寸: (8+2*0-3)/1+1 = {edge.shape[1]} | 垂直边缘响应第3行: {np.round(edge[3], 1)}")
print(f"same 输出: pad=1 -> {(8 + 2*1 - 3) + 1}")

# ---- 2. 参数量对比 ----
print(f"全连接 784->1024: {784 * 1024:,} 参数 | 卷积 3x3x1x32: {3 * 3 * 1 * 32 + 32:,} 参数")

# ---- 3. 感受野递推: RF += (k-1)*jump; jump *= s ----
rf, jump = 1, 1
print("层  核   感受野  jump")
for i, (k, s) in enumerate([(3, 1), (3, 1), (2, 2), (3, 1), (3, 1), (2, 2)]):
    rf += (k - 1) * jump; jump *= s
    print(f"L{i+1}  {k}x{k}  {rf:3d}    {jump}")

# ---- 4. 两个 3x3 vs 一个 5x5 ----
print(f"堆叠 3x3: 参数 {18:,} + 2 次非线性 | 单个 5x5: 参数 {25:,} + 1 次非线性")
print("max pool 2x2:", np.arange(16).reshape(4, 4).reshape(2, 2, 2, 2).max(axis=(1, 3)).tolist())''',
expected=("valid 卷积 8->6，same(pad=1)->8；垂直边缘响应第 3 行 [4,4,0,0,-4,-4]（左右白块边缘对称响应）；"
        "全连接 802,816 参数 vs 卷积 320 参数（2500 倍差距）；感受野递推 3→5→6→10→14→16（jump 1→4）；"
        "堆叠 3x3 参数 18+2 次非线性 vs 单个 5x5 参数 25+1 次；max pool 2x2: [[5,7],[13,15]]"),
cerr=("黄金公式忘记加 1（输出尺寸差一列）；same padding 只在一侧补（应该两侧各补 k//2）；"
      "把感受野算成「核尺寸乘层数」而忽略步长对 jump 的放大，深层网络误差滚雪球。"),
miscon=("1. **卷积核越大越好**——大核参数指数涨且易过拟合；堆叠小核同感受野下参数更少、非线性更多；\\n"
        "2. **池化是必须的**——GAP 与 stride-2 卷积都能替代；max pooling 的「位置不敏感」既是抗噪也是信息损失；\\n"
        "3. **感受野=理论视野=实际依赖**——有效感受野（ERF）实测集中在中心高斯区，远小于理论值，设计需留冗余。"),
connection=("- **向前**：c1 的激活函数在每层卷积后工作，c3 的正则化（Dropout）同样适用于全连接头；\n"
            "- **向后**：c5 的 RNN 处理卷积不擅长的不定长序列，c7 的注意力是「全局感受野」的终极形态；\n"
            "- **平行**：paper-vision 课程的 ViT 把本节的局部先验换成了全局注意力先验。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 两大先验 | 局部连接 + 权值共享（→平移等变性） |\n"
         "| 黄金公式 | out = (n + 2p - k)/s + 1 |\n"
         "| 感受野 | RF += (k-1)·jump；jump *= s |\n"
         "| VGG 哲学 | 两个 3×3 ≈ 一个 5×5 感受野，参数 18<25、非线性 +1 |\n"
         "| 池化 | max 保显著响应；GAP 替代展平接全连接 |"),
)

GOALS = {
"deep-learning-c3-l1": ("1. 解释鞍点与病态曲率为什么（而非局部极小值）是高维优化的主要障碍；\n"
                        "2. 复述 SGD→Momentum→AdaGrad→RMSProp→Adam 的每一步「新增记忆」；\n"
                        "3. 说明 AdamW 与 Adam+L2 的区别（解耦权重衰减）及大模型选 AdamW 的理由。"),
"deep-learning-c3-l2": ("1. 说明过拟合的判据（train/val 分叉）与三种武器的适用时机；\n"
                        "2. 推导 Inverted Dropout 的期望保持缩放 1/(1-p) 并解释与经典 Dropout 的区别；\n"
                        "3. 用 numpy 实现 Dropout 前向并说明训练/推理两套行为。"),
"deep-learning-c3-l3": ("1. 画出 BN 与 LN 的切片方向差异（batch 维 vs 特征维）并解释各自适用的数据形态；\n"
                        "2. 列出 BN 在小 batch、变长序列、分布式下的三大死穴；\n"
                        "3. 写出 RMSNorm 公式并说明相对 LN 省掉了什么、为什么 LLaMA 世代选它。"),
"deep-learning-c4-l1": ("1. 用参数量对比论证全连接在图像上的不可行性（1.5 亿 vs 数千）；\n"
                        "2. 应用黄金公式 out=(n+2p-k)/s+1 计算多层卷积的输出尺寸（valid/same）；\n"
                        "3. 用 numpy 实现 2D 卷积并跑 Sobel 边缘提取，说明权值共享的含义。"),
"deep-learning-c4-l2": ("1. 对比 max pooling 与 GAP 的机制、可学习参数与信息保留策略；\n"
                        "2. 推导感受野递推公式 RF+=(k-1)·jump、jump·=s 并完成一个 6 层网络的手算；\n"
                        "3. 从参数量与非线性次数两方面论证「两个 3×3 优于一个 5×5」。"),
}
PREREQS = {
"deep-learning-c3-l1": "- c2 的反向传播与梯度概念；\n- 指数加权平均的直觉（可选）。",
"deep-learning-c3-l2": "- c2-l1 的 MLP 前向；\n- 训练/验证集划分的常识。",
"deep-learning-c3-l3": "- c2 的批处理形状 (B,F)；\n- 均值/方差的定义。",
"deep-learning-c4-l1": "- c1-l3 的激活函数；\n- c2-l1 的批处理与形状追踪。",
"deep-learning-c4-l2": "- 「卷积的数学本质」（c4-l1）的黄金公式。",
}

if len(sys.argv) > 1 and sys.argv[1] == "verify":
    lib.verify_codes({"deep-learning-c3": T3, "deep-learning-c4": T4}, GOALS)
elif T3["expected"] == "" or T4["expected"] == "":
    lib.verify_codes({"deep-learning-c3": T3, "deep-learning-c4": T4}, GOALS)
else:
    CIDS = {"deep-learning-c3-l1": T3, "deep-learning-c3-l2": T3, "deep-learning-c3-l3": T3,
            "deep-learning-c4-l1": T4, "deep-learning-c4-l2": T4}
    REFS = {k: (REF3 if "c3" in k else REF4) for k in CIDS}
    for lid, t in CIDS.items():
        MD = build_md(lib.orig_content(lid), GOALS[lid], PREREQS[lid], t["why"], t["intuition"],
                      t["code"], t["expected"], t["cerr"], t["miscon"], t["connection"], t["summary"], REFS[lid])
        lib.patch_lesson(lid, MD)
    finish(lib)
