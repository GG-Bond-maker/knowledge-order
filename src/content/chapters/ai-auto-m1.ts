import type { Chapter } from '../../types';

/* ============================================================
 *  AI 自动化 · M1 AI 自动化基础
 *  c1 自动化与 AI 的边界    c2 LLM 是什么
 *
 *  来源：
 *  - 学术：MIT 6.034 Lecture 1（AI 的定义与范围，CC BY-NC-SA 4.0）
 *  - 学术：MIT 16.410 Principles of Autonomy and Decision Making（规划/决策，CC BY-NC-SA 4.0）
 *  - 学术：Chain-of-Thought arXiv:2201.11903
 *  - 学术：CMU 11-766 第 3 讲「The science of prompting」
 *  - 工程实践（非学术）：Anthropic/OpenAI 官方文档关于 token 与采样的说明
 *  - 原创：框架、示例、图示、全部习题
 * ============================================================ */

export const aiAutoM1Chapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c1：自动化与 AI 的边界
   * ============================================================ */
  {
    id: 'ai-auto-m1-c1',
    title: '自动化与 AI：边界在哪里',
    goal: '理解自动化的三个层次与成本结构，能判断一个任务是否适合自动化，知道 AI 自动化的失效模式。',
    lessons: [
      {
        id: 'ai-auto-m1-c1-l1',
        title: '确定性与概率性：AI 自动化的根本区别',
        difficulty: 2,
        content: `
## 一个必须先想清楚的问题

在写第一行代码之前，先问自己：

> **这个任务，值得自动化吗？**

很多人跳过这一步，直接开始写，结果做了个"能用但没人用"的工具。

**判断标准**（三个都要算）：

    收益 = 每次节省的时间 × 执行频率
    成本 = 开发时间 + 维护成本 + 出错代价
    值得做 ⟺ 收益 > 成本，且余量足够覆盖风险

**一个常被忽略的项**：**维护成本**。
自动化脚本会因为接口变更、页面改版、数据格式调整而失效。
一个每天跑一次的脚本，如果每月要修 2 小时，那"节省"的时间可能还不够修它。

## 自动化的三个层次

<AutomationSpectrum />

| 层次 | 控制流 | 确定性 | 成本 | 典型场景 |
| --- | --- | --- | --- | --- |
| **脚本** | 完全由代码决定 | ~100% | 1× | 定时备份、批量重命名、格式转换 |
| **工作流** | 代码决定路径，部分节点用模型判断 | ~75% | 3× | 工单分流、发票抽取、内容审核 |
| **Agent** | 模型自主决定 | ~25% | 10× | 自主修 bug、深度调研 |

**关键原则**：**能用左边的，就不要用右边的。**

这不是保守，而是工程理性：
- 脚本可测试（给定输入必有确定输出）；
- 工作流的调用次数固定（成本可预测）；
- Agent 的路径不可预测（成本和延迟都不可控）。

## 确定性 vs 概率性：最根本的区别

**传统自动化**：

    输入 → [确定的程序] → 输出

同一个输入，永远得到同一个输出。**可以写单元测试**。

**AI 自动化**：

    输入 → [概率模型] → 输出（可能不同）

同一个输入，两次调用可能得到不同结果。**不能写传统单元测试**。

**这个差异带来四个连锁后果**：

| 后果 | 说明 |
| --- | --- |
| **无法断言相等** | 不能写 \`assert output == expected\`，只能写"包含关键词""语义相似" |
| **需要多次运行** | 评估要看 100 次的分布，而不是单次结果 |
| **错误不可避免** | 目标不是 0 错误，而是"错误可控 + 有兜底" |
| **必须有人工兜底** | 低置信度的结果要转人工 |

**这就是为什么 AI 自动化的设计重心不在"让它更准"，而在"错了会怎样"。**

## 长尾问题：为什么 95% 准确率可能不可用

假设一个自动回复系统，准确率 95%。

**听起来不错？** 算一下：

    日均 10000 次调用
    5% 错误 = 每天 500 次错误回复

如果错误回复会导致客户投诉，500 次/天是不可接受的。

**关键洞察**：**准确率要看绝对数量，不能只看百分比。**

| 准确率 | 日调用 1 万时的错误数 | 可用性判断 |
| --- | --- | --- |
| 99.9% | 10 | 可接受（有兜底） |
| 99% | 100 | 需要人工抽检 |
| 95% | 500 | 必须有强兜底或转人工 |
| 90% | 1000 | 不可用于面向客户的场景 |

**降级策略**：不是追求 99.9%，而是**分层处理**——

    高置信度（>0.9）→ 全自动
    中置信度（0.6~0.9）→ 自动 + 人工抽检
    低置信度（<0.6）→ 转人工

## 人机协作的四种模式

| 模式 | 说明 | 适用 |
| --- | --- | --- |
| **全自动** | 人完全不介入 | 低风险、可回滚（如内部报表生成） |
| **人工确认** | AI 做，人点确认 | 中风险、不可逆（如发邮件、下单） |
| **人机接力** | AI 做一部分，人接手 | 复杂任务（如 AI 起草 → 人修改） |
| **AI 辅助** | 人主导，AI 建议 | 高风险（如医疗诊断、法律意见） |

**选择依据**：**错误的代价**。

- 代价低且可回滚 → 全自动；
- 代价高或不可逆 → 至少人工确认。

## 任务是否适合自动化：五问清单

**① 输入是否结构化？**

- 结构化（数据库字段、API 参数）→ 容易；
- 半结构化（表单、邮件）→ 需要抽取；
- 非结构化（图片、语音、自由文本）→ 需要模型。

**② 输出是否可验证？**

- 可验证（代码能跑、答案有标准）→ 可靠；
- 不可验证（文案质量、创意）→ 只能靠人判断。

**③ 错误代价多大？**

- 可回滚（内部草稿）→ 容忍度高；
- 不可逆（转账、发公告）→ 必须有检查点。

**④ 频率多高？**

- 高频（每天几百次）→ 值得投入开发；
- 低频（每月一次）→ 手工做更划算。

**⑤ 流程是否稳定？**

- 稳定（接口不变、规则明确）→ 适合自动化；
- 频繁变化（业务规则每周改）→ 维护成本可能超过收益。

**五问全过 → 适合；有 2 个以上不过 → 慎重。**

## 流程建模：把任务画成状态机

MIT 16.410（自主与决策）的核心视角：
**先建模，再实现**。

**为什么**：自动化失败最常见的原因不是"模型不够好"，
而是**流程本身没想清楚**——边界情况没考虑、状态没定义、异常没处理。

**最小建模方法**：

    1. 列出所有状态（任务可能处于的阶段）
    2. 列出每个状态的出口（能转移到哪里、条件是什么）
    3. 标出终态（成功/失败/取消）
    4. 检查：有没有"卡住"的状态？有没有走不到的终态？

**一个反例**：

    [处理中] ──成功──> [完成]
        └──失败──> ？（没定义）

**这就是漏洞**：失败后卡在"处理中"永远出不来。

**正确做法**：每个状态都必须有失败出口。

## 本节的来源

> **来源类型：学术来源**
> - MIT 6.034 *Artificial Intelligence*，Lecture 1「Introduction and Scope」
>   https://ocw.mit.edu/courses/6-034-artificial-intelligence-fall-2010/
>   许可：CC BY-NC-SA 4.0（可改编，需署名）
> - MIT 16.410 *Principles of Autonomy and Decision Making*（规划、决策、状态建模视角）
>   https://ocw.mit.edu/courses/16-410-principles-of-autonomy-and-decision-making-fall-2010/
>   许可：CC BY-NC-SA 4.0
>
> **来源类型：工程实践（非学术）**
> - Anthropic《Building effective agents》关于"先找最简方案"的论述
>   https://www.anthropic.com/research/building-effective-agents
>
> **来源类型：原创**
> - 自动化三层次框架、五问清单、成本公式、置信度分层策略、全部示例与习题
`,
        tips: [
          {
            kind: 'interview',
            text: '「AI 自动化与传统自动化的根本区别」：传统是确定性的（同输入同输出，可写单元测试），AI 是概率性的（同输入可能不同输出，只能评估分布）。这导致设计重心从"更准"转向"错了会怎样"。',
          },
          {
            kind: 'leak',
            text: '95% 准确率在日均 1 万次调用下 = 每天 500 次错误。准确率要看绝对数量，不能只看百分比。解法不是追求 99.9%，而是按置信度分层（高自动/中转人工/低全人工）。',
          },
          {
            kind: 'pitfall',
            text: '自动化最常见的失败原因不是模型不好，而是流程没建模清楚——状态没定义全、失败路径没考虑，导致任务卡在中间状态出不来。',
          },
        ],
        demos: [
          {
            title: '自动化收益计算器',
            lang: 'python',
            code: `def should_automate(
    minutes_per_run,      # 每次手工耗时（分钟）
    runs_per_month,       # 每月执行次数
    dev_hours,            # 开发投入（小时）
    maintain_hours_month, # 每月维护（小时）
    hourly_rate=100,      # 人力成本（元/小时）
    months=12,            # 评估周期
):
    """判断一个任务是否值得自动化。"""
    saved_hours = minutes_per_run * runs_per_month * months / 60
    saved_value = saved_hours * hourly_rate

    dev_cost = dev_hours * hourly_rate
    maintain_cost = maintain_hours_month * months * hourly_rate
    total_cost = dev_cost + maintain_cost

    net = saved_value - total_cost
    roi = net / total_cost if total_cost else 0

    return {
        "saved_hours": round(saved_hours, 1),
        "saved_value": round(saved_value),
        "dev_cost": round(dev_cost),
        "maintain_cost": round(maintain_cost),
        "net": round(net),
        "roi": round(roi, 2),
        "worth_it": net > 0 and roi > 0.5,   # 至少 50% 回报
    }

cases = [
    ("日报生成", 20, 20, 8, 0.5),
    ("月度报表", 120, 1, 16, 1),
    ("偶发的数据修复", 60, 0.2, 4, 0.2),
    ("客服自动回复", 3, 5000, 40, 8),
]

print("场景            | 年省工时 | 净收益 | ROI  | 值得做")
print("-" * 60)
for name, m, r, d, mt in cases:
    x = should_automate(m, r, d, mt)
    print(f"{name:14} | {x['saved_hours']:7.0f}h | {x['net']:7.0f} | {x['roi']:5.2f} | {'是' if x['worth_it'] else '否'}")

print()
print("关键观察：")
print("  - 高频 + 单次耗时长的任务 ROI 最高")
print("  - 低频任务（如月度报表）即使单次耗时长，也可能不划算")
print("  - 维护成本是隐形杀手：每月修 8 小时 = 每年 96 小时")`,
          },
          {
            title: '准确率的绝对数量：为什么 95% 可能不可用',
            lang: 'python',
            code: `def error_volume(accuracy, daily_calls):
    return daily_calls * (1 - accuracy)

print("日调用量 | 准确率 | 每日错误数 | 评估")
print("-" * 55)
for calls in [100, 1000, 10000, 100000]:
    for acc in [0.999, 0.99, 0.95, 0.90]:
        errs = error_volume(acc, calls)
        if errs < 5:
            verdict = "可接受"
        elif errs < 50:
            verdict = "需抽检"
        elif errs < 500:
            verdict = "需强兜底"
        else:
            verdict = "不可用于客户侧"
        print(f"{calls:8} | {acc:6.1%} | {errs:10.0f} | {verdict}")
    print()

print("=== 置信度分层策略 ===")
def route_by_confidence(conf):
    if conf >= 0.9:
        return "全自动"
    elif conf >= 0.6:
        return "自动 + 抽检"
    return "转人工"

for c in [0.95, 0.85, 0.7, 0.5, 0.3]:
    print(f"  置信度 {c:.2f} -> {route_by_confidence(c)}")

print()
print("核心：不追求 99.9%，而是让「错的代价」可控。")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'ai-auto-m1-c1-e1',
        type: 'single',
        difficulty: 2,
        question: 'AI 自动化与传统自动化的根本区别是？',
        options: [
          { value: 'A', text: 'AI 自动化更快' },
          { value: 'B', text: '传统是确定性的（同输入同输出），AI 是概率性的（可能不同输出）' },
          { value: 'C', text: 'AI 自动化不需要代码' },
          { value: 'D', text: '传统自动化不能处理文本' },
        ],
        answer: 'B',
        explanation:
          '确定性意味着可以写单元测试、结果可复现；概率性意味着无法断言相等、需要多次运行评估分布、错误不可避免。这个差异决定了设计重心从"更准"转向"错了会怎样"。',
        tags: ['确定性 vs 概率性'],
      },
      {
        id: 'ai-auto-m1-c1-e2',
        type: 'judge',
        difficulty: 2,
        question: '一个任务的自动化准确率达到 95%，就已经足够用于面向客户的场景。',
        answer: false,
        explanation:
          '要看绝对数量。日均 1 万次调用时，95% 准确率 = 每天 500 次错误回复，客户侧不可接受。准确率必须结合调用量判断，且需要置信度分层兜底。',
        tags: ['准确率'],
      },
      {
        id: 'ai-auto-m1-c1-e3',
        type: 'multiple',
        difficulty: 3,
        question: '判断一个任务是否值得自动化，应该考虑哪些因素？（多选）',
        options: [
          { value: 'A', text: '每次节省的时间 × 执行频率（收益）' },
          { value: 'B', text: '开发成本 + 维护成本 + 出错代价' },
          { value: 'C', text: '流程是否稳定（接口/规则是否频繁变化）' },
          { value: 'D', text: '是否能用到最新的 AI 模型' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 不是判断依据——用最新模型与"值不值得自动化"无关。A/B/C 是核心：收益、成本（尤其常被忽略的维护成本）、稳定性。',
        tags: ['自动化判断'],
      },
      {
        id: 'ai-auto-m1-c1-e4',
        type: 'fill',
        difficulty: 3,
        question:
          '自动化最常见的失败原因不是模型不够好，而是流程没有 ___ 清楚——状态没定义全、失败路径没考虑。',
        blanks: [['建模', 'model', '梳理', '设计']],
        explanation:
          'MIT 16.410 的核心视角：先建模再实现。每个状态必须有失败出口，否则任务会卡在中间状态出不来。',
        tags: ['流程建模'],
      },
      {
        id: 'ai-auto-m1-c1-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现自动化收益计算：automation_roi(minutes_per_run, runs_per_month, dev_hours, maintain_hours_month, hourly_rate=100, months=12)。\n\n- 节省工时 = 分钟 × 次数 × 月数 / 60\n- 开发成本 = dev_hours × 时薪\n- 维护成本 = maintain_hours_month × 月数 × 时薪\n- 返回 (节省价值, 总成本, 净收益)，均保留 1 位小数',
        starterCode: `def automation_roi(minutes_per_run, runs_per_month, dev_hours,
                   maintain_hours_month, hourly_rate=100, months=12):
    saved_hours = ___
    saved_value = ___
    dev_cost = ___
    maintain_cost = ___
    net = ___
    return round(saved_value, 1), round(dev_cost + maintain_cost, 1), round(net, 1)
`,
        setupCode: '',
        expectedOutput: '收益计算',
        tests: `sv, tc, net = automation_roi(20, 20, 8, 0.5)
# 节省: 20*20*12/60 = 80 小时 -> 8000 元
assert abs(sv - 8000) < 1, f"节省价值应为 8000，实际 {sv}"
# 成本: 8*100 + 0.5*12*100 = 800 + 600 = 1400
assert abs(tc - 1400) < 1, f"总成本应为 1400，实际 {tc}"
assert abs(net - 6600) < 1, f"净收益应为 6600，实际 {net}"
# 低频任务不划算
sv2, tc2, net2 = automation_roi(60, 0.2, 4, 0.2)
assert net2 < 0, f"低频任务应为负收益，实际 {net2}"
`,
        answer: `def automation_roi(minutes_per_run, runs_per_month, dev_hours,
                   maintain_hours_month, hourly_rate=100, months=12):
    saved_hours = minutes_per_run * runs_per_month * months / 60
    saved_value = saved_hours * hourly_rate
    dev_cost = dev_hours * hourly_rate
    maintain_cost = maintain_hours_month * months * hourly_rate
    net = saved_value - dev_cost - maintain_cost
    return round(saved_value, 1), round(dev_cost + maintain_cost, 1), round(net, 1)
`,
        explanation:
          '**维护成本是隐形杀手**：每月修 0.5 小时看似不多，一年就是 6 小时 = 600 元。\n\n低频任务（如每月 0.2 次）即使单次耗时 1 小时，年节省也只有 24 小时，很难覆盖开发成本。\n\n**这个计算应该在做之前算，而不是做完才发现不划算。**',
        tags: ['编程', '收益计算'],
      },
      {
        id: 'ai-auto-m1-c1-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现置信度分层路由：route_by_confidence(confidence, high=0.9, low=0.6)。\n\n- confidence >= high → "auto"（全自动）\n- confidence >= low  → "review"（自动+抽检）\n- 否则 → "human"（转人工）',
        starterCode: `def route_by_confidence(confidence, high=0.9, low=0.6):
    if ___
        return "auto"
    elif ___
        return "review"
    return "human"
`,
        setupCode: '',
        expectedOutput: '分层路由',
        tests: `assert route_by_confidence(0.95) == "auto"
assert route_by_confidence(0.9) == "auto", "恰好等于 high 应全自动"
assert route_by_confidence(0.85) == "review"
assert route_by_confidence(0.6) == "review", "恰好等于 low 应抽检"
assert route_by_confidence(0.5) == "human"
assert route_by_confidence(0.0) == "human"
# 自定义阈值
assert route_by_confidence(0.7, high=0.95, low=0.5) == "review"
`,
        answer: `def route_by_confidence(confidence, high=0.9, low=0.6):
    if confidence >= high:
        return "auto"
    elif confidence >= low:
        return "review"
    return "human"
`,
        explanation:
          '这是 AI 自动化的**核心兜底模式**：不追求所有情况都自动，而是按置信度分层。\n\n**边界用 `>=`**：恰好等于阈值应归入较自动的一侧（乐观策略）。若要保守，改成 `>`。\n\n生产环境还要考虑：不同业务线的阈值不同（金融严格、内容宽松）。',
        tags: ['编程', '置信度路由'],
      },
      {
        id: 'ai-auto-m1-c1-e7',
        type: 'judge',
        difficulty: 3,
        question: '流程建模时，每个状态都必须有失败出口，否则任务可能卡在中间状态出不来。',
        answer: true,
        explanation:
          '这是流程建模最常见的漏洞。例如"处理中 → 成功 → 完成"但没定义失败路径，失败后永远停在"处理中"。建模检查清单里必须包含"有没有卡住的状态"。',
        tags: ['流程建模'],
      },
      {
        id: 'ai-auto-m1-c1-e8',
        type: 'single',
        difficulty: 3,
        question: '下列哪种场景最适合「全自动」（人完全不介入）？',
        options: [
          { value: 'A', text: '向客户发送正式道歉邮件' },
          { value: 'B', text: '生成内部使用的数据日报（可随时修正）' },
          { value: 'C', text: '执行大额转账' },
          { value: 'D', text: '发布公司对外公告' },
        ],
        answer: 'B',
        explanation:
          '选择依据是「错误的代价」：低风险且可回滚 → 全自动。内部日报即使出错也能随时修正，成本低。A/C/D 都是不可逆或对外可见的高风险操作，必须有人工确认。',
        tags: ['人机协作'],
      },
      {
        id: 'ai-auto-m1-c1-e9',
        type: 'code',
        difficulty: 3,
        question:
          '检查状态机是否有漏洞：check_state_machine(states, transitions, terminal_states)。\n\n- states: 状态名列表\n- transitions: dict，源状态 → 目标状态列表\n- terminal_states: 终态列表\n\n返回问题列表（字符串）。检查三项：\n1. 非终态没有任何出口 → "状态X没有出口"\n2. 终态有出口 → "终态X不应有出口"\n3. transitions 中出现未定义的状态 → "未定义的状态X"',
        starterCode: `def check_state_machine(states, transitions, terminal_states):
    issues = []
    known = set(states)
    ___
    return issues
`,
        setupCode: '',
        expectedOutput: '状态机检查',
        tests: `states = ["a", "b", "done"]
transitions = {"a": ["b"], "b": ["done"], "done": []}
assert check_state_machine(states, transitions, ["done"]) == []

# 非终态无出口
states2 = ["a", "b", "done"]
tr2 = {"a": ["b"], "b": [], "done": []}
out = check_state_machine(states2, tr2, ["done"])
assert any("b" in x and "出口" in x for x in out), f"应检出 b 无出口，实际 {out}"

# 终态有出口
tr3 = {"a": ["done"], "done": ["a"]}
out3 = check_state_machine(["a", "done"], tr3, ["done"])
assert any("终态" in x for x in out3), f"应检出终态有出口，实际 {out3}"

# 未定义状态
tr4 = {"a": ["zzz"]}
out4 = check_state_machine(["a"], tr4, [])
assert any("zzz" in x for x in out4), f"应检出未定义状态，实际 {out4}"
`,
        answer: `def check_state_machine(states, transitions, terminal_states):
    issues = []
    known = set(states)
    terminal = set(terminal_states)

    for s in states:
        outs = transitions.get(s, [])
        if s not in terminal and not outs:
            issues.append(f"状态 {s} 没有出口")
        if s in terminal and outs:
            issues.append(f"终态 {s} 不应有出口")

    for src, targets in transitions.items():
        if src not in known:
            issues.append(f"未定义的状态 {src}")
        for t in targets:
            if t not in known:
                issues.append(f"未定义的状态 {t}")

    return issues
`,
        explanation:
          '这是**流程建模的自动化检查**，能在写代码前发现设计漏洞。\n\n三项检查对应三类常见错误：\n1. **死胡同**：非终态没有出口，任务卡住；\n2. **终态可离开**：已完成的单子又被处理（如重复打款）；\n3. **幽灵状态**：引用了不存在的状态，运行时才报错。\n\n生产环境还应检查：从初始状态能否到达所有状态（可达性）、有没有环。',
        tags: ['编程', '状态机检查'],
      },
      {
        id: 'ai-auto-m1-c1-e10',
        type: 'open',
        difficulty: 4,
        question:
          '你的同事提议：用 AI 自动处理客户的退款申请（读取邮件 → 判断是否符合退款政策 → 自动退款 → 回复客户）。\n\n请用本节的框架评估这个方案：① 是否适合自动化；② 三个层次中该选哪个；③ 具体的设计要点；④ 你会提出哪些反对意见或补充条件。',
        referenceAnswer: `**① 是否适合自动化：部分适合，但不能全自动**

用五问清单过一遍：

| 问题 | 判断 |
| --- | --- |
| 输入是否结构化？ | ⚠️ 邮件是非结构化的，需要抽取（订单号、原因、金额） |
| 输出是否可验证？ | ✅ 退款政策是明确的规则，可验证 |
| 错误代价多大？ | ❌ **不可逆**（钱已经退了） |
| 频率多高？ | ✅ 假设每天几十到几百次，值得自动化 |
| 流程是否稳定？ | ✅ 退款政策相对稳定 |

**结论**：高频、可验证 → 适合自动化；但**不可逆** → 不能全自动。

**② 该选哪个层次：工作流（不是 Agent）**

理由：
- 退款政策的判断是**规则明确**的，不需要模型自由发挥；
- 流程是**固定的**（读邮件 → 抽取 → 判断 → 退款 → 回复），不需要动态规划；
- 用 Agent 会带来不必要的成本和不可预测性。

**具体形态**：Prompt Chaining + Routing + 人工检查点

    邮件
      ↓
    [抽取] 订单号、退款原因、金额（模型 + 结构化输出）
      ↓
    [校验] 订单号格式、订单是否存在（代码）
      ↓
    [Routing] 按退款原因分流
      ├─ 质量问题 → 直接退（政策允许）
      ├─ 七天无理由 → 检查是否超期
      ├─ 其他 → 转人工
      ↓
    [金额判断]
      ├─ ≤ 200 元 → 自动退款（带幂等键）
      └─ > 200 元 → 转人工审批
      ↓
    [回复] 生成回复邮件（模型）
      ↓
    [人工确认] 所有自动退款在发送前需人工点一次确认（第一版）

**③ 具体设计要点**

**a) 抽取环节必须可校验**

    {
      "order_id": "ORD20260101",     # 必须匹配 ORD\\d{8}
      "reason": "质量问题",           # 必须 ∈ 枚举
      "amount_cents": 29900,         # 必须 ≤ 订单金额
      "confidence": 0.92
    }

抽取失败或校验不过 → 直接转人工，不要硬猜。

**b) 退款政策用代码实现，不用模型判断**

    POLICY = {
        "质量问题": {"max_days": 30, "auto_limit_cents": 20000},
        "七天无理由": {"max_days": 7, "auto_limit_cents": 20000},
        "其他": None,   # 转人工
    }

**关键**：政策判断必须是**确定性的**。让模型判断"是否符合政策"是危险的——它可能理解错。

**c) 幂等保护**

    key = f"refund:{order_id}:{email_id}"

防止同一封邮件被处理两次（邮件系统可能重投）。

**d) 全链路留痕**

- 原始邮件内容；
- 抽取结果与置信度；
- 政策判断的输入与结论；
- 退款接口的请求与响应；
- 最终回复内容。

**④ 反对意见与补充条件**

**反对意见**：

1. **"自动退款"的表述太激进**
   第一版不应该有任何"无人确认"的退款。
   应该叫"AI 辅助退款"——AI 准备好一切，人点一下确认。

2. **缺少对"恶意退款"的防范**
   同一用户短期内多次申请？退款理由与实际不符？
   需要加：单用户频率限制、历史退款率检查。

3. **缺少对"抽取错误"的兜底**
   如果模型把订单号抽错了，可能退到别人的订单上。
   必须：订单归属校验（该订单属于发件人邮箱对应的用户）。

4. **缺少降级方案**
   AI 服务挂了怎么办？邮件积压？
   必须有：AI 不可用时全部转人工的开关。

**补充条件（必须先满足才能上线）**：

| 条件 | 说明 |
| --- | --- |
| 人工确认环节 | 第一版所有退款都要人点确认 |
| 金额上限 | 单笔 ≤ 200 元，日累计 ≤ 2000 元 |
| 订单归属校验 | 只能退给发件人自己的订单 |
| 幂等保护 | 防止重复退款 |
| 全链路审计 | 每笔都能追溯到原始邮件与决策依据 |
| 灰度上线 | 先 5% 流量，观察 2 周 |
| 一键降级 | AI 故障时全部转人工 |

**⑤ 一个更重要的建议**

**先做"只读"版本**：

第一版只做"读取邮件 → 抽取信息 → 生成建议 → 人工执行"，
不碰任何写操作。

跑 1~2 个月后，统计：
- 抽取准确率多少？
- 政策判断正确率多少？
- 人工平均处理时间从 X 分钟降到多少？

**有了这些数据，再决定要不要放开自动退款。**

**不要在没有任何实测数据的情况下直接上线写操作。**`,
        rubric: [
          { point: '五问清单评估，指出「不可逆」是最大风险', score: 2 },
          { point: '选择工作流而非 Agent，并说明理由（规则明确、流程固定）', score: 2 },
          { point: '设计要点：抽取可校验 + 政策用代码 + 幂等 + 留痕', score: 3 },
          { point: '反对意见：订单归属校验、恶意退款防范、降级方案', score: 2 },
          { point: '提出「先做只读版本收集数据」的务实建议', score: 1 },
        ],
        keywords: ['不可逆', '工作流', '政策代码化', '幂等', '订单归属', '只读版本'],
        explanation:
          '这道题的核心是「不可逆操作的谨慎」。能指出「政策判断不能交给模型」与「先做只读版本」，就是生产级的判断力。',
        tags: ['自动化评估', '综合'],
      },
    ],
  },

  /* ============================================================
   *  c2：LLM 是什么
   * ============================================================ */
  {
    id: 'ai-auto-m1-c2',
    title: 'LLM 是什么：从 token 到回答',
    goal: '理解 token、上下文窗口、自回归生成与采样参数，知道 LLM 为什么会幻觉，以及这些特性如何影响自动化设计。',
    lessons: [
      {
        id: 'ai-auto-m1-c2-l1',
        title: 'token、生成与幻觉',
        difficulty: 2,
        content: `
## LLM 做的只有一件事

**给定一段文本，预测下一个 token 的概率分布。**

就这一件事，反复做，就产生了看起来像"理解"和"推理"的行为。

    "今天天气" → 模型 → {"很": 0.32, "不": 0.18, "真": 0.15, ...}
    选中 "很" 后："今天天气很" → 模型 → {"好": 0.45, "热": 0.22, ...}

**关键认知**：模型**不是在查资料，而是在续写**。
它没有"知道事实"的机制，只有"什么词最可能跟在后面"的统计规律。

## Token：模型眼中的文本单位

<ReactLoopDemo />

模型不直接处理字符，而是处理 **token**——由分词器（tokenizer）切出的片段。

<TokenFlow />

**三个必须知道的数字**：

| 概念 | 含义 | 影响 |
| --- | --- | --- |
| **token 数** | 文本被切成多少片 | 决定成本与上下文占用 |
| **上下文窗口** | 一次能处理的最大 token 数 | 决定"能看多长的资料" |
| **输出上限** | 单次最多生成多少 token | 决定"能写多长" |

**中英文的 token 差异**（重要）：

- 英文：约 **4 字符 = 1 token**；
- 中文：约 **1 字 = 1~2 token**。

**这意味着**：同样的信息量，中文消耗的 token 可能是英文的 1.5~2.5 倍。
中文场景的成本估算必须按实际 token 算，不能按字符数除以 4。

## 上下文窗口：模型的"短期记忆"

**关键特性**：模型**没有记忆**。

每次调用都是独立的——它不记得上次说了什么，
除非你把历史重新发给它。

    第 1 次调用：[用户问题A] → 回答A
    第 2 次调用：[用户问题B] → 回答B   ← 完全不记得 A

**这就是为什么 Agent 要维护对话历史**：
每一轮都要把之前的全部内容重新发一遍。

**后果**：

| 后果 | 说明 |
| --- | --- |
| **成本随轮次增长** | 第 10 轮要发 10 轮的历史，token 线性增长 |
| **上下文会超限** | 长对话最终会撑爆窗口 |
| **中间信息会被忽略** | 长上下文中部的内容召回率显著下降（"lost in the middle"） |

**实践启示**：
- 长任务要**主动压缩历史**（摘要、只留关键事实）；
- 关键信息要放在**开头或结尾**，不要埋中间；
- 上下文窗口不是"越大越好用"，而是"越大越贵且越不可靠"。

## 自回归生成：一次一个 token

模型生成不是"想好了整段再输出"，而是**一个 token 一个 token 地生成**，
每生成一个就把它加到输入里，再预测下一个。

    输入："写一首关于春天的诗"
    生成："春" → 输入变成"写一首关于春天的诗春"
    生成："风" → 输入变成"写一首关于春天的诗春风"
    ...

**这个机制带来两个重要后果**：

**① 输出是流式的**

可以边生成边显示——这就是"流式输出"体验的基础。
工程上要利用这一点：不要等全部生成完再展示。

**② 前面的错误会影响后面**

一旦生成了一个错的 token，后续都会基于这个错误继续生成。
**这是"错误累积"在单次生成内部的体现。**

## 采样参数：控制输出的"随机程度"

模型输出的是概率分布，怎么从分布里选一个 token，由采样参数决定：

| 参数 | 作用 | 自动化场景的建议 |
| --- | --- | --- |
| **temperature** | 0 = 总选最高概率；越大越随机 | **结构化任务用 0 或 0.1** |
| **top_p** | 只从累计概率前 p 的候选里选 | 0.9~1.0（配合低温度） |
| **top_k** | 只从概率最高的 k 个里选 | 一般不用，top_p 更自适应 |
| **max_tokens** | 输出长度上限 | 按任务设定，防止跑飞 |

**自动化任务的核心原则**：

> **需要可复现、结构化输出的场景，temperature 必须设为 0（或接近 0）。**

**为什么**：
- 抽取任务：温度高会导致同一封邮件抽出不同的字段；
- 分类任务：温度高会导致同一输入被分到不同类别；
- 代码生成：温度高会生成风格不一致的代码。

**但 temperature=0 也不保证完全可复现**——浮点运算顺序、硬件差异、
模型版本更新都可能导致细微差别。**不要依赖"完全一致"**。

## 幻觉：为什么模型会编造

**根本原因**：模型在**续写**，不是在**查询**。

如果训练数据里"北京的首都是"后面常跟"北京"（错误但常见），
模型可能生成错误答案，而且**语气同样自信**。

**幻觉的四种典型形态**：

| 类型 | 例子 |
| --- | --- |
| **事实错误** | 编造不存在的论文、作者、数据 |
| **过度自信** | 对不确定的事给出确定语气 |
| **细节捏造** | 大方向对，具体数字/引用错 |
| **张冠李戴** | 把 A 的观点安在 B 头上 |

**为什么"让它更仔细"没用**：
模型没有"知道自己不知道"的机制。
它输出的每个 token 都是基于概率，没有"置信度"这个概念（至少不是可靠的）。

**有效的缓解手段**（按有效性排序）：

| 手段 | 原理 | 效果 |
| --- | --- | --- |
| **给真实资料（RAG）** | 让模型基于检索到的事实回答 | ⭐⭐⭐⭐⭐ |
| **要求引用来源** | 强制它指出每个结论的依据 | ⭐⭐⭐⭐ |
| **工具验证** | 让代码/数据库验证结果 | ⭐⭐⭐⭐⭐ |
| **多模型交叉验证** | 多个模型独立回答后比对 | ⭐⭐⭐ |
| **结构化输出 + 校验** | 强制格式，便于程序校验 | ⭐⭐⭐ |
| **提示"不确定就说不确定"** | 降低编造倾向 | ⭐⭐ |

**核心思路**：**不要试图让模型"不幻觉"，而是让幻觉可被发现和拦截。**

## 对自动化设计的影响

把上面的特性翻译成设计约束：

| LLM 特性 | 设计约束 |
| --- | --- |
| 无记忆 | 每轮必须重发历史；长任务要压缩 |
| 上下文有限 | 长文档要分块处理 |
| 概率性输出 | 不能写 \`assert output == expected\`；要评估分布 |
| 会幻觉 | 必须给资料 + 要求引用 + 工具验证 |
| 一次一个 token | 利用流式输出提升体验 |
| 前面错误影响后面 | 加校验 + 允许重试 |
| token 有成本 | 控制历史长度、用便宜模型做简单任务 |

**最后一条常被忽略**：**成本设计是自动化设计的一部分**。
一个"效果很好但每次调用 5 万 token"的方案，在大规模场景下不可用。

## 本节的来源

> **来源类型：学术来源**
> - Chain-of-Thought: *Chain-of-Thought Prompting Elicits Reasoning in Large Language Models*，
>   arXiv:[2201.11903](https://arxiv.org/abs/2201.11903)（理解推理能力的来源与局限）
> - CMU 11-766 *Large Language Model Applications*，第 1-2 讲「Origins of LLMs」
>   https://cmu-llms.org/schedule/
>
> **来源类型：工程实践（非学术）**
> - Anthropic / OpenAI 官方文档关于 token、上下文窗口、采样参数的说明
>   说明：厂商文档，非同行评审来源
>
> **来源类型：原创**
> - 幻觉四形态分类、缓解手段排序、设计约束映射表、全部示例与习题
`,
        tips: [
          {
            kind: 'interview',
            text: '「LLM 为什么会幻觉」：模型在续写而非查询事实。它没有"知道/不知道"的机制，所以编造时语气同样自信。缓解靠给真实资料（RAG）+ 要求引用 + 工具验证，而不是"让它更仔细"。',
          },
          {
            kind: 'leak',
            text: '自动化任务中，需要可复现或结构化输出的场景，temperature 必须设为 0 或接近 0。但注意 temperature=0 也不保证完全可复现（浮点、硬件、模型版本差异）。',
          },
          {
            kind: 'pitfall',
            text: '模型没有记忆——每次调用都是独立的。Agent 之所以要维护对话历史，就是因为要把之前的全部内容每轮重发一遍，这也是成本随轮次线性增长的原因。',
          },
        ],
        demos: [
          {
            title: 'token 成本估算与上下文管理',
            lang: 'python',
            code: `def estimate_tokens(text, lang="zh"):
    """粗略估算 token 数（生产环境应使用真实 tokenizer）。"""
    if lang == "zh":
        # 中文约 1 字 = 1.2 token
        return int(len(text) * 1.2)
    # 英文约 4 字符 = 1 token
    return int(len(text) / 4)

def cost_of_conversation(turns, tokens_per_turn, price_per_mtok=3.0):
    """估算多轮对话的累计 token（每轮都重发历史）。"""
    total = 0
    history = 0
    detail = []
    for t in range(1, turns + 1):
        sent = history + tokens_per_turn      # 本轮发送 = 历史 + 新内容
        total += sent
        history = sent                        # 回答也算进下一轮历史
        detail.append(sent)
    return total, total / 1e6 * price_per_mtok, detail

print("=== token 估算 ===")
zh = "这是一段中文测试文本，用于估算 token 数量。"
en = "This is an English test text for token estimation."
print(f"中文 {len(zh)} 字 -> 约 {estimate_tokens(zh, 'zh')} token")
print(f"英文 {len(en)} 字符 -> 约 {estimate_tokens(en, 'en')} token")
print()

print("=== 多轮对话的累计成本（每轮 1000 token 新内容）===")
print("轮次 | 本轮发送 | 累计 token | 累计成本")
print("-" * 48)
total, cost, detail = cost_of_conversation(10, 1000)
for i, sent in enumerate(detail, 1):
    cum = sum(detail[:i])
    print(f"{i:4} | {sent:8} | {cum:10} | \${cum/1e6*3.0:.4f}")
print()
print(f"总 token: {total}, 总成本: \${cost:.4f}")
print()
print("关键：10 轮对话的 token 不是 10×1000=10000，而是")
print(f"      {total}（约 {total/10000:.1f} 倍）—— 因为每轮都重发历史")
print()
print("=== 上下文管理策略对比 ===")
strategies = [
    ("全量历史", lambda t: sum(range(1, t+1)) * 1000),
    ("只留最近 3 轮", lambda t: min(t, 3) * 1000 * t if t > 3 else sum(range(1, t+1)) * 1000),
    ("每 5 轮压缩成摘要（200 token）", lambda t: sum(200 + 1000 for _ in range(1, t+1))),
]
print("策略                        | 20 轮总 token")
print("-" * 48)
for name, fn in strategies:
    print(f"{name:27} | {fn(20):10}")`,
          },
          {
            title: '幻觉的四种形态与拦截策略',
            lang: 'python',
            code: `# 模拟：模型输出中的事实需要被校验
import re

def extract_claims(answer):
    """抽取答案中的可验证声明（简化：找数字与引用）。"""
    numbers = re.findall(r"\\d+(?:\\.\\d+)?%?", answer)
    citations = re.findall(r"[A-Z][a-z]+ et al\\.?,? \\d{4}", answer)
    return {"numbers": numbers, "citations": citations}

def verify_against_source(claims, source_text):
    """检查答案中的数字是否出现在原始资料里。"""
    issues = []
    for n in claims["numbers"]:
        if n not in source_text:
            issues.append(f"数字 {n} 未在资料中找到（疑似捏造）")
    for c in claims["citations"]:
        if c not in source_text:
            issues.append(f"引用 {c} 未在资料中找到（疑似捏造）")
    return issues

# 案例：给了资料，但模型还是编了一个数字
source = "2025 年该产品销售额为 1200 万元，同比增长 15%。"
answer = "该产品 2025 年销售额 1200 万元，同比增长 15%，市场份额达到 23%。"

claims = extract_claims(answer)
print("从答案中抽取的可验证内容:")
print(f"  数字: {claims['numbers']}")
print(f"  引用: {claims['citations']}")
print()

issues = verify_against_source(claims, source)
print("校验结果:")
if issues:
    for i in issues:
        print(f"  [拦截] {i}")
else:
    print("  全部通过")
print()
print("关键：23% 这个数字资料里没有 —— 模型编造了。")
print("这就是「结构化输出 + 程序校验」的价值：")
print("  不追求模型不幻觉，而是让幻觉可被发现。")
print()
print("=== 四种幻觉形态 ===")
forms = {
    "事实错误": "编造不存在的论文/作者/数据",
    "过度自信": "对不确定的事给出确定语气",
    "细节捏造": "大方向对，具体数字/引用错（本例）",
    "张冠李戴": "把 A 的观点安在 B 头上",
}
for k, v in forms.items():
    print(f"  {k}: {v}")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'ai-auto-m1-c2-e1',
        type: 'single',
        difficulty: 2,
        question: 'LLM 生成文本的本质是？',
        options: [
          { value: 'A', text: '从数据库中检索答案' },
          { value: 'B', text: '给定前文，预测下一个 token 的概率分布并采样' },
          { value: 'C', text: '理解语义后翻译成自然语言' },
          { value: 'D', text: '匹配最相似的训练样本' },
        ],
        answer: 'B',
        explanation:
          '模型只做一件事：预测下一个 token。它没有"查询事实"的机制，只有"什么词最可能跟在后面"的统计规律。这是理解幻觉的根源。',
        tags: ['LLM 本质'],
      },
      {
        id: 'ai-auto-m1-c2-e2',
        type: 'judge',
        difficulty: 2,
        question: '模型会自动记住之前的对话内容，所以多轮对话不需要重复发送历史。',
        answer: false,
        explanation:
          '模型没有记忆，每次调用都是独立的。Agent 必须每轮把之前的全部内容重新发一遍——这也是成本随轮次线性增长的原因。',
        tags: ['无记忆'],
      },
      {
        id: 'ai-auto-m1-c2-e3',
        type: 'multiple',
        difficulty: 3,
        question: '缓解幻觉的有效手段有哪些？（多选）',
        options: [
          { value: 'A', text: '给真实资料（RAG），让模型基于检索到的事实回答' },
          { value: 'B', text: '要求引用来源，强制指出每个结论的依据' },
          { value: 'C', text: '用工具/代码验证结果' },
          { value: 'D', text: '在提示里写"请务必准确，不要编造"' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 效果很弱——模型没有"知道自己不知道"的机制，一句"请准确"改变不了它的生成机制。核心思路是让幻觉**可被发现和拦截**，而不是指望它不幻觉。',
        tags: ['幻觉缓解'],
      },
      {
        id: 'ai-auto-m1-c2-e4',
        type: 'fill',
        difficulty: 3,
        question:
          '自动化任务中需要可复现或结构化输出的场景，采样参数 temperature 应设为 ___ 或接近 0。',
        blanks: [['0', '零', '0.0']],
        explanation:
          'temperature=0 时总选最高概率的 token，输出最稳定。但注意它也不保证完全可复现（浮点运算、硬件、模型版本差异），不要依赖"完全一致"。',
        tags: ['temperature'],
      },
      {
        id: 'ai-auto-m1-c2-e5',
        type: 'code',
        difficulty: 2,
        question:
          '估算 token 数：estimate_tokens(text, lang="zh")。\n\n- 中文：约 1 字 = 1.2 token\n- 英文：约 4 字符 = 1 token\n返回整数（向下取整）。',
        starterCode: `def estimate_tokens(text, lang="zh"):
    if lang == "zh":
        return int(___
    return int(___
`,
        setupCode: '',
        expectedOutput: 'token 估算',
        tests: `assert estimate_tokens("你好世界", "zh") == 4, f"4 字应为 4，实际 {estimate_tokens('你好世界','zh')}"
assert estimate_tokens("a" * 100, "en") == 25, f"100 字符应为 25，实际 {estimate_tokens('a'*100,'en')}"
# 中文 10 字 -> 12
assert estimate_tokens("一" * 10, "zh") == 12
# 空字符串
assert estimate_tokens("", "zh") == 0
assert estimate_tokens("", "en") == 0
`,
        answer: `def estimate_tokens(text, lang="zh"):
    if lang == "zh":
        return int(len(text) * 1.2)
    return int(len(text) / 4)
`,
        explanation:
          '**这是粗略估算**，生产环境必须用真实 tokenizer（如 `tiktoken` 或 HuggingFace 的对应模型）。\n\n但估算的价值在于**快速判断量级**：如果估算出 5 万 token，就该考虑分块了。\n\n中文 1 字 ≈ 1.2 token 这个系数，是理解"中文更贵"的关键。',
        tags: ['编程', 'token 估算'],
      },
      {
        id: 'ai-auto-m1-c2-e6',
        type: 'code',
        difficulty: 3,
        question:
          '计算多轮对话的累计 token：conversation_tokens(turns, tokens_per_turn)。\n\n每轮发送 = 之前累计的历史 + 本轮新内容，历史逐轮累积。\n返回 (总 token, 每轮发送量的列表)。',
        starterCode: `def conversation_tokens(turns, tokens_per_turn):
    total = 0
    history = 0
    detail = []
    for _ in range(turns):
        sent = ___
        total += sent
        history = ___
        detail.append(sent)
    return total, detail
`,
        setupCode: '',
        expectedOutput: '累计 token',
        tests: `total, detail = conversation_tokens(3, 1000)
# 第1轮: 1000, 第2轮: 2000, 第3轮: 3000 -> 总 6000
assert detail == [1000, 2000, 3000], f"每轮发送量不正确: {detail}"
assert total == 6000, f"总 token 应为 6000，实际 {total}"
# 1 轮
t1, d1 = conversation_tokens(1, 500)
assert t1 == 500 and d1 == [500]
# 10 轮：n(n+1)/2 * 1000 = 55000
t10, _ = conversation_tokens(10, 1000)
assert t10 == 55000, f"10 轮应为 55000，实际 {t10}"
`,
        answer: `def conversation_tokens(turns, tokens_per_turn):
    total = 0
    history = 0
    detail = []
    for _ in range(turns):
        sent = history + tokens_per_turn
        total += sent
        history = sent
        detail.append(sent)
    return total, detail
`,
        explanation:
          '**这是 Agent 成本估算的基础**：10 轮对话不是 10000 token，而是 55000 token（5.5 倍）。\n\n公式：`n(n+1)/2 × tokens_per_turn`。\n\n**实践启示**：\n- 长对话必须压缩历史（摘要、只留关键事实）；\n- 能用单次调用解决的，不要用多轮；\n- 成本预算是 Agent 设计的必要部分。',
        tags: ['编程', '成本估算'],
      },
      {
        id: 'ai-auto-m1-c2-e7',
        type: 'judge',
        difficulty: 3,
        question: '设置 temperature=0 就能保证完全可复现，同样的输入永远得到完全相同的输出。',
        answer: false,
        explanation:
          'temperature=0 只是总选最高概率的 token，输出最稳定，但浮点运算顺序、硬件差异、模型版本更新都可能导致细微差别。不要依赖"完全一致"，应设计容错。',
        tags: ['可复现性'],
      },
      {
        id: 'ai-auto-m1-c2-e8',
        type: 'single',
        difficulty: 3,
        question: '「lost in the middle」指的是什么现象？',
        options: [
          { value: 'A', text: '模型训练时丢失了中间层' },
          { value: 'B', text: '长上下文中，位于中间位置的信息召回率显著下降' },
          { value: 'C', text: '输出被截断在中间' },
          { value: 'D', text: 'token 计数从中间开始出错' },
        ],
        answer: 'B',
        explanation:
          '研究发现模型对上下文开头和结尾的信息利用较好，中间部分容易被忽略。实践启示：关键信息要放在开头或结尾，不要埋中间。',
        tags: ['长上下文'],
      },
      {
        id: 'ai-auto-m1-c2-e9',
        type: 'code',
        difficulty: 3,
        question:
          '实现幻觉校验：verify_numbers(answer, source_text)。\n\n- 从 answer 中提取所有数字（含小数、百分比）\n- 检查每个数字是否出现在 source_text 中\n- 返回未在资料中找到的数字列表（去重，保持出现顺序）',
        starterCode: `import re

def verify_numbers(answer, source_text):
    numbers = re.findall(r"\\d+(?:\\.\\d+)?%?", answer)
    unverified = []
    for n in numbers:
        if ___ and n not in unverified:
            ___
    return unverified
`,
        setupCode: '',
        expectedOutput: '未验证的数字',
        tests: `src = "2025 年销售额为 1200 万元，同比增长 15%。"
ans = "2025 年销售额 1200 万元，同比增长 15%，市场份额 23%。"
out = verify_numbers(ans, src)
assert out == ["23%"], f"应只检出 23%，实际 {out}"
# 全部验证通过
ans2 = "销售额 1200 万元，增长 15%。"
assert verify_numbers(ans2, src) == []
# 多个未验证
ans3 = "增长 15%，份额 23%，用户 500 万。"
out3 = verify_numbers(ans3, src)
assert "23%" in out3 and "500" in out3, f"应检出两个，实际 {out3}"
# 去重
ans4 = "23% 和 23%"
assert verify_numbers(ans4, src) == ["23%"]
`,
        answer: `import re

def verify_numbers(answer, source_text):
    numbers = re.findall(r"\\d+(?:\\.\\d+)?%?", answer)
    unverified = []
    for n in numbers:
        if n not in source_text and n not in unverified:
            unverified.append(n)
    return unverified
`,
        explanation:
          '这是**让幻觉可被发现**的最简实现：答案里的每个数字都必须能在原始资料中找到。\n\n**局限性**：\n- 只检查数字，检查不了文字层面的捏造；\n- 资料里的 "1200" 和答案里的 "1200" 匹配，但语义可能不同；\n- 无法发现"张冠李戴"。\n\n**生产环境应该**：数字校验 + 引用溯源（每句话标出处）+ 人工抽检。\n\n但即使这么简单的校验，也能拦截掉相当一部分捏造。',
        tags: ['编程', '幻觉校验'],
      },
      {
        id: 'ai-auto-m1-c2-e10',
        type: 'open',
        difficulty: 4,
        question:
          '你要用 LLM 从 1000 份合同 PDF 中抽取关键条款（金额、期限、违约责任）。\n\n请说明：① 这个任务的主要风险；② 如何设计流程让幻觉可被发现；③ 如何控制成本；④ 如何验证抽取质量。',
        referenceAnswer: `**① 主要风险**

| 风险 | 说明 | 严重度 |
| --- | --- | --- |
| **幻觉（捏造金额/条款）** | 合同里没有的条款被"编"出来 | 🔴 极高 |
| **张冠李戴** | 把甲方条款当成乙方的 | 🔴 极高 |
| **细节错误** | 金额单位（万/元）、日期格式错 | 🟠 高 |
| **遗漏** | 长合同中间的条款被忽略（lost in the middle） | 🟠 高 |
| **上下文超限** | 长合同（50+ 页）放不进窗口 | 🟡 中 |
| **格式多样** | 扫描件、表格、手写批注 | 🟡 中 |

**最严重的是幻觉**——如果抽取出的金额是编造的，
后续所有基于它的决策都是错的。

**② 让幻觉可被发现的设计**

**核心原则：每条抽取结果都必须能指回原文位置。**

    {
      "amount": {
        "value": 1200000,
        "currency": "CNY",
        "evidence": "第三条 合同总金额为人民币壹佰贰拾万元整",
        "page": 3,
        "bbox": [120, 450, 580, 480]      # 可选：坐标
      },
      "term": {
        "value": 24,
        "unit": "month",
        "evidence": "合同期限自 2026 年 1 月 1 日起至 2027 年 12 月 31 日止",
        "page": 1
      }
    }

**四层校验**：

**a) 结构化输出 + schema 校验**

    SCHEMA = {
        "amount": {"type": "number", "min": 0},
        "term_months": {"type": "integer", "min": 1, "max": 600},
        "liability": {"type": "string", "max_length": 500},
    }

超出范围的直接拒绝（如金额为负数、期限 5000 个月）。

**b) 证据回查（最关键）**

    def verify_evidence(field_value, evidence, page_text):
        # 证据文本必须真的出现在该页
        if evidence not in page_text:
            return False, "证据文本不在原文中"
        # 数字必须出现在证据里
        if str(field_value) not in evidence and \\
           not chinese_numeral_match(field_value, evidence):
            return False, "数值与证据不符"
        return True, "OK"

**注意中文数字**：合同常用"壹佰贰拾万元整"，需要转换后比对。

**c) 交叉验证**

- 金额：用"大写金额"与"小写数字"互相验证；
- 日期：起始日 + 期限 = 结束日，三者互相验证；
- 总额：分项金额之和 = 总金额。

**d) 双模型投票（成本允许时）**

用两个不同模型各抽一次，不一致的字段标记为"待人工确认"。

**③ 成本控制**

| 措施 | 效果 |
| --- | --- |
| **先分类再抽取**：用便宜模型判断合同类型（采购/劳动/租赁），只抽取相关字段 | 减少 40%~60% token |
| **只送相关页**：先定位含关键词的页（"金额""期限"），只送那几页 | 减少 70%~90% token |
| **分块 + 局部抽取**：50 页合同按章节切分，每块独立抽取 | 避免超限，且可并行 |
| **缓存**：相同模板的合同复用结构 | 减少重复工作 |
| **便宜模型做简单字段**：金额、日期用轻量模型；复杂条款用强模型 | 混合成本降低 30%~50% |

**成本估算**（假设每份合同 20 页、每页 500 token）：

    全量送：20 × 500 = 10000 token/份
    只送相关页（平均 4 页）：2000 token/份
    1000 份：从 1000 万 token 降到 200 万 token

**④ 质量验证**

**a) 建立金标准集**

