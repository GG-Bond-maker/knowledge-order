import type { Chapter } from '../../types';

/* ============================================================
 *  B1 扩展：高级 RAG
 *
 *  参考：Self-RAG (arXiv 2310.11511)、
 *       GraphRAG (Microsoft, arXiv 2404.16130)、
 *       FLARE、Agentic RAG、RAG 综述 (2312.10997)
 * ============================================================ */

export const llmB1Extra2: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c5：高级 RAG 范式
   * ============================================================ */
  {
    id: 'llm-b1-c5',
    title: '高级 RAG：从固定流程到自适应检索',
    goal: '掌握 Self-RAG 的反思标记、FLARE 的主动检索、Agentic RAG 的检索即工具，理解何时该用哪种范式。',
    lessons: [
      {
        id: 'llm-b1-c5-l1',
        title: 'Self-RAG、FLARE 与 Agentic RAG',
        content: `
## Naive RAG 的三个根本问题

前面讲的 RAG 是**固定流程**：总是检索 → 总是取 top-k → 总是塞进上下文。

**问题 1：不需要检索时也检索**
问「1+1等于几」也去检索，浪费成本还可能引入噪声。

**问题 2：检索到无关内容也照用**
top-k 里可能有一半是不相关的，模型会被误导。

**问题 3：检索一次就结束**
复杂问题可能需要**多轮检索**、逐步深入。

**高级 RAG 的共同思路**：把"检索"从固定步骤变成**可决策、可迭代**的动作。

<Flowchart name="rag-advanced" />

## Self-RAG：让模型自己决定要不要检索

**论文**：Self-Reflective Retrieval-Augmented Generation (arXiv 2310.11511)

**核心创新**：训练模型生成**反思标记（reflection tokens）**，
用这些特殊 token 显式表达"要不要检索""这段内容有用吗""我的回答有支持吗"。

**四类反思标记**：

| 标记类型 | 取值 | 含义 |
| --- | --- | --- |
| **Retrieve** | yes / no / continue | 是否需要检索 |
| **IsRel** | relevant / irrelevant | 检索到的段落是否相关 |
| **IsSup** | fully / partially / no | 回答是否有段落支持 |
| **IsUse** | 1~5 | 回答整体有用性 |

**推理流程**：

    问题 → 模型判断 [Retrieve=yes?]
              ├─ no  → 直接用参数知识回答
              └─ yes → 检索 k 个段落
                        ↓
                 对每段判断 [IsRel]
                        ↓
                  生成回答 + [IsSup] 标记
                        ↓
                  按 [IsUse] 排序候选答案，选最佳

**关键点**：这些标记是**训练出来的**，不是提示词。
需要构造带标记的训练数据，用标准语言建模目标训练。

**收益（论文实测）**：
- 7B/13B 的 Self-RAG 在开放域 QA、推理、事实验证上**超过 ChatGPT**；
- 长文生成的**事实性与引用准确性**显著提升。

**代价**：
- 需要专门训练（非即插即用）；
- 推理时多次调用，延迟增加。

## FLARE：主动检索

**论文**：Active Retrieval Augmented Generation (FLARE)

**核心思想**：**先尝试生成，在不确定时才检索**。

    1. 生成一个临时回答（或下一句）
    2. 检查有没有低置信度的 token（概率低于阈值）
    3. 如果有 → 用这些低置信部分作为查询去检索
    4. 把检索结果加入上下文，重新生成
    5. 重复直到没有低置信片段

**与 Self-RAG 的区别**：
- Self-RAG 用**训练出的标记**决定是否检索；
- FLARE 用**生成概率**判断哪里不确定，更轻量（不需要训练）。

**适用**：长文生成、需要事实支撑的写作。

## Agentic RAG：把检索变成 Agent 的工具

**核心思想**：检索不再是固定步骤，而是 Agent 可以**自主调用多次**的工具。

    # Agent 拥有 retrieve 工具
    tools = [retrieve, calculate, search_web, read_file]

    # Agent 自主决定：调用几次、用什么查询
    loop:
        action = llm.decide(state, tools)
        if action is retrieve(query):
            docs = retrieve(query)
            state.context += docs
        elif action is answer:
            return action.text

**典型模式**：
- **多跳检索**：第一轮检索发现新实体 → 用新实体再检索；
- **查询改写**：发现结果不好 → 换个问法重试；
- **分而治之**：复杂问题拆成子问题，各自检索后汇总。

**优势**：
- 灵活性最高，能处理任意复杂问题；
- 可以结合其他工具（计算、API）。

**代价**：
- 成本与延迟不可控（循环次数不定）；
- 需要可靠停止条件；
- 错误会累积。

## 三种范式的对比

| 维度 | Naive RAG | Self-RAG | Agentic RAG |
| --- | --- | --- | --- |
| 检索次数 | 固定 1 次 | 自适应 0~多次 | 自主 0~多次 |
| 是否需要训练 | 否 | **是**（反思标记） | 否 |
| 成本 | 低 | 中 | **高** |
| 延迟 | 低 | 中 | **高** |
| 复杂问题能力 | 弱 | 中 | **强** |
| 可预测性 | **高** | 中 | 低 |
| 实现复杂度 | **低** | 高 | 中 |

## 怎么选

    问题简单、单跳、量大
      → Naive RAG（便宜、可预测）

    需要判断"该不该检索"、有标注能力
      → Self-RAG（自训练）

    需要多跳、多工具、复杂推理
      → Agentic RAG

    长文生成需要事实支撑
      → FLARE（轻量、不需要训练）

**务实建议**：**先用 Naive RAG 打好基础**（切分、检索、重排、评估做好），
再根据实际失败案例引入高级范式。

很多团队跳过基础直接上 Agentic RAG，结果是**成本涨了 5 倍，效果好 5%**。

<ReactLoopDemo />
`,
        tips: [
          {
            kind: 'interview',
            text: '「Self-RAG 的核心创新」：训练模型生成反思标记（Retrieve/IsRel/IsSup/IsUse），显式控制"要不要检索""内容是否相关""回答是否有支撑"。',
          },
          {
            kind: 'leak',
            text: 'Self-RAG 与 FLARE 的区别：Self-RAG 用训练出的标记决定检索，FLARE 用生成概率（低置信 token）触发检索，后者不需要训练。',
          },
          {
            kind: 'pitfall',
            text: '跳过基础 RAG 直接上 Agentic RAG 是常见错误——成本涨数倍但效果提升有限。先把切分、检索、重排、评估做好。',
          },
        ],
        demos: [
          {
            title: '模拟 Self-RAG 的反思流程',
            lang: 'python',
            code: `import random

def fake_llm_retrieve_decision(question):
    """模拟模型判断是否需要检索。"""
    simple = ["1+1", "你好", "今天星期几"]
    return "no" if any(s in question for s in simple) else "yes"

def fake_retrieve(query, k=3):
    """模拟检索，返回 (段落, 相关性标记)。"""
    docs = [
        (f"文档A: 关于 {query} 的介绍...", "relevant"),
        (f"文档B: 不相关的内容...", "irrelevant"),
        (f"文档C: {query} 的详细说明...", "relevant"),
    ]
    return docs[:k]

def fake_generate(question, docs):
    """模拟生成回答，并给出支持度标记。"""
    relevant = [d for d, r in docs if r == "relevant"]
    if not relevant:
        return "无法回答", "no"
    support = "fully" if len(relevant) >= 2 else "partially"
    return f"基于 {len(relevant)} 个相关段落生成的回答", support

def self_rag(question):
    print(f"问题: {question}")
    # ① Retrieve 决策
    decision = fake_llm_retrieve_decision(question)
    print(f"  [Retrieve] = {decision}")

    if decision == "no":
        print("  -> 直接用参数知识回答")
        return "直接回答"

    # ② 检索
    docs = fake_retrieve(question)
    print(f"  -> 检索到 {len(docs)} 个段落")

    # ③ IsRel 过滤
    for d, rel in docs:
        print(f"     [IsRel] {rel}: {d[:22]}")
    kept = [(d, r) for d, r in docs if r == "relevant"]
    print(f"  -> 保留 {len(kept)} 个相关段落")

    # ④ 生成 + IsSup
    answer, sup = fake_generate(question, docs)
    print(f"  [IsSup] = {sup}")
    print(f"  -> 回答: {answer}")
    return answer

print("=" * 55)
self_rag("1+1等于几")
print("=" * 55)
self_rag("什么是 RAG？")
print("=" * 55)
print()
print("对比 Naive RAG：无论如何都检索 3 段、全部塞进上下文")`,
          },
          {
            title: 'FLARE 的置信度触发检索',
            lang: 'python',
            code: `import math

def softmax(logits):
    m = max(logits)
    e = [math.exp(x - m) for x in logits]
    s = sum(e)
    return [x / s for x in e]

def token_confidence(logits):
    """返回 (最可能的 token 索引, 置信度)。"""
    probs = softmax(logits)
    idx = max(range(len(probs)), key=lambda i: probs[i])
    return idx, probs[idx]

# 模拟生成的 token 序列及置信度
tokens = [
    ("RAG", 0.95),
    ("是", 0.92),
    ("一种", 0.88),
    ("检索", 0.45),    # 低置信
    ("增强", 0.38),    # 低置信
    ("生成", 0.91),
]

THRESHOLD = 0.6

print("Token 置信度检查:")
low_conf = []
for tok, conf in tokens:
    flag = "  <- 低置信，触发检索" if conf < THRESHOLD else ""
    print(f"  {tok:6} {conf:.2f}{flag}")
    if conf < THRESHOLD:
        low_conf.append(tok)

print()
if low_conf:
    query = " ".join(low_conf)
    print(f"低置信片段: {query}")
    print(f"-> 用 '{query}' 作为查询去检索，补充上下文后重新生成")
else:
    print("全部高置信，无需检索")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-b1-c5-e1',
        type: 'single',
        difficulty: 2,
        question: 'Self-RAG 的核心创新是什么？',
        options: [
          { value: 'A', text: '用更大的向量数据库' },
          { value: 'B', text: '训练模型生成反思标记（Retrieve/IsRel/IsSup/IsUse），显式控制检索与评估' },
          { value: 'C', text: '使用更强的 embedding 模型' },
          { value: 'D', text: '增加检索的文档数量' },
        ],
        answer: 'B',
        explanation:
          'Self-RAG 让模型用特殊 token 显式表达"要不要检索""段落是否相关""回答是否有支撑""整体有用性"，从而自适应地控制检索行为。这些标记是训练出来的，不是提示词。',
        tags: ['Self-RAG'],
      },
      {
        id: 'llm-b1-c5-e2',
        type: 'judge',
        difficulty: 2,
        question: 'FLARE 通过训练模型生成反思标记来决定何时检索。',
        answer: false,
        explanation:
          'FLARE 用**生成概率**判断：先生成临时回答，找出低置信度的 token 片段，用它们作为查询去检索。这不需要额外训练，比 Self-RAG 更轻量。',
        tags: ['FLARE'],
      },
      {
        id: 'llm-b1-c5-e3',
        type: 'multiple',
        difficulty: 3,
        question: 'Naive RAG 的三个根本问题是？（多选）',
        options: [
          { value: 'A', text: '不需要检索时也检索，浪费成本且引入噪声' },
          { value: 'B', text: '检索到无关内容也照用，误导模型' },
          { value: 'C', text: '检索一次就结束，无法处理多跳问题' },
          { value: 'D', text: '向量维度太高' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 与问题无关。这三个缺陷正是高级 RAG 范式（Self-RAG / Agentic RAG / FLARE）要解决的核心。',
        tags: ['RAG 局限'],
      },
      {
        id: 'llm-b1-c5-e4',
        type: 'fill',
        difficulty: 3,
        question: '把检索变成 Agent 可自主多次调用的工具、由 Agent 决定检索几次与用什么查询的范式叫 ___ RAG。',
        blanks: [['Agentic', 'agentic', '智能体', 'Agent']],
        explanation:
          'Agentic RAG 把检索从固定步骤变成可决策动作，支持多跳检索、查询改写、分而治之。灵活但成本与延迟不可控，需要可靠的停止条件。',
        tags: ['Agentic RAG'],
      },
      {
        id: 'llm-b1-c5-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现检索决策：should_retrieve(question, simple_patterns)。\n\n若问题匹配任一简单模式（不需要检索），返回 False；否则返回 True。',
        starterCode: `def should_retrieve(question, simple_patterns):
    ___

should_retrieve("1+1等于几", ["1+1", "你好"])
`,
        setupCode: '',
        expectedOutput: 'False',
        tests: `pats = ["1+1", "你好", "今天星期几"]
assert should_retrieve("1+1等于几", pats) == False, "简单算术不需要检索"
assert should_retrieve("你好啊", pats) == False
assert should_retrieve("什么是 RAG", pats) == True, "需要知识的应检索"
assert should_retrieve("", ["x"]) == True, "空问题默认检索"
`,
        answer: `def should_retrieve(question, simple_patterns):
    return not any(p in question for p in simple_patterns)


should_retrieve("1+1等于几", ["1+1", "你好"])`,
        explanation:
          '这是 Self-RAG 中 Retrieve 决策的最简版本。\n\n**生产环境**应该用训练过的分类器或让 LLM 判断，而不是关键词匹配——关键词太粗糙，容易误判。但思路是一样的：先判断值不值得检索。',
        tags: ['编程', '检索决策'],
      },
      {
        id: 'llm-b1-c5-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现相关性过滤：filter_relevant(docs, threshold)。\n\n- docs 是 (内容, 分数) 元组列表\n- 返回分数 >= threshold 的内容列表（保持原顺序）',
        starterCode: `def filter_relevant(docs, threshold=0.5):
    ___

filter_relevant([("a", 0.9), ("b", 0.3), ("c", 0.7)], 0.5)
`,
        setupCode: '',
        expectedOutput: "['a', 'c']",
        tests: `assert filter_relevant([("a",0.9),("b",0.3),("c",0.7)], 0.5) == ["a","c"]
assert filter_relevant([("a",0.1)], 0.5) == []
assert filter_relevant([("a",0.5)], 0.5) == ["a"], "等于阈值应保留"
assert filter_relevant([], 0.5) == []
# 全部保留
assert filter_relevant([("x",0.9),("y",0.8)], 0.5) == ["x","y"]
`,
        answer: `def filter_relevant(docs, threshold=0.5):
    return [d for d, score in docs if score >= threshold]


filter_relevant([("a", 0.9), ("b", 0.3), ("c", 0.7)], 0.5)`,
        explanation:
          '这是 Self-RAG 中 IsRel 过滤的实现。\n\n**注意用 >= 而非 >**：阈值通常就是"及格线"，等于阈值应算通过。\n\n实践中阈值要根据任务调——事实问答要严格（0.7+），创意生成可以宽松（0.4）。',
        tags: ['编程', '相关性过滤'],
      },
      {
        id: 'llm-b1-c5-e7',
        type: 'judge',
        difficulty: 3,
        question: 'Agentic RAG 在所有场景下都优于 Naive RAG。',
        answer: false,
        explanation:
          'Agentic RAG 灵活但成本与延迟不可控。对于简单单跳问题、高并发场景，Naive RAG 的**便宜、可预测**反而是优势。很多团队上了 Agentic RAG 结果"成本涨 5 倍，效果好 5%"。',
        tags: ['范式选择'],
      },
      {
        id: 'llm-b1-c5-e8',
        type: 'open',
        difficulty: 4,
        question:
          '请对比 Naive RAG、Self-RAG、FLARE 与 Agentic RAG 四种范式：说明各自机制、优缺点、适用场景，并给出从 Naive 升级到高级 RAG 的务实路径。',
        referenceAnswer: `**一、四种范式对比**

| 维度 | Naive RAG | Self-RAG | FLARE | Agentic RAG |
| --- | --- | --- | --- | --- |
| 检索次数 | 固定 1 次 | 自适应 0~多次 | 按置信度触发 | 自主 0~多次 |
| 决策依据 | 无 | 训练出的反思标记 | 生成概率 | LLM 自主推理 |
| 需要训练 | 否 | 是 | 否 | 否 |
| 成本 | 低 | 中 | 中低 | 高 |
| 延迟 | 低 | 中 | 中 | 高 |
| 可预测性 | 高 | 中 | 中 | 低 |
| 多跳能力 | 无 | 有限 | 有限 | 强 |

**二、各自机制与适用**

**Naive RAG**：检索 → top-k → 塞上下文 → 生成。
- 优点：简单、便宜、可预测、易优化；
- 缺点：不该检索也检索、无关内容照用、无法多跳；
- 适用：**单跳事实问答、高并发、成本敏感**。

**Self-RAG**：训练模型输出反思标记（Retrieve/IsRel/IsSup/IsUse），
推理时按标记控制流程。
- 优点：自适应、可解释（标记显式）、论文实测超 ChatGPT；
- 缺点：需要专门训练与标注、延迟增加；
- 适用：**有训练能力、需要高质量事实性输出**。

**FLARE**：先生成、低置信处再检索。
- 优点：不需要训练、实现简单；
- 缺点：多轮生成增加延迟、置信度阈值需调；
- 适用：**长文生成需事实支撑**、想低成本改进。

**Agentic RAG**：检索作为工具，Agent 自主决定调用次数与查询。
- 优点：最灵活、支持多跳与多工具；
- 缺点：成本延迟不可控、错误累积、需停止条件；
- 适用：**复杂多跳研究型任务、可接受高成本**。

**三、务实升级路径**

**第 1 步：把 Naive RAG 做扎实**（这一步 80% 的团队没做好）

- 切分：语义切分而非固定长度，保留标题层级；
- 检索：混合检索（向量 + BM25）+ RRF 融合；
- 重排：cross-encoder 重排 top-50 → top-5；
- 评估：建立评测集，看 recall@k、faithfulness、answer relevance。

**第 2 步：加轻量改进**（不改架构）

- 查询改写：Multi-Query、HyDE；
- 上下文压缩：只保留相关句子，去掉噪声；
- 元数据过滤：按时间/来源/权限过滤。

**第 3 步：按失败案例引入高级范式**

- 大量"不该检索也检索" → 加路由（判断是否检索）；
- 长文事实错误 → FLARE 或 Self-RAG；
- 多跳问题答不上 → Agentic RAG。

**第 4 步：持续评估**

- 每个改动都要在评测集上验证；
- 同时监控成本与延迟——效果提升 5% 但成本涨 5 倍通常不值得。

**四、一个反直觉的结论**

论文与实践中反复出现：**基础 RAG 的优化（切分/重排/评估）收益，
往往大于换用更花哨的范式**。

先把 recall 从 60% 提到 85%，比从 Naive 换成 Agentic 更有价值。`,
        rubric: [
          { point: '四种范式的机制与决策依据对比', score: 3 },
          { point: '指出 Self-RAG 需训练、FLARE 不需训练的关键差异', score: 2 },
          { point: '各范式的适用场景与成本/延迟权衡', score: 2 },
          { point: '给出四步务实升级路径（先打基础再加高级）', score: 2 },
          { point: '指出基础优化的收益常大于换范式', score: 1 },
        ],
        keywords: ['反思标记', '生成概率', '自主调用', '混合检索', '重排', '评测集'],
        explanation:
          '能指出"基础优化收益大于换范式"这个反直觉结论，说明理解了工程实践的真实优先级。',
        tags: ['高级 RAG', '综合', '面试'],
      },
    ],
  },

  /* ============================================================
   *  c6：GraphRAG 与知识图谱增强
   * ============================================================ */
  {
    id: 'llm-b1-c6',
    title: 'GraphRAG：当问题指向整个语料',
    goal: '理解传统 RAG 处理全局性问题的失败原因，掌握 GraphRAG 的实体图谱构建与社区摘要机制。',
    lessons: [
      {
        id: 'llm-b1-c6-l1',
        title: '全局问题与社区摘要',
        content: `
## 传统 RAG 处理不了的问题

**论文**：From Local to Global: A Graph RAG Approach to
Query-Focused Summarization (Microsoft, arXiv 2404.16130)

**核心洞察**：RAG 在**全局性问题**上会失败。

    局部问题（RAG 擅长）：
      "张三的职位是什么？"
      → 能定位到包含答案的少数段落

    全局问题（RAG 失效）：
      "这份数据集的主要主题是什么？"
      "这些文档里有哪些反复出现的风险因素？"
      "整个语料对企业战略的描述有什么矛盾？"
      → 答案不在任何单个段落里，需要**跨全库综合**

**根本原因**：这类问题本质是 **query-focused summarization（QFS）**，
不是检索问题。top-k 检索只能看到局部，看不到全局。

**难点**：直接把全部语料塞进上下文？100 万 token 的语料放不进去，
而且中间信息会被忽略（lost in the middle）。

## GraphRAG 的两阶段方案

**阶段 1：用 LLM 构建图谱索引**

    源文档
      ↓ ① 分块（chunk）
      ↓ ② 每个 chunk 让 LLM 抽取实体与关系
    实体知识图谱（节点=实体，边=关系）
      ↓ ③ 社区检测（Leiden 算法，把紧密相连的实体分组）
    层级化的社区结构
      ↓ ④ 为每个社区预生成摘要（LLM）
    社区摘要索引

**阶段 2：查询时用摘要生成部分回答**

    问题
      ↓ 对每个社区摘要生成一个"部分回答"
      ↓ 所有部分回答再汇总（map-reduce）
    最终回答

**这就是 map-reduce 的思路**：先局部作答，再全局汇总。

## 社区检测与层级

**社区（community）**：图中联系紧密的实体群组。

**Leiden 算法**：一种层级化社区检测，产出多层级结构：

    Level 0: 整个语料（1 个社区）
    Level 1: 几个大主题（如 5-10 个社区）
    Level 2: 每个大主题下的细分主题（如 50 个社区）
    Level 3: 更细的实体群组（如 500 个社区）

**为什么需要层级**：
- 问"主要主题" → 用 Level 1 的摘要（粗粒度）；
- 问"某个细分领域的风险" → 用 Level 2/3（细粒度）。

**摘要生成**：每个社区用 LLM 生成一段摘要，描述该社区实体的共性主题。
这是**离线预计算**的，查询时直接复用。

## 效果与代价

**论文实测**（100 万 token 量级的语料）：
在全局性理解问题的**全面性（comprehensiveness）与多样性（diversity）**上，
GraphRAG **显著优于**传统 RAG 基线。

**代价（必须清楚）**：

| 成本项 | 说明 |
| --- | --- |
| **索引成本** | 每个 chunk 都要 LLM 抽取实体，非常贵 |
| **构建时间** | 百万 token 语料需要数小时到数天 |
| **更新困难** | 新文档加入需要重建部分图谱 |
| **存储** | 图谱 + 多层摘要，比向量库大得多 |

**实测经验**：GraphRAG 的索引成本可能是传统 RAG 的 **50~100 倍**。

## 什么时候值得用 GraphRAG

| 场景 | 是否适合 |
| --- | --- |
| 局部事实问答 | **不适合**（传统 RAG 更便宜更好） |
| "这份报告讲了什么主题" | **适合** |
| "整个语料有哪些矛盾" | **适合** |
| "跨文档找关联" | **适合** |
| 高并发在线问答 | **不适合**（成本） |
| 语料频繁更新 | **不适合**（重建成本） |

**务实建议**：GraphRAG 适合**离线分析型**场景——
如研究、尽调、情报分析、知识管理，而不是高频在线客服。

## 图谱增强的其他用法

不一定非要用完整 GraphRAG，图中信息可以轻量利用：

**① 实体链接增强检索**
从问题中抽取实体，用实体名做额外检索（补充向量检索的语义漂移）。

**② 多跳推理**
"张三的老板的公司在哪" → 需要 张三→老板→公司→地点 的链路。
图谱能做显式多跳。

**③ 关系感知重排**
检索到的段落如果与问题实体在图谱上距离近，加权提升。

**④ RAPTOR：树状摘要**
把文档聚类后逐层摘要成树，检索时在多个层级同时检索。
比 GraphRAG 更轻量，解决类似的"全局+局部"需求。

<PageRankFlow />
`,
        tips: [
          {
            kind: 'interview',
            text: '「GraphRAG 解决什么问题」：传统 RAG 无法处理全局性问题（如"这份语料的主要主题是什么"），因为答案不在任何单个段落里。GraphRAG 用实体图谱 + 社区摘要 + map-reduce 汇总。',
          },
          {
            kind: 'leak',
            text: 'GraphRAG 的索引成本可能是传统 RAG 的 50~100 倍（每个 chunk 都要 LLM 抽取实体）。适合离线分析，不适合高频在线问答。',
          },
          {
            kind: 'note',
            text: '社区检测用 Leiden 算法产出层级结构：Level 1 看大主题，Level 3 看细分领域。摘要离线预计算，查询时直接复用。',
          },
        ],
        demos: [
          {
            title: '图谱构建与社区检测模拟',
            lang: 'python',
            code: `from collections import defaultdict, deque

# 模拟从文档抽取的实体关系
triples = [
    ("张三", "任职于", "A公司"),
    ("A公司", "属于", "科技行业"),
    ("A公司", "位于", "北京"),
    ("李四", "任职于", "A公司"),
    ("李四", "负责", "AI项目"),
    ("王五", "任职于", "B公司"),
    ("B公司", "属于", "制造业"),
    ("B公司", "位于", "上海"),
    ("张三", "合作", "李四"),
]

# 构建邻接表
graph = defaultdict(set)
for s, r, o in triples:
    graph[s].add(o)
    graph[o].add(s)

print("实体:", sorted(graph.keys()))
print()

# 简化的连通分量（近似社区检测）
def connected_components(g):
    visited = set()
    comps = []
    for node in g:
        if node in visited:
            continue
        comp = []
        q = deque([node])
        visited.add(node)
        while q:
            cur = q.popleft()
            comp.append(cur)
            for nb in g[cur]:
                if nb not in visited:
                    visited.add(nb)
                    q.append(nb)
        comps.append(comp)
    return comps

comps = connected_components(graph)
print("社区（连通分量）:")
for i, c in enumerate(comps, 1):
    print(f"  社区{i}: {sorted(c)}")

print()
print("=== 模拟全局问题 ===")
print("问题: 这些文档涉及哪些行业？")
print("传统 RAG: 检索 top-3 段落 -> 可能只看到'科技行业'")
print("GraphRAG: 汇总所有社区 -> 科技行业 + 制造业 ✓")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-b1-c6-e1',
        type: 'single',
        difficulty: 2,
        question: '传统 RAG 在什么类型的问题上会失效？',
        options: [
          { value: 'A', text: '简单事实问答' },
          { value: 'B', text: '全局性问题，如「这份语料的主要主题是什么」' },
          { value: 'C', text: '关键词匹配' },
          { value: 'D', text: '单文档查询' },
        ],
        answer: 'B',
        explanation:
          '答案不在任何单个段落里，需要跨全库综合。这类问题本质是 query-focused summarization，不是检索问题。top-k 检索只能看到局部，看不到全局。',
        tags: ['GraphRAG 动机'],
      },
      {
        id: 'llm-b1-c6-e2',
        type: 'judge',
        difficulty: 2,
        question: 'GraphRAG 的索引成本通常比传统 RAG 低，因为它只构建一次图谱。',
        answer: false,
        explanation:
          '恰恰相反。每个 chunk 都要用 LLM 抽取实体与关系，索引成本可能是传统 RAG 的 **50~100 倍**。而且语料更新时需要重建部分图谱。',
        tags: ['成本'],
      },
      {
        id: 'llm-b1-c6-e3',
        type: 'multiple',
        difficulty: 3,
        question: 'GraphRAG 的两阶段方案包含哪些步骤？（多选）',
        options: [
          { value: 'A', text: '用 LLM 从文档抽取实体与关系，构建知识图谱' },
          { value: 'B', text: '用社区检测算法（如 Leiden）把实体分组' },
          { value: 'C', text: '为每个社区预生成摘要' },
          { value: 'D', text: '把所有文档直接塞进上下文窗口' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 不可行——100 万 token 的语料放不进上下文，且中间信息会被忽略（lost in the middle）。GraphRAG 正是为了避免这一点。',
        tags: ['GraphRAG 流程'],
      },
      {
        id: 'llm-b1-c6-e4',
        type: 'fill',
        difficulty: 3,
        question: 'GraphRAG 查询时对每个社区摘要生成部分回答，再把部分回答汇总成最终答案，这个思路借鉴了 ___ 编程模型。',
        blanks: [['map-reduce', 'MapReduce', 'Map-Reduce', 'mapreduce']],
        explanation:
          'map：对每个社区摘要生成部分回答；reduce：所有部分回答汇总。这让全局问题能被分解处理，避免上下文超限。',
        tags: ['map-reduce'],
      },
      {
        id: 'llm-b1-c6-e5',
        type: 'code',
        difficulty: 2,
        question:
          '从三元组构建无向邻接表：build_graph(triples)。\n\ntriples 是 (主语, 关系, 宾语) 列表，返回 dict：实体 → 邻居集合（双向）。',
        starterCode: `from collections import defaultdict

def build_graph(triples):
    g = defaultdict(set)
    ___
    return g


tr = [("张三", "任职于", "A公司"), ("A公司", "位于", "北京")]
build_graph(tr)
`,
        setupCode: '',
        expectedOutput: '张三↔A公司，A公司↔北京',
        tests: `tr = [("张三", "任职于", "A公司"), ("A公司", "位于", "北京")]
g = build_graph(tr)
assert "A公司" in g["张三"] and "张三" in g["A公司"], "应双向连接"
assert "北京" in g["A公司"] and "A公司" in g["北京"]
assert len(g) == 3, f"应有 3 个实体，实际 {len(g)}"
# 空输入
assert len(build_graph([])) == 0
# 同一实体多个关系
g2 = build_graph([("A","r1","B"), ("A","r2","C")])
assert g2["A"] == {"B","C"}, f"A 应连接 B 和 C，实际 {g2['A']}"
`,
        answer: `from collections import defaultdict

def build_graph(triples):
    g = defaultdict(set)
    for s, r, o in triples:
        g[s].add(o)
        g[o].add(s)
    return g


tr = [("张三", "任职于", "A公司"), ("A公司", "位于", "北京")]
build_graph(tr)`,
        explanation:
          '**双向添加**是关键：无向图里 A→B 意味着 B 也能到 A。\n\n真实 GraphRAG 用有向图（关系有方向），但社区检测通常基于无向化后的图。\n\n注意三元组里的**关系**（如"任职于"）在这里被丢弃了——真实场景要把关系存成边的属性。',
        tags: ['编程', '图谱构建'],
      },
      {
        id: 'llm-b1-c6-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现连通分量检测：find_communities(graph)。\n\n输入邻接表（dict: 节点 → 邻居集合），返回社区列表（每个社区是节点列表，按长度降序）。',
        starterCode: `from collections import deque

def find_communities(graph):
    visited = set()
    comps = []
    ___
    return sorted(comps, key=len, reverse=True)


g = {"A": {"B"}, "B": {"A"}, "C": {"D"}, "D": {"C"}, "E": set()}
find_communities(g)
`,
        setupCode: '',
        expectedOutput: "三个社区：['A','B'], ['C','D'], ['E']",
        tests: `g = {"A": {"B"}, "B": {"A"}, "C": {"D"}, "D": {"C"}, "E": set()}
comps = find_communities(g)
assert len(comps) == 3, f"应有 3 个社区，实际 {len(comps)}"
assert set(comps[0]) == {"A","B"} or set(comps[1]) == {"A","B"}, "应包含 AB 社区"
assert {frozenset(c) for c in comps} == {frozenset({"A","B"}), frozenset({"C","D"}), frozenset({"E"})}
# 全连通
g2 = {"A": {"B"}, "B": {"A","C"}, "C": {"B"}}
assert len(find_communities(g2)) == 1
`,
        answer: `from collections import deque

def find_communities(graph):
    visited = set()
    comps = []
    for node in graph:
        if node in visited:
            continue
        comp = []
        q = deque([node])
        visited.add(node)
        while q:
            cur = q.popleft()
            comp.append(cur)
            for nb in graph[cur]:
                if nb not in visited:
                    visited.add(nb)
                    q.append(nb)
        comps.append(comp)
    return sorted(comps, key=len, reverse=True)


g = {"A": {"B"}, "B": {"A"}, "C": {"D"}, "D": {"C"}, "E": set()}
find_communities(g)`,
        explanation:
          '用 BFS 遍历找连通分量——这是社区检测的最简版本（真实 GraphRAG 用 Leiden 算法，能处理更细的社区划分与层级）。\n\n`visited` 集合保证每个节点只访问一次，总复杂度 O(V+E)。',
        tags: ['编程', '社区检测'],
      },
      {
        id: 'llm-b1-c6-e7',
        type: 'judge',
        difficulty: 3,
        question: 'GraphRAG 适合高频在线客服场景。',
        answer: false,
        explanation:
          'GraphRAG 索引成本极高（传统 RAG 的 50~100 倍）、构建耗时长、语料更新困难。它适合**离线分析型**场景（研究、尽调、情报分析、知识管理），不适合高频在线问答。',
        tags: ['适用场景'],
      },
      {
        id: 'llm-b1-c6-e8',
        type: 'open',
        difficulty: 4,
        question:
          '请解释 GraphRAG 的完整机制：为什么传统 RAG 处理不了全局问题、GraphRAG 如何解决、代价是什么、以及什么场景下值得用。',
        referenceAnswer: `**一、为什么传统 RAG 处理不了全局问题**

传统 RAG 的流程是"问题 → 向量检索 top-k → 塞进上下文 → 生成"。

**失效原因**：
1. 全局问题（如"这份语料的主要主题是什么"）的答案
   **不在任何单个段落里**，需要跨全库综合；
2. 这类问题本质是 **query-focused summarization（QFS）**，
   不是检索问题——检索只能返回局部片段；
3. 直接把全语料塞进上下文不可行：100 万 token 放不进窗口，
   且长上下文中部信息召回率显著下降（lost in the middle）。

**二、GraphRAG 的两阶段机制**

**阶段 1：构建图谱索引（离线）**

1. **分块**：把文档切成 chunk；
2. **实体关系抽取**：每个 chunk 用 LLM 抽取 (实体, 关系, 实体) 三元组，
   形成实体知识图谱；
3. **社区检测**：用 Leiden 算法把紧密相连的实体分组成**层级化社区**
   （Level 1 大主题 → Level 3 细分领域）；
4. **社区摘要**：为每个社区用 LLM 预生成摘要，描述该社区的共性主题。

**阶段 2：查询时 map-reduce**

1. **map**：对每个社区摘要生成一个"部分回答"；
2. **reduce**：把所有部分回答汇总成最终答案。

这样全局问题被分解到各个社区，既避免了上下文超限，又能覆盖全局。

**三、代价**

| 成本项 | 量级 |
| --- | --- |
| 索引 LLM 调用 | **传统 RAG 的 50~100 倍**（每 chunk 都要抽取） |
| 构建时间 | 百万 token 需数小时到数天 |
| 存储 | 图谱 + 多层摘要，远大于向量库 |
| 更新 | 新文档需重建部分图谱 |

**四、什么场景值得用**

**适合**：
- 离线分析型任务：研究、尽调、情报分析、知识管理；
- 问题指向整个语料（主题、矛盾、关联、趋势）；
- 语料相对静态（一次构建多次查询）。

**不适合**：
- 局部事实问答（传统 RAG 更便宜更好）；
- 高并发在线问答（成本无法承受）；
- 语料频繁更新（重建成本太高）。

**五、更轻量的替代方案**

如果只是想要"全局+局部"的混合能力，可以考虑 **RAPTOR**：
把文档聚类后逐层摘要成树，检索时在多个层级同时检索。
成本远低于 GraphRAG，能解决类似需求。

**六、务实建议**

先问：**我的用户真的会问全局问题吗？**
如果 95% 的问题是"某个产品的价格是多少"，那 GraphRAG 是杀鸡用牛刀。
只有在全局问题占比可观、且业务价值高时，才值得投入。`,
        rubric: [
          { point: '解释全局问题的本质（答案不在单段、属于 QFS）', score: 2 },
          { point: '完整说明两阶段：图谱构建（抽取+社区+摘要）与查询 map-reduce', score: 3 },
          { point: '指出代价：索引成本 50~100 倍、构建慢、更新难', score: 2 },
          { point: '明确适用与不适用场景', score: 2 },
          { point: '提到 RAPTOR 等更轻量替代', score: 1 },
        ],
        keywords: ['query-focused summarization', 'Leiden', '社区摘要', 'map-reduce', 'lost in the middle', 'RAPTOR'],
        explanation:
          '能说清"全局问题是 QFS 而非检索问题"这个本质，并给出成本量级与适用边界，就掌握了 GraphRAG 的取舍。',
        tags: ['GraphRAG', '综合'],
      },
    ],
  },
];
