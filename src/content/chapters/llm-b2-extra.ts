import type { Chapter } from '../../types';

/* ============================================================
 *  《AI Agent 工程》补充章节（c3~c4）
 *  参考：Lilian Weng《LLM Powered Autonomous Agents》、ReAct、
 *       Reflexion、Toolformer、AutoGen、LangGraph 文档
 * ============================================================ */

export const llmB2Extra: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c3：记忆体系与上下文工程
   * ============================================================ */
  {
    id: 'llm-b2-c3',
    title: '记忆体系与上下文工程',
    goal: '掌握短期/工作/长期三层记忆的设计，理解上下文压缩策略与向量记忆的实现要点。',
    lessons: [
      {
        id: 'llm-b2-c3-l1',
        title: '三层记忆架构',
        content: `
### 学习目标

学完本节，你应该能够：
1. 填出三层记忆表（内容/存储/生命周期）；
2. 实现滑动窗口与滚动摘要，说出摘要必须保留的四类信息；
3. 演示工具结果裁剪的成本收益，用 JSON 状态实现工作记忆、向量检索实现长期记忆。

### 前置知识

- c2 的 Agent 心跳循环与工具调用。

### 问题背景

上下文窗口有限且越长越贵：Agent 一跑几十步，工具返回动辄数万 token，不分级管理就是『把整个档案馆搬进办公室』。三层记忆（短期/工作/长期）是 Agent 从 demo 走向生产的分水岭。

### 直觉理解

短期记忆是桌面（只放正在处理的几页纸）；工作记忆是任务清单（JSON 状态：做到哪、还欠什么、关键数字）；长期记忆是档案柜（embedding 后按相似度取用）。最值钱的一条：工具返回的 5 万 token 网页裁剪成 500 token 摘要——这是 Agent 成本优化的第一优先级。

### 核心概念与原理详解

## 为什么 Agent 需要记忆

Agent 多轮执行会产生大量中间信息：工具返回、推理过程、用户反馈。
上下文窗口有限（且越长越贵越慢），因此必须分层管理。

## 三层记忆

| 层级 | 内容 | 存储 | 生命周期 |
| --- | --- | --- | --- |
| **短期记忆** | 最近几轮对话 + 最近几次工具结果 | 上下文窗口 | 当前任务 |
| **工作记忆** | 任务计划、已完成子目标、关键事实 | 结构化状态（JSON） | 当前任务 |
| **长期记忆** | 用户偏好、历史经验、领域知识 | 向量库 / 数据库 | 跨会话 |

## 短期记忆的压缩策略

**1. 滑动窗口**

只保留最近 N 轮。简单但会丢失早期关键信息。

**2. 滚动摘要（Rolling Summary）**

把早期对话总结成一段，替换掉原文：

    def compress(messages, keep_recent=4):
        old, recent = messages[:-keep_recent], messages[-keep_recent:]
        summary = llm("用 200 字总结关键信息与未完成事项：" + format(old))
        return [{"role": "system", "content": "之前摘要：" + summary}] + recent

**摘要要保留什么**：用户的明确要求、已确认的事实、未完成的事项、做出的决定。

**3. 工具结果裁剪（最重要）**

一个网页抓取工具可能返回 **50000 token**，摘要后只剩 500。
这是 Agent 成本优化的第一优先级。

**裁剪策略**：
- 只保留与当前任务相关的字段（如从 JSON 中提取特定 key）；
- 长文本先摘要；
- 截断 + 提示"内容过长已截断"；
- 结构化数据只保留前 N 行 + 统计信息。

## 工作记忆：结构化状态

不要依赖对话历史来记住"做到哪一步"，而是显式维护状态：

    {
      "goal": "分析销售数据并生成报告",
      "subtasks": [
        {"task": "读取 CSV", "status": "done", "result": "1000 行 × 8 列"},
        {"task": "检查缺失值", "status": "done", "result": "price 列缺 12 个"},
        {"task": "生成图表", "status": "in_progress"}
      ],
      "facts": {"total_revenue": 125000, "top_category": "数码"}
    }

**优势**：
1. 即使对话历史被压缩，状态依然完整；
2. 便于人工介入（看一眼 JSON 就知道进度）；
3. 支持断点续跑；
4. 每步都可以只把"当前任务"放进上下文，大幅省 token。

## 长期记忆：向量记忆

把重要信息 embedding 后存库，按相似度检索：

    def remember(text, meta):
        vector_db.insert(embed(text), text, meta)

    def recall(query, k=3):
        return vector_db.search(embed(query), k)

**典型内容**：
- 用户偏好（"喜欢简洁回答"、"用中文"）；
- 历史任务的成功经验（"这种报错上次是这样解掉的"）；
- 领域知识与术语。

**必须支持遗忘与纠错**：错误记忆一旦写入，会在后续所有会话中持续影响输出。
用户应能查看、修改、删除记忆。

## 上下文工程的三条原则

1. **能不放就不放**：无关信息一律不进上下文；
2. **能压缩就压缩**：工具结果先摘要，长文档只放相关片段；
3. **重要信息前置**：关键约束放系统提示开头，
   并在关键时刻重复（模型的"中间遗忘"效应）。

## 记忆 vs RAG 的区别

| | 记忆 | RAG |
| --- | --- | --- |
| 数据来源 | Agent 自身经历 | 外部知识库 |
| 写入 | 在线、持续 | 离线、批量 |
| 内容 | 偏好、经验、状态 | 文档、事实 |
| 检索 | 相似度 + 时间衰减 + 重要性 | 相似度 + 元数据 |

两者常结合：知识库用 RAG，用户偏好与历史经验用记忆。

<RMCArchDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np, json

# ---- 1. 滑动窗口 + 滚动摘要 ----
history = [f"第{i}轮对话/工具结果" for i in range(1, 9)]
keep = 4
summary = "摘要：用户在分析销售数据；已完成读 CSV 与缺失值检查；待办：生成图表。"
ctx = [summary] + history[-keep:]
print("上下文压缩: 8 轮 ->", len(ctx), "条（1 摘要 + 4 近期）")

# ---- 2. 工具结果裁剪（成本优化第一优先级）----
big = {"items": [{"id": i, "title": f"商品{i}", "desc": "x"*200} for i in range(500)]}
full = len(json.dumps(big, ensure_ascii=False))
slim = {"total": len(big["items"]), "top5": [{"id": it["id"], "title": it["title"]} for it in big["items"][:5]]}
print(f"工具返回 {full} 字符 -> 裁剪后 {len(json.dumps(slim, ensure_ascii=False))} 字符")

# ---- 3. 工作记忆：结构化 JSON 状态 ----
state = {"goal": "分析销售数据并生成报告",
         "subtasks": [{"task": "读取 CSV", "status": "done", "result": "1000 行 × 8 列"},
                      {"task": "检查缺失值", "status": "done", "result": "price 缺 12"},
                      {"task": "生成图表", "status": "in_progress"}],
         "facts": {"total_revenue": 125000, "top_category": "数码"}}
print("待办任务:", [s["task"] for s in state["subtasks"] if s["status"] != "done"])

# ---- 4. 长期记忆：哈希嵌入 + 余弦检索 ----
def embed(text, dim=64):
    v = np.zeros(dim)
    for ch in text: v[ord(ch) % dim] += 1
    return v / (np.linalg.norm(v) + 1e-9)
mem = ["用户喜欢简洁回答", "用户偏好中文", "上次 CSV 报错是编码问题：utf-8", "项目截止周五"]
M = np.array([embed(t) for t in mem])
sims = M @ embed("csv 读取报错怎么解决")
top = sims.argsort()[::-1][:2]
print("检索到:", [mem[i] for i in top], "相似度:", np.round(sims[top], 3))\`\`\`

预期输出（实测）：上下文压缩：8 轮 → 5 条（1 摘要 + 4 近期）；工具返回 121291 字符 → 裁剪后 159 字符（约 760 倍）；工作记忆待办 ['生成图表']；向量检索『csv 读取报错』命中『上次 CSV 报错是编码问题：utf-8』（相似度 0.306）。

**常见错误**：用『把全部历史塞进上下文』当记忆，token 成本线性爆炸且早期信息被挤掉；摘要只保留寒暄丢掉『未完成事项』，恢复会话后 Agent 忘了要干什么；向量检索不做元数据过滤，把别的用户的偏好检索进来。

### 常见误区

1. **『上下文越长越好』**——长上下文贵、慢且中间信息利用率下降（lost in the middle），该裁剪就裁剪；\\n2. **『工作记忆=对话历史』**——显式 JSON 状态才支持断点续跑与人工介入；\\n3. **『向量库=万能记忆』**——它只解决相似度检索，时序、因果与结构化约束要靠数据库与状态机。

### 知识关联

- **向前**：c4 评估里的『记忆检索准确率』就是本章质量的度量；
- **向后**：c6 可观测性中的 trace 让你看见每一步实际进了什么上下文；
- **平行**：llm-b1 的 RAG 是长期记忆检索的标准工程形态。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 三层 | 短期（窗口）/ 工作（JSON 状态）/ 长期（向量库/DB）|
| 压缩 | 滑动窗口、滚动摘要、工具结果裁剪（第一优先级）|
| 工作记忆 | 目标+子任务状态+关键事实，支持断点续跑 |
| 向量记忆 | embed→存→相似检索，偏好与经验跨会话复用 |
| 成本 | 上下文越长越贵越慢，主动裁剪是纪律 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Yao et al. (2022) arXiv:2210.03629《ReAct》、Shinn et al. (2023) arXiv:2303.11366《Reflexion》、Anthropic《Building effective agents》与 MCP 官方文档 modelcontextprotocol.io 相应章节）
`,
        tips: [
          {
            kind: 'performance',
            text: '优化 Agent 成本最有效的一招是裁剪工具返回值。一个网页抓取可能几万 token，摘要后只剩几百。',
          },
          {
            kind: 'leak',
            text: '用结构化 JSON 维护工作记忆，比依赖对话历史可靠得多，也便于人工介入与断点续跑。',
          },
          {
            kind: 'pitfall',
            text: '长期记忆必须支持删除与纠错。错误记忆会被长期放大，且用户有权知道自己被记住了什么。',
          },
        ],
        demos: [
          {
            title: '滑动窗口 + 摘要压缩',
            lang: 'python',
            code: `def fake_summarize(texts):
    """模拟 LLM 摘要（取每条前 15 字）。"""
    return "；".join(t[:15] for t in texts)

def compress_history(messages, keep_recent=2):
    if len(messages) <= keep_recent:
        return messages, None
    old = messages[:-keep_recent]
    recent = messages[-keep_recent:]
    summary = fake_summarize([m["content"] for m in old])
    return (
        [{"role": "system", "content": "之前对话摘要：" + summary}] + recent,
        summary,
    )

msgs = [
    {"role": "user", "content": "帮我分析这份销售数据，重点看华东区"},
    {"role": "assistant", "content": "好的，我先读取 CSV 文件并检查结构"},
    {"role": "tool", "content": "已读取 1000 行 8 列数据，含 region 字段"},
    {"role": "assistant", "content": "检查发现 price 列有 12 个缺失值，已用中位数填充"},
    {"role": "user", "content": "现在生成图表"},
]

before = sum(len(m["content"]) for m in msgs)
compressed, summary = compress_history(msgs, keep_recent=1)
after = sum(len(m["content"]) for m in compressed)

print(f"原始：{len(msgs)} 条消息，{before} 字符")
print(f"压缩后：{len(compressed)} 条消息，{after} 字符（{(after/before):.0%}）")
print(f"摘要：{summary}")
print()
print("关键：摘要保留了'华东区'这个核心约束，否则后续图表会画错范围。")`,
          },
          {
            title: '工具结果裁剪',
            lang: 'python',
            code: `import json

def trim_tool_result(raw, max_chars=200, keep_keys=None):
    """裁剪工具返回，只保留关键字段。"""
    try:
        data = json.loads(raw)
    except Exception:
        return raw[:max_chars] + ("...[已截断]" if len(raw) > max_chars else "")

    if isinstance(data, dict) and keep_keys:
        data = {k: v for k, v in data.items() if k in keep_keys}

    s = json.dumps(data, ensure_ascii=False)
    if len(s) > max_chars:
        s = s[:max_chars] + "...[已截断]"
    return s

# 模拟一个返回大量数据的搜索工具
big = json.dumps({
    "total": 1287,
    "items": [{"id": i, "title": "商品" + str(i), "desc": "描述" * 50} for i in range(20)],
    "debug": {"raw_query": "SELECT * FROM ...", "trace": "x" * 500},
}, ensure_ascii=False)

print(f"原始长度: {len(big)} 字符")
trimmed = trim_tool_result(big, max_chars=150, keep_keys=["total", "items"])
print(f"裁剪后: {len(trimmed)} 字符")
print(f"压缩率: {1 - len(trimmed)/len(big):.0%}")
print()
print("裁剪后:", trimmed[:150])`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-b2-c3-e1',
        type: 'single',
        difficulty: 2,
        question: '优化 Agent 成本最有效的单一手段通常是？',
        options: [
          { value: 'A', text: '换更小的模型' },
          { value: 'B', text: '裁剪工具返回值，避免大量无关内容进入上下文' },
          { value: 'C', text: '减少工具数量' },
          { value: 'D', text: '关闭流式输出' },
        ],
        answer: 'B',
        explanation: '一次网页抓取/数据库查询可能返回几万 token，摘要或只保留关键字段能砍掉绝大部分成本，且不影响任务质量。',
        tags: ['上下文工程'],
      },
      {
        id: 'llm-b2-c3-e2',
        type: 'judge',
        difficulty: 2,
        question: 'Agent 的工作记忆（任务状态）最好用结构化 JSON 显式维护，而不是依赖对话历史。',
        answer: true,
        explanation: '对话历史会被压缩丢失，而结构化状态始终完整。它还便于人工介入检查进度、支持断点续跑、并且每步只需把当前任务放进上下文。',
        tags: ['记忆'],
      },
      {
        id: 'llm-b2-c3-e3',
        type: 'multiple',
        difficulty: 3,
        question: '长期向量记忆必须支持哪些能力？（多选）',
        options: [
          { value: 'A', text: '写入（记住新信息）' },
          { value: 'B', text: '按相似度检索' },
          { value: 'C', text: '删除与纠错' },
          { value: 'D', text: '无限增长永不清理' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: 'D 错误：错误记忆会长期放大，且存储成本无限增长。必须支持遗忘与纠错，用户也应能查看自己被记住了什么。',
        tags: ['记忆'],
      },
      {
        id: 'llm-b2-c3-e4',
        type: 'fill',
        difficulty: 3,
        question: 'Agent 的三层记忆是：短期记忆（上下文窗口）、___记忆（结构化任务状态）、长期记忆（向量库）。',
        blanks: [['工作', 'working', 'Working']],
        explanation: '工作记忆用 JSON 等结构化形式维护任务进度与关键事实，既能压缩上下文，又便于人工介入与断点续跑。',
        tags: ['记忆'],
      },
      {
        id: 'llm-b2-c3-e5',
        type: 'code',
        difficulty: 2,
        question: '实现 `compress_history(messages, keep_recent)`：\n\n- 保留最近 `keep_recent` 条消息\n- 把更早的消息压缩成一条 system 摘要：`"之前对话摘要：" + 每条内容前 10 字，用；连接`\n- 若消息数 ≤ keep_recent 则原样返回',
        starterCode: `def compress_history(messages, keep_recent=2):
    if len(messages) <= keep_recent:
        return messages
    old = ___
    recent = ___
    summary = {"role": "system", "content": "之前对话摘要：" + "；".join(m["content"][:10] for m in old)}
    return ___


compress_history([{"role": "user", "content": "帮我分析销售数据"}, {"role": "assistant", "content": "好的，先读取文件"}, {"role": "user", "content": "现在画图"}], 1)
`,
        setupCode: '',
        expectedOutput: '2 条消息',
        tests: `msgs = [
    {"role": "user", "content": "帮我分析销售数据"},
    {"role": "assistant", "content": "好的，先读取文件"},
    {"role": "user", "content": "现在画图"},
]
out = compress_history(msgs, 1)
assert len(out) == 2, f"应压缩为 2 条，实际 {len(out)}"
assert out[0]["role"] == "system", "首条应为 system 摘要"
assert out[0]["content"].startswith("之前对话摘要："), "摘要前缀不正确"
assert out[1]["content"] == "现在画图", "最近一条应原样保留"
short = [{"role": "user", "content": "hi"}]
assert compress_history(short, 3) == short, "消息不足时应原样返回"
`,
        answer: `def compress_history(messages, keep_recent=2):
    if len(messages) <= keep_recent:
        return messages
    old = messages[:-keep_recent]
    recent = messages[-keep_recent:]
    summary = {"role": "system", "content": "之前对话摘要：" + "；".join(m["content"][:10] for m in old)}
    return [summary] + recent


compress_history([{"role": "user", "content": "帮我分析销售数据"}, {"role": "assistant", "content": "好的，先读取文件"}, {"role": "user", "content": "现在画图"}], 1)`,
        explanation:
          '```python\nold = messages[:-keep_recent]\nrecent = messages[-keep_recent:]\nsummary = {"role": "system", "content": "之前对话摘要：" + "；".join(m["content"][:10] for m in old)}\nreturn [summary] + recent\n```\n\n**切片技巧**：`[:-keep_recent]` 取除最后 N 条外的全部，`[-keep_recent:]` 取最后 N 条。\n\n真实场景摘要由 LLM 生成，并强调保留"未完成事项"与"关键约束"。',
        tags: ['编程', '记忆压缩'],
      },
      {
        id: 'llm-b2-c3-e6',
        type: 'code',
        difficulty: 3,
        question: '实现工具结果裁剪 `trim_dict(data, keep_keys, max_chars)`：\n\n1. 若 `data` 是 dict 且有 `keep_keys`，只保留这些 key\n2. 序列化为 JSON 字符串（`ensure_ascii=False`）\n3. 若超过 `max_chars`，截断并追加 `"...[已截断]"`\n\n返回字符串。',
        starterCode: `import json

def trim_dict(data, keep_keys=None, max_chars=100):
    if isinstance(data, dict) and keep_keys:
        data = ___
    s = json.dumps(data, ensure_ascii=False)
    if len(s) > max_chars:
        s = ___
    return s


trim_dict({"a": 1, "b": "x" * 100, "c": 3}, keep_keys=["a", "c"], max_chars=50)
`,
        setupCode: '',
        expectedOutput: '只含 a 与 c',
        tests: `out = trim_dict({"a": 1, "b": "x" * 100, "c": 3}, keep_keys=["a", "c"], max_chars=50)
assert "b" not in out, "应裁掉未保留的 key"
assert '"a"' in out and '"c"' in out, "应保留指定 key"

long_out = trim_dict({"x": "y" * 200}, max_chars=20)
assert len(long_out) <= 20 + len("...[已截断]"), f"超长应截断，实际长度 {len(long_out)}"
assert long_out.endswith("...[已截断]"), "截断应带标记"

short_out = trim_dict({"k": "v"}, max_chars=100)
assert "已截断" not in short_out, "未超长不应截断"
`,
        answer: `import json

def trim_dict(data, keep_keys=None, max_chars=100):
    if isinstance(data, dict) and keep_keys:
        data = {k: v for k, v in data.items() if k in keep_keys}
    s = json.dumps(data, ensure_ascii=False)
    if len(s) > max_chars:
        s = s[:max_chars] + "...[已截断]"
    return s


trim_dict({"a": 1, "b": "x" * 100, "c": 3}, keep_keys=["a", "c"], max_chars=50)`,
        explanation:
          '```python\nif isinstance(data, dict) and keep_keys:\n    data = {k: v for k, v in data.items() if k in keep_keys}\ns = json.dumps(data, ensure_ascii=False)\nif len(s) > max_chars:\n    s = s[:max_chars] + "...[已截断]"\nreturn s\n```\n\n**`ensure_ascii=False`** 很重要：否则中文会变成 `\\uXXXX`，token 数暴增。\n\n截断标记能提示模型"内容不完整"，避免它基于残缺数据下结论。',
        tags: ['编程', '上下文压缩'],
      },
      {
        id: 'llm-b2-c3-e7',
        type: 'judge',
        difficulty: 3,
        question: '记忆（Memory）和 RAG 是同一件事，只是叫法不同。',
        answer: false,
        explanation: 'RAG 检索外部知识库（离线、批量写入）；记忆是 Agent 自身的经历（在线、持续写入），包含用户偏好、历史经验等。两者常结合使用但目的不同。',
        tags: ['记忆', 'RAG'],
      },
      {
        id: 'llm-b2-c3-e8',
        type: 'open',
        difficulty: 4,
        question: '设计一个客服 Agent 的记忆系统。请说明：① 三层记忆各存什么；② 记忆如何写入与更新；③ 如何检索并放进上下文；④ 如何处理隐私与纠错。',
        referenceAnswer: `**① 三层记忆的内容**

- **短期记忆**：最近 6~8 轮对话 + 最近 3 次工具调用的结果（订单查询、物流轨迹）。
  超出后做滚动摘要。
- **工作记忆**（结构化 JSON）：
  \`\`\`json
  {
    "user_id": "u123",
    "current_order": {"id": "A88", "status": "已发货", "amount": 299},
    "issue_type": "物流延迟",
    "confirmed_facts": ["用户要求改地址", "已核对身份"],
    "pending_actions": ["提交改地址申请"],
    "step": 3
  }
  \`\`\`
- **长期记忆**（向量库 + 结构化表）：
  - 用户偏好："偏好短信通知"、"对赔付金额敏感"；
  - 历史工单摘要："上次因物流延迟获得 20 元补偿"；
  - 会员等级、常用收货地址等结构化字段。

**② 写入与更新**

- 短期/工作记忆：每轮自动更新（对话结束或工具返回后立刻写）；
- 长期记忆：**不是每句话都写**，而是在关键事件触发时抽取：
  - 用户明确表达偏好（"以后都发短信给我"）；
  - 任务完成（工单解决 → 写一条经验摘要）；
  - 用户纠正（"不是这个订单" → 修正事实）。
- 写入前做去重与冲突检测（同一事实的新旧版本，保留最新并记录来源）。

**③ 检索与放入上下文**

顺序：工作记忆（必放）→ 长期记忆检索（Top-3）→ 短期记忆（最近若干轮）。
- 工作记忆始终全量放入（结构化、token 少）；
- 长期记忆按当前 query + user_id 过滤后向量检索，只取 Top-3；
- 短期记忆按滑动窗口 + 摘要。

总量控制：整个上下文控制在 3~4K token 以内。

**④ 隐私与纠错**

- 分级存储：敏感信息（身份证、银行卡）**不写入长期记忆**，仅在使用时临时引用；
- 用户可查看"你记住我什么"并删除任意条目（合规要求）；
- 记忆条目带 \`created_at\` 与 \`source\`，出问题可追溯；
- 定期过期策略：偏好类记忆 180 天未更新则降权，经验类记忆按成功率排序淘汰；
- 冲突处理：新事实与旧记忆冲突时，以新为准但保留旧记录（可回溯）；
- 跨用户隔离：检索时必须按 \`user_id\` 强过滤，防止信息泄漏。`,
        rubric: [
          { point: '三层记忆内容定义清晰且各有分工', score: 2 },
          { point: '长期记忆按关键事件触发写入，而非全量记录', score: 2 },
          { point: '检索有顺序与数量控制，整体上下文可控', score: 2 },
          { point: '隐私（敏感信息不落库）、用户可查看删除、跨用户隔离', score: 2 },
        ],
        keywords: ['三层记忆', '工作记忆', '事件触发', 'Top-3', 'user_id 过滤', '可删除'],
        explanation: '这道题考察 Agent 记忆系统的完整设计能力，尤其"何时写、写什么、如何隔离"是易错点。',
        tags: ['记忆', '系统设计'],
      },
    ],
  },

  /* ============================================================
   *  c4：Agent 评估与生产化
   * ============================================================ */
  {
    id: 'llm-b2-c4',
    title: 'Agent 评估与生产化',
    goal: '掌握结果/轨迹/组件三层评估，理解可观测性设计，并建立上线前的检查清单。',
    lessons: [
      {
        id: 'llm-b2-c4-l1',
        title: 'Agent 评估：为什么比传统模型评估难',
        content: `
### 学习目标

学完本节，你应该能够：
1. 解释 Agent 评估三难点（路径不唯一/随机性/多步依赖）；
2. 设计三层评估（结果/轨迹/组件），计算成功率、步数、工具准确率与每成功任务成本；
3. 搭建含工具失败/信息不足/对抗类别的评估集与可回放的结构化轨迹日志。

### 前置知识

- c2 的 Agent 骨架与 c3 的三层记忆。

### 问题背景

模型评测看准确率就行，Agent 评测难在『路径不唯一、随机性强、错误多步累积』。没有三层评估与结构化轨迹，Agent 上线等于闭眼开车：不知道错在哪、不知道多少钱、不知道改了之后是变好还是变坏。

### 直觉理解

结果评估像只看高考总分（对，但不知道哪科拉分）；轨迹评估像调监控录像（步数、绕路、重复调用一目了然）；组件评估像单科模考（规划/检索/工具各自达标线）。上线清单是飞行检查单：最大步数、超时、成本上限、危险操作人工确认——少一项都可能变成生产事故。

### 核心概念与原理详解

## 三个难点

1. **路径不唯一**：同一个任务有多种正确解法，"恰好一样"的比对毫无意义；
2. **随机性**：同样输入可能走出完全不同的轨迹；
3. **多步依赖**：单步都正确不代表整体正确；早期一步错，后面全错。

## 三层评估框架

**1. 结果评估（Outcome）**

只看最终输出是否正确/任务是否完成。

- 有标准答案：精确匹配 / 等价判断；
- 无标准答案：LLM-as-Judge 打分、人工评分。

优点：简单直接。缺点：无法定位问题在哪。

**2. 轨迹评估（Trajectory）**

检查执行路径是否合理：

| 指标 | 含义 |
| --- | --- |
| 步数 | 是否绕了远路（对比最短路/人工基准） |
| 工具调用准确率 | 工具选对了吗？参数对吗？ |
| 冗余调用 | 是否有重复/无效调用 |
| 关键步骤覆盖 | 是否遗漏必要步骤 |

**3. 组件评估**

单独测每个环节：规划质量、记忆检索准确率、工具执行成功率。
好处是能精确定位瓶颈。

## 关键指标

    任务成功率 = 完成任务数 / 总任务数
    平均步数   = 总步数 / 任务数        （效率）
    工具准确率 = 正确调用 / 总调用
    平均成本   = 总 token / 任务数
    平均延迟   = 端到端耗时

**必须把成功率与成本一起看**：成功率从 70% 提到 75% 但成本翻倍，通常不划算。

## 评估集设计

**来源**：真实线上请求采样（100~500 条）。

**必须覆盖的类型**：

| 类型 | 目的 |
| --- | --- |
| 单步简单任务 | 基础能力 |
| 多步复杂任务 | 规划能力 |
| **工具失败** | 是否会正确重试/降级 |
| **信息不足** | 是否会老实说做不到，而不是硬编 |
| 边界/对抗输入 | 鲁棒性 |

**后两类尤其重要**，它们是"看起来能用"与"生产可用"的分水岭。

## 可观测性：结构化轨迹日志

每次 Agent 运行都要能完整回放：

    {
      "trace_id": "abc123",
      "task": "查询订单A88的物流",
      "steps": [
        {"step": 1, "type": "thought", "content": "需要先查订单状态"},
        {"step": 2, "type": "tool_call", "tool": "query_order",
         "args": {"order_id": "A88"}, "result_summary": "已发货",
         "latency_ms": 320, "tokens": {"in": 1200, "out": 60}},
        {"step": 3, "type": "finish", "answer": "..."}
      ],
      "total_tokens": 3100,
      "total_latency_ms": 4200,
      "success": true
    }

**必须记录**：每步的 prompt 与 response、工具参数与结果、token、延迟、错误与重试。

**用途**：故障排查、成本分析、构造评估集、回归测试。

## 上线前检查清单

| 检查项 | 要求 |
| --- | --- |
| 最大步数限制 | 必须 |
| 超时控制 | 必须 |
| 单任务成本上限 | 必须 |
| 危险操作人工确认 | 必须 |
| 完整日志 | 必须 |
| 失败降级 | 转人工 / 明确错误 |
| 评估集通过率 | 达阈值 |
| 限流与并发控制 | 必须 |

## 迭代闭环

    线上日志 → 抽样标注 → badcase 聚类
      ↑                        ↓
    上线验证 ← 评估集回归 ← 修复（提示/工具/规划）

**每次改动都要跑回归**，防止"修好 A 弄坏 B"。

<TrajectoryEval />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import json, statistics

# ---- 1. 三层评估：从 5 条轨迹算核心指标 ----
runs = [
    dict(success=True,  steps=3, tool_calls=2, tool_ok=2, tokens=3100, latency=4.2),
    dict(success=True,  steps=5, tool_calls=4, tool_ok=3, tokens=5200, latency=7.1),
    dict(success=False, steps=6, tool_calls=5, tool_ok=2, tokens=6800, latency=9.8),
    dict(success=True,  steps=4, tool_calls=3, tool_ok=3, tokens=4100, latency=5.5),
    dict(success=False, steps=2, tool_calls=1, tool_ok=0, tokens=1500, latency=2.3),
]
n = len(runs)
print(f"任务成功率 {sum(r['success'] for r in runs)/n:.0%} | 平均步数 {statistics.mean(r['steps'] for r in runs):.1f}")
print(f"工具准确率 {sum(r['tool_ok'] for r in runs)/sum(r['tool_calls'] for r in runs):.0%}"
      f" | 平均成本 {statistics.mean(r['tokens'] for r in runs):.0f} tok/任务")

# ---- 2. 成功率 vs 成本：看『每成功任务成本』 ----
for name, sr, cost in [("A: 基线", 0.70, 3000), ("B: 加反思", 0.75, 6000)]:
    print(f"{name}: 成功率 {sr:.0%}，每成功任务成本 {cost/sr:.0f} tok")

# ---- 3. 评估集分层：必须含失败与信息不足类 ----
print("评估集构成:", [("简单", 20), ("多步", 20), ("工具失败", 10), ("信息不足", 10), ("对抗", 5)])

# ---- 4. 结构化轨迹日志（可回放）----
trace = {"trace_id": "abc123", "task": "查询订单A88的物流", "steps": [
    {"step": 1, "type": "thought", "content": "先查订单状态"},
    {"step": 2, "type": "tool_call", "tool": "query_order", "args": {"order_id": "A88"},
     "latency_ms": 320, "tokens": {"in": 1200, "out": 60}},
    {"step": 3, "type": "finish", "answer": "已发货"}],
    "total_tokens": 3100, "success": True}
s = json.dumps(trace, ensure_ascii=False)
print("轨迹日志可回放:", "query_order" in s, "| 字节数:", len(s))\`\`\`

预期输出（实测）：任务成功率 60%、平均步数 4.0、工具准确率 67%、平均成本 4140 tok/任务；每成功任务成本：基线 A 4286 tok vs 加反思 B 8000 tok（成功率 +5pp 但成本近翻倍，不划算）；评估集五类构成；轨迹日志可回放 query_order 调用（335 字节 JSON）。

**常见错误**：只评『最终对不对』，错误轨迹反复出现却无处定位；评估集全是『顺利路径』，工具失败/信息不足类缺席，上线后被真实流量击穿；不看『每成功任务成本』，成功率 +5pp 而成本翻倍仍沾沾自喜。

### 常见误区

1. **『轨迹一样才算对』**——同一任务多条正确路径，逐字比对毫无意义，要评关键步骤覆盖与结果等价；\\n2. **『LLM-as-Judge 是免费午餐』**——裁判模型有自身偏差，重要场景要抽样人工校准；\\n3. **『上线后不用再评』**——线上失败案例必须回流为回归集，否则每次改动都在赌运气。

### 知识关联

- **向前**：c5 的『先工作流再 Agent』决策要靠本章的成本-成功率数据支撑；
- **向后**：c6 的 OpenTelemetry trace 是本章结构化日志的标准化落地；
- **平行**：llm-b4 的困惑度等是模型级评估，本章是系统级评估，两层互补。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 三层 | 结果（对不对）/ 轨迹（路子对不对）/ 组件（哪一环）|
| 指标 | 成功率 × 平均步数 × 工具准确率 × 每成功任务成本 |
| 评估集 | 真实采样 100~500 条，必含工具失败/信息不足/对抗 |
| 轨迹日志 | 每步 prompt/response/参数/结果/token/延迟可回放 |
| 上线清单 | 步数上限、超时、成本上限、人工确认、完整日志 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Yao et al. (2022) arXiv:2210.03629《ReAct》、Shinn et al. (2023) arXiv:2303.11366《Reflexion》、Anthropic《Building effective agents》与 MCP 官方文档 modelcontextprotocol.io 相应章节）
`,
        tips: [
          {
            kind: 'interview',
            text: '「如何评估 Agent」分三层答：结果（成功率）、轨迹（步数/工具准确率）、组件。只答成功率是不够的。',
          },
          {
            kind: 'leak',
            text: '评估集必须有"工具失败"和"信息不足"两类样本。Agent 在这些场景下是否老实降级，决定它能否上生产。',
          },
          {
            kind: 'pitfall',
            text: '成功率和成本必须一起看。为提升 5% 成功率付出 2 倍成本，业务上通常不划算。',
          },
        ],
        demos: [
          {
            title: 'Agent 运行指标汇总',
            lang: 'python',
            code: `runs = [
    {"task": "查订单", "success": True,  "steps": 3, "calls": 2, "correct": 2, "tokens": 1200},
    {"task": "改地址", "success": True,  "steps": 5, "calls": 4, "correct": 3, "tokens": 2400},
    {"task": "退款",   "success": False, "steps": 8, "calls": 7, "correct": 3, "tokens": 4100},
    {"task": "退货",   "success": True,  "steps": 4, "calls": 3, "correct": 3, "tokens": 1800},
    {"task": "咨询",   "success": True,  "steps": 2, "calls": 1, "correct": 1, "tokens": 800},
]

n = len(runs)
succ = sum(r["success"] for r in runs)
steps = sum(r["steps"] for r in runs) / n
calls = sum(r["calls"] for r in runs)
correct = sum(r["correct"] for r in runs)
tokens = sum(r["tokens"] for r in runs) / n

print(f"任务成功率:     {succ}/{n} = {succ/n:.0%}")
print(f"平均步数:       {steps:.1f}")
print(f"工具调用准确率: {correct}/{calls} = {correct/calls:.0%}")
print(f"平均 token:     {tokens:.0f}")
print()
failed = [r for r in runs if not r["success"]]
print("失败任务:", [r["task"] for r in failed])
print(f"失败任务平均步数 {sum(r['steps'] for r in failed)/len(failed):.1f}，"
      f"成功任务平均 {sum(r['steps'] for r in runs if r['success'])/succ:.1f}")
print("→ 失败任务步数明显更多，是'绕远路'的典型信号")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-b2-c4-e1',
        type: 'single',
        difficulty: 2,
        question: 'Agent 评估中，「轨迹评估」关注的是？',
        options: [
          { value: 'A', text: '只看最终答案对不对' },
          { value: 'B', text: '执行路径是否合理（步数、工具调用准确率、是否遗漏关键步骤）' },
          { value: 'C', text: '模型的参数量' },
          { value: 'D', text: '用户的满意度' },
        ],
        answer: 'B',
        explanation: '轨迹评估检查"过程"——步数是否绕远、工具是否选对、参数是否正确、关键步骤是否覆盖。它能定位问题所在，而不只是判断成败。',
        tags: ['评估'],
      },
      {
        id: 'llm-b2-c4-e2',
        type: 'judge',
        difficulty: 2,
        question: 'Agent 的评估集必须包含"工具失败"和"信息不足"两类样本。',
        answer: true,
        explanation: '这两类检验 Agent 是否会正确降级（重试失败工具、老实说做不到），而不是硬编答案。它们是"能用"与"生产可用"的分水岭。',
        tags: ['评估集'],
      },
      {
        id: 'llm-b2-c4-e3',
        type: 'multiple',
        difficulty: 3,
        question: 'Agent 上线前必须具备哪些保护措施？（多选）',
        options: [
          { value: 'A', text: '最大步数限制与超时控制' },
          { value: 'B', text: '单任务成本上限' },
          { value: 'C', text: '危险操作人工确认' },
          { value: 'D', text: '完整可回放的结构化日志' },
        ],
        answer: ['A', 'B', 'C', 'D'],
        explanation: '四项都是必须项。缺少任何一项，一次死循环、一次误操作或一次无法复现的故障都可能造成真实损失。',
        tags: ['生产化'],
      },
      {
        id: 'llm-b2-c4-e4',
        type: 'fill',
        difficulty: 3,
        question: 'Agent 的每次运行都应记录完整的结构化日志以便回放排查，这套能力称为___性（Observability）。',
        blanks: [['可观测', 'observability', 'Observe', '观测']],
        explanation: '可观测性包括每步的 prompt/response、工具调用、token、延迟、错误。它是故障排查、成本分析与评估集构造的基础。',
        tags: ['可观测性'],
      },
      {
        id: 'llm-b2-c4-e5',
        type: 'code',
        difficulty: 2,
        question: '实现 `evaluate_agent(runs)`：\n\n`runs` 是 `[{success, steps, calls, correct, tokens}, ...]`\n\n返回字典：`{success_rate, avg_steps, tool_accuracy, avg_tokens}`，都保留 4 位小数（success_rate 为 0~1 的小数）。\n\n空列表时返回全 0。',
        starterCode: `def evaluate_agent(runs):
    if not runs:
        return {"success_rate": 0.0, "avg_steps": 0.0, "tool_accuracy": 0.0, "avg_tokens": 0.0}
    n = len(runs)
    ___
    return {
        "success_rate": round(succ / n, 4),
        "avg_steps": round(steps / n, 4),
        "tool_accuracy": round(correct / calls if calls else 0.0, 4),
        "avg_tokens": round(tokens / n, 4),
    }


evaluate_agent([{"success": True, "steps": 3, "calls": 2, "correct": 2, "tokens": 1200}])
`,
        setupCode: '',
        expectedOutput: '4 项指标',
        tests: `runs = [
    {"success": True, "steps": 3, "calls": 2, "correct": 2, "tokens": 1000},
    {"success": False, "steps": 5, "calls": 4, "correct": 3, "tokens": 2000},
]
out = evaluate_agent(runs)
assert out["success_rate"] == 0.5, f"成功率应 0.5，实际 {out['success_rate']}"
assert out["avg_steps"] == 4.0, f"平均步数应 4.0，实际 {out['avg_steps']}"
assert out["tool_accuracy"] == 0.8333, f"工具准确率应 5/6≈0.8333，实际 {out['tool_accuracy']}"
assert out["avg_tokens"] == 1500.0, f"平均 token 应 1500，实际 {out['avg_tokens']}"

empty = evaluate_agent([])
assert all(v == 0.0 for v in empty.values()), "空列表应返回全 0"
`,
        answer: `def evaluate_agent(runs):
    if not runs:
        return {"success_rate": 0.0, "avg_steps": 0.0, "tool_accuracy": 0.0, "avg_tokens": 0.0}
    n = len(runs)
    succ = sum(1 for r in runs if r["success"])
    steps = sum(r["steps"] for r in runs)
    calls = sum(r["calls"] for r in runs)
    correct = sum(r["correct"] for r in runs)
    tokens = sum(r["tokens"] for r in runs)
    return {
        "success_rate": round(succ / n, 4),
        "avg_steps": round(steps / n, 4),
        "tool_accuracy": round(correct / calls if calls else 0.0, 4),
        "avg_tokens": round(tokens / n, 4),
    }


evaluate_agent([{"success": True, "steps": 3, "calls": 2, "correct": 2, "tokens": 1200}])`,
        explanation:
          '```python\nsucc = sum(1 for r in runs if r["success"])\nsteps = sum(r["steps"] for r in runs)\ncalls = sum(r["calls"] for r in runs)\ncorrect = sum(r["correct"] for r in runs)\ntokens = sum(r["tokens"] for r in runs)\n```\n\n**注意工具准确率的分母是 calls 而不是 n**，且要防止 calls 为 0 时除零。\n\n这四个指标是 Agent 监控看板的标准配置。',
        tags: ['编程', '评估'],
      },
      {
        id: 'llm-b2-c4-e6',
        type: 'code',
        difficulty: 3,
        question: '实现 `detect_anomaly(steps, max_steps=10)`：检测 Agent 轨迹中的异常。\n\n返回异常类型列表（字符串列表），规则：\n1. 若 `len(steps) > max_steps` → 加 `"超出步数"`\n2. 若同一 `tool` 连续出现 ≥ 3 次 → 加 `"重复调用"`\n3. 若存在 `error` 字段为 True 的步骤 → 加 `"工具报错"`\n\n`steps` 是 `[{tool, error}, ...]`',
        starterCode: `def detect_anomaly(steps, max_steps=10):
    issues = []
    if len(steps) > max_steps:
        issues.append("超出步数")
    ___
    return issues


detect_anomaly([{"tool": "search"}, {"tool": "search"}, {"tool": "search"}], 10)
`,
        setupCode: '',
        expectedOutput: "['重复调用']",
        tests: `# 连续 3 次同一工具
out = detect_anomaly([{"tool": "search"}, {"tool": "search"}, {"tool": "search"}], 10)
assert "重复调用" in out, f"应检测到重复调用，实际 {out}"

# 超出步数
out2 = detect_anomaly([{"tool": "a"}] * 12, 10)
assert "超出步数" in out2, f"应检测到超出步数，实际 {out2}"

# 工具报错
out3 = detect_anomaly([{"tool": "a", "error": True}], 10)
assert "工具报错" in out3, f"应检测到工具报错，实际 {out3}"

# 正常轨迹
assert detect_anomaly([{"tool": "a"}, {"tool": "b"}], 10) == [], "正常轨迹不应报异常"
`,
        answer: `def detect_anomaly(steps, max_steps=10):
    issues = []
    if len(steps) > max_steps:
        issues.append("超出步数")
    run_tool, run_len = None, 0
    for s in steps:
        t = s.get("tool")
        if t == run_tool:
            run_len += 1
        else:
            run_tool, run_len = t, 1
        if run_len >= 3 and "重复调用" not in issues and t:
            issues.append("重复调用")
        if s.get("error"):
            if "工具报错" not in issues:
                issues.append("工具报错")
    return issues


detect_anomaly([{"tool": "search"}, {"tool": "search"}, {"tool": "search"}], 10)`,
        explanation:
          '```python\nrun_tool, run_len = None, 0\nfor s in steps:\n    t = s.get("tool")\n    if t == run_tool:\n        run_len += 1\n    else:\n        run_tool, run_len = t, 1\n    if run_len >= 3 and "重复调用" not in issues and t:\n        issues.append("重复调用")\n    if s.get("error") and "工具报错" not in issues:\n        issues.append("工具报错")\n```\n\n**连续计数技巧**：维护"当前工具"与"连续次数"，遇到不同工具就重置。\n\n去重判断（`not in issues`）保证同类异常只报一次。这是生产监控里最常用的轨迹异常检测逻辑。',
        tags: ['编程', '异常检测'],
      },
      {
        id: 'llm-b2-c4-e7',
        type: 'single',
        difficulty: 3,
        question: 'Agent 任务成功率从 70% 提升到 75%，但平均成本翻倍。合理的决策是？',
        options: [
          { value: 'A', text: '一定采用，成功率最重要' },
          { value: 'B', text: '评估业务价值：若提升的 5% 带来的收益小于翻倍成本，则不采用' },
          { value: 'C', text: '一定不采用' },
          { value: 'D', text: '与成本无关，只看成功率' },
        ],
        answer: 'B',
        explanation: '成功率和成本必须一起看。若这 5% 的价值低于增加的成本，就不划算。也可以考虑分层策略：关键任务用高成本方案，普通任务用低成本方案。',
        tags: ['权衡'],
      },
      {
        id: 'llm-b2-c4-e8',
        type: 'judge',
        difficulty: 3,
        question: 'Agent 的可观测性只需要记录最终输出，中间步骤不必记录。',
        answer: false,
        explanation: '缺少中间步骤就无法定位问题（是工具调错、规划失误还是信息不足）、无法做成本分析、也无法构造评估集。必须记录每一步的输入输出。',
        tags: ['可观测性'],
      },
      {
        id: 'llm-b2-c4-e9',
        type: 'open',
        difficulty: 4,
        question: '你的 Agent 在测试环境表现良好（成功率 85%），上线后用户投诉变多、成本超预期。请给出系统性的排查与改进方案，并说明如何建立持续的监控与迭代机制。',
        referenceAnswer: `**一、先定位"测试与线上为何不同"**

1. **输入分布差异**：测试集是人工构造的"规整问题"，线上是口语化、含错别字、
   多意图混杂的真实请求。→ 从线上采样 200 条真实请求重跑评估。
2. **环境差异**：线上工具延迟更高、偶发失败，测试时工具永远是通的。
   → 人为注入 10% 工具失败率做压测。
3. **并发与限流**：高并发下工具超时、模型限流，导致重试与降级。
4. **数据时效**：线上数据更新后，测试时的假设失效。

**二、分层排查（用轨迹日志）**

按失败类型聚类 badcase：

| 聚类 | 占比 | 对应问题 |
| --- | --- | --- |
| 工具调用错误 | ? | 工具描述不清 / 参数校验缺失 |
| 死循环/绕远路 | ? | 缺少最大步数或重复检测 |
| 信息不足硬编 | ? | 缺少拒答引导 |
| 超时降级 | ? | 工具慢 / 并发过高 |

**三、针对性改进**

- 工具问题 → 重写 description，加 JSON Schema 约束，错误回灌让模型自纠；
- 绕远路 → 加最大步数 + 重复调用检测（连续 3 次同工具即中断）；
- 硬编 → 提示中加"信息不足时明确说明"并要求引用证据；补评估集无答案样本；
- 成本超预期 → 裁剪工具返回值（通常是最大头）、加单任务 token 上限、简单请求路由到小模型、开启 Prompt Caching。

**四、建立持续监控**

每日看板：
- 成功率、平均步数、工具准确率；
- P50/P95 延迟、超时率；
- 单任务平均 token、日总成本、缓存命中率；
- 转人工率、用户点踩率。

告警阈值：成功率跌破基线 5%、日成本超预算 20%、平均步数突增。

**五、迭代机制**

1. 每周从线上日志采样 badcase，人工标注后**加入评估集**；
2. 每次改动（提示/工具/规划）跑全量评估集回归，确认无退化；
3. 灰度发布：新版本先在 5%~10% 流量上验证，再逐步放量；
4. 版本化：提示、工具定义、模型版本都要可追溯、可回滚。

**核心理念**：线上表现才是唯一真相，测试集只是代理指标。必须建立"线上日志 → 评估集 → 回归 → 灰度"的闭环。`,
        rubric: [
          { point: '指出测试与线上分布/环境差异，用线上样本重跑评估', score: 2 },
          { point: '用轨迹日志按失败类型聚类 badcase', score: 2 },
          { point: '针对性改进（工具描述、步数限制、拒答引导、成本优化）', score: 2 },
          { point: '建立监控看板与告警阈值', score: 1 },
          { point: '迭代闭环：badcase 回流、回归、灰度、版本化', score: 1 },
        ],
        keywords: ['分布差异', '轨迹日志', 'badcase 聚类', '监控看板', '灰度', '回归'],
        explanation: '这是 Agent 生产化的综合题，考察"从现象到根因到机制"的完整排查思维。',
        tags: ['Agent', '生产化', '排障'],
      },
    ],
  },
];
