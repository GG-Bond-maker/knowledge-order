# -*- coding: utf-8 -*-
"""batch36 C 组：ai-auto-m2《Agent 架构与工作流》5 节升级（TS 源，_batch34_lib 模式）。
用法：python batch36_ai_auto_m2.py verify -> 跑章代码看输出
     python batch36_ai_auto_m2.py         -> 打补丁
"""
from _batch34_lib import Lib, build_md, finish
import sys

lib = Lib("ai-auto-m2", [
    "src/content/chapters/ai-auto-m2.ts",
    "src/content/chapters/ai-auto-m2b.ts",
    "src/content/chapters/ai-auto-m2c.ts",
])

C1 = dict(
name="c1 ReAct 循环：推理与行动交替",
why=("「北京今天适合跑步吗」暴露纯 LLM 的死穴：参数知识停留在训练截止日，还会自信地猜。ReAct"
     "（Reasoning+Acting）让模型在 Thought（推理）与 Action（调工具）之间交替，Observation 把真实世界"
     "反馈塞回上下文——模型不执行工具，只输出「我要调用什么」，执行权在你手里，这是一切安全设计的基石。"
     "ReAct 是 Agent 的心跳机制，但有代价：每轮重发历史、成本线性涨、可能无限循环——硬性停止条件不是可选项。"),
intuition=("纯 CoT 是「闭卷考试的学霸」：全靠脑内推演，错了没人纠正；ReAct 是「开卷考试+可以查资料的学生」："
           "想一步、查一步、看一眼结果再想。查证过的事实进了上下文，幻觉被真实观察挤出去。"
           "但这个学生可能一根筋（反复查同一个网页）——你要给他掐表（max_iterations）、限预算（max_tokens）。"),
code='''import json
TOOLS = {"get_weather": lambda city: {"temp": 18, "aqi": 45, "rain": False}}
TRAJECTORY = [
    {"thought": "需要天气数据", "action": "get_weather", "args": {"city": "北京"}},
    {"thought": "再查一次确认", "action": "get_weather", "args": {"city": "北京"}},
    {"thought": "还是不放心", "action": "get_weather", "args": {"city": "北京"}},
]
MAX_ITERS, seen = 3, {}
i = 0
for step in TRAJECTORY:
    i += 1
    if i > MAX_ITERS:
        print("达到最大轮数, 强制停止"); break
    key = json.dumps(step["args"], sort_keys=True)
    seen[key] = seen.get(key, 0) + 1
    obs = TOOLS[step["action"]](**step["args"])
    print(f"[{i}] {step['thought']} -> {step['action']} -> 观察 {obs}")
    if seen[key] >= 2:
        print("检测到重复调用 -> 注入『已查过』提示, 打破无限循环"); break
print(f"实际执行 {i} 轮 <- 轨迹是调试的核心资产")''',
expected=("实测：3 步轨迹中 get_weather 连续两次同参调用，第 2 次即被「已查过」检测器打断（实际执行 2 轮），"
          "max_iterations=3 作为强制停止兜底——重复检测+轮数上限两道闸门缺一不可，否则一个 bug 烧穿预算。"),
cerr=("Agent 循环不设 max_iterations/timeout/budget 三个硬闸（一个 bug 烧穿预算）；把工具执行权交给模型"
      "（模型只应输出调用请求）；评估只看最终答案不看轨迹（过程错结果对是隐患）。"),
miscon=("1. **ReAct 一定优于 CoT**——它用多轮调用换真实反馈，简单任务上又贵又慢；\n"
        "2. **模型会自己停下来**——没有停止条件它会无限循环或过早停止，两者都要外部闸门；\n"
        "3. **观察结果必须塞满上下文**——观察也要精简，长观察挤压有效信息。"),
connection=("- **向前**：m1-c2「模型只续写」决定了它必须靠工具接触真实世界；\n"
            "- **向后**：c2 的工具调用协议是 Action 的落地形式，c3 的工作流模式回答「什么时候根本不用 ReAct」；\n"
            "- **平行**：paper-reasoning c2 的指针思想——模型输出「指向哪个工具」。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 循环 | Thought→Action→Observation 交替 |\n"
         "| 分工 | 模型只输出调用请求，程序执行（安全基石） |\n"
         "| 三失败 | 无限循环/过早停止/失败不重试 |\n"
         "| 三闸门 | max_iterations + timeout + budget |\n"
         "| 资产 | 轨迹是调试与评估的核心 |"),
ref="本课程整理（可参见论文原文：Yao et al., ReAct: Synergizing Reasoning and Acting in Language Models, arXiv:2210.03629）",
)

