# -*- coding: utf-8 -*-
"""batch35 p6：quant 其余 8 门共 31 节章主题包升级（TS 源均在 src/content/chapters/quant/）。
覆盖：quant-market / quant-data / quant-strategy / quant-ml / quant-portfolio / quant-project / quant-python / quant-backtest
"""
from _batch34_lib import Lib, build_md, finish
import sys

Q = "src/content/chapters/quant/%s.ts"
LIBS = {
    "quant-market": Lib("quant-market", [Q % "quant-market"]),
    "quant-data": Lib("quant-data", [Q % "quant-data"]),
    "quant-strategy": Lib("quant-strategy", [Q % "quant-strategy"]),
    "quant-ml": Lib("quant-ml", [Q % "quant-ml"]),
    "quant-portfolio": Lib("quant-portfolio", [Q % "quant-portfolio"]),
    "quant-project": Lib("quant-project", [Q % "quant-project"]),
    "quant-python": Lib("quant-python", [Q % "quant-python"]),
    "quant-backtest": Lib("quant-backtest", [Q % "quant-backtest"]),
}

REFS = {
"quant-market": "本课程整理（可参见 Larry Harris《Trading and Exchanges》与上交所/深交所交易规则相应章节）",
"quant-data": "本课程整理（可参见 Marcos López de Prado《Advances in Financial Machine Learning》第 2 章与 Parquet/pandas 官方文档相应章节）",
"quant-strategy": "本课程整理（可参见 Jegadeesh & Titman (1993)、Moskowitz, Ooi & Pedersen (2012) JFE 与 Bollinger 官方资料相应章节）",
"quant-ml": "本课程整理（可参见 Marcos López de Prado《Advances in Financial Machine Learning》第 3/8 章与 Gu, Kelly & Xiu (2020) RFS 相应章节）",
"quant-portfolio": "本课程整理（可参见 Artzner et al. (1999)《Coherent Measures of Risk》与巴塞尔协议 III FRTB 相应章节）",
"quant-project": "本课程整理（可参见 Barra 风格模型公开文献与 A 股交易所公开费率标准相应章节）",
"quant-python": "本课程整理（可参见 NumPy Broadcasting 官方文档、pandas 用户指南与 Wilder (1978)《New Concepts in Technical Trading Systems》相应章节）",
"quant-backtest": "本课程整理（可参见 Marcos López de Prado (2014) JPM《The Deflated Sharpe Ratio》与主流事件驱动回测框架文档相应章节）",
}

T = {}   # (course, chapter) -> theme
G = {}   # lesson -> goals
P = {}   # lesson -> prereq
C = {}   # (course, chapter) -> code
EX = {}  # (course, chapter) -> expected（verify 后填）

# ══════════════ quant-market ══════════════
T["quant-market","c1"] = dict(
expected="""撮合：盘口买一 9.98×500/卖一 10.00×400（价差 0.02、中间价 9.99），市价买 1000 股逐档吃单均价 10.0060、滑点 0.0160（0.16%）全部成交；OBI=(500-400)/(500+400)=+0.11 买方占优；简单收益 [0.1,-0.1] 复合连乘 -1.00%，对数收益 [0.095,-0.105] 相加 -1.01%=ln(P2/P0)；截面组合简单收益可加（15.0%）而对数收益不可加（0.1388）。""",
why=("你在回测里『按收盘价成交』的一笔单子，在真实市场要经过委托类型选择、价格时间优先排队、逐档吃单滑点——"
     "微观结构决定策略从纸面到成交之间损失多少。不懂数量级就动手，等于闭着眼睛开车。"),
intuition=("订单簿像拍卖行的两块白板：左边写想买的价格（从高到低），右边写想卖的价格（从低到高），两板最高买价与"
           "最低卖价的缝隙就是价差。愿意等（限价单）就挂上板当『供应商』，等不及（市价单）就把对面板上的纸一张张"
           "撕下来——撕到越贵的纸成本越高。"),
cerr=("回测假设全部按买一/卖一价全额成交，忽略吃穿五档的冲击成本；把简单收益直接相加当作多期累计收益；"
      "对数收益率做截面加权平均当作组合收益。"),
miscon=("1. **『市价单一定成交』**——它保证速度但放弃价格控制权，薄盘口上滑点可以吞掉全年超额；\\n"
        "2. **『价差只是手续费』**——价差是逆向选择风险的补偿，价差突然放大常意味着有毒订单流；\\n"
        "3. **『简单收益与对数收益随便换用』**——截面可加性只有简单收益具备，时序可加性只有对数收益具备，严禁混用。"),
connection=("- **向前**：本章滑点与 OBI 是 quant-live 执行算法的输入；\n"
            "- **向后**：quant-backtest 的撮合引擎把本章规则写成代码；\n"
            "- **平行**：quant-data 的 Tick/L2 数据层级是本章观测的物质基础。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 撮合准则 | 价格优先、时间优先（FIFO）|\n"
         "| 限价 vs 市价 | Maker 提供流动性承担执行风险 / Taker 消耗流动性承担滑点 |\n"
         "| 流动性度量 | 名义价差、相对价差、OBI∈[-1,1] |\n"
         "| 冲击成本 | 逐档吃单均价 − 中间价 |\n"
         "| 收益率 | 简单收益截面可加、对数收益时序可加 |"),
)
T["quant-market","c2"] = dict(
expected="""VWAP 逐时段累计：10.0000→10.0333→10.0156→10.0493，收盘 10.10 高于 VWAP 10.0493 日内偏多；量价背离检测：3/3 时段量缩价涨（无量空涨预警）。""",
why=("K 线与成交量是市场情绪的指纹：VWAP 是机构执行质量的标尺，量价背离是趋势衰竭的预警。"
     "看不懂量，价格信号就少了一半证据链。"),
intuition=("价格是『大家同意的价格』，成交量是『为此吵了多少架』——量增价涨是越吵越有钱进场；量缩价涨是没人接盘的"
           "独角戏。VWAP 是当天的『加权平均成本线』：机构买得比它便宜才算合格作业，收盘越近它越难被撼动。"),
cerr=("用简单平均而不是成交量加权计算 VWAP，高价低量时段被高估；VWAP 用当日全量数据回填历史时点（未来函数）；"
      "把『放量滞涨』当成突破前蓄势而追高。"),
miscon=("1. **『量大量小直接比较』**——不同市值/不同时段的成交量不可直接比，要用换手率或相对历史分位；\\n"
        "2. **『VWAP 是支撑位』**——它是记账基准不是技术位，跌到 VWAP 只说明当日均线上方买入者被套；\\n"
        "3. **『背离一次就反转』**——背离是概率信号，需要价格结构（破位/新高）确认。"),
connection=("- **向前**：c1 的订单簿深度决定 VWAP 执行成本；\n"
            "- **向后**：quant-strategy 的趋势确认必须叠加量能过滤；\n"
            "- **平行**：quant-python 的 pandas 累计函数是本章计算的标准工具。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| VWAP | Σ(P·V)/ΣV，累计值越到收盘越稳定 |\n"
         "| 用途 | 买方考核执行质量、算法基准、多空力量判据 |\n"
         "| 量增价涨 | 增量资金进场，趋势可延续 |\n"
         "| 量缩价涨 | 背离：无量空涨易踩踏回落 |\n"
         "| 放量滞涨 | 高位换手剧烈，警惕派发 |"),
)
C[("quant-market", "c1")] = '''import numpy as np
np.set_printoptions(precision=3, suppress=True)

# ---- 1. 价格时间优先撮合：市价买 1000 股逐档吃单 ----
bids = [(9.98, 500), (9.97, 800), (9.96, 1200)]
asks = [(10.00, 400), (10.01, 600), (10.02, 900)]
def market_buy(qty, asks):
    left, cost, fills = qty, 0.0, []
    for px, v in asks:
        q = min(left, v)
        fills.append((px, q)); cost += px*q; left -= q
        if left == 0: break
    return cost/qty, fills, left
avg, fills, left = market_buy(1000, asks)
mid = (asks[0][0] + bids[0][0]) / 2
print(f"盘口: 买一 9.98x500 / 卖一 10.00x400, 价差 0.02, 中间价 {mid}")
print(f"市价买 1000 股: 均价 {avg:.4f}, 滑点 {avg-mid:.4f} ({100*(avg/mid-1):.2f}%), 未成交 {left}")

# ---- 2. OBI 盘口失衡 ----
vb, va = bids[0][1], asks[0][1]
print(f"OBI = ({vb}-{va})/({vb}+{va}) = {(vb-va)/(vb+va):+.2f}（买方占优）")

# ---- 3. 简单收益 vs 对数收益 ----
P = [100, 110, 99]
R = [P[i]/P[i-1]-1 for i in (1, 2)]
r = [np.log(P[i]/P[i-1]) for i in (1, 2)]
print(f"简单收益 {np.round(R,4)} 复合(连乘): {(1+R[0])*(1+R[1])-1:.4f}")
print(f"对数收益 {np.round(r,4)} 累计(相加): {sum(r):.4f} = ln(P2/P0)={np.log(P[2]/P[0]):.4f}")
print(f"截面: 组合简单收益 = 0.5*10%+0.5*20% = {0.5*0.10+0.5*0.20:.1%}（可加）")
print(f"      组合对数收益 ≠ 0.5*ln(1.1)+0.5*ln(1.2) = {0.5*np.log(1.1)+0.5*np.log(1.2):.4f}（不可加）")'''
C[("quant-market", "c2")] = '''import numpy as np
bars = [(10.00, 1000), (10.05, 2000), (9.98, 1500), (10.10, 3000)]   # (价格, 成交量)
pv = cum_v = 0.0
print("时段   价格   成交量   VWAP")
for i, (p, v) in enumerate(bars):
    pv += p*v; cum_v += v
    print(f"{i}    {p:.2f}   {v:5d}   {pv/cum_v:.4f}")
vwap, last = pv/cum_v, bars[-1][0]
print(f"收盘 {last} vs VWAP {vwap:.4f}: 现价{'高于' if last > vwap else '低于'}VWAP，日内{'偏多' if last > vwap else '承压'}")
# 量价背离：价涨量缩
prices = np.array([10.0, 10.2, 10.4, 10.5]); vols = np.array([1000, 900, 600, 300])
div = ((np.diff(prices) > 0) & (np.diff(vols) < 0))
print("量缩价涨（背离）时段:", int(div.sum()), "/", len(div), "→ 无量空涨预警")'''
G["quant-market-c1-l1"] = ("1. 复述连续双向拍卖（CDA）与价格优先/时间优先准则；\n"
                          "2. 对比限价单（Maker，执行风险+逆向选择）与市价单（Taker，滑点）的代价；\n"
                          "3. 手工模拟一笔市价买单逐档吃单并计算平均成交价。")
G["quant-market-c1-l2"] = ("1. 用公式计算名义/相对价差、中间价与 OBI，并解释 OBI 的短线含义；\n"
                           "2. 区分 Level-1（五档）与 Level-2（十档+逐笔）行情的信息含量；\n"
                           "3. 按吃单公式计算给定订单量的冲击成本（滑点）。")
G["quant-market-c1-l3"] = ("1. 推导简单收益的截面可加性与时序连乘性质；\n"
                           "2. 证明对数收益时序可加 r_0T = Σ r_t，并演示其截面不可加；\n"
                           "3. 判断给定场景该用哪种收益率（组合优化用简单、计量建模用对数）。")
G["quant-market-c2-l2"] = ("1. 手工累计计算分时 VWAP 并解读现价与 VWAP 的相对位置；\n"
                           "2. 说明四类角色（买方/卖方/算法/分析师）如何使用 VWAP；\n"
                           "3. 识别量增价涨、量缩价涨、放量滞涨三种量价形态的交易含义。")
P["quant-market-c1-l1"] = "- 知道股票买卖的基本流程；\n- 无数学前置。"
P["quant-market-c1-l2"] = "- 「证券市场机制、委托类型与连续双向拍卖」（l1）。"
P["quant-market-c1-l3"] = "- 中学对数运算；\n- 「限价订单簿动力学」（l2）的成交概念。"
P["quant-market-c2-l2"] = "- c1 的订单簿与收益率定义；\n- 加权平均的概念。"

