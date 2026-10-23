# -*- coding: utf-8 -*-
import json
import os

COURSES_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "content-data", "courses")

placeholder_courses = [
    {
        "id": "python-engineering-practices",
        "title": "Python 工程实践",
        "subtitle": "面向生产的模块化架构、包管理、自动化测试与代码重构",
        "description": "【课程内容后续建设中】本课程定位于 Python 工程化进阶指南，旨在帮助学习者从写“单文件脚本”跨越到主导“生产级中大型 Python 项目”。核心内容涵盖 PEP 8 工业级代码规范、Poetry/uv 现代依赖与虚拟环境管理、pytest 自动化测试与 Mock、面向对象设计模式、类型提示 (typing) 与 mypy 静态分析、性能调优与并发编程 (asyncio/multiprocessing)。课程正在系统化研发建设中，当前为规划入口。",
        "icon": "Layers",
        "color": "#0ea5e9",
        "domainId": "python-track",
        "prerequisites": [
            "熟练掌握 Python 语法基础、常用数据结构与函数（建议先学《Python 基础与数据处理》）",
            "熟悉基本终端命令行（cd, ls/dir）与 Git 基础操作"
        ],
        "targetAudience": "已掌握 Python 基础语法、希望摆脱“玩具脚本”并编写出可维护、可测试、高健壮性商业级工业代码的开发者与分析工程师",
        "estimatedHours": 32,
        "source": "builtin",
        "chapters": [
            {
                "id": "pep-c1",
                "courseId": "python-engineering-practices",
                "order": 1,
                "title": "课程建设规划与工程化学习路线",
                "goal": "了解 Python 工程实践的核心学习目标、适合人群、先修要求与完整知识体系，掌握后续学习的权威资源与进阶路径。",
                "lessons": [
                    {
                        "id": "pep-l1-1",
                        "title": "【后续建设中】课程架构全景与工程化学习指南",
                        "difficulty": 1,
                        "content": """### 课程状态声明

> [!NOTE] 课程建设中提示
> **本课程目前处于系统化教研与讲义编写阶段（后续建设中）**。
> 本页面为课程正式入口与全景大纲预告，明确了学习目标、适合人群、前置要求及后续即将上线的完整模块。请先完成前置课程《Python 基础与数据处理》，夯实语言核心基础！

---

### 一、课程定位与学习目标

很多初学者在学完 Python 语法后，面对真实业务场景依然会感到迷茫：
- 代码全部堆在一个 2000 行的 `.py` 文件里，改一处坏三处；
- 没有环境隔离与依赖锁定，在自己电脑能跑，放到生产服务器直接报错；
- 没有自动化单元测试，每次修改都靠肉眼“手动点一点”，心里极不踏实；
- 运行耗时数十小时，不知道瓶颈在 CPU 密集还是 I/O 阻塞。

**《Python 工程实践》**正是为了彻底解决这些痛点而设计。完成本课程后，学习者将达成以下工程能力目标：
1. **工程规范化**：严格遵循 PEP 8 规范，熟练配置 Ruff、Black、isort 等现代 Lint 工具；
2. **环境现代化**：彻底告别全局 pip 混乱依赖，掌握基于 Poetry 与 uv 的现代依赖锁定与虚拟环境管理；
3. **测试驱动 (TDD)**：掌握 pytest 核心夹具 (Fixture)、参数化测试、异常捕获与 unittest.mock 模拟外部依赖；
4. **类型安全**：熟练运用 `typing` 模块（Generic, Union, Protocol）配合 `mypy` 进行静态类型检查；
5. **架构设计**：掌握面向对象 SOLID 原则、工厂模式、单例模式及基于包与模块的清晰分层；
6. **高效并发**：理清 GIL 本质，熟练选择多进程 (multiprocessing)、多线程 (threading) 与异步协程 (asyncio)。

---

### 二、适合人群与先修要求

- **适合人群**：
  - 已学完《Python 基础与数据处理》或具备同等基础的学员；
  - 经常需要编写数据处理脚本、但渴望将代码重构为可复用库或服务的分析工程师；
  - 准备进入团队协同开发、希望写出符合大厂工业级规范代码的 Python 初中级工程师。
- **先修要求**：
  - 熟练运用 Python 基本数据类型、容器（列表、字典、集合）、函数定义与异常处理；
  - 了解命令行终端基础操作与 Git 基础。

---

### 三、核心规划模块大纲

```
┌────────────────────────────────────────────────────────┐
│             Python 现代工业级工程实践体系              │
├────────────────────────────────────────────────────────┤
│ 模块一：现代依赖管理与环境隔离 (Poetry / uv / venv)   │
│ 模块二：代码规范、静态检查与类型系统 (PEP 8 / mypy)   │
│ 模块三：自动化测试驱动开发 (pytest / Fixtures / Mock) │
│ 模块四：面向对象编程与高内聚低耦合设计模式           │
│ 模块五：异常架构与可观测性日志 (logging / loguru)      │
│ 模块六：高性能与并发进阶 (GIL / asyncio / 多进程)      │
│ 模块七：开源包打包、发布与 CI/CD 自动化流水线         │
└────────────────────────────────────────────────────────┘
```

---

### 四、官方权威自学资料推荐（过渡期拓展阅读）

在课程内容上线前，建议通过以下官方权威开源资料进行自学：
1. **PEP 8 – Style Guide for Python Code**:
   - 机构：Python Software Foundation
   - 链接：[PEP 8 Documentation](https://peps.python.org/pep-0008/)
   - 说明：Python 官方代码风格指南，全文字规范。
2. **pytest Documentation**:
   - 机构：pytest-dev 组织
   - 链接：[pytest.org](https://docs.pytest.org/en/stable/)
   - 说明：业界最主流的 Python 自动化测试框架官方文档与教程。
3. **Poetry 现代依赖管理指南**:
   - 机构：Python Poetry Team
   - 链接：[python-poetry.org](https://python-poetry.org/docs/)
   - 说明：现代 Python 依赖解析与构建工具官方手册。
""",
                        "tips": [
                            {
                                "kind": "note",
                                "text": "本课程正在研发中。建议优先学完《Python 基础与数据处理》，打牢语言地基。"
                            }
                        ],
                        "demos": [
                            {
                                "title": "工程化类型提示 (Type Hints) 演示",
                                "lang": "python",
                                "code": "# 现代 Python 工程实践核心特性之一：类型提示 (Type Hints) 与文档说明\nfrom typing import List, Dict, Optional\n\ndef calculate_order_summary(prices: List[float], discount_rate: float = 0.9) -> Dict[str, float]:\n    \"\"\"计算订单总价与折扣后实付金额\"\"\"\n    raw_total = sum(prices)\n    discounted_total = round(raw_total * discount_rate, 2)\n    return {\n        'raw_total': round(raw_total, 2),\n        'discounted_total': discounted_total,\n        'saved_amount': round(raw_total - discounted_total, 2)\n    }\n\nsummary = calculate_order_summary([19.9, 45.0, 100.5], 0.85)\nprint('类型标注让函数接口自我表达：')\nfor k, v in summary.items():\n    print(f'  {k}: {v}')\n"
                            }
                        ]
                    }
                ],
                "exercises": [
                    {
                        "id": "pep-ex-1",
                        "type": "single",
                        "difficulty": 1,
                        "question": "在 Python 官方 PEP 8 规范中，推荐的普通变量与函数命名风格是哪一种？",
                        "options": [
                            {"value": "A", "label": "snake_case（全小写下划线命名法，如 user_order_list）"},
                            {"value": "B", "label": "camelCase（小驼峰命名法，如 userOrderList）"},
                            {"value": "C", "label": "PascalCase（大驼峰命名法，如 UserOrderList）"},
                            {"value": "D", "label": "kebab-case（短横线命名法，如 user-order-list）"}
                        ],
                        "answer": "A",
                        "explanation": "根据 PEP 8 命名规范，普通函数与变量命名应全部小写，单词之间用单下划线分隔（snake_case）；类名使用 PascalCase（大驼峰）；常量使用全大写加下划线（UPPER_CASE）。",
                        "tags": ["PEP 8", "代码规范"]
                    },
                    {
                        "id": "pep-ex-2",
                        "type": "multiple",
                        "difficulty": 2,
                        "question": "在现代 Python 工程项目中，使用 Poetry / uv 替代单纯的全局 pip install 的核心收益包括哪些？",
                        "options": [
                            {"value": "A", "label": "自动管理独立的虚拟环境，避免不同项目间的依赖版本相互污染"},
                            {"value": "B", "label": "生成 lock 锁定文件，精确记录所有子依赖版本，确保在任何机器上安装结果 100% 一致"},
                            {"value": "C", "label": "统一声明开发依赖（如 pytest/ruff）与生产运行依赖"},
                            {"value": "D", "label": "执行 Python 代码时可以让单线程自动拥有多核 CPU 算力"}
                        ],
                        "answer": ["A", "B", "C"],
                        "explanation": "现代依赖管理工具（Poetry/uv）通过环境隔离、依赖锁（lockfile）以及依赖分组（生产依赖 vs 开发测试依赖）解决可重现构建难题；选项 D 属于多进程/并发范畴，与包管理器无关。",
                        "tags": ["依赖管理", "虚拟环境"]
                    }
                ]
            }
        ]
    },
    {
        "id": "python-llm-applications",
        "title": "Python 大模型应用开发",
        "subtitle": "LangChain、LlamaIndex、提示词工程与 RAG 检索增强实战",
        "description": "【课程内容后续建设中】本课程专注于运用 Python 快速落地企业级大语言模型（LLM）应用。核心体系涵盖 OpenAI/Anthropic/DeepSeek API 工业级接入与异步流式处理、结构化输出 (Pydantic / Instructor)、现代提示词工程体系、基于 Chroma/Qdrant 的 RAG 检索增强全链路（文档切分、Embedding 选型、混合检索与重排）、以及基于 LangChain/LlamaIndex 的企业知识库实战。课程正在体系化编写中，当前为规划入口。",
        "icon": "Cpu",
        "color": "#6366f1",
        "domainId": "python-track",
        "prerequisites": [
            "掌握 Python 基础语法与面向对象编程（建议先学《Python 基础与数据处理》）",
            "了解 HTTP 网络请求、RESTful API 交互与 JSON 数据解析"
        ],
        "targetAudience": "希望掌握大语言模型落地应用开发技能的 Python 开发者、数据分析师与算法工程师",
        "estimatedHours": 36,
        "source": "builtin",
        "chapters": [
            {
                "id": "llma-c1",
                "courseId": "python-llm-applications",
                "order": 1,
                "title": "课程建设规划与大模型应用路线",
                "goal": "掌握 Python 大模型应用开发的核心技术版图、先修要求与阶段实战目标，清晰理解后续学习路径与权威学习资料。",
                "lessons": [
                    {
                        "id": "llma-l1-1",
                        "title": "【后续建设中】大模型应用开发版图与学习路径",
                        "difficulty": 1,
                        "content": """### 课程状态声明

> [!NOTE] 课程建设中提示
> **本课程目前处于系统化研发与实战案例打磨阶段（后续建设中）**。
> 本页面为课程正式入口与全景大纲预告，明确了学习目标、适合人群、前置要求及后续即将上线的完整模块。建议先学完《Python 基础与数据处理》，具备扎实的 Python 编程能力后再开启大模型实战！

---

### 一、课程定位与学习目标

随着 ChatGPT、DeepSeek 等先进大语言模型的普及，软件研发正在从“纯规则代码编写”转向“自然语言 + 提示词 + 外部知识挂载 + 工具调用”的全新范式。
单纯调用网页版对话窗口无法解决企业内部知识隔离、结构化业务对接与批量自动化的问题。

**《Python 大模型应用开发》**聚焦于使用 Python 官方 SDK 与开源框架将 LLM 转化为企业级生产力：
1. **API 高效接入**：掌握现代 LLM 统一接口调用、参数调优（temperature, top_p, max_tokens）与流式输出（Streaming）；
2. **结构化提取**：使用 Pydantic 与 Function Calling 强制模型输出严格符合 Schema 的 JSON，彻底终结模型“自由发挥”导致的解析崩溃；
3. **提示词系统工程**：掌握 Few-shot 少样本提示、CoT 思维链、自洽性检查与 System Prompt 角色约束；
4. **企业级 RAG 检索增强**：深入掌握文档分块（Chunking）、向量嵌入（Embeddings）、向量数据库（Chroma/Milvus/Qdrant）、关键词+语义混合检索（Hybrid Search）以及重排（Rerank）；
5. **主流开源框架实操**：深度剖析 LangChain 与 LlamaIndex 的核心抽象，构建企业级智能知识库与问答机器人。

---

### 二、适合人群与先修要求

- **适合人群**：
  - 拥有 Python 基础，希望将大语言模型集成至自身业务系统中的工程师；
  - 想要研发私有知识库问答、自动化文档总结、客服自动化系统的开发者；
  - 希望从传统数据分析迈向 AI Native 应用研发的数据科学家与分析师。
- **先修要求**：
  - 熟练运用 Python 基础语法、文件处理、字典与列表数据操作；
  - 了解 HTTP 请求、API 调用（requests / httpx）与 JSON 编解码。

---

### 三、核心规划模块大纲

```
┌────────────────────────────────────────────────────────┐
│            Python 大语言模型工业级应用开发体系         │
├────────────────────────────────────────────────────────┤
│ 模块一：LLM 核心原理与 Python SDK 接入 (OpenAI/DeepSeek)│
│ 模块二：Pydantic 与结构化输出 (Structured Output)     │
│ 模块三：现代提示词工程系统设计 (Few-shot / CoT / Role) │
│ 模块四：文本分块与向量嵌入 (Chunking & Embeddings)    │
│ 模块五：向量数据库与检索策略 (Chroma / Qdrant / Hybrid)│
│ 模块六：LangChain 核心抽象与 LCEL 链式调用表达式       │
│ 模块七：LlamaIndex 知识库索引与查询引擎实战           │
│ 模块八：企业级本地文档智能知识库全流程综合实战        │
└────────────────────────────────────────────────────────┘
```

---

### 四、官方权威自学资料推荐（过渡期拓展阅读）

在课程内容上线前，建议参考以下权威官方公开资料：
1. **OpenAI Cookbook**:
   - 机构：OpenAI
   - 链接：[OpenAI Cookbook GitHub](https://github.com/openai/openai-cookbook)
   - 说明：涵盖 API 最佳实践、结构化输出、Embeddings 检索等大量代码范例。
2. **LangChain 官方文档**:
   - 机构：LangChain 官方团队
   - 链接：[LangChain Python Docs](https://python.langchain.com/docs/get_started/introduction)
   - 说明：LLM 应用编排框架的权威参考手册。
3. **LlamaIndex 官方文档**:
   - 机构：LlamaIndex 团队
   - 链接：[LlamaIndex Docs](https://docs.llamaindex.ai/en/stable/)
   - 说明：专注于大模型外挂私有数据源与 RAG 检索的框架文档。
""",
                        "tips": [
                            {
                                "kind": "note",
                                "text": "本课程正在研发中。建议先完成《Python 基础与数据处理》，熟练掌握字典、列表与 JSON 解析。"
                            }
                        ],
                        "demos": [
                            {
                                "title": "结构化输出模拟：Pydantic 验证模型返回值",
                                "lang": "python",
                                "code": "# 模拟大模型返回的结构化信息并进行数据校验\nimport json\n\n# 模拟大模型输出的 JSON 文本\nllm_response_text = '''\n{\n    \"sentiment\": \"positive\",\n    \"confidence\": 0.94,\n    \"topics\": [\"物流快\", \"包装完好\", \"商品质量好\"]\n}\n'''\n\n# 解析并校验\ndata = json.loads(llm_response_text)\nprint(f\"情感分类: {data['sentiment']}\")\nprint(f\"置信度: {data['confidence'] * 100:.1f}%\")\nprint(f\"提取的核心主题: {', '.join(data['topics'])}\")\nassert data['sentiment'] in ['positive', 'negative', 'neutral'], '非法情感标签'\nprint('✓ 结构化校验通过！')\n"
                            }
                        ]
                    }
                ],
                "exercises": [
                    {
                        "id": "llma-ex-1",
                        "type": "single",
                        "difficulty": 1,
                        "question": "在调用大语言模型 API 时，如果希望生成的结果更加稳定、客观、确定性最高（如提取 JSON 数据），应该如何调整 temperature 参数？",
                        "options": [
                            {"value": "A", "label": "将 temperature 设置为较低值（如 0.0 ~ 0.2）"},
                            {"value": "B", "label": "将 temperature 设置为较高值（如 1.5 ~ 2.0）"},
                            {"value": "C", "label": "temperature 参数对结果确定性没有任何影响"},
                            {"value": "D", "label": "必须设置为负数"}
                        ],
                        "answer": "A",
                        "explanation": "temperature（温度）控制大模型采样概率分布的平滑程度。较低的 temperature（接近 0）会使模型倾向于选择概率最高的分词（Greedy Search），输出更严谨、稳定、具有高确定性；较高的 temperature 会增加输出的随机性与创造力。",
                        "tags": ["LLM API", "参数调优"]
                    },
                    {
                        "id": "llma-ex-2",
                        "type": "single",
                        "difficulty": 2,
                        "question": "在 RAG（检索增强生成）系统中，将长文档切分为较小文本块（Chunking）的主要原因不包括哪一项？",
                        "options": [
                            {"value": "A", "label": "大模型的上下文窗口（Context Window）存在物理上限或高昂成本"},
                            {"value": "B", "label": "较小且语义集中的文本块能更精准地匹配用户问题的 Embedding 语义相似度"},
                            {"value": "C", "label": "切分文本块可以自动将文本里的语法错误完全修复"},
                            {"value": "D", "label": "避免过多不相关的噪声上下文干扰模型回答质量（降低幻觉）"}
                        ],
                        "answer": "C",
                        "explanation": "Chunking（分块）的作用在于适应模型上下文窗口限制、提高向量检索命中精度并减少冗余无关背景噪声。分块本身是纯文本切片逻辑，不能也不可能自动修复文本原有的语法错误。",
                        "tags": ["RAG", "Chunking"]
                    }
                ]
            }
        ]
    },
    {
        "id": "python-agent-development",
        "title": "Python Agent 开发实战",
        "subtitle": "自主智能体设计、工具调用、Multi-Agent 协作与复杂任务编排",
        "description": "【课程内容后续建设中】本课程面向下一代自主智能体（AI Agent）系统的架构与实战落地。重点讲透 ReAct 推理-行动循环机制、Function Calling 与动态工具挂载、短期工作记忆与长期向量记忆管理、基于 LangGraph 与 CrewAI 的多智能体协作（Multi-Agent System）拓扑设计、以及生产级 Agent 的容错重试、人工介入 (Human-in-the-loop) 与可观测性追踪。课程正在全力研发建设中，当前为规划入口。",
        "icon": "Bot",
        "color": "#8b5cf6",
        "domainId": "python-track",
        "prerequisites": [
            "掌握 Python 基础语法与函数式/面向对象设计（建议先学《Python 基础与数据处理》）",
            "理解大模型 Prompt、Function Calling 与 RAG 基础机制（建议先学《Python 大模型应用开发》）"
        ],
        "targetAudience": "希望研发自主 AI 智能体、自动化业务工作流与复杂多 Agent 系统的中高级工程师与架构师",
        "estimatedHours": 40,
        "source": "builtin",
        "chapters": [
            {
                "id": "agent-c1",
                "courseId": "python-agent-development",
                "order": 1,
                "title": "课程建设规划与 Agent 架构路线",
                "goal": "建立自主智能体 (Agent) 架构全景认知、明确核心知识储备与多阶段实战目标，掌握后续自主探索与跟进学习的权威资源。",
                "lessons": [
                    {
                        "id": "agent-l1-1",
                        "title": "【后续建设中】自主智能体全景架构与实战学习指南",
                        "difficulty": 1,
                        "content": """### 课程状态声明

> [!NOTE] 课程建设中提示
> **本课程目前处于系统化架构设计与 Multi-Agent 实战案例编写阶段（后续建设中）**。
> 本页面为课程正式入口与全景大纲预告，明确了学习目标、适合人群、前置要求及后续即将上线的完整模块。建议先学完《Python 基础与数据处理》和《Python 大模型应用开发》，建立扎实的技术底座！

---

### 一、课程定位与学习目标

如果说上一代软件是“人写死代码规则，计算机机械执行”，而初阶 LLM 应用是“人问一句，模型答一句”；那么 **AI Agent（自主智能体）** 则是让大模型拥有**“感知环境、自主规划目标、拆解步骤、调用外部工具、观测执行结果、自我纠错并最终达成复杂目标”**的全新生命力。

**《Python Agent 开发实战》**旨在带领学习者深入掌握生产级 Agent 系统的工程落地：
1. **Agent 核心思维闭环**：深入剖析 ReAct (Reasoning + Acting) 架构、Plan-and-Solve、Reflexion 自我反思机制；
2. **工具挂载系统**：掌握 Python 函数到 OpenAPI / JSON Schema 的自动反射转换，实现动态数据库查询、搜索工具与本地文件读写安全沙箱；
3. **短期与长期记忆管理**：掌握上下文会话滑动窗口、语义压缩记忆与基于向量库的历史持久化；
4. **多智能体协作网络 (Multi-Agent)**：掌握基于有向图（DAG / StateGraph）的多角色协同系统（如主管-执行者、研究员-撰稿人-审核员）；
5. **生产级健壮性保障**：掌握死循环检测、工具调用超时重试、人工介入 (Human-in-the-loop) 授权审批与执行链路追踪。

---

### 二、适合人群与先修要求

- **适合人群**：
  - 渴望开发自主执行复杂任务（如自动写代码、自动跑数据报表、跨系统自主操作）的工程师；
  - 探索下一代企业级 AI 工作流自动化、Multi-Agent 协同架构的系统架构师。
- **先修要求**：
  - 扎实的 Python 编程能力，理解异步编程、状态机概念；
  - 熟悉 LLM API 调用与结构化输出（建议先修《Python 基础与数据处理》）。

---

### 三、核心规划模块大纲

```
┌────────────────────────────────────────────────────────┐
│               Python 自主智能体 (Agent) 体系           │
├────────────────────────────────────────────────────────┤
│ 模块一：Agent 本质：从 LLM 到自主推理-行动闭环 (ReAct)│
│ 模块二：工具使用 (Tool Use) 与函数调用 (Function Call) │
│ 模块三：状态机与循环编排：基于 LangGraph 的有向图设计 │
│ 模块四：Agent 记忆机制：工作记忆、短期窗口与长期记忆   │
│ 模块五：Multi-Agent 协作范式：CrewAI 与分层协同拓扑    │
│ 模块六：安全沙箱、人工介入 (HITL) 与容错熔断机制       │
│ 模块七：端到端综合实战：自主全自动数据分析与汇报智能体│
└────────────────────────────────────────────────────────┘
```

---

### 四、官方权威自学资料推荐（过渡期拓展阅读）

在课程内容上线前，建议参考以下权威论文与开源官方文档：
1. **ReAct: Synergizing Reasoning and Acting in Language Models**:
   - 机构：普林斯顿大学 & Google Research
   - 论文链接：[arXiv:2210.03629](https://arxiv.org/abs/2210.03629)
   - 说明：奠定现代 Agent 推理与工具调用循环的最核心经典论文。
2. **LangGraph 官方文档**:
   - 机构：LangChain 团队
   - 链接：[LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
   - 说明：专为构建多参与者、含环状态机与生产级 Agent 设计的官方框架。
3. **CrewAI 官方文档**:
   - 机构：CrewAI 团队
   - 链接：[docs.crewai.com](https://docs.crewai.com/)
   - 说明：基于角色扮演的高级多智能体协作框架文档。
""",
                        "tips": [
                            {
                                "kind": "note",
                                "text": "本课程正在研发中。建议先学完《Python 基础与数据处理》，夯实函数、类与数据处理基本功。"
                            }
                        ],
                        "demos": [
                            {
                                "title": "极简 ReAct 循环伪逻辑演示",
                                "lang": "python",
                                "code": "# 演示 ReAct (Reasoning + Action) 的核心闭环思想\nclass MiniAgent:\n    def __init__(self):\n        self.tools = {'add': lambda a, b: a + b, 'multiply': lambda a, b: a * b}\n        \n    def run(self, task: str):\n        print(f\"[目标任务]: {task}\")\n        print(\"[思考 1]: 用户需要先计算 (5 + 3)，再乘以 10。\")\n        print(\"[行动 1]: 调用工具 add(5, 3)\")\n        step1_result = self.tools['add'](5, 3)\n        print(f\"[观察 1]: 工具返回结果 = {step1_result}\")\n        print(f\"[思考 2]: 现在需要将结果 {step1_result} 与 10 相乘。\")\n        print(f\"[行动 2]: 调用工具 multiply({step1_result}, 10)\")\n        final_result = self.tools['multiply'](step1_result, 10)\n        print(f\"[观察 2]: 工具返回结果 = {final_result}\")\n        print(f\"[最终结论]: 计算完成，答案是 {final_result}\")\n        return final_result\n\nagent = MiniAgent()\nres = agent.run(\"计算 (5 + 3) * 10\")\n"
                            }
                        ]
                    }
                ],
                "exercises": [
                    {
                        "id": "agent-ex-1",
                        "type": "single",
                        "difficulty": 1,
                        "question": "在自主智能体领域，经典的 ReAct 框架的核心思想是什么？",
                        "options": [
                            {"value": "A", "label": "协同结合“思考/推理 (Reasoning)”与“行动/工具调用 (Acting)”，并在行动后观察结果以指导下一步决策"},
                            {"value": "B", "label": "前端使用 React.js 进行可视化渲染"},
                            {"value": "C", "label": "直接将任务一次性交给大模型输出最终结论，不允许中间调用任何工具"},
                            {"value": "D", "label": "用多线程技术提高 Python 运行速度"}
                        ],
                        "answer": "A",
                        "explanation": "ReAct（Synergizing Reasoning and Acting）通过让模型交替进行“思考（Thought）- 行动（Action）- 观察（Observation）”，从而赋予模型动态获取外部实时信息并根据中间反馈纠错的能力。",
                        "tags": ["Agent 理论", "ReAct"]
                    },
                    {
                        "id": "agent-ex-2",
                        "type": "multiple",
                        "difficulty": 2,
                        "question": "在设计工业级 Agent 系统时，引入 Human-in-the-loop（人工介入审批）机制的主要场景有哪些？",
                        "options": [
                            {"value": "A", "label": "执行具有破坏性或不可逆的操作（如删除数据库表、格式化磁盘）"},
                            {"value": "B", "label": "涉及真实资金交易、敏感权限变更或向所有客户批量发送正式邮件"},
                            {"value": "C", "label": "Agent 连续多次出现工具调用错误或陷入无法判定的循环时转交人工处理"},
                            {"value": "D", "label": "仅仅为了让系统运行变慢以节省电量"}
                        ],
                        "answer": ["A", "B", "C"],
                        "explanation": "Human-in-the-loop（人在回路）是 Agent 安全合规与容错兜底的核心机制，主要用于高危不可逆操作二次确认、资金/权限敏感操作审批，以及异常脱困；选项 D 纯属荒谬选项。",
                        "tags": ["Agent 安全", "HITL"]
                    }
                ]
            }
        ]
    }
]

def main():
    os.makedirs(COURSES_DIR, exist_ok=True)
    for c in placeholder_courses:
        path = os.path.join(COURSES_DIR, f"{c['id']}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(c, f, ensure_ascii=False, indent=2)
        print(f"Written placeholder course: {path}")

if __name__ == "__main__":
    main()