C2 = dict(
name="c2 工具调用：让 LLM 能操作世界",
why=("LLM 只会生成 token——查库、发邮件、改文件都要靠工具调用。五步协议（定义→决定→校验→执行→回填）里"
     "模型只负责「决定」，其余四步全是你的代码：能拦、能改、能审计。ACI（Agent-计算机界面）设计决定 "
     "Agent 成功率的上限：描述写清何时用/不用、参数自解释、poka-yoke 防呆（枚举/格式/单位）、"
     "错误信息告诉模型怎么改、写操作必须幂等——工具数量超过 50 个选择率骤降，要分组路由。"),
intuition=("给模型的工具像「给实习生的操作台」：与其给一把没保险的枪（run_shell 什么都行），不如给一套"
           "只能按对的按钮（枚举+格式校验+窄接口）——错误在语法上就做不到，这叫防呆。工具描述要像写给"
           "初级开发者的 API 文档：什么时候用、什么时候别用、参数长什么样。"),
code='''import re
def validate(args):
    errs = []
    if not re.match(r"^ORD\\d+$", args.get("order_id", "")):
        errs.append("order_id 格式错误: 应为 ORD 开头+数字, 示例 ORD20260101")
    if not isinstance(args.get("amount_cents"), int) or args.get("amount_cents", 0) < 1:
        errs.append("amount_cents 必须为正整数(单位: 分)")
    return errs
print("校验非法参数:", validate({"order_id": "12345", "amount_cents": 29.9}))
_seen = {}
def refund(order_id, action, amount_cents, idem_key):
    if idem_key in _seen: return f"幂等命中, 不重复执行: {_seen[idem_key]}"
    _seen[idem_key] = f"{action} {order_id} {amount_cents}分"
    return "执行成功: " + _seen[idem_key]
print(refund("ORD1", "create", 29900, "k1")); print(refund("ORD1", "create", 29900, "k1"))''',
expected=("实测：非法参数 {order_id:'12345', amount_cents:29.9} 被两条可操作错误拦下（指出期望格式与单位）；"
           "幂等键 k1 第二次调用返回「幂等命中, 不重复执行」——模型重试或陷入循环也不会重复扣款。"),
cerr=("用自由字符串收日期/金额（元/分歧义）；给 run_shell 式万能接口（等于没保险的枪）；幂等键让模型生成"
      "（每次都不同，等于没做）；错误只返回 invalid input（模型无法自我修复）。"),
miscon=("1. **工具越多越强**——>50 个选择率骤降，要合并/路由/动态加载；\n"
        "2. **描述是给文档看的**——description 是模型选工具的唯一依据，要写触发条件与边界；\n"
        "3. **校验可以省**——模型生成的参数必须当不可信输入一样校验。"),
connection=("- **向前**：c1 的 Action 环节在此获得协议与安全设计；\n"
            "- **向后**：c3 的工作流把工具调用串成可控管线，M5 的护栏在权限层收口；\n"
            "- **平行**：m1-c3 的「schema 是 LLM 的接口」在工具定义上再次成立。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 协议 | 定义→模型决定→程序校验→程序执行→回填 |\n"
         "| ACI | 描述写清何时用/不用；参数自解释+示例 |\n"
         "| 防呆 | enum/format/单位(分)/窄接口，错误在语法上做不到 |\n"
         "| 幂等 | 写操作必配幂等键，由程序生成 |\n"
         "| 数量 | 3~10 最佳；>50 必须分组路由 |"),
ref="本课程整理（可参见 Toolformer（arXiv:2302.04761）、Anthropic《Building effective agents》附录与 Model Context Protocol 规范）",
)

