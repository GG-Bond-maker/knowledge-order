import type { Chapter } from '../../../types';

/* ============================================================
 *  CS146S Fall 2026 · 毕业项目章（下）：项目 E 全规格 与 结课
 *
 *  结构依据：Stanford CS146S Fall 2026 官方大纲（themodernsoftware.dev，
 *  官方作业仓库 mihail911/modern-software-dev-assignments）。
 *  本课程为参照官方大纲组织的自学教材，讲义内容为自主扩展编写。
 *
 *  来源：
 *  - 官方：Final Project（占总评 80%）叙事（主题锚点，项目 E 为自主设计）
 *  - 内部交叉引用：w4b-l6 项目 A、w3b-l6 项目 B、w2b-l6 项目 C、
 *    w6b-l6 项目 D、w9b-l5 运维原型、final-l1~l3 工厂架构三节
 *  - 原创：项目 E 全规格、能力自查器、全部习题与 demo
 * ============================================================ */

export const cs146sFinalExtraChapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'cs146s-final-c2',
    title: '毕业项目（续）· 项目 E 实施与结课',
    goal: '完成项目 E——Software Factory 原型的全规格实施（需求、架构、13 步实现、12 条测试、排查表、DoD、拓展），然后结课：带走十周能力地图与工厂思维的三个带走物，把工厂带回你自己的工作。',
    lessons: [
      /* ─────────────────────────── l4 ─────────────────────────── */
      {
        id: 'cs146s-finalb-l4',
        title: '项目 E 规格：工厂原型的完整实施（实践项目）',
        difficulty: 5,
        content: `
### 学习目标

学完本节并完成项目，你应该能够：
1. 完整说出项目 E 的需求、六模块架构与每个模块复用的前序项目积木，并解释「l1 的概念架构」与「本节的实现架构」之间的差异；
2. 按 13 步实现顺序搭建纯标准库的工厂原型：工单 schema → 队列（幂等/依赖）→ 执行适配器（包项目 A 的 agent）→ 验证适配器（包项目 D 的门禁）→ 编排循环 → 指标 → 报告 → 三个演练工单端到端 → 失败注入测试；
3. 用 12 条验收用例与故障排查表自证工厂「真的能转」——正常流转、失败重试、转人工、熔断、注入拦截、报告完整性全部有测试背书。

### 前置知识

- cs146s-final-l1~l3：五层架构、工单 schema、编排循环——本项目是三节的代码化收口；
- w4b-l6：项目 A 的 mini-agent——执行适配器的内核（FakeLLM 脚本协议原样复用）；
- w3b-l6：项目 B 的 Spec 与验收脚本格式——工单 acceptance 与验证适配器的写法来源；
- w6b-l6：项目 D 的 finding 模型与门禁分级——验证适配器的内核；
- w9b-l5：最小运维原型四组件——metrics.py 的内核；
- Python：字典、dataclass、json、pathlib、pytest 基本用法。

### 问题背景

官方课程用占总评 80% 的 Final Project 传达一个立场：**衡量你的是建成了什么**。前四个项目给了你零件——A 造了工人、B 定了订单格式、C 装了门禁、D 建了质检线、w9 画了仪表盘——但零件不会自动变成工厂。项目 E 是本课程的收官之作：**把这些零件装配成一个可持续生产的系统**，并且像前四个项目一样，用测试证明它真的在转。

**项目 E 为参照官方 Final Project 主题的自主设计**（非官方作业转录）：官方作业给出的是主题与自由度，本节规格给出的是可执行的工程路径——两者方向一致，具体要求以官方仓库 assignment.md 为准。

### 直觉理解

项目 E = 把前四个项目的仓库**接上传送带**：

- 项目 A 的 mini-agent 原来是「你按一次按钮跑一次」的机床——适配器把它变成**通电就干活**的机床；
- 项目 B 的 Spec 原来是「一次工程的完整方案」——工单系统把它切成**流水线上的一张张订单**；
- 项目 D 的流水线原来是「一次 PR 的质检」——验证适配器让它变成**每张订单出厂前的例检**；
- w9 的运维原型原来是「看一个服务的仪表盘」——metrics.py 让它变成**看整条产线的仪表盘**。

装配工的工作不是发明新机器，而是**把已有机器的接口对齐**：执行适配器包住 agent、验证适配器包住门禁、工单 schema 对齐 Spec 格式——这就是本项目 80% 的代码。剩下 20%（队列与编排循环）是本课程最后要教的新东西，也是你在 l3 已经预演过的。

### 核心概念与原理详解

## 项目 E 总览与自主设计声明

- **一句话**：纯 Python 标准库实现 Software Factory 原型——提交 3 张工单（给样例仓库加函数 / 修 bug / 更新文档），工厂自动执行、自动验证，输出一份含三指标的运行报告。
- **交付物**：\`factory/\` 目录——queue.py、spec.py、orchestrator.py、validator.py、metrics.py、report.py 六模块 + tests/ 系统测试 ≥12 条 + README（含运行示例与一份真实运行报告样例）。
- **自主设计声明**：本项目参照官方 Final Project 主题自主设计；规格、代码骨架、测试与演练工单均为原创教学设计，官方作业要求以官方仓库为准。

## 模块一 · 需求说明

| id | 需求 | 验收口径 |
| --- | --- | --- |
| FR1 | 工单 schema 校验：六必需字段 + id 前缀 + 预算为正，一次报出全部错误 | 合法工单零错误；坏工单错误列表完整且顺序稳定 |
| FR2 | 队列：优先级 + 依赖拓扑序 + 幂等键去重，成环显式报错 | 依赖先于被依赖；重复提交只执行一次；环报 ValueError |
| FR3 | 执行适配器：包装项目 A 的 agent（FakeLLM 脚本协议），每工单独立 VFS 工作区 | 同一 agent 内核可被多工单顺序驱动；工作区互不可见 |
| FR4 | 验证适配器：包装项目 D 的门禁（finding 模型），折叠为 pass/fail/needs-human 三态 | critical → fail；缺站 → needs-human；全绿 → pass |
| FR5 | 编排循环：取单→装配→执行→验证→失败处理链（重试→降级→人工）→汇总 | l3 的五步与失败链全部有测试路径 |
| FR6 | 熔断：连续 fail 阈值（默认 3）触发暂停 + skipped 标记 + 告警事件 | 触发/恢复各有测试；skipped 工单可重新入队 |
| FR7 | 指标与报告：三指标（一次通过率/返工率/成本）+ 工单明细 + 熔断记录 | 空运行报告 verdict=empty；报告字段完整性有测试 |
| FR8 | 端到端：3 张演练工单（加函数/修 bug/更新文档）自动跑完并出报告 | 一条命令复现全流程，报告与 demo 输出一致 |

**非目标**（防「顺手扩展」）：不做 Web 界面（拓展任务 1）；不接真实 LLM API（拓展任务 2）；不做进程级隔离（文件级工作区足够）；不做持久化数据库（JSONL 与内存即可）；不做分布式队列。

## 模块二 · 技术设计

<Diagram type="factoryloop" />

**与 l1 的差异**：l1 的同一张图是**概念架构**（五层职责与闭环关系，回答「工厂是什么」）；本节的图是**实现架构**（回答「代码怎么组织」）——每一层落成一个具体模块，每个模块标注它复用的前序项目：

| 模块 | 职责 | 复用的前序积木 | 不负责 |
| --- | --- | --- | --- |
| spec.py | 工单 dataclass、schema 校验、上下文装配 | 项目 B 的 Spec/AC 格式（w3b-l6） | 执行与调度 |
| queue.py | 优先级/依赖/幂等键、拓扑排序、成环检测 | l2 的队列语义（新写的唯一「大件」） | 判定与执行 |
| orchestrator.py | 主循环五步、失败处理链、熔断器 | 项目 A 的执行循环骨架（w4b-l6） | 门禁规则 |
| validator.py | 验证适配器：五站折叠为三态、finding 汇总 | 项目 D 的 finding/门禁模型（w6b-l6） | 执行逻辑 |
| metrics.py | 指标注册表、滑动窗口、事件日志 | w9b-l5 的 MetricRegistry/IncidentLog | 业务判定 |
| report.py | 运行报告渲染（JSON + Markdown）、完整性校验 | 项目 B 的验收报告形态（w3b-l6） | 数据采集 |

三个关键设计决策：① **适配器模式贯穿全局**——agent 与门禁都是「被包装的原有内核」，工厂代码不侵入前序项目（内核升级时工厂不动）；② **FakeLLM 剧本协议原样沿用**——可确定性测试是工厂可验收的前提（项目 A 的核心结论）；③ **队列是唯一全新模块**——它没有前序积木，所以它的测试最厚（拓扑序、成环、去重、优先级各一组）。

## 模块三 · 实现步骤（13 步）

1. **建骨架**：factory/ 六空模块 + tests/ + README + 样例仓库 sample/（一个 3 文件的迷你 Python 项目，演练工单的操作对象）；git init，工厂与样例仓库分仓（工单改的是样例，不是工厂自己）；
2. **spec.py 先行**：Ticket dataclass + validate_ticket（l2 e6 的函数进厂）+ 错误顺序测试；为什么 spec 先行？——它是其余所有模块的输入类型；
3. **spec.py 装配器**：build_context(ticket)——指令文件 + 相关文件 + AC 原文 + 禁区 + 重试回填五件套；测试断言装配产物的内容；
4. **queue.py 调度器**：幂等去重 + 依赖拓扑 + 优先级（l4 e6 的函数进厂）；成环测试与去重测试；
5. **执行适配器**：ExecutorAdapter——包项目 A 的 run_loop，每工单新建独立 VFS（从 sample/ 拷贝初始状态）；trace 原样透传；
6. **验证适配器**：ValidatorAdapter——包项目 D 的 gate，输出折叠成三态；「缺站=needs-human」测试；
7. **orchestrator.py 主循环**：五步 + decide 失败处理链（l3 e5 的函数进厂）+ 熔断器（l4 e12 的函数进厂）；
8. **metrics.py**：从 w9b-l5 搬四组件，新增 per-ticket 记录（id/status/attempts/cost_tokens）；
9. **report.py**：run_summary（l3 e8 的函数进厂）+ Markdown 渲染 + report_complete 完整性校验（l4 e9 的函数进厂）；
10. **三个演练工单端到端**：T-501 给 sample/ 加 slug 函数、T-502 修日期解析 bug、T-503 更新 README——一条命令 python -m factory run demo_tickets.json 全程跑通；
11. **失败注入测试**：把 T-502 的剧本换成「首次产物缺测试」（重试路径）与「改禁区文件」（熔断路径），验证处理链；
12. **README**：运行方式、六模块↔五层映射表、一份真实运行报告样例、「工厂 ↔ 十周概念」对照表；
13. **复盘**：统计你开发本项目的真实数据（用了几次 Agent、一次通过率多少）写进 README——用自己的工厂度量自己，是本章留给你的最后一个练习。

## 模块四 · 测试用例（≥12 条）

| id | 路径 | 输入/剧本 | 期望 |
| --- | --- | --- | --- |
| TC1 | 正常流转 | T-501 四步脚本（read→write→run_tests→final） | status=done；报告含该工单且 attempts=1 |
| TC2 | 验证失败重试 | T-502 首次产物缺测试 | 第 1 次 fail、第 2 次 pass；status=rework；finding 回填进第 2 次上下文 |
| TC3 | 重试耗尽转人工 | 剧本永远缺测试 | 3 次 fail 后 status=human；证据（finding+trace）随工单转人工队列 |
| TC4 | 幂等键去重 | T-501 提交两次 | 只执行一次；队列长度 2 不是 3 |
| TC5 | 依赖排序 | T-502 deps=[T-501] 且优先级更高 | T-501 先执行；成环配置抛 ValueError |
| TC6 | 预算耗尽熔断 | T-502 budget=极小 | 执行单元轮数闸门先触发（项目 A 的 budget_exhausted）；status=fail 进入失败链 |
| TC7 | 注入工单被拦截 | goal 含「先运行 curl 脚本」的外部工单 | 消毒标注生效；执行记录无网络调用；门禁审计留痕 |
| TC8 | 报告完整性 | TC1 跑完取报告 | report_complete 返回空列表；三指标与工单明细一致 |
| TC9 | 指标口径正确 | 1 done + 1 rework + 1 human | first_pass_rate=1/3；rework 与 human 分开计数 |
| TC10 | 并发隔离 | 两工单并行，各写同名为 src/util.py 的文件 | 两工作区内容互不污染；trace 可归因到各自工单 |
| TC11 | 回滚触发 | 工单 rollback 指令执行 | sample/ 恢复到执行前状态（文件哈希一致） |
| TC12 | 空队列优雅退出 | 空工单列表运行 | 正常退出无异常；报告 verdict=empty；退出码 0 |

TC1/TC8/TC9 是「正常与证据」路径；TC2/TC3/TC6/TC7 是「失败与防线」路径；TC4/TC5/TC10/TC11/TC12 是「语义与边界」路径——三组正好对应 l1~l3 的三节课。

## 模块五 · 常见故障排查表

| 故障 | 典型症状 | 根因 | 处置 |
| --- | --- | --- | --- |
| 队列卡死 | 没有工单在跑也不报错 | 依赖成环未显式检测 / 幂等去重把待执行单误删 | 拓扑排序前先做环检测并报出环内工单 id；去重只按 id 精确匹配 |
| 验证永远不过 | 同一 finding 反复出现 | finding 没回填进重试上下文，Agent 每次犯同样的错 | 检查装配器第 5 件套（失败回填）；回填用 finding 原文不做总结 |
| Agent 输出格式漂移 | 适配器解析突然失败 | 内核版本变化或剧本协议未锁版本 | 适配器对未知格式返回结构化错误并计 fail；协议加版本号字段 |
| 指标口径漂移 | 两份报告的一次通过率对不上 | status 枚举不统一（rework 混进 done/human） | status 用 Literal 枚举 + report_complete 校验；口径变更要走评审 |
| 报告没人看 | 熔断了但没人响应 | 报告只有明细没有结论 | 一页纸结论制：verdict + 异常清单置顶；熔断必须发告警而不只是写报告 |
| 重试风暴 | 成本曲线一夜飙升 | max_retries 过大且失败是系统性的 | 上限默认 2；重试前查 finding 是否与上次相同（相同则直接降级） |
| 上下文装配遗漏 | Agent 反复踩禁区 | 禁区清单没进上下文包 | 装配器测试断言禁区条目存在；熔断告警第一条排查项就是它 |
| 成本超预算 | 月度 token 账单超预期 | budget 校验只在某层生效（如只查了工单没查重试累计） | 预算口径 = 首次执行 + 全部重试；编排层统一扣减，不用执行层自报 |

## 模块六 · 完成标准（Definition of Done）

1. pytest 全绿，系统测试 ≥12 条（对应模块四 TC 编号）；
2. 纯标准库实现：除 pytest 外无任何第三方 import（grep import 逐个核对）；
3. 六模块职责互斥：adapter 不写门禁规则、queue 不做判定、metrics 不做业务判断；
4. 幂等键、依赖、优先级三条队列语义各有通过测试证明（TC4/TC5）；
5. 失败处理链完整：重试（含 finding 回填）→ 降级 → 人工三条路径各有测试（TC2/TC3）；
6. 熔断可触发、可恢复、skipped 工单可重新入队（TC6 与熔断专测）；
7. 注入工单被三道防线拦截且留审计痕迹（TC7）；
8. 报告字段完整性与三指标口径有测试背书（TC8/TC9），空运行 verdict=empty（TC12）；
9. 三个演练工单一键复现：python -m factory run demo_tickets.json 的输出与 README 样例一致；
10. README 含六模块↔五层映射表、真实报告样例、开发过程复盘数据（你自己的一次通过率）；
11. 工厂与样例仓库分仓：工厂的测试从不修改 factory/ 自身之外的仓库状态。

## 模块七 · 拓展任务

1. **Web 仪表盘**：用 Flask/FastAPI 给 metrics.py 加一个只读页面——队列深度、三指标趋势、熔断状态灯（w9 的仪表盘思维在工厂的落地）；
2. **多执行单元**：实现 RealLLMExecutor 接真实 API（成本统计复用 w1-l2 的 estimate_cost），并在 README 加「真实模式新增风险」一节（提示注入、费用失控、输出漂移）；
3. **工单模板库**：把三类演练工单抽象成模板（templates/fix-bug.json 等），新工单从模板派生——「Spec 复用」的工厂版，顺手解决「同类工单反复手写」的浪费；
4. **GitHub 集成**：执行层从「改 VFS」升级为「开分支→提交→自动开 PR→CI 结果回填门禁」，把工厂接入真实开源仓库的贡献流（注意贡献规范与频率礼仪）；
5. **五项目工具链开源**：把项目 A~E 整理成一条 README 串起来的工具链发布——agent 执行、spec 定义、mcp 权限、gate 验证、factory 编排，这就是一份可以直接写进简历的「AI 原生工程实践」作品集。

### 完整案例

TC2 的完整走查（T-502 修 bug，首次产物缺测试），逐步看「为什么」：

| 轮 | 动作 | 系统状态 | 为什么这一步 |
| --- | --- | --- | --- |
| 1 | 编排器取单 T-502 | 依赖 T-501 已完成，出队 | 依赖语义先于优先级（l2） |
| 2 | 装配上下文包 | 指令文件+相关文件+AC+禁区 | 装配器代码化，禁区必在包内 |
| 3 | 执行（第 1 次） | 产物改了 dates.py，无测试 | 剧本缺陷：忘了补测试 |
| 4 | 验证 | fail：「critical: 未提供测试结果」 | 门禁两站抓缺测试（项目 D 站 1） |
| 5 | 失败处理 | fail 计数 1 ≤ 2 → retry | finding 原文回填第 2 次上下文 |
| 6 | 执行（第 2 次） | 产物 + 回归测试 | Agent「知道」上一次缺什么 |
| 7 | 验证 | pass → status=rework | 返工不是 done：一次通过率要诚实 |
| 8 | 汇总 | metrics 记 attempts=2, cost 累计 | 返工成本进预算画像（w9-l2） |

看清楚了吗？第 5 步的 finding 回填是重试有意义的全部原因——没有它，第 6 步只是把同样的失败再买一遍。**运行报告里那格 rework，记录的正是验证层与回填机制联手救回来的一张工单。**

### 代码实践

下方演示是项目 E 的约 80 行可运行预览：幂等去重 + 依赖调度 + 执行/验证双适配器 + 重试 + 三指标报告，一条主路径走通。真实项目按模块三把 demo 拆成六个文件并补齐 12 条测试。先跑通它，再动手写正式版。

### 常见误区与安全风险

- **误区一：先写编排循环再补测试。** 编排循环的错误（重试不回填、熔断不归零、skipped 丢失）全是路径性的，事后补测很难补全。按模块三顺序 spec → queue → 适配器 → orchestrator，每步测试先行。
- **误区二：「把门禁写死在编排器里更省事。」** 验证逻辑一旦内联，缺站检测（TC 的 needs-human 路径）与规则热更新都没了——适配器多一层不是过度设计，是三态判定与门禁实现之间的解耦带。
- **误区三：「演练工单全绿才算成功。」** 恰恰相反——本项目的验收重点在 TC2/TC3/TC6/TC7 的失败路径。一个只会跑顺路的工厂是展示品，能被测试证明「失败时行为正确」的工厂才是工程。
- **安全提示**：① 工厂代码本身也要过项目 D 的流水线——能执行任意工单的系统是最高危系统，给它写门的代码更要有门；② 演练工单 T-502 的注入变体（TC7）必须保留在测试集里：删掉它的那天，就是防线开始腐烂的一天；③ README 与报告样例里不要出现真实密钥与内网地址——样例仓库越小越要当作会被公开来写。

### 知识关联：承上启下

- 承上：final-l1 五层架构（本节实现架构是它的代码投影）、final-l2 工单 schema 与失败链（spec.py/queue.py 的规格）、final-l3 编排五步与熔断（orchestrator.py 的规格）、项目 A（执行内核）、项目 B（Spec 格式与报告形态）、项目 C（权限三层，守「工厂宪法」）、项目 D（门禁内核）、w9b-l5（metrics 内核）；
- 启下：l5 结课——「工厂思维」三个带走物的第一件「一切任务皆工单」直接来自本节的 spec.py；拓展任务 4/5 通向真实开源贡献与作品集；官方 Final Project 的提交物参照官方仓库要求组装，本项目 E 是它的自主设计实现底座。

### 动手实验

1. 运行下方预览 demo，找到幂等去重、依赖调度、重试、三指标四段代码的位置——它们分别对应 final-l2/l3 的哪个概念？
2. 把 demo 的 TICKETS 改成两张互相依赖的工单再改成环（A 依赖 B、B 依赖 A），观察 ValueError；然后按模块三第 1-4 步建好骨架，本周把 spec.py 与 queue.py 带测试写完。

### 本节总结

1. 项目 E = 六模块纯标准库工厂：spec / queue / orchestrator / validator / metrics / report——四个模块是前序项目的适配器，队列是唯一新大件；
2. 13 步实现顺序的原则：输入类型先行（spec）、适配器包内核不侵入、编排循环最后装配；
3. 12 条测试分三组：正常与证据、失败与防线、语义与边界——失败路径的权重高于成功路径；
4. DoD 第 10 条是灵魂：用自己的工厂度量自己的开发过程，把复盘数据写进 README；
5. 拓展任务 5（五项目工具链开源）把课程全部产出收拢成一份作品集——这就是 Final Project 80% 想看到的「建成物」。

### 参考资料与延伸阅读

- [Stanford CS146S 官方课程站](https://themodernsoftware.dev)——Final Project 占总评 80% 与自主设计要求：对应本节「问题背景」模块；
- [官方作业仓库 mihail911/modern-software-dev-assignments](https://github.com/mihail911/modern-software-dev-assignments)——final project 官方要求（提交形态与评价维度以官方 assignment.md 为准）：项目 E 为参照该主题的自主设计；
- 本课程内部交叉引用清单（项目 A/B/C/D 的规格课与本章三节）：cs146s-w4b-l6（项目 A：执行循环/预算/trace）、cs146s-w3b-l6（项目 B：Spec/验收脚本/报告形态）、cs146s-w2b-l6（项目 C：权限三层）、cs146s-w6b-l6（项目 D：finding 模型/五站门禁）、cs146s-final-l1~l3（五层架构/工单 schema/编排循环）——分别对应模块二复用映射表各行；
- 本项目规格、13 步实现、12 条测试、排查表与 DoD 均为自主设计的原创教学内容。

### 本节习题导引

fill/judge 校准架构决策与自主设计边界；single/multiple 训练复用映射与故障诊断；三道 code 题实现调度器、报告校验与熔断器（它们就是项目的原型函数）；两道 open 题分别设计失败注入测试与毕业答辩复盘。完成项目后进入 l5 结课。
`,
        tips: [
          { kind: 'pitfall', text: '预算口径 = 首次执行 + 全部重试的累计：只在首次执行时查 budget，重试就会绕过预算——排查表里「成本超预算」的最高频根因。' },
          { kind: 'performance', text: '先跑「spec.py + queue.py + report.py」最小三角再写适配器：工单能校验、队列能排序、报告能出空运行——骨架立住了，执行与验证只是往里插内核。' },
          { kind: 'interview', text: '「讲讲你的毕业项目」——答五层架构 + 适配器复用（四个前序项目各归其位）+ 失败路径测试占比，比罗列功能列表高一个量级；面试官要听的是架构判断。' },
          { kind: 'note', text: '把 TC7 的注入工单当金丝雀：每次升级执行内核后先跑它——防线对新内核是否依然生效，一张工单就知道。' },
        ],
        demos: [
          {
            title: '项目 E 预览：约 80 行跑通 队列→执行→验证→指标→报告',
            lang: 'python',
            code: `# 项目 E 预览: 工厂端到端 队列 -> 执行 -> 验证 -> 指标 -> 报告 (完整规格见模块一至七)
GATE_RULES = {"forbidden": ("migrations/",), "require_tests": True}

def schedule(tickets):
    uniq, seen = [], set()                     # 幂等键去重: 同 id 只保留第一张
    for t in tickets:
        if t["id"] not in seen:
            seen.add(t["id"])
            uniq.append(t)
    order, done = [], set()
    while len(order) < len(uniq):
        ready = [t for t in uniq if t["id"] not in done
                 and all(d in done for d in t.get("deps", []))]
        if not ready:
            raise ValueError("依赖成环: " + str([t["id"] for t in uniq if t["id"] not in done]))
        nxt = min(ready, key=lambda t: (t.get("priority", 0), t["id"]))
        order.append(nxt)
        done.add(nxt["id"])
    return order

def agent(ticket, world):
    # 执行适配器: 包项目 A 的 mini-agent(此处为剧本 FakeLLM)
    if ticket["id"] == "T-402" and not world.get("t402_attempted"):
        world["t402_attempted"] = True
        return {"ok": False, "why": "产物缺测试", "changed": ticket["files"]}
    return {"ok": True, "why": "", "changed": ticket["files"]}

def gate(artifact):
    # 验证适配器: 包项目 D 的门禁(禁区 + 测试两站)
    findings = []
    for f in artifact["changed"]:
        if f.startswith(GATE_RULES["forbidden"]):
            findings.append("critical: 禁区文件 " + f)
    if GATE_RULES["require_tests"] and not artifact["ok"]:
        findings.append("critical: " + artifact["why"])
    return findings

TICKETS = [
    {"id": "T-401", "goal": "加 slug 工具函数", "files": ["src/slug.py"],
     "acceptance": ["有 docstring"], "priority": 1},
    {"id": "T-402", "goal": "修复编码 bug", "files": ["src/io.py"],
     "acceptance": ["回归全绿"], "priority": 0, "deps": ["T-401"]},
    {"id": "T-403", "goal": "更新 README", "files": ["README.md"],
     "acceptance": ["示例可运行"], "priority": 2},
    {"id": "T-402", "goal": "修复编码 bug", "files": ["src/io.py"],
     "acceptance": ["回归全绿"], "priority": 0, "deps": ["T-401"]},
]

world = {}
run = []
for t in schedule(TICKETS):
    attempt, findings = 1, ["start"]
    while findings and attempt <= 2:            # 演示用重试上限 2
        artifact = agent(t, world)
        findings = gate(artifact)
        if findings:
            attempt += 1                        # 失败重试(真实版: finding 回填上下文)
    status = "human" if findings else ("rework" if attempt > 1 else "done")
    run.append({"id": t["id"], "status": status, "attempts": attempt})

metrics = {"total": 0, "done": 0, "rework": 0, "human": 0, "tokens": 0}
report = ["# 运行报告 run-001", ""]
for r in run:
    metrics["total"] += 1
    metrics[r["status"]] += 1
    metrics["tokens"] += 2600
    report.append("- %s: %s (尝试 %d 次)" % (r["id"], r["status"], r["attempts"]))
report += ["", "指标(直接喂给改进闭环):",
           "- 一次通过率: %d%%" % round(metrics["done"] / metrics["total"] * 100),
           "- 返工率: %d%%" % round(metrics["rework"] / metrics["total"] * 100),
           "- 成本(估算): %d token" % metrics["tokens"]]
print("\\n".join(report))
print()
print("观察点: T-402 重复提交被幂等去重; T-402 依赖 T-401 所以后执行;")
print("T-402 首次产物缺测试被门禁打回 -> 重试通过 -> 状态 rework(不是 done)")`,
          },
        ],
      },

      /* ─────────────────────────── l5 ─────────────────────────── */
      {
        id: 'cs146s-finalb-l5',
        title: '结课：把工厂带回你的工作',
        difficulty: 2,
        content: `
### 学习目标

学完本节，你应该能够：
1. 用十周能力地图给自己逐项定位（每周→核心能力→项目贡献物），并产出一份个人雷达图数据；
2. 复述「工厂思维」的三个带走物（一切任务皆工单 / 一切产出皆验证 / 一切运行皆度量），并各自给出一个下周就能用的落地方案；
3. 说明官方评分体系里 Final Project 占 80% 的用意（衡量建成物），并制定一份有产物、有验收标准的 90 天提升计划。

### 前置知识

- 全部十一章——本节是课程的总复盘与出口；
- 项目 E 已完成或至少完成主路径（能力自查的打分依据）；
- w4 的自治等级光谱——结课时要重新看一眼它。

### 问题背景

课程到这里，你手里有五份交付物（mini-agent、规格改造仓库、MCP 权限系统、安全流水线、Software Factory）和一套完整的判断框架。但结课最大的风险是：**东西留在课程里，工作照旧**——下周你还是开个新会话口述需求、肉眼验收、凭感觉改提示词。

这一节只做一件事：把课程「搬出去」。三样东西要带走：一张能力地图（知道自己在哪）、三个带走物（知道用什么姿势工作）、一份 90 天计划（知道下一步做什么）。它们共同回答结课后最危险的问题——「然后呢？」

### 直觉理解

结课像**离职交接**——只不过交接的对象是三个月后的你。你要留给他：

- **一张地图**：十周能力地图告诉他每项能力在哪里学过、哪个项目里练过、你目前几分；
- **三个信条**：工厂思维三带走物，短到能贴在显示器边上；
- **一份工单**：90 天提升计划——按你自己的工厂标准写：目标、产物、验收标准齐备，让他照单执行。

哦对了，还有最重要的一条交接纪律：**地图要诚实**。给三个月后的自己画一张全 5 分的雷达图，等于交接了一张假地图——他会迷路的。

### 核心概念与原理详解

## 十周能力地图

| 周 | 核心能力 | 项目贡献物 |
| --- | --- | --- |
| W1 | LLM 机制与提示词工程（token/采样/五要素/评估协议） | 提示词实验 Playground（l5） |
| W2 | Agent 解剖与 MCP（循环/工具/MCP 握手） | 项目 C：MCP server + 权限三层 |
| W3 | 上下文工程与规格驱动（预算/压缩/Spec/AC） | 项目 B：规格驱动仓库改造 |
| W4 | 协作模式与自治分级（拓扑/L0-L4/信任校准） | 项目 A：简化版 Coding Agent |
| W5 | 终端与 CLI 自动化（脚本化/流水线小工具） | 自动化任务脚本 |
| W6 | AI 测试与安全（威胁模型/扫描三明治/变异测试） | 项目 D（前半）：扫描与注入防线 |
| W7 | 代码审查与调试（审查清单/调试循环/复盘纪律） | 项目 D（收口）：完整流水线 |
| W8 | 自动化应用构建（原型到应用/设计 tokens） | 一个可运行的小应用 |
| W9 | 运维与可观测（三支柱/告警/事件响应） | 最小运维原型（项目 E 的度量层） |
| W10 | 趋势判断与角色定位 | 个人能力定位与方向选择 |
| 毕业项目 | 系统集成：把以上全部装配成工厂 | 项目 E：Software Factory 原型 |

读法：每行右边是你「拿出来看」的证据。面试或绩效沟通时，这张表从右往左读——**先亮产物，再讲能力**。

## 工厂思维的三个带走物

1. **一切任务皆工单**：接任何需求先问三个问题——验收标准是什么（acceptance）？预算多少（budget）？做坏了怎么退（rollback）？答不出就先把它写成工单再开工。这个习惯的迁移成本为零：写周报、排期、甚至安排个人事务都适用；
2. **一切产出皆验证**：任何产物（代码、文档、报告、AI 输出）在「完成」之前必须过一道可判定的检查。人工可以、自动更好，但**必须可判定**——「我觉得不错」不是验证；
3. **一切运行皆度量**：任何重复运行的过程（不管跑的是脚本、Agent 还是人）都值得留下三笔账——一次通过率、返工率、成本。没有度量的改进是许愿，有度量的许愿才是计划。

三条的共同内核是 w1-l1 的三角框架——意图（工单）、验证（门禁）、数据（度量）——课程绕了十周，回到的仍是起点，只是每条边都长出了工程实现。

## 官方评分视角：Final Project 80% 的用意

官方评分：Final Project 80% / 每周作业 15% / 参与度 5%。这个权重的用意不是「期末更重要」，而是**测量对象的根本不同**：每周作业测的是「会不会用」，Final Project 测的是「建成了什么」。建成物有三个特征，恰好对应三个带走物——它是被工单定义的（需求清晰）、被验证过的（质量有背书）、被度量过的（效果有数据）。你现在应该能看懂这个评分设计的深意：**它就是在提前训练你用「工厂验收」的方式对待自己的产出。**

## 自治光谱：重新看一眼

<Diagram type="autonomyladder" />

w4 第一次看这张图时，你是在判断「Agent 能替我做什么」；现在重看，问题变成了「**我的工厂现在处于 L 几，三个月后想到 L 几**」。多数完成项目 E 的学习者处于 L2~L3 之间：工单结构化（L2 的证据）、验证自动化（L3 的证据），但预算与熔断还要人盯。给你的工厂定级，用的就是 w4-l6 复盘题的同一套语言——课程在这里首尾呼应。

## 后续学习与社区参与

- **官方渠道**：课程站 themodernsoftware.dev 与官方作业仓库是持续更新的第一手资料——结课不是与它断联，而是从「按周学习」切换到「按主题回访」；
- **MCP 生态**：把你的项目 C 与生态里的公开 MCP server 对接（文件系统、Git、数据库工具链），体验「能力即插即用」；给常用工具写一个自己的 MCP server 是最好的进阶练习；
- **开源贡献**：把项目 E 的拓展任务 4（自动开 PR）用在真实开源项目上——从文档修复类低风险工单起步，严格遵守贡献规范。你的工厂第一次「接外部单子」，就是它毕业的日子；
- **同侪社区**：把五项目整理成作品集发布（拓展任务 5），获取真实反馈——作品集的评论质量通常高于课程评分。

## 致谢与诚实性重申

感谢 Stanford CS146S（Fall 2026，授课 Mihail Eric）的公开课程设计与官方资料——本课程的章节骨架、主题顺序与评分视角均参照官方大纲组织。**诚实性重申**：本课程是「以官方大纲为骨架的大学教材级自学教材」，讲义内容、五个项目、全部习题与 demo 均为本平台自主扩展编写，**不是官方讲义的转录**；官方 2026 年讲义 PDF 与视频未完整公开，涉及官方口径处以官方课程站与作业仓库为准。学习自治教材的你要保持这份清醒：**引用要可溯源，判断要靠自己动手验证**——这本身就是本课程教的第一课。

### 完整案例

一位学习者的结课自查（demo 数据的走读）：雷达图十个维度，均分 2.9——诚实的数据。最弱两项是 W5 终端自动化（2/5）与 W8 应用构建（2/5）。他的 90 天计划：

1. **第 1-30 天**：把日常 3 个重复操作（日志清理、依赖更新、报表导出）各写成脚本 + 一条 agent CLI 命令。产物：3 个脚本进个人仓库。验收：连续两周每周节省 ≥30 分钟（用你自己的度量！）；
2. **第 31-60 天**：用项目 B 的规格法做一个小应用——PRD → AC → 实现 → 验收全绿。产物：应用 + spec/ 目录。验收：AC 全部有断言且全绿；
3. **第 61-90 天**：把项目 E 接上拓展任务 4（自动开 PR），向一个真实开源仓库提交 3 张文档修复工单。产物：3 个被合并（或被认真评审）的 PR。验收：合并 ≥1 个。

**自解释提示**：注意这份计划的每一条都有「产物 + 验收」——它本身就是三张工单。三个月后的他要做的第一件事，就是把这三张工单投进自己的工厂。**用课程教的方式计划课程之后的人生，这是结课的真正动作。**

### 代码实践

下方「个人能力自查评分器」：十项能力（对应十周）逐项 1-5 自评，输出雷达图数据（0-100 折算）、均分与最弱两项的 90 天提升建议。把 ABILITIES 换成你自己的打分再跑一次——这是全课程最后一个 demo，也是你的第一份「个人度量报告」。

### 常见误区与安全风险

- **误区一：「结课 = 完成。」** 完成的是课程的材料，开始的是材料与你工作的化学反应。判断标准很简单：一周后你的日常操作里有没有出现「先写验收标准」——没有的话，这门课对你只是娱乐。
- **误区二：「能力地图给自己打高分激励自己。」** 地图的作用是导航，不是鼓励。虚高的分数会让你跳过真正该补的地基——三个月后撞墙时，代价由项目支付。诚实的 2.9 分比虚荣的 4.5 分值钱。
- **误区三：「90 天计划写成一堆学习目标。」** 「学好运维」「深入 MCP」是愿望不是计划。每一条必须有产物（仓库/文档/PR）与验收标准（可判定）——你的工厂怎么验收工单，你的计划就该怎么写。
- **安全提示**：公开作品集前过一遍项目 D 的秘密扫描（demo 数据、trace 样例、运行报告都是泄漏高发区）；引用官方课程观点时注明来源与「自主扩展」的边界——学术诚实既是课程红线，也是你未来职业信用的第一笔存款。

### 知识关联：承上启下

- 承上：全部十一章（本节是总复盘）、项目 A~E（能力地图的「项目贡献物」列）、w4 自治光谱（重看一眼）、final-l1~l4（三带走物全部出自工厂章）；
- 启下：本平台后续课程按你的雷达图短板选；w10b-l4 的个人行动清单与本节的 90 天计划互补——那边给方向，这边给工单。课程的最后一课没有新知识，只有一句旧话：**定义意图、供给上下文、验证结果——现在，去把它用在课程之外。**

### 动手实验

1. 运行下方自查评分器，把 ABILITIES 换成你的真实打分，记录均分与最弱两项；三个月后重跑一次对比——这就是你个人的 first-pass-rate 趋势线；
2. 把「完整案例」的 90 天计划模板抄走，替换成你自己的三张工单（产物 + 验收标准），放进你个人仓库的 PLAN.md——今天的最后一行代码，是写给三个月后的你的工单。

### 本节总结

1. 十周能力地图：每周→核心能力→项目贡献物；读法从右往左——先亮产物再讲能力；
2. 三个带走物：一切任务皆工单、一切产出皆验证、一切运行皆度量——共同内核是 w1 的三角框架；
3. Final Project 80% 的用意：训练你用「建成物 + 可验证 + 有数据」的方式对待产出——工厂验收自己的产出；
4. 重看自治光谱：给你的工厂定级（多数人在 L2~L3），并定下三个月的目标级；
5. 90 天计划 = 三张工单：每条有产物、有验收标准——用课程教的方式计划课程之外的人生。

### 参考资料与延伸阅读

- [Stanford CS146S 官方课程站](https://themodernsoftware.dev)——官方评分体系（Final Project 80% / 每周作业 15% / 参与 5%）与后续更新：对应「官方评分视角」模块与「后续学习」；
- [官方作业仓库 mihail911/modern-software-dev-assignments](https://github.com/mihail911/modern-software-dev-assignments)——final project 官方导引：对应「建成物」的官方要求（提交以官方仓库为准）；
- [MCP 官方文档](https://modelcontextprotocol.io)——MCP 生态与 server 开发指引：对应「后续学习与社区参与」；
- 本课程内部交叉引用：cs146s-w1-l1（三角框架——三带走物的内核）、cs146s-w4-l1（自治光谱首见）与 cs146s-w4b-l6（项目 A 复盘题——工厂定级的语言）、cs146s-w6b-l6（项目 D——作品集公开前的扫描）、cs146s-finalb-l4（项目 E 拓展任务 4/5——开源贡献与作品集）、cs146s-w10b-l4（个人行动清单——与本节 90 天计划互补）；
- 本节能力地图、三带走物、自查评分器与全部习题均为自主设计的原创教学内容；致谢 Stanford CS146S 的公开课程设计。

### 本节习题导引

fill/multiple 校准能力地图与三带走物；single/judge 检查评分体系理解与诚实性边界；code 题实现 90 天计划生成器；最后一道 open 题写你自己的结课工单。写完它，课程就真正结束了。
`,
        tips: [
          { kind: 'note', text: '把三带走物贴在显示器边上：接需求先写验收、交付前先过检查、重复跑必留数据——三句话的执行率就是这门课的真实成绩。' },
          { kind: 'pitfall', text: '能力自评最常见的偏差是「分数虚高集中在熟悉的周」：用证据锚定——该周的产物现在还能一口气跑通并讲清设计，才有资格给 4 分以上。' },
          { kind: 'interview', text: '「这门课你最大的收获是什么？」——不要答工具列表，答范式：从写代码的人变成定义与验证代码的人，用工厂三指标（一次通过率/返工率/成本）管理工作流，并展示五项目作品集。' },
          { kind: 'performance', text: '90 天计划不超过 3 条工单：每条有产物与验收。超过 3 条的计划几乎必然全线烂尾——容量约束与队列深度限制，在你自己的成长上同样成立。' },
        ],
        demos: [
          {
            title: '个人能力自查评分器：十项能力雷达 + 90 天提升计划',
            lang: 'python',
            code: `# 个人能力自查评分器: 十项能力(对应十周) 1-5 自评 -> 雷达图数据 + 90 天提升计划
ABILITIES = {
    "W1 提示词与模型机制": 4,
    "W2 Agent 解剖与 MCP": 3,
    "W3 上下文工程与规格": 4,
    "W4 协作模式与自治分级": 3,
    "W5 终端自动化": 2,
    "W6 测试与安全": 3,
    "W7 审查与调试": 3,
    "W8 应用构建": 2,
    "W9 运维与可观测": 2,
    "W10 趋势判断与角色定位": 3,
}
scores = dict(ABILITIES)      # 换成你自己的打分再跑一次
avg = sum(scores.values()) / len(scores)

print("== 能力雷达(5 分制 -> 0-100) ==")
for name, s in scores.items():
    print("%-16s %d/5  %3d  %s" % (name, s, s * 20, "#" * (s * 8)))
print("均分 %.1f/5" % avg)

weakest = sorted(scores, key=lambda k: (scores[k], k))[:2]
print()
print("== 90 天提升计划(最弱两项优先, 产物导向) ==")
PLAYBOOK = {
    "W5 终端自动化": "把 3 个日常重复操作写成脚本, 并各配一条 agent CLI 命令",
    "W8 应用构建": "用项目 B 的规格法做一个小应用: PRD -> AC -> 实现 -> 验收全绿",
    "W9 运维与可观测": "给项目 E 补上告警与运行报告, 并做一次无责复盘",
}
for name in weakest:
    tip = PLAYBOOK.get(name, "重做对应周的 demo, 把产出物放进个人作品仓库")
    print("- %s(%d/5): %s" % (name, scores[name], tip))
print()
print("把计划写成三张工单: 目标 -> 产物 -> 验收标准(工厂思维用在自己身上)")
print("并对照 cs146s-w10b-l4 的行动清单校准方向")`,
          },
        ],
      },
    ],
    exercises: [
      /* ───────── l4 习题（14 题）───────── */
      {
        id: 'cs146s-finalb-l4-e1', type: 'fill', difficulty: 1, relatedLessonId: 'cs146s-finalb-l4', tags: ['K', 'project'],
        question: '项目 E 六模块：______（工单与装配）、queue（队列）、orchestrator（编排）、______（验证适配器）、metrics（指标）、report（报告）。',
        blanks: [['spec', 'spec.py', '工单'], ['validator', 'validator.py', '验证']],
        explanation: '六模块中四个是前序项目的适配器（spec 对 B、validator 对 D、metrics 对 w9、执行适配器对 A），queue 是唯一全新的大件——所以它的测试最厚。',
      },
      {
        id: 'cs146s-finalb-l4-e2', type: 'judge', difficulty: 1, relatedLessonId: 'cs146s-finalb-l4', tags: ['K', 'project'],
        question: '项目 E 是官方 Final Project 作业的官方标准答案，按本节规格实现即可获得官方评分。',
        answer: false,
        explanation: '本课程是参照官方大纲的自学教材：项目 E 为参照官方 Final Project 主题的自主设计，规格与实现均为原创教学设计。官方作业的提交形态与评价维度以官方仓库 assignment.md 为准——诚实性声明从 W1 贯穿到最后一节。',
      },
      {
        id: 'cs146s-finalb-l4-e3', type: 'single', difficulty: 2, relatedLessonId: 'cs146s-finalb-l4', tags: ['U', 'project'],
        question: '执行适配器（ExecutorAdapter）的设计要点是？',
        options: [
          { value: 'a', text: '重写项目 A 的执行循环，顺便升级成多 Agent 架构' },
          { value: 'b', text: '包装项目 A 的 agent 内核（FakeLLM 剧本协议原样沿用），每工单新建独立 VFS 工作区，trace 原样透传' },
          { value: 'c', text: '把门禁规则合并进执行器，省一次调用' },
          { value: 'd', text: '让执行器直接写 metrics，减少模块间通信' },
        ],
        answer: 'b',
        explanation: '适配器模式的全部价值在于「不侵入内核」：内核升级时工厂不动，工厂改规则时内核不动。c/d 破坏六模块职责互斥（adapter 不写门禁规则、不写业务判断），是 DoD 第 3 条明令禁止的。',
      },
      {
        id: 'cs146s-finalb-l4-e4', type: 'multiple', difficulty: 2, relatedLessonId: 'cs146s-finalb-l4', tags: ['U', 'project'],
        question: '下列哪些属于项目 E 明确列出的非目标（反例清单）？',
        options: [
          { value: 'a', text: 'Web 界面（拓展任务再做）' },
          { value: 'b', text: '接真实 LLM API（拓展任务再做）' },
          { value: 'c', text: '进程级隔离与分布式队列' },
          { value: 'd', text: '工单 schema 校验' },
        ],
        answer: ['a', 'b', 'c'],
        explanation: 'd 是 FR1 的核心需求不是非目标。非目标清单的作用是防「顺手扩展」——课程项目的死法通常是死在加功能上，不是死在少功能上。',
      },
      {
        id: 'cs146s-finalb-l4-e5', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-finalb-l4', tags: ['K', 'project'],
        question: '实现顺序的原则：输入类型先行（spec.py 最先写，它是其余模块的______类型）；适配器包装内核不______；编排循环最后装配。',
        blanks: [['输入', '基础', '依赖'], ['侵入', '侵入内核', '修改内核']],
        explanation: 'spec 先行的原因：工单类型是所有模块的输入契约；适配器不侵入内核的原因：项目 A/D 的内核要能独立升级，工厂代码零改动。',
      },
      {
        id: 'cs146s-finalb-l4-e6', type: 'code', difficulty: 3, relatedLessonId: 'cs146s-finalb-l4', tags: ['D', 'project'],
        question: '实现项目 E 的队列调度器 `schedule(tickets)`。tickets 是工单 dict 列表，每张含 id，可选 deps（依赖的工单 id 列表）与 priority（数字，小者先）。要求：幂等键去重（同 id 只保留第一张）；输出满足依赖拓扑序；同批可选工单按（priority, id）字典序选下一个；依赖引用不存在的 id 时忽略该依赖；依赖成环时抛 ValueError。',
        lang: 'python',
        starterCode: `def schedule(tickets):
    # 返回执行顺序的 id 列表; 成环抛 ValueError("依赖成环")
    pass

Q = [{"id": "T-202", "deps": ["T-201"], "priority": 0},
     {"id": "T-201", "deps": [], "priority": 1},
     {"id": "T-201", "deps": [], "priority": 1},
     {"id": "T-203", "deps": [], "priority": 0}]
print(schedule(Q))`,
        expectedOutput: `['T-203', 'T-201', 'T-202']`,
        tests: `Q = [{"id": "T-202", "deps": ["T-201"], "priority": 0},
     {"id": "T-201", "deps": [], "priority": 1},
     {"id": "T-201", "deps": [], "priority": 1},
     {"id": "T-203", "deps": [], "priority": 0}]
assert schedule(Q) == ["T-203", "T-201", "T-202"], "去重+依赖+优先级"
assert schedule([{"id": "A"}, {"id": "B", "deps": ["A"]}, {"id": "C", "deps": ["B"]}]) == ["A", "B", "C"]
assert schedule([{"id": "X", "deps": ["ghost"]}]) == ["X"], "缺失依赖忽略"
try:
    schedule([{"id": "P", "deps": ["Q"]}, {"id": "Q", "deps": ["P"]}])
    assert False, "成环应抛错"
except ValueError:
    pass`,
        allowedModules: [],
        explanation: '这是 queue.py 的心脏（TC4/TC5 的原型全在这里）：去重在入队语义层、依赖在拓扑层、优先级只在「依赖已满足」的同批生效——三层语义一次全对才算调度器及格。缺失依赖忽略是宽容输入的原则：拒绝入队时才报错，执行期静默降级比崩溃好。',
        answer: `def schedule(tickets):
    uniq, seen = [], set()
    for t in tickets:
        if t["id"] not in seen:
            seen.add(t["id"])
            uniq.append(t)
    prio = {t["id"]: t.get("priority", 0) for t in uniq}
    deps = {t["id"]: [d for d in t.get("deps", []) if d in prio] for t in uniq}
    order, done = [], set()
    while len(order) < len(uniq):
        ready = [t for t in uniq if t["id"] not in done
                 and all(d in done for d in deps[t["id"]])]
        if not ready:
            raise ValueError("依赖成环")
        nxt = min(ready, key=lambda t: (prio[t["id"]], t["id"]))
        order.append(nxt["id"])
        done.add(nxt["id"])
    return order

Q = [{"id": "T-202", "deps": ["T-201"], "priority": 0},
     {"id": "T-201", "deps": [], "priority": 1},
     {"id": "T-201", "deps": [], "priority": 1},
     {"id": "T-203", "deps": [], "priority": 0}]
print(schedule(Q))`,
      },
      {
        id: 'cs146s-finalb-l4-e7', type: 'single', difficulty: 3, relatedLessonId: 'cs146s-finalb-l4', tags: ['U', 'project'],
        question: '12 条验收用例里，为什么 TC7（注入工单被拦截）被视为必须保留的「金丝雀」？',
        options: [
          { value: 'a', text: '它是唯一测执行功能的用例' },
          { value: 'b', text: '防线对每次内核升级都要重新证明自己——注入工单是对三道防线最便宜的回归探针' },
          { value: 'c', text: '它跑得最快，适合放在 CI 第一个' },
          { value: 'd', text: '因为外部工单永远比内部工单重要' },
        ],
        answer: 'b',
        explanation: '消毒、沙箱、门禁兜底三道防线的正确性依赖执行内核的行为假设（如「Agent 不执行工单文本里的命令」）——内核一升级，假设就可能失效。TC7 每次升级后先跑，防线腐烂当天就能发现（本节 tips 的金丝雀比喻）。',
      },
      {
        id: 'cs146s-finalb-l4-e8', type: 'judge', difficulty: 2, relatedLessonId: 'cs146s-finalb-l4', tags: ['U', 'project'],
        question: 'TC6 中工单因 budget 极小被停，判定为 fail 后仍会进入失败处理链（可能重试、降级或转人工），而不是直接把队列熔断。',
        answer: true,
        explanation: '预算耗尽是「这张工单」的失败（执行单元的项目 A 闸门触发），属于单工单失败处理链的输入；熔断看的是「队列级连续门禁失败」——两者是不同层级的机制，混在一起会让一张预算太紧的工单炸掉整条产线。',
      },
      {
        id: 'cs146s-finalb-l4-e9', type: 'code', difficulty: 3, relatedLessonId: 'cs146s-finalb-l4', tags: ['D', 'project'],
        question: '实现运行报告完整性校验器 `report_complete(report)`。必需顶层字段依次为 run_id、tickets、metrics；metrics 内必需 first_pass_rate、rework_rate、total_cost；tickets 列表中每张工单的 status 必须是 done/rework/human 之一。返回错误列表：缺顶层字段记「缺少字段: 字段名」，metrics 缺项记「metrics 缺少: 字段名」，工单状态非法记「工单状态非法: 工单id」——检查顺序为先顶层字段、再 metrics、最后逐张工单。',
        lang: 'python',
        starterCode: `def report_complete(report):
    # 返回错误列表; 空列表 = 报告完整
    pass

ok = {"run_id": "run-001",
      "tickets": [{"id": "T-1", "status": "done"}, {"id": "T-2", "status": "human"}],
      "metrics": {"first_pass_rate": 0.5, "rework_rate": 0.5, "total_cost": 100}}
print(report_complete(ok))`,
        expectedOutput: '[]',
        tests: `ok = {"run_id": "run-001",
      "tickets": [{"id": "T-1", "status": "done"}, {"id": "T-2", "status": "human"}],
      "metrics": {"first_pass_rate": 0.5, "rework_rate": 0.5, "total_cost": 100}}
assert report_complete(ok) == []
bad = {"tickets": [{"id": "T-9", "status": "win"}], "metrics": {"first_pass_rate": 1}}
errs = report_complete(bad)
assert "缺少字段: run_id" in errs
assert "metrics 缺少: rework_rate" in errs and "metrics 缺少: total_cost" in errs
assert "工单状态非法: T-9" in errs
assert report_complete({})[0] == "缺少字段: run_id", "顺序: 先字段后 metrics 后工单"`,
        allowedModules: [],
        explanation: '这是 report.py 的 report_complete（TC8 的内核）：报告完整性有校验器背书，「报告没人看」的排查表条目才有起点——先保证报告结构可信，再谈可读性。错误顺序固定（先字段后 metrics 后工单）让错误列表本身可测。',
        answer: `REQUIRED = ("run_id", "tickets", "metrics")
METRIC_KEYS = ("first_pass_rate", "rework_rate", "total_cost")
STATUS = ("done", "rework", "human")

def report_complete(report):
    errors = []
    for k in REQUIRED:
        if k not in report:
            errors.append("缺少字段: " + k)
    metrics = report.get("metrics", {})
    for k in METRIC_KEYS:
        if k not in metrics:
            errors.append("metrics 缺少: " + k)
    for t in report.get("tickets", []):
        if t.get("status") not in STATUS:
            errors.append("工单状态非法: " + t.get("id", "?"))
    return errors

ok = {"run_id": "run-001",
      "tickets": [{"id": "T-1", "status": "done"}, {"id": "T-2", "status": "human"}],
      "metrics": {"first_pass_rate": 0.5, "rework_rate": 0.5, "total_cost": 100}}
print(report_complete(ok))`,
      },
      {
        id: 'cs146s-finalb-l4-e10', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-finalb-l4', tags: ['K', 'project'],
        question: '三个演练工单：T-501 给样例仓库______、T-502 修复日期解析______、T-503 更新______——分别覆盖「新增功能 / 修缺陷 / 改文档」三类最常见的工单类型。',
        blanks: [['加函数', '加 slug 函数', '新增函数'], ['bug', '缺陷', '解析 bug'], ['README', '文档', 'readme']],
        explanation: '三类工单的验收侧重不同：加函数看功能 AC、修 bug 看回归测试、改文档看示例可运行——它们是工厂接真实需求前的校准砝码。',
      },
      {
        id: 'cs146s-finalb-l4-e11', type: 'multiple', difficulty: 3, relatedLessonId: 'cs146s-finalb-l4', tags: ['U', 'project'],
        question: '对照故障排查表，下列「症状→根因→处置」配对正确的有？',
        options: [
          { value: 'a', text: '验证永远不过 ← finding 没回填进重试上下文 → 回填用 finding 原文不做总结' },
          { value: 'b', text: '重试风暴 ← 失败是系统性的且 max_retries 过大 → 上限默认 2，finding 相同则直接降级' },
          { value: 'c', text: '上下文装配遗漏 ← 禁区清单没进上下文包 → 装配器测试断言禁区条目存在' },
          { value: 'd', text: '指标口径漂移 ← 工单太多 → 增加工单字段让统计更细' },
        ],
        answer: ['a', 'b', 'c'],
        explanation: 'd 错在方向：口径漂移的根因是 status 枚举不统一，处置是用 Literal 枚举 + report_complete 校验并让口径变更走评审——加字段只会让口径更乱。a/b/c 是排查表的原文配对。',
      },
      {
        id: 'cs146s-finalb-l4-e12', type: 'code', difficulty: 3, relatedLessonId: 'cs146s-finalb-l4', tags: ['D', 'project'],
        question: '实现熔断器 `should_pause(recent, threshold=3)`。recent 是按时间顺序的验证结果列表（每项为 fail、pass 或 needs-human），从末尾往回数连续的 fail，连续数达到 threshold 返回 True，否则返回 False；任何非 fail 结果都会打断连败计数；空列表返回 False。',
        lang: 'python',
        starterCode: `def should_pause(recent, threshold=3):
    # 从末尾数连续 "fail" 的个数, 达到 threshold -> True
    pass

print(should_pause(["pass", "fail", "fail", "fail"]))
print(should_pause(["fail", "fail"]))`,
        expectedOutput: `True
False`,
        tests: `assert should_pause(["pass", "fail", "fail", "fail"]) is True
assert should_pause(["fail", "fail"]) is False, "连败不足阈值"
assert should_pause(["fail", "pass", "fail", "fail"]) is False, "pass 打断连败"
assert should_pause(["fail", "fail"], threshold=2) is True, "阈值可配"
assert should_pause([]) is False, "空队列不熔断"
assert should_pause(["fail", "needs-human", "fail"]) is False, "非 fail 打断连败"`,
        allowedModules: [],
        explanation: '熔断器核心（TC6 的判定函数）：用「连续」而不是比率，因为工厂批量小、比率噪声大；needs-human 打断连败——它走人工通道，不属于门禁失败，把它算进连败会让熔断对人审负载误触发。',
        answer: `def should_pause(recent, threshold=3):
    streak = 0
    for r in reversed(recent):
        if r == "fail":
            streak += 1
        else:
            break
    return streak >= threshold

print(should_pause(["pass", "fail", "fail", "fail"]))
print(should_pause(["fail", "fail"]))`,
      },
      {
        id: 'cs146s-finalb-l4-e13', type: 'open', difficulty: 4, relatedLessonId: 'cs146s-finalb-l4', tags: ['D', 'project'],
        question: '为项目 E 设计失败注入测试方案：① 除模块四已有的注入（缺测试、改禁区）外，再设计 3 张注入工单（各写明注入点、预期路径与判定期望）；② 说明每张注入工单分别验证哪条防线或哪个机制；③ 给出注入测试的执行时机（什么时候跑、跑完怎么恢复现场）；④ 说明为什么这类测试的剧本必须用 FakeLLM 而不是真实 API。',
        referenceAnswer: `① 三张新增注入工单：
- INJ-1「格式漂移」：注入点=执行适配器；剧本让 Agent 输出非协议格式（如 TOOL 后缺 ARGS）；预期=适配器返回结构化错误并计 fail，不崩溃；判定=该工单 fail 且 trace 记录「协议解析失败」，错误进重试上下文；
- INJ-2「预算贪婪」：注入点=预算闸门；剧本让 Agent 每轮都调用工具且永不出 final，budget 设中档；预期=轮数/token 闸门先触发（budget_exhausted）→ fail → 失败链；判定=实际执行轮数 ≤ 预算允许值，成本统计不超 budget；
- INJ-3「幂等键碰撞」：注入点=队列；同一 id 的工单带不同 goal 重复提交 3 次；预期=只执行第一次提交的版本；判定=执行次数 1，后两次被去重且有审计记录（重复提交的 goal 不被静默吞掉）。

② 对应机制：INJ-1 验证适配器的协议健壮性（内核输出不可信原则）；INJ-2 验证项目 A 的双预算闸门在工厂语境下依然生效（预算口径=首次+重试）；INJ-3 验证幂等键语义与审计完整性——去重不该是静默的。

③ 执行时机与现场恢复：
- 时机：每次执行内核/适配器升级后的回归（TC7 金丝雀同批跑）；正式演练端到端前跑一遍全部注入用例；
- 恢复：注入剧本只存在于测试 fixture 中，不进 demo_tickets.json；跑完断言 sample/ 工作区与执行前哈希一致（TC11 的回滚校验复用）；测试报告标注「注入批次」与正式批次分开统计，防止污染三指标基线。

④ 为什么必须 FakeLLM：确定性——注入测试验证的是「失败时系统行为正确」，要求失败可以精确复现、可以断言到轮次与状态；真实 API 的概率性（同提示不同输出）让「预期的失败路径」变成赌博，测试会随机红绿；此外真实 API 有成本与延迟，且注入恶意剧本给真实 API 既贵又不可控（可能产生不可预期的真实写操作）。FakeLLM 的价值是确定性而不是逼真——项目 A 的核心结论在工厂层的直接应用。`,
        rubric: [
          { point: '3 张注入工单各有注入点、预期路径与可判定期望', score: 4 },
          { point: '每张注入对应的防线/机制说明准确（协议健壮性/预算闸门/幂等+审计）', score: 3 },
          { point: '执行时机明确（升级后回归+端到端前）且现场恢复方案具体（fixture 隔离+哈希校验+批次分开）', score: 2 },
          { point: 'FakeLLM 理由触及「确定性可断言」与「真实写操作风险」两点', score: 1 },
        ],
        keywords: ['注入', '剧本', 'FakeLLM', '确定性', '幂等', '预算'],
        explanation: '判卷核心是「注入测试测的是失败路径的正确性」：期望必须可判定（到轮次/状态/审计记录），而不是「看起来处理了」。第④问是概念回归——可验证性是自治的前提，这条从项目 A 一路用到毕业。',
      },
      {
        id: 'cs146s-finalb-l4-e14', type: 'open', difficulty: 5, relatedLessonId: 'cs146s-finalb-l4', tags: ['D', 'project'],
        question: '毕业答辩：用五层架构复盘你的项目 E——① 逐层说明你的实现与 l1 概念架构的对应关系，指出你在哪一层做了与规格不同的取舍及理由；② 用可持续性四判据自评你的工厂（每条给证据：测试编号或运行报告字段）；③ 用 w4 的自治等级给你的工厂定级（L 几），并给出升到更高一级还缺的三个条件；④ 如果只有一周时间做拓展任务，你选五条里的哪一条，为什么它对你的工厂价值最大。',
        referenceAnswer: `参考答辩结构（要点与高分特征）：

① 五层对应与取舍：任务层=spec.py（若把 AC 校验从「入队时」移到「执行前重查」，理由是 Spec 可能在排队期间更新——单一事实源的动态性）；编排层=queue.py+orchestrator.py 主循环；执行层=ExecutorAdapter（若选择不透传全量 trace 而只传摘要，须说明度量层的补偿字段）；验证层=ValidatorAdapter 三态折叠；度量层=metrics.py+report.py。高分特征：取舍有理由且承认代价（如「摘要节省存储，代价是复盘粒度变粗，故 report 保留 trace 文件路径」）。

② 四判据自评（示例口径）：
- 任务可排队：TC4/TC5（幂等去重+依赖排序）——队列语义有测试；
- 结果可验证：TC1/TC2/TC8（门禁三态+报告完整性）——判定自动化且可追溯；
- 过程可度量：TC9（三指标口径）+ report 的 per-ticket 明细——成本与通过率有账；
- 系统可改进：三指标接入信任校准的设计说明（哪类工单该升自治、阈值是什么）——闭环有消费者。
高分特征：每条判据指认到具体测试编号或报告字段，而不是「我觉得做到了」。

③ 定级（参考）：L2~L3。证据：工单结构化+验证自动化（L2 特征齐备）、失败处理链自动重试（L3 特征），但预算与熔断需要人盯、恢复默认人工（未到 L4）。升级三条件（参考 w4b-l6 的升级框架）：a. 自动恢复的受控半开路径（熔断后探针自愈）；b. 足够长的通过率数据支撑信任校准（没有数据的升级是许愿）；c. 真实工作区隔离升级（VFS → worktree/容器），支撑更高并发与更敏感任务。

④ 拓展任务取舍（示例）：选「GitHub 集成（自动 PR）」。理由：它把工厂从「VFS 里的自我证明」变成「接外部真实单子的生产系统」——验证层获得真实 CI 回填、任务层获得真实需求流、度量层获得真实信号；其余拓展（仪表盘/真 API/模板库）都在优化内部，而这一条改变工厂与外部世界的关系。高分特征：选择与自己的雷达图短板挂钩（如 W8 弱者选应用构建类拓展并说明）。`,
        rubric: [
          { point: '五层对应完整且至少一处取舍有理由并承认代价', score: 3 },
          { point: '四判据自评每条指认到测试编号或报告字段（证据导向）', score: 4 },
          { point: '定级有证据支撑，升级三条件与 w4 框架自洽（数据/隔离/自动化恢复）', score: 2 },
          { point: '拓展任务选择有论证且与自身短板或工厂定位挂钩', score: 1 },
        ],
        keywords: ['五层', '四判据', '定级', 'L3', '证据', '取舍'],
        explanation: '这是全课程最后一道题，判卷标准只有一个：**证据密度**。「我觉得我的工厂不错」不是答辩，「TC9 证明三指标口径正确、first_pass_rate 字段可追溯」才是。用建成物与测试编号说话——这正是 Final Project 80% 要训练的表达方式。',
      },

      /* ───────── l5 习题（6 题）───────── */
      {
        id: 'cs146s-finalb-l5-e1', type: 'fill', difficulty: 1, relatedLessonId: 'cs146s-finalb-l5', tags: ['K', 'review'],
        question: '工厂思维三个带走物：一切任务皆______、一切产出皆______、一切运行皆______。',
        blanks: [['工单', 'ticket'], ['验证', '验收'], ['度量', '计量', '测量']],
        explanation: '三条对应 w1-l1 三角框架的三条边（意图/验证/数据）——课程绕了十周，回到起点，只是每条边都长出了工程实现（工单 schema、门禁三态、三指标）。',
      },
      {
        id: 'cs146s-finalb-l5-e2', type: 'multiple', difficulty: 2, relatedLessonId: 'cs146s-finalb-l5', tags: ['U', 'review'],
        question: '关于十周能力地图的读法，下列说法正确的有？',
        options: [
          { value: 'a', text: '每行右边是项目贡献物——面试或绩效沟通时从右往左读：先亮产物，再讲能力' },
          { value: 'b', text: 'W6/W7 的贡献物合起来是项目 D——安全流水线横跨两周' },
          { value: 'c', text: '毕业项目行的贡献物是项目 E——系统集成能力' },
          { value: 'd', text: '能力地图应该给自己全部打 5 分，以激励后续学习' },
        ],
        answer: ['a', 'b', 'c'],
        explanation: 'd 是地图的大忌：地图的作用是导航不是鼓励，虚高分数会让你跳过真正该补的地基。诚实的 2.9 分比虚荣的 4.5 分值钱——「用证据锚定打分」（该周产物还能一口气跑通并讲清设计）。',
      },
      {
        id: 'cs146s-finalb-l5-e3', type: 'single', difficulty: 2, relatedLessonId: 'cs146s-finalb-l5', tags: ['U', 'review'],
        question: '官方评分体系 Final Project 占 80%，这个权重的用意最准确的解读是？',
        options: [
          { value: 'a', text: '期末考试比平时努力更重要' },
          { value: 'b', text: '测量对象不同：每周作业测「会不会用」，Final Project 测「建成了什么」——训练你用建成物、可验证、有数据的方式对待产出' },
          { value: 'c', text: '官方希望减少批改作业的工作量' },
          { value: 'd', text: '说明周作业不重要，可以不做' },
        ],
        answer: 'b',
        explanation: '80% 的深意是验收范式的转移：建成物的三个特征（被工单定义、被验证过、被度量过）恰好对应三个带走物。a/c/d 都是错位的解读——权重差异表达的是测量维度，不是重要性排序。',
      },
      {
        id: 'cs146s-finalb-l5-e4', type: 'judge', difficulty: 1, relatedLessonId: 'cs146s-finalb-l5', tags: ['U', 'review'],
        question: '本课程的讲义内容与五个项目均为参照官方大纲的自主扩展编写，不是官方讲义的转录；引用官方观点时应注明来源与这一边界。',
        answer: true,
        explanation: '诚实性红线从 W1 贯穿到最后一节：官方 2026 年讲义 PDF 与视频未完整公开，本课程是「以官方大纲为骨架的自学教材」。学术诚实既是课程红线，也是职业信用的第一笔存款——这与「一切产出皆验证」是同一条原则：陈述要可溯源。',
      },
      {
        id: 'cs146s-finalb-l5-e5', type: 'code', difficulty: 2, relatedLessonId: 'cs146s-finalb-l5', tags: ['D', 'review'],
        question: '实现 90 天计划生成器 `plan_90days(scores)`。scores 是「能力名 → 1-5 自评分」的字典。返回二元组：平均分（保留 2 位小数）与最弱两项的能力名列表（按分数升序，同分按名称字典序；不足两项时全返回）。',
        lang: 'python',
        starterCode: `def plan_90days(scores):
    # 返回 (平均分, 最弱两项列表)
    pass

s = {"W1": 4, "W2": 3, "W3": 4, "W4": 3, "W5": 2,
     "W6": 3, "W7": 3, "W8": 2, "W9": 2, "W10": 3}
print(plan_90days(s))`,
        expectedOutput: `(2.9, ['W5', 'W8'])`,
        tests: `s = {"W1": 4, "W2": 3, "W3": 4, "W4": 3, "W5": 2, "W6": 3, "W7": 3, "W8": 2, "W9": 2, "W10": 3}
avg, weakest = plan_90days(s)
assert avg == 2.9, avg
assert weakest == ["W5", "W8"], "最弱两项, 同分按名称"
avg2, w2 = plan_90days({"A": 5, "B": 1})
assert avg2 == 3.0 and w2 == ["B", "A"], "不足两项时全返回"`,
        allowedModules: [],
        explanation: '这是自查评分器的核心函数：排序键 (分数, 名称) 保证同分时的确定性输出——「计划要有确定的选择依据」，随机挑短板的计划没法验收。W9 同为 2 分但按名称排在 W8 之后，故最弱两项是 W5 与 W8。',
        answer: `def plan_90days(scores):
    avg = round(sum(scores.values()) / len(scores), 2)
    weakest = sorted(scores, key=lambda k: (scores[k], k))[:2]
    return avg, weakest

s = {"W1": 4, "W2": 3, "W3": 4, "W4": 3, "W5": 2,
     "W6": 3, "W7": 3, "W8": 2, "W9": 2, "W10": 3}
print(plan_90days(s))`,
      },
      {
        id: 'cs146s-finalb-l5-e6', type: 'open', difficulty: 4, relatedLessonId: 'cs146s-finalb-l5', tags: ['D', 'review'],
        question: '写你的结课工单：① 运行自查评分器后，写出你的均分、最弱两项与各自一个「证据缺口」（为什么这项只得这个分）；② 90 天计划写成恰好 3 张工单（每张含目标、产物、可判定的验收标准、预算）；③ 说明你会用哪个前序项目的哪块积木来支撑其中一张工单的执行；④ 三个月后你打算怎么验证这份计划的「一次通过率」。',
        referenceAnswer: `参考结构（以示例学习者填充，判卷看结构与证据意识）：

① 自评数据（示例）：均分 2.9；最弱两项 W5 终端自动化（2/5）与 W8 应用构建（2/5）。证据缺口：W5——课程后我的日常操作仍是手动重复（无脚本资产）；W8——项目 B 的规格法没在应用类任务上用过（只用在仓库改造上）。

② 90 天计划（三张工单，示例）：
- T-A 终端自动化：目标=把 3 个重复操作脚本化并各配 agent CLI 命令；产物=3 个脚本进个人仓库 scripts/；验收=连续两周每周节省 ≥30 分钟（手动计时记录）；预算=每周 ≤2 小时；
- T-B 规格法应用：目标=用 PRD→AC→实现→验收流程做一个小应用；产物=应用仓库含 spec/ 目录与验收脚本；验收=AC 全部有断言且全绿、无 AC 无实现；预算=4 个周末；
- T-C 工厂接外单：目标=项目 E 接自动开 PR，向开源仓库提交文档修复；产物=3 个 PR；验收=≥1 个被合并或收到实质性评审意见；预算=每周 ≤3 小时，单 PR ≤2 次返工。

③ 积木复用（示例）：T-C 用项目 A 的执行内核 + 项目 D 的门禁做本地预检（PR 前先过一遍流水线，省返工）——前序积木在新场景的直接复用。

④ 一次通过率的个人版：三个月后回看 3 张工单——几条是一次执行到位（验收一次过）、几条返工过？把「计划本身的返工」也记进账：如果 T-B 的验收标准中途改了 2 次，说明 PRD 阶段的意图表达有问题——用工厂的数据口吻复盘自己的成长，这就是三带走物的最终应用。`,
        rubric: [
          { point: '自评数据有证据缺口（能说清为什么扣分），不是全 5 分', score: 3 },
          { point: '恰好 3 张工单，每张含目标/产物/可判定验收/预算四要素', score: 4 },
          { point: '指出具体的前序项目积木及其在新场景的用法', score: 2 },
          { point: '第④问用工厂指标口径（一次通过/返工）验证计划本身', score: 1 },
        ],
        keywords: ['工单', '验收', '产物', '预算', '一次通过', '返工'],
        explanation: '这是全课程的收束题：判卷标准与 l4 的毕业答辩一脉相承——证据密度与可判定性。计划写成工单（四要素齐备）、验证用工厂口径（一次通过率），说明三个带走物真的被带走了。',
      },
    ],
  },
];
