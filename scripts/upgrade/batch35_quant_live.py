# -*- coding: utf-8 -*-
"""batch35 p1：quant-live 全 9 节章主题包升级（TS 源 quant/quant-live.ts）。
用法：python batch35_quant_live.py verify  -> 跑章代码看输出（expected 未填时）
     python batch35_quant_live.py         -> 打补丁
"""
from _batch34_lib import Lib, build_md, finish
import sys

lib = Lib("quant-live", ["src/content/chapters/quant/quant-live.ts"])
REF = "本课程整理（可参见 Barry Johnson《Algorithmic Trading & DMA》、Almgren & Chriss (2000) Journal of Risk《Optimal Execution of Portfolio Transactions》与 CTP/QMT 柜台接口文档相应章节）"

C1 = "c1"
T1 = dict(
name="c1 实盘系统分层架构与 OMS/EMS",
why=("回测里年化 30% 的策略，实盘第一周就可能因为「订单发出去没回音，程序又发了一遍」变成双倍仓位。"
     "差别不在因子，而在工程：策略计算与柜台执行必须解耦，订单必须有一台严格的状态机管生死，"
     "网络超时必须靠幂等性兜底。本章把机构级实盘系统的四层架构、订单 FSM 三条铁律与 ClientOrderId"
     " 追踪体系讲清楚——这是所有执行算法与风控的地基。"),
intuition=("把实盘系统想成一家连锁餐厅：行情网关是传菜口（只管收菜并检查有没有漏），策略引擎是研发厨房"
           "（只决定『今晚要备 100 份』的目标），OMS 是库房主管（对比库存算差额、管钱管额度、开出母单），"
           "EMS 是后厨切配台（把『100 份』切成一次一份地出）。订单状态机则是每张小票的流转：已下单→柜台收单→"
           "盘口确认→部分成交→全部成交，一旦盖章『已成交/已撤销/已废单』就永不翻页。ClientOrderId 就是小票"
           "上的唯一编号——服务员忘了有没有报过菜，报第二次时后厨一看编号重复，直接回『这道已经在做了』。"),
code='''import random
random.seed(7)

# ---- 1. OMS 持仓轧差：目标持仓 vs 真实持仓 -> 母单（含 A 股真实费率预估） ----
FEE = dict(comm=0.00025, min_comm=5.0, stamp_sell=0.0005, transfer=0.00001)  # 佣金万2.5(最低5元)、印花税卖出万5、过户费万0.1
def est_fee(px, qty, sell=False):
    amt = px * qty
    return max(amt * FEE["comm"], FEE["min_comm"]) + amt * FEE["transfer"] + (amt * FEE["stamp_sell"] if sell else 0)

target = {"600519": 1000, "300750": 6000, "510300": 50000}
actual = {"600519": 400, "300750": 6000, "510300": 65000}
px = {"600519": 1700.0, "300750": 190.0, "510300": 3.90}
print("== OMS 持仓轧差 -> 母单 ==")
for s in target:
    d = target[s] - actual.get(s, 0)
    if d == 0:
        print(f"{s}: 持仓已达标，跳过")
        continue
    side = "BUY" if d > 0 else "SELL"
    fee = est_fee(px[s], abs(d), sell=d < 0)
    print(f"{s}: {side} {abs(d)} 股 @~{px[s]}  预估交易费用 {fee:.2f} 元")

# ---- 2. 订单 FSM：终态不可逆 + 乱序回报挂起重放 ----
VALID = {"SUBMITTED": {"PENDING_NEW", "REJECTED"},
         "PENDING_NEW": {"ACCEPTED", "REJECTED"},
         "ACCEPTED": {"PARTIAL_FILLED", "FILLED", "CANCELLED"},
         "PARTIAL_FILLED": {"PARTIAL_FILLED", "FILLED", "CANCELLED"}}
TERMINAL = {"FILLED", "CANCELLED", "REJECTED"}

class Order:
    def __init__(self, cid, qty):
        self.cid, self.qty, self.filled = cid, qty, 0
        self.state = "SUBMITTED"
    def feed(self, ev, qty=0):
        if self.state in TERMINAL:
            print(f"  [{self.cid[-8:]}] 收到 {ev} 但已终态 {self.state} -> 丢弃（终态不可逆）"); return
        if ev not in VALID[self.state]:
            print(f"  [{self.cid[-8:]}] 乱序回报 {ev}（当前 {self.state}）-> 挂起待重放"); return
        self.state = ev
        if ev in ("PARTIAL_FILLED", "FILLED"):
            self.filled += qty
            if self.filled >= self.qty: self.state = "FILLED"
        print(f"  [{self.cid[-8:]}] -> {self.state} (成交 {self.filled}/{self.qty})")

print("== Order FSM 演练（含乱序）==")
o = Order("S1_600519_1730000000000_1", 1000)
o.feed("PARTIAL_FILLED", 300)      # ACCEPTED 未到，成交先到 -> 挂起
o.feed("PENDING_NEW")
o.feed("ACCEPTED")
o.feed("PARTIAL_FILLED", 300)      # 重放被挂起的 300 股
o.feed("PARTIAL_FILLED", 700)      # 补足 -> FILLED
o.feed("CANCELLED")                # 终态后再撤 -> 丢弃

# ---- 3. 幂等性：同 ClientOrderId 重发被去重 ----
print("== 幂等去重 ==")
seen, n = {}, [0]
def send(cid):
    if cid in seen:
        print(f"  {cid}: 超时重发 -> 返回缓存结果「{seen[cid]}」，不发新单"); return
    n[0] += 1; seen[cid] = f"第{n[0]}次真实下单 10000 股"
    print(f"  {cid}: 首次处理 -> {seen[cid]}")
send("S1_600519_1730000000000_2")
send("S1_600519_1730000000000_2")   # 网络闪断后的重发
print(f"实际真实下单次数: {n[0]}（无幂等机制将为 2，超额买入 10000 股）")''',
expected=("(1) 轧差生成母单：600519 BUY 600 股（费用 265.20 元）、300750 持仓达标跳过、510300 SELL 15000 股"
          "（费用 44.46 元）；(2) FSM：成交回报先于 ACCEPTED 到达被挂起，ACCEPTED 后重放 300 股，"
          "再收 700 股累计 1000/1000 转 FILLED，随后 CANCELLED 被丢弃（终态不可逆）；(3) 同 ClientOrderId "
          "第二次发送只返回缓存结果，真实下单次数为 1。"),
cerr=("把策略引擎和下单逻辑写在一个循环里，一次抛异常导致行情与持仓管理同时停摆；"
      "状态机只记录最后一个回报，乱序回报（FILLED 先于 ACCEPTED）被当成非法数据丢弃，造成少记持仓；"
      "网络超时后直接重发而不带全局唯一 ClientOrderId，柜台两笔都成交，账户超额买入。"),
miscon=("1. **『OMS 就是下单函数』**——OMS 的核心是持仓轧差、资金冻结与全局额度管控，下单只是最后一步；\\n"
        "2. **『收到 FILLED 回报就一定能撤单』**——终态不可逆，进入 FILLED/CANCELLED/REJECTED 后任何中间状态转移都必须拒绝；\\n"
        "3. **『幂等性靠业务去重就行』**——去重键必须是客户端生成的强全局唯一 ID（策略+标的+时间戳+序号），"
        "用内容哈希或数据库自增 ID 在超时重发场景下都会失效。"),
connection=("- **向前**：母单生成后如何拆成子单、按什么节奏发，是第 2 章 Almgren-Chriss/TWAP/VWAP 的主题；\n"
            "- **向后**：订单外发前的纳秒级校验与失控急停是第 3 章事前风控与 Kill Switch；\n"
            "- **平行**：《量化策略与因子研究》产生的目标持仓正是本章 OMS 轧差的输入，"
            "《策略回测与绩效评估》里被忽略的滑点与费用模型在本章以临时冲击与真实费率的形式出现。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 分层 | 行情网关 → 策略引擎（目标持仓）→ OMS（轧差/资金）→ EMS（拆单）→ 券商柜台 |\n"
         "| FSM 铁律 | 终态不可逆、乱序回报挂起重放、终态触发资金/持仓结算 |\n"
         "| 幂等 | 客户端生成策略ID_标的_毫秒时间戳_序号，柜台按 ID 去重返回首次结果 |\n"
         "| 头号事故 | 超时盲目重发 = 双倍仓位，幂等 ID 是唯一解 |\n"
         "| 费用基线 | 佣金万2.5（最低5元）+ 卖出印花税万5 + 过户费万0.1 |"),
)
GOALS1 = {
"quant-live-c1-l1": ("1. 画出实盘系统五层架构（行情网关/策略引擎/OMS/EMS/柜台）并说明每层职责边界；\n"
                     "2. 解释 OMS 的持仓轧差如何把目标持仓变成母单，以及资金与额度为何必须全局管控；\n"
                     "3. 说明『策略计算与柜台执行解耦』在故障隔离与性能上的两点必要性。"),
"quant-live-c1-l2": ("1. 复述订单 FSM 的主要状态（SUBMITTED→PENDING_NEW→ACCEPTED→PARTIAL_FILLED→FILLED/CANCELLED/REJECTED）；\n"
                     "2. 用三条铁律（终态不可逆、乱序回报挂起重放、资金冻结同步）判断一笔异常回报该如何处理；\n"
                     "3. 给定一串乱序回报序列，手工推演状态机的正确轨迹与丢弃/重放决策。"),
"quant-live-c1-l3": ("1. 说明网络超时重发为何会产生幽灵双倍订单，以及幂等性的严格定义；\n"
                     "2. 按「策略ID_标的_毫秒时间戳_递增序号」构造全局唯一 ClientOrderId 并解释每个字段的去重作用；\n"
                     "3. 设计柜台侧去重表的过期策略（如 24 小时）并说明其对存储与安全的权衡。"),
}
PREREQ1 = {
"quant-live-c1-l1": "- 「策略回测与绩效评估」中的订单/成交概念；\n- 知道券商柜台（CTP/QMT）是报单的最终出口。",
"quant-live-c1-l2": "- 「现代量化实盘系统的工程分层与解耦」（l1）中 OMS/EMS 的角色；\n- 有限状态机的基本概念（状态+转移规则）。",
"quant-live-c1-l3": "- 「订单生命周期有限状态机」（l2）的终态概念；\n- 分布式系统『请求超时后结果未知』的基本直觉。",
}
CODE1, WHY1, INTU1 = T1["code"], T1["why"], T1["intuition"]

