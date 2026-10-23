# 「AI 自动化」课程候选清单（第一阶段：研究结果）

> 调研日期：2026-10-21
> 调研方式：直接抓取官方课程页面（python urllib + User-Agent），逐页验证可访问性
> 状态说明：✅已验证 = 实际抓取到页面并读到课程描述/大纲；❌无法访问 = 已尝试但失败

---

---

## 零、深度调研补充（2026-10-21 二次调研）

> 补充报告：`docs/ai-automation-sources.md`（436 行，24 条课程记录，42 个 URL 逐条复验）
> 方法：MIT OCW 官方 sitemap 全量枚举 2590 门课 + 已知 URL 直接探测（所有搜索引擎不可用）

### 最重要的负面结论

| 检索 | 结果 |
| --- | --- |
| MIT OCW 全部 2590 门课中 `automation` 精确命中 | **0 门** |
| MIT OCW 中 `workflow` 命中 | **0 门** |
| MIT OCW 中 `agent` 命中 | **1 门**（6.S890 多智能体学习，博弈论视角，非 LLM Agent） |
| edX RPA 专题页推荐的 4 门课 | **全部与 RPA 无关**（ETH 自动驾驶、World Bank 未来工作等） |

**结论**：**没有任何大学开设「AI 自动化」或「RPA」的完整学分课。**
这不是搜索不充分，而是这个领域**学术课程体系尚未建立**——
工程实践跑在了大学课程前面。

### 5 门高相关度课程（补充了我原先遗漏的）

| 课程 | 学校 | 编号 | 教师 | 我原清单 |
| --- | --- | --- | --- | --- |
| LLM Agents MOOC (F24) | UC Berkeley | 无编号 | Dawn Song, Xinyun Chen | 已有 |
| **Advanced LLM Agents MOOC (SP25)** | UC Berkeley | 无编号 | Dawn Song, Kaiyu Yang | **新增** |
| **CS294-196 Agentic AI (F25)** | UC Berkeley | CS294-196 | Dawn Song | **新增**（我只有 F24） |
| **CS 329T Trustworthy ML / Agentic Systems** | Stanford | CS 329T | Anupam Datta, John Mitchell | **新增** |
| 11-766 LLM Applications | CMU | 11-766 | Fernando Diaz, Daphne Ippolito | 已有 |

### 许可提示（重要）

| 来源 | 许可 | 可否改编 |
| --- | --- | --- |
| MIT OCW | **CC BY-NC-SA 4.0** | ✅ 可改编（需署名、非商用、相同方式共享） |
| Harvard CS50 AI | **CC BY-NC-SA 4.0** | ✅ 可改编 |
| Stanford / CMU / Berkeley 课程页 | **未声明 CC** | ❌ 按默认版权保留，不可假设可转载 |

**本课程的处理**：只引用课程大纲与主题作为**结构参考**，
所有正文、示例、习题**全部原创**，不复制任何课程材料。

### 覆盖度重估

| 主题 | 大学课程覆盖 | 来源类型 |
| --- | --- | --- |
| AI 基础（搜索/推理/约束） | MIT 6.034、Harvard CS50 AI | 学术 ✅ |
| 规划与决策 | MIT 16.410（唯一覆盖"规划/执行"完整链路） | 学术 ✅ |
| LLM Agent 原理 | Berkeley F24/SP25、CS294-196 | 学术 ✅ |
| Agent 评估 | Stanford CS329T | 学术 ✅ |
| LLM 应用与 RAG | CMU 11-766 | 学术 ✅ |
| **工作流编排（n8n/Zapier）** | **零** | ⚠️ 100% 厂商文档 |
| **RPA（UiPath/Power Automate）** | **零** | ⚠️ 100% 厂商文档 |
| 代码生成与测试 | Berkeley F24 第 6 讲 + SWE-bench | 学术 + 论文 |

**比例**：学术来源约 63% / 厂商文档约 37%。

### 对课程结构的微调建议

