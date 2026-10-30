import type { Exercise } from '../../../types';

/* c7 习题：难度 3/4/4/4/2 → 10/13/13/13/8，共 57 题。 */

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

/** 向量化动量回测（与逐日循环等价，已验证 490 组全部一致） */
const MOM_FN = `
def mom_ret(mom_win, vol_win, freq, stop=None):
    ram = (PX.pct_change(mom_win) / (RET.rolling(vol_win).std() * np.sqrt(252))).values
    P = PX.values
    n = len(P); warm = max(mom_win, vol_win)
    starts = [0] + [i for i in range(freq, n, freq) if i > warm]
    out = np.zeros(n)
    nav = nav_entry = 1.0
    in_pos = True
    for k, s in enumerate(starts):
        e = starts[k + 1] if k + 1 < len(starts) else n
        if not in_pos:
            in_pos = True; nav_entry = nav
        if s == 0:
            w = np.array([1/3, 1/3, 1/3])
        else:
            row = ram[s]
            if np.isnan(row).any():
                w = np.array([1/3, 1/3, 1/3])
            else:
                p = np.where(row > 0, row, 0.0)
                w = p / p.sum() if p.sum() > 0 else np.zeros(3)
        if w.sum() <= 0:
            continue
        base = P[s - 1] if s > 0 else P[s]
        G = (P[s:e] / base) @ w
        seg = G / np.concatenate([[1.0], G[:-1]]) - 1.0
        if stop is not None:
            hit = np.where(nav * G <= nav_entry * (1 - stop))[0]
            if len(hit):
                seg[hit[0] + 1:] = 0.0
                out[s:e] = seg
                nav = nav * G[hit[0]]
                in_pos = False
                continue
        out[s:e] = seg
        nav = nav * G[-1]
    return pd.Series(out, index=RET.index)

def sh(r):
    m = metrics(r)
    return m["ann"] / m["vol"] if m["vol"] > 1e-12 else float("nan")`;

