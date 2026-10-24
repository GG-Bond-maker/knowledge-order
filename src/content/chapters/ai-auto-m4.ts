import type { Chapter } from '../../types';

/* ============================================================
 *  AI 自动化 · M4 代码与文档自动化
 *  c1 代码生成    c2 自动化测试
 *
 *  来源：
 *  - 学术：SWE-bench arXiv:2310.06770
 *  - 学术：Berkeley CS294 第 6 讲「Agents for Software Development」
 *  - 学术：CMU 11-766 第 18 讲「Code-writing assistants」(Zora Wang)
 *  - 学术：MIT 6.820 Fundamentals of Program Analysis（CC BY-NC-SA 4.0）
 *  - 工程实践（非学术）：GitHub Copilot / SWE-agent 公开文档
 *  - 原创：框架、示例、图示、全部习题
 * ============================================================ */

export const aiAutoM4Chapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c1：代码生成
   * ============================================================ */
  {
    id: 'ai-auto-m4-c1',
    title: '代码生成：从补全到自主修改',
    goal: '理解代码生成的三个层次，掌握「生成-测试-修复」循环，知道如何用 SWE-bench 客观衡量能力。',
    lessons: [
      {
        id: 'ai-auto-m4-c1-l1',
        title: '三个层次与生成-测试-修复循环',
        difficulty: 4,
        content: `
### 学习目标

学完本节，你应该能够：
1. 对比三个层次的难度来源（定位/上下文/连锁反应/验证），复述 SWE-bench 的构成与判定设计；
2. 实现「生成-测试-修复」循环：失败输出喂回、回滚再试、3~5 次上限转人工；
3. 用五类失败模式（改测试/幻觉 API/破坏调用方/只改表面/过度重构）审查 AI 改码结果。

### 前置知识

- m2-c1 的 ReAct 循环（循环骨架同源）；
- 基础 Python 与正则。

### 问题背景

代码生成的三个层次难度天差地别：行级补全（接上下文）、函数级生成（理解意图+项目风格）、仓库级修改（定位文件+跨文件依赖+不破坏他人+跑通测试）。仓库级是真难题——SWE-bench 用 2294 个真实 issue-PR 对、以测试判定（FAIL_TO_PASS+PASS_TO_PASS）客观衡量。核心方法论是「生成-测试-修复」循环：回滚、完整失败信息、限次数。

### 直觉理解

函数级生成像「照图纸造一个零件」，仓库级修改像「在正在运行的电厂里换一根电缆」：先得找到是哪根（定位），搞清它连着谁（依赖），换的过程不能停电（不破坏），换完还要全厂试运行（测试）。SWE-bench 就是「电厂检修执照考试」——考官不看报告写得多好，只看电闸合上后全厂灯亮不亮。

### 核心概念与原理详解

## 三个层次

<CodeGenLevels />

| 层次 | 范围 | 需要什么 | 可靠性 |
| --- | --- | --- | --- |
| **行级补全** | 当前行/下一个 token | 光标上下文 | 高（但价值有限） |
| **函数级生成** | 一个完整函数 | 函数签名 + 文档 + 相关代码 | 中 |
| **仓库级修改** | 跨文件改动 | 整个仓库的结构与依赖 | 低（最难） |

**为什么难度差这么大**：

**行级补全**：模型只需要"接得上下一个词"，容错空间大。

**函数级**：需要理解"这个函数要做什么"，
还要符合项目风格、调用已有工具函数。

**仓库级**：需要
- 定位相关文件（哪个文件该改）；
- 理解跨文件依赖；
- 保证不破坏其他功能；
- 跑通测试。

**SWE-bench 的诞生**就是为了衡量第三层——
真实的 GitHub issue 修复，需要跨文件改动并跑通测试。

## 为什么"仓库级"难

**① 定位问题**

给一个 issue："用户登录后头像不显示"。
你需要找到：
- 头像渲染的组件在哪；
- 数据从哪个 API 来；
- 是前端问题还是后端问题。

**模型没有"项目地图"**，只能靠搜索 + 读文件。

**② 上下文限制**

一个中等项目可能有几千个文件。
不可能全塞进上下文。

**必须**：先检索相关文件，再读。

**③ 改动的连锁反应**

改一个函数签名，所有调用点都要改。
模型可能漏掉某处，导致编译失败。

**④ 验证困难**

改完不知道对不对，必须跑测试。

**这就是为什么"生成-测试-修复"循环是核心。**

## 生成-测试-修复循环

<TestRepairLoop />

    for attempt in range(max_attempts):
        patch = llm_generate(task, repo_context)
        apply(patch)
        result = run_tests()
        if result.passed:
            return success
        # 关键：把测试失败的输出喂回模型
        task = task + f"\\n上次尝试失败，测试输出：\\n{result.output}"
        revert(patch)
    return failure

**三个关键设计**：

**① 必须能"回滚"**

每次尝试前记录状态，失败就回滚。
否则第二次尝试是在"已经改坏"的代码上改。

**② 失败信息要完整**

    ❌ "测试失败"
    ✅ "test_login_avatar FAILED
        AssertionError: expected 'avatar.png', got None
        at tests/test_profile.py:42"

模型看到具体错误才能定位。

**③ 限制尝试次数**

通常 3~5 次。超过就应该转人工——
因为连续失败说明"模型没理解问题"，再试也是浪费。

## SWE-bench：客观衡量

**SWE-bench**（arXiv:2310.06770）是代码 Agent 的标准评测集。

**构成**：
- 从 12 个真实 Python 仓库收集的 2294 个 issue-PR 对；
- 每个任务：给定 issue 描述 + 仓库快照，生成 patch；
- 验证：跑 FAIL_TO_PASS（原本失败、修复后应通过）+ PASS_TO_PASS（原本通过、不能弄坏）测试。

**关键设计**：**用测试判定，不用人工评分**。

| 指标 | 含义 |
| --- | --- |
| **Resolved rate** | 生成 patch 后所有测试都通过的比例 |
| **FAIL_TO_PASS** | 原本失败的测试现在通过了 |
| **PASS_TO_PASS** | 原本通过的测试仍然通过（不能破坏） |

**为什么这个设计重要**：

1. **客观**：不用人判断"这个 patch 好不好"；
2. **防止作弊**：不能只改测试让它通过（PASS_TO_PASS 会拦）；
3. **真实**：来自真实项目的真实 issue。

**SWE-bench 揭示的差距**：
- 早期模型 resolved rate 只有个位数；
- 加上 Agent 框架（检索 + 迭代修复）后大幅提升；
- 但仍远未解决——说明"仓库级修改"是真难题。

## 代码生成的实践要点

**① 给足上下文**

| 需要给的 | 为什么 |
| --- | --- |
| 目标函数/文件 | 要改什么 |
| 相关调用方 | 改了会不会破坏调用 |
| 项目约定（风格、工具函数） | 保证一致性 |
| 测试文件 | 知道预期行为 |

**② 明确约束**

    - 不要引入新的第三方依赖
    - 使用项目已有的 utils/date.py 中的 parse_date
    - 保持现有的错误处理风格（raise ValueError）
    - 只改这一个文件

**③ 要求可验证**

    - 修改后必须能通过 tests/test_x.py
    - 不要修改测试文件

**④ 小步快跑**

不要一次让它改 5 个文件。
一次一个函数/一个文件，验证后再下一个。

## 常见失败模式

| 失败 | 原因 | 应对 |
| --- | --- | --- |
| 改了测试而非代码 | 走捷径 | 禁止修改测试文件 |
| 引入不存在的 API | 幻觉 | 提供真实 API 列表 / 让它先查 |
| 破坏其他功能 | 没看调用方 | 提供调用方 + 跑全量测试 |
| 只改表面 | 没理解根因 | 要求先分析再改 |
| 过度重构 | 改太多 | 明确"最小改动" |

## 本节的来源

> **来源类型：学术来源**
> - SWE-bench: *Can Language Models Resolve Real-World GitHub Issues?*，
>   arXiv:[2310.06770](https://arxiv.org/abs/2310.06770)
> - UC Berkeley CS294/194-196，第 6 讲「Agents for Software Development」
>   https://rdi.berkeley.edu/llm-agents/f24
> - CMU 11-766 *Large Language Model Applications*，第 18 讲「Code-writing assistants」
>   （嘉宾 Zora Wang）https://cmu-llms.org/schedule/
> - MIT 6.820 *Fundamentals of Program Analysis*（程序分析视角）
>   https://ocw.mit.edu/courses/6-820-fundamentals-of-program-analysis-fall-2015/
>   许可：CC BY-NC-SA 4.0
>
> **来源类型：工程实践（非学术）**
> - SWE-agent、GitHub Copilot 的公开技术文档
>
> **来源类型：原创**
> - 三层次框架、循环设计要点、失败模式表、全部示例与习题

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import re
def attempt_1(s):
    return re.match(r"^\\d{4}-\\d{2}-\\d{2}$", s) is not None
def attempt_2(s):
    return bool(re.match(r"^\\d{4}[-/]\\d{2}[-/]\\d{2}$", s))
TESTS = [("2026-01-15", True), ("2026/01/15", True), ("bad", False), ("2026-1-5", False)]
def run_loop(max_attempts=2):
    for i, impl in enumerate([attempt_1, attempt_2][:max_attempts], 1):
        fails = [f"  输入 {s!r} 期望 {exp}, 得到 {impl(s)}" for s, exp in TESTS if impl(s) != exp]
        if not fails:
            print(f"第 {i} 次尝试: 全部测试通过 -> success"); return
        print(f"第 {i} 次尝试: 失败")
        print("\\n".join(fails))
        print("  (把失败输出喂回模型, 回滚后重试)")
run_loop()\`\`\`

预期输出（实测）：实测：第 1 次尝试（只支持横线日期）在输入 '2026/01/15' 上失败，失败明细（期望 True 得到 False）被「喂回」；第 2 次尝试修复后全部测试通过 → success——「失败信息完整+回滚重试」正是 SWE-agent 式循环的最小骨架。

**常见错误**：失败反馈只写「测试失败」不给断言明细（模型无法定位）；不回滚就在改坏的代码上继续改（第二次尝试必败）；不限尝试次数（连续失败说明没理解问题，再试是烧钱）。

### 常见误区

1. **代码生成=行级补全的延长线**——仓库级是不同量级的问题（SWE-bench 早期 resolved rate 个位数）；
2. **跑通测试=修好了**——还要 PASS_TO_PASS：没把原本能跑的改坏才算；
3. **一次让 AI 改五个文件更快**——小步快跑，一次一个函数验证后再下一个。

### 知识关联

- **向前**：m2-c1 的 ReAct 循环是本循环的骨架，工具=读写文件+跑测试；
- **向后**：c2 的变异测试评估「测试能否当裁判」，M5 的评估方法论同源；
- **平行**：SWE-bench 的测试判定思想与 m1-c2「工具验证>口头自信」一致。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 三层次 | 行级/函数级/仓库级，难度递增 |
| 循环 | 生成→测试→(失败信息喂回)→修复，限 3~5 次 |
| 判定 | SWE-bench：FAIL_TO_PASS+PASS_TO_PASS |
| 必做 | 回滚、完整失败信息、次数上限 |
| 禁止 | 改测试蒙混、引入不存在 API、大步重构 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见论文原文：Jimenez et al., SWE-bench, arXiv:2310.06770）
`,
        tips: [
          {
            kind: 'interview',
            text: '「代码生成的三个层次」：行级补全（简单，价值有限）、函数级生成（中等）、仓库级修改（最难，需要定位文件+理解跨文件依赖+跑通测试）。SWE-bench 衡量的正是第三层。',
          },
          {
            kind: 'leak',
            text: '「生成-测试-修复」循环的三个关键：必须能回滚（否则在改坏的代码上再改）、失败信息要完整（具体到哪个断言）、限制尝试次数（3~5 次，超过转人工）。',
          },
          {
            kind: 'pitfall',
            text: '模型会走捷径——改测试而不是改代码。必须明确禁止修改测试文件，并用 PASS_TO_PASS 检查不能破坏原有功能。',
          },
        ],
        demos: [
          {
            title: '生成-测试-修复循环（模拟）',
            lang: 'python',
            code: `import re

# ── 模拟"仓库" ──
class Repo:
    def __init__(self):
        self.files = {}
        self.history = []

    def write(self, path, content):
        if path not in self.files:
            self.history.append(("create", path, None))
        else:
            self.history.append(("modify", path, self.files[path]))
        self.files[path] = content

    def read(self, path):
        return self.files.get(path)

    def rollback_last(self):
        """回滚最后一次写入。"""
        if not self.history:
            return False
        action, path, old = self.history.pop()
        if action == "create":
            del self.files[path]
        else:
            self.files[path] = old
        return True

# ── 模拟"测试" ──
def run_tests(repo):
    """执行 repo 中的代码，返回 (是否通过, 输出)。"""
    code = repo.read("solution.py")
    if code is None:
        return False, "solution.py 不存在"
    ns = {}
    try:
        exec(code, ns)
    except Exception as e:
        return False, f"执行失败：{type(e).__name__}: {e}"

    if "add" not in ns:
        return False, "缺少函数 add"

    try:
        assert ns["add"](2, 3) == 5, f"add(2,3) 应返回 5，实际 {ns['add'](2,3)}"
        assert ns["add"](-1, 1) == 0, "add(-1,1) 应返回 0"
        assert ns["add"](0, 0) == 0, "add(0,0) 应返回 0"
    except AssertionError as e:
        return False, f"AssertionError: {e}"
    return True, "3 passed"

# ── 模拟 LLM：第 N 次尝试生成不同版本 ──
def fake_llm(task, attempt, feedback):
    """真实场景这里是一次 API 调用。"""
    if attempt == 1:
        # 第一次：漏了负数处理
        return "def add(a, b):\\n    return a + b if a > 0 else 0"
    if attempt == 2:
        # 第二次：看到失败信息后修正
        return "def add(a, b):\\n    return a + b"
    return "def add(a, b):\\n    return a + b"

# ── 生成-测试-修复循环 ──
def solve(repo, task, max_attempts=3):
    feedback = ""
    for attempt in range(1, max_attempts + 1):
        print(f"--- 第 {attempt} 次尝试 ---")
        patch = fake_llm(task, attempt, feedback)
        repo.write("solution.py", patch)
        print(f"  写入 patch（{len(patch)} 字符）")

        passed, output = run_tests(repo)
        print(f"  测试结果: {'通过' if passed else '失败'}")
        if not passed:
            print(f"  失败信息: {output}")

        if passed:
            print(f"  成功！用了 {attempt} 次尝试")
            return True, attempt

        # 关键：回滚 + 把失败信息喂回去
        repo.rollback_last()
        feedback = output
        print(f"  已回滚，将失败信息喂回模型")
        print()

    print(f"  达到最大尝试次数 {max_attempts}，转人工")
    return False, max_attempts

repo = Repo()
ok, n = solve(repo, "实现 add(a, b) 函数")
print()
print(f"最终结果: {'成功' if ok else '失败'}，尝试 {n} 次")
print(f"最终代码: {repo.read('solution.py')!r}")
print()
print("三个关键设计：")
print("  1) 每次尝试前记录状态，失败就回滚")
print("  2) 失败信息完整喂回（具体到哪个断言）")
print("  3) 限制尝试次数（3~5 次，超过转人工）")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'ai-auto-m4-c1-e1',
        type: 'single',
        difficulty: 2,
        question: '代码生成的三个层次中，最难的是？',
        options: [
          { value: 'A', text: '行级补全' },
          { value: 'B', text: '函数级生成' },
          { value: 'C', text: '仓库级修改（需定位文件、理解跨文件依赖、跑通测试）' },
          { value: 'D', text: '三者一样难' },
        ],
        answer: 'C',
        explanation:
          '仓库级修改需要：定位哪个文件该改、理解跨文件依赖、保证不破坏其他功能、跑通测试。SWE-bench 衡量的正是这一层，目前解决率仍很低。',
        tags: ['三层次'],
      },
      {
        id: 'ai-auto-m4-c1-e2',
        type: 'judge',
        difficulty: 2,
        question: '「生成-测试-修复」循环中，测试失败后应该在原有代码基础上继续修改，不需要回滚。',
        answer: false,
        explanation:
          '必须在每次尝试前记录状态、失败后回滚。否则第二次尝试是在"已经改坏"的代码上再改，错误会累积，最终难以定位。',
        tags: ['回滚'],
      },
      {
        id: 'ai-auto-m4-c1-e3',
        type: 'multiple',
        difficulty: 3,
        question: 'SWE-bench 的评测设计有哪些关键特点？（多选）',
        options: [
          { value: 'A', text: '用测试判定（FAIL_TO_PASS + PASS_TO_PASS），不用人工评分' },
          { value: 'B', text: 'PASS_TO_PASS 防止模型破坏原有功能' },
          { value: 'C', text: '来自真实 GitHub 项目的真实 issue' },
          { value: 'D', text: '由人工逐行审查代码质量打分' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误——SWE-bench 刻意避免人工评分以保证客观性与可复现性。A/B/C 是其核心设计，尤其 PASS_TO_PASS 能防止"改坏其他功能"。',
        tags: ['SWE-bench'],
      },
      {
        id: 'ai-auto-m4-c1-e4',
        type: 'fill',
        difficulty: 3,
        question:
          'SWE-bench 中「原本通过的测试仍需通过」的集合称为 ___（防止模型破坏原有功能）。',
        blanks: [['PASS_TO_PASS', 'pass_to_pass', 'PASS TO PASS']],
        explanation:
          'FAIL_TO_PASS 是"原本失败、修复后应通过"的测试（验证真的修好了）；PASS_TO_PASS 是"原本通过、不能弄坏"的测试（验证没有回归）。两者同时满足才算 resolved。',
        tags: ['评测指标'],
      },
      {
        id: 'ai-auto-m4-c1-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现补丁应用与回滚：apply_patch(repo, path, new_content) 与 rollback(repo, snapshot)。\n\n用 dict 模拟 repo。apply_patch 返回快照（原内容或 None）。rollback 恢复快照。',
        starterCode: `def apply_patch(repo, path, new_content):
    snapshot = repo.get(path)
    ___
    return snapshot

def rollback(repo, path, snapshot):
    if snapshot is None:
        ___
    else:
        ___
`,
        setupCode: '',
        expectedOutput: '补丁应用与回滚',
        tests: `repo = {"a.py": "old"}
snap = apply_patch(repo, "a.py", "new")
assert repo["a.py"] == "new"
assert snap == "old"
rollback(repo, "a.py", snap)
assert repo["a.py"] == "old", f"应恢复原内容，实际 {repo['a.py']}"

# 新建文件后回滚
snap2 = apply_patch(repo, "b.py", "content")
assert "b.py" in repo
assert snap2 is None
rollback(repo, "b.py", snap2)
assert "b.py" not in repo, "新建的文件应被删除"
`,
        answer: `def apply_patch(repo, path, new_content):
    snapshot = repo.get(path)
    repo[path] = new_content
    return snapshot

def rollback(repo, path, snapshot):
    if snapshot is None:
        repo.pop(path, None)
    else:
        repo[path] = snapshot
`,
        explanation:
          '**快照用 None 表示"文件原本不存在"**——这是关键设计。\n\n回滚时要区分两种情况：\n- 原文件存在 → 恢复内容；\n- 原文件不存在（新建的）→ 删除文件。\n\n**生产环境**用 git stash / git checkout 实现，但逻辑相同。没有回滚能力，多次尝试会互相污染。',
        tags: ['编程', '补丁回滚'],
      },
      {
        id: 'ai-auto-m4-c1-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现测试结果解析：parse_test_output(output)。\n\n从 pytest 风格输出中提取：\n- 通过数（"3 passed"）\n- 失败数（"1 failed"）\n- 失败测试名（"FAILED tests/test_x.py::test_y"）\n\n返回 dict：{"passed": int, "failed": int, "failed_tests": [str]}',
        starterCode: `import re

def parse_test_output(output):
    passed = 0
    failed = 0
    failed_tests = []
    m = re.search(r"(\\d+) passed", output)
    if m:
        passed = int(m.group(1))
    m2 = re.search(r"(\\d+) failed", output)
    if m2:
        failed = int(m2.group(1))
    for line in output.split("\\n"):
        if line.strip().startswith("FAILED"):
            ___
    return {"passed": passed, "failed": failed, "failed_tests": failed_tests}
`,
        setupCode: '',
        expectedOutput: '测试结果解析',
        tests: `out1 = """tests/test_a.py::test_1 PASSED
tests/test_a.py::test_2 FAILED
2 passed, 1 failed"""
r = parse_test_output(out1)
assert r["passed"] == 2 and r["failed"] == 1

out2 = """FAILED tests/test_x.py::test_login - AssertionError: expected 1
FAILED tests/test_y.py::test_save - KeyError
5 passed, 2 failed"""
r2 = parse_test_output(out2)
assert r2["passed"] == 5 and r2["failed"] == 2
assert len(r2["failed_tests"]) == 2
assert any("test_login" in t for t in r2["failed_tests"])
assert any("test_save" in t for t in r2["failed_tests"])

# 全部通过
r3 = parse_test_output("10 passed")
assert r3["passed"] == 10 and r3["failed"] == 0 and r3["failed_tests"] == []
`,
        answer: `import re

def parse_test_output(output):
    passed = 0
    failed = 0
    failed_tests = []
    m = re.search(r"(\\d+) passed", output)
    if m:
        passed = int(m.group(1))
    m2 = re.search(r"(\\d+) failed", output)
    if m2:
        failed = int(m2.group(1))
    for line in output.split("\\n"):
        if line.strip().startswith("FAILED"):
            failed_tests.append(line.strip())
    return {"passed": passed, "failed": failed, "failed_tests": failed_tests}
`,
        explanation:
          '**这是"把失败信息喂回模型"的第一步**——先要能从测试输出里提取结构化信息。\n\n**为什么要结构化**：\n- 原始输出可能几百行，直接喂给模型会占满上下文；\n- 结构化后可以只喂"哪几个测试失败 + 失败原因"。\n\n**实践要点**：除了测试名，还要提取断言错误信息（`AssertionError: ...`），这才是模型修正的关键线索。',
        tags: ['编程', '输出解析'],
      },
      {
        id: 'ai-auto-m4-c1-e7',
        type: 'code',
        difficulty: 3,
        question:
          '实现修复循环的停止判断：should_stop(attempt, max_attempts, test_result, same_error_count)。\n\n返回停止原因字符串，或 None 表示继续：\n- 测试通过 → "success"\n- attempt >= max_attempts → "max_attempts"\n- same_error_count >= 2（连续两次同样错误）→ "stuck"\n- 否则 None',
        starterCode: `def should_stop(attempt, max_attempts, test_result, same_error_count):
    if test_result.get("passed"):
        return "success"
    if ___
        return "max_attempts"
    if ___
        return "stuck"
    return None
`,
        setupCode: '',
        expectedOutput: '停止判断',
        tests: `assert should_stop(1, 3, {"passed": True}, 0) == "success"
assert should_stop(3, 3, {"passed": False}, 0) == "max_attempts"
assert should_stop(2, 5, {"passed": False}, 2) == "stuck", "连续同样错误应停止"
assert should_stop(1, 3, {"passed": False}, 0) is None
assert should_stop(2, 5, {"passed": False}, 1) is None
# 优先级：通过优先
assert should_stop(3, 3, {"passed": True}, 5) == "success"
`,
        answer: `def should_stop(attempt, max_attempts, test_result, same_error_count):
    if test_result.get("passed"):
        return "success"
    if attempt >= max_attempts:
        return "max_attempts"
    if same_error_count >= 2:
        return "stuck"
    return None
`,
        explanation:
          '**"stuck" 检测是重要的成本优化**：如果连续两次犯同样的错，说明模型没理解问题，再试也是浪费。\n\n**优先级**：先判成功（可能同时满足其他条件），再判次数，最后判卡住。\n\n**实践扩展**：还可以检测"改动越来越小"（模型在瞎试）或"改动越来越大"（在乱改）。',
        tags: ['编程', '循环控制'],
      },
      {
        id: 'ai-auto-m4-c1-e8',
        type: 'judge',
        difficulty: 3,
        question: '让模型修改代码时，应该允许它修改测试文件，这样更容易让测试通过。',
        answer: false,
        explanation:
          '这是典型的"走捷径"——改测试而不是改代码。必须明确禁止修改测试文件。SWE-bench 的 PASS_TO_PASS 设计就是为了防止这类作弊。',
        tags: ['防作弊'],
      },
      {
        id: 'ai-auto-m4-c1-e9',
        type: 'single',
        difficulty: 3,
        question: '给模型代码生成任务时，最重要的上下文是什么？',
        options: [
          { value: 'A', text: '整个仓库的所有文件' },
          { value: 'B', text: '目标函数 + 相关调用方 + 项目约定 + 测试文件' },
          { value: 'C', text: '只需要目标函数的签名' },
          { value: 'D', text: '模型自己的训练数据' },
        ],
        answer: 'B',
        explanation:
          'A 不可行（上下文超限且噪音大）。C 不够（不知道调用方会被破坏）。B 是必要集合：知道改什么、改了会影响谁、符合什么风格、预期行为是什么。',
        tags: ['上下文设计'],
      },
      {
        id: 'ai-auto-m4-c1-e10',
        type: 'open',
        difficulty: 5,
        question:
          '你要构建一个「自动修复线上 bug」的 Agent：给定 Sentry 的错误堆栈和相关代码，生成修复补丁并提交 PR。\n\n请设计：① 整体流程；② 如何定位相关代码；③ 生成-测试-修复循环的具体设计；④ 如何保证不破坏其他功能；⑤ 上线策略与风险控制。',
        referenceAnswer: `**① 整体流程**

    Sentry 错误事件（含堆栈、上下文）
      ↓
    [解析堆栈] 提取文件路径、行号、函数名
      ↓
    [定位代码] 检索相关文件 + 调用链
      ↓
    [复现] 尝试写一个失败测试复现 bug
      ↓
    [生成修复] 模型基于上下文生成 patch
      ↓
    [验证] 跑 FAIL_TO_PASS（新测试）+ PASS_TO_PASS（全量回归）
      ├─ 通过 → [提交 PR]（草稿状态）
      └─ 失败 → 回滚 + 反馈 → 重试（最多 3 次）
      ↓
    [人工审查] 必须人工 approve 才能合并

**关键**：**Agent 只提交 PR，不直接合并**。这是最重要的安全边界。

**② 定位相关代码**

**第一层：堆栈直接定位**

    # Sentry 堆栈
    File "app/services/order.py", line 142, in calculate_total
        return sum(item.price * item.qty for item in items)

    → 目标文件：app/services/order.py:142

**第二层：调用链扩展**

    # 用静态分析找调用方与被调用方
    grep -rn "calculate_total" app/
    # 或用 AST 解析
    → 得到：app/api/order.py（调用方）、tests/test_order.py（测试）

**第三层：语义检索**

    # 用 issue 描述 + 堆栈信息做向量检索
    query = "calculate_total 报错 AttributeError: 'NoneType' has no attribute 'price'"
    → 检索出相关文件、历史类似 bug 的修复 PR

**第四层：上下文裁剪**

    def build_context(target_file, related_files, max_tokens=50000):
        ctx = []
        # 1) 目标文件全文（最重要）
        ctx.append(("target", read(target_file)))
        # 2) 直接调用方（只取相关函数）
        for f in callers[:5]:
            ctx.append(("caller", extract_relevant_functions(f, target_func)))
        # 3) 测试文件
        ctx.append(("test", read(test_file)))
        # 4) 项目约定（README / CONTRIBUTING 摘要）
        ctx.append(("convention", read_conventions()))
        return trim_to_budget(ctx, max_tokens)

**③ 生成-测试-修复循环**

    def fix_bug(error, repo, max_attempts=3):
        context = build_context(error)
        feedback = ""
        for attempt in range(1, max_attempts + 1):
            # 1) 生成 patch
            patch = llm_generate(
                task=f"修复这个错误：{error.message}\\n堆栈：{error.stack}",
                context=context,
                feedback=feedback,
                constraints=[
                    "只改必要的代码，不要重构",
                    "不要修改测试文件",
                    "不要引入新依赖",
                    "保持现有错误处理风格",
                ],
            )

            # 2) 应用（在隔离分支）
            snapshot = repo.checkout_new_branch(f"fix-{error.id}-{attempt}")
            repo.apply(patch)

            # 3) 先写复现测试（如果还没有）
            if not repo.has_repro_test():
                test_code = llm_generate_test(error, context)
                repo.write_test(test_code)

            # 4) 跑测试
            fail_to_pass = repo.run_tests(only_new=True)
            pass_to_pass = repo.run_tests(only_existing=True)

            if fail_to_pass.passed and pass_to_pass.passed:
                return {"success": True, "patch": patch, "attempt": attempt}

            # 5) 失败：回滚 + 组织反馈
            repo.rollback()
            feedback = format_feedback(fail_to_pass, pass_to_pass)
            # 关键：反馈要具体
            # "test_calculate_total_empty FAILED: expected 0, got None
            #  说明 sum() 对空列表返回 0，但你的代码访问了 items[0]"

            # 6) 检测卡住
            if feedback_same_as_last(feedback):
                return {"success": False, "reason": "stuck"}

        return {"success": False, "reason": "max_attempts"}

**④ 保证不破坏其他功能**

**五道防线**：

**a) 全量回归测试**

    # 不只跑相关测试，跑全量
    result = run_tests("tests/")
    if result.failed > 0:
        reject("回归测试失败")

**b) 静态检查**

    - mypy / pyright 类型检查
    - ruff / flake8 代码风格
    - 循环依赖检查

**c) 差异审查（diff 大小限制）**

    if patch_lines_changed > 100:
        reject("改动过大，可能是重构而非修复")
    if files_changed > 3:
        reject("涉及文件过多")

**d) 只允许"最小改动"**

在提示里明确：

    你的任务是修复这一个 bug，不是重构代码。
    - 优先选择最小的改动
    - 不要修改无关代码
    - 不要重命名变量（除非必要）
    - 不要调整代码格式

**e) 双模型交叉验证（可选）**

    patch_a = llm_a.generate(...)
    patch_b = llm_b.generate(...)
    if patch_a != patch_b:
        # 两个模型给出不同方案，标记为"需人工重点审查"
        mark_high_risk()

