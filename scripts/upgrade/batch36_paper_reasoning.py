# -*- coding: utf-8 -*-
"""batch36 B 组：paper-reasoning《记忆与推理》6 节升级（TS 源，_batch34_lib 模式）。
用法：python batch36_paper_reasoning.py verify -> 跑章代码看输出
     python batch36_paper_reasoning.py         -> 打补丁
"""
from _batch34_lib import Lib, build_md, finish
import sys

lib = Lib("paper-reasoning", [
    "src/content/chapters/paper-reasoning.ts",
    "src/content/chapters/paper-reasoning2.ts",
    "src/content/chapters/paper-reasoning3.ts",
    "src/content/chapters/paper-reasoning4.ts",
    "src/content/chapters/paper-reasoning5.ts",
    "src/content/chapters/paper-reasoning6.ts",
])

C1 = dict(
name="c1 神经图灵机：给神经网络一个外部记忆",
why=("RNN/LSTM 的记忆是一块固定维度的隐藏状态——容量封顶、无法寻址、扩容要重训、新旧信息互相覆盖。"
     "任何「先记住、再按需取用」的任务（复制、联想回忆、多实体追踪）都撞这堵墙。NTM 的回答是把记忆"
     "搬出网络：外挂一块可微的记忆矩阵，用注意力做软寻址，让「存」与「取」也参与梯度下降。它是"
     "「记忆与计算分离」的第一次端到端演示，软寻址思想直接通向注意力机制与 RAG。"),
intuition=("控制器像图书管理员，记忆矩阵是书架。内容寻址=报书名找书（相似度检索），位置寻址=报书架号"
           "翻页（在上一步位置的邻格移动）。关键在于「翻到第 3 页」这种离散动作无法求导，所以 NTM 把它"
           "软化成按注意力权重把所有槽位的内容按比例混合——每个格子都读一点，越相关读得越多，梯度于是"
           "能流回控制器，端到端学会一套读写算法。"),
code='''import numpy as np
rng = np.random.default_rng(0)
N, W = 4, 3
M = rng.normal(0, 1, (N, W))                 # 记忆矩阵 N×W
key = M[2] + 0.05 * rng.normal(0, 1, W)      # 查询向量 ≈ 槽位2
sim = M @ key / (np.linalg.norm(M, axis=1) * np.linalg.norm(key))
w = np.exp(2.5 * sim); w /= w.sum()          # 内容寻址: softmax(β·cos)
print("寻址权重:", np.round(w, 3), "-> 槽位", int(w.argmax()))
e, a = np.ones(W), np.array([1.0, 0.0, 0.0])
M = M * (1 - np.outer(w, e)) + np.outer(w, a)   # 擦除+添加
print("写入后槽位2:", np.round(M[2], 2))
print("读出 r =", np.round(w @ M, 2))''',
expected=("实测：寻址权重 [0.028, 0.018, 0.946, 0.009] → 指向槽位 2（key 由槽位 2 加噪声生成）；"
          "擦除+添加写入后槽位 2 变为 [1.02, 0.05, -0.04]（第 0 维被添加向量写入）；按权重读出 "
          "r=[0.96, 0.03, -0.01]——约 95% 的注意力集中在目标槽位，软寻址把「翻到第 3 页」变成可求导的加权平均。"),
cerr=("softmax 前忘乘锐度 β，权重平坦到读不出目标槽位；写操作漏掉 (1-w·e) 擦除步，旧记忆残留污染后续读取；"
      "把 argmax 硬寻址直接写进前向传播，梯度断流无法训练。"),
miscon=("1. **NTM 记忆=更大的隐藏层**——它是独立矩阵：可寻址、容量与控制器参数解耦、读写有显式协议；\n"
        "2. **注意力=查表返回一条**——是加权混合所有槽位，权重只决定「多读少读」，不存在硬命中；\n"
        "3. **被 Transformer 取代=思想过时**——可写外部记忆活在 RAG/DNC 里，软寻址活在每个注意力层里。"),
connection=("- **向前**：承接深度学习课 RNN/LSTM 的记忆瓶颈，本节给出「外挂记忆」的第一性方案；\n"
            "- **向后**：c2 指针网络把注意力权重直接当输出，c4 关系记忆给记忆槽加自注意力交互，RAG 的检索-读写是外部记忆的工程化；\n"
            "- **平行**：Transformer 的 Q·K 注意力与内容寻址同构（但只读、可并行）。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 记忆瓶颈 | RNN 隐藏状态容量固定、不可寻址、新旧互相干扰 |\n"
         "| 结构 | 控制器（计算）+ 记忆矩阵 N×W（存储），全部操作可微 |\n"
         "| 寻址 | 内容寻址（cos+softmax）与位置寻址（插值+移位+锐化） |\n"
         "| 读写 | 读=加权求和；写=擦除 (1-w·e) 再添加 w·a |\n"
         "| 遗产 | 软寻址→注意力机制；外部记忆→RAG/DNC |"),
ref="本课程整理（可参见论文原文：Graves, Wayne & Danihelka, Neural Turing Machines, arXiv:1410.5401）",
)

