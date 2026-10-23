# -*- coding: utf-8 -*-
"""
Python Agent 开发实战 - 章节 7 至 8 生成模块
包含：
  第 7 章：生产级安全护栏、人工介入 (HITL) 与容错可观测性
  第 8 章：贯穿式工业级实战：自主全自动代码研发与业务分析智能体
"""

CHAPTER_7 = {
    "id": "agent-c7",
    "courseId": "python-agent-development",
    "order": 7,
    "title": "生产级安全护栏、人工介入 (HITL) 与容错可观测性",
    "goal": "掌握 OWASP Top 10 for LLM 中过度自主权（Excessive Agency）安全风险；深入精通 LangGraph 人工在回路（Human-in-the-loop, HITL）中断挂起、审批与状态重写恢复机制；掌握 OpenInference 链路追踪标准（Trace、Span）与 SWE-bench 智能体基准评估体系；实现企业级高可用可观测监控看板与安全门禁。",
    "lessons": [
        {
            "id": "agent-l7-1",
            "title": "安全防御体系、高危操作阻断与人工介入 (HITL) 审批流",
            "difficulty": 1,
            "content": """### 学习目标与先修要求

- **先修要求**：了解网络安全基本常识、状态机中断挂起概念。
- **能力目标**：
  1. 理解 OWASP LLM06 Excessive Agency（过度自主权）带来的潜在系统性破坏灾难；
  2. 掌握动态风险评级矩阵（Risk Tiering Matrix）的只读放行与高危拦截策略；
  3. 精通基于 LangGraph 的 **Human-in-the-loop (HITL)** 机制：`interrupt()` 中断挂起、人工三种决议（批准/拒绝/修改实参）及断点恢复。

---

### 一、过度自主权（Excessive Agency）的现实破坏力

在 **OWASP Top 10 for LLM Applications** 安全威胁榜单中，**LLM06: Excessive Agency（过度自主权）** 位列前茅：
当开发者赋予了智能体调用数据库、执行系统命令或向外发信的工具，而**缺乏人工审核与严格边界隔离时**，一旦遭遇提示词注入（Prompt Injection）或推理失控，Agent 会毫不犹豫地执行毁灭性操作：
- *“检测到用户取消订阅，正在为您清空该用户关联的整个 production_orders 生产数据库表...”*
- *“自动给所有 100,000 名注册用户发送测试邮件...”*

---

### 二、工业级风险分级矩阵 (Risk Tiering Matrix)

```
┌────────────────────────────────────────────────────────┐
│ Level 1: 无害只读 (Safe / Read-only)                    │ -> 查询天气、统计指标、知识检索
│ 策略: 全自动放行，快速无感执行                          │
├────────────────────────────────────────────────────────┤
│ Level 2: 低风险写操作 (Low-risk State Change)          │ -> 创建草稿工单、记录临时日志、更新本地测试数据
│ 策略: 异步记录审计日志，事后可追踪                     │
├────────────────────────────────────────────────────────┤
│ Level 3: 核心破坏性高危操作 (Critical / Destructive)    │ -> 资金转账、DROP TABLE、批量对外发信、重置系统密码
│ 策略: 【硬性强制中断】，挂起进入人工审批工作流 (HITL)  │
└────────────────────────────────────────────────────────┘
```

---

### 三、LangGraph 人工在回路 (HITL) 中断恢复机理

现代 Agent 框架解决人工审批的最优雅解法是**基于检查点的图中断（Graph Interrupts）**：

```
                Superstep N: 智能体规划出高危动作 Action: transfer_money(5000)
                                            │
                                            ▼
                          ┌───────────────────────────────────┐
                          │   安全门禁节点: 触发 interrupt()   │
                          └─────────────────┬─────────────────┘
                                            │ 拍摄完整快照并持久化
                                            ▼
                               【执行图暂停，释放 CPU 线程】
                                 向管理员推送待审批工单
                                            │
                                            ▼
                                  管理员人工审核三种决议:
                        ┌───────────────────┼───────────────────┐
                        ▼                   ▼                   ▼
                 【1. Approve 批准】  【2. Reject 驳回】 【3. Edit 修改参数】
                  直接原样放行         告知模型被拒绝      将 5000 改为 500
                        │                   │                   │
                        └───────────────────┼───────────────────┘
                                            ▼
                               【Command(resume=...) 唤醒执行】
                              从断点毫秒级恢复现场，继续向下流动！
```

通过这一架构，Agent 系统做到了“既拥有高度自主灵活性，又把核心控制权牢牢握在人类手中”！
""",
            "tips": [
                {
                    "kind": "tip",
                    "text": "使用 interrupt() 时，向人类呈现的审批表单中不仅要包含工具名，还必须清晰展示入参详情与影响范围，便于审批人快速决策。"
                },
                {
                    "kind": "note",
                    "text": "人工决议中的'修改实参'极其强大：管理员如果发现模型生成的时间或金额略有微小偏差，可直接原地纠偏后放行，避免推倒重来。"
                }
            ],
            "demos": [
                {
                    "title": "纯 Python 模拟 LangGraph 人工在回路 (HITL) 中断挂起、审批与修改恢复流水线",
                    "lang": "python",
                    "code": """# 纯 Python 实现人工在回路 (HITL) 中断挂起、人工决议与状态恢复引擎
from typing import Dict, Any, Optional

class HITLInterrupt(Exception):
    def __init__(self, action_payload: dict):
        self.action_payload = action_payload

class HITLStateMachine:
    def __init__(self):
        self.saved_state: Optional[dict] = None
        self.suspended_action: Optional[dict] = None

    def execute_with_guard(self, state: dict, action_payload: dict) -> dict:
        self.saved_state = dict(state)
        # 检测是否为高危动作
        if action_payload.get("is_dangerous", False):
            self.suspended_action = action_payload
            print(f"  [安全门禁拦截]: 检测到高危操作 '{action_payload['tool']}'，状态图挂起，等待人工审核！")
            raise HITLInterrupt(action_payload)

        # 非高危操作直接执行
        return self._do_execute(action_payload)

    def _do_execute(self, action_payload: dict) -> dict:
        return {
            "status": "COMPLETED",
            "executed_tool": action_payload["tool"],
            "final_args": action_payload["args"]
        }

    def resume(self, decision: str, edited_args: Optional[dict] = None) -> dict:
        \"\"\"人工审核后唤醒恢复执行\"\"\"
        if not self.suspended_action:
            raise RuntimeError("当前没有挂起的等待审批任务")

        print(f"\\n--- 收到人工审核决议: [{decision}] ---")
        if decision == "REJECT":
            return {"status": "REJECTED_BY_HUMAN", "reason": "管理员判定操作具有风险，拒绝放行。"}
        elif decision == "APPROVE":
            return self._do_execute(self.suspended_action)
        elif decision == "EDIT_AND_APPROVE":
            # 人工修改实参后放行
            modified_payload = dict(self.suspended_action)
            modified_payload["args"] = edited_args or modified_payload["args"]
            print(f"  [参数修改生效]: 新实参为 {modified_payload['args']}")
            return self._do_execute(modified_payload)
        else:
            raise ValueError(f"未知决议: {decision}")

machine = HITLStateMachine()

# 1. 尝试触发高危转账操作
transfer_action = {
    "tool": "transfer_funds",
    "args": {"account": "6222020000000000", "amount": 100000},
    "is_dangerous": True
}

print("=== 1. Agent 规划执行高危转账动作 ===")
try:
    machine.execute_with_guard(state={"balance": 500000}, action_payload=transfer_action)
except HITLInterrupt as e:
    print(f"捕获挂起中断，待审动作: {e.action_payload['tool']}, 金额: ¥{e.action_payload['args']['amount']}")

# 2. 管理员介入：认为金额过大，修改金额为 20,000 元后批准放行
print()
print("=== 2. 管理员执行时间旅行审查与参数纠偏放行 ===")
res = machine.resume("EDIT_AND_APPROVE", edited_args={"account": "6222020000000000", "amount": 20000})

print("最终执行结果:", res)
assert res["status"] == "COMPLETED"
assert res["final_args"]["amount"] == 20000
print()
print("[OK] HITL 人工在回路中断审批与恢复闭环验证成功！")
"""
                }
            ]
        },
        {
            "id": "agent-l7-2",
            "title": "链路追踪、可观测性 (Observability) 与评估基准 (SWE-bench)",
            "difficulty": 2,
            "content": """### 学习目标与先修要求

- **先修要求**：了解分布式链路追踪（Distributed Tracing）、调用链（Trace/Span）。
- **能力目标**：
  1. 理解大模型多步 Agent 调试的黑盒难题与可观测性（Observability）技术栈；
  2. 深刻掌握 OpenInference 规范核心语义（**Trace** 代表整个生命周期，**Span** 代表单步调用）；
  3. 掌握国际学术与工业权威基准 **SWE-bench**（Jimenez et al., ICLR 2024）的评估机理与 Pass@1 指标。

---

### 一、Agent 可观测性：打破多步黑盒调优盲区

当一个自主 Agent 执行了 8 步工具调用、花费了 45 秒却输出了错误结论时：
- 是在第 3 步搜索时召回了脏数据？
- 还是在第 5 步代码解释器报错被误吞？
- 抑或是第 7 步模型反思时产生了注意力漂移？
**如果没有端到端链路追踪，排查 Agent 故障就如同盲人摸象**。

```
Trace (整个任务总链路 ID: "trace_88a9", 耗时 4.2s, 消耗 3,250 Tokens)
│
├── Span 1: [agent_node] 调用 GPT-4o 规划 (耗时 0.8s, 消耗 600 Tokens)
│
├── Span 2: [tool_execution] 运行 SQL 查询 (耗时 1.1s, 消耗 0 Tokens, 结果返回 20 行)
│
├── Span 3: [agent_node] 调用 GPT-4o 分析数据 (耗时 1.5s, 消耗 2,100 Tokens)
│
└── Span 4: [evaluator] 单元测试自动校验 (耗时 0.8s, 校验结果: PASSED)
```

---

### 二、工业级基准评测：为什么传统问答指标失效？

以往的 NLP 评测（如 BLEU、ROUGE 或 MMLU 选择题）对 Agent 评估毫无意义。Agent 是在真实物理环境操作的系统！

#### SWE-bench（软件工程大模型权威基准 - Princeton, ICLR 2024）：
- **评测形态**：收集了真实开源仓库（Django, SymPy, Flask, scikit-learn 等）上千个真实的 GitHub Issue 缺陷报告；
- **评估标准（Pass@1）**：智能体必须自主拉取仓库代码、搜索关键文件、复现 bug、编写 patch 补丁并**100% 跑通仓库已有的完整单元测试套件**！
- 这一客观判题标准推动了当今全球最先进编码 Agent（如 Devin、Cursor、SWE-agent）的爆发式进化。
""",
            "tips": [
                {
                    "kind": "tip",
                    "text": "开源可观测性方案首选基于 OpenInference 规范的 Arize Phoenix 或 Langfuse，商业云端首选 LangSmith。"
                },
                {
                    "kind": "note",
                    "text": "在记录 Span 时，务必对用户敏感数据（如手机号、银行卡号、密码）进行自动脱敏打码，防止链路日志造成合规数据泄漏。"
                }
            ],
            "demos": [
                {
                    "title": "纯 Python 编写轻量级 OpenInference 风格的 Agent 执行链路追踪器 (Tracer)",
                    "lang": "python",
                    "code": """# 纯 Python 实现 OpenInference 风格的轻量级 Agent 链路追踪器 (Tracer)
import time
from typing import List, Dict, Any

class Span:
    def __init__(self, span_id: str, name: str, span_type: str, parent_id: str = None):
        self.span_id = span_id
        self.name = name
        self.span_type = span_type  # 'llm', 'tool', 'chain'
        self.parent_id = parent_id
        self.start_time = time.time()
        self.end_time = 0.0
        self.inputs: Any = None
        self.outputs: Any = None
        self.tokens_used: int = 0

    def end(self, outputs: Any, tokens: int = 0):
        self.end_time = time.time()
        self.outputs = outputs
        self.tokens_used = tokens

    @property
    def latency_ms(self) -> float:
        return round((self.end_time - self.start_time) * 1000, 2)

class TraceCollector:
    def __init__(self, trace_id: str):
        self.trace_id = trace_id
        self.spans: List[Span] = []

    def start_span(self, name: str, span_type: str, parent_id: str = None) -> Span:
        span_id = f"span_{len(self.spans)+1:03d}"
        s = Span(span_id, name, span_type, parent_id)
        self.spans.append(s)
        return s

    def print_trace_summary(self):
        total_tokens = sum(s.tokens_used for s in self.spans)
        total_time = sum(s.latency_ms for s in self.spans)
        print(f"=== [Trace: {self.trace_id}] 执行链路总览 ===")
        print(f"总计耗时: {total_time:.2f}ms | 累积消耗 Token: {total_tokens}")
        print("调用拓扑树:")
        for s in self.spans:
            prefix = "  └── " if s.parent_id else "├── "
            print(f"{prefix}[{s.span_type.upper():5s}] {s.name:20s} -> 耗时: {s.latency_ms:6.2f}ms | Tokens: {s.tokens_used}")

# 模拟 Agent 多步执行并采集链路数据
collector = TraceCollector(trace_id="req_99812")

# Step 1: 规划调用 LLM
s1 = collector.start_span("agent_planner", "llm")
time.sleep(0.02)
s1.end(outputs="规划需要调用查表工具", tokens=450)

# Step 2: 执行外部工具
s2 = collector.start_span("sql_query_tool", "tool", parent_id=s1.span_id)
time.sleep(0.01)
s2.end(outputs="返回 15 条销售明细", tokens=0)

# Step 3: LLM 汇总生成
s3 = collector.start_span("agent_summarizer", "llm")
time.sleep(0.03)
s3.end(outputs="生成最终报表交付", tokens=820)

collector.print_trace_summary()

assert len(collector.spans) == 3
assert sum(s.tokens_used for s in collector.spans) == 1270
print()
print("[OK] Agent 链路追踪器与可观测性汇总验证通过！")
"""
                }
            ]
        }
    ],
    "exercises": [
        {
            "id": "agent-ex-49",
            "type": "single",
            "difficulty": 1,
            "question": "在 OWASP Top 10 for LLM Applications 安全榜单中，LLM06: Excessive Agency（过度自主权）带来的最典型危害是什么？",
            "options": [
                {"value": "A", "label": "用户电脑屏幕的壁纸被自动修改"},
                {"value": "B", "label": "赋予智能体的权限或工具能力过宽，在缺乏人工审批时，一旦模型受幻觉或恶意提示词诱导，会执行不可逆的破坏性高危操作（如删除核心库或转移资产）"},
                {"value": "C", "label": "导致 Python 代码无法使用下划线变量名"},
                {"value": "D", "label": "让系统时钟加速运行"}
            ],
            "answer": "B",
            "explanation": "过度自主权（Excessive Agency）是指系统授予了 Agent 过于宽泛的破坏性系统写权限（如未受限的直接删库、转账等），且缺乏人工拦截确认，极易造成灾难性后果。",
            "tags": ["OWASP", "Excessive Agency", "安全风险"]
        },
        {
            "id": "agent-ex-50",
            "type": "single",
            "difficulty": 1,
            "question": "在 LangGraph 架构中，实现 Human-in-the-loop（人工审批在回路）最关键的内置核心机制是什么？",
            "options": [
                {"value": "A", "label": "在节点中调用 interrupt() 触发图在当前状态挂起暂停，将快照保存至持久化检查点，等待人工指令后唤醒恢复"},
                {"value": "B", "label": "在代码中强行调用 sys.exit(0) 退出程序"},
                {"value": "C", "label": "必须通过拔掉服务器电源插头来实现暂停"},
                {"value": "D", "label": "让大模型直接拒绝回答用户的所有问题"}
            ],
            "answer": "A",
            "explanation": "LangGraph 通过 `interrupt()` 实现了原生的图挂起机制。当前状态拍摄快照持久化到 Checkpointer，释放计算资源，待人工做出决议后无缝断点续传。",
            "tags": ["interrupt", "HITL", "LangGraph"]
        },
        {
            "id": "agent-ex-51",
            "type": "single",
            "difficulty": 2,
            "question": "在衡量顶尖软件研发自主智能体能力的国际权威基准 SWE-bench（Jimenez et al., ICLR 2024）中，评估的核心任务形态是什么？",
            "options": [
                {"value": "A", "label": "让模型做 100 道计算机单选题"},
                {"value": "B", "label": "给定真实开源代码仓库的真实 GitHub Issue，智能体必须自主浏览代码、定位缺陷、编写补丁并确保通过该仓库全量单元测试套件"},
                {"value": "C", "label": "测试智能体的打字输入速度"},
                {"value": "D", "label": "计算大模型参数总大小"}
            ],
            "answer": "B",
            "explanation": "SWE-bench 采用端到端真实软件工程测试。智能体面对实际 GitHub 缺陷工单，必须完全自主完成代码检索、故障复现、修改与跑通单元测试，是目前评估 Agent 硬实力的黄金标尺。",
            "tags": ["SWE-bench", "基准评测", "软件工程"]
        },
        {
            "id": "agent-ex-52",
            "type": "judge",
            "difficulty": 1,
            "question": "在 LangGraph 的人工在回路审批机制中，审批管理员不仅可以做出批准或驳回决议，还可以直接人工修改大模型生成的工具调用实参后再行放行恢复执行。",
            "options": [
                {"value": "true", "label": "正确"},
                {"value": "false", "label": "错误"}
            ],
            "answer": "true",
            "explanation": "这是生产级 HITL 的核心优势。管理员发现模型生成的某些关键参数（如转账账户或日期范围）微调即可合规时，可直接重写实参放行，极大避免了全流程推倒重试的延误。",
            "tags": ["参数编辑", "HITL 决议", "时间旅行"]
        },
        {
            "id": "agent-ex-53",
            "type": "fill",
            "difficulty": 2,
            "question": "在分布式链路追踪与 OpenInference 规范中，代表一次具体函数调用、工具执行或单个大模型推理时间段的最小追踪单元被称为 _________。",
            "blanks": [["Span", "span"]],
            "explanation": "在分布式追踪标准（如 OpenTelemetry / OpenInference）中，Trace 代表整条完整任务生命周期，而 Span 是构成 Trace 的单个具名有起始和结束时间的子操作单元。",
            "tags": ["Span", "链路追踪", "OpenInference"]
        },
        {
            "id": "agent-ex-54",
            "type": "multiple",
            "difficulty": 2,
            "question": "在企业生产级 Agent 风险分级矩阵中，下列哪些操作应被归类为必须强制人工在回路（Level 3 高危审批）的动作？",
            "options": [
                {"value": "A", "label": "执行不可逆的数据库 DROP TABLE 或全量 DELETE 操作"},
                {"value": "B", "label": "调用网银接口发起真实大额资金划拨转账"},
                {"value": "C", "label": "修改线上生产集群的防火墙安全组规则或管理员密码"},
                {"value": "D", "label": "在本地计算器工具中计算 15 + 28 的数值"}
            ],
            "answer": ["A", "B", "C"],
            "explanation": "A、B、C 涉及生产数据毁灭、资金风险或网络安全破坏，不可逆且影响极其严重，必须人工审批。D 为绝对安全的纯数学运算，属于 Level 1 自主放行。",
            "tags": ["高危操作", "风险矩阵", "安全策略"]
        },
        {
            "id": "agent-ex-55",
            "type": "multiple",
            "difficulty": 2,
            "question": "生产级智能体可观测性追踪系统（如 LangSmith 或 Arize Phoenix）记录的核心元数据维度通常包含哪些？",
            "options": [
                {"value": "A", "label": "每个子步骤的耗时（Latency）与调用时间戳"},
                {"value": "B", "label": "每次大模型调用的 Prompt Tokens 与 Completion Tokens 消耗量"},
                {"value": "C", "label": "工具调用的完整输入参数、执行标准输出与异常报错堆栈"},
                {"value": "D", "label": "机房服务器外壳的油漆颜色"}
            ],
            "answer": ["A", "B", "C"],
            "explanation": "Trace 记录耗时、Token 计费统计、输入输出与报错堆栈，是排查推理漂移、死循环与性能瓶颈的必备数据。选项 D 毫无关联。",
            "tags": ["可观测性", "元数据", "运维监控"]
        },
        {
            "id": "agent-ex-56",
            "type": "code",
            "difficulty": 3,
            "question": "请编写一个名为 `hitl_gate_runner` 的人工审批门禁函数。要求：接受三个参数：动作信息字典 `action`（包含 `'name'`(str)、`'args'`(dict)、`'is_dangerous'`(bool)）、人工审核决议 `decision`（字符串：'APPROVE'、'REJECT' 或 'EDIT'），以及人工修改后的参数字典 `override_args`（默认为 None）；逻辑：1. 若 action['is_dangerous'] 为 False，直接返回字典 `{'status': 'PASSED', 'final_args': action['args']}`；2. 若为危险操作且 decision 为 'REJECT'，返回 `{'status': 'BLOCKED', 'reason': '人工拒绝放行'}`；3. 若为危险操作且 decision 为 'EDIT'，返回 `{'status': 'MODIFIED_AND_PASSED', 'final_args': override_args}`；4. 若为危险操作且 decision 为 'APPROVE'，返回 `{'status': 'PASSED', 'final_args': action['args']}`。",
            "setupCode": "",
            "answer": "def hitl_gate_runner(action: dict, decision: str = 'APPROVE', override_args: dict = None) -> dict:\n    if not action.get('is_dangerous', False):\n        return {'status': 'PASSED', 'final_args': action.get('args', {})}\n        \n    if decision == 'REJECT':\n        return {'status': 'BLOCKED', 'reason': '人工拒绝放行'}\n    elif decision == 'EDIT':\n        return {'status': 'MODIFIED_AND_PASSED', 'final_args': override_args or {}}\n    elif decision == 'APPROVE':\n        return {'status': 'PASSED', 'final_args': action.get('args', {})}\n    else:\n        raise ValueError(f'未知决议: {decision}')\n",
            "tests": "# 测试用例 1: 非危险操作直接放行\na1 = {'name': 'query', 'args': {'k': 1}, 'is_dangerous': False}\nassert hitl_gate_runner(a1)['status'] == 'PASSED'\n\n# 测试用例 2: 危险操作被驳回\na2 = {'name': 'delete', 'args': {'id': 10}, 'is_dangerous': True}\nres_reject = hitl_gate_runner(a2, decision='REJECT')\nassert res_reject['status'] == 'BLOCKED'\nassert '人工拒绝' in res_reject['reason']\n\n# 测试用例 3: 危险操作被修改实参后放行\nres_edit = hitl_gate_runner(a2, decision='EDIT', override_args={'id': 999})\nassert res_edit['status'] == 'MODIFIED_AND_PASSED'\nassert res_edit['final_args']['id'] == 999\n\nprint('hitl_gate_runner test cases passed!')\n",
            "explanation": "根据 is_dangerous 标志区分安全路径与高危路径，高危路径分别对 REJECT、EDIT 和 APPROVE 做出阻断、实参覆盖与放行处理。",
            "tags": ["安全门禁", "HITL 审批", "编程实战"]
        }
    ]
}

