import type { Chapter } from '../../types';

/* ============================================================
 *  AI 自动化 · M2 · c4 多 Agent 协作、c5 状态管理与持久化
 *
 *  来源：
 *  - 学术：AutoGen arXiv:2308.08155
 *  - 学术：CMU 11-766 第 14 讲「Multi-agent systems」
 *  - 学术：StateFlow arXiv:2403.11322
 *  - 学术：Berkeley CS294 第 3 讲
 *  - 工程实践（非学术）：LangGraph 文档
 *  - 原创：示例、图示、全部习题
 * ============================================================ */

export const aiAutoM2Chapters3: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c4：多 Agent 协作
   * ============================================================ */
  {
    id: 'ai-auto-m2-c4',
    title: '多 Agent 协作：分工与对话',
    goal: '理解多 Agent 的三种协作形态与代价，能设计合理的角色分工，知道什么时候多 Agent 反而更差。',
    lessons: [
      {
        id: 'ai-auto-m2-c4-l1',
        title: '三种拓扑与角色设计',
        difficulty: 4,
        content: `
## 为什么要多 Agent

单个 Agent 处理复杂任务时会遇到两个瓶颈：

1. **上下文过载**：所有信息挤在一个对话里，注意力分散；
2. **角色冲突**：既要"大胆创作"又要"严格审查"，提示词互相矛盾。

**多 Agent 的思路**：拆成多个角色，各自专注一件事，通过消息协作。

<MultiAgentTopology />

## 三种协作拓扑

**① 对话式（AutoGen 风格）**

多个 Agent 通过消息对话，轮流发言，直到达成结论。

    User ──> [Coder] <──> [Reviewer]
                │
                └──> [Executor]（跑代码）

**特点**：自由度高，但轮次不可控。
**典型角色**：Coder（写代码）+ Reviewer（审查）+ Executor（执行）。

**② 层级式（Orchestrator）**

一个"经理"Agent 分派任务给"工人"，收集结果后汇总。

    [Manager]
       ├──> [Researcher] ──┐
       ├──> [Analyst]    ──┼──> [Manager] 汇总
       └──> [Writer]     ──┘

**特点**：控制流清晰，易调试。这是**最推荐**的形态。

**③ 流水线式**

每个 Agent 处理一个阶段，输出传给下一个。

    [Extractor] → [Validator] → [Formatter] → [Publisher]

**特点**：完全确定，接近传统工作流。适合步骤清晰的流程。

## 角色设计的四个要点

**① 单一职责**

一个 Agent 只做一件事。不要设计"全能助手"。

| 反例 | 正例 |
| --- | --- |
| "你是一个既能写代码又能审查还能部署的助手" | "你是代码审查员，只找问题，不改代码" |

**② 明确的输入输出契约**

    Researcher:
      输入: {"question": str, "max_sources": int}
      输出: {"findings": [{"claim": str, "source": str}], "confidence": float}

**契约明确才能解耦**——每个 Agent 可以独立测试与替换。

**③ 冲突的角色要分开**

"生成"与"批判"放在同一个 Agent 里效果差：
- 模型倾向于维护自己刚生成的内容；
- 提示词互相矛盾（"大胆创新" vs "严格挑错"）。

**分开后**：Generator 只管生成，Critic 只管挑错。这就是 Evaluator-Optimizer 的多 Agent 版本。

**④ 避免角色重叠**

两个 Agent 职责模糊会导致：
- 重复劳动（都做了同一件事）；
- 互相推诿（都以为对方会做）。

## 多 Agent 的真实代价

| 代价 | 说明 |
| --- | --- |
| **成本翻倍** | 3 个 Agent 各跑 5 轮 = 15 次 LLM 调用 |
| **延迟翻倍** | 串行时更明显 |
| **错误累积** | 每个 Agent 都可能出错，链式放大 |
| **消息开销** | 每条消息都进上下文，token 快速膨胀 |
| **调试困难** | 出问题时不知道是哪个 Agent 的错 |

**错误累积的量化**：

    3 个 Agent 串行，每个 90% 正确
    整体 = 0.9^3 = 72.9%

    而单个 Agent 处理全部（假设 85%）
    → 单 Agent 反而更好

**这就是为什么 Anthropic 说"大多数场景不需要多 Agent"。**

## 什么时候多 Agent 真的有用

**判断标准**（同时满足）：

1. **任务能清晰分解**为独立子任务；
2. **子任务需要不同"人设"**（如创作 vs 审查）；
3. **单 Agent 的上下文会过载**（信息太多注意力分散）；
4. **能接受成本翻倍**。

**典型成功场景**：

| 场景 | 角色分工 | 为什么有效 |
| --- | --- | --- |
| 代码生成 | Coder + Reviewer + Tester | 审查需要"挑错"心态，与"创作"冲突 |
| 深度研究 | Planner + Searcher×N + Synthesizer | 多来源并行检索，再统一综合 |
| 复杂写作 | Outliner + Writer + Editor | 结构、创作、打磨三种能力 |
| 数据分析 | Analyst + Critic + Reporter | Critic 专门质疑结论的可靠性 |

**典型失败场景**：

| 场景 | 为什么失败 |
| --- | --- |
| 简单问答 | 单次调用就够，多 Agent 纯浪费 |
| 步骤固定的流程 | 工作流更可靠，不需要对话协商 |
| 强依赖全局上下文的任务 | 拆开后信息不同步 |

## 消息协议设计

多 Agent 之间传什么，需要约定：

**方案 A：自然语言消息**

    {"from": "coder", "to": "reviewer", "content": "我写了这个函数，请审查：..."}

- 灵活，模型理解力强；
- 但 token 消耗大，且格式不稳定。

**方案 B：结构化消息**

    {"from": "coder", "to": "reviewer", "type": "code_review_request",
     "payload": {"file": "a.py", "diff": "...", "focus": ["security"]}}

- 紧凑、可校验；
- 但需要提前定义 schema。

**推荐：混合**——关键字段结构化，内容用自然语言。

## 终止条件（比单 Agent 更关键）

多 Agent 对话可能**永远聊不完**（互相客气、反复确认）。

**必须设置**：

    max_rounds = 6              # 最多 6 轮对话
    max_total_tokens = 100000   # 总 token 上限
    convergence_check = ...     # 检测是否达成一致

**收敛检测**：

    def is_converged(messages):
        # 最近两轮没有新信息 → 收敛
        if len(messages) < 2:
            return False
        return messages[-1]["content"] == messages[-2]["content"]

## 本节的来源

> **来源类型：学术来源**
> - AutoGen: *Enabling Next-Gen LLM Applications via Multi-Agent Conversation*，
>   arXiv:[2308.08155](https://arxiv.org/abs/2308.08155)
> - CMU 11-766 *Large Language Model Applications*，第 14 讲「Multi-agent systems」
>   https://cmu-llms.org/schedule/
> - UC Berkeley CS294/194-196 *Large Language Model Agents*，第 3 讲「Agentic AI Frameworks & AutoGen」
>   （嘉宾 Chi Wang，AutoGen 作者）https://rdi.berkeley.edu/llm-agents/f24
>
> **来源类型：工程实践（非学术）**
> - Anthropic《Building effective agents》关于 Orchestrator-Workers 的论述
>   https://www.anthropic.com/research/building-effective-agents
>
> **来源类型：原创**
> - 三种拓扑图、错误累积计算、全部代码与习题
`,
        tips: [
          {
            kind: 'interview',
            text: '「什么时候用多 Agent」：任务能清晰分解 + 子任务需要不同人设 + 单 Agent 上下文过载 + 能接受成本翻倍。简单任务用多 Agent 是浪费。',
          },
          {
            kind: 'leak',
            text: '「生成」与「批判」必须分成两个 Agent：同一 Agent 会倾向于维护自己刚生成的内容，且提示词互相矛盾。',
          },
          {
            kind: 'pitfall',
            text: '多 Agent 对话可能永远聊不完（互相客气、反复确认）。必须设置最大轮次、总 token 上限与收敛检测。',
          },
        ],
        demos: [
          {
            title: '层级式多 Agent：Manager + 三个工人',
            lang: 'python',
            code: `import json

# ── 消息总线 ──
class MessageBus:
    def __init__(self):
        self.messages = []
    def send(self, sender, receiver, msg_type, payload):
        m = {"from": sender, "to": receiver, "type": msg_type, "payload": payload}
        self.messages.append(m)
        return m
    def history_for(self, agent):
        return [m for m in self.messages if m["to"] == agent or m["from"] == agent]

# ── 工人 Agent ──
def researcher(bus, question):
    """模拟研究：返回带来源的发现。"""
    findings = [
        {"claim": "ReAct 在 2022 年提出", "source": "arXiv:2210.03629"},
        {"claim": "AutoGen 支持多 Agent 对话", "source": "arXiv:2308.08155"},
    ]
    bus.send("researcher", "manager", "findings",
             {"question": question, "findings": findings, "confidence": 0.85})
    return findings

def analyst(bus, findings):
    """模拟分析：找矛盾与缺口。"""
    issues = []
    if len(findings) < 3:
        issues.append("来源数量不足（建议 ≥3）")
    if not any("局限" in f["claim"] for f in findings):
        issues.append("缺少对局限性的讨论")
    bus.send("analyst", "manager", "analysis",
             {"issues": issues, "quality": "medium" if issues else "high"})
    return issues

def writer(bus, findings, issues):
    """模拟写作：基于发现与问题生成报告。"""
    body = "\\n".join(f"- {f['claim']} [{f['source']}]" for f in findings)
    note = ("\\n\\n待改进：" + "；".join(issues)) if issues else ""
    report = f"# 调研报告\\n\\n{body}{note}"
    bus.send("writer", "manager", "draft", {"report": report})
    return report

# ── 编排者 ──
def manager(bus, question, max_rounds=3):
    print(f"[Manager] 收到任务：{question}")
    print(f"[Manager] 拆解为：研究 -> 分析 -> 写作\\n")

    findings = researcher(bus, question)
    print(f"[Researcher] 返回 {len(findings)} 条发现")

    issues = analyst(bus, findings)
    print(f"[Analyst] 发现 {len(issues)} 个问题: {issues}")

    report = writer(bus, findings, issues)
    print(f"[Writer] 生成报告 {len(report)} 字符\\n")

    print("=== 消息总线 ===")
    for m in bus.messages:
        print(f"  {m['from']:10} -> {m['to']:8} [{m['type']}]")
    print(f"\\n总消息数: {len(bus.messages)}")
    return report

bus = MessageBus()
manager(bus, "ReAct 与 AutoGen 的核心区别是什么？")

print()
print("关键设计：")
print("  1) 每个工人单一职责，输入输出契约明确")
print("  2) Manager 只负责拆解与汇总，不做具体工作")
print("  3) 所有通信走 MessageBus，便于记录与调试")`,
          },
          {
            title: '多 Agent 的代价：错误累积与成本',
            lang: 'python',
            code: `def multi_agent_cost(n_agents, rounds_per_agent, tokens_per_round=2000, price_per_mtok=3.0):
    """估算多 Agent 的 token 与成本。"""
    total_rounds = n_agents * rounds_per_agent
    total_tokens = total_rounds * tokens_per_round
    cost = total_tokens / 1e6 * price_per_mtok
    return total_rounds, total_tokens, cost

def success_rate(accuracy, steps):
    return accuracy ** steps

print("=== 成本对比 ===")
print("方案                    | 调用轮次 | token  | 成本")
print("-" * 58)
for name, agents, rounds in [
    ("单 Agent（5 轮）", 1, 5),
    ("2 Agent 对话（各 5 轮）", 2, 5),
    ("3 Agent 层级（各 5 轮）", 3, 5),
    ("3 Agent 对话（各 10 轮）", 3, 10),
]:
    r, t, c = multi_agent_cost(agents, rounds)
    print(f"{name:23} | {r:8} | {t:6} | \${c:.4f}")

print()
print("=== 成功率对比（每个 Agent 90% 正确）===")
print("Agent 数 | 串行成功率")
print("-" * 24)
for n in [1, 2, 3, 5]:
    print(f"{n:8} | {success_rate(0.9, n):9.2%}")

print()
print("关键结论：")
print("  3 个 Agent 各 90% -> 整体 72.9%")
print("  单 Agent 如果能有 85%，反而更好")
print()
print("所以多 Agent 只有在「每个 Agent 都显著更准」时才划算——")
print("比如专门审查的 Agent 比通用 Agent 挑错准得多。")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'ai-auto-m2-c4-e1',
        type: 'single',
        difficulty: 2,
        question: '下列哪种多 Agent 拓扑最容易调试、最推荐用于生产？',
        options: [
          { value: 'A', text: '对话式（Agent 自由聊天）' },
          { value: 'B', text: '层级式（Orchestrator 分派 + 工人执行）' },
          { value: 'C', text: '完全去中心化' },
          { value: 'D', text: '随机组合' },
        ],
        answer: 'B',
        explanation:
          '层级式控制流清晰：Manager 分派、工人执行、Manager 汇总。每一步可记录、可测试、可定位错误。对话式轮次不可控，调试困难。',
        tags: ['拓扑'],
      },
      {
        id: 'ai-auto-m2-c4-e2',
        type: 'judge',
        difficulty: 2,
        question: '把「生成内容」和「批判内容」放在同一个 Agent 里，效果通常比分成两个 Agent 更好。',
        answer: false,
        explanation:
          '同一 Agent 会倾向于维护自己刚生成的内容，且"大胆创作"与"严格挑错"的提示词互相矛盾。分成 Generator 与 Critic 两个角色效果更好。',
        tags: ['角色分离'],
      },
      {
        id: 'ai-auto-m2-c4-e3',
        type: 'multiple',
        difficulty: 3,
        question: '多 Agent 协作的主要代价有哪些？（多选）',
        options: [
          { value: 'A', text: '成本翻倍（每个 Agent 都要调用 LLM）' },
          { value: 'B', text: '错误累积（每个 Agent 都可能出错，链式放大）' },
          { value: 'C', text: '消息开销（每条消息都进上下文，token 膨胀）' },
          { value: 'D', text: '无法使用工具' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误——多 Agent 同样可以使用工具。A/B/C 是真实代价，尤其错误累积：3 个 Agent 各 90% 正确，整体只有 72.9%。',
        tags: ['多 Agent 代价'],
      },
      {
        id: 'ai-auto-m2-c4-e4',
        type: 'fill',
        difficulty: 3,
        question:
          '多 Agent 对话可能永远聊不完（互相客气、反复确认），因此必须设置最大轮次、总 token 上限与 ___ 检测。',
        blanks: [['收敛', 'convergence', '一致性', '收敛性']],
        explanation:
          '收敛检测判断是否已达成一致（如最近两轮内容相同）。没有它，多 Agent 可能无限循环烧钱。',
        tags: ['收敛检测'],
      },
      {
        id: 'ai-auto-m2-c4-e5',
        type: 'single',
        difficulty: 3,
        question: '3 个 Agent 串行，每个成功率 90%，整体成功率约为？',
        options: [
          { value: 'A', text: '90%' },
          { value: 'B', text: '72.9%' },
          { value: 'C', text: '30%' },
          { value: 'D', text: '99%' },
        ],
        answer: 'B',
        explanation:
          '0.9^3 = 0.729。这是错误累积的典型表现。如果单 Agent 能有 85%，反而比 3 个 90% 的 Agent 更好——这就是为什么多 Agent 要谨慎。',
        tags: ['错误累积'],
      },
      {
        id: 'ai-auto-m2-c4-e6',
        type: 'code',
        difficulty: 2,
        question:
          '实现多 Agent 成本估算：estimate_cost(n_agents, rounds_per_agent, tokens_per_round=2000, price_per_mtok=3.0)。\n\n返回 (总轮次, 总token, 成本)，成本保留 6 位小数。',
        starterCode: `def estimate_cost(n_agents, rounds_per_agent, tokens_per_round=2000, price_per_mtok=3.0):
    total_rounds = ___
    total_tokens = ___
    cost = ___
    return total_rounds, total_tokens, round(cost, 6)
`,
        setupCode: '',
        expectedOutput: '(15, 30000, 0.09)',
        tests: `r, t, c = estimate_cost(3, 5)
assert r == 15, f"总轮次应为 15，实际 {r}"
assert t == 30000, f"总 token 应为 30000，实际 {t}"
assert abs(c - 0.09) < 1e-6, f"成本应为 0.09，实际 {c}"
# 单 Agent
r2, t2, c2 = estimate_cost(1, 5)
assert r2 == 5 and t2 == 10000
# 更多 Agent 成本更高
_, _, c3 = estimate_cost(5, 10)
assert c3 > c
`,
        answer: `def estimate_cost(n_agents, rounds_per_agent, tokens_per_round=2000, price_per_mtok=3.0):
    total_rounds = n_agents * rounds_per_agent
    total_tokens = total_rounds * tokens_per_round
    cost = total_tokens / 1e6 * price_per_mtok
    return total_rounds, total_tokens, round(cost, 6)
`,
        explanation:
          '成本 = 总 token / 1e6 × 每百万 token 单价。\n\n**注意这是简化估算**：真实场景每轮 token 是增长的（历史累积），实际成本比线性估算更高。\n\n这个函数的价值在于**快速判断多 Agent 是否值得**——如果成本是单 Agent 的 3 倍但成功率只高 5%，就不划算。',
        tags: ['编程', '成本估算'],
      },
      {
        id: 'ai-auto-m2-c4-e7',
        type: 'code',
        difficulty: 3,
        question:
          '实现收敛检测：is_converged(messages, window=2)。\n\n- messages 是 dict 列表，每个含 "content" 字段\n- 若最近 window 条消息的 content 全部相同，返回 True\n- 消息数不足 window 返回 False',
        starterCode: `def is_converged(messages, window=2):
    if len(messages) < window:
        return False
    recent = ___
    return ___
`,
        setupCode: '',
        expectedOutput: '收敛判断',
        tests: `assert is_converged([{"content":"好"},{"content":"好"}]) == True
assert is_converged([{"content":"好"},{"content":"不好"}]) == False
assert is_converged([{"content":"好"}]) == False, "不足 window 应返回 False"
# window=3
assert is_converged([{"content":"a"},{"content":"a"},{"content":"a"}], 3) == True
assert is_converged([{"content":"a"},{"content":"a"},{"content":"b"}], 3) == False
# 空列表
assert is_converged([]) == False
`,
        answer: `def is_converged(messages, window=2):
    if len(messages) < window:
        return False
    recent = [m["content"] for m in messages[-window:]]
    return len(set(recent)) == 1
`,
        explanation:
          '`len(set(recent)) == 1` 判断所有元素相同——比逐个比较更简洁。\n\n**这是多 Agent 的必需品**：没有它，两个 Agent 可能永远在"我同意"、"我也同意"之间循环。\n\n生产环境还应检测"无新信息"（如连续 2 轮没有新增事实），而不只是文本相同。',
        tags: ['编程', '收敛检测'],
      },
      {
        id: 'ai-auto-m2-c4-e8',
        type: 'code',
        difficulty: 3,
        question:
          '实现角色职责检查：check_role_overlap(roles)。\n\n- roles: dict，角色名 → 职责关键词列表\n- 若两个角色的关键词有重叠，返回重叠对列表 [(roleA, roleB, [共同关键词])]\n- 无重叠返回空列表',
        starterCode: `def check_role_overlap(roles):
    overlaps = []
    names = list(roles.keys())
    ___
    return overlaps
`,
        setupCode: '',
        expectedOutput: '重叠检查',
        tests: `roles = {
    "coder": ["写代码", "实现功能", "修复bug"],
    "reviewer": ["审查代码", "找问题", "安全性"],
    "tester": ["写测试", "运行测试"],
}
assert check_role_overlap(roles) == [], "这三个角色无重叠"
roles2 = {
    "coder": ["写代码", "修复bug"],
    "fixer": ["修复bug", "改配置"],
}
out = check_role_overlap(roles2)
assert len(out) == 1, f"应检出 1 对重叠，实际 {out}"
assert out[0][0] == "coder" and out[0][1] == "fixer"
assert out[0][2] == ["修复bug"], f"共同关键词应为 ['修复bug']，实际 {out[0][2]}"
# 三对重叠
roles3 = {"a": ["x"], "b": ["x"], "c": ["x"]}
assert len(check_role_overlap(roles3)) == 3
`,
        answer: `def check_role_overlap(roles):
    overlaps = []
    names = list(roles.keys())
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            a, b = names[i], names[j]
            common = [k for k in roles[a] if k in roles[b]]
            if common:
                overlaps.append((a, b, common))
    return overlaps
`,
        explanation:
          '角色职责重叠会导致重复劳动或互相推诿。\n\n**设计时应该做这个检查**：如果两个角色的关键词高度重叠，说明职责没分清，应该合并或重新划分。\n\n生产环境可以用更严格的方式：定义每个角色的输入输出契约，检查契约是否互斥。',
        tags: ['编程', '角色设计'],
      },
      {
        id: 'ai-auto-m2-c4-e9',
        type: 'judge',
        difficulty: 3,
        question: '多 Agent 系统总是比单 Agent 效果更好，因为可以集思广益。',
        answer: false,
        explanation:
          '多 Agent 有成本翻倍、错误累积、消息开销、调试困难四重代价。3 个各 90% 正确的 Agent 串行，整体只有 72.9%。只有在「每个 Agent 都显著更准」时才划算。',
        tags: ['多 Agent 判断'],
      },
      {
        id: 'ai-auto-m2-c4-e10',
        type: 'open',
        difficulty: 5,
        question:
          '你要设计一个「技术文档自动生成」系统：输入代码仓库，输出 API 文档（含函数说明、参数、示例、调用关系）。\n\n请设计多 Agent 方案：① 划分哪些角色；② 用什么拓扑；③ 每个角色的输入输出契约；④ 如何控制成本与质量；⑤ 说明为什么这样划分而不是用单个 Agent。',
        referenceAnswer: `**一、角色划分（5 个）**

| 角色 | 职责 | 为什么单独 |
| --- | --- | --- |
| **Scanner** | 扫描仓库，识别需要文档化的函数/类 | 纯确定性任务，可代码实现 |
| **Analyzer** | 分析单个函数的逻辑，生成说明草稿 | 需要读代码，专注单个函数 |
| **ExampleWriter** | 为函数生成调用示例 | 与"解释逻辑"是不同能力 |
| **CrossLinker** | 分析函数间调用关系，生成引用链接 | 需要全局视角，与其他角色冲突 |
| **Reviewer** | 审查文档准确性（参数是否对、示例能否跑） | 审查需要"挑错"心态，与生成冲突 |

**关键设计**：
- **Scanner 用代码实现**（AST 解析），不用 LLM——确定性的活不要用模型；
- **Analyzer 与 ExampleWriter 分开**：解释"这个函数做什么"和"怎么调用它"是两种能力；
- **CrossLinker 单独**：它需要全局调用图，而 Analyzer 只看单个函数；
- **Reviewer 必须独立**：生成者不会挑自己的错。

**二、拓扑：层级式（Orchestrator-Workers）**

    [Orchestrator]
       │
       ├─ 1. Scanner（代码，非 LLM）
       │     → 输出函数清单
       │
       ├─ 2. 并行分发 Analyzer × N
       │     每个函数一个 Analyzer
       │
       ├─ 3. 并行分发 ExampleWriter × N
       │     基于 Analyzer 输出
       │
       ├─ 4. CrossLinker（单次，需要全局视图）
       │
       └─ 5. Reviewer（逐个审查）
             → 不通过则打回对应 Agent 重做

**为什么用层级式**：
- 每个函数独立处理 → 天然可并行；
- 控制流清晰（5 个阶段固定）；
- 失败可局部重试（某个函数文档不合格，只重跑那个）。

**为什么不用对话式**：文档生成没有"协商"需求，
对话只会增加轮次与成本。

**三、输入输出契约**

**Scanner**
    输入: {"repo_path": str}
    输出: {"symbols": [{"name": str, "file": str, "line": int,
                        "kind": "function"|"class"|"method",
                        "signature": str, "docstring": str|None}]}

**Analyzer**
    输入: {"symbol": {...}, "context": {"imports": [...], "related_code": str}}
    输出: {"summary": str,           # 一句话说明
           "params": [{"name": str, "type": str, "desc": str, "required": bool}],
           "returns": {"type": str, "desc": str},
           "raises": [{"type": str, "when": str}],
           "confidence": float}

**ExampleWriter**
    输入: {"symbol": {...}, "analysis": {...}}
    输出: {"examples": [{"code": str, "explanation": str, "runnable": bool}]}

**CrossLinker**
    输入: {"all_symbols": [...], "call_graph": {...}}
    输出: {"links": [{"from": str, "to": str, "relation": "calls"|"returns"|"inherits"}]}

**Reviewer**
    输入: {"symbol": {...}, "doc": {...}}
    输出: {"pass": bool,
           "issues": [{"severity": "high"|"medium"|"low",
                       "field": str, "problem": str, "suggestion": str}]}

**四、成本与质量控制**

**成本控制**：

| 措施 | 效果 |
| --- | --- |
| Scanner 用 AST 而非 LLM | 省掉 N 次调用 |
| 只文档化 public API（跳过私有函数） | 减少 60%~80% 工作量 |
| 按复杂度分级：简单函数（<10 行）用轻量模型 | 成本降 40% |
| 并行处理（Analyzer/ExampleWriter） | 延迟降低 |
| 缓存：代码未变的函数跳过 | 增量更新，成本降 90% |

**质量控制**：

1. **示例可执行性验证**（最有效）
   把 ExampleWriter 生成的示例真的跑一遍，跑不通就打回。

2. **参数一致性检查**（代码校验，非 LLM）
   对比 \`analysis.params\` 与 AST 解析出的真实签名，不一致就报错。

3. **Reviewer 分级**
   - high 问题 → 打回重做（最多 2 次）
   - medium/low → 记录但通过

4. **人工抽检**
   每 100 个函数抽 5 个人工检查，评估整体质量。

5. **回归测试**
   固定 50 个函数的"金标准文档"，每次改动都对比。

**五、为什么不用单个 Agent**

**单 Agent 的问题**：

| 问题 | 具体表现 |
| --- | --- |
| **上下文过载** | 一个仓库有几百个函数，全塞进一个上下文会爆 |
| **角色冲突** | "写文档"与"审查文档"在同一提示里互相矛盾 |
| **无法并行** | 串行处理几百个函数，耗时数小时 |
| **失败代价高** | 一个函数出错可能要重跑整批 |
| **质量不稳定** | 长上下文后期注意力下降，后面的函数质量差 |

**多 Agent 的收益**：

| 收益 | 量化 |
| --- | --- |
| 并行 | 10 个函数同时处理，延迟降到 1/10 |
| 隔离 | 单函数失败只重跑那个 |
| 专注 | 每个 Agent 上下文短，质量稳定 |
| 可测试 | 每个角色可单独评估 |

**但也要承认多 Agent 的代价**：
- 调用次数 = 函数数 × 3（Analyzer + ExampleWriter + Reviewer）；
- 成本是单 Agent 的 3 倍左右；
- 需要更复杂的编排与错误处理。

**为什么这里值得**：
文档生成是**离线批处理**（不是实时请求），
成本可以接受，而**质量与覆盖度**才是关键。
如果是实时场景（如 IDE 内联提示），就该用单 Agent 或纯代码方案。

**六、一个务实的落地路径**

    第一版：Scanner(AST) + 单 Agent 生成 + 示例执行验证
      ↓ 观察问题（哪类函数文档质量差）
    第二版：拆出 Reviewer，只对低质量文档二次审查
      ↓ 若仍有问题
    第三版：拆出 ExampleWriter（示例质量是主要短板时）

**不要一上来就 5 个 Agent**——
先用最简单的方案跑起来，根据实际失败案例逐步拆分。`,
        rubric: [
          { point: '5 个角色划分合理，Scanner 用代码实现而非 LLM', score: 3 },
          { point: '层级式拓扑 + 并行分发 + 局部重试', score: 2 },
          { point: '每个角色有明确的输入输出契约', score: 2 },
          { point: '成本控制（分级/缓存/跳过私有）+ 质量控制（示例可执行/参数校验/回归）', score: 2 },
          { point: '说明单 Agent 的具体问题（上下文过载/角色冲突/无法并行）+ 承认多 Agent 代价', score: 1 },
        ],
        keywords: ['AST', 'Orchestrator-Workers', '并行', '示例可执行', '参数一致性', '增量缓存'],
        explanation:
          '能指出「Scanner 应该用代码而非 LLM」「文档生成是离线批处理所以成本可接受」以及「先用单 Agent 再逐步拆分」，就是成熟的工程判断。',
        tags: ['多 Agent 设计', '综合'],
      },
    ],
  },

  /* ============================================================
   *  c5：状态管理与持久化
   * ============================================================ */
  {
    id: 'ai-auto-m2-c5',
    title: '状态管理与持久化：让 Agent 可恢复',
    goal: '理解为什么 Agent 需要显式状态，掌握状态机设计与检查点机制。',
    lessons: [
      {
        id: 'ai-auto-m2-c5-l1',
        title: '显式状态、状态机与检查点',
        difficulty: 4,
        content: `
## 隐式状态的三个问题

**隐式状态** = 只靠对话历史记录一切。

    messages = [
        {"role": "user", "content": "帮我查订单 ORD123"},
        {"role": "assistant", "tool_calls": [...]},
        {"role": "tool", "content": "..."},
        ... 50 条 ...
    ]

**问题 1：无法回答「现在到哪一步了」**

想知道"任务进行到哪了"，只能让模型自己读历史总结——
这又是一次不确定的推理。

**问题 2：中断后无法恢复**

进程崩了、用户关页面了，历史丢了就全丢了。

**问题 3：上下文膨胀**

50 条消息可能上万 token，每轮都要重发，成本线性增长。

## 显式状态：把关键信息结构化

    state = {
        "task": "查询订单 ORD123 并判断能否退款",
        "phase": "checking_status",      # 当前阶段
        "order_id": "ORD123",
        "order_status": "已发货",         # 已获取的事实
        "can_refund": False,
        "refund_reason": None,
        "steps_done": ["query_order"],
        "attempts": {"query_order": 1},
    }

**好处**：

| 问题 | 显式状态如何解决 |
| --- | --- |
| 不知道到哪一步 | \`phase\` 字段直接回答 |
| 中断无法恢复 | 状态可序列化存储，随时恢复 |
| 上下文膨胀 | 只传必要字段，不传全部历史 |
| 难调试 | 状态可直接打印、对比 |

## 状态机：把流程画出来

<StateMachineDemo />

**状态机的三要素**：

| 要素 | 说明 | 例子 |
| --- | --- | --- |
| **状态（State）** | 当前所处的阶段 | \`checking_status\`, \`awaiting_confirm\`, \`done\` |
| **转移（Transition）** | 从一个状态到另一个 | \`checking_status\` → \`awaiting_confirm\` |
| **条件（Guard）** | 转移的前提 | 只有 \`order_status == "已支付"\` 才能转移 |

**一个订单退款的状态机**：

    [start]
       ↓ 用户提出退款
    [checking_status]  ──状态不可退──> [rejected]
       ↓ 状态可退
    [awaiting_confirm] ──用户取消──> [cancelled]
       ↓ 用户确认
    [processing]
       ↓ 成功          ↓ 失败
    [done]          [retry] ──超过3次──> [failed]

**为什么用状态机而不是让模型自由发挥**：
- 每个状态只有有限几个出口，**不可能走偏**；
- 每个状态可单独测试；
- 中断后从 \`state.phase\` 恢复即可。

## 检查点：中断后从哪继续

**检查点（checkpoint）** = 把 state 序列化存下来。

    def save_checkpoint(run_id, state):
        db.upsert("checkpoints", {
            "run_id": run_id,
            "state": json.dumps(state),
            "updated_at": now(),
        })

    def load_checkpoint(run_id):
        row = db.get("checkpoints", run_id)
        return json.loads(row["state"]) if row else None

**什么时候存**：

| 时机 | 说明 |
| --- | --- |
| 每个状态转移后 | 最安全，但写库频繁 |
| 每个"重要动作"后 | 如工具调用成功、用户确认 |
| 定时 | 如每 30 秒 |

**推荐**：**状态转移后必存**，中间步骤可选。

**为什么重要**：

    用户等了 40 秒，Agent 已经走到第 6 步
      ↓ 网络抖动，连接断了
    没有检查点 → 全部重来，用户再等 40 秒
    有检查点   → 从第 6 步继续，2 秒完成

## 状态设计的三条原则

**① 最小化**

只存**恢复所需**的信息，不存全部历史。

| 存 | 不存 |
| --- | --- |
| 当前阶段 | 完整的 50 条消息 |
| 已确认的事实（订单状态、金额） | 中间推理过程 |
| 重试计数 | 每轮的原始 prompt |

**② 可序列化**

必须是 JSON 可序列化的（dict/list/str/int/float/bool/None）。
不要存对象引用、函数、数据库连接。

**③ 幂等可重放**

从任意检查点恢复后，重复执行不应产生重复副作用。
这需要配合 M2-c2 讲过的**幂等键**。

## 状态爆炸与精简

**状态爆炸**：随着任务变复杂，state 字段越来越多，最后又变成"另一个上下文"。

**症状**：
- state 里有 50+ 字段；
- 字段之间含义重叠；
- 不知道该读哪个字段判断当前情况。

**解法**：

| 方法 | 说明 |
| --- | --- |
| **分组** | \`state.facts\`（事实）/ \`state.control\`（控制流）/ \`state.meta\`（元信息） |
| **只留必要** | 定期清理已完成阶段的临时字段 |
| **用 phase 驱动** | 大部分逻辑只看 \`phase\`，不看其他字段 |

**一个精简的状态结构**：

    state = {
        "control": {"phase": "awaiting_confirm", "attempts": 1},
        "facts": {"order_id": "ORD123", "status": "已支付", "amount": 299},
        "meta": {"run_id": "...", "started_at": ..., "tokens_used": 12000},
    }

## 状态持久化的技术选型

| 方案 | 适用 | 特点 |
| --- | --- | --- |
| **内存** | 单次请求内 | 最快，但不持久 |
| **Redis** | 会话级（分钟~小时） | 快，支持 TTL |
| **PostgreSQL/MySQL** | 长期（天~月） | 可靠，可查询 |
| **对象存储（S3）** | 大状态、归档 | 便宜，但延迟高 |
| **LangGraph checkpointer** | 用框架时 | 内置，支持多种后端 |

**实践建议**：
- 会话内状态 → Redis（设 TTL）；
- 需要审计/回溯 → 数据库（保留 30~90 天）；
- 中间产物（如大文件）→ 对象存储。

## 本节的来源

> **来源类型：学术来源**
> - StateFlow: *Enhancing LLM Task-Solving through State-Driven Workflows*，
>   arXiv:[2403.11322](https://arxiv.org/abs/2403.11322)
>   核心论点：把任务建模为状态机，比让模型自由发挥更可靠
>
> **来源类型：工程实践（非学术）**
> - LangGraph 文档（状态图与 checkpointer 机制）
>   https://langchain-ai.github.io/langgraph/
> - Anthropic《Building effective agents》关于停止条件与检查点的论述
>
> **来源类型：原创**
> - 状态机图、检查点时序、全部代码与习题
`,
        tips: [
          {
            kind: 'interview',
            text: '「为什么需要显式状态」：隐式状态（只靠对话历史）无法回答"到哪一步了"、中断无法恢复、上下文膨胀。显式状态把关键信息结构化，可序列化、可恢复、可调试。',
          },
          {
            kind: 'leak',
            text: '状态设计三原则：最小化（只存恢复所需）、可序列化（JSON 类型）、幂等可重放（配合幂等键）。',
          },
          {
            kind: 'pitfall',
            text: '状态爆炸是常见陷阱：字段越来越多，最后变成"另一个上下文"。解法是分组（control/facts/meta）+ 用 phase 驱动逻辑。',
          },
        ],
        demos: [
          {
            title: '状态机 + 检查点的完整实现',
            lang: 'python',
            code: `import json

# ── 状态机定义 ──
TRANSITIONS = {
    "start": {
        "checking_status": lambda s: True,          # 无条件进入检查
    },
    "checking_status": {
        "awaiting_confirm": lambda s: s["facts"].get("can_refund") is True,
        "rejected":         lambda s: s["facts"].get("can_refund") is False,
    },
    "awaiting_confirm": {
        "processing": lambda s: s["facts"].get("user_confirmed") is True,
        "cancelled":  lambda s: s["facts"].get("user_confirmed") is False,
    },
    "processing": {
        "done":  lambda s: s["facts"].get("refund_ok") is True,
        "retry": lambda s: s["facts"].get("refund_ok") is False,
    },
    "retry": {
        "processing": lambda s: s["control"]["attempts"] < 3,
        "failed":     lambda s: s["control"]["attempts"] >= 3,
    },
    "done": {},
    "rejected": {},
    "cancelled": {},
    "failed": {},
}

def next_phase(state):
    """根据当前状态与条件，决定下一个 phase。"""
    cur = state["control"]["phase"]
    options = TRANSITIONS.get(cur, {})
    for target, guard in options.items():
        if guard(state):
            return target
    return None   # 卡住（没有出口满足）

# ── 检查点 ──
class CheckpointStore:
    def __init__(self):
        self.data = {}
    def save(self, run_id, state):
        self.data[run_id] = json.dumps(state, ensure_ascii=False)
        print(f"  [checkpoint] 保存 phase={state['control']['phase']}")
    def load(self, run_id):
        raw = self.data.get(run_id)
        return json.loads(raw) if raw else None

# ── 业务动作 ──
def do_check_status(state):
    oid = state["facts"]["order_id"]
    status = {"ORD123": "已支付", "ORD456": "已发货"}.get(oid)
    state["facts"]["status"] = status
    state["facts"]["can_refund"] = status == "已支付"
    print(f"  [action] 查询 {oid} -> 状态 {status}, 可退款={state['facts']['can_refund']}")

def do_refund(state):
    state["control"]["attempts"] += 1
    ok = state["control"]["attempts"] >= 2   # 模拟前两次失败
    state["facts"]["refund_ok"] = ok
    print(f"  [action] 尝试退款（第 {state['control']['attempts']} 次）-> {'成功' if ok else '失败'}")

# ── 主循环 ──
def run(order_id, user_confirmed=True, resume_from=None):
    store = CheckpointStore()
    run_id = f"run-{order_id}"

    state = resume_from or {
        "control": {"phase": "start", "attempts": 0},
        "facts": {"order_id": order_id, "user_confirmed": user_confirmed},
        "meta": {"run_id": run_id},
    }

    print(f"=== 开始 run={run_id} (phase={state['control']['phase']}) ===")
    for step in range(10):
        phase = state["control"]["phase"]

        # 执行当前 phase 的动作
        if phase == "checking_status":
            do_check_status(state)
        elif phase == "processing":
            do_refund(state)
        elif phase in ("done", "rejected", "cancelled", "failed"):
            print(f"  [end] 终态 {phase}")
            break

        # 转移
        nxt = next_phase(state)
        if nxt is None:
            print(f"  [stuck] phase={phase} 无可用出口")
            break
        state["control"]["phase"] = nxt
        store.save(run_id, state)

    return state, store

print("=== 场景1：可退款订单 ===")
s1, store1 = run("ORD123")
print(f"最终: {s1['control']['phase']}\\n")

print("=== 场景2：不可退款订单 ===")
s2, _ = run("ORD456")
print(f"最终: {s2['control']['phase']}\\n")

print("=== 场景3：中断后恢复 ===")
# 模拟：走到 awaiting_confirm 后中断
partial = {
    "control": {"phase": "awaiting_confirm", "attempts": 0},
    "facts": {"order_id": "ORD123", "status": "已支付", "can_refund": True, "user_confirmed": True},
    "meta": {"run_id": "run-ORD123"},
}
print("从检查点恢复（phase=awaiting_confirm）:")
s3, _ = run("ORD123", resume_from=partial)
print(f"最终: {s3['control']['phase']}")
print()
print("关键：从 awaiting_confirm 恢复，不用重跑前面的检查步骤")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'ai-auto-m2-c5-e1',
        type: 'single',
        difficulty: 2,
        question: '为什么 Agent 需要显式状态而不是只靠对话历史？',
        options: [
          { value: 'A', text: '对话历史占内存太多' },
          { value: 'B', text: '隐式状态无法回答"到哪一步了"、中断无法恢复、上下文膨胀' },
          { value: 'C', text: '模型不支持长对话' },
          { value: 'D', text: '显式状态更省 token' },
        ],
        answer: 'B',
        explanation:
          '三个核心问题：无法知道当前进度、崩溃后全丢、每轮都要重发全部历史导致成本线性增长。显式状态把关键信息结构化，可序列化、可恢复、可调试。',
        tags: ['显式状态'],
      },
      {
        id: 'ai-auto-m2-c5-e2',
        type: 'judge',
        difficulty: 2,
        question: '状态机的每个状态应该允许任意多个出口，这样才能保持灵活性。',
        answer: false,
        explanation:
          '恰恰相反。状态机的价值就在于**每个状态只有有限几个出口**（通常 2~3 个），配合 guard 条件，让流程不可能走偏。出口太多就退化成自由发挥。',
        tags: ['状态机'],
      },
      {
        id: 'ai-auto-m2-c5-e3',
        type: 'multiple',
        difficulty: 3,
        question: '状态设计的三条原则是？（多选）',
        options: [
          { value: 'A', text: '最小化：只存恢复所需的信息' },
          { value: 'B', text: '可序列化：只含 JSON 支持的类型' },
          { value: 'C', text: '幂等可重放：从检查点恢复后重复执行不产生重复副作用' },
          { value: 'D', text: '存储全部对话历史以便完整回溯' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 违反最小化原则——存全部历史就是"另一个上下文"，会导致状态膨胀。应该只存恢复所需的关键事实。',
        tags: ['状态设计'],
      },
      {
        id: 'ai-auto-m2-c5-e4',
        type: 'fill',
        difficulty: 3,
        question:
          '把状态序列化保存下来、中断后可从该点继续的机制叫 ___（checkpoint）。',
        blanks: [['检查点', 'checkpoint', 'Checkpoint', '断点']],
        explanation:
          '检查点让 Agent 可以从任意保存点恢复，而不必从头重跑。推荐在每个状态转移后保存。',
        tags: ['检查点'],
      },
      {
        id: 'ai-auto-m2-c5-e5',
        type: 'single',
        difficulty: 3,
        question: '「状态爆炸」的典型症状是？',
        options: [
          { value: 'A', text: '状态字段越来越多（50+）、含义重叠、不知道该读哪个判断当前情况' },
          { value: 'B', text: '状态存储占满磁盘' },
          { value: 'C', text: '状态无法序列化' },
          { value: 'D', text: '状态机无法收敛' },
        ],
        answer: 'A',
        explanation:
          '状态爆炸意味着 state 又变成了"另一个上下文"。解法：分组（control/facts/meta）、只留必要字段、用 phase 驱动大部分逻辑。',
        tags: ['状态爆炸'],
      },
      {
        id: 'ai-auto-m2-c5-e6',
        type: 'code',
        difficulty: 2,
        question:
          '实现状态转移：transition(state, target, guards)。\n\n- state 是 dict，含 "phase" 字段\n- guards 是 dict：目标 phase → guard 函数（返回 bool）\n- 若 guard 通过，更新 state["phase"] 并返回 True\n- 若无 guard 或 guard 失败，返回 False 且不改状态',
        starterCode: `def transition(state, target, guards):
    guard = guards.get(target)
    if guard is not None and not guard(state):
        return False
    ___
    return True
`,
        setupCode: '',
        expectedOutput: '转移结果',
        tests: `state = {"phase": "start", "ok": True}
assert transition(state, "next", {"next": lambda s: s["ok"]}) == True
assert state["phase"] == "next"

state2 = {"phase": "start", "ok": False}
assert transition(state2, "next", {"next": lambda s: s["ok"]}) == False
assert state2["phase"] == "start", "失败时不应改状态"

# 无 guard 直接通过
state3 = {"phase": "a"}
assert transition(state3, "b", {}) == True
assert state3["phase"] == "b"
`,
        answer: `def transition(state, target, guards):
    guard = guards.get(target)
    if guard is not None and not guard(state):
        return False
    state["phase"] = target
    return True
`,
        explanation:
          '**关键**：guard 失败时**不能改状态**——这是状态机的安全保证。\n\n`guards.get(target)` 返回 None 表示无守卫，直接放行。\n\n生产环境还应记录转移日志（从哪个状态到哪个、guard 结果），便于排查"为什么卡住了"。',
        tags: ['编程', '状态转移'],
      },
      {
        id: 'ai-auto-m2-c5-e7',
        type: 'code',
        difficulty: 3,
        question:
          '实现状态精简：slim_state(state, keep_facts)。\n\n- state 含 "control"/"facts"/"meta" 三部分\n- 只保留 facts 中 keep_facts 列出的字段\n- control 只保留 phase 与 attempts\n- meta 只保留 run_id\n\n返回新的 dict（不修改原对象）',
        starterCode: `def slim_state(state, keep_facts):
    return {
        "control": ___,
        "facts": ___,
        "meta": ___,
    }
`,
        setupCode: '',
        expectedOutput: '精简后的状态',
        tests: `state = {
    "control": {"phase": "checking", "attempts": 2, "temp_data": "x"},
    "facts": {"order_id": "ORD1", "status": "已支付", "debug_info": "y"},
    "meta": {"run_id": "r1", "started_at": 123, "big_blob": "z"},
}
slim = slim_state(state, ["order_id", "status"])
assert slim["control"] == {"phase": "checking", "attempts": 2}, f"control 不正确: {slim['control']}"
assert slim["facts"] == {"order_id": "ORD1", "status": "已支付"}
assert slim["meta"] == {"run_id": "r1"}
# 原对象不变
assert "temp_data" in state["control"], "不应修改原对象"
# keep_facts 为空
slim2 = slim_state(state, [])
assert slim2["facts"] == {}
`,
        answer: `def slim_state(state, keep_facts):
    return {
        "control": {
            "phase": state["control"]["phase"],
            "attempts": state["control"].get("attempts", 0),
        },
        "facts": {k: state["facts"][k] for k in keep_facts if k in state["facts"]},
        "meta": {"run_id": state["meta"]["run_id"]},
    }
`,
        explanation:
          '这是**状态爆炸的解药**：只保留恢复必需的字段。\n\n三部分的分工：\n- `control`：控制流（phase、重试次数）\n- `facts`：已确认的事实（订单状态、金额）\n- `meta`：元信息（run_id、时间、token）\n\n**注意返回新对象**，不修改原 state——避免意外的副作用。',
        tags: ['编程', '状态精简'],
      },
      {
        id: 'ai-auto-m2-c5-e8',
        type: 'code',
        difficulty: 4,
        question:
          '实现带重试的状态机执行器：run_state_machine(initial_state, handlers, transitions, max_steps=20)。\n\n- handlers: phase → 动作函数（接收 state，返回 None）\n- transitions: phase → {目标: guard}，按顺序检查第一个通过的\n- 无可用转移时停止\n- 返回 (最终 state, 执行过的 phase 列表)',
        starterCode: `def run_state_machine(initial_state, handlers, transitions, max_steps=20):
    state = dict(initial_state)
    state["phase"] = state.get("phase", "start")
    visited = []
    for _ in range(max_steps):
        phase = state["phase"]
        visited.append(phase)
        if phase in handlers:
            handlers[phase](state)
        options = transitions.get(phase, {})
        nxt = None
        for target, guard in options.items():
            if guard(state):
                nxt = target
                break
        if nxt is None:
            break
        state["phase"] = nxt
    return state, visited
`,
        setupCode: '',
        expectedOutput: '状态机执行',
        tests: `def h_a(s): s["a_done"] = True
def h_b(s): s["b_done"] = True

handlers = {"a": h_a, "b": h_b}
transitions = {
    "a": {"b": lambda s: s.get("a_done") is True},
    "b": {"done": lambda s: s.get("b_done") is True},
}
final, visited = run_state_machine({"phase": "a"}, handlers, transitions)
assert visited == ["a", "b", "done"], f"路径不正确: {visited}"
assert final["phase"] == "done"
assert final.get("a_done") and final.get("b_done")
# 卡住的情况
transitions2 = {"a": {"b": lambda s: False}}
f2, v2 = run_state_machine({"phase": "a"}, handlers, transitions2)
assert f2["phase"] == "a", "无可用转移应停在当前状态"
assert v2 == ["a"]
# max_steps 限制
transitions3 = {"a": {"a": lambda s: True}}  # 自环
f3, v3 = run_state_machine({"phase": "a"}, handlers, transitions3, max_steps=5)
assert len(v3) == 5, f"应执行 5 步，实际 {len(v3)}"
`,
        answer: `def run_state_machine(initial_state, handlers, transitions, max_steps=20):
    state = dict(initial_state)
    state["phase"] = state.get("phase", "start")
    visited = []
    for _ in range(max_steps):
        phase = state["phase"]
        visited.append(phase)
        if phase in handlers:
            handlers[phase](state)
        options = transitions.get(phase, {})
        nxt = None
        for target, guard in options.items():
            if guard(state):
                nxt = target
                break
        if nxt is None:
            break
        state["phase"] = nxt
    return state, visited
`,
        explanation:
          '三个安全机制缺一不可：\n1. **无可用转移 → 停止**（而不是报错或乱走）\n2. **max_steps 上限**（防止自环死循环）\n3. **记录 visited**（便于调试与审计）\n\n**注意 `dict(initial_state)`**：浅拷贝避免修改调用方的对象。深拷贝更安全但开销大。',
        tags: ['编程', '状态机'],
      },
      {
        id: 'ai-auto-m2-c5-e9',
        type: 'judge',
        difficulty: 3,
        question: '检查点应该保存完整的对话历史，这样才能完整恢复。',
        answer: false,
        explanation:
          '保存完整历史违反最小化原则——那等于把"另一个上下文"存进数据库，会导致状态膨胀、存储成本高、恢复后仍面临上下文超限。应该只存恢复所需的结构化事实。',
        tags: ['检查点'],
      },
      {
        id: 'ai-auto-m2-c5-e10',
        type: 'open',
        difficulty: 5,
        question:
          '你要设计一个「多步骤报销审批」Agent：员工提交 → 校验发票 → 匹配预算 → 主管审批 → 财务打款。整个流程可能持续数天（等主管审批），且可能在任何一步中断。\n\n请设计：① 状态结构；② 状态机；③ 检查点策略；④ 如何处理"等待人工"这种长时间挂起；⑤ 如何保证不重复打款。',
        referenceAnswer: `**一、状态结构**

    state = {
        "control": {
            "phase": "waiting_manager_approval",
            "attempts": {"validate_invoice": 1, "notify": 0},
            "last_transition_at": 1761000000,
        },
        "facts": {
            "claim_id": "EXP20260101",
            "employee_id": "E123",
            "amount_cents": 128000,
            "invoice_valid": True,
            "budget_available": True,
            "manager_id": "M456",
            "manager_approved": None,        # None=待定, True/False
            "payment_id": None,
        },
        "meta": {
            "run_id": "run-EXP20260101",
            "created_at": 1761000000,
            "sla_deadline": 1761604800,      # 7 天后
            "tokens_used": 3400,
        },
    }

**设计要点**：

- \`facts\` 只存**已确认的事实**，不存推理过程；
- \`manager_approved\` 用 \`None\` 表示"还没审批"，区别于 \`False\`（拒绝了）；
- \`sla_deadline\` 支持超时提醒。

**二、状态机**

    [submitted]
       ↓ 员工提交
    [validating_invoice]
       ├─ 发票无效 → [rejected_invoice]
       └─ 发票有效 ↓
    [matching_budget]
       ├─ 预算不足 → [rejected_budget]
       └─ 预算充足 ↓
    [waiting_manager_approval]  ←── 可能等数天
       ├─ 主管拒绝 → [rejected_manager]
       ├─ 超时未审 → [reminded] → 回到 waiting（最多 2 次）→ [escalated]
       └─ 主管批准 ↓
    [processing_payment]
       ├─ 成功 → [paid]（终态）
       └─ 失败 → [retry_payment]（最多 3 次）→ [payment_failed]

**关键设计**：

- **每个终态都是明确的**（paid / rejected_* / escalated / payment_failed），
  不存在"卡在中间"；
- **超时路径**：\`waiting → reminded → waiting → escalated\`，
  用 \`attempts["notify"]\` 计数；
- **重试路径**：\`processing_payment → retry_payment → processing_payment\`，
  用 \`attempts["payment"]\` 计数，超 3 次转人工。

**三、检查点策略**

| 时机 | 后端 | 说明 |
| --- | --- | --- |
| 每次状态转移后 | PostgreSQL | 主存储，强一致 |
| 等待人工期间 | Redis（TTL 7天） | 快速查询"待我审批"列表 |
| 终态后 | PostgreSQL + 归档 | 保留 90 天供审计 |

**表结构**：

    CREATE TABLE agent_runs (
      run_id       TEXT PRIMARY KEY,
      claim_id     TEXT NOT NULL,
      phase        TEXT NOT NULL,
      state_json   JSONB NOT NULL,
      created_at   TIMESTAMPTZ,
      updated_at   TIMESTAMPTZ,
      sla_deadline TIMESTAMPTZ
    );
    CREATE INDEX idx_phase ON agent_runs(phase);          -- 查"待审批"
    CREATE INDEX idx_sla ON agent_runs(sla_deadline);     -- 查超时

**四、处理"等待人工"**

这是与普通 Agent 最大的不同——**流程会挂起数天**。

**方案：事件驱动，而不是轮询**

    # 提交后：保存状态，注册等待事件，立即释放资源
    save_checkpoint(run_id, state)
    register_waiter(run_id, event="manager_approved", manager_id="M456")
    return {"status": "waiting", "run_id": run_id}

    # 主管点"批准"时触发回调
    def on_manager_approve(run_id, approved):
        state = load_checkpoint(run_id)
        state["facts"]["manager_approved"] = approved
        state["control"]["phase"] = (
            "processing_payment" if approved else "rejected_manager"
        )
        save_checkpoint(run_id, state)
        resume_run(run_id)        # 从新 phase 继续

**为什么不轮询**：
- 数天内每秒查一次是巨大浪费；
- 状态存数据库，查询是 O(1)，但触发要靠事件。

**超时处理**（定时任务）：

    # 每天跑一次
    for row in db.query("SELECT * FROM agent_runs WHERE phase='waiting_manager_approval' AND sla_deadline < now()"):
        state = json.loads(row["state_json"])
        state["control"]["attempts"]["notify"] += 1
        if state["control"]["attempts"]["notify"] <= 2:
            state["control"]["phase"] = "reminded"
            notify_manager(state["facts"]["manager_id"], urgent=True)
        else:
            state["control"]["phase"] = "escalated"
            notify_hr(state)
        save_checkpoint(row["run_id"], state)

**五、保证不重复打款（最关键）**

**三重保护**：

**① 幂等键**

    payment_key = f"claim:{claim_id}:v1"

    def do_payment(state):
        existing = payment_db.get_by_key(payment_key)
        if existing:
            state["facts"]["payment_id"] = existing["id"]
            return   # 已经打过，直接返回
        result = payment_gateway.pay(
            amount=state["facts"]["amount_cents"],
            idempotency_key=payment_key,
        )
        state["facts"]["payment_id"] = result["id"]

**② 状态前置检查**

    def transition_to_payment(state):
        # 已经是 paid 或 processing 就不能再进
        if state["control"]["phase"] in ("paid", "processing_payment"):
            return False
        if state["facts"].get("payment_id"):
            return False     # 已有付款记录
        return True

**③ 数据库唯一约束（最后一道防线）**

    CREATE UNIQUE INDEX uniq_payment_per_claim
      ON payments(claim_id) WHERE status = 'success';

即使前面两层都被绕过（如并发执行），数据库会拒绝第二次插入。

**④ 并发控制**

用**乐观锁**防止两个进程同时处理同一个 run：

    UPDATE agent_runs
       SET state_json = $1, updated_at = now(), version = version + 1
     WHERE run_id = $2 AND version = $3;
    -- 影响行数为 0 → 说明被别人改了，重新加载

**六、完整的容错矩阵**

| 故障 | 处理 |
| --- | --- |
| 进程崩溃 | 从最近的检查点恢复（phase 不变） |
| 发票校验服务超时 | 重试 3 次，仍失败转人工 |
| 主管一直不审 | 提醒 2 次后升级 HR |
| 打款接口超时 | 用幂等键重试，查询真实结果 |
| 重复消息（消息队列重投） | 幂等键 + 状态检查去重 |
| 并发处理同一 run | 乐观锁（version 字段） |

**七、一个容易忽略的点**

**终态必须显式且不可逆**。

\`paid\`、\`rejected_*\`、\`escalated\` 都是终态，
一旦进入就不能再转移出去（除非有明确的"撤销"流程，那本身是另一个状态机）。

**为什么**：如果终态可以随意离开，就会出现"已打款的单子又被审批一次"这类事故。

**验证方法**：在状态机的 transitions 定义里，终态对应的 dict 必须是空的 \`{}\`，
且要有单元测试断言"从终态无法转移"。`,
        rubric: [
          { point: '状态结构分 control/facts/meta，用 None 表示待定', score: 2 },
          { point: '状态机完整：正常路径 + 拒绝路径 + 超时升级 + 重试', score: 3 },
          { point: '检查点分后端（PG 主存 + Redis 快查），有索引设计', score: 2 },
          { point: '等待人工用事件驱动而非轮询，含超时定时任务', score: 2 },
          { point: '防重复打款三重保护（幂等键 + 状态检查 + 唯一约束）+ 乐观锁', score: 1 },
        ],
        keywords: ['检查点', '事件驱动', 'SLA 超时', '幂等键', '唯一约束', '乐观锁'],
        explanation:
          '这道题的核心难点是「等待数天」与「不能重复打款」。能给出事件驱动 + 三重幂等保护 + 乐观锁，就是生产级的分布式流程设计。',
        tags: ['状态管理', '综合'],
      },
    ],
  },
];