C2 = dict(
name="c2 指针网络：输出是输入的位置",
why=("凸包、TSP、排序这类问题的答案是「输入位置的排列/子集」：输出空间随输入长度变化，n=50 的 TSP 有 50! 种排列——"
     "固定词表的 seq2seq 从原理上就装不下。Pointer Networks 的洞察极其锋利：注意力权重本来就是「关注哪个输入」"
     "的分布，那就不做加权求和，直接把它当输出分布。于是输出维度=输入长度，n 变了分布跟着变，还能泛化到训练"
     "没见过的 n。抽取式问答预测答案起止位置、指代消解、摘要复制机制，都是这个思想的直系后代。"),
intuition=("词表生成像「从字典里挑词」，指针像「用手指点名单」：答案不在字典里，而在到场名单（输入序列）上。"
           "解码器每一步举手提问「下一个该谁」，注意力对每个输入位置打分做 softmax，得分最高的位置被点名。"
           "n 增减只是名单变长变短，手指还是那根手指——这就是输出空间随输入自适应的含义。"),
code='''import numpy as np
rng = np.random.default_rng(1)
n = 6
pts = rng.uniform(0, 10, (n, 2))
tour, cur, total = [0], 0, 0.0
while len(tour) < n:
    d2 = np.linalg.norm(pts - pts[cur], axis=1)      # 指针打分: 到当前城市距离
    score = np.where(np.isin(np.arange(n), tour), -np.inf, -d2)
    p = np.exp(score - score.max()); p /= p.sum()    # 指针分布(维度 n)
    nxt = int(p.argmax())
    total += d2[nxt]; tour.append(nxt); cur = nxt
total += np.linalg.norm(pts[tour[-1]] - pts[tour[0]])
print("指针路径:", tour, "| 总长:", round(total, 2))
print("指针分布维度 =", n, "(=输入长度, 与词表无关)")''',
expected=("实测：6 城市指针路径 [0, 1, 2, 5, 3, 4]（每步取指针分布的 argmax 指向最近未访问城市），闭合总长 29.2；"
          "指针分布维度 = 6 = 输入长度，与词表无关；已访问城市打分置 -inf 后 softmax 自动把概率让给未访问者。"),
cerr=("softmax 前忘屏蔽已访问位置，路径出现重复城市（非法排列）；打分忘减 max 直接 exp，大 n 时数值溢出；"
      "误以为指针网络保证全局最优——它是贪心近似，TSP 大 n 还需 beam search 或强化学习。"),
miscon=("1. **指针网络输出「词」**——输出的是输入位置索引，分布维度是 n 不是词表大小；\n"
        "2. **它保证输出是合法排列**——不保证，可能重复指向，需屏蔽已选位置或后处理；\n"
        "3. **只用于组合优化**——抽取式 QA 的 span 预测、Pointer-Generator 摘要的复制门控都是它的日常形态。"),
connection=("- **向前**：注意力机制（编码器-解码器）是其计算基座，c1 NTM 的内容寻址同源；\n"
            "- **向后**：c6 Order Matters 处理「输入是无序集合」的另一半问题，两者的 Write 阶段可结合（输出指向输入位置）；\n"
            "- **平行**：Transformer 抽取式 QA、Copy Mechanism、AlphaFold 的残基对注意力。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 矛盾 | 输出是输入位置的排列/子集，输出空间随 n 变化 |\n"
         "| 机制 | softmax(注意力打分) 直接当输出分布，维度 = n |\n"
         "| 优势 | n 自适应、可超训练长度泛化、指向可解释 |\n"
         "| 手算锚点 | 6 城市 TSP 指针路径 [0,1,2,5,3,4]，总长 29.2 |\n"
         "| 后代 | 抽取式 QA、Pointer-Generator、AlphaFold |"),
ref="本课程整理（可参见论文原文：Vinyals, Fortunato & Jaitly, Pointer Networks, arXiv:1506.03134）",
)

