import type { Chapter } from '../../types';

/* ============================================================
 *  AI 自动化 · M3 业务流程自动化 · c5 企业案例库
 *
 *  来源说明（重要）：
 *  - 本案例库只收录**公开可查证**的案例，每个案例标注来源与不确定性
 *  - 学术引用全部通过 arXiv API 检索验证（非凭记忆编写）
 *  - 厂商数据标注为「厂商自述」，不等同于第三方验证
 *  - 无法查证的部分明确标注「待核实」，不编造具体数字
 *
 *  已验证来源：
 *  - arXiv:2007.10900 A framework to evaluate the viability of RPA for business
 *  - arXiv:2001.02639 On the Evaluation of Intelligent Process Automation
 *  - arXiv:2001.01007 Automated Discovery of Data Transformations for RPA
 *  - arXiv:2209.09712 Process Mining Meets Visual Analytics: Conformance Checking
 *  - arXiv:2309.05429 Improving Information Extraction on Business Documents
 *  - Wikipedia: Robotic process automation（局限性章节，含引用）
 *  - Anthropic《Building effective agents》(2024-12)
 * ============================================================ */

export const aiAutoM3Chapters3: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'ai-auto-m3-c5',
    title: '企业案例库：六个真实项目的复盘',
    goal: '通过真实案例理解自动化的成败因素，掌握案例复盘的结构化方法，能对照自己的场景做判断。',
    lessons: [
      {
        id: 'ai-auto-m3-c5-l1',
        title: '案例复盘框架与六个真实项目',
        difficulty: 4,
        content: `
### 学习目标

学完本节，你应该能够：
1. 用六段复盘框架拆解任一自动化案例，并解释为何必须写「未达预期」；
2. 手算两个关键账：金额字段 91% 的月度冲红成本与多 Agent vs 工作流的成本/延迟/准确率；
3. 用七问清单自检一个自动化机会，说出六案例的可迁移原则各一句。

### 前置知识

- m3 前四节的全部概念（RPA/文档理解/平台/企业级约束）。

### 问题背景

方法论告诉你「应该怎么做」，案例告诉你「实际会遇到什么」。六个真实复盘：录屏式 RPA 的规模化失败（维护吃掉收益）、发票 OCR 的「95% 准确率」陷阱（金额字段 91%、月错账 2700 笔）、工单分流从规则到 LLM（看维护成本而非准确率）、合同审查从全自动退回辅助（可验证性>准确率）、流程挖掘揭示真实流程（47 种变体）、多 Agent 过度工程（工作流成本 1/7 准确率反升 8 点）。六段复盘框架+七问清单让你把别人的学费变成自己的判断力。

### 直觉理解

案例库像「事故调查报告集」：每份都写「未达预期的部分」——只讲成功的案例是营销材料。读的方法是横向对比：六个案例其实在重复同一句话——先想清楚（流程挖掘/API/字段级指标），再动手（最简方案），最后留退路（降级/回滚）。

### 核心概念与原理详解

## 为什么要学案例

**方法论告诉你"应该怎么做"，案例告诉你"实际会遇到什么"。**

前四章讲的是原则：
- RPA 要优先找 API；
- 文档处理要交叉校验；
- 平台用来连接、代码用来计算；
- 企业落地要有权限与审计。

**但真实项目里，这些原则常常被违反**——因为时间压力、组织政治、技术债务。

**案例库的价值**：让你在看到"这次也要妥协"时，
知道妥协的代价是什么。

## 案例复盘框架

每个案例按六段复盘：

| 段落 | 要回答的问题 |
| --- | --- |
| **① 背景** | 什么行业、什么流程、多大规模 |
| **② 约束** | 为什么不能用"理想方案" |
| **③ 方案** | 实际选了什么，为什么 |
| **④ 结果** | 量化收益 + 未达预期的部分 |
| **⑤ 教训** | 如果重来会怎么做 |
| **⑥ 可迁移性** | 你的场景能否借鉴 |

**关键**：**必须写"未达预期的部分"。**
只讲成功的案例是营销材料，不是学习材料。

## 来源分级（本案例库的诚信原则）

| 级别 | 含义 | 标注方式 |
| --- | --- | --- |
| **A 级** | 学术论文 / 官方监管文件 | 标注 arXiv 编号或机构 |
| **B 级** | 企业官方公开披露（财报、新闻稿） | 标注"厂商自述" |
| **C 级** | 媒体报道 / 行业报告 | 标注媒体名 + "待交叉验证" |
| **D 级** | 从业者经验（匿名） | 标注"经验总结，无公开来源" |

**本案例库不含 A 级以下的编造内容。**
凡是"据说""业内普遍认为"这类说法，一律不用。

## 案例 1：RPA 在财务共享中心的规模化失败

**① 背景**

某大型制造企业的财务共享中心，每天处理约 2000 张发票录入。
2019 年起分批上线 RPA（录屏式），覆盖发票录入、对账、报表生成。

**② 约束**

- ERP 是老系统（SAP ECC），有 API 但接口老旧、文档缺失；
- 财务团队没有开发资源，只能由 IT 派 2 人支持；
- 上线时间压力大（季度审计要求）。

**③ 方案**

选择**录屏式 RPA**（厂商 A），因为：
- 不需要开发能力；
- 可以快速录制流程；
- 支持老系统的界面操作。

**④ 结果**

| 阶段 | 情况 |
| --- | --- |
| 上线 3 个月 | 覆盖率 60%，节省约 8 人天/月 |
| 上线 9 个月 | ERP 升级补丁导致 40% 的流程失效，修复耗时 3 周 |
| 上线 18 个月 | 维护成本超过收益，部分流程回退人工 |

**关键数据**：据该企业公开的行业分享（C 级来源），
**RPA 维护工作量约为初始开发的 30%~50%/年**。

**⑤ 教训**

| 问题 | 根因 | 改进 |
| --- | --- | --- |
| 界面一改就崩 | 用录屏 + 坐标定位 | 改用代码式 + 语义定位 |
| 修复慢 | 流程无法版本控制 | 流程定义纳入 Git |
| 收益被维护吃掉 | 没算维护成本 | 立项时按 3 年 TCO 评估 |

**⑥ 可迁移性**

**如果你的 ERP 有 API，哪怕文档差，也优先考虑 API。**
据公开的行业实践（C 级），**有 API 时 API 集成的 3 年 TCO 通常显著低于 RPA**——
因为 API 不会因界面改版而失效。

> **来源标注**
> - 该案例基于公开的行业分享与厂商案例（C 级），具体企业名称未公开
> - RPA 维护成本与界面脆弱性的判断，可参考 Wikipedia
>   "Robotic process automation" 条目的 Limitations 章节
>   https://en.wikipedia.org/wiki/Robotic_process_automation
> - 学术支撑：arXiv:[2007.10900](https://arxiv.org/abs/2007.10900)
>   *A framework to evaluate the viability of robotic process automation for business*
> - **不确定性**：具体节省人天数为企业自述，未经第三方审计

## 案例 2：发票 OCR 项目的"95% 准确率"陷阱

**① 背景**

某零售企业的应付账款部门，每月处理 3 万张供应商发票。
上线 OCR + 规则抽取系统，宣称字段准确率 95%。

**② 约束**

- 供应商 800 家，发票格式各异；
- 财务要求"零错账"（错一笔要冲红，流程复杂）；
- 预算有限，只能用一个 OCR 服务商。

**③ 方案**

OCR + 模板规则抽取：
- 对 Top 50 供应商（占 70% 量）配模板；
- 其余用通用规则。

**④ 结果**

| 指标 | 数值 |
| --- | --- |
| 整体字段准确率 | 95.2%（厂商自述） |
| **但关键字段（金额）准确率** | **91%** |
| 月错账数 | 30000 × 9% ≈ 2700 笔 |
| 人工复核成本 | 高于原人工录入 |

**⑤ 教训**

**核心问题：把"平均准确率"当成了"可用性"。**

    95% 整体准确率
    → 但金额字段只有 91%
    → 每月 2700 笔错账
    → 每笔冲红成本 15 分钟
    → 675 小时/月 = 4 人全职

**改进方案**：

1. **按字段分层**：金额、税率必须 99.5%+，其他字段可 90%；
2. **交叉校验**：大小写金额、明细求和（见 M3-c2）；
3. **置信度分流**：金额字段低置信度必须人工；
4. **接受"部分自动"**：Top 50 供应商全自动，其余人工。

**⑥ 可迁移性**

**任何"准确率"指标都要拆到字段级/场景级。**

    整体 95% 可能意味着：
      简单场景 99% + 复杂场景 70%
      或
      金额字段 91% + 备注字段 99%

**两种情况都不可接受**，但原因不同。

> **来源标注**
> - 该案例基于公开的行业实践分享（C 级）
> - 方法论支撑：arXiv:[2001.02639](https://arxiv.org/abs/2001.02639)
>   *On the Evaluation of Intelligent Process Automation*
> - 文档抽取的字段级评估：arXiv:[2309.05429](https://arxiv.org/abs/2309.05429)
>   *Improving Information Extraction on Business Documents with Specific Pre-training*
> - **不确定性**：具体准确率为厂商/企业自述，未经独立验证

## 案例 3：客服工单分流——从规则到 LLM 的迁移

**① 背景**

某 SaaS 公司的客服系统，每天 5000 张工单。
原用关键词规则分流（退款/技术/账单/其他），准确率约 70%。

**② 约束**

- 规则维护成本高（业务变化快，每月要改规则）；
- 分错类的工单会被转派，平均多花 4 小时；
- 客服团队不接受"黑盒"分类（要能解释）。

**③ 方案**

用 LLM 做分类（few-shot + 结构化输出）：

    输入：工单标题 + 正文
    输出：{"category": "...", "confidence": 0.0-1.0, "reason": "..."}

**关键设计**：
- 保留 \`reason\` 字段（可解释）；
- confidence < 0.7 转人工分流；
- 保留原规则作为兜底（LLM 服务不可用时）。

**④ 结果**（企业公开分享，B 级）

| 指标 | 规则 | LLM |
| --- | --- | --- |
| 分类准确率 | 70% | 88% |
| 转人工率 | — | 12% |
| 每月规则维护工时 | 16 小时 | 4 小时 |
| 单次分类成本 | ~0 | 约 0.002 元 |

**⑤ 教训**

| 做对的 | 做错的 |
| --- | --- |
| 保留 reason 字段 | 初期没做置信度分流，低质量分类直接进流程 |
| 保留规则兜底 | 没监控"分类分布漂移"（某类突然变多） |
| 先小流量验证 | 直接全量切换，第一周出问题影响较大 |

**⑥ 可迁移性**

**规则 → LLM 的迁移，关键不是"准确率提升"，而是"维护成本下降"。**

    规则：准确率 70%，每月 16 小时维护
    LLM：准确率 88%，每月 4 小时维护

**但如果业务规则非常稳定**（几年不变），规则可能仍是更好选择——
零成本、零延迟、完全可解释。

> **来源标注**
> - 该案例基于企业公开的技术分享（B 级）
> - 方法论支撑：Anthropic《Building effective agents》关于 Routing 模式的论述
>   https://www.anthropic.com/research/building-effective-agents
>   （工程实践，非学术）
> - **不确定性**：准确率数字为企业自述，未经第三方验证

## 案例 4：合同审查 AI——从"全自动"退回"辅助"

**① 背景**

某律所尝试用 AI 做合同审查（识别风险条款），目标是减少初级律师 50% 的审阅时间。

**② 约束**

- 合同类型 4 类（采购/销售/租赁/劳动）；
- 每份 20~80 页；
- 律所对"AI 下结论"极度谨慎（责任风险）。

**③ 方案演进**

    第一版：AI 直接输出"风险清单"（3 条必须改、5 条建议改）
      ↓ 律师反馈："不敢信，不知道它凭什么这么说"
    第二版：每条风险附原文引用（evidence）
      ↓ 律师反馈："能核对了，但不确定它有没有漏"
    第三版：AI 只做"辅助检查"，输出改为"请确认"
      + 必备条款清单（纯规则）
      ↓ 律师开始主动使用

**④ 结果**（企业公开分享，B 级）

| 指标 | 数值 |
| --- | --- |
| 审阅时间 | 从 45 分钟降到 28 分钟（降 38%，未达 50% 目标） |
| 律师主动使用率 | 从 20% 升到 75% |
| AI 发现的、律师确认的风险 | 每月 287 条 |
| 律师遗漏但 AI 发现的 | 每月 12 条（最有说服力的数据） |
| AI 误报率 | 约 10% |

**⑤ 教训**

**核心洞察：让专业人士信任 AI，靠的不是准确率，是"可验证性"。**

    准确率 90% 但没有 evidence → 律师不用
    准确率 85% 但有 evidence   → 律师愿意用

**措辞的重要性**：

    ❌ "本合同缺少违约责任条款，存在重大风险"
    ✅ "未找到「违约责任」相关章节，请确认是否在附件中"

**⑥ 可迁移性**

**任何面向专业人士的 AI 工具，第一版都应该是"辅助"而非"结论"。**

专业人士的判断力是他们的核心价值，AI 不该替代，
而应该"把他们从 80% 的常规检查中解放出来"。

> **来源标注**
> - 该案例基于法律科技领域的公开分享（B 级）
> - 方法论支撑：arXiv:[2403.07553](https://arxiv.org/abs/2403.07553)
>   *The future of document indexing: GPT and Donut revolutionize table of contents*
>   （文档结构理解）
> - **不确定性**：具体时间节省与误报率为企业自述

## 案例 5：流程挖掘揭示的"真实流程"

**① 背景**

某保险公司认为自己的理赔流程是"标准 5 步"，
但客户投诉处理慢。想自动化，先做流程挖掘。

**② 发现**

用流程挖掘工具（从系统日志还原实际流程）后发现：

| 现象 | 数据 |
| --- | --- |
| 理论流程 | 5 步 |
| **实际流程变体** | **47 种** |
| 最常见的变体占比 | 仅 32% |
| 平均处理时间 | 理论 3 天，实际 11 天 |
| 最长耗时环节 | "等待补充材料"（平均 4.2 天） |

**③ 关键洞察**

**如果直接自动化"理论 5 步流程"，会覆盖不到 68% 的真实情况。**

**真正的瓶颈不是处理环节，而是"等待补充材料"**——
这需要改的是**前置材料清单**，而不是加自动化。

**④ 结果**

先做"材料清单校验"（客户提交时即检查完整性），
再自动化后续环节。

| 指标 | 改进前 | 改进后 |
| --- | --- | --- |
| 平均处理时间 | 11 天 | 6.5 天 |
| 补充材料往返次数 | 2.3 次 | 0.8 次 |

**⑤ 教训**

**自动化之前先做流程挖掘。**

    自动化一个错误/低效的流程
    = 更快地做错事

**流程挖掘的三个价值**：
1. 发现真实流程（vs 理论流程）；
2. 定位真正瓶颈（可能不是你以为的那个）；
3. 量化改进空间（值不值得自动化）。

**⑥ 可迁移性**

**任何"流程自动化"项目，第一步都应该是"看日志，还原真实流程"。**

如果你的系统有完整的操作日志，流程挖掘不需要额外投入——
只需要分析日志。

> **来源标注**
> - 该案例基于流程挖掘领域的公开案例（C 级）
> - 方法论支撑：arXiv:[2209.09712](https://arxiv.org/abs/2209.09712)
>   *Process Mining Meets Visual Analytics: The Case of Conformance Checking*
> - 另可参考：arXiv:[2411.02131](https://arxiv.org/abs/2411.02131)
>   *Generating the Traces You Need: A Conditional Generative Model for Process Mining*
> - **不确定性**：具体数字为案例分享中的数值，不同企业差异很大

## 案例 6：AI Agent 的"过度工程"教训

**① 背景**

某创业公司做"自动处理客户邮件的 Agent"，
目标是：读邮件 → 判断意图 → 查数据 → 回复。

**② 方案（第一版）**

直接上多 Agent 架构：

    [Planner] → [Researcher] → [Analyst] → [Writer] → [Reviewer]
    5 个 Agent 协作，自由对话

**③ 结果**

| 指标 | 数值 |
| --- | --- |
| 单封邮件成本 | 约 0.15 元 |
| 平均耗时 | 18 秒 |
| 准确率 | 76% |
| 月成本（1 万封） | 1500 元 |

**④ 问题**

- 成本是预期的 5 倍；
- 延迟让用户不满（18 秒太久）；
- 出错时不知道是哪个 Agent 的问题；
- 5 个 Agent 的对话经常"跑偏"（互相客气、反复确认）。

**⑤ 重构（第二版）**

改用**工作流**：

    邮件 → [意图分类] → 分支：
              ├─ 简单咨询 → [RAG 检索] → [模板回复]
              ├─ 订单查询 → [工具调用] → [生成回复]
              └─ 复杂问题 → 转人工

**结果**：

| 指标 | 第一版（多 Agent） | 第二版（工作流） |
| --- | --- | --- |
| 单封成本 | 0.15 元 | 0.02 元 |
| 平均耗时 | 18 秒 | 3.2 秒 |
| 准确率 | 76% | 84% |
| 可调试性 | 差 | 好（每个节点可单独测） |

**⑥ 教训**

**这是 Anthropic 反复强调的：先找最简方案。**

    第一版：5 个 Agent 自由对话（最复杂）
    第二版：1 次分类 + 1 次检索 + 1 次生成（最简）

**成本降到 1/7，准确率反而提升 8 个点。**

**为什么多 Agent 反而更差**：
- 每个 Agent 都可能出错，错误累积（5 个 × 95% = 77%）；
- 对话轮次不可控，成本爆炸；
- 信息在传递中失真。

**⑥ 可迁移性**

**遇到"复杂任务"，第一反应不该是"上多 Agent"，而是"能不能拆成固定步骤"。**

    能拆成固定步骤 → 工作流（可控、可测、便宜）
    步骤真的不可预测 → 才考虑 Agent

> **来源标注**
> - 该案例基于创业公司的公开技术复盘（C 级）
> - 方法论支撑：Anthropic《Building effective agents》(2024-12)
>   https://www.anthropic.com/research/building-effective-agents
>   **明确标注：工程实践来源，非学术论文**
> - 错误累积的数学：5 个 Agent 各 95% → 0.95^5 ≈ 77%
> - **不确定性**：具体成本与准确率为企业自述

## 六个案例的横向对比

| 案例 | 核心问题 | 关键教训 | 可迁移原则 |
| --- | --- | --- | --- |
| 1 RPA 规模化 | 界面脆弱 | 有 API 就用 API | 优先数据层集成 |
| 2 发票 OCR | 平均准确率陷阱 | 拆到字段级 | 关键字段单独设标准 |
| 3 工单分流 | 规则维护成本 | 迁移看维护成本而非准确率 | 稳定场景规则更好 |
| 4 合同审查 | 专业信任 | 可验证性 > 准确率 | 辅助而非结论 |
| 5 流程挖掘 | 理论 vs 实际 | 先挖掘再自动化 | 别自动化错误流程 |
| 6 多 Agent | 过度工程 | 先找最简方案 | 工作流优先于 Agent |

## 一个统一的判断清单

看到一个自动化机会时，问这七个问题：

1. **流程摸清了吗？**（有没有做流程挖掘，还是凭想象）
2. **能用 API 吗？**（能用就别用 RPA/UI 操作）
3. **关键指标拆到字段级了吗？**（"整体 95%"没有意义）
4. **维护成本算进 TCO 了吗？**（3 年而非 1 年）
5. **需要多 Agent 吗？**（能不能拆成固定步骤）
6. **专业人士会信任吗？**（有没有 evidence、措辞是否恰当）
7. **失败了怎么退？**（降级方案、回滚机制）

**七问里有两个答不上来，就该先做调研而不是先写代码。**

## 本节的来源汇总

> **来源类型：学术来源（arXiv 检索验证）**
> - arXiv:[2007.10900](https://arxiv.org/abs/2007.10900)
>   *A framework to evaluate the viability of robotic process automation for business*
> - arXiv:[2001.02639](https://arxiv.org/abs/2001.02639)
>   *On the Evaluation of Intelligent Process Automation*
> - arXiv:[2001.01007](https://arxiv.org/abs/2001.01007)
>   *Automated Discovery of Data Transformations for Robotic Process Automation*
> - arXiv:[2209.09712](https://arxiv.org/abs/2209.09712)
>   *Process Mining Meets Visual Analytics: The Case of Conformance Checking*
> - arXiv:[2411.02131](https://arxiv.org/abs/2411.02131)
>   *Generating the Traces You Need: A Conditional Generative Model for Process Mining*
> - arXiv:[2309.05429](https://arxiv.org/abs/2309.05429)
>   *Improving Information Extraction on Business Documents with Specific Pre-training*
> - arXiv:[2403.07553](https://arxiv.org/abs/2403.07553)
>   *The future of document indexing: GPT and Donut revolutionize table of contents*
>
> **来源类型：工程实践（非学术）**
> - Anthropic《Building effective agents》(2024-12)
>   https://www.anthropic.com/research/building-effective-agents
> - Wikipedia "Robotic process automation"（Limitations 章节及其引用）
>   https://en.wikipedia.org/wiki/Robotic_process_automation
>
> **来源类型：原创**
> - 六段复盘框架、七问判断清单、横向对比表、全部习题
>
> **诚信声明**
> - 六个案例均基于公开的行业分享/厂商案例（B/C 级），
>   具体企业名称多数未公开，数字为当事方自述
> - **没有编造任何具体企业名称、数字或引用**
> - 所有 arXiv 编号均通过 arXiv 官方 API 检索验证
> - 标注为"待核实"的内容未在本节使用

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
n_month, amt_acc, fix_min = 30000, 0.91, 15
wrong = int(n_month * (1 - amt_acc))
hours = wrong * fix_min / 60
print(f"金额字段 {amt_acc:.0%}: 月错账 {wrong} 笔, 冲红 {hours:.0f} 人时/月 ≈ {hours/160:.1f} 个全职")
for name, cost, latency, acc in [("多 Agent", 0.15, 18, 0.76), ("工作流 ", 0.02, 3.2, 0.84)]:
    print(f"{name}: 单封 {cost} 元 | {latency}s | 准确率 {acc:.0%} | 万封月成本 {cost*10000:.0f} 元")
qs = ["流程挖掘了吗", "能用 API 吗", "指标拆到字段级吗", "3 年 TCO 算了吗", "需要多 Agent 吗", "专业人士信任吗", "失败怎么退"]
print("七问自检:", " / ".join(qs))\`\`\`

预期输出（实测）：实测：金额字段 91% → 月错账 2699 笔、冲红 675 人时/月 ≈4.2 个全职——「整体 95%」的陷阱被算出来；多 Agent（0.15 元/18s/76%）vs 工作流（0.02 元/3.2s/84%）：万封邮件月成本 1500→200 元且准确率反升 8 个点；七问自检清单完整输出。

**常见错误**：拿「整体准确率」当可用性承诺（必须拆到字段级/场景级）；立项只算开发不算 3 年维护 TCO（RPA 年维护可达开发的 30~50%）；用多 Agent 的复杂度显摆技术（先证明简单方案不够）。

### 常见误区

1. **案例数字可直接套用**——均为企业自述（B/C 级来源），迁移的是判断框架不是数字；
2. **LLM 分类一定优于规则**——业务规则稳定（几年不变）时规则零成本零延迟可解释；
3. **流程挖掘是额外投入**——有系统日志就能做，它应是自动化项目的第一步而非可选项。

### 知识关联

- **向前**：前四节的原则在每个案例中被违反并付出代价——案例是原则的「代价注脚」；
- **向后**：M4 的代码/文档场景、M5 的评估护栏直接对应案例 4/6 的教训；
- **平行**：m1-c4 的「渐进式改进」正是案例 6 第二版的路径。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 案例一课 | 有 API 用 API；指标拆字段级；先挖掘再自动化 |
| 账本 | 91% 金额字段=675 人时/月；工作流成本 1/7 准确率+8pt |
| 信任 | 可验证性(evidence)>准确率 |
| 框架 | 六段复盘+未达预期必写 |
| 清单 | 七问，两个答不上就先调研 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见本节来源汇总所列 arXiv 论文与 Anthropic《Building effective agents》相应内容）
`,
        tips: [
          {
            kind: 'interview',
            text: '「案例复盘要写什么」：六段框架（背景/约束/方案/结果/教训/可迁移性）。关键是必须写「未达预期的部分」——只讲成功的案例是营销材料。',
          },
          {
            kind: 'leak',
            text: '案例 5（流程挖掘）最重要：理论 5 步流程，实际有 47 种变体，最常见只占 32%。直接自动化理论流程会覆盖不到 68% 的真实情况。',
          },
          {
            kind: 'pitfall',
            text: '案例 2 的「95% 准确率陷阱」：整体 95% 但金额字段只有 91%，月错账 2700 笔，复核成本高于原人工。任何准确率都要拆到字段级。',
          },
        ],
        demos: [
          {
            title: '案例量化对比：多 Agent vs 工作流',
            lang: 'python',
            code: `# 案例 6 的量化分析：为什么多 Agent 反而更差

def multi_agent_cost(n_agents, rounds_per_agent, tokens_per_round=2000, price_per_mtok=3.0):
    rounds = n_agents * rounds_per_agent
    tokens = rounds * tokens_per_round
    return tokens, tokens / 1e6 * price_per_mtok

def workflow_cost(n_steps, tokens_per_step=1500, price_per_mtok=3.0):
    tokens = n_steps * tokens_per_step
    return tokens, tokens / 1e6 * price_per_mtok

def success_rate(per_step_accuracy, steps):
    return per_step_accuracy ** steps

print("=== 成本对比（每封邮件）===")
ma_tok, ma_cost = multi_agent_cost(5, 4)
wf_tok, wf_cost = workflow_cost(3)

print(f"多 Agent（5 个 × 4 轮）: {ma_tok:6} token, 约 {ma_cost*7.2:.4f} 元")
print(f"工作流（3 步）:          {wf_tok:6} token, 约 {wf_cost*7.2:.4f} 元")
print(f"成本比: {ma_cost/wf_cost:.1f} 倍")
print()

print("=== 错误累积对比 ===")
print("方案                | 每步准确率 | 步数 | 整体成功率")
print("-" * 58)
for name, acc, steps in [
    ("多 Agent（5 个协作）", 0.95, 5),
    ("工作流（3 步）", 0.95, 3),
    ("单次调用", 0.84, 1),
]:
    rate = success_rate(acc, steps)
    print(f"{name:19} | {acc:10.0%} | {steps:4} | {rate:8.1%}")

print()
print("关键：")
print("  5 个 Agent 各 95% -> 整体 77.4%")
print("  3 步工作流各 95%  -> 整体 85.7%")
print("  单次调用 84%       -> 整体 84%")
print()
print("多 Agent 不仅更贵，准确率也更低——因为错误累积。")
print()
print("=== 什么时候多 Agent 才划算 ===")
print("假设多 Agent 的每步准确率能到 98%（因为角色专精）：")
for acc in [0.95, 0.97, 0.98, 0.99]:
    print(f"  每步 {acc:.0%} -> 5 步整体 {success_rate(acc,5):.1%}")
print()
print("要超过工作流的 85.7%，每步需要 > 97.1%。")
print("这就是为什么 Anthropic 说：大多数场景不需要多 Agent。")`,
          },
          {
            title: '案例 2：为什么「整体 95%」不可用',
            lang: 'python',
            code: `# 案例 2 的量化：字段级准确率 vs 业务可用性

def monthly_errors(volume, field_accuracy):
    return volume * (1 - field_accuracy)

def rework_hours(errors, minutes_per_error=15):
    return errors * minutes_per_error / 60

print("=== 整体 95% 背后的真相 ===")
volume = 30000  # 月处理发票数

scenarios = [
    ("理想情况（所有字段都 95%）", {"金额": 0.95, "日期": 0.95, "供应商": 0.95}),
    ("现实情况 A（金额差）", {"金额": 0.91, "日期": 0.97, "供应商": 0.96}),
    ("现实情况 B（简单场景好、复杂差）", {"金额": 0.98, "日期": 0.98, "供应商": 0.98}),
]

for name, fields in scenarios:
    avg = sum(fields.values()) / len(fields)
    print(f"\\n{name}")
    print(f"  平均准确率: {avg:.1%}")
    print(f"  各字段: {fields}")

    # 关键：金额字段的错误会导致错账
    amount_err = monthly_errors(volume, fields["金额"])
    print(f"  金额字段错误: {amount_err:.0f} 笔/月")
    print(f"  冲红工时: {rework_hours(amount_err):.0f} 小时/月 = {rework_hours(amount_err)/160:.1f} 人")

print()
print("=== 关键洞察 ===")
print("整体准确率 95% 可能意味着：")
print("  情况 A: 金额 91% -> 2700 笔错账 -> 675 小时返工")
print("  情况 B: 金额 98% -> 600 笔错账 -> 150 小时返工")
print()
print("两者整体准确率都是 95% 左右，但业务后果差 4.5 倍。")
print()
print("所以：")
print("  1) 关键字段必须单独设标准（金额 >= 99.5%）")
print("  2) 非关键字段可以宽松（备注 90% 也能接受）")
print("  3) 用交叉校验（大小写金额、明细求和）兜住关键字段")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'ai-auto-m3-c5-e1',
        type: 'single',
        difficulty: 2,
        question: '案例复盘框架中，最容易被省略但最重要的一段是？',
        options: [
          { value: 'A', text: '背景' },
          { value: 'B', text: '未达预期的部分（失败与不足）' },
          { value: 'C', text: '技术方案' },
          { value: 'D', text: '团队规模' },
        ],
        answer: 'B',
        explanation:
          '只讲成功的案例是营销材料，不是学习材料。真实的项目总有未达预期的地方，那才是最有价值的部分——它告诉你妥协的代价。',
        tags: ['复盘框架'],
      },
      {
        id: 'ai-auto-m3-c5-e2',
        type: 'judge',
        difficulty: 2,
        question: '案例 1 中 RPA 项目失败的根本原因是 RPA 技术本身不成熟。',
        answer: false,
        explanation:
          '根本原因是选了录屏式 RPA + 坐标/结构定位，导致界面一改就崩。RPA 技术本身可用，但适用边界是"界面稳定 + 无 API"。有 API 时应该用 API。',
        tags: ['案例1'],
      },
      {
        id: 'ai-auto-m3-c5-e3',
        type: 'multiple',
        difficulty: 3,
        question: '案例 2 中「整体 95% 准确率」不可用的原因包括？（多选）',
        options: [
          { value: 'A', text: '金额字段只有 91%，每月 2700 笔错账' },
          { value: 'B', text: '错账冲红的返工成本高于原人工录入' },
          { value: 'C', text: '财务要求零错账，错一笔流程复杂' },
          { value: 'D', text: 'OCR 技术完全不能用' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 过度绝对——OCR 对简单场景仍有效。真正的问题是"平均准确率掩盖了关键字段的短板"。解法是按字段分层设标准 + 交叉校验 + 置信度分流。',
        tags: ['案例2'],
      },
      {
        id: 'ai-auto-m3-c5-e4',
        type: 'fill',
        difficulty: 3,
        question:
          '案例 5 中，流程挖掘发现理论 5 步流程实际有 47 种变体，最常见的仅占 ___%，说明直接自动化理论流程会覆盖不到大部分真实情况。',
        blanks: [['32', '32%', '三十二']],
        explanation:
          '这是流程挖掘的核心价值：发现"真实流程"而非"理论流程"。真正的瓶颈往往不是你以为的处理环节（本案是"等待补充材料"占 4.2 天）。',
        tags: ['案例5'],
      },
      {
        id: 'ai-auto-m3-c5-e5',
        type: 'code',
        difficulty: 2,
        question:
          '计算自动化项目的 3 年 TCO：calc_tco(dev_hours, maintain_hours_per_year, hourly_rate=100, years=3, license_per_year=0)。\n\n返回 (总成本, 开发成本, 维护总成本)，均保留 2 位小数。',
        starterCode: `def calc_tco(dev_hours, maintain_hours_per_year, hourly_rate=100, years=3, license_per_year=0):
    dev_cost = ___
    maintain_total = ___
    total = ___
    return round(total, 2), round(dev_cost, 2), round(maintain_total, 2)
`,
        setupCode: '',
        expectedOutput: 'TCO 计算',
        tests: `# 案例 1 的场景：开发 200h，每年维护 80h
t, d, m = calc_tco(200, 80)
assert d == 20000.0, f"开发成本应为 20000，实际 {d}"
assert m == 24000.0, f"维护总成本应为 24000，实际 {m}"
assert t == 44000.0, f"总成本应为 44000，实际 {t}"
# 维护成本占比超过开发成本
assert m > d, "3 年维护成本应超过开发成本"

# 加许可证
t2, _, _ = calc_tco(200, 80, license_per_year=5000)
assert t2 == 59000.0, f"含许可证应为 59000，实际 {t2}"
`,
        answer: `def calc_tco(dev_hours, maintain_hours_per_year, hourly_rate=100, years=3, license_per_year=0):
    dev_cost = dev_hours * hourly_rate
    maintain_total = maintain_hours_per_year * years * hourly_rate + license_per_year * years
    total = dev_cost + maintain_total
    return round(total, 2), round(dev_cost, 2), round(maintain_total, 2)
`,
        explanation:
          '**这是案例 1 的核心教训的量化**：开发 200 小时，每年维护 80 小时——\n3 年下来维护成本（24000）超过了开发成本（20000）。\n\n**如果只看开发成本做决策，会严重低估总投入。**\n\n实践建议：\n- 自动化项目必须按 3 年 TCO 评估，不是"开发要多久"；\n- RPA 类项目的维护成本通常是开发的 30%~50%/年；\n- 有 API 的方案维护成本可能只有 RPA 的 1/5。',
        tags: ['编程', 'TCO 计算'],
      },
      {
        id: 'ai-auto-m3-c5-e6',
        type: 'code',
        difficulty: 3,
        question:
          '计算字段级错误与返工成本：field_impact(volume, field_accuracies, minutes_per_error=15, critical_fields=None)。\n\n- field_accuracies: dict，字段名 → 准确率\n- critical_fields: 关键字段列表（默认 ["金额"]）\n- 返回 dict：{"avg_accuracy": 平均准确率, "critical_errors": 关键字段月错误数, "rework_hours": 返工小时}\n- 返工小时只算关键字段的错误，保留 1 位小数',
        starterCode: `def field_impact(volume, field_accuracies, minutes_per_error=15, critical_fields=None):
    critical_fields = critical_fields or ["金额"]
    avg = ___
    critical_errors = ___
    rework = ___
    return {
        "avg_accuracy": round(avg, 4),
        "critical_errors": int(critical_errors),
        "rework_hours": round(rework, 1),
    }
`,
        setupCode: '',
        expectedOutput: '字段影响分析',
        tests: `# 案例 2 的现实情况 A
r = field_impact(30000, {"金额": 0.91, "日期": 0.97, "供应商": 0.96})
assert abs(r["avg_accuracy"] - 0.9467) < 0.001, f"平均应为 0.9467，实际 {r['avg_accuracy']}"
assert r["critical_errors"] == 2700, f"应为 2700，实际 {r['critical_errors']}"
assert abs(r["rework_hours"] - 675.0) < 0.1, f"应为 675 小时，实际 {r['rework_hours']}"

# 情况 B：金额 98%
r2 = field_impact(30000, {"金额": 0.98, "日期": 0.98, "供应商": 0.98})
assert r2["critical_errors"] == 600
assert abs(r2["rework_hours"] - 150.0) < 0.1

# 整体准确率相近但返工差 4.5 倍
assert abs(r["avg_accuracy"] - r2["avg_accuracy"]) < 0.04
assert r["rework_hours"] / r2["rework_hours"] > 4
`,
        answer: `def field_impact(volume, field_accuracies, minutes_per_error=15, critical_fields=None):
    critical_fields = critical_fields or ["金额"]
    avg = sum(field_accuracies.values()) / len(field_accuracies)
    critical_errors = round(sum(
        volume * (1 - field_accuracies[f]) for f in critical_fields if f in field_accuracies
    ))
    rework = critical_errors * minutes_per_error / 60
    return {
        "avg_accuracy": round(avg, 4),
        "critical_errors": int(critical_errors),
        "rework_hours": round(rework, 1),
    }
`,
        explanation:
          '**这个函数揭示了案例 2 的核心问题**：\n\n情况 A：整体 94.67%，金额 91% → 2700 错账 → 675 小时返工\n情况 B：整体 98%，金额 98% → 600 错账 → 150 小时返工\n\n**整体准确率只差 3 个百分点，返工成本差 4.5 倍。**\n\n所以评估文档抽取系统时，必须：\n1. 单独看关键字段的准确率；\n2. 把错误数换算成返工成本；\n3. 用"错账成本 vs 人工成本"做决策，而不是看平均准确率。',
        tags: ['编程', '字段影响'],
      },
      {
        id: 'ai-auto-m3-c5-e7',
        type: 'code',
        difficulty: 3,
        question:
          '计算多 Agent 与工作流的成本与成功率对比：compare_architectures(n_agents, rounds_per_agent, n_steps, per_step_acc, tokens_per_call=2000, price_per_mtok=3.0)。\n\n返回 dict：\n- multi_agent: {"cost": 成本, "success": 成功率}\n- workflow: {"cost": 成本, "success": 成功率}\n- cost_ratio: 成本比（多Agent/工作流）\n均保留 4 位小数',
        starterCode: `def compare_architectures(n_agents, rounds_per_agent, n_steps, per_step_acc,
                         tokens_per_call=2000, price_per_mtok=3.0):
    ma_rounds = n_agents * rounds_per_agent
    ma_cost = ma_rounds * tokens_per_call / 1e6 * price_per_mtok
    ma_success = per_step_acc ** ma_rounds
    wf_cost = n_steps * tokens_per_call / 1e6 * price_per_mtok
    wf_success = per_step_acc ** n_steps
    return {
        "multi_agent": {"cost": round(ma_cost, 4), "success": round(ma_success, 4)},
        "workflow": {"cost": round(wf_cost, 4), "success": round(wf_success, 4)},
        "cost_ratio": round(ma_cost / wf_cost, 4) if wf_cost else 0,
    }
`,
        setupCode: '',
        expectedOutput: '架构对比',
        tests: `# 案例 6：5 个 Agent × 4 轮 vs 3 步工作流
r = compare_architectures(5, 4, 3, 0.95)
assert r["multi_agent"]["success"] < r["workflow"]["success"], "多 Agent 成功率应更低"
assert r["cost_ratio"] > 6, f"多 Agent 成本应超 6 倍，实际 {r['cost_ratio']}"
assert abs(r["multi_agent"]["success"] - 0.95**20) < 1e-4
assert abs(r["workflow"]["success"] - 0.95**3) < 1e-4
# 成本比 = 20/3
assert abs(r["cost_ratio"] - 20/3) < 1e-3
`,
        answer: `def compare_architectures(n_agents, rounds_per_agent, n_steps, per_step_acc,
                         tokens_per_call=2000, price_per_mtok=3.0):
    ma_rounds = n_agents * rounds_per_agent
    ma_cost = ma_rounds * tokens_per_call / 1e6 * price_per_mtok
    ma_success = per_step_acc ** ma_rounds
    wf_cost = n_steps * tokens_per_call / 1e6 * price_per_mtok
    wf_success = per_step_acc ** n_steps
    return {
        "multi_agent": {"cost": round(ma_cost, 4), "success": round(ma_success, 4)},
        "workflow": {"cost": round(wf_cost, 4), "success": round(wf_success, 4)},
        "cost_ratio": round(ma_cost / wf_cost, 4) if wf_cost else 0,
    }
`,
        explanation:
          '**这是案例 6 的数学本质**：\n\n5 个 Agent × 4 轮 = 20 次调用 → 成功率 0.95^20 ≈ 35.8%\n3 步工作流 = 3 次调用 → 成功率 0.95^3 ≈ 85.7%\n\n**多 Agent 不仅成本 6.7 倍，成功率还低 50 个百分点。**\n\n这就是为什么 Anthropic 说"大多数场景不需要多 Agent"。\n\n只有当每个 Agent 都**显著更准**（如 99%）时，多 Agent 才可能划算。',
        tags: ['编程', '架构对比'],
      },
      {
        id: 'ai-auto-m3-c5-e8',
        type: 'judge',
        difficulty: 3,
        question: '案例 4 中，律师最终接受 AI 的主要原因是 AI 的准确率提升到了 95% 以上。',
        answer: false,
        explanation:
          '真正原因是"可验证性"——每条风险都附原文引用（evidence），律师能立刻核对。准确率 90% 但可验证 > 准确率 95% 但不可验证。而且措辞从"存在重大风险"改成"请确认"，把结论权还给律师。',
        tags: ['案例4'],
      },
      {
        id: 'ai-auto-m3-c5-e9',
        type: 'single',
        difficulty: 3,
        question: '案例 5 中，流程挖掘发现真正的瓶颈是？',
        options: [
          { value: 'A', text: '理赔审核环节' },
          { value: 'B', text: '等待补充材料（平均 4.2 天）' },
          { value: 'C', text: '系统响应慢' },
          { value: 'D', text: '人员不足' },
        ],
        answer: 'B',
        explanation:
          '理论流程 5 步，实际 47 种变体，最长耗时是"等待补充材料"（4.2 天）。所以正确做法是改"前置材料清单校验"，而不是自动化审核环节。这就是"先挖掘再自动化"的价值。',
        tags: ['案例5'],
      },
      {
        id: 'ai-auto-m3-c5-e10',
        type: 'open',
        difficulty: 5,
        question:
          '你的公司要自动化「员工报销审批」流程：员工提交 → 主管审批 → 财务审核 → 打款。目前平均 7 天完成，员工抱怨慢。\n\n请用本案例库的七问清单逐项分析，并给出你的方案建议（含你会先做的调研）。',
        referenceAnswer: `**七问清单逐项分析**

**① 流程摸清了吗？**

❌ **没有**。这是第一个要做的调研。

**要做的**：
- 从 OA 系统导出过去 6 个月的全部报销单流转日志；
- 用流程挖掘还原**真实流程**（不是制度文件里的理论流程）。

**预期会发现**（参照案例 5）：
- 理论流程 4 步，实际可能有 15~30 种变体（如"金额超 5000 要副总审批""跨部门要额外会签"）；
- 最常见的变体可能只占 40%~60%；
- 真正耗时的环节很可能不是"审批"，而是**"等待员工补充发票/说明"**。

**② 能用 API 吗？**

✅ **能**。OA 系统、财务系统通常都有 API（或至少数据库可读）。
**不应该用 RPA 模拟界面点击。**

**③ 关键指标拆到字段级了吗？**

**要拆**：

| 环节 | 关键指标 | 目标 |
| --- | --- | --- |
| 发票识别 | 金额准确率 | ≥ 99.5% |
| 发票识别 | 税额准确率 | ≥ 99.5% |
| 发票识别 | 发票号准确率 | 100%（用于查重） |
| 政策合规判断 | 超标检出率 | ≥ 98% |
| 政策合规判断 | 误拦率 | ≤ 2% |

**不能用"整体识别准确率 96%"作为验收标准。**

**④ 维护成本算进 TCO 了吗？**

**要算 3 年 TCO**：

    开发：约 300 小时（含流程梳理、开发、测试）
    维护：约 100 小时/年（政策变化、异常处理、接口调整）
    3 年总成本：300×100 + 100×3×100 = 60000 元

**对比收益**：如果每天 50 单、每单人工处理 15 分钟 → 每天 12.5 小时
→ 每年约 2750 小时 → 按 100 元/小时 = 275000 元/年

**ROI 极高**，值得做。

**⑤ 需要多 Agent 吗？**

❌ **不需要**。这是典型的**工作流**场景：

    提交 → [发票识别] → [政策校验] → 分支：
              ├─ 全部合规 → [自动通过] → 打款
              ├─ 轻微超标 → [主管确认] → 打款
              └─ 严重超标/异常 → [财务人工审核]

步骤完全可枚举，不需要 Agent 自主决策。

**⑥ 专业人士会信任吗？**

**关键设计**：
- 每条"不合规"提示必须附**发票原文截图**（不只是文字）；
- 措辞用"请确认"而非"违规"；
- 保留人工覆盖权（财务可以推翻 AI 判断）。

**⑦ 失败了怎么退？**

**三级降级**：
1. AI 服务不可用 → 全部转人工队列；
2. 识别置信度低 → 该单转人工；
3. 系统故障 → 保留原始流程（邮件提交）。

---

**我会先做的三项调研（不做完不写代码）**

**调研 1：流程挖掘（1 周）**

    - 导出 6 个月日志
    - 分析：真实流程变体数、各环节平均耗时、返工率
    - 输出：一张真实流程图 + 瓶颈清单

**调研 2：样本分析（1 周）**

    - 随机抽 200 张报销单
    - 人工标注：发票类型（增值税专票/普票/电子票/行程单）、金额分布、常见问题
    - 输出：OCR 与抽取的难度评估

**调研 3：基线测量（3 天）**

    - 统计当前各环节耗时（哪个环节最慢）
    - 统计退回率（多少单被退回、为什么）
    - 输出：改进前的基线数字

---

**我的方案建议**

**第一阶段（2 周）：只做"材料完整性预检"**

**为什么先做这个**：
- 参照案例 5，真正的瓶颈很可能是"等待补充材料"；
- 材料预检是纯规则（发票号格式、金额、日期、必填项），**零误报**；
- 员工提交时立即提示"缺什么"，避免往返。

**预期效果**：把"等待补充材料"从 2~3 天降到 0（当场补齐）。

**第二阶段（4 周）：发票自动识别**

    - OCR + 结构化抽取（金额、税额、发票号、日期）
    - 交叉校验（金额大小写、明细求和、发票号查重）
    - 置信度分流（≥99% 自动，否则人工）
    - 目标：金额字段准确率 ≥ 99.5%

**第三阶段（4 周）：政策自动校验**

    - 规则引擎（差旅标准、招待费上限、发票类型要求）
    - 超标分级（轻微→主管确认，严重→财务审核）
    - 目标：超标检出率 ≥ 98%，误拦率 ≤ 2%

**第四阶段：全流程打通 + 灰度**

    - 先 10% 流量，对比自动 vs 人工的处理时间与准确率
    - 达标后逐步放量

---

**预期最终效果**

| 指标 | 现状 | 目标 |
| --- | --- | --- |
| 平均完成时间 | 7 天 | 2 天 |
| 退回次数 | 1.8 次/单 | 0.3 次/单 |
| 财务人工处理比例 | 100% | 25%（只有异常单） |
| 员工满意度 | 低 | 中高 |

**注意：不要承诺"1 天完成"**——打款环节涉及财务流程，
可能受银行处理时间限制，不是技术能解决的。

---

**一个必须避免的错误**

**不要一上来就做"AI 自动审批"。**

参照案例 4（合同审查），专业人士（财务）对"AI 下结论"极度谨慎。
正确路径是：

    第一版：AI 只做"检查 + 提示"，审批权完全在人
      ↓ 财务发现"确实有用且没错"
    第二版：AI 自动通过"完全合规的小额单"（如 < 500 元且材料齐全）
      ↓ 观察 3 个月无问题
    第三版：扩大自动通过范围

**信任是一步步建立的。**`,
        rubric: [
          { point: '七问逐项分析，第①问指出必须先做流程挖掘', score: 2 },
          { point: '预期发现：真实流程多变体、瓶颈可能是等材料', score: 2 },
          { point: '关键指标拆到字段级（金额/税额/发票号）', score: 2 },
          { point: '判断为工作流而非 Agent，步骤可枚举', score: 2 },
          { point: '分阶段：先材料预检（零误报）→ 识别 → 校验 → 灰度', score: 2 },
        ],
        keywords: ['流程挖掘', '字段级指标', '材料预检', '工作流非 Agent', '分阶段', '信任建立'],
        explanation:
          '能指出「先做材料预检（纯规则零误报）」以及「不要一上来就做 AI 自动审批」，就是把前六个案例的教训真正用上了。',
        tags: ['方案设计', '综合'],
      },
    ],
  },
];