export const quantXquantC7Exercises: Exercise[] = [
  /* ═══════════ l1：选择偏差（10 题）═══════════ */
  {
    id: 'quant-xquant-c7-l1-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c7-l1', tags: ['K', '过拟合'],
    question: '本节参数空间是 7 动量窗口 × 5 波动率窗口 × 7 再平衡频率 × 2 止损档，共多少组？',
    options: [
      { value: 'a', text: '490 组' },
      { value: 'b', text: '135 组' },
      { value: 'c', text: '21 组' },
      { value: 'd', text: '245 组' },
    ],
    answer: 'a',
    explanation: '7 × 5 × 7 × 2 = 490。注意 245 是不含止损时的组数（7×5×7），135 是 5×3×3×3 的另一种参数空间——不同参数空间不能混用数字。',
  },
  {
    id: 'quant-xquant-c7-l1-e2', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c7-l1', tags: ['K', '过拟合'],
    question: '本节实测 490 组：样本内夏普均值 ______、样本外夏普均值 ______。样本外整体比样本内高 2.33，原因是样本外那段（2024-2025）是______。',
    blanks: [['0.68'], ['3.01'], ['牛市', '上涨市', '上涨段']],
    explanation: 'IS 均值 0.68、OOS 均值 3.01。OOS 整体上移是因为 2024-2025 是牛市，所有参数都跟着变好。所以「OOS 比 IS 高」绝不能当成好消息，必须做池内比较。',
  },
  {
    id: 'quant-xquant-c7-l1-e3', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c7-l1', tags: ['U', '过拟合'],
    question: '本节 490 组的样本内 / 样本外 Spearman 相关系数是 0.909，说明样本内选参数非常有效。',
    answer: false,
    explanation: '0.909 是单次切分的假象：只有一个切分点，无法区分「策略能力」与「市场状态」。换成 9 个 6 个月滚动窗口后，秩相关均值只有 0.02，冠军的下窗百分位 46%（比随机还差）。',
  },
  {
    id: 'quant-xquant-c7-l1-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c7-l1', tags: ['U', '方法'],
    question: '为什么「单次切分的 IS/OOS 相关系数」不可信？',
    options: [
      { value: 'a', text: '只有一个切分点，无法区分「策略能力」与「市场状态」' },
      { value: 'b', text: '样本外整段处于同一种市场状态（本节是牛市），会整体抬升或压低所有参数' },
      { value: 'c', text: '换一种切法（9 个滚动窗口）后，秩相关从 0.909 掉到 0.02' },
      { value: 'd', text: '因为相关系数的计算公式在时间序列上不成立' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 是错的——相关系数公式没问题，问题是「你用它回答的问题不对」。单次切分只能回答「这一段和下一段像不像」，不能回答「样本内排名能否预测样本外排名」。',
  },
  {
    id: 'quant-xquant-c7-l1-e5', type: 'code', difficulty: 3,
    relatedLessonId: 'quant-xquant-c7-l1', tags: ['D', '过拟合'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `is_oos_scan(mom_wins, vol_wins, freqs, stops, is_end=780)`：对全部参数组合跑动量策略，返回 DataFrame（每行一个组合，列 `mom`/`vol`/`freq`/`stop`/`is_sr`/`oos_sr`）。',
    starterCode: `
def is_oos_scan(mom_wins, vol_wins, freqs, stops, is_end=780):
    pass

D = is_oos_scan([5, 20, 60], [20], [21], [None])
print(len(D), round(D.is_sr.mean(), 2), round(D.oos_sr.mean(), 2))`,
    expectedOutput: '3 行 + IS/OOS 均值',
    tests: `
D = is_oos_scan([5, 10, 15, 20, 30, 40, 60], [10, 15, 20, 30, 40],
                [5, 10, 21, 42, 63, 126, 252], [None, 0.10])
assert len(D) == 490, f"应有 490 行，实际 {len(D)}"
for c in ("mom", "vol", "freq", "stop", "is_sr", "oos_sr"):
    assert c in D.columns, f"缺少列 {c}"
assert abs(D.is_sr.mean() - 0.68) < 0.05, f"IS 均值应约 0.68，实际 {D.is_sr.mean()}"
assert abs(D.oos_sr.mean() - 3.01) < 0.08, f"OOS 均值应约 3.01，实际 {D.oos_sr.mean()}"
assert abs(D.is_sr.max() - 1.94) < 0.03, f"IS 最大值应约 1.94，实际 {D.is_sr.max()}"

# 冠军在 OOS 的排名应远不是第一
top = D.sort_values("is_sr", ascending=False).iloc[0]
rank = int((D.oos_sr > top.oos_sr).sum()) + 1
assert rank > 20, f"IS 冠军的 OOS 排名应远差于第一，实际 {rank}"`,
    answer: `
${MOM_FN}

def is_oos_scan(mom_wins, vol_wins, freqs, stops, is_end=780):
    rows = []
    for m in mom_wins:
        for v in vol_wins:
            for f in freqs:
                for st in stops:
                    r = mom_ret(m, v, f, st)
                    rows.append(dict(mom=m, vol=v, freq=f,
                                     stop=0.0 if st is None else st,
                                     is_sr=sh(r.iloc[:is_end]),
                                     oos_sr=sh(r.iloc[is_end:])))
    return pd.DataFrame(rows)`,
    explanation: '关键是「一次回测算出完整序列，再切片算 IS/OOS」，而不是跑两遍回测——后者会因预热期不同而不可比。另外注意把 stop 的 None 统一成 0.0，否则 DataFrame 列会混入 None 类型。',
  },
  {
    id: 'quant-xquant-c7-l1-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c7-l1', tags: ['U', '过拟合'],
    question: '本节「试 k 次」曲线显示：k=490 时冠军的下一窗优势保留率是 −4%。这说明？',
    options: [
      { value: 'a', text: '试 490 次选出的冠军，其样本内优势在下一窗不但不保留，还略微反向（比池均更差）' },
      { value: 'b', text: '试 490 次的冠军一定亏钱' },
      { value: 'c', text: '应该试更多次来找更好的参数' },
      { value: 'd', text: '保留率是负的说明计算有误' },
    ],
    answer: 'a',
    explanation: '保留率 = 下窗优势 / IS 优势。−4% 意味着下窗优势是负的（略差于池均）。这不等于亏钱（策略本身可能还赚），而是说「它不再是优等生，甚至比平均还略差」。b 混淆了「相对优势」与「绝对收益」。',
  },
  {
    id: 'quant-xquant-c7-l1-e7', type: 'fill', difficulty: 3,
    relatedLessonId: 'quant-xquant-c7-l1', tags: ['K', '过拟合'],
    question: '本节实测：冠军的 IS 优势（相对池均）+2.83 → 同一配置在下一窗的优势 +0.03 → 保留率 ______%。9 个滚动窗口的秩相关均值只有 ______。IS 冠军在下一窗的平均百分位是 ______%（随机期望 50%）。',
    blanks: [['1'], ['0.02'], ['46']],
    explanation: '2.83 → 0.03，保留率 1%。逐窗秩相关均值 0.02（几乎为零）。冠军下窗平均百分位 46%，比随机（50%）还略差。这三个数字合起来就是选择偏差的完整证据链。',
  },
  {
    id: 'quant-xquant-c7-l1-e8', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c7-l1', tags: ['U', '方法'],
    question: '只要最后做了样本外验证，试多少组参数都没关系。',
    answer: false,
    explanation: '样本外验证只能挡住「在样本外调参」，挡不住「在样本内试了 490 次」。试 490 次的冠军，下窗优势保留率是 −4%——样本外验证会「通过」（因为牛市抬升），但结论仍然不成立。报告必须写明试了多少组。',
  },
  {
    id: 'quant-xquant-c7-l1-e9', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c7-l1', tags: ['D', '研究设计'],
    question: '有人给你一份报告：「优化后的动量策略样本内夏普 1.94，样本外夏普 4.61，验证通过。」请回答：\n① 你会追问哪四个问题？\n② 用本节数据说明「样本外 4.61」为什么不能证明策略有效；\n③ 如果对方说「我只试了 10 组参数」，你的判断会怎么变？\n④ 写出一段你认为合格的结论表述。',
    referenceAnswer: `
① 四个追问：
1. **试了多少组参数？**（决定选择偏差的大小：试 490 次 → 保留率 −4%）；
2. **样本外是「绝对好」还是「相对好」？**（OOS 池均 3.01，冠军 4.61，只高 1.60；而池均本身被牛市抬升了 2.33）；
3. **冠军在样本外的排名是多少？**（本节第 51/490，即有 50 个参数更好）；
4. **换一种切法还成立吗？**（9 个滚动窗口的秩相关均值 0.02）。

② 为什么「样本外 4.61」不能证明有效：
- **OOS 段整段是牛市**：490 组的 OOS 池均 3.01，IS 池均只有 0.68。整池上移 2.33，所以「4.61」里有 2.33 是市场送的；
- **池内比较**：冠军只比池均高 1.60，而它的 IS 优势是 1.94 − 0.68 = 1.26。用池内 z 分数看，优势保留率约 72%（单次切分），但这个数字本身不可信（见下一条）；
- **单次切分不可信**：IS/OOS 秩相关 0.909 是假象。换成 9 个 6 个月滚动窗口后，秩相关均值 **0.02**，冠军的下窗平均百分位 46%（比随机还差）；
- **冠军的优势保留率**：+2.83 → +0.03，保留 **1%**。

③ 如果只试了 10 组：
判断会**明显改善**，但仍需验证。理由：
- 「试 k 次」曲线：k=9 时冠军的下一窗 z 优势保留率约 **25%**（远好于 k=490 的 −4%）；
- 但仍需做滚动窗口检验（因为「试 10 次」也可能是「试了 100 次后挑了 10 次报告」——这叫选择性报告）；
- 还需要确认这 10 组是**事先选定**的还是**看到结果后筛的**。

④ 合格的结论表述：
「在 2021-01-04 ~ 2025-12-26 的合成行情上，从 490 组参数中按样本内夏普选出的冠军 (mom=10, vol=15, freq=10, stop=10%) 的 IS 夏普为 1.94、OOS 夏普为 4.61。但需注意：① 样本外段为牛市，490 组的 OOS 池均为 3.01，冠军仅高出 1.60；② 冠军的 OOS 排名为第 51/490；③ 在 9 个 6 个月滚动窗口中，IS 排名对下一窗排名的秩相关均值仅 0.02，冠军的优势保留率 1%。因此**不能认为该参数优于其他参数**，该结果不足以支持上线。」
要点：含样本区间、含试了多少组、含池内比较、含滚动窗口检验、含明确的否定结论。`,
    rubric: [
      { point: '① 四个追问含「试了多少组」「池内 vs 绝对」「冠军排名」「换切法」', score: 3 },
      { point: '② 指出 OOS 段是牛市、池均 3.01 被整体抬升', score: 3 },
      { point: '② 用「秩相关 0.02」「保留率 1%」量化否定', score: 2 },
      { point: '③ 用「试 k 次曲线」说明 k=9 时保留率 25%，判断会改善', score: 2 },
      { point: '④ 结论含样本区间 + 试的次数 + 池内比较 + 明确否定', score: 3 },
    ],
    keywords: ['试了多少组', '池内比较', '牛市', '秩相关', '保留率', 'OOS 排名'],
    explanation: '评分重点在②与④。第②问考「会不会做池内比较」（这是本节最核心的方法论），第④问考「敢不敢写否定结论」。两者合起来，才是「会审报告」的能力。',
  },
  {
    id: 'quant-xquant-c7-l1-e10', type: 'single', difficulty: 4,
    relatedLessonId: 'quant-xquant-c7-l1', tags: ['U', '综合'],
    question: '本节「试 k 次」曲线里，k=1 时冠军的下窗百分位是 53%，k=490 时是 45%。这两个数字的对比说明什么？',
    options: [
      { value: 'a', text: '不选参数（k=1）时冠军就是随机一个，期望百分位约 50%；试得越多，冠军在下窗的位置反而越差' },
      { value: 'b', text: '说明 k=1 是最优策略' },
      { value: 'c', text: '说明百分位的计算有误' },
      { value: 'd', text: '说明应该只试 1 组参数' },
    ],
    answer: 'a',
    explanation: 'k=1 就是「不选」，百分位 53% ≈ 随机期望 50%（略微波动的采样误差）。k=490 时降到 45%——**试得越多，冠军在下一窗的位置越差**，因为它的样本内优势全部来自 max 运算。b/d 是过度推论：不选参数意味着放弃策略改进，正确做法是「少试 + 用样本外验证」。',
  },

  /* ═══════════ l2：Walk-forward（13 题）═══════════ */
  {
    id: 'quant-xquant-c7-l2-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c7-l2', tags: ['K', 'Walk-forward'],
    question: 'Walk-forward（前推分析）与「一次性 60/40 切分」的核心区别是？',
    options: [
      { value: 'a', text: 'Walk-forward 滚动多次，每次都「用历史选参、用未来检验」，能看出重选参数是否持续有效' },
      { value: 'b', text: 'Walk-forward 用了更多数据' },
      { value: 'c', text: 'Walk-forward 不需要样本外' },
      { value: 'd', text: '两者完全一样，只是名字不同' },
    ],
    answer: 'a',
    explanation: '一次性切分只回答「这个参数在下一段还行吗」（一次运气）；Walk-forward 回答「滚动重选参数能不能持续」。本节用 6 折（训练 504 天/测试 126 天/步长 126 天）。',
  },
  {
    id: 'quant-xquant-c7-l2-e2', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c7-l2', tags: ['K', 'Walk-forward'],
    question: '本节设定：训练窗 ______ 天（约 2 年）、测试窗 ______ 天（约 6 个月）、步长 ______ 天，可切 ______ 折。',
    blanks: [['504'], ['126'], ['126'], ['6']],
    explanation: '训练 504 / 测试 126 / 步长 126，共 6 折，测试段 2022-12-09 ~ 2025-10-31。步长 = 测试窗意味着各折测试段互不重叠，可以独立看待。',
  },
  {
    id: 'quant-xquant-c7-l2-e3', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c7-l2', tags: ['U', 'Walk-forward'],
    question: 'Rolling（定宽滑动）与 Anchored（起点固定）的区别是训练窗是否随滚动加长。',
    answer: true,
    explanation: 'Rolling 保持固定长度的窗口（本节 504 天）随之前移；Anchored 起点固定在数据开头，训练窗随折数不断加长。本节实测：Anchored 参数稳定性更好（4 种参数、众数占比 50%），Rolling 换了 6 种。',
  },
  {
    id: 'quant-xquant-c7-l2-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c7-l2', tags: ['U', 'Walk-forward'],
    question: '评价一次 Walk-forward 结果，应该看哪些指标？',
    options: [
      { value: 'a', text: 'OOS 均值与 OOS 极差（波动有多大）' },
      { value: 'b', text: '参数稳定性：选中过几种不同参数、众数占比多少' },
      { value: 'c', text: '与「死守一组参数」的对照' },
      { value: 'd', text: '只看 OOS 均值，越高越好' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 是本节要破除的误区。本节 Anchored 的 OOS 均值（3.21）低于 Rolling（3.29），但参数稳定性明显更好（众数占比 50% vs 17%）。而且死守 (20,20,21) 的 OOS 均值 3.97 高于两种重选——只看均值会得出错误结论。',
  },
  {
    id: 'quant-xquant-c7-l2-e5', type: 'code', difficulty: 3,
    relatedLessonId: 'quant-xquant-c7-l2', tags: ['D', 'Walk-forward'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `walk_forward(anchored=False, train=504, test=126, step=126)`：返回 list[dict]，每折含 `fold`、`train_start`、`train_end`、`test_start`、`test_end`、`param`、`is_sr`、`oos_sr`。参数空间用 7 动量 × 5 波动 × 7 频率（不含止损）。',
    starterCode: `
def walk_forward(anchored=False, train=504, test=126, step=126):
    pass

recs = walk_forward(anchored=False)
print(len(recs), recs[0]["param"], round(recs[0]["oos_sr"], 2))`,
    expectedOutput: '6 (10, 15, 5) 2.07',
    tests: `
recs = walk_forward(anchored=False)
assert len(recs) == 6, f"应有 6 折，实际 {len(recs)}"
for k in ("fold", "train_start", "train_end", "test_start", "test_end", "param", "is_sr", "oos_sr"):
    assert k in recs[0], f"缺少字段 {k}"
assert recs[0]["param"] == (10, 15, 5), f"第 1 折参数应为 (10,15,5)，实际 {recs[0]['param']}"
assert abs(recs[0]["oos_sr"] - 2.07) < 0.05, f"第 1 折 OOS 应约 2.07，实际 {recs[0]['oos_sr']}"
assert abs(np.mean([r["is_sr"] for r in recs]) - 3.18) < 0.08, "Rolling 的 IS 均值应约 3.18"
assert abs(np.mean([r["oos_sr"] for r in recs]) - 3.29) < 0.08, "Rolling 的 OOS 均值应约 3.29"

# Anchored：训练窗起点固定，参数稳定性更好
an = walk_forward(anchored=True)
assert all(r["train_start"] == recs[0]["train_start"] for r in an), "Anchored 的训练窗起点应全部相同"
from collections import Counter
cnt = Counter([r["param"] for r in an])
assert cnt.most_common(1)[0][1] >= 3, f"Anchored 应有参数出现 3+ 折，实际 {cnt}"`,
    answer: `
${MOM_FN}

GRID = [(m, v, f) for m in [5, 10, 15, 20, 30, 40, 60]
        for v in [10, 15, 20, 30, 40]
        for f in [5, 10, 21, 42, 63, 126, 252]]

def walk_forward(anchored=False, train=504, test=126, step=126):
    N = len(RET)
    cache = {p: mom_ret(*p) for p in GRID}
    starts = list(range(train, N - test + 1, step))
    recs = []
    for k, t0 in enumerate(starts):
        tr0 = 0 if anchored else t0 - train
        best, bv = None, -9e9
        for p in GRID:
            v = sh(cache[p].iloc[tr0:t0])
            if v > bv:
                bv, best = v, p
        recs.append(dict(fold=k + 1,
                         train_start=RET.index[tr0].date(), train_end=RET.index[t0 - 1].date(),
                         test_start=RET.index[t0].date(), test_end=RET.index[t0 + test - 1].date(),
                         param=best, is_sr=bv,
                         oos_sr=sh(cache[best].iloc[t0:t0 + test])))
    return recs`,
    explanation: '两个关键点：① 缓存全部 245 组的日收益序列（否则每折重跑 245 次回测会很慢）；② `tr0 = 0 if anchored else t0 - train` 这一行就是 Rolling 与 Anchored 的唯一区别。注意 OOS 只算一次、绝不回头改参数——这是 Walk-forward 的纪律。',
  },
  {
    id: 'quant-xquant-c7-l2-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c7-l2', tags: ['U', 'Walk-forward'],
    question: '本节 Rolling 换了 6 种参数（众数占比 17%），Anchored 只换 4 种（众数占比 50%）。这个差异说明？',
    options: [
      { value: 'a', text: 'Anchored 的参数更稳定，说明它选出的参数更像是稳定结构而非噪声' },
      { value: 'b', text: 'Rolling 更好，因为它更灵活' },
      { value: 'c', text: '两者没有实质差异' },
      { value: 'd', text: '说明 Rolling 的代码有 bug' },
    ],
    answer: 'a',
    explanation: '本节的核心判断：参数稳定性比参数最优更重要。Anchored 的 OOS 均值略低（3.21 vs 3.29），但参数稳定性明显更好（众数 50% vs 17%、频率稳定性 83% vs 50%），所以更可信。b 是本节要破除的误区。',
  },
  {
    id: 'quant-xquant-c7-l2-e7', type: 'fill', difficulty: 3,
    relatedLessonId: 'quant-xquant-c7-l2', tags: ['K', 'Walk-forward'],
    question: '本节对照实验：死守 (20,20,21) 的逐折 OOS 均值 ______、极差 ______；Rolling 重选 3.29 / 极差 6.29；Anchored 重选 3.21 / 极差 6.92。结论是定期重选参数______（填「更好」或「没有更好」）。',
    blanks: [['3.97'], ['5.44'], ['没有更好', '并不更好', '反而更差']],
    explanation: '死守 3.97 / 极差 5.44，优于两种重选。原因是重选引入了「参数选择运气」这个新不确定性：死守的逐折波动全部来自市场，重选的波动 = 市场 + 参数选择。',
  },
  {
    id: 'quant-xquant-c7-l2-e8', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c7-l2', tags: ['U', '方法'],
    question: 'Walk-forward 的窗口参数（训练窗/测试窗/步长）应该多试几组，挑 OOS 均值最高的那组。',
    answer: false,
    explanation: '这是元层面过拟合（meta-overfitting）。窗口参数本身也是可以调的选择，试多组挑「最好看的」等于把过拟合搬到了第二层。窗口参数必须事先定好并写进 spec。',
  },
  {
    id: 'quant-xquant-c7-l2-e9', type: 'code', difficulty: 4,
    relatedLessonId: 'quant-xquant-c7-l2', tags: ['D', 'Walk-forward'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `param_stability(recs)`：输入 walk_forward 的返回值，返回 dict，含 `n_distinct`（不同参数个数）、`mode`（众数参数）、`mode_ratio`（众数占比）、`freq_mode_ratio`（频率维度的众数占比）、`oos_mean`、`oos_range`。',
    starterCode: `
def param_stability(recs):
    pass

recs = walk_forward(anchored=True)
d = param_stability(recs)
print(d["n_distinct"], d["mode"], round(d["mode_ratio"], 2), round(d["freq_mode_ratio"], 2))`,
    expectedOutput: '4 (40, 10, 5) 0.5 0.83',
    tests: `
roll = walk_forward(anchored=False)
anch = walk_forward(anchored=True)
dr = param_stability(roll)
da = param_stability(anch)

assert dr["n_distinct"] == 6, f"Rolling 应有 6 种参数，实际 {dr['n_distinct']}"
assert da["n_distinct"] == 4, f"Anchored 应有 4 种参数，实际 {da['n_distinct']}"
assert da["mode"] == (40, 10, 5), f"Anchored 众数应为 (40,10,5)，实际 {da['mode']}"
assert abs(da["mode_ratio"] - 0.5) < 0.01, f"Anchored 众数占比应 0.5，实际 {da['mode_ratio']}"
assert abs(da["freq_mode_ratio"] - 0.833) < 0.02, f"Anchored 频率众数占比应约 0.83，实际 {da['freq_mode_ratio']}"
assert abs(dr["mode_ratio"] - 0.167) < 0.02, f"Rolling 众数占比应约 0.17，实际 {dr['mode_ratio']}"
assert da["mode_ratio"] > dr["mode_ratio"], "Anchored 的参数稳定性应优于 Rolling"
assert abs(da["oos_mean"] - 3.21) < 0.08, f"Anchored OOS 均值应约 3.21，实际 {da['oos_mean']}"`,
    answer: `
${MOM_FN}

GRID = [(m, v, f) for m in [5, 10, 15, 20, 30, 40, 60]
        for v in [10, 15, 20, 30, 40]
        for f in [5, 10, 21, 42, 63, 126, 252]]

def walk_forward(anchored=False, train=504, test=126, step=126):
    N = len(RET)
    cache = {p: mom_ret(*p) for p in GRID}
    starts = list(range(train, N - test + 1, step))
    recs = []
    for k, t0 in enumerate(starts):
        tr0 = 0 if anchored else t0 - train
        best, bv = None, -9e9
        for p in GRID:
            v = sh(cache[p].iloc[tr0:t0])
            if v > bv:
                bv, best = v, p
        recs.append(dict(fold=k + 1, param=best, is_sr=bv,
                         oos_sr=sh(cache[best].iloc[t0:t0 + test])))
    return recs

from collections import Counter

def param_stability(recs):
    params = [tuple(r["param"]) for r in recs]
    cnt = Counter(params)
    mode, mode_n = cnt.most_common(1)[0]
    freq_cnt = Counter([p[2] for p in params])
    oos = np.array([r["oos_sr"] for r in recs])
    return {"n_distinct": len(cnt), "mode": mode,
            "mode_ratio": mode_n / len(recs),
            "freq_mode_ratio": freq_cnt.most_common(1)[0][1] / len(recs),
            "oos_mean": float(oos.mean()), "oos_range": float(oos.max() - oos.min())}`,
    explanation: '`freq_mode_ratio` 单独统计频率维度，是因为「再平衡频率」在本节是最稳定的维度（Anchored 6 折里 5 折都选 5 天）。把「整体参数一致」与「某一维度一致」分开报，才能看出稳定性的来源。',
  },
  {
    id: 'quant-xquant-c7-l2-e10', type: 'single', difficulty: 4,
    relatedLessonId: 'quant-xquant-c7-l2', tags: ['U', '综合'],
    question: '为什么「定期重选参数」反而可能不如「死守一组」？',
    options: [
      { value: 'a', text: '重选引入了「参数选择的运气」这个新不确定性；而死守的波动只来自市场本身' },
      { value: 'b', text: '因为重选需要更多计算时间' },
      { value: 'c', text: '因为死守一定能赚钱' },
      { value: 'd', text: '因为市场从来不变' },
    ],
    answer: 'a',
    explanation: '本节实测：死守极差 5.44，Rolling 极差 6.29，Anchored 6.92。多出来的波动来自「这次选的参数运气如何」。而上一节已证明「IS 排名对下窗排名秩相关仅 0.02」——既然选参本身没有预测力，重选自然没有价值。',
  },
  {
    id: 'quant-xquant-c7-l2-e11', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c7-l2', tags: ['D', '研究设计'],
    question: '你要为一个策略做 Walk-forward 验证。请回答：\n① 训练窗、测试窗、步长分别怎么定？给出你的取值与理由；\n② 结果出来后，除了 OOS 均值，你还会报哪三个数字？为什么？\n③ 如果 Rolling 与 Anchored 的结论相反（一个 OOS 高、一个稳定性好），你怎么选？\n④ 这个实验有什么无法解决的根本局限？',
    referenceAnswer: `
① 三个窗口的定法与理由：
- **训练窗 504 天（2 年）**：太短（如 126 天）则参数估计噪声太大、选出的参数不可靠；太长（如 756 天）则无法适应市场变化。2 年是「够估计 + 够灵活」的常见折中；
- **测试窗 126 天（6 个月）**：太短则单折结果噪声大（本节第 2 折 OOS 就是 −0.66，很可能有运气成分）；太长则折数太少（1300 天数据下 126 天正好切 6 折）；
- **步长 = 测试窗（126 天）**：各折测试段互不重叠，结果可独立看待。若步长 < 测试窗，各折重叠，样本量看起来变多但独立信息没变（「假性提高样本量」陷阱）。
- **纪律**：这三个数必须**事先定好并写进 spec**，不能试多组挑最好看的（那是元层面过拟合）。

② 除 OOS 均值外还要报的三个数字：
1. **OOS 极差（或标准差）**：本节 Rolling 极差 6.29（最好 5.63、最差 −0.66）。均值 3.29 掩盖了「有一折是负的」这个关键事实；
2. **参数稳定性**：选中过几种不同参数 + 众数占比。本节 Rolling 6 种/17%，Anchored 4 种/50%。稳定性比最优更重要；
3. **与「死守一组」的对照**：本节死守 (20,20,21) 的 OOS 均值 3.97 > Rolling 3.29 > Anchored 3.21。没有这个对照，你无法知道「重选」到底有没有价值。
（可选第四个：衰减 = IS 均值 − OOS 均值，本节 Rolling +0.11 / Anchored +0.61。）

③ Rolling 与 Anchored 冲突时怎么选：
**优先选稳定性好的（本节是 Anchored）**。理由：
- OOS 均值的差异（3.29 vs 3.21，差 0.08）在 6 折样本量下完全在噪声范围内，不能作为判断依据；
- 参数稳定性（众数占比 50% vs 17%、频率稳定性 83% vs 50%）反映的是「选参过程是否指向一个稳定结构」，这个信号的样本量是 6 折 × 245 组，比单看 6 个 OOS 均值更可靠；
- 更重要的是：**两个都输给了死守（3.97）**。所以正确的结论是「本节样本上重选参数没有加分，若必须重选则选 Anchored」，而不是「选 Anchored 更好」。

④ 根本局限：
- **只有一段历史**：所有折都在同一段 1300 天里，无法排除「这五年恰好适合这个策略」；
- **无法覆盖未发生的情形**：比如从没出现过的流动性危机、政策突变；
- **参数空间的边界是人为的**：本节只扫了 245 组，真正的「最优」可能在扫描范围之外；
- **无法回答「未来是否可行」**：Walk-forward 只证明「历史上前推可行」；
- **窗口参数本身是选择**：换一组窗口可能得到不同结论（这就是元层面过拟合的风险）；
- **不含成本与执行**：本节全部不含成本，实盘的滑点/容量问题未覆盖。`,
    rubric: [
      { point: '① 三个窗口都有取值 + 理由，且提到「事先定好、不能试多组」', score: 4 },
      { point: '② 三个数字含「OOS 极差」「参数稳定性」「与死守对照」', score: 3 },
      { point: '③ 明确优先稳定性，并指出「两者都输给死守」这个更重要的事实', score: 3 },
      { point: '④ 至少 3 项根本局限，含「只有一段历史」与「窗口参数本身是选择」', score: 3 },
    ],
    keywords: ['训练窗', '测试窗', '步长', 'OOS 极差', '参数稳定性', '死守对照', '元层面过拟合'],
    explanation: '评分重点在②与③。第②问考「知不知道均值会掩盖极差」，第③问考「会不会在冲突时按证据强度而不是数值大小做判断」。后者是本节最高阶的能力。',
  },
  {
    id: 'quant-xquant-c7-l2-e12', type: 'judge', difficulty: 4,
    relatedLessonId: 'quant-xquant-c7-l2', tags: ['U', '方法'],
    question: '步长小于测试窗（重叠滚动）会让 Walk-forward 的样本量真实增加，结论更可靠。',
    answer: false,
    explanation: '重叠滚动的各折测试段互相重叠，样本量看起来变多，但独立信息并没有增加。这是「假性提高样本量」。本节用步长 = 测试窗（不重叠），保证各折可独立看待。',
  },
  {
    id: 'quant-xquant-c7-l2-e13', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c7-l2', tags: ['U', 'Walk-forward'],
    question: '本节为什么在 Walk-forward 的参数空间里去掉止损维度（245 组而非 490 组）？',
    options: [
      { value: 'a', text: '因为第 6 章已测出止损维度几乎不影响结果（IS 均值 0.72 vs 0.64），去掉它能减少搜索空间、让结论更干净' },
      { value: 'b', text: '因为止损在代码里实现不了' },
      { value: 'c', text: '因为止损会让策略亏钱' },
      { value: 'd', text: '因为 245 是偶数' },
    ],
    answer: 'a',
    explanation: '这是「规则负担」思想在实验设计上的应用：一个几乎不影响结果的旋钮，只会放大搜索空间、增加过拟合风险。去掉它不损失信息，但让实验更干净、更快。',
  },

  /* ═══════════ l3：时序交叉验证（13 题）═══════════ */
  {
    id: 'quant-xquant-c7-l3-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c7-l3', tags: ['K', '交叉验证'],
    question: '为什么随机 K 折在时间序列上会失效？',
    options: [
      { value: 'a', text: '因为相邻交易日的标签高度相关（lag-1 自相关 0.830），随机切分让「答案的邻居」进入训练集' },
      { value: 'b', text: '因为随机 K 折的计算量太大' },
      { value: 'c', text: '因为 pandas 不支持随机切分' },
      { value: 'd', text: '因为随机 K 折需要更多折数' },
    ],
    answer: 'a',
    explanation: '本节实测标签 lag-1 自相关 0.830（相邻两天共享 4/5 的「未来 5 日」区间）。随机切分让验证日的「昨天」几乎必然在训练集里，模型抄昨天就能得高分——这是数据泄漏，不是预测能力。',
  },
  {
    id: 'quant-xquant-c7-l3-e2', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c7-l3', tags: ['K', '交叉验证'],
    question: '本节时序 5 折的逐折夏普：______ / ______ / ______ / 5.29 / 4.04，均值 2.95、标准差 1.48。随机 5 折的折间标准差只有 ______（看起来更稳定）。',
    blanks: [['1.53'], ['2.37'], ['1.55'], ['0.93']],
    explanation: '时序折 1.53 / 2.37 / 1.55 / 5.29 / 4.04。随机折间标准差 0.93 < 时序 1.48，但这个「稳定」来自「每折混合各年行情」，是信息损失而非质量提升。',
  },
  {
    id: 'quant-xquant-c7-l3-e3', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c7-l3', tags: ['U', '交叉验证'],
    question: '随机 K 折的折间标准差更小，所以它比时序 K 折更可靠。',
    answer: false,
    explanation: '随机 5 折折间标准差 0.93 小于时序 1.48，但这个「稳定」是把不同年份的行情混在一起造成的——它抹掉了「策略在横盘年表现差」这个重要事实。稳定性必须建立在「问对问题」的前提上。',
  },
  {
    id: 'quant-xquant-c7-l3-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c7-l3', tags: ['U', '交叉验证'],
    question: '关于时序交叉验证，下列说法正确的有？',
    options: [
      { value: 'a', text: '训练集必须永远早于验证集' },
      { value: 'b', text: '普通时序 K 折仍有边界泄漏，需要 Purged + Embargo 才彻底' },
      { value: 'c', text: '它回答的是「这个结论有多稳」，不是「最优参数是什么」' },
      { value: 'd', text: '它可以直接替代参数扫描，用来挑最优参数' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 是错的——用 CV 挑参数等于把它当成参数扫描，会重新引入选择偏差。CV 给的是「把握有多大」（本节：2.95 ± 1.48），不是「哪个参数最好」。',
  },
  {
    id: 'quant-xquant-c7-l3-e5', type: 'code', difficulty: 3,
    relatedLessonId: 'quant-xquant-c7-l3', tags: ['D', '交叉验证'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `ts_cv(r, k=5)`：把日收益序列 `r` 按时间切成 k 段（不重叠），返回每段的 `(起, 止, 天数, 夏普, 累计%)` 列表；再实现 `random_cv(r, k=5, seed=2024)`，把日期随机打乱后切 k 段，返回每段夏普的列表。',
    starterCode: `
def ts_cv(r, k=5):
    pass

def random_cv(r, k=5, seed=2024):
    pass

s = mom_ret(20, 20, 21)
for row in ts_cv(s):
    print(row[2], round(row[3], 2))
print(round(np.mean(random_cv(s)), 2))`,
    expectedOutput: '5 折（1.53 / 2.37 / 1.55 / 5.29 / 4.04）+ 随机均值',
    tests: `
s = mom_ret(20, 20, 21)
folds = ts_cv(s, 5)
assert len(folds) == 5, f"应有 5 折，实际 {len(folds)}"
assert [f[2] for f in folds] == [260] * 5, f"每折应 260 天，实际 {[f[2] for f in folds]}"
assert abs(folds[0][3] - 1.53) < 0.05, f"折 1 夏普应约 1.53，实际 {folds[0][3]}"
assert abs(folds[3][3] - 5.29) < 0.08, f"折 4 夏普应约 5.29，实际 {folds[3][3]}"
assert abs(folds[4][3] - 4.04) < 0.08, f"折 5 夏普应约 4.04，实际 {folds[4][3]}"
assert abs(np.mean([f[3] for f in folds]) - 2.95) < 0.06, "时序均值应约 2.95"

rv = random_cv(s, 5, 2024)
assert len(rv) == 5, f"随机折应 5 个，实际 {len(rv)}"
assert abs(np.mean(rv) - 2.88) < 0.25, f"随机均值应约 2.86~2.88，实际 {np.mean(rv)}"
# 随机折的折间标准差应小于时序折
assert np.std(rv) < np.std([f[3] for f in folds]), "随机折的折间标准差应更小（被压平）"`,
    answer: `
${MOM_FN}

def ts_cv(r, k=5):
    n = len(r)
    out = []
    for i in range(k):
        a = int(n * i / k)
        b = int(n * (i + 1) / k)
        seg = r.iloc[a:b]
        out.append((seg.index[0].date(), seg.index[-1].date(), b - a,
                    sh(seg), metrics(seg)["tot"]))
    return out

def random_cv(r, k=5, seed=2024):
    rng = np.random.default_rng(seed)
    n = len(r)
    perm = rng.permutation(n)
    out = []
    for i in range(k):
        idx = np.sort(perm[int(n * i / k):int(n * (i + 1) / k)])
        out.append(sh(r.iloc[idx]))
    return out`,
    explanation: '时序切分用「连续区间」（`iloc[a:b]`），随机切分用「打乱的索引」（`perm` 后排序再取）。注意随机切分必须先 `np.sort` 索引——虽然顺序对夏普没影响，但排序后更接近「一折样本」的语义，也方便调试。',
  },
  {
    id: 'quant-xquant-c7-l3-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c7-l3', tags: ['U', '交叉验证'],
    question: '本节「抄昨天」的笨模型在随机 80/20 切分下相关系数达到 +0.824，误差比猜均值低 40%。这个实验的目的是？',
    options: [
      { value: 'a', text: '证明随机切分给模型的是「答案的邻居」而不是预测能力——一个零预测力的模型也能得高分' },
      { value: 'b', text: '证明「抄昨天」是一个好策略' },
      { value: 'c', text: '证明相关系数这个指标不可用' },
      { value: 'd', text: '证明随机切分比时序切分更好' },
    ],
    answer: 'a',
    explanation: '这是最小可复现的泄漏实验：模型只看日期最近的训练样本，没有任何特征。随机切分下最近训练日间隔中位数 1 天（标签相关 0.83），所以它能「预测」；时序切分下间隔 130 天，预测退化成常数。',
  },
  {
    id: 'quant-xquant-c7-l3-e7', type: 'fill', difficulty: 3,
    relatedLessonId: 'quant-xquant-c7-l3', tags: ['K', '交叉验证'],
    question: '本节标签（沪深300 未来 5 日累计收益）的自相关：lag-1 = ______、lag-2 = 0.659、lag-3 = 0.500。笨模型实验：时序切分下最近训练日间隔中位数 ______ 天，随机切分下 ______ 天。',
    blanks: [['0.830', '0.83'], ['130'], ['1']],
    explanation: 'lag-1 自相关 0.830（相邻两天共享 4/5 区间）。时序切分最近训练日 130 天外 → 预测退化成常数；随机切分最近 1 天 → 抄到的标签与真值相关 0.83。',
  },
  {
    id: 'quant-xquant-c7-l3-e8', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c7-l3', tags: ['U', '交叉验证'],
    question: '时序 K 折因为训练集永远早于验证集，所以完全没有数据泄漏。',
    answer: false,
    explanation: '普通时序 K 折仍有边界泄漏：若标签是「未来 5 日收益」，验证集第一天前 4 天的训练样本其标签区间与验证集重叠。彻底方案是 Purged + Embargo K-Fold（剔除标签重叠样本 + 紧邻样本）。',
  },
  {
    id: 'quant-xquant-c7-l3-e9', type: 'code', difficulty: 4,
    relatedLessonId: 'quant-xquant-c7-l3', tags: ['D', '交叉验证'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `leak_experiment(h=5, k=5)`：用「抄最近一天标签」的笨模型，对比时序切分与随机切分的表现。返回 dict，含 `lag1`（标签 lag-1 自相关）、`ts_gap`（时序切分下最近训练日间隔中位数）、`rd_gap`（随机切分下的中位数）、`rd_corr`（随机切分下预测与真值的相关，重复 20 次取均值）。',
    starterCode: `
def leak_experiment(h=5, k=5):
    pass

d = leak_experiment()
print(round(d["lag1"], 3), round(d["ts_gap"]), round(d["rd_gap"]), round(d["rd_corr"], 3))`,
    expectedOutput: '0.83 130 1 0.824',
    tests: `
d = leak_experiment(5, 5)
assert abs(d["lag1"] - 0.830) < 0.01, f"lag-1 自相关应约 0.830，实际 {d['lag1']}"
assert d["ts_gap"] >= 100, f"时序切分最近训练日间隔应 >100 天，实际 {d['ts_gap']}"
assert d["rd_gap"] <= 3, f"随机切分最近训练日间隔应 ≤3 天，实际 {d['rd_gap']}"
assert d["rd_corr"] > 0.7, f"随机切分下笨模型相关应 >0.7（泄漏证据），实际 {d['rd_corr']}"
assert d["rd_corr"] > d["lag1"] * 0.9, "随机切分的相关应接近标签自相关（说明是抄邻居）"`,
    answer: `
def leak_experiment(h=5, k=5):
    r = RET.A.values
    n = len(r)
    lab = np.array([np.prod(1 + r[i + 1:i + 1 + h]) - 1 if i + h < n else np.nan
                    for i in range(n)])
    valid = np.where(~np.isnan(lab))[0]
    L = lab[valid]
    lag1 = float(np.corrcoef(L[:-1], L[1:])[0, 1])
    m = len(valid)
    cut = int(m * 0.8)
    # 时序切分
    tr_t, te_t = valid[:cut], valid[cut:]
    gap_t = np.median([np.abs(tr_t - i).min() for i in te_t])
    # 随机切分（重复 20 次）
    rng = np.random.default_rng(11)
    gaps, corrs = [], []
    for _ in range(20):
        perm = rng.permutation(m)
        tr = np.sort(valid[perm[:cut]])
        te = np.sort(valid[perm[cut:]])
        nn = np.array([tr[np.argmin(np.abs(tr - i))] for i in te])
        gaps.append(np.median(np.abs(nn - te)))
        p, y = lab[nn], lab[te]
        if p.std() > 1e-12:
            corrs.append(float(np.corrcoef(p, y)[0, 1]))
    return {"lag1": lag1, "ts_gap": float(gap_t),
            "rd_gap": float(np.mean(gaps)), "rd_corr": float(np.mean(corrs))}`,
    explanation: '这道题把「泄漏」变成可测的数字。三个要点：① 标签要按「未来 h 日累计」构造，索引对齐别错位；② 时序切分的最近邻间隔会很大（130 天），因为训练集全在切点之前；③ 随机切分下必须重复多次取均值，否则单次结果波动大。',
  },
  {
    id: 'quant-xquant-c7-l3-e10', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c7-l3', tags: ['D', '研究设计'],
    question: '有人用随机 5 折交叉验证评估一个时序策略，得到「验证集夏普 2.86 ± 0.93」。请回答：\n① 这个结果有什么问题？用本节的具体数字说明；\n② 如果改用时序 5 折，结果会变成什么？为什么标准差变大反而是好事？\n③ 写出「Purged + Embargo K-Fold」的做法与它解决的问题；\n④ 一句话总结「交叉验证在时序数据上的正确用法」。',
    referenceAnswer: `
① 问题：
- **随机 K 折在时序上会泄漏**：标签（未来 5 日收益）的 lag-1 自相关是 **0.830**，相邻两天的标签共享 4/5 区间；
- **最小可复现证据**：一个「抄最近一天标签」的零预测力模型，在随机 80/20 切分下相关系数 **+0.824**、误差比猜均值低 **40%**；而在时序切分下预测直接退化成常数（最近训练日在 130 天外）；
- **折间标准差 0.93 是假象**：它比时序切分的 1.48 小，但这个「稳定」来自「每折混合了各年行情」，把「策略在横盘年表现差」这个事实抹掉了；
- 所以「2.86 ± 0.93」这个结果**既不可信（有泄漏），也没有信息量（掩盖了行情差异）**。

② 改用时序 5 折的结果：
- 逐折夏普 **1.53 / 2.37 / 1.55 / 5.29 / 4.04**，均值 **2.95**、标准差 **1.48**、极差 3.76；
- 均值从 2.86 变到 2.95（差不多），但**标准差从 0.93 涨到 1.48**；
- **标准差变大是好事**，因为它真实反映了「这个策略在不同年份的表现差异巨大」：2021 和 2023 是横盘年（夏普 1.53 / 1.55），2024 是上涨年（5.29）。这个信息对决策至关重要——如果你不能接受横盘年，就不该用这个策略；
- 随机 K 折的「小标准差」是**用信息损失换来的**，它让你误以为策略很稳。

③ Purged + Embargo K-Fold：
- **Purge（剔除）**：把训练集中「标签区间与验证集重叠」的样本删掉。例如标签是「未来 5 日」，那么验证集第一天前 4 天的训练样本，其标签区间与验证集重叠，必须剔除；
- **Embargo（禁运）**：再剔除验证集之后一小段（例如 5 天）的样本。目的是防止「验证集的信息通过特征窗口漏回训练集」（如果特征用了过去 20 日收益，验证集之后的样本会包含验证集期间的信息）；
- **解决什么问题**：普通时序 K 折只保证「训练在前、验证在后」，但不保证「标签不重叠」，仍有残余泄漏。Purge + Embargo 把残余泄漏也切掉；
- **代价**：可用样本变少（本节实验里 purge 后训练样本可能减少 10-30%），折数可能需要调整。

④ 一句话总结：
「**时序数据必须用时序切分（训练永远早于验证），并且要 purge 掉标签重叠的样本；交叉验证回答的是「结论有多稳」（2.95 ± 1.48），不是「最优参数是什么」。**」`,
    rubric: [
      { point: '① 用 lag-1 自相关 0.830 与笨模型相关 0.824 说明泄漏', score: 3 },
      { point: '① 指出「随机折标准差更小」是信息损失而非质量提升', score: 2 },
      { point: '② 报出时序 5 折的逐折数字（1.53/2.37/1.55/5.29/4.04）', score: 2 },
      { point: '② 解释「标准差变大是好事」——它反映了行情差异', score: 3 },
      { point: '③ 说清 purge 与 embargo 各自的定义与目的', score: 3 },
      { point: '④ 总结含「时序切分 + purge」与「CV 回答把握不是最优」', score: 2 },
    ],
    keywords: ['随机 K 折', '自相关', '泄漏', '时序切分', 'purge', 'embargo', '标准差'],
    explanation: '评分重点在②与③。第②问的「标准差变大是好事」是本节最反直觉也最重要的判断；第③问考「知不知道普通时序 K 折还不够」。',
  },
  {
    id: 'quant-xquant-c7-l3-e11', type: 'single', difficulty: 4,
    relatedLessonId: 'quant-xquant-c7-l3', tags: ['U', '综合'],
    question: '本节时序 5 折的逐折夏普是 1.53 / 2.37 / 1.55 / 5.29 / 4.04。变异系数（标准差/均值）约 0.50。这个数最恰当的解读是？',
    options: [
      { value: 'a', text: '策略在不同年份的表现有明显差异，但方向一致（全为正）；0.50 属于中等波动，需要结合「最差年份 1.53」一起看' },
      { value: 'b', text: '变异系数 0.50 < 1，所以策略非常稳定' },
      { value: 'c', text: '变异系数 > 0.3 说明策略无效' },
      { value: 'd', text: '变异系数应该等于 0 才算好' },
    ],
    answer: 'a',
    explanation: '变异系数 0.50 说明「标准差是均值的一半」。它是中性描述，不是好坏判据。关键要看：① 所有折是否同号（本节全为正，好）；② 最差折是多少（1.53，仍可接受）。b/c/d 都把一个描述性指标当成了绝对判据。',
  },
  {
    id: 'quant-xquant-c7-l3-e12', type: 'judge', difficulty: 4,
    relatedLessonId: 'quant-xquant-c7-l3', tags: ['U', '方法'],
    question: '交叉验证的折数越多，结论越可靠，所以应该用 10 折甚至 20 折。',
    answer: false,
    explanation: '折数受限于数据长度与「每折要足够长」。本节 1300 天切 5 折每折 260 天（约 1 年），已经接近下限；切 20 折每折只有 65 天（3 个月），单折夏普的噪声会非常大。折数不是越多越好，要看「每折能否支撑一个可信的估计」。',
  },
  {
    id: 'quant-xquant-c7-l3-e13', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c7-l3', tags: ['U', '交叉验证'],
    question: '为什么本节用 expanding（扩张）而不是 sliding（滑动）的时序 K 折？',
    options: [
      { value: 'a', text: '因为实盘的做法就是「用所有可得历史」，expanding 更接近真实处境' },
      { value: 'b', text: '因为 expanding 的计算更快' },
      { value: 'c', text: '因为 sliding 在 pandas 里实现不了' },
      { value: 'd', text: '因为 expanding 的标准差更小' },
    ],
    answer: 'a',
    explanation: 'sliding 相当于假设「N 年前的数据没有价值」，这个假设需要单独论证。expanding 对应「你总是用所有历史」，更接近实盘。两者的选择应该由「旧数据是否有用」这个业务判断决定，不是由结果好不好看决定。',
  },

  /* ═══════════ l4：规则负担（13 题）═══════════ */
  {
    id: 'quant-xquant-c7-l4-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c7-l4', tags: ['K', '规则负担'],
    question: '「自由度」在本节指的是？',
    options: [
      { value: 'a', text: '可调参数的个数（旋钮数），每加一个就把搜索空间乘上它的档数' },
      { value: 'b', text: '策略的持仓自由度（能不能做空）' },
      { value: 'c', text: '交易频率' },
      { value: 'd', text: '资金规模' },
    ],
    answer: 'a',
    explanation: '本节四层：12 → 36 → 108 → 216 组，每加一个旋钮搜索空间乘 2-3 倍。自由度是**指数级**成本，不是线性成本。',
  },
  {
    id: 'quant-xquant-c7-l4-e2', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c7-l4', tags: ['K', '规则负担'],
    question: '本节四层的组合数：L1 ______ 组、L2 36 组、L3 ______ 组、L4 ______ 组。IS 冠军从 1.81 涨到 ______，IS 池均从 1.26 掉到 1.06。',
    blanks: [['12'], ['108'], ['216'], ['2.34']],
    explanation: '12 / 36 / 108 / 216（扩大 18 倍）。IS 冠军 1.81 → 2.34（+0.52），但 IS 池均 1.26 → 1.06（−0.20）、OOS 冠军 4.60 → 4.39（−0.21）。三条判据同时出现 = 规则负担。',
  },
  {
    id: 'quant-xquant-c7-l4-e3', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c7-l4', tags: ['U', '规则负担'],
    question: '每加一条规则，样本内表现都会变好，所以规则越多越好。',
    answer: false,
    explanation: '本节实测：加旋钮让 IS 冠军从 1.81 涨到 2.34（+0.52），但 IS 池均从 1.26 掉到 1.06（−0.20）、OOS 冠军从 4.60 掉到 4.39（−0.21）。样本内变好是因为「最大值更容易被凑出来」，不是能力提升。',
  },
  {
    id: 'quant-xquant-c7-l4-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c7-l4', tags: ['U', '规则负担'],
    question: '识别「规则负担」的三条判据是？',
    options: [
      { value: 'a', text: '样本内冠军随旋钮数单调上升' },
      { value: 'b', text: '样本内全体均值不升反降' },
      { value: 'c', text: '样本外冠军没有跟着涨' },
      { value: 'd', text: '样本内冠军的绝对值超过 2.0' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: 'd 与规则负担无关（不同数据、不同指标的绝对值不可比）。三条必须**同时**出现才算规则负担：只有 a 可能是真的更好的规则；只有 b 可能是某个旋钮取值区间不好；只有 c 可能是市场状态变化。',
  },
  {
    id: 'quant-xquant-c7-l4-e5', type: 'code', difficulty: 3,
    relatedLessonId: 'quant-xquant-c7-l4', tags: ['D', '规则负担'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `layer_scan(layers, is_end=780)`：`layers` 是 `[(名字, [参数tuple...]), ...]`。对每层跑全部组合（参数 tuple 长度 1-4，缺的用默认 vol=20/freq=21/stop=None），返回 DataFrame（索引为层名，列含 `n_combo`、`is_champ`、`oos_champ`、`is_mean`、`oos_mean`）。',
    starterCode: `
def layer_scan(layers, is_end=780):
    pass

L = [("L1", [(m,) for m in range(5, 65, 5)])]
print(layer_scan(L))`,
    expectedOutput: 'L1 一行：12 组、IS 冠军 1.81、OOS 4.60',
    tests: `
MOMS = list(range(5, 65, 5))
layers = [
    ("L1", [(m,) for m in MOMS]),
    ("L2", [(m, v) for m in MOMS for v in (10, 20, 40)]),
    ("L3", [(m, v, f) for m in MOMS for v in (10, 20, 40) for f in (5, 21, 63)]),
    ("L4", [(m, v, f, s) for m in MOMS for v in (10, 20, 40) for f in (5, 21, 63) for s in (None, 0.10)]),
]
df = layer_scan(layers)
assert len(df) == 4, f"应有 4 行，实际 {len(df)}"
for c in ("n_combo", "is_champ", "oos_champ", "is_mean", "oos_mean"):
    assert c in df.columns, f"缺少列 {c}"
assert list(df.n_combo) == [12, 36, 108, 216], f"组合数不对: {list(df.n_combo)}"
assert abs(df.loc["L1", "is_champ"] - 1.81) < 0.03, f"L1 IS 冠军应约 1.81，实际 {df.loc['L1','is_champ']}"
assert abs(df.loc["L1", "oos_champ"] - 4.60) < 0.05, f"L1 OOS 冠军应约 4.60"
assert abs(df.loc["L3", "is_champ"] - 2.34) < 0.05, f"L3 IS 冠军应约 2.34"
assert df.loc["L4", "is_champ"] > df.loc["L1", "is_champ"], "IS 冠军应随层数上升"
assert df.loc["L4", "is_mean"] < df.loc["L1", "is_mean"], "IS 池均应随层数下降"
assert df.loc["L4", "oos_champ"] < df.loc["L1", "oos_champ"], "OOS 冠军不应上升"`,
    answer: `
${MOM_FN}

def layer_scan(layers, is_end=780):
    rows = {}
    for label, pool in layers:
        iss, oos = [], []
        for p in pool:
            q = list(p) + [None] * (4 - len(p))
            m, v, f, st = q[0], q[1] if q[1] is not None else 20, q[2] if q[2] is not None else 21, q[3]
            r = mom_ret(m, v, f, st)
            iss.append(sh(r.iloc[:is_end]))
            oos.append(sh(r.iloc[is_end:]))
        iss = np.array(iss); oos = np.array(oos)
        j = int(np.argmax(iss))
        rows[label] = {"n_combo": len(pool), "is_champ": iss[j], "oos_champ": oos[j],
                       "is_mean": float(iss.mean()), "oos_mean": float(oos.mean())}
    return pd.DataFrame(rows).T`,
    explanation: '关键是「缺省参数补齐」：L1 只有 1 个参数，要用默认 vol=20/freq=21/stop=None 补齐，否则无法调用统一的 mom_ret。注意 `q[1] if q[1] is not None else 20` 不能写成 `q[1] or 20`——freq=0 会被误判（虽然本节不会出现，但这是通用陷阱）。',
  },
  {
    id: 'quant-xquant-c7-l4-e6', type: 'single', difficulty: 3,
    relatedLessonId: 'quant-xquant-c7-l4', tags: ['U', '规则负担'],
    question: '本节 L3（108 组）与 L4（216 组）的所有指标完全相同。原因是什么？',
    options: [
      { value: 'a', text: 'L3 的冠军是「不止损」，加了止损旋钮后冠军仍是「不止损」那一支——止损维度没有提供任何额外信息' },
      { value: 'b', text: '因为代码里止损没生效' },
      { value: 'c', text: '因为 108 × 2 = 216 时数据被截断了' },
      { value: 'd', text: '因为止损一定会降低收益' },
    ],
    answer: 'a',
    explanation: '这是「无用旋钮」的最纯粹形态：它不会让策略变好，只把搜索空间从 108 扩到 216（翻倍）。第 6 章也已测出止损维度的边际影响极小（IS 均值 0.72 vs 0.64）。',
  },
  {
    id: 'quant-xquant-c7-l4-e7', type: 'fill', difficulty: 3,
    relatedLessonId: 'quant-xquant-c7-l4', tags: ['K', '规则负担'],
    question: '固定 12 次试验预算下：冠军的「IS − 池均」差值从 1 旋钮时的 ______ 涨到 4 旋钮时的 ______。这个差值就是「虚高」的直接度量。',
    blanks: [['0.55'], ['0.88']],
    explanation: '0.55 → 0.88。同样的 12 次试验，旋钮越多，冠军越容易撞到极端值。冠军比池均高出的那部分，就是 max 运算造出来的——它不代表能力。',
  },
  {
    id: 'quant-xquant-c7-l4-e8', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c7-l4', tags: ['U', '方法'],
    question: '穷举 216 组找到的冠军，比随机试 12 组找到的冠军更可信。',
    answer: false,
    explanation: '恰恰相反。穷举 216 组意味着有 216 次撞运气的机会，冠军更可能是噪声。本节两种设计（穷举与固定 12 次预算）都做了，结论一致：旋钮越多，样本内冠军越高但样本外不涨。',
  },
  {
    id: 'quant-xquant-c7-l4-e9', type: 'code', difficulty: 4,
    relatedLessonId: 'quant-xquant-c7-l4', tags: ['D', '规则负担'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `budget_sim(layers, budget=12, trials=200, seed=42, is_end=780)`：对每层，随机抽 `budget` 个组合、取 IS 最高者，重复 `trials` 次，返回 DataFrame（索引为层名，列含 `champ_is`、`champ_oos`、`is_mean`、`inflation`= champ_is − is_mean）。',
    starterCode: `
def budget_sim(layers, budget=12, trials=200, seed=42, is_end=780):
    pass

MOMS = list(range(5, 65, 5))
L = [("L1", [(m,) for m in MOMS]), ("L3", [(m, v, f) for m in MOMS for v in (10,20,40) for f in (5,21,63)])]
print(budget_sim(L))`,
    expectedOutput: 'L1: champ_is 1.81 / inflation 0.55；L3: 1.91 / 0.85',
    tests: `
MOMS = list(range(5, 65, 5))
layers = [
    ("L1", [(m,) for m in MOMS]),
    ("L2", [(m, v) for m in MOMS for v in (10, 20, 40)]),
    ("L3", [(m, v, f) for m in MOMS for v in (10, 20, 40) for f in (5, 21, 63)]),
    ("L4", [(m, v, f, s) for m in MOMS for v in (10, 20, 40) for f in (5, 21, 63) for s in (None, 0.10)]),
]
df = budget_sim(layers, budget=12, trials=200, seed=42)
assert len(df) == 4, f"应有 4 行，实际 {len(df)}"
for c in ("champ_is", "champ_oos", "is_mean", "inflation"):
    assert c in df.columns, f"缺少列 {c}"
assert abs(df.loc["L1", "champ_is"] - 1.81) < 0.04, f"L1 冠军 IS 应约 1.81，实际 {df.loc['L1','champ_is']}"
assert abs(df.loc["L1", "inflation"] - 0.55) < 0.05, f"L1 虚高应约 0.55，实际 {df.loc['L1','inflation']}"
assert abs(df.loc["L3", "inflation"] - 0.85) < 0.07, f"L3 虚高应约 0.85，实际 {df.loc['L3','inflation']}"
assert df.loc["L4", "inflation"] > df.loc["L1", "inflation"], "旋钮越多，虚高越大"
assert df.loc["L4", "champ_oos"] < df.loc["L1", "champ_oos"], "OOS 冠军不应随旋钮增加而上升"`,
    answer: `
${MOM_FN}

def budget_sim(layers, budget=12, trials=200, seed=42, is_end=780):
    rng = np.random.default_rng(seed)
    rows = {}
    for label, pool in layers:
        iss, oos = [], []
        for p in pool:
            q = list(p) + [None] * (4 - len(p))
            m, v, f, st = q[0], q[1] if q[1] is not None else 20, q[2] if q[2] is not None else 21, q[3]
            r = mom_ret(m, v, f, st)
            iss.append(sh(r.iloc[:is_end]))
            oos.append(sh(r.iloc[is_end:]))
        iss = np.array(iss); oos = np.array(oos)
        hi, ho = [], []
        for _ in range(trials):
            sel = rng.choice(len(pool), size=min(budget, len(pool)), replace=False)
            k = sel[int(np.argmax(iss[sel]))]
            hi.append(iss[k]); ho.append(oos[k])
        rows[label] = {"champ_is": float(np.mean(hi)), "champ_oos": float(np.mean(ho)),
                       "is_mean": float(iss.mean()),
                       "inflation": float(np.mean(hi) - iss.mean())}
    return pd.DataFrame(rows).T`,
    explanation: '这是本节最关键的实验设计：**固定试验预算**（12 次）才能区分「搜索空间变大」与「运气变好」。如果穷举全空间，L4 有 216 次机会、L1 只有 12 次，比较就不公平。`inflation` 列（冠军 − 池均）是「虚高」的直接度量。',
  },
  {
    id: 'quant-xquant-c7-l4-e10', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c7-l4', tags: ['D', '研究设计'],
    question: '一个团队想给策略加 3 条新规则（止损、止盈、成交量过滤）。请回答：\n① 你会怎么设计实验来判断「该不该加」？\n② 用本节数据说明「加规则会让样本内变好」为什么不是理由；\n③ 三条判据怎么用？如果只有「样本内冠军上升」这一条成立，你怎么判断？\n④ 如果最终决定只加 1 条，你会选哪一条？依据是什么？',
    referenceAnswer: `
① 实验设计（≥5 步）：
1. **建立严格基线**：现有策略（无新规则），记录 IS/OOS 全部指标；
2. **逐条单变量加入**：每次只加 1 条规则，其他固定（不能同时加 3 条）；
3. **记录四件事**：IS 冠军、IS 池均、OOS 冠军、OOS 池均（不能只记 IS 冠军）；
4. **固定试验预算**：每条规则都只试同样次数（如 12 次随机抽样），否则「空间大的那条」会因机会多而显得更好；
5. **算虚高**：\`冠军 − IS 池均\`，这个差值才是「自由度买来的部分」；
6. **做参数敏感性**：对每条规则扫它的参数，看是高原还是山峰（第 6 章判据）；
7. **样本外验证**：用 Walk-forward 或时序 CV 检验增量是否兑现。

② 为什么「样本内变好」不是理由：
- 本节实测：旋钮从 1 加到 4，IS 冠军从 **1.81 涨到 2.34（+0.52）**——样本内确实变好了；
- 但同期 IS 池均从 **1.26 掉到 1.06（−0.20）**，OOS 冠军从 **4.60 掉到 4.39（−0.21）**；
- 所以「样本内变好」只说明「最大值更容易被凑出来」，不说明能力提升。**只要加旋钮，样本内冠军几乎必然变好**——这是数学性质，不是策略改进。

③ 三条判据怎么用：
- **判据 1（IS 冠军升）**：单独成立 → **不足以判断**。它可能是真的更好，也可能只是空间变大；
- **判据 2（IS 池均降）**：若同时成立 → 强烈指向规则负担（平均水平没变好）；
- **判据 3（OOS 冠军不升）**：若同时成立 → 确认规则负担。
- **只有判据 1 成立时**：需要补两项检查——① 参数敏感性（新规则的参数是高原还是山峰？若是山峰，很可能是噪声）；② 样本外验证（OOS 是否兑现增量）。若两者都不支持，则不应加。

④ 只加 1 条时选哪条：
**优先选「参数敏感性最低 + 边际贡献最大 + 与现有规则冲突最小」的那条**。具体判断：
- **止损**：本节已测出止损维度对结果几乎无影响（IS 均值 0.72 vs 0.64，L3→L4 冠军不变），所以它的**边际贡献接近 0**，不该加；
- **止盈**：第 5 章已测出所有阈值都未改善结果（10% 最差 +35.38%，30% 等于没设），不该加；
- **成交量过滤**：本节没有数据，需要单独测。但它引入的是一个新数据源 + 新参数，自由度成本最高。
- 结论：**如果三条都不满足「边际贡献为正 + 参数高原 + 样本外兑现」，则一条都不加**。这不是保守，而是本节数据的直接推论——「加规则」在本样本上没有一次被证明有效。`,
    rubric: [
      { point: '① 至少 5 步，含「严格基线」「单变量」「固定预算」「虚高度量」「样本外」', score: 4 },
      { point: '② 用 1.81→2.34 / 1.26→1.06 / 4.60→4.39 三个数字说明', score: 3 },
      { point: '② 指出「只要加旋钮，IS 冠军几乎必然变好」是数学性质', score: 2 },
      { point: '③ 明确「只有判据 1 不足以判断」，需补敏感性 + 样本外', score: 2 },
      { point: '④ 用本节/第 5 章数据说明止损与止盈的边际贡献接近 0', score: 2 },
    ],
    keywords: ['基线', '单变量', '固定预算', '虚高', '池均', '参数敏感性', '样本外'],
    explanation: '评分重点在②与④。第②问考「会不会区分『最大值变好』与『平均水平变好』」，第④问考「敢不敢用数据得出『一条都不加』这个结论」。后者需要抵抗「加规则显得更专业」的心理压力。',
  },
  {
    id: 'quant-xquant-c7-l4-e11', type: 'single', difficulty: 4,
    relatedLessonId: 'quant-xquant-c7-l4', tags: ['U', '综合'],
    question: '本节「每个旋钮的边际贡献」显示：第 1 个旋钮 +1.28，第 2 个 −0.03，第 3 个 −0.17，第 4 个 0.00。这个结果对「该用几个参数」的直接含义是？',
    options: [
      { value: 'a', text: '只有第 1 个旋钮有实质贡献，后三个付出 18 倍搜索成本却换来 −0.20；应尽量固定后三个参数' },
      { value: 'b', text: '应该用第 1 和第 4 个旋钮' },
      { value: 'c', text: '四个旋钮都要用，因为边际贡献可以相加' },
      { value: 'd', text: '边际贡献为负说明策略无效' },
    ],
    answer: 'a',
    explanation: '第 1 个旋钮（动量窗口）+1.28 是唯一实质贡献。后三个合计 −0.20，却把搜索空间从 12 扩到 216（18 倍）。正确做法：固定后三个（如 vol=20、freq=21、不止损），因为第 6 章已测出 vol 沿轴极差仅 0.15——固定它几乎无损。',
  },
  {
    id: 'quant-xquant-c7-l4-e12', type: 'judge', difficulty: 4,
    relatedLessonId: 'quant-xquant-c7-l4', tags: ['U', '方法'],
    question: '加一个「完全不影响计算」的无用旋钮（例如随机种子），样本内冠军不会变。',
    answer: false,
    explanation: '会变。因为「无用」指的是它不影响单个组合的结果，但它会让每个参数组合被重复计数多次（同一策略出现多个「不同」参数版本）。在「取最大值」的过程中，这等于增加了抽样次数——空间变大，冠军更容易撞高。这正是本节 L4 止损旋钮的情形（冠军仍是「不止损」，但空间翻倍）。',
  },
  {
    id: 'quant-xquant-c7-l4-e13', type: 'open', difficulty: 5,
    relatedLessonId: 'quant-xquant-c7-l4', tags: ['D', '综合'],
    question: '请把本章四个工具（选择偏差 / Walk-forward / 时序 CV / 规则负担）整合成一份「过拟合风险评估表」（不超过 10 行）。要求：每行 = 一个风险维度 + 一个量化指标 + 本章的锚点数字 + 一条处置建议。',
    referenceAnswer: `
过拟合风险评估表（10 行）：

| # | 风险维度 | 量化指标 | 本章锚点数字 | 处置建议 |
| --- | --- | --- | --- | --- |
| 1 | 试验次数 | 试了多少组参数 | 490 组 → 优势保留率 **−4%** | 报告必须写明；> 20 组需做 DSR/PBO 校正 |
| 2 | 样本外绝对 vs 相对 | OOS 池均 vs IS 池均 | OOS 3.01 / IS 0.68（整池上移 2.33） | 必须做池内比较，禁止用绝对 OOS 值下结论 |
| 3 | 单次切分的假象 | IS/OOS 秩相关 | 单次 0.909 vs 9 窗口均值 **0.02** | 单次切分不能作为证据；至少 6 个滚动窗口 |
| 4 | 冠军的样本外排名 | 冠军在 OOS 的排名 | 第 **51 / 490**（有 50 个更好） | 报告必须给排名，不只给数值 |
| 5 | Walk-forward 是否做过 | 折数 + 参数稳定性 | Rolling 6 种/17%、Anchored 4 种/**50%** | 至少 4 折；稳定性优先于 OOS 均值 |
| 6 | 重选 vs 死守 | 与死守固定参数的对照 | 死守 **3.97** > Rolling 3.29 > Anchored 3.21 | 必须做这个对照，否则无法证明重选有价值 |
| 7 | 切法是否正确 | 时序 / 随机 | 标签 lag-1 自相关 **0.830**；笨模型随机切分相关 0.82 | 必须时序切分；边界需 Purge + Embargo |
| 8 | 折间波动的解读 | 折间标准差 | 随机 0.93 vs 时序 **1.48**（大的是真信息） | 不要把「小标准差」当成稳定性 |
| 9 | 自由度成本 | 参数个数 + 虚高度量 | 旋钮 1→4：IS 冠军 **+0.52**、池均 **−0.20**、OOS 冠军 **−0.21** | 参数 ≤ 3；用敏感性分析决定删哪个 |
| 10 | 无用旋钮 | 删掉后指标变化 | L3→L4 所有指标**完全相同**（止损无用） | 删掉；固定为默认值 |

使用说明：
- 第 1-4 行属于「证据强度」，第 5-6 行属于「时间维度」，第 7-8 行属于「切分正确性」，第 9-10 行属于「复杂度」；
- **第 7 行是前置条件**：若切法错，第 1-6 行的全部结果作废；
- 每一行的「处置建议」都必须是动作，不是态度（「必须写明」而不是「要注意」）。`,
    rubric: [
      { point: '至少 8 行，覆盖四个工具（选择偏差/WF/CV/规则负担）', score: 4 },
      { point: '每行都有量化指标 + 本章具体锚点数字', score: 3 },
      { point: '每行的处置建议是可执行动作，不是态度', score: 2 },
      { point: '指出「切法错会让其他结果作废」这个依赖关系', score: 2 },
    ],
    keywords: ['保留率', '池内比较', '秩相关', 'OOS 排名', '参数稳定性', 'lag-1', '自由度', '虚高'],
    explanation: '这道题要求把四节内容压成一张可执行的表。判断标准：每一行是否能让另一个人「照着查、照着做」。如果某一行读起来像「要小心过拟合」，它就不合格。',
  },

  /* ═══════════ l5：五项清单（8 题）═══════════ */
  {
    id: 'quant-xquant-c7-l5-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-c7-l5', tags: ['K', '清单'],
    question: '本章五项检查清单的正确顺序是？',
    options: [
      { value: 'a', text: '样本外（试了多少次）→ Walk-forward → 时序切分 → 规则负担 → 四视角' },
      { value: 'b', text: '四视角 → 规则负担 → 时序切分 → Walk-forward → 样本外' },
      { value: 'c', text: '规则负担 → 样本外 → 四视角 → 时序切分 → Walk-forward' },
      { value: 'd', text: '顺序无所谓，随便查' },
    ],
    answer: 'a',
    explanation: '顺序对应「从最致命到较轻微」：前两项问「有没有证据」，后三项问「证据多强、报告多全」。而且有依赖——第 3 项（切法）不合格会让第 1、2 项作废。',
  },
  {
    id: 'quant-xquant-c7-l5-e2', type: 'fill', difficulty: 2,
    relatedLessonId: 'quant-xquant-c7-l5', tags: ['K', '清单'],
    question: '五项清单的锚点数字：第 1 项试 490 次的保留率 ______%；第 3 项标签 lag-1 自相关 ______；第 4 项旋钮 1→4 的 IS 冠军涨幅 ______。',
    blanks: [['-4', '−4'], ['0.830', '0.83'], ['0.52', '+0.52']],
    explanation: '保留率 −4%、lag-1 自相关 0.830、IS 冠军 +0.52。每一项都必须配一个可被反驳的数字，否则清单就变成了口号。',
  },
  {
    id: 'quant-xquant-c7-l5-e3', type: 'judge', difficulty: 2,
    relatedLessonId: 'quant-xquant-c7-l5', tags: ['U', '清单'],
    question: '五项清单全部通过，就说明这个策略可以上线。',
    answer: false,
    explanation: '五项全过只说明「证据链完整」，不说明「策略适合你」。第 6 章的回撤宽度（等权 93% 时间在水下、最长 464 天）可能远超你的承受能力。而且本章清单是「最低要求」，不含成本、容量、极端行情压力测试。',
  },
  {
    id: 'quant-xquant-c7-l5-e4', type: 'multiple', difficulty: 3,
    relatedLessonId: 'quant-xquant-c7-l5', tags: ['U', '清单'],
    question: '为什么说「第 3 项（切法）不合格会让前面所有检验作废」？',
    options: [
      { value: 'a', text: '因为随机 K 折的泄漏会让「样本外表现好」这个结论本身失效' },
      { value: 'b', text: '因为标签 lag-1 自相关 0.830，随机切分下模型可以「抄邻居答案」' },
      { value: 'c', text: '因为切法是所有检验的基础，基础错了上面全错' },
      { value: 'd', text: '因为随机 K 折的计算量更大' },
    ],
    answer: ['a', 'b', 'c'],
    explanation: '这就像考试用了错误的答案标准——分数再高也没有意义。本节实测：一个零预测力的笨模型在随机切分下相关 0.82，说明「切法错」会让任何「表现好」都变成泄漏的产物。',
  },
  {
    id: 'quant-xquant-c7-l5-e5', type: 'code', difficulty: 3,
    relatedLessonId: 'quant-xquant-c7-l5', tags: ['D', '清单'],
    setupCode: MKT,
    lang: 'python',
    question: '实现 `audit_report(report)`：输入 dict（可能含 `n_trials`、`wf_folds`、`split`、`n_params`、`bench`、`yearly`、`dist`、`dd`），返回 list[tuple(检查项, 判定, 说明)]。判定为 `"合格"` / `"不合格"` / `"缺证据"` / `"偏弱"`。规则：n_trials>100 不合格、缺失为缺证据；wf_folds<4 偏弱、缺失为缺证据；split=="random" 不合格；n_params>4 不合格；四视角缺任一项不合格。',
    starterCode: `
def audit_report(report):
    pass

print(audit_report(dict(n_trials=12, wf_folds=6, split="expanding",
                        n_params=3, bench=True, yearly=True, dist=True, dd=True)))`,
    expectedOutput: '五项全部合格',
    tests: `
good = dict(n_trials=12, wf_folds=6, split="expanding",
            n_params=3, bench=True, yearly=True, dist=True, dd=True)
rows = audit_report(good)
assert len(rows) == 5, f"应有 5 项，实际 {len(rows)}"
assert all(r[1] == "合格" for r in rows), f"合格报告应全部通过，实际 {[r[1] for r in rows]}"
assert rows[0][0].startswith("1"), "第 1 项应关于样本外/试次数"
assert rows[2][0].startswith("3"), "第 3 项应关于切法"

bad = dict(n_trials=490, wf_folds=1, split="random",
           n_params=8, bench=False, yearly=False, dist=False, dd=True)
rb = audit_report(bad)
assert len(rb) == 5
assert rb[0][1] == "不合格", f"试 490 次应不合格，实际 {rb[0][1]}"
assert rb[1][1] == "偏弱", f"1 折应偏弱，实际 {rb[1][1]}"
assert rb[2][1] == "不合格", f"随机切分应不合格，实际 {rb[2][1]}"
assert rb[3][1] == "不合格", f"8 个参数应不合格，实际 {rb[3][1]}"
assert rb[4][1] == "不合格", f"缺三视角应不合格，实际 {rb[4][1]}"

miss = audit_report(dict(n_params=4, bench=True, dd=True))
assert sum(1 for r in miss if r[1] == "缺证据") == 3, f"应报 3 项缺证据，实际 {miss}"`,
    answer: `
ANCHORS = {"retention_490": -4, "lag1": 0.830, "wf_rolling": 3.29,
           "wf_anchored": 3.21, "wf_fixed": 3.97,
           "is_champ_gain": 0.52, "is_pool_drop": -0.20, "oos_champ_drop": -0.21,
           "rel_A": 40.94, "rel_B": -63.31}

def audit_report(report):
    out = []
    n = report.get("n_trials")
    if n is None:
        out.append(("1 样本外/试次数", "缺证据", "未写试了多少组参数"))
    elif n > 100:
        out.append(("1 样本外/试次数", "不合格",
                    "试了 %d 组；参考保留率 %d%%" % (n, ANCHORS["retention_490"])))
    else:
        out.append(("1 样本外/试次数", "合格", "试了 %d 组，规模可控" % n))

    wf = report.get("wf_folds")
    if not wf:
        out.append(("2 Walk-forward", "缺证据", "只有一次切分"))
    elif wf < 4:
        out.append(("2 Walk-forward", "偏弱", "只有 %d 折" % wf))
    else:
        out.append(("2 Walk-forward", "合格", "%d 折滚动" % wf))

    sp = report.get("split")
    if sp is None:
        out.append(("3 切法", "缺证据", "未说明切分方式"))
    elif sp == "random":
        out.append(("3 切法", "不合格",
                    "随机 K 折泄漏；标签 lag-1 自相关 %.3f" % ANCHORS["lag1"]))
    else:
        out.append(("3 切法", "合格", "%s 切分" % sp))

    np_ = report.get("n_params")
    if np_ is None:
        out.append(("4 规则负担", "缺证据", "未说明参数个数"))
    elif np_ > 4:
        out.append(("4 规则负担", "不合格",
                    "%d 个参数；旋钮 1→4 实测 IS 冠军 +%.2f 但池均 %.2f" % (
                        np_, ANCHORS["is_champ_gain"], ANCHORS["is_pool_drop"])))
    else:
        out.append(("4 规则负担", "合格", "%d 个参数" % np_))

    need = ["bench", "yearly", "dist", "dd"]
    miss = [k for k in need if not report.get(k)]
    if miss:
        out.append(("5 四视角", "不合格", "缺 %s" % ",".join(miss)))
    else:
        out.append(("5 四视角", "合格", "四视角齐全"))
    return out`,
    explanation: '这道题把五项清单变成可执行代码。三个易错点：① 返回的是 list[tuple] 而不是 dict（要保序）；② 「缺证据」与「不合格」必须区分——前者是「请补充材料」，后者是「否决」；③ 每一项的说明里都要带本章的锚点数字，否则清单就退化成口号。',
  },
  {
    id: 'quant-xquant-c7-l5-e6', type: 'open', difficulty: 4,
    relatedLessonId: 'quant-xquant-c7-l5', tags: ['D', '综合'],
    question: '请审阅下面这份报告，并给出你的回复。\n\n> 「某动量策略，五年累计收益 +225.09%，简化夏普 2.82，最大回撤 −8.78%。参数为 mom=10, vol=15, freq=10, stop=10%。经 2024-2025 样本外验证（夏普 4.61），策略稳健有效，建议上线。」\n\n要求：\n① 用五项清单逐条指出缺什么；\n② 用本章数字说明为什么「样本外 4.61」不能支持「稳健有效」；\n③ 写出你的回复（不超过 150 字），要区分「证据不足」与「策略无效」；\n④ 如果他补充材料后五项全过，你下一步还要查什么？',
    referenceAnswer: `
① 五项清单逐条：
| # | 检查项 | 报告里有什么 | 缺什么 |
| --- | --- | --- | --- |
| 1 | 试了多少次 | 未提及 | 试了多少组参数（若 490 组 → 保留率 −4%） |
| 2 | Walk-forward | 只有一次 60/40 切分 | 滚动逐折明细（参考：Rolling OOS 3.29 / 极差 6.29 / 6 种参数） |
| 3 | 切法 | 未说明 | 时序还是随机（若随机 → lag-1 自相关 0.830，结果无效） |
| 4 | 规则负担 | 4 个参数 | 敏感性表 + 能删哪个（参考：止损删掉后所有指标不变） |
| 5 | 四视角 | 只有累计/夏普/回撤 | 基准（相对 A +40.94 / 相对 B −63.31 pp）、逐年、分布（胜率/盈亏比） |

② 为什么「样本外 4.61」不能支持「稳健有效」：
- **OOS 段是牛市**：490 组的 OOS 池均 **3.01**，而 IS 池均只有 **0.68**——整池上移 **2.33**。所以 4.61 里有 2.33 是市场送的，不是策略赚的；
- **冠军的 OOS 排名只是第 51 / 490**：有 50 个参数比它更好；
- **单次切分不可信**：IS/OOS 秩相关 0.909 是假象；9 个滚动窗口的秩相关均值 **0.02**，冠军下窗平均百分位 46%（比随机还差）；
- **优势保留率 1%**：+2.83 → +0.03。

③ 回复（≤150 字）：
「感谢。目前无法判断策略是否有效，因为证据不足，不是策略有问题。请补充四项：① 试了多少组参数；② Walk-forward 逐折明细（≥4 折）与参数稳定性；③ 切分方式（必须时序切分）；④ 四视角（基准/逐年/分布/回撤）。另外，「样本外夏普 4.61」需说明池内比较：同期 490 组的 OOS 池均为 3.01（牛市整体抬升），冠军仅排名第 51/490，单次切分的秩相关 0.909 在 9 个滚动窗口下会降到 0.02。补齐后我再评估。」

④ 五项全过后还要查什么：
- **成本压力测试**：单边 10/30/50bp 下是否仍成立（本节全部不含成本）；
- **容量分析**：策略规模上限（换手 48.4，容量可能有限）；
- **极端行情压力测试**：模拟 2008/2015/2020 式暴跌下的回撤与恢复时间；
- **执行可行性**：滑点、最小交易单位、停牌（第 9 章）；
- **规则过期风险**：同一套规则在不同年份的表现衰减（第 8 章）；
- **多重检验校正**：用 Deflated Sharpe Ratio 或 PBO 做正式显著性检验。`,
    rubric: [
      { point: '① 五项都指出，且第 1、3 项明确指出「未提及」是硬缺口', score: 3 },
      { point: '② 用「OOS 池均 3.01 / IS 池均 0.68」说明牛市抬升', score: 3 },
      { point: '② 用「排名 51/490」「秩相关 0.02」「保留率 1%」三个数字', score: 2 },
      { point: '③ 回复明确区分「证据不足」与「策略无效」', score: 3 },
      { point: '④ 至少 3 项后续检查，含成本与极端行情', score: 2 },
    ],
    keywords: ['试了多少组', 'Walk-forward', '时序切分', '规则负担', '四视角', '证据不足', '池均'],
    explanation: '评分重点在②与③。第②问考「会不会做池内比较」，第③问考「能不能把『缺证据』说清楚而不是笼统否决」。这两项合起来就是「专业审阅」与「随口否定」的分界。',
  },
  {
    id: 'quant-xquant-c7-l5-e7', type: 'judge', difficulty: 3,
    relatedLessonId: 'quant-xquant-c7-l5', tags: ['U', '综合'],
    question: '第 6 章的四个视角（基准/逐年/分布/回撤）与本章的四个工具（样本外/WF/时序 CV/规则负担）是重复的，做一套就够。',
    answer: false,
    explanation: '两者是正交维度：第 6 章问「赚得健康吗」（收益质量），本章问「这个结论是真的吗」（证据质量）。顺序应该是先用本章确认「是真的」，再用第 6 章评估「好不好」——否则会浪费大量时间评估一段不存在的历史表现。',
  },
  {
    id: 'quant-xquant-c7-l5-e8', type: 'single', difficulty: 4,
    relatedLessonId: 'quant-xquant-c7-l5', tags: ['U', '综合'],
    question: '审阅一份回测报告时，发现「未说明切分方式」。最恰当的处理是？',
    options: [
      { value: 'a', text: '标为「缺证据」，要求补充；并说明若为随机 K 折则前面所有结果作废' },
      { value: 'b', text: '直接判定策略无效' },
      { value: 'c', text: '默认它是时序切分，继续审其他项' },
      { value: 'd', text: '忽略这一项，因为切分方式不影响结论' },
    ],
    answer: 'a',
    explanation: '「未说明」= 缺证据（要求补充），不等于「无效」。但必须同时指出风险：若为随机 K 折，则标签 lag-1 自相关 0.830 会让前面所有「样本外表现好」的结论作废。b 过强、c 是危险的假设、d 完全错误。',
  },
];

export const quantXquantC7ExercisesAll = quantXquantC7Exercises;
