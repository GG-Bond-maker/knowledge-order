# -*- coding: utf-8 -*-
"""batch36 C 组：ai-auto-m3《业务流程自动化》5 节升级（TS 源，_batch34_lib 模式）。
用法：python batch36_ai_auto_m3.py verify -> 跑章代码看输出
     python batch36_ai_auto_m3.py         -> 打补丁
"""
from _batch34_lib import Lib, build_md, finish
import sys

lib = Lib("ai-auto-m3", [
    "src/content/chapters/ai-auto-m3.ts",
    "src/content/chapters/ai-auto-m3b.ts",
    "src/content/chapters/ai-auto-m3c.ts",
])

C1 = dict(
name="c1 RPA 基础：从录屏到代码",
why=("「这个老系统没有 API」是无数自动化项目的起点，RPA（模拟人的 UI 操作）成了默认答案——但它也是维护"
     "成本的深坑：UI 一改版流程就崩。本节拆解 RPA 的三层结构（界面/逻辑/数据）与「越靠上层越脆弱」的规律、"
     "四种选择器从稳到脆的排序，给出录屏式 vs 代码式的选型表，以及「有 API 就用 API」的第一原则。"),
intuition=("RPA 像「教一个机器人照着屏幕点」：语义定位（data-testid）是给机器人留的专用门牌（开发改装修"
           "不会拆门牌）；XPath nth-child 是「从街口数第 3 栋右转」（路边加个报刊亭就迷路）；坐标点击是"
           "「闭着眼按记忆走」（分辨率一变就撞墙）。"),
code='''import numpy as np
rng = np.random.default_rng(26)
N = 500
refactor = rng.random(N) < 0.3                       # 30% 的改版会动结构
locators = {"data-testid": 0.05, "属性定位": 0.25, "XPath nth-child": 0.6, "坐标点击": 0.9}
for name, p_break in locators.items():
    survive = 1 - (refactor & (rng.random(N) < p_break)).mean()
    print(f"{name:>14}: 改版后存活率 {survive:.0%}")
latency = rng.uniform(0.5, 5, 10000)
waitcond = latency + 0.05
print(f"固定 sleep(3): 慢网失败率 {(latency > 3).mean():.0%} | 等待条件: 平均耗时 {waitcond.mean():.2f}s 且零失败")''',
expected=("实测：30% 改版场景下，data-testid 存活率 98%、属性定位 93%、XPath nth-child 83%、坐标点击 72%"
          "——锚点越语义化越抗改版；固定 sleep(3) 在 [0.5,5] 秒延迟下失败率 45%，等待条件零失败且平均耗时"
          "仅 2.80s（条件满足即走，不白等）。"),
cerr=("用 time.sleep(3) 等元素（慢网必挂、快网白等）；选择器用 nth-child/坐标（结构一动全崩）；"
      "有 API 的系统硬上 RPA（3 年 TCO 反超）。"),
miscon=("1. **RPA=更智能的自动化**——它不理解内容，是「模拟点击」；AI 增强是下一节的叠加项；\n"
        "2. **录屏更快所以更好**——上手快但长期维护成本是代码式的 2~3 倍；\n"
        "3. **等 3 秒总是安全的**——固定 sleep 是时序问题的最大来源，必须用条件等待。"),
connection=("- **向前**：m1 的 ROI/分层路由决定「值不值得做 RPA」；\n"
            "- **向后**：c2 的 AI 增强补上「看得懂」的能力，c4 的异常处理治 RPA 的脆弱性；\n"
            "- **平行**：软件测试的定位器策略（Playwright/Selenium）与 RPA 同源。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 第一原则 | 有 API 就用 API，RPA 是最后手段 |\n"
         "| 三层 | 界面(脆)/逻辑/数据(稳)，越上层越脆弱 |\n"
         "| 选择器 | data-testid > 属性 > XPath > 坐标（实测 98%/93%/83%/72%） |\n"
         "| 等待 | 条件等待替代固定 sleep（实测零失败） |\n"
         "| 选型 | Web/长期→代码式；老桌面软件→录屏式 |"),
ref="本课程整理（可参见 UiPath / Power Automate / Playwright 官方文档相应章节）",
)