C3 = dict(
name="c3 关系网络：让模型显式地两两比较",
why=("CNN 看局部、RNN 看顺序，但「红色物体数量是否等于球的数量」要求对任意两个物体做两两比较再聚合统计——"
     "标准架构里没有「比较」这个算子，CLEVR 上 CNN+LSTM 只有 68.5%。Relation Network 用两行公式补上："
     "对每对物体跑共享 MLP g_θ，n² 个关系向量求和后交给 f_φ 出答案。结构简单到失礼，却在 CLEVR 拿到 95.5% "
     "超过人类（92.6%）。它也是 GNN 消息传递与 Transformer 注意力的极简先声。"),
intuition=("判断「两个双胞胎谁年长」不能看合影（全局池化会抹平差异），必须 pairwise 单独比。RN 是「配对面谈」："
           "把所有 (i,j) 组合请进同一间会议室（共享 g_θ），每人一句结论（关系向量），最后把所有结论倒进一个"
           "固定大小的箱子称重（求和）。箱子不随人数变大，而「有几个人发言」本身留在重量里——这就是计数能力的来源。"),
code='''import numpy as np
rng = np.random.default_rng(2)
W1, W2 = rng.normal(0, 1, (4, 8)), rng.normal(0, 1, 8)
def g(a, b):
    return np.tanh(np.concatenate([a, b]) @ W1) @ W2
def RN(O):
    n = len(O)
    return sum(g(O[i], O[j]) for i in range(n) for j in range(n))
for k in (2, 3, 4):      # 场景: k 个红球(特征相同) + 1 个蓝方块
    scene = np.vstack([np.tile([1.0, 0.0], (k, 1)), [[0.0, 1.0]]])
    r = RN(scene)
    print(f"红球 {k} 个: |r|={np.linalg.norm(r):.3f}  sum(r)={r.sum():+.3f}")
print("红红配对数 = k^2, 求和把数量编码进关系和")''',
expected=("实测：k=2/3/4 个红球时关系和 sum(r) = -8.59 / -11.83 / -15.11，随 k 单调变化——k² 个同特征"
          "红红配对各贡献一份 g([1,0],[1,0])，即使 g_θ 完全未训练，求和聚合也把「数量」编码进了关系和，"
          "f_φ 据此即可回答计数类问题。"),
cerr=("把 n² 个关系向量拼接而不是求和，维度随 n² 爆炸，物体数一变就要换网络；聚合改用 mean 丢掉数量信息，"
      "计数类问题全崩；漏掉有序对或跳过 i=j，丢掉「物体与自身/方向性关系」的信号。"),
miscon=("1. **RN 是新架构**——只有两个共享 MLP，贡献在「连接方式」：全配对 + 求和聚合；\n"
        "2. **求和聚合是随意选择**——它同时给出置换不变与保留计数两件事，mean 丢数量、max 丢分布；\n"
        "3. **RN 已过时**——GNN 的消息函数/聚合函数与 g_θ/Σ 一一对应，Transformer 是「带权重的 RN」。"),
connection=("- **向前**：补足 CNN 卷积局部性没有显式「比较算子」的缺陷；\n"
            "- **向后**：c5 MPNN 把「全配对」换成「沿边传递」，c4 RMC 的多头注意力让记忆槽两两交流；\n"
            "- **平行**：图神经网络综述（Relational inductive biases）与 Set Transformer。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 公式 | RN(O) = f_φ( Σ_ij g_θ(o_i, o_j) )，两个共享 MLP |\n"
         "| 三设计 | 全配对（含 i=j）、共享 g、求和聚合 |\n"
         "| 求和的价值 | 置换不变 + 保留数量（红红配对 k²） |\n"
         "| 战绩 | CLEVR 95.5% 超 CNN+LSTM 27 个点、超人类 92.6% |\n"
         "| 地位 | GNN 消息传递与注意力两两交互的极简先声 |"),
ref="本课程整理（可参见论文原文：Santoro et al., A Simple Neural Network Module for Relational Reasoning, arXiv:1706.01427）",
)