C3 = dict(
name="c3 五种工作流模式：先工作流，再 Agent",
why=("Anthropic 与数十个团队合作后的核心区分：工作流=代码决定路径（可预测可测试），Agent=模型决定路径"
     "（灵活但不可控）。五种工作流模式——Chaining（串行+门检）、Routing（分类分派）、Parallelization"
     "（分段/投票）、Orchestrator-Workers（动态拆解）、Evaluator-Optimizer（生成-评估循环）——覆盖绝大多数"
     "生产场景。反直觉的结论：大多数时候工作流就够，Agent 只留给「步骤不可预测+反馈可验证」的少数场景。"),
intuition=("餐厅后厨：Chaining 是流水线（切菜→炒→装盘，每站质检）；Routing 是前台分单（凉菜/热菜/甜品"
           "各走各灶）；Parallelization 是同时开两灶+出菜前双人试菜（投票）；Orchestrator-Workers 是主厨"
           "按订单现派活；Evaluator-Optimizer 是试菜-回锅循环。多数餐馆靠前三种就能开张，全能主厨（Agent）"
           "又贵又难管。"),
code='''import numpy as np
rng = np.random.default_rng(24)
queries = rng.random(1000) < 0.8
cost = int(np.where(queries, 1, 10).sum())
print(f"Routing: 80% 简单问题给小模型 -> 总成本 {cost} 元 vs 全大模型 10000 元 (省 {1 - cost/10000:.0%})")
single = 0.85
p_majority = single**3 + 3 * single**2 * (1 - single)
print(f"Voting: 单次 {single:.0%} -> 3 票多数投票 {p_majority:.1%} (代价 3 倍 token)")
acc = 0.7
for it in range(1, 3):
    acc += (1 - acc) * 0.6
    print(f"Evaluator-Optimizer 第 {it} 轮改进后: {acc:.1%}")''',
expected=("实测：80% 简单问题路由给小模型后总成本 2791 元 vs 全大模型 10000 元（省 72%）；单次 85% 的判别"
          "升级为 3 票多数投票后达 93.9%（代价 3 倍 token）；Evaluator-Optimizer 每轮修复 60% 残余错误，"
          "2 轮后 70%→95.2%。"),
cerr=("把 Chaining 的中间产物不加 gate 校验直接传下一步（错误顺流而下）；所有请求都走大模型（不做 "
      "Routing 成本分层）；把 Orchestrator 用在子任务可预知的场景（Parallelization 更简单可靠）。"),
miscon=("1. **工作流是 Agent 的降级版**——它是默认选项：可测试、成本可预测、错误可定位；\n"
        "2. **投票万无一失**——票数少时提升有限（3 票 85%→93.9%），错误相关（同模型同偏差）时收益更低；\n"
        "3. **Evaluator 循环越多越好**——要设 max_iter，评估标准不清晰时循环会震荡。"),
connection=("- **向前**：m1-c4 的决策树在此细化为五种可复用模式；\n"
            "- **向后**：c4 的多 Agent 是 Orchestrator-Workers 的角色化版本，M5 的评估给 gate 与 voting 提供度量；\n"
            "- **平行**：StateFlow（arXiv:2403.11322）把工作流表述为状态机。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 分界 | 工作流=代码控路径；Agent=模型控路径 |\n"
         "| 五模式 | Chaining/Routing/Parallelization/Orchestrator-Workers/Evaluator-Optimizer |\n"
         "| 实测 | Routing 省 72% 成本；3 票投票 85%→93.9% |\n"
         "| 决策树 | 单次调用→固定分解→可预测步数→才上 Agent |\n"
         "| 原则 | 保持简单/优先透明/精心设计 ACI |"),
ref="本课程整理（可参见 Anthropic《Building effective agents》与 StateFlow（arXiv:2403.11322）相应内容）",
)