C2 = "c2"
T2 = dict(
name="c2 冲击成本与最优拆单",
why=("50 万股的母单一次性砸向市场，会把卖一至卖十全部吃穿，成交价比到达价高出 1% 以上——"
     "这笔「隐性亏损」往往吃掉策略全年的超额收益。但慢慢买又要承担漫长执行期内的价格漂移。"
     "如何在冲击成本与时机风险之间找最优平衡？Almgren-Chriss 给出了均值-方差框架，"
     "TWAP/VWAP/冰山/POV 则是工业界落地该思想的四大基石算法。本章用模拟盘实测三类算法的实施缺口。"),
intuition=("把市场想成一片浅滩，母单是一大桶水：一次性全倒进去（市价单）会掀起巨浪（冲击），"
           "把桶打翻在自己脚上；用一天时间细水长流（TWAP），每一瓢都 innocuous，但背着桶走一天，"
           "天气（价格）可能大变（时机风险）。VWAP 聪明在跟着人潮走：早盘尾盘人潮汹涌（U 型成交量）时多倒一些，"
           "午间没人时少倒——你的水流混进人潮里就无迹可寻。冰山单是只露出水面的浮标，POV 则是始终只占人流的固定比例。"),
code='''import random, math
random.seed(11)

# ---- 模拟：240 个 1 分钟切片，U 型日内成交量 + 随机游走价格 ----
N, Q, P0 = 240, 500_000, 20.00          # 母单 50 万股，到达价 20 元
V_TOTAL = 100_000_000                    # 全市场当日成交量（母单占 0.5%）
u = [1 + 2.2*math.exp(-i/25) + 1.6*math.exp(-(N-1-i)/20) for i in range(N)]
share = [v/sum(u) for v in u]            # U 型成交量占比（早盘/尾盘高）
SIGMA, ETA = 0.0006, 0.02                # 每分钟波动率；参与率 100% 抬价 2%（临时冲击）

def run(schedule):
    px, cash, left = P0, 0.0, Q
    for k in range(N):
        px *= math.exp(random.gauss(0, SIGMA))       # 无信息随机游走
        vk = V_TOTAL * share[k]
        q = min(schedule[k], left)
        cash -= (px + ETA * px * q / vk) * q         # 临时冲击随参与率线性放大
        left -= q
        if left <= 0: break
    return (-cash / Q / P0 - 1) * 10000              # 实施缺口（bps，相对到达价）

one  = [0.0]*N; one[0] = Q                            # 一次性市价
twap = [Q/N]*N                                        # 均匀拆单
vwap = [Q*s for s in share]                           # 按 U 型量分配

print(f"母单 {Q} 股 @ 到达价 {P0} 元，占全市场成交量 {Q/V_TOTAL:.1%}")
for name, sch in [("一次性市价单", one), ("TWAP 均匀拆单", twap), ("VWAP 按U型量分配", vwap)]:
    xs = [run(sch) for _ in range(300)]
    m = sum(xs)/len(xs); sd = (sum((x-m)**2 for x in xs)/len(xs))**0.5
    print(f"{name}: 平均缺口 {m:+7.1f} bps   缺口波动 {sd:5.1f} bps")''',
expected=("母单占全市场成交量 0.5%。300 次蒙特卡洛：一次性市价单平均缺口约 +100 bps 且波动≈0"
          "（瞬间完成、冲击巨大）；TWAP 均匀拆单平均缺口约 +1~3 bps 但缺口波动约 50 bps"
          "（冲击极小、暴露全天价格漂移）；VWAP 平均缺口与 TWAP 相近且略低——冲击成本与时机风险"
          "的均值-方差权衡一目了然。"),
cerr=("把 TWAP 写成严格每 60 秒等量下单，被高频算法识别模式后狙击，必须加 ±15% 抖动；"
      "VWAP 用『今天』的实际成交量分配子单——未来函数！必须用历史日均 U 型曲线做预测再盘中动态修正；"
      "把临时冲击当成一次性成本直接加到成交价后不再衰减，导致同一时段连续子单的成本被重复计算。"),
miscon=("1. **『拆得越慢成本越低』**——TWAP 把冲击换成时机风险，高波动日慢慢买可能比一次性买更贵，"
        "最优拆单是 λ（风险厌恶）下的均值-方差折中；\\n"
        "2. **『VWAP 就是跟踪当天均价』**——VWAP 是执行基准（benchmark），算法按『预测的』日内成交量分布下单，"
        "盘中还要用实际成交量动态修正；\\n"
        "3. **『冲击成本与成交量成正比』**——主流模型更接近与参与率（q/V）的幂次（约 0.5~1）成正比，"
        "且分临时冲击（随时间消散）与永久冲击（信息泄露，永久抬价）两部分。"),
connection=("- **向前**：母单如何安全发出、发多少，依赖第 1 章 OMS 轧差与第 3 章事前风控的额度限制；\n"
            "- **向后**：实施缺口（Implementation Shortfall）是《策略回测与绩效评估》中『回测利润→实盘利润』折损的主因；\n"
            "- **平行**：《量化研究项目实战》的成交模拟（滑点模型）正是本章 ETA 线性冲击模型的简化版。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 两难 | 一次性买（冲击大、时机风险 0） vs 慢慢买（冲击小、时机风险大） |\n"
         "| AC 框架 | min E[成本] + λ·Var[成本]，最优轨迹为指数衰减的凸形 |\n"
         "| TWAP | 等时间切片等量下单，需 ±15% 抖动防狙击 |\n"
         "| VWAP | 按预测日内 U 型成交量比例分配 + 盘中动态修正 |\n"
         "| 实测 | 母单占量 0.5% 时：市价单 ~100bps vs 拆单 ~1-3bps（代价是 ~50bps 时机波动） |"),
)
GOALS2 = {
"quant-live-c2-l1": ("1. 用临时冲击与永久冲击两个成分解释大单为何『越买越贵』；\n"
                     "2. 写出 Almgren-Chriss 的均值-方差目标 min E[成本]+λ·Var[成本] 并说明 λ 如何塑形交易轨迹；\n"
                     "3. 在模拟盘中实测一次性市价 vs 均匀拆单的实施缺口差异（bps 量级）。"),
"quant-live-c2-l2": ("1. 分别说明 TWAP 与 VWAP 的子单分配规则及各自适用场景；\n"
                     "2. 解释随机化 TWAP 的必要性（防高频识别）与 VWAP 动态修正机制（预测量 vs 实际量）；\n"
                     "3. 指出『用当日实际成交量做分配表』是未来函数，必须用历史 U 型曲线预测。"),
"quant-live-c2-l3": ("1. 说明冰山单『展示量+水下补挂』的机制及其对抗抢跑（Front-running）的价值；\n"
                     "2. 用参与率视角解释 POV 为何能自动适应市场放量与缩量；\n"
                     "3. 对比冰山（限价隐藏）与 POV（跟随放量）在成交确定性与隐蔽性上的权衡。"),
}
PREREQ2 = {
"quant-live-c2-l1": "- 第 1 章母单/子单概念；\n- 均值-方差思想（波动即风险）；\n- 对数收益与 bps 单位换算。",
"quant-live-c2-l2": "- 「市场冲击成本与 Almgren-Chriss 最优拆单」（l1）的冲击/时机两难；\n- 日内成交量 U 型分布的经验事实。",
"quant-live-c2-l3": "- 「TWAP 与 VWAP 算法实现与动态跟踪」（l2）的拆单框架；\n- 限价单在盘口排队的基本机制。",
}
CODE2, WHY2, INTU2 = T2["code"], T2["why"], T2["intuition"]