C4 = dict(
name="c4 关系记忆：让 RNN 的记忆槽互相交流",
why=("LSTM 的记忆是一条 H 维向量，各维度「老死不相往来」：要同时追踪多个实体时，更新实体 A 的表示可能践踏"
     "实体 B，实体间关系也没有显式通道。RMC 把记忆升级为 N×W 的槽位矩阵，每个时间步用多头自注意力让槽位"
     "互相同步，再残差+前馈——本质是「每来一步输入，就给记忆矩阵过一个 Transformer 层」。多实体追踪任务上"
     "它把 LSTM 的 60-70% 拉到 95%+，也预示了 Transformer-XL、状态空间模型「固定大小记忆」的技术路线。"),
intuition=("LSTM 的记忆像一排各自密封的便利贴，只能整排重写；RMC 的记忆是一块公共白板：每来一条新消息，先"
           "贴上去，然后所有槽位开一场圆桌会（自注意力）互相核对笔记，最后各自修订自己那一栏。信息不再靠"
           "「挤进一个向量」求生存，而是靠「槽位之间的对话」组织起来。"),
code='''import numpy as np
rng = np.random.default_rng(3)
N, W = 3, 4
M = np.eye(N, W)                                  # 3 个槽位各记一个实体(正交)
x = np.array([0.5, -0.5, 0.2, 0.1])
M_in = M + x                                      # 输入注入
Wq, Wk = rng.normal(0, .8, (W, W)), rng.normal(0, .8, (W, W))
Q, K, V = M_in @ Wq, M_in @ Wk, M_in
Att = np.exp(Q @ K.T / np.sqrt(W)); Att /= Att.sum(1, keepdims=True)
M_out = np.tanh(Att @ V + M)                      # 注意力 + 残差
def cos(a, b): return float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b)))
print("更新前 槽0vs槽1 相似度: %.3f" % cos(M[0], M[1]))
print("更新后 槽0vs槽1 相似度: %.3f" % cos(M_out[0], M_out[1]))
print("槽位间注意力:\\n", np.round(Att, 2))''',
expected=("实测：更新前槽 0 与槽 1 余弦相似度 0.000（正交孤立）；一步自注意力后升至 0.512，注意力矩阵显示"
          "槽间以 0.06~0.67 的强度互相读取（如槽 0 以 0.67 读自己、0.27 读槽 2）——记忆槽从「各自保密」"
          "变为「互通有无」。"),
cerr=("注意力打分忘除以 sqrt(W)，点积随维度增大使 softmax 饱和、梯度消失；残差连接漏掉 M_{t-1}，每步记忆被"
      "整体覆盖退化为无记忆注意力；槽位数 N 设得过大，O(N²) 注意力让逐时间步的训练慢到不可用。"),
miscon=("1. **RMC=更大的 LSTM**——记忆从向量变矩阵、槽位间有显式交互，是结构差异不是规模差异；\n"
        "2. **自注意力必须并行全序列**——RMC 恰恰逐时间步更新固定记忆，用 O(T·N²) 换长序列的线性开销；\n"
        "3. **语言建模提升小=没用**——它的价值在多实体追踪与 RL 记忆，思想延续到 Transformer-XL 与 SSM。"),
connection=("- **向前**：c3 RN 的两两比较是其注意力交互的前身，c1 NTM 的外部记忆被换成「自注意力交流」；\n"
            "- **向后**：Transformer-XL / Compressive Transformer 的记忆缓存、Mamba/RWKV 的固定状态是同一命题的现代答案；\n"
            "- **平行**：记忆增强网络（DNC/Memorizing Transformer）同属「固定预算存历史」家族。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 病灶 | LSTM 向量记忆无结构、无交互、更新互相干扰 |\n"
         "| 药方 | N×W 槽位矩阵 + 每步多头自注意力 + 残差前馈 |\n"
         "| 同构 | 一步更新 = 对记忆矩阵过一层 Transformer |\n"
         "| 战绩 | 多实体追踪 60-70% → 95%+ |\n"
         "| 手算锚点 | 槽间相似度 0.000 → 0.512（一步注意力） |"),
ref="本课程整理（可参见论文原文：Santoro et al., Relational recurrent neural networks, arXiv:1806.01822）",
)

