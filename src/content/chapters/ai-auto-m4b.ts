import type { Chapter } from '../../types';

/* ============================================================
 *  AI 自动化 · M4 · c3 代码审查自动化、c4 文档处理
 *
 *  来源：
 *  - 学术：CMU 11-766 Retrieval 系列（第 6-8 讲，RAG 与长文档处理）
 *  - 学术：SWE-bench arXiv:2310.06770（diff 理解）
 *  - 学术：Berkeley CS294 第 6 讲「Agents for Software Development」
 *  - 工程实践（非学术）：GitHub Copilot / CodeRabbit 等工具公开设计
 *  - 原创：框架、示例、图示、全部习题
 * ============================================================ */

export const aiAutoM4Chapters2: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c3：代码审查自动化
   * ============================================================ */
  {
    id: 'ai-auto-m4-c3',
    title: '代码审查自动化',
    goal: '理解 AI 代码审查的能力边界，掌握审查提示设计，知道如何用分级与阈值控制误报。',
    lessons: [
      {
        id: 'ai-auto-m4-c3-l1',
        title: '四个审查维度与误报控制',
        difficulty: 3,
        content: `
## 为什么需要 AI 代码审查

**人工审查的困境**：
- 审查者时间有限，大 PR 容易"扫一眼就 approve"；
- 重复性问题（命名、格式、常见 bug）反复占用精力；
- 审查质量依赖审查者状态。

**AI 能补的部分**：
- 7×24 小时、不疲劳；
- 不漏看（每个 diff 都完整检查）；
- 一致性（同样的标准）。

**AI 不能补的部分**：
- 业务语义（"这个改动符合业务需求吗"）；
- 架构判断（"这个设计合理吗"）；
- 团队上下文（"上周讨论过不要这么写"）。

## 四个审查维度

<ReviewDimensions />

| 维度 | AI 能力 | 说明 |
| --- | --- | --- |
| **正确性** | ⭐⭐⭐⭐ | 逻辑错误、边界条件、空值处理 |
| **安全** | ⭐⭐⭐⭐ | 注入、越权、敏感信息泄露 |
| **性能** | ⭐⭐⭐ | N+1 查询、不必要的循环、大内存分配 |
| **可维护性** | ⭐⭐⭐ | 命名、重复代码、复杂度 |

**AI 最擅长**：正确性与安全（有明确的模式可识别）。
**AI 较弱**：可维护性（涉及团队偏好）。

## 误报的代价

**这是 AI 代码审查最大的问题。**

**误报（false positive）**：AI 报了问题，但实际不是问题。

**代价**：

    误报率高 → 开发者开始忽略所有提示 → 
    AI 审查形同虚设 → 真正的问题也被忽略

**一个真实的比例**：如果误报率 50%，开发者大约 2 周后就会
习惯性点"忽略"。**这是 AI 审查最常见的死法。**

**降低误报的五个手段**：

| 手段 | 做法 |
| --- | --- |
| **提高置信度阈值** | 只报高置信度的问题 |
| **分级** | 必须修 / 建议修 / 可选 |
| **限制范围** | 只检查改动行，不检查整个文件 |
| **给上下文** | 提供项目约定、已有工具函数 |
| **可反馈** | 让开发者标记"误报"，用于优化 |

<FalsePositiveTradeoff />

## 分级设计

**三级分类**：

| 级别 | 含义 | 处理 |
| --- | --- | --- |
| **必须修（blocker）** | 明确 bug、安全漏洞 | 阻止合并 |
| **建议修（suggestion）** | 可能有风险、可改进 | 提示但不阻止 |
| **可选（nit）** | 风格偏好 | 折叠，默认不展示 |

**分级的关键**：**blocker 必须极准**。

如果 blocker 有误报，开发者会失去信任。
所以 blocker 只报"确定性极高"的问题：
- 空指针解引用；
- SQL 注入（直接拼接用户输入）；
- 硬编码密钥。

**suggestion 可以宽松**：即使误报，也只是多看一眼。

## 审查提示的设计

**一个有效的审查提示**：

    # 角色
    你是一个严格的代码审查者。你的任务是找出**确定的问题**，
    而不是提出风格偏好。

    # 输入
    - diff（本次改动）
    - 相关文件的上下文（被调用的函数签名）
    - 项目约定（见下方）

    # 项目约定
    - 使用 utils/date.py 中的 parse_date，不要用 datetime.strptime
    - 错误处理统一 raise ValueError
    - 不要引入新的第三方依赖

    # 检查维度（按优先级）
    1. 正确性：逻辑错误、边界条件、空值、异常路径
    2. 安全：SQL 注入、XSS、越权、密钥硬编码
    3. 性能：循环内查询、不必要的大对象复制
    4. 可维护性：明显重复、过长函数（>100 行）

    # 约束
    - **只报告你能明确指出行号的问题**
    - 每个问题必须说明：为什么是问题 + 怎么改
    - 不确定的问题标记为 "uncertain": true
    - 不要评论格式（由 linter 处理）
    - 不要提"可以更优雅"这类主观意见

    # 输出格式
    {
      "issues": [
        {
          "severity": "blocker" | "suggestion" | "nit",
          "line": int,
          "category": "correctness" | "security" | "performance" | "maintainability",
          "problem": str,
          "suggestion": str,
          "uncertain": bool
        }
      ]
    }

**三个关键设计**：

**① 要求"明确指出行号"**

不能指到行号的问题，往往是"泛泛而谈"，价值低。

**② 要求"为什么 + 怎么改"**

只说"这里有问题"没用，要说"因为 X 会导致 Y，应该改成 Z"。

**③ 允许"不确定"**

强制模型在不确定时标记 \`uncertain: true\`，
这些不展示给开发者（或折叠），能大幅降低误报感。

## 只检查改动行

**关键实践**：只检查 diff 中的**新增/修改行**，不检查整个文件。

**为什么**：
- 检查整个文件会产生大量历史遗留问题，淹没本次改动的问题；
- 开发者只关心"我这次改的对不对"。

**实现**：

    def extract_changed_lines(diff):
        """从 unified diff 提取改动的行号。"""
        changed = set()
        new_line_no = 0
        for line in diff.split("\\n"):
            if line.startswith("@@"):
                # @@ -1,5 +1,7 @@  -> 解析 +1,7
                m = re.search(r"\\+(\\d+)(?:,(\\d+))?", line)
                if m:
                    new_line_no = int(m.group(1))
            elif line.startswith("+") and not line.startswith("+++"):
                changed.add(new_line_no)
                new_line_no += 1
            elif line.startswith("-") and not line.startswith("---"):
                pass      # 删除行不占新行号
            elif not line.startswith("\\\\"):
                new_line_no += 1
        return changed

**只报这些行号的问题。**

## 与 CI 集成

**三个时机**：

| 时机 | 优点 | 缺点 |
| --- | --- | --- |
| **提交前**（pre-commit hook） | 最快反馈 | 慢的话影响开发体验 |
| **PR 创建时** | 有完整上下文 | 反馈延迟 |
| **PR 更新时** | 持续反馈 | 可能重复评论 |

**推荐**：PR 创建时 + 更新时（增量）。

**评论方式**：

- **行内评论**（inline comment）比整体评论更好——开发者能直接看到问题在哪；
- 同一问题**不重复评论**（记录已评论过的位置）；
- 汇总一个"总览评论"（几个 blocker、几个 suggestion）。

## AI 审查的边界

**AI 不该做的**：

| 不该做 | 原因 |
| --- | --- |
| 直接 approve/request changes | 责任在人类审查者 |
| 评论业务逻辑是否正确 | 需要业务上下文 |
| 强制格式 | 交给 linter |
| 建议大重构 | 超出 PR 范围 |
| 对不确定的事下结论 | 造成误报 |

**AI 应该做的**：
- 指出明确的 bug；
- 提示可能的边界条件；
- 标记可疑的安全问题；
- 汇总改动摘要（帮助人类审查者快速理解）。

## 一个务实的上线路径

    阶段 1：只生成摘要（不评论问题）
      → 让开发者习惯 AI 的存在
      → 观察摘要质量

    阶段 2：只报 blocker（极高置信度）
      → 观察误报率
      → 目标：误报 < 10%

    阶段 3：加 suggestion
      → 观察开发者采纳率
      → 目标：采纳率 > 30%

    阶段 4：加 nit（折叠展示）
      → 可选

**关键**：**先窄后宽**。一开始只报最确定的问题，
建立信任后再扩展。

## 本节的来源

> **来源类型：学术来源**
> - UC Berkeley CS294/194-196，第 6 讲「Agents for Software Development」
>   https://rdi.berkeley.edu/llm-agents/f24
> - SWE-bench arXiv:[2310.06770](https://arxiv.org/abs/2310.06770)（diff 理解与代码修改评估）
> - CMU 11-766 *Large Language Model Applications*（第 18 讲代码助手）
>   https://cmu-llms.org/schedule/
>
> **来源类型：工程实践（非学术）**
> - GitHub Copilot Code Review、CodeRabbit 等工具的公开产品文档
> - Google 的 Code Review 指南（业界广泛引用的审查标准）
> **说明**：具体产品的实现细节以其官方文档为准，本节讨论通用方法论。
>
> **来源类型：原创**
> - 四维度框架、误报控制五手段、分级设计、diff 行提取实现、
>   上线路径、全部习题
`,
        tips: [
          {
            kind: 'interview',
            text: '「AI 代码审查最大的问题」：误报。误报率高 → 开发者忽略所有提示 → 审查形同虚设。降低误报靠：高置信度阈值 + 分级 + 只查改动行 + 给上下文 + 可反馈。',
          },
          {
            kind: 'leak',
            text: 'blocker 级别必须极准（只报确定性极高的：空指针、SQL 注入、硬编码密钥）。有误报会让开发者失去信任。suggestion 可以宽松。',
          },
          {
            kind: 'pitfall',
            text: '只检查 diff 中的改动行，不检查整个文件。检查全文件会产生大量历史遗留问题，淹没本次改动的问题，开发者会反感。',
          },
        ],
        demos: [
          {
            title: '从 diff 提取改动行 + 审查结果分级',
            lang: 'python',
            code: `import re
import json

def extract_changed_lines(diff):
    """从 unified diff 提取新增/修改的行号。"""
    changed = set()
    new_line_no = 0
    for line in diff.split("\\n"):
        if line.startswith("@@"):
            m = re.search(r"\\+(\\d+)(?:,(\\d+))?", line)
            if m:
                new_line_no = int(m.group(1))
        elif line.startswith("+") and not line.startswith("+++"):
            changed.add(new_line_no)
            new_line_no += 1
        elif line.startswith("-") and not line.startswith("---"):
            pass
        elif line.startswith("\\\\"):
            pass
        elif line.strip() or line.startswith(" "):
            new_line_no += 1
    return changed

# 模拟 diff
diff = """--- a/app.py
+++ b/app.py
@@ -10,7 +10,10 @@ def get_user(user_id):
     conn = get_conn()
-    cursor.execute("SELECT * FROM users WHERE id = " + user_id)
+    sql = f"SELECT * FROM users WHERE id = {user_id}"
+    cursor.execute(sql)
+    password = "hardcoded_secret_123"
     return cursor.fetchone()
@@ -30,6 +33,7 @@ def process():
     data = load()
+    result = [x for x in data if x is not None]
     return result
"""

changed = extract_changed_lines(diff)
print("=== 改动的行号 ===")
print(sorted(changed))
print()

# 模拟 AI 审查结果
issues = [
    {
        "severity": "blocker",
        "line": 12,
        "category": "security",
        "problem": "SQL 注入：user_id 直接拼进 SQL 字符串",
        "suggestion": "使用参数化查询：cursor.execute('SELECT * FROM users WHERE id = %s', (user_id,))",
        "uncertain": False,
    },
    {
        "severity": "blocker",
        "line": 14,
        "category": "security",
        "problem": "硬编码密钥：password 明文写在代码里",
        "suggestion": "从环境变量或密钥管理服务读取：os.environ['DB_PASSWORD']",
        "uncertain": False,
    },
    {
        "severity": "nit",
        "line": 34,
        "category": "maintainability",
        "problem": "列表推导可以更简洁",
        "suggestion": "建议保持现状，可读性已足够",
        "uncertain": True,
    },
]

print("=== 审查结果（按级别）===")
for sev in ["blocker", "suggestion", "nit"]:
    group = [i for i in issues if i["severity"] == sev]
    print(f"\\n[{sev.upper()}] {len(group)} 个")
    for i in group:
        in_diff = "✓在改动行" if i["line"] in changed else "✗不在改动行"
        unc = " (不确定)" if i["uncertain"] else ""
        print(f"  行 {i['line']} [{i['category']}] {in_diff}{unc}")
        print(f"    问题：{i['problem']}")
        print(f"    建议：{i['suggestion'][:50]}...")

print()
print("=== 过滤规则 ===")
def filter_issues(issues, changed_lines, show_uncertain=False):
    """只保留：在改动行 + 不不确定（除非明确要求）。"""
    return [
        i for i in issues
        if i["line"] in changed_lines and (show_uncertain or not i["uncertain"])
    ]

filtered = filter_issues(issues, changed)
print(f"原始 {len(issues)} 个 -> 过滤后 {len(filtered)} 个")
print("过滤掉：不在改动行的、标记为不确定的")
print()
print("关键：")
print("  1) 只报改动行 —— 避免淹没在历史问题里")
print("  2) 不确定的折叠 —— 大幅降低误报感")
print("  3) 分级 —— blocker 才阻止合并")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'ai-auto-m4-c3-e1',
        type: 'single',
        difficulty: 2,
        question: 'AI 代码审查最大的问题是？',
        options: [
          { value: 'A', text: '速度太慢' },
          { value: 'B', text: '误报率高，导致开发者习惯性忽略所有提示' },
          { value: 'C', text: '不支持所有编程语言' },
          { value: 'D', text: '成本太高' },
        ],
        answer: 'B',
        explanation:
          '误报率 50% 时，开发者约 2 周后就会习惯性点"忽略"，AI 审查形同虚设，真正的问题也被忽略。这是 AI 审查最常见的死法。',
        tags: ['误报'],
      },
      {
        id: 'ai-auto-m4-c3-e2',
        type: 'judge',
        difficulty: 2,
        question: 'AI 代码审查应该检查整个文件，这样才能发现所有问题。',
        answer: false,
        explanation:
          '应该只检查 diff 中的改动行。检查整个文件会产生大量历史遗留问题，淹没本次改动的问题，开发者会反感。开发者只关心"我这次改的对不对"。',
        tags: ['审查范围'],
      },
      {
        id: 'ai-auto-m4-c3-e3',
        type: 'multiple',
        difficulty: 3,
        question: '降低 AI 代码审查误报的手段有哪些？（多选）',
        options: [
          { value: 'A', text: '提高置信度阈值，只报高置信度问题' },
          { value: 'B', text: '分级（blocker/suggestion/nit）' },
          { value: 'C', text: '只检查改动行 + 给项目上下文' },
          { value: 'D', text: '报告所有可能的问题，让开发者自己判断' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 会加剧误报问题。A/B/C 加上"允许标记 uncertain 并折叠"是降低误报的关键手段。核心是"宁缺毋滥"。',
        tags: ['误报控制'],
      },
      {
        id: 'ai-auto-m4-c3-e4',
        type: 'fill',
        difficulty: 3,
        question:
          'AI 代码审查中，只有 ___ 级别的问题才应该阻止合并（blocker），且必须极准。',
        blanks: [['blocker', '必须修', '阻断', 'BLOCKER']],
        explanation:
          'blocker 只报确定性极高的问题（空指针、SQL 注入、硬编码密钥）。有误报会让开发者失去信任。suggestion 可以宽松，nit 应折叠。',
        tags: ['分级'],
      },
      {
        id: 'ai-auto-m4-c3-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现审查结果分级统计：summarize_issues(issues)。\n\n- issues: dict 列表，每个含 "severity" 字段\n- 返回 dict：{"blocker": n, "suggestion": n, "nit": n, "total": n}\n- 未知 severity 归入 "other"',
        starterCode: `def summarize_issues(issues):
    counts = {"blocker": 0, "suggestion": 0, "nit": 0, "other": 0}
    for i in issues:
        sev = i.get("severity", "other")
        if sev in counts:
            ___
        else:
            ___
    counts["total"] = len(issues)
    return counts
`,
        setupCode: '',
        expectedOutput: '分级统计',
        tests: `issues = [
    {"severity": "blocker"}, {"severity": "blocker"},
    {"severity": "suggestion"}, {"severity": "nit"},
]
r = summarize_issues(issues)
assert r["blocker"] == 2 and r["suggestion"] == 1 and r["nit"] == 1
assert r["total"] == 4
# 未知级别
r2 = summarize_issues([{"severity": "unknown"}, {}])
assert r2["other"] == 2 and r2["total"] == 2
# 空列表
r3 = summarize_issues([])
assert r3["total"] == 0 and r3["blocker"] == 0
`,
        answer: `def summarize_issues(issues):
    counts = {"blocker": 0, "suggestion": 0, "nit": 0, "other": 0}
    for i in issues:
        sev = i.get("severity", "other")
        if sev in counts:
            counts[sev] += 1
        else:
            counts["other"] += 1
    counts["total"] = len(issues)
    return counts
`,
        explanation:
          '这个统计用于生成 PR 的**总览评论**："本次审查发现 2 个必须修、1 个建议修、1 个可选"。\n\n**实践要点**：\n- blocker 数 > 0 时在评论顶部醒目提示；\n- 如果 blocker 数异常多（如 > 10），可能是提示设计有问题（误报泛滥）；\n- 统计趋势用于监控误报率变化。',
        tags: ['编程', '结果统计'],
      },
      {
        id: 'ai-auto-m4-c3-e6',
        type: 'code',
        difficulty: 3,
        question:
          '从 unified diff 提取新增行号：extract_changed_lines(diff)。\n\n解析 "@@ -a,b +c,d @@" 后的 + 开头行（排除 +++），\n返回新增行号集合（set）。',
        starterCode: `import re

def extract_changed_lines(diff):
    changed = set()
    new_line_no = 0
    for line in diff.split("\\n"):
        if line.startswith("@@"):
            m = re.search(r"\\+(\\d+)", line)
            if m:
                ___
        elif line.startswith("+") and not line.startswith("+++"):
            ___
            new_line_no += 1
        elif line.startswith("-") and not line.startswith("---"):
            pass
        elif line.startswith("\\\\"):
            pass
        elif line.strip():
            new_line_no += 1
    return changed
`,
        setupCode: '',
        expectedOutput: '新增行号',
        tests: `diff1 = """@@ -1,3 +1,4 @@
 existing
+new line 1
+new line 2
 existing2
"""
out = extract_changed_lines(diff1)
assert out == {2, 3}, f"应为 {{2,3}}，实际 {out}"

# 多个 hunk
diff2 = """@@ -5,2 +5,3 @@
 old
+added
@@ -20,2 +21,3 @@
 x
+y
+z
"""
out2 = extract_changed_lines(diff2)
assert 6 in out2, f"第一个 hunk 新增应在 6，实际 {out2}"
assert 22 in out2 and 23 in out2, f"第二个 hunk 应在 22,23，实际 {out2}"

# 空 diff
assert extract_changed_lines("") == set()
`,
        answer: `import re

def extract_changed_lines(diff):
    changed = set()
    new_line_no = 0
    for line in diff.split("\\n"):
        if line.startswith("@@"):
            m = re.search(r"\\+(\\d+)", line)
            if m:
                new_line_no = int(m.group(1))
        elif line.startswith("+") and not line.startswith("+++"):
            changed.add(new_line_no)
            new_line_no += 1
        elif line.startswith("-") and not line.startswith("---"):
            pass
        elif line.startswith("\\\\"):
            pass
        elif line.strip():
            new_line_no += 1
    return changed
`,
        explanation:
          '**三个关键细节**：\n1. `@@ -a,b +c,d @@` 中的 `+c` 是新文件的起始行号；\n2. 删除行（`-` 开头）**不占新行号**；\n3. `+++` 是文件头，要排除。\n\n**为什么重要**：只对改动行报问题，避免淹没在历史问题里。这是 AI 代码审查的必备过滤。',
        tags: ['编程', 'diff 解析'],
      },
      {
        id: 'ai-auto-m4-c3-e7',
        type: 'code',
        difficulty: 3,
        question:
          '过滤审查结果：filter_issues(issues, changed_lines, show_uncertain=False)。\n\n保留条件：\n- issue["line"] 在 changed_lines 中\n- 若 show_uncertain 为 False，则排除 issue.get("uncertain") 为 True 的',
        starterCode: `def filter_issues(issues, changed_lines, show_uncertain=False):
    result = []
    for i in issues:
        if i.get("line") not in changed_lines:
            continue
        if not show_uncertain and i.get("uncertain"):
            continue
        ___
    return result
`,
        setupCode: '',
        expectedOutput: '过滤结果',
        tests: `issues = [
    {"line": 5, "severity": "blocker"},
    {"line": 100, "severity": "blocker"},
    {"line": 7, "severity": "suggestion", "uncertain": True},
    {"line": 8, "severity": "nit"},
]
changed = {5, 7, 8}
out = filter_issues(issues, changed)
assert len(out) == 2, f"应保留 2 个（5 和 8），实际 {len(out)}"
assert all(i["line"] in {5, 8} for i in out)
# 显示不确定的
out2 = filter_issues(issues, changed, show_uncertain=True)
assert len(out2) == 3
# 空
assert filter_issues([], changed) == []
`,
        answer: `def filter_issues(issues, changed_lines, show_uncertain=False):
    result = []
    for i in issues:
        if i.get("line") not in changed_lines:
            continue
        if not show_uncertain and i.get("uncertain"):
            continue
        result.append(i)
    return result
`,
        explanation:
          '**两层过滤缺一不可**：\n1. **位置过滤**：只报改动行（避免历史问题淹没）；\n2. **置信度过滤**：默认隐藏 uncertain（大幅降低误报感）。\n\n**注意 `i.get("line")`**：用 get 避免 KeyError（模型可能漏返回 line）。\n\n**实践**：uncertain 的问题可以折叠展示，让开发者主动展开——既不丢失信息，又不干扰。',
        tags: ['编程', '结果过滤'],
      },
      {
        id: 'ai-auto-m4-c3-e8',
        type: 'judge',
        difficulty: 3,
        question: 'AI 代码审查应该直接 approve 或 request changes，这样能提高效率。',
        answer: false,
        explanation:
          'AI 不该做 approve/request changes——责任在人类审查者。AI 只提供发现的问题，最终判断由人做。让 AI 直接 approve 会导致责任不清。',
        tags: ['AI 边界'],
      },
      {
        id: 'ai-auto-m4-c3-e9',
        type: 'single',
        difficulty: 3,
        question: 'AI 代码审查的上线路径应该是？',
        options: [
          { value: 'A', text: '一次性上线所有功能' },
          { value: 'B', text: '先只生成摘要 → 只报 blocker → 加 suggestion → 加 nit' },
          { value: 'C', text: '先报 nit，再报 blocker' },
          { value: 'D', text: '不需要分阶段' },
        ],
        answer: 'B',
        explanation:
          '先窄后宽：让开发者习惯 AI 的存在、观察摘要质量，然后只报极准的 blocker 建立信任，再逐步扩展。反过来会因误报失去信任。',
        tags: ['上线路径'],
      },
      {
        id: 'ai-auto-m4-c3-e10',
        type: 'open',
        difficulty: 4,
        question:
          '你要为一个 50 人的研发团队搭建 AI 代码审查系统。团队使用 Python + TypeScript，每周约 200 个 PR。\n\n请设计：① 审查提示的关键设计；② 如何控制误报；③ 与 CI 集成的方案；④ 如何衡量效果；⑤ 半年迭代计划。',
        referenceAnswer: `**① 审查提示的关键设计**

**五个要素**：

**a) 角色与目标**

    你是一个严格的代码审查者。任务是找出**确定的问题**，
    不是提出风格偏好。宁可漏报，不要误报。

**b) 项目约定注入**

    ## 项目约定（必须遵守）
    - Python 用 utils/date.py 的 parse_date，禁止 datetime.strptime
    - 错误处理统一 raise ValueError，不返回 None
    - TypeScript 禁止 any，用 unknown + 类型守卫
    - 禁止引入新的第三方依赖（需先讨论）
    - API 响应必须符合 api/schemas.py 中的 Pydantic 模型

**c) 检查维度与优先级**

    1. 正确性（最高优先级）
       - 空值/None 处理
       - 边界条件（空列表、单元素、极大值）
       - 异常路径是否覆盖
       - 类型不匹配
    2. 安全
       - SQL 注入（字符串拼接）
       - XSS（未转义的 HTML）
       - 越权（未校验资源归属）
       - 硬编码密钥
    3. 性能
       - 循环内数据库查询（N+1）
       - 不必要的大对象复制
    4. 可维护性（仅明显问题）
       - 函数超过 100 行
       - 明显重复代码块（>20 行）

**d) 严格约束（降低误报的关键）**

    ## 约束
    - **只报告能明确指出行号的问题**
    - 每个问题必须包含：问题描述 + 为什么是问题 + 具体修改建议
    - **不确定的问题必须标记 uncertain: true**
    - 不要评论格式（交给 linter）
    - 不要提"可以更优雅""建议重构"这类主观意见
    - 不要报告 diff 之外的代码问题
    - 如果没问题，返回空列表（不要硬凑）

**e) 结构化输出**

    {
      "issues": [
        {
          "line": int,              # 必须是 diff 中的新增行号
          "severity": "blocker" | "suggestion" | "nit",
          "category": "correctness" | "security" | "performance" | "maintainability",
          "problem": str,           # 什么问题
          "why": str,               # 为什么是问题（会导致什么后果）
          "suggestion": str,        # 具体怎么改
          "uncertain": bool
        }
      ],
      "summary": str                # 一句话总结本次改动
    }

