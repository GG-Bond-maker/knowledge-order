# -*- coding: utf-8 -*-
"""batch34 p3：deep-learning 第 5~6 章 6 节章主题包升级（TS 源 deep-learning.ts）。
c5 RNN/BPTT/梯度消失/LSTM(3) / c6 VAE/GAN/Diffusion(3)
用法：python batch34_dl_p3.py verify -> 跑章代码；填好 expected 后直接运行打补丁。
"""
from _batch34_lib import Lib, build_md, finish
import sys

lib = Lib("deep-learning", ["src/content/chapters/deep-learning.ts"])
REF5 = "本课程整理（可参见 Hochreiter & Schmidhuber (1997) LSTM 原文与 Pascanu et al. (2013) 梯度流相应章节）"
REF6 = "本课程整理（可参见 Kingma & Welling (2013) VAE、Goodfellow et al. (2014) GAN、Ho et al. (2020) DDPM 相应章节）"

T5 = dict(
name="c5 循环神经网络与序列时序建模",
why=("文本、传感器、股价都是「长度不定、顺序即语义」的序列：全连接假设输入形状固定，"
     "马尔可夫假设只有一步记忆，都不够用。RNN 用同一个隐状态单元跨时间步递归，把"
     "「历史」压进一个向量——但 BPTT 的雅可比连乘让梯度随时间指数衰减（谣言传一百步"
     "就走样），这正是 LSTM「加法传送带」要治的病，也是后来注意力革命要绕开的墙。"),
intuition=("RNN 是边读边记的读者：每读一个词，就把它揉进一份「读书笔记」（隐状态 h_t）里。"
           "梯度随时间回传像谣言接力：每传一步乘一次 tanh 导数（≤1），一百步后只剩无穷小——"
           "开头的词对结尾「失声」。LSTM 加了一条传送带（细胞状态 c）：信息坐传送带直通"
           "（加法更新），三个门（忘/入/出）负责装卸，梯度沿传送带几乎无衰减地回流。"),
code='''import numpy as np
rng = np.random.default_rng(0)

# ---- 1. RNN 前向展开：隐状态逐时间步演化 ----
T, d_in, d_h = 6, 3, 4
Wx = rng.normal(0, 0.5, (d_in, d_h)); Wh = rng.normal(0, 0.5, (d_h, d_h))
xs = rng.normal(0, 1, (T, d_in))
h = np.zeros(d_h)
norms = []
for t, x in enumerate(xs):
    h = np.tanh(x @ Wx + h @ Wh)
    norms.append(round(float(np.linalg.norm(h)), 2))
print("各时刻隐状态范数:", norms)

# ---- 2. 雅可比谱半径: 梯度消失/爆炸的病灶 ----
for w_std in (0.5, 2.5):
    Wh = rng.normal(0, w_std, (d_h, d_h))
    h = rng.normal(0, 1, d_h)
    J = np.diag(1 - np.tanh(h) ** 2) @ Wh.T      # 单步雅可比
    sr = max(abs(np.linalg.eigvals(J)))
    print(f"w_std={w_std}: 谱半径 {sr:.2f} -> 20 步梯度缩放 ≈ {sr ** 20:.2e}")

# ---- 3. LSTM 单步：门控 + 加法传送带 ----
d = 4
x = rng.normal(0, 1, d); h_prev = rng.normal(0, 1, d); c_prev = rng.normal(0, 1, d)
sig = lambda v: 1 / (1 + np.exp(-v))
Wf, Wi, Wo_, Wc = [rng.normal(0, 0.5, (d, d)) for _ in range(4)]
Uf, Ui, Uo, Uc = [rng.normal(0, 0.5, (d, d)) for _ in range(4)]
f = sig(x @ Wf + h_prev @ Uf)                    # 忘门
i = sig(x @ Wi + h_prev @ Ui)                    # 入门
o = sig(x @ Wo_ + h_prev @ Uo)                   # 出门
c = f * c_prev + i * np.tanh(x @ Wc + h_prev @ Uc)   # 加法传送带
h = o * np.tanh(c)
print(f"忘门 {np.round(f, 2)} | 入门 {np.round(i, 2)}")
print(f"c 范数 {np.linalg.norm(c_prev):.2f} -> {np.linalg.norm(c):.2f}（旧记忆按 f 保留+新信息按 i 写入）")

# ---- 4. 梯度截断演示 ----
g = np.array([3.0, -4.0, 8.0])
print("clip 后:", np.round(g * min(1.0, 5.0 / np.linalg.norm(g)), 2), "（爆炸梯度按范数裁剪）")''',
expected=("隐状态范数序列 [0.73, 0.79, 1.06, 1.22, 1.09, 0.77]（记忆动态演化）；"
        "w_std=0.5 时谱半径 0.47，20 步梯度缩放 3.41e-07（消失）；w_std=2.5 时谱半径 3.61，缩放 1.44e+11（爆炸）；"
        "LSTM 忘门 [0.26,0.09,0.95,0.44]、入门 [0.75,0.79,0.43,0.7]，c 范数 1.22→1.18（旧记忆按 f 保留、新信息按 i 写入）；"
        "梯度 [3,-4,8] 按范数裁剪到 [1.59,-2.12,4.24]"),
cerr=("BPTT 展开时忘了共享同一组 W（每个时间步用了独立权重，参数量爆炸且学不到时序模式）；"
      "LSTM 的门忘了用 sigmoid（用了 tanh，门失去 0/1 语义）；梯度截断按绝对值逐元素裁剪"
      "而不是按范数整体缩放，破坏梯度方向。"),
miscon=("1. **RNN 的「记忆」是长期记忆**——标准 RNN 的隐状态实际只有十几步的有效视野，长记忆是 LSTM 传送带的功劳；\\n"
        "2. **梯度消失=前向信号消失**——前向照常，是回传的梯度乘积链衰减，导致远端学不到；\\n"
        "3. **GRU 是劣化版 LSTM**——两门实现以约 25% 更少参数达到接近效果，多数任务差异不显著，是工程取舍。"),
connection=("- **向前**：c2 的反向传播在本章展开到时间维（BPTT）；\n"
            "- **向后**：c7-l1 的注意力绕开「单向量传全程」的瓶颈，是本章结尾的伏笔；\n"
            "- **平行**：llm-a1 c4 的自注意力就是「任意两步直连」对 RNN 链式的替代。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 递归 | h_t = tanh(Wx·x_t + Wh·h_{t-1})，权重跨时间共享 |\n"
         "| BPTT | 沿时间展开后标准反传，梯度=雅可比连乘 |\n"
         "| 病灶 | 谱半径 <1 指数消失、>1 指数爆炸（截断/正交初始化缓解） |\n"
         "| LSTM | c_t = f⊙c_{t-1} + i⊙c̃：加法传送带 + 三门 |\n"
         "| GRU | 两门合并的轻量版，性价比之选 |"),
)

