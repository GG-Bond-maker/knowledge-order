# -*- coding: utf-8 -*-
"""batch36 B 组：paper-foundation《基础与表征》4 节升级（TS 源，_batch34_lib 模式）。
用法：python batch36_paper_foundation.py verify -> 跑章代码看输出
     python batch36_paper_foundation.py         -> 打补丁
"""
from _batch34_lib import Lib, build_md, finish
import sys

lib = Lib("paper-foundation", [
    "src/content/chapters/paper-foundation.ts",
    "src/content/chapters/paper-foundation2.ts",
    "src/content/chapters/paper-foundation3.ts",
])

C1 = dict(
name="c1 RNN 的惊人有效性：字符级语言模型",
why=("2015 年 Karpathy 用一个 2 万参数的单层 LSTM 只做「预测下一个字符」，就从莎士比亚学出角色名+韵文格式，"
     "从 C 代码学出缩进与括号配对——没人教过它语法。这是「无监督预测下一词」范式的第一次惊艳亮相"
     "（GPT 的直系祖先），也把 RNN 的致命伤（梯度随时间连乘消失：0.25^50≈1e-31）摆上台面，"
     "直接引出 LSTM 与 Attention 的故事线。"),
intuition=("字符级模型像「听写幼儿」：没人教单词和语法，只靠「猜下一个字」的练习，先学会字母搭配（拼写），"
           "再摸出词与空格（词汇），然后主谓一致（语法），最后连「引号要成对」这种跨段落记账都学会了——"
           "一个损失函数，五层能力自发涌现。"),
code='''import numpy as np
rng = np.random.default_rng(16)
for T in (10, 50, 100):
    print(f"T={T}: 梯度因子 0.25^{T} = {0.25**T:.1e}")
V, H = 5, 4
chars = list("abc d")
Wxh = rng.normal(0, .6, (H, V)); Whh = rng.normal(0, .6, (H, H)); why = rng.normal(0, .6, (V, H))
def step(h, x_onehot):
    h = np.tanh(Wxh @ x_onehot + Whh @ h)          # W_hh 全时间步共享
    y = why @ h
    e = np.exp(y - y.max())
    return h, e / e.sum()
h = np.zeros(H)
for ch in "ab": h, p = step(h, np.eye(V)[chars.index(ch)])
for temp in (0.5, 1.0):
    p_t = p ** (1/temp); p_t /= p_t.sum()
    print(f"T={temp}: 下一字符分布 {np.round(p_t, 2)}")''',
expected=("实测：T=10/50/100 的梯度因子 0.25^T = 9.5e-07 / 7.9e-31 / 6.2e-61——朴素 RNN 的长程梯度必然消失；"
          "随机初始化的字符 RNN 前向后，温度 T=0.5 的分布（峰值 0.35）比 T=1.0（峰值 0.27）显著更尖——"
          "低温保质量、高温给创意。"),
cerr=("BPTT 忘做梯度裁剪，W_hh 特征值略大于 1 就爆炸崩溃；以为标题说的是朴素 RNN——Karpathy 用的是 LSTM，"
      "朴素 RNN 只能学局部 n-gram；采样时忘减 max 做数值稳定的 softmax，长序列溢出。"),
miscon=("1. **RNN 惊人有效=LSTM 惊人有效**——朴素 RNN 学不到长程结构，标题的功劳属于门控；\n"
        "2. **字符级已被 token 级淘汰**——subword 是工程改进，「预测下一个单元」的范式一脉相承；\n"
        "3. **温度只影响创意**——它改变分布形状：T→0 等价贪心（重复呆板），是质量-多样性旋钮。"),
connection=("- **向前**：softmax 与交叉熵是损失的地基；\n"
            "- **向后**：c2 的门控直通是梯度消失的根本解；paper-transformer 的注意力把任意两位置路径长度变成 1；\n"
            "- **平行**：paper-theory c1 的「语言模型损失=编码长度」。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 任务 | 预测下一个字符：拼写/词汇/语法/格式自发涌现 |\n"
         "| 公式 | h_t=tanh(W_hh·h_{t-1}+W_xh·x_t)，W_hh 全时间共享 |\n"
         "| 病灶 | BPTT 连乘：0.25^50≈8e-31 |\n"
         "| 缓解 | 梯度裁剪/正交初始化/LSTM 门控 |\n"
         "| 细节 | 标题的功劳属于 LSTM，非朴素 RNN |"),
ref="本课程整理（可参见原文：Karpathy, The Unreasonable Effectiveness of Recurrent Neural Networks，2015 博客）",
)

