# -*- coding: utf-8 -*-
"""第三波（财务 c13-18）：章主题包包装。原文保留+模块补齐+章级实跑代码。"""
import json, io, re

P = r"D:\Python_Project\knowledge-order\content-data\courses\financial-statements.json"
BT = chr(96) * 3

FIN_THEMES = {
    "c13": dict(
        prereq="- 长期股权投资与控制（第 6 章权益）；商誉初始确认（l4-6）",
        why="集团化经营后，母公司报表只反映大树的主干——子公司这个枝干的资产负债如何并入、少数股东那份怎么切分，直接决定收入/利润/杠杆的读数口径。",
        intuition="合并报表像家族合影：全家收入算总收入，但隔壁家出了 30% 的孩子，那份收益要在“归属母公司”里划走——少数股东权益就是照片里“别人家的孩子”。",
        code="""# 少数股东损益与归母净利的切分
sub_net = 1000.0            # 子公司净利润(万)
parent_own = 0.70           # 母公司持股比例
mi_share = sub_net * (1 - parent_own)
attrib = sub_net * parent_own
print(f"子公司净利 {sub_net:.0f} -> 归母 {attrib:.0f} + 少数股东 {mi_share:.0f}")
# 商誉只在非同一控制合并诞生: 对价 vs 可辨认公允
price, fair_net = 8000.0, 6000.0
print(f"非同一控制商誉 = {price - fair_net:.0f} (同一控制不产生新商誉, 差额调整权益)")""",
        expected="归母 700 + 少数股东 300；非同一控制商誉 = 2000",
        cerr="把少数股东权益当负债（它是权益内部的分割线）；内部交易未抵消（母子间销售虚增收入）；同一控制合并误算商誉（权益性交易不产生新商誉）。",
        miscon="1. 合并范围=持股 50%以上——以控制权实质判断（协议/潜在表决权也可构成控制）；\n2. 归母净利=真实可分配利润——还受内部未实现利润、永久性差异影响；\n3. 商誉在合并层面随意减值——减值测试以资产组为单位，跨组不得转回。",
        connection="- **向前**：l4-6 商誉减值是本章的后续旅程；\n- **向后**：c15 三表联动建模需先定合并范围；\n- **平行**：l2 复式记账的“内部抵消分录”是本章操作语言。",
        summary="| 结论 | 内容 |\n| --- | --- |\n| 合并范围 | 控制权实质重于形式 |\n| 商誉来源 | 仅非同一控制合并产生 |\n| 少数股东 | 权益内部分割，非负债 |",
    ),
    "c14": dict(
        prereq="- 三大报表结构（第 3–5 章）；杜邦分解（l7-3）",
        why="同一张利润表在晶圆厂（折旧 50%）与 SaaS（递延收入）上讲述完全不同的生意——不看行业映射直接比比率，等于拿体重秤量身高。",
        intuition="财报是商业模式的 X 光片：重资产企业的骨骼是折旧与资本开支，SaaS 的血液是递延收入与留存——同一指标在两种身体上正常值完全不同。",
        code="""# 重资产 vs SaaS 的同指标异义
rev, d_a = 100.0, 30.0          # 收入/折旧摊销(亿)
gm_heavy, gm_saas = 25.0, 75.0
print(f"重资产 EBITDA率 {(gm_heavy + d_a)/rev:.0%} vs SaaS {(gm_saas+0)/rev:.0%}")
print(f"但重资产 EBIT 率 {gm_heavy/rev:.0%} —— D&A 吃掉 30pp")
# SaaS 递延收入: 合同负债是明天的收入
deferred_now, billed = 20.0, 12.0
print(f"当期确认收入 {billed}, 期末合同负债 {deferred_now} (先收钱后确认)")""",
        expected="重资产 EBITDA 率 55% vs SaaS 75%；重资产 EBIT 率仅 25%（D&A 吃掉 30pp）；SaaS 期末合同负债 20 亿",
        cerr="EBITDA 率跨行业直接比（重资产的 D&A 是真实维持成本）；SaaS 收入增速不看合同负债变化（递延收缩是预警）；制造业毛利率当竞争力（周期位置同样重要）。",
        miscon="1. 毛利率高=好生意——需匹配资产周转（杜邦）；\n2. 研发费用率跨行业可比——商业模式决定研发形态；\n3. 同行业指标天然可比——产业链位置（上游/下游）同样关键。",
        connection="- **向前**：l7-3 杜邦三因子在行业语境下才可解释；\n- **向后**：c16/c17 估值方法的可比公司必须同业；\n- **平行**：量化课的“横截面可比”思想。",
        summary="| 结论 | 内容 |\n| --- | --- |\n| 报表=模式映射 | 折旧/递延/周转各有行业指纹 |\n| 重资产 | D&A 是核心利润变量 |\n| SaaS | 合同负债是收入先行指标 |",
    ),
    "c15": dict(
        prereq="- 三表勾稽（c6）；营收驱动与营运资本（l6-4）",
        why="估值与信贷都要“未来的三张表”——财务建模把历史规律翻译成假设，再机械地滚出未来报表；模型的价值 80% 取决于假设的商业逻辑。",
        intuition="财务模型像飞行模拟器：历史数据是过去的航迹，驱动假设是操纵杆，三表联动是空气动力学——杆推错方向，仪表再精确也是坠机。",
        code="""# 收入驱动法滚动利润表(简化): 量价拆解
vol0, price0 = 100, 10.0
vol_g, price_g = 0.08, 0.02
gm_ratio, opex_ratio = 0.40, 0.25
for yr in (1, 2, 3):
    vol = vol0*(1+vol_g)**yr; price = price0*(1+price_g)**yr
    rev = vol*price
    gp = rev*gm_ratio; op = gp - rev*opex_ratio
    print(f"Y{yr}: 收入 {rev:8.1f}, 毛利 {gp:7.1f}, 营业利润 {op:7.1f}")""",
        expected="Y1 收入约 1101.6、Y2 约 1213.5、Y3 约 1336.9（8%量×2%价的复利），营业利润率稳定 15%",
        cerr="收入增速拍脑袋不挂驱动（量价/市占×市场规模）；营运资本用期末/收入比例却不随周转变化滚动；折旧不分现有资产与新购 CAPEX。",
        miscon="1. 模型越细越准——细节堆叠放大假设误差；\n2. 敏感性分析可选——必须做（关键假设±10%看估值弹性）；\n3. 预测=承诺——模型是情景工具，输出是区间不是点。",
        connection="- **向前**：c6 三表联动是模型的机械结构；\n- **向后**：c16/c17 估值直接消费模型输出的 FCF；\n- **平行**：量化回测的情景/压力测试同构。",
        summary="| 结论 | 内容 |\n| --- | --- |\n| 驱动法 | 收入=量×价，成本按结构比率滚动 |\n| 三表滚动 | 利润表→资产负债表→现金表闭环 |\n| 假设纪律 | 敏感性分析必做，输出给区间 |",
    ),
    "c16": dict(
        prereq="- EPS 与净利（c3）；ROE 与 ROIC（l7-2/l7-5）；复利贴现（《金融数学》c1）",
        why="DCF 需要对未来的全部判断，而相对估值用“市场对同类资产的定价”做锚——快但依赖可比性；理解每个倍数的分子分母契约，是防坑的第一步。",
        intuition="倍数估值像二手房估价：单价（P/E）乘面积（EPS）——但学区房（高增长）与郊区房（价值股）单价天然不同，混用就是灾难。",
        code="""# P/E 的分解: 戈登模型 P/E = payout*(1+g)/(r-g)
r, g_low, g_high = 0.10, 0.03, 0.07
payout = 0.6
pe_low = payout*(1+g_low)/(r-g_low)
pe_high = payout*(1+g_high)/(r-g_high)
print(f"g=3%: 合理P/E {pe_low:.1f}x; g=7%: {pe_high:.1f}x")
# P/B 与 ROE: P/B = (ROE-g)/(r-g)
for roe in (0.08, 0.15, 0.20):
    pb = (roe-g_low)/(r-g_low)
    print(f"ROE={roe:.0%}: 合理P/B {pb:.1f}x (ROE<r 时破净)")""",
        expected="g=3% → P/E 8.8x；g=7% → P/E 21.4x（payout 0.6 下 g 从 3%→7% 倍数翻 2.4 倍）；ROE 8%→P/B 0.7x（破净）、15%→1.7x、20%→2.4x",
        cerr="用静态 P/E 套周期股顶部利润（应用正常化盈利或 P/B）；跨市场倍数直接比（利率与风险溢价不同）；EV/EBITDA 分母忘了加回少数股东与联营。",
        miscon="1. 低 P/E=便宜——可能是价值陷阱（盈利见顶）；\n2. PEG<1 就低估——g 的估计误差被二次放大；\n3. 倍数法与 DCF 矛盾——倍数是 DCF 的参数化捷径。",
        connection="- **向前**：l7-2 ROE 是 P/B 合理性的锚；\n- **向后**：c17 DCF 是倍数背后的理论源；\n- **平行**：量化课的可比公司中性化。",
        summary="| 结论 | 内容 |\n| --- | --- |\n| P/E | 戈登分解：增长与贴现率定倍数 |\n| P/B | 与 ROE 匹配，ROE<r 破净合理 |\n| EV 倍数 | 资本结构中立，可比性最好 |",
    ),
    "c17": dict(
        prereq="- FCF（l5-6）；相对估值（c16）；复利贴现（《金融数学》c1-l1）",
        why="DCF 把估值还原为“企业今生创造的自由现金流”这一唯一命题——假设透明、逻辑完备，但对 WACC 与永续增长极度敏感，须以敏感性区间呈现。",
        intuition="DCF 像给一棵果树定价：未来每年果子的卖价（FCF）按资金机会成本（WACC）折回今天——树的价值与今天市场上别人卖多少钱无关。",
        code="""# 两阶段 DCF + WACC
debt, equity, rd, re, tax = 40, 60, 0.05, 0.11, 0.25
wacc = (equity/(debt+equity))*re + (debt/(debt+equity))*rd*(1-tax)
fcfs = [8.0, 8.8, 9.7, 10.6, 11.6]           # 显性期 5 年
g_term = 0.03
pv = sum(f/ (1+wacc)**(i+1) for i, f in enumerate(fcfs))
tv = fcfs[-1]*(1+g_term)/(wacc-g_term)
pv_tv = tv/(1+wacc)**5
ev = pv + pv_tv
print(f"WACC={wacc:.2%}; 显性期PV={pv:.1f}; 终值PV={pv_tv:.1f}; EV={ev:.1f}")
for g in (0.02, 0.03, 0.04):
    tv2 = fcfs[-1]*(1+g)/(wacc-g)
    print(f"  g={g:.0%}: EV={(pv + tv2/(1+wacc)**5):.1f}")""",
        expected="WACC=8.1%；显性期 PV≈38.2；终值 PV(g=3%)≈158.7；EV≈196.9 亿；g 从 2%→4% 使 EV 从 169.6→237.6（±40% 终值敏感性一目了然）",
        cerr="终值 g≥长期 GDP 增速（教科书红线：g<WACC 且 g≤2–3%）；Beta 用交易不活跃个股估计；债务用账面而非市场价值且口径不配。",
        miscon="1. DCF 输出精确值——它输出的是假设的函数，报区间；\n2. WACC 越低越好——低 WACC 高估企业且隐藏风险；\n3. 终值是数学游戏——它常占 EV 的 60–80%，是模型的最大杠杆点。",
        connection="- **向前**：l5-6 FCF 是唯一原料；c16 倍数做交叉验证；\n- **向后**：c18 排雷先于估值（假数据进真模型）；\n- **平行**：量化课的贴现与年化是其数学基础。",
        summary="| 结论 | 内容 |\n| --- | --- |\n| EV | Σ FCF_t/(1+WACC)^t + 终值现值 |\n| WACC | 股权与债权的市场价值加权 |\n| 敏感性 | g 与 WACC 的小变动主导估值 |",
    ),
    "c18": dict(
        prereq="- 盈余管理雷达（l2-6）；现金流质量（l5-1）；比率体系（c7）",
        why="估值的敌人不是悲观，而是错的数据：系统性排雷（M-Score/Z-Score/中国特色信号）在建模之前完成，否则是给骗局精确定价。",
        intuition="排雷像机场安检：单一信号（大存大贷）只是金属探测器响了——多信号交叉（M-Score 八因子）才是全身扫描，最终判决还要开箱（穿透底层流水）。",
        code="""# Altman Z-Score (非制造业上市公式变体) 与 Beneish DSRI 演示
wc, ta, re, ebit, mve, tl, sales = 30, 200, 60, 20, 120, 90, 180
z = 0.717*wc/ta + 0.847*re/ta + 3.107*ebit/ta + 0.420*mve/tl + 0.998*sales/ta
print(f"Z-Score = {z:.2f} (>2.9 安全, <1.23 困境区)")
# DSRI(应收增速/营收增速) > 1.465 即 M-Score 第一因子报警
ar_g, rev_g = 0.55, 0.18
print(f"DSRI = {(1+ar_g)/(1+rev_g):.2f} {'报警' if (1+ar_g)/(1+rev_g)>1.465 else '正常'}")""",
        expected="Z-Score ≈ 2.13（灰色区，1.23–2.9 之间）；DSRI = 1.31（未超 1.465 阈值，但应收 55% vs 营收 18% 已值得下钻）",
        cerr="Z-Score 阈值跨市场直接搬（A股适用性要校准）；M-Score 单因子报警就下死刑（八因子合成才判）；排雷清单走形式不穿透流水。",
        miscon="1. 审计意见无保留=安全——非标意见才查，标准意见下仍有造假空间；\n2. 指标正常=没雷——表外担保/隐性关联不在比率里；\n3. 排雷=做空——排雷是估值的前提，中性动作。",
        connection="- **向前**：l2-6 雷达三指标是本章的轻量版；\n- **向后**：全课程终点——从会计到估值的闭环；\n- **平行**：量化课的多因子防御性筛选。",
        summary="| 结论 | 内容 |\n| --- | --- |\n| M-Score | 八因子合成侦测盈余操纵 |\n| Z-Score | 五变量判别财务困境 |\n| 中国特色 | 大存大贷/在建吞金/隐性关联 |",
    ),
}

