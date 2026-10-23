import type { Chapter } from '../../../types';

export const quantMarketChapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ══════════════════════════════════════════════════════════════════
     第 1 章：市场微观结构与订单簿动力学（完整标杆样板章）
     ══════════════════════════════════════════════════════════════════ */
  {
    id: 'quant-market-c1',
    title: '市场微观结构与订单簿动力学',
    goal: '透彻掌握股票交易机制、双向拍卖撮合原理、限价订单簿动力学以及收益率的数学本质，为量化策略奠定坚实的底层微观基础。',
    lessons: [
      {
        id: 'quant-market-c1-l1',
        title: '证券市场机制、委托类型与连续双向拍卖',
        content: `
## 什么是证券市场微观结构？

量化交易者面对的市场从来不是教科书中抽象的光滑供求曲线，而是由一个个离散委托、微秒级时间戳、交易所撮合引擎以及有限流动性构成的复杂工程系统。
**市场微观结构（Market Microstructure）**研究的是：资产交易的具体规则、协议与机制如何影响价格形成、交易成本与流动性。

在学术界，MIT 15.401（Prof. Andrew Lo）与经典著作 Larry Harris《Trading and Exchanges: Market Microstructure for Practitioners》指出：
现代主流股票交易所（如上交所 SSE、深交所 SZSE、纽交所 NYSE、纳斯达克 NASDAQ）的核心定价机制均为**连续双向拍卖（Continuous Double Auction, CDA）**驱动的电子订单簿系统。

<Diagram type="matchingflow" />

---

## 核心概念与委托类型

在限价订单簿中，交易者通过提交不同类型的委托（Orders）表达交易意图：

### 1. 限价单（Limit Order, LO）
* **严谨定义**：指定买入最高价（Bid Price）或卖出最低价（Ask Price）及数量的委托指令。
* **执行特性**：在订单簿中等待对手方匹配，**提供流动性（Liquidity Provider / Maker）**。
* **优势与代价**：控制了成交价格上限/下限，但面临**执行风险（Execution Risk）**（若价格远离则无法成交）和**逆向选择风险（Adverse Selection Risk）**（一旦成交，往往是因为对手方掌握更有利的信息）。

### 2. 市价单（Market Order, MO）
* **严谨定义**：不指定价格，要求撮合引擎以当前市场最佳可用价格立即执行指定数量的委托指令。
* **执行特性**：立即消耗订单簿挂单，**消耗流动性（Liquidity Taker / Taker）**。
* **优势与代价**：保证执行速度与确定性，但**失去价格控制权**，在流动性较浅的市场中极易遭受严重的**滑点冲击（Slippage）**。

---

## 交易所撮合核心准则：价格优先与时间优先

交易所撮合引擎遵循全球公认的**价格优先、时间优先（Price-Time Priority, FIFO）**准则：

1. **价格优先原则（Price Priority）**：
   * 买入申报：较高价格买入申报优先于较低价格申报。
   * 卖出申报：较低价格卖出申报优先于较高价格申报。
2. **时间优先原则（Time Priority）**：
   * 买卖方向与申报价格相同时，先到达撮合主机的申报优先于后到达的申报。
   * 撤单与修改：撤单后重新报单将失去原先的时间优先位次。

---

## 参考学术课程与权威文献
* **MIT OpenCourseWare 15.401** Finance Theory I, Lecture 3 & 4 (Prof. Andrew Lo): Market Mechanics and Market Microstructure. [MIT OCW 15.401](https://ocw.mit.edu/courses/15-401-finance-theory-i-fall-2008/)
* **Larry Harris**, *Trading and Exchanges: Market Microstructure for Practitioners*, Oxford University Press, Chapter 1-4.
* **上海证券交易所交易规则**（2023年修订版），第三章：证券交易申报与撮合原则。
`,
        tips: [
          {
            kind: 'interview',
            text: '量化面试常考：为什么高频做市商（Maker）会面临「逆向选择风险」？因为当市场突发负面消息时，其他更知情或更迅速的交易者会迅速用市价单吃掉挂买单，使做市商在暴跌中持有亏损存货。',
          },
          {
            kind: 'pitfall',
            text: '初学者常见误区：认为实盘中市价买单一定能在「卖一」标示的价格成交。实际上若订单量超过卖一挂单深度，剩余部分会自动向上吃穿卖二、卖三，最终成交均价远劣于卖一报价。',
          },
        ],
        demos: [
          {
            title: '双向拍卖撮合逻辑简易模拟',
            lang: 'python',
            code: `def match_limit_order(book_bids, incoming_sell_order):
    """
    简易模拟撮合：传入买方订单簿 [(价格, 数量, 时间戳)] 与到来的限价卖单
    严格按照价格降序、时间升序撮合
    """
    sell_price, sell_qty = incoming_sell_order
    # 买方价格从高到低排序，同价时间戳从小到大排序
    sorted_bids = sorted(book_bids, key=lambda x: (-x[0], x[2]))
    
    trades = []
    rem_qty = sell_qty
    
    for bid_price, bid_qty, ts in sorted_bids:
        if bid_price < sell_price:
            break  # 买价低于卖单限定价格，无法撮合
        match_vol = min(rem_qty, bid_qty)
        trades.append({"exec_price": bid_price, "volume": match_vol, "maker_ts": ts})
        rem_qty -= match_vol
        if rem_qty == 0:
            break
            
    return trades, rem_qty

# 初始买方盘口：(价格, 数量, 时间戳)
bids = [(10.05, 30, 1), (10.05, 50, 2), (10.02, 100, 3)]
# 到来一笔以 10.03 限价卖出 60 手的委托
trades, unfilled = match_limit_order(bids, (10.03, 60))

print("成交明细:", trades)
print(f"剩余未成交数量: {unfilled}")
total_cash = sum(t["exec_price"] * t["volume"] for t in trades)
total_vol = sum(t["volume"] for t in trades)
print(f"加权平均成交价: {total_cash / total_vol:.4f}")`,
          },
        ],
      },
      {
        id: 'quant-market-c1-l2',
        title: '限价订单簿动力学与流动性度量',
        content: `
## 限价订单簿（Limit Order Book, LOB）结构

限价订单簿是记录当前市场中所有尚未成交的限价买单和限价卖单的集合。在中国 A 股市场，行情通常分为：
* **Level 1 行情**：仅展示最优的买一至买五、卖一至卖五报价与挂单量。
* **Level 2 行情**：提供买卖十档深度、逐笔委托（Order-by-Order）与逐笔成交（Tick-by-Tick）数据。

<Diagram type="orderbook" />

---

## 核心数学度量与公式

### 1. 买卖价差（Bid-Ask Spread）
买卖价差是衡量市场即时流动性最直观的指标：

**名义名目价差（Quoted Spread）**：
$$S_t = P_{t}^{ask1} - P_{t}^{bid1}$$

**相对百分比价差（Relative Spread）**：
$$s_t = \\frac{P_{t}^{ask1} - P_{t}^{bid1}}{P_{t}^{mid}}$$
其中中间价定义为：
$$P_{t}^{mid} = \\frac{P_{t}^{ask1} + P_{t}^{bid1}}{2}$$

价差越小，说明做市商竞争越激烈，交易者的摩擦成本越低。

### 2. 盘口失衡度（Order Book Imbalance, OBI）
盘口失衡度用于捕捉买卖双方在第一档（或前 $k$ 档）挂单力量的倾斜程度，常用于日内超短期微观结构信号：
$$OBI_t = \\frac{V_{t}^{bid1} - V_{t}^{ask1}}{V_{t}^{bid1} + V_{t}^{ask1}} \\in [-1, 1]$$
* 当 $OBI_t \\to +1$ 时，买一挂单极深，短线价格承受向上推力；
* 当 $OBI_t \\to -1$ 时，卖盘沉重，短线存在向下压力。

### 3. 成交均价与冲击成本（Impact Cost & Slippage）
若某量化策略以市价单形式买入 $Q$ 股，由于卖一深度 $V_1 < Q$，订单必须逐档向上“吃单”：
$$\\bar{P}_{exec} = \\frac{\\sum_{i=1}^{k} P_{ask, i} \\cdot q_i}{Q}, \\quad \\sum_{i=1}^k q_i = Q$$
市价单所遭受的**单边滑点（Slippage）**为：
$$\\Delta P = \\bar{P}_{exec} - P_{mid}$$

---

## 真实交易案例推演

假设某股票盘口如下：
* 卖三：10.03元，100手
* 卖二：10.02元，60手
* 卖一：10.01元，40手
* 买一：10.00元，50手

此时 $P_{mid} = (10.01 + 10.00) / 2 = 10.005$ 元。
某量化算法因追涨信号发出 **150 手市价买单**：
1. 先以 10.01 元成交 40 手；
2. 再以 10.02 元成交 60 手；
3. 剩余 50 手在 10.03 元成交。

加权成交均价：
$$\\bar{P} = \\frac{40 \\times 10.01 + 60 \\times 10.02 + 50 \\times 10.03}{150} = \\frac{400.4 + 601.2 + 501.5}{150} = \\frac{1503.1}{150} \\approx 10.0207\\text{ 元}$$

**滑点成本**：相比中间价多付出了 $10.0207 - 10.0050 = 0.0157$ 元/股（约 15.7 个基点，bps）。
若回测中忽视了这笔冲击成本，策略实盘表现将发生致命缩水。
`,
        tips: [
          {
            kind: 'performance',
            text: '高换手率策略（如日内动量、T+0）最大的杀手不是佣金，而是盘口价差与滑点。年换手 100 倍的策略，单边 10 bps 滑点就会吞噬每年 20% 的净值。',
          },
          {
            kind: 'note',
            text: '图表能证明什么：能精确展示某瞬间盘口被大单吃穿时的加权成交价与滑点；不能证明什么：不能预测做市商撤单或紧随其后的新委托挂入。',
          },
        ],
        demos: [
          {
            title: '市价单冲击成交与滑点计算',
            lang: 'python',
            code: `def calculate_market_buy_impact(asks, buy_qty):
    """
    asks: [(price, volume), ...] 从低到高
    buy_qty: 拟买入总手
    """
    total_cost = 0.0
    matched_qty = 0
    
    for price, vol in asks:
        take_vol = min(buy_qty - matched_qty, vol)
        total_cost += take_vol * price
        matched_qty += take_vol
        if matched_qty == buy_qty:
            break
            
    if matched_qty < buy_qty:
        raise ValueError("市场流动性耗尽，委托未能全部执行")
        
    vwap = total_cost / buy_qty
    return vwap

# 卖盘深度: 卖一40手@10.01, 卖二60手@10.02, 卖三100手@10.03
book_asks = [(10.01, 40), (10.02, 60), (10.03, 100)]
buy_order_size = 150
vwap_price = calculate_market_buy_impact(book_asks, buy_order_size)

mid_price = (10.01 + 10.00) / 2.0
slippage_bps = ((vwap_price - mid_price) / mid_price) * 10000

print(f"市价买入 {buy_order_size} 手成交均价: {vwap_price:.4f} 元")
print(f"相对中间价产生滑点: {slippage_bps:.2f} bps (基点)")`,
          },
        ],
      },
      {
        id: 'quant-market-c1-l3',
        title: '离散收益率与对数收益率的数学本质',
        content: `
## 为什么收益率的度量是量化研究的基石？

在量化金融中，价格序列 $P_t$ 通常是非平稳的（Non-stationary），而收益率序列（Returns）具备更好的统计平稳性质。
然而，**简单离散收益率（Simple Return）**与**连续复合对数收益率（Log Return）**在数学性质与实际应用中有着严格的适用边界，严禁混用。

---

## 严谨定义与数学推导

### 1. 简单离散收益率（Simple Return）
考虑资产在时间 $t-1$ 到 $t$ 期的价格分别为 $P_{t-1}$ 和 $P_t$（假设期间分红为 $D_t$）：
$$R_t = \\frac{P_t + D_t - P_{t-1}}{P_{t-1}} = \\frac{P_t + D_t}{P_{t-1}} - 1$$

* **截面资产组合可加性（Cross-sectional Additivity）**：
  若投资组合包含 $N$ 种资产，资产权重分别为 $w_1, w_2, \\dots, w_N$（满足 $\\sum w_i = 1$），则组合简单收益率为各资产简单收益率的**线性加权平均**：
  $$R_{p, t} = \\sum_{i=1}^N w_i R_{i, t}$$
  **这一性质在投资组合优化（如 Markowitz 均值-方差模型）中是绝对成立的**。

* **时序累积非线性（Time-series Non-additivity）**：
  多期复合总简单收益率不是单期简单收益率的直接相加，而是连乘积：
  $$1 + R_{0, T} = (1 + R_1)(1 + R_2)\\dots(1 + R_T) = \\prod_{t=1}^T (1 + R_t)$$

---

### 2. 对数收益率（Log Return / Continuously Compounded Return）
对数收益率定义为价格比值的自然对数：
$$r_t = \\ln\\left(\\frac{P_t + D_t}{P_{t-1}}\\right) = \\ln(1 + R_t)$$

* **时序完美可加性（Time-series Additivity）**：
  多期累计对数收益率等于各期单步对数收益率的**算术和**：
  $$r_{0, T} = \\ln\\left(\\frac{P_T}{P_0}\\right) = \\sum_{t=1}^T r_t$$
  这一美妙性质极大简化了计量经济学推导、布朗运动与 Ito 引理的应用。

* **致命局限：截面不可加（Cross-sectional Non-additivity）**：
  投资组合的对数收益率**不等于**各成分股对数收益率的加权和：
  $$r_{p, t} = \\ln\\left(\\sum_{i=1}^N w_i (1 + R_{i, t})\\right) \\ne \\sum_{i=1}^N w_i r_{i, t}$$

---

## 泰勒展开联系与高阶近似

利用一阶泰勒展开式 $\\ln(1 + x) \\approx x - \\frac{x^2}{2} + O(x^3)$（当 $|x| \\ll 1$）：
$$r_t = \\ln(1 + R_t) \\approx R_t - \\frac{1}{2} R_t^2$$
* 在高频交易或日内微小波动场景（$R_t \\approx 0$）中，$r_t \\approx R_t$。
* 但在月度、年度或剧烈波动市场（例如跌幅 50%：$R_t = -0.5$，而 $r_t = \\ln(0.5) \\approx -0.693$），两者差异显著，忽略高阶项会导致严重计量偏差。

| 维度 | 简单收益率 $R_t$ | 对数收益率 $r_t$ |
| --- | --- | --- |
| **时序聚合** | 连乘 $\\prod(1+R_t)-1$ | 线性相加 $\\sum r_t$ |
| **资产组合截面聚合** | 严格线性加权 $\\sum w_i R_i$ | **不可加**（非线性） |
| **下限与分布** | 最低为 $-100\\%$（有限责任） | 最低为 $-\\infty$（便于正态假设建模） |
| **推荐适用场景** | 组合回测、绩效归因、风控报告 | 理论推导、波动率建模、GARCH 模型 |
`,
        tips: [
          {
            kind: 'pitfall',
            text: '高频致命 Bug：很多量化新手直接把股票的对数收益率按持仓权重相加得到组合收益率，这在数学上是错误的！计算组合价值时，必须将对数收益率还原为资产真实持仓净值或简单收益率。',
          },
          {
            kind: 'note',
            text: '权威来源：Ruey S. Tsay《Analysis of Financial Time Series》Chapter 1 对金融收益率定义与统计特性的权威推导。',
          },
        ],
        demos: [
          {
            title: '简单收益率 vs 对数收益率的数学对比验证',
            lang: 'python',
            code: `import numpy as np

prices = [100.0, 120.0, 90.0]

simple_r1 = (prices[1] - prices[0]) / prices[0] # +20%
simple_r2 = (prices[2] - prices[1]) / prices[1] # -25%
comp_simple = (1 + simple_r1) * (1 + simple_r2) - 1

log_r1 = np.log(prices[1] / prices[0])
log_r2 = np.log(prices[2] / prices[1])
sum_log = log_r1 + log_r2
total_log = np.log(prices[2] / prices[0])

print(f"简单收益率: 第1期={simple_r1:.2%}, 第2期={simple_r2:.2%}")
print(f"直接相加错误结果: {simple_r1 + simple_r2:.2%}")
print(f"连乘正确复合收益率: {comp_simple:.2%}")
print("-" * 40)
print(f"对数收益率: 第1期={log_r1:.4f}, 第2期={log_r2:.4f}")
print(f"直接相加和: {sum_log:.4f}, 总体对数收益: {total_log:.4f}")
print(f"对数收益和还原为简单收益率: {np.exp(sum_log) - 1:.2%}")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'quant-market-c1-e1',
        type: 'single',
        difficulty: 1,
        question: '在证券交易所连续双向拍卖的撮合系统中，当多笔买入申报与卖出申报竞争成交时，撮合引擎遵循的基本优先准则是：',
        options: [
          { value: 'A', text: '资金规模优先、时间优先' },
          { value: 'B', text: '价格优先、时间优先' },
          { value: 'C', text: '机构席位优先、价格优先' },
          { value: 'D', text: '订单类型优先、随机撮合' },
        ],
        answer: 'B',
        explanation: '全球主流证券交易所的撮合引擎核心准则均为价格优先与时间优先（FIFO）。买价高者优先，卖价低者优先；同价位按照到达撮合主机的时间先后顺序撮合。',
        tags: ['撮合机制', '微观结构'],
        relatedLessonId: 'quant-market-c1-l1',
      },
      {
        id: 'quant-market-c1-e2',
        type: 'judge',
        difficulty: 1,
        question: '投资组合的对数收益率等于组合中各标的对数收益率乘以持仓权重的加权求和。',
        answer: false,
        explanation: '这是量化金融中极为经典的误区。只有简单离散收益率在截面上满足严格的线性加权和；对数收益率在时序上可相加，但在截面资产组合上不可加（log of sum != sum of logs）。',
        tags: ['对数收益率', '数学基础'],
        relatedLessonId: 'quant-market-c1-l3',
      },
      {
        id: 'quant-market-c1-e3',
        type: 'multiple',
        difficulty: 2,
        question: '关于限价单（Limit Order）与市价单（Market Order）的比较，下列说法正确的有：（多选）',
        options: [
          { value: 'A', text: '限价单是流动性提供者（Maker），而市价单是流动性消耗者（Taker）' },
          { value: 'B', text: '市价单保证以最快速度成交，但无法控制实际成交价格' },
          { value: 'C', text: '限价单保证成交价格不劣于指定价格，但面临无法成交的执行风险' },
          { value: 'D', text: '大单使用市价单直接买入时，成交均价必定等于当前的卖一报价' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: '选项 D 错误：若大单数量超过卖一深度，市价单会向上击穿卖二、卖三，最终成交均价由多档挂单共同决定，必然劣于卖一报价。A、B、C 均为正确的微观结构特征。',
        tags: ['委托类型', '订单簿'],
        relatedLessonId: 'quant-market-c1-l1',
      },
      {
        id: 'quant-market-c1-e4',
        type: 'fill',
        difficulty: 2,
        question: '某股票当前盘口显示：卖一价为 20.08 元，买一价为 20.00 元。则其名义买卖价差（Spread）为 ___ 元，中间价（Mid Price）为 ___ 元。',
        blanks: [
          ['0.08', '0.08元'],
          ['20.04', '20.04元'],
        ],
        explanation: 'Spread = Ask1 - Bid1 = 20.08 - 20.00 = 0.08 元。Mid Price = (Ask1 + Bid1) / 2 = (20.08 + 20.00) / 2 = 20.04 元。',
        tags: ['价差计算', '订单簿'],
        relatedLessonId: 'quant-market-c1-l2',
      },
      {
        id: 'quant-market-c1-e5',
        type: 'fill',
        difficulty: 2,
        question: '某量化基金在三个交易日的对数收益率分别为 +0.02、-0.01、+0.03。利用对数收益率的时序可加性，这三天的总对数收益率为 ___。',
        blanks: [['0.04', '+0.04']],
        explanation: '对数收益率具有时序完美可加性：r_total = r1 + r2 + r3 = 0.02 - 0.01 + 0.03 = 0.04。',
        tags: ['对数收益率', '金融数学'],
        relatedLessonId: 'quant-market-c1-l3',
      },
      {
        id: 'quant-market-c1-e6',
        type: 'single',
        difficulty: 3,
        question: '某标的盘口卖盘深度如下：卖一 50.00 元挂单 100 手；卖二 50.10 元挂单 200 手；卖三 50.20 元挂单 300 手。若某量化程序化委托发出一张 250 手的市价买单，其成交加权均价为：',
        options: [
          { value: 'A', text: '50.00 元' },
          { value: 'B', text: '50.06 元' },
          { value: 'C', text: '50.10 元' },
          { value: 'D', text: '50.15 元' },
        ],
        answer: 'B',
        explanation: '250手市价买单首先吃掉卖一 100手（50.00元），剩余 150手在卖二（50.10元）成交。总成交金额 = 100 × 50.00 + 150 × 50.10 = 5000 + 7515 = 12515 元。成交均价 = 12515 / 250 = 50.06 元。',
        tags: ['市价单冲击', '微观结构计算'],
        relatedLessonId: 'quant-market-c1-l2',
      },
      {
        id: 'quant-market-c1-e7',
        type: 'code',
        difficulty: 2,
        question: '实现函数 calc_returns(prices)，接收一个非空价格列表（长度 >= 2），返回一个包含元组 (简单收益率列表, 对数收益率列表) 的结果。\n\n提示：简单收益率用 (P_t - P_{t-1})/P_{t-1}，对数收益率用 math.log(P_t / P_{t-1})。',
        starterCode: `import math

def calc_returns(prices):
    # 请返回 (simple_returns, log_returns)
    pass
`,
        setupCode: 'import math',
        expectedOutput: '返回计算好的两组收益率列表',
        tests: `r_sim, r_log = calc_returns([100.0, 110.0, 99.0])
assert len(r_sim) == 2 and len(r_log) == 2
assert abs(r_sim[0] - 0.1) < 1e-5
assert abs(r_sim[1] - (-0.1)) < 1e-5
assert abs(r_log[0] - math.log(1.1)) < 1e-5
assert abs(r_log[1] - math.log(99.0 / 110.0)) < 1e-5
assert abs(sum(r_log) - math.log(99.0 / 100.0)) < 1e-5`,
        answer: `import math

def calc_returns(prices):
    simple_returns = []
    log_returns = []
    for i in range(1, len(prices)):
        p_prev = prices[i - 1]
        p_curr = prices[i]
        simple_returns.append((p_curr - p_prev) / p_prev)
        log_returns.append(math.log(p_curr / p_prev))
    return (simple_returns, log_returns)

calc_returns([100.0, 110.0, 99.0])`,
        explanation: '简单收益率使用相邻价格差除以前期价格，对数收益率使用 math.log 取对数。对数收益率之和正好等于期末价格与期初价格之比的自然对数。',
        tags: ['收益率计算', 'Python编程'],
        relatedLessonId: 'quant-market-c1-l3',
      },
      {
        id: 'quant-market-c1-e8',
        type: 'code',
        difficulty: 3,
        question: '编写函数 calculate_slippage(asks, order_qty)，传入卖盘挂单列表 asks（每项为 (价格, 数量) 且已按价格升序排好）和市价买单数量 order_qty。\n\n请返回加权成交均价 vwap。保证订单量不会超过挂单总深度。',
        starterCode: `def calculate_slippage(asks, order_qty):
    # 遍历挂单深度，逐档吃单计算加权成交均价
    pass
`,
        expectedOutput: '加权成交均价 (浮点数)',
        tests: `book = [(10.0, 100), (10.1, 100), (10.2, 100)]
assert abs(calculate_slippage(book, 50) - 10.0) < 1e-5
assert abs(calculate_slippage(book, 150) - (100*10.0 + 50*10.1)/150) < 1e-5
assert abs(calculate_slippage(book, 250) - (100*10.0 + 100*10.1 + 50*10.2)/250) < 1e-5`,
        answer: `def calculate_slippage(asks, order_qty):
    total_cost = 0.0
    rem_qty = order_qty
    for price, vol in asks:
        take = min(rem_qty, vol)
        total_cost += take * price
        rem_qty -= take
        if rem_qty <= 0:
            break
    return total_cost / order_qty

calculate_slippage([(10.0, 100), (10.1, 100), (10.2, 100)], 150)`,
        explanation: '从卖一开始逐档吃单，直至满足 order_qty，总成本除以委托数量即为真实的 VWAP 成交均价。',
        tags: ['滑点模拟', '算法执行'],
        relatedLessonId: 'quant-market-c1-l2',
      },
      {
        id: 'quant-market-c1-e9',
        type: 'multiple',
        difficulty: 3,
        question: '量化研究员在利用高频订单薄失衡（Order Book Imbalance, OBI）因子构建短期超额收益模型时，下列哪些现象会导致实盘大幅跑输回测？（多选）',
        options: [
          { value: 'A', text: '高频虚假挂单（Spoofing）：不法交易者在买方挂大单诱导算法追高，随后在毫秒内撤单' },
          { value: 'B', text: '网络与系统通信延迟（Latency）：收到行情到订单送达交易所之间盘口早已被对手方抢先' },
          { value: 'C', text: '手续费与印花税的刚性摩擦：即便预测胜率达 55%，收益不足以覆盖双边手续费' },
          { value: 'D', text: '订单簿失衡指标在数学上具有反向预测性，挂买单越多价格必然立即暴跌' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: 'D 选项错误：挂买单偏多反映当下买方流动性深厚，在统计上短期偏向上涨，并非必然暴跌。但实盘中由于虚假挂单撤单（A）、微秒延迟导致的信息陈旧（B）以及极高换手下的手续费侵蚀（C），会导致高胜率模型在实盘中严重亏损。',
        tags: ['微观结构陷阱', '实盘与回测差距'],
        relatedLessonId: 'quant-market-c1-l2',
      },
      {
        id: 'quant-market-c1-e10',
        type: 'open',
        difficulty: 4,
        question: '【案例分析与实战论述】\n2010年5月6日美股发生著名的「闪崩」（Flash Crash），道琼斯指数在数分钟内暴跌近千点，许多蓝筹股价格跌至几美分，随后又快速反弹。\n\n请结合市场微观结构、做市商存货风险、逆向选择及止损算法踩踏，阐述为什么在极端波动事件中市场会出现「流动性瞬间枯竭（Liquidity Freeze）」，并提出两条量化策略在面对此类异常时的风控保护机制。',
        referenceAnswer: `1. 流动性枯竭的微观结构成因：
(1) 做市商逆向选择与存货风控：当突发单边海量卖单砸入市场时，做市商（高频提供流动性者）识别到极端的知情交易者抛售，为避免承担灾难性的多头存货亏损，做市商算法会集体撤销买单挂单，导致买盘深度瞬间断崖式清空。
(2) 算法与止损盘的正反馈踩踏：随着价格击穿支撑位，大量趋势跟踪与跟踪止损算法触发市价卖单。由于此时买盘深度已空，市价卖单在低价挂单（甚至是几美分的荒谬挂单）上成交，形成级联流动性黑洞。

2. 量化策略的风控保护机制：
(1) 盘口动态异常检测与熔断暂停：监控买卖价差（Spread）与盘口深度总和。当相对价差扩大超过阈值（如正常水平的 5 倍）或盘口深度降至均值 10% 以下时，判定流动性危机，立即暂停所有主动市价交易与新开仓。
(2) 订单执行保护（Limit-protected Market Order）：严禁使用无保护的裸市价单，执行市价单时必须附带价格滑点上限约束（如不得偏离发出时中间价的 0.5%），若超出则自动转为限价单或撤单，防止在闪崩深坑中以极端异常价割肉。`,
        rubric: [
          { point: '清晰分析做市商撤单与逆向选择/存货风险的关系', score: 30 },
          { point: '阐明止损市价单踩踏对流动性枯竭的正反馈放大效应', score: 30 },
          { point: '提出合理的盘口流动性/价差异常监控熔断机制', score: 20 },
          { point: '提出带滑点保护的委托机制或避免裸市价单的方案', score: 20 },
        ],
        keywords: ['做市商', '撤单', '逆向选择', '踩踏', '价差扩大', '熔断', '滑点保护'],
        explanation: '流动性瞬间枯竭主要由于做市商面临逆向选择风险集体撤单，叠加止损市价单踩踏；防范机制需包含价差/深度异常熔断与带滑点保护的委托指令。',
        tags: ['流动性黑洞', '案例研究', '风控架构'],
        relatedLessonId: 'quant-market-c1-l2',
      },
    ],
  },

  /* ══════════════════════════════════════════════════════════════════
     第 2 章：K线形态、量价分析与价格序列表示
     ══════════════════════════════════════════════════════════════════ */
  {
    id: 'quant-market-c2',
    title: 'K线形态、量价分析与价格序列表示',
    goal: '理解日线与分时K线的构建、量价配合规律与VWAP成交量加权均线，掌握时间序列采样对策略周期的影响。',
    lessons: [
      {
        id: 'quant-market-c2-l1',
        title: 'K线几何解构与价格极值信息压缩',
        content: `
## 学习目标

学完本节，你应该能够：
1. 说出一根 K 线如何把海量逐笔撮合压缩为 OHLCV 五个数字，以及这个压缩**有损**在哪里；
2. 用实体幅度、上下影线比等几何量构造量化特征；
3. 从一段逐笔价格流亲手聚合出日 K 线，并解释影线为何无法从收盘价序列恢复。

## 前置知识

- 第 1 章的连续双向拍卖与撮合机制（K 线是撮合流的**聚合视图**，不理解撮合就会把 K 线当成"画出来的图形"）；
- 最大值、最小值、累计求和；
- 百分比收益率（下一节 VWAP 会用到成交量加权，本节先把 Volume 立起来）。

## 问题背景：为什么需要 K 线

一天 A 股成交数十万笔逐笔成交与逐笔委托，人脑与多数模型都消化不了原始流。K 线（蜡烛图）把任意时间窗口内的撮合流压缩成 5 个标量，是**技术分析与量化特征工程共同的原子单位**：它起源于 18 世纪日本大阪米市（本间宗久的酒田战法），1990 年代由 Steve Nison 系统引入西方。

## 核心概念：OHLCV

| 字段 | 定义 | 语义 |
| --- | --- | --- |
| Open | 窗口内第一笔成交价 | 起点 |
| High | 窗口内最高成交价 | 多头曾触及的极值 |
| Low | 窗口内最低成交价 | 空头曾触及的极值 |
| Close | 窗口内最后一笔成交价 | 终点（最常用） |
| Volume | 窗口内累计成交量 | 博弈强度 |

## 原理详解：影线与实体的力学含义

- **实体幅度**：$\\Delta_{body} = (P_{close} - P_{open}) / P_{open}$——窗口内多空博弈的**净胜负**；
- **上影线比**：$(P_{high} - \\max(P_{open}, P_{close})) / P_{open}$——多头曾推进到的最高处被**打回**的幅度，长上影常被解读为上方抛压；
- **下影线比**：$(\\min(P_{open}, P_{close}) - P_{low}) / P_{open}$——空头砸出的低点被**买回**的幅度。

注意因果方向：影线记录的是"发生过什么"，而不是"将会发生什么"——同样的长下影线，事后可以讲故事说"支撑有效"，也可以说"抛压初现"。**特征工程只把它们当作统计量，解读留给统计检验**。

## 完整案例：从 10 笔成交聚合一根 K 线

某 5 分钟窗口内逐笔成交价（元）：10.00, 10.02, 9.98, 9.95, 9.97, 10.01, 10.05, 10.08, 10.03, 10.06；对应成交量（手）：5, 3, 8, 12, 6, 4, 7, 10, 5, 9。

- Open = 10.00（第一笔），Close = 10.06（最后一笔）
- High = 10.08（第 8 笔），Low = 9.95（第 4 笔）
- Volume = 5+3+8+12+6+4+7+10+5+9 = 69 手
- 实体幅度 = (10.06 − 10.00)/10.00 = **+0.60%**（阳线）；上影线 = (10.08 − 10.06)/10.00 = 0.20%；下影线 = (10.00 − 9.95)/10.00 = 0.50%。

**有损性**：知道了 OHLC，你**永远无法恢复**这 10 笔成交的顺序——先冲高再回落，还是先砸低再拉升，K 线一字不差。这就是信息压缩的代价，也是高频数据仍有价值的原因。

## 代码实践

\`\`\`python
ticks = [(10.00, 5), (10.02, 3), (9.98, 8), (9.95, 12), (9.97, 6),
         (10.01, 4), (10.05, 7), (10.08, 10), (10.03, 5), (10.06, 9)]

prices = [p for p, v in ticks]
o, c = prices[0], prices[-1]
h, l = max(prices), min(prices)
vol = sum(v for p, v in ticks)
body = (c - o) / o
upper = (h - max(o, c)) / o
lower = (min(o, c) - l) / o
print(f"O={o} H={h} L={l} C={c} V={vol}")
print(f"实体 {body:+.2%}, 上影 {upper:.2%}, 下影 {lower:.2%}")
\`\`\`

预期输出：O=10.0 H=10.08 L=9.95 C=10.06 V=69；实体 +0.60%、上影 0.20%、下影 0.50%。**常见错误**：用 \`max(o, c)\` 之外的位置算影线（阳线实体上沿是 close，下沿才是 open）；对除权日的原始价格直接聚合（必须先复权，见《金融数据获取与处理》课程）。

## 图示

<Diagram type="candlestick" />

## 常见误区

1. **把 K 线形态当因果**。"锤子线必反转"没有稳定的统计支持；形态是**条件分布的粗描述**，量化上只作为特征进入模型，由回测决定权重。
2. **忽视采样期的选择偏差**。用日 K 回测日内策略、用不复权价格画长周期 K 线，都会得到系统性错误的形态。
3. **忘记 K 线是有损压缩**。极值出现的时间顺序、窗口内的路径信息全部丢失；需要路径时回到逐笔数据。

## 知识关联

- **向前**：第 1 章的订单簿决定了每笔成交如何产生；
- **向后**：下一节 VWAP 用 Volume 对价格加权；c2-l3 的信息驱动条重新思考"按什么切割窗口"；
- **平行**：K 线特征是《量化策略与因子研究》动量/反转因子的原材料。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| OHLCV | 撮合流的时间窗口聚合：首、最高、最低、末、量 |
| 几何特征 | 实体 = 净胜负；上下影线 = 极值被打回的幅度 |
| 有损性 | 路径与顺序不可恢复，极值时间未知 |

## 参考资料

- Nison, S., *Japanese Candlestick Charting Techniques*（New York Institute of Finance, 1991）——蜡烛图技术引入西方的标准著作。
- Harris, L., *Trading and Exchanges: Market Microstructure for Practitioners*（Oxford University Press, 2003）——成交如何产生、价格如何形成的微观结构教材。
`,
        tips: [
          {
            kind: 'pitfall',
            text: '千万不要对单根 K 线的技术形态过度迷信。现代量化统计表明，传统诸如「仙人指路」「射击之星」等形态在 A 股日线上的历史胜率仅略高于 50%，必须结合截面量价与多因子综合判断。',
          },
        ],
        demos: [
          {
            title: '从逐笔成交构造 K 线数据',
            lang: 'python',
            code: `ticks = [10.0, 10.2, 9.8, 10.5, 9.7, 10.1, 10.4]
volumes = [100, 200, 150, 300, 250, 100, 400]

candle_open = ticks[0]
candle_high = max(ticks)
candle_low = min(ticks)
candle_close = ticks[-1]
candle_volume = sum(volumes)

print("K线 OHLCV 数据:")
print(f"Open:  {candle_open}")
print(f"High:  {candle_high}")
print(f"Low:   {candle_low}")
print(f"Close: {candle_close}")
print(f"Volume: {candle_volume}")`,
          },
        ],
      },
      {
        id: 'quant-market-c2-l2',
        title: '经典量价关系与成交量加权价格（VWAP）',
        content: `
## 量是价的先行指标

在金融市场微观博弈中，**价格是共识的结果，而成交量是共识分歧与换手的度量**。

### 1. 成交量加权平均价（VWAP）

VWAP（Volume-Weighted Average Price）是机构交易员与量化执行算法最重要的基准指标：

$$VWAP = \\frac{\\sum_{i=1}^M P_i \\cdot V_i}{\\sum_{i=1}^M V_i}$$

**为什么机构关心 VWAP**：

| 角色 | 用途 |
| --- | --- |
| **买方交易员** | 考核执行质量（买入均价是否低于 VWAP）|
| **卖方交易员** | 考核执行质量（卖出均价是否高于 VWAP）|
| **量化算法** | 执行算法的目标基准（VWAP 算法）|
| **分析师** | 判断当日多空力量 |

**VWAP 的解读**：

* 当现价 $P_t > VWAP$ 时，表明日内买方整体处于盈利状态，盘面偏多；
* 当现价 $P_t < VWAP$ 时，表明日内追高者大部分被套牢，盘面承压。

<VwapDemo />

**VWAP 的计算示例**：

| 时间 | 价格 | 成交量 | 累计 P×V | 累计 V | VWAP |
| --- | --- | --- | --- | --- | --- |
| 09:30 | 10.00 | 1000 | 10,000 | 1,000 | 10.000 |
| 10:00 | 10.05 | 2000 | 30,100 | 3,000 | 10.033 |
| 10:30 | 9.98 | 1500 | 45,070 | 4,500 | 10.016 |
| 11:00 | 10.10 | 3000 | 75,370 | 7,500 | 10.049 |

**关键**：VWAP 是**累计值**，越到收盘越难被大幅改变（分母越来越大）。

**代码实现**：

    # 分时 VWAP
    df['vwap'] = (df['price'] * df['volume']).cumsum() / df['volume'].cumsum()

<VolumePriceDemo />

### 2. 量价配合与背离

* **量增价涨（Volume-Price Synchrony）**：增量资金进场，趋势具备延续性；
* **量缩价涨（Divergence）**：跟风意愿衰竭，无量空涨极易引发多头踩踏回落；
* **放量滞涨（Churning）**：高位成交量暴增但价格无法突破，往往意味着主力大单正在借势派发。

**四种量价组合**：

| 价 | 量 | 含义 | 操作建议 |
| --- | --- | --- | --- |
| ↑ | ↑ | **量增价涨**：健康上涨 | 持有/加仓 |
| ↑ | ↓ | **量缩价涨**：无量空涨 | 警惕，减仓 |
| ↓ | ↑ | **放量下跌**：恐慌抛售 | 观望，等企稳 |
| ↓ | ↓ | **缩量下跌**：无人接盘 | 可能见底 |

**注意**：这只是概率性的经验规律，不是必然。

### 3. VWAP 与 TWAP 的对比

| 指标 | 公式 | 特点 | 适用 |
| --- | --- | --- | --- |
| **VWAP** | Σ(P×V) / ΣV | 按成交量加权 | 流动性好的标的 |
| **TWAP** | Σ(P×t) / Σt | 按时间加权 | 流动性差/大宗 |

**为什么需要 TWAP**：当单笔订单很大时，VWAP 算法会集中在成交量大的时段下单（因为要匹配成交量分布），
这会导致自己的交易推高价格。TWAP 均匀分布时间，冲击更小。

**执行算法的选择**：

    # VWAP 算法：按历史成交量分布下单
    # 如果 10:00-10:30 通常占全天 15% 成交量
    # 就在这个时段下 15% 的订单
    
    # TWAP 算法：平均分配
    # 9:30-15:00 共 240 分钟，每分钟下 1/240

### 4. 一个常被忽略的细节

**VWAP 不能用于预测**：

VWAP 是**滞后指标**——它是已经发生交易的平均价。
把它当"支撑位/阻力位"用是常见的误用。

**正确用法**：
- **执行基准**：算法交易的绩效评估
- **日内强弱判断**：现价 vs VWAP 的位置
- **机构成本估算**：大资金的平均建仓成本

**错误用法**：
- "价格会回到 VWAP"——没有必然性
- "VWAP 是支撑位"——它只是一个统计量

## 本节来源

> **来源类型：学术来源**
> - Berkowitz, S. A., Logue, D. E., Noser, E. A. *The Total Cost of Transactions on the NYSE*
>   Journal of Finance（1988，VWAP 的早期研究）
> - Almgren, R., Chriss, N. *Optimal Execution of Portfolio Transactions*
>   Journal of Risk（2000，最优执行理论）
>
> **来源类型：参考资料**
> - Larry Harris, *Trading and Exchanges*，Chapter 12（交易成本）
>
> **来源类型：原创**
> - 全部导读文字、交互图示、代码示例与习题
`,
        tips: [
          {
            kind: 'interview',
            text: '券商机构算法交易为何把「击败 VWAP」作为 KPI？因为大机构买入 1 亿元股票不能一次性吃单，若算法全天买入的均价低于全天市场 VWAP，则说明为客户节省了交易成本。',
          },
        ],
      },
      {
        id: 'quant-market-c2-l3',
        title: '时序采样与信息驱动条（Information-driven Bars）',
        content: `
## 学习目标

学完本节，你应该能够：
1. 说出 Time Bar 的两大统计缺陷（采样强度不均、收益率异方差/厚尾）；
2. 定义 Tick / Volume / Dollar 三种信息驱动条，并解释 Dollar Bar 为什么更接近 I.I.D.；
3. 亲手从逐笔数据构造 Dollar Bar，并对比两种采样下的收益率分布差异。

## 前置知识

- K 线聚合（上一节：OHLCV 由窗口内撮合流聚合而来）；
- 厚尾与异方差的概念（《金融数学》课程 c1-l2：波动率聚集使等间隔收益方差随时间变化）；
- 上一章的对数收益率。

## 问题背景：按时钟采样错在哪里

传统图表按**时钟**均匀切片（1 分钟、日线）。但市场不按恒定节奏运转：A 股开盘与收盘半小时常占全天成交的 30–40%，午间与午后交投稀疏。等时间隔切割的后果：
- **清淡期**：切出大量几乎没有信息的小 K 线——噪声采样；
- **密集期**：一根 K 线吞掉剧烈的信息爆发——欠采样；
- **统计后果**：Time Bar 收益率的方差随成交强度漂移（异方差）、尾部更厚、序列相关更强——这恰恰违反多数统计与机器学习模型"近似 I.I.D."的假设。

## 直觉理解：按"事情发生"采样，而不是按"钟表走"采样

记录一场足球赛有两种方式：每 5 分钟记一行（不管有没有进攻），或**每次射门记一行**。研究进攻效率时，第二种采样让每个样本携带的信息量大体相当。市场同理：**以信息载体（成交笔数/量/金额）为切分依据**，让每根 bar 代表"一单位市场活动"，而不是"一单位时间"。

## 核心概念：三大信息驱动条（López de Prado, 2018, Ch.2）

| 类型 | 切分规则 | 直觉 |
| --- | --- | --- |
| Tick Bar | 每累计 $N$ 笔成交切一根 | 每根 bar 含等量"成交事件" |
| Volume Bar | 每累计 $V$ 股切一根 | 每根 bar 含等量"成交股数" |
| Dollar Bar | 每累计 $M$ 元成交额切一根 | 每根 bar 含等量"成交金额" |

## 原理详解：Dollar Bar 为什么更接近 I.I.D.

1. **价格水平自适应**：股价从 10 元涨到 20 元，同样的"信息流"对应的股数减半。Volume Bar 每根含等量股数，高价期实际信息被压缩；Dollar Bar 按金额切分，自动完成"按市值比例采样"。
2. **异方差缓解**：成交金额与市场不确定性高度相关（大单与价格变化相伴出现），等金额采样让每根 bar 承载的"美元权重信息"大体均匀，收益率方差更接近常数。
3. **厚尾减轻**：实证上，Dollar Bar 收益率的峰度显著低于同标的的 Time Bar——更接近模型偏好的钟形。

注意措辞：是**缓解**而非根除——第 1 章讲过的厚尾与波动聚集是市场本性，采样方式只能减少"人为叠加"的那部分统计病灶。

## 完整案例：手算 Dollar Bar 切分

逐笔成交（价, 股数），阈值 $M = 100{,}000$ 元：

| 笔 | 价 | 股数 | 金额（元） | 累计（元） | 动作 |
| --- | --- | --- | --- | --- | --- |
| 1 | 10.00 | 6,000 | 60,000 | 60,000 | 继续累计 |
| 2 | 10.02 | 3,000 | 30,060 | 90,060 | 继续累计 |
| 3 | 10.05 | 1,200 | 12,060 | 102,120 | **切 bar**：O=10.00, C=10.05, V=10,200 |
| 4 | 10.05 | 2,000 | 20,100 | 20,100 | 新 bar 开始 |

每根 bar 的 OHLCV 用上一节的聚合规则计算。**注意**：最后一笔成交把累计金额顶过阈值时，通常**整笔划入当前 bar**（简单法），或按金额比例拆分（精确法）——工程上要固定一种并写进文档。

## 代码实践

\`\`\`python
ticks = [(10.00, 6000), (10.02, 3000), (10.05, 1200), (10.05, 2000),
         (10.08, 4000), (10.03, 3000), (10.10, 1500)]
M = 100_000

bars, o = [], None
cum, vol, hi, lo, c = 0.0, 0, None, None, None
for price, qty in ticks:
    if o is None:
        o = hi = lo = price
    cum += price * qty
    vol += qty
    hi, lo, c = max(hi, price), min(lo, price), price
    if cum >= M:                     # 达到金额阈值，切出一根 bar
        bars.append((o, hi, lo, c, vol, round(cum, 0)))
        o, cum, vol, hi, lo = None, 0.0, 0, None, None
for b in bars:
    print("O=%.2f H=%.2f L=%.2f C=%.2f V=%d ¥=%.0f" % b)
\`\`\`

预期输出（实测）：两根 bar——第一根 O=10.00, H=10.05, L=10.00, C=10.05, V=10,200, ¥=102,120；剩余 4 笔累计 105,660 元再切一根 O=10.05, H=10.10, L=10.03, C=10.10, V=10,500。**常见错误**：阈值 $M$ 直接拍一个全样本常数（应按滚动分位数自适应，且**只能用截至当期的历史**，否则引入未来函数）；bar 内 OHLC 更新遗漏首笔初始化。

## 常见误区

1. **"信息条能直接提高收益率"**。它改善的是**输入数据的统计质量**（更接近 I.I.D.），让模型估计更稳；策略赚不赚钱仍取决于信号本身。
2. **阈值用全样本统计量设定**。用全历史成交量中位数定 $M$，等于把未来信息泄入过去——数据泄漏的隐蔽形态（本课程反复强调，回测章节还会回到它）。
3. **忽视 bar 数量的季节漂移**。市场活跃度长期变化会让单位时间的 bar 数漂移，跨期比较前要做标准化。

## 知识关联

- **向前**：上一章对数收益率与厚尾检验为"Time Bar 有病"提供了诊断工具（对 Dollar Bar 收益率重跑 JB 检验，峰度应明显下降——很好的练习）；
- **向后**：信息驱动条是《机器学习与量化交易》课程特征工程的标准前置步骤；
- **出处**：本节框架来自 López de Prado《Advances in Financial Machine Learning》（2018）第 2 章。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| Time Bar 缺陷 | 噪声过采样 + 信息欠采样 → 异方差、厚尾、自相关 |
| 三种信息条 | Tick（笔数）/ Volume（股数）/ Dollar（金额） |
| Dollar Bar 优势 | 按市值比例采样，方差更稳、更接近 I.I.D. |
| 工程铁律 | 阈值自适应且仅用历史数据，避免未来函数 |

## 参考资料

- López de Prado, M., *Advances in Financial Machine Learning*（Wiley, 2018），Chapter 2 "Financial Data Structures" —— 本节三种信息条的直接出处。
- Harris, L., *Trading and Exchanges*（Oxford University Press, 2003）：成交强度与日内 U 型分布的微观结构背景。
`,
        tips: [
          {
            kind: 'note',
            text: '参考来源：Marcos Lopez de Prado《Advances in Financial Machine Learning》Chapter 2: Financial Data Structures。',
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'quant-market-c2-e1',
        type: 'single',
        difficulty: 1,
        question: '一根典型的日阳线（收盘价高于开盘价）中，上影线的顶端代表什么价格？',
        options: [
          { value: 'A', text: '开盘价' },
          { value: 'B', text: '收盘价' },
          { value: 'C', text: '最高价' },
          { value: 'D', text: '结算价' },
        ],
        answer: 'C',
        explanation: '无论是阳线还是阴线，上影线的最高顶端始终代表当期交易的最高价（High），下影线的底端始终代表最低价（Low）。',
        tags: ['K线基础', '图形认知'],
      },
      {
        id: 'quant-market-c2-e2',
        type: 'judge',
        difficulty: 1,
        question: '如果两只股票在当天的 K 线四价（开盘、最高、最低、收盘）完全相同，则它们在盘中的价格运动轨迹和成交量分布也必定完全一致。',
        answer: false,
        explanation: '错误。K 线是对连续交易流的有损压缩，无法记录盘中波动的时序先后路径与成交量在各价位的集中度。两只相同 K 线的股票盘中走势可能截然不同。',
        tags: ['K线局限性', '微观结构'],
      },
      {
        id: 'quant-market-c2-e3',
        type: 'multiple',
        difficulty: 2,
        question: '成交量加权平均价（VWAP）在量化投资中的典型用途包括：（多选）',
        options: [
          { value: 'A', text: '作为衡量大额订单算法执行质量的标准基准' },
          { value: 'B', text: '作为日内技术策略中判断多空强弱的动态均线支撑/阻力位' },
          { value: 'C', text: '计算单期连续复利时消除价格波动的平滑器' },
          { value: 'D', text: '在交易拆单算法中指导每个时间段的目标委托量分配' },
        ],
        answer: ['A', 'B', 'D'],
        explanation: 'VWAP 广泛用于机构执行绩效评估（A）、日内技术分析基准（B）以及拆单算法（D）。C 选项属于不当捏造，连续复利与 VWAP 无关。',
        tags: ['VWAP', '机构执行'],
      },
      {
        id: 'quant-market-c2-e4',
        type: 'fill',
        difficulty: 2,
        question: '某股票日内发生了 3 笔成交：第一笔 10.0 元成交 100 手，第二笔 10.2 元成交 200 手，第三笔 10.5 元成交 200 手。则全天成交量加权平均价（VWAP）为 ___ 元。',
        blanks: [['10.28', '10.28元']],
        explanation: '总金额 = 10.0 × 100 + 10.2 × 200 + 10.5 × 200 = 1000 + 2040 + 2100 = 5140。总手数 = 100 + 200 + 200 = 500。VWAP = 5140 / 500 = 10.28 元。',
        tags: ['VWAP计算', '基础公式'],
      },
      {
        id: 'quant-market-c2-e5',
        type: 'code',
        difficulty: 2,
        question: '编写函数 calculate_vwap(prices, volumes)，接收长度相等的两组浮点数列表，返回该周期的成交量加权平均价 VWAP。',
        starterCode: `def calculate_vwap(prices, volumes):
    pass
`,
        expectedOutput: 'VWAP 浮点数值',
        tests: `p = [10.0, 10.2, 10.5]
v = [100, 200, 200]
assert abs(calculate_vwap(p, v) - 10.28) < 1e-5
assert abs(calculate_vwap([20.0], [50]) - 20.0) < 1e-5`,
        answer: `def calculate_vwap(prices, volumes):
    total_val = sum(p * v for p, v in zip(prices, volumes))
    total_vol = sum(volumes)
    return total_val / total_vol

calculate_vwap([10.0, 10.2, 10.5], [100, 200, 200])`,
        explanation: '使用 zip 迭代价格和成交量，分别求总金额和总成交量后相除。',
        tags: ['VWAP', 'Python编程'],
      },
      {
        id: 'quant-market-c2-e6',
        type: 'single',
        difficulty: 3,
        question: '某股票在经历连续单边上涨后，当日创下历史新高，但成交量相比前几日大幅萎缩（缩量新高），次日收出一根带长上影线的阴线。这一量价现象通常提示：',
        options: [
          { value: 'A', text: '多头力量极其充沛，主力完全控盘即将加速暴涨' },
          { value: 'B', text: '量价背离，高位跟风动能不足且遭遇上方获利抛压，存在筑顶回调风险' },
          { value: 'C', text: '市场完全处于有效市场弱式有效状态' },
          { value: 'D', text: '对数收益率等于离散收益率' },
        ],
        answer: 'B',
        explanation: '价格创新高而成交量背离萎缩，伴随长上影线阻击，说明高位买方承接力枯竭，空头反扑，是经典的高位量价背离警示信号。',
        tags: ['量价分析', '行情解读'],
      },
      {
        id: 'quant-market-c2-e7',
        type: 'code',
        difficulty: 3,
        question: '实现函数 candle_shadow_ratios(o, h, l, c)，计算并返回一根 K 线的 (上影线比率, 下影线比率)。\n\n上影线比率 = (h - max(o, c)) / (h - l)，下影线比率 = (min(o, c) - l) / (h - l)。若 h == l，返回 (0.0, 0.0)。',
        starterCode: `def candle_shadow_ratios(o, h, l, c):
    pass
`,
        expectedOutput: '元组 (上影线比率, 下影线比率)',
        tests: `assert candle_shadow_ratios(10.0, 10.0, 10.0, 10.0) == (0.0, 0.0)
u, d = candle_shadow_ratios(100.0, 110.0, 90.0, 105.0)
assert abs(u - 0.25) < 1e-5
assert abs(d - 0.5) < 1e-5`,
        answer: `def candle_shadow_ratios(o, h, l, c):
    if h == l:
        return (0.0, 0.0)
    rng = h - l
    upper = (h - max(o, c)) / rng
    lower = (min(o, c) - l) / rng
    return (upper, lower)

candle_shadow_ratios(100.0, 110.0, 90.0, 105.0)`,
        explanation: '根据开盘价和收盘价的极大值/极小值分别计算上下影线长度，再除以全天振幅 (h - l)。',
        tags: ['特征工程', 'K线计算'],
      },
      {
        id: 'quant-market-c2-e8',
        type: 'open',
        difficulty: 3,
        question: '在经典量化高频因子研究中，研究员为什么常用「成交量条（Volume Bar）」或「金额条（Dollar Bar）」替代传统的「时间条（Time Bar，如固定5分钟K线）」？试从市场波动节律与统计正态性角度分析。',
        referenceAnswer: `1. 采样与市场活跃度失配问题：
传统 Time Bar 按照钟表时间均匀采样，但在开盘和收盘前交易极度活跃，而午休或午盘前交投冷清。Time Bar 会导致清淡期产生大量无信息量的噪声K线，而在剧烈波动期（数秒内几万手成交）无法及时反映真实价格演变。

2. 统计学特性改善（更接近 I.I.D. 正态分布）：
Marcos Lopez de Prado 在《Advances in Financial Machine Learning》中指出：金融资产交易的微观本质是按信息事件（Event）驱动的。采用固定成交量或成交金额的 Dollar Bar 抽样，抽样频率会随市场信息流自动加速或减慢，能够显著缓解收益率序列的厚尾异方差现象，使采样后的收益率更接近独立同分布（I.I.D.）正态分布，提升下游机器学习模型的鲁棒性。`,
        rubric: [
          { point: '指出传统 Time Bar 与市场真实信息流/活跃度不均匀之间的冲突', score: 50 },
          { point: '从信息驱动或改善收益率分布特性（缓解厚尾、接近 I.I.D.）角度说明 Dollar Bar 的优势', score: 50 },
        ],
        keywords: ['Time Bar', 'Dollar Bar', '信息流', '厚尾', 'IID', '采样'],
        explanation: 'Time Bar 在交投清淡与活跃期采样失配；Dollar Bar 按信息事件驱动采样，能有效平滑异方差并使收益率更接近 I.I.D. 正态分布。',
        tags: ['高频采样', '时序表征', '学术前沿'],
      },
      {
        id: 'quant-market-c2-e9',
        type: 'multiple',
        difficulty: 2,
        question: '下列关于常见 K 线形态在量化交易中应用局限性的描述，正确的有：（多选）',
        options: [
          { value: 'A', text: 'K 线形态受时间框架选择影响极大（如 5 分钟图上的反转形态在日线图上可能只是微小噪音）' },
          { value: 'B', text: '极端单笔偶发异常成交（乌龙指）会导致日 K 线产生虚假的长影线' },
          { value: 'C', text: 'K 线形态无法区分盘中大单主动吃单成交与小单被动挂单撮合的区别' },
          { value: 'D', text: '只要严格按照经典技术分析教科书中的看涨吞没形态交易，胜率可达 100%' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: 'A、B、C 均为 K 线在实战量化中的真实信息损失与局限。D 选项荒谬，任何单技术指标均无法保证绝对胜率。',
        tags: ['技术形态局限', '微观结构'],
      },
      {
        id: 'quant-market-c2-e10',
        type: 'code',
        difficulty: 3,
        question: '编写函数 generate_dollar_bars(ticks, threshold_dollar=100000.0)，输入逐笔成交元组列表 ticks（每项为 (价格, 股数)），当累计成交金额（价格 × 股数）达到或超过 threshold_dollar 时切出一根 K 线。\n\n返回切出的每根 Dollar Bar 的收盘价列表。剩余未满足阈值的尾部数据舍弃。',
        starterCode: `def generate_dollar_bars(ticks, threshold_dollar=100000.0):
    pass
`,
        expectedOutput: 'Dollar Bar 收盘价列表',
        tests: `data = [(10.0, 5000), (10.2, 6000), (10.5, 10000), (10.4, 2000)]
# 10*5000=50000, + 10.2*6000=61200 -> total 111200 >= 100000 -> bar1 close = 10.2
# 10.5*10000=105000 >= 100000 -> bar2 close = 10.5
res = generate_dollar_bars(data, 100000.0)
assert res == [10.2, 10.5]`,
        answer: `def generate_dollar_bars(ticks, threshold_dollar=100000.0):
    bars_close = []
    cum_dollar = 0.0
    for p, v in ticks:
        cum_dollar += p * v
        if cum_dollar >= threshold_dollar:
            bars_close.append(p)
            cum_dollar = 0.0
    return bars_close

generate_dollar_bars([(10.0, 5000), (10.2, 6000), (10.5, 10000)], 100000.0)`,
        explanation: '累计金额达到阈值时输出当笔价格作为该 Dollar Bar 的收盘价，并重置累计器。',
        tags: ['Dollar Bar', '数据重采样', 'Python编程'],
      },
    ],
  },

  /* ══════════════════════════════════════════════════════════════════
     第 3 章：交易成本、杠杆机制与典型投资策略
     ══════════════════════════════════════════════════════════════════ */
  {
    id: 'quant-market-c3',
    title: '交易成本、杠杆机制与典型投资策略',
    goal: '全面掌握显性佣金税费与隐性市场冲击的度量，理解做空机制与杠杆风险，建立主被动量化投资框架。',
    lessons: [
      {
        id: 'quant-market-c3-l1',
        title: '交易摩擦全解：显性成本与隐性冲击',
        content: `
## 学习目标

学完本节，你应该能够：
1. 列出显性与隐性交易成本的完整清单，并说出各自的大致量级（A 股口径）；
2. 用平方根定律估算大单的市场冲击；
3. 给定换手率与成本假设，手算成本对年化收益的拖累，解释"回测赚钱、实盘亏钱"的第一大来源。

## 前置知识

- 第 1 章的限价单/市价单与买卖价差（隐性成本的主要成分来自"跨越价差"）；
- 百分比与年化复利的基本运算；
- 下一节将把"成本后收益"与 Alpha 概念连接。

## 问题背景：纸上富贵与实盘亏损的护城河

回测报告里那条平滑上升的资金曲线，几乎总是用"以收盘价成交、零成本（或仅佣金）"的假设画出来的。真实世界里，每一笔交易都要**跨过买卖价差、推动价格、缴纳费用**。策略的毛收益越薄、换手越高，摩擦吞掉的比例就越大——这是量化新手上线即亏损的第一大原因，也是本课反复强调"先算成本再谈收益"的原因。

## 核心概念：成本全景表（A 股口径）

**显性成本**（交割单上看得见）：

| 成本 | 收取方 | 量级（2026 年实务常见值） |
| --- | --- | --- |
| 佣金 | 券商 | 万 1 – 万 2.5，双边，常有 5 元最低收费 |
| 印花税 | 国家税收 | **卖出单边 0.05%**（2023-08-28 起减半，财政部/税务总局 2023 年第 39 号公告） |
| 过户费/经手费 | 中登/交易所 | 双边合计约十万分之几 |

**隐性成本**（交割单上看不见，但真实存在）：

| 成本 | 机制 | 量级 |
| --- | --- | --- |
| 半价差成本 | 市价单立即成交必须"买在 ask、卖在 bid" | 价差的一半，流动性好的大盘股约 0.02–0.1% |
| 市场冲击 | 自身订单推动价格的不利变动 | 与单笔规模非线性相关（见下） |
| 机会成本 | 限价单挂而不成交、错过行情 | 策略相关 |
| 择时成本 | 拖延执行期间价格漂移 | 波动越大越高 |

## 原理详解：冲击的平方根定律

实证研究（Almgren 等，2005）发现，把单笔订单规模 $Q$ 相对于该股日均成交量 $V$、日波动率 $\\sigma$ 做无量纲化后，冲击成本近似满足：

$$\\text{Impact} \\propto \\sigma \\sqrt{\\frac{Q}{V}}$$

三个可直接检验的推论：
1. **非线性**：订单翻倍，冲击只增至约 $\\sqrt{2} \\approx 1.41$ 倍——但绝非线性外推；
2. **波动放大冲击**：高波动日拆单更贵；
3. **流动性稀释冲击**：同样 100 万单，在日成交 5000 万的股票里冲击远小于日成交 5000 万的 1/10 的股票。

## 完整案例：一笔 300 万市价买单的全成本核算

设某大盘股：买一卖一报价 10.00 / 10.01（价差 0.1%），日均成交 8,000 万元，日波动率 2%。

| 项目 | 计算 | 金额（元） | 占名义比 |
| --- | --- | --- | --- |
| 半价差 | 300 万 × 0.05% | 1,500 | 0.05% |
| 冲击（√定律粗估） | 2% × √(300/8000) ≈ 2% × 0.194 ≈ 0.39%，实务系数再打折取 0.12% | 3,600 | 0.12% |
| 佣金（万 2.5） | 300 万 × 0.025% | 750 | 0.025% |
| 印花税 | 买入免征 | 0 | 0 |
| **买入合计** | | **5,850** | **≈0.20%** |

一买一卖（卖出加 0.05% 印花税、再各来一遍半价差与冲击）约 **0.45–0.50%**。若策略月换手 100%（年 12 倍），年成本拖累约 $12 \\times 0.5\\% = 6\\%$——**年化毛收益低于 6% 的高换手策略，扣费后基本归零**。这一行减法必须在回测阶段就做掉。

## 代码实践

\`\`\`python
def roundtrip_cost(notional, spread_bps, impact_bps, commission_bps=2.5, stamp_bps=5.0):
    # 一买一卖的总成本占名义本金比例（bps）
    one_side = spread_bps / 2 + commission_bps          # 半价差 + 佣金
    buy = one_side + impact_bps
    sell = one_side + impact_bps + stamp_bps            # 卖出加印花税
    total_bps = buy + sell
    return total_bps, notional * total_bps / 10_000

for turnover in (1, 4, 12):      # 年换手倍数
    bps, yuan = roundtrip_cost(1_000_000, spread_bps=10, impact_bps=12)
    print(f"单次往返 {bps:.0f} bps；年换手 {turnover} 倍 -> 拖累 {turnover*bps/100:.2f}%")
\`\`\`

预期输出：单次往返约 44 bps；年换手 1/4/12 倍分别拖累约 0.44% / 1.76% / 5.28%。**常见错误**：只把佣金写进回测（漏价差与冲击，成本被低估 5–10 倍）；冲击按固定比例线性外推到更大单（违反 √ 定律）；用全仓均值成本掩盖"大单才是贵单"的结构性事实。

## 常见误区

1. **"成本是小事，年化才零点几"**。成本是**乘换手**的：0.5% 的单次成本对月度换手策略就是每年 6%。
2. **隐性成本不记账**。半价差与冲击不出现在交割单里，但它们真实改变了成交均价——用 TWAP/VWAP 基准对比实际成交价即可度量（执行落差，见《实盘交易系统》）。
3. **小样本回测看不出成本敏感性**。应像上例一样做换手 × 成本的敏感性表格，观察净收益曲面何时翻负。

## 知识关联

- **向前**：第 1 章的订单簿与价差是隐性成本的微观基础；上一章 VWAP 给出"公允成交价"的度量基准；
- **向后**：下一节的 Alpha 必须以"扣费后"定义才有意义；《策略回测》课程要求回测引擎默认内置成本模型；
- **平行**：《金融数学》c3-l2 的配对交易案例已给出单回合成本核算的样例。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 显性成本 | 佣金（万 1–2.5 双边）+ 印花税（0.05% 卖出单边）+ 规费 |
| 隐性成本 | 半价差 + 冲击（∝ σ√(Q/V)）+ 机会/择时成本 |
| 年化拖累 | 单次往返成本 × 年换手倍数 |
| 铁律 | 回测必须内置完整成本模型；毛收益不抵成本的高换手策略直接否决 |

## 参考资料

- Harris, L., *Trading and Exchanges*（Oxford University Press, 2003）：交易成本与流动性的系统处理（Part II）。
- Almgren, R., Thum, C., Hauptmann, E., & Li, H. (2005). "Direct Estimation of Equity Market Impact." *Risk*, 18(7) —— 平方根冲击定律的实证出处。
- 财政部、税务总局公告 2023 年第 39 号《关于减半征收证券交易印花税的公告》（2023-08-28 起生效，已核验）。
`,
        tips: [
          {
            kind: 'pitfall',
            text: '在回测 A 股日频及高频策略时，绝不能只设万三佣金！必须严格区分买入无印花税、卖出有 0.05% 印花税，以及单笔 5 元的最低收费（碎单策略杀手）。',
          },
        ],
      },
      {
        id: 'quant-market-c3-l2',
        title: '主动管理与被动投资：CAPM、Alpha 与 Beta 认知',
        content: `
## 学习目标

学完本节，你应该能够：
1. 写出 CAPM 的证券市场线公式，解释 $\\beta$ 与 $\\alpha$ 的含义；
2. 用 5 期数据手算 OLS 估计 $\\hat{\\alpha}$、$\\hat{\\beta}$；
3. 说明主动管理与被动管理、市场中性策略各自赚的是什么钱，以及为什么 **Alpha 必须以扣费后口径定义**。

## 前置知识

- 协方差、方差与一元线性回归的最小二乘解（$\\hat\\beta = \\mathrm{Cov}(R_i, R_m)/\\mathrm{Var}(R_m)$）；
- 无风险利率概念（《金融数学》c1-l1 的国债收益率）；
- 成本核算（上一节：Alpha 的"净额"要扣掉它）。

## 问题背景：你赚的是市场的钱，还是本事的钱

长期看，股票市场整体向上，"随便买指数"就能赚到这份系统性回报（Beta）。于是所有专业投资者的第一问都是：**剔除市场涨跌后，你还剩下多少超额收益（Alpha）？** Sharpe（1964）与 Lintner（1965）的 CAPM 给出了把收益拆成"市场补偿 + 特质超额"的标准框架——它未必精确描述现实，但它是全行业谈论业绩的通用语言。

## 直觉理解：天气与农场

把市场收益想象成**天气**，个股想象成**农场**：
- $\\beta = 1$：收成与天气同幅波动（普通田）；
- $\\beta = 1.5$：天气好时增产更多，旱涝时减产也更狠（山坡田，弹性大）；
- $\\alpha > 0$：无论天气如何，这块地总比"天气决定的基准收成"多产一截——**土壤（管理层/护城河/错误定价）带来的真实增值**。

农场主可以出售劳动力换稳定收入（对冲掉天气风险），只剩下土壤的净贡献——这正是市场中性策略的雏形。

## 核心概念：证券市场线（SML）

$$E(R_i) - R_f = \\beta_i \\,[\\,E(R_m) - R_f\\,] + \\alpha_i$$

- $R_f$：无风险利率；$E(R_m) - R_f$：**市场风险溢价**；
- $\\beta_i = \\dfrac{\\mathrm{Cov}(R_i, R_m)}{\\mathrm{Var}(R_m)}$：对系统性风险的敏感度；
- $\\alpha_i$：回归截距——超出线上的部分。CAPM 的理论断言是均衡时 $\\alpha = 0$；**量化投资的全部生意，就是在现实市场里寻找 $\\alpha \\neq 0$ 并赶在它消失前捕获**。

估计式即一元回归：$R_{i,t} = \\alpha + \\beta R_{m,t} + \\varepsilon_t$。

## 完整案例：5 期数据手算 α、β

市场与个股的 5 期超额收益（%）：

| 期 | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- |
| 市场 $R_m$ | 2.0 | −1.0 | 3.0 | 0.5 | −2.5 |
| 个股 $R_i$ | 3.2 | −1.4 | 4.4 | 0.9 | −3.1 |

均值：$\\bar R_m = 0.4\\%$，$\\bar R_i = 0.8\\%$。离差表：

| 期 | $R_m - \\bar R_m$ | $R_i - \\bar R_i$ | 乘积 |
| --- | --- | --- | --- |
| 1 | 1.6 | 2.4 | 3.84 |
| 2 | −1.4 | −2.2 | 3.08 |
| 3 | 2.6 | 3.6 | 9.36 |
| 4 | 0.1 | 0.1 | 0.01 |
| 5 | −2.9 | −3.9 | 11.31 |

$$\\hat\\beta = \\frac{\\sum (R_m - \\bar R_m)(R_i - \\bar R_i)}{\\sum (R_m - \\bar R_m)^2} = \\frac{27.60}{19.70} \\approx 1.40$$

$$\\hat\\alpha = \\bar R_i - \\hat\\beta \\bar R_m = 0.8 - 1.40 \\times 0.4 \\approx 0.24\\%$$

解读：$\\hat\\beta = 1.40$（进攻型，市场涨 1% 它平均涨 1.4%），$\\hat\\alpha \\approx +0.24\\%$（5 期内小幅跑赢证券市场线）。但样本只有 5 期，$\\hat\\alpha$ 的标准误远大于其本身——**统计上与零无法区分**（呼应《金融数学》c2-l1 的功效问题）。

## 常见误区

1. **beta 不稳定**。不同窗口、不同频率、不同基准指数估出的 beta 可以差 0.5 以上；实务用滚动窗口 + 收缩估计（向 1 收缩）。
2. **样本内 alpha ≠ 未来 alpha**。回归拟合出的 $\\hat\\alpha$ 天然为正的偏误来自幸存者与多重尝试；下一节融资杠杆会放大这个错误。
3. **高 beta ≠ 高质量**。beta 只描述波动放大倍数，不包含任何"好"的评价；杠杆可以人工制造任何 beta。
4. **忘记费用**。论文里的 alpha 是毛的；你的 alpha = 毛 alpha − 全部成本（上一节）− 融资利息（下一节）。

## 知识关联

- **向前**：成本核算决定 alpha 的净额；波动率（金融数学 c1-l2）决定 beta 的估计噪声；
- **向后**：《量化策略与因子研究》的因子模型（Fama-French）是"多因子版 CAPM"；市场中性 = 剥离 beta 只留 alpha；
- **平行**：《投资组合与风险管理》用 beta 聚合组合的系统性敞口。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| SML | $E(R_i) - R_f = \\beta_i [E(R_m) - R_f] + \\alpha_i$ |
| beta | $\\mathrm{Cov}/\\mathrm{Var}$，系统性敏感度；估计窗口敏感 |
| alpha | 扣市场、扣费后的真实超额；样本内易假阳 |
| 两种生意 | 被动赚 beta（低费率）；主动赚净 alpha（难且在消失） |

## 参考资料

- Sharpe, W. F. (1964). "Capital Asset Prices: A Theory of Market Equilibrium under Conditions of Risk." *Journal of Finance*, 19(3), 425–442 —— CAPM 原始论文。
- Lintner, J. (1965). "The Valuation of Risk Assets and the Selection of Risky Investments in Stock Portfolios and Capital Budgets." *Review of Economics and Statistics*, 47(1), 13–37。
- Bodie, Z., Kane, A., & Marcus, A. J., *Investments*（McGraw-Hill, 12th ed., 2021）：CAPM 与指数化投资的教材标准处理。
`,
        tips: [
          {
            kind: 'interview',
            text: '经典问答：「Alpha 策略为什么要对冲 Beta？」因为市场暴跌 30% 时，一个跑赢大盘 10% 的股票多头依然会巨亏 20%；通过做空期指剥离 Beta 后，无论大盘涨跌，策略都能稳定净赚 10% 的纯 Alpha。',
          },
        ],
      },
      {
        id: 'quant-market-c3-l3',
        title: '信用交易、融券做空与轧空风险（Short Squeeze）',
        content: `
## 学习目标

学完本节，你应该能够：
1. 说明融资买入与融券卖出的完整机制（借什么、还什么、利息与保证金怎么算）；
2. 手算杠杆仓位在上涨/下跌情形下的收益率与维持担保比例，找出强平点；
3. 解释轧空（Short Squeeze）的形成链条，以及为什么做空的风险结构天然劣于做多。

## 前置知识

- 现货做多机制与"股票代表公司所有权"（第 1 章）；
- 百分比收益率计算；
- 下一节（课程后续）的风险管理会用本节的维持担保比例概念。

## 问题背景：为什么需要做空

只做多的市场是"半残"的价格发现机器：只有乐观者能用钱投票，悲观者只能离场观望。融券卖出让悲观者也能表达观点，**收紧了价格偏离基本面的空间**——做空不是"做空国家"，而是价格发现机制的另一半。但对个体投资者，做空有独特的、必须先算清楚的风险结构。

## 核心概念：两融机制

**融资买入（Margin Buying，做多加杠杆）**：向券商借钱买股票。
- 借入本金，到期还本付息（融资年利率常见 5–8%，随券商与市场浮动）；
- 自有资金作为**保证金**，整个账户价值充当担保。

**融券卖出（Short Selling，做空）**：向券商**借股票**卖出，未来买回同等数量归还。
- 盈亏 = 卖出价 − 买回价 − 融券费用（年化常见 8–10%，券源紧张时更高）；
- 卖出所得资金冻结在账户，与自有资金一起构成担保品。

**维持担保比例**（A股两融核心风控线）：

$$\\text{维持担保比例} = \\frac{\\text{现金} + \\text{证券市值}}{\\text{融资金额} + \\text{融券证券市值}}$$

实务常见约定（各券商略有差异，以合同为准）：**警戒线约 150%，平仓线约 130%**——低于警戒线会被要求追加担保，低于平仓线未补足则被**强制平仓**。

## 原理详解：杠杆的收益放大与强平点

设本金 100 万，融资 100 万（利率 6%），全仓买入 200 万股票。

**上涨 10%**：市值 220 万，归还 100 万本金 + 6 万利息 → 净值 114 万，**收益率 +14%**（杠杆 2 倍，扣除利息）。
**下跌 15%**：市值 170 万，若清偿债务 → 净值 64 万，**收益率 −36%**。
**强平点**：设股价从买入价下跌比例为 $d$，维持担保比例 = $200(1-d) / 100 = 2(1-d)$。令其等于 1.3：$d = 35\\%$——**跌 35% 即触及平仓线**（若券商不通知追保直接平仓；追保会发生在 150% 即 $d = 25\\%$ 时）。

看清结构：杠杆把 2 倍的波动塞进你的账户，但下行在 −35% 处被**强制截断**——上行无截断、下行有悬崖，这就是杠杆收益分布的**负偏加剧**（呼应《金融数学》c1-l2）。

## 完整案例：轧空链条——GameStop 2021

2021 年 1 月，GameStop（GME）事件是教科书级轧空：
1. 部分对冲基金大额融券做空，**空头股数一度超过流通股的 100%**（存在重复借出）；
2. Reddit 论坛散户协同买入，股价数日从约 20 美元推至 483 美元盘中高点；
3. 空头浮亏随股价线性放大且**理论上无上限**；保证金不足 → 强制平仓 = **买入** → 进一步推升股价 → 更多空头爆仓——正反馈踩踏；
4. 券商限制交易、空头巨亏平仓，事件成为市场微观结构与监管的标志性案例（SEC 事后发布专门报告）。

关键认识：做多的最大亏损是 −100%（股价归零），**做空的亏损无上限**（股价可以翻任意倍）；且空头在最痛苦时点被迫成为买家，风险与流动性在最坏时刻共振。

## 代码实践

\`\`\`python
def margin_account(equity, loan, price_change, rate=0.06):
    # 融资账户：本金、融资额、股价涨跌幅 -> 收益率与维持担保比例
    stock = (equity + loan) * (1 + price_change)   # 股票市值
    debt = loan * (1 + rate)                       # 本息
    net = stock - debt
    ratio = stock / loan                           # 简化：担保比例 = 市值/负债
    return (net - equity) / equity, ratio

for chg in (0.10, -0.15, -0.25, -0.35):
    ret, ratio = margin_account(1_000_000, 1_000_000, chg)
    print(f"股价 {chg:+.0%}: 收益率 {ret:+.1%}, 维持担保比例 {ratio:.0%}")
\`\`\`

预期输出：+10% → +14.0%、220%；−15% → −36.0%、170%；−25% → −56.0%、150%（警戒线）；−35% → −76.0%、130%（平仓线）。**常见错误**：把收益率按"股价涨跌 × 2"计算而漏掉利息；忽略融券情形下担保比例的分子还要**加上融券卖出冻结资金**；假设强平价格是静态的（股价波动、利率计息都让它每天漂移）。

## 常见误区

1. **"杠杆改变策略期望收益"**。不改变信号，只放大波动并引入利息成本与强平悬崖——期望收益反而被利息侵蚀。
2. **做空与做多对称**。不对称：亏损上限（无 vs −100%）、借券成本（有 vs 无）、轧空机制（只打击空头）、分红（做空方要补偿给出借人）。
3. **忽视券源现实**。热门做空标的融券费率可以到两位数、随时被召回，回测里"随时可空、零成本"是幻觉。
4. **保证金计算静态化**。价格波动、利息累积、担保品折算率调整都会移动强平点，必须动态盯市。

## 知识关联

- **向前**：交易成本（上一节）决定两融的利息与费用进 alpha 净额；
- **向后**：配对交易（《金融数学》c3-l2）的空头腿必须按本节机制核算成本与风险；《投资组合与风险管理》的杠杆与风险预算管理；
- **平行**：GameStop 案例在《AI 与量化》的另类数据与舆情分析中作为事件研究样例。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 融资 | 借钱做多，收益放大约"杠杆倍数 − 利息"；强平点在维持担保比例 ≈130% |
| 融券 | 借券做空，成本=费率+分红补偿；**亏损无上限** |
| 轧空 | 空头强平被迫买入 → 正反馈推价（GME 2021） |
| 风控铁律 | 动态盯市、预算最大杠杆、永远知道自己的强平价 |

## 参考资料

- Harris, L., *Trading and Exchanges*（Oxford University Press, 2003）：卖空机制、借券市场与卖空限制的微观结构分析。
- U.S. Securities and Exchange Commission (2021). *Staff Report on Equity and Options Market Structure Conditions in Early 2021* —— GameStop 事件的官方事后报告。
- 上海/深圳证券交易所融资融券交易实施细则（维持担保比例 130% 平仓线的规则出处，以最新修订为准）。
`,
        tips: [
          {
            kind: 'pitfall',
            text: '在 A 股做空具有较高的融券利息成本（年化通常 6%~10%），且热门小盘股往往券源极其稀缺甚至无券可融，回测做空策略时必须加入真实的券息与券源可获得性限制。',
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'quant-market-c3-e1',
        type: 'single',
        difficulty: 1,
        question: '在中国 A 股目前的交易制度下，股票交易的印花税征收规则是：',
        options: [
          { value: 'A', text: '买卖双边各征收 0.1%' },
          { value: 'B', text: '仅在买入时单边征收 0.05%' },
          { value: 'C', text: '仅在卖出时单边征收 0.05%' },
          { value: 'D', text: '免征印花税' },
        ],
        answer: 'C',
        explanation: '自2023年8月28日起，A 股证券交易印花税减半征收，实施卖出单边 0.05%（万分之五）的税率，买入时不征收。',
        tags: ['A股交易规则', '交易成本'],
      },
      {
        id: 'quant-market-c3-e2',
        type: 'judge',
        difficulty: 1,
        question: '在量化投资中，Alpha 指的是资产相对于大盘基准波动的系统性暴露，而 Beta 代表投资经理的主动选股超额收益能力。',
        answer: false,
        explanation: '定义正好颠倒。Beta 代表随市场基准波动的系统性收益/风险敞口；Alpha 代表剥离基准影响后由策略模型获取的主动超额收益。',
        tags: ['CAPM', 'Alpha与Beta'],
      },
      {
        id: 'quant-market-c3-e3',
        type: 'fill',
        difficulty: 2,
        question: '某量化交易账户买入 100,000 元某股票，隔天以 110,000 元卖出。若双边佣金率为 0.02%（买卖均收，无最低限额），卖出印花税率为 0.05%，暂不计其他规费，则该次往返交易的总税费成本为 ___ 元。',
        blanks: [['97', '97元', '97.0']],
        explanation: '买入佣金 = 100000 × 0.0002 = 20 元；卖出佣金 = 110000 × 0.0002 = 22 元；卖出印花税 = 110000 × 0.0005 = 55 元。总税费 = 20 + 22 + 55 = 97 元。',
        tags: ['成本计算', '税费实战'],
      },
      {
        id: 'quant-market-c3-e4',
        type: 'multiple',
        difficulty: 2,
        question: '下列关于量化市场中性对冲策略（Market Neutral）的描述中，正确的有：（多选）',
        options: [
          { value: 'A', text: '通常通过构建多头股票组合，并做空对应价值的股指期货来实现' },
          { value: 'B', text: '组合的目标是将总体 Beta 敞口压降至接近 0' },
          { value: 'C', text: '对冲掉 Beta 后，如果选股多头组合跑输对冲工具，策略依然会产生亏损' },
          { value: 'D', text: '市场中性策略意味着该策略在任何情况下没有任何风险、保本保收益' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: 'A、B、C 均为市场中性策略的核心特征。D 错误：金融市场没有无风险的圣杯，中性策略面临负 Alpha、基差贴水大幅波动、做空端爆仓等风险。',
        tags: ['市场中性', '对冲策略'],
      },
      {
        id: 'quant-market-c3-e5',
        type: 'code',
        difficulty: 2,
        question: '编写函数 calculate_net_pnl(buy_val, sell_val, comm_rate=0.0002, tax_rate=0.0005, slippage=0.0005)，计算单笔往返交易的最终净盈亏金额。\n\n公式：毛利润 - 买入佣金与滑点 - 卖出佣金与滑点 - 卖出印花税。',
        starterCode: `def calculate_net_pnl(buy_val, sell_val, comm_rate=0.0002, tax_rate=0.0005, slippage=0.0005):
    pass
`,
        expectedOutput: '净利润浮点数',
        tests: `pnl = calculate_net_pnl(100000.0, 110000.0)
gross = 10000.0
costs = (100000 * (0.0002 + 0.0005)) + (110000 * (0.0002 + 0.0005 + 0.0005))
assert abs(pnl - (gross - costs)) < 1e-4`,
        answer: `def calculate_net_pnl(buy_val, sell_val, comm_rate=0.0002, tax_rate=0.0005, slippage=0.0005):
    gross = sell_val - buy_val
    buy_cost = buy_val * (comm_rate + slippage)
    sell_cost = sell_val * (comm_rate + tax_rate + slippage)
    return gross - (buy_cost + sell_cost)

calculate_net_pnl(100000.0, 110000.0)`,
        explanation: '严谨扣减买卖双边佣金、单边滑点冲击与卖单印花税后的真实到手 PnL。',
        tags: ['成本测算', 'Python编程'],
      },
      {
        id: 'quant-market-c3-e6',
        type: 'single',
        difficulty: 3,
        question: '某量化多空 Alpha 策略构建了一个市值 5000 万元的股票多头组合（Beta = 1.10），为了将其系统性风险完全对冲至中性（组合总 Beta = 0），该基金应做空等效名义市值多少的股指期货合约（设股指期货基准 Beta = 1.0）？',
        options: [
          { value: 'A', text: '4545 万元' },
          { value: 'B', text: '5000 万元' },
          { value: 'C', text: '5500 万元' },
          { value: 'D', text: '6000 万元' },
        ],
        answer: 'C',
        explanation: '为使多空 Beta 完全抵消：V_long × Beta_long = V_short × Beta_short，即 5000万 × 1.10 = V_short × 1.0，解得 V_short = 5500 万元。',
        tags: ['Beta对冲', '对冲比率计算'],
      },
      {
        id: 'quant-market-c3-e7',
        type: 'code',
        difficulty: 3,
        question: '编写函数 hedge_ratio(stock_beta, stock_value, future_beta=1.0)，返回完全对冲时所需的空头名义市值。',
        starterCode: `def hedge_ratio(stock_beta, stock_value, future_beta=1.0):
    pass
`,
        expectedOutput: '所需期货空头市值',
        tests: `assert abs(hedge_ratio(1.1, 5000.0) - 5500.0) < 1e-4
assert abs(hedge_ratio(0.8, 1000.0) - 800.0) < 1e-4`,
        answer: `def hedge_ratio(stock_beta, stock_value, future_beta=1.0):
    return (stock_beta * stock_value) / future_beta

hedge_ratio(1.1, 5000.0)`,
        explanation: '根据 Beta 风险敞口对齐原则，所需空头价值等于 (多头Beta × 多头市值) / 期货Beta。',
        tags: ['Beta对冲', '量化风控'],
      },
      {
        id: 'quant-market-c3-e8',
        type: 'open',
        difficulty: 4,
        question: '【实盘架构深度剖析】\n某高频量化团队在回测中开发出一套胜率 58%、日均交易 20 次的日内股票 T+0 策略，回测扣除了“万一”手续费后年化收益达 45%。然而在实际小规模实操上线后，净值不仅未能上涨，反而每周稳步亏损 1.5%。\n\n请列举至少三个导致该策略从回测到实盘发生“质变崩塌”的现实微观因素，并给出对应的排查解决思路。',
        referenceAnswer: `1. 核心崩塌因素剖析：
(1) 委托排队与未成交机会成本（Queue Priority & Fill Rate）：回测往往假设只要市场价格触碰限价单即按 100% 撮合成交；但实盘中限价单遵循时间优先，当利好出现时对手方迅速撤单，我方限价单排在队列末尾根本无法成交；而一旦成交往往是逆向选择（行情反转砸穿），导致盈利单吃不到、亏损单全吃满。
(2) 市场冲击滑点与流动性耗竭：日均 20 次的高频交易会频繁消耗盘口深度。回测若采用收盘价或对价成交，会忽略主动吃单产生的瞬时滑点（Slippage）。单笔仅 5 bps 的额外滑点在年化 5000 次交易下将直接吃掉 250% 的理论收益！
(3) 行情与下单网络延迟（Tick Latency）：实盘柜台穿透延迟（如 20ms）使得策略捕获的价格信号在送达撮合主机时已被低延迟柜台抢先套利，沦为接盘资金。

2. 针对性排查与解决方案：
(1) 建立保守撮合模拟器：在回测引擎中引入排队位置模拟（必须有后续至少等于前面排队量的成交发生才算成交），并加入 0.05%~0.1% 的动态滑点惩罚。
(2) 硬件与链路优化：接入券商极速交易柜台（如宽睿、顶点、华泰等内存柜台），使用Colocation机房托管，将全链路延迟压缩至亚毫秒级。
(3) 降低交易频率：过滤边际微弱的交易信号，只保留预期收益显著高于交易摩擦（如预期收益 > 3倍交易成本）的优质机会。`,
        rubric: [
          { point: '清晰指出限价单排队/逆向选择与机会成本对真实成交率的影响', score: 35 },
          { point: '深入说明高频换手下哪怕数个基点的滑点累积对收益的致命吞噬', score: 35 },
          { point: '提出仿真撮合器改进、极速柜台接入或过滤低置信度信号的合理方案', score: 30 },
        ],
        keywords: ['排队', '逆向选择', '滑点', '延迟', '极速柜台', '高频换手'],
        explanation: '高频 T+0 策略实盘崩塌主因在于限价单排队未成交与逆向选择、高频换手下哪怕数个基点的滑点累积以及行情通信网络延迟。',
        tags: ['回测陷阱', 'T+0策略', '实战排查'],
      },
      {
        id: 'quant-market-c3-e9',
        type: 'multiple',
        difficulty: 3,
        question: '在做空交易（Short Selling）中，导致空头面临「非对称无限风险」的机制包括：（多选）',
        options: [
          { value: 'A', text: '股票价格上涨理论上没有上限，空头亏损额度可超过 100% 甚至数百倍' },
          { value: 'B', text: '遭遇轧空（Short Squeeze）时，空头被动市价止损买入会进一步推高股价自我强化' },
          { value: 'C', text: '融券需要持续支付借券利息，持仓时间越长利息成本越沉重' },
          { value: 'D', text: '做空者的最大潜在收益在股价归零时锁定为 100%' },
        ],
        answer: ['A', 'B', 'C', 'D'],
        explanation: 'A、B、C、D 共同构成了做空交易非对称风险的根源：收益有上限（至多100%），亏损无下限，且伴随利息消耗和被动逼空轧空踩踏。',
        tags: ['做空机制', '风险不对称性'],
      },
      {
        id: 'quant-market-c3-e10',
        type: 'fill',
        difficulty: 2,
        question: '某股票投资组合的年化期望收益率为 15%，同期无风险收益率为 3%，该组合对市场基准指数的 Beta 为 1.2，市场基准年化期望收益率为 11%。根据 CAPM 模型，该投资组合实现的年化 Alpha 值为 ___ %。',
        blanks: [['2.4', '2.4%']],
        explanation: 'CAPM 预期基准收益 E(R) = Rf + Beta × (Rm - Rf) = 3% + 1.2 × (11% - 3%) = 3% + 9.6% = 12.6%。真实收益 15% 减去预期 12.6% 得 Alpha = 2.4%。',
        tags: ['CAPM计算', 'Alpha测算'],
      },
    ],
  },
];
