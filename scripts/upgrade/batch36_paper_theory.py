# -*- coding: utf-8 -*-
"""batch36 B 组：paper-theory《理论与复杂度》6 节升级（TS 源，_batch34_lib 模式）。
用法：python batch36_paper_theory.py verify -> 跑章代码看输出
     python batch36_paper_theory.py         -> 打补丁
"""
from _batch34_lib import Lib, build_md, finish
import sys

lib = Lib("paper-theory", [
    "src/content/chapters/paper-theory.ts",
    "src/content/chapters/paper-theory2.ts",
    "src/content/chapters/paper-theory3.ts",
    "src/content/chapters/paper-theory4.ts",
    "src/content/chapters/paper-theory5.ts",
])

C1 = dict(
name="c1 MDL：用描述长度做模型选择",
why=("拟合 5 个点，四次多项式误差为 0——但没人会选它。「过拟合」长期只有直觉、没有度量。MDL 把奥卡姆剃刀"
     "变成可计算的账本：总描述长度 = 描述模型本身 + 给定模型描述数据，选模型就是选压缩得最短的那本账——"
     "无需测试集、无需手调正则系数。它还是「压缩即智能」假说的理论源头：语言模型的交叉熵损失就是平均编码长度，"
     "压缩得越好=规律抓得越准。"),
intuition=("寄数据像寄快递：可以附一本厚说明书（复杂模型）+ 一小包待修正的误差，或一本薄说明书（简单模型）"
           "+ 一大包误差。总运费最少的方案赢。完美拟合的四次多项式说明书太厚（5 个参数 × 32 比特），"
           "运费反而输给直线——奥卡姆剃刀从此有了价签。"),
code='''import numpy as np
rng = np.random.default_rng(6)
n = 20
x = np.linspace(0, 1, n)
y = 2*x + 1 + rng.normal(0, 0.15, n)          # 真实模型: 直线+噪声
eps = 0.01                                     # 残差量化精度
for d in range(5):
    c = np.polyfit(x, y, d)
    sigma = max((y - np.polyval(c, x)).std(), 1e-6)
    L_model = (d + 1) * 32                     # 每参数 32 比特
    L_data = n * max(0.5*np.log2(2*np.pi*np.e*sigma**2 / eps**2), 0.0)
    print(f"d={d}: 总长 {L_model + L_data:6.1f} = 模型 {L_model} + 数据 {L_data:.1f}")''',
expected=("实测：d=0/1/2/3/4 的总描述长度 193.2 / 185.1 / 216.3 / 248.0 / 280.0 比特——d=1（真实模型）最短；"
          "d≥2 后数据部分几乎不再下降（残差已到噪声水平），模型部分每加一阶贵 32 比特，惩罚立即生效。"),
cerr=("残差方差趋 0 时直接取对数得 -inf，必须设量化下限；只算 L(数据|模型) 忘加 L(模型)，永远选最复杂模型；"
      "把 BIC 惩罚记成 2k——那是 AIC，n>8 后两者可能给出相反排序。"),
miscon=("1. **拟合最准=最好**——MDL 证明「描述最短」才是好：完美拟合噪声要付模型描述的代价；\n"
        "2. **MDL 只是又一种信息准则**——它是原理（压缩=学习），AIC/BIC 是预测/解释目标下的近似；\n"
        "3. **编码方案不同结论就不同**——方案差异是 O(1) 量级，通常不影响模型排序。"),
connection=("- **向前**：信息论「编码长度=-log₂P」是本节全部计算的地基；\n"
            "- **向后**：c2 把 MDL 搬进神经网络权重，c4 柯尔莫哥洛夫复杂度给「最短描述」严格定义；\n"
            "- **平行**：语言模型损失=平均编码长度；Hutter Prize 用压缩衡量智能。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 核心等式 | L(数据) = L(模型) + L(数据|模型) |\n"
         "| 桥梁 | 编码长度 = -log₂P → MDL ≈ 负对数似然 + 复杂度惩罚 |\n"
         "| 实测 | d=0..4 → 193/185/216/248/280 比特，d=1 最短 |\n"
         "| 近似 | BIC = k·ln(n) - 2lnL̂（比 AIC=2k 惩罚更重） |\n"
         "| 现代回声 | LM 损失=编码长度；压缩即智能 |"),
ref="本课程整理（可参见论文原文：Grünwald, A Tutorial Introduction to the Minimum Description Length Principle；Rissanen 1978；Schwarz 1978）",
)

