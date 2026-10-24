import type { Chapter } from '../../../types';

/* ============================================================
 *  CS146S Fall 2026 · Week 5：现代终端与 Agent 自动化
 *
 *  结构依据：Stanford CS146S Fall 2026 官方大纲（themodernsoftware.dev，
 *  官方作业仓库 mihail911/modern-software-dev-assignments）。
 *  本课程为参照官方大纲组织的自学教材，讲义内容为自主扩展编写。
 *
 *  来源：
 *  - 官方：CS146S 课程站 Week 5 主题（The Modern Terminal：AI 增强的
 *    CLI、终端自动化与脚本化；嘉宾讲座：Zach Lloyd，Warp CEO）
 *  - 官方作业：week5 agentic dev task（用 Warp 完成 agentic 开发任务，
 *    仅作主题锚点；本文件练习与案例均为自主设计）
 *  - 工程参考：Warp 官方文档/博客、Anthropic Claude Code 文档（交互模式
 *    与 headless 模式）、OpenAI Codex CLI 文档、MIT《The Missing Semester》、
 *    GNU Coreutils / Bash 官方手册
 *  - 原创：框架、案例、图示、全部习题与 demo
 * ============================================================ */

export const cs146sW5Chapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'cs146s-w5',
    title: 'Week 5 · 现代终端与 Agent 自动化',
    goal: '把终端从"命令的墓地"变成 Agent 时代的驾驶舱：理解 CLI 在 Agent 工作流中不可替代的地位（可组合/可脚本化/可审计/纯文本友好），掌握管道、幂等与错误处理的脚本化基本功，会用 headless 模式把 Agent 当 Unix 工具编排成无人值守任务，并能安全地配置权限、沙箱与退出码协议。',
    lessons: [
      /* ─────────────────────────── l1 ─────────────────────────── */
      {
        id: 'cs146s-w5-l1',
        title: '终端为什么还没死：AI 时代的 CLI 复兴',
        difficulty: 2,
        content: `
### 学习目标

学完本节，你应该能够：
1. 说出 CLI 在 Agent 工作流中不可替代的四个特性（可组合、可脚本化、可审计、纯文本对模型友好），并用它们解释"为什么所有主流 Coding Agent 都以终端为一等入口"；
2. 区分三代终端形态（传统终端、AI 增强终端、Agent CLI）的工作单元差异——命令、命令+意图、意图+委托——并为给定场景选择合适形态；
3. 用"GUI 与 CLI 分工矩阵"为具体任务选择界面并说明依据，同时指出哪些任务永远不该交给终端。

### 前置知识

- w1-l1 的三角框架（意图—上下文—验证）：终端是"执行与验证"两环的原生场地；
- w2 的 Agent 循环与工具调用：本节反复用到"Agent 的工具调用本质上就是执行命令"这一事实；
- 用过任意命令行（cd、ls、git 任意三条命令即可）——本节不要求 shell 功底，l2 才开始系统训练。

### 问题背景

"终端已死"的预言至少喊了二十年：GUI 一代接一代更漂亮，命令行始终被当作"老古董"。但 2025 年之后发生了一件反直觉的事：**最古老的界面成了 Agent 时代增长最快的入口**。Claude Code、Codex CLI、Gemini CLI 全部选择终端作为首选形态；Warp 把 Agent Mode 做成了终端的核心卖点（官方 Week 5 的嘉宾正是 Warp CEO Zach Lloyd）。

为什么？不是怀旧，是机制。图形界面是为人眼设计的：图标要看得见、按钮要点得到、布局要好看。而 Agent 的"感官"是文本输入输出——它读不出像素布局的语义，却能完美读写一行行文本。更关键的是失败路径：让 Agent 操作 GUI，每一步都要"找元素—点元素—验证结果"，元素一变（按钮挪了位置）就全盘失灵，且整个过程难以记录、难以重放。本节讲清楚：终端凭什么复兴，三代终端形态各解决什么问题，以及什么任务仍然属于 GUI。

### 直觉理解

把两种界面想成两种"码头"：

- **GUI 是精品店**：每家店自己设计货架（界面元素），顾客（人）用眼睛逛。体验好，但每家店布局不同——外人（程序）想自动化地"逛"，得逐店重新学路线，店一装修就迷路。
- **CLI 是标准化集装箱码头**：所有货物都是同一种规格（文本流），所有装卸设备都遵守同一套协议（stdin/stdout/exit code）。任何货物能进任何设备，设备之间能串成流水线。Agent 这只"机械臂"不需要重新学习就能操作整个码头。

所以"Agent 长在终端里"不是审美选择，是**接口协议的选择**：文本进、文本出、状态码回传——这正是 Agent 感知与执行需要的全部。

### 核心概念与原理详解

## CLI 的四个超能力

| 特性 | 含义 | 对 Agent 的价值 |
| --- | --- | --- |
| 可组合 | 小工具经管道自由拼装，无需为新需求写新程序 | Agent 用十几个原语就能组合出无穷工作流 |
| 可脚本化 | 命令序列可存进文件反复执行 | Agent 的方案可以固化成资产（l4 展开） |
| 可审计 | 命令与输出天然是文本日志 | "谁在何时执行了什么"可完整回放（l4/l5） |
| 纯文本对模型友好 | LLM 的母语就是 token 序列 | 无需截图理解、无需坐标点击，读写零损耗 |

第四条最容易被低估。让模型理解一张截图要付出"视觉编码 + 可能误读"的代价；而一行 \`ls -la\` 的输出对模型是完全无损的信息。**文本是人与模型之间损耗最低的接口**——这是整个 Week 5 的第一性原理。

## 三代终端形态

| 形态 | 代表 | 谁打字 | 工作单元 | 适合 |
| --- | --- | --- | --- | --- |
| 传统终端 | bash/zsh + iTerm / Windows Terminal | 人 | 命令 | 精确控制、服务器环境 |
| AI 增强终端 | Warp（Agent Mode / Workflows） | 人说意图，终端生成/补全命令 | 命令 + 意图 | 高频终端用户提效 |
| Agent CLI | Claude Code / Codex CLI | Agent 执行，人审核 | 意图 + 委托 | 多步任务、跨文件改动 |

三代不是替代关系，而是**工作单元逐级上移**：从"记住命令"到"说出意图"再到"委托并验收"。传统终端并没有消失——它作为 Agent CLI 的执行层，依然存在于每一次工具调用里。

## 终端即 Agent 入口

回顾 w2 的 Agent 循环四阶段，看终端如何原生满足每一个：

| Agent 需要什么 | 终端如何供给 |
| --- | --- |
| 行动（改变世界） | 执行命令：改文件、跑测试、装依赖 |
| 观察（读结果） | stdout/stderr 全是文本，直接进上下文 |
| 验证（判断成败） | exit code 是最便宜的机器可判信号 |
| 记录（复盘审计） | 命令历史与输出天然留痕 |

GUI 一样都给不齐：行动要靠点击模拟、观察要靠读屏、验证没有协议、审计要另装录屏工具。**Agent 厂商不是没想过做 GUI——是终端在协议层完胜。**

## GUI 与 CLI 分工矩阵

| 任务类型 | 推荐 | 理由 |
| --- | --- | --- |
| 视觉设计、布局调整 | GUI | 空间与美学判断需要眼睛 |
| 批量文件操作、文本处理 | CLI | 组合性碾压手工 |
| 探索陌生代码库 | CLI + Agent | 检索/全文搜索 + 汇总 |
| 向他人演示产品 | GUI | 沟通需要可视化 |
| 定时重复任务 | CLI（脚本化） | 可无人值守（l3） |
| 紧急线上排障 | CLI + Agent | 服务器往往只有终端 |

注意最后一行的隐藏信息：**服务器世界本质上就是一个巨大的终端**——w9 讲运维时你会回到这个事实。

### 完整案例

任务：找出仓库中最大的 5 个文件并解释它们是什么。看三代终端如何完成（完整会话见下方演示）：

1. **传统终端**：你需要知道 du、sort、head 的存在并记住参数：\`du -ah . | sort -rh | head -6\`。30 秒完成——前提是你背过这些；
2. **AI 增强终端**：输入"找出最大的 5 个文件"，终端生成同一条命令供你确认执行。知识门槛降为 0，但**执行与验证仍在你手上**；
3. **Agent CLI**：一句"找出仓库中最大的 5 个文件，解释各是什么"，Agent 自己执行命令、读输出、汇报"bundle.js 是构建产物，建议加进 .gitignore"。

**为什么这样做（自解释提示）**：注意三代形态里**命令是同一条**——CLI 的可组合性没变，变的是"谁来组装"。第三种形态的最大增益不是快，而是它把"知道有哪些工具"这条隐性知识从人身上卸了下来。同时风险也同步上移：Agent 替你执行时，\`rm\` 与 \`ls\` 的按键成本一样是零——l5 专门处理这个问题。

### 代码实践

下方两个演示：一个 text 会话对比三代形态；一个 python 模拟"四个小工具任意组合"——体会可组合性：新需求不需要新程序，只需要新的组合方式。

### 常见误区与安全风险

- **误区一："GUI 会死，一切皆 CLI。"** 分工矩阵里至少有两类任务 GUI 更优。终端复兴不等于终端霸权——复兴的是"文本协议"，不是"字符界面美学"。
- **误区二："AI 终端就是补全做得更好。"** 块结构（block）把会话拆成可复制的执行单元、Agent Mode 把工作单元从命令换成意图——改变的是交互粒度与人机分工，不只是联想能力。
- **误区三："Agent 在终端里跑就行，不用管权限。"** 终端把破坏成本降到零：\`rm -rf\` 与 \`ls\` 对 Agent 是同样的 keystroke。w4 的自治等级与 l5 的安全边界是终端自动化的前提件，不是可选件。
- **安全提示**：终端是持久化攻击面的高发地——shell 配置文件（.bashrc/.zshrc）里的恶意别名、被篡改的 PATH、历史记录里的敏感信息都是真实攻击向量。别把 AI 生成的"环境配置命令"不加审查地贴进 shell 配置。

### 知识关联：承上启下

- 承上：w1-l1 三角框架（终端是执行+验证的原生场）、w2 工具调用（Agent CLI 的每次工具调用就是一次命令执行）、w4 自治等级（终端是 L2-L4 的操作台）；
- 启下：l2 把"会打命令"升级为"会写可靠脚本"；l3 把脚本升级为无人值守的 headless 编排；l4 把跑通的工作流固化为可审计资产；l5 给整个终端自动化划安全边界；w9 运维周将回到"服务器即终端"。

### 动手实验

1. 运行下方"组合性"演示，把 grep 的过滤词换两次，观察"换需求不换工具"；
2. 用分工矩阵审计你昨天的工作：找出 1 个"你在 GUI 里手工重复"而矩阵建议 CLI 的任务，明天试一次终端做法；
3. 如果你装了任意一款 AI 终端或 Agent CLI，把同一个任务分别用三种形态做一遍，记录三种形态下你的真实耗时与心智负担。

### 本节总结

1. CLI 复兴的机制：可组合、可脚本化、可审计、纯文本对模型友好——四条全是 Agent 的刚需；
2. 三代终端是工作单元上移：命令 → 命令+意图 → 意图+委托；传统终端作为执行层永续存在；
3. 终端原生满足 Agent 循环的行动/观察/验证/记录四需求，GUI 在协议层完败；
4. 分工矩阵：视觉与演示归 GUI，批量与无人值守归 CLI，服务器世界本质是终端；
5. 终端把执行成本降到零的同时也把破坏成本降到零——权限与安全边界（l5）是前提件。

### 参考资料与延伸阅读

- [Warp 官方文档](https://docs.warp.dev)（Agent Mode、Workflows、Block 概念）——AI 增强终端形态：对应"三代终端"模块；
- [Anthropic Claude Code 文档](https://docs.anthropic.com/en/docs/claude-code/overview)（CLI 概览与交互模式）——Agent CLI 形态：对应"终端即 Agent 入口"模块；
- [OpenAI Codex CLI 官方仓库](https://github.com/openai/codex)——Agent CLI 的另一种形态：对应"三代终端"模块；
- MIT《The Missing Semester of Your CS Education》Lecture 1-2（Shell 工具与脚本）——对应"四个超能力"模块，并为 l2 预热；
- [GNU Coreutils 手册](https://www.gnu.org/software/coreutils/manual/)——"每个工具只做一件事"的设计哲学：对应"可组合"；
- 官方 Week 5 作业（用 Warp 完成 agentic dev task）——仅作主题锚点；本节的分工矩阵与三代形态对比为自主设计。

### 本节习题导引

fill/single 题校准三代形态与四个超能力；multiple 题训练分工矩阵；open 题要求你把分工矩阵用到自己的真实任务上。做完本节再进入 l2。
`,
        tips: [
          { kind: 'note', text: '给每个常用项目建一份"终端工作流清单"（你最常敲的 5 条命令）：它是 l2 脚本化与 l4 固化的原材料。' },
          { kind: 'pitfall', text: '不要把 AI 生成的"环境配置命令"直接贴进 .bashrc/.zshrc——shell 配置是持久化攻击面，一行恶意 alias 能存活数年。' },
          { kind: 'interview', text: '"为什么 Claude Code/Codex 都先做 CLI 不做 GUI？"——用四个超能力答：文本无损、可组合、可脚本、可审计；GUI 四件不齐。' },
          { kind: 'performance', text: '工作单元上移一级（命令→意图），单任务耗时通常降一个量级；但验收责任同步上移——省下的时间要花在读 diff 上。' },
        ],
        demos: [
          {
            title: '三代终端形态：同一任务的会话对比（text）',
            lang: 'text',
            code: `任务: 找出仓库中最大的 5 个文件并解释它们是什么

【传统终端 · 人打字】
$ du -ah . | sort -rh | head -6
(人需要知道 du/sort/head 存在并记住参数; 输出是纯文本块)

【AI 增强终端 · 人说意图, 终端生成命令】
> "找出最大的 5 个文件"
Warp: 建议命令  du -ah . | sort -rh | head -6   [执行] [编辑]
(知识门槛归零; 但执行与验证仍在人手上)

【Agent CLI · 人下委托, Agent 执行】
$ claude "找出仓库中最大的 5 个文件, 解释各是什么"
Agent: 运行 du -ah . | sort -rh | head -6
       -> 1.2M  build/bundle.js   (构建产物, 建议加入 .gitignore)
       -> 0.8M  assets/hero.png   (首屏大图, 可压缩)
(人从"操作员"变成"验收者"; 命令与输出仍是纯文本, 可审计)

# 读法: 三代形态里命令是同一条 —— 变的不是 CLI, 是"谁来组装"。`,
          },
          {
            title: '组合性模拟：四个小工具任意组合',
            lang: 'python',
            code: `# 可组合性: 4 个小工具, 任意组合 —— 新需求不需要新程序
def ls_sim(path):
    """模拟 ls: 返回目录清单文本"""
    return "user.py\\nREADME.md\\ncart.py\\nnotes.tmp\\nauth/\\n"

def grep(stdin, pattern):
    return "".join(l + "\\n" for l in stdin.splitlines() if pattern in l)

def sort_lines(stdin):
    return "\\n".join(sorted(stdin.splitlines()))

def wc_l(stdin):
    return str(len(stdin.splitlines()))

listing = ls_sim("src/")
print("全部文件:", listing.split())
py = grep(listing, ".py")
print("py 文件:", py.split())
print("py 文件数:", wc_l(py))
print("排序后:", sort_lines(py).split())

# 观察点: 换需求只换组合方式(ls|grep|wc / ls|grep|sort), 工具一行不改
# 这就是 CLI 的可组合 —— Agent 用十几个原语能组合出无穷工作流`,
          },
        ],
      },

      /* ─────────────────────────── l2 ─────────────────────────── */
      {
        id: 'cs146s-w5-l2',
        title: 'Shell 自动化的基本功：从管道到幂等脚本',
        difficulty: 3,
        content: `
### 学习目标

学完本节，你应该能够：
1. 用 stdin/stdout/exit code 三协议拆解任意管道命令：指出数据怎么流、状态怎么传，并预测整条管道的退出码（含 pipefail 前后差异）；
2. 识别脚本中的非幂等操作，用"mkdir -p 思维、临时文件+原子替换、锁"三种手段把它改造成重跑安全的幂等脚本；
3. 为脚本配齐 set -euo pipefail 与 trap 清理、实现"人类可读 + --json"双模式输出，并对 AI 生成的脚本执行"语法检查→静态分析→dry-run→小数据试跑"的验证流程。

### 前置知识

- l1 的三协议概念（本节展开为可操作的工程细节）；
- w3-l3 的"机器可判"标准：exit code 是最便宜的自动断言；
- 不需要系统学过 bash——本节自足地给出所需语法。

### 问题背景

手打命令是一次性资产：上周解决"构建产物清理"的那串命令，这周要么重想、要么重错。脚本化的第一步总会撞上四个经典坑：脚本跑一半失败留下半成品状态（非幂等）；中间步骤失败了后面的照跑（无 set -e）；成功无声失败也无声（无日志）；数据和人读的日志混在一个输出里，下游没法解析（无输出契约）。

AI 把这四个坑全部放大：Agent 一分钟能生成十个脚本，每个都可能被直接投进 cron 无人值守运行（l3）。**脚本质量从"个人手艺"变成了"系统风险"**——这就是为什么官方 Week 5 把"终端自动化与脚本化"设为独立主题。

### 直觉理解

**管道是流水线，exit code 是每个工位的质量检查员。** 数据沿传送带（stdin→stdout）流动，每个工位完工时给检查员一个手势：0 = "合格，传下去"，非 0 = "我这里坏了"。问题在于：默认情况下流水线只看**最后一个**工位的手势——中间工位全坏了，只要最后一环说"合格"，整条线照样报平安。set -o pipefail 就是"任何一个工位坏了整条线都算坏"的联动刹车。

**幂等脚本是自动售货机，非幂等脚本是手雷。** 售货机按 100 次出 100 次货，状态不累积；手雷拉一次响一次，第二次就没得拉了。"mkdir -p 思维"就是售货机思维：目录已存在？那就当成功。临时文件+原子替换：先在旁边把货备好，一秒内换上——顾客永远看不到"半成的货"。

### 核心概念与原理详解

## 三协议：数据走管道，状态走出口

\`\`\`text
数据通道:  stdin ──> [ 命令A ] ──stdout──> [ 命令B ] ──stdout──> 终端/文件
状态通道:  每个命令独立返回 exit code(0=成功, 非0=失败) —— 不进管道
\`\`\`

| 协议 | 方向 | 内容 | 工程约定 |
| --- | --- | --- | --- |
| stdin | 进 | 上游的数据 | 不要交互式提问（无人值守会卡死） |
| stdout | 出 | 正式产物（给下游消费） | 只放数据，别混日志 |
| stderr | 出 | 日志/报错（给人看） | 与 stdout 分流 |
| exit code | 状态 | 0 成功 / 非 0 失败 | 下游据此决定走还是停 |

整条管道的退出码默认 = **最后一环**的退出码——这就是中间失败被吞掉的机制根源；\`set -o pipefail\` 把它改为"任一环非 0 即非 0"。

## 幂等性设计：重跑安全的三个手段

| 手段 | 解决什么 | 示例 |
| --- | --- | --- |
| mkdir -p 思维 | "已存在"当成功而非报错 | \`mkdir -p out/\`、\`pip install -r req.txt\`（已装即满足） |
| 临时文件 + 原子替换 | 写一半崩溃不留半成品 | 先写 \`out.tmp\`，成功后 \`mv\` 盖掉正式文件 |
| 锁 | 两个实例并发互踩 | 启动前检查锁文件/端口，拿不到锁就退出 |

天然幂等的操作：读、创建-if-missing、按固定名覆盖写。天然不幂等：追加（重跑重复追加）、外发动作（重复发邮件/重复付款）——外发类要用"票据"去重（先记下"已发过"，重跑时跳过）。

## 错误处理三件套

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail
# -e 出错即停; -u 未定义变量报错; pipefail 管道任一环失败即失败
trap 'echo "[cleanup] 删除半成品" >&2; rm -f out.tmp' EXIT
\`\`\`

必须知道 set -e 的三个盲区：管道中段（要 pipefail 补）、if 条件与 && 右侧的命令（失败是"预期内"，不触发 -e）、命令替换内部。**盲区清单比"记得写 set -e"更重要**——它决定你敢不敢信任一个"有 set -e"的脚本。

## 双模式输出：--json 的设计理由

\`\`\`bash
./backup.sh            # 人类模式: 进度、表格、友情提示
./backup.sh --json     # 机器模式: 一行一个 JSON 事件, schema 稳定, 给下游程序消费
\`\`\`

为什么值得专门设计：项目 B 的自动验收脚本要消费构建脚本的输出——从人看的表格里抠字段是灾难，\`--json\` 让验收变成稳定的解析。三条规则：**数据走 stdout，日志走 stderr，--json 只改 stdout 的格式不改语义**。

## AI 生成脚本的验证四步

1. \`bash -n script.sh\`——语法检查，1 秒；
2. shellcheck——静态分析，能抓住未引用变量、set -e 盲区这类高频 bug；
3. **dry-run**——脚本带 \`--dry-run\`（AI 生成时就要求带），打印将执行的动作而不执行；
4. 小数据试跑——用一份拷贝的测试目录跑全流程，确认副作用范围。

AI 生成让"写脚本"的成本趋近于零，但**验证成本一分没降**——这四步是新时代的必修动作。

### 完整案例

任务：每日数据库备份脚本。看 v0 如何被逐步改造成 v1（每步的"为什么"自解释）。

**v0（问题浓缩版，即将投进每晚 cron）**：

\`\`\`bash
#!/usr/bin/env bash
mysqldump app > app.sql
gzip app.sql
cp app.sql.gz /var/backups/app-$(date +%F).sql.gz
echo "备份完成"
\`\`\`

缺陷清单：① 非幂等——cp 目标已存在时交互询问（部分环境 gzip 亦然），无人值守直接卡死；② 无 set -e——mysqldump 失败（比如密码过期）后 gzip 照跑，把空文件压了一遍还打印"备份完成"；③ 失败无声——没有退出码区分、没有 stderr 告警，凌晨 3 点没人看输出；④ 无 dry-run——想验证只能真跑。

**v1（改造后）**：

\`\`\`bash
#!/usr/bin/env bash
# 用途: 每日备份数据库并上传; 用法: DRY_RUN=1 ./backup.sh 预演
set -euo pipefail
OUT="/var/backups/app-$(date +%F).sql.gz"
TMP="app.sql.gz.tmp"
trap 'rm -f "$TMP"' EXIT                       # 退出前清理半成品
if [ "\${DRY_RUN:-0}" = "1" ]; then            # dry-run: 打印计划, 不产生副作用
  echo "[dry-run] 将执行: mysqldump | gzip -> $OUT 并上传"
  exit 0
fi
mkdir -p /var/backups                          # 幂等: 存在即成功
mysqldump app | gzip > "$TMP"                  # pipefail: 任一环失败即停
mv "$TMP" "$OUT"                               # 原子替换: 不留半成品
curl -sf --upload-file "$OUT" https://backup.internal/app/ || { echo "[alert] 上传失败" >&2; exit 1; }
echo "backup_ok: $OUT"
\`\`\`

**自解释提示**：为什么 gzip 的输出直接进临时文件而不是先落盘再压？——少一次非幂等的落盘；为什么上传失败要 exit 1 而不是只打日志？——退出码是 l3 的 cron 与告警系统能消费的唯一信号。v1 的每一行都在为"无人值守"做准备。

### 代码实践

下方"迷你管道执行器"用 python 模拟 shell 管道的内核机制：命令注册表、stdout 传递、exit code 传播（stop-on-error）、dry-run。跑通后完成本节 code 习题——把它改写成函数版。

### 常见误区与安全风险

- **误区一："跑过一次成功就是对的。"** 幂等性要用"连续跑两遍"来验证——第二遍还成功且结果一致才叫幂等。
- **误区二："写了 set -e 就安全了。"** 三个盲区（管道中段/if 条件/命令替换）一个不补，"安全"是错觉。
- **误区三："print 一下就是日志。"** 数据与日志混流会毁掉下游解析；输出格式要稳定到能写单元测试。
- **安全提示**：脚本中的明文凭据会随 git 进历史；未引用的变量（\`$DIR\` 没加双引号）在含空格路径上会词分裂成多条路径；\`eval\` 与未消毒的 AI 生成内容组合等于任意代码执行——l5 把它展开为完整的命令审查方案。

### 知识关联：承上启下

- 承上：l1 的三协议概念、w3-l3 的机器可判（exit code 即最便宜的 AC）、w2 的工具设计（错误要可观察）；
- 启下：l3 把"脚本"升级为"headless Agent 调用"——三协议与退出码原样沿用；l4 的脚本头部协议建立在双模式输出之上；l5 处理 eval/注入/凭据；项目 B 的验收脚本与项目 A 的 agent loop 都直接使用本节模式。

### 动手实验

1. 运行下方迷你管道执行器：把 spec 换成含 boom 的管道，观察 stop-on-error；再开 dry_run 看执行计划；
2. 给你手头任何一个脚本补上"四件套"：set -euo pipefail、trap、--dry-run、--json（哪怕只有 10 行）；
3. 用 bash -n 与 shellcheck 检查一个 AI 生成的旧脚本，数数抓出几个盲区。

### 本节总结

1. 三协议：数据走 stdin/stdout，状态走 exit code；管道默认只看最后一环，pipefail 修这个盲区；
2. 幂等三手段：mkdir -p 思维、临时文件+原子替换、锁；外发类动作要票据去重；
3. 错误三件套 set -euo pipefail + trap；set -e 有三个必须记住的盲区；
4. 双模式输出：数据 stdout / 日志 stderr，--json 给机器——自动化脚本的第一契约；
5. AI 生成脚本必须过四步验证：bash -n → shellcheck → dry-run → 小数据试跑。

### 参考资料与延伸阅读

- [Bash 参考手册](https://www.gnu.org/software/bash/manual/)（set/trap/管道章节）——对应"错误处理三件套"模块；
- MIT《The Missing Semester of Your CS Education》Lecture 2（Shell Tools and Scripting）——对应"三协议"与"幂等设计"模块；
- [ShellCheck 官网](https://www.shellcheck.net)——对应"AI 生成脚本验证四步"模块；
- [GNU Coreutils 手册](https://www.gnu.org/software/coreutils/manual/)——mkdir -p 等"存在即成功"的语义依据：对应"幂等性设计"；
- Anthropic《Claude Code 最佳实践》——AI 生成脚本的工作流与安全建议：对应"验证四步"；
- 官方 Week 5 作业仅作主题锚点；备份脚本案例、迷你管道执行器为自主设计。

### 本节习题导引

fill 题默写三协议与幂等手段；single 题辨析 set -e 盲区与 pipefail；code 题实现管道执行器的函数版；open 题给 v0 备份脚本做完整诊断与改造。
`,
        tips: [
          { kind: 'pitfall', text: 'set -e 的三个盲区（管道中段/if 条件/命令替换）不补齐，"有 set -e"就是错觉——信任一个脚本前先看它有没有 pipefail。' },
          { kind: 'performance', text: '幂等性验收法：连续跑两遍。第二遍还能成功且结果一致，才敢进 cron。' },
          { kind: 'note', text: '写脚本先写头部协议四行（用途/用法/副作用/回滚）再写代码——它逼你想清楚副作用；让 AI 生成时把这四行写进提示词。' },
          { kind: 'interview', text: '"--json 双模式为什么值得专门设计？"——消费者不同：人要可读性，机器要稳定 schema；数据走 stdout、日志走 stderr。这是自动化工程师的基本功。' },
        ],
        demos: [
          {
            title: '迷你管道执行器：注册表 + 管道 + exit code + dry-run',
            lang: 'python',
            code: `# 迷你管道执行器: 命令注册表 + 管道传递 + exit code 传播 + dry-run
REGISTRY = {
    # 每个命令: fn(args, stdin) -> (exit_code, stdout)
    "fetch": lambda a, s: (0, "banana,avocado,cherry\\n"),
    "split": lambda a, s: (0, s.replace(",", "\\n")),
    "grep":  lambda a, s: (0, "".join(l + "\\n" for l in s.splitlines() if a[0] in l)),
    "count": lambda a, s: (0, str(len(s.splitlines())) + " lines\\n"),
    "boom":  lambda a, s: (1, "partial output\\n"),
}

def run_pipeline(spec, dry_run=False, stop_on_error=True):
    """spec 形如 "fetch | split | grep an | count"。返回 (最终 stdout, 退出码)。"""
    steps = [t.strip() for t in spec.split("|")]
    if dry_run:                              # dry-run: 打印执行计划, 不产生副作用
        print("[dry-run] 将执行:")
        for i, t in enumerate(steps, 1):
            print(f"  {i}. {t}")
        return "", 0
    data, code = "", 0
    for i, t in enumerate(steps, 1):
        parts = t.split()
        name, args = parts[0], parts[1:]
        if name not in REGISTRY:             # stderr 通道: 与数据分流
            print(f"[stderr] 第{i}步: 未知命令 {name}")
            return "", 127
        code, out = REGISTRY[name](args, data)
        if code != 0:
            print(f"[stderr] 第{i}步 {name} 失败 (exit={code})")
            if stop_on_error:                # set -e 语义: 出错即停
                return out, code
            print("[stderr] stop_on_error=False, 继续")
        data = out
    return data, code

out, code = run_pipeline("fetch | split | grep an | count")
print(f"[stdout] {out!r} exit={code}")
out, code = run_pipeline("fetch | boom | count")
print(f"失败传播: exit={code}, count 未执行")
out, code = run_pipeline("fetch | split | grep zz | count")
print(f"[stdout] {out!r} exit={code}")
run_pipeline("fetch | split | grep an | count", dry_run=True)

# 观察点: 默认管道只传数据不传失败 → 出错即停是显式选择(对应 set -e/pipefail);
# dry-run 把"验证成本"从"真跑一遍"降到"读一遍计划"`,
          },
        ],
      },

      /* ─────────────────────────── l3 ─────────────────────────── */
      {
        id: 'cs146s-w5-l3',
        title: '无头 Agent 与自动化任务编排',
        difficulty: 4,
        content: `
### 学习目标

学完本节，你应该能够：
1. 解释 headless 模式（如 claude -p / codex exec 类）的三条语义——无交互、一次性、可脚本调用——并说明"无人兜底"如何改变任务设计与风险配置；
2. 把 Agent 当 Unix 工具编排：构造"管道进、提示词出"的调用链，设计三值退出码协议（0 成功 / 1 失败 / 2 需人工）与"stdout 给机器、日志给人类"的输出契约；
3. 为无人值守任务配置四层风险控制（权限收窄、目录沙箱、预算上限、失败告警），并按任务的时间属性选择 cron / watch / webhook 触发。

### 前置知识

- l2：三协议、双模式输出、幂等——headless 全部沿用；
- w4 的自治等级 L0-L4：headless 是 L4（全自主）的终端载体；
- w3-l3 的 GWT 验收标准：headless 的任务描述就是一份微型 Spec。

### 问题背景

交互式会话里，你是 Agent 的常驻安全网：它跑偏你纠正，它危险你拦截。代价是**你的注意力被锁死在会话上**——而真正值得自动化的任务（每晚报错分类、每次依赖升级、每个新 issue 分诊）恰恰是"不值得人盯"的高频重复。把它们搬到 headless 模式，人从循环里退出来，杠杆才真正出现。

但"无人看管"四个字同时撤掉了所有安全网：幻觉没人拦、跑偏没人纠、注入没人审（w6 给出攻防细节）。一个真实的失败路径：团队给"自动修复 lint"任务配了每晚 cron，第三天晚上它"顺手"把 main 分支 push 了——交互模式里这在第一分钟就会被你掐断，headless 里它安静地发生了。本节的主题就是：**怎样在没有人盯的情况下，仍然让系统处于受控状态**。

### 直觉理解

交互式 Agent = 有导师陪练的实习生；headless Agent = **派去外地出差的实习生**。出差前你要做五件事，恰好对应本节五个知识点：

1. 任务书写清楚（任务字符串/提示词文件——w3 的 Spec 纪律）；
2. 限额信用卡（预算上限：token/时长/金额）；
3. 只给能进区域的门卡（目录沙箱与权限收窄）；
4. 约定汇报格式（输出契约：stdout 数据 / stderr 日志）；
5. 打不通电话时的处置手册（退出码协议：能办完 → 0；办不完 → 1；没把握 → 2 转人工）——**绝不"自由发挥"**。

### 核心概念与原理详解

## Headless 模式的三条语义

| 语义 | 含义 | 工程后果 |
| --- | --- | --- |
| 无交互 | stdin/stdout 是唯一接口，没有追问环节 | 任务描述必须自带全部上下文与验收标准 |
| 一次性 | 一次调用 = 一个任务，调用间无记忆 | 需要状态就写文件/数据库，不靠"上次聊过" |
| 可脚本调用 | 它本身就是一条命令 | 可进管道、进 cron、进 CI——按 l2 的一切纪律管理 |

主流形态对照：Claude Code 的 \`claude -p "任务" --output-format json\`；Codex CLI 的 \`codex exec\`。与交互模式的关系：**同一个引擎，不同的驾驶方式**——交互模式人在线上，headless 人不在环上。

## 把 Agent 当 Unix 工具

\`\`\`bash
# 管道进: 上游输出作为提示词原料
cat error.log | claude -p "把这些报错按 根因/现象/未知 三类分类, 输出 JSON 数组" --output-format json
\`\`\`

三个设计要点：

1. **管道进，提示词出**：上一环节的 stdout 是下一环节的原料——Agent 就这样嵌入 l2 的流水线；
2. **输出契约**：stdout 只放机器可消费的 JSON（稳定 schema），日志走 stderr——l2 双模式输出的 Agent 版；
3. **退出码协议**：

| 退出码 | 语义 | 编排器动作 |
| --- | --- | --- |
| 0 | 成功且产出有效（可加置信度门槛） | 继续下一环节 |
| 1 | 失败（报错/超预算/输出不合法） | 告警，进重试队列（带上限） |
| 2 | 完成但低置信/触及权限边界 | **转人工队列**，绝不自动放行 |

第三值是精髓：二值协议把"没把握"强行归入"成功"或"失败"——要么静默放行烂结果，要么用告警疲劳淹没人。三值协议让低置信任务有专属通道。

## 触发方式：cron / watch / webhook

| 触发 | 适合 | 例子 |
| --- | --- | --- |
| cron（周期） | 时间驱动的汇总类 | 每晚 2 点报错分类 |
| watch（文件/目录事件） | 数据到达驱动 | 新数据文件落盘即处理 |
| webhook（外部事件） | 业务事件驱动 | 新 issue / 新工单到达即分诊 |

选择依据只有一个：任务由什么驱动——时间、数据到达、还是外部事件。

## 无人值守的四层风险控制

1. **权限收窄**：只读优先；工具白名单；写权限限定在专用工作区（w2 项目 C 的权限三层在此复用）；
2. **目录沙箱**：专用工作目录 + 越界拒绝（l5 给出实现，w6b-l5 给出完整版）；
3. **预算上限**：token / 时长 / 金额三重上限——失控循环（重试风暴）最贵的不是错误，是"错误的无限重复"；
4. **失败告警**：退出码非 0 触发通知（IM/邮件/webhook）。**没有告警的 headless 任务 = 定时炸弹**——你甚至不知道它已经炸了。

### 完整案例

场景：夜间 issue 分诊 Agent。逐步走通（每步"为什么"自解释）：

1. **触发**：cron 每晚 02:00——为什么定时而非 webhook？分诊要"当日汇总"的批处理视角，且低峰期跑不扰用户；
2. **准备**：拉取当天新 issue 落盘到 issues/ 目录——为什么要先落盘？一次性语义没有会话记忆，状态必须外置；
3. **逐条调用**：\`claude -p "$(cat issues/101.md)" --output-format json\`，提示词模板里带分类体系与输出 schema——为什么正文走文件/stdin 而不是拼进提示词字符串？数据与指令分离的第一步（l5 展开）；
4. **置信度路由**：JSON 里要求模型自报 confidence；≥0.85 → 自动打标（exit 0）；<0.85 → exit 2 进人工队列——为什么让模型自报再由编排器裁决？**裁决权在编排器，不在模型**；
5. **收尾**：汇总报告写 stdout，运行日志走 stderr 落文件；任一 exit 1 → webhook 告警；预算每晚 50K token 封顶。

**自解释提示**：整套设计里人只出现在两个地方——早上看报告、处理"需人工"队列。这就是 headless 的正确形态：**人不在循环里，人在循环的边界上**。

### 代码实践

下方 demo 用 FakeLLM 模拟一次 headless runner 的完整链路：任务 →（stdout JSON + stderr 日志）→ 退出码裁决。跑通后完成本节 code 习题——亲手实现它的裁决函数。

### 常见误区与安全风险

- **误区一："headless 就是加个 -p 参数。"** 语义变化是"没人兜底"：不加预算、不加告警、不加沙箱的 headless 是裸奔。
- **误区二："输出随便打。"** stdout 被日志污染，下游 JSON 解析全崩——数据/日志分离是契约，不是风格偏好。
- **误区三："退出码 0/1 够用。"** 缺"需人工"通道的编排器会静默放行低置信结果——事故往往出在"它说它做完了"。
- **安全提示**：headless + 提示词注入是最危险组合（无人审查 + 自动执行，w6 展开）；任务字符串不要直接拼接用户可控内容——数据走 stdin/文件、指令走提示词模板；预算上限同时是 DoS 防线（被注入的任务要求"无限重试"时，预算是最后的闸）。

### 知识关联：承上启下

- 承上：l2 的三协议/双模式/幂等——headless 全套沿用；w4 的自治等级——headless 即 L4，验证必须最硬；w3 的 Spec 纪律——任务字符串就是微型 Spec；
- 启下：l4 把跑通的编排固化为可审计资产；l5 给 headless 划安全边界（沙箱/凭据/两阶段执行）；w6 的注入攻防以 headless 为首选靶子；项目 A 的 agent loop 是 headless runner 的内部原理；cs146s-final 的 Software Factory 就是本节模式的多任务放大。

### 动手实验

1. 运行下方 runner 模拟，把 threshold 调到 0.9 观察路由变化——体会"裁决权在编排器"；
2. 为你自己的一项重复工作写一段 headless 任务字符串（含输出 schema 与置信度规则），对照 w3-l3 的 AC 标准检查它的机器可判性；
3. 画出你所在团队的"退出码路由表"：哪些任务值得启用 2（转人工）通道？

### 本节总结

1. headless 三语义：无交互、一次性、可脚本调用——本质变化是"人不在环上"；
2. Agent 即 Unix 工具：管道进、JSON 出、退出码路由；三值退出码给低置信任务留专属通道；
3. 输出契约：stdout 数据给机器、stderr 日志给人类；
4. 触发按驱动源选：cron（时间）/ watch（数据到达）/ webhook（外部事件）；
5. 四层风控：权限收窄、目录沙箱、预算上限、失败告警——缺一层就是裸奔。

### 参考资料与延伸阅读

- [Anthropic Claude Code CLI 文档](https://docs.anthropic.com/en/docs/claude-code/cli-reference)（-p / --output-format 等 headless 用法）——对应"三条语义"与"输出契约"模块；
- [OpenAI Codex CLI 文档](https://github.com/openai/codex)（exec 非交互模式）——对应"主流形态对照"；
- Anthropic《Claude Code 最佳实践》——"把 Agent 用进工作流与管道"的官方建议：对应"把 Agent 当 Unix 工具"模块；
- [POSIX cron 手册](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/crontab.html)——对应"触发方式"模块；
- 官方 Week 5 作业仅作主题锚点；issue 分诊案例、runner 模拟与三值退出码协议为自主设计。

### 本节习题导引

fill 题默写三语义与输出契约；single/judge 题辨析退出码协议与四层风控；code 题实现结果裁决函数；open 题设计一个完整的无人值守扫描 Agent。
`,
        tips: [
          { kind: 'pitfall', text: '没有告警的 headless 任务是定时炸弹：退出码非 0 必须有通知路径，否则你连"它炸了"都不知道。' },
          { kind: 'performance', text: '预算上限（token/时长/金额）同时是失控重试风暴的熔断器——上线 headless 前先配预算再调提示词。' },
          { kind: 'interview', text: '"交互式 Agent 和 headless 的本质区别？"——不是参数，是"人不在环上"：验证、限额、沙箱必须前置配置，退出码协议是编排器的路由依据。' },
          { kind: 'leak', text: '任务字符串拼接用户可控内容 = 提示词注入直通车：数据走 stdin、指令走提示词模板，是 headless 的第一道隔离。' },
        ],
        demos: [
          {
            title: 'headless runner 模拟：退出码裁决与双通道输出',
            lang: 'python',
            code: `import json

# FakeLLM: 按任务关键词返回固定结果, 模拟一次 headless 调用
def fake_llm(task):
    """返回 (stdout 的 JSON 行, stderr 的日志行)"""
    if "测试失败" in task:
        return ('{"ok": false, "error": "3 次尝试后仍未修复"}',
                "[log] 尝试 3 种修复均失败, 放弃并如实报告")
    if "升级" in task:
        return ('{"ok": true, "confidence": 0.42, "summary": "API 变动不确定, 建议人工确认"}',
                "[log] 读取 3 个 CHANGELOG, 标记 2 处风险")
    return ('{"ok": true, "confidence": 0.93, "summary": "重命名 5 处, 测试全绿"}',
            "[log] 修改 2 个文件, pytest 全绿")

def run_headless(task, threshold=0.7):
    """模拟 headless runner: 返回 (退出码, 机器输出 dict, 人类日志)"""
    out_line, log_line = fake_llm(task)
    try:
        data = json.loads(out_line)
    except ValueError:
        return 1, None, log_line + " | 输出不是合法 JSON -> 告警"
    if not data.get("ok"):
        return 1, data, log_line + " | 失败 -> 告警+重试队列"
    if data.get("confidence", 0.0) < threshold:
        return 2, data, log_line + " | 低置信 -> 转人工队列"
    return 0, data, log_line + " | 成功 -> 继续下一环节"

TASKS = [
    "任务: 重命名 utils.py 中的 helper 函数并保持测试通过",
    "任务: 评估并完成 requests 库的小版本升级",
    "任务: 修复登录页的测试失败",
]
for t in TASKS:
    code, data, log = run_headless(t)
    print(f"exit={code}")
    print(f"  stdout(机器): {json.dumps(data, ensure_ascii=False)}")
    print(f"  stderr(人类): {log}")

# 观察点: 同一个 runner, 三种结局(0/2/1) —— 裁决权在编排器不在模型;
# stdout 只放 JSON, 日志全部走 stderr —— 双通道契约(l2)的 Agent 版`,
          },
        ],
      },
    ],
    exercises: [
      /* ───────── l1 习题（6 题）───────── */
      {
        id: 'cs146s-w5-l1-e1', type: 'single', difficulty: 1, relatedLessonId: 'cs146s-w5-l1', tags: ['K', 'cli'],
        question: '在"CLI 的四个超能力"中，最能直接解释"为什么 Coding Agent 优先选择终端而非 GUI 作为入口"的是？',
        options: [
          { value: 'a', text: '终端界面更省内存、渲染更快' },
          { value: 'b', text: '纯文本接口对 LLM 零损耗：读写命令与输出都是模型的母语' },
          { value: 'c', text: '终端的历史更悠久、文档更多' },
          { value: 'd', text: 'GUI 无法执行任何自动化操作' },
        ],
        answer: 'b',
        explanation: '四条超能力都重要，但"纯文本对模型友好"是入口选择的直接原因——GUI 需要视觉编码与坐标点击，信息有损且脆弱；d 错在绝对化，GUI 可以自动化，只是协议层代价高。',
      },
      {
        id: 'cs146s-w5-l1-e2', type: 'judge', difficulty: 1, relatedLessonId: 'cs146s-w5-l1', tags: ['U', 'cli'],
        question: 'AI 增强终端（如 Warp）的本质只是把命令自动补全做得更好。',
        answer: false,
        explanation: '补全只是表象：块结构把会话拆成可复制的执行单元、Agent Mode 把工作单元从"命令"上移到"意图"——改变的是交互粒度与人机分工。',
      },
      {
        id: 'cs146s-w5-l1-e3', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-w5-l1', tags: ['K', 'cli'],
        question: '三代终端形态：传统终端由______打命令；AI 增强终端由人说______、终端生成命令；Agent CLI 由______执行、人审核。',
        blanks: [['人', '用户', '人类'], ['意图', '自然语言', '意图描述'], ['Agent', 'AI', '模型']],
        explanation: '工作单元逐级上移：命令 → 命令+意图 → 意图+委托。传统终端没有消失——它是 Agent CLI 的执行层。',
      },
      {
        id: 'cs146s-w5-l1-e4', type: 'multiple', difficulty: 2, relatedLessonId: 'cs146s-w5-l1', tags: ['U', 'cli'],
        question: '依据 GUI 与 CLI 分工矩阵，下列哪些任务更适合交给终端（而非 GUI）？',
        options: [
          { value: 'a', text: '把 300 张图片按拍摄日期批量归档' },
          { value: 'b', text: '调整登录页的配色与圆角' },
          { value: 'c', text: '在服务器上排查凌晨的内存泄漏' },
          { value: 'd', text: '给投资人演示产品新功能' },
        ],
        answer: ['a', 'c'],
        explanation: 'b/d 是视觉与沟通任务，GUI 更优；a 是批量文本化操作（组合性），c 是服务器场景——服务器世界本质上就是终端。',
      },
      {
        id: 'cs146s-w5-l1-e5', type: 'single', difficulty: 3, relatedLessonId: 'cs146s-w5-l1', tags: ['U', 'cli'],
        question: '为什么说"Agent 厂商不是没想过做 GUI，而是终端在协议层完胜"？',
        options: [
          { value: 'a', text: 'GUI 的开发成本太高，厂商做不起' },
          { value: 'b', text: 'GUI 在行动、观察、验证、记录四件事上都没有原生协议，而终端四件全齐' },
          { value: 'c', text: '用户普遍更喜欢打字而不是点击' },
          { value: 'd', text: 'GUI 无法显示代码文件的内容' },
        ],
        answer: 'b',
        explanation: '对照表：终端的行动=执行命令、观察=文本输出、验证=exit code、记录=命令历史，全部原生；GUI 四件事都要模拟（点击模拟、读屏、无验证协议、另装录屏）。这是协议层的比较，不是成本或偏好的比较。',
      },
      {
        id: 'cs146s-w5-l1-e6', type: 'open', difficulty: 3, relatedLessonId: 'cs146s-w5-l1', tags: ['D', 'cli'],
        question: '用分工矩阵 + 三代形态复盘你本周的工作：挑 5 个真实任务，逐一标注"用 GUI 还是终端（哪种形态）"与理由；再回答：为什么 Agent 时代终端复兴而非消亡（用四个超能力中的至少两条论证）？',
        referenceAnswer: `参考复盘（示例：一名后端工程师的一周）：

| 任务 | 选择 | 理由（对应矩阵/超能力） |
| --- | --- | --- |
| 调整新落地页的间距与配色 | GUI（设计工具/浏览器 devtools） | 视觉判断需要眼睛 |
| 把 240 个日志文件合并去重排序 | 终端（Agent CLI 形态） | 批量文本操作，可组合性碾压手工 |
| 排查测试环境服务器的磁盘告警 | 终端（传统终端 ssh + Agent 辅助） | 服务器世界本质是终端 |
| 向产品团队演示新功能 | GUI | 沟通需要可视化 |
| 每天把 PR 数据抄进周报 | 终端（AI 增强终端起步 → l4 固化） | 高频重复，升级信号已触发 |

复兴论证（至少两条超能力）：① 纯文本对模型友好——Agent 的感知与执行都以文本为介质，GUI 的像素语义无法无损进入上下文；② 可脚本化 + 可审计——终端里的每个动作天然留痕、可固化成脚本资产，GUI 动作既难记录也难重放。同时保留"仍属 GUI"的任务（视觉、演示），避免走向"一切皆 CLI"的极端。`,
        rubric: [
          { point: '5 个真实任务逐一给出界面/形态选择', score: 3 },
          { point: '至少 3 个任务的选择能与分工矩阵对应并说出依据', score: 3 },
          { point: '复兴论证使用至少两条超能力且与 Agent 的感知/执行机制挂钩', score: 2 },
          { point: '保留至少一个"仍属 GUI"的任务，未走向"一切皆 CLI"的极端', score: 2 },
        ],
        keywords: ['可组合', '纯文本', '分工矩阵', '意图', '审计'],
        explanation: '判卷要点：好答案按任务选界面而不是按信仰选界面——能说出"哪些不归终端"与能说出"为什么归终端"同样重要。',
      },

      /* ───────── l2 习题（8 题）───────── */
      {
        id: 'cs146s-w5-l2-e1', type: 'fill', difficulty: 1, relatedLessonId: 'cs146s-w5-l2', tags: ['K', 'shell'],
        question: '三协议：数据沿______流入命令、沿______流出；每个命令独立的成功/失败信号叫______（0 表示成功）。',
        blanks: [['stdin', '标准输入'], ['stdout', '标准输出'], ['exit code', '退出码', 'exit_code', '返回码']],
        explanation: '数据通道（stdin/stdout）与状态通道（exit code）分离，是整条管道能组合的协议基础。',
      },
      {
        id: 'cs146s-w5-l2-e2', type: 'single', difficulty: 2, relatedLessonId: 'cs146s-w5-l2', tags: ['U', 'shell'],
        question: '管道 a | b | c 中 a 失败（退出码 1），b、c 都成功。默认情况下整条管道的退出码是？',
        options: [
          { value: 'a', text: '1——任何一环失败都会传播' },
          { value: 'b', text: '0——默认取最后一环的退出码' },
          { value: 'c', text: '127——非法退出码' },
          { value: 'd', text: '未定义，取决于 shell 版本' },
        ],
        answer: 'b',
        explanation: '默认管道退出码 = 最后一环 c 的 0——中间失败被吞掉，这正是 set -o pipefail 存在的理由：任一环非 0 即非 0。',
      },
      {
        id: 'cs146s-w5-l2-e3', type: 'judge', difficulty: 2, relatedLessonId: 'cs146s-w5-l2', tags: ['U', 'shell'],
        question: '"mkdir -p out/" 在目录已存在时报错退出，所以它不是幂等操作。',
        answer: false,
        explanation: '反了：mkdir -p 的语义就是"已存在即成功"——这正是幂等的"mkdir -p 思维"；不带 -p 的 mkdir 才会对已存在目录报错。',
      },
      {
        id: 'cs146s-w5-l2-e4', type: 'multiple', difficulty: 2, relatedLessonId: 'cs146s-w5-l2', tags: ['U', 'shell'],
        question: '下列哪些改造能提升脚本的幂等性（重跑安全）？',
        options: [
          { value: 'a', text: '把 mkdir out 换成 mkdir -p out' },
          { value: 'b', text: '输出文件先写 .tmp 再 mv 覆盖正式文件' },
          { value: 'c', text: '给脚本加锁，防止两个实例并发运行' },
          { value: 'd', text: '把"每次追加写日志"改为"每次全量覆盖写同一个日志文件"' },
        ],
        answer: ['a', 'b', 'c', 'd'],
        explanation: 'a 存在即成功；b 原子替换不留半成品；c 防并发互踩；d 追加是不幂等的典型（重跑重复追加），固定名覆盖写重跑结果一致。四条全是幂等化手段。',
      },
      {
        id: 'cs146s-w5-l2-e5', type: 'single', difficulty: 3, relatedLessonId: 'cs146s-w5-l2', tags: ['U', 'shell'],
        question: '脚本第一行写了 set -e，但 fail_step | ok_step 里的 fail_step 失败后脚本却继续跑了。最可能的原因是？',
        options: [
          { value: 'a', text: 'set -e 必须写成 set -E 才对' },
          { value: 'b', text: 'set -e 的盲区：管道默认只看最后一环，需要 set -o pipefail' },
          { value: 'c', text: 'fail_step 前面没加 sudo' },
          { value: 'd', text: 'bash 版本太老，不支持 set -e' },
        ],
        answer: 'b',
        explanation: 'set -e 的三个盲区之一：管道中段的失败默认被吞掉（只看最后一环）。补 set -o pipefail 后任一环失败即停。其余两个盲区：if 条件内、命令替换内。',
      },
      {
        id: 'cs146s-w5-l2-e6', type: 'code', difficulty: 3, relatedLessonId: 'cs146s-w5-l2', tags: ['D', 'pipeline'],
        question: '实现 `pipe_flow(steps, dry_run=False)`——迷你管道执行器的函数版。规则：steps 是 [(name, fn), ...]；fn(stdin: str) 返回 (exit_code, stdout)；上一步的 stdout 作为下一步的 stdin（管道协议）；某步 exit_code 非 0 时立即停止并返回（该步 stdout，该步退出码）——像 set -e；全部成功返回（最后一步 stdout，0），空 steps 返回 ("", 0)。dry_run=True 时不执行任何 fn：若 steps 中存在重复 name 返回 ("dup", -1)，否则返回 ("ok", 0)。',
        lang: 'python',
        starterCode: `def pipe_flow(steps, dry_run=False):
    """steps: [(name, fn), ...]; fn(stdin: str) -> (exit_code: int, stdout: str)
    顺序执行: 上一步 stdout 作为下一步 stdin; 某步 exit_code != 0 时立即停止,
    返回 (该步 stdout, 该步退出码); 全部成功返回 (最后一步 stdout, 0);
    空 steps 返回 ("", 0)。
    dry_run=True: 不执行任何 fn; 存在重复 name 返回 ("dup", -1), 否则 ("ok", 0)。
    """
    pass

# ── 自测(实现后应得到注释里的输出) ──
ran = []
def f1(s): ran.append("f1"); return 0, "banana\\navocado\\ncherry\\n"
def f2(s): ran.append("f2"); return 0, "".join(l + "\\n" for l in s.splitlines() if "an" in l)
def f3(s): ran.append("f3"); return 0, str(len(s.splitlines())) + " lines"
def bad(s): ran.append("bad"); return 3, "boom"

out, code = pipe_flow([("fetch", f1), ("grep", f2), ("count", f3)])
print(out, code)           # 1 lines 0
out, code = pipe_flow([("fetch", f1), ("fail", bad), ("count", f3)])
print(out, code, ran[-1])  # boom 3 bad
out, code = pipe_flow([("a", f1), ("b", f2)], dry_run=True)
print(out, code, len(ran)) # ok 0 5`,
        expectedOutput: '1 lines 0\nboom 3 bad\nok 0 5',
        tests: `calls = []
def mk(name, code, out):
    def fn(s):
        calls.append(name)
        return code, out
    return fn

o, c = pipe_flow([("a", mk("a", 0, "x\\n")), ("b", mk("b", 0, "y\\n"))])
assert (o, c) == ("y\\n", 0), "管道传递: b 应收到 a 的 stdout"
o, c = pipe_flow([("a", mk("a", 0, "x\\n")), ("bad", mk("bad", 2, "err")), ("c", mk("c", 0, "z\\n"))])
assert (o, c) == ("err", 2), "出错即停( set -e 语义)"
assert calls[-1] == "bad", "失败后的步骤不应执行"
o, c = pipe_flow([("a", mk("a", 0, "1")), ("a", mk("a", 0, "2"))], dry_run=True)
assert (o, c) == ("dup", -1), "重复名应由 dry-run 检出"
n = len(calls)
o, c = pipe_flow([("a", mk("a", 0, "1")), ("b", mk("b", 0, "2"))], dry_run=True)
assert (o, c) == ("ok", 0) and len(calls) == n, "dry-run 不应执行任何步骤"
o, c = pipe_flow([])
assert (o, c) == ("", 0), "空管道边界"`,
        allowedModules: [],
        explanation: '四个考点一一对应本节内容：stdout 传递（管道协议）、exit code 传播（set -e 语义：失败即停）、dry-run 不执行（验证前置）、dry-run 查重（执行前验证的一种）。注意 dry-run 分支要先查重再返回，且绝不能调用 fn。',
        answer: `def pipe_flow(steps, dry_run=False):
    if dry_run:
        names = [n for n, _ in steps]
        if len(names) != len(set(names)):
            return "dup", -1
        return "ok", 0
    data, code = "", 0
    for name, fn in steps:
        code, out = fn(data)
        if code != 0:
            return out, code
        data = out
    return data, code

ran = []
def f1(s): ran.append("f1"); return 0, "banana\\navocado\\ncherry\\n"
def f2(s): ran.append("f2"); return 0, "".join(l + "\\n" for l in s.splitlines() if "an" in l)
def f3(s): ran.append("f3"); return 0, str(len(s.splitlines())) + " lines"
def bad(s): ran.append("bad"); return 3, "boom"

out, code = pipe_flow([("fetch", f1), ("grep", f2), ("count", f3)])
print(out, code)           # 1 lines 0
out, code = pipe_flow([("fetch", f1), ("fail", bad), ("count", f3)])
print(out, code, ran[-1])  # boom 3 bad
out, code = pipe_flow([("a", f1), ("b", f2)], dry_run=True)
print(out, code, len(ran)) # ok 0 5`,
      },
      {
        id: 'cs146s-w5-l2-e7', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-w5-l2', tags: ['K', 'observability'],
        question: '双模式输出契约：______ 模式给机器（一行一个 JSON 事件，schema 稳定）；日志与报错走______；数据走______。',
        blanks: [['--json', 'json', '机器'], ['stderr', '标准错误'], ['stdout', '标准输出']],
        explanation: '呼应项目 B：验收脚本用 --json 消费 stdout 的稳定事件流，人类看 stderr 日志。数据/日志混流会让下游解析全崩。',
      },
      {
        id: 'cs146s-w5-l2-e8', type: 'open', difficulty: 4, relatedLessonId: 'cs146s-w5-l2', tags: ['D', 'shell'],
        question: `下面是一个 AI 生成的每日备份脚本 v0，即将被投进每晚 cron 无人值守运行。请：① 找出至少三处缺陷并说明各自在无人值守场景下的具体后果；② 给出改造清单（每处缺陷对应哪种手段）；③ 说明你会如何验证改造后的脚本。

\`\`\`bash
#!/usr/bin/env bash
mysqldump app > app.sql
gzip app.sql
cp app.sql.gz /var/backups/app-$(date +%F).sql.gz
echo "备份完成"
\`\`\``,
        referenceAnswer: `① 缺陷诊断（无人值守场景的后果）：

| 缺陷 | v0 表现 | 无人值守后果 |
| --- | --- | --- |
| 非幂等 | cp 目标已存在时交互询问（部分环境 gzip 亦然） | 卡死等待输入，任务永远完不成 |
| 无 set -e | mysqldump 失败后 gzip/cp 照跑 | 把空文件当备份，还打印"备份完成"——假成功 |
| 失败无声 | 无退出码区分、无 stderr 告警 | 凌晨失败无人知，恢复时才发现没有备份 |
| 无 dry-run | 只能真跑验证 | 验证成本高 → 干脆不验证 |

② 改造清单：set -euo pipefail（mysqldump 失败即停，配合 pipefail 防管道中段吞错）；trap 退出时清理临时文件；mkdir -p 幂等建目录；临时文件 + mv 原子替换（不留半成品）；加 --dry-run（打印计划不执行）；告警走 stderr 且失败 exit 1（cron/告警系统可消费）；补脚本头部协议（用途/用法/副作用/回滚）。

③ 验证方法：bash -n 语法检查 → shellcheck 静态分析 → DRY_RUN=1 跑一遍看执行计划 → 小库试跑全流程 → 连续跑两遍（第二遍仍成功且产物一致才证明幂等）。`,
        rubric: [
          { point: '诊断出非幂等并指出"无人值守卡死/覆盖"的具体后果', score: 2 },
          { point: '诊断出无 set -e 的"假成功"链（失败仍打印备份完成）', score: 2 },
          { point: '改造清单覆盖错误处理/幂等/双通道/dry-run 中至少三类，且与诊断一一对应', score: 3 },
          { point: '给出"连续跑两遍"或等效的幂等验证法', score: 1 },
          { point: '提到失败要有非零退出码供 cron/告警消费', score: 2 },
        ],
        keywords: ['幂等', 'set -e', 'trap', 'dry-run', 'stderr', '退出码'],
        explanation: '本题的判卷核心是"诊断与后果挂钩"：只写"要加错误处理"是泛泛而谈，写出"mysqldump 失败后 gzip 照跑把空文件当备份"才说明你看懂了无人值守场景的放大效应。',
      },

      /* ───────── l3 习题（8 题）───────── */
      {
        id: 'cs146s-w5-l3-e1', type: 'fill', difficulty: 1, relatedLessonId: 'cs146s-w5-l3', tags: ['K', 'headless'],
        question: 'headless 模式三条语义：______（stdin/stdout 是唯一接口，没有追问环节）、______（一次调用一个任务，状态要外置到文件）、可脚本调用（可进管道/cron/CI）。',
        blanks: [['无交互', '非交互', '不交互'], ['一次性', '单次', '无记忆', '一次调用']],
        explanation: '三条语义的工程推论：无交互 → 任务描述自带全部上下文；一次性 → 状态外置；可脚本调用 → 按 l2 的一切脚本纪律管理它。',
      },
      {
        id: 'cs146s-w5-l3-e2', type: 'single', difficulty: 2, relatedLessonId: 'cs146s-w5-l3', tags: ['U', 'headless'],
        question: '三值退出码协议中，退出码 2 的语义与编排器动作是？',
        options: [
          { value: 'a', text: '成功——继续下一环节' },
          { value: 'b', text: '失败——告警并进重试队列' },
          { value: 'c', text: '完成但低置信/触及权限边界——转人工队列，绝不自动放行' },
          { value: 'd', text: '参数错误——直接丢弃任务' },
        ],
        answer: 'c',
        explanation: '第三值是三值协议的精髓：二值协议把"没把握"强行归入成功或失败——要么静默放行烂结果，要么告警疲劳淹没人；"需人工"通道让低置信任务有专属出口。',
      },
      {
        id: 'cs146s-w5-l3-e3', type: 'judge', difficulty: 2, relatedLessonId: 'cs146s-w5-l3', tags: ['U', 'headless'],
        question: 'headless 模式只是交互模式加一个 -p 参数，交互模式下的使用习惯可以原样照搬。',
        answer: false,
        explanation: '语义变化是"人不在环上"：交互模式里靠人兜底的部分（纠偏、拦截、追问）必须前置为预算上限、沙箱、告警与退出码协议——这是配置层面的重构，不是加个参数。',
      },
      {
        id: 'cs146s-w5-l3-e4', type: 'multiple', difficulty: 2, relatedLessonId: 'cs146s-w5-l3', tags: ['U', 'headless'],
        question: '无人值守任务的四层风险控制包括哪些？',
        options: [
          { value: 'a', text: '权限收窄（只读优先 + 工具白名单）' },
          { value: 'b', text: '目录沙箱与越界拒绝' },
          { value: 'c', text: '预算上限（token/时长/金额）' },
          { value: 'd', text: '提高 temperature 让模型表现更灵活' },
        ],
        answer: ['a', 'b', 'c'],
        explanation: '第四层是失败告警（退出码非 0 触发通知）。d 与风控相反——无人值守要的是确定性（低温度）与硬约束，不是灵活性。',
      },
      {
        id: 'cs146s-w5-l3-e5', type: 'code', difficulty: 3, relatedLessonId: 'cs146s-w5-l3', tags: ['D', 'headless'],
        question: '实现 `classify_agent_result(line, threshold=0.7)`：headless runner 的结果裁决函数。输入 line 是 Agent 输出的一行 JSON（形如 {"ok": true, "confidence": 0.9, "summary": "..."}）。规则：JSON 解析失败 → 返回 (1, "bad_output")；ok 为假 → (1, "failed")；ok 为真且 confidence >= threshold → (0, "done")；ok 为真但 confidence < threshold → (2, "human_review")。返回 (退出码, 动作) 元组。',
        lang: 'python',
        starterCode: `import json

def classify_agent_result(line, threshold=0.7):
    """line: Agent 输出的一行 JSON。
    返回 (exit_code, action):
      解析失败            -> (1, "bad_output")
      ok 为假             -> (1, "failed")
      ok 且 conf >= 阈值  -> (0, "done")
      ok 且 conf <  阈值  -> (2, "human_review")
    """
    pass

print(classify_agent_result('{"ok": true, "confidence": 0.92, "summary": "修复完成"}'))
print(classify_agent_result('{"ok": true, "confidence": 0.41, "summary": "大概改好了"}'))
print(classify_agent_result('{"ok": false, "error": "预算耗尽"}'))
print(classify_agent_result('这不是 JSON'))`,
        expectedOutput: "(0, 'done')\n(2, 'human_review')\n(1, 'failed')\n(1, 'bad_output')",
        tests: `assert classify_agent_result('{"ok": true, "confidence": 0.92, "summary": "x"}') == (0, "done")
assert classify_agent_result('{"ok": true, "confidence": 0.7}') == (0, "done"), "阈值含等于"
assert classify_agent_result('{"ok": true, "confidence": 0.69}') == (2, "human_review")
assert classify_agent_result('{"ok": false, "error": "预算耗尽"}') == (1, "failed")
assert classify_agent_result('oops not json') == (1, "bad_output")
assert classify_agent_result('{"ok": true, "confidence": 0.9}', threshold=0.95) == (2, "human_review"), "阈值可调"
assert classify_agent_result('{"ok": true}') == (2, "human_review"), "缺 confidence 按最低置信处理"`,
        allowedModules: ['json'],
        explanation: '裁决权在编排器不在模型：模型自报 confidence，但"0/1/2 走哪条路"由这段确定性代码决定。三个细节：阈值含等于；缺 confidence 按最低置信处理（防御式默认值）；解析失败必须显式计 1 而不是静默跳过。',
        answer: `import json

def classify_agent_result(line, threshold=0.7):
    try:
        data = json.loads(line)
    except (json.JSONDecodeError, ValueError):
        return 1, "bad_output"
    if not data.get("ok"):
        return 1, "failed"
    conf = data.get("confidence", 0.0)
    if conf >= threshold:
        return 0, "done"
    return 2, "human_review"

print(classify_agent_result('{"ok": true, "confidence": 0.92, "summary": "修复完成"}'))
print(classify_agent_result('{"ok": true, "confidence": 0.41, "summary": "大概改好了"}'))
print(classify_agent_result('{"ok": false, "error": "预算耗尽"}'))
print(classify_agent_result('这不是 JSON'))`,
      },
      {
        id: 'cs146s-w5-l3-e6', type: 'single', difficulty: 2, relatedLessonId: 'cs146s-w5-l3', tags: ['U', 'headless'],
        question: '三类触发方式的选择："新 issue 到达即分诊"、"每晚 2 点汇总报错"、"新数据文件落盘即入库"，依次对应的触发方式是？',
        options: [
          { value: 'a', text: 'cron / watch / webhook' },
          { value: 'b', text: 'webhook / cron / watch' },
          { value: 'c', text: 'watch / webhook / cron' },
          { value: 'd', text: 'cron / webhook / watch' },
        ],
        answer: 'b',
        explanation: '选择依据是任务的驱动源：外部业务事件（新 issue）→ webhook；时间（每晚）→ cron；数据到达（新文件）→ watch。',
      },
      {
        id: 'cs146s-w5-l3-e7', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-w5-l3', tags: ['K', 'headless'],
        question: 'headless 输出契约：______ 给机器（稳定 schema 的 JSON）；______ 给人类（日志与报错）；结果路由的裁决权在______（而不是模型）。',
        blanks: [['stdout', '标准输出'], ['stderr', '标准错误', '日志'], ['编排器', 'runner', '编排层', '调用方']],
        explanation: 'stdout 数据 / stderr 日志是 l2 双模式的 Agent 版；裁决权在编排器——模型自报置信度，但 0/1/2 的路由由确定性代码决定。',
      },
      {
        id: 'cs146s-w5-l3-e8', type: 'open', difficulty: 4, relatedLessonId: 'cs146s-w5-l3', tags: ['D', 'headless'],
        question: '为你的团队设计一个每周一早上运行的"依赖漏洞扫描 headless Agent"。要求写出：① 任务字符串要点（含输出 schema 与置信度规则）；② 输出契约（stdout/stderr 各放什么、给谁消费）；③ 三值退出码在本任务中的具体语义表；④ 四层风控的具体配置（每层一条可执行配置，不是口号）。',
        referenceAnswer: `① 任务字符串要点（存为文件随 cron 调用）：背景——每周一 08:00 扫描依赖漏洞，输入 requirements.lock 与 pip-audit 原始报告（经 stdin 传入）；任务——对每个 CVE 输出 {"package", "cve_id", "severity", "fixed_in", "confidence", "summary"}；置信度规则——官方安全公告与 CHANGELOG 可交叉确认 → ≥0.9；仅论坛/二手信息 → ≤0.5 并在 summary 注明来源；约束——只读分析、不执行修复、不访问非白名单域名。

② 输出契约：stdout = 一行一个 JSON 事件（机器消费：进周报系统与工单系统）；stderr = 运行日志（人消费：落 /var/log/scan/ 供排查）。

③ 退出码语义表：

| 码 | 本任务语义 | 编排器动作 |
| --- | --- | --- |
| 0 | 扫描完成且全部条目 confidence ≥ 0.85 | 生成周报，自动为低危项建工单 |
| 1 | 扫描中断 / 超预算 / 输出不合法 | webhook 告警，重试一次（带上限） |
| 2 | 存在 confidence < 0.85 的高危条目 | 转人工安全评审队列，绝不自动放行 |

④ 四层风控：权限——只读运行（工具白名单：读文件、运行 pip-audit）；沙箱——专用 /srv/scan 工作区，网络白名单仅官方公告域名；预算——单次 30K token / 10 分钟封顶；告警——退出码非 0 → IM webhook 通知安全值班 + 计入周报。`,
        rubric: [
          { point: '任务串含输出 schema 与可操作的置信度规则（不是"看着办"）', score: 3 },
          { point: 'stdout/stderr 契约分离且说明了各自的消费方', score: 2 },
          { point: '退出码三值语义具体，且含"低置信高危→人工"通道', score: 3 },
          { point: '四层风控各有一条可执行配置（数值/路径/白名单级）', score: 2 },
        ],
        keywords: ['退出码', '置信度', '白名单', '预算', 'stdout'],
        explanation: '判卷看两点：一是"可执行性"——风控要落到数值与路径，写成"注意安全"不得分；二是"裁决权归属"——置信度由模型自报，但路由必须由编排器决定。',
      },
    ],
  },
];
