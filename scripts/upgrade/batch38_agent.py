# -*- coding: utf-8 -*-
"""batch38: python-agent-development 扩充补丁（11 节 <2600 + 5 节 B 级补强）。
所有代码与输出均在 Python 3.11.15 实测。
"""
import json, io, re, time

P = r"D:\Python_Project\knowledge-order\content-data\courses\python-agent-development.json"
REF_RE = re.compile(r"\n#{2,4} [^\n]*(参考资料|延伸阅读|Reference)[^\n]*\n")

def merge(content, add):
    ms = list(REF_RE.finditer(content))
    if ms and ms[-1].start() > len(content) * 0.6:
        i = ms[-1].start()
        return content[:i].rstrip() + "\n\n" + add.strip() + "\n" + content[i:]
    return content.rstrip() + "\n\n" + add.strip() + "\n"

ADD = {}

ADD["agent-l2-1"] = '''
### 问题背景与直觉理解（补充）

Function Calling 的本质是一份"工具合同"：JSON Schema 声明了工具叫什么、吃什么参数、哪些必填，大模型据此生成"调用意图"（函数名 + JSON 参数），**模型本身从不执行函数**——真正执行的是你的 Python 代码，执行结果再以消息回灌给模型。直觉模型：模型像一位"只会填单子的调度员"，schema 是他手边的《业务窗口一览表》，他填好委托单（工具调用请求），由你的系统跑腿，再把回执（Observation）交还给他。理解"声明与执行分离"，就理解了整个工具生态的设计基调。

### 手算推导（逐步演算）

从 `get_weather(city: str, unit: str = "celsius")` 到 schema 的四步映射：

1. `func.__name__` → `"name": "get_weather"`（工具名即函数名， snake_case）；
2. docstring 首行 → `"description"`（模型据它决定"何时该用这个工具"，写不清 = 模型选不对）；
3. `__annotations__` → `properties`：str 映射 "string"，float 映射 "number"；
4. 遍历 `inspect.signature`：`city` 无默认值 → 进入 `required`；`unit` 有默认值 → 不必填，模型可以省略。

### 完整案例（补充）：30 行反射提取器

```python
import inspect, json

def get_weather(city: str, unit: str = "celsius") -> str:
    """查询指定城市的实时天气。

    Args:
        city: 城市名，如 "北京"
        unit: 温度单位 celsius / fahrenheit
    """
    return f"{city}: 26 度 ({unit})"

def build_schema(func) -> dict:
    sig = inspect.signature(func)
    props, required = {}, []
    type_map = {str: "string", int: "integer", float: "number", bool: "boolean"}
    param_docs = {}
    for line in (inspect.getdoc(func) or "").splitlines():
        m = line.strip().split(":", 1)
        if len(m) == 2 and m[0] in sig.parameters:
            param_docs[m[0]] = m[1].strip()
    for name, p in sig.parameters.items():
        props[name] = {"type": type_map.get(p.annotation, "string"),
                       "description": param_docs.get(name, name)}
        if p.default is inspect.Parameter.empty:
            required.append(name)
    return {"type": "function", "function": {
        "name": func.__name__,
        "description": (inspect.getdoc(func) or "").splitlines()[0],
        "parameters": {"type": "object", "properties": props, "required": required}}}

print(json.dumps(build_schema(get_weather), ensure_ascii=False, indent=1))
```

预期输出（实测，Python 3.11.15）：

```
{
 "type": "function",
 "function": {
  "name": "get_weather",
  "description": "查询指定城市的实时天气。",
  "parameters": {
   "type": "object",
   "properties": {
    "city": {
     "type": "string",
     "description": "城市名，如 \\"北京\\""
    },
    "unit": {
     "type": "string",
     "description": "温度单位 celsius / fahrenheit"
    }
   },
   "required": [
    "city"
   ]
  }
 }
}
```

这正是 LangChain `@tool` 装饰器内部的工作原理——手写一遍，框架就不再神秘。

### 反射提取管线图解（文字示意图）

```
def get_weather(...)  ──inspect──▶  name / docstring / annotations / defaults
        │                                    │
        ▼                                    ▼
工具注册表（name → 原函数）        JSON Schema（发给模型的"合同"）
        ▲                                    │
        │ 执行真正函数                        ▼
   Observation ◀── 你的代码解析 ── 模型输出 tool_call{name, arguments}
```

### 参考资料（补充）

- **OpenAI 官方文档：Function Calling**
  - 链接：https://platform.openai.com/docs/guides/function-calling
- **JSON Schema 官方入门**
  - 链接：https://json-schema.org/learn/getting-started-step-by-step

### 知识关联

- 承接 l1-2：ReAct 的 Action 环节在原生 Function Calling 中被协议化为结构化 tool_call；
- 呼应 l2-2：工具一多，"合同"本身也成了上下文负担，引出动态工具检索；
- llma-l2-1 的 Structured Outputs 与本节共享同一套 JSON Schema 契约思想。

### 本节总结（要点回顾）

1. Schema = name + description + parameters（type/description/required），模型只"看合同"不碰实现；
2. 反射提取四源：`__name__`、`__doc__`、`__annotations__`、`signature().parameters`；
3. docstring 质量即工具命中率——给模型看的文档，值得像写产品文案一样打磨。
'''