C2 = dict(
name="c2 权重的最小描述长度：Hinton 1993",
why=("float32 权重每个 32 比特——描述长度固定就没法优化。Hinton 的洞察：权重的「精度」决定描述长度。"
     "把权重变成分布 w = μ + σ·ε，让 σ（模糊度）成为可学习参数，惩罚 -Σlog σ（精确权重的描述代价），"
     "数据项自动抵抗过度模糊。这正是变分推断 ELBO 的深度学习雏形——比贝叶斯神经网络流行早 20 年，"
     "也是今天权重不确定性、MC Dropout、模型压缩的思想源头。"),
intuition=("描述一个权重像描述朋友的位置：说「在三楼健身房」（μ±大σ）一句话就够；说「北纬 39.9043°、"
           "东经 116.4074°」（σ 小）精确但费字。MDL 总账 = 描述成本 + 定位失误成本：太模糊找不对人"
           "（数据损失涨），太精确每句话都像电报码（描述长度涨）——最优精度在中间，且每个权重自己决定。"),
code='''import numpy as np
rng = np.random.default_rng(7)
n, xs = 50, np.linspace(-1, 1, 50)
ys = 2.0 * xs + rng.normal(0, 0.1, n)
def kl_stdnormal(mu, s):                       # KL(N(mu,s^2) || N(0,1)) — Hinton 惩罚项
    return -np.log(s) + (mu**2 + s**2 - 1) / 2
for s in (0.05, 0.1, 0.15, 0.2, 0.3, 0.5, 1.0):
    mc = np.mean([((w*xs - ys)**2).sum() for w in 2.0 + s*rng.normal(size=400)])
    print(f"sigma={s:4.2f}: L_data={mc:7.2f}  KL={kl_stdnormal(2.0, s):5.2f}  总计={mc+kl_stdnormal(2.0, s):7.2f}")''',
expected=("实测：σ=0.05→4.97、0.10→4.41、0.15→4.21（最小）、0.20→4.35、0.30→4.71、0.50→7.13、1.00→19.93——"
          "总成本在 σ≈0.15 取得内部最优：精确到 0.05 时 KL 惩罚吃掉收益，模糊到 1.0 时采样噪声毁掉拟合。"),
cerr=("把惩罚符号记反（+log σ 会奖励精确、鼓励过拟合）；训练后推理继续采样却只采一次，预测方差大；"
      "所有权重共用一个 σ，失去「重要权重精确、冗余权重模糊」的自动分配。"),
miscon=("1. **加噪声=正则化技巧**——它是描述长度目标的组成部分，σ 是被优化的参数而非超参；\n"
        "2. **-log σ 在惩罚精确**——分清方向：σ 小（精确）→ -log σ 大 → 惩罚重，鼓励在允许处模糊；\n"
        "3. **与 L2 等价**——L2 是 σ 固定的特例；σ 可学习=每个权重自选精度（自动剪枝雏形）。"),
connection=("- **向前**：c1 的两部分 MDL 在此进入神经网络参数层；\n"
            "- **向后**：变分推断/VAE 的 ELBO、Bayes-by-Backprop、MC Dropout 都是本思想的后代；\n"
            "- **平行**：模型量化与压缩（低精度 ≈ 大 σ 的工程化）。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 洞察 | 权重精度=描述长度，σ 可学习 |\n"
         "| 损失 | L_data - Σlog σ ≈ ELBO（KL 项） |\n"
         "| 实测 | 总成本 σ=0.15 最小（4.21），两端爆炸 |\n"
         "| 对比 | L2=σ 固定；此处每权重自选精度 |\n"
         "| 后代 | 贝叶斯神经网络、MC Dropout、模型压缩 |"),
ref="本课程整理（可参见论文原文：Hinton & van Camp, Keeping Neural Networks Simple by Minimizing the Description Length of the Weights, COLT 1993）",
)

