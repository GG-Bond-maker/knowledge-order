# -*- coding: utf-8 -*-
"""batch36 B 组：paper-vision《视觉架构》5 节升级（TS 源，_batch34_lib 模式）。
用法：python batch36_paper_vision.py verify -> 跑章代码看输出
     python batch36_paper_vision.py         -> 打补丁
"""
from _batch34_lib import Lib, build_md, finish
import sys

lib = Lib("paper-vision", [
    "src/content/chapters/paper-vision.ts",
    "src/content/chapters/paper-vision2.ts",
    "src/content/chapters/paper-vision3.ts",
    "src/content/chapters/paper-vision4.ts",
    "src/content/chapters/paper-vision5.ts",
])

C1 = dict(
name="c1 AlexNet：深度学习的引爆点",
why=("2012 年前视觉是手工特征（SIFT/HOG）+分类器的天下——「识别猫需要什么特征」没人说得清，"
     "人的想象力就是模型的上限。AlexNet 在 ImageNet 上一口气把 Top-5 错误率砍掉 10 个点（26.2%→15.3%），"
     "靠的不是单一算法突破，而是数据（120 万张）、算力（GPU 512 核）、算法（ReLU+Dropout）三条件同时成熟，"
     "加上「端到端学特征」的范式替换。此后特征工程师退场，深度学习进场。"),
intuition=("传统视觉像「师傅带徒弟」：人先把猫耳、胡须总结成规则（SIFT/HOG），分类器只做最后判断。"
           "AlexNet 像「放羊式教育」：只给题目和答案（图与标签），让 8 层网络自己摸索——第一层摸出边缘条纹"
           "（和 SIFT 撞车），第三层之后摸出轮子、眼睛这些人类从未写进规则的特征。机器终于超过了出题人的想象力。"),
code='''def conv_out(in_, k, pad, stride): return (in_ + 2*pad - k)//stride + 1
def cparams(cin, cout, k): return (k*k*cin + 1) * cout
s1 = conv_out(224, 11, 2, 4); p1 = conv_out(s1, 3, 0, 2)
p2 = conv_out(conv_out(p1, 5, 2, 1), 3, 0, 2)
p3 = conv_out(conv_out(p2, 3, 1, 1), 3, 0, 2)
tot_c = sum(cparams(c, o, k) for c, o, k in [(3,96,11),(96,256,5),(256,384,3),(384,384,3),(384,256,3)])
tot_f = 9216*4096 + 4096 + 4096*4096 + 4096 + 4096*1000 + 1000
print(f"特征图: 224 -> {s1} -> {p1} -> {p2}(conv2+pool) -> ... -> {p3}x256, flatten={p3*p3*256}")
print(f"卷积参数 {tot_c/1e6:.2f}M ({tot_c/(tot_c+tot_f):.1%}) vs 全连接 {tot_f/1e6:.2f}M ({tot_f/(tot_c+tot_f):.1%})")''',
expected=("实测：特征图 224→55→27→13（conv2+pool）→…→6×6×256（flatten=9216），逐层符合 "
          "out=⌊(in+2pad-k)/stride⌋+1；卷积层参数合计 3.75M（6.0%），全连接 58.63M（94.0%）——"
          "参数几乎全在分类头，这正是后来 ResNet 用 GAP 替代 FC 的动机。"),
cerr=("尺寸公式先减 k 后加 2·pad 或漏取整，逐层推导步步错；inverted dropout 在推理时又缩放一次"
      "（训练已除以 1-p，推理不缩放）；把双 GPU 拆分当算法创新——那是显存不够的工程妥协。"),
miscon=("1. **AlexNet 赢在算法**——数据/算力/算法三条件缺一不可，单有算法 2010 年也引爆不了；\n"
        "2. **ReLU 无缺点**——dying ReLU：输入恒负的神经元梯度恒 0 永久死亡，Leaky/PReLU/GELU 是补救；\n"
        "3. **LRN 是重要组件**——只涨 1~2 个点，已被 BatchNorm 取代，今天无需复刻。"),
connection=("- **向前**：卷积操作与反向传播是本节的预备知识；\n"
            "- **向后**：FC 参数占比过高直接催生 c2 ResNet 的 GAP+Bottleneck；尺寸/参数公式在 c5 系统化；\n"
            "- **平行**：GPU 工程化延续到 paper-training c2 的流水线并行。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 范式 | 手工特征 → 端到端学特征 |\n"
         "| 三条件 | ImageNet 120 万张 + GPU 512 核 + ReLU/Dropout |\n"
         "| 尺寸公式 | out=⌊(in+2pad-k)/stride⌋+1 |\n"
         "| 参数分布 | 全连接 58.6M(94%) vs 卷积 3.7M(6%) |\n"
         "| 遗产 | ReLU 标配化、GPU 必需、GAP 动机 |"),
ref="本课程整理（可参见论文原文：Krizhevsky, Sutskever & Hinton, ImageNet Classification with Deep Convolutional Neural Networks, arXiv:1207.0580）",
)

