# -*- coding: utf-8 -*-
"""
Python Agent 开发实战 - 章节 4 至 6 生成模块
包含：
  第 4 章：记忆系统与认知状态管理
  第 5 章：进阶设计模式：反思、自纠错与自适应规划
  第 6 章：多智能体协同网络 (Multi-Agent Systems & CrewAI Architecture)
"""

CHAPTER_4 = {
    "id": "agent-c4",
    "courseId": "python-agent-development",
    "order": 4,
    "title": "记忆系统与认知状态管理",
    "goal": "深入理解人类认知科学在 Agent 记忆系统中的映射；掌握短期工作记忆（Scratchpad）与上下文滑动预算控制；精通长期情景记忆（Episodic）与语义事实记忆（Semantic）架构；掌握基于时效性衰减、重要性与语义相关性的三维记忆检索算法与工程实现。",
    "lessons": [
        {
            "id": "agent-l4-1",
            "title": "认知模型映射与短期工作记忆 (Working Memory / Scratchpad)",
            "difficulty": 1,
            "content": """### 学习目标与先修要求

- **先修要求**：了解大模型上下文窗口机制、Token 消耗统计、列表与字典数据结构。
- **能力目标**：
  1. 理解认知心理学工作记忆（Working Memory）与长期记忆在智能体系统中的工程落地映射；
  2. 掌握短期工作记忆草稿纸（Scratchpad）在单次复杂任务中的动态组装机制；
  3. 掌握长步骤任务中防止上下文溢出的**动态滚动摘要记忆（Summary Buffer）**算法。

---

### 一、认知科学在 Agent 记忆系统中的映射

在人类认知系统中，记忆并非单一的存储硬盘，而是分工严密的多层网络：
- **感觉记忆（Sensory Memory）**：极短瞬时感知（如一次 HTTP 请求的原始字节流）；
- **工作记忆（Working Memory / 短期记忆）**：当前正在进行的思维任务所占据的活动注意力空间，容量有限（人类通常为 7±2 个信息块，Agent 则受限于当前 LLM 上下文窗口）；
- **长期记忆（Long-term Memory）**：经由强化存储沉淀的知识与经验，容量几乎无限，需要通过联想索引提取。

```
                    外部任务输入 (Task Prompt)
                               │
                               ▼
        ┌──────────────────────────────────────────────┐
        │  短期工作记忆 (Scratchpad / Working Memory)   │
        │  - 当前执行计划 (Active Plan)                 │
        │  - 正在尝试的子步骤 (Current Step)            │
        │  - 最近几次工具调用的原始回包 (Observations)   │
        └──────────────────────┬───────────────────────┘
                               │ 超出 Token 预算
                               ▼
        ┌──────────────────────────────────────────────┐
        │  长文本记忆压缩中枢 (Memory Compressor)       │
        │  调用轻量小模型提炼核心事实，浓缩为精炼摘要     │
        └──────────────────────┬───────────────────────┘
                               │ 沉淀归档
                               ▼
        ┌──────────────────────────────────────────────┐
        │  外部持久化长期记忆 (Long-Term Vector Store)  │
        │  - 情景经验库 (Episodic: 类似任务的成功轨迹)  │
        │  - 用户画像库 (Semantic: 用户偏好与业务常识)  │
        └──────────────────────────────────────────────┘
```

---

### 二、短期工作记忆（Scratchpad）工程实现

在 Agent 解决一个需要 10 步工具调用的复杂任务时，**Scratchpad 就是大模型手边的“演算草稿纸”**：
- 每一轮迭代中，调度器自动组装：`用户原始目标 + 历史各步的 Thought/Action/Observation + 当前最新观察`；
- **滑动窗口与预算管理痛点**：若工具返回了超长数据（如查询数据库返回了 5000 行 JSON），Scratchpad 会在瞬间挤爆上下文窗口！
- **工业最佳实践（Observation 预截断）**：工具层返回数据必须经过“智能摘要拦截器”，只把与当前问题最相关的核心键值提取进工作记忆，原始大对象持久化到临时缓存。
""",
            "tips": [
                {
                    "kind": "tip",
                    "text": "对于输出体积庞大的工具（如抓取了整个网页 HTML 或拉取了超大日志文件），严禁原样贴进 Scratchpad，应在工具内部用抽取算法提取正文纯文本后再返回。"
                },
                {
                    "kind": "note",
                    "text": "工作记忆随着当前任务结束而重置，若要保留跨会话的用户习惯（如'下次查汇率默认换算为欧元'），必须将其写入长期记忆。"
                }
            ],
            "demos": [
                {
                    "title": "纯 Python 实现具备 Token 预算控制与智能折叠的 Scratchpad 工作记忆管理器",
                    "lang": "python",
                    "code": """# 纯 Python 实现具备字符预算控制与大观察结果智能折叠的 Scratchpad 工作记忆管理器
from typing import List, Dict

class WorkingMemoryScratchpad:
    def __init__(self, max_budget_chars: int = 400):
        self.max_budget_chars = max_budget_chars
        self.steps: List[Dict[str, str]] = []

    def add_step(self, thought: str, action: str, observation: str):
        # 如果单次工具返回内容过大，自动执行前置安全截断
        if len(observation) > 120:
            folded_obs = observation[:90] + f"...[已折叠 {len(observation)-90} 字符，原始数据已暂存]"
        else:
            folded_obs = observation

        self.steps.append({
            "thought": thought,
            "action": action,
            "observation": folded_obs
        })

    def render_context(self) -> str:
        \"\"\"在预算范围内自底向上保留最新的推导步骤\"\"\"
        rendered_parts = []
        accumulated_len = 0

        # 从最新一步往回挑选
        for s in reversed(self.steps):
            part = f"Thought: {s['thought']}\\nAction: {s['action']}\\nObservation: {s['observation']}\\n"
            if accumulated_len + len(part) <= self.max_budget_chars:
                rendered_parts.append(part)
                accumulated_len += len(part)
            else:
                rendered_parts.append("[更早步骤已归纳压缩...]\\n")
                break

        # 恢复正向时序
        rendered_parts.reverse()
        return "\\n".join(rendered_parts)

# 测试工作记忆管理
scratchpad = WorkingMemoryScratchpad(max_budget_chars=350)

# 写入常规步骤
scratchpad.add_step("分析用户提问", "search_doc", "找到企业退税政策第一条")

# 写入超大回包步骤 (触发折叠)
huge_db_output = "用户账单明细: " + "item_record_id_99876231," * 30
scratchpad.add_step("检索用户账单", "query_db", huge_db_output)

# 写入最新决策步骤
scratchpad.add_step("计算退税金额", "calc", "退税金额为 ¥1,250.00")

rendered = scratchpad.render_context()
print("=== Scratchpad 渲染后的有效工作记忆上下文 ===")
print(rendered)

assert "已折叠" in rendered
assert "退税金额为 ¥1,250.00" in rendered
print()
print("[OK] 工作记忆预算控制与折叠机制测试通过！")
"""
                }
            ]
        },
        {
            "id": "agent-l4-2",
            "title": "长期情景记忆 (Episodic) 与语义事实记忆 (Semantic) 架构",
            "difficulty": 2,
            "content": """### 学习目标与先修要求

- **先修要求**：了解向量嵌入（Embeddings）、余弦相似度、时间衰减函数。
- **能力目标**：
  1. 理解长期情景记忆（Episodic Memory）与语义事实记忆（Semantic Memory）的分工与价值；
  2. 深刻掌握 Stanford 著名论文《Generative Agents》（Park et al., 2023）的三维记忆检索综合评分公式；
  3. 掌握纯 Python 实现具备**时效性衰减（Recency）、重要性（Importance）与语义相似度（Relevance）**的三维记忆评分与检索系统。

---

### 一、情景记忆与语义记忆的架构分工

1. **长期情景记忆（Episodic Memory / 经验轨迹）**：
   - 记录 Agent 在过去某个具体时刻解决某类任务的**完整剧情轨迹（Episode）**；
   - **价值**：当用户下达类似新指令时，Agent 能通过向量相似度从经验库召回当时成功的工具调用序列作为 Few-Shot 示例（经验借用与自我进化）；
2. **长期语义记忆（Semantic Memory / 事实知识库）**：
   - 提取跨越具体时间事件的抽象规则、常识与用户个性化画像（如“用户张总不喜欢看折线图，更喜欢表格列示”）。

---

### 二、Generative Agents 经典三维记忆打分公式

在斯坦福大学虚拟小镇论文（Park et al., 2023）中，作者提出了影响深远的综合记忆检索算法。当 Agent 需要从成千上万条历史记忆中检索最相关的上下文时，**绝不能只看向量相似度**，而必须综合评估三个维度：

$$\\text{Score}(m) = \\alpha \\cdot \\text{Recency}(m) + \\beta \\cdot \\text{Importance}(m) + \\gamma \\cdot \\text{Relevance}(m, q)$$

```
                                ┌────────────────────────────────────────┐
                                │     记忆综合得分计算 (Score = αR+βI+γS) │
                                └───────────────────┬────────────────────┘
                                                    │
                   ┌────────────────────────────────┼────────────────────────────────┐
                   ▼                                ▼                                ▼
      【1. 时效性衰减 (Recency)】        【2. 重要度加权 (Importance)】    【3. 语义相关度 (Relevance)】
      - 时间越近，记忆越清晰活跃        - 核心重大决策打 10 分            - 当前 Query 与记忆项的向量
      - 指数衰减: R = decay^(Δhours)   - 日常闲聊喝水打 1 分             - 余弦相似度: cos(θ)
      - 防止陈旧过时记忆抢占注意力      - 确保里程碑事实永远能被唤醒      - 保证与当前话题紧密契合
```

#### 维度量化详解：
1. **时效性（Recency）**：随时间流逝呈指数衰减：$\\text{Recency} = d^{\\Delta t}$（其中衰减底数 $d \\in (0.9, 0.99)$，$\\Delta t$ 为距今流逝的小时数）；
2. **重要性（Importance）**：由轻量大模型在记忆产生时评定 1~10 分并永久固化（如“用户更名或重置密码”评 9~10 分，“今天天气不错”评 1~2 分）；
3. **相关性（Relevance）**：当前 Query 与记忆项文本 Embedding 之间的余弦相似度（取值 $[0, 1]$）；
4. **归一化加权**：三项均归一化到 $[0, 1]$ 之间，通过超参数权重（如 $\\alpha=1.0, \\beta=1.0, \\gamma=1.0$）加权求和，最终排序。
""",
            "tips": [
                {
                    "kind": "tip",
                    "text": "在计算 Recency 时，底数 d 的选择决定了 Agent 的'遗忘速度'。面向快速多轮客服可选 d=0.95（快速衰减）；面向严肃长期助手可选 d=0.995（长期保鲜）。"
                },
                {
                    "kind": "note",
                    "text": "三维记忆打分是解决大模型'记吃不记打'与'被陈旧过时信息误导'的业界最优算法范式之一。"
                }
            ],
            "demos": [
                {
                    "title": "纯 Python 完整实现时效性衰减、重要性与语义余弦相似度的三维记忆检索器",
                    "lang": "python",
                    "code": """# 纯 Python 实现斯坦福 Generative Agents 三维记忆综合评分检索算法
import math

class MemoryItem:
    def __init__(self, text: str, vector: list[float], importance: float, hours_ago: float):
        self.text = text
        self.vector = vector
        self.importance = importance  # 1.0 ~ 10.0
        self.hours_ago = hours_ago    # 距今小时数

def cosine_similarity(v1: list[float], v2: list[float]) -> float:
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    return dot / (norm1 * norm2 + 1e-9)

class ComprehensiveMemoryStore:
    def __init__(self, decay_rate: float = 0.96, alpha: float = 1.0, beta: float = 1.0, gamma: float = 1.0):
        self.decay_rate = decay_rate
        self.alpha = alpha
        self.beta = beta
        self.gamma = gamma
        self.memories: list[MemoryItem] = []

    def add_memory(self, text: str, vector: list[float], importance: float, hours_ago: float):
        self.memories.append(MemoryItem(text, vector, importance, hours_ago))

    def retrieve(self, query_vec: list[float], top_k: int = 2) -> list[tuple[MemoryItem, float]]:
        scored = []
        for m in self.memories:
            # 1. 时效性 (指数衰减到 0~1)
            recency = math.pow(self.decay_rate, m.hours_ago)

            # 2. 重要性 (归一化到 0~1)
            importance_norm = m.importance / 10.0

            # 3. 语义相关性 (余弦相似度 0~1)
            relevance = max(0.0, cosine_similarity(query_vec, m.vector))

            # 综合三维得分
            total_score = round(self.alpha * recency + self.beta * importance_norm + self.gamma * relevance, 4)
            scored.append((m, total_score))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:top_k]

store = ComprehensiveMemoryStore(decay_rate=0.95)

# 写入 3 条对比性记忆
# 记忆 A: 50 小时前发生，但极度重要 (修改密码)
store.add_memory("用户将登录密码重置为强密码", vector=[0.9, 0.1], importance=9.5, hours_ago=50.0)
# 记忆 B: 刚刚发生 (0.5 小时前)，微小琐事 (说早上好)
store.add_memory("用户向助手打招呼说早上好", vector=[0.1, 0.9], importance=1.0, hours_ago=0.5)
# 记忆 C: 2 小时前发生，与安全相关且重要
store.add_memory("用户绑定了新手机号 13800000000", vector=[0.85, 0.2], importance=8.0, hours_ago=2.0)

# 查询: "用户账户安全与登录凭据情况" (对应向量偏向 [0.9, 0.1])
query_vector = [0.88, 0.15]
top_results = store.retrieve(query_vector, top_k=2)

print("=== 三维综合评分记忆检索结果 ===")
for mem, score in top_results:
    print(f"得分: {score:.4f} | 重要度: {mem.importance} | 发生在 {mem.hours_ago}h 前")
    print(f"  内容: '{mem.text}'")

# 验证兼顾了语义相关度与时效性的高重要度事实 (记忆 C 与 记忆 A) 胜出，琐事 B 被过滤
top_texts = [item[0].text for item in top_results]
assert "用户绑定了新手机号" in top_texts[0]
assert "用户向助手打招呼说早上好" not in top_texts
print()
print("[OK] 三维记忆综合评分检索算法验证成功！")
"""
                }
            ]
        }
    ],
    "exercises": [
        {
            "id": "agent-ex-25",
            "type": "single",
            "difficulty": 1,
            "question": "在智能体认知记忆架构中，短期工作记忆草稿纸（Scratchpad）的核心功能是什么？",
            "options": [
                {"value": "A", "label": "在当前单次任务的推理上下文滑动窗口中，动态记录任务目标、当前计划与工具执行的各步中间观察结果"},
                {"value": "B", "label": "在服务器开机时格式化所有网络接口"},
                {"value": "C", "label": "替代数据库永久存储过去 10 年的所有业务订单"},
                {"value": "D", "label": "自动编写 CSS 动画效果"}
            ],
            "answer": "A",
            "explanation": "Scratchpad（草稿纸）在单任务生命周期中扮演工作记忆角色，紧密维护当前解决问题过程中的 Thought-Action-Observation 连续思考状态，任务达成后即被释放或压缩归档。",
            "tags": ["Scratchpad", "工作记忆", "认知架构"]
        },
        {
            "id": "agent-ex-26",
            "type": "single",
            "difficulty": 2,
            "question": "在斯坦福大学经典论文《Generative Agents》提出的记忆检索三维综合评分公式中，重要度（Importance）指标的主要评估意图是什么？",
            "options": [
                {"value": "A", "label": "记录数据在硬盘上占用的字节数"},
                {"value": "B", "label": "评估该记忆事件对于主体生命周期与业务认知的核心重大程度，确保极其重要的里程碑事实（如密码修改、重大人事任命）即使发生较早也不至于被轻易遗忘"},
                {"value": "C", "label": "检测网络传输的往返延迟 P99"},
                {"value": "D", "label": "计算用户输入字数的奇偶性"}
            ],
            "answer": "B",
            "explanation": "Importance 区分了重大核心事件（高分，如密码变更、核心偏好）与日常琐事（低分，如打喷嚏、普通问候），防止关键里程碑事实仅仅因时间流逝就过早从注意力中彻底消失。",
            "tags": ["Importance", "Generative Agents", "记忆评分"]
        },
        {
            "id": "agent-ex-27",
            "type": "single",
            "difficulty": 1,
            "question": "长期情景记忆（Episodic Long-term Memory）在智能体系统中主要存储什么内容？",
            "options": [
                {"value": "A", "label": "操作系统内核源代码"},
                {"value": "B", "label": "智能体在过去解决具体特定任务时所经历的完整行动轨迹、工具调用序列与成败经验"},
                {"value": "C", "label": "显卡的风扇转速监控日志"},
                {"value": "D", "label": "显示器的像素分辨率矩阵"}
            ],
            "answer": "B",
            "explanation": "情景记忆（Episodic Memory）类似人类对过去亲身经历具体事件的回忆。在 Agent 中它持久化历史任务执行轨迹，支持在遭遇新挑战时召回过去的成功经验作为 Few-Shot 参考。",
            "tags": ["情景记忆", "Episodic", "经验复用"]
        },
        {
            "id": "agent-ex-28",
            "type": "judge",
            "difficulty": 1,
            "question": "在 Generative Agents 记忆评分模型中，时效性（Recency）通常采用指数衰减函数计算，随着记忆产生的时间流逝越久，其 Recency 得分越低。",
            "options": [
                {"value": "true", "label": "正确"},
                {"value": "false", "label": "错误"}
            ],
            "answer": "true",
            "explanation": "时效性衰减模拟了人类自然遗忘规律，公式形如 d^Δt（0 < d < 1）。距今时间越长，Recency 分值衰减越接近 0，确保模型优先关注刚发生的最新动态。",
            "tags": ["Recency", "指数衰减", "遗忘曲线"]
        },
        {
            "id": "agent-ex-29",
            "type": "fill",
            "difficulty": 2,
            "question": "在长步骤 Agent 任务中，为了防止历史步骤文本超出上下文窗口限制，后台调用轻量小模型将较早前步骤提炼为精炼事实段落的记忆压缩机制通常称为 _________ Buffer Memory。",
            "blanks": [["Summary", "summary"]],
            "explanation": "Summary Buffer Memory（摘要缓冲记忆）通过后台自动对滑动窗口滑出的早期推导进行定期滚动摘要压缩，兼顾长程连贯性与 Token 预算控制。",
            "tags": ["Summary Buffer", "记忆压缩", "上下文管理"]
        },
        {
            "id": "agent-ex-30",
            "type": "multiple",
            "difficulty": 2,
            "question": "在衡量长期记忆检索优先级时，综合评分系统通常综合考量的三大核心维度包括哪些？",
            "options": [
                {"value": "A", "label": "时效性（Recency）：事件距离当前时间的远近程度"},
                {"value": "B", "label": "重要度（Importance）：记忆内容对核心业务或人设的关键程度"},
                {"value": "C", "label": "语义相关性（Relevance）：记忆向量与当前查询向量的几何余弦相似度"},
                {"value": "D", "label": "存储该条记录的固态硬盘品牌生产日期"}
            ],
            "answer": ["A", "B", "C"],
            "explanation": "经典的三维记忆模型融合了 Recency（新旧）、Importance（主次）与 Relevance（相关），三者加权兼顾当下、宏观与语义。选项 D 为荒谬无关干扰项。",
            "tags": ["三维记忆", "评分维度", "斯坦福论文"]
        },
        {
            "id": "agent-ex-31",
            "type": "multiple",
            "difficulty": 2,
            "question": "对于面向长周期、复杂专业场景的自主智能体，必须引入外部持久化长期记忆（Long-term Memory）的核心原因包括哪些？",
            "options": [
                {"value": "A", "label": "大模型的单次上下文窗口（Context Window）存在物理上限或极高昂的 Token 费用"},
                {"value": "B", "label": "在多轮或跨天会话中，如果不持久化，智能体在服务重启或创建新会话后会彻底丧失过去的经验"},
                {"value": "C", "label": "记忆库能够为模型提供专属的个性化领域知识，避免每次都向用户重复询问基础偏好"},
                {"value": "D", "label": "长期记忆能够让 Python 自动升级为 Java"}
            ],
            "answer": ["A", "B", "C"],
            "explanation": "突破单次上下文长度限制、实现跨会话状态持久化与个性化偏好累积，是引入长期记忆的核心动力。选项 D 纯属荒诞说法。",
            "tags": ["长期记忆", "架构必要性", "工程价值"]
        },
        {
            "id": "agent-ex-32",
            "type": "code",
            "difficulty": 3,
            "question": "请编写一个名为 `rank_memories` 的记忆多维打分排序函数。要求：接受一个记忆列表 `memories`（每个元素为字典：`{'text': str, 'recency': float, 'importance': float, 'relevance': float}`，三个分值均为 0.0~1.0）以及三个权重参数 `alpha`、`beta`、`gamma`（默认均为 1.0）；计算每条记忆的综合得分：`score = alpha * recency + beta * importance + gamma * relevance`；最终按得分降序返回元组列表 `[(text, round(score, 4)), ...]`。",
            "setupCode": "",
            "answer": "def rank_memories(memories: list[dict], alpha: float = 1.0, beta: float = 1.0, gamma: float = 1.0) -> list[tuple[str, float]]:\n    scored = []\n    for m in memories:\n        r = m.get('recency', 0.0)\n        imp = m.get('importance', 0.0)\n        rel = m.get('relevance', 0.0)\n        total = round(alpha * r + beta * imp + gamma * rel, 4)\n        scored.append((m['text'], total))\n    scored.sort(key=lambda x: x[1], reverse=True)\n    return scored\n",
            "tests": "# 测试用例 1: 正常加权排序\nm_list = [\n    {'text': '记忆 A', 'recency': 0.9, 'importance': 0.2, 'relevance': 0.3}, # 0.9 + 0.2 + 0.3 = 1.4\n    {'text': '记忆 B', 'recency': 0.1, 'importance': 0.9, 'relevance': 0.8}, # 0.1 + 0.9 + 0.8 = 1.8\n]\nres = rank_memories(m_list, 1.0, 1.0, 1.0)\nassert res[0][0] == '记忆 B'\nassert res[0][1] == 1.8\nassert res[1][0] == '记忆 A'\nassert res[1][1] == 1.4\n\n# 测试用例 2: 自定义权重测试 (大幅强化时效性)\nres_weighted = rank_memories(m_list, alpha=5.0, beta=1.0, gamma=1.0)\n# 记忆 A: 5*0.9 + 0.2 + 0.3 = 5.0\n# 记忆 B: 5*0.1 + 0.9 + 0.8 = 2.2\nassert res_weighted[0][0] == '记忆 A'\n\nprint('rank_memories test cases passed!')\n",
            "explanation": "遍历记忆项，根据传入的 alpha、beta、gamma 权重分别对 recency、importance 与 relevance 进行线性组合求和，并按最终 score 降序排列。",
            "tags": ["记忆排序", "多维加权", "编程实战"]
        }
    ]
}