C3 = "c3"
T3 = dict(
name="c3 事前风控、Kill Switch 与对账",
why=("2013 年光大「乌龙指」：2 秒内 72.7 亿元错误订单未经风控直达交易所，上证指数瞬间拉起近 6%。"
     "事后风控是收尸，事前硬风控才是保命——所有订单外发前必须在内存流水线里过完乌龙指、单笔限额、"
     "自成交、报撤比等铁律。而当失控真的发生，Kill Switch 的一键急停与盘后对账清算"
     "就是系统最后的两道保险。"),
intuition=("事前风控像机场安检：每个人（订单）上飞机（进柜台）前必须过金属探测门，任何一项报警就地拦下，"
           "而不是等飞机落地再追责。Kill Switch 是驾驶舱的紧急断油手柄：先拔钥匙（停新单）、"
           "再滑回所有已放出的行李（撤在途单）、最后锁门（只读保护）。盘后对账则是每天打烊后的盘点："
           "你的账本（本地持仓/资金）必须和银行对账单（券商结算单/中国结算）逐分逐厘对上，"
           "对不上就说明系统里藏着一个尚未爆发的 bug。"),
code='''import random
random.seed(3)

# ---- 1. 事前硬风控流水线：任一不过即本地拦截 ----
LIMITS = dict(max_dev=0.02, max_order_value=2_000_000, max_daily_turnover=50_000_000, max_cancel_ratio=0.5)
state = dict(daily_turnover=0.0, cancels=12, orders=40)

def pre_trade(o, last_px):
    amt = o["px"] * o["qty"]
    bad = []
    if o["type"] == "LIMIT" and abs(o["px"]/last_px - 1) > LIMITS["max_dev"]:
        bad.append(f"乌龙指: 委托价偏离盘口 {abs(o['px']/last_px-1):.1%} > 2%")
    if amt > LIMITS["max_order_value"]:
        bad.append(f"单笔超限: {amt/1e4:.0f} 万元 > 200 万")
    if state["daily_turnover"] + amt > LIMITS["max_daily_turnover"]:
        bad.append("单日累计委托额超上限")
    if o.get("cross_with"):
        bad.append(f"自成交拦截: 与已有 {o['cross_with']} 价格交叉")
    if state["cancels"]/max(1, state["orders"]) > LIMITS["max_cancel_ratio"]:
        bad.append("报撤比超监管红线")
    if bad:
        return "REJECT", bad
    state["daily_turnover"] += amt; state["orders"] += 1
    return "PASS", []

orders = [
    dict(name="正常限价买单", type="LIMIT", px=20.10, qty=5000, last=20.00),
    dict(name="乌龙指买单",   type="LIMIT", px=22.00, qty=5000, last=20.00),
    dict(name="巨额买单",     type="LIMIT", px=20.05, qty=200000, last=20.00),
    dict(name="对倒卖单",     type="LIMIT", px=19.95, qty=3000, last=20.00, cross_with="BUY#1"),
]
for o in orders:
    last = o.pop("last")
    st, why = pre_trade(o, last)
    print(f"[{st}] {o['name']}" + ("  <- " + "; ".join(why) if why else "  -> 发往柜台"))

# ---- 2. Kill Switch：当日回撤 2% 触发一键急停 ----
print()
equity, loss_limit = 10_000_000, 0.02
day_start = equity
for t in range(1, 15):
    ret = random.gauss(-0.003, 0.004)
    equity *= 1 + ret
    dd = 1 - equity/day_start
    flag = ""
    if dd >= loss_limit:
        flag = "  -> 触发 Kill Switch：停新单 + 撤全部在途单 + 只读保护"
    print(f"t={t} 净值 {equity:,.0f}  当日回撤 {dd:.2%}{flag}")
    if flag: break

# ---- 3. 盘后对账：本地账本 vs 券商结算单 ----
print()
local_pos, broker_pos = {"600519": 997, "510300": 50000}, {"600519": 1000, "510300": 50000}
local_cash, broker_cash = 8_123_456.78, 8_123_456.78
for s in broker_pos:
    if local_pos.get(s) != broker_pos[s]:
        print(f"对账差异: {s} 本地 {local_pos.get(s)} vs 结算单 {broker_pos[s]} -> 冻结该标的并复盘回报流")
        break
else:
    print("持仓对账一致")
print("资金对账:", "一致" if abs(local_cash-broker_cash) < 0.01 else f"差异 {local_cash-broker_cash:.2f}")''',
expected=("风控流水线：正常限价买单 PASS 发往柜台；乌龙指买单被拦（偏离 10.0% > 2%）；巨额买单被拦"
          "（401 万元 > 200 万）；对倒卖单被拦（与 BUY#1 价格交叉）。Kill Switch：净值连日回撤，"
          "t=14 当日回撤 2.44% 触及 2% 红线，打印急停三连并停止循环。对账：600519 本地 997 vs 结算单 1000，"
          "标记差异并冻结复盘；资金对账一致。"),
cerr=("把风控做成『发单后异步检查』——拦截时订单已在交易所成交，等于没有风控（光大事件原型）；"
      "自成交检查只比对同一策略的挂单，跨策略/跨账户的对倒漏网；Kill Switch 只停新单不撤在途单，"
      "挂出去的单继续成交，风险敞口并未关闭。"),
miscon=("1. **『风控会拖慢下单速度，可以先发后查』**——事前风控必须是纯内存微秒级流水线，"
        "这是工程优化问题而非省略理由；\\n"
        "2. **『回撤触发急停后可以立刻重开』**——急停后必须人工复盘确认故障根因，"
        "自动恢复会让故障循环触发-重启-再触发；\\n"
        "3. **『对账只是财务的事』**——账实差异是系统性 bug（且回报、重复成交、费用算错）最灵敏的探测器，"
        "每日对账是工程纪律。"),
connection=("- **向前**：风控额度直接约束第 1 章 OMS 的资金管控与第 2 章母单的最大规模；\n"
            "- **向后**：审计日志与毫秒级重放是《量化研究项目实战》复盘实盘表现的数据底座；\n"
            "- **平行**：《Python 量化编程》中订单对象的实现应内置本章的检查字段（偏离度、金额、白名单）。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 光大教训 | 事前风控缺失 = 2 秒 72.7 亿，拦截必须在发单前完成 |\n"
         "| 风控铁律 | 乌龙指偏离/单笔限额/日累计限额/自成交/报撤比/白名单 |\n"
         "| Kill Switch | 触发三连：停新单 → 撤在途 → 只读保护 + 告警 |\n"
         "| 触发线 | 日亏 2%、拒单率 20%、断线 1 分钟（示例阈值） |\n"
         "| 盘后对账 | 持仓/资金/费用逐项核对结算单，差异即冻结复盘 |"),
)
GOALS3 = {
"quant-live-c3-l1": ("1. 列出事前硬风控六大检查项及各自的拦截条件（乌龙指/单笔/日累计/自成交/报撤比/白名单）；\n"
                     "2. 用光大事件说明『发单后异步风控』为何形同虚设；\n"
                     "3. 实现一个纯内存风控流水线并对 4 笔异常订单逐一拦截。"),
"quant-live-c3-l2": ("1. 列出 Kill Switch 的三类触发条件（净值红线/拒单率/断线）与三步急停动作；\n"
                     "2. 实现『当日回撤达 2% 即触发』的监控逻辑并解释为何急停后需人工介入；\n"
                     "3. 说明阶梯降级（停新仓→只平仓→全停）比单点开关更适合生产环境的原因。"),
"quant-live-c3-l3": ("1. 说明追加式审计日志（微秒时间戳 + 二进制追加写）与合规保存 20 年的要求；\n"
                     "2. 执行盘后对账流水线：持仓/资金/费用逐项比对结算单并标记差异；\n"
                     "3. 用『对账差异 → 冻结标的 → 回放回报流』的流程排查且回报类 bug。"),
}
PREREQ3 = {
"quant-live-c3-l1": "- 第 1 章订单外发路径（EMS → 柜台）；\n- A 股费用与涨跌停的基础常识。",
"quant-live-c3-l2": "- 「事前硬风控拦截器」（l1）——急停是风控的最终形态；\n- 净值/回撤的计算方法。",
"quant-live-c3-l3": "- 第 1 章 ClientOrderId 与回报流概念；\n- 「紧急熔断断路器」（l2）的事故处置流程。",
}
CODE3, WHY3, INTU3 = T3["code"], T3["why"], T3["intuition"]