C2 = dict(
name="c2 ResNet：用残差连接突破深度极限",
why=("2014 年的共识是「越深越好」，但何恺明发现 56 层网络的训练误差反而比 20 层高——不是过拟合"
     "（训练误差本身就高），是退化：深层网络连「恒等映射」都学不动（让权重精确等于单位矩阵太难）。"
     "ResNet 把要学的函数改写成 F(x)=H(x)-x：想恒等就让 F=0（权重全零即可）。加上 ∂y/∂x=∂F/∂x+1 的"
     "梯度高速公路，152 层可训练，ImageNet 错误率 3.57% 超过人类。残差连接此后成为一切深 architectures 的标配。"),
intuition=("空降 36 个新员工还要求「公司业绩不能变差」：最稳的新员工表现是「什么都不做」。普通网络的新层"
           "必须精确学会「什么都不做」（恒等=单位矩阵，难）；残差网络的新层默认什么都不做（输出 0），"
           "有需要再学增量——把「证明自己有用」的举证责任反转，深度才从负担变成资产。"),
code='''import numpy as np
rng = np.random.default_rng(13)
L, d = 30, 8
W = [rng.normal(0, 0.5, (d, d)) for _ in range(L)]
x0 = rng.normal(0, 1, d); target = rng.normal(0, 1, d)
def loss(x, residual):
    h = x
    for l in range(L):
        h = np.tanh(h @ W[l]) + (h if residual else 0)   # 残差: 输出 = F(x) + x
    return float(((h - target)**2).sum())
def grad_norm(residual, eps=1e-5):
    g = np.zeros(d)
    for i in range(d):
        e = np.zeros(d); e[i] = eps
        g[i] = (loss(x0 + e, residual) - loss(x0 - e, residual)) / (2*eps)
    return float(np.linalg.norm(g))
for res in (False, True):
    print(f"{'残差' if res else '普通'}网络: 30 层后第 1 层输入梯度范数 = {grad_norm(res):.3e}")''',
expected=("实测：同样 30 层 tanh 堆叠，普通网络第 1 层输入的（有限差分）梯度范数 9.454e-02，"
          "残差版 6.412e+02——相差近四个数量级。「+1 直通」让梯度穿过 30 层仍有信号，这就是梯度高速公路。"),
cerr=("下采样处 F(x) 与 x 通道数不一致直接相加报错——要用 1×1 投影捷径（且只在必要时用，论文方案 B）；"
      "在残差捷径上加激活或门控——捷径上任何变换都伤梯度流（c3 详述）；把残差当正则化——它治退化和梯度流，不治过拟合。"),
miscon=("1. **残差=更宽的层**——它是加法捷径重构的学习目标（学 F=H-x），不是宽度问题；\n"
        "2. **越深一定越好**——无残差的深网先退化，残差才让深度重新变成资产；\n"
        "3. **Bottleneck 省参数是魔法**——1×1 先降到 C/4、3×3 在低维做，纯算术账（18C²→1.81C²）。"),
connection=("- **向前**：c1 的 ReLU/BN/尺寸公式是本节地基；\n"
            "- **向后**：c3 预激活把「捷径纯净性」推到底；Pre-LN Transformer 同源；\n"
            "- **平行**：LSTM 细胞状态的加法路径、paper-reasoning c4 RMC 的记忆残差。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 退化 | 56 层训练误差反而更高（非过拟合） |\n"
         "| 核心式 | y=F(x)+x；恒等=F=0（易学） |\n"
         "| 梯度 | ∂y/∂x=∂F/∂x+1 高速公路（实测差 4 个量级） |\n"
         "| 账本 | BasicBlock 18C² vs Bottleneck 1.81C² |\n"
         "| 战绩 | ResNet-50 参数比 VGG-16 少 5 倍、错误率低 2 点 |"),
ref="本课程整理（可参见论文原文：He et al., Deep Residual Learning for Image Recognition, arXiv:1512.03385）",
)