人工标注 50 份合同（覆盖不同类型、不同复杂度）作为基准。

**b) 评估指标**

| 指标 | 定义 | 目标 |
| --- | --- | --- |
| **字段级准确率** | 抽对的字段数 / 总字段数 | > 95% |
| **字段级召回率** | 抽出的正确字段 / 应抽的字段 | > 98% |
| **证据命中率** | 证据文本真在原文中的比例 | **100%** |
| **完全正确率** | 所有字段都对的文件比例 | > 85% |
| **人工复核率** | 需要人工介入的比例 | < 20% |

**证据命中率必须 100%**——这是底线，因为它直接反映幻觉率。

**c) 分层验证**

    高置信度（证据完整 + 交叉验证通过）→ 抽检 5%
    中置信度（证据存在但交叉验证不一致）→ 抽检 50%
    低置信度（证据缺失或校验失败）→ 100% 人工

**d) 持续监控**

- 每周统计各字段的准确率趋势；
- 监控"证据命中率"是否下降（幻觉增加的早期信号）；
- 新类型合同出现时，先小批量试跑再放量。

**⑤ 一个务实的落地路径**

    第一版：只抽 3 个字段（金额、期限、双方名称）+ 100% 人工复核
      ↓ 统计准确率
    第二版：增加字段，人工复核降到 30%
      ↓ 证据命中率稳定在 100%
    第三版：高置信度自动通过，只复核低置信度