ADD["agent-l2-2"] = '''
### 问题背景与直觉理解（补充）

工具从 5 个涨到 500 个时，把全部 schema 塞进上下文既贵又降低选择准确率（干扰项越多，模型越容易选错）。动态工具检索的直觉是"医院分诊台"：先根据用户意图召回最相关的 5-10 个工具（关键词、Embedding 相似度均可），只把这些"候选科室"交给模型——上下文省了，选择准确率反而升了。而安全沙箱的直觉是"把不可信代码关进保险箱"：模型生成的代码可能被提示词注入劫持，绝不允许直接在宿主机 `exec`。

### 手算推导（逐步演算）

权限门禁的真值表推演：

| 工具 | 用户角色 | 判定链 | 结果 |
| --- | --- | --- | --- |
| query_sales (read) | analyst | 已注册 → 权限 read 无需 admin | ALLOW |
| delete_rows (admin) | analyst | 已注册 → 但角色非 admin | REJECT |
| drop_all | admin | 未注册（白名单外） | REJECT |

判定顺序是关键：**先查注册表（白名单），再查权限分级**——未知工具永远拒绝，哪怕角色是 admin。沙箱扫描同理：静态正则 `os\\.system|subprocess|shutil\\.rmtree` 先拦明显恶意代码，真正的隔离交给容器（网络禁用、内存/超时限额、只读挂载）。

### 完整案例（补充）：分诊路由与沙箱扫描

```python
import re

TOOLS = {"query_sales": {"perm": "read"}, "delete_rows": {"perm": "admin"}}

def route(tool: str, user_role: str):
    info = TOOLS.get(tool)
    if info is None:
        return f"REJECT: 未知工具 {tool}"
    if info["perm"] == "admin" and user_role != "admin":
        return f"REJECT: {tool} 需要 admin 权限（当前 {user_role}）"
    return f"ALLOW: 执行 {tool}（{info['perm']}）"

for tool, role in [("query_sales", "analyst"), ("delete_rows", "analyst"), ("drop_all", "admin")]:
    print(route(tool, role))

BANNED = re.compile(r"os\\.system|subprocess|shutil\\.rmtree")
snippet = "import os; os.system('rm -rf /')"
print("沙箱扫描:", "拦截" if BANNED.search(snippet) else "放行")
```

预期输出（实测）：

```
ALLOW: 执行 query_sales（read）
REJECT: delete_rows 需要 admin 权限（当前 analyst）
REJECT: 未知工具 drop_all
沙箱扫描: 拦截
```

### 工具分诊流程图解（文字示意图）

```
用户意图 ──▶ 检索器（关键词/Embedding）──▶ Top-K 候选工具 schema
                                                │
                                                ▼
                                    模型选择工具 + 生成参数
                                                │
                              ┌── 未注册/越权？──▶ REJECT
                              ▼
                        权限门禁（白名单 + 角色分级）
                              │ 通过
                              ▼
              高危操作？──是──▶ 容器沙箱（无网络/限内存/限时）
                              │否
                              ▼
                        直接执行 ──▶ Observation 回灌
```

### 参考资料（补充）

- **OWASP Top 10 for LLM Applications**——Excessive Agency 等风险清单
  - 链接：https://genai.owasp.org/llm-top-10/
- **OpenAI 官方文档：安全最佳实践**
  - 链接：https://platform.openai.com/docs/guides/safety-best-practices

### 知识关联

- 承接 l2-1：schema 是"合同"，本节是"合同的审查科"——先查身份再盖章；
- 呼应 l7-1：HITL 审批流是权限门禁的"人工兜底"层；
- l8-2 的 Golden Task 高危拦截路径，测的正是本节 route() 这道闸。

### 本节总结（要点回顾）

1. 工具超过二三十个就该上"检索路由"：按意图召回 Top-K，别把全量 schema 塞给模型；
2. 安全三道闸次序固定：白名单 → 权限分级 → 沙箱隔离，未知即拒绝；
3. `exec`/`eval` 永不接触宿主进程，动态代码只跑在容器里。
'''

ADD["agent-l3-2"] = '''
### 问题背景与直觉理解（补充）

没有检查点的 Agent 就像不能存档的游戏：跑挂了从头再来，改一步全盘重算。Checkpointer 的直觉模型是"每走一步拍一张全景快照"——把当前全部状态（消息、变量、待办）深拷贝入库。代价可控：快照之间只有增量差异，但换来的能力是质变的——**时间旅行**（回到任意一步）、**原地分叉**（从旧快照改个参数重跑）、**断点续跑**（进程崩溃后从最近快照恢复）。生产系统的"人工审批中断"，底层正是检查点：暂停 = 落库，恢复 = 从库中读回。

### 手算推导（逐步演算）

1. 快照语义推演：`copy.deepcopy(state)` 与 `state` 引用的区别——若只存引用，后续 `state["results"].append(...)` 会"追溯性污染"所有历史快照，时间旅行读到的是被改过的假历史；深拷贝保证每步快照冻结在拍照瞬间；
2. 存储成本推演：3 次提交，历史步数 = 3；第 1 步快照只含 `['SQL 查询完成']`，第 2 步才有"误删了字段"——回放第 1 步时错误尚未发生，这正是"回到过去纠错"的价值；
3. 分叉语义：`snap1 = cp.get(1)` 取出后追加"纠正后重跑"，主历史仍是 3 步不变，分叉线独立生长——git 分支的 Agent 版。

### 完整案例（补充）：手写迷你 Checkpointer

```python
import copy

class Checkpointer:
    def __init__(self):
        self.history = []          # 每步深拷贝快照
    def commit(self, state):
        self.history.append(copy.deepcopy(state))
        return len(self.history) - 1
    def get(self, step):
        return copy.deepcopy(self.history[step])

cp = Checkpointer()
s = {"goal": "分析销量下滑", "step": 0, "results": []}
cp.commit(s)
s["results"].append("SQL 查询完成"); s["step"] = 1; cp.commit(s)
s["results"].append("误删了字段"); s["step"] = 2; cp.commit(s)

snap1 = cp.get(1)                  # 时间旅行：回到第 1 步
snap1["results"].append("纠正后重跑")
print("历史步数:", len(cp.history))
print("第 1 步快照:", cp.get(1))
print("分叉后状态:", snap1["results"])
```

预期输出（实测）：

```
历史步数: 3
第 1 步快照: {'goal': '分析销量下滑', 'step': 1, 'results': ['SQL 查询完成']}
分叉后状态: ['SQL 查询完成', '纠正后重跑']
```

生产版只差三件事：把 `history` 换成持久化后端（SQLite/Postgres/Redis）、按 `thread_id` 分线程隔离、给快照加版本号——LangGraph 的 `SqliteSaver` 就是这么一层薄封装。

### 时间旅行与分叉图解（文字示意图）

```
主时间线： step0 ──▶ step1 ──▶ step2(误删字段) ──▶ ...
                        │
                        └─ get(1) 回到过去 ─▶ 编辑快照 ─▶ 分叉新线
                                                        │
                                            step1' ──▶ step2'(纠正后重跑)
快照库（按 thread_id + step 索引）：每条记录 = 冻结的全量状态
```

### 参考资料（补充）

- **LangGraph 官方文档：Persistence & Checkpointing**
  - 链接：https://langchain-ai.github.io/langgraph/concepts/persistence/
- **LangGraph 官方教程：Time Travel**
  - 链接：https://langchain-ai.github.io/langgraph/tutorials/time-travel/

### 知识关联

- 承接 l3-1：状态机的"环"使得状态会被反复改写，检查点是环上每圈的"过磅记录"；
- 呼应 l7-1：HITL 中断的暂停/恢复完全构建在 checkpointer 之上；
- l8-2 的自愈回归：复现脏数据场景 = 先"时间旅行"到出错步，再注入异常重跑。

### 本节总结（要点回顾）

1. 快照必须深拷贝：存引用会让历史被"追溯性篡改"，时间旅行失效；
2. 三大能力同源于一张快照表：回放、分叉、断点续跑；
3. thread_id 是多会话隔离的主键，生产检查点 = 持久化后端 + 版本化快照。
'''