C4 = dict(
name="c4 多 Agent 协作：分工与对话",
why=("单 Agent 的两个瓶颈：上下文过载（所有信息挤一个对话）与角色冲突（既要大胆创作又要严格审查）。"
     "多 Agent 用分工解决——对话式/层级式/流水线式三种拓扑，单一职责、输入输出契约、冲突角色分开是"
     "设计四要点。但代价真实存在：3 个 Agent 串行（各 90%）整体只剩 72.9%，低于单 Agent 的 85%"
     "——大多数场景不需要多 Agent，拆分前先算账。"),
intuition=("论文写作小组：一个人既写又审会「护短」（模型同理，倾向于维护自己刚生成的内容）；分成作者+审稿人"
           "两个角色，审稿人带着「挑错」心态独立读，质量立刻不同。但每加一个人就多一份沟通成本（消息进"
           "上下文）、多一个出错环节（链式累积）——小组规模要用任务复杂度换算，不是越多越好。"),
code='''import numpy as np
rng = np.random.default_rng(25)
for n in (1, 3):
    print(f"{n} 个 Agent 串行(每个 90%): 整体 {0.9**n:.1%}, LLM 调用 {n*5} 次(各 5 轮)")
trials = 5000
same = (rng.random(trials) < 0.80).mean()      # 生成者自审: 倾向放行自己的答案
sep = (rng.random(trials) < 0.90).mean()       # 独立 Critic
print(f"生成者自审放行率 {same:.1%} vs 独立 Critic {sep:.1%} -> 冲突角色必须拆开")
print(f"但 3 链整体 = 0.9^3 = {0.9**3:.1%} < 单 Agent 85% -> 拆分前先算账")''',
expected=("实测：3 个 Agent 串行（每个 90%）整体 72.9%、LLM 调用 15 次（单 Agent 5 次）；蒙特卡洛显示"
          "生成者自审的放行率 80.0% 低于独立 Critic 的 90.2%——冲突角色拆开有真实收益；但 3 链的 72.9% "
          "低于单 Agent 的 85%：拆分前先和现状算账。"),
cerr=("设计「全能助手」式多面手角色（职责重叠导致重复劳动或互相推诿）；多 Agent 对话不设 max_rounds"
      "（互相客气聊不完）；消息全用自然语言（token 膨胀且格式不稳，应关键字段结构化）。"),
miscon=("1. **多 Agent=更强能力**——它增加成本与错误环节，只有「可分解+需不同人设+上下文会过载」同时成立才值得；\n"
        "2. **层级式=官僚主义**——它恰是最推荐的形态：控制流清晰、易调试；\n"
        "3. **收敛靠模型自觉**——必须用轮数上限+token 上限+收敛检测三重闸门。"),
connection=("- **向前**：c3 的 Orchestrator-Workers 在此角色化；\n"
            "- **向后**：M3 的企业级流程（权限/审计）约束多 Agent 的爆炸半径，M5 的可观测性负责定位「哪个 Agent 错了」；\n"
            "- **平行**：AutoGen（arXiv:2308.08155）的对话式拓扑是其学术化代表。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 三拓扑 | 对话式(自由/难控) 层级式(推荐) 流水线式(确定) |\n"
         "| 四要点 | 单一职责/IO 契约/冲突分开/避免重叠 |\n"
         "| 算账 | 3 链 0.9³=72.9% < 单 Agent 85% |\n"
         "| 收益 | 自审 80% vs 独立 Critic 90%（冲突角色拆开） |\n"
         "| 闸门 | max_rounds+token 上限+收敛检测 |"),
ref="本课程整理（可参见 AutoGen 论文 arXiv:2308.08155 与 Anthropic《Building effective agents》相应内容）",
)

C5 = dict(
name="c5 状态管理与持久化：让 Agent 可恢复",
why=("只靠对话历史记一切的「隐式状态」有三个死穴：回答不了「现在到哪一步」（又是一次不确定的推理）、"
     "中断即全丢、50 条消息把上下文撑爆。显式状态（control/facts/meta 分组）+ 状态机（每个状态有限出口）+ "
     "检查点（转移后必存）让 Agent 可观测、可恢复、可审计——从「能跑」到「敢上线」的必经一步。"),
intuition=("隐式状态像「只靠聊天记录办案」：案情全在 50 条微信里，想知道进展得从头翻；显式状态像「案件卷宗」："
           "当前阶段、已确认事实、重试次数分栏写清，警卫换班（进程重启）翻开卷宗就接着办。"
           "检查点是「每办完一步就归档」——断电也不怕。"),
code='''import json
CHECKPOINT = {}
def save(run_id, state): CHECKPOINT[run_id] = json.dumps(state, ensure_ascii=False)
def load(run_id): return json.loads(CHECKPOINT[run_id]) if run_id in CHECKPOINT else None
state = {"control": {"phase": "checking_status", "attempts": 1},
         "facts": {"order_id": "ORD123", "status": "已支付", "amount": 299},
         "meta": {"run_id": "r1", "tokens_used": 12000}}
save("r1", state)
print("崩溃前状态已存盘:", CHECKPOINT["r1"][:52], "...")
s = load("r1")
TRANS = {"checking_status": lambda f: "awaiting_confirm" if f["status"] == "已支付" else "rejected"}
s["control"]["phase"] = TRANS[s["control"]["phase"]](s["facts"])
s["control"]["attempts"] += 1
save("r1", s)
print("恢复后状态:", CHECKPOINT["r1"])
print(f"上下文成本: 显式状态 {len(CHECKPOINT['r1'])} 字符 vs 50 条历史 ≈ 8000 字符")''',
expected=("实测：崩溃前状态序列化存盘（control/facts/meta 三组）；恢复后从 phase=checking_status 按 Guard"
          "（status=已支付）转移到 awaiting_confirm，attempts 1→2 后再次存盘；显式状态 JSON 仅 170 字符 "
          "vs 50 条历史 ≈8000 字符——上下文成本差一个量级。"),
cerr=("state 里存函数/连接等不可序列化对象（恢复即崩）；从检查点恢复后重放写操作不用幂等键（重复扣款）；"
      "状态字段无节制增长（50+ 字段又变成另一个上下文）。"),
miscon=("1. **对话历史=状态**——历史是上下文不是状态；「现在到哪一步」应由 phase 字段直接回答；\n"
        "2. **检查点越频繁越好**——每步写库有成本，推荐「状态转移后必存，中间可选」；\n"
        "3. **必须用框架才能做检查点**——机制就是 JSON 序列化+存储，自实现几十行，LangGraph 是锦上添花。"),
connection=("- **向前**：c1 的轨迹是状态的原始形态，c2 的幂等键是「可重放」的前提；\n"
            "- **向后**：M3 的企业级落地把检查点接入审批流，M5 的可观测性消费 state.meta（token 计数等）；\n"
            "- **平行**：LangGraph checkpointer 与 StateFlow 论文是同一思想的框架化。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 隐式三死穴 | 答不了进度/中断全丢/上下文爆炸 |\n"
         "| 显式状态 | control/facts/meta 分组，JSON 可序列化 |\n"
         "| 状态机 | phase+转移+Guard：每个状态有限出口 |\n"
         "| 检查点 | 转移后必存；恢复+幂等键=可重放 |\n"
         "| 实测 | 170 字符 vs 50 条历史 ≈8000 字符 |"),
ref="本课程整理（可参见 StateFlow（arXiv:2403.11322）与 LangGraph 文档相应章节）",
)