**不要一上来就追求全自动。** 先证明"AI 抽得准"，
再逐步降低人工介入比例。

**⑥ 一个容易忽略的点**

**合同 PDF 可能是扫描件**（图片），需要先 OCR。
OCR 错误会传导到抽取环节——如果 OCR 把 "1" 识别成 "l"，
金额就错了。

**必须**：OCR 置信度低的页，直接转人工，不要让模型硬猜。`,
        rubric: [
          { point: '识别幻觉与张冠李戴为最高风险', score: 2 },
          { point: '要求每条抽取结果带 evidence（原文位置），并回查验证', score: 3 },
          { point: '成本控制：先分类/只送相关页/分块/混合模型', score: 2 },
          { point: '质量验证：金标准集 + 证据命中率必须 100% + 分层抽检', score: 2 },
          { point: '提到 OCR 错误传导 + 先做少字段再扩量的落地路径', score: 1 },
        ],
        keywords: ['evidence 溯源', '证据回查', '交叉验证', '证据命中率', '只送相关页', 'OCR 传导'],
        explanation:
          '核心是「每条结果都要能指回原文」。能设计出 evidence 字段 + 回查校验 + 证据命中率 100% 的指标，就抓住了让幻觉可被发现的本质。',
        tags: ['文档抽取', '综合'],
      },
    ],
  },
];