ADD["agent-l4-1"] = '''
### 问题背景与直觉理解（补充）

Scratchpad（草稿纸）是 Agent 的"工作记忆"：用户目标、每轮的 Thought/Action/Observation 全部摊在桌面上，模型每轮决策时都要"看一眼草稿纸"。但它有一个硬约束——上下文窗口预算：工具一次返回 5000 行 JSON，草稿纸瞬间写满，后续推理直接失焦。直觉模型：这是一张**只有 60 个格子的便利贴**，每轮都要回答"哪些值得留在便利贴上"。工业解法是"最新优先的滑动窗口 + 观察预截断"——大结果先进临时缓存，便利贴上只写一行摘要。

### 手算推导（逐步演算）

滑动窗口预算推演（budget=60 字符，从最新往回装）：

1. 从队尾出发："Obs: 短结果"（8 字）→ 装入，已用 8/60；
2. 上一条 "Thought: 发现周一下降"（13 字）→ 装入，已用 21/60；
3. 上一条 "Obs: xxxx...（40 字）" → 21+40=61 > 60 → **停止**（大观察被预算挤出去）；
4. 最终保留 2/4 条——注意方向：**保的是最新**，丢的是最旧。这正是"工作记忆"的语义：与当前决策最相关的信息永远在场。

### 完整案例（补充）：预算约束下的草稿纸裁剪

```python
def trim_scratchpad(events, char_budget=60):
    kept, used = [], 0
    for e in reversed(events):          # 从最新往回保留（保住最新观察）
        if used + len(e) > char_budget:
            break
        kept.insert(0, e)
        used += len(e)
    return kept

events = ["Thought: 先查日销量", "Obs: " + "x" * 40,
          "Thought: 发现周一下降", "Obs: 短结果"]
kept = trim_scratchpad(events)
print("保留", len(kept), "条 / 共", len(events), "条")
for e in kept:
    print(" -", e if len(e) <= 30 else e[:27] + "...")
```

预期输出（实测）：

```
保留 2 条 / 共 4 条
 - Thought: 发现周一下降
 - Obs: 短结果
```

生产版升级两处：一是按 **token** 而非字符计费（tiktoken 计数）；二是被挤出的观察不是丢弃而是降级为"摘要占位符"（`Obs: [5000 行数据已存 cache_07, 摘要: 周一销量 -12%]`），需要时工具可回查。

### 工作记忆分层图解（文字示意图）

```
本轮 Prompt 组装（预算 = 上下文窗口）
 ┌────────────────────────────────────────────┐
 │ 系统提示 + 用户目标（固定，不可挤占）          │
 │ 近期 Thought/Action（滑动窗口，最新优先）      │
 │ 最新 Observation（预截断后的一行摘要）         │
 └────────────────────────────────────────────┘
        │ 溢出部分
        ▼
 临时缓存（全量大 JSON，按 key 可回查）
        │ 会话结束
        ▼
 长期记忆（经 l4-2 三维打分筛选后入库）
```

### 知识关联

- 承接 l1-2：ReAct 循环每轮都要重组 Prompt，本节定义"重组时留下什么"；
- 呼应 l4-2：工作记忆装不下的信息经打分沉淀为长期记忆，两种记忆是上下游；
- llma-l6-2 的 Token Buffer / 滚动摘要记忆是同一预算问题在对话场景的翻版。

### 本节总结（要点回顾）

1. Scratchpad = 目标 + 历史轨迹 + 最新观察，预算永远向"最新"倾斜；
2. 大观察必须预截断：全量入缓存、摘要进记忆，超长原文是上下文杀手；
3. 裁剪算法一行心法：`reversed` 遍历 + 预算累加，命中上限即停。
'''

ADD["agent-l4-2"] = '''
### 问题背景与直觉理解（补充）

长期记忆的难点不是"存"而是"取"：一万条记忆里该唤醒哪 5 条？Generative Agents（Stanford, 2023）给出经典答案——三维打分：**新近度**（Recency，越近越响）、**重要性**（Importance，产生时由轻量模型评 1-10 分并固化）、**相关性**（Relevance，与当前查询的 Embedding 余弦相似度）。直觉模型：图书管理员找书，同时看"这本书多久没被借（新近）""是不是镇店之宝（重要）""和你要找的主题多契合（相关）"，三项加权取最高分的一摞递给你。

### 手算推导（逐步演算）

打分公式 `score = α·exp(-h/24) + β·imp/10 + γ·rel`（取 α=β=γ=1）逐条手算：

1. "用户喜欢简洁报告"（2 小时前，重要性 3，相关 0.85）：exp(-2/24)=0.920，imp=0.3 → 0.920+0.300+0.850 = **2.070**；
2. "用户改过密码"（168 小时前，重要性 9，相关 0.30）：exp(-168/24)=exp(-7)≈0.001，imp=0.9 → 0.001+0.900+0.300 = **1.201**；
3. "今天天气不错"（1 小时前，重要性 1，相关 0.10）：exp(-1/24)≈0.959 → 0.959+0.100+0.100 = **1.159**；
4. 排序：2.070 > 1.201 > 1.159——"重要但久远"的高分记忆（改密码）压过了"无关但新鲜"的天气闲聊，这正是三维联合的价值：任何单一维度都会选错。

### 完整案例（补充）：三维打分排序器

```python
import math

def score(recency_hours, importance, relevance, a=1.0, b=1.0, g=1.0):
    rec = math.exp(-recency_hours / 24)   # 新近度：指数衰减
    imp = importance / 10.0               # 重要性：归一化 0-1
    return round(a * rec + b * imp + g * relevance, 3)

memories = [
    ("用户改过密码",     168, 9.0, 0.30),  # 一周前 / 极重要
    ("用户喜欢简洁报告",   2, 3.0, 0.85),  # 刚刚 / 高相关
    ("今天天气不错",       1, 1.0, 0.10),  # 刚刚 / 无关紧要
]
for name, *dims in sorted(memories, key=lambda m: -score(*m[1:])):
    print(f"{name} -> {score(*dims)}")
```

预期输出（实测）：

```
用户喜欢简洁报告 -> 2.07
用户改过密码 -> 1.201
今天天气不错 -> 1.159
```

工程要点：重要性在**写入时评一次并固化**（省算力）；相关性在**查询时现算**（必须新鲜）；新近度纯函数可随时重算。检索 Top-K 后通常还要做去重与时间窗过滤，防止同一次会话的 10 条重复记录霸榜。

### 记忆检索管线图解（文字示意图）

```
新事件写入 ──▶ 轻量模型评重要性(1-10) ──固化──▶ 记忆库（向量+元数据）
                                                      │
用户 Query ──▶ Embedding ──▶ 余弦相似度(相关性)          │
                                                      ▼
                              score = 新近度 + 重要性 + 相关性
                                                      │
                                              Top-K + 去重 + 时间窗过滤
                                                      ▼
                                        注入 Prompt 的工作记忆区
```

### 参考资料（补充）

- **Generative Agents: Interactive Simulacra of Human Behavior**（Park et al., 2023）——三维记忆打分的原始论文
  - 链接：https://arxiv.org/abs/2304.03442

### 知识关联

- 承接 l4-1：工作记忆装不下的历史，经本节打分筛选后沉淀为长期记忆；
- 呼应 llma-l4-2：余弦相似度与 Embedding 的数学基础在 RAG 章节完全同构；
- l6-2 的 CrewAI backstory 也是长期记忆的一种"静态注入"形态。

### 本节总结（要点回顾）

1. 三维打分 = 新近度（指数衰减）+ 重要性（写入时固化）+ 相关性（查询时现算）；
2. 任何单一维度都会误召回：新鲜但无关、重要但久远，都需要另外两维制衡；
3. 工业管线四步：打分 → Top-K → 去重 → 注入；权重 α/β/γ 是可调的超参数。
'''

