import type { Exercise } from '../../types';

/* ============================================================
 *  c14 习题：难度 2 / 3 / 3 → 8 / 10 / 10，共 28 题
 *
 *  设计原则：
 *  - 全部 code 题不 import torch / 不 import sympy，走 Pyodide 秒级完成；
 *  - 判分用例与正文 9 条实测表严格一致。
 * ============================================================ */

export const llmA1C14Exercises: Exercise[] = [
  /* ─────────────── l1：MATH-500（难度 2，8 题）─────────────── */
  {
    id: 'llm-a1-c14-e1',
    relatedLessonId: 'llm-a1-c14-l1',
    type: 'single',
    difficulty: 1,
    question: 'MATH-500 中用来做标准答案的字段是哪个？',
    options: [
      { value: 'A', text: '`problem`' },
      { value: 'B', text: '`solution`' },
      { value: 'C', text: '`answer`' },
      { value: 'D', text: '`level`' },
    ],
    answer: 'C',
    explanation:
      '`answer` 字段已经是抽好的纯答案（如 `"83"`），直接用即可。`solution` 是给人看的完整推导，里面那个 `\\boxed{83}` 不需要你去解析——去解析它只会引入不必要的 bug。',
    tags: ['MATH-500', '数据集'],
  },
  {
    id: 'llm-a1-c14-e2',
    relatedLessonId: 'llm-a1-c14-l1',
    type: 'single',
    difficulty: 2,
    question: '为什么推理模型的第一个基准通常是数学而不是写作？',
    options: [
      { value: 'A', text: '数学题更容易生成' },
      { value: 'B', text: '数学答案可机器验证，判分不需要人也不需要另一个模型' },
      { value: 'C', text: '数学题的答案更短' },
      { value: 'D', text: '写作任务没有标准答案，所以无法评估' },
    ],
    answer: 'B',
    explanation:
      '数学答案是一个可比较的对象（`42` vs `42`），判分可以完全自动化，500 题几十分钟跑完。写作需要 LLM-as-judge 或人工标注——前者不可复现，后者无法大规模。D 说「无法评估」太绝对，只是成本高。',
    tags: ['可验证性', '基准设计'],
  },
  {
    id: 'llm-a1-c14-e3',
    relatedLessonId: 'llm-a1-c14-l1',
    type: 'judge',
    difficulty: 2,
    question: 'pass@k 越高，说明模型自己「会做」这道题的能力越强。',
    answer: false,
    explanation:
      '不一定。pass@k 衡量「采样 k 次能否撞到」，会随 k 单调上升，掩盖「模型自己会不会」。一个 pass@1 = 20% 但 pass@8 = 80% 的模型可能只是「有时能蒙对」。产品场景必须看 pass@1——你不能给用户每题采 8 次。',
    tags: ['pass@k', '误区'],
  },
  {
    id: 'llm-a1-c14-e4',
    relatedLessonId: 'llm-a1-c14-l1',
    type: 'judge',
    difficulty: 2,
    question: '本站用 20 道模拟题（每题采 8 次）实测：pass@1 = 60.00%，pass@8 = 80.00%。这个上升说明多采样总能提升「至少答对一次」的概率。',
    answer: true,
    explanation:
      '对。pass@k 随 k 单调上升是数学必然——k 越大，「至少撞到一次正确答案」的概率越高。本站实测 pass@1 60.00% → pass@2 65.71% → pass@4 72.86% → pass@8 80.00%。但这不代表模型变强了，只代表你多试了几次。',
    tags: ['pass@k', '实测'],
  },
  {
    id: 'llm-a1-c14-e5',
    relatedLessonId: 'llm-a1-c14-l1',
    type: 'fill',
    difficulty: 2,
    question:
      'MATH-500 一条记录的五个字段是：题干 ____、完整推导 ____、纯答案 ____、学科 ____、难度 ____。',
    blanks: [['problem'], ['solution'], ['answer'], ['subject'], ['level']],
    explanation:
      '其中 `answer` 是判分用的（已抽好），`subject` 与 `level` 用于分层统计（按学科、按难度分别看准确率，避免整体数字掩盖薄弱项）。',
    tags: ['MATH-500', '数据集'],
  },
  {
    id: 'llm-a1-c14-e6',
    relatedLessonId: 'llm-a1-c14-l1',
    type: 'multiple',
    difficulty: 2,
    question: '下面哪些任务属于「答案可机器验证」？（多选）',
    options: [
      { value: 'A', text: '数学计算题' },
      { value: 'B', text: '写一篇议论文' },
      { value: 'C', text: '写一个函数（有单元测试）' },
      { value: 'D', text: '判断一段文本的情感倾向（有标注标签）' },
    ],
    answer: ['A', 'C', 'D'],
    explanation:
      'B 需要人或其他模型判断「文笔好不好」，不可机器验证。A 用数值判等、C 用测试用例、D 用标注标签比对——这三类都可以完全自动化。**判分可自动化是基准能被反复跑起来的前提。**',
    tags: ['可验证性'],
  },
  {
    id: 'llm-a1-c14-e7',
    relatedLessonId: 'llm-a1-c14-l1',
    type: 'code',
    difficulty: 3,
    question:
      '实现 `pass_at_k(n, c, k)`：pass@k 的**无偏估计**。\n\n从 `n` 个采样里随机抽 `k` 个，至少含 1 个正确答案的概率：\n\n`1 - C(n-c, k) / C(n, k)`；当 `n - c < k` 时直接返回 `1.0`。\n\n其中 `c` 是答对的次数。返回 float。',
    starterCode: `def pass_at_k(n, c, k):
    pass


print(round(pass_at_k(8, 8, 1), 4))
print(round(pass_at_k(8, 0, 1), 4))
print(round(pass_at_k(8, 4, 2), 4))`,
    expectedOutput: '1.0 / 0.0 / 0.7143',
    tests: `assert abs(pass_at_k(8, 8, 1) - 1.0) < 1e-9, "全对时 pass@1 应为 1"
assert abs(pass_at_k(8, 0, 1) - 0.0) < 1e-9, "全错时 pass@1 应为 0"
assert abs(pass_at_k(8, 4, 2) - (1 - 6/28)) < 1e-9, f"8采4对k=2 应为 {1-6/28}，实际 {pass_at_k(8,4,2)}"
# 单调性：k 增大，pass@k 不减
vals = [pass_at_k(8, 3, k) for k in range(1, 9)]
for a, b in zip(vals, vals[1:]):
    assert b >= a - 1e-12, f"pass@k 应单调不减：{vals}"
# 边界：k=1 时 pass@1 = c/n
assert abs(pass_at_k(8, 3, 1) - 3/8) < 1e-9, "k=1 时应等于 c/n"
# n-c < k 时应返回 1.0（抽 k 个必然含正确答案）
assert abs(pass_at_k(8, 7, 2) - 1.0) < 1e-9, "n-c<k 应返回 1.0"
# k=n 时取全部样本：只要有一个对就是 1
assert abs(pass_at_k(8, 8, 8) - 1.0) < 1e-9
assert abs(pass_at_k(8, 7, 8) - 1.0) < 1e-9, "k=n 且 c>=1 时应为 1.0"
assert abs(pass_at_k(8, 0, 8) - 0.0) < 1e-9, "k=n 且全错时应为 0.0"
`,
    answer: `def pass_at_k(n, c, k):
    from math import comb
    if n - c < k:
        return 1.0
    return 1.0 - comb(n - c, k) / comb(n, k)


print(round(pass_at_k(8, 8, 1), 4))
print(round(pass_at_k(8, 0, 1), 4))
print(round(pass_at_k(8, 4, 2), 4))`,
    explanation:
      '```python\nif n - c < k:\n    return 1.0\nreturn 1.0 - comb(n - c, k) / comb(n, k)\n```\n\n`comb(n-c, k) / comb(n, k)` 是「随机抽 k 个、全都抽到错答案」的概率，1 减去它就是「至少抽到一个对答案」。\n\n**注意 `n - c < k` 的边界**：如果错误答案的数量少于 k，那么抽 k 个必然含正确答案，概率为 1。不写这个判断，`comb` 会返回 0，结果仍然对——但显式写出来更清楚，也避免某些实现对负数的异常处理。',
    tags: ['编程', 'pass@k'],
  },
  {
    id: 'llm-a1-c14-e8',
    relatedLessonId: 'llm-a1-c14-l1',
    type: 'open',
    difficulty: 3,
    question:
      '你要评估一个推理模型在 MATH-500 上的表现。请说明：为什么必须用 pass@1 而不是 pass@k、为什么不能只报一个总准确率、以及为什么必须警惕数据污染。',
    referenceAnswer: `**一、为什么用 pass@1**

pass@k 衡量的是「采样 k 次能撞到吗」，会随 k 单调上升：

| 指标 | 本站实测（20 题 × 8 采样） |
|---|---|
| pass@1 | 60.00% |
| pass@2 | 65.71% |
| pass@4 | 72.86% |
| pass@8 | 80.00% |

上升是数学必然——多试几次总能撞对。但它掩盖了「模型自己会不会」：
一个 pass@1 = 20% / pass@8 = 80% 的模型可能只是「有时能蒙对」。

推理模型的卖点恰恰是 **pass@1 上升**：它的思考是确定性的（T=0 也能对），
不靠多采样撞。如果用 pass@k 报告，就分不清「模型变强了」还是「你多试了几次」。

**产品视角**：你不能给用户每题采 8 次再投票——延迟和成本都不允许。
所以产品真正关心的是 pass@1。

**二、为什么不能只报总准确率**

总准确率会把结构性弱点平均掉。必须按 \`subject\` 和 \`level\` 分层：

- 按 \`level\`（1-5）：如果 level 1-2 接近 100% 但 level 4-5 只有 20%，
  说明模型擅长套路题、不擅长真推理——这个信息在总分里看不见。
- 按 \`subject\`：如果 Algebra 80% 但 Geometry 30%，
  说明训练数据分布有问题，而不是「模型整体不错」。

**分层报告的另一个作用**：它能暴露「总分虚高」。
比如总 75% 里，可能 60% 的分数来自 level 1-2（占题目多数）。

**三、为什么必须警惕数据污染**

MATH-500 来自 MATH 数据集，而 MATH 发布于 2021 年——
几乎所有 2022 年后的模型都可能在预训练中见过它。

如果模型见过题目，准确率就是**背出来的**，不是推出来的。
这时：
- 准确率会异常高（尤其 level 4-5，因为难题更容易被记住）；
- 换一个发布时间晚于模型训练截止的基准，准确率会大幅下降。

**验证方法**：
1. 用「训练截止之后发布」的题目做对照（如更新的竞赛题）；
2. 检查模型能否复述题目的原文（如果能，说明见过）；
3. 扰动题目（改数字、改问法）后重测，看准确率是否断崖式下跌。

**补充：还应该报告什么**

- 平均生成 token 数（成本）
- 平均耗时
- 输出被截断的比例（预算不足会系统性压低准确率，见 c13-l3）`,
    rubric: [
      { point: '说明 pass@k 随 k 单调上升、会掩盖「自己会不会」', score: 2 },
      { point: '指出推理模型的卖点是 pass@1（思考确定性，不靠采样）', score: 2 },
      { point: '给出实测数字（60.00% → 80.00%）作为证据', score: 1 },
      { point: '说明必须按 subject / level 分层，避免总分平均掉弱点', score: 2 },
      { point: '说明数据污染的风险与至少一种验证方法', score: 2 },
    ],
    keywords: ['pass@1', 'pass@k', '单调上升', '分层', 'level', 'subject', '数据污染', '训练截止'],
    explanation:
      '这题考的是「评估的方法论」。三个点分别对应：指标选择（pass@1 vs k）、报告粒度（分层 vs 总分）、数据可信度（污染）。能做到这三点，你报出的数字才值得别人相信。',
    tags: ['评估方法论', '综合'],
  },

  /* ─────────────── l2：boxed 解析（难度 3，10 题）─────────────── */
  {
    id: 'llm-a1-c14-e9',
    relatedLessonId: 'llm-a1-c14-l2',
    type: 'single',
    difficulty: 2,
    question: '用正则 `\\\\boxed\\{(.*?)\\}` 抽取 `\\boxed{\\frac{1}{2}}` 会得到什么？',
    options: [
      { value: 'A', text: '`\\frac{1}{2}`' },
      { value: 'B', text: '`\\frac{1`' },
      { value: 'C', text: '`1/2`' },
      { value: 'D', text: '报错' },
    ],
    answer: 'B',
    explanation:
      '惰性匹配 `(.*?)` 会在第一个 `}` 处停下，于是拿到 `\\frac{1`——丢了后半截。而且**不会报错**，只是悄悄判错。这就是为什么必须手写深度计数。',
    tags: ['boxed 解析', '正则陷阱'],
  },
  {
    id: 'llm-a1-c14-e10',
    relatedLessonId: 'llm-a1-c14-l2',
    type: 'single',
    difficulty: 3,
    question: '抽取 `\\boxed{}` 时为什么要取**最后一个**匹配而不是第一个？',
    options: [
      { value: 'A', text: '因为正则只能从后往前匹配' },
      { value: 'B', text: '因为模型经常先写中间答案再自我纠正，最后一个是它最终认定的' },
      { value: 'C', text: '因为第一个匹配总是空的' },
      { value: 'D', text: '因为标准答案一定在文本末尾' },
    ],
    answer: 'B',
    explanation:
      '本站实测模型确实会输出 `so \\boxed{12} then, after checking, \\boxed{83}` 这种模式——先写草稿再纠正。取第一个会把中间草稿当答案，导致系统性低估。Raschka 原书的 `extract_final_candidate` 也是取最后一个。',
    tags: ['boxed 解析', '取最后一个'],
  },
  {
    id: 'llm-a1-c14-e11',
    relatedLessonId: 'llm-a1-c14-l2',
    type: 'judge',
    difficulty: 2,
    question: '正则表达式理论上可以正确匹配任意深度的嵌套花括号。',
    answer: false,
    explanation:
      '错。嵌套括号的语言不是正则语言——它需要至少一个栈（上下文无关文法）。实践中可以用正则处理有限层嵌套，但既难读又脆弱。**手写深度计数才是正解。**',
    tags: ['正则', '理论'],
  },
  {
    id: 'llm-a1-c14-e12',
    relatedLessonId: 'llm-a1-c14-l2',
    type: 'judge',
    difficulty: 3,
    question: '深度计数实现中，`depth` 应该从 0 开始，因为 `\\boxed{` 里的 `{` 还没被扫描到。',
    answer: false,
    explanation:
      '错，应该从 1 开始。因为 `text.find("\\\\boxed{")` 定位到的是 `\` 的位置，`j + 7` 已经跳过了 `\\boxed{` 这 7 个字符（含那个 `{`），所以进入内层循环时已经消耗了一个左括号，`depth` 初始为 1。',
    tags: ['boxed 解析', '实现细节'],
  },
  {
    id: 'llm-a1-c14-e13',
    relatedLessonId: 'llm-a1-c14-l2',
    type: 'fill',
    difficulty: 3,
    question:
      'LaTeX 归一化的五条必做规则：去掉 `________` / `________`（只影响渲染尺寸）、去掉细间距（`\\,` `\\!` `\\;` `\\:`）、`\\cdot` 替换为 ____、`\\dfrac`/`\\tfrac` 统一为 `\\frac`、去掉 ____（角度符号）。',
    blanks: [['\\left', 'left'], ['\\right', 'right'], ['*'], ['°', '度']],
    explanation:
      '不做归一化，模型答 `\\dfrac{3}{4}`、标准答案写 `\\frac{3}{4}` 就会被判错——而它们是同一个数。**这会系统性低估 MATH-500 的准确率，而你不会发现**，因为错的那些看起来「模型确实答错了」。',
    tags: ['归一化'],
  },
  {
    id: 'llm-a1-c14-e14',
    relatedLessonId: 'llm-a1-c14-l2',
    type: 'multiple',
    difficulty: 3,
    question: '关于 `\\boxed{}` 抽取，下面哪些说法正确？（多选）',
    options: [
      { value: 'A', text: '必须用深度计数处理嵌套花括号' },
      { value: 'B', text: '应该取最后一个匹配，因为模型会自我纠正' },
      { value: 'C', text: '抽取后还需要做 LaTeX 归一化' },
      { value: 'D', text: '用 `re.findall(r"\\\\boxed\\{(.*?)\\}", text)[-1]` 已经足够' },
    ],
    answer: ['A', 'B', 'C'],
    explanation:
      'D 错——这正是本节的要打掉的误区。它在 `\\boxed{\\frac{1}{2}}` 上返回 `\\frac{1`，不报错但判错。MATH-500 里分数答案很多，这个 bug 会让准确率系统性偏低。',
    tags: ['boxed 解析', '综合'],
  },
  {
    id: 'llm-a1-c14-e15',
    relatedLessonId: 'llm-a1-c14-l2',
    type: 'code',
    difficulty: 3,
    question:
      '实现 `extract_boxed(text)`：抽取**最后一个** `\\boxed{...}`，用深度计数支持任意层嵌套。找不到返回 `None`。\n\n要求：\n- 不裁剪内部内容（`\\boxed{ 42 }` 应返回 `" 42 "` 或含空格的等价形式，由你的实现决定，但 `\\boxed{\\frac{1}{2}}` 必须完整）\n- 支持三层嵌套。',
    starterCode: `def extract_boxed(text):
    pass


print(extract_boxed(r"\\boxed{83}"))
print(extract_boxed(r"\\boxed{\\frac{1}{2}}"))`,
    expectedOutput: '83 然后 \\frac{1}{2}',
    tests: `assert extract_boxed(r"\\boxed{83}") == "83"
nested = extract_boxed(r"\\boxed{\\frac{1}{2}}")
assert nested == r"\\frac{1}{2}", "嵌套失败，实际：" + repr(nested)
assert extract_boxed(r"so \\boxed{12} then \\boxed{83}") == "83", "应取最后一个"
assert extract_boxed("no box here") is None, "无匹配应返回 None"
assert extract_boxed(r"\\boxed{2+3}") == "2+3"
# 三层嵌套
deep = extract_boxed(r"\\boxed{\\frac{\\frac{1}{2}}{3}}")
assert deep == r"\\frac{\\frac{1}{2}}{3}", "三层嵌套失败，实际：" + repr(deep)
# 正则方案会失败的那一种
assert extract_boxed(r"\\boxed{\\dfrac{3}{4}}") == r"\\dfrac{3}{4}"
# 多个匹配 + 嵌套组合
mixed = extract_boxed(r"a \\boxed{\\frac{1}{2}} b \\boxed{7}")
assert mixed == "7", "混合场景应取最后一个，实际：" + repr(mixed)
`,
    answer: `def extract_boxed(text):
    out, i = None, 0
    while True:
        j = text.find("\\\\boxed{", i)
        if j < 0:
            return out
        k, depth, buf = j + 7, 1, []
        while k < len(text) and depth > 0:
            ch = text[k]
            if ch == "{":
                depth += 1
                buf.append(ch)
            elif ch == "}":
                depth -= 1
                if depth > 0:
                    buf.append(ch)
            else:
                buf.append(ch)
            k += 1
        out = "".join(buf)
        i = k


print(extract_boxed(r"\\boxed{83}"))
print(extract_boxed(r"\\boxed{\\frac{1}{2}}"))`,
    explanation:
      '```python\nwhile True:\n    j = text.find("\\\\boxed{", i)\n    if j < 0: return out\n    k, depth, buf = j + 7, 1, []\n    while k < len(text) and depth > 0:\n        ch = text[k]\n        if ch == "{": depth += 1; buf.append(ch)\n        elif ch == "}":\n            depth -= 1\n            if depth > 0: buf.append(ch)\n        else: buf.append(ch)\n        k += 1\n    out = "".join(buf); i = k\n```\n\n**三个要点**：① `depth` 从 1 开始（`j + 7` 已吃掉 `\\boxed{`）；② 只有 `depth > 0` 时才保留 `}`；③ 外层循环取最后一个。',
    tags: ['编程', 'boxed 解析'],
  },
  {
    id: 'llm-a1-c14-e16',
    relatedLessonId: 'llm-a1-c14-l2',
    type: 'code',
    difficulty: 3,
    question:
      '实现 `normalize_latex(s)`：按五条规则清洗 LaTeX 字符串。\n\n规则（按顺序）：\n1. 去掉 `\\left` 与 `\\right`（可能后面跟空格）\n2. 去掉细间距 `\\,` `\\!` `\\;` `\\:`\n3. `\\cdot` → `*`\n4. `\\dfrac` 和 `\\tfrac` → `\\frac`\n5. 去掉 `°`\n\n最后 `strip()` 并去掉首尾的 `$`。`None` 输入返回 `None`。',
    starterCode: `import re

def normalize_latex(s):
    pass


print(normalize_latex(r"\\dfrac{3}{4}"))
print(normalize_latex(r"3\\cdot 4"))
print(normalize_latex("90°"))`,
    expectedOutput: '\\frac{3}{4} / 3*4 / 90',
    tests: `assert normalize_latex(r"\\dfrac{3}{4}") == r"\\frac{3}{4}"
assert normalize_latex(r"\\tfrac{1}{2}") == r"\\frac{1}{2}"
assert normalize_latex(r"\\left(\\frac{1}{2}\\right)") == r"(\\frac{1}{2})", "left/right 未去掉：" + repr(normalize_latex(r"\\left(\\frac{1}{2}\\right)"))
assert normalize_latex(r"3\\cdot 4").replace(" ", "") == "3*4", "cdot 未替换：" + repr(normalize_latex(r"3\\cdot 4"))
assert normalize_latex("90°") == "90"
assert normalize_latex("  $42$  ") == "42", "应 strip 并去 $"
assert normalize_latex(None) is None
# 细间距
assert normalize_latex(r"3\\,4") == "34", "细间距未去掉：" + repr(normalize_latex(r"3\\,4"))
# 不改变 \\frac 本身
assert normalize_latex(r"\\frac{1}{2}") == r"\\frac{1}{2}"
`,
    answer: `import re

LATEX_FIXES = [
    (r"\\\\left\\s*", ""),
    (r"\\\\right\\s*", ""),
    (r"\\\\,|\\\\!|\\\\;|\\\\:", ""),
    (r"\\\\cdot", "*"),
    (r"\\\\dfrac", r"\\\\frac"),
    (r"\\\\tfrac", r"\\\\frac"),
    ("°", ""),
]

def normalize_latex(s):
    if s is None:
        return None
    for pat, rep in LATEX_FIXES:
        s = re.sub(pat, rep, s)
    return s.strip().strip("$").strip()


print(normalize_latex(r"\\dfrac{3}{4}"))
print(normalize_latex(r"3\\cdot 4"))
print(normalize_latex("90°"))`,
    explanation:
      '```python\nLATEX_FIXES = [\n    (r"\\\\left\\s*", ""),\n    (r"\\\\right\\s*", ""),\n    (r"\\\\,|\\\\!|\\\\;|\\\\:", ""),\n    (r"\\\\cdot", "*"),\n    (r"\\\\dfrac", r"\\\\frac"),\n    (r"\\\\tfrac", r"\\\\frac"),\n    ("°", ""),\n]\n```\n\n**顺序有讲究**：先把 `\\dfrac` 改成 `\\frac`，后面处理分数的正则才能统一匹配。`\\left\\s*` 里的 `\\s*` 是为了处理 `\\left (` 这种带空格的写法。',
    tags: ['编程', '归一化'],
  },
  {
    id: 'llm-a1-c14-e17',
    relatedLessonId: 'llm-a1-c14-l2',
    type: 'open',
    difficulty: 4,
    question:
      '请详细说明：为什么用正则 `\\\\boxed\\{(.*?)\\}` 抽取最终答案是错误的？请给出具体的失败例子、解释理论原因，并写出正确实现的关键逻辑。',
    referenceAnswer: `**一、具体失败例子**

| 模型输出 | 正则结果 | 正确结果 | 后果 |
|---|---|---|---|
| \`\\boxed{\\frac{1}{2}}\` | \`\\frac{1\` | \`\\frac{1}{2}\` | 判错（模型其实答对） |
| \`\\boxed{\\dfrac{3}{4}}\` | \`\\dfrac{3\` | \`\\dfrac{3}{4}\` | 判错 |
| \`\\boxed{\\sqrt{\\frac{1}{2}}}\` | \`\\sqrt{\\frac{1\` | \`\\sqrt{\\frac{1}{2}}\` | 判错 |

规律：**只要答案包含嵌套结构（分数、根式、上标），正则必然截断**。
而 MATH-500 里有大量分数答案。

**最严重的问题是不报错**——程序正常跑完，只是准确率被系统性压低。
而你会以为是「模型不行」，不会想到是解析器的 bug。

**二、理论原因**

嵌套括号的语言（Dyck 语言）**不是正则语言**。
正则表达式没有「记忆」，它无法记录「当前嵌套了几层」。
形式语言理论里，识别 Dyck 语言需要至少一个栈（上下文无关文法）。

实践中可以手写支持有限层的正则模式（如只处理两层），
但既难读又脆弱——遇到三层就错。**手写深度计数才是正解。**

**三、正确实现的关键逻辑**

    def extract_boxed(text):
        out, i = None, 0
        while True:                              # 外层：找每一个 \\boxed{
            j = text.find("\\\\boxed{", i)
            if j < 0:
                return out                       # 返回最后一个
            k, depth, buf = j + 7, 1, []         # depth 从 1 开始
            while k < len(text) and depth > 0:   # 内层：数深度
                ch = text[k]
                if ch == "{":
                    depth += 1
                    buf.append(ch)
                elif ch == "}":
                    depth -= 1
                    if depth > 0:                # 外层闭合符不放进内容
                        buf.append(ch)
                else:
                    buf.append(ch)
                k += 1
            out = "".join(buf)
            i = k                                # 继续找下一个

**四个要点**：

1. **depth 从 1 开始**：\`j + 7\` 已经跳过了 \`\\boxed{\`（含那个 \`{\`），
   所以进入内层循环时已经消耗了一个左括号。
2. **只有 depth > 0 时才保留 \`}\`**：减到 0 的那个 \`}\` 是外层闭合符，不属于内容。
3. **外层 while True 循环**：让 \`out\` 被不断覆盖，最终留下最后一个匹配。
   这是「取最后一个」的实现方式——不需要先 \`findall\` 再取 \`[-1]\`。
4. **边界**：\`k < len(text) and depth > 0\`——如果文本在括号未闭合时结束
   （输出被截断），循环会正常退出，返回不完整内容。这比抛异常更安全，
   但也意味着你需要额外检查（c14-l3 的「无答案」分支）。

**四、还应该做什么**

- **抽取后归一化**：\`\\dfrac\` → \`\\frac\`、去 \`\\left/\\right\` 等。
  不做的话，等价答案会被判错。
- **处理空格变体**：\`\\boxed {83}\`（花括号前有空格）需要
  \`re.search(r"\\\\boxed\\s*\\{", ...)\` 而不是 \`str.find\`。
- **写回归测试**：至少覆盖「单数字 / 分数 / 多层嵌套 / 多匹配 / 无匹配 / 被截断」
  六种情况。`,
    rubric: [
      { point: '给出至少两个具体失败例子（分数、根式）及截断结果', score: 3 },
      { point: '指出「不报错、只悄悄判错」这个隐蔽性', score: 2 },
      { point: '解释理论原因：嵌套括号不是正则语言，需要栈', score: 2 },
      { point: '写出深度计数的关键逻辑（depth 从 1 开始、归零结束）', score: 2 },
      { point: '提到取最后一个与归一化这两个配套要求', score: 1 },
    ],
    keywords: ['嵌套', '正则语言', '深度计数', 'depth', '截断', '取最后一个', '归一化', '不报错'],
    explanation:
      '这题的得分点在「理论 + 实践」两半：能说出「嵌套括号不是正则语言」说明你理解了根因；能写出 depth 从 1 开始说明你真写过。只背结论不写代码的答案会在第三部分失分。',
    tags: ['boxed 解析', '综合'],
  },
  {
    id: 'llm-a1-c14-e18',
    relatedLessonId: 'llm-a1-c14-l2',
    type: 'code',
    difficulty: 4,
    question:
      '实现 `extract_all_boxed(text)`：返回**所有** `\\boxed{...}` 的内容列表（按出现顺序），支持嵌套。找不到时返回空列表。\n\n然后实现 `pick_final(candidates)`：返回最后一个候选，列表为空时返回 `None`。',
    starterCode: `def extract_all_boxed(text):
    pass


def pick_final(candidates):
    pass


print(extract_all_boxed(r"a \\boxed{12} b \\boxed{83}"))
print(pick_final(extract_all_boxed(r"a \\boxed{12} b \\boxed{83}")))`,
    expectedOutput: "['12', '83'] 然后 83",
    tests: `assert extract_all_boxed(r"a \\boxed{12} b \\boxed{83}") == ["12", "83"]
assert extract_all_boxed(r"\\boxed{83}") == ["83"]
assert extract_all_boxed("nothing") == []
# 嵌套要完整
assert extract_all_boxed(r"\\boxed{\\frac{1}{2}}") == [r"\\frac{1}{2}"]
# 多个 + 嵌套
r = extract_all_boxed(r"\\boxed{\\frac{1}{2}} and \\boxed{7}")
assert r == [r"\\frac{1}{2}", "7"], f"实际 {r}"
# pick_final
assert pick_final(["12", "83"]) == "83"
assert pick_final([]) is None
assert pick_final(["42"]) == "42"
# 组合：取最后一个
assert pick_final(extract_all_boxed(r"so \\boxed{12} then \\boxed{83}")) == "83"
`,
    answer: `def extract_all_boxed(text):
    out, i = [], 0
    while True:
        j = text.find("\\\\boxed{", i)
        if j < 0:
            return out
        k, depth, buf = j + 7, 1, []
        while k < len(text) and depth > 0:
            ch = text[k]
            if ch == "{":
                depth += 1
                buf.append(ch)
            elif ch == "}":
                depth -= 1
                if depth > 0:
                    buf.append(ch)
            else:
                buf.append(ch)
            k += 1
        out.append("".join(buf))
        i = k


def pick_final(candidates):
    return candidates[-1] if candidates else None


print(extract_all_boxed(r"a \\boxed{12} b \\boxed{83}"))
print(pick_final(extract_all_boxed(r"a \\boxed{12} b \\boxed{83}")))`,
    explanation:
      '```python\nout.append("".join(buf))   # 每次匹配都收集\n...\nreturn candidates[-1] if candidates else None\n```\n\n**拆成两个函数的好处**：`extract_all_boxed` 保留全部候选，`pick_final` 单独决定策略。这样当你要做「一致性检查」（比如 c15 的投票）时，可以直接用 `extract_all_boxed` 看模型中途改了几次答案——**这在诊断模型行为时很有价值**。',
    tags: ['编程', 'boxed 解析'],
  },

  /* ─────────────── l3：判分（难度 3，10 题）─────────────── */
  {
    id: 'llm-a1-c14-e19',
    relatedLessonId: 'llm-a1-c14-l3',
    type: 'single',
    difficulty: 2,
    question: '本站实测 9 条用例：只用字符串相等通过 4 条，四级判分阶梯通过 7 条。差的那 3 条是什么问题？',
    options: [
      { value: 'A', text: '模型答错了，但判分器放过了' },
      { value: 'B', text: '数学上相等但字符串不同（`\\frac{1}{2}` vs `0.5`、`2+3` vs `5`）' },
      { value: 'C', text: '抽取器截断了答案' },
      { value: 'D', text: '归一化把答案改错了' },
    ],
    answer: 'B',
    explanation:
      '差的三条是 `\\frac{1}{2}` vs `0.5`（正反两向）与 `2+3` vs `5`——它们是同一个数，但字符串不同。字符串相等会把它们判错，从而**系统性低估**准确率。',
    tags: ['判分', '实测'],
  },
  {
    id: 'llm-a1-c14-e20',
    relatedLessonId: 'llm-a1-c14-l3',
    type: 'single',
    difficulty: 3,
    question: '四级判分阶梯的正确顺序是？',
    options: [
      { value: 'A', text: '表达式求值 → 分数等价 → 数值容差 → 字符串相等' },
      { value: 'B', text: '字符串相等 → 数值容差 → 分数等价 → 表达式求值' },
      { value: 'C', text: '字符串相等 → 表达式求值 → 数值容差 → 分数等价' },
      { value: 'D', text: '分数等价 → 字符串相等 → 数值容差 → 表达式求值' },
    ],
    answer: 'B',
    explanation:
      '先严后松、从快到慢。L1 最严格（完全相等），L4 最宽松（数学等价）。这样 80% 的答案在 L1 就快速判完，只有极少数落到需要表达式求值的 L4。顺序反了会误判。',
    tags: ['判分阶梯'],
  },
  {
    id: 'llm-a1-c14-e21',
    relatedLessonId: 'llm-a1-c14-l3',
    type: 'judge',
    difficulty: 2,
    question: '判分器里可以直接用 `eval()` 求值模型输出的表达式，因为它跑在本地，没有安全风险。',
    answer: false,
    explanation:
      '极其危险。判分器的输入是模型输出 = 外部输入。`\\boxed{__import__("os").system("...")}` 这样的输出能让模型在你的机器上执行任意命令——这是真实的 RCE 漏洞。**必须用 `ast` 白名单求值。**本站实测该输入被拦截并抛出 `ValueError: 不允许的语法：Call`。',
    tags: ['安全', 'eval'],
  },
  {
    id: 'llm-a1-c14-e22',
    relatedLessonId: 'llm-a1-c14-l3',
    type: 'judge',
    difficulty: 3,
    question: '`ast` 白名单求值的安全性来自「黑名单式禁止危险函数」。',
    answer: false,
    explanation:
      '反了。白名单的思路是「只允许这几种节点」，而不是「禁止那几个函数」。本站实现只放行 `Expression` / `Constant`（数字）/ `BinOp`（四则）/ `UnaryOp` / 白名单 `Name` / 白名单 `Call`。任何其他语法（属性访问、字符串、列表、Lambda）一律拒绝。**黑名单永远会漏。**',
    tags: ['安全', 'ast'],
  },
  {
    id: 'llm-a1-c14-e23',
    relatedLessonId: 'llm-a1-c14-l3',
    type: 'fill',
    difficulty: 2,
    question:
      '四级判分阶梯依次是：L1 ____相等、L2 数值____、L3 ____等价、L4 ____求值。',
    blanks: [['字符串'], ['容差'], ['分数'], ['表达式']],
    explanation:
      'L1 解决最常见情况（`83` == `83`）；L2 解决浮点误差；L3 解决分数未约分（`2/4` vs `1/2`）；L4 解决未求值的表达式与 LaTeX 分数（`2+3` vs `5`、`\\frac{1}{2}` vs `0.5`）。',
    tags: ['判分阶梯'],
  },
  {
    id: 'llm-a1-c14-e24',
    relatedLessonId: 'llm-a1-c14-l3',
    type: 'multiple',
    difficulty: 3,
    question: '关于 SymPy 在判分中的使用，下面哪些说法正确？（多选）',
    options: [
      { value: 'A', text: 'SymPy 能做符号判等（`2*x+2` vs `2*(x+1)`），这是纯数值求值做不到的' },
      { value: 'B', text: 'SymPy 导入约 2.3 秒、单次化简 0.1-0.2 秒，500 题全走比生成还慢' },
      { value: 'C', text: '本站的 Pyodide 路径没有预装 SymPy，所以 demo 不能用它' },
      { value: 'D', text: '既然 SymPy 更强，所有答案都应该走 SymPy' },
    ],
    answer: ['A', 'B', 'C'],
    explanation:
      'D 错。正确架构是四级阶梯：前三级用纯 Python（快），只有落到 L4 才考虑符号化简。而且**可用性也是约束**——Pyodide 只预装 numpy / pandas / matplotlib，没有 SymPy。所以本节的 demo 用 `ast` 白名单求值，SymPy 只作为正文里的可选增强。',
    tags: ['SymPy', '工程取舍'],
  },
  {
    id: 'llm-a1-c14-e25',
    relatedLessonId: 'llm-a1-c14-l3',
    type: 'code',
    difficulty: 3,
    question:
      '实现 `latex_to_expr(s)`：把 LaTeX 数学式转成 Python 可求值的表达式。\n\n规则：\n- `\\frac{a}{b}`、`\\dfrac{a}{b}`、`\\tfrac{a}{b}` → `((a)/(b))`\n- `\\sqrt{a}` → `sqrt(a)`\n- 支持多层嵌套（至少 3 层）\n\n提示：正则 `[^{}]*` 只能匹配不含花括号的内容，所以第一次匹配到的一定是最内层——用循环从内向外剥。',
    starterCode: `import re

def latex_to_expr(s):
    pass


print(latex_to_expr(r"\\frac{1}{2}"))
print(latex_to_expr(r"\\sqrt{8}"))`,
    expectedOutput: '((1)/(2)) 然后 sqrt(8)',
    tests: `assert latex_to_expr(r"\\frac{1}{2}") == "((1)/(2))"
assert latex_to_expr(r"\\dfrac{3}{4}") == "((3)/(4))", "dfrac 未处理：" + repr(latex_to_expr(r"\\dfrac{3}{4}"))
assert latex_to_expr(r"\\tfrac{1}{3}") == "((1)/(3))"
assert latex_to_expr(r"\\sqrt{8}") == "sqrt(8)"
# 嵌套两层
r2 = latex_to_expr(r"\\frac{\\frac{1}{2}}{3}")
assert r2 == "((((1)/(2)))/(3))", "两层嵌套失败：" + repr(r2)
# 嵌套三层：逐层从内向外替换
r3 = latex_to_expr(r"\\frac{\\frac{\\frac{1}{2}}{3}}{4}")
assert r3 == "((((((1)/(2)))/(3)))/(4))", "三层嵌套失败：" + repr(r3)
# 纯数字不变
assert latex_to_expr("83") == "83"
# sqrt 里套 frac
r4 = latex_to_expr(r"\\sqrt{\\frac{1}{2}}")
assert r4 == "sqrt(((1)/(2)))", "sqrt 套 frac 失败：" + repr(r4)
`,
    answer: `import re

def latex_to_expr(s):
    for _ in range(5):
        m = re.search(r"\\\\[dt]?frac\\{([^{}]*)\\}\\{([^{}]*)\\}", s)
        if not m:
            break
        s = s[:m.start()] + f"(({m.group(1)})/({m.group(2)}))" + s[m.end():]
    return re.sub(r"\\\\sqrt\\{([^{}]*)\\}", r"sqrt(\\1)", s)


print(latex_to_expr(r"\\frac{1}{2}"))
print(latex_to_expr(r"\\sqrt{8}"))`,
    explanation:
      '```python\nfor _ in range(5):\n    m = re.search(r"\\\\[dt]?frac\\{([^{}]*)\\}\\{([^{}]*)\\}", s)\n    if not m: break\n    s = s[:m.start()] + f"(({m.group(1)})/({m.group(2)}))" + s[m.end():]\nreturn re.sub(r"\\\\sqrt\\{([^{}]*)\\}", r"sqrt(\\1)", s)\n```\n\n**关键在 `[^{}]*`**：它只匹配不含花括号的内容，所以第一次匹配到的一定是**最内层**的分数。循环剥 5 次能处理 5 层嵌套。\n\n**注意顺序**：先处理 `\\frac`（循环），再处理 `\\sqrt`（一次替换）。反过来的话 `\\sqrt{\\frac{1}{2}}` 里的 `\\frac` 会漏掉。',
    tags: ['编程', 'LaTeX 转换'],
  },
  {
    id: 'llm-a1-c14-e26',
    relatedLessonId: 'llm-a1-c14-l3',
    type: 'code',
    difficulty: 3,
    question:
      '实现 `grade(pred, gold, tol=1e-6)`：**三级**判分（本练习只做 L1/L2/L4，跳过 L3 分数等价）。返回 `True` / `False`。\n\n- L1：字符串相等\n- L2：`abs(float(p) - float(g)) < tol`（转不动就跳过）\n- L4：用 `latex_to_expr` 转换后求值比较（求值用 `eval` 即可，本练习不要求安全白名单；求值失败就判 False）\n\n`pred is None` 时直接返回 `False`。',
    starterCode: `import re

def latex_to_expr(s):
    for _ in range(5):
        m = re.search(r"\\\\[dt]?frac\\{([^{}]*)\\}\\{([^{}]*)\\}", s)
        if not m:
            break
        s = s[:m.start()] + f"(({m.group(1)})/({m.group(2)}))" + s[m.end():]
    return re.sub(r"\\\\sqrt\\{([^{}]*)\\}", r"sqrt(\\1)", s)

def grade(pred, gold, tol=1e-6):
    pass


print(grade("83", "83"))
print(grade(r"\\frac{1}{2}", "0.5"))
print(grade("12", "83"))`,
    expectedOutput: 'True / True / False',
    tests: `assert grade("83", "83") is True
assert grade(r"\\frac{1}{2}", "0.5") is True, "L4 应判对"
assert grade("0.5", r"\\frac{1}{2}") is True, "反向也应判对"
assert grade("2+3", "5") is True, "表达式求值应判对"
assert grade("12", "83") is False
assert grade(None, "83") is False, "None 应判错"
assert grade("83.0000001", "83") is True, "L2 容差应生效"
assert grade("abc", "83") is False, "无法求值应判错"
# 真错的不能被放过
assert grade("183", "8") is False, "子串不能误命中"
assert grade(r"\\frac{1}{3}", "0.5") is False
`,
    answer: `import re

def latex_to_expr(s):
    for _ in range(5):
        m = re.search(r"\\\\[dt]?frac\\{([^{}]*)\\}\\{([^{}]*)\\}", s)
        if not m:
            break
        s = s[:m.start()] + f"(({m.group(1)})/({m.group(2)}))" + s[m.end():]
    return re.sub(r"\\\\sqrt\\{([^{}]*)\\}", r"sqrt(\\1)", s)

def grade(pred, gold, tol=1e-6):
    if pred is None:
        return False
    p, g = pred.strip(), gold.strip()
    if p == g:
        return True
    try:
        if abs(float(p) - float(g)) < tol:
            return True
    except ValueError:
        pass
    try:
        return abs(eval(latex_to_expr(p)) - eval(latex_to_expr(g))) < tol
    except Exception:
        return False


print(grade("83", "83"))
print(grade(r"\\frac{1}{2}", "0.5"))
print(grade("12", "83"))`,
    explanation:
      '```python\nif p == g: return True\ntry:\n    if abs(float(p) - float(g)) < tol: return True\nexcept ValueError: pass\ntry:\n    return abs(eval(latex_to_expr(p)) - eval(latex_to_expr(g))) < tol\nexcept Exception:\n    return False\n```\n\n**注意 `except Exception`**：L4 会碰到各种奇怪的输入（未闭合的 LaTeX、非数学内容），任何异常都必须吞掉并判 False——**判分器不能因为一条脏数据崩掉整个 500 题流程**。\n\n**另外注意 `grade("183", "8")` 必须是 False**——这验证了你没有用「子串包含」这种宽松判法。',
    tags: ['编程', '判分'],
  },
  {
    id: 'llm-a1-c14-e27',
    relatedLessonId: 'llm-a1-c14-l3',
    type: 'code',
    difficulty: 4,
    question:
      '实现 `safe_eval(expr)`：用 `ast` 白名单安全求值。\n\n只允许：\n- 数字常量（int / float）\n- 四则运算 `+ - * /`、乘方 `**`、一元负号\n- 白名单函数：`sqrt` `abs` `log` `exp`（从 `math` 取）\n- 白名单常量：`pi` `e`\n\n任何其他语法（属性访问、字符串、列表、非白名单函数调用等）都抛 `ValueError`。',
    starterCode: `import ast, math

def safe_eval(expr):
    pass


print(safe_eval("2+3*4"))
print(safe_eval("sqrt(16)"))
print(safe_eval("((1)/(2))"))`,
    expectedOutput: '14 / 4.0 / 0.5',
    tests: `assert abs(safe_eval("2+3*4") - 14) < 1e-9
assert abs(safe_eval("sqrt(16)") - 4.0) < 1e-9
assert abs(safe_eval("((1)/(2))") - 0.5) < 1e-9
assert abs(safe_eval("-5") + 5) < 1e-9
assert abs(safe_eval("2**10") - 1024) < 1e-9
assert abs(safe_eval("abs(-3)") - 3) < 1e-9
assert abs(safe_eval("pi") - math.pi) < 1e-9
# ── 安全：这些必须被拒绝 ──
def must_reject(expr):
    try:
        safe_eval(expr)
    except Exception:
        return True
    return False

assert must_reject("__import__('os').getcwd()"), "__import__ 必须被拒绝"
assert must_reject("open('x')"), "open 必须被拒绝"
assert must_reject("(1).__class__"), "属性访问必须被拒绝"
assert must_reject("'abc'"), "字符串必须被拒绝"
assert must_reject("[1,2]"), "列表必须被拒绝"
assert must_reject("lambda: 1"), "lambda 必须被拒绝"
assert must_reject("eval('1')"), "eval 必须被拒绝"
`,
    answer: `import ast, math

ALLOWED_FUNCS = {"sqrt": math.sqrt, "abs": abs, "log": math.log, "exp": math.exp}
ALLOWED_NAMES = {"pi": math.pi, "e": math.e}
OPS = {ast.Add: lambda a, b: a + b, ast.Sub: lambda a, b: a - b,
       ast.Mult: lambda a, b: a * b, ast.Div: lambda a, b: a / b,
       ast.Pow: lambda a, b: a ** b, ast.USub: lambda a: -a}

def safe_eval(expr):
    def ev(n):
        if isinstance(n, ast.Expression):
            return ev(n.body)
        if isinstance(n, ast.Constant) and isinstance(n.value, (int, float)) \\
                and not isinstance(n.value, bool):
            return n.value
        if isinstance(n, ast.BinOp) and type(n.op) in OPS:
            return OPS[type(n.op)](ev(n.left), ev(n.right))
        if isinstance(n, ast.UnaryOp) and type(n.op) in OPS:
            return OPS[type(n.op)](ev(n.operand))
        if isinstance(n, ast.Name) and n.id in ALLOWED_NAMES:
            return ALLOWED_NAMES[n.id]
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Name) \\
                and n.func.id in ALLOWED_FUNCS:
            return ALLOWED_FUNCS[n.func.id](*[ev(a) for a in n.args])
        raise ValueError(f"不允许的语法：{type(n).__name__}")
    return ev(ast.parse(expr, mode="eval"))


print(safe_eval("2+3*4"))
print(safe_eval("sqrt(16)"))
print(safe_eval("((1)/(2))"))`,
    explanation:
      '```python\nif isinstance(n, ast.Call) and isinstance(n.func, ast.Name) \\\n        and n.func.id in ALLOWED_FUNCS:\n    return ALLOWED_FUNCS[n.func.id](*[ev(a) for a in n.args])\nraise ValueError(...)\n```\n\n**白名单的威力在最后那行 `raise`**：任何没被前面分支接住的节点类型都直接抛异常。所以 `ast.Attribute`（`(1).__class__`）、`ast.Lambda`、`ast.List`、`ast.JoinedStr` 全部被拒。\n\n**注意 `n.func` 必须是 `ast.Name`**：如果是 `ast.Attribute`（比如 `os.system`），`isinstance(n.func, ast.Name)` 为 False，直接落到 `raise`。这一条挡住了所有「模块.函数」形式的调用。\n\n**`not isinstance(n.value, bool)`**：`True`/`False` 在 Python 里是 `int` 的子类，不加这个判断 `safe_eval("True")` 会返回 1。',
    tags: ['编程', '安全', 'ast'],
  },
  {
    id: 'llm-a1-c14-e28',
    relatedLessonId: 'llm-a1-c14-l3',
    type: 'open',
    difficulty: 4,
    question:
      '你要给 MATH-500 写一个判分器。请设计完整的判分方案：说明为什么字符串相等不够、四级阶梯每级解决什么问题、如何处理安全与健壮性，并估算这个判分器跑完 500 题需要多久（给出推理）。',
    referenceAnswer: `**一、为什么字符串相等不够（量化）**

本站 9 条用例实测：

| 判分方式 | 通过数 |
|---|---|
| 只做字符串相等 | 4/9（44.4%） |
| 四级阶梯 | 7/9（77.8%） |

差的三条：\`\\frac{1}{2}\` vs \`0.5\`（正反两向）、\`2+3\` vs \`5\`。
它们数学上相等但字符串不同。**这会造成系统性低估，而且你发现不了**——
因为错的那些看起来就是「模型答错了」。

**二、四级阶梯的设计**

| 级别 | 判据 | 解决什么 | 例子 |
|---|---|---|---|
| L1 | \`p == g\` | 最常见情况，最快 | \`83\` == \`83\` |
| L2 | \`abs(float(p)-float(g)) < 1e-6\` | 浮点误差 | \`0.5000000001\` vs \`0.5\` |
| L3 | \`Fraction(p) == Fraction(g)\` | 分数未约分 | \`2/4\` vs \`1/2\` |
| L4 | \`latex_to_expr\` + 求值比较 | 未求值表达式、LaTeX 分数 | \`2+3\` vs \`5\`、\`\\frac{1}{2}\` vs \`0.5\` |

**顺序不能改**：先严后松、从快到慢。L1 命中率最高（约 70-80%），
这些答案不承担任何额外开销。

**前置步骤**：\`normalize\`（\`\\dfrac\`→\`\\frac\`、去 \`\\left/\\right\`、去细间距）
不属于任何一级，是所有级别的共同前提。

**三、安全**

判分器的输入是模型输出 = 外部输入。**绝对禁止 \`eval()\`**：

    \\boxed{__import__('os').system('rm -rf /')}

正确做法：\`ast.parse\` 后按节点类型白名单递归求值。
只放行 \`Constant\`（数字）/ \`BinOp\`（四则）/ \`UnaryOp\` / 白名单 \`Name\` / 白名单 \`Call\`。
任何其他节点抛异常。本站实测该恶意输入被拦截。

**关键细节**：\`n.func\` 必须是 \`ast.Name\`（不能是 \`ast.Attribute\`），
这一条挡住了所有 \`模块.函数\` 形式的调用。

**四、健壮性**

每一级都要 \`try/except\`。判分器**不能因为一条脏数据崩掉整个 500 题流程**。
具体：
- L2 的 \`float()\` 会抛 \`ValueError\` → 捕获跳过
- L3 的 \`Fraction()\` 会抛 \`ZeroDivisionError\` / \`ValueError\` → 捕获跳过
- L4 的求值可能遇到未闭合 LaTeX、非数学内容 → 捕获并判 False

**五、耗时估算**

前提：抽取 + 归一化 + L1-L3 是纯字符串运算，L4 是 \`ast\` 解析 + 求值。

| 环节 | 单题耗时（估） |
|---|---|
| 抽取（深度计数，O(n)） | ~10 μs |
| 归一化（7 条正则） | ~20 μs |
| L1-L3 | ~5 μs |
| L4（仅少数题触发） | ~200 μs |

假设 20% 的题落到 L4：

    500 × (10 + 20 + 5) μs + 100 × 200 μs
    = 500 × 35 μs + 20,000 μs
    = 17,500 + 20,000 μs
    ≈ 37.5 ms

**结论：判分 500 题在几十毫秒量级。**

对比生成：500 题 × 平均 200 token，按 10 token/s 约 **2.8 小时**。
所以**判分耗时完全可以忽略**——不要为它做优化，把精力放在正确性上。

**如果换成 SymPy**：导入 2.3 秒 + 单次化简 0.1-0.2 秒。
假设 20% 落 SymPy：100 × 0.15 = **15 秒**，是纯 Python 方案的 400 倍。
这就是为什么四级阶梯的前三级必须用纯 Python。

**六、还应该做什么**

- 写回归测试集（至少覆盖：单数字 / 分数 / 根式 / 多层嵌套 / 多匹配 / 无匹配 / 恶意输入）
- 按 \`level\` 和 \`subject\` 分层报告，不要只报总分
- 记录「无答案」与「被判错」的比例——前者说明预算不足或格式跑偏，
  后者才是真的能力问题`,
    rubric: [
      { point: '用实测数字说明字符串相等的不足（4/9 vs 7/9）', score: 2 },
      { point: '四级阶梯每级都正确配对「解决什么问题」', score: 3 },
      { point: '说明顺序不能改的理由（先严后松、L1 命中率最高）', score: 1 },
      { point: '强调禁止 eval()，说明 ast 白名单的关键细节（n.func 必须是 Name）', score: 2 },
      { point: '给出每一级 try/except 的健壮性理由', score: 1 },
      { point: '给出耗时估算并与生成耗时对比（判分可忽略）', score: 1 },
    ],
    keywords: ['四级阶梯', '字符串相等', 'Fraction', 'ast 白名单', 'try/except', '耗时估算', 'SymPy'],
    explanation:
      '这题是本章的综合验收。评分重点在「能不能把设计决策讲清」——尤其是「为什么顺序是这样」「为什么不用 SymPy」「为什么要 try/except」这三处，它们都是工程判断而不是知识记忆。',
    tags: ['判分', '设计', '综合'],
  },
];