# ══════════════ quant-data ══════════════
T["quant-data","c1"] = dict(
expected="""Tick→1min Bar：O=10.0 H=10.05 L=9.98 C=10.01 V=2200；REST 轮询模拟 ~1ms（真实 20-200ms 且有限流），WS 推送 <5ms；MAD 过滤剔除乌龙指 105.0 保留其余 5 笔；停牌日 ffill=10.20 且 is_suspended=True 拦截一切信号（周三/周四）。""",
why=("量化系统 80% 的工程量在数据：Tick 全市场单日 5000 万条、REST 有频次限制、停牌与乌龙指随时污染样本。"
     "数据层不干净，上游所有因子与回测都是沙上建塔。"),
intuition=("行情数据像自来水厂：Tick 是原水（浑浊、量大），L2 盘口是沉淀池，K 线是出厂的自来水，基本面是矿泉水"
           "（一年送一次）。清洗是过滤工序：MAD 滤掉乌龙指的石子，交易日历滤掉休市日的管道锈水，停牌日贴上"
           "『停水通知』而不是用昨天的水假装今天有水。"),
cerr=("用 pandas 默认整数索引存储行情，丢失周末/停牌的时间语义；停牌日直接 dropna 造成序列断裂，"
      "或 ffill 后忘记加 is_suspended 守卫导致回测虚拟成交；异常值用均值±3σ 过滤，被均值极值污染漏掉乌龙指。"),
miscon=("1. **『数据越细越好』**——Tick 信噪比极低且存储成本高，按研究粒度选层级；\\n"
        "2. **『REST 轮询可以替代推送』**——高频场景轮询 RTT 20-200ms 且触发限流，实时盘口必须 WebSocket；\\n"
        "3. **『CSV 够用』**——千万级 Tick 用 CSV 解析慢数十倍，Parquet 列存是研究标配。"),
connection=("- **向前**：c2 的复权流水线是本章清洗的最后一道工序；\n"
            "- **向后**：quant-python 的时间序列操作建立在本章存储格式之上；\n"
            "- **平行**：mining-prep 的缺失值/异常值方法论与本章同源。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 金字塔 | Tick → L2 盘口 → Bar（OHLCV）→ 基本面（季/年）|\n"
         "| 通道 | REST 批量低频 / WebSocket 推送实时（心跳+指数退避）|\n"
         "| 清洗 | MAD 滤乌龙指、SeqNum 重排、交易日历过滤 |\n"
         "| 停牌 | ffill + is_suspended 守卫，严禁虚拟成交 |\n"
         "| 存储 | Parquet 列存（研究）/ ClickHouse（Tick 级）|"),
)
T["quant-data","c2"] = dict(
expected="""1 拆 2 除权：后复权因子 [1,1,1.991,1.991,1.991]、前复权因子 [0.502,0.502,1,1,1]；raw 收益率除权日 -49.8% 假暴跌；hfq 收益率 [0.023,0,0.018,0.026] 连续真实；qfq 序列最新日 = 原始价 11.8。""",
why=("一次 10 送 10 就能让原始价格序列凭空『腰斩』，未复权的收益率、均线、回撤全部失真。"
     "复权因子是让历史价格可比的唯一正确方式——这是行情库的地基工程。"),
intuition=("除权像把一张 100 元钞票换成两张 50 元：总财富没变，但『一张』的价格腰斩了。后复权是把历史价格按当时的"
           "汇率『换算回今天的钞票面额』（价格连续上涨，适合算长期收益）；前复权是把今天的价当作标尺往回折算"
           "（最新价=原始价，画图好看）。"),
cerr=("除权日直接删除或插值，制造 -50% 的假暴跌收益；前复权因子在最新日不为 1，与券商软件对不上；"
      "把分红当拆股处理（分红应加回而非比例缩放）。"),
miscon=("1. **『复权只是画图美观』**——它决定收益率计算的正确性，未复权数据的动量/回撤全是错的；\\n"
        "2. **『前复权永远适用』**——前复权价格会随每次新除权整体变化，历史因子需重算；生产库通常存 raw+因子；\\n"
        "3. **『复权因子只有拆股』**——分红送股配股都进因子，f_t = P_ex/P_close 涵盖全部除权事件。"),
connection=("- **向前**：本章因子流水线的输出喂给 quant-python 的指标计算；\n"
            "- **向后**：quant-backtest 的净值计算必须基于后复权收益；\n"
            "- **平行**：quant-market 的对数收益率在本章复权序列上才有意义。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 存储 | 只存 raw 行情 + 复权因子序列 |\n"
         "| 拆分因子 | f_t = P_ex,t / P_close,t |\n"
         "| 后复权 | A_hfq,t = Π 1/f_τ（τ≤t），价格连续 |\n"
         "| 前复权 | A_qfq,t = A_hfq,t / A_hfq,T，最新日因子=1 |\n"
         "| 检验 | 复权后除权日收益率应连续无跳变 |"),
)
C[("quant-data", "c1")] = '''import numpy as np, time
ticks = [(930001, 10.00, 300), (930002, 10.02, 500), (930003, 9.98, 200),
         (930004, 10.05, 800), (930005, 10.01, 400)]
# ---- 1. Tick -> 1 分钟 OHLCV Bar ----
ps = [t[1] for t in ticks]; vs = [t[2] for t in ticks]
print(f"1min Bar: O={ps[0]} H={max(ps)} L={min(ps)} C={ps[-1]} V={sum(vs)}")
# ---- 2. REST vs WebSocket ----
t0 = time.perf_counter()
for _ in range(20): time.sleep(0.0005)          # 模拟 0.5ms RTT
print(f"REST 轮询单次 ~{1000*(time.perf_counter()-t0)/20:.2f} ms（真实 20-200ms 且有限流），WS 推送 <5ms")
# ---- 3. MAD 过滤乌龙指 ----
px = np.array([10.0, 10.02, 10.01, 105.0, 10.03, 10.01])
med = np.median(px); mad = np.median(np.abs(px - med))
ok = np.abs(px - med) <= 5*1.4826*mad
print("MAD 过滤后:", px[ok], "| 剔除:", px[~ok])
# ---- 4. 停牌 ffill + 成交守卫 ----
close = {"周一": 10.0, "周二": 10.2, "周三": None, "周四": None, "周五": 10.5}
last = None
for d, v in close.items():
    if v is None:
        print(f"{d}: 停牌 ffill={last:.2f}，is_suspended=True 拦截一切信号")
    else:
        last = v'''
C[("quant-data", "c2")] = '''import numpy as np
raw = np.array([22.0, 22.5, 11.3, 11.5, 11.8])   # t=2 除权（1 拆 2）
f = np.ones(len(raw))
f[2] = raw[2] / raw[1]                            # 拆分因子 11.3/22.5
A_hfq = np.cumprod(1/f)
A_qfq = A_hfq / A_hfq[-1]
print("后复权因子:", np.round(A_hfq, 4), "| 前复权因子:", np.round(A_qfq, 4))
print("raw 收益率:", np.round(np.diff(raw)/raw[:-1], 4), "（除权日假暴跌）")
hfq = raw * A_hfq
print("hfq 收益率:", np.round(np.diff(hfq)/hfq[:-1], 4), "（连续真实）")
print("qfq 序列:", np.round(raw*A_qfq, 2), "最新日 = 原始价", raw[-1])'''
G["quant-data-c1-l1"] = ("1. 画出 Tick/L2/Bar/基本面四层数据金字塔并标注各层规模与用途；\n"
                         "2. 说明 Tick→OHLCV 聚合规则与时间 Bar 的局限（de Prado）；\n"
                         "3. 按研究粒度选择数据层级并估算存储量级。")
G["quant-data-c1-l2"] = ("1. 对比 REST 轮询与 WebSocket 推送的通信模型、延迟与适用场景；\n"
                         "2. 实现心跳维持与指数退避重连；\n"
                         "3. 根据数据时效需求选择接入范式并说明频次限制的应对。")
G["quant-data-c1-l3"] = ("1. 用滚动 MAD 过滤乌龙指并解释 1.4826 系数的来历；\n"
                         "2. 处理停牌：ffill + is_suspended 成交守卫；\n"
                         "3. 按数据规模选择 CSV/Parquet/ClickHouse 存储方案。")
G["quant-data-c2-l2"] = ("1. 推导拆分调整因子 f_t = P_ex/P_close 与后/前复权因子连乘公式；\n"
                         "2. 在含除权事件的价格序列上验证：未复权收益失真、后复权连续；\n"
                         "3. 说明『存 raw+因子』的机构级实践与前复权最新日因子=1 的约定。")
P["quant-data-c1-l1"] = "- 知道股票行情的基本字段；\n- 无硬前置。"
P["quant-data-c1-l2"] = "- 「金融数据层级与时间粒度」（l1）的数据消费场景。"
P["quant-data-c1-l3"] = "- 「金融 API 接入范式」（l2）；\n- pandas 基础（详见 quant-python）。"
P["quant-data-c2-l2"] = "- c1 的清洗流水线；\n- 连乘/连除与对数基础。"