**⑤ 上线策略与风险控制**

**分阶段上线**：

    **阶段 1（1~2 月）：只生成建议，不提交**
      - 对每个错误生成 patch，但只展示给工程师看
      - 统计：生成成功率、patch 被采纳率、平均节省时间

    **阶段 2（3~4 月）：提交草稿 PR，人工必须 approve**
      - Agent 提交 draft PR，附上分析与测试结果
      - 工程师审查后决定合并
      - 统计：PR 采纳率、审查耗时

    **阶段 3（5~6 月）：低风险 bug 自动合并**
      - 仅限：改动 < 10 行、单文件、有完整测试覆盖
      - 仍需 CI 全绿 + 人工事后抽查

    **阶段 4：扩大范围**
      - 基于前 3 阶段的统计数据决定

**风险控制清单**：

| 风险 | 应对 |
| --- | --- |
| 改错代码 | 全量回归测试 + 人工 approve |
| 修复引入新 bug | CI 全绿 + 灰度发布 |
| 改测试蒙混 | 禁止修改测试文件（CI 检查 diff） |
| 改动过大 | diff 行数限制（< 100 行 / < 3 文件） |
| 模型幻觉（引用不存在的 API） | 类型检查 + 编译/导入验证 |
| 敏感代码泄露 | 只在内部环境运行，用自托管模型或脱敏 |
| 资源消耗 | 限制每错误最多 3 次尝试，日预算上限 |