CHAPTER_5 = {
    "id": "agent-c5",
    "courseId": "python-agent-development",
    "order": 5,
    "title": "进阶设计模式：反思、自纠错与自适应规划",
    "goal": "掌握解决复杂长程任务的高阶 Agent 设计模式；深入精通 Reflexion 论文架构（Actor、Evaluator、Self-Reflection）；掌握 Plan-and-Solve / Plan-and-Execute 规划前置与动态重规划（Replanning）机制；掌握 LATS 蒙特卡洛树搜索规划思想与容错自愈策略。",
    "lessons": [
        {
            "id": "agent-l5-1",
            "title": "Reflexion 架构与基于语言反馈的自省纠错闭环",
            "difficulty": 1,
            "content": """### 学习目标与先修要求

- **先修要求**：掌握 ReAct 循环流程、单元测试/断言概念。
- **能力目标**：
  1. 理解单纯单向 ReAct 在复杂数学、算法代码等长程任务中容易“一步错、步步错”的局限；
  2. 深刻掌握 Reflexion 论文（Shinn et al., NeurIPS 2023）的三大核心角色：**Actor（行动者）**、**Evaluator（评估判题器）** 与 **Self-Reflection（自省反思者）**；
  3. 掌握利用语言反馈进行强化（Verbal Reinforcement Learning）而不更新模型权重的核心思想。

---

### 一、Reflexion：用语言反馈代替梯度更新的自省框架

传统强化学习（RL）需要消耗昂贵算力更新模型数十亿参数的权重。
**《Reflexion: Language Agents with Verbal Reinforcement Learning》**（NeurIPS 2023 顶会论文）提出了一种惊艳的平替方案：**将环境给出的标量奖惩（如测试未通过），转化为高维度的自然语言反省反思，并持久化到内存中作为未来行动的教训指南！**

```
                             用户复杂任务 (如: 编写快速排序并处理边界)
                                                │
                                                ▼
                        ┌───────────────────────────────────────────────┐
                        │              Actor (行动者智能体)             │
                        │      基于历史经验，尝试编写代码并提交运行     │
                        └───────────────────────┬───────────────────────┘
                                                │ 交付执行结果
                                                ▼
                        ┌───────────────────────────────────────────────┐
                        │          Evaluator (外部客观评估判题器)        │
                        │      运行单元测试用例，判断是否 100% 通过      │
                        └───────────────┬───────────────┬───────────────┘
                                        │               │
                                  [全部测试通过]    [出现测试用例失败]
                                        │               │
                                        ▼               ▼
                                【交付成功结果】 ┌───────────────────────────────────┐
                                                 │   Self-Reflection (自我反省模型)  │
                                                 │ 深入分析报错日志，提炼失败教训:   │
                                                 │ "我在第 18 行遗漏了空列表边界判定" │
                                                 └─────────────────┬─────────────────┘
                                                                   │ 写入经验记忆
                                                                   ▼
                                                 ┌───────────────────────────────────┐
                                                 │ 携带'避坑教训'开启第 N+1 次全新重试│
                                                 └───────────────────────────────────┘
```

---

### 二、三大组件的分工与协作

1. **Actor（行动者）**：
   - 负责调用工具实际执行探索，生成候选解决方案；
   - 接收来自 Self-Reflection 的提示词补充，指导本次行动；
2. **Evaluator（评估器）**：
   - **绝不由 Actor 自问自答**，必须是独立的客观裁判（如执行真实的 Python `pytest` 自动化测试脚本、或者由专门的审查模型进行打分）；
3. **Self-Reflection（反思者）**：
   - 仅在 Evaluator 判定失败时激活。模型对比“预期目标”与“实际报错 Traceback”，总结出简短、切中要害的**启发式经验（Heuristic Lesson）**；
   - 实验表明：在 HumanEval 编码评测集上，Reflexion 让原本只有 67% 正确率的 Agent 经过 2 轮反思跃升至 **91%**！
""",
            "tips": [
                {
                    "kind": "tip",
                    "text": "Self-Reflection 生成的教训应该具体、具备操作性（如'应当在除法前先检查分母是否为 0'），严禁产生空洞的套话（如'我下次会更仔细'）。"
                },
                {
                    "kind": "note",
                    "text": "反思重试同样必须配备最大重试轮次（如 max_trials=3），防止遇到根本无解的逻辑悖论时无限空转。"
                }
            ],
            "demos": [
                {
                    "title": "纯 Python 实现 Actor-Evaluator-Reflection 自我反思与教训积累自愈闭环",
                    "lang": "python",
                    "code": """# 纯 Python 实现 Reflexion 自我反思自纠错闭环架构
from typing import List, Tuple

class ReflexionLoop:
    def __init__(self, max_trials: int = 3):
        self.max_trials = max_trials
        self.lessons_learned: List[str] = []

    def mock_actor_generate_code(self, trial_num: int) -> str:
        \"\"\"模拟 Actor 根据累积的教训生成不同质量的代码\"\"\"
        if not self.lessons_learned:
            # 初始版本：有 bug (未考虑负数)
            return "def divide(a, b): return a / b"
        else:
            # 吸收教训后的重构版本
            return "def divide(a, b): return 0 if b == 0 else a / b"

    def mock_evaluator(self, code_str: str) -> Tuple[bool, str]:
        \"\"\"客观裁判：通过运行真实断言测试代码质量\"\"\"
        test_scope = {}
        try:
            exec(code_str, test_scope)
            fn = test_scope["divide"]
            # 基础用例
            assert fn(10, 2) == 5.0
            # 边界用例：除以 0
            res = fn(5, 0)
            assert res == 0, f"除以 0 时期望返回 0，实际得到 {res}"
            return True, "All tests passed."
        except ZeroDivisionError as e:
            return False, f"ZeroDivisionError: {e}"
        except AssertionError as e:
            return False, f"AssertionError: {e}"

    def mock_self_reflect(self, failed_code: str, error_log: str) -> str:
        \"\"\"反思模型：分析错误并提炼经验教训\"\"\"
        return f"失败原因分析: 代码中未对分母为 0 进行防御性分支处理，抛出了 {error_log}。下一次必须先做 if b == 0 判断。"

    def run(self) -> dict:
        for trial in range(1, self.max_trials + 1):
            print(f"\\n--- [Trial {trial}] 启动 ---")
            if self.lessons_learned:
                print(f"注入历史反思教训: '{self.lessons_learned[-1]}'")

            code = self.mock_actor_generate_code(trial)
            print(f"Actor 生成实现: {code}")

            passed, log = self.mock_evaluator(code)
            if passed:
                print(f"Evaluator 裁判结果: [PASSED] - {log}")
                return {"success": True, "final_code": code, "trials_taken": trial}
            else:
                print(f"Evaluator 裁判结果: [FAILED] - {log}")
                lesson = self.mock_self_reflect(code, log)
                self.lessons_learned.append(lesson)

        return {"success": False, "final_code": None, "trials_taken": self.max_trials}

print("=== 启动 Reflexion 自我反思纠错循环 ===")
system = ReflexionLoop(max_trials=3)
result = system.run()

print("\\n=== 任务终局报告 ===")
print("是否成功达标:", result["success"])
print("共尝试轮次:", result["trials_taken"])
print("最终交付代码:", result["final_code"])

assert result["success"] is True
assert result["trials_taken"] == 2
print()
print("[OK] Reflexion 自省闭环验证成功！")
"""
                }
            ]
        },
        {
            "id": "agent-l5-2",
            "title": "规划前置 (Plan-and-Solve) 与动态重规划 (Replanning)",
            "difficulty": 2,
            "content": """### 学习目标与先修要求

- **先修要求**：掌握任务分解（Task Decomposition）、列表状态机操作。
- **能力目标**：
  1. 理解 Plan-and-Solve（Wang et al., ACL 2023）与 Plan-and-Execute 模式；
  2. 深刻掌握 **Planner（规划总览）**、**Executor（专注执行）** 与 **Replanner（动态重排）** 的分工体系；
  3. 掌握在执行过程中遇到现实突发阻碍时，自适应修改后续任务清单的重规划算法。

---

### 一、为什么复杂任务需要“规划先行 (Planning First)”？

标准的 ReAct 智能体属于**“走一步看一步”的贪心局部搜索**：
面对一个跨越 5~10 步的宏观工程（如“开发一个完整的博客网站”），如果在第一步就直接调工具建表，往往执行到中途就会迷失大方向、重复做无用功或进入死胡同。

#### Plan-and-Execute 模式的认知分工：
将宏观战略思考与微观单步执行彻底解耦：

```
                      ┌────────────────────────────────────────┐
                      │        用户宏观目标 (Global Goal)      │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │          1. Planner (总战略规划师)      │
                      │     将大目标拆解为结构化待办任务清单   │
                      │     Step 1 -> Step 2 -> Step 3 -> ...  │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │          2. Executor (单步攻坚专员)    │ <──────────┐
                      │    严格只聚焦于当前未完成的 Step 1 执行 │            │
                      └───────────────────┬────────────────────┘            │
                                          │                                 │
                                          ▼                                 │
                      ┌────────────────────────────────────────┐            │ (执行下一步)
                      │          3. Replanner (重构规划师)     │            │
                      │   根据 Step 1 的实际执行输出动态评估:   │            │
                      │   - 是否完成? -> 标记 Step 1 Done      │            │
                      │   - 发生意外? -> 动态修改/追加后续步骤 ├────────────┘
                      │   - 全部完成? -> 输出最终交付物        │
                      └────────────────────────────────────────┘
```

---

### 二、动态重规划（Replanning）的自适应价值

现实业务充满不确定性：
- 规划时计划：`Step 2: 从 sales.csv 读取数据`；
- 执行时反馈：`FileNotFoundError: sales.csv 不存在，但检测到了 sales.xlsx`；
- **Replanner 的核心价值**：它不会盲目报错崩溃，而是根据这个反馈动态重写任务清单：
  - 将原有的 `Step 2` 动态改写为 `使用 pandas.read_excel 读取 sales.xlsx`；
  - 保证下游步骤无缝平稳推进！
""",
            "tips": [
                {
                    "kind": "tip",
                    "text": "在企业实际落地中，可以让强模型（如 Claude 3.5 Sonnet / GPT-4o）担任 Planner 和 Replanner，让廉价快速小模型担任 Executor，兼顾全局智慧与极佳性价比。"
                },
                {
                    "kind": "note",
                    "text": "任务清单中的每一个子步骤必须具备清晰的'完成判据（Done Criteria）'，便于 Replanner 准确判断何时划掉该事项。"
                }
            ],
            "demos": [
                {
                    "title": "纯 Python 实现 Plan-and-Execute 动态任务清单拆解与自适应重规划引擎",
                    "lang": "python",
                    "code": """# 纯 Python 实现 Plan-and-Execute 架构：前置规划、逐步攻坚与自适应动态重规划
from typing import List, Dict, Any

class PlanAndExecuteEngine:
    def __init__(self):
        self.plan: List[str] = []
        self.completed_steps: List[Dict[str, str]] = []

    def planner(self, goal: str) -> List[str]:
        \"\"\"规划师：负责任务结构化拆解\"\"\"
        print(f"\\n[Planner]: 针对目标 '{goal}' 制定初始方案...")
        return [
            "步骤 1: 扫描并确认数据源文件格式",
            "步骤 2: 加载数据并统计异常缺损值",
            "步骤 3: 生成清洗后的合规指标报告"
        ]

    def executor(self, current_step: str) -> str:
        \"\"\"执行者：只专心解决当前分配的单一步骤\"\"\"
        print(f"  [Executor 正在执行]: {current_step}")
        if "动态追加" in current_step:
            return "Observation: 已将嵌套 JSON 结构扁平化解构完毕"
        elif "步骤 1:" in current_step:
            # 模拟执行发现实际数据源为 JSON 而非预期的 CSV
            return "Observation: 检测到源文件为 data.json (嵌套格式)"
        elif "步骤 2:" in current_step:
            return "Observation: 统计发现 2 个缺失值，已插值补全"
        elif "步骤 3:" in current_step:
            return "Observation: 指标报告已汇总输出"
        return "Observation: 完成"

    def replanner(self, current_step: str, result: str, remaining_plan: List[str]) -> List[str]:
        \"\"\"重规划师：根据上一步的真实回显，自适应动态调整后续待办清单\"\"\"
        new_plan = list(remaining_plan)
        # 如果发现是嵌套 JSON 且未曾执行过追加步骤，动态在后续清单前置插入解构步骤
        if "嵌套格式" in result and not any("动态追加" in s["step"] for s in self.completed_steps):
            print("  [Replanner 动态决策]: 发现源文件为嵌套 JSON，动态追加 '扁平化处理' 步骤！")
            new_plan.insert(0, "步骤 1.5 (动态追加): 对嵌套 JSON 进行扁平化解构")
        return new_plan

    def run(self, goal: str) -> List[Dict[str, str]]:
        self.plan = self.planner(goal)

        while self.plan:
            current_step = self.plan.pop(0)
            res = self.executor(current_step)
            self.completed_steps.append({"step": current_step, "result": res})

            # 调用重规划师调整剩余步骤
            self.plan = self.replanner(current_step, res, self.plan)

        return self.completed_steps

engine = PlanAndExecuteEngine()
execution_trace = engine.run("全自动完成客户数据报表清洗")

print("\\n=== 最终执行轨迹全景 ===")
for i, item in enumerate(execution_trace, 1):
    print(f"{i}. {item['step']} -> {item['result']}")

# 验证自适应动态追加步骤已成功生效并被执行
all_steps_text = " ".join([item['step'] for item in execution_trace])
assert "动态追加" in all_steps_text
assert len(execution_trace) == 4
print()
print("[OK] Plan-and-Execute 动态重规划引擎验证成功！")
"""
                }
            ]
        }
    ],
    "exercises": [
        {
            "id": "agent-ex-33",
            "type": "single",
            "difficulty": 1,
            "question": "在 NeurIPS 2023 顶会发表的经典论文 Reflexion 中，其相比传统强化学习的最核心技术创新是什么？",
            "options": [
                {"value": "A", "label": "完全不需要对数十亿参数的模型进行昂贵的梯度微调更新，而是通过语言反思反馈（Verbal Reinforcement）将教训沉淀在记忆中指导后续行动"},
                {"value": "B", "label": "必须使用 1000 张 GPU 运行 30 天"},
                {"value": "C", "label": "完全放弃任何提示词"},
                {"value": "D", "label": "只允许执行打印当前系统时间的操作"}
            ],
            "answer": "A",
            "explanation": "Reflexion 提出了基于自然语言的言语强化学习（Verbal RL）。通过分析失败报错提炼自我反省经验，并存入上下文指导下一次尝试，零权重更新便显著提升了复杂任务成功率。",
            "tags": ["Reflexion", "Verbal RL", "自纠错"]
        },
        {
            "id": "agent-ex-34",
            "type": "single",
            "difficulty": 1,
            "question": "在 Plan-and-Execute（规划-执行）设计模式中，将全局任务划分为 Planner 与 Executor 两个专门角色协同处理的主要优势是？",
            "options": [
                {"value": "A", "label": "让系统能够直接关闭电脑电源"},
                {"value": "B", "label": "将宏观战略分解与微观单步执行解耦，避免在处理复杂长步骤任务时因单步细节干扰而迷失大局"},
                {"value": "C", "label": "只能用于画卡通画，无法处理编程或数据"},
                {"value": "D", "label": "消除了所有的 Python 变量"}
            ],
            "answer": "B",
            "explanation": "Plan-and-Execute 实现了战略思考与战术执行的解耦。Planner 专注于顶层任务清单拆解，Executor 专注于单点工具调用，配合 Replanner 动态自适应，极大提升了长程任务稳定性。",
            "tags": ["Plan-and-Execute", "角色解耦", "设计模式"]
        },
        {
            "id": "agent-ex-35",
            "type": "single",
            "difficulty": 2,
            "question": "在 Reflexion 框架体系中，Evaluator（评估判题器）的核心设计准则是什么？",
            "options": [
                {"value": "A", "label": "必须独立于 Actor 之外，采用客观客观标准（如单元测试断言或独立评分模型）进行裁决，严防 Actor 自说自话产生虚假成功判断"},
                {"value": "B", "label": "必须由编写该代码的同一个大模型盲目输出'我通过了'"},
                {"value": "C", "label": "Evaluator 必须随机返回通过或失败"},
                {"value": "D", "label": "永远判定所有任务全部失败"}
            ],
            "answer": "A",
            "explanation": "Evaluator 必须具备客观性与独立性。如果让 Actor 既当运动员又当裁判，模型往往会陷入幻觉自信，无法暴露出真实逻辑缺陷与测试失败点。",
            "tags": ["Evaluator", "客观评估", "Reflexion"]
        },
        {
            "id": "agent-ex-36",
            "type": "judge",
            "difficulty": 1,
            "question": "在 Plan-and-Execute 模式中，Replanner（重规划器）具有在单步执行遭遇意外环境反馈（如目标文件格式不符）时，动态修改、删除或向前追加新任务清单的自适应能力。",
            "options": [
                {"value": "true", "label": "正确"},
                {"value": "false", "label": "错误"}
            ],
            "answer": "true",
            "explanation": "Replanner 的核心价值就在于'动态自适应'。面对现实执行中途出现的不可控变数，它能审时度势重写后续 Todo 清单，防止整体流程断裂挂死。",
            "tags": ["Replanner", "动态重规划", "自适应"]
        },
        {
            "id": "agent-ex-37",
            "type": "fill",
            "difficulty": 2,
            "question": "在 Reflexion 架构中，当评估器判定任务失败后，负责针对报错根因进行剖析并提炼出避坑经验教训的核心模型角色被称为 _________-Reflection。",
            "blanks": [["Self", "self"]],
            "explanation": "Self-Reflection（自我反思者）在失败发生时介入，以自然语言形式总结出具体的试错教训并沉淀为未来重试时的记忆上下文。",
            "tags": ["Self-Reflection", "角色分工", "Reflexion"]
        },
        {
            "id": "agent-ex-38",
            "type": "multiple",
            "difficulty": 2,
            "question": "相比贪心单步 ReAct（走一步看一步），Plan-and-Solve / Plan-and-Execute 模式在解决哪些场景任务时表现出明显优势？",
            "options": [
                {"value": "A", "label": "步骤多达 5 步以上且各步骤之间存在严格先后依赖关系的复杂流水线任务"},
                {"value": "B", "label": "需要宏观任务进度汇报与可视化呈现的任务（能够明确向用户展示已完成 3/5 步骤）"},
                {"value": "C", "label": "需要结合强弱不同模型分工搭配以优化成本的工业系统架构"},
                {"value": "D", "label": "只需要单步查一次当前气温的极简操作"}
            ],
            "answer": ["A", "B", "C"],
            "explanation": "Plan-and-Execute 非常适合多步长程依赖、需要向用户汇报宏观进度、以及大小模型分工搭配的高阶企业任务。对于 D 这种单步操作，直接调用 ReAct 或单工具更轻便，过度规划反而增加延迟。",
            "tags": ["场景选型", "Plan-and-Solve", "架构设计"]
        },
        {
            "id": "agent-ex-39",
            "type": "multiple",
            "difficulty": 2,
            "question": "在设计工业级 Reflexion 闭环自纠错系统时，为确保系统稳定收敛，推荐的工程防线包括哪些？",
            "options": [
                {"value": "A", "label": "设定最大重试轮次（Max Trials，如 3~5 次），避免因不可解问题产生无限死循环"},
                {"value": "B", "label": "严格规范反思教训的格式，要求其必须指出具体出错行或核心逻辑并给出操作性建议"},
                {"value": "C", "label": "将所有历史反思教训去重并作为负向/正向约束按序追加至 Actor 的提示词中"},
                {"value": "D", "label": "每次尝试失败后把最大轮次加倍扩展到 1000 次"}
            ],
            "answer": ["A", "B", "C"],
            "explanation": "严格设定重试上限、约束高质量反思语言、以及将经验有序反哺，是保障自纠错系统有效收敛的三大核心。选项 D 会导致系统资源耗尽失控。",
            "tags": ["工程防线", "收敛性", "Reflexion 实战"]
        },
        {
            "id": "agent-ex-40",
            "type": "code",
            "difficulty": 3,
            "question": "请编写一个名为 `execute_plan_step` 的规划步骤执行与状态推进函数。要求：接受当前计划列表 `plan_list`（list[str]）与单步执行函数 `executor_func`（接收步骤字符串，返回包含 `'success'`(bool) 与 `'output'`(str) 的字典）；如果 plan_list 为空，返回字典 `{'status': 'ALL_DONE', 'executed_step': None, 'remaining_plan': []}`；否则，取出 plan_list 的首个步骤传递给 executor_func 执行；若执行成功，将该步骤移除并返回 `{'status': 'STEP_OK', 'executed_step': 步骤名, 'remaining_plan': 剩余步骤列表}`；若执行失败，不移除该步骤并在头部保留该步骤，返回 `{'status': 'STEP_FAILED', 'executed_step': 步骤名, 'remaining_plan': 原清单}`。",
            "setupCode": "",
            "answer": "def execute_plan_step(plan_list: list[str], executor_func) -> dict:\n    if not plan_list:\n        return {'status': 'ALL_DONE', 'executed_step': None, 'remaining_plan': []}\n        \n    current_step = plan_list[0]\n    res = executor_func(current_step)\n    \n    if res.get('success', False):\n        return {\n            'status': 'STEP_OK',\n            'executed_step': current_step,\n            'remaining_plan': plan_list[1:]\n        }\n    else:\n        return {\n            'status': 'STEP_FAILED',\n            'executed_step': current_step,\n            'remaining_plan': list(plan_list)\n        }\n",
            "tests": "# 测试用例 1: 执行成功推进步骤\nplan = ['step1', 'step2']\nres1 = execute_plan_step(plan, lambda s: {'success': True, 'output': 'ok'})\nassert res1['status'] == 'STEP_OK'\nassert res1['executed_step'] == 'step1'\nassert res1['remaining_plan'] == ['step2']\n\n# 测试用例 2: 执行失败原地阻断\nres2 = execute_plan_step(plan, lambda s: {'success': False, 'output': 'error'})\nassert res2['status'] == 'STEP_FAILED'\nassert res2['executed_step'] == 'step1'\nassert res2['remaining_plan'] == ['step1', 'step2']\n\n# 测试用例 3: 清单为空全部完成\nres3 = execute_plan_step([], lambda s: {'success': True})\nassert res3['status'] == 'ALL_DONE'\nassert res3['remaining_plan'] == []\n\nprint('execute_plan_step test cases passed!')\n",
            "explanation": "检查清单是否为空，提取队首首项送入执行器，根据执行器返回的 success 状态决定是切片推进 remaining_plan 还是原地保留以便重试。",
            "tags": ["任务清单推进", "Plan-and-Execute", "编程实战"]
        }
    ]
}