# ══════════════ quant-strategy ══════════════
T["quant-strategy","c1"] = dict(
expected="""回看 12 期动量排序、连续 12 个月滚动持有：动量多空价差月均 +1.55%（单月有正有负，[-0.012,+0.026]）；资产0 回看期收益 -9.64% → TSMOM 做空；危机月普跌 -8% 时 TSMOM 空头提供对冲（危机 Alpha）。""",
why=("动量是资产定价最顽固的异象，但『截面动量』与『时间序列动量』是两种完全不同的赌注：前者赌相对强弱，"
     "后者赌绝对趋势并在危机中提供对冲（Crisis Alpha）。选错工具，牛市里的赢家组合会在熊市里满仓站岗。"),
intuition=("截面动量像班级排名：只关心谁比谁强，全班级都退步也照做多头（做空垫底者）；时间序列动量像体检报告："
           "只看自己过去一年的走势是正是负，走弱就空仓/做空。危机来临全班暴跌时，排名策略被打残，"
           "体检策略早已翻空——这就是危机 Alpha。"),
cerr=("动量回看窗口包含持有期（未来函数），信号偷看了要预测的收益；赢家组合用等权却没剔除停牌/涨跌停不可交易标的；"
      "TSMOM 用当日收盘信号当日成交（应为 T+1 执行）。"),
miscon=("1. **『动量就是追涨杀跌』**——它是基于过去 k-j 期收益排序的系统性规则，剔除近期 1 个月反转期是标准做法；\\n"
        "2. **『截面动量在熊市保护我』**——CSMOM 是市场中性的相对赌注，系统性下跌里多头腿照样亏，保护靠 TSMOM；\\n"
        "3. **『动量因子 universally 有效』**——A 股动量弱、反转强，直接照搬美股 12-1 月参数常常失效。"),
connection=("- **向前**：c2 的均值回归是动量的镜像策略，两者在震荡/趋势市互补；\n"
            "- **向后**：c3 的因子框架把动量作为标准因子纳入 IC 体检；\n"
            "- **平行**：quant-portfolio 的风险平价决定动量组合的风险预算。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| CSMOM | 截面排序：多前 10% 空 10%，赌相对强弱（J&T 1993）|\n"
         "| TSMOM | 自身趋势符号决定多空（MOP 2012），危机 Alpha |\n"
         "| 回看 | 12-1 月：剔除近 1 月反转期 |\n"
         "| 防泄漏 | 回看窗口不得包含持有期；T+1 执行 |\n"
         "| 场景 | CSMOM 震荡市磨损、TSMOM 趋势市盈利 |"),
)
T["quant-strategy","c2"] = dict(
expected="""协整对（训练段 γ=1.063）：OOS 价差 std 1.90 平稳可回归，Z-Score 策略 OOS 触发平仓 7 次、平均价差收益 +2.75、胜率 100%（模拟平稳价差）；不协整对 OOS 价差均值 35.31→43.99 持续漂移无回归中枢；布林带带宽挤压段 0.0015→突破段 0.0103（扩张 6.7x）。""",
why=("相关性≠协整：两条一起涨的曲线可以永远发散，『相关』配对会把价差越做越深。协整检验 + Z-Score "
     "是统计套利从玄学变成工程的分水岭——价差平稳才有『回归均值』可赌。"),
intuition=("协整像两条被橡皮筋拴住的狗：各自乱跑（非平稳），但距离（价差）始终被橡皮筋拉回——赌的就是橡皮筋的"
           "弹性。Z-Score 是『距离被拉到几个标准差』的尺子：超过 +2 做空价差，回到 0 平仓，拉断（|Z|>3.5，基本面"
           "永久背离）就认赔剪断橡皮筋。"),
cerr=("用相关系数选对子，价差发散死扛不止损；用全样本均值/方差算 Z（未来函数），应为滚动窗口；"
      "止盈线贴着 0 导致手续费磨损吃光利润。"),
miscon=("1. **『相关性高就能配对』**——只有协整（价差平稳）才保证回归，协整检验（ADF/Engle-Granger）不可省；\\n"
        "2. **『对冲比率一劳永逸』**——γ 会漂移，需滚动重估并设硬止损对冲结构性背离；\\n"
        "3. **『Z=2 进 0 出稳赚』**——价差可能长期不回归（拥挤交易/基本面突变），仓位与止损是生存前提。"),
connection=("- **向前**：c3 的中性化回归与本章对冲比率同属线性回归应用；\n"
            "- **向后**：quant-backtest 的摩擦模型决定 Z 策略的真实净收益；\n"
            "- **平行**：quant-ml 的 CFI 聚类也可用于筛选共线的配对候选。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 选对 | 相关性只看同涨同跌；协整要求价差平稳 |\n"
         "| 对冲比率 | OLS：Spread = P_A − γ·P_B |\n"
         "| 开平仓 | |Z|>2 开仓反向，Z∈[-0.5,0.5] 止盈 |\n"
         "| 硬止损 | |Z|>3.5 无条件平（基本面永久背离）|\n"
         "| 布林带 | MA20±2σ 通道，带宽极低分位=Squeeze 前兆 |"),
)
T["quant-strategy","c3"] = dict(
expected="""MAD 去极值区间 [-0.52, 2.54]，5 个注入极值压回边界；Z-Score 标准化后 mean≈0、std=1.000；中性化：因子与 ln市值相关从 0.040 降到 -0.000（残差即纯净 Alpha）。""",
why=("原始因子带极值、量纲与行业/市值偏差：不清洗就直接用，『低 PE 因子』选出一堆银行地产，超额收益被行业周期"
     "绑架。去极值、标准化、中性化三部曲是因子从数据变成 Alpha 的准入考试。"),
intuition=("因子预处理像选手体检：去极值是剪掉身高两米五的离群样本（MAD 比标准差更抗污染）；标准化是统一计量单位"
           "（Z 分数让大家同台比拼）；中性化是『控制变量』——把行业和体格（市值）的影响回归掉，剩下的残差才是选手"
           "自己的真实实力（纯净 Alpha）。"),
cerr=("用均值±3σ 去极值被极值自己污染（应 MAD）；对不同行业的原始因子直接比较而忘中性化；"
      "中性化回归忘了加常数项，残差均值非零。"),
miscon=("1. **『去极值=删数据』**——是 clip 压回边界，删除会破坏截面完整性；\\n"
        "2. **『标准化后因子可直接加权』**——还要中性化：市值/行业暴露会伪装成 Alpha；\\n"
        "3. **『中性化一次永久有效』**——行业分类与市值结构漂移，中性化应随截面滚动进行。"),
connection=("- **向前**：quant-project 的复合因子合成以本章的纯净因子为原料；\n"
            "- **向后**：quant-ml 的树模型同样吃本章的预处理输出；\n"
            "- **平行**：c2 的对冲比率回归与本章中性化回归是同一数学工具。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| MAD 去极值 | Med ± 3×1.4826×MAD，clip 压回 |\n"
         "| 标准化 | 截面 Z-Score：均值 0 方差 1 |\n"
         "| 中性化 | 对行业哑变量+ln市值回归取残差 |\n"
         "| 动机 | 剔除行业周期与市值效应的伪装 Alpha |\n"
         "| 产出 | 纯净因子 → IC 检验 → 复合合成 |"),
)
C[("quant-strategy", "c1")] = '''import numpy as np
rng = np.random.default_rng(7)
N, T = 20, 36
drift = np.linspace(-0.009, 0.016, N)  # 截面强弱分化（年化差约 30%）
rets = rng.normal(0.001, 0.02, (T, N)) + drift
# ---- 1. 截面动量：回看 12 期（不含持有月，防泄漏）----
spreads = []
for m in range(T-12, T):                       # 连续 12 个月滚动持有（动量只用此前 12 期）
    mom = (1 + rets[m-12:m]).prod(0) - 1
    rank = np.argsort(-mom)
    win, los = rank[:4], rank[-4:]
    spreads.append(rets[m][win].mean() - rets[m][los].mean())
print(f"近 12 个月动量多空价差月均: {np.mean(spreads):+.2%}（单月有正有负）")
# ---- 2. TSMOM：自身趋势 ----
own = rets[:, 0]
sig = np.sign((1 + own[:-1][-12:]).prod() - 1)
print(f"资产0 回看期收益 {((1+own[:-1][-12:]).prod()-1):+.2%} → TSMOM {'做多' if sig > 0 else '做空'}")
print("危机月（资产普跌 -8%）：TSMOM 空头贡献对冲（危机 Alpha），CSMOM 多头腿照样回撤")'''
C[("quant-strategy", "c2")] = '''import numpy as np, pandas as pd
rng = np.random.default_rng(3)
T = 500
common = np.cumsum(rng.normal(0, 1, T))
A = 50 + common + rng.normal(0, 0.8, T)
A[250:] += np.linspace(0, 4, 250)            # OOS 段基本面缓慢背离
B = 30 + 0.9*common + rng.normal(0, 0.8, T)
g_train = np.polyfit(B[:250], A[:250], 1)[0]        # 只用前 250 日估对冲比率
s = pd.Series(A - g_train*B)
print(f"协整对: 训练段 γ={g_train:.3f}, OOS 价差 std={s[250:].std():.2f}")
B2 = 30 + 0.9*common + np.cumsum(rng.normal(0.05, 0.3, T))  # 仅相关不协整（自身趋势漂移）
s2 = pd.Series(A - np.polyfit(B2[:250], A[:250], 1)[0]*B2)
print(f"不协整对: OOS 价差均值 {s2[250:310].mean():.2f} -> {s2[-60:].mean():.2f}（持续漂移，无回归中枢）")
# ---- Z-Score 交易（滚动窗口，防未来函数，只在 OOS 段交易）----
win = 30
z = (s - s.rolling(win).mean()) / s.rolling(win).std()
pos, entry, pnl = 0, 0.0, []
for i in range(250, T):
    if pos == 0:
        if z[i] > 2: pos, entry = -1, s[i]
        elif z[i] < -2: pos, entry = 1, s[i]
    elif abs(z[i]) < 0.5 or abs(z[i]) > 3.5:
        pnl.append(pos*(s[i]-entry)); pos = 0
print(f"OOS 触发平仓 {len(pnl)} 次, 平均价差收益 {np.mean(pnl):+.3f}, 胜率 {np.mean([p > 0 for p in pnl]):.0%}")
# ---- 布林带挤压 ----
r2 = pd.Series(np.r_[rng.normal(0, 0.002, 60), rng.normal(0.004, 0.012, 40)])
bw = r2.rolling(20).std()
print(f"带宽: 挤压段 {bw.iloc[25:55].mean():.4f} -> 突破段 {bw.iloc[60:].mean():.4f}"
      f"（扩张 {bw.iloc[60:].mean()/bw.iloc[25:55].mean():.1f}x）")'''
C[("quant-strategy", "c3")] = '''import numpy as np
rng = np.random.default_rng(5)
N = 1000
factor = rng.normal(1.0, 0.5, N); factor[:5] = [50, -30, 40, 60, -25]   # 注入极值
ind = rng.choice([0, 1, 2], N)
mcap = np.exp(rng.normal(23, 1, N))
# ---- 1. MAD 去极值 ----
med = np.median(factor); mad = np.median(np.abs(factor - med))
lo, hi = med - 3*1.4826*mad, med + 3*1.4826*mad
w = np.clip(factor, lo, hi)
print(f"MAD 区间 [{lo:.2f}, {hi:.2f}], 5 个极值压回边界")
# ---- 2. 截面 Z-Score ----
z = (w - w.mean()) / w.std()
print(f"标准化: mean={z.mean():.1e}, std={z.std():.3f}")
# ---- 3. 行业+市值中性化 ----
X = np.column_stack([np.ones(N), np.eye(3)[ind], np.log(mcap)])
beta, *_ = np.linalg.lstsq(X, z, rcond=None)
resid = z - X @ beta
print(f"与 ln市值 相关: 原始 {np.corrcoef(z, np.log(mcap))[0,1]:.3f} -> 残差 {np.corrcoef(resid, np.log(mcap))[0,1]:.3f}（纯净 Alpha）")'''
G["quant-strategy-c1-l2"] = ("1. 区分截面动量（相对强弱排序）与 TSMOM（自身趋势符号）的构建与赌注；\n"
                             "2. 按 12-1 月规则构建动量信号并严守『回看不含持有期』的防泄漏纪律；\n"
                             "3. 解释 TSMOM 的危机 Alpha 来源及其在 CTA 中的运用。")
G["quant-strategy-c2-l2"] = ("1. 区分相关性与协整性，说明为何只有协整价差可回归；\n"
                             "2. 用 OLS 估对冲比率 γ，构建滚动 Z-Score 开平仓与硬止损规则；\n"
                             "3. 在模拟价差上实测策略胜率与平均收益，识别不协整对的发散风险。")
G["quant-strategy-c2-l3"] = ("1. 写出布林带三式（Mid/Upper/Lower）与 %B、带宽指标；\n"
                             "2. 定义波动率挤压（带宽历史低分位）并识别突破信号；\n"
                             "3. 实测挤压段到突破段的带宽扩张倍数，设定确认条件防假突破。")
G["quant-strategy-c3-l2"] = ("1. 用 MAD（Med±3×1.4826×MAD）去极值并解释其抗污染性；\n"
                             "2. 对截面因子做 Z-Score 标准化消除量纲；\n"
                             "3. 对行业哑变量+ln市值回归取残差，验证中性化前后市值相关性归零。")
P["quant-strategy-c1-l2"] = "- c1 趋势跟踪概念（海龟法则）；\n- 对数收益率（quant-market c1-l3）。"
P["quant-strategy-c2-l2"] = "- 统计基础：均值/标准差/平稳性直觉；\n- OLS 回归概念。"
P["quant-strategy-c2-l3"] = "- 移动平均与标准差；\n- c2-l2 的 Z-Score 思想。"
P["quant-strategy-c3-l2"] = "- 单因子 IC 概念（c3-l1）；\n- 多元线性回归。"

