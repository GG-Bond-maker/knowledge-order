import type { Exercise } from '../../../types';

/* c1 习题：按 scripts/exercise-rules.mjs 的题量-难度映射
 * l1 diff2 → 8 题；l2 diff2 → 8 题；l3 diff3 → 10 题；l4 diff3 → 10 题，共 36 题。
 * 题型遵循金字塔：客观题多、开放题少；KUD 标注在 tags。
 * 前置变量统一由 setupCode = XQ_MARKET 注入（含 px）。
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

export const quantXquantC1Exercises: Exercise[] = [
  /* ═══════════ l1：量化不是预测（8 题）═══════════ */
  {
    id: 'quant-xquant-c1-l1-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c1-l1', tags: ['K', '基础'],
    question: '本课程给「量化策略」的两条硬性条件是？',
    options: [
      { value: 'a', text: '规则明确（两人照做会做同样操作）+ 执行可重复（同数据同规则同结果）' },
      { value: 'b', text: '能预测涨跌 + 胜率超过 60%' },
      { value: 'c', text: '用了机器学习 + 有回测报告' },
      { value: 'd', text: '资金量大 + 交易频繁' },
    ],
    answer: 'a',
    explanation: '两条条件都不涉及「预测能力」。不满足这两条，讨论「策略好不好」就是在讨论一个不存在的对象——因为你连一个可被检验的对象都还没有定义出来。',
  },
  {
    id: 'quant-xquant-c1-l1-e2', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c1-l1', tags: ['U', '基础'],
    question: '「量化交易就是用模型预测股价涨跌」——这句话准确概括了量化交易的目标。',
    answer: false,
    explanation: '量化更准确的定义是「用明确规则 + 可重复执行替代随机决策，并让结论可被审计」。绝大多数量化策略并不预测方向，它们只规定「在什么条件下承担什么风险」。把量化等同于预测，会让你不断去找「更准的指标」，而忽略成本、执行和过拟合这些真正决定盈亏的环节。',
  },
  {
    id: 'quant-xquant-c1-l1-e3', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c1-l1', tags: ['K', '框架'],
    question: '四个阶段依次是：确定候选 → 制定______ → 执行______ → 评估______。',
    blanks: [['规则', '交易规则'], ['交易', '执行', '订单'], ['归因', '复盘', '归因分析']],
    explanation: '「确定候选 / 制定规则 / 执行交易 / 评估归因」是一个闭环而不是直线：评估归因的结论会反过来改下一轮的候选、规则与执行方式。四个阶段还能各自独立失败，互不替代。',
  },
  {
    id: 'quant-xquant-c1-l1-e4', type: 'multiple', difficulty: 2,
    relatedLessonId: 'quant-xquant-c1-l1', tags: ['U', '框架'],
    question: '关于「做 / 看 / 疑」三个环节，下列说法正确的有？',
    options: [
      { value: 'a', text: '「做」的失败长什么样：规则含糊到无法翻译成代码，或者能跑但逻辑不是你想的' },
      { value: 'b', text: '「看」的典型失败是只看总收益率，把「赚了」当成「策略好」' },
      { value: 'c', text: '「疑」的典型失败是在历史数据上反复调参，然后相信调出来的最优值' },
      { value: 'd', text: '三个环节里，「疑」最重要，所以可以先跳过「看」' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 错在对「疑」的误解：「疑」的对象正是「看」出来的那些数字。没有「看」的能力，你不知道该怀疑什么。三个环节是串联的，不能跳过任何一个。',
  },
  {
    id: 'quant-xquant-c1-l1-e5', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c1-l1', tags: ['K', '术语'],
    question: '「跌多了就买」这句话要写进代码前必须先量化。用来构成「过去 N 日」这类判断的滚动计算，在 pandas 里用 ______（方法名）实现；而计算持仓后每日收益时，为避免前视偏差，信号需要 ______（方法名）一位。',
    blanks: [['rolling'], ['shift']],
    explanation: '`px.rolling(20).mean()` 是滚动均线，每一天只用当天及之前的数据；`sig.shift(1)` 让 t 日生成的信号在 t+1 日才生效。这两个方法贯穿本课程全部策略代码。',
  },
  {
    id: 'quant-xquant-c1-l1-e6', type: 'code', difficulty: 2,
    relatedLessonId: 'quant-xquant-c1-l1', tags: ['D', '规则量化'],
    setupCode: MKT,
    lang: 'python',
    question: '把「跌多了」量化成可执行的布尔序列：实现 `dip_signal(px, kind, n=20)`，支持三种定义：\n- `kind="ma"`：收盘价 < 最近 n 日均线；\n- `kind="lag"`：收盘价 < n 个交易日前的收盘价；\n- `kind="dd"`：收盘价距最近 n 日最高价回撤超过 5%。\n\n返回**布尔 Series**（前 n-1 个位置因窗口不足应视为 False，不能是 NaN）。',
    starterCode: `
def dip_signal(px, kind, n=20):
    # 返回布尔 Series；前 n-1 个位置为 False
    pass

print(dip_signal(px, "ma").sum(), dip_signal(px, "lag").sum(), dip_signal(px, "dd").sum(), dip_signal(px, "dd", n=60).sum())`,
    expectedOutput: '（四个整数；实测 663 649 136 462）',
    tests: `
for k in ("ma", "lag", "dd"):
    s = dip_signal(px, k)
    assert isinstance(s, pd.Series), "必须返回 pandas Series"
    assert s.dtype == bool, f"{k}: dtype 必须是 bool，实际 {s.dtype}"
    assert s.iloc[:19].sum() == 0, f"{k}: 前 n-1 个位置必须为 False"
assert dip_signal(px, "ma").sum() == 663, f"ma 触发天数应为 663，实际 {dip_signal(px,'ma').sum()}"
assert dip_signal(px, "lag").sum() == 649, f"lag 触发天数应为 649"
assert dip_signal(px, "dd").sum() == 136, f"dd(n=20) 触发天数应为 136"
assert dip_signal(px, "dd", n=60).sum() == 462, f"dd(n=60) 触发天数应为 462"
# 三种定义不应完全相同
assert not dip_signal(px, "ma").equals(dip_signal(px, "lag")), "不同定义应给出不同日子"`,
    answer: `
def dip_signal(px, kind, n=20):
    if kind == "ma":
        sig = px < px.rolling(n).mean()
    elif kind == "lag":
        sig = px < px.shift(n)
    elif kind == "dd":
        sig = px < px.rolling(n).max() * 0.95
    else:
        raise ValueError(kind)
    return sig.fillna(False).astype(bool)`,
    explanation: '三种定义都满足「规则明确」，但触发的日子差很多（663 / 649 / 136 天；把回撤窗口放到 60 日则是 462 天）。这就是为什么讨论「抄底策略好不好」之前必须先说清是哪一种定义。注意 `fillna(False)` 之后再 `astype(bool)`：rolling 造成的 NaN 直接参与比较会得到 False，但显式转换能保证 dtype 稳定。',
  },
  {
    id: 'quant-xquant-c1-l1-e7', type: 'open', difficulty: 3,
    relatedLessonId: 'quant-xquant-c1-l1', tags: ['D', '实验设计'],
    question: '有人告诉你：「我发现一个规律——大盘连跌三天之后买入，第二天大概率反弹。」请回答：\n① 这条规律要变成可验证的策略，还缺哪 4 个关键定义？\n② 你会怎么设计一个实验来初步检验它？\n③ 如果实验结果显示「连跌三天后次日平均收益 +0.3%，全样本平均 +0.1%」，你会认为规律成立吗？说明理由。',
    referenceAnswer: `
① 缺的 4 个定义：
- 「大盘」指哪个指数/标的（上证指数？沪深300？还是某只ETF）——对象；
- 「连跌三天」是连续 3 个交易日跌幅都 < 0，还是累计跌幅超过某个阈值——条件；
- 「买入」在哪个时点成交（第三天下跌收盘时？第四天开盘？）——时点；
- 「第二天反弹」的判定标准（次日收益 > 0？还是次日收益 > 全样本均值？）——判定。

② 实验设计：
- 固定标的与时间窗，用可复现数据；
- 用布尔序列标出所有「连跌三天」的日期；
- 计算这些日期之后次日的收益分布（均值、中位数、胜率、样本数）；
- 同时计算全样本无条件平均收益作为基准；
- 分前后两段各自检验一次（样本外），看结论是否稳定。

③ 不能认为成立，理由至少三条：
- 「+0.3% vs +0.1%」的差距可能完全落在噪声范围内：需要看样本数与该差距的标准误，做统计检验；
- 只看均值掩盖了分布：可能绝大多数时候小赚、极少数时候巨亏（盈亏比极差）；
- 单一样本期内成立不代表样本外成立，更不代表未来有效；且如果这个规律是「试了很多条规则后挑出来的」，还要做多重检验校正。`,
    rubric: [
      { point: '① 四个定义（对象/条件/时点/判定）都点到且说清为什么是必需的', score: 3 },
      { point: '② 实验包含「对照基准」与「可复现」两个要素', score: 2 },
      { point: '③ 明确拒绝仅凭均值差下结论，且理由至少含统计显著性或分布形态之一', score: 3 },
      { point: '③ 提到样本外验证或多重检验问题', score: 2 },
    ],
    keywords: ['标的', '时点', '基准', '样本外', '统计', '噪声', '分布'],
    explanation: '这道题的核心是把「听说一个规律」变成「可检验的实验」，而不是讨论这个规律对不对。评分重点在①的完整性与③的怀疑能力。',
  },
  {
    id: 'quant-xquant-c1-l1-e8', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c1-l1', tags: ['U', '框架'],
    question: '某策略在回测中「选错标的」和「执行成本超预期」两类问题的关系是？',
    options: [
      { value: 'a', text: '四类失败互不替代：选错标的无法用更好的规则弥补，成本吃掉收益也无法靠标的选择挽回' },
      { value: 'b', text: '只要规则足够好，选错标的也能赚钱' },
      { value: 'c', text: '成本只影响高频策略，低频策略可以忽略' },
      { value: 'd', text: '两者都属于「评估归因」阶段的问题' },
    ],
    answer: 'a',
    explanation: '四个阶段各自能独立失败，这正是要把它们分开讨论的原因。b 混淆了「规则」与「标的」；c 错在成本对所有策略都成立，只是量级不同（第 8 章会用具体数字展示四层成本如何吃掉收益）；d 混淆了问题发生的阶段与问题被发现的阶段。',
  },

  /* ═══════════ l2：spec 四段骨架（8 题）═══════════ */
  {
    id: 'quant-xquant-c1-l2-e1', type: 'fill', difficulty: 1,
    relatedLessonId: 'quant-xquant-c1-l2', tags: ['K', 'spec'],
    question: 'spec 的四段骨架是：上下文 → 任务______ → 任务______ → ______标准。',
    blanks: [['描述'], ['要求'], ['验收']],
    explanation: '四段各自防一种失败：上下文防「重复劳动/假设错误状态」；任务描述防「目标被步骤淹没」；任务要求防「口径不一致与边界崩溃」；验收标准防「跑完就宣布完成」。',
  },
  {
    id: 'quant-xquant-c1-l2-e2', type: 'single', difficulty: 2,
    relatedLessonId: 'quant-xquant-c1-l2', tags: ['U', 'spec'],
    question: '「帮我算一下这个策略的收益」这句话最大的问题是什么？',
    options: [
      { value: 'a', text: '太短了，显得不专业' },
      { value: 'b', text: '它把至少六个决策留给了执行方（标的/数据区间/收益口径/是否扣成本/输出形式/如何验收）' },
      { value: 'c', text: '没有说明用什么编程语言' },
      { value: 'd', text: '没有说明这是给谁看的' },
    ],
    answer: 'b',
    explanation: '长度不是问题，**空白**才是问题。更危险的是：执行方会自信地替你选完六个决策并交付一份看起来完整的结果，你不会收到「这里有六个决策我定不了」的提示。',
  },
  {
    id: 'quant-xquant-c1-l2-e3', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c1-l2', tags: ['U', 'spec'],
    question: 'spec 写得越长越好，因为信息越全执行方越不容易出错。',
    answer: false,
    explanation: 'spec 的目标是**消除歧义**，不是堆字数。判断标准是「删掉这句，执行方会不会做错」——不会就删。啰嗦的 spec 会让关键约束被淹没，反而提高出错概率。',
  },
  {
    id: 'quant-xquant-c1-l2-e4', type: 'multiple', difficulty: 2,
    relatedLessonId: 'quant-xquant-c1-l2', tags: ['U', 'spec'],
    question: '下列哪些内容属于「任务要求」段该写的（而不是验收标准段）？',
    options: [
      { value: 'a', text: '函数签名 backtest_dca(px, amount=1000)' },
      { value: 'b', text: '返回 DataFrame 的列名固定为 cost/shares/value/ret' },
      { value: 'c', text: '打印投资月数与总投入，保留 2 位小数' },
      { value: 'd', text: '均线窗口不足时这些月份不买入' },
    ],
    answer: ['a', 'b', 'd'],
    explanation: 'c 是「怎么算做对了」→ 验收标准段。a/b/d 是「具体怎么做」→ 任务要求段。区分方法：任务要求是约束实现方式，验收标准是约束检查方式。',
  },
  {
    id: 'quant-xquant-c1-l2-e5', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c1-l2', tags: ['K', 'spec'],
    question: '验收标准必须「可检查」。它需要同时满足三条：有明确______（检查哪个变量）、有判定______（通过/不通过的边界）、可无歧义______（换个人照做结论相同）。',
    blanks: [['对象'], ['条件'], ['执行']],
    explanation: '缺任何一条都不可检查。最隐蔽的是第三条：「收益率应该是合理的」看起来有对象也有条件，但「合理」没有边界，换个人判断就不同。',
  },
  {
    id: 'quant-xquant-c1-l2-e6', type: 'code', difficulty: 2,
    relatedLessonId: 'quant-xquant-c1-l2', tags: ['D', 'spec'],
    lang: 'python',
    question: '实现一个 spec 结构检查器 `audit_spec(spec: str) -> dict`，返回：\n- `missing`：缺失的段落名列表（段落名为 `["上下文", "任务描述", "任务要求", "验收标准"]` 中不在 spec 里的）；\n- `has_number`：spec 中是否出现阿拉伯数字（`True`/`False`）；\n- `score`：`(4 - len(missing)) / 4`，保留 2 位小数。\n\n提示：用 `in` 判断子串，用 `re.search(r"\\d", spec)` 判断数字。',
    starterCode: `
import re

SECTIONS = ["上下文", "任务描述", "任务要求", "验收标准"]

def audit_spec(spec):
    pass

print(audit_spec("【上下文】有 px。【任务描述】做定投。"))`,
    expectedOutput: "{'missing': ['任务要求', '验收标准'], 'has_number': False, 'score': 0.5}",
    tests: `
r = audit_spec("【上下文】有 px。【任务描述】做定投。")
assert r["missing"] == ["任务要求", "验收标准"], r
assert r["has_number"] is False, r
assert r["score"] == 0.5, r
full = "上下文 任务描述 任务要求 验收标准 1000 元"
r2 = audit_spec(full)
assert r2["missing"] == [] and r2["has_number"] is True and r2["score"] == 1.0, r2
assert audit_spec("")["score"] == 0.0, "空 spec 得分为 0"`,
    answer: `
import re

SECTIONS = ["上下文", "任务描述", "任务要求", "验收标准"]

def audit_spec(spec):
    missing = [s for s in SECTIONS if s not in spec]
    has_number = bool(re.search(r"\\d", spec))
    score = round((4 - len(missing)) / 4, 2)
    return {"missing": missing, "has_number": has_number, "score": score}`,
    explanation: '这个检查器只能做「段落在不在」和「有没有数字」的粗筛，一定会漏判误判（比如把「打印」写在无关处也算数）。它的价值是说明「可检查性」本身可以被部分机械化——而完整判断仍要靠人。',
  },
  {
    id: 'quant-xquant-c1-l2-e7', type: 'open', difficulty: 3,
    relatedLessonId: 'quant-xquant-c1-l2', tags: ['D', 'spec'],
    question: '下面是一份真实风格的模糊需求：\n\n> 「用沪深300ETF最近三年数据，做个双均线策略回测，看看效果怎么样，画个图。」\n\n请把它改写成完整四段式 spec。要求：\n① 补齐上下文、任务要求、验收标准（任务描述可保留改写）；\n② 任务要求里必须写清「信号何时生效」（防前视偏差）；\n③ 验收标准必须包含**双分支结论**（无论是否跑赢基准，都给出预定的解读）。',
    referenceAnswer: `
【上下文】已有变量 px：收盘价 Series，DatetimeIndex，2022-01-04 至 2025-12-26，约 1000 个交易日（本站合成行情，可复现，seed=11）。无其他变量。

【任务描述】用快慢双均线做日频择时回测：快线上穿慢线则次日持有，下穿则次日空仓；与「买入持有」基准对比。

【任务要求】
1. 函数 backtest_ma(px, fast=10, slow=60, cost_bps=2) → DataFrame，列名固定为 pos, ret, equity；
2. 信号在 t 日收盘后按 MA 判断，**t+1 日生效**：pos = sig.shift(1)，禁止用当天信号吃当天收益；
3. 扣双边成本 cost_bps 个基点，按仓位变化量计算；
4. 基准为买入持有，同区间、同成本（仅一次建仓）；
5. 输出累计收益、年化收益、年化波动、最大回撤、夏普（夏普用年化收益/年化波动，无风险利率取 0）。

【验收标准】
1. 打印上述 5 个指标（各保留 2 位小数），策略与基准各一行；
2. 打印「策略累计收益 − 基准累计收益」（相对基准收益差）；
3. 若策略跑赢基准，打印：「该走势下双均线择时提供了正超额」；
4. 若策略未跑赢基准，打印：「该走势下择时未提供超额，买入持有更优」；
5. 无论哪种结果，追加打印：「本结论仅对这段样本成立，且未做样本外与参数敏感性检验，不足以说明策略有效」；
6. 断言：扣成本后策略累计收益 ≤ 不扣成本时；且 equity 首值 = 1.0。`,
    rubric: [
      { point: '四段齐全，且上下文点名了变量名/区间/长度', score: 3 },
      { point: '任务要求明确写出「信号 t 日生成、t+1 日生效」', score: 3 },
      { point: '验收标准包含双分支结论（两种方向各有预定表述）', score: 3 },
      { point: '验收标准可检查（有具体数字/断言/明确输出项）', score: 3 },
      { point: '写明了「不能只凭这段样本下结论」这类元认知提醒', score: 1 },
    ],
    keywords: ['上下文', 'shift', '成本', '基准', '双分支', '断言', '样本外'],
    explanation: '评分重点不在「写得多漂亮」，而在三个硬点：信号时点（防前视）、双分支结论（防凑结果）、可检查性（防跑完就说完成）。原句「看看效果怎么样」正是典型的不可检查表述。',
  },
  {
    id: 'quant-xquant-c1-l2-e8', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c1-l2', tags: ['U', 'spec'],
    question: '验收标准里写「打印收益率」与写「打印收益率（保留 2 位小数）并断言与手算值误差 < 1e-6」，本质区别是？',
    options: [
      { value: 'a', text: '后者更啰嗦，前者的效果一样' },
      { value: 'b', text: '后者把「输出什么」升级成了「输出什么 + 怎样算对」，因此能抓住算错而不报错的情况' },
      { value: 'c', text: '前者更快，因为不用计算手算值' },
      { value: 'd', text: '两者没有区别，都只是格式要求' },
    ],
    answer: 'b',
    explanation: '回测代码的错误绝大多数不报错（例如收益率忘减 1）。「打印收益率」只保证有这个输出，「断言与手算值一致」才保证这个输出是对的。这正是「可检查」与「有输出」的分界线。',
  },
];
