import type { Chapter } from '../../types';

/* ============================================================
 *  B2 扩展：c6 Agent 工程落地（MCP / 框架 / 可观测性 / 基准）
 *
 *  参考：MCP 规范 (modelcontextprotocol.io)、
 *       Claude Agent SDK、LangGraph、GAIA / SWE-bench / WebArena
 * ============================================================ */

export const llmB2Extra3: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'llm-b2-c6',
    title: 'Agent 工程落地：MCP、框架与可观测性',
    goal: '掌握 MCP 协议的作用、主流 Agent 框架的取舍、生产级可观测性设计与 Agent 基准。',
    lessons: [
      {
        id: 'llm-b2-c6-l1',
        title: 'MCP、框架选型与可观测性',
        content: `
### 学习目标

学完本节，你应该能够：
1. 算清 MCP 把 M×N 适配降为 M+N 的账，说出 Tools/Resources/Prompts 三原语；
2. 对比主流框架定位，复述 Anthropic『先不用框架』的理由与安全考量；
3. 设计 trace/span/attributes 三级追踪并核算单任务 token 成本。

### 前置知识

- c2 工具调用、c4 评估与可观测性基础。

### 问题背景

Agent 从 demo 到生产的三公里：工具接入从 M×N 份适配变成 M+N（MCP）；框架选型决定你调试的是业务还是抽象层；而 trace/span 级可观测性是『出事能定位、成本能归因』的生死线。

### 直觉理解

MCP 是 USB-C：以前每台设备一种线（M 个应用 × N 个工具），现在统一插口，工具写一次所有 Host 都能用。框架是脚手架：搭得快，但挡住你看清每一块砖——务必读懂底层提示。可观测性是行车记录仪+油耗表：每个 span 记录『这次 LLM 调用花了多少 token、多少毫秒』，trace 串起来就是一次任务的完整病历。

### 核心概念与原理详解

## MCP：Agent 的工具接入标准

**问题**：每个 Agent 应用都要自己对接工具（数据库、文件系统、API），
M 个应用 × N 个工具 = M×N 份适配代码。

**MCP（Model Context Protocol）** 用统一协议解决这个问题：

    M 个应用 + N 个工具 = M + N 份适配

**架构**：

    Host（Claude Desktop / IDE）
      └── MCP Client
            ├── MCP Server（文件系统）
            ├── MCP Server（数据库）
            └── MCP Server（GitHub / Slack）

**三个核心原语**：
| 原语 | 作用 |
| --- | --- |
| **Tools** | 可调用的函数（模型主动决定调用） |
| **Resources** | 可读取的数据（应用决定加载） |
| **Prompts** | 预写的提示模板（用户主动选用） |

**为什么重要**：
- Anthropic 在《Building effective agents》中明确推荐 MCP 作为工具接入方式；
- 生态效应：写一次 MCP Server，所有支持 MCP 的 Host 都能用；
- 这是 2025 年 Agent 工程最重要的标准化进展。

**安全考量（关键）**：
- MCP Server 可以是第三方提供的，**必须做权限隔离**；
- 工具描述可能被恶意注入（prompt injection）；
- 生产环境要限制 Server 的文件系统与网络访问范围。

## Agent 框架选型

**Anthropic 的警告**：框架会增加抽象层、掩盖底层提示、更难调试。

**但框架也有价值**：状态管理、持久化、可视化调试。

| 框架 | 定位 | 适合 |
| --- | --- | --- |
| **Claude Agent SDK** | 官方 SDK | 用 Claude 的 Agent，可控性强 |
| **LangGraph** | 图状状态机 | 需要显式状态与分支的复杂工作流 |
| **LlamaIndex** | 数据/RAG 优先 | 以检索为核心的 Agent |
| **smolagents** | 极简 | 学习与原型，代码量小 |
| **OpenAI Agents SDK** | Handoff 机制 | 多 Agent 转交 |

**选型建议**：
1. **先不用框架**（Anthropic 建议）：很多模式几十行代码就够；
2. 需要持久化/可视化/复杂分支 → LangGraph；
3. **务必读懂框架底层**——错误假设是最常见的故障来源。

## 可观测性：生产 Agent 的生死线

Agent 的问题极难排查：多轮、多工具、非确定性。
**必须有完整的追踪**。

**核心概念**：

| 概念 | 说明 |
| --- | --- |
| **Trace** | 一次完整的任务执行（一个根） |
| **Span** | 一个操作单元（一次 LLM 调用 / 一次工具调用） |
| **Attributes** | 附在 span 上的键值（模型名、token 数、工具名、耗时） |

**必须记录的内容**：
- 每轮 LLM 的输入与输出（完整 prompt 与 response）；
- 每次工具调用的参数与结果；
- token 数与成本；
- 延迟（每步与总）；
- 错误与重试。

**主流方案**：
- **OpenTelemetry**（标准协议）：语义约定已包含 GenAI 相关字段；
- **LangSmith**（LangChain 生态）：Agent 专用可视化；
- **Langfuse**（开源）：可自托管；
- 自建：写入结构化日志，用 trace_id 串联。

**关键实践**：
1. **trace_id 贯穿全链路**（包括用户请求头传入）；
2. **采样策略**：全量记录成本高，可按错误/慢请求优先采样；
3. **敏感信息脱敏**：prompt 里可能有 PII。

## Agent 基准（Benchmark）

| 基准 | 测什么 | 特点 |
| --- | --- | --- |
| **GAIA** | 通用助手任务 | 需要多步推理 + 工具 + 网络，人类简单但 AI 很难 |
| **SWE-bench** | 修真实 GitHub issue | 有**可验证**的测试用例，客观 |
| **WebArena** | 网页操作 | 真实网站环境（购物、论坛、GitLab） |
| **τ-bench** | 工具-用户交互 | 多轮对话 + 政策约束（如航空客服） |
| **AgentBench** | 多环境综合 | 8 个不同环境 |

**怎么用基准**：
- **不要只报总分**：分任务类型看，才知道短板在哪；
- **注意污染**：SWE-bench 的部分题目已在训练数据中，要看 Verified 子集；
- **自建评测集**：公开基准不能反映你的业务场景。

## 生产落地的完整清单

| 维度 | 必做 |
| --- | --- |
| **安全** | 沙箱执行、权限最小化、注入防护、输出过滤 |
| **可靠性** | 重试与退避、超时、熔断、幂等 |
| **成本** | token 预算、缓存、模型分级、并发限流 |
| **可观测** | trace/span、成本看板、错误告警 |
| **评估** | 离线评测集、在线 A/B、人工抽检 |
| **迭代** | 版本化提示、灰度发布、回滚机制 |

**一句话**：Agent 从 demo 到生产，**90% 的工作在工程而不是模型**。

<TraceWaterfall />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
# ---- 1. MCP 的账：M 应用 × N 工具 ----
for M, N in [(3, 5), (10, 20)]:
    print(f"M={M}, N={N}: 点对点适配 {M*N} 份 -> MCP 统一后 {M+N} 份")

# ---- 2. Trace/Span 结构（OpenTelemetry 风格）----
spans = [
    {"span": "agent.run",          "ms": 4200, "attrs": {"model": "qwen-max", "task": "查物流"}},
    {"span": "llm.call#1",         "ms": 800,  "attrs": {"tokens_in": 1200, "tokens_out": 60}},
    {"span": "tool.query_order",   "ms": 320,  "attrs": {"args": "A88", "result": "已发货"}},
    {"span": "llm.call#2",         "ms": 900,  "attrs": {"tokens_in": 1500, "tokens_out": 40}},
]
for s in spans:
    print(f"  {s['span']:18} {s['ms']:5} ms  {s['attrs']}")

# ---- 3. 成本核算：token × 单价，逐 span 归因 ----
price_in, price_out = 0.002/1000, 0.006/1000     # 示例价 $/tok
tin, tout = 1200+1500, 60+40
print(f"单任务成本 \${tin*price_in + tout*price_out:.5f}（in {tin} / out {tout} tok）")
print("MCP 三原语: Tools(模型调用) / Resources(应用加载) / Prompts(用户选用)")\`\`\`

预期输出（实测）：M×N → M+N：M=3,N=5 时 15→8 份；M=10,N=20 时 200→30 份；trace 树：agent.run 4200 ms 下挂 2 次 LLM 调用与 1 次工具调用（各带 token/参数属性）；单任务成本 $0.006（in 2700 / out 100 tok，示例价）。

**常见错误**：生产环境直接接入第三方 MCP Server 而不做权限隔离（文件系统/网络范围不设限）；用框架后从不看底层 prompt，故障时对着抽象层猜；只记成功请求的日志，失败与重试无迹可寻。

### 常见误区

1. **『MCP 只是又一个 Function Calling』**——它是协议：三原语（Tools/Resources/Prompts）+ 标准传输，一次接入生态互通；\\n2. **『框架越全越好』**——抽象层越厚，底层提示越失控，Anthropic 建议先不用框架；\\n3. **『日志=可观测性』**——必须是结构化 trace（父子 span、属性、耗时、token），才能自动聚合出成功率/P95/成本看板。

### 知识关联

- **向前**：本课程收官——从提示工程到 MCP，Agent 工程主线闭环；
- **向后**：python-agent-development 用代码实现本章全部概念；
- **平行**：c4 的评估指标正是 trace 聚合出来的看板。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| MCP | M×N → M+N；Tools/Resources/Prompts 三原语 |
| 安全 | 第三方 Server 必须权限隔离，工具描述可被注入 |
| 框架 | 先不用；要持久化/可视化再选 LangGraph 等 |
| 可观测 | Trace(任务)/Span(操作)/Attributes(键值) |
| 成本 | token × 单价逐 span 归因，失败轨迹必须留存 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Yao et al. (2022) arXiv:2210.03629《ReAct》、Shinn et al. (2023) arXiv:2303.11366《Reflexion》、Anthropic《Building effective agents》与 MCP 官方文档 modelcontextprotocol.io 相应章节）
`,
        tips: [
          {
            kind: 'interview',
            text: '「MCP 解决什么问题」：把 M×N 的工具适配降为 M+N。Host 通过 MCP Client 连接多个 MCP Server，统一提供 Tools/Resources/Prompts 三类原语。',
          },
          {
            kind: 'leak',
            text: 'Agent 可观测性的三个核心概念：Trace（一次任务）、Span（一次操作）、Attributes（键值）。必须记录每轮 LLM 输入输出与工具调用。',
          },
          {
            kind: 'note',
            text: 'GAIA 测通用助手、SWE-bench 测代码修复（有可验证测试）、WebArena 测网页操作、τ-bench 测工具-用户多轮交互。',
          },
        ],
        demos: [
          {
            title: 'MCP 工具定义与调用追踪',
            lang: 'python',
            code: `import json
import time
import uuid

class Tracer:
    """极简 trace 实现（对应 OpenTelemetry 的 trace/span 概念）。"""
    def __init__(self):
        self.trace_id = str(uuid.uuid4())[:8]
        self.spans = []

    def span(self, name, **attrs):
        return _Span(self, name, attrs)

    def summary(self):
        total_ms = sum(s["duration_ms"] for s in self.spans)
        total_tokens = sum(s["attrs"].get("tokens", 0) for s in self.spans)
        print(f"trace_id={self.trace_id}  spans={len(self.spans)}  总耗时={total_ms:.1f}ms  tokens={total_tokens}")
        for s in self.spans:
            print(f"  [{s['name']}] {s['duration_ms']:.1f}ms  {s['attrs']}")

class _Span:
    def __init__(self, tracer, name, attrs):
        self.tracer, self.name, self.attrs = tracer, name, attrs
    def __enter__(self):
        self.t0 = time.time()
        return self
    def __exit__(self, *args):
        self.tracer.spans.append({
            "name": self.name,
            "duration_ms": (time.time() - self.t0) * 1000,
            "attrs": self.attrs,
        })

# MCP 风格的工具定义
MCP_TOOL = {
    "name": "query_sales",
    "description": "查询指定城市的销售数据。当用户问某城市的销售额时使用。",
    "inputSchema": {
        "type": "object",
        "properties": {
            "city": {"type": "string", "description": "城市名，如 北京、上海"},
            "month": {"type": "string", "description": "月份，格式 YYYY-MM"},
        },
        "required": ["city"],
    },
}

def query_sales(city, month=None):
    return {"city": city, "month": month, "amount": 12345}

# 完整调用链
tracer = Tracer()
with tracer.span("llm.plan", model="claude", tokens=850):
    time.sleep(0.01)
    plan = f"需要调用 {MCP_TOOL['name']} 查询北京"

with tracer.span("tool.query_sales", tool=MCP_TOOL["name"], city="北京"):
    time.sleep(0.005)
    result = query_sales("北京", "2026-10")

with tracer.span("llm.answer", model="claude", tokens=320):
    time.sleep(0.008)
    answer = f"北京 2026-10 销售额为 {result['amount']} 元"

print("工具 schema:")
print(json.dumps(MCP_TOOL, ensure_ascii=False, indent=2)[:300])
print()
print("=== Trace 汇总 ===")
tracer.summary()`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-b2-c6-e1',
        type: 'single',
        difficulty: 2,
        question: 'MCP（Model Context Protocol）主要解决什么问题？',
        options: [
          { value: 'A', text: '提升模型的推理能力' },
          { value: 'B', text: '把 M 个应用对接 N 个工具的适配成本从 M×N 降到 M+N' },
          { value: 'C', text: '减少模型的参数量' },
          { value: 'D', text: '加速模型推理' },
        ],
        answer: 'B',
        explanation:
          'MCP 是工具接入的统一协议。Host 通过 MCP Client 连接多个 MCP Server，每个 Server 暴露 Tools/Resources/Prompts，避免为每个应用重复适配每个工具。',
        tags: ['MCP'],
      },
      {
        id: 'llm-b2-c6-e2',
        type: 'judge',
        difficulty: 2,
        question: 'Anthropic 建议开发者一开始就使用成熟的 Agent 框架，以获得更好的可维护性。',
        answer: false,
        explanation:
          'Anthropic 建议**先用 LLM API 直接实现**，很多模式几行代码即可。框架会增加抽象、掩盖底层细节、更难调试，还容易诱导不必要的复杂度。',
        tags: ['框架'],
      },
      {
        id: 'llm-b2-c6-e3',
        type: 'multiple',
        difficulty: 3,
        question: 'MCP 提供的三个核心原语是？（多选）',
        options: [
          { value: 'A', text: 'Tools（可调用函数，模型决定调用）' },
          { value: 'B', text: 'Resources（可读取数据，应用决定加载）' },
          { value: 'C', text: 'Prompts（预写提示模板，用户选用）' },
          { value: 'D', text: 'Weights（模型权重）' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 与 MCP 无关。MCP 的巧妙设计在于区分"谁来控制"：Tools 由模型决定、Resources 由应用决定、Prompts 由用户决定。',
        tags: ['MCP'],
      },
      {
        id: 'llm-b2-c6-e4',
        type: 'fill',
        difficulty: 3,
        question: '可观测性中，一次完整的任务执行叫 ___，其中的一个操作单元（一次 LLM 调用或工具调用）叫 Span。',
        blanks: [['Trace', 'trace', '追踪']],
        explanation:
          'Trace 是根（一次任务），Span 是子节点（一次操作）。OpenTelemetry 的标准模型，LangSmith/Langfuse 都遵循这套概念。',
        tags: ['可观测性'],
      },
      {
        id: 'llm-b2-c6-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现 MCP 工具 schema 校验：validate_tool_call(tool_schema, args)。\n\n检查 args 是否覆盖了 schema 中 required 的所有字段，返回 (是否合法, 缺失字段列表)。',
        starterCode: `def validate_tool_call(tool_schema, args):
    required = tool_schema.get("inputSchema", {}).get("required", [])
    missing = ___
    return len(missing) == 0, missing


schema = {
    "name": "query_sales",
    "inputSchema": {
        "type": "object",
        "properties": {"city": {"type": "string"}, "month": {"type": "string"}},
        "required": ["city"],
    },
}
validate_tool_call(schema, {"city": "北京"})
`,
        setupCode: '',
        expectedOutput: '(True, [])',
        tests: `schema = {
    "name": "query_sales",
    "inputSchema": {
        "properties": {"city": {"type": "string"}, "month": {"type": "string"}},
        "required": ["city"],
    },
}
ok, missing = validate_tool_call(schema, {"city": "北京"})
assert ok and missing == [], f"应合法，实际 {ok}, {missing}"
ok2, missing2 = validate_tool_call(schema, {"month": "2026-10"})
assert not ok2 and missing2 == ["city"], f"缺少 city，实际 {missing2}"
ok3, missing3 = validate_tool_call({"inputSchema": {}}, {})
assert ok3 and missing3 == [], "无 required 时应合法"
`,
        answer: `def validate_tool_call(tool_schema, args):
    required = tool_schema.get("inputSchema", {}).get("required", [])
    missing = [f for f in required if f not in args]
    return len(missing) == 0, missing


schema = {
    "name": "query_sales",
    "inputSchema": {"required": ["city"]},
}
validate_tool_call(schema, {"city": "北京"})`,
        explanation:
          '这是工具调用前的必做校验：模型可能漏传必填参数。\n\n生产环境还要校验**类型**（city 是否为 string）与**取值**（month 格式是否正确），并在校验失败时把明确的错误信息回传给模型，让它自我修正。',
        tags: ['编程', '工具校验'],
      },
      {
        id: 'llm-b2-c6-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现 trace 统计：trace_summary(spans)。\n\n- spans 是字典列表，每个含 name、duration_ms、attrs\n- 返回 (总耗时, 总 token 数, 最慢的 span 名)\n\nattrs 里的 tokens 字段累加（可选）。',
        starterCode: `def trace_summary(spans):
    if not spans:
        return 0.0, 0, None
    total_ms = ___
    total_tokens = ___
    slowest = ___
    return round(total_ms, 2), total_tokens, slowest


spans = [
    {"name": "llm.plan", "duration_ms": 120.5, "attrs": {"tokens": 850}},
    {"name": "tool.query", "duration_ms": 30.2, "attrs": {}},
    {"name": "llm.answer", "duration_ms": 200.1, "attrs": {"tokens": 320}},
]
trace_summary(spans)
`,
        setupCode: '',
        expectedOutput: '(350.8, 1170, "llm.answer")',
        tests: `spans = [
    {"name": "llm.plan", "duration_ms": 120.5, "attrs": {"tokens": 850}},
    {"name": "tool.query", "duration_ms": 30.2, "attrs": {}},
    {"name": "llm.answer", "duration_ms": 200.1, "attrs": {"tokens": 320}},
]
ms, tok, slow = trace_summary(spans)
assert abs(ms - 350.8) < 0.1, f"总耗时应 350.8，实际 {ms}"
assert tok == 1170, f"总 token 应 1170，实际 {tok}"
assert slow == "llm.answer", f"最慢应为 llm.answer，实际 {slow}"
assert trace_summary([]) == (0.0, 0, None), "空列表应返回 (0.0, 0, None)"
`,
        answer: `def trace_summary(spans):
    if not spans:
        return 0.0, 0, None
    total_ms = sum(s["duration_ms"] for s in spans)
    total_tokens = sum(s.get("attrs", {}).get("tokens", 0) for s in spans)
    slowest = max(spans, key=lambda s: s["duration_ms"])["name"]
    return round(total_ms, 2), total_tokens, slowest


spans = [
    {"name": "llm.plan", "duration_ms": 120.5, "attrs": {"tokens": 850}},
    {"name": "tool.query", "duration_ms": 30.2, "attrs": {}},
    {"name": "llm.answer", "duration_ms": 200.1, "attrs": {"tokens": 320}},
]
trace_summary(spans)`,
        explanation:
          '这段逻辑是生产 Agent 成本与性能看板的基础。\n\n**实战要点**：\n- 用 `.get("attrs", {}).get("tokens", 0)` 容错（工具调用通常没有 token）；\n- 找最慢 span 是性能优化的第一步——通常瓶颈集中在某一个环节。',
        tags: ['编程', '可观测性'],
      },
      {
        id: 'llm-b2-c6-e7',
        type: 'judge',
        difficulty: 3,
        question: 'GAIA 基准的特点是任务对人类简单但对 AI 很难，需要多步推理与工具使用。',
        answer: true,
        explanation:
          'GAIA 正是为此设计的：人类专家平均 92% 正确率，而带工具的 GPT-4 只有 15%。它需要多步推理、网络搜索、多模态理解与工具组合。',
        tags: ['基准'],
      },
      {
        id: 'llm-b2-c6-e8',
        type: 'multiple',
        difficulty: 3,
        question: '生产级 Agent 落地必须考虑哪些方面？（多选）',
        options: [
          { value: 'A', text: '安全：沙箱执行、权限最小化、注入防护' },
          { value: 'B', text: '可靠性：重试退避、超时、熔断、幂等' },
          { value: 'C', text: '可观测：trace/span、成本看板、错误告警' },
          { value: 'D', text: '只要模型够强，工程细节可以忽略' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 是错误的典型误解。从 demo 到生产，**90% 的工作在工程而不是模型**——安全、可靠性、成本、可观测缺一不可。',
        tags: ['生产落地'],
      },
      {
        id: 'llm-b2-c6-e9',
        type: 'open',
        difficulty: 4,
        question:
          '你要把一个 Agent 应用从 demo 推向生产。请给出一份完整的落地方案，覆盖：工具接入（MCP）、框架选型、可观测性、安全、成本控制与评估。',
        referenceAnswer: `**一、工具接入：MCP**

**为什么用 MCP**：把 M 个应用 × N 个工具的适配成本降为 M+N。

**实施**：
1. 为每个内部系统写一个 MCP Server（数据库、文件系统、内部 API）；
2. 工具定义要精心设计（ACI 原则）：
   - 描述写清"何时该用/不该用"，含示例；
   - 参数名语义明确，避免相似工具混淆；
   - poka-yoke：让错误调用难以发生（如枚举值代替自由文本）；
3. **安全隔离**：MCP Server 只暴露必要能力，限制文件系统与网络范围；
   第三方 Server 视为不受信任，需人工审核。

**二、框架选型**

**先不用框架**：Anthropic 建议先用 LLM API 直接实现，
很多模式（Chaining/Routing）几十行代码即可，可控性最好。

**需要时再选**：
- 需要持久化状态 + 复杂分支 → **LangGraph**；
- 以检索为核心 → **LlamaIndex**；
- 原型/学习 → **smolagents**（极简）；
- 用 Claude 生态 → **Claude Agent SDK**。

**关键**：无论用什么框架，**必须读懂底层**——
对底层行为的错误假设是最常见的故障来源。

**三、可观测性**

**三个层次**：
1. **Trace**：一次任务执行（trace_id 贯穿）；
2. **Span**：每次 LLM 调用 / 工具调用；
3. **Attributes**：模型名、token 数、耗时、工具参数。

**必记内容**：完整 prompt/response、工具参数与结果、token 与成本、错误与重试。

**实施方案**：
- 用 **OpenTelemetry** 标准（GenAI 语义约定）；
- 或 **LangSmith / Langfuse**（Agent 专用可视化）；
- 采样策略：错误与慢请求全量，正常请求按比例采样；
- **PII 脱敏**后再落盘。

**监控面板**：成功率、P50/P95 延迟、每任务成本、工具调用分布、错误分类。

**四、安全**

| 风险 | 措施 |
| --- | --- |
| 提示注入（工具返回恶意指令） | 工具输出与指令隔离（明确标记为数据）；输出过滤 |
| 越权操作 | 最小权限；敏感操作需人工确认 |
| 代码执行风险 | 沙箱（容器/虚拟机）、资源限额、网络隔离 |
| 数据泄露 | 脱敏、访问控制、审计日志 |
| 无限循环/成本失控 | 最大轮次、超时、token 预算硬上限 |

**五、成本控制**

1. **模型分级**：简单任务用小模型（Routing 分流）；
2. **Prompt 缓存**：长系统提示复用；
3. **上下文管理**：摘要压缩、只保留关键轮次；
4. **并发限流**：防止突发打爆配额；
5. **预算护栏**：单个任务/单用户/全局三级上限。

**六、评估**

**离线**：
- 自建评测集（覆盖真实业务场景，含边界与对抗样本）；
- 公开基准参考（GAIA 通用、SWE-bench 代码、τ-bench 工具交互）；
- 注意污染：用 Verified 子集。

**在线**：
- A/B 测试；
- 人工抽检（每周固定样本）；
- 用户反馈信号（点赞、改写的比例）。

**迭代**：
- 提示与工具定义版本化；
- 灰度发布 + 快速回滚；
- 建立失败案例库，定期复盘。

**七、上线检查清单**

- [ ] 所有工具都有 schema 校验与错误回传
- [ ] 有最大轮次/超时/预算硬限制
- [ ] trace 全链路可查，含 prompt 与工具调用
- [ ] 沙箱隔离，敏感操作需确认
- [ ] 成本看板与告警
- [ ] 离线评测集通过基线
- [ ] 灰度与回滚机制就绪

**核心认知**：Agent 落地是**工程问题**，不是模型问题。
把上面这些做扎实，比换更强的模型收益更大。`,
        rubric: [
          { point: 'MCP 工具接入 + ACI 设计 + 安全隔离', score: 2 },
          { point: '框架选型：先不用，需要时按场景选，且要读懂底层', score: 2 },
          { point: '可观测性：trace/span/attributes + 必记内容 + 采样 + 脱敏', score: 2 },
          { point: '安全：注入防护、最小权限、沙箱、成本失控', score: 2 },
          { point: '评估：离线自建集 + 公开基准 + 在线 A/B + 人工抽检', score: 2 },
        ],
        keywords: ['MCP', 'ACI', 'LangGraph', 'trace', '沙箱', '预算护栏'],
        explanation:
          '这是 Agent 工程化的综合题。能给出七部分完整清单，说明理解了"90% 的工作在工程"这句话的分量。',
        tags: ['工程落地', '综合'],
      },
    ],
  },
];