THEMES = {
    "ai-auto-m2-c1": C1, "ai-auto-m2-c2": C2, "ai-auto-m2-c3": C3,
    "ai-auto-m2-c4": C4, "ai-auto-m2-c5": C5,
}

GOALS = {
"ai-auto-m2-c1-l1": ("1. 对比纯 LLM/CoT/ReAct 在「获取新信息、验证假设、纠错」上的能力差异，"
                     "复述 Thought/Action/Observation 的分工（模型只输出调用请求）；\n"
                     "2. 手写带 max_iterations 与重复调用检测的最小 ReAct 循环，说出三种失败模式"
                     "与三个硬性停止条件；\n"
                     "3. 解释轨迹（trajectory）为何是调试与评估的核心资产。"),
"ai-auto-m2-c2-l1": ("1. 复述五步工具调用协议与「模型永不执行」的安全含义；\n"
                     "2. 按 ACI 清单评审工具定义，实现 pattern/枚举/单位三重参数校验与幂等键防重复扣款；\n"
                     "3. 说出错误信息「告诉模型怎么改」的原则与工具数量>50 的分组路由策略。"),
"ai-auto-m2-c3-l1": ("1. 复述工作流 vs Agent 的分界（控制流归谁）与 Anthropic「先最简方案」原则；\n"
                     "2. 用代码量化 Routing 的成本优化与 Voting 的准确率提升，说出 Orchestrator 与 "
                     "Parallelization 的子任务差异；\n"
                     "3. 走完选型决策树并给出 Evaluator-Optimizer 的两个启用条件。"),
"ai-auto-m2-c4-l1": ("1. 对比三种协作拓扑（对话式/层级式/流水线式）的控制流与调试难度；\n"
                     "2. 用蒙特卡洛量化「生成者自审 vs 独立 Critic」的角色分离收益与 3 链串行的错误累积；\n"
                     "3. 应用角色设计四要点并设置 max_rounds 与收敛检测。"),
"ai-auto-m2-c5-l1": ("1. 列举隐式状态三问题并设计最小显式状态（control/facts/meta 分组，JSON 可序列化）；\n"
                     "2. 实现检查点 save/load 与基于 phase 的状态机转移（Guard 条件），说明存盘时机；\n"
                     "3. 用字符数对比显式状态与 50 条历史的上下文成本，复述幂等可重放与状态精简法。"),
}

PREREQS = {
"ai-auto-m2-c1-l1": "- m1-c2 的 LLM 特性（无记忆、概率输出）；\n- m1-c3 的结构化输出（工具调用的形式）。",
"ai-auto-m2-c2-l1": "- c1 的 ReAct 循环（Action 的载体）；\n- m1-c3 的 JSON schema 校验。",
"ai-auto-m2-c3-l1": "- m1-c4 的三种形态与错误累积；\n- c1/c2 的 ReAct 与工具调用（模式中的节点）。",
"ai-auto-m2-c4-l1": "- c3 的工作流模式（Orchestrator-Workers 是层级式的基础）；\n- m1-c4 的错误累积。",
"ai-auto-m2-c5-l1": "- c1 的轨迹与停止条件；\n- c2 的幂等键（恢复后不重复副作用）。",
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
