import type { Chapter } from '../../types';

/* ============================================================
 *  B2 扩展：Agent 工作流五模式 + 工程落地
 *
 *  参考：Anthropic《Building effective agents》(2024-12)、
 *       Claude Agent SDK / MCP 规范、
 *       GAIA / SWE-bench / WebArena benchmark
 * ============================================================ */

export const llmB2Extra2: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c5：Agent 工作流五模式
   * ============================================================ */
  {
    id: 'llm-b2-c5',
    title: 'Agent 工作流五模式：先工作流，再 Agent',
    goal: '掌握 Anthropic 总结的五种工作流编排模式，学会判断何时该用工作流、何时才需要自主 Agent。',
    lessons: [
      {
        id: 'llm-b2-c5-l1',
        title: '工作流与 Agent 的分界，以及五种模式',
        content: `
## 一个关键区分：工作流 vs Agent

Anthropic 在与数十个团队合作后总结出一个重要区分：

| 类型 | 定义 | 控制流 |
| --- | --- | --- |
| **工作流（Workflow）** | LLM 与工具通过**预定义的代码路径**编排 | 由代码控制 |
| **Agent** | LLM **动态决定**自己的流程与工具使用 | 由模型控制 |

**核心建议**：

> **先找最简单的方案**，只在确实需要时才增加复杂度。
> 很多时候根本不必要构建 agentic 系统。

**为什么**：agentic 系统是拿**延迟和成本**换**任务表现**。
这个权衡不是永远划算。

## 什么时候不需要 Agent

Anthropic 明确说：

> 对很多应用来说，**优化单次 LLM 调用**（加上检索和上下文示例）通常就够了。

**判断标准**：
- 任务路径可预测 → 用工作流或不用的；
- 任务路径不可预测、步骤数无法事先确定 → 才考虑 Agent；
- 只是"看起来更高级" → 不要用。

## 五种工作流模式总览

<Flowchart name="agent-patterns" />

| 模式 | 做什么 | 典型场景 |
| --- | --- | --- |
| ① Prompt Chaining | 串行拆步骤 | 写文案 → 翻译 |
| ② Routing | 分类后分派 | 客服分流、大小模型分流 |
| ③ Parallelization | 并行子任务 / 多投票 | 护栏、多角度评估 |
| ④ Orchestrator-Workers | 动态拆解 + 分派 + 汇总 | 多文件代码修改 |
| ⑤ Evaluator-Optimizer | 生成 → 评审 → 迭代 | 文学翻译、深度检索 |

## ① Prompt Chaining（提示链）

把任务拆成**固定的串行步骤**，每步的输出是下一步的输入。
可以在中间加**程序化校验**（gate）确保没有跑偏。

    outline = llm("写一个文章大纲")
    assert check_criteria(outline)      # 程序化 gate
    article = llm("根据大纲写文章", outline)
    translated = llm("翻译成英文", article)

**何时用**：任务能被清晰分解为**固定的**子任务。
**收益**：每次调用更简单 → 准确率更高；代价是延迟增加。

**例子**：
- 生成营销文案 → 翻译成其他语言；
- 写大纲 → 校验大纲 → 按大纲写正文。

## ② Routing（路由）

先**分类输入**，再分派给专门处理。

    category = classify(query)          # 分类
    if category == "refund":
        return refund_flow(query)
    elif category == "technical":
        return tech_flow(query)
    else:
        return general_flow(query)

**何时用**：任务有明显类别、各类需不同处理，且分类能准确完成。

**关键收益**：**避免"为一个输入优化而伤害其他输入"**。
不同类别的提示词可以独立调优。

**例子**：
- 客服分流（一般问题 / 退款 / 技术支持）；
- **成本优化**：简单问题路由给小模型，复杂问题给大模型。

## ③ Parallelization（并行化）

两个变体：

**Sectioning（分段）**：把任务拆成独立的子任务并行跑。

    # 护栏：一个模型处理请求，另一个审查是否违规
    response, guard = parallel([
        lambda: llm_answer(query),
        lambda: llm_screen(query),
    ])

**Voting（投票）**：同一任务跑多次，聚合结果提高置信度。

    # 多个提示从不同角度审查代码漏洞
    votes = [llm(f"从{angle}角度审查代码", code) for angle in angles]
    has_vuln = sum(v.flag for v in votes) >= 2

**何时用**：
- 子任务可并行 → 提速；
- 需要多视角/多次尝试提高置信度；
- 复杂多因素任务 → 每个因素单独一次调用，**专注度更高**。

**例子**：
- 护栏审查（比同一个调用既回答又审查效果更好）；
- 代码漏洞多角度审查；
- 内容审核用不同提示、不同投票阈值平衡误报漏报。

## ④ Orchestrator-Workers（编排者-工人）

一个中心 LLM **动态拆解**任务，分派给工人 LLM，再汇总结果。

    # 与并行化的关键区别：子任务不是预定义的
    subtasks = orchestrator.plan(task)       # 动态决定
    results = parallel([worker(t) for t in subtasks])
    final = orchestrator.synthesize(results)

**何时用**：复杂任务，**无法预测需要哪些子任务**。

**与 Parallelization 的关键区别**：
- 并行化的子任务是**预先定义**的（如固定几个审查角度）；
- Orchestrator-Workers 的子任务是**由编排者根据输入动态决定**的。

**例子**：
- 编程产品：每次改动涉及哪些文件、每个文件改什么，取决于具体任务；
- 检索任务：需要从多个来源收集信息，来源数量事先未知。

## ⑤ Evaluator-Optimizer（评估者-优化者）

一个 LLM 生成，另一个 LLM 评估并给反馈，形成**循环**。

    draft = llm(task)
    for _ in range(max_iter):
        feedback = evaluator(task, draft)
        if feedback.ok:
            break
        draft = llm(f"根据反馈改进：{feedback}", draft)

**何时用**（两个条件都要满足）：
1. **有清晰的评估标准**；
2. **迭代改进能带来可测量的价值**。

Anthropic 的两个判断信号：
- 人类给出反馈时，回答能明显改进；
- LLM 能提供这样的反馈。

**例子**：
- 文学翻译：有些细微之处第一遍翻不出来，评审 LLM 能提出有用批评；
- 复杂检索：需要多轮搜索与分析，评估者决定是否还要继续搜。

## 何时才用真正的 Agent

**Agent 的特征**：LLM 动态指挥自己的流程与工具，在循环中基于**环境反馈**行动。

**适用条件**：
- 开放式问题，**步骤数无法预测**；
- **无法硬编码**固定路径；
- 环境可信、可沙箱；
- 有人工检查点（checkpoint）与停止条件（如最大迭代数）。

**典型应用**（Anthropic 自己的实现）：
- **SWE-bench 编程 Agent**：根据任务描述修改多个文件；
- **computer use**：让模型操作计算机完成任务。

**成本警告**：自主性意味着**更高成本**与**错误累积风险**。
必须：沙箱环境充分测试 + 适当护栏。

## 三条核心原则（Anthropic）

1. **保持简单**：设计上不要过度复杂；
2. **优先透明**：显式展示 Agent 的规划步骤；
3. **精心设计 ACI**（Agent-Computer Interface）：像重视人机界面一样重视工具文档与测试。

## 一个务实的决策树

    能一次 LLM 调用解决？
      ├─ 是 → 就用单次调用（+ 检索 + 示例）
      └─ 否 → 任务能固定分解？
            ├─ 是 → 用工作流（①~⑤）
            └─ 否 → 步骤数不可预测？
                  ├─ 否 → 用 Orchestrator-Workers
                  └─ 是 → 才考虑自主 Agent（+ 沙箱 + 护栏 + 停止条件）

**记住**：这五种模式不是规定，而是**常见模式**，
可以组合、可以裁剪。关键是**测量效果并迭代**。

<WorkflowCanvas />
`,
        tips: [
          {
            kind: 'interview',
            text: '「工作流与 Agent 的区别」：工作流由预定义代码路径编排，Agent 由 LLM 动态决定流程。先找最简方案，只在需要时才上 Agent。',
          },
          {
            kind: 'leak',
            text: 'Orchestrator-Workers 与 Parallelization 的关键区别：前者子任务由编排者动态决定，后者子任务预先定义。',
          },
          {
            kind: 'note',
            text: 'Anthropic 三条原则：保持简单、优先透明（展示规划步骤）、精心设计 ACI（工具文档与测试）。',
          },
        ],
        demos: [
          {
            title: '五种工作流模式的骨架实现',
            lang: 'python',
            code: `from concurrent.futures import ThreadPoolExecutor

# 模拟 LLM
def llm(prompt, context=""):
    return f"[回答: {prompt[:18]}...]"

def classify(text):
    if "退款" in text: return "refund"
    if "报错" in text or "bug" in text: return "tech"
    return "general"

# ① Prompt Chaining
def chaining(topic):
    outline = llm(f"写大纲: {topic}")
    assert outline, "gate: 大纲不能为空"
    article = llm(f"按大纲写: {outline}")
    return llm(f"翻译成英文: {article}")

# ② Routing
def routing(query):
    cat = classify(query)
    handlers = {"refund": "退款流程", "tech": "技术支持", "general": "通用问答"}
    return llm(f"{handlers[cat]}: {query}")

# ③ Parallelization
def parallel_sectioning(query):
    with ThreadPoolExecutor() as ex:
        answer = ex.submit(llm, f"回答: {query}")
        guard = ex.submit(llm, f"审查是否违规: {query}")
        return answer.result(), guard.result()

def parallel_voting(code, angles=("安全", "性能", "可读性")):
    with ThreadPoolExecutor() as ex:
        votes = [ex.submit(llm, f"从{a}角度审查: {code}") for a in angles]
        return [v.result() for v in votes]

# ④ Orchestrator-Workers
def orchestrator(task):
    subtasks = [f"子任务{i}: {task}" for i in range(3)]   # 动态决定
    with ThreadPoolExecutor() as ex:
        results = list(ex.map(lambda t: llm(t), subtasks))
    return llm(f"汇总: {results}")

# ⑤ Evaluator-Optimizer
def evaluator_optimizer(task, max_iter=3):
    draft = llm(task)
    for i in range(max_iter):
        feedback = llm(f"评估并给建议: {draft}")
        if "OK" in feedback:
            break
        draft = llm(f"根据反馈改进: {feedback}")
    return draft, i + 1

print("① Chaining:", chaining("大模型入门")[:40])
print("② Routing (退款):", routing("我要退款")[:40])
print("② Routing (技术):", routing("程序报错了")[:40])
a, g = parallel_sectioning("如何学习数据分析")
print("③ Parallel(分段): 回答 + 护栏 并发完成")
print("③ Parallel(投票):", len(parallel_voting("def f(): pass")), "个角度")
print("④ Orchestrator:", orchestrator("重构代码")[:45])
d, iters = evaluator_optimizer("写一段介绍")
print(f"⑤ Evaluator-Optimizer: 迭代 {iters} 次")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-b2-c5-e1',
        type: 'single',
        difficulty: 2,
        question: 'Anthropic 对「工作流」与「Agent」的核心区分是？',
        options: [
          { value: 'A', text: '工作流用代码实现，Agent 用提示词实现' },
          { value: 'B', text: '工作流由预定义代码路径编排，Agent 由 LLM 动态决定流程' },
          { value: 'C', text: '工作流更贵，Agent 更便宜' },
          { value: 'D', text: '两者没有区别' },
        ],
        answer: 'B',
        explanation:
          '这是 Anthropic 文章的核心定义：工作流的控制流由代码决定，Agent 的控制流由模型决定。因此工作流更可预测，Agent 更灵活但成本与错误风险更高。',
        tags: ['工作流 vs Agent'],
      },
      {
        id: 'llm-b2-c5-e2',
        type: 'judge',
        difficulty: 2,
        question: 'Anthropic 建议尽可能使用最复杂的 Agent 架构以获得最好效果。',
        answer: false,
        explanation:
          '恰恰相反：Anthropic 强烈建议**先找最简单的方案**，只在确实需要时才增加复杂度。很多应用只需优化单次 LLM 调用（加检索与上下文示例）就够了。',
        tags: ['设计原则'],
      },
      {
        id: 'llm-b2-c5-e3',
        type: 'multiple',
        difficulty: 3,
        question: 'Parallelization 工作流的两个变体是？（多选）',
        options: [
          { value: 'A', text: 'Sectioning：把任务拆成独立子任务并行跑' },
          { value: 'B', text: 'Voting：同一任务跑多次聚合结果' },
          { value: 'C', text: 'Routing：分类后分派' },
          { value: 'D', text: 'Chaining：串行拆步骤' },
        ],
        answer: ['A', 'B'],
        explanation:
          'C 和 D 是另外两种独立的模式。Parallelization 专指并行执行，分 Sectioning（分段）与 Voting（投票）两种变体。',
        tags: ['Parallelization'],
      },
      {
        id: 'llm-b2-c5-e4',
        type: 'fill',
        difficulty: 3,
        question: 'Orchestrator-Workers 与 Parallelization 的关键区别是：前者的子任务由编排者 ___ 决定，后者的子任务预先定义。',
        blanks: [['动态', '动态地', '根据输入', '按需']],
        explanation:
          'Parallelization 的子任务是固定预定义的（如三个固定审查角度）；Orchestrator-Workers 的子任务由中心 LLM 根据具体输入动态拆解，数量与内容都不固定。',
        tags: ['Orchestrator'],
      },
      {
        id: 'llm-b2-c5-e5',
        type: 'single',
        difficulty: 3,
        question: 'Evaluator-Optimizer 模式适用的两个条件是什么？',
        options: [
          { value: 'A', text: '任务简单 + 数据量大' },
          { value: 'B', text: '有清晰评估标准 + 迭代改进能带来可测量价值' },
          { value: 'C', text: '不需要人工介入 + 无需评估' },
          { value: 'D', text: '模型够大 + 预算充足' },
        ],
        answer: 'B',
        explanation:
          'Anthropic 的两个判断信号：人类给反馈时回答能明显改进；且 LLM 能提供这样的反馈。缺一则迭代没有意义。',
        tags: ['Evaluator-Optimizer'],
      },
      {
        id: 'llm-b2-c5-e6',
        type: 'code',
        difficulty: 2,
        question:
          '实现路由分发：route(query, routes)。\n\n- routes 是 dict：类别名 → 处理函数\n- 用关键词判断类别：含「退款」→ refund，含「报错」或「bug」→ tech，否则 general\n- 返回对应处理函数的执行结果\n\n若类别不在 routes 中，用 routes 里的 general。',
        starterCode: `def classify(text):
    if "退款" in text:
        return "refund"
    if "报错" in text or "bug" in text:
        return "tech"
    return "general"

def route(query, routes):
    cat = classify(query)
    ___

routes = {
    "refund": lambda q: f"退款处理: {q}",
    "tech": lambda q: f"技术支持: {q}",
    "general": lambda q: f"通用回答: {q}",
}
route("我要退款", routes)
`,
        setupCode: '',
        expectedOutput: "'退款处理: 我要退款'",
        tests: `routes = {
    "refund": lambda q: f"退款处理: {q}",
    "tech": lambda q: f"技术支持: {q}",
    "general": lambda q: f"通用回答: {q}",
}
assert route("我要退款", routes) == "退款处理: 我要退款"
assert route("程序报错了", routes) == "技术支持: 程序报错了"
assert route("你好", routes) == "通用回答: 你好"
# 类别缺失时回退到 general
routes2 = {"general": lambda q: f"兜底: {q}"}
assert route("我要退款", routes2) == "兜底: 我要退款"
`,
        answer: `def classify(text):
    if "退款" in text:
        return "refund"
    if "报错" in text or "bug" in text:
        return "tech"
    return "general"

def route(query, routes):
    cat = classify(query)
    handler = routes.get(cat) or routes.get("general")
    return handler(query)


routes = {
    "refund": lambda q: f"退款处理: {q}",
    "tech": lambda q: f"技术支持: {q}",
    "general": lambda q: f"通用回答: {q}",
}
route("我要退款", routes)`,
        explanation:
          '关键在 `routes.get(cat) or routes.get("general")`：先找精确类别，找不到就回退到通用处理。\n\n这是 Routing 模式的核心——分类决定走向，而兜底分支保证不会因未知类别崩溃。',
        tags: ['编程', 'Routing'],
      },
      {
        id: 'llm-b2-c5-e7',
        type: 'code',
        difficulty: 3,
        question:
          '实现投票聚合：vote_aggregate(votes, threshold=0.5)。\n\n- votes 是布尔列表（每个审查者的判断）\n- 返回是否通过（赞成比例 >= threshold）',
        starterCode: `def vote_aggregate(votes, threshold=0.5):
    if not votes:
        return False
    ___

vote_aggregate([True, True, False])
`,
        setupCode: '',
        expectedOutput: 'True（2/3 >= 0.5）',
        tests: `assert vote_aggregate([True, True, False]) == True, "2/3 应通过"
assert vote_aggregate([True, False, False]) == False, "1/3 应拒绝"
assert vote_aggregate([]) == False, "空投票应返回 False"
assert vote_aggregate([True, True], threshold=0.9) == True, "2/2 通过 0.9 阈值"
assert vote_aggregate([True, True, False], threshold=0.9) == False, "2/3 < 0.9 应拒绝"
assert vote_aggregate([True], threshold=1.0) == True
`,
        answer: `def vote_aggregate(votes, threshold=0.5):
    if not votes:
        return False
    ratio = sum(1 for v in votes if v) / len(votes)
    return ratio >= threshold


vote_aggregate([True, True, False])`,
        explanation:
          '关键在 `ratio >= threshold`（大于等于）。\n\n**阈值是重要的工程旋钮**：\n- 阈值高 → 误报少但漏报多（保守）；\n- 阈值低 → 漏报少但误报多（激进）。\n\n内容审核场景常用 0.5~0.7，安全场景可能要 0.8 以上。',
        tags: ['编程', 'Voting'],
      },
      {
        id: 'llm-b2-c5-e8',
        type: 'judge',
        difficulty: 3,
        question: 'Anthropic 建议从复杂框架开始搭建 Agent，因为框架能屏蔽底层细节。',
        answer: false,
        explanation:
          'Anthropic 明确建议**直接用 LLM API 开始**，很多模式几行代码就能实现。框架会增加抽象层、掩盖底层提示与响应、更难调试，还容易诱导不必要的复杂度。',
        tags: ['框架'],
      },
      {
        id: 'llm-b2-c5-e9',
        type: 'open',
        difficulty: 4,
        question:
          '请完整对比 Anthropic 的 Agent 工作流五模式：逐个说明适用场景、实现要点与优缺点，并给出「何时该用自主 Agent」的判断标准。',
        referenceAnswer: `**一、五模式对比**

**① Prompt Chaining（提示链）**
- 适用：任务能清晰分解为固定串行子任务；
- 实现：每步输出作为下步输入，中间可加程序化校验 gate；
- 优点：每次调用任务更简单，准确率更高；
- 缺点：延迟累加，不适合需要全局视野的任务；
- 例子：写文案 → 翻译；大纲 → 校验 → 写正文。

**② Routing（路由）**
- 适用：输入有明显类别、各类需不同处理，分类可靠；
- 实现：先分类（LLM 或传统分类器），再分派到专门的提示/工具链；
- 优点：避免"优化一类输入伤害另一类"；可做成本分流（简单问题给小模型）；
- 缺点：分类错误会全盘走错；需要维护多条链路；
- 例子：客服分流；难度分流到不同规格模型。

**③ Parallelization（并行化）**
- 适用：子任务可并行（提速），或需多视角提高置信度；
- 两个变体：
  - Sectioning：拆成独立子任务并发（如"回答"与"护栏审查"分开）；
  - Voting：同一任务多次执行后聚合（多角度审查代码漏洞）；
- 优点：延迟低、每个调用的关注点更聚焦（复杂多因素任务表现更好）；
- 缺点：成本成倍增加；聚合策略需要设计；
- 例子：护栏审查、代码漏洞多角度检查、内容审核多投票。

**④ Orchestrator-Workers（编排者-工人）**
- 适用：复杂任务且**无法预测需要哪些子任务**；
- 实现：中心 LLM 动态拆解 → 并行分派 → 汇总综合；
- 与 Parallelization 的关键区别：子任务不是预定义的，而是按输入动态决定的；
- 优点：灵活适配不同输入；可处理规模不确定的任务；
- 缺点：编排者本身可能拆错；需要可靠的汇总逻辑；成本高；
- 例子：多文件代码修改（涉及哪些文件取决于任务）；多来源信息检索。

**⑤ Evaluator-Optimizer（评估者-优化者）**
- 适用：有清晰评估标准 + 迭代改进有价值（两个条件都要满足）；
- 实现：生成 → 评估反馈 → 改进，循环直到通过或达最大轮次；
- 优点：能持续提升质量，适合有明确标准的精修任务；
- 缺点：迭代次数不确定、成本不可控；评估者本身可能判断失误；
- 例子：文学翻译（细微之处需多轮打磨）；需多轮检索的深度研究。

**二、模式之间的关系**

    单次 LLM 调用（+检索+示例）
        ↓ 不够时
    工作流（①~⑤，可组合）
        ↓ 仍不够时
    自主 Agent

这五种模式不是互斥的，可以**嵌套组合**。例如：
- Routing 的某个分支内部用 Chaining；
- Orchestrator-Workers 的工人用 Evaluator-Optimizer 精修输出。

**三、何时该用自主 Agent**

**必要条件（同时满足）**：
1. 开放式问题，**步骤数无法预测**；
2. **无法硬编码**固定路径；
3. 环境可沙箱、可回滚；
4. 有可靠的**环境反馈**（工具结果、代码执行结果）用于判断进度；
5. 能设置**停止条件**（最大轮次、超时、预算上限）。

**必须配套**：
- 人工检查点（checkpoint）；
- 充分的可观测性（trace/span）；
- 沙箱测试；
- 成本与延迟监控。

**Anthropic 的实践案例**：
- SWE-bench 编程 Agent（根据任务描述改多个文件）；
- computer use（模型操作计算机）。
这两个都是"步骤不可预测 + 反馈可验证"的典型。

**四、三条设计原则**

1. **保持简单**：复杂度只在能证明改善效果时才增加；
2. **优先透明**：显式展示 Agent 的规划步骤，让用户能理解与干预；
3. **精心设计 ACI**：把工具当作"给初级开发者写的 API"，文档要含示例、边界、参数说明；
   要 poka-yoke（让错误难以犯）。

**五、最重要的判断**

> 大多数生产场景用工作流就够了。自主 Agent 是**最后手段**，
> 而不是默认选择。成功不在于系统多复杂，而在于**选了对的系统**。`,
        rubric: [
          { point: '五个模式逐个说明适用场景与实现要点', score: 4 },
          { point: '指出 Orchestrator-Workers 与 Parallelization 的关键区别', score: 2 },
          { point: '给出自主 Agent 的必要条件（不可预测 + 可验证反馈 + 沙箱 + 停止条件）', score: 2 },
          { point: '三条设计原则（简单/透明/ACI）', score: 1 },
          { point: '强调"工作流通常就够，Agent 是最后手段"', score: 1 },
        ],
        keywords: ['工作流', 'Agent', '动态拆解', '评估标准', '沙箱', 'ACI'],
        explanation:
          '这是 Agent 架构的核心认知题。能说清"先工作流后 Agent"的决策顺序，就避免了最常见的过度工程陷阱。',
        tags: ['Agent 架构', '综合', '面试'],
      },
    ],
  },
];