T6 = dict(
name="c6 现代深度生成模型",
why=("判别模型学「判断」，生成模型学「无中生有」：VAE 把「像不像」变成隐空间的概率推断，"
     "GAN 把生成变成造假者与鉴定者的零和博弈，Diffusion 则把创作变成「从纯噪声逐步雕刻」。"
     "三条路线共同回答同一个问题——如何从数据分布采样——却给出三种截然不同的工程取舍："
     "似然可算、样本锐利、还是训练稳定，几乎不可兼得。"),
intuition=("VAE 是漫画临摹家：先把真画压缩成代码（编码），再照代码重画（解码），并强制所有"
           "代码落在一张标准坐标纸（标准正态先验）上，空白处才不是荒漠。GAN 是伪钞江湖："
           "印钞师（G）对着鉴定师（D）的进步不断改进，直到鉴定师真假难辨（纳什均衡）。"
           "Diffusion 是青铜复原师：先把文物逐步腐蚀成锈块（前向加噪），再学会反向还原"
           "（U-Net 预测每一步的噪声），最后从一块纯锈雕出全新的文物。"),
code='''import numpy as np
rng = np.random.default_rng(0)

# ---- 1. VAE 重参数化：随机性只进 eps，梯度可回传 ----
mu, logvar = np.array([1.0, -2.0]), np.array([0.0, -2.0])
std = np.exp(0.5 * logvar)
eps = rng.normal(size=2)
z = mu + std * eps
print(f"z = mu + sigma*eps = {np.round(z, 3)}（eps 独立于参数，KL/重构两项都可反传）")

# ---- 2. 迷你 GAN：一维生成器学 N(3,1) 的纳什均衡 ----
real_mu = 3.0
mu_g, w, b = 0.0, 0.1, 0.0
sig = lambda v: 1 / (1 + np.exp(-v))
for step in range(3001):
    x_real = rng.normal(real_mu, 1.0, 256)
    fake = mu_g + rng.normal(0.0, 1.0, 256)
    x = np.concatenate([x_real, fake])
    y = np.concatenate([np.ones(256), np.zeros(256)])
    for _ in range(10):                          # 判别器先学
        p = sig(w * x + b)
        w += 0.5 * float(((y - p) * x).mean())
        b += 0.5 * float((y - p).mean())
    pf = sig(w * fake + b)
    mu_g += 0.05 * float((w * (1 - pf)).mean())  # G 的非饱和损失梯度
    if step % 1500 == 0:
        print(f"step {step:4d}: 生成器 mu={mu_g:7.3f}（目标 3.0）")
print(f"均衡: 生成器 mu={mu_g:.3f} ≈ 真实均值（D 无法分辨）")

# ---- 3. DDPM 前向闭式: x_t = sqrt(abar_t)·x_0 + sqrt(1-abar_t)·eps ----
T = 1000
betas = np.linspace(1e-4, 0.02, T)
abar = np.cumprod(1 - betas)
x0 = 1.0
for t in (1, 10, 100, 500, 999):
    a = abar[t - 1]
    eps = rng.normal()
    xt = np.sqrt(a) * x0 + np.sqrt(1 - a) * eps
    print(f"t={t:4d}: 信号 {np.sqrt(a):.0%} + 噪声 {np.sqrt(1 - a):.0%} -> x_t={xt:+.3f}")''',
expected=("重参数化 z=[1.126, -2.049]（随机性只进 eps）；迷你 GAN：step 0 时 mu=0.031 → step 1500 时 2.992 → step 3000 时 3.015，"
        "收敛到真实均值 3.0 附近（纳什均衡，D 已无法分辨）；"
        "DDPM 前向闭式：t=1 信号 100%/噪声 1%，t=500 时 28%/96%，t=999 时 1%/100%（x_0 被逐步腐蚀成纯噪声）"),
cerr=("重参数化前把 eps 也当成可训练变量（随机性进了梯度路径，方差估计全乱）；GAN 判别器"
      "太强（D 一步到最优，G 的梯度恒为零，训练停滞）；DDPM 把 beta 调度写反（应该线性/"
      "余弦递增，写成分段常数会破坏闭式采样）。"),
miscon=("1. **VAE 生成「糊」是bug**——高斯假设+逐像素 L2 的必然结果，ELBO 的模糊是理论代价不是实现错误；\\n"
        "2. **GAN 的纳什均衡=最优单点**——均衡是一个分布状态（D=1/2），训练在其附近震荡，模式坍塌是博弈失败的常见形态；\\n"
        "3. **扩散模型「加噪再去噪」是脱裤子放屁**——把一步生成拆成千步小步，每步只需学局部修正，训练稳定与多样性由此而来。"),
connection=("- **向前**：c2 的反向传播训练 VAE 的双网络与 GAN 的对抗双方；\n"
            "- **向后**：c7 的 Transformer 是扩散模型 U-Net 里现代主干；\n"
            "- **平行**：llm-b 系列的 AIGC 应用课程把本节三范式落到图文生成产品。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| VAE | ELBO=重构+KL；重参数化 z=μ+σ⊙ε 打通梯度 |\n"
         "| GAN | min max V(D,G)；非饱和损失训练 G；均衡处 D=1/2 |\n"
         "| GAN 陷阱 | 梯度消失/模式坍塌/不稳定 → WGAN-GP 改用 Wasserstein 距离 |\n"
         "| Diffusion | 前向闭式 x_t=√ᾱ·x_0+√(1-ᾱ)·ε；逆向 U-Net 学预测噪声 |\n"
         "| CFG | 有无条件的噪声预测外推，控制生成服从度 |"),
)