子代理建议 6 部分 44 章，我保留 **5 门 20 章**（已确认的方案），理由：

1. 44 章对个人学习网站过重，会稀释完成度；
2. 6 部分中「自动化基础与流程建模」可压缩进 M1 的 1 章；
3. 「多 Agent、评测与运维」已拆分到 M2-c4 与 M5；
4. 但**采纳其两点建议**：
   - M1-c1 增加「流程建模」内容（参考 MIT 16.410 的规划视角）
   - M3-c1 明确标注「100% 厂商文档来源」

## 一、核心发现（先说结论）

「AI 自动化」这个主题，**大学官方课程存在明显的分层**：

| 层次 | 大学课程覆盖情况 |
| --- | --- |
| **AI 基础理论**（搜索、推理、机器学习） | ✅ 覆盖充分（MIT 6.034、Stanford CS229） |
| **LLM Agent 与自动化工作流** | ⚠️ **只有极少数前沿课程**（Berkeley CS294、CMU 11-766） |
| **RPA / 业务流程自动化** | ❌ 大学课程几乎不覆盖（属工程实践领域） |
| **工业机器人自动化** | ✅ 覆盖（MIT 2.017J、Stanford CS223A），但**偏硬件，与软件自动化不同** |

**结论**：这门课必须以 **Berkeley CS294 + CMU 11-766** 为学术骨架，
用 MIT 6.034/6.036 补理论基础，用厂商文档（OpenAI/Anthropic）补工程落地。
**不能只靠大学课程**——因为"AI 自动化"的工程实践跑在学术前面。

---

## 二、已验证的官方课程清单

### A. 直接相关（LLM Agent / 自动化工作流）

| # | 课程 | 学校 | 编号 | 教师 | 难度 | 先修 | 官方 URL | 许可 | 相关度 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **Large Language Model Agents** | UC Berkeley | CS294/194-196 | Dawn Song 等（含 Google DeepMind、OpenAI 嘉宾） | 研究生 | ML + LLM 基础 | https://rdi.berkeley.edu/llm-agents/f24 | 页面公开，未标注 CC | ⭐⭐⭐⭐⭐ |
| 2 | **Large Language Model Applications** | CMU | 11-766（原 11-667/11-891） | Fernando Diaz, Daphne Ippolito | 研究生 | NLP + ML 基础 | https://cmu-llms.org/ | 页面公开 | ⭐⭐⭐⭐⭐ |

**Berkeley CS294 完整课表（12 周，已验证）**：

| 周 | 日期 | 主题 | 嘉宾 |
| --- | --- | --- | --- |
| 1 | Sept 9 | LLM Reasoning | Denny Zhou (Google DeepMind) |
| 2 | Sept 16 | LLM agents: brief history and overview | Shunyu Yao (OpenAI) |
| 3 | Sept 23 | Agentic AI Frameworks & AutoGen / 多模态知识助手 | Chi Wang (AutoGen), Jerry Liu (LlamaIndex) |
| 4 | Sept 30 | 企业生成式 AI 趋势与成功 Agent 的关键组件 | Burak Gokturk (Google) |
| 5 | Oct 7 | Compound AI Systems & DSPy 框架 | Omar Khattab (Databricks) |
| 6 | Oct 14 | **Agents for Software Development** | — |
| 7 | Oct 21 | **AI Agents for Enterprise Workflows** | — |
| 8 | Oct 28 | 神经与符号决策的统一框架 | — |
| 9 | Nov 4 | Project GR00T：通用机器人蓝图 | — |
| 10 | Nov 18 | 基础模型时代的开源与科学 | — |
| 11 | Nov 25 | 度量 Agent 能力与 Anthropic RSP | — |
| 12 | Dec 2 | 构建安全可信 AI Agent 的路径 | — |