C3 = dict(
name="c3 ResNet v2：让恒等映射真正恒等",
why=("原版 ResNet 的「恒等捷径」其实不纯净：y=ReLU(F(x)+x)——加法之后还有 ReLU，负值被截断，"
     "深网中捷径的 +1 会被反复削掉。ResNet v2 把 BN/ReLU 全部移到卷积之前（预激活），捷径变成字面意义的 "
     "y=x：+1 永不截断，1001 层也能训练（原版 1000 层直接崩），CIFAR-10 错误率 4.92%。同一思想在 "
     "Transformer 里就是 Pre-LN——GPT-2 之后的标配。"),
intuition=("传话游戏 vs 接力赛：原版每传一手都有人「过滤」一下（加法后的 ReLU 截负），传上千手信息面目全非；"
           "预激活是接力赛——接力棒（主干信号）原样传递，每站的「加工」（BN+ReLU+Conv）都在旁路完成，"
           "最后把增量轻轻放回接力棒。配合 zero-init 技巧（残差支末端 BN 的 γ 置 0），网络起步即恒等、稳步学增量。"),
code='''import numpy as np
rng = np.random.default_rng(14)
L, d = 60, 16
W = [rng.normal(0, 0.4, (d, d)) for _ in range(L)]
def run(pre):
    x = rng.normal(0, 1, d); hist, dead = [x.std()], 0
    for l in range(L):
        f = np.tanh(W[l] @ x)
        x = x + f if pre else np.maximum(x + f, 0)   # 预激活: 纯恒等捷径
        hist.append(x.std()); dead += float(np.mean(x == 0))
    return hist, dead / L
for pre in (False, True):
    hist, dead = run(pre)
    print(f"{'预激活' if pre else '原版(加法后ReLU)':>10}: 末层信号 std={hist[-1]:.3f} | 平均死单元 {dead:.0%}")''',
expected=("实测：60 层堆叠下，原版（加法后 ReLU）平均 8% 的分量被截成永久为 0 的死单元，末层信号 std 萎缩"
          "至 2.895；预激活版死单元 0%、信号 std=7.071——「接力棒原样传递」在数字上直接可见。"),
cerr=("zero-init 用错位置——只把残差分支最后一个 BN 的 γ 置 0，全部置 0 会连主干信息一起丢；"
      "预激活网络末端忘补 BN+ReLU 再接分类头；把 Pre-LN 的稳定归功于 LayerNorm 本身——关键在恒等捷径不被打断。"),
miscon=("1. **预激活只是换个顺序**——它恢复的是「字面恒等」的捷径，深层（>100 层）差异显著；\n"
        "2. **原版 ResNet 是错的**——浅层（<100 层）下 ReLU 极少截断，两者差异不大，原版依然伟大；\n"
        "3. **Pre-LN/Post-LN 之争与 ResNet 无关**——同一问题在 Transformer 的重演，GPT-2 选 Pre-LN 即本思想。"),
connection=("- **向前**：c2 的「+1 高速公路」在此被完整保全；\n"
            "- **向后**：GPT-2/ViT 的 Pre-LN、zero-init 技巧在微调初始化中延续；\n"
            "- **平行**：paper-training c3 PPO 的「防过冲」同为保训练稳定的工程。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 病灶 | y=ReLU(F+x)：加法后的 ReLU 截断捷径 |\n"
         "| 药方 | 预激活 x_{l+1}=x_l+F(BN(ReLU(x_l))) |\n"
         "| 战绩 | 1001 层可训练，CIFAR-10 4.92% |\n"
         "| 实测 | 原版死单元 8% vs 预激活 0% |\n"
         "| 现代 | Pre-LN Transformer 同源 |"),
ref="本课程整理（可参见论文原文：He et al., Identity Mappings in Deep Residual Networks, arXiv:1603.05027）",
)