C2 = dict(
name="c2 AI + RPA：让自动化看得懂",
why=("传统 RPA 只认「固定位置的文本」，扫描发票、手写表单、自由邮件一律抓瞎。AI 的三个增强点：非结构化"
     "输入理解（OCR+模型抽取）、异常判断（「这个值看起来不对」）、动态决策（按内容走流程）。核心工程是"
     "文档理解五阶段流水线：OCR/版面分析→字段抽取（带 confidence+evidence）→交叉校验（大小写金额/明细"
     "求和/格式/查重）→置信度分流→人工回流——宁可人工，不要错账。"),
intuition=("传统 RPA 像「只认表格第 3 行第 2 列的文员」；AI+RPA 像「看得懂发票的会计」：读完整张票（版面"
           "分析），摘出关键字段并标注把握程度（confidence）与出处（evidence），再用心算复核——大写金额"
           "对不对、明细加起来等不等于合计——有疑点就交给人，而不是硬着头皮入账。"),
code='''import re
doc_ok = {"invoice_no": {"value": "INV-2026-1001", "confidence": 0.98},
          "amount": {"value": 12800.00, "confidence": 0.91},
          "items": [{"amt": 6000}, {"amt": 6800}]}
doc_bad = {"invoice_no": {"value": "INV-999", "confidence": 0.72},
           "amount": {"value": 12800.00, "confidence": 0.74},
           "items": [{"amt": 6000}, {"amt": 6000}]}
def pipeline(doc):
    errs = []
    if abs(sum(i["amt"] for i in doc["items"]) - doc["amount"]["value"]) > 0.01:
        errs.append("明细求和 != 合计")
    if not re.match(r"^INV-\\d{4}-\\d{4}$", doc["invoice_no"]["value"]):
        errs.append("发票号格式不符")
    conf = min(doc["invoice_no"]["confidence"], doc["amount"]["confidence"])
    if errs or conf < 0.7: route = "人工完整录入"
    elif conf >= 0.95: route = "自动入账"
    else: route = "人工快速确认"
    return route, errs
for d, name in ((doc_ok, "合规发票"), (doc_bad, "问题发票")):
    print(name, "->", pipeline(d))''',
expected=("实测：合规发票（明细和=合计、格式正确）但置信度 0.91 → 「人工快速确认」（未达 0.95 全自动线）；"
          "问题发票被两条交叉校验拦下（明细求和≠合计、发票号格式不符）且置信度 0.72 → 「人工完整录入」"
          "——错账在入账前被拦截。"),
cerr=("只抽字段不做交叉校验（大写金额与明细求和是最便宜的两道保险）；丢弃 evidence（无法回查也无法抑制"
      "幻觉）；校验失败直接拒绝（应降置信度转人工，不是一拒了之）。"),
miscon=("1. **多模态模型可以替代专用 OCR**——直接读图更贵且密集表格可能更不准，按成本与精度选；\n"
        "2. **95% 准确率就能全自动**——按字段拆：金额 91% 时月错账数千笔，关键字段必须单独设标准；\n"
        "3. **AI 判断优于规则**——规则能覆盖 90% 就用规则，模型留给长尾。"),
connection=("- **向前**：c1 的 RPA 提供执行的手，本节给它装眼与脑；\n"
            "- **向后**：c4 的审计要求 evidence 留痕，M5 的评估定义字段级准确率；\n"
            "- **平行**：m1-c3 的结构化输出+校验在文档场景的完整落地。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 三增强 | 理解非结构化/异常判断/动态决策 |\n"
         "| 五阶段 | OCR→抽取(confidence+evidence)→交叉校验→分流→人工回流 |\n"
         "| 校验 | 大写金额、明细求和、格式、查重 |\n"
         "| 分流 | ≥0.95 自动 / 0.7~0.95 快审 / <0.7 人工 |\n"
         "| 原则 | 校验失败不上传，宁可人工不错账 |"),
ref="本课程整理（可参见 UiPath Document Understanding 文档与厂商结构化输出文档相应章节）",
)