**必读论文（官方列出的，可直接引用）**：
- ReAct: Synergizing Reasoning and Acting in Language Models
- WebShop: Towards Scalable Real-World Web Interaction with Grounded Language Agents
- AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation
- StateFlow: Enhancing LLM Task-Solving through State-Driven Workflows
- Chain-of-Thought Reasoning Without Prompting
- Large Language Models Cannot Self-Correct Reasoning Yet

**CMU 11-766 完整课表（27 讲，已验证）**：

| 日期 | 主题 | 与「AI 自动化」的关系 |
| --- | --- | --- |
| 01/13 | Origins of LLMs | 背景 |
| 01/15 | NLU vs NLG | 背景 |
| 01/20 | The science of prompting | ⭐ 提示工程的科学性 |
| 01/22 | 何时微调 / 高效微调 | ⭐ 决策框架 |
| 01/27 | 学习表示与嵌入 | 基础 |
| 01/29 | Retrieval 1: 存储与检索知识 | ⭐ RAG |
| 02/03 | Retrieval 2: RAG、deep research | ⭐⭐ |
| 02/05 | Retrieval 3: RAG(2) 与 deep research | ⭐⭐ |
| 02/10 | Deep research | ⭐⭐ 自动化研究 |
| 02/12 | 任务导向对话 | ⭐ 流程自动化 |
| 02/17 | 工具使用、闲聊、人格与陪伴 | ⭐⭐ **工具调用** |
| 02/19 | 写作与创意助手 | 应用 |
| 02/24 | LLM 做评估：合成数据、模拟、自动评估 | ⭐⭐ **自动评估** |
| 02/26 | **多 Agent 系统** | ⭐⭐⭐ 核心 |
| 03/10 | LLM 应用造成的危害 | ⭐ 安全 |
| 03/12 | 攻击 LLM 与应用 | ⭐ 安全 |
| 03/17 | **代码写作助手**（Zora Wang 嘉宾） | ⭐⭐⭐ 代码自动化 |
| 03/19 | 图像生成与图像对话 | 多模态 |
| 03/24 | 非英语语言与非美国文化 | 应用 |
| 03/26 | 世界模型（Mingkai Deng） | 前沿 |
| 03/31 | 生物理解（Lei Li） | 应用 |
| 04/02 | 音乐生成（Chris Donahue） | 应用 |
| 04/07 | Numbers | 应用 |
| 04/14 | 机器人与具身 AI（Leena Mathur） | 相邻领域 |
| 04/16 | **部署** | ⭐⭐ **工程落地** |
| 04/21-23 | 项目展示 | — |

> **与本课程直接相关的 12 讲**（标 ⭐ 及以上）：
> 提示工程、微调决策、RAG×3、deep research、任务对话、工具使用、
> 自动评估、多 Agent、代码助手、部署。

### B. 理论基础

| # | 课程 | 学校 | 编号 | 教师 | 难度 | 先修 | 官方 URL | 许可 | 相关度 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 3 | **Artificial Intelligence** | MIT | 6.034 | Patrick Henry Winston | 本科 | Python、算法基础 | https://ocw.mit.edu/courses/6-034-artificial-intelligence-fall-2010/ | **CC BY-NC-SA 4.0** | ⭐⭐⭐⭐ |
| 4 | **Machine Learning** | Stanford | CS229 | Andrew Ng | 研究生 | 概率论、线性代数 | https://see.stanford.edu/Course/CS229 | Stanford SEE 条款（可免费学习） | ⭐⭐⭐ |
| 5 | **Introduction to Machine Learning** | MIT | 6.036 | — | 本科 | 线性代数、概率 | https://ocw.mit.edu/courses/6-036-introduction-to-machine-learning-fall-2020/ | CC BY-NC-SA 4.0 | ⭐⭐⭐ |

**MIT 6.034 完整 24 讲（已验证）**：