C4 = dict(
name="c4 空洞卷积：不降分辨率也能扩大感受野",
why=("语义分割要求「像素级精度」与「大感受野」同时成立：池化下采样换感受野，却把边界信息丢掉，"
     "插值上采样救不回来。空洞卷积在 3×3 核里插「洞」：参数仍是 9 个，dilation=2 感受野即 5×5；"
     "按 1,2,4,…,2^L 递增堆叠，7 层感受野 255×255（标准 3×3 需 127 层），分辨率全程不降。"
     "DeepLab 的 ASPP 并行多 dilation 捕获多尺度，WaveNet 用因果空洞卷积生成音频。"),
intuition=("观察一幅壁画：凑太近（小感受野）只见笔触，退太远（下采样）细节糊成一片。空洞卷积像"
           "「隔着玻璃上的洞看画」：眼睛不动（参数不变），把洞的间距拉大（dilation），一眼扫过更大范围，"
           "且每个像素仍在原位——分辨率与视野第一次兼得。"),
code='''import numpy as np
def coverage(dilations, size=33):
    touched = {size // 2}
    for d in reversed(dilations):
        touched = {i + off for i in touched for off in (-d, 0, d) if 0 <= i + off < size}
    return touched
for name, dil in (("递增 1,2,4,8", [1, 2, 4, 8]), ("恒定 2,2,2,2", [2, 2, 2, 2])):
    t = coverage(dil)
    print(f"{name}: 感受野 {max(t)-min(t)+1} 格, 覆盖 {len(t)}/{max(t)-min(t)+1} ({len(t)/(max(t)-min(t)+1):.0%})")
print("恒定 dilation 只采样偶数位 -> 网格效应; 递增序列覆盖连续区域")''',
expected=("实测：递增 dilation [1,2,4,8] 的中心输出可覆盖输入 ±15 的全部 31 格（100%）；恒定 [2,2,2,2] "
          "名义感受野 17 格但只触到 9 格（53%）——恒定 dilation 只采样偶数位，产生网格伪影；"
          "递增序列的偏移集合 {±1,±2,±4,±8} 恰好拼出全部整数，连续覆盖。"),
cerr=("连续多层用同一个 dilation，网格伪影出现还怪模型不行；只算参数量不算内存访问——大 dilation 的"
      "访存模式不友好会拖慢实际速度；为了「全程不降分辨率」连全局池化也删掉，全局上下文反而没了。"),
miscon=("1. **空洞卷积参数变多**——参数仍是 k² 个，变大的只是感受野；\n"
        "2. **dilation 越大越好**——大 dilation 会跳过小物体，需与 ASPP 多尺度并行配合；\n"
        "3. **它能完全替代池化**——分类任务下采样依旧高效，空洞卷积的主场是密集预测与长序列。"),
connection=("- **向前**：c5 的感受野累加公式是本节的计算工具；\n"
            "- **向后**：DeepLab v3+ 的 ASPP、WaveNet 的因果空洞卷积；\n"
            "- **平行**：c2 残差块 + 空洞卷积 = 现代分割网络标配组合。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 两难 | 要感受野→下采样→丢分辨率 |\n"
         "| 机制 | 核内插洞：9 参数，dilation=d 感受野 2d+1 |\n"
         "| 增长 | 递增 1,2,4,…：7 层 RF=255（标准需 127 层） |\n"
         "| 实测 | 递增覆盖 100% vs 恒定 53%（网格效应） |\n"
         "| 应用 | DeepLab ASPP、WaveNet |"),
ref="本课程整理（可参见论文原文：Yu & Koltun, Multi-Scale Context Aggregation by Dilated Convolutions, arXiv:1511.07122）",
)

