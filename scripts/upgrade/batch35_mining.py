# -*- coding: utf-8 -*-
"""batch35 p8：mining 5 门共 20 节章主题包升级（TS 源 mining-*.ts / *2.ts）。"""
from _batch34_lib import Lib, build_md, finish
import sys

LIBS = {
    "mining-prep": Lib("mining-prep", ["src/content/chapters/mining-prep.ts", "src/content/chapters/mining-prep2.ts"]),
    "mining-cluster": Lib("mining-cluster", ["src/content/chapters/mining-cluster.ts", "src/content/chapters/mining-cluster2.ts"]),
    "mining-freq": Lib("mining-freq", ["src/content/chapters/mining-freq.ts", "src/content/chapters/mining-freq2.ts"]),
    "mining-graph": Lib("mining-graph", ["src/content/chapters/mining-graph.ts", "src/content/chapters/mining-graph2.ts"]),
    "mining-recsys": Lib("mining-recsys", ["src/content/chapters/mining-recsys.ts", "src/content/chapters/mining-recsys2.ts"]),
}
REF = "本课程整理（可参见 Han, Kamber & Pei《数据挖掘：概念与技术》相应章节与 scikit-learn 官方文档）"

T = {}; G = {}; P = {}; C = {}

# ═════ mining-prep ═════
T["mining-prep","c1"] = dict(
expected="""缺失率：MCAR 21%、MAR(>60 岁) 2%、MNAR(高收入) 10%；真实 income 中位数 22034，MCAR 填补后 22757 无偏，MNAR 填补后 20943 系统性偏低（缺失即信息）；MAD 检出异常值 [500.]；缺失指示器与收入相关性 -0.03（本例弱，实际常是强特征）。""",
why=("缺失值不是『没有值』而是有机制（MCAR/MAR/MNAR）的信息；异常值可能是错误也可能是金矿；重复数据让模型"
     "在验证集上作弊。数据质量三件事决定后面所有建模的下限——处理前先问『为什么缺』。"),
intuition=("缺失像问卷里的空题：有人随机漏题（MCAR），有人因『收入太高不好意思填』而空（MAR，能用其他列推断），"
           "有人因『病得越重越不填』而空（MNAR，空本身即信号）。填补像修补瓷瓶：均值是胶水（便宜但留痕），"
           "模型填补是金缮（贵但尊重纹理），缺失指示器则是给裂缝贴上标签让模型自己看见。"),
cerr=("不问机制直接 dropna（MNAR 下引入选择偏差）；用均值填补被异常值污染的列（应中位数）；"
      "填补在 train/test 划分之前做（测试集统计量泄漏进训练）。"),
miscon=("1. **『缺失=坏数据』**——MNAR 的缺失本身就是强特征（缺失指示器常常比填补值更有信息量）；\\n"
        "2. **『异常值一律删除』**——先判来源：录入错误可删，真实极值（如高价值客户）要保留甚至单独建模；\\n"
        "3. **『去重只看整行相同』**——同一用户重复提交的近似记录（时间戳差几秒）才是重灾区。"),
connection=("- **向前**：c2 的缩放与离散化以本章的干净数据为前提；\n"
            "- **向后**：c4 的不平衡与泄漏是质量问题的两个高危特例；\n"
            "- **平行**：llm-a5 的语料清洗与本章共享『先诊断机制再动手』的思想。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 三机制 | MCAR 可删 / MAR 可建模填补 / MNAR 缺失即信息 |\n"
         "| 三策略 | 删除（<5% 且 MCAR）/ 统计量 / 模型填补 |\n"
         "| 指示器 | is_missing 列常常比填补值更有用 |\n"
         "| 异常 | 滚动 MAD 优于 3σ（抗污染）|\n"
         "| 纪律 | 所有填补必须在 train/test 划分之后 |"),
)
T["mining-prep","c2"] = dict(
expected="""Min-Max 被异常值劫持：正常值全部压到 ≤0.011；Z-Score 正常值最大 0.15σ、Robust 2.39 IQR；全量 fit 的 std=344.93 vs 训练集 std=679.53（泄漏）；lognormal 数据等宽 4 箱人数 [994,4,1,1] vs 分位数 [250,250,250,250]。""",
why=("年龄 0~100 与收入 0~1e7 放进同一个距离公式，收入会吞掉年龄的全部发言权。基于距离/梯度的模型"
     "必须先缩放，而树模型不用——『要不要缩放』本身就是一次模型选型判断。"),
intuition=("缩放像统一度量衡：Min-Max 是『全部塞进 [0,1] 的小房间』（一个异常值就能把大家挤到墙角）；"
           "Z-Score 是『按距离均值几个标准差报名』（最通用）；Robust 是『用中位数和 IQR 报名』"
           "（异常值免检通道失效）。离散化是把连续年龄切成『青年/中年/老年』——等宽切被长尾欺骗，"
           "分位数切每箱人数均匀。"),
cerr=("Min-Max 遇上异常值把正常值压成 0.01；在 train+test 全量上 fit 缩放器（统计量泄漏）；"
      "对树模型多此一举地缩放（无收益还拖慢）。"),
miscon=("1. **『所有模型都要归一化』**——树模型按分裂点排序，对单调变换免疫；\\n"
        "2. **『Z-Score 能消除异常值影响』**——只是减小，μ/σ 仍被拉偏，彻底稳健要 Robust；\\n"
        "3. **『训练集测试集分开缩放』**——错！必须用训练集统计量变换测试集，否则泄漏。"),
connection=("- **向前**：c1 处理完异常值才选得出缩放器；\n"
            "- **向后**：mining-cluster 的 K-Means/PCA 对尺度极其敏感；\n"
            "- **平行**：quant-strategy 的因子 Z-Score 标准化是本章在金融截面的应用。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 受影响 | KNN/KMeans/SVM/PCA/NN；树模型免疫 |\n"
         "| Min-Max | 固定 [0,1] 但被异常值劫持 |\n"
         "| Z-Score | 最通用，保留分布形状 |\n"
         "| Robust | 中位数+IQR，完全稳健 |\n"
         "| 铁律 | fit 在训练集，transform 测试集 |"),
)
T["mining-prep","c3"] = dict(
expected="""目标编码泄漏：全量编码版 CV AUC 0.803 vs 折外版 0.624（虚高即线上崩盘）；sin/cos 周期编码把『0 点与 23 点距离』从 23 修复为 1.22；聚合特征：用户 1 历史均值 200，本月 200 = 1.0 倍均值（相对位置信息）。""",
why=("模型的上限由特征决定，调参只能逼近上限。四类构造（数值/类别/时间/文本）+ 三种选择（过滤/包裹/嵌入）"
     "是结构化数据竞赛里收益最大的一环；而目标编码的泄漏陷阱能让离线分数虚高、线上崩盘。"),
intuition=("特征构造像做菜备料：四则运算是切块（单价=总额/数量），聚合是熬汤（把个体值变成『相对群体的位置』"
           "——5000 元消费不如『历史均值的 2.3 倍』），周期编码是把 23 点与 0 点在钟面上接住（sin/cos）。"
           "目标编码像让学生自己改卷（把标签均值填进特征）——必须折外考试才不作弊。"),
cerr=("目标编码不按 fold 计算，标签泄漏导致离线 AUC 0.95 线上 0.6；小时特征直接用 0~23 整数"
      "（23 点与 0 点距离被算成 23）；高基数类别用 One-Hot 爆炸到几千列。"),
miscon=("1. **『特征越多越好』**——冗余与噪声特征稀释信号并放大过拟合，过滤/嵌入选择不可省；\\n"
        "2. **『One-Hot 万能』**——高基数（如商品 ID）用目标/频率/哈希编码；\\n"
        "3. **『时间特征只有小时星期』**——相对时间（距上次购买）与窗口聚合往往更有信息量。"),
connection=("- **向前**：c2 的缩放是数值构造后的最后一步；\n"
            "- **向后**：mining-recsys 的用户画像聚合是时间特征的大成；\n"
            "- **平行**：quant-strategy c3 的中性化回归是『控制变量式特征构造』。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 数值 | 比率/差值/聚合/分位排名/log 长尾 |\n"
         "| 类别 | One-Hot 低基数；目标编码必须 OOF+平滑 |\n"
         "| 时间 | 周期 sin/cos、相对时间、窗口聚合 |\n"
         "| 选择 | 过滤（相关）/包裹（RFE）/嵌入（树重要度）|\n"
         "| 纪律 | 任何用到 y 的编码必须在折外 |"),
)
T["mining-prep","c4"] = dict(
expected="""99% 负例下全预测为负：准确率 99% 但 Recall 0%；SMOTE 在两正例间插值 λ=0.39 生成新样本；ROC 的 FPR=FP/990（FP=50 也只有 5% 显得漂亮）vs PR 的 Precision=10/60=17%（诚实暴露）。""",
why=("诈骗检测正例 0.1%，全预测为负就有 99% 准确率但毫无价值——不平衡本身不是问题，错误的评估与决策才是。"
     "PR 曲线优于 ROC、类权重优于过采样，是极不平衡场景的两个共识。"),
intuition=("不平衡数据的评估像在稻草堆里找针：ROC 是『按比例看捞出多少针』（负例太多时显得漂亮），"
           "PR 是『每捞一把里真有几根针』（诚实得多）。SMOTE 在少数类近邻间插值像在两点间『画连续渐变』，"
           "但类重叠时会画到敌营去；类权重则是直接告诉模型『漏报一根针罚 100，误报罚 1』。"),
cerr=("在验证/测试集上做 SMOTE（合成样本的信息泄漏，分数虚高）；用准确率汇报不平衡任务效果；"
      "scale_pos_weight 设了却还在用默认 0.5 阈值。"),
miscon=("1. **『必须把数据变平衡』**——类权重+正确指标常优于重采样，SMOTE 有生成噪声样本的风险；\\n"
        "2. **『AUC 高=模型好』**——极不平衡下 ROC 被巨大负例基数美化，AUPRC 才诚实；\\n"
        "3. **『阈值固定 0.5』**——阈值是业务决策（漏报成本 vs 误报成本），应按代价曲线选。"),
connection=("- **向前**：c1 的缺失指示器会天然制造不平衡特征；\n"
            "- **向后**：mining-graph c3 的异常检测是不平衡的极端形态；\n"
            "- **平行**：quant-backtest c3 的 DSR 与本章共享『别被表面指标骗』精神。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 本质 | 错误的评估与决策才是问题 |\n"
         "| 指标 | 极不平衡首选 PR/AUPRC + 业务代价 |\n"
         "| 方法 | 类权重（优先）> SMOTE > 随机重采样 |\n"
         "| SMOTE | 插值生成；只在训练集上做 |\n"
         "| 阈值 | 按业务代价曲线选，别用默认 0.5 |"),
)
C[("mining-prep","c1")] = '''import numpy as np, pandas as pd
rng = np.random.default_rng(0)
n = 1000
df = pd.DataFrame({"age": rng.normal(40, 10, n).clip(18, 80), "income": rng.lognormal(10, 0.5, n)})
# ---- 1. 三种缺失机制 ----
df["mcar"] = df["income"]; df.loc[rng.random(n) < 0.2, "mcar"] = np.nan
df["mar"] = df["income"]; df.loc[df["age"] > 60, :] # MAR：高龄更易缺
df.loc[df["age"] > 60, "mar"] = np.nan
df["mnar"] = df["income"]; df.loc[df["income"] > df["income"].quantile(0.9), "mnar"] = np.nan
print("缺失率: MCAR %.0f%% | MAR(>60岁) %.0f%% | MNAR(高收入) %.0f%%" % (
    100*df["mcar"].isna().mean(), 100*df["mar"].isna().mean(), 100*df["mnar"].isna().mean()))
print("真实 income 中位数 %.0f | MCAR 填补后 %.0f | MNAR 填补后 %.0f（系统性偏低=偏差）" % (
    df["income"].median(), df["mcar"].fillna(df["mcar"].median()).median(), df["mnar"].fillna(df["mnar"].median()).median()))
# ---- 2. MAD 异常值 ----
x = np.array([50, 52, 48, 51, 49, 500.0])
med, mad = np.median(x), np.median(np.abs(x - np.median(x)))
print("MAD 检出:", x[np.abs(x - med) > 3*1.4826*mad])
# ---- 3. 缺失指示器 ----
df["income_missing"] = df["mcar"].isna().astype(int)
print("缺失指示器与高收入相关:", round(np.corrcoef(df["income_missing"], df["income"])[0,1], 2))'''
C[("mining-prep","c2")] = '''import numpy as np
rng = np.random.default_rng(1)
x = np.r_[rng.normal(100, 10, 200), [5000.0]]          # 含一个异常值
mm = (x - x.min())/(x.max()-x.min())
zs = (x - x.mean())/x.std()
med, iqr = np.median(x), np.percentile(x, 75) - np.percentile(x, 25)
rb = (x - med)/iqr
print(f"Min-Max: 正常值被压到 ≤{(mm[:-1].max()):.3f}（异常值劫持）")
print(f"Z-Score: 正常值最大 {np.abs(zs[:-1]).max():.2f}σ | Robust: {np.abs(rb[:-1]).max():.2f} IQR")
# 泄漏演示
Xtr, Xte = x[:150], x[150:]
leak = (np.r_[Xtr, Xte] - np.r_[Xtr, Xte].mean()).std()
honest = Xte.std()
print(f"全量 fit 的 std={leak:.2f} vs 训练集 std={honest:.2f}（全量 fit = 测试信息泄漏）")
# 等宽 vs 分位数分箱
y = rng.lognormal(0, 1, 1000)
ew = np.histogram(y, bins=4)[0]
qd = np.histogram(y, bins=np.quantile(y, [0, .25, .5, .75, 1]))[0]
print("等宽 4 箱人数:", ew, "| 分位数 4 箱:", qd)'''
C[("mining-prep","c3")] = '''import numpy as np, pandas as pd
from sklearn.model_selection import KFold, cross_val_score
from sklearn.linear_model import LogisticRegression
rng = np.random.default_rng(2)
N = 200
city = np.repeat(np.arange(40), 5)              # 40 个高基数类别 × 5 样本
p = np.where(city % 2 == 0, 0.7, 0.3)
y = (rng.random(N) < p).astype(int)
df = pd.DataFrame({"city": city, "y": y})
naive = df.groupby("city")["y"].transform("mean")     # 全量编码（含自己的 y）
oof = pd.Series(np.zeros(N))
for tr, te in KFold(5, shuffle=True, random_state=0).split(df):
    m = df.iloc[tr].groupby("city")["y"].mean()
    oof.iloc[te] = df.iloc[te]["city"].map(m)
auc = lambda x: cross_val_score(LogisticRegression(), x.values.reshape(-1,1), y, cv=5, scoring="roc_auc").mean()
print(f"CV AUC: 泄漏版 {auc(naive):.3f} vs 折外版 {auc(oof):.3f}（虚高 = 离线好看线上崩盘）")
# ---- 周期编码 ----
h = np.array([0, 6, 12, 18, 23])
enc = np.c_[np.sin(2*np.pi*h/24), np.cos(2*np.pi*h/24)]
d = ((enc[:-1]-enc[1:])**2).sum(1)**0.5
print("0 点与 23 点的周期编码距离:", round(d[-1], 2), "（整数编码距离 23）")
# ---- 聚合特征 ----
hist = pd.DataFrame({"uid": [1]*5 + [2]*3, "amt": [100, 200, 150, 300, 250, 50, 60, 55]})
agg = hist.groupby("uid")["amt"].mean()
print("用户历史均值:", dict(agg.round(0)), "→ 本月 200 相对均值倍数:", dict((hist[hist.uid==1]['amt']/agg[1]).round(2).head(2)))'''
C[("mining-prep","c4")] = '''import numpy as np
rng = np.random.default_rng(3)
# 99% 负例：准确率陷阱
n_pos, n_neg = 10, 990
print(f"全预测为负: 准确率 {n_neg/(n_pos+n_neg):.0%}，但 Recall={0:.0%}")
# SMOTE 插值
pos = rng.normal(0, 1, (5, 2))
i, j = 0, 2
lam = rng.random()
new = pos[i] + lam*(pos[j]-pos[i])
print(f"SMOTE: 在 {pos[i].round(2)} 与 {pos[j].round(2)} 间插值 λ={lam:.2f} → {new.round(2)}")
# 类权重对决策的影响
def cost(tp, fp, fn, w_fn=100):
    return tp*1 + fp*(-1) + fn*(-w_fn)
print(f"漏报成本 100x：倾向提高召回（降阈值）；误报成本高（推荐系统）：倾向高精度")
# PR vs ROC 的直觉
print("ROC: FPR = FP/990 → 即使 FP=50 也只有 5%（显得漂亮）")
print("PR : Precision = TP/(TP+FP) = 10/60 = 17%（诚实暴露）")'''
G["mining-prep-c1-l1"] = ("1. 区分 MCAR/MAR/MNAR 并说明为何只有 MCAR 下删除无偏；\n"
                          "2. 对比删除/统计量/模型三种填补的代价与适用比例；\n"
                          "3. 演示 MNAR 下均值填补的系统性偏差与缺失指示器的价值。")
