import type { Exercise } from '../../../types';
import { quantXquantC1Exercises as BASE } from './c1-ex';

/* c1 习题（续）：l3/l4 各 10 题，与 c1-ex.ts 合并导出。 */

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

const EXTRA: Exercise[] = [
  /* ═══════════ l3：可检查的验收标准（10 题）═══════════ */
  {
    id: 'quant-xquant-c1-l3-e1', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c1-l3', tags: ['U', '验收'],
    question: '「回测代码跑通了、图也画出来了」可以说明回测的计算是正确的。',
    answer: false,
    explanation: '回测代码的错误绝大多数不报错：收益率忘减 1、成本没扣、用了未来数据——这些都会给出「跑通 + 漂亮图」。这正是本节的核心区分：「跑通了」≠「算对了」。',
  },
  {
    id: 'quant-xquant-c1-l3-e2', type: 'single', difficulty: 2,
    relatedLessonId: 'quant-xquant-c1-l3', tags: ['U', '验收'],
    question: '定投回测中写成 `ret = value / cost`（漏了减 1），会得到什么？',
    options: [
      { value: 'a', text: '代码报错，立刻能发现' },
      { value: 'b', text: '得到「市值是成本的倍数」，例如 1.2255 而不是 22.55%，且不报错' },
      { value: 'c', text: '得到负数' },
      { value: 'd', text: '结果与正确写法完全一致' },
    ],
    answer: 'b',
    explanation: '正确实现是 22.55%（0.2255），错误实现是 1.2255——一个「倍数」冒充了「收益率」。因为它是正的、平滑的、量级看着也像净值曲线，所以最容易被放过。',
  },
  {
    id: 'quant-xquant-c1-l3-e3', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c1-l3', tags: ['K', '验收'],
    question: '可检查性三条判据：有明确______、有判定______、可无歧义______。',
    blanks: [['对象'], ['条件'], ['执行']],
    explanation: '三条缺一不可。最隐蔽的是第三条：「收益率应该合理」有对象也有条件，但「合理」没有边界，换个人判断就不同，因此不可检查。',
  },
  {
    id: 'quant-xquant-c1-l3-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c1-l3', tags: ['U', '验收'],
    question: '关于双分支验收标准，下列说法正确的有？',
    options: [
      { value: 'a', text: '它适用于「写 spec 时还不知道结果方向」的场景' },
      { value: 'b', text: '它把「凑出想要的结果」这条路堵死了，因为无论结果如何都必须如实报告' },
      { value: 'c', text: '它是把结论提前写死，属于作弊' },
      { value: 'd', text: '它通常包含「若 A 则打印 X，若 B 则打印 Y」两个分支，外加一条元认知提醒' },
    ],
    answer: ['a', 'b', 'd'],
    explanation: 'c 说反了：真正逼着执行方凑结果的是**单分支**标准（「必须跑赢基准」）。双分支标准把「凑」的路堵死——两种结果都有预定的如实表述，无法用漂亮话糊过去。',
  },
  {
    id: 'quant-xquant-c1-l3-e5', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c1-l3', tags: ['U', '验收'],
    question: '同一段数据、同一套定投规则，两种期末估值口径分别得出 22.55% 与 22.49%。最恰当的处理是？',
    options: [
      { value: 'a', text: '取平均，22.52%，更客观' },
      { value: 'b', text: '随便选一个，反正差 0.06 个百分点可以忽略' },
      { value: 'c', text: '选一个口径写进 spec 的上下文段，并在后续所有章节沿用，保证跨章可比' },
      { value: 'd', text: '两种都报出来，让读者自己判断' },
    ],
    answer: 'c',
    explanation: '差异小不等于可以不管：它是**口径选择**而非计算误差，样本越短或买入间隔越大，这个差距会放大到影响结论。工程上的正确做法是「选一个、写进 spec、全程沿用」。本课程统一为「买入按每月第一个交易日，估值一律用最后一个交易日收盘价」。',
  },
  {
    id: 'quant-xquant-c1-l3-e6', type: 'code', difficulty: 3,
    relatedLessonId: 'quant-xquant-c1-l3', tags: ['D', '验收'],
    setupCode: MKT,
    lang: 'python',
    question: '实现一个「回测结果验收器」`verify_backtest(df, monthly_amount=1000.0)`：\n\n`df` 含列 `cost, shares, value, ret`。返回一个字典 `{"checks": [...], "passed": int, "failed": int}`，其中 `checks` 是 `(名称, 是否通过)` 的列表，需检查这 5 项：\n1. `总投入=月数×金额`：`abs(cost[-1] - len(df)*monthly_amount) < 1e-6`；\n2. `份额单调递增`：`shares` 的差分全部 > 0；\n3. `收益率自洽`：`abs(ret[-1] - (value[-1]/cost[-1] - 1)) < 1e-9`；\n4. `收益率量级合理`：`abs(ret[-1]) < 1`；\n5. `市值非负`：`value` 全部 ≥ 0。',
    starterCode: `
def verify_backtest(df, monthly_amount=1000.0):
    checks = []
    # 逐条实现上面 5 项检查，append (名称, 布尔值)
    passed = sum(1 for _, ok in checks if ok)
    failed = len(checks) - passed
    return {"checks": checks, "passed": passed, "failed": failed}`,
    expectedOutput: "正确实现返回 {'passed': 5, 'failed': 0}；'忘减 1' 的错误实现返回 {'passed': 4, 'failed': 1}",
    tests: `
import numpy as np, pandas as pd

def _mk(px, wrong=False):
    mm = px.loc[[v.index[0] for _, v in px.groupby(px.index.to_period("M"))]]
    shares = (1000.0 / mm).cumsum()
    cost = np.arange(1, len(mm) + 1) * 1000.0
    value = shares.values * mm.values
    ret = value / cost - 1
    if wrong:
        ret = value / cost
    return pd.DataFrame({"cost": cost, "shares": shares.values, "value": value, "ret": ret}, index=mm.index)

good = _mk(px)
r = verify_backtest(good)
assert len(r["checks"]) == 5, f"应有 5 项检查，实际 {len(r['checks'])}"
assert r["passed"] == 5 and r["failed"] == 0, f"正确实现应全通过，实际 {r}"

bad = _mk(px, wrong=True)
r2 = verify_backtest(bad)
assert r2["failed"] >= 1, "错误实现（忘减 1）必须被抓住"
names = [n for n, ok in r2["checks"] if not ok]
assert any("收益" in n for n in names), f"失败的应是收益率相关检查，实际 {names}"

# 边界：成本为 0 的空表不应崩溃
empty = pd.DataFrame({"cost": [], "shares": [], "value": [], "ret": []})
try:
    verify_backtest(empty)
except Exception:
    pass  # 允许显式抛错，但不得静默给出「全通过」`,
    answer: `
def verify_backtest(df, monthly_amount=1000.0):
    import numpy as np
    checks = []
    if len(df) == 0:
        raise ValueError("空结果无法验收")
    checks.append(("总投入=月数×金额",
                   abs(df["cost"].iloc[-1] - len(df) * monthly_amount) < 1e-6))
    checks.append(("份额单调递增",
                   bool((df["shares"].diff().dropna() > 0).all())))
    checks.append(("收益率自洽",
                   abs(df["ret"].iloc[-1] - (df["value"].iloc[-1] / df["cost"].iloc[-1] - 1)) < 1e-9))
    checks.append(("收益率量级合理", abs(df["ret"].iloc[-1]) < 1))
    checks.append(("市值非负", bool((df["value"] >= 0).all())))
    passed = sum(1 for _, ok in checks if ok)
    return {"checks": checks, "passed": passed, "failed": len(checks) - passed}`,
    explanation: '关键在第 3 项：正确实现里 `ret` 恒等于 `value/cost - 1`，所以自洽；错误实现里 `ret = value/cost`，与右边差 1，立刻被抓。注意第 1 项检查抓不住这个错——总投入确实是对的，这就是「验收标准必须覆盖每个关键输出」的含义。',
  },
  {
    id: 'quant-xquant-c1-l3-e7', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c1-l3', tags: ['D', '验收'],
    question: '你要为一个「双均线择时 + 每 21 个交易日再平衡」的策略写验收标准，但你**还没跑过**，不知道它会赚还是亏。请写出完整验收标准（至少 6 条），要求：\n① 覆盖「数字正确性」与「逻辑正确性」两类；\n② 至少一条用于检测前视偏差；\n③ 包含双分支结论与一条元认知提醒。',
    referenceAnswer: `
【数字正确性】
1. 依次打印累计收益、年化收益、年化波动、最大回撤、夏普（各保留 2 位小数），策略与买入持有基准各一行；
2. 打印「策略累计收益 − 基准累计收益」；
3. 断言：扣成本后的累计收益 ≤ 不扣成本时的累计收益；
4. 断言：净值曲线首值为 1.0，且净值任一点 > 0（不允许出现负数净值）。

【逻辑正确性】
5. 断言：仓位序列只取 0 或 1（或对应的目标权重），不存在越界值；
6. 断言：信号 t 日生成、t+1 日生效——即 pos.shift(-1) 与 sig 在同区间上不等（若相等说明信号当天就生效了）；
7. 前视抽检（删尾法）：删掉数据最后 20 个交易日重跑，前段逐日收益的最大偏差 < 1e-12；若不为 0，说明代码用到了未来信息；
8. 断言：换手次数与仓位变化次数一致（防止成本按错误口径计算）。

【双分支结论】
9. 若策略跑赢基准，打印：「该走势下双均线择时提供了正超额」；否则打印：「该走势下择时未提供超额，买入持有更优」。

【元认知提醒】
10. 无论哪种结果，追加打印：「本结论仅对这段样本成立，未做样本外与参数敏感性检验，不足以说明策略有效」。`,
    rubric: [
      { point: '数字正确性检查覆盖关键输出（收益、成本、净值）且带明确阈值', score: 3 },
      { point: '逻辑正确性检查至少含「仓位取值合法」或「换手与成本口径一致」之一', score: 2 },
      { point: '包含可执行的前视偏差检测（删尾法/移位检验等），而非仅口头提醒', score: 3 },
      { point: '双分支结论两种方向都有预定表述', score: 2 },
      { point: '有元认知提醒（样本局限/未做样本外）', score: 2 },
    ],
    keywords: ['断言', '前视', '删尾', '双分支', '样本外', '成本'],
    explanation: '评分重点在第 3 项：很多人会写「注意不要用未来数据」，但可验收的标准必须给出**可执行的检测方法**（删尾法：删掉尾部后前段结果必须完全不变）。',
  },
  {
    id: 'quant-xquant-c1-l3-e8', type: 'single', difficulty: 4,
    relatedLessonId: 'quant-xquant-c1-l3', tags: ['U', '验收'],
    question: '为什么验收标准里不应写「如果结果不理想，就调整参数直到通过」？',
    options: [
      { value: 'a', text: '因为调整参数太耗时' },
      { value: 'b', text: '因为这是「对着样本调参」，属于数据窥探，会让策略在样本外系统性失效' },
      { value: 'c', text: '因为参数不该被调整，一个好策略不需要参数' },
      { value: 'd', text: '因为没有不理想的可能' },
    ],
    answer: 'b',
    explanation: '「调到通过为止」等于把测试集当训练集用。试的次数越多，从随机波动里「碰巧通过」的概率越高（第 7 章会用 490 组参数组合的实测数据：样本内最优与样本外的相关系数只有 0.04）。c 也错——参数是必要的，问题是**不能在同一段数据上反复优化再验收**。',
  },
  {
    id: 'quant-xquant-c1-l3-e9', type: 'fill', difficulty: 3,
    relatedLessonId: 'quant-xquant-c1-l3', tags: ['K', '验收'],
    question: '检测前视偏差的「删尾法」：把数据最后若干天删掉重新运行，如果______段的结果发生了变化，说明代码用到了______数据。',
    blanks: [['前', '前面', '前段'], ['未来', '将来', '未来信息']],
    explanation: '原理很直接：被删掉的数据本来就不该影响它之前的结果。如果前段结果变了，说明计算过程中「看过」后面。这一类检测能抓住全样本标准化（用了全期均值）、全期归一化、`shift(-n)` 等隐蔽泄漏。',
  },
  {
    id: 'quant-xquant-c1-l3-e10', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c1-l3', tags: ['U', '验收'],
    question: '只要断言全部通过，就说明这段回测代码是正确的。',
    answer: false,
    explanation: '断言只覆盖你想到的情况。如果只断言「总投入 = 月数 × 1000」，「收益率忘减 1」会被完整放过——因为总投入确实是对的。断言 + 手算对照 + 口径复核三者缺一不可。',
  },

  /* ═══════════ l4：人机分工（10 题）═══════════ */
  {
    id: 'quant-xquant-c1-l4-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c1-l4', tags: ['K', '协作'],
    question: '按本课程的人机分工原则，下列哪项**必须由人**完成？',
    options: [
      { value: 'a', text: '把 spec 翻译成 Python 代码' },
      { value: 'b', text: '运行代码并排查报错' },
      { value: 'c', text: '判断回测结果的含义、决定是否相信' },
      { value: 'd', text: '写重复的图表绘制代码' },
    ],
    answer: 'c',
    explanation: '分工原则：定目标、写 spec、判断结果归人；翻译代码、运行、排错归 AI。根本依据是**责任结构**——亏损由你承担，判断就必须由你做。',
  },
  {
    id: 'quant-xquant-c1-l4-e2', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c1-l4', tags: ['U', '协作'],
    question: 'AI 的输出越流畅、越像专业报告，就越说明它的结论可靠。',
    answer: false,
    explanation: 'AI 的自信度与正确率不相关：错误输出与正确输出在语气、格式、排版上完全一致。这就是「流畅的自信」——本节要防的核心失败模式。',
  },
  {
    id: 'quant-xquant-c1-l4-e3', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c1-l4', tags: ['K', '协作'],
    question: '抽检 AI 交付的回测代码时，最该重点核查的三处口径是：成本是否______、时间对齐是否______、有没有用到______数据。',
    blanks: [['扣除', '扣了', '计算'], ['正确', '对齐', '一致'], ['未来', '未来信息', '将来']],
    explanation: '这三处是 AI 最容易「按最常见但不符合你意图的方式」实现的。它们都不需要你比 AI 更懂代码，只需要你懂 spec。',
  },
  {
    id: 'quant-xquant-c1-l4-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c1-l4', tags: ['U', '协作'],
    question: '「关掉 AI 自检」三步法包含哪些动作？',
    options: [
      { value: 'a', text: '合上参考，用白纸写下这段代码在做什么（三步以内）' },
      { value: 'b', text: '在运行前预测一个具体数字，再看实际输出与预测的偏差' },
      { value: 'c', text: '改一个条件（成本/窗口）再运行，预测变化方向' },
      { value: 'd', text: '让 AI 再解释一遍代码，直到你听懂了' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 是最常见的自欺：听懂解释（recognition）与能够自己重建（production）是两种完全不同的认知活动。三步法之所以有效，是因为它强制你**产出**而不是**再认**。',
  },
  {
    id: 'quant-xquant-c1-l4-e5', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c1-l4', tags: ['U', '协作'],
    question: '「我先用 AI 跑通，之后再慢慢理解」这句话的主要风险是？',
    options: [
      { value: 'a', text: 'AI 可能收费，成本高' },
      { value: 'b', text: '「之后」往往不会到来，而你会带着不理解的代码继续往下，直到某个环节的判断需要它' },
      { value: 'c', text: 'AI 生成的代码有版权问题' },
      { value: 'd', text: '没有风险，这是高效学习法' },
    ],
    answer: 'b',
    explanation: '这是本课程最想阻止的一种学习方式。门槛被 AI 降到很低之后，能力增长很容易慢于产出增长——一堆「能跑但你不懂」的代码，会在需要判断（这个结果可信吗？这个参数能调吗？）的时候全部失效。',
  },
  {
    id: 'quant-xquant-c1-l4-e6', type: 'code', difficulty: 3,
    relatedLessonId: 'quant-xquant-c1-l4', tags: ['D', '协作'],
    setupCode: MKT,
    lang: 'python',
    question: '写两个抽检函数，模拟「收到 AI 交付的代码后如何自动验收」：\n\n1. `check_cost_direction(px, fast, slow)`：分别用 `cost_bps=0` 与 `cost_bps=2` 跑双均线策略（规则：快线上穿慢线次日持有），返回 `(不含成本收益, 含成本收益, 断言是否通过)`，通过条件为「含成本 ≤ 不含成本」；\n2. `check_no_lookahead(px, period=20)`：用「删尾法」检测前视偏差，删掉最后 20 个交易日重跑 MA(period) 择时策略，返回前段逐日收益的最大偏差（float）。\n\n策略收益口径：`pos = sig.shift(1)`，`pnl = pos*ret - |Δpos|*cost`。',
    starterCode: `
def pnl_ma(src, period=20, cost_bps=0.0):
    ma = src.rolling(period).mean()
    sig = (src > ma).astype(float); sig[ma.isna()] = 0.0
    pos = sig.shift(1).fillna(0.0)
    ret = src.pct_change().fillna(0.0)
    turn = pos.diff().abs().fillna(pos.abs())
    return pos * ret - turn * cost_bps / 1e4

def total(s):
    return ((1 + s).cumprod().iloc[-1] - 1) * 100

def check_cost_direction(px, fast=10, slow=60):
    pass

def check_no_lookahead(px, period=20):
    pass`,
    expectedOutput: '((27.72, 23.3, True), 偏差 0.0)  # MA10 口径',
    tests: `
free, paid, ok = check_cost_direction(px)
assert paid <= free, "含成本收益必须 ≤ 不含成本收益"
assert ok is True, "断言结果应为 True"
assert 20 < paid < 40, f"含成本收益量级异常：{paid}"

diff = check_no_lookahead(px)
assert isinstance(diff, float), "应返回 float"
assert diff < 1e-12, f"删尾后前段不应变化，实际偏差 {diff}"

# 反例：故意引入前视（用了全样本均值）必须被检出
def pnl_leaky(src, period=20, cost_bps=0.0):
    ma = src.rolling(period).mean()
    sig = (src > ma).astype(float); sig[ma.isna()] = 0.0
    pos = sig.shift(1).fillna(0.0)
    ret = src.pct_change().fillna(0.0)
    return pos * ret + (src - src.mean()) * 1e-6    # 全样本均值 = 泄漏
leak = check_no_lookahead(px, period=20, pnl_fn=pnl_leaky)
assert leak > 1e-12, f"泄漏版本应被检出的非零偏差，实际 {leak}"`,
    answer: `
def pnl_ma(src, period=20, cost_bps=0.0):
    ma = src.rolling(period).mean()
    sig = (src > ma).astype(float); sig[ma.isna()] = 0.0
    pos = sig.shift(1).fillna(0.0)
    ret = src.pct_change().fillna(0.0)
    turn = pos.diff().abs().fillna(pos.abs())
    return pos * ret - turn * cost_bps / 1e4

def total(s):
    return ((1 + s).cumprod().iloc[-1] - 1) * 100

def check_cost_direction(px, fast=10, slow=60):
    free = total(pnl_ma(px, period=fast, cost_bps=0))
    paid = total(pnl_ma(px, period=fast, cost_bps=2))
    return (round(float(free), 2), round(float(paid), 2), bool(paid <= free))

def check_no_lookahead(px, period=20, pnl_fn=None):
    fn = pnl_fn or pnl_ma
    head = px.iloc[:-20]
    full_run = fn(px, period=period, cost_bps=2)
    head_run = fn(head, period=period, cost_bps=2)
    idx = full_run.index.intersection(head_run.index)
    return float((full_run.loc[idx] - head_run.loc[idx]).abs().max())`,
    explanation: '两个函数对应本节演示里的抽检 1 与抽检 2。这里用 `pnl_ma(period=fast)` 近似双均线（快线单独择时，慢线作为对照），重点在于验收逻辑本身：成本方向必须单调，前段结果必须与未来数据无关。删尾法的精妙之处是它不需要你读懂策略逻辑，只需要比较两次运行的输出。',
  },
  {
    id: 'quant-xquant-c1-l4-e7', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c1-l4', tags: ['D', '协作'],
    question: '事故复盘：你让 AI 「帮我算一下这个均线策略的收益」，AI 返回「年化 28%，表现优秀」。你把结果写进笔记，两周后重跑发现年化只有 6%。\n\n请回答：\n① 列出至少 4 个可能造成这次偏差的原因，并说明每个原因属于哪一类（口径/数据/时间/成本）；\n② 针对每个原因，写出一条能提前防住的 spec 条款或验收标准；\n③ 从这件事里总结一条你自己的协作纪律。',
    referenceAnswer: `
① 可能原因（≥4 条，并按类归档）：
- 口径类：收益率口径不同（算术平均 vs 几何年化；简单收益 vs 对数收益）；
- 数据类：数据区间不同（AI 用了更长/更短的样本，或不同数据源），或用了不同复权方式；
- 时间类：信号当天就建仓吃当天收益（前视偏差），使结果虚高；
- 成本类：第一次没扣成本，第二次扣了；或两次的费率假设不同；
- 执行类：第一次用了次日最高价成交等过于乐观的成交假设；
- 归因类：两次的基准不同，「28%」其实是相对基准的超额而非绝对收益。

② 对应防线：
- 口径：spec 中写死「年化收益 = (净值末/净值初)^(252/交易日数) − 1」；
- 数据：上下文段点名「变量 px，2021-01-04 至 2025-12-26，共 1300 个交易日」，验收时断言 \`len(px)==1300\` 且首末日期一致；
- 时间：任务要求写「信号 t 日收盘后生成，t+1 日生效」，验收标准加「删尾法前段偏差 < 1e-12」；
- 成本：任务要求写死费率（如双边 2bp）与最低收费，验收标准加「扣成本后收益 ≤ 不扣成本」；
- 执行：任务要求写死成交价假设（如「次日开盘价」），验收标准打印该假设；
- 归因：验收标准要求同时打印策略与基准的绝对收益及两者之差。

③ 协作纪律（示例，答出自己的即可）：
「凡是要写进笔记的数字，必须同时记录：生成它的代码、spec 的四段、以及一组可复现的断言输出。没有这三样，这个数字就不算数。」

另一条同样合格：把每次 AI 交付保存为带时间戳的快照，重跑时对比而不是重写。`,
    rubric: [
      { point: '① 至少 4 个原因，且能正确归类（口径/数据/时间/成本）', score: 3 },
      { point: '② 每个原因都配到一条**可检查**的 spec 条款或验收标准', score: 4 },
      { point: '② 至少含一条前视偏差的可执行检测（删尾法/移位检验）', score: 2 },
      { point: '③ 纪律具体可执行，不是「要仔细」这类空话', score: 2 },
    ],
    keywords: ['口径', '复权', '前视', '成本', '断言', '可复现'],
    explanation: '这道题训练的是「把事故转成流程」的能力。评分重点在②：每一条原因都必须落到一条能写进 spec、能被断言检查的条款上，而不是停留在「下次注意」。',
  },
  {
    id: 'quant-xquant-c1-l4-e8', type: 'single', difficulty: 4,
    relatedLessonId: 'quant-xquant-c1-l4', tags: ['U', '协作'],
    question: '为什么「用更强的模型」并不能替代验收环节？',
    options: [
      { value: 'a', text: '因为更强的模型更贵' },
      { value: 'b', text: '因为模型越强，它按「自己最合理的理解」补全空白的幅度越大；而空白是你没写清的地方，不是它的错' },
      { value: 'c', text: '因为更强的模型会拒绝执行任务' },
      { value: 'd', text: '两者没有关系' },
    ],
    answer: 'b',
    explanation: '能力越强、补全越自信，这是同一个特性的两面。spec 的意义不随模型变强而下降——恰恰相反，你会给它更大的自由度，就更需要明确的边界与验收。',
  },
  {
    id: 'quant-xquant-c1-l4-e9', type: 'fill', difficulty: 3,
    relatedLessonId: 'quant-xquant-c1-l4', tags: ['K', '安全'],
    question: '安全红线：真实账户信息与 API Key 绝不进入______词，也绝不写进______；凭证一律通过______变量注入。',
    blanks: [['提示'], ['代码', '仓库', '日志'], ['环境']],
    explanation: '最常见的事故是把 Key 粘进对话框「帮我看下为什么报错」——Key 会以明文进入对方日志。正确做法：环境变量 + 占位符（如 `os.environ["XQ_KEY"]`），并把「不得把密钥写进代码或日志」写进任务要求。',
  },
  {
    id: 'quant-xquant-c1-l4-e10', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c1-l4', tags: ['U', '协作'],
    question: '把 AI 生成的代码读懂了、能复述它的每一行，就说明这段代码的结论可以信任。',
    answer: false,
    explanation: '「读懂代码」解决的是「实现是否忠实于意图」，解决不了「意图本身对不对」。结论是否可信，取决于 spec 的口径、样本外验证与统计显著性——这些都需要独立的检验动作，不能靠读懂代码获得。',
  },
];

export const quantXquantC1AllExercises: Exercise[] = [...BASE, ...EXTRA];
