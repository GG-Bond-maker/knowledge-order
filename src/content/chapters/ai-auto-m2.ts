import type { Chapter } from '../../types';

/* ============================================================
 *  AI 自动化 · M2 Agent 架构与工作流
 *  c1 ReAct 循环：推理与行动交替
 *
 *  来源：
 *  - 学术：ReAct 论文 arXiv:2210.03629
 *  - 学术：Berkeley CS294 第 2 讲（Shunyu Yao 主讲）
 *  - 原创：示例、图示、全部习题
 * ============================================================ */

export const aiAutoM2Chapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'ai-auto-m2-c1',
    title: 'ReAct 循环：推理与行动交替',
    goal: '理解 Agent 的心跳机制，能亲手写出一个最小的 ReAct 循环，并知道它为什么会卡住。',
    lessons: [
      {
        id: 'ai-auto-m2-c1-l1',
        title: '从「一次性回答」到「边想边做」',
        difficulty: 3,
        content: `
### 学习目标

学完本节，你应该能够：
1. 对比纯 LLM/CoT/ReAct 在「获取新信息、验证假设、纠错」上的能力差异，复述 Thought/Action/Observation 的分工（模型只输出调用请求）；
2. 手写带 max_iterations 与重复调用检测的最小 ReAct 循环，说出三种失败模式与三个硬性停止条件；
3. 解释轨迹（trajectory）为何是调试与评估的核心资产。

### 前置知识

- m1-c2 的 LLM 特性（无记忆、概率输出）；
- m1-c3 的结构化输出（工具调用的形式）。

### 问题背景

「北京今天适合跑步吗」暴露纯 LLM 的死穴：参数知识停留在训练截止日，还会自信地猜。ReAct（Reasoning+Acting）让模型在 Thought（推理）与 Action（调工具）之间交替，Observation 把真实世界反馈塞回上下文——模型不执行工具，只输出「我要调用什么」，执行权在你手里，这是一切安全设计的基石。ReAct 是 Agent 的心跳机制，但有代价：每轮重发历史、成本线性涨、可能无限循环——硬性停止条件不是可选项。

### 直觉理解

纯 CoT 是「闭卷考试的学霸」：全靠脑内推演，错了没人纠正；ReAct 是「开卷考试+可以查资料的学生」：想一步、查一步、看一眼结果再想。查证过的事实进了上下文，幻觉被真实观察挤出去。但这个学生可能一根筋（反复查同一个网页）——你要给他掐表（max_iterations）、限预算（max_tokens）。

### 核心概念与原理详解

## 一个 LLM 做不到的事

问模型：「北京今天适合跑步吗？」

**纯 LLM 的回答**（只有参数知识）：

> 北京今天天气应该不错，适合跑步。

它**不知道今天真实的天气**——训练数据截止后就不知道了。
它只能"猜"，而且猜得很自信。这就是幻觉的典型场景。

**ReAct 的回答**（能查真实数据）：

    思考：我需要知道北京今天的天气。
    行动：调用 get_weather(city="北京")
    观察：{"temp": 18, "aqi": 45, "rain": false}
    思考：温度 18°C、空气优、无雨，条件都合适。
    回答：今天很适合跑步！气温 18°C，空气优。

**关键差别**：中间多了"行动"和"观察"两步。
模型不再只靠记忆，而是**去获取真实信息**。

## ReAct 是什么

**ReAct = Reasoning + Acting**（推理 + 行动），2022 年论文提出。

核心思想：让模型**交替进行**"思考"和"行动"：

    Thought（思考）→ Action（行动）→ Observation（观察）→ Thought → ...

<ReactLoopDemo />

**三个角色**：

| 环节 | 谁做的 | 产出 |
| --- | --- | --- |
| **Thought** | 模型 | 自然语言的推理（"我需要知道天气"） |
| **Action** | 模型决定，程序执行 | 结构化的工具调用请求 |
| **Observation** | 程序/环境 | 真实的执行结果 |

**注意**：模型**不执行**工具，它只输出"我要调用什么"。
真正执行的是你的程序。这个分工非常重要——它是后面所有安全设计的基础。

## 与纯 CoT 的区别

**CoT（Chain-of-Thought）**：让模型"先想再答"，但**全程只在脑子里想**。

    CoT:  思考 → 思考 → 思考 → 回答
    ReAct: 思考 → 行动 → 观察 → 思考 → 行动 → ... → 回答

**关键差异**：

| 维度 | CoT | ReAct |
| --- | --- | --- |
| 能否获取新信息 | ❌ 不能 | ✅ 能（通过工具） |
| 能否验证假设 | ❌ 不能 | ✅ 能（观察真实结果） |
| 能否纠错 | 有限（自我反思容易失败） | ✅ 能（根据观察调整） |
| 成本 | 低（一次调用） | 高（多轮调用） |

**为什么 CoT 的自我纠错不可靠**：模型在"脑子里"检查自己的推理，
用的还是同一套可能出错的逻辑。而 ReAct 能拿到**外部真实反馈**——
代码跑一下就知道对不对，这才是可靠的纠错。

## 一条轨迹（Trajectory）

ReAct 一次任务的完整记录叫**轨迹**：

    [
      {"role": "user", "content": "北京今天适合跑步吗？"},
      {"role": "assistant", "thought": "需要天气数据", "action": "get_weather", "args": {"city": "北京"}},
      {"role": "tool", "observation": {"temp": 18, "aqi": 45, "rain": false}},
      {"role": "assistant", "thought": "条件合适", "answer": "今天很适合跑步..."}
    ]

**轨迹是 Agent 调试的核心资产**：
- 出问题时，看轨迹就知道哪一步错了；
- 评估 Agent 时，轨迹质量比最终答案更重要（结果对但过程错也是隐患）。

## 为什么循环会卡住

ReAct 最常见的三种失败：

**① 无限循环**

模型反复调用同一个工具，拿到的结果一样，还是继续调。

    行动：search("北京的天气")
    观察：{...}
    思考：我还需要确认一下
    行动：search("北京的天气")   ← 又来了

**原因**：模型没有"我已经查过了"的记忆，或没有明确的停止条件。

**② 过早停止**

任务还没完成就给出了答案。

**③ 工具调用失败后不重试**

工具报错，模型直接放弃或编造一个结果。

**解法**：必须设置**硬性停止条件**：

    max_iterations = 10        # 最多 10 轮
    timeout = 60              # 最多 60 秒
    budget = 50000            # 最多 5 万 token

**这三个限制不是可选项，是必须项。** 没有它们，一个 bug 就能烧掉你的 API 预算。

## ReAct 的代价

| 成本项 | 说明 |
| --- | --- |
| **Token** | 每轮都要把完整历史发给模型，成本线性增长 |
| **延迟** | 10 轮就是 10 次 API 调用，可能几十秒 |
| **不确定性** | 每轮都有随机性，同输入可能不同轨迹 |

**所以**：能用确定性代码解决的，就不要用 ReAct。
这是后面 M2-c3「五种工作流模式」的核心论点。

## 本节的来源

> **来源类型：学术来源**
> - ReAct 论文：*ReAct: Synergizing Reasoning and Acting in Language Models*，
>   arXiv:[2210.03629](https://arxiv.org/abs/2210.03629)（Yao et al., 2022）
> - UC Berkeley CS294/194-196 *Large Language Model Agents*，
>   第 2 讲「LLM agents: brief history and overview」由 Shunyu Yao（ReAct 一作）主讲
>   https://rdi.berkeley.edu/llm-agents/f24
>
> **来源类型：原创**
> - 天气查询示例、循环动画、全部习题与解析均为本课程原创

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import json
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
print(f"实际执行 {i} 轮 <- 轨迹是调试的核心资产")\`\`\`

预期输出（实测）：实测：3 步轨迹中 get_weather 连续两次同参调用，第 2 次即被「已查过」检测器打断（实际执行 2 轮），max_iterations=3 作为强制停止兜底——重复检测+轮数上限两道闸门缺一不可，否则一个 bug 烧穿预算。

**常见错误**：Agent 循环不设 max_iterations/timeout/budget 三个硬闸（一个 bug 烧穿预算）；把工具执行权交给模型（模型只应输出调用请求）；评估只看最终答案不看轨迹（过程错结果对是隐患）。

### 常见误区

1. **ReAct 一定优于 CoT**——它用多轮调用换真实反馈，简单任务上又贵又慢；
2. **模型会自己停下来**——没有停止条件它会无限循环或过早停止，两者都要外部闸门；
3. **观察结果必须塞满上下文**——观察也要精简，长观察挤压有效信息。

### 知识关联

- **向前**：m1-c2「模型只续写」决定了它必须靠工具接触真实世界；
- **向后**：c2 的工具调用协议是 Action 的落地形式，c3 的工作流模式回答「什么时候根本不用 ReAct」；
- **平行**：paper-reasoning c2 的指针思想——模型输出「指向哪个工具」。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 循环 | Thought→Action→Observation 交替 |
| 分工 | 模型只输出调用请求，程序执行（安全基石） |
| 三失败 | 无限循环/过早停止/失败不重试 |
| 三闸门 | max_iterations + timeout + budget |
| 资产 | 轨迹是调试与评估的核心 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见论文原文：Yao et al., ReAct: Synergizing Reasoning and Acting in Language Models, arXiv:2210.03629）
`,
        tips: [
          {
            kind: 'interview',
            text: '「ReAct 与 CoT 的区别」：CoT 只在模型内部推理，ReAct 增加了「行动+观察」，能获取外部真实信息并据此纠错。这是 Agent 能可靠工作的基础。',
          },
          {
            kind: 'leak',
            text: '模型只负责「决定调用什么工具」，真正执行的是你的程序。这个分工是所有安全设计（权限、校验、沙箱）的前提。',
          },
          {
            kind: 'pitfall',
            text: 'ReAct 必须设置硬性停止条件（最大轮次、超时、token 预算）。没有它们，一个无限循环就能烧掉你的 API 预算。',
          },
        ],
        demos: [
          {
            title: '手写一个最小 ReAct 循环',
            lang: 'python',
            code: `import json

# ── 模拟工具 ──
def get_weather(city):
    db = {"北京": {"temp": 18, "aqi": 45, "rain": False},
          "上海": {"temp": 24, "aqi": 80, "rain": True}}
    return db.get(city, {"error": "城市不存在"})

TOOLS = {"get_weather": get_weather}

# ── 模拟 LLM：按状态决定下一步 ──
def fake_llm(history):
    """真实场景这里是一次 API 调用。"""
    last = history[-1]
    if last["role"] == "user":
        return {
            "thought": "我需要北京的真实天气，不能靠记忆猜。",
            "action": "get_weather",
            "args": {"city": "北京"},
        }
    if last["role"] == "tool":
        obs = last["observation"]
        if obs.get("rain"):
            return {"thought": "在下雨，不适合跑步。",
                    "answer": "今天有雨，建议室内运动。"}
        return {
            "thought": f"温度 {obs['temp']}°C、AQI {obs['aqi']}、无雨，条件合适。",
            "answer": f"今天很适合跑步！气温 {obs['temp']}°C，空气优。",
        }
    return {"thought": "无法判断", "answer": "抱歉，我无法回答。"}

# ── ReAct 循环 ──
def react_agent(question, max_iterations=5, verbose=True):
    history = [{"role": "user", "content": question}]
    for i in range(1, max_iterations + 1):
        out = fake_llm(history)
        if verbose:
            print(f"[第 {i} 轮] 思考：{out['thought']}")

        # 有 answer 就结束
        if "answer" in out:
            if verbose:
                print(f"最终回答：{out['answer']}")
            return out["answer"]

        # 否则执行工具
        action, args = out["action"], out["args"]
        if verbose:
            print(f"         行动：{action}({json.dumps(args, ensure_ascii=False)})")

        if action not in TOOLS:
            observation = {"error": f"未知工具 {action}"}
        else:
            try:
                observation = TOOLS[action](**args)
            except Exception as e:
                observation = {"error": str(e)}

        if verbose:
            print(f"         观察：{json.dumps(observation, ensure_ascii=False)}")

        history.append({"role": "assistant", **out})
        history.append({"role": "tool", "observation": observation})

    if verbose:
        print(f"达到最大轮次 {max_iterations}，强制退出")
    return None

print("=" * 50)
react_agent("北京今天适合跑步吗？")
print("=" * 50)
react_agent("上海今天适合跑步吗？")
print()
print("关键：每轮只做一件事——要么调用工具，要么给答案。")
print("达到 max_iterations 会强制退出，防止无限循环烧钱。")`,
          },
          {
            title: '无限循环是怎么发生的（以及如何防）',
            lang: 'python',
            code: `# 演示：一个"记性不好"的模型会陷入无限循环
def bad_llm(history):
    """每次都想再确认一次——典型 bug。"""
    tool_calls = sum(1 for h in history if h["role"] == "tool")
    if tool_calls < 3:   # 本应 1 次就够，这里故意设成 3
        return {"thought": "我再确认一下天气", "action": "get_weather",
                "args": {"city": "北京"}}
    return {"thought": "够了", "answer": "今天适合跑步"}

def run_with_limit(llm, max_iter):
    history = [{"role": "user", "content": "北京适合跑步吗"}]
    for i in range(max_iter):
        out = llm(history)
        if "answer" in out:
            print(f"  第 {i+1} 轮给出答案，用了 {i} 次工具调用")
            return out["answer"]
        history.append({"role": "assistant", **out})
        history.append({"role": "tool", "observation": {"temp": 18}})
    print(f"  [警告] 达到 max_iterations={max_iter}，强制退出，浪费了 {max_iter} 轮")
    return None

print("=== 正常模型（1 次工具调用）===")
def good_llm(history):
    if not any(h["role"] == "tool" for h in history):
        return {"thought": "需要天气", "action": "get_weather", "args": {"city": "北京"}}
    return {"thought": "够了", "answer": "适合跑步"}
run_with_limit(good_llm, 5)

print()
print("=== 有 bug 的模型（无限想确认）===")
run_with_limit(bad_llm, 10)

print()
print("=== 三种必须的硬性限制 ===")
limits = {
    "max_iterations": "防止无限循环（最常见）",
    "timeout_seconds": "防止单次工具调用卡死",
    "max_tokens_budget": "防止上下文无限增长导致费用爆炸",
}
for k, v in limits.items():
    print(f"  {k:20} -> {v}")

print()
print("没有这些限制，一个 bug 就能烧掉整月预算。")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'ai-auto-m2-c1-e1',
        relatedLessonId: 'ai-auto-m2-c1-l1',
        type: 'single',
        difficulty: 2,
        question: 'ReAct 相比纯 CoT（Chain-of-Thought）最本质的区别是？',
        options: [
          { value: 'A', text: 'ReAct 的模型更大' },
          { value: 'B', text: 'ReAct 增加了「行动」与「观察」，能获取外部真实信息并据此纠错' },
          { value: 'C', text: 'ReAct 不需要提示词' },
          { value: 'D', text: 'ReAct 只能用于数学题' },
        ],
        answer: 'B',
        explanation:
          'CoT 全程只在模型内部推理，用的还是同一套可能出错的逻辑；ReAct 增加了行动与观察，能拿到外部真实反馈（代码跑一下、查一下天气），这才是可靠的纠错。',
        tags: ['ReAct vs CoT'],
      },
      {
        id: 'ai-auto-m2-c1-e2',
        relatedLessonId: 'ai-auto-m2-c1-l1',
        type: 'judge',
        difficulty: 2,
        question: '在 ReAct 循环中，是模型自己执行工具调用并拿到结果。',
        answer: false,
        explanation:
          '模型只负责「决定调用什么工具、传什么参数」，真正执行的是你的程序，结果再由程序回填给模型。这个分工是所有安全设计（参数校验、权限控制、沙箱）的前提。',
        tags: ['执行分工'],
      },
      {
        id: 'ai-auto-m2-c1-e3',
        relatedLessonId: 'ai-auto-m2-c1-l1',
        type: 'multiple',
        difficulty: 3,
        question: 'ReAct 循环必须设置哪些硬性限制？（多选）',
        options: [
          { value: 'A', text: '最大迭代轮次 max_iterations' },
          { value: 'B', text: '超时时间 timeout' },
          { value: 'C', text: 'token 预算上限' },
          { value: 'D', text: '工具数量上限' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'A 防无限循环（最常见），B 防工具调用卡死，C 防上下文无限增长导致费用爆炸。D 不是必须的（工具数量影响选择准确率，但不是安全边界）。',
        tags: ['停止条件'],
      },
      {
        id: 'ai-auto-m2-c1-e4',
        relatedLessonId: 'ai-auto-m2-c1-l1',
        type: 'fill',
        difficulty: 3,
        question:
          'ReAct 一次任务中「思考-行动-观察」的完整记录称为一条 ___（trajectory），它是 Agent 调试与评估的核心资产。',
        blanks: [['轨迹', 'trajectory', 'Trajectory']],
        explanation:
          '轨迹记录了每一步的推理、工具调用与观察结果。出问题时看轨迹就知道哪步错了；评估时轨迹质量比最终答案更重要——结果对但过程错也是隐患。',
        tags: ['轨迹'],
      },
      {
        id: 'ai-auto-m2-c1-e5',
        relatedLessonId: 'ai-auto-m2-c1-l1',
        type: 'single',
        difficulty: 3,
        question: '为什么 CoT 的「自我纠错」不如 ReAct 可靠？',
        options: [
          { value: 'A', text: 'CoT 的模型参数更少' },
          { value: 'B', text: 'CoT 在模型内部检查，用的还是同一套可能出错的逻辑；ReAct 能拿到外部真实反馈' },
          { value: 'C', text: 'CoT 不支持中文' },
          { value: 'D', text: 'CoT 没有思考过程' },
        ],
        answer: 'B',
        explanation:
          '已有研究（如《Large Language Models Cannot Self-Correct Reasoning Yet》）表明模型仅靠自身反思难以纠正推理错误。ReAct 通过工具获取外部真值（代码执行结果、数据库查询），纠错才有依据。',
        tags: ['自我纠错'],
      },
      {
        id: 'ai-auto-m2-c1-e6',
        relatedLessonId: 'ai-auto-m2-c1-l1',
        type: 'code',
        difficulty: 2,
        question:
          '实现 ReAct 循环的停止判断：should_stop(state, max_iterations=5)。\n\nstate 是 dict，可能含 "answer"、"iteration" 字段。\n\n满足任一条件返回 True：\n1. 已经有 answer\n2. iteration >= max_iterations',
        starterCode: `def should_stop(state, max_iterations=5):
    if "answer" in state and state["answer"]:
        return True
    ___

should_stop({"answer": "好"})
`,
        setupCode: '',
        expectedOutput: 'True',
        tests: `assert should_stop({"answer": "好"}) == True, "有答案应停止"
assert should_stop({"iteration": 5}, 5) == True, "达到最大轮次应停止"
assert should_stop({"iteration": 3}, 5) == False, "未达上限应继续"
assert should_stop({}) == False, "空状态应继续"
assert should_stop({"answer": ""}) == False, "空答案不算完成"
assert should_stop({"iteration": 10}, 5) == True, "超过上限也应停止"
`,
        answer: `def should_stop(state, max_iterations=5):
    if "answer" in state and state["answer"]:
        return True
    return state.get("iteration", 0) >= max_iterations


should_stop({"answer": "好"})`,
        explanation:
          '这是 ReAct 循环的安全阀。两个条件缺一不可：\n- 有答案 → 正常结束；\n- 达到轮次上限 → 强制退出（防止无限循环）。\n\n`state.get("iteration", 0)` 用 get 提供默认值，避免 KeyError。',
        tags: ['编程', '停止条件'],
      },
      {
        id: 'ai-auto-m2-c1-e7',
        relatedLessonId: 'ai-auto-m2-c1-l1',
        type: 'code',
        difficulty: 3,
        question:
          '实现轨迹解析：parse_trajectory(trajectory)。\n\n- trajectory 是 dict 列表，每个 dict 可能有 role 字段（"user"/"assistant"/"tool"）\n- 返回 (思考次数, 工具调用次数, 是否有最终答案)\n\n思考次数 = assistant 中带 "thought" 的条数\n工具调用次数 = role == "tool" 的条数',
        starterCode: `def parse_trajectory(trajectory):
    thoughts = 0
    tool_calls = 0
    has_answer = False
    ___
    return thoughts, tool_calls, has_answer
`,
        setupCode: '',
        expectedOutput: '(2, 1, True)',
        tests: `traj = [
    {"role": "user", "content": "天气如何"},
    {"role": "assistant", "thought": "需要查天气", "action": "get_weather"},
    {"role": "tool", "observation": {"temp": 18}},
    {"role": "assistant", "thought": "够了", "answer": "适合跑步"},
]
t, tc, ha = parse_trajectory(traj)
assert t == 2, f"思考次数应为 2，实际 {t}"
assert tc == 1, f"工具调用应为 1，实际 {tc}"
assert ha == True, "应有最终答案"
# 无答案
traj2 = [{"role": "assistant", "thought": "想一下"}]
t2, tc2, ha2 = parse_trajectory(traj2)
assert t2 == 1 and tc2 == 0 and ha2 == False
# 空轨迹
assert parse_trajectory([]) == (0, 0, False)
`,
        answer: `def parse_trajectory(trajectory):
    thoughts = 0
    tool_calls = 0
    has_answer = False
    for step in trajectory:
        if step.get("role") == "assistant":
            if "thought" in step:
                thoughts += 1
            if step.get("answer"):
                has_answer = True
        elif step.get("role") == "tool":
            tool_calls += 1
    return thoughts, tool_calls, has_answer
`,
        explanation:
          '这是 Agent 可观测性的基础：从轨迹里提取结构化指标。\n\n实践中还要统计：总 token、每轮延迟、工具成功率、是否命中停止条件。\n\n**「有答案但工具调用 0 次」是一个重要信号**——说明模型可能在编造（没查就答）。',
        tags: ['编程', '轨迹分析'],
      },
      {
        id: 'ai-auto-m2-c1-e8',
        relatedLessonId: 'ai-auto-m2-c1-l1',
        type: 'code',
        difficulty: 3,
        question:
          '实现工具调用分发：dispatch_tool(tools, action, args)。\n\n- tools 是 dict：工具名 → 函数\n- 若工具不存在，返回 {"error": "unknown_tool"}\n- 若执行抛异常，返回 {"error": str(e)}\n- 正常返回函数结果',
        starterCode: `def dispatch_tool(tools, action, args):
    if action not in tools:
        ___
    try:
        ___
    except Exception as e:
        return {"error": str(e)}
`,
        setupCode: '',
        expectedOutput: '分发结果',
        tests: `tools = {
    "add": lambda a, b: {"sum": a + b},
    "boom": lambda: 1 / 0,
}
assert dispatch_tool(tools, "add", {"a": 1, "b": 2}) == {"sum": 3}
assert dispatch_tool(tools, "nope", {}) == {"error": "unknown_tool"}
r = dispatch_tool(tools, "boom", {})
assert "error" in r, f"应捕获异常，实际 {r}"
# 参数不匹配也应被捕获
r2 = dispatch_tool(tools, "add", {"a": 1})
assert "error" in r2
`,
        answer: `def dispatch_tool(tools, action, args):
    if action not in tools:
        return {"error": "unknown_tool"}
    try:
        return tools[action](**args)
    except Exception as e:
        return {"error": str(e)}
`,
        explanation:
          '**工具分发必须容错**，因为模型可能：\n- 调用不存在的工具；\n- 漏传必填参数；\n- 传错类型。\n\n所有错误都要转成结构化的 observation 回传给模型，让它有机会自我修正——而不是让整个循环崩掉。',
        tags: ['编程', '工具分发'],
      },
      {
        id: 'ai-auto-m2-c1-e9',
        relatedLessonId: 'ai-auto-m2-c1-l1',
        type: 'judge',
        difficulty: 4,
        question:
          '如果 ReAct 轨迹的最终答案正确，但中间工具调用全部失败（模型凭记忆猜对了），这条轨迹在评估中应视为完全合格。',
        answer: false,
        explanation:
          '「结果对但过程错」是典型的隐患：模型可能只是这次运气好。轨迹评估要检查工具是否真的被正确调用、观察结果是否被正确使用。生产系统中，这类轨迹应标记为「高风险」并重点审查。',
        tags: ['轨迹评估'],
      },
      {
        id: 'ai-auto-m2-c1-e10',
        relatedLessonId: 'ai-auto-m2-c1-l1',
        type: 'open',
        difficulty: 4,
        question:
          '你实现了一个 ReAct Agent 用于「查询订单状态」。上线后发现两个问题：① 某些请求会反复调用同一个查询接口十几次才结束；② 有时只调用一次就给出答案，但答案与真实订单状态不符。\n\n请分析这两个问题的可能原因，并给出具体的修复方案（要能落到代码层面）。',
        referenceAnswer: `**问题①：反复调用同一接口**

**可能原因**：

1. **没有把历史观察放入上下文**
   每轮只发了当前思考，模型不知道"我已经查过了"。
   表现：模型反复问同样的问题。

2. **观察结果格式不清晰**
   工具返回的 JSON 嵌套很深或字段名含糊，模型读不懂，以为没拿到数据。

3. **缺少显式的"信息已足够"判断**
   模型没有明确的收敛信号，倾向于"再确认一下"。

4. **没有强制停止条件**
   即使有 max_iterations，如果设得过大（如 50）也会浪费大量调用。

**修复方案**：

\`\`\`python
def build_messages(history):
    """把完整轨迹（含所有 observation）放进上下文。"""
    msgs = []
    for step in history:
        if step["role"] == "user":
            msgs.append({"role": "user", "content": step["content"]})
        elif step["role"] == "assistant":
            msgs.append({"role": "assistant", "content":
                f"思考：{step.get('thought','')}\\n"
                f"行动：{step.get('action','')}({step.get('args',{})})"})
        elif step["role"] == "tool":
            # 关键：observation 必须完整回填
            msgs.append({"role": "user", "content":
                f"[工具结果] {json.dumps(step['observation'], ensure_ascii=False)}"})
    return msgs
\`\`\`

**加重复调用检测**：

\`\`\`python
def detect_loop(history, window=3):
    """检测最近 window 次工具调用是否完全相同。"""
    calls = [(s.get("action"), json.dumps(s.get("args", {}), sort_keys=True))
             for s in history if s["role"] == "assistant" and "action" in s]
    if len(calls) < window:
        return False
    return len(set(calls[-window:])) == 1   # 连续 3 次一样 → 卡住了

# 在循环里
if detect_loop(history):
    # 强制注入提示，要求基于现有信息作答
    history.append({"role": "system", "content":
        "你已经多次调用相同工具，请基于已有信息给出最终答案或说明信息不足。"})
\`\`\`

**降低 max_iterations**：查询订单这种简单任务，3~5 轮足够。

---

**问题②：只查一次但答案不符**

**可能原因**：

1. **模型没真的用观察结果**
   它拿到数据后仍凭"印象"回答（尤其是提示里没强调"必须基于工具结果"）。

2. **工具参数错了但没报错**
   比如把"订单号"传成了"用户ID"，接口返回了另一个订单的数据，模型照单全收。

3. **观察结果被截断**
   上下文超长时，早期的 observation 被裁掉。

4. **模型编造了工具调用**
   它输出了看起来像工具调用的文本，但程序没识别到，于是没有真实数据。

**修复方案**：

**a) 提示中强制引用来源**

\`\`\`python
SYSTEM = """你是一个订单查询助手。
规则：
1. 必须调用 query_order 获取真实数据后才能回答。
2. 回答中必须引用工具返回的具体字段值（如订单状态、金额）。
3. 如果工具返回错误或空结果，必须如实告知用户，禁止猜测。
4. 禁止编造任何订单信息。"""
\`\`\`

**b) 参数校验 + 回显确认**

\`\`\`python
def query_order(order_id: str):
    if not order_id or not order_id.startswith("ORD"):
        return {"error": "订单号格式错误，应为 ORD 开头"}
    result = db.query(order_id)
    if not result:
        return {"error": f"订单 {order_id} 不存在"}
    # 回显关键字段，便于模型核对
    return {"order_id": order_id, **result}
\`\`\`

**c) 强制校验：答案必须含工具数据**

\`\`\`python
def validate_answer(answer, observations):
    """检查答案中的关键数字是否来自工具结果。"""
    if not observations:
        return False, "没有工具结果却给出了答案"
    text = json.dumps(observations, ensure_ascii=False)
    # 简单检查：答案里出现的数字是否在观察结果中出现过
    import re
    nums = re.findall(r"\\d{2,}", answer)
    for n in nums:
        if n not in text:
            return False, f"答案中的 {n} 未出现在工具结果中，疑似编造"
    return True, "OK"
\`\`\`

**d) 后置检查 + 重试**

\`\`\`python
ok, reason = validate_answer(final_answer, observations)
if not ok:
    # 打回重做，明确告知原因
    history.append({"role": "system", "content": f"你的回答未通过校验：{reason}。请重新调用工具并基于真实数据回答。"})
    continue
\`\`\`

**e) 上下文管理**
把工具结果放在靠后的位置（或做摘要），避免被截断。

---

**通用建议**

| 措施 | 解决 |
| --- | --- |
| 完整回填 observation | 问题① |
| 重复调用检测 + 强制收敛提示 | 问题① |
| 降低 max_iterations 到任务合理值 | 问题① |
| 提示中强制"基于工具结果回答" | 问题② |
| 参数校验 + 回显 | 问题② |
| 答案与观察结果交叉校验 | 问题② |
| 记录并回放轨迹 | 两个问题都要 |

**最关键的一条**：**把轨迹完整落盘**。
有了轨迹，这两个问题都能在几小时内定位到具体哪一轮出了什么错——
没有轨迹，只能靠猜。`,
        rubric: [
          { point: '问题①：指出历史 observation 未回填 / 无收敛信号', score: 2 },
          { point: '问题①：给出重复检测与强制收敛的具体代码', score: 2 },
          { point: '问题②：指出模型未使用观察结果 / 参数错误 / 编造调用', score: 2 },
          { point: '问题②：给出提示约束 + 答案与观察交叉校验', score: 2 },
          { point: '强调轨迹落盘是可调试的前提', score: 1 },
        ],
        keywords: ['observation 回填', '重复检测', '强制收敛', '交叉校验', '轨迹落盘'],
        explanation:
          '这道题把 ReAct 的两个典型故障串起来。能给出「检测重复调用 + 强制收敛」与「答案与观察交叉校验」两套具体代码，说明真正理解了工程细节。',
        tags: ['ReAct 实战', '综合'],
      },
    ],
  },
];