G["mining-prep-c2-l1"] = ("1. 列出对缩放敏感与免疫的模型清单并解释原因；\n"
                          "2. 实测异常值下 Min-Max/Z-Score/Robust 的行为差异；\n"
                          "3. 演示『全量 fit』造成的统计量泄漏并写出正确流程。")
G["mining-prep-c3-l1"] = ("1. 演示目标编码的泄漏版本与 OOF 版本与标签相关性的差异；\n"
                          "2. 用 sin/cos 周期编码修复『23 点与 0 点距离 23』的错误；\n"
                          "3. 构造聚合特征（个体相对群体的位置）并举一反三。")
G["mining-prep-c4-l1"] = ("1. 用 99% 负例的准确率陷阱说明为何不能只看准确率；\n"
                          "2. 解释 PR 曲线在极不平衡下优于 ROC 的数学原因；\n"
                          "3. 实现 SMOTE 插值并复述『只在训练集上做』的铁律。")
P["mining-prep-c1-l1"] = "- pandas 基础；\n- 无其他硬前置。"
P["mining-prep-c2-l1"] = "- 「缺失机制与三种填补策略」（c1-l1）。"
P["mining-prep-c3-l1"] = "- c1/c2 的清洗与缩放。"
P["mining-prep-c4-l1"] = "- c1~c3 的特征流水线；\n- 混淆矩阵概念。"