**一个必须回答的问题**：

**如果 Agent 的修复引入了线上故障怎么办？**

1. **发现**：监控告警（错误率上升）；
2. **止损**：一键回滚（PR 可 revert）；
3. **追责**：查 audit 日志（哪个 Agent、哪个模型版本、审查人是谁）；
4. **改进**：把这个案例加入评估集，防止再犯。

**所以前提是**：必须能快速回滚。
如果项目不能快速回滚，**不该让 Agent 自动合并**。

**⑥ 一个务实的建议**

**先做"只生成建议"的版本**。

原因：
- 零风险（不改变任何代码）；
- 能收集大量数据（生成成功率、采纳率）；
- 能建立评估集（哪些 bug 修得好、哪些不好）；
- 工程师能逐步建立信任。

**很多团队跳过这一步直接做自动提交，结果第一次出错就失去了信任，项目被叫停。**

**信任是一步步建立的，不是一次跳到的。**`,
        rubric: [
          { point: '整体流程完整 + 强调「Agent 只提交 PR 不直接合并」', score: 2 },
          { point: '定位代码四层：堆栈→调用链→语义检索→上下文裁剪', score: 3 },
          { point: '循环设计：隔离分支 + 回滚 + 具体反馈 + 卡住检测', score: 2 },
          { point: '五道防线：全量回归 + 静态检查 + diff 限制 + 最小改动 + 交叉验证', score: 2 },
          { point: '分阶段上线（先只生成建议）+ 快速回滚前提', score: 1 },
        ],
        keywords: ['草稿 PR', '调用链', '上下文裁剪', 'diff 限制', '快速回滚', '只生成建议'],
        explanation:
          '能指出「先做只生成建议的版本」以及「不能快速回滚就不该自动合并」，就是理解了信任建立的节奏。',
        tags: ['代码 Agent', '综合'],
      },
    ],
  },

  /* ============================================================
   *  c2：自动化测试
   * ============================================================ */
  {
    id: 'ai-auto-m4-c2',
    title: '自动化测试：生成用例与变异测试',
    goal: '能用 AI 生成测试用例，理解覆盖率的局限，掌握变异测试评估测试质量的方法。',
    lessons: [
      {
        id: 'ai-auto-m4-c2-l1',
        title: '测试生成、覆盖率陷阱与变异测试',
        difficulty: 4,
        content: `