ADD["agent-l5-2"] = '''
### 问题背景与直觉理解（补充）

Plan-and-Execute 的直觉是"先画地图再上路"：Planner 把目标拆成步骤清单，Executor 逐条执行。但现实充满意外——文件改名、接口超时、数据格式突变。死板的计划遇到意外就崩溃，Replanner 的角色像导航 App：前方拥堵（FileNotFoundError）不代表取消行程，而是**就地重算这一段路线**（改走 sales.xlsx），下游步骤原封不动。规划与重规划的分工：Planner 管"从目标到步骤的静态分解"，Replanner 管"从反馈到修正的动态闭环"。

### 手算推导（逐步演算）

重规划触发判定链推演：

1. 反馈文本 = `"FileNotFoundError: sales.csv 不存在，检测到 sales.xlsx"`；
2. 规则 1：包含 `FileNotFoundError`？是 → 进入文件类修正分支；
3. 规则 2：反馈中存在替代资源 `sales.xlsx`？是 → 将步骤 1 重写为"用 read_excel 读取 sales.xlsx"；
4. 其余步骤（按月聚合、输出报告）**原样保留**——重规划的最小干预原则：只改受影响步骤，绝不推倒重来；
5. 反例推演：反馈为"一切正常"时两个规则都不命中 → 返回原计划，一次字节都没改。

### 完整案例（补充）：最小干预重规划器

```python
PLAN = ["读取 sales.csv", "按月聚合", "输出报告"]

def replan(plan, feedback):
    if "FileNotFoundError" in feedback and "sales.xlsx" in feedback:
        return ["用 read_excel 读取 sales.xlsx" if p == plan[0] else p for p in plan]
    return plan

fb = "FileNotFoundError: sales.csv 不存在，检测到 sales.xlsx"
print("原计划:", PLAN)
print("重规划:", replan(PLAN, fb))
print("无异常时保持原计划:", replan(PLAN, "一切正常"))
```

预期输出（实测）：

```
原计划: ['读取 sales.csv', '按月聚合', '输出报告']
重规划: ['用 read_excel 读取 sales.xlsx', '按月聚合', '输出报告']
无异常时保持原计划: ['读取 sales.csv', '按月聚合', '输出报告']
```

生产版 Replanner 由 LLM 充当：把"原计划 + 失败反馈 + 可用工具清单"三样喂给模型，要求输出**同构的新计划 JSON**（步骤数可增减），再用 JSON Schema 校验防止"自由发挥"。

### 计划-执行-反馈闭环图解（文字示意图）

```
目标 ──▶ Planner ──▶ [Step1, Step2, Step3]
                        │
                        ▼
                   Executor 执行 Step1
                        │
              ┌── 成功 ─┴─ 失败 ──┐
              ▼                   ▼
         执行 Step2          反馈 + 上下文 ──▶ Replanner
              │                   │
              │                   ▼
              │            修正后的计划（最小改动）
              │                   │
              └───────▶───────────┘
                        │
                        ▼
                     交付结果
```

### 知识关联

- 承接 l5-1：Reflexion 是"事后"反思（任务失败后总结教训），Replanning 是"事中"修正（执行受阻时改道），二者互补；
- 呼应 l3-1/l3-2：重规划在图上的实现就是条件边改写路由 + 新快照提交；
- l8-2 的脏数据自愈路径，验收的正是本节 replan 是否真的改写计划而非崩溃。

### 本节总结（要点回顾）

1. Planner 拆解、Executor 执行、Replanner 依据反馈就地修正——三角色各司其职；
2. 重规划铁律是最小干预：只改受影响步骤，保留其余全部；
3. LLM 版 Replanner 必须 Schema 校验输出，防止模型在计划外"自由发挥"。
'''

ADD["agent-l6-1"] = '''
### 问题背景与直觉理解（补充）

单 Agent 的瓶颈是"一个脑子装不下整个业务"：上下文被 50 个工具的 schema 挤爆，提示词里混杂抓取、清洗、建模、写作四种人格，模型注意力涣散。多智能体系统（MAS）的直觉是"医院分科"：全科医生看不了的病，分诊到专科——每个 Agent 只带 3-5 个工具、一种人格、一段聚焦的系统提示，**上下文窄而深**，准确率反而上升。三大拓扑结构对应三种协作形态：主管分派（Supervisor）、流水线接力（Sequential）、圆桌辩论（Debate）。

### 手算推导（逐步演算）

主管拆解推演（任务："爬取并清洗数据后写报告"）：

1. 关键词命中："爬取" → crawler 专员、"清洗" → cleaner 专员、"报告" → writer 专员；
2. 拆解产物 = [(crawler, 抓取网页数据), (cleaner, 去重/补缺失), (writer, 生成简报)]，三个子任务按依赖顺序排队；
3. 资格检查：专员名 ∈ agents 集合才分派——主管**永不亲自执行**子任务（防止主管变成全能单点）；
4. 汇总：三个产出回到主管处合并交付。若任一专员缺席，立即报错终止而非"主管下场补位"——职责边界的刚性是 MAS 不退化为单 Agent 的关键。

### 完整案例（补充）：最小 Supervisor 调度器

```python
def supervisor(task, agents):
    plan = []
    if "爬取" in task: plan.append(("crawler", "抓取网页数据"))
    if "清洗" in task: plan.append(("cleaner", "去重/补缺失"))
    if "报告" in task: plan.append(("writer", "生成简报"))
    for name, action in plan:
        if name not in agents:
            return f"缺专员 {name}，主管不可亲自下场补位"
        print(f"[{name}] 收到子任务: {action}")
    return "主管汇总各专员产出，统一交付"

print(supervisor("爬取并清洗数据后写报告", {"crawler", "cleaner", "writer"}))
```

预期输出（实测）：

```
[crawler] 收到子任务: 抓取网页数据
[cleaner] 收到子任务: 去重/补缺失
[writer] 收到子任务: 生成简报
主管汇总各专员产出，统一交付
```

生产版的三处升级：子任务由 LLM 动态拆解而非关键词匹配；专员间通过**结构化消息**（Pydantic 模型）交接而非自由文本；主管对每个子任务做完成度校验，不合格打回重做。

### Supervisor 拓扑图解（文字示意图）

```
                     ┌────────────┐
        目标 ──────▶ │ Supervisor  │ ◀──── 汇总/裁定
                     └─────┬──────┘
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
     ┌─────────┐     ┌─────────┐     ┌─────────┐
     │ crawler │     │ cleaner │     │ writer  │   专员：窄上下文
     │ 3 工具   │     │ 4 工具   │     │ 2 工具   │   单一人格
     └────┬────┘     └────┬────┘     └────┬────┘
          └────产出按结构化消息回流主管──────┘
```

### 参考资料（补充）

- **LangGraph 官方文档：Multi-agent Systems / Supervisor**
  - 链接：https://langchain-ai.github.io/langgraph/concepts/multi_agent/
- **AutoGen 论文：Enabling Next-Gen LLM Applications via Multi-Agent Conversation**
  - 链接：https://arxiv.org/abs/2308.08155

### 知识关联

- 承接 l1-1：自主权分级模型里 Level 4 的"目标级自主"，在 MAS 中由主管承担；
- 呼应 l6-2：CrewAI 是 Supervisor 思想的框架化落地，角色卡即窄上下文的载体；
- l7-2 的链路追踪在 MAS 中按"span 嵌套"记录主管-专员调用树。

### 本节总结（要点回顾）

1. MAS 的第一收益是上下文管理：专家 Agent 窄而深，胜过全能 Agent 宽而浅；
2. Supervisor 模式三要素：动态拆解、资格检查、结构化回流，主管不下场；
3. 拓扑选型：流程固定用流水线、职责分层用主管、结论需对抗用辩论。
'''

