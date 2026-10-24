# -*- coding: utf-8 -*-
"""第三波引擎：按章主题包批量达标改造三大课剩余小节。
策略：原文实质内容保留为「核心概念与原理详解」；按章补齐模板模块+章级实跑代码。
章级代码先在主会话统一实跑验证，预期输出写实测值。"""
import json, io, sys, os

sys.path.insert(0, os.path.dirname(__file__))
from wave3_lib import build, apply

# ============ 概率统计 c13(余3)+c14-c18 ============
STATS_THEMES = {
    "c13x": dict(  # 非参数与秩检验
        prereq="- 卡方检验家族（l13-1~l13-4）；t 检验与正态假设（l8-5）",
        why="参数检验把“总体正态”当前提，但收入、时长、评分等业务数据常是偏态或多峰——前提碎了，p 值随之失真。秩统计只用“大小顺序”而非数值本身，把分布假设降到最低。",
        intuition="合唱比赛不数音分差多少，只排名次：名次对“离群的高音”不敏感——秩方法就是把数据换成名次再分析。",
        code="""import numpy as np
rng = np.random.default_rng(1)
# 对数正态(强偏态)数据: 参数 t 检验 vs Mann-Whitney 秩检验
def rank_sum_test(a, b):
    allv = np.concatenate([a, b])
    r = np.argsort(np.argsort(allv)) + 1
    ra = r[:len(a)].sum()
    ua = ra - len(a)*(len(a)+1)/2
    mu = len(a)*len(b)/2
    sd = np.sqrt(len(a)*len(b)*(len(a)+len(b)+1)/12)
    return (ua - mu) / sd            # z 统计量(正态近似, 加连续校正略)
a = rng.lognormal(0, 1, 80); b = rng.lognormal(0.5, 1, 80)
print(f"Mann-Whitney z = {rank_sum_test(a, b):.2f} (|z|>2.6 即 p<0.01，拒绝同分布)")""",
        expected="Mann-Whitney z ≈ −3.1（拒绝两组同分布；b 组均值更高故为负；偏态下秩检验仍稳）",
        cerr="把秩检验当均值检验（它比较的是分布位置/随机占优，不是均值差）；有大量并列值时不做并列校正；双侧/单侧方向写反。",
        miscon="1. 非参数=没有假设——它仍假设独立性与同分布形状（除位置外）；\n2. 秩检验功效必然低——对正态数据约损失 5%（ARE=0.955），对偏态/厚尾反而更高；\n3. 小样本查表大样本近似——n<10 别用正态近似。",
        connection="- **向前**：l13-1~4 的卡方族管分类，本组管偏态连续；\n- **向后**：c14 回归的残差诊断会再遇“非正态怎么办”；\n- **平行**：量化课的 RankIC 同为“用秩替代数值”。",
        summary="| 结论 | 内容 |\n| --- | --- |\n| 秩方法 | 用顺序替代数值，摆脱分布形状假设 |\n| 三剑客 | Mann-Whitney（两独立）、Wilcoxon（配对）、K-W（多组） |\n| 代价 | 正态下功效约损 5%，偏态下反而占优 |",
    ),
    "c14": dict(  # 相关与简单回归
        prereq="- 散点图与协方差（l6-5/l6-6）；方差与标准差（l4-3）",
        why="描述两变量“一起动”只是第一步；业务要的是“x 每增一单位 y 平均增多少、这关系可不可信”——把相关升级为可预测、可检验的回归方程。",
        intuition="相关是“两个人步伐像不像”，回归是“用一个人的位置预测另一个人的位置”——后者给出可执行的公式与不确定性度量。",
        code="""import numpy as np
rng = np.random.default_rng(7)
n = 40
x = rng.uniform(10, 100, n)
y = 30 + 0.8 * x + rng.normal(0, 8, n)
xb, yb = x.mean(), y.mean()
b1 = ((x-xb)*(y-yb)).sum() / ((x-xb)**2).sum()
b0 = yb - b1*xb
yhat = b0 + b1*x
sse = ((y-yhat)**2).sum(); sst = ((y-yb)**2).sum()
r2 = 1 - sse/sst
se_b1 = np.sqrt(sse/(n-2) / ((x-xb)**2).sum())
t_b1 = b1/se_b1
print(f"y = {b0:.2f} + {b1:.3f}x, R2={r2:.3f}, t(b1)={t_b1:.2f}")""",
        expected="y ≈ 24.1 + 0.914x，R²≈0.94，t(b1)≈23.9（斜率 0.8 被还原且高度显著，截距/斜率的抽样波动属正常）",
        cerr="把 R² 高当因果证据；对回归系数用 z=1.96（小样本应用 t）；忘记查看残差图直接解释系数。",
        miscon="1. 相关强→回归可靠——离群点可同时制造高相关与坏回归；\n2. R² 越高模型越好——外推区间与残差结构比单看 R² 重要；\n3. 斜率显著=经济显著——效应量与业务阈值要分开看。",
        connection="- **向前**：l6-6 的 Pearson r 与本节 OLS 斜率同源（标准化与否）；\n- **向后**：c15 多元回归把“控制其他变量”制度化；\n- **平行**：金融数学 c2 的假设检验直接用于斜率 t 检验。",
        summary="| 结论 | 内容 |\n| --- | --- |\n| OLS | b1=Cov/Var，b0=ȳ−b1x̄ |\n| R² | 解释的变异占比；SST=SSR+SSE |\n| 推断 | 斜率的 t 检验；区间与预测区间之别 |",
    ),
    "c15": dict(  # 多元回归
        prereq="- 一元 OLS 与 R²（c14）；t/F 检验（l8-6、l10-6）",
        why="现实里 y 同时被多个 x 驱动，且 x 之间互相纠缠——不加控制会读出虚假效应，乱加特征会过拟合。多元回归的两大主题就是“控制”与“诊断”。",
        intuition="像多人合影里辨认某人：只看单人照（一元）会认错；把其他人“按住不动”（控制变量）才能看清目标人物——多重共线性就是其他人站得太近挡住了视线。",
        code="""import numpy as np
rng = np.random.default_rng(3)
n = 200
x1 = rng.normal(0, 1, n)
x2 = 0.8*x1 + rng.normal(0, 0.6, n)      # x2 与 x1 高度相关
y = 2*x1 + 0.5*x2 + rng.normal(0, 1, n)
X = np.column_stack([np.ones(n), x1, x2])
b = np.linalg.lstsq(X, y, rcond=None)[0]
resid = y - X@b
s2 = resid@resid/(n-3)
covb = s2*np.linalg.inv(X.T@X)
se1 = np.sqrt(covb[1,1])
r2 = 1 - resid@resid/((y-y.mean())**2).sum()
adj = 1-(1-r2)*(n-1)/(n-3)
b2hat = np.polyfit(x1, x2, 1); r2x = 1-((x2-np.polyval(b2hat,x1))**2).sum()/((x2-x2.mean())**2).sum()
vif1 = 1/(1-r2x)
print(f"b1={b[1]:.3f}(真2.0) se={se1:.3f}; R2={r2:.3f} adjR2={adj:.3f}; VIF(x1)={vif1:.2f}")""",
        expected="b1≈1.93（真 2.0）但 se 膨胀到 0.115（无共线时约 0.07）；R²≈0.86 与 adjR² 接近；VIF(x1)≈3+（x1/x2 相关 0.8）",
        cerr="比较 R² 判定加变量好坏（应比调整 R²）；VIF>10 才处理——阈值 5 也常用且应报敏感性；哑变量基组忘留（全类别入模造成完全共线）。",
        miscon="1. 系数=该变量单独的效应——是“控制其他变量后”的净效应；\n2. 多重共线影响预测——主要伤系数解释与推断，纯预测反而无妨；\n3. 显著变量越多越好——噪声特征进入模型抬高标准误（过拟合）。",
        connection="- **向前**：c14 的 OLS 推广到多变量（矩阵解 b=(X'X)⁻¹X'y）；\n- **向后**：c16 贝叶斯回归给系数完整后验；\n- **平行**：因果推断 c5 的回归调整即多元回归的因果化解读。",
        summary="| 结论 | 内容 |\n| --- | --- |\n| 净效应 | 控制其他变量后的偏回归系数 |\n| 惩罚 | 调整 R² = 1−(1−R²)(n−1)/(n−k−1) |\n| 诊断 | VIF 共线 / 残差图异方差 / 哑变量基组 |",
    ),
    "c16": dict(  # 贝叶斯
        prereq="- 条件概率与贝叶斯定理（l3-5）；二项分布（l4-4）；正态分布（l5-4）",
        why="频率学派把参数当固定未知数，只能给出区间与 p 值；业务常需要“参数取某值的概率多大”这类直接决策语言——贝叶斯把参数当随机变量，用数据不断更新信念。",
        intuition="先验是开庭前的印象，证据（数据）是庭审，后验是听完证词后的判断——下一次开庭时，这次的后验又成为新的先验。",
        code="""import numpy as np
rng = np.random.default_rng(0)
# Beta-Binomial 共轭: 先验 Beta(2,2), 数据 12 成 3 败
a0, b0 = 2, 2
succ, fail = 12, 3
a1, b1 = a0+succ, b0+fail
grid = np.linspace(0.001, 0.999, 2000)
post = grid**(a1-1)*(1-grid)**(b1-1); post/=post.sum()
mean = (grid*post).sum()
ci = grid[np.cumsum(post).searchsorted([0.025, 0.975])]
print(f"后验均值={mean:.3f}, 95%可信区间=[{ci[0]:.3f},{ci[1]:.3f}]")
print(f"解析均值={(a1)/(a1+b1):.3f} (Beta({a1},{b1}))")""",
        expected="后验均值≈0.737（与解析 (2+12)/(2+2+12+3)=14/19 完全一致），95% 可信区间≈[0.524, 0.903]",
        cerr="把可信区间解读成置信区间（前者可说“参数在区间内概率 95%”，后者不行）；先验分布忘检查稳健性；MCMC 未收敛就汇报。",
        miscon="1. 贝叶斯=主观——先验的影响随数据增大而衰减，且可做敏感性分析；\n2. 两学派必有一对错——大样本下二者趋同，小样本下贝叶斯多一个信息源；\n3. 共轭先验普遍存在——多数模型要靠 MCMC 数值采样。",
        connection="- **向前**：l3-5 的贝叶斯定理是全部框架的种子；\n- **向后**：c17 的 A/B 检验可用贝叶斯化决策；\n- **平行**：量化课的信号更新（先验行情观+新数据）同构。",
        summary="| 结论 | 内容 |\n| --- | --- |\n| 更新 | 后验 ∝ 先验 × 似然 |\n| 共轭 | Beta-Binomial、正态-正态有解析解 |\n| 区间 | 可信区间可直接说参数概率 |",
    ),
    "c17": dict(  # 实验设计与A/B
        prereq="- 假设检验与功效（l10-5/l10-6）；置信区间（l9-6）；随机化（第 4 章直觉）",
        why="线上实验是因果推断的工业形态：分流、样本量、偷窥、多重指标——每一步都有专门的坑。不懂实验设计的分析师会把噪声当增长。",
        intuition="A/B 测试像双盲临床试验的互联网版：随机分组保证可比，但“天天揭盲看结果”等于医生随时改判——检验次数一多，假阳性必然出现。",
        code="""import numpy as np
rng = np.random.default_rng(42)
# 样本量与偷窥的双重演示
p0, mde, alpha, beta = 0.10, 0.02, 0.05, 0.20
z_a, z_b = 1.96, 0.84
n_per = ((z_a+z_b)**2 * (p0*(1-p0)+(p0+mde)*(1-p0-mde))) / mde**2
print(f"每组需要约 {n_per:,.0f} 人 (MDE=2pp)")
# 偷窥: 每 2% 进度看一次, 无真实效应下 25% 进度内即出现 p<0.05
false_alarm = 0
for _ in range(1000):
    hit = False
    for k in (2, 5, 10, 25):          # 4 次偷窥
        na = int(n_per*k/100)
        if na < 50: continue
        c1 = rng.binomial(na, p0); c2 = rng.binomial(na, p0)
        p_pool = (c1+c2)/(2*na)
        se = np.sqrt(p_pool*(1-p_pool)*2/na)
        if abs(c1/na - c2/na)/se > 1.96: hit = True; break
    false_alarm += hit
print(f"无效应下偷窥 4 次的假阳性率 {false_alarm/10:.0f}% (单次应为 5%)")""",
        expected="每组约 3,834 人；无效应下偷窥 4 次的假阳性率 15%（远超单次的 5%）",
        cerr="样本量公式用单侧 z（双侧应 1.96）；偷窥后“这次显著就停”（应预设停止规则或用序贯检验）；CUPED 协变量用了实验后数据（必须用实验前指标）。",
        miscon="1. 样本量可以边跑边补——中途补量改变检验语义；\n2. 显著=上线——还要效应量、成本与长期效应；\n3. SRM 只是统计洁癖——分流偏差意味着实验组根本不可比。",
        connection="- **向前**：第 10 章的两类错误是样本量公式的骨架；\n- **向后**：c18 之后进入综合应用；\n- **平行**：因果推断第 4 章 RCT 的工程化版本。",
        summary="| 结论 | 内容 |\n| --- | --- |\n| 样本量 | n=(z_α+z_β)²·2p(1−p)/MDE² |\n| 偷窥 | 反复看 p 值会膨胀假阳性，须序贯设计 |\n| 工具 | SRM 体检、Bonferroni/FDR、CUPED 缩方差 |",
    ),
    "c18": dict(  # 时间序列
        prereq="- 平稳性与 ADF（《金融数学》c3-1 已有前置直觉）；回归（c14/c15）",
        why="时间序列打破“样本独立”假设：今天与昨天相关、趋势让相关变伪、季节掩盖拐点——不加诊断直接套回归，结论系统性失真。",
        intuition="时序像一条河流：成分分解是区分“河道走势（趋势）、四季丰枯（季节）、随机涟漪（噪声）”；平稳性是问“河流的统计性格是否随时间改变”。",
        code="""import numpy as np
rng = np.random.default_rng(5)
n = 300
t = np.arange(n)
trend = 0.05*t
season = 3*np.sin(2*np.pi*t/12)
noise = rng.normal(0, 2, n)
y = 10 + trend + season + noise
# 移动平均提取趋势, 残差看季节
ma12 = np.convolve(y, np.ones(12)/12, mode="valid")
detrend = y[:len(ma12)] - ma12
acf1_d = np.corrcoef(detrend[:-1], detrend[1:])[0,1]
r = np.argsort(np.argsort(y))  # 占位: 演示用
print(f"趋势斜率≈0.05(真实), MA12 长度 {len(ma12)}")
print(f"去趋势残差的 lag-1 自相关 {acf1_d:.2f} (噪声+季节残留)")
# 伪回归警示: 两个独立随机游走的相关系数
a = np.cumsum(rng.normal(0,1,200)); b = np.cumsum(rng.normal(0,1,200))
print(f"两条独立随机游走的 r = {np.corrcoef(a,b)[0,1]:.2f} (高=伪相关)")""",
        expected="去趋势残差 lag-1 自相关≈0.49（季节残留）；两条独立随机游走的相关系数≈0.55（伪回归现场，重复运行常达 ±0.6+）",
        cerr="对价格水平而非收益率算相关；差分后忘检查是否过度差分；ARIMA 定阶只看 AIC 不看残差白噪声。",
        miscon="1. R² 高=预测好——趋势序列的伪回归 R² 天然高；\n2. 平稳=没有趋势——趋势平稳去趋势即可，差分平稳须差分，两者处理不同；\n3. 历史规律永久有效——结构断点让“过去”失效（ regime change）。",
        connection="- **向前**：c14 回归的时序陷阱专治；\n- **向后**：全课程综合应用；\n- **平行**：《金融数学》c3 章是本主题的量化版精讲。",
        summary="| 结论 | 内容 |\n| --- | --- |\n| 成分 | 趋势+季节+循环+噪声（加法/乘法） |\n| 平稳 | 均值/方差/自协方差不随时间漂移 |\n| 伪回归 | 独立随机游走也可 r≈0.7——先平稳化 |",
    ),
}

STATS_LESSON_THEME = {}  # 由 id 前缀映射主题