C3 = dict(
name="c3 复杂动力学：熵增，复杂度先升后降",
why=("热力学第二定律说熵只增，但打翻的咖啡里那朵漩涡分明「更复杂」了，而最终均匀混合又变得简单——"
     "熵和复杂度显然不是同一个量。Aaronson 提出复杂动力学第一定律：封闭系统中熵单调增，复杂度先升后降"
     "（倒 U）。要度量它，需要柯尔莫哥洛夫复杂度的实用近似（gzip 描述长度）与粗粒化的观察尺度——"
     "这为「结构」「图案」「组织度」这些含糊词给出了可计算的刻度。"),
intuition=("熵像「房间有多乱」，复杂度像「房间里的摆设多了不起」：初始整整齐齐（简单），均匀撒乱后"
           "（简单但乱），只有中间态——家具被龙卷风卷出奇特造型时——既不整齐也不均匀，才真正「复杂」。"
           "混乱是免费的，有趣是稀有的：生命与智能住在中间的窄带里。"),
code='''import numpy as np, gzip
rng = np.random.default_rng(8)
g = np.zeros((16, 32)); g[:, :16] = 1.0          # 左牛奶(1) 右咖啡(0)
def q_(a, k=4): return (a.reshape(a.shape[0]//k, k, a.shape[1]//k, k).mean((1, 3)) * 16).astype(np.uint8)
def cx(a): return len(gzip.compress(q_(a).tobytes()))          # 粗粒化图案的描述长度
def me(a):
    p = q_(a).reshape(-1) / 16                                   # 块内牛奶占比
    return float((-p*np.log2(np.clip(p, 1e-9, 1)) - (1-p)*np.log2(np.clip(1-p, 1e-9, 1))).mean())
print("t=0:    混合熵 %.2f 复杂度 %d" % (me(g), cx(g)))
for step in range(1, 3001):
    for _ in range(40):                          # 相邻格取平均 = 扩散
        y, x, vert = rng.integers(0, 16), rng.integers(0, 32), rng.random() < 0.5
        if vert and y < 15: nb = (y+1, x)
        elif not vert and x < 31: nb = (y, x+1)
        else: continue
        m = (g[y, x] + g[nb]) / 2; g[y, x] = g[nb] = m
    if step in (10, 40, 150, 600, 3000): print("t=%4d: 混合熵 %.2f 复杂度 %d" % (step, me(g), cx(g)))''',
expected=("实测：混合熵 0.00→0.07→0.15→0.30→0.43→0.80 单调上升；粗粒化图案的 gzip 描述长度 "
          "29→39（t=10 中间态最「有料」）→35→33→31→31 回落——倒 U 型出现：初始分界与最终均匀都更好压缩（简单）。"),
cerr=("把像素直方图熵当混合熵——守恒二值场的直方图不变，要用粗粒化块内熵；不做粗粒化直接 gzip 原图，"
      "初始分界线的规律性会污染读数；把 gzip 字节差当精确复杂度——它只是 K(x) 的上界近似。"),
miscon=("1. **复杂=乱**——纯随机数据最乱却最不复杂（无结构可压），复杂是「有序与无序之间」；\n"
        "2. **gzip 差值=精确复杂度**——上界近似，依赖压缩器与观察尺度；\n"
        "3. **倒 U 是普适定律**——c5 将用对照实验证明它依赖「粒子是否相互作用」的模型假设。"),
connection=("- **向前**：c1 的「压缩=描述长度」提供了度量工具；\n"
            "- **向后**：c5 咖啡自动机把倒 U 变成对照实验，c4 给出 K(x) 的严格定义；\n"
            "- **平行**：训练中模型复杂度的演化（涌现/相变的复杂度视角）。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 第一定律 | 熵单调增，复杂度先升后降 |\n"
         "| 度量 | K(x)≈|gzip(x)|，粗粒化后度量「结构」成分 |\n"
         "| 实测 | 混合熵 0→0.80 单调；复杂度 29→39→31 倒 U |\n"
         "| 推论 | 「复杂」是稀有中间态，两端都简单 |\n"
         "| 注意 | 复杂度依赖观察粒度 |"),
ref="本课程整理（可参见论文原文：Aaronson, The First Law of Complexodynamics（2011 博客）；Aaronson, Carroll & Ouellette, The Coffee Automaton, arXiv:1405.6903）",
)