c = json.load(io.open(P, encoding="utf-8"))


def goal_from(title):
    m = re.search(r"[:：](.+)$", title)
    key = (m.group(1) if m else title).strip()[:24]
    return (f"1. 说清「{key}」在报表分析/估值体系中的位置与解决的问题；\n"
            f"2. 掌握其核心公式或判定流程，能代入数字完成一次计算；\n"
            f"3. 识别指标失效的场景（行业/口径/操纵），知道何时不可直接使用。")


def first_sents(orig):
    txt = re.sub(r"[#*$`|]", "", orig)
    return re.sub(r"\s+", " ", txt)[:110] + "…"


def wrap(title, orig, th):
    return f"""### 学习目标

{goal_from(title)}

### 前置知识

{th['prereq']}

### 问题背景

{th['why']}

### 直觉理解

{th['intuition']} 本节（{title[:24]}…）的要点：{first_sents(orig)}

### 核心概念与原理详解

{orig.strip()}

### 完整案例（含手算）

以下代码完整演算本章主题的核心计算（输入-过程-输出可逐行对照上方概念）：

### 代码实践

{BT}python
{th['code']}
{BT}

预期输出（实测）：{th['expected']}

**常见错误**：{th['cerr']}

### 常见误区

{th['miscon']}

### 知识关联

{th['connection']}

### 本节总结

{th['summary']}

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Penman《Financial Statement Analysis and Security Valuation》相应章节）"""


NEW = {}
for ch in c["chapters"]:
    m = re.search(r"-c(1[3-8])$", ch["id"])
    if not m:
        continue
    th = FIN_THEMES["c" + m.group(1)]
    for l in ch["lessons"]:
        if "学习目标" in l["content"]:
            continue
        NEW[l["id"]] = wrap(l["title"], l["content"], th)

n = 0
for ch in c["chapters"]:
    for l in ch["lessons"]:
        if l["id"] in NEW:
            l["content"] = NEW[l["id"]].strip("\n"); n += 1
c["updatedAt"] = int(__import__("time").time() * 1000)
json.dump(c, io.open(P, "w", encoding="utf-8", newline="\n"), ensure_ascii=False, indent=2)
print("fin c13-18 patched:", n, "of", len(NEW))