C5 = dict(
name="c5 消息传递：在图结构上做深度学习",
why=("分子是天然的图：原子是节点、化学键是边。预测分子性质，量子化学计算（DFT）精确但一个分子要算几小时，"
     "分子指纹+回归快但手工特征表达力有限，SMILES+RNN 则丢掉图结构。MPNN 论文把散落的图神经网络统一成"
     "「消息计算 → 聚合 → 更新」三段框架，在 QM9 上以快约六个数量级的速度逼近化学精度（1 kcal/mol）。"
     "今天几乎所有 GNN 论文都用这套框架表述——它是图深度学习的通用语法。"),
intuition=("小区传八卦：每个住户（节点）先给所有邻居发消息（消息函数），把收到的八卦全部倒进一个袋子求和"
           "（聚合——谁先谁后无所谓，所以换门牌号也不会乱），再结合自己原有的认知更新判断（更新函数）。"
           "传 T 轮八卦就扩散 T 跳；最后把全楼住户的判断汇总（readout），得出整栋楼的评分（分子性质）。"),
code='''import numpy as np
rng = np.random.default_rng(4)
A = np.array([[0,1,1,0,0],[1,0,1,0,0],[1,1,0,1,0],[0,0,1,0,1],[0,0,0,1,0]], float)
X = np.array([[1,0],[0,1],[1,1],[0,0],[1,0]], float)
Wm, Wu = rng.normal(0, .7, (2, 2)), rng.normal(0, .7, (2, 2))
def mpnn(X, A, T=2):
    H = X.copy()
    for _ in range(T):
        H = np.tanh(H @ Wu + (A @ H) @ Wm)     # sum 聚合 + 更新
    return H, H.sum(0)
H, g1 = mpnn(X, A)
perm = [3, 0, 2, 4, 1]
_, g2 = mpnn(X[perm], A[np.ix_(perm, perm)])
print("图表示:", np.round(g1, 4))
print("置换后:", np.round(g2, 4), "| 置换不变:", bool(np.allclose(g1, g2)))
print("节点0(2跳):", np.round(H[0], 3))''',
expected=("实测：图表示 [3.5078, 1.8789]；节点按 [3,0,2,4,1] 重编号后重跑消息传递，图表示逐位一致"
          "（allclose=True）——sum 聚合的置换不变性；T=2 轮后节点 0 的感受野已覆盖 2 跳邻居。"),
cerr=("聚合用拼接破坏置换不变性，节点顺序一变结果就变；把消息轮数 T 堆到几十层造成过平滑，所有节点表示趋同；"
      "readout 用 mean 抹平分子大小差异，不同大小的分子得到相同图表示。"),
miscon=("1. **GNN=图上的 CNN**——CNN 邻居固定有序，GNN 邻居可变无序，必须用置换不变聚合；\n"
        "2. **消息传得越远越好**——T 跳感受野换来过平滑与过挤压，远距离依赖要靠残差/全局注意力补；\n"
        "3. **MPNN 只是分子工具**——它是 GCN/GAT/GraphSAGE/GIN 的统一表述，推荐系统与知识图谱同在用。"),
connection=("- **向前**：c3 RN 是「全连接图上的 MPNN」（g_θ 即消息函数、Σ 即聚合）；\n"
            "- **向后**：AlphaFold 的图注意力、paper-vision 的视觉结构是消息传递的规模化应用；\n"
            "- **平行**：c6 的集合 readout 与 Deep Sets 同为置换不变聚合。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 三阶段 | 消息 m=M(h_v,h_w,e) → 聚合 Σ → 更新 U，重复 T 轮 |\n"
         "| 聚合原则 | sum/mean/max/attention 都置换不变，sum 保留数量 |\n"
         "| readout | 节点表示 → 图表示（sum 或 Set2Set） |\n"
         "| 战绩 | QM9 接近化学精度，比 DFT 快约 10^6 倍 |\n"
         "| 手算锚点 | 节点重编号后图表示逐位不变 |"),
ref="本课程整理（可参见论文原文：Gilmer et al., Neural Message Passing for Quantum Chemistry, arXiv:1704.01212）",
)

