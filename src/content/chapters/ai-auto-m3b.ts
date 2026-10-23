import type { Chapter } from '../../types';

/* ============================================================
 *  AI 自动化 · M3 · c3 工作流平台、c4 企业级落地
 *
 *  来源：
 *  - 工程实践（非学术）：n8n 文档 https://docs.n8n.io
 *  - 工程实践（非学术）：Microsoft Power Automate / Zapier / Make 公开文档
 *  - 学术：CMU 11-766 第 16-17 讲（LLM 应用的危害与攻击）
 *  - 学术：Berkeley CS294 第 12 讲（安全可信 Agent）
 *  - 原创：框架、示例、图示、全部习题
 * ============================================================ */

export const aiAutoM3Chapters2: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c3：工作流平台
   * ============================================================ */
  {
    id: 'ai-auto-m3-c3',
    title: '工作流平台：可视化编排的取舍',
    goal: '理解可视化工作流平台的设计思想与代价，能判断什么时候该用平台、什么时候该写代码。',
    lessons: [
      {
        id: 'ai-auto-m3-c3-l1',
        title: '触发器 + 节点 + 连线，以及平台的代价',
        difficulty: 3,
        content: `
> **来源声明**：本章基于 n8n / Microsoft Power Automate / Zapier / Make
> 的公开文档，属于**工程实践知识**，非学术研究。

## 可视化工作流是什么

**核心模型**：三个元素。

    触发器（Trigger）→ 节点（Node）→ 节点（Node）→ ... → 输出

<WorkflowCanvas />

| 元素 | 作用 | 例子 |
| --- | --- | --- |
| **触发器** | 什么时候开始 | 收到邮件、定时、Webhook、表单提交 |
| **节点** | 做什么 | 发请求、转换数据、调用 AI、写数据库 |
| **连线** | 数据怎么流 | 上一个节点的输出 → 下一个节点的输入 |

**本质**：把代码里的"函数调用 + 数据传递"变成可视化图形。

## 为什么平台流行

| 优势 | 说明 |
| --- | --- |
| **上手快** | 不用搭环境、不用写代码，拖拽即可 |
| **内置集成** | 几百个现成连接器（Gmail、Slack、Notion、数据库…） |
| **非技术人员可用** | 运营、财务可以自己搭 |
| **可视化调试** | 每个节点的输入输出都能看到 |
| **托管运行** | 不用管服务器 |

**这是真实的价值**——很多需求不值得写一个服务，
但值得用平台搭一个。

## 平台的四个代价

**① 复杂逻辑难表达**

平台擅长"线性流程 + 简单分支"。遇到这些就吃力：

| 需求 | 平台的困境 |
| --- | --- |
| 嵌套循环 | 大多数平台不支持真正的循环 |
| 复杂条件（多层 if-else） | 分支图会变成蜘蛛网 |
| 状态机 | 无法表达"状态"概念 |
| 递归 | 不支持 |
| 复杂数据变换 | 需要写表达式，可读性差 |

**一个真实场景**：

    "对每个订单的每个商品，检查库存，如果不足则拆分订单"

这需要两层循环 + 状态维护，在可视化平台里极其别扭。

**② 调试困难**

| 问题 | 说明 |
| --- | --- |
| 错误信息模糊 | "节点执行失败"但不告诉你是哪一行 |
| 无法断点 | 只能看每个节点的输入输出 |
| 无法本地复现 | 环境在云端，本地跑不了 |
| 日志有限 | 长流程的日志被截断 |

**③ 供应商锁定**

- 流程定义是平台私有格式（JSON/图形），无法直接迁移；
- 依赖平台的内置连接器，换平台要重搭；
- 平台涨价/停服时无法应对。

**④ 版本控制困难**

- 图形化流程难以 diff（"这个版本改了什么？"）；
- 难以做代码审查；
- 多人协作容易冲突。

**部分平台改善了这点**（如 n8n 支持导出 JSON、可自托管、可 Git 版本控制），
但整体仍不如代码。

## 平台 vs 代码：决策矩阵

| 维度 | 用平台 | 写代码 |
| --- | --- | --- |
| 流程复杂度 | 低（线性 + 简单分支） | 高（循环、状态机、递归） |
| 维护者 | 非技术人员 | 工程师 |
| 生命周期 | 短期/实验性 | 长期/核心业务 |
| 变更频率 | 低 | 高（需要版本控制） |
| 集成需求 | 标准 SaaS（Gmail/Slack） | 内部系统/特殊协议 |
| 数据敏感性 | 低（可接受云端） | 高（需自托管） |
| 性能要求 | 低（分钟级） | 高（毫秒级） |
| 成本结构 | 按执行次数付费 | 按服务器付费 |

**经验判断**：

    一次性/实验性 → 平台
    每天几十次、逻辑简单 → 平台
    每天上千次、逻辑复杂 → 代码
    核心业务、需审计 → 代码（或自托管平台）

## 混合模式：最佳实践

**不要二选一，而是分层**：

    平台负责编排（触发器、简单判断、通知）
      ↓
    代码负责复杂节点（数据处理、算法、集成）
      ↓
    平台负责收尾（归档、通知）

**实现方式**：

**① 平台调用代码（Webhook / API）**

    触发器：收到表单
      → 节点：调用你的 API（复杂逻辑）
      → 节点：发送通知

**② 代码调用平台**

    你的服务 → 平台 Webhook → 平台的集成能力

**为什么混合好**：
- 平台处理"连接"（几百个 SaaS 集成很难自己写）；
- 代码处理"逻辑"（复杂计算、状态管理）；
- 各自发挥优势。

## 自托管 vs SaaS

| 维度 | SaaS（Zapier/Make） | 自托管（n8n） |
| --- | --- | --- |
| 运维 | 零 | 需自己部署维护 |
| 数据 | 经过第三方 | 完全自己控制 |
| 成本 | 按任务数付费（贵） | 按服务器付费（便宜） |
| 集成数量 | 极多（5000+） | 较少（但可自定义） |
| 合规 | 需评估数据出境 | 数据不出内网 |

**选择建议**：

- 数据敏感（客户信息、财务）→ **自托管**；
- 追求快速验证 → SaaS；
- 长期高频 → 自托管更省钱。

## 一个务实的使用原则

> **平台用来"连接"，代码用来"计算"。**

**反例**（常见的误用）：

    在 Zapier 里用 20 个节点实现一个复杂的
    "按规则拆分订单并计算最优配送方案"的逻辑

**结果**：
- 流程图无法维护；
- 出错无法调试；
- 平台费用高昂（每步都算一次任务）。

**正例**：

    触发器（新订单）
      → 调用你的 API（计算配送方案）
      → 写回系统 + 发通知

**3 个节点解决，逻辑在代码里。**

## 平台的适用边界（总结）

**适合**：

- 连接两个 SaaS 系统（如"表单提交 → 写入 Notion → 发 Slack 通知"）；
- 定时任务（如"每天 9 点汇总昨日数据发邮件"）；
- 简单条件分支（如"金额 > 1000 转主管审批"）；
- 非技术人员维护的流程；
- 快速验证想法。

**不适合**：

- 复杂数据变换（多表 join、复杂聚合）；
- 状态机 / 长流程（跨天、需恢复）；
- 高并发（每分钟上千次）；
- 强一致性要求（事务）；
- 需要精确测试的场景。

## 本节的来源

> **来源类型：工程实践（非学术）**
> - n8n 官方文档 https://docs.n8n.io（节点、触发器、自托管、工作流 JSON）
> - Microsoft Power Automate 文档（云流、桌面流、连接器）
> - Zapier / Make 公开文档（触发器、动作、任务计费）
> **说明**：以上均为厂商文档。可视化工作流平台是 2018 年后的商业产品形态，
> 在大学课程体系中无对应课程（MIT OCW 2590 门课中 workflow 命中 0 门）。
>
> **来源类型：原创**
> - 平台 vs 代码决策矩阵、混合模式设计、使用原则、全部示例与习题
`,
        tips: [
          {
            kind: 'interview',
            text: '「什么时候该用可视化工作流平台」：线性流程 + 简单分支 + 标准 SaaS 集成 + 非技术人员维护 → 用平台。复杂逻辑（循环/状态机/递归）、高并发、强一致性 → 写代码。',
          },
          {
            kind: 'leak',
            text: '最佳实践是混合：平台负责「连接」（几百个 SaaS 集成），代码负责「计算」（复杂逻辑）。不要让平台承担复杂逻辑——流程图会变成蜘蛛网且无法调试。',
          },
          {
            kind: 'pitfall',
            text: '平台按执行次数计费。在平台里用 20 个节点实现复杂逻辑，不仅难维护，费用也会爆炸。应该 3 个节点调用你的 API。',
          },
        ],
        demos: [
          {
            title: '平台 vs 代码的决策评分',
            lang: 'python',
            code: `def recommend_approach(
    complexity,          # 1-10 流程复杂度
    maintainer,          # "engineer" / "non_tech"
    lifespan,            # "short" / "long"
    change_freq,         # 1-10 变更频率
    needs_audit,         # 是否需要审计
    volume_per_day,      # 日执行量
    data_sensitive,      # 数据是否敏感
):
    """给平台/代码/混合打分。"""
    platform_score = 0
    code_score = 0
    reasons = []

    # 复杂度：低 -> 平台
    if complexity <= 3:
        platform_score += 3
        reasons.append("流程简单，平台足够")
    elif complexity >= 7:
        code_score += 3
        reasons.append("流程复杂，平台难表达")
    else:
        platform_score += 1
        code_score += 1

    # 维护者
    if maintainer == "non_tech":
        platform_score += 3
        reasons.append("非技术人员维护，平台更合适")
    else:
        code_score += 2

    # 生命周期
    if lifespan == "short":
        platform_score += 2
        reasons.append("短期使用，平台开发快")
    else:
        code_score += 2
        reasons.append("长期使用，代码更易维护")

    # 变更频率：高 -> 代码（版本控制）
    if change_freq >= 7:
        code_score += 2
        reasons.append("变更频繁，需要版本控制")
    else:
        platform_score += 1

    # 审计
    if needs_audit:
        code_score += 2
        reasons.append("需要审计，代码/自托管更可控")

    # 执行量：高 -> 代码（平台按次计费贵）
    if volume_per_day >= 1000:
        code_score += 3
        reasons.append(f"日执行 {volume_per_day} 次，平台费用高")
    elif volume_per_day <= 100:
        platform_score += 2

    # 数据敏感
    if data_sensitive:
        code_score += 2
        reasons.append("数据敏感，需自托管或代码")

    total = platform_score + code_score
    p_ratio = platform_score / total if total else 0.5

    if p_ratio >= 0.65:
        rec = "平台"
    elif p_ratio <= 0.35:
        rec = "代码"
    else:
        rec = "混合（平台编排 + 代码计算）"

    return rec, round(p_ratio, 2), reasons

scenarios = [
    ("表单 → Notion → Slack", 2, "non_tech", "short", 2, False, 50, False),
    ("每日销售报表邮件", 3, "engineer", "long", 1, False, 1, False),
    ("订单拆分与配送计算", 9, "engineer", "long", 5, True, 5000, True),
    ("客户数据同步（敏感）", 4, "engineer", "long", 3, True, 2000, True),
    ("客服工单分流", 5, "engineer", "long", 4, False, 3000, False),
]

print("场景                    | 推荐        | 平台占比 | 主要理由")
print("-" * 78)
for name, c, m, l, f, a, v, s in scenarios:
    rec, ratio, reasons = recommend_approach(c, m, l, f, a, v, s)
    print(f"{name:22} | {rec:10} | {ratio:8} | {reasons[0] if reasons else ''}")

print()
print("关键：没有绝对的答案，取决于多个维度。")
print("但「高复杂度 + 高执行量 + 需审计」几乎一定该写代码。")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'ai-auto-m3-c3-e1',
        type: 'single',
        difficulty: 2,
        question: '可视化工作流平台的三个核心元素是？',
        options: [
          { value: 'A', text: '触发器、节点、连线' },
          { value: 'B', text: '前端、后端、数据库' },
          { value: 'C', text: '输入、处理、输出' },
          { value: 'D', text: '用户、角色、权限' },
        ],
        answer: 'A',
        explanation:
          '触发器决定什么时候开始，节点决定做什么，连线决定数据怎么流。本质是把代码里的"函数调用 + 数据传递"变成可视化图形。',
        tags: ['平台模型'],
      },
      {
        id: 'ai-auto-m3-c3-e2',
        type: 'judge',
        difficulty: 2,
        question: '可视化工作流平台适合实现复杂的循环、状态机和递归逻辑。',
        answer: false,
        explanation:
          '这正是平台的短板。大多数平台不支持真正的循环，分支多了会变成蜘蛛网，无法表达状态机与递归。复杂逻辑应该写在代码里，平台只负责编排。',
        tags: ['平台局限'],
      },
      {
        id: 'ai-auto-m3-c3-e3',
        type: 'multiple',
        difficulty: 3,
        question: '使用可视化工作流平台的代价有哪些？（多选）',
        options: [
          { value: 'A', text: '复杂逻辑难表达（循环、状态机、递归）' },
          { value: 'B', text: '调试困难（错误信息模糊、无法断点）' },
          { value: 'C', text: '供应商锁定（流程私有格式、难迁移）' },
          { value: 'D', text: '完全无法连接 SaaS 系统' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误——连接 SaaS 恰恰是平台的最大优势（几百个现成连接器）。A/B/C 是真实代价，尤其是版本控制困难（图形流程难 diff）。',
        tags: ['平台代价'],
      },
      {
        id: 'ai-auto-m3-c3-e4',
        type: 'fill',
        difficulty: 3,
        question:
          '混合模式的核心原则是：平台用来「连接」，代码用来「___」。',
        blanks: [['计算', '逻辑', '处理', '业务逻辑']],
        explanation:
          '平台处理连接（几百个 SaaS 集成很难自己写），代码处理复杂计算（数据处理、算法、状态管理）。各自发挥优势，不要让平台承担复杂逻辑。',
        tags: ['混合模式'],
      },
      {
        id: 'ai-auto-m3-c3-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现工作流节点执行：run_workflow(nodes, initial_data)。\n\n- nodes: 函数列表，每个接收 data 返回新 data\n- 依次执行，若任一节点抛异常则停止\n- 返回 (最终 data, 执行成功的节点数)',
        starterCode: `def run_workflow(nodes, initial_data):
    data = initial_data
    done = 0
    for node in nodes:
        try:
            ___
            done += 1
        except Exception:
            break
    return data, done
`,
        setupCode: '',
        expectedOutput: '工作流执行',
        tests: `nodes = [
    lambda d: {**d, "a": 1},
    lambda d: {**d, "b": 2},
    lambda d: {**d, "c": 3},
]
data, done = run_workflow(nodes, {})
assert data == {"a": 1, "b": 2, "c": 3}, f"结果不正确: {data}"
assert done == 3

# 中间节点失败
def boom(d):
    raise ValueError("节点失败")
nodes2 = [lambda d: {**d, "x": 1}, boom, lambda d: {**d, "y": 2}]
data2, done2 = run_workflow(nodes2, {})
assert data2 == {"x": 1}, f"应停在失败前，实际 {data2}"
assert done2 == 1

# 空节点
d3, n3 = run_workflow([], {"z": 9})
assert d3 == {"z": 9} and n3 == 0
`,
        answer: `def run_workflow(nodes, initial_data):
    data = initial_data
    done = 0
    for node in nodes:
        try:
            data = node(data)
            done += 1
        except Exception:
            break
    return data, done
`,
        explanation:
          '这是**工作流引擎的核心循环**：串行执行、数据逐节点传递、失败即停。\n\n**注意 `data = node(data)`**：每个节点的输出成为下一个节点的输入——这就是"连线"的本质。\n\n生产环境还要加：\n- 每个节点的输入输出记录（便于调试）；\n- 超时控制；\n- 重试策略（区分可重试/不可重试错误）。',
        tags: ['编程', '工作流执行'],
      },
      {
        id: 'ai-auto-m3-c3-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现条件分支：run_with_branch(data, condition_fn, true_node, false_node)。\n\n- condition_fn(data) 返回 bool\n- 根据结果执行 true_node 或 false_node\n- 返回执行结果（节点的返回值）',
        starterCode: `def run_with_branch(data, condition_fn, true_node, false_node):
    if condition_fn(data):
        return ___
    return ___
`,
        setupCode: '',
        expectedOutput: '分支执行',
        tests: `d = {"amount": 1500}
is_big = lambda x: x["amount"] > 1000
big = lambda x: {"route": "manager", "amount": x["amount"]}
small = lambda x: {"route": "auto", "amount": x["amount"]}

r1 = run_with_branch(d, is_big, big, small)
assert r1["route"] == "manager", f"应走主管审批，实际 {r1}"
r2 = run_with_branch({"amount": 500}, is_big, big, small)
assert r2["route"] == "auto"
# 边界值
r3 = run_with_branch({"amount": 1000}, is_big, big, small)
assert r3["route"] == "auto", "恰好 1000 不满足 > 1000"
`,
        answer: `def run_with_branch(data, condition_fn, true_node, false_node):
    if condition_fn(data):
        return true_node(data)
    return false_node(data)
`,
        explanation:
          '这是可视化平台里"条件分支节点"的本质——就是 `if/else`。\n\n**注意边界**：`amount > 1000` 时 1000 走 false 分支。这类边界在业务上极重要（金额门槛、时间窗口），必须用测试覆盖。\n\n**平台的局限在这里显现**：两层嵌套分支还能画，三层以上图形就混乱了。',
        tags: ['编程', '条件分支'],
      },
      {
        id: 'ai-auto-m3-c3-e7',
        type: 'code',
        difficulty: 3,
        question:
          '估算平台使用成本：estimate_platform_cost(tasks_per_day, nodes_per_flow, price_per_task=0.002, days=30)。\n\n- 每个节点执行算一次 task\n- 返回 (月任务数, 月成本)，月成本保留 2 位小数',
        starterCode: `def estimate_platform_cost(tasks_per_day, nodes_per_flow, price_per_task=0.002, days=30):
    tasks_per_month = ___
    cost = ___
    return tasks_per_month, round(cost, 2)
`,
        setupCode: '',
        expectedOutput: '成本估算',
        tests: `t, c = estimate_platform_cost(100, 3)
# 100 任务/天 × 3 节点 = 300 tasks/天 × 30 = 9000
assert t == 9000, f"月任务数应为 9000，实际 {t}"
assert abs(c - 18.0) < 0.01, f"成本应为 18.0，实际 {c}"

# 高执行量 + 多节点 -> 成本爆炸
t2, c2 = estimate_platform_cost(5000, 20)
assert t2 == 3000000, f"应为 300 万，实际 {t2}"
assert c2 > 5000, f"成本应超过 5000，实际 {c2}"

# 低执行量
t3, c3 = estimate_platform_cost(10, 2)
assert t3 == 600 and abs(c3 - 1.2) < 0.01
`,
        answer: `def estimate_platform_cost(tasks_per_day, nodes_per_flow, price_per_task=0.002, days=30):
    tasks_per_month = tasks_per_day * nodes_per_flow * days
    cost = tasks_per_month * price_per_task
    return tasks_per_month, round(cost, 2)
`,
        explanation:
          '**这就是为什么高执行量要写代码**：\n\n- 100 次/天 × 3 节点 = 18 元/月（平台划算）；\n- 5000 次/天 × 20 节点 = 6000 元/月（还不如买台服务器）。\n\n**关键洞察**：平台按"节点执行次数"计费，所以**节点越多、执行越频繁，成本越高**。\n\n这正是"不要在平台里写复杂逻辑"的经济原因——20 个节点不仅难维护，还贵 20 倍。',
        tags: ['编程', '成本估算'],
      },
      {
        id: 'ai-auto-m3-c3-e8',
        type: 'judge',
        difficulty: 3,
        question: '自托管的工作流平台（如 n8n）在数据敏感场景下比 SaaS 平台更合适。',
        answer: true,
        explanation:
          '自托管意味着数据不出内网，完全自己控制。SaaS 平台的数据会经过第三方，涉及客户信息、财务数据时需评估合规风险。代价是要自己运维。',
        tags: ['自托管 vs SaaS'],
      },
      {
        id: 'ai-auto-m3-c3-e9',
        type: 'single',
        difficulty: 3,
        question: '在可视化平台里用 20 个节点实现"按规则拆分订单并计算配送方案"，主要问题是？',
        options: [
          { value: 'A', text: '流程图无法维护、出错难调试、平台费用高昂（每节点都算任务）' },
          { value: 'B', text: '平台不支持这么多节点' },
          { value: 'C', text: '性能太差' },
          { value: 'D', text: '没有这个问题' },
        ],
        answer: 'A',
        explanation:
          '三重代价：流程图变蜘蛛网难维护、错误信息模糊难调试、20 个节点每步计费导致费用是 3 节点方案的 7 倍。正确做法是 3 个节点调用你的 API，逻辑写在代码里。',
        tags: ['平台误用'],
      },
      {
        id: 'ai-auto-m3-c3-e10',
        type: 'open',
        difficulty: 4,
        question:
          '公司要用工作流平台搭三个自动化：① 表单提交后写入 Notion 并发 Slack 通知；② 每天汇总各渠道销售数据生成报表；③ 客户订单的智能拆分与配送路径规划。\n\n请判断每个该用什么方案（平台/代码/混合），并说明理由与具体设计。',
        referenceAnswer: `**① 表单 → Notion → Slack：纯平台**

**判断依据**：

| 维度 | 情况 | 倾向 |
| --- | --- | --- |
| 复杂度 | 3 个节点，线性 | 平台 |
| 维护者 | 运营（非技术） | 平台 |
| 生命周期 | 长期但简单 | 平台 |
| 变更频率 | 低 | 平台 |
| 集成 | Notion、Slack 都是标准 SaaS | 平台 |
| 执行量 | 每天几十次 | 平台 |
| 数据敏感 | 表单内容不敏感 | 平台 |

**设计**：

    触发器：表单提交（Webhook）
      ↓
    节点 1：格式化数据（映射字段）
      ↓
    节点 2：创建 Notion 页面
      ↓
    节点 3：发送 Slack 消息（含 Notion 链接）

**3 个节点，5 分钟搭完。** 这是平台的完美场景——
如果写代码，要处理 Notion API、Slack API、Webhook 签名，
至少半天。

**② 每日销售报表：混合**

**判断依据**：

| 维度 | 情况 | 倾向 |
| --- | --- | --- |
| 复杂度 | 中（多源汇总 + 计算） | 混合 |
| 集成 | 各渠道 API（淘宝/京东/自建） | 需定制 |
| 数据变换 | 多表 join、聚合、同比环比 | 代码 |
| 执行量 | 每天 1 次 | 平台 |

**为什么不是纯平台**：
- 多源数据需要 join 与聚合，平台的数据变换节点很弱；
- 同比环比需要历史数据对比，平台不擅长；
- 各渠道 API 可能需要签名、分页，平台的通用 HTTP 节点很别扭。

**为什么不是纯代码**：
- 定时调度、失败重试、通知——平台已经做好了；
- 报表模板、邮件发送——平台有现成节点。

**设计**：

    触发器：每天 9:00（平台定时器）
      ↓
    节点：调用你的报表 API（代码：拉数据 + 计算 + 生成 Excel）
      ↓
    节点：发送邮件（平台）
      ↓
    节点：失败时发 Slack 告警（平台）

**关键**：**平台负责调度与分发，代码负责计算。**

**③ 订单智能拆分与配送规划：纯代码**

**判断依据**：

| 维度 | 情况 | 倾向 |
| --- | --- | --- |
| 复杂度 | **高**（多约束优化、循环） | 代码 |
| 执行量 | 每天数千订单 | 代码 |
| 性能 | 需要秒级响应 | 代码 |
| 逻辑 | 库存检查 + 拆单算法 + 路径优化 | 代码 |
| 可测试 | 需要单元测试验证算法 | 代码 |
| 成本 | 平台按节点计费会爆炸 | 代码 |

**为什么不能用平台**：

1. **算法复杂度**：配送路径规划是 NP-hard 问题（TSP 变体），
   需要专门的求解器（OR-Tools），平台无法表达；

2. **循环与状态**：对每个订单的每个商品检查库存、按规则拆分，
   是嵌套循环，平台不支持；

3. **性能**：需要毫秒级响应，平台有网络往返开销；

4. **可测试性**：算法必须能写单元测试、能回归验证，
   平台的图形流程无法做；

5. **成本**：假设 3000 订单/天 × 10 个节点 = 3 万任务/天
   = 90 万任务/月，按 0.002 元/任务 = **1800 元/月**，
   而一台服务器只要几百元。

**设计**：

    订单服务（代码）
      ├─ 库存检查（查库存服务）
      ├─ 拆单算法（按仓库/时效/成本）
      ├─ 配送规划（OR-Tools 求解）
      └─ 写回订单系统

    # 平台只用于监控告警
    定时器 → 调用监控 API → 异常时发 Slack

**④ 三个方案的对比总结**

| 场景 | 方案 | 节点/函数数 | 关键理由 |
| --- | --- | --- | --- |
| ① 表单通知 | **纯平台** | 3 节点 | 简单 + 标准集成 + 非技术维护 |
| ② 日报 | **混合** | 平台 4 节点 + 代码 1 API | 调度归平台，计算归代码 |
| ③ 订单拆分 | **纯代码** | 1 个服务 | 算法 + 性能 + 成本 |

**⑤ 一个统一的判断框架**

    问四个问题：

    1) 逻辑里有循环/复杂算法吗？
       → 有 → 代码

    2) 每天执行超过 1000 次吗？
       → 是 → 代码（平台按次计费）

    3) 需要单元测试/版本控制吗？
       → 需要 → 代码

    4) 只是连接几个 SaaS + 简单判断？
       → 是 → 平台

    都不满足但介于中间 → 混合（平台编排 + 代码计算）

**⑥ 一个容易被忽略的点**

**混合方案需要"接口设计"**。

平台调用代码 API 时：
- 需要认证（API Key / OAuth）；
- 需要幂等（平台可能重试）；
- 需要超时处理（平台通常 30 秒超时）；
- 需要清晰的错误返回（让平台知道该不该重试）。

**如果接口设计不好，混合方案会比纯方案更麻烦。**

所以混合之前先问：**这个边界划得干净吗？**
如果代码 API 需要平台传很多上下文、又需要回调平台，
那不如全用代码。`,
        rubric: [
          { point: '① 纯平台，理由：简单 + 标准集成 + 非技术维护', score: 2 },
          { point: '② 混合，平台负责调度分发、代码负责计算', score: 3 },
          { point: '③ 纯代码，理由：算法复杂 + 高并发 + 成本 + 可测试', score: 3 },
          { point: '给出四个问题的统一判断框架', score: 1 },
          { point: '指出混合方案需要良好的接口设计（幂等/超时/认证）', score: 1 },
        ],
        keywords: ['纯平台', '混合', '纯代码', 'NP-hard', '按次计费', '接口设计'],
        explanation:
          '能按「算法复杂度 + 执行量 + 可测试性 + 集成类型」四个维度分别判断三个场景，并指出混合方案需要清晰接口，就是成熟的架构判断。',
        tags: ['方案选型', '综合'],
      },
    ],
  },

  /* ============================================================
   *  c4：企业级落地
   * ============================================================ */
  {
    id: 'ai-auto-m3-c4',
    title: '企业级落地：权限、审计与异常',
    goal: '掌握企业环境的额外约束，能设计权限模型、审计日志与异常处理与降级方案。',
    lessons: [
      {
        id: 'ai-auto-m3-c4-l1',
        title: '最小权限、审计日志与降级',
        difficulty: 4,
        content: `
> **来源声明**：本章结合学术来源（CMU 11-766 关于 LLM 应用危害与攻击、
> Berkeley CS294 安全可信 Agent）与工程实践（厂商安全指南）。

## 企业环境与个人项目的区别

个人项目跑通就行；企业项目要考虑：

| 约束 | 说明 |
| --- | --- |
| **权限** | 谁能做什么，不能越权 |
| **审计** | 每件事可追溯（谁、何时、做了什么、结果） |
| **合规** | 数据保护、行业监管 |
| **可靠性** | 出问题不能影响业务 |
| **可回滚** | 做错了能撤销 |
| **责任边界** | 出事了谁负责 |

**这些不是"额外功能"，而是上线的前提。**

## 权限：最小权限原则

**核心**：**只给完成任务所必需的最小权限。**

**为什么**：假设 AI 一定会出错（或被注入），
权限决定了它能造成多大破坏。

**权限矩阵设计**：

<PermissionMatrix />

    PERMISSIONS = {
        "read_order":     {"scopes": ["order:read"], "risk": "low"},
        "update_address": {"scopes": ["order:write"], "risk": "medium"},
        "refund":         {"scopes": ["payment:refund"], "risk": "high"},
        "delete_account": {"scopes": ["user:delete"], "risk": "critical"},
    }

**四个层次**：

| 层次 | 做法 |
| --- | --- |
| **身份** | Agent 用独立的服务账号，不是某个员工的账号 |
| **范围** | 只授予必要的 scope（读 vs 写、单表 vs 全库） |
| **数据** | 只能访问该用户/该租户的数据（行级权限） |
| **操作** | 高风险操作需二次确认或审批 |

**一个反例**：

    给 Agent 一个数据库管理员账号
    → 一次误操作可能删库

**正例**：

    给 Agent 一个只读账号 + 一个受限写账号（只能写特定表）
    → 即使出错，影响范围可控

## 审计：记录什么

**审计日志的最小字段集**：

    {
      "audit_id": "uuid",
      "timestamp": "2026-10-21T10:30:00Z",
      "actor": {
        "type": "agent",              # agent / human / system
        "id": "agent-order-v2",
        "on_behalf_of": "user_123"    # 代表哪个用户
      },
      "action": "refund",
      "target": {"type": "order", "id": "ORD20260101"},
      "input": {...},                  # 关键输入（脱敏后）
      "output": {...},                 # 执行结果
      "decision_basis": "...",         # 为什么做这个决定
      "result": "success",             # success / failure / partial
      "error": null,
      "trace_id": "..."                # 关联完整链路
    }

**必须记录的四类信息**：

| 类型 | 为什么 |
| --- | --- |
| **谁做的** | 区分 Agent 操作与人工操作 |
| **代表谁做的** | 权限与责任归属 |
| **做了什么** | 动作 + 目标 + 输入输出 |
| **为什么** | 决策依据（尤其 AI 的判断） |

**常见错误**：

| 错误 | 后果 |
| --- | --- |
| 只记"操作成功" | 出问题无法还原现场 |
| 不记 AI 的判断依据 | 无法解释"为什么退了这个单" |
| 不记原始输入 | 无法复现 |
| 日志可被修改 | 失去审计价值（必须 append-only） |

**保留期限**：财务相关通常 5~10 年（法规要求），
其他至少 90 天。

## 异常处理：三类与三种应对

**异常分类**：

| 类型 | 特征 | 例子 |
| --- | --- | --- |
| **可重试** | 临时性故障 | 网络超时、API 限流、数据库连接失败 |
| **需人工** | 业务规则不满足 | 订单状态不对、金额超限、权限不足 |
| **必须告警** | 系统性问题 | 认证失败、接口变更、数据异常 |

**三种应对**：

**① 重试（指数退避）**

    def retry_with_backoff(fn, max_attempts=3, base_delay=1):
        for attempt in range(max_attempts):
            try:
                return fn()
            except RetryableError:
                if attempt == max_attempts - 1:
                    raise
                time.sleep(base_delay * (2 ** attempt))

**关键**：**只对可重试错误重试**。
对"订单不存在"这种错误重试 3 次毫无意义，只是浪费时间。

**② 转人工（带上下文）**

不要只发"任务失败"，要带上足够信息让人能接手：

    {
      "task_id": "...",
      "reason": "订单状态为「已发货」，update_address 仅支持「待发货」",
      "context": {
        "order_id": "ORD20260101",
        "current_status": "已发货",
        "user_request": "改地址到杭州",
      },
      "suggested_action": "引导用户联系物流改址，或等收货后退回",
      "trace_link": "https://..."
    }

**③ 告警（分级）**

| 级别 | 触发 | 通知方式 |
| --- | --- | --- |
| **P0** | 服务不可用、资金风险 | 电话 + 短信 |
| **P1** | 大量失败、指标异常 | 短信 + 群消息 |
| **P2** | 个别失败、需关注 | 群消息 |
| **P3** | 信息 | 日报 |

**关键**：**告警要能分级，否则会疲劳**。
所有告警都发短信 → 三天后没人看。

## 降级：AI 挂了怎么办

**必须有降级方案**，否则 AI 服务故障会导致业务停摆。

**三种降级模式**：

| 模式 | 做法 | 适用 |
| --- | --- | --- |
| **降级到规则** | AI 不可用时用简单规则兜底 | 有确定性规则可用 |
| **降级到人工** | 全部转人工队列 | 无规则可兜底 |
| **降级到缓存** | 返回上次结果或默认值 | 只读场景 |

**实现方式**：

    class CircuitBreaker:
        def __init__(self, failure_threshold=5, timeout=60):
            self.failures = 0
            self.threshold = failure_threshold
            self.timeout = timeout
            self.opened_at = None

        def call(self, primary_fn, fallback_fn):
            if self.is_open():
                return fallback_fn()      # 熔断中，直接降级
            try:
                result = primary_fn()
                self.failures = 0
                return result
            except Exception:
                self.failures += 1
                if self.failures >= self.threshold:
                    self.opened_at = time.time()
                return fallback_fn()

**熔断器**的价值：
- 连续失败 N 次后自动熔断（不再调用故障服务）；
- 避免"每个请求都等超时"导致整体雪崩；
- 一段时间后自动尝试恢复。

## 数据合规

**三类敏感数据**：

| 类型 | 例子 | 处理 |
| --- | --- | --- |
| **PII** | 姓名、手机号、身份证、地址 | 脱敏后才送模型 |
| **财务** | 银行卡、交易金额 | 加密存储，最小化传输 |
| **商业机密** | 合同条款、定价策略 | 不出内网（用自托管模型） |

**脱敏的实现**：

    def mask_pii(text):
        text = re.sub(r"1[3-9]\\d{9}", "<PHONE>", text)          # 手机号
        text = re.sub(r"\\d{17}[\\dXx]", "<ID_CARD>", text)      # 身份证
        text = re.sub(r"[\\w.+-]+@[\\w-]+\\.[\\w.]+", "<EMAIL>", text)
        return text

**关键问题**：**送模型的数据要不要脱敏？**

| 场景 | 建议 |
| --- | --- |
| 用公有云 API | **必须脱敏**（数据会离开你的控制） |
| 用自托管模型 | 可不脱敏，但仍建议最小化 |

**一个常被忽略的点**：**日志里也可能有 PII**。
审计日志要记录输入，但输入里可能有手机号——
所以**日志也要脱敏**。

## 责任边界：出事了谁负责

**这是企业落地最容易被忽略、但最重要的问题。**

**明确的三层**：

| 层 | 责任 |
| --- | --- |
| **AI 系统** | 辅助决策，不承担最终责任 |
| **操作人** | 确认并执行，承担操作责任 |
| **企业** | 承担业务与法律后果 |

**实践要求**：

1. **AI 输出必须标注"AI 生成，需人工确认"**（尤其是对外内容）；
2. **高风险操作必须有人工签字**（不可逆的、金额大的、对外的）；
3. **保留完整的决策链路**（谁批准、依据什么）。

**一个反例**：

    AI 自动给客户发了道歉信，内容有误 → 客户投诉
    问题：谁批准的？没人。谁负责？说不清。

**正例**：

    AI 起草 → 人工审核并修改 → 人工点击发送
    记录：AI 版本、审核人、发送时间、最终内容

## 企业落地的检查清单

上线前逐条确认：

**权限**
- [ ] Agent 使用独立服务账号（不是员工账号）
- [ ] 只授予必要 scope
- [ ] 数据访问有行级/租户级隔离
- [ ] 高风险操作需二次确认

**审计**
- [ ] 记录 who / on_behalf_of / action / target / input / output
- [ ] 记录 AI 的决策依据
- [ ] 日志 append-only（不可修改）
- [ ] 保留期限符合法规

**异常**
- [ ] 异常分类（可重试/需人工/需告警）
- [ ] 只对可重试错误重试（指数退避）
- [ ] 转人工时带完整上下文
- [ ] 告警分级（避免疲劳）

**降级**
- [ ] 有降级方案（规则/人工/缓存）
- [ ] 有熔断器（避免雪崩）
- [ ] 降级时业务不中断

**合规**
- [ ] PII 脱敏（送模型前）
- [ ] 日志脱敏
- [ ] 敏感数据不出内网（必要时自托管）

**责任**
- [ ] AI 输出标注来源
- [ ] 高风险操作有人工签字
- [ ] 决策链路可追溯

**六项全过，才敢上线。**

## 本节的来源

> **来源类型：学术来源**
> - CMU 11-766 *Large Language Model Applications*，第 16 讲「Harms caused by LLM applications」
>   与第 17 讲「Attacking LLMs and LLM applications」
>   https://cmu-llms.org/schedule/
> - UC Berkeley CS294/194-196，第 12 讲「Towards Building Safe & Trustworthy AI Agents」
>   https://rdi.berkeley.edu/llm-agents/f24
>
> **来源类型：工程实践（非学术）**
> - Anthropic / OpenAI 关于 Agent 安全与权限的指南
> - 企业审计与合规的通用实践（SOX、GDPR 等法规要求）
> **说明**：具体法规要求请咨询法务，本节只讲技术实现。
>
> **来源类型：原创**
> - 权限四层次、审计字段集、异常三分类、熔断器实现、
>   降级三模式、责任三层、上线检查清单、全部习题
`,
        tips: [
          {
            kind: 'interview',
            text: '「最小权限为什么重要」：假设 AI 一定会出错或被注入，权限决定它能造成多大破坏。给 Agent 独立服务账号 + 只授予必要 scope + 行级隔离 + 高风险二次确认。',
          },
          {
            kind: 'leak',
            text: '审计日志必须记录「谁做的、代表谁、做了什么、为什么」四类信息。只记"操作成功"会导致出问题无法还原现场。日志必须 append-only。',
          },
          {
            kind: 'pitfall',
            text: '告警必须分级（P0 电话/P1 短信/P2 群消息/P3 日报）。所有告警都发短信会导致三天后没人看——告警疲劳是真实风险。',
          },
        ],
        demos: [
          {
            title: '熔断器 + 降级 + 重试',
            lang: 'python',
            code: `import time

class CircuitBreaker:
    """熔断器：连续失败 N 次后自动降级。"""
    def __init__(self, failure_threshold=3, recovery_time=5):
        self.failures = 0
        self.threshold = failure_threshold
        self.recovery_time = recovery_time
        self.opened_at = None
        self.stats = {"success": 0, "failure": 0, "fallback": 0}

    def is_open(self):
        if self.opened_at is None:
            return False
        if time.time() - self.opened_at > self.recovery_time:
            # 尝试恢复
            self.opened_at = None
            self.failures = 0
            return False
        return True

    def call(self, primary_fn, fallback_fn):
        if self.is_open():
            self.stats["fallback"] += 1
            return fallback_fn(), "fallback"
        try:
            result = primary_fn()
            self.failures = 0
            self.stats["success"] += 1
            return result, "primary"
        except Exception:
            self.failures += 1
            self.stats["failure"] += 1
            if self.failures >= self.threshold:
                self.opened_at = time.time()
            self.stats["fallback"] += 1
            return fallback_fn(), "fallback"

# 模拟：AI 服务正常 / 故障
class AIService:
    def __init__(self):
        self.healthy = True
        self.calls = 0
    def analyze(self, text):
        self.calls += 1
        if not self.healthy:
            raise RuntimeError("AI 服务不可用")
        return {"sentiment": "positive", "confidence": 0.9}

def rule_fallback(text):
    """降级方案：简单规则。"""
    return {"sentiment": "unknown", "confidence": 0.0, "fallback": True}

ai = AIService()
cb = CircuitBreaker(failure_threshold=3, recovery_time=1)

print("=== 阶段1：服务正常 ===")
for i in range(3):
    r, source = cb.call(lambda: ai.analyze("test"), lambda: rule_fallback("test"))
    print(f"  请求{i+1}: {source} -> {r['sentiment']}")

print()
print("=== 阶段2：服务故障 ===")
ai.healthy = False
for i in range(5):
    r, source = cb.call(lambda: ai.analyze("test"), lambda: rule_fallback("test"))
    print(f"  请求{i+1}: {source} -> {r['sentiment']} (熔断中={cb.is_open()})")

print()
print(f"统计: {cb.stats}")
print(f"AI 实际被调用次数: {ai.calls}（后 5 次中只有前 3 次真的调了，之后熔断）")
print()
print("熔断器的价值：")
print("  - 避免每个请求都等超时（雪崩）")
print("  - 服务恢复后自动重试")
print("  - 降级期间业务不中断")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'ai-auto-m3-c4-e1',
        type: 'single',
        difficulty: 2,
        question: '「最小权限原则」的核心是？',
        options: [
          { value: 'A', text: '给 AI 管理员权限以便处理所有情况' },
          { value: 'B', text: '只给完成任务所必需的最小权限' },
          { value: 'C', text: '权限越多越好' },
          { value: 'D', text: '不需要权限控制' },
        ],
        answer: 'B',
        explanation:
          '核心假设是"AI 一定会出错或被注入"，权限决定它能造成多大破坏。做法：独立服务账号 + 必要 scope + 行级隔离 + 高风险二次确认。',
        tags: ['最小权限'],
      },
      {
        id: 'ai-auto-m3-c4-e2',
        type: 'judge',
        difficulty: 2,
        question: '审计日志只需要记录"操作成功"，不需要记录 AI 的判断依据。',
        answer: false,
        explanation:
          '只记"成功"会导致出问题无法还原现场。必须记录四类信息：谁做的、代表谁、做了什么（含输入输出）、为什么（决策依据）。日志还必须 append-only。',
        tags: ['审计日志'],
      },
      {
        id: 'ai-auto-m3-c4-e3',
        type: 'multiple',
        difficulty: 3,
        question: '企业级落地必须考虑的约束有哪些？（多选）',
        options: [
          { value: 'A', text: '权限（最小权限、行级隔离）' },
          { value: 'B', text: '审计（可追溯、append-only）' },
          { value: 'C', text: '降级（AI 挂了业务不中断）' },
          { value: 'D', text: '界面是否好看' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 不是上线前提。A/B/C 加上合规与责任边界，是企业级落地的硬性约束——不是"额外功能"，而是"上线的前提"。',
        tags: ['企业约束'],
      },
      {
        id: 'ai-auto-m3-c4-e4',
        type: 'fill',
        difficulty: 3,
        question:
          '连续失败 N 次后自动停止调用故障服务、避免雪崩的机制叫 ___ 器。',
        blanks: [['熔断', 'circuit breaker', '断路器']],
        explanation:
          '熔断器的价值：避免每个请求都等超时导致整体雪崩；一段时间后自动尝试恢复；降级期间业务不中断。',
        tags: ['熔断器'],
      },
      {
        id: 'ai-auto-m3-c4-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现 PII 脱敏：mask_pii(text)。\n\n替换为占位符（用 re）：\n- 手机号（1 开头 11 位）→ `<PHONE>`\n- 身份证（18 位，末位可为 X）→ `<ID_CARD>`\n- 邮箱 → `<EMAIL>`',
        starterCode: `import re

def mask_pii(text):
    # 顺序关键：先匹配长的（身份证 18 位），再匹配短的（手机号 11 位）
    text = re.sub(r"\\d{17}[\\dXx]", ___, text)
    text = re.sub(r"1[3-9]\\d{9}", ___, text)
    text = re.sub(r"[\\w.+-]+@[\\w-]+\\.[\\w.]+", ___, text)
    return text
`,
        setupCode: '',
        expectedOutput: '脱敏结果',
        tests: `t1 = mask_pii("联系我 13812345678")
assert "<PHONE>" in t1 and "13812345678" not in t1, f"手机号未脱敏: {t1}"

t2 = mask_pii("身份证 110101199001011234")
assert "<ID_CARD>" in t2 and "110101199001011234" not in t2

t3 = mask_pii("邮箱 test@example.com")
assert "<EMAIL>" in t3 and "test@example.com" not in t3

# 多个 PII
t4 = mask_pii("电话 13900001111，邮箱 a@b.com")
assert "<PHONE>" in t4 and "<EMAIL>" in t4

# 无 PII 不变
t5 = mask_pii("这是一段普通文本")
assert t5 == "这是一段普通文本"
`,
        answer: `import re

def mask_pii(text):
    # 顺序关键：先长后短，否则身份证中的数字会被手机号规则误匹配
    text = re.sub(r"\\d{17}[\\dXx]", "<ID_CARD>", text)
    text = re.sub(r"1[3-9]\\d{9}", "<PHONE>", text)
    text = re.sub(r"[\\w.+-]+@[\\w-]+\\.[\\w.]+", "<EMAIL>", text)
    return text
`,
        explanation:
          '**注意顺序**：身份证 18 位数字可能被手机号规则部分匹配，所以**先脱敏手机号（更短更严格），再身份证**。\n\n实际上这里手机号是 11 位、身份证 18 位，正则不会冲突，但**顺序在复杂场景很重要**。\n\n**关键实践**：\n- 送模型前必须脱敏（公有云 API）；\n- **日志也要脱敏**（日志里记录了输入）；\n- 脱敏要可逆吗？**不要**——不可逆才安全。',
        tags: ['编程', 'PII 脱敏'],
      },
      {
        id: 'ai-auto-m3-c4-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现指数退避重试：retry_with_backoff(fn, max_attempts=3, base_delay=0.1, sleep_fn=None)。\n\n- 只对 RetryableError 重试\n- 第 n 次重试等待 base_delay * 2^n\n- 返回 (结果, 尝试次数)\n- 超过次数仍失败则抛出最后异常\n\n用 sleep_fn 注入以便测试（默认 time.sleep）。',
        starterCode: `import time

class RetryableError(Exception):
    pass

def retry_with_backoff(fn, max_attempts=3, base_delay=0.1, sleep_fn=None):
    sleep_fn = sleep_fn or time.sleep
    waits = []
    for attempt in range(max_attempts):
        try:
            return fn(), attempt + 1
        except RetryableError:
            if attempt == max_attempts - 1:
                raise
            delay = base_delay * (2 ** attempt)
            waits.append(delay)
            sleep_fn(delay)
    return None, max_attempts
`,
        setupCode: '',
        expectedOutput: '重试结果',
        tests: `waits = []
def fake_sleep(d): waits.append(d)

# 第 3 次成功
calls = {"n": 0}
def flaky():
    calls["n"] += 1
    if calls["n"] < 3:
        raise RetryableError("临时故障")
    return "OK"
r, n = retry_with_backoff(flaky, max_attempts=3, base_delay=0.1, sleep_fn=fake_sleep)
assert r == "OK" and n == 3, f"应第3次成功，实际 r={r}, n={n}"
assert len(waits) == 2, f"应等 2 次，实际 {waits}"
assert abs(waits[0] - 0.1) < 1e-9 and abs(waits[1] - 0.2) < 1e-9, f"退避不正确: {waits}"

# 一直失败 -> 抛异常
def always_fail():
    raise RetryableError("总是失败")
try:
    retry_with_backoff(always_fail, max_attempts=2, base_delay=0.1, sleep_fn=fake_sleep)
    assert False, "应抛出异常"
except RetryableError:
    pass

# 非可重试错误立即抛出
def bad():
    raise ValueError("不可重试")
try:
    retry_with_backoff(bad, max_attempts=3, sleep_fn=fake_sleep)
    assert False, "应抛出 ValueError"
except ValueError:
    pass
`,
        answer: `import time

class RetryableError(Exception):
    pass

def retry_with_backoff(fn, max_attempts=3, base_delay=0.1, sleep_fn=None):
    sleep_fn = sleep_fn or time.sleep
    waits = []
    for attempt in range(max_attempts):
        try:
            return fn(), attempt + 1
        except RetryableError:
            if attempt == max_attempts - 1:
                raise
            delay = base_delay * (2 ** attempt)
            waits.append(delay)
            sleep_fn(delay)
    return None, max_attempts
`,
        explanation:
          '**关键设计**：\n1. **只捕获 RetryableError** —— 非可重试错误（如 ValueError）立即抛出，不浪费 3 次尝试；\n2. **指数退避** `base * 2^attempt` —— 避免密集重试打爆服务；\n3. **最后一次不等待** —— 直接抛出，省掉无意义的等待。\n\n**实践要点**：\n- 生产环境要加**抖动（jitter）**，避免多个客户端同时重试；\n- 要设**总超时**，避免退避时间累积过长。',
        tags: ['编程', '重试'],
      },
      {
        id: 'ai-auto-m3-c4-e7',
        type: 'code',
        difficulty: 4,
        question:
          '实现熔断器：CircuitBreaker(threshold=3, recovery_time=60)。\n\n- call(primary_fn, fallback_fn)：正常时调 primary，失败计数；达到 threshold 后熔断，直接调 fallback\n- is_open()：是否处于熔断状态\n- 用 self.opened_at 记录熔断时间，用 self.now_fn 注入当前时间以便测试',
        starterCode: `class CircuitBreaker:
    def __init__(self, threshold=3, recovery_time=60, now_fn=None):
        self.threshold = threshold
        self.recovery_time = recovery_time
        self.now_fn = now_fn or (lambda: 0)
        self.failures = 0
        self.opened_at = None

    def is_open(self):
        if self.opened_at is None:
            return False
        if self.now_fn() - self.opened_at > self.recovery_time:
            ___
            return False
        return True

    def call(self, primary_fn, fallback_fn):
        if self.is_open():
            return fallback_fn()
        try:
            result = primary_fn()
            self.failures = 0
            return result
        except Exception:
            self.failures += 1
            if ___:
                ___
            return fallback_fn()
`,
        setupCode: '',
        expectedOutput: '熔断器',
        tests: `clock = {"t": 0}
cb = CircuitBreaker(threshold=2, recovery_time=10, now_fn=lambda: clock["t"])

def ok(): return "ok"
def fail(): raise RuntimeError("fail")
def fb(): return "fallback"

# 正常
assert cb.call(ok, fb) == "ok"
assert not cb.is_open()

# 失败 1 次，未熔断
assert cb.call(fail, fb) == "fallback"
assert not cb.is_open()

# 失败 2 次，熔断
assert cb.call(fail, fb) == "fallback"
assert cb.is_open(), "应已熔断"

# 熔断期间直接走 fallback（不调 primary）
assert cb.call(ok, fb) == "fallback"

# 时间过去，恢复
clock["t"] = 11
assert not cb.is_open(), "应已恢复"
assert cb.call(ok, fb) == "ok"
`,
        answer: `class CircuitBreaker:
    def __init__(self, threshold=3, recovery_time=60, now_fn=None):
        self.threshold = threshold
        self.recovery_time = recovery_time
        self.now_fn = now_fn or (lambda: 0)
        self.failures = 0
        self.opened_at = None

    def is_open(self):
        if self.opened_at is None:
            return False
        if self.now_fn() - self.opened_at > self.recovery_time:
            self.opened_at = None
            self.failures = 0
            return False
        return True

    def call(self, primary_fn, fallback_fn):
        if self.is_open():
            return fallback_fn()
        try:
            result = primary_fn()
            self.failures = 0
            return result
        except Exception:
            self.failures += 1
            if self.failures >= self.threshold:
                self.opened_at = self.now_fn()
            return fallback_fn()
`,
        explanation:
          '**三个状态**：闭合（正常）→ 打开（熔断）→ 半开（尝试恢复）。\n\n`is_open()` 里检查恢复时间，超时后重置状态——这就是"半开"的实现。\n\n**关键价值**：\n- 熔断期间**不调用** primary（避免每个请求都等超时）；\n- 直接走 fallback，响应快；\n- 时间到后自动尝试恢复。\n\n生产环境还应加：半开状态下只放少量请求试探。',
        tags: ['编程', '熔断器'],
      },
      {
        id: 'ai-auto-m3-c4-e8',
        type: 'judge',
        difficulty: 3,
        question: '所有类型的错误都应该重试 3 次，这样能提高成功率。',
        answer: false,
        explanation:
          '只有可重试错误（网络超时、限流、连接失败）才该重试。"订单不存在""权限不足""参数错误"这类重试 3 次毫无意义，只是浪费时间并延迟失败反馈。',
        tags: ['重试策略'],
      },
      {
        id: 'ai-auto-m3-c4-e9',
        type: 'single',
        difficulty: 3,
        question: '告警为什么要分级（P0~P3）？',
        options: [
          { value: 'A', text: '为了显得专业' },
          { value: 'B', text: '避免告警疲劳——所有告警都发短信会导致三天后没人看' },
          { value: 'C', text: '节省短信费用' },
          { value: 'D', text: '系统要求' },
        ],
        answer: 'B',
        explanation:
          '告警疲劳是真实风险。分级后：P0（服务不可用/资金风险）电话+短信，P1 短信+群消息，P2 群消息，P3 日报。这样关键告警才能被重视。',
        tags: ['告警分级'],
      },
      {
        id: 'ai-auto-m3-c4-e10',
        type: 'open',
        difficulty: 5,
        question:
          '你要把一个「AI 自动处理客户退款」的系统推上生产。\n\n请设计完整的企业级方案：① 权限模型；② 审计日志；③ 异常处理与降级；④ 数据合规；⑤ 责任边界；⑥ 上线检查清单。',
        referenceAnswer: `**① 权限模型**

**四个层次**：

**a) 身份隔离**

    Agent 使用独立服务账号：svc-agent-refund
    不使用任何员工的个人账号
    好处：可独立吊销、可独立审计、可限制 scope

**b) Scope 最小化**

    SCOPES = [
        "order:read",           # 读订单
        "payment:refund",       # 发起退款
        "notification:send",    # 发通知
    ]
    # 不含：user:write, order:delete, admin:*

**c) 行级权限**

    def can_refund(agent_ctx, order):
        # 只能操作"通过本次会话发起的"订单
        if order.user_id != agent_ctx.on_behalf_of:
            return False, "不能操作他人订单"
        # 单次会话最多 2 笔
        if agent_ctx.refund_count >= 2:
            return False, "单次会话退款次数超限"
        return True, ""

**d) 操作分级**

| 操作 | 要求 |
| --- | --- |
| 查订单 | 无需确认 |
| 退款 ≤ 200 元 | 无需人工，但需幂等 |
| 退款 200~1000 元 | 需用户二次确认（短信验证码） |
| 退款 > 1000 元 | **必须人工审批** |

**② 审计日志**

**每条记录**：

    {
      "audit_id": "a-20261021-0001",
      "timestamp": "2026-10-21T10:30:00Z",
      "actor": {
        "type": "agent",
        "id": "svc-agent-refund",
        "on_behalf_of": "user_123",
        "session_id": "sess-abc"
      },
      "action": "refund",
      "target": {"type": "order", "id": "ORD20260101"},
      "input": {
        "amount_cents": 29900,
        "reason": "质量问题",
        "user_message": "收到的东西坏了"     # 已脱敏
      },
      "decision_basis": {
        "policy_matched": "质量问题-30天内-全额",
        "confidence": 0.96,
        "checks_passed": ["status=已支付", "amount<=order_amount", "not_refunded"]
      },
      "output": {"refund_id": "RF20260101", "status": "success"},
      "result": "success",
      "trace_id": "trace-xyz",
      "idempotency_key": "refund:ORD20260101:sess-abc"
    }

**四个要求**：

1. **append-only**：写入后不可修改（用追加式存储或 WORM 存储）；
2. **脱敏**：user_message 里的手机号等已替换为占位符；
3. **可关联**：trace_id 能串起完整链路；
4. **保留期**：财务相关 5 年（法规要求）。

**③ 异常处理与降级**

**异常分类表**：

| 异常 | 类型 | 处理 |
| --- | --- | --- |
| LLM 服务超时 | 可重试 | 重试 2 次（指数退避）→ 仍失败转人工 |
| 退款接口超时 | 可重试 | 用幂等键重试 + 查询真实结果 |
| 订单不存在 | 需人工 | 回复用户核对订单号 |
| 订单状态不允许 | 需人工 | 说明原因 + 建议下一步 |
| 权限不足 | 必须告警 | 可能是配置错误，立即告警 |
| 数据库连接失败 | 可重试 + 告警 | 重试后仍失败 → P0 告警 |

**降级方案**：

    class RefundAgent:
        def __init__(self):
            self.cb_llm = CircuitBreaker(threshold=5, recovery_time=60)
            self.cb_refund = CircuitBreaker(threshold=3, recovery_time=30)

        def handle(self, request):
            # LLM 熔断时降级到规则
            analysis, source = self.cb_llm.call(
                lambda: self.llm_analyze(request),
                lambda: self.rule_analyze(request)     # 规则兜底
            )

            # 退款接口熔断时全部转人工
            if self.cb_refund.is_open():
                return self.to_manual(request, reason="退款服务不可用")

            result, _ = self.cb_refund.call(
                lambda: self.do_refund(request, analysis),
                lambda: self.to_manual(request, reason="退款接口异常")
            )
            return result

**降级矩阵**：

| 故障 | 降级到 | 业务影响 |
| --- | --- | --- |
| LLM 不可用 | 规则判断（只处理明确的简单案例） | 部分转人工 |
| 退款接口不可用 | 全部转人工队列 | 用户等待变长 |
| 数据库不可用 | 拒绝新请求 + 告警 | 业务暂停 |

**④ 数据合规**

**三类数据处理**：

| 数据 | 处理 |
| --- | --- |
| 用户消息（含手机号/地址） | **送 LLM 前脱敏** |
| 订单金额 | 可送（非 PII，但属商业数据） |
| 用户身份信息 | **不送 LLM**（只在本地校验） |

**脱敏实现**：

    def prepare_for_llm(request):
        text = mask_pii(request.user_message)     # 手机/身份证/邮箱
        text = mask_address(text)                 # 详细地址
        return {
            "message": text,
            "order_summary": {                    # 只给必要字段
                "status": request.order.status,
                "amount": request.order.amount,
                "days_since_purchase": request.days,
            }
        }

**日志脱敏**：审计日志里的 input 也要脱敏（用同一套函数）。

**自托管 vs 公有云**：

| 数据 | 建议 |
| --- | --- |
| 通用客户咨询 | 可用公有云 API（脱敏后） |
| 高价值客户/敏感行业 | 自托管模型 |

**⑤ 责任边界**

**三层责任**：

| 层 | 责任 |
| --- | --- |
| **AI 系统** | 辅助判断，不承担最终责任 |
| **用户** | 确认退款意愿（二次确认） |
| **企业** | 承担业务与法律后果 |

**实践要求**：

1. **AI 生成的对外回复必须标注**：
   "本回复由 AI 辅助生成，如需人工服务请回复'转人工'"。

2. **高风险操作必须人工签字**：
   - 金额 > 1000 元 → 人工审批；
   - 同一用户 30 天内第 3 次退款 → 人工审核。

3. **决策链路可追溯**：
   每笔退款都能回答"为什么退"——查 audit 表的 decision_basis。

**⑥ 上线检查清单**

**权限**
- [ ] 独立服务账号，非员工账号
- [ ] scope 仅含 order:read / payment:refund / notification:send
- [ ] 行级校验（只能操作自己的订单）
- [ ] 单会话退款次数限制（2 笔）
- [ ] 金额分级（≤200 自动 / 200~1000 二次确认 / >1000 人工）

**审计**
- [ ] 记录 actor / on_behalf_of / action / target / input / output
- [ ] 记录 decision_basis（政策匹配 + 置信度 + 校验项）
- [ ] append-only 存储
- [ ] 保留 5 年
- [ ] 日志脱敏

**异常**
- [ ] 异常分类（可重试/需人工/需告警）
- [ ] 只对可重试错误重试（指数退避 + 抖动）
- [ ] 转人工时带完整上下文 + 建议动作
- [ ] 告警分级（P0 电话 / P1 短信 / P2 群 / P3 日报）

**降级**
- [ ] LLM 熔断 → 规则兜底
- [ ] 退款接口熔断 → 全部转人工
- [ ] 熔断器参数合理（阈值 3~5，恢复 30~60 秒）
- [ ] 降级时业务不中断

**合规**
- [ ] PII 脱敏（送 LLM 前）
- [ ] 日志脱敏
- [ ] 敏感数据不出内网（必要时自托管）
- [ ] 数据保留期符合法规

**责任**
- [ ] AI 输出标注来源
- [ ] 高风险操作人工签字
- [ ] 决策链路可追溯
- [ ] 有明确的应急联系人与流程

**⑦ 灰度上线路径**

    第 1 周：影子模式（AI 处理但不真正退款，只记录建议）
      ↓ 对比 AI 建议 vs 人工决策，统计一致率
    第 2 周：5% 流量，≤200 元，全部人工确认
      ↓ 观察准确率与用户反馈
    第 3 周：20% 流量，≤200 元，抽检
      ↓
    第 4 周：50% 流量，放宽到 500 元
      ↓
    第 5 周：全量，保留 200~1000 元二次确认
      ↓
    持续：监控 P0/P1 指标、人工比例、用户满意度

**关键**：**每个阶段都有明确的准入条件**（如"一致率 > 95% 才进入下一阶段"），
不是"感觉可以了就放量"。

**⑧ 一个必须回答的问题**

**如果 AI 退错了一笔钱，怎么办？**

必须有答案：

1. **发现机制**：每日对账（AI 退款 vs 用户确认记录）；
2. **止损**：立即冻结该 Agent 的退款权限（一键开关）；
3. **追回**：联系用户协商（需人工）；
4. **复盘**：查 audit 日志，定位是政策判断错、抽取错、还是校验漏了；
5. **改进**：加规则、加校验、调提示。

**没有这个预案，就不该上线。**`,
        rubric: [
          { point: '权限四层：身份隔离 + scope 最小 + 行级 + 操作分级', score: 3 },
          { point: '审计四要素 + append-only + 脱敏 + decision_basis', score: 2 },
          { point: '异常分类 + 熔断器 + 降级矩阵', score: 2 },
          { point: '数据合规：PII 脱敏、日志脱敏、自托管判断', score: 1 },
          { point: '责任边界 + 灰度路径 + 退错钱的预案', score: 2 },
        ],
        keywords: ['服务账号', '行级权限', 'decision_basis', '熔断器', '降级矩阵', '对账预案'],
        explanation:
          '能给出「权限四层 + 审计四要素 + 熔断降级 + 灰度准入条件」的完整方案，并回答「退错钱怎么办」，就是生产级的落地设计。',
        tags: ['企业落地', '综合'],
      },
    ],
  },
];
