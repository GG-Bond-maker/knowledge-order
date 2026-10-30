import type { Exercise } from '../../../types';

/* c2 习题：难度 2/2/3/3/4 → 题量 8/8/10/10/13，共 49 题。
 * 全部基于本站合成行情（XQ_MARKET，setupCode 注入）。
 */

const MKT = `import numpy as np
import pandas as pd

ANCHORS = [(0, 4.00), (120, 3.15), (250, 3.55), (360, 2.55), (470, 3.05), (590, 2.65),
           (700, 2.45), (780, 2.60), (900, 3.10), (1030, 3.55), (1150, 3.95), (1299, 4.03)]

def make_prices(n=1300, seed=11, vol=0.0068, start="2021-01-04"):
    rng = np.random.default_rng(seed)
    idx = [i for i, _ in ANCHORS]
    base = np.interp(np.arange(n), idx, np.log([p for _, p in ANCHORS]))
    w = rng.normal(0, 1, n); w[0] = 0.0
    walk = np.cumsum(w); t = np.arange(n) / (n - 1)
    return pd.DataFrame({"close": np.exp(base + vol * (walk - t * walk[-1]))},
                        index=pd.bdate_range(start, periods=n))

px = make_prices()["close"]`;

export const quantXquantC2Exercises: Exercise[] = [
  /* ═══════════ l1：定投与回测（8 题）═══════════ */
  {
    id: 'quant-xquant-c2-l1-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c2-l1', tags: ['K', '回测'],
    question: '回测（backtest）最准确的定位是？',
    options: [
      { value: 'a', text: '它能证明策略在未来也会赚这么多' },
      { value: 'b', text: '它是排除法：帮你快速扔掉明显不行的想法，但不能证明某个想法一定成立' },
      { value: 'c', text: '它是预测工具，回测收益越高未来越好' },
      { value: 'd', text: '它只在有真实数据源时才有意义' },
    ],
    answer: 'b',
    explanation: '回测能证明「在这段数据上算得通」，不能证明「未来也这样」。它的最大用途是快速排除明显有缺陷的想法，而不是给某个想法盖章。',
  },
  {
    id: 'quant-xquant-c2-l1-e2', type: 'multiple', difficulty: 2,
    relatedLessonId: 'quant-xquant-c2-l1', tags: ['U', '回测'],
    question: '回测的三个隐含假设是？',
    options: [
      { value: 'a', text: '你能成交（不会停牌/涨跌停/流动性不足）' },
      { value: 'b', text: '成交价如你所愿（能按假设的价位成交）' },
      { value: 'c', text: '规则可被执行（情绪下仍能机械照做）' },
      { value: 'd', text: '数据一定是免费的' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: '三个假设都可能破。初学者只关心「有没有数据」，而真实亏损常来自 b（成交价假设）与 c（人的执行）。第 8 章会展示成交价假设换个模式，累计收益差 4 个多百分点。',
  },
  {
    id: 'quant-xquant-c2-l1-e3', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c2-l1', tags: ['K', '定投'],
    question: '定投的机制是：价格低时同样金额能买到更多______，从而降低平均持仓______。但这个效果不等于收益一定更高。',
    blanks: [['份额', '份'], ['成本', '成本价']],
    explanation: '这叫成本平均（cost averaging）。它降低的是平均买入成本，不是提高收益——在单边上涨市场里，越早满仓越好，定投反而跑输一次性买入。',
  },
  {
    id: 'quant-xquant-c2-l1-e4', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c2-l1', tags: ['U', '定投'],
    question: '在本课程合成行情上，60 个月定投的累计收益率是 +22.49%，同期买入持有只有 +0.75%，这说明定投在一般情况下都优于一次性买入。',
    answer: false,
    explanation: '这个结论只对「先深跌后反弹」这条特定路径成立。换成单边上涨路径，一次性买入会完胜。定投的优势依赖路径形态，不能泛化成「一般情况下更优」。',
  },
  {
    id: 'quant-xquant-c2-l1-e5', type: 'code', difficulty: 2,
    relatedLessonId: 'quant-xquant-c2-l1', tags: ['D', '定投'],
    setupCode: MKT,
    lang: 'python',
    question: '实现定投回测 `backtest_dca(px, amount=1000.0)`，返回 DataFrame（索引为每月第一个交易日，列依次为 `cost, shares, value, ret`）：\n- `cost`：累计投入；\n- `shares`：累计份额；\n- `value`：当月按买入日收盘价估值，**最后一行的 value 用最后一个交易日收盘价**；\n- `ret`：`value/cost - 1`，成本为 0 时返回 0。',
    starterCode: `
def backtest_dca(px, amount=1000.0):
    pass

r = backtest_dca(px)
print(len(r), round(r.ret.iloc[-1] * 100, 2))`,
    expectedOutput: '60 22.49',
    tests: `
r = backtest_dca(px)
assert list(r.columns) == ["cost", "shares", "value", "ret"], f"列名/顺序不对: {list(r.columns)}"
assert len(r) == 60, f"应有 60 个月，实际 {len(r)}"
assert abs(r.cost.iloc[-1] - 60000.0) < 1e-6, f"总投入应为 60000，实际 {r.cost.iloc[-1]}"
assert abs(r.value.iloc[-1] - 73491.36) < 0.01, f"期末市值应为 73491.36，实际 {r.value.iloc[-1]}"
assert abs(r.ret.iloc[-1] - 0.224856) < 1e-4, f"累计收益应约 0.2249，实际 {r.ret.iloc[-1]}"
assert (r.shares.diff().dropna() > 0).all(), "份额必须单调递增"
assert abs(r.ret.iloc[-1] - (r.value.iloc[-1] / r.cost.iloc[-1] - 1)) < 1e-9, "ret 必须与 value/cost 自洽"`,
    answer: `
def backtest_dca(px, amount=1000.0):
    mm = px.loc[[v.index[0] for _, v in px.groupby(px.index.to_period("M"))]]
    shares = (amount / mm).cumsum()
    cost = np.arange(1, len(mm) + 1) * amount
    value = shares.values * mm.values
    value[-1] = shares.iloc[-1] * px.iloc[-1]
    ret = np.where(cost == 0, 0.0, value / cost - 1)
    return pd.DataFrame({"cost": cost, "shares": shares.values,
                         "value": value, "ret": ret}, index=mm.index)`,
    explanation: '关键三处：① 每月第一个交易日用 groupby + 取首行；② 期末估值必须单独覆盖最后一行（否则会用最后一个买入日的价格，差 36 元）；③ ret 用 np.where 处理除零。',
  },
  {
    id: 'quant-xquant-c2-l1-e6', type: 'single', difficulty: 2,
    relatedLessonId: 'quant-xquant-c2-l1', tags: ['U', '定投'],
    question: '如果把定投金额从 1000 元改成 2000 元，其他都不变，累计收益率会？',
    options: [
      { value: 'a', text: '翻倍' },
      { value: 'b', text: '不变（所有现金流等比放大，收益率是比值）' },
      { value: 'c', text: '减半' },
      { value: 'd', text: '无法确定' },
    ],
    answer: 'b',
    explanation: '收益率 = 市值/成本 − 1。金额翻倍时市值与成本同时翻倍，比值不变。但**绝对收益金额**会翻倍——这也说明为什么只看收益率不够，还要看资金规模与容量。',
  },
  {
    id: 'quant-xquant-c2-l1-e7', type: 'open', difficulty: 3,
    relatedLessonId: 'quant-xquant-c2-l1', tags: ['D', '回测'],
    question: '有人说：「定投是最稳的策略，因为它不用择时，长期一定赚钱。」请回答：\n① 这句话里的「长期一定赚钱」需要什么前提？举一个反例情形；\n② 定投在这段合成行情上赚了 +22.49%，但同期最大浮亏到过 −18.03%。这两个数字同时说明什么？\n③ 如果你要反驳「定投更稳」这个说法，你会用什么指标？',
    referenceAnswer: `
① 前提是「标的长期趋势向上」。反例：标的进入二十年长期下行（如某些国家的股指），定投会持续在下跌中买入，投入越多、亏损越大；或者标的在可预见的持有期内一直在下跌，到期时仍未回本。

② 两个数字同时说明：定投的**终点收益**与**过程体验**是两件事。+22.49% 只描述终点，−18.03% 描述某个时点的浮亏。真实持有者在中途看到 −18% 时是否还能坚持投入，是一个独立的（心理与资金）问题，「稳」这个词在这里被误用了。

③ 可选指标：
- 最大回撤（MDD）：定投与买入持有谁的回撤更深；
- 回撤恢复时间（水下曲线宽度）：谁更快回本；
- 收益的波动率；
- 定投的现金流前重后轻特性（后期本金大，早期波动对总收益影响小）——需要单独说明。
更严格的做法是把两者做成权益曲线，逐段比较回撤深度与恢复时长，而不是只比终点收益。`,
    rubric: [
      { point: '① 指出「长期向上」这一前提，并给出具体反例情形', score: 3 },
      { point: '② 区分「终点收益」与「过程中浮亏」，说明「稳」被误用', score: 3 },
      { point: '② 提到「能否坚持」属于独立问题（心理/资金约束）', score: 2 },
      { point: '③ 用回撤类指标（MDD 或水下曲线/恢复时间）作为反驳依据', score: 3 },
    ],
    keywords: ['长期向上', '回撤', '浮亏', '水下', '终值', '坚持'],
    explanation: '这道题的核心是纠正一个常见话术：把「终点收益为正」包装成「稳」。稳不稳要看路径上的回撤与恢复时间，而不是看终点。',
  },
  {
    id: 'quant-xquant-c2-l1-e8', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c2-l1', tags: ['K', '回测'],
    question: '定投回测里最有用的自查断言是：总______ 必须等于 投资______ 数 × 每期金额。这条恒等式能立刻暴露「月度取数」逻辑的错误。',
    blanks: [['投入', '成本'], ['月', '期']],
    explanation: '本课程实测：60 个月 × 1000 元 = 60000 元。如果对不上，说明你的分组逻辑漏了或多算了月份——这类错误不会报错，只会让结果整体偏移。',
  },

  /* ═══════════ l2：基准（8 题）═══════════ */
  {
    id: 'quant-xquant-c2-l2-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c2-l2', tags: ['K', '基准'],
    question: '为什么「收益率 +22%」这个数字单独看没有意义？',
    options: [
      { value: 'a', text: '因为 22% 太小了' },
      { value: 'b', text: '因为判断好坏需要参照物：同期无风险利率、市场指数、或更简单的同类做法' },
      { value: 'c', text: '因为应该用年化而不是累计' },
      { value: 'd', text: '因为它没有扣除通胀' },
    ],
    answer: 'b',
    explanation: '就像考 80 分好不好取决于全班平均分。基准回答的正是「跟谁比」这个问题。年化与通胀是另外两个独立问题，也会影响判断，但不是「为什么单独看没意义」的直接答案。',
  },
  {
    id: 'quant-xquant-c2-l2-e2', type: 'multiple', difficulty: 2,
    relatedLessonId: 'quant-xquant-c2-l2', tags: ['K', '基准'],
    question: '本课程提到的三类基准中，下列对应关系正确的有？',
    options: [
      { value: 'a', text: '绝对基准：无风险利率（如年化 3%），回答「我有没有达到最低要求」' },
      { value: 'b', text: '相对基准：市场指数或买入持有，回答「我比市场更好吗」' },
      { value: 'c', text: '策略基准：同类更简单的做法（如等权分配），回答「复杂度换来了什么」' },
      { value: 'd', text: '以上都是错的，基准只有一种' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: '三类基准各回答不同层次的问题，本课程主力用相对基准，因为「策略只是跟着市场涨跌」不构成任何独特优势的证明。',
  },
  {
    id: 'quant-xquant-c2-l2-e3', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c2-l2', tags: ['U', '基准'],
    question: '策略收益 +22.49%、基准收益 +0.75%，正确的表述是「策略比基准高 21.74%」。',
    answer: false,
    explanation: '应该是「高 21.74 个百分点（pp）」。写「高 21.74%」会被理解为相对涨幅，量级完全不同。这个单位错误在专业报告里是硬伤。',
  },
  {
    id: 'quant-xquant-c2-l2-e4', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c2-l2', tags: ['K', '基准'],
    question: '相对收益差 = 策略收益 − 基准收益，单位是______（填「百分点」或「百分比」）。三种典型情形里，「牛市赚 30% 但基准涨 45%」意味着策略跑______了市场。',
    blanks: [['百分点', 'pp'], ['输', '跑输']],
    explanation: '跑输 15 个百分点。这正是「牛市人人都是天才」的含义——正收益掩盖了相对失败。',
  },
  {
    id: 'quant-xquant-c2-l2-e5', type: 'code', difficulty: 3,
    relatedLessonId: 'quant-xquant-c2-l2', tags: ['D', '基准'],
    setupCode: MKT,
    lang: 'python',
    question: '实现基准对比函数 `compare_to_benchmark(px, amount=1000.0)`，返回字典，含键 `strategy`、`benchmark`、`diff_pp`、`verdict`：\n- 策略 = 定投累计收益率（小数，不是百分数）；\n- 基准 = 买入持有累计收益率；\n- `diff_pp` = (策略 − 基准) × 100，四舍五入到 2 位；\n- `verdict` = 双分支结论：策略跑赢则「DCA beats Buy & Hold」；否则「DCA does not beat Buy & Hold」。',
    starterCode: `
def compare_to_benchmark(px, amount=1000.0):
    pass

r = compare_to_benchmark(px)
print(round(r["strategy"] * 100, 2), round(r["benchmark"] * 100, 2), r["diff_pp"], r["verdict"])`,
    expectedOutput: '22.49 0.75 21.74 DCA beats Buy & Hold',
    tests: `
r = compare_to_benchmark(px)
assert set(r) == {"strategy", "benchmark", "diff_pp", "verdict"}, f"键不对: {set(r)}"
assert abs(r["strategy"] - 0.224856) < 1e-4, f"策略收益应约 0.2249，实际 {r['strategy']}"
assert abs(r["benchmark"] - 0.0075) < 1e-4, f"基准收益应约 0.0075，实际 {r['benchmark']}"
assert abs(r["diff_pp"] - 21.74) < 0.02, f"diff_pp 应约 21.74，实际 {r['diff_pp']}"
assert r["verdict"] == "DCA beats Buy & Hold", r["verdict"]

# 反例：单边上涨数据上结论应反转
up = px * np.linspace(0.8, 1.4, len(px))
r2 = compare_to_benchmark(up)
assert r2["verdict"] == "DCA does not beat Buy & Hold", f"单边上涨时应跑输，实际 {r2['verdict']}"`,
    answer: `
def compare_to_benchmark(px, amount=1000.0):
    mm = px.loc[[v.index[0] for _, v in px.groupby(px.index.to_period("M"))]]
    shares = (amount / mm).cumsum()
    cost = len(mm) * amount
    strategy = shares.iloc[-1] * px.iloc[-1] / cost - 1
    benchmark = px.iloc[-1] / px.iloc[0] - 1
    diff_pp = round((strategy - benchmark) * 100, 2)
    verdict = "DCA beats Buy & Hold" if strategy > benchmark else "DCA does not beat Buy & Hold"
    return {"strategy": strategy, "benchmark": benchmark,
            "diff_pp": diff_pp, "verdict": verdict}`,
    explanation: '两个要点：① diff_pp 是「先相减再乘 100」，不是「各自乘 100 再相减后再乘 100」；② verdict 用条件表达式而非硬编码，这样换数据（如单边上涨）结论会自动反转——这就是「双分支」在代码里的形态。',
  },
  {
    id: 'quant-xquant-c2-l2-e6', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c2-l2', tags: ['U', '基准'],
    question: '基准可以事后挑选：先看策略跑出了什么结果，再选一个策略能跑赢的基准。',
    answer: false,
    explanation: '这是典型的自欺与误导手法。正确纪律是「先定基准，再看结果」。真实产品中基准选择空间很大，挑一个总能跑赢的基准是常见的营销手段。',
  },
  {
    id: 'quant-xquant-c2-l2-e7', type: 'open', difficulty: 3,
    relatedLessonId: 'quant-xquant-c2-l2', tags: ['D', '基准'],
    question: '你设计了一个「只买黄金 ETF」的策略，回测三年年化 12%。请回答：\n① 你会选什么作为相对基准？为什么不能用「沪深300」？\n② 如果有人用「沪深300」做基准并得出「你的策略大幅跑赢」的结论，这个结论有什么问题？\n③ 请为这个策略写一份双分支验收标准（4 条）。',
    referenceAnswer: `
① 相对基准应选「买入持有同一黄金 ETF」。理由：基准必须与策略承担的风险相匹配。策略只承担黄金的波动，用股票指数作基准等于把「资产配置差异」冒充「策略能力」——你赚的是黄金涨的钱，不是择时/选股的能力。

② 问题在于**基准错配**：沪深300在同期可能表现很差（例如下跌），于是「黄金策略跑赢」这个结论只反映了「黄金比股票好」，完全没有回答「你的策略本身有没有创造价值」。如果同期黄金本身涨了 15%，而你的策略只赚 12%，那你的策略其实是**跑输**了「什么都不做地持有黄金」。

③ 双分支验收标准：
1. 打印策略累计收益、黄金买入持有累计收益、两者之差（pp）；
2. 断言：策略的持仓期间与规则满足 spec（不含未来数据，删尾法偏差 < 1e-12）；
3. 若策略 > 黄金买入持有，打印：「该路径下择时规则相对持有黄金取得正超额」；
4. 若策略 ≤ 黄金买入持有，打印：「该路径下择时未创造价值，直接持有黄金更优」；
5. 无论哪种，追加：「本结论仅覆盖单一资产与单一样本，未做跨资产与样本外检验」。`,
    rubric: [
      { point: '① 基准选「同一标的买入持有」，并说明基准必须与风险匹配', score: 3 },
      { point: '② 指出基准错配：结论只反映资产差异，不反映策略能力', score: 3 },
      { point: '② 进一步指出「可能跑输什么都不做」（相对黄金自身）', score: 2 },
      { point: '③ 双分支标准完整（两种方向 + 舍入/单位 + 元认知提醒）', score: 3 },
    ],
    keywords: ['基准错配', '风险匹配', '买入持有', '双分支', '超额'],
    explanation: '核心是「基准必须与策略的风险暴露匹配」。这是业绩评价的第一原则，比任何指标公式都重要。',
  },
  {
    id: 'quant-xquant-c2-l2-e8', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c2-l2', tags: ['U', '基准'],
    question: '定投在这段行情上跑赢买入持有 21.74pp，最根本的原因是？',
    options: [
      { value: 'a', text: '定投的规则更科学' },
      { value: 'b', text: '这段行情的路径是「先深跌后反弹」，定投在低位积累了大量低成本份额' },
      { value: 'c', text: '定投的交易成本更低' },
      { value: 'd', text: '买入持有的计算方式有误' },
    ],
    answer: 'b',
    explanation: 'a 是错的归因——规则本身没有「更科学」，只是恰好适配这条路径。c 恰恰相反（定投交易次数更多）。d 无依据。这道题训练的是「把结论归因到具体机制」而非停在「跑赢就是好」。',
  },

  /* ═══════════ l3：均线择时（10 题）═══════════ */
  {
    id: 'quant-xquant-c2-l3-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c2-l3', tags: ['K', '均线'],
    question: '均线（moving average）被称为「滞后指标」的原因是？',
    options: [
      { value: 'a', text: '因为它计算速度慢' },
      { value: 'b', text: '因为它用的是过去 N 天的数据，只能描述已经发生的事' },
      { value: 'c', text: '因为它不准确' },
      { value: 'd', text: '因为它只适合长周期' },
    ],
    answer: 'b',
    explanation: '滞后是定义决定的，不是缺陷。当均线确认「在上涨」时，价格往往已经涨了一段；确认「在下跌」时，你可能已经亏了一段。',
  },
  {
    id: 'quant-xquant-c2-l3-e2', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c2-l3', tags: ['U', '前视'],
    question: '在均线策略里写 `pos = sig`（signal 即 position，不 shift），是允许的简化写法。',
    answer: false,
    explanation: '这是前视偏差的标准形态：t 日收盘后才算出的信号，却在 t 日就用来吃 t 日的涨幅。本节实测：MA10 从诚实版 +33.23% 变成作弊版 +682.76%，差 649pp。必须 `pos = sig.shift(1)`。',
  },
  {
    id: 'quant-xquant-c2-l3-e3', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c2-l3', tags: ['K', '均线'],
    question: '均线规则的三要素是：信______（什么时候该持有）、仓______（实际持有多少）、生效______（信号哪天起作用，必须 shift(1)）。',
    blanks: [['号'], ['位', '位大小'], ['时点', '时间']],
    explanation: '三者必须分开。最常见错误是把「信号」直接当「仓位」用，于是生效时点消失，前视偏差发生。',
  },
  {
    id: 'quant-xquant-c2-l3-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c2-l3', tags: ['U', '均线'],
    question: '关于 MA 计算初期（前 N-1 天无值）的处理，下列做法与后果对应正确的有？',
    options: [
      { value: 'a', text: '保留 NaN：`(px > NaN)` 为 False，等价于空仓，不报错但依赖隐含行为' },
      { value: 'b', text: '显式填 0：等价于空仓，行为明确，推荐' },
      { value: 'c', text: '显式填 1：等价于满仓，会改变样本开头的收益' },
      { value: 'd', text: '三种做法对结果完全没有影响' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: '三种都能跑，但含义不同。本课程统一用 b（显式填 0）并写进 spec。d 错：填 1 会让样本开头多出一段满仓持仓，在当前数据上影响很小，但在其他数据上可能显著。',
  },
  {
    id: 'quant-xquant-c2-l3-e5', type: 'code', difficulty: 3,
    relatedLessonId: 'quant-xquant-c2-l3', tags: ['D', '均线'],
    setupCode: MKT,
    lang: 'python',
    question: '实现均线择时收益序列 `pnl_ma(src, period=20, cost_bps=2.0, cheat=False)`：\n- 信号：收盘价 > MA(period) 为 1，否则 0；MA 不足时为 0；\n- 仓位：`cheat=False` 时用 `sig.shift(1)` 并 fillna(0)；`cheat=True` 时直接用 sig；\n- 收益：`pos*ret - |Δpos|*cost_bps/1e4`，ret 为 `src.pct_change()` fillna(0)。\n\n返回逐日收益 Series。',
    starterCode: `
def pnl_ma(src, period=20, cost_bps=0.0, cheat=False):
    pass

print(round(((1 + pnl_ma(px, period=20)).cumprod().iloc[-1] - 1) * 100, 2))`,
    expectedOutput: '52.73',
    tests: `
def tot(s): return ((1 + s).cumprod().iloc[-1] - 1) * 100

assert abs(tot(pnl_ma(px, 20, 0.0)) - 52.73) < 0.05, f"MA20 无成本应 52.73，实际 {tot(pnl_ma(px,20,0.0))}"
assert abs(tot(pnl_ma(px, 20, 2.0)) - 48.96) < 0.1, f"MA20 含 2bp 约 48.96，实际 {tot(pnl_ma(px,20,2.0))}"
s = pnl_ma(px, 20, 2.0)
assert isinstance(s, pd.Series) and len(s) == len(px), "应返回等长 Series"
assert abs(s.iloc[0]) < 1e-12, "第一期不应有收益（无仓位）"
# 作弊版必须显著更高
cheat = tot(pnl_ma(px, 20, 0.0, cheat=True))
assert cheat > 200, f"作弊版应显著更高（实测 341），实际 {cheat}"
# 成本必须递减
assert tot(pnl_ma(px, 10, 0.0)) > tot(pnl_ma(px, 10, 2.0)), "含成本必须更低"`,
    answer: `
def pnl_ma(src, period=20, cost_bps=2.0, cheat=False):
    ma = src.rolling(period).mean()
    sig = (src > ma).astype(float)
    sig[ma.isna()] = 0.0
    pos = sig if cheat else sig.shift(1).fillna(0.0)
    ret = src.pct_change().fillna(0.0)
    turn = pos.diff().abs().fillna(pos.abs())
    return pos * ret - turn * cost_bps / 1e4`,
    explanation: '四处细节：① `astype(float)` 让布尔变浮点（便于后续乘收益）；② `sig[ma.isna()] = 0` 处理窗口不足；③ shift 之后必须 fillna(0)，否则第一期是 NaN，整个 cumprod 会变 NaN；④ 成本按仓位变化量（turnover）计算，不是按天数。',
  },
  {
    id: 'quant-xquant-c2-l3-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c2-l3', tags: ['U', '成本'],
    question: '把成本从 0 提到 20bp 后，MA10 从 +33.23% 掉到 −12.68%，而 MA60 只从 +54.78% 掉到 +37.81%。最合理的解释是？',
    options: [
      { value: 'a', text: 'MA10 运气差' },
      { value: 'b', text: 'MA10 信号翻转次数远多于 MA60，每次翻转都要付一次成本' },
      { value: 'c', text: 'MA60 的成本更低（券商给的费率不同）' },
      { value: 'd', text: '这是计算错误，成本对所有周期影响应相同' },
    ],
    answer: 'b',
    explanation: '成本与换手次数成正比。短周期信号频繁翻转，换手高，成本侵蚀大。这是短周期策略最大的隐藏风险，也是「低频优于高频」在成本维度的直接体现。',
  },
  {
    id: 'quant-xquant-c2-l3-e7', type: 'fill', difficulty: 3,
    relatedLessonId: 'quant-xquant-c2-l3', tags: ['K', '前视'],
    question: '防前视的关键一行是 `pos = sig.______(1)`。如果不加，信号会与当天收益同期对齐，导致回测收益被______放大。',
    blanks: [['shift'], ['严重', '大幅', '系统性']],
    explanation: '本课程实测放大倍数：MA10 从 33% 变成 683%（约 20 倍）。这类错误不报错、不警告，只会给你一个漂亮结果——这也是「回测惊人业绩的第一嫌疑是作弊」的原因。',
  },
  {
    id: 'quant-xquant-c2-l3-e8', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c2-l3', tags: ['D', '均线'],
    question: '某人对你说：「我的均线策略年化 25%，最大回撤只有 5%，非常稳健。」请设计一套检验方案，至少包含 5 个具体的检验动作，并说明每个动作能排除哪种失败模式。',
    referenceAnswer: `
5 个检验动作（每项对应一种失败模式）：

1. **前视偏差检测（删尾法）**：删掉数据最后 20 个交易日重跑，前段逐日收益最大偏差必须 < 1e-12。
   → 排除「信号用了未来数据」（shift 缺失、全样本标准化）。

2. **成本敏感性**：把成本从 0 提到 2bp / 10bp / 20bp，看收益与回撤如何变化。
   → 排除「未计成本或成本假设过于乐观」。短周期策略在 20bp 下可能直接转亏。

3. **样本外检验（60/40 时间切分，只跑一次）**：在训练集选参数，在测试集验证，并与测试集基准比较。
   → 排除「参数过拟合（样本内最优）」与「路径依赖」。

4. **参数敏感性（扫描一组相邻参数）**：看形态是高原/山峰还是锯齿；计算极差与相邻平均差。
   → 排除「结果对参数极度敏感、最优是碰巧」。

5. **基准对比与归因**：与买入持有同一标的比较；把收益拆成「市场 beta」与「择时超额」。
   → 排除「其实只是跟着市场涨，策略没创造价值」。

（可加分项）6. **逐年拆解**：把 5 年切成 5 段，看是否年年正收益、是否有一年巨亏被平均值掩盖。
   → 排除「平均值掩盖极端年份」。

7. **交易次数与持仓占比审计**：打印换手次数与持仓天数占比，检查是否与策略逻辑一致（例如「稳健」的策略不应该一年换手上百次）。
   → 排除「实现与描述不符」（说的是择时，实际做的是高频）。`,
    rubric: [
      { point: '至少 5 个检验动作，且每个都说明「能排除哪种失败模式」', score: 4 },
      { point: '含前视偏差检测（且方法是可执行的，如删尾法）', score: 2 },
      { point: '含成本敏感性与参数敏感性两项', score: 2 },
      { point: '含样本外验证，并强调「测试集只用一次」', score: 2 },
      { point: '含基准对比，指出「可能只是跟着市场涨」', score: 2 },
    ],
    keywords: ['删尾', '成本', '样本外', '参数敏感性', '基准', '逐年'],
    explanation: '这道题把本课程前 2 章的所有「疑」的工具汇总成一份可执行清单。评分重点是「每个动作配一个失败模式」——这说明你知道每个工具在防什么，而不是背工具名。',
  },
  {
    id: 'quant-xquant-c2-l3-e9', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c2-l3', tags: ['U', '均线'],
    question: '在这段合成行情上三个均线周期都大幅跑赢买入持有，说明均线择时是一个稳健有效的策略。',
    answer: false,
    explanation: '三个周期都跑赢，只说明它们在这段「先深跌后反弹」的数据上都躲开了下跌段。稳定性要由参数敏感性（下一节：24 个参数极差 45pp）、样本外检验（第 5 节：样本外跑输基准 10.6pp）来检验，而不是由「三个都赢」来证明。',
  },
  {
    id: 'quant-xquant-c2-l3-e10', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c2-l3', tags: ['U', '均线'],
    question: '下列哪些是均线策略在真实市场中的隐性代价？',
    options: [
      { value: 'a', text: '震荡市里反复穿越均线，形成「买高卖低」的锯齿' },
      { value: 'b', text: '每次翻转都要付买卖两边的成本，短周期尤其吃亏' },
      { value: 'c', text: '滞后性导致确认趋势时已错过一段涨幅' },
      { value: 'd', text: '均线在计算上比别的指标慢，会拖累回测速度' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 是伪代价：均线用 rolling 计算是 O(n)，性能不是问题。真正的代价是 a（假信号）、b（成本）、c（滞后）。三者往往同时出现，构成趋势策略的结构性弱点。',
  },

  /* ═══════════ l4：参数扫描（10 题）═══════════ */
  {
    id: 'quant-xquant-c2-l4-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c2-l4', tags: ['K', '过拟合'],
    question: '参数扫描（穷举找最优）在回测里的主要风险是？',
    options: [
      { value: 'a', text: '计算太慢' },
      { value: 'b', text: '选择偏差：从多个结果里挑最好的，挑到的常是「运气最好」的而非「真正最好」的' },
      { value: 'c', text: '参数越多越好，风险与参数数量无关' },
      { value: 'd', text: '没有任何风险，穷举是客观方法' },
    ],
    answer: 'b',
    explanation: '搜索方法客观，但**选择行为本身**引入偏差。客观方法 + 有偏选择 = 不可信结论。试的次数越多，撞上运气的机会越大。',
  },
  {
    id: 'quant-xquant-c2-l4-e2', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c2-l4', tags: ['U', '过拟合'],
    question: '参数扫描的结果柱状图呈「山峰型（中间高两边低）」通常比「锯齿型（高低乱跳）」更可信。',
    answer: true,
    explanation: '山峰/高原型说明存在「甜蜜区」——参数稍有偏差也不致命，结果是稳健的。锯齿型说明结果对参数极度敏感，敏感性来自噪声，最优不成立。',
  },
  {
    id: 'quant-xquant-c2-l4-e3', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c2-l4', tags: ['K', '过拟合'],
    question: '本课程实测 24 个参数的极差是 ______ 个百分点，相邻参数的平均绝对差是 ______ 个百分点（保留 2 位小数）。后者更能反映问题，因为它衡量的是「敏感度」而不是「跨度」。',
    blanks: [['45.04', '45'], ['5.32', '5.3']],
    explanation: '极差 = 62.81 − 17.77 = 45.04pp；相邻平均差 = 5.32pp。相邻差更关键：MA30 与 MA35 只差 5 个交易日、看到的趋势信息几乎一样，结果却能差 5 个百分点以上——这就是噪声的证据。',
  },
  {
    id: 'quant-xquant-c2-l4-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c2-l4', tags: ['U', '过拟合'],
    question: '哪些做法会加重参数扫描的过拟合？',
    options: [
      { value: 'a', text: '把步长从 5 缩到 1（参数从 24 个增加到 116 个）' },
      { value: 'b', text: '只看最优值，不看整个参数分布' },
      { value: 'c', text: '用同一段数据既选参数又报成绩' },
      { value: 'd', text: '把完整参数结果表保存下来供事后检查' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 恰恰是**减轻**过拟合的做法——保留完整分布是你判断结果是否噪声的唯一证据。a 增加试错次数；b 放弃了对形态的判断；c 就是开卷考。',
  },
  {
    id: 'quant-xquant-c2-l4-e5', type: 'code', difficulty: 3,
    relatedLessonId: 'quant-xquant-c2-l4', tags: ['D', '过拟合'],
    setupCode: MKT,
    lang: 'python',
    question: '实现参数扫描与敏感性度量 `scan_ma(src, periods=None, cost_bps=0.0)`，返回字典：\n- `returns`：{参数: 累计收益(百分数)}；\n- `best`：收益最高的参数；\n- `range_pp`：极差（max − min，保留 2 位）；\n- `adj_mean_pp`：相邻参数绝对差的平均（保留 2 位）。',
    starterCode: `
def scan_ma(src, periods=None, cost_bps=0.0):
    pass

r = scan_ma(px)
print(r["best"], r["range_pp"], r["adj_mean_pp"])`,
    expectedOutput: '35 45.04 5.32',
    tests: `
r = scan_ma(px)
assert len(r["returns"]) == 24, f"应有 24 个参数，实际 {len(r['returns'])}"
assert r["best"] in (25, 35), f"冠军应为 MA25 或 MA35（两者并列 62.81），实际 {r['best']}"
assert abs(r["range_pp"] - 45.04) < 0.02, f"极差应 45.04，实际 {r['range_pp']}"
assert abs(r["adj_mean_pp"] - 5.32) < 0.05, f"相邻平均差应 5.32，实际 {r['adj_mean_pp']}"
assert abs(r["returns"][120] - 46.26) < 0.05, f"MA120 应 46.26，实际 {r['returns'][120]}"
assert abs(r["returns"][5] - 17.77) < 0.05, f"MA5 应 17.77，实际 {r['returns'][5]}"`,
    answer: `
def scan_ma(src, periods=None, cost_bps=0.0):
    import numpy as np
    periods = periods or list(range(5, 121, 5))

    def pnl(period):
        ma = src.rolling(period).mean()
        sig = (src > ma).astype(float); sig[ma.isna()] = 0.0
        pos = sig.shift(1).fillna(0.0)
        ret = src.pct_change().fillna(0.0)
        turn = pos.diff().abs().fillna(pos.abs())
        return pos * ret - turn * cost_bps / 1e4

    def tot(s):
        return ((1 + s).cumprod().iloc[-1] - 1) * 100

    returns = {p: round(tot(pnl(p)), 2) for p in periods}
    vals = np.array(list(returns.values()))
    return {
        "returns": returns,
        "best": max(returns, key=returns.get),
        "range_pp": round(float(vals.max() - vals.min()), 2),
        "adj_mean_pp": round(float(np.mean(np.abs(np.diff(vals)))), 2),
    }`,
    explanation: '注意 MA25 与 MA35 在这段数据上收益完全相同（62.81%）——因为 MA 窗口不同但触发的信号在这段数据上恰好一致。这说明「冠军」本身就不唯一，「最优参数」这个概念比想象中更脆弱。',
  },
  {
    id: 'quant-xquant-c2-l4-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c2-l4', tags: ['U', '过拟合'],
    question: '「相邻参数平均差 5.32pp」这个数字为什么比「极差 45.04pp」更能说明问题？',
    options: [
      { value: 'a', text: '因为它更大' },
      { value: 'b', text: '因为相邻参数看到的趋势信息几乎一样，结果却差很多，说明敏感度来自噪声而非规律' },
      { value: 'c', text: '因为极差不受异常值影响' },
      { value: 'd', text: '两者说明的问题完全一样' },
    ],
    answer: 'b',
    explanation: '极差只说明「跨度大」（可能是一个极端参数导致的），相邻差说明「局部不光滑」——如果存在真实的甜蜜区，相邻参数应该很接近。局部不光滑才是「最优不成立」的直接证据。',
  },
  {
    id: 'quant-xquant-c2-l4-e7', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c2-l4', tags: ['D', '过拟合'],
    question: '你扫描了 116 个参数（MA5~MA120，步长 1），冠军是 MA47，收益 +68.9%。团队很兴奋，准备上线。\n\n请回答：\n① 列出至少 4 个理由说明「不应该现在上线」；\n② 提出 3 个能在不增加新数据的前提下进一步检验的动作；\n③ 如果最终必须上线，你会设置什么上线条件（至少 2 条）？',
    referenceAnswer: `
① 不应上线的理由：
- **选择偏差**：116 次尝试里挑最好的，冠军几乎必然包含运气成分（试得越多，极值越高）；
- **参数敏感性未知**：必须先看 MA47 的邻居（MA45/46/48/49）表现，若邻居差很多，则 68.9% 是噪声；
- **只有样本内证据**：没有任何样本外数据支持；
- **未检验成本**：步长 1 的短周期邻居换手可能很高，成本能否承受未知；
- **未做基准对比**：不知道同期买入持有/定投是多少，68.9% 可能只是市场涨了；
- **规则是否有经济逻辑**：「MA47 比 MA50 好」没有可解释的理由，缺逻辑支撑的参数通常是噪声。

② 三个不需要新数据的检验动作：
1. **邻居稳健性**：画出 MA40~MA55 的完整曲线，计算相邻差；若 MA47 是孤立尖峰，直接否决。
2. **子区间拆解**：把样本切成 3~5 段，看每一段 MA47 是否都跑赢基准；若收益全部来自某一段，说明是路径依赖。
3. **成本压力测试**：把成本从 0 提到 10bp/20bp/30bp，看收益与最大回撤如何退化；若 20bp 下就转亏，不可上线。
（可加分）4. **参数规则的"整十"检验**：如果 MA50 与 MA47 表现差很多，说明结果不稳健（真实的规律不应如此精确）。

③ 上线条件示例：
- 上线前必须有**独立的样本外数据**（例如再往后取 6 个月）验证，且样本外相对基准超额 > 0；
- 上线后设**熔断条件**：滚动 3 个月夏普 < 0 且持续 20 个交易日 → 自动降仓或停机（第 9 章会详细讲）；
- 仓位按「最坏情况」设计：以 20bp 成本 + 样本内最大回撤的 1.5 倍作为风险预算；
- 小资金实盘试运行（模拟盘或小仓位）至少 3 个月，对比执行落差。`,
    rubric: [
      { point: '① 至少 4 个理由，且包含「选择偏差/参数敏感性/无样本外」中的至少两项', score: 3 },
      { point: '② 三个动作具体可执行（邻居曲线、子区间拆解、成本压力测试等）', score: 3 },
      { point: '② 至少一个动作能直接否决该策略（如孤立尖峰判定）', score: 2 },
      { point: '③ 上线条件含「独立样本外验证」', score: 2 },
      { point: '③ 上线条件含「事后熔断/监控」或「小仓位试运行」', score: 2 },
    ],
    keywords: ['选择偏差', '邻居', '子区间', '成本', '样本外', '熔断'],
    explanation: '这道题把「疑」落到决策上：不是「这个结果看起来不错就上」，而是「我需要什么证据才敢上」。评分重点在③——能不能给出可执行的上线门槛。',
  },
  {
    id: 'quant-xquant-c2-l4-e8', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c2-l4', tags: ['U', '方法'],
    question: '参数扫描时，为了让结果更真实，应该给不同参数设置不同的成本假设（短周期用高成本）。',
    answer: false,
    explanation: '恰恰相反。对照实验的铁律是「一次只换一个变量」。如果在扫描时对不同参数用不同成本，你无法判断结果差异来自参数还是成本假设。正确做法：先固定成本扫描参数（本节做法），再单独做成本敏感性分析（lab 里的第二个实验）。',
  },
  {
    id: 'quant-xquant-c2-l4-e9', type: 'fill', difficulty: 3,
    relatedLessonId: 'quant-xquant-c2-l4', tags: ['K', '过拟合'],
    question: '参数扫描给出的不是「最优参数」，而是「在这段数据上______最好的参数」。这个现象在统计学上叫______偏差。',
    blanks: [['运气'], ['选择', '选择偏差', 'selection']],
    explanation: '选择偏差（selection bias）：从多个结果里挑最好的，挑到的往往不是真正最好的，而是运气最好的。试的次数越多，这个偏差越大。',
  },
  {
    id: 'quant-xquant-c2-l4-e10', type: 'single', difficulty: 4,
    relatedLessonId: 'quant-xquant-c2-l4', tags: ['U', '方法'],
    question: '如果 24 个参数里，20 个都赚 55% 以上、4 个赚 20% 左右，这说明？',
    options: [
      { value: 'a', text: '说明策略严重过拟合，不能使用' },
      { value: 'b', text: '说明策略对参数不敏感、存在较宽的有效区间，结论相对稳健（仍需样本外验证）' },
      { value: 'c', text: '说明那 4 个差参数是算错了' },
      { value: 'd', text: '说明应该只报告那 20 个好的参数' },
    ],
    answer: 'b',
    explanation: '这接近「高原型」——参数稍有偏差不影响结论，是稳健的信号。但注意仍不能跳过样本外验证：稳健的参数分布也可能只是这段数据的共同特性（例如都躲开了同一个下跌段）。d 是典型的选择性报告，属于学术不端。',
  },

  /* ═══════════ l5：样本外与过拟合（13 题）═══════════ */
  {
    id: 'quant-xquant-c2-l5-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c2-l5', tags: ['K', '过拟合'],
    question: '训练集与测试集的正确切分方式是？',
    options: [
      { value: 'a', text: '随机打乱后 60/40 切分' },
      { value: 'b', text: '按时间顺序前 60% 训练、后 40% 测试，切点写死' },
      { value: 'c', text: '交替取奇数行和偶数行' },
      { value: 'd', text: '任选，只要不重叠' },
    ],
    answer: 'b',
    explanation: '必须按时间切：现实中你只能用过去的数据做决策。随机切分会造成时间穿越（训练集里有 2025 年的样本、测试集里有 2021 年的），等于用未来预测过去。',
  },
  {
    id: 'quant-xquant-c2-l5-e2', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c2-l5', tags: ['U', '过拟合'],
    question: '样本外检验中，如果第一次结果不理想，可以调整参数再跑几次，选一个结果好的。',
    answer: false,
    explanation: '这会把测试集变成训练集：你实际上在测试集上做了多次参数扫描，样本外检验彻底失效。正确做法：回到训练集重新设计，或换一段从未看过的数据（且只用一次）。',
  },
  {
    id: 'quant-xquant-c2-l5-e3', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c2-l5', tags: ['K', '过拟合'],
    question: '过拟合的本质不是「亏钱」，而是「输给______」。本节实测：冠军参数在样本外赚了 39.43%，但同期基准赚了 ______%，跑输 10.60 个百分点。',
    blanks: [['什么都不做', '基准', '什么都不做的做法'], ['50.03', '50']],
    explanation: '这是本节最重要的区分。过拟合的失败是「安静」的——净值曲线仍在向上，你不会收到任何警告，只是长期跑不过「什么都不做」。',
  },
  {
    id: 'quant-xquant-c2-l5-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c2-l5', tags: ['U', '过拟合'],
    question: '过拟合的三个典型信号是？',
    options: [
      { value: 'a', text: '参数敏感性高（锯齿型曲线）' },
      { value: 'b', text: '样本外表现显著衰减' },
      { value: 'c', text: '规则越加越多，样本内越来越好' },
      { value: 'd', text: '回测代码运行时间很长' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 是性能问题，不是过拟合信号。三个信号的共同点是「用复杂度/尝试次数换来的样本内提升，在样本外不兑现」。',
  },
  {
    id: 'quant-xquant-c2-l5-e5', type: 'code', difficulty: 4,
    relatedLessonId: 'quant-xquant-c2-l5', tags: ['D', '过拟合'],
    setupCode: MKT,
    lang: 'python',
    question: '实现完整的样本外检验 `oos_test(src, train_ratio=0.6, cost_bps=2.0)`，返回字典：\n- `split`：(\"YYYY-MM-DD\", \"YYYY-MM-DD\") 测试集起止日期（字符串）；\n- `champ`：训练集最优参数；\n- `is_return`：训练集该参数的累计收益；\n- `oos_return`：测试集该参数的累计收益；\n- `oos_benchmark`：测试集买入持有收益；\n- `diff_pp`：oos_return − oos_benchmark（保留 2 位）。',
    starterCode: `
def oos_test(src, train_ratio=0.6, cost_bps=0.0):
    pass

r = oos_test(px)
print(r["champ"], round(r["oos_return"], 2), round(r["oos_benchmark"], 2), r["diff_pp"])`,
    expectedOutput: '55 39.43 50.03 -10.6',
    tests: `
r = oos_test(px)
assert set(r) == {"split", "champ", "is_return", "oos_return", "oos_benchmark", "diff_pp"}, f"键不对: {set(r)}"
assert r["champ"] == 55, f"训练集冠军应为 MA55，实际 {r['champ']}"
assert r["split"] == ("2024-01-01", "2025-12-26"), f"切分边界不对: {r['split']}"
assert abs(r["is_return"] - 14.27) < 0.1, f"训练集收益应约 14.27，实际 {r['is_return']}"
assert abs(r["oos_return"] - 39.43) < 0.1, f"测试集收益应约 39.43，实际 {r['oos_return']}"
assert abs(r["oos_benchmark"] - 50.03) < 0.1, f"测试集基准应约 50.03，实际 {r['oos_benchmark']}"
assert abs(r["diff_pp"] - (-10.59)) < 0.1, f"相对基准应为 -10.59，实际 {r['diff_pp']}"
assert r["oos_return"] < r["oos_benchmark"], "本案例样本外应跑输基准"`,
    answer: `
def oos_test(src, train_ratio=0.6, cost_bps=0.0):
    import numpy as np

    def pnl(s, period):
        ma = s.rolling(period).mean()
        sig = (s > ma).astype(float); sig[ma.isna()] = 0.0
        pos = sig.shift(1).fillna(0.0)
        ret = s.pct_change().fillna(0.0)
        turn = pos.diff().abs().fillna(pos.abs())
        return pos * ret - turn * cost_bps / 1e4

    def tot(s):
        return ((1 + s).cumprod().iloc[-1] - 1) * 100

    n = len(src); k = int(n * train_ratio)
    train, test = src.iloc[:k], src.iloc[k:]
    periods = list(range(5, 121, 5))
    train_res = {p: round(tot(pnl(train, p)), 2) for p in periods}
    champ = max(train_res, key=train_res.get)
    oos = round(tot(pnl(test, champ)), 2)
    oos_bh = round(tot(test.pct_change().fillna(0.0)), 2)
    return {
        "split": (str(test.index[0].date()), str(test.index[-1].date())),
        "champ": champ,
        "is_return": train_res[champ],
        "oos_return": oos,
        "oos_benchmark": oos_bh,
        "diff_pp": round(oos - oos_bh, 2),
    }`,
    explanation: '关键点：① 切分必须按时间，且切点用 int(n*ratio) 而不是按日期硬编码（换数据也能用）；② 训练集选参数的 pnl 必须**只在训练集上算**，不能在全集上算完再切片（会引入未来信息）；③ 测试集只跑一次。',
  },
  {
    id: 'quant-xquant-c2-l5-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c2-l5', tags: ['U', '过拟合'],
    question: '为什么样本外会从「跑赢基准 46.5pp」（训练集）反转为「跑输基准 10.6pp」（测试集）？',
    options: [
      { value: 'a', text: '因为测试集数据太少，结果不可靠' },
      { value: 'b', text: '因为训练集是下跌市（迟钝的空仓规则有效），测试集是上涨市（迟钝变成缺点）' },
      { value: 'c', text: '因为代码有 bug' },
      { value: 'd', text: '因为测试集用了不同的成本假设' },
    ],
    answer: 'b',
    explanation: '这就是「市场状态变化导致样本外失效」的最朴素解释，也是过拟合三视角中「市场视角」的核心。同一件衣服冬天穿着暖和，夏天穿就热死人。',
  },
  {
    id: 'quant-xquant-c2-l5-e7', type: 'open', difficulty: 5,
    relatedLessonId: 'quant-xquant-c2-l5', tags: ['D', '研究设计'],
    question: '你只有一段 5 年的历史数据，但需要评估一个策略在未来是否可能有效。请设计一套完整的验证方案（至少 6 步），说明每一步解决什么问题、以及它不能解决什么问题。',
    referenceAnswer: `
完整验证方案（6 步）：

**第 1 步：前视偏差检测（删尾法）**
- 解决：代码是否用了未来数据（全样本标准化、shift(-n)）。
- 不能解决：策略本身的好坏。这只是「代码是不是诚实」，不涉及「规则有没有用」。

**第 2 步：样本外检验（60/40 时间切分，只用一次）**
- 解决：参数过拟合、样本内最优是否可复制。
- 不能解决：单次切分的运气问题（换一个切点可能结论不同）；且只用 40% 数据，样本量小。

**第 3 步：Walk-forward 滚动验证**
- 解决：单次切分的运气问题——用多个滚动窗口（如训练 2 年→测试 6 个月，滚动 15 次）看结论是否一致。
- 不能解决：仍然只用了历史数据，无法覆盖「从未出现过的市场状态」。

**第 4 步：参数敏感性与规则负担检查**
- 解决：最优参数是尖峰还是高原？规则从 1 条加到 N 条时，样本内提升了多少、样本外兑现了多少？
- 不能解决：如果整个参数空间都与市场状态强相关，敏感性检验也无法区分「稳健」与「恰好都适配了这段数据」。

**第 5 步：子区间/逐年拆解**
- 解决：收益是否集中在某一段（例如只靠 2022 年躲跌赚钱）；是否有一年被平均值掩盖的巨亏。
- 不能解决：如果每段都赚，仍可能是「这 5 年的市场特性」而非「普适规律」。

**第 6 步：经济逻辑检验（这一步无法自动化）**
- 解决：策略赚的是什么钱？谁在亏？为什么这个错误会持续存在（行为偏差、制度约束、风险溢价）？
- 不能解决：逻辑成立不等于未来一定成立（逻辑可能失效），但**逻辑不成立的策略几乎必然是过拟合**。

**这些步骤共同不能解决的**：
- **结构性变化（regime shift）**：政策、交易制度、参与者结构的根本变化，历史数据无法预测；
- **黑天鹅**：从未发生过的事件；
- **容量与执行**：回测假设你能成交，真实规模下可能不行；
- **心理执行**：你能不能真的在 −30% 回撤时继续照做。

结论：这套方案能提高「不是纯粹运气」的置信度，但永远无法证明「未来一定有效」。这也正是为什么实盘要从小仓位 + 严格熔断开始。`,
    rubric: [
      { point: '至少 6 步，且每一步都说明「解决什么」+「不能解决什么」', score: 5 },
      { point: '含样本外（强调只用一次）与 Walk-forward 两项', score: 2 },
      { point: '含参数敏感性与规则负担（复杂度）检查', score: 2 },
      { point: '含经济逻辑检验（谁在亏、为什么错误持续存在）', score: 2 },
      { point: '明确指出整体方案仍有无法覆盖的领域（结构性变化/黑天鹅/容量/心理）', score: 2 },
    ],
    keywords: ['删尾', '样本外', 'Walk-forward', '参数敏感性', '逐年', '经济逻辑', '容量'],
    explanation: '这道题是本课程「疑」的最高综合。评分重点在「每一步不能解决什么」——能说清工具的边界，才是真正掌握了方法，而不是背清单。',
  },
  {
    id: 'quant-xquant-c2-l5-e8', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c2-l5', tags: ['U', '过拟合'],
    question: '「样本外赚钱」就足以证明策略有效。',
    answer: false,
    explanation: '本节案例：样本外赚了 39.43%，但同期基准赚 50.03%，跑输 10.6pp。检验的目标是「相对基准的能力」，不是「有没有赚钱」。此外单次切分还可能是运气，需要 Walk-forward 等多重验证。',
  },
  {
    id: 'quant-xquant-c2-l5-e9', type: 'fill', difficulty: 3,
    relatedLessonId: 'quant-xquant-c2-l5', tags: ['K', '过拟合'],
    question: '过拟合的三个成因视角：统计视角（______偏差）、市场视角（______状态变化）、直觉视角（为数据「量体裁衣」）。',
    blanks: [['选择', '选择偏差'], ['市场', '行情']],
    explanation: '三个视角指向同一结论：样本内最优 ≠ 未来可用。理解三个视角的价值在于：你能用不同方式向别人解释同一件事（对技术人员讲统计，对交易员讲市场）。',
  },
  {
    id: 'quant-xquant-c2-l5-e10', type: 'single', difficulty: 4,
    relatedLessonId: 'quant-xquant-c2-l5', tags: ['U', '方法'],
    question: '本课程在全样本上扫描的最优是 MA35（+62.81%），在训练集（60%）上扫描的最优是 MA55（+14.27%）。这个差异本身说明了什么？',
    options: [
      { value: 'a', text: '说明训练集太小，应改用全样本' },
      { value: 'b', text: '说明「最优参数」本身不稳定，依赖样本区间——这本身就是过拟合的证据' },
      { value: 'c', text: '说明 MA35 一定比 MA55 好' },
      { value: 'd', text: '说明代码有 bug' },
    ],
    answer: 'b',
    explanation: '如果存在真实的「最优周期」，它应该在子样本上也大致最优。换了样本区间冠军就换人，说明「冠军」是数据给的，不是规律给的。a 恰恰相反：用全样本选参数再报全样本成绩，就是开卷考。',
  },
  {
    id: 'quant-xquant-c2-l5-e11', type: 'multiple', difficulty: 4,
    relatedLessonId: 'quant-xquant-c2-l5', tags: ['U', '方法'],
    question: '下列哪些做法会让「样本外检验」失效？',
    options: [
      { value: 'a', text: '在测试集上调参数、换时间窗直到结果满意' },
      { value: 'b', text: '随机切分（而非按时间切分）' },
      { value: 'c', text: '在测试集上试几个阈值，选一个不太差的' },
      { value: 'd', text: '测试集只跑一次，结果不好就回去改训练集的设计' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'a、c 都是把测试集变成训练集；b 造成时间穿越。d 是正确做法——改设计应该基于训练集与逻辑，之后再到一个**全新的**测试集（或重启一轮完整流程）验证。',
  },
  {
    id: 'quant-xquant-c2-l5-e12', type: 'code', difficulty: 4,
    relatedLessonId: 'quant-xquant-c2-l5', tags: ['D', '过拟合'],
    setupCode: MKT,
    lang: 'python',
    question: '实现「衰减度量」`decay_report(src, train_ratio=0.6, cost_bps=2.0)`，返回字典：\n- `is_best` / `oos_same_param`：训练集最优参数在训练集 / 测试集上的收益；\n- `decay_pp`：oos_same_param − is_best（pp，2 位小数）；\n- `is_rank`：该参数在「测试集 24 个参数的收益排名」中的位置（1 为最好）；\n- `oos_best`：测试集上真正最优的参数。',
    starterCode: `
def decay_report(src, train_ratio=0.6, cost_bps=0.0):
    pass

r = decay_report(px)
print(r["is_best"], r["oos_same_param"], r["decay_pp"], r["is_rank"], r["oos_best"])`,
    expectedOutput: '14.27 39.43 25.16 5 55',
    tests: `
r = decay_report(px)
assert set(r) == {"is_best", "oos_same_param", "decay_pp", "is_rank", "oos_best"}, f"键不对: {set(r)}"
assert abs(r["is_best"] - 14.27) < 0.1, f"is_best 应约 14.27，实际 {r['is_best']}"
assert abs(r["oos_same_param"] - 39.43) < 0.1, f"oos_same_param 应约 39.43，实际 {r['oos_same_param']}"
assert abs(r["decay_pp"] - 25.16) < 0.15, f"decay_pp 应约 25.16，实际 {r['decay_pp']}"
assert r["oos_best"] == 30, f"测试集最优应为 MA30，实际 {r['oos_best']}"
assert 1 <= r["is_rank"] <= 24, f"排名应在 1-24，实际 {r['is_rank']}"
assert isinstance(r["oos_best"], int), "oos_best 应为参数整数"
assert r["decay_pp"] > 0, "本案例训练集收益低于测试集（因训练集是下跌市），衰减为正"`,
    answer: `
def decay_report(src, train_ratio=0.6, cost_bps=0.0):
    import numpy as np

    def pnl(s, period):
        ma = s.rolling(period).mean()
        sig = (s > ma).astype(float); sig[ma.isna()] = 0.0
        pos = sig.shift(1).fillna(0.0)
        ret = s.pct_change().fillna(0.0)
        turn = pos.diff().abs().fillna(pos.abs())
        return pos * ret - turn * cost_bps / 1e4

    def tot(s):
        return ((1 + s).cumprod().iloc[-1] - 1) * 100

    n = len(src); k = int(n * train_ratio)
    train, test = src.iloc[:k], src.iloc[k:]
    periods = list(range(5, 121, 5))
    train_res = {p: round(tot(pnl(train, p)), 2) for p in periods}
    test_res = {p: round(tot(pnl(test, p)), 2) for p in periods}
    champ = max(train_res, key=train_res.get)
    ranked = sorted(test_res, key=lambda x: -test_res[x])
    return {
        "is_best": train_res[champ],
        "oos_same_param": test_res[champ],
        "decay_pp": round(test_res[champ] - train_res[champ], 2),
        "is_rank": ranked.index(champ) + 1,
        "oos_best": max(test_res, key=test_res.get),
    }`,
    explanation: '注意本案例的 decay 是**正的**（测试集 39.43 > 训练集 14.27），因为训练集是下跌市（能赚 14% 已经很好），测试集是上涨市（更容易赚钱）。这说明「衰减」不能机械地用「样本外 − 样本内」判断，必须结合基准——真正重要的是「样本外相对基准的超额」，本文案例是 −10.6pp。',
  },
  {
    id: 'quant-xquant-c2-l5-e13', type: 'fill', difficulty: 4,
    relatedLessonId: 'quant-xquant-c2-l5', tags: ['K', '方法'],
    question: '本章走完的完整流程是：定投（建立基线）→ 基准对比（判断好坏）→ 均线择时（加规则）→ 参数扫描（找最优）→ ______（检验最优）。最后一步揭示的核心教训是：历史数据上的「最优」不等于未来的「______」。',
    blanks: [['样本外检验', '样本外测试', '样本外'], ['可用', '有效', '可用性']],
    explanation: '这五步就是「做 → 看 → 疑」的第一次完整实践。第 1 章说过「不练疑的后果很具体」——本章就是那个后果：冠军参数在样本外跑输基准 10.6pp。',
  },
];
