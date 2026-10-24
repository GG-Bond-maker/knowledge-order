import type { Chapter } from '../../../types';

/* ============================================================
 *  CS146S Fall 2026 · Week 7：代码审查与调试支持
 *
 *  来源：
 *  - 官方大纲 Week 7（trust in AI code / debugging / doc generation；
 *    嘉宾 Tomas Reimers"百万 AI 代码审查的教训"）
 *  - 《Code Reviews: Just Do It》/ GitHub《How to Review Code Effectively》（官方指定阅读）
 *  - AI-assisted code review 学术论文（官方指定阅读）
 *  - 原创：多维审查框架、案例改编、全部习题
 * ============================================================ */

export const cs146sW7Chapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'cs146s-w7-c1',
    title: 'Week 7 · 代码审查与调试支持',
    goal: '建立对 AI 生成代码的"信任但核实"工作法：掌握多维审查框架与 diff 实操策略，用 AI 辅助调试而不被误导，把文档生成纳入受控轨道，并完成项目 D 的审查维度升级收口。',
    lessons: [
      /* ─────────────────────────── l1 ─────────────────────────── */
      {
        id: 'cs146s-w7-l1',
        title: 'AI 代码审查的多维框架：审什么、按什么顺序',
        difficulty: 3,
        content: `
### 学习目标

学完本节，你应该能够：
1. 用六维审查框架（正确性/安全/边界/可维护性/测试/文档）对一个 AI 生成的 diff 做系统化审查，并按"便宜且致命优先"排序检查；
2. 解释"审查带宽"概念：为什么人工审查是整个 AI 工作流中最稀缺的资源，以及如何用分层策略把它用在刀刃上；
3. 说明 AI 审查助手在框架中的正确位置（初筛与盲区提示），以及为什么它不能替代人的终审。

### 前置知识

- w6-l2 的三明治流程（扫描→AI 初裁→人终审）——本节回答"人终审到底审什么"；
- w3-l2 的 Spec——审查的根本依据是"是否符合规格"，不是"代码好不好看"。

### 问题背景

传统审查的隐含假设是"代码是人写的、速度是人的速度"，审查带宽勉强够用。AI 把生成速度提高了十倍，审查带宽没有变——于是审查成为整条工作流的瓶颈。官方 Week 7 嘉宾（Graphite 的 Tomas Reimers）分享的核心教训就是：**当审查跟不上生成，团队会自发地降级审查标准**——橡皮图章不是堕落的选择，是超载系统的必然输出。

所以 AI 时代的审查必须回答两个工程问题：**带宽从哪来**（自动化初审 + 分层人审）与**人审时看什么**（多维框架 + 优先级）。本节解决后者，l2 给出 diff 实操，项目 D 收口解决前者。

### 直觉理解

把审查想象成海关安检。行李（diff）太多、检查员太少，怎么办？先上 X 光机（静态扫描+AI 初筛）把明显没问题的放过去，检查员只开箱检查 X 光标黄的——但**开箱检查有固定动作清单**（液体、刀具、粉末），不靠检查员灵感。六维框架就是这份动作清单：每次审查都过一遍六个维度，跳过的维度必须是有意识的豁免，而不是忘记。

### 核心概念与原理详解

## 六维审查框架

<Diagram type="reviewdims" />

| 维度 | 核心问题 | 检查手段 | 常见 AI 特征问题 |
| --- | --- | --- | --- |
| 正确性 | 逻辑对吗、符合 Spec 吗 | 对照 AC 逐条走查 | 满足字面要求但理解偏了意图 |
| 安全 | 有 w6 五类漏洞吗 | 指纹库 + 注入清单 | 顺手引入注入点、吞安全异常 |
| 边界 | 非法输入、极端规模 | 边界枚举表 | 只实现 happy path |
| 可维护性 | 半年后的同事看得懂吗 | 命名/结构/一致性 | 过度抽象或复制粘贴式重复 |
| 测试 | 变更被测试保护了吗 | 覆盖 + 断言审计（w6b-l4） | 同义反复测试凑数 |
| 文档 | 行为变化被记录了吗 | README/变更日志对照 | 代码改了文档没改（或反向编造） |

**排序原则：便宜且致命优先**——正确性与安全是致命项且可相对快速检查，先做；可维护性意见放最后（重要但不阻塞）。

## 审查带宽的经济学

设团队每天 30 个 AI 变更、每个全维人审 15 分钟 = 7.5 小时/天——一个人全天只够审一半。三个解法（项目 D 的设计依据）：

1. **自动化初审吃掉模式化维度**（安全/测试覆盖可大部分自动判定）；
2. **风险分层**：低风险变更（文档、注释、配置）轻审查，核心模块变更全维审查——分级规则写进流水线，不靠临场判断；
3. **审查产物复用**：每次人审的结论（尤其漏检案例）回流为扫描规则与 AI 初裁样本——审查是再生资源不是一次性成本。

## 依据优先级：Spec > 一致性 > 个人偏好

审查意见要标明依据层级，避免把审查变成品味之争：

1. **Spec 违反**（对照 w3 的 AC）——必须改；
2. **仓库一致性**（与既有代码风格/架构模式冲突）——强烈建议改；
3. **个人偏好**——默认不改（除非是新人教学场景）。

AI 生成的 diff 特别容易引发第 3 类意见（它的风格不是任何人的风格）——**识别并放下偏好类意见，是 AI 时代审查者的第一纪律**，否则审查带宽全部耗散在品味摩擦上。

### 完整案例

用六维框架审一个真实风格的 AI diff：任务卡是"给导出接口加分页"，Agent 交回：

\`\`\`python
@app.route("/export")
def export_users():
    page = int(request.args.get("page", 1))
    size = int(request.args.get("size", 20))
    rows = db.execute("SELECT * FROM users LIMIT ? OFFSET ?", (size, (page-1)*size))
    return json.dumps([dict(r) for r in rows])
\`\`\`

按"便宜且致命"顺序走一遍：

1. **安全（w6 指纹）**：参数化查询 ✓；但 size 无上限——\`size=1000000\` 等于全表导出（资源耗尽类）；
2. **边界**：page=0/-1 时 OFFSET 为负——SQLite 会报错还是返回空？未定义；size=0 呢？
3. **正确性对照 AC**：Spec 要求"返回总数供前端分页"——**没有实现 total 字段**（意图偏差，最典型的 AI 偏差：字面完成"分页"，漏掉"可供分页"）；
4. **测试**：Agent 附带了 2 个测试，全是正常值（happy-path）；
5. **可维护性/文档**：无新文档需求，跳过（有意识的豁免）。

结论：1 条必须改（total 缺失）、2 条边界补测试、1 条上限加约束——15 分钟内的全维审查，抓住了全部三个真问题。**框架的价值在于"每个维度都被看过"，而不在于看得慢。**

### 常见误区与安全风险

- **误区一："AI 代码审得快，因为写得好。"** AI diff 的表层质量高（格式漂亮、命名规范）会造成"看起来没问题"的错觉——六维框架强制穿透表层看行为。
- **误区二："审查意见越多越负责。"** 意见不分层等于噪音，会训练出被审查者的选择性忽略。按依据分级、按风险排序，宁少而准。
- **误区三："让 AI 审 AI 的代码，人就可以不看了。"** AI 初裁压缩误报（w6-l2），但语义级/意图级偏差（如上例的 total 缺失）恰恰是模型间共享盲区的重灾区——人审保留意图核对这一项职责。
- **安全提示**：审查时对"顺手修改"零容忍——AI diff 里任何超出任务范围的改动都要单独拎出来问"这是任务需要还是自作主张"，供应链投毒最喜欢的藏身处就是顺手改动。

### 知识关联：承上启下

- 承上：w6 全章的自动防御是本节的前置漏斗——没有初审，人审带宽立刻耗尽；
- 启下：l2 把框架落成 diff 实操动作；l3 处理审查发现问题的"然后呢"（调试）；l5 把六维集成进项目 D 流水线。

### 动手实验

1. 打开上方六维图，对你在 w6 写的代码（或任一 AI 生成代码）走一遍六维走查，记录每个维度的结论（含有意识的"跳过"）；
2. 把"完整案例"的 diff 拿给一个 AI 让它审——对比它给出的意见与你的六维结论：它抓到了 total 缺失吗？漏了什么、多报了什么？

### 本节总结

1. 审查是 AI 工作流的最稀缺资源：带宽要靠自动化初审+分层+产物复用三个解法扩张；
2. 六维框架（正确性/安全/边界/可维护性/测试/文档）按"便宜且致命优先"排序执行；
3. 意见按依据分级：Spec 违反 > 一致性 > 个人偏好，偏好默认放下；
4. AI diff 表层质量高，六维走查是穿透表层的固定动作；
5. 顺手修改零容忍——超范围改动单独拎出审查。

### 参考资料与延伸阅读

- 《Code Reviews: Just Do It》——审查文化与带宽讨论：对应"问题背景"；
- GitHub《How to Review Code Effectively》——官方审查指南的维度划分：对应六维框架；
- AI-assisted code review 学术论文（官方 W7 指定阅读）——AI 初裁能力与盲区的实证：对应"误区三"；
- 官方作业 week7（review AI code and find issues）——本节"完整案例"的同构练习，作业细节以官方仓库为准；
- 六维框架、带宽经济学、分页案例为自主设计的原创教学内容。

### 本节习题导引

single/fill 题校准框架记忆；code 题实现一个轻量审查清单核对器；open 题对一段真实风格的 AI diff 做全维走查。
`,
        tips: [
          { kind: 'performance', text: '审查 AI diff 前先读任务卡（Spec），先建立"应该是什么"再看"是什么"——顺序反了会被实现带偏。' },
          { kind: 'pitfall', text: '对 diff 中"顺手重构"的部分单独审查：AI 爱在完成任务时顺手改无关代码，那里是后门与回归的高发区。' },
          { kind: 'interview', text: '"AI 时代 code review 还有意义吗？"——答带宽经济学 + 六维框架 + 意图核对不可自动化，体系化且有立场。' },
        ],
        demos: [
          {
            title: '六维审查清单核对器',
            lang: 'python',
            code: `from dataclasses import dataclass

DIMENSIONS = ["correctness", "security", "boundary", "maintainability", "tests", "docs"]
FATAL_FIRST = ["correctness", "security", "boundary"]   # 便宜且致命优先

@dataclass
class ReviewSession:
    findings: dict = None
    def __post_init__(self):
        self.findings = {d: None for d in DIMENSIONS}   # None=未检查

    def mark(self, dim, issue):
        assert dim in DIMENSIONS, f"未知维度: {dim}"
        self.findings[dim] = issue

    def report(self):
        unchecked = [d for d, v in self.findings.items() if v is None]
        fatal = [d for d in FATAL_FIRST if self.findings[d]]
        order = FATAL_FIRST + [d for d in DIMENSIONS if d not in FATAL_FIRST]
        lines = [f"{d:<16} {'FAIL: ' + self.findings[d] if self.findings[d] else ('skip' if self.findings[d] is None else 'pass')}" for d in order]
        return "\\n".join(lines), unchecked, fatal

r = ReviewSession()
r.mark("correctness", "缺 total 字段, 意图偏差")
r.mark("security", "size 无上限(资源耗尽)")
r.mark("boundary", "page=0/-1 未定义")
text, unchecked, fatal = r.report()
print(text)
print("未检查维度:", unchecked)
print("致命问题维度:", fatal)

# 观察点: unchecked 提示遗漏维度(测试/文档没看) —— 框架强制"每个维度都被看过"`,
          },
        ],
      },

      /* ─────────────────────────── l2 ─────────────────────────── */
      {
        id: 'cs146s-w7-l2',
        title: '信任但核实：审查 AI diff 的实操方法',
        difficulty: 3,
        content: `
### 学习目标

学完本节，你应该能够：
1. 执行"三遍读法"（范围→逻辑→表面）审查一个 AI diff，每遍有明确的产出物；
2. 识别 AI diff 的五种特征模式（大而全、顺手重构、注释与实现不符、测试凑数、依赖偷渡）并知道每种的风险；
3. 给出一条 AI diff 的"红线清单"——出现即打回，不进入逐条讨论。

### 前置知识

- l1 的六维框架（本节是它的 diff 实操版）；
- git diff 的基本阅读能力。

### 问题背景

框架告诉你"审什么"，本节解决"怎么审得又快又准"。AI diff 与人类 diff 的形态差异很大：人类 diff 通常小而集中，AI diff 经常大而发散（Agent 爱把"相关的顺手事"都做了）。用审人类 diff 的习惯审 AI diff，会在第 400 行失去耐心——然后开始盲批。**实操方法的目标：让 15 分钟的注意力产出最大化的核查覆盖率。**

### 直觉理解

**三遍读法像看一幅画**：第一遍退后看构图（这个 diff 到底动了哪些地方？范围合理吗？）；第二遍凑近看笔触（核心逻辑对吗？）；第三遍看装裱（命名、格式、注释）。大多数人的错误是一上来就逐行抠——抠到第三十行，已经忘了这个 diff 的全貌，也忘了它在完成任务卡里的哪一条。

### 核心概念与原理详解

## 三遍读法

| 遍 | 动作 | 产出 | 时间 |
| --- | --- | --- | --- |
| 1 范围 | 只看文件清单与 diff 统计，不读代码 | 范围评估："改动是否符合任务边界？" | 2 分钟 |
| 2 逻辑 | 只读核心变更路径（跳过样板代码），对照 Spec 逐条走查 | 行为结论："每条 AC 是否被正确实现？" | 8 分钟 |
| 3 表面 | 命名、一致性、注释、测试质量 | 意见清单（按依据分级） | 5 分钟 |

**第一遍的三个追问**：改动文件数与任务复杂度匹配吗？（任务说"加个参数"却动了 15 个文件 = 顺手重构警报）有没有出现任务完全无关的目录？依赖清单变了吗（**依赖偷渡**是最高危的范围内异常）？

## AI diff 的五种特征模式

| 模式 | 长什么样 | 风险 | 处置 |
| --- | --- | --- | --- |
| 大而全 | 一个小任务带出一堆"相关优化" | 审查超载、回归面扩大 | 要求拆分或明确豁免 |
| 顺手重构 | 重命名/调整格式混入功能 diff | 真实变更被稀释、blame 污染 | 拆成两个提交 |
| 注释与实现不符 | 注释说"校验权限"，代码没校验 | 文档性欺骗（模型常"描述理想版"） | 以代码为准修注释，或修代码 |
| 测试凑数 | 测试多但同义反复/只测 happy path | 虚假安全感（w6b-l4） | 变异抽查 |
| 依赖偷渡 | package.json/requirements 里多出未讨论的包 | 供应链攻击首选通道 | 每个新包人工核实（w6 slopsquatting） |

**注释与实现不符值得特别强调**：AI 有一种系统性倾向——把"应该做到的"写进注释，而实现是另一个版本。审查时**注释不当证据**，一切以可执行行为为准。

## 红线清单（出现即打回）

1. 依赖清单新增未经讨论的包；
2. 凭据/密钥/内网地址出现在 diff 任何位置；
3. 测试被修改或删除（除非任务就是改测试，且有说明）；
4. 权限/鉴权逻辑被弱化（哪怕看起来是"简化"）；
5. 顺手重构与功能变更混在同一提交。

红线与六维的关系：红线是"不讨论直接打回"的硬规则，六维是"逐项检查"的软流程——前者保底线，后者保质量。

### 完整案例

三遍读法实操。任务卡："为 CLI 工具加 --json 输出模式（Spec 3 条 AC：\`--json\` 时输出机器可读 JSON；默认人读格式不变；错误也走 JSON 结构）。" Agent 交回 diff：

- **第一遍（范围）**：3 个文件 +212/-18，requirements.txt 加了 \`rich==13.0\`。追问：任务需要新依赖吗？Spec 没提格式美化——**依赖偷渡警报**。同时发现它"顺手"重命名了 2 个无关函数。
- **第二遍（逻辑）**：AC1 ✓（--json 分支输出 json.dumps）；AC2 ✓（默认路径未动）；AC3 ✗——错误路径仍是纯文本 print 到 stderr，没有 JSON 结构。**AC3 违反**。
- **第三遍（表面）**：新增函数 docstring 描述"支持 --json 与 --yaml 两种模式"——**实现里根本没有 --yaml**（注释与实现不符的变体：文档吹了没做的事）。

裁定：打回，附三项——移除 rich 依赖或给出任务依据、补 AC3、修正 docstring。拆分顺手重构。**全程 15 分钟，三个真问题全部命中——三遍读法没有一行"白看"。**

### 常见误区与安全风险

- **误区一："diff 大说明工作扎实。"** 大小与质量无关；AI 的"大而全"恰恰是审查超载的主因。范围异常是第一遍就该拦的。
- **误区二："注释写得详细 = 代码可靠。"** AI 注释描述的是"理想实现"，未必是"这个实现"。注释性欺骗比没有注释更危险。
- **误区三："测试都过了，逻辑没问题。"** 测试是谁写的？如果是同一个 Agent 写的，测试与实现共享盲区（w6b-l4 的同义反复问题在 diff 场景的再现）。
- **安全提示**：审查 AI diff 时先跑一遍 \`git diff --stat\` 与依赖清单对比——30 秒钟的依赖审计能拦住最贵的攻击。

### 知识关联：承上启下

- 承上：l1 六维框架是本节的检查内容来源；w6-l3 的注入威胁让"依赖偷渡"从风格问题升级为安全红线；
- 启下：l3 处理"审查发现问题后如何修"（调试）；l5 把三遍读法中可自动化的部分（范围检查、依赖审计、红线扫描）固化进项目 D。

### 动手实验

1. 对下方演示中的"模拟 diff 元数据"执行第一遍读法的三个追问，写下你的范围评估；
2. 找一个你最近接受的 AI diff，按三遍读法重审一遍——记录三遍各发现了什么（大多数人在第二遍会找到第一遍漏掉的真问题）。

### 本节总结

1. 三遍读法（范围→逻辑→表面）让 15 分钟注意力产出最大化；
2. 第一遍的三个追问：文件数匹配？无关目录？依赖变化？
3. 五种 AI diff 特征：大而全、顺手重构、注释与实现不符、测试凑数、依赖偷渡；
4. 注释不当证据——一切以可执行行为为准；
5. 红线清单五条出现即打回，与六维软流程互补。

### 参考资料与延伸阅读

- GitHub《How to Review Code Effectively》——官方审查指南：对应三遍读法的顺序设计；
- 《Code Reviews: Just Do It》——对应"问题背景"的带宽分析；
- 官方 W7 嘉宾分享（百万 AI 审查的教训）——橡皮图章的形成机制：对应"问题背景"；
- --json 案例为自主设计的原创教学内容（呼应项目 B 的仓库改造主题）。

### 本节习题导引

fill 题默写三遍读法与五种模式；judge 题校准红线；code 题实现范围检查器；open 题对给定 diff 元数据做完整三遍裁定。
`,
        tips: [
          { kind: 'pitfall', text: 'AI 注释描述的是"理想实现"——注释与代码矛盾时永远相信代码，然后决定修哪个。' },
          { kind: 'performance', text: 'git diff --stat + 依赖清单对比 = 30 秒的范围安检，性价比最高的审查动作，永远第一个做。' },
          { kind: 'note', text: '把红线清单放进项目指令文件，让 Agent 生成时就自我约束——预防比拦截便宜。' },
        ],
        demos: [
          {
            title: '范围检查器（第一遍读法的自动化）',
            lang: 'python',
            code: `def scope_check(task_files, changed_files, task_desc, deps_added, deps_discussed):
    alerts = []
    ratio = len(changed_files) / max(len(task_files), 1)
    if ratio > 3:
        alerts.append(f"范围异常: 改动 {len(changed_files)} 文件 / 任务涉及 {len(task_files)} (>3x)")
    unrelated = set(changed_files) - set(task_files)
    if unrelated:
        alerts.append(f"无关文件: {sorted(unrelated)}")
    smuggled = set(deps_added) - set(deps_discussed)
    if smuggled:
        alerts.append(f"依赖偷渡(红线): {sorted(smuggled)}")
    if "重构" not in task_desc and any("rename" in f for f in changed_files):
        alerts.append("疑似顺手重构: 文件名含 rename")
    return alerts

print(scope_check(
    task_files=["cli.py", "output.py"],
    changed_files=["cli.py", "output.py", "utils_legacy.py", "rename_helper.py"],
    task_desc="为 CLI 工具加 --json 输出模式",
    deps_added=["rich"], deps_discussed=[],
))

# 观察点: 三类警报一次全中 —— 这 30 秒的机器检查相当于第一遍读法`,
          },
        ],
      },

      /* ─────────────────────────── l3 ─────────────────────────── */
      {
        id: 'cs146s-w7-l3',
        title: 'AI 辅助调试：从报错到根因，而不是从报错到玄学',
        difficulty: 3,
        content: `
### 学习目标

学完本节，你应该能够：
1. 执行标准调试循环（复现→定位→假设→验证），并在每个环节正确使用 AI（解释报错/生成假设/写复现用例）与正确不使用 AI（验证必须自己做）；
2. 用二分法（git bisect 思维 + 输出对分）把"偶现 bug"压缩为确定复现；
3. 识别 AI 调试的三大误导模式（自信的错误归因、补丁式修复、上下文外臆测）并给出反制手段。

### 前置知识

- w7-l1/l2 的审查流程（调试是审查发现"行为不对"后的下一站）；
- 会读 Python traceback。

### 问题背景

调试是 AI 工具普及后反而变难的活动：报错贴给 AI，三秒得到一个"看起来合理"的解释和一段"看起来能修"的补丁——然后 bug 三天后换个姿势复发。原因：**AI 擅长"从症状到最可能的解释"，而调试的本质是"从假设到确定的验证"**。跳过验证环节的调试，是把猜测写进了代码库。

官方 Week 7 把调试与审查并列，因为它与审查共享同一条纪律：**信任但核实**。AI 可以让定位快十倍，但"确认根因"这一步永远不能外包。

### 直觉理解

**调试是侦探工作，AI 是一个阅读量惊人的顾问。** 你描述案情，它立刻给出三个最像的嫌疑人——通常第一个就对。但定罪（确认根因）需要证据链，顾问不能替你取证。反过来，如果你直接按顾问的"直觉"定罪并"改造"了嫌疑人（打补丁），三天后真凶再次作案时，你已经污染了现场（补丁改变了行为）。

**偶现 bug 是最难抓的嫌疑人**：它只在特定条件下出现。抓它的办法不是加班蹲守，而是缩小搜索空间——二分法系统地排除一半可能性，log2 次就能锁定。

### 核心概念与原理详解

## 调试循环与 AI 的角色分配

| 环节 | 人做什么 | AI 能做什么 | 禁止 |
| --- | --- | --- | --- |
| 复现 | 构造最小复现 | 把报错+日志转成复现用例草稿 | 复现不了就改代码 |
| 定位 | 二分/加断点/读日志 | 解释 traceback、建议断点位置 | 盲目接受"大概在第 X 行" |
| 假设 | 列出候选根因 | 补充你没想过的假设 | 只有一个假设就开修 |
| 验证 | **亲手证实/证伪**（打印、断言、最小实验） | 起草验证脚本（你来审） | 把"AI 说修好了"当验证 |

**铁律：假设的价值 = 0，直到被独立证据支持。** AI 的解释再通顺也只是假设生成器。

## 二分法的三种形态

1. **时间二分（git bisect）**：bug 什么时候引入的？在提交历史上对分，log2(N) 次定位到引入提交——AI 可以帮你写 bisect 的自动判定脚本（good/bad 判定函数），但判定标准必须你定；
2. **空间二分（输出对分）**：bug 在流水线哪一段？对数据流的中点做检查点，看坏结果从哪半段来；
3. **变量二分（环境对比）**：偶现 bug 的触发条件？对"出现时 vs 不出现时"的环境/输入差异列表做对分（时区？并发？缓存？数据量？）。

## AI 调试的三大误导模式

| 模式 | 表现 | 反制 |
| --- | --- | --- |
| 自信的错误归因 | 语气笃定地把 bug 归因于"缓存不一致"（实为时区） | 要求 AI 给出"可证伪的预测"："如果是这个原因，加这句打印会看到什么？"——预测错了立即排除 |
| 补丁式修复 | 在症状处 try-except / 加默认值让报错消失 | 追问"根因还在吗"；补丁必须附根因说明，否则打回 |
| 上下文外臆测 | 没看过的文件被描述得头头是道 | 只喂它真实存在的证据；对"它说的每行代码"核对存在性 |

**反制的共同原理：把 AI 的输出从"解释"改造为"可证伪的预测"**——预测能被实验检验，解释不能。

### 完整案例

偶现 bug：导出任务约 5% 失败，报错 \`ValueError: time data '2026-10-24 00:00' does not match format '%Y-%m-%d %H:%M:%S'\`。

1. **复现**：贴报错给 AI → 它给出复现用例草稿（构造该格式的时间串）→ 复现成功（确定了输入域）；
2. **AI 假设 #1**（自信归因）："上游某处把秒截断了"——但按铁律不直接修。要求给可证伪预测："若截断发生在格式化层，原始日志里应有完整时间戳。"查日志：**原始时间戳就是 \`00:00\` 格式**——假设 #1 证伪；
3. **AI 假设 #2**："个别数据源用了不同时间格式"——预测：按数据源分组统计失败率。验证：**失败全部集中在供应商 C 的数据**（5% ≈ C 的占比）；
4. **根因确认**：C 自 10 月起改了时间格式（去掉秒）。**根因是数据源变更，不是代码 bug**；
5. **修复**：解析层加多格式兼容 + 对未知格式显式报错（而不是静默吞掉）+ 回归测试两条。如果是补丁式修复（try-except 跳过坏数据），5% 的数据会静默丢失——比崩溃更糟。

**复盘**：AI 两次假设一次错一次对，但两次都被独立证据裁决——AI 加速了假设生成，验证保住了方向。

### 代码实践

下方演示实现"输出对分"定位器的骨架：对一段数据流水线做中点检查，自动报告坏结果出现的半段。你将在 code 习题中扩展它支持多级二分。

### 常见误区与安全风险

- **误区一："AI 解释合理，就是根因。"** 通顺≠正确。合理性与正确性之间隔着验证。自信的语气是模型的风格属性，不是置信度。
- **误区二："先打补丁止血，根因以后查。"** 补丁改变现场——三天后真查根因时，症状已经变形。紧急止血可以，但必须登记"补丁+根因待查"条目并限期。
- **误区三："偶现 bug 无法复现，只能等。"** 不能复现是因为变量没控住。变量二分 + 环境快照（版本、配置、数据样本）能把"等"变成"逼"。
- **安全提示**：把真实日志/数据贴给外部 AI 服务前先脱敏——调试上下文里最常见的泄露就是数据库连接串与用户数据（呼应 w6-l1 的上下文盘点）。

### 知识关联：承上启下

- 承上：l1/l2 审查发现"行为与预期不符"，本节接手"为什么"；
- 启下：l4 的文档生成与"根因说明"绑定（修完 bug 必须留下可读的事后分析）；l5 把"验证脚本自动生成"接入项目 D 的 AI 审查站。

### 动手实验

1. 运行下方对分定位器，把注入点从 stage 2 挪到 stage 3，验证定位器报告正确；
2. 复盘你最近一次调试：当时有没有跳过"验证"直接相信了某个解释？用本节铁律重走一遍。

### 本节总结

1. 调试循环四环节中，AI 负责加速（复现用例/假设/验证脚本草稿），人负责裁决（验证）；
2. 铁律：假设的价值为 0，直到被独立证据支持；
3. 二分法三形态：时间（bisect）、空间（输出对分）、变量（环境对比）；
4. 三大误导的反制共同原理：把"解释"改造成"可证伪的预测"；
5. 补丁必须登记根因待查——否则现场被污染。

### 参考资料与延伸阅读

- Git 官方文档 git-bisect——时间二分的标准工具；
- 《Code Reviews: Just Do It》与官方 W7 阅读清单中的调试文化讨论；
- 官方作业 week7——审查与调试的综合练习锚点；
- 调试循环角色分配表、供应商 C 案例为自主设计的原创教学内容。

### 本节习题导引

fill 题默写循环与铁律；code 题实现多级对分定位器；open 题复盘一次真实调试并标注 AI 角色错位。
`,
        tips: [
          { kind: 'pitfall', text: 'AI 解释的通顺程度与正确率无关——把每个解释都转成"可证伪预测"再决定信不信。' },
          { kind: 'performance', text: '偶现 bug 别硬等：先做环境差异清单（版本/配置/数据/并发/时区），对差异做二分，"等"变"逼"。' },
          { kind: 'leak', text: '贴日志给 AI 前脱敏：连接串、token、用户数据是调试上下文的头号泄露源。' },
        ],
        demos: [
          {
            title: '输出对分定位器（空间二分骨架）',
            lang: 'python',
            code: `def pipeline(data):
    return [
        lambda d: [x * 2 for x in d],          # stage 0
        lambda d: [x + 1 for x in d],          # stage 1
        lambda d: [x if x != 11 else -1 for x in d],  # stage 2 (坏点注入)
        lambda d: [x for x in d if x >= 0],    # stage 3
    ]

def bisect_locate(data, is_bad):
    stages = pipeline(data)
    lo, hi = 0, len(stages)
    while lo < hi:
        mid = (lo + hi) // 2
        out = data
        for f in stages[:mid+1]:
            out = f(out)
        if is_bad(out):
            hi = mid          # 坏的已在 mid 出现 -> 注入点在 [lo, mid]
        else:
            lo = mid + 1
    return lo

bad = lambda out: any(x < 0 for x in out)
print("坏点最先出现在 stage:", bisect_locate([1, 5, 9], bad))

# 观察点: log2(4)=2 次探查定位 —— 数据规模翻倍, 探查只加 1 次`,
          },
        ],
      },
    ],
    exercises: [
      /* ───────── l1 习题（8 题）───────── */
      {
        id: 'cs146s-w7-l1-e1', type: 'multiple', difficulty: 2, relatedLessonId: 'cs146s-w7-l1', tags: ['K', 'review'],
        question: '六维审查框架包括以下哪些维度？',
        options: [
          { value: 'a', text: '正确性（逻辑与 Spec 符合度）' },
          { value: 'b', text: '安全与边界' },
          { value: 'c', text: '可维护性、测试、文档' },
          { value: 'd', text: '代码行数与提交频率' },
        ],
        answer: ['a', 'b', 'c'],
        explanation: '六维=正确性/安全/边界/可维护性/测试/文档。行数与频率是度量不是审查维度——用它审代码是把代理指标当目标。',
      },
      {
        id: 'cs146s-w7-l1-e2', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-w7-l1', tags: ['K', 'review'],
        question: '六维排序原则：______且致命优先——正确性与安全先查，可维护性意见放最后；意见依据分级：Spec 违反 > 仓库______ > 个人______（默认不改）。',
        blanks: [['便宜', '快速', '廉价'], ['一致性', '风格一致性'], ['偏好', '喜好']],
        explanation: 'AI diff 特别容易引发偏好类意见——识别并放下它们是 AI 时代审查者的第一纪律，否则带宽耗散在品味摩擦上。',
      },
      {
        id: 'cs146s-w7-l1-e3', type: 'single', difficulty: 3, relatedLessonId: 'cs146s-w7-l1', tags: ['U', 'review'],
        question: '审查 AI diff 时发现它"字面完成了任务，但漏掉了 Spec 里返回 total 字段"的要求。这属于哪类问题？',
        options: [
          { value: 'a', text: '风格问题，放最后' },
          { value: 'b', text: '意图偏差（正确性维度）——AI 最典型的失败模式：满足字面要求，偏移真实意图' },
          { value: 'c', text: '安全问题' },
          { value: 'd', text: '不算问题，功能能用' },
        ],
        answer: 'b',
        explanation: '意图偏差是模型间共享盲区的重灾区，也是"人审不可全自动化"的核心原因——只有知道意图的人能发现它。',
      },
      {
        id: 'cs146s-w7-l1-e4', type: 'judge', difficulty: 3, relatedLessonId: 'cs146s-w7-l1', tags: ['U', 'review'],
        question: '审查 AI 生成代码时，可以放心跳过安全维度，因为 Week 6 的流水线已经扫过了。',
        answer: false,
        explanation: '流水线吃掉的是模式化部分（指纹可查的漏洞），语义级漏洞（业务逻辑越权等）仍需人审安全维度。跳过必须是有意识的豁免，不能默认。',
      },
      {
        id: 'cs146s-w7-l1-e5', type: 'code', difficulty: 3, relatedLessonId: 'cs146s-w7-l1', tags: ['D', 'review'],
        question: '实现审查意见分级器 `triage(comments: list[tuple[str, str]], waivers: set) -> dict`：comments 元素为 (依据层级, 内容)，层级 ∈ {"spec", "consistency", "preference"}。返回 {"must_fix": [...], "should_fix": [...], "dropped": n}——spec 违反进 must_fix；consistency 进 should_fix；preference 计数后丢弃；waivers 中的 should_fix 内容转为 dropped 计数。',
        lang: 'python',
        starterCode: `def triage(comments, waivers):
    pass

print(triage([("spec", "缺 total"), ("consistency", "命名不一致"), ("preference", "换三元表达式"), ("consistency", "循环可简化")], {"循环可简化"}))`,
        expectedOutput: "{'must_fix': ['缺 total'], 'should_fix': ['命名不一致'], 'dropped': 2}",
        tests: `r = triage([("spec", "缺 total"), ("consistency", "命名不一致"), ("preference", "换三元表达式"), ("consistency", "循环可简化")], {"循环可简化"})
assert r == {"must_fix": ["缺 total"], "should_fix": ["命名不一致"], "dropped": 2}
assert triage([], set()) == {"must_fix": [], "should_fix": [], "dropped": 0}
r2 = triage([("spec", "鉴权缺失"), ("spec", "注入点")], set())
assert r2["must_fix"] == ["鉴权缺失", "注入点"] and r2["should_fix"] == [] and r2["dropped"] == 0
r3 = triage([("preference", "a"), ("preference", "b")], set())
assert r3 == {"must_fix": [], "should_fix": [], "dropped": 2}, "纯偏好全部丢弃"`,
        allowedModules: [],
        explanation: '分级器把"审查意见"变成"行动清单"：must_fix 阻塞合并、should_fix 建议修复、dropped 仅计数（保留数据用于复盘偏好意见的真实比例）。',
        answer: `def triage(comments, waivers):
    must, should = [], []
    dropped = 0
    for level, content in comments:
        if level == "spec":
            must.append(content)
        elif level == "consistency":
            if content in waivers:
                dropped += 1
            else:
                should.append(content)
        else:
            dropped += 1
    return {"must_fix": must, "should_fix": should, "dropped": dropped}`,
      },
      {
        id: 'cs146s-w7-l1-e6', type: 'single', difficulty: 4, relatedLessonId: 'cs146s-w7-l1', tags: ['U', 'review'],
        question: '团队审查带宽长期不足，以下哪个方案最符合本节的"带宽扩张"思路？',
        options: [
          { value: 'a', text: '要求所有人加班审' },
          { value: 'b', text: '自动化初审吃掉模式化维度 + 按风险分层人审 + 审查结论回流为规则与样本' },
          { value: 'c', text: '取消审查，靠线上监控兜底' },
          { value: 'd', text: '规定每人每天最多提交 1 个 diff' },
        ],
        answer: 'b',
        explanation: '带宽扩张三板斧（项目 D 的设计依据）。d 限流治标（生成速度是竞争力不该砍），c 把风险推到生产，a 不可持续。',
      },
      {
        id: 'cs146s-w7-l1-e7', type: 'open', difficulty: 4, relatedLessonId: 'cs146s-w7-l1', tags: ['D', 'review'],
        question: '拿一段你最近接受（或生成的）AI 代码，完整走一遍六维走查并写报告：每个维度的结论（pass/fail/skip 且 skip 必须给理由）；fatal 项的修复方案；本次走查花费时间与"逐行通读"估时的对比。',
        referenceAnswer: `报告骨架（以"CSV 导出函数"为例）：

| 维度 | 结论 | 依据 |
| --- | --- | --- |
| 正确性 | fail | AC 要求字段白名单，实现全量导出 |
| 安全 | pass | 参数化查询；但需注意 size 上限归入边界维度 |
| 边界 | fail | 空列表/超大 size 未定义行为 |
| 可维护性 | skip | 原型阶段，先保正确（有意识豁免，记入技术债） |
| 测试 | fail | 仅 2 个 happy-path 测试 |
| 文档 | pass | 变更日志已更新 |

fatal 修复：补白名单参数 + 边界参数化测试（负 size 返回 4xx、空列表返回空数组）。

时间对比：六维走查 12 分钟 vs 逐行通读估时 25 分钟且不保证维度覆盖——框架省时来自"不再纠结要不要看"，而非看得快。结论：框架的边际价值随 AI 生成量上升而上升。`,
        rubric: [
          { point: '六维齐全且 skip 项给出了豁免理由', score: 3 },
          { point: 'fatal 修复方案具体可执行', score: 2 },
          { point: '时间对比反映了框架省时的真实机制', score: 2 },
          { point: '至少一个维度发现了真问题（非全 pass 的敷衍报告）', score: 3 },
        ],
        keywords: ['六维', 'skip', '豁免', '走查'],
        explanation: '全 pass 的报告几乎必然是敷衍——真实代码总有至少一个维度可改进；本题为诚实审查做行为校准。',
      },
      {
        id: 'cs146s-w7-l1-e8', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-w7-l1', tags: ['K', 'review'],
        question: '审查产物复用：每次人审的结论（尤其______案例）回流为扫描______与 AI 初裁______——审查是再生资源。',
        blanks: [['漏检', '误报'], ['规则'], ['样本', '训练样本']],
        explanation: '审查带宽经济学的第三板斧：把人的判断力沉淀为系统能力。',
      },

      /* ───────── l2 习题（8 题）───────── */
      {
        id: 'cs146s-w7-l2-e1', type: 'fill', difficulty: 1, relatedLessonId: 'cs146s-w7-l2', tags: ['K', 'review'],
        question: '三遍读法：第一遍看______（2 分钟，范围评估）、第二遍看______（对照 Spec 走查）、第三遍看______（命名/注释/测试质量）。',
        blanks: [['范围'], ['逻辑', '核心逻辑'], ['表面', '细节']],
        explanation: '顺序不可换：先建立"应该是什么"的边界感，再进逻辑，最后才是风格——一上来逐行抠会在中途失去全貌。',
      },
      {
        id: 'cs146s-w7-l2-e2', type: 'multiple', difficulty: 3, relatedLessonId: 'cs146s-w7-l2', tags: ['K', 'review'],
        question: 'AI diff 的五种特征模式包括？',
        options: [
          { value: 'a', text: '大而全（小任务带一堆相关优化）' },
          { value: 'b', text: '注释与实现不符（描述理想版）' },
          { value: 'c', text: '依赖偷渡（未讨论的新包）' },
          { value: 'd', text: '提交信息太长' },
        ],
        answer: ['a', 'b', 'c'],
        explanation: '五模式=大而全/顺手重构/注释与实现不符/测试凑数/依赖偷渡。提交信息长度不是风险模式。',
      },
      {
        id: 'cs146s-w7-l2-e3', type: 'judge', difficulty: 3, relatedLessonId: 'cs146s-w7-l2', tags: ['U', 'review'],
        question: 'AI diff 中注释写着"此处校验了用户权限"，但代码里没有校验逻辑。应当以注释为准要求补代码，或以代码为准修正注释——不能默认通过。',
        answer: true,
        explanation: '注释性欺骗是 AI 的系统性倾向（描述"应该做到的"）。审查时注释不当证据，一切以可执行行为为准，矛盾处必须修一侧。',
      },
      {
        id: 'cs146s-w7-l2-e4', type: 'single', difficulty: 3, relatedLessonId: 'cs146s-w7-l2', tags: ['U', 'security'],
        question: '下列哪条属于红线清单（出现即打回、不逐条讨论）？',
        options: [
          { value: 'a', text: '函数命名风格与仓库不一致' },
          { value: 'b', text: 'diff 中 requirements.txt 新增了一个从未讨论过的包' },
          { value: 'c', text: '测试覆盖了但断言较弱' },
          { value: 'd', text: '注释有错别字' },
        ],
        answer: 'b',
        explanation: '依赖偷渡是供应链攻击首选通道（w6 slopsquatting），属红线。a/c/d 是六维软流程的正常意见。',
      },
      {
        id: 'cs146s-w7-l2-e5', type: 'code', difficulty: 3, relatedLessonId: 'cs146s-w7-l2', tags: ['D', 'review'],
        question: '实现红线扫描器 `redline_scan(diff_text: str, allowed_files: set) -> list[str]`：检查三类红线——① diff 修改了 allowed_files 之外的文件（行首 `+++ b/路径` 提取文件名）；② 新增行含疑似密钥（形如 api_key/secret/token/password 后跟等号与引号包裹的至少 8 个字符，用正则实现）；③ 测试文件（路径含 test）中的删除行（行首 `-` 且非 `---`）。返回命中的红线描述列表。',
        lang: 'python',
        starterCode: `import re

def redline_scan(diff_text, allowed_files):
    pass

diff = """diff --git a/app.py b/app.py
+++ b/app.py
+API_KEY = "sk-prod-12345678"
diff --git a/tests/test_app.py b/tests/test_app.py
+++ b/tests/test_app.py
-assert old_behavior()
"""
print(redline_scan(diff, {"app.py", "tests/test_app.py"}))`,
        expectedOutput: "['疑似密钥: app.py', '测试删除: tests/test_app.py']",
        tests: `diff1 = "diff --git a/app.py b/app.py\\n+++ b/app.py\\n+API_KEY = \\"sk-prod-12345678\\"\\ndiff --git a/tests/test_app.py b/tests/test_app.py\\n+++ b/tests/test_app.py\\n-assert old_behavior()\\n"
r = redline_scan(diff1, {"app.py", "tests/test_app.py"})
assert r == ["疑似密钥: app.py", "测试删除: tests/test_app.py"], r
r2 = redline_scan("+x = 1\\n+++ b/utils.py", {"app.py"})
assert r2 == ["越界文件: utils.py"], r2
r3 = redline_scan("--- a/old.py\\n+++ b/old.py\\n-old line", {"old.py"})
assert r3 == [], "--- 文件头不算删除行"
r4 = redline_scan("+API_KEY = os.environ[\\"K\\"]", {"app.py"})
assert r4 == [], "从环境变量取的不算硬编码"`,
        allowedModules: ['re'],
        explanation: '三个提取要点：文件名从 `+++ b/` 行取（`--- a/` 是旧路径）；删除行用 `-` 开头但要排除 `---` 头；密钥正则要求引号内 ≥8 字符防误报。这个扫描器就是项目 D 站 3 的红线模块原型。',
        answer: `import re

def redline_scan(diff_text, allowed_files):
    hits = []
    current = None
    key_pat = re.compile(r'(?i)(api_key|secret|token|password)\\s*=\\s*["\\'][^"\\']{8,}')
    for line in diff_text.split("\\n"):
        if line.startswith("+++ b/"):
            current = line[6:].strip()
            if current not in allowed_files:
                hits.append(f"越界文件: {current}")
        elif line.startswith("+") and not line.startswith("+++"):
            if current and key_pat.search(line):
                hits.append(f"疑似密钥: {current}")
        elif line.startswith("-") and not line.startswith("---"):
            if current and current.startswith("test"):
                hits.append(f"测试删除: {current}")
    return hits`,
      },
      {
        id: 'cs146s-w7-l2-e6', type: 'single', difficulty: 4, relatedLessonId: 'cs146s-w7-l2', tags: ['U', 'review'],
        question: '第一遍读法发现：任务"加个 --json 参数"的 diff 改了 15 个文件。最恰当的下一步是？',
        options: [
          { value: 'a', text: '继续逐行审，AI 写的多应该没问题' },
          { value: 'b', text: '先暂停逐行审查：核对改动清单与任务的关系，要求拆分或补充任务依据——范围异常优先于逻辑细节' },
          { value: 'c', text: '直接合并，CI 会兜底' },
          { value: 'd', text: '回复"改动太大，重做"不给理由' },
        ],
        answer: 'b',
        explanation: '三遍读法的顺序设计就是为此：范围异常（大而全/顺手重构）会稀释真实变更、放大回归面，必须在投入逻辑审查前处理。d 缺乏依据分级精神。',
      },
      {
        id: 'cs146s-w7-l2-e7', type: 'open', difficulty: 4, relatedLessonId: 'cs146s-w7-l2', tags: ['D', 'review'],
        question: '对以下 diff 元数据做完整三遍裁定并给出合并/打回结论。任务卡："为导出接口增加字段白名单（Spec AC：只导出 name/email；未授权字段请求记审计日志）。"diff 元数据：改动文件 \[export.py, audit.py, utils_legacy.py, requirements.txt, tests/test_export.py\]；新增依赖 \[pydantic==2.5\]；变更统计 +180/-22；测试改动：test_export.py 删除了 2 条旧断言、新增 6 条。请逐遍给出发现，最后按红线/六维给结论。',
        referenceAnswer: `第一遍（范围）：

- 5 文件 vs 任务主要涉及 export.py——utils_legacy.py 与任务无关（顺手改动嫌疑，需追问）；
- **requirements.txt 新增 pydantic==2.5 且任务卡未讨论——红线：依赖偷渡**（也可能是合理引入，但必须先质询）；
- tests 删了 2 条旧断言——**红线候选：测试被删除**，需看删除理由是否与白名单行为变更相关。

第二遍（逻辑，基于可推断信息）：

- AC1（白名单）与 AC2（审计日志）：audit.py 出现在改动中暗示 AC2 有实现——但必须在真实 diff 中核对"审计日志写的是谁触发、请求了什么字段"（审计不完整的日志等于没审计）；
- 删除的 2 条旧断言若对应"全量导出"旧行为，删除合理；若与白名单无关，红线成立。

第三遍（表面）：pydantic 用于 schema 定义是合理工程选择——但它的引入应该在任务卡或 PR 描述中被论证（供应链审计三问：为什么需要/维护者是谁/有没有更轻的替代）。

结论：**打回**，理由三条——① 依赖偷渡（要求论证或移除）；② 测试删除需逐条说明对应关系；③ utils_legacy.py 改动超出任务范围（拆分或说明）。附审查意见分级：红线 2 条（不讨论）、范围问题 1 条（should_fix）。预计修正后二次审查 5 分钟内可完成。`,
        rubric: [
          { point: '三遍各自有明确发现且顺序正确（范围→逻辑→表面）', score: 3 },
          { point: '识别出依赖偷渡与测试删除两条红线候选', score: 3 },
          { point: '对"合理但未论证"的依赖给出供应链审计三问而非一刀切', score: 2 },
          { point: '结论给出可执行的打回理由与二次审查路径', score: 2 },
        ],
        keywords: ['三遍', '红线', '依赖偷渡', '拆分', '打回'],
        explanation: '本题训练"基于元数据的快速裁定"——真实审查中第一遍往往只看得到这些元数据，判断质量取决于追问设计。',
      },
      {
        id: 'cs146s-w7-l2-e8', type: 'judge', difficulty: 2, relatedLessonId: 'cs146s-w7-l2', tags: ['U', 'review'],
        question: 'AI 生成的测试全部通过且数量多，可以视为该 diff 逻辑正确的有力证据。',
        answer: false,
        explanation: '测试若由同一 Agent 生成，与实现共享盲区（同义反复/happy-path 偏向），通过不能作为正确性证据——要做断言审计与变异抽查。',
      },

      /* ───────── l3 习题（8 题）───────── */
      {
        id: 'cs146s-w7-l3-e1', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-w7-l3', tags: ['K', 'debug'],
        question: '调试循环四环节：______→定位→______→______；其中"验证"环节禁止外包给 AI——AI 可以起草验证脚本，但执行与裁决必须由人完成。',
        blanks: [['复现'], ['假设'], ['验证']],
        explanation: '角色分配：AI 加速三个环节，人保留裁决权——把"AI 说修好了"当验证是最常见的调试事故。',
      },
      {
        id: 'cs146s-w7-l3-e2', type: 'single', difficulty: 2, relatedLessonId: 'cs146s-w7-l3', tags: ['U', 'debug'],
        question: 'AI 把偶现 bug 解释为"缓存不一致"，语气非常笃定。最有价值的下一步是？',
        options: [
          { value: 'a', text: '信了，直接清缓存试试' },
          { value: 'b', text: '要求 AI 给出可证伪预测："若是缓存问题，加这条打印应看到什么？"——用实验检验' },
          { value: 'c', text: '再问一遍别的 AI 取平均' },
          { value: 'd', text: '把这个解释记入文档' },
        ],
        answer: 'b',
        explanation: '把"解释"改造成"可证伪的预测"是三大误导模式的统一反制——预测能被实验检验，解释不能。',
      },
      {
        id: 'cs146s-w7-l3-e3', type: 'judge', difficulty: 2, relatedLessonId: 'cs146s-w7-l3', tags: ['U', 'debug'],
        question: 'AI 解释的通顺程度与正确率正相关，越通顺越可信。',
        answer: false,
        explanation: '通顺是模型的风格属性，不是置信度。自信的错误归因（语气笃定但根因错）正是三大误导模式之首。',
      },
      {
        id: 'cs146s-w7-l3-e4', type: 'multiple', difficulty: 3, relatedLessonId: 'cs146s-w7-l3', tags: ['K', 'debug'],
        question: '二分法的三种形态包括？',
        options: [
          { value: 'a', text: '时间二分（git bisect 定位引入提交）' },
          { value: 'b', text: '空间二分（输出对分定位坏段）' },
          { value: 'c', text: '变量二分（环境差异对比）' },
          { value: 'd', text: '代码量二分（删一半代码看还报不报错）' },
        ],
        answer: ['a', 'b', 'c'],
        explanation: 'd 是破坏现场的野路子——二分的前提是"观察而不改变被测对象"（bisect 切换提交是受控例外）。',
      },
      {
        id: 'cs146s-w7-l3-e5', type: 'code', difficulty: 4, relatedLessonId: 'cs146s-w7-l3', tags: ['D', 'debug'],
        question: '实现多级对分定位器 `deep_bisect(stages: list, data, is_bad) -> int`：stages 是依次施加的函数列表，返回坏结果**最早出现**的 stage 下标（若初始数据已坏返回 -1，全程不坏返回 len(stages)）。要求用对分而非逐级遍历。',
        lang: 'python',
        starterCode: `def deep_bisect(stages, data, is_bad):
    pass

stages = [lambda d: [x*2 for x in d], lambda d: [x+1 for x in d], lambda d: [x if x != 5 else -1 for x in d]]
print(deep_bisect(stages, [1, 2], lambda out: any(x < 0 for x in out)))
print(deep_bisect(stages, [3], lambda out: any(x < 0 for x in out)))
print(deep_bisect(stages, [-1], lambda out: any(x < 0 for x in out)))`,
        expectedOutput: '2\n3\n-1',
        tests: `stages = [lambda d: [x*2 for x in d], lambda d: [x+1 for x in d], lambda d: [x if x != 5 else -1 for x in d]]
bad = lambda out: any(x < 0 for x in out)
assert deep_bisect(stages, [1, 2], bad) == 2, "stage2 注入 -1"
assert deep_bisect(stages, [3], bad) == 3, "全程不坏 -> len(stages)"
assert deep_bisect(stages, [-1], bad) == -1, "初始已坏"
stages2 = [lambda d: d, lambda d: [x if x != 2 else -9 for x in d], lambda d: [x*10 for x in d]]
assert deep_bisect(stages2, [2], bad) == 1
assert deep_bisect([], [1], bad) == 0, "无 stage 且初始不坏 -> 0"`,
        allowedModules: [],
        explanation: '对分逻辑：先判初始（-1），再在 [0, len] 区间对分——中点检查"前 mid+1 级输出已坏？"，已坏则注入点在左半，否则右半。比逐级遍历从 O(n) 降到 O(log n)——演示注释的"探查次数"结论的推广。',
        answer: `def deep_bisect(stages, data, is_bad):
    if is_bad(list(data)):
        return -1
    lo, hi = 0, len(stages)
    while lo < hi:
        mid = (lo + hi) // 2
        out = list(data)
        for f in stages[:mid+1]:
            out = f(out)
        if is_bad(out):
            hi = mid
        else:
            lo = mid + 1
    return lo`,
      },
      {
        id: 'cs146s-w7-l3-e6', type: 'single', difficulty: 3, relatedLessonId: 'cs146s-w7-l3', tags: ['U', 'debug'],
        question: '"补丁式修复"（在症状处 try-except 让报错消失）最大的隐患是？',
        options: [
          { value: 'a', text: '代码变长' },
          { value: 'b', text: '根因仍在且现场被改变——三天后真查时症状已变形，且可能静默丢失数据' },
          { value: 'c', text: 'AI 会不高兴' },
          { value: 'd', text: '影响编译速度' },
        ],
        answer: 'b',
        explanation: '补丁的双重代价：掩盖根因 + 污染现场（供应商 C 案例里 try-except 跳过 = 5% 数据静默丢失）。紧急止血可以但必须登记"根因待查"并限期。',
      },
      {
        id: 'cs146s-w7-l3-e7', type: 'open', difficulty: 4, relatedLessonId: 'cs146s-w7-l3', tags: ['D', 'debug'],
        question: '复盘一次你真实经历的调试（AI 参与过的）：① 按四环节还原过程，标注每个环节 AI 承担了什么、人承担了什么；② 有没有发生三大误导模式（自信归因/补丁修复/上下文外臆测）？当时如何发现或为何没发现；③ 用本节方法重新设计那次调试的关键一步。',
        referenceAnswer: `参考复盘结构（以"偶现空指针"为例）：

| 环节 | AI 承担 | 人承担 |
| --- | --- | --- |
| 复现 | 从报错日志起草复现用例 | 确认复现率、收敛最小输入 |
| 定位 | 解释 traceback、建议断点 | 亲自加打印、跑二分 |
| 假设 | 补充"可能是异步时序"（人没想到） | 排序假设、设计区分实验 |
| 验证 | 起草并发压测脚本 | 审脚本、跑、裁决 |

误导模式自查：当时发生了"补丁式修复"——先加了 if not x: return 默认值让报错消失，两天后同型 bug 在另一路径复发才回头查根因（异步初始化顺序）。没早点发现的原因：补丁后测试全绿，制造了"已修复"的错觉。

重新设计的关键一步：在打补丁前强制"可证伪预测"——"若是初始化顺序问题，在初始化完成前调用应 100% 失败、完成后应 0% 失败"——一个最小实验就能把假设钉死，补丁会变成正确的修复（等初始化）而不是掩盖。`,
        rubric: [
          { point: '四环节还原完整且人/AI 角色标注准确', score: 3 },
          { point: '误导模式识别诚实（承认发生比声称没有更有价值）', score: 3 },
          { point: '重设计的步骤体现"可证伪预测"方法', score: 2 },
          { point: '复盘包含"为何当时没发现"的机制分析（测试全绿的错觉等）', score: 2 },
        ],
        keywords: ['四环节', '验证', '补丁', '可证伪', '时序'],
        explanation: '调试复盘的元目标：把"这次运气好"转化为"下次流程对"——人/AI 角色错位是可修复的流程问题。',
      },
      {
        id: 'cs146s-w7-l3-e8', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-w7-l3', tags: ['K', 'debug'],
        question: '贴日志给外部 AI 前必须______——连接串、token、用户数据是调试上下文的头号泄露源。',
        blanks: [['脱敏', '去除敏感信息']],
        explanation: '调试上下文盘点（w6-l1 的攻击面方法在调试场景的应用）。',
      },
    ],
  },
];