**② 如何控制误报**

**五层控制**：

**第一层：只查改动行**

    changed = extract_changed_lines(diff)
    issues = [i for i in raw_issues if i["line"] in changed]

**第二层：置信度过滤**

    # uncertain 的默认不展示（或折叠）
    issues = [i for i in issues if not i.get("uncertain")]

**第三层：severity 分级 + 门槛**

| 级别 | 展示方式 | 门槛 |
| --- | --- | --- |
| blocker | 醒目标红 + 阻止合并 | 误报率必须 < 5% |
| suggestion | 普通评论 | 误报率可接受 30% |
| nit | 折叠 | 误报无所谓 |

**第四层：反馈闭环**

    # PR 评论上加"👍 有用 / 👎 误报"按钮
    def on_feedback(issue_id, helpful):
        db.record(issue_id, helpful)
        if not helpful:
            # 加入"误报样本库"，用于优化提示
            add_to_false_positive_samples(issue_id)

每周分析误报样本，找出模式（如"模型总把 X 误判为 Y"），针对性改提示。

**第五层：限制评论数量**

    MAX_COMMENTS = 10      # 每个 PR 最多 10 条
    if len(issues) > MAX_COMMENTS:
        # 只保留最高优先级的
        issues = sorted(issues, key=severity_rank)[:MAX_COMMENTS]