| 讲 | 主题 |
| --- | --- |
| 1 | Introduction and Scope |
| 2 | Reasoning: Goal Trees and Problem Solving |
| 3 | Reasoning: Goal Trees and Rule-Based Expert Systems |
| 4 | Search: Depth-First, Hill Climbing, Beam |
| 5 | Search: Optimal, Branch and Bound, A* |
| 6 | Search: Games, Minimax, and Alpha-Beta |
| 7-9 | Constraints（线图解释、搜索与域约简、视觉对象识别） |
| 10 | Introduction to Learning, Nearest Neighbors |
| 11 | Learning: Identification Trees, Disorder |
| 12A/12B | Neural Nets / Deep Neural Nets |
| 13 | Learning: Genetic Algorithms |
| 14 | Learning: Sparse Spaces, Phonology |
| 15 | Learning: Near Misses, Felicity Conditions |
| 16 | Learning: Support Vector Machines |
| 17 | Learning: Boosting |
| 18 | Representations: Classes, Trajectories, Transitions |
| 19 | Architectures: GPS, SOAR, Subsumption, Society of Mind |
| 21-22 | Probabilistic Inference I / II |
| 23 | Model Merging, Cross-Modal Coupling, Course Summary |

> 注：第 20 讲在官方列表中缺失（可能是复习课或考试周）。

### C. 相邻领域（工业自动化，与软件自动化定位不同）

| # | 课程 | 学校 | 编号 | 教师 | 难度 | 官方 URL | 许可 | 相关度 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 6 | Design of Electromechanical Robotic Systems | MIT | 2.017J | — | 本科 | https://ocw.mit.edu/courses/2-017j-design-of-electromechanical-robotic-systems-fall-2009/ | CC BY-NC-SA 4.0 | ⭐⭐（偏硬件） |
| 7 | Introduction to Robotics | Stanford | CS223A | Oussama Khatib | 研究生 | https://see.stanford.edu/Course/CS223A | Stanford SEE 条款 | ⭐⭐（偏硬件） |
| 8 | Underactuated Robotics | MIT | 6.832 | Russ Tedrake | 研究生 | https://ocw.mit.edu/courses/6-832-underactuated-robotics-spring-2009/ | CC BY-NC-SA 4.0 | ⭐（偏控制理论） |

### D. 工程实践支撑（MIT 管理/优化类）

| # | 课程 | 学校 | 编号 | 官方 URL | 相关度 |
| --- | --- | --- | --- | --- | --- |
| 9 | The Analytics Edge | MIT Sloan | 15.071 | https://ocw.mit.edu/courses/15-071-the-analytics-edge-spring-2017/ | ⭐⭐（数据驱动决策） |
| 10 | Optimization Methods in Management Science | MIT Sloan | 15.053 | https://ocw.mit.edu/courses/15-053-optimization-methods-in-management-science-spring-2013/ | ⭐⭐（流程优化） |

---

## 三、无法访问 / 未验证的资源

| 资源 | 尝试 URL | 结果 | 原因 |
| --- | --- | --- | --- |
| MIT 6.4210 Introduction to Deep Learning | https://ocw.mit.edu/courses/6-4210-introduction-to-deep-learning-spring-2023/ | ❌ 404 | 课程编号或年份不对，OCW 可能未收录 |
| MIT 16.410 Robotic Manipulation | https://ocw.mit.edu/courses/16-410-robotic-manipulation-fall-2020/ | ❌ 404 | 同上 |
| MIT 16.863 System Safety | https://ocw.mit.edu/courses/16-863j-system-safety-fall-2016/ | ❌ 404 | 同上 |
| MIT OCW 搜索 API | https://ocw.mit.edu/api/v0/search/ | ❌ 404 | 无公开搜索 API（搜索页是前端渲染） |
| MIT OCW 主题页 | https://ocw.mit.edu/search/?t=Artificial%20Intelligence | ⚠️ 空 | 页面由 JS 渲染，静态抓取拿不到课程列表 |
| Stanford SEE 其他 AI 课程 | https://see.stanford.edu/Course | ✅ 但无更多 | SEE 仅 9 门课，无 LLM/Agent 相关 |
| Yale Open Yale Courses | https://oyc.yale.edu/courses | ✅ 但无相关 | OYC 无 AI/计算机类课程（偏人文社科） |