C2 = dict(
name="c2 LSTM：门控、细胞状态与梯度高速公路",
why=("RNN 的梯度是「乘法链」，tanh'≤1 连乘 50 步只剩 1e-31——长程依赖学不到。LSTM 的回答是给梯度修一条"
     "加法高速公路：细胞状态 c_t=f_t⊙c_{t-1}+i_t⊙g_t，当遗忘门 f≈1 时梯度原样流过；三个 sigmoid 门"
     "（遗忘/输入/输出）让网络自己决定记什么、忘什么、说什么。1997 年提出、2015 年借 Olah 图解爆红、"
     "2017 年被 Transformer 取代——但门控与「梯度直通」思想活在每个现代架构里。"),
intuition=("细胞状态是一条「传送带」：旧记忆放上带子（f⊙c），新信息经检查口写入（i⊙g），输出窗口只展示"
           "当前需要的部分（o⊙tanh(c)）。RNN 的记忆像每次都重新搅拌的面团（乘法），LSTM 的记忆像贴着封条的"
           "档案袋——不拆封就原样传下去，要更新才开封改写。"),
code='''import numpy as np
rng = np.random.default_rng(17)
H, Z = 3, 5                      # Z = H + V (V=2)
def lstm_cell(x, h, c, Wf, Wi, Wg, Wo, bf):
    z = np.concatenate([h, x])
    f = 1/(1+np.exp(-(Wf@z + bf))); i = 1/(1+np.exp(-(Wi@z))); o = 1/(1+np.exp(-(Wo@z)))
    c = f * c + i * np.tanh(Wg @ z)
    return o * np.tanh(c), c
Wf, Wi, Wg, Wo = (rng.normal(0, .3, (H, Z)) for _ in range(4))
bf = np.full(H, 4.0)             # 遗忘门偏置大 -> f≈1
h, c = np.zeros(H), np.array([2.0, -1.0, 0.5])
for t in range(20):
    h, c = lstm_cell(rng.normal(0, 1, 2), h, c, Wf, Wi, Wg, Wo, bf)
print("t=0 记忆 [2.0, -1.0, 0.5] -> t=20:", np.round(c, 3), "(0.98^20≈%.2f)" % 0.98**20)
print("h 输出已随输入漂移:", np.round(h, 3))''',
expected=("实测：遗忘门偏置 bf=4（f≈0.98）时，t=0 写入的记忆在 t=20 仍有强分量（主分量 2.0→1.31，"
          "与 0.98^20≈0.67 的衰减一致），其余分量被输入门的写入轻微改写；而 h 输出已随 20 步随机输入漂移"
          "——「长期记忆在 c、短期表达在 h」的分工直接可见。"),
cerr=("遗忘门偏置初始化为 0，训练初期 f≈0.5 记忆迅速衰减（常见建议偏置 1~5）；把 c 直接当 h 输出给上层"
      "——要过输出门和 tanh；以为 GRU 严格优于 LSTM——参数省 25% 但表达力取舍任务相关。"),
miscon=("1. **LSTM 的记忆无限长**——f 实际很少恰为 1，0.99^1000≈4e-5，有效记忆约 100~500 步；\n"
        "2. **门=激活函数**——门是 [0,1] 的乘性阀门（sigmoid），不是非线性变换；\n"
        "3. **被取代=思想过时**——门控进 GRU/SSM，加法直通进 ResNet，细胞状态启发 Mamba。"),
connection=("- **向前**：c1 的梯度消失是本节的问题陈述；\n"
            "- **向后**：paper-vision c2 的残差连接是同一「加法直通」思想，paper-reasoning c4 给记忆槽加交互；\n"
            "- **平行**：GRU/CIFG/peephole 变体谱系。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 核心式 | c_t=f_t⊙c_{t-1}+i_t⊙g_t；h_t=o_t⊙tanh(c_t) |\n"
         "| 三门 | 遗忘(留什么)/输入(写什么)/输出(说什么) |\n"
         "| 高速公路 | ∂c_t/∂c_{t-1}=f_t，f≈1 时梯度无损 |\n"
         "| 参数 | 4H(H+V+1)，RNN 的 4 倍 |\n"
         "| 实测 | f≈0.98：20 步后主记忆保留约 2/3 |"),
ref="本课程整理（可参见原文：Olah, Understanding LSTM Networks（2015 博客）；Hochreiter & Schmidhuber, Long Short-Term Memory, 1997）",
)