C4 = dict(
name="c4 柯尔莫哥洛夫复杂度与算法随机性",
why=("「随机」人人会用，却很难严格定义——统计检验永远只能证伪不能证明。Kolmogorov、Solomonoff、Chaitin "
     "给出惊人而严格的答案：随机的=不可压缩的。K(x)=生成 x 的最短程序长度，K(x)≈|x| 即算法随机。"
     "它把「奥卡姆剃刀」「描述长度」「先验 2^-K」统一进一个框架：是 c1 MDL 的理论地基、c6 环境权重的出处，"
     "也是「压缩即智能」的数学版本。"),
intuition=("描述一串数据只有两种命运：写出比它短的「说明书」（有规律），或只能逐字抄写（随机）。"
           "20 个 0 的说明书是 print(\"0\"*20)；随机 20 位的说明书只能原样照抄。K(x) 就是最短说明书的厚度——"
           "但「最优说明书」本身不可计算（Berry 悖论），现实中用 gzip 等压缩器给出上界。"),
code='''import numpy as np, gzip, math, heapq
freq = {"a": 0.5, "b": 0.25, "c": 0.15, "d": 0.10}
H = -sum(p*math.log2(p) for p in freq.values())
def huffman_avg_len(freq):
    heap = [[p, i, [s]] for i, (s, p) in enumerate(freq.items())]; heapq.heapify(heap)
    lens = {s: 0 for s in freq}
    while len(heap) > 1:
        p1, _, s1 = heapq.heappop(heap); p2, _, s2 = heapq.heappop(heap)
        for s in s1 + s2: lens[s] += 1
        heapq.heappush(heap, [p1+p2, len(heap), s1+s2])
    return sum(freq[s]*lens[s] for s in freq)
L = huffman_avg_len(freq)
print(f"熵 H={H:.3f} | Huffman 平均码长={L:.3f} (差 {L-H:.2f}, 整数比特代价)")
rng = np.random.default_rng(9)
pat = ("ab"*500).encode(); rnd = rng.integers(97, 101, 1000).astype(np.uint8).tobytes()
print("gzip 规律串:", len(gzip.compress(pat)), "| gzip 随机串:", len(gzip.compress(rnd)))''',
expected=("实测：频率 a=.5/b=.25/c=.15/d=.1 的熵 H=1.743 比特/符号，Huffman 平均码长 1.750（差 0.01——"
          "整数比特的代价，算术编码可逼近 0）；gzip(\"ab\"×500)=30 字节 vs gzip(随机串)=371 字节——"
          "可压缩性严格区分规律与随机。"),
cerr=("混淆「输出长度」与「程序长度」——K 衡量最短程序而非字符串本身；把 gzip 值直接当 K(x) 的精确值——"
      "只是上界；Huffman 合并节点后忘插回堆或未维护前缀性质，平均码长可能反超熵。"),
miscon=("1. **随机=通过统计检验**——Martin-Löf 随机更强：通不过所有可构造检验，与不可压缩等价；\n"
        "2. **K(x) 可算只是慢**——不可计算（Berry 悖论），压缩器只能给上界；\n"
        "3. **大部分串有规律**——计数证明相反：长度 n 的串中至少一半 K(x)>n-1，随机是常态。"),
connection=("- **向前**：c1 MDL 的「最短描述」在此获得严格定义；\n"
            "- **向后**：c6 的环境权重 2^-K 即 Solomonoff 先验；Solomonoff 归纳=奥卡姆剃刀的贝叶斯版；\n"
            "- **平行**：c3 用 gzip 近似复杂度测量物理系统；语言模型损失=平均编码长度。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 定义 | K(x) = 生成 x 的最短程序长度 |\n"
         "| 随机 | K(x)≈|x|（不可压缩），且几乎全部串如此 |\n"
         "| 不可计算 | Berry 悖论；只能用压缩器取上界 |\n"
         "| 编码器 | Huffman 距熵差整数比特（实测 0.01）；算术编码≈0 |\n"
         "| 实测锚点 | gzip 规律串 30 vs 随机串 371 字节 |"),
ref="本课程整理（可参见论文原文：Kolmogorov 1965；Solomonoff 1964；Martin-Löf 1966；Li & Vitányi 教材相应章节）",
)