# ═════ mining-cluster ═════
T["mining-cluster","c1"] = dict(
expected="""K-Means 不同种子：SSE 1147.5 / 177.0 / 818.6（局部最优确实存在，SSE 均单调不增）；肘部+轮廓（5 种子取最优）：k=2 SSE 839/轮廓 0.601，k=3 SSE 177/0.749（峰值），k=4 155/0.607，k=5 134/0.460 → 选 k=3。""",
why=("没有标签时怎么发现结构？K-Means 用『质心代表一簇』给出最简单也最常用的答案：两步交替必然收敛"
     "（SSE 单调不增），但收敛到局部最优——初始化（K-Means++）与 k 的选择决定成败。"),
intuition=("K-Means 像圈地建邮局：先猜 k 个邮局位置（质心），居民都去最近的邮局（分配步），"
           "再把邮局搬到辖区内居民的正中心（更新步）；反复几轮家家户户就近，SSE 一轮比一轮小。"
           "但邮局可能挤在半山腰（局部最优）——K-Means++ 让新邮局离已有的越远越可能被选中。"),
cerr=("随机初始化两个质心几乎重合，收敛到坏解（应 K-Means++ + n_init 多次）；k 用肘部法硬找拐点"
      "（不明显时改轮廓系数/业务解释）；在未缩放的特征上直接聚类，量纲大的特征主导距离。"),
miscon=("1. **『K-Means 一定能找到真实分组』**——它只能找凸球形簇，对环形/月牙形束手无策（换 DBSCAN）；\\n"
        "2. **『收敛=全局最优』**——只是局部最优，结果依赖初始化；\\n"
        "3. **『k 越大 SSE 越小所以 k 越好』**——k=n 时 SSE=0 毫无意义，要配合轮廓系数与业务。"),
connection=("- **向前**：mining-prep c2 的缩放是本章的必要前置；\n"
            "- **向后**：c2 的层次/密度聚类补足 K-Means 的三个硬伤；\n"
            "- **平行**：llm-b1 的向量检索同样是『找最近邻』的几何游戏。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 两步 | 分配（就近）→ 更新（均值），SSE 单调不增 |\n"
         "| 收敛 | 局部最优，K-Means++ + n_init=10 |\n"
         "| 选 k | 肘部法 / 轮廓系数 / 业务可解释性 |\n"
         "| 假设 | 簇是凸球形、各簇方差相近 |\n"
         "| 前置 | 必须先缩放 |"),
)
T["mining-cluster","c2"] = dict(
expected="""月牙数据+桥接点：single 链接把 299/300 连成一簇（链式效应），complete 123，ward 201；DBSCAN(eps=0.18,minPts=5) 找到 2 个月牙 + 3 个噪声点。""",
why=("K-Means 三硬伤：必须指定 k、只能球形簇、对异常值敏感。层次聚类用树状图解决『k 未知』，"
     "DBSCAN 用密度解决『任意形状+噪声识别』——两者补齐了聚类的另一半地图。"),
intuition=("层次聚类像家族谱系：每个点自成一家，血缘最近的反复合并成一棵树，在树状图上『切一刀』就是 k。"
           "单链接看『两家最近的亲戚』（容易被桥接点串门连成一串），Ward 看『合并后家族财产波动最小』。"
           "DBSCAN 像按人口密度划城区：eps 半径内够 minPts 人的是核心区，贴着核心区的是边界，"
           "荒野上独户是噪声。"),
cerr=("单链接遇桥接点把两个真实簇连成一串（链式效应）；DBSCAN 的 eps 用默认值不按 k 距离图校准，"
      "要么全判噪声要么全成一簇；层次聚类在大数据上硬跑 O(n²) 距离矩阵爆内存。"),
miscon=("1. **『层次聚类能找任意形状』**——单链接可以但链式效应危险，Ward 仍偏向凸簇；\\n"
        "2. **『DBSCAN 不需要参数』**——eps/minPts 敏感，用 k-距离图肘点选 eps；\\n"
        "3. **『DBSCAN 的噪声=异常值检测』**——它只判『密度之外』，低密度真实簇会被误杀。"),
connection=("- **向前**：c1 的 K-Means 是本章的对照基线；\n"
            "- **向后**：c4 的聚类评估衡量三族算法的产出质量；\n"
            "- **平行**：llm-b1 c6 的 Leiden 社区发现与本章 DBSCAN 同属密度/连通性方法。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| AGNES | 自底向上合并，树状图切一刀定 k |\n"
         "| 链接 | 单链接链式效应 / 全链接紧凑 / Ward 默认 |\n"
         "| 复杂度 | O(n²)~O(n³)，只适合 n<1 万 |\n"
         "| DBSCAN | eps+minPts：核心/边界/噪声，任意形状 |\n"
         "| eps 选择 | k-距离图肘点 |"),
)
T["mining-cluster","c3"] = dict(
expected="""特征值（方差）[40.3, 0.95, 0.61, 0.28, 0.01]，PC1 贡献 95.6%；SVD 奇异值²/(n−1) 与特征值完全一致（True）；投影 (200,5)→(200,2) 保留 98% 方差。""",
why=("512 维 embedding 没法直接可视化与聚类。PCA 的答案是『信息=方差』：找投影最散开的正交方向。"
     "实践中用 SVD 而不是协方差分解——数值更稳还能直接处理稀疏矩阵。"),
intuition=("PCA 像给一束斜放的长条气球拍照：找能把拍出来最『长』（方差最大）的角度当第一主成分，"
           "再垂直找次宽的角度当第二主成分——两张照片就能描述整束气球。方差≈0 的方向上所有点挤成一团，"
           "没有区分信息，扔掉不可惜。"),
cerr=("忘记中心化直接求协方差（第一主成分指向均值方向）；用 X^T X 特征分解（条件数平方放大误差，应 SVD）；"
      "PCA 前不缩放，量纲大的特征霸占第一主成分。"),
miscon=("1. **『PCA 找的是『重要的』特征』**——它找的是原特征的线性组合方向，不等于特征选择；\\n"
        "2. **『主成分一定可解释』**——PC1 是抽象组合，业务含义常常模糊；\\n"
        "3. **『PCA 能去掉异常值影响』**——恰恰相反，方差最大化对离群点极其敏感。"),
connection=("- **向前**：c1 的 K-Means 在 PCA 空间里跑得更稳更快；\n"
            "- **向后**：c4 的 t-SNE/UMAP 是非线性流形版；\n"
            "- **平行**：mining-recsys c2 的矩阵分解与 SVD 同源（评分矩阵的低秩近似）。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 三步 | 中心化 → 协方差 C=XᵀX/(n−1) → 特征分解 |\n"
         "| SVD 等价 | V 列=主成分、σ²/(n−1)=方差、UΣ=得分 |\n"
         "| 选 k | 累计方差 80%~95% / 碎石图 / Kaiser λ>1 |\n"
         "| 前置 | 必须中心化（一般还缩放）|\n"
         "| 用 SVD | 数值稳定 + 支持稀疏截断 |"),
)
T["mining-cluster","c4"] = dict(
expected="""t-SNE(400 样本) 可视化；原始 64 维 KMeans(10) 轮廓 0.233、ARI 0.75；perplexity=5/30/50 的低维 ARI 0.82/0.81/0.85（结论随超参漂移，必须多跑）。""",
why=("PCA 只能找线性子空间，而真实高维数据常躺在弯曲流形上。t-SNE/UMAP 保留局部邻域结构用于可视化，"
     "但它们的三陷阱（簇间距无意义/簇大小无意义/超参敏感）让无数分析翻车——聚类评估（轮廓/ARI）"
     "才是产出质量的裁判。"),
intuition=("t-SNE 像『只保证邻居不散伙』的搬家：高维里挨着的（高斯概率）低维里也要挨着，用重尾 t 分布"
           "把挤在市中心的人匀开（缓解拥挤）。代价是『两个小区间的距离』完全是编造的——不能读图上簇间远近。"
           "UMAP 是更快的同类，还多保留了些全局结构、支持 transform 新样本。"),
cerr=("把 t-SNE 图上簇的大小当样本量、簇间距离当真实距离下结论；perplexity 用默认值不扫描，"
      "换个种子结论翻转；拿 t-SNE 的输出当特征喂给下游模型（应 UMAP 或直接用原特征）。"),
miscon=("1. **『t-SNE 图上分得开=真的可分』**——它几乎总能『挤出』簇状结构，必须配合定量指标；\\n"
        "2. **『t-SNE 可当特征工程』**——无 transform 能力，是可视化工具；\\n"
        "3. **『UMAP 完全取代 t-SNE』**——UMAP 更快且保全局更好，但同样是参数敏感的可视化工具。"),
connection=("- **向前**：c1~c3 的聚类/PCA 产出是本章评估的对象；\n"
            "- **向后**：mining-graph c3 的异常检测也依赖『邻域』概念；\n"
            "- **平行**：llm-b1 的 embedding 可视化常误用 t-SNE 读簇间距离。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| t-SNE | 高斯 p + t 分布 q + KL 最小化 |\n"
         "| 三陷阱 | 簇间距离/簇大小无意义、超参敏感 |\n"
         "| UMAP | 更快、保全局略好、支持 transform |\n"
         "| 定位 | 可视化工具，不是特征工程 |\n"
         "| 评估 | 轮廓系数 / ARI / 业务可解释性 |"),
)
C[("mining-cluster","c1")] = '''import numpy as np
rng = np.random.default_rng(0)
X = np.r_[rng.normal([0,0], 0.6, (80,2)), rng.normal([4,4], 0.6, (80,2)), rng.normal([0,5], 0.6, (80,2))]
def kmeans(X, k, iters=50, seed=0):
    rng = np.random.default_rng(seed)
    c = X[rng.choice(len(X), k, replace=False)]
    sse_hist = []
    for _ in range(iters):
        d = ((X[:,None,:]-c[None])**2).sum(-1)
        lab = d.argmin(1); sse = d[np.arange(len(X)), lab].sum()
        sse_hist.append(sse)
        c = np.array([X[lab==j].mean(0) if (lab==j).any() else c[j] for j in range(k)])
    return lab, c, sse_hist
for seed in (0, 1, 2):
    lab, c, h = kmeans(X, 3, seed=seed)
    print(f"seed={seed}: 最终 SSE={h[-1]:.1f} 单调不增={all(h[i+1]<=h[i]+1e-9 for i in range(len(h)-1))}")
# 肘部法与轮廓系数（每个 k 跑 5 个种子取最优 = sklearn n_init 实践）
from sklearn.metrics import silhouette_score
for k in (2, 3, 4, 5):
    best = min((kmeans(X, k, seed=sd) for sd in range(5)), key=lambda r: r[2][-1])
    lab, c, h = best
    print(f"k={k}: 最优 SSE={h[-1]:7.1f} | 轮廓系数={silhouette_score(X, lab):.3f}")'''
