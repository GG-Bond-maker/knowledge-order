import type { Exercise } from '../../../types';

/* c5 习题：难度 2/4/3/4 → 8/13/10/13，共 44 题。 */

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

export const quantXquantC5Exercises: Exercise[] = [
  /* ═══════════ l1：再平衡（8 题）═══════════ */
  {
    id: 'quant-xquant-c5-l1-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c5-l1', tags: ['K', '再平衡'],
    question: '再平衡（rebalancing）的作用是？',
    options: [
      { value: 'a', text: '把因涨跌而漂移的权重拉回目标权重' },
      { value: 'b', text: '预测市场方向并调整仓位' },
      { value: 'c', text: '降低交易成本' },
      { value: 'd', text: '提高组合的收益率' },
    ],
    answer: 'a',
    explanation: '再平衡的目标是「维持设计意图」（不让组合悄悄变成单押涨得最多的资产），不是提高收益、也不是降低成本（它反而增加成本）。',
  },
  {
    id: 'quant-xquant-c5-l1-e2', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c5-l1', tags: ['K', '再平衡'],
    question: '本节实测五个频率：5 天累计 ______%（最差）、21 天 ______%、63 天 ______%（最优）。高频明显更差，因为它在震荡中不断「卖强买弱」。',
    blanks: [['41.12', '41.1'], ['41.69'], ['43.42']],
    explanation: '5 天 +41.12%，21 天 +41.69%，63 天 +43.42%。21/63/252 构成「不敏感区间」（极差 < 2pp），而 5/10 天明显吃亏。',
  },
  {
    id: 'quant-xquant-c5-l1-e3', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c5-l1', tags: ['U', '再平衡'],
    question: '再平衡频率越高越好，因为权重越精确地接近目标。',
    answer: false,
    explanation: '本节实测高频（5 天）反而最差（+41.12% vs 21 天的 +41.69%）。再平衡的目标不是权重精确，而是「维持设计意图且不过度交易」。频率太高会在震荡中反复卖强买弱。',
  },
  {
    id: 'quant-xquant-c5-l1-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c5-l1', tags: ['U', '再平衡'],
    question: '关于再平衡频率，下列说法正确的有？',
    options: [
      { value: 'a', text: '存在「不敏感区间」（如 21-252 天），区间内换频率影响不大' },
      { value: 'b', text: '选频率应在不敏感区间内选换手最低的，而不是取回测最高点' },
      { value: 'c', text: '频率越高，交易成本越高' },
      { value: 'd', text: '再平衡频率必须等于 21 天，这是行业标准' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 是伪标准——21 天只是「一个月」的自然选择。正确做法是看参数敏感性形态，在高原区间内选换手最低的（本节 63 或 252 天）。',
  },
  {
    id: 'quant-xquant-c5-l1-e5', type: 'code', difficulty: 2,
    relatedLessonId: 'quant-xquant-c5-l1', tags: ['D', '再平衡'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `sim_rebalance(freq, cost_bps=0.0)`：等权组合，每 freq 个交易日把权重拉回 1/3，其余时间权重随价格漂移；成本按「权重变化量之和 × cost_bps/1e4」收取。返回 `(日收益 Series, 总换手, 总成本%)`。',
    starterCode: `
def sim_rebalance(freq, cost_bps=0.0):
    pass

s, t, c = sim_rebalance(21)
print(round(metrics(s)["tot"], 2), round(t, 2), round(c, 2))`,
    expectedOutput: '41.69 1.3 0.0',
    tests: `
s, t, c = sim_rebalance(21)
assert isinstance(s, pd.Series) and len(s) == len(RET), "应返回等长 Series"
assert abs(metrics(s)["tot"] - 41.69) < 0.1, f"21 天应约 41.69%，实际 {metrics(s)['tot']}"
assert abs(c) < 1e-9, "不含成本时成本应为 0"

s5, t5, _ = sim_rebalance(5)
s63, t63, _ = sim_rebalance(63)
assert t5 > t63, "高频换手应更高"
assert metrics(s5)["tot"] < metrics(s63)["tot"], "高频收益应更低（本节结论）"

s_c, t_c, c_c = sim_rebalance(5, cost_bps=10)
assert c_c > 0, "含成本时成本应大于 0"
assert metrics(s_c)["tot"] < metrics(s5)["tot"], "含成本收益必须低于不含成本"`,
    answer: `
def sim_rebalance(freq, cost_bps=0.0):
    """与 market.ts 的 simulate 同口径：再平衡日先换权重，再吃当日收益"""
    cols = list("ABC"); w = pd.Series(1/3, index=cols)
    nav = 1.0; res = []; turn = 0.0; cost_sum = 0.0
    for i, d in enumerate(RET.index):
        if i % freq == 0:
            tr = float((pd.Series(1/3, index=cols) - w).abs().sum()); turn += tr
            c = tr * cost_bps / 1e4; cost_sum += c; nav *= (1 - c)
            res.append(-c); w = pd.Series(1/3, index=cols)
        else:
            res.append(0.0)
        rv = RET.loc[d]; pr = float((w * rv).sum()); nav *= (1 + pr)
        res[-1] += pr
        g = w * (1 + rv); s = g.sum()
        if s > 0: w = g / s
    return pd.Series(res, index=RET.index), turn, cost_sum * 100`,
    explanation: '核心是「权重随价格漂移」这一步：`grown = w * (1 + rv)` 然后归一化。少了它，等于假设每天都再平衡，换手与成本会被严重低估。成本要从当期收益里扣（res.append(-c)），否则会漏算。',
  },
  {
    id: 'quant-xquant-c5-l1-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c5-l1', tags: ['U', '成本'],
    question: '本节等权三资产在单边 10bp 成本下，5 天频率的成本只吃掉 0.28pp；而第 4 章动量排名（10bp）成本吃掉 4.94pp。差异的关键是？',
    options: [
      { value: 'a', text: '换手率差异：动量排名换手 48.4，等权再平衡只有 2.2' },
      { value: 'b', text: '等权资产的成本费率更低' },
      { value: 'c', text: '动量排名的代码有 bug' },
      { value: 'd', text: '时间区间不同' },
    ],
    answer: 'a',
    explanation: '成本 = 换手 × 费率。费率相同的前提下，成本完全由换手决定。这条结论很重要：不要一听到「成本」就恐慌，先算换手。',
  },
  {
    id: 'quant-xquant-c5-l1-e7', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c5-l1', tags: ['D', '研究设计'],
    question: '你要为一个新策略确定再平衡频率。请回答：\n① 设计一个能得出结论的完整实验方案（至少 5 步）；\n② 说明如何判断「这个频率是稳健的」而不是「碰巧最好」；\n③ 如果你只能选一次、且不能做实验，你会选哪个频率？理由？',
    referenceAnswer: `
① 实验方案（≥5 步）：
1. **固定其他所有条件**：同一标的池、同一权重方法、同一时间段、同一成本假设；
2. **扫描多个频率**：例如 5、10、21、42、63、126、252 天（覆盖「周/双周/月/季/半年/年」）；
3. **对每个频率输出四指标 + 换手**：累计收益、年化波动、最大回撤、简化夏普、换手次数；
4. **加成本重跑**：单边 10bp（或按你的真实费率），观察排名是否变化；
5. **看形态**：把「频率 vs 指标」画成曲线，判断是高原还是锯齿/尖峰；
6. **分段检验**：把样本切成前/后两半，各自扫描一次，看最优频率是否一致。

② 判断稳健性的方法：
- **形态判据**：如果相邻频率（如 21 与 42）结果接近，且存在一段「平台」（极差 < 2pp），说明是高原 → 稳健；
- 如果是锯齿（相邻频率差很大），说明结果对频率敏感 → 不稳健，不能选「最高点」；
- **分段一致**：前/后两半的最优频率如果一致（或都落在同一平台内），可信度更高；
- **换手效率**：在平台内选换手最低的，既稳健又省成本；
- **成本后仍成立**：加成本后排名不应剧烈变化（若变化大，说明原来的优势来自「高频恰好踩对了点」）。

③ 只能选一次的答案：
**选 63 天（季度）或其他平台内换手较低的频率**。理由：
- 季度在本节数据上属于不敏感区间（43.42%，换手 0.9），表现好且成本低；
- 季度再平衡在实务中常见，符合「定期检视、不过度交易」的原则；
- 相比 21 天，它对「某一天恰好是异常日」更不敏感（21 天可能正好落在某个月初的异常波动上）；
- 相比 252 天，它仍能及时纠正严重漂移。
（关键不是「63 最好」，而是「在平台内选一个换手合理、逻辑自然的」，避免任何「精调」。）`,
    rubric: [
      { point: '① 方案含「固定其他条件」「多频率扫描」「四指标+换手」「加成本」四个要素', score: 3 },
      { point: '① 提到分段检验（前/后两半各自扫描）', score: 2 },
      { point: '② 用「形态（高原 vs 锯齿）」作为稳健性判据', score: 3 },
      { point: '③ 选择有理由（平台内 + 换手低 + 逻辑自然），而非「回测最好」', score: 2 },
    ],
    keywords: ['固定条件', '扫描', '换手', '成本', '高原', '分段', '63'],
    explanation: '评分重点在②——能不能用「形态」而不是「最大值」判断稳健性。这是从「会调参」到「会做研究」的分水岭。',
  },
  {
    id: 'quant-xquant-c5-l1-e8', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c5-l1', tags: ['U', '再平衡'],
    question: '再平衡一定能提高组合收益（这就是「再平衡溢价」）。',
    answer: false,
    explanation: '再平衡溢价的符号取决于市场形态：在高波动、均值回复的市场里为正（自动高卖低买）；在单边趋势市里为负（不断卖出最强的资产）。所以「再平衡能提高收益」必须带条件。',
  },

  /* ═══════════ l2：止损（13 题）═══════════ */
  {
    id: 'quant-xquant-c5-l2-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c5-l2', tags: ['K', '止损'],
    question: '止损规则的三要素是？',
    options: [
      { value: 'a', text: '触发阈值 / 参照基准 / 重新入场规则' },
      { value: 'b', text: '买入价 / 卖出价 / 数量' },
      { value: 'c', text: '收益率 / 波动率 / 夏普' },
      { value: 'd', text: '账户 / 券商 / 交易软件' },
    ],
    answer: 'a',
    explanation: '第二个「参照基准」最容易被忽略，而它恰恰决定止损的性质。本节实测：同一 5% 阈值，参照建仓价 +41.93%，参照历史峰值 −5.66%。',
  },
  {
    id: 'quant-xquant-c5-l2-e2', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c5-l2', tags: ['K', '止损'],
    question: '本节实测 5% 止损：参照建仓价累计 ______%（触发 2 次），参照历史峰值累计 ______%（触发 ______ 次）。同一个 5%，结果相差约 47.6 个百分点。',
    blanks: [['41.93'], ['-5.66', '−5.66'], ['61']],
    explanation: '差异根源是触发频率：参照峰值把日常回撤当成了危险信号，60 次触发导致反复「卖出—买回」，每次都小亏，累积起来吃掉全部收益（锯齿效应）。',
  },
  {
    id: 'quant-xquant-c5-l2-e3', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c5-l2', tags: ['U', '止损'],
    question: '止损阈值设置得越小，风险控制越好。',
    answer: false,
    explanation: '阈值太小会变成噪声交易器（本节参照峰值 5% 触发 61 次）。合理阈值应参考标的实际波动：如果年化波动 8%，那么 5% 的回撤是日常现象，不该当危险信号。',
  },
  {
    id: 'quant-xquant-c5-l2-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c5-l2', tags: ['U', '止损'],
    question: '判断一个止损规则是「保护」还是「分批实现亏损」，可以看哪些指标？',
    options: [
      { value: 'a', text: '触发次数（少 = 保护，几十次 = 分批亏损）' },
      { value: 'b', text: '最大回撤是否明显收窄' },
      { value: 'c', text: '收益是否明显下降' },
      { value: 'd', text: '代码行数是否足够多' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: '本节「参照峰值 5%」三项都不合格：触发 61 次、回撤只从 −13.84% 到 −9.81%、收益从 +41.69% 掉到 −5.66%。d 与规则有效性无关。',
  },
  {
    id: 'quant-xquant-c5-l2-e5', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c5-l2', tags: ['U', '止损'],
    question: '为什么「参照历史峰值的止损」在震荡市里特别有害？',
    options: [
      { value: 'a', text: '因为「从峰值回落 5%」在高波动组合上是日常现象，会频繁触发并把每次小亏累积起来' },
      { value: 'b', text: '因为峰值计算需要未来数据' },
      { value: 'c', text: '因为峰值止损的代码更复杂' },
      { value: 'd', text: '因为它不降低波动' },
    ],
    answer: 'a',
    explanation: 'b 只有在「用了全期最高价」时才成立（那确实是前视偏差，但正确的峰值止损用「截至当天的历史最高」是可实现的）。c/d 都不是根因。根因是触发频率与日常波动的量级不匹配。',
  },
  {
    id: 'quant-xquant-c5-l2-e6', type: 'code', difficulty: 3,
    relatedLessonId: 'quant-xquant-c5-l2', tags: ['D', '止损'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `sim_stop(stop=None, basis="entry", freq=21)`：\n- basis="entry"：参照上次建仓净值；basis="peak"：参照截至当天的历史最高净值；\n- 触发（chg ≤ −stop）后清仓，等下一个再平衡日买回；\n- 返回 `(日收益 Series, 触发次数)`。',
    starterCode: `
def sim_stop(stop=None, basis="entry", freq=21):
    pass

for b in ("entry","peak"):
    s, e = sim_stop(stop=0.05, basis=b)
    print(b, round(metrics(s)["tot"],2), e)`,
    expectedOutput: 'entry 41.93 2 / peak -5.66 61',
    tests: `
s_e, n_e = sim_stop(stop=0.05, basis="entry")
assert abs(metrics(s_e)["tot"] - 45.11) < 0.2, f"entry 应约 41.93%，实际 {metrics(s_e)['tot']}"
assert n_e == 2, f"entry 应触发 2 次，实际 {n_e}"

s_p, n_p = sim_stop(stop=0.05, basis="peak")
assert abs(metrics(s_p)["tot"] - (-8.01)) < 0.5, f"peak 应约 -5.66%，实际 {metrics(s_p)['tot']}"
assert n_p >= 50, f"peak 应触发 50+ 次，实际 {n_p}"
assert n_p > n_e * 5, "峰值参照的触发次数应远多于建仓价参照"

# 不止损
s0, n0 = sim_stop(stop=None)
assert n0 == 0 and abs(metrics(s0)["tot"] - 42.15) < 0.2, "不止损应触发 0 次且收益约 41.69%"
# 高阈值不触发
s15, n15 = sim_stop(stop=0.15, basis="entry")
assert n15 == 0, "15% 阈值在这段数据上不应触发"`,
    answer: `
def sim_stop(stop=None, basis="entry", freq=21):
    cols = list("ABC"); w = pd.Series(1/3, index=cols)
    nav = 1.0; peak = 1.0; nav_entry = 1.0; inpos = True; res = []; exits = 0
    for i, d in enumerate(RET.index):
        if i % freq == 0:
            if not inpos:
                inpos = True; nav_entry = nav
            w = pd.Series(1/3, index=cols)
            peak = max(peak, nav)
            res.append(0.0)
            continue
        if not inpos:
            res.append(0.0); continue
        rv = RET.loc[d]; pr = float((w * rv).sum()); nav *= (1 + pr); res.append(pr)
        peak = max(peak, nav)
        g = w * (1 + rv); s = g.sum()
        if s > 0: w = g / s
        ref = peak if basis == "peak" else nav_entry
        if stop is not None and nav / ref - 1 <= -stop:
            inpos = False; exits += 1
    return pd.Series(res, index=RET.index), exits`,
    explanation: '关键是「参照点」的实现：entry 版在每次建仓时重置 nav_entry；peak 版持续更新历史最高。两者只差一行，结果相差 53pp。另外注意清仓后要返回 0 收益，并在再平衡日重置 nav_entry。',
  },
  {
    id: 'quant-xquant-c5-l2-e7', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c5-l2', tags: ['U', '止损'],
    question: '「参照峰值 5% 止损」的波动降到 2.43%（远低于不止损的 7.75%），这说明？',
    options: [
      { value: 'a', text: '波动大降主要来自「大部分时间空仓」，不代表风险调整后收益改善' },
      { value: 'b', text: '这条规则大幅改善了风险控制' },
      { value: 'c', text: '波动率指标算错了' },
      { value: 'd', text: '说明应该把阈值再调小' },
    ],
    answer: 'a',
    explanation: '降波动是「不在场」的结果，不是「风险管理」的结果。同期收益从 +41.69% 变成 −5.66%，夏普从 0.91 变成负值。这是「用收益换低波动」的极端案例，不是改善。',
  },
  {
    id: 'quant-xquant-c5-l2-e8', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c5-l2', tags: ['D', '研究设计'],
    question: '某团队要为一个组合加止损。他们的初稿 spec 写：「加 5% 止损，以控制下行风险。」请回答：\n① 这份 spec 缺了哪些关键信息（至少 4 项）？\n② 每项缺失可能导致什么具体后果？用本节数字说明；\n③ 写出你认为合格的止损 spec 条款（至少 5 条）。',
    referenceAnswer: `
① 缺失的关键信息（≥4）：
1. **参照基准**：「5%」相对什么算？建仓价？历史峰值？上次再平衡？
2. **检查频率**：每天检查？每周？只在再平衡日检查？
3. **重新入场规则**：卖出后什么时候买回？下个再平衡日？等信号？永不？
4. **成交价假设**：按止损价成交？次日开盘？是否计滑点？
5. **成本假设**：卖出与买回都要付成本，费率是多少？
6. **适用范围**：对每只标的单独止损，还是对组合整体净值止损？

② 缺失的后果（用本节数字）：
- 参照基准缺失：参照建仓价 +41.93%、参照峰值 −5.66%，**相差 53pp**。也就是说「5% 止损」这一句话，可以指两个完全相反的策略；
- 检查频率缺失：每天检查 vs 只在该再平衡日检查，触发次数会差很多（同一阈值下触发频率可能差 5-10 倍）；
- 重新入场缺失：如果「永不买回」，就变成择时退出；如果「下个再平衡日买回」，空仓期可能长达 21 天，错过反弹；
- 成交价与成本缺失：跌停/跳空时无法按止损价成交，可能多亏 3-10%；
- 适用范围缺失：组合级止损 vs 单标的止损，在相关性高时结果差异很大。

③ 合格 spec 条款（≥5）：
1. 【参照基准】对组合整体净值，相对「上一次建仓（或最近一次再平衡）时的净值」计算涨跌幅；
2. 【触发条件】任一交易日收盘后，若组合净值相对参照下跌 ≥ 5%，则于次日开盘全部清仓；
3. 【检查频率】每个交易日收盘后检查（不是仅在再平衡日）；
4. 【重新入场】清仓后，在下一个再平衡日按目标权重重新建仓，并以该日净值重置参照基准；
5. 【成交与成本】清仓与建仓均按次日开盘价成交，单边成本按万分之 X + 印花税（卖出）+ 滑点 Y bp 计；
6. 【验收标准】打印触发次数、每次触发的日期与幅度、清仓期间组合的累计收益、加/不加止损的对比；断言「触发次数 ≤ 3 次/5 年」（否则说明阈值小于日常波动，规则失效）。`,
    rubric: [
      { point: '① 至少 4 项缺失信息，且含「参照基准」与「重新入场」两个核心项', score: 3 },
      { point: '② 用本节具体数字（41.93% vs −5.66%，53pp）说明参照基准缺失的后果', score: 2 },
      { point: '② 说明「成交价/跳空」与「成本」的后果', score: 2 },
      { point: '③ 5 条条款覆盖参照/触发/频率/入场/成本，且可执行', score: 4 },
      { point: '③ 给出可检查的验收标准（含触发次数上限这类断言）', score: 2 },
    ],
    keywords: ['参照基准', '重新入场', '成交价', '成本', '验收', '触发次数'],
    explanation: '这道题是第 1 章 spec 思想的实战应用。评分重点在①——能不能识别出「5% 止损」这句看似完整的话里，其实有 5-6 个空白。',
  },
  {
    id: 'quant-xquant-c5-l2-e9', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c5-l2', tags: ['U', '止损'],
    question: '止损能防止市场下跌带来的损失。',
    answer: false,
    explanation: '止损不能防止下跌，它只能在「下跌持续且单边」时减少损失；在快速暴跌后 V 型反弹时，它会在最低点附近卖出，让你错过反弹（反而加大损失）。Kaminski & Lo (2014) 有严格论证。',
  },
  {
    id: 'quant-xquant-c5-l2-e10', type: 'fill', difficulty: 3,
    relatedLessonId: 'quant-xquant-c5-l2', tags: ['K', '止损'],
    question: '「参照建仓价」的止损保护的是______（不让盈利单变成亏损单）；「参照历史峰值」的止损保护的是______（不让浮盈变少），但后者极其敏感、容易反复触发。',
    blanks: [['本金', '本金安全'], ['利润', '已实现/浮动利润', '浮盈']],
    explanation: '两者保护的对象不同，所以不是「哪个更好」的问题，而是「你想保护什么」的问题。选择后必须写进 spec。',
  },
  {
    id: 'quant-xquant-c5-l2-e11', type: 'single', difficulty: 4,
    relatedLessonId: 'quant-xquant-c5-l2', tags: ['U', '止损'],
    question: '本节「参照峰值 5%」在 5 年里触发 61 次。这个数字最能说明什么？',
    options: [
      { value: 'a', text: '阈值（5%）小于该组合的日常回撤幅度，规则变成了噪声交易器' },
      { value: 'b', text: '这段数据特别糟糕' },
      { value: 'c', text: '止损规则天然无效' },
      { value: 'd', text: '应该把检查频率改成每月一次' },
    ],
    answer: 'a',
    explanation: '该组合年化波动 7.75%，5% 的回撤在正常波动范围内。「从峰值回落 5%」平均每月都会发生一两次，所以触发 61 次（约每年 12 次）是必然的。合理阈值应显著大于日常波动（例如 15%+，本节 15% 版本触发 0 次）。',
  },
  {
    id: 'quant-xquant-c5-l2-e12', type: 'code', difficulty: 4,
    relatedLessonId: 'quant-xquant-c5-l2', tags: ['D', '止损'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `stop_report()`：对 `basis in ("entry","peak")` × `stop in (None, 0.05, 0.10, 0.15)` 的 8 种组合跑止损模拟，返回 DataFrame（索引为 "basis|stop" 字符串，列含 `tot`、`mdd`、`exits`）。',
    starterCode: `
def stop_report():
    pass

print(stop_report())`,
    expectedOutput: '8 行对照表',
    tests: `
df = stop_report()
assert len(df) == 8, f"应有 8 行，实际 {len(df)}"
for c in ("tot", "mdd", "exits"):
    assert c in df.columns, f"缺少列 {c}"
assert "entry|0.05" in df.index and "peak|0.05" in df.index, f"索引格式不对: {list(df.index)[:3]}"
assert abs(df.loc["entry|0.05", "tot"] - 45.11) < 0.2, "entry 5% 应约 41.93%"
assert df.loc["peak|0.05", "exits"] >= 50, "peak 5% 触发应 50+"
assert df.loc["entry|None", "exits"] == 0, "不止损触发应为 0"`,
    answer: `
def sim_stop(stop=None, basis="entry", freq=21):
    cols = list("ABC"); w = pd.Series(1/3, index=cols)
    nav = 1.0; peak = 1.0; nav_entry = 1.0; inpos = True; res = []; exits = 0
    for i, d in enumerate(RET.index):
        if i % freq == 0:
            if not inpos:
                inpos = True; nav_entry = nav
            w = pd.Series(1/3, index=cols)
            peak = max(peak, nav)
            res.append(0.0)
            continue
        if not inpos:
            res.append(0.0); continue
        rv = RET.loc[d]; pr = float((w * rv).sum()); nav *= (1 + pr); res.append(pr)
        peak = max(peak, nav)
        g = w * (1 + rv); ss = g.sum()
        if ss > 0: w = g / ss
        ref = peak if basis == "peak" else nav_entry
        if stop is not None and nav / ref - 1 <= -stop:
            inpos = False; exits += 1
    return pd.Series(res, index=RET.index), exits

def stop_report():
    rows = {}
    for basis in ("entry", "peak"):
        for stop in (None, 0.05, 0.10, 0.15):
            s, exits = sim_stop(stop=stop, basis=basis)
            m = metrics(s)
            rows[f"{basis}|{stop}"] = {"tot": round(m["tot"], 2),
                                       "mdd": round(m["mdd"], 2), "exits": exits}
    return pd.DataFrame(rows).T`,
    explanation: '这道题把你对「参照点」的理解做成一张完整的对照表。注意索引用 "basis|stop" 的字符串形式，便于用 loc 精确取行——这是「可检查」的一种实现方式（断言可以用字符串索引直接定位）。',
  },
  {
    id: 'quant-xquant-c5-l2-e13', type: 'judge', difficulty: 4,
    relatedLessonId: 'quant-xquant-c5-l2', tags: ['U', '方法'],
    question: '如果在 8 种止损配置里发现「参照峰值 + 15%」的收益最高，就应该采用它作为正式规则。',
    answer: false,
    explanation: '这是典型的参数扫描 + 取最优，会直接导致过拟合（第 2 章已演示：试 24 个参数的冠军在样本外失效）。正确做法是：先按「触发次数是否合理」「是否优于不止损」等逻辑判据筛选，再做样本外验证，而不是取单一最大值。',
  },

  /* ═══════════ l3：止盈（10 题）═══════════ */
  {
    id: 'quant-xquant-c5-l3-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c5-l3', tags: ['K', '止盈'],
    question: '止盈的本质是？',
    options: [
      { value: 'a', text: '用「放弃潜在上涨」换「避免回吐」，不是免费的保护' },
      { value: 'b', text: '锁定利润，没有任何代价' },
      { value: 'c', text: '降低交易成本' },
      { value: 'd', text: '提高组合波动率' },
    ],
    answer: 'a',
    explanation: '卖出后你就退出了后续上涨。如果标的继续涨到 60%，你的 20% 止盈就主动放弃了 40% 的收益。这笔交换划不划算，取决于收益分布形态。',
  },
  {
    id: 'quant-xquant-c5-l3-e2', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c5-l3', tags: ['K', '止盈'],
    question: '本节实测（含 −10% 止损）：不止盈累计 ______%，止盈 10% 累计 ______%（最差），止盈 20% 累计 ______%，止盈 30% 与不止盈相同。这说明阈值效应是______的（填「单调」或「非单调」）。',
    blanks: [['42.07', '42.1'], ['35.38'], ['38.45'], ['非单调']],
    explanation: '41.61% → 38.27% → 34.30% → 41.61%，先降后升。原因是保护效应与错失效应都随阈值提高而减弱，中等阈值区间错失占上风。',
  },
  {
    id: 'quant-xquant-c5-l3-e3', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c5-l3', tags: ['U', '止盈'],
    question: '止盈阈值越低越安全，因为它能更早锁定利润。',
    answer: false,
    explanation: '本节实测 10% 止盈最差（+38.27% vs 不止盈 +41.61%）。太低会频繁触发，把仓位变成「进进出出」，既付成本又错过涨幅。阈值太低和太高都不好，存在一个「最差区间」。',
  },
  {
    id: 'quant-xquant-c5-l3-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c5-l3', tags: ['U', '止盈'],
    question: '为什么止盈的阈值效应是非单调的？',
    options: [
      { value: 'a', text: '保护效应（避免回吐）随阈值提高而减弱' },
      { value: 'b', text: '错失效应（错过后续上涨）随阈值提高而减弱' },
      { value: 'c', text: '中等阈值区间错失效应占上风，所以出现凹陷' },
      { value: 'd', text: '因为代码有 bug' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: '两个方向相反的效应同时减弱，相对强弱会变化，因此曲线不是单调的。这个现象的方法论含义是：加规则的效果可能随参数「变号」，试几个参数得到的结论不可信。',
  },
  {
    id: 'quant-xquant-c5-l3-e5', type: 'code', difficulty: 3,
    relatedLessonId: 'quant-xquant-c5-l3', tags: ['D', '止盈'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `sim_take(take=None, stop=0.10, freq=21)`：等权组合，参考「上次建仓净值」，涨到 `take` 则清仓，跌到 `-stop` 则清仓，清仓后于下一再平衡日买回。返回 `(日收益 Series, 触发次数)`。',
    starterCode: `
def sim_take(take=None, stop=0.10, freq=21):
    pass

for tp in (None, 0.10, 0.20, 0.30):
    s, n = sim_take(take=tp)
    print(tp, round(metrics(s)["tot"], 2), n)`,
    expectedOutput: 'None 42.07 1 / 0.10 35.38 5 / 0.20 38.45 3 / 0.30 42.07 2',
    tests: `
res = {}
for tp in (None, 0.10, 0.20, 0.30):
    s, n = sim_take(take=tp); res[tp] = (metrics(s)["tot"], n)
assert abs(res[None][0] - 42.07) < 0.2, f"不止盈应约 41.61%，实际 {res[None][0]}"
assert abs(res[0.10][0] - 35.38) < 0.2, f"10% 应约 38.27%，实际 {res[0.10][0]}"
assert abs(res[0.20][0] - 38.45) < 0.3, f"20% 应约 34.30%，实际 {res[0.20][0]}"
assert abs(res[0.30][0] - 42.07) < 0.3, f"30% 应约 41.61%，实际 {res[0.30][0]}"
# 非单调
assert res[0.10][0] < res[0.20][0] < res[None][0], "应呈非单调（10% 最差 → 20% 回升 → 不止盈最好）"`,
    answer: `
def sim_take(take=None, stop=0.10, freq=21):
    cols = list("ABC"); w = pd.Series(1/3, index=cols)
    nav = 1.0; nav_entry = 1.0; inpos = True; res = []; trig = 0
    for i, d in enumerate(RET.index):
        if i % freq == 0:
            if not inpos:
                inpos = True; nav_entry = nav
            w = pd.Series(1/3, index=cols)
            res.append(0.0)
            continue
        if not inpos:
            res.append(0.0); continue
        rv = RET.loc[d]; pr = float((w * rv).sum()); nav *= (1 + pr); res.append(pr)
        g = w * (1 + rv); s = g.sum()
        if s > 0: w = g / s
        chg = nav / nav_entry - 1
        if stop is not None and chg <= -stop:
            inpos = False; trig += 1
        elif take is not None and chg >= take:
            inpos = False; trig += 1
    return pd.Series(res, index=RET.index), trig`,
    explanation: '注意「触发后于下一再平衡日买回」这个逻辑：清仓期间返回 0 收益，再平衡日重置 nav_entry。这个「重置」正是止盈改变后续止损行为的机制（规则相互干扰）。',
  },
  {
    id: 'quant-xquant-c5-l3-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c5-l3', tags: ['U', '止盈'],
    question: '「让利润奔跑，截断亏损」这条经验法则在什么情况下会失效？',
    options: [
      { value: 'a', text: '在均值回复（涨跌交替）的市场里，涨多了就该卖，法则会反过来' },
      { value: 'b', text: '任何情况下都不会失效' },
      { value: 'c', text: '只在加密货币市场失效' },
      { value: 'd', text: '只要用了止损就不会失效' },
    ],
    answer: 'a',
    explanation: '这条法则成立的前提是「趋势会延续」（动量效应）。在均值回复市场里，涨多了反而该卖——那时「止盈」才是正确动作。所以它是经验，不是定理。',
  },
  {
    id: 'quant-xquant-c5-l3-e7', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c5-l3', tags: ['D', '研究设计'],
    question: '有一个交易者说：「我的策略是赚 20% 就走，亏 10% 就止损，这样稳赚不赔。」请回答：\n① 用本课程的数据检验这句话的每一半（止盈 20%、止损 10%）；\n② 指出「稳赚不赔」的逻辑漏洞（至少 3 个）；\n③ 如果这个组合（止盈 20% + 止损 10%）真的在回测中表现不错，你会怎么进一步检验？',
    referenceAnswer: `
① 用本节数据检验两半：
- **止盈 20%**：本节实测（含 −10% 止损）累计 +34.30%，而**不止盈**是 +41.61%。也就是说「赚 20% 就走」在这段数据上**降低了收益 3.62pp**。原因：卖在上涨途中，错失后续涨幅。
- **止损 10%**（参照建仓价）：本节实测 +41.61%（触发 1 次），而不止损是 +41.69%（触发 0 次）——即 10% 阈值在这段数据上几乎不触发，等于没设。5% 阈值才有效（+41.93%）。
- 合起来：「止盈 20% + 止损 10%」= +34.30%，**低于什么都不做**（+41.69%）。

② 「稳赚不赔」的逻辑漏洞（≥3）：
- **忽略胜率**：止盈 20%、止损 10% 的赔率是 2:1，但要赔率有效，胜率必须 > 1/3。如果胜率只有 25%（常见），期望收益仍为负：0.25×20% − 0.75×10% = −2.5%；
- **忽略路径**：策略可能连续多次触发 10% 止损后才有一次 20% 止盈，资金曲线在中间可能已经腰斩；
- **忽略成本**：每次进出都有成本，高换手会蚕食全部优势；
- **忽略样本**：一段回测表现好不代表未来，尤其这种「两条规则都精调过」的组合，过拟合风险极高；
- **「稳赚不赔」本身不可能**：任何有市场暴露的策略在极端行情下都可能亏损，号称「不赔」的策略要么有隐藏风险（如尾部风险、流动性风险），要么在骗人。

③ 进一步检验（如果回测不错）：
- **样本外检验**：按时间 60/40 切分，只跑一次；
- **参数敏感性**：扫描止盈 10-40%、止损 5-20% 的网格，看是高原还是锯齿（如果是锯齿，说明参数是碰巧的）；
- **逐年拆解**：看收益是否集中在某一年、是否有巨亏年份被平均掉；
- **成本压力测试**：把成本从 0 提到 20bp/50bp，看是否还成立；
- **胜率与盈亏比统计**：算出真实胜率，代入期望公式核对；
- **极端行情压力测试**：模拟 2008/2015/2020 式的暴跌，看最大回撤与恢复时间。`,
    rubric: [
      { point: '① 用具体数字检验止盈 20%（34.30% vs 41.61%）与止损 10%（几乎不触发）', score: 3 },
      { point: '② 指出「忽略胜率」这一核心漏洞，并给出期望公式或数值例子', score: 3 },
      { point: '② 至少再指出 2 个漏洞（路径/成本/样本/尾部风险）', score: 2 },
      { point: '③ 至少 4 项进一步检验，含样本外与参数敏感性', score: 2 },
    ],
    keywords: ['胜率', '盈亏比', '期望', '样本外', '参数敏感性', '成本'],
    explanation: '这道题把「止盈止损组合」这个最常见的散户叙事拆开。评分重点在②——能不能用期望公式说明「2:1 赔率不代表稳赚」，这是最关键的认知。',
  },
  {
    id: 'quant-xquant-c5-l3-e8', type: 'fill', difficulty: 3,
    relatedLessonId: 'quant-xquant-c5-l3', tags: ['K', '行为'],
    question: '行为金融学发现投资者卖出盈利资产的意愿远高于卖出亏损资产，这个倾向叫______效应。它的后果是「赢家被过早卖掉、输家被长期持有」，恰好与「让利润______，截断______」相反。',
    blanks: [['处置', 'disposition'], ['奔跑', '跑'], ['亏损']],
    explanation: '处置效应（disposition effect，Shefrin & Statman 1985）解释了为什么人天然偏爱止盈。本节数据的价值之一是提醒你：你对止盈的偏爱可能来自心理，而不是来自数据。',
  },
  {
    id: 'quant-xquant-c5-l3-e9', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c5-l3', tags: ['U', '方法'],
    question: '止盈的参照点用「历史最低净值」和用「建仓价」是一样的，反正都是算涨幅。',
    answer: false,
    explanation: '完全不一样。参照历史最低时，从低点算起的涨幅很容易超过 20%，导致止盈极其频繁地触发（这与止损参照峰值是同构的问题）。参照点必须明确写进 spec。',
  },
  {
    id: 'quant-xquant-c5-l3-e10', type: 'single', difficulty: 4,
    relatedLessonId: 'quant-xquant-c5-l3', tags: ['U', '综合'],
    question: '本章三种规则的效果排序（以本节数据为准）是？',
    options: [
      { value: 'a', text: '止损（参照建仓 5%）只有轻微改善（+0.24pp）；止盈（任何阈值）都未改善甚至变差；再平衡频率在区间内不敏感' },
      { value: 'b', text: '止盈改善最明显，止损有害' },
      { value: 'c', text: '三条规则都大幅改善结果' },
      { value: 'd', text: '三条规则都没有任何影响' },
    ],
    answer: 'a',
    explanation: '实测：止损 5%（建仓参照）+41.93%（优于基准 41.69%）；止盈所有阈值都 ≤ 基准；再平衡 21 vs 63 差 1.83pp（不敏感区间）。这个排序是本章的核心结论，但它只对这段样本成立（第 6-8 章会检验）。',
  },

  /* ═══════════ l4：规则组合（13 题）═══════════ */
  {
    id: 'quant-xquant-c5-l4-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c5-l4', tags: ['K', '综合'],
    question: '为什么「每条规则都调到最优，组合就最优」这个说法是错的？',
    options: [
      { value: 'a', text: '因为规则之间会互相干扰，局部最优不等于全局最优' },
      { value: 'b', text: '因为数学上无法同时优化多个目标' },
      { value: 'c', text: '因为规则不能组合使用' },
      { value: 'd', text: '这个说法是对的' },
    ],
    answer: 'a',
    explanation: '本章列举了三条干扰路径：止损×再平衡（清仓后等再平衡才买回）、止损×止盈（共用建仓基准）、止盈×再平衡（权重不再是 1/3）。改一条规则会改变其他规则的效果。',
  },
  {
    id: 'quant-xquant-c5-l4-e2', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c5-l4', tags: ['K', '综合'],
    question: '本节四条配置：C0 基准 +41.69%、C1 加止损 5% +______%（最好）、C2 止损10%+止盈20% +______%、C3 止损10%+止盈10% +______%。',
    blanks: [['45.11'], ['38.45'], ['35.38']],
    explanation: 'C1 三项指标全优（+41.93%、回撤 −13.69%、夏普 0.88）。但注意 C1 的止损是 5%、C2/C3 是 10%——阈值不同，不能直接把差异归因到「有没有止盈」。',
  },
  {
    id: 'quant-xquant-c5-l4-e3', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c5-l4', tags: ['U', '方法'],
    question: 'C1（加止损 5%）比 C2（止损10%+止盈20%）收益高，所以可以断定「止盈有害」。',
    answer: false,
    explanation: '两者的止损阈值不同（5% vs 10%），存在两个变量。要判断止盈是否有害，必须固定止损阈值再做对照（本节演示正是这么做的：同一止损 10% 下，止盈 20% 使收益从 41.61% 降到 34.30%）。',
  },
  {
    id: 'quant-xquant-c5-l4-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c5-l4', tags: ['U', '综合'],
    question: '本章提到的规则间干扰路径包括？',
    options: [
      { value: 'a', text: '止损清仓后要等下一个再平衡日才买回（止损 × 再平衡）' },
      { value: 'b', text: '止盈重置了建仓基准，改变后续止损的触发条件（止损 × 止盈）' },
      { value: 'c', text: '止盈后权重不再是 1/3，下次再平衡会买入被止盈的资产（止盈 × 再平衡）' },
      { value: 'd', text: '规则之间不会互相影响，各自独立' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 是本节要破除的误解。这三条干扰路径都能改变「单条规则的效果」——所以任何「加一条规则」的评估，都必须在其他规则固定、且顺序合理的条件下做。',
  },
  {
    id: 'quant-xquant-c5-l4-e5', type: 'code', difficulty: 4,
    relatedLessonId: 'quant-xquant-c5-l4', tags: ['D', '综合'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `compare_configs(configs)`：`configs` 是 `[(label, dict(freq, stop, take)), ...]`。对每个配置跑模拟（等权，参照建仓净值，不含成本），返回 DataFrame（索引为 label，列含 `tot`、`mdd`、`sharpe`、`triggers`）。',
    starterCode: `
def compare_configs(configs):
    pass

cfgs = [("C0", dict(freq=21)), ("C1", dict(freq=21, stop=0.05))]
print(compare_configs(cfgs))`,
    expectedOutput: '两行指标表',
    tests: `
cfgs = [
    ("C0 基准", dict(freq=21)),
    ("C1 止损5%", dict(freq=21, stop=0.05)),
    ("C2 止损10+止盈20", dict(freq=21, stop=0.10, take=0.20)),
    ("C3 止损10+止盈10", dict(freq=21, stop=0.10, take=0.10)),
]
df = compare_configs(cfgs)
assert len(df) == 4, f"应有 4 行，实际 {len(df)}"
for c in ("tot", "mdd", "sharpe", "triggers"):
    assert c in df.columns, f"缺少列 {c}"
assert abs(df.loc["C0 基准", "tot"] - 42.15) < 0.3, f"C0 应约 41.69%，实际 {df.loc['C0 基准','tot']}"
assert abs(df.loc["C1 止损5%", "tot"] - 45.11) < 0.3, f"C1 应约 41.93%，实际 {df.loc['C1 止损5%','tot']}"
assert df.loc["C1 止损5%", "tot"] > df.loc["C0 基准", "tot"], "C1 应优于 C0"
assert df.loc["C3 止损10+止盈10", "tot"] < df.loc["C2 止损10+止盈20", "tot"], "10% 止盈应差于 20%"`,
    answer: `
def compare_configs(configs):
    def sim(freq=21, stop=None, take=None):
        cols = list("ABC"); w = pd.Series(1/3, index=cols)
        nav = 1.0; nav_entry = 1.0; inpos = True; res = []; trig = 0
        for i, d in enumerate(RET.index):
            if i % freq == 0:
                if not inpos:
                    inpos = True; nav_entry = nav
                w = pd.Series(1/3, index=cols)
                res.append(0.0)
                continue
            if not inpos:
                res.append(0.0); continue
            rv = RET.loc[d]; pr = float((w * rv).sum()); nav *= (1 + pr); res.append(pr)
            g = w * (1 + rv); s = g.sum()
            if s > 0: w = g / s
            chg = nav / nav_entry - 1
            if stop is not None and chg <= -stop:
                inpos = False; trig += 1
            elif take is not None and chg >= take:
                inpos = False; trig += 1
        return pd.Series(res, index=RET.index), trig

    rows = {}
    for label, kw in configs:
        s, trig = sim(**kw); m = metrics(s)
        rows[label] = {"tot": round(m["tot"], 2), "mdd": round(m["mdd"], 2),
                       "sharpe": round(m["ann"] / m["vol"], 2), "triggers": trig}
    return pd.DataFrame(rows).T`,
    explanation: '这道题把本章三条规则整合成一个可复用的对照框架。注意 triggers 列必须统计「止损+止盈」的总触发次数——它同时是「阈值是否合理」的体检指标。',
  },
  {
    id: 'quant-xquant-c5-l4-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c5-l4', tags: ['U', '方法'],
    question: '本章得出的「决策层级影响量级」从大到小是？',
    options: [
      { value: 'a', text: '选标的 > 权重方法 > 规则参数' },
      { value: 'b', text: '规则参数 > 权重方法 > 选标的' },
      { value: 'c', text: '权重方法 > 选标的 > 规则参数' },
      { value: 'd', text: '三者影响完全一样' },
    ],
    answer: 'a',
    explanation: '实测：选标的 63pp（等权 vs 单押 B）、权重方法 183pp（等权 vs 动量排名）、规则参数 10pp（C1 vs C3）。所以应该先做对高杠杆决策。反过来（先精调规则、标的随便选）是新手最常见的时间浪费。',
  },
  {
    id: 'quant-xquant-c5-l4-e7', type: 'open', difficulty: 5,
    relatedLessonId: 'quant-xquant-c5-l4', tags: ['D', '综合'],
    question: '你要为一个已有策略（等权三资产，21 日再平衡）增加规则。现在有三个候选：A. 加 5% 止损（参照建仓）；B. 加 20% 止盈；C. 把频率改成 63 天。\n\n请回答：\n① 设计一个能可靠判断「该加哪条」的实验方案（至少 6 步）；\n② 说明如何避免「同时加两条导致的归因混乱」；\n③ 如果三条都「有效」，你会怎么排序？依据是什么？\n④ 这个实验有什么无法解决的根本局限？',
    referenceAnswer: `
① 实验方案（≥6 步）：
1. **建立严格基线**：等权、21 日再平衡、无止损无止盈，记录全部指标（收益/波动/回撤/夏普/换手）；
2. **单变量对照**：分别只改 A、只改 B、只改 C，各自与基线对比（一次只改一个）；
3. **统计增量**：对每个改动计算「相对基线的增量」（收益率 pp、回撤变化、夏普变化、换手变化）；
4. **加成本重跑**：单边 10bp（或真实费率），看增量是否仍为正；
5. **参数敏感性**：对每条规则扫多个参数（止损 3/5/10/15%、止盈 10/20/30/40%、频率 5/21/63/252），判断是高原还是锯齿；
6. **样本外验证**：按时间 60/40 切分（或 Walk-forward），在训练段选、测试段验（只用一次）；
7. **分段检验**：把样本切成 3-5 段，看增量在每段是否都为正（还是只靠某一年）。

② 避免归因混乱的方法：
- **严格单变量**：每次只改一个规则，其他全部固定（包括止损阈值！本章 C1 vs C2 的教训就是阈值不同导致无法归因）；
- **固定顺序**：如果最终要加多条，先分别测单条，再按「增量从大到小」的顺序逐条加入，每次加入后重测全部指标（因为规则会互相干扰）；
- **记录交互**：明确记录「加了 B 之后，A 的增量从 X 变成 Y」——这个变化本身就是交互效应；
- **用同一基线**：所有对比都必须以「当前配置」为基线，不能一部分对比无规则基线、一部分对比有规则基线。

③ 排序依据：
按**稳健性优先，其次增量大小**排序：
1. 首先排除**不稳健**的（参数敏感性为锯齿、或样本外为负增量的）——哪怕它的样本内增量最大；
2. 在稳健的候选里，优先选**增量大且换手增加少**的（换手是成本与容量的代理）；
3. 若增量相近，优先选**逻辑更简单、参数更少**的（避免规则负担）；
4. 最后考虑**与现有规则冲突最小**的（例如若现已有止损，止盈会重置基准，冲突较大）。
基于本章数据的具体排序示例：C（频率 63 天，增量 +1.83pp 且换手降低、参数不敏感）> A（止损 5%，增量 +2.96pp 但依赖参照点选择）> B（止盈，增量 −3.62pp，应排除）。

④ 根本局限：
- **只有一段历史**：无论怎么切分，都是同一段数据的不同部分。若市场结构变化（regime shift），所有结论都可能失效；
- **无法排除「样本内恰好有利」**：参数敏感性高原、分段一致都提高了置信度，但不能证明未来有效；
- **无法覆盖未发生的情形**：例如从没出现过的流动性危机；
- **容量与执行未知**：回测假设能成交，真实规模下可能不行；
- **心理执行未知**：你能不能真的在最大回撤时照规则执行，数据无法回答。
所以最终的结论必须是「**在这段样本上、在这些假设下，A 比 B 更值得进一步小仓位试运行**」，而不是「A 更好」。`,
    rubric: [
      { point: '① 至少 6 步，含「严格基线」「单变量对照」「加成本」「参数敏感性」「样本外」', score: 4 },
      { point: '② 明确「每次只改一个」并引用本章 C1 vs C2 的教训', score: 2 },
      { point: '② 提出「记录交互效应（A 的增量随 B 变化）」', score: 2 },
      { point: '③ 排序依据含「稳健性优先于增量大小」', score: 2 },
      { point: '④ 至少指出 3 项根本局限（含「只有一段历史」与「心理执行」）', score: 2 },
    ],
    keywords: ['基线', '单变量', '交互', '稳健性', '样本外', '容量', 'regime shift'],
    explanation: '这是全课程到本章为止最高阶的研究设计题。评分重点在③——能不能把「稳健性」放在「增量大小」之前，这是从「会做实验」到「会做决策」的分界线。',
  },
  {
    id: 'quant-xquant-c5-l4-e8', type: 'fill', difficulty: 3,
    relatedLessonId: 'quant-xquant-c5-l4', tags: ['K', '检查'],
    question: '规则上线前的五项检查：参照点、触发______、阈值敏感性、______影响、与已有规则的关系。',
    blanks: [['频率', '次数'], ['成本']],
    explanation: '五项检查对应本章的全部教训：参照点（止损 53pp 差异）、触发频率（60 次 = 噪声交易）、阈值敏感性（止盈非单调）、成本（换手决定）、规则冲突（止损×止盈）。',
  },
  {
    id: 'quant-xquant-c5-l4-e9', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c5-l4', tags: ['U', '方法'],
    question: '本章所有结论（止损有效、止盈无效、63 天优于 21 天）都可以直接用于实盘。',
    answer: false,
    explanation: '全部基于一段合成数据的样本内比较。第 2 章已演示过这种「样本内结论」在样本外失效的幅度（冠军参数跑输基准 10.59pp）。必须经过第 6-8 章的四个视角体检、过拟合检查与样本外验证。',
  },
  {
    id: 'quant-xquant-c5-l4-e10', type: 'single', difficulty: 4,
    relatedLessonId: 'quant-xquant-c5-l4', tags: ['U', '综合'],
    question: '如果必须在本章三条规则里只保留一条，最合理的理由是？',
    options: [
      { value: 'a', text: '保留增量最大且逻辑最简单、参数最少的（如「频率改 63 天」），因为复杂度和过拟合风险随之增加' },
      { value: 'b', text: '保留回测收益最高的那条，不管复杂度' },
      { value: 'c', text: '保留触发次数最多的那条' },
      { value: 'd', text: '三条都要，规则越多越精细' },
    ],
    answer: 'a',
    explanation: 'b 是纯样本内最大化（过拟合）；c 恰好相反（触发多说明阈值不合理）；d 会带来规则负担（第 8 章实测：规则从 1 条加到 5 条，样本内涨、样本外跌）。a 体现了「简单 + 稳健」优先的工程判断。',
  },
  {
    id: 'quant-xquant-c5-l4-e11', type: 'code', difficulty: 4,
    relatedLessonId: 'quant-xquant-c5-l4', tags: ['D', '检查'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `rule_checklist(report_row)`：输入一个 dict（含 `tot`、`mdd`、`triggers`、`turnover`），返回问题列表（list[str]），按本章五项检查判定：\n1. `triggers > 20` → "触发过频（阈值可能小于日常波动）"；\n2. `mdd < -20` → "回撤过深"；\n3. `turnover > 10` → "换手过高（成本敏感）"；\n4. `tot < 0` → "收益为负"；\n无问题返回空列表。',
    starterCode: `
def rule_checklist(report_row):
    pass

print(rule_checklist({"tot": 45.11, "mdd": -11.86, "triggers": 2, "turnover": 1.3}))
print(rule_checklist({"tot": -8.01, "mdd": -25.0, "triggers": 60, "turnover": 30}))`,
    expectedOutput: '[] 与 4 条问题',
    tests: `
ok = {"tot": 45.11, "mdd": -11.86, "triggers": 2, "turnover": 1.3}
assert rule_checklist(ok) == [], f"合格配置应无问题，实际 {rule_checklist(ok)}"

bad = {"tot": -8.01, "mdd": -25.0, "triggers": 60, "turnover": 30}
issues = rule_checklist(bad)
assert len(issues) == 4, f"应有 4 条问题，实际 {len(issues)}: {issues}"
assert any("触发" in s for s in issues), "应检出触发过频"
assert any("换手" in s for s in issues), "应检出换手过高"
assert any("收益" in s for s in issues), "应检出收益为负"

mid = {"tot": 10.0, "mdd": -22.0, "triggers": 5, "turnover": 2.0}
m2 = rule_checklist(mid)
assert len(m2) == 1 and "回撤" in m2[0], f"应只报回撤过深，实际 {m2}"`,
    answer: `
def rule_checklist(report_row):
    issues = []
    if report_row.get("triggers", 0) > 20:
        issues.append("触发过频（阈值可能小于日常波动）")
    if report_row.get("mdd", 0) < -20:
        issues.append("回撤过深")
    if report_row.get("turnover", 0) > 10:
        issues.append("换手过高（成本敏感）")
    if report_row.get("tot", 0) < 0:
        issues.append("收益为负")
    return issues`,
    explanation: '这是「五项检查」的代码化。注意 .get 的默认值：缺字段时不应误报。阈值（20 次/−20%/10 倍）是经验值，实际使用时应该按标的波动与策略换手特征调整——但「有检查」比「阈值最优」重要得多。',
  },
  {
    id: 'quant-xquant-c5-l4-e12', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c5-l4', tags: ['D', '综合'],
    question: '请把本章 4 节的核心认知压缩成一份「可以贴在自己工位上」的检查清单（不超过 10 条）。要求：每条都必须是**可执行的动作**（不是「要注意风险」这类空话），并说明它防住哪种具体事故。',
    referenceAnswer: `
示例清单（10 条，每条 = 动作 + 防住的事故）：

1. **spec 里写清规则的参照点**（止损相对建仓价还是峰值）→ 防「同一句 5% 止损指向两个相反策略」（本节实测差 53pp）。
2. **先算触发次数，再看收益** → 防「阈值小于日常波动导致噪声交易」（本节参照峰值 5% 触发 61 次，收益 −5.66%）。
3. **任何规则都用单变量对照**（一次只改一个）→ 防「同时改两个导致无法归因」（本章 C1 vs C2 的教训）。
4. **加成本重跑一遍再下结论** → 防「高换手策略的优势是成本前幻觉」（第 4 章动量 4.94pp）。
5. **扫描参数看形态，不看最大值** → 防「把锯齿的唯一高点当成最优」（止盈非单调就是典型）。
6. **先确认高杠杆决策，再优化低杠杆**（标的 → 权重 → 规则）→ 防「在 10pp 量级的维度上花掉全部时间」。
7. **每条规则都写清「失效条件」与对应监控** → 防「规则过期后继续使用」（第 9 章主题）。
8. **保留完整参数分布表，不只看最优值** → 防「销毁判断是否噪声的唯一证据」。
9. **建立严格基线并冻结**（等权 + 固定频率 + 无规则）→ 防「基线漂移导致所有对比失效」。
10. **所有结论都标注样本范围与「未做样本外检验」** → 防「把样本内结论当未来承诺」。

补充（若允许超过 10 条）：
11. **规则数量控制在 2-3 条以内** → 防规则负担（第 8 章：规则从 1 加到 5，样本外反而更差）。
12. **记录每次实验的假设、结果与结论** → 防「三个月后说不清为什么加了这条规则」。`,
    rubric: [
      { point: '至少 8 条，且每条都是可执行动作（不是泛泛而谈的提醒）', score: 4 },
      { point: '每条都说明「防住哪种具体事故」', score: 3 },
      { point: '含「参照点」「触发次数」「单变量对照」「看形态不看最大值」四个本章核心点', score: 2 },
      { point: '含「冻结基线」或「记录实验」这类工程纪律', score: 1 },
    ],
    keywords: ['参照点', '触发次数', '单变量', '形态', '成本', '基线', '失效条件'],
    explanation: '这道题要求把知识转化为可执行纪律。判断标准很简单：每一条是否让人「知道下一步该做什么」。如果一条读起来像「要小心」，它就不合格。',
  },
  {
    id: 'quant-xquant-c5-l4-e13', type: 'judge', difficulty: 4,
    relatedLessonId: 'quant-xquant-c5-l4', tags: ['U', '综合'],
    question: '本章证明了「止损有效、止盈无效」是一条普遍规律，可以推广到所有市场和策略。',
    answer: false,
    explanation: '这只是「在这段合成数据、这个等权组合、这些具体参数下」的观察。止损的有效性取决于下跌的时间结构（Kaminski & Lo 2014），止盈的取决于收益分布形态（趋势市 vs 均值回复）。换市场、换标的、换参数都可能反转结论。',
  },
];

export const quantXquantC5ExercisesAll = quantXquantC5Exercises;