C5 = dict(
name="c5 咖啡自动机：两种混合模型",
why=("「复杂度先升后降」在 c3 还是漂亮的假设——科学的态度是把假设变成对照实验。Aaronson 等人设计两种"
     "混合模型：粒子互不理睬的纯扩散，与粒子相互模仿的交互模型，用同一把 gzip 尺子测量。结论出人意料又"
     "合乎直觉：中间结构只在相互作用模型中出现——「图案」来自粒子感知彼此。这也是方法论范本：明确假设→"
     "可计算模型→可测指标→对照实验→诚实报告。"),
intuition=("一群人走出礼堂：如果人人闭眼乱走（非相互作用），人群从分区到均匀，中间只有「边界模糊」没有图案；"
           "如果人与人互相看齐（相互作用），走动中会自发抱团——中期出现真正的「结构」。"
           "结构不是混合的副产品，是互动的产物。"),
code='''import numpy as np, gzip
rng = np.random.default_rng(10)
def complexity(a):
    return len(gzip.compress(rng.permutation(a.ravel()).tobytes())) - len(gzip.compress(a.tobytes()))
def run(interact, steps=9000):
    g = np.zeros((12, 24), np.uint8); g[:, :12] = 1
    for _ in range(steps):
        y, x = rng.integers(0, 12), rng.integers(0, 24)
        dy, dx = rng.choice([-1, 0, 1], 2)
        ny, nx = (y+dy) % 12, (x+dx) % 24
        if (ny, nx) == (y, x): continue
        if interact and rng.random() < 0.9: g[y, x] = g[ny, nx]   # 模仿邻居=相互作用
        else: g[y, x], g[ny, nx] = g[ny, nx], g[y, x]             # 交换=独立扩散
    return g
for name, it in (("非相互作用", False), ("相互作用", True)):
    g = run(it)
    print(f"{name}: 同色相邻占比={np.mean(g[:, :-1] == g[:, 1:]):.2f}  gzip复杂度={complexity(g):+d}")
print("纯扩散→无结构(≈0.5, ≈0); 相互作用→团簇结构")''',
expected=("实测（9000 步）：非相互作用模型同色相邻占比 0.57（趋近随机值 0.5）、gzip 复杂度 -2（≈0，无结构）；"
          "相互作用模型同色占比 0.74、复杂度 +5——粒子互不理睬时只有「越来越模糊」，中间结构需要相互作用。"),
cerr=("两模型的步数/交互强度不对齐就下结论，对照失效；交互概率设 0.5 太弱，结构被扩散淹没测不出差异；"
      "只看混合度不看结构指标——条纹与均匀混合的异色边界数可以一样多（论文的 row_majority_adjust 正为此设计）。"),
miscon=("1. **倒 U 是物理定律**——它是模型依赖的实验结论，纯扩散模型就不出现；\n"
        "2. **相互作用=碰撞**——本模型里是「模仿邻居」的对齐倾向，物理类比是表面张力而非硬碰撞；\n"
        "3. **复杂度测量完全客观**——粗粒化尺度等指标选择本身影响读数，必须诚实报告。"),
connection=("- **向前**：c3 提出假设，本节完成「假设→实验」的闭环；\n"
            "- **向后**：深度学习特征层级（中层最「有结构」）与训练复杂度演化的类比；\n"
            "- **平行**：c1/c4 的压缩度量是全部实验的尺子。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 对照 | 非相互作用（独立游走）vs 相互作用（局部模仿） |\n"
         "| 结果 | 中间结构只在相互作用模型出现 |\n"
         "| 实测 | 纯扩散→占比 0.57/复杂度 -2；交互→0.74/+5 |\n"
         "| 方法论 | 假设→可计算模型→可测指标→对照→诚实报告 |\n"
         "| 启示 | 结构来自互动：太有序/太无序都简单 |"),
ref="本课程整理（可参见论文原文：Aaronson, Carroll & Ouellette, Quantifying the Rise and Fall of Complexity in Closed Systems: The Coffee Automaton, arXiv:1405.6903）",
)