C3 = dict(
name="c3 工作流平台：可视化编排的取舍",
why=("「要不要用 Zapier/n8n/Power Automate？」是每个自动化项目的选型题。平台的核心模型只有三件事："
     "触发器→节点→连线，价值在上手快与几百个现成连接器；代价在复杂逻辑难表达（嵌套循环/状态机）、"
     "调试黑盒、供应商锁定、版本控制困难。务实原则：平台用来「连接」，代码用来「计算」——复杂逻辑写成 "
     "API 让平台调用，3 个节点解决问题。"),
intuition=("平台像「宜家家具」：标准件齐全、说明书清晰、搭得快（连接 SaaS）；但你想做一张异形桌子"
           "（嵌套循环+状态机），宜家件拼不出来。混合模式最聪明：宜家柜子当外壳（平台编排触发与通知），"
           "里面装自制的承重结构（代码负责核心计算）。"),
code='''CASES = {"表单->Notion->Slack": [0, 2, 0, 0], "订单拆分+库存检查": [2, 3, 2, 1], "每天 9 点日报": [0, 1, 1, 0]}
for name, dims in CASES.items():
    s = sum(dims)                                   # 维度: 复杂度/频率/数据敏感/维护者
    print(f"{name}: 复杂度总分 {s} -> {'平台' if s <= 3 else '代码'}")
n_month = 5000
saas = n_month * 0.15 * 12                          # SaaS 按任务计费
self_host = 300 * 12                                # 自托管按服务器计费
print(f"年成本: SaaS {saas:.0f} 元 vs 自托管 {self_host} 元 -> 高频选自托管")''',
expected=("实测：「表单→Notion→Slack」复杂度总分 2 → 平台；「订单拆分+库存检查」总分 8 → 代码；"
          "「每天 9 点日报」总分 2 → 平台；月 5000 任务时 SaaS 年费 9000 元 vs 自托管 3600 元"
          "——高频场景自托管更省。"),
cerr=("在 Zapier 里用 20 个节点实现复杂拆单逻辑（无法调试且费用爆炸）；敏感数据直接过 SaaS（应自托管）；"
      "把一次性实验流程写成长期代码服务（投入错位）。"),
miscon=("1. **平台=低代码=落后**——连接器生态是真实价值，很多需求不值得写服务；\n"
        "2. **n8n 自托管就没有锁定**——流程 JSON 可导出但连接器配置仍绑定生态；\n"
        "3. **平台也能做复杂逻辑**——嵌套循环/状态机/事务在可视化画布上是蜘蛛网。"),
connection=("- **向前**：m1 的形态光谱在「平台 vs 代码」维度上细化；\n"
            "- **向后**：c4 的权限/审计在企业环境进一步约束平台选择（数据不出内网）；\n"
            "- **平行**：m2-c3 的工作流模式是平台画布的代码等价物。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 模型 | 触发器→节点→连线 |\n"
         "| 平台价值 | 上手快+连接器生态+可视化调试 |\n"
         "| 四代价 | 复杂逻辑难表达/调试黑盒/锁定/难版本控制 |\n"
         "| 原则 | 平台管连接，代码管计算 |\n"
         "| 选型 | 低复杂度+非技术维护→平台；核心业务+高频→代码/自托管 |"),
ref="本课程整理（可参见 n8n / Power Automate / Zapier 官方文档相应章节）",
)

C4 = dict(
name="c4 企业级落地：权限、审计与异常",
why=("个人项目跑通就行，企业项目「权限/审计/合规/可靠性/可回滚/责任边界」是上线前提。核心假设：AI 一定会"
     "出错（或被注入），权限决定破坏半径——最小权限四层次（身份/范围/数据/操作）；审计日志记四件事"
     "（谁做的/代表谁/做了什么/为什么）；异常三分类三应对（重试/转人工/告警分级）；熔断器防雪崩；"
     "PII 脱敏要覆盖日志。"),
intuition=("企业级 = 给实习生上岗前的全套制度：工牌（独立服务账号，不借员工账号）、门禁卡分区（最小 scope）、"
           "监控录像（append-only 审计）、应急预案（熔断+降级）、保密协议（PII 脱敏）、签字流程（高风险操作"
           "人工确认）。少一项，出事时就是「说不清」。"),
code='''import re
class CircuitBreaker:
    def __init__(self, threshold=3):
        self.failures, self.threshold, self.opened = 0, threshold, False
    def call(self, fn, fallback):
        if self.opened: return fallback()
        try:
            r = fn(); self.failures = 0; return r
        except Exception:
            self.failures += 1
            if self.failures >= self.threshold: self.opened = True
            return fallback()
def mask_pii(t):
    t = re.sub(r"\\d{17}[\\dXx]", "<ID_CARD>", t)      # 先身份证(防与手机号重叠)
    t = re.sub(r"1[3-9]\\d{9}", "<PHONE>", t)
    return re.sub(r"[\\w.+-]+@[\\w-]+\\.[\\w.]+", "<EMAIL>", t)
def fail_service(): raise RuntimeError("AI 服务超时")
cb = CircuitBreaker(threshold=3)
for i in range(5):
    print(f"请求{i+1}:", cb.call(fail_service, lambda: "降级到规则引擎"))
print("熔断器状态:", "已打开(停止调用故障服务)" if cb.opened else "未打开")
print("PII 脱敏:", mask_pii("联系 张三 13812345678 或 zhang@x.com，证件 11010119900307891X"))''',
expected=("实测：AI 服务连续超时 3 次后熔断器打开（已打开状态确认），第 4、5 个请求直接走「降级到规则引擎」"
          "不再等待超时——避免每个请求都等超时的雪崩；样例文本的手机号/身份证/邮箱全部被掩码替换"
          "（身份证先于手机号处理，防止号段重叠误匹配）——送模型与写日志前都要过这一关。"),
cerr=("Agent 用员工个人账号（出事说不清是谁）；对「订单不存在」做指数退避重试（重试只对临时性故障有意义）；"
      "日志记录原文含 PII（日志也是泄露面）。"),
miscon=("1. **权限是运维的事**——它决定 AI 的最大破坏半径，是自动化设计的一部分；\n"
        "2. **熔断=失败转移**——熔断是「停止打故障服务」防雪崩，转移只是伴随动作；\n"
        "3. **自托管模型就不用脱敏**——仍建议最小化：日志、缓存、下游系统都在扩散面里。"),
connection=("- **向前**：m1-c1 的「错误代价决定人机模式」在此变成权限与审批；\n"
            "- **向后**：M5 的护栏与可观测性是本节机制的系统化与监控化；\n"
            "- **平行**：m2-c2 的工具权限与 poka-yoke 是本节在工具层的投影。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 权限 | 独立服务账号+最小 scope+行级隔离+高危二次确认 |\n"
         "| 审计 | who/on_behalf_of/action/why；append-only |\n"
         "| 异常 | 重试(指数退避)/转人工(带上下文)/告警分级 |\n"
         "| 降级 | 熔断器：连续 3 失败自动走规则引擎（实测） |\n"
         "| 合规 | PII 脱敏含日志；敏感数据不出内网 |"),
ref="本课程整理（可参见 CMU 11-766 第 16-17 讲与 Berkeley CS294 第 12 讲相应内容）",
)

