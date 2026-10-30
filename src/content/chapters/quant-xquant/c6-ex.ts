import type { Exercise } from '../../../types';

/* c6 习题：难度 2/3/3/3/4 → 8/10/10/10/13，共 51 题。 */

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

/** 动量排名策略（RAM 排序，只买 RAM>0 的等权），demo / 代码题共用 */
const MOM_FN = `
def ram_panel(mom_win=20, vol_win=20):
    return PX.pct_change(mom_win) / (RET.rolling(vol_win).std() * np.sqrt(252))

def mom_ret(mom_win=20, vol_win=20, freq=21):
    ram = ram_panel(mom_win, vol_win).values
    P = PX.values; R = RET.values
    n = len(P); warm = max(mom_win, vol_win)
    w = np.array([1/3, 1/3, 1/3]); out = np.zeros(n)
    for i in range(n):
        if i % freq == 0 and i > warm:
            row = ram[i]
            if not np.isnan(row).any():
                p = np.where(row > 0, row, 0.0)
                w = p / p.sum() if p.sum() > 0 else np.zeros(3)
        rv = R[i]; pr = float(w @ rv); out[i] = pr
        g = w * (1 + rv); s = g.sum()
        if s > 0: w = g / s
    return pd.Series(out, index=RET.index)
`;