CHAPTER_6 = {
    "id": "agent-c6",
    "courseId": "python-agent-development",
    "order": 6,
    "title": "多智能体协同网络 (Multi-Agent Systems & CrewAI Architecture)",
    "goal": "掌握从单智能体（Single-Agent）跨越到多智能体协同网络（Multi-Agent System, MAS）的设计必然性；精通层级主管（Supervisor）、协作辩论（Debate）与顺序流水线三大经典拓扑；深入剖析 CrewAI 角色扮演架构模型（Role、Goal、Backstory、Task）；掌握智能体间防踢皮球循环与通信治理机制。",
    "lessons": [
        {
            "id": "agent-l6-1",
            "title": "从单 Agent 到多 Agent 协作系统 (MAS) 的架构演进",
            "difficulty": 1,
            "content": """### 学习目标与先修要求

- **先修要求**：掌握面向对象类设计、ReAct 循环原理、模块解耦原则。
- **能力目标**：
  1. 理解单个全能 Agent 在面对复合复杂任务时引发的“角色冲突与上下文污染”困局；
  2. 精通多智能体系统（MAS）带来的**关注点分离（Separation of Concerns）**与异构模型搭配优势；
  3. 熟练掌握三大经典多智能体协作拓扑模式（层级主管、流水线链式、圆桌辩论）。

---

### 一、单个全能 Agent 的阿喀琉斯之踵

在面对复杂工业项目时，很多初学者试图只编写一个庞大的 System Prompt：“你是一位精通 Python 全栈、数据库 DBA、UI 设计与安全审计的全能超级专家，请帮我完成整个系统”。
**工程实验证明，这种做法在复杂场景下必然崩溃**：
1. **认知过载与指令混淆**：把互相矛盾的关注点塞入同一模型（如既要创造力极强地写策划案，又要严苛死板地做安全审查），模型极难自我平衡；
2. **上下文污染（Context Pollution）**：单一上下文塞满了数据查询日志、设计草稿与安全报错，导致有效 Token 空间被急剧挤占；
3. **成本效益失衡**：哪怕只是做简单的数据汇总，也被迫使用昂贵的全能超大模型。

---

### 二、多智能体协同系统 (MAS) 的核心优势

```
                                  用户总需求
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │    主管智能体 (Supervisor) │
                        └───────┬───────────┬───────┘
                                │           │
              ┌─────────────────┘           └─────────────────┐
              ▼                                               ▼
┌───────────────────────────┐                   ┌───────────────────────────┐
│ 研究员专员 (Researcher)   │                   │  代码编写专员 (Coder)     │
│ - 专注信息搜索与知识整理   │                   │ - 专注生产合规代码编写    │
│ - 配备搜网与学术检索工具   │                   │ - 配备代码测试与编译工具  │
│ - 采用高召回度发散 Prompt │                   │ - 采用零温度严格 Prompt   │
└───────────────────────────┘                   └───────────────────────────┘
```

#### MAS 的三大核心突破：
1. **关注点分离（Separation of Concerns）**：每个专员拥有专一的职责定位（Persona）、专属的工具集与独立的上下文，不被外界无关信息干扰；
2. **异构模型搭配（Heterogeneous LLM Routing）**：
   - 调度主管使用顶级智商模型（如 Claude 3.5 Sonnet / OpenAI o1）做战略指挥；
   - 提取简单字段或纯机械翻译专员使用高性价比超快小模型（如 GPT-4o-mini / DeepSeek），降本达 80% 以上！
3. **内置对抗互审（Adversarial Review）**：例如让“开发者专员”写代码，让独立的“安全审计员专员”挑刺找漏洞，利用对抗博弈大幅提升最终产出质量。

---

### 三、三大经典多智能体拓扑结构

| 拓扑模式 | 协作机制 | 适用场景 |
| :--- | :--- | :--- |
| **层级主管模式 (Supervisor)** | 由一个中心主管统一拆解任务并分发给专员，专员汇报结果后由主管裁定 | 复杂企业综合项目、研究报告撰写 |
| **流水线链式模式 (Sequential)** | 前序专家的 Output 直接作为后序专家的 Input（流水线推进） | 数据爬取 -> 清洗 -> 建模 -> 报告生成 |
| **圆桌辩论/互评模式 (Debate)** | 多个平级专家针对同一方案互相挑战、质询、交叉验证并投票 | 医疗疑难诊断、金融重大投资风险评审 |
""",
            "tips": [
                {
                    "kind": "tip",
                    "text": "在层级主管网络中，主管节点通常拥有一个特殊的路由工具（Router Tool），用于决定'下一步应该把控制权交接（Handoff）给哪个专员'。"
                },
                {
                    "kind": "warning",
                    "text": "专员之间不要无限制自由对话。必须在主管层维护明确的状态轮次（Turn Limit），防止两个智能体因观点冲突陷入无休止的打字争吵循环。"
                }
            ],
            "demos": [
                {
                    "title": "纯 Python 实现层级主管 (Supervisor) 协调多专员协作与汇总控制流",
                    "lang": "python",
                    "code": """# 纯 Python 实现层级主管 (Supervisor) 调度多专员协作拓扑网络
from typing import Dict, Any

class WorkerAgent:
    def __init__(self, name: str, role: str, expertise: str):
        self.name = name
        self.role = role
        self.expertise = expertise

    def execute(self, subtask: str) -> str:
        # 模拟专员只发挥自己的专长
        if self.role == "researcher":
            return f"[专员 {self.name} 报告]: 检索到行业核心指标增长率为 18.5%，主要受益于出海业务扩展。"
        elif self.role == "analyst":
            return f"[专员 {self.name} 报告]: 基于业务数据测算，出海业务贡献了 70% 的增量利润，建议加大布局。"
        return f"[专员 {self.name}]: 处理完成。"

class SupervisorAgent:
    def __init__(self, workers: Dict[str, WorkerAgent]):
        self.workers = workers

    def run_collaborative_task(self, main_goal: str) -> dict:
        print(f"=== 主管收到总任务: '{main_goal}' ===")
        
        # 1. 阶段一：主管指派研究员专员调研
        print("\\n[主管指派] -> 交接任务给 researcher 进行情报搜集...")
        research_output = self.workers["researcher"].execute("搜集海外行业增长数据")
        print(research_output)

        # 2. 阶段二：主管将研究产出转交给分析师专员做量化评估
        print("\\n[主管指派] -> 将搜集结果交接给 analyst 进行深度财务分析...")
        analysis_output = self.workers["analyst"].execute(research_output)
        print(analysis_output)

        # 3. 阶段三：主管汇总各专员产出，生成最终战略交付物
        print("\\n[主管汇总] -> 整合专员智慧，生成最终决策简报...")
        final_summary = (
            f"【战略决策简报】围绕目标 '{main_goal}'：\\n"
            f"1. 市场情报: {research_output}\\n"
            f"2. 财务测算: {analysis_output}\\n"
            f"★ 主管最终裁定: 批准针对出海业务设立专项扩张基金！"
        )
        return {"goal": main_goal, "final_report": final_summary}

# 实例化多智能体系统
team = {
    "researcher": WorkerAgent("Alice", "researcher", "行业情报搜集"),
    "analyst": WorkerAgent("Bob", "analyst", "财务量化分析")
}

supervisor = SupervisorAgent(team)
delivery = supervisor.run_collaborative_task("评估拓展中东市场的可行性")

print("\\n" + delivery["final_report"])
assert "中东市场" in delivery["final_report"]
assert "批准针对出海业务设立专项扩张基金" in delivery["final_report"]

print()
print("[OK] 层级多智能体主管调度网络测试通过！")
"""
                }
            ]
        },
        {
            "id": "agent-l6-2",
            "title": "CrewAI 角色扮演架构哲学与复杂协作落地",
            "difficulty": 2,
            "content": """### 学习目标与先修要求

- **先修要求**：了解面向对象组合模式、任务队列与上下文上下文传递机制。
- **能力目标**：
  1. 精通开源顶尖多智能体框架 **CrewAI** 的四大核心基石（`Agent`, `Task`, `Crew`, `Process`）；
  2. 深入理解通过 `role`, `goal` 与 `backstory` 进行人物角色扮演对于激活大模型专业潜能的机理；
  3. 掌握多智能体协作中的上下文依赖链路与防止“无休止踢皮球（Delegation Ping-Pong）”工程治理方案。

---

### 一、CrewAI 的核心哲学：结构化角色扮演 (Role-Playing)

在目前最火爆的多智能体框架 **CrewAI** 中，软件工程被抽象为一个**协同工作的专业船员团队（Crew）**。其核心模型包含：

```
┌────────────────────────────────────────────────────────┐
│                      Crew (团队容器)                   │
│                                                        │
│  ┌────────────────────────┐    ┌────────────────────┐  │
│  │   Agent (船员专员)     │    │   Task (专项任务)  │  │
│  │  - role: 业务角色      │    │  - description     │  │
│  │  - goal: 核心目标      │───>│  - expected_output │  │
│  │  - backstory: 背景故事 │    │  - agent (负责人)  │  │
│  │  - tools: 专属工具     │    │  - context: 前置依赖│  │
│  └────────────────────────┘    └────────────────────┘  │
│                                                        │
│  执行流程调度: Process.sequential (顺序) / hierarchical│
└────────────────────────────────────────────────────────┘
```

#### 为什么 `backstory`（背景故事）如此重要？
心理学与大模型对齐研究表明：单纯告诉模型“你是一个程序员”，模型只能激发平均水平的通识代码。
如果赋予其饱满、权威的 `backstory`：
> *"你拥有 15 年 Linux 内核与 CPython 源码开发经验，曾主导过千万级高并发中间件架构，对哪怕 1 微秒的性能开销和 1 字节的内存泄漏都保持着洁癖般的审视态度..."*
**大模型会被深度锚定在专家自注意力子空间中**，生成的代码与审核批注质量呈现质的飞跃！

---

### 二、多智能体治理：防范“无休止踢皮球”死循环

在开放委派权限（`allow_delegation=True`）时，生产环境常出现严重 bug：
- 专员 A 收到任务：“这事需要查数据，我委派给专员 B”；
- 专员 B 收到委派：“这数据需要分析，我委派给专员 A”；
- 两个智能体开始无限相互委派，迅速耗光上下文配额并导致程序挂起！

#### 治理防御工事：
1. **委派深度计数器（Delegation Depth Cap）**：设定单条任务链最大委派次数（如 `max_delegation = 2`），超出后强制必须由当前接收人亲自执行；
2. **明确的任务输入-输出契约（`expected_output`）**：在 Task 中定义严格的交付格式（如“必须输出包含 3 点结论的 Markdown 列表”），不满足契约禁止向下游交割。
""",
            "tips": [
                {
                    "kind": "tip",
                    "text": "使用 Task 的 context=[task_previous] 属性，可以像搭积木一样将前一个专员的产出无缝注入为后一个专员的上下文背景知识。"
                },
                {
                    "kind": "warning",
                    "text": "除非任务特别复杂，否则生产环境中尽量优先使用确定性更强的 Process.sequential（顺序流水线），而非全自动的 hierarchical（纯自主主管调度），以获得最高的可控性与调试体验。"
                }
            ],
            "demos": [
                {
                    "title": "纯 Python 手写 CrewAI 核心模型与防踢皮球委派熔断引擎",
                    "lang": "python",
                    "code": """# 纯 Python 实现 CrewAI 核心抽象 (Agent, Task, Crew) 及防无休止委派熔断引擎
from typing import List, Dict, Optional

class CrewAgent:
    def __init__(self, role: str, goal: str, backstory: str, allow_delegation: bool = False):
        self.role = role
        self.goal = goal
        self.backstory = backstory
        self.allow_delegation = allow_delegation

    def execute_task(self, task_description: str, context: Optional[str] = None) -> str:
        prompt = f"[{self.role}] 目标: {self.goal}\\n人设背景: {self.backstory}\\n执行任务: {task_description}"
        if context:
            prompt += f"\\n前置输入上下文: {context}"
        # 模拟生成专业产出
        return f"产出完成: 基于角色 [{self.role}]，处理完毕 -> {task_description[:30]}..."

class CrewTask:
    def __init__(self, description: str, expected_output: str, agent: CrewAgent, context_tasks: list = None):
        self.description = description
        self.expected_output = expected_output
        self.agent = agent
        self.context_tasks = context_tasks or []
        self.output: Optional[str] = None

class CrewPipeline:
    def __init__(self, agents: List[CrewAgent], tasks: List[CrewTask], max_delegations: int = 2):
        self.agents = agents
        self.tasks = tasks
        self.max_delegations = max_delegations
        self.delegation_count = 0

    def kickoff(self) -> dict:
        print("=== Crew 团队起航启动任务流水线 ===")
        results = {}
        for idx, task in enumerate(self.tasks, 1):
            print(f"\\n--- 正在推进任务 {idx}: {task.description} ---")
            print(f"负责专员: [{task.agent.role}]")

            # 组装前置任务上下文
            context_text = ""
            for prev in task.context_tasks:
                if prev.output:
                    context_text += f"\\n[参考前置产出]: {prev.output}"

            # 执行任务
            task.output = task.agent.execute_task(task.description, context_text)
            print(f"任务 {idx} 交付结果: {task.output}")
            results[f"task_{idx}"] = task.output

        return results

# 1. 定义具备饱满 Backstory 的专业角色
writer = CrewAgent(
    role="资深技术写作专家",
    goal="用通俗严谨的语言向非技术人员解释前沿技术",
    backstory="拥有 10 年顶尖科技专栏作家经验，擅长把高深架构拆解为生动比喻"
)

editor = CrewAgent(
    role="主编与事实核验员",
    goal="审查技术文稿的事实准确度与文字排版风格",
    backstory="知名技术出版社前总编，对语法瑕疵与模糊断言有极强的敏锐度"
)

# 2. 定义具备上下文依赖的串联任务
t1 = CrewTask(
    description="撰写一篇关于向量数据库工作原理的科普文章草稿",
    expected_output="一份包含 3 个核心比喻的完整草稿",
    agent=writer
)

t2 = CrewTask(
    description="全面审阅 t1 的草稿并修正不准确的表述",
    expected_output="一份带修订批注的终稿",
    agent=editor,
    context_tasks=[t1] # 依赖 t1 的产出
)

# 3. 编队起航
crew = CrewPipeline(agents=[writer, editor], tasks=[t1, t2])
final_deliverables = crew.kickoff()

assert "task_1" in final_deliverables
assert "task_2" in final_deliverables
print()
print("[OK] Crew 角色扮演与上下文流水线引擎验证通过！")
"""
                }
            ]
        }
    ],
    "exercises": [
        {
            "id": "agent-ex-41",
            "type": "single",
            "difficulty": 1,
            "question": "在复杂大模型工程中，相比把所有功能塞给单个全能 Agent，引入多智能体系统（Multi-Agent System）最核心的架构动因是什么？",
            "options": [
                {"value": "A", "label": "实现关注点分离（Separation of Concerns），让各专员拥有纯粹的人设、独立上下文与专属工具，避免单一 Prompt 认知过载与指令冲突"},
                {"value": "B", "label": "为了把代码文件数量人为膨胀到 1000 个以上"},
                {"value": "C", "label": "因为单智能体永远无法调用任何 Python 函数"},
                {"value": "D", "label": "纯粹是为了方便在 PPT 上画复杂的拓扑图"}
            ],
            "answer": "A",
            "explanation": "多智能体系统的核心优势在于模块化与关注点分离。每个 Agent 专注专一领域，上下文纯净，工具针对性强，还能按需选用大小不同规格的异构 LLM 组合，大幅提升整体鲁棒性与性价比。",
            "tags": ["Multi-Agent", "关注点分离", "系统架构"]
        },
        {
            "id": "agent-ex-42",
            "type": "single",
            "difficulty": 1,
            "question": "在层级主管协作拓扑模式（Hierarchical / Supervisor Pattern）中，主管智能体（Supervisor）的主要职责是什么？",
            "options": [
                {"value": "A", "label": "亲自编写所有的底层 SQL 查询与正则代码"},
                {"value": "B", "label": "负责宏观任务拆解、把子任务交接（Handoff）分发给合适的专员，并最终汇总审核各专员的产出成果"},
                {"value": "C", "label": "把所有收到的任务直接原地删除"},
                {"value": "D", "label": "禁止下属专员执行任何操作"}
            ],
            "answer": "B",
            "explanation": "Supervisor 充当项目经理/总指挥角色，负责宏观目标分解、按专员擅长领域分发调度（Task Handoff），并在专员汇报后进行汇总、复核与最终交付。",
            "tags": ["Supervisor", "层级主管", "协作模式"]
        },
        {
            "id": "agent-ex-43",
            "type": "single",
            "difficulty": 2,
            "question": "在 CrewAI 框架的角色定义中，为 Agent 赋予详实的 `backstory`（背景故事设定）对大模型输出质量的主要积极影响是？",
            "options": [
                {"value": "A", "label": "能够自动将大模型的参数量翻倍"},
                {"value": "B", "label": "利用大模型的注意力激活机制，将模型深度锚定在特定资深专家的人设、视角与专业思维方式中，显著提升输出的专业深度与严谨性"},
                {"value": "C", "label": "用于在终端打印彩色的欢迎动画"},
                {"value": "D", "label": "让大模型强制用文言文进行所有的系统通信"}
            ],
            "answer": "B",
            "explanation": "Backstory 不仅是背景介绍，更是深度提示词锚点。饱满的专家资历与行为准则能够激发模型高权重专家注意力子空间的表达，大幅改善回答的专业气质与严密程度。",
            "tags": ["Backstory", "CrewAI", "角色扮演"]
        },
        {
            "id": "agent-ex-44",
            "type": "judge",
            "difficulty": 1,
            "question": "在多智能体系统中，不同专员可以根据任务复杂度灵活配备不同的大语言模型（例如让主管专员使用推理能力极强的模型，而让机械数据清洗专员使用轻量低成本小模型），从而在保障质量的同时大幅降低运行成本。",
            "options": [
                {"value": "true", "label": "正确"},
                {"value": "false", "label": "错误"}
            ],
            "answer": "true",
            "explanation": "这是生产级 MAS 的王牌设计策略：按需进行异构模型路由（Heterogeneous LLM Routing），避免所有节点都使用昂贵模型，实现系统级最优性价比。",
            "tags": ["异构模型", "成本优化", "最佳实践"]
        },
        {
            "id": "agent-ex-45",
            "type": "fill",
            "difficulty": 2,
            "question": "在 CrewAI 框架中，用于配置某个智能体是否被允许将自身无法处理的子任务自主委派转交给其他同事专员的布尔型参数名称是 allow_________ 。",
            "blanks": [["_delegation", "delegation"]],
            "explanation": "CrewAI 中的 `allow_delegation: bool` 参数控制专员是否能向下属或平级发起 Task Delegation。若为 False 则强制该专员只能由自己亲自解决任务。",
            "tags": ["allow_delegation", "CrewAI", "委派机制"]
        },
        {
            "id": "agent-ex-46",
            "type": "multiple",
            "difficulty": 2,
            "question": "多智能体协作网络中常见的经典协同拓扑模式包括哪些？",
            "options": [
                {"value": "A", "label": "层级主管模式（Hierarchical / Supervisor Pattern）"},
                {"value": "B", "label": "顺序流水线模式（Sequential Pipeline Pattern）"},
                {"value": "C", "label": "圆桌讨论与对抗辩论模式（Debate / Round-Robin Pattern）"},
                {"value": "D", "label": "随机丢弃所有输入模式"}
            ],
            "answer": ["A", "B", "C"],
            "explanation": "主管分发、流水线接力与圆桌互审辩论是当今业界最主流的三大协作拓扑。选项 D 纯属恶意干扰项。",
            "tags": ["协同拓扑", "MAS", "模式大全"]
        },
        {
            "id": "agent-ex-47",
            "type": "multiple",
            "difficulty": 2,
            "question": "在开放多智能体自由委派（Delegation）机制的生产环境中，防止专员之间出现“无休止相互踢皮球”死循环的有效治理手段包括哪些？",
            "options": [
                {"value": "A", "label": "设定全局最大委派深度（Max Delegation Depth），达到上限后强制当前专员必须亲自执行"},
                {"value": "B", "label": "在 Task 定义中严格规定预期的交付物格式契约（expected_output），不符合标准禁止交割"},
                {"value": "C", "label": "在关键节点引入人工审核（HITL）介入干预"},
                {"value": "D", "label": "切断服务器网线"}
            ],
            "answer": ["A", "B", "C"],
            "explanation": "委派深度熔断、清晰的交付物格式契约以及必要时的人工介入，是解决多智能体相互推诿死循环的核心工程防御手段。选项 D 荒诞不经。",
            "tags": ["防踢皮球", "治理机制", "委派熔断"]
        },
        {
            "id": "agent-ex-48",
            "type": "code",
            "difficulty": 3,
            "question": "请编写一个名为 `run_agent_pipeline` 的顺序多智能体流水线执行函数。要求：接受一个初始输入文本 `initial_input` (str) 与一个专员列表 `agents`（每个专员为一个拥有 `.process(text) -> str` 方法的对象）；数据按照流水线从左到右依次传递：前一个专员的输出作为下一个专员的输入；函数最终返回最后一个专员生成的最终结果字符串；若 agents 列表为空，直接返回 initial_input。",
            "setupCode": "",
            "answer": "def run_agent_pipeline(initial_input: str, agents: list) -> str:\n    current = initial_input\n    for agent in agents:\n        current = agent.process(current)\n    return current\n",
            "tests": "# 测试用例 1: 两专员流水线接力\nclass Worker1:\n    def process(self, txt):\n        return f'W1({txt})'\n        \nclass Worker2:\n    def process(self, txt):\n        return f'W2({txt})'\n\nres1 = run_agent_pipeline('data', [Worker1(), Worker2()])\nassert res1 == 'W2(W1(data))'\n\n# 测试用例 2: 空专员列表原样返回\nassert run_agent_pipeline('raw', []) == 'raw'\n\nprint('run_agent_pipeline test cases passed!')\n",
            "explanation": "遍历 agents 列表，将当前累积的文本变量作为入参传递给每一个 agent.process()，并将返回值覆盖赋给当前变量，实现顺序流水线传递。",
            "tags": ["顺序流水线", "MAS", "编程实战"]
        }
    ]
}