**为什么**：一次报 50 个问题会让开发者直接忽略全部。

**③ 与 CI 集成**

**触发时机**：

    name: AI Code Review
    on:
      pull_request:
        types: [opened, synchronize]     # 创建 + 更新

    jobs:
      review:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
            with:
              fetch-depth: 0             # 需要完整历史算 diff

          - name: Get diff
            run: git diff origin/\${{ github.base_ref }}...HEAD > pr.diff

          - name: AI Review
            run: python scripts/ai_review.py pr.diff
            env:
              GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
              LLM_API_KEY: \${{ secrets.LLM_API_KEY }}

**评论方式**：

**a) 行内评论**（推荐）

    def post_inline_comment(pr, issue):
        pr.create_review_comment(
            body=format_comment(issue),
            commit_id=pr.head_sha,
            path=issue["file"],
            line=issue["line"],
        )

**b) 总览评论**

    ## 🤖 AI 代码审查

    **2 个必须修** · 3 个建议修 · 1 个可选

    ### 必须修
    1. \`app/services/order.py:42\` — SQL 注入：user_id 直接拼进 SQL
       → 改用参数化查询
    2. \`app/api/auth.py:88\` — 硬编码密钥

    ### 建议修
    ...

    <details><summary>可选（1）</summary>
    ...
    </details>

**去重**：

    # 同一问题不重复评论（PR 更新时）
    def already_commented(pr, file, line, problem_hash):
        existing = pr.get_review_comments()
        return any(
            c.path == file and c.line == line and
            hash(c.body) == problem_hash
            for c in existing
        )

**成本控制**：

    - 只审查代码文件（跳过 lock 文件、生成代码、文档）
    - diff 超过 1000 行时分块审查
    - 用便宜模型做初筛，只把可疑片段送强模型

**④ 如何衡量效果**

**四个层次指标**：

**a) 覆盖指标**

| 指标 | 目标 |
| --- | --- |
| 审查覆盖率 | 100% 的 PR 都被审查 |
| 平均审查延迟 | < 2 分钟 |

**b) 质量指标**

| 指标 | 目标 |
| --- | --- |
| **blocker 误报率** | **< 5%**（最关键） |
| blocker 漏报率 | 抽检估计（每周人工审查 20 个已合并 PR，看有没有漏的严重问题） |
| suggestion 采纳率 | > 30% |
| 平均问题数/PR | 1~5 个（太多说明误报多，太少说明没查出东西） |

**c) 业务指标**

| 指标 | 目标 |
| --- | --- |
| 线上 bug 数趋势 | 下降 |
| 因 bug 回滚的 PR 数 | 下降 |
| 人工审查时间 | 减少 30% |

**d) 开发者体验**

| 指标 | 收集方式 |
| --- | --- |
| 满意度 | 季度问卷 |
| 反馈按钮使用率 | 有反馈的 issue / 总 issue |
| "👎 误报" 比例 | < 20% |

**⑤ 半年迭代计划**

**第 1 月：基础设施 + 只生成摘要**

    - 搭建 CI 集成
    - 只生成 PR 摘要（不评论问题）
    - 收集开发者反馈："摘要有用吗？"
    - 目标：100% PR 有摘要，满意度 > 70%

**第 2 月：只报 blocker（Python）**

    - 只在 Python 项目启用
    - 只报 3 类：SQL 注入、硬编码密钥、空指针
    - 每条都人工复核（验证误报率）
    - 目标：误报率 < 10%，覆盖 20% 的 PR

**第 3 月：扩展 blocker + 加 TypeScript**

    - Python 增加 3 类 blocker（越权、异常未捕获、类型错误）
    - TypeScript 启用（any 使用、未处理 Promise）
    - 目标：误报率 < 5%

**第 4 月：加 suggestion**

    - 增加 suggestion 级别（性能、可维护性）
    - 加反馈按钮
    - 目标：suggestion 采纳率 > 30%

**第 5 月：优化 + 全项目覆盖**

    - 基于误报样本优化提示
    - 覆盖所有代码仓库
    - 加"摘要 + 风险提示"
    - 目标：blocker 误报 < 3%

**第 6 月：制度化**

    - 把规则写入 CONTRIBUTING.md
    - 建立"误报样本库"定期回顾
    - 评估是否要加 nit 级别
    - 目标：形成稳定流程，开发者主动使用

**⑥ 三个关键提醒**

**提醒 1：宁可漏报，不要误报**

第一年不要追求"发现所有问题"。先把误报压到极低，
建立信任。漏报的问题人工审查仍能发现，误报多了 AI 就被关掉了。

**提醒 2：让开发者能反馈**

"👎 误报"按钮是最重要的产品功能。
没有反馈，误报永远降不下来。

**提醒 3：AI 不替代人工审查**

AI 是"第一道筛子"，帮人工聚焦。
最终 approve 必须是人——这是责任问题，也是质量问题。`,
        rubric: [
          { point: '提示五要素：角色 + 项目约定 + 维度 + 严格约束 + 结构化输出', score: 3 },
          { point: '误报五层控制：只查改动行 + 置信度 + 分级门槛 + 反馈闭环 + 数量限制', score: 3 },
          { point: 'CI 集成：行内评论 + 总览 + 去重 + 成本控制', score: 2 },
          { point: '四层指标：覆盖/质量/业务/体验，blocker 误报 < 5%', score: 1 },
          { point: '半年计划先窄后宽 + 「宁可漏报不要误报」', score: 1 },
        ],
        keywords: ['宁可漏报', '误报率', '反馈按钮', '行内评论', '去重', '先窄后宽'],
        explanation:
          '能设计出「五层误报控制 + 反馈闭环 + 先窄后宽的上线路径」，并强调「宁可漏报不要误报」，就是理解了 AI 审查的产品逻辑。',
        tags: ['代码审查', '综合'],
      },
    ],
  },

  /* ============================================================
   *  c4：文档处理
   * ============================================================ */
  {
    id: 'ai-auto-m4-c4',
    title: '文档处理：分类、抽取、摘要',
    goal: '掌握文档自动化的完整流程，理解长文档的 map-reduce 策略与结构化抽取的可靠性保障。',
    lessons: [
      {
        id: 'ai-auto-m4-c4-l1',
        title: '三类任务与长文档 map-reduce',
        difficulty: 4,
        content: `
## 文档自动化的三类任务

| 任务 | 输入 | 输出 | 难度 |
| --- | --- | --- | --- |
| **分类** | 文档全文 | 类别标签 | 低 |
| **抽取** | 文档全文 | 结构化字段 | 中 |
| **摘要** | 文档全文 | 短文本 | 中高 |

**实际系统通常是组合**：

    合同 → [分类] 采购合同 → [抽取] 金额/期限/双方 → [摘要] 风险提示

## 分类：三个层次

**① 单标签分类**

    文档 → 一个类别

**适用**：类别互斥（如"发票/合同/报告"）。

**② 多标签分类**

    文档 → 多个类别

**适用**：一篇文档可能属于多类（如"技术报告 + 财务披露"）。

**③ 层级分类**

    文档 → 一级类别 → 二级类别

**适用**：类别有层次（如"财务 > 发票 > 增值税发票"）。

**层级分类的实现**：

    第一层：财务 / 法务 / 技术 / 人事
      ↓（只在该分支内继续）
    第二层：财务 → 发票 / 报表 / 报销单

**为什么分两层**：
- 一次性输出所有层级容易出错；
- 分层后每层的候选少，准确率高；
- 可解释（"我判断是财务类，然后判断是发票"）。

## 抽取：结构化输出

**抽取的核心是 schema 设计**：

    EXTRACT_SCHEMA = {
        "parties": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "role": {"enum": ["甲方", "乙方", "丙方"]},
                    "name": {"type": "string"},
                    "credit_code": {"type": "string", "description": "统一社会信用代码，18位"},
                },
                "required": ["role", "name"],
            },
        },
        "amount": {
            "type": "object",
            "properties": {
                "value": {"type": "number", "minimum": 0},
                "currency": {"enum": ["CNY", "USD", "EUR"]},
                "tax_included": {"type": "boolean"},
            },
            "required": ["value", "currency"],
        },
        "term_months": {"type": "integer", "minimum": 1, "maximum": 600},
        "sign_date": {"type": "string", "format": "date"},
    }

**四个设计要点**：

| 要点 | 说明 |
| --- | --- |
| **枚举代替自由文本** | \`role\` 用枚举，避免模型输出"甲方公司" |
| **带 description** | 告诉模型字段含义与格式 |
| **约束范围** | \`minimum\`/\`maximum\` 提前拦截明显错误 |
| **必填 vs 可选** | \`required\` 明确哪些必须有 |

**抽取结果的可靠性保障**（与 M3-c2 呼应）：

    {
      "field": "amount.value",
      "value": 1200000,
      "confidence": 0.95,
      "evidence": "合同总金额为人民币壹佰贰拾万元整",
      "page": 3,
      "bbox": [120, 450, 580, 480]
    }

**evidence 是关键**——没有它就无法验证抽取是否正确。

## 摘要：长文档的 map-reduce

**问题**：一份 100 页的合同，远超上下文窗口。

**解法：分块 + 汇总（map-reduce）**

<MapReduceSummary />

**三个步骤**：

**① Map：分块摘要**

    把文档切成 N 块（按章节/段落，不硬切）
    每块单独生成摘要

**关键**：**按语义边界切**，不要在句子中间切断。

**② Reduce：合并摘要**

    把 N 个块摘要合并成最终摘要

**问题**：如果 N 很多（如 50 块），合并时又超上下文了。

**解法**：**分层 reduce**

    Level 1: 50 个块摘要 → 10 个组摘要（每组 5 块）
    Level 2: 10 个组摘要 → 1 个总摘要

**③ 全局信息补全**

**map-reduce 的固有缺陷**：丢失全局结构。

比如"这份合同共有 5 个附件，其中第 3 个缺失"——
这个信息需要看整体，单个块看不出来。

**补全方法**：

| 方法 | 做法 |
| --- | --- |
| **目录注入** | 把文档的目录/大纲作为全局上下文 |
| **元信息提取** | 单独一次调用提取"文档结构信息"（章节数、附件数） |
| **交叉引用表** | 先建"提及关系表"，再生成摘要 |

## 引用溯源

**这是文档自动化与普通摘要的核心区别。**

**要求**：摘要中的每个结论都要能指回原文。

    {
      "summary": "本合同期限为 24 个月，总金额 120 万元，含 13% 增值税。",
      "claims": [
        {"text": "期限 24 个月", "source": "第二条 合同期限", "page": 1},
        {"text": "总金额 120 万元", "source": "第三条 合同金额", "page": 3},
        {"text": "含 13% 增值税", "source": "第三条 第 2 款", "page": 3},
      ]
    }

**为什么重要**：
- 用户能验证（"这个数字是哪来的"）；
- 能发现幻觉（引用的原文找不到）；
- 满足审计要求。

**实现要点**：

- 要求模型输出 \`evidence\`（原文片段）；
- 程序校验 evidence 是否真在原文中；
- 校验失败则标记为"待核实"。

## 质量校验

**四层校验**：

| 层 | 检查 |
| --- | --- |
| **格式** | JSON 可解析、字段齐全、类型正确 |
| **范围** | 数值在合理区间、日期不在未来 |
| **一致性** | 交叉校验（如金额大小写、日期加减） |
| **溯源** | evidence 必须能在原文找到 |

**校验失败的处理**：

    格式错 → 重试（可能偶发）
    范围错 → 转人工
    一致性错 → 必须人工（不能猜）
    溯源失败 → 转人工（可能是幻觉）

## 实践：文档处理流水线

    PDF/图片/Word
      ↓
    [解析] 转文本 + 版面信息
      ↓
    [分类] 判断文档类型
      ↓
    [抽取] 按类型用不同 schema
      ↓
    [校验] 四层校验
      ├─ 通过 → [摘要] + [溯源]
      └─ 失败 → 人工
      ↓
    [存储] 结构化结果 + 原文 + evidence

## 本节的来源

> **来源类型：学术来源**
> - CMU 11-766 *Large Language Model Applications*，第 6-8 讲
>   「Retrieval 1/2/3」（分块、检索、长文档处理）
>   https://cmu-llms.org/schedule/
> - CMU 11-766 第 9 讲「Deep research」（多来源综合）
> - UC Berkeley CS294/194-196，第 7 讲「AI Agents for Enterprise Workflows」
>
> **来源类型：工程实践（非学术）**
> - 文档 AI 产品的公开设计（如 Azure Document Intelligence 的 schema 设计）
>
> **来源类型：原创**
> - 三类任务框架、层级分类设计、map-reduce 分层策略、
>   引用溯源格式、四层校验、全部示例与习题
`,
        tips: [
          {
            kind: 'interview',
            text: '「长文档怎么处理」：map-reduce。先按语义边界分块摘要（map），再分层合并（reduce）。固有缺陷是丢失全局结构，需要用目录注入 + 元信息提取补全。',
          },
          {
            kind: 'leak',
            text: '文档自动化与普通摘要的核心区别是「引用溯源」——每个结论都要能指回原文（evidence + page）。这既能验证准确性，又能发现幻觉，还满足审计要求。',
          },
          {
            kind: 'pitfall',
            text: '分块必须按语义边界（章节/段落），不能在句子中间硬切。硬切会导致摘要不连贯、抽取漏字段。',
          },
        ],
        demos: [
          {
            title: '长文档 map-reduce 摘要',
            lang: 'python',
            code: `import re

# ── 模拟长文档（按章节组织）──
DOCUMENT = """
第一章 总则
本合同由甲方与乙方于 2026 年 1 月 1 日签订。合同期限为 24 个月。
第二章 金额
合同总金额为人民币 120 万元（含 13% 增值税）。
付款方式为分三期支付，每期 40 万元。
第三章 双方义务
甲方负责提供场地与设备。乙方负责技术实施与维护。
乙方需在每月 5 日前提交上月工作报告。
第四章 违约责任
任何一方违约需支付合同总额 10% 的违约金。
第五章 附件
本合同包含 3 个附件：技术方案、报价单、验收标准。
"""

def split_by_semantic(text, max_chars=150):
    """按章节标题切分（语义边界），而不是硬切。"""
    # 按"第X章"切
    parts = re.split(r"(?=第[一二三四五六七八九十]+章)", text.strip())
    chunks = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        # 如果单章太长，按句子切
        if len(p) > max_chars:
            sentences = re.split(r"(?<=[。！？])", p)
            buf = ""
            for s in sentences:
                if len(buf) + len(s) > max_chars and buf:
                    chunks.append(buf.strip())
                    buf = s
                else:
                    buf += s
            if buf.strip():
                chunks.append(buf.strip())
        else:
            chunks.append(p)
    return chunks

chunks = split_by_semantic(DOCUMENT)
print(f"=== 分块结果（{len(chunks)} 块）===")
for i, c in enumerate(chunks, 1):
    first = c.split("\\n")[0][:30]
    print(f"  块{i}: {len(c):3d} 字符 | {first}...")

print()

# ── Map：每块生成摘要 ──
def fake_summarize(chunk):
    """模拟 LLM 摘要：提取关键句。"""
    sents = [s for s in re.split(r"(?<=[。])", chunk) if len(s) > 8]
    # 取第一句 + 含数字的句子
    picked = sents[:1]
    picked += [s for s in sents[1:] if re.search(r"\\d", s)][:1]
    return "；".join(s.strip() for s in picked)[:80]

maps = [fake_summarize(c) for c in chunks]
print("=== Map 阶段（每块摘要）===")
for i, m in enumerate(maps, 1):
    print(f"  块{i}: {m}")

print()

# ── Reduce：分层合并 ──
def reduce_summaries(summaries, group_size=2):
    """分层合并：每 group_size 个合并成一个。"""
    level = summaries
    depth = 0
    while len(level) > 1:
        depth += 1
        new_level = []
        for i in range(0, len(level), group_size):
            group = level[i:i + group_size]
            merged = "；".join(group)[:120]
            new_level.append(merged)
        print(f"  Level {depth}: {len(level)} -> {len(new_level)}")
        level = new_level
    return level[0]

print("=== Reduce 阶段（分层合并）===")
final = reduce_summaries(maps)
print()
print(f"=== 最终摘要 ===\\n{final}")

print()
print("=== 全局信息补全 ===")
# map-reduce 丢失的全局信息，单独提取
meta = {
    "章节数": len(re.findall(r"第[一二三四五六七八九十]+章", DOCUMENT)),
    "附件数": 3,
    "签约日期": "2026-01-01",
    "总金额": 1200000,
}
print("  元信息（单独提取）:", meta)
print()
print("关键：")
print("  1) 按章节切分（语义边界），不硬切")
print("  2) 分层 reduce（避免合并时又超上下文）")
print("  3) 全局信息单独提取（map-reduce 会丢失整体结构）")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'ai-auto-m4-c4-e1',
        type: 'single',
        difficulty: 2,
        question: '处理超长文档的正确策略是？',
        options: [
          { value: 'A', text: '直接塞进上下文（窗口够大）' },
          { value: 'B', text: 'map-reduce：按语义边界分块摘要，再分层合并' },
          { value: 'C', text: '只读第一段' },
          { value: 'D', text: '随机抽样一部分' },
        ],
        answer: 'B',
        explanation:
          'A 会超限且中间信息易丢失。B 是标准做法：map（分块摘要）+ reduce（分层合并）。注意必须按语义边界切，且需单独补全全局信息。',
        tags: ['map-reduce'],
      },
      {
        id: 'ai-auto-m4-c4-e2',
        type: 'judge',
        difficulty: 2,
        question: '长文档分块时应该按固定字符数硬切，这样最均匀。',
        answer: false,
        explanation:
          '必须按语义边界（章节/段落/句子）切。硬切会在句子中间断开，导致摘要不连贯、抽取漏字段。均匀不是目标，语义完整才是。',
        tags: ['分块策略'],
      },
      {
        id: 'ai-auto-m4-c4-e3',
        type: 'multiple',
        difficulty: 3,
        question: '文档抽取结果的可靠性保障需要哪些信息？（多选）',
        options: [
          { value: 'A', text: 'confidence（置信度，支持分层路由）' },
          { value: 'B', text: 'evidence（原文引用，可回查验证）' },
          { value: 'C', text: 'page / bbox（位置信息，便于定位）' },
          { value: 'D', text: '模型的完整推理过程' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 会占大量 token 且难以校验。A/B/C 是三件套：confidence 支持分流、evidence 让结果可验证（发现幻觉）、位置信息便于人工复核。',
        tags: ['抽取可靠性'],
      },
      {
        id: 'ai-auto-m4-c4-e4',
        type: 'fill',
        difficulty: 3,
        question:
          'map-reduce 摘要的固有缺陷是丢失 ___ 结构（如"共有 5 个附件，第 3 个缺失"这类信息）。',
        blanks: [['全局', '整体', 'global']],
        explanation:
          '单块摘要看不到整体。补全方法：目录注入（把大纲作为全局上下文）、元信息单独提取（章节数、附件数）、交叉引用表。',
        tags: ['map-reduce 缺陷'],
      },
      {
        id: 'ai-auto-m4-c4-e5',
        type: 'code',
        difficulty: 2,
        question:
          '按语义边界分块：split_by_sentences(text, max_chars)。\n\n- 按句子（。！？结尾）切分，尽量填满每块但不超过 max_chars\n- 单句超过 max_chars 时单独成块\n- 返回块列表（去除空白块）',
        starterCode: `import re

def split_by_sentences(text, max_chars=100):
    sentences = re.split(r"(?<=[。！？])", text)
    chunks = []
    buf = ""
    for s in sentences:
        if not s.strip():
            continue
        if len(s) > max_chars:
            if buf.strip():
                chunks.append(buf.strip())
                buf = ""
            ___
            continue
        if len(buf) + len(s) > max_chars and buf:
            ___
            buf = s
        else:
            buf += s
    if buf.strip():
        chunks.append(buf.strip())
    return chunks
`,
        setupCode: '',
        expectedOutput: '分块结果',
        tests: `text = "第一句。第二句。第三句。第四句。"
out = split_by_sentences(text, 6)
assert len(out) >= 2, f"应分成多块，实际 {out}"
assert all(len(c) <= 6 for c in out), f"每块应 <= 6 字符，实际 {out}"
# 完整句子（不切断）
assert all(c.endswith("。") for c in out), f"每块应是完整句子，实际 {out}"

# 单句超长
long_text = "这是一个非常非常长的句子超过限制。短句。"
out2 = split_by_sentences(long_text, 10)
assert any(len(c) > 10 for c in out2), "超长句应单独成块"

# 空文本
assert split_by_sentences("", 10) == []
`,
        answer: `import re

def split_by_sentences(text, max_chars=100):
    sentences = re.split(r"(?<=[。！？])", text)
    chunks = []
    buf = ""
    for s in sentences:
        if not s.strip():
            continue
        if len(s) > max_chars:
            if buf.strip():
                chunks.append(buf.strip())
                buf = ""
            chunks.append(s.strip())
            continue
        if len(buf) + len(s) > max_chars and buf:
            chunks.append(buf.strip())
            buf = s
        else:
            buf += s
    if buf.strip():
        chunks.append(buf.strip())
    return chunks
`,
        explanation:
          '**关键在 `(?<=[。！？])` 这个后行断言**：在句号后切分，且句号保留在前一句末尾。\n\n**三个边界**：\n1. 单句超长 → 单独成块（不能切句，会破坏语义）；\n2. 累积超限 → 先输出当前块，再开新块；\n3. 末尾剩余 → 单独成块。\n\n**为什么按句子而不按字符**：硬切会把"合同总金额为 120 万"切成"合同总金额为 12"和"0 万"，语义完全破坏。',
        tags: ['编程', '语义分块'],
      },
      {
        id: 'ai-auto-m4-c4-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现分层 reduce：reduce_summaries(summaries, group_size=3)。\n\n- 每 group_size 个摘要合并成一个（用 "；" 连接）\n- 重复直到只剩 1 个\n- 返回 (最终摘要, 层数)',
        starterCode: `def reduce_summaries(summaries, group_size=3):
    if not summaries:
        return "", 0
    level = list(summaries)
    depth = 0
    while len(level) > 1:
        depth += 1
        new_level = []
        for i in range(0, len(level), group_size):
            group = level[i:i + group_size]
            ___
        level = new_level
    return level[0], depth
`,
        setupCode: '',
        expectedOutput: '分层合并',
        tests: `# 9 个 -> 3 个 -> 1 个（2 层）
out, depth = reduce_summaries(["a"]*9, 3)
assert depth == 2, f"应 2 层，实际 {depth}"
assert "a" in out

# 1 个 -> 0 层
out2, d2 = reduce_summaries(["x"], 3)
assert out2 == "x" and d2 == 0

# 空
assert reduce_summaries([], 3) == ("", 0)

# 5 个 group_size=2: 5->3->2->1 (3 层)
out3, d3 = reduce_summaries(["b"]*5, 2)
assert d3 == 3, f"应 3 层，实际 {d3}"
`,
        answer: `def reduce_summaries(summaries, group_size=3):
    if not summaries:
        return "", 0
    level = list(summaries)
    depth = 0
    while len(level) > 1:
        depth += 1
        new_level = []
        for i in range(0, len(level), group_size):
            group = level[i:i + group_size]
            new_level.append("；".join(group))
        level = new_level
    return level[0], depth
`,
        explanation:
          '**为什么要分层**：50 个块摘要一次性合并会超上下文。分层后每层都在可控范围内。\n\n**层数计算**：N 个元素、每组 k 个 → 层数 ≈ log_k(N)。\n- 9 个、组 3 → 2 层；\n- 5 个、组 2 → 3 层。\n\n**实践优化**：合并时不是简单拼接，而是让模型"提炼"——拼接会保留冗余，提炼能压缩信息。',
        tags: ['编程', '分层 reduce'],
      },
      {
        id: 'ai-auto-m4-c4-e7',
        type: 'code',
        difficulty: 3,
        question:
          '校验抽取结果的 evidence 是否在原文中：verify_evidence(extraction, source_text)。\n\n- extraction: dict，字段名 → {"value":..., "evidence":...}\n- 检查每个字段的 evidence 是否出现在 source_text 中\n- 返回未通过校验的字段名列表',
        starterCode: `def verify_evidence(extraction, source_text):
    failed = []
    for field, data in extraction.items():
        evidence = data.get("evidence")
        if not evidence:
            ___
            continue
        # 归一化：去空格便于匹配
        norm_src = "".join(source_text.split())
        norm_ev = "".join(evidence.split())
        if ___
            failed.append(field)
    return failed
`,
        setupCode: '',
        expectedOutput: 'evidence 校验',
        tests: `src = "合同总金额为人民币壹佰贰拾万元整。合同期限为 24 个月。"
ext = {
    "amount": {"value": 1200000, "evidence": "合同总金额为人民币壹佰贰拾万元整"},
    "term": {"value": 24, "evidence": "合同期限为 24 个月"},
    "fake": {"value": 999, "evidence": "合同附件共 5 个"},   # 原文没有
}
out = verify_evidence(ext, src)
assert out == ["fake"], f"应只检出 fake，实际 {out}"

# 缺 evidence
ext2 = {"x": {"value": 1}}
assert verify_evidence(ext2, src) == ["x"]

# 空格差异应能匹配
ext3 = {"y": {"value": 1, "evidence": "合同 期限为 24 个月"}}
assert verify_evidence(ext3, src) == [], "空格差异应视为匹配"
`,
        answer: `def verify_evidence(extraction, source_text):
    failed = []
    for field, data in extraction.items():
        evidence = data.get("evidence")
        if not evidence:
            failed.append(field)
            continue
        norm_src = "".join(source_text.split())
        norm_ev = "".join(evidence.split())
        if norm_ev not in norm_src:
            failed.append(field)
    return failed
`,
        explanation:
          '**这是发现幻觉的核心手段**：如果 evidence 在原文中找不到，说明模型编造了引用。\n\n**为什么要归一化空格**：PDF 提取的文本常有额外空格/换行，直接匹配会误判。\n\n**更严格的做法**：\n- 检查 value 是否也出现在 evidence 中（防止"引用对但值错"）；\n- 中文数字要转换后比对（"壹佰贰拾万" vs 1200000）。',
        tags: ['编程', 'evidence 校验'],
      },
      {
        id: 'ai-auto-m4-c4-e8',
        type: 'judge',
        difficulty: 3,
        question: '文档摘要中如果 evidence 校验失败，应该直接采用摘要结果，因为模型可能只是引用格式不标准。',
        answer: false,
        explanation:
          'evidence 找不到通常意味着幻觉（编造了原文）。应转人工，不能直接采用。这是文档自动化与普通摘要的核心区别——必须可溯源。',
        tags: ['溯源失败'],
      },
      {
        id: 'ai-auto-m4-c4-e9',
        type: 'single',
        difficulty: 3,
        question: '文档分类采用「层级分类」（先判断一级，再判断二级）的主要好处是？',
        options: [
          { value: 'A', text: '速度更快' },
          { value: 'B', text: '每层候选类别少，准确率更高，且可解释' },
          { value: 'C', text: '节省 token' },
          { value: 'D', text: '不需要训练数据' },
        ],
        answer: 'B',
        explanation:
          '一次性输出所有层级容易出错（候选太多）。分层后每层只在小范围内选，准确率更高，且能解释"我判断是财务类，然后判断是发票"。',
        tags: ['层级分类'],
      },
      {
        id: 'ai-auto-m4-c4-e10',
        type: 'open',
        difficulty: 5,
        question:
          '你要为一家律所搭建「合同智能审阅」系统：上传合同 PDF，输出风险清单（缺失条款、不利条款、金额异常）。合同类型包括采购、销售、租赁、劳动四类，每份 20~80 页。\n\n请设计：① 整体流程；② 长文档处理策略；③ 风险识别的具体方法；④ 如何保证不遗漏且不误报；⑤ 如何让律师信任这个系统。',
        referenceAnswer: `**① 整体流程**

    PDF 上传
      ↓
    [解析] OCR + 版面分析 → 文本 + 结构
      ↓
    [分类] 判断合同类型（采购/销售/租赁/劳动）
      ↓
    [结构化抽取] 按类型用不同 schema
      ↓
    [条款完整性检查] 对照该类型的"必备条款清单"
      ↓
    [条款内容审查] 逐条检查不利条款
      ↓
    [数值校验] 金额、期限、比例的一致性
      ↓
    [风险汇总] 按严重度排序 + 每条附原文
      ↓
    [律师复核] 确认/修改/忽略

**关键设计**：
- **分类必须准**（错了会导致用错清单）；
- **每条风险必须附原文引用**（律师要能核实）；
- **律师的反馈要回流**（哪些是误报、哪些漏了）。

**② 长文档处理策略**

**三层策略**：

**a) 先建"合同地图"**

    一次调用提取结构：
    {
      "sections": [
        {"title": "第一条 定义", "page": 1, "type": "definitions"},
        {"title": "第二条 标的", "page": 2, "type": "subject"},
        {"title": "第三条 价款", "page": 3, "type": "payment"},
        ...
      ],
      "attachments": [{"title": "技术方案", "page": 45}],
      "total_pages": 68
    }

**为什么先建地图**：
- 后续可以"按需读章节"（只读与风险相关的章节）；
- 能检查"必备条款是否缺失"（看地图就知道有没有"违约责任"章节）。

**b) 按章节定向抽取**

    不要全文塞进一次调用。按需：

    def extract_relevant_sections(map_, contract_type):
        required = REQUIRED_SECTIONS[contract_type]
        return [s for s in map_["sections"] if s["type"] in required]

**c) map-reduce 兜底**

对于"整体性风险"（如"金额与附件报价单不一致"），
需要跨章节比对 → 用 map-reduce 提取各章节的关键数据，再统一校验。

**③ 风险识别的具体方法**

**四类检查**：

**a) 完整性检查（规则驱动，最可靠）**

    REQUIRED_SECTIONS = {
        "采购": ["标的", "价款", "交付", "质量", "违约责任", "争议解决"],
        "销售": ["标的", "价款", "交付", "质量", "违约责任", "争议解决"],
        "租赁": ["标的", "租期", "租金", "押金", "维修", "违约责任", "争议解决"],
        "劳动": ["岗位", "薪酬", "工时", "社保", "解除", "违约责任"],
    }

    def check_completeness(map_, ctype):
        present = {s["type"] for s in map_["sections"]}
        missing = [s for s in REQUIRED_SECTIONS[ctype] if s not in present]
        return [
            {"severity": "blocker", "problem": f"缺少必备条款：{s}",
             "evidence": f"全文未找到「{s}」相关章节"}
            for s in missing
        ]

**这是最可靠的检查——纯规则，零误报。**

**b) 不利条款识别（模型 + 规则）**