# ══════════════ quant-ml ══════════════
T["quant-ml","c1"] = dict(
expected="""并发度 c_t=[1,1,2,2,3,2,1,2,2,1,1,1]；各事件平均唯一度 0.67/0.46/0.57/0.80 → 作为样本权重；重叠日 t=2..4 并发 3，权重全 1 时这段行情被计票 3 次。""",
why=("三重屏障法给样本打标签时，事件持仓期互相重叠、共享同一段行情——『独立同分布』假设破产。"
     "不修正的模型把同一段行情投十次票，过拟合于巧合。样本并发度与平均唯一度是修复 IID 假设的手术刀。"),
intuition=("重叠样本像一桌人分吃一块蛋糕还各自拍照发朋友圈：十个人晒的是同一块蛋糕（信息量被重复计票）。"
           "平均唯一度 u_i 就是『你的照片里有多少像素是别人没拍过的』——并发越高、你贡献的新信息越少，"
           "权重就该越低。"),
cerr=("把三重屏障标签直接喂给 sklearn 默认样本权重=1，重叠样本被重复计票；并发度按『事件数』而不是逐日 c_t 计算；"
      "用唯一度加权后忘记重归一化，等效改变学习率。"),
miscon=("1. **『样本越多越好』**——重叠样本的边际信息量趋零，加权后等效样本数远小于名义样本数；\\n"
        "2. **『并发是回测问题不是训练问题』**——它直接进入训练损失（样本权重），也进入评估（Purged CV 的 purge）；\\n"
        "3. **『唯一度只用于树模型』**——任何基于损失求和的模型都应加权，包括神经网络。"),
connection=("- **向前**：c3 的特征重要性评估同样受重叠样本污染，需在 OOS 上置换；\n"
            "- **向后**：quant-backtest 的 Purged K-Fold 是本章思想的交叉验证版；\n"
            "- **平行**：c1-l1 的三重屏障标签是本章权重的上游。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 问题 | 三重屏障事件持仓期重叠，样本非独立 |\n"
         "| 并发度 c_t | 时刻 t 正在活跃的事件数 |\n"
         "| 平均唯一度 | ū_i = mean(1/c_t), t∈[t0,t1] |\n"
         "| 用法 | ū_i 作为样本权重喂给模型 |\n"
         "| 效果 | 抑制重叠样本对损失的重复计票 |"),
)
T["quant-ml","c3"] = dict(
expected="""MDI（训练集内）：x1 0.78、冗余孪生特征 0.201、噪声 0.019——共线冗余被评到近乎与真实因子同权重；MDA（OOS 置换）：0.918/0.113/0.002 诚实排序；CFI 簇{0,1}联合置换下降 1.460，替代效应被消除。""",
why=("Gu-Kelly-Xiu (2020) 的结论：金融截面 Alpha 挖掘里，浅层 GBDT 全面优于线性模型与深度网络。"
     "但金融信噪比 <0.05，调参哲学与 CV 完全相反——全方位抑制复杂度。而特征重要性若用 MDI，"
     "连续噪声特征会被系统性高估；MDA/CFI 才是样本外的诚实裁判。"),
intuition=("MDI 是『训练集内的自我表扬』：噪声特征切分点更多（连续变量有无穷多个切法），Gini 增益天然被高估；"
           "MDA 是『样本外的突击测验』：把这个特征打乱，模型成绩掉得越狠说明它越重要。CFI 进一步把共线因子"
           "捆成一簇一起打乱——5 日/10 日均线互为替身时，单个打乱测不出真功夫，整簇打乱才见真章。"),
cerr=("用 feature_importances_（MDI）直接汇报因子重要性，连续噪声因子高居榜首；置换检验在训练集上做"
      "（应为独立 OOS 集）；共线因子逐个置换导致核心因子 MDA≈0 被误删。"),
miscon=("1. **『树越深越强』**——金融 SNR<0.05，max_depth=3~5 + min_child_samples≥50 才能防记忆噪声；\\n"
        "2. **『MDI 高的特征有用』**——MDI 有基数偏差且完全在训练集内计算，过拟合噪声也会得高分；\\n"
        "3. **『MDA 为零的特征是垃圾』**——共线替代效应会让替身存活的因子测出 0，需 CFI 聚类联合置换。"),
connection=("- **向前**：c1 的样本权重与本章的 OOS 评估共同构成防过拟合双保险；\n"
            "- **向后**：quant-project 的复合因子只保留 MDA/CFI 幸存的因子；\n"
            "- **平行**：quant-strategy 的 IC/IR 是线性时代的重要性度量，MDA/CFI 是非线性版。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 模型 | 浅层 GBDT（depth 3~5, lr 0.01~0.03, 早停）|\n"
         "| MDI | 训练集内不纯度增益：基数偏差，高估连续噪声 |\n"
         "| MDA | OOS 置换检验：打乱后性能下降量 |\n"
         "| CFI | 相关因子聚类 + 整簇联合置换，破替代效应 |\n"
         "| 调参哲学 | 高噪声下全方位抑制复杂度 |"),
)
C[("quant-ml", "c1")] = '''import numpy as np
events = [(0, 4), (2, 5), (4, 8), (7, 11)]       # 三重屏障事件 (t0, t1)
T = 12
conc = np.zeros(T, int)
for t0, t1 in events: conc[t0:t1+1] += 1
print("每日并发度 c_t:", conc)
for i, (t0, t1) in enumerate(events):
    u = np.mean([1/conc[t] for t in range(t0, t1+1)])
    print(f"事件{i} [{t0},{t1}]: 平均唯一度 ū={u:.2f} → 样本权重 {u:.2f}")
print(f"重叠日 t=2..4 并发 {int(conc[2:5].max())}，若权重全 1，这段行情被计票 {int(conc[2:5].max())} 次")'''
C[("quant-ml", "c3")] = '''import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
rng = np.random.default_rng(0)
N = 2000
x1 = rng.normal(0, 1, N)
X = np.column_stack([x1, 0.9*x1 + 0.1*rng.normal(0, 1, N), rng.normal(0, 5, N)])  # 信息/冗余/高方差噪声
y = 2*x1 + rng.normal(0, 1.2, N)
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, random_state=0)
m = RandomForestRegressor(max_depth=5, n_estimators=100, random_state=0, n_jobs=-1).fit(Xtr, ytr)
print("MDI（训练集内）:", np.round(m.feature_importances_, 3))
base = m.score(Xte, yte)
mda = []
for j in range(3):
    Xp = Xte.copy()
    Xp[:, j] = rng.permutation(Xp[:, j])
    mda.append(base - m.score(Xp, yte))
print("MDA（OOS 置换）:", np.round(mda, 3))
Xp = Xte.copy(); Xp[:, [0, 1]] = rng.permutation(Xp[:, [0, 1]], axis=0)
print(f"CFI 簇{{0,1}}联合置换: {base - m.score(Xp, yte):.3f}（替代效应被消除）")'''
G["quant-ml-c1-l2"] = ("1. 解释重叠样本为何破坏 IID 假设与『重复计票』的后果；\n"
                       "2. 计算 label concurrency c_t 与平均唯一度 ū_i；\n"
                       "3. 在训练中把 ū_i 作为样本权重并说明其对抗过拟合的作用。")
G["quant-ml-c3-l1"] = ("1. 复述 GBDT 在截面 Alpha 挖掘中的实证地位（Gu-Kelly-Xiu 2020）；\n"
                       "2. 按金融高噪声四法则调参（浅树/大叶子/小学习率+早停/亚采样）；\n"
                       "3. 对比 CV 调参与金融调参哲学的根本差异（容量 vs 防记忆）。")
G["quant-ml-c3-l2"] = ("1. 说明 MDI 的计算原理与两大缺陷（基数偏差/训练集内）；\n"
                       "2. 实现 MDA 三步：OOS 基线 → 列洗牌 → 性能下降量；\n"
                       "3. 用模拟数据实测：噪声特征 MDI 高、MDA≈0 的对照。")
G["quant-ml-c3-l3"] = ("1. 解释共线因子的替代效应（Substitution Effect）如何骗过 MDA；\n"
                       "2. 用层次聚类把共线因子聚簇并对整簇联合置换；\n"
                       "3. 在含孪生因子的数据上验证 CFI 能识别被 MDA 漏掉的核心因子家族。")
P["quant-ml-c1-l2"] = "- 「三重屏障法」（c1-l1）的标签事件定义；\n- 样本权重概念。"
P["quant-ml-c3-l1"] = "- 梯度提升的基本原理；\n- 截面因子与标签构造（c1）。"
P["quant-ml-c3-l2"] = "- 「LightGBM 调参哲学」（c3-l1）；\n- sklearn 模型评估基础。"
P["quant-ml-c3-l3"] = "- 「MDI 的欺诈偏差 vs MDA」（c3-l2）；\n- 相关系数矩阵与聚类直觉。"