C6 = dict(
name="c6 Order Matters：集合的顺序为什么重要",
why=("集合无序、RNN 有序——用 seq2seq 吃集合，同一道题换个输入顺序答案就变，论文实验里凸包与集合相似度"
     "任务的顺序一致性最差。解法一轻一重：轻则训练时随机打乱输入，逼模型学出顺序不变性；重则 Read-Process-Write "
     "三段架构——Read 用求和把集合压成顺序无关表示，Process 在表示上迭代思考，Write 再生成有序输出。"
     "「输入消序、输出保序」这个精细区分，正是 Deep Sets、Set Transformer 与「无位置编码即集合模型」的理论先声。"),
intuition=("评委给十位选手打分：正确做法是把十张评分表叠起来加权求总（顺序无关），而不是按上场顺序串着听"
           "（后面的选手天然占记忆便宜）。但宣布名次时必须有序——输入是集合，输出是序列。"
           "Read-Process-Write 就是「先汇总打分，再单独想清楚，最后按序宣布」的流程化。"),
code='''import numpy as np
rng = np.random.default_rng(5)
X = rng.normal(0, 1, (5, 3))
perm = rng.permutation(5)
read_sum = lambda X: X.sum(0)
def read_rnn(X):
    h = np.zeros(3)
    for x in X: h = np.tanh(h + x)
    return h
s1, s2 = read_sum(X), read_sum(X[perm])
r1, r2 = read_rnn(X), read_rnn(X[perm])
print("sum 读出 置换不变:", bool(np.allclose(s1, s2)))
print("RNN 读出顺序敏感: 距离 = %.3f" % np.linalg.norm(r1 - r2))
print("Write 输出(降序):", np.round(np.sort(X.sum(1))[::-1], 2))''',
expected=("实测：sum 读出置换前后 allclose=True（完全不变）；RNN 读出距离 0.651（>0，顺序敏感）；"
          "Write 阶段输出降序 [1.67, 0.84, 0.67, -0.59, -2.37]——同一模型内「输入消序、输出保序」并存。"),
cerr=("把随机打乱当万能药——它靠数据增广硬学不变性，集合大时排列爆炸，结构化求和更省；Process 阶段仍在处理"
      "有序输入（没先聚合），顺序偏差照样漏进来；Write 阶段也用无序聚合，输出名次混乱。"),
miscon=("1. **「顺序不重要」是论文结论**——恰恰相反：输入要消除顺序依赖，输出要保留顺序，标题是双重含义；\n"
        "2. **求和聚合无损**——大集合会丢失区分度，{1,9} 与 {5,5} 的和相同；\n"
        "3. **Transformer 天生处理集合**——去掉位置编码才是，加回位置编码就回到序列模型，这正是本思想的体现。"),
connection=("- **向前**：c2 Pointer 的 Write 阶段可与其结合（输出指向输入位置），同作者互补两篇；\n"
            "- **向后**：Deep Sets 的 ρ(Σφ(x)) 理论、Set Transformer、无位置编码的注意力=集合模型；\n"
            "- **平行**：c5 MPNN 的 readout 同为置换不变聚合。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 矛盾 | 集合无序 vs RNN 有序，顺序敏感在集合任务上是 bug |\n"
         "| 轻解法 | 训练时随机打乱输入，数据增广逼出不变性 |\n"
         "| 重解法 | Read(求和)→Process(迭代)→Write(有序解码) |\n"
         "| 关键区分 | 输入消序、输出保序 |\n"
         "| 手算锚点 | sum 读出不变 vs RNN 读出漂移 0.651 |"),
ref="本课程整理（可参见论文原文：Vinyals, Bengio & Kudlur, Order Matters: Sequence to Sequence for Sets, arXiv:1511.06391）",
)

THEMES = {
    "paper-reasoning-c1": C1, "paper-reasoning-c2": C2, "paper-reasoning-c3": C3,
    "paper-reasoning-c4": C4, "paper-reasoning-c5": C5, "paper-reasoning-c6": C6,
}