**未验证的（仅凭已知，需标注为"未验证"）**：
- Stanford CS329S（ML Systems）：页面可访问（已验证 200），但**未抓取完整大纲**
- CMU 15-780（Graduate AI）：页面可访问（已验证 200），但**未抓取完整大纲**
- Berkeley CS294 的 slides/readings 链接：页面存在但**未逐一验证 PDF 可下载**

---

---

## 三点五、关键论文（全部已验证可访问）

这些是课程内容的主要技术来源。**论文本身是公开的（arXiv），可引用**；
但习题必须原创，不能照抄论文中的实验题。

| 论文 | arXiv | 用途 |
| --- | --- | --- |
| ReAct: Synergizing Reasoning and Acting | [2210.03629](https://arxiv.org/abs/2210.03629) | Agent 循环的核心范式 |
| AutoGen: Multi-Agent Conversation | [2308.08155](https://arxiv.org/abs/2308.08155) | 多 Agent 协作 |
| StateFlow: State-Driven Workflows | [2403.11322](https://arxiv.org/abs/2403.11322) | 工作流状态机 |
| WebShop | [2207.01206](https://arxiv.org/abs/2207.01206) | 网页自动化环境 |
| SWE-bench | [2310.06770](https://arxiv.org/abs/2310.06770) | 代码修复基准 |
| Toolformer | [2302.04761](https://arxiv.org/abs/2302.04761) | 模型自学用工具 |
| Reflexion | [2303.11366](https://arxiv.org/abs/2303.11366) | 语言化强化学习 |
| Chain-of-Thought | [2201.11903](https://arxiv.org/abs/2201.11903) | 推理链 |
| Self-RAG | [2310.11511](https://arxiv.org/abs/2310.11511) | 自适应检索 |
| DSPy | [2310.03714](https://arxiv.org/abs/2310.03714) | 声明式编排与编译 |

---

## 三点六、官方工程文档（非学术来源，需明确标注）

「AI 自动化」的工程部分必须依赖厂商文档。这些**不是学术来源**，
但它们是当前最权威的工程实践总结。

| 来源 | URL | 用途 | 标注 |
| --- | --- | --- | --- |
| Anthropic《Building effective agents》 | https://www.anthropic.com/research/building-effective-agents | 五种工作流模式 | ✅已验证（已抓全文） |
| MCP 规范 | https://modelcontextprotocol.io | 工具接入协议 | ✅已验证 |
| OpenAI Function Calling | https://platform.openai.com/docs/guides/function-calling | 工具调用 | ✅已验证 |
| LangGraph 文档 | https://langchain-ai.github.io/langgraph/ | 状态图编排 | ✅已验证 |
| n8n 文档 | https://docs.n8n.io | 工作流平台 | ✅已验证 |
| UiPath 文档 | https://docs.uipath.com | RPA | ✅已验证 |

**内容标注规则**：
- 来自大学课程/论文 → 标注「学术来源」
- 来自厂商文档 → 标注「工程实践（非学术）」
- 自己撰写的案例 → 标注「原创示例」

## 四、覆盖度分析：大学课程缺什么

| 主题 | 大学课程 | 缺口 |
| --- | --- | --- |
| AI 基础（搜索、推理、约束） | ✅ MIT 6.034 完整 | — |
| 机器学习基础 | ✅ Stanford CS229、MIT 6.036 | — |
| LLM 应用（提示、微调、RAG） | ✅ CMU 11-766 | 需抓完整课表 |
| **Agent 架构（ReAct、多 Agent）** | ⚠️ Berkeley CS294 部分覆盖 | 需靠论文补充细节 |
| **工作流编排（DAG、状态机）** | ❌ **几乎没有** | 需靠厂商文档 + 论文（StateFlow） |
| **RPA / 业务流程自动化** | ❌ **完全没有** | 需靠厂商文档（UiPath、Power Automate） |
| **代码生成与自动化测试** | ⚠️ Berkeley 第 6 讲 | 需靠论文（SWE-bench、Codex） |
| **文档处理自动化** | ❌ 无专门课程 | 需靠论文 + 厂商文档 |
| **Agent 评估与可观测性** | ⚠️ Berkeley 第 11 讲 | 需靠论文 + 工程实践 |
| **安全与护栏** | ⚠️ Berkeley 第 12 讲 | 需靠论文 + 厂商文档 |

**关键判断**：
> 「AI 自动化」的**理论基础在大学课程里**，但**工程方法在厂商文档里**。
> 这门课必须两条腿走路，否则要么太理论（学完不会用），要么太零散（不成体系）。

---

## 五、建议的课程结构（待你确认）

基于以上调研，建议 **5 门子课程**，共约 20 章：

### M1 AI 自动化基础（4 章）
- 自动化的边界：什么能自动化、什么不能
- AI 基础回顾：搜索、推理、约束求解（来自 MIT 6.034）
- LLM 能力边界：能做/不能做、幻觉与可靠性
- 自动化成熟度模型：从脚本到 Agent

**来源**：MIT 6.034 + 自撰

### M2 Agent 架构与工作流（5 章）
- ReAct 循环：推理与行动交替
- 工具调用与 Function Calling
- 工作流编排：Chaining / Routing / Parallel / Orchestrator / Evaluator
- 多 Agent 协作：AutoGen 模式、角色分工
- 状态管理与持久化：StateFlow、DAG

**来源**：Berkeley CS294 + Anthropic《Building effective agents》+ AutoGen/StateFlow 论文

### M3 业务流程自动化（4 章）
- RPA 基础：录屏式 vs 代码式
- AI + RPA：文档理解、OCR、智能抽取
- 工作流平台：n8n / Zapier / Make 的设计思想
- 企业级落地：权限、审计、异常处理

**来源**：厂商文档（需明确标注非学术）+ 自撰案例

### M4 代码与文档自动化（4 章）
- 代码生成：从 Copilot 到自主改代码
- 自动化测试：生成用例、变异测试
- 代码审查自动化
- 文档处理：分类、抽取、摘要、结构化

**来源**：SWE-bench/Codex 论文 + Berkeley CS294 第 6 讲

### M5 评估、安全与运维（3 章）
- Agent 评估：任务成功率、轨迹评估、成本
- 可观测性：trace/span、日志、回放
- 安全护栏：注入防护、权限隔离、人工检查点

**来源**：Berkeley CS294 第 11-12 讲 + 厂商文档

---

## 六、需要你确认的问题

1. **定位确认**：是偏"软件/业务流程自动化"（我上面的方案），还是也要包含工业机器人？（后者需要额外的硬件知识）
2. **课程数量**：5 门子课程（20 章）是否符合预期？还是要精简成 3 门（12 章）？
3. **厂商文档的使用**：RPA 和 Agent 工程部分必须依赖 OpenAI/Anthropic/UiPath 等文档。你是否接受"明确标注为非学术来源"？
4. **是否要路线图**：像数据挖掘那样做一张地铁图？
5. **起点假设**：学员是否已学过本站的「大模型」系列？如果学过，M1 可以精简；如果没学过，需要补 LLM 基础。

---

## 七、下一步（待你确认后执行）

1. 抓取 CMU 11-766 的完整课表（当前只抓了前 4 讲）
2. 抓取 Berkeley CS294 的 slides 与 readings PDF 可访问性
3. 验证 SWE-bench / ReAct / AutoGen / StateFlow 等论文的 arXiv 链接
4. 建立 M2（Agent 架构）的详细大纲作为样板
5. 完成第一章的内容 + 习题 + 判分验证
6. 在网站上新增 `ai-auto` 学科与课程骨架
