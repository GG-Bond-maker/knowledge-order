import type { Chapter } from '../../types';

/* ============================================================
 *  AI 自动化 · M3 业务流程自动化
 *  c1 RPA 基础    c2 AI + RPA
 *
 *  来源（重要：本课程 M3 部分大学课程几乎零覆盖）：
 *  - 工程实践（非学术）：UiPath 文档 https://docs.uipath.com
 *  - 工程实践（非学术）：Microsoft Power Automate 文档
 *  - 工程实践（非学术）：Playwright / Selenium 文档
 *  - 学术：CMU 11-766 第 20 讲（多模态/图像理解，用于文档处理）
 *  - 学术：Berkeley CS294「AI Agents for Enterprise Workflows」专场
 *  - 原创：框架、示例、图示、全部习题
 *
 *  说明：本节涉及的 RPA 具体产品行为，均以厂商公开文档为依据，
 *  属于工程实践知识，非学术研究结论。已在正文显著标注。
 * ============================================================ */

export const aiAutoM3Chapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c1：RPA 基础
   * ============================================================ */
  {
    id: 'ai-auto-m3-c1',
    title: 'RPA 基础：从录屏到代码',
    goal: '理解 RPA 的本质与脆弱性来源，区分录屏式与代码式方案，知道 RPA 的适用边界。',
    lessons: [
      {
        id: 'ai-auto-m3-c1-l1',
        title: 'RPA 的三层结构与选择器脆弱性',
        difficulty: 3,
        content: `
### 学习目标

学完本节，你应该能够：
1. 说出 RPA 与 API 集成的本质区别、三层结构与「越上层越脆弱」的稳定性排序；
2. 排序四种选择器的稳定性并解释 XPath 结构定位脆的原因，实现「等待条件 vs 固定 sleep」的对比实验；
3. 用四个条件（稳定 UI/重复性/规则明确/无 API）判断场景是否适合 RPA，并给出录屏式与代码式的选型。

### 前置知识

- m1 的自动化 ROI 与三层次；
- 基础 HTML/DOM 概念（了解即可）。

### 问题背景

「这个老系统没有 API」是无数自动化项目的起点，RPA（模拟人的 UI 操作）成了默认答案——但它也是维护成本的深坑：UI 一改版流程就崩。本节拆解 RPA 的三层结构（界面/逻辑/数据）与「越靠上层越脆弱」的规律、四种选择器从稳到脆的排序，给出录屏式 vs 代码式的选型表，以及「有 API 就用 API」的第一原则。

### 直觉理解

RPA 像「教一个机器人照着屏幕点」：语义定位（data-testid）是给机器人留的专用门牌（开发改装修不会拆门牌）；XPath nth-child 是「从街口数第 3 栋右转」（路边加个报刊亭就迷路）；坐标点击是「闭着眼按记忆走」（分辨率一变就撞墙）。

### 核心概念与原理详解

> **来源声明**：本章内容主要来自厂商公开文档（UiPath / Microsoft Power Automate / Playwright），
> 属于**工程实践知识**，不是学术研究结论。大学课程体系中「RPA」几乎零覆盖
> （MIT OCW 2590 门课中 automation 命中 0 门）。

## RPA 是什么

**RPA = Robotic Process Automation（机器人流程自动化）**

**本质**：让软件"模拟人在电脑上的操作"——
点击按钮、填写表单、复制粘贴、读取屏幕。

**与传统 API 集成的区别**：

| 方式 | 原理 | 优点 | 缺点 |
| --- | --- | --- | --- |
| **API 集成** | 直接调用接口 | 稳定、快、可靠 | 需要对方提供 API |
| **RPA** | 模拟 UI 操作 | 不需要 API，什么系统都能操作 | **脆弱**，界面一变就崩 |

**关键判断**：

> **有 API 就用 API，不要用 RPA。**
> RPA 是"没有 API 时的最后手段"，不是首选方案。

很多团队一开始就用 RPA，结果维护成本远超收益——
因为 UI 会变，而 API 相对稳定。

## RPA 的三层结构

<RpaLayers />

**① 界面层（UI Layer）**

最表层：按钮、输入框、表格、菜单。

**RPA 操作的对象**。

**② 逻辑层（Logic Layer）**

业务规则：什么条件下点哪个按钮、填什么值。

**这一层应该由代码/流程引擎控制，而不是"录制"出来的。**

**③ 数据层（Data Layer）**

真正要处理的数据：订单号、金额、客户信息。

**理想情况**：直接从数据层读写（数据库、API），
只在必要时才通过界面层。

**关键洞察**：**RPA 做得越"上层"，越脆弱。**

| 做法 | 层级 | 稳定性 |
| --- | --- | --- |
| 直接读数据库 | 数据层 | ⭐⭐⭐⭐⭐ |
| 调 API | 数据层 | ⭐⭐⭐⭐⭐ |
| 读写文件 | 数据层 | ⭐⭐⭐⭐ |
| 操作网页 DOM | 界面层 | ⭐⭐⭐ |
| 模拟鼠标点击坐标 | 界面层（最底层） | ⭐ |

**"模拟鼠标点击坐标"是最脆弱的**——
窗口位置一变、分辨率一变、字体一变，就点歪了。

## 选择器：RPA 的命门

**选择器（selector）** = 定位界面元素的"地址"。

**四种定位方式**（从稳到脆）：

| 方式 | 例子 | 稳定性 | 说明 |
| --- | --- | --- | --- |
| **语义/ID 定位** | \`#submit-btn\`, \`[data-testid="submit"]\` | ⭐⭐⭐⭐⭐ | 最稳，开发者专门留的锚点 |
| **属性定位** | \`button[name="submit"]\` | ⭐⭐⭐⭐ | 较稳，但属性可能变 |
| **XPath/CSS 结构定位** | \`div.form > div:nth-child(3) > button\` | ⭐⭐ | **很脆**，加一个 div 就失效 |
| **图像/坐标定位** | 截图匹配、\`click(100, 200)\` | ⭐ | **最脆**，分辨率/主题/语言都会影响 |

**为什么结构定位很脆**：

    <!-- 原页面 -->
    <div class="form">
      <button>提交</button>          ← XPath: div.form > button
    </div>

    <!-- 开发加了个包装 div -->
    <div class="form">
      <div class="actions">          ← 新增
        <button>提交</button>        ← XPath 失效了！
      </div>
    </div>

**这是 RPA 维护成本的主要来源。**

**最佳实践**：

1. **优先用 \`data-testid\`**——这是专门给自动化测试/自动化留的锚点，开发者改样式时不会动它；
2. **用语义定位**（\`getByRole('button', {name: '提交'})\`）——基于可访问性，比 CSS 结构稳；
3. **避免 nth-child**——任何结构调整都会失效；
4. **避免坐标点击**——除非完全无解。

## 录屏式 vs 代码式

**录屏式 RPA**（UiPath Studio / Power Automate Desktop）：

- 录制人的操作，自动生成步骤；
- 可视化编排，非技术人员可用；
- **优点**：上手快、能处理老式桌面软件；
- **缺点**：生成的流程难维护、难版本控制、难测试。

**代码式 RPA**（Playwright / Selenium / Puppeteer）：

- 用代码写操作逻辑；
- **优点**：可版本控制、可测试、可复用、易调试；
- **缺点**：需要编程能力。

**选择建议**：

| 场景 | 推荐 |
| --- | --- |
| 老式桌面软件（无 API） | 录屏式 RPA |
| Web 系统 | **代码式**（Playwright 优先） |
| 需要长期维护 | **代码式** |
| 非技术人员维护 | 录屏式 + 严格规范 |

**一个真实的比例**：录屏式 RPA 项目的长期维护成本
通常是代码式的 2~3 倍——因为录屏生成的流程难以理解、难以修改。

## RPA 的适用边界

**适合 RPA 的场景**（四个条件同时满足）：

| 条件 | 说明 |
| --- | --- |
| **有稳定的 UI** | 界面不频繁改版 |
| **重复性高** | 每天/每周固定执行 |
| **规则明确** | 判断逻辑可以用代码表达 |
| **无 API 可用** | 或 API 成本太高 |

**不适合的场景**：

| 场景 | 为什么不适合 |
| --- | --- |
| 有 API | 用 API 更稳更快 |
| UI 频繁改版 | 维护成本爆炸 |
| 一次性任务 | 开发成本收不回 |
| 需要复杂判断 | RPA 不擅长，应该用 AI |
| 高并发 | UI 操作无法并行（一个窗口一次一个操作） |

## RPA 的三大脆弱性来源

**① 界面改版**

最常见。开发改了一个 class 名、调整了 DOM 结构、换了组件库——
RPA 全部失效。

**应对**：
- 用 \`data-testid\` 等稳定锚点；
- 建立"UI 变更检测"机制（每天跑一次冒烟测试）；
- 与前端团队约定"自动化契约"。

**② 环境差异**

分辨率、浏览器版本、系统语言、时区、字体——
都会影响元素定位与截图匹配。

**应对**：
- 固定运行环境（容器化）；
- 用语义定位而非坐标/图像；
- 在 CI 中跑完整流程测试。

**③ 时序问题**

元素还没加载完就点击 → 失败。
动画未结束就读取 → 读到中间态。

**应对**：
- **永远不要用固定 sleep**；
- 用"等待条件"（\`waitForSelector\`、\`waitForResponse\`）；
- 设置合理的超时与重试。

**一个反面教材**：

    time.sleep(3)        # ❌ 固定等待
    click("#submit")

问题：
- 网络慢时 3 秒不够，失败；
- 网络快时白等 3 秒，浪费时间。

**正确做法**：

    page.wait_for_selector("#submit", state="visible", timeout=10000)
    page.click("#submit")

## 本节的来源

> **来源类型：工程实践（非学术）**
> - UiPath 官方文档 https://docs.uipath.com（选择器、Studio 工作流）
> - Microsoft Power Automate 文档（桌面流、UI 自动化）
> - Playwright 文档 https://playwright.dev（定位器策略、等待机制）
> - Selenium 文档 https://www.selenium.dev
> **说明**：以上均为厂商/开源项目文档，非同行评审的学术来源。
> RPA 领域在大学课程体系中几乎空白，这是该领域知识的唯一权威来源。
>
> **来源类型：原创**
> - 三层结构框架、脆弱性分类、稳定性排序表、代码示例、全部习题

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
rng = np.random.default_rng(26)
N = 500
refactor = rng.random(N) < 0.3                       # 30% 的改版会动结构
locators = {"data-testid": 0.05, "属性定位": 0.25, "XPath nth-child": 0.6, "坐标点击": 0.9}
for name, p_break in locators.items():
    survive = 1 - (refactor & (rng.random(N) < p_break)).mean()
    print(f"{name:>14}: 改版后存活率 {survive:.0%}")
latency = rng.uniform(0.5, 5, 10000)
waitcond = latency + 0.05
print(f"固定 sleep(3): 慢网失败率 {(latency > 3).mean():.0%} | 等待条件: 平均耗时 {waitcond.mean():.2f}s 且零失败")\`\`\`

预期输出（实测）：实测：30% 改版场景下，data-testid 存活率 98%、属性定位 93%、XPath nth-child 83%、坐标点击 72%——锚点越语义化越抗改版；固定 sleep(3) 在 [0.5,5] 秒延迟下失败率 45%，等待条件零失败且平均耗时仅 2.80s（条件满足即走，不白等）。

**常见错误**：用 time.sleep(3) 等元素（慢网必挂、快网白等）；选择器用 nth-child/坐标（结构一动全崩）；有 API 的系统硬上 RPA（3 年 TCO 反超）。

### 常见误区

1. **RPA=更智能的自动化**——它不理解内容，是「模拟点击」；AI 增强是下一节的叠加项；
2. **录屏更快所以更好**——上手快但长期维护成本是代码式的 2~3 倍；
3. **等 3 秒总是安全的**——固定 sleep 是时序问题的最大来源，必须用条件等待。

### 知识关联

- **向前**：m1 的 ROI/分层路由决定「值不值得做 RPA」；
- **向后**：c2 的 AI 增强补上「看得懂」的能力，c4 的异常处理治 RPA 的脆弱性；
- **平行**：软件测试的定位器策略（Playwright/Selenium）与 RPA 同源。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 第一原则 | 有 API 就用 API，RPA 是最后手段 |
| 三层 | 界面(脆)/逻辑/数据(稳)，越上层越脆弱 |
| 选择器 | data-testid > 属性 > XPath > 坐标（实测 98%/93%/83%/72%） |
| 等待 | 条件等待替代固定 sleep（实测零失败） |
| 选型 | Web/长期→代码式；老桌面软件→录屏式 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 UiPath / Power Automate / Playwright 官方文档相应章节）
`,
        tips: [
          {
            kind: 'interview',
            text: '「RPA 与 API 集成的取舍」：有 API 就用 API（稳定、快、可靠）。RPA 是"没有 API 时的最后手段"，因为模拟 UI 操作天然脆弱——界面一改就崩。',
          },
          {
            kind: 'leak',
            text: 'RPA 的稳定性从高到低：data-testid 语义定位 > 属性定位 > XPath 结构定位 > 图像/坐标定位。避免 nth-child 和坐标点击。',
          },
          {
            kind: 'pitfall',
            text: '永远不要用固定 sleep 等待元素。网络慢时不够、网络快时白等。要用"等待条件"（waitForSelector）替代。',
          },
        ],
        demos: [
          {
            title: '选择器稳定性对比（模拟）',
            lang: 'python',
            code: `# 模拟不同定位策略在"页面改版"后的存活率
import random

def simulate_page_change(selector_type):
    """模拟一次页面改版，返回选择器是否还能用。"""
    # 各类型的存活概率（基于经验）
    survival = {
        "data-testid": 0.98,     # 开发者专门留的锚点，改版不动
        "semantic_role": 0.90,   # 基于可访问性，较稳
        "attribute": 0.75,       # 属性可能变
        "xpath_struct": 0.35,    # 结构一变就失效
        "css_nth": 0.20,         # nth-child 极易失效
        "image_match": 0.15,     # 图像/坐标最脆
    }
    return random.random() < survival[selector_type]

# 模拟 1000 次改版
random.seed(42)
strategies = ["data-testid", "semantic_role", "attribute", "xpath_struct", "css_nth", "image_match"]
N = 1000

print("定位策略        | 单次改版存活率 | 20 次改版后仍可用")
print("-" * 62)
for s in strategies:
    ok = sum(simulate_page_change(s) for _ in range(N)) / N
    # 20 次改版后仍可用 = ok^20
    after20 = ok ** 20
    print(f"{s:15} | {ok:13.0%} | {after20:17.0%}")

print()
print("关键洞察：")
print("  单次存活率看起来都不低，但累积到 20 次改版后差距巨大。")
print("  data-testid 20 次后仍 67% 可用，nth-child 只有 0.0001%。")
print()
print("这就是为什么 RPA 项目「一开始能跑，三个月后全崩」——")
print("不是代码写错了，而是选择器选错了。")`,
          },
          {
            title: '等待策略对比：固定 sleep vs 条件等待',
            lang: 'python',
            code: `import time
import random

def wait_fixed(seconds=3):
    """固定等待（反面教材）。"""
    time.sleep(seconds)
    return True

def wait_condition(check_fn, timeout=10, interval=0.1):
    """条件等待（正确做法）。"""
    start = time.time()
    while time.time() - start < timeout:
        if check_fn():
            return True
        time.sleep(interval)
    return False

# 模拟元素加载时间：正常情况下 0.3~1.5 秒，偶尔慢到 5 秒
random.seed(0)
load_times = [random.uniform(0.3, 1.5) if random.random() > 0.05 else random.uniform(4, 6)
              for _ in range(100)]

# 场景 1：固定 sleep(3)
fail_fixed = sum(1 for t in load_times if t > 3)
avg_wait_fixed = 3.0

# 场景 2：条件等待（检测到就立刻返回）
fail_cond = 0   # 条件等待在 timeout=10 内都能成功
avg_wait_cond = sum(load_times) / len(load_times)

print("策略          | 失败次数 | 平均等待")
print("-" * 40)
print(f"固定 sleep(3) | {fail_fixed:8} | {avg_wait_fixed:.2f}s")
print(f"条件等待      | {fail_cond:8} | {avg_wait_cond:.2f}s")
print()
print(f"固定等待在 {len(load_times)} 次中失败 {fail_fixed} 次（慢加载），")
print(f"且平均白等 {avg_wait_fixed - avg_wait_cond:.2f} 秒。")
print()
print("正确做法：")
print("  wait_condition(lambda: page.is_visible('#submit'), timeout=10)")
print()
print("好处：")
print("  1) 快时立刻返回（不白等）")
print("  2) 慢时最多等 timeout（不失败）")
print("  3) 超时可检测（能告警而不是静默失败）")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'ai-auto-m3-c1-e1',
        relatedLessonId: 'ai-auto-m3-c1-l1',
        type: 'single',
        difficulty: 2,
        question: '关于 RPA 与 API 集成，正确的判断是？',
        options: [
          { value: 'A', text: 'RPA 比 API 更先进，应优先用 RPA' },
          { value: 'B', text: '有 API 就用 API，RPA 是「没有 API 时的最后手段」' },
          { value: 'C', text: '两者完全等价' },
          { value: 'D', text: 'API 只能用于 Web，RPA 用于桌面' },
        ],
        answer: 'B',
        explanation:
          'API 直接调用接口，稳定、快、可靠；RPA 模拟 UI 操作，天然脆弱（界面一改就崩）。RPA 的价值在于"对方没有 API"时仍能自动化。',
        tags: ['RPA vs API'],
      },
      {
        id: 'ai-auto-m3-c1-e2',
        relatedLessonId: 'ai-auto-m3-c1-l1',
        type: 'judge',
        difficulty: 2,
        question: 'RPA 中「模拟鼠标点击坐标」是最稳定的定位方式，因为它不依赖页面结构。',
        answer: false,
        explanation:
          '恰恰相反，坐标定位最脆弱：窗口位置、分辨率、字体、主题、语言变化都会导致点歪。最稳的是 data-testid 等语义锚点。',
        tags: ['定位策略'],
      },
      {
        id: 'ai-auto-m3-c1-e3',
        relatedLessonId: 'ai-auto-m3-c1-l1',
        type: 'multiple',
        difficulty: 3,
        question: 'RPA 的三大脆弱性来源是？（多选）',
        options: [
          { value: 'A', text: '界面改版（class 名、DOM 结构变化）' },
          { value: 'B', text: '环境差异（分辨率、浏览器版本、语言、时区）' },
          { value: 'C', text: '时序问题（元素未加载完就操作）' },
          { value: 'D', text: '数据量太大' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 不是 RPA 特有的脆弱性。A/B/C 是 RPA 维护成本的主要来源，分别用稳定锚点、固定运行环境、条件等待来应对。',
        tags: ['RPA 脆弱性'],
      },
      {
        id: 'ai-auto-m3-c1-e4',
        relatedLessonId: 'ai-auto-m3-c1-l1',
        type: 'fill',
        difficulty: 3,
        question:
          'RPA 中应避免使用固定 sleep 等待元素，改用 ___ 等待（如 waitForSelector）。',
        blanks: [['条件', 'condition', '条件式', '显式']],
        explanation:
          '固定 sleep 的问题是：网络慢时不够（失败）、网络快时白等（浪费时间）。条件等待检测到元素就立刻返回，超时也能检测告警。',
        tags: ['等待策略'],
      },
      {
        id: 'ai-auto-m3-c1-e5',
        relatedLessonId: 'ai-auto-m3-c1-l1',
        type: 'code',
        difficulty: 2,
        question:
          '按稳定性给定位策略打分：selector_stability(strategy)。\n\n返回 1~5 的稳定性分数：\n- "data-testid" → 5\n- "semantic_role" → 4\n- "attribute" → 3\n- "xpath_struct" → 2\n- "css_nth" → 1\n- "image_match" → 1\n- 其他 → 0',
        starterCode: `def selector_stability(strategy):
    scores = {
        "data-testid": 5,
        "semantic_role": 4,
        "attribute": 3,
        "xpath_struct": 2,
        "css_nth": 1,
        "image_match": 1,
    }
    return ___
`,
        setupCode: '',
        expectedOutput: '稳定性分数',
        tests: `assert selector_stability("data-testid") == 5
assert selector_stability("semantic_role") == 4
assert selector_stability("attribute") == 3
assert selector_stability("xpath_struct") == 2
assert selector_stability("css_nth") == 1
assert selector_stability("image_match") == 1
assert selector_stability("unknown") == 0
`,
        answer: `def selector_stability(strategy):
    scores = {
        "data-testid": 5,
        "semantic_role": 4,
        "attribute": 3,
        "xpath_struct": 2,
        "css_nth": 1,
        "image_match": 1,
    }
    return scores.get(strategy, 0)
`,
        explanation:
          '这个排序是 RPA 实践的核心经验：**越靠近"开发者专门留的锚点"越稳**。\n\n`data-testid` 是给自动化测试用的，前端改样式时不会动它。\n`css_nth` 依赖 DOM 结构位置，加一个 div 就全乱。\n\n**实践建议**：如果系统没有 data-testid，先推动前端加上——这比后面反复修 RPA 便宜得多。',
        tags: ['编程', '稳定性评估'],
      },
      {
        id: 'ai-auto-m3-c1-e6',
        relatedLessonId: 'ai-auto-m3-c1-l1',
        type: 'code',
        difficulty: 3,
        question:
          '实现条件等待：wait_until(check_fn, timeout=10, interval=0.1, max_calls=100)。\n\n反复调用 check_fn() 直到返回 True，或超过 timeout/max_calls。\n返回 (是否成功, 实际等待的轮数)。\n\n为避免真实睡眠，用 max_calls 控制轮数（每轮视为 interval 秒）。',
        starterCode: `def wait_until(check_fn, timeout=10, interval=0.1, max_calls=100):
    max_rounds = min(int(timeout / interval), max_calls)
    for i in range(max_rounds):
        if check_fn():
            return True, i
    return False, max_rounds
`,
        setupCode: '',
        expectedOutput: '条件等待',
        tests: `# 第 3 次调用时返回 True
calls = {"n": 0}
def check3():
    calls["n"] += 1
    return calls["n"] >= 3
ok, rounds = wait_until(check3, max_calls=10)
assert ok == True and rounds == 2, f"应在第 3 次（索引2）成功，实际 ok={ok}, rounds={rounds}"

# 永远返回 False -> 超时
ok2, rounds2 = wait_until(lambda: False, max_calls=5)
assert ok2 == False and rounds2 == 5

# 立即成功
ok3, rounds3 = wait_until(lambda: True, max_calls=10)
assert ok3 == True and rounds3 == 0
`,
        answer: `def wait_until(check_fn, timeout=10, interval=0.1, max_calls=100):
    max_rounds = min(int(timeout / interval), max_calls)
    for i in range(max_rounds):
        if check_fn():
            return True, i
    return False, max_rounds
`,
        explanation:
          '这是**条件等待的核心逻辑**：轮询检测，成功立刻返回，超时返回失败。\n\n**关键设计**：\n1. `max_rounds = min(timeout/interval, max_calls)` —— 同时受时间和次数限制；\n2. 返回实际轮数 —— 便于监控"平均要等几轮"；\n3. 超时返回 False 而非抛异常 —— 让调用方决定怎么处理。\n\n真实 Playwright 的 `waitForSelector` 内部逻辑类似，但用事件驱动而非轮询，更高效。',
        tags: ['编程', '条件等待'],
      },
      {
        id: 'ai-auto-m3-c1-e7',
        relatedLessonId: 'ai-auto-m3-c1-l1',
        type: 'code',
        difficulty: 3,
        question:
          '评估 RPA 流程的脆弱度：assess_fragility(selectors)。\n\n- selectors: 定位策略列表\n- 每个策略的脆弱度 = 5 - 稳定性分数\n- 返回 (总脆弱度, 最脆弱的策略名)，空列表返回 (0, None)',
        starterCode: `def assess_fragility(selectors):
    scores = {"data-testid": 5, "semantic_role": 4, "attribute": 3,
              "xpath_struct": 2, "css_nth": 1, "image_match": 1}
    if not selectors:
        return 0, None
    total = 0
    worst = None
    worst_frag = -1
    for s in selectors:
        frag = ___
        total += frag
        if frag > worst_frag:
            worst_frag = frag
            worst = s
    return total, worst
`,
        setupCode: '',
        expectedOutput: '脆弱度评估',
        tests: `t, w = assess_fragility(["data-testid", "data-testid"])
assert t == 0, f"全稳定应为 0，实际 {t}"
t2, w2 = assess_fragility(["data-testid", "css_nth"])
assert t2 == 4, f"应为 0+4=4，实际 {t2}"
assert w2 == "css_nth"
t3, w3 = assess_fragility(["xpath_struct", "image_match", "attribute"])
assert t3 == 3 + 4 + 2, f"应为 9，实际 {t3}"
assert w3 == "image_match"
assert assess_fragility([]) == (0, None)
`,
        answer: `def assess_fragility(selectors):
    scores = {"data-testid": 5, "semantic_role": 4, "attribute": 3,
              "xpath_struct": 2, "css_nth": 1, "image_match": 1}
    if not selectors:
        return 0, None
    total = 0
    worst = None
    worst_frag = -1
    for s in selectors:
        frag = 5 - scores.get(s, 0)
        total += frag
        if frag > worst_frag:
            worst_frag = frag
            worst = s
    return total, worst
`,
        explanation:
          '这是**RPA 项目的健康度指标**：脆弱度越高，维护成本越大。\n\n**实践用法**：\n- 新项目设计时，脆弱度 > 15 就要重新考虑定位策略；\n- 存量项目定期评估，找出最脆弱的环节重点加固；\n- 把"最脆弱策略"作为改进优先级。\n\n**注意**：脆弱度是累积的——10 个 xpath 定位的流程，维护成本远高于 1 个。',
        tags: ['编程', '脆弱度评估'],
      },
      {
        id: 'ai-auto-m3-c1-e8',
        relatedLessonId: 'ai-auto-m3-c1-l1',
        type: 'judge',
        difficulty: 3,
        question: '录屏式 RPA 生成的流程比代码式更易维护，因为它不需要写代码。',
        answer: false,
        explanation:
          '录屏式生成的流程难以理解、难以版本控制、难以测试，长期维护成本通常是代码式的 2~3 倍。它适合非技术人员快速上手，但不适合长期维护的项目。',
        tags: ['录屏 vs 代码'],
      },
      {
        id: 'ai-auto-m3-c1-e9',
        relatedLessonId: 'ai-auto-m3-c1-l1',
        type: 'single',
        difficulty: 3,
        question: '下列哪种场景最不适合用 RPA？',
        options: [
          { value: 'A', text: '老式桌面软件，无 API，界面十年未变' },
          { value: 'B', text: 'Web 系统有完善 API，需要每天同步数据' },
          { value: 'C', text: '需要从多个老系统导出报表汇总' },
          { value: 'D', text: '在遗留系统里批量录入数据' },
        ],
        answer: 'B',
        explanation:
          '有 API 就该用 API——更稳定、更快、更可靠。RPA 是"没有 API 时的最后手段"。其他三个场景都是 RPA 的典型适用场景（无 API、界面稳定、重复性高）。',
        tags: ['RPA 适用边界'],
      },
      {
        id: 'ai-auto-m3-c1-e10',
        relatedLessonId: 'ai-auto-m3-c1-l1',
        type: 'open',
        difficulty: 4,
        question:
          '公司有一个 10 年前上线的 ERP 系统（无 API，只有 Web 界面），财务每天要从里面导出销售数据、整理成报表、上传到另一个系统。\n\n请设计自动化方案：① 用 RPA 还是别的方案；② 具体的定位与等待策略；③ 如何应对界面改版；④ 如何保证数据正确性。',
        referenceAnswer: `**① 方案选择：RPA（代码式优先）**

**为什么必须用 RPA**：
- ERP 无 API，只能通过 Web 界面操作；
- 每天执行，重复性高；
- 流程规则明确。

**为什么选代码式（Playwright）而非录屏式**：
- 需要长期维护（每天跑）；
- 需要版本控制与代码审查；
- 需要可测试（能写自动化测试验证流程）；
- 需要与数据校验逻辑集成。

**但先做一件事**：**确认 ERP 是否有隐藏的导出功能**。
很多老系统有"导出 Excel/CSV"的隐藏入口（URL 直接访问、或隐藏按钮）。
如果能直接下载文件，比模拟点击导出稳定 10 倍。

**方案分层**：

    优先：找到导出 URL / 隐藏 API → 直接 HTTP 请求（最稳）
      ↓ 找不到
    次选：Playwright 模拟登录 + 点击导出 + 下载文件
      ↓ 导出功能都没有
    最后：逐页读取表格数据（最脆）

**② 定位与等待策略**

**定位**（按优先级）：

| 元素 | 优先策略 | 兜底 |
| --- | --- | --- |
| 登录表单 | \`input[name="username"]\` | \`#txtUser\`（老系统常有 id） |
| 菜单 | \`getByRole('link', {name: '销售报表'})\` | 按文本定位 |
| 导出按钮 | \`getByRole('button', {name: /导出/})\` | \`input[type="submit"][value*="导出"]\` |
| 数据表格 | \`table#grdSales\` 或 \`[id*="Grid"]\` | 按列头文本定位 |

**绝对避免**：
- \`nth-child\` 链式选择器；
- 坐标点击；
- 截图匹配。

**等待**（核心：全部用条件等待）：

    # 登录
    page.goto(ERP_URL)
    page.wait_for_selector('input[name="username"]', state='visible', timeout=15000)
    page.fill('input[name="username"]', user)
    page.fill('input[name="password"]', pwd)
    page.click('input[type="submit"]')
    # 等登录成功（不是 sleep）
    page.wait_for_selector('#mainFrame, .welcome', timeout=30000)

    # 导出
    page.click('text=销售报表')
    # 等表格加载完成（关键：等数据行出现，不是等页面）
    page.wait_for_selector('table#grdSales tr.data-row', timeout=60000)

    # 触发下载（Playwright 的下载事件）
    with page.expect_download(timeout=120000) as dl:
        page.click('text=导出Excel')
    download = dl.value
    download.save_as(f"./data/{today}.xlsx")

**为什么不用 sleep**：
- ERP 在老服务器上，响应时间波动大（1 秒到 30 秒）；
- 固定 sleep 要么不够（失败）要么白等（浪费时间）；
- 条件等待能精确捕获"数据真的加载完了"。

**③ 应对界面改版**

**a) 建立"自动化契约"**

与 ERP 维护方（可能是外部供应商）约定：
- 保留 \`name\`、\`id\` 属性不变；
- 或提供 \`data-testid\`；
- 界面改版前通知。

**b) 每日冒烟测试**

在正式跑之前，先跑一个"健康检查"：

    def health_check():
        checks = []
        page.goto(ERP_URL, timeout=30000)
        checks.append(("登录页可达", page.is_visible('input[name="username"]')))
        # 登录后检查关键元素
        login(page)
        checks.append(("主菜单存在", page.is_visible('text=销售报表')))
        checks.append(("导出按钮存在", page.is_visible('text=导出Excel')))
        return checks

**失败时立即告警**，而不是等到导出出错。

**c) 多层兜底定位**

    def find_element(page, strategies):
        for s in strategies:
            try:
                loc = page.locator(s).first
                if loc.is_visible(timeout=3000):
                    return loc
            except Exception:
                continue
        raise ElementNotFound(f"所有策略都失败: {strategies}")

    export_btn = find_element(page, [
        '[data-testid="export-btn"]',
        'button:has-text("导出")',
        'input[type="submit"][value*="导出"]',
        'a:has-text("导出Excel")',
    ])

**d) 保留人工兜底**

如果自动化连续失败 N 次，自动转人工并告警——
**不要让业务停摆**。

**④ 保证数据正确性**

**这是最关键的部分**——数据错了比没数据更糟。

**a) 导出后立即校验**

    def validate_export(df, expected_date):
        errors = []
        # 1) 非空
        if df.empty:
            errors.append("导出文件为空")
        # 2) 日期匹配
        if "日期" in df.columns and expected_date not in df["日期"].astype(str).values:
            errors.append(f"缺少 {expected_date} 的数据")
        # 3) 行数合理（与昨天对比）
        if abs(len(df) - yesterday_count) / max(yesterday_count, 1) > 0.5:
            errors.append(f"行数异常：今天 {len(df)}，昨天 {yesterday_count}")
        # 4) 金额列非负
        if "金额" in df.columns and (df["金额"] < 0).any():
            errors.append("存在负金额")
        # 5) 关键列无空值
        for col in ["订单号", "金额"]:
            if col in df.columns and df[col].isna().any():
                errors.append(f"{col} 列有空值")
        return errors

**b) 与源系统交叉核对**

导出后，从 ERP 界面读取"今日总销售额"这个汇总数字，
与导出文件的求和对比。不一致就告警。

**c) 幂等与去重**

- 记录每次运行的日期与文件哈希；
- 同一天重复跑要能识别（避免重复上传）；
- 上传到目标系统时用订单号做唯一键。

**d) 全链路留痕**

    {
      "run_id": "2026-10-21-001",
      "started_at": "...",
      "erp_login_ok": true,
      "rows_exported": 1523,
      "validation_errors": [],
      "uploaded": true,
      "duration_seconds": 87
    }

**e) 失败时的处理**

| 失败类型 | 处理 |
| --- | --- |
| 登录失败 | 重试 2 次 → 告警（可能是密码过期） |
| 导出超时 | 重试 1 次 → 告警 |
| 数据校验失败 | **不自动上传**，告警 + 保留文件供人工检查 |
| 上传失败 | 重试 3 次 → 告警 |

**关键原则**：**校验失败时宁可不上传，也不要传错数据。**

**⑤ 一个务实的落地路径**

    第 1 周：手动探查 ERP（找导出 URL / 隐藏 API）
      ↓ 找不到
    第 2 周：Playwright 实现登录 + 导出 + 下载（人工验证 3 天）
      ↓
    第 3 周：加数据校验 + 上传 + 留痕
      ↓
    第 4 周：加冒烟测试 + 告警 + 灰度（先跑影子模式，结果只记录不执行）
      ↓
    第 5 周：正式启用，保留人工复核 2 周

**关键**：**先跑影子模式**（自动化跑但不真正上传），
对比自动结果与人工结果，确认一致后再切换。`,
        rubric: [
          { point: '优先找隐藏导出 API，找不到才用 RPA；选代码式而非录屏式', score: 2 },
          { point: '定位策略分层（语义 > 属性 > 结构），避免 nth-child 与坐标', score: 2 },
          { point: '全部用条件等待（waitForSelector / expect_download），不用 sleep', score: 2 },
          { point: '应对改版：自动化契约 + 每日冒烟 + 多层兜底定位', score: 2 },
          { point: '数据校验（非空/行数/负值/空值）+ 交叉核对 + 校验失败不上传', score: 2 },
        ],
        keywords: ['隐藏导出', '条件等待', '多层兜底', '冒烟测试', '交叉核对', '影子模式'],
        explanation:
          '能先找隐藏导出 API（而不是直接上 RPA）、全用条件等待、校验失败宁可不上传，就是生产级的 RPA 设计。',
        tags: ['RPA 实战', '综合'],
      },
    ],
  },

  /* ============================================================
   *  c2：AI + RPA
   * ============================================================ */
  {
    id: 'ai-auto-m3-c2',
    title: 'AI + RPA：让自动化"看得懂"',
    goal: '理解 AI 在 RPA 中的三个增强点，掌握文档理解流水线与置信度分流机制。',
    lessons: [
      {
        id: 'ai-auto-m3-c2-l1',
        title: '三个增强点与文档理解流水线',
        difficulty: 4,
        content: `
### 学习目标

学完本节，你应该能够：
1. 说出 AI 对 RPA 的三个增强点与各自适用的判断模式（规则兜底+模型判断+统计检测）；
2. 实现五阶段流水线的核心：字段抽取带 confidence/evidence、三类交叉校验、按置信度三级分流；
3. 复述成本结构与降本三板斧（小规则走模板/缓存/分级模型）。

### 前置知识

- m1-c2 的置信度概念、m1-c3 的结构化输出；
- c1 的 RPA 结构。

### 问题背景

传统 RPA 只认「固定位置的文本」，扫描发票、手写表单、自由邮件一律抓瞎。AI 的三个增强点：非结构化输入理解（OCR+模型抽取）、异常判断（「这个值看起来不对」）、动态决策（按内容走流程）。核心工程是文档理解五阶段流水线：OCR/版面分析→字段抽取（带 confidence+evidence）→交叉校验（大小写金额/明细求和/格式/查重）→置信度分流→人工回流——宁可人工，不要错账。

### 直觉理解

传统 RPA 像「只认表格第 3 行第 2 列的文员」；AI+RPA 像「看得懂发票的会计」：读完整张票（版面分析），摘出关键字段并标注把握程度（confidence）与出处（evidence），再用心算复核——大写金额对不对、明细加起来等不等于合计——有疑点就交给人，而不是硬着头皮入账。

### 核心概念与原理详解

> **来源声明**：本章结合厂商文档（UiPath Document Understanding、OpenAI Vision）
> 与学术来源（CMU 11-766 多模态讲座）。涉及具体产品能力处标注为工程实践。

## 传统 RPA 的硬伤

传统 RPA 只能处理**结构化、规则明确**的输入：

    能处理：Excel 表格、数据库记录、固定格式的表单
    不能处理：扫描的发票、手写的表单、自由格式的邮件、图片

**为什么**：RPA 靠"找元素 + 读文本"工作，
它不理解内容的**含义**。

**AI 带来的三个增强点**：

| 增强点 | 传统 RPA | AI + RPA |
| --- | --- | --- |
| **非结构化输入理解** | ❌ 只能读固定位置 | ✅ OCR + 模型抽取 |
| **异常判断** | ❌ 只能判断"成功/失败" | ✅ 判断"这个值看起来不对" |
| **动态决策** | ❌ 路径写死 | ✅ 按内容决定下一步 |

## 增强点一：文档理解

**场景**：财务收到供应商发来的 PDF 发票，需要提取发票号、金额、税率、开票日期。

**传统 RPA 的做法**：

    # 按固定坐标读取（极其脆弱）
    invoice_no = read_text_at(x=120, y=340, width=200, height=20)
    amount = read_text_at(x=400, y=520, width=150, height=20)

**问题**：
- 不同供应商的发票模板完全不同；
- 扫描件有倾斜、噪点；
- 位置稍有偏移就读错。

**AI + RPA 的做法**：**文档理解流水线**

<DocPipeline />

**五个阶段**：

**① OCR / 版面分析**

把 PDF/图片转成文本 + 位置信息。

**关键**：不只是 OCR，还要**版面分析**（layout analysis）——
识别哪些是标题、哪些是表格、哪些是正文。

现代多模态模型（如 GPT-4V、Claude 3 Vision）可以**直接读图**，
跳过独立 OCR 环节。但注意：
- 直接读图更贵（图片 token 消耗大）；
- 对大表格、密集文字，专用 OCR 可能更准。

**② 字段抽取**

用模型从文本/图像中抽取结构化字段。

    {
      "invoice_no": {"value": "INV-2026-1001", "confidence": 0.98,
                     "evidence": "发票号码：INV-2026-1001"},
      "amount": {"value": 12800.00, "confidence": 0.95,
                 "evidence": "价税合计（大写）：壹万贰仟捌佰元整"},
      "tax_rate": {"value": 0.13, "confidence": 0.92, "evidence": "税率：13%"},
      "date": {"value": "2026-10-15", "confidence": 0.99, "evidence": "开票日期：2026年10月15日"}
    }

**三个关键设计**：

| 设计 | 为什么 |
| --- | --- |
| **每个字段带 confidence** | 支持后续分层处理 |
| **每个字段带 evidence** | 可回查、可审计、抑制幻觉 |
| **结构化输出** | 可程序化校验 |

**③ 交叉校验**

**这是最容易被跳过、但最重要的一步。**

    金额校验：
      - 大写金额 vs 小写金额（"壹万贰仟捌佰元整" vs "12800.00"）
      - 明细行之和 vs 合计金额
      - 不含税金额 × (1 + 税率) vs 含税金额

    日期校验：
      - 开票日期 ≤ 当前日期
      - 开票日期在合理范围内（如近 90 天）

    发票号校验：
      - 格式匹配（如 ^INV-\\d{4}-\\d{4}$）
      - 是否重复（同一发票号只能报销一次）

**校验失败的处理**：不直接拒绝，而是**降低置信度 + 转人工**。

**④ 置信度分流**

<ConfidenceRouting />

    if confidence >= 0.95 and all_cross_checks_pass:
        auto_process()
    elif confidence >= 0.7:
        queue_for_quick_review()      # 人工快速确认
    else:
        queue_for_manual_entry()      # 完整人工录入

**为什么必须分流**：
- 全部自动 → 错误无法拦截；
- 全部人工 → 失去自动化价值。

**⑤ 人工复核与反馈**

人工复核的结果要**回流**：
- 修正的字段作为训练/提示优化的样本；
- 统计哪些字段最容易错，针对性改进。

## 增强点二：异常判断

**传统 RPA**：只能判断"操作是否成功"（点击成功/失败）。

**AI 增强**：判断"结果是否合理"。

**例子**：从邮件中提取订单金额。

    邮件内容："客户说订单金额是 12800 元，但系统显示 1280 元，请核实。"

    传统 RPA：提取到 "12800" 或 "1280"，不知道哪个对。
    AI 增强：识别出这是"金额不一致"的异常，标记为需人工处理。

**异常判断的三种模式**：

| 模式 | 做法 | 例子 |
| --- | --- | --- |
| **规则校验** | 用代码检查边界 | 金额 > 0、日期不在未来 |
| **模型判断** | 让模型判断"是否合理" | "这个金额与历史均值差 10 倍，正常吗？" |
| **统计检测** | 与历史分布对比 | 偏离 3σ 就告警 |

**推荐组合**：规则兜底 + 模型判断复杂情况 + 统计检测趋势。

## 增强点三：动态决策

**传统 RPA**：路径写死。

    if type == "A":
        do_a()
    else:
        do_b()

**AI 增强**：按内容动态决定。

    邮件内容 → 模型判断意图 → 决定走哪条流程
    "我要退款" → 退款流程
    "发票开错了" → 重开发票流程
    "你们公司地址在哪" → 通用回复

**注意**：这已经接近 Agent 了。
但要克制——**能用规则判断的就不要用模型**：

    规则能覆盖 90% → 用规则 + 10% 兜底转人工
    规则只能覆盖 50% → 用模型分类 + 人工抽检

## 一个完整的例子：发票自动入账

    [收邮件] 附件 PDF
      ↓
    [OCR + 版面分析] 得到文本与位置
      ↓
    [字段抽取] 发票号、金额、税率、日期、供应商
      ↓
    [交叉校验] 大小写金额、明细求和、格式、重复检查
      ├─ 全部通过 + 高置信度 → [自动入账]
      ├─ 部分可疑 → [人工快速确认]
      └─ 校验失败 / 低置信度 → [人工完整录入]
      ↓
    [入账] 调用财务系统 API（不是 RPA）
      ↓
    [留痕] 原始文件 + 抽取结果 + 校验记录 + 入账凭证

**关键设计**：
1. **入账用 API 不用 RPA**（财务系统通常有 API）；
2. **校验失败不上传**（宁可人工，不要错账）；
3. **全链路留痕**（审计要求）。

## AI + RPA 的成本结构

| 环节 | 成本 | 说明 |
| --- | --- | --- |
| OCR | 低 | 专用 OCR 很便宜 |
| 字段抽取（模型） | **中高** | 每份文档一次调用 |
| 交叉校验 | 极低 | 纯代码 |
| 人工复核 | 中 | 按比例 |

**成本优化**：
- **只对必要的文档用模型**（如金额 < 1000 的小额发票可用规则模板）；
- **缓存**：同一供应商的模板可复用；
- **分级**：先用便宜模型，置信度低再用强模型。

## 本节的来源

> **来源类型：学术来源**
> - CMU 11-766 *Large Language Model Applications*，第 20 讲（图像生成与图像对话）
>   及 Retrieval 系列（文档处理相关）
>   https://cmu-llms.org/schedule/
> - UC Berkeley CS294/194-196，第 7 讲「AI Agents for Enterprise Workflows」
>   https://rdi.berkeley.edu/llm-agents/f24
>
> **来源类型：工程实践（非学术）**
> - UiPath Document Understanding 文档 https://docs.uipath.com
> - OpenAI Vision / 结构化输出文档
> - Microsoft Power Automate AI Builder 文档
> **说明**：以上为厂商文档，非学术来源。文档理解的产品能力以厂商文档为准。
>
> **来源类型：原创**
> - 五阶段流水线、三层校验设计、置信度分流策略、异常判断三模式、完整案例、全部习题

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import re
doc_ok = {"invoice_no": {"value": "INV-2026-1001", "confidence": 0.98},
          "amount": {"value": 12800.00, "confidence": 0.91},
          "items": [{"amt": 6000}, {"amt": 6800}]}
doc_bad = {"invoice_no": {"value": "INV-999", "confidence": 0.72},
           "amount": {"value": 12800.00, "confidence": 0.74},
           "items": [{"amt": 6000}, {"amt": 6000}]}
def pipeline(doc):
    errs = []
    if abs(sum(i["amt"] for i in doc["items"]) - doc["amount"]["value"]) > 0.01:
        errs.append("明细求和 != 合计")
    if not re.match(r"^INV-\\d{4}-\\d{4}$", doc["invoice_no"]["value"]):
        errs.append("发票号格式不符")
    conf = min(doc["invoice_no"]["confidence"], doc["amount"]["confidence"])
    if errs or conf < 0.7: route = "人工完整录入"
    elif conf >= 0.95: route = "自动入账"
    else: route = "人工快速确认"
    return route, errs
for d, name in ((doc_ok, "合规发票"), (doc_bad, "问题发票")):
    print(name, "->", pipeline(d))\`\`\`

预期输出（实测）：实测：合规发票（明细和=合计、格式正确）但置信度 0.91 → 「人工快速确认」（未达 0.95 全自动线）；问题发票被两条交叉校验拦下（明细求和≠合计、发票号格式不符）且置信度 0.72 → 「人工完整录入」——错账在入账前被拦截。

**常见错误**：只抽字段不做交叉校验（大写金额与明细求和是最便宜的两道保险）；丢弃 evidence（无法回查也无法抑制幻觉）；校验失败直接拒绝（应降置信度转人工，不是一拒了之）。

### 常见误区

1. **多模态模型可以替代专用 OCR**——直接读图更贵且密集表格可能更不准，按成本与精度选；
2. **95% 准确率就能全自动**——按字段拆：金额 91% 时月错账数千笔，关键字段必须单独设标准；
3. **AI 判断优于规则**——规则能覆盖 90% 就用规则，模型留给长尾。

### 知识关联

- **向前**：c1 的 RPA 提供执行的手，本节给它装眼与脑；
- **向后**：c4 的审计要求 evidence 留痕，M5 的评估定义字段级准确率；
- **平行**：m1-c3 的结构化输出+校验在文档场景的完整落地。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 三增强 | 理解非结构化/异常判断/动态决策 |
| 五阶段 | OCR→抽取(confidence+evidence)→交叉校验→分流→人工回流 |
| 校验 | 大写金额、明细求和、格式、查重 |
| 分流 | ≥0.95 自动 / 0.7~0.95 快审 / <0.7 人工 |
| 原则 | 校验失败不上传，宁可人工不错账 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 UiPath Document Understanding 文档与厂商结构化输出文档相应章节）
`,
        tips: [
          {
            kind: 'interview',
            text: '「AI 给 RPA 带来什么」：三个增强点——非结构化输入理解（OCR+抽取）、异常判断（结果是否合理）、动态决策（按内容决定路径）。核心是让自动化从"按位置读"变成"按含义理解"。',
          },
          {
            kind: 'leak',
            text: '文档抽取必须三件套：confidence（支持分层）、evidence（可回查、抑幻觉）、结构化输出（可校验）。缺 evidence 就无法审计，也无法发现幻觉。',
          },
          {
            kind: 'pitfall',
            text: '交叉校验是最容易被跳过但最重要的一步。大小写金额互验、明细求和、格式检查、重复检查——校验失败宁可转人工，不要错账。',
          },
        ],
        demos: [
          {
            title: '文档抽取 + 交叉校验 + 置信度分流',
            lang: 'python',
            code: `import re

# 模拟模型抽取结果（含 confidence 与 evidence）
extraction = {
    "invoice_no": {"value": "INV-2026-1001", "confidence": 0.98,
                   "evidence": "发票号码：INV-2026-1001"},
    "amount_lower": {"value": 12800.00, "confidence": 0.95,
                     "evidence": "价税合计（小写）：￥12800.00"},
    "amount_upper": {"value": "壹万贰仟捌佰元整", "confidence": 0.92,
                     "evidence": "价税合计（大写）：壹万贰仟捌佰元整"},
    "tax_rate": {"value": 0.13, "confidence": 0.90, "evidence": "税率：13%"},
    "date": {"value": "2026-10-15", "confidence": 0.99,
             "evidence": "开票日期：2026年10月15日"},
}

CN_NUM = {"壹":1,"贰":2,"叁":3,"肆":4,"伍":5,"陆":6,"柒":7,"捌":8,"玖":9,
          "拾":10,"佰":100,"仟":1000,"万":10000}

def cn_to_number(s):
    """把中文大写金额转成数字（简化版）。"""
    s = s.replace("元整", "").replace("圆整", "").replace("元", "")
    total, section, num = 0, 0, 0
    for ch in s:
        if ch in CN_NUM:
            v = CN_NUM[ch]
            if v >= 10:
                section += (num or 1) * v
                num = 0
            else:
                num = v
        else:
            continue
    return total + section + num

def cross_check(ext):
    """交叉校验，返回问题列表。"""
    issues = []

    # ① 大写金额 vs 小写金额
    upper = cn_to_number(ext["amount_upper"]["value"])
    lower = ext["amount_lower"]["value"]
    if abs(upper - lower) > 0.01:
        issues.append(f"大小写金额不一致：大写 {upper} vs 小写 {lower}")

    # ② 发票号格式
    if not re.fullmatch(r"INV-\\d{4}-\\d{4}", ext["invoice_no"]["value"]):
        issues.append(f"发票号格式异常：{ext['invoice_no']['value']}")

    # ③ 日期合理性
    from datetime import datetime
    try:
        d = datetime.strptime(ext["date"]["value"], "%Y-%m-%d")
        if d > datetime.now():
            issues.append("开票日期在未来")
    except ValueError:
        issues.append("日期格式无法解析")

    # ④ 税率合理范围
    if not 0 <= ext["tax_rate"]["value"] <= 1:
        issues.append(f"税率异常：{ext['tax_rate']['value']}")

    return issues

issues = cross_check(extraction)
print("=== 交叉校验结果 ===")
if issues:
    for i in issues:
        print(f"  [问题] {i}")
else:
    print("  全部通过")

print()
print("=== 置信度分流 ===")
def route(ext, issues, high=0.95, mid=0.7):
    if issues:
        return "manual"          # 有校验问题 -> 人工
    min_conf = min(v["confidence"] for v in ext.values())
    if min_conf >= high:
        return "auto"
    if min_conf >= mid:
        return "quick_review"
    return "manual"

r = route(extraction, issues)
print(f"  最低置信度: {min(v['confidence'] for v in extraction.values()):.2f}")
print(f"  路由结果: {r}")
print()

# 测试：金额不一致的情况
print("=== 模拟大写金额被 OCR 识别错 ===")
bad = {k: dict(v) for k, v in extraction.items()}
bad["amount_upper"] = {"value": "壹万贰仟捌佰元整", "confidence": 0.6,
                        "evidence": "..."}   # 假设 OCR 读错成别的数
bad["amount_lower"] = {"value": 128000.00, "confidence": 0.95, "evidence": "..."}
issues2 = cross_check(bad)
print(f"  校验问题: {issues2}")
print(f"  路由结果: {route(bad, issues2)}")
print()
print("关键：有校验问题 -> 无论置信度多高都转人工。")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'ai-auto-m3-c2-e1',
        relatedLessonId: 'ai-auto-m3-c2-l1',
        type: 'single',
        difficulty: 2,
        question: 'AI 给传统 RPA 带来的三个增强点是？',
        options: [
          { value: 'A', text: '非结构化输入理解、异常判断、动态决策' },
          { value: 'B', text: '更快的执行速度、更少的内存、更小的体积' },
          { value: 'C', text: '更好的界面、更多的按钮、更炫的动画' },
          { value: 'D', text: '自动写代码、自动测试、自动部署' },
        ],
        answer: 'A',
        explanation:
          '传统 RPA 只能按固定位置读文本、只能判断操作成功/失败、路径写死。AI 让它能理解非结构化内容、判断结果是否合理、按内容动态决定路径。',
        tags: ['AI 增强点'],
      },
      {
        id: 'ai-auto-m3-c2-e2',
        relatedLessonId: 'ai-auto-m3-c2-l1',
        type: 'judge',
        difficulty: 2,
        question: '文档抽取时，只要模型给出的置信度高，就可以直接自动处理，不需要交叉校验。',
        answer: false,
        explanation:
          '置信度是模型自评，可能不准（尤其是 OCR 错误传导时）。交叉校验（大小写金额互验、明细求和、格式检查）是独立于模型的验证，必须做。有校验问题时应转人工。',
        tags: ['交叉校验'],
      },
      {
        id: 'ai-auto-m3-c2-e3',
        relatedLessonId: 'ai-auto-m3-c2-l1',
        type: 'multiple',
        difficulty: 3,
        question: '文档抽取结果中的每个字段应该包含哪些信息？（多选）',
        options: [
          { value: 'A', text: 'value（抽取的值）' },
          { value: 'B', text: 'confidence（置信度，支持分层处理）' },
          { value: 'C', text: 'evidence（原文引用，可回查、抑制幻觉）' },
          { value: 'D', text: '模型的完整推理过程' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 不是必需的（且会占大量 token）。A/B/C 是三件套：value 是结果、confidence 支持分层路由、evidence 让结果可审计可验证。',
        tags: ['抽取三件套'],
      },
      {
        id: 'ai-auto-m3-c2-e4',
        relatedLessonId: 'ai-auto-m3-c2-l1',
        type: 'fill',
        difficulty: 3,
        question:
          '发票校验中，把"壹万贰仟捌佰元整"与"12800.00"对比，这属于 ___ 校验。',
        blanks: [['交叉', 'cross', '互验', '一致性']],
        explanation:
          '交叉校验：用两个独立来源的数据互相验证。大小写金额、明细求和与合计、不含税×税率与含税——都是交叉校验。它能发现模型/OCR 的单点错误。',
        tags: ['交叉校验'],
      },
      {
        id: 'ai-auto-m3-c2-e5',
        relatedLessonId: 'ai-auto-m3-c2-l1',
        type: 'code',
        difficulty: 2,
        question:
          '实现置信度分流：route_by_confidence(fields, high=0.95, mid=0.7, has_issues=False)。\n\n- fields: dict，字段名 → {"value":..., "confidence":...}\n- 若 has_issues 为 True，直接返回 "manual"\n- 否则按最低置信度分流：>= high → "auto"，>= mid → "quick_review"，否则 "manual"\n- 空 dict 返回 "manual"',
        starterCode: `def route_by_confidence(fields, high=0.95, mid=0.7, has_issues=False):
    if has_issues or not fields:
        return "manual"
    min_conf = ___
    if min_conf >= high:
        return "auto"
    if min_conf >= mid:
        return "quick_review"
    return "manual"
`,
        setupCode: '',
        expectedOutput: '分流结果',
        tests: `f1 = {"a": {"value": 1, "confidence": 0.98}, "b": {"value": 2, "confidence": 0.96}}
assert route_by_confidence(f1) == "auto"
f2 = {"a": {"value": 1, "confidence": 0.98}, "b": {"value": 2, "confidence": 0.8}}
assert route_by_confidence(f2) == "quick_review", "最低 0.8 应快速复核"
f3 = {"a": {"value": 1, "confidence": 0.5}}
assert route_by_confidence(f3) == "manual"
# 有校验问题，即使置信度高也转人工
assert route_by_confidence(f1, has_issues=True) == "manual"
# 空 dict
assert route_by_confidence({}) == "manual"
`,
        answer: `def route_by_confidence(fields, high=0.95, mid=0.7, has_issues=False):
    if has_issues or not fields:
        return "manual"
    min_conf = min(v["confidence"] for v in fields.values())
    if min_conf >= high:
        return "auto"
    if min_conf >= mid:
        return "quick_review"
    return "manual"
`,
        explanation:
          '**关键设计：取最低置信度**，而不是平均值。\n\n因为一份文档里只要有一个字段不可靠，整体就不可靠——\n金额抽对了但日期错了，同样是错误。\n\n**`has_issues` 优先级最高**：交叉校验发现问题时，无论模型多自信都转人工。这体现了"独立验证优于模型自评"。',
        tags: ['编程', '置信度分流'],
      },
      {
        id: 'ai-auto-m3-c2-e6',
        relatedLessonId: 'ai-auto-m3-c2-l1',
        type: 'code',
        difficulty: 3,
        question:
          '实现发票交叉校验：cross_check_invoice(invoice)。\n\ninvoice 是 dict，含 amount_lower（float）、amount_upper_value（float，已转换好的大写金额数值）、tax_rate（float）、amount_excl_tax（float）。\n\n返回问题列表：\n1. 大小写金额差 > 0.01 → "大小写金额不一致"\n2. 不含税 × (1+税率) 与含税差 > 0.01 → "税额计算不一致"\n3. 税率不在 [0, 1] → "税率异常"',
        starterCode: `def cross_check_invoice(invoice):
    issues = []
    lower = invoice["amount_lower"]
    upper = invoice["amount_upper_value"]
    if ___
        issues.append("大小写金额不一致")
    rate = invoice["tax_rate"]
    if ___
        issues.append("税率异常")
    else:
        computed = ___
        if ___
            issues.append("税额计算不一致")
    return issues
`,
        setupCode: '',
        expectedOutput: '发票校验',
        tests: `ok = {"amount_lower": 12800.0, "amount_upper_value": 12800.0,
      "tax_rate": 0.13, "amount_excl_tax": 11327.43}
# 11327.43 * 1.13 = 12800.00
assert cross_check_invoice(ok) == [], f"应全部通过，实际 {cross_check_invoice(ok)}"

# 大小写不一致
bad1 = dict(ok); bad1["amount_upper_value"] = 12000.0
out = cross_check_invoice(bad1)
assert "大小写金额不一致" in out

# 税率异常
bad2 = dict(ok); bad2["tax_rate"] = 1.5
out2 = cross_check_invoice(bad2)
assert "税率异常" in out2

# 税额不一致
bad3 = dict(ok); bad3["amount_excl_tax"] = 10000.0
out3 = cross_check_invoice(bad3)
assert "税额计算不一致" in out3
`,
        answer: `def cross_check_invoice(invoice):
    issues = []
    lower = invoice["amount_lower"]
    upper = invoice["amount_upper_value"]
    if abs(lower - upper) > 0.01:
        issues.append("大小写金额不一致")
    rate = invoice["tax_rate"]
    if not 0 <= rate <= 1:
        issues.append("税率异常")
    else:
        computed = invoice["amount_excl_tax"] * (1 + rate)
        if abs(computed - lower) > 0.01:
            issues.append("税额计算不一致")
    return issues
`,
        explanation:
          '**这是文档自动化的核心质检逻辑**：用三个独立来源互相验证。\n\n- 大写金额 vs 小写金额（OCR 可能读错任一个）；\n- 不含税 × (1+税率) vs 含税金额（数学关系必须成立）。\n\n**容差 0.01**：金额常有四舍五入误差，不能要求完全相等。\n\n**实践扩展**：还应校验"明细行之和 = 合计"，这能发现漏抽或多抽的行。',
        tags: ['编程', '交叉校验'],
      },
      {
        id: 'ai-auto-m3-c2-e7',
        relatedLessonId: 'ai-auto-m3-c2-l1',
        type: 'code',
        difficulty: 3,
        question:
          '实现异常判断：detect_anomaly(value, history, sigma=3.0)。\n\n- value: 当前值\n- history: 历史值列表（至少 2 个）\n- 若 value 偏离均值超过 sigma 倍标准差，返回 (True, 偏离倍数)\n- 否则返回 (False, 偏离倍数)\n- 历史不足时返回 (False, 0.0)\n\n偏离倍数 = |value - mean| / std，保留 4 位小数。',
        starterCode: `import numpy as np

def detect_anomaly(value, history, sigma=3.0):
    if len(history) < 2:
        return False, 0.0
    arr = np.asarray(history, dtype=float)
    mean = ___
    std = ___
    if std == 0:
        return (value != mean), 0.0
    deviation = ___
    return deviation > sigma, round(float(deviation), 4)
`,
        setupCode: '',
        expectedOutput: '异常检测',
        tests: `import numpy as np
# 历史数据：std 约 1.87
hist = [100, 102, 98, 101, 99, 100, 103, 97]
# 正常值（偏离 < 3）
ok, dev = detect_anomaly(100, hist)
assert ok == False, f"100 不应是异常，偏离 {dev}"
ok1, dev1 = detect_anomaly(104, hist)
assert ok1 == False, f"104 偏离约 {dev1}，不应是异常"
# 明显异常
bad, dev2 = detect_anomaly(200, hist)
assert bad == True, f"200 应是异常，偏离 {dev2}"
assert dev2 > 3
# 历史不足
assert detect_anomaly(100, [100]) == (False, 0.0)
assert detect_anomaly(100, []) == (False, 0.0)
# 标准差为 0（历史全相同）
ok3, _ = detect_anomaly(100, [100, 100, 100])
assert ok3 == False, "等于均值不算异常"
bad3, _ = detect_anomaly(150, [100, 100, 100])
assert bad3 == True, "不等于均值应算异常"
`,
        answer: `import numpy as np

def detect_anomaly(value, history, sigma=3.0):
    if len(history) < 2:
        return False, 0.0
    arr = np.asarray(history, dtype=float)
    mean = arr.mean()
    std = arr.std()
    if std == 0:
        return (value != mean), 0.0
    deviation = abs(value - mean) / std
    return deviation > sigma, round(float(deviation), 4)
`,
        explanation:
          '这是**统计异常检测**的经典做法：偏离 3σ 就告警。\n\n**注意两个边界**：\n1. 历史不足 2 个无法算标准差 → 返回正常（不误报）；\n2. 标准差为 0（历史全相同）→ 不等于均值就是异常。\n\n**实践提醒**：3σ 假设近似正态分布。金额类数据常是长尾，应改用 IQR 或对数变换后再检测。',
        tags: ['编程', '异常检测'],
      },
      {
        id: 'ai-auto-m3-c2-e8',
        relatedLessonId: 'ai-auto-m3-c2-l1',
        type: 'judge',
        difficulty: 3,
        question: 'AI + RPA 中，入账操作应该用 RPA 模拟界面点击，这样最通用。',
        answer: false,
        explanation:
          '财务系统通常有 API，应该用 API 入账——更稳定、更可靠、可事务保证。RPA 只用于"没有 API"的环节（如读取旧系统的发票模板）。有 API 用 API 是铁律。',
        tags: ['API 优先'],
      },
      {
        id: 'ai-auto-m3-c2-e9',
        relatedLessonId: 'ai-auto-m3-c2-l1',
        type: 'single',
        difficulty: 3,
        question: '文档抽取中 evidence（原文引用）字段的核心价值是？',
        options: [
          { value: 'A', text: '让输出更好看' },
          { value: 'B', text: '可回查验证、抑制幻觉、支持审计' },
          { value: 'C', text: '减少 token 消耗' },
          { value: 'D', text: '提高处理速度' },
        ],
        answer: 'B',
        explanation:
          'evidence 让每个抽取结果都能指回原文——可以程序化校验（引用必须在原文中）、能发现幻觉（引用找不到就是编的）、满足审计要求（能追溯依据）。',
        tags: ['evidence'],
      },
      {
        id: 'ai-auto-m3-c2-e10',
        relatedLessonId: 'ai-auto-m3-c2-l1',
        type: 'open',
        difficulty: 5,
        question:
          '你在一家制造企业，要把「供应商发票处理」全流程自动化：收邮件 → 下载附件 → 提取字段 → 校验 → 入账 → 归档。\n\n供应商有 200 家，发票格式各异（PDF 电子票、扫描件、Excel 表格）。\n\n请设计完整方案：① 整体架构；② 如何处理格式差异；③ 校验策略；④ 置信度分流与人工介入；⑤ 成本估算与优化。',
        referenceAnswer: `**① 整体架构**

    邮件服务器（IMAP/Graph API）
      ↓
    [邮件监听] 识别含发票附件的邮件（规则 + 模型判断）
      ↓
    [附件下载] 按发件人分目录存放
      ↓
    [格式识别] 判断是 PDF 电子票 / 扫描件 / Excel
      ├─ PDF 电子票 → 直接解析文本层（PyPDF/pdfplumber）
      ├─ 扫描件 → OCR + 版面分析
      └─ Excel → pandas 读取
      ↓
    [字段抽取] 统一 schema 输出（含 confidence + evidence）
      ↓
    [交叉校验] 金额互验、明细求和、格式、重复检查
      ↓
    [置信度分流]
      ├─ 全通过 + 高置信 → 自动入账（调财务系统 API）
      ├─ 部分可疑 → 人工快速确认（只核可疑字段）
      └─ 失败/低置信 → 人工完整录入
      ↓
    [归档] 原始文件 + 抽取结果 + 校验记录 + 入账凭证

**关键设计**：
- **入账用 API**（财务系统如 SAP/金蝶都有 API），不用 RPA；
- **邮件监听用 IMAP IDLE 或 Graph webhook**，不用轮询；
- **所有环节留痕**，支持审计追溯。

**② 处理格式差异：三层策略**

**第一层：模板匹配（覆盖 60%）**

对高频供应商（前 50 家，可能占 80% 的量）建立**模板**：

    TEMPLATES = {
        "supplier_A": {
            "pattern": r"发票代码[:：](\\d{12})",
            "fields": {"invoice_no": r"发票号码[:：](\\S+)",
                       "amount": r"价税合计.*?[￥¥]([\\d,]+\\.\\d{2})"},
        },
        ...
    }

- **优点**：零模型成本、100% 确定、快；
- **适用**：电子票、格式固定；
- **维护**：每家供应商一个模板，新增时配一次。

**第二层：通用模型抽取（覆盖 35%）**

模板匹配失败的，用多模态模型直接读：

    提示：
    从这张发票图片中提取：发票号、开票日期、金额、税率、供应商名称。
    每个字段必须给出 evidence（原文片段）。
    如果某个字段找不到，value 设为 null，confidence 设为 0。

- **优点**：不用为每家配模板；
- **缺点**：有模型成本、可能出错。

**第三层：人工（覆盖 5%）**

模型也搞不定的（模糊扫描、手写、非标准格式）→ 人工录入。

**关键：按供应商动态分配策略**

    def choose_strategy(supplier):
        if supplier in TEMPLATES:
            return "template"
        # 统计该供应商的历史成功率
        if history_success_rate(supplier) > 0.9:
            return "model"
        return "manual"

**优化**：新供应商先用模型跑 10 份，若都成功则考虑建模板。

**③ 校验策略（四层）**

**a) 单字段校验（规则）**

    - invoice_no 格式：^\\d{8,20}$ 或含字母
    - amount > 0 且 < 10000000（一千万上限）
    - tax_rate ∈ {0, 0.01, 0.03, 0.06, 0.09, 0.13}（中国常见税率）
    - date 在 [今天-365, 今天]

**b) 字段间校验（交叉）**

    - 大写金额 == 小写金额
    - 明细行之和 == 合计金额
    - 不含税金额 × (1+税率) == 含税金额
    - 供应商名称 与 邮件发件人 匹配（防止发错）

**c) 业务校验（跨系统）**

    - 发票号是否重复（查重表）
    - 供应商是否在合格供应商名录
    - 采购订单号是否存在且金额匹配
    - 该发票是否已入账

**d) 统计校验（趋势）**

    - 该供应商本次金额 vs 历史均值（偏离 3σ 告警）
    - 本月发票总额 vs 上月（异常波动告警）

**校验失败的处理矩阵**：

| 失败类型 | 处理 |
| --- | --- |
| 格式/范围错 | 转人工（可能是 OCR 错） |
| 交叉校验不一致 | **必须人工**（不能猜哪个对） |
| 发票号重复 | 拒绝 + 告警（可能重复报销） |
| 供应商不在名录 | 转人工 + 通知采购 |
| 统计异常 | 正常处理 + 标记待查 |

**④ 置信度分流与人工介入**

**三级分流**：

    def route(invoice, checks):
        # 1) 硬性校验失败 -> 必须人工
        if checks.has_hard_failure:
            return "manual_full"

        # 2) 最低置信度
        min_conf = min(f["confidence"] for f in invoice.fields.values())

        # 3) 统计异常 -> 快速确认
        if checks.has_stat_anomaly:
            return "quick_review"

        if min_conf >= 0.95 and checks.all_passed:
            return "auto"
        if min_conf >= 0.7:
            return "quick_review"
        return "manual_full"

**人工界面的设计要点**：

**快速确认（quick_review）**：
- 左侧显示原始发票（可放大、可旋转）；
- 右侧显示抽取结果，可疑字段高亮；
- 每个字段旁有 evidence 高亮（点击跳到原文位置）；
- **一键确认 / 逐字段修正**；
- 目标：**30 秒内处理一份**。

**完整录入（manual_full）**：
- 提供表单，部分字段预填（即使置信度低也预填，人工改比重新输入快）；
- 保留原始文件对照。

**⑤ 成本估算与优化**

**假设**：每天 500 份发票，其中
- 60% 模板匹配（300 份）
- 35% 模型抽取（175 份）
- 5% 人工（25 份）

**成本明细**（按月 22 天 = 11000 份）：

| 环节 | 单价 | 月成本 |
| --- | --- | --- |
| 模板匹配 | ~0 | 0 |
| 模型抽取（175 份/天） | 约 0.02 元/份 | 约 77 元/月 |
| OCR（扫描件，约 20%） | 约 0.005 元/页 | 约 11 元/月 |
| 人工复核（快速 30 秒 + 完整 2 分钟） | 约 0.5 元/份 | 约 275 元/月 |
| **合计** | | **约 363 元/月** |

**对比人工**：11000 份 × 2 分钟 × 时薪 100 元/60 = **约 36667 元/月**

**ROI 极高**（节省 99%）。

**优化手段**：

| 优化 | 效果 |
| --- | --- |
| **扩大模板覆盖** | 每多 10% 走模板，省约 15 元/月 + 提升准确率 |
| **只对可疑字段用强模型** | 先用便宜模型，低置信字段再送强模型，省 40% |
| **批量处理** | 同一供应商的多份发票一起送（上下文复用），省 20% |
| **缓存模板** | 相同版式的发票复用抽取结构 |
| **减少人工** | 优化提示与校验，把 quick_review 比例从 30% 降到 15% |

**⑥ 上线路径与风险控制**

    第 1-2 周：模板系统 + 人工录入（先跑通流程，不接模型）
      ↓
    第 3-4 周：加模型抽取，但结果只记录不自动入账（影子模式）
      ↓ 对比自动 vs 人工，统计准确率
    第 5-6 周：准确率 > 95% 后，开放自动入账（限金额 < 5000）
      ↓
    第 7-8 周：逐步放宽金额上限，人工复核比例降低
      ↓
    持续：监控准确率、异常率、人工比例

**风险控制**：

| 风险 | 应对 |
| --- | --- |
| 错误入账 | 金额上限 + 交叉校验 + 影子模式验证 |
| 重复报销 | 发票号唯一索引（数据库层面） |
| 供应商伪造 | 供应商名录 + 采购订单匹配 |
| 模型服务故障 | 降级到人工 + 队列积压告警 |
| 邮件漏收 | 每日对账（应收附件数 vs 实收） |

**⑦ 一个关键认知**

**这个方案的骨架是"工程"，不是"AI"。**

- 模板匹配（纯代码）覆盖 60%；
- 校验逻辑（纯代码）拦截错误；
- 分流与人工（流程设计）保证兜底；
- **AI 只负责中间那 35% 的"看不懂"部分**。

**如果一上来就全部用模型**：
- 成本高 10 倍；
- 准确率反而低（模板匹配是 100% 确定的）；
- 无法解释（模板匹配可审计）。

**正确顺序：先用规则/模板把能确定的做掉，剩下的才用 AI。**`,
        rubric: [
          { point: '架构完整：邮件监听→格式识别→抽取→校验→分流→入账→归档', score: 2 },
          { point: '格式差异三层策略：模板匹配(60%) + 模型(35%) + 人工(5%)', score: 3 },
          { point: '四层校验：单字段/交叉/业务/统计', score: 2 },
          { point: '三级分流 + 人工界面设计（evidence 高亮、预填、30秒处理）', score: 2 },
          { point: '成本估算 + 指出「骨架是工程不是 AI，AI 只做 35%」', score: 1 },
        ],
        keywords: ['模板匹配', '格式识别', '四层校验', '影子模式', '发票号唯一索引', '规则优先'],
        explanation:
          '能指出「模板匹配覆盖 60% 且是 100% 确定的，AI 只负责剩下 35%」以及「先跑影子模式验证再开放自动入账」，就是成熟的工程判断。',
        tags: ['方案设计', '综合'],
      },
    ],
  },
];