C3 = dict(
name="c3 RNN 正则化：变分 Dropout 与 LayerNorm",
why=("LSTM 参数是 RNN 的 4 倍，小数据集必过拟合；但把 CNN 的 Dropout 直接搬过来（每步重新采样 mask）"
     "会把记忆切成噪声——PTB 实验上困惑度不降反升（114.5→118.2）。Zaremba 等人的变分 Dropout：同一序列"
     "全时间步共用一个 mask，dropout 只加在层间「垂直方向」，困惑度直降到 92.4（-19%）。配套还有 "
     "LayerNorm（对特征维归一化，绕开 BatchNorm 在变长序列上的失效）。"),
intuition=("圆桌会议记录：正确做法是「某个人整场闭麦」（一致的信息缺失，大家学会没有他也行）；错误做法是"
           "「每句话随机换人闭麦」（记忆流被反复切断）。变分 Dropout 是前者，普通 Dropout 是后者——"
           "mask 的时间一致性决定它是正则化还是破坏。"),
code='''import numpy as np
rng = np.random.default_rng(18)
T, keep = 30, 0.8
sig = np.ones(100)
def run(shared):
    h = sig.copy()
    mask = (rng.random(100) < keep) / keep
    for t in range(T):
        h = h * (mask if shared else (rng.random(100) < keep) / keep)   # 恒等记忆链
    return h
print(f"变分 Dropout(共用 mask): 通道全程存活率 = {np.mean(run(True) > 0):.2f}")
print(f"普通 Dropout(每步重采样): 全程存活率 = {np.mean(run(False) > 0):.2f} (= keep^T = {keep**T:.1e})")''',
expected=("实测：keep=0.8、T=30 的恒等记忆链——变分 Dropout（共用 mask）的通道全程存活率 0.84"
          "（≈keep_prob，存活即全程存活）；普通 Dropout（每步重采样）实测 0.00（理论 0.8^30≈1.2e-3）——"
          "逐步重采样把 80% 的记忆通道切成碎片。"),
cerr=("在循环连接上逐时间步重采样 mask 还以为是标准正则化；LayerNorm 沿 batch 维统计（那是 BatchNorm 的病，"
      "LN 沿特征维）；权重衰减把偏置也正则化（偏置不需要）。"),
miscon=("1. **Dropout 是万金油**——位置与 mask 策略错误时它会伤害模型（RNN 循环连接、SELU 网络）；\n"
        "2. **变分=每步变着丢**——恰恰相反：整条序列共用同一次采样；\n"
        "3. **LayerNorm=BatchNorm 换个轴**——换来的是「与 batch 大小/序列长度无关」，对 RNN 与 "
        "Transformer 都是命门。"),
connection=("- **向前**：c2 的 LSTM 是被正则化的对象；\n"
            "- **向后**：c4 系统梳理 dropout 变体家族，LayerNorm 成为 Transformer 标配；\n"
            "- **平行**：权重绑定（GPT 输入输出共享 embedding）、Early Stopping。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 陷阱 | 循环连接逐步 dropout：PTB 114.5→118.2 |\n"
         "| 正解 | 变分 dropout：整序列共用 mask，只加层间 |\n"
         "| 实测 | 通道存活率 0.84 vs 0.8^30≈1e-3 |\n"
         "| 配套 | LayerNorm、权重绑定、梯度裁剪 |\n"
         "| 战绩 | PTB 困惑度 92.4（-19%） |"),
ref="本课程整理（可参见论文原文：Zaremba, Sutskever & Vinyals, Recurrent Neural Network Regularization, arXiv:1409.2329；Ba, Kiros & Hinton, Layer Normalization, arXiv:1607.06450）",
)