### 学习目标

学完本节，你应该能够：
1. 解释覆盖率陷阱（执行到≠验证对）与三种覆盖率的强弱排序；
2. 实现变异测试：对 clamp 函数注入三类变异，计算弱测试与强测试的变异得分（33% vs 100%）；
3. 用四陷阱审查 AI 生成的测试，并实践「变异反馈→补强断言」的组合。

### 前置知识

- c1 的「测试作为裁判」视角；
- pytest 断言基础。

### 问题背景

测试是最枯燥又最该写的代码。AI 能快速生成骨架、提示边界、为遗留代码补测——但「AI 生成的测试可信吗」是关键：看着实现写测试会同源错，弱断言测不出错，覆盖率 100% 也不代表验证了正确性。变异测试给出客观裁判：故意引入小 bug，看测试能否杀死——变异得分低的测试再高的覆盖率也是装饰。

### 直觉理解

覆盖率像「体检走过场」：每科都去了（执行到了）不等于每科都查了（验证对了）。变异测试是「考官故意写错答案看你抓不抓得住」：把 \`/\` 换成 \`*\`、把 \`<\` 换成 \`<=\`——测试还能通过，说明它根本没在验算。断言太弱的测试（is not None）在变异面前全军覆没。

### 核心概念与原理详解

## 为什么测试生成有价值

**现实**：大部分项目的测试覆盖率不足。

原因不是"不想写"，而是：
- 写测试比写功能枯燥；
- 边界情况想不到；
- 时间压力下测试最先被砍。

**AI 能帮上忙的地方**：
- 快速生成"骨架"测试；
- 提示容易漏掉的边界条件；
- 为遗留代码补测试。

**但有个关键问题**：**AI 生成的测试可信吗？**

## 测试生成的三个层次

| 层次 | 输入 | 输出 | 可靠性 |
| --- | --- | --- | --- |
| **基于签名** | 函数名 + 参数类型 | 基本调用测试 | 低（不知道语义） |
| **基于代码** | 完整函数实现 | 覆盖各分支的测试 | 中 |
| **基于规格** | 文档/注释/需求 | 符合预期的测试 | 高（但需要好规格） |

**基于代码的风险**：模型会"照着实现写测试"——
实现错了，测试也跟着错（**同源错误**）。

**这就是为什么需要变异测试。**

## 覆盖率陷阱

**覆盖率** = 被测试执行到的代码行 / 总代码行。

**常见误解**：100% 覆盖率 = 没有 bug。

**为什么错**：

    def divide(a, b):
        return a / b

    def test_divide():
        assert divide(10, 2) == 5      # 覆盖率 100%

这个测试覆盖率 100%，但**完全没测 b=0 的情况**。

**覆盖率衡量的是"执行到了"，不是"验证对了"。**

**三种覆盖率**：

| 类型 | 含义 | 强度 |
| --- | --- | --- |
| **行覆盖** | 每行是否执行过 | 弱 |
| **分支覆盖** | 每个 if/else 分支是否都走过 | 中 |
| **条件覆盖** | 复合条件的每个子条件是否都取过真/假 | 强 |

**实践建议**：行覆盖 80% + 分支覆盖 70% 是合理目标，
但**不要为了数字而写无意义的测试**。

## 变异测试：真正衡量测试质量

**核心思想**：**故意在代码里引入小 bug，看测试能不能发现。**

<MutationDemo />

**流程**：

    1. 对源代码做"变异"（改一个操作符、删一行、改一个常量）
    2. 跑测试
    3. 如果测试失败 → 变异被"杀死"（测试有效）
       如果测试通过 → 变异"存活"（测试有漏洞）

**变异得分** = 被杀死的变异数 / 总变异数

**常见变异算子**：

| 算子 | 例子 |
| --- | --- |
| **算术替换** | \`+\` → \`-\`，\`*\` → \`/\` |
| **关系替换** | \`<\` → \`<=\`，\`==\` → \`!=\` |
| **逻辑替换** | \`and\` → \`or\`，\`not\` 删除 |
| **常量替换** | \`0\` → \`1\`，\`True\` → \`False\` |
| **语句删除** | 删掉一行 |
| **返回值替换** | \`return x\` → \`return None\` |

**为什么变异测试比覆盖率强**：

    覆盖率 100% 的测试：
        assert divide(10, 2) == 5

    变异：把 \`a / b\` 改成 \`a * b\`
    测试仍然通过（10/2=5，10*2=20≠5 应该失败... 等等）

实际上这个变异会被杀死（5 ≠ 20）。
但如果测试是 \`assert divide(10, 2) is not None\`，就杀不死。

**变异测试能发现"断言太弱"的测试。**

## 用 AI 改进测试的具体做法

**① 让 AI 补边界条件**

    提示：
    下面是一个函数。请列出所有可能的边界条件与异常输入，
    并为每个生成一个测试用例。不要修改原函数。

**② 用变异测试找出弱断言**

    1. 用 AI 生成初始测试
    2. 跑变异测试，找出存活的变异
    3. 把"存活的变异 + 原测试"给 AI，让它补充能杀死这些变异的测试

**这是很强的组合**——变异测试告诉 AI"哪里不够"。

**③ 检查 AI 测试的可信度**

| 检查项 | 方法 |
| --- | --- |
| 测试是否真的断言了 | 检查是否有 assert |
| 断言是否具体 | 拒绝 \`assert result is not None\` |
| 是否测了异常路径 | 检查是否有 \`pytest.raises\` |
| 是否独立 | 测试之间不应有依赖 |
| 是否可重复 | 不能依赖时间、随机数、网络 |

## AI 生成测试的四个陷阱

**① 同源错误**

模型看着实现写测试，实现错了测试也错。

**应对**：基于规格（文档）写测试，或让人工审查测试。

**② 弱断言**

    assert result is not None      # ❌ 几乎测不出什么
    assert result == expected      # ✅

**应对**：明确要求"断言具体值"，用变异测试验证。

**③ 测试依赖实现细节**

    assert mock_db.execute.call_count == 2    # ❌ 实现改了测试就崩

**应对**：测行为而非实现。

**④ 不稳定的测试**

    assert datetime.now().year == 2026        # ❌ 明年就失败
    assert random.random() > 0.5              # ❌ 随机失败

**应对**：注入时间/随机源，用固定种子。

## 实践建议

**AI 生成测试的正确用法**：

    1. AI 生成初稿（节省 60% 时间）
    2. 人工审查（补充业务语义）
    3. 变异测试验证（找出弱断言）
    4. 补充边界（AI 容易漏业务特定情况）

**不要**：
- 直接相信 AI 生成的测试；
- 追求覆盖率数字；
- 用 AI 测试替代人工测试设计。

## 本节的来源

> **来源类型：学术来源**
> - SWE-bench arXiv:[2310.06770](https://arxiv.org/abs/2310.06770)（测试判定代码正确性的方法论）
> - MIT 6.820 *Fundamentals of Program Analysis*（程序分析与覆盖度）
>   https://ocw.mit.edu/courses/6-820-fundamentals-of-program-analysis-fall-2015/
>   许可：CC BY-NC-SA 4.0
> - UC Berkeley CS294/194-196，第 6 讲「Agents for Software Development」
>
> **来源类型：工程实践（非学术）**
> - 变异测试工具文档（mutmut / PIT / Stryker）
> - pytest 文档
>
> **来源类型：原创**
> - 测试生成三层次、覆盖率陷阱分析、变异算子表、四陷阱、全部示例与习题

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
def clamp(x, lo, hi):
    return lo if x < lo else (hi if x > hi else x)
MUTANTS = [
    lambda x, lo, hi: hi if x < lo else (hi if x > hi else x),   # 变异1: lo -> hi
    lambda x, lo, hi: lo if x < lo else (lo if x > hi else x),   # 变异2: hi -> lo
    lambda x, lo, hi: None,                                       # 变异3: 删除语句
]
def mutation_score(check):
    killed = sum(1 for m in MUTANTS if not check(m))
    return killed / len(MUTANTS)
weak = lambda impl: all(impl(*a) is not None for a in [(5, 0, 10), (50, 0, 10)])
strong = lambda impl: (impl(5, 0, 10) == 0 and impl(50, 0, 10) == 10 and impl(7, 0, 10) == 7)
print(f"弱测试(只查非 None)变异得分: {mutation_score(weak):.0%}")
print(f"强测试(断言具体值)变异得分: {mutation_score(strong):.0%}")
print("两者行覆盖率都是 100% —— 变异得分才区分测试质量")\`\`\`

预期输出（实测）：实测：只查「非 None」的弱测试变异得分 33%（3 个变异只杀死 1 个——删语句那个），断言具体值的强测试得分 100%——两者行覆盖率都是 100%，变异得分才暴露测试质量的差距。

**常见错误**：让 AI 看着实现写测试（实现错了测试跟着错）；接受 assert result is not None 式弱断言；测试依赖 datetime.now()/random（换个日子就崩）。

### 常见误区

1. **100% 覆盖率=没有 bug**——覆盖率只衡量「执行到」，不衡量「验证对」；
2. **变异测试太慢不实用**——只在关键模块跑、限制变异算子，收益远大于成本；
3. **AI 测试可以直接合入**——人工补业务语义+变异验证后才可信。

### 知识关联

- **向前**：c1 的「用测试判定 patch」预设了测试本身可靠；
- **向后**：M5 的评估方法论与变异思想同源（用受控变化度量判别力）；
- **平行**：m3-c2 的交叉校验是业务数据世界的「变异测试」。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 陷阱 | 覆盖率 100%≠验证对（divide 除零案例） |
| 变异 | 注入小 bug 看测试能否杀死；得分=杀死/总数 |
| 实测 | 弱测试 33% vs 强测试 100% |
| 组合 | AI 生成初稿→变异找漏洞→AI 补强断言 |
| 四陷阱 | 同源错误/弱断言/依赖实现/不稳定 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 SWE-bench（arXiv:2310.06770）的方法论与 mutmut/pytest 文档相应章节）
`,
        tips: [
          {
            kind: 'interview',
            text: '「覆盖率 100% 就说明测试好吗」：不是。覆盖率衡量"执行到了"，不衡量"验证对了"。divide(10,2)==5 覆盖 100% 但完全没测 b=0。要用变异测试衡量测试质量。',
          },
          {
            kind: 'leak',
            text: '变异测试：故意改代码引入 bug，看测试能否发现。变异得分 = 被杀死的变异/总变异。它能发现"断言太弱"的测试，这是覆盖率做不到的。',
          },
          {
            kind: 'pitfall',
            text: 'AI 基于代码生成测试会有「同源错误」——实现错了测试也跟着错。应该基于规格（文档）生成，或人工审查。',
          },
        ],
        demos: [
          {
            title: '变异测试：找出弱断言',
            lang: 'python',
            code: `import copy

# ── 被测代码 ──
SOURCE = """
def divide(a, b):
    if b == 0:
        return None
    return a / b

def is_adult(age):
    return age >= 18

def total_price(items):
    return sum(i["price"] * i["qty"] for i in items)
"""

def load_source():
    ns = {}
    exec(SOURCE, ns)
    return ns

# ── 测试集 ──
def tests_weak(ns):
    """弱测试：断言太宽松。"""
    results = []
    r = ns["divide"](10, 2)
    results.append(("divide 正常", r is not None))          # 弱断言
    results.append(("is_adult 成年人", ns["is_adult"](20) is True))
    r3 = ns["total_price"]([{"price": 10, "qty": 2}])
    results.append(("total_price 非空", r3 is not None))     # 弱断言
    return all(ok for _, ok in results)

def tests_strong(ns):
    """强测试：断言具体值 + 覆盖边界。"""
    results = []
    results.append(("divide 正常", ns["divide"](10, 2) == 5))
    results.append(("divide 除零", ns["divide"](10, 0) is None))
    results.append(("is_adult 18", ns["is_adult"](18) is True))
    results.append(("is_adult 17", ns["is_adult"](17) is False))
    results.append(("total_price", ns["total_price"]([{"price": 10, "qty": 2}]) == 20))
    results.append(("total_price 空", ns["total_price"]([]) == 0))
    return all(ok for _, ok in results)

# ── 变异算子 ──
MUTATIONS = [
    ("算术替换", "return a / b", "return a * b"),
    ("关系替换", "return age >= 18", "return age > 18"),
    ("常量替换", "return age >= 18", "return age >= 19"),
    ("除零判断", "if b == 0:", "if b == 1:"),
    ("返回值替换", "return sum(", "return 0 * sum("),
]

def apply_mutation(source, old, new):
    if old not in source:
        return None
    return source.replace(old, new, 1)

def run_tests(source, test_fn):
    ns = {}
    try:
        exec(source, ns)
        return test_fn(ns)
    except Exception:
        return False      # 代码坏了 -> 测试"失败" -> 变异被杀死

print("=== 变异测试：弱断言 vs 强断言 ===")
print("变异类型      | 弱测试 | 强测试")
print("-" * 38)

weak_killed = 0
strong_killed = 0
for name, old, new in MUTATIONS:
    mutated = apply_mutation(SOURCE, old, new)
    if mutated is None:
        continue
    w = not run_tests(mutated, tests_weak)
    s = not run_tests(mutated, tests_strong)
    weak_killed += w
    strong_killed += s
    print(f"{name:12} | {'杀死' if w else '存活':4} | {'杀死' if s else '存活'}")

total = len([m for m in MUTATIONS if apply_mutation(SOURCE, m[1], m[2])])
print()
print(f"变异得分：弱测试 {weak_killed}/{total} = {weak_killed/total:.0%}")
print(f"          强测试 {strong_killed}/{total} = {strong_killed/total:.0%}")
print()
print("注意：两组测试的行覆盖率都是 100%！")
print("但弱测试的变异得分低 —— 它执行到了代码，但没验证结果。")
print()
print("这就是变异测试的价值：")
print("  覆盖率告诉你「有没有执行到」")
print("  变异测试告诉你「断言是否足够强」")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'ai-auto-m4-c2-e1',
        type: 'single',
        difficulty: 2,
        question: '代码覆盖率达到 100% 意味着？',
        options: [
          { value: 'A', text: '没有 bug' },
          { value: 'B', text: '每行代码都被测试执行过，但不代表验证了正确性' },
          { value: 'C', text: '测试质量很高' },
          { value: 'D', text: '可以上线了' },
        ],
        answer: 'B',
        explanation:
          '覆盖率衡量"执行到了"，不衡量"验证对了"。`assert divide(10,2) is not None` 覆盖 100% 但完全没验证结果。要衡量测试质量需用变异测试。',
        tags: ['覆盖率'],
      },
      {
        id: 'ai-auto-m4-c2-e2',
        type: 'judge',
        difficulty: 2,
        question: '变异测试的做法是：故意在代码中引入小 bug，看测试能否发现。',
        answer: true,
        explanation:
          '如果测试失败，说明变异被"杀死"（测试有效）；如果测试仍通过，说明变异"存活"（测试有漏洞）。变异得分 = 被杀死的变异/总变异，是衡量测试质量的核心指标。',
        tags: ['变异测试'],
      },
      {
        id: 'ai-auto-m4-c2-e3',
        type: 'multiple',
        difficulty: 3,
        question: 'AI 生成测试的常见陷阱有哪些？（多选）',
        options: [
          { value: 'A', text: '同源错误（照着实现写测试，实现错了测试也错）' },
          { value: 'B', text: '弱断言（assert result is not None）' },
          { value: 'C', text: '测试依赖实现细节（mock 调用次数）' },
          { value: 'D', text: '测试写得太多' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 不是陷阱。A/B/C 是真实问题，另外还有"不稳定的测试"（依赖时间、随机数）。应对：基于规格生成、要求具体断言、测行为不测实现、注入时间/随机源。',
        tags: ['测试陷阱'],
      },
      {
        id: 'ai-auto-m4-c2-e4',
        type: 'fill',
        difficulty: 3,
        question:
          '变异测试中，如果引入 bug 后测试仍然通过，称这个变异被 ___（说明测试有漏洞）。',
        blanks: [['存活', 'survive', 'survived']],
        explanation:
          '反之，测试失败说明变异被"杀死"（killed），证明测试有效。变异得分 = killed / total，越高说明测试质量越好。',
        tags: ['变异测试'],
      },
      {
        id: 'ai-auto-m4-c2-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现变异算子：apply_mutations(source, mutations)。\n\n- mutations: [(old, new)] 列表\n- 对每个变异，返回 (原代码, 变异后代码) 列表\n- 若 old 不在 source 中，跳过该变异',
        starterCode: `def apply_mutations(source, mutations):
    result = []
    for old, new in mutations:
        if ___
            continue
        ___
    return result
`,
        setupCode: '',
        expectedOutput: '变异应用',
        tests: `src = "return a + b"
muts = [("+", "-"), ("a", "x"), ("nonexistent", "y")]
out = apply_mutations(src, muts)
assert len(out) == 2, f"应跳过不存在的变异，实际 {len(out)}"
assert out[0] == (src, "return a - b")
assert out[1] == (src, "return x + b")
# 空变异列表
assert apply_mutations(src, []) == []
`,
        answer: `def apply_mutations(source, mutations):
    result = []
    for old, new in mutations:
        if old not in source:
            continue
        result.append((source, source.replace(old, new, 1)))
    return result
`,
        explanation:
          '**`replace(old, new, 1)` 只替换第一处**——这很重要，否则同一行有多个 `+` 时会全部替换，产生的变异不"最小"。\n\n**跳过不存在的模式**：不是所有变异都适用于所有代码，静默跳过而非报错。\n\n**实践**：真实变异测试工具会做语法分析，只在合法位置变异（如不会把字符串里的 `+` 改掉）。',
        tags: ['编程', '变异算子'],
      },
      {
        id: 'ai-auto-m4-c2-e6',
        type: 'code',
        difficulty: 3,
        question:
          '计算变异得分：mutation_score(killed, total)。\n\n返回得分（保留 4 位小数）。total 为 0 时返回 0.0。\n\n同时实现 is_test_sufficient(score, threshold=0.8)，返回是否达标。',
        starterCode: `def mutation_score(killed, total):
    if total == 0:
        return 0.0
    return round(___, 4)

def is_test_sufficient(score, threshold=0.8):
    return ___
`,
        setupCode: '',
        expectedOutput: '变异得分',
        tests: `assert mutation_score(8, 10) == 0.8
assert mutation_score(0, 10) == 0.0
assert mutation_score(10, 10) == 1.0
assert mutation_score(1, 3) == 0.3333
assert mutation_score(0, 0) == 0.0

assert is_test_sufficient(0.85) == True
assert is_test_sufficient(0.8) == True, "恰好等于阈值应达标"
assert is_test_sufficient(0.79) == False
assert is_test_sufficient(0.9, threshold=0.95) == False
`,
        answer: `def mutation_score(killed, total):
    if total == 0:
        return 0.0
    return round(killed / total, 4)

def is_test_sufficient(score, threshold=0.8):
    return score >= threshold
`,
        explanation:
          '**变异得分 0.8 是常见的合格线**，但要看项目类型：\n- 安全关键代码：应 > 0.95；\n- 业务逻辑：> 0.8 合理；\n- UI 代码：> 0.5 可接受（很多变异无关紧要）。\n\n**注意**：有些变异是"等价变异"（改了代码但行为不变），理论上无法被杀死。工具通常会自动检测或人工标记排除。',
        tags: ['编程', '变异得分'],
      },
      {
        id: 'ai-auto-m4-c2-e7',
        type: 'code',
        difficulty: 3,
        question:
          '检测弱断言：find_weak_assertions(test_code)。\n\n找出以下模式的断言（返回行列表）：\n- `assert X is not None`\n- `assert X is not None`\n- `assert len(X) > 0`\n- `assert X`（裸变量，无比较）\n- `assert X != None`',
        starterCode: `import re

def find_weak_assertions(test_code):
    weak = []
    for line in test_code.split("\\n"):
        s = line.strip()
        if not s.startswith("assert"):
            continue
        ___
    return weak
`,
        setupCode: '',
        expectedOutput: '弱断言列表',
        tests: `code = """
def test_a():
    assert result is not None
    assert len(items) > 0
    assert value
    assert x != None
    assert result == 42
    assert items == [1, 2, 3]
"""
out = find_weak_assertions(code)
assert len(out) == 4, f"应检出 4 个弱断言，实际 {len(out)}: {out}"
assert any("is not None" in x for x in out)
assert any("len(" in x for x in out)
assert any("!= None" in x for x in out)
# 强断言不应被检出
assert not any("== 42" in x for x in out)
assert not any("== [1, 2, 3]" in x for x in out)
`,
        answer: `import re

def find_weak_assertions(test_code):
    weak = []
    for line in test_code.split("\\n"):
        s = line.strip()
        if not s.startswith("assert"):
            continue
        body = s[len("assert"):].strip()
        if re.search(r"\\bis not None\\b", body):
            weak.append(s)
        elif re.search(r"\\bis None\\b", body):
            weak.append(s)
        elif re.search(r"!=\\s*None\\b", body):
            weak.append(s)
        elif re.match(r"^len\\([^)]*\\)\\s*>\\s*0$", body):
            weak.append(s)
        elif re.fullmatch(r"[A-Za-z_][\\w.]*", body):
            weak.append(s)
    return weak
`,
        explanation:
          '**弱断言的共同特征：几乎任何输入都能通过**。\n\n- `is not None`：只要不返回 None 就过；\n- `len(x) > 0`：只要非空就过；\n- `assert x`：只要真值就过。\n\n**这不是说它们完全没用**（有时只想验证"没崩溃"），\n但如果整个测试集都是弱断言，那测试就是摆设。\n\n**改进方法**：用变异测试找出存活变异，针对性地把弱断言改成具体值断言。',
        tags: ['编程', '弱断言检测'],
      },
      {
        id: 'ai-auto-m4-c2-e8',
        type: 'judge',
        difficulty: 3,
        question: 'AI 基于函数实现生成的测试是可靠的，因为模型能看到完整代码。',
        answer: false,
        explanation:
          '这恰恰带来"同源错误"——实现错了，测试也跟着错。应该基于规格（文档、需求）生成测试，或人工审查测试逻辑。最可靠的是两者结合 + 变异测试验证。',
        tags: ['同源错误'],
      },
      {
        id: 'ai-auto-m4-c2-e9',
        type: 'single',
        difficulty: 3,
        question: '下列哪个测试是"不稳定测试"（flaky test）？',
        options: [
          { value: 'A', text: 'assert add(2, 3) == 5' },
          { value: 'B', text: 'assert datetime.now().year == 2026' },
          { value: 'C', text: 'assert parse("2026-01-01") == date(2026,1,1)' },
          { value: 'D', text: 'assert len([1,2,3]) == 3' },
        ],
        answer: 'B',
        explanation:
          '依赖当前时间的测试明年就会失败。不稳定测试的常见来源：时间、随机数、网络、文件系统状态、测试执行顺序。应对：注入可控的时间/随机源。',
        tags: ['不稳定测试'],
      },
      {
        id: 'ai-auto-m4-c2-e10',
        type: 'open',
        difficulty: 4,
        question:
          '你的团队有一个 3 万行的 Python 项目，测试覆盖率只有 35%，很多核心模块没有测试。领导要求"半年内把覆盖率提到 80%"。\n\n请设计用 AI 辅助的方案：① 优先级排序；② 如何生成测试；③ 如何验证生成测试的质量；④ 如何避免"为覆盖率而测试"；⑤ 半年计划。',
        referenceAnswer: `**① 优先级排序：不要平均用力**

**四象限法**：

| 维度 | 权重 |
| --- | --- |
| **业务重要性** | 高（核心交易 vs 边缘功能） |
| **变更频率** | 高（经常改的代码更需要测试保护） |
| **当前 bug 密度** | 高（历史 bug 多的模块） |
| **复杂度** | 中（复杂代码更易错） |

**具体打分**：

    def priority_score(module):
        return (
            module.business_importance * 0.4 +
            module.change_frequency * 0.3 +
            module.bug_density * 0.2 +
            module.complexity * 0.1
        )

**排序结果示例**：

    P0（必须测）：支付、订单、用户认证 —— 占代码 20%，风险 80%
    P1（应该测）：库存、优惠券、结算
    P2（可以测）：报表、导出、通知
    P3（不测）：一次性脚本、废弃代码

**关键**：**80% 的价值在 20% 的代码里**。
先把 P0 的覆盖率提到 90%，比把全项目提到 60% 有意义得多。

**② 如何生成测试**

**三层策略**：

**a) 基于规格生成（最可靠）**

对有文档的函数：

    提示：
    下面是函数签名与文档字符串。请生成测试，只依据文档描述的行为，
    不要看实现代码。
    【函数签名】
    【文档字符串】

**为什么"不看实现"**：避免同源错误。测试应该验证"应该做什么"，
而不是"实际做了什么"。

**b) 基于代码生成（补充）**