C6 = dict(
name="c6 通用智能的数学定义：Legg & Hutter",
why=("「这个 AI 聪明吗」——IQ 测试、图灵测试、单项榜单都答不好：要么只测人类相关能力，要么主观，"
     "要么过拟合单一任务。Legg & Hutter 2007 给出第一个数学上严格的通用智能定义：U(π)=Σ 2^-K(μ)·V_μ(π)——"
     "在所有可能环境中的加权平均回报，环境越简单权重越大（Solomonoff 先验）。它让 AGI 从口号变成数学对象，"
     "直接催生 AIXI，也塑造了今天基准设计的「广覆盖」精神（ARC、GAIA）。"),
intuition=("评价运动员不该只看举重，而是看「所有体育项目上的加权总分」：越基础的项目权重越大。"
           "专才在一个项目满分、其余 0 分；通才每项都不差——按总分通才赢。且「项目清单」不是人造的，"
           "是按环境复杂度自动加权的所有可能世界。"),
code='''envs = [("总给奖励", 1), ("交替奖励", 3), ("棋盘世界", 8), ("复杂物理", 12)]
raw = {name: 2.0**(-K) for name, K in envs}
tot = sum(raw.values())
w = {k: v / tot for k, v in raw.items()}          # 归一化的 2^-K 权重
agents = {
  "专用棋手  ": {"总给奖励": 0.1, "交替奖励": 0.1, "棋盘世界": 0.95, "复杂物理": 0.0},
  "反射机器人": {"总给奖励": 0.9, "交替奖励": 0.2, "棋盘世界": 0.05, "复杂物理": 0.0},
  "通用学习者": {"总给奖励": 0.9, "交替奖励": 0.7, "棋盘世界": 0.6, "复杂物理": 0.3},
}
print("环境权重: " + "  ".join(f"{e}={w[e]:.3f}" for e, _ in envs))
for name, V in agents.items():
    U = sum(w[e] * V[e] for e in V)
    print(f"{name}: U = {U:.4f}")
print("通用性胜出: 简单环境权重高, 但 breadth 决定总和")''',
expected=("实测：归一化环境权重 总给奖励=0.795、交替奖励=0.199、棋盘世界=0.006、复杂物理=0.0004；"
          "U(专用棋手)=0.1052（只在棋盘世界 0.95）、U(反射机器人)=0.7553（吃定简单环境）、"
          "U(通用学习者)=0.8582（每项都不差）——广度战胜单项专精。"),
cerr=("忘归一化 2^-K 权重就计算 U，量纲混乱无法比较；把 AIXI 当实现方案——它不可计算也不可有限近似，"
      "只是理论参照系；用单一任务分数外推通用智能，正是定义要治的病。"),
miscon=("1. **智能=某榜单第一**——U 的精神是「任何任务都不差」，单项冠军的智能值可以很低；\n"
        "2. **这个定义可直接实测**——K(μ) 不可计算、环境空间不可枚举，实践中用有限基准近似其精神；\n"
        "3. **回报函数客观**——定义只解决「如何聚合」，「什么算好」仍需人定义。"),
connection=("- **向前**：c4 的 K(μ) 与 Solomonoff 先验是权重的来源，c1 MDL 同属「简单者优先」哲学；\n"
            "- **向后**：AIXI 理论、AI 安全（超级智能=任何任务都强，包括有害任务）、ARC/GAIA 广覆盖基准；\n"
            "- **平行**：paper-theory 全课的「压缩/简单性」主线在此收束。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 定义 | U(π)=Σ 2^-K(μ)·V_μ(π)：所有环境的加权回报 |\n"
         "| 权重 | 2^-K=Solomonoff/奥卡姆先验，简单环境权重大 |\n"
         "| 实测 | 通用 0.858 > 反射 0.755 > 专用 0.105 |\n"
         "| AIXI | argmax U：理论北极星，不可计算 |\n"
         "| 影响 | AGI 数学化、AI 安全、广覆盖基准 |"),
ref="本课程整理（可参见论文原文：Legg & Hutter, Universal Intelligence: A Definition of Machine Intelligence, arXiv:0712.3329）",
)

THEMES = {
    "paper-theory-c1": C1, "paper-theory-c2": C2, "paper-theory-c3": C3,
    "paper-theory-c4": C4, "paper-theory-c5": C5, "paper-theory-c6": C6,
}

