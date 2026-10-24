# CS146S Fall 2026 课程建设设计文档

> 课程：CS146S Fall 2026 — The Modern Software Developer（现代软件开发者：AI 原生软件工程与编程智能体）
> 本文档是全部内容生产（自写 + 子代理批次）的唯一规格依据。改动需同步更新本文件。

## 0. 官方资料核实结论（2026-10-24 核验）

| 资料 | 结论 | 用法 |
| --- | --- | --- |
| [官方课程站 themodernsoftware.dev](https://themodernsoftware.dev) | 真实存在；课程描述明确列出 AI-native 软件开发、MCP、agent skills、spec-driven development、agentic/loop-based workflows | 课程定位、术语、章节骨架依据 |
| [官方作业仓库 mihail911/modern-software-dev-assignments](https://github.com/mihail911/modern-software-dev-assignments) | 真实存在；README 自述 Fall 2026；Python 3.12 + Poetry；含 week1…weekN assignment.md/writeup.md | 各周"官方作业"小节的依据；我们自研项目须标注"参照官方作业主题自主设计" |
| [Stanford Bulletin CS146S 条目](https://bulletin.stanford.edu/courses/2274401) | 真实存在（The Modern Software Developer，School of Engineering） | 先修、学分表述 |
| 十周主题（官方 syllabus + [第三方逐周笔记](https://www.heyuan110.com/posts/ai/2026-02-24-stanford-cs146s-overview)交叉核验） | Fall 2026：Sep 22 – Dec 3，Tue/Thu；授课 Mihail Eric；评分 Final Project 80% / Weekly Assignments 15% / Participation 5% | 章节顺序严格对应 |
| 官方阅读材料（Karpathy "Deep Dive into LLMs"、Google Prompt Engineering Overview、OpenAI Codex paper、MCP 官方文档、"Specs Are the New Source Code"、"How Long Contexts Fail"、Anthropic Claude Code 最佳实践、OWASP Top 10、Semgrep 研究、Google SRE 等） | 均为公开可靠来源 | 各节"参考资料"模块；标注与知识点的对应关系 |
| **诚实性红线** | 2026 年讲义 PDF/视频未完整公开；本课程是"以官方大纲为骨架的大学教材级自学课程"，**不是**官方讲义转录 | 课程/章节描述中必须写明"参照 Stanford CS146S Fall 2026 官方大纲组织，讲义内容为自主扩展编写"；自研项目标注"自主设计" |

## 1. 课程元信息与注册

- 课程 id：`cs146s`；domainId：`ai-native`（新学科域「AI 原生软件工程」，icon `🧑‍💻`，color `#8C1515`，order 10）；seriesId：`cs146s`。
- 注册位置（TS 源课）：`src/content/courses.ts` 末尾新增 `cs146sCourse = build({...}, cs146sChapters)`，加入 `COURSES` 数组；域同时写入 `src/store/contentStore.ts` 的 `DEFAULT_DOMAINS` 与 `content-data/domains.json`。
- 同步：改完 TS 必须 `pnpm run sync`（会覆盖 content-data/courses/cs146s.json）。
- prerequisites：`['python-engineering-practices']`；estimatedHours：45；targetAudience：已会 Python/Git、想掌握 AI 原生工作流的工程师与高年级学生。

## 2. 章节结构（严格映射官方 10 周 + 毕业项目）

| 章 id | 官方周 | 标题 | 小节数 | 核心官方阅读/作业锚点 |
| --- | --- | --- | --- | --- |
| cs146s-w1 | Week 1 | LLM 与 AI 编程基础 | 5 | Karpathy Deep Dive into LLMs；Google Prompt Engineering Overview；OpenAI Codex paper；官方作业 LLM Prompting Playground |
| cs146s-w2 | Week 2 | Coding Agent 解剖学 | 6 | Anthropic agent 构建指南；MCP 官方文档（intro/auth/SDK）；官方作业 Build an MCP Server；**项目 A、项目 C** |
| cs146s-w3 | Week 3 | AI IDE 与上下文工程 | 6 | "Specs Are the New Source Code"；"How Long Contexts Fail"（含 39% context-conflict 数据）；Anthropic 工具设计指南；官方作业 Design Doc；**项目 B** |
| cs146s-w4 | Week 4 | Coding Agent 协作模式 | 6 | Anthropic Claude Code 最佳实践/内幕；"Good Context Good Code"；autonomy levels；官方作业 Agent Manager；**项目 A 收口** |
| cs146s-w5 | Week 5 | 现代终端与 Agent 自动化 | 5 | Warp 文档/案例；CLI 自动化与脚本化；官方作业 agentic dev task |
| cs146s-w6 | Week 6 | AI 测试与安全 | 6 | OWASP Top 10；Copilot RCE prompt-injection CVE；Semgrep 大仓库研究（46 漏洞、14% 真阳）；Context Rot；官方作业 secure coding；**项目 D** |
| cs146s-w7 | Week 7 | 代码审查与调试支持 | 5 | "Code Reviews: Just Do It"；GitHub code review 指南；AI-assisted review 论文；官方作业 review AI code；**项目 D 收口** |
| cs146s-w8 | Week 8 | 自动化应用构建 | 5 | v0/Vercel 官方文档；design tokens；多栈对比方法；官方作业 multi-stack web apps |
| cs146s-w9 | Week 9 | 部署后运维与可观测性 | 5 | Google SRE（golden signals、alerting）；Observability Basics（logs/metrics/traces）；Resolve AI agentic DevOps 系列 |
| cs146s-w10 | Week 10 | AI 软件工程的未来 | 4 | 行业趋势综述；角色演进；官方 final project 导引 |
| cs146s-final | 毕业项目 | Software Factory 原型 | 5 | 官方 Final Project（占分 80%）对应；**项目 E** 全规格 |

小节 id 规则：`cs146s-w{章号}-l{序号}`（毕业项目章用 `cs146s-final-l{序号}`）；习题 id：对应小节 id 加 `-e{序号}`。

## 3. 单节内容模板（13 模块，缺一不可 —— depth-audit A 级硬要求）

每节 `content`（TS 模板字符串）按以下顺序组织模块，各模块用 `## ` 二级标题（审计用正则匹配标题/关键词，括号内为匹配锚点，标题措辞可变化但须包含锚点词）：

1. `### 学习目标`（锚点：学习目标）— 3 条可观察行为动词目标（区分/设计/评审…），对应 competency-unpacker 的 observable indicators。
2. `### 前置知识`（锚点：前置知识）— 指向本课早前小节或先修课。
3. `### 问题背景`（锚点：问题背景）— 为什么工业界需要它，失败路径。
4. `### 直觉理解`（锚点：直觉理解）— 类比先行（打比方/形象）。
5. `### 核心概念与原理详解`（锚点：核心概念）— 严格定义 + 机制拆解；关键术语给中英文对照表（Tier 3 术语表）。
6. `## 架构/机制图解` — **每节至少 1 个交互图**（`<Diagram type="…" />`，可用 kind 见 §4）或至少 2 个 ASCII/表格图。
7. `### 完整案例`（锚点：案例）— 完整 worked example：真实场景逐步走通（含每步"为什么这样做"的自解释提示，对应 worked-example-fading 方法）。
8. `### 代码实践` — 可运行代码块 + `demos`（lang: python 可在 Pyodide 跑；text 用于 CLI/提示词展示）。
9. `### 常见误区与安全风险`（锚点：误区）— ≥3 条，含边界条件与提示词注入等安全面。
10. `### 与其他知识点的关联`（锚点：知识关联）— 承上启下：依赖哪些小节、被哪些小节使用。
11. `### 本节总结`（锚点：总结）— 要点回顾（3-5 条）。
12. `### 参考资料与延伸阅读`（锚点：参考）— 每条注明"对应本节哪个模块"，官方资料优先。
13. `### 动手实验` — 1 个可在本平台 demos 中运行的实验任务 + 验收标准。

篇幅硬线：每节 ≥ 3000 字符（A 级满分线），`difficulty` 按内容真实难度定 1-5。
`tips`：每节 ≥ 3 条（pitfall/leak/interview/performance/note 混合）。`demos`：每节 ≥ 1（代码节用 python，概念节可用 text 展示提示词/CLI 会话）。

## 4. 交互图（Cs146sDiagrams.tsx，新组件 kind 注册进 DiagramRenderer）

| kind | 名称 | 用于 |
| --- | --- | --- |
| `agentloop` | Agent 感知-规划-执行-反馈循环（步进演示） | w2 |
| `contextwindow` | 上下文预算堆叠（系统提示/工具/文件/历史，滑杆演示压缩策略） | w1, w3 |
| `mcphandshake` | Host↔Client↔Server MCP 握手与工具调用时序 | w2 |
| `specflow` | PRD→Spec→Plan→Tasks→Execute→Verify 规范流 | w3 |
| `autonomyladder` | L0-L4 自治等级互动滑杆 | w4 |
| `permmodes` | 权限模式与沙箱边界矩阵 | w6 |
| `reviewpipe` | 测试→审查→安全扫描流水线（点击各站看产出） | w6, w7 |
| `factoryloop` | Software Factory：构建→验证→度量→改进闭环 | cs146s-final |

通用兜底：`flow`（流程图）、`arch`、`statemachine`、`react`（agent loop）、`injection`、`permmatrix`、`toolflow` 等既有 kind 可直接复用。图组件写法参照 `AiAutoDiagrams.tsx`（内联 SVG+CSS、零依赖、支持主题色变量）。

## 5. 习题体系（practice-problem-sequence-designer 方法 + 平台难度约定）

- 每节按 difficulty 决定题量：1→6，2→8，3→10，4→13，5→16 题；章节内题量均摊 ≥ 3 题/节（审计线）。
- 近迁移→远迁移阶梯：基础（difficulty 1-2，与示例同构）→ 中级（3，换表层特征）→ 高级（4，组合先前技能）→ 挑战（5，远迁移/开放设计）。
- 题型覆盖：`single`/`judge`/`fill`（事实与代码补全，对应 KUD 的 Know）、`multiple`（概念辨析，Understand）、`code`（Pyodide 可判分 Python，Do）、`open`（案例设计+rubric 逐条自评，Do/远迁移）。本课程不使用 `sql` 题型。
- `open` 题必须给 `rubric`（≥4 条，每条带分数）+ `referenceAnswer`（含推理过程与验收标准）；`code` 题 `tests` 用 assert，`allowedModules` 最小化。
- KUD 分型标注：每题 `tags` 含 `K`/`U`/`D` 之一 + 知识点标签（如 `mcp`、`context`、`security`）。

## 6. 实践项目 A-E（渐进式，全 Python，python-fullstack-engineer 规范）

| 项目 | 章锚 | 一句话 | 交付物 |
| --- | --- | --- | --- |
| A 简化版 Coding Agent | w4 | 纯 Python 实现 agent loop：工具调用、上下文管理、预算控制 | `mini-agent/`：agent.py + tools + pytest |
| B 规格驱动仓库改造 | w3 | 为真实仓库写 PRD/规格/实施计划 + 自动验收脚本 | spec.md + plan + acceptance 脚本 |
| C MCP 集成与权限管控 | w2 | 实现 MCP server（stdio）+ 白名单/确认/审计日志三层权限 | `mcp-server/` + 权限层 + 测试 |
| D AI 代码安全流水线 | w6→w7 | 测试生成→静态扫描→审查清单→报告 的 CI 流水线 | `ai-code-gate/` + GitHub Actions 配置 |
| E Software Factory 原型 | cs146s-final | 任务队列→Agent 执行→验证→报告 的可持续生产系统 | `factory/` + 运行报告样例 |

每个项目一节完整规格课：需求说明、技术设计（含图）、实现步骤、测试用例、常见故障排查表、完成标准（Definition of Done）、拓展任务。

## 7. 转义与工程红线（记忆教训，违者打回）

1. TS 模板字符串内：反引号写 `` \` ``、`${` 写 `\${`、LaTeX 双反斜杠 `\\frac`。
2. **禁止 heredoc**：生成文件一律用 Write 工具整文件写出。
3. `tips`/`demos` 必须是数组（不是字符串）——写完必须跑全站扫描。
4. 每章一个文件 `src/content/chapters/cs146s/ch{N}.ts`，导出 `cs146sW{N}Chapters: Omit<Chapter, 'courseId' | 'order'>[]`；`src/content/chapters/cs146s/index.ts` 汇总导出 `cs146sChapters`。
5. 写完章节文件先跑 `node scripts/check_tpl.py`（模板括号/转义检查）与 `pnpm run typecheck`。
6. 代码示例中 Python 代码块标 ```python；CLI/提示词展示用 ```text；JSON 用 ```json。demo.lang 只能是 python/sql/text。

## 8. 验证流水线（每章落地后必跑）

```
node scripts/check_tpl.py            # TS 模板检查
pnpm run typecheck                    # 类型检查
pnpm run sync                         # TS → content-data/courses/cs146s.json
pnpm run audit                        # 内容审计（id 重复/字段完整性）
node scripts/depth-audit.mjs          # 深度审计，目标全 A
node scripts/scan_tips_arrays.py      # tips/demos 数组不变量（若无此脚本用 batch39 方式内联扫描）
pnpm run verify:sql                   # 判分引擎回归（应无新增失败）
渲染抽查：pnpm run dev 起服务后用 e2e 脚本打开 cs146s 章节页截图/断言
```

## 9. 内容生产批次

- 批次 C1（自写·质量基准）：设计文档 + 域/课程注册 + 图组件 + w1 全章。
- 批次 C2（子代理）：w2、w3（含项目 C、B、A 规格起步）。
- 批次 C3（子代理）：w4、w5（项目 A 收口）。
- 批次 C4（子代理）：w6、w7（项目 D）。
- 批次 C5（子代理）：w8、w9、w10。
- 批次 C6（子代理）：cs146s-final（项目 E）+ 资料索引页。
- 每批落地后：验证流水线 → 修复 → git commit。