C5 = dict(
name="c5 企业案例库：六个真实项目的复盘",
why=("方法论告诉你「应该怎么做」，案例告诉你「实际会遇到什么」。六个真实复盘：录屏式 RPA 的规模化失败"
     "（维护吃掉收益）、发票 OCR 的「95% 准确率」陷阱（金额字段 91%、月错账 2700 笔）、工单分流从规则到 "
     "LLM（看维护成本而非准确率）、合同审查从全自动退回辅助（可验证性>准确率）、流程挖掘揭示真实流程"
     "（47 种变体）、多 Agent 过度工程（工作流成本 1/7 准确率反升 8 点）。六段复盘框架+七问清单让你把"
     "别人的学费变成自己的判断力。"),
intuition=("案例库像「事故调查报告集」：每份都写「未达预期的部分」——只讲成功的案例是营销材料。读的方法是"
           "横向对比：六个案例其实在重复同一句话——先想清楚（流程挖掘/API/字段级指标），再动手（最简方案），"
           "最后留退路（降级/回滚）。"),
code='''n_month, amt_acc, fix_min = 30000, 0.91, 15
wrong = int(n_month * (1 - amt_acc))
hours = wrong * fix_min / 60
print(f"金额字段 {amt_acc:.0%}: 月错账 {wrong} 笔, 冲红 {hours:.0f} 人时/月 ≈ {hours/160:.1f} 个全职")
for name, cost, latency, acc in [("多 Agent", 0.15, 18, 0.76), ("工作流 ", 0.02, 3.2, 0.84)]:
    print(f"{name}: 单封 {cost} 元 | {latency}s | 准确率 {acc:.0%} | 万封月成本 {cost*10000:.0f} 元")
qs = ["流程挖掘了吗", "能用 API 吗", "指标拆到字段级吗", "3 年 TCO 算了吗", "需要多 Agent 吗", "专业人士信任吗", "失败怎么退"]
print("七问自检:", " / ".join(qs))''',
expected=("实测：金额字段 91% → 月错账 2699 笔、冲红 675 人时/月 ≈4.2 个全职——「整体 95%」的陷阱被算出来；"
          "多 Agent（0.15 元/18s/76%）vs 工作流（0.02 元/3.2s/84%）：万封邮件月成本 1500→200 元且准确率"
          "反升 8 个点；七问自检清单完整输出。"),
cerr=("拿「整体准确率」当可用性承诺（必须拆到字段级/场景级）；立项只算开发不算 3 年维护 TCO"
      "（RPA 年维护可达开发的 30~50%）；用多 Agent 的复杂度显摆技术（先证明简单方案不够）。"),
miscon=("1. **案例数字可直接套用**——均为企业自述（B/C 级来源），迁移的是判断框架不是数字；\n"
        "2. **LLM 分类一定优于规则**——业务规则稳定（几年不变）时规则零成本零延迟可解释；\n"
        "3. **流程挖掘是额外投入**——有系统日志就能做，它应是自动化项目的第一步而非可选项。"),
connection=("- **向前**：前四节的原则在每个案例中被违反并付出代价——案例是原则的「代价注脚」；\n"
            "- **向后**：M4 的代码/文档场景、M5 的评估护栏直接对应案例 4/6 的教训；\n"
            "- **平行**：m1-c4 的「渐进式改进」正是案例 6 第二版的路径。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 案例一课 | 有 API 用 API；指标拆字段级；先挖掘再自动化 |\n"
         "| 账本 | 91% 金额字段=675 人时/月；工作流成本 1/7 准确率+8pt |\n"
         "| 信任 | 可验证性(evidence)>准确率 |\n"
         "| 框架 | 六段复盘+未达预期必写 |\n"
         "| 清单 | 七问，两个答不上就先调研 |"),
ref="本课程整理（可参见本节来源汇总所列 arXiv 论文与 Anthropic《Building effective agents》相应内容）",
)