**规则部分**（高置信度）：

    不利模式 = [
        (r"甲方.{0,20}有权.{0,20}单方.{0,20}(变更|解除)", "单方变更/解除权"),
        (r"(乙方|供方).{0,20}承担.{0,20}全部.{0,20}责任", "责任全部由一方承担"),
        (r"违约金.{0,10}(合同总额|总价款).{0,10}(3[0-9]|[4-9]\\d)%", "违约金过高（>30%）"),
        (r"不得.{0,10}(以任何理由|以任何形式).{0,10}(索赔|追责)", "剥夺索赔权"),
        (r"管辖.{0,10}(对方|甲方|乙方)所在地", "管辖地不利"),
    ]

**模型部分**（补充规则覆盖不到的）：

    提示：
    逐条阅读下面的合同条款。找出对【我方（乙方）】不利的表述。
    对每条：
    - 引用原文（必须逐字复制）
    - 说明为什么不利
    - 建议如何修改
    如果条款是公平的或对我方有利，不要报告。

**c) 数值一致性校验（代码）**

    def check_numbers(extraction):
        issues = []
        # 金额：大小写
        if abs(cn_to_number(ext["amount_upper"]) - ext["amount_lower"]) > 0.01:
            issues.append("大小写金额不一致")
        # 金额：明细求和
        if abs(sum(ext["items"]) - ext["amount_lower"]) > 0.01:
            issues.append("明细之和与总额不符")
        # 期限：起止日期
        if ext["start"] + months(ext["term_months"]) != ext["end"]:
            issues.append("期限与起止日期不符")
        # 比例：违约金比例合理性
        if ext["penalty_rate"] > 0.3:
            issues.append(f"违约金比例过高：{ext['penalty_rate']:.0%}")
        return issues