C[("mining-cluster","c2")] = '''import numpy as np
from sklearn.cluster import AgglomerativeClustering, DBSCAN
from sklearn.datasets import make_moons
rng = np.random.default_rng(0)
X, _ = make_moons(300, noise=0.06, random_state=0)
X[:5] += [0, 0.9]                                  # 注入桥接点
for link in ("single", "complete", "ward"):
    lab = AgglomerativeClustering(n_clusters=2, linkage=link).fit_predict(X)
    print(f"{link:9}: 簇0 大小 {(lab==0).sum()}（single 被桥接点串门的风险）")
db = DBSCAN(eps=0.18, min_samples=5).fit(X)
print(f"DBSCAN: 簇数={len(set(db.labels_))-( -1 in db.labels_)}, 噪声点 {(db.labels_==-1).sum()}")
Xb = np.r_[np.c_[rng.normal(0,0.3,(50,2))], np.c_[[9,9]+rng.normal(0,0.3,(2,2)).sum(0)*0]] if False else X
core = (db.labels_[:6])
print("核心/边界/噪声 由 eps 邻域内点数决定（minPts=5）")'''
C[("mining-cluster","c3")] = '''import numpy as np
rng = np.random.default_rng(0)
n = 200
X = rng.normal(0, 1, (n, 5)) * np.array([3, 2, 1, 0.5, 0.1])
X[:, 1] += 2*X[:, 0]                      # 制造相关，主成分不再对齐坐标轴
X = X - X.mean(0)
C = X.T @ X / (n-1)
lam, V = np.linalg.eigh(C)
lam = np.sort(lam)[::-1]
print("特征值（方差）:", np.round(lam, 2))
print("累计方差贡献率:", np.round(np.cumsum(lam)/lam.sum(), 3))
U, S, Vt = np.linalg.svd(X, full_matrices=False)
print("SVD 奇异值²/(n-1) 与特征值一致:", np.allclose(S**2/(n-1), lam))
Z = X @ V[:, ::-1][:, :2]
print(f"投影到前 2 主成分: {X.shape} -> {Z.shape}，保留方差 {np.cumsum(lam)[1]/lam.sum():.0%}")

'''
C[("mining-cluster","c4")] = '''import numpy as np
from sklearn.datasets import load_digits
from sklearn.manifold import TSNE
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score, adjusted_rand_score
X, y = load_digits(return_X_y=True)
Xs, ys = X[:400], y[:400]
Z = TSNE(2, perplexity=30, random_state=0, init="pca").fit_transform(Xs)
lab = KMeans(10, n_init=10, random_state=0).fit_predict(Xs)
print(f"t-SNE 形状: {Z.shape} | 同一数据换 perplexity=5 结论可能不同（必须多跑）")
print(f"KMeans(k=10) 在原始 64 维: 轮廓系数 {silhouette_score(Xs, lab):.3f} | ARI vs 真实标签 {adjusted_rand_score(ys, lab):.2f}")
for p in (5, 30, 50):
    Zp = TSNE(2, perplexity=p, random_state=0, init="pca").fit_transform(Xs)
    print(f"perplexity={p}: 低维 KMeans ARI={adjusted_rand_score(ys, KMeans(10, n_init=5, random_state=0).fit_predict(Zp)):.2f}")'''
G["mining-cluster-c1-l1"] = ("1. 手写 K-Means 两步交替并验证 SSE 单调不增；\n"
                             "2. 用不同随机种子实测局部最优现象与 K-Means++ 的作用；\n"
                             "3. 用肘部法+轮廓系数联合选 k，并说明业务可解释性的权重。")
G["mining-cluster-c2-l1"] = ("1. 演示单链接的链式效应（桥接点串门）与 Ward 的紧凑倾向；\n"
                             "2. 手推 DBSCAN 的核心/边界/噪声判定；\n"
                             "3. 用 k-距离图选 eps 并解释两个参数的联动。")
G["mining-cluster-c3-l1"] = ("1. 手推 PCA 三步（中心化/协方差/特征分解）并验证与 SVD 的等价；\n"
                             "2. 用累计方差贡献率选 k；\n"
                             "3. 解释为什么实践用 SVD 而非 XᵀX 特征分解。")
G["mining-cluster-c4-l1"] = ("1. 用 t-SNE 可视化 digits 并演示 perplexity 对结果的影响；\n"
                             "2. 复述三大陷阱（簇间距离/簇大小/超参敏感）；\n"
                             "3. 用轮廓系数+ARI 定量评估聚类质量而非看图下结论。")
P["mining-cluster-c1-l1"] = "- numpy 基础；\n- 距离与方差概念。"
P["mining-cluster-c2-l1"] = "- 「K-Means 的迭代与收敛」（c1-l1）。"
P["mining-cluster-c3-l1"] = "- 矩阵乘法与特征值概念；\n- c2 的距离度量。"
P["mining-cluster-c4-l1"] = "- c1~c3 全部；\n- KL 散度的直观含义。"

