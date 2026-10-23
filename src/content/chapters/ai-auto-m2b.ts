import type { Chapter } from '../../types';

/* ============================================================
 *  AI 自动化 · M2 Agent 架构与工作流
 *  c2 工具调用    c3 五种工作流模式
 *
 *  来源：
 *  - 学术：Toolformer arXiv:2302.04761
 *  - 学术：CMU 11-766 第 11 讲「Tool-use, chitchat, personas」
 *  - 学术：StateFlow arXiv:2403.11322
 *  - 工程实践（非学术）：Anthropic《Building effective agents》、OpenAI Function Calling、MCP 规范
 *  - 原创：示例、图示、全部习题
 * ============================================================ */

export const aiAutoM2Chapters2: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c2：工具调用
   * ============================================================ */
  {
    id: 'ai-auto-m2-c2',
    title: '工具调用：让 LLM 能操作世界',
    goal: '理解 Function Calling 的完整机制，掌握 ACI 设计原则，能写出「模型不容易用错」的工具。',
    lessons: [
      {
        id: 'ai-auto-m2-c2-l1',
        title: '从「说」到「做」：工具调用的机制与设计',
        difficulty: 4,
        content: `
## 一个根本限制

LLM 只会**生成 token**。它不能查数据库、不能发邮件、不能改文件。

**工具调用（Function Calling / Tool Use）** 就是给它装上手：
模型输出一个结构化的「调用请求」，你的程序去执行，再把结果回填。

## 完整流程

<ToolCallFlow />

**五个步骤，责任分明**：

| 步骤 | 谁负责 | 关键点 |
| --- | --- | --- |
| ① 提供工具定义 | 你的程序 | 名称、描述、参数 schema |
| ② 模型决定调用 | 模型 | 输出 JSON 格式的调用请求 |
| ③ 解析与校验 | **你的程序** | 必填项、类型、取值范围 |
| ④ 执行 | **你的程序** | 真正的副作用发生在这里 |
| ⑤ 回填结果 | 你的程序 | 转成模型能读懂的形式 |

**最重要的一条**：**模型永远不执行任何东西**。
它只输出"我想调用 query_order，参数是 {order_id: 'ORD123'}"。
是否真的执行、以什么权限执行，完全由你的代码决定。

**这就是所有安全设计的基石**——你能拦、能改、能审计。

## 工具定义的三个要素

    {
      "name": "query_order",
      "description": "查询订单状态。当用户询问订单进度、物流、退款状态时使用。",
      "inputSchema": {
        "type": "object",
        "properties": {
          "order_id": {"type": "string", "description": "订单号，ORD 开头，如 ORD20260101"},
          "include_logistics": {"type": "boolean", "description": "是否返回物流轨迹，默认 false"}
        },
        "required": ["order_id"]
      }
    }

**① name**：动词 + 名词，简短明确（\`query_order\` 而非 \`order\`）

**② description**：这是**最重要的部分**。要写清：
- **什么时候该用**（触发条件）
- **什么时候不该用**（边界）
- **返回什么**（预期结果）

**③ inputSchema**：参数类型、描述、必填项、枚举值

## ACI：Agent-Computer Interface

Anthropic 提出一个重要类比：

> 人类工程师需要好的**人机界面（HCI）**，
> Agent 需要好的**Agent-计算机界面（ACI）**。
> 两者投入应该相当。

**ACI 设计检查清单**：

| 检查项 | 反例 | 正例 |
| --- | --- | --- |
| 描述是否说清何时用 | "查询订单" | "查询订单状态。用户问订单进度/物流/退款时用。不用于查询商品库存。" |
| 参数名是否自解释 | \`q\`, \`t\` | \`order_id\`, \`include_logistics\` |
| 是否给了示例 | 无 | "如 ORD20260101" |
| 是否有边界说明 | 无 | "不用于查询商品库存" |
| 是否 poka-yoke | 自由文本 | 枚举值、格式校验 |

**"设身处地为模型想"**：如果你看着这个定义要思考"这参数该填什么"，
模型大概率也会困惑。

## Poka-yoke：让错误难以发生

源自丰田生产方式的「防呆设计」。

**做法**：改参数结构，让错误调用在语法上就做不到。

| 反例 | 正例 | 效果 |
| --- | --- | --- |
| \`date: "2026-10-21"\`（自由字符串） | \`date: {"type":"string","format":"date"}\` | 格式错误可提前拦截 |
| \`action: "delete"\`（自由文本） | \`action: {"enum":["create","update","delete"]}\` | 不可能拼错 |
| \`amount: 100\`（单位不明） | \`amount_cents: 10000\` | 消除元/分歧义 |
| 一个 \`execute(sql)\` | \`query_readonly(sql)\` + 独立的写接口 | 读操作不可能误写 |

**一个真实的反面案例**：给模型一个 \`run_shell(command)\` 工具。
它可能生成 \`rm -rf /\`。这不是模型"坏"，而是**你给了它一把没有保险的枪**。

**正确做法**：把能力切成窄接口——
\`list_files(dir)\`、\`read_file(path)\`、\`write_file(path, content)\`，
每个都有参数校验和权限检查。**不要给万能接口**。

## 工具数量：不是越多越好

| 工具数 | 问题 |
| --- | --- |
| 3~10 个 | 最佳区间，选择准确率高 |
| 10~30 个 | 开始混淆，需要分组或路由 |
| > 50 个 | 选择准确率显著下降，必须分层（先选工具组，再选具体工具） |

**为什么多了会错**：
- 定义占满上下文，挤压有效信息；
- 相似工具难以区分（\`get_user\` vs \`fetch_user_info\`）；
- 模型注意力分散。

**解法**：
1. **合并**：相似工具合成一个，用参数区分；
2. **路由**：先用一个轻量调用判断该用哪一组，再加载那组工具；
3. **动态加载**：只把当前相关的工具放进上下文（MCP 的思路）。

## 错误处理：让模型能自我修复

**关键原则**：错误信息要**告诉模型怎么改**，而不只是"失败了"。

    ❌ {"error": "invalid input"}
    ✅ {"error": "order_id 格式错误：应为 ORD 开头，你传的是 '12345'。示例：ORD20260101"}

**为什么**：模型看到可操作的错误信息，下一轮就能修正。
看到 \`invalid input\` 只能瞎猜。

**四类常见错误**：

| 类型 | 处理 |
| --- | --- |
| 工具不存在 | 返回可用工具列表 |
| 参数缺失 | 指出缺哪个、格式是什么 |
| 参数非法 | 指出期望值与实际值 |
| 执行失败（网络/权限） | 说明原因 + 是否可重试 |

## 幂等与副作用

**读操作**（查询）可以随意重试。
**写操作**（下单、发邮件、转账）**必须幂等**。

**为什么**：模型可能因为超时重试，或陷入循环重复调用。
没有幂等保护，用户会被扣两次钱。

**做法**：

    def create_order(user_id, items, idempotency_key):
        # 同一个 key 只创建一次
        if existing := db.get_by_key(idempotency_key):
            return existing
        return db.create(user_id, items, idempotency_key)

**\`idempotency_key\` 由谁生成**？
- 由程序生成（如 \`hash(session_id + turn_index + tool_name)\`）；
- 不要依赖模型生成——它可能每次都给不同的值。

## 本节的来源

> **来源类型：学术来源**
> - Toolformer: *Language Models Can Teach Themselves to Use Tools*，
>   arXiv:[2302.04761](https://arxiv.org/abs/2302.04761)
> - CMU 11-766 *Large Language Model Applications*，第 11 讲「Tool-use, chitchat, personas, and companionship」
>   https://cmu-llms.org/schedule/
>
> **来源类型：工程实践（非学术）**
> - Anthropic《Building effective agents》附录 2「Prompt engineering your tools」
>   https://www.anthropic.com/research/building-effective-agents
> - OpenAI Function Calling 文档 https://platform.openai.com/docs/guides/function-calling
> - Model Context Protocol 规范 https://modelcontextprotocol.io
> - **说明**：以上为厂商工程文档，非同行评审的学术来源，作为实践参考
>
> **来源类型：原创**
> - 全部代码示例、图示与习题
`,
        tips: [
          {
            kind: 'interview',
            text: '「模型会执行工具吗」：不会。模型只输出结构化的调用请求，真正执行的是你的程序。这个分工是所有安全设计（校验/权限/审计）的前提。',
          },
          {
            kind: 'leak',
            text: 'ACI 设计的核心是「设身处地为模型想」：如果你看工具定义要思考参数怎么填，模型也会困惑。描述要写清何时用、何时不用、返回什么。',
          },
          {
            kind: 'pitfall',
            text: '绝不要给模型万能接口（如 run_shell、execute(sql)）。要切成窄接口 + 参数校验 + 权限检查，这是 poka-yoke 的核心思想。',
          },
        ],
        demos: [
          {
            title: '工具定义 + 校验 + 分发 + 错误回填',
            lang: 'python',
            code: `import json
import re

# ── 工具定义（ACI 设计）──
TOOL_DEFS = [
    {
        "name": "query_order",
        "description": "查询订单状态。用户询问订单进度、物流、退款状态时使用。"
                       "不用于查询商品库存或价格。",
        "inputSchema": {
            "type": "object",
            "properties": {
                "order_id": {"type": "string", "description": "订单号，ORD 开头，如 ORD20260101"},
            },
            "required": ["order_id"],
        },
    },
    {
        "name": "refund",
        "description": "发起退款。仅在用户明确要求退款且订单状态为已支付时使用。",
        "inputSchema": {
            "type": "object",
            "properties": {
                "order_id": {"type": "string", "description": "订单号，ORD 开头"},
                "reason": {"type": "string", "enum": ["质量问题", "七天无理由", "发错货", "其他"]},
            },
            "required": ["order_id", "reason"],
        },
    },
]

# ── 校验器：poka-yoke ──
def validate_args(tool_name, args):
    """返回 (是否合法, 错误信息)。错误信息要告诉模型怎么改。"""
    schema = next(t["inputSchema"] for t in TOOL_DEFS if t["name"] == tool_name)
    props = schema["properties"]

    for req in schema.get("required", []):
        if req not in args:
            return False, f"缺少必填参数 {req}。{props[req].get('description', '')}"

    for k, v in args.items():
        if k not in props:
            return False, f"未知参数 {k}。可用参数：{list(props)}"
        spec = props[k]
        if spec.get("type") == "string" and not isinstance(v, str):
            return False, f"参数 {k} 应为字符串，你传了 {type(v).__name__}"
        if "enum" in spec and v not in spec["enum"]:
            return False, f"参数 {k} 取值非法：{v}。可选：{spec['enum']}"

    # 业务规则校验
    oid = args.get("order_id", "")
    if oid and not re.fullmatch(r"ORD\\d{8}", oid):
        return False, f"order_id 格式错误：应为 ORD + 8 位数字，你传的是 {oid!r}。示例：ORD20260101"

    return True, ""

# ── 模拟业务实现 ──
ORDERS = {"ORD20260101": {"status": "已发货", "amount": 299}}
REFUNDED = set()

def _query_order(order_id):
    o = ORDERS.get(order_id)
    return o if o else {"error": f"订单 {order_id} 不存在"}

def _refund(order_id, reason):
    if order_id in REFUNDED:
        return {"ok": True, "note": "已退款过（幂等）"}
    o = ORDERS.get(order_id)
    if not o:
        return {"error": f"订单 {order_id} 不存在"}
    if o["status"] != "已支付":
        return {"error": f"订单状态为「{o['status']}」，无法退款。仅已支付订单可退款。"}
    REFUNDED.add(order_id)
    return {"ok": True, "refunded": o["amount"], "reason": reason}

IMPL = {"query_order": _query_order, "refund": _refund}

# ── 分发：校验 → 执行 → 错误回填 ──
def dispatch(tool_name, args):
    if tool_name not in IMPL:
        return {"error": f"工具 {tool_name} 不存在。可用工具：{list(IMPL)}"}

    ok, err = validate_args(tool_name, args)
    if not ok:
        return {"error": err, "hint": "请修正参数后重试"}

    try:
        return IMPL[tool_name](**args)
    except Exception as e:
        return {"error": f"执行失败：{e}"}

# ── 测试 ──
cases = [
    ("query_order", {"order_id": "ORD20260101"}),          # 正常
    ("query_order", {"order_id": "12345"}),                # 格式错
    ("query_order", {}),                                    # 缺参数
    ("query_order", {"order_id": "ORD20260101", "x": 1}),   # 未知参数
    ("refund", {"order_id": "ORD20260101", "reason": "乱填"}),  # 枚举错
    ("refund", {"order_id": "ORD20260101", "reason": "质量问题"}),  # 业务规则拦
    ("nonexistent", {}),                                     # 工具不存在
]

for name, args in cases:
    print(f"{name}({args})")
    print(f"  -> {json.dumps(dispatch(name, args), ensure_ascii=False)}")
    print()

print("注意：每条错误信息都告诉模型「怎么改」，而不是只说「失败了」。")
print("模型看到可操作的错误，下一轮就能自我修正。")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'ai-auto-m2-c2-e1',
        type: 'single',
        difficulty: 2,
        question: '在工具调用流程中，真正执行工具的是？',
        options: [
          { value: 'A', text: 'LLM 自己' },
          { value: 'B', text: '你的程序（模型只输出调用请求）' },
          { value: 'C', text: '工具定义的 JSON' },
          { value: 'D', text: '用户' },
        ],
        answer: 'B',
        explanation:
          '模型只输出结构化的调用请求（调什么工具、传什么参数），真正执行的是你的代码。这个分工是参数校验、权限控制、审计日志的基础。',
        tags: ['执行分工'],
      },
      {
        id: 'ai-auto-m2-c2-e2',
        type: 'judge',
        difficulty: 2,
        question: '给模型提供越多工具，它完成任务的能力就越强，所以应该尽可能多地注册工具。',
        answer: false,
        explanation:
          '工具过多会导致选择准确率显著下降：定义占满上下文、相似工具难以区分、注意力分散。3~10 个是最佳区间，超过 30 个应做分层（先选工具组再选具体工具）或动态加载。',
        tags: ['工具数量'],
      },
      {
        id: 'ai-auto-m2-c2-e3',
        type: 'multiple',
        difficulty: 3,
        question: '关于 ACI（Agent-Computer Interface）设计，下列做法正确的有？（多选）',
        options: [
          { value: 'A', text: '在 description 里写清「什么时候该用、什么时候不该用」' },
          { value: 'B', text: '参数名要自解释（order_id 而非 q）' },
          { value: 'C', text: '给一个通用的 run_shell 工具覆盖所有需求' },
          { value: 'D', text: '用枚举值代替自由文本，让错误调用难以发生' },
        ],
        answer: ['A', 'B', 'D'],
        explanation:
          'C 是典型的反面案例——万能接口没有保险，模型可能生成危险命令。正确做法是切成窄接口（list_files/read_file/write_file），每个都有校验与权限检查。',
        tags: ['ACI 设计'],
      },
      {
        id: 'ai-auto-m2-c2-e4',
        type: 'fill',
        difficulty: 3,
        question:
          '让错误调用在结构上难以发生的设计思想（源自丰田生产方式）叫 ___，例如用枚举值代替自由文本参数。',
        blanks: [['poka-yoke', '防呆', 'Poka-yoke', '防呆设计']],
        explanation:
          'Poka-yoke（防呆设计）通过改变接口结构让错误无法发生。例如 amount_cents 代替 amount（消除元/分歧义）、独立只读查询接口代替通用 execute。',
        tags: ['poka-yoke'],
      },
      {
        id: 'ai-auto-m2-c2-e5',
        type: 'single',
        difficulty: 3,
        question: '为什么写操作（下单、转账）的工具必须做幂等保护？',
        options: [
          { value: 'A', text: '为了提升速度' },
          { value: 'B', text: '模型可能因超时重试或陷入循环重复调用，导致用户被扣两次钱' },
          { value: 'C', text: '为了减少 token 消耗' },
          { value: 'D', text: '幂等是数据库的要求' },
        ],
        answer: 'B',
        explanation:
          '模型不知道"上一次已经成功了"，超时后可能重试；也可能陷入循环重复调用。没有幂等键保护，副作用会被执行多次。幂等键应由程序生成，不能依赖模型。',
        tags: ['幂等'],
      },
      {
        id: 'ai-auto-m2-c2-e6',
        type: 'code',
        difficulty: 2,
        question:
          '实现工具参数校验：validate_required(schema, args)。\n\n- schema 含 required 列表\n- 返回缺失的必填参数列表（保持 schema 中的顺序）',
        starterCode: `def validate_required(schema, args):
    missing = []
    ___
    return missing
`,
        setupCode: '',
        expectedOutput: "['order_id']",
        tests: `schema = {"required": ["order_id", "reason"]}
assert validate_required(schema, {"order_id": "x", "reason": "y"}) == []
assert validate_required(schema, {"order_id": "x"}) == ["reason"]
assert validate_required(schema, {}) == ["order_id", "reason"], "应保持顺序"
assert validate_required({"required": []}, {}) == []
assert validate_required({}, {}) == [], "无 required 字段应返回空"
`,
        answer: `def validate_required(schema, args):
    missing = []
    for key in schema.get("required", []):
        if key not in args:
            missing.append(key)
    return missing
`,
        explanation:
          '遍历 schema 的 required 列表（而非 args 的键），保证返回顺序与 schema 一致。\n\n**注意 `key not in args`**：即使值为 None 也算"存在"，是否允许空值应由类型校验单独处理。',
        tags: ['编程', '参数校验'],
      },
      {
        id: 'ai-auto-m2-c2-e7',
        type: 'code',
        difficulty: 3,
        question:
          '实现枚举校验：validate_enum(schema, args)。\n\n对 schema.properties 中带 enum 的字段，检查 args 的值是否在枚举内。\n返回 (是否合法, 错误信息)。合法时错误信息为空串。',
        starterCode: `def validate_enum(schema, args):
    props = schema.get("properties", {})
    for key, spec in props.items():
        if "enum" not in spec or key not in args:
            continue
        ___
    return True, ""
`,
        setupCode: '',
        expectedOutput: '枚举校验结果',
        tests: `schema = {
    "properties": {
        "reason": {"type": "string", "enum": ["质量问题", "七天无理由"]},
        "note": {"type": "string"},
    }
}
ok, err = validate_enum(schema, {"reason": "质量问题"})
assert ok and err == ""
ok2, err2 = validate_enum(schema, {"reason": "乱填"})
assert not ok2, "非法枚举应返回 False"
assert "乱填" in err2 and "质量问题" in err2, f"错误信息应指出实际值与可选值，实际 {err2}"
# 字段不存在时跳过
ok3, _ = validate_enum(schema, {})
assert ok3
# 无 enum 的字段不校验
ok4, _ = validate_enum(schema, {"note": "任意内容"})
assert ok4
`,
        answer: `def validate_enum(schema, args):
    props = schema.get("properties", {})
    for key, spec in props.items():
        if "enum" not in spec or key not in args:
            continue
        if args[key] not in spec["enum"]:
            return False, f"参数 {key} 取值非法：{args[key]!r}。可选：{spec['enum']}"
    return True, ""
`,
        explanation:
          '错误信息必须**同时给出实际值与可选值**——模型才知道怎么改。\n\n这是 ACI 设计的核心：错误信息不是给开发者看的日志，而是**给模型看的修正提示**。',
        tags: ['编程', '枚举校验'],
      },
      {
        id: 'ai-auto-m2-c2-e8',
        type: 'code',
        difficulty: 3,
        question:
          '实现幂等写入：idempotent_create(store, key, payload)。\n\n- store 是 dict，记录 key → 结果\n- 若 key 已存在，直接返回已有结果（不重复创建）\n- 否则调用 create_fn 创建，存入 store 并返回\n\n签名：idempotent_create(store, key, payload, create_fn)',
        starterCode: `def idempotent_create(store, key, payload, create_fn):
    if key in store:
        ___
    result = create_fn(payload)
    ___
    return result
`,
        setupCode: '',
        expectedOutput: '幂等创建',
        tests: `store = {}
calls = []
def create_fn(p):
    calls.append(p)
    return {"id": len(calls), "payload": p}

r1 = idempotent_create(store, "k1", {"x": 1}, create_fn)
r2 = idempotent_create(store, "k1", {"x": 1}, create_fn)
assert len(calls) == 1, f"相同 key 应只创建一次，实际 {len(calls)} 次"
assert r1 == r2, "两次应返回相同结果"
# 不同 key 应创建两次
r3 = idempotent_create(store, "k2", {"x": 2}, create_fn)
assert len(calls) == 2
assert r3["id"] == 2
`,
        answer: `def idempotent_create(store, key, payload, create_fn):
    if key in store:
        return store[key]
    result = create_fn(payload)
    store[key] = result
    return result
`,
        explanation:
          '这就是幂等保护的核心：**相同 key 只产生一次副作用**。\n\n生产环境用数据库唯一索引或 Redis SETNX 实现，但逻辑相同。\n\n**关键**：key 必须由程序生成（如 `hash(session + turn + tool)`），不能让模型生成——它每次可能给不同值，幂等就失效了。',
        tags: ['编程', '幂等'],
      },
      {
        id: 'ai-auto-m2-c2-e9',
        type: 'judge',
        difficulty: 3,
        question:
          '工具执行失败时，返回 {"error": "invalid input"} 就足够了，模型自己能猜出哪里错了。',
        answer: false,
        explanation:
          '模型无法从 "invalid input" 推断具体问题。错误信息必须包含：哪个参数错了、期望什么格式、实际传了什么、正确示例。可操作的错误信息才能让模型自我修复。',
        tags: ['错误回填'],
      },
      {
        id: 'ai-auto-m2-c2-e10',
        type: 'code',
        difficulty: 4,
        question:
          '实现工具选择器（分层路由）：select_tools(query, tool_groups, top_k=5)。\n\n- tool_groups: dict，组名 → 该组的关键词列表\n- 按关键词命中数给组打分，返回命中数最高的组的工具名列表\n- 若无命中，返回空列表\n\n签名：select_tools(query, tool_groups, tools_by_group, top_k=5)',
        starterCode: `def select_tools(query, tool_groups, tools_by_group, top_k=5):
    scores = {}
    ___
    if not scores or max(scores.values()) == 0:
        return []
    best = ___
    return tools_by_group.get(best, [])[:top_k]
`,
        setupCode: '',
        expectedOutput: '按关键词路由到工具组',
        tests: `groups = {
    "order": ["订单", "物流", "退款", "发货"],
    "user": ["用户", "账号", "登录", "密码"],
}
tools = {
    "order": ["query_order", "refund", "track_logistics"],
    "user": ["get_user", "reset_password"],
}
assert select_tools("我的订单到哪了", groups, tools) == ["query_order", "refund", "track_logistics"]
assert select_tools("忘记密码了", groups, tools) == ["get_user", "reset_password"]
assert select_tools("今天天气", groups, tools) == [], "无命中应返回空"
# 多个关键词命中
r = select_tools("订单退款怎么弄", groups, tools)
assert r == tools["order"], f"应路由到 order 组，实际 {r}"
`,
        answer: `def select_tools(query, tool_groups, tools_by_group, top_k=5):
    scores = {}
    for group, keywords in tool_groups.items():
        hit = sum(1 for kw in keywords if kw in query)
        scores[group] = hit
    if not scores or max(scores.values()) == 0:
        return []
    best = max(scores, key=scores.get)
    return tools_by_group.get(best, [])[:top_k]
`,
        explanation:
          '这是**分层路由**的最小实现：先用轻量规则判断该用哪一组工具，再只加载那组的定义。\n\n**为什么重要**：工具超过 30 个时，全量塞进上下文会导致选择准确率下降。分层后每次只有 3~5 个候选，准确率大幅提升。\n\n生产环境会用向量检索或小模型做路由，但思路一致。',
        tags: ['编程', '工具路由'],
      },
      {
        id: 'ai-auto-m2-c2-e11',
        type: 'single',
        difficulty: 4,
        question: '下列哪个工具设计最符合 poka-yoke 原则？',
        options: [
          { value: 'A', text: 'run_sql(sql: string)' },
          { value: 'B', text: 'query_orders(status: enum["pending","shipped","done"], limit: int)' },
          { value: 'C', text: 'do_action(action: string, params: object)' },
          { value: 'D', text: 'execute(code: string)' },
        ],
        answer: 'B',
        explanation:
          'B 用枚举限制了 status 的取值、用 int 限制 limit 类型，错误调用在结构上就难以发生。A/C/D 都是万能接口，模型可能生成危险操作（DROP TABLE、任意代码）。',
        tags: ['poka-yoke'],
      },
      {
        id: 'ai-auto-m2-c2-e12',
        type: 'judge',
        difficulty: 4,
        question: '幂等键（idempotency_key）应该由模型生成，这样每次调用都能保证唯一。',
        answer: false,
        explanation:
          '恰恰相反。模型每次生成的值可能不同，幂等就失效了。幂等键必须由**程序**生成，如 `hash(session_id + turn_index + tool_name)`，保证"同一个逻辑操作"总是同一个键。',
        tags: ['幂等键'],
      },
      {
        id: 'ai-auto-m2-c2-e13',
        type: 'open',
        difficulty: 5,
        question:
          '你要为一个客服系统设计「订单管理」工具集，支持：查订单、改地址、取消订单、发起退款。\n\n请给出：① 完整的工具定义（含 description 与 schema）；② 每个工具的错误处理策略；③ 哪些操作需要幂等、哪些需要人工确认；④ 如何防止模型误操作（如给未支付订单退款）。',
        referenceAnswer: `**① 工具定义**

**工具 1：query_order**

    {
      "name": "query_order",
      "description": "查询订单详情（状态、金额、收货地址、物流）。用户询问订单进度、"
                     "物流位置、订单内容时使用。不用于修改订单。",
      "inputSchema": {
        "type": "object",
        "properties": {
          "order_id": {"type": "string", "description": "订单号，ORD+8位数字，如 ORD20260101"},
          "include_logistics": {"type": "boolean", "description": "是否返回物流轨迹，默认 false"}
        },
        "required": ["order_id"]
      }
    }

**工具 2：update_address**

    {
      "name": "update_address",
      "description": "修改订单收货地址。仅当订单状态为「待发货」时可用；已发货订单"
                     "必须走「联系物流改址」流程，本工具会返回错误。",
      "inputSchema": {
        "type": "object",
        "properties": {
          "order_id": {"type": "string", "description": "订单号，ORD+8位数字"},
          "province": {"type": "string", "description": "省，如 广东省"},
          "city": {"type": "string", "description": "市，如 深圳市"},
          "detail": {"type": "string", "description": "详细地址，不含省市"},
          "receiver": {"type": "string", "description": "收件人姓名"},
          "phone": {"type": "string", "description": "手机号，11 位数字"}
        },
        "required": ["order_id", "province", "city", "detail", "receiver", "phone"]
      }
    }

**工具 3：cancel_order**

    {
      "name": "cancel_order",
      "description": "取消订单。仅当状态为「待支付」或「待发货」时可用。"
                     "已支付订单取消会自动触发退款。已发货订单不可取消。",
      "inputSchema": {
        "type": "object",
        "properties": {
          "order_id": {"type": "string"},
          "reason": {"type": "string", "enum": ["不想要了", "信息填错", "重复下单", "其他"]}
        },
        "required": ["order_id", "reason"]
      }
    }

**工具 4：request_refund**

    {
      "name": "request_refund",
      "description": "发起退款申请。仅当订单状态为「已支付」或「已发货」时可用。"
                     "退款金额超过 500 元会自动转人工审核，本工具会返回 pending_review。",
      "inputSchema": {
        "type": "object",
        "properties": {
          "order_id": {"type": "string"},
          "reason": {"type": "string", "enum": ["质量问题", "七天无理由", "发错货", "其他"]},
          "amount_cents": {"type": "integer", "description": "退款金额（分）。不填则为全额"}
        },
        "required": ["order_id", "reason"]
      }
    }

**② 错误处理策略**

| 场景 | 返回 |
| --- | --- |
| 订单不存在 | \`{"error": "订单 ORDxxx 不存在，请核对订单号"}\` |
| 状态不允许 | \`{"error": "订单当前状态为「已发货」，update_address 仅支持「待发货」。已发货订单请引导用户联系物流改址。"}\` |
| 参数格式错 | \`{"error": "phone 应为 11 位数字，你传的是 '138'。"}\` |
| 金额超限 | \`{"error": "退款金额 800 元超过 500 元阈值，已转人工审核，工单号 TK123", "status": "pending_review"}\` |
| 重复退款 | \`{"ok": true, "note": "该订单已退款（幂等返回）"}\` |

**关键原则**：错误信息要包含**下一步该怎么做**，而不只是"失败了"。

**③ 幂等与人工确认**

| 操作 | 幂等 | 人工确认 |
| --- | --- | --- |
| query_order | 天然幂等（读） | 不需要 |
| update_address | 幂等（覆盖写） | 不需要，但要在回复中回显新地址让用户确认 |
| cancel_order | **需要幂等键** | 需要（不可逆） |
| request_refund | **需要幂等键** | 金额 > 500 元必须转人工 |

**幂等键生成**：

    key = f"{session_id}:{turn_index}:{tool_name}:{order_id}"

由程序生成，不由模型生成。

**④ 防止误操作的四层防护**

**第一层：schema 约束（poka-yoke）**

- reason 用枚举，模型不可能传非法值；
- amount_cents 用整数，消除元/分歧义；
- 必填项齐全，漏传会被拦截。

**第二层：业务规则校验（在工具实现里）**

    ALLOWED_STATUS = {
        "update_address": {"待发货"},
        "cancel_order": {"待支付", "待发货", "已支付"},
        "request_refund": {"已支付", "已发货"},
    }

    def guard(tool, order):
        allowed = ALLOWED_STATUS[tool]
        if order["status"] not in allowed:
            return {"error": f"订单状态「{order['status']}」不允许 {tool}。"
                             f"允许的状态：{allowed}"}
        return None

**第三层：权限与额度**

- 单个会话内退款次数上限（如 2 次）；
- 单笔金额上限，超过转人工；
- 用户身份校验（只能操作自己的订单）。

**第四层：人工检查点**

- 不可逆操作（取消、退款）在执行前要求用户二次确认；
- 大额操作直接转人工工单。

**⑤ 一个完整的防误操作流程**

    用户："帮我把订单退了"
      ↓
    模型：request_refund(order_id="ORD20260101", reason="七天无理由")
      ↓
    程序校验：
      1. schema 合法 ✓
      2. 订单存在 ✓
      3. 状态为「已发货」∈ {已支付, 已发货} ✓
      4. 该订单属于当前用户 ✓
      5. 金额 299 元 < 500 元阈值 ✓
      ↓
    执行退款（带幂等键）
      ↓
    返回 {"ok": true, "refunded_cents": 29900}
      ↓
    模型回复："已为您发起退款 299 元，预计 3-5 个工作日到账。"

**如果金额是 800 元**：
第 5 步返回 \`pending_review\`，模型回复：
"您的退款金额为 800 元，超过自动处理阈值，已为您提交人工审核（工单 TK123），
客服会在 24 小时内联系您。"

**⑥ 常见陷阱**

| 陷阱 | 后果 | 避免 |
| --- | --- | --- |
| 只靠提示词约束 | 模型可能忽略 | 必须在代码层校验 |
| 用自由文本 reason | 统计困难、可能注入 | 用枚举 |
| 不校验订单归属 | 越权操作他人订单 | 从 session 取 user_id 比对 |
| 退款无幂等 | 重复退款 | 幂等键 |
| 错误信息太简略 | 模型无法自我修复 | 给期望值、实际值、示例 |`,
        rubric: [
          { point: '四个工具定义完整（description 含何时用/不用、schema 有枚举与必填）', score: 3 },
          { point: '错误信息包含下一步指引（状态不允许时说明该怎么走）', score: 2 },
          { point: '区分幂等操作（取消/退款需幂等键）与需人工确认的操作', score: 2 },
          { point: '四层防护：schema 约束 + 业务校验 + 权限额度 + 人工检查点', score: 3 },
          { point: '指出「不能只靠提示词约束」这个关键陷阱', score: 1 },
        ],
        keywords: ['ACI', 'poka-yoke', '幂等键', '业务规则校验', '人工检查点', '越权'],
        explanation:
          '能设计出四层防护（schema → 业务 → 权限 → 人工）并指出「不能只靠提示词」，就是生产级的工具设计思维。',
        tags: ['工具设计', '综合'],
      },
    ],
  },

  /* ============================================================
   *  c3：五种工作流模式
   * ============================================================ */
  {
    id: 'ai-auto-m2-c3',
    title: '五种工作流模式：先工作流，再 Agent',
    goal: '掌握五种编排模式，学会判断「该用工作流还是 Agent」，避免过度工程。',
    lessons: [
      {
        id: 'ai-auto-m2-c3-l1',
        title: '工作流与 Agent 的分界，以及五种模式',
        difficulty: 3,
        content: `
## 一个关键区分

Anthropic 在与数十个团队合作后总结出一个重要区分：

| 类型 | 定义 | 控制流由谁决定 |
| --- | --- | --- |
| **工作流** | LLM 与工具通过**预定义代码路径**编排 | **代码** |
| **Agent** | LLM **动态决定**自己的流程与工具 | **模型** |

**为什么这个区分重要**：

    工作流：可预测、可测试、成本可控、延迟确定
    Agent：灵活，但成本不可控、路径不可预测、难测试

**Anthropic 的核心建议**：

> **先找最简单的方案**，只在确实需要时才增加复杂度。
> 很多时候根本不必要构建 agentic 系统。

**更具体地说**：对很多应用，**优化单次 LLM 调用**（加检索和上下文示例）通常就够了。

## 五种工作流模式

<WorkflowPatterns />

### ① Prompt Chaining（提示链）

把任务拆成**固定的串行步骤**，每步输出是下步输入。中间可加**程序化校验**（gate）。

    outline = llm("写一个文章大纲")
    assert check_criteria(outline)          # gate：不符合就重来
    article = llm("根据大纲写文章", outline)
    translated = llm("翻译成英文", article)

**何时用**：任务能清晰分解为**固定的**子任务。
**收益**：每次调用更简单 → 准确率更高。**代价**：延迟累加。

### ② Routing（路由）

先**分类**，再分派给专门处理链。

    category = classify(query)
    handler = {
        "refund": refund_flow,
        "tech": tech_flow,
        "general": general_flow,
    }[category]
    return handler(query)

**何时用**：输入有明显类别、各类需不同处理、分类可靠。

**关键收益**：**避免"为优化一类输入而伤害另一类"**。
不同类别的提示词可以独立调优。

**顺带的好处**：**成本优化**——简单问题路由给小模型，复杂问题给大模型。

### ③ Parallelization（并行化）

两个变体：

**Sectioning（分段）**：独立子任务并行。

    response, guard = parallel([
        lambda: llm_answer(query),
        lambda: llm_screen(query),      # 护栏单独跑
    ])

**Voting（投票）**：同一任务多次执行后聚合。

    votes = [llm(f"从{angle}角度审查代码", code) for angle in angles]
    has_bug = sum(v.flag for v in votes) >= 2

**何时用**：
- 子任务可并行 → 提速；
- 需要多视角/多次尝试提高置信度；
- 复杂多因素任务 → **每个因素单独一次调用，专注度更高**。

**Anthropic 的观察**：一个模型同时"回答"和"审查是否违规"效果差，
分成两次调用效果更好。

### ④ Orchestrator-Workers（编排者-工人）

中心 LLM **动态拆解**任务，分派给工人，再汇总。

    subtasks = orchestrator.plan(task)      # 动态决定，不预先定义
    results = parallel([worker(t) for t in subtasks])
    return orchestrator.synthesize(results)

**何时用**：复杂任务，**无法预测需要哪些子任务**。

**与 Parallelization 的关键区别**：

| | Parallelization | Orchestrator-Workers |
| --- | --- | --- |
| 子任务 | **预先定义**（如固定 3 个审查角度） | **动态决定**（按输入而定） |
| 数量 | 固定 | 不固定 |
| 例子 | 护栏 + 回答 | 多文件代码修改 |

### ⑤ Evaluator-Optimizer（评估者-优化者）

一个 LLM 生成，另一个评估反馈，循环。

    draft = llm(task)
    for _ in range(max_iter):
        feedback = evaluator(task, draft)
        if feedback.ok:
            break
        draft = llm(f"根据反馈改进：{feedback}", draft)

**何时用**（两个条件都要满足）：
1. **有清晰的评估标准**；
2. **迭代改进能带来可测量的价值**。

**Anthropic 的两个判断信号**：
- 人类给出反馈时，回答能明显改进；
- LLM 能提供这样的反馈。

## 选型决策树

    能一次 LLM 调用解决？
      ├─ 是 → 就用单次调用（+ 检索 + 示例）
      └─ 否 → 任务能固定分解？
            ├─ 是 → 用工作流（①~⑤）
            └─ 否 → 步骤数不可预测？
                  ├─ 否 → 用 Orchestrator-Workers
                  └─ 是 → 才考虑自主 Agent（+ 沙箱 + 护栏 + 停止条件）

## 一个反直觉的结论

**大多数生产场景用工作流就够了。**

Anthropic 明确说：成功的实现**不是用复杂框架**，
而是用**简单、可组合的模式**。

**为什么**：
- 工作流可测试（每个节点单独测）；
- 成本可预测（调用次数固定）；
- 延迟可预测；
- 出错时能定位到具体节点。

**Agent 的代价**：
- 调用次数不定 → 成本不可控；
- 路径不定 → 难写测试；
- 错误会累积 → 10 步每步 95% 正确，整体只有 60%。

**最后一条最重要**：**错误累积**。
10 步串行，每步 95% 成功率，整体成功率 = 0.95^10 ≈ **60%**。
这就是为什么 Agent 在长任务上容易崩。

## 什么时候真的需要 Agent

**必要条件（同时满足）**：
1. 开放式问题，**步骤数无法预测**；
2. **无法硬编码**固定路径；
3. 环境可沙箱、可回滚；
4. 有可靠的**环境反馈**（工具结果、代码执行结果）；
5. 能设置**停止条件**。

**Anthropic 的实践案例**：
- **SWE-bench 编程 Agent**：改哪些文件取决于具体 issue；
- **computer use**：操作路径完全不可预测。

这两个都是"步骤不可预测 + 反馈可验证"的典型。

## 三条设计原则（Anthropic）

1. **保持简单**：复杂度只在能证明改善效果时才增加；
2. **优先透明**：显式展示 Agent 的规划步骤，让用户能理解与干预；
3. **精心设计 ACI**：工具文档要像给初级开发者写的 API 文档。

## 本节的来源

> **来源类型：工程实践（非学术）**
> - Anthropic《Building effective agents》(2024-12)，五种工作流模式与三条原则的原始出处
>   https://www.anthropic.com/research/building-effective-agents
> - **说明**：这是厂商工程博客，非同行评审的学术来源
>
> **来源类型：学术来源**
> - StateFlow: *Enhancing LLM Task-Solving through State-Driven Workflows*，
>   arXiv:[2403.11322](https://arxiv.org/abs/2403.11322)（工作流状态机的学术化表述）
> - UC Berkeley CS294/194-196 *Large Language Model Agents*，第 3 讲「Agentic AI Frameworks」
>   https://rdi.berkeley.edu/llm-agents/f24
>
> **来源类型：原创**
> - 选型决策树、代码示例、错误累积计算、全部习题
`,
        tips: [
          {
            kind: 'interview',
            text: '「工作流与 Agent 的区别」：工作流的控制流由代码决定（可预测、可测试、成本可控），Agent 由模型决定（灵活但不可控）。先工作流，后 Agent。',
          },
          {
            kind: 'leak',
            text: 'Orchestrator-Workers 与 Parallelization 的关键区别：前者子任务由编排者动态决定，后者子任务预先定义。',
          },
          {
            kind: 'pitfall',
            text: '错误累积是 Agent 最大的隐患：10 步每步 95% 正确，整体只有约 60%。这就是为什么长任务必须拆分、加检查点。',
          },
        ],
        demos: [
          {
            title: '五种模式的骨架实现',
            lang: 'python',
            code: `from concurrent.futures import ThreadPoolExecutor

# 模拟 LLM
def llm(prompt, context=""):
    return f"[回答:{prompt[:14]}]"

def classify(text):
    if "退款" in text: return "refund"
    if "报错" in text or "bug" in text: return "tech"
    return "general"

# ① Prompt Chaining
def chaining(topic):
    outline = llm(f"写大纲:{topic}")
    if not outline:
        raise ValueError("gate 失败：大纲为空")
    article = llm(f"按大纲写:{outline}")
    return llm(f"翻译:{article}")

# ② Routing
def routing(query):
    handlers = {"refund": "退款流程", "tech": "技术支持", "general": "通用问答"}
    return llm(f"{handlers[classify(query)]}:{query}")

# ③ Parallelization
def parallel_sectioning(query):
    with ThreadPoolExecutor() as ex:
        a = ex.submit(llm, f"回答:{query}")
        g = ex.submit(llm, f"审查违规:{query}")
        return a.result(), g.result()

def parallel_voting(code, angles=("安全", "性能", "可读性")):
    with ThreadPoolExecutor() as ex:
        return [f.result() for f in [ex.submit(llm, f"从{a}角度审查:{code}") for a in angles]]

# ④ Orchestrator-Workers
def orchestrator_workers(task):
    subtasks = [f"子任务{i}:{task}" for i in range(3)]   # 动态决定
    with ThreadPoolExecutor() as ex:
        results = list(ex.map(lambda t: llm(t), subtasks))
    return llm(f"汇总:{results}")

# ⑤ Evaluator-Optimizer
def evaluator_optimizer(task, max_iter=3):
    draft = llm(task)
    for i in range(max_iter):
        fb = llm(f"评估:{draft}")
        if "OK" in fb:
            return draft, i + 1
        draft = llm(f"改进:{fb}")
    return draft, max_iter

print("① Chaining:", chaining("大模型入门")[:30])
print("② Routing(退款):", routing("我要退款")[:30])
print("② Routing(技术):", routing("程序报错")[:30])
a, g = parallel_sectioning("如何学习")
print("③ Parallel(分段): 回答+护栏 并发完成")
print("③ Parallel(投票):", len(parallel_voting("def f():pass")), "个角度")
print("④ Orchestrator:", orchestrator_workers("重构代码")[:35])
d, it = evaluator_optimizer("写介绍")
print(f"⑤ Evaluator-Optimizer: 迭代 {it} 次")`,
          },
          {
            title: '错误累积：为什么 Agent 在长任务上容易崩',
            lang: 'python',
            code: `# 每一步 95% 正确，串行 N 步后整体成功率是多少？
print("步数 | 整体成功率（每步 95%）")
print("-" * 34)
for n in [1, 3, 5, 10, 20, 50]:
    rate = 0.95 ** n
    bar = "█" * int(rate * 40)
    print(f"{n:4d} | {rate:7.2%} {bar}")

print()
print("关键结论：")
print("  10 步 -> 59.9%   （还能接受）")
print("  20 步 -> 35.8%   （已经不可靠）")
print("  50 步 -> 7.7%    （基本一定失败）")
print()

# 对比：每步 99% 正确
print("步数 | 每步99% | 每步95% | 每步90%")
print("-" * 40)
for n in [5, 10, 20]:
    print(f"{n:4d} | {0.99**n:7.2%} | {0.95**n:7.2%} | {0.90**n:7.2%}")

print()
print("三个启示：")
print("  1) 提高单步准确率收益巨大（99% vs 95%，10步差 33 个百分点）")
print("  2) 长任务必须拆分 + 加检查点（分段失败可重试）")
print("  3) 能用确定性代码的地方不要用模型（把不确定性降到最少步数）")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'ai-auto-m2-c3-e1',
        type: 'single',
        difficulty: 2,
        question: 'Anthropic 对「工作流」与「Agent」的核心区分是？',
        options: [
          { value: 'A', text: '工作流用代码实现，Agent 用提示词实现' },
          { value: 'B', text: '工作流的控制流由代码决定，Agent 由模型决定' },
          { value: 'C', text: '工作流更贵' },
          { value: 'D', text: '两者没有区别' },
        ],
        answer: 'B',
        explanation:
          '工作流通过预定义代码路径编排（可预测、可测试、成本可控），Agent 由模型动态决定流程（灵活但不可控）。这个区分决定了架构选型。',
        tags: ['工作流 vs Agent'],
      },
      {
        id: 'ai-auto-m2-c3-e2',
        type: 'judge',
        difficulty: 2,
        question: 'Anthropic 建议尽可能使用自主 Agent 架构以获得最好的任务表现。',
        answer: false,
        explanation:
          '恰恰相反。Anthropic 建议**先找最简方案**，只在确实需要时增加复杂度。对很多应用，优化单次 LLM 调用（加检索与示例）就够了。',
        tags: ['设计原则'],
      },
      {
        id: 'ai-auto-m2-c3-e3',
        type: 'multiple',
        difficulty: 3,
        question: 'Parallelization 工作流的两个变体是？（多选）',
        options: [
          { value: 'A', text: 'Sectioning：拆成独立子任务并行' },
          { value: 'B', text: 'Voting：同一任务多次执行后聚合' },
          { value: 'C', text: 'Routing：分类后分派' },
          { value: 'D', text: 'Chaining：串行拆步骤' },
        ],
        answer: ['A', 'B'],
        explanation:
          'C 和 D 是另外两种独立模式。Parallelization 专指并行执行，分 Sectioning（分段）与 Voting（投票）两个变体。',
        tags: ['Parallelization'],
      },
      {
        id: 'ai-auto-m2-c3-e4',
        type: 'fill',
        difficulty: 3,
        question:
          'Orchestrator-Workers 与 Parallelization 的关键区别是：前者的子任务由编排者 ___ 决定，后者的子任务预先定义。',
        blanks: [['动态', '动态地', '根据输入', '按需']],
        explanation:
          'Parallelization 的子任务固定（如 3 个固定审查角度）；Orchestrator-Workers 的子任务由中心 LLM 按具体输入拆解，数量与内容都不固定。',
        tags: ['Orchestrator'],
      },
      {
        id: 'ai-auto-m2-c3-e5',
        type: 'single',
        difficulty: 3,
        question: 'Evaluator-Optimizer 模式适用的两个必要条件是？',
        options: [
          { value: 'A', text: '任务简单 + 数据量大' },
          { value: 'B', text: '有清晰评估标准 + 迭代改进能带来可测量价值' },
          { value: 'C', text: '不需要人工 + 无需评估' },
          { value: 'D', text: '模型够大 + 预算充足' },
        ],
        answer: 'B',
        explanation:
          'Anthropic 的两个判断信号：人类给反馈时回答能明显改进；且 LLM 能提供这样的反馈。缺一则迭代没有意义。',
        tags: ['Evaluator-Optimizer'],
      },
      {
        id: 'ai-auto-m2-c3-e6',
        type: 'code',
        difficulty: 2,
        question:
          '实现路由分发：route(query, routes, classify_fn)。\n\n- classify_fn(query) 返回类别名\n- routes 是 dict：类别名 → 处理函数\n- 类别不存在时回退到 routes 里的 "general"\n- 返回处理函数的执行结果',
        starterCode: `def route(query, routes, classify_fn):
    category = classify_fn(query)
    handler = ___
    return handler(query)
`,
        setupCode: '',
        expectedOutput: '路由结果',
        tests: `def classify(q):
    if "退款" in q: return "refund"
    if "报错" in q: return "tech"
    return "general"

routes = {
    "refund": lambda q: f"退款:{q}",
    "tech": lambda q: f"技术:{q}",
    "general": lambda q: f"通用:{q}",
}
assert route("我要退款", routes, classify) == "退款:我要退款"
assert route("程序报错", routes, classify) == "技术:程序报错"
assert route("你好", routes, classify) == "通用:你好"
# 类别缺失时回退
routes2 = {"general": lambda q: f"兜底:{q}"}
assert route("我要退款", routes2, classify) == "兜底:我要退款"
`,
        answer: `def route(query, routes, classify_fn):
    category = classify_fn(query)
    handler = routes.get(category) or routes.get("general")
    return handler(query)
`,
        explanation:
          '关键在 `routes.get(category) or routes.get("general")`：先找精确类别，找不到回退通用。\n\n**兜底分支不可省**——分类器可能给出未预期的类别，没有兜底就会崩溃。\n\n生产环境还应记录「未命中」的查询，用于改进分类器。',
        tags: ['编程', 'Routing'],
      },
      {
        id: 'ai-auto-m2-c3-e7',
        type: 'code',
        difficulty: 3,
        question:
          '实现投票聚合：vote_aggregate(votes, threshold=0.5)。\n\n- votes 是布尔列表\n- 返回赞成比例是否 >= threshold\n- 空列表返回 False',
        starterCode: `def vote_aggregate(votes, threshold=0.5):
    if not votes:
        return False
    ratio = ___
    return ___
`,
        setupCode: '',
        expectedOutput: '投票结果',
        tests: `assert vote_aggregate([True, True, False]) == True, "2/3 通过"
assert vote_aggregate([True, False, False]) == False, "1/3 拒绝"
assert vote_aggregate([]) == False, "空投票返回 False"
assert vote_aggregate([True, True], threshold=0.9) == True, "2/2 通过 0.9"
assert vote_aggregate([True, True, False], threshold=0.9) == False, "2/3 < 0.9"
assert vote_aggregate([True], threshold=1.0) == True
`,
        answer: `def vote_aggregate(votes, threshold=0.5):
    if not votes:
        return False
    ratio = sum(1 for v in votes if v) / len(votes)
    return ratio >= threshold
`,
        explanation:
          '`ratio >= threshold`（大于等于）——恰好等于阈值应算通过。\n\n**阈值是重要的工程旋钮**：\n- 阈值高 → 误报少但漏报多（保守）；\n- 阈值低 → 漏报少但误报多（激进）。\n\n安全场景常用 0.8 以上，内容审核用 0.5~0.7。',
        tags: ['编程', 'Voting'],
      },
      {
        id: 'ai-auto-m2-c3-e8',
        type: 'code',
        difficulty: 3,
        question:
          '计算错误累积：success_rate(n_steps, step_accuracy)。\n\n返回 n 步串行后的整体成功率（保留 4 位小数）。\n\n同时实现 min_steps_for_target(target, step_accuracy)，返回能达成目标的最大步数。',
        starterCode: `import math

def success_rate(n_steps, step_accuracy):
    return round(___, 4)

def min_steps_for_target(target, step_accuracy):
    if step_accuracy <= 0 or step_accuracy >= 1:
        return 0 if target > 0 else 0
    return int(math.floor(math.log(target) / math.log(step_accuracy)))
`,
        setupCode: '',
        expectedOutput: '错误累积计算',
        tests: `import math
assert abs(success_rate(10, 0.95) - 0.5987) < 0.01, f"10步95%应约0.599，实际 {success_rate(10,0.95)}"
assert abs(success_rate(1, 0.95) - 0.95) < 1e-6
assert success_rate(0, 0.95) == 1.0, "0步成功率100%"
assert abs(success_rate(20, 0.99) - 0.8179) < 0.01, f"20步99%应约0.818"
# 目标 0.8，每步 0.95 -> log(0.8)/log(0.95) ≈ 4.35 -> 4 步
n = min_steps_for_target(0.8, 0.95)
assert n == 4, f"应为 4 步，实际 {n}"
assert success_rate(n, 0.95) >= 0.8
assert success_rate(n + 1, 0.95) < 0.8
`,
        answer: `import math

def success_rate(n_steps, step_accuracy):
    return round(step_accuracy ** n_steps, 4)

def min_steps_for_target(target, step_accuracy):
    if step_accuracy <= 0 or step_accuracy >= 1:
        return 0
    return int(math.floor(math.log(target) / math.log(step_accuracy)))
`,
        explanation:
          '`accuracy ** n` 是指数衰减——这就是错误累积的数学本质。\n\n**这个计算解释了三件事**：\n1. 为什么提高单步准确率收益巨大（99% vs 95%，10 步差 33 个百分点）；\n2. 为什么长任务要拆分（分段后可单独重试）；\n3. 为什么能用确定性代码的地方不要用模型。\n\n`min_steps_for_target` 用对数反解，是评估「这个任务能拆多少步」的实用工具。',
        tags: ['编程', '错误累积'],
      },
      {
        id: 'ai-auto-m2-c3-e9',
        type: 'judge',
        difficulty: 3,
        question:
          '一个 10 步的串行 Agent，如果每步成功率是 95%，整体成功率约为 60%。',
        answer: true,
        explanation:
          '0.95^10 ≈ 0.5987，约 60%。这是 Agent 在长任务上容易崩的根本原因。启示：提高单步准确率、拆分任务加检查点、减少不必要的模型调用。',
        tags: ['错误累积'],
      },
      {
        id: 'ai-auto-m2-c3-e10',
        type: 'open',
        difficulty: 4,
        question:
          '你要为一个电商客服设计自动化方案，覆盖：查订单、改地址、退款、投诉升级、推荐商品。\n\n请判断哪些适合用工作流、哪些需要 Agent，并画出整体的编排结构。说明你的选型理由。',
        referenceAnswer: `**一、先做需求拆解**

| 任务 | 步骤可预测？ | 需要多步决策？ | 副作用 | 建议方案 |
| --- | --- | --- | --- | --- |
| 查订单 | ✅ 1 步 | 否 | 无（只读） | **单次调用 + 工具** |
| 改地址 | ✅ 2~3 步固定 | 否 | 有（写） | **Prompt Chaining** |
| 退款 | ✅ 3~4 步固定 | 否 | 有（写，需审核） | **Prompt Chaining + 人工检查点** |
| 投诉升级 | ⚠️ 步骤不定 | 是 | 有 | **Routing + 规则** |
| 推荐商品 | ⚠️ 需多轮了解偏好 | 是 | 无 | **Agent 或 Orchestrator** |

**二、整体编排结构**

    用户输入
      ↓
    【Routing】意图分类（轻量模型，成本低）
      ├─ 查订单 → 单次调用 + query_order 工具
      ├─ 改地址 → Chaining：校验状态 → 更新 → 回显确认
      ├─ 退款   → Chaining：校验 → 判断金额 → [≤500 自动 / >500 转人工]
      ├─ 投诉   → Chaining：收集信息 → 判断等级 → [普通工单 / 升级主管]
      └─ 推荐   → Orchestrator-Workers（见下）

**三、各模块的选型理由**

**① 查订单：单次调用 + 工具**

- 步骤完全固定（调用 → 回复）；
- 用 Agent 是浪费（多轮调用、成本翻倍、延迟增加）；
- **单次调用 + 强制引用工具结果**即可。

**② 改地址：Prompt Chaining**

    步骤1: query_order 检查状态是否为「待发货」
    步骤2: gate —— 若已发货，走「联系物流」分支，终止
    步骤3: update_address
    步骤4: 回显新地址，请用户确认

- 路径固定，但有**分支 gate**（状态校验）；
- 每步可单独测试；
- 成本确定（最多 4 次调用）。

**③ 退款：Chaining + 人工检查点**

    步骤1: query_order 校验状态
    步骤2: 计算退款金额
    步骤3: gate —— 金额 ≤ 500？ 
              ├─ 是 → request_refund（带幂等键）
              └─ 否 → 创建人工工单，返回 pending_review
    步骤4: 回复用户

- **为什么不用 Agent**：退款是不可逆的写操作，
  不能让它"自主决定"要不要退、退多少。
- **必须有人工检查点**：大额转人工。

**④ 投诉升级：Routing + 规则引擎**

- 投诉的"严重程度"判断用规则 + 小模型分类；
- 升级路径固定（普通工单 / 主管工单 / 紧急响应）；
- **不需要 Agent**——升级决策应由规则决定，而非模型自由发挥。

**⑤ 推荐商品：Orchestrator-Workers**

这是唯一真正需要动态拆解的场景：

    编排者：分析用户需求
      ├─ 若用户说"想要个便宜的耳机" 
      │    → 工人A: 按价格区间检索
      │    → 工人B: 查历史偏好
      ├─ 若用户说"和上次买的搭配"
      │    → 工人A: 查上次订单
      │    → 工人B: 找搭配商品
      └─ 汇总：合并候选 → 排序 → 生成推荐理由

- **子任务数量与内容随输入变化**（取决于用户怎么描述需求）；
- 这是 Orchestrator-Workers 的典型场景；
- 但**仍然不用自主 Agent**——编排者只负责拆解，不做无限制探索。

**四、关键的工程决策**

**决策 1：用 Routing 做成本优化**

    简单查询（查订单、物流） → 小模型（便宜 10 倍）
    复杂任务（投诉、推荐）   → 大模型

实测可降低 40%~60% 成本。

**决策 2：所有写操作加幂等键**

    key = f"{session_id}:{turn}:{tool}:{order_id}"

防止重试导致重复退款。

**决策 3：设置全局护栏**

| 护栏 | 值 |
| --- | --- |
| 单会话最多调用轮次 | 8 |
| 单会话退款次数上限 | 2 |
| 单次任务 token 预算 | 50k |
| 超时 | 30s |

**决策 4：全链路可观测**

每个请求生成 trace_id，记录：
- 意图分类结果；
- 每步的输入输出；
- 工具调用与结果；
- 最终决策（自动处理 / 转人工）。

**五、为什么整体不用自主 Agent**

| 维度 | 自主 Agent | 本方案（工作流为主） |
| --- | --- | --- |
| 成本 | 不可控（步数不定） | 可控（≤4 步） |
| 延迟 | 不可控 | ≤3 秒 |
| 可测试 | 难（路径不定） | 易（每节点单独测） |
| 出错定位 | 难 | 易（看 trace 就知道哪步） |
| 错误累积 | 10 步 60% | 4 步 81% |

**结论**：客服场景的**任务边界清晰、步骤可枚举**，
用工作流是正确选择。Agent 只用在真正需要动态拆解的「推荐」模块。

**六、一个容易被忽略的点**

**工作流也要有"退出机制"**：
每个 gate 失败时都要有明确的兜底——
转人工、给出错误提示、或降级到简单回答。

**不要出现"卡在中间既没成功也没失败"的状态。**`,
        rubric: [
          { point: '五个任务逐一判断（步骤可预测性 + 副作用）', score: 3 },
          { point: '查订单用单次调用、改地址/退款用 Chaining 并说明理由', score: 2 },
          { point: '退款强调人工检查点与幂等（不可逆操作）', score: 2 },
          { point: '推荐用 Orchestrator-Workers 并说明为何子任务动态', score: 2 },
          { point: '给出成本/延迟/可测试性的对比论证，并提到兜底机制', score: 1 },
        ],
        keywords: ['Routing', 'Chaining', 'Orchestrator-Workers', '人工检查点', '幂等', '错误累积'],
        explanation:
          '能按「步骤可预测性 + 副作用」两个维度给每个任务选对模式，并指出「工作流也要有退出机制」，就是成熟的架构判断。',
        tags: ['架构选型', '综合'],
      },
    ],
  },
];
