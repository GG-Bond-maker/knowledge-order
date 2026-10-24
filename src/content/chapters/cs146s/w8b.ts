import type { Chapter } from '../../../types';

/* ============================================================
 *  CS146S Fall 2026 · Week 8（续）：端到端验收与生产三件套
 *
 *  结构依据：Stanford CS146S Fall 2026 官方大纲（themodernsoftware.dev，
 *  官方作业仓库 mihail911/modern-software-dev-assignments）。
 *  本课程为参照官方大纲组织的自学教材，讲义内容为自主扩展编写。
 *
 *  来源：
 *  - 官方：CS146S 课程站 Week 8 主题（Automated App Building）——本周
 *    官方作业为 multi-stack AI-generated web apps（主题锚点，见 w8.ts l3）；
 *    本文件两节（端到端验收 / 生产三件套）为课程的自主扩展编写
 *  - 官方资料：Playwright 官方文档（定位器与最佳实践）、React 官方文档
 *    （Error Boundary）、Vercel 官方文档（环境变量）、WCAG 2.1 快速参考
 *  - 原创：冒烟清单方法、语义选择器策略、E2E 冒烟 runner 模拟、
 *    生产三件套框架、就绪检查器、全部习题
 * ============================================================ */

export const cs146sW8ExtraChapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'cs146s-w8-c2',
    title: 'Week 8（续）· 端到端验收与生产三件套',
    goal: '对 AI 生成的应用实施端到端验收：用冒烟清单、语义选择器、视觉回归与无头验收守住集成层；再把通过验收的原型补上"生产三件套"（错误边界与反馈通道、可观测埋点、环境配置分离），并看清本课程五大项目如何串成一条从生成到运行的生产线。',
    lessons: [
      /* ─────────────────────────── l4 ─────────────────────────── */
      {
        id: 'cs146s-w8-l4',
        title: '端到端验收：AI 生成的应用怎么测',
        difficulty: 4,
        content: `
### 学习目标

学完本节，你应该能够：
1. 解释 E2E 测试在 AI 生成应用中的特殊地位——单元测试各自全绿也盖不住集成鸿沟，并为一个应用设计 5-8 条覆盖加载 / 核心操作 / 错误态 / 空态的冒烟清单；
2. 制定语义选择器策略（data-testid / role+name 优先于 CSS 路径），说明它与"AI 频繁重构"这一前提的因果关系，并量化评估一组选择器的脆弱度；
3. 说出视觉回归的三个要素（基线 / 阈值 / 噪音处理）与无头验收接入 CI 的要点，并能解读一份冒烟测试失败报告。

### 前置知识

- w6b-l4：AI 生成的测试套件怎么评估与驯服——本节聚焦的 E2E 是测试金字塔的另一层；
- w3-l3 的 GWT 写法：冒烟路径本质上是"用户旅程版的 AC"；
- w8-l2 的键盘导航 AC：本节会把它变成冒烟用例；
- w4 的 headless 模式概念：无头验收的技术基础。

### 问题背景

AI 生成应用有一类极难缠的回归：**单元测试全绿，应用已经白了**。原因很朴素——单元测试测的是"零件"，而应用坏在"装配"：路由跳转后状态丢了、两个各自正确的模块对不上字段名、接口失败时组件没接住。这些接缝（集成鸿沟）恰好是 AI 生成最常出问题的地方：AI 可以把每个函数都写对，但把五个正确的部分拼成一个错的整体。

更糟的是 AI 重构的频率：人类团队一年重构几次，AI 一下午就能重构五次——每次重构都可能改掉 DOM 结构。如果测试依赖"第 3 个 div 里的第 2 个 button"这种路径描述，那么每次重构都会炸掉一片测试，团队很快学会"红灯不用管"，测试体系名存实亡。本节给出一套为此量身定制的端到端验收方法：**少而稳的冒烟清单 + 重构存活的选择器 + 抗噪音的视觉回归 + CI 里的无头执行**。

### 直觉理解

造车厂有两道检验：**零件检验**（每个螺丝、每块钢板合格）与**整车下线检验**（整辆车开上测试跑道，点火、起步、刹车、开雨刮）。单元测试是零件检验，E2E 是整车下线——它不关心你用什么工艺造的零件，只关心踩下刹车时车停不停。

AI 生成应用相当于换了一条全自动装配线：零件检验依然要做，但**新装配线的最大风险是装配环节本身**（零件都对，装错了位）。所以整车下线检验（E2E）的地位从"锦上添花"变成了"关键闸门"——这正是它在 AI 生成应用中地位特殊的原因。

### 核心概念与原理详解

## E2E 盖住的是什么：集成鸿沟

单元/组件测试把应用切成孤立单元验证；应用的真实行为发生在四个接缝上，任何单元测试都盖不住：

1. **路由接缝**：从页面 A 跳到 B，B 的状态初始化对吗？回退后呢？
2. **数据接缝**：接口返回的真实 JSON 结构与组件期望一致吗？字段名对得上吗？
3. **时序接缝**：请求未返回时用户点了按钮会怎样？竞态谁赢？
4. **持久化接缝**：写入的数据刷新后还在吗？登出再登录呢？

AI 生成的代码恰好集中在接缝处出错（各模块独立正确、契约对不齐）。E2E 用真实浏览器、真实网络栈走用户旅程，是唯一直接检验接缝的手段。

## 冒烟清单：少而稳的关键路径

E2E 慢且脆，所以**只测关键路径**——应用"不可用"的判定路径。设计纪律：

| 要素 | 纪律 |
| --- | --- |
| 数量 | 5-8 条（每条 1-3 分钟内跑完，全套 ≤ 10 分钟） |
| 覆盖 | 四类：加载（首屏能开）/ 核心操作（主功能走得通）/ 错误态（出错有提示不白屏）/ 空态（无数据不崩溃） |
| 写法 | GWT 或路径式：每条可独立运行、失败原因自解释 |
| 禁区 | 不测视觉细节（交给视觉回归）、不测业务规则全分支（交给单元测试） |

"任务看板"的六条示例：① 首屏加载出标题；② 新建任务后计数 +1；③ 筛选后列表正确收窄；④ 空列表显示空态提示；⑤ 接口 500 时显示错误提示与重试按钮；⑥ 键盘可完成"新建→编辑→保存"（承接 w8-l2 的 AC1）。

## 选择器策略：为"高频重构"而生

| 选择器类型 | 例 | AI 重构后 | 结论 |
| --- | --- | --- | --- |
| 绝对 CSS 路径 | div > div:nth-child(2) > button | 几乎必碎 | 禁用 |
| XPath | //div[2]/ul/li[3] | 几乎必碎 | 禁用 |
| 样式类名 | .btn-primary | 易碎（改样式即碎） | 慎用 |
| 语义选择器 | data-testid / role+name / aria-label | 稳定（重构保语义） | **首选** |

原理：重构改变的是**实现**（DOM 层级、类名），不该改变**语义**（这是"新建任务"按钮）。语义选择器锚定语义，所以重构存活。配套团队纪律（写进 Spec）：**AI 生成的每个可交互元素必须带 data-testid**——这不是测试的义务，是生成代码的验收标准之一。定位器与可访问性在此合流：role 与 aria-label 既是屏幕阅读器的锚点也是测试的锚点，写好可访问性等于免费获得稳定选择器。

## 视觉回归：概念级方案

视觉回归 = 把"长得对不对"变成可自动比对的像素问题，三要素：

1. **基线截图**：先录制一张经过人工确认的"正确样子"作为基准；
2. **差异阈值**：像素差比例超过阈值（如 0.5%）才报警——抗亚像素级抗锯齿抖动；
3. **噪音处理**：动态内容（时间戳、头像、广告位）要么遮蔽（mask）要么截取元素级截图；测试前冻结时间与随机数据。

缺了噪音处理的视觉回归会被"每天都有新头像"淹没，一周后所有人开始无脑忽略它的报警——工具死于狼来了。

## 无头验收：进 CI 才算数

呼应 w4 的 headless 模式与 Week 5 的 CLI 自动化：E2E 必须以无头模式跑在 CI 里，每次 PR 自动执行。要点：失败时留痕（失败截图 + trace 文件，让"红灯"可以事后诊断）；冒烟失败即阻断合并（项目 D 门禁思想的应用）；本地用有头模式调试、CI 用无头模式执法。

### 完整案例

背景：w8-l1 那个"会议室预约"原型已按鸿沟清单补齐，现在为它配 E2E 冒烟验收。六条路径（GWT 节选）：

- P1 加载：Given 正常网络，When 打开首页，Then 标题与预约列表可见；
- P2 核心操作：Given 列表为空，When 新建一条预约，Then 计数变为 1 且新条目在列表首位；
- P3 核心操作：Given 已有 3 条预约，When 点击"只看今天"，Then 列表只剩今天的预约；
- P4 空态：Given 新用户首访（无数据），When 打开页面，Then 显示空态引导而非空白区域；
- P5 错误态：Given 接口返回 500，When 打开页面，Then 显示错误提示与重试按钮（不是白屏）；
- P6 键盘：Given 页面加载完成，When 只用 Tab 与 Enter，Then 能完成新建预约。

一周后，另一位工程师让 AI 重构了前端（改了组件结构、换了图标库）。CI 冒烟报告：P1、P3、P4 通过；P2 失败——"data-testid=btn-new 语义定位未命中"（重构把 testid 弄丢了）；P5 失败——error-tip 未命中（错误 UI 整个被删，接口失败时白屏）。**注意单元测试仍然全绿**——被删的错误 UI 没有对应单元测试。两个失败直指两种最典型的 AI 重构回归：语义丢失与异常路径被简化。

**自解释提示**：为什么失败报告"一读就懂"？因为语义选择器把失败翻译成了业务语言（"新建按钮找不到了"），而不是"div[2] 不存在"。**报告的可读性是选择器策略的红利**——它决定了红灯被认真对待还是被习惯性忽略。

### 代码实践

下面的"模拟 E2E 冒烟 runner"在浏览器内运行：页面状态机（loading → ready / error）+ 语义选择器模拟定位 + 关键路径断言。跑两个场景——健康应用与"AI 重构后"的应用，观察后者如何被 5 条路径中的 2 条拦下，以及失败报告如何把问题翻译成业务语言。

### 常见误区与安全风险

- **误区一："E2E 越多越好。"** E2E 位于测试金字塔顶层：慢、脆、维护贵。超过 20 条的冒烟清单通常意味着把单元测试的活儿派给了最贵的工具。纪律是关键路径之外的断言全部下沉。
- **误区二："选择器用什么都行，能跑通就好。"** 今天的"能跑通"是明天重构的债。绝对路径选择器让测试与 DOM 结构耦合，AI 高频重构下等于给测试体系判死刑。
- **误区三："等待用 sleep(3) 就行。"** 固定等待要么等不够（偶发失败）要么等过头（整套变慢）。用状态等待（等元素出现、等网络空闲）替代时间等待——flaky 用例的一大来源就是 sleep。
- **误区四："flaky 用例重跑通过就没事了。"** 时好时坏的用例会训练团队无视红灯。正确动作是定位根因（等待方式 / 测试数据 / 环境依赖），重跑通过只是运气。
- **安全提示**：E2E 测试代码与录制的 trace 里常包含真实账号、token 与用户数据——测试仓库的凭据与生产凭据必须隔离（呼应 w6 凭据纪律），失败截图上传前过一遍敏感信息检查。

### 知识关联：承上启下

- 承上：w6b-l4（测试套件的评估方法同样适用于 E2E 层）；w3-l3（GWT 让冒烟路径可判）；w8-l2（键盘/对比度 AC 在这里变成可执行用例）；w4 与 Week 5（headless 执行与 CLI 自动化是 CI 验收的技术底座）；
- 启下：l5 把通过端到端验收的应用补上生产三件套——E2E 验收"此刻可用"，三件套保证"持续可用"；w9 的可观测性接手 E2E 盖不住的部分：生产环境的真实用户会走出你清单外的第 7、8、9 条路径，那要靠监控发现。

### 动手实验

1. 运行下方冒烟 runner，记录健康应用与"AI 重构后"应用的差异路径，读出每条失败的业务含义；
2. 给你自己的（或案例中的）应用补一条冒烟路径：写入 Spec（GWT）、设计语义选择器、说明它属于四类覆盖中的哪一类——本节 open 习题要求完整设计一套冒烟方案。

### 本节总结

1. E2E 在 AI 生成应用中地位特殊：单元测试盖不住路由/数据/时序/持久化四个接缝，而 AI 恰好爱在接缝处出错；
2. 冒烟清单 5-8 条、覆盖加载/核心操作/错误态/空态，关键路径之外的断言下沉到单元测试；
3. 语义选择器（data-testid / role+name / aria-label）锚定语义而非实现，是 AI 高频重构下唯一稳定的策略；"每个可交互元素必须带 testid"要写进 Spec；
4. 视觉回归三要素：基线、阈值、噪音处理（mask 动态区域 / 元素级截图 / 冻结时间）——缺噪音处理必死于狼来了；
5. 无头验收进 CI：失败留截图与 trace，冒烟红灯阻断合并——测试从"本地自觉"变成"系统默认"。

### 参考资料与延伸阅读

- [Playwright 官方文档](https://playwright.dev)——定位器（getByRole / getByTestId）与"最佳实践：不要用绝对路径选择器"：对应"选择器策略"模块；无头执行与 trace 调试：对应"无头验收"模块；
- [WCAG 2.1 快速参考（W3C 官方）](https://www.w3.org/WAI/WCAG21/quickref/)——键盘可达（2.1.1）与名称/角色/值（4.1.2）：语义选择器与可访问性同源的标准依据；
- [React 官方文档：Testing](https://react.dev/learn/testing)——测试金字塔中各层分工的官方论述：对应"冒烟清单纪律"；
- 本节冒烟清单方法、选择器脆弱度表、E2E 冒烟 runner 模拟均为自主设计的原创教学内容（官方作业 multi-stack web apps 仅作周主题锚点）。

### 本节习题导引

fill/single/judge 校准冒烟设计与选择器策略；两道 code 题分别实现冒烟报告汇总与选择器脆弱度分类；open 题为"购物车"应用设计完整的 E2E 验收方案。
`,
        tips: [
          { kind: 'pitfall', text: '把"AI 生成的每个可交互元素必须带 data-testid"写进 Spec 的改动反例清单之外、AC 之内——没有这条，你从生成那一刻起就在制造脆弱测试。' },
          { kind: 'interview', text: '"单元测试全绿为什么应用还是坏的？"——答四个接缝（路由/数据/时序/持久化）+ E2E 的整车下线类比，再补一句"AI 生成恰恰放大了接缝风险"。' },
          { kind: 'performance', text: '冒烟全套控制在 10 分钟内：CI 里超过 15 分钟的验收会被工程师绕过（本地不跑、只等 CI、红灯习惯性重跑）——验收体系的敌人是等待。' },
          { kind: 'note', text: 'flaky 用例设 quarantine（隔离区）而不是直接删：移出主线但保留追踪，每周清一次——既保红线干净又不丢线索。' },
        ],
        demos: [
          {
            title: '模拟 E2E 冒烟 runner：语义选择器 + 关键路径断言',
            lang: 'python',
            code: `# 模拟 E2E 冒烟 runner: 页面状态机(loading -> ready/error) + 语义选择器定位 + 关键路径断言
# 对应真实框架: Playwright 的 page.goto / page.getByTestId / expect()

class FakeApp:
    """极简页面模型: 元素字典 + 状态机。真实浏览器里元素按 DOM 树组织,
    这里用 data-testid 索引 —— 冒烟 runner 只依赖语义选择器, 不依赖 CSS 路径。"""

    def __init__(self, elements, boot="ready"):
        self.elements = elements
        self.boot = boot
        self.state = "loading"          # 状态机: loading -> ready / error

    def goto(self, url):
        self.state = self.boot          # 首屏加载结果进入 ready 或 error 态
        return self.state

    def get(self, testid):
        if testid not in self.elements:
            raise LookupError(f"[data-testid={testid}] 语义定位未命中")
        return self.elements[testid]

def run_step(app, step):
    op = step[0]
    if op == "click":
        app.get(step[1])                # 点击前先语义定位
    elif op == "expect_text":
        el = app.get(step[1])
        actual = el.get("text", "")
        if step[2] not in actual:
            raise AssertionError(f"断言失败: 期望含 {step[2]!r}, 实际 {actual!r}")

def run_suite(title, paths):
    print(f"== 冒烟报告: {title} ==")
    passed = 0
    for p in paths:
        app = FakeApp(p["elements"], p.get("boot", "ready"))
        app.goto(p["url"])
        try:
            for step in p["steps"]:
                run_step(app, step)
            passed += 1
            print(f"  PASS {p['name']}")
        except (LookupError, AssertionError) as e:
            print(f"  FAIL {p['name']} -> {e}")
    total = len(paths)
    verdict = "全部通过" if passed == total else f"失败 {total - passed} 条 -> CI 阻断(exit 1)"
    print(f"  合计 {passed}/{total}: {verdict}")
    print()
    return passed == total

BOARD = {"board-title": {"role": "heading", "text": "任务看板"},
         "btn-new": {"role": "button", "name": "新建任务"},
         "btn-filter": {"role": "button", "name": "筛选"},
         "task-count": {"role": "status", "text": "共 1 个任务"},
         "empty-tip": {"role": "status", "text": "还没有任务, 点击新建开始"},
         "error-tip": {"role": "alert", "text": "加载失败, 请重试"}}

REFACTORED = {"board-title": {"role": "heading", "text": "任务看板"},
              "btn-filter": {"role": "button", "name": "筛选"},
              "task-count": {"role": "status", "text": "共 1 个任务"},
              "empty-tip": {"role": "status", "text": "还没有任务, 点击新建开始"}}
# 注意: REFACTORED 是同一场 AI 重构后的应用 —— btn-new 丢了 testid, 错误 UI 整个被删

SMOKE = [
    {"name": "首屏加载",   "url": "/board",        "elements": BOARD,
     "steps": [("expect_text", "board-title", "任务看板")]},
    {"name": "新建任务",   "url": "/board",        "elements": BOARD,
     "steps": [("click", "btn-new"), ("expect_text", "task-count", "1")]},
    {"name": "筛选任务",   "url": "/board",        "elements": BOARD,
     "steps": [("click", "btn-filter"), ("expect_text", "task-count", "1")]},
    {"name": "空态提示",   "url": "/board-empty",  "elements": BOARD,
     "steps": [("expect_text", "empty-tip", "还没有任务")]},
    {"name": "加载失败提示", "url": "/board-broken", "elements": BOARD, "boot": "error",
     "steps": [("expect_text", "error-tip", "加载失败")]},
]

SMOKE_REFACTORED = [
    {"name": "首屏加载",   "url": "/board",        "elements": REFACTORED,
     "steps": [("expect_text", "board-title", "任务看板")]},
    {"name": "新建任务",   "url": "/board",        "elements": REFACTORED,
     "steps": [("click", "btn-new"), ("expect_text", "task-count", "1")]},
    {"name": "筛选任务",   "url": "/board",        "elements": REFACTORED,
     "steps": [("click", "btn-filter"), ("expect_text", "task-count", "1")]},
    {"name": "空态提示",   "url": "/board-empty",  "elements": REFACTORED,
     "steps": [("expect_text", "empty-tip", "还没有任务")]},
    {"name": "加载失败提示", "url": "/board-broken", "elements": REFACTORED, "boot": "error",
     "steps": [("expect_text", "error-tip", "加载失败")]},
]

ok1 = run_suite("健康应用(验收前)", SMOKE)
ok2 = run_suite("AI 重构后(丢了 testid 与错误 UI)", SMOKE_REFACTORED)
print("结论: 单元测试可以全绿, 但冒烟 runner 抓住了集成层回归 ——")
print("这就是 E2E 在 AI 生成应用中不可替代的原因; 语义选择器让失败原因一读就懂")`,
          },
        ],
      },

      /* ─────────────────────────── l5 ─────────────────────────── */
      {
        id: 'cs146s-w8b-l5',
        title: '实践串联：给 AI 应用补上生产三件套',
        difficulty: 3,
        content: `
### 学习目标

学完本节，你应该能够：
1. 说出"生产三件套"（错误边界与用户反馈通道 / 可观测埋点 / 环境配置分离）分别把哪一类生产事故扼杀在摇篮里，并为每件套写出机器可判的验收标准；
2. 划清 AI 与人在三件套中的分工——AI 生成样板代码，人定结构与验收（事件命名规范、降级策略、密钥管理）；
3. 用生产就绪检查清单验收一个 AI 生成应用，并画出本课程五大项目（A→B→C→D→本节）串成的完整生产线。

### 前置知识

- w8-l1 鸿沟清单（三件套是"错误处理 + 安全"两项的落地件）与 l4 的端到端验收（三件套本身也要过验收）；
- w6-l1 / w7-l2 的凭据红线（密钥不入代码与 diff 扫描）；
- w9 的预告知识：可观测性三支柱（logs/metrics/traces）——本节的埋点是它未来的数据源。

### 问题背景

演示日之后的一周，通常是 AI 生成应用的"事故三连击"：

1. **白屏事件**：某个组件抛了一个 AI 没预料到的异常，整个应用白屏，用户流失，而工程团队毫不知情——直到客服转来截图；
2. **盲飞事件**：用户抱怨"按钮点不动"，但没有任何数据能回答"有多少用户遇到、在哪一步、报了什么错"——应用没有埋点，排障全靠猜；
3. **串配置事件**：用"改配置再打包"的方式切换环境，某次打包把开发环境的接口与测试密钥带上了生产——因为配置和代码搅在一起。

这三类事故分别对应三件套的缺失：**错误边界与反馈通道**（崩溃不白屏、用户能一键上报）、**可观测埋点**（关键行为有数据）、**环境配置分离**（配置按环境注入、密钥不进代码）。它们是"原型"与"应用"之间最后也是最容易省略的一公里——因为不出事时它们看起来毫无用处。

### 直觉理解

把量产车与概念车的最后改装清单列出来：

- **安全气囊 + 双闪灯**：碰撞不可怕，可怕的是碰撞后既没有保护也没有求救信号——错误边界（降级 UI）与反馈通道（一键上报）就是气囊和双闪；
- **仪表盘 + 行车记录仪**：开夜车没有仪表盘，你只能靠发动机的声音猜时速——埋点让"应用此刻怎么样"从猜变成看；
- **按场地加载的调校参数**：同一辆车在城市道路和赛道用不同的调校，但没人会在赛场上手改发动机——配置按环境注入，密钥只存在服务端。

三件套的共同点：**平时隐形，出事时定生死。** 这也是它们最常被砍掉的原因——砍掉的那天，正是项目看起来最健康的时候。

### 核心概念与原理详解

## 三件套之一：错误边界与用户反馈通道

前端的特点是**一个组件崩溃会拖垮整棵渲染树**——除非有错误边界（Error Boundary）拦截。React 的机制是两个生命周期钩子：\`getDerivedStateFromError\` 负责降级渲染，\`componentDidCatch\` 负责上报：

\`\`\`tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) {
    // 崩溃也是关键行为: 上报错误与组件栈 (为 w9 可观测性埋线)
    track("error", { message: String(error), stack: info.componentStack });
  }
  render() {
    if (this.state.hasError) return <FallbackUI onReport={reportFeedback} />;
    return this.props.children;
  }
}
\`\`\`

两条工程纪律：**分区域包裹**（列表区崩了不影响侧边栏，而不是全应用一个边界包到底）；**降级 UI 必须可用**（给出"重试"与"反馈"入口，用户面对的不是死白屏）。反馈通道的意义：用户报告携带上下文（错误信息 + 应用版本 + 最近操作序列），把"点不动"变成可定位的事件。

## 三件套之二：可观测埋点

关键行为打点，最小事件表三条：

| 事件 | 记录什么 | 回答什么问题 |
| --- | --- | --- |
| page_view | 页面路径 + 加载耗时 | 多少人用、哪里慢 |
| action_click | 核心操作（新建任务/提交订单…）+ 成败 | 转化漏斗断在哪一步 |
| error | JS 异常 + 接口失败（信息 + 版本 + 脱敏上下文） | 多少人在报错、报什么错 |

命名规范人定（如"对象_动作"：task_create），AI 按规范生成打点调用。两条红线：**不打 PII**（手机号、身份证进埋点即泄露事件）；**埋点是采样与聚合的输入**——w9 的可观测性（metrics/traces）都建立在这些事件之上，埋点缺了，运维就是无源之水。

## 三件套之三：环境配置分离

\`\`\`text
.env.development   VITE_API_URL=http://localhost:3000   （本地, 可进 git）
.env.staging       VITE_API_URL=https://staging.example.com （CI 按 deploy 目标注入）
.env.production    VITE_API_URL=https://api.example.com     （密钥只存服务端/密钥管理服务）
\`\`\`

纪律三条：配置与代码分离、按环境注入（构建/部署时决定，而不是运行时 if 手改）；**.env 生产文件不进 git**；**密钥永不进前端代码**——前端的 bundle 是公开的，任何进前端的"密钥"都等于直接公布（w6 凭据纪律在前端的具体化：能进前端的只有"公开标识符"，真正的密钥调用走服务端代理）。

## AI 与人的分工

| 工作 | 谁做 | 为什么 |
| --- | --- | --- |
| ErrorBoundary 类、埋点包装器、config 加载器的样板代码 | AI 生成 | 模式固定、样板量大、可生成后过测试 |
| 事件命名规范、降级策略（哪些区域允许降级）、密钥管理流程 | 人定 | 结构性决策，错了改不动 |
| 三件套的验收（打点齐全、密钥扫描、降级路径 E2E） | 人写标准 + 机器执行 | 呼应 l4：验收自动化 |

一句话：**AI 写"长这样的代码"，人定"为什么这样长"。** 结构定了之后，三件套的绝大多数实现都可以放心委托——因为每件都有可判的验收标准兜底。

## 五项目串联：从生成到运行的生产线

本课程五大项目至此完成闭环：

| 项目 | 章锚 | 在生产线上的位置 |
| --- | --- | --- |
| A 简化版 Coding Agent | w4 | 执行者：驱动一切生成动作的 agent loop |
| B 规格驱动仓库改造 | w3 | 输入端：Spec 与验收脚本（三件套也要先有 Spec） |
| C MCP 集成与权限管控 | w2 | 受控通道：生成过程权限受控、可审计 |
| D AI 代码安全流水线 | w6-w7 | 质量闸门：测试/扫描/审查/门禁 |
| 本节：三件套 + w9 运维 | w8→w9 | 运行端：装进气囊与仪表盘，交棒给运维 |

<Diagram type="factoryloop" />

把闭环读一遍：**生成**（Spec 驱动 AI 产出应用）→ **验收**（l4 冒烟 + D 流水线）→ **运行**（本节三件套兜底）→ **度量**（埋点回流数据）→ **改进**（数据回写 Spec，进入下一轮生成）。毕业项目（cs146s-final 的项目 E）就是把这条闭环做成可持续运转的 Software Factory——本周你亲手走完了它的第一次循环。

### 完整案例

给"任务看板"原型补三件套（每步附"为什么"）：

1. **错误边界**：为列表区与表单区各包一层 ErrorBoundary，降级 UI 提供"重试"与"反馈"按钮。为什么分区域：看板的主要价值在列表，表单崩溃不该连累列表一起消失。验收：AC——Given 表单组件注入抛错，When 渲染，Then 列表区仍可见且反馈按钮可点击（E2E 可断言）。
2. **埋点**：按最小事件表接入 page_view / task_create / error 三个事件，命名规范"对象_动作"。为什么只打三个：先保证"每次排障都有的看"的最小集，事件表会随 w9 的度量需求生长，而不是一次打 50 个再全删。验收：AC——Given 完成一次新建任务，When 查看事件流，Then 恰好有一条 task_create 且含成败字段。
3. **环境配置**：拆出 .env.development / staging / production，接口地址全部走注入；登录凭证改为服务端代理持有。为什么现在做：三件套里只有这项"越晚做越痛"——每次换环境手改代码的习惯，拖一周就多一次事故机会。验收：AC——Given CI 部署到 staging，When 检查构建产物，Then 不含任何密钥字面量（w7 红线扫描自动判）。

**自解释提示**：三条验收全部机器可判——这不是巧合而是方法论：三件套最容易在"以后再说"中烂尾，可判的验收标准是防止烂尾的唯一手段。

### 代码实践

下面的"生产三件套就绪检查器"在浏览器内运行：输入应用的元信息（有无错误边界/反馈通道、埋点事件表、密钥位置、环境列表），输出缺失项与就绪度。红线项（密钥进前端）与普通缺失项在报告里同等醒目——上线前它应该全部变绿。

### 常见误区与安全风险

- **误区一："埋点越多越好。"** 每次 hover、每次输入都打点，得到的是噪音海洋与隐私风险。最小事件表起步，事件随问题生长；**PII 永不进埋点**——打点系统是内部系统里最常被轻视的泄露面。
- **误区二："全应用包一层错误边界就完事。"** 全局边界意味着任何角落崩溃都丢掉整个界面；正确的粒度是按功能区包裹，且降级 UI 自身要测试过（降级 UI 自己崩溃是真实事故）。
- **误区三："前端代码里判断一下环境就不算泄露密钥。"** 前端 bundle 完全公开：变量名混淆、NODE_ENV 分支都挡不住一个"查看源代码"。能进前端的只有公开标识符，敏感调用一律走服务端代理。
- **误区四："三件套让 AI 顺手生成掉就行。"** 样板可以委托，结构不可以：事件命名一旦混乱就再也无法聚合分析，降级策略定错等于事故时多坏一层。人定结构、AI 填实现、机器验收获——三方各就各位。
- **安全提示**：反馈通道是"用户直连应用内部信息"的口子——上报内容在收集侧就要做脱敏（自动剔除 token、路径中的用户名），否则你的排障便利会变成攻击者的情报通道（w6 威胁模型的反馈面）。

### 知识关联：承上启下

- 承上：w8-l1 鸿沟清单（三件套落地其中"错误处理 + 安全"两项）；l4（三件套的每条验收都依赖语义选择器与 E2E 手段）；w6-l1 / w7-l2（密钥红线与 diff 扫描在这里变成构建产物检查）；w2-w7 五个项目（本节完成 A→B→C→D 的串联闭环）；
- 启下：w9 部署后运维——本节的埋点是 w9 可观测性三支柱的数据源，错误上报是告警的前身；cs146s-final 的项目 E 把"生成-验收-运行-度量-改进"的 factoryloop 闭环做成可持续的 Software Factory。

### 动手实验

1. 运行下方就绪检查器，记录"演示日原型"与"补齐三件套后"的差距项；
2. 打开 factoryloop 交互图，把五项目（A/B/C/D/本节）对号入座到闭环的五个环节上——然后回答：你的下一个 AI 生成应用，第一个要补的件套是什么、它的验收标准怎么写？

### 本节总结

1. 生产三件套各挡一类事故：错误边界与反馈通道挡"白屏且失联"，埋点挡"盲飞排障"，环境配置分离挡"串配置与密钥泄露"；
2. 错误边界按功能区包裹、降级 UI 必须可用；埋点从最小事件表（page_view/action_click/error）起步、永不携带 PII；
3. 前端 bundle 公开：密钥永不进前端代码，敏感调用走服务端代理；.env 生产文件不进 git，配置按环境注入；
4. 分工纪律：AI 生成样板、人定结构（命名规范/降级策略/密钥管理）、机器执行验收；
5. 五项目串联成线：A 执行者 → B 输入端 → C 受控通道 → D 质量闸门 → 本节运行端——factoryloop 闭环在毕业项目里将成为可持续的 Software Factory。

### 参考资料与延伸阅读

- [React 官方文档：Error Boundary](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)——getDerivedStateFromError / componentDidCatch 机制的权威出处：对应"三件套之一"模块；
- [Vercel 官方文档：Environment Variables](https://vercel.com/docs/environment-variables)——按环境注入配置与构建产物检查的官方实践：对应"三件套之三"模块；
- [Google SRE Book（w9 预告阅读）](https://sre.google/sre-book/monitoring-distributed-systems/)——监控四黄金信号：本节埋点事件表在运维侧的延伸方向，对应"可观测埋点"模块；
- [官方作业仓库](https://github.com/mihail911/modern-software-dev-assignments) week8——周主题锚点；本节三件套框架、分工表、就绪检查器为自主设计的原创教学内容。

### 本节习题导引

fill/single/judge 校准三件套与分工概念；code 题实现环境配置检查器（红线检测）；open 题为你的应用制定三件套落地清单与 AI/人分工表。完成本节后，Week 8 全章（l1-l5）结束——下一周进入部署后运维与可观测性。
`,
        tips: [
          { kind: 'pitfall', text: '三件套上线顺序有讲究：环境配置分离最痛、最该先做（拖一天多一次事故机会）；埋点可以随 w9 的度量需求生长，不必一步到位。' },
          { kind: 'leak', text: '反馈通道上报的内容默认含上下文——收集侧先脱敏（剔除 token、用户名路径）再入库，否则排障便利会变成攻击者的情报源。' },
          { kind: 'interview', text: '"AI 生成的应用上线前你补什么？"——答三件套各自的验收标准（降级路径 E2E、最小事件表、构建产物密钥扫描），再补一句"AI 写样板、人定结构"。' },
          { kind: 'note', text: '把本节的就绪检查清单做成项目模板里的 issue 模板：每个新 AI 生成应用开卡即带检查项——三件套的烂尾几乎都始于"没有清单"。' },
        ],
        demos: [
          {
            title: '生产三件套就绪检查器：从演示日到可上线',
            lang: 'python',
            code: `REQUIRED_EVENTS = ("page_view", "action_click", "error")

def readiness(app):
    """app: AI 生成应用的元信息。返回 (缺失项列表, 就绪度 0-1)。"""
    missing = []
    if not app.get("error_boundary"):
        missing.append("错误边界: 前端崩溃会白屏, 需要降级 UI + 一键上报")
    if not app.get("feedback_channel"):
        missing.append("反馈通道: 用户报错无入口, 排障全靠猜")
    lack = [e for e in REQUIRED_EVENTS if e not in set(app.get("analytics_events", []))]
    if lack:
        missing.append(f"可观测埋点缺关键事件: {lack}")
    if app.get("secrets_in_frontend"):
        missing.append("红线: 密钥进入前端代码(呼应 w6 凭据纪律)")
    if set(app.get("envs", [])) < {"dev", "staging", "prod"}:
        missing.append("环境配置未分离: 需要 dev/staging/prod 三套注入")
    score = round(1 - len(missing) / 5, 2)
    return missing, score

PROTO = {"error_boundary": False, "feedback_channel": False, "analytics_events": [],
         "secrets_in_frontend": True, "envs": ["dev"]}
READY = {"error_boundary": True, "feedback_channel": True,
         "analytics_events": ["page_view", "action_click", "error"],
         "secrets_in_frontend": False, "envs": ["dev", "staging", "prod"]}

for name, app in (("原型(演示日状态)", PROTO), ("补齐三件套后", READY)):
    missing, score = readiness(app)
    print(f"[{name}] 就绪度 {score:.0%}")
    for m in missing:
        print(f"  [!] {m}")
    if not missing:
        print("  全部通过: 可以进入灰度发布")
    print()`,
          },
        ],
      },
    ],
    exercises: [
      /* ───────── l4 习题（10 题）───────── */
      {
        id: 'cs146s-w8-l4-e1', type: 'fill', difficulty: 1, relatedLessonId: 'cs146s-w8-l4', tags: ['K', 'e2e'],
        question: '冒烟清单是关键路径的 5-8 条 E2E 用例，至少覆盖四类：______（首屏能开）、______（主功能走得通）、______态（出错有提示不白屏）、空态（无数据不崩溃）。',
        blanks: [['加载', '首屏', '载入'], ['核心操作', '主路径', '主要操作'], ['错误', '异常']],
        explanation: '四类覆盖对应四种"应用不可用"的判定路径。注意纪律：关键路径之外的断言下沉到单元测试——E2E 少而稳，不贪多。',
      },
      {
        id: 'cs146s-w8-l4-e2', type: 'single', difficulty: 2, relatedLessonId: 'cs146s-w8-l4', tags: ['U', 'e2e'],
        question: 'E2E 测试在 AI 生成应用中地位特殊，根本原因是？',
        options: [
          { value: 'a', text: 'E2E 跑得比单元测试快' },
          { value: 'b', text: '单元测试各自全绿也盖不住路由/数据/时序/持久化四个接缝，而 AI 生成的代码最容易在接缝处出错' },
          { value: 'c', text: 'E2E 不需要维护' },
          { value: 'd', text: 'E2E 能完全替代单元测试' },
        ],
        answer: 'b',
        explanation: 'AI 可以把每个零件都写对，但把五个正确的部分拼成一个错的整体——整车下线检验（E2E）是唯一直接检验装配环节的手段，所以它的地位从锦上添花变成关键闸门。',
      },
      {
        id: 'cs146s-w8-l4-e3', type: 'judge', difficulty: 2, relatedLessonId: 'cs146s-w8-l4', tags: ['U', 'e2e'],
        question: '为了让测试稳定，应该用绝对 CSS 路径（如 div > div:nth-child(2) > button）定位元素，这样 AI 怎么重构都不受影响。',
        answer: false,
        explanation: '恰好相反：绝对路径锚定的是 DOM 实现细节，AI 每次重构都改 DOM 层级，测试几乎必碎。应该用语义选择器（data-testid / role+name / aria-label）锚定语义——重构改实现不改语义。',
      },
      {
        id: 'cs146s-w8-l4-e4', type: 'multiple', difficulty: 3, relatedLessonId: 'cs146s-w8-l4', tags: ['U', 'e2e'],
        question: '一份合格的任务看板冒烟清单应包含哪些？',
        options: [
          { value: 'a', text: '首屏加载出标题与列表' },
          { value: 'b', text: '新建一条任务后计数 +1' },
          { value: 'c', text: '空列表显示空态提示' },
          { value: 'd', text: '接口 500 时显示错误提示与重试按钮，而非白屏' },
        ],
        answer: ['a', 'b', 'c', 'd'],
        explanation: '四条分别对应加载 / 核心操作 / 空态 / 错误态四类覆盖。注意缺少任何一类都是常见的清单缺陷——尤其错误态与空态，AI 生成的应用最爱在这两类上翻车。',
      },
      {
        id: 'cs146s-w8-l4-e5', type: 'code', difficulty: 2, relatedLessonId: 'cs146s-w8-l4', tags: ['D', 'e2e'],
        question: '实现冒烟报告汇总函数 `smoke_report(results)`：results 为 [{"path": 路径名, "passed": 是否通过, "reason": 失败原因}]；返回 {"total", "passed", "failed", "failed_paths", "exit_code"}——failed_paths 按输入顺序收集失败路径名，exit_code 全过为 0 否则 1（CI 阻断依据）。',
        lang: 'python',
        starterCode: `def smoke_report(results):
    # 汇总: total / passed / failed / failed_paths(按输入顺序) / exit_code
    pass

results = [
    {"path": "首屏加载", "passed": True, "reason": ""},
    {"path": "筛选任务", "passed": False, "reason": "语义定位未命中"},
    {"path": "空态提示", "passed": True, "reason": ""},
]
print(smoke_report(results))`,
        expectedOutput: `{'total': 3, 'passed': 2, 'failed': 1, 'failed_paths': ['筛选任务'], 'exit_code': 1}`,
        tests: `results = [
    {"path": "首屏加载", "passed": True, "reason": ""},
    {"path": "筛选任务", "passed": False, "reason": "语义定位未命中"},
    {"path": "空态提示", "passed": True, "reason": ""},
]
r = smoke_report(results)
assert r == {"total": 3, "passed": 2, "failed": 1, "failed_paths": ["筛选任务"], "exit_code": 1}
assert smoke_report([]) == {"total": 0, "passed": 0, "failed": 0, "failed_paths": [], "exit_code": 0}, "空输入全过"
all_ok = [{"path": "p1", "passed": True, "reason": ""}, {"path": "p2", "passed": True, "reason": ""}]
r2 = smoke_report(all_ok)
assert r2["exit_code"] == 0 and r2["passed"] == 2 and r2["failed_paths"] == []
multi = [{"path": "p1", "passed": False, "reason": ""}, {"path": "p2", "passed": False, "reason": ""}]
assert smoke_report(multi)["failed_paths"] == ["p1", "p2"], "failed_paths 保持输入顺序"`,
        allowedModules: [],
        explanation: 'exit_code 是 CI 门禁的接口：全过 0 放行、否则 1 阻断合并（项目 D 的门禁思想在验收报告上的落点）。failed_paths 保持输入顺序，报告才与清单一一对应。',
        answer: `def smoke_report(results):
    total = len(results)
    failed_paths = [r["path"] for r in results if not r["passed"]]
    passed = total - len(failed_paths)
    return {"total": total, "passed": passed, "failed": len(failed_paths),
            "failed_paths": failed_paths, "exit_code": 0 if not failed_paths else 1}

results = [
    {"path": "首屏加载", "passed": True, "reason": ""},
    {"path": "筛选任务", "passed": False, "reason": "语义定位未命中"},
    {"path": "空态提示", "passed": True, "reason": ""},
]
print(smoke_report(results))`,
      },
      {
        id: 'cs146s-w8-l4-e6', type: 'code', difficulty: 4, relatedLessonId: 'cs146s-w8-l4', tags: ['D', 'e2e'],
        question: '实现选择器脆弱度分类器 `classify_selectors(selectors)`：语义选择器指包含 data-testid=、role=、aria-label=（不区分大小写）或 getByRole / getByLabelText / getByByText 的项；脆弱选择器指以 / 开头（XPath）、含 nth-child 或含 > 的项；返回 {"semantic": 数量, "brittle": 数量, "ratio": 语义占比保留 2 位（空列表时为 0.0）}。',
        lang: 'python',
        starterCode: `def classify_selectors(selectors):
    # 语义: data-testid= / role= / aria-label= / getByRole / getByLabelText / getByByText
    # 脆弱: 以 / 开头 或 含 nth-child 或 含 >
    # ratio = semantic / (semantic + brittle), 保留 2 位; 空列表 ratio = 0.0
    pass

r = classify_selectors(["data-testid=btn-new", "//div/div[2]/button", "role=button[name=新建]"])
print(r)`,
        expectedOutput: `{'semantic': 2, 'brittle': 1, 'ratio': 0.67}`,
        tests: `r = classify_selectors(["data-testid=btn-new", "//div/div[2]/button", "role=button[name=新建]"])
assert r == {"semantic": 2, "brittle": 1, "ratio": 0.67}
r2 = classify_selectors(["div > div > button > span", "button:nth-child(3)"])
assert r2 == {"semantic": 0, "brittle": 2, "ratio": 0.0}, "CSS 路径与 nth-child 都是脆弱选择器"
assert classify_selectors([]) == {"semantic": 0, "brittle": 0, "ratio": 0.0}, "空列表边界"
r3 = classify_selectors(["getByRole('button', { name: '提交' })", "DATA-TESTID=SUBMIT"])
assert r3["semantic"] == 2, "getBy* 与大小写不敏感的 data-testid 都算语义"
r4 = classify_selectors(["/html/body/div[1]/button"])
assert r4["brittle"] == 1, "XPath 开头的 /"`,
        allowedModules: [],
        explanation: '分类器的实用场景：扫一遍现有 E2E 代码库，用 brittle 数量量化"重构生存能力"，再逐条替换成语义选择器。注意语义判定用"包含"而非"等于开头"——getByRole(…) 这类调用串里前缀在函数名之后。',
        answer: `def classify_selectors(selectors):
    semantic_marks = ("data-testid=", "role=", "aria-label=",
                      "getByRole", "getByLabelText", "getByText")
    semantic = brittle = 0
    for s in selectors:
        low = s.lower()
        if any(m.lower() in low for m in semantic_marks):
            semantic += 1
        elif s.strip().startswith("/") or "nth-child" in low or ">" in s:
            brittle += 1
    total = semantic + brittle
    ratio = round(semantic / total, 2) if total else 0.0
    return {"semantic": semantic, "brittle": brittle, "ratio": ratio}

r = classify_selectors(["data-testid=btn-new", "//div/div[2]/button", "role=button[name=新建]"])
print(r)`,
      },
      {
        id: 'cs146s-w8-l4-e7', type: 'single', difficulty: 3, relatedLessonId: 'cs146s-w8-l4', tags: ['U', 'e2e'],
        question: '视觉回归测试中，日期时间戳、随机头像这类动态内容最合理的处理方式是？',
        options: [
          { value: 'a', text: '每次报警后人工看一眼' },
          { value: 'b', text: '遮蔽（mask）动态区域或改用元素级截图，并设置合理的像素差异阈值' },
          { value: 'c', text: '把差异阈值调到 100%，什么都不算差异' },
          { value: 'd', text: '把这些元素从页面里删掉再测' },
        ],
        answer: 'b',
        explanation: '噪音处理的两个手段：mask 动态区域 / 元素级截图，配合阈值抗抗锯齿抖动。c 让视觉回归形同虚设；d 改变了被测对象；a 会把团队训练成"报警即忽略"。',
      },
      {
        id: 'cs146s-w8-l4-e8', type: 'open', difficulty: 4, relatedLessonId: 'cs146s-w8-l4', tags: ['D', 'e2e'],
        question: '为 AI 生成的"购物车"应用（加购 / 改数量 / 删除 / 结算）设计端到端验收方案：① 6 条冒烟路径（路径式或 GWT，覆盖加载/核心操作/错误态/空态/越权）；② 选择器策略（用哪类选择器、生成侧要配套什么约定）；③ CI 无头验收的 2 条要点。',
        referenceAnswer: `参考方案（要点齐全即可）：

① 冒烟路径 6 条：
- P1 加载：Given 正常网络，When 打开购物车，Then 标题、商品列表与合计金额可见；
- P2 核心操作：Given 购物车有 1 件商品，When 加购第 2 件，Then 合计金额更新且条目数变 2；
- P3 核心操作：Given 某商品数量为 3，When 改为 1，Then 合计按单价重算（无四舍五入漂移）；
- P4 错误态：Given 结算接口返回 500，When 点击结算，Then 显示错误提示与重试按钮，购物车数据不丢（不是白屏也不是清空）；
- P5 空态：Given 购物车为空，When 打开页面，Then 显示空态引导（去逛逛入口）而非空白；
- P6 越权/边界：Given 未登录用户，When 点击结算，Then 跳转登录且购物车内容保留。

② 选择器策略：全量使用语义选择器——操作用 data-testid（btn-add / cart-total / btn-checkout），按钮同时断言可访问名称（role=button[name=结算]）；配套生成侧约定（写进 Spec 的 AC）：AI 生成的每个可交互元素必须带 data-testid 且 aria-label 语义完整——可访问性与测试稳定性同源。

③ CI 无头验收要点：headless 模式进 CI、每次 PR 触发，冒烟失败即阻断合并；失败自动留痕（失败截图 + trace），并检查测试仓库不含生产凭据（测试账号与生产隔离）。

加分观察：P4 的"购物车数据不丢"与 P6 的"内容保留"是 AI 生成应用最常缺的断言——生成器默认不处理异常路径的状态保持。`,
        rubric: [
          { point: '6 条路径完整 GWT 或路径式，且覆盖加载/核心/错误/空态/越权五类', score: 3 },
          { point: '选择器策略明确使用语义选择器并给出理由（重构存活/失败报告可读）', score: 2 },
          { point: '生成侧配套约定（testid 进 AC）明确写出', score: 2 },
          { point: 'CI 要点含无头执行 + 失败留痕/门禁，且提到凭据隔离', score: 2 },
          { point: '至少一条断言针对异常路径的状态保持（加分观察）', score: 1 },
        ],
        keywords: ['冒烟', 'data-testid', '语义选择器', 'headless', '错误态', '空态'],
        explanation: '方案质量的分水岭在于异常路径：多数人能写出 P1-P3，而 P4 的"数据不丢"与 P6 的"内容保留"才是 E2E 对 AI 生成应用的真实价值——接缝处的行为保持。',
      },
      {
        id: 'cs146s-w8-l4-e9', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-w8-l4', tags: ['K', 'e2e'],
        question: '视觉回归三要素：______截图（经人工确认的对比基准）、差异______（超过如 0.5% 才报警，抗抗锯齿抖动）、噪音处理（遮蔽动态区域 / 元素级截图 / 冻结时间与随机数据）。',
        blanks: [['基线', '基准', 'baseline'], ['阈值', '容忍度', '门限']],
        explanation: '三要素缺一不可：没有基线无从比对，没有阈值天天误报，没有噪音处理则被动态内容淹没——工具死于狼来了。',
      },
      {
        id: 'cs146s-w8-l4-e10', type: 'judge', difficulty: 3, relatedLessonId: 'cs146s-w8-l4', tags: ['U', 'e2e'],
        question: 'flaky（时好时坏）的 E2E 用例重跑一次通过了，就可以标记为已知问题，从此不再管它。',
        answer: false,
        explanation: 'flaky 用例会训练团队习惯性无视红灯，最终葬送整个验收体系的公信力。正确动作是定位根因（等待方式 / 测试数据 / 环境依赖）——重跑通过只是运气，不是修复。',
      },

      /* ───────── l5 习题（8 题）───────── */
      {
        id: 'cs146s-w8b-l5-e1', type: 'fill', difficulty: 1, relatedLessonId: 'cs146s-w8b-l5', tags: ['K', 'production'],
        question: '生产三件套：①______与用户反馈通道（崩溃不白屏、能一键上报）；②可观测______（page_view / action_click / error 最小事件表）；③______配置分离（dev/staging/prod 按环境注入）。',
        blanks: [['错误边界', 'error boundary', 'errorboundary'], ['埋点', '打点', '埋点/打点'], ['环境', '环境配置']],
        explanation: '三件套分别挡住三类事故：白屏且失联、盲飞排障、串配置与密钥泄露。它们平时隐形、出事定生死——所以也最常在项目最健康的时候被砍掉。',
      },
      {
        id: 'cs146s-w8b-l5-e2', type: 'single', difficulty: 2, relatedLessonId: 'cs146s-w8b-l5', tags: ['U', 'production'],
        question: '前端错误边界的核心目的是？',
        options: [
          { value: 'a', text: '让程序少抛异常' },
          { value: 'b', text: '把渲染崩溃局部化为可用的降级 UI，并顺手把错误与上下文上报——而不是让用户面对白屏' },
          { value: 'c', text: '提升页面渲染速度' },
          { value: 'd', text: '防止用户输入错误数据' },
        ],
        answer: 'b',
        explanation: '两个关键词：局部化（按功能区包裹，列表崩了侧边栏还在）与上报（componentDidCatch 把崩溃变成可排障的事件）。防输入错误是校验层的事，与边界无关。',
      },
      {
        id: 'cs146s-w8b-l5-e3', type: 'multiple', difficulty: 3, relatedLessonId: 'cs146s-w8b-l5', tags: ['U', 'production'],
        question: '关于环境配置与密钥管理，下列做法正确的有？',
        options: [
          { value: 'a', text: 'dev/staging/prod 使用独立配置，部署时按目标环境注入' },
          { value: 'b', text: '密钥通过服务端环境变量或密钥管理服务持有，前端只拿公开标识符' },
          { value: 'c', text: '把密钥打包进前端再用混淆器混淆变量名，就安全了' },
          { value: 'd', text: '生产 .env 文件提交进 git，方便全团队共享' },
        ],
        answer: ['a', 'b'],
        explanation: 'c 是高频误区：前端 bundle 完全公开，混淆只挡住不阅读的人——"查看源代码"面前一切前端密钥都等于公布；d 同理，git 历史里的密钥等于永久泄露。敏感调用一律走服务端代理。',
      },
      {
        id: 'cs146s-w8b-l5-e4', type: 'judge', difficulty: 2, relatedLessonId: 'cs146s-w8b-l5', tags: ['U', 'observability'],
        question: '埋点事件越多越好：把每次 hover、每次键盘输入都打点，能显著提升应用的可观测性。',
        answer: false,
        explanation: '过量埋点得到的是噪音海洋（关键信号被淹没）与隐私风险（输入内容可能携带 PII）。正确姿势是最小事件表起步、事件随问题生长，PII 永不进埋点。',
      },
      {
        id: 'cs146s-w8b-l5-e5', type: 'code', difficulty: 3, relatedLessonId: 'cs146s-w8b-l5', tags: ['D', 'production'],
        question: '实现环境配置检查器 `check_env_config(configs)`：configs 为 {环境名: {"api_url": 地址, "secret_in_frontend": 布尔}}。检查三条规则：① dev/staging/prod 三环境齐全；② 任何环境 secret_in_frontend 为 True 即红线；③ prod 与 dev 的 api_url 相同视为疑似环境串了配置。返回 (问题列表, 是否安全)；安全 = 问题列表为空。',
        lang: 'python',
        starterCode: `def check_env_config(configs):
    # 规则1: 三环境齐全  规则2: secret_in_frontend 红线  规则3: prod/dev 的 api_url 相同
    # 返回 (问题列表, 是否安全)
    pass

ok = {"dev": {"api_url": "http://localhost:3000", "secret_in_frontend": False},
      "staging": {"api_url": "https://staging.example.com", "secret_in_frontend": False},
      "prod": {"api_url": "https://api.example.com", "secret_in_frontend": False}}
print(check_env_config(ok))

bad = {"dev": {"api_url": "http://localhost:3000", "secret_in_frontend": False},
       "prod": {"api_url": "http://localhost:3000", "secret_in_frontend": True}}
print(check_env_config(bad))`,
        expectedOutput: `([], True)
(['缺少环境: staging', 'prod: 密钥进入前端代码(红线)', 'prod 与 dev 的 api_url 相同, 疑似环境串了配置'], False)`,
        tests: `ok = {"dev": {"api_url": "http://localhost:3000", "secret_in_frontend": False},
      "staging": {"api_url": "https://staging.example.com", "secret_in_frontend": False},
      "prod": {"api_url": "https://api.example.com", "secret_in_frontend": False}}
p, safe = check_env_config(ok)
assert p == [] and safe is True
bad = {"dev": {"api_url": "http://localhost:3000", "secret_in_frontend": False},
       "prod": {"api_url": "http://localhost:3000", "secret_in_frontend": True}}
p2, safe2 = check_env_config(bad)
assert safe2 is False
assert p2 == ["缺少环境: staging", "prod: 密钥进入前端代码(红线)",
              "prod 与 dev 的 api_url 相同, 疑似环境串了配置"], p2
p3, safe3 = check_env_config({})
assert safe3 is False and len(p3) == 3, "三环境全缺"
print("TESTS DONE")`,
        allowedModules: [],
        explanation: '检查器把三条纪律变成可执行断言——这正是三件套"防止烂尾"的手段。规则 3 的启发式很实用：环境串配置几乎总是从"复制 dev 配置改一改"开始的，api_url 相同就是最直接的指纹。',
        answer: `def check_env_config(configs):
    problems = []
    for env in ("dev", "staging", "prod"):
        if env not in configs:
            problems.append(f"缺少环境: {env}")
    for env, conf in configs.items():
        if conf.get("secret_in_frontend"):
            problems.append(f"{env}: 密钥进入前端代码(红线)")
    if "prod" in configs and "dev" in configs \\
            and configs["prod"].get("api_url") == configs["dev"].get("api_url"):
        problems.append("prod 与 dev 的 api_url 相同, 疑似环境串了配置")
    return problems, len(problems) == 0

ok = {"dev": {"api_url": "http://localhost:3000", "secret_in_frontend": False},
      "staging": {"api_url": "https://staging.example.com", "secret_in_frontend": False},
      "prod": {"api_url": "https://api.example.com", "secret_in_frontend": False}}
print(check_env_config(ok))

bad = {"dev": {"api_url": "http://localhost:3000", "secret_in_frontend": False},
       "prod": {"api_url": "http://localhost:3000", "secret_in_frontend": True}}
print(check_env_config(bad))`,
      },
      {
        id: 'cs146s-w8b-l5-e6', type: 'single', difficulty: 3, relatedLessonId: 'cs146s-w8b-l5', tags: ['U', 'observability'],
        question: '以下哪个事件最不应该进入最小埋点方案？',
        options: [
          { value: 'a', text: 'page_view——页面浏览与加载耗时' },
          { value: 'b', text: 'action_click——核心操作（新建任务 / 提交订单）及其成败' },
          { value: 'c', text: 'error——JS 异常与接口失败（含版本与脱敏上下文）' },
          { value: 'd', text: 'mousemove——每个按钮上的鼠标移动轨迹逐点上报' },
        ],
        answer: 'd',
        explanation: '最小事件表的三条（a/b/c）各自回答一个排障问题。d 是典型反模式：数据量巨大、信号为零，还可能采集到用户轨迹这类隐私敏感信息。',
      },
      {
        id: 'cs146s-w8b-l5-e7', type: 'open', difficulty: 4, relatedLessonId: 'cs146s-w8b-l5', tags: ['D', 'production'],
        question: '为你（真实的或设想的）AI 生成应用制定三件套落地清单：① 每件套写 1 条机器可判的验收标准；② 列出"AI 生成样板 / 人定结构与验收"的分工表（每件套至少各 1 项）；③ 指出三件套分别扼杀哪类事故，并按你的项目语境排定实施顺序与理由。',
        referenceAnswer: `参考答案（以"任务看板"为例，要点齐全即可）：

① 验收标准（各 1 条，均可自动断言）：
- 错误边界：Given 表单组件注入抛错，When 渲染页面，Then 列表区仍可见且"反馈"按钮可点击（E2E 断言，承接 l4 的语义选择器）；
- 埋点：Given 用户完成一次新建任务，When 查看事件流，Then 恰好出现一条 task_create 事件且含成败字段、不含 PII（事件流查询断言）；
- 环境配置：Given CI 部署到 staging，When 对构建产物运行密钥扫描，Then 零命中且三个环境 api_url 各不相同（w7 红线扫描复用）。

② 分工表：
| 件套 | AI 生成样板 | 人定结构与验收 |
| 错误边界 | ErrorBoundary 类与降级 UI 组件 | 分区策略（哪些区域允许独立降级）、降级文案与重试逻辑 |
| 埋点 | track() 包装器与事件调用代码 | 事件命名规范（对象_动作）、最小事件表、PII 过滤规则 |
| 环境配置 | config 加载器与 .env 模板 | 密钥管理流程（服务端代理持有）、三环境基线 |

③ 事故对应与顺序：环境配置分离（串配置/密钥泄露——不可逆）→ 错误边界与反馈通道（白屏且失联——不可用）→ 埋点（盲飞——影响排障效率但可事后补）。顺序理由沿用"不可逆 > 不可用 > 不好用"；若项目下周就要给外部用户，埋点可提前到第二位，因为"上线后第一时间能看见问题"也是不可逆需求（看不到的第一周数据永远补不回来）。`,
        rubric: [
          { point: '三条验收标准均机器可判（E2E 断言 / 事件流查询 / 产物扫描）', score: 3 },
          { point: '分工表区分"样板"与"结构/验收"，且结构项确实是决策类工作', score: 3 },
          { point: '事故对应准确，实施顺序有明确原则支撑', score: 2 },
          { point: '至少一处结合项目语境的判断（如外部用户临近时埋点提前）', score: 2 },
        ],
        keywords: ['错误边界', '埋点', '环境配置', '密钥', '验收标准', '分工'],
        explanation: '判卷核心：验收标准是否真的能跑成断言（"有错误边界"不算，"注入错误后列表区仍可见"才算）；实施顺序是否有原则而非拍脑袋。把"数据窗口不可逆"纳入排序考量是高阶信号。',
      },
      {
        id: 'cs146s-w8b-l5-e8', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-w8b-l5', tags: ['K', 'production'],
        question: '三件套中的分工纪律：AI 擅长生成______代码（错误边界类、埋点包装器、配置加载器）；______负责定结构与验收（事件命名规范、降级策略、密钥管理流程）；三件套的烂尾防线是每件都有______可判的验收标准。',
        blanks: [['样板', '模板', 'boilerplate'], ['人', '工程师', '人类', '开发者'], ['机器', '自动', '程序']],
        explanation: '一句话分工：AI 写"长这样的代码"，人定"为什么这样长"，机器执行"怎么算对了"。结构定错（命名混乱/降级错位）是 AI 补不回来的，验收不可判则三件套必然烂尾。',
      },
    ],
  },
];