# ═════ mining-freq ═════
T["mining-freq","c1"] = dict(
expected="""尿布→啤酒：sup 0.40、conf 0.50、lift 1.25（正相关）；牛奶→啤酒 lift 0.83（<1 抑制）——同为高置信度，lift 分善恶；L1={啤酒,尿布,牛奶}，{啤酒,牛奶} sup=0.2 被剪；反单调：{尿布,啤酒} 频繁但 {尿布,啤酒,面包} sup=0 被剪。""",
why=("『啤酒与尿布』的故事真假存疑，但它代表的技术是真金白银：支持度/置信度/提升度三个指标"
     "与 Apriori 的反单调剪枝，把指数级的项集搜索变成可行——只看置信度会被高支持度商品误导，lift 才是照妖镜。"),
intuition=("支持度是『多少张小票同时出现』，置信度是『买了 X 的人有多少也买了 Y』，提升度是"
           "『比 Y 的日常人气高出几倍』——买钻石的人顺手买牛奶置信度高，但牛奶人人买，lift≈1 等于白说。"
           "Apriori 的剪枝像海关查验：大箱子不频繁，装它的小箱子组合全免检。"),
cerr=("用支持度阈值 0.001 直接跑全量事务数百万候选（应先升采样或用 FP-Growth）；只按置信度排序导出规则"
      "（高支持度 Y 会霸榜）；把 lift<1 的负相关规则当垃圾全删（『买了 X 就不买 Y』也是可行动洞察）。"),
miscon=("1. **『置信度高=关联强』**——必须除以 Y 的边际支持度看 lift；\\n"
        "2. **『Apriori 会枚举所有项集』**——反单调性剪枝后只处理频繁项集的超集候选；\\n"
        "3. **『规则=因果』**——关联只是共现，可能是季节/促销/品类结构造成的混杂。"),
connection=("- **向前**：mining-prep c4 的多重检验问题在本章的显著性检验再现；\n"
            "- **向后**：c2 的 FP-Growth 解决 Apriori 的候选爆炸；\n"
            "- **平行**：mining-recsys c1 的共现相似度与本章支持度同源。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 支持度 | count(X∪Y)/|D|，覆盖率 |\n"
         "| 置信度 | count(X∪Y)/count(X)，条件概率 |\n"
         "| 提升度 | conf/sup(Y)：>1 正相关 =1 独立 <1 负相关 |\n"
         "| 反单调 | 子集不频繁 → 超集全剪 |\n"
         "| 陷阱 | 只看置信度会被热门 Y 误导 |"),
)
T["mining-freq","c2"] = dict(
expected="""header 表 a:3/b:3/c:3（d 不频繁删除）；重排后建 FP-Tree：a:3, a→b:2, a→b→c:1, a→c:1, b:1, b→c:1（共享前缀压缩）；c 的条件模式基 {a→b:1, a:1, b:1} → 条件 FP-Tree a:2, b:2。""",
why=("Apriori 两个死穴：候选集爆炸（百万级）与 K 层扫描 K 遍数据库。FP-Growth 用 FP-Tree"
     "『相同前缀只存一次』的压缩结构 + 条件模式基递归，完全不生成候选、只扫 2 遍。"),
intuition=("FP-Tree 像图书馆把所有书按首字母-次字母排架：大量事务共享前缀（a→b→c），"
           "共同前缀只架一次并累加计数。挖『c 的模式』时只看 c 的链表回溯祖先路径"
           "（条件模式基），在这个迷你子库里递归——数据库从不用再扫第三遍。"),
cerr=("频次排序忘记降序（前缀压缩失效，树退化）；删除不频繁项前就建树（树爆炸）；"
      "条件模式基的计数没按路径计数累加，支持度算错。"),
miscon=("1. **『FP-Growth 比 Apriori 永远快』**——稀疏长模式数据集上建树与递归开销可能反超；\\n"
        "2. **『FP-Tree 存的是事务』**——存的是压缩的前缀共享路径 + 频次；\\n"
        "3. **『只需扫 2 遍是近似』**——结果与 Apriori 完全一致，是精确算法。"),
connection=("- **向前**：c1 的反单调性与本章的『删除不频繁项』同源；\n"
            "- **向后**：c4 的 PrefixSpan 把『不生成候选+投影递归』搬到序列上；\n"
            "- **平行**：mining-graph c4 的概要数据结构共享『压缩换内存』思想。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 两遍 | 第 1 遍频次定序，第 2 遍建树 |\n"
         "| FP-Tree | 相同前缀共享路径 + 节点计数 |\n"
         "| 条件模式基 | 沿项的链表回溯祖先路径 |\n"
         "| 递归 | 每个频繁项建条件 FP-Tree |\n"
         "| 对比 | 无候选集、结果与 Apriori 一致 |"),
)
T["mining-freq","c3"] = dict(
expected="""列联表规则：conf=0.80、lift=4.00、leverage=0.06、conviction=4.00、χ²=250（p<0.0001 显著）；5000 条规则的 Bonferroni 阈值=1e-5；『lift=50 但 σ(XY)=5/1000 → leverage≈0』不可行动。""",
why=("lift 也有缺陷：高 lift 可能只覆盖 5 笔交易（不可行动），小样本下波动极大。"
     "leverage/conviction/卡方检验 + Bonferroni 校正，是把『看起来有关联』升级为『统计显著且可行动』的组合拳。"),
intuition=("lift 是比值（相对强几倍），leverage 是差值（多覆盖了多少比例的事务）——"
           "lift=50 但只覆盖 0.1% 的小规则，leverage≈0 毫无商业价值。conviction 回答"
           "『违反这条规则的情况有多罕见』（完美规则为 ∞）。卡方检验则是『这条规则是不是运气』"
           "——挖几千条规则时必须 Bonferroni 除以规则数。"),
cerr=("只按 lift 排序导出 Top 规则（全是低支持度噪声）；卡方检验不做多重校正，"
      "5000 条规则里约 250 条纯随机『显著』；把连续变量的关联硬塞进项集框架。"),
miscon=("1. **『lift 大就值得上线』**——先看支持度计数是否足够大（比如 ≥50 单）；\\n"
        "2. **『p<0.05 就是真的』**——多重检验下必须校正；\\n"
        "3. **『规则可直接用于定价』**——需要 A/B 验证因果，关联只是候选假设。"),
connection=("- **向前**：c1 的三大指标是本章的基石；\n"
            "- **向后**：c4 的序列模式把时间维度引入后需重新评估；\n"
            "- **平行**：quant-backtest c3 的 DSR 与本章共享多重检验校正思想。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| leverage | sup(XY) − sup(X)sup(Y)，绝对差值 |\n"
         "| conviction | (1−sup Y)/(1−conf)，反例稀有度 |\n"
         "| 卡方 | 2×2 列联表独立性检验，p<0.05 |\n"
         "| 多重检验 | Bonferroni：阈值 ÷ 规则数 |\n"
         "| 可行动性 | 支持度计数下限 + 业务成本 |"),
)
T["mining-freq","c4"] = dict(
expected="""序列支持度：⟨手机⟩=75%、⟨手机,手机壳⟩=50%、⟨手机,耳机⟩=25%；⟨{b},{a}⟩ ⊄ ⟨{a,c},{b}⟩（顺序不可倒）；PrefixSpan 以『手机』为前缀的投影数据库 [⟨手机壳,贴膜⟩,⟨手机壳⟩,⟨耳机⟩] 递归挖掘。""",
why=("关联规则只看同笔共现，但业务真问题是『买了手机的人 60 天内会买手机壳』——时间顺序是信息的另一半。"
     "序列模式把无序集合升级为有序事务列表，PrefixSpan 用前缀投影避免候选爆炸。"),
intuition=("序列像看连续剧：⟨{手机},{手机壳},{贴膜}⟩ 是三集剧情。子序列判定像跳着看但绝不倒放——"
           "⟨{b},{a}⟩ 不是 ⟨{a},{b}⟩。PrefixSpan 像『以某集为开头往下找』：把所有包含 a 的序列取 a 之后"
           "的尾巴（投影数据库），在尾巴里递归找下一个频繁项——从不凭空造候选。"),
cerr=("把 ⟨{a},{b}⟩ 与 ⟨{a,b}⟩ 混为一谈（前者是两个事件，后者是同一事件内两项）；"
      "窗口约束（60 天内）漏加，跨年购买也算连续；支持度按『出现次数』而不是『包含序列数』统计。"),
miscon=("1. **『序列模式=时间序列预测』**——它挖的是离散事件顺序的频繁模式，不预测连续数值；\\n"
        "2. **『候选生成不可避免』**——GSP 会，PrefixSpan 不会；\\n"
        "3. **『顺序挖掘必须存时间戳』**——只需要事件间的相对顺序，绝对时间用于窗口过滤。"),
connection=("- **向前**：c1~c3 的项集与规则评估是本章的基础设施；\n"
            "- **向后**：mining-recsys c4 的序列推荐把模式用于在线排序；\n"
            "- **平行**：llm-a1 的 token 序列与本章的序列支持度共享『子序列』定义。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 序列 vs 项集 | 有序事务列表，子序列保持顺序 |\n"
         "| 支持度 | 包含该子序列的序列数/总序列数 |\n"
         "| GSP | Apriori 的序列版，候选爆炸 |\n"
         "| PrefixSpan | 前缀投影递归，主流 |\n"
         "| 窗口 | 时间约束按业务加（如 60 天）|"),
)
C[("mining-freq","c1")] = '''from itertools import combinations
D = [{"尿布","啤酒"}, {"尿布","薯片"}, {"尿布","牛奶","啤酒"}, {"牛奶","面包"}, {"尿布","牛奶"}]
n = len(D)
def sup(s): return sum(1 for t in D if s <= t)/n
for X, Y in [(frozenset({"尿布"}), frozenset({"啤酒"})), (frozenset({"牛奶"}), frozenset({"啤酒"}))]:
    conf = sup(X|Y)/sup(X); lift = conf/sup(Y)
    print(f"{set(X)}→{set(Y)}: sup={sup(X|Y):.2f} conf={conf:.2f} lift={lift:.2f}")
# Apriori 剪枝演示
min_sup = 0.4
items = sorted({i for t in D for i in t})
L1 = [frozenset([i]) for i in items if sup(frozenset([i])) >= min_sup]
print("L1:", [list(s) for s in L1])
C2 = [X|Y for X, Y in combinations(L1, 2)]
pruned = [c for c in C2 if sup(c) >= min_sup]
print("C2 候选:", [sorted(c) for c in C2], "-> 频繁:", [sorted(c) for c in pruned])
print(f"热门陷阱: 牛奶→啤酒 lift={sup(frozenset({'牛奶','啤酒'}))/sup(frozenset({'牛奶'}))/sup(frozenset({'啤酒'})):.2f}（<1 抑制）| 反单调: {{尿布,啤酒}} 频繁但 {{尿布,啤酒,面包}} sup={sup(frozenset({'尿布','啤酒','面包'})):.2f} 被剪")'''
C[("mining-freq","c2")] = '''D = [["a","b","c"], ["a","c"], ["a","b"], ["b","c"]]   # d 不频繁被删
freq = {}
for t in D:
    for i in t: freq[i] = freq.get(i, 0) + 1
order = sorted([i for i, c in freq.items() if c >= 2], key=lambda x: -freq[x])
print("header 表:", [(i, freq[i]) for i in order])
paths = [[i for i in order if i in t] for t in D]
print("重排事务:", paths)
tree = {}
for p in paths:
    for depth, node in enumerate(p):
        tree.setdefault(tuple(p[:depth+1]), 0)
        tree[tuple(p[:depth+1])] += 1
print("FP-Tree 节点（路径:计数）:", {"→".join(k): v for k, v in sorted(tree.items())})
# c 的条件模式基
base = {}
for p in paths:
    if "c" in p:
        idx = p.index("c")
        if idx: base[tuple(p[:idx])] = base.get(tuple(p[:idx]), 0) + 1
print("c 的条件模式基:", {"→".join(k): v for k, v in base.items()}, "-> 条件 FP-Tree: a:2, b:2")'''
C[("mining-freq","c3")] = '''import numpy as np
n = 1000
a = 80; b_ = 20; c = 120; d = 780            # 列联表: X∩Y, X∩¬Y, ¬X∩Y, ¬X¬Y
supX, supY = (a+b_)/n, (a+c)/n
supXY = a/n
conf = supXY/supX; lift = conf/supY
lev = supXY - supX*supY
conv = (1-supY)/(1-conf)
chi2 = n*(a*d - b_*c)**2/((a+b_)*(c+d)*(a+c)*(b_+d))
print(f"conf={conf:.2f} lift={lift:.2f} leverage={lev:.4f} conviction={conv:.2f} χ²={chi2:.1f}")
from scipy.stats import chi2 as chi2d
p = 1 - chi2d.cdf(chi2, 1)
print(f"p 值={p:.4f}", "显著" if p < 0.05 else "不显著")
print(f"挖 5000 条规则时 Bonferroni 阈值 = {0.05/5000:.1e}")
print("低支持度陷阱: lift=50 但 σ(XY)=5/1000 → leverage≈0，不可行动")'''
C[("mining-freq","c4")] = '''S = [[("手机",), ("手机壳",), ("贴膜",)], [("手机",), ("手机壳",)], [("手机",), ("耳机",)],
     [("电脑",), ("键盘",)]]
n = len(S)
def support(seq, S):
    cnt = 0
    for s in S:
        i = 0
        for ev in seq:
            while i < len(s) and not set(ev) <= set(s[i]): i += 1
            if i == len(s): break
            i += 1
        else: cnt += 1
    return cnt/n
seqs = [(("手机",), ("手机壳",)), (("手机",),), (("手机",), ("耳机",))]
for q in seqs:
    print(f"⟨{','.join(q[0])}...⟩ 支持度: {support(q, S):.0%}")
print("⟨{b},{a}⟩ ⊄ ⟨{a,c},{b}⟩（顺序不可倒）| ⟨{a},{b}⟩ ⊆ ⟨{a,c},{b}⟩ ✓")
print("PrefixSpan: 以『手机』开头的投影 = [⟨手机壳,贴膜⟩, ⟨手机壳⟩, ⟨耳机⟩] → 递归挖后续")'''
G["mining-freq-c1-l1"] = ("1. 手算给定事务集上规则的 sup/conf/lift 并解释 lift 三段含义；\n"
                          "2. 用『牛奶→啤酒』反例说明只看置信度的误导；\n"
                          "3. 实现 Apriori 的连接+剪枝并演示反单调性省掉的候选。")
G["mining-freq-c2-l1"] = ("1. 按课内示例手工构建 FP-Tree（header 表/共享前缀/计数）；\n"
                          "2. 推导 c 的条件模式基并得到条件 FP-Tree；\n"
                          "3. 解释为什么只需扫描数据库 2 遍。")
G["mining-freq-c3-l1"] = ("1. 计算规则的 leverage/conviction 并与 lift 对比；\n"
                          "2. 对 2×2 列联表做卡方检验并应用 Bonferroni 校正；\n"
                          "3. 用支持度计数下限过滤『高 lift 低覆盖』的不可行动规则。")
G["mining-freq-c4-l1"] = ("1. 判定子序列关系并区分 ⟨{a},{b}⟩ 与 ⟨{a,b}⟩；\n"
                          "2. 计算序列支持度并实现支持度函数；\n"
                          "3. 描述 PrefixSpan 的前缀投影递归流程与 GSP 的候选爆炸。")
P["mining-freq-c1-l1"] = "- 集合运算基础；\n- 无其他硬前置。"
P["mining-freq-c2-l1"] = "- 「支持度、置信度与 Apriori 原理」（c1-l1）。"
P["mining-freq-c3-l1"] = "- c1 的三大指标；\n- 假设检验基础（p 值）。"
P["mining-freq-c4-l1"] = "- c1~c3 全部；\n- 递归思想。"