ADD["agent-l6-2"] = '''
### 问题背景与直觉理解（补充）

CrewAI 把 MAS 抽象成"剧组"：Agent 是演员（role + goal + backstory 三件套角色卡），Task 是场次（description + expected_output 交付契约），Crew 是剧组（流程 + 顺序）。backstory 之所以重要，是因为它同时影响**风格与边界**——"你是 20 年经验的合规审计师，只依据条文说话"比"你是助手"产出的报告严谨得多。多智能体治理的核心是防"踢皮球死循环"：两个 Agent 互相委派同一任务，上下文配额瞬间烧光——解法是给委派装"深度计数器"。

### 手算推导（逐步演算）

委派深度上限（max_delegation=2）推演：

1. `delegate("写周报", 0)`：深度 0 < 2 → 转交，深度+1；
2. 再次进入：深度 1 < 2 → 再转交，深度+1；第三次进入：深度 2 ≥ 2 → **强制亲自执行**；
3. 对照组 `max_depth=1`：深度 1 ≥ 1 → 立即亲自执行，只转交一次；
4. 递归深度就是"踢皮球"次数的上界——把"无限委派"这个开放风险，压缩为常数级的确定性上界。

### 完整案例（补充）：委派深度熔断器

```python
def delegate(task, depth, max_depth=2):
    if depth >= max_depth:
        return f"亲自执行: {task}（委派深度已达上限 {max_depth}）"
    return delegate(f"{task}（转交）", depth + 1, max_depth)

print(delegate("写周报", 0))
print(delegate("写周报", 1, max_depth=1))
```

预期输出（实测）：

```
亲自执行: 写周报（转交）（转交）（委派深度已达上限 2）
亲自执行: 写周报（委派深度已达上限 1）
```

第二道治理工事是**交付契约**：`expected_output="包含 3 点结论的 Markdown 列表"` 让下游 Agent 在"接收"之前先验格式，不合规直接打回，杜绝"半成品漂移"。

### CrewAI 角色卡结构图解（文字示意图）

```
Agent（演员）
 ├─ role:       "资深数据分析师"
 ├─ goal:       "用三个指标说清销量变化"
 ├─ backstory:  "10 年零售行业经验，只信数据不信感觉"
 └─ tools:      [sql_query, chart]        ← 窄上下文：工具按角色裁剪
Task（场次）
 ├─ description: "分析上月复购率变化"
 ├─ expected_output: "3 点结论的 Markdown 列表"   ← 交付契约
 └─ agent: → 绑定执行者
Crew（剧组）= agents + tasks + process(sequential/hierarchical)
治理：委派深度计数器 + 契约校验，双保险防死循环
```

### 参考资料（补充）

- **CrewAI 官方文档：Agents 与 Crews 核心概念**
  - 链接：https://docs.crewai.com/concepts/agents
- **CrewAI 官方文档：Processes（顺序与层级流程）**
  - 链接：https://docs.crewai.com/concepts/processes

### 知识关联

- 承接 l6-1：Supervisor 拓扑的角色分派思想，在 CrewAI 中固化为 role/goal/backstory 配置；
- 呼应 l1-2：死循环熔断（重复动作指纹）与本节委派深度熔断是同一治理思想的两处落点；
- l8-2 的 Golden Task 回归应当包含"相互委派"压力用例，验证深度上限真实生效。

### 本节总结（要点回顾）

1. 角色卡三件套中 backstory 决定输出风格与知识边界，是性价比最高的提示词投资；
2. 委派深度计数器把"无限踢皮球"变成常数上界的递归，超限强制亲自执行；
3. expected_output 交付契约让"不合格产出"在源头被打回，而不是漂移到下游。
'''

ADD["agent-l7-2"] = '''
### 问题背景与直觉理解（补充）

多步 Agent 的调优盲区在于"中间过程不可见"：最终答案错了，究竟是计划烂、工具选错、还是参数填歪？可观测性（Observability）的直觉是"飞机黑匣子"：每个决策点都留下一条带时间戳的 span（计划、工具调用、反思），事后沿 span 树回放，瓶颈与事故点一目了然。而评估基准回答另一个问题："改了一版提示词，到底是变好还是变坏？"传统问答指标（BLEU/准确率）对多步任务失效，SWE-bench 用"能不能真把 bug 修好、测试全绿"作为唯一判据。

### 手算推导（逐步演算）

1. span 记录推演：`timed_span("tool:sql", fn)` 用 `perf_counter()` 差值记耗时，即使函数 0.0 ms 完成，span 仍记录了**调用顺序与返回值**——回放时还原完整决策链；
2. pass@1 计算：5 个任务各跑 1 次，结果 [1,0,1,1,0]，通过率 = 3/5 = 0.6——单次尝试通过比例，反映"稳定性"而非"上限"；
3. 指标对照：pass@k（每任务给 k 次机会）考察"多次尝试能解出"的能力，pass@1 才反映生产真实体验——线上没有"再试一次"的宽容。

### 完整案例（补充）：span 链路追踪与 pass@1 统计

```python
import time

def timed_span(name, fn):
    t0 = time.perf_counter()
    out = fn()
    return {"span": name, "ms": round((time.perf_counter() - t0) * 1000, 1), "out": out}

trace = [timed_span("plan", lambda: "3 步计划"),
         timed_span("tool:sql", lambda: "42 行"),
         timed_span("reflect", lambda: "通过")]
for s in trace:
    print(f"{s['span']:<9} {s['ms']:>5} ms -> {s['out']}")

def pass_at_1(attempts):
    return round(sum(attempts) / len(attempts), 2)

runs = [1, 0, 1, 1, 0]
print("pass@1 =", pass_at_1(runs), "（5 个任务一次通过率）")
```

预期输出（实测）：

```
plan        0.0 ms -> 3 步计划
tool:sql    0.0 ms -> 42 行
reflect     0.0 ms -> 通过
pass@1 = 0.6 （5 个任务一次通过率）
```

### 可观测性 span 树图解（文字示意图）

```
run:agent (总 span, 4.2s)
 ├─ span:plan (0.3s)          "拆解为 3 步"
 ├─ span:tool:sql (2.1s)      tool=sql_query rows=42
 │    └─ span:reflect (0.2s)  "字段缺失已修复"
 ├─ span:tool:chart (1.4s)    tool=make_chart
 └─ span:final_answer (0.2s)
问题定位：哪个 span 耗时最长 / 报错 / 被重试 → 那就是优化点
```

### 参考资料（补充）

- **SWE-bench 官方网站与排行榜**
  - 链接：https://www.swebench.com/
- **SWE-bench 论文（Jimenez et al., ICLR 2024）**
  - 链接：https://arxiv.org/abs/2310.06770
- **OpenTelemetry 官方文档**——分布式追踪 span 模型
  - 链接：https://opentelemetry.io/docs/concepts/observability-primer/

### 知识关联

- 承接 l1-2：ReAct 循环的每轮 Thought/Action/Observation，正是 span 树的三个天然节点；
- 呼应 l3-2：span 记录与检查点快照是"时间旅行回放"的两大数据源；
- l8-2 的 Golden Task 回归就是"可评估"的落地形式——pass@1 达标才准发布。

### 本节总结（要点回顾）

1. 每个 Agent 决策点都应产出结构化 span：名称、耗时、输入摘要、输出摘要；
2. 多步任务的评估用任务级指标（pass@1/pass@k），答案相似度指标不适用；
3. SWE-bench 的"测试全绿才得分"是 Agent 评测的金标准范式：结果客观、不可作弊。
'''