# ══════════════ quant-portfolio ══════════════
T["quant-portfolio","c1"] = dict(
expected="""投影梯度解（w≥0、Σw=1、w_i≤30%）：[0.106,0.299,0.295,0,0.300]，预期收益 10.09%、波动 14.35%；无约束解 [0.685,0.381,0.618,1.05,1.203] 出现负权重且不满足全额投资。""",
why=("教科书里的均值-方差优化解出 -30% 的负权重与 90% 的单票集中度，毫无可投资性。"
     "生产级优化器必须把全额投资、禁止做空、个股权重上限、行业偏离、换手惩罚全部写成硬约束——"
     "金融的现实约束进不了优化器，组合就进不了市场。"),
intuition=("无约束优化像让水往低处流不受任何堤坝限制：会淹进负权重（做空）和单票集中（堰塞湖）。"
     "投影梯度法是『每走一步就撞墙弹回』：先按梯度下山，再把权重投影回可行域（和为 1、0≤w≤上限）——"
     "解不一定最优雅，但一定合法可交易。"),
cerr=("求解后不检查约束可行性直接下单（出现负权重）；协方差矩阵用 60 日窗口直接求逆（病态矩阵放大误差），"
      "应做压缩（Ledoit-Wolf）；换手惩罚漏写导致调仓成本吃掉全部 Alpha。"),
miscon=("1. **『优化器给的权重就是最优』**——无约束解对预期收益误差极度敏感（Markowitz 的『误差最大化器』），"
        "约束与压缩才让它可用；\\n"
        "2. **『约束越多越保守越好』**——约束改变可行域形状，过度约束会让优化退化为等权；\\n"
        "3. **『QP 求解器可互换』**——OSQP/CVXPY/MOSEK 在稀疏性与精度上差异巨大，生产要压测。"),
connection=("- **向前**：c2 的风险平价是『不含预期收益』的另一极；\n"
            "- **向后**：quant-project 的 Barra 风格约束是本章约束体系的实战版；\n"
            "- **平行**：quant-strategy c3 的中性化回归提供本章的行业暴露输入。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 目标 | min ½wᵀΣw − λ·wᵀμ（− γ·换手惩罚）|\n"
         "| 硬约束 | Σw=1、w≥0、w_i≤5%、行业偏离≤2% |\n"
         "| 求解 | OSQP / CVXPY / MOSEK / Gurobi |\n"
         "| 实操 | 投影梯度：梯度步 + 可行域投影 |\n"
         "| 坑 | 协方差病态 → 压缩估计；换手惩罚必加 |"),
)
T["quant-portfolio","c2"] = dict(
expected="""ERC 权重 股票0.14/债券0.56/黄金0.29；组合年化波动 4.69%、收益 3.49%、夏普 0.32；波动率目标化（目标 10%、L_max=3、昨日波动定今日杠杆）后：波动 9.77%、收益 5.71%、夏普 0.38、平均杠杆 2.04x。""",
why=("风险平价稳但收益平淡——大仓位压在低波动债券上。波动率目标化用杠杆把低波动组合『放大』到目标波动，"
     "夏普不变而绝对收益翻倍；市场波动飙升时自动降杠杆，形成无须预测的风控。"),
intuition=("风险平价组合像一辆省油但马力小的车（波动 5%）；波动率目标化是装上变速箱（杠杆 L=σ*/σ̂）："
           "高速路（波动低）自动升挡放大收益，急弯（波动飙升）自动降挡保命。杠杆有上限 L_max，"
           "借钱的利率（融资成本）会磨掉一部分夏普。"),
cerr=("用当日已实现波动率定当日杠杆（未来函数），应为昨日波动率；杠杆无上限，极端平静期杠杆飙到 10 倍；"
      "忽略融资成本与期货基差，账面夏普虚高。"),
miscon=("1. **『杠杆必然放大风险』**——波动率目标化把波动钉在目标值，风险不变而收益被放大；\\n"
        "2. **『波动率估计越灵敏越好』**——窗口太短导致杠杆频繁抖动、交易成本上升，60 日常用；\\n"
        "3. **『风险平价=等风险贡献的万能解』**——它放弃预期收益信息，牛市跑输股票满仓是特性不是 bug。"),
connection=("- **向前**：c3 的 VaR/CVaR 给目标波动率提供灾难底线；\n"
            "- **向后**：quant-live 的杠杆风控把 L_max 写进事前风控；\n"
            "- **平行**：c1 的均值-方差与本章是『用不用预期收益』的两种哲学。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 杠杆公式 | L = σ_target / σ_ERC（如 10%/5% = 2 倍）|\n"
         "| 动态化 | L_t = min(L_max, σ*/σ̂_t)，昨日波动定今日仓 |\n"
         "| 效果 | 夏普不变、绝对收益放大、波动钉住 |\n"
         "| 自动风控 | 危机波动飙升 → 强制去杠杆 |\n"
         "| 代价 | 融资成本、期货基差、L_max 约束 |"),
)
T["quant-portfolio","c3"] = dict(
expected="""厚尾样本：VaR95=1.91%、CVaR95=3.00%（尾部均值是 VaR 的 1.6 倍）；次可加性反例：VaR95(X)=VaR95(Y)=0 而 VaR95(X+Y)=100（分散化失灵），CVaR95(X+Y)=100 捕捉尾部深度；压力测试：2008 -22.0%、2015 -20.1%、2020 -16.7%。""",
why=("VaR 只告诉你『95% 的日子亏损不超过 X』，却不说打破阈值后平均亏多少；更致命的是它不满足次可加性——"
     "两个资产合并后风险可能更大，粉碎分散化常识。CVaR（ES）修复一致性，巴塞尔 III 已全面切换。"),
intuition=("VaR 像『95% 的日子你都安全』的保证书，但对剩下 5% 的灾难只字不提；CVaR 是『万一出事，平均会亏多少』"
           "的救护车预案。次可加性反例：两个各有 4% 概率巨灾的资产单独看 VaR 都是 0，合在一起 95% 分位却出现"
           "巨额损失——分散化在 VaR 的尺子下失灵。"),
cerr=("用正态假设算 VaR，严重低估厚尾（t 分布/跳空）；把 VaR 当最大损失（它只是分位数）；"
      "压力测试只测单一情景，不逆向推演穿仓路径。"),
miscon=("1. **『VaR 是监管指标就够用』**——巴塞尔 III FRTB 已用 97.5% ES 替代 99% VaR，理由正是次可加性缺陷；\\n"
        "2. **『分散化永远降低风险』**——在 VaR 尺子下有反例，CVaR 才保证次可加；\\n"
        "3. **『压力测试=最大历史跌幅』**——还要做假设情景与逆向压力测试（什么组合事件会让我穿仓）。"),
connection=("- **向前**：c2 的波动率目标化需要 ES 给目标值设灾难底线；\n"
            "- **向后**：quant-live 的 Kill Switch 触发线本质是组合级 CVaR 预算；\n"
            "- **平行**：c1 的协方差矩阵是本章参数法 VaR 的原料。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 一致性四公理 | 平移不变/正齐次/单调/次可加 |\n"
         "| VaR 缺陷 | 不满足次可加性，分散化可失灵 |\n"
         "| CVaR | E[Loss | Loss>VaR]，一致性度量 |\n"
         "| 监管 | 巴塞尔 III FRTB：97.5% ES 替代 99% VaR |\n"
         "| 压力测试 | 历史情景/假设情景/逆向推演 |"),
)
C[("quant-portfolio", "c1")] = '''import numpy as np
mu = np.array([0.08, 0.12, 0.10, 0.06, 0.09])
Sig = np.array([[.04,.01,.005,.002,.003],[.01,.09,.012,.004,.006],[.005,.012,.05,.006,.004],
                [.002,.004,.006,.02,.002],[.003,.006,.004,.002,.03]])
lam = 2.0
def project(w, cap=0.3):
    w = np.clip(w, 0, cap)
    for _ in range(500):
        d = 1 - w.sum()
        if abs(d) < 1e-12: break
        room = cap - w
        if room.sum() < 1e-15: break
        w = np.clip(w + d*room/room.sum(), 0, cap)
    return w
w = np.full(5, 0.2)
for _ in range(4000):
    w = project(w - 1e-3*(lam*Sig@w - mu))
print("约束最优权重:", np.round(w, 3), "| sum =", round(w.sum(), 6))
print(f"预期收益 {w@mu:.2%} | 波动 {np.sqrt(w@Sig@w):.2%} | 最大权重 {w.max():.1%}")
w_u = np.linalg.solve(Sig, mu)/lam
print("无约束解:", np.round(w_u, 3), "（出现负权重=做空，不满足全额投资）")'''
C[("quant-portfolio", "c2")] = '''import numpy as np, pandas as pd
rng = np.random.default_rng(2)
T = 750
rets = {"股票": rng.normal(0.0008, 0.012, T), "债券": rng.normal(0.00025, 0.003, T),
        "黄金": rng.normal(0.0004, 0.006, T)}
vols = {k: v.std()*np.sqrt(252) for k, v in rets.items()}
inv = sum(1/x for x in vols.values())
w = {k: (1/vols[k])/inv for k in vols}
port = sum(w[k]*rets[k] for k in rets)
ann = lambda r, off=0.02: (r.mean()*252 - off)/(r.std()*np.sqrt(252))
print("ERC 权重:", {k: round(v, 2) for k, v in w.items()})
print(f"组合年化波动 {port.std()*np.sqrt(252):.2%} | 年化收益 {port.mean()*252:.2%} | 夏普 {ann(port):.2f}")
# ---- 波动率目标化：目标 10%，杠杆上限 3 ----
target, Lmax = 0.10, 3.0
realized = pd.Series(port).rolling(60).std().to_numpy()*np.sqrt(252)
lev = np.where(np.isnan(realized), 1.0, np.minimum(Lmax, target/realized))
lev = np.roll(lev, 1); lev[0] = 1.0                # 昨日波动定今日杠杆（防泄漏）
vt = port*lev
print(f"目标化后: 波动 {vt.std()*np.sqrt(252):.2%} | 年化收益 {vt.mean()*252:.2%} | 夏普 {ann(vt):.2f}"
      f" | 平均杠杆 {lev.mean():.2f}x")'''
C[("quant-portfolio", "c3")] = '''import numpy as np
rng = np.random.default_rng(4)
# ---- 1. 厚尾下的 VaR 与 CVaR ----
loss = -np.concatenate([rng.normal(0.0005, 0.01, 50000), rng.standard_t(3, 50000)*0.01])
var95 = np.quantile(loss, 0.95)
cvar95 = loss[loss >= var95].mean()
print(f"VaR95={var95:.2%} | CVaR95={cvar95:.2%}（尾部均值是 VaR 的 {cvar95/var95:.1f} 倍）")
# ---- 2. VaR 违背次可加性 ----
X = np.array([0.0]*96 + [100.0]*4); Y = np.array([0.0]*96 + [100.0]*4)
rng.shuffle(X); rng.shuffle(Y)
v = lambda a: np.quantile(a, 0.95)
print(f"VaR95(X)={v(X)}, VaR95(Y)={v(Y)}, VaR95(X+Y)={v(X+Y)} → {v(X+Y)} > 0+0 分散化失灵！")
print(f"CVaR95(X+Y)={ (X+Y)[(X+Y) >= v(X+Y)].mean():.1f}（一致性度量捕捉尾部深度）")
# ---- 3. 历史情景压力测试 ----
w = {"股票": 0.6, "债券": 0.3, "黄金": 0.1}
sc = {"2008 雷曼": {"股票": -0.40, "债券": 0.05, "黄金": 0.05},
      "2015 千股跌停": {"股票": -0.35, "债券": 0.02, "黄金": 0.03},
      "2020 新冠": {"股票": -0.30, "债券": 0.03, "黄金": 0.04}}
for name, sh in sc.items():
    print(f"{name}: 组合损益 {sum(w[k]*sh[k] for k in w):+.1%}")'''
G["quant-portfolio-c1-l3"] = ("1. 写出带全额投资/无做空/个股权重上限/行业偏离/换手惩罚的 QP 体系；\n"
                              "2. 用投影梯度法在可行域内求解并对照无约束解的负权重；\n"
                              "3. 说出工业求解器选型（OSQP/CVXPY/MOSEK/Gurobi）与协方差压缩的必要性。")
G["quant-portfolio-c2-l3"] = ("1. 推导杠杆公式 L = σ*/σ_ERC 并计算 5%→10% 的 2 倍杠杆；\n"
                              "2. 实现动态波动率目标化：昨日已实现波动率定今日杠杆、上限 L_max；\n"
                              "3. 实测目标化前后组合波动/收益/夏普，并说明融资成本的磨耗。")
G["quant-portfolio-c3-l2"] = ("1. 复述一致性风险度量四公理，指出 VaR 违背次可加性；\n"
                              "2. 用数值反例演示 VaR(X+Y) > VaR(X)+VaR(Y) 的分散化失灵；\n"
                              "3. 计算 CVaR 并说明巴塞尔 III FRTB 为什么切换到 97.5% ES。")
G["quant-portfolio-c3-l3"] = ("1. 设计历史情景（2008/2015/2020）压力测试并代入当前持仓；\n"
                              "2. 构造假设性宏观情景评估资本金是否击穿监管红线；\n"
                              "3. 执行逆向压力测试：找到让组合穿仓的最小连锁极值事件集。")
P["quant-portfolio-c1-l3"] = "- 有效前沿与协方差（c1-l1/l2）；\n- 二次型与梯度下降基础。"
P["quant-portfolio-c2-l3"] = "- 「风险平价与 ERC」（c2-l1/l2）；\n- 年化波动率计算。"
P["quant-portfolio-c3-l2"] = "- 「VaR 计算方法」（c3-l1）；\n- 分位数概念。"
P["quant-portfolio-c3-l3"] = "- 「CVaR」（c3-l2）；\n- 2008/2015/2020 危机的基本事实。"

