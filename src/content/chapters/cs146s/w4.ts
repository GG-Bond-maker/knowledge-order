import type { Chapter } from '../../../types';

/* ============================================================
 *  CS146S Fall 2026 · Week 4：Coding Agent 协作模式
 *
 *  结构依据：Stanford CS146S Fall 2026 官方大纲（themodernsoftware.dev，
 *  官方作业仓库 mihail911/modern-software-dev-assignments）。
 *  本课程为参照官方大纲组织的自学教材，讲义内容为自主扩展编写。
 *
 *  来源：
 *  - 官方：CS146S 课程站 Week 4 主题（Coding Agent Patterns：autonomy
 *    levels、human-agent collaboration；嘉宾课堂：Claude Code 创造者
 *    Boris Cherney）
 *  - 官方作业：week4 Agent Manager（用 Claude Code 完成完整项目，人扮演
 *    Agent Manager；本项目 A 在 w4b.ts 中为参照该主题的自主设计）
 *  - 官方指定阅读：Anthropic《Claude Code: Best practices for agentic
 *    coding》、《Good Context Good Code》；git worktree 官方文档
 *  - 原创：L0-L4 决策矩阵、任务卡协议、案例、图示、全部习题
 * ============================================================ */

export const cs146sW4Chapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'cs146s-w4-c1',
    title: 'Week 4 · Coding Agent 协作模式',
    goal: '建立"人机分工决策框架"——能为任务选择正确的自治级别、掌握 Agent Manager 工作法（任务卡委派、多任务并行、里程碑验收），并精读 Anthropic 探索-计划-编码-提交的最佳实践。',
    lessons: [
      /* ─────────────────────────── l1 ─────────────────────────── */
      {
        id: 'cs146s-w4-l1',
        title: '自治等级 L0-L4：把"用多强"变成可决策',
        difficulty: 3,
        content: `
### 学习目标

学完本节，你应该能够：
1. 逐级说出 L0-L4 五个自治等级的定义、典型工具形态、人类介入点与典型风险，并把一个具体任务匹配到正确的等级；
2. 用"风险 × 可验证性 × 可回滚性"三维决策矩阵计算任务的推荐自治级别，并说出至少 3 条升级信号与 3 条降级信号；
3. 向团队解释为什么"自治级别按任务选、不按人选"，并识别"一刀切用最高级"与"永远停在补全级"两种极端的危害。

### 前置知识

- w1-l1 的自治光谱直觉："自治级别越高，验证体系必须越硬"——本节把这条直觉展开成可操作的分级与决策程序；
- w3-l2 / w3-l3：任务卡与机器可判的验收标准——L2 及以上级别的委托质量完全取决于它；
- w2：Agent 循环——L3/L4 的"后台多任务"本质是多个循环实例在并行。

### 问题背景

"AI 编程工具到底该怎么用"是 2025-2026 年工程团队内部最高频的争论：有人把 AI 当高级自动补全，有人让 Agent 整夜无人值守跑任务，双方都觉得自己在"正确使用"。争论的根源是：他们在用不同的自治级别，却以为在讨论同一件事。官方 Week 4 把这件事正式化为 autonomy levels（自治等级），并安排了 Claude Code 的创造者 Boris Cherney 的嘉宾课堂——核心信息是：高效使用者的共同点不是工具选得多好，而是**有意识地在级别之间切换**。

失败路径在光谱两头同时存在。一头是"补全型用户"：永远停在 L0，收益封顶在打字加速 10%，最后得出"AI 也就这样"的结论。另一头是"甩手型用户"：第一天就开 L4 无人值守，撞一次大坑后一朝被蛇咬，永久退回手写。两头的共同点是：**把级别选择交给了习惯和情绪，而不是交给决策程序**。本节的任务就是给你这个程序。

### 直觉理解

把 Agent 想成一位极其能干、新来的实习生，自治等级就是你给他的授权范围：

- **L0 影子实习**：你写他看——他只在你打字时给建议（IDE 补全）；
- **L1 你说他搭话**：内联对话里他给方案，逐条采纳与否全在你（聊天面板）；
- **L2 派单制**：你给一张任务单，他做完把成果（diff）放你桌上，你点头才能归档（任务委托 + 确认）；
- **L3 多单并行**：你同时派几张单给不同实习生，只在他们汇报里程碑时出面（多任务后台 + 检查点审批）；
- **L4 全权代理**：他自主跑完全程，你只看周报和告警（自主闭环，事后抽查）。

授权的关键从来不是"这个实习生可信不可信"，而是两件事：**这活儿错了好不好发现（可验证性），错了好不好撤回（可回滚性）**。有测试、能 git revert 的活，L4 也安全；碰钱、对外发布、不可撤销的活，L1 都要盯紧。

### 核心概念与原理详解

## 五级定义与操作特征

| 级别 | 名称 | 典型工具形态 | 人类介入点 | 典型风险 |
| --- | --- | --- | --- | --- |
| L0 | 人工执行 | IDE 补全（ghost text） | 每行代码都由人写，AI 被动建议 | 效率上限低；"补全依赖"造成能力错觉 |
| L1 | 内联对话 | 聊天面板 / 单文件问答 | 人逐条接受或拒绝建议 | 建议-接受循环漏看细节；上下文全靠手贴 |
| L2 | 任务委托 | Agent 任务模式 + diff 确认 | 人审查产出 diff，确认后应用 | diff 过大审查失真；任务理解偏差 |
| L3 | 后台多任务 | 多会话并行 + 里程碑审批 | 关键检查点出面，其余时间可离场 | 幽灵并行（没人管的任务）；改动互相覆盖 |
| L4 | 全自治 | 自主规划-执行-验证闭环 | 事后抽查结果与指标（告警驱动） | 错误静默累积；不可逆操作无人拦截 |

<Diagram type="autonomyladder" />

图里那条规律值得再读一遍：**等级每升一级，人的审批带宽就被压缩一次**。L0-L1 的审批是逐行的，L2 是逐 diff 的，L3 是逐里程碑的，L4 是逐事件的。升级的本质不是"更信任 AI"，而是**把原来花在审批上的时间预算，转投到验收体系建设上**——测试、断言、监控。没有这个转投，升级就是拿质量赌运气。

## 决策矩阵：三维打分

给任务打三个 1-5 的分：

1. **风险**：出错的代价。资金/安全/对外可见 = 5；内部工具 = 2；一次性脚本 = 1。
2. **可验证性**：错了多容易发现。有自动测试、可断言 = 5；只能人工点检 = 3；"上线了才知道" = 1。
3. **可回滚性**：错了多容易撤回。git 可 revert = 5；要跑数据订正 = 2；外部副作用（已发出的邮件、已上线的变更）= 1。

推荐级别 = **先算支持度，再被风险封顶**：

- 支持度 = min(可验证性, 可回滚性)——**短板决定上限**：验证再强，撤不回就不能放手；
- 基础级别 = min(4, 支持度 - 1)；
- 风险封顶：风险 1/2 不封顶；3 → 封顶 L3；4 → 封顶 L2；5 → 封顶 L0。

例：内部工具补测试（风险 2 / 可验证 5 / 可回滚 4）→ 支持度 4 → 基础 3 → 封顶不生效 → **L3**；生产库数据订正（风险 5 / 可验证 3 / 可回滚 1）→ 支持度 1 → 基础 0 → 封顶 0 → **L0（人写脚本人执行）**。

## 升级与降级信号

**可升级的信号**（满足全部才升一级）：

1. 同类任务一次通过率 ≥ 90%（统计方法见 l5）；
2. 验收已自动化（验收标准能跑成断言）；
3. 改动可回滚且有回滚预案。

**必须降级的信号**（出现任意一条即降）：

1. 连续两次验收不通过，或同类任务通过率跌破 70%；
2. diff 里出现了任务卡之外的改动；
3. Agent 开始触碰禁区文件或目录；
4. 测试覆盖率或既有断言被悄悄削弱；
5. 你发现自己开始读不懂这个改动了。

降级不丢人：**分级制度的意义，就是让降级成为一个轻巧的、不带情绪的操作**。

### 完整案例

同一天内的三次级别切换。背景：电商后台，你负责购物车模块。

1. **早上（L2）**：委托"加优惠码功能"。任务卡四件套齐全，Agent 产出 diff，你验收时发现它**顺手把金额计算从整数分改成了 float**——任务卡禁区里没写这条，属于 Agent 的"顺手优化"。动作：打回，并在禁区补一条"金额一律整数分"（w3-l3 的改动反例清单）。
2. **上午（降级 L1）**：同一模块还要加"优惠叠加规则"，但规则本身你也只有模糊想法——**写不出机器可判的验收标准**（降级信号 1）。降到 L1 内联对话，花 20 分钟和 Agent 把规则对齐成 Spec，再升回 L2 委托实现。
3. **下午（升 L3）**：为 30 个内部报表脚本统一加日志格式。机械重复、有测试、可回滚（风险 2 / 可验证 5 / 可回滚 5），且同类任务早上刚拿下一个（通过率数据在手）。挂后台三个并行任务，只在每个完成时验收。

**自解释提示**：第三次为什么敢升 L3？不是因为"今天状态好"，而是三个升级条件全部满足：同类任务有通过率记录、验收自动化（有测试）、可回滚（git revert）。**升级是证据驱动的，降级也是**——这就是把"用多强"从感觉变成决策的含义。

### 代码实践

下面的"自治级别决策器"把三维矩阵写成了函数——它就是你团队 wiki 里那张决策表的代码化。跑一遍五个典型任务，观察支持度短板与风险封顶分别在哪里生效。

### 常见误区与安全风险

- **误区一：自治级别是工具的属性。**"Claude Code 只能跑 L3"是错的——同一个工具通常覆盖 L0-L4 全部形态（补全、对话、任务、后台、headless 模式）。级别是**任务与环境**的属性。
- **误区二：L3/L4 省下的时间都是净赚。** 审批带宽被压缩的同时，验收体系建设与事后审计成本被**后置**。没有自动验收就开 L3，等于把验收欠债滚进生产事故里还。
- **误区三：出一次错就永久降级。** 单次失败可能是任务异常而非能力问题；应按 l5 的"按任务类型统计"来校准，而不是凭一次印象一刀切。
- **安全提示：级别越高，权限边界必须越硬。** L3/L4 任务必须运行在隔离环境（独立分支 / worktree / 容器），文件与命令权限做白名单（Week 6 的权限模式与沙箱矩阵会展开）；**任何级别都不许触碰凭据、生产数据与对外发布**（l5 红线）。

### 知识关联：承上启下

- 承上：w1-l1 的自治光谱在本节操作化为 L0-L4 与决策矩阵；w3-l2/l3 的任务卡与 AC 是 L2+ 委托的燃料；w2 的 Agent 循环是 L3/L4 的引擎；
- 启下：l2 讲 L3 状态下"人"的标准工作法（Agent Manager）；l3 讲 L2 委托的最佳实践工作流；l5 把升降级信号量化为一次通过率校准；l6 项目 A 让你亲手实现一个 L2 级 Agent 的循环内核。

### 动手实验

1. 运行下方决策器，把五个示例任务换成你本周真实要做的 5 件事，重新打分；
2. 打开上方 autonomyladder 交互图，逐级点击台阶，把每级的"人类介入点"抄进笔记，对照你现在的实际用法——多数人发现自己长期停在某一级；
3. 为你最想升级的那个任务，写出它还缺哪条升级信号、本周怎么补上。

### 本节总结

1. 自治等级 L0-L4 是按任务选择的决策项，不是按人选的固定风格；
2. 决策矩阵三维：风险（封顶项）、可验证性与可回滚性（短板项，支持度取 min）；
3. 升级三条件（通过率 / 自动验收 / 可回滚）与降级五信号，让级别切换成为轻巧的数据驱动操作；
4. 升级的本质是把审批时间转投验收体系；没有自动验收的升级是欠债；
5. 红线不随级别变化：凭据、生产数据、对外发布永不委派。

### 参考资料与延伸阅读

- Anthropic《Claude Code: Best practices for agentic coding》——官方对权限模式与自治形态的划分依据：对应"五级定义"模块；
- [Stanford CS146S 官方课程站](https://themodernsoftware.dev) Week 4（Coding Agent Patterns：autonomy levels 与人机协作；嘉宾：Claude Code 创造者 Boris Cherney）——对应"问题背景"与全节定位；
- [官方作业仓库 mihail911/modern-software-dev-assignments](https://github.com/mihail911/modern-software-dev-assignments) week4（Agent Manager）——级别选择实战场景的主题锚点：对应"完整案例"；
- 本节三维决策矩阵、升降级信号清单、决策器 demo 均为自主设计的原创教学内容。

### 本节习题导引

fill/single 题校准五级定义与矩阵计算；code 题让你实现决策函数；open 题要求为三个真实任务完成完整的选级论证。
`,
        tips: [
          { kind: 'pitfall', text: '升级前先问一句"它的验收能自动跑吗"——不能，就先补测试再升。没有自动验收的 L3 是把审批欠债滚到生产事故里还。' },
          { kind: 'note', text: '把三维打分（风险/可验证性/可回滚性）写进你的任务卡模板首行：选级理由可视化，团队评审时才有共同语言。' },
          { kind: 'interview', text: '"你怎么决定让 AI 自主到什么程度？"——答三维决策矩阵 + 短板原则 + 风险封顶，再补一句"级别按任务选不按人选"，这是体系化使用者的标准答案。' },
          { kind: 'performance', text: 'L0/L1 也有高价值用法：探索不熟悉的代码库时用 L1 对话快速建立地图，比让 Agent 直接改代码更省 token 也更安全。' },
        ],
        demos: [
          {
            title: '自治级别决策器：三维打分到推荐等级',
            lang: 'python',
            code: `# 自治级别决策器: 风险 x 可验证性 x 可回滚性 -> 推荐等级
CAPS = {1: 4, 2: 4, 3: 3, 4: 2, 5: 0}   # 风险封顶表

def choose_level(risk, verifiability, rollback):
    support = min(verifiability, rollback)  # 短板决定上限
    return min(min(4, support - 1), CAPS[risk])

TASKS = [
    ("为 30 个空目录生成 README 模板", 2, 5, 5),
    ("给内部工具补单元测试", 2, 5, 4),
    ("修复购物车金额合计 bug", 3, 5, 4),
    ("重写用户认证模块", 4, 4, 3),
    ("执行生产库数据订正", 5, 3, 1),
]
for name, r, v, rb in TASKS:
    lvl = choose_level(r, v, rb)
    print(f"L{lvl}  {name}  (风险{r} 可验证{v} 可回滚{rb})")

# 观察点: 前两个任务支持度高, 直达 L4/L3;
# 后三个被风险封顶逐步压回 L3/L2/L0 —— 生产数据订正永远 L0(人写人跑)`,
          },
        ],
      },

      /* ─────────────────────────── l2 ─────────────────────────── */
      {
        id: 'cs146s-w4-l2',
        title: 'Agent Manager 工作法：从执行者到管理者',
        difficulty: 3,
        content: `
### 学习目标

学完本节，你应该能够：
1. 说清 Agent Manager 与"AI 工具用户"的角色差异，把"技术负责人管理外包团队"的心智模型迁移到日常开发；
2. 按四件套（目标 / 上下文指针 / 验收标准 / 禁区）写出可委派的任务卡，并用检查器识别不可委派的任务卡；
3. 用"任务看板 + 每任务一会话 + git worktree 隔离"管理 2-3 个并行任务，执行里程碑验收而非逐行审查，并说出 5 种亲自下场的信号。

### 前置知识

- l1 的 L3 定义（多任务后台）——Agent Manager 工作法就是 L3 状态下"人"的标准作业程序；
- w3-l2 / w3-l3：四层产物与机器可判 AC——任务卡是 Tasks 层在真实委派中的执行形态；
- Git 分支的基本操作（worktree 部分只需概念级理解）。

### 问题背景

官方 Week 4 的作业是一次角色反转：用 Claude Code 完成一个完整项目，**全程一行代码都不许自己写**——你只能写任务卡、回答 Agent 提问、做验收，角色即本节标题的 Agent Manager。这个作业模拟的正是行业里正在发生的岗位演化：一批工程师的日常工作从"写代码"变成了"管理一支不等薪、永不疲倦、但需要极清晰指令的团队"。

失败路径有两个方向。"口述式委派"：把委派做成聊天——想到哪说到哪，上下文挤牙膏式补充，Agent 只能靠猜，返工三轮后你怒斥"AI 不行"。"逐行式审查"：不放心任何产出，逐行审 Agent 的每个 diff，审查时间超过自己写的时间，效率退回 L0 还搭上双份时间。两种失败的共同点是**角色的肌肉记忆没换**：前者还是"接需求的开发"，后者还是"写代码的开发"。Agent Manager 是第三种角色：像技术负责人管外包团队那样管 Agent——单子写清楚、过程不插手、交付看证据。

### 直觉理解

Agent Manager = 外包团队的 Technical PM。你管理的对象有三个特点：极快（分钟级交付）、零公司记忆（每个会话都是新入职）、字面主义（没写的按默认来）。因此管理原则全部改写：

- 一次性把单子写全 > 挤牙膏式补充（w3-l3：模糊处会被默认值填满）；
- 看产出物证据 > 盯执行过程（你没带宽盯，盯了也盯不住）；
- 里程碑验收 > 逐行审查（你的带宽该花在"对不对"，不是"怎么写的"）；
- 每单一个新会话 > 一个会话聊到底（上下文隔离，l4 展开机制）。

### 核心概念与原理详解

## 角色定义

| 维度 | 传统执行者 | Agent Manager |
| --- | --- | --- |
| 核心产出 | 代码 | 任务卡 + 验收结论 |
| 时间去向 | 写代码、调试 | 写清楚任务、回答提问、验收 |
| 质量抓手 | 自身技能与经验 | 任务卡质量 + 自动验收 + 抽查 |
| 处理模糊 | 自己拍板继续 | 要么写进任务卡，要么让 Agent 显式提问再裁决 |
| 典型失败 | 写出 bug | 写出歧义任务卡 / 验收放水 |

注意最后一列：Manager 也会失败，但失败形态变了。**你的 bug 不再是语法错误，而是任务卡里的歧义和验收环节的放水。**

## 任务委派协议：任务卡四件套

| 件 | 内容 | 常见反例 |
| --- | --- | --- |
| 目标 | 一句话 + 成功指标（为什么做、做到什么程度算成） | 只有一句"优化一下购物车" |
| 上下文指针 | 文件路径、相关 PR/issue、文档链接，各配一行"为什么相关" | 把整个目录打包进会话（上下文倾倒，l5 反模式） |
| 验收标准 | 机器可判的 GWT 清单（5-8 条） | "体验要好""性能要高" |
| 禁区 | 功能 / 输入 / 改动三类反例清单 | 没有禁区——Agent 的"顺手优化"畅通无阻 |

**指针原则**：给路径不给全文。Agent 有工具，自己会读；你搬运全文只会撑爆上下文并稀释注意力。指针后面那行"为什么相关"是给 Agent 的注意力导航——没这行，它可能读了你给的文件却不知道该看什么。

## 多任务并行管理

L3 意味着同时有多个任务在后台跑，三件配套缺一不可：

1. **任务看板**：四列——Todo（写好的任务卡）/ Doing（Agent 执行中）/ Blocked（等你回答提问或裁决）/ Review（待验收）。看板是 Manager 的驾驶舱：任何时刻看一眼就知道每个任务卡在哪、谁在等你。
2. **每任务一个会话**：两个任务共用一个会话 = 上下文互染——A 任务的文件内容与报错历史会干扰 B 任务的判断（w1-l4 的干扰与冲突模式）。独立会话还给"失败即弃"留了余地：B 跑偏了，关掉重来，不污染 A。
3. **git worktree 隔离（概念级）**：并行任务各自改文件，同一工作目录会互相踩脚。git worktree 允许**同一个仓库同时检出多个分支到不同目录**（官方文档：a single repository can maintain multiple working trees）——每个后台 Agent 一个目录、一个分支，合并时你统一裁决。概念记忆：worktree = 给每个 Agent 一间独立工位。

## 里程碑验收 vs 逐行审查

验收三问（10 分钟内完成）：

1. **验收标准过了吗？**——跑验收命令或断言，看证据，不听汇报；
2. **diff 里有没有没让你做的事？**——改动文件清单与禁区逐一核对，"顺手优化"是最常见的夹带；
3. **这个改动你能向同事解释清楚吗？**——5 分钟内讲不出设计意图，说明你没真正验收。

逐行审查只在三种情况必须：安全敏感代码（支付 / 权限 / 加密）、不可回滚改动、与某个 Agent 的早期磨合期（它还没有建立通过率记录，见 l5）。

## 何时亲自下场（降级信号）

1. 任务卡写不出机器可判的验收标准——需求本身没想清楚，先回炉；
2. Agent 连续两轮没有实质进展——换路：拆小任务或重写提示词；
3. 修复引入新问题——影响面超出了任务卡视野，回 L1 重新对齐；
4. 涉及凭据、生产数据、对外发布——红线，永远亲自（l5）；
5. 关键架构决策需要拍板——这是你的工作，不是 Agent 的。

**下场不是失败，是分工**：Manager 的判断力恰恰体现在知道哪些环节必须是自己。

### 完整案例

一周看板实录。任务池：A 优惠码功能（L2）；B 为 30 个报表脚本加日志（L3，三路并行）；C 修复偶发对账 bug（L1 起步）。

| 时间 | 看板动作 | 为什么 |
| --- | --- | --- |
| 周一上午 | A 进 Doing（独立会话）；B 三张卡进 Doing（三个 worktree 目录）；C 停在 Todo | C 写不出可判验收标准（降级信号 1），先回炉需求 |
| 周一下午 | A → Blocked（Agent 提问：两码同用语义是什么？） | 开放问题显式化，Agent 不默默决定 |
| 周一晚 | 裁决 A 的提问 → A 回 Doing | 裁决花 1 分钟，比事后返工便宜一个量级 |
| 周二 | A 验收（三问 + 禁区核对）→ 合并；B 第一路完成 → Review | 验收三问逐条执行 |
| 周三 | B 第二路 diff 出现任务卡外改动（顺手改了报表样式）→ 打回 | 夹带检查的必要性：禁区清单里没有"样式" |
| 周四 | C 改写任务卡后进 Doing | 需求终于想清楚了 |
| 周五 | B 三路全合并；C 验收通过；看板清空；复盘：本周一次通过率 7/8 | 数据进入 l5 的校准表 |

**自解释提示**：为什么 C 修 bug 反而最慢？——"修复偶发对账 bug"写不出可判的验收标准（什么算偶发？复现步骤是什么？）。Manager 一周里最值钱的动作常常不是催 Agent，而是**把模糊任务回炉成可委派任务**。

### 代码实践

本节的演示用 text 形式完整走一遍"任务卡 → Agent 汇报 → 验收提问 → 合并"四幕委派会话。重点看第三幕：验收提问如何把任务卡的空白逼出来，以及 Agent 如何把开放问题显式交还而不是默默决定。

### 常见误区与安全风险

- **误区一：任务卡写得越细越好。** 写到"每行怎么实现"就越位了——任务卡锁定目标与验收，实现自由度留给 Agent；过度规定实现等于你还在写代码，只是换了个输入法。
- **误区二：并行越多越好。** 审查带宽是硬瓶颈：并行任务数 ≤ 你能同时验收的数目（多数人是 2-3）。超出的并行就是 l5 说的幽灵并行。
- **误区三：Agent 汇报"完成"就是完成。** 汇报是 Agent 的自我陈述，验收是你要的证据（断言输出、测试结果、禁区核对）。听汇报放行 = 验收放水。
- **安全提示：任务卡会整体进入 Agent 上下文**——写之前脱敏（定价、密钥路径、真实用户数据不进卡）；每张卡的禁区必须包含三不动：不动凭据与配置、不动生产数据、不做对外发布（l5 红线）。

### 知识关联：承上启下

- 承上：l1 的 L3 是本节工作法的运行环境；w3-l2/l3 的 Tasks 层与 AC 是任务卡的模板来源；w1-l4 的干扰/冲突模式是"每任务一会话"的机制依据；
- 启下：l3 把"单任务怎么委托"精读成 Anthropic 的四阶段最佳实践；l4 讲并行背后的多 Agent 机制；l5 把本节的验收与看板数据变成信任校准的输入；l6 项目 A 让你实现 Agent 侧的循环，体会被管理的这一端。

### 动手实验

1. 运行下方委派会话演示，数一数任务卡四件套各出现在哪一幕；
2. 把你手头一件真实工作写成四件套任务卡，对照"可委派"标准自查（code 习题的检查器可以直接用）；
3. 建一个四列看板（Todo/Doing/Blocked/Review），把这张卡放进去，体验一次"Blocked 等裁决"的流程。

### 本节总结

1. Agent Manager 的核心产出是任务卡与验收结论；你的 bug 从语法错误变成了歧义与放水；
2. 任务卡四件套：目标（一句话+成功指标）、上下文指针（路径+为什么相关）、验收标准（机器可判 GWT）、禁区（三类反例）；
3. 并行三配套：任务看板、每任务一个会话、git worktree 独立工位；
4. 里程碑验收三问取代逐行审查；逐行审查只留给安全敏感、不可回滚、磨合期三种情况；
5. 五种亲自下场的信号——会下场才是 Manager 的判断力。

### 参考资料与延伸阅读

- [官方作业仓库 week4（Agent Manager）](https://github.com/mihail911/modern-software-dev-assignments)——"一行代码不写、只做 Manager"的角色反转作业，本节的主题锚点；
- Anthropic《Claude Code: Best practices for agentic coding》——CLAUDE.md、任务拆分与验收的官方建议：对应"任务委派协议"模块；
- [git worktree 官方文档](https://git-scm.com/docs/git-worktree)——多工作树机制的权威定义：对应"多任务并行管理"模块（概念级）；
- 本节任务卡四件套、看板实录、委派会话 demo 均为自主设计的原创教学内容。

### 本节习题导引

fill/single 题校准任务卡四件套与指针原则；code 题实现任务卡检查器；open 题要求为重构任务写完整任务卡并设计验收提问。
`,
        tips: [
          { kind: 'pitfall', text: '验收先看"改动文件清单"再看代码：凡是清单里出现任务卡没提的文件，先停下来问为什么——夹带改动是最高频的验收漏网之鱼。' },
          { kind: 'performance', text: '任务卡里给指针时附一行"为什么相关"：同一份文件列表，带导航的委托第一轮命中率显著更高，省掉 1-2 轮来回。' },
          { kind: 'note', text: '把裁决记录（Agent 提问 + 你的答复）追加进任务卡原文：同一任务二次委托时，新会话能继承全部裁决，不用重新对齐。' },
          { kind: 'interview', text: '"并行挂了 5 个 Agent 任务为什么反而更慢？"——答审查带宽瓶颈 + 幽灵并行：产出速度翻倍，验收带宽没翻倍，堆积的 Review 队列让交付延迟不降反升。' },
        ],
        demos: [
          {
            title: '完整委派会话：任务卡 → 汇报 → 验收提问 → 合并（text 演示）',
            lang: 'text',
            code: `【四幕完整委派】优惠码功能

── 第一幕: 发任务卡 ────────────────────────────────
Manager: 任务: 为购物车增加优惠码功能
  目标: 支持 SAVE10(九折) 与 FREESHIP(免运费) 两个优惠码,
        上线后人工核算优惠订单的时间减半
  上下文指针: 金额计算在 src/cart/total.py(整数分, 勿动精度);
              优惠配置读 src/config/promos.json;
              既有测试 pytest tests/cart/ -q 全绿(共 14 条)
  验收标准:
    AC1 Given SAVE10 且购物车 100 元 When 结算 Then 应收 90 元
    AC2 Given FREESHIP 且运费 12 元 When 结算 Then 运费置 0 且商品金额不变
    AC3 Given 无效优惠码 When 结算 Then 返回错误且金额不变
  禁区: 不修改 payments/ 目录; 不引入新依赖; 不改既有 14 条测试的断言

── 第二幕: Agent 汇报 ──────────────────────────────
Agent: 已完成。改动 2 个文件(+38/-2): total.py 新增 apply_promo();
       promos.py 新增配置读取。测试新增 6 条, 20/20 通过。
       逐条对账: AC1 通过(断言 test_save10) AC2 通过(断言 test_freeship)
                 AC3 通过(断言 test_invalid_promo_amount_unchanged)
       禁区核对: 未触碰 payments/ 与既有测试断言。

── 第三幕: 验收提问(里程碑验收, 不是逐行审查) ──────
Manager: 三个问题:
  1. AC3 的"金额不变"是测试断言还是只是提示语?
  2. SAVE10 与 FREESHIP 同时给出时, 行为是什么? 任务卡没写, 你怎么处理的?
  3. promos.json 读不到时会发生什么?
Agent: 1. 是断言: test_invalid_promo_amount_unchanged 检查 total 不变
  2. 任务卡未定义 -> 我实现为"只能用一个, 后者覆盖前者" —— 需要你裁决
  3. 按空配置处理: 所有优惠码视为无效, 正常结算
Manager: 问题 2 裁决: 互斥使用, 同时给出以先出现者为准。
         请补 AC4 与测试后合并。

── 第四幕: 合并 ────────────────────────────────────
Agent: 已补 AC4(断言: 两码同给, 按 SAVE10 生效) + 2 条测试, 22/22 通过。
Manager: (跑全量测试 + 读 diff 5 分钟 + 核对禁区清单) -> 合并, 关卡。

# 观察点: 第三幕问题 2 是 Agent Manager 工作法的精髓 ——
# Agent 把任务卡的空白显式暴露出来而不是替你默默决定
# (w3-l3 开放问题原则的运行时形态); 裁决只花一分钟。`,
          },
        ],
      },

      /* ─────────────────────────── l3 ─────────────────────────── */
      {
        id: 'cs146s-w4-l3',
        title: 'Anthropic 最佳实践精读：探索-计划-编码-提交',
        difficulty: 3,
        content: `
### 学习目标

学完本节，你应该能够：
1. 复述 Anthropic《Claude Code best practices》四阶段工作流（探索 → 计划 → 编码 → 提交）各阶段的产出物与人的介入点，并解释"先探索后计划"为什么能显著降低返工；
2. 用计划模式完成一次"先出计划、人批准、再动手"的委托，并写出 TDD 与 Agent 结合的红绿节奏；
3. 判断什么时候值得开子代理做上下文隔离、什么时候不值得，并把《Good Context Good Code》2.5x 案例归因到四阶段的具体环节。

### 前置知识

- l2 的任务卡四件套——本节的四阶段是"单任务怎么委托"的官方答案，任务卡是它的输入；
- w3-l1 的上下文预算——探索阶段的本质是给窗口做一次高质量供给；
- w1-l2 的成本模型——为什么"计划阶段便宜、返工昂贵"不只是比喻，而是账面事实。

### 问题背景

Anthropic 官方工程博客《Claude Code: Best practices for agentic coding》给出了一组被广泛引用的工作流，其中最重要的就是 **explore-plan-code-commit**。为什么需要它：默认把任务直接扔给 Agent = 跳过探索与计划直接编码——模型会基于第一印象选一条实现路，选错了就带着执行力一路狂奔。四阶段把"想"和"做"分开，让最便宜的阶段（读文件、写计划）消化掉方向性风险。

官方 Week 4 把这篇列为指定阅读，与前两周的阅读形成一条线：w3 的《Specs Are the New Source Code》讲"意图要写成文件"，本篇讲"意图变成代码之前的四步怎么走"，《Good Context Good Code》则用 2.5x 的数据证明这条路的价值。三篇合起来是同一个论点：**AI 原生开发的杠杆在编码之前与编码之外**。

### 直觉理解

四阶段 = 装修的正确顺序：

- **探索**是量房：不看现场就出图，图纸再漂亮也是空中楼阁；
- **计划**是出图与签字：施工队不能自己改图纸——你签字的是合同；
- **编码**是施工：按图施工，遇到与图纸冲突的地方停下来问，不擅自变更；
- **提交**是验收交房：跑验收、留记录，出问题能追溯。

跳过量房直接开工的装修队和跳过探索直接编码的 Agent 犯的是同一种错：**用执行力掩盖方向未定**。

### 核心概念与原理详解

## 四阶段工作流

| 阶段 | 做什么 | 产出物 | 人的介入点 | 跳过的代价 |
| --- | --- | --- | --- | --- |
| 探索 explore | 读相关文件、搜索、理解现状 | 现状摘要与影响面 | 确认它找对了地方 | 方向性跑偏（改错文件） |
| 计划 plan | 产出实施计划 | 分步计划（文件级） | 批准或打回 | 错路狂奔式返工 |
| 编码 code | 按计划实现 | 代码 + 测试 | 里程碑检查 | 计划漂移（做着做着变了） |
| 提交 commit | 跑验证、写提交说明 | 干净 diff 与记录 | 最终 review | 不可追溯的改动 |

两个容易被忽略的细节：**探索阶段的产出要落成文字**（让 Agent 把"我理解的问题与影响面"写出来给你确认——写不出来 = 没读懂）；**计划要写到文件**（plan.md），让后续阶段可以引用它，也让"实现偏离计划"变得可检查。

## 计划模式（Plan Mode）

主流 Agent 工具都提供计划模式：**先只读不写，产出计划，人批准后才切换到执行**。三条实践要点：

1. 计划批准 = 合同：批准后的计划是后续验收的对照物，编码阶段每完成一步都应能对回计划的某一条；
2. 让 Agent 在计划末尾列"开放问题"，而不是自己猜——l2 的裁决机制在这里生效；
3. 打回要趁早：计划阶段打回的成本几乎为零（改几百字），编码后打回的成本是整个 diff 重来。

## TDD 与 Agent 的化学反应

TDD（测试驱动开发）与 Agent 的组合效果远好于各自单独使用，官方最佳实践明确建议先让 Agent 写测试、人确认测试合理后再让它写实现：

- **测试 = 机器可判的验收标准**：w3-l3 的 GWT 在这里落地成断言——你不再需要人肉检查"行为对不对"；
- **绿了就停**：测试全绿给了 Agent 一个明确的停止信号，防止它"表现能力"式地过度发挥（围栏，w3-l3 反例清单的时间维版本）；
- **失败输出是最强反馈**：测试失败信息自动进入上下文，Agent 不需要你转述就知道哪里错了——错误反馈的保真度远高于人的自然语言描述。

节奏：红（测试就位、实现缺席，测试失败）→ 绿（Agent 实现到测试全过）→ 提交（跑全量回归 + 人审 diff）。

## 子代理 / 上下文隔离的使用时机

值得开子代理的三种情况：

1. **大范围探索**：搜遍仓库找模式、统计用法——几十个文件的读取会污染主上下文，交给子代理，只把结论带回主会话；
2. **独立并行任务**：互不依赖的子任务各开一个代理（l4 的主从式拓扑）；
3. **需要"干净视角"的评审**：critic 子代理只看产出物、不看 generator 的推理过程，避免被锚定。

不值得的情况：小任务（调度开销大于收益）；强依赖同一上下文的连续修改（拆开反而丢信息）。

## 2.5x 案例复盘：好上下文从哪里来

《Good Context Good Code》的 2.5x 生产力提升（w3-l1 已引入）现在可以归因到四阶段的每个环节：**任务模板化** = 探索阶段的预制（常用任务的上下文供给不用每次从零开始）；**按角色维护上下文包** = 计划阶段的输入资产化；**验证结果回流** = 提交阶段的产出变成下一次的检索注入。结论：2.5x 不是"模型更强了"，而是**四阶段的中间产物被当成了资产来复用**。

### 完整案例

任务："订单导出 CSV"（w3-l3 的老朋友）。四阶段走查：

1. **探索**：Agent 读出导出入口在 src/export/、列定义在 src/models/order.py、无既有测试；输出影响面："改 export/writer.py，可能影响 2 个调用方"。你确认它找对了地方（介入点 1）。
2. **计划**：Agent 产出 plan.md——三步：列固定与格式化 → 编码与下载头 → 边界（空列表、5 万行上限）。末尾开放问题："是否需要压缩包？"标注"待裁决"。你打回一次：计划漏了**权限检查**（谁有权导出？）。Agent 补上第四步与对应 AC 后你批准（介入点 2——打回发生在计划阶段，成本是改四行字）。
3. **编码（TDD 节奏）**：先让 Agent 写测试——AC1（100 条订单导出 101 行）、AC2（1234.50 尾零）、AC3（无权限 403 且不落盘）、AC4（空列表仅表头）。你确认四条测试合理（没有测错方向），Agent 再实现到全绿。中途它想顺手支持 xlsx，被"绿了就停 + 任务卡禁区"双闸拦下。
4. **提交**：跑全量回归、读 diff 核对禁区、提交说明里链接 plan.md 与四条 AC（介入点 3）。

**自解释提示**：第 2 步那次打回如果发生在第 3 步之后会怎样？——权限检查缺失意味着整个导出路径要返工：路由、服务层、测试全部重写。**打回的位置决定返工的价格**，这就是四阶段把"想"和"做"分开的全部经济学。

### 代码实践

下面的"TDD 红绿演示"展示测试先行的两拍节奏：桩实现只猜中一个用例（红），通用实现全绿（绿）。注意 RED 阶段的失败信息如何直接指明下一轮该修什么——这就是"失败输出是最强反馈"的含义。

### 常见误区与安全风险

- **误区一：计划越详细越好。** 计划写到文件级与验收级即可；写到每行怎么写等于替 Agent 写代码，还让计划本身难以维护。计划的详细度应服从"每条可验收"。
- **误区二：探索阶段是浪费时间。** 大仓库里 5 分钟探索省 1 小时返工；跳过探索是返工的第一根因。感觉"探索慢"时，把常用任务的探索产物模板化（2.5x 案例的做法）。
- **误区三：TDD 让 Agent 变慢。** 变慢的是打字，变快的是收敛——测试的失败信息让 Agent 少走弯路，且"绿了就停"避免了过度发挥带来的验收负担。
- **安全提示：探索阶段 Agent 会大量读文件**——确认敏感文件（.env、密钥、真实数据导出）已被权限层挡住（Week 6 的权限矩阵）；计划文件与提交说明进仓库前脱敏，它们都会成为仓库的一部分。

### 知识关联：承上启下

- 承上：l2 的任务卡是四阶段的输入；w3-l2 的 Plan 层产物与 plan.md 是同一件事在不同粒度的形态；w1-l4 的失效模式解释了为什么探索要隔离（子代理）；
- 启下：l4 的多 Agent 拓扑把"子代理隔离"展开成完整机制；l5 的校准数据告诉你哪些任务值得走完整四阶段、哪些可以简化；l6 项目 A 的执行循环就是"编码"阶段的机器内核，FakeLLM 脚本里会显式安排 explore 与 run_tests 的顺序。

### 动手实验

1. 运行下方 TDD 红绿演示，然后为你手头的一个小函数写出 3 条"先行的测试"，体验一次红-绿节奏；
2. 把 l2 你写的那张任务卡升级成四阶段执行单：探索要确认什么、计划要包含哪几步、哪几条 AC 先行；
3. 找一次你"直接让 Agent 干"结果返工的经历，标出如果在哪个阶段介入可以省掉返工。

### 本节总结

1. 四阶段（探索 → 计划 → 编码 → 提交）把"想"和"做"分开：最便宜的阶段消化方向性风险；
2. 计划模式三要点：批准即合同、计划落成文件、开放问题显式列出；打回的位置决定返工的价格；
3. TDD 与 Agent 互相成就：测试是机器可判的验收标准、绿了就停是停止信号、失败输出是最强反馈；
4. 子代理用于大范围探索、独立并行、干净评审；小任务与强耦合修改不值得；
5. 2.5x 的本质是四阶段中间产物的资产化复用——任务模板化、上下文包、结果回流。

### 参考资料与延伸阅读

- Anthropic《Claude Code: Best practices for agentic coding》（官方 Week 4 指定阅读）——四阶段工作流、计划模式与 TDD 建议的原文出处：对应全部核心概念；
- 《Good Context Good Code》（官方指定阅读）——2.5x 生产力案例：对应"案例复盘"模块；
- [官方作业仓库 week4](https://github.com/mihail911/modern-software-dev-assignments)——作业要求以四阶段工作法完成项目：对应"完整案例"；
- Kent Beck《Test-Driven Development》——TDD 红-绿-重构节奏的原始出处：对应"TDD 与 Agent 的化学反应"；
- 本节四阶段对照表、CSV 案例走查、红绿 demo 均为自主设计的原创教学内容。

### 本节习题导引

fill/single 题校准四阶段顺序与 TDD 价值；code 题实现工作流校验器；open 题要求为一个真实功能设计完整的四阶段执行单。
`,
        tips: [
          { kind: 'performance', text: '探索阶段让 Agent 把"影响面"写成三行文字给你确认：这一分钟换来的是它后续每一步都在正确的文件上操作。' },
          { kind: 'pitfall', text: '计划批准后不要口头追加需求：新需求 = 走变更（更新 plan.md 与 AC）再继续。口头追加会让"计划"退化为装饰品。' },
          { kind: 'interview', text: '"为什么先让 AI 写测试再写实现？"——测试是机器可判验收标准（w3-l3 GWT 的落地）、给了停止信号、失败信息是最高保真的反馈；三句话是完整答案。' },
          { kind: 'leak', text: '子代理探索大仓库时，它会读取大量文件内容：确认权限层挡住了敏感路径，否则这些内容会进入子代理上下文并可能被复述进结论。' },
        ],
        demos: [
          {
            title: 'TDD 红绿两拍：测试先行如何给 Agent 反馈',
            lang: 'python',
            code: `# TDD 与 Agent 的化学反应: 红 -> 绿 两拍子
TESTS = [
    ("空购物车合计为 0", lambda total: total(()) == 0),
    ("单件 100 分合计 100", lambda total: total((100,)) == 100),
    ("多件求和 600", lambda total: total((100, 200, 300)) == 600),
]

def phase(fn, label):
    fails = [name for name, check in TESTS if not check(fn)]
    if fails:
        print(f"{label}: {len(TESTS) - len(fails)}/{len(TESTS)} 通过 -> RED")
        print(f"   失败信息回给 Agent: [{fails[0]}] 未通过")
    else:
        print(f"{label}: {len(TESTS)}/{len(TESTS)} 通过 -> GREEN, 允许提交")

stub = lambda items: 0          # Agent 第一版: 只猜中第一个用例的桩
v1 = lambda items: sum(items)   # Agent 第二版: 通用实现
phase(stub, "v0 桩实现")
phase(v1, "v1 通用实现")

# 观察点: 测试 = 机器可判的验收标准(w3-l3 的 GWT 落地);
# RED 的失败信息直接指明下一轮修什么 —— 反馈保真度远高于人的转述`,
          },
        ],
      },
    ],
    exercises: [
      /* ───────── l1 习题（8 题）───────── */
      {
        id: 'cs146s-w4-l1-e1', type: 'single', difficulty: 1, relatedLessonId: 'cs146s-w4-l1', tags: ['K', 'autonomy'],
        question: '自治等级 L2（任务委托）的定义特征是？',
        options: [
          { value: 'a', text: 'AI 逐行补全，人逐行接受' },
          { value: 'b', text: '人下达任务，Agent 产出 diff，人确认后才应用' },
          { value: 'c', text: '多任务后台并行，人只在检查点出现' },
          { value: 'd', text: '全自主闭环，人只做事后抽查' },
        ],
        answer: 'b',
        explanation: 'L2 的关键在"diff 确认"这个人类介入点：任务由 Agent 执行，但成果必须经人确认才落盘。c 是 L3，d 是 L4，a 是 L0-L1 的形态。',
      },
      {
        id: 'cs146s-w4-l1-e2', type: 'judge', difficulty: 1, relatedLessonId: 'cs146s-w4-l1', tags: ['K', 'autonomy'],
        question: '自治级别是工具的固有属性：某个工具只能固定运行在某一级别上。',
        answer: false,
        explanation: '同一个工具通常覆盖 L0-L4 全部形态（补全、对话、任务、后台、headless）。级别是任务与环境的属性：风险、可验证性、可回滚性决定你"用多强"。',
      },
      {
        id: 'cs146s-w4-l1-e3', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-w4-l1', tags: ['K', 'autonomy'],
        question: '决策矩阵的三个维度：______（出错的代价）、______（错了多容易发现）、______（错了多容易撤回）。',
        blanks: [['风险', '风险等级', '出错代价'], ['可验证性', '可验证', 'verifiability'], ['可回滚性', '可回滚', 'rollback']],
        explanation: '三个 1-5 打分：风险做封顶项，可验证性与可回滚性取 min 得支持度——短板决定上限。',
      },
      {
        id: 'cs146s-w4-l1-e4', type: 'multiple', difficulty: 3, relatedLessonId: 'cs146s-w4-l1', tags: ['U', 'autonomy'],
        question: '关于升降级触发信号，下列说法正确的有？',
        options: [
          { value: 'a', text: '同类任务一次通过率 ≥ 90% 且验收已自动化，才可升一级' },
          { value: 'b', text: 'diff 里出现任务卡之外的改动，应立即降级并复盘' },
          { value: 'c', text: '出一次错就应永久降回 L0，不能再用这个工具' },
          { value: 'd', text: 'Agent 开始触碰禁区文件，是必须降级的信号' },
        ],
        answer: ['a', 'b', 'd'],
        explanation: 'c 错在"凭一次印象一刀切"：单次失败可能是任务异常而非能力问题，应按 l5 的按类型统计校准。a/b/d 分别对应升级条件与两条降级信号。',
      },
      {
        id: 'cs146s-w4-l1-e5', type: 'single', difficulty: 3, relatedLessonId: 'cs146s-w4-l1', tags: ['U', 'autonomy'],
        question: '任务：为内部工具的日志格式做小改动。打分：风险 2、可验证性 5（有完整测试）、可回滚性 4（git 可 revert）。按决策矩阵，推荐级别是？',
        options: [
          { value: 'a', text: 'L1' },
          { value: 'b', text: 'L2' },
          { value: 'c', text: 'L3' },
          { value: 'd', text: 'L4' },
        ],
        answer: 'c',
        explanation: '支持度 = min(5, 4) = 4 → 基础级别 = min(4, 3) = 3；风险 2 不封顶 → L3。注意可回滚性 4 是短板：如果它也是 5，就能到 L4。',
      },
      {
        id: 'cs146s-w4-l1-e6', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-w4-l1', tags: ['K', 'autonomy'],
        question: '支持度 = min(______, ______)——短板决定上限；风险打分为 5 的任务，最终级别一律封顶为 ______（数字）。',
        blanks: [['可验证性', '可验证'], ['可回滚性', '可回滚'], ['0', 'L0']],
        explanation: '支持度取两个短板项的最小值；风险 5（资金/安全/不可逆）封顶 L0——人写脚本人执行，Agent 最多当参谋。',
      },
      {
        id: 'cs146s-w4-l1-e7', type: 'code', difficulty: 3, relatedLessonId: 'cs146s-w4-l1', tags: ['D', 'autonomy'],
        question: '实现 `choose_level(risk, verifiability, rollback)`：三个参数均为 1-5 的整数打分。规则：①支持度 support = min(可验证性, 可回滚性)；②基础级别 base = min(4, support - 1)；③风险封顶表 {1: 4, 2: 4, 3: 3, 4: 2, 5: 0}。返回 0-4 的最终级别整数。',
        lang: 'python',
        starterCode: `def choose_level(risk, verifiability, rollback):
    # support = min(verifiability, rollback)
    # base = min(4, support - 1)
    # 风险封顶表: {1: 4, 2: 4, 3: 3, 4: 2, 5: 0}
    pass

print(choose_level(1, 5, 5))
print(choose_level(4, 5, 5))
print(choose_level(5, 5, 5))`,
        expectedOutput: '4\n2\n0',
        tests: `assert choose_level(1, 5, 5) == 4, "低风险高支持 -> L4"
assert choose_level(3, 5, 4) == 3, "support=4, 被风险 3 封顶为 3"
assert choose_level(4, 5, 5) == 2, "风险 4 封顶 2"
assert choose_level(5, 5, 5) == 0, "风险 5 -> L0"
assert choose_level(2, 2, 5) == 1, "可验证性短板: support=2 -> 1"
assert choose_level(2, 1, 1) == 0, "support=1 -> 0"`,
        allowedModules: [],
        explanation: '两步走：支持度短板决定基础级别，风险封顶再压一层。这个函数就是 l1 demo 决策器的核心——把"用多强"从感觉变成一行代码可复现的决策。',
        answer: `def choose_level(risk, verifiability, rollback):
    support = min(verifiability, rollback)
    base = min(4, support - 1)
    caps = {1: 4, 2: 4, 3: 3, 4: 2, 5: 0}
    return min(base, caps[risk])

print(choose_level(1, 5, 5))
print(choose_level(4, 5, 5))
print(choose_level(5, 5, 5))`,
      },
      {
        id: 'cs146s-w4-l1-e8', type: 'open', difficulty: 4, relatedLessonId: 'cs146s-w4-l1', tags: ['D', 'autonomy'],
        question: '为以下三个任务分别选择自治级别，要求：① 给出三维打分（风险/可验证性/可回滚性，各 1-5 并说明理由）；② 按决策矩阵算出级别；③ 为每个任务写一条升级触发条件与一条降级触发条件；④ 写出你在该级别下的人类介入点。任务 A：修复支付对账的偶发错误；任务 B：为 30 个空目录生成统一 README 模板；任务 C：重写用户认证模块。',
        referenceAnswer: `参考答案（要点对齐即可，打分理由可合理差异）：

任务 A（修复支付对账偶发错误）：
- 打分：风险 5（资金相关，错账直接影响钱）；可验证性 2（偶发问题难复现，测试难写全）；可回滚性 3（代码可 revert，但错误数据可能已落库）。
- 计算：支持度 = min(2, 3) = 2 → 基础 1 → 风险 5 封顶 0 → **L0/L1**（Agent 只做分析与候选假设，人写修复并验证）。
- 升级条件：复现脚本 + 回归测试就位后（可验证性升到 4），且通过率数据支持，可到 L2 委托修复。
- 降级信号：任何一次"修复后对账金额不一致"立即停用。
- 介入点：人审根因分析、人执行修复与验证。

任务 B（30 个空目录生成 README）：
- 打分：风险 1（内部文档，错了无损失）；可验证性 5（生成结果可枚举比对）；可回滚性 5（git revert 或直接重跑）。
- 计算：支持度 5 → 基础 4 → 封顶不生效 → **L4**。
- 升级条件：本例已满；若是首跑可先 L2 抽查 3 个样本再放行。
- 降级信号：抽查发现模板内容与目录用途错配。
- 介入点：事后抽查 10% 样本。

任务 C（重写认证模块）：
- 打分：风险 5（认证是安全边界）；可验证性 4（测试可覆盖，但安全边界难穷尽）；可回滚性 2（会话态、token 兼容性使回滚成本高）。
- 计算：支持度 = min(4, 2) = 2 → 基础 1 → 风险封顶 0 → **L0/L1**（Agent 可产出方案与对照分析，设计与实现决策、逐行审查由人主导；实现阶段最多 L2 且必须逐行审）。
- 升级条件：不升级——红线任务保持人工主导；Agent 的产出始终作为"候选"经人审。
- 介入点：方案评审、逐行 diff 审查、上线决策。

共性结论：风险 5 的任务永远封顶在 L0-L1；升级永远由"可验证性与可回滚性的改善"驱动，而不是由"对 Agent 的好感"驱动。`,
        rubric: [
          { point: '三个任务都给出三维打分且理由与任务性质对应（资金/机械重复/安全边界）', score: 3 },
          { point: '按矩阵正确算出级别（A 与 C 被风险封顶、B 达 L4）', score: 3 },
          { point: '每个任务有升级与降级触发条件，且条件可观察、可执行', score: 2 },
          { point: '人类介入点与级别匹配（L0 介入在过程、L4 介入在抽查）', score: 2 },
        ],
        keywords: ['风险', '可验证性', '可回滚性', '封顶', '支持度'],
        explanation: '本题的判分核心在"理由链"：级别本身对错只占一部分，打分理由与任务性质的对应、触发条件的可观察性才是 Manager 能力的体现。',
      },

      /* ───────── l2 习题（8 题）───────── */
      {
        id: 'cs146s-w4-l2-e1', type: 'fill', difficulty: 1, relatedLessonId: 'cs146s-w4-l2', tags: ['K', 'collab'],
        question: '任务卡四件套：______（一句话 + 成功指标）、______（文件路径 / PR / 文档，给指针不给正文）、______（机器可判的 GWT 清单）、______（功能/输入/改动三类反例）。',
        blanks: [['目标', '目标一句话', 'goal'], ['上下文指针', '指针', 'context'], ['验收标准', '验收', 'acceptance'], ['禁区', '反例清单', 'forbidden']],
        explanation: '四件套是 w3-l2 Tasks 层的执行形态：目标回答为什么，指针供给上下文，验收标准定对错，禁区做围栏。',
      },
      {
        id: 'cs146s-w4-l2-e2', type: 'single', difficulty: 2, relatedLessonId: 'cs146s-w4-l2', tags: ['U', 'collab'],
        question: '上下文指针原则的正确做法是？',
        options: [
          { value: 'a', text: '把整个目录打包贴进会话，让 Agent 一次看全' },
          { value: 'b', text: '给文件路径与相关 PR 链接，各配一行"为什么相关"，让 Agent 自己去读' },
          { value: 'c', text: '只给口述摘要，不给任何路径，节省 token' },
          { value: 'd', text: '什么都不给，让 Agent 全仓库搜索最锻炼能力' },
        ],
        answer: 'b',
        explanation: '指针原则：给路径不给全文（Agent 有工具会自己读），但必须配"为什么相关"的注意力导航——没这行，它可能读了文件却不知道该看什么。a 是上下文倾倒反模式，c/d 都丢掉了关键供给。',
      },
      {
        id: 'cs146s-w4-l2-e3', type: 'judge', difficulty: 2, relatedLessonId: 'cs146s-w4-l2', tags: ['U', 'collab'],
        question: 'Agent 汇报"已完成，测试全部通过"就等于验收通过，可以合并。',
        answer: false,
        explanation: '汇报是 Agent 的自我陈述，验收要的是证据：跑验收断言、核对禁区、检查改动文件清单。听汇报放行就是验收放水——Manager 的典型失败形态。',
      },
      {
        id: 'cs146s-w4-l2-e4', type: 'multiple', difficulty: 3, relatedLessonId: 'cs146s-w4-l2', tags: ['U', 'collab'],
        question: '关于里程碑验收与逐行审查，下列说法正确的有？',
        options: [
          { value: 'a', text: '验收三问：验收标准过了吗、diff 有没有多余改动、能否向同事解释清楚' },
          { value: 'b', text: '支付、权限等安全敏感代码属于必须逐行审查的场景' },
          { value: 'c', text: '逐行审查一切才负责任，里程碑验收是偷懒' },
          { value: 'd', text: '审查带宽是并行任务数的硬上限' },
        ],
        answer: ['a', 'b', 'd'],
        explanation: 'c 是过度怀疑反模式（l5）：效率退回 L0 还搭上双份时间，且审查质量随疲劳下降。a 是验收三问；b 是逐行审查的三个合法场景之一；d 解释了为什么并行数通常限制在 2-3。',
      },
      {
        id: 'cs146s-w4-l2-e5', type: 'code', difficulty: 3, relatedLessonId: 'cs146s-w4-l2', tags: ['D', 'collab'],
        question: '实现任务卡完整性检查器 `check_task_card(card)`，card 为字典。规则（问题按此顺序聚合）：①四个必需字段 goal/context/acceptance/forbidden 缺失时报"缺少 X"（按 goal、context、acceptance、forbidden 顺序）；②goal 与 context 存在但不是非空字符串时报"goal 不能为空"/"context 不能为空"；③acceptance 必须是非空列表，否则报"acceptance 至少需要一条验收标准"，其元素必须为非空字符串，否则报"acceptance 第 i 条必须为非空字符串"（i 从 1 起）；④forbidden 存在但不是列表时报"forbidden 必须是列表"（可为空列表）。返回问题列表，空列表表示可委派。',
        lang: 'python',
        starterCode: `def check_task_card(card):
    # 检查顺序: 缺字段 -> goal/context 为空 -> acceptance -> forbidden
    pass

good = {"goal": "给购物车加优惠码", "context": "src/cart/total.py 与相关 PR #42",
        "acceptance": ["AC1 应收 90 元", "AC3 无效码报错且金额不变"],
        "forbidden": ["不动 payments/", "不改既有测试断言"]}
print(check_task_card(good))

bad = {"goal": "", "context": "src/cart/total.py", "acceptance": [], "forbidden": "无"}
print(check_task_card(bad))`,
        expectedOutput: `[]
['goal 不能为空', 'acceptance 至少需要一条验收标准', 'forbidden 必须是列表']`,
        tests: `full = {"goal": "g", "context": "c", "acceptance": ["a1"], "forbidden": []}
assert check_task_card(full) == [], "完整任务卡"
assert check_task_card({"goal": "g"}) == ["缺少 context", "缺少 acceptance", "缺少 forbidden"]
assert check_task_card({"goal": "", "context": "c", "acceptance": ["a"], "forbidden": []}) == ["goal 不能为空"]
assert check_task_card({"goal": "g", "context": "", "acceptance": ["a"], "forbidden": []}) == ["context 不能为空"]
assert check_task_card({"goal": "g", "context": "c", "acceptance": [], "forbidden": []}) == ["acceptance 至少需要一条验收标准"]
assert check_task_card({"goal": "g", "context": "c", "acceptance": ["ok", ""], "forbidden": []}) == ["acceptance 第 2 条必须为非空字符串"]
assert check_task_card({"goal": "g", "context": "c", "acceptance": ["a"], "forbidden": "无"}) == ["forbidden 必须是列表"]`,
        allowedModules: [],
        explanation: '检查器把"可委派"从感觉变成字段级判定——它就是你建卡流程的最后一道闸。注意 forbidden 允许空列表（没有禁区本身就是危险信号，但那是人的问题，不是格式问题）。',
        answer: `def check_task_card(card):
    problems = []
    for key in ("goal", "context", "acceptance", "forbidden"):
        if key not in card:
            problems.append("缺少 " + key)
    if "goal" in card and (not isinstance(card["goal"], str) or not card["goal"]):
        problems.append("goal 不能为空")
    if "context" in card and (not isinstance(card["context"], str) or not card["context"]):
        problems.append("context 不能为空")
    if "acceptance" in card:
        acc = card["acceptance"]
        if not isinstance(acc, list) or len(acc) == 0:
            problems.append("acceptance 至少需要一条验收标准")
        else:
            for i, item in enumerate(acc, 1):
                if not isinstance(item, str) or not item:
                    problems.append(f"acceptance 第 {i} 条必须为非空字符串")
    if "forbidden" in card and not isinstance(card["forbidden"], list):
        problems.append("forbidden 必须是列表")
    return problems

good = {"goal": "给购物车加优惠码", "context": "src/cart/total.py 与相关 PR #42",
        "acceptance": ["AC1 应收 90 元", "AC3 无效码报错且金额不变"],
        "forbidden": ["不动 payments/", "不改既有测试断言"]}
print(check_task_card(good))

bad = {"goal": "", "context": "src/cart/total.py", "acceptance": [], "forbidden": "无"}
print(check_task_card(bad))`,
      },
      {
        id: 'cs146s-w4-l2-e6', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-w4-l2', tags: ['K', 'collab'],
        question: '并行管理三配套：任务______（Todo/Doing/Blocked/Review 四列的驾驶舱）、每任务一个独立______（防上下文互染）、git ______（同一仓库多份工作目录，给每个 Agent 独立工位）。',
        blanks: [['看板', '任务看板', 'board'], ['会话', 'session', '独立会话'], ['worktree', 'work tree', '工作树']],
        explanation: '三配套分别解决"进度可见、上下文隔离、文件不互踩"。worktree 官方定义：同一个仓库可以维护多个工作树，各自检出不同分支。',
      },
      {
        id: 'cs146s-w4-l2-e7', type: 'open', difficulty: 4, relatedLessonId: 'cs146s-w4-l2', tags: ['D', 'collab'],
        question: '为"重构用户认证模块：把 session 认证改为 JWT，保持既有接口不变"写一张完整任务卡（四件套齐全，验收标准用 GWT 且 ≥3 条），然后设计你在验收环节要问 Agent 的 3 个验收提问（说明每个提问想逼出什么信息）。',
        referenceAnswer: `任务卡参考：

【目标】把用户认证从服务端 session 切换为 JWT，对外 API 契约不变（路由、参数、响应结构都不变），迁移期间旧 token 平滑失效（24 小时宽限期），成功指标：切换后一周内认证相关工单零新增。

【上下文指针】认证中间件在 src/auth/middleware.py（为什么：所有鉴权入口）；session 存取在 src/auth/session.py（为什么：要替换的实现）；既有认证测试 tests/auth/ 共 18 条（为什么：回归基线）；登录页前端调用 src/web/login.ts（为什么：确认接口契约未被破坏）。

【验收标准】
AC1 Given 已登录用户持有有效 JWT，When 访问受保护接口，Then 返回 200 且响应结构与改造前一致
AC2 Given 过期 JWT（签发超过 24h），When 访问受保护接口，Then 返回 401 且响应体含 token_expired
AC3 Given 被篡改的 JWT（签名错误），When 访问受保护接口，Then 返回 401 且服务端日志记录告警
AC4 Given 改造前签发的旧 session cookie，When 宽限期内访问，Then 正常放行；宽限期外返回 401
AC5 When 全量测试套件运行，Then 18 条既有测试全部通过且无断言修改

【禁区】不修改 src/web/ 前端代码；不更换 JWT 库的版本；不改动用户表结构；不做对外发布公告（红线，l5）。

验收提问设计（每问逼出一类信息）：
1. "旧 session 的宽限期清理任务在哪触发，失败了会怎样？"——逼出 Agent 对迁移边界的处理：这是任务卡只写了 happy path 的地方（清理失败是否会阻塞登录？）。
2. "JWT 的签名密钥你放在哪、怎么读的？"——逼出凭据处理方式：答案必须是环境变量/密钥管理服务，若出现"写死在配置里"立即打回（安全敏感）。
3. "AC2/AC3 的测试断言分别断言了什么字段？"——逼出证据而非汇报：401 的同时是否有日志断言、响应体字段断言，防止"看起来对"的测试。

评分关键：任务卡的 AC 覆盖正常路径 + 迁移边界（宽限期）+ 攻击路径（篡改）；提问针对任务卡的空白而不是重复任务卡内容。`,
        rubric: [
          { point: '四件套齐全：目标含成功指标、指针带"为什么相关"、AC 为 GWT、禁区含三类反例', score: 3 },
          { point: 'AC ≥3 条且覆盖正常路径之外至少一类边界（迁移/攻击路径）', score: 3 },
          { point: '3 个验收提问各自说明"逼出什么信息"，且针对任务卡空白', score: 3 },
          { point: '任务卡体现安全意识（凭据不进卡、对外发布列为红线）', score: 1 },
        ],
        keywords: ['目标', '上下文指针', '验收标准', '禁区', '宽限期'],
        explanation: '判卷要点看"空白挖掘"：好的验收提问问的是任务卡没定义的地方（迁移边界、密钥管理、断言证据），复述任务卡的提问是零分动作。',
      },
      {
        id: 'cs146s-w4-l2-e8', type: 'single', difficulty: 3, relatedLessonId: 'cs146s-w4-l2', tags: ['U', 'collab'],
        question: '下列哪一项【不是】你应该亲自下场（降级）的信号？',
        options: [
          { value: 'a', text: '任务卡写不出机器可判的验收标准' },
          { value: 'b', text: 'Agent 连续两轮没有实质进展' },
          { value: 'c', text: 'Agent 第一次尝试就通过了全部验收标准' },
          { value: 'd', text: '任务涉及生产数据库的写操作' },
        ],
        answer: 'c',
        explanation: 'c 是好信号——按流程验收（三问 + 禁区核对）后正常合并即可，甚至可以考虑为该类任务升级。a/b/d 分别对应需求回炉、换路、红线三个下场场景。',
      },

      /* ───────── l3 习题（8 题）───────── */
      {
        id: 'cs146s-w4-l3-e1', type: 'fill', difficulty: 1, relatedLessonId: 'cs146s-w4-l3', tags: ['K', 'workflow'],
        question: 'Anthropic 四阶段工作流：______（读现状、出影响面）→ ______（出计划、人批准）→ 编码（实现到测试全绿）→ ______（跑验证、留记录）。',
        blanks: [['探索', 'explore'], ['计划', 'plan'], ['提交', 'commit']],
        explanation: '四阶段把"想"和"做"分开：最便宜的阶段（读和计划）消化方向性风险。每一阶段都有人的介入点：确认影响面、批准计划、最终 review。',
      },
      {
        id: 'cs146s-w4-l3-e2', type: 'judge', difficulty: 2, relatedLessonId: 'cs146s-w4-l3', tags: ['U', 'workflow'],
        question: '计划模式得不偿失：先出计划再编码的总耗时一定比直接让 Agent 编码更长。',
        answer: false,
        explanation: '计划阶段打回的成本几乎为零（改几百字），编码后打回的成本是整个 diff 重来。方向正确的收益通常超过计划的时间开销——"打回的位置决定返工的价格"。',
      },
      {
        id: 'cs146s-w4-l3-e3', type: 'single', difficulty: 2, relatedLessonId: 'cs146s-w4-l3', tags: ['U', 'workflow'],
        question: 'TDD 与 Agent 结合时，"先写测试"的最大价值是？',
        options: [
          { value: 'a', text: '测试是机器可判的验收标准，同时"绿了就停"给了 Agent 明确的停止信号' },
          { value: 'b', text: '测试能让程序运行得更快' },
          { value: 'c', text: '为了凑齐覆盖率指标好向上汇报' },
          { value: 'd', text: '有了测试 Agent 就不需要写实现了' },
        ],
        answer: 'a',
        explanation: '三个机制：测试 = GWT 的断言化（w3-l3）、绿了就停 = 防过度发挥的停止信号、失败输出 = 最高保真的错误反馈。b/c/d 都不是机制层面的价值。',
      },
      {
        id: 'cs146s-w4-l3-e4', type: 'multiple', difficulty: 3, relatedLessonId: 'cs146s-w4-l3', tags: ['U', 'context'],
        question: '关于子代理 / 上下文隔离的使用时机，下列判断正确的有？',
        options: [
          { value: 'a', text: '大范围探索（读几十个文件找模式）值得开子代理，只把结论带回主会话' },
          { value: 'b', text: '互不依赖的独立并行任务适合各开一个代理' },
          { value: 'c', text: '评审类子代理应该只看产出物，不看生成者的推理过程' },
          { value: 'd', text: '两行的小改动也应该开子代理，显得流程专业' },
        ],
        answer: ['a', 'b', 'c'],
        explanation: 'd 错在小任务的调度开销大于收益。a/b/c 分别对应三种值得的场景：避免污染主上下文、真并行、避免评审被锚定——l4 会把第三点展开成 generator-critic 拓扑。',
      },
      {
        id: 'cs146s-w4-l3-e5', type: 'code', difficulty: 3, relatedLessonId: 'cs146s-w4-l3', tags: ['D', 'workflow'],
        question: '实现四阶段工作流校验器 `check_workflow(steps)`：steps 为按时间排序的步骤列表，每步为 dict，含 "phase"（explore/plan/code/commit 之一）与 "approved"（布尔，仅 plan 步有意义）。规则：①步数不是 4 → 返回 (False, "步骤数应为 4")；②第 i 步（i 从 1 起）的 phase 不等于期望值（explore/plan/code/commit 顺序）→ 返回 (False, "第 i 步应为 X")；③到达 code 步时，plan 步的 approved 不为 True → 返回 (False, "plan 未批准, 不得进入 code")；④全部通过 → (True, "")。',
        lang: 'python',
        starterCode: `def check_workflow(steps):
    # expected = ["explore", "plan", "code", "commit"]
    pass

good = [
    {"phase": "explore", "approved": False},
    {"phase": "plan", "approved": True},
    {"phase": "code", "approved": False},
    {"phase": "commit", "approved": False},
]
print(check_workflow(good))

bad = [
    {"phase": "explore", "approved": False},
    {"phase": "plan", "approved": False},
    {"phase": "code", "approved": False},
    {"phase": "commit", "approved": False},
]
print(check_workflow(bad))`,
        expectedOutput: `(True, '')
(False, 'plan 未批准, 不得进入 code')`,
        tests: `g = [{"phase": "explore", "approved": False}, {"phase": "plan", "approved": True},
     {"phase": "code", "approved": False}, {"phase": "commit", "approved": False}]
assert check_workflow(g) == (True, "")
b1 = [dict(g[0]), dict(g[1], approved=False), dict(g[2]), dict(g[3])]
assert check_workflow(b1) == (False, "plan 未批准, 不得进入 code")
b2 = [{"phase": "code", "approved": False}, {"phase": "plan", "approved": True},
      {"phase": "explore", "approved": False}, {"phase": "commit", "approved": False}]
assert check_workflow(b2) == (False, "第 1 步应为 explore")
assert check_workflow(g[:3]) == (False, "步骤数应为 4")`,
        allowedModules: [],
        explanation: '这个校验器把"批准即合同"写成了代码：计划未批准，编码阶段根本不允许开始。它是计划模式的机器化形态，也是 l6 项目 A 里"计划模式"拓展的雏形。',
        answer: `def check_workflow(steps):
    expected = ["explore", "plan", "code", "commit"]
    if len(steps) != 4:
        return (False, "步骤数应为 4")
    for i, phase_name in enumerate(expected):
        if steps[i].get("phase") != phase_name:
            return (False, f"第 {i + 1} 步应为 {phase_name}")
        if phase_name == "code" and not steps[1].get("approved"):
            return (False, "plan 未批准, 不得进入 code")
    return (True, "")

good = [
    {"phase": "explore", "approved": False},
    {"phase": "plan", "approved": True},
    {"phase": "code", "approved": False},
    {"phase": "commit", "approved": False},
]
print(check_workflow(good))

bad = [
    {"phase": "explore", "approved": False},
    {"phase": "plan", "approved": False},
    {"phase": "code", "approved": False},
    {"phase": "commit", "approved": False},
]
print(check_workflow(bad))`,
      },
      {
        id: 'cs146s-w4-l3-e6', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-w4-l3', tags: ['K', 'context'],
        question: '《Good Context Good Code》2.5x 案例的三个来源，对应四阶段的产物资产化：任务______化（探索阶段预制）、按角色维护上下文______（计划阶段的输入资产）、验证结果______（提交阶段的产出变成下一次的检索注入）。',
        blanks: [['模板', '模板化'], ['包', '上下文包'], ['回流', '回流成资产']],
        explanation: '2.5x 的归因不是"模型更强"，而是四阶段的中间产物被当成资产复用——一次性投入、多次复用（w3-l1 的"上下文是资产"论点）。',
      },
      {
        id: 'cs146s-w4-l3-e7', type: 'open', difficulty: 4, relatedLessonId: 'cs146s-w4-l3', tags: ['D', 'workflow'],
        question: '为"给团队 wiki 加全文搜索功能（后端 Python）"设计四阶段执行单：① 探索阶段要确认的三件事与产出物；② 计划阶段计划文件的结构（含至少 1 个开放问题）与你的批准检查点；③ 编码阶段的 TDD 落点（先写哪 3 条测试，为什么是这 3 条）；④ 提交阶段的验证清单。并指出哪个阶段最适合介入一次"打回"。',
        referenceAnswer: `① 探索（确认三件事）：
- wiki 数据存储在哪、什么引擎（SQLite/PG/ES）——决定搜索实现路径；
- 现有读接口的调用方与响应结构——决定加搜索是扩展还是新端点；
- 既有测试怎么跑、有没有基线数据——决定回归手段。
产出物：三行"影响面说明"（改哪些文件、谁受影响）。人工介入：确认它找对了地方——找错地方是方向性跑偏的起点。

② 计划（plan.md 结构）：
背景与影响面（引用探索产物）→ 步骤 1 建索引层（倒排或 LIKE，视数据量）→ 步骤 2 搜索 API（分页、空结果语义）→ 步骤 3 前端入口接入 → 每步的 AC。开放问题："中文分词要不要引入分词库？"——标注：先 LIKE 实现，数据量超过阈值再升级（本期不做分词库）。
批准检查点：每条 AC 是否机器可判；索引方案的复杂度是否与"团队 wiki"规模匹配（防止过度设计）。

③ 编码（TDD 三条先行测试）：
- T1：Given wiki 有 3 篇文章含"部署"，When 搜索"部署"，Then 返回恰 3 条且按相关度或时间排序——主路径；
- T2：Given 搜索词无匹配，When 搜索，Then 返回空列表与 200（不是 500）——空结果语义，最常见的线上小事故；
- T3：Given 含 HTML 标签的文章正文，When 搜索结果带摘要，Then 摘要不含未转义标签——安全边界（XSS 入口）。
选这三条的理由：主路径 + 最易错的边界语义 + 安全面，正好覆盖"正确性、健壮性、安全性"三层，且每条都能落成自动断言。

④ 提交（验证清单）：全量测试通过；AC 逐条跑断言留输出；diff 核对禁区（不改既有文章渲染逻辑）；提交说明链接 plan.md 与三条 AC。

最适合打回的阶段：计划阶段——本例的"开放问题"（分词方案）如果留到编码后被发现，索引层可能要推倒重来；在计划阶段裁决只改一行字。`,
        rubric: [
          { point: '探索三件事与数据/接口/测试相关且产出物是"影响面说明"', score: 3 },
          { point: '计划含开放问题且问题被显式处置（本期不做/给决定）', score: 2 },
          { point: '三条测试覆盖主路径 + 边界语义 + 安全面，且各自说明理由', score: 3 },
          { point: '打回阶段的选择有返工成本对比的论证', score: 2 },
        ],
        keywords: ['探索', '计划', 'TDD', '开放问题', '影响面'],
        explanation: '判卷看两点：中间产物是否"落成文字"（探索影响面、plan.md、AC）——口头阶段等于没阶段；测试选择是否体现"机器可判 + 覆盖三层"。',
      },
      {
        id: 'cs146s-w4-l3-e8', type: 'single', difficulty: 3, relatedLessonId: 'cs146s-w4-l3', tags: ['U', 'workflow'],
        question: '编码阶段中，Agent 发现计划的方案 B 比已批准的方案 A 更优雅，向你提出。正确的处理是？',
        options: [
          { value: 'a', text: '直接允许——更优雅的方案应该被采纳' },
          { value: 'b', text: '让 Agent 说明 B 与 A 的差异和影响面，由你裁决；若采纳则更新 plan.md 与 AC 后再继续' },
          { value: 'c', text: '让 Agent 把两个方案都实现出来再比较' },
          { value: 'd', text: '拒绝并要求 Agent 不要再提任何异议' },
        ],
        answer: 'b',
        explanation: '计划批准即合同：变更要走流程（说明差异 → 人裁决 → 更新计划与 AC → 继续）。a 让合同失效（后续验收失去对照物）；c 浪费一倍执行；d 扼杀了有价值的反馈——Agent 暴露计划缺陷恰恰是四阶段健康的信号。',
      },
    ],
  },
];