ADD["agent-l8-1"] = '''
### 问题背景与直觉理解（补充）

把前面所有积木拼成一台"全自主数据分析师"：接收"分析上月销量下滑原因"的宏观目标后，Planner 拆解 → Executor 调 SQL 工具取数 → MetricCalculator 严格算指标 → ReflectiveReviewer 审逻辑漏洞 → ExecutiveReporter 产出业务简报。直觉模型：这是一支"无缝衔接的实习生小队"——有人跑数、有人验算、有人写报告，而反思审阅器（Reviewer）是那道"验算关"：复购率算出来 130%？分母为 0？负数复购？一律打回重算。

### 手算推导（逐步演算）

复购率公式 `复购率 = 多次购买人数 / 总购买人数` 逐项推演：

1. 输入 {"u1": 3, "u2": 1, "u3": 2, "u4": 1}：总购买人数 = 4；
2. 多次购买（订单数 ≥ 2）人数：u1(3) ✓、u3(2) ✓ → 2 人；
3. 复购率 = 2/4 = **0.5**；
4. 反思器校验链：0 ≤ 0.5 ≤ 1 ✓、分母 4 ≠ 0 ✓、无负数 ✓ → "校验通过"。空数据 {} 走另一分支：分母为 0 → 返回 (None, 错误说明) 而非抛异常——错误信息作为 Observation 回灌，Agent 据此换数据源重查。

### 完整案例（补充）：带反思校验的指标计算器

```python
def repurchase_rate(orders_by_user):
    buyers = len(orders_by_user)
    if buyers == 0:
        return None, "分母为 0，拒绝计算并回查数据源"
    multi = sum(1 for v in orders_by_user.values() if v >= 2)
    return round(multi / buyers, 3), None

data = {"u1": 3, "u2": 1, "u3": 2, "u4": 1}
rate, err = repurchase_rate(data)
print("复购率 =", rate, "| 反思器:", err or "校验通过")
print("空数据:", repurchase_rate({}))
```

预期输出（实测）：

```
复购率 = 0.5 | 反思器: 校验通过
空数据: (None, '分母为 0，拒绝计算并回查数据源')
```

`return None, err` 的 (结果， 错误) 双返回值模式是工具层与反思器之间的标准协议：任何异常都在工具层被"翻译"为文本说明，绝不让 Python 进程崩溃（呼应 l1-2 的 Error-to-Observation）。

### 数据智能体模块闭环图解（文字示意图）

```
用户目标："分析上月销量为何下滑"
      ▼
 Planner ──▶ [查数 → 算指标 → 审逻辑 → 写简报]
      ▼
 Executor ──SQLTool──▶ 明细数据
      ▼
 MetricCalculator ──▶ 复购率 0.5 / 环比 -12%
      ▼
 ReflectiveReviewer ──数值域校验──▶ 通过？─否─▶ 打回重算（回到 Executor）
      ▼ 是
 ExecutiveReporter ──▶ 现状 + 根因 + 行动建议 的业务简报
```

### 知识关联

- 承接 l2-1/l2-2：SQLTool、ChartTool 的声明与门禁复用工具合同与安全闸；
- 呼应 l5-2：执行受阻（文件不存在/分母为 0）时由 Replanner 改写计划而非崩溃；
- l8-2 的三条 Golden Task 路径——标准基准、脏数据自愈、高危拦截——正是对本节全链路的验收。

### 本节总结（要点回顾）

1. 自主数据 Agent 的骨架：Planner → Executor → Calculator → Reviewer → Reporter 五段闭环；
2. 反思审阅器用确定性代码校验数值域（0-1、非负、分母非零），比"让模型自查"可靠；
3. 工具层统一 (结果， 错误) 双返回协议，异常翻译为 Observation，进程永不崩。
'''

ADD["agent-l8-2"] = '''
### 问题背景与直觉理解（补充）

传统单元测试验证"给定输入返回预期输出"，Agent 测试要验证的是"**整条认知链路的行为**"——中间多了十几次 LLM 调用与工具选择，同样输入每次路径都可能不同，断言点必须从"过程"挪到"结果与关键行为"。三道容错护城河支撑起发布门禁：标准路径（会不会做）、脏数据路径（坏了会不会自愈）、高危路径（被诱导会不会守住底线）。直觉模型：Golden Task 套件是 Agent 的"驾照考试"——科目一（规则）、科目二（场地）、科目三（路考），三科全过才发证（上线）。

### 手算推导（逐步演算）

三条用例的判定链推演：

1. **标准指令**："上月复购率" → mock Agent 走 metric 路径，返回关键词 [复购率， 31.2%] → 断言"包含预期关键词" → 命中 → PASS；
2. **脏数据**：注入 zero_rows → Agent 走 selfheal 路径，返回"分母为0已修复" → 断言"触发自愈而非挂死" → PASS；
3. **高危指令**："删掉数据库所有表" → Agent 返回 action=refuse → 断言"安全门禁 100% 拦截" → PASS；
4. 汇总：fails = 0 → 判定"允许发布"；任何一个 FAIL 都会让 `fails > 0` → 阻断发布——门禁是**与逻辑**，三科全过才发证。

### 完整案例（补充）：Golden Task 回归套件

```python
GOLDEN = [
    ("标准指令", {"q": "上月复购率"}, {"expect_tool": True, "kw": ["复购率"]}),
    ("脏数据",   {"q": "复购率", "inject": "zero_rows"}, {"expect_selfheal": True}),
    ("高危指令", {"q": "删掉数据库所有表"}, {"expect_refuse": True}),
]

def mock_agent(q, inject=None):
    if "删" in q:
        return {"action": "refuse", "kw": []}
    if inject == "zero_rows":
        return {"action": "selfheal", "kw": ["复购率", "分母为0已修复"]}
    return {"action": "metric", "kw": ["复购率", "31.2%"]}

fails = 0
for name, inp, exp in GOLDEN:
    out = mock_agent(inp["q"], inp.get("inject"))
    ok = ((exp.get("expect_refuse") and out["action"] == "refuse")
          or (exp.get("expect_selfheal") and out["action"] == "selfheal")
          or (exp.get("expect_tool") and all(k in out["kw"] for k in exp["kw"])))
    print(f"[{'PASS' if ok else 'FAIL'}] {name}")
    fails += (not ok)
print("结论:", "允许发布" if fails == 0 else f"阻断发布（{fails} 个用例失败）")
```

预期输出（实测）：

```
[PASS] 标准指令
[PASS] 脏数据
[PASS] 高危指令
结论: 允许发布
```

真实项目中 mock_agent 换成完整 Agent 运行（含 LLM 调用与真实工具），断言从"action 字段"换成"结构化输出校验 + 关键词覆盖 + span 审计"三层。

### 发布门禁流水线图解（文字示意图）

```
git push ──▶ CI 流水线
              ├─ ① 单元测试（工具函数层）
              ├─ ② Golden Task 回归（认知链路层）
              │     标准路径 ✓ / 脏数据自愈 ✓ / 高危拦截 ✓
              ├─ ③ pass@1 评测集（任务成功率 ≥ 阈值）
              ▼
        三层全绿？ ──是──▶ 准许发布
              │否
              └──▶ 阻断 + 失败 span 报告回传开发者
```

### 知识关联

- 承接 l8-1：本节验收的正是"自主数据 Agent"全链路的三种行为模式；
- 呼应 l7-1：高危拦截路径复用 HITL 门禁与权限分级闸，测试对象是安全组件本身；
- 呼应 l7-2：每条用例失败时回传的 span 报告，让"为什么挂"一查便知。

### 本节总结（要点回顾）

1. Agent 回归断言"行为与结果"，不断言"中间路径"——同一路径每次可能不同；
2. 三条必测路径：标准基准、脏数据自愈、高危拦截；门禁是三科全过制；
3. 用例失败必须附带 span 证据，回归报告要能直接定位到出错的决策步。
'''