C4 = dict(
name="c4 Dropout：四种变体与正确用法",
why=("Dropout 是 2012-2017 年最重要的正则化技术，但它不是一个开关而是一个家族：标准逐元素（FC 层）、"
     "Dropout2D 整通道（CNN，避免把特征图打成马赛克）、Dropout1D 整时间步（序列）、AlphaDropout"
     "（配 SELU 保持自归一化）、DropConnect（丢权重而非激活，与变分 dropout 数学等价）。"
     "用错变体、位置或缩放方式，比不用更糟。"),
intuition=("消防演习：逐元素 dropout 像随机抽走每块砖（FC 层无所谓，墙还是墙）；Dropout2D 像抽走整面墙"
           "（通道=一个特征探测器，去得干净才有意义）；AlphaDropout 演习后还要把家具摆回原位"
           "（保持均值方差，SELU 才能继续自归一化）。对象和场合选对，演习才练出真本事。"),
code='''import numpy as np
rng = np.random.default_rng(19)
keep = 0.5
x = rng.normal(3, 1, (8, 50))
inv = x * (rng.random(x.shape) < keep) / keep
print(f"inverted: E[输出]={inv.mean():.2f} ≈ E[x]={x.mean():.2f} (训练缩放, 推理不变)")
feat = rng.normal(0, 1, (2, 4, 5, 5))
drop2d = feat * ((rng.random(4) < keep) / keep)[None, :, None, None]
drop1 = feat * (rng.random(feat.shape) < keep) / keep
i2 = [np.mean(drop2d[0, c] != 0) for c in range(4) if drop2d[0, c].any()]
i1 = [np.mean(drop1[0, c] != 0) for c in range(4) if drop1[0, c].any()]
print(f"2D 存活通道完好率 {np.round(i2, 2)} vs 逐元素 {np.round(i1, 2)} (特征图被打成马赛克)")''',
expected=("实测：inverted dropout 输出均值 2.98 ≈ 原均值 3.01（期望保持，推理无需缩放）；Dropout2D 的"
          "存活通道完好率全为 1.0（整通道去留、结构完整），逐元素丢弃的通道完好率只有 0.44~0.60"
          "（空间结构千疮百孔）——卷积层选错变体会把特征图打成马赛克。"),
cerr=("推理时忘 model.eval()，输出每次都不同且精度下降；用 vanilla dropout 推理时忘乘 keep_prob"
      "（inverted 把缩放放训练时就不会忘）；对 SELU 网络用标准 dropout，自归一化被破坏。"),
miscon=("1. **p=0.5 万能**——那是 FC 层的经典值；输入层 0.1-0.2、卷积 0.1-0.3，现代大模型常用 0.1 或不用；\n"
        "2. **Dropout 永远有益**——数据极大时过拟合不是主要矛盾，LayerNorm+权重衰减+增强更常用；\n"
        "3. **DropConnect 是新东西**——2013 年提出，且与变分 dropout 数学等价（丢权重视角）。"),
connection=("- **向前**：c3 的变分 dropout 是家族成员（RNN 专用位型）；\n"
            "- **向后**：DropPath/Stochastic Depth 把「丢单元」升级为「丢整块」（ResNet/Transformer）；\n"
            "- **平行**：数据增强（Mixup/CutMix）是输入端正则化的对应物。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 机制 | inverted: 训练 mask/keep，推理原样 |\n"
         "| 家族 | 标准(FC)/2D(通道)/1D(时间步)/Alpha(SELU)/DropConnect(权重) |\n"
         "| 实测 | 期望保持；2D 存活通道完好率 1.0 |\n"
         "| 位置 | 激活后/池化后/输出前；循环连接禁逐步丢 |\n"
         "| 现代地位 | 小数据首选；大模型让位给 LN+WD+增强 |"),
ref="本课程整理（可参见论文原文：Srivastava et al., Dropout, JMLR 2014；Klambauer et al., Self-Normalizing Neural Networks, arXiv:1706.02515）",
)