C5 = dict(
name="c5 CS231n：卷积的第一性原理",
why=("论文告诉你「用 3×3 卷积」，CS231n 告诉你卷积到底是什么、输出多大、参数几个、怎么算快、梯度怎么传。"
     "第一性原理式的拆解让你不依赖框架魔法：手推输出尺寸公式、理解参数共享（参数量与输入尺寸无关）、"
     "看清 im2col 把卷积变成 GEMM 的工程本质（快 10-100 倍的来源）、以及「卷积的反向也是卷积」。"
     "这是读一切视觉论文前的工具课。"),
intuition=("卷积是个「盖章工人」：拿着同一枚印章（参数共享）在图的每个位置盖一下（滑窗）。im2col 是"
           "「备料台」：把每个待盖位置裁成小片摆成一摞（矩阵的列），盖章变成一次大盖章（矩阵乘法）——"
           "批量交给 BLAS 流水线，速度天差地别。"),
code='''import numpy as np
def conv_naive(x, w, stride=1, pad=0):
    C, H, W_ = x.shape; Co, Ci, k, _ = w.shape
    Ho = (H + 2*pad - k)//stride + 1
    xp = np.pad(x, ((0,0),(pad,pad),(pad,pad)))
    out = np.zeros((Co, Ho, Ho))
    for o in range(Co):
        for i in range(Ho):
            for j in range(Ho):
                out[o,i,j] = (xp[:, i*stride:i*stride+k, j*stride:j*stride+k] * w[o]).sum()
    return out
def conv_im2col(x, w, stride=1, pad=0):
    C, H, W_ = x.shape; Co, Ci, k, _ = w.shape
    Ho = (H + 2*pad - k)//stride + 1
    xp = np.pad(x, ((0,0),(pad,pad),(pad,pad)))
    cols = np.zeros((Ci*k*k, Ho*Ho))
    for i in range(Ho):
        for j in range(Ho):
            cols[:, i*Ho+j] = xp[:, i*stride:i*stride+k, j*stride:j*stride+k].ravel()
    return (w.reshape(Co, -1) @ cols).reshape(Co, Ho, Ho)
x = np.arange(72.).reshape(2, 6, 6); w = np.random.default_rng(15).normal(0, 1, (3, 2, 3, 3))
print("尺寸公式: (6+0-3)//1+1 =", (6+0-3)//1+1)
print("朴素与 im2col 一致:", bool(np.allclose(conv_naive(x, w), conv_im2col(x, w))))''',
expected=("实测：6×6 输入、3×3 核、无 padding 的输出尺寸 (6-3)/1+1=4；朴素三重循环与 im2col+GEMM 的结果"
          "逐元素一致（allclose=True）——卷积的计算本质是矩阵乘法，框架的加速来自 BLAS/cuBLAS。"),
cerr=("pad 计算漏掉两侧（应为 2·pad）；im2col 展开时行列顺序弄混，reshape 后整体错位；"
      "以为 1×1 卷积无用——它是 Bottleneck 降维与跨通道融合的关键。"),
miscon=("1. **深度学习的卷积=数学卷积**——实为互相关（核不翻转），因核可学习二者等价；\n"
        "2. **im2col 无代价**——它复制 k² 倍内存，大 kernel 时框架改用 FFT/Winograd；\n"
        "3. **池化必须 Max**——分类头如今用 GlobalAvgPool，下采样常用 stride=2 卷积替代。"),
connection=("- **向前**：c1 的逐层推导已用到本节的尺寸与参数公式；\n"
            "- **向后**：Bottleneck 的 1×1 降维（c2）、空洞卷积的 RF 扩展（c4）都建立在它之上；\n"
            "- **平行**：im2col→GEMM 与 GPU 训练（c1 条件二）同属工程根基。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 卷积 | out[i,j]=Σx·w+b（互相关，核不翻转） |\n"
         "| 尺寸 | ⌊(in+2pad-k)/stride⌋+1 |\n"
         "| 参数 | (k²·C_in+1)·C_out，与输入尺寸无关 |\n"
         "| 加速 | im2col→GEMM，实测与朴素一致 |\n"
         "| 反向 | dx=转置卷积，dw=卷积 |"),
ref="本课程整理（可参见 CS231n 课程笔记 Convolutional Neural Networks 与 LeNet/AlexNet 论文原文）",
)

