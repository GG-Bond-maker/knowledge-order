import type { Exercise } from '../../../types';

/* c9 习题：难度 3/4/4/2 → 10/13/13/8，共 44 题。 */

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

export const quantXquantC9Exercises: Exercise[] = [
  /* ═══════════ l1：三指标仪表盘（10 题）═══════════ */
  {
    id: 'quant-xquant-c9-l1-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c9-l1', tags: ['K', '监控'],
    question: '「策略是不是坏了」这个问题的正确提法是？',
    options: [
      { value: 'a', text: '它的风险调整后表现是否已持续偏离预期' },
      { value: 'b', text: '这个月是不是亏钱了' },
      { value: 'c', text: '今天是不是跑输了沪深300' },
      { value: 'd', text: '净值有没有创新高' },
    ],
    answer: 'a',
    explanation: '本节实测：5 年里 32% 的时间滚动夏普为负、41% 的时间跑输基准。所以「亏钱」「跑输」都不是有效信号。有效提法必须含三个要素：风险调整后（夏普）、偏离预期（回撤）、持续了足够久（滚动窗口 + 最短天数）。',
  },
  {
    id: 'quant-xquant-c9-l1-e2', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c9-l1', tags: ['K', '监控'],
    question: '本节三指标仪表盘：滚动夏普最低 ______（2021-04-28）、63 日滚动回撤最低 ______%、相对基准 63 日变化最低 ______%。',
    blanks: [['-5.26', '−5.26'], ['-9.33', '−9.33'], ['-7.92', '−7.92']],
    explanation: '这三个极值都出现在同一段困难期附近（2021 年上半年、2021 年 11 月），说明三个指标确实是同步恶化的——但极端值本身不是告警，告警要看「是否持续」。',
  },
  {
    id: 'quant-xquant-c9-l1-e3', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c9-l1', tags: ['U', '监控'],
    question: '把「滚动夏普 < 0」单独作为告警条件就够了。',
    answer: false,
    explanation: '本节实测：滚动夏普 < 0 的天数有 415 天，占 32%——等于三分之一的日子都在告警。必须加「持续 ≥ 20 个交易日」这个条件（过滤瞬时跌破），并且最好配合其他两个指标（三指标同时恶化只有 6 天，占 0.5%）。',
  },
  {
    id: 'quant-xquant-c9-l1-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c9-l1', tags: ['U', '监控'],
    question: '告警四要素包括？',
    options: [
      { value: 'a', text: '触发（什么条件下报警）' },
      { value: 'b', text: '频率（多久检查一次、多久算一次告警）' },
      { value: 'c', text: '阈值（具体的数字）与输出（报警时输出什么）' },
      { value: 'd', text: '报警铃声的音量' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 是玩笑，但它点出一个真问题：告警的价值在于「可执行」。如果报警时你拿不到「起止日期、持续天数、段内均值」这三个输出，你还是要自己去查，那告警就没省下任何时间。',
  },
  {
    id: 'quant-xquant-c9-l1-e5', type: 'code', difficulty: 2,
    relatedLessonId: 'quant-xquant-c9-l1', tags: ['D', '监控'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `rolling_sharpe(r, w=63)`：返回滚动夏普 Series（年化均值/年化波动）。若某窗口内标准差为 0，返回 0.0（避免除零）。',
    starterCode: `
def rolling_sharpe(r, w=63):
    pass

s, _ = simulate(EW)
rs = rolling_sharpe(s)
print(round(rs.iloc[-1], 2), round(rs.min(), 2))`,
    expectedOutput: '1.41 -5.26',
    tests: `
s, _ = simulate(EW)
rs = rolling_sharpe(s)
assert isinstance(rs, pd.Series), "应返回 Series"
assert len(rs) == len(s), "长度应与输入一致"
assert rs.iloc[:62].isna().all(), "前 62 个应为 NaN（窗口不足）"
assert abs(rs.iloc[-1] - 1.41) < 0.02, f"末值应约 1.41: {rs.iloc[-1]}"
assert abs(rs.min() - (-5.26)) < 0.05, f"最低应约 -5.26: {rs.min()}"
assert abs(rs.max() - 7.25) < 0.05, f"最高应约 7.25: {rs.max()}"

# 常数序列：标准差为 0，应返回 0 而不是 nan/inf
flat = pd.Series([0.001] * 200)
r2 = rolling_sharpe(flat)
assert r2.iloc[-1] == 0.0, f"零波动应返回 0: {r2.iloc[-1]}"

# 窗口改小，极值范围应变宽（噪声更多）
r21 = rolling_sharpe(s, w=21)
assert r21.min() <= rs.min() + 0.5, "21 日窗口的最低值应更低或相近（噪声更大）"`,
    answer: `
def rolling_sharpe(r, w=63):
    return r.rolling(w).apply(
        lambda x: (x.mean() * 252) / (x.std() * np.sqrt(252)) if x.std() > 0 else 0.0,
        raw=True)`,
    explanation: '关键是 `raw=True`（性能）和「std 为 0 时返回 0」这个边界处理。少了边界处理，纯现金策略（波动为 0）会返回 inf 或 nan，告警逻辑会误判。另外注意年化：均值乘 252、标准差乘 √252。',
  },
  {
    id: 'quant-xquant-c9-l1-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c9-l1', tags: ['U', '监控'],
    question: '本节实测：`min_days` 从 20 降到 10，告警次数从 6 次变 9 次。这个参数的作用是？',
    options: [
      { value: 'a', text: '灵敏度旋钮：调它就是在调「你愿意被叫醒几次」' },
      { value: 'b', text: '决定告警的阈值高低' },
      { value: 'c', text: '决定滚动窗口的长度' },
      { value: 'd', text: '决定基准是什么' },
    ],
    answer: 'a',
    explanation: '阈值（如 0 或 0.5）决定「覆盖范围」（本节：阈值 0→0.5 使累计天数 341→405 天）；min_days 决定「灵敏度」（20→10 使告警 6→9 次）。两者是不同的旋钮。',
  },
  {
    id: 'quant-xquant-c9-l1-e7', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c9-l1', tags: ['D', '监控'],
    question: '你要为策略上线一套监控。请回答：\n① 写出完整的告警规格（四要素齐全，含具体数字）；\n② 说明你怎么选定阈值与 min_days（不能只说「用 0 和 20」，要说依据）；\n③ 列出至少 3 种「告警发出后你实际会做什么」，并说明为什么告警本身不是交易信号。',
    referenceAnswer: `
① 告警规格（四要素）：
- 【触发】63 日滚动夏普 < 0 且连续 ≥ 20 个交易日。
- 【频率】每日收盘后检查一次；同一段连续恶化只报一次（进入告警时报，解除时也报一次）。
- 【阈值】sharpe_threshold = 0.0、min_days = 20、window = 63。
- 【输出】段起止日期、持续天数、段内滚动夏普均值、同期滚动回撤、同期相对基准 63 日变化。
- 【附加】同时监控「三指标是否同时恶化」（夏普<0 且回撤<-5% 且 相对基准<0），这一档标记为「高危」。

② 阈值与 min_days 的选定依据：
- 先定「每年愿意被叫醒几次」：本节实测 0.0/20 给出 6 次/5 年 ≈ 1.2 次/年，符合「足够少所以每次值得看，足够多所以不会因陌生而慌」。
- 再做参数扫描：本节六组合（阈值 0/0.5 × min_days 10/20/40）显示，min_days=10 时告警 9 次（1.8 次/年，偏吵）；min_days=40 时 5 次（1.0 次/年，但可能漏掉短促的真实恶化）。20 是折中。
- 阈值选 0 而不是 0.5：0 对应「风险调整后不赚钱」，是一个有意义的语义边界；0.5 没有明确语义，且覆盖 405 天（31%），太宽。
- 窗口选 63（≈3 个月）：21 日太短（极值 −5.26~7.25，噪声主导），252 日太长（滞后）。

③ 告警后实际会做的事（≥3）：
1. **进入诊断流程**（第 2 节的三问）：先查执行落差是否平稳，再查市场状态，最后看策略本身。
2. **检查是否有外部事件**：数据源变了？券商费率改了？某笔大单成交异常？这些是「执行」层的具体排查。
3. **翻实验记录**：历史上同类告警段（本节 2021 年那段 75 天）后来是怎么恢复的？当时的应对是什么？
4. **什么都不做（也是一种动作）**：如果诊断结论是「市场状态问题，策略无应对方案」，且当前在容忍范围内，正确动作可能就是继续持有并记录。

为什么告警不是交易信号：
- 告警基于「过去 63 天」的信息，而市场已经反映了这些信息。按告警交易等于「在坏消息之后卖出」——这是典型的追跌。
- 本节实测：6 段告警里，2021 年那段（均值 −3.32）之后策略恢复并全年 +10.02%。如果按告警清仓，会错过恢复。
- 告警的价值是「触发一次结构化的思考」，而不是「触发一次交易」。`,
    rubric: [
      { point: '① 四要素齐全且含具体数字（触发/频率/阈值/输出）', score: 3 },
      { point: '① 额外给出「三指标同时恶化」的高危档定义', score: 2 },
      { point: '② 用「先定每年叫醒次数再反推参数」+ 参数扫描作为依据', score: 3 },
      { point: '② 说明窗口为什么选 63（21 太短、252 太长）', score: 2 },
      { point: '③ 至少 3 种告警后的动作，且明确「告警不是交易信号」的理由', score: 3 },
    ],
    keywords: ['触发', '频率', '阈值', '输出', 'min_days', '参数扫描', '诊断流程'],
    explanation: '评分重点在②——能不能说清「为什么是 0 和 20」而不是「书上都这么写」。参数必须有依据，否则调参就是拍脑袋。',
  },
  {
    id: 'quant-xquant-c9-l1-e8', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c9-l1', tags: ['U', '监控'],
    question: '滚动指标（如 63 日滚动回撤）能完全替代全期最大回撤。',
    answer: false,
    explanation: '本节实测：63 日滚动回撤最低只有 −9.33%，而全期最大回撤是 −13.84%。长期阴跌会被窗口滚动抹平——2022 年的下跌持续超过 63 天，滚动窗口「看不到」完整的坑。所以必须同时看全期回撤这个非滚动指标。',
  },
  {
    id: 'quant-xquant-c9-l1-e9', type: 'fill', difficulty: 3,
    relatedLessonId: 'quant-xquant-c9-l1', tags: ['K', '监控'],
    question: '本节实测：只看「滚动夏普 < 0」覆盖 ______ 天（占 32%）；加上「滚动回撤 < −5%」后剩 ______ 天；三项全满足只剩 ______ 天（0.5%）。',
    blanks: [['415'], ['124'], ['6']],
    explanation: '从 415 → 124 → 6，每加一个条件就过滤掉大量「假警报」。这组数字说明：单指标报警没有信息量，多指标交集才有。',
  },
  {
    id: 'quant-xquant-c9-l1-e10', type: 'single', difficulty: 4,
    relatedLessonId: 'quant-xquant-c9-l1', tags: ['U', '监控'],
    question: '本节实测告警段按年分布是 2021:1 / 2022:2 / 2023:1 / 2024:1 / 2025:1。这个分布说明？',
    options: [
      { value: 'a', text: '告警在各年都有出现，不是某一年特有的现象——符合「正常波动」而非「某年事故」' },
      { value: 'b', text: '2022 年策略坏了' },
      { value: 'c', text: '2021 年那段最差（均值 −3.32），说明 2021 年最糟' },
      { value: 'd', text: '告警分布均匀，说明告警规则无效' },
    ],
    answer: 'a',
    explanation: '如果告警全部集中在某一年，那要去查那一年发生了什么（事故）；均匀分布说明这是策略的常态特征。注意 c 的陷阱：2021 年那段段内均值最差（−3.32），但那一年策略整体是赚的（+10.02%）——段内均值不等于年度收益。',
  },

  /* ═══════════ l2：三问诊断（13 题）═══════════ */
  {
    id: 'quant-xquant-c9-l2-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c9-l2', tags: ['K', '诊断'],
    question: '本节的诊断顺序是？',
    options: [
      { value: 'a', text: '执行（外）→ 市场（中）→ 策略（内）' },
      { value: 'b', text: '策略（内）→ 市场（中）→ 执行（外）' },
      { value: 'c', text: '市场 → 执行 → 策略' },
      { value: 'd', text: '随便什么顺序都行' },
    ],
    answer: 'a',
    explanation: '顺序不能颠倒，因为「执行问题」会伪装成「市场问题」——成本超预期会让策略在所有市场状态下都变差。由外到内也是按「排除成本」排序：查执行最便宜（看几个数），查策略最贵。',
  },
  {
    id: 'quant-xquant-c9-l2-e2', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c9-l2', tags: ['K', '诊断'],
    question: '本节实测（等权基准）：理想回测 +41.70%、模拟交易 +41.54%，累计落差 ______pp；63 日滚动落差日变化标准差 ______%，说明落差平稳 → 排除执行。',
    blanks: [['0.16'], ['0.0013']],
    explanation: '落差只有 0.16pp 且几乎是一条水平线（日变 std 0.0013%），说明它是「持续收费」而非执行事故。对照：同样成本口径下动量策略落差 26.74pp。',
  },
  {
    id: 'quant-xquant-c9-l2-e3', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c9-l2', tags: ['U', '诊断'],
    question: '高波动市场状态是策略恶化的主要原因（对本节的等权多头策略而言）。',
    answer: false,
    explanation: '本节实测：按 21 日波动切三档，命中率分别是低 28% / 正常 27% / 高 25%，基线 26%——几乎没有区分度。真正有区分度的是趋势维度：下跌档命中率 83%（基线 26% 的 3.2 倍），上涨档 0%。',
  },
  {
    id: 'quant-xquant-c9-l2-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c9-l2', tags: ['U', '诊断'],
    question: '判断一个「市场状态变量」是否有效，需要看？',
    options: [
      { value: 'a', text: '该状态下落在恶化段的天数占比（命中率）' },
      { value: 'b', text: '与基线（全样本恶化段占比）的比较' },
      { value: 'c', text: '各状态下的收益与夏普是否单调可分' },
      { value: 'd', text: '这个变量在教科书上是否常见' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 是最容易犯的错——「波动分档」是常见做法，但本节实测它没有区分度（25-28% vs 基线 26%）。判断标准只能是数据：命中率是否显著高于基线、各档指标是否单调。',
  },
  {
    id: 'quant-xquant-c9-l2-e5', type: 'code', difficulty: 3,
    relatedLessonId: 'quant-xquant-c9-l2', tags: ['D', '诊断'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `regime_stats(r, signal, bad_mask, q=0.33)`：按 `signal` 的三分位切成「低/中/高」三档，返回 DataFrame（索引为 `["低", "中", "高"]`，列含 `days`、`mean_ret`（日均收益%）、`hit_rate`（该档中 bad_mask 为真的比例%））。',
    starterCode: `
def regime_stats(r, signal, bad_mask, q=0.33):
    pass

s, _ = simulate(EW)
mkt = (RET * EW).sum(axis=1)
mv = mkt.rolling(21).std() * np.sqrt(252) * 100
bad = pd.Series(False, index=s.index)
print(regime_stats(s, mv, bad))`,
    expectedOutput: '三行统计表（无恶化段时 hit_rate 全为 0）',
    tests: `
s, _ = simulate(EW)
mkt = (RET * EW).sum(axis=1)
mv = mkt.rolling(21).std() * np.sqrt(252) * 100
bad = pd.Series(False, index=s.index)
df = regime_stats(s, mv, bad)
assert list(df.index) == ["低", "中", "高"], f"索引应为 低/中/高: {list(df.index)}"
for c in ("days", "mean_ret", "hit_rate"):
    assert c in df.columns, f"缺列 {c}"
assert df["days"].sum() > 1000, f"三档天数之和应接近样本量: {df['days'].sum()}"
assert (df["hit_rate"] == 0).all(), "无恶化段时命中率应全为 0"

# 人为指定恶化段 = 高波动档，命中率应集中
thr = float(mv.quantile(0.67))
bad2 = (mv > thr).fillna(False)
df2 = regime_stats(s, mv, bad2)
assert df2.loc["高", "hit_rate"] > 90, f"恶化段设为高波动时，高档命中率应 > 90: {df2.loc['高','hit_rate']}"
assert df2.loc["低", "hit_rate"] < 10, f"低档命中率应 < 10: {df2.loc['低','hit_rate']}"`,
    answer: `
def regime_stats(r, signal, bad_mask, q=0.33):
    lo = float(signal.quantile(q))
    hi = float(signal.quantile(1 - q))
    masks = {"低": signal <= lo, "中": (signal > lo) & (signal <= hi), "高": signal > hi}
    rows = {}
    for name, mask in masks.items():
        mask = mask.fillna(False)
        sub = r[mask]
        rows[name] = {"days": int(mask.sum()),
                      "mean_ret": round(float(sub.mean()) * 100, 4),
                      "hit_rate": round(float((mask & bad_mask).sum()) / max(int(mask.sum()), 1) * 100, 1)}
    return pd.DataFrame(rows).T`,
    explanation: '这道题的核心是 `hit_rate` 的定义：**该档天数中落在恶化段的比例**，而不是「恶化段中有多少落在该档」（后者是「覆盖率」，两者回答不同问题）。判断状态变量有效性要用命中率，并与基线比较。',
  },
  {
    id: 'quant-xquant-c9-l2-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c9-l2', tags: ['U', '诊断'],
    question: '本节实测：趋势（63 日累计收益）三档的命中率是 83% / 1% / 0%，而波动三档是 28% / 27% / 25%（基线 26%）。这个对比说明？',
    options: [
      { value: 'a', text: '对只做多策略，收益的「方向」比「幅度」更能解释失效' },
      { value: 'b', text: '波动率指标算错了' },
      { value: 'c', text: '趋势指标有前视偏差' },
      { value: 'd', text: '两个指标都无效' },
    ],
    answer: 'a',
    explanation: '只做多策略在「大幅震荡但方向向上」时赚钱（波动大、趋势正），在「温和阴跌」时亏钱（波动小、趋势负）。所以方向（趋势）比幅度（波动）更能解释失效。这不是指标算错，而是它们衡量的是不同东西。',
  },
  {
    id: 'quant-xquant-c9-l2-e7', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c9-l2', tags: ['D', '诊断'],
    question: '某策略最近三个月滚动夏普从 1.2 掉到 −0.8。请回答：\n① 按本节的三问顺序，你依次会做什么检查（每步给出具体判据）；\n② 如果三问都做完了，结论是「下跌期 + 无应对方案」，你的下一步是什么？\n③ 如果第一步就发现执行落差突然从 0.5pp 跳到 5pp，你会怎么处理？',
    referenceAnswer: `
① 三问顺序与判据：
【问 1 执行】
- 动作：跑「理想回测（收盘价/零成本）」vs「模拟交易（次日开盘/含成本）」两条曲线。
- 判据：① 累计落差是否在预估范围内（如 < 2pp）；② 63 日滚动落差是否平稳（日变化标准差 < 0.1%，且无单日跳变 > 1pp）。
- 结论分流：落差平稳且在预估内 → 排除执行，进入问 2；落差有跳变或超预估 → 停在这里查执行（见③）。

【问 2 市场】
- 动作：用两个以上的状态变量切分样本（如 21 日波动三分位、63 日累计收益三分位）。
- 判据：**命中率 vs 基线**。基线 = 全样本恶化段占比。如果某档命中率显著高于基线（如 2 倍以上），这个变量有区分度；如果三档都在基线附近（如本节 25-28% vs 26%），换一个变量。
- 本节结论：波动无区分度（25-28%），趋势有区分度（下跌档 83%）。

【问 3 策略】
- 动作：前后两半各自做参数扫描（不同再平衡频率）。
- 判据：① 排序是否稳定（前半最优参数 vs 后半最优参数是否一致）；② 各频率的夏普是否在同向变化。
- 本节结论：等权全频率前负后正（−0.05~−0.01 → +1.76~+1.81），说明不是参数问题而是市场切换；动量最优参数从 42 天变成 21 天（反转）。

② 结论是「下跌期 + 无应对方案」时的下一步：
- 进入迭代（第 3 节）：写假设「下跌时降仓能改善回撤」+ 锁定成功标准（回撤改善≥30% 且 夏普不降 且 年化≥基准 80%）。
- 做单变量对照实验：趋势门槛 0/−3/−4/−5/−6/−8/−10% × 半仓/清仓。
- 检查参数曲线形态：是高原还是尖峰（本节是尖峰）。
- 结论标注「待样本外验证」，不用「已验证」。
- 记录进 ExperimentLog（六字段齐全）。

③ 如果第一步就发现落差从 0.5pp 跳到 5pp：
- **立刻停在执行层，不要往下走**。因为执行问题会污染所有后续分析——你在错误的数据上做市场诊断，结论必然错。
- 具体排查顺序：
  1. 看滚动落差曲线，找到跳变的具体日期（哪一天开始跳的）。
  2. 查那一天的成交明细：是不是某笔大单的成交价严重偏离？是不是涨跌停导致无法成交？
  3. 查成本参数是否与实际一致：券商费率改了吗？最低佣金 5 元有没有算进去？
  4. 查代码：有没有重复下单？有没有用错数据源？
  5. 查市场：那几天的流动性是否异常（成交量骤降、价差异常扩大）？
- 处理完后，重新跑一次「理想 vs 模拟」，确认落差回到预估范围，**再**回到问 2。`,
    rubric: [
      { point: '① 三问顺序正确，且每一步都给出可量化判据（不是「看看是否异常」）', score: 4 },
      { point: '① 问 2 明确指出用「命中率 vs 基线」，并说明无区分度时该换变量', score: 3 },
      { point: '② 给出「写假设 + 锁标准 + 单变量 + 看形态 + 标注待验证」的完整迭代路径', score: 3 },
      { point: '③ 明确「停在执行层、不要往下走」这个关键判断', score: 2 },
      { point: '③ 给出至少 3 项具体的执行排查动作', score: 1 },
    ],
    keywords: ['执行落差', '滚动落差', '命中率', '基线', '参数稳定性', '样本外'],
    explanation: '评分重点在③——能不能意识到「执行问题会污染后续所有分析」。很多人会跳过执行直接查市场，然后得出一个错误的结论，再基于错误结论改策略。',
  },
  {
    id: 'quant-xquant-c9-l2-e8', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c9-l2', tags: ['U', '诊断'],
    question: '如果前后两半的参数扫描显示「最优参数反转」（前半 42 天最好、后半 21 天最好），说明策略已经退化了。',
    answer: false,
    explanation: '本节实测：等权策略在所有频率上都是「前半段负夏普、后半段正夏普」（前半累计 −1.51%、后半 +43.87%），说明变化来自市场从下跌切到上涨，而不是策略逻辑退化。参数反转只说明「最优参数不稳定」，不说明策略坏了。',
  },
  {
    id: 'quant-xquant-c9-l2-e9', type: 'fill', difficulty: 3,
    relatedLessonId: 'quant-xquant-c9-l2', tags: ['K', '诊断'],
    question: '本节实测：按趋势切三档，下跌档命中率 ______%、上涨档 ______%，基线是 ______%。下跌档命中率是基线的约 3.2 倍。',
    blanks: [['83'], ['0'], ['26', '26%']],
    explanation: '「下跌档 83%」的意思是：在 63 日累计为负的那些天里，有 83% 落在恶化段中。而基线（任意一天属于恶化段的概率）只有 26%。这是本节最强的区分度证据。',
  },
  {
    id: 'quant-xquant-c9-l2-e10', type: 'multiple', difficulty: 4,
    relatedLessonId: 'quant-xquant-c9-l2', tags: ['U', '诊断'],
    question: '关于「市场状态」，下列说法正确的有？',
    options: [
      { value: 'a', text: '「市场状态」不是天然分类，而是需要检验的假设' },
      { value: 'b', text: '检验方法是看「命中率是否显著高于基线」' },
      { value: 'c', text: '同一个策略换一个状态变量，结论可能完全不同' },
      { value: 'd', text: '只要用了教科书上的状态划分（如高/中/低波动），就一定有效' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 是本节要破除的迷信。本节实测：教科书式的波动三分档命中率 25-28%，基线 26%——完全没有区分度。必须自己检验。',
  },
  {
    id: 'quant-xquant-c9-l2-e11', type: 'single', difficulty: 4,
    relatedLessonId: 'quant-xquant-c9-l2', tags: ['U', '诊断'],
    question: '本节为什么强调「先排执行」而不是「先查市场」？',
    options: [
      { value: 'a', text: '因为执行问题会让策略在所有市场状态下都变差，伪装成「市场问题」' },
      { value: 'b', text: '因为执行检查最容易做' },
      { value: 'c', text: '因为市场数据不可靠' },
      { value: 'd', text: '因为执行问题一定存在' },
    ],
    answer: 'a',
    explanation: 'b 是部分原因（查执行确实最便宜），但根本原因是 a：成本超预期会让所有状态下的表现都变差，于是你会得出「策略对所有市场都失效」的错误结论，进而错误地去重构策略。',
  },
  {
    id: 'quant-xquant-c9-l2-e12', type: 'code', difficulty: 4,
    relatedLessonId: 'quant-xquant-c9-l2', tags: ['D', '诊断'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `detect_bad(r, w=63, thr=0.0, min_days=20)`：返回 `(bad_mask, segments)`。`bad_mask` 是布尔 Series（True 表示该日在告警段内）；`segments` 是 list，每个元素为 `(起始日期, 结束日期, 天数)`。告警段定义：滚动夏普 < thr 且连续 ≥ min_days 个交易日。',
    starterCode: `
def detect_bad(r, w=63, thr=0.0, min_days=20):
    pass

s, _ = simulate(EW)
mask, segs = detect_bad(s)
print(len(segs), int(mask.sum()))`,
    expectedOutput: '6 340',
    tests: `
s, _ = simulate(EW)
mask, segs = detect_bad(s)
assert isinstance(mask, pd.Series) and mask.dtype == bool, "bad_mask 应为布尔 Series"
assert len(segs) == 6, f"应有 6 段告警: {len(segs)}"
assert abs(int(mask.sum()) - 340) <= 2, f"告警总天数应约 340（simulate 口径）: {int(mask.sum())}"
assert abs(sum(x[2] for x in segs) - int(mask.sum())) < 1e-9, "段天数之和应等于 mask 的 True 数量"
# 最长一段约 85 天
assert abs(max(x[2] for x in segs) - 85) <= 1, f"最长一段应约 85 天: {max(x[2] for x in segs)}"

# min_days 调小，段数应变多
m2, s2 = detect_bad(s, min_days=10)
assert len(s2) > len(segs), f"min_days=10 应有更多段: {len(s2)}"
# 阈值调高，覆盖天数应变多
m3, s3 = detect_bad(s, thr=0.5)
assert int(m3.sum()) > int(mask.sum()), "阈值 0.5 覆盖天数应更多"`,
    answer: `
def detect_bad(r, w=63, thr=0.0, min_days=20):
    rs = r.rolling(w).apply(
        lambda x: (x.mean() * 252) / (x.std() * np.sqrt(252)) if x.std() > 0 else 0.0,
        raw=True)
    segs = []
    v = rs.values
    i = 0
    while i < len(v):
        if not np.isnan(v[i]) and v[i] < thr:
            j = i
            while j + 1 < len(v) and v[j + 1] < thr:
                j += 1
            if j - i + 1 >= min_days:
                segs.append((rs.index[i], rs.index[j], j - i + 1))
            i = j + 1
        else:
            i += 1
    mask = pd.Series(False, index=r.index)
    for a, b, n in segs:
        mask[(r.index >= a) & (r.index <= b)] = True
    return mask, segs`,
    explanation: '这道题的核心是「段的识别」：找到一个连续区间，判断它的长度是否达到 min_days，然后把整段映射回原索引。注意 `np.isnan` 的判断——前 62 天的滚动夏普是 NaN，不能当 0 处理（否则会被误判为「夏普 < 0」）。另外本题用 `simulate`（收益级、当日收盘执行）口径，得到 340 天；正文的 341 天来自股数级回测（T 日决策、T+1 日成交），差 1 天是执行时点造成的，不影响结论。',
  },
  {
    id: 'quant-xquant-c9-l2-e13', type: 'judge', difficulty: 4,
    relatedLessonId: 'quant-xquant-c9-l2', tags: ['U', '综合'],
    question: '本节「趋势比波动更有区分度」这个结论对所有类型的策略都成立。',
    answer: false,
    explanation: '这个结论只对「只做多的等权组合」成立。对一个多空对冲策略，趋势市里可能反而失效（多空两端同时被趋势碾压），而高波动期可能有更多 alpha 机会。任何诊断结论都必须标注「基于哪个策略、哪段样本」。',
  },

  /* ═══════════ l3：假设驱动实验（13 题）═══════════ */
  {
    id: 'quant-xquant-c9-l3-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c9-l3', tags: ['K', '迭代'],
    question: '做对照实验时，第一步应该做什么？',
    options: [
      { value: 'a', text: '写下假设与成功标准' },
      { value: 'b', text: '写代码跑回测' },
      { value: 'c', text: '先看哪个参数最好' },
      { value: 'd', text: '先看别人的结论' },
    ],
    answer: 'a',
    explanation: '先写假设与标准，是为了防止事后合理化（HARKing）——看到结果再定标准，你总能找到一个「刚好能通过」的标准。本节的三条标准（回撤改善≥30%、夏普≥0.88、年化≥5.59%）是在跑实验前写死的。',
  },
  {
    id: 'quant-xquant-c9-l3-e2', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c9-l3', tags: ['K', '迭代'],
    question: '本节三条实验：实验 1（改频率）恶化段夏普从 −0.25 只到 ______，被推翻；实验 2（波动过滤）最大回撤改善 ______%，达不到 30% 门槛，被推翻；实验 3（趋势过滤）在 −5% 清仓时回撤改善 ______%，三条标准全满足。',
    blanks: [['-0.22', '−0.22'], ['17.3'], ['36.6']],
    explanation: '实验 1 和 2 的失败不是运气差——实验 2 的失败在诊断阶段就被预言了（波动无区分度）。实验 3 成功了，但参数曲线是尖峰，所以结论只能写「待样本外验证」。',
  },
  {
    id: 'quant-xquant-c9-l3-e3', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c9-l3', tags: ['U', '迭代'],
    question: '假设被推翻了，说明这次实验白做了。',
    answer: false,
    explanation: '完全相反。本节实验 1 和 2 被推翻，帮你排除了「频率」和「波动」两个方向，直接指向了实验 3 的成功。推翻一个假设省下的是**一次错误上线**。',
  },
  {
    id: 'quant-xquant-c9-l3-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c9-l3', tags: ['U', '迭代'],
    question: '为什么成功标准要同时包含「回撤改善」与「夏普/年化」两类约束？',
    options: [
      { value: 'a', text: '只看回撤改善会被「清仓躺平」骗过去（回撤小但收益也没了）' },
      { value: 'b', text: '回撤与收益是一对权衡，必须同时约束' },
      { value: 'c', text: '本节实验 2 的「清仓」配置回撤改善 17.3%，但年化掉到 4.86%，低于 5.59% 的门槛' },
      { value: 'd', text: '因为夏普比回撤重要' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 不对——两者不是谁更重要，而是必须同时约束，否则规则会钻空子。极端例子：一直空仓，回撤为 0（改善 100%），但年化为 0。三条标准缺一不可。',
  },
  {
    id: 'quant-xquant-c9-l3-e5', type: 'code', difficulty: 3,
    relatedLessonId: 'quant-xquant-c9-l3', tags: ['D', '迭代'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `judge_experiment(base_mdd, base_sharpe, base_ann, new_mdd, new_sharpe, new_ann)`：按本节三条标准判定，返回 dict，含 `dd_improve`（回撤改善%，保留 2 位）、`pass_dd`、`pass_sharpe`、`pass_ann`、`passed`（三者全为 True 才 True）。标准：回撤改善 ≥ 30%、夏普 ≥ 基准夏普、年化 ≥ 基准年化的 80%。',
    starterCode: `
def judge_experiment(base_mdd, base_sharpe, base_ann, new_mdd, new_sharpe, new_ann):
    pass

print(judge_experiment(-13.84, 0.88, 6.99, -8.78, 0.98, 7.68))`,
    expectedOutput: "dd_improve=36.56 passed=True",
    tests: `
r1 = judge_experiment(-13.84, 0.88, 6.99, -8.78, 0.98, 7.68)
assert abs(r1["dd_improve"] - 36.56) < 0.1, f"回撤改善应约 36.56%: {r1['dd_improve']}"
assert r1["pass_dd"] and r1["pass_sharpe"] and r1["pass_ann"], "三条标准应全满足"
assert r1["passed"] is True, "整体应通过"

# 实验 2 的清仓配置：回撤改善 17.3%，年化 4.86% 不达标
r2 = judge_experiment(-13.84, 0.88, 6.99, -11.44, 0.76, 4.86)
assert abs(r2["dd_improve"] - 17.34) < 0.1, f"回撤改善应约 17.34%: {r2['dd_improve']}"
assert r2["pass_dd"] is False, "17.3% < 30% 应不通过回撤"
assert r2["pass_ann"] is False, "4.86% < 5.59% 应不通过年化"
assert r2["passed"] is False, "整体不应通过"

# 实验 1：无改善
r3 = judge_experiment(-13.84, 0.88, 6.99, -13.80, 0.87, 6.9)
assert r3["passed"] is False, "实验 1 应不通过"`,
    answer: `
def judge_experiment(base_mdd, base_sharpe, base_ann, new_mdd, new_sharpe, new_ann):
    dd_improve = (abs(base_mdd) - abs(new_mdd)) / abs(base_mdd) * 100
    pass_dd = dd_improve >= 30.0
    pass_sharpe = new_sharpe >= base_sharpe
    pass_ann = new_ann >= base_ann * 0.8
    return {"dd_improve": round(dd_improve, 2),
            "pass_dd": bool(pass_dd),
            "pass_sharpe": bool(pass_sharpe),
            "pass_ann": bool(pass_ann),
            "passed": bool(pass_dd and pass_sharpe and pass_ann)}`,
    explanation: '注意回撤是负数，改善要用绝对值算：(13.84 − 8.78) / 13.84 = 36.56%。另外「年化 ≥ 基准的 80%」这条约束是防止「清仓躺平」——它把「用收益换回撤」的极端方案排除掉了。',
  },
  {
    id: 'quant-xquant-c9-l3-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c9-l3', tags: ['U', '迭代'],
    question: '本节实验 2（波动率过滤）为什么注定失败？',
    options: [
      { value: 'a', text: '因为上一节的诊断已经证明「波动没有区分度」（三档命中率 25-28% vs 基线 26%）' },
      { value: 'b', text: '因为波动率数据算错了' },
      { value: 'c', text: '因为过滤规则的代码有 bug' },
      { value: 'd', text: '因为样本太短' },
    ],
    answer: 'a',
    explanation: '这是本章最重要的呼应：实验 2 的失败在诊断阶段就被预言了。在一个没有区分度的变量上做过滤，必然无效。这也说明「先诊断再实验」这个顺序的价值——它能让你避免做注定失败的实验。',
  },
  {
    id: 'quant-xquant-c9-l3-e7', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c9-l3', tags: ['D', '迭代'],
    question: '本节实验 3 的「63 日 < −5% 清仓」四项指标全优（累计 46.48%、年化 7.68%、回撤 −8.78%、夏普 0.98）。请回答：\n① 为什么不能直接把它上线？\n② 你会用什么证据判断它是「尖峰」还是「高原」？\n③ 如果最终决定「暂时不用」，这个结论怎么表述才有价值？',
    referenceAnswer: `
① 不能直接上线的理由：
- **参数曲线是尖峰**：完整门槛扫描显示 −4% 改善 18.1%、−5%/−6% 改善 36.6%、−8% 改善 20.1%、−10% 归零。−5% 恰好踩中了这段样本里最痛的那次下跌，换一段数据很可能失效。
- **样本内数字**：46.48% 是样本内结果。第 7 章已演示过样本内冠军在样本外会衰减。
- **只有一个样本**：5 年、一段行情、一个策略。没有样本外验证，也没有其他资产类别的验证。
- **未考虑实现细节**：清仓后何时恢复？门槛附近会不会反复进出（锯齿效应）？成本有没有算（清仓/恢复都是交易）？

② 判断尖峰 vs 高原的证据：
- **门槛扫描的形态**：本节的 −3%~−10% 扫描就是核心证据。高原 = 相邻门槛的改善量相近（如都在 25-35%）；尖峰 = 某一个点特别高、相邻点明显低（本节 −4% 只有 18.1%，−5% 跳到 36.6%）。
- **分年/分段一致性**：把 5 年切成 5 段，每段单独看「−5% 清仓」是否都改善。如果只在某一年有效，那就是尖峰。
- **换标的验证**：把同样的规则套到「只买 B」「只买 C」上。如果只有等权组合有效，说明它捕捉的是等权组合的特定路径，不是普适规律。
- **改变仓位系数**：把「清仓」改成「半仓」「三成仓」。如果只有「清仓」有效，说明它对执行细节极其敏感——这是尖峰的另一个信号。

③ 「暂时不用」的结论表述：
- ❌ 「趋势过滤没用」——这不准确，它在这段样本上确实有效。
- ❌ 「趋势过滤太危险」——这是情绪判断，不是结论。
- ✅ **「在 2020-2025 的等权 A/B/C 组合上，'63 日累计 < −5% 清仓' 把回撤从 −13.84% 改善到 −8.78%（36.6%）、夏普从 0.88 升到 0.98；但门槛扫描显示改善量在 −4%~−10% 区间从 18% 跳到 37% 再回落到 0%，呈尖峰形态，因此判断该参数踩中了样本噪声。结论：暂不上线，待 ① 样本外验证（前 3 年训练、后 2 年测试）② 加双门槛缓冲区后重测 ③ 在其他标的组合上复现。」**
- 这个表述的价值：它保留了「有效」这个事实（未来可能被验证），同时明确标注了「不可靠」这个判断（现在不该用），并给出了可执行的下一步。`,
    rubric: [
      { point: '① 指出参数曲线是尖峰（含具体数字：−4% 18.1%、−5% 36.6%、−8% 20.1%、−10% 0%）', score: 4 },
      { point: '① 提到「样本内数字」与「未考虑清仓/恢复的成本与锯齿」', score: 2 },
      { point: '② 给出至少 3 种判断尖峰/高原的证据（门槛扫描/分段一致/换标的/改仓位系数）', score: 3 },
      { point: '③ 结论表述既保留「有效」的事实，又明确「不可靠」的判断，并给出下一步', score: 3 },
    ],
    keywords: ['尖峰', '高原', '门槛扫描', '样本外', '锯齿效应', '待验证'],
    explanation: '评分重点在①——能不能用完整扫描表的数字说明「这是尖峰」。只看 −5% 那一格的人会觉得找到了圣杯；看完扫描表的人知道那只是噪声。这个区别就是本节的全部价值。',
  },
  {
    id: 'quant-xquant-c9-l3-e8', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c9-l3', tags: ['U', '迭代'],
    question: '本节实验 3 的「−5% 清仓」累计收益 46.48% 高于基准 41.70%，说明这个规则是有效的。',
    answer: false,
    explanation: '不能只凭一个参数点的数字下结论。完整扫描显示 −4% 只有 18.1% 改善、−8% 回落到 20.1%、−10% 归零——这是尖峰不是高原。正确结论是「在这段样本上有效，但参数是尖峰，待样本外验证」。',
  },
  {
    id: 'quant-xquant-c9-l3-e9', type: 'fill', difficulty: 3,
    relatedLessonId: 'quant-xquant-c9-l3', tags: ['K', '迭代'],
    question: '本节实验 3 的门槛扫描（清仓）：−4% 改善 18.1%、−5% 改善 ______%、−8% 改善 ______%、−10% 改善 0%。这个形状说明参数曲线是______（填「尖峰」或「高原」）。',
    blanks: [['36.6'], ['20.1'], ['尖峰']],
    explanation: '相邻门槛之间改善量剧烈变化（18.1% → 36.6% → 20.1% → 0%），说明 −5%/−6% 恰好踩中了这段样本的特定路径。高原的特征是「相邻点数值相近」，本节明显不是。',
  },
  {
    id: 'quant-xquant-c9-l3-e10', type: 'multiple', difficulty: 4,
    relatedLessonId: 'quant-xquant-c9-l3', tags: ['U', '迭代'],
    question: '关于「先定成功标准，再看结果」，下列说法正确的有？',
    options: [
      { value: 'a', text: '防止事后合理化（HARKing）：看到结果再定标准，总能找到刚好能通过的标准' },
      { value: 'b', text: '标准必须可量化，且实验后不许改' },
      { value: 'c', text: '标准应包含多个约束，防止规则钻空子（如清仓换低回撤）' },
      { value: 'd', text: '如果实验结果比预期好，应该提高标准以体现严谨' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 是另一种形式的 HARKing——事后调整标准。如果结果比预期好，正确的做法是「记录它，然后设计一个新实验去验证它」，而不是当场提高标准把结果否掉。标准一旦定下，这一轮实验就按它判。',
  },
  {
    id: 'quant-xquant-c9-l3-e11', type: 'single', difficulty: 4,
    relatedLessonId: 'quant-xquant-c9-l3', tags: ['U', '迭代'],
    question: '本节实验 1（改频率）的结论是「恶化段夏普从 −0.25 到 −0.22，纹丝不动」。这个结果的最大价值是？',
    options: [
      { value: 'a', text: '它排除了「频率」这个方向，让下一步能聚焦到「行动内容」上' },
      { value: 'b', text: '它证明频率完全不重要' },
      { value: 'c', text: '它说明策略坏了' },
      { value: 'd', text: '它没有价值' },
    ],
    answer: 'a',
    explanation: 'b 过度解读了（频率在全期收益上仍有影响：5 天 40.84% vs 63 天 43.54%）；它只是对「恶化段」没有影响。这正是「推翻假设」的价值：缩小搜索空间。',
  },
  {
    id: 'quant-xquant-c9-l3-e12', type: 'code', difficulty: 4,
    relatedLessonId: 'quant-xquant-c9-l3', tags: ['D', '迭代'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `threshold_scan(base_mdd, thresholds)`：对每个门槛（负小数，如 −0.05）模拟「63 日累计收益 < 门槛时清仓」的规则，返回 DataFrame（索引为门槛字符串如 `"-5%"`，列含 `tot`、`mdd`、`sharpe`、`dd_improve`）。`dd_improve` = (|base_mdd| − |new_mdd|) / |base_mdd| × 100。',
    starterCode: `
def threshold_scan(base_mdd, thresholds):
    pass

print(threshold_scan(-13.84, [-0.03, -0.05, -0.08]))`,
    expectedOutput: '三行扫描表，-5% 的 dd_improve 约 36.6',
    tests: `
df = threshold_scan(-13.84, [-0.03, -0.04, -0.05, -0.08, -0.10])
assert len(df) == 5, f"应有 5 行: {len(df)}"
for c in ("tot", "mdd", "sharpe", "dd_improve"):
    assert c in df.columns, f"缺列 {c}"
assert "-5%" in df.index, f"索引格式应为 '-5%': {list(df.index)}"
assert abs(df.loc["-5%", "dd_improve"] - 36.6) < 1.0, f"-5% 改善应约 36.6%: {df.loc['-5%','dd_improve']}"
assert abs(df.loc["-3%", "dd_improve"] - 18.1) < 1.0, f"-3% 改善应约 18.1%: {df.loc['-3%','dd_improve']}"
assert df.loc["-10%", "dd_improve"] < 1.0, f"-10% 应几乎无改善: {df.loc['-10%','dd_improve']}"
# 尖峰检验：-5% 与相邻点的改善量差异很大
assert abs(df.loc["-5%", "dd_improve"] - df.loc["-3%", "dd_improve"]) > 10, "尖峰特征：-5% 与 -3% 差异应 > 10pp"`,
    answer: `
def threshold_scan(base_mdd, thresholds):
    mkt = (RET * EW).sum(axis=1)
    rows = {}
    for thr in thresholds:
        def gate(d, thr=thr):
            i = PX.index.get_loc(d)
            if i < 63:
                return 1.0
            return 1.0 if float(mkt.iloc[i - 62:i + 1].sum()) > thr else 0.0
        sh = pd.Series(0.0, index=["A", "B", "C"]); cash = 1_000_000.0
        nav = []
        for i in range(len(PX)):
            nav.append(cash + float((sh * PX.iloc[i]).sum()))
            if i % 21 == 0 and i + 1 < len(PX):
                w = EW * gate(PX.index[i])
                px = PX.iloc[i]; value = cash + float((sh * px).sum()); tv = w * value
                for a in ["A", "B", "C"]:
                    held = sh[a] * px[a]
                    if held > tv[a] + 1e-9:
                        amt = held - tv[a]; sh[a] -= amt / px[a]; cash += amt
                for a in ["A", "B", "C"]:
                    gap = tv[a] - sh[a] * px[a]
                    if gap > 0:
                        amt = min(gap, cash); sh[a] += amt / px[a]; cash -= amt
            nav[-1] = cash + float((sh * PX.iloc[i]).sum())
        r = pd.Series(nav, index=PX.index).pct_change().fillna(0.0)
        m = metrics(r)
        rows["%.0f%%" % (thr * 100)] = {
            "tot": round(m["tot"], 2), "mdd": round(m["mdd"], 2),
            "sharpe": round(m["sharpe"], 2),
            "dd_improve": round((abs(base_mdd) - abs(m["mdd"])) / abs(base_mdd) * 100, 2)}
    return pd.DataFrame(rows).T`,
    explanation: '这道题把「尖峰 vs 高原」的判据代码化：`dd_improve` 列相邻值的差异就是判断依据。注意 gate 里 `i < 63` 的边界——前 63 天没有足够历史算趋势，必须返回满仓（1.0）而不是清仓（0.0），否则会凭空多出一段空仓。',
  },
  {
    id: 'quant-xquant-c9-l3-e13', type: 'judge', difficulty: 4,
    relatedLessonId: 'quant-xquant-c9-l3', tags: ['U', '综合'],
    question: '如果三次实验全部成功，说明研究做得很好。',
    answer: false,
    explanation: '全部成功反而应该警惕：它可能意味着你在挑参数（多重检验问题），或者成功标准定得太松。本节「两次推翻 + 一次待验证」才是正常的研究状态。第 7 章讲过：试得越多，越容易找到「看起来很好」的结果。',
  },

  /* ═══════════ l4：实验记录与节奏（8 题）═══════════ */
  {
    id: 'quant-xquant-c9-l4-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c9-l4', tags: ['K', '记录'],
    question: 'ExperimentLog 的六个必填字段是？',
    options: [
      { value: 'a', text: '假设 / 成功标准 / 设计 / 结果 / 结论 / 是否推翻' },
      { value: 'b', text: '日期 / 代码 / 参数 / 收益 / 回撤 / 夏普' },
      { value: 'c', text: '作者 / 时间 / 版本 / 备注' },
      { value: 'd', text: '策略名 / 标的 / 仓位 / 频率' },
    ],
    answer: 'a',
    explanation: 'b 缺了最重要的「假设」和「是否推翻」——没有假设的记录只是一堆数字，无法回答「当初为什么这么做」。',
  },
  {
    id: 'quant-xquant-c9-l4-e2', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c9-l4', tags: ['K', '记录'],
    question: '本节实测：基准最大回撤 −13.84%，最长水下期 ______ 个交易日（约 ______ 个月），回撤超过 −5% 的天数占 ______%。',
    blanks: [['464'], ['22.1'], ['37']],
    explanation: '464 个交易日 ≈ 22.1 个月。这个数字意味着「超过一年半不赚钱」是这套策略的常态——所以耐心不是心理素质，是提前知道这个数字。',
  },
  {
    id: 'quant-xquant-c9-l4-e3', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c9-l4', tags: ['U', '记录'],
    question: 'ExperimentLog 只需要记录成功的实验，失败的可以省略。',
    answer: false,
    explanation: '恰恰相反，失败的实验更有价值。本节 E01/E02 被推翻，帮你排除了「频率」和「波动」两个方向，直接指向 E03 的成功。而且人会本能地忘记失败——所以必须有一列独立的「是否推翻」布尔值，季度复盘时数它。',
  },
  {
    id: 'quant-xquant-c9-l4-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c9-l4', tags: ['U', '记录'],
    question: '关于四层日常节奏，下列说法正确的有？',
    options: [
      { value: 'a', text: '日频只看告警，不该看当日盈亏与排名' },
      { value: 'b', text: '月频看三指标趋势、换手与成本是否偏离预期' },
      { value: 'c', text: '季频做参数复核与实验记录复盘' },
      { value: 'd', text: '日频就应该决定要不要改参数' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 是最常见的错误：日频信息量最小、噪声最大，在日频上做决策等于被噪声带着频繁操作。「不该看什么」比「该看什么」更重要。',
  },
  {
    id: 'quant-xquant-c9-l4-e5', type: 'code', difficulty: 2,
    relatedLessonId: 'quant-xquant-c9-l4', tags: ['D', '记录'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `underwater(r)`：返回 dict，含 `max_dd`（最大回撤%，负值）、`longest`（最长水下期天数，即连续低于历史最高净值的最大连续天数）、`pct_below_5`（回撤超过 −5% 的天数占比%）。数值保留 2 位。',
    starterCode: `
def underwater(r):
    pass

s, _ = simulate(EW)
print(underwater(s))`,
    expectedOutput: "max_dd=-13.84 longest=464 pct_below_5=37.0",
    tests: `
s, _ = simulate(EW)
u = underwater(s)
assert abs(u["max_dd"] - (-13.84)) < 0.05, f"最大回撤应约 -13.84: {u['max_dd']}"
assert u["longest"] == 464, f"最长水下期应 464 天: {u['longest']}"
assert abs(u["pct_below_5"] - 37.0) < 0.5, f"回撤>5% 占比应约 37%: {u['pct_below_5']}"

# 单调上涨序列：无回撤
up = pd.Series([0.001] * 300)
u2 = underwater(up)
assert u2["max_dd"] == 0.0, f"单调上涨应无回撤: {u2['max_dd']}"
assert u2["longest"] == 0, f"单调上涨水下期应为 0: {u2['longest']}"`,
    answer: `
def underwater(r):
    eq = (1 + r).cumprod()
    dd = eq / eq.cummax() - 1
    longest = 0; cur = 0
    for v in dd.values:
        if v < -1e-12:
            cur += 1
            longest = max(longest, cur)
        else:
            cur = 0
    return {"max_dd": round(float(dd.min()) * 100, 2),
            "longest": int(longest),
            "pct_below_5": round(float((dd * 100 < -5).sum()) / len(dd) * 100, 2)}`,
    explanation: '三个量分别回答三个问题：`max_dd` 是「最惨的时候跌多少」、`longest` 是「最长要等多久」、`pct_below_5` 是「有多少时间在难受」。其中 `longest` 是最容易被忽略、但对「耐心」最重要的——它决定你能不能拿得住。注意 `v < -1e-12` 而不是 `v < 0`，避免浮点误差把「刚好回到高点」误判为水下。',
  },
  {
    id: 'quant-xquant-c9-l4-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c9-l4', tags: ['U', '记录'],
    question: '为什么 ExperimentLog 要单独设一列「是否推翻」？',
    options: [
      { value: 'a', text: '因为人有一种记忆偏差：会高估成功次数、忘掉失败次数' },
      { value: 'b', text: '因为结论一栏写不下' },
      { value: 'c', text: '因为需要统计成功率' },
      { value: 'd', text: '这是形式主义要求' },
    ],
    answer: 'a',
    explanation: '结论一栏虽然也会写「被推翻」，但混在文字里容易被记忆美化。单独一列布尔值让你在季度复盘时可以直接数「这个季度我推翻了几次假设」——这个数字比「成功了几次」更能反映研究的健康度。',
  },
  {
    id: 'quant-xquant-c9-l4-e7', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c9-l4', tags: ['D', '记录'],
    question: '你要为一个新策略建立迭代记录制度。请回答：\n① 设计 ExperimentLog 的字段（至少 6 个），并说明每个字段缺了会导致什么后果；\n② 设计日/周/月/季四层检查清单，每层写「看什么」与「不该看什么」；\n③ 用「最长水下期」这个指标，说明你会怎么把「耐心」写进策略 spec。',
    referenceAnswer: `
① ExperimentLog 字段与缺失后果（≥6）：
| 字段 | 内容 | 缺了会怎样 |
| 假设 | 我猜是什么原因 | 三个月后不知道当初在想什么，无法判断是否该撤 |
| 成功标准 | 什么条件下算成功（事前锁定） | 会事后合理化，把任何结果都解释成成功 |
| 设计 | 改了什么、没改什么 | 无法复现，也无法判断是否单变量 |
| 结果 | 关键数字（收益/回撤/夏普/换手） | 无法与基准对比，结论无法被质疑 |
| 结论 | 确认/推翻/待验证 | 下次会重复同一个实验 |
| 是否推翻 | 明确布尔值 | 记忆偏差会美化成功率，季度复盘无法统计 |
（可选）日期、代码版本、数据版本——保证可复现。

② 四层检查清单：
| 频率 | 看什么 | 不该看什么 |
| 日 | 三指标仪表盘有没有新告警 | 当日盈亏、当日排名 |
| 周 | 告警段是否新增、是否解除 | 要不要改参数 |
| 月 | 三指标趋势、换手与成本是否偏离预期 | 要不要换策略 |
| 季 | 参数是否仍在不敏感区间、实验记录复盘、复现检查 | 要不要抄别人的策略 |
两条纪律：① 频率越高只能看「有没有异常」，越低才适合做「要不要改」；② 「不该看什么」比「该看什么」更重要。

③ 把「耐心」写进 spec：
- 先算三个数：最大回撤（本节 −13.84%）、最长水下期（本节 464 个交易日 ≈ 22.1 个月）、回撤超过 −5% 的天数占比（本节 37%）。
- 在 spec 里写死两条容忍条款：
  1. 【最大可忍受回撤】不超过 21%（= 实测 13.84% × 1.5 倍安全垫）；
  2. 【最长等待时间】不超过 33 个月（= 实测 22.1 个月 × 1.5 倍）。
- 再写一条触发条款：【若实际回撤超过 21% 或水下期超过 33 个月，则启动第 2 节的诊断流程；诊断结论为「策略逻辑失效」时才停用，为「市场状态」时按迭代流程处理】。
- 关键：这两个数字必须在**上线前**写下，而不是在回撤发生时现场决定——现场决定一定会被情绪影响。`,
    rubric: [
      { point: '① 至少 6 个字段，且每个字段都说明「缺了的后果」', score: 4 },
      { point: '① 含「是否推翻」这个独立布尔字段并说明记忆偏差的理由', score: 2 },
      { point: '② 四层清单齐全，且每层都有「不该看什么」', score: 3 },
      { point: '② 说明「频率越高只能看异常、越低才适合做决策」', score: 1 },
      { point: '③ 用具体数字（13.84% / 464 天 / 37%）把耐心写成可检查的 spec 条款', score: 3 },
    ],
    keywords: ['假设', '成功标准', '是否推翻', '四层节奏', '最长水下期', 'spec', '容忍度'],
    explanation: '评分重点在③——能不能把「耐心」这个形容词变成 spec 里可检查的数字。只说「要有耐心」等于没说；说「最大回撤不超过 21%、水下期不超过 33 个月，超了就走诊断流程」才是可执行的。',
  },
  {
    id: 'quant-xquant-c9-l4-e8', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c9-l4', tags: ['U', '记录'],
    question: '一条实验记录是否合格，唯一标准是「三个月后用同样的代码和同样的数据能跑出同样的数字」。',
    answer: true,
    explanation: '这是本节的核心判据。本节实测的复现检查（E03 的 46.48% / −8.78% / 0.98）五项全部一致。如果记录里只写「明显改善」而没有数字，它永远无法被复现——也就永远无法被质疑，等于没有记录。',
  },
];

export const quantXquantC9ExercisesAll = quantXquantC9Exercises;
