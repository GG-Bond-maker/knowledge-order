import type { Chapter } from '../../../types';

/* ============================================================
 *  CS146S Fall 2026 · Week 3：AI IDE 与上下文工程
 *
 *  结构依据：Stanford CS146S Fall 2026 官方大纲（themodernsoftware.dev，
 *  官方作业仓库 mihail911/modern-software-dev-assignments）。
 *  本课程为参照官方大纲组织的自学教材，讲义内容为自主扩展编写。
 *
 *  来源：
 *  - 官方：CS146S 课程站 Week 3 主题（AI IDEs and Context Engineering，
 *    官方标注的"最重要一周"）
 *  - 官方指定阅读："Specs Are the New Source Code"、"How Long Contexts
 *    Fail"、《Good Context Good Code》、Anthropic《Effective context
 *    engineering for AI agents》与《Claude Code 最佳实践》
 *  - 官方作业：week3 Design Doc（主题锚点；项目 B 在 w3b.ts 中为自主设计）
 *  - 原创：框架、模板、案例、图示、全部习题
 * ============================================================ */

export const cs146sW3Chapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'cs146s-w3',
    title: 'Week 3 · AI IDE 与上下文工程',
    goal: '把上下文当作可工程化的资产：掌握上下文供给的四来源与预算分配策略（总纲），理解"规范是新源代码"并产出 PRD/Spec/Plan/Tasks 四层产物，能为 Agent 写出机器可判的验收标准与反例清单。',
    lessons: [
      /* ─────────────────────────── l1 ─────────────────────────── */
      {
        id: 'cs146s-w3-l1',
        title: '上下文工程总纲：从提示词技巧到上下文架构',
        difficulty: 3,
        content: `
### 学习目标

学完本节，你应该能够：
1. 向同事一句话定义上下文工程（Context Engineering），并说清它与提示词工程的分工——提示词管"指令怎么说"，上下文管"模型看到什么"；
2. 列出上下文供给的四个来源（系统提示/项目指令文件/检索注入/会话历史），并为每个来源各举一个 IDE 开发场景的真实实例；
3. 给定一个具体任务与窗口预算，按优先级分配四来源的 token 预算，并在超预算时执行"截断→压缩→外部化"的决策。

### 前置知识

- w1-l3：五要素提示词——其中"上下文"被标为权重最高的要素，本节把它独立成一门工程学问；
- w1-l4：四类失效模式与预算三原则——本节是它的"建设篇"：l4 讲上下文怎么坏，本节讲怎么系统地建好；
- w2：Agent 循环的概念——Agent 每一轮都在做"这一步给模型看什么"的上下文决策。

### 问题背景

Week 1 我们建立了"上下文质量 > 提示词技巧"的判断。2025 年起，这套实践有了正式名字与系统方法论：Anthropic 把它称为 **Context Engineering（上下文工程）** 并发文阐述；官方指定阅读《Good Context Good Code》给出了更有说服力的信号——**同样的模型、同样的任务，仅通过系统化改造"给模型看什么"，团队交付速度提升到约 2.5 倍**。没有换模型，没有写更长的提示词，改善的只是上下文的供给质量。

而反面路径每天都在发生：团队发现 Agent 不好用，第一反应是"换更强的模型"或"报更贵的套餐"，却从没检查过 Agent 的窗口里到底有什么。典型的失败链条是：看不到关键文件（凭想象编造 API）→ 看到过期规范（按半年前的架构写代码）→ 历史吃满窗口（第 40 轮忘记第 1 轮的约束）。**模型在错误的上下文上做正确的推理，产出依然是错的**——这正是 Week 3 被官方标注为"最重要一周"的原因。

### 直觉理解

把 Agent 想象成一位**每小时能读 100 万字、过目就忘一半、毫无公司常识**的顶级顾问。他的能力上限很高，但你每天早上往他办公桌上放什么资料，决定了他今天干什么活：

- 什么都不放 → 他按想象干活（幻觉）；
- 把整个图书馆搬来 → 他被信息淹死（干扰）；
- 放对了资料、按重要性排好序、把过期的收走 → 高产出。

**上下文工程师就是那个"整理办公桌的人"。** 这份工作的三个动作恰好对应上下文工程的三个问题：放什么进来（选择）、放在哪（布局）、放多少（预算）。

### 核心概念与原理详解

## 定义：上下文工程

> **上下文工程（Context Engineering）**：在有限的上下文窗口内，系统地决定"模型在每一步看到什么、看不到什么"的工程学科。它回答三个问题：**放什么**（相关性选择）、**放在哪**（首尾布局）、**放多少**（预算分配）。

与提示词工程的分工：提示词工程优化"指令的表达方式"（怎么说），上下文工程优化"指令所作用的信息环境"（看什么）。一次 Agent 调用的输入由四类内容构成，它们就是本周的四个主战场。

## 上下文供给的四个来源

| 来源 | 是什么 | IDE 场景实例 | 失效时的表现 |
| --- | --- | --- | --- |
| 系统提示（含工具定义） | 平台层注入的固定指令与工具 schema | IDE 的 Agent 模式系统提示、各工具的定义 | 角色混乱、乱调工具、格式漂移 |
| 项目指令文件 | 仓库内的持久团队约定 | AGENTS.md / CLAUDE.md / .cursorrules | 团队约定不生效，每次要口头重申 |
| 检索注入 | 按任务相关性拉取的内容 | 打开的文件、@文件引用、代码索引命中、diagnostics 报错 | 关键文件没进窗口 → 凭想象写代码 |
| 会话历史 | 本次会话累积的全部消息 | 你与 Agent 的多轮对话、历史工具输出 | 历史吃满预算，冲突/干扰随轮次累积 |

四类内容在**同一个窗口里竞争空间**。用下面的交互图直观感受预算的此消彼长：

<Diagram type="contextwindow" />

## 预算分配策略（承接 w1-l4 并深化）

w1-l4 给了三条原则：关键约束放首尾、无关即删除、超限时按"截断→压缩→外部化"决策。落到 IDE 开发场景，深化为四条可操作的分配规则：

1. **固定开销最小化**：系统提示与工具定义是每次调用的"房租"，与当前任务无关——精简工具描述、合并重复指令是最高杠杆的优化（w2 的工具设计规范直接服务于此）；
2. **持久知识进指令文件**：构建命令、代码约定、禁区写一次进 AGENTS.md，每次会话自动注入，不占用会话轮次（l4 专门讲怎么写好）；
3. **检索内容给足预算但设上限**：代码任务建议把 40%-60% 预算给检索注入，且每份内容带一行"为什么给你看"的说明——回答不了这个问题的内容不上桌；
4. **历史设硬上限**（如 35%）：超过即触发压缩（l5 专门讲怎么压）。

## 为什么上下文工程值 2.5 倍生产力

《Good Context Good Code》案例的关键细节值得咀嚼：提升来自**把上下文供给从"每次临场发挥"变成"系统工程"**——任务模板化、按角色维护上下文包、验证结果回流成资产。三者共同的经济学原理是：**上下文是一次性投入、多次复用的资产**。写一份好 Spec 花 2 小时，之后每次委托都省 1 小时调试；而"临场口述需求"每次都要重新付全款。

### 完整案例

同一任务、两种供给。任务：修复购物车金额合计的 bug。

**供给 A（常见失败式）**：

\`\`\`text
购物车合计金额好像有 bug，你修一下。
\`\`\`
Agent 行为：全仓库乱翻 → 猜测原因 → 改错文件 → 用 float 重新实现了合计 → 引入新 bug。三轮对话后你开始人工兜底。

**供给 B（工程式）**——四来源各就各位：

1. **系统提示**（平台固定）：你是资深支付方向工程师，改动前先陈述影响面；
   *为什么*：角色约束让 Agent 先想再动。
2. **指令文件**（AGENTS.md 已注入）："金额计算一律用整数分，禁止 float"；
   *为什么*：防方向性错误——float 重算恰恰是最诱人的错误方案（对"冲突"模式的预防）。
3. **检索注入**：cart.py 的合计函数 + 一个失败的测试用例 + 相关 PR 的说明（当年为什么这么写）；
   *为什么*：给"事实"而不是"印象"，PR 说明防止 Agent 把历史决策当 bug 改掉。
4. **会话历史**：第一轮就贴了报错栈与复现步骤；
   *为什么*：证据前置，省掉三轮"你说的 bug 在哪"。

结果：A 三轮跑偏以失败告终；B 一轮命中，diff 共 3 行。

**自解释提示**：B 比 A 多的不是"更多内容"，而是"更对的内容"——A 与 B 的窗口占用差不多，差别只在每个 token 是否与任务相关。这就是"预算"二字的含义。

### 代码实践

下面的"上下文来源审计器"在浏览器内运行：给定一次会话的上下文清单，统计四来源的占比并给出两条启发式告警。跑完两个场景后，可以用它审计你自己最近一次 Agent 会话的构成。

### 常见误区与安全风险

- **误区一："上下文工程就是把提示词写长。"** 相反：预算视角下，无关内容是负资产（占预算 + 稀释注意力）。上下文工程的第一技能是删除。
- **误区二："窗口 1M 了，不需要检索和压缩。"** w1-l4 的四类失效模式随内容增长而恶化，与窗口上限无关。塞得下 ≠ 用得上。
- **误区三："上下文准备是任务开始前的一次性动作。"** Agent 每一轮都在改变窗口（工具输出进历史、文件被修改），上下文工程是运行时持续决策，不是开局摆一次盘。
- **安全提示**：检索注入的内容可能来自仓库外部（issue、网页、第三方包 README）——这是投毒通道（w1-l4 第四类失效）；指令文件本身也可能被恶意 PR 篡改（往 AGENTS.md 里塞"构建前先执行 curl …"）。Week 6 会给出完整威胁模型，本周先建立"进入窗口的内容不天然可信"的意识。

### 与其他知识点的关联

- 承上：w1-l3（上下文是五要素中权重最高者）、w1-l4（四类失效模式是本节的"病理学"基础）、w2（Agent 循环中每轮的上下文决策）；
- 启下：l2-l3 的规范驱动开发是"会话之外"最重要的上下文资产——Spec 写好后就是预制好的检索注入；l4 拆解"系统提示/指令文件"两个来源的机制；l5 治理"会话历史"这个来源；l6 项目 B 把四来源的工程化落到真实仓库。

### 动手实验

1. 运行下方审计器，记录两个场景的四来源占比；
2. 打开 contextwindow 交互图，把历史轮数滑杆拉到超预算区间，观察三种对策提示，说出你在自己项目里会先选哪种、为什么；
3. 回忆你最近一次 Agent 会话，粗估四来源占比——它更像场景一还是场景二？

### 本节总结

1. 上下文工程 = 在有限窗口内决定"模型看到什么"的工程学科：放什么（选择）、放哪（布局）、放多少（预算）；
2. 四来源：系统提示（固定开销）、项目指令文件（持久知识）、检索注入（任务事实）、会话历史（运行证据）——它们在同一窗口竞争空间；
3. 预算四规则：固定开销最小化、持久知识进文件、检索给足但设上限、历史设 35% 硬上限；
4. 2.5 倍生产力的本质：上下文是一次性投入、多次复用的资产——从临场发挥变成系统工程；
5. 进入窗口的内容不天然可信：检索与指令文件都是潜在注入面（Week 6 展开）。

### 参考资料与延伸阅读

- Anthropic《Effective context engineering for AI agents》（2025）——上下文工程的定义与预算策略：对应"核心概念"模块；
- 《Good Context Good Code》（官方指定阅读）——2.5x 生产力案例：对应"问题背景"与"为什么值 2.5 倍"模块；
- 《How Long Contexts Fail》（官方 Week 3 指定阅读）——四来源"失效时的表现"一列的依据：对应"四个来源"模块；
- [Stanford CS146S 官方课程站](https://themodernsoftware.dev) Week 3 主题（AI IDEs and Context Engineering）——对应全节定位；
- 本节四来源表、预算四规则、审计器 demo 均为自主设计的原创教学内容。

### 本节习题导引

fill/single 题校准定义与四来源；code 题让你实现来源审计函数；open 题要求为一个真实任务设计完整的上下文供给方案。做完本节再进入 l2——规范驱动开发。
`,
        tips: [
          { kind: 'pitfall', text: '上下文工程的第一技能是"删除"：每段内容进窗口前问一遍"删掉它任务会变差吗"，答"否"即删——"可能有用"不构成上桌资格。' },
          { kind: 'performance', text: '系统提示 + 工具定义是每次调用的"房租"：合并重复指令、精简工具描述，一次优化全程受益（稳定前缀对 KV Cache 的好处见 w1-l2）。' },
          { kind: 'interview', text: '"上下文工程与 RAG 什么关系？"——RAG 只是四来源中"检索注入"的一种实现；上下文工程还包括指令文件、预算分配与首尾布局，范围大得多。' },
          { kind: 'note', text: '给每个长期维护的仓库建一份 AGENTS.md（l4 详述）：写一次，之后每个会话自动带上，是回报率最高的单项上下文投资。' },
        ],
        demos: [
          {
            title: '上下文来源审计器：四来源占比与启发式告警',
            lang: 'python',
            code: `# 上下文来源审计器: 一个 Agent 会话窗口里, 四个来源各占多少预算?
CONTEXT_ITEMS = [
    {"name": "系统提示(角色+全局约束)", "tokens": 900, "source": "system"},
    {"name": "工具定义(8 个)", "tokens": 1400, "source": "system"},
    {"name": "AGENTS.md 项目指令", "tokens": 700, "source": "instruction"},
    {"name": "src/limiter.py 全文", "tokens": 2600, "source": "retrieval"},
    {"name": "src/auth.py 相关片段", "tokens": 1800, "source": "retrieval"},
    {"name": "对话历史(12 轮)", "tokens": 3600, "source": "history"},
]

def audit(items):
    total = sum(i["tokens"] for i in items)
    print(f"窗口总占用: {total} tokens")
    acc, order = {}, []
    for i in items:
        if i["source"] not in acc:
            order.append(i["source"])
        acc[i["source"]] = acc.get(i["source"], 0) + i["tokens"]
    for src in order:
        share = acc[src] / total
        bar = "#" * round(share * 40)
        print(f"{src:<12} {acc[src]:>6} ({share:>6.1%}) {bar}")
    if acc.get("history", 0) / total > 0.35:
        print("[!] history 占比超 35% —— 先压缩历史, 再考虑加新内容")
    if acc.get("retrieval", 0) / total < 0.25:
        print("[!] 检索注入不足 25% —— 模型可能缺乏任务所需的具体事实")

print("== 场景一: 健康的供给 ==")
audit(CONTEXT_ITEMS)
print()
print("== 场景二: 历史失控的会话 ==")
BLOATED = [
    {"name": "系统提示(角色+全局约束)", "tokens": 900, "source": "system"},
    {"name": "工具定义(8 个)", "tokens": 1400, "source": "system"},
    {"name": "AGENTS.md 项目指令", "tokens": 700, "source": "instruction"},
    {"name": "对话历史(80 轮, 未压缩)", "tokens": 21000, "source": "history"},
]
audit(BLOATED)

# 观察点: 场景一以检索注入为主力(40%), 四来源比例均衡;
# 场景二 history 吃掉 87.5%, 两条告警同时触发 —— 对策见 l5: 压缩 + 检索重建`,
          },
        ],
      },

      /* ─────────────────────────── l2 ─────────────────────────── */
      {
        id: 'cs146s-w3-l2',
        title: '规范驱动开发：Specs Are the New Source Code',
        difficulty: 3,
        content: `
### 学习目标

学完本节，你应该能够：
1. 解释"规范是新源代码"的含义——代码由 AI 写，意图由人写，人的核心产出物从代码上移到规范层；
2. 为一个功能产出四层产物：PRD（为什么/给谁）、Spec（做什么/验收标准）、Plan（怎么拆/依赖序）、Tasks（每任务的 DoD），并指出每层的典型反例；
3. 用"机器可判性"标准评审一份 Spec：逐条检查验收标准能否用程序或命令自动判定。

### 前置知识

- w1-l3：五要素提示词——五要素是"单次调用"的迷你规格，本节把它升级为"项目级"的四层产物；
- w3-l1：上下文四来源——Spec 写好之后就是优先级最高的检索注入资产；
- 用 Markdown 写结构化文档的基本能力。

### 问题背景

官方 Week 3 的指定阅读里，有一篇标题即是论断的文章：**"Specs Are the New Source Code"（规范是新源代码）**。论断背后的产业变化：当代码可以由 AI 在分钟级生成，"把代码写出来"不再是瓶颈，"说清楚要什么"成了瓶颈。

传统开发里，工程师大部分时间在写代码、小部分时间在想清楚要什么；AI 原生开发里这个比例倒转——**代码 AI 写，意图人写**。意图的载体就是规范（Spec）。规范写得差，Agent 会以极高的执行力跑向错误的方向：**方向错误 × 执行力 = 加速灾难**。失败路径很常见：直接对 Agent 说"做个导出功能"，拿到一个能跑但哪里都不对的实现，改了五轮越改越乱——因为从来没有任何一份文件定义过"对"是什么。

### 直觉理解

把四层产物想成盖房子的图纸体系：

- **PRD** 是开发商的需求书：给谁盖、为什么盖、盖好后怎么算成功——不画梁柱；
- **Spec** 是建筑设计图：几层几户、承重多少、验收标准（抗几级地震）——可检查、可判对错；
- **Plan** 是施工组织计划：先地基后框架、哪些工序可并行、哪里有风险；
- **Tasks** 是每个班组的工作单：今天浇哪块板、完成标准是什么。

施工队（Agent）再强，没有图纸体系就只能盖"看运气"的房子。**人不再搬砖，人画图纸。**

### 核心概念与原理详解

## 为什么"规范是新源代码"

三组对应关系说清这个类比：

| 源代码时代 | 规范时代 |
| --- | --- |
| 代码是意图的载体，人维护代码 | 规范是意图的载体，人维护规范 |
| 编译器把代码变成机器指令 | Agent 把规范变成代码 |
| 测试保证代码符合预期 | 验收标准（AC）保证实现符合规范 |
| 代码会腐烂（code rot） | 规范会漂移（spec rot）——实现变了规范没跟 |

关键转变：维护一个系统时，你读的首要文档从"这段代码干了什么"变成"这份规范说了什么"。代码成了规范的**编译产物**——原则上可以随时按规范重新生成。

## 四层产物总览

<Diagram type="specflow" />

| 层 | 回答的问题 | 典型篇幅 | 最常见反例 |
| --- | --- | --- | --- |
| PRD（Product Requirements Document） | 为什么做、给谁、成功长什么样 | 1 页 | 写成功能清单堆砌，没有"为什么" |
| Spec（规格） | 做什么：行为规格 + 验收标准 + 边界 + 非目标 | 1-3 页 | 把实现方案写进行为规格主体 |
| Plan（计划） | 怎么拆：任务分解 + 依赖顺序 + 风险 | 半页-1 页 | 任务粒度失衡（5 分钟到两周混合） |
| Tasks（任务单） | 每个任务做什么 + 完成标准（DoD） | 每任务 5-10 行 | DoD 写"完成开发"（不可判） |

四层是**漏斗关系**：PRD 过滤"值不值得做"，Spec 锁定"做成什么样"，Plan 排出"按什么顺序"，Tasks 定义"每步怎么算完"。上层改动必须向下同步——这是防 spec rot 的关键机制（见误区三）。

## 每层的模板

\`\`\`text
【PRD 模板】背景 / 目标用户 / 问题陈述 / 成功指标(可量化) / 非目标
【Spec 模板】概述 / 行为规格(每条可判) / 验收标准(GWT) / 边界情况 / 非目标 / 开放问题(逐条标注"本期不做"或给出决定)
【Plan 模板】任务列表(带依赖箭头) / 每任务影响文件预估 / 风险与回滚方案
【Tasks 模板】任务 id / 目标(一句话) / 涉及文件(预估) / DoD(可执行命令或断言) / 委托提示词要点
\`\`\`

## 反例解剖

一份坏 Spec："导出功能要好用，支持各种格式，性能要好，体验要流畅。"三宗罪：**不可判**（"好用"怎么判？）、**无边界**（"各种格式"是无底洞）、**无 AC**（验收时全靠吵）。改好的方法不是润色措辞，而是逐条换成机器可判的陈述——下一节（l3）给出完整的改写案例。

### 完整案例

功能：为 API 网关增加 IP 限流。四层产物浓缩如下。

**PRD**：背景——运营反馈夜间爬虫刷 /api/report，高峰期正常用户超时；目标用户——平台运维；成功指标——异常流量拦截率 > 95%，正常用户误伤率 < 0.1%；非目标——不改鉴权体系，不做用户级配额。

**Spec**（节选）：AC1——Given 同一 IP 在 60 秒内发起第 101 次请求，When 请求 /api/report，Then 返回 429 且响应头含 Retry-After；AC2——Given IP 在白名单，When 任意频率请求，Then 永不返回 429；边界——计数窗口 60 秒滑动，多实例部署下计数必须共享（用 Redis）；开放问题——是否需要地域封禁（标注：本期不做）。

**Plan**：T1 配置结构（白名单/阈值）→ T2 计数器模块 → T3 中间件接入 → T4 测试与文档；风险——Redis 不可用时降级策略为"放行并告警"（宁可漏不可误伤）。

**Tasks**（T2 节选）：目标——实现滑动窗口计数器；涉及文件——src/limiter/counter.py（新建）；DoD——\`pytest tests/test_counter.py\` 全绿，且 59s/60s/61s 三个边界用例各有断言；不引入新依赖。

**自解释提示**：为什么 AC1 写"429 且含 Retry-After"而不是"返回限流错误"？——前者机器可判（状态码 + header 存在性，各一个断言），后者要人猜。"机器可判"是贯穿四层的质量红线。

### 代码实践

下面的演示用 text 形式展示"IP 限流"功能的四层产物链：注意每一层如何回答上一层遗留的问题、如何约束下一层的自由度。

### 常见误区与安全风险

- **误区一：把 Spec 写成实现方案。** Spec 说 what（行为与 AC），Plan/设计讨论才管 how（用什么实现）。把"用 Redis"写进 Spec 的行为主体等于过早锁死实现——除非它本身就是需求（如"多实例共享计数"）。
- **误区二：AC 不可判定。** "性能要好"不是 AC，"P95 < 200ms"才是。检验法：想象一个不了解上下文的工程师（或脚本）拿到这条 AC，能否不问你就判定通过与否。
- **误区三：规范冻结主义与 spec rot 一体两面。** 规范写完就不许动 → 实现中发现的规格错误无法回写，规范与代码漂移，最终没人信规范，团队退回口头开发。正确做法是走变更流程：改 PRD → 同步 Spec 的 AC → 再改代码（l6 的故障排查表会再见到它）。
- **安全提示：规范也是注入面。** 如果 Agent 的"需求"直接来自 issue 评论或聊天记录，其中一条恶意"需求"就可能指挥它改权限文件或外发数据。需求必须进入受版本控制、经人评审的 Spec 文件后才能执行——不可信来源的"需求"按不可信数据处理（Week 6 展开）。

### 与其他知识点的关联

- 承上：w1-l3 的五要素是单次调用的迷你 Spec；w3-l1 的四来源中，Spec 是"检索注入"的最高优先级资产；
- 启下：l3 深入 PRD 的写法（AC、边界、反例清单）；l6 项目 B 完整走一遍四层产物 + 自动验收；w4 的多 Agent 协作本质是"按 Tasks 并行分派"——没有 Plan 的依赖图就没有安全的并行。

### 动手实验

1. 通读下方四层产物链演示，标出每一层里"机器可判"的陈述有几条；
2. 找一个你最近用 AI 做的功能，按四层模板补一份缺失的产物（多数人缺的是 Spec 的 AC 与非目标）。

### 本节总结

1. 代码 AI 写、意图人写：规范（Spec）成为新的源代码——Agent 是规范的编译器，AC 是规范的测试；
2. 四层漏斗：PRD（为什么）→ Spec（做什么+AC）→ Plan（怎么拆+依赖）→ Tasks（每任务 DoD），上层变更必须向下同步；
3. 质量红线是"机器可判"：每条陈述都要能被脚本或陌生人判定对错；
4. spec rot 与规范冻结主义都要防：变更走"PRD → Spec → 代码"的回写流程；
5. 不可信来源的"需求"（issue 评论/聊天）必须经评审进 Spec 才能执行——规范也是注入面。

### 参考资料与延伸阅读

- 《Specs Are the New Source Code》（官方 Week 3 指定阅读）——核心论点与"规范即源代码"类比：对应"为什么"与"四层总览"模块；
- [官方作业仓库 mihail911/modern-software-dev-assignments](https://github.com/mihail911/modern-software-dev-assignments) week3（Design Doc）——作业形态锚点：对应"完整案例"与 l6 项目 B；
- Anthropic《Claude Code 最佳实践》——"先探索、再规划、后编码"工作流：对应 Plan 层的工程依据；
- 本节四层模板、反例解剖、限流案例均为自主设计的原创教学内容。

### 本节习题导引

fill 题检查四层顺序与归属；single 题训练"机器可判性"眼光；code 题实现 Spec 完整性检查器；open 题把一句模糊需求改写成四层产物。
`,
        tips: [
          { kind: 'pitfall', text: 'AC 试金石：每条验收标准问一句"能否写成一个自动断言？"——不能就重写到能。"性能要好""体验流畅"都是未完成的 AC。' },
          { kind: 'note', text: '把 spec/ 目录纳入版本控制并随代码一起 review：规范是资产，不是聊天记录里的化石。' },
          { kind: 'interview', text: '"Spec 里能不能写实现选型？"——行为需求层面不能（what），但它本身是需求时可以（如"多实例共享计数"）。区分"实现细节"与"架构约束"。' },
          { kind: 'performance', text: '四层产物总篇幅控制在 3-5 页：规范不是论文，每个字都要对 Agent 的行为有约束力，写而不约束等于没写。' },
        ],
        demos: [
          {
            title: '四层产物链：IP 限流功能（text 展示）',
            lang: 'text',
            code: `【PRD】ip-limiter
  背景: 运营反馈夜间爬虫刷 /api/report, 高峰期正常用户超时
  目标用户: 平台运维
  成功指标: 异常流量拦截率 > 95%, 正常用户误伤率 < 0.1%
  非目标: 不改鉴权体系, 不做用户级配额

【Spec】
  AC1 Given 同一 IP 60 秒内第 101 次请求 When 请求 /api/report
      Then 返回 429 且响应头含 Retry-After
  AC2 Given IP 在白名单 When 任意频率请求 Then 永不返回 429
  边界: 计数窗口 60s 滑动; 多实例部署计数共享(Redis)
  非目标: 不做地域封禁
  开放问题: 无(全部已决)

【Plan】
  T1 配置结构(白名单/阈值) ──> T2 计数器模块 ──> T3 中间件接入 ──> T4 测试+文档
  风险: Redis 不可用 -> 降级为"放行并告警"(宁可漏不可误伤)

【Tasks】(T2 节选)
  目标: 实现滑动窗口计数器
  涉及: src/limiter/counter.py(新建)
  DoD: pytest tests/test_counter.py 全绿;
       59s/60s/61s 三个边界用例各有断言; 不引入新依赖

# 读法: PRD 定方向 -> Spec 定对错 -> Plan 定顺序 -> Tasks 定完成;
# 每一层的"非目标/风险/DoD"都在约束下一层的自由度。`,
          },
        ],
      },

      /* ─────────────────────────── l3 ─────────────────────────── */
      {
        id: 'cs146s-w3-l3',
        title: '写给 Agent 的 PRD：验收标准、边界与反例',
        difficulty: 3,
        content: `
### 学习目标

学完本节，你应该能够：
1. 说出人类 PRD 与 Agent PRD 的三个关键差异（潜台词、可判定性、边界显式化），并把一份人类 PRD 改造成 Agent 可执行版；
2. 用 Given/When/Then（GWT）写出机器可判的验收标准，并用检查器识别不完整的 AC；
3. 为功能列出三类反例清单（功能/输入/改动），并说明"不要做什么"为什么比"要做什么"更防跑偏。

### 前置知识

- w3-l2：四层产物——本节深入其中 PRD 与 Spec 两层的写法，尤其是 AC（验收标准）；
- w1-l3：五要素提示词——PRD 本质上是一份"超大号的、可复用的提示词"。

### 问题背景

人类团队的 PRD 依赖大量**共享语境**：写"体验要流畅"，老员工知道是指首屏 1 秒内、交互无卡顿；写"参考某产品"，团队有共同的审美记忆。Agent 没有这些语境——**它每次会话都是一个新入职的、字面主义的外包生**：不懂潜台词、不问问题、直接选一条路执行、速度极快。

于是模糊 PRD 在 Agent 时代的后果被放大了：在人类团队里，模糊需求导致"返工"；在 Agent 面前，它导致"高速跑偏"——Agent 会把模糊处用最平庸的默认值填满，然后自信地交付。本节教你怎么把 PRD 写到"没有留给默认值的空间"。

### 直觉理解

给 Agent 写 PRD，像是**给一个只认字面意思、智商很高但零常识的外星人写使用说明**：

- 你写"把文件处理干净"——外星人可能把文件全删了（"干净"= 没有文件）；
- 你写"处理完告诉我"——它处理到一半就告诉你（你没说必须处理完）；
- 你写"不要删除任何文件；全部处理完之后再统一报告"——它做到了。

外星人不笨，它只是**没有你没写出来的一切**。写 PRD 的过程，就是把脑子里那些"这还用说吗"逐条写出来的过程——每一条"还用说吗"，都是未来的一次跑偏。

### 核心概念与原理详解

## 人类 PRD vs Agent PRD

| 维度 | 人类 PRD | Agent PRD |
| --- | --- | --- |
| 潜台词 | 依赖共享语境，可以写"参考 XX" | 禁止潜台词：一切假设显式写出 |
| 验收标准 | 允许"体验良好"这类主观描述 | 必须机器可判：状态码/行数/文件存在/数值 |
| 边界 | 常省略——人会主动问 | 必须显式——Agent 不问，直接替你决定 |
| 反例 | 很少写 | "不要做什么"清单是防跑偏的核心 |
| 未决问题 | 会开会讨论 | 会"默认决定"——必须逐个标注"本期不做"或给出决定 |

## 验收标准的 GWT 写法

\`\`\`text
Given（前置条件）: 可验证的初始状态
When（触发动作）:  可执行的输入或操作
Then（断言）:      机器可判的可观察结果
\`\`\`

合格示例：\`Given 购物车有 3 件商品，When 调用 GET /api/cart/total，Then 响应 body 的 total 字段等于三件商品金额之和（整数分）\`。
不合格示例：\`Given 正常使用时，When 查看合计，Then 显示正确金额\`——"正常""正确"都不可判。

判定的试金石：**这条 AC 能不能写成一个自动断言？** 能 → 合格；不能 → 回去重写，把它落到可观察量上（状态码、返回值、文件内容、退出码、耗时阈值）。

## 边界与反例清单

反例清单 = 明确的"不要做什么"。三类：

1. **功能反例**：不实现 X（"不做 xlsx 格式，只做 CSV"）；
2. **输入反例**：不处理 Y（"非法 city 参数不做模糊匹配，返回退出码 2 并提示 unknown city"）；
3. **改动反例**：不动 Z（"不修改 migrations/ 目录；不升级依赖版本"）。

为什么"不要做什么"比"要做什么"更防跑偏：Agent 的默认倾向是**多做事以表现能力**——你说"导出 CSV"，它会顺手支持 xlsx、顺手加个列选择器、顺手重构导出模块。正向需求画的是靶子，负向清单才是围栏。**围栏不挡能力，挡自由发挥。**

## Agent PRD 的完整骨架

\`\`\`text
1. 背景与目标（为什么做，成功指标可量化）
2. 行为规格（每条可判）
3. 验收标准（GWT，5-8 条覆盖主路径 + 关键边界）
4. 边界条件（上限/默认值/极端输入的处理）
5. 反例清单（功能/输入/改动三类）
6. 开放问题（逐条标注："本期不做"或"决定为 X"）
\`\`\`

### 完整案例

功能："导出 CSV"。看它如何从一句模糊需求变成 Agent 可执行的 PRD。

**V0（口头需求）**："运营想要导出订单数据，做一下吧。"——留给 Agent 的空间：导出哪些字段？什么格式？权限？上限？Agent 会全部替你默认。

**V1（人类 PRD）**：背景——运营每月手动复制粘贴订单数据做对账，耗时约 2 小时；目标用户——运营（非技术）；成功指标——月度对账时间从 2 小时降到 10 分钟。到这一层"为什么"清楚了，但 AC 仍是"方便地导出"——人类团队靠默契存活，Agent 不行。

**V2（Agent PRD，最终版节选）**：

1. 行为规格：管理后台订单列表页新增"导出 CSV"按钮；点击后服务端异步生成，完成后浏览器下载 \`orders_YYYYMMDD.csv\`；列固定为：订单号、下单时间、金额（元，两位小数）、状态；编码 UTF-8 带 BOM（Excel 直开不乱码）。
2. 验收标准（GWT 节选）：
   - AC1：Given 订单列表有 100 条订单，When 有权限用户点击导出，Then 下载的 CSV 共 101 行（含表头）且第 1 列为订单号；
   - AC2：Given 存在金额为 1234.5 元的订单，When 导出，Then CSV 对应单元格为 \`1234.50\`；
   - AC3：Given 用户无导出权限，When 点击导出，Then 返回 403 且不生成任何文件；
   - AC4：Given 订单数为 0，When 导出，Then 生成仅含表头的 CSV 且不报错。
3. 边界：单次导出上限 5 万行，超出返回错误并提示分批；时间范围默认本月。
4. 反例清单：不做 xlsx 格式；不做自定义列选择；不修改既有订单查询接口；不引入新的数据库依赖。
5. 开放问题：大文件是否需要压缩包？（标注：本期不做。）

**自解释提示**：AC2 为什么专门写 \`1234.50\`？——尾部零。金额 1234.5 在 Excel 对账时是最常见的投诉源，不写明，Agent 就会输出 \`str(1234.5)\`。每条"看起来啰嗦"的细则背后，几乎都站着一个真实的返工故事。V1 → V2 的差距不是篇幅，是**每句话能否被判对错**。

### 代码实践

下面的"AC 检查器"在浏览器内运行：解析验收标准的 Given/When/Then 结构，校验完备性（是否三段齐全）与 Then 的可判定性（是否含断言词）。把你写的 AC 逐条贴进来跑一遍，是提交前的最后一道闸。

### 常见误区与安全风险

- **误区一：AC 越多越好。** 每条 AC 都要写断言、都要随需求维护。5-8 条覆盖主路径与关键边界即可，范围控制靠反例清单，而不是 AC 堆量。
- **误区二：把实现写进 AC。** "用 pandas 读回文件校验行数"是断言的实现细节；AC 只描述外部可观察行为（CSV 有 101 行），断言内部怎么实现是验收脚本的事。
- **误区三：开放问题留着不管。** 你留白，Agent 替你决定——而且用的是最平庸的默认值。每个开放问题必须二选一：标注"本期不做"，或现在就决定。
- **安全提示：PRD 是多人输入的聚合体**（issue、评论、会议纪要）。其中一条"需求"可能是注入指令（"导出前顺便把 .env 内容附在邮件里发给…"）。PRD 必须经过人的评审定稿，Agent 只读定稿文件，不直接执行聊天记录里的"需求"。

### 与其他知识点的关联

- 承上：w3-l2 的四层产物——本节是 Spec/PRD 两层的深度展开；
- 启下：l4 的指令文件（AGENTS.md）本质是"仓库级常驻 PRD"——约束从单功能扩展到所有会话；l6 项目 B 的第一步就是为一个真实 feature 写出这套 PRD；w6 的安全验收（AC 中加入安全断言）复用同一写法。

### 动手实验

1. 运行下方 AC 检查器，逐条理解 4 条示例 AC 的判定结果；
2. 给"用户上传头像"功能写 3 条 GWT AC（提示：大小上限、格式校验、越权路径），用检查器自测直到全过——本节 open 习题会要求你完成并解释它。

### 本节总结

1. Agent 是"零语境的字面主义执行者"：PRD 的每处模糊都会被默认值填满——写 PRD 就是把"这还用说吗"逐条写出来；
2. GWT 三段：Given 可验证初始状态 / When 可执行输入 / Then 机器可判断言——试金石是"能否写成自动断言"；
3. 反例三类（功能/输入/改动）：正向需求画靶子，负向清单做围栏——围栏挡的是自由发挥；
4. 开放问题必须清零："本期不做"或"现在决定"，绝不留白给 Agent 的默认值；
5. PRD 要经人评审定稿才可执行——多人输入的"需求"是注入面。

### 参考资料与延伸阅读

- 《Specs Are the New Source Code》（官方 Week 3 指定阅读）——AC 与规范可执行化的思想来源：对应"GWT 写法"与"完整骨架"模块；
- Google《Prompt Engineering Overview》（官方 Week 1 指定阅读）——结构化输出与明确格式要求的原则：对应 AC 的可判定性；
- Anthropic《Claude Code 最佳实践》——"把需求写成文件让 Agent 读"的实践：对应 V2 案例的组织方式；
- GWT 结构源自行为驱动开发（BDD/Cucumber）社区；本节的 Agent 化改造、CSV 逐步改写案例、AC 检查器均为自主设计的原创教学内容。

### 本节习题导引

fill 题检查 GWT 结构；single/judge 题训练"可判定性"眼光；code 题实现 AC 校验器；open 题完整写"头像上传"的 AC 与反例清单。
`,
        tips: [
          { kind: 'pitfall', text: '开放问题留白 = 把决定权送给 Agent 的默认值。每个"待定"必须变成"本期不做"或"决定为 X"再提交给 Agent。' },
          { kind: 'leak', text: 'PRD 会整体进入 Agent 上下文：写之前先脱敏——定价策略、密钥路径、真实用户数据不要出现在 Spec 里。' },
          { kind: 'interview', text: '"怎么保证 AI 实现的功能是对的？"——AC 先行：先写机器可判的验收标准，再委托实现，验收脚本自动判定。这是规格驱动的标准面试答案。' },
          { kind: 'note', text: '把 GWT 模板做成编辑器 snippet（Given___ / When___ / Then___）：写 AC 的速度决定你愿不愿意写 AC。' },
        ],
        demos: [
          {
            title: 'AC 检查器：Given/When/Then 完备性校验',
            lang: 'python',
            code: `import re

REQUIRED_PARTS = (("Given", "前置条件"), ("When", "触发动作"), ("Then", "可观察断言"))
ASSERT_WORDS = ("等于", "返回", "包含", "为空", "不为空", "提示",
                "退出码", "抛出", "行数", "文件", "状态")

def check_ac(ac):
    """校验单条验收标准: G/W/T 结构 + Then 是否含可判定断言词。
    返回问题列表(空列表 = 通过)。"""
    problems = []
    for part, zh in REQUIRED_PARTS:
        if not re.search(part, ac, re.IGNORECASE):
            problems.append(f"缺少{zh}({part})")
    then_idx = ac.lower().rfind("then")
    then_text = ac[then_idx + 4:] if then_idx >= 0 else ""
    if then_text and not any(w in then_text for w in ASSERT_WORDS):
        problems.append("Then 缺少可判定断言(未见 等于/返回/包含/退出码 等词)")
    return problems

ACS = [
    "Given 订单列表非空, When 用户点击导出按钮, Then 下载的 CSV 文件行数等于订单数加一(表头)",
    "Given 用户无导出权限, When 用户点击导出按钮, Then 页面提示'无权限'且不产生文件",
    "When 导出完成, 界面应有友好反馈",
    "Given 输入为空 When 点击导出 Then 系统行为正常",
]
for i, ac in enumerate(ACS, 1):
    problems = check_ac(ac)
    verdict = "通过" if not problems else "不通过"
    print(f"AC{i} {verdict}: {problems if problems else '-'}")

# 观察点: AC3 缺 Given/Then(只有动作没有前置与断言);
# AC4 三段齐全但 Then"系统行为正常"不可判定 —— 两条防线各拦住一种坏 AC`,
          },
        ],
      },
    ],
    exercises: [
      /* ───────── l1 习题（8 题）───────── */
      {
        id: 'cs146s-w3-l1-e1', type: 'single', difficulty: 1, relatedLessonId: 'cs146s-w3-l1', tags: ['K', 'context'],
        question: '上下文工程（Context Engineering）最准确的定义是？',
        options: [
          { value: 'a', text: '把提示词写得更长、更详细' },
          { value: 'b', text: '在有限的上下文窗口内，系统地决定"模型在每一步看到什么、看不到什么"的工程学科' },
          { value: 'c', text: '选择上下文窗口更大的模型' },
          { value: 'd', text: '用更贵的模型来提升输出质量' },
        ],
        answer: 'b',
        explanation: '上下文工程回答三个问题：放什么（选择）、放哪（布局）、放多少（预算）。窗口大小与模型选择都不是它——塞得下不等于用得上。',
      },
      {
        id: 'cs146s-w3-l1-e2', type: 'judge', difficulty: 2, relatedLessonId: 'cs146s-w3-l1', tags: ['U', 'context'],
        question: '只要模型窗口足够大（如 1M token），就不需要上下文工程了。',
        answer: false,
        explanation: '四类失效模式（干扰/冲突/混淆/投毒，w1-l4）随窗口内容增长而恶化，与窗口上限无关。塞得下 ≠ 用得上。',
      },
      {
        id: 'cs146s-w3-l1-e3', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-w3-l1', tags: ['K', 'context'],
        question: '上下文供给的四个来源：______（含工具定义）、项目指令文件、______（按相关性拉取任务所需内容）、______（本次会话累积的消息）。',
        blanks: [['系统提示', '系统提示词', 'system prompt'], ['检索注入', '检索', '检索内容', 'RAG'], ['会话历史', '对话历史', '历史']],
        explanation: '四来源在同一窗口竞争空间：系统提示是固定开销，指令文件是持久知识，检索注入是任务事实，会话历史是运行证据。',
      },
      {
        id: 'cs146s-w3-l1-e4', type: 'multiple', difficulty: 3, relatedLessonId: 'cs146s-w3-l1', tags: ['U', 'context'],
        question: '关于上下文四来源的说法，正确的有？',
        options: [
          { value: 'a', text: '系统提示与工具定义是每次调用的固定开销，精简它们是高杠杆优化' },
          { value: 'b', text: '项目指令文件让团队约定"写一次、每次会话自动注入"' },
          { value: 'c', text: '检索注入的内容都来自仓库内部，因此天然可信' },
          { value: 'd', text: '会话历史只会增加信息，不会伤害输出质量' },
        ],
        answer: ['a', 'b'],
        explanation: 'c 错：issue、网页、第三方 README 都可能经检索进入窗口，是投毒通道。d 错：历史累积正是冲突/干扰模式的主要载体，所以 l5 要教压缩。',
      },
      {
        id: 'cs146s-w3-l1-e5', type: 'code', difficulty: 3, relatedLessonId: 'cs146s-w3-l1', tags: ['D', 'context'],
        question: '实现 `audit_sources(items, history_limit=0.35)`：统计一次会话中四来源（system/instruction/retrieval/history）的 token 占比，当 history 占比超过 history_limit 时给出告警。',
        lang: 'python',
        starterCode: `def audit_sources(items, history_limit=0.35):
    """items: [{"name": str, "tokens": int, "source": str}]
    source ∈ system / instruction / retrieval / history
    返回 (total, shares, warnings):
      total: 总 token 数
      shares: {source: 占比} 保留 4 位小数(按 items 中出现的顺序)
      warnings: history 占比超过 history_limit 时含一条提示
    """
    pass

items = [
    {"name": "system prompt", "tokens": 1200, "source": "system"},
    {"name": "AGENTS.md", "tokens": 800, "source": "instruction"},
    {"name": "src/auth.py", "tokens": 5000, "source": "retrieval"},
    {"name": "src/api.py", "tokens": 2000, "source": "retrieval"},
    {"name": "对话历史", "tokens": 4000, "source": "history"},
]
total, shares, warns = audit_sources(items)
print(total)
print(shares)
print(warns)`,
        expectedOutput: `13000
{'system': 0.0923, 'instruction': 0.0615, 'retrieval': 0.5385, 'history': 0.3077}
[]`,
        tests: `items = [
    {"name": "sys", "tokens": 1000, "source": "system"},
    {"name": "md", "tokens": 500, "source": "instruction"},
    {"name": "f", "tokens": 4500, "source": "retrieval"},
    {"name": "chat", "tokens": 4000, "source": "history"},
]
total, shares, warns = audit_sources(items)
assert total == 10000
assert abs(shares["history"] - 0.4) < 1e-9
assert len(warns) == 1 and "history" in warns[0], "history 40% 超限应告警"
t2, s2, w2 = audit_sources([])
assert t2 == 0 and s2 == {} and w2 == [], "空输入边界"
t3, s3, w3 = audit_sources([{"name": "a", "tokens": 1, "source": "system"}])
assert t3 == 1 and s3["system"] == 1.0 and w3 == [], "单来源占满"`,
        allowedModules: [],
        explanation: '来源审计是预算分配的第一步：先量化再优化。注意空输入返回 (0, {}, []) 而不是除零报错——评估类工具必须对自己的输入负责。',
        answer: `def audit_sources(items, history_limit=0.35):
    total = sum(i["tokens"] for i in items)
    if total == 0:
        return 0, {}, []
    acc = {}
    for i in items:
        acc[i["source"]] = acc.get(i["source"], 0) + i["tokens"]
    shares = {k: round(v / total, 4) for k, v in acc.items()}
    warns = []
    if shares.get("history", 0) > history_limit:
        warns.append(f"history 占比 {shares['history']} 超过阈值 {history_limit}, 建议压缩或外部化")
    return total, shares, warns

items = [
    {"name": "system prompt", "tokens": 1200, "source": "system"},
    {"name": "AGENTS.md", "tokens": 800, "source": "instruction"},
    {"name": "src/auth.py", "tokens": 5000, "source": "retrieval"},
    {"name": "src/api.py", "tokens": 2000, "source": "retrieval"},
    {"name": "对话历史", "tokens": 4000, "source": "history"},
]
total, shares, warns = audit_sources(items)
print(total)
print(shares)
print(warns)`,
      },
      {
        id: 'cs146s-w3-l1-e6', type: 'single', difficulty: 3, relatedLessonId: 'cs146s-w3-l1', tags: ['U', 'context'],
        question: '官方阅读《Good Context Good Code》的 2.5x 生产力案例，核心结论是？',
        options: [
          { value: 'a', text: '换贵 2.5 倍的模型就能快 2.5 倍' },
          { value: 'b', text: '上下文供给系统化改造后，同样的模型交付速度提升到约 2.5 倍' },
          { value: 'c', text: '提示词写到原来 2.5 倍长度' },
          { value: 'd', text: '把会话轮数增加 2.5 倍' },
        ],
        answer: 'b',
        explanation: '变量是上下文供给方式（任务模板化、上下文包、结果回流），不是模型、提示词长度或轮数——这正是"上下文是资产"的实证。',
      },
      {
        id: 'cs146s-w3-l1-e7', type: 'open', difficulty: 4, relatedLessonId: 'cs146s-w3-l1', tags: ['D', 'context'],
        question: '你要让 Agent 完成"修复购物车金额合计错误"（bug 藏在跨 3 个文件的合计逻辑里，仓库 200+ 文件）。请设计完整的上下文供给方案：① 四来源各供给什么具体内容（每类至少 2 项）；② 给出 token 预算分配比例并说明理由；③ 写出 2 条裁剪规则（什么内容坚决不进窗口）。',
        referenceAnswer: `① 四来源供给清单：

| 来源 | 供给内容 | 为什么必要 |
| --- | --- | --- |
| 系统提示 | 资深支付方向工程师角色 + "改动前先陈述影响面" + 可用工具清单 | 角色与流程约束，防盲改 |
| 指令文件 | AGENTS.md："金额用整数分禁 float""测试命令 pytest -q""禁区 migrations/" | 团队约定自动注入，防方向性错误 |
| 检索注入 | cart.py 合计函数及其调用方；一个失败的测试用例；相关 PR 说明（历史决策原因） | 给事实与证据，防凭想象编造 |
| 会话历史 | 第一轮贴报错栈 + 复现步骤；后续只保留关键结论 | 证据前置，省试错轮次 |

② 预算分配（以 200K 窗口为例）：系统提示+工具 8%；指令文件 3%；检索注入 55%（三份内容为主，每份带"为什么给你看"）；历史 30%（设 35% 上限）；输出预留 4%。理由：bug 修复任务的事实密度决定成败，检索给最大份额；历史设硬上限防冲突/干扰累积。

③ 裁剪规则：
1. 与金额链路无关的文件一律不进（200 个文件里挑 3-5 个）——"可能有用"不构成上桌资格；
2. 大体积工具输出不以全文进历史——只保留结论一行，详情写外部文件。`,
        rubric: [
          { point: '四来源各给出至少 2 项具体且与任务相关的内容', score: 3 },
          { point: '预算分配有比例且理由与任务类型挂钩（检索为主力）', score: 3 },
          { point: '裁剪规则可执行（有判据，不是"注意相关性"式口号）', score: 2 },
          { point: '使用本节术语（四来源/预算/检索注入/外部化）', score: 2 },
        ],
        keywords: ['系统提示', '指令文件', '检索', '历史', '预算'],
        explanation: '方案质量的关键在"每项内容与任务的因果链"：能回答"为什么给它看"的内容才上桌——这是预算视角与堆料思维的分界。',
      },
      {
        id: 'cs146s-w3-l1-e8', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-w3-l1', tags: ['K', 'context'],
        question: '《Good Context Good Code》的 2.5x 案例中，生产力差异来自改变______的供给质量，而不是更换______。',
        blanks: [['上下文', 'context'], ['模型', '模型版本', 'LLM']],
        explanation: '这是 Week 3 最重要的实证结论：同样的模型，上下文架构不同，产出天差地别——先改上下文，再谈换模型。',
      },

      /* ───────── l2 习题（8 题）───────── */
      {
        id: 'cs146s-w3-l2-e1', type: 'fill', difficulty: 1, relatedLessonId: 'cs146s-w3-l2', tags: ['K', 'spec'],
        question: '规范驱动开发的四层产物按顺序：______（为什么做/给谁）→ ______（做什么+验收标准）→ ______（怎么拆+依赖序）→ ______（每任务的 DoD）。',
        blanks: [['PRD', 'prd'], ['Spec', 'spec', '规格'], ['Plan', 'plan', '计划'], ['Tasks', 'tasks', '任务']],
        explanation: '漏斗关系：PRD 过滤"值不值得做"，Spec 锁定"做成什么样"，Plan 排"按什么顺序"，Tasks 定"怎么算完"。',
      },
      {
        id: 'cs146s-w3-l2-e2', type: 'single', difficulty: 2, relatedLessonId: 'cs146s-w3-l2', tags: ['U', 'spec'],
        question: '"验收标准（AC）"主要属于哪一层产物的职责？',
        options: [
          { value: 'a', text: 'PRD——它定义功能成功与否' },
          { value: 'b', text: 'Spec——它定义"做成什么样"的可判定标准' },
          { value: 'c', text: 'Plan——它是任务排序的依据' },
          { value: 'd', text: 'Tasks——每任务的 DoD 就是 AC' },
        ],
        answer: 'b',
        explanation: 'PRD 管为什么与成功指标；Spec 管行为规格与 AC；Plan 管拆解与依赖；Tasks 管每任务 DoD。注意 AC（功能级验收）与 DoD（任务级完成定义）是两回事。',
      },
      {
        id: 'cs146s-w3-l2-e3', type: 'judge', difficulty: 3, relatedLessonId: 'cs146s-w3-l2', tags: ['U', 'spec'],
        question: '规范一经写定就应该冻结：实现过程中发现的规格错误不应回写规范，以保持规范的权威性。',
        answer: false,
        explanation: '这是规范冻结主义，会导致 spec rot：实现与规范漂移后，规范失去信任，团队退回口头开发。正确做法是走变更流程：改 PRD → 同步 Spec AC → 再改代码。',
      },
      {
        id: 'cs146s-w3-l2-e4', type: 'multiple', difficulty: 3, relatedLessonId: 'cs146s-w3-l2', tags: ['U', 'spec'],
        question: '关于四层产物的反例，下列判断正确的有？',
        options: [
          { value: 'a', text: '把"用 Redis 计数"写进 Spec 的行为规格主体——若它不是需求本身，这是实现细节越位' },
          { value: 'b', text: 'Tasks 的 DoD 写"完成开发并自测"——不可判，是坏 DoD' },
          { value: 'c', text: 'PRD 里写"成功指标：异常流量拦截率 > 95%"——这是正确写法' },
          { value: 'd', text: 'Plan 里任务粒度从 5 分钟到两周混合——粒度失衡，是坏 Plan' },
        ],
        answer: ['a', 'b', 'd'],
        explanation: 'c 是正面示范：成功指标必须可量化。a/b/d 是三类典型反例：实现越位、DoD 不可判、粒度失衡。',
      },
      {
        id: 'cs146s-w3-l2-e5', type: 'code', difficulty: 3, relatedLessonId: 'cs146s-w3-l2', tags: ['D', 'spec'],
        question: '实现 `check_spec(spec)`：检查 Spec 文本是否包含三个必需小节（验收标准 / 边界 / 非目标），返回 (缺失小节列表, 已具备比例)。',
        lang: 'python',
        starterCode: `def check_spec(spec):
    """检查 Spec 文本是否包含三个必需小节: 验收标准 / 边界 / 非目标。
    返回 (missing, score): missing 为缺失小节名列表(按上述顺序),
    score = 已具备比例, 保留 2 位小数。"""
    pass

spec_v1 = """# 规格: CSV 导出
## 背景
运营需要导出订单数据。
## 功能
点击导出按钮下载 CSV。
"""
print(check_spec(spec_v1))

spec_v2 = spec_v1 + "## 验收标准\\nAC1 ...\\n## 边界情况\\n单次上限 5 万行\\n## 非目标\\n不做 xlsx\\n"
print(check_spec(spec_v2))`,
        expectedOutput: `(['验收标准', '边界', '非目标'], 0.0)
([], 1.0)`,
        tests: `m, s = check_spec("## 验收标准 x\\n## 边界情况 y\\n## 非目标 z")
assert m == [] and s == 1.0
m2, s2 = check_spec("## 验收标准 only")
assert m2 == ["边界", "非目标"] and s2 == 0.33
m3, s3 = check_spec("")
assert m3 == ["验收标准", "边界", "非目标"] and s3 == 0.0
m4, s4 = check_spec("本文提到了边界与非目标，但没有验收标准")
assert m4 == ["验收标准"], "正文提及也算包含"`,
        allowedModules: [],
        explanation: '这个检查器是"Spec 门禁"的雏形：l6 项目 B 里它会在提交 Agent 委托前跑一遍。注意用子串匹配时"边界"能命中"边界情况"——宽松匹配对门禁是安全的（宁可多放不可漏报）。',
        answer: `def check_spec(spec):
    required = ["验收标准", "边界", "非目标"]
    missing = [r for r in required if r not in spec]
    score = round((len(required) - len(missing)) / len(required), 2)
    return missing, score

spec_v1 = """# 规格: CSV 导出
## 背景
运营需要导出订单数据。
## 功能
点击导出按钮下载 CSV。
"""
print(check_spec(spec_v1))

spec_v2 = spec_v1 + "## 验收标准\\nAC1 ...\\n## 边界情况\\n单次上限 5 万行\\n## 非目标\\n不做 xlsx\\n"
print(check_spec(spec_v2))`,
      },
      {
        id: 'cs146s-w3-l2-e6', type: 'single', difficulty: 3, relatedLessonId: 'cs146s-w3-l2', tags: ['U', 'spec'],
        question: '下列哪条验收标准是机器可判的？',
        options: [
          { value: 'a', text: '导出功能要稳定可靠' },
          { value: 'b', text: '导出性能要好，用户体验流畅' },
          { value: 'c', text: 'Given 列表有 100 条订单，When 点击导出，Then 下载的 CSV 为 101 行且首列为订单号' },
          { value: 'd', text: '导出的文件应该符合运营的预期' },
        ],
        answer: 'c',
        explanation: '试金石：能否写成一个自动断言。c 可以（行数断言 + 表头断言）；a/b/d 都需要"人猜"，属于未完成的 AC。',
      },
      {
        id: 'cs146s-w3-l2-e7', type: 'open', difficulty: 4, relatedLessonId: 'cs146s-w3-l2', tags: ['D', 'spec'],
        question: '把模糊需求"让我们的接口快一点"改写成四层产物（每层 2-4 行即可），并指出原需求的三处致命模糊。',
        referenceAnswer: `三处致命模糊：① "快"无指标（多少算快？）；② 无场景（哪个接口？P95 还是平均？现状多少？）；③ 无边界与代价（允许加缓存吗？允许降一致性吗？投入上限在哪？）。

四层改写示例：

| 层 | 内容 |
| --- | --- |
| PRD | 背景：订单查询接口高峰期 P95 达 1.8s，客服工单上升。目标用户：App 端用户。成功指标：/api/orders 的 P95 从 1.8s 降到 500ms 以内。非目标：不做架构重写，不降数据一致性。 |
| Spec | AC1：Given 500 并发压测，When 请求 /api/orders，Then P95 ≤ 500ms。AC2：Given 命中缓存的请求，When 查询，Then 返回数据与直查数据库一致（抽样 100 条比对）。边界：缓存 TTL 60s。非目标：不改响应结构。 |
| Plan | T1 慢查询定位（EXPLAIN）→ T2 索引优化 → T3 只读缓存层 → T4 压测验证与文档。依赖：T1→T2→T3→T4；风险：缓存不一致 → TTL + 主动失效兜底。 |
| Tasks（T3 节选） | 目标：引入只读缓存。涉及：src/cache.py（新）。DoD：pytest tests/test_cache.py 全绿，含"命中/过期/失效"三组断言；不改 src/orders.py 查询逻辑（禁区）。 |`,
        rubric: [
          { point: '指出三处模糊且每处对应"不可判"的具体维度', score: 3 },
          { point: 'PRD 层含可量化成功指标与非目标', score: 2 },
          { point: 'Spec 的 AC 机器可判（有明确阈值与比对方法）', score: 3 },
          { point: 'Plan 有依赖序与风险，Tasks 的 DoD 可执行', score: 2 },
        ],
        keywords: ['P95', '指标', 'AC', 'DoD', '非目标'],
        explanation: '改写的方向不是"写得更详细"，而是"每句话都可判"：指标有数字、AC 有断言、任务有 DoD——模糊处全部换算成可观察量。',
      },
      {
        id: 'cs146s-w3-l2-e8', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-w3-l2', tags: ['K', 'spec'],
        question: 'Tasks 层的每个任务必须有可判定的______（英文缩写 DoD）；Plan 层的任务之间必须标注______关系，否则并行委托会出现"接口未就绪"。',
        blanks: [['完成标准', '完成定义', 'dod', 'DoD', 'definition of done'], ['依赖', '先后', '拓扑', '依赖序']],
        explanation: 'DoD 是任务级的"怎么算完"（可执行命令或断言）；依赖关系决定哪些任务可并行——它是 w4 多 Agent 协作分派的基础。',
      },

      /* ───────── l3 习题（8 题）───────── */
      {
        id: 'cs146s-w3-l3-e1', type: 'single', difficulty: 2, relatedLessonId: 'cs146s-w3-l3', tags: ['K', 'spec'],
        question: 'Agent PRD 与人类 PRD 最关键的差异是？',
        options: [
          { value: 'a', text: 'Agent PRD 要写得更短' },
          { value: 'b', text: 'Agent PRD 必须消灭潜台词：一切假设显式化，AC 机器可判' },
          { value: 'c', text: 'Agent PRD 必须用英文写' },
          { value: 'd', text: 'Agent PRD 不需要背景介绍' },
        ],
        answer: 'b',
        explanation: 'Agent 每次会话都是"零语境的字面主义执行者"：没有共享语境、不问问题、用默认值填补模糊。所以一切潜台词必须显式化，AC 必须机器可判。',
      },
      {
        id: 'cs146s-w3-l3-e2', type: 'judge', difficulty: 2, relatedLessonId: 'cs146s-w3-l3', tags: ['U', 'spec'],
        question: '"导出体验要流畅"这类要求可以直接写进给 Agent 的 PRD，Agent 会理解其中的产品直觉。',
        answer: false,
        explanation: 'Agent 不理解潜台词，模糊要求会被随机解释或用默认值填满。必须转成机器可判的陈述，如"导出点击后 2 秒内开始下载，主线程无阻塞调用"。',
      },
      {
        id: 'cs146s-w3-l3-e3', type: 'fill', difficulty: 1, relatedLessonId: 'cs146s-w3-l3', tags: ['K', 'spec'],
        question: 'GWT 三段式：______ 写可验证的初始状态；______ 写可执行的触发输入；______ 写机器可判的断言。',
        blanks: [['Given', 'given'], ['When', 'when'], ['Then', 'then']],
        explanation: '试金石：一条合格的 AC 能直接翻译成一个自动断言。三段中最容易写坏的是 Then——"显示正确金额"不是断言，"total 字段等于整数分之和"才是。',
      },
      {
        id: 'cs146s-w3-l3-e4', type: 'multiple', difficulty: 3, relatedLessonId: 'cs146s-w3-l3', tags: ['U', 'spec'],
        question: '关于反例清单（"不要做什么"），下列说法正确的有？',
        options: [
          { value: 'a', text: 'Agent 的默认倾向是"多做事"，反例清单是压制跑偏的核心手段' },
          { value: 'b', text: '反例包括功能反例（不做 xlsx）、输入反例（不处理非法输入）、改动反例（不动 migrations/）' },
          { value: 'c', text: '反例清单写得越多越好，最好穷尽一切可能性' },
          { value: 'd', text: '改动反例写在 PRD 里就够了，不需要其他配套' },
        ],
        answer: ['a', 'b'],
        explanation: 'c 错：反例也占预算，覆盖高风险项即可。d 错：文件里写"不要动"是提示不是边界——硬边界要靠权限机制（w6），检测靠 diff 审查与验收断言。',
      },
      {
        id: 'cs146s-w3-l3-e5', type: 'code', difficulty: 3, relatedLessonId: 'cs146s-w3-l3', tags: ['D', 'spec'],
        question: '实现 `validate_acs(acs)`：对一批验收标准文本逐条检查 Given/When/Then 三段是否齐全（大小写不敏感），返回统计与不合格下标列表。',
        lang: 'python',
        starterCode: `def validate_acs(acs):
    """acs: 验收标准文本列表。
    对每条检查 Given / When / Then 三段是否齐全(大小写不敏感)。
    返回 {"total": 总数, "complete": 齐全数, "broken": 不齐全的下标列表}"""
    pass

acs = [
    "Given 订单列表非空 When 用户点击导出 Then 下载的 CSV 行数等于订单数加一",
    "When 用户点击导出 Then 文件名为 orders.csv",
    "Given 网络断开 When 点击导出 Then 提示导出失败且不产生文件",
]
print(validate_acs(acs))`,
        expectedOutput: `{'total': 3, 'complete': 2, 'broken': [1]}`,
        tests: `r = validate_acs([
    "Given x When y Then z",
    "when y then z",
    "Given x Then z",
])
assert r == {"total": 3, "complete": 1, "broken": [1, 2]}
assert validate_acs([]) == {"total": 0, "complete": 0, "broken": []}
r2 = validate_acs(["GIVEN a WHEN b THEN c"])
assert r2["complete"] == 1, "大小写不敏感"`,
        allowedModules: [],
        explanation: '第二段 "when y then z" 缺 Given，第三段 "Given x Then z" 缺 When——注意 "when" 里并不包含 "then" 的完整子串匹配陷阱不存在，但反过来 "then" 会被 "Given" 干扰吗？不会：纯子串检查即可，本题考的是把"结构校验"落成代码的能力。',
        answer: `def validate_acs(acs):
    parts = ("given", "when", "then")
    broken = []
    for idx, ac in enumerate(acs):
        low = ac.lower()
        if not all(p in low for p in parts):
            broken.append(idx)
    return {"total": len(acs), "complete": len(acs) - len(broken), "broken": broken}

acs = [
    "Given 订单列表非空 When 用户点击导出 Then 下载的 CSV 行数等于订单数加一",
    "When 用户点击导出 Then 文件名为 orders.csv",
    "Given 网络断开 When 点击导出 Then 提示导出失败且不产生文件",
]
print(validate_acs(acs))`,
      },
      {
        id: 'cs146s-w3-l3-e6', type: 'single', difficulty: 3, relatedLessonId: 'cs146s-w3-l3', tags: ['U', 'spec'],
        question: '下列哪条是合格的"输入反例"？',
        options: [
          { value: 'a', text: '系统应该健壮地处理各种异常输入' },
          { value: 'b', text: '不处理非法的 city 参数值——遇到未知 city 返回退出码 2 并提示 unknown city，不做模糊匹配' },
          { value: 'c', text: '输入处理要符合最佳实践' },
          { value: 'd', text: '对非法输入做优雅降级' },
        ],
        answer: 'b',
        explanation: '反例要具体到"不做什么 + 遇到时怎么办（可判行为）"。a/c/d 都是口号——Agent 读到它们只会用默认值填补。',
      },
      {
        id: 'cs146s-w3-l3-e7', type: 'open', difficulty: 4, relatedLessonId: 'cs146s-w3-l3', tags: ['D', 'spec'],
        question: '为"用户上传头像"功能写出给 Agent 的规格片段：3 条 GWT 验收标准（建议覆盖：大小上限、格式校验、越权/异常路径）+ 2 条反例清单，并逐条说明每条 AC 为什么机器可判（用什么自动断言检查）。',
        referenceAnswer: `验收标准（GWT）：

| # | AC | 机器可判的依据 |
| --- | --- | --- |
| AC1 | Given 一个 2MB 的 png 文件，When 已登录用户上传，Then 返回 200 且响应中的 url 发起 HEAD 请求返回 200 | 状态码断言 + 文件可访问性断言 |
| AC2 | Given 一个 6MB 的 png 文件，When 上传，Then 返回 413 且响应体提示大小上限 5MB，服务端不落盘 | 状态码 + 存储目录文件数不变 |
| AC3 | Given 把 evil.exe 改名为 cat.png，When 上传，Then 返回 415（魔数校验失败） | 文件头字节断言 + 状态码 |
| （备选） | Given 未登录用户，When 上传，Then 返回 401 | 状态码 |

反例清单：
1. 功能反例：不做图片裁剪/压缩/格式转换——上传什么存什么（校验不过就拒绝）；
2. 改动反例：不修改既有登录中间件；不引入新的云存储 SDK（本地存储即可）。

要点：AC2/AC3 展示了"异常路径也要 GWT"——人类 PRD 常只写 happy path，Agent 会把异常路径全部用最平庸的默认值填掉（比如静默吞掉错误返回 200）。机器可判的共同套路：把"行为"落到状态码/文件存在性/字节内容/响应字段四类可观察量上。`,
        rubric: [
          { point: '3 条 AC 均为完整 GWT 且覆盖异常路径（大小/格式/越权至少两类）', score: 3 },
          { point: '每条 AC 给出可自动化的断言手段（状态码/文件/字节）', score: 3 },
          { point: '反例含功能反例与改动反例且具体', score: 2 },
          { point: '说明了"异常路径不写清会被默认值填掉"的机制', score: 2 },
        ],
        keywords: ['Given', 'When', 'Then', '413', '魔数', '反例'],
        explanation: '判卷要点看"可观察量"：凡是落到状态码/文件/字节的 AC 都合格，凡是"友好提示""合理处理"都不合格。',
      },
      {
        id: 'cs146s-w3-l3-e8', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-w3-l3', tags: ['K', 'spec'],
        question: '反例清单的三类：功能反例（不实现 X）、______反例（不处理 Y）、______反例（不动 Z 文件/目录）。',
        blanks: [['输入', 'input'], ['改动', '修改', '文件']],
        explanation: '三类分别堵住三种跑偏：顺手加功能、顺手处理边界、顺手重构禁区。改动反例还要在 AGENTS.md 与权限层双重加固（l4、w6）。',
      },
    ],
  },
];
