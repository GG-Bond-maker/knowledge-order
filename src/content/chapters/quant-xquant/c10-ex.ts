import type { Exercise } from '../../../types';

/* c10 习题：难度 2/4/4/2 → 8/13/13/8，共 42 题。 */

const MKT = `import numpy as np
import pandas as pd

# ── 三个标的的锚点价格（拐点写死）──
A_ANCHORS = [(0, 4.00), (120, 3.15), (250, 3.55), (360, 2.55), (470, 3.05), (590, 2.65),
             (700, 2.45), (780, 2.60), (900, 3.10), (1030, 3.55), (1150, 3.95), (1299, 4.03)]
B_ANCHORS = [(0, 1.00), (150, 1.28), (260, 1.05), (400, 1.42), (520, 1.20), (650, 1.58),
             (780, 1.38), (900, 1.72), (1030, 1.55), (1150, 1.88), (1299, 2.05)]
C_ANCHORS = [(0, 3.00), (150, 2.72), (280, 3.05), (400, 2.85), (520, 3.22), (650, 3.05),
             (780, 3.40), (900, 3.28), (1030, 3.62), (1150, 3.48), (1299, 3.85)]

def _trend(anchors, n):
    idx = [i for i, _ in anchors]
    return np.interp(np.arange(n), idx, np.log([p for _, p in anchors]))

def _bridge_noise(seed, sigma, n):
    rng = np.random.default_rng(seed)
    w = rng.normal(0, 1, n); w[0] = 0.0
    walk = np.cumsum(w); t = np.arange(n) / (n - 1)
    return sigma * (walk - t * walk[-1])

def make_market(n=1300, start="2021-01-04"):
    """返回三资产收盘价 DataFrame，列名 A=沪深300 / B=纳指100 / C=黄金"""
    t = np.arange(n) / (n - 1)
    lpA = _trend(A_ANCHORS, n) + _bridge_noise(11, 0.0068, n)
    pA = np.exp(lpA)
    rA = np.diff(np.log(pA), prepend=np.log(pA[0])); rA = rA - rA.mean()
    lpB = _trend(B_ANCHORS, n) + _bridge_noise(23, 0.0075, n) + 0.65 * np.cumsum(rA)
    lpC = _trend(C_ANCHORS, n) + _bridge_noise(37, 0.0042, n) + 0.15 * np.cumsum(rA)
    return pd.DataFrame({"A": pA, "B": np.exp(lpB), "C": np.exp(lpC)},
                        index=pd.bdate_range(start, periods=n))

PX = make_market()                   # 收盘价
RET = PX.pct_change().fillna(0.0)    # 日收益率（简单收益）

def metrics(r, ann=252):
    """累计收益%、年化%、年化波动%、最大回撤%、简化夏普（年化/波动，无风险利率取 0）"""
    n = len(r); eq = (1 + r).cumprod(); tot = eq.iloc[-1] - 1
    return {"tot": tot * 100,
            "ann": ((1 + tot) ** (ann / n) - 1) * 100,
            "vol": r.std() * np.sqrt(ann) * 100,
            "mdd": (eq / eq.cummax() - 1).min() * 100,
            "sharpe": (r.mean() * ann) / (r.std() * np.sqrt(ann))}

def simulate(target_w, freq=21, stop=None, take=None):
    """组合模拟：权重随价格漂移，仅在再平衡日（每 freq 个交易日）拉回目标。
    freq=None 表示买入持有不再平衡；stop/take 为相对上次再平衡的收益阈值（比例）。
    返回 (日收益 Series, 换手总次数)"""
    reb = set(range(0, len(RET), freq)) if freq else {0}
    cols = list(RET.columns)
    w = target_w.reindex(cols).fillna(0.0).astype(float)
    nav = 1.0; nav_entry = 1.0; in_pos = True; res = []; turn = 0.0
    for i, d in enumerate(RET.index):
        if i in reb:
            if not in_pos:
                in_pos = True; nav_entry = nav; turn += 1.0
            new_w = target_w.reindex(cols).fillna(0.0).astype(float)
            turn += float((new_w - w).abs().sum()); w = new_w
        if not in_pos:
            res.append(0.0); continue
        rv = RET.loc[d].reindex(cols).fillna(0.0)
        pr = float((w * rv).sum()); nav *= (1 + pr); res.append(pr)
        grown = w * (1 + rv); s = grown.sum()
        if s > 0: w = grown / s
        chg = nav / nav_entry - 1
        if stop is not None and chg <= -stop: in_pos = False
        elif take is not None and chg >= take: in_pos = False
    return pd.Series(res, index=RET.index), turn

EW = pd.Series({"A": 1/3, "B": 1/3, "C": 1/3})
ONLY_A = pd.Series({"A": 1.0, "B": 0.0, "C": 0.0})`;

/** 25 只合成标的池 + 向量化 IC（l2/l3 的代码题共用） */
const POOL = `
# ═══ 25 只合成标的：波动谱 8%~24%，低波动组趋势延续、高波动组均值回复 ═══
def make_pool(k=25, v_lo=0.08, v_hi=0.24, mu=0.00020,
              lam_lo=-0.10, lam_hi=0.20, look=20, seed0=9000):
    rA = RET["A"].values - RET["A"].values.mean()
    n = len(RET)
    rs = np.random.RandomState(20240101)
    s = np.zeros(n)
    for t in range(1, n):
        s[t] = 0.985 * s[t - 1] + 0.10 * rs.randn()
    s = s / s.std()
    mult = np.exp(0.30 * s)                       # 共同的市场波动状态
    cols = {}
    for i in range(k):
        f = i / (k - 1)                           # 0 = 最稳，1 = 最躁
        vol = (v_lo + (v_hi - v_lo) * f) / np.sqrt(252)
        lam = lam_hi if f >= 0.5 else lam_lo      # 高波动组反转更强（因子的弱点）
        beta = 0.30 + 0.50 * f
        rng = np.random.RandomState(seed0 + 29 * i)
        z = rng.randn(n)
        lp = np.zeros(n)
        for t in range(look + 1, n):
            lp[t] = (lp[t - 1] + mu + beta * mult[t] * rA[t]
                     + vol * mult[t] * z[t] - lam * (lp[t - 1] - lp[t - 1 - look]) / look)
        cols["E%02d" % (i + 1)] = np.exp(lp - lp[0])
    return pd.DataFrame(cols, index=RET.index)


def rank_ic(F, R):
    """逐期 Spearman 秩相关：按行取秩后算行内 Pearson（等价，且比循环快 150 倍）"""
    a = F.rank(axis=1); b = R.rank(axis=1)
    da = a.sub(a.mean(axis=1), axis=0); db = b.sub(b.mean(axis=1), axis=0)
    num = (da * db).sum(axis=1)
    den = np.sqrt((da ** 2).sum(axis=1) * (db ** 2).sum(axis=1))
    return (num / den.replace(0, np.nan)).where(a.notna().sum(axis=1) >= 5).dropna()


U = make_pool()
UR = U.pct_change().fillna(0.0)
MOM = U.pct_change(20)                 # 20 日动量因子
VOL20 = UR.rolling(20).std()
RAM = MOM / VOL20                      # 风险调整动量
REV = -U.pct_change(5)                 # 短期反转
uv = UR.std() * np.sqrt(252) * 100     # 每只标的自己的年化波动（分组依据）`;

/** l1 代码题：GDP 面板（写死，可复现） */
const GDP_PANEL = `

YEARS = list(range(2016, 2026))
C = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛"]
GDP = pd.DataFrame({
    "甲": [10.0, 11.2, 12.1, 13.4, 12.8, 14.9, 16.8, 18.1, 19.9, 21.4],
    "乙": [ 4.2,  4.5,  4.9,  5.2,  5.0,  5.6,  6.1,  6.4,  6.9,  7.3],
    "丙": [ 2.1,  2.3,  2.2,  2.6,  2.5,  2.9,  3.0,  3.4,  3.5,  3.9],
    "丁": [ 8.8,  9.1,  9.6,  9.4,  9.0,  9.8, 10.5, 10.9, 11.4, 12.0],
    "戊": [ 1.4,  1.5,  1.6,  1.7,  1.7,  1.9,  2.0,  2.1,  2.3,  2.4],
    "己": [ 6.0,  6.3,  6.6,  6.9,  6.7,  7.2,  7.8,  8.1,  8.5,  9.0],
    "庚": [ 3.3,  3.5,  3.8,  4.0,  3.9,  4.3,  4.7,  4.9,  5.3,  5.6],
    "辛": [ 5.1,  5.4,  5.7,  5.9,  5.8,  6.2,  6.6,  6.9,  7.2,  7.6],
}, index=YEARS)
STOCK = pd.DataFrame({
    "甲": [ 15.8,   0.8,  -2.8,   3.7,   7.6, -11.3,  14.4,  -7.9,  13.7,  -0.9],
    "乙": [-25.6,  -7.1,  -2.5,   9.0,  24.9,  15.7,   1.5,  37.9,   8.3,   4.5],
    "丙": [-11.9,   3.4,  -9.6, -28.3,  -9.9,   8.5, -14.6,   0.6, -28.2,  -6.8],
    "丁": [ 10.1,  21.1,  23.1,  14.8,  12.0,   4.6,   6.1,  -4.4,   1.8,  25.2],
    "戊": [ 30.3, -13.1,  11.7,  10.0,  -3.6,  22.3,  -1.9,   1.9,   5.3,  26.6],
    "己": [ -7.8,  20.0, -24.7,  21.9, -13.9,   7.6,  -2.4,  17.4,  27.5, -16.8],
    "庚": [-27.0,  27.2,  13.8,  -5.2, -16.3, -19.0,  32.1, -20.5,  -8.4,   4.1],
    "辛": [ 36.4,  17.7,  36.9,  -1.3,  11.9,   2.5,  -2.8,   2.7,   7.1, -18.9],
}, index=YEARS)`;

const GDP_SETUP = MKT + GDP_PANEL;

/** l3 代码题共用：带回测函数的完整环境 */
const BACKTEST_LIB = POOL + `

def backtest(freq=21, topn=5, mult=1.0):
    """每 freq 日按 20 日动量排名取前 topn 只等权；高波动期目标权重整体 × mult，其余为现金。
    返回 (日收益 Series, 换手, 平均仓位)。现金收益为 0，按含现金总权益归一化。"""
    pool_vol = VOL20.mean(axis=1)
    high_vol = (pool_vol > pool_vol.rolling(252).median()).values
    URv = UR.values; Mv = MOM.values; na = U.shape[1]; dates = UR.index
    w = np.zeros(na)
    res = np.empty(len(dates)); turn = 0.0; expo = np.empty(len(dates))
    for i in range(len(dates)):
        if i % freq == 0 and i > 0:
            row = Mv[i]
            if np.sum(~np.isnan(row)) >= topn:
                pos = np.where((~np.isnan(row)) & (row > 0))[0]
                nw = np.zeros(na)
                if len(pos):
                    pick = pos[np.argsort(-row[pos])[:topn]]
                    nw[pick] = (1.0 / len(pick)) * (mult if high_vol[i] else 1.0)
                turn += float(np.abs(nw - w).sum()); w = nw
        rv = URv[i]
        res[i] = float((w * rv).sum()); expo[i] = w.sum()
        grown = w * (1 + rv)
        te = grown.sum() + (1.0 - w.sum())      # 现金按 0 收益计入总权益
        if te > 0:
            w = grown / te
    return pd.Series(res, index=dates), turn, float(expo.mean())`;

