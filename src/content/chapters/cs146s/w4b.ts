import type { Chapter } from '../../../types';

/* ============================================================
 *  CS146S Fall 2026 · Week 4（续）：多 Agent 协作、信任校准与项目 A
 *
 *  来源：官方大纲 Week 4（Coding Agent Patterns）
 *  + Anthropic《Building effective agents》（多 Agent 拓扑）
 *  + Anthropic《Claude Code: Best practices for agentic coding》
 *  + 《Good Context Good Code》+ git worktree 官方文档
 *  + 官方作业 week4（Agent Manager 主题锚点；项目 A 为自主设计）
 *  原创：拓扑对照、失败模式防线、校准协议、项目 A 全规格、全部习题
 * ============================================================ */

export const cs146sW4ExtraChapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'cs146s-w4b',
    title: 'Week 4（续）· 多 Agent 协作、信任校准与项目 A',
    goal: '掌握多 Agent 协作的三种拓扑与上下文隔离原则，用人机协作反模式清单与信任校准协议治好"两个极端"，并在项目 A 中用纯 Python 实现一个带工具沙箱、预算控制与 trace 日志的简化版 Coding Agent。',
    lessons: [
      /* ─────────────────────────── l4 ─────────────────────────── */
      {
        id: 'cs146s-w4-l4',
        title: '多 Agent 协作与上下文隔离',
        difficulty: 4,
        content: `
### 学习目标

学完本节，你应该能够：
1. 解释单 Agent 上下文瓶颈的三个来源（窗口上限、注意力稀释、任务互染），并判断一个任务是否已经到了需要多 Agent 的临界点；
2. 对比主从式（orchestrator-worker）、流水线式、评审式（generator-critic）三种拓扑的结构、适用场景与代价，并为一个具体任务选型；
3. 识别接力失真、重复劳动、责任真空三大失败模式，并为每种设计至少一条防线；区分共享黑板与消息传递，说出工程默认选择及其理由。

### 前置知识

- l3 的子代理使用时机——本节把它展开成完整的机制与拓扑；
- w1-l4 的失效模式（干扰 / 冲突）——多 Agent 会放大它们，也提供了解法；
- w3-l2 的 Plan 依赖图——worker 能不能并行，由它说了算。

### 问题背景

单 Agent 的天花板由上下文窗口决定，但真正先撞上的往往不是窗口上限，而是两堵更早到来的墙：**注意力稀释**（w1-l4：内容越多，中间位置的信息越容易被忽略）与**任务互染**（一个会话里混多件事，A 任务的报错历史干扰 B 任务的判断）。当任务规模增长——给 50 个模块补 docstring、三个功能并行开发——单会话方案必然先在质量上崩掉，而不是先在长度上崩掉。

业界的答案是多 Agent：多个各有独立上下文的 Agent 通过显式协作完成大任务。但 Anthropic 在《Building effective agents》里有一条反直觉的提醒：**能单 Agent 就不要多 Agent**——多 Agent 不是免费午餐，它引入了新的失败模式（接力失真、重复劳动、责任真空）。本节讲清什么时候值得、怎么设计、防什么。

### 直觉理解

主编与记者团。单 Agent = 主编亲自写所有稿子：写到第 20 篇，第 3 篇的采访笔记已经记不清（注意力稀释），体育版和财经版的素材混在一个抽屉里（任务互染）。三种组织方式：

- **主从式**：主编派 N 个记者各写一篇，每人只拿到自己的采访任务卡，交稿后主编汇总统稿；
- **流水线式**：采访 → 写作 → 编辑 → 排版四道工序依次传递，每站一个 Agent；
- **评审式**：记者写，编辑审，不合格退回重写，直到达标。

关键洞察：**记者之间不需要看到彼此的草稿**。主编给每个人只发自己的任务卡——上下文隔离不是协作的副作用，而是设计目标：每个 Agent 只看到完成自己任务所需的最小上下文。

### 核心概念与原理详解

## 三种拓扑

<Diagram type="multiagent" />

| 拓扑 | 结构 | 适用 | 主要代价 |
| --- | --- | --- | --- |
| 主从式（orchestrator-worker） | 主 Agent 拆解、分派、汇总；worker 互不知晓 | 子任务同构、可并行、接口清晰（批量补测试 / 文档） | 主 Agent 是瓶颈与单点；拆解质量决定全局 |
| 流水线式 | 阶段接力，每站一个 Agent，产物传给下一站 | 流程固定、阶段转换清晰（抽取 → 校验 → 格式化 → 发布） | 上游错误沿链传播；吞吐受最慢一站限制 |
| 评审式（generator-critic） | 生成者与批评者循环，直到达标 | 质量要求高、存在机器可判标准（代码+测试、文案+清单） | 轮次增加成本；标准不可判则无限空转 |

（交互图里还有第四种"对话式"：多个 Agent 自由协商——轮次与成本不可控，工程上一般不作默认选择，留作了解。）

## 共享黑板 vs 消息传递

| 维度 | 共享黑板（blackboard） | 消息传递（message passing） |
| --- | --- | --- |
| 通信方式 | 所有 Agent 读写同一份工作区 / 文档 | Agent 间只通过显式消息 / 任务卡交换信息 |
| 优点 | 协作自然、信息全局可见 | 上下文隔离好、责任边界清晰 |
| 风险 | 一个 Agent 写坏共享物全队遭殃；共享区是注入面 | 协议要设计；信息可能滞后 |
| 工程默认 | 只放"公共事实"：接口定义、验收清单 | **默认选择**：任务与产物都走显式通道 |

默认消息传递的理由不是"黑板不好"，而是故障隔离：显式通道让每个失败可归因（哪条消息、哪个任务），黑板则把故障搅成一团。

## 上下文隔离三原则

1. **最小上下文**：每个 worker 只收自己的任务卡 + 完成所需的文件，不收全仓库、不收兄弟任务的输出；
2. **显式接口**：任务之间只通过"产物 + 验收标准"耦合，不通过"我记得他好像说过"耦合——产物是唯一事实源；
3. **汇总归一**：合并、冲突裁决、最终验收全部归 orchestrator；worker 之间不私下协调。

## 失败模式与防线

| 失败模式 | 表现 | 根因 | 防线 |
| --- | --- | --- | --- |
| 接力失真 | worker 理解的任务与任务卡不符，产出偏航 | 要求经多层传递变形 | 任务卡逐条编号 + 汇报逐条对账（见下方 demo） |
| 重复劳动 | 两个 worker 做了同一件事 | 分派边界模糊 | 任务卡写明"你的范围"与"他人范围"（负空间） |
| 责任真空 | 出问题没人认领——"都以为对方做了" | 验收标准没有唯一 owner | 每条 AC 编号并指定唯一 worker，orchestrator 逐条核销 |

### 完整案例

任务："给 50 个模块补 docstring"。

**单 Agent 方案**：一个会话顺序处理。到第 37 个模块时，上下文里已塞满 40 多个文件的读取历史与工具输出——它开始混淆模块之间的函数名，把 cache.py 的 docstring 写到了 auth.py 头上。人工核对发现 6 处错位，返工 2 小时。

**主从式方案**：orchestrator 拆出 10 个批次（每批 5 个模块），每张任务卡包含：本批模块清单、docstring 模板（Args/Returns 两节、不超过 3 行）、验收标准（解析 AST 确认每个公开函数都有 docstring）、禁区（不改函数体）。10 个 worker 并行（各自独立会话 + 独立目录），orchestrator 汇总时逐条对账（demo 的检查逻辑）：发现 1 个 worker 漏做一条要求、1 个 worker"顺手"重构了异常处理——补派 + 打回。总耗时 25 分钟。

**自解释提示**：为什么每张 worker 任务卡都要写"不改函数体"？——多 Agent 把每个 worker 的自由发挥面乘了 10；负空间（禁区）必须随卡下放，否则 10 个 worker 就是 10 个"顺手优化"源。对照单 Agent 方案的失败点：**它败在上下文污染，而不是模型能力**——同样的模型，隔离之后就能批量做对。

### 代码实践

下面的 demo 用规则模拟 orchestrator-worker：主 Agent 把"给 3 个模块写 docstring"拆成 3 张任务卡，3 个 worker（注入"越权型"与"漏做型"两种失真行为）返回汇报，orchestrator 逐条对账检测接力失真。这就是防线表第一列的可执行形态。

### 常见误区与安全风险

- **误区一：多 Agent = 更聪明。** 拓扑不增加智能，只改变误差结构——三个弱 Agent 不会涌现出强能力，只会多出三类新的失败模式。单 Agent 能解决的别上多 Agent。
- **误区二：worker 共享全部上下文协作更顺。** 共享全部 = 互相污染 + 注入面扩大 + 注意力稀释；隔离是设计目标，不是负担。
- **误区三：critic 和 generator 用同一个会话。** critic 看过 generator 的推理过程会被锚定（顺着对方思路走），评审价值大打折扣——干净视角要求独立上下文。
- **安全提示：worker 权限最小化。** 每个 worker 只授权自己任务涉及的目录与工具；orchestrator 对每个产物独立验收后才允许进主仓库——被投毒的 worker（Week 6 的提示词注入）不能直接污染主干；共享黑板上的"公共事实"必须经人评审后才可写入。

### 知识关联：承上启下

- 承上：l1 的 L3 多任务 = 主从式的人机协作版本；l3 的子代理时机 = 本节拓扑的单点应用；w3-l2 的 Plan 依赖图 = 并行分派的合法性来源（无依赖才可并行，见 e9 题）；
- 启下：l5 的幽灵并行反模式是多 Agent 管理失败的组织学版本；l6 项目 A 的拓展任务把本节主从式实装成多 mini-agent 协作；Week 6 的供应链安全视角会回到"被投毒的 worker"。

### 动手实验

1. 运行下方 demo，然后修改 worker 的行为注入（把"漏做型"改成漏两条要求），观察 orchestrator 对账输出的变化；
2. 打开上方 multiagent 交互图，为三个拓扑各找一个你工作中的真实例子，说明为什么适合；
3. 用"波次"思路（见 e9 题）画出你手头一个多任务需求的依赖图，标出第一波可并行集。

### 本节总结

1. 单 Agent 先撞的墙是注意力稀释与任务互染，不是窗口上限；
2. 三拓扑：主从式（并行同构）、流水线式（固定流程）、评审式（质量关卡）；能单 Agent 就别多 Agent；
3. 通信默认消息传递：任务与产物走显式通道；共享黑板只放经评审的公共事实；
4. 隔离三原则：最小上下文、显式接口（产物+验收）、汇总归一；
5. 三大失败模式各有防线：逐条对账（失真）、负空间（重复）、AC 唯一 owner（真空）。

### 参考资料与延伸阅读

- Anthropic《Building effective agents》——"能单则单"与多 Agent 模式的官方建议：对应"问题背景"与"三种拓扑"模块；
- Anthropic《Claude Code: Best practices for agentic coding》——subagent 保持主上下文干净的实践：对应"上下文隔离三原则"；
- [官方作业仓库 week4](https://github.com/mihail911/modern-software-dev-assignments)——Agent Manager 并行管理主题锚点：对应"完整案例"；
- 本节拓扑对照表、失败模式防线表、orchestrator 对账 demo 均为自主设计的原创教学内容。

### 本节习题导引

fill/single 题校准拓扑与失败模式；code 题实现失真审计器与并行波次调度；open 题要求为真实任务设计完整的多 Agent 方案。
`,
        tips: [
          { kind: 'pitfall', text: 'worker 任务卡必须带"他人范围"一句（"cache.py 由你负责，auth.py 由另一任务负责"）——分派边界模糊是重复劳动的唯一根因。' },
          { kind: 'performance', text: 'orchestrator 的拆解粒度以"单 worker 上下文不超窗口 30%"为参考：粒度太粗隔离失效，太细则汇总开销吞掉并行收益。' },
          { kind: 'interview', text: '"多 Agent 一定比单 Agent 强吗？"——答拓扑只改变误差结构不增加智能 + 三大新失败模式 + 能单则单，三段式是体系化答案。' },
          { kind: 'note', text: '给每个 worker 的产物建独立分支目录（worktree），orchestrator 合并前跑统一验收——"产物未过验收不得进主干"要成为铁律。' },
        ],
        demos: [
          {
            title: 'orchestrator-worker 模拟：任务卡分派与接力失真检测',
            lang: 'python',
            code: `# orchestrator-worker 模拟: 主 Agent 把"给 3 个模块写 docstring"拆给 3 个 worker
MODULES = ["cache.py", "auth.py", "logx.py"]
COMMON_REQS = ["docstring 含 Args/Returns 两节", "不超过 3 行"]

def build_cards():
    cards = {}
    for m in MODULES:
        cards[m] = [f"为 {m} 的所有公开函数补 docstring"] + COMMON_REQS
    return cards

WORKER_BEHAVIOR = {"cache.py": "守规矩", "auth.py": "越权型", "logx.py": "漏做型"}

def worker(path, card, behavior):
    # 规则模拟: 逐条要求生成一行汇报; 两类典型失真由 behavior 注入
    lines = ["已完成: " + r for r in card]
    if behavior == "越权型":
        lines.append("顺便重构了模块的异常处理")   # 失真一: 任务卡之外的自作主张
    if behavior == "漏做型":
        lines = lines[:-1]                        # 失真二: 漏掉最后一条要求
    return lines

def audit(cards, reports):
    print("== orchestrator 汇总与接力失真检测 ==")
    problems = 0
    for path, reqs in cards.items():
        lines = reports.get(path, [])
        missing = [r for r in reqs if not any(r in ln for ln in lines)]
        extra = [ln for ln in lines if not any(r in ln for r in reqs)]
        if missing or extra:
            problems += len(missing) + len(extra)
            print(f"[{path}] 失真 {len(missing) + len(extra)} 处: 漏做{missing} 多做{extra}")
        else:
            print(f"[{path}] 通过")
    print(f"共 {problems} 处失真 -> orchestrator 决定: 漏做补派, 越权打回")

cards = build_cards()
reports = {p: worker(p, cards[p], WORKER_BEHAVIOR[p]) for p in MODULES}
audit(cards, reports)

# 观察点: 任务卡逐条编号 + 汇报逐条对账, 让"漏做"与"越权"从
# 事后扯皮变成机器可查 —— 这就是接力失真的防线`,
          },
        ],
      },

      /* ─────────────────────────── l5 ─────────────────────────── */
      {
        id: 'cs146s-w4-l5',
        title: '人机协作的反模式与信任校准',
        difficulty: 3,
        content: `
### 学习目标

学完本节，你应该能够：
1. 识别四种协作反模式（橡皮图章式审批、幽灵并行、上下文倾倒、过度信任 / 过度怀疑）在真实工作中的表现，并为每种给出矫正动作；
2. 复用 w1-l5 的实验协议，按任务类型统计 Agent 的一次通过率，把自治级别的调整变成数据驱动决策；
3. 说出永不委派的三条安全红线及其共同点，并说出至少两层让红线不依赖自觉的技术配套。

### 前置知识

- l1 的升降级信号——本节为它们提供数据源；
- l2 的验收三问——反模式的矫正动作大量复用它；
- w1-l5 的提示词 A/B 实验协议（固定测试集 + 指标 + 控制变量）——本节把它原样迁移到"人机协作"层面；
- w3-l1 的历史预算上限——上下文倾倒的量化矫正依据。

### 问题背景

工具齐了、方法会了，为什么有的团队用 Agent 效果好、有的差？差异往往不在工具而在协作习惯。把多个团队的使用日志摊开看，绝大多数失败落在四个反模式上：橡皮图章（验收形同虚设）、幽灵并行（后台任务没人管）、上下文倾倒（整个目录拖进会话"你自己看着办"）、两个极端（过度信任直送生产 / 过度怀疑逐行审查）。

它们共同的对立面是一个被量化的东西：**信任**。信任既不能是感觉（过度信任），也不能是态度（过度怀疑），只能是数据——按任务类型统计一次通过率，让级别跟着数据走。这也是官方 Week 4 把 autonomy levels 与 human-agent collaboration 放在同一周的深意：**分级只有配上校准，才是完整的决策系统**。

### 直觉理解

信任校准 = 给实习生建立"能力档案"。你不会因为实习生一次搞砸就永不录用，也不会因为他上周表现出色就把法务合同交给他。你心里有一张表：写文案靠谱（90% 可用）、做报表一般（70%）、碰钱不行（0 授权）。这张表不是"感觉他行"，是观察了 20 次任务攒出来的记录。

本节把这张表从经理的直觉变成团队的公开数据：**按任务类型统计一次通过率，级别跟着数字调**。升级和降级从此都是例会上的一行表格变更，而不是一次情绪化的决定。

### 核心概念与原理详解

## 反模式清单

| 反模式 | 表现 | 危害 | 矫正动作 |
| --- | --- | --- | --- |
| 橡皮图章式审批 | diff 扫一眼就点批准（"LGTM"） | 坏代码进主干；事故后审计发现"有人批过"更难堪 | 验收三问 + 至少一条自动断言通过才许批准 |
| 幽灵并行 | 挂 5 个后台任务去开会，回来发现 3 个坏了半天 | 半成品堆积；改动互相覆盖；信任被无效任务消耗 | 并行数 ≤ 审查带宽；完成即通知；回来先清 Review 再开新单 |
| 上下文倾倒 | 整个目录 / 全部历史拖进会话 | 干扰与冲突（w1-l4）；成本爆炸 | 按任务卡给指针；历史超 35% 先压缩（w3-l1） |
| 过度信任 | 验收 = 0，Agent 输出直送生产 | 安全事故——AI 生成代码混入注入载荷导致 RCE 的 CVE 是真实案例（Week 6 详析） | 红线清单 + 自动化门禁 |
| 过度怀疑 | 逐行审查一切产出 | 效率退回 L0，还搭上双份时间；审查质量随疲劳下降 | 按通过率数据分级授权，审查带宽留给高风险任务 |

注意：过度信任与过度怀疑是同一个失败的两面——**都拒绝用数据校准**。

## 信任校准量化

协议（把 w1-l5 的实验框架原样迁移到协作层）：

1. **分类记录**：每次委托按任务类型打标——脚手架生成 / 测试补全 / bug 修复 / 重构 / 安全相关；
2. **统计指标**：每类统计一次通过率（first-pass rate：验收一次通过的比例）与平均返工轮数；
3. **阈值映射**：≥90% 可升一级；70%-90% 维持；50%-70% 降一级；<50% 回到 L1 并复查任务卡质量；
4. **定期重估**：每 10 个任务重估一次——模型在变、任务组合也在变；
5. **置信度保护**：样本 <5 不调级——3 个任务全对证明不了 90% 的通过率。

**按类型分开统计是灵魂**：混在一起的平均通过率会被"简单任务多"稀释，掩盖"安全类任务实际很低"的信号——而恰恰是低的那类决定风险。

## 安全红线（永不委派）

| 红线 | 为什么 | 违反后果 |
| --- | --- | --- |
| 凭据与密钥（.env、token、私钥） | 进入上下文 = 泄漏给第三方服务与日志 | 凭据泄露，不可撤回 |
| 生产数据与生产操作 | 真实用户数据不可逆；生产库写入不容试验 | 数据事故 + 合规后果 |
| 对外发布（官网文案、公告、客户邮件） | 错误对外可见、撤回成本极高 | 品牌 / 信任损失 |

共同点：**错误不可回滚或不可发现**——恰好是 l1 决策矩阵里可验证性与可回滚性的双零区域，所以无论级别多高，这三类永远 L0。

技术配套（红线不写在人心上，写在系统里）：权限模式与沙箱挡住敏感文件与命令（Week 6 的权限矩阵）；CI 门禁拦截触碰敏感路径的分支；对外发布走独立的人工审批流——Agent 可以起草，发布键永远在人手里。

### 完整案例

某团队月度校准会。数据（每类近 10 个任务）：

| 任务类型 | 一次通过率 | 平均返工轮 | 决定 |
| --- | --- | --- | --- |
| 脚手架生成 | 9/10 = 90% | 1.1 | 升到 L3（后台并行，事后抽查 10%） |
| 测试补全 | 8/10 = 80% | 1.4 | 维持 L2 |
| bug 修复 | 6/10 = 60% | 2.2 | 降到 L1——并复盘：3 次失败源于任务卡缺复现步骤 |
| 安全相关 | 3/10 = 30% | 3.5 | 锁定 L0/L1——此类永远单独统计、永不自动化 |

**自解释提示**：bug 修复的降级决议里藏着最有价值的发现——3 次失败不是 Agent 能力问题，是任务卡没给复现步骤（Manager 侧问题）。**校准数据的第二用途是给"人的工作"对账**：降级不一定是 Agent 要降级，可能是你的任务卡要升级。

### 代码实践

下方"信任校准计算器"实现协议的第 1、2、3、5 步：按类型聚合、算通过率、映射级别、样本不足保护。把你最近 10 次委托记录编进去，跑出你自己的第一张校准表。

### 常见误区与安全风险

- **误区一：通过率上升说明 Agent 变强了。** 也可能是任务变简单了、或你的任务卡变好了——所以必须按类型分开统计，且同步记录任务卡质量维度。
- **误区二：校准一次就完事。** 模型版本、任务组合、团队人员都在变；每 10 个任务重估，校准是例会制度，不是一次性动作。
- **误区三：高通过率 = 可以放松安全类任务的验收。** 提示注入可以让 Agent"看起来正常地"做坏事——通过率衡量的是正确性，不是安全性；安全类永远单独统计、永不自动化（Week 6 威胁模型）。
- **安全提示：反模式会互相放大。**"上下文倾倒 + 过度信任"的组合（把整个仓库倒给 Agent，然后不看 diff 直接合并）是事故的标准配方；红线的技术配套必须独立于任何反模式矫正而存在。

### 知识关联：承上启下

- 承上：l1 的升降级信号由本节的通过率数据供血；l2 的验收三问是橡皮图章的矫正器；w1-l5 的实验协议是本节方法论的母版；w3-l1 的 35% 历史上限是上下文倾倒的量化矫正；
- 启下：l6 项目 A 的复盘步骤要求你统计自己开发过程中的一次通过率（协议实战）；Week 6 的安全流水线把"自动化门禁"做成 CI 级强制；w7 的代码审查把橡皮图章问题扩展到"人审 AI 代码"的双向信任。

### 动手实验

1. 运行下方校准计算器，把你最近 10 次委托按类型编成记录跑一遍，得出第一张校准表；
2. 对照反模式清单自查：过去一周你出现过哪一种？写出矫正动作与触发条件；
3. 把三条红线写进你的任务卡模板的禁区段，并确认权限配置真能挡住第一类——试一个读取 .env 的请求，看它是否被拦。

### 本节总结

1. 四反模式（橡皮图章 / 幽灵并行 / 上下文倾倒 / 两个极端）的共同解药是数据化信任；
2. 校准协议五步：分类记录、统计通过率、阈值映射、定期重估、样本 <5 不调级；按类型分开统计是灵魂；
3. 三条永不委派红线：凭据、生产数据、对外发布——共同点是错误不可回滚或不可发现；
4. 红线靠系统不靠自觉：权限沙箱 + CI 门禁 + 独立审批流；
5. 校准数据的第二用途：给 Manager 自己的任务卡质量对账。

### 参考资料与延伸阅读

- [官方作业仓库 week4（Agent Manager）](https://github.com/mihail911/modern-software-dev-assignments)——并行与验收的实战锚点：对应"反模式清单"模块；
- Anthropic《Claude Code: Best practices for agentic coding》——保持人在环上与权限防护的建议：对应"安全红线"的技术配套；
- 《Good Context Good Code》（官方指定阅读）——按角色维护上下文包（对抗上下文倾倒的正面做法）：对应矫正动作列；
- w1-l5 的实验协议（本课程自研教学框架）——本节校准协议的直接母版：对应"信任校准量化"；
- 本节反模式清单、校准协议、计算器 demo 均为自主设计的原创教学内容。

### 本节习题导引

single/judge 题训练反模式识别；code 题实现校准计算器；open 题要求用真实数据表完成一次完整的调级论证。
`,
        tips: [
          { kind: 'pitfall', text: '批准按钮前强制自己说出"这次验收我跑了哪条断言"——说不出来就是橡皮图章。把这句话做成 PR 模板的必填项更有效。' },
          { kind: 'performance', text: '并行任务的完成通知要推到你必须看到的渠道（IM 而非邮件）：幽灵并行的本质是"完成信号没有进入你的注意力队列"。' },
          { kind: 'leak', text: '上下文倾倒不只是低效：整目录倾倒会把 .env、内网地址一并送进第三方上下文——倾倒的矫正动作首先是安全动作。' },
          { kind: 'interview', text: '"你怎么决定信任 AI 的产出？"——答按任务类型统计一次通过率 + 阈值映射级别 + 红线例外，展示的是可复现的治理框架而非个人感觉。' },
        ],
        demos: [
          {
            title: '信任校准计算器：按任务类型的一次通过率映射级别',
            lang: 'python',
            code: `# 信任校准计算器: 分类 -> 通过率 -> 建议级别(含样本不足保护)
def level_of(rate):
    if rate >= 0.9:
        return 3
    if rate >= 0.7:
        return 2
    if rate >= 0.5:
        return 1
    return 0

def calibrate(records):
    stats = {}
    for ttype, first_pass in records:
        n, ok = stats.get(ttype, (0, 0))
        stats[ttype] = (n + 1, ok + (1 if first_pass else 0))
    return stats

LOG = [
    ("脚手架生成", True), ("脚手架生成", True), ("脚手架生成", True),
    ("脚手架生成", True), ("脚手架生成", True), ("脚手架生成", True),
    ("测试补全", True), ("测试补全", True), ("测试补全", True),
    ("测试补全", False), ("测试补全", True),
    ("bug 修复", False), ("bug 修复", True), ("bug 修复", False), ("bug 修复", True),
    ("重构", False), ("重构", False), ("重构", True),
]

print("任务类型    一次通过率  建议级别")
for ttype, (n, ok) in calibrate(LOG).items():
    rate = ok / n
    note = "" if n >= 5 else "  <- 样本不足, 本期不调级"
    print(f"{ttype}  {rate:>7.0%}    L{level_of(rate)}{note}")

# 观察点: bug 修复与重构的样本都不足 5 —— 协议第 5 条拦住了
# "凭 4 个样本就大幅调级"的冲动; 等攒够数据再动`,
          },
        ],
      },

      /* ─────────────────────────── l6 ─────────────────────────── */
      {
        id: 'cs146s-w4b-l6',
        title: '项目 A：用 Python 实现简化版 Coding Agent（实践项目）',
        difficulty: 5,
        content: `
### 学习目标

学完本节并完成项目，你应该能够：
1. 独立实现一个纯标准库的 mini-agent：可插拔 LLM 接口（FakeLLM 规则应答 + 真实 API 适配层接口）、工具集（read_file / write_file / run_tests，沙箱限项目目录）、执行循环（轮数 + token 双预算）与全量 trace 日志；
2. 用 FakeLLM 任务脚本驱动 ≥10 条系统测试，覆盖正常完成、工具名幻觉、参数错误、死循环熔断、预算耗尽、文件越界拒绝、trace 完整性等路径；
3. 把本章概念（自治级别、任务卡、验收、上下文、信任校准）映射到自己代码的具体模块上，形成"造过轮子的人"的验收判断力。

### 前置知识

- 本章 l1-l5 全部内容——本项目是 Week 4 的收拢实战；
- w2：工具调用协议（工具名 + 参数 + 结果回填）——本项目就是它的最小实现；
- Python：字典、dataclass、json、pathlib/os.path、subprocess（run_tests 真实模式用）、pytest 的基本使用。

### 问题背景

官方 Week 4 的作业是"用 Claude Code 完成完整项目，人扮演 Agent Manager"（l2 已演练）。**本项目 A 为参照该主题的自主设计**（非官方作业转录）：方向相反——先让你亲手造一个玩具 Agent，再回去用你每天管理的工具。理由有三：

1. **机制祛魅**：亲手写过执行循环的人，对 L2 的 diff 验收、对 L3 的熔断会有完全不同的判断力——你知道 Agent 的"自信汇报"背后发生了什么；
2. **概念落地**：l1 的预算闸门、l3 的停止信号、l4 的工具反馈、l5 的 trace 证据，在本项目里全部变成代码；
3. **可测性**：真实 LLM 的概率性让系统测试几乎不可能；FakeLLM 用脚本应答让每条路径确定性可测——这本身就是"用可验证性换自治"的工程化演示。

一句话项目声明：**纯标准库实现一个简化版 Coding Agent，FakeLLM 可脚本化驱动，工具带沙箱，循环带预算，全程留 trace**。自主设计声明：本项目参照官方 Week 4 作业主题自主设计，规格、代码与测试均为原创教学设计，官方作业要求以官方仓库为准。

### 直觉理解

mini-agent = 一台"带方向盘的自动售货机"：

- **FakeLLM** 是预设好的货道程序（脚本决定每一步给什么）——让机器可以确定性测试；
- **工具**是售货机的机械臂：只能伸进许可的范围（沙箱），拿错东西会被卡住（错误反馈）；
- **执行循环**是投币-出货-找零的循环：每次出货都要记录小票（trace），投币总额有上限（预算），卡住超过 N 次就停机退币（熔断）。

造过这台机器，你就再也不会说"AI 自己决定要删库"这种话——**每一个动作都是循环里某一步的确定性结果**，问题是哪一步没设闸。

### 核心概念与原理详解

## 项目 A 总览与自主设计声明

- **一句话**：纯 Python 标准库实现 mini-agent，FakeLLM 脚本驱动，read_file / write_file / run_tests 三工具带路径沙箱，执行循环带轮数与 token 双预算，每轮动作与结果写入 JSONL trace。
- **交付物**：\`mini-agent/\` 目录——llm.py、agent.py、tools.py、trace.py 四模块 + tests/ 系统测试 ≥10 条 + README（含运行示例与 trace 样例）。
- **自主设计声明**：参照官方 Week 4（Agent Manager）主题自主设计；本项目刻意选择"造 Agent"而非"用 Agent"，作为 l1-l5 的代码化收口。

## 模块一 · 需求说明

| id | 需求 | 验收口径 |
| --- | --- | --- |
| FR1 | LLM 接口可插拔：统一协议，FakeLLM（规则/脚本应答）为默认，真实 API 适配层为可选实现 | 同一套测试在两种实现上语义一致 |
| FR2 | 工具集 read_file / write_file / run_tests | 三工具均可独立调用与测试 |
| FR3 | 沙箱：所有路径必须位于项目目录内（归一化后比对），越界拒绝且拒绝记录进 trace | 含 ../ 与绝对路径注入的用例均被拒 |
| FR4 | 执行循环：最多 N 轮（默认 8），final 响应即停 | 轮数可配置且有测试 |
| FR5 | 预算控制：轮数 + token 估算双闸门，任一耗尽即停 | 两种耗尽路径各有测试 |
| FR6 | trace：每轮记录 round / action / detail，JSONL 落盘可读回 | 覆盖每轮，含被拒绝的调用 |
| FR7 | FakeLLM 任务脚本：dict 列表协议（见模块二） | 脚本驱动测试无需网络与 API key |

**非目标**（反例清单，防"顺手扩展"）：不做多 Agent（拓展任务再做）；不做流式输出；不做进程级沙箱（文件级路径检查即可）；不支持并行工具调用；不追求真实 token 计数（粗估即可，宁高勿低）。

## 模块二 · 技术设计

<Diagram type="agentloop" />

模块划分与职责边界：

| 模块 | 职责 | 不负责 |
| --- | --- | --- |
| llm.py | LLM 协议定义、FakeLLM（脚本应答）、真实 API 适配层接口 | 执行逻辑、工具实现 |
| agent.py | 执行循环、响应校验（工具白名单/参数）、预算闸门、错误反馈 | 具体工具行为 |
| tools.py | 三工具实现、路径沙箱（resolve + 越界抛 SandboxViolation） | 循环与预算 |
| trace.py | TraceLogger：JSONL 追加写入与读回校验 | 任何业务判断 |

关键设计决策（每条都对应本章一个概念）：

1. **循环状态放 agent.py，LLM 无状态**——上下文就是 history 列表（w1-l4：给模型看什么 = 上下文工程）；
2. **工具返回值（成功与失败都）进上下文**——失败输出是最强反馈（l3 的 TDD 结论在工具层的翻版）；
3. **预算闸门在循环顶部、调用 LLM 之前检查**——超预算时不多花一次调用（l1 升级的"验收转投"原则：先省钱再谈自主）；
4. **路径检查先 os.path.realpath 归一化再比对项目目录**——字符串前缀检查会被 ../ 绕过（安全默认，w6 预告）；
5. **trace 全量记录含被拒绝的调用**——验收要证据（l5），事故要可回放。

FakeLLM 任务脚本协议：

\`\`\`text
脚本 = dict 列表, FakeLLM 按被调用次数依序弹出:
  [
    {"type": "tool", "name": "read_file", "args": {"path": "src/calc.py"}},
    {"type": "tool", "name": "write_file",
     "args": {"path": "src/calc.py", "content": "..."}},
    {"type": "tool", "name": "run_tests", "args": {"target": "tests/test_calc.py"}},
    {"type": "final", "message": "subtract 已修复, 测试 1/1 通过"}
  ]
脚本耗尽的兜底: 返回 {"type": "final", "message": "脚本耗尽"} ——
让测试能区分"正常完成"与"意外提前结束"。
\`\`\`

## 模块三 · 实现步骤（12 步）

1. **建骨架**：mini-agent/ 四个空模块 + tests/ + README；git init，建一个 worktree 专门跑 Agent 实验（l2 的工位隔离）；
2. **trace.py 先行**：TraceLogger.append(round, action, detail) 追加写 JSONL；read_all() 读回；写 3 条单测（空/中文/追加）；
3. **tools.py 沙箱**：resolve_path(path)——realpath 归一化 + 项目目录前缀比对，越界抛 SandboxViolation；先写越界测试再写实现（AC 先行）；
4. **tools.py 三工具**：read_file（不存在返回错误字符串）、write_file（沙箱内落盘）、run_tests（VFS 模式按断言规则判，真实模式 subprocess 跑 pytest 取返回码）；
5. **llm.py 协议**：LLM 抽象（respond(history) -> dict）；FakeLLM 实现脚本协议含耗尽兜底；
6. **llm.py 适配层接口**：RealLLM 骨架（构造函数收 api_key 路径但不读内容，respond 抛 NotImplementedError——接口就位即为拓展任务 1 留好插槽）；
7. **agent.py 响应校验**：parse_response(dict)——type 必须是 tool/final；tool 的 name 必须在白名单；args 必须含必需键；违规返回结构化错误（不抛到顶）；
8. **agent.py 执行循环**：预算闸门（轮数+token 估算）→ 调 LLM → 校验 → 执行工具 → 结果/错误回填 history → trace 记录每一步（含拒绝）；
9. **系统测试**：按模块四的 12 条用例逐条实现（FakeLLM 脚本驱动，全程无网络）；
10. **README**：运行方式、FakeLLM 脚本示例、一份真实 trace 样例、四模块与本章概念的映射表；
11. **（可选）真实适配层**：实现 OpenAI/Anthropic 兼容的 respond（函数调用格式），加开关环境变量与成本统计（复用 w1-l2 的 estimate_cost）；
12. **复盘**：如果你开发本项目时用了 Agent 辅助，按 l5 协议统计一次通过率写进 README；再回答"我造的这台机器处于 L 几"。

## 模块四 · 测试用例（≥10 条）

| id | 路径 | 脚本/输入 | 期望 |
| --- | --- | --- | --- |
| TC1 | 正常完成 | read → write → run_tests → final 四步脚本 | status=done；trace 4 轮；VFS 内容已更新 |
| TC2 | 工具名幻觉 | 第 1 步调用 delete_database | 错误反馈进 history；Agent 换正确工具后 done；trace 含拒绝记录 |
| TC3 | 参数错误 | write_file 缺 content 键 | 参数校验失败反馈进 history，不落盘 |
| TC4 | 死循环熔断 | 脚本永远返回同一 tool 调用 | status=max_rounds；trace 长度 = max_rounds |
| TC5 | 轮数预算耗尽 | max_rounds=3，脚本有 5 步 | 第 3 轮后停止，status=max_rounds |
| TC6 | token 预算耗尽 | token_cap 设极小 | 第二轮即停，status=budget_exhausted |
| TC7 | 文件越界拒绝 | write_file path=../evil.txt | 抛/返回 SandboxViolation；文件不存在；trace 有记录 |
| TC8 | 绝对路径注入 | read_file path=/etc/passwd | 沙箱拒绝；错误进 history |
| TC9 | trace 完整性 | TC1 跑完读回 trace | round 连续从 1 开始；action 非空；末条为 final |
| TC10 | run_tests 失败反馈 | 脚本先 write 错误实现再 run_tests 再修复 | FAILED 输出进 history；修复后 PASSED；最终 done |
| TC11 | final 携带 message | final 响应含中文 message | 循环返回值包含该 message 原文 |
| TC12 | 脚本耗尽兜底 | 脚本只有 2 步且无 final | FakeLLM 兜底 final；循环正常结束不崩溃 |

TC1/TC9/TC10/TC11 是"正常与证据"路径；TC2/TC3/TC7/TC8 是"幻觉与越界"防线；TC4/TC5/TC6 是"预算与熔断"——三组分别对应 l3 的停止信号、l2 的禁区、l1 的预算闸门。

## 模块五 · 常见故障排查表

| 故障 | 典型症状 | 根因 | 处置 |
| --- | --- | --- | --- |
| FakeLLM 脚本不推进 | 每轮返回同一个响应 | 脚本索引没按调用次数推进（用了 len(history) 当下标） | 状态放 FakeLLM 内部计数器，history 只读不当地址 |
| 越界检查被绕过 | ../../etc/passwd 写入成功 | 用字符串 startswith 前缀检查，未 realpath 归一化 | 先 os.path.realpath 再比对；补 TC7/TC8 回归 |
| trace 中文乱码 | JSONL 打开是乱码 | open 没指定 encoding='utf-8' | 读写都显式 utf-8；trace 校验测试顺带覆盖 |
| 死循环不熔断 | 轮数远超 max_rounds | 预算闸门放在了 LLM 调用之后 | 闸门移到循环顶部（先省钱再干活） |
| run_tests 永远成功 | FAILED 用例也报 PASSED | 用输出文本而非返回码判断 | 真实模式以 subprocess 返回码为准；VFS 模式以断言规则为准 |
| 修复后不重跑测试 | 改完直接 final | 脚本里没安排 run_tests 回读 | 任务脚本铁律"改完即验"；校验器可在 final 前检查最近一次动作 |
| token 估算严重偏低 | 实际费用远超预算 | len//3 对中文与代码偏低 | 按 len(text) 全计（宁高勿低）或对中文乘 1.5 系数 |

## 模块六 · 完成标准（Definition of Done）

1. pytest 全绿，系统测试 ≥10 条（对应模块四的 TC 编号）；
2. 纯标准库实现：除 pytest 外无任何第三方 import（审计：grep import 逐个核对）；
3. 工具白名单外调用 100% 拒绝，且拒绝行为有测试证明（TC2）；
4. 沙箱越界 100% 拒绝，覆盖 ../ 与绝对路径两类注入（TC7/TC8）；
5. 轮数与 token 两种预算都可配置，且各有耗尽路径测试（TC5/TC6）；
6. trace 覆盖每一轮（含被拒绝的调用），JSONL 可读回且通过 TC9 完整性校验；
7. FakeLLM 与真实适配层实现同一协议：测试不感知差异（FR1）；
8. README 含运行示例、trace 样例、"模块 ↔ 本章概念"映射表；
9. 一次完整演示可复现：FakeLLM 修复 subtract 的 trace 全程固定脚本可重放（TC1 即演示）；
10. 复盘笔记：回答"这台机器处于 L 几、为什么"，并给出把它升到 L3 缺的三个条件（自动验收、通过率数据、隔离环境——l1 的升级条件原样适用）。

## 模块七 · 拓展任务

1. **接真实 API**：实现模块三第 11 步的真实适配层（OpenAI / Anthropic 函数调用格式），接入成本统计（w1-l2 的 estimate_cost），并在 README 加"真实模式下新增的风险"一节（提示注入、费用失控——l5 红线映射）；
2. **接项目 C 的 MCP 工具源**：把 tools.py 的工具注册抽象成 ToolSource 接口，实现 McpToolSource 桥接 w2 项目 C 的 stdio MCP server——工具列表与调用都走 MCP 协议，沙箱检查保留在本地层；
3. **子代理拆分（连 l4）**：orchestrator 把"给多模块写 docstring"拆给多个 mini-agent 实例并行执行，复用 l4 demo 的失真检测做汇总对账——把本课的 toy 升级为主从式拓扑的最小实证；
4. **把验收任务换成项目 B 的仓库**：用 mini-agent 在项目 B 的仓库上执行一张真实任务卡（read → write → run_tests → report），trace 与项目 B 的验收脚本对账——两个项目在同一张任务卡上会师；
5. （选做）**计划模式**：给 agent.py 加 plan 阶段——先产出计划并要求脚本里显式 approve 才进入工具执行，复现 l3 的四阶段（校验器可直接用 e5 题的 check_workflow）。

### 完整案例

TC1 的完整走查（FakeLLM 修复 subtract），逐步看"为什么"：

| 轮 | 动作 | trace detail | 为什么这一步 |
| --- | --- | --- | --- |
| R1 | read_file src/calc.py | 文件内容（含 BUG） | 感知先行：不读就改是瞎改（w2 循环的"感知"） |
| R2 | write_file（修复实现） | 已写入 37 字符 | 最小修改：带着读到的上下文做定向修复 |
| R3 | run_tests | PASSED: 1/1 | 改完即验：停止信号来自断言而非自我感觉（l3） |
| R4 | final | subtract 已修复, 测试 1/1 通过 | 绿了就停，不做额外发挥；汇报与 trace 互为证据（l5） |

预算侧：4 轮 < 8 上限；token 估算全程 < 4000。trace 四条完整可回放——TC9 的断言逐条成立。**这台机器在 l1 的语言里是一个 L2 个体**：每一步都留证据，final 即交给上级验收。

### 代码实践

下方演示是项目 A 的 70 行可运行预览：VFS 内存文件系统 + 沙箱路径检查 + 三工具 + 脚本 FakeLLM + 预算闸门 + trace 输出。真实项目按模块三把它拆成四个文件并补齐测试。先跑通它，再动手写正式版。

### 常见误区与安全风险

- **误区一：先写循环再补测试。** 执行循环的错误（熔断失效、反馈丢失）都是路径性的，事后补测很难补全；按模块三顺序 trace → tools → llm → agent，每步测试先行（AC 先行的项目版）。
- **误区二：错误信息不上 trace。** 只记成功动作的 trace 是"功绩簿"不是"黑匣子"——事故回放靠的恰是被拒绝与失败的那些轮次。
- **误区三：把 FakeLLM 写得太聪明。** FakeLLM 的价值是确定性，不是逼真；在 FakeLLM 里加随机性等于把不可测性请回系统。
- **安全提示：沙箱是本项目真正的安全课。** 路径检查必须在**归一化之后**做（../ 与符号链接都会绕过朴素前缀检查）；真实 API 模式下 api_key 只允许从环境变量/密钥文件路径读取且**绝不允许进入 trace 与 history**——这是 l5 红线的代码化。

### 知识关联：承上启下

- 承上：l1 的预算闸门与级别判定（复盘题）、l2 的任务卡（FakeLLM 脚本就是给"机器 Agent"的任务卡）、l3 的停止信号与改完即验、l4 的工具反馈与对账、l5 的 trace 证据与红线（密钥不入 trace）；
- 启下：w5 的终端自动化会把你造的循环放进真实 shell 环境；w6 的安全周会把本项目的沙箱升级为完整威胁模型（提示注入、供应链）；拓展任务 2/3 分别通向项目 C（MCP）与 w4 的多 Agent 实证。

### 动手实验

1. 运行下方预览 demo，找到预算闸门、沙箱检查、错误回填三处代码的位置——它们分别对应 l1/l3/l2 的哪个概念？
2. 修改 demo 的 SCRIPT：在第 2 步把 path 改成 ../evil.txt，观察沙箱拒绝与 trace 记录（这就是 TC7 的雏形）；
3. 按模块三第 1-2 步建好骨架并实现 trace.py（含 3 条单测）——本周项目进度至少推进到这里。

### 本节总结

1. 项目 A = 执行循环 + 工具沙箱 + 双预算 + 全量 trace，四模块（llm/agent/tools/trace）职责互斥；
2. FakeLLM 脚本协议让 Agent 系统第一次变得可确定性测试——可验证性是自治的前提；
3. 五个关键设计决策全部来自本章概念：无状态 LLM、错误进上下文、闸门在顶部、realpath 沙箱、trace 记拒绝；
4. 12 条测试分三组：正常与证据、幻觉与越界、预算与熔断——覆盖即本章复习；
5. DoD 第 10 条是灵魂：用 l1 的语言给你造的机器定级，并说出升级缺什么。

### 参考资料与延伸阅读

- [官方作业仓库 week4（Agent Manager）](https://github.com/mihail911/modern-software-dev-assignments)——官方 Week 4 作业：本项目 A 的主题锚点（本项目为"造 Agent"方向的自主设计，具体要求以官方仓库 assignment.md 为准）；
- Anthropic《Building effective agents》——agent loop 与工具模式的权威表述：对应"模块二"的循环设计；
- Anthropic《Claude Code: Best practices for agentic coding》——真实 Agent 的工程形态参照：对应"拓展任务 1"；
- 本课程 w2 章（Coding Agent 解剖学）——工具调用协议与 MCP：对应 tools.py 与拓展任务 2；
- 本项目规格、FakeLLM 协议、12 条测试、排查表与 DoD 均为自主设计的原创教学内容。

### 本节习题导引

fill/judge 题校准架构决策；code 题让你先实现响应解析、执行循环与 trace 校验三个核心函数（它们就是项目的原型）；open 题要求写出 FakeLLM 脚本与预算参数的论证。
`,
        tips: [
          { kind: 'pitfall', text: '路径检查在 realpath 之后做前缀比对，且比对目标也要 realpath：两个未归一化的字符串比较是沙箱失效第一名。' },
          { kind: 'performance', text: 'token 粗估用 len(text) 全计而不是 len//3：高估只浪费预算额度，低估会击穿预算——两个方向的错误代价不对称。' },
          { kind: 'interview', text: '"Agent 死循环怎么办？"——答循环顶部双预算闸门（轮数+token）+ final 才是唯一正常出口 + 幻觉工具错误回填上下文给自纠机会，三层是完整答案。' },
          { kind: 'note', text: '把 FakeLLM 脚本当"任务卡"来写：每一步注释写清意图（感知/修改/验证/收工），两个月后回读 trace 依然能看懂当时的设计。' },
        ],
        demos: [
          {
            title: '项目 A 预览：70 行看懂 agent loop（FakeLLM + 沙箱 + 预算 + trace）',
            lang: 'python',
            code: `# 项目 A 预览: FakeLLM 脚本 + 工具沙箱 + 双预算 + trace (完整规格见本节模块一至七)
VFS = {
    "src/calc.py": "def subtract(a, b):\\n    return a + b  # BUG: 应为减法\\n",
    "tests/test_calc.py": "from calc import subtract\\n\\ndef test_subtract():\\n    assert subtract(5, 2) == 3\\n",
}

def resolve_path(path):
    # 沙箱(简化版): 禁绝对路径与 .. —— 真实实现先 os.path.realpath 再比对项目目录
    if not path or path.startswith("/") or ".." in path:
        return None
    return path

def tool_read_file(args):
    p = resolve_path(args.get("path", ""))
    if p is None:
        return "ERROR: 沙箱拒绝: 路径越界"
    return VFS.get(p, "ERROR: 文件不存在: " + p)

def tool_write_file(args):
    p = resolve_path(args.get("path", ""))
    if p is None:
        return "ERROR: 沙箱拒绝: 路径越界"
    VFS[p] = args.get("content", "")
    return f"已写入 {p} ({len(args.get('content', ''))} 字符)"

def tool_run_tests(args):
    src = VFS.get("src/calc.py", "")
    if "return a - b" in src:
        return "PASSED: 1/1 (subtract(5, 2) == 3)"
    return "FAILED: subtract(5, 2) 期望 3, 实际 7"

TOOLS = {"read_file": tool_read_file, "write_file": tool_write_file, "run_tests": tool_run_tests}

SCRIPT = [
    {"type": "tool", "name": "read_file", "args": {"path": "src/calc.py"}},
    {"type": "tool", "name": "write_file",
     "args": {"path": "src/calc.py", "content": "def subtract(a, b):\\n    return a - b\\n"}},
    {"type": "tool", "name": "run_tests", "args": {"target": "tests/test_calc.py"}},
    {"type": "final", "message": "subtract 已修复, 测试 1/1 通过"},
]

def make_fake_llm(script):
    state = {"i": 0}
    def llm(history):
        i = state["i"]
        state["i"] += 1
        return script[i] if i < len(script) else {"type": "final", "message": "脚本耗尽"}
    return llm

def run_loop(llm, max_rounds=8, token_cap=4000):
    history = ["任务: 修复 src/calc.py 的 subtract, 让 tests/test_calc.py 通过"]
    trace, tokens = [], 0
    for rnd in range(1, max_rounds + 1):
        if tokens >= token_cap:               # 预算闸门在循环顶部(先省钱再干活)
            trace.append("STOP: token 预算耗尽")
            break
        resp = llm(history)
        if resp["type"] == "final":           # final 是唯一正常出口(绿了就停)
            trace.append(f"R{rnd} final: {resp['message']}")
            return trace, tokens
        name, args = resp["name"], resp["args"]
        fn = TOOLS.get(name)
        result = fn(args) if fn else "ERROR: 未知工具: " + name   # 幻觉 -> 错误回填
        tokens += (len(str(resp)) + len(result)) // 3             # token 粗估
        trace.append(f"R{rnd} {name}: {result.replace(chr(10), ' ')[:44]}")
        history.append(result)                # 成功与失败都进上下文
    else:
        trace.append("STOP: 轮数预算耗尽")
    return trace, tokens

trace, tokens = run_loop(make_fake_llm(SCRIPT))
for line in trace:
    print(line)
print("token 估算:", tokens, "/ 4000; 轮数上限 8")

# 观察点: R1 感知 -> R2 修改 -> R3 验证(改完即验) -> R4 final(绿了就停);
# 沙箱检查、预算闸门、错误回填 三处闸门各自对应本章一个概念`,
          },
        ],
      },
    ],
    exercises: [
      /* ───────── l4 习题（10 题）───────── */
      {
        id: 'cs146s-w4-l4-e1', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-w4-l4', tags: ['K', 'multiagent'],
        question: '三种多 Agent 拓扑：______式（orchestrator-worker，主 Agent 拆解分派汇总）、______式（阶段接力，产物传给下一站）、______式（generator-critic，生成与批评循环）。',
        blanks: [['主从', '层级', 'orchestrator'], ['流水线', 'pipeline'], ['评审', 'generator-critic', '审评']],
        explanation: '选型口诀：同构任务并行用主从，固定流程用流水线，质量关卡用评审式。交互图里还有第四种对话式（自由协商），工程上不作默认。',
      },
      {
        id: 'cs146s-w4-l4-e2', type: 'single', difficulty: 2, relatedLessonId: 'cs146s-w4-l4', tags: ['U', 'multiagent'],
        question: '下列哪一项【不属于】单 Agent 的上下文瓶颈？',
        options: [
          { value: 'a', text: '上下文窗口的物理上限' },
          { value: 'b', text: '注意力随内容增长而稀释（lost in the middle）' },
          { value: 'c', text: '多个任务混在一个会话里互相污染' },
          { value: 'd', text: '模型参数量太小' },
        ],
        answer: 'd',
        explanation: '参数量决定模型能力，不是上下文瓶颈。实践证明：任务规模增大时，单 Agent 先撞上的是 b 和 c 这两堵墙，而不是 a 的窗口上限。',
      },
      {
        id: 'cs146s-w4-l4-e3', type: 'judge', difficulty: 2, relatedLessonId: 'cs146s-w4-l4', tags: ['U', 'multiagent'],
        question: '多 Agent 拓扑本身会增加系统的智能：三个弱 Agent 组合一定强于一个强 Agent。',
        answer: false,
        explanation: '拓扑不增加智能，只改变误差结构——三个弱 Agent 不会涌现出强能力，只会多出接力失真、重复劳动、责任真空三类新失败模式。官方建议：能单 Agent 就不要多 Agent。',
      },
      {
        id: 'cs146s-w4-l4-e4', type: 'multiple', difficulty: 3, relatedLessonId: 'cs146s-w4-l4', tags: ['U', 'multiagent'],
        question: '关于上下文隔离三原则，下列说法正确的有？',
        options: [
          { value: 'a', text: '每个 worker 只收自己的任务卡与所需文件，不收兄弟任务的输出' },
          { value: 'b', text: '任务之间只通过"产物 + 验收标准"耦合' },
          { value: 'c', text: 'worker 之间应共享全部中间过程，协作才顺畅' },
          { value: 'd', text: '合并、冲突裁决、最终验收全部归 orchestrator' },
        ],
        answer: ['a', 'b', 'd'],
        explanation: 'c 违反隔离原则：共享全部 = 互相污染 + 注入面扩大。三原则是最小上下文（a）、显式接口（b）、汇总归一（d）。',
      },
      {
        id: 'cs146s-w4-l4-e5', type: 'fill', difficulty: 3, relatedLessonId: 'cs146s-w4-l4', tags: ['K', 'multiagent'],
        question: '多 Agent 三大失败模式：要求在传递中变形叫______失真；两个 worker 做了同一件事叫______；出了问题没人认领叫______。',
        blanks: [['接力', '接力失真'], ['重复劳动', '重复'], ['责任真空', '责任缺失']],
        explanation: '防线一一对应：逐条对账（对失真）、任务卡写明他人范围（对重复）、每条 AC 唯一 owner（对真空）。',
      },
      {
        id: 'cs146s-w4-l4-e6', type: 'code', difficulty: 3, relatedLessonId: 'cs146s-w4-l4', tags: ['D', 'multiagent'],
        question: '实现接力失真审计器 `audit_relay(cards, reports)`：cards 为 {worker_id: [要求, ...]}（主 Agent 发出的任务卡），reports 为 {worker_id: [汇报行, ...]}。匹配规则：某条要求被覆盖，当且仅当该 worker 的汇报行中存在一行包含它（子串关系）。返回元组 (missing, extra)：missing 只收录有缺漏的 worker，值为未被覆盖的要求列表；extra 只收录有多余汇报的 worker，值为不包含任何要求子串的汇报行。若 reports 里出现 cards 中没有的 worker，其全部汇报行计入 extra。',
        lang: 'python',
        starterCode: `def audit_relay(cards, reports):
    """cards: {worker_id: [要求, ...]}; reports: {worker_id: [汇报行, ...]}
    返回 (missing, extra) —— 接力失真的逐条对账"""
    pass

cards = {"w1": ["实现 add 函数", "补 3 条测试"], "w2": ["处理空列表分支"]}
reports = {
    "w1": ["已完成: 实现 add 函数", "已完成: 补 3 条测试"],
    "w2": ["已完成: 处理空列表分支", "顺手重构了模块的日志格式"],
    "w3": ["我做了 w1 的任务"],
}
print(audit_relay(cards, reports))`,
        expectedOutput: `({}, {'w2': ['顺手重构了模块的日志格式'], 'w3': ['我做了 w1 的任务']})`,
        tests: `cards = {"a": ["实现 X", "补测试"], "b": ["处理空列表"]}
rep = {"a": ["已完成: 实现 X", "已完成: 补测试"], "b": ["已完成: 处理空列表", "顺手改了 README"]}
missing, extra = audit_relay(cards, rep)
assert missing == {}, "全部覆盖"
assert extra == {"b": ["顺手改了 README"]}
rep2 = {"a": ["已完成: 实现 X"], "b": ["已完成: 处理空列表"]}
missing2, extra2 = audit_relay(cards, rep2)
assert missing2 == {"a": ["补测试"]} and extra2 == {}, "漏做检测"
missing3, extra3 = audit_relay(cards, {"a": rep["a"], "c": ["自作主张实现了 Y"]})
assert extra3 == {"c": ["自作主张实现了 Y"]}, "未分派的 worker"
missing4, extra4 = audit_relay(cards, {})
assert missing4 == {"a": ["实现 X", "补测试"], "b": ["处理空列表"]} and extra4 == {}`,
        allowedModules: [],
        explanation: '逐条对账把"漏做与越权"从扯皮变成机器可查——这是 l4 demo 防线的函数化。注意双向检查：要求找汇报（漏做），汇报找要求（越权），两个方向都要扫。',
        answer: `def audit_relay(cards, reports):
    missing, extra = {}, {}
    for wid, reqs in cards.items():
        lines = reports.get(wid, [])
        miss = [r for r in reqs if not any(r in ln for ln in lines)]
        if miss:
            missing[wid] = miss
    for wid, lines in reports.items():
        reqs = cards.get(wid, [])
        extra_lines = [ln for ln in lines if not any(r in ln for r in reqs)]
        if extra_lines:
            extra[wid] = extra_lines
    return missing, extra

cards = {"w1": ["实现 add 函数", "补 3 条测试"], "w2": ["处理空列表分支"]}
reports = {
    "w1": ["已完成: 实现 add 函数", "已完成: 补 3 条测试"],
    "w2": ["已完成: 处理空列表分支", "顺手重构了模块的日志格式"],
    "w3": ["我做了 w1 的任务"],
}
print(audit_relay(cards, reports))`,
      },
      {
        id: 'cs146s-w4-l4-e7', type: 'single', difficulty: 3, relatedLessonId: 'cs146s-w4-l4', tags: ['U', 'multiagent'],
        question: '哪类任务最适合选择评审式（generator-critic）拓扑？',
        options: [
          { value: 'a', text: '50 个同构子任务的批量并行处理' },
          { value: 'b', text: '抽取 → 校验 → 格式化 → 发布的固定流程' },
          { value: 'c', text: '质量要求高、有机器可判标准、需要独立视角把关的产出' },
          { value: 'd', text: '一次性的两行小修改' },
        ],
        answer: 'c',
        explanation: '评审式的价值在"独立视角 + 循环到达标"，前提是标准机器可判（否则 critic 无法客观，循环空转）。a 用主从式，b 用流水线式，d 单 Agent 即可。',
      },
      {
        id: 'cs146s-w4-l4-e8', type: 'judge', difficulty: 3, relatedLessonId: 'cs146s-w4-l4', tags: ['U', 'multiagent'],
        question: 'critic Agent 应与 generator 共享同一个会话上下文：了解全部推理过程能让评审更准确。',
        answer: false,
        explanation: '看过推理过程的 critic 会被锚定（顺着对方思路走），评审价值大打折扣。干净视角要求 critic 只看产出物（独立上下文）——这是 l3 子代理时机第三条的机制依据。',
      },
      {
        id: 'cs146s-w4-l4-e9', type: 'code', difficulty: 4, relatedLessonId: 'cs146s-w4-l4', tags: ['D', 'multiagent'],
        question: '实现 `parallel_waves(tasks, deps)`：tasks 为任务 id 列表，deps 为先决对列表 [(a, b)] 表示 a 必须先于 b。返回按波次分组的列表：第 1 波是所有无前置依赖的任务，第 k 波的任务在第 k-1 波全部完成后即可开工；同一波内按 tasks 中的出现顺序排列。若存在循环依赖，抛 ValueError（消息包含"循环依赖"）。',
        lang: 'python',
        starterCode: `def parallel_waves(tasks, deps):
    # Kahn 分层: 每轮取入度为 0 的节点; 循环依赖 -> ValueError("存在循环依赖")
    pass

print(parallel_waves(["t1", "t2", "t3"], [("t1", "t3"), ("t2", "t3")]))
print(parallel_waves(["a", "b", "c"], [("a", "b"), ("b", "c")]))`,
        expectedOutput: `[['t1', 't2'], ['t3']]
[['a'], ['b'], ['c']]`,
        tests: `assert parallel_waves(["t1", "t2", "t3"], [("t1", "t3"), ("t2", "t3")]) == [["t1", "t2"], ["t3"]]
assert parallel_waves(["a", "b", "c"], []) == [["a", "b", "c"]]
assert parallel_waves(["a", "b", "c"], [("a", "b"), ("b", "c")]) == [["a"], ["b"], ["c"]]
assert parallel_waves(["x"], []) == [["x"]]
assert parallel_waves(["t2", "t1", "t3"], [("t1", "t3"), ("t2", "t3")]) == [["t2", "t1"], ["t3"]], "波内保持 tasks 顺序"
try:
    parallel_waves(["a", "b"], [("a", "b"), ("b", "a")])
    assert False, "应抛循环依赖"
except ValueError as e:
    assert "循环依赖" in str(e)`,
        allowedModules: [],
        explanation: '波次 = 拓扑分层（Kahn 算法）。它是 orchestrator 拆解的合法性检查器：w3-l2 的 Plan 依赖图画完，第一波就是可立即并行分派的 worker 集合。',
        answer: `def parallel_waves(tasks, deps):
    indeg = {t: 0 for t in tasks}
    dependents = {t: [] for t in tasks}
    for a, b in deps:
        indeg[b] += 1
        dependents[a].append(b)
    waves = []
    ready = [t for t in tasks if indeg[t] == 0]
    done = 0
    while ready:
        waves.append(ready)
        done += len(ready)
        nxt = []
        for t in ready:
            for d in dependents[t]:
                indeg[d] -= 1
                if indeg[d] == 0:
                    nxt.append(d)
        ready = [t for t in tasks if t in nxt]
    if done != len(tasks):
        raise ValueError("存在循环依赖, 无法分波")
    return waves

print(parallel_waves(["t1", "t2", "t3"], [("t1", "t3"), ("t2", "t3")]))
print(parallel_waves(["a", "b", "c"], [("a", "b"), ("b", "c")]))`,
      },
      {
        id: 'cs146s-w4-l4-e10', type: 'open', difficulty: 5, relatedLessonId: 'cs146s-w4-l4', tags: ['D', 'multiagent'],
        question: '任务：为遗留 Python 模块（约 3000 行、零测试、有中文注释）补齐单元测试，要求分支覆盖率 ≥ 80%。设计多 Agent 方案：① 拓扑选择与理由（对比至少两种被否掉的拓扑）；② 每个 Agent 的上下文包内容（给指针原则的具体化）；③ 通信协议（任务卡与产物的字段）；④ 针对接力失真、重复劳动、责任真空各写一条具体防线；⑤ 说明你如何验证"覆盖率 ≥ 80%"这个验收标准。',
        referenceAnswer: `① 拓扑：选主从式（orchestrator-worker）。理由：补测试是典型的同构可并行子任务（按函数/类分批），接口清晰（产物 = 测试文件 + 覆盖率报告）。否掉评审式——覆盖率有客观指标，不需要主观 critic 循环；否掉流水线式——"分析→写测试→跑测试"三站的耦合度高，流水线传递反而丢失上下文，且瓶颈会在写测试一站。

② 上下文包（每 worker）：
- 自己负责的模块文件（指针 + "为什么：你只测它"一行）；
- 全局测试约定（命名、fixture 位置、断言风格——来自指令文件而非口头）；
- 覆盖率工具用法一行（pytest --cov 参数）；
- 不给：其他 worker 的模块、全仓库历史（最小上下文）。
orchestrator 额外持有：模块清单与分批方案、各 worker 的产物汇总。

③ 通信协议（消息传递，不走共享黑板）：
任务卡字段：batch_id、模块文件指针、该批函数清单、覆盖率责任份额（该批需贡献的覆盖点）、禁区（不改源码、不 mock 掉被测逻辑）、AC（该批测试全绿 + 源码 diff 为空）。
产物字段：batch_id、测试文件路径、逐条对账（覆盖了卡上哪些函数）、未覆盖项及原因。
orchestrator 只接收产物字段，不接收 worker 的中间过程。

④ 防线：
- 接力失真：任务卡的函数清单逐条编号，产物逐条对账（e6 题的 audit_relay 原样可用）；orchestrator 抽查一条对账（读一个测试文件核对它测的确实是指定函数）；
- 重复劳动：分批按"文件 → 函数区间"切分且互不重叠，任务卡写明"你的范围 / 他人范围"；orchestrator 合并前检查函数去重；
- 责任真空：覆盖率份额按批分配（每批写明"这批贡献 X% 语句覆盖"），orchestrator 逐批核销；总报告未达 80% 时能立刻定位到批。

⑤ 验收：覆盖率是天然机器可判的标准——pytest --cov 产出语句/分支覆盖率报告，断言总分支覆盖 ≥ 80% 且每批 AC 全绿、被测源码 git diff 为空（禁区核验）。加上两条防线断言：无重复测试函数名（重复劳动检测）、每批产物对账完整（失真检测）。

风险预案：若某批覆盖率贡献连续两轮不达标（l1 降级信号），该批降级——orchestrator 亲自写或改人工。`,
        rubric: [
          { point: '拓扑选择正确且否掉的拓扑有具体理由（不是"感觉不合适"）', score: 3 },
          { point: '上下文包体现最小上下文与指针原则（含不给什么）', score: 3 },
          { point: '通信协议字段完整，任务卡含覆盖率份额与禁区', score: 3 },
          { point: '三条防线分别可执行且与本节机制对应（对账/负空间/核销）', score: 3 },
          { point: '验收标准落到 pytest --cov 断言与 git diff 禁区核验', score: 3 },
        ],
        keywords: ['主从式', '上下文隔离', '对账', '覆盖率', '禁区'],
        explanation: '判卷核心是"机制落地"：凡是把本节概念（最小上下文、逐条对账、唯一 owner、机器可判）翻译成具体字段与命令的方案为高分；只复述拓扑定义的为低分。',
      },

      /* ───────── l5 习题（8 题）───────── */
      {
        id: 'cs146s-w4-l5-e1', type: 'single', difficulty: 2, relatedLessonId: 'cs146s-w4-l5', tags: ['U', 'antipattern'],
        question: 'Agent 汇报"已完成，测试都过了"，你扫了一眼 diff 就点了批准。这属于哪种反模式？',
        options: [
          { value: 'a', text: '幽灵并行' },
          { value: 'b', text: '橡皮图章式审批' },
          { value: 'c', text: '上下文倾倒' },
          { value: 'd', text: '过度怀疑' },
        ],
        answer: 'b',
        explanation: '橡皮图章的本质：验收没有执行（三问没问、断言没跑），批准只是流程动作。矫正：至少一条自动断言通过 + 改动文件清单核对后才许批准。',
      },
      {
        id: 'cs146s-w4-l5-e2', type: 'judge', difficulty: 2, relatedLessonId: 'cs146s-w4-l5', tags: ['U', 'antipattern'],
        question: '过度怀疑（逐行审查一切 AI 产出）至少是安全的，不算反模式。',
        answer: false,
        explanation: '它效率退回 L0 还搭上双份时间，且审查质量随疲劳下降——与过度信任是同一失败的两面：都拒绝用数据校准。矫正：按通过率分级授权，把审查带宽留给高风险任务。',
      },
      {
        id: 'cs146s-w4-l5-e3', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-w4-l5', tags: ['K', 'antipattern'],
        question: '反模式四联：橡皮图章式______、______并行（后台任务没人管）、上下文______（整个目录拖进会话）、过度______与过度怀疑两个极端。',
        blanks: [['审批', '批准'], ['幽灵', 'ghost'], ['倾倒', '倾泻', '倾倒'], ['信任', '轻信']],
        explanation: '四个反模式的共同点：都在"人机分工"这个决策上出了错——审批放水、并行失管、供给过量、信任失衡。',
      },
      {
        id: 'cs146s-w4-l5-e4', type: 'multiple', difficulty: 3, relatedLessonId: 'cs146s-w4-l5', tags: ['U', 'security'],
        question: '下列哪些属于永不委派的 安全红线？',
        options: [
          { value: 'a', text: '让 Agent 读取 .env 把数据库连接串放进上下文' },
          { value: 'b', text: '让 Agent 直接对生产库执行 UPDATE 订正数据' },
          { value: 'c', text: '让 Agent 直接把公告发布到官网首页' },
          { value: 'd', text: '在隔离分支上让 Agent 为测试目录补单元测试' },
        ],
        answer: ['a', 'b', 'c'],
        explanation: '三条红线：凭据（进入上下文即泄漏）、生产数据与生产操作（不可逆）、对外发布（撤回成本极高）——共同点是错误不可回滚或不可发现。d 是完全可委派的正常任务。',
      },
      {
        id: 'cs146s-w4-l5-e5', type: 'code', difficulty: 3, relatedLessonId: 'cs146s-w4-l5', tags: ['D', 'trust'],
        question: '实现 `calibrate(records)`：records 为 [(task_type, first_pass)] 列表，first_pass 表示该次委托是否验收一次通过。按 task_type 统计并返回 {task_type: {"rate": 保留 2 位小数的一次通过率, "level": 建议级别, "note": str}}。级别按原始通过率映射：≥0.9 → 3；≥0.7 → 2；≥0.5 → 1；否则 0。样本数 < 5 时 note 为 "样本不足"，否则为空字符串。',
        lang: 'python',
        starterCode: `def calibrate(records):
    # rate 保留 2 位; level: >=0.9 -> 3, >=0.7 -> 2, >=0.5 -> 1, 否则 0
    # note: 样本 < 5 -> "样本不足", 否则 ""
    pass

records = [("脚手架", True)] * 5 + [("脚手架", False)] * 1
records += [("安全相关", False)] * 6 + [("安全相关", True)] * 1
for k, v in calibrate(records).items():
    print(k, v)`,
        expectedOutput: `脚手架 {'rate': 0.83, 'level': 2, 'note': ''}
安全相关 {'rate': 0.14, 'level': 0, 'note': ''}`,
        tests: `recs = [("a", True)] * 10
r = calibrate(recs)
assert r["a"] == {"rate": 1.0, "level": 3, "note": ""}
r2 = calibrate([("b", True)] * 3)
assert r2["b"]["note"] == "样本不足" and r2["b"]["level"] == 3, "样本保护不改变级别, 只标记"
r3 = calibrate([("c", True), ("c", False)] * 3)
assert r3["c"] == {"rate": 0.5, "level": 1, "note": ""}
assert calibrate([("d", False)] * 7)["d"]["level"] == 0
r5 = calibrate([("e", True)] * 8 + [("e", False)] * 2)
assert r5["e"] == {"rate": 0.8, "level": 2, "note": ""}`,
        allowedModules: [],
        explanation: '这是 l5 校准协议的函数化：分类统计、阈值映射、样本保护三步合一。注意"样本不足只标记不改变级别"——保护的是调级动作的置信度，不是级别本身。',
        answer: `def calibrate(records):
    stats = {}
    for ttype, ok in records:
        s = stats.setdefault(ttype, [0, 0])
        s[0] += 1
        s[1] += 1 if ok else 0
    out = {}
    for ttype, (n, ok_n) in stats.items():
        rate = ok_n / n
        if rate >= 0.9:
            level = 3
        elif rate >= 0.7:
            level = 2
        elif rate >= 0.5:
            level = 1
        else:
            level = 0
        out[ttype] = {"rate": round(rate, 2), "level": level, "note": "" if n >= 5 else "样本不足"}
    return out

records = [("脚手架", True)] * 5 + [("脚手架", False)] * 1
records += [("安全相关", False)] * 6 + [("安全相关", True)] * 1
for k, v in calibrate(records).items():
    print(k, v)`,
      },
      {
        id: 'cs146s-w4-l5-e6', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-w4-l5', tags: ['K', 'trust'],
        question: '校准协议五步：按______类型分类记录每次委托；统计______率与平均返工轮数；阈值映射级别；每 10 个任务______一次；样本数不足 5 ____。',
        blanks: [['任务', '任务类型'], ['一次通过', 'first-pass', '通过'], ['重估', '重新评估', '复盘'], ['不调级', '不调整', '不调']],
        explanation: '灵魂是第 1 步：混在一起的平均通过率会被简单任务稀释，掩盖"安全类实际很低"的信号——按类型分开统计才暴露真正的风险所在。',
      },
      {
        id: 'cs146s-w4-l5-e7', type: 'open', difficulty: 4, relatedLessonId: 'cs146s-w4-l5', tags: ['D', 'trust'],
        question: '你是团队的 Agent 使用负责人，本季度数据：脚手架生成 40 任务通过率 92%；测试补全 35 任务 84%；bug 修复 20 任务 55%；重构 15 任务 45%；安全相关 6 任务 50%。① 按协议给出每类的调级决定（当前统一 L2）与依据；② 为 bug 修复类设计降级后的工作方式（怎么改任务卡、怎么验收）；③ 写出你下季度要建的两层技术配套并说明各防哪条红线；④ 指出这份统计的一个统计陷阱并给出规避方法。',
        referenceAnswer: `① 调级决定（当前统一 L2）：
- 脚手架生成 92% ≥ 90% 且样本充足 → 升 L3：后台并行、事后抽查 10%；前提确认这三条升级条件其余两条（验收自动化、可回滚）已满足；
- 测试补全 84% ∈ [70%, 90%) → 维持 L2；
- bug 修复 55% ∈ [50%, 70%) → 降 L1；并在降级的同时复盘任务卡（见②）；
- 重构 45% < 50% → 降 L1 并复查任务卡质量；重构类 15 个样本充足，可考虑再细分（小重构/大重构分别统计）；
- 安全相关 6 个样本 < 10 但 ≥ 5，50% 通过率触发降级——但该类的正确决定不是降级而是"锁定 L0/L1 并永不自动化"：红线类不参与常规调级。

② bug 修复类降级后的工作方式：
- 任务卡：必须附复现步骤 + 失败测试用例（把"偶发"变成可触发）；AC 从"修好了"改为"该测试通过且既有测试零回归"；
- 验收：Agent 产出候选修复与根因分析，人确认根因后人在 L2 提交修复；每 10 个任务重估，连续两次统计 ≥70% 才回 L2；
- 数据二次用途：3 次失败源于任务卡缺复现步骤时，先修 Manager 侧再谈 Agent 能力。

③ 两层技术配套：
- 权限层（防凭据红线）：沙箱与权限模式挡住 .env、密钥路径与生产连接串；Agent 进程只读白名单目录；
- CI 门禁层（防生产与发布红线）：触碰部署配置/生产库迁移的分支必须人工审批合并；对外发布走独立审批流，发布键不进 Agent 可触达的环境。分别对应红线"凭据"与"生产数据/对外发布"。

④ 统计陷阱：辛普森悖论 / 类型内混合——脚手架 92% 可能全是最简单的"空目录 README"，而复杂脚手架全失败但被平均掩盖；或各季度任务难度不同导致跨期不可比。规避：类型内再按难度/规模分层记录（任务卡标注规模档位），跨期比较时固定难度组合或使用同卷回归（同一批标准任务每季度重跑测通过率）。`,
        rubric: [
          { point: '五类调级决定符合阈值映射，且安全相关类被正确"锁定而非常规降级"', score: 3 },
          { point: 'bug 修复的降级工作方式具体（任务卡加复现步骤、验收改证据、重估条件）', score: 3 },
          { point: '两层配套与红线一一对应（权限层防凭据、CI 防生产/发布）', score: 2 },
          { point: '统计陷阱指出具体（如辛普森悖论/难度混合）且规避方法可执行', score: 2 },
        ],
        keywords: ['阈值', '降级', '红线', '复现步骤', '辛普森'],
        explanation: '判卷要点：安全相关类的处理是本题的陷阱题——协议给出的是"降级"，但红线类正确答案是"锁定并永不自动化"，能区分这两者才真正理解了协议的适用边界。',
      },
      {
        id: 'cs146s-w4-l5-e8', type: 'judge', difficulty: 3, relatedLessonId: 'cs146s-w4-l5', tags: ['U', 'trust'],
        question: '某类任务的一次通过率连续三个月保持 95%，可以把安全相关任务的验收也自动化掉了。',
        answer: false,
        explanation: '通过率衡量正确性，不衡量安全性：提示注入可以让 Agent"看起来正常地"做坏事，高通过率对此完全不设防。安全类永远单独统计、永不自动化——这是协议的边界条款。',
      },

      /* ───────── l6 习题（14 题）───────── */
      {
        id: 'cs146s-w4b-l6-e1', type: 'fill', difficulty: 1, relatedLessonId: 'cs146s-w4b-l6', tags: ['K', 'project'],
        question: 'mini-agent 四模块：______.py（LLM 协议与 FakeLLM）、______.py（执行循环与预算闸门）、______.py（工具实现与沙箱）、______.py（JSONL trace 日志）。',
        blanks: [['llm'], ['agent'], ['tools'], ['trace']],
        explanation: '职责互斥是设计底线：循环不做工具行为，工具不做预算判断，trace 不做业务判断——每层可独立测试。',
      },
      {
        id: 'cs146s-w4b-l6-e2', type: 'judge', difficulty: 1, relatedLessonId: 'cs146s-w4b-l6', tags: ['K', 'project'],
        question: '预算闸门应放在执行循环顶部、调用 LLM 之前检查——超预算时不白白多花一次调用。',
        answer: true,
        explanation: '闸门在顶部的含义是"先省钱再干活"：LLM 调用是贵操作，预算已尽还调一次就是纯浪费。这是 l1"升级前先把验收体系建好"的成本版。',
      },
      {
        id: 'cs146s-w4b-l6-e3', type: 'single', difficulty: 2, relatedLessonId: 'cs146s-w4b-l6', tags: ['U', 'project'],
        question: 'FakeLLM 在本项目中的核心作用是？',
        options: [
          { value: 'a', text: '模拟真实模型的概率输出，用于压测系统吞吐' },
          { value: 'b', text: '以规则/脚本方式确定性应答，让执行循环的全部路径可以无需 API key 地被测试' },
          { value: 'c', text: '在真实模型不可用时顶替上生产' },
          { value: 'd', text: '自动生成测试数据' },
        ],
        answer: 'b',
        explanation: 'FakeLLM 的价值是确定性（可测性），不是逼真——在它里面加随机性等于把不可测性请回系统（本节误区三）。c 是危险误用：FakeLLM 永远不该上生产。',
      },
      {
        id: 'cs146s-w4b-l6-e4', type: 'multiple', difficulty: 2, relatedLessonId: 'cs146s-w4b-l6', tags: ['U', 'project'],
        question: '关于沙箱与工具白名单，下列说法正确的有？',
        options: [
          { value: 'a', text: '路径必须先 realpath 归一化，再与项目目录比对' },
          { value: 'b', text: '含 .. 或绝对路径的路径应被拒绝' },
          { value: 'c', text: '白名单外的工具调用可以执行后再告警' },
          { value: 'd', text: '被拒绝的调用也要写入 trace' },
        ],
        answer: ['a', 'b', 'd'],
        explanation: 'c 违反"先拒绝后执行"：白名单外的调用一旦执行，损害已经发生。归一化（a）防 ../ 与符号链接绕过，拒绝记录（d）是事故回放的证据。',
      },
      {
        id: 'cs146s-w4b-l6-e5', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-w4b-l6', tags: ['K', 'project'],
        question: '双预算：______预算（最多 N 轮）与 ______（token）估算预算；任何一项耗尽，循环即______，状态与 trace 保留。',
        blanks: [['轮数', 'round'], ['token', 'Token', '令牌'], ['停止', '熔断', '终止']],
        explanation: '两个闸门各防一种失控：轮数防"逻辑性打转"，token 防"单轮成本失控"。耗尽是正常停止路径，不是异常——trace 要完整保留供回放。',
      },
      {
        id: 'cs146s-w4b-l6-e6', type: 'code', difficulty: 3, relatedLessonId: 'cs146s-w4b-l6', tags: ['D', 'project'],
        question: '实现项目 A 的响应解析器 `parse_tool_call(text)`。协议：模型输出为单行文本。以 "TOOL:" 开头时格式为 TOOL: 工具名 | ARGS: {json 对象}，返回 {"type": "tool", "name": 工具名, "args": 解析后的 dict}；以 "FINAL:" 开头时返回 {"type": "final", "message": 冒号后的文本去除首尾空白}。工具名不在白名单 {"read_file", "write_file", "run_tests"} 中时抛 ValueError 且消息包含 "未知工具: 工具名"；ARGS 不是合法 JSON 或不是对象时抛 ValueError 且消息包含 "JSON"；其他情况抛 ValueError 且消息包含 "无法解析"。',
        lang: 'python',
        starterCode: `import json

ALLOWED_TOOLS = {"read_file", "write_file", "run_tests"}

def parse_tool_call(text):
    # TOOL: name | ARGS: {json} -> {"type": "tool", ...}
    # FINAL: msg -> {"type": "final", "message": msg.strip()}
    pass

print(parse_tool_call('TOOL: read_file | ARGS: {"path": "src/calc.py"}'))
print(parse_tool_call("FINAL: 修复完成, 测试全绿"))`,
        expectedOutput: `{'type': 'tool', 'name': 'read_file', 'args': {'path': 'src/calc.py'}}
{'type': 'final', 'message': '修复完成, 测试全绿'}`,
        tests: `r1 = parse_tool_call('TOOL: write_file | ARGS: {"path": "a.py", "content": "x"}')
assert r1 == {"type": "tool", "name": "write_file", "args": {"path": "a.py", "content": "x"}}
r2 = parse_tool_call("FINAL: done")
assert r2 == {"type": "final", "message": "done"}
try:
    parse_tool_call("TOOL: rm_rf | ARGS: {}")
    assert False, "应抛未知工具"
except ValueError as e:
    assert "未知工具" in str(e) and "rm_rf" in str(e)
try:
    parse_tool_call('TOOL: read_file | ARGS: {bad json}')
    assert False, "应抛 JSON 错误"
except ValueError as e:
    assert "JSON" in str(e)
try:
    parse_tool_call("hello world")
    assert False, "应抛无法解析"
except ValueError as e:
    assert "无法解析" in str(e)`,
        allowedModules: ['json'],
        explanation: '响应校验是 agent.py 的第一道闸（模块三第 7 步）：先验白名单再解析参数，未知工具在执行前就被拦截——错误只进上下文不进世界。',
        answer: `import json

ALLOWED_TOOLS = {"read_file", "write_file", "run_tests"}

def parse_tool_call(text):
    text = text.strip()
    if text.startswith("TOOL:"):
        body = text[len("TOOL:"):]
        if "|" not in body:
            raise ValueError("无法解析的响应: " + text)
        name_part, args_part = body.split("|", 1)
        name = name_part.strip()
        if name not in ALLOWED_TOOLS:
            raise ValueError("未知工具: " + name)
        args_str = args_part.strip()
        if args_str.startswith("ARGS:"):
            args_str = args_str[len("ARGS:"):].strip()
        try:
            args = json.loads(args_str)
        except (json.JSONDecodeError, ValueError):
            raise ValueError("参数不是合法 JSON")
        if not isinstance(args, dict):
            raise ValueError("参数不是合法 JSON")
        return {"type": "tool", "name": name, "args": args}
    if text.startswith("FINAL:"):
        return {"type": "final", "message": text[len("FINAL:"):].strip()}
    raise ValueError("无法解析的响应")

print(parse_tool_call('TOOL: read_file | ARGS: {"path": "src/calc.py"}'))
print(parse_tool_call("FINAL: 修复完成, 测试全绿"))`,
      },
      {
        id: 'cs146s-w4b-l6-e7', type: 'single', difficulty: 3, relatedLessonId: 'cs146s-w4b-l6', tags: ['U', 'project'],
        question: 'Agent 调用了一个不存在的工具名（幻觉），执行循环的正确处理是？',
        options: [
          { value: 'a', text: '直接崩溃退出，让上层重试' },
          { value: 'b', text: '把"未知工具"的结构化错误作为观察结果写回上下文，让 Agent 下一轮自我纠正' },
          { value: 'c', text: '静默忽略这次调用，继续下一轮' },
          { value: 'd', text: '自动猜测最接近的工具名并执行' },
        ],
        answer: 'b',
        explanation: '错误反馈进上下文是执行循环的核心机制：失败输出是最强反馈（l3），幻觉是 Agent 的常见失效，给自纠机会才是循环的意义。c 丢失信息，d 把幻觉变成误操作，a 放弃了循环的韧性。',
      },
      {
        id: 'cs146s-w4b-l6-e8', type: 'judge', difficulty: 2, relatedLessonId: 'cs146s-w4b-l6', tags: ['U', 'project'],
        question: '工具执行失败（如 run_tests 不通过）应该静默吞掉，避免污染上下文。',
        answer: false,
        explanation: '恰恰相反：失败输出是最有价值的反馈——Agent 不需要你转述就知道哪里错了。静默吞掉等于切断了循环的学习回路，Agent 只能在信息缺失的情况下瞎猜。',
      },
      {
        id: 'cs146s-w4b-l6-e9', type: 'code', difficulty: 4, relatedLessonId: 'cs146s-w4b-l6', tags: ['D', 'project'],
        question: '实现精简执行循环 `run_agent_loop(llm, tools, task, max_rounds)`。约定：history 列表初始只含任务字符串 task；每轮调用 llm(history) 得到 dict——{"type": "tool", "name": str, "args": dict} 或 {"type": "final", "message": str}。tool 且工具名在 tools 中：执行 tools[name](args)，把 "RESULT: " + 返回值追加进 history，trace 追加 "R{轮}: tool:{名}"；工具名不在 tools 中：把 "ERROR: 未知工具: {名}" 追加进 history，trace 追加 "R{轮}: error"；final：trace 追加 "R{轮}: final" 并返回 ("done", 已用轮数, trace)。轮数达到 max_rounds 仍未 final → 返回 ("max_rounds", max_rounds, trace)。轮号从 1 起。',
        lang: 'python',
        starterCode: `def run_agent_loop(llm, tools, task, max_rounds):
    # 每轮: 调 llm -> tool 则执行并回填结果 / final 则返回
    # 用尽 max_rounds -> ("max_rounds", max_rounds, trace)
    pass

TOOLS = {"echo": lambda args: "echo:" + args.get("text", "")}

def scripted(history):
    if len(history) == 1:
        return {"type": "tool", "name": "echo", "args": {"text": "hi"}}
    return {"type": "final", "message": "ok"}

print(run_agent_loop(scripted, TOOLS, "任务", 5))`,
        expectedOutput: `('done', 2, ['R1: tool:echo', 'R2: final'])`,
        tests: `TOOLS = {"echo": lambda args: "echo:" + args.get("text", "")}

def scripted(history):
    if len(history) == 1:
        return {"type": "tool", "name": "echo", "args": {"text": "hi"}}
    return {"type": "final", "message": "ok"}
status, rounds, trace = run_agent_loop(scripted, TOOLS, "任务", 5)
assert status == "done" and rounds == 2
assert trace == ["R1: tool:echo", "R2: final"]

def hallucinating(history):
    if len(history) == 1:
        return {"type": "tool", "name": "delete_db", "args": {}}
    return {"type": "final", "message": "换别的办法"}
status2, rounds2, trace2 = run_agent_loop(hallucinating, TOOLS, "t", 5)
assert status2 == "done" and rounds2 == 2
assert trace2 == ["R1: error", "R2: final"]

def loop_forever(history):
    return {"type": "tool", "name": "echo", "args": {"text": "x"}}
status3, rounds3, trace3 = run_agent_loop(loop_forever, TOOLS, "t", 4)
assert status3 == "max_rounds" and rounds3 == 4 and len(trace3) == 4
assert trace3[0] == "R1: tool:echo"

seen = {}
def recorder(history):
    seen.setdefault("h", []).append(list(history))
    if len(history) == 1:
        return {"type": "tool", "name": "nope", "args": {}}
    return {"type": "final", "message": "x"}
run_agent_loop(recorder, TOOLS, "任务", 5)
assert seen["h"][1][1] == "ERROR: 未知工具: nope", "错误信息确实进了 history"`,
        allowedModules: [],
        explanation: '这个 30 行的循环就是项目 A 的心脏（agent.py 雏形）：final 是唯一正常出口、幻觉错误回填上下文给自纠机会、每轮留 trace。TC2/TC4 的原型全在这里。',
        answer: `def run_agent_loop(llm, tools, task, max_rounds):
    history = [task]
    trace = []
    rounds = 0
    while rounds < max_rounds:
        resp = llm(history)
        rounds += 1
        rtype = resp.get("type")
        if rtype == "final":
            trace.append(f"R{rounds}: final")
            return "done", rounds, trace
        if rtype == "tool":
            name = resp.get("name")
            args = resp.get("args", {})
            if name not in tools:
                history.append(f"ERROR: 未知工具: {name}")
                trace.append(f"R{rounds}: error")
            else:
                result = tools[name](args)
                history.append("RESULT: " + str(result))
                trace.append(f"R{rounds}: tool:{name}")
        else:
            history.append("ERROR: 无法解析的响应")
            trace.append(f"R{rounds}: error")
    return "max_rounds", rounds, trace

TOOLS = {"echo": lambda args: "echo:" + args.get("text", "")}

def scripted(history):
    if len(history) == 1:
        return {"type": "tool", "name": "echo", "args": {"text": "hi"}}
    return {"type": "final", "message": "ok"}

print(run_agent_loop(scripted, TOOLS, "任务", 5))`,
      },
      {
        id: 'cs146s-w4b-l6-e10', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-w4b-l6', tags: ['K', 'project'],
        question: '测试用例对号：脚本永远返回同一工具调用，对应______熔断测试（TC4）；write_file 的 path 含 ..，对应______拒绝测试（TC7）；trace 的末条 action 必须是______（TC9）。',
        blanks: [['死循环', '死循环熔断', 'max_rounds'], ['沙箱', '越界', '路径越界'], ['final', 'FINAL', '结束']],
        explanation: '12 条测试分三组：正常与证据（TC1/9/10/11）、幻觉与越界（TC2/3/7/8）、预算与熔断（TC4/5/6）——写完测试清单等于把本章复习了一遍。',
      },
      {
        id: 'cs146s-w4b-l6-e11', type: 'multiple', difficulty: 3, relatedLessonId: 'cs146s-w4b-l6', tags: ['U', 'project'],
        question: '按 DoD 验收某同学的 mini-agent，下列哪些项判为不通过？',
        options: [
          { value: 'a', text: 'pytest 全绿，但系统测试只有 6 条' },
          { value: 'b', text: '实现里 import 了 requests 用于真实适配层' },
          { value: 'c', text: '轮数预算可配置且有耗尽测试，token 预算写死在代码里' },
          { value: 'd', text: 'trace 每轮都有记录，含被拒绝的调用，末条为 final' },
        ],
        answer: ['a', 'b', 'c'],
        explanation: 'a 违反"≥10 条"；b 违反"纯标准库"（DoD 第 2 条，真实适配层只允许留接口）；c 违反"两种预算都可配置且各有测试"（DoD 第 5 条）。d 正好是 DoD 第 6 条的达标描述。',
      },
      {
        id: 'cs146s-w4b-l6-e12', type: 'code', difficulty: 3, relatedLessonId: 'cs146s-w4b-l6', tags: ['D', 'project'],
        question: '实现 trace 完整性审计 `validate_trace(trace)`：trace 为每轮一条 dict 的列表，每条含 "round"（整数）、"action"（字符串）、"detail"（字符串）。检查规则（问题聚合到同一列表，顺序如下）：①轮号应从 1 开始连续递增，发现第一个不符合期望值的轮号即报 "轮号不连续: 缺少 {期望值}"（整条 trace 只报第一个此类问题）；②每条 action 若不是非空字符串，报 "第 {i} 条 action 为空"（i 为该条在列表中的下标，从 1 起，可多条）；③最后一条的 action 不是 "final"（含空列表情形），报 "末条不是 final"。返回 (ok, problems)：ok 为 problems 是否为空。',
        lang: 'python',
        starterCode: `def validate_trace(trace):
    pass

good = [
    {"round": 1, "action": "tool:read_file", "detail": "读取 src/calc.py"},
    {"round": 2, "action": "tool:write_file", "detail": "修复 subtract"},
    {"round": 3, "action": "final", "detail": "测试全绿"},
]
print(validate_trace(good))

bad = [
    {"round": 1, "action": "tool:read_file", "detail": "x"},
    {"round": 3, "action": "", "detail": "y"},
]
print(validate_trace(bad))`,
        expectedOutput: `(True, [])
(False, ['轮号不连续: 缺少 2', '第 2 条 action 为空', '末条不是 final'])`,
        tests: `good = [
    {"round": 1, "action": "tool:read_file", "detail": "a"},
    {"round": 2, "action": "final", "detail": "b"},
]
assert validate_trace(good) == (True, [])
bad1 = [{"round": 2, "action": "final", "detail": "x"}]
assert validate_trace(bad1) == (False, ["轮号不连续: 缺少 1"])
bad2 = [
    {"round": 1, "action": "tool:read_file", "detail": "a"},
    {"round": 2, "action": "", "detail": "b"},
    {"round": 3, "action": "tool:echo", "detail": "c"},
]
ok, problems = validate_trace(bad2)
assert ok is False
assert "第 2 条 action 为空" in problems and "末条不是 final" in problems
assert validate_trace([]) == (False, ["末条不是 final"])`,
        allowedModules: [],
        explanation: 'trace 完整性是 l5"验收要证据"的机器化：轮号连续证明无丢轮，末条 final 证明循环正常收敛。这个函数就是 TC9 的断言实现。',
        answer: `def validate_trace(trace):
    problems = []
    for idx, entry in enumerate(trace):
        expected = idx + 1
        if entry.get("round") != expected:
            problems.append(f"轮号不连续: 缺少 {expected}")
            break
    for idx, entry in enumerate(trace):
        action = entry.get("action")
        if not isinstance(action, str) or not action:
            problems.append(f"第 {idx + 1} 条 action 为空")
    if not trace or trace[-1].get("action") != "final":
        problems.append("末条不是 final")
    return len(problems) == 0, problems

good = [
    {"round": 1, "action": "tool:read_file", "detail": "读取 src/calc.py"},
    {"round": 2, "action": "tool:write_file", "detail": "修复 subtract"},
    {"round": 3, "action": "final", "detail": "测试全绿"},
]
print(validate_trace(good))

bad = [
    {"round": 1, "action": "tool:read_file", "detail": "x"},
    {"round": 3, "action": "", "detail": "y"},
]
print(validate_trace(bad))`,
      },
      {
        id: 'cs146s-w4b-l6-e13', type: 'open', difficulty: 4, relatedLessonId: 'cs146s-w4b-l6', tags: ['D', 'project'],
        question: '为项目 A 写两段 FakeLLM 任务脚本（用模块二的 dict 列表协议）：① 正常完成路径——修复一个把参数相加当减法用的 subtract 函数（read → write → run_tests → final，写出每步的完整 dict）；② 死循环路径——永远返回同一工具调用的脚本说明（FakeLLM 如何构造，预期循环如何终止）。并回答：max_rounds 与 token_cap 两个参数你怎么定？给出定值理由与"定错了会怎样"的两个方向。',
        referenceAnswer: `① 正常完成脚本（dict 列表协议）：

[
  {"type": "tool", "name": "read_file",
   "args": {"path": "src/calc.py"}},
  {"type": "tool", "name": "write_file",
   "args": {"path": "src/calc.py",
            "content": "def subtract(a, b):\\n    return a - b\\n"}},
  {"type": "tool", "name": "run_tests",
   "args": {"target": "tests/test_calc.py"}},
  {"type": "final", "message": "subtract 已修复, 测试 1/1 通过"}
]

要点：read 在 write 之前（感知先行）；write 的 content 是完整文件而非补丁（工具协议简单化）；run_tests 紧随 write（改完即验铁律）；final 只在测试 PASSED 之后出现（绿了就停）。TC1 即用此脚本断言：status=done、trace 4 轮、VFS 更新、末条 final。

② 死循环路径：
FakeLLM 构造：脚本只有一个条目且耗尽兜底关闭，或直接 def llm(history): return {"type": "tool", "name": "echo", "args": {"text": "x"}}（无视 history 永远返回同一工具调用）。预期：每轮执行 echo 并回填 RESULT，轮数递增到 max_rounds 后循环顶部/底部检查触发，返回 ("max_rounds", max_rounds, trace)，trace 长度 = max_rounds。TC4 断言 status=max_rounds。

③ 预算定值论证：
- max_rounds = 8（默认）：依据是同类任务的历史轮数分布——TC1 正常路径 4 轮，留 2 倍余量；定小了（如 3）正常任务被误杀（TC5 类误报），定大了（如 100）死循环每轮都在烧 token 才被拦。
- token_cap = 4000：本任务三轮工具往返的内容量约数百 token，4 倍余量覆盖脚本膨胀；定小了第二轮就熔断（TC6 类误报），定大了预算失去意义。
- 两个方向的错误代价不对称：定小 → 正常任务失败（假阳性，浪费一次人工介入）；定大 → 失控任务烧钱才停（真金白银）。所以估 token 宁高勿低，轮数宁紧勿松——宁可多一次人工重启，不可多烧一段失控调用。`,
        rubric: [
          { point: '正常脚本四步完整且顺序正确（感知 → 修改 → 验证 → 收工）', score: 3 },
          { point: '死循环构造说明清楚且预期终止行为与 trace 长度断言一致', score: 3 },
          { point: '两个预算参数给出定值理由（基于历史分布与余量）', score: 3 },
          { point: '指出定错的两个方向且说明代价不对称（宁高勿低的原则）', score: 2 },
        ],
        keywords: ['FakeLLM', '脚本协议', 'max_rounds', 'token', '改完即验'],
        explanation: '判卷看"顺序意识"：read→write→run_tests→final 的顺序不是仪式——每一步都是下一米的依据（感知先行、改完即验、绿了就停），乱序脚本直接判低。',
      },
      {
        id: 'cs146s-w4b-l6-e14', type: 'open', difficulty: 5, relatedLessonId: 'cs146s-w4b-l6', tags: ['D', 'project'],
        question: '从四个拓展方向中选一个：接真实 API / 接项目 C 的 MCP 工具源 / 子代理拆分（连 l4）/ 把验收任务换成项目 B 的仓库。写出改造方案：① 新增或改动的模块与接口（画出新的职责边界）；② 协议与数据流的变化；③ 新增的三类风险与各自的对策（对照 l5 红线与 l1 决策矩阵给出该拓展的自治级别建议）；④ 新增的至少 2 条测试用例。',
        referenceAnswer: `以"接项目 C 的 MCP 工具源"为例（其余方向的要点附后）：

① 模块与接口：tools.py 的工具注册抽象为 ToolSource 协议（list_tools() -> [ToolDef]、call(name, args) -> str）；新增 mcp_source.py 实现 McpToolSource——通过 stdio 子进程连接 w2 项目 C 的 MCP server，做 initialize 握手、tools/list 发现、tools/call 调用。agent.py 不感知来源差异（依旧只认白名单与 ToolSource 接口）；tools.py 保留本地沙箱层：MCP 工具若涉及路径参数，仍在本地先过 resolve_path。职责边界：MCP 负责"有什么工具"，本地沙箱负责"什么可以碰"。

② 协议与数据流变化：启动时 list_tools 动态生成白名单（取代写死的 ALLOWED_TOOLS）；每轮工具调用从"本地函数调用"变为"MCP 请求-响应（JSON-RPC over stdio）"；trace 的 action 记为 mcp:{server}:{tool}，detail 记录请求 id 以便对账；新增连接失败路径（server 未响应 → 结构化错误进上下文，循环可继续）。

③ 新增风险与对策：
- 注入面扩大（工具描述与返回内容来自外部 server）：工具描述进系统提示前经人审；返回内容视为不可信数据（Week 6 威胁模型）——对策：返回内容截断 + 不允许其内嵌指令改变循环行为；
- 凭据与越权（MCP server 可能持有更广的文件权限）：本地沙箱层在调用前再做一次参数路径检查（双闸）；server 进程以最小权限用户运行；
- 可用性与预算（远程调用慢且可能挂起）：call 设超时，超时按工具失败回填错误进上下文；MCP 往返计入 token/时间预算——自治级别建议：该拓展整体定为 L2（每次工具调用经人审 diff 样例抽查），通过率数据（l5）达标后才讨论 L3；凭据类工具永远 L0。

④ 新增测试：T1——McpToolSource 对 FakeServer（内嵌 stdio 假进程）的 list_tools 返回与白名单同步；T2——server 返回包含"指令样文本"的工具结果时，循环把它当数据回填、不执行其中指令（注入回归测试）；T3——server 挂起超时时错误进上下文且循环继续。

其他方向要点：接真实 API——新增适配层实现与成本统计，风险是费用失控（token 预算必须真实化）与数据外泄（脱敏后再出网），级别 L2；子代理拆分——agent.py 增加 orchestrator 模式，复用 l4 的 audit_relay 对账，风险是重复劳动与责任真空（对账与 AC owner 机制），级别 L2-L3；接项目 B 仓库——任务卡指向真实仓库，验收对账项目 B 的验收脚本，风险是禁区触碰（git diff 核验）与基线破坏（回归断言），级别 L2。`,
        rubric: [
          { point: '模块与接口变化具体（ToolSource 协议/适配层/orchestrator），职责边界清晰', score: 3 },
          { point: '协议与数据流变化写清（白名单来源、trace 格式、失败路径）', score: 3 },
          { point: '三类风险与对策对应 l5 红线/l1 矩阵，且有自治级别建议', score: 3 },
          { point: '新增测试 ≥2 条且覆盖注入/超时/白名单同步等拓展特有路径', score: 2 },
          { point: '方案体现"本地沙箱保留"等纵深防御意识', score: 2 },
        ],
        keywords: ['ToolSource', 'MCP', '沙箱', '注入', '白名单'],
        explanation: '判卷核心是"边界感"：好的拓展方案在引入新能力的同时保留旧闸门（本地沙箱、预算、trace），并能为新风险给出对应本章概念（红线/矩阵/校准）的对策——这正是"造过轮子的人"的验收判断力。',
      },
    ],
  },
];