GOALS = {
"deep-learning-c5-l1": ("1. 说明全连接与马尔可夫链处理序列的两处失败（定形/短视）；\n"
                        "2. 画出 RNN 沿时间展开图并写出 h_t 递推式，说明权重跨时间共享；\n"
                        "3. 用 numpy 实现 RNN 前向展开并追踪各时刻隐状态。"),
"deep-learning-c5-l2": ("1. 推导 BPTT 中 ∂h_t/∂h_k 的雅可比连乘形式并定义谱半径病灶；\n"
                        "2. 用谱半径量化说明 tanh 导数 ≤1 与 W 谱半径共同决定消失/爆炸；\n"
                        "3. 实现按范数的梯度截断，并说明正交/单位初始化（IRNN）的缓解原理。"),
"deep-learning-c5-l3": ("1. 解释 LSTM 细胞状态的「加法传送带」为何让梯度近似无衰减回流；\n"
                        "2. 写出三门一态的完整公式并说明各门的 0/1 语义；\n"
                        "3. 对比 GRU 的两门结构与参数量（约省 25%），给出选型建议。"),
"deep-learning-c6-l1": ("1. 区分判别/生成建模的目标并说明 AE 隐空间「荒漠」的成因；\n"
                        "2. 写出 ELBO 两项（重构+KL）及其变分下界含义；\n"
                        "3. 实现重参数化 z=μ+σ⊙ε 并解释它如何让采样可反传。"),
"deep-learning-c6-l2": ("1. 推导 GAN 的极小极大目标与最优判别器 D*(x)=p_data/(p_data+p_g)；\n"
                        "2. 复述三大崩溃陷阱（梯度消失/模式坍塌/不稳定）及 WGAN-GP 的对策；\n"
                        "3. 跑通一维迷你 GAN 并观察生成器均值逼近真实均值的均衡过程。"),
"deep-learning-c6-l3": ("1. 写出 DDPM 前向闭式 x_t=√ᾱ_t·x_0+√(1-ᾱ_t)·ε 并解释信号噪声比随 t 的演化；\n"
                        "2. 说明逆向过程用 U-Net 预测噪声 ε 的简化目标与训练法；\n"
                        "3. 解释 CFG 如何用有/无条件预测的线性外推控制生成服从度。"),
}
PREREQS = {
"deep-learning-c5-l1": "- c2 的前向/反向与计算图；\n- 序列数据的基本直觉（文本/时序）。",
"deep-learning-c5-l2": "- 「标准 RNN 与 BPTT」（c5-l1）；\n- 特征值与谱半径的线性代数常识。",
"deep-learning-c5-l3": "- c5-l2 的梯度消失病灶；\n- sigmoid/tanh 的值域与导数。",
"deep-learning-c6-l1": "- c2 的反向传播；\n- 概率分布、KL 散度的基本定义。",
"deep-learning-c6-l2": "- c3 的优化器（对抗训练的步法）；\n- 博弈论零和概念（常识级）。",
"deep-learning-c6-l3": "- c6-l1 的生成建模视角；\n- c2 的 U-Net 之外无新前置。",
}

if len(sys.argv) > 1 and sys.argv[1] == "verify":
    lib.verify_codes({"deep-learning-c5": T5, "deep-learning-c6": T6}, GOALS)
elif T5["expected"] == "" or T6["expected"] == "":
    lib.verify_codes({"deep-learning-c5": T5, "deep-learning-c6": T6}, GOALS)
else:
    CIDS = {"deep-learning-c5-l1": T5, "deep-learning-c5-l2": T5, "deep-learning-c5-l3": T5,
            "deep-learning-c6-l1": T6, "deep-learning-c6-l2": T6, "deep-learning-c6-l3": T6}
    REFS = {k: (REF5 if "c5" in k else REF6) for k in CIDS}
    for lid, t in CIDS.items():
        MD = build_md(lib.orig_content(lid), GOALS[lid], PREREQS[lid], t["why"], t["intuition"],
                      t["code"], t["expected"], t["cerr"], t["miscon"], t["connection"], t["summary"], REFS[lid])
        lib.patch_lesson(lid, MD)
    finish(lib)