**d) 缺失附件的检查**

    # 正文提到"详见附件X"，但附件清单里没有
    mentions = re.findall(r"附件[一二三四五六七八九十\\d]+", full_text)
    listed = {a["title"] for a in map_["attachments"]}
    for m in set(mentions):
        if m not in listed and m not in str(map_["attachments"]):
            issues.append({"severity": "suggestion",
                           "problem": f"正文提到{m}，但附件清单中未找到"})

**④ 如何保证不遗漏且不误报**

**这是一个权衡**：召回率高必然误报多，反之亦然。

**分级别设定目标**：

| 风险类型 | 召回率目标 | 误报率目标 | 策略 |
| --- | --- | --- | --- |
| **必备条款缺失** | 100% | < 1% | 纯规则，不遗漏 |
| **数值不一致** | 100% | < 1% | 纯代码校验 |
| **明显不利条款** | > 90% | < 15% | 规则 + 模型 |
| **隐含风险** | > 70% | < 30% | 模型为主，标记 uncertain |

**不遗漏的保障**：

**a) 规则兜底**

必备条款检查、数值校验用规则，不依赖模型——这些零遗漏。

**b) 分章节全覆盖**

按合同地图逐章节检查，确保每章都被"看过"（不是抽样）。

**c) 清单驱动**