# ═════ mining-graph ═════
T["mining-graph","c1"] = dict(
expected="""4 节点图 PageRank（d=0.85）：C=0.394 > A=0.373 > B=0.196 > D=0.038，总和 1.0——C 被三个页面指向且 A 的权重经链接传导。""",
why=("数入链数会被几千个垃圾页互刷作弊；PageRank 的洞察是『来自重要页面的链接更值钱』——"
     "递归定义 + 随机游走 + 瞬移机制，构成 Google 的起点，也是图上一切重要性度量的原型。"),
intuition=("PageRank 像一群游客在网页间随机点链接：在每个页面的长期停留比例就是它的排名。"
           "15% 的瞬移概率（d=0.85）是保底机制——没有出链的死胡同会困住游客，闭环会卷走权重，"
           "瞬移保证游客最终能逛遍全网且分布唯一稳定。"),
cerr=("忘记处理 dangling node（无出链页把权重漏掉，总和不再为 1）；d 设 1（闭环权重永远出不来）；"
      "迭代不收敛就停止（应设阈值 1e-8 或固定轮数）。"),
miscon=("1. **『PageRank 只看入链数』**——它看出链页的重要性并按出链数均分；\\n"
        "2. **『PR 值绝对大小有意义』**——不同图之间不可比，同图内相对排名才有意义；\\n"
        "3. **『瞬移是工程补丁』**——它是数学必需：保证马尔可夫链不可约非周期、平稳分布唯一。"),
connection=("- **向前**：图的基本表示（邻接矩阵/度）是本章前置；\n"
            "- **向后**：c2 的社区发现用图拓扑；c4 的流式 PageRank 处理动态图；\n"
            "- **平行**：mining-recsys 的 Item-CF 共现图与本章随机游走共享『转移概率』内核。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 迭代式 | PR(p) = (1−d)/N + d·Σ PR(q)/L(q) |\n"
         "| 阻尼 | d=0.85：85% 走链接、15% 瞬移 |\n"
         "| 收敛 | 幂迭代 + Perron-Frobenius，几十轮到 1e-8 |\n"
         "| dangling | 视为指向所有页面的均匀分布 |\n"
         "| 变体 | PPR（个性化瞬移）、TrustRank |"),
)
T["mining-graph","c2"] = dict(
expected="""模块度：全体一簇 Q=-0.000（无社区）、自然三社区 Q=0.483（Louvain 目标）、随机划分 Q=-0.231（比随机还差）；LPA 一轮后标签聚成 {0..5} 与 {6,7,8}（快但受桥接影响）。""",
why=("社区=内部紧密、外部稀疏的节点群组。模块度 Q 给出『比随机图好多少』的标尺，Louvain 用"
     "『局部移动+社区聚合』两阶段把它推高——接近线性复杂度，上亿节点的图也能跑。"),
intuition=("模块度像房产评估：『小区内部道路占比 − 随机城市规划下的期望占比』——不减期望的话，"
           "把主干道旁的楼全划成一个小区也能得高分（平凡划分）。Louvain 是搬迁算法："
           "每户搬去让小区增值最多的邻区，稳定后把整个小区打包成超级节点再议，直到无人再搬。"),
cerr=("模块度不除以 2m（度序列期望算错）；Louvain 结果当唯一真值（随机性与分辨率限制问题，"
      "应多跑取稳定结构）；把 Leiden 的改进当小事（Louvain 可能产出内部不连通的坏社区）。"),
miscon=("1. **『Q>0.3 就有真社区』**——粗略经验，必须与配置模型零模型对照；\\n"
        "2. **『社区划分唯一』**——不同种子/分辨率给不同划分，需稳定性检验；\\n"
        "3. **『标签传播最弱』**——LPA 极快，作为大规模图的粗筛或初始化很实用。"),
connection=("- **向前**：c1 的图表示与度是模块度的原料；\n"
            "- **向后**：llm-b1 的 GraphRAG 直接调用 Leiden 社区检测；\n"
            "- **平行**：mining-cluster 的层次聚类与 Louvain 的聚合阶段同构。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 模块度 | Q = 内部边占比 − 随机期望，>0.3 显著 |\n"
         "| Louvain | 局部移动 + 社区聚合，近 O(m) |\n"
         "| 缺陷 | 可能内部不连通 → Leiden 修正 |\n"
         "| LPA | 邻居多数标签传播，最快 |\n"
         "| 注意 | 分辨率限制与随机性 |"),
)
T["mining-graph","c3"] = dict(
expected="""Isolation Forest Top-5 异常索引 [231,232,206,212,215]——前两名是注入的离群点，其余来自稀疏簇（相对异常）；LOF 判定 16 个异常（稀疏簇内部不被整体误杀）；全局 3σ 会把整个稀疏簇误判。""",
why=("异常检测的三重困境：极度不平衡、没有标签、形态随对抗演化。四类方法从统计（3σ/IQR）到距离（LOF）"
     "到边界（One-Class SVM）到集成（Isolation Forest），LOF 的相对密度是『局部异常』的关键。"),
intuition=("绝对距离会把稀疏区的正常点误判为异常——LOF 改问『你的密度是邻居的几分之一』："
           "LOF≈1 与邻居一样正常，LOF≫1 你比邻居稀得多。孤立森林则像切蛋糕：随机切几刀就能单独"
           "切出来的小块（异常）平均深度浅，正常点藏得深。"),
cerr=("用全局 3σ 处理多簇数据（密集簇的正常点被误杀）；孤立森林的 contamination 参数照抄默认 0.1；"
      "把无监督异常分数直接当二分类输出，不设业务阈值。"),
miscon=("1. **『异常检测=二分类』**——无标签场景是排序问题（按异常分数人工复核 Top-N）；\\n"
        "2. **『LOF 优于 kNN 距离』**——密度均匀时两者相当，LOF 的优势在密度不均；\\n"
        "3. **『异常总是错误』**——可能是欺诈（要拦），也可能是爆款信号（要追），定义在业务。"),
connection=("- **向前**：mining-prep c4 的不平衡评估直接适用于本章；\n"
            "- **向后**：c4 的流式异常检测处理在线数据；\n"
            "- **平行**：quant-live 的事前风控拦截本质是业务化的异常检测。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 统计 | 3σ/IQR：快、可解释、假设强 |\n"
         "| 距离 | kNN / LOF（相对密度，局部异常）|\n"
         "| 边界 | One-Class SVM：小样本高维 |\n"
         "| 集成 | Isolation Forest：异常更易被隔离 |\n"
         "| 评估 | 无标签 → 人工复核 Top-N / 注入已知异常 |"),
)
T["mining-graph","c4"] = dict(
expected="""Misra-Gries（3 计数器）：A 385/真实 509（低估）但保留（A 频率 509>n/4=250 无假阴性），C/E 被抵消；Count-Min Sketch（8 桶×4 行，55 种元素）：A 真实 98→估计 181、item7 真实 11→63（只高不低的上界性质）。""",
why=("流数据的三个约束：单遍、有限内存、实时。滑动窗口要『忘记』老数据，Misra-Gries 用 k−1 个计数器"
     "保证频繁项无假阴性，Count-Min Sketch 用 d×w 哈希数组 O(1) 估频——概要数据结构是流上统计的全部秘密。"),
intuition=("Misra-Gries 像『意见不合就集体互删一票』：每次全体减 1 相当于抵消 k 个不同元素，"
           "真正的高频项（>n/k）不可能被完全抵消——无假阴性，只有低估。Count-Min Sketch 则"
           "『只加不减』：多个哈希桶取最小值做频率上界，牺牲一点精度换来 O(1) 内存。"),
cerr=("Misra-Gries 的计数当精确值用（它是低估，误差 ≤n/k）；Count-Min Sketch 的 d/w 太小，"
      "哈希碰撞把冷门元素估值抬高；滑动窗口直接存全量历史（内存爆）。"),
miscon=("1. **『概要结构给出精确答案』**——全是近似：MG 低估、CMS 高估，取最小哈希缓解；\\n"
        "2. **『频繁项可能超过 k−1 个』**——数学不可能：超过 n/k 的项若多于 k−1 个则总数超 n；\\n"
        "3. **『衰减窗口=滑动窗口』**——指数衰减无硬边界、内存 O(1)，滑动窗口精确版要 O(W)。"),
connection=("- **向前**：c1 的 PageRank 在流场景需要增量更新（本章思想）；\n"
            "- **向后**：mining-freq c2 的 FP-Tree 与本章同为『压缩结构换资源』；\n"
            "- **平行**：quant-data 的实时行情管道是本章工程化的落地场景。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 三约束 | 单遍 / 有限内存 / 毫秒响应 |\n"
         "| 窗口 | 滑动 O(W) / 滚动不重叠 / 衰减指数 |\n"
         "| Misra-Gries | k−1 计数器，频繁项无假阴性 |\n"
         "| CMS | d×w 桶取最小，O(1) 估频上界 |\n"
         "| 本质 | 用有界误差换有界内存 |"),
)
C[("mining-graph","c1")] = '''import numpy as np
edges = [("A","B"),("A","C"),("B","C"),("C","A"),("D","C")]
nodes = sorted({n for e in edges for n in e})
idx = {n: i for i, n in enumerate(nodes)}
N = len(nodes)
M = np.zeros((N, N))
for s, t in edges: M[idx[t], idx[s]] += 1
out = M.sum(0); out[out == 0] = N            # dangling -> 均匀
M = M/out
d = 0.85
pr = np.ones(N)/N
for it in range(60):
    pr = (1-d)/N + d*M@pr
print("PageRank:", {n: round(p, 3) for n, p in zip(nodes, pr)}, "| 总和:", round(pr.sum(), 4), "| C 最高（被 A/B/D 指向）")'''
C[("mining-graph","c2")] = '''import numpy as np
edges = [(0,1),(1,2),(0,2),(2,3),(3,4),(4,5),(3,5),(5,6),(6,7),(6,8),(7,8)]
n = 9
A = np.zeros((n, n))
for i, j in edges: A[i, j] = A[j, i] = 1
k = A.sum(1); m = A.sum()/2
comm = np.array([0,0,0,1,1,1,2,2,2])
def modularity(comm):
    Q = 0.0
    for i in range(n):
        for j in range(n):
            if comm[i] == comm[j]:
                Q += A[i, j] - k[i]*k[j]/(2*m)
    return Q/(2*m)
print(f"全体一簇 Q={modularity(np.zeros(9, int)):.3f}（无社区结构）")
print(f"自然三社区 Q={modularity(np.array([0,0,0,1,1,1,2,2,2])):.3f}（Louvain 的目标）")
print(f"随机划分 Q={modularity(np.array([0,1,0,1,0,1,0,1,0])):.3f}（<0，比随机还差）")
# 标签传播一步
lab = list(range(n))
for i in range(n):
    nb = [j for j in range(n) if A[i, j]]
    if nb: lab[i] = max(set(lab[j] for j in nb), key=[lab[j] for j in nb].count)
print("LPA 一轮后标签:", lab)'''
C[("mining-graph","c3")] = '''import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor
rng = np.random.default_rng(0)
dense = rng.normal(0, 0.3, (200, 2))
sparse = rng.normal(6, 0.8, (30, 2))          # 稀疏正常簇
outlier = np.array([[6.5, 6.5], [-2, -2], [3, 3]])
X = np.r_[dense, sparse, outlier]
iso = IsolationForest(contamination=0.05, random_state=0).fit(X)
score = -iso.score_samples(X)
print("IsolationForest Top-5 异常:", np.argsort(-score)[:5], "（200+30 个正常点之后应为注入的 3 个）")
lof = LocalOutlierFactor(n_neighbors=10).fit_predict(X)
print(f"LOF 判定异常数: {(lof==-1).sum()}（相对密度：稀疏簇内点不被误杀）")
print("3σ 全局法会把整个稀疏簇误判 —— LOF 的价值所在")'''
C[("mining-graph","c4")] = '''import random, hashlib
random.seed(0)
stream = [random.choice(["A"]*6 + ["B"]*3 + ["C", "D", "E"]) for _ in range(1000)]
# ---- Misra-Gries（k=4 → 3 个计数器）----
counters = {}
for x in stream:
    if x in counters: counters[x] += 1
    elif len(counters) < 3: counters[x] = 1
    else:
        for key in list(counters):
            counters[key] -= 1
            if counters[key] == 0: del counters[key]
true = {x: stream.count(x) for x in "ABCDE"}
print("MG 计数（低估）:", counters, "| 真实:", true)
print(f"A 真实频率 {true['A']} > n/4=250 → 必被保留（无假阴性）")
# ---- Count-Min Sketch（50+ 种元素，碰撞可见）----
vocab = ['item%d' % i for i in range(50)] + ['A']*6 + ['B']*3
stream2 = [random.choice(vocab) for _ in range(1000)]
true2 = {x: stream2.count(x) for x in vocab}
w, d = 8, 4
table = [[0]*w for _ in range(d)]
def h(x, s): return int(hashlib.md5((str(s)+x).encode()).hexdigest()[:8], 16) % w
for x in stream2:
    for i in range(d): table[i][h(x, i)] += 1
def cms(x): return min(table[i][h(x, i)] for i in range(d))
print(f"CMS: A 真实 {true2['A']} -> 估计 {cms('A')} | item7 真实 {true2['item7']} -> {cms('item7')}（只高不低=上界性质）")'''
G["mining-graph-c1-l1"] = ("1. 写出 PageRank 迭代公式并手推 4 节点小图的两轮迭代；\n"
                           "2. 解释阻尼因子 d 的数学必要性（不可约/非周期/平稳分布唯一）；\n"
                           "3. 实现含 dangling node 处理的幂迭代并验证 PR 总和为 1。")