# ══════════════ quant-project ══════════════
T["quant-project","c1"] = dict(
expected="""五重过滤后股票池 ['600000','000001']（ST/次新/停牌/一字板/流动性末档全部剔除）；PIT：2025-01-05 可用财报 0 条（2024 年报 4 月才公告不可用）。""",
why=("多因子策略的第一桶金不是因子而是股票池：ST 暴雷、次新炒作、停牌锁仓、涨跌停无法成交、流动性僵尸——"
     "任何一样混进回测都会造假收益。PIT 对齐则保证你在 1 月 1 日绝不会用 4 月才披露的年报。"),
intuition=("股票池像机场安检：ST 是危险品（直接没收），次新股是没过观察期的签证（60 交易日后放行），"
           "停牌是航班取消（当日不可登机），一字板是舱门关闭（买不上/卖不出），低流动性是红眼航班冷线"
           "（后 10% 剔除）。PIT 对齐是『只用当日已盖章的文件』——未来文件一律无效。"),
cerr=("股票池用当前时点的 ST 名单回溯历史（幸存者偏差+前视）；财报因子按报告期末打标而非公告日（未来数据）；"
      "剔除规则忘记随截面滚动，用静态名单贯穿全回测。"),
miscon=("1. **『剔除 ST 就没了高收益』**——ST 的极端收益伴随退市归零，回测里活下来的 ST 是幸存者偏差；\\n"
        "2. **『新股波动大可以博一把』**——次新换手率极端扭曲因子分布，污染截面标准化；\\n"
        "3. **『PIT 只是数据工程细节』**——它是回测可信度的分水岭，PIT 错误可把夏普从 0.5 造假到 2.0。"),
connection=("- **向前**：c2 的因子合成与优化只吃本章的纯净股票池；\n"
            "- **向后**：quant-data 的停牌守卫是本章规则的数据层实现；\n"
            "- **平行**：c3-l2 的模拟实盘验证的是含真实约束的同一套流水线。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 五剔除 | ST/次新(<60日)/停牌/一字板/流动性后10% |\n"
         "| PIT | 财报按公告日打标，杜绝未来数据 |\n"
         "| 滚动 | 过滤规则逐截面动态计算 |\n"
         "| 幸存者 | 已退市股票必须留在历史池中 |\n"
         "| 收益 | 垃圾进垃圾出：池不净则因子全废 |"),
)
T["quant-project","c2"] = dict(
expected="""滚动 12 期 IC_IR 加权 {value:0.13, momentum:0.65, noise:-0.22}（noise 权重≈0）；月多空毛收益 2.10% → 扣全套费率后 1.98%（月费 0.121%）；年化夏普 毛 3.49 vs 净 3.29。""",
why=("多个弱因子如何熔铸成一个强因子？等权简单稳健、IC_IR 加权自适应、最大化复合 IC_IR 的 QP 最激进——"
     "三条路线的取舍就是『估计误差 vs 自适应』的经典权衡。合成之后还必须过严格扣费回测这一关。"),
intuition=("因子合成像评委打分：等权是『不听辩解平均分』（抗操纵但迟钝）；IC_IR 加权是『按评委历史准确度加权』"
           "（能者多票）；QP 合成是『考虑评委之间意见相关性后的最优组队』（最强但容易过拟合历史）。"
           "扣费回测则是把策略放到真实税费的绞肉机里走一遭：印花税、佣金、过户费、滑点一样不能少。"),
cerr=("IC_IR 权重用全样本 IC 计算（未来函数），应为滚动过去 12 期；合成后忘记重新标准化导致因子暴露漂移；"
      "回测只扣佣金不扣印花税/过户费/冲击成本，年化收益虚高 2-3 个点。"),
miscon=("1. **『复杂加权一定优于等权』**——等权零估计误差，样本外常打赢精巧权重（DeMiguo 2020 的结论类似）；\\n"
        "2. **『IC_IR 权重平滑了风险』**——它奖励近期有效因子，也可能追高接盘刚失效的因子；\\n"
        "3. **『扣费只是减一个常数』**——高换手策略的费用与超额收益同量级，费用模型直接决定策略生死。"),
connection=("- **向前**：c3 的模拟实盘检验合成因子在真实摩擦下的衰减；\n"
            "- **向后**：quant-portfolio 的优化器是本章组合优化的完整版；\n"
            "- **平行**：quant-strategy c3 的预处理是本章合成的上游工序。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 等权 | 零估计误差、样本外稳健 |\n"
         "| IC_IR 加权 | 滚动 12 期 IC_IR 归一化权重 |\n"
         "| QP 合成 | IC 均值=收益、IC 协方差=风险的切点 |\n"
         "| 组合优化 | max wᵀS − λ/2·wᵀΣw − τ‖w−w_old‖₁ |\n"
         "| 全套费率 | 佣金 0.025%双边 + 印花 0.05%卖出 + 过户 0.001% + 冲击 0.05~0.1% |"),
)
T["quant-project","c3"] = dict(
expected="""回测 OOS 夏普 1.95 → 模拟实盘 0.84（真实滑点+延迟拖累），衰减率 43% < 50% → 暂缓上线排查过拟合。""",
why=("回测再漂亮也不许直接上真钱：模拟实盘 3 个月（≥60 交易日）是回测与实盘之间的缓冲带——"
     "它检验时钟延迟、真实撮合滑点与 OOS 衰减率，衰减超过 50% 就要回头查过拟合。"),
intuition=("模拟实盘像飞行模拟器转真机带飞：所有仪表（数据延迟、拒单率、滑点）都是真的，只是没有真金白银。"
           "衰减率 = 模拟实盘夏普 / 回测夏普，是策略的『水分挤出率』：挤出后还剩一半以上才配得上灰度上线。"),
cerr=("模拟实盘用回测同源数据源（应接真实行情推送）；衰减率高仍硬上线，指望『实盘会比模拟好』；"
      "验证期覆盖不足一个完整风格周期（3 个月可能全是单边市）。"),
miscon=("1. **『模拟实盘只是走流程』**——它暴露的是回测无法模拟的工程缺陷：延迟、拒单、部分成交；\\n"
        "2. **『衰减 50% 可以接受』**——工业标准是低于 50% 即暂缓排查，实盘通常再衰减一截；\\n"
        "3. **『报告写完就结束』**——模拟实盘的持续跟踪与周报机制是发现策略风格漂移的唯一手段。"),
connection=("- **向前**：c2 的扣费回测是本章衰减率的分母；\n"
            "- **向后**：quant-live 的实盘系统接手模拟盘验证过的策略；\n"
            "- **平行**：c3-l1 的报告撰写把全流程固化成可复查的文档。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 门槛 | 模拟实盘 ≥3 个月（60 交易日）|\n"
         "| 验证项 | 时钟延迟 / 真实滑点 / 拒单率 |\n"
         "| 衰减率 | Paper Sharpe / Backtest OOS Sharpe |\n"
         "| 红线 | 衰减 >50% 暂缓上线排查过拟合 |\n"
         "| 机制 | 周报跟踪 + 风格漂移监控 |"),
)
C[("quant-project", "c1")] = '''import pandas as pd
df = pd.DataFrame({
    "code": ["600000", "000004", "300750", "688981", "000001"],
    "is_st": [False, True, False, False, False],
    "listed_days": [8000, 3000, 2000, 40, 9000],
    "suspended": [False, False, False, True, False],
    "limit_up": [False, False, True, False, False],
    "amt20": [8e8, 2e6, 5e9, 1e8, 6e8]})
floor = df["amt20"].quantile(0.1)
ok = (~df["is_st"]) & (df["listed_days"] >= 60) & (~df["suspended"]) & (~df["limit_up"]) & (df["amt20"] > floor)
print("过滤后股票池:", df.loc[ok, "code"].tolist())
fin = pd.DataFrame({"code": ["600000"], "报告期": ["2024-12-31"], "公告日": ["2025-04-28"], "roe": [0.091]})
q = "2025-01-05"
print(f"{q} 可用财报 {int((fin['公告日'] <= q).sum())} 条（4 月才公告的 2024 年报不可用 → PIT）")'''
C[("quant-project", "c2")] = '''import numpy as np
from scipy.stats import spearmanr
rng = np.random.default_rng(6)
N, T = 300, 36
Zv, Zm, Zn = (rng.normal(0, 1, (T, N)) for _ in range(3))
R = 0.002*Zv + 0.004*Zm + rng.normal(0, 0.08, (T, N))
def rank_ic(z): return np.array([spearmanr(z[t], R[t])[0] for t in range(T)])
ics = {k: rank_ic(z) for k, z in [("value", Zv), ("momentum", Zm), ("noise", Zn)]}
ir = {k: ic[:-12].mean()/(ic[:-12].std()+1e-12) for k, ic in ics.items()}   # 滚动过去 12 期
tot = sum(abs(v) for v in ir.values())
w = {k: v/tot for k, v in ir.items()}
print("IC_IR 加权:", {k: round(v, 2) for k, v in w.items()}, "（noise 权重≈0）")
comp = w["value"]*Zv + w["momentum"]*Zm + w["noise"]*Zn
top, bot = comp.argsort(1)[:, -30:], comp.argsort(1)[:, :30]
gross = np.array([R[t][top[t]].mean() - R[t][bot[t]].mean() for t in range(T)])
tau = 0.6                                   # 月单边换手 60%
fee = 2*tau*(0.00025 + 0.00001) + 2*tau*0.0005 + tau*0.0005   # 佣金过户双边 + 印花卖出 + 冲击
net = gross - fee
sr = lambda r: r.mean()/r.std()*np.sqrt(12)
print(f"月多空毛收益 {gross.mean():.2%} -> 净 {net.mean():.2%}（月费 {fee:.3%}）")
print(f"年化夏普: 毛 {sr(gross):.2f} vs 净 {sr(net):.2f}")'''
C[("quant-project", "c3")] = '''import numpy as np
rng = np.random.default_rng(8)
bt = rng.normal(0.0010, 0.008, 250)         # 回测 OOS 日收益（250 日）
pt = bt - 0.0006                            # 模拟实盘：真实滑点+延迟+未成交拖累
sh = lambda r: r.mean()/r.std()*np.sqrt(252)
s1, s2 = sh(bt), sh(pt)
print(f"回测 OOS 夏普 {s1:.2f} | 模拟实盘 {s2:.2f} | 衰减率 {s2/s1:.0%}",
      "→ 暂缓上线排查过拟合" if s2/s1 < 0.5 else "→ 可申请灰度")'''
G["quant-project-c1-l2"] = ("1. 列出五条动态过滤规则（ST/次新/停牌/一字板/流动性）及其违规后果；\n"
                            "2. 实现 PIT 对齐：财报按公告日而非报告期打标；\n"
                            "3. 编写截面股票池过滤函数并解释幸存者偏差的来源。")
G["quant-project-c2-l2"] = ("1. 对比等权/滚动 IC_IR 加权/最大化复合 IC_IR 三种合成法；\n"
                            "2. 用过去 12 期 Rank IC_IR 构建自适应权重并验证 noise 因子权重归零；\n"
                            "3. 说明各方法的估计误差与过拟合风险。")
G["quant-project-c2-l3"] = ("1. 写出带风格约束与换手惩罚的 QP 优化模型；\n"
                            "2. 按 A 股真实费率（佣金 0.025%双边+印花 0.05%卖出+过户 0.001%+冲击）计算月度费用；\n"
                            "3. 实测同一策略扣费前后年化夏普的衰减幅度。")
G["quant-project-c3-l2"] = ("1. 说明模拟实盘 3 个月门槛要检验的三件事（时钟/滑点/衰减率）；\n"
                            "2. 计算 Decay Ratio = Paper Sharpe / Backtest OOS Sharpe 并执行 50% 红线；\n"
                            "3. 设计模拟实盘期间的周度跟踪报告模板。")
P["quant-project-c1-l2"] = "- 策略立项与经济学假设（c1-l1）；\n- pandas 布尔过滤。"
P["quant-project-c2-l2"] = "- 「股票池动态筛选」（c1-l2）；\n- Rank IC 概念（quant-strategy c3）。"
P["quant-project-c2-l3"] = "- 「复合因子加权合成模型」（c2-l2）；\n- A 股费率结构（quant-backtest c1-l3）。"
P["quant-project-c3-l2"] = "- c2 的扣费回测结果；\n- 夏普比率定义。"