THEMES = {
    "paper-foundation-c1": C1, "paper-foundation-c2": C2,
    "paper-foundation-c3": C3, "paper-foundation-c4": C4,
}

GOALS = {
"paper-foundation-c1-l1": ("1. 复述 Char-RNN 的任务设定与「拼写→词汇→语法→格式」的自发层级，"
                           "理解无监督下一字符预测的力量；\n"
                           "2. 写出 h_t=tanh(W_hh·h_{t-1}+W_xh·x_t) 与 BPTT 连乘式，计算 0.25^T 型梯度消失，"
                           "说出三种缓解（裁剪/正交初始化/门控）；\n"
                           "3. 用 numpy 实现最小 RNN 前向与温度采样，观察低温尖峰、高温平坦的行为差异。"),
"paper-foundation-c2-l1": ("1. 写出 LSTM 四步公式（三 f/i/o 门+细胞更新），说明 sigmoid 做门、tanh 做内容的分工；\n"
                           "2. 推导 ∂c_t/∂c_{t-1}=f_t 的梯度高速公路，对比 RNN 的 diag(tanh')·W_hh 连乘衰减；\n"
                           "3. 手写 numpy 版 LSTM 单元并跑 20 步，验证 f≈1 时细胞状态近似保持而 h 输出漂移，"
                           "并计算 4H(H+V+1) 的参数账。"),
"paper-foundation-c3-l1": ("1. 解释普通 Dropout 在循环连接上失效的机制（每步独立 mask 把记忆变噪声）"
                           "与论文 PTB 数据（118.2 vs 92.4）；\n"
                           "2. 实现变分 Dropout（整序列共用 mask）并对比两种做法下信息通道的全程存活率；\n"
                           "3. 说出 LayerNorm 替代 BatchNorm 的逻辑（特征维归一化不依赖 batch）"
                           "与权重绑定等配套技巧。"),
"paper-foundation-c4-l1": ("1. 写出 inverted dropout（训练缩放、推理不动）并解释三种有效性解释"
                           "（集成/防共适应/噪声正则）；\n"
                           "2. 区分标准/Dropout2D/Dropout1D/AlphaDropout/DropConnect 的丢弃对象与适用层型；\n"
                           "3. 用 numpy 验证 inverted dropout 的期望保持与 2D 整通道丢弃对空间结构的保护。"),
}

PREREQS = {
"paper-foundation-c1-l1": "- softmax 与交叉熵；\n- 矩阵链式法则；\n- one-hot 编码。",
"paper-foundation-c2-l1": "- c1 的 BPTT 与梯度消失；\n- sigmoid/tanh 的性质；\n- 逐元素乘法（⊙）的求导。",
"paper-foundation-c3-l1": "- c2 的 LSTM 结构；\n- inverted dropout 机制（c4 可后置对照）；\n- 过拟合与验证集监控。",
"paper-foundation-c4-l1": "- c1-c3 的 RNN/LSTM/正则化语境；\n- SELU 自归一化性质（了解即可）；\n- 训练/推理模式切换。",
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