风险清单由律所合伙人审定，不是工程师拍脑袋。
每次发现新风险类型，加入清单。

**不误报的保障**：

**a) 每条必须附原文**

    没有原文引用的风险点直接丢弃（模型可能臆想）。

**b) 分级展示**

- blocker：确定的问题（条款缺失、数值错）
- suggestion：可能的问题（不利条款）
- uncertain：模型不确定的（折叠）

**c) 律师反馈闭环**

    每个风险点旁边："✓ 有用 / ✗ 误报 / ⚠️ 漏了类似的"
    → 每周分析误报样本 → 优化规则与提示

**d) 定期评估**

每月用 20 份"金标准合同"（合伙人标注过的）测试：
- 召回率：标出的风险发现了多少
- 误报率：报的风险里有多少是误报

**⑤ 如何让律师信任这个系统**

**这是最难的部分——比技术难。**

**五个步骤**：

**第 1 步：只做"辅助检查"，不做"结论"**

不要输出"这份合同有 3 个风险"。
输出"我发现了这些可能需要注意的地方，请你判断"。

**措辞很重要**：
- ❌ "本合同缺少违约责任条款，存在重大风险"
- ✅ "未找到「违约责任」相关章节，请确认是否在附件中"

**第 2 步：每条都能点回原文**