G["mining-graph-c2-l1"] = ("1. 手算给定划分的模块度 Q 并解释『减随机期望』的设计；\n"
                           "2. 模拟 Louvain 的局部移动与社区聚合两阶段；\n"
                           "3. 对比 Louvain/Leiden/LPA 的效率与质量取舍。")
G["mining-graph-c3-l1"] = ("1. 演示全局 3σ 在密度不均数据上的误杀与 LOF 相对密度的修复；\n"
                           "2. 用 Isolation Forest 输出异常分数并解释『更易被隔离』原理；\n"
                           "3. 设计无标签场景的评估：注入已知异常 + 人工复核 Top-N。")
G["mining-graph-c4-l1"] = ("1. 实现 Misra-Gries 并验证频繁项无假阴性、计数低估；\n"
                           "2. 实现 Count-Min Sketch 并演示上界性质与碰撞影响；\n"
                           "3. 对比三种窗口模型的内存与语义差异。")
P["mining-graph-c1-l1"] = "- 图的基本概念（节点/边/度）；\n- 矩阵向量乘法。"
P["mining-graph-c2-l1"] = "- 「PageRank」（c1-l1）的图表示。"
P["mining-graph-c3-l1"] = "- mining-prep c4 的不平衡评估；\n- 密度与近邻概念。"
P["mining-graph-c4-l1"] = "- c1~c3 的图与异常概念；\n- 哈希函数基础。"