对没有文档的函数，只能看代码：

    提示：
    分析这个函数的所有执行路径，为每条路径生成一个测试。
    特别关注：边界值、异常输入、空值处理。

**c) 变异测试驱动补强（关键）**

    1. 生成初始测试
    2. 跑变异测试，得到"存活的变异"列表
    3. 把存活的变异 + 原测试喂给 AI：
       "这些变异没有被你的测试发现。请补充能杀死它们的测试。"

**这是最强的组合**——变异测试精确告诉 AI"哪里不够"。

**③ 如何验证生成测试的质量**

**四道检查**：

**a) 变异得分**

每个模块单独算：目标 > 0.75（核心模块 > 0.85）。

**b) 弱断言检测**

自动扫描：

    - assert x is not None      → 标记
    - assert len(x) > 0         → 标记
    - assert x                  → 标记

弱断言占比 > 30% 的测试文件需要重写。

**c) 人工抽查**

每周抽 20 个 AI 生成的测试，人工审查：
- 断言是否真的验证了业务逻辑？
- 是否漏了关键场景？
- 有没有"假测试"（永远通过）？

**d) 反向验证（最有效）**

**故意把实现改错，看测试是否失败。**

    def verify_test_catches_bug(test_file, source_file, bug_patch):
        """应用 bug 后，测试应该失败。"""
        apply(bug_patch)
        try:
            result = run_tests(test_file)
            return not result.passed    # 测试失败 = 有效
        finally:
            revert(bug_patch)