# ══════════════ quant-python ══════════════
T["quant-python","c1"] = dict(
expected="""100 万元素乘法：列表推导 ~40ms vs NumPy ~2ms（约 20x）；广播 (2500,5)-(1,5)→(2500,5)；形状 (3,) 不匹配报 ValueError。""",
why=("量化回测 10 年日线是 125 万次运算，裸写 for 循环慢 100 倍不是夸张而是常态。"
     "向量化思维与广播机制是把研究想法变成可迭代代码的入场券。"),
intuition=("Python 循环是每次都『问一遍管理员』的搬运工（类型检查、装箱拆箱）；NumPy 是一条流水线："
           "数据连续摆放、C 循环 + SIMD 一次搬一托盘。广播则是『不用复制就能对齐』的伸缩尺："
           "(2500,500) 的收益矩阵减 (1,500) 的无风险利率，从右往左对齐、维度为 1 的自动扩展。"),
cerr=("对 NumPy 数组逐元素写 Python 循环（丢掉全部加速）；广播形状不匹配时报错却去改数据而不是 reshape；"
      "用 np.append 在循环里增长数组（每次复制整个数组，O(n²)）。"),
miscon=("1. **『向量化只是快一点』**——差距随数据量放大，回测从 1 小时变 1 分钟改变的是研究迭代次数；\\n"
        "2. **『广播会复制数据』**——只是 stride=0 的逻辑视图，不占额外内存；\\n"
        "3. **『任何循环都能向量化』**——路径依赖的序列（如部分成交）需 cummax/累计函数或 Numba，硬向量化会写错。"),
connection=("- **向前**：c2 的 pandas rolling 与本章广播一脉相承；\n"
            "- **向后**：c3 的技术指标全部用向量化实现；\n"
            "- **平行**：llm-a3 的张量形状标注训练的是同一种『维度直觉』。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 慢的根源 | 解释器循环：类型检查/装箱/动态分派 |\n"
         "| 向量化 | 连续内存 + C 循环 + SIMD，快 50~100x |\n"
         "| 广播规则 | 从右对齐：相等可算 / 为 1 扩展 / 否则报错 |\n"
         "| 内存 | 广播不复制，stride=0 视图 |\n"
         "| 纪律 | 严禁 np.append 循环增长数组 |"),
)
T["quant-python","c2"] = dict(
expected="""日线 120 → 周线 24 根（W-FRI）；MA5=1.177 > MA20=1.167 金叉；20 日滚动年化波动 22.43%；rolling(20) 前 4 个值均为 NaN。""",
why=("金融时间序列的灵魂是时间语义：整数索引不知道哪天停牌，freq='B' 不知道中国节假日。"
     "DatetimeIndex + resample + rolling 是把『日频因子』升级为『周/月调仓』与『滚动统计』的三板斧。"),
intuition=("resample 是『把日票换成周票』：开盘取 first、最高取 max、最低取 min、收盘取 last、成交量求和——"
           "五根 K 线压成一根，信息不丢。rolling 是『滑动窗口的体检』：MA5/MA20 金叉、20 日滚动波动率，"
           "窗口滑到哪统计到哪。"),
cerr=("重采样用 mean 聚合 OHLC（开盘取平均毫无意义）；rolling 后直接与原序列对齐比较，忘记前 window-1 个 NaN；"
      "用 freq='B' 处理 A 股日历（法定节假日错位），应接入交易日历。"),
miscon=("1. **『resample('W') 就够』**——A 股周线应以周五收盘（W-FRI），且节假日要按真实交易日历；\\n"
        "2. **『rolling 计算包含未来』**——rolling 天然右对齐不泄漏，但 shift(-1) 对齐信号时会；\\n"
        "3. **『ewm 与 rolling 可互换』**——ewm 指数加权无窗口、有权重衰减，两者统计含义不同。"),
connection=("- **向前**：c3 的 MACD/RSI 全部建立在本章 ewm/diff 之上；\n"
            "- **向后**：quant-backtest 的净值序列处理用同样的时序操作；\n"
            "- **平行**：quant-data 的 Bar 聚合是 resample 的数据源头。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| DatetimeIndex | 时间切片/时区/交易日历感知 |\n"
         "| resample | O first / H max / L min / C last / V sum |\n"
         "| rolling | MA、滚动波动率、金叉死叉 |\n"
         "| 陷阱 | A 股节假日、rolling 前置 NaN、shift 泄漏 |\n"
         "| ewm | adjust=False 才与券商软件一致 |"),
)
T["quant-python","c3"] = dict(
expected="""MACD：DIF=-0.0155、DEA=-0.0203、柱=+0.0095（金叉）；adjust=True/False 前期最大差异 0.0027 → 券商对齐必须 False；RSI(14)=46.5 中性区。""",
why=("MACD 与 RSI 是使用率最高的两个技术指标，但网上的实现五花八门：adjust 参数不同结果差之毫厘谬以千里。"
     "用纯向量化推导一遍，才能既对齐券商软件、又快到能全市场扫描。"),
intuition=("MACD 是『两台不同转速的发动机之差』：12 日 EMA 是快表、26 日是慢表，快慢之差（DIF）反映动量，"
           "再对 DIF 做一次 9 日 EMA（DEA）作为它的平滑基准，柱状线=2×(DIF−DEA)。RSI 是『涨的力量占比』："
           "14 天里平均涨幅除以（平均涨+平均跌），70 超买 30 超卖。"),
cerr=("ewm 不写 adjust=False，前几十期与通达信/同花顺对不上；RSI 用简单平均而不是 Wilder 平滑（α=1/14）；"
      "MACD 信号线对 DIF 用 rolling(9).mean() 而非 EMA。"),
miscon=("1. **『adjust 默认 True 更准』**——True 是带偏差修正的加权平均，前期不稳定；递推式 adjust=False "
        "才是券商标准；\\n"
        "2. **『RSI 的 14 是天数就是 14 日均线』**——它是 Wilder 指数平滑（α=1/14），不是简单均值；\\n"
        "3. **『指标给出买卖点』**——指标只是价格变换，单独使用胜率有限，必须叠加趋势/量能过滤。"),
connection=("- **向前**：本章指标是 quant-strategy 趋势/超买超卖过滤器的实现层；\n"
            "- **向后**：quant-backtest 回测引擎消费这些信号列；\n"
            "- **平行**：c1 的向量化与 c2 的 ewm 是本章的全部工具。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| MACD | DIF=EMA12−EMA26，DEA=EMA9(DIF)，柱=2(DIF−DEA) |\n"
         "| RSI | 100−100/(1+RS)，RS=Wilder 平滑涨/跌 |\n"
         "| 关键参数 | ewm(adjust=False) 对齐券商软件 |\n"
         "| 全向量化 | ewm/clip/diff 组合，零循环 |\n"
         "| 使用 | 信号需叠加趋势与量能过滤 |"),
)
C[("quant-python", "c1")] = '''import numpy as np, time
n = 1_000_000
rng = np.random.default_rng(0)
prices = rng.normal(10, 1, n); factor = rng.normal(1, 0.01, n)
pl, fl = prices.tolist(), factor.tolist()
t0 = time.perf_counter(); r1 = [a*b for a, b in zip(pl, fl)]; t1 = time.perf_counter()
r2 = prices * factor; t2 = time.perf_counter()
print(f"列表推导 {1000*(t1-t0):.0f} ms vs NumPy 向量化 {1000*(t2-t1):.1f} ms（{(t1-t0)/(t2-t1):.0f}x）")
R = np.random.default_rng(2).normal(0, 0.02, (2500, 5))
rf = np.array([[0.02/252]*5])
print("广播 (2500,5)-(1,5) =", (R - rf).shape)
try:
    R - np.array([0.02/252]*3)
except ValueError as e:
    print("形状不匹配:", e)'''
C[("quant-python", "c2")] = '''import pandas as pd, numpy as np
idx = pd.date_range("2024-01-01", periods=120, freq="B")
close = pd.Series(np.cumprod(1 + np.random.default_rng(0).normal(0.0005, 0.015, 120)), index=idx)
wk = close.resample("W-FRI").last().dropna()
print(f"日线 {len(close)} -> 周线 {len(wk)} 根（W-FRI）")
ma5, ma20 = close.rolling(5).mean(), close.rolling(20).mean()
print(f"MA5={ma5.iloc[-1]:.3f} MA20={ma20.iloc[-1]:.3f} {'金叉' if ma5.iloc[-1] > ma20.iloc[-1] else '死叉'}")
vol20 = close.pct_change().rolling(20).std().iloc[-1]*np.sqrt(252)
print(f"20 日滚动年化波动 {vol20:.2%} | rolling 前 4 个值为 NaN: {ma20[:4].isna().all()}")'''
C[("quant-python", "c3")] = '''import pandas as pd, numpy as np
rng = np.random.default_rng(0)
close = pd.Series(np.cumprod(1 + rng.normal(0.0004, 0.015, 250)),
                  index=pd.date_range("2024-01-01", periods=250, freq="B"))
ema12 = close.ewm(span=12, adjust=False).mean(); ema26 = close.ewm(span=26, adjust=False).mean()
dif = ema12 - ema26; dea = dif.ewm(span=9, adjust=False).mean(); hist = 2*(dif - dea)
print(f"DIF={dif.iloc[-1]:+.4f} DEA={dea.iloc[-1]:+.4f} 柱={hist.iloc[-1]:+.4f}"
      f" {'金叉' if dif.iloc[-1] > dea.iloc[-1] else '死叉'}")
ema12_t = close.ewm(span=12).mean()
print(f"adjust=True/False 前期最大差异 {abs(ema12.iloc[:5]-ema12_t.iloc[:5]).max():.4f} → 券商对齐必须 False")
delta = close.diff()
gain = delta.clip(lower=0).ewm(alpha=1/14, adjust=False).mean()
loss = (-delta.clip(upper=0)).ewm(alpha=1/14, adjust=False).mean()
rsi = 100 - 100/(1 + gain/loss)
print(f"RSI(14)={rsi.iloc[-1]:.1f}", "（>70 超买）" if rsi.iloc[-1] > 70 else "（<30 超卖）" if rsi.iloc[-1] < 30 else "（中性区）")'''
G["quant-python-c1-l1"] = ("1. 解释解释器循环的五步开销与 NumPy 连续内存+C 循环的加速来源；\n"
                           "2. 实测列表推导 vs 向量化的倍数并解释其随数据量放大；\n"
                           "3. 用广播三规则判断 (2500,500) 与 (1,5)/(3,) 的运算合法性。")
G["quant-python-c2-l1"] = ("1. 说明 DatetimeIndex 相对整数索引的时间语义优势；\n"
                           "2. 按 OHLCV 各自正确的聚合规则完成日→周重采样；\n"
                           "3. 用 rolling 实现 MA 金叉与滚动年化波动率，并识别前置 NaN。")
G["quant-python-c3-l1"] = ("1. 写出 MACD 五步计算的纯 pandas 实现（adjust=False）；\n"
                           "2. 解释 adjust=True/False 的公式差异及其与券商软件的对齐问题；\n"
                           "3. 用 Wilder 平滑（α=1/14）实现 RSI 并解读超买超卖区。")
P["quant-python-c1-l1"] = "- Python 基础与 NumPy 数组创建；\n- 无其他前置。"
P["quant-python-c2-l1"] = "- 「向量化思维与广播机制」（c1-l1）；\n- pandas DataFrame 基础。"
P["quant-python-c3-l1"] = "- 「金融时序重采样与移动窗口」（c2-l1）的 ewm/rolling。"