GOALS = {
"paper-reasoning-c1-l1": ("1. 说明 RNN 隐藏状态记忆的四大限制（容量固定/不可寻址/难扩展/互相干扰）"
                          "与 NTM「外部记忆+可微读写」的应对思路；\n"
                          "2. 手推内容寻址三步（余弦相似度→softmax 锐化→加权读出）与位置寻址三步"
                          "（插值→移位→锐化），解释每一步为什么必须可微；\n"
                          "3. 用 numpy 实现软寻址读写，验证 key 靠近哪个槽位注意力就指向哪里，"
                          "以及擦除-添加写入门控的工作方式。"),
"paper-reasoning-c2-l1": ("1. 说清凸包/TSP/排序的输出为何是「输入位置的排列/子集」，以及固定词表 seq2seq "
                          "的两难（词表爆炸、位置对应关系学不到）；\n"
                          "2. 手推加性指针注意力 u_i=v^T tanh(W1 h_i + W2 s_t) 经 softmax 得到 n 维输出分布，"
                          "说出它与标准注意力的唯一差别（不聚合、直接输出）；\n"
                          "3. 用 numpy 实现指针分布并完成贪心 TSP 演算，验证输出维度随输入长度自适应。"),
"paper-reasoning-c3-l1": ("1. 解释 CNN/RNN 做关系推理的缺陷（局部性、无显式比较）与 CLEVR 上的实验证据；\n"
                          "2. 手写 RN(O)=f_φ(Σ g_θ(o_i,o_j))，说明全配对（含 i=j）、共享 g、求和聚合三个设计"
                          "各自的价值，尤其求和如何保留计数信息；\n"
                          "3. 用 numpy 实现 RN 模块，验证关系和对物体数量敏感（红红配对数=k²）。"),
"paper-reasoning-c4-l1": ("1. 指出 LSTM 向量记忆在多实体场景的四个毛病（无结构/无交互/难扩展/更新干扰）；\n"
                          "2. 手写 RMC 一步更新（输入注入→多头自注意力→残差归一→前馈），说明它与 Transformer "
                          "层的同构关系；\n"
                          "3. 用 numpy 实现单步自注意力记忆更新，验证孤立槽位经注意力后产生交互（相似度从 0 变正）。"),
"paper-reasoning-c5-l1": ("1. 说明图数据与网格/序列的本质差异（邻居数可变、无自然顺序）与三大归纳偏置"
                          "（置换不变、沿边局部、可变大小）；\n"
                          "2. 手写 MPNN 三阶段（消息→聚合→更新）与 readout，解释求和聚合为何同时给出"
                          "置换不变与计数保留；\n"
                          "3. 用 numpy 在 5 节点图上传 2 轮消息，验证节点重编号后图表示完全不变。"),
"paper-reasoning-c6-l1": ("1. 复述「集合无序 vs RNN 有序」的矛盾与论文的顺序敏感性实验证据（凸包/集合相似度）；\n"
                          "2. 手写 Read（求和聚合）-Process（迭代）-Write（有序解码）结构，说明三段各自与"
                          "顺序的关系（前两段不变、末段有意保序）；\n"
                          "3. 用 numpy 对比 sum 读出与 RNN 读出在置换下的行为差异，验证求和不变、RNN 漂移。"),
}

PREREQS = {
"paper-reasoning-c1-l1": "- RNN/LSTM 的门控与隐藏状态（深度学习课程）；\n- softmax 与余弦相似度的计算。",
"paper-reasoning-c2-l1": "- seq2seq 与注意力机制（编码器-解码器框架）；\n- softmax 与 argmax 解码；\n- c1 的软寻址直觉。",
"paper-reasoning-c3-l1": "- MLP 与全连接层；\n- VQA 任务形式（图像+问题→答案）；\n- 集合求和的置换不变性直觉。",
"paper-reasoning-c4-l1": "- LSTM 门控记忆（深度学习课程）；\n- 自注意力 QKV 计算（c1 内容寻址 / Transformer 基础）；\n- c3 的两两比较视角。",
"paper-reasoning-c5-l1": "- 邻接矩阵与图的基本表示；\n- 置换不变概念（c3 已建立）；\n- MLP。",
"paper-reasoning-c6-l1": "- seq2seq 与 c2 指针网络（同作者系列）；\n- 置换不变概念（c3/c5 已铺垫）。",
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