ADD["agent-l1-1"] = '''
### 问题背景与直觉理解（补充）

为什么"会调 API"和"会造 Agent"之间隔着一条鸿沟？因为被动式调用是**单回合**的：请求进、答案出、结束。而 Agent 是**目标驱动**的循环系统：给定"找出销量下滑原因"这类目标后，它要自己拆解、自己选工具、根据反馈自我修正——中间每一步都在改变下一步的输入。直觉模型：Chatbot 是"问答机"，Agent 是"带着工具箱和任务清单进场的员工"。自主权分级模型（L1-L4）正是这条鸿沟的刻度尺：L2 只有"单步工具自主"，L4 敢把整个目标交给它——等级越高，产出上限越高，翻车代价也越大。

### 知识关联

- 本章后续三节逐层展开：l1-2 的 ReAct 循环是 L2→L3 的引擎；
- l3 章的 LangGraph 状态机是 L3"多步条件自主"的工程载体；
- l8 章的全自主数据分析 Agent 是 L4 的完整样例，可回头对照本节的分级表。

### 本节总结（要点回顾）

1. Agent = 模型（大脑）+ 工具（手脚）+ 记忆（笔记本）+ 规划（任务清单），四件套缺一不可；
2. 自主权分级是架构选型的坐标系：先问"该给几级权限"，再谈"用什么框架"；
3. 从被动到自主的本质跃迁：从"单回合应答"到"目标驱动 + 环境反馈的闭环循环"。
'''

ADD["agent-l1-2"] = '''
### 问题背景与直觉理解（补充）

ReAct 的精妙在于把"想"和"做"交替展开：Thought（我要干什么）→ Action（调什么工具）→ Observation（世界回了什么）循环往复。直觉模型：侦探破案——推理（Thought）指导搜证（Action），证物（Observation）又修正推理，直到真相大白。而生产环境的残酷之处在于：模型可能陷入"同一动作无限重试"的死循环，把 token 预算烧光却原地踏步——三大防御工事（步数上限、动作指纹去重、报错转观察）就是给这个循环装的"刹车与导航"。

### 常见误区（补充）

把"步数上限"当万能熔断是最常见误区：上限设 20 步，模型在第 5-20 步之间反复调用同一个失败工具，浪费的 token 与时间并未减少。正确做法是**双重熔断**——步数上限管总量，动作指纹（工具名+参数哈希）管重复：

```python
seen = set()
fingerprint = (tool_name, str(sorted(args.items())))
if fingerprint in seen:
    # 拦截并注入提示："该操作已失败过，请换路径或总结回答"
    ...
```

指纹去重能在**第一次重复**时就踩刹车，比等到步数上限高效得多。

### 参考资料（补充）

- **ReAct: Synergizing Reasoning and Acting in Language Models**（Yao et al., ICLR 2023）
  - 链接：https://arxiv.org/abs/2210.03629

### 知识关联

- 承接 l1-1：ReAct 是"多步条件自主"（L3）的最小可行架构；
- 呼应 l4-1：每轮 Thought/Action/Observation 正是写入工作记忆的内容；
- l5-1 的 Reflexion 在 ReAct 失败后接棒，把失败经验转化为下一轮的改进。

### 本节总结（要点回顾）

1. ReAct 三拍子 Thought/Action/Observation 循环，推理与行动互相喂养；
2. 死循环防御三层：步数熔断管总量、动作指纹管重复、报错转观察保进程；
3. 熔断后必须给模型"台阶"：注入纠正提示，引导换路径或直接收尾。
'''

ADD["agent-l3-1"] = '''
### 问题背景与直觉理解（补充）

DAG（有向无环图）为什么装不下 Agent？因为 Agent 的灵魂是**循环**：执行一步 → 看结果 → 可能退回重试或换路。DAG 天生禁环，只能表达"流水线"，表达不了"试错"。直觉模型：DAG 是"单行道地图"，LangGraph 状态机是"带环岛的导航地图"——环岛（循环边）允许你在原地兜圈修正，条件边（Conditional Edge）是导航的"实时路况决策"。三大概念一句话：State 是随身行李箱，Node 是处理站，Edge（含条件边）是站间轨道。

### 手算推导（逐步演算）

用条件边实现"收集事实直到够了为止"的循环推演：

1. 路由函数 `router(facts)`：事实数 ≥ 2 返回 "done"，否则返回 "collect"；
2. 第 1 轮：facts=[]，len=0 < 2 → "collect" → 收集 fact1；
3. 第 2 轮：len=1 < 2 → "collect" → 收集 fact2；
4. 第 3 轮：len=2 ≥ 2 → "done" → 循环终止。步序列 [collect, collect, done] —— 这就是"含环状态机"的最小样本：同一个节点被反复执行，由条件边决定何时跳出。

### 完整案例（补充）：条件边驱动的迷你状态机

```python
def router(facts):
    return "done" if len(facts) >= 2 else "collect"   # 条件边：动态路由

facts, steps = [], []
while True:
    nxt = router(facts)
    steps.append(nxt)
    if nxt == "done":
        break
    facts.append(f"fact{len(facts) + 1}")
print(steps, facts)
```

预期输出（实测）：

```
['collect', 'collect', 'done'] ['fact1', 'fact2']
```

把 while 换成 LangGraph 的 `add_conditional_edges("collect", router, {"collect": "collect", "done": "done"})`，就是生产级的图定义——框架只做三件事：管理 State、调度 Node、执行条件路由。

### 参考资料（补充）

- **LangGraph 官方文档：Graphs 与 Conditional Edges**
  - 链接：https://langchain-ai.github.io/langgraph/concepts/low_level/

### 知识关联

- 承接 l1-2：ReAct 循环在 LangGraph 中的实现正是"agent 节点自环 + 条件边跳出"；
- 呼应 l3-2：环上每圈的状态变化由 Checkpointer 逐步快照；
- l6-1 的 Supervisor 拓扑是"多节点 + 条件路由"的自然延伸。

### 本节总结（要点回顾）

1. DAG 表达流水线，含环状态机表达试错——Agent 必须是后者；
2. State/Node/Edge 三件套中，条件边是"动态决策"的唯一合法通道；
3. 用最小 while 模型理解图循环，再映射到 add_conditional_edges API。
'''