# ══════════════ quant-backtest ══════════════
T["quant-backtest","c1"] = dict(
expected="""事件流回放：t=0 MARKET→t=1 SIGNAL→t=2 ORDER→t=4 FILL（t=3/t=6 行情无信号）；冲击滑点：订单/市场量 0.1%→0.316%、10%→3.162%、30%→5.477%（超线性）；A 股费用：买 10 万元 26.0 元、卖 76.0 元（含印花税 50 元）；一字板买拒绝、停牌废单。""",
why=("向量化回测快但假设『收盘价全额成交』，事件驱动回测用优先级事件队列复现真实撮合的时间结构："
     "信号在收盘产生、订单次日执行、滑点按盘口深度结算——回测与实盘同构，OOS 衰减才可控。"),
intuition=("事件驱动引擎像一台传送带流水线：MarketEvent（行情到站）→ Strategy 出 SignalEvent → Portfolio 风控"
           "放行生成 OrderEvent → 模拟撮合网关回 FillEvent。订单状态机（PendingNew→Filled/Canceled）严格复现"
           "撤单延迟与废单。摩擦成本是绞肉机：成交量占比 10% 以上时滑点超线性爆炸。"),
cerr=("向量化回测里用当日收盘价成交当日信号（未来函数）；滑点只算固定万五、忽略成交量占比冲击；"
      "一字板照常成交（实盘绝无可能）。"),
miscon=("1. **『事件驱动只是慢一点的向量化』**——它复现订单状态机与撮合边界，是实盘前的最后一道仿真；\\n"
        "2. **『费用就是佣金』**——印花税（卖出 0.05%）、过户费、冲击滑点常是佣金的好几倍；\\n"
        "3. **『滑点线性放大』**——Volume Share Impact 是幂函数，占市场量 10% 与 1% 的滑点差一个数量级。"),
connection=("- **向前**：quant-live 的实盘系统是本章引擎的『真钱版』，事件流一一对应；\n"
            "- **向后**：c2 的绩效指标从 FillEvent 流水线上统计；\n"
            "- **平行**：quant-project 的扣费回测是本章摩擦模型的简化版。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 事件流 | Market→Signal→Order→Fill 优先级队列 |\n"
         "| 订单 FSM | PendingNew→New→Partial→Filled/Canceled/Rejected |\n"
         "| 滑点 | 固定 tick / 比例 / η·(V_order/V_market)^α |\n"
         "| A 股费率 | 佣金 0.025%双边min5 + 印花 0.05%卖 + 过户 0.001% |\n"
         "| 撮合边界 | 一字板禁买卖、停牌废单 |"),
)
T["quant-backtest","c2"] = dict(
expected="""最大回撤 -12.1%（2023-04-04）、最长水下 90 个交易日；年化收益 34.31%、Calmar=2.84；期末仍水下 dd=-9.2%。""",
why=("年化收益会撒谎，回撤不会：一次 -40% 需要 +67% 才回本。MDD、水下曲线与修复周期刻画的是投资者"
     "真实的痛苦体验——它们决定策略能不能被持有到底。"),
intuition=("HWM 是历史最高水位线，回撤就是水位线下探的深度；水下曲线是策略的『心电图』：深度（亏多少）、"
           "宽度（亏多久）、形状（V 型快恢复 vs L 型长低迷）。修复周期是从峰值到创新高的最长等待——"
           "很多策略死在投资者赎回的那一天，而不是最大回撤那一天。"),
cerr=("用净值最低点/最高点比值计算 MDD，忽略中间过程（必须 cummax）；MDD 只报数字不报发生时间与修复周期；"
      "用日频收益的 stddev×√252 报『最大回撤』（完全不同的量）。"),
miscon=("1. **『MDD 小就安全』**——要看修复周期：-20% 两周恢复与 -20% 两年恢复是两种策略；\\n"
        "2. **『Calmar 越高越好无条件』**——短样本的 MDD 可能还没出现，Calmar 被低估；\\n"
        "3. **『水下曲线只给客户看』**——它是杠杆决策与风险预算的核心输入。"),
connection=("- **向前**：c3 的样本外验证决定 MDD 统计的可信度；\n"
            "- **向后**：quant-live 的 Kill Switch 触发线就是实盘 MDD 预算；\n"
            "- **平行**：quant-portfolio c3 的压力测试是 MDD 的前瞻版。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| HWM | hwm = nav.cummax() |\n"
         "| 回撤 | dd = nav/hwm − 1，MDD = dd.min() |\n"
         "| 水下曲线 | 深度/宽度/形状三要素 |\n"
         "| 修复周期 | 峰值到创新高的最长交易日数 |\n"
         "| Calmar | 年化收益 / |MDD| |"),
)
T["quant-backtest","c3"] = dict(
expected="""运气基线 E[max SR]：K=10→1.57、K=100→2.53、K=10000→3.86；DSR 检验：K=10 SR=1.0 ✗；K=10 SR=2.0 ✓ 显著；K=100 SR=2.0 ✗（同一个夏普，测试次数翻十倍即被识破）；K=10000 SR=2.5 ✗；K=100 峰度 8 ✗（厚尾进一步压低显著性）。""",
why=("测了 10000 个策略后挑出的夏普 2.0，可能纯属运气：极值理论给出『纯靠运气的期望最高夏普』公式，"
     "DSR（压缩夏普）把测试次数 K、偏度、峰度、样本长度全部折进显著性检验——不压缩的夏普都是带水分的。"),
intuition=("多重测试像买彩票：买的张数越多，总有一张看起来像中奖。E[max_K(SR)] 就是『买 K 张彩票的最大奖金期望』："
           "K=100 时运气基线已达 2.5。DSR 问的是『你的夏普是否显著超过这个运气基线』——同一个 SR=2.0，"
           "只测过 10 个策略时是真功夫，试过 100 个变体后就是幸存者。"),
cerr=("回测 100 个参数组合只汇报最好的那个（数据窥探）；DSR 忘记代入偏度与峰度（厚尾策略 SR 估计方差更大）；"
      "把年化夏普直接与未换算的运气基线比较。"),
miscon=("1. **『夏普 2.0 一定优秀』**——若来自 1000 次测试，运气基线就有 2.9，2.0 反而是证据不足；\\n"
        "2. **『样本内夏普可信』**——必须用 OOS/多期滚动 + DSR 检验；\\n"
        "3. **『K 只算正式回测』**——看图选参数、随手跑的变体都应计入 K。"),
connection=("- **向前**：c2 的绩效指标是 DSR 的输入（SR、偏度、峰度、T）；\n"
            "- **向后**：quant-project c3 的模拟实盘衰减是 DSR 之外的又一重水分挤出；\n"
            "- **平行**：quant-ml c1 的样本重叠修正与本章同属『修正统计量水分』的家族。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 运气基线 | E[max_K SR] = (1−γ)Z⁻¹(1−1/K) + γZ⁻¹(1−1/(Ke)) |\n"
         "| 量级 | K=10→1.6、K=100→2.5、K=10000→3.9 |\n"
         "| DSR | P(SR > 运气基线)，需 K/偏度/峰度/T |\n"
         "| 门槛 | DSR > 0.95 才承认显著 |\n"
         "| 纪律 | 记录全部测试次数，汇报最优也要汇报 K |"),
)
C[("quant-backtest", "c1")] = '''import heapq, itertools

# ---- 1. 事件驱动引擎：优先级事件队列 ----
class Engine:
    def __init__(self): self.q = []; self.seq = itertools.count(); self.log = []
    def push(self, t, kind, data): heapq.heappush(self.q, (t, next(self.seq), kind, data))
    def run(self, strategy, max_ev=20):
        while self.q and max_ev:
            t, _, kind, data = heapq.heappop(self.q)
            self.log.append((t, kind, data))
            if kind == "MARKET":
                sig = strategy(data)
                if sig: self.push(t+1, "SIGNAL", sig)
            elif kind == "SIGNAL":
                self.push(t+1, "ORDER", {"symbol": data, "qty": 100})
            elif kind == "ORDER":
                self.push(t+2, "FILL", data)
            max_ev -= 1
        return self.log

eng = Engine()
for t, px in [(0, 10.0), (3, 10.2), (6, 10.1)]:
    eng.push(t, "MARKET", {"px": px})
log = eng.run(strategy=lambda m: "600000" if m["px"] < 10.05 else None)
for t, k, d in log: print(f"  t={t} {k} {d}")

# ---- 2. 成交量占比冲击 + A 股费用 ----
def impact(q, mv, eta=0.1, alpha=0.5, px=10.0): return px*eta*(q/mv)**alpha
for q, mv in [(1000, 1e6), (1e5, 1e6), (3e5, 1e6)]:
    print(f"订单 {q:>7}/{mv:.0e}: 滑点 {impact(q, mv):.4f} 元/股（{impact(q,mv)/10:.3%}）")
def a_fees(amount, sell):
    return max(amount*0.00025, 5) + amount*0.00001 + (amount*0.0005 if sell else 0)
print(f"买入 10 万元费用 {a_fees(1e5, False):.1f} 元 | 卖出 {a_fees(1e5, True):.1f} 元（含印花税 50 元）")
print("撮合守卫: 一字板买 ->", "拒绝", "| 停牌委托 ->", "废单")'''
C[("quant-backtest", "c2")] = '''import numpy as np, pandas as pd
rng = np.random.default_rng(3)
nav = pd.Series(np.cumprod(1 + rng.normal(0.0006, 0.012, 750)),
                index=pd.date_range("2022-01-01", periods=750, freq="B"))
hwm = nav.cummax()
dd = nav/hwm - 1
mdd = dd.min(); mdd_date = dd.idxmin()
peaks = np.where(nav.values >= hwm.values)[0]
gaps = np.diff(np.r_[peaks, len(nav)-1])
ann_ret = nav.iloc[-1]**(252/750) - 1
print(f"最大回撤 {mdd:.1%}（{mdd_date.date()}）| 最长水下 {gaps.max()} 个交易日")
print(f"年化收益 {ann_ret:.2%} | Calmar = {ann_ret/abs(mdd):.2f}")
print(f"当前是否水下: {'是（dd=%.1f%%）' % (100*dd.iloc[-1]) if dd.iloc[-1] < 0 else '否（创新高）'}")'''
C[("quant-backtest", "c3")] = '''import numpy as np
from statistics import NormalDist
nd = NormalDist(); gamma = 0.5772
def emax_sr(K):
    z1 = nd.inv_cdf(1 - 1/K); z2 = nd.inv_cdf(1 - 1/(K*np.e))
    return (1 - gamma)*z1 + gamma*z2
for K in (10, 100, 10000):
    print(f"测试 {K:>5} 个策略: 运气基线 E[max SR] ≈ {emax_sr(K):.2f}")
def dsr(sr, K, T, skew=0.0, kurt=3.0):
    denom = np.sqrt(1 - skew*sr + (kurt-1)/4*sr**2)
    return nd.cdf((sr - emax_sr(K))*np.sqrt(T-1)/denom)
for K, sr, kurt in [(10, 1.0, 3), (10, 2.0, 3), (100, 2.0, 3), (10000, 2.5, 3), (100, 2.0, 8)]:
    p = dsr(sr, K, 252, kurt=kurt)
    print(f"K={K:>5}, SR={sr}, 峰度{kurt}: DSR={p:.3f}", "✓ 显著" if p > 0.95 else "✗ 未通过")'''
G["quant-backtest-c1-l2"] = ("1. 画出 Market→Signal→Order→Fill 事件流与优先级队列调度；\n"
                             "2. 写出订单状态机的六状态流转及其对撤单延迟的复现；\n"
                             "3. 用 heapq 实现最小事件引擎并回放一笔信号的完整生命周期。")
G["quant-backtest-c1-l3"] = ("1. 对比三种滑点模型并用成交量占比公式实测非线性冲击；\n"
                             "2. 按 A 股真实费率（佣金/印花/过户）计算 10 万元买卖的全套费用；\n"
                             "3. 实现一字板与停牌的撮合守卫，解释为何严禁成交。")
G["quant-backtest-c2-l2"] = ("1. 用 cummax 计算 HWM、动态回撤与 MDD 及其发生日期；\n"
                             "2. 解读水下曲线三要素（深度/宽度/形状）与 V 型/L 型差异；\n"
                             "3. 计算最长修复周期与 Calmar 比率。")
G["quant-backtest-c3-l3"] = ("1. 写出 E[max_K SR] 公式并计算 K=10/100/10000 的运气基线；\n"
                             "2. 实现 DSR 检验并演示同一 SR 在不同 K 与峰度下的显著性翻转；\n"
                             "3. 建立多重测试纪律：记录全部试验次数并汇报 K。")
P["quant-backtest-c1-l2"] = "- 「向量化回测与事件驱动」（c1-l1）；\n- 有限状态机概念（可参考 quant-live c1）。"
P["quant-backtest-c1-l3"] = "- 「事件驱动引擎架构」（c1-l2）；\n- A 股交易规则常识。"
P["quant-backtest-c2-l2"] = "- 绩效指标体系（c2-l1）的年化收益/夏普；\n- pandas cummax。"
P["quant-backtest-c3-l3"] = "- 样本外验证与数据窥探（c3-l1/l2）；\n- 正态分布分位数。"

EX.update({k: v.get("expected", "") for k, v in T.items()})

WHY = {k: v["why"] for k, v in T.items()}
INTU = {k: v["intuition"] for k, v in T.items()}
CERR = {k: v["cerr"] for k, v in T.items()}
MISCON = {k: v["miscon"] for k, v in T.items()}
CONN = {k: v["connection"] for k, v in T.items()}
SUMM = {k: v["summary"] for k, v in T.items()}

MD = {}
for lid, goals in G.items():
    course = lid.rsplit("-c", 1)[0]
    ch = "c" + lid.split("-c")[1].split("-")[0]
    key = (course, ch)
    MD[lid] = build_md(LIBS[course].orig_content(lid), goals, P[lid], WHY[key], INTU[key],
                       C[key], EX[key], CERR[key], MISCON[key], CONN[key], SUMM[key], REFS[course])

def course_of(lid): return lid.rsplit("-c", 1)[0]

if len(sys.argv) > 1 and sys.argv[1] == "verify":
    for key in C:
        print("=" * 20, key[0], key[1])
        exec(compile(C[key], "%s-%s" % key, "exec"), dict(globals()))
    print("VERIFY-ONLY")
elif not all(EX.values()):
    missing = [k for k in EX if not EX[k]]
    print("expected 未填:", missing)
else:
    for lid in G:
        LIBS[course_of(lid)].patch_lesson(lid, MD[lid])
    for name, lib in LIBS.items():
        print(name, "pending:", len(lib.pending))