THEMES = {
    "paper-vision-c1": C1, "paper-vision-c2": C2, "paper-vision-c3": C3,
    "paper-vision-c4": C4, "paper-vision-c5": C5,
}

GOALS = {
"paper-vision-c1-l1": ("1. 说明手工特征工程的天花板与「数据/算力/算法」三条件为何缺一不可；\n"
                       "2. 熟练用 out=⌊(in+2pad-k)/stride⌋+1 推导 AlexNet 逐层特征图尺寸，"
                       "并计算参数量分布（全连接占 94%）；\n"
                       "3. 解释 ReLU（导数恒 1 防梯度消失，代价 dying ReLU）、inverted Dropout（保持期望）"
                       "与数据增强的原理与代价。"),
"paper-vision-c2-l1": ("1. 用「56 层训练误差更高」区分退化与过拟合，说明为什么权重难拟合恒等映射而容易拟合零；\n"
                       "2. 写出 y=F(x)+x 与 ∂y/∂x=∂F/∂x+1，解释梯度高速公路及其与 LSTM 细胞状态的同源性；\n"
                       "3. 对比 BasicBlock（18C²）与 Bottleneck（1.81C²）的参数账，"
                       "并用数值实验验证残差连接的梯度流优势。"),
"paper-vision-c3-l1": ("1. 指出原版捷径 y=ReLU(F(x)+x) 中 ReLU 对 +1 通路的截断风险，"
                       "复述捷径变换实验的排序（恒等最优）；\n"
                       "2. 写出预激活公式 x_{l+1}=x_l+F(BN(ReLU(x_l)))，说明为何 +1 永不被截断，"
                       "以及 zero-init γ 技巧的用法；\n"
                       "3. 用信号传播模拟对比 60 层下的死单元比例与信号 std，理解深层可训练性差异。"),
"paper-vision-c4-l1": ("1. 陈述「分辨率 vs 感受野」两难与 FCN 上采样救不回细节的原因；\n"
                       "2. 用感受野公式计算递增 dilation 序列的指数增长（7 层 RF=255），"
                       "并解释网格效应的成因与解法；\n"
                       "3. 用覆盖集模拟对比递增与恒定 dilation 的采样覆盖率（100% vs 53%），"
                       "说出 ASPP 的多尺度并行思想。"),
"paper-vision-c5-l1": ("1. 手推输出尺寸与参数量公式，解释「参数量与输入尺寸无关」的参数共享含义；\n"
                       "2. 手写朴素卷积并用 im2col 验证一致性，说明卷积→GEMM 的加速来源与内存代价；\n"
                       "3. 计算多层堆叠的感受野（stride 放大后续层贡献），并说出卷积反向=转置卷积。"),
}

PREREQS = {
"paper-vision-c1-l1": "- 神经网络基础与反向传播；\n- 卷积操作的定义；\n- 过拟合概念。",
"paper-vision-c2-l1": "- 反向传播链式法则；\n- c1 的卷积尺寸与参数计算；\n- BatchNorm 的作用。",
"paper-vision-c3-l1": "- c2 的残差结构与梯度分析；\n- ReLU/BN 的作用位置；\n- Transformer 的残差+LayerNorm 结构。",
"paper-vision-c4-l1": "- c5 的感受野累加公式与卷积定义；\n- 语义分割任务形式；\n- c2 的残差块。",
"paper-vision-c5-l1": "- 矩阵乘法与张量切片；\n- 反向传播链式法则；\n- c1 的 AlexNet 逐层推导。",
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