律师点风险点 → 自动跳转到 PDF 对应位置并高亮。

**这是建立信任的关键**——律师能立刻验证，而不是"相信 AI"。

**第 3 步：从"零误报"的检查开始**

先只上"必备条款缺失"和"数值不一致"（纯规则，几乎零误报）。
律师用一个月发现"确实有用且没错"后，再上模型部分。

**第 4 步：让律师参与规则制定**

把"风险清单"的维护权交给律所：
- 他们定义什么算风险；
- 他们调整严重度；
- 他们补充案例。

**这样系统就成了"律所经验的载体"，而不是"外部工具"。**

**第 5 步：量化价值**

每月报告：

| 指标 | 数值 |
| --- | --- |
| 审阅合同数 | 320 |
| 平均审阅时间 | 从 45 分钟降到 18 分钟 |
| AI 发现且律师确认的风险 | 287 条 |
| 律师遗漏但 AI 发现的 | 12 条（重点展示！） |
| AI 误报 | 31 条（误报率 9.7%） |

**"律师遗漏但 AI 发现的"是最有说服力的数据。**

**⑥ 一个必须诚实面对的问题**

**AI 漏掉一个重大风险，导致律所被客户起诉，谁负责？**

**必须明确**：
- AI 是辅助工具，**最终审阅责任在律师**；
- 系统输出必须标注"AI 辅助检查，需律师确认"；
- 保留完整记录（AI 检查了什么、律师确认了什么）。

**不要承诺"AI 能发现所有风险"**——这是不可能也不负责任的承诺。

**正确表述**："AI 帮你把 80% 的常规检查自动化，让你把精力放在真正需要判断的地方。"`,
        rubric: [
          { point: '整体流程 + 先建「合同地图」再按需读章节', score: 2 },
          { point: '长文档三层策略：地图 → 定向抽取 → map-reduce 兜底', score: 3 },
          { point: '四类检查：完整性（规则）/不利条款（规则+模型）/数值（代码）/附件', score: 3 },
          { point: '分级目标：必备条款 100% 召回 + 隐含风险标记 uncertain', score: 1 },
          { point: '信任建立五步：措辞、点回原文、从零误报开始、律师参与、量化价值', score: 1 },
        ],
        keywords: ['合同地图', '必备条款清单', '点回原文', '零误报起步', '律师遗漏', '辅助工具'],
        explanation:
          '能指出「先上纯规则检查建立信任」以及「措辞要用『请确认』而非『存在重大风险』」，就是理解了 AI 在高专业场景的定位。',
        tags: ['文档审阅', '综合'],
      },
    ],
  },
];