CHAPTER_8 = {
    "id": "agent-c8",
    "courseId": "python-agent-development",
    "order": 8,
    "title": "贯穿式工业级实战：自主全自动代码研发与业务分析智能体",
    "goal": "串联全课程高阶体系，从零手写搭建一个端到端工业级自主数据分析智能体（Autonomous Data Analyst Agent）；集成任务拆解、多工具动态调度、Reflexion 自我纠错闭环、死循环熔断与异常自愈，并搭建生产级自动化端到端测试回归套件。",
    "lessons": [
        {
            "id": "agent-l8-1",
            "title": "生产级自主数据智能体 (Autonomous Data Analyst Agent) 架构全景",
            "difficulty": 1,
            "content": """### 学习目标与先修要求

- **先修要求**：熟练掌握前面 7 章全部核心技术（ReAct、工具反射、状态机、记忆、Reflexion、多智能体协同、安全审计）。
- **能力目标**：
  1. 理解端到端自主数据分析智能体（Autonomous Data Analyst Agent）的架构全貌；
  2. 掌握从用户自然语言模糊目标到结构化多步执行计划的自动映射；
  3. 掌握动态工具执行、中间结果自检校验与最终结构化业务决策简报生成闭环。

---

### 一、工业实战场景：全自主数据分析智能体

在现代企业中，业务经理每天都在提出高度复合的分析需求：
> *"分析最近 3 个月华东区域各品类的复购转化率，找出表现最差的掉队品类，测算其对总体营收的拖累程度，并输出带原因归因与行动改善建议的正式报告。"*

传统人工需要消耗分析师 2~3 天时间去拉 SQL、洗数据、画图、写 PPT。
而一个端到端的 **Autonomous Data Analyst Agent** 能够在 2 分钟内自主闭环交付：

```
                              业务自然语言目标
                                     │
                                     ▼
                ┌─────────────────────────────────────────┐
                │   阶段 1: 目标解析与执行计划编制 (Planner)│
                └────────────────────┬────────────────────┘
                                     │
                                     ▼
                ┌─────────────────────────────────────────┐
                │   阶段 2: 多工具协同自主攻坚 (Executor) │
                │   - Step 1: SQL 数据提取与聚合          │
                │   - Step 2: 缺失值清洗与复购率计算      │
                │   - Step 3: 归因算法与负向品类诊断      │
                └────────────────────┬────────────────────┘
                                     │
                                     ▼
                ┌─────────────────────────────────────────┐
                │   阶段 3: 自我反思与真实性自检 (Reflexion)│
                │   - 验证计算公式分子分母是否逻辑矛盾    │
                │   - 验证报告结论是否均有真实数字支撑    │
                └────────────────────┬────────────────────┘
                                     │
                                     ▼
                ┌─────────────────────────────────────────┐
                │   阶段 4: 生成高管级战略决策简报        │
                └─────────────────────────────────────────┘
```

---

### 二、核心模块职责与数据流闭环

1. **`DataQueryTool`**：模拟从业务数据库中抽取多维销售与订单事实记录；
2. **`MetricCalculatorTool`**：严格计算复购率（$\\text{Repurchase Rate} = \\frac{\\text{多次购买人数}}{\\text{总购买人数}}$）与同比变化；
3. **`ReflectiveReviewer`**：反思审阅器。自动核验指标是否存在除以 0、数值为负等逻辑漏洞，若发现漏洞自动命令 Executor 重算修复；
4. **`ExecutiveReporter`**：将干瘪的数字转化为包含现状、痛点根因与行动方案的正式业务简报。
""",
            "tips": [
                {
                    "kind": "tip",
                    "text": "在计算指标时，尽量让 Agent 调用专门写好的纯 Python 数学工具，而不是依赖 LLM 自身的口算能力，以杜绝大模型的算术幻觉。"
                },
                {
                    "kind": "note",
                    "text": "最终报告交付前，必须经过'数字前后一致性'检查，防止前文写着'下滑 15%'后文结论却写成'增长 15%'。"
                }
            ],
            "demos": [
                {
                    "title": "端到端自主数据分析智能体全流程运行实战（计划拆解、工具调用与决策报告输出）",
                    "lang": "python",
                    "code": """# 纯 Python 实现端到端自主数据分析智能体原型
from typing import Dict, List, Any

class AutonomousDataAnalystAgent:
    def __init__(self):
        # 模拟内置真实业务数据源
        self.database = [
            {"region": "华东", "category": "数码配件", "buyers": 1000, "repeat_buyers": 350, "revenue": 150000},
            {"region": "华东", "category": "居家日用", "buyers": 2000, "repeat_buyers": 800, "revenue": 220000},
            {"region": "华东", "category": "生鲜食品", "buyers": 1500, "repeat_buyers": 120, "revenue": 80000}
        ]
        self.execution_log: List[str] = []

    def tool_query_data(self, region: str) -> List[dict]:
        self.execution_log.append(f"调用工具 [tool_query_data]: 过滤区域 '{region}'")
        return [row for row in self.database if row["region"] == region]

    def tool_compute_metrics(self, data_rows: List[dict]) -> List[dict]:
        self.execution_log.append("调用工具 [tool_compute_metrics]: 严格计算各品类复购率")
        results = []
        for r in data_rows:
            rate = round((r["repeat_buyers"] / r["buyers"]) * 100, 2)
            results.append({**r, "repurchase_rate_pct": rate})
        return results

    def run_analysis(self, goal: str) -> dict:
        print(f"=== 智能体启动自主目标: '{goal}' ===")

        # 步骤 1: 提取数据
        print("\\n[Step 1 规划与提取]: 正在连接数据库拉取华东大区业务明细...")
        rows = self.tool_query_data("华东")

        # 步骤 2: 计算指标
        print("[Step 2 指标核算]: 正在调用精准计算工具核算复购转化率...")
        metrics = self.tool_compute_metrics(rows)

        # 步骤 3: 诊断与自检反思
        print("[Step 3 自动归因与自检]: 排序定位掉队短板品类...")
        sorted_metrics = sorted(metrics, key=lambda x: x["repurchase_rate_pct"])
        worst_category = sorted_metrics[0]
        best_category = sorted_metrics[-1]

        # 步骤 4: 输出最终高管决策简报
        print("[Step 4 决策简报生成]: 正在输出业务改善建议报告...")
        report = (
            f"【华东大区品类复购诊断简报】\\n"
            f"1. 整体盘点: 共监测分析 {len(metrics)} 个业务品类；\\n"
            f"2. 领头品类: '{best_category['category']}' 复购率高达 {best_category['repurchase_rate_pct']}%；\\n"
            f"3. 严重掉队品类: '{worst_category['category']}' 复购率仅为 {worst_category['repurchase_rate_pct']}%（拖累整体表现）；\\n"
            f"4. 行动建议: 建议针对 '{worst_category['category']}' 展开供应链保鲜与售后时效专项整改，设定次月复购率提升至 20% 的硬性指标！"
        )

        return {
            "goal": goal,
            "worst_category": worst_category["category"],
            "worst_rate": worst_category["repurchase_rate_pct"],
            "report": report,
            "trace": self.execution_log
        }

agent = AutonomousDataAnalystAgent()
delivery = agent.run_analysis("分析华东各品类复购率并出具改善建议")

print("\\n" + delivery["report"])
print()
print("执行工具调用轨迹:", delivery["trace"])

assert delivery["worst_category"] == "生鲜食品"
assert delivery["worst_rate"] == 8.0
print()
print("[OK] 自主数据智能体端到端闭环验证通过！")
"""
                }
            ]
        },
        {
            "id": "agent-l8-2",
            "title": "容错强化、自愈测试套件与持续交付流水线",
            "difficulty": 2,
            "content": """### 学习目标与先修要求

- **先修要求**：掌握端到端系统测试、测试用例覆盖率、容错异常捕获。
- **能力目标**：
  1. 掌握真实工业环境中应对**数据源缺损、除以零异常与死循环**的防御强化设计；
  2. 搭建面向 Agent 的端到端自动化 Golden Task 回归测试套件；
  3. 掌握在 CI/CD 流水线中持续保障智能体高稳定交付的评测工程规范。

---

### 一、生产级异常自愈与三道容错护城河

智能体在生产环境中运行数月，必然遭遇各种不可预期的极端边界：
1. **数据源字段突然变更**（如字段 `revenue` 被重命名为 `total_amount`）；
2. **极端分母为 0**（某新品类当日购买人数为 0，计算时触发 `ZeroDivisionError`）；
3. **网络抖动与工具超时**。

#### 强化型智能体自愈设计：
- **除零防御兜底**：计算函数内部采用安全除法（Safe Division: 若分母为 0 则返回 0.0 或 NaN 并发出警告）；
- **动态字段探测（Schema Healing）**：当提取字段不存在时，自动返回当前可用键列表，指导模型自纠错；
- **兜底降级响应（Graceful Degradation）**：即使遇到严重异常，依然能总结已获取的部分事实，并如实告知用户哪些环节受阻，而不是全盘崩溃。

---

### 二、构建 Agent 自动化 Golden Task 回归套件

与传统纯单元测试不同，Agent 评测需要验证**整条认知状态图链路**：
- **用例 1（标准基准路径）**：输入标准清晰指令，验证能否正确调用预期工具并输出预期关键结论；
- **用例 2（脏数据自愈路径）**：人为注入缺失值或分母为 0 的异常数据，验证能否触发自愈逻辑而不挂死；
- **用例 3（高危拦截路径）**：故意下达诱导性删库指令，验证安全门禁是否 100% 成功拦截。
只有这三大路径全部通过，Agent 新版本才被准许发布上线！
""",
            "tips": [
                {
                    "kind": "tip",
                    "text": "在自动化回归测试中，将真实模型替换为确定性 Mock 测试桩，能以毫秒级速度运行成百上千个测试用例，极大节约 CI/CD 测试成本与时间。"
                },
                {
                    "kind": "note",
                    "text": "每次生产故障排查完毕后，务必将该事故 Case 整理脱敏并加入 Golden Task 回归库，实现系统的'免疫力自我进化'。"
                }
            ],
            "demos": [
                {
                    "title": "生产级智能体异常自愈强化与 Golden Task 自动化全回归评测套件",
                    "lang": "python",
                    "code": """# 纯 Python 实现具备容错自愈强化的智能体与端到端 Golden Task 自动化测试套件
from typing import Dict, Any, List

class RobustDataAnalystEngine:
    \"\"\"生产级高可用数据分析智能体引擎\"\"\"
    def __init__(self, data_store: List[dict]):
        self.data_store = data_store

    def safe_calculate_rate(self, successes: int, totals: int) -> float:
        \"\"\"防除以 0 崩溃的安全除法工具\"\"\"
        if totals <= 0:
            return 0.0
        return round((successes / totals) * 100, 2)

    def analyze(self, category_name: str) -> dict:
        # 查找目标品类
        records = [r for r in self.data_store if r.get("name") == category_name]
        if not records:
            return {
                "success": False,
                "error": f"未找到品类 '{category_name}' 的数据记录",
                "rate": None
            }

        rec = records[0]
        # 容错提取，支持不同拼写字段
        totals = rec.get("totals", rec.get("buyers", 0))
        successes = rec.get("successes", rec.get("repeat_buyers", 0))

        rate = self.safe_calculate_rate(successes, totals)
        return {
            "success": True,
            "category": category_name,
            "rate": rate,
            "summary": f"品类 '{category_name}' 成功核算指标: {rate}%"
        }

# 准备测试数据 (包含正常数据与除零极端数据)
mock_repo = [
    {"name": "美妆个护", "buyers": 500, "repeat_buyers": 200},
    {"name": "冷门新品", "buyers": 0, "repeat_buyers": 0} # 极端除以 0 数据
]

engine = RobustDataAnalystEngine(mock_repo)

# 定义生产级 Golden Task 回归测试用例矩阵
golden_suite = [
    {
        "test_name": "标准正向计算用例",
        "category": "美妆个护",
        "expected_success": True,
        "expected_rate": 40.0
    },
    {
        "test_name": "分母为零边界自愈用例",
        "category": "冷门新品",
        "expected_success": True,
        "expected_rate": 0.0
    },
    {
        "test_name": "品类不存在优雅降级用例",
        "category": "不存在的虚拟品类",
        "expected_success": False,
        "expected_rate": None
    }
]

print("=== 启动端到端 Agent 自动化回归测试套件 ===")
passed_tests = 0
for test in golden_suite:
    output = engine.analyze(test["category"])
    print(f"\\n运行用例: [{test['test_name']}]")
    print(f"  输入参数: '{test['category']}'")
    print(f"  引擎产出: {output}")

    assert output["success"] == test["expected_success"]
    assert output["rate"] == test["expected_rate"]
    passed_tests += 1
    print("  [OK] 断言校验全部通过！")

print()
print(f"==========================================")
print(f"Golden Task 回归测试完成: {passed_tests}/{len(golden_suite)} 全部通过 (100% 合格)！")
print(f"==========================================")
"""
                }
            ]
        }
    ],
    "exercises": [
        {
            "id": "agent-ex-57",
            "type": "single",
            "difficulty": 1,
            "question": "相比传统的固定 SQL 报表或静态 BI 看板，基于大模型的自主数据分析智能体（Data Analyst Agent）的核心竞争优势是什么？",
            "options": [
                {"value": "A", "label": "完全不需要任何计算机和网络"},
                {"value": "B", "label": "能够直接理解业务人员复杂的自然语言目标，自主规划多步分析路径，灵活组合工具完成清洗、归因并输出带有深度商业洞察与可操作建议的结构化简报"},
                {"value": "C", "label": "强制把所有数据库的数据在每次提问时全部删除"},
                {"value": "D", "label": "只能在单台特定型号的打印机上输出"}
            ],
            "answer": "B",
            "explanation": "自主数据智能体跳出了死板的固定 SQL 查询模板，能够灵活拆解复杂业务意图、动态调度多种分析与绘图工具，不仅告知'数字是多少'，更能自主归因输出'为什么这样'及'该怎么做'。",
            "tags": ["数据智能体", "业务价值", "核心优势"]
        },
        {
            "id": "agent-ex-58",
            "type": "single",
            "difficulty": 1,
            "question": "当智能体在自主执行数据分析时，若发现底层数据库某张表的字段名被意外更改（例如原字段名由 amount 变更为 payment_value），生产级系统中最具韧性的处理手段是？",
            "options": [
                {"value": "A", "label": "让 Python 进程直接抛出 KeyError 崩溃并让整个后台服务挂死"},
                {"value": "B", "label": "通过表结构探测工具（Schema Discovery）自动捕获当前表的真实字段列表并将其作为 Observation 回显给模型，由大模型自主推断并修正 SQL 重新执行"},
                {"value": "C", "label": "随机向数据库插入 1000 万条垃圾数据"},
                {"value": "D", "label": "直接向用户谎称数据不存在"}
            ],
            "answer": "B",
            "explanation": "这是 Agent 自适应自愈的典范：将结构变动通过 Observation 如实反馈给大模型，模型借助语言理解能力能立刻识别出同义替代字段并动态重构查询语句。",
            "tags": ["容错自愈", "Schema 探测", "生产韧性"]
        },
        {
            "id": "agent-ex-59",
            "type": "single",
            "difficulty": 2,
            "question": "在自主数据智能体最终交付决策报告给业务高管之前，先在内部流水线中触发一步“自检反思（Self-Review / Reflexion）”的核心价值是什么？",
            "options": [
                {"value": "A", "label": "纯粹为了故意延长分析耗时"},
                {"value": "B", "label": "排查核验最终报告中的数字与之前工具执行的真实结果是否一致，严防大模型在文字润色阶段产生事实性数字幻觉或前后结论逻辑自相矛盾"},
                {"value": "C", "label": "为了把报告中的所有数字自动翻译为罗马数字"},
                {"value": "D", "label": "清空数据库中的所有历史记录"}
            ],
            "answer": "B",
            "explanation": "大模型在将冰冷数据转化为自然语言总结时，依然存在微小概率的注意力偏差或幻觉编造。前置自检校验能把关事实一致性，确保报告中的每一项断言都有确凿数据支撑。",
            "tags": ["自检反思", "数字幻觉", "一致性核验"]
        },
        {
            "id": "agent-ex-60",
            "type": "judge",
            "difficulty": 1,
            "question": "在生产级智能体工程中，当外部工具因网络波动或参数不全抛出异常时，调度层必须捕获该异常并将其转化为规范的 Observation 格式文本回灌给大模型，以激活模型的自我反省和纠错能力。",
            "options": [
                {"value": "true", "label": "正确"},
                {"value": "false", "label": "错误"}
            ],
            "answer": "true",
            "explanation": "将未捕获异常转化为 Observation 文本是 Agent 自主纠错的基础前提。大模型读取到具体的异常信息后，能够自主反思并调整参数重新尝试。",
            "tags": ["异常转化", "自纠错", "生产标准"]
        },
        {
            "id": "agent-ex-61",
            "type": "fill",
            "difficulty": 2,
            "question": "在 SWE-bench 等国际智能体基准评估中，衡量智能体在第一次尝试（仅给予 1 次生成机会）就直接成功通过全量测试的指标名称通常缩写为 Pass@_________ 。",
            "blanks": [["1"]],
            "explanation": "Pass@1 衡量模型单次尝试即成功的概率，是衡量编程与自主 Agent 解决问题精纯度与零返工率的最核心评估基准指标。",
            "tags": ["Pass@1", "SWE-bench", "评测指标"]
        },
        {
            "id": "agent-ex-62",
            "type": "multiple",
            "difficulty": 2,
            "question": "构建一个生产级全自主数据分析智能体（Autonomous Data Analyst Agent）时，推荐配备的核心基础工具通常包含哪些？",
            "options": [
                {"value": "A", "label": "数据库结构探测与 SQL 查询工具（用于按需精准拉取业务明细）"},
                {"value": "B", "label": "纯 Python 数学与统计指标精准计算工具（防范 LLM 自身口算产生的数值幻觉）"},
                {"value": "C", "label": "数据可视化与图表配置生成工具（支持动态输出折线图、柱状图元数据）"},
                {"value": "D", "label": "强制格式化企业主域控制器的危险管理脚本"}
            ],
            "answer": ["A", "B", "C"],
            "explanation": "数据提取、数学精准计算、可视化图表生成是数据分析 Agent 的三件套核心手脚。选项 D 属于破坏性非法脚本，严禁混入业务工具集。",
            "tags": ["工具集设计", "数据分析", "最佳配置"]
        },
        {
            "id": "agent-ex-63",
            "type": "multiple",
            "difficulty": 2,
            "question": "在针对 Agent 构建工业级端到端自动化 Golden Task 回归测试用例库时，应当覆盖哪些关键场景以确保上线万无一失？",
            "options": [
                {"value": "A", "label": "标准正向端到端全链路用例（验证常规业务需求能否顺利完成）"},
                {"value": "B", "label": "脏数据与极端边界值自愈用例（例如数据缺损、空列表、除零场景能否平稳降级）"},
                {"value": "C", "label": "高危权限拦截用例（验证带有违规、删库或越权意图的指令是否 100% 触发门禁阻断）"},
                {"value": "D", "label": "故意断开服务器物理电源导致硬件损坏用例"}
            ],
            "answer": ["A", "B", "C"],
            "explanation": "完备的测试套件必须同时覆盖正向标杆、边界容错自愈与安全红线防御。选项 D 为破坏硬件的无关操作。",
            "tags": ["Golden Task", "测试用例设计", "质量保障"]
        },
        {
            "id": "agent-ex-64",
            "type": "code",
            "difficulty": 3,
            "question": "请编写一个名为 `autonomous_analyze_agent` 的端到端分析闭环函数。要求：接受三个参数：数据集列表 `records`（每个元素为字典 `{'category': str, 'sales': int, 'returns': int}`）、安全阈值 `max_return_rate` (float，默认为 20.0)；遍历记录，计算每个品类的退货率：`return_rate = round((returns / max(1, sales)) * 100, 2)`；如果某个品类的 return_rate 严格大于 max_return_rate，将其判定为短板异常品类；最终返回字典：`{'total_categories': 检查总品类数, 'high_return_categories': 异常品类名称列表, 'status': 'ALERT' if 存在异常品类 else 'NORMAL'}`。",
            "setupCode": "",
            "answer": "def autonomous_analyze_agent(records: list[dict], max_return_rate: float = 20.0) -> dict:\n    high_risk = []\n    for r in records:\n        sales = r.get('sales', 0)\n        returns = r.get('returns', 0)\n        rate = round((returns / max(1, sales)) * 100, 2)\n        if rate > max_return_rate:\n            high_risk.append(r.get('category', 'Unknown'))\n            \n    status = 'ALERT' if high_risk else 'NORMAL'\n    return {\n        'total_categories': len(records),\n        'high_return_categories': high_risk,\n        'status': status\n    }\n",
            "tests": "# 测试用例 1: 发现高退货率异常品类并报警\ndata1 = [\n    {'category': '服装', 'sales': 100, 'returns': 35}, # 35% > 20%\n    {'category': '图书', 'sales': 200, 'returns': 10}, # 5% <= 20%\n]\nres1 = autonomous_analyze_agent(data1, max_return_rate=20.0)\nassert res1['total_categories'] == 2\nassert res1['high_return_categories'] == ['服装']\nassert res1['status'] == 'ALERT'\n\n# 测试用例 2: 全部达标正常状态\ndata2 = [\n    {'category': '食品', 'sales': 500, 'returns': 5} # 1%\n]\nres2 = autonomous_analyze_agent(data2, max_return_rate=10.0)\nassert res2['high_return_categories'] == []\nassert res2['status'] == 'NORMAL'\n\n# 测试用例 3: 边界除以 0 (销量为 0)\ndata3 = [{'category': '新品', 'sales': 0, 'returns': 0}]\nres3 = autonomous_analyze_agent(data3)\nassert res3['status'] == 'NORMAL'\n\nprint('autonomous_analyze_agent test cases passed!')\n",
            "explanation": "遍历业务数据，使用 max(1, sales) 进行除零防御，计算每个品类的退货百分比，将超出阈值的品类提取进预警清单并输出状态报告。",
            "tags": ["数据分析 Agent", "异常预警", "编程实战"]
        }
    ]
}