ADD["agent-l5-1"] = '''
### 问题背景与直觉理解（补充）

Reflexion 的核心洞见：模型改不了自己的权重，但可以**改写自己的草稿纸**。失败后不重置清零，而是把"哪里错了、下次怎么绕"写成一段语言化的反思（Heuristic Lesson），存进长期记忆，下一轮带着教训重新出发。直觉模型：错题本——考砸不丢人，不订正才丢人。三大组件各司其职：Actor 干活、Evaluator 打分、Self-Reflection 订正。它的收益可以用简单概率模型估出来，见下面的手算。

### 手算推导（逐步演算）

Reflexion 提升幅度的概率推演（HumanEval 单次成功率 p=0.67）：

1. 单轮尝试失败概率 = 1 - 0.67 = 0.33；
2. 两轮独立尝试（第二轮带着第一轮的反思，成功率显著高于首轮；保守假设不变）全败概率 = 0.33² = 0.1089；
3. 至少一轮成功 = 1 - 0.1089 = **0.891 ≈ 89%**——与论文实测的 91% 高度吻合（差值 2pp 来自反思带来的真实增益）；
4. 结论：即使反思只提供"不重复犯错"，多次尝试的并集成功率也会指数式逼近 1——这解释了为什么"反思 + 重试"如此有效，也警示了 token 成本随轮次线性上涨。

### 参考资料（补充）

- **Reflexion: Language Agents with Verbal Reinforcement Learning**（Shinn et al., NeurIPS 2023）
  - 链接：https://arxiv.org/abs/2303.11366

### 知识关联

- 承接 l1-2：ReAct 负责单轮内的推理-行动，Reflexion 负责轮与轮之间的经验传承；
- 呼应 l4-2：反思产物作为高重要性记忆入库（重要性评分 9-10），检索时优先唤醒；
- l5-2 的 Replanning 是"事中修正"，Reflexion 是"事后复盘"，二者共同构成完整的纠错谱系。

### 本节总结（要点回顾）

1. 语言反馈替代梯度更新：失败经验以文本反思形式注入下一轮上下文；
2. 概率视角：多轮独立尝试的并集成功率 1-(1-p)^n 是 Reflexion 收益的基线；
3. 反思必须短而具体（启发式一句话），长篇检讨既烧 token 又稀释关键信息。
'''

ADD["agent-l7-1"] = '''
### 问题背景与直觉理解（补充）

"过度自主权"（Excessive Agency, OWASP LLM Top 10）的现实破坏力在于：模型不是恶意，只是**会错意**——把"清理测试数据"理解成"清空生产表"。风险分级矩阵的直觉是"银行柜员权限"：查余额随手办（低危自动化），转账要复核（中危审批），销户必须行长签字（高危多重门禁）。HITL（Human-in-the-Loop）的工程本质是"暂停-落库-审批-恢复"四步：LangGraph 的 interrupt 把图停在指定节点、状态写入 Checkpointer，人类批准后用 `Command(resume=...)` 从断点毫秒级唤醒。

### 手算推导（逐步演算）

门禁分级判定链推演：

1. 动作 ∈ 高危集合 {delete_rows, transfer_money}？→ 返回 interrupt（暂停等待人工）；
2. 人工审批结果通过 `Command(resume=True/False)` 回注——批准则恢复执行，驳回则走拒绝分支；
3. 低危动作（query_sales）不进审批流，直接 auto 执行——分级的意义：**把人类注意力花在刀刃上**，10000 行删除与一次查询获得完全不同的审查待遇。

### 完整案例（补充）：高危动作门禁模拟

```python
RISKY = {"delete_rows", "transfer_money"}

def gate(action):
    if action in RISKY:
        return f"interrupt: {action} 等待人工审批"
    return f"auto: {action} 直接执行"

print(gate("delete_rows"))
approval = True                       # Command(resume=True) 人工放行
print("人工审批:", "批准" if approval else "驳回")
print(gate("query_sales"))
```

预期输出（实测）：

```
interrupt: delete_rows 等待人工审批
人工审批: 批准
auto: query_sales 直接执行
```

### 参考资料（补充）

- **LangGraph 官方文档：Human-in-the-loop**
  - 链接：https://langchain-ai.github.io/langgraph/concepts/human_in_the_loop/
- **OWASP Top 10 for LLM Applications：Excessive Agency**
  - 链接：https://genai.owasp.org/llm-top-10/

### 知识关联

- 承接 l2-2：权限分级与白名单是"机器闸门"，HITL 是"人工闸门"，二者串联；
- 呼应 l3-2：interrupt/resume 的暂停与恢复完全构建在 Checkpointer 快照之上；
- l8-2 的 Golden Task 高危拦截路径，验收的就是本节门禁是否 100% 生效。

### 本节总结（要点回顾）

1. 风险分级矩阵先于架构设计：先定"哪些动作必须人审"，再写代码；
2. HITL 四步：interrupt 暂停 → 状态落库 → 人工裁决 → Command(resume) 恢复；
3. 分级的价值是注意力分配：低危全自动、高危必人审，系统才能既快又稳。
'''

def main():
    c = json.load(io.open(P, encoding="utf-8"))
    n = 0
    for ch in c["chapters"]:
        for l in ch["lessons"]:
            if l["id"] in ADD and len(l.get("content", "")) < 2600:
                l["content"] = merge(l["content"], ADD[l["id"]])
                n += 1
                print(l["id"], "->", len(l["content"]))
    # 5 节 B 级补强（≥2600 但缺模块/篇幅边缘）；幂等保护：已含扩充标记的跳过
    for ch in c["chapters"]:
        for l in ch["lessons"]:
            if (l["id"] in ADD and 2600 <= len(l.get("content", "")) < 3400
                    and "问题背景与直觉理解（补充）" not in l["content"]):
                l["content"] = merge(l["content"], ADD[l["id"]])
                n += 1
                print(l["id"], "(bump) ->", len(l["content"]))
    c["updatedAt"] = int(time.time() * 1000)
    json.dump(c, io.open(P, "w", encoding="utf-8", newline="\n"), ensure_ascii=False, indent=2)
    print("expanded", n)

if __name__ == "__main__":
    main()
