import type { Exercise } from '../../../types';

/* c4 习题：难度 2/3/3/3 → 8/10/10/10，共 38 题。 */

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

export const quantXquantC4Exercises: Exercise[] = [
  /* ═══════════ l1：等权（8 题）═══════════ */
  {
    id: 'quant-xquant-c4-l1-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c4-l1', tags: ['K', '权重'],
    question: '等权（1/N）的权重公式是？',
    options: [
      { value: 'a', text: 'wᵢ = 1/N，N 为标的数量' },
      { value: 'b', text: 'wᵢ = σᵢ / Σσⱼ' },
      { value: 'c', text: 'wᵢ = 收益率ᵢ / Σ收益率ⱼ' },
      { value: 'd', text: 'wᵢ = 1/σᵢ' },
    ],
    answer: 'a',
    explanation: 'b 是「波动加权」（与风险平价相反），d 少了归一化。等权不需要估计任何参数，这是它最大的优点（也因此在 1/N 悖论中常常打败复杂优化器）。',
  },
  {
    id: 'quant-xquant-c4-l1-e2', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c4-l1', tags: ['U', '权重'],
    question: '等权组合买入后不需要再平衡，权重会自然保持 33.3%。',
    answer: false,
    explanation: '权重会随价格漂移：涨得多的标的权重变大。不再平衡的等权实际上会逐渐变成动量策略。要维持等权必须定期再平衡。',
  },
  {
    id: 'quant-xquant-c4-l1-e3', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c4-l1', tags: ['K', '风险'],
    question: '本节实测三个标的年化波动：A 为 11.01%、B 为 13.97%、C 为 7.03%。在等权下，B 贡献约 ______% 的风险，C 只贡献约 ______%（忽略相关性的教学近似）。',
    blanks: [['43.6', '43.64'], ['22', '22.0', '21.97']],
    explanation: '按 RCᵢ ≈ wᵢσᵢ / Σwⱼσⱼ：三者 w×σ 之和 = 0.333×(11.01+13.97+7.03) = 10.67，B 是 4.66/10.67 ≈ 43.6%，C 是 2.34/10.67 ≈ 22.0%。这就是「平均分钱 ≠ 平均分影响力」。',
  },
  {
    id: 'quant-xquant-c4-l1-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c4-l1', tags: ['U', '实现'],
    question: '回测组合收益时，下列做法会导致结果失真？',
    options: [
      { value: 'a', text: '用「固定权重 × 日收益」求和，相当于假设每天都再平衡' },
      { value: 'b', text: '不检查权重之和是否为 1' },
      { value: 'c', text: '用全期波动率来分配权重（回测起点就用到未来信息）' },
      { value: 'd', text: '让权重随价格漂移、只在再平衡日拉回' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 是正确做法。a 会低估成本（每天再平衡换手极高）；b 会引入隐性杠杆；c 是前视偏差。这三条是本课程反复强调的三处高频错误。',
  },
  {
    id: 'quant-xquant-c4-l1-e5', type: 'code', difficulty: 2,
    relatedLessonId: 'quant-xquant-c4-l1', tags: ['D', '实现'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `ew_weights(cols)` 返回等权权重 Series（索引为 cols，和为 1），并实现 `risk_share(ret, w)` 计算「忽略相关性的风险贡献占比」（%），返回 Series。',
    starterCode: `
def ew_weights(cols):
    pass

def risk_share(ret, w):
    pass

print(ew_weights(["A","B","C"]).tolist())
print(risk_share(RET, EW).round(1).tolist())`,
    expectedOutput: '[0.333..., ...] 与 [34.4, 43.6, 22.0] 附近',
    tests: `
w = ew_weights(list("ABC"))
assert abs(w.sum() - 1) < 1e-9, f"权重和应为 1，实际 {w.sum()}"
assert all(abs(w[a] - 1/3) < 1e-12 for a in "ABC"), "应为等权"

rs = risk_share(RET, EW)
assert abs(rs.sum() - 100) < 1e-6, f"占比之和应为 100，实际 {rs.sum()}"
assert abs(rs["B"] - 43.64) < 0.3, f"B 应约 43.6%，实际 {rs['B']}"
assert abs(rs["C"] - 21.97) < 0.3, f"C 应约 22.0%，实际 {rs['C']}"
assert rs["B"] > rs["A"] > rs["C"], "风险贡献排序应为 B > A > C"`,
    answer: `
def ew_weights(cols):
    n = len(cols)
    return pd.Series({c: 1.0 / n for c in cols})

def risk_share(ret, w):
    vol = ret.std() * np.sqrt(252)
    contrib = pd.Series({a: w[a] * vol[a] for a in ret.columns})
    return contrib / contrib.sum() * 100`,
    explanation: '注意 risk_share 是「忽略相关性」的近似（教学口径）。严格定义是 RCᵢ = wᵢ(Σw)ᵢ/σ_p，需要协方差矩阵——那样算出来的占比会不同，但排序一般不变。',
  },
  {
    id: 'quant-xquant-c4-l1-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c4-l1', tags: ['U', '实现'],
    question: '用「固定权重 × 日收益」计算组合收益，隐含的假设是？',
    options: [
      { value: 'a', text: '每天都再平衡回目标权重' },
      { value: 'b', text: '买入后从不交易' },
      { value: 'c', text: '没有任何交易成本' },
      { value: 'd', text: '标的之间完全相关' },
    ],
    answer: 'a',
    explanation: '固定权重意味着每天都把权重拉回目标值——这在真实中需要每天调仓，换手极高、成本极大。正确做法是让权重随价格漂移，只在再平衡日拉回。',
  },
  {
    id: 'quant-xquant-c4-l1-e7', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c4-l1', tags: ['D', '风险'],
    question: '有人说：「等权是最公平的分法，因为每个资产都得到同样的钱。」请回答：\n① 这个说法在风险维度上错在哪里？用本节的数字说明；\n② 描述一个「等权会导致严重后果」的具体场景；\n③ 如果不用等权，你会怎么改进？说明改进后又会引入什么新问题。',
    referenceAnswer: `
① 风险维度的问题：
「同样的钱」不等于「同样的话语权」。本节实测：A/B/C 年化波动 11.01%/13.97%/7.03%，等权 33.3% 下 B 贡献约 43.6% 的风险、C 只贡献 22.0%。
也就是说，B 用 1/3 的资金掌握了近 4 成的风险话语权，而 C 用同样的钱只承担不到 2 成。组合的「紧张程度」由波动最大的资产主导，等权并没有实现「公平」。

② 严重后果场景：
组合同时包含「短债 ETF（年化波动 2%）」和「小盘题材股（年化波动 50%）」，各 50% 等权。
- 名义上「一半稳健、一半激进」；
- 实际上小盘股贡献约 0.5×50/(0.5×2+0.5×50) ≈ 96% 的风险；
- 结果是：组合几乎等于「100% 持有小盘股」，短债只起到了微不足道的缓冲作用。
场景会在小盘股暴跌时暴露：你以为有 50% 的稳健资产兜底，实际只有 4% 的风险对冲。

③ 改进与代价：
改进方案一：风险平价（wᵢ ∝ 1/σᵢ）——让风险贡献接近相等。
- 新问题：需要估计波动率（有估计误差）；完全按波动分配会让高收益资产权重偏低，收益下降；不处理相关性。
改进方案二：严格 ERC / 风险预算（用协方差矩阵）。
- 新问题：需要数值优化；协方差矩阵估计噪声大（高维时尤其），实践中要做收缩估计（Ledoit-Wolf）。
改进方案三：设置风险上限（单资产风险贡献 ≤ 某阈值）。
- 新问题：约束可能不可行（所有资产波动都很高时无解），且会引入优化器的边界问题。

结论：没有「公平的分法」，只有「明确的风险预算」。关键是先决定「我想让风险怎么分配」，再反推权重。`,
    rubric: [
      { point: '① 明确指出「同样的钱 ≠ 同样的风险话语权」，并用具体波动/贡献数字说明', score: 3 },
      { point: '② 给出具体场景（如短债+小盘股），并算出风险贡献极不均衡', score: 3 },
      { point: '③ 改进方案具体（风险平价/ERC/风险上限），且说明引入的新问题', score: 3 },
      { point: '③ 提出「先定风险预算再反推权重」这一原则性结论', score: 1 },
    ],
    keywords: ['风险贡献', '波动率', '风险平价', 'ERC', '风险预算', '协方差'],
    explanation: '这道题把「等权」从「公平」的直觉里拉出来。评分重点在②——能不能用一个具体场景算出「风险贡献严重失衡」，而不是只做定性描述。',
  },
  {
    id: 'quant-xquant-c4-l1-e8', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c4-l1', tags: ['U', '风险'],
    question: '分散化（等权持有多个标的）能提高组合收益率。',
    answer: false,
    explanation: '分散化改善的是风险指标（波动、回撤），不是收益。本节实测：等权组合 +41.69% 远低于单押 B 的 +105%。收益来自标的本身的预期收益，分散只是用「放弃极端收益」换「降低风险」。',
  },

  /* ═══════════ l2：风险平价（10 题）═══════════ */
  {
    id: 'quant-xquant-c4-l2-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c4-l2', tags: ['K', '风险平价'],
    question: '波动率倒数的权重公式是？',
    options: [
      { value: 'a', text: 'wᵢ = (1/σᵢ) / Σⱼ(1/σⱼ)' },
      { value: 'b', text: 'wᵢ = σᵢ / Σⱼσⱼ' },
      { value: 'c', text: 'wᵢ = 1/N' },
      { value: 'd', text: 'wᵢ = RAMᵢ / Σ RAMⱼ' },
    ],
    answer: 'a',
    explanation: 'b 恰好相反（波动大的反而多买），d 是动量排名。风险平价的逻辑是「波动大的少买」，所以用倒数并归一化。',
  },
  {
    id: 'quant-xquant-c4-l2-e2', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c4-l2', tags: ['K', '风险平价'],
    question: '本节实测风险平价权重：A 为 ______%、B 为 ______%、C 为 ______%（保留 1 位小数）。波动最小的 C 权重最高，波动最大的 B 权重最低。',
    blanks: [['29.8', '29.82'], ['23.5', '23.50'], ['46.7', '46.68']],
    explanation: '按 w ∝ 1/σ：1/11.01 : 1/13.97 : 1/7.03 ≈ 0.0908 : 0.0716 : 0.1422，归一化后即 29.82% / 23.50% / 46.68%。',
  },
  {
    id: 'quant-xquant-c4-l2-e3', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c4-l2', tags: ['U', '风险平价'],
    question: '风险平价的主要作用是把组合的最大回撤显著降下来。',
    answer: false,
    explanation: '本节实测：回撤从 −13.84% 只变到 −13.70%，几乎没动。风险平价降的是**波动**（8.02%→7.12%）。回撤由「下跌时的相关性」决定，那是它不处理的维度。',
  },
  {
    id: 'quant-xquant-c4-l2-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c4-l2', tags: ['U', '风险平价'],
    question: '「波动率倒数」与「严格 ERC」的差异包括？',
    options: [
      { value: 'a', text: '波动率倒数只用波动，不看相关性；ERC 用完整协方差矩阵' },
      { value: 'b', text: '波动率倒数有闭式解；ERC 通常需要数值优化' },
      { value: 'c', text: '波动率倒数只是近似让风险贡献接近，ERC 严格令其相等' },
      { value: 'd', text: '两者完全等价，只是名字不同' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: '本节演示已量化：简化版的风险贡献在 30/25/45 附近，而不是理想的 33/33/33。d 错——在相关性高、资产多时两者差异会很明显。',
  },
  {
    id: 'quant-xquant-c4-l2-e5', type: 'code', difficulty: 3,
    relatedLessonId: 'quant-xquant-c4-l2', tags: ['D', '风险平价'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `rp_weights(ret, window=None)`：\n- 若 window 为 None，用全期年化波动；否则用最后 window 个交易日的年化波动；\n- 按 w ∝ 1/σ 归一化；\n- 返回 Series（索引为 ret.columns，和为 1）。\n\n再实现 `strict_rc(ret, w)` 返回严格风险贡献占比（%），公式 RCᵢ = wᵢ(Σw)ᵢ/σ_p。',
    starterCode: `
def rp_weights(ret, window=None):
    pass

def strict_rc(ret, w):
    pass

print(rp_weights(RET).round(4).tolist())
print(strict_rc(RET, rp_weights(RET)).round(1).tolist())`,
    expectedOutput: '[0.2982, 0.2350, 0.4668] 与严格控制约 [37, 34, 29]',
    tests: `
w = rp_weights(RET)
assert abs(w.sum() - 1) < 1e-9, "权重和必须为 1"
assert abs(w["A"] - 0.2982) < 0.002, f"A 应约 29.82%，实际 {w['A']*100:.2f}%"
assert abs(w["B"] - 0.2350) < 0.002, f"B 应约 23.50%，实际 {w['B']*100:.2f}%"
assert abs(w["C"] - 0.4668) < 0.002, f"C 应约 46.68%，实际 {w['C']*100:.2f}%"
assert w["B"] < 1/3 < w["C"], "波动最大的 B 权重应低于等权，最小的 C 应高于等权"

w2 = rp_weights(RET, window=252)
assert abs(w2.sum() - 1) < 1e-9 and not np.allclose(w.values, w2.values), "窗口版权重应不同"

rc = strict_rc(RET, w)
assert abs(rc.sum() - 100) < 1e-6, f"RC 之和应为 100，实际 {rc.sum()}"
assert rc.max() - rc.min() > 5, "简化版并未让 RC 严格相等（实测极差约 8.6pp）"`,
    answer: `
def rp_weights(ret, window=None):
    src = ret if window is None else ret.iloc[-window:]
    vol = src.std() * np.sqrt(252)
    inv = 1.0 / vol
    return inv / inv.sum()

def strict_rc(ret, w):
    cov = ret.cov().values * 252
    wv = np.array([w[c] for c in ret.columns])
    sw = cov @ wv
    sigma_p = np.sqrt(wv @ sw)
    rc = wv * sw / sigma_p
    return pd.Series(rc / rc.sum() * 100, index=ret.columns)`,
    explanation: '注意两个坑：① w 的取值顺序必须与 ret.columns 对齐（用 w[c] 逐个取，不要直接 list(w)）；② window 版用的是「最后 N 天」，不能用全期——否则是前视偏差。最后一条断言验证了「简化版 ≠ 严格 ERC」。',
  },
  {
    id: 'quant-xquant-c4-l2-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c4-l2', tags: ['U', '风险平价'],
    question: '风险平价把权重从高收益的 B 移向低收益的 C，结果收益下降、波动下降、夏普不变。这说明？',
    options: [
      { value: 'a', text: '风险平价只改变了组合的「绝对规模感」，没有改变「性价比」' },
      { value: 'b', text: '风险平价是无效的方法' },
      { value: 'c', text: '夏普比率算错了' },
      { value: 'd', text: '应该把 C 的权重继续加大' },
    ],
    answer: 'a',
    explanation: '收益与波动同比例下降，比值不变（都是 0.87）。这不是「无效」，而是它解决的问题不同——它管风险分配，不管提高性价比。b 混淆了「没提升夏普」与「无效」。',
  },
  {
    id: 'quant-xquant-c4-l2-e7', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c4-l2', tags: ['D', '研究设计'],
    question: '你要为一个包含「国债（年化波动 4%）、沪深300（11%）、黄金（7%）、原油（35%）」的组合分配权重。请回答：\n① 用风险平价算，四个资产的权重排序会是怎样？说明理由；\n② 这个结果有什么明显的隐患？\n③ 你会怎么改进（给出至少 2 条具体措施），并说明各自的代价。',
    referenceAnswer: `
① 权重排序（w ∝ 1/σ）：
1/4 : 1/11 : 1/7 : 1/35 = 0.250 : 0.0909 : 0.1429 : 0.0286
归一化（合计 0.5124）：
- 国债 ≈ 48.8%（最高）
- 黄金 ≈ 27.9%
- 沪深300 ≈ 17.7%
- 原油 ≈ 5.6%（最低）

② 隐患：
- **收益被低波动资产拖累**：国债占了近一半资金，组合整体收益会很低（国债预期收益通常只有 2-3%）；
- **实际风险可能并不均衡**：原油虽然只占 5.6%，但它是高波动且有极端尾部（2020 年负油价）的资产，简化版风险平价没处理「尾部风险」与「相关性跳变」；
- **相关性未被处理**：危机时国债与股票可能负相关（有益），但黄金与原油的相关性不稳定；简化版完全不看这个；
- **需要杠杆才能达到目标收益**：真实风险平价往往加杠杆，而杠杆会放大尾部风险；
- **波动率估计噪声**：用滚动窗口估的波动率不稳定，尤其在原油这种波动率时变极大的资产上。

③ 改进措施与代价：
- **措施一：风险预算（Risk Budgeting）而非等风险**。给股票更高的风险预算（如 50%），给国债较低（20%），让组合兼顾收益目标。
  代价：需要主观设定风险预算，引入了「判断」，不再是纯客观。
- **措施二：用严格 ERC + 协方差收缩估计（Ledoit-Wolf）**。处理相关性与估计噪声。
  代价：需要数值优化与更多数据；高维时协方差估计仍不稳定。
- **措施三：加尾部风险约束**（如对原油设单资产权重上限 5%、或对 CVaR 设约束）。
  代价：约束可能让优化不可行；且尾部风险本身难以从历史估计。
- **措施四：对波动率做长期均值化**（用 3 年窗口或与长期均值混合），避免在波动率低谷时过度加仓。
  代价：反应变慢，可能错过「波动率持续上升」的早期信号。`,
    rubric: [
      { point: '① 权重排序正确（国债 > 黄金 > 股票 > 原油），且给出计算依据', score: 3 },
      { point: '② 指出「低波动资产占大权重导致收益低」这一核心隐患', score: 2 },
      { point: '② 提到尾部风险、相关性或波动率估计噪声中的至少一项', score: 2 },
      { point: '③ 至少 2 条改进措施，且各自说明代价', score: 3 },
    ],
    keywords: ['风险平价', '波动率', '尾部风险', '风险预算', 'ERC', '杠杆'],
    explanation: '这道题把风险平价放到「真实多资产组合」里检验。评分重点在②③——能不能看出「纯风险平价会让组合变得过于保守」，并给出兼顾收益的改进。',
  },
  {
    id: 'quant-xquant-c4-l2-e8', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c4-l2', tags: ['U', '偏差'],
    question: '用整段回测数据的波动率来计算风险平价权重是合理的，因为样本越大估计越准。',
    answer: false,
    explanation: '这是前视偏差：回测起点时你不可能知道整段数据的波动率。必须用滚动窗口（如过去 252 天）。样本大估计准是真的，但那是在「回测结束之后」才成立的知识。',
  },
  {
    id: 'quant-xquant-c4-l2-e9', type: 'fill', difficulty: 3,
    relatedLessonId: 'quant-xquant-c4-l2', tags: ['K', '风险平价'],
    question: '严格风险贡献公式：RCᵢ = wᵢ × (______·w)ᵢ / σ_p，其中 Σ 是年化______矩阵。各资产的 RC 之和恰好等于组合波动，这叫______分解。',
    blanks: [['Σ', '协方差矩阵', 'Sigma'], ['协方差'], ['欧拉', 'Euler']],
    explanation: '欧拉分解（Euler decomposition）是风险贡献的数学基础：σ_p 是权重的一次齐次函数，因此可以按资产完美拆解。这也是「风险贡献之和 = 组合波动」的原因。',
  },
  {
    id: 'quant-xquant-c4-l2-e10', type: 'single', difficulty: 4,
    relatedLessonId: 'quant-xquant-c4-l2', tags: ['U', '方法'],
    question: '如果组合里加入一个年化波动只有 1% 的现金类资产，风险平价会给出什么结果？',
    options: [
      { value: 'a', text: '现金类资产权重会接近 70-80%，组合收益被严重拉低，需要杠杆才有意义' },
      { value: 'b', text: '现金类资产权重会很小，因为它收益低' },
      { value: 'c', text: '权重不受影响，风险平价只看历史收益' },
      { value: 'd', text: '组合波动会上升' },
    ],
    answer: 'a',
    explanation: 'w ∝ 1/σ，现金 σ=1% 而其它资产 7%-14%，它的倒数会大出一个数量级，权重压倒性偏斜。这正是真实风险平价策略需要加杠杆的原因，也是它「看起来保守实则激进」的根源。',
  },

  /* ═══════════ l3：动量排名（10 题）═══════════ */
  {
    id: 'quant-xquant-c4-l3-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c4-l3', tags: ['K', '动量'],
    question: '风险调整动量 RAM 的构造是？',
    options: [
      { value: 'a', text: 'RAM = 动量 / 波动率' },
      { value: 'b', text: 'RAM = 波动率 / 动量' },
      { value: 'c', text: 'RAM = 动量 × 波动率' },
      { value: 'd', text: 'RAM = 动量 - 波动率' },
    ],
    answer: 'a',
    explanation: '除以波动率是为了避免「高波动资产的动量绝对值天然偏大」而霸占排名。它衡量的是「每单位波动换来多少涨幅」。',
  },
  {
    id: 'quant-xquant-c4-l3-e2', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c4-l3', tags: ['U', '动量'],
    question: '动量排名在三个资产的 RAM 全为负时，权重之和为 0，这是代码 bug。',
    answer: false,
    explanation: '这是规则的正确行为（「一个都不买」= 全持现金）。但工程上必须显式处理：权重和为 0 若直接用于计算会除零。本节实测末期只有 B 为正（全押 B），而「全为负」的空仓情形会在其他时点出现。',
  },
  {
    id: 'quant-xquant-c4-l3-e3', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c4-l3', tags: ['K', '成本'],
    question: '本节实测动量排名的换手是 ______ 次，而等权只有 ______ 次；加入 10bp 单边成本后，动量的累计收益从 225.09% 降到 ______%。',
    blanks: [['48.4', '48'], ['1.4', '1'], ['186.37', '186.4']],
    explanation: '换手是 34 倍，成本吃掉 4.94 个百分点（等权只吃掉 0.23pp）。换手是成本敏感性的直接代理指标——不看成本的对比会严重误导「哪种方法更好」的判断。',
  },
  {
    id: 'quant-xquant-c4-l3-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c4-l3', tags: ['U', '动量'],
    question: '动量排名的结构性弱点包括？',
    options: [
      { value: 'a', text: '震荡市失效（动量是后视镜，容易买在阶段顶）' },
      { value: 'b', text: '动量崩塌（前期赢家集体回落）' },
      { value: 'c', text: '高换手导致成本侵蚀' },
      { value: 'd', text: '计算复杂度太高，普通电脑跑不动' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 是伪弱点——动量计算只是 rolling 与除法，1300 行数据瞬间完成。真实弱点集中在「信号性质」（a/b）与「成本」（c）。',
  },
  {
    id: 'quant-xquant-c4-l3-e5', type: 'code', difficulty: 3,
    relatedLessonId: 'quant-xquant-c4-l3', tags: ['D', '动量'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `ram_factor(px, ret, look=20)`：返回 RAM DataFrame（= 动量/波动，动量用 px.pct_change(look)，波动用 ret.rolling(look).std()×√252）。\n\n再实现 `mom_weights(ram_row)`：给一行 RAM，返回等权分配给 RAM>0 的标的的权重 Series；若全为负（或全 NaN），返回全 0 权重。',
    starterCode: `
def ram_factor(px, ret, look=20):
    pass

def mom_weights(ram_row):
    pass

r = ram_factor(PX, RET)
print(mom_weights(r.iloc[-1]).tolist())`,
    expectedOutput: '末期只有 B 为正 → [0.0, 1.0, 0.0]',
    tests: `
r = ram_factor(PX, RET)
assert r.shape == RET.shape, "形状应与 RET 一致"
assert r.iloc[:19].isna().all().all(), "前 19 行应为 NaN（窗口不足）"
assert abs(r["B"].iloc[-1] - (PX["B"].pct_change(20).iloc[-1] / (RET["B"].rolling(20).std().iloc[-1]*np.sqrt(252)))) < 1e-9, "RAM 计算口径不对"

w = mom_weights(r.iloc[-1])
assert abs(w["B"] - 1.0) < 1e-12, f"末期只有 B 为正，B 权重应为 1，实际 {w['B']}"
assert w["A"] == 0.0 and w["C"] == 0.0, "负动量权重应为 0"

# 构造一行部分为正的情形
row = pd.Series({"A": 1.0, "B": -0.5, "C": 2.0})
w2 = mom_weights(row)
assert abs(w2.sum() - 1) < 1e-9, f"部分为正时权重和应为 1，实际 {w2.sum()}"
assert w2["B"] == 0.0, "负动量权重应为 0"
assert abs(w2["A"] - 1/3) < 1e-9 and abs(w2["C"] - 2/3) < 1e-9, f"应按等权分给正动量资产，实际 {w2.tolist()}"

# 构造一行全为负的情形 → 全 0（空仓）
neg = pd.Series({"A": -1.0, "B": -0.2, "C": -3.0})
w3 = mom_weights(neg)
assert abs(w3.sum()) < 1e-12, f"全负应返回全 0，实际和 {w3.sum()}"`,
    answer: `
def ram_factor(px, ret, look=20):
    mom = px.pct_change(look)
    vol = ret.rolling(look).std() * np.sqrt(252)
    return mom / vol

def mom_weights(ram_row):
    s = ram_row.dropna()
    pos = s[s > 0]
    if len(pos) == 0:
        return pd.Series(0.0, index=ram_row.index)
    return (pos / pos.sum()).reindex(ram_row.index).fillna(0.0)`,
    explanation: '两个关键点：① RAM 用「价格算动量、收益算波动」，两者窗口必须一致；② mom_weights 必须处理「全负」与「部分 NaN」两种边界，否则会除零或得到 NaN 权重。',
  },
  {
    id: 'quant-xquant-c4-l3-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c4-l3', tags: ['U', '动量'],
    question: '为什么动量因子要除以波动率（而不直接用过去涨跌幅排序）？',
    options: [
      { value: 'a', text: '因为高波动资产的动量绝对值天然更大，不调整会系统性霸占排名' },
      { value: 'b', text: '为了让计算更快' },
      { value: 'c', text: '因为波动率为 0 时更安全' },
      { value: 'd', text: '这是学术规定的标准做法，没有实际原因' },
    ],
    answer: 'a',
    explanation: '举例：甲涨 10% 波动 8%，乙涨 12% 波动 30%。不调整时乙排前面，但乙的 12% 可能只是噪声的正向偏移。除以波动后比较的是「每单位波动换来多少涨幅」，更公平。',
  },
  {
    id: 'quant-xquant-c4-l3-e7', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c4-l3', tags: ['D', '研究设计'],
    question: '本节动量排名在不含成本下夏普 2.82，远超等权的 0.87。你被要求评估「是否应该采用它」。请回答：\n① 列出至少 4 个在采纳前必须补做的检验；\n② 说明每个检验可能给出什么「坏消息」；\n③ 给出一条你认为最关键的建议。',
    referenceAnswer: `
① 必须补做的检验（≥4）：
1. **含成本的完整回测**：用真实费率（A 股佣金万分之几 + 印花税 0.1% 卖出单边 + 滑点）重算。
2. **换手与容量分析**：本节换手 48.4 次/5 年，需确认在不同资金规模下是否可行。
3. **样本外检验（时间切分，只用一次）**：60/40 切分，看样本外是否仍跑赢等权。
4. **参数敏感性**：动量窗口（10/20/60/120）与再平衡频率（5/21/63）的敏感性，看是高原还是锯齿。
5. **逐年/分段拆解**：看收益是否集中在某一年（是否存在「一年暴赚掩盖四年平庸」）。
6. **尾部风险分析**：动量崩塌时段的最大回撤与恢复时间。

② 各检验可能给出的坏消息：
1. 含成本：本节已实测，10bp 下收益从 225% 降到 186%（−4.94pp）；若费率更高（如 30bp+），优势会大幅缩小。
2. 换手/容量：高频调仓在小资金可行，但资金变大后会冲击价格；且频繁调仓在流动性差的时段可能无法成交。
3. 样本外：完全可能像第 2 章的冠军参数一样，样本外跑输等权（那个案例里样本外跑输基准 10.59pp）。
4. 参数敏感性：如果换个窗口夏普就从 2.82 掉到 0.9，说明当前值很可能是碰巧的（锯齿型）。
5. 逐年拆解：可能发现全部超额都来自某一年（例如 2024 年 B 的暴涨），其余年份与等权持平。
6. 尾部：动量崩塌时可能在一个月内回吐数年收益，且回撤恢复期极长。

③ 最关键的建议：
**「先做样本外 + 参数敏感性，再谈成本与容量」**。理由：如果这两项就否决了策略（很可能），后面的分析都是浪费。顺序上应先用「最可能否决」的检验过滤，这是研究效率的关键。
（另一条同样合格的建议：把「是否采纳」变成「在什么条件下采纳」——例如只在参数敏感性为高原型、且样本外相对基准超额 > 0 时才小仓位试运行。）`,
    rubric: [
      { point: '① 至少 4 个检验，覆盖成本/样本外/参数敏感性/逐年拆解中至少三项', score: 3 },
      { point: '② 每个检验都指出可能出现的坏消息，而不是只说「要检验」', score: 3 },
      { point: '② 提到「样本外可能跑输基准」这一具体风险', score: 2 },
      { point: '③ 给出有优先级依据的建议（先做最可能否决的检验）', score: 2 },
    ],
    keywords: ['成本', '换手', '样本外', '参数敏感性', '逐年', '动量崩塌'],
    explanation: '这道题的核心是「把一个漂亮数字变成一个研究计划」。评分重点在③——能不能说出「先做哪个检验、为什么先做它」，这体现的是研究效率意识。',
  },
  {
    id: 'quant-xquant-c4-l3-e8', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c4-l3', tags: ['U', '动量'],
    question: '动量排名在某段数据上夏普 2.82，说明它在这段数据上确实有效，可以作为长期策略。',
    answer: false,
    explanation: '「在这段数据上有效」与「可以长期使用」是两件事。动量策略的尾部风险（动量崩塌）可能在某段数据里恰好没出现，但在未来出现。必须做样本外与压力测试，而不是把历史表现当成承诺。',
  },
  {
    id: 'quant-xquant-c4-l3-e9', type: 'fill', difficulty: 3,
    relatedLessonId: 'quant-xquant-c4-l3', tags: ['K', '动量'],
    question: '动量排名可能出现两个极端权重：只剩一个正动量时变成 ______%（全押），全部为负时变成 ______%（空仓）。前者是集中风险，后者必须显式处理为持有现金。',
    blanks: [['100'], ['0']],
    explanation: '本课程实测末期是「只有 B 为正 → 全押 B」。这两个极端说明动量排名的权重极不稳定——与等权的恒定 33.3% 形成鲜明对比。',
  },
  {
    id: 'quant-xquant-c4-l3-e10', type: 'single', difficulty: 4,
    relatedLessonId: 'quant-xquant-c4-l3', tags: ['U', '方法'],
    question: '动量崩塌（momentum crash）最可能发生在什么时刻？',
    options: [
      { value: 'a', text: '市场风格急转时：前期输家集体大幅反弹，前期赢家集体回落' },
      { value: 'b', text: '市场长期横盘时' },
      { value: 'c', text: '所有资产同时缓慢上涨时' },
      { value: 'd', text: '交易成本下降时' },
    ],
    answer: 'a',
    explanation: '动量崩塌通常由「急剧反转」触发（如 2009 年金融危机后的反弹、2020 年疫情后的科技股）。它的特征是：前期赢家被快速抛售、前期输家被快速买入，动量组合同时承受「多头端下跌」与「空头端上涨」的双重损失。',
  },

  /* ═══════════ l4：夏普（10 题）═══════════ */
  {
    id: 'quant-xquant-c4-l4-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c4-l4', tags: ['K', '夏普'],
    question: '本课程的简化夏普定义是？',
    options: [
      { value: 'a', text: '年化收益 / 年化波动' },
      { value: 'b', text: '(年化收益 − 无风险利率) / 年化波动' },
      { value: 'c', text: '年化收益 / 最大回撤' },
      { value: 'd', text: '年化波动 / 年化收益' },
    ],
    answer: 'a',
    explanation: 'b 是标准夏普（本课程为教学简化不减无风险利率），c 是卡玛比率。正式报告必须用 b 并写明无风险利率取值，否则不同报告之间无法比较。',
  },
  {
    id: 'quant-xquant-c4-l4-e2', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c4-l4', tags: ['K', '夏普'],
    question: '本节实测简化夏普：等权 ______、风险平价 ______、动量排名 ______（保留 2 位）。等权与风险平价相同，因为后者只改变了「规模感」没改变「性价比」。',
    blanks: [['0.87'], ['0.87'], ['2.82']],
    explanation: '风险平价把权重从高收益高波动资产移向低收益低波动资产，收益与波动同比例下降，比值不变。这是本节最值得注意的现象之一。',
  },
  {
    id: 'quant-xquant-c4-l4-e3', type: 'multiple', difficulty: 2,
    relatedLessonId: 'quant-xquant-c4-l4', tags: ['U', '夏普'],
    question: '简化夏普的三个局限是？',
    options: [
      { value: 'a', text: '把上涨波动与下跌波动一视同仁' },
      { value: 'b', text: '只反映特定历史区间的表现' },
      { value: 'c', text: '波动为 0 时失效（分母为零）' },
      { value: 'd', text: '计算需要很大的算力' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 是伪局限（一行除法）。a 的改进是索提诺比率（只算下行波动）；b 的改进是样本外检验（第 8 章）；c 必须显式处理（否则 inf/NaN 会污染全部结果）。',
  },
  {
    id: 'quant-xquant-c4-l4-e4', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c4-l4', tags: ['U', '夏普'],
    question: '夏普比率为负说明这个策略一定亏钱了。',
    answer: false,
    explanation: '夏普为负只说明「收益低于无风险利率」，策略可能仍在赚钱（例如年化 2% 而同期无风险利率 3%）。用简化夏普时，负值只说明「收益为负」。',
  },
  {
    id: 'quant-xquant-c4-l4-e5', type: 'code', difficulty: 3,
    relatedLessonId: 'quant-xquant-c4-l4', tags: ['D', '夏普'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `sharpe_table(sim_dict)`：输入 {方法名: 日收益 Series}，返回 DataFrame（每行一个方法），列含 `ann`（年化%）、`vol`（波动%）、`sharpe`（简化夏普）、`calmar`（年化/|回撤|）、`sortino`（年化/下行波动），均保留 2 位小数。边界：下行波动为 0 时 sortino 记 0.0。',
    starterCode: `
def sharpe_table(sim_dict):
    pass

sims = {"等权": simulate(EW)[0], "只买A": simulate(ONLY_A)[0]}
print(sharpe_table(sims))`,
    expectedOutput: '两行指标表，等权 sharpe 约 0.87',
    tests: `
sims = {"等权": simulate(EW)[0], "只买A": simulate(ONLY_A)[0]}
df = sharpe_table(sims)
assert list(df.index) == ["等权", "只买A"], f"行索引不对: {list(df.index)}"
for c in ("ann", "vol", "sharpe", "calmar", "sortino"):
    assert c in df.columns, f"缺少列 {c}"
assert abs(df.loc["等权", "sharpe"] - 0.87) < 0.03, f"等权夏普应约 0.87，实际 {df.loc['等权','sharpe']}"
assert abs(df.loc["只买A", "ann"] - 0.14) < 0.05, f"只买A 年化应约 0.14%，实际 {df.loc['只买A','ann']}"
assert df.loc["等权", "vol"] < df.loc["只买A", "vol"], "等权波动应低于单资产"
assert df.loc["等权", "calmar"] > df.loc["只买A", "calmar"], "等权卡玛应高于单资产"

# 边界：全 0 收益序列
flat = {"全零": pd.Series([0.0] * len(RET), index=RET.index)}
d2 = sharpe_table(flat)
assert d2.loc["全零", "sortino"] == 0.0, "下行波动为 0 时 sortino 应记 0.0"`,
    answer: `
def sharpe_table(sim_dict):
    rows = {}
    for name, s in sim_dict.items():
        m = metrics(s)
        down = s[s < 0].std() * np.sqrt(252) * 100
        sortino = (m["ann"] / down) if down > 0 else 0.0
        calmar = (m["ann"] / abs(m["mdd"])) if m["mdd"] != 0 else 0.0
        sharpe = (m["ann"] / m["vol"]) if m["vol"] > 0 else 0.0
        rows[name] = {"ann": round(m["ann"], 2), "vol": round(m["vol"], 2),
                      "sharpe": round(sharpe, 2), "calmar": round(calmar, 2),
                      "sortino": round(sortino, 2)}
    return pd.DataFrame(rows).T`,
    explanation: '三个边界必须处理：波动为 0（夏普）、下行波动为 0（索提诺）、回撤为 0（卡玛）。不加保护会得到 inf，而 inf 会污染后续所有统计。这也是本节「局限 3」的代码形态。',
  },
  {
    id: 'quant-xquant-c4-l4-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c4-l4', tags: ['U', '夏普'],
    question: '等权与风险平价的简化夏普完全相同（都是 0.87），最准确的解释是？',
    options: [
      { value: 'a', text: '风险平价把权重从高收益高波动资产移向低收益低波动资产，收益与波动同比例下降' },
      { value: 'b', text: '这是一个巧合，换段数据就不同了' },
      { value: 'c', text: '说明两个策略的净值曲线完全相同' },
      { value: 'd', text: '说明夏普比率无法区分任何策略' },
    ],
    answer: 'a',
    explanation: '这不是巧合也不是「夏普无用」——它精确反映了风险平价的性质：改变组合的绝对风险水平，但不改变单位风险的收益效率。两者净值曲线完全不同（收益 41.69% vs 36.27%）。',
  },
  {
    id: 'quant-xquant-c4-l4-e7', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c4-l4', tags: ['D', '综合'],
    question: '你要向一个不懂金融的朋友解释「为什么不能只看夏普选策略」。请回答：\n① 用生活化类比解释夏普在衡量什么；\n② 举 3 个「夏普高但不该选」的具体情形，每个都要说明它利用了什么漏洞；\n③ 给出你自己选策略时会看的 3 个指标，并说明为什么是这三个。',
    referenceAnswer: `
① 生活化类比：
夏普就像「手机的性价比」——性能除以价格。它衡量的是「每承担一单位颠簸，换来多少收益」。
但它也只是比值：一款手机可能「性能很高但经常死机」（高收益高波动但尾部风险大），性价比数字好看不代表好用。

② 三个「夏普高但不该选」的情形：

**情形一：靠极少数暴涨拉高（尾部驱动）**
- 漏洞：标准差把「一次暴涨」和「持续小涨」算成同样的波动，但前者不可复制。
- 例：250 天里 240 天几乎不动，10 天暴涨 6%。夏普很高，但你几乎不可能恰好在暴涨前持有。
- 正确应对：看收益的分布形态（是否集中在少数时段）、看最大单日贡献占比。

**情形二：高换手策略（成本未计入）**
- 漏洞：夏普不扣交易成本。本节动量排名夏普 2.82，但换手是等权的 34 倍，加 10bp 成本后收益降 4.94pp。
- 正确应对：把成本计入后再算夏普，或同时看换手。

**情形三：短样本或特定区间**
- 漏洞：夏普只反映这段数据。第 2 章已经演示：同一个策略在训练集与测试集上可能完全反转（样本外跑输基准 10.59pp）。
- 正确应对：样本外检验 + 分段（逐年）拆解。

（可加分：情形四——空仓/低波资产导致夏普虚高，或波动率被低估时夏普虚高。）

③ 我会看的三个指标：
1. **含成本的简化夏普**（不含成本的夏普会系统性偏袒高换手策略）；
2. **最大回撤 + 恢复时间**（夏普完全不反映「最惨的时候有多惨、多久能回本」，而这直接决定能不能拿住）；
3. **换手次数**（成本与容量的代理指标，也是「策略是不是靠频繁交易撑着」的体检）。

为什么是这三个：它们覆盖了「性价比（含成本）」「尾部与心理承受」「可持续性（成本/容量）」三个维度，而夏普单独只覆盖第一个。`,
    rubric: [
      { point: '① 类比准确（性价比/风险调整），且指出「比值不能代表全部」', score: 2 },
      { point: '② 三个情形都具体，且各自说明「利用了夏普的哪个漏洞」', score: 4 },
      { point: '② 至少一个情形引用本课程的具体数字（换手 48.4 / 成本 4.94pp / 样本外 −10.59pp）', score: 2 },
      { point: '③ 三个指标覆盖性价比、尾部风险、可持续性三个维度', score: 2 },
    ],
    keywords: ['性价比', '尾部', '换手', '成本', '样本外', '回撤'],
    explanation: '这道题要求「把专业概念讲给外行」，是最高阶的理解检验。评分重点在②——能不能说清「夏普高」是被什么机制造出来的，而不只是背三条局限。',
  },
  {
    id: 'quant-xquant-c4-l4-e8', type: 'fill', difficulty: 3,
    relatedLessonId: 'quant-xquant-c4-l4', tags: ['K', '指标'],
    question: '夏普的改进指标：把分母换成「只算下行波动」的指标叫______比率；用「年化收益/|最大回撤|」的指标叫______比率；用「超额收益/跟踪误差」的指标叫______比率。',
    blanks: [['索提诺', 'Sortino'], ['卡玛', 'Calmar'], ['信息', 'Information']],
    explanation: '三个指标各补夏普的一个短板：索提诺补「上涨下跌一视同仁」，卡玛补「不反映回撤」，信息比率补「不与基准比较」。第 6 章会系统使用它们。',
  },
  {
    id: 'quant-xquant-c4-l4-e9', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c4-l4', tags: ['U', '方法'],
    question: '可以用夏普比率作为目标函数来优化参数，选出夏普最高的那组参数。',
    answer: false,
    explanation: '这直接把夏普变成优化目标，会导致过拟合（第 2 章已演示：按收益挑出的冠军在样本外失效，按夏普挑同样如此，而且同样存在「试得越多、越乐观」的选择偏差）。夏普是**排序工具**，不是**优化目标**。',
  },
  {
    id: 'quant-xquant-c4-l4-e10', type: 'single', difficulty: 4,
    relatedLessonId: 'quant-xquant-c4-l4', tags: ['U', '综合'],
    question: '综合本章三种方法：等权（夏普 0.87、换手 1.4）、风险平价（0.87、2.6）、动量排名（2.82、48.4）。若只能选一个作为「第一条上线的策略」，最稳妥的选择及理由是？',
    options: [
      { value: 'a', text: '等权：无参数、换手最低、最不容易过拟合，是最适合「第一条上线」的基线' },
      { value: 'b', text: '动量排名：夏普最高' },
      { value: 'c', text: '风险平价：波动最低' },
      { value: 'd', text: '三者都不该上线' },
    ],
    answer: 'a',
    explanation: '「第一条上线」的核心考量不是收益最大化，而是**最小化出错概率**：等权没有需要估计的参数（不过拟合）、换手最低（成本可控）、逻辑最简单（出问题好排查）。动量夏普最高但它有三个未验证的风险（成本、样本外、动量崩塌）。这是「工程稳健性优先于理论最优」的判断。',
  },
];

export const quantXquantC4ExercisesAll = quantXquantC4Exercises;