对每个核心函数，准备 2~3 个"典型 bug"（如把 > 改成 >=），
验证测试能发现。

**④ 如何避免"为覆盖率而测试"**

**五个规则**：

**规则 1：覆盖率是结果，不是目标**

    目标：核心模块的变异得分 > 0.85
    覆盖率只是副产品

**规则 2：禁止"无断言测试"**

CI 检查：每个 test 函数至少有一个非弱断言，否则失败。

**规则 3：禁止"测试实现细节"**

    ❌ assert mock_db.execute.call_count == 2
    ✅ assert result.status == "success"

CI 可以用规则检查（禁止 \`call_count\`、\`assert_called_with\` 在业务测试中出现）。

**规则 4：新代码必须有测试，老代码逐步补**

    - 新 PR：必须包含测试（CI 强制）
    - 老代码：按优先级逐步补

**规则 5：定期清理无效测试**

跑变异测试，找出"所有变异都杀不死"的测试文件——这些是"僵尸测试"，应重写或删除。

**⑤ 半年计划**

**第 1 月：建立基础设施 + P0 模块**

    - 搭建变异测试（mutmut / cosmic-ray）
    - 建立"优先级打分"脚本
    - 为 P0 的 3 个核心模块生成测试（人工审查每一个）
    - 目标：P0 覆盖率 35% → 70%，变异得分 > 0.8

**第 2 月：P0 完成 + 建立流程**

    - P0 全部模块变异得分 > 0.85
    - 建立 CI 检查：新代码必须有测试、禁止弱断言
    - 建立"AI 生成 + 人工审查"的标准流程
    - 目标：整体覆盖率 45%

**第 3 月：P1 模块**

    - P1 模块批量生成测试（用变异测试驱动补强）
    - 人工审查重点：断言是否验证业务逻辑
    - 目标：P1 变异得分 > 0.75

**第 4 月：P1 完成 + 历史 bug 回归**

    - 把过去 12 个月的线上 bug 都写成回归测试（最有价值的测试）
    - 目标：整体覆盖率 60%

**第 5 月：P2 模块 + 清理**

    - P2 模块生成测试
    - 清理僵尸测试
    - 目标：整体覆盖率 72%

**第 6 月：收尾 + 制度化**

    - 补齐剩余缺口
    - 把流程写入 CONTRIBUTING.md
    - 目标：整体覆盖率 80%，核心模块变异得分 > 0.85

**⑥ 三个关键提醒**

**提醒 1：不要追求"全项目 80%"**

领导要的是"质量"，不是数字。
P0 模块 95% + P3 模块 20% 比全项目 80% 有价值得多。

**要向领导解释这个逻辑**，而不是盲目追数字。

**提醒 2：AI 生成的测试必须人工审查**

尤其前 3 个月。等流程稳定、变异得分稳定后，才能降低审查比例。

**提醒 3：最值钱的测试是"历史 bug 回归测试"**

每修复一个线上 bug，就写一个测试。
这些测试 100% 有价值——因为它们证明了真实的坑。

**这比"给随机函数生成 10 个测试"有价值 100 倍。**`,
        rubric: [
          { point: '优先级四象限（业务重要性/变更频率/bug 密度/复杂度）+ 80/20', score: 2 },
          { point: '三层生成策略：基于规格（避免同源）+ 基于代码 + 变异驱动补强', score: 3 },
          { point: '四道质量检查：变异得分 + 弱断言检测 + 人工抽查 + 反向验证', score: 2 },
          { point: '五条规则避免为覆盖率而测试', score: 2 },
          { point: '指出「P0 95% > 全项目 80%」+ 历史 bug 回归最值钱', score: 1 },
        ],
        keywords: ['80/20', '基于规格', '变异驱动', '反向验证', '僵尸测试', '历史 bug 回归'],
        explanation:
          '能指出「不要追求全项目 80%，P0 95% 更有价值」以及「历史 bug 回归测试最值钱」，就是理解了测试的真正价值。',
        tags: ['测试策略', '综合'],
      },
    ],
  },
];