const POOL_SETUP = MKT + POOL;
const BT_SETUP = MKT + BACKTEST_LIB;

export const quantXquantC10Exercises: Exercise[] = [
  /* ═══════════ l1：从直觉到因子（8 题）═══════════ */
  {
    id: 'quant-xquant-c10-l1-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c10-l1', tags: ['K', '因子'],
    question: '一个变量要成为「因子」，必须同时满足的四条里，**不包括**下面哪一条？',
    options: [
      { value: 'a', text: '它的 IC 必须大于 0.05，否则不算因子' },
      { value: 'b', text: '横截面上可比（同一时点能对池子里所有对象算值并排序）' },
      { value: 'c', text: '逐期可计算，且只用当天及之前的数据' },
      { value: 'd', text: '指向前向收益（与之后的收益排序相关）' },
    ],
    answer: 'a',
    explanation: 'IC 的大小是「检验的结论」，不是「定义的一部分」。一个因子的 IC 可能是 0 甚至为负（本章的动量因子 IC 就是 −0.0252），它仍然是因子。把「因子」等同于「预测器」是最常见的概念混淆。',
  },
  {
    id: 'quant-xquant-c10-l1-e2', type: 'single', difficulty: 2,
    relatedLessonId: 'quant-xquant-c10-l1', tags: ['K', '因子分类'],
    question: '「20 日收益率」这个变量属于六类因子中的哪一类？本课程为什么后续聚焦这一类？',
    options: [
      { value: 'a', text: '动量类；因为日频可得、样本大（25 只 × 1300 天）、构造简单' },
      { value: 'b', text: '价值类；因为它衡量了资产是否便宜' },
      { value: 'c', text: '宏观类；因为它反映经济环境' },
      { value: 'd', text: '另类类；因为它需要非传统数据' },
    ],
    answer: 'a',
    explanation: '六类因子：价值 / 动量 / 质量 / 波动率 / 宏观 / 另类。「过去 N 日收益」是动量类的标准代理变量。本课程选它做主线，理由是方法论上的：数据频率高、截面样本大、构造只需一个收益率，最适合把 IC 这套流程练熟。',
  },
  {
    id: 'quant-xquant-c10-l1-e3', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c10-l1', tags: ['U', '量级'],
    question: '如果一个日频因子的 IC 达到 0.8，说明这个因子非常强，值得重仓使用。',
    answer: false,
    explanation: '真实日频因子的 IC 在 0.02-0.05 量级，能到 0.1 已属「非常强」。IC = 0.8 几乎一定是前视偏差——最常见的成因是不小心把当期收益当成了前向收益（漏了 shift(-h)）。看到 0.8 应该先查代码，而不是先加仓。',
  },
  {
    id: 'quant-xquant-c10-l1-e4', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c10-l1', tags: ['U', '截面宽度'],
    question: '用本课程 A/B/C 三只标的算出 20 日动量的 IC = +0.2750，这个数字超过了「非常强」的阈值，说明动量因子在这三只标的上非常有效。',
    answer: false,
    explanation: '3 个对象的秩组合只有 6 种，Spearman 只能取 −1 / −0.5 / +0.5 / +1 这几个离散值。实测 1300 个交易日里逐期 IC 只有 4 种取值，均值 +0.2750 只是这几个离散数的加权平均，没有统计分辨率。因子证据的强度首先取决于截面宽度，不是样本长度。',
  },
  {
    id: 'quant-xquant-c10-l1-e5', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c10-l1', tags: ['K', 'GDP因子'],
    question: '本节 GDP 面板实测：总量因子 IC 均值 ______、ICIR ______；增速因子 IC 均值 ______、ICIR ______。两者符号相反，说明「GDP 大」和「增长快」是两个不同的因子。',
    blanks: [['0.1138', '+0.1138', '0.114'], ['0.3170', '+0.3170', '0.317'],
             ['-0.0329', '−0.0329', '-0.033'], ['-0.1071', '−0.1071', '-0.107']],
    explanation: '总量 +0.1138 / ICIR +0.3170；增速 −0.0329 / ICIR −0.1071。同一批对象、同一个目标变量（下一年股市收益），换个因子定义符号就翻了。这说明「直觉」和「数据」打架时，先怀疑直觉。',
  },
  {
    id: 'quant-xquant-c10-l1-e6', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c10-l1', tags: ['U', '因子'],
    question: '关于「因子」与「IC」的关系，下列说法正确的有？',
    options: [
      { value: 'a', text: '因子只是一个可排序的变量，它的预测力可能为零甚至为负' },
      { value: 'b', text: '同一批对象上，不同因子定义可以给出相反的 IC 符号' },
      { value: 'c', text: '单年 IC 可能很大（如 +0.57），但均值可能很小，所以单年结果不能当结论' },
      { value: 'd', text: '因子的 IC 必须为正，否则说明因子算错了' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 是典型误解。IC 为负只说明「排序反向」，这本身可能就是信号（反向使用）。本节的 GDP 增速因子 IC = −0.0329 就是负的，且它是一个合法、可计算的因子。',
  },
  {
    id: 'quant-xquant-c10-l1-e7', type: 'code', difficulty: 3,
    relatedLessonId: 'quant-xquant-c10-l1', tags: ['D', 'GDP因子'],
    setupCode: GDP_SETUP,
    lang: 'python',
    question: '给定 8 个国家的 GDP 面板（`GDP`）与股市年度收益面板（`STOCK`），实现 `factor_ic(factor, target)`：对每一期计算 `factor` 与「下一期 target」的 Spearman 秩相关，返回 IC 的 `pd.Series`。然后用它算出「总量因子」与「增速因子」的 IC 均值与 ICIR。\n\n注意：`factor` 的第 y 期要对 `target` 的第 y+1 期，两边的有效期数不同。',
    starterCode: `
def factor_ic(factor, target):
    pass

lvl = factor_ic(GDP, STOCK)
g = factor_ic(GDP.pct_change() * 100, STOCK)
print(round(lvl.mean(), 4), round(lvl.mean() / lvl.std(), 4))
print(round(g.mean(), 4), round(g.mean() / g.std(), 4))`,
    expectedOutput: '0.1138 0.317\n-0.0329 -0.1071',
    tests: `
lvl = factor_ic(GDP, STOCK)
g = factor_ic(GDP.pct_change() * 100, STOCK)
assert isinstance(lvl, pd.Series), "应返回 pd.Series"
assert abs(lvl.mean() - 0.1138) < 0.001, f"总量因子 IC 均值应约 0.1138，实际 {lvl.mean()}"
assert abs(lvl.mean() / lvl.std() - 0.3170) < 0.002, f"总量因子 ICIR 应约 0.3170"
assert abs(g.mean() - (-0.0329)) < 0.001, f"增速因子 IC 均值应约 -0.0329，实际 {g.mean()}"
assert lvl.mean() > 0 and g.mean() < 0, "两个因子符号应相反（本节核心结论）"
assert len(lvl) == 9, f"总量因子应有 9 期（2016-2024），实际 {len(lvl)}"
assert len(g) == 8, f"增速因子应有 8 期（2017-2024），实际 {len(g)}"`,
    answer: `
def factor_ic(factor, target):
    """逐期：第 y 期的 factor 对第 y+1 期的 target"""
    out = {}
    for i in range(len(factor.index) - 1):
        y = factor.index[i]
        ny = target.index[i + 1]
        a = factor.loc[y].dropna()
        b = target.loc[ny].dropna()
        common = a.index.intersection(b.index)
        if len(common) < 3:
            continue
        out[y] = float(a.loc[common].rank().corr(b.loc[common].rank()))
    return pd.Series(out)`,
    explanation: '核心是「错期」：第 y 期的因子必须对第 y+1 期的收益，用 `range(len-1)` 加索引偏移实现。另外注意两边的有效期数不同——GDP 有 10 年、可用作因子的是 2016-2024（9 期）；增速要先 pct_change 丢掉第一年，所以只剩 2017-2024（8 期）。这个「期数变少」是前向收益与因子变换叠加的必然结果。',
  },
  {
    id: 'quant-xquant-c10-l1-e8', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c10-l1', tags: ['D', '研究设计'],
    question: '有人给你一个直觉：「换手率突然放大的标的，后面会涨。」请回答：\n① 把这个直觉写成一个严格因子的完整定义（要满足因子的四条要求）；\n② 说明你会怎么构造它的前向收益，以及最容易引入前视偏差的地方；\n③ 如果你手上只有 3 只标的，你会怎么做研究？说出具体做法和它的局限。',
    referenceAnswer: `
① 因子定义（必须覆盖四条要求）：
- **横截面可比**：对池子里每只标的，在同一交易日算出「换手率放大程度」。建议定义为「近 5 日平均换手率 ÷ 近 60 日平均换手率」，这样不同标的的绝对换手水平差异被约掉，只剩「相对自身放大了多少」。
- **逐期可计算**：每个交易日收盘后即可算出，只用当日及之前的数据。分母的 60 日窗口也必须截至当日。
- **指向前向收益**：目标是之后 h 日的收益（h 可取 5 / 20 / 40）。
- **可复现**：公式写死（5 日 / 60 日、简单均值），数据源写死，无人工调整。
补充：如果池子里有不同市场的标的，换手率的计算口径（流通股 vs 总股本）必须统一，否则横截面不可比。

② 前向收益与前视风险：
- 构造：\`R = price.pct_change(h).shift(-h)\`，且因子时点 t 的收益从 t 开始算（不能从 t-h 开始）。
- **最易踩的三个前视**：
  1. **换手率数据的可得时点**：日频换手率通常收盘后才有，如果因子在「当日开盘」使用就是前视；正确做法是「t 日收盘算出因子，t+1 日开盘调仓」。
  2. **复权与股本变动**：如果用了「事后才知道」的复权因子或后来的股本，等于用了未来信息。
  3. **停牌与流动性**：换手率放大往往发生在复牌或消息面事件当天；如果用「事后筛选出的连续交易样本」，就是幸存者偏差。
- 建议在因子时点之后加 1 日缓冲（t 日算、t+1 日建仓），这是最保守的做法。

③ 只有 3 只标的怎么办：
- **能做**：仍然可以算逐期 IC（3 个对象也能算秩相关），也可以做「分组」以外的检验，例如「按因子值排序后看第 1 名 vs 第 3 名的收益差」。
- **局限（必须说清）**：3 个对象的秩组合只有 6 种，逐期 IC 只能取 −1 / −0.5 / +0.5 / +1 这几个离散值。实测 1300 个交易日只有 4 种取值——均值没有统计分辨率，任何「显著性」都不可信。
- **正确的做法**：① 先扩池（这是第一优先，截面宽度比样本长度更重要）；② 在扩池之前，把研究目标从「证明因子有效」降级为「检查实现是否正确」——即只验证 IC 的计算流程、前视检查、分组逻辑有没有 bug，不试图得出「有效/无效」的结论。
- **一句话总结**：3 只标的上能练手，不能下结论。`,
    rubric: [
      { point: '① 因子定义覆盖「横截面可比 / 逐期可算 / 指向前向收益 / 可复现」四条', score: 4 },
      { point: '① 因子写成「相对自身」的比率（如 5 日/60 日），而不是绝对换手率', score: 2 },
      { point: '② 明确指出「换手率数据的可得时点」这一前视风险，并给出 t 算 t+1 建仓的对策', score: 3 },
      { point: '② 再指出至少一个前视/偏差来源（复权、停牌、幸存者）', score: 2 },
      { point: '③ 说清 3 只标的的 IC 只有少数离散取值、无法下结论', score: 3 },
      { point: '③ 给出「先扩池 / 降级为流程检查」的具体做法', score: 2 },
    ],
    keywords: ['横截面', '前向收益', 'shift', '前视', '可得时点', '截面宽度', '离散取值'],
    explanation: '这道题检验「能不能把一句直觉翻译成可检验的对象」。评分重点在①和②——因子定义的四个条件缺一条就不可检验；前视偏差的三个来源里，「数据可得时点」最容易被漏掉（很多人只想到 shift 价格，没想到 shift 数据本身）。',
  },

  /* ═══════════ l2：IC、ICIR 与分组检验（13 题）═══════════ */
  {
    id: 'quant-xquant-c10-l2-e1', type: 'single', difficulty: 2,
    relatedLessonId: 'quant-xquant-c10-l2', tags: ['K', 'IC'],
    question: 'IC（信息系数）的定义是？',
    options: [
      { value: 'a', text: '逐期计算「因子排名」与「前向收益排名」的 Spearman 秩相关，再取均值' },
      { value: 'b', text: '因子值与收益率的 Pearson 相关系数' },
      { value: 'c', text: '策略的夏普比率除以换手率' },
      { value: 'd', text: '因子值的标准差除以均值' },
    ],
    answer: 'a',
    explanation: '三个要点：① 用秩不用原始值（抗极端值）；② 用前向收益（shift(-h)，防穿越）；③ 逐期算再取均值（不是把所有期拼起来算一次）。b 是 Pearson，会被极端值主导；c/d 与因子预测力无关。',
  },
  {
    id: 'quant-xquant-c10-l2-e2', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c10-l2', tags: ['U', '统计口径'],
    question: '本节的动量因子 IC = −0.0252、IC 标准差 = 0.2187、期数 T = 1259、前向窗口 h = 20。它的 t 值应该是多少？',
    options: [
      { value: 'a', text: '约 −0.91（用有效样本 T/h ≈ 63 修正后）；朴素算法 −4.09 会严重高估' },
      { value: 'b', text: '约 −4.09（直接用 T = 1259）' },
      { value: 'c', text: '约 −0.0252（就是 IC 本身）' },
      { value: 'd', text: '无法计算，因为没有原始数据' },
    ],
    answer: 'a',
    explanation: '朴素 t = ICIR × √T = −0.1152 × √1259 = −4.09，但 20 日前向收益的窗口重叠（相邻两期有 19 天重合），有效独立样本只有约 T/h ≈ 63，修正后 t = −0.1152 × √63 = −0.91。同一个因子，一个「高度显著」一个「不显著」——口径决定结论。',
  },
  {
    id: 'quant-xquant-c10-l2-e3', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c10-l2', tags: ['U', 'IC'],
    question: '一个因子的整体 IC 为负（如 −0.0252），说明它完全没有价值，应该直接放弃。',
    answer: false,
    explanation: '本节实测：整体 IC −0.0252，但分组后低波动组 +0.0259、高波动组 −0.0455，Spread +0.0715 且跨三个前向窗口稳定。这个结构最终被翻译成「高波动期仓位 × 0.7」，带来了 19.4% 的回撤改善。「整体没用」和「没有价值」是两回事。',
  },
  {
    id: 'quant-xquant-c10-l2-e4', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c10-l2', tags: ['U', '统计口径'],
    question: '只要 t 值大于 2，就说明因子在统计上显著有效。',
    answer: false,
    explanation: '两个问题：① 前向窗口重叠时必须用有效样本 T/h，本节朴素 t = −4.09 修正后只有 −0.91；② Harvey-Liu-Zhu (2016) 指出在多重检验下（同时测很多因子），t > 2 远远不够，门槛应提到 3 左右。另外「统计显著」也不等于「经济有效」——IC 绝对值 0.025 仍低于可用阈值。',
  },
  {
    id: 'quant-xquant-c10-l2-e5', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c10-l2', tags: ['U', '实现'],
    question: '实现逐期 IC 时，下面哪些做法是**必须**的？',
    options: [
      { value: 'a', text: '前向收益用 pct_change(h).shift(-h) 构造' },
      { value: 'b', text: '先把因子与收益按行取秩，再算相关（而不是直接算 Pearson）' },
      { value: 'c', text: '某期有效标的太少（如少于 5 个）时，这一期应当丢弃' },
      { value: 'd', text: '把所有期拼成一个大表，一次性算一个相关系数' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 是错的：拼起来算会混掉时间信息，得到的是「因子值与收益的总体相关」，不是「每期排序的预测力」。a 防穿越、b 抗极端值、c 防小样本噪声，三条都是硬要求。',
  },
  {
    id: 'quant-xquant-c10-l2-e6', type: 'multiple', difficulty: 4,
    relatedLessonId: 'quant-xquant-c10-l2', tags: ['U', '截面宽度'],
    question: '本节实测 IC 标准差在 0.20-0.22 之间，而理论值 1/√(N−1)（N=25）约 0.204。这个对照说明什么？',
    options: [
      { value: 'a', text: 'IC 的波动主要来自「截面只有 25 个标的」，不是来自因子本身' },
      { value: 'b', text: '扩大标的池（提高 N）能显著降低 IC 的标准差、提高信噪比' },
      { value: 'c', text: '拉长样本期数 T 能降低 IC 均值的标准误，但不会改变单期 IC 的波动' },
      { value: 'd', text: 'IC 标准差应该等于 0，否则因子就是无效的' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 完全错——IC 标准差不可能为 0。a/b/c 共同构成「截面宽度优先」的完整论证：单期 IC 的波动由 N 决定（1/√(N−1)），而均值的精度由 T 决定（σ/√T）。所以「扩池」和「拉长样本」解决的是两个不同的问题，扩池通常更划算（Grinold-Kahn 的 Breadth）。',
  },
  {
    id: 'quant-xquant-c10-l2-e7', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c10-l2', tags: ['K', '分组IC'],
    question: '本节 20 日动量（20 日前向）实测：整体 IC ______，低波动组 IC ______，高波动组 IC ______，Spread（低−高）______。同一个因子在两半样本里符号相反。',
    blanks: [['-0.0252', '−0.0252', '-0.025'], ['0.0259', '+0.0259', '0.026'],
             ['-0.0455', '−0.0455', '-0.046'], ['0.0715', '+0.0715', '0.072']],
    explanation: '整体 −0.0252、低波组 +0.0259、高波组 −0.0455、Spread +0.0715。这张表是本章最重要的产出：它把「一个没用的因子」变成了「一个在特定条件下反向有效的因子」，并直接导出了下一节的风控规则。',
  },
  {
    id: 'quant-xquant-c10-l2-e8', type: 'code', difficulty: 3,
    relatedLessonId: 'quant-xquant-c10-l2', tags: ['D', 'IC'],
    setupCode: POOL_SETUP,
    lang: 'python',
    question: '已给出 `rank_ic(F, R)`（逐期 Spearman）与 25 只标的池。请实现 `ic_report(factor, fwd)`，返回 `(ic_mean, ic_std, icir, pos_ratio)` 四元组（`pos_ratio` 是 IC > 0 的占比，用百分数）。然后用它验证 20 日动量在 20 日前向窗口上的结果。',
    starterCode: `
def ic_report(factor, fwd):
    pass

print(["%.4f" % v for v in ic_report(MOM, 20)])`,
    expectedOutput: "['-0.0252', '0.2187', '-0.1152', '45.8']",
    tests: `
m, s, ir, pos = ic_report(MOM, 20)
assert abs(m - (-0.0252)) < 0.0005, f"IC 均值应约 -0.0252，实际 {m}"
assert abs(s - 0.2187) < 0.001, f"IC 标准差应约 0.2187，实际 {s}"
assert abs(ir - (-0.1152)) < 0.001, f"ICIR 应约 -0.1152，实际 {ir}"
assert abs(pos - 45.8) < 0.2, f"IC>0 占比应约 45.8%，实际 {pos}"

# 前向窗口越长，IC 绝对值越小（本节实测 -0.0332 / -0.0252 / -0.0131）
a = abs(ic_report(MOM, 10)[0]); b = abs(ic_report(MOM, 20)[0]); c = abs(ic_report(MOM, 40)[0])
assert a > b > c, f"IC 应随前向窗口拉长而衰减，实际 {a:.4f} {b:.4f} {c:.4f}"

# 短期反转比动量更强（本节实测 0.0374 vs -0.0252）
assert abs(ic_report(REV, 20)[0]) > abs(ic_report(MOM, 20)[0]), "反转因子应强于动量因子"`,
    answer: `
def ic_report(factor, fwd):
    R = U.pct_change(fwd).shift(-fwd)
    ic = rank_ic(factor, R)
    return (ic.mean(), ic.std(), ic.mean() / ic.std(), (ic > 0).mean() * 100)`,
    explanation: '四个数各有用途：均值答「有多准」、标准差答「有多飘」、ICIR 答「准得稳不稳」、IC>0 占比答「是不是接近抛硬币」。注意前向收益必须在函数内部用 `shift(-fwd)` 构造——如果把它作为参数传进来，很容易在某处漏掉 shift。',
  },
  {
    id: 'quant-xquant-c10-l2-e9', type: 'code', difficulty: 4,
    relatedLessonId: 'quant-xquant-c10-l2', tags: ['D', '分组IC'],
    setupCode: POOL_SETUP,
    lang: 'python',
    question: '实现 `grouped_ic(factor, fwd)`：按每只标的**自身的年化波动率**（`uv`）中位数切成低/高两组，分别算 20 日前向 IC，返回 `(整体, 低波组, 高波组, spread)` 四个数（spread = 低 − 高）。',
    starterCode: `
def grouped_ic(factor, fwd):
    pass

print(["%.4f" % v for v in grouped_ic(MOM, 20)])`,
    expectedOutput: "['-0.0252', '0.0259', '-0.0455', '0.0715']",
    tests: `
a, l, h, sp = grouped_ic(MOM, 20)
assert abs(a - (-0.0252)) < 0.0005, f"整体 IC 应约 -0.0252，实际 {a}"
assert abs(l - 0.0259) < 0.0005, f"低波组 IC 应约 +0.0259，实际 {l}"
assert abs(h - (-0.0455)) < 0.0005, f"高波组 IC 应约 -0.0455，实际 {h}"
assert abs(sp - 0.0715) < 0.0005, f"Spread 应约 +0.0715，实际 {sp}"
assert l > 0 > h, "低波组应为正、高波组应为负（符号相反是本节的发现）"
assert abs(sp - (l - h)) < 1e-12, "Spread 必须等于低减高"

# 分组后两组的样本数应接近各半
med = uv.median()
assert abs((uv <= med).sum() - (uv > med).sum()) <= 1, "按中位数切分，两组数量应相差不超过 1"`,
    answer: `
def grouped_ic(factor, fwd):
    R = U.pct_change(fwd).shift(-fwd)
    med = uv.median()
    lo = list(uv.index[uv <= med])
    hi = list(uv.index[uv > med])
    a = rank_ic(factor, R).mean()
    l = rank_ic(factor[lo], R[lo]).mean()
    h = rank_ic(factor[hi], R[hi]).mean()
    return (a, l, h, l - h)`,
    explanation: '两个实现要点：① 分组依据是「标的自身的波动率」——它是标的属性（用全期数据算是合理的），不是择时信号；一旦拿它做「每期该买哪组」的信号，就必须改成滚动窗口，否则是前视。② `rank_ic(factor[lo], R[lo])` 里列的筛选要同时作用于因子和收益，漏一边会导致列不匹配。',
  },
  {
    id: 'quant-xquant-c10-l2-e10', type: 'code', difficulty: 4,
    relatedLessonId: 'quant-xquant-c10-l2', tags: ['D', '统计口径'],
    setupCode: POOL_SETUP,
    lang: 'python',
    question: '实现 `t_stats(factor, fwd)`：返回 `(naive_t, adj_t)`。`naive_t = ICIR × √T`，`adj_t = ICIR × √(T/h)`，其中 T 是 IC 序列长度、h 是前向窗口（重叠修正）。用 20 日动量、20 日前向验证。',
    starterCode: `
def t_stats(factor, fwd):
    pass

print(["%.2f" % v for v in t_stats(MOM, 20)])`,
    expectedOutput: "['-4.09', '-0.91']",
    tests: `
nt, at = t_stats(MOM, 20)
assert abs(nt - (-4.09)) < 0.02, f"朴素 t 应约 -4.09，实际 {nt}"
assert abs(at - (-0.91)) < 0.02, f"修正 t 应约 -0.91，实际 {at}"
assert abs(nt) > 2 > abs(at), "朴素 t 应显著、修正 t 应不显著（本节核心对照）"
assert abs(nt / at - np.sqrt(20)) < 0.01, "两者比值应约等于 sqrt(h)"

# h 越小，修正的力度越小（h=5 时两者差距应远小于 h=20）
n5, a5 = t_stats(MOM, 5)
n20, a20 = t_stats(MOM, 20)
assert abs(n5 / a5) < abs(n20 / a20), "前向窗口越小，重叠越少，修正幅度应越小"`,
    answer: `
def t_stats(factor, fwd):
    R = U.pct_change(fwd).shift(-fwd)
    ic = rank_ic(factor, R)
    T = len(ic)
    icir = ic.mean() / ic.std()
    return (icir * np.sqrt(T), icir * np.sqrt(T / fwd))`,
    explanation: '这是本课程最重要的统计口径坑：`naive_t` 假设每期 IC 相互独立，但 h 日前向收益让相邻 h 期高度重叠，有效独立样本只有 T/h。修正后 |t| 从 4.09 掉到 0.91，结论从「高度显著」变成「不显著」。严格的版本要用 Newey-West 调整，这里只做最粗略的 T/h 版本。',
  },
  {
    id: 'quant-xquant-c10-l2-e11', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c10-l2', tags: ['D', '汇报'],
    question: '你要向团队汇报「动量因子值不值得做」。已知：整体 IC = −0.0252、ICIR = −0.1152、三个前向窗口 IC 都是负的、重叠修正后 t = −0.91、低波动组 IC +0.0259、高波动组 IC −0.0455、Spread +0.0715。\n\n请写一份三段式备忘录（结论 / 证据 / 但是），并说明如果领导只问「那到底做不做」，你怎么答。',
    referenceAnswer: `
① 结论（一句话）：
**动量因子整体预测力低于可用阈值，不建议单独用来选股。**

② 证据（必须带数字）：
- **量级不够**：IC 均值 −0.0252，绝对值低于 0.03 的「有参考价值」线；ICIR −0.1152，绝对值远低于 0.2。
- **方向一致**：三个前向窗口（10 / 20 / 40 日）的 IC 都是负的（−0.0332 / −0.0252 / −0.0131），符号不随窗口翻转——说明它确实有方向，只是方向与教科书相反。
- **统计不显著**：朴素 t = −4.09 看起来显著，但 20 日前向窗口重叠，有效样本约 1259/20 ≈ 63，修正后 t = −0.91，不显著。
- **IC 的波动是结构性的**：IC 标准差 0.2187 ≈ 理论值 1/√(N−1) = 0.204（N=25）。信噪比约 1:9，单期 IC 完全不可用。

③ 但是（这一节决定了「做不做」）：
- **弱点清晰且稳定**：低波动组 IC +0.0259（正的）、高波动组 IC −0.0455（负的），**同一个因子在两半样本里符号相反**。
- **Spread 跨窗口稳定**：+0.0769（fwd10）/ +0.0715（fwd20）/ +0.0727（fwd40），几乎不随窗口变化。这种稳定性本身是「结构而非噪声」的证据。
- **可翻译成规则**：既然它在高波动时失效，就「在高波动时少用它」——这条规则已在下一节验证：回撤从 −24.65% 收窄到 −19.88%（改善 19.4%），代价是少赚 10.49pp。

④ 如果只问「做不做」，这样答：
**不做「用动量选股」的因子，但做「用动量失效条件做风控」的开关。**
理由：作为选股信号，它的 IC 和 t 值都不合格（第 3 关不通过）；作为风控条件，它的 Spread 稳定、可翻译、可回测（第 4、5 关通过）。
一句话版本：「这个因子不能告诉你买什么，但能告诉你什么时候该少买。」

⑤ 附带说明（体现研究纪律）：
- 以上全部基于 25 只合成标的、5 年数据、不含成本；
- 换池子、换市场、换区间，符号都可能翻转（l1 的 GDP 总量 vs 增速就是活例子）；
- 下一步该做的是：测短期反转（IC +0.0374，比动量强）、做十分组单调性检验。`,
    rubric: [
      { point: '① 结论明确且带条件（「不建议单独选股」而不是「没用」）', score: 2 },
      { point: '② 证据含 IC 量级、三窗口符号一致、修正后 t 值三个要点', score: 4 },
      { point: '② 说明 IC 标准差 ≈ 1/√(N−1)，指出波动来自截面宽度', score: 2 },
      { point: '③ 用分组 IC 与 Spread 的稳定性论证「有结构」', score: 3 },
      { point: '③ 给出可执行的方向（做风控开关），并引用 19.4% 的回撤改善', score: 3 },
      { point: '⑤ 主动声明样本边界（合成数据、不含成本、不可推广）', score: 2 },
    ],
    keywords: ['IC', 'ICIR', '修正t值', '分组IC', 'Spread', '风控开关', '样本边界'],
    explanation: '这道题训练「把统计结果翻译成决策」。评分重点在②和③——能不能同时说清「它不够格当信号」和「它的弱点值得用」，这是从「会算指标」到「会做判断」的分界。只写「IC 太低所以放弃」的答案不合格，因为它扔掉了 Spread 这个稳定结构。',
  },
  {
    id: 'quant-xquant-c10-l2-e12', type: 'open', difficulty: 5,
    relatedLessonId: 'quant-xquant-c10-l2', tags: ['D', '研究设计'],
    question: '本节按「标的自身波动率」分组，得到 Spread = +0.0715。请回答：\n① 这个分组为什么可能产生误导？至少指出两个具体的混杂因素；\n② 如果改用「按因子值分位分组」（十分组），能得到什么本节没得到的信息？\n③ 你会怎么设计一组实验，来确认「高波动组失效」不是混杂造成的？',
    referenceAnswer: `
① 分组可能误导的两个（或更多）混杂因素：
1. **行业/资产类别混杂**：高波动组可能恰好等于「某个资产类别」（如小盘股、单一行业、商品）。那么「高波动组失效」的真实原因可能是「这个行业不适用动量」，而不是「高波动不适用」。本节用的是合成池，没有行业标签，所以无法排除。
2. **市值/流动性混杂**：小市值标的天然波动更高，也天然更容易被操纵、动量更容易反转。分组结果可能反映的是「小市值」，不是「高波动」。
3. **幸存者偏差**：如果池子是「现在还在的标的」，高波动组里的退市/暴雷样本已经被剔除，剩下的高波动样本其实是被筛选过的。
4. **波动率估计误差**：本节用全期数据算 uv 分组，如果某些标的的波动率在样本中途发生结构变化（如从低波变高波），分组标签就不准确。

② 按因子值十分组能得到的额外信息：
- **单调性**：本节只分了「高波/低波」两组的 IC，回答不了「IC 是否随因子值单调变化」。十分组能画出「第 1 组到第 10 组的平均前向收益」曲线——如果单调递减，说明因子有方向性；如果只在两端有效、中间乱跳，说明可能是极端值驱动。
- **非线性**：两分组只能看到「平均差」，十分组能看到形状（是否 U 型、是否只在第 1 组有效）。
- **多空组合**：十分组可以构造「做多第 1 组、做空第 10 组」的多空组合，直接看它的夏普与回撤——这是本节完全没有的。
- **极端值诊断**：如果只有第 1 组和第 10 组有效、中间 8 组没差别，说明因子的信息集中在尾部，可能对极端值敏感（需要去极值处理）。

③ 确认「高波动组失效」不是混杂的实验设计：
1. **中性化**：把因子对「波动率」做横截面回归，取残差作为新因子（波动率中性化），重算分组 IC。如果残差因子的分组差异消失，说明原效应确实来自波动率；如果还在，说明有独立成分。
2. **双重排序（2×2）**：同时按「波动率」和「行业/市值」分组，得到 4 个格子，比较「同为低波动、不同行业」的差异。这能把两个维度分开。
3. **控制变量回归**：用前向收益对「因子值 + 波动率 + 市值」做横截面回归，看因子值的系数是否显著（Fama-MacBeth 回归）。这是学术上的标准做法。
4. **滚动分组**：把「按全期波动率分组」改成「每期按滚动 60 日波动率分组」，看 Spread 是否还在。如果不在，说明原结果是「静态标签」的产物。
5. **样本外**：把 5 年切成前 2.5 年/后 2.5 年，各自分组算 Spread。如果两段都是 +0.07 左右，稳健性大大提高。
6. **换池子**：用另一组标的（不同波动谱、不同相关性）重做。如果 Spread 仍稳定，说明不是这 25 只的巧合。

以上六条里，**中性化**和**双重排序**是必做的两条——它们直接回答「是不是混杂」。`,
    rubric: [
      { point: '① 至少指出两个具体的混杂因素（行业 / 市值 / 幸存者 / 波动率估计误差）', score: 3 },
      { point: '② 说清十分组能提供「单调性」这一本节缺失的信息', score: 3 },
      { point: '② 提到多空组合或非线性形状', score: 2 },
      { point: '③ 提出中性化（对波动率回归取残差）这一核心做法', score: 3 },
      { point: '③ 再提出双重排序 / 控制变量回归 / 滚动分组 / 样本外中的至少两项', score: 2 },
    ],
    keywords: ['混杂', '行业', '市值', '中性化', '双重排序', '十分组', '单调性', '样本外'],
    explanation: '这道题把「分组 IC」从一个操作升级成一项研究设计。评分重点在①和③——能不能意识到「分组得到的差异可能是别的东西造成的」，以及能不能提出「中性化」这个标准解法。只会说「再分一次组」的答案不合格。',
  },
  {
    id: 'quant-xquant-c10-l2-e13', type: 'judge', difficulty: 4,
    relatedLessonId: 'quant-xquant-c10-l2', tags: ['U', '分组IC'],
    question: '「按标的自身波动率分组」与「按因子值分位分组」是同一件事，都只是把样本切成两半。',
    answer: false,
    explanation: '两者回答的问题完全不同：**按标的波动率分组**回答「因子在哪类资产上更有效」（定位弱点，本节用法）；**按因子值分位分组**回答「因子的排序是否单调地对应收益」（检验方向与单调性）。前者是「资产属性」维度，后者是「因子值」维度。前者样本被固定切分（每只标的永远在同一组），后者每期都在重新分组（同一只标的可能这期在第 1 组、下期在第 10 组）。',
  },

  /* ═══════════ l3：从因子到策略（13 题）═══════════ */
  {
    id: 'quant-xquant-c10-l3-e1', type: 'single', difficulty: 2,
    relatedLessonId: 'quant-xquant-c10-l3', tags: ['K', '规则翻译'],
    question: '把「因子在高波动标的上失效」翻译成策略规则，正确的三步是？',
    options: [
      { value: 'a', text: '定位（高波组 IC −0.0455）→ 抽象（把「标的的波动」升级为「池子的波动状态」）→ 落地（滚动中位数判定 + 减仓动作）' },
      { value: 'b', text: '直接清仓 → 观察结果 → 调参数' },
      { value: 'c', text: '先跑回测 → 挑最好的参数 → 再解释原因' },
      { value: 'd', text: '把因子值乘以 −1，反向使用' },
    ],
    answer: 'a',
    explanation: '第 2 步「抽象」是难点：上一节的分组是「按标的」分的（哪只波动高），策略需要的是「按时点」的判定（现在该不该减仓）。两者不是一回事——「高波动标的」是横截面属性，「高波动时期」是时间序列状态。这一步的建模选择必须写进 spec。',
  },
  {
    id: 'quant-xquant-c10-l3-e2', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c10-l3', tags: ['U', '交换'],
    question: '本节改进版：回撤从 −24.65% 收窄到 −19.88%（改善 19.4%），但收益从 +61.27% 降到 +50.77%（少赚 10.49pp）。正确的表述是？',
    options: [
      { value: 'a', text: '这是一次「用收益换风险」的交换，不是免费的改进；评价要看夏普（0.78→0.83）和平均仓位（98%→85%）' },
      { value: 'b', text: '回撤改善 19.4%，所以改进版更好，应该上线' },
      { value: 'c', text: '收益下降了，所以改进版是失败的' },
      { value: 'd', text: '两者无法比较，因为指标不同' },
    ],
    answer: 'a',
    explanation: 'b 和 c 都只看了半边。只报回撤改善是选择性披露；只报收益下降是否定风控。正确做法是同时报出：回撤改善、波动下降、收益少赚、夏普变化、**平均仓位**——最后这个数字证明了「回撤改善是花钱买来的」（少掉的 13% 仓位就是现金）。',
  },
  {
    id: 'quant-xquant-c10-l3-e3', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c10-l3', tags: ['U', '敏感性'],
    question: '本节的高波动期仓位乘数越小越好，因为 0.40 时回撤最小（−14.89%）。',
    answer: false,
    explanation: '乘数 0.40 时回撤确实最小，但收益只有 +40.51%（比基准少 20.76pp），平均仓位 71%。这是「风险—收益交换曲线」上的另一个点，不是更优点。选哪个点取决于风险预算（例如「最大回撤不超过 20%」），不取决于「回撤最小」。',
  },
  {
    id: 'quant-xquant-c10-l3-e4', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c10-l3', tags: ['U', '前视'],
    question: '判断「高波动期」时，用整段数据的波动率中位数作为基准是合理的，因为这样更稳定。',
    answer: false,
    explanation: '这是典型的前视偏差：全期中位数包含了「未来才知道」的信息。回测时你在 2021 年不可能知道 2021-2025 的中位数。必须用滚动窗口（本节用过去 252 个交易日），且窗口长度要写进 spec，否则别人无法复现。',
  },
  {
    id: 'quant-xquant-c10-l3-e5', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c10-l3', tags: ['U', 'spec'],
    question: '本节的规则 spec 必须写清哪三个要素？',
    options: [
      { value: 'a', text: '判定信号：池子 20 日平均波动率（25 只标的 VOL20 的行均值）' },
      { value: 'b', text: '判定基准：过去 252 个交易日的中位数（滚动，只用历史）' },
      { value: 'c', text: '动作：高波动期目标权重整体 × 0.7，剩余为现金（收益 0）' },
      { value: 'd', text: '执行人的姓名与账户' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: '三个要素缺一条规则就不可实现：信号不清（「看市场波动」）、基准不清（用全期还是滚动？）、动作不清（减到多少？现金算不算收益？）。d 与规则逻辑无关。第三点里「现金算不算收益」是本节实测踩过的坑——如果减仓后把权重重新归一化到 1，现金就消失了，规则完全失效。',
  },
  {
    id: 'quant-xquant-c10-l3-e6', type: 'multiple', difficulty: 4,
    relatedLessonId: 'quant-xquant-c10-l3', tags: ['U', '稳健性'],
    question: '本节在 top3/5/8 × 10/21/63 日共 6 个变体上重跑了基准与改进。结果是「改进版回撤全部更浅（改善 14%-21%）」。这个结果说明什么？',
    options: [
      { value: 'a', text: '「减仓改善回撤」这个方向是稳健的，不是某个特定参数下的巧合' },
      { value: 'b', text: '「稳健」的正确含义是「换参数后结论不变」，而不是「同一参数下结果很好」' },
      { value: 'c', text: '63 日再平衡的基准收益只有 +13.31%，说明动量因子有效期短，信号会过期' },
      { value: 'd', text: '既然所有变体都成立，说明这个结论可以推广到任何市场' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 是过度推广：稳健性检验只能证明「在这段数据、这些变体下结论一致」，不能证明「换市场也成立」。a/b/c 合起来是「稳健性」的完整定义——注意 b 是本课程反复强调的判据：稳健 ≠ 结果好，稳健 = 结论不随参数变化。',
  },
  {
    id: 'quant-xquant-c10-l3-e7', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c10-l3', tags: ['K', '策略'],
    question: '本节实测：基准累计 ______、回撤 ______、夏普 0.78；改进版累计 ______、回撤 ______、夏普 0.83。回撤改善 ______。',
    blanks: [['61.27', '+61.27'], ['-24.65', '−24.65'], ['50.77', '+50.77'],
             ['-19.88', '−19.88'], ['19.4', '19.4%']],
    explanation: '基准 +61.27% / −24.65%；改进 +50.77% / −19.88%；回撤改善 19.4%。注意：这三组数字必须一起出现——只报回撤改善而不报收益下降，是选择性披露。',
  },
  {
    id: 'quant-xquant-c10-l3-e8', type: 'code', difficulty: 3,
    relatedLessonId: 'quant-xquant-c10-l3', tags: ['D', '回测'],
    setupCode: BT_SETUP,
    lang: 'python',
    question: '实现 `backtest(freq=21, topn=5, mult=1.0)`：每 `freq` 日按 20 日动量排名取前 `topn` 只（只买动量 > 0 的）等权；若当期池子平均波动 > 过去 252 日中位数，目标权重整体 × `mult`，剩余为现金（收益 0）。返回 `(日收益 Series, 换手, 平均仓位)`。\n\n关键：减仓后**不能**把权重重新归一化到 1，否则现金消失、规则失效。',
    starterCode: `
def backtest(freq=21, topn=5, mult=1.0):
    pass

s, t, e = backtest()
m = metrics(s)
print(round(m["tot"], 2), round(m["mdd"], 2), round(t, 1), round(e * 100, 0))`,
    expectedOutput: '61.27 -24.65 96.2 98.0',
    tests: `
s0, t0, e0 = backtest()
m0 = metrics(s0)
assert abs(m0["tot"] - 61.27) < 0.05, f"基准累计应约 61.27%，实际 {m0['tot']}"
assert abs(m0["mdd"] - (-24.65)) < 0.05, f"基准回撤应约 -24.65%，实际 {m0['mdd']}"
assert abs(e0 * 100 - 98) < 0.5, f"基准平均仓位应约 98%，实际 {e0*100}"

s1, t1, e1 = backtest(mult=0.7)
m1 = metrics(s1)
assert abs(m1["tot"] - 50.77) < 0.05, f"改进累计应约 50.77%，实际 {m1['tot']}"
assert abs(m1["mdd"] - (-19.88)) < 0.05, f"改进回撤应约 -19.88%，实际 {m1['mdd']}"
assert abs(e1 * 100 - 85) < 0.5, f"改进平均仓位应约 85%（现金必须真实存在），实际 {e1*100}"

# 关键断言：mult=1.0 必须精确等于基准（证明实现里没有别的东西）
s2, t2, e2 = backtest(mult=1.0)
assert abs(metrics(s2)["tot"] - m0["tot"]) < 1e-9, "mult=1.0 应与基准逐位相同"

# 改进版：回撤更浅、收益更少、换手更低
assert m1["mdd"] > m0["mdd"], "改进版回撤应更浅"
assert m1["tot"] < m0["tot"], "改进版收益应更低（这是交换的代价）"
assert t1 < t0, "改进版换手应更低"`,
    answer: `
def backtest(freq=21, topn=5, mult=1.0):
    pool_vol = VOL20.mean(axis=1)                                  # 池子平均波动（当日可知）
    high_vol = (pool_vol > pool_vol.rolling(252).median()).values   # 只用过去 252 天
    URv = UR.values; Mv = MOM.values; na = U.shape[1]; dates = UR.index
    w = np.zeros(na)
    res = np.empty(len(dates)); turn = 0.0; expo = np.empty(len(dates))
    for i in range(len(dates)):
        if i % freq == 0 and i > 0:
            row = Mv[i]
            if np.sum(~np.isnan(row)) >= topn:
                pos = np.where((~np.isnan(row)) & (row > 0))[0]
                nw = np.zeros(na)
                if len(pos):
                    pick = pos[np.argsort(-row[pos])[:topn]]
                    nw[pick] = (1.0 / len(pick)) * (mult if high_vol[i] else 1.0)
                turn += float(np.abs(nw - w).sum()); w = nw
        rv = URv[i]
        res[i] = float((w * rv).sum()); expo[i] = w.sum()
        grown = w * (1 + rv)
        te = grown.sum() + (1.0 - w.sum())      # 现金按 0 收益计入总权益
        if te > 0:
            w = grown / te
    return pd.Series(res, index=dates), turn, float(expo.mean())`,
    explanation: '两处关键实现：① `te = grown.sum() + (1.0 - w.sum())` —— 把现金（零收益）计入总权益，这样归一化后权重自然缩小，仓位才真的减了。若写成 `w = grown / grown.sum()`，权重会被拉回 1，现金消失、规则失效（平均仓位会显示 98% 而不是 85%，这是最快的体检指标）。② `high_vol` 用 `rolling(252).median()` 而不是全期中位数——后者是前视偏差。',
  },
  {
    id: 'quant-xquant-c10-l3-e9', type: 'code', difficulty: 4,
    relatedLessonId: 'quant-xquant-c10-l3', tags: ['D', '敏感性'],
    setupCode: BT_SETUP,
    lang: 'python',
    question: '环境里已提供 `backtest(freq, topn, mult)`（返回日收益、换手、平均仓位）。实现 `mult_curve(mults)`：对每个乘数跑一遍，返回 DataFrame（索引为乘数，列含 `tot`、`vol`、`mdd`、`sharpe`、`expo`）。然后判断这条曲线是「单调交换曲线」还是「锯齿」。',
    starterCode: `
def mult_curve(mults):
    pass

df = mult_curve([1.0, 0.85, 0.7, 0.55, 0.4])
print(df[["tot", "mdd"]].round(2).to_string())`,
    expectedOutput: '5 行交换曲线表',
    tests: `
df = mult_curve([1.0, 0.85, 0.7, 0.55, 0.4])
assert len(df) == 5, f"应有 5 行，实际 {len(df)}"
for c in ("tot", "vol", "mdd", "sharpe", "expo"):
    assert c in df.columns, f"缺少列 {c}"
assert list(df.index) == [1.0, 0.85, 0.7, 0.55, 0.4], f"索引应为乘数，实际 {list(df.index)}"
assert abs(df.loc[1.0, "tot"] - 61.27) < 0.05, "乘数 1.0 应约 61.27%"
assert abs(df.loc[0.7, "tot"] - 50.77) < 0.05, "乘数 0.7 应约 50.77%"
assert abs(df.loc[0.4, "tot"] - 40.51) < 0.05, "乘数 0.4 应约 40.51%"

# 单调性：收益与波动随乘数单调递减，回撤单调改善
tots = list(df["tot"]); vols = list(df["vol"]); mdds = list(df["mdd"])
assert all(tots[i] > tots[i+1] for i in range(4)), f"收益应单调下降，实际 {tots}"
assert all(vols[i] > vols[i+1] for i in range(4)), f"波动应单调下降，实际 {vols}"
assert all(mdds[i] < mdds[i+1] for i in range(4)), f"回撤应单调改善，实际 {mdds}"
assert abs(df.loc[1.0, "expo"] * 100 - 98) < 0.5 and abs(df.loc[0.4, "expo"] * 100 - 71) < 0.5`,
    answer: `
def mult_curve(mults):
    rows = {}
    for k in mults:
        s, t, e = backtest(mult=k)
        m = metrics(s)
        rows[k] = {"tot": m["tot"], "vol": m["vol"], "mdd": m["mdd"],
                   "sharpe": m["ann"] / m["vol"], "expo": e}
    return pd.DataFrame(rows).T`,
    explanation: '这张表的形状判据比数字本身更重要：收益、波动、回撤**全部单调**，说明这是「风险—收益交换曲线」，不是「参数扫描的锯齿」。锯齿意味着你在挑噪声（第 2 章的教训），单调意味着你在选风险偏好——后者可以按约束选（如「回撤不超过 20%」），前者只能放弃调参。',
  },
  {
    id: 'quant-xquant-c10-l3-e10', type: 'code', difficulty: 5,
    relatedLessonId: 'quant-xquant-c10-l3', tags: ['D', '稳健性'],
    setupCode: BT_SETUP,
    lang: 'python',
    question: '环境里已提供 `backtest(freq, topn, mult)`。实现 `robust_check()`：在 `topn in (3, 5, 8)` × `freq in (10, 21, 63)` 共 9 个变体上，分别跑基准（mult=1.0）与改进（mult=0.7），返回 DataFrame（索引为 `"top{topn}-{freq}d"`，列含 `base_tot`、`base_mdd`、`imp_tot`、`imp_mdd`、`dd_improve`（回撤改善的百分数））。',
    starterCode: `
def robust_check():
    pass

print(robust_check()[["base_mdd", "imp_mdd", "dd_improve"]].round(2).to_string())`,
    expectedOutput: '9 行稳健性表',
    tests: `
df = robust_check()
assert len(df) == 9, f"应有 9 行，实际 {len(df)}"
for c in ("base_tot", "base_mdd", "imp_tot", "imp_mdd", "dd_improve"):
    assert c in df.columns, f"缺少列 {c}"
assert "top5-21d" in df.index, f"索引格式不对: {list(df.index)[:3]}"
assert abs(df.loc["top5-21d", "base_tot"] - 61.27) < 0.05, "top5-21d 基准应约 61.27%"
assert abs(df.loc["top5-21d", "imp_mdd"] - (-19.88)) < 0.05, "top5-21d 改进回撤应约 -19.88%"

# 核心结论：9 个变体里改进版回撤全部更浅
assert (df["imp_mdd"] > df["base_mdd"]).all(), "所有变体的改进版回撤都应更浅"
assert (df["dd_improve"] > 0).all(), "所有变体的回撤改善都应为正"
# 改善幅度在合理区间（本节实测 14%-21% 量级）
assert df["dd_improve"].min() > 5 and df["dd_improve"].max() < 40, f"改善幅度异常: {df['dd_improve'].round(1).tolist()}"
assert abs(df.loc["top5-21d", "dd_improve"] - 19.4) < 0.5, "top5-21d 改善应约 19.4%"`,
    answer: `
def robust_check():
    rows = {}
    for topn in (3, 5, 8):
        for freq in (10, 21, 63):
            s0, _, _ = backtest(freq=freq, topn=topn, mult=1.0)
            s1, _, _ = backtest(freq=freq, topn=topn, mult=0.7)
            m0, m1 = metrics(s0), metrics(s1)
            rows["top%d-%dd" % (topn, freq)] = {
                "base_tot": m0["tot"], "base_mdd": m0["mdd"],
                "imp_tot": m1["tot"], "imp_mdd": m1["mdd"],
                "dd_improve": (m1["mdd"] - m0["mdd"]) / abs(m0["mdd"]) * 100,
            }
    return pd.DataFrame(rows).T`,
    explanation: '这道题把「稳健」从形容词变成数字。判据不是「某个变体结果好」，而是「所有变体结论一致」——9 个变体的回撤改善全为正，才说明「减仓改善回撤」是结构而非巧合。注意 63 日再平衡的基准收益只有 +13.31%（远低于 21 日的 +61.27%），这说明动量因子有效期短、信号会过期，是「IC 衰减」在策略层面的体现。',
  },
  {
    id: 'quant-xquant-c10-l3-e11', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c10-l3', tags: ['D', 'spec'],
    question: '请为「高波动期减仓」这条规则写一份完整的 spec（按第 1 章的四段骨架），并给出至少 5 条可检查的验收标准。要求：每条验收标准都必须能用一个断言或一眼核对判定通过与否。',
    referenceAnswer: `
① 上下文（Context）
- 标的池：25 只合成 ETF（波动谱 8%-24% 年化），由 \`make_pool()\` 固定种子生成；
- 数据区间：2021-01-04 ~ 2025-12-26，日频，1300 个交易日；
- 交易约束：只做多、不加杠杆、不做空；不含成本（成本作为单独敏感性）；
- 基准配置：每 21 日按 20 日动量排名取前 5 只等权。

② 任务描述（Task）
- 计算因子：\`MOM = close.pct_change(20)\`；
- 每 21 个交易日调仓：取 \`MOM > 0\` 中最大的 5 只等权；
- 计算市场状态：\`pool_vol = VOL20.mean(axis=1)\`（25 只标的 20 日波动的行均值）；
- 判定：若 \`pool_vol[t] > pool_vol.rolling(252).median()[t]\`，目标权重整体 × 0.7，其余为现金；
- 产出：日收益 Series、换手总数、平均仓位三个对象。

③ 任务要求（Constraints）
- 判定只能用当日及之前的数据（\`rolling(252)\`，禁止全期中位数）；
- 现金收益为 0，且权重按「含现金的总权益」归一化；
- **禁止**把减仓后的权重重新归一化到 1；
- 只用 pandas / numpy；固定随机种子；不读写外部文件；
- 打印每期仓位（用于体检）。

④ 验收标准（Acceptance）
- **AC1** 基准累计收益 = +61.27%（±0.1pp）；
- **AC2** 改进版累计收益 = +50.77%（±0.1pp）；
- **AC3** 改进版最大回撤 −19.88%，且**浅于**基准的 −24.65%（改善 19.4% ±1pp）；
- **AC4** 改进版平均仓位在 84%-86% 之间（证明现金真实存在；若显示 98% 说明归一化写错了）；
- **AC5** \`mult=1.0\` 时改进版与基准**逐位相同**（差值 < 1e-9）；
- **AC6** 改进版换手（83.7）低于基准（96.2）；
- **AC7** 高波动期占比在 46%-48% 之间；
- **AC8** 乘数扫描 [1.0, 0.85, 0.7, 0.55, 0.4] 的收益、波动、回撤全部单调（无锯齿）。

其中 **AC4 和 AC5 是「防实现错误」的关键**：
- AC4 防「减仓后重新归一化」（现金消失）；
- AC5 防「改进版里混进了别的东西」（参数退化为 1 时应精确回到基准）。

⑤ 补充：失效条件与监控
- 失效条件：若市场波动结构改变（如长期低波动），「高波动期」的判定会很少触发，规则退化为基准；
- 监控指标：高波动期占比（应稳定在 46% 左右）、平均仓位（应稳定在 85% 左右）、回撤改善幅度（应稳定在 15%-25%）。`,
    rubric: [
      { point: '① 上下文含标的池、区间、交易约束、基准配置四项', score: 2 },
      { point: '② 任务描述写清因子、调仓频率、判定信号、判定基准、动作五个要素', score: 4 },
      { point: '③ 明确写出「禁止重新归一化到 1」与「现金收益为 0」', score: 3 },
      { point: '④ 至少 5 条验收标准，且每条可判定（带具体数字或断言）', score: 4 },
      { point: '④ 含「mult=1.0 应精确等于基准」这条退化检验', score: 2 },
      { point: '④ 含「平均仓位 84%-86%」这条防实现错误的检验', score: 2 },
      { point: '⑤ 给出失效条件与对应监控指标', score: 1 },
    ],
    keywords: ['spec', '判定基准', 'rolling', '现金', '归一化', '验收标准', '退化检验'],
    explanation: '这道题把本章的规则和第 1 章的 spec 纪律接起来。评分重点在③和④——能不能预见到「现金归一化」这个实现陷阱，以及能不能写出「mult=1.0 必须精确等于基准」这种**能抓出实现错误**的验收标准。只写「收益/回撤符合预期」的验收是不够的，因为它抓不出归一化写错。',
  },
  {
    id: 'quant-xquant-c10-l3-e12', type: 'open', difficulty: 5,
    relatedLessonId: 'quant-xquant-c10-l3', tags: ['D', '研究设计'],
    question: '有人提出一个更激进的想法：「既然动量在高波动时失效，那就**在高波动期反向做**（做空原来的赢家）。」请回答：\n① 这个想法在逻辑上有什么问题？用本节的数字说明；\n② 设计一个实验来检验它（至少 5 步）；\n③ 预测实验结果，并说明如果结果与预测相反，你会怎么解释。',
    referenceAnswer: `
① 逻辑问题（用本节数字）：
- **幅度不对称**：高波动组 IC = −0.0455，但这是**秩相关**，不是收益幅度。IC 为负 0.0455 意味着「排序略有反向」，不意味着「反向组合能赚钱」。要赚钱，反向组合的平均收益必须显著为正，而这需要看**分组的收益差**（本节没算，只算了 IC）。
- **成本会吃光**：反向做需要卖空，本节策略换手已经是 96.2；加上多空双向、以及高波动期的滑点放大，成本很可能超过那点微弱信号（IC 绝对值 0.0455 对应的信息量极小）。
- **样本太少**：高波动期只占 46.7%，而「高波动 × 动量反向」的有效样本更少。IC = −0.0455 的 t 值大概率不显著（参考本节 l2 的修正 t = −0.91 量级）。
- **逻辑跳跃**：「因子在 A 条件下失效」不等于「在 A 条件下反向有效」。失效可能是「变成噪声」（IC → 0），而不是「变成反向信号」（IC < 0 且幅度够）。本节的 −0.0455 落在「噪声偏负」的区间里，离「可用反向信号」很远。
- **生存偏差风险**：做空高波动赢家，遇到「动量继续」的行情会亏得很快（动量崩塌的镜像）。这是典型的「尾部风险换小概率收益」。

② 实验设计（≥5 步）：
1. **先算收益差，不只看 IC**：把高波动期按动量分 5 组，算第 1 组（赢家）与第 5 组（输家）的**平均前向收益**。只有当「赢家 − 输家」显著为负时，反向才可能赚钱。
2. **构造多空组合**：高波动期做空第 1 组、做多第 5 组，等权、21 日调仓；低波动期保持原策略（或不持仓）。
3. **加成本**：单边 10bp / 20bp / 50bp 三档，双向计费，并给做空加额外的融券成本（年化 2%-8%）。
4. **统计检验**：算多空组合的 IC 序列，用重叠修正后的 t 值判断显著性（不能只看朴素 t）。
5. **分段检验**：把 5 年切成前/后两半，各自跑一次。如果只有一段有效，说明是特定行情。
6. **极端情形压力测试**：找出历史上「动量继续」的时段（高波动 + 动量延续），看多空组合的最大回撤——这是做空动量最危险的情形。

③ 预测与反解释：
- **预测**：加成本后多空组合的收益会大幅缩水，甚至转负。理由：IC 绝对值只有 0.0455，信息量极小；而做空的成本（融券 + 滑点）远高于做多。**大概率结论是「不加成本时略正、加成本后为负」。**
- **如果结果与预测相反（即加成本后仍显著为正）**，我会按以下顺序排查：
  1. **先查前视**：做空组合的构造有没有用到「事后才知道的波动分组」？分组是否用了全期波动率？
  2. **查成本口径**：融券成本算了吗？滑点在高波动期是否放大了？做空的借券可得性假设合理吗？
  3. **查样本**：收益是否集中在某一小段（如 2022 年某几个月）？如果是，那不是策略，是一次事件。
  4. **查容量**：多空组合在真实规模下能不能成交？高波动期往往流动性差。
  5. **最后才考虑「可能是真的」**：即使排除了以上所有，也要先做样本外（换池子、换市场）验证，再小仓位试运行。
- **这个排查顺序本身就是一条纪律**：结果超出预期时，先怀疑实现，再怀疑样本，最后才接受「发现」。`,
    rubric: [
      { point: '① 指出「IC 为负 ≠ 反向能赚钱」（IC 是秩相关，不是收益幅度）', score: 3 },
      { point: '① 指出成本（融券 + 双向 + 高波动滑点）会吃光微弱信号', score: 2 },
      { point: '① 指出「失效」可能只是变成噪声，而不是变成可用反向信号', score: 2 },
      { point: '② 至少 5 步，含「先算收益差」「加成本」「重叠修正 t 值」「分段检验」', score: 4 },
      { point: '③ 预测「加成本后转负」，并给出理由', score: 2 },
      { point: '③ 给出「先查实现、再查样本、最后接受」的排查顺序', score: 3 },
    ],
    keywords: ['秩相关', '收益差', '做空成本', '融券', '修正t值', '分段', '前视排查'],
    explanation: '这道题训练「抵抗漂亮想法的诱惑」。核心认知是①——**IC 是秩相关，不是收益幅度**，这是最常被混淆的一点。IC = −0.0455 听起来「有信号」，但换算成收益可能只有几个 bp，扣掉成本就是负的。评分重点在③的排查顺序：结果超出预期时，先怀疑自己，这是研究纪律的核心。',
  },
  {
    id: 'quant-xquant-c10-l3-e13', type: 'judge', difficulty: 4,
    relatedLessonId: 'quant-xquant-c10-l3', tags: ['U', '实现'],
    question: '减仓后把剩余权重重新归一化到 1（即把现金也买成标的），对回测结果没有影响，因为权重总和本来就该是 1。',
    answer: false,
    explanation: '这是本节实测踩过的坑：如果减仓后归一化，现金就消失了，仓位从来没减过，规则完全失效。正确做法是「按含现金的总权益归一化」（\`te = grown.sum() + (1 - w.sum())\`）。最快的体检指标是**平均仓位**：正确实现下是 85%，写错的话仍是 98%。',
  },

  /* ═══════════ l4：收束（8 题）═══════════ */
  {
    id: 'quant-xquant-c10-l4-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c10-l4', tags: ['K', '地图'],
    question: '本课程的四阶段是？',
    options: [
      { value: 'a', text: '确定候选 → 制定规则 → 执行交易 → 评估归因' },
      { value: 'b', text: '选股 → 择时 → 止损 → 止盈' },
      { value: 'c', text: '数据 → 因子 → 模型 → 回测' },
      { value: 'd', text: '写代码 → 调参数 → 上线 → 赚钱' },
    ],
    answer: 'a',
    explanation: '四个阶段对应本课程：确定候选（c3 选标的、c10 因子池）→ 制定规则（c4 权重、c5 规则、c10 因子→规则）→ 执行交易（c8 成本与滑点）→ 评估归因（c2 基准、c6 体检、c7 过拟合、c9 监控）。每个阶段都能独立失败，且三个环节（做/看/疑）贯穿每一阶段。',
  },
  {
    id: 'quant-xquant-c10-l4-e2', type: 'single', difficulty: 2,
    relatedLessonId: 'quant-xquant-c10-l4', tags: ['U', '量级'],
    question: '本课程的决策层级（按影响量级从大到小）是？',
    options: [
      { value: 'a', text: '选标的（63.3pp）> 权重方法（183.4pp）> 规则参数（约 10pp）> 因子研究（回撤口径 4.77pp）' },
      { value: 'b', text: '规则参数 > 权重方法 > 选标的' },
      { value: 'c', text: '三者影响完全一样，没有层级' },
      { value: 'd', text: '因子研究 > 选标的 > 规则参数' },
    ],
    answer: 'a',
    explanation: '实测：等权 +41.69% → 单押 B +105.00%（63.3pp）；等权 → 动量排名 +225.09%（183.4pp）；第 5 章规则参数的对照差约 10pp 量级（具体数字见 c5）；本章因子研究在回撤口径上贡献 4.77pp。所以应该先做对高杠杆决策。反过来（先精调规则、标的随便选）是新手最大的时间浪费。',
  },
  {
    id: 'quant-xquant-c10-l4-e3', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c10-l4', tags: ['U', '复盘'],
    question: '一个季度里测了 10 个假设、确认了 10 个，说明检验做得很好、研究效率很高。',
    answer: false,
    explanation: '「测 10 个活 10 个」通常意味着检验太松。真实因子研究的正常比例是「测 10 个活 1 个」；「测 3 个活 3 个」几乎必然是检验标准有问题（没做样本外、没看参数敏感性、没算成本）。所以月度复盘必须统计**推翻率**，它比确认率更能反映检验质量。',
  },
  {
    id: 'quant-xquant-c10-l4-e4', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c10-l4', tags: ['U', '边界'],
    question: '本章的结论（动量因子整体无效、高波动期减仓改善回撤）可以推广到任何市场和标的池。',
    answer: false,
    explanation: '本章全部结论只对「25 只合成标的 + 这 5 年数据 + 这套参数」成立，是**方法演示**而不是普适规律。l1 的 GDP 总量（+0.1138）vs 增速（−0.0329）就是活例子——同一批对象换个因子定义符号就翻了。正确做法是「把方法搬走，把数字留下」。',
  },
  {
    id: 'quant-xquant-c10-l4-e5', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c10-l4', tags: ['K', '检查清单'],
    question: '因子上线前的五道关：① 可______（无前视）；② 有______（IC 符号跨窗口一致）；③ 够______（|ICIR| 有量级）；④ 有______（分组差异可翻译成规则）；⑤ 能______（改造成规则后指标可接受）。',
    blanks: [['计算'], ['方向'], ['稳定'], ['弱点'], ['落地']],
    explanation: '五道关的顺序不能乱：先确认「算得对」（可计算），再看「有没有方向」，再看「稳不稳」，再看「有没有可利用的弱点」，最后才看「改造成规则后能不能接受」。任何一关不通过就退回对应步骤，不要跳过。',
  },
  {
    id: 'quant-xquant-c10-l4-e6', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c10-l4', tags: ['U', '疑'],
    question: '关于「疑」的三个层次，下列说法正确的有？',
    options: [
      { value: 'a', text: 'L1（这段数据上成立吗）成本最低，新手通常停在这里' },
      { value: 'b', text: 'L2（换一段数据还成立吗）包含样本外、分段、参数敏感性、分组诊断' },
      { value: 'c', text: 'L3（为什么成立）成本最高，且可能没有答案' },
      { value: 'd', text: '只要 L1 通过，就不需要做 L2 和 L3' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 是本节要破除的核心误解。L1 只保证「指标算对了、没有明显前视」，它完全不能排除「这段数据恰好有利」。会做研究的人至少走到 L2；能长期活下来的人走到 L3（能说出机制，或明确承认「不知道机制但多市场多时期稳定」）。',
  },
  {
    id: 'quant-xquant-c10-l4-e7', type: 'code', difficulty: 3,
    relatedLessonId: 'quant-xquant-c10-l4', tags: ['D', '检查清单'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `gates(report)`：输入一个 dict（可含 `lookahead`、`sign_consistent`、`ic`、`icir`、`spread`、`dd_improve`），按本章五道关判定，返回 `(passed, failed_list)`。规则：\n1. `lookahead` 为 True → 第 1 关不过；\n2. `sign_consistent` 为 False → 第 2 关不过；\n3. `abs(icir) < 0.05` 或 `abs(ic) < 0.03` → 第 3 关不过；\n4. `spread` 缺失或 `abs(spread) < 0.01` → 第 4 关不过；\n5. `dd_improve` 缺失或 `<= 0` → 第 5 关不过。\n\n`failed_list` 是不过的关名列表（如 `["3 够稳定"]`），`passed` 是是否五关全过。',
    starterCode: `
def gates(report):
    pass

print(gates({"lookahead": False, "sign_consistent": True, "ic": -0.0252,
             "icir": -0.1152, "spread": 0.0715, "dd_improve": 19.4}))
print(gates({"lookahead": True, "sign_consistent": False, "ic": 0.01,
             "icir": 0.02, "spread": 0.005, "dd_improve": -3}))`,
    expectedOutput: '(False, [\'3 够稳定\']) 与 5 关全不过',
    tests: `
# 本章的真实数字：只有第 3 关不过
ok, failed = gates({"lookahead": False, "sign_consistent": True, "ic": -0.0252,
                    "icir": -0.1152, "spread": 0.0715, "dd_improve": 19.4})
assert ok is False, "本章因子第 3 关不过，整体应为 False"
assert failed == ["3 够稳定"], f"应只有第 3 关不过，实际 {failed}"

# 全部合格的例子
ok2, f2 = gates({"lookahead": False, "sign_consistent": True, "ic": 0.06,
                 "icir": 0.15, "spread": 0.05, "dd_improve": 12})
assert ok2 is True and f2 == [], f"全过时应返回 (True, [])，实际 {ok2} {f2}"

# 五关全不过
ok3, f3 = gates({"lookahead": True, "sign_consistent": False, "ic": 0.01,
                 "icir": 0.02, "spread": 0.005, "dd_improve": -3})
assert ok3 is False and len(f3) == 5, f"应 5 关全不过，实际 {f3}"
assert f3[0] == "1 可计算" and f3[-1] == "5 能落地", f"顺序应为第 1 关到第 5 关，实际 {f3}"

# 缺字段不应崩溃，且应判为不过
ok4, f4 = gates({"lookahead": False, "sign_consistent": True, "ic": 0.06, "icir": 0.15})
assert ok4 is False and "4 有弱点" in f4 and "5 能落地" in f4, f"缺字段应判不过，实际 {f4}"`,
    answer: `
def gates(report):
    failed = []
    if report.get("lookahead", False):
        failed.append("1 可计算")
    if not report.get("sign_consistent", True):
        failed.append("2 有方向")
    if abs(report.get("ic", 0)) < 0.03 or abs(report.get("icir", 0)) < 0.05:
        failed.append("3 够稳定")
    sp = report.get("spread")
    if sp is None or abs(sp) < 0.01:
        failed.append("4 有弱点")
    dd = report.get("dd_improve")
    if dd is None or dd <= 0:
        failed.append("5 能落地")
    return (len(failed) == 0, failed)`,
    explanation: '这道题把本章的五道关代码化。两个设计要点：① 用 `.get` 带默认值，缺字段不崩溃（但缺「弱点/落地」数据时应判不过，因为「没测」不等于「通过」）；② 返回顺序固定从第 1 关到第 5 关，便于阅读。用本章真实数字跑一遍，结果是「只有第 3 关不过」——这正是本章的结论：因子不能单独用，但弱点可用。',
  },
  {
    id: 'quant-xquant-c10-l4-e8', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c10-l4', tags: ['D', '复盘'],
    question: '请写一份「季度因子复盘」记录，包含六个部分：① 本季测了几个假设；② 确认了几个；③ 推翻了几个；④ 即使假设被推翻，留下了什么可用的结构；⑤ 下季方向；⑥ 工具升级。要求用本课程的具体实验填内容（第 2 章参数扫描、第 5 章止损、本章因子），并说明「确认 0 个」为什么不算失败。',
    referenceAnswer: `
① 本季测了几个假设（3 个）：
- 假设 A：动量因子在这套池子上有正向预测力（对应本章 l2）；
- 假设 B：RAM（动量 ÷ 波动）比原始动量更好（对应本章 l2）；
- 假设 C：止损能改善风险调整后收益（对应第 5 章 l2）。

② 确认了几个（0 个）：
- A 不通过：整体 IC −0.0252 < 0.03，修正 t = −0.91 不显著（第 3 关）；
- B 不通过：RAM 的 IC −0.0187 比原始动量 −0.0252 更弱，ICIR −0.0873 也更弱；
- C 部分通过但不能算确认：止损 5%（参照建仓）相对不止损确实有改善（具体数字见第 5 章 l2），但它依赖「参照点」这个未被验证的选择——换成参照峰值版本，同一阈值下的结果变成负的，两者相差约 50pp 量级。所以「止损有效」这个结论不成立，成立的只是「某个特定参照点下的止损恰好有效」。

③ 推翻了几个（2 个，明确证伪）：
- 「动量整体有效」→ 证伪（三个前向窗口 IC 全为负）；
- 「RAM 比原始动量更好」→ 证伪（IC 更弱、ICIR 更弱）。

④ 留下的可用结构（这是本季最有价值的产出）：
- **高波动组失效**：低波组 IC +0.0259、高波组 −0.0455、Spread +0.0715，且跨 fwd10/20/40 稳定（+0.0769 / +0.0715 / +0.0727）；
- **已翻译成规则**：高波动期仓位 × 0.7 → 回撤 −24.65% → −19.88%（改善 19.4%），代价是少赚 10.49pp，夏普 0.78 → 0.83；
- **稳健性已验证**：top3/5/8 × 10/21/63 日共 6 个变体，改进版回撤全部更浅（改善 14%-21%）。
- 附加发现：短期反转（IC +0.0374）比动量强，是下一季的候选。

⑤ 下季方向（具体到「测什么」）：
- 短期反转因子的分组 IC 与十分组单调性；
- 把「按波动率分组」换成「波动率中性化后的残差因子」（排除混杂）；
- 给本季的风控规则加成本（单边 10bp / 20bp），看是否仍成立。

⑥ 工具升级（本季学到的、下次要用的）：
- **重叠修正 t 值**：朴素 t = −4.09，修正后 −0.91，差 4.5 倍。以后所有 IC 的显著性检验都必须用 T/h，不是 T；
- **平均仓位体检**：减仓类策略必须打印平均仓位，它是「现金有没有真的存在」的最快判据（85% vs 98%）；
- **向量化 IC**：逐期循环 24.6s → 向量化 0.006s（快 150 倍，结果逐位相同）。

⑦ 「确认 0 个」为什么不算失败：
- **检验的价值在于「排除」**：本季排除掉 2 个错误假设，避免了在两个无效方向上继续投入——这是正产出；
- **结构比假设更值钱**：本季留下了一个稳定、可翻译、可回测的结构（Spread +0.0715），它的实际价值（19.4% 回撤改善）超过任何「假设被确认」；
- **正常比例**：真实因子研究是「测 10 个活 1 个」。一个季度能留下一个可用结构，就是正产出；「测 3 个活 3 个」通常意味着检验太松；
- **反过来想**：如果本季「确认了 3 个」，最该做的不是高兴，而是回头检查检验标准——大概率是没做样本外、没算成本、或没做参数敏感性。`,
    rubric: [
      { point: '① 至少 3 个假设，且具体到课程实验（参数扫描 / 止损 / 因子）', score: 2 },
      { point: '② 用具体数字说明「确认 0 个」（IC −0.0252、修正 t −0.91 等）', score: 3 },
      { point: '③ 明确指出被证伪的是哪两个假设', score: 2 },
      { point: '④ 说清「留下的结构」是 Spread +0.0715 → 回撤改善 19.4%', score: 4 },
      { point: '⑤ 下季方向具体到「测什么」，而不是「继续努力」', score: 2 },
      { point: '⑥ 工具升级含至少一项具体的技术教训（重叠修正 / 仓位体检 / 向量化）', score: 2 },
      { point: '⑦ 论证「确认 0 个不是失败」，含「排除即产出」或「正常比例」', score: 3 },
    ],
    keywords: ['假设', '推翻率', 'Spread', '结构', '下季方向', '工具升级', '排除即产出'],
    explanation: '这道题把本章的收束变成一份可执行的文档。评分重点在④和⑦——能不能意识到「留下结构」比「确认假设」更有价值，以及能不能正确看待「确认 0 个」。只写「本季没做出东西」的答案是错的，因为 Spread +0.0715 → 19.4% 回撤改善是实打实的产出。',
  },
];

export const quantXquantC10ExercisesAll = quantXquantC10Exercises;