THEMES = {
    "ai-auto-m3-c1": C1, "ai-auto-m3-c2": C2, "ai-auto-m3-c3": C3,
    "ai-auto-m3-c4": C4, "ai-auto-m3-c5": C5,
}

GOALS = {
"ai-auto-m3-c1-l1": ("1. 说出 RPA 与 API 集成的本质区别、三层结构与「越上层越脆弱」的稳定性排序；\n"
                     "2. 排序四种选择器的稳定性并解释 XPath 结构定位脆的原因，实现「等待条件 vs 固定 sleep」"
                     "的对比实验；\n"
                     "3. 用四个条件（稳定 UI/重复性/规则明确/无 API）判断场景是否适合 RPA，并给出录屏式与"
                     "代码式的选型。"),
"ai-auto-m3-c2-l1": ("1. 说出 AI 对 RPA 的三个增强点与各自适用的判断模式（规则兜底+模型判断+统计检测）；\n"
                     "2. 实现五阶段流水线的核心：字段抽取带 confidence/evidence、三类交叉校验、按置信度三级分流；\n"
                     "3. 复述成本结构与降本三板斧（小规则走模板/缓存/分级模型）。"),
"ai-auto-m3-c3-l1": ("1. 复述触发器/节点/连线的核心模型与平台的四个代价；\n"
                     "2. 用决策矩阵维度给三个场景判定平台或代码，并计算 SaaS 按次计费 vs 自托管的年成本；\n"
                     "3. 实践混合模式：平台调用代码 API 的三层结构（编排→计算→收尾）。"),
"ai-auto-m3-c4-l1": ("1. 设计最小权限矩阵（身份/范围/数据/操作四层次）并说明「假设 AI 一定会出错」的前提；\n"
                     "2. 实现熔断器与 PII 脱敏三规则，说出审计日志的最小字段集与 append-only 要求；\n"
                     "3. 对异常做三分类并把六项上线检查清单跑一遍。"),
"ai-auto-m3-c5-l1": ("1. 用六段复盘框架拆解任一自动化案例，并解释为何必须写「未达预期」；\n"
                     "2. 手算两个关键账：金额字段 91% 的月度冲红成本与多 Agent vs 工作流的成本/延迟/准确率；\n"
                     "3. 用七问清单自检一个自动化机会，说出六案例的可迁移原则各一句。"),
}

PREREQS = {
"ai-auto-m3-c1-l1": "- m1 的自动化 ROI 与三层次；\n- 基础 HTML/DOM 概念（了解即可）。",
"ai-auto-m3-c2-l1": "- m1-c2 的置信度概念、m1-c3 的结构化输出；\n- c1 的 RPA 结构。",
"ai-auto-m3-c3-l1": "- m1 的 ROI 与形态光谱；\n- c1/c2 的 RPA 与 AI 增强场景。",
"ai-auto-m3-c4-l1": "- m1-c1 的错误代价与人工兜底；\n- m2-c2 的幂等键。",
"ai-auto-m3-c5-l1": "- m3 前四节的全部概念（RPA/文档理解/平台/企业级约束）。",
}

MD = {}
for cid, t in THEMES.items():
    lid = cid + "-l1"
    MD[lid] = build_md(lib.orig_content(lid), GOALS[lid], PREREQS[lid],
                       t["why"], t["intuition"], t["code"], t["expected"],
                       t["cerr"], t["miscon"], t["connection"], t["summary"], t["ref"])

if len(sys.argv) > 1 and sys.argv[1] == "verify":
    lib.verify_codes(THEMES, GOALS)
else:
    for cid in THEMES:
        lib.patch_lesson(cid + "-l1", MD[cid + "-l1"])
    finish(lib)