GOALS = {
"paper-theory-c1-l1": ("1. 用两部分编码 L = L(模型)+L(数据|模型) 手算直线 vs 四次多项式的描述长度，"
                       "解释为什么拟合更准的模型反而输；\n"
                       "2. 说出「编码长度=-log₂P」的桥梁作用与 BIC=k·ln(n)-2lnL̂ 是 MDL 的近似"
                       "（比 AIC 惩罚更重）；\n"
                       "3. 用 numpy 对 0~4 阶多项式计算两部分 MDL，验证真实阶数 d=1 的总长最短。"),
"paper-theory-c2-l1": ("1. 说明「权重精度=描述长度」，写出 w=μ+σε 与 Hinton 损失 L=L_data-Σlog σ 的两项权衡；\n"
                       "2. 识别 Hinton 损失与变分推断 ELBO 的对应（-Σlog σ ≈ KL 项），说明它与固定 σ 的 "
                       "L2 权重衰减的本质区别（每权重自选精度）；\n"
                       "3. 用蒙特卡洛采样复现 σ 的 MDL 平衡点：太精确 KL 爆炸、太模糊数据损失爆炸。"),
"paper-theory-c3-l1": ("1. 区分熵（无序度）与复杂度（结构度），复述「咖啡杯」中两者的不同轨迹"
                       "（熵单调增、复杂度倒 U）；\n"
                       "2. 用 gzip 压缩长度近似柯尔莫哥洛夫复杂度，说明粗粒化观察尺度的作用；\n"
                       "3. 用 numpy 模拟二维扩散混合，实测混合熵单调升、粗粒化描述长度先升后降。"),
"paper-theory-c4-l1": ("1. 写出 K(x) 的定义并解释「程序长度而非输出长度」，说明随机=不可压缩（K(x)≈|x|）；\n"
                       "2. 复述 K(x) 不可计算的 Berry 悖论论证与「几乎全部串不可压缩」的计数证明；\n"
                       "3. 手写 Huffman 编码对比香农熵（整数比特代价），并用 gzip 区分规律串与随机串。"),
"paper-theory-c5-l1": ("1. 说出两种混合模型的规则差异（独立随机游走 vs 局部模仿）与物理类比"
                       "（理想气体 vs 表面张力）；\n"
                       "2. 复述实验设计与测量指标（gzip 复杂度、同色相邻占比），解释「倒 U」为何依赖模型假设；\n"
                       "3. 用 numpy 实现两模型对照，实测纯扩散归约到无结构、交互模型保留团簇。"),
"paper-theory-c6-l1": ("1. 写出 U(π)=Σ 2^-K(μ) V_μ(π) 并解释三项含义（环境集、Solomonoff 权重、期望回报）；\n"
                       "2. 说明三个设计动机（所有环境而非特定任务、回报而非对错、K 而非人为难度），"
                       "以及 AIXI=argmax U 的「北极星」地位；\n"
                       "3. 用 numpy 在 4 个环境上计算 3 种智能体的 U，验证通用性在加权总分上胜出。"),
}

PREREQS = {
"paper-theory-c1-l1": "- 极大似然与交叉熵（深度学习/统计基础）；\n- 多项式最小二乘拟合；\n- 对数与比特的关系。",
"paper-theory-c2-l1": "- c1 的两部分 MDL；\n- 高斯分布的 KL 散度公式；\n- 线性回归的 MSE 损失。",
"paper-theory-c3-l1": "- 香农熵的计算（-Σp log₂p）；\n- gzip/压缩的基本概念；\n- c4 的 K(x) 定义可后置对照。",
"paper-theory-c4-l1": "- 香农熵与「编码长度=-log₂P」（c1 已建立）；\n- 基本组合计数（2^n 个串）；\n- 可计算性直觉（停机问题）。",
"paper-theory-c5-l1": "- c3 的 gzip 复杂度与粗粒化度量；\n- 香农熵；\n- 基本蒙特卡洛模拟直觉。",
"paper-theory-c6-l1": "- c4 的 K(x) 与 2^-K 先验；\n- 强化学习的回报概念；\n- 归一化加权平均。",
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