MD = {}
for lid in GOALS1: MD[lid] = build_md(lib.orig_content(lid), GOALS1[lid], PREREQ1[lid], WHY1, INTU1, CODE1, T1["expected"], T1["cerr"], T1["miscon"], T1["connection"], T1["summary"], REF)
for lid in GOALS2: MD[lid] = build_md(lib.orig_content(lid), GOALS2[lid], PREREQ2[lid], WHY2, INTU2, CODE2, T2["expected"], T2["cerr"], T2["miscon"], T2["connection"], T2["summary"], REF)
for lid in GOALS3: MD[lid] = build_md(lib.orig_content(lid), GOALS3[lid], PREREQ3[lid], WHY3, INTU3, CODE3, T3["expected"], T3["cerr"], T3["miscon"], T3["connection"], T3["summary"], REF)

if len(sys.argv) > 1 and sys.argv[1] == "verify":
    for cid, t in ((C1, T1), (C2, T2), (C3, T3)):
        print("=" * 20, cid)
        exec(compile(t["code"], cid, "exec"), dict(globals()))
    print("VERIFY-ONLY")
elif not (T1["expected"] and T2["expected"] and T3["expected"]):
    print("expected 未填，先 verify")
else:
    for lid in list(GOALS1) + list(GOALS2) + list(GOALS3):
        lib.patch_lesson(lid, MD[lid])
    finish(lib)