# ═════ mining-recsys ═════
T["mining-recsys","c1"] = dict(
expected="""用户 0 的相似度 [1,1,0.42,1,1]；User-CF 预测 U0 对 I2 评分 4.50；Item 相似度向量（小矩阵上共现少，需 MF 补强）。""",
why=("推荐的本质是填补 99% 为空的用户-物品矩阵。User-CF 找『和你相似的人』，Item-CF 找"
     "『和你买过的相似商品』——后者因物品属性稳定、可离线预计算，通常是工业界的起点。"),
intuition=("User-CF 像问『跟你口味像的朋友最近看了啥』；Item-CF 像购物网站『买了 X 的人也买了 Y』。"
           "皮尔逊相关是『先扣掉各自打分风格再比』：习惯打 5 分的人与习惯打 3 分的人可能口味完全一致，"
           "不减均值就会把风格误当偏好。"),
cerr=("用未去均值的余弦比较打分风格迥异的用户；Item-CF 相似度用含当前用户的全体数据计算后线上直接用"
      "（应预计算并处理新物品冷启动）；把未评分当 0 分参与均值计算。"),
miscon=("1. **『User-CF 与 Item-CF 等价可互换』**——用户数≫物品数时 Item-CF 的相似度矩阵小得多且更稳定；\\n"
        "2. **『隐式反馈可用评分公式』**——没有负样本，需要 BPR/ALS 置信度加权；\\n"
        "3. **『相似度高就该推』**——还要排除已购/已曝光，并考虑流行度修正。"),
connection=("- **向前**：mining-freq c1 的共现支持度是 Item-CF 相似度的原始形态；\n"
            "- **向后**：c2 的矩阵分解解决稀疏性瓶颈；\n"
            "- **平行**：llm-b1 的余弦检索与本章用户相似度同一数学。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 两类反馈 | 显式有评分；隐式无负样本 |\n"
         "| User-CF | sim(u,v)·r 加权预测，K 近邻 |\n"
         "| Item-CF | 物品相似稳定可预计算，工业首选 |\n"
         "| 相似度 | 余弦/皮尔逊（去均值）/Jaccard |\n"
         "| 稀疏性 | 99% 空 → 需 MF（下一章）|"),
)
T["mining-recsys","c2"] = dict(
expected="""SGD+偏置 MF 200 轮后补全矩阵（观测 RMSE 0.030）：U0 对 I2 预测 3.71、U3 对 I0 预测 4.43；BPR：x_uij=1.59、loss=0.186（只要求 r̂_ui>r̂_uj 的相对偏好）。""",
why=("协同过滤的稀疏性让相似度不可靠，巨型矩阵也装不进内存。矩阵分解把用户与物品映射到 k 维隐空间，"
     "μ+b_u+b_i+p_uᵀq_i 的偏置项建模『打分风格』与『物品热度』；ALS 闭式解可并行，BPR 用 pairwise "
     "损失解决隐式反馈没有负样本的问题。"),
intuition=("矩阵分解像给用户和电影各发一张『口味/气质卡片』（k 维向量），匹配度=两张卡片的内积。"
           "偏置项是『这位用户见谁都打高分』与『这部片人人都爱』的公共常识——不单独建模，隐向量就得"
           "兼职解释它们。ALS 像谈判：先固定电影卡片议用户卡片，再反过来，几轮收敛，每步都有闭式解。"),
cerr=("把未评分当 0 分训练（引入海量假负例）；隐向量维度 k 太大过拟合、太小欠拟合（10~64 之间调）；"
      "不加 L2 正则，长尾用户的向量被几个评分拉飞。"),
miscon=("1. **『MF 只适合显式评分』**——ALS 置信度加权与 BPR 正是为隐式反馈设计；\\n"
        "2. **『偏置项可有可无』**——不建模偏置会让隐向量承担风格信息，精度显著下降；\\n"
        "3. **『SGD 与 ALS 可随意换』**——ALS 无学习率、天然并行，大规模隐式反馈首选。"),
connection=("- **向前**：c1 的稀疏矩阵是本章的输入；\n"
            "- **向后**：c3 的内容特征解决 MF 的新物品冷启动；\n"
            "- **平行**：mining-cluster c3 的 SVD 与 MF 是同一低秩近似思想的两种舞台。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 模型 | μ + b_u + b_i + p_uᵀq_i |\n"
         "| 目标 | 只对观测评分求误差 + L2 正则 |\n"
         "| ALS | 交替闭式解、可并行、适合隐式 |\n"
         "| 隐式 | 置信度 c_ui=1+α·次数；BPR pairwise |\n"
         "| 调参 | k∈10~64、λ 正则必加 |"),
)
T["mining-recsys","c3"] = dict(
expected="""TF-IDF (4×10)；时间衰减画像与候选相似度 [0.626,0.543,0,0.169] → 推荐手机壳(0.169)；DIN 式注意力（候选=笔记本）权重 [0.73,0.27]——模型自己学该参考哪段历史。""",
why=("协同过滤 cold start 无解：新用户没行为、新物品没交互。内容推荐用物品自身特征（文本/类目/图像）"
     "匹配用户画像，彻底绕开行为数据；DIN 的注意力聚合与 MIND 的多兴趣向量则是画像聚合的现代答案。"),
intuition=("内容推荐像猎头看简历不看人脉：物品特征是简历（TF-IDF/embedding），用户画像是"
           "『他过往看重的简历特征加权平均』。简单平均一视同仁，时间衰减让『最近看的』更有话语权，"
           "注意力聚合（DIN）让模型自己学『当前候选该参考哪段历史』。"),
cerr=("用户画像用全历史等权平均（兴趣漂移被稀释）；文本特征不做 IDF 加权（『的/了』淹没关键词）；"
      "多模态 embedding 直接拼接不做量纲归一。"),
miscon=("1. **『内容推荐无冷启动』**——新物品无碍，但新用户仍无画像（可用注册信息或热门兜底）；\\n"
        "2. **『内容推荐没有过滤气泡问题』**——恰恰相反，只推相似内容会窄化兴趣，需与 CF 混合；\\n"
        "3. **『多兴趣=多加几个向量』**——MIND 需要专门的聚类/胶囊结构与匹配策略。"),
connection=("- **向前**：c2 的 MF 隐向量与内容 embedding 可拼接成混合模型；\n"
            "- **向后**：c4 的评估衡量混合策略的离线在线差异；\n"
            "- **平行**：llm-b1 的 embedding 检索与本章内容匹配同一套几何。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 三步 | 物品特征 → 用户画像聚合 → 相似度排序 |\n"
         "| 画像 | 等权平均 / 时间衰减 / DIN 注意力 / MIND 多兴趣 |\n"
         "| 优点 | 新物品无冷启动、可解释 |\n"
         "| 缺点 | 同质化（过滤气泡）、特征工程重 |\n"
         "| 混合 | CF+内容加权或级联是工业标配 |"),
)
T["mining-recsys","c4"] = dict(
expected="""NDCG@3=0.94（位置折扣：第 1 位权重 1、第 3 位 0.63）；P@4=0.50、MRR=0.33；位置 CTR 示例第 1 位 12% vs 第 5 位 3%（需位置消偏）；GAUC 按用户分组避免『活跃用户排前』虚高。""",
why=("离线好≠线上好：选择偏差（只见曝光过的）、位置偏差（第 1 位 CTR 高数倍）、流量回流的闭环"
     "都会让离线指标说谎。NDCG 因位置折扣与分级相关性成为离线主力，GAUC 按用户分组才是推荐场景"
     "正确的 AUC——而最终裁判永远是 A/B。"),
intuition=("离线评估像用往年真题估分：便宜快但有偏（真题没覆盖新题型）。位置偏差像把答案抄在第一行——"
           "放在第 1 位的物品天然多点。GAUC 是『每次考试按考生分组算分再平均』：全局 AUC 高可能只是"
           "把活跃用户排在低活用户前面，同一用户内部的排序才是推荐的本职。"),
cerr=("用全局 AUC 汇报推荐效果（应 GAUC）；离线指标提升 0.3% 就上线（在线 A/B 才是裁判）；"
      "不处理位置偏差，新模型学的是『排在前面』而不是『更相关』。"),
miscon=("1. **『RMSE 低=推荐好』**——用户关心 Top-N 列表，评分精度与排序质量脱节；\\n"
        "2. **『离线指标可以替代 A/B』**——只能做快速筛选，因果收益必须在线验证；\\n"
        "3. **『曝光数据无偏』**——它是上一版策略的产物（富者愈富），需要逆倾向加权或随机流量。"),
connection=("- **向前**：c1~c3 的所有模型都过本章的评估关；\n"
            "- **向后**：llm-b2 的 Agent 评估与本章共享『离线筛+在线验』两层结构；\n"
            "- **平行**：mining-prep c4 的偏差意识与本章的位置偏差同源。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 两层 | 离线（快/有偏）→ 在线 A/B（贵/可信）|\n"
         "| Top-N | Precision/Recall@K、MAP、NDCG、MRR |\n"
         "| GAUC | 按用户分组 AUC，推荐场景正确用法 |\n"
         "| 四陷阱 | 选择偏差/位置偏差/闭环/流行度混杂 |\n"
         "| 铁律 | 离线好≠线上好 |"),
)
C[("mining-recsys","c1")] = '''import numpy as np
R = np.array([[5,3,0,1], [4,0,0,1], [1,1,0,5], [0,0,5,4], [0,3,4,0]], float)
def cos_sim(a, b):
    mask = (a>0)&(b>0)
    if not mask.any(): return 0
    return float(a[mask]@b[mask]/(np.linalg.norm(a[mask])*np.linalg.norm(b[mask])))
n = len(R)
S = np.array([[cos_sim(R[i], R[j]) for j in range(n)] for i in range(n)])
print("用户相似度(0-1):", np.round(S, 2)[0])
# 预测用户 0 对物品 2 的评分（User-CF）
u = 0; it = 2
neigh = np.argsort(-S[u])[[1, 2]]
num = sum(S[u, v]*R[v, it] for v in neigh if R[v, it] > 0)
den = sum(abs(S[u, v]) for v in neigh if R[v, it] > 0)
print(f"User-CF 预测 U0 对 I2 评分: {num/den:.2f}")
# Item-CF 相似度
Si = np.array([[cos_sim(R[:, i], R[:, j]) for j in range(4)] for i in range(4)])
print("Item 相似度 I2 与:", np.round(Si[2], 2))'''
C[("mining-recsys","c2")] = '''import numpy as np
rng = np.random.default_rng(0)
R = np.array([[5,3,0,1], [4,0,0,1], [1,1,0,5], [0,0,5,4]], float)
mask = R > 0
mu = R[mask].mean()
bu = np.zeros(4); bi = np.zeros(4)
k = 2
P = rng.normal(0, 0.1, (4, k)); Q = rng.normal(0, 0.1, (4, k))
lr, lam = 0.01, 0.02
for epoch in range(200):
    for u in range(4):
        for i in range(4):
            if mask[u, i]:
                e = R[u, i] - (mu + bu[u] + bi[i] + P[u]@Q[i])
                bu[u] += lr*(e - lam*bu[u]); bi[i] += lr*(e - lam*bi[i])
                P[u] += lr*(e*Q[i] - lam*P[u]); Q[i] += lr*(e*P[u] - lam*Q[i])
pred = mu + bu[:, None] + bi[None, :] + P@Q.T
print("补全后的评分矩阵:\\n", np.round(pred, 2))
print(f"观测 RMSE: {np.sqrt(((R-pred)[mask]**2).mean()):.3f}")
# BPR pairwise 损失
u, i_pos, j_neg = 0, 0, 2
x = (P[u]@(Q[i_pos]-Q[j_neg]))
import math
bpr = -math.log(1/(1+math.exp(-x)))
print(f"BPR: x_uij={x:.2f} loss={bpr:.3f}（要求 r̂_ui > r̂_uj）")'''
C[("mining-recsys","c3")] = '''import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
items = ["苹果手机 手机 旗舰", "安卓手机 手机 性价比", "苹果 笔记本 电脑", "手机壳 手机 配件"]
tfidf = TfidfVectorizer().fit_transform(items).toarray()
print("物品 TF-IDF 形状:", tfidf.shape)
hist = [0, 1]                                     # 用户看过 0/1 两件
w = np.exp(-0.1*np.array([0, 2]))                 # 时间衰减
profile = (tfidf[hist] * w[:, None]).sum(0)/w.sum()
sims = tfidf @ profile
print("与用户画像相似度:", np.round(sims, 3))
cand = [i for i in range(len(items)) if i not in hist]
print("推荐:", [(items[i][:8], round(sims[i], 3)) for i in sorted(cand, key=lambda i: -sims[i])[:2]])
# DIN 思想：注意力权重与候选相关
att = np.exp(tfidf[cand] @ tfidf[2]); att /= att.sum()
print("DIN 式注意力（候选=笔记本）:", np.round(att, 2))'''
C[("mining-recsys","c4")] = '''import numpy as np
def dcg(rel): return sum(r/np.log2(i+2) for i, r in enumerate(rel))
def ndcg(rel, K): 
    rel = rel[:K]; ideal = sorted(rel, reverse=True)
    return dcg(rel)/dcg(ideal)
recs = [3, 0, 2, 1]                                # 推荐列表的相关性分级
print(f"NDCG@3={ndcg(recs, 3):.2f}（位置折扣：第 1 位权重 1，第 3 位 0.63）")
def precision_at_k(rec, rel_set, K): return len(set(rec[:K]) & rel_set)/K
def mrr(rec, rel_set):
    for i, r in enumerate(rec):
        if r in rel_set: return 1/(i+1)
    return 0
rec_ids = [10, 22, 7, 5]; rel = {7, 5}
print(f"P@4={precision_at_k(rec_ids, rel, 4):.2f} | MRR={mrr(rec_ids, rel):.2f}")
# 位置偏差
print("位置 CTR 示例: 第1位 12% vs 第5位 3%（同一物品差 4 倍 → 需位置消偏）")
print("GAUC: 按用户分组算 AUC 再加权平均，避免『活跃用户排前』虚高")'''
G["mining-recsys-c1-l1"] = ("1. 在小型评分矩阵上计算用户/物品余弦相似度并解释皮尔逊去均值的意义；\n"
                            "2. 用 User-CF 加权近邻预测缺失评分；\n"
                            "3. 对比 User-CF 与 Item-CF 的稳定性与计算规模，说明工业界偏好。")
G["mining-recsys-c2-l1"] = ("1. 用 SGD 训练带偏置的 MF 模型并补全评分矩阵；\n"
                            "2. 解释 μ/b_u/b_i 的建模意义与『只对观测求误差』；\n"
                            "3. 写出 BPR 的 pairwise 目标与 ALS 置信度加权对隐式反馈的适配。")
G["mining-recsys-c3-l1"] = ("1. 用 TF-IDF 构建物品向量并做时间衰减加权的用户画像；\n"
                            "2. 对比四种画像聚合（等权/衰减/注意力/多兴趣）的动机；\n"
                            "3. 说明内容推荐的冷启动优势与过滤气泡风险及混合策略。")
G["mining-recsys-c4-l1"] = ("1. 实现 NDCG/Precision@K/MRR 并解释位置折扣；\n"
                            "2. 论证 GAUC 优于全局 AUC 的原因（用户内排序才是本职）；\n"
                            "3. 列出离线评估四陷阱并设计『离线筛+在线验』流程。")
P["mining-recsys-c1-l1"] = "- numpy 矩阵运算；\n- 余弦相似度概念。"
P["mining-recsys-c2-l1"] = "- 「User-CF 与 Item-CF」（c1-l1）。"
P["mining-recsys-c3-l1"] = "- c1/c2 的协同过滤；\n- TF-IDF 概念。"
P["mining-recsys-c4-l1"] = "- c1~c3 全部；\n- A/B 测试概念。"

EX = {k: v.get("expected", "") for k, v in T.items()}
WHY = {k: v["why"] for k, v in T.items()}
INTU = {k: v["intuition"] for k, v in T.items()}

MD = {}
for lid, goals in G.items():
    course = lid.rsplit("-c", 1)[0]
    ch = "c" + lid.rsplit("-c", 1)[1].split("-")[0]
    key = (course, ch)
    MD[lid] = build_md(LIBS[course].orig_content(lid), goals, P[lid], WHY[key], INTU[key],
                       C[key], EX[key], T[key]["cerr"], T[key]["miscon"],
                       T[key]["connection"], T[key]["summary"], REF)

if len(sys.argv) > 1 and sys.argv[1] == "verify":
    for key in C:
        print("=" * 20, key[0], key[1])
        exec(compile(C[key], "%s-%s" % key, "exec"), dict(globals()))
    print("VERIFY-ONLY")
elif not all(EX.values()):
    print("expected 未填:", [k for k in EX if not EX[k]])
else:
    for lid in G:
        LIBS[lid.rsplit("-c", 1)[0]].patch_lesson(lid, MD[lid])