export const quantXquantC6Exercises: Exercise[] = [
  /* ═══════════ l1：基准与相对收益（8 题）═══════════ */
  {
    id: 'quant-xquant-c6-l1-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c6-l1', tags: ['K', '基准'],
    question: '本节把基准分成三个层次，其中「第二层」是？',
    options: [
      { value: 'a', text: '单只标的（A / B / C 各自）' },
      { value: 'b', text: '等权组合（1/3 各一份，21 日再平衡）' },
      { value: 'c', text: '等权组合且不加任何规则（不再平衡）' },
      { value: 'd', text: '沪深300 指数本身' },
    ],
    answer: 'b',
    explanation: '三层次：第一层是单资产（我选的东西行不行）、第二层是等权组合（我的权重方法有没有加分）、第三层是等权不加规则（我的规则有没有加分）。d 属于第一层。',
  },
  {
    id: 'quant-xquant-c6-l1-e2', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c6-l1', tags: ['K', '基准'],
    question: '本节实测：A 累计 ______%、B 累计 ______%、C 累计 ______%、等权 21 日累计 ______%。等权相对 B 的相对收益是 ______ pp（填带符号的数）。',
    blanks: [['0.75'], ['105.00', '105'], ['28.33'], ['41.69'], ['-63.31', '−63.31']],
    explanation: 'A +0.75%、B +105.00%、C +28.33%、等权 +41.69%。等权 − B = 41.69 − 105.00 = −63.31 pp。同一个 +41.69% 的等权，对 A 是 +40.94 pp（优秀），对 B 是 −63.31 pp（落后）。',
  },
  {
    id: 'quant-xquant-c6-l1-e3', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c6-l1', tags: ['U', '基准'],
    question: '一个策略五年赚了 41.69%，这个数字本身就能说明它是一个好策略。',
    answer: false,
    explanation: '不行。必须补上「和什么比」。同一份 +41.69% 的净值，对 A（+0.75%）领先 40.94 pp，对 B（+105.00%）落后 63.31 pp。没有基准的收益数字和没有刻度的温度计一样。',
  },
  {
    id: 'quant-xquant-c6-l1-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c6-l1', tags: ['U', '口径'],
    question: '关于「相对收益」的单位与算法，下列说法正确的有？',
    options: [
      { value: 'a', text: '两个百分数之间应该做减法，单位是 pp（百分点）' },
      { value: 'b', text: '用「策略收益 / 基准收益」的比值更直观，应该优先用比值' },
      { value: 'c', text: '基准收益接近 0 时，比值会被放大成无意义的数字' },
      { value: 'd', text: '本节 A 基准下用比值会得到约 55.6 倍，这个数字不能写进报告' },
    ],
    answer: ['a', 'c', 'd'],
    explanation: 'b 是错的。A 的累计只有 0.75%，41.69/0.75 ≈ 55.6 倍——基数接近 0 时比值没有信息量。两个百分数之间只能做减法（pp），不能做除法。',
  },
  {
    id: 'quant-xquant-c6-l1-e5', type: 'code', difficulty: 2,
    relatedLessonId: 'quant-xquant-c6-l1', tags: ['D', '基准'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `rel_report(strategy, benches)`：`strategy` 是策略日收益 Series，`benches` 是 `{名字: 日收益 Series}` 字典。返回 DataFrame（索引为基准名，列含 `bench_tot`、`strat_tot`、`rel_pp`），其中 `rel_pp = 策略累计 − 基准累计`（百分点）。',
    starterCode: `
def rel_report(strategy, benches):
    pass

s, _ = simulate(EW, freq=21)
print(rel_report(s, {"A": RET.A, "B": RET.B, "C": RET.C}))`,
    expectedOutput: '三行相对收益表（A +40.94 / B -63.31 / C +13.35）',
    tests: `
s, _ = simulate(EW, freq=21)
df = rel_report(s, {"A": RET.A, "B": RET.B, "C": RET.C})
assert len(df) == 3, f"应有 3 行，实际 {len(df)}"
for c in ("bench_tot", "strat_tot", "rel_pp"):
    assert c in df.columns, f"缺少列 {c}"
assert abs(df.loc["A", "rel_pp"] - 40.94) < 0.2, f"A 应约 +40.94 pp，实际 {df.loc['A','rel_pp']}"
assert abs(df.loc["B", "rel_pp"] - (-63.31)) < 0.3, f"B 应约 -63.31 pp，实际 {df.loc['B','rel_pp']}"
assert abs(df.loc["C", "rel_pp"] - 13.35) < 0.2, f"C 应约 +13.35 pp，实际 {df.loc['C','rel_pp']}"
assert (df["rel_pp"] - (df["strat_tot"] - df["bench_tot"])).abs().max() < 0.02, "rel_pp 必须等于两个累计之差"`,
    answer: `
def rel_report(strategy, benches):
    rows = {}
    st = metrics(strategy)["tot"]
    for name, r in benches.items():
        bt = metrics(r)["tot"]
        rows[name] = {"bench_tot": round(bt, 2), "strat_tot": round(st, 2),
                      "rel_pp": round(st - bt, 2)}
    return pd.DataFrame(rows).T`,
    explanation: '关键是把相对收益定义成「两个累计收益相减」（pp），而不是比值。三个基准下同一个策略得到 +40.94 / −63.31 / +13.35 三个完全不同的结论——这正是「必须指明基准」的量化证据。',
  },
  {
    id: 'quant-xquant-c6-l1-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c6-l1', tags: ['U', '综合'],
    question: '本节发现「等权 21 日再平衡」（+41.69%）低于「等权不再平衡」（+44.69%），差 3.01 pp。这个对比属于哪一层基准，说明了什么？',
    options: [
      { value: 'a', text: '第三层；说明 21 日再平衡这条规则在这段数据上是减分的' },
      { value: 'b', text: '第一层；说明 A 标的不行' },
      { value: 'c', text: '第二层；说明等权这个权重方法不行' },
      { value: 'd', text: '不属于任何层，因为两者都是等权' },
    ],
    answer: 'a',
    explanation: '第三层基准回答「我的规则有没有加分」。21 日再平衡 +41.69% vs 不再平衡 +44.69%，是 −3.01 pp，即这条规则减分。只有主动和「不加这条规则」比才会发现——这正是基准分层的价值。',
  },
  {
    id: 'quant-xquant-c6-l1-e7', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c6-l1', tags: ['D', '研究设计'],
    question: '你要向一个不懂量化的人汇报一个策略的业绩。请回答：\n① 你会用哪几个基准？为什么不能只用一个？\n② 为什么相对收益要用 pp 而不是「跑赢 X%」？举一个本节的具体数字说明。\n③ 如果老板只允许你在报告里写一个数字，你写哪个？理由？\n④ 写出你认为合格的「一句话结论」示范。',
    referenceAnswer: `
① 基准选择（至少三个层次）：
- **第一层：单资产**（A +0.75% / B +105.00% / C +28.33%）。回答「我选的东西本身行不行」；
- **第二层：等权组合**（+41.69%）。回答「我的权重方法有没有加分」；
- **第三层：等权不加规则**（不再平衡 +44.69%）。回答「我的规则有没有加分」。
不能只用一个：因为三层的失败含义完全不同（选错标的 / 权重方法减分 / 规则减分），只给一个基准就无法定位问题。而且本节已经证明：同一个策略对 A 领先 40.94 pp、对 B 落后 63.31 pp——单一基准可以被挑选。

② 为什么用 pp：
- 两个百分数之间做除法会得到无意义的数字。本节 A 的累计只有 +0.75%，41.69 / 0.75 ≈ **55.6 倍**。这个「55.6 倍」既不反映风险，也无法还原计算口径；
- 而 pp 差（+40.94 pp）有明确的算术含义：策略比基准多赚了 40.94 个百分点的累计收益；
- 基数接近 0 时比值被无限放大，这是「跑赢 X%」这类说法最常被误用的地方。

③ 只允许写一个数字：
**写「相对第三层基准（等权不再平衡）的 pp 差」，即 −3.01 pp**。理由：
- 它是唯一直接回答「我做的事有没有价值」的数字——因为第三层就是「什么都不做」；
- 写累计收益（+41.69%）会让读者以为是策略的功劳，而实际上等权本身就能拿到 41.69%；
- 写相对 B 的 −63.31 pp 会把「标的选择」和「策略价值」混在一起。
（如果目标是「和同行比」，则写相对等权/同类组合的 pp 差；关键是**必须配一句话说明基准是什么**。）

④ 合格的一句话结论：
「在 2021-01-04 至 2025-12-26 的合成行情上，等权 21 日再平衡组合累计 +41.69%；相对沪深300替代 +40.94 pp、相对纳指100替代 −63.31 pp、相对『等权不再平衡』−3.01 pp。即：分散化相对 A 有显著价值，但定期再平衡这条规则本身是减分的。」
要点：含样本区间、含策略收益、含三个层次的 pp 差、含一句解释。`,
    rubric: [
      { point: '① 给出三个层次且说明各层回答什么问题', score: 3 },
      { point: '① 说明「单一基准可以被挑选」', score: 2 },
      { point: '② 用本节 55.6 倍（或类似）的具体数字说明比值无意义', score: 2 },
      { point: '③ 选择有理由，且明确指向「策略价值」而非「绝对收益」', score: 2 },
      { point: '④ 结论含样本区间 + 策略收益 + 基准名 + pp 差', score: 3 },
    ],
    keywords: ['三层次', 'pp', '百分点', '基准', '不再平衡', '样本区间'],
    explanation: '评分重点在②与④。第②问考的是「会不会用对单位」，第④问考的是「能不能把结论写成可复现的形式」。这两项是从「会算数」到「会汇报」的分界。',
  },
  {
    id: 'quant-xquant-c6-l1-e8', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c6-l1', tags: ['U', '口径'],
    question: 'A 的五年累计只有 +0.75%，所以 A 是本节表现最好的标的（因为它波动小、回撤大但收益为正）。',
    answer: false,
    explanation: 'A 恰恰是最差的一种形态：波动 11.01%（高于等权的 8.02%）、回撤 −37.23%（是等权的 2.7 倍），五年只赚 0.75%。「承担了风险但没有拿到补偿」——这是最该避免的组合。判断好坏必须同时看收益与风险。',
  },

  /* ═══════════ l2：逐年拆解（10 题）═══════════ */
  {
    id: 'quant-xquant-c6-l2-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c6-l2', tags: ['K', '逐年'],
    question: '为什么本课程强调「只看五年累计收益不够」？',
    options: [
      { value: 'a', text: '因为累计收益会把不同年份的巨大差异平均掉，掩盖「哪一年在亏」' },
      { value: 'b', text: '因为累计收益的计算公式是错的' },
      { value: 'c', text: '因为五年太短，应该看十年' },
      { value: 'd', text: '因为累计收益不能跨策略比较' },
    ],
    answer: 'a',
    explanation: '本节实测：等权五年累计 +41.69%（年均 +7.65%），但逐年是 −3.29 / +0.05 / +2.74 / +19.96 / +18.81。前三年几乎白干，全部收益来自最后两年。年均数字掩盖了这个路径。',
  },
  {
    id: 'quant-xquant-c6-l2-e2', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c6-l2', tags: ['K', '逐年'],
    question: '本节逐年收益（等权 21 日）：2021 年 ______%、2022 年 ______%、2023 年 ______%、2024 年 ______%、2025 年 ______%。',
    blanks: [['-3.29', '−3.29'], ['0.05'], ['2.74'], ['19.96'], ['18.81']],
    explanation: '前三年累计约 −0.6%（几乎白干），后两年 +19.96% 与 +18.81% 贡献了几乎全部收益。这就是「年均 +7.65%」的真实路径。',
  },
  {
    id: 'quant-xquant-c6-l2-e3', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c6-l2', tags: ['U', '逐年'],
    question: 'A 的五年年均收益是 +1.85%，所以 A 的「典型年份」是赚钱的。',
    answer: false,
    explanation: 'A 的均值 +1.85% 但中位数 −9.40%，符号相反。均值是正的，因为 2024 年的 +37.77% 一个点把四个负数拉了回来；中位数是负的，因为「典型的一年」是亏 9%。均值与中位数符号相反说明分布极度偏斜。',
  },
  {
    id: 'quant-xquant-c6-l2-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c6-l2', tags: ['U', '一致性'],
    question: '判断一个策略「一致性」好坏，可以用哪些指标？',
    options: [
      { value: 'a', text: '正收益期数占比（本节：A 6/10、等权 8/10、动量 9/10）' },
      { value: 'b', text: '最差年 / 最差半年有多差' },
      { value: 'c', text: '均值与中位数是否同号（符号相反 = 极度偏斜）' },
      { value: 'd', text: '五年累计收益的大小' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 恰恰是「一致性」的反面——累计收益高但分布极不均匀，正是一致性差的典型（A 就是）。a/b/c 分别从频率、极值、偏斜三个角度量化一致性。',
  },
  {
    id: 'quant-xquant-c6-l2-e5', type: 'code', difficulty: 3,
    relatedLessonId: 'quant-xquant-c6-l2', tags: ['D', '逐年'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `year_table(series_dict)`：`series_dict` 是 `{名字: 日收益 Series}`。返回 DataFrame（索引为名字，列为年份字符串），每个单元格是该年的累计收益（%）。再实现 `consistency(series_dict)` 返回 `{名字: (正收益年数, 总年数, 均值, 中位数)}`。',
    starterCode: `
def year_table(series_dict):
    pass

def consistency(series_dict):
    pass

s, _ = simulate(EW, freq=21)
print(year_table({"等权": s}))
print(consistency({"等权": s}))`,
    expectedOutput: '逐年收益表 + (4, 5, 7.65, 2.74)',
    tests: `
s, _ = simulate(EW, freq=21)
df = year_table({"等权": s, "A": RET.A})
assert df.shape[0] == 2, f"应有 2 行，实际 {df.shape[0]}"
assert list(df.columns) == ["2021", "2022", "2023", "2024", "2025"], f"列名不对: {list(df.columns)}"
assert abs(df.loc["等权", "2021"] - (-3.29)) < 0.2, f"等权 2021 应约 -3.29%，实际 {df.loc['等权','2021']}"
assert abs(df.loc["等权", "2024"] - 19.96) < 0.3, f"等权 2024 应约 19.96%，实际 {df.loc['等权','2024']}"
assert abs(df.loc["A", "2022"] - (-13.87)) < 0.3, f"A 2022 应约 -13.87%"

c = consistency({"等权": s, "A": RET.A})
n, tot, mean, med = c["A"]
assert tot == 5, "应统计 5 年"
assert n == 2, f"A 正收益年数应为 2（2024/2025），实际 {n}"
assert mean > 0 and med < 0, f"A 均值应正、中位数应负，实际 mean={mean}, med={med}"
n2, _, mean2, _ = c["等权"]
assert n2 == 4, f"等权正收益年数应为 4，实际 {n2}"`,
    answer: `
def year_table(series_dict):
    rows = {}
    for name, r in series_dict.items():
        rows[name] = {str(y): round(((1 + r[r.index.year == y]).prod() - 1) * 100, 2)
                      for y in sorted(set(r.index.year))}
    return pd.DataFrame(rows).T

def consistency(series_dict):
    out = {}
    for name, r in series_dict.items():
        years = sorted(set(r.index.year))
        vals = np.array([((1 + r[r.index.year == y]).prod() - 1) * 100 for y in years])
        out[name] = (int((vals > 0).sum()), len(years), round(float(vals.mean()), 2),
                     round(float(np.median(vals)), 2))
    return out`,
    explanation: '注意 `(1 + r[r.index.year == y]).prod() - 1` 是「把该年的日收益连乘再减 1」，不能用「日收益之和」。consistency 里同时返回均值与中位数是关键——A 的均值正、中位数负，这个符号分歧就是偏斜信号。',
  },
  {
    id: 'quant-xquant-c6-l2-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c6-l2', tags: ['U', '分段'],
    question: '本节把五年切成三段（2021-2022 普跌 / 2023 磨底 / 2024-2025 上涨）。为什么说「上涨段几乎不区分能力」？',
    options: [
      { value: 'a', text: '因为上涨段所有组合都赚钱，连最差的 A 都涨了 48.68%' },
      { value: 'b', text: '因为上涨段的收益都是假的' },
      { value: 'c', text: '因为上涨段的数据不可靠' },
      { value: 'd', text: '因为上涨段的波动太小' },
    ],
    answer: 'a',
    explanation: '2024-2025 段：A +48.68%、B +57.50%、等权 +42.52%、动量 +100.83%——所有组合都在赚。真正的区分发生在普跌段（2021-2023）：A −32.24% vs 等权 −0.59% vs 动量 +61.88%。只报五年累计会被上涨段冲淡。',
  },
  {
    id: 'quant-xquant-c6-l2-e7', type: 'fill', difficulty: 3,
    relatedLessonId: 'quant-xquant-c6-l2', tags: ['K', '分段'],
    question: '普跌段（2021-2023 合并）实测：A ______%、等权 21 日 ______%、动量 ______%。上涨段（2024-2025）三者分别是 +48.68% / +42.52% / +100.83%。',
    blanks: [['-32.24', '−32.24'], ['-0.59', '−0.59'], ['61.88', '+61.88']],
    explanation: '普跌段是区分能力的唯一时段：A 亏 32.24%（绝大多数人撑不到反弹），等权只亏 0.59%（扛住了），动量还赚 61.88%（靠只买 RAM>0 的资产躲开下跌）。',
  },
  {
    id: 'quant-xquant-c6-l2-e8', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c6-l2', tags: ['U', '方法'],
    question: '分段检验的切点可以自由选择，只要最后结论看起来合理就行。',
    answer: false,
    explanation: '切点必须事先定好。如果先看结果再选切点（刚好切在策略表现最好的边界），就变成了数据窥探——你会「发现」一个只在特定切法下成立的优势。本节用的是自然年度与事先定义的市场状态（普跌/磨底/上涨）。',
  },
  {
    id: 'quant-xquant-c6-l2-e9', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c6-l2', tags: ['D', '研究设计'],
    question: '有人给你看一张表：「策略五年累计 +41.69%，年均 +7.65%，表现稳定。」请回答：\n① 你会追问他哪三个问题？\n② 用本节数据说明「年均 +7.65%」这个描述哪里不准确；\n③ 设计一个能检验「稳定性」的最小实验方案（至少 5 步）；\n④ 如果检验后发现「前三年白干、后两年暴涨」，你会怎么向客户描述这个策略？',
    referenceAnswer: `
① 要追问的三个问题：
1. **逐年/逐期明细在哪？** 年均是几何平均的结果，不告诉你路径；
2. **最差的一年（或最差连续 12 个月）是多少？** 决定持有体验与「会不会放弃」；
3. **基准是什么？** +41.69% 对 A 领先 40.94 pp、对 B 落后 63.31 pp，不指明基准等于没说。

② 「年均 +7.65%」哪里不准确：
- 实际逐年是 **−3.29% / +0.05% / +2.74% / +19.96% / +18.81%**；
- 前三年累计约 **−0.6%**（几乎白干），后两年贡献了几乎全部收益；
- 均值 +7.65% 与中位数 +2.74% 相差 4.9 pp，说明分布右偏（少数好年份拉高了均值）；
- 所以准确描述是「**扛住三年不亏，靠最后两年赚回来**」，而不是「每年稳定赚 7.65%」。

③ 最小实验方案（≥5 步）：
1. **拆逐年**：每年累计收益 + 正收益年数（本节：等权 4/5）；
2. **拆半年**：10 个半年的正收益数（本节：8/10）；
3. **分段看市场状态**：至少切出「普跌段」与「上涨段」，分别报收益；
4. **算最差连续 12 个月**：比「最差年份」更严格，因为年份边界是人为的；
5. **算均值与中位数**：符号相反说明极度偏斜，此时年均没有信息量；
6. **加基准**：每一段都要和基准比，否则无法区分「策略好」与「市场好」。

④ 向客户的描述：
「这个策略在 2021-2025 的合成行情上累计 +41.69%。它不是每年稳定赚 7.65%——前三年基本原地踏步（累计约 −0.6%），收益集中在 2024-2025 的上涨段（+42.52%）。它真正的优点是抗跌：2021-2023 的普跌段只亏 0.59%，而同期沪深300替代亏了 32.24%。所以它的定位是『**在下跌市里守住本金，在上涨市里跟上涨幅**』，代价是你要能接受三年不赚钱。」
（关键是：**主动说出最难受的那部分**，而不是等客户自己发现。）`,
    rubric: [
      { point: '① 三个问题含「逐年明细」「最差期」「基准」', score: 3 },
      { point: '② 用本节的逐年数字说明前三年白干、后两年贡献', score: 3 },
      { point: '③ 至少 5 步，含「半年粒度」「分段」「最差连续 12 个月」「均值 vs 中位数」', score: 3 },
      { point: '④ 描述里主动说出「三年不赚钱」这一难受的部分', score: 2 },
      { point: '④ 给出策略的定位（抗跌型）而非只报数字', score: 1 },
    ],
    keywords: ['逐年', '中位数', '偏斜', '分段', '普跌段', '基准', '最差连续 12 个月'],
    explanation: '评分重点在②与④。第②问考「能不能看穿年均」，第④问考「敢不敢主动说出坏消息」。后者是投研沟通里最难也最值钱的能力。',
  },
  {
    id: 'quant-xquant-c6-l2-e10', type: 'single', difficulty: 4,
    relatedLessonId: 'quant-xquant-c6-l2', tags: ['U', '综合'],
    question: '动量策略在 10 个半年里有 9 个跑赢等权（最小 +2.62 pp、最大 +12.67 pp）。这个事实最能说明什么？',
    options: [
      { value: 'a', text: '动量的优势不是靠某一段爆发，而是每一段都略好，累积成五年 183 pp 的差距' },
      { value: 'b', text: '动量策略永远不会亏' },
      { value: 'c', text: '等权策略是无效的' },
      { value: 'd', text: '应该把杠杆加到动量策略上' },
    ],
    answer: 'a',
    explanation: '「每期都略好」比「某一期特别好」更有说服力——前者说明优势是系统性的，后者可能只是运气。这是本节用「正收益期数」而不只用「极差」的原因。b 错（动量在 2021H1 也亏 0.28%）；c 过强（等权有 8/10 期为正）；d 是无根据的推论。',
  },

  /* ═══════════ l3：胜率与分布（10 题）═══════════ */
  {
    id: 'quant-xquant-c6-l3-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c6-l3', tags: ['K', '胜率'],
    question: '胜率、盈亏比、盈亏因子三者的区别是？',
    options: [
      { value: 'a', text: '胜率是次数之比、盈亏比是平均值之比、盈亏因子是总和之比' },
      { value: 'b', text: '三者是同一个东西的不同叫法' },
      { value: 'c', text: '胜率看金额、盈亏比看次数' },
      { value: 'd', text: '盈亏因子 = 胜率 × 盈亏比' },
    ],
    answer: 'a',
    explanation: '胜率 = 赢的次数/总次数；盈亏比 = 平均盈利/平均亏损；盈亏因子 = 总盈利/总亏损。d 不成立（不是简单相乘，因为分母不同）。三者一起看才能判断「赚法」是否健康。',
  },
  {
    id: 'quant-xquant-c6-l3-e2', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c6-l3', tags: ['K', '胜率'],
    question: '本节实测：等权 21 日日胜率 ______%、盈亏比 ______、五年赚 +41.69%；动量日胜率 ______%（不到一半）、盈亏比 ______、五年赚 +225.09%。',
    blanks: [['52.5'], ['1.04'], ['48.9'], ['1.18']],
    explanation: '胜率更低的动量赚了 5.4 倍。原因是盈亏比：动量的日均盈 +0.513% vs 日均亏 −0.434%，赢的时候赢得多。胜率与盈亏比必须一起看。',
  },
  {
    id: 'quant-xquant-c6-l3-e3', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c6-l3', tags: ['U', '胜率'],
    question: '胜率越高的策略越赚钱。',
    answer: false,
    explanation: '本节反例：等权日胜率 52.5% 赚 41.69%，动量日胜率 48.9% 赚 225.09%。A 日胜率 50.9%（高于动量）但盈亏比 0.88（赢的比输的还少），五年只赚 0.75%。胜率单独拿出来几乎不能说明任何事。',
  },
  {
    id: 'quant-xquant-c6-l3-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c6-l3', tags: ['U', '口径'],
    question: '报「胜率」时必须交代哪些口径？',
    options: [
      { value: 'a', text: '分母是什么（含不含零收益日）' },
      { value: 'b', text: '粒度（日胜率 / 周胜率 / 月胜率 / 交易胜率）' },
      { value: 'c', text: '盈亏比（因为胜率必须和赔率一起才有意义）' },
      { value: 'd', text: '策略的代码行数' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: '本节动量的日胜率可以是 48.9%（含 188 个零收益日）或 57.2%（剔除），相差 8.3 pp；日胜率 48.9% 但月胜率 65.0%，相差 16 pp。不交代口径的胜率无法比较。d 与有效性无关。',
  },
  {
    id: 'quant-xquant-c6-l3-e5', type: 'code', difficulty: 3,
    relatedLessonId: 'quant-xquant-c6-l3', tags: ['D', '胜率'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `dist_stats(r, exclude_zero=False)`：返回 dict，含 `win_rate`（胜率，%）、`pl_ratio`（盈亏比 = 平均盈利/|平均亏损|）、`profit_factor`（盈亏因子 = 总盈利/|总亏损|）。`exclude_zero=True` 时把零收益日从分母中剔除。',
    starterCode: `
def dist_stats(r, exclude_zero=False):
    pass

s, _ = simulate(EW, freq=21)
print(round(dist_stats(s)["win_rate"], 1), round(dist_stats(s)["pl_ratio"], 2))`,
    expectedOutput: '52.5 1.04',
    tests: `
s, _ = simulate(EW, freq=21)
d = dist_stats(s)
assert abs(d["win_rate"] - 52.5) < 0.3, f"胜率应约 52.5%，实际 {d['win_rate']}"
assert abs(d["pl_ratio"] - 1.04) < 0.03, f"盈亏比应约 1.04，实际 {d['pl_ratio']}"
assert abs(d["profit_factor"] - 1.15) < 0.05, f"盈亏因子应约 1.15，实际 {d['profit_factor']}"

# 剔除零收益日：等权几乎没零收益日，胜率应几乎不变
d2 = dist_stats(s, exclude_zero=True)
assert abs(d2["win_rate"] - d["win_rate"]) < 1.0, "等权零收益日极少，剔除后胜率应几乎不变"

# A 的盈亏比小于 1
da = dist_stats(RET.A)
assert da["pl_ratio"] < 1.0, f"A 的盈亏比应小于 1，实际 {da['pl_ratio']}"
assert abs(da["win_rate"] - 50.9) < 0.4, f"A 胜率应约 50.9%，实际 {da['win_rate']}"`,
    answer: `
def dist_stats(r, exclude_zero=False):
    pos = r[r > 0]; neg = r[r < 0]
    if exclude_zero:
        n = len(pos) + len(neg)
    else:
        n = len(r)
    wr = len(pos) / n * 100
    pl = abs(pos.mean() / neg.mean())
    pf = pos.sum() / abs(neg.sum())
    return {"win_rate": wr, "pl_ratio": pl, "profit_factor": pf}`,
    explanation: '关键是 `exclude_zero` 只改分母（n），不改分子（盈利次数）。本节动量含 188 个零收益日（全空仓持现金），含进去日胜率 48.9%、剔除后 57.2%——同一段数据差 8.3 pp。这个参数就是「口径」的代码化。',
  },
  {
    id: 'quant-xquant-c6-l3-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c6-l3', tags: ['U', '期望'],
    question: '盈亏比为 2.0 时，盈亏平衡所需的胜率是多少？',
    options: [
      { value: 'a', text: '33.3%' },
      { value: 'b', text: '50.0%' },
      { value: 'c', text: '66.7%' },
      { value: 'd', text: '25.0%' },
    ],
    answer: 'a',
    explanation: '期望为 0 时：p × 2 = (1−p) × 1 → 3p = 1 → p = 1/3 = 33.3%。一般公式：盈亏平衡胜率 = 1/(1 + 盈亏比)。盈亏比 1.0 → 50%；1.18 → 45.9%；2.0 → 33.3%。',
  },
  {
    id: 'quant-xquant-c6-l3-e7', type: 'fill', difficulty: 3,
    relatedLessonId: 'quant-xquant-c6-l3', tags: ['K', '分布'],
    question: '等权月度收益分布：均值 +0.62%、中位数 +0.41%、标准差 2.68%、最差 ______%、最好 ______%、偏度 ______（正/负）。动量月度最好 ______%。',
    blanks: [['-4.89', '−4.89'], ['6.96', '+6.96'], ['正', '+0.14', '0.14'], ['11.36', '+11.36']],
    explanation: '偏度 +0.14 为正说明右尾略长（大赚比大亏多），这是「健康」的形态。动量的右尾更长（最好月 +11.36% vs 等权的 +6.96%），这正是它盈亏比 3.23 的来源。',
  },
  {
    id: 'quant-xquant-c6-l3-e8', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c6-l3', tags: ['U', '分布'],
    question: '负偏度（左尾更长）比低胜率更危险。',
    answer: true,
    explanation: '负偏度意味着「少数几次巨亏主导了结果」，而巨亏会直接击穿心理承受点与资金安全线。低胜率只是「经常小亏」，只要盈亏比够高仍可赚钱（动量就是）；负偏度的策略在极端行情下可能一次亏掉多年积累。',
  },
  {
    id: 'quant-xquant-c6-l3-e9', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c6-l3', tags: ['D', '研究设计'],
    question: '一个交易者说：「我的策略胜率 65%，稳赚。」请回答：\n① 用期望公式说明「胜率 65%」为什么不足以判断能赚钱；\n② 你会追问哪四个数据？\n③ 如果他的盈亏比是 0.3（赢时赚 1 单位、亏时亏 3.3 单位），算出他的期望并判断；\n④ 设计一个实验，检验他的 65% 是不是过拟合的产物。',
    referenceAnswer: `
① 为什么胜率 65% 不足以判断：
期望 $E = p \\cdot \\bar r_{\\text{赢}} + (1-p) \\cdot \\bar r_{\\text{输}}$。胜率 p 只是两个乘数之一。
- 若盈亏比 2.0：$0.65 \\times 2 - 0.35 \\times 1 = +0.95$ 单位（很好）；
- 若盈亏比 0.3：$0.65 \\times 0.3 - 0.35 \\times 1 = -0.155$ 单位（亏钱）。
**同一个 65% 的胜率，可以是稳定盈利，也可以是稳定亏损。**

② 要追问的四个数据：
1. **盈亏比**（平均盈利 / 平均亏损）；
2. **盈亏因子**（总盈利 / 总亏损）——它直接给出「赚的总量是亏的多少倍」；
3. **胜率的分母与粒度**（日/周/月/交易？零收益怎么算？）；
4. **样本量与样本外结果**（65% 是在多少个样本上算的？换一段数据还是 65% 吗？）。

③ 盈亏比 0.3 时的期望：
$E = 0.65 \\times 1 - 0.35 \\times 3.333 = 0.65 - 1.167 = -0.517$ 单位/笔。
（用盈亏比定义：均盈/均亏 = 0.3，若均亏 = 1 单位则均盈 = 0.3 单位，则 $E = 0.65 \\times 0.3 - 0.35 \\times 1 = -0.155$ 单位/笔。）
**结论：这是稳定亏损的策略**。65% 的胜率掩盖了「赢小亏大」这个致命结构。本节 A 就是缩小版：胜率 50.9%、盈亏比 0.88、五年只赚 0.75%。

④ 检验 65% 是否过拟合（≥5 步）：
1. **算盈亏平衡胜率**：$1/(1+0.3) = 76.9\\%$。他的 65% 低于门槛 → 期望为负，先排除；
   （若盈亏比更高，比如 1.5，则门槛 40%，需要继续验证。）
2. **参数敏感性**：把他策略的所有参数扫一遍，看 65% 是高原还是山峰（第 5 节判据）；
3. **样本外检验**：按时间 60/40 切分，只在训练段调参，测试段跑一次；
4. **Walk-forward**：滚动重选参数，看逐折胜率是否稳定（第 7 章）；
5. **按年拆解**：65% 是不是集中在某一年？如果是，就是某段行情的产物；
6. **算「试了多少次」**：如果他是试了 100 组参数才找到这 65%，按第 7 章的选择偏差，样本内虚高是必然的。`,
    rubric: [
      { point: '① 写出期望公式并用两个盈亏比数值对比', score: 3 },
      { point: '② 四个追问含「盈亏比」「分母/粒度」「样本外」', score: 3 },
      { point: '③ 正确算出负期望并给出结论', score: 2 },
      { point: '④ 至少 5 步检验，含参数敏感性与样本外', score: 3 },
      { point: '④ 提到「试了多少次」这个选择偏差维度', score: 1 },
    ],
    keywords: ['期望', '盈亏比', '盈亏因子', '盈亏平衡胜率', '样本外', '选择偏差'],
    explanation: '评分重点在①与③。能不能用期望公式把「胜率 65%」拆成「可以是盈利也可以是亏损」，是本节最核心的认知。第④问的「试了多少次」是从本章到第 7 章的桥梁。',
  },
  {
    id: 'quant-xquant-c6-l3-e10', type: 'single', difficulty: 4,
    relatedLessonId: 'quant-xquant-c6-l3', tags: ['U', '综合'],
    question: '动量策略日胜率 48.9% 但月胜率 65.0%。这个差异说明什么？',
    options: [
      { value: 'a', text: '日度噪声被平均掉了；「只买 RAM>0 的资产」这个筛选在月度尺度上才显现效果' },
      { value: 'b', text: '月度胜率的计算有错误' },
      { value: 'c', text: '策略在月内换了参数' },
      { value: 'd', text: '说明应该只报月胜率、不报日胜率' },
    ],
    answer: 'a',
    explanation: '动量的日收益是「三个资产里有的涨有的跌」的混合，单日方向接近随机；拉长到一个月，筛选效果显现。这也是「指标粒度会改变结论」的实证——报胜率必须说清粒度。d 错在「只报好看的」，正确做法是两个都报。',
  },

  /* ═══════════ l4：回撤（10 题）═══════════ */
  {
    id: 'quant-xquant-c6-l4-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c6-l4', tags: ['K', '回撤'],
    question: '为什么说「只报 MDD 等于隐瞒一半信息」？',
    options: [
      { value: 'a', text: 'MDD 只说明最惨那天跌多少，不说明在水下待了多久' },
      { value: 'b', text: 'MDD 的计算公式是错的' },
      { value: 'c', text: 'MDD 只能用于股票' },
      { value: 'd', text: 'MDD 应该用绝对值' },
    ],
    answer: 'a',
    explanation: 'MDD 是单点，宽度是区间。本节实测：等权 MDD −13.84% 但要熬 464 天；动量 MDD −8.78% 只熬 180 天。深度差 1.58 倍，水下时间差 2.6 倍——后者才决定「会不会中途放弃」。',
  },
  {
    id: 'quant-xquant-c6-l4-e2', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c6-l4', tags: ['K', '回撤'],
    question: '本节实测：A 的 MDD ______%、水下占比 ______%、最长连续水下 ______ 天；等权 MDD −13.84%、水下占比 93%、最长连续水下 ______ 天；动量 MDD −8.78%、水下占比 82%、最长连续水下 180 天。',
    blanks: [['-37.23', '−37.23'], ['98'], ['1081'], ['464']],
    explanation: 'A 有 98% 的交易日在水下（五年里只有 22 天在历史新高），这是「长期套牢」而非投资。等权 93%/464 天，动量 82%/180 天。深度与宽度必须一起报。',
  },
  {
    id: 'quant-xquant-c6-l4-e3', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c6-l4', tags: ['U', '回撤'],
    question: '回撤 −50% 之后，只要涨 50% 就能回本。',
    answer: false,
    explanation: '跌 50% 需要涨 100% 才回本。回本所需涨幅 = 1/(1−MDD) − 1，是凸函数：−10% → +11.1%；−20% → +25%；−30% → +42.9%；−50% → +100%。这是最常见的算术错误。',
  },
  {
    id: 'quant-xquant-c6-l4-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c6-l4', tags: ['U', '回撤'],
    question: '下列哪些属于「回撤的宽度」指标？',
    options: [
      { value: 'a', text: '水下交易日占比' },
      { value: 'b', text: '最长连续水下天数' },
      { value: 'c', text: '从最深点恢复到前高所需的天数' },
      { value: 'd', text: '最大回撤（MDD）的数值' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 是「深度」指标（单点）。a/b/c 都是「区间」指标：多少时间在亏、最久一次多久、最惨之后多久回本。深度 + 宽度才是完整的回撤体检。',
  },
  {
    id: 'quant-xquant-c6-l4-e5', type: 'code', difficulty: 3,
    relatedLessonId: 'quant-xquant-c6-l4', tags: ['D', '回撤'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `dd_report(r)`：返回 dict，含 `mdd`（%、负数）、`under_ratio`（水下交易日占比，%）、`longest`（最长连续水下天数）、`recovery`（从最深点回到此前最高净值所需天数，若未恢复返回 None）。',
    starterCode: `
def dd_report(r):
    pass

s, _ = simulate(EW, freq=21)
d = dd_report(s)
print(round(d["mdd"], 2), round(d["under_ratio"]), d["longest"], d["recovery"])`,
    expectedOutput: '-13.84 93 464 356',
    tests: `
s, _ = simulate(EW, freq=21)
d = dd_report(s)
assert abs(d["mdd"] - (-13.84)) < 0.2, f"MDD 应约 -13.84%，实际 {d['mdd']}"
assert abs(d["under_ratio"] - 93) < 2, f"水下占比应约 93%，实际 {d['under_ratio']}"
assert d["longest"] == 464, f"最长连续水下应为 464 天，实际 {d['longest']}"
assert d["recovery"] == 356, f"恢复天数应为 356，实际 {d['recovery']}"

dm = dd_report(RET.A)
assert abs(dm["mdd"] - (-37.23)) < 0.3, f"A 的 MDD 应约 -37.23%"
assert dm["longest"] == 1081, f"A 最长连续水下应为 1081 天，实际 {dm['longest']}"`,
    answer: `
def dd_report(r):
    eq = (1 + r).cumprod()
    uw = eq / eq.cummax() - 1
    mdd = uw.min() * 100
    t = uw.idxmin()
    under = int((uw < -1e-12).sum())
    longest = cur = 0
    for v in uw.values:
        if v < -1e-12:
            cur += 1
            if cur > longest: longest = cur
        else:
            cur = 0
    peak_before = eq.loc[:t].max()
    after = eq.loc[t:]
    back = after[after >= peak_before]
    rec = (len(after.loc[:back.index[0]]) - 1) if len(back) else None
    return {"mdd": mdd, "under_ratio": under / len(r) * 100,
            "longest": longest, "recovery": rec}`,
    explanation: '三个易错点：① 水下判定要用 `uw < -1e-12`（浮点误差，不能直接 `< 0`）；② 最长连续水下要「遇到非负就清零」；③ 恢复天数从「最深点那天」开始算，参照的是「最深点之前」的最高净值（`eq.loc[:t].max()`），不是全期最高。',
  },
  {
    id: 'quant-xquant-c6-l4-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c6-l4', tags: ['U', '回撤'],
    question: '等权最深回撤 −13.84% 用了 443 天恢复，而 −5.85% 那次只用了 63 天。深度是 2.37 倍，恢复时间是 7.03 倍。原因是什么？',
    options: [
      { value: 'a', text: '回本所需涨幅是 MDD 的凸函数（−13.84% 要涨 16.06%，−5.85% 只要涨 6.21%），且大跌后往往进入低波动磨底期' },
      { value: 'b', text: '因为 2021 年的数据质量更差' },
      { value: 'c', text: '因为恢复天数的计算有 bug' },
      { value: 'd', text: '因为深回撤总是发生在年初' },
    ],
    answer: 'a',
    explanation: '「跌得深 + 涨得慢」的双重打击：① 回本所需涨幅 1/(1−MDD)−1 是凸函数；② 大跌后市场通常进入低波动磨底，涨得更慢。两者叠加让恢复时间远超深度比。',
  },
  {
    id: 'quant-xquant-c6-l4-e7', type: 'fill', difficulty: 3,
    relatedLessonId: 'quant-xquant-c6-l4', tags: ['K', '回撤'],
    question: '等权的 7 次 >3% 回撤事件，恢复天数：中位数 ______ 天、均值 ______ 天、最长 ______ 天。均值是中位数的 ______ 倍，说明分布被少数长恢复拉偏了。',
    blanks: [['63'], ['132'], ['443'], ['2.1', '2.10']],
    explanation: '11/26/56/63/74/249/443 天。均值 132、中位数 63。只看均值会低估尾部（最长 443 天），只看中位数会低估风险。正确做法：同时报中位数与最大值。',
  },
  {
    id: 'quant-xquant-c6-l4-e8', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c6-l4', tags: ['U', '综合'],
    question: '用止损把 MDD 从 −13.84% 压到 −9.81%，就说明这个止损规则改善了持有体验。',
    answer: false,
    explanation: '第 5 章实测：参照峰值的 5% 止损把 MDD 从 −13.84% 压到 −9.81%，但收益从 +41.69% 崩到 −5.66%，触发 61 次。频繁空仓后要等再平衡日才买回，水下时间反而可能变长。减小深度可能以延长宽度为代价。',
  },
  {
    id: 'quant-xquant-c6-l4-e9', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c6-l4', tags: ['D', '研究设计'],
    question: '一个策略的 MDD 是 −12%，看起来可以接受。请回答：\n① 你还要问哪三个宽度指标？为什么？\n② 用本节数据说明「MDD 相同但体验可以差很远」；\n③ 如果客户说「我最多能忍受 2 年不赚钱」，你会怎么用本节指标做判断？\n④ 设计一个实验，检验「减小 MDD 是否真的改善了体验」。',
    referenceAnswer: `
① 要问的三个宽度指标：
1. **水下交易日占比**：有多少时间在亏？决定「打开账户时的心情」；
2. **最长连续水下天数**：最久一次熬多久？决定「会不会在最低点放弃」；
3. **恢复天数（中位数 + 最大值）**：最惨之后多久回本？决定「资金被占用多久」。
理由：MDD 是单点，可以被一次极端事件决定；这三个是区间，反映常态。

② MDD 相同但体验不同的例子（本节实测）：
- 等权 MDD −13.84%，水下占比 93%、最长连续水下 464 天、恢复 356 天；
- 动量 MDD −8.78%，水下占比 82%、最长连续水下 180 天、恢复 153 天。
两者 MDD 只差 1.58 倍，但「最长连续水下」差 2.6 倍、「恢复天数」差 2.3 倍。如果有一个策略 MDD 也是 −12% 但水下占比 60%、最长水下 90 天，它的持有体验会远好于 MDD −10% 但水下 3 年的策略。

③ 用「最长连续水下」直接对比客户的容忍度：
- 客户容忍「2 年不赚钱」≈ 500 个交易日；
- 等权最长连续水下 464 天 < 500 天 → **勉强在容忍范围内**；
- A 最长连续水下 1081 天 → **远超容忍度**，不该推荐；
- 动量 180 天 → 安全余量大。
补充：还要看「恢复天数」与「水下占比」——如果 93% 时间在水下，即使最长只有 464 天，日常体验也很差。

④ 检验「减小 MDD 是否改善体验」的实验（≥5 步）：
1. **选定干预**：例如加 5% 止损（参照建仓价）；
2. **同时报四个指标**：MDD、水下占比、最长连续水下、恢复天数（不能只看 MDD）；
3. **对照组**：不加干预的同一策略，同一区间、同一口径；
4. **检查收益代价**：MDD 改善了多少 pp，收益下降了多少 pp（第 5 章：MDD −13.84%→−13.69%，收益 +41.69%→+41.93%，这是双赢的特例）；
5. **检查换手与成本**：止损引入的额外换手（第 5 章：换手从 1.3 升到 3.4）；
6. **结论判据**：只有当「宽度指标也改善」且「收益未显著下降」时，才能说改善了体验。若 MDD 下降但水下时间变长，是「用更长的时间换更浅的坑」——未必是改善。`,
    rubric: [
      { point: '① 三个宽度指标齐全（水下占比 / 最长水下 / 恢复天数）', score: 3 },
      { point: '② 用本节等权与动量的具体数字对比', score: 3 },
      { point: '③ 用「最长连续水下 464 天 vs 容忍 500 天」做量化判断', score: 2 },
      { point: '④ 至少 5 步，含「同时报四个指标」与「对照组」', score: 3 },
      { point: '④ 指出「MDD 下降但水下变长」不是改善', score: 2 },
    ],
    keywords: ['水下占比', '最长连续水下', '恢复天数', 'MDD', '对照组', '换手'],
    explanation: '评分重点在①与④。第①问考「知不知道 MDD 是单点」，第④问考「会不会用宽度指标反过来检验干预措施」——这正是第 5 章止损实验的正确评估方式。',
  },
  {
    id: 'quant-xquant-c6-l4-e10', type: 'single', difficulty: 4,
    relatedLessonId: 'quant-xquant-c6-l4', tags: ['U', '综合'],
    question: '本节 A 的水下占比是 98%（五年里只有 22 天在历史新高）。这个数字最直接的含义是？',
    options: [
      { value: 'a', text: '任意挑一天打开账户，有 98% 的概率是亏的——这是「长期套牢」而非投资' },
      { value: 'b', text: 'A 的收益率计算有误' },
      { value: 'c', text: 'A 的波动率一定很低' },
      { value: 'd', text: 'A 应该在 98% 的日子里加仓' },
    ],
    answer: 'a',
    explanation: '水下占比直接对应持有者的心理状态。A 的 MDD 是 −37.23%、波动 11.01%（比等权高），水下占比 98%——三项都指向「承担了高风险、长期被套、几乎从未创新高」。这是最该避免的组合。',
  },

  /* ═══════════ l5：参数敏感性（13 题）═══════════ */
  {
    id: 'quant-xquant-c6-l5-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c6-l5', tags: ['K', '参数'],
    question: '「高原型」与「山峰型」参数曲面的区别是？',
    options: [
      { value: 'a', text: '高原是一大片区域同高（任取皆可），山峰是唯一高点且四周陡降（选中大概率是噪声）' },
      { value: 'b', text: '高原是横轴、山峰是纵轴' },
      { value: 'c', text: '两者没有区别' },
      { value: 'd', text: '高原只在牛市出现' },
    ],
    answer: 'a',
    explanation: '高原意味着「参数不敏感」，选哪个都行，是稳健的信号；山峰意味着「最优是孤立的」，你选中的很可能是恰好适配了这段数据的噪声。第 2 章的「锯齿」比山峰更糟（相邻参数毫无关联）。',
  },
  {
    id: 'quant-xquant-c6-l5-e2', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c6-l5', tags: ['K', '参数'],
    question: '本节动量参数曲面（mom × vol）的夏普极差 ______；沿 vol 轴极差只有 ______（不敏感），沿 mom 轴极差 ______（极度敏感）。对照组等权再平衡频率的极差只有 ______。',
    blanks: [['1.52'], ['0.15'], ['1.48'], ['0.07']],
    explanation: '动量曲面 21 点极差 1.52；vol 轴（行内）很平（0.15），mom 轴（列内）陡（1.48）。对照组等权频率极差 0.07——相差 22 倍，这是判断「山峰」最有力的证据。',
  },
  {
    id: 'quant-xquant-c6-l5-e3', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c6-l5', tags: ['U', '参数'],
    question: '参数扫描的步长越细，找到的「最优参数」越可信。',
    answer: false,
    explanation: '步长越细，你「撞上运气」的机会越多，最优值会更好看，但过拟合更严重。第 2 章已演示（24 个参数 → 116 个参数会让冠军更亮眼但更不可信）。本节实测相邻步长 5 天的夏普最大差 0.728，说明更细的步长只是在拟合噪声。',
  },
  {
    id: 'quant-xquant-c6-l5-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c6-l5', tags: ['U', '参数'],
    question: '判断一块参数曲面是「高原」还是「山峰」，可以用哪些判据？',
    options: [
      { value: 'a', text: '极差（max − min）是否足够小' },
      { value: 'b', text: '相邻参数的平均绝对差（邻域平滑度）' },
      { value: 'c', text: '与一个「本该不敏感」的对照组比较（本节用等权频率）' },
      { value: 'd', text: '最优点的绝对值是否足够高' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 恰恰是最容易骗人的——山峰的顶点绝对值最高。判断的是「形态」而不是「高度」。三个判据从幅度、局部平滑度、外部校准三个角度互补。',
  },
  {
    id: 'quant-xquant-c6-l5-e5', type: 'code', difficulty: 4,
    relatedLessonId: 'quant-xquant-c6-l5', tags: ['D', '参数'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `sensitivity(mom_wins, vol_win=20, freq=21)`：对每个动量窗口跑动量策略，返回 dict，含 `grid`（{mom: 夏普}）、`range`（极差）、`adj_mean`（相邻参数的平均绝对差）、`adj_max`（相邻最大绝对差）、`best`（最优 mom）。',
    starterCode: `
def sensitivity(mom_wins, vol_win=20, freq=21):
    pass

GRID = list(range(5, 81, 5))          # 5 ~ 80，步长 5，共 16 个点
d = sensitivity(GRID)
print(round(d["range"], 2), round(d["adj_mean"], 3), round(d["adj_max"], 3), d["best"])`,
    expectedOutput: '1.63 0.198 0.728 20',
    tests: `
GRID = list(range(5, 81, 5))
d = sensitivity(GRID)
assert len(d["grid"]) == 16, f"应有 16 个点，实际 {len(d['grid'])}"
assert abs(d["range"] - 1.63) < 0.06, f"极差应约 1.63，实际 {d['range']}"
assert abs(d["adj_mean"] - 0.198) < 0.03, f"相邻平均差应约 0.198，实际 {d['adj_mean']}"
assert abs(d["adj_max"] - 0.728) < 0.05, f"相邻最大差应约 0.728，实际 {d['adj_max']}"
assert d["best"] == 20, f"最优 mom 应为 20，实际 {d['best']}"
assert abs(d["grid"][20] - 2.82) < 0.03, f"mom=20 的夏普应约 2.82，实际 {d['grid'][20]}"
assert d["range"] > 1.0, "这块曲面应被判为山峰（极差 > 1.0）"

# 粗网格（7 点）的相邻差更大——步长越粗，越容易漏掉细节
d7 = sensitivity([5, 10, 15, 20, 30, 40, 60])
assert d7["adj_mean"] > d["adj_mean"], "粗网格的相邻差应更大（跨度大）"

# 对照组：等权频率的极差应该很小
import numpy as _np
ew = []
for f in (21, 42, 63, 126):
    s, _ = simulate(EW, freq=f)
    m = metrics(s)
    ew.append(m["ann"] / m["vol"])
assert max(ew) - min(ew) < 0.1, "等权频率轴应为高原（极差 < 0.1）"`,
    answer: `
${MOM_FN}
def sh(r):
    m = metrics(r)
    return m["ann"] / m["vol"] if m["vol"] > 1e-12 else float("nan")

def sensitivity(mom_wins, vol_win=20, freq=21):
    grid = {m: sh(mom_ret(m, vol_win, freq)) for m in mom_wins}
    vals = np.array([grid[m] for m in mom_wins])
    adj = np.abs(np.diff(vals))
    return {"grid": grid, "range": float(vals.max() - vals.min()),
            "adj_mean": float(adj.mean()), "adj_max": float(adj.max()),
            "best": max(grid, key=grid.get)}`,
    explanation: '注意三点：① 极差用 `vals.max() - vals.min()`（不是标准差）；② 相邻差必须按 mom_wins 的给定顺序算（`np.diff`），顺序乱了结果就错；③ 返回值里同时给 `adj_mean` 与 `adj_max`——均值反映整体平滑度，最大值反映最陡的那一跳（本节 0.728 出现在 15→20）。**步长会改变相邻差**：16 个点（步长 5）的相邻平均差 0.198，而 7 个点（步长 10-20）是 0.4515——粗网格的「相邻」跨度更大，数字不可混用。',
  },
  {
    id: 'quant-xquant-c6-l5-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c6-l5', tags: ['U', '参数'],
    question: '本节动量曲面沿 vol 轴（波动率窗口）极差只有 0.15，沿 mom 轴极差 1.48。这说明？',
    options: [
      { value: 'a', text: '波动率窗口这个参数是稳健的（可放心取任一个），动量窗口是敏感的（不可精调）' },
      { value: 'b', text: '两个参数都不可用' },
      { value: 'c', text: '波动率窗口应该取最大值' },
      { value: 'd', text: '说明动量窗口的计算有误' },
    ],
    answer: 'a',
    explanation: '参数敏感性要「逐维」判断，不能整体打一个标签。本节：vol 轴极差 0.15（高原，任取皆可）、mom 轴极差 1.48（山峰，不可精调）。这个区分直接决定了后续怎么用这两个参数。',
  },
  {
    id: 'quant-xquant-c6-l5-e7', type: 'fill', difficulty: 3,
    relatedLessonId: 'quant-xquant-c6-l5', tags: ['K', '参数'],
    question: '沿 mom 轴加密（步长 5，vol=20）：极差 ______；相邻步长的平均绝对差 ______；相邻最大绝对差 ______（出现在 mom=15 → 20，从 2.10 跳到 2.82）。',
    blanks: [['1.63'], ['0.198'], ['0.728']],
    explanation: '「相邻参数只差 5 个交易日，夏普能差 0.728」是本节最重要的量化事实——它意味着你的研究结论会因参数恰好落在哪里而相差 34%，与策略逻辑无关。',
  },
  {
    id: 'quant-xquant-c6-l5-e8', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c6-l5', tags: ['U', '看图'],
    question: '看参数敏感性图时，应该让每张图各自自适应 y 轴，这样细节更清楚。',
    answer: false,
    explanation: '自适应 y 轴会把小波动放大成大趋势。本节：动量极差 1.63、等权极差 0.07（相差 23 倍），但自适应 y 轴后两张图看起来「波动差不多」。**看参数敏感性图，第一件事是检查/统一 y 轴范围。**',
  },
  {
    id: 'quant-xquant-c6-l5-e9', type: 'single', difficulty: 4,
    relatedLessonId: 'quant-xquant-c6-l5', tags: ['U', '综合'],
    question: '发现动量策略的参数敏感性过高（山峰型）之后，本课程推荐的做法是？',
    options: [
      { value: 'a', text: '取一个逻辑上说得通的参数（如 20 天 ≈ 一个月），并明确标注「参数敏感性过高、该选择不可信」' },
      { value: 'b', text: '取回测最高的那一个，因为数据不会骗人' },
      { value: 'c', text: '把步长缩到 1，找到真正的最优' },
      { value: 'd', text: '放弃这个策略，因为它一定无效' },
    ],
    answer: 'a',
    explanation: 'b 是纯样本内最大化（过拟合）；c 会让过拟合更严重（更多次撞运气）；d 过强——参数敏感只说明「在这段样本上参数不可信」，不等于「策略无效」（需要第 7 章样本外检验）。a 是诚实的做法：取逻辑自然的参数 + 标注不确定性。',
  },
  {
    id: 'quant-xquant-c6-l5-e10', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c6-l5', tags: ['D', '研究设计'],
    question: '你扫了一个策略的两个参数，得到 5×5 = 25 个点，最好的是夏普 1.85，最差 0.42。请回答：\n① 用本节三个判据判断这块曲面能不能用来选参数（缺数据就说明还缺什么）；\n② 你会怎么设计「对照组」来校准判据阈值？\n③ 如果结论是山峰型，写出三条具体的后续动作；\n④ 用一句话写出你的最终结论（必须包含不确定性）。',
    referenceAnswer: `
① 三个判据的判定：
- **判据 1 极差**：1.85 − 0.42 = **1.43**。本节合格线是 < 0.3 个夏普单位 → **不合格**（远超阈值）；
- **判据 2 邻域平滑度**：需要知道 25 个点的排列顺序才能算「相邻差」。若只能拿到「最好/最差」两个数，**还缺整张曲面表**（这正是「必须保留完整结果表」的原因）；
- **判据 3 对照组**：还缺一个「本该不敏感」的参数扫描。可以用同一策略的再平衡频率（本节实测等权频率极差 0.07），或用「等权 + 同参数」作对照。
结论（在现有数据下）：极差 1.43 已经足以判为山峰型，但完整判定还需要补判据 2 与 3。

② 对照组设计：
- **思路**：找一个「理论上不应该影响结果」的参数（例如再平衡频率在 21~126 天之间、或一个只影响计算细节不影响经济含义的参数）；
- **做法**：用完全相同的评估流程（同一区间、同一指标、同一步长密度）扫一遍，得到它的极差 $R_{\\text{ctrl}}$；
- **校准**：如果目标曲面的极差是 $R_{\\text{ctrl}}$ 的 5 倍以上，判为山峰。本节动量 1.52 / 等权 0.07 ≈ 22 倍，远超 5 倍阈值。
- 好处：阈值不再靠拍脑袋，而是由数据自身校准。

③ 山峰型的三条后续动作：
1. **停止精调**：取一个逻辑自然的参数（如动量 20 天 ≈ 一个月、波动率 20 天 ≈ 一个月），在报告里明确写「参数敏感性过高（极差 1.43），该取值不代表最优」；
2. **改用稳健目标**：把选优指标从「自己的夏普」改成「邻域内最差夏普」（稳健优化），看最优参数是否移动。如果移动很大，进一步确认原最优点是噪声；
3. **上样本外检验**：按时间 60/40 切分或做 Walk-forward，验证「在样本内选的参数」在样本外的表现（第 7 章）。

④ 最终结论示范：
「在这段样本上，该策略的参数曲面极差达 1.43 个夏普单位（对照组仅 0.07），属典型山峰型；因此样本内最优参数（夏普 1.85）不可作为长期取值，我们选择逻辑自然的参数并标注该选择的不确定性，后续以样本外检验为准。」`,
    rubric: [
      { point: '① 算出极差 1.43 并按本节阈值判为不合格', score: 2 },
      { point: '① 指出还缺「完整曲面表」与「对照组」', score: 3 },
      { point: '② 对照组设计有具体做法（同流程、同密度、同区间）', score: 3 },
      { point: '② 提出「5 倍」这类可操作的阈值', score: 2 },
      { point: '③ 三条动作含「停止精调」「稳健目标」「样本外」', score: 3 },
      { point: '④ 结论明确包含不确定性表述', score: 2 },
    ],
    keywords: ['极差', '邻域平滑度', '对照组', '山峰', '稳健优化', '样本外', '不确定性'],
    explanation: '评分重点在②与④。第②问考「会不会用对照组校准阈值」（这是本节最可复用的方法），第④问考「敢不敢在结论里写不确定性」。两者都是从「会算」到「会做研究」的标志。',
  },
  {
    id: 'quant-xquant-c6-l5-e11', type: 'code', difficulty: 3,
    relatedLessonId: 'quant-xquant-c6-l5', tags: ['D', '参数'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `classify_surface(values, ctrl_range, range_thr=0.3, adj_thr=0.1, ratio_thr=5.0)`：`values` 是按参数顺序排列的指标列表，`ctrl_range` 是对照组的极差。返回 `(判定, 诊断dict)`，判定为 `"高原"` / `"山峰"` / `"锯齿"` 之一。规则：极差 < range_thr → "高原"；否则若相邻平均差 > adj_thr 或 极差/ctrl_range > ratio_thr → "山峰"；两者都不满足 → "高原"。',
    starterCode: `
def classify_surface(values, ctrl_range, range_thr=0.3, adj_thr=0.1, ratio_thr=5.0):
    pass

print(classify_surface([0.86, 0.87, 0.87, 0.89, 0.90, 0.93, 0.87], 0.07))
print(classify_surface([1.87, 2.23, 2.10, 2.82, 2.49, 2.22, 1.34], 0.07))`,
    expectedOutput: '高原 / 山峰',
    tests: `
v_flat = [0.86, 0.87, 0.87, 0.89, 0.90, 0.93, 0.87]
lab, diag = classify_surface(v_flat, 0.07)
assert lab == "高原", f"等权频率应判为高原，实际 {lab}"
assert abs(diag["range"] - 0.07) < 0.01

v_peak = [1.87, 2.23, 2.10, 2.82, 2.49, 2.22, 1.34]
lab2, diag2 = classify_surface(v_peak, 0.07)
assert lab2 == "山峰", f"动量曲面应判为山峰，实际 {lab2}"
assert abs(diag2["range"] - 1.48) < 0.02, f"极差应约 1.48，实际 {diag2['range']}"
assert diag2["ratio"] > 5, "极差/对照组应远大于 5"

# 极差大但邻域平滑（比如单调下降）→ 按规则仍判山峰（因为 ratio 超阈值）
v_mono = [2.8, 2.6, 2.4, 2.2, 2.0, 1.8, 1.6]
lab3, diag3 = classify_surface(v_mono, 0.07)
assert lab3 == "山峰", f"极差 1.2、比值 17 倍，应判山峰，实际 {lab3}"
assert diag3["adj_mean"] < 0.25, "单调下降的相邻差应较小"`,
    answer: `
def classify_surface(values, ctrl_range, range_thr=0.3, adj_thr=0.1, ratio_thr=5.0):
    v = np.asarray(values, dtype=float)
    rng = float(v.max() - v.min())
    adj_mean = float(np.abs(np.diff(v)).mean())
    ratio = rng / ctrl_range if ctrl_range > 1e-12 else float("inf")
    diag = {"range": rng, "adj_mean": adj_mean, "ratio": ratio,
            "best_idx": int(np.argmax(v)), "worst_idx": int(np.argmin(v))}
    if rng < range_thr:
        return "高原", diag
    if adj_mean > adj_thr or ratio > ratio_thr:
        return "山峰", diag
    return "高原", diag`,
    explanation: '三个判据的组合逻辑：先看极差（太小直接判高原），再看邻域平滑度与对照比值（任一超标判山峰）。注意 `ratio` 要做零除保护——对照组极差可能是 0。诊断 dict 里保留 best_idx/worst_idx，方便后续定位「最高点在哪、它的邻居多差」。',
  },
  {
    id: 'quant-xquant-c6-l5-e12', type: 'judge', difficulty: 4,
    relatedLessonId: 'quant-xquant-c6-l5', tags: ['U', '综合'],
    question: '参数敏感性过高说明这个策略是无效的。',
    answer: false,
    explanation: '参数敏感只说明「在这段样本上，参数选择不可信」，不等于「策略无效」。可能是样本太短（1300 天里 20 天动量恰好适配了某段走势）。要区分「参数不可信」与「策略无效」，必须做样本外检验（第 7 章）与滚动验证（第 8 章）。',
  },
  {
    id: 'quant-xquant-c6-l5-e13', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c6-l5', tags: ['D', '综合'],
    question: '请把本章四个视角（基准 / 逐年 / 分布 / 回撤）与第 5 节的参数敏感性，压缩成一份「策略体检表」（不超过 12 行）。要求：每行 = 一个检查项 + 本节实测的一个数字 + 一条判据（合格/不合格的信号）。',
    referenceAnswer: `
策略体检表（12 行）：

| # | 检查项 | 本节实测数字 | 判据 |
| --- | --- | --- | --- |
| 1 | 基准是否指明（三层次） | 等权 +41.69% 对 A +40.94 pp、对 B −63.31 pp | 不合格：只报绝对收益、不写基准名 |
| 2 | 相对收益单位 | 同一策略三种结论（+40.94 / −63.31 / +13.35 pp） | 不合格：用「跑赢 X%」这种比值 |
| 3 | 规则是否加分（第三层） | 21 日再平衡 41.69% vs 不再平衡 44.69%（−3.01 pp） | 不合格：从不和「不加规则」比 |
| 4 | 逐年明细 | 等权 −3.29 / +0.05 / +2.74 / +19.96 / +18.81 | 不合格：只报年均 |
| 5 | 均值 vs 中位数 | A 均值 +1.85%、中位数 −9.40%（符号相反） | 不合格：两符号相反还报年均 |
| 6 | 正收益期数 | A 6/10、等权 8/10、动量 9/10（半年） | 不合格：< 60% 却说「稳定」 |
| 7 | 普跌段表现 | A −32.24%、等权 −0.59%、动量 +61.88% | 不合格：只报上涨段 |
| 8 | 胜率 + 盈亏比 | 等权 52.5%/1.04；动量 48.9%/1.18；A 50.9%/0.88 | 不合格：只报胜率、不报盈亏比 |
| 9 | 胜率口径 | 动量 48.9%（含空仓日）或 57.2%（剔除），差 8.3 pp | 不合格：不写分母与粒度 |
| 10 | 回撤深度 + 宽度 | 等权 −13.84% / 93% / 464 天 / 恢复 356 天 | 不合格：只报 MDD |
| 11 | 恢复天数分布 | 等权 7 次事件：中位数 63、均值 132、最长 443 天 | 不合格：只报均值 |
| 12 | 参数敏感性 | 极差 1.52、相邻最大差 0.728、对照 0.07（22 倍） | 不合格：只报最优点、不报邻居 |

使用说明：
- 12 行里只要有 1 行填不出来，这份报告就不能发布；
- 第 1-3 行属于「基准层」，第 4-7 行属于「时间层」，第 8-9 行属于「分布层」，第 10-11 行属于「回撤层」，第 12 行属于「稳健层」——五层齐全才算完整；
- 每一行的判据都是「不合格信号」，不是「合格标准」——因为判断不合格比判断合格容易得多，也更少漏判。`,
    rubric: [
      { point: '至少 10 行，且覆盖基准 / 逐年 / 分布 / 回撤 / 参数敏感性五层', score: 4 },
      { point: '每行都有本节的具体数字（不是泛泛而谈）', score: 3 },
      { point: '每行都有「不合格信号」这类可判定的判据', score: 3 },
      { point: '含「基准未指明」「只报胜率」「只报 MDD」「只报最优点」四个本章核心陷阱', score: 2 },
    ],
    keywords: ['基准', 'pp', '逐年', '中位数', '胜率', '盈亏比', 'MDD', '水下', '参数敏感性', '极差'],
    explanation: '这道题要求把知识转成流程。判断标准：每一行是否能让一个没读过本章的人「照着填表」。如果某一行读起来像「要注意风险」，它就不合格。',
  },
];

export const quantXquantC6ExercisesAll = quantXquantC6Exercises;
