import type { Exercise } from '../../../types';

/* c3 习题：难度 2/2/3/3 → 8/8/10/10，共 36 题。setupCode 注入三资产行情。 */

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

export const quantXquantC3Exercises: Exercise[] = [
  /* ═══════════ l1：噪声与信号（8 题）═══════════ */
  {
    id: 'quant-xquant-c3-l1-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c3-l1', tags: ['K', '噪声'],
    question: '在策略研究里，本课程把「噪声」定义为？',
    options: [
      { value: 'a', text: '与策略逻辑无关的价格波动' },
      { value: 'b', text: '任何下跌' },
      { value: 'c', text: '交易成本' },
      { value: 'd', text: '数据的缺失值' },
    ],
    answer: 'a',
    explanation: '噪声 = 与你要研究的信号无关的波动。个股的噪声（财报暴雷、高管变动、行业轮动）远大于宽基 ETF，所以同样的趋势策略在个股上结果更不可解释。',
  },
  {
    id: 'quant-xquant-c3-l1-e2', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c3-l1', tags: ['K', '指标'],
    question: '年化波动率 = 日波动率 × √______（填年交易日数）。本课程 A 沪深300替代的年化波动是 ______%（保留 2 位）。',
    blanks: [['252'], ['11.01', '11']],
    explanation: '乘 √252 而不是 ×252。乘错会让波动率差出约 15 倍，夏普也随之差 15 倍。A 的实测：累计 +0.75%、年化波动 11.01%、最大回撤 −37.23%。',
  },
  {
    id: 'quant-xquant-c3-l1-e3', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c3-l1', tags: ['U', '噪声'],
    question: '因为 ETF 分散了风险，所以 ETF 一定比个股安全、也不会出现大幅回撤。',
    answer: false,
    explanation: 'ETF 分散的是**特有风险**，不分散**系统性风险**。本节实测 A（沪深300替代）的最大回撤仍达 −37.23%。杠杆/行业 ETF 的波动甚至可能超过很多个股。',
  },
  {
    id: 'quant-xquant-c3-l1-e4', type: 'multiple', difficulty: 2,
    relatedLessonId: 'quant-xquant-c3-l1', tags: ['U', '噪声'],
    question: '个股的噪声主要来自哪些方面？',
    options: [
      { value: 'a', text: '公司特有事件（财报暴雷、高管变动、被处罚）' },
      { value: 'b', text: '行业轮动' },
      { value: 'c', text: '流动性不足（小盘股涨跌停、无法成交）' },
      { value: 'd', text: '交易所的服务器故障' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 属于基础设施风险，不在本节讨论范围。a/b/c 都会让「趋势」这个信号被淹没或被事件打断，是高波动的主要来源。',
  },
  {
    id: 'quant-xquant-c3-l1-e5', type: 'code', difficulty: 2,
    relatedLessonId: 'quant-xquant-c3-l1', tags: ['D', '指标'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `snr_table(ret)`：对 `ret` 的每一列计算「信号噪声比」SNR = |累计收益%| / 年化波动%，返回按 SNR 降序排列的 list[tuple 列名, SNR(2 位小数)]。',
    starterCode: `
def snr_table(ret):
    pass

print(snr_table(RET))`,
    expectedOutput: "[('B', 7.52), ('C', 4.03), ('A', 0.07)]",
    tests: `
r = snr_table(RET)
assert isinstance(r, list) and all(isinstance(x, tuple) and len(x) == 2 for x in r), "返回 list[tuple]"
assert [x[0] for x in r] == ["B", "C", "A"], f"排序不对: {r}"
assert abs(r[0][1] - 7.52) < 0.05, f"B 的 SNR 应约 7.52，实际 {r[0][1]}"
assert abs(r[1][1] - 4.03) < 0.05, f"C 的 SNR 应约 4.03，实际 {r[1][1]}"
assert abs(r[2][1] - 0.07) < 0.02, f"A 的 SNR 应约 0.07，实际 {r[2][1]}"`,
    answer: `
def snr_table(ret):
    out = []
    for a in ret.columns:
        m = metrics(ret[a])
        out.append((a, round(abs(m["tot"]) / m["vol"], 2)))
    return sorted(out, key=lambda x: -x[1])`,
    explanation: '注意 SNR 的分子是「累计收益的绝对值」——单边暴跌也会产生高 SNR（方向明确），这不是 bug，而是指标的性质。分母是年化波动，所以必须用 metrics 里的 vol。',
  },
  {
    id: 'quant-xquant-c3-l1-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c3-l1', tags: ['U', '噪声'],
    question: '本节三个标的的 SNR 分别是 0.07 / 7.52 / 4.03，差了约两个数量级。这个事实最直接的含义是？',
    options: [
      { value: 'a', text: '选标的对研究结论的影响，比后续规则调优的影响更大' },
      { value: 'b', text: 'SNR 高的标的永远不该被卖出' },
      { value: 'c', text: 'A 的代码实现有 bug' },
      { value: 'd', text: 'SNR 是学术标准指标，可直接用于选股' },
    ],
    answer: 'a',
    explanation: '这是本节的结论：先找干净的材料（高 SNR、低噪声），再研究策略。d 错在「学术标准」——SNR 是本课程设计的教学直觉工具，不是正式指标。',
  },
  {
    id: 'quant-xquant-c3-l1-e7', type: 'open', difficulty: 3,
    relatedLessonId: 'quant-xquant-c3-l1', tags: ['D', '研究设计'],
    question: '某人说：「我做趋势策略，为了分散风险，同时买 30 只个股，每只 3.3%。」请回答：\n① 从「噪声」角度，这个设计有什么问题？\n② 如果你要反驳「分散 30 只个股就能降低噪声」，你会用什么数据说明？\n③ 给出一个更好的替代方案，并说明它牺牲了什么。',
    referenceAnswer: `
① 问题：
- 30 只个股的**特有噪声不会因数量多而消失**，每只仍是高波动个体，组合后依然是「30 个噪声源叠加」；
- 个股要处理停牌/涨跌停/退市/复权，数据工程成本指数级上升；
- 30 只的筛选过程极容易引入事后挑数据（「我从 5000 只里选了这 30 只」）；
- 趋势策略需要「连续的趋势信号」，个股常被事件打断，信号质量差。

② 反驳用数据：
- 算 30 只个股组合的年化波动 vs 一只宽基 ETF 的年化波动。因为有系统性风险无法分散，组合波动通常仍显著高于 ETF（个股平均波动 30%+，30 只分散后可能仍有 20%+，而 ETF 约 11%）；
- 再算 SNR：个股组合的 SNR 远低于宽基 ETF，说明「方向性被噪声淹没」的问题没解决；
- 可进一步做「个股 vs ETF 上同一均线策略的收益/回撤对比」，展示个股上的结果离散度极大。

③ 更好方案：
- 用宽基 ETF 作为「趋势信号」的载体（噪声低、信号干净）；
- 若要个股暴露，用「指数增强」思路：先定 ETF 作为基准，再在成分股内做小幅偏离，收益归因清晰可拆。
- 牺牲的东西：个股的极端超额收益（小盘股的暴涨机会），以及「选股乐趣」。这是有意识的取舍，不是疏忽。`,
    rubric: [
      { point: '① 指出「30 只个股」仍是 30 个噪声源，特有噪声不因数量消失', score: 3 },
      { point: '① 提到数据工程成本或事后挑数据的风险', score: 2 },
      { point: '② 用波动率或 SNR 的具体对比来说明，而非仅定性描述', score: 3 },
      { point: '③ 替代方案具体（宽基 ETF / 指数增强），并说明牺牲了什么', score: 2 },
    ],
    keywords: ['特有噪声', '系统性风险', '波动率', 'SNR', 'ETF', '指数增强'],
    explanation: '这道题训练的是「把直觉方案量化反驳」的能力。评分重点在②——能不能用一个具体数字（波动率或 SNR）说话，而不是只说「那样不好」。',
  },
  {
    id: 'quant-xquant-c3-l1-e8', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c3-l1', tags: ['U', '偏差'],
    question: '回测时数据源自动剔除了已退市的股票，这不会影响结论，因为退市的是少数。',
    answer: false,
    explanation: '这就是幸存者偏差：退市/暴雷的失败者被系统剔出，回测只看到「活下来的赢家」，收益被系统性高估。方向是固定的（一定偏高），不会因为「少数」而抵消。正确做法是使用 point-in-time 的成分股名单。',
  },

  /* ═══════════ l2：标的池（8 题）═══════════ */
  {
    id: 'quant-xquant-c3-l2-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c3-l2', tags: ['K', '标的池'],
    question: '标的池（universe）的正确定义是？',
    options: [
      { value: 'a', text: '策略允许考虑的投资对象名单，且必须是某一时点的快照' },
      { value: 'b', text: '全市场所有可以买的标的' },
      { value: 'c', text: '我已经持有或准备买入的标的' },
      { value: 'd', text: '回测中收益率最高的那些标的' },
    ],
    answer: 'a',
    explanation: 'd 是最危险的理解——按结果反推池子就是事后挑数据。「时点快照」这一条尤其关键，它防的是幸存者偏差。',
  },
  {
    id: 'quant-xquant-c3-l2-e2', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c3-l2', tags: ['K', '流程'],
    question: '构建标的池的三步流程：提出______ → 转成______ → 留下名单。顺序不可颠倒，尤其不能「先看结果再定名单」。',
    blanks: [['假设'], ['指标', '可计算指标']],
    explanation: '第二步的「指标」就是因子的最朴素形态。三步的核心是让「选择」发生在「看到结果」之前。',
  },
  {
    id: 'quant-xquant-c3-l2-e3', type: 'multiple', difficulty: 2,
    relatedLessonId: 'quant-xquant-c3-l2', tags: ['U', '标的池'],
    question: '标的池作为「第一道风险控制」，能拦截哪些风险？',
    options: [
      { value: 'a', text: '流动性风险（成交额太小无法按回测价成交）' },
      { value: 'b', text: '数据质量风险（停牌频繁、复权混乱）' },
      { value: 'c', text: '逻辑不相关（研究趋势却混入货币基金）' },
      { value: 'd', text: '市场整体下跌的系统性风险' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 拦不住——系统性风险要靠资产配置与对冲处理，不是靠筛选标的。这正好呼应第 3 节「ETF 不分散系统性风险」。',
  },
  {
    id: 'quant-xquant-c3-l2-e4', type: 'single', difficulty: 2,
    relatedLessonId: 'quant-xquant-c3-l2', tags: ['U', '筛选'],
    question: '筛选 ETF 时，下列哪个维度最容易被忽略却最影响实盘？',
    options: [
      { value: 'a', text: 'ETF 的名字好不好记' },
      { value: 'b', text: '流动性（日均成交额与买卖价差）' },
      { value: 'c', text: '发行公司的广告投放量' },
      { value: 'd', text: 'ETF 的成立年限' },
    ],
    answer: 'b',
    explanation: '流动性决定「你能不能按回测价成交」。回测假设你能成交，但成交额小的 ETF 买卖价差可能吃掉大部分超额收益。这是回测与实盘最大的落差来源之一（第 8 章会量化）。',
  },
  {
    id: 'quant-xquant-c3-l2-e5', type: 'code', difficulty: 3,
    relatedLessonId: 'quant-xquant-c3-l2', tags: ['D', '标的池'],
    lang: 'python',
    question: '实现 `screen(cands, threshold=3.5)`：每个候选是一个 dict，含 `code, name, exchange, size, liquidity, represent`（后四项 1-5 分）。返回 `(admitted, rejected)`：\n- 四维平均分 ≥ threshold 的入池，记录里加 `score`（2 位小数）；\n- 其余入 rejected，额外加 `reason` 字符串（列出 size/liquidity/represent 中 < 3 的项的中文原因，用「；」连接）。',
    starterCode: `
def screen(cands, threshold=3.5):
    pass`,
    expectedOutput: "admitted 3 个、rejected 2 个，且 rejected 都带 reason",
    tests: `
cands = [
    dict(code="510300", name="沪深300ETF", exchange=5, size=5, liquidity=5, represent=5),
    dict(code="513100", name="纳指100ETF", exchange=5, size=4, liquidity=4, represent=5),
    dict(code="518880", name="黄金ETF", exchange=5, size=4, liquidity=4, represent=5),
    dict(code="159999", name="小盘主题", exchange=5, size=1, liquidity=2, represent=3),
    dict(code="513999", name="跨境小", exchange=4, size=1, liquidity=1, represent=4),
]
a, r = screen(cands)
assert len(a) == 3 and len(r) == 2, f"应为 3 入池 2 排除，实际 {len(a)}/{len(r)}"
assert all("score" in x for x in a), "入池记录应含 score"
assert [x["score"] for x in a] == [5.0, 4.5, 4.5], f"入池均分应 [5.0, 4.5, 4.5]，实际 {[x['score'] for x in a]}"
assert all(x.get("reason") for x in r), "被排除的必须有 reason"
assert "规模" in r[0]["reason"] and "流动" in r[0]["reason"], f"reason 内容不对: {r[0]['reason']}"
# 阈值放宽后应全部入池
a2, r2 = screen(cands, threshold=1.0)
assert len(a2) == 5 and len(r2) == 0, "阈值 1.0 时应全部入池"`,
    answer: `
def screen(cands, threshold=3.5):
    admitted, rejected = [], []
    for c in cands:
        score = (c["exchange"] + c["size"] + c["liquidity"] + c["represent"]) / 4
        rec = dict(c, score=round(score, 2))
        if score >= threshold:
            admitted.append(rec)
        else:
            reasons = []
            if c["size"] < 3:
                reasons.append("规模过小(清盘风险)")
            if c["liquidity"] < 3:
                reasons.append("流动性不足(无法按回测价成交)")
            if c["represent"] < 3:
                reasons.append("代表性不足")
            rec["reason"] = "；".join(reasons)
            rejected.append(rec)
    return admitted, rejected`,
    explanation: '这道题的工程价值在于「reason 必须具体」：只写「不合格」的筛选日志等于没写。后续你自己回看时，要能立刻知道为什么当初排除了它。',
  },
  {
    id: 'quant-xquant-c3-l2-e6', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c3-l2', tags: ['U', '偏差'],
    question: '标的池越大越好，因为选择越多，策略越可能找到机会。',
    answer: false,
    explanation: '池子越大，需要做的多重检验越多（试的标的越多，偶然找到「好标的」的概率越高），数据质量问题也成倍增加。入门阶段 3-5 个标的足够；扩大池子必须配套更严格的检验（第 8 章）。',
  },
  {
    id: 'quant-xquant-c3-l2-e7', type: 'open', difficulty: 3,
    relatedLessonId: 'quant-xquant-c3-l2', tags: ['D', '标的池'],
    question: '请为「研究中国市场的行业轮动」这个课题设计一个标的池，要求：\n① 写出你的核心假设（一句话）；\n② 给出把假设变成可计算指标的具体做法（至少 2 个指标）；\n③ 列出标的池的四个必备字段并填上你认为合适的值；\n④ 指出这个池子最可能引入的 2 个偏差及防范措施。',
    referenceAnswer: `
① 核心假设示例：
「A 股行业间的相对强弱存在可持续的轮动，且轮动主要受盈利预期差驱动，因此在行业 ETF 层面做动量轮动可获得超额收益。」

② 可计算指标（≥2 个）：
- 行业 ETF 的 N 日收益率（动量）；
- 行业 ETF 的年化波动率（用于风险调整动量 RAM = 动量/波动）；
- 行业指数的盈利预期修正（若数据可得，属于基本面因子）；
- 行业成交额占比（资金流向代理指标）。
每个指标都必须能落到具体数据源与计算口径。

③ 四个必备字段：
- symbols：例如 ["512480"(半导体), "512880"(证券), "515030"(新能源车), "512690"(酒), "512800"(银行)] 等；
- roles：每个标的对应哪个行业（必须与「行业轮动」逻辑一致，不能混入宽基）；
- as_of_date："2021-01-04"（回测起点前，确保不用未来名单）；
- weights_hint：等权（1/N）作为初始假设，明确「权重的正式方法留到后续实验确定」。
（加分：excluded 记录被排除的行业及原因，如「该行业 ETF 上市晚于回测起点」）

④ 两个最可能的偏差：
- **幸存者偏差**：用当前存续的行业 ETF 名单回测过去，忽略了已清盘/合并的产品。防范：使用 point-in-time 名单，或明确声明「本研究只覆盖存续产品」。
- **前视偏差**：行业分类或成分股用的是今天的信息。防范：锁定分类版本的时点，或在 spec 中写明「分类采用某年某版」。
（可加分：选择偏差——先看到哪个行业涨得好再定池子。防范：池子定义在看结果之前写进 spec。）`,
    rubric: [
      { point: '① 假设可用一句话检验，且与「行业轮动」直接相关', score: 2 },
      { point: '② 至少 2 个指标可计算、有明确口径', score: 3 },
      { point: '③ 四个字段齐全且取值合理（尤其 as_of_date 要早于回测起点）', score: 3 },
      { point: '④ 指出幸存者偏差或前视偏差，并给出可操作的防范措施', score: 2 },
    ],
    keywords: ['假设', '动量', '波动率', 'as_of_date', '幸存者偏差', '前视偏差'],
    explanation: '评分重点是③的 as_of_date——很多人的答案是「用当前行业 ETF 名单」，这就已经埋了偏差。其次是④：能不能说出「怎么防」，而不只是「要注意」。',
  },
  {
    id: 'quant-xquant-c3-l2-e8', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c3-l2', tags: ['K', '标的池'],
    question: '筛选 ETF 的四个维度是：交易所交易、______、流动性、______。',
    blanks: [['规模', 'AUM', '基金规模'], ['代表性', '跟踪误差']],
    explanation: '规模太小有清盘风险；代表性不足意味着「你以为买的是宽基，其实是行业」。流动性决定能否成交，交易所决定成本与规则。',
  },

  /* ═══════════ l3：相关性（10 题）═══════════ */
  {
    id: 'quant-xquant-c3-l3-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c3-l3', tags: ['K', '相关性'],
    question: '相关系数的取值范围与含义是？',
    options: [
      { value: 'a', text: '[-1, 1]：1 完全同向、0 无线性关系、-1 完全反向' },
      { value: 'b', text: '[0, 1]：越大越相关' },
      { value: 'c', text: '[0, 100]：百分比' },
      { value: 'd', text: '任意实数' },
    ],
    answer: 'a',
    explanation: '相关系数无单位、范围 [-1,1]。注意 0 只表示「无线性关系」，不代表完全无关（可能有关非线性关系）。',
  },
  {
    id: 'quant-xquant-c3-l3-e2', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c3-l3', tags: ['K', '相关性'],
    question: '本课程三资产实测相关性：A 与 B 为 ______，A 与 C 为 ______，B 与 C 为 ______（保留 3 位小数）。',
    blanks: [['0.504'], ['0.246'], ['0.101']],
    explanation: '没有一对是负相关——这是现实：真实资产之间很少长期稳定负相关。分散的目标是「不同步」，不是「对冲」。',
  },
  {
    id: 'quant-xquant-c3-l3-e3', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c3-l3', tags: ['U', '相关性'],
    question: '黄金与股市相关性低，说明买黄金能让股市不下跌。',
    answer: false,
    explanation: '相关不是因果。相关性低只说明「历史走势没有明显同步」，不代表「买黄金会阻止股市下跌」。因果关系需要额外的识别方法（本站《因果推断》课程）。',
  },
  {
    id: 'quant-xquant-c3-l3-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c3-l3', tags: ['U', '相关性'],
    question: '关于相关系数的性质，下列说法正确的有？',
    options: [
      { value: 'a', text: '它只衡量线性关系，非线性联动可能 ρ≈0' },
      { value: 'b', text: '它不平稳，危机时普遍上升' },
      { value: 'c', text: '它与因果无关' },
      { value: 'd', text: '它一经计算就固定不变，可作为长期参数' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 错在「固定不变」——相关性是随时间变化的统计量，用全期相关性做长期决策是常见错误。若要实时使用，必须用滚动窗口。',
  },
  {
    id: 'quant-xquant-c3-l3-e5', type: 'code', difficulty: 3,
    relatedLessonId: 'quant-xquant-c3-l3', tags: ['D', '相关性'],
    setupCode: MKT,
    lang: 'python',
    question: '实现两个函数：\n1. `corr_matrix(ret)`：返回 3×3 相关系数 DataFrame（保留 3 位小数）；\n2. `diversification_effect(ret, weights)`：给定权重 dict，用协方差公式计算组合年化理论波动（%），返回 float（2 位小数）。公式：σ_p = sqrt(wᵀ Σ w)，Σ 为年化协方差矩阵（日协方差 × 252）。',
    starterCode: `
def corr_matrix(ret):
    pass

def diversification_effect(ret, weights):
    pass

print(corr_matrix(RET).values.tolist())
print(diversification_effect(RET, {"A": 1/3, "B": 1/3, "C": 1/3}))`,
    expectedOutput: '[[1.0, 0.504, 0.246], ...] 与 8.02 左右',
    tests: `
c = corr_matrix(RET)
assert c.shape == (3, 3), f"应为 3×3，实际 {c.shape}"
assert abs(c.loc["A", "B"] - 0.504) < 0.005, f"A-B 应约 0.504，实际 {c.loc['A','B']}"
assert abs(c.loc["A", "C"] - 0.246) < 0.005, f"A-C 应约 0.246，实际 {c.loc['A','C']}"
assert abs(c.loc["B", "C"] - 0.101) < 0.005, f"B-C 应约 0.101，实际 {c.loc['B','C']}"
assert abs(c.loc["A", "A"] - 1.0) < 1e-9, "对角线应为 1"

v = diversification_effect(RET, {"A": 1/3, "B": 1/3, "C": 1/3})
assert isinstance(v, float) and abs(v - 8.02) < 0.1, f"等权理论波动应约 8.02%，实际 {v}"
v2 = diversification_effect(RET, {"A": 1.0, "B": 0.0, "C": 0.0})
assert abs(v2 - 11.01) < 0.1, f"只买 A 应约 11.01%，实际 {v2}"
assert v < v2, "分散后波动必须低于单资产"`,
    answer: `
def corr_matrix(ret):
    return ret.corr().round(3)

def diversification_effect(ret, weights):
    w = np.array([weights.get(c, 0.0) for c in ret.columns])
    cov = ret.cov().values * 252
    return round(float(np.sqrt(w @ cov @ w) * 100), 2)`,
    explanation: '两个关键点：① 协方差矩阵必须年化（×252），否则算出来是日波动；② 权重顺序必须与 ret.columns 对齐——用 dict 取值而不是直接传 list，避免顺序错位。',
  },
  {
    id: 'quant-xquant-c3-l3-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c3-l3', tags: ['U', '相关性'],
    question: '按公式 σ_p² = w₁²σ₁² + w₂²σ₂² + 2w₁w₂ρσ₁σ₂，当 ρ = +1 时？',
    options: [
      { value: 'a', text: '组合波动 = 加权平均波动，分散完全无效' },
      { value: 'b', text: '组合波动 = 0' },
      { value: 'c', text: '组合波动小于加权平均波动' },
      { value: 'd', text: '组合波动变为负数' },
    ],
    answer: 'a',
    explanation: 'ρ=1 时方差项可配成完全平方 (w₁σ₁ + w₂σ₂)²，开方即加权平均。这正是「买两个完全同步的资产等于买一个」的数学表达。ρ<1 才能让组合波动低于加权平均。',
  },
  {
    id: 'quant-xquant-c3-l3-e7', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c3-l3', tags: ['D', '研究设计'],
    question: '你在 2021 年初构建了一个三资产组合（股票 A、股票 B、黄金 C），历史相关性只有 0.25。2022 年全球加息，三个资产同时下跌 20%。请回答：\n① 这个现象叫什么？它的统计表现是什么？\n② 说明「历史相关性」为什么在此时失效（机制层面）；\n③ 给出 2 条在组合层面可以提前做的准备（不是事后解释）。',
    referenceAnswer: `
① 现象名称与统计表现：
- 名称：相关性上升 / Correlation Breakdown，危机传染（contagion）；
- 统计表现：危机期间两两相关系数显著上升（可能从 0.25 升到 0.6+），且下跌时相关性高于上涨时（非对称相关性）。组合的实际波动远高于按平时相关性估算的水平，分散效果同时失效。

② 机制层面：
- 危机中投资者面临**流动性需求**：为补保证金/赎回，会卖出一切能卖的资产，与资产基本面无关，导致「所有资产同向下跌」；
- **风险偏好同源**：不同资产的价格都受同一个折现率（利率）驱动。加息时折现率上升，长久期资产（成长股、黄金）同时承压；
- **杠杆与被动资金**：风险平价/波动率目标等策略在波动上升时同步减仓，形成机械性同向抛售；
- 所以相关性不是「资产的固有属性」，而是「资金行为的状态函数」。

③ 两条可提前做的准备：
- **压力测试而非历史模拟**：不要只用历史相关性估计组合风险，而是假设「相关性跳到 1」做最坏情形测试（所有资产同时下跌）；据此设定仓位上限。
- **引入真正的负相关或现金**：持有一定比例的现金/短债（其价格由政策利率直接锚定，危机中往往上涨），或使用显式的对冲工具（股指期货空头、期权）。
（可加分：用波动率目标化动态降杠杆——但要注意这会加剧同向减仓，需与流动性管理配合。）`,
    rubric: [
      { point: '① 正确命名相关性上升/传染，并指出「危机时相关性升高」这一统计表现', score: 3 },
      { point: '② 机制解释至少含「流动性需求」或「同一折现率驱动」之一', score: 3 },
      { point: '② 提到杠杆/被动资金的机械性同向抛售（可加分）', score: 1 },
      { point: '③ 给出压力测试（假设相关性=1）或持有现金/对冲工具等可操作措施', score: 3 },
    ],
    keywords: ['相关性上升', '传染', '流动性', '折现率', '压力测试', '对冲'],
    explanation: '这道题的价值在于把「相关性」从一个静态数字变成「状态函数」。评分重点在③：能不能给出**事前**的准备，而不是事后说「我早知道相关性会上升」。',
  },
  {
    id: 'quant-xquant-c3-l3-e8', type: 'fill', difficulty: 3,
    relatedLessonId: 'quant-xquant-c3-l3', tags: ['K', '归因'],
    question: '本节等权组合相对只买 A：波动从 11.01% 降到 ______%，回撤从 −37.23% 收窄到 −13.84%（改善 ______%）。但收益的提升主要来自 B，不是「分散化」本身——分散改善的是______，收益改善来自标的。',
    blanks: [['8.02'], ['62.9', '63'], ['风险', '波动与回撤']],
    explanation: '这个归因区分极其重要。把「收益提升」归因给「分散化」是初学者最常见的逻辑错误，会让你在错误的维度上找答案。',
  },
  {
    id: 'quant-xquant-c3-l3-e9', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c3-l3', tags: ['U', '相关性'],
    question: '计算相关性时应使用价格序列，因为价格更能反映资产的真实价值。',
    answer: false,
    explanation: '必须用**收益率**。用价格算出的相关性通常接近 1（因为价格都在长期上涨），会得出「所有资产高度相关、分散无效」的错误结论。这是相关性计算里最常见的错误。',
  },
  {
    id: 'quant-xquant-c3-l3-e10', type: 'single', difficulty: 4,
    relatedLessonId: 'quant-xquant-c3-l3', tags: ['U', '方法'],
    question: '如果你只允许做一件事来提升研究的可信度，下列哪个最有效？',
    options: [
      { value: 'a', text: '把相关性窗口从 250 天改成 60 天' },
      { value: 'b', text: '在构建组合前，先假设「相关性可能升到 0.8」做压力测试' },
      { value: 'c', text: '多试几个权重方案，选波动最低的那个' },
      { value: 'd', text: '用更高的杠杆放大收益' },
    ],
    answer: 'b',
    explanation: 'a 只是换参数，不改变「用历史估计未来」的根本问题；c 是对着样本挑结果（数据窥探）；d 放大风险。b 是唯一在「假设可能失效」的前提下做决策的做法，属于事前风控。',
  },

  /* ═══════════ l4：对象化（10 题）═══════════ */
  {
    id: 'quant-xquant-c3-l4-e1', type: 'fill', difficulty: 1,
    relatedLessonId: 'quant-xquant-c3-l4', tags: ['K', '标的池'],
    question: '标的池对象的四个必备字段是：symbols（代码）、roles（______）、as_of_date（______）、weights_hint（初始权重）。',
    blanks: [['角色', '角色说明'], ['时点', '快照时点']],
    explanation: 'roles 保证后续归因时能解释「为什么有它」；as_of_date 是防幸存者偏差的关键。缺任何一个，标的池都无法被复现或审计。',
  },
  {
    id: 'quant-xquant-c3-l4-e2', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c3-l4', tags: ['U', '标的池'],
    question: '权重之和只要「接近 1」就行，差个 0.05 无所谓。',
    answer: false,
    explanation: '权重和 1.05 意味着你用了 105% 的资金（隐性杠杆），收益与回撤被整体放大 5%。在一段 5 年数据上，这可能让 40% 的收益变成 47%——足以改变结论。必须断言 sum ≈ 1（容差 1e-6）。',
  },
  {
    id: 'quant-xquant-c3-l4-e3', type: 'single', difficulty: 2,
    relatedLessonId: 'quant-xquant-c3-l4', tags: ['U', '因子'],
    question: '本课程用「GDP 总量」作为简化宏观因子，关于它的正确表述是？',
    options: [
      { value: 'a', text: '它证明了「GDP 大的国家股市一定涨得好」' },
      { value: 'b', text: '它只是演示「假设→指标→选择」流程，日本是明确反例，不能预测收益' },
      { value: 'c', text: '它是学术上标准的选股因子' },
      { value: 'd', text: '它比动量因子更有效' },
    ],
    answer: 'b',
    explanation: '日本在 1990 年代后 GDP 长期位居全球前列但股市长期低迷，这是「经济总量大 → 股市涨得好」最著名的反例。本课程用它只为了让流程可视，不给结论背书。',
  },
  {
    id: 'quant-xquant-c3-l4-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c3-l4', tags: ['U', '元认知'],
    question: '关于「用数据说话」，下列说法正确的有？',
    options: [
      { value: 'a', text: '本课程的例子是刻意选了会被数据支持的假设，为了讲清流程' },
      { value: 'b', text: '真实研究中，大多数假设会被数据推翻，这是正常的' },
      { value: 'c', text: '要警惕「先看了结果再提假设」的事后合理化' },
      { value: 'd', text: '只要数据支持，假设就一定成立' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 忽略了「这段数据是否恰好支持」「指标是否挑过」等问题。这也是第 7-8 章（样本外与多重检验）存在的理由。',
  },
  {
    id: 'quant-xquant-c3-l4-e5', type: 'code', difficulty: 3,
    relatedLessonId: 'quant-xquant-c3-l4', tags: ['D', '标的池'],
    lang: 'python',
    question: '实现 `Universe` 类，含：\n- `__init__(symbols, roles, as_of_date, weights_hint=None)`：weights_hint 缺省为等权；\n- `check()`：返回错误列表（空列表 = 通过），检查四条：标的数=3、每个标的都有非空 role、as_of_date 匹配 `YYYY-MM-DD`、权重和=1（容差 1e-6）；\n- `snapshot()`：返回 dict，含 symbols（tuple）、as_of_date、weights（dict 副本）。',
    starterCode: `
class Universe:
    pass

U = Universe(["510300","513100","518880"],
             {"510300":"主仓","513100":"成长","518880":"分散"}, "2025-12-26")
print(U.check(), U.snapshot()["weights"])`,
    expectedOutput: '[] 与等权字典',
    tests: `
U = Universe(["510300","513100","518880"],
             {"510300":"主仓","513100":"成长","518880":"分散"}, "2025-12-26")
assert U.check() == [], f"应通过，实际 {U.check()}"
w = U.snapshot()["weights"]
assert abs(sum(w.values()) - 1.0) < 1e-9 and len(w) == 3, f"等权权重不对: {w}"
assert isinstance(U.snapshot()["symbols"], tuple), "symbols 应为 tuple（不可变快照）"

# 少一个标的
assert any("3" in e for e in Universe(["510300","513100"], {"510300":"a","513100":"b"}, "2025-12-26").check()), "标的数错应报错"
# 缺 role
assert any("角色" in e for e in Universe(["510300","513100","518880"], {"510300":"a"}, "2025-12-26").check()), "缺角色应报错"
# 日期格式错
assert any("as_of_date" in e for e in Universe(["510300","513100","518880"],
    {"510300":"a","513100":"b","518880":"c"}, "2025/12/26").check()), "日期格式错应报错"
# 权重和错
assert any("权重" in e for e in Universe(["510300","513100","518880"],
    {"510300":"a","513100":"b","518880":"c"}, "2025-12-26",
    weights_hint={"510300":0.4,"513100":0.4,"518880":0.25}).check()), "权重和 1.05 应报错"`,
    answer: `
import re

class Universe:
    def __init__(self, symbols, roles, as_of_date, weights_hint=None):
        self.symbols = list(symbols)
        self.roles = dict(roles)
        self.as_of_date = as_of_date
        n = len(self.symbols)
        self.weights_hint = (dict(weights_hint) if weights_hint
                             else {s: 1.0 / n for s in self.symbols})

    def check(self):
        errs = []
        if len(self.symbols) != 3:
            errs.append(f"标的数应为 3，实际 {len(self.symbols)}")
        for s in self.symbols:
            if not self.roles.get(s):
                errs.append(f"{s} 缺少角色说明")
        if not re.fullmatch(r"\\d{4}-\\d{2}-\\d{2}", self.as_of_date or ""):
            errs.append(f"as_of_date 格式错误：{self.as_of_date}")
        total = sum(self.weights_hint.values())
        if abs(total - 1.0) > 1e-6:
            errs.append(f"权重和应为 1，实际 {total:.6f}")
        return errs

    def snapshot(self):
        return dict(symbols=tuple(self.symbols), as_of_date=self.as_of_date,
                    weights=dict(self.weights_hint))`,
    explanation: '三个设计要点：① weights_hint 缺省时用等权（避免调用方忘记传）；② check() 返回错误列表而不是直接抛异常（便于批量体检）；③ snapshot 返回 tuple 与 dict 副本（防止外部修改内部状态，这是「快照」的本意）。',
  },
  {
    id: 'quant-xquant-c3-l4-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c3-l4', tags: ['U', '偏差'],
    question: '标的池的 as_of_date 如果晚于回测起点，会引入什么偏差？',
    options: [
      { value: 'a', text: '前视偏差（用了「后来才知道该买什么」的信息）' },
      { value: 'b', text: '只是格式问题，不影响结果' },
      { value: 'c', text: '幸存者偏差，但不影响收益' },
      { value: 'd', text: '没有影响，因为标的是长期存在的' },
    ],
    answer: 'a',
    explanation: '池子时点必须 ≤ 回测起点。如果池子是 2025 年的名单，却用来回测 2021 年，你就用了「哪些标的活到了 2025」这个未来信息——同时构成前视偏差与幸存者偏差。',
  },
  {
    id: 'quant-xquant-c3-l4-e7', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c3-l4', tags: ['D', '工程'],
    question: '你要把一个「已经在 3 个 notebook 里各写了一遍的标的池列表」重构为对象。请回答：\n① 列出至少 4 个当前做法的具体风险；\n② 设计 `Universe` 类的接口（方法名 + 一句话职责，至少 4 个方法）；\n③ 给出 2 条自动化校验（断言），说明它们分别防住哪种事故；\n④ 说明如何让「后续所有实验」不再各自复制列表。',
    referenceAnswer: `
① 当前做法的风险（≥4）：
- **漂移风险**：三个 notebook 的列表可能已不一致（有人加了标的忘了同步），导致「同一策略」结果不同却无法解释；
- **时点丢失**：没有记录名单是哪天的快照，无法复现，也无法判断是否引入幸存者偏差；
- **权重和未校验**：手动写权重容易出现合计 ≠ 1（隐性杠杆），且不报错；
- **角色丢失**：只剩代码，没有「为什么选它」，事后无法做归因；
- **修改无痕**：改了列表没有记录，出问题无法回滚。

② Universe 接口（≥4 方法）：
- \`__init__(symbols, roles, as_of_date, weights_hint, rationale, excluded)\`：构造不可变快照；
- \`check()\`：返回错误列表，实现全部验收标准（数量/角色/日期/权重和）；
- \`snapshot()\`：返回只读快照（tuple/dict 副本），供其他地方引用；
- \`to_dict()\` / \`from_dict()\`：序列化与反序列化，便于 spec 落盘与跨实验复用；
- \`subset(codes)\`：按子集派生新池（例如「只用 A+B 做对照实验」），不修改原池。

③ 两条自动化校验：
- \`assert abs(sum(weights.values()) - 1) < 1e-6\` → 防「隐性杠杆」事故（权重和 1.05 会让收益与回撤被放大 5%）；
- \`assert as_of_date <= backtest_start\` → 防「前视偏差/幸存者偏差」事故（用了晚于回测起点的名单）。
（可加分：\`assert set(symbols) == set(roles)\` → 防「标的与角色不匹配」）

④ 避免重复复制：
- 把 Universe 定义放在一个共享模块（如 \`universe.py\`），所有 notebook/脚本 import 同一个实例；
- 在每份 spec 的「上下文」段写明「本次实验使用 universe@2025-12-26，symbols=...」，让口径显式化；
- 池子需要变更时，走「新建版本 + 记录变更原因」而不是就地修改旧对象（版本化）；
- 把 \`check()\` 接进实验启动流程，任何实验开始前先跑一次校验。`,
    rubric: [
      { point: '① 至少 4 个风险，且包含「漂移」与「权重和未校验」这类具体事故', score: 3 },
      { point: '② 至少 4 个方法，职责清晰（含 check 与序列化）', score: 3 },
      { point: '② 提到「派生新池而不改原池」的子集方法（可加分）', score: 1 },
      { point: '③ 两条断言具体可执行，且能对应到具体事故', score: 2 },
      { point: '④ 给出共享模块 + spec 显式引用 + 版本化等具体做法', score: 2 },
    ],
    keywords: ['漂移', '权重和', '时点', '断言', '序列化', '版本化'],
    explanation: '这道题把「工程习惯」引入量化研究。评分重点不是代码写得多漂亮，而是②③——能不能设计出**可被检查**的接口与断言。',
  },
  {
    id: 'quant-xquant-c3-l4-e8', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c3-l4', tags: ['U', '方法'],
    question: '标的池一旦定好就不能再改，否则研究就无法进行。',
    answer: false,
    explanation: '可以改，但必须**版本化**：新建一个池子版本、记录变更原因，并明确「新旧结果不可直接比较」。禁止的是「悄悄就地修改」，那会让历史结论失去意义。',
  },
  {
    id: 'quant-xquant-c3-l4-e9', type: 'fill', difficulty: 3,
    relatedLessonId: 'quant-xquant-c3-l4', tags: ['K', '工程'],
    question: '标的池对象化的三个目的：可______（同一次研究任何人重跑结果一致）、可______（能被断言检查）、可______（后续章节直接引用同一实例）。',
    blanks: [['复现', '复现性'], ['检查', '审计'], ['复用', '引用']],
    explanation: '这三个目的对应了「研究资产」的三个属性。第 1 章讲过「执行可重复」，标的池对象化就是它在标的层面的落实。',
  },
  {
    id: 'quant-xquant-c3-l4-e10', type: 'single', difficulty: 4,
    relatedLessonId: 'quant-xquant-c3-l4', tags: ['U', '元认知'],
    question: '本章用三步把「全市场」收敛到「3 只 ETF」，而且每一步都被数据支持。最需要警惕的认识是？',
    options: [
      { value: 'a', text: '这个例子是刻意挑的，真实研究中大部分假设会被推翻，不能把「流程走通」当成「方法有效」' },
      { value: 'b', text: '三步法已经被证明是最优的选标的流程' },
      { value: 'c', text: '只要用了 GDP 因子，选出来的标的一定比别的好' },
      { value: 'd', text: '3 只 ETF 是理论上的最优数量' },
    ],
    answer: 'a',
    explanation: '这是本章最重要的元认知。b/c/d 都是把「示范案例」误当成「普适真理」。真实的筛选研究里，你提出的假设大多数会被数据推翻——那才是正常的研究状态。',
  },
];

export const quantXquantC3ExercisesAll = quantXquantC3Exercises;
