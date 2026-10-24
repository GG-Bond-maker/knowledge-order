# CS146S 课程资料来源索引

> 维护规则：所有章节的"参考资料"模块必须能对应到本索引；新增来源先登记 here 再进章节。
> 核验日期：2026-10-24。链接有效性随批次验证，失效链接在"后续完善清单"处理。

## 一、官方课程资料（结构依据，最高优先级）

| 来源 | 链接 | 用途 | 核验状态 |
| --- | --- | --- | --- |
| CS146S 官方课程站 | https://themodernsoftware.dev | 课程描述、十周主题、评分（Final 80%/作业 15%/参与 5%） | ✅ 2026-10-24 |
| 官方作业仓库（mihail911/modern-software-dev-assignments） | https://github.com/mihail911/modern-software-dev-assignments | 各周作业形态锚点（week1 Prompting Playground、week2 MCP Server 等）；Python 3.12 + Poetry | ✅ 2026-10-24 |
| Stanford Bulletin 条目 | https://bulletin.stanford.edu/courses/2274401 | 学分/先修/开课单位 | ✅ 2026-10-24（经搜索摘要核验） |
| Stanford CS 秋季课表 | https://www.cs.stanford.edu/academics-courses-schedule-autumn-quarter | 授课时间（Tue/Thu） | ✅ 2026-10-24（经搜索摘要核验） |

## 二、官方指定阅读（各周 reading，内容依据）

| 阅读材料 | 对应周 | 链接/获取 |
| --- | --- | --- |
| Karpathy《Deep Dive into LLMs like ChatGPT》（2025 视频） | W1 | YouTube（Karpathy 频道） |
| Google《Prompt Engineering Overview》（2025 白皮书） | W1 | Google 官网/Kaggle 白皮书页 |
| OpenAI Codex 报告 | W1 | openai.com/index/introducing-codex |
| MCP 官方文档（intro/architecture/tools/authorization/SDK） | W2 | https://modelcontextprotocol.io |
| Anthropic《Building effective agents》 | W2 | https://www.anthropic.com/research/building-effective-agents |
| "APIs don't necessarily make good MCP tools"（反思文章） | W2 | 官方 W2 阅读清单 |
| 《Specs Are the New Source Code》 | W3 | 官方 W3 阅读清单 |
| 《How Long Contexts Fail》（含 39% context-conflict 数据） | W3 | 官方 W3 阅读清单 |
| 《Getting AI to Work In Complex Codebases》 | W3 | 官方 W3 阅读清单 |
| Anthropic《Writing effective tools for agents》（工具设计指南） | W3 | anthropic.com/engineering |
| Anthropic《Claude Code best practices》 | W4 | anthropic.com/engineering/claude-code-best-practices |
| Anthropic《How we built our multi-agent research system》 | W4 | anthropic.com/engineering |
| 《Good Context Good Code》（2.5x 生产力案例） | W4 | 官方 W4 阅读清单 |
| Warp University / Warp vs Claude Code 对比 / Warp dogfooding 案例 | W5 | warp.dev 官方文档与博客 |
| OWASP Top 10（2021 Web 版与 LLM 应用版） | W6 | https://owasp.org/Top10 与 owasp.org/www-project-top-10-for-large-language-model-applications |
| GitHub Copilot CLI 提示词注入 RCE（真实 CVE 案例报道） | W6 | 官方 W6 阅读清单引用的安全研究 |
| Semgrep：11 个大型仓库 AI 代码审计研究（46 漏洞、14% 真阳/86% 误报） | W6 | semgrep.dev 博客 |
| Context Rot 研究（Chroma, 2025） | W6 | research.trychroma.com/context-rot |
| 《Code Reviews: Just Do It》/ GitHub《How to Review Code Effectively》 | W7 | 官方 W7 阅读清单 |
| AI-assisted code review 学术论文 | W7 | 官方 W7 阅读清单 |
| v0 / Vercel AI 官方文档 | W8 | https://v0.dev 与 vercel.com/docs |
| Google《Site Reliability Engineering》在线版 | W9 | https://sre.google/sre-book/table-of-contents |
| 《Observability Basics》（logs/metrics/traces） | W9 | 官方 W9 阅读清单 |
| Resolve AI：agentic Kubernetes/DevOps 系列 | W9 | 官方 W9 嘉宾公司博客 |
| Martin Casado / a16z 关于 AI 软件工程的观点文章 | W10 | a16z.com |

## 三、学术与经典补充（自主扩展的依据）

| 材料 | 对应内容 |
| --- | --- |
| ReAct: Synergizing Reasoning and Acting in LLMs（arXiv:2210.03629） | w2-l1 Agent 循环 |
| Lost in the Middle（arXiv:2407.03158） | w1-l4 / w3-l5 上下文位置效应 |
| Jurafsky & Manning《Speech and Language Processing》v3（tokenization 章） | w1-l2 BPE |
| Anthropic《Effective context engineering for AI agents》 | w3-l1/l5 |
| 《The Bitter Lesson》对比讨论（Sutton） | w10 趋势讨论 |

## 四、诚实性声明（课程页与章节页固定文案）

1. 本课程是**以 Stanford CS146S Fall 2026 官方大纲为骨架的教材级自学课程**，由本平台自主编写；不是官方讲义的转录，也未获斯坦福认可。
2. 官方作业仅作为各周"官方作业锚点"出现（作业主题与形态），本课程的练习与项目 A-E 均为**自主设计**，并在各节"参考资料"模块标注。
3. 2026 年秋季的讲义 PDF/视频未完整公开；凡引用官方来源均给出链接，凡自主扩展均明确标注。不允许出现"官方第 N 讲说……"这类无法核实的转述。

## 五、链接核验记录

| 日期 | 范围 | 结果 |
| --- | --- | --- |
| 2026-10-24 | 官方课程站/作业仓库/Bulletin/课表 | 全部可达（作业仓库 raw 直连不稳定，经 API 与搜索摘要交叉核验） |
