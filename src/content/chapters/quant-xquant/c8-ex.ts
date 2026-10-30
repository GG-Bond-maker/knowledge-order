import type { Exercise } from '../../../types';

/* c8 习题：难度 2/3/3/4 → 8/10/10/13，共 41 题。 */

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

export const quantXquantC8Exercises: Exercise[] = [
  /* ═══════════ l1：整手取整（8 题）═══════════ */
  {
    id: 'quant-xquant-c8-l1-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c8-l1', tags: ['K', '执行'],
    question: 'A 股的最小交易单位（买入）是？',
    options: [
      { value: 'a', text: '100 股（一手）' },
      { value: 'b', text: '1 股' },
      { value: 'c', text: '10 股' },
      { value: 'd', text: '1000 股' },
    ],
    answer: 'a',
    explanation: 'A 股买入必须整手（100 股），卖出可以零股；美股最小单位是 1 股。这个制度差异直接决定了取整偏差的量级——同样 1 万元，100 股整手的偏差是 1 股的约 100 倍。',
  },
  {
    id: 'quant-xquant-c8-l1-e2', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c8-l1', tags: ['K', '执行'],
    question: '本节实测（1 万元、A 股 100 股整手、目标 1/3）：实际权重 32.00%/33.00%/33.00%，最大偏差 ______pp，现金残余 ______元（占 ______%）。',
    blanks: [['1.33'], ['200'], ['2.00', '2']],
    explanation: '1/3 × 10000 = 3333.33 元，A 价格 4.000，一手 400 元 → 800 股 = 3200 元（32.00%）；B 3300 股 = 3300 元；C 1100 股 = 3300 元。合计投入 9800 元，剩 200 元（2.00%）。',
  },
  {
    id: 'quant-xquant-c8-l1-e3', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c8-l1', tags: ['U', '执行'],
    question: '取整偏差会让组合的收益变差。',
    answer: false,
    explanation: '本节实测：1 万元 + 100 股整手的累计收益 42.61%，反而比理想（无约束）的 41.70% 高 0.91pp——因为取整让它长期少配了 A（这段样本里表现最差）。偏差的方向是随机的，正确表述是「偏差带来不确定性」。',
  },
  {
    id: 'quant-xquant-c8-l1-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c8-l1', tags: ['U', '执行'],
    question: '关于取整偏差与现金残余，下列说法正确的有？',
    options: [
      { value: 'a', text: '两者都按 1/资金 衰减：资金 ×10，占比 ÷10' },
      { value: 'b', text: '股数必须向下取整，不能四舍五入' },
      { value: 'c', text: '现金残余是不产生收益的资金，是「隐形损失」' },
      { value: 'd', text: '只要策略足够好，取整偏差就会自动消失' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 是错的：取整偏差来自制度约束，与策略好坏无关。本节实测 1 万→10 万→100 万，100 股整手的平均偏差 1.910pp→0.264pp→0.028pp，正是 1/C 衰减。四舍五入会让总花费超过现金，导致委托被拒。',
  },
  {
    id: 'quant-xquant-c8-l1-e5', type: 'code', difficulty: 2,
    relatedLessonId: 'quant-xquant-c8-l1', tags: ['D', '执行'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `round_orders(cash, px, weights, lot)`：按目标权重把资金翻译成整手股数。返回 `(lots, spent, idle)`，其中 `lots` 是 dict（键为 A/B/C）、`spent` 是实际投入金额、`idle` 是剩余现金。股数必须**向下取整**到 lot 的整数倍。注意 `px` 传入的是 `PX.iloc[i]`（价格带浮点尾数），断言请用容差而非精确相等。',
    starterCode: `
def round_orders(cash, px, weights, lot):
    pass

px = PX.iloc[0]
print(round_orders(10000, px, EW, 100))`,
    expectedOutput: "{'A': 800, 'B': 3300, 'C': 1100} 约 9800 元，约 200 元残余",
    tests: `
px = PX.iloc[0]
lots, spent, idle = round_orders(10000, px, EW, 100)
assert lots == {"A": 800, "B": 3300, "C": 1100}, f"股数不对: {lots}"
assert abs(spent - 9800.0) < 0.05, f"投入金额应约 9800 元: {spent}"
assert abs(idle - 200.0) < 0.05, f"残余应约 200 元: {idle}"
assert abs(spent + idle - 10000) < 1e-6, "投入 + 残余必须等于资金"

# 1 股最小单位
lots1, spent1, idle1 = round_orders(10000, px, EW, 1)
assert lots1["A"] == 833 and lots1["B"] == 3333 and lots1["C"] == 1111, f"1 股模式不对: {lots1}"
assert idle1 < 10, f"1 股模式残余应极小: {idle1}"

# 资金越大偏差越小：100 万 + 100 股，残余占比应低于 0.05%
lots2, spent2, idle2 = round_orders(1000000, px, EW, 100)
assert idle2 / 1000000 < 0.0005, f"100 万残余占比应 < 0.05%: {idle2/1000000}"

# 必须向下取整，不能超过现金
assert spent <= 10000 + 1e-9, "投入金额不得超过资金"`,
    answer: `
def round_orders(cash, px, weights, lot):
    lots = {a: int(np.floor(cash * weights[a] / px[a] / lot)) * lot for a in ["A", "B", "C"]}
    spent = sum(lots[a] * px[a] for a in ["A", "B", "C"])
    return lots, spent, cash - spent`,
    explanation: '关键是 `np.floor(...) * lot` 这两步：先除以 lot 得到「几手」，向下取整，再乘回 lot。少了第一步就直接对股数取整，得到的不是 lot 的整数倍。另外 `spent` 必须用实际股数 × 价格算，不能用 cash × weights 的和。注意 PX 的价格带浮点尾数（首日 A=4.0000000…），所以断言用容差。',
  },
  {
    id: 'quant-xquant-c8-l1-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c8-l1', tags: ['U', '执行'],
    question: '本节实测：1 万元 + 100 股整手在中段（2023-09-11）的现金残余是 4.37%，而首日是 2.00%。差异的主要原因是？',
    options: [
      { value: 'a', text: '中段的价格不是整手金额的整数倍，取整损失更大' },
      { value: 'b', text: '中段的资金变少了' },
      { value: 'c', text: '中段的波动率更高' },
      { value: 'd', text: '代码有 bug' },
    ],
    answer: 'a',
    explanation: '首日价格恰好是 4.000/1.000/3.000（合成数据起点），取整很「干净」；中段价格 2.644/1.303/3.133 都不是整百的倍数，每只标的的零头都更大，残余从 200 元涨到 436.8 元。这是「价格不是整手金额整数倍」时的常态。',
  },
  {
    id: 'quant-xquant-c8-l1-e7', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c8-l1', tags: ['D', '研究设计'],
    question: '你要给一个小资金账户（1 万元）设计等权三标的策略。请回答：\n① 列出「最小交易单位」会给这个账户带来哪些具体问题（至少 3 个，带数字）；\n② 给出至少 3 种应对方案，并说明各自的代价；\n③ 你会怎么把这件事写进 spec（至少 4 条可检查的条款）？',
    referenceAnswer: `
① 具体问题（≥3，带本节数字）：
1. **权重失真**：目标 1/3，实际只能做到 32.00%/33.00%/33.00%（首日），中段更是 31.73%/32.57%/31.33%（偏差 2.00pp）。你以为持有等权，实际是「A 低配 + 现金」的另一个组合。
2. **现金拖累**：中段残余 436.8 元 = 4.37% 的资金完全不产生收益。5 年下来这笔「闲置税」不可忽略。
3. **资金门槛**：三标的各一手最少需要 1200 元（A 一手 400 元 × 3）。低于这个数，「等权三标的」在数学上无解。
4. **偏差不可归因**：每次再平衡偏差方向随机，复盘时无法区分「策略表现差」还是「取整恰好不利」。

② 应对方案（≥3）与代价：
1. **降低标的数量**（只买 1-2 只）：偏差归零（1 只时 100% 满仓），但放弃分散化——第 3 章实测分散化能把波动从 11% 降到 8%。
2. **改用阈值再平衡**（偏离超 5% 才调仓）：减少取整次数（62 次 → 约 15 次），代价是权重漂移更大，组合风险特征偏离设计。
3. **残余现金归集**：每次把零头投给「一手金额最小」的标的，能把平均闲置从 1.084% 降到接近 0；代价是多一次小额交易（若券商有最低佣金 5 元，反而更贵）。
4. **换用 1 股最小单位的市场**（美股/部分 ETF）：偏差直接降到 0.03pp；代价是汇率、税、交易时段。
5. **接受它，但写进 spec 并在复盘中剔除**：不改变执行，只改变解释方式；代价是必须额外记录「实际权重」序列。

③ spec 条款（≥4，可检查）：
1. 【最小交易单位】按交易所规定：A 股 100 股、美股 1 股；本策略取 100。
2. 【取整规则】股数 = floor(目标金额 / (价格 × lot)) × lot，一律向下取整，禁止四舍五入。
3. 【记录要求】每次再平衡必须同时记录「目标权重」与「实际权重」两列，并计算 max|实际 − 目标|。
4. 【验收标准】平均权重偏差 ≤ 1.0pp、平均闲置 ≤ 1.0%；超过则必须改用残余归集或阈值再平衡。
5. 【资金门槛】账户资金 < 1200 元时，不得启用「等权三标的」，须改为两标的或单标的方案。`,
    rubric: [
      { point: '① 至少 3 个问题，且带本节具体数字（1.33pp / 2.00pp / 4.37% / 1200 元）', score: 3 },
      { point: '① 提到「资金门槛 1200 元」或「偏差不可归因」这类深层问题', score: 2 },
      { point: '② 至少 3 种方案，且每种都说清代价（不是只说好处）', score: 3 },
      { point: '③ 至少 4 条 spec 条款，含取整规则与验收阈值', score: 3 },
    ],
    keywords: ['最小交易单位', '取整', '现金残余', '资金门槛', '验收', '实际权重'],
    explanation: '评分重点在②——能不能意识到「每个方案都有代价」。只说「用美股就没问题」是半个答案，必须说出它的代价（汇率/税/时段）。',
  },
  {
    id: 'quant-xquant-c8-l1-e8', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c8-l1', tags: ['U', '执行'],
    question: '只要资金足够大（比如 100 万），取整偏差就可以完全忽略。',
    answer: true,
    explanation: '本节实测：100 万 + 100 股整手的平均权重偏差 0.028pp、平均闲置 0.017%、与理想的收益差 0.03pp——确实可忽略。但注意这是 100 股整手的情形；如果换成一手金额更高的标的（如股价 500 元的股票，一手 5 万元），门槛会相应提高。',
  },

  /* ═══════════ l2：成交价（10 题）═══════════ */
  {
    id: 'quant-xquant-c8-l2-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c8-l2', tags: ['K', '执行'],
    question: '在五种成交价假设中，通常最乐观（最容易高估收益）的是？',
    options: [
      { value: 'a', text: '收盘价成交' },
      { value: 'b', text: '次日开盘成交' },
      { value: 'c', text: '次日最高成交' },
      { value: 'd', text: '次日最低成交' },
    ],
    answer: 'a',
    explanation: '收盘价假设让「决策」和「成交」发生在同一时刻——等于假设你能看到收盘价再下单，而现实中收盘价出来时市场已经关了。它等价于一个前视偏差的变体。',
  },
  {
    id: 'quant-xquant-c8-l2-e2', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c8-l2', tags: ['K', '执行'],
    question: '本节实测：等权策略五种成交价的极差（带宽）是 ______pp；动量策略是 ______pp。带宽相差约 ______ 倍，说明成交价假设的重要性由______决定。',
    blanks: [['0.19'], ['13.51'], ['70'], ['换手', '换手率']],
    explanation: '等权换手 2.38，带宽 0.19pp；动量换手 47.4，带宽 13.51pp。带宽差 70 倍，而换手差 20 倍——成交价假设的影响随换手放大。',
  },
  {
    id: 'quant-xquant-c8-l2-e3', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c8-l2', tags: ['U', '执行'],
    question: '用「次日最高价成交」来回测更保守、更安全。',
    answer: false,
    explanation: '不成立。本节实测：等权里「次日最高」给出 41.83%（比收盘价 41.70% 更高），动量里「次日最高」给出 221.81%（比收盘价 226.40% 更低）。方向取决于策略，不能靠直觉判断哪种假设保守。',
  },
  {
    id: 'quant-xquant-c8-l2-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c8-l2', tags: ['U', '执行'],
    question: '关于「成交价假设」，下列说法正确的有？',
    options: [
      { value: 'a', text: '五种模式是同一个策略的五种记账方式，不是五个策略' },
      { value: 'b', text: '带宽（最好与最差的差）是比单点更有信息量的表述' },
      { value: 'c', text: '回测报告必须写明用了哪个成交价假设' },
      { value: 'd', text: '应该选五种里收益最高的那个作为业绩' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 是典型的「挑最好看的数字」。五种模式的意义是量化不确定性，不是给你挑选空间。正确做法是：选一个贴近现实的（次日开盘），并报告带宽。',
  },
  {
    id: 'quant-xquant-c8-l2-e5', type: 'code', difficulty: 3,
    relatedLessonId: 'quant-xquant-c8-l2', tags: ['D', '执行'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `fill_price(i, mode)`：返回第 i 日决策、第 i+1 日成交时各资产的成交价（Series，索引 A/B/C）。支持五种模式：\n- `"close"`：决策价本身\n- `"open"`：`P0 * (1+r)**0.35`\n- `"mid"`：`(P0 + open) / 2`\n- `"high"`：`P1 * (1 + 0.5*|r|)`\n- `"low"`：`P1 * (1 - 0.5*|r|)`\n其中 P0 = PX.iloc[i]、P1 = P0*(1+r)、r = RET.iloc[i+1]。',
    starterCode: `
def fill_price(i, mode):
    pass

for m in ("close", "open", "mid", "high", "low"):
    p = fill_price(0, m)
    print(m, round(p["A"], 4))`,
    expectedOutput: 'close 4.0 / open 约 4.0088 / mid 约 4.0044 / high 约 4.0251 / low 约 3.9749',
    tests: `
for i in (0, 500, 900):
    P0 = PX.iloc[i]; r = RET.iloc[i + 1]; P1 = P0 * (1 + r)
    op = P0 * (1 + r) ** 0.35
    assert (fill_price(i, "close") - P0).abs().max() < 1e-9, "close 应等于 P0"
    assert (fill_price(i, "open") - op).abs().max() < 1e-9, "open 公式不对"
    assert (fill_price(i, "mid") - (P0 + op) / 2).abs().max() < 1e-9, "mid 公式不对"
    assert (fill_price(i, "high") - P1 * (1 + 0.5 * r.abs())).abs().max() < 1e-9, "high 公式不对"
    assert (fill_price(i, "low") - P1 * (1 - 0.5 * r.abs())).abs().max() < 1e-9, "low 公式不对"
    # 大小关系：low <= P1 <= high
    assert (fill_price(i, "low") <= P1 + 1e-9).all(), "low 必须 <= 次日收盘"
    assert (fill_price(i, "high") >= P1 - 1e-9).all(), "high 必须 >= 次日收盘"
    # open 必须介于 P0 与 P1 之间
    lo = np.minimum(P0, P1); hi = np.maximum(P0, P1)
    assert ((fill_price(i, "open") >= lo - 1e-9) & (fill_price(i, "open") <= hi + 1e-9)).all(), "open 应介于 P0 与 P1"`,
    answer: `
def fill_price(i, mode):
    P0 = PX.iloc[i]
    r = RET.iloc[i + 1]
    op = P0 * (1 + r) ** 0.35
    if mode == "close": return P0
    if mode == "open":  return op
    if mode == "mid":   return (P0 + op) / 2
    if mode == "high":  return P0 * (1 + r) * (1 + 0.5 * r.abs())
    if mode == "low":   return P0 * (1 + r) * (1 - 0.5 * r.abs())
    raise ValueError(mode)`,
    explanation: '指数 0.35 是本节声明的教学近似：真实开盘只反映隔夜跳空（约占当日涨跌一小部分），用 0.5（走完一半）会高估。注意 `mid` 是「决策价与次日开盘的中点」，不是买卖价差的中点。',
  },
  {
    id: 'quant-xquant-c8-l2-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c8-l2', tags: ['U', '执行'],
    question: '为什么「成交价假设」对动量策略（换手 47.4）的影响远大于等权（换手 2.38）？',
    options: [
      { value: 'a', text: '因为动量每次调仓要换掉约 78% 的仓位，等权只换 4%，成交价偏差被放大 20 倍' },
      { value: 'b', text: '因为动量策略的标的波动更大' },
      { value: 'c', text: '因为等权没有成交价' },
      { value: 'd', text: '因为动量策略的代码更复杂' },
    ],
    answer: 'a',
    explanation: '成交价偏差是按「成交额」累积的。动量每次调仓平均调整 78% 的仓位（几乎推翻重来），等权只调整 4%（微调）。成交额差 20 倍，偏差自然被放大。',
  },
  {
    id: 'quant-xquant-c8-l2-e7', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c8-l2', tags: ['D', '研究设计'],
    question: '你的同事说：「回测用收盘价成交就行，反正只是差一点。」请回答：\n① 用本节数字说明「差一点」到底差多少（分低换手与高换手两种情况）；\n② 为什么收盘价假设在方法论上有问题（不只是「差一点」）；\n③ 如果你要说服他改，你会让他做哪一个最小的实验？',
    referenceAnswer: `
① 差多少（用本节数字）：
- **低换手（等权，换手 2.38）**：收盘价 41.70%，五种假设全部落在 41.70%~41.89%，带宽只有 **0.19pp**。这种情况下他说得对——确实「只是差一点」。
- **高换手（动量，换手 47.4）**：收盘价 226.40%，次日最低 212.89%，带宽 **13.51pp**。从收盘价换成次日开盘掉 3.23pp；如果再叠成本（下一节），总落差 25.47pp。这种情况下「差一点」是 13pp 级别的错误。
- 结论：**这个说法对错取决于换手**。换手 < 5 时它是可忽略的噪声；换手 > 40 时它是结论级别的变量。

② 方法论问题（不只是量级）：
- 收盘价假设让「决策」与「成交」发生在同一时刻，等价于假设你能看到收盘价再下单。现实中收盘价出来时市场已关闭——**这是一个前视偏差的变体**。
- 它使回测结果**不可被实盘复现**：无论你怎么优化执行，都不可能达到「收盘价成交」的理想状态。用这个假设做出来的业绩预期，从一开始就不可实现。
- 它会让「参数选择」建立在错误基准上：你在收盘价假设下挑出的最优参数，在次日开盘假设下可能不是最优。

③ 最小实验（一次说服）：
让他在同一份代码里只改一个参数（成交价模式），跑出「收盘价 vs 次日开盘」两个结果，并打印差值。
- 如果他的策略是等权：差值 0.02pp（41.70% vs 41.72%）——他会说「看，我说得对」。这时你应该承认这一点，并把结论限定为「低换手策略可以忽略」。
- 如果他的策略是动量：差值 3.23pp（226.40% vs 223.17%）——这个数字通常足以让他同意改口径。
关键：**不要用「方法论上不对」说服人，用他自己策略的那个数字说服他。**`,
    rubric: [
      { point: '① 分别给出低换手（0.19pp）与高换手（13.51pp）的带宽，并指出「结论取决于换手」', score: 4 },
      { point: '② 指出收盘价假设等价于前视偏差的变体（决策与成交同时发生）', score: 3 },
      { point: '② 提到「回测结果不可被实盘复现」这一后果', score: 2 },
      { point: '③ 给出一个最小可执行实验（只改一个参数、打印差值）', score: 2 },
    ],
    keywords: ['带宽', '换手', '前视偏差', '可复现', '次日开盘', '0.19pp', '13.51pp'],
    explanation: '评分重点在①——能不能承认「对低换手策略他确实说对了」。只会说「收盘价假设是错的」是教条；能说出「在什么条件下它可忽略」才是判断力。',
  },
  {
    id: 'quant-xquant-c8-l2-e8', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c8-l2', tags: ['U', '执行'],
    question: '在本节实测中，「次日最低」假设让动量策略的收益从 226.40% 降到 212.89%，说明这个假设对买入方不利。',
    answer: false,
    explanation: '「次日最低」对买入方其实**有利**（买得更便宜）。它让整体收益变差，是因为动量调仓是双向的（一边卖一边买），而卖出时「次日最低」给你的是当天最低价。买入的优惠被卖出的损失抵消，且卖出量往往更大（要腾现金买入），所以净效应为负。',
  },
  {
    id: 'quant-xquant-c8-l2-e9', type: 'fill', difficulty: 3,
    relatedLessonId: 'quant-xquant-c8-l2', tags: ['K', '执行'],
    question: '本课程把「次日开盘」近似为 $P_0(1+r)^{______}$，而不是 $(1+r)^{0.5}$，因为真实的开盘价主要反映隔夜跳空，只走完当日涨跌的一小部分。',
    blanks: [['0.35']],
    explanation: '这是明确声明的教学近似。取 0.5 会高估开盘的偏离幅度（相当于假设开盘就走完当日一半涨跌）。0.35 让「次日开盘」介于「收盘」与「次日收盘」之间且偏保守。',
  },
  {
    id: 'quant-xquant-c8-l2-e10', type: 'single', difficulty: 4,
    relatedLessonId: 'quant-xquant-c8-l2', tags: ['U', '执行'],
    question: '如果只能报告一个数字来描述「成交价假设带来的不确定性」，最合适的是？',
    options: [
      { value: 'a', text: '五种假设下的收益带宽（极差），并注明各假设的具体值' },
      { value: 'b', text: '五种假设下的收益平均值' },
      { value: 'c', text: '收盘价假设下的收益（最乐观的那个）' },
      { value: 'd', text: '次日最低假设下的收益（最保守的那个）' },
    ],
    answer: 'a',
    explanation: 'b 会掩盖分布形状（五种模式不是随机抽样，平均没有意义）；c 是自欺；d 是过度悲观。带宽 + 明细既给出不确定性的量级，又保留了可复核的原始数据。',
  },

  /* ═══════════ l3：成本层叠（10 题）═══════════ */
  {
    id: 'quant-xquant-c8-l3-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c8-l3', tags: ['K', '成本'],
    question: '在 A 股，印花税的收取方式是？',
    options: [
      { value: 'a', text: '按成交额固定比例，只在卖出时收' },
      { value: 'b', text: '按成交额固定比例，买卖都收' },
      { value: 'c', text: '按笔固定金额' },
      { value: 'd', text: '按持有时间收' },
    ],
    answer: 'a',
    explanation: '印花税只在卖出时收（本节取 5bp），佣金买卖都收。这个方向性差异很重要：如果代码里买卖都收印花税，会高估成本约一倍。',
  },
  {
    id: 'quant-xquant-c8-l3-e2', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c8-l3', tags: ['K', '成本'],
    question: '本节实测（动量，次日开盘成交）四层台阶：L0 无成本 223.17%、L1 加佣金 219.35%、L2 加印花税 ______%、L3 加滑点 200.93%。相对 L0 的总侵蚀是 ______pp。',
    blanks: [['215.58'], ['22.24']],
    explanation: '四层台阶：223.17% → 219.35%（佣金 −3.82pp）→ 215.58%（印花税 −3.77pp）→ 200.93%（滑点 −14.65pp）。滑点这一层吃掉最多。',
  },
  {
    id: 'quant-xquant-c8-l3-e3', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c8-l3', tags: ['U', '成本'],
    question: '同样四层成本，对高换手与低换手策略的侵蚀量级差不多。',
    answer: false,
    explanation: '本节实测：动量侵蚀 46.23pp（20.71%），等权侵蚀 0.32pp（0.76%）——差 144 倍。物理根源是每次调仓的幅度：动量 78%，等权 4%。',
  },
  {
    id: 'quant-xquant-c8-l3-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c8-l3', tags: ['U', '成本'],
    question: '关于成本层叠，下列说法正确的有？',
    options: [
      { value: 'a', text: '滑点应作用在成交价上（买价上浮、卖价下调），而不是简单扣一笔钱' },
      { value: 'b', text: '成本要逐次调仓扣，不能期初一次扣完' },
      { value: 'c', text: '换手是成本敏感度的主要解释变量' },
      { value: 'd', text: '压力测试（成本翻倍）通常不影响结论' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 是错的：本节压力测试（5+5+25）让动量从 223.17% 掉到 176.94%，侵蚀 46.23pp，占累计收益 20.71%——结论的量级完全变了。成本翻 2-3 倍就吃掉五分之一收益，说明这类策略的安全边际很薄。',
  },
  {
    id: 'quant-xquant-c8-l3-e5', type: 'code', difficulty: 3,
    relatedLessonId: 'quant-xquant-c8-l3', tags: ['D', '成本'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `cost_of_turnover(turnover, years, fee_bps, tax_bps, slip_bps, sell_ratio=0.5)`：估算年化成本率（%，单利近似）。公式：\n`年化成本% = (turnover / years) × (fee_bps + slip_bps + tax_bps × sell_ratio) / 100`\n其中 turnover 是累计换手（倍数）、sell_ratio 是卖出占成交额的比例。',
    starterCode: `
def cost_of_turnover(turnover, years, fee_bps, tax_bps, slip_bps, sell_ratio=0.5):
    pass

print(round(cost_of_turnover(47.4, 5, 2.5, 5, 10), 3))
print(round(cost_of_turnover(2.38, 5, 2.5, 5, 10), 3))`,
    expectedOutput: '1.422 / 0.071',
    tests: `
c_mom = cost_of_turnover(47.4, 5, 2.5, 5, 10)
c_ew = cost_of_turnover(2.38, 5, 2.5, 5, 10)
assert abs(c_mom - 1.422) < 0.01, f"动量年化成本应约 1.422%，实际 {c_mom}"
assert abs(c_ew - 0.071) < 0.005, f"等权年化成本应约 0.071%，实际 {c_ew}"
assert c_mom > c_ew * 10, "动量成本应远高于等权"

# 边界：零换手 -> 零成本
assert cost_of_turnover(0, 5, 2.5, 5, 10) == 0, "零换手应零成本"
# 卖出比例为 0 时不收印花税
c_no_tax = cost_of_turnover(47.4, 5, 2.5, 5, 10, sell_ratio=0.0)
assert abs(c_no_tax - (47.4 / 5) * (2.5 + 10) / 100) < 0.01, f"无印花税情形不对: {c_no_tax}"
assert c_no_tax < c_mom, "无印花税成本应更低"`,
    answer: `
def cost_of_turnover(turnover, years, fee_bps, tax_bps, slip_bps, sell_ratio=0.5):
    return (turnover / years) * (fee_bps + slip_bps + tax_bps * sell_ratio) / 100`,
    explanation: '这个公式是「单利近似」，用来快速估算量级，不是精确值（精确值要靠完整回测）。动量的年化成本 1.422%，5 年单利约 7.1%，但实测侵蚀 22.24pp——差异来自复利与「成本按净值比例扣、而净值本身在增长」。',
  },
  {
    id: 'quant-xquant-c8-l3-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c8-l3', tags: ['U', '成本'],
    question: '为什么四层成本中「滑点」这一层吃掉的最多（14.65pp）？',
    options: [
      { value: 'a', text: '因为它的费率最大（10bp，是佣金的 4 倍），且买卖都收' },
      { value: 'b', text: '因为滑点只在卖出时收，卖出量更大' },
      { value: 'c', text: '因为滑点的代码有 bug' },
      { value: 'd', text: '因为滑点不随换手变化' },
    ],
    answer: 'a',
    explanation: '佣金 2.5bp 双边、印花税 5bp 仅卖出、滑点 10bp 双边。滑点费率是佣金的 4 倍且买卖都收，所以最大。这也是为什么「用限价单/分批下单降低滑点」是执行优化的首要方向。',
  },
  {
    id: 'quant-xquant-c8-l3-e7', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c8-l3', tags: ['D', '成本'],
    question: '某策略回测（不含成本）年化 25%、换手 47.4、夏普 2.54。上线前你要做成本评估。请回答：\n① 用本节数据，给出四层成本下的预期收益，并指出哪一层最大；\n② 如果实际成本是预期的 3 倍，收益会变成多少？这个策略还能上吗？\n③ 给出至少 3 种降低成本的方法，并说明每种方法的代价。',
    referenceAnswer: `
① 四层成本下的预期（本节实测，动量策略）：
- L0 无成本：223.17%（年化 25.53%，夏普 2.54）
- L1 +佣金 2.5bp：219.35%（侵蚀 3.82pp）
- L2 +印花税 5bp（卖）：215.58%（累计侵蚀 7.59pp）
- L3 +滑点 10bp：200.93%（累计侵蚀 22.24pp，占累计收益 9.97%）
- 最大的一层是**滑点**（14.65pp），因为费率是佣金的 4 倍且买卖都收。
- 年化从 25.53% 降到 23.81%，夏普 2.54 → 2.38。仍然可观。

② 成本 3 倍（压力测试 L4：佣金 5 + 印花税 5 + 滑点 25）：
- 累计 176.94%，年化 21.83%，夏普 2.19。
- 侵蚀 46.23pp，占累计收益 **20.71%**。
- **能不能上**：能，但必须满足两个条件——① 你相信这段样本的 25% 年化能在样本外保留至少一半（第 7 章的过拟合检查）；② 你能承受「成本吃掉五分之一收益」这个事实，且实盘滑点不超过 25bp。如果滑点超过 25bp，这个策略的优势会迅速消失。
- 关键判断：成本 3 倍时夏普仍有 2.19，说明策略的**安全边际主要来自收益水平本身**，而不是成本控制。

③ 降低成本的方法与代价：
1. **降低换手**（延长再平衡周期、加缓冲区/阈值）：本节实测 63 天频率换手 1.96（vs 21 天 2.38），成本下降；代价是权重漂移更大、对市场变化反应更慢。对动量策略，拉长周期会削弱动量捕捉能力（第 4 章的动量衰减）。
2. **改成交方式**（限价单/分批下单/VWAP）：降低滑点；代价是可能部分不成交（机会成本），且需要更多工程实现。
3. **降低调仓幅度**（部分调仓：每次只把权重往目标移动 50%）：成本近似减半；代价是跟踪误差变大，组合偏离设计意图。
4. **选流动性更好的标的**（大市值 ETF 而非小盘股）：滑点更低；代价是可选标的池变窄，可能牺牲 alpha。
5. **提高单笔金额下限**（合并小额调仓）：减少笔数；代价是持仓精度下降，且受券商最低佣金 5 元的约束。`,
    rubric: [
      { point: '① 给出四层成本下的具体数字，并指出滑点最大（14.65pp）', score: 3 },
      { point: '② 给出成本 3 倍时的数字（176.94% / 侵蚀 20.71%），并做出「能上但要条件」的判断', score: 3 },
      { point: '③ 至少 3 种降本方法，每种都说清代价', score: 3 },
      { point: '③ 提到「降低换手会削弱动量捕捉能力」这类二阶效应', score: 2 },
    ],
    keywords: ['四层成本', '滑点', '压力测试', '换手', '安全边际', '20.71%'],
    explanation: '评分重点在②——能不能在「成本翻 3 倍」这个压力下做出判断。只说「成本很高」不够，必须给出「还能不能上、需要什么条件」的结论。',
  },
  {
    id: 'quant-xquant-c8-l3-e8', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c8-l3', tags: ['U', '成本'],
    question: '成本按「期初一次性扣减」和「每次调仓逐笔扣减」，对 5 年期的动量策略结果影响不大。',
    answer: false,
    explanation: '影响巨大。动量 5 年 61 次调仓、每次平均调整 78% 的仓位。期初一次性扣减会漏掉后续 60 次收费，低估侵蚀一个数量级。本节实测的 46.23pp 侵蚀正是逐笔累积出来的。',
  },
  {
    id: 'quant-xquant-c8-l3-e9', type: 'fill', difficulty: 3,
    relatedLessonId: 'quant-xquant-c8-l3', tags: ['K', '成本'],
    question: '本节实测的「每次调仓平均调整仓位」：动量策略 ______%，等权策略 ______%。这个数字是成本敏感度的物理根源。',
    blanks: [['78'], ['4']],
    explanation: '动量每次几乎推翻重来（78%），等权只是微调（4%）。换手差 20 倍（47.4 vs 2.38），满成本下侵蚀差 144 倍（46.23pp vs 0.32pp）——复利把 20 倍放大成 144 倍。',
  },
  {
    id: 'quant-xquant-c8-l3-e10', type: 'single', difficulty: 4,
    relatedLessonId: 'quant-xquant-c8-l3', tags: ['U', '成本'],
    question: '某券商的佣金是「成交额 × 2.5bp，但不低于 5 元」。这个「最低 5 元」对小额调仓的实际费率影响是？',
    options: [
      { value: 'a', text: '小额调仓的实际费率会远高于 2.5bp（例如 2000 元调仓时相当于 25bp）' },
      { value: 'b', text: '没有影响，始终是 2.5bp' },
      { value: 'c', text: '只影响卖出，不影响买入' },
      { value: 'd', text: '只影响大额调仓' },
    ],
    answer: 'a',
    explanation: '5 元 / 2000 元 = 25bp，是名义费率的 10 倍。这解释了为什么小资金策略的实际成本往往远高于回测估计——回测里通常只写一个 bp 数，忽略了最低佣金。',
  },

  /* ═══════════ l4：执行落差（13 题）═══════════ */
  {
    id: 'quant-xquant-c8-l4-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c8-l4', tags: ['K', '执行'],
    question: '执行落差（Implementation Shortfall）指的是？',
    options: [
      { value: 'a', text: '理想回测净值与现实成交净值的差距' },
      { value: 'b', text: '策略的年度亏损' },
      { value: 'c', text: '佣金的总金额' },
      { value: 'd', text: '账户的现金余额' },
    ],
    answer: 'a',
    explanation: '执行落差是从「决策价」到「实际成交价」整条链路的损耗，包括成交价偏差、交易成本、取整偏差、机会成本等。本节实测 25.47pp。',
  },
  {
    id: 'quant-xquant-c8-l4-e2', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c8-l4', tags: ['K', '执行'],
    question: '本节实测（动量）：理想 226.40%、次日开盘无成本 223.17%、含全部成本 200.93%。其中成交价假设贡献 ______pp、交易成本贡献 ______pp，合计落差 ______pp。',
    blanks: [['3.23', '-3.23'], ['22.24', '-22.24'], ['25.47', '-25.47']],
    explanation: '分层：226.40% → 223.17%（−3.23pp，成交价）→ 200.93%（−22.24pp，成本）。成本占 87%，所以优化顺序是「先降换手，再谈成交价」。',
  },
  {
    id: 'quant-xquant-c8-l4-e3', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c8-l4', tags: ['U', '执行'],
    question: '平均滑点只有 +0.013%，说明这套策略的执行没有问题。',
    answer: false,
    explanation: '本节实测：均值 +0.013%，但 25% 的笔数超过 0.3%，最大单笔 +0.66%，绝对值合计 25.51%。均值被正负偏离（65 笔正 / 53 笔负）抵消了，它不告诉你尾部有多深。',
  },
  {
    id: 'quant-xquant-c8-l4-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c8-l4', tags: ['U', '执行'],
    question: '执行报告的四个视图包括？',
    options: [
      { value: 'a', text: '整体对比（理想 vs 现实）' },
      { value: 'b', text: '63 日滚动落差（判断持续收费 vs 事故）' },
      { value: 'c', text: '逐笔对账与滑点分布（均值 vs 尾部）' },
      { value: 'd', text: '账户的持仓截图' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 不是分析视图。四视图的价值在于分层：整体给量级、滚动给性质（持续还是突发）、逐笔给归因（哪笔最贵）、分布给风险（尾部多深）。',
  },
  {
    id: 'quant-xquant-c8-l4-e5', type: 'code', difficulty: 3,
    relatedLessonId: 'quant-xquant-c8-l4', tags: ['D', '执行'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `slip_stats(slips)`：输入逐笔偏离（百分比列表），返回 dict，含 `n`（笔数）、`mean`、`median`、`p95`（95 分位，用 `np.percentile`）、`max_abs`（绝对值最大）、`n_over_03`（|偏离| > 0.3% 的笔数）。所有数值保留 3 位小数（笔数为整数）。',
    starterCode: `
def slip_stats(slips):
    pass

print(slip_stats([0.1, -0.2, 0.66, -0.64, 0.05]))`,
    expectedOutput: "n=5 mean 约 -0.006 median 0.05 p95 约 0.592 max_abs 0.66 n_over_03=2",
    tests: `
s = slip_stats([0.1, -0.2, 0.66, -0.64, 0.05])
assert s["n"] == 5, f"n 不对: {s['n']}"
assert abs(s["mean"] - (-0.006)) < 0.001, f"mean 不对: {s['mean']}"
assert abs(s["median"] - 0.05) < 0.001, f"median 不对: {s['median']}"
assert abs(s["max_abs"] - 0.66) < 0.001, f"max_abs 不对: {s['max_abs']}"
assert s["n_over_03"] == 2, f"|偏离|>0.3% 应为 2 笔（0.66 与 -0.64）: {s['n_over_03']}"
assert abs(s["p95"] - float(np.percentile([0.1, -0.2, 0.66, -0.64, 0.05], 95))) < 0.001, "p95 应用 np.percentile"

# 空列表不应崩
e = slip_stats([])
assert e["n"] == 0, "空列表 n 应为 0"
assert e["mean"] == 0.0, "空列表 mean 应为 0"`,
    answer: `
def slip_stats(slips):
    a = np.array(slips, dtype=float)
    if len(a) == 0:
        return {"n": 0, "mean": 0.0, "median": 0.0, "p95": 0.0, "max_abs": 0.0, "n_over_03": 0}
    return {"n": int(len(a)),
            "mean": round(float(a.mean()), 3),
            "median": round(float(np.median(a)), 3),
            "p95": round(float(np.percentile(a, 95)), 3),
            "max_abs": round(float(np.abs(a).max()), 3),
            "n_over_03": int((np.abs(a) > 0.3).sum())}`,
    explanation: '这道题的重点是「同时报告均值和尾部指标」。只报 mean 会得出「滑点不存在」的错误结论；加上 p95、max_abs、n_over_03 才看得到风险。空列表要显式处理，否则 mean 会返回 nan。',
  },
  {
    id: 'quant-xquant-c8-l4-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c8-l4', tags: ['U', '执行'],
    question: '63 日滚动落差的「日变化标准差」只有 0.0549%，这个数字说明？',
    options: [
      { value: 'a', text: '落差是平稳累积的「持续收费」，不是某一次执行事故' },
      { value: 'b', text: '落差很小，可以忽略' },
      { value: 'c', text: '策略没有成本' },
      { value: 'd', text: '数据有问题' },
    ],
    answer: 'a',
    explanation: '如果某一天落差突然跳 3pp，日变化标准差会很大，那说明有事故（大单成交价严重偏离或代码 bug）。标准差极小说明落差来自「每一笔都收一点」的持续收费——这是可预算的，不是可修复的 bug。',
  },
  {
    id: 'quant-xquant-c8-l4-e7', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c8-l4', tags: ['D', '执行'],
    question: '你上线了一个策略，回测累计 226.40%，实盘跑了 1 年只做到 15%（同期回测 24%）。请回答：\n① 你会按什么顺序排查（至少 4 步）？\n② 每一步用什么判据区分「正常落差」与「异常」？\n③ 如果排查完发现一切正常，你下一步做什么？',
    referenceAnswer: `
① 排查顺序（≥4 步，由外到内）：
1. **执行落差总量**：算出「理想回测 vs 实盘」的累计落差，并和上线前的预估对比（本节预估每年 5.09pp）。实盘 15% vs 回测 24% = 落差 9pp，**明显高于预估的 5.09pp** → 需要继续查。
2. **滚动落差形态**：画 63 日滚动落差。判据：日变化标准差小（如 < 0.1%）且单调上升 = 持续收费（可预算）；出现跳变 = 事故。
3. **逐笔对账**：把实盘成交与「按决策价计算的理论成交」逐笔比对，算每笔偏离。判据：看最大 5 笔，如果某一笔偏离 > 2%，那就是它。
4. **滑点分布**：算均值、中位、p95、|偏离|>0.5% 的占比。判据：均值可能接近 0 但 p95 很大 → 尾部问题；如果 p95 也从 0.39% 涨到 1%+，说明市场流动性变了。
5. **分年/分月拆解**：看落差是否集中在某几个月。判据：如果某月落差突增，回去查那个月的市场状态（波动率、成交量）。
6. **代码审查**：检查是否用了未来数据、是否有重复下单、成本参数是否与实际费率一致（尤其最低佣金 5 元）。

② 每步的判据（区分正常 vs 异常）：
- 总量：与预估落差（本节 5.09pp/年）比较。超出 2 倍以上 = 异常。
- 滚动：日变化标准差 < 0.1% 且无跳变 = 正常持续收费；有单日跳变 > 1pp = 事故。
- 逐笔：最大单笔 |偏离| < 1% = 正常；> 2% = 异常（查那笔的成交明细）。
- 分布：p95 < 0.5% = 正常；p95 > 1% = 流动性问题或成交方式问题。
- 分月：落差在各月均匀分布 = 正常；集中在一两个月 = 异常。

③ 如果一切正常，下一步：
- **接受这个落差，并把它写进预期**：实盘预期 = 回测 − 落差（每年 5-9pp）。以后所有决策都基于这个调整后的数字，而不是回测数字。
- **降低换手**：既然成本是主要来源（本节 87%），降低换手是最直接的改善手段（延长再平衡周期、加阈值缓冲）。
- **重新审视策略是否还值得做**：如果调整后的预期（如年化 15%）低于你的机会成本或风险承受要求，正确的决定可能是**停掉它**——这是执行报告最重要的用途。
- **不要做的事**：不要为了「追上回测」而提高杠杆或加大仓位，那只会放大落差。`,
    rubric: [
      { point: '① 至少 4 步，顺序体现「由外到内」（总量 → 滚动 → 逐笔 → 分布 → 代码）', score: 3 },
      { point: '② 每一步都给出可量化的判据（如 p95 < 0.5%、日变 std < 0.1%）', score: 4 },
      { point: '② 明确区分「持续收费」与「事故」两类异常', score: 2 },
      { point: '③ 给出「接受落差 + 降换手 + 重新评估是否值得做」的完整结论', score: 2 },
      { point: '③ 指出「不要为了追回测而加杠杆」这个反面动作', score: 1 },
    ],
    keywords: ['执行落差', '滚动落差', '逐笔对账', 'p95', '持续收费', '事故', '降换手'],
    explanation: '这道题的核心是②——能不能把「排查」变成「有判据的排查」。没有判据的排查就是凭感觉，最后一定得出「可能是市场不好」这种无用的结论。',
  },
  {
    id: 'quant-xquant-c8-l4-e8', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c8-l4', tags: ['U', '执行'],
    question: '把信号整体滞后一个交易日后收益从 226.40% 掉到 191.43%，说明原策略存在前视偏差。',
    answer: false,
    explanation: '这只能说明动量策略对「信号时点」极其敏感（信号晚一天，整个持仓序列就错位了）。判断前视只能靠代码审查：在决策点 i，目标权重只能用到 PX[:i+1]。本节 mom_target 用的是 RAM.loc[:d].iloc[-1]，只到当天，没有前视。',
  },
  {
    id: 'quant-xquant-c8-l4-e9', type: 'fill', difficulty: 3,
    relatedLessonId: 'quant-xquant-c8-l4', tags: ['K', '执行'],
    question: '本节逐笔对账：118 笔成交中，均值 ______%、最大单笔 ______%、|偏离| > 0.3% 的笔数占 ______%。这三个数一起看才完整。',
    blanks: [['0.013', '+0.013'], ['0.66', '+0.66'], ['25', '25%']],
    explanation: '均值 +0.013%（几乎为零）、最大 +0.66%、25% 的笔数超过 0.3%。单看均值会得出「滑点不存在」，三个数一起看才知道「均值无害、尾部致命」。',
  },
  {
    id: 'quant-xquant-c8-l4-e10', type: 'multiple', difficulty: 4,
    relatedLessonId: 'quant-xquant-c8-l4', tags: ['U', '执行'],
    question: '关于「回测收益 − 预估执行落差 = 可承诺的预期」，下列说法正确的有？',
    options: [
      { value: 'a', text: '落差应该按年预算（如每年 5pp），而不是一次性从期末扣掉' },
      { value: 'b', text: '落差会随市场状态变化（波动大的年份更大），不能当常数' },
      { value: 'c', text: '如果实际落差持续超过预估，应该重新评估策略是否值得做' },
      { value: 'd', text: '只要落差在预估范围内，就可以放心把回测数字当预期' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 是错的：即使落差在预估内，回测数字本身也还没经过样本外验证（第 7 章）。正确表述是「回测 → 减执行落差 → 减过拟合衰减 → 才是预期」。',
  },
  {
    id: 'quant-xquant-c8-l4-e11', type: 'code', difficulty: 4,
    relatedLessonId: 'quant-xquant-c8-l4', tags: ['D', '执行'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `exec_report(r_ideal, r_live)`：输入两条日收益 Series，返回 dict，含 `tot_ideal`、`tot_live`、`gap_pp`（落差 pp）、`gap_per_year`（按 5 年折算）、`roll_gap_mean`（63 日滚动落差均值，%）、`max_jump`（滚动落差单日变化的最大绝对值，%）、`verdict`（字符串：`"持续收费"` 若 `max_jump < 1.0`，否则 `"疑似事故"`）。数值保留 3 位小数。',
    starterCode: `
def exec_report(r_ideal, r_live):
    pass

s_ew, _ = simulate(EW)
print(exec_report(s_ew, s_ew))`,
    expectedOutput: "gap_pp=0.0 max_jump=0.0 verdict='持续收费'",
    tests: `
s_ew, _ = simulate(EW)
rep = exec_report(s_ew, s_ew)
assert abs(rep["tot_ideal"] - rep["tot_live"]) < 1e-6, "同一序列落差应为 0"
assert rep["gap_pp"] == 0.0, f"gap_pp 应为 0: {rep['gap_pp']}"
assert rep["verdict"] == "持续收费", f"无落差应判为持续收费: {rep['verdict']}"

# 人为制造持续成本：落差单调累积，但单日不跳变
r_live = s_ew - 0.0002
rep2 = exec_report(s_ew, r_live)
assert rep2["gap_pp"] > 0, "加了成本后落差应 > 0"
assert abs(rep2["gap_per_year"] - rep2["gap_pp"] / 5) < 0.01, "gap_per_year 应约等于 gap_pp/5"
assert rep2["max_jump"] < 1.0, f"均匀成本不应有大跳变: {rep2['max_jump']}"
assert rep2["verdict"] == "持续收费", f"均匀成本应判持续收费: {rep2['verdict']}"

# 人为制造单日事故：某一天额外亏 5%
r_bad = s_ew.copy()
r_bad.iloc[600] = r_bad.iloc[600] - 0.05
rep3 = exec_report(s_ew, r_bad)
assert rep3["max_jump"] > 1.0, f"事故应造成大跳变: {rep3['max_jump']}"
assert rep3["verdict"] == "疑似事故", f"应判为疑似事故: {rep3['verdict']}"`,
    answer: `
def exec_report(r_ideal, r_live):
    eq_i = (1 + r_ideal).cumprod()
    eq_l = (1 + r_live).cumprod()
    gap = eq_i / eq_l - 1
    tot_i = float(eq_i.iloc[-1] - 1) * 100
    tot_l = float(eq_l.iloc[-1] - 1) * 100
    jump = float(gap.iloc[63:].diff().abs().max()) * 100
    return {"tot_ideal": round(tot_i, 3),
            "tot_live": round(tot_l, 3),
            "gap_pp": round(tot_i - tot_l, 3),
            "gap_per_year": round((tot_i - tot_l) / 5, 3),
            "roll_gap_mean": round(float(gap.iloc[63:].mean()) * 100, 3),
            "max_jump": round(jump, 3),
            "verdict": "持续收费" if jump < 1.0 else "疑似事故"}`,
    explanation: '这道题把执行报告的「整体 + 滚动 + 判据」三个视图合成一个函数。关键在 `max_jump`：它问的是「落差曲线有没有突然跳一下」。均匀收费的落差平滑上升（跳变 < 0.4%），单日事故会留下一个 2-5% 的台阶。用「日变化标准差」也能区分，但它对落差量级敏感；用「最大单日跳变」更稳健。',
  },
  {
    id: 'quant-xquant-c8-l4-e12', type: 'single', difficulty: 4,
    relatedLessonId: 'quant-xquant-c8-l4', tags: ['U', '执行'],
    question: '本节的分年落差是 1.11 / 1.84 / 2.60 / 2.27 / 2.49pp。这个分布最能支持哪个结论？',
    options: [
      { value: 'a', text: '每年都有落差且量级相近，说明是持续收费而非某年的事故' },
      { value: 'b', text: '2023 年最高，说明那年出了事故' },
      { value: 'c', text: '落差在缩小，说明执行在改善' },
      { value: 'd', text: '落差与年份无关，可以忽略' },
    ],
    answer: 'a',
    explanation: '如果某一年是 10pp 而其他年份 1pp，那才要去查那年发生了什么。本节 1-2.6pp 的窄幅波动是「持续收费」的又一个证据——它和滚动落差的日变化标准差 0.0549% 互相印证。',
  },
  {
    id: 'quant-xquant-c8-l4-e13', type: 'judge', difficulty: 4,
    relatedLessonId: 'quant-xquant-c8-l4', tags: ['U', '综合'],
    question: '本章证明了「执行落差主要由成本构成（87%）」，所以对所有策略都应该优先优化成本而不是成交价。',
    answer: false,
    explanation: '这个结论只对「换手 47.4 的动量策略」成立。对低换手策略（等权换手 2.38），成本只掉 0.32pp、成交价带宽只有 0.19pp——两者都可忽略，真正该做的是「别把时间花在这里」。优先级永远取决于你自己策略的换手与成本结构。',
  },
];

export const quantXquantC8ExercisesAll = quantXquantC8Exercises;
