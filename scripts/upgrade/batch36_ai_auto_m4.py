# -*- coding: utf-8 -*-
"""batch36 C 组：ai-auto-m4《代码与文档自动化》4 节升级（TS 源，_batch34_lib 模式）。
用法：python batch36_ai_auto_m4.py verify -> 跑章代码看输出
     python batch36_ai_auto_m4.py         -> 打补丁
"""
from _batch34_lib import Lib, build_md, finish
import sys

lib = Lib("ai-auto-m4", [
    "src/content/chapters/ai-auto-m4.ts",
    "src/content/chapters/ai-auto-m4b.ts",
])

C1 = dict(
name="c1 代码生成：从补全到自主修改",
why=("代码生成的三个层次难度天差地别：行级补全（接上下文）、函数级生成（理解意图+项目风格）、仓库级修改"
     "（定位文件+跨文件依赖+不破坏他人+跑通测试）。仓库级是真难题——SWE-bench 用 2294 个真实 issue-PR 对、"
     "以测试判定（FAIL_TO_PASS+PASS_TO_PASS）客观衡量。核心方法论是「生成-测试-修复」循环：回滚、"
     "完整失败信息、限次数。"),
intuition=("函数级生成像「照图纸造一个零件」，仓库级修改像「在正在运行的电厂里换一根电缆」：先得找到是哪根"
           "（定位），搞清它连着谁（依赖），换的过程不能停电（不破坏），换完还要全厂试运行（测试）。"
           "SWE-bench 就是「电厂检修执照考试」——考官不看报告写得多好，只看电闸合上后全厂灯亮不亮。"),
code='''import re
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
run_loop()''',
expected=("实测：第 1 次尝试（只支持横线日期）在输入 '2026/01/15' 上失败，失败明细（期望 True 得到 False）"
          "被「喂回」；第 2 次尝试修复后全部测试通过 → success——「失败信息完整+回滚重试」正是 "
          "SWE-agent 式循环的最小骨架。"),
cerr=("失败反馈只写「测试失败」不给断言明细（模型无法定位）；不回滚就在改坏的代码上继续改（第二次尝试必败）；"
      "不限尝试次数（连续失败说明没理解问题，再试是烧钱）。"),
miscon=("1. **代码生成=行级补全的延长线**——仓库级是不同量级的问题（SWE-bench 早期 resolved rate 个位数）；\n"
        "2. **跑通测试=修好了**——还要 PASS_TO_PASS：没把原本能跑的改坏才算；\n"
        "3. **一次让 AI 改五个文件更快**——小步快跑，一次一个函数验证后再下一个。"),
connection=("- **向前**：m2-c1 的 ReAct 循环是本循环的骨架，工具=读写文件+跑测试；\n"
            "- **向后**：c2 的变异测试评估「测试能否当裁判」，M5 的评估方法论同源；\n"
            "- **平行**：SWE-bench 的测试判定思想与 m1-c2「工具验证>口头自信」一致。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 三层次 | 行级/函数级/仓库级，难度递增 |\n"
         "| 循环 | 生成→测试→(失败信息喂回)→修复，限 3~5 次 |\n"
         "| 判定 | SWE-bench：FAIL_TO_PASS+PASS_TO_PASS |\n"
         "| 必做 | 回滚、完整失败信息、次数上限 |\n"
         "| 禁止 | 改测试蒙混、引入不存在 API、大步重构 |"),
ref="本课程整理（可参见论文原文：Jimenez et al., SWE-bench, arXiv:2310.06770）",
)

C2 = dict(
name="c2 自动化测试：生成用例与变异测试",
why=("测试是最枯燥又最该写的代码。AI 能快速生成骨架、提示边界、为遗留代码补测——但「AI 生成的测试可信吗」"
     "是关键：看着实现写测试会同源错，弱断言测不出错，覆盖率 100% 也不代表验证了正确性。变异测试给出客观"
     "裁判：故意引入小 bug，看测试能否杀死——变异得分低的测试再高的覆盖率也是装饰。"),
intuition=("覆盖率像「体检走过场」：每科都去了（执行到了）不等于每科都查了（验证对了）。变异测试是"
           "「考官故意写错答案看你抓不抓得住」：把 `/` 换成 `*`、把 `<` 换成 `<=`——测试还能通过，"
           "说明它根本没在验算。断言太弱的测试（is not None）在变异面前全军覆没。"),
code='''def clamp(x, lo, hi):
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
print("两者行覆盖率都是 100% —— 变异得分才区分测试质量")''',
expected=("实测：只查「非 None」的弱测试变异得分 33%（3 个变异只杀死 1 个——删语句那个），断言具体值的"
          "强测试得分 100%——两者行覆盖率都是 100%，变异得分才暴露测试质量的差距。"),
cerr=("让 AI 看着实现写测试（实现错了测试跟着错）；接受 assert result is not None 式弱断言；"
      "测试依赖 datetime.now()/random（换个日子就崩）。"),
miscon=("1. **100% 覆盖率=没有 bug**——覆盖率只衡量「执行到」，不衡量「验证对」；\n"
        "2. **变异测试太慢不实用**——只在关键模块跑、限制变异算子，收益远大于成本；\n"
        "3. **AI 测试可以直接合入**——人工补业务语义+变异验证后才可信。"),
connection=("- **向前**：c1 的「用测试判定 patch」预设了测试本身可靠；\n"
            "- **向后**：M5 的评估方法论与变异思想同源（用受控变化度量判别力）；\n"
            "- **平行**：m3-c2 的交叉校验是业务数据世界的「变异测试」。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 陷阱 | 覆盖率 100%≠验证对（divide 除零案例） |\n"
         "| 变异 | 注入小 bug 看测试能否杀死；得分=杀死/总数 |\n"
         "| 实测 | 弱测试 33% vs 强测试 100% |\n"
         "| 组合 | AI 生成初稿→变异找漏洞→AI 补强断言 |\n"
         "| 四陷阱 | 同源错误/弱断言/依赖实现/不稳定 |"),
ref="本课程整理（可参见 SWE-bench（arXiv:2310.06770）的方法论与 mutmut/pytest 文档相应章节）",
)

C3 = dict(
name="c3 代码审查自动化",
why=("人工审查的困境：大 PR 扫一眼 approve、重复问题耗精力、质量看状态。AI 补的是 7×24、不漏看、一致——"
     "但最大的死法是误报：50% 误报率两周后就没人看了。控制手段五件套（阈值/分级/只查改动行/给上下文/"
     "可反馈），分级的关键是 blocker 必须极准；上线路径「先窄后宽」：先摘要→只报 blocker→再加 suggestion。"),
intuition=("AI 审查像「新来的初级审查员」：勤快、标准稳定，但爱提泛泛意见。要让它有信誉：只许报「能指出"
           "具体行号+为什么+怎么改」的问题，不确定就标 uncertain 折叠；只查本次 diff 的改动行"
           "（别人家的旧账不要翻）——blocker 报错一次，信任就清零。"),
code='''import re
def extract_changed_lines(diff):
    changed, new_no = set(), 0
    for line in diff.split("\\n"):
        if line.startswith("@@"):
            m = re.search(r"\\+(\\d+)", line)
            new_no = int(m.group(1)) if m else new_no
        elif line.startswith("+") and not line.startswith("+++"):
            changed.add(new_no); new_no += 1
        elif line.startswith("-") and not line.startswith("---"):
            pass
        else:
            new_no += 1
    return changed
DIFF = """@@ -1,4 +1,5 @@
 def pay(order):
-    charge(order.amount)
+    if order.amount <= 0:
+        raise ValueError("金额必须为正")
+    charge(order.amount)
     notify(order.user)"""
changed = extract_changed_lines(DIFF)
print("改动行:", sorted(changed))
for line, sev in [(3, "blocker"), (2, "suggestion"), (40, "blocker")]:
    if line not in changed:
        print(f"L{line} [{sev}] 不在改动范围内 -> 丢弃(只查改动行)"); continue
    act = {"blocker": "阻止合并", "suggestion": "建议修", "nit": "折叠"}[sev]
    print(f"L{line} [{sev}] -> {act}")''',
expected=("实测：diff 解析出改动行 {2,3,4}；L3 的 blocker（范围内）→「阻止合并」，L2 的 suggestion →"
          "「建议修」，L40 的旧代码问题因不在改动范围被丢弃——「只查改动行」直接砍掉一大类误报。"),
cerr=("检查整个文件（历史问题淹没本次改动）；blocker 混入不确定的判断（一次误报毁掉信任）；"
      "评论格式问题（交给 linter）。"),
miscon=("1. **AI 审查可以直接 approve**——责任必须留在人类审查者；\n"
        "2. **提示越多查得越全**——限制范围+提高阈值才能压误报；\n"
        "3. **误报多点没关系**——50% 误报率两周后开发者会习惯性忽略一切。"),
connection=("- **向前**：m1-c3 的提示四要素与 schema 是审查提示的骨架；\n"
            "- **向后**：M5 的评估定义「误报率/采纳率」的度量口径；\n"
            "- **平行**：c1 的失败信息喂回——审查意见也要「为什么+怎么改」才可执行。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 四维度 | 正确性/安全强，性能中，可维护性弱 |\n"
         "| 误报五控 | 阈值/分级/只查改动行/给上下文/可反馈 |\n"
         "| 分级 | blocker 极准(阻止合并)；nit 折叠 |\n"
         "| 上线 | 摘要→blocker→suggestion→nit，先窄后宽 |\n"
         "| 实测 | 改动行 {2,3,4}；范围外问题被丢弃 |"),
ref="本课程整理（可参见 Berkeley CS294 第 6 讲与 Google Code Review 指南相应内容）",
)

C4 = dict(
name="c4 文档处理：分类、抽取、摘要",
why=("文档自动化三类任务：分类（低难）、抽取（中难，schema 设计是核心）、摘要（中高难，长文档需要 "
     "map-reduce）。可靠性保障四层校验：格式/范围/一致性/溯源——其中 evidence 溯源是文档自动化与普通摘要"
     "的分水岭：每个结论要能指回原文，程序校验 evidence 是否真在原文，找不到就标记待核实（幻觉拦截）。"),
intuition=("长文档摘要像「小组汇报」：100 页合同切成 50 段各写小结（map），再把 50 份小结层层合并成一段"
           "总评（reduce）——但分层会丢全局信息（「共 5 个附件少了 1 个」这种整体视角），所以要注入目录/"
           "元信息补课。而每条结论必须带「出处页码」：查得到原文的才采信，查不到的就是编的。"),
code='''DOC = ["第一条 合同期限为 24 个月。", "第三条 合同总金额为人民币 120 万元，含 13% 增值税。",
       "第五条 违约方需支付合同金额的 10%。"]
def map_summarize(chunks):
    return [f"{c[:3]}: {c[4:14]}..." for c in chunks]
summary = " | ".join(map_summarize(DOC))
print("分层汇总:", summary)
claims = [{"text": "期限 24 个月", "evidence": "合同期限为 24 个月"},
          {"text": "总金额 120 万元", "evidence": "合同总金额为人民币 120 万元"},
          {"text": "含 5% 违约金", "evidence": "违约方需支付合同金额的 15%"}]
full = "".join(DOC)
for c in claims:
    ok = c["evidence"] in full
    print(f"结论「{c['text']}」溯源 {'通过' if ok else '失败 -> 标记待核实/转人工'}")''',
expected=("实测：三块合同条款经 map→reduce 生成串接摘要；三条结论的溯源校验——前两条 evidence 在原文命中"
          "通过，第三条 evidence「15%」与原文「10%」不符 → 溯源失败标记待核实——幻觉在「引用回查」这一步"
          "被程序拦截。"),
cerr=("摘要不带 evidence（用户无法验证也无法发现幻觉）；按固定字数硬切文档（在句子中间切断，map 摘要失真）；"
      "reduce 一次塞 50 份块摘要（又超上下文，应分层 reduce）。"),
miscon=("1. **层级分类一次输出更省调用**——分层后每层候选少、准确率高且可解释；\n"
        "2. **map-reduce 无损**——全局结构（附件数/交叉引用）会丢，需目录注入或元信息提取补全；\n"
        "3. **evidence 是锦上添花**——它是四层校验的最后一道闸，没有它抽取正确性无法审计。"),
connection=("- **向前**：m3-c2 的五阶段文档流水线是本节的业务版（同一 confidence/evidence 设计）；\n"
            "- **向后**：M5 的评估度量溯源通过率与字段级准确率；\n"
            "- **平行**：RAG 的「引用来源」是同一防幻觉机制在检索场景的形态。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 三任务 | 分类(低)/抽取(中)/摘要(中高)，常组合成管线 |\n"
         "| schema | 枚举+description+范围+必填 |\n"
         "| 长文档 | map 分块摘要→分层 reduce→全局信息补全 |\n"
         "| 溯源 | evidence 必须在原文可查（实测拦截 15% vs 10%） |\n"
         "| 四层校验 | 格式→范围→一致性→溯源，失败分级处理 |"),
ref="本课程整理（可参见 CMU 11-766 第 6-8 讲（Retrieval/长文档处理）相应内容）",
)

THEMES = {
    "ai-auto-m4-c1": C1, "ai-auto-m4-c2": C2, "ai-auto-m4-c3": C3, "ai-auto-m4-c4": C4,
}

GOALS = {
"ai-auto-m4-c1-l1": ("1. 对比三个层次的难度来源（定位/上下文/连锁反应/验证），复述 SWE-bench 的构成与"
                     "判定设计；\n"
                     "2. 实现「生成-测试-修复」循环：失败输出喂回、回滚再试、3~5 次上限转人工；\n"
                     "3. 用五类失败模式（改测试/幻觉 API/破坏调用方/只改表面/过度重构）审查 AI 改码结果。"),
"ai-auto-m4-c2-l1": ("1. 解释覆盖率陷阱（执行到≠验证对）与三种覆盖率的强弱排序；\n"
                     "2. 实现变异测试：对 clamp 函数注入三类变异，计算弱测试与强测试的变异得分（33% vs 100%）；\n"
                     "3. 用四陷阱审查 AI 生成的测试，并实践「变异反馈→补强断言」的组合。"),
"ai-auto-m4-c3-l1": ("1. 用四维度划分 AI 审查的能力边界，说出 AI 不该做的五件事；\n"
                     "2. 实现 diff 改动行提取器并落地「只查改动行」与三级分级的展示逻辑；\n"
                     "3. 设计审查提示的三个关键约束并给出四阶段上线路径。"),
"ai-auto-m4-c4-l1": ("1. 区分三类任务的难度与组合管线，设计枚举/范围/必填齐全的抽取 schema；\n"
                     "2. 实现 map-reduce 分层摘要并说出全局信息补全的两种方法；\n"
                     "3. 落地四层校验与 evidence 溯源，解释溯源为何是幻觉拦截器。"),
}

PREREQS = {
"ai-auto-m4-c1-l1": "- m2-c1 的 ReAct 循环（循环骨架同源）；\n- 基础 Python 与正则。",
"ai-auto-m4-c2-l1": "- c1 的「测试作为裁判」视角；\n- pytest 断言基础。",
"ai-auto-m4-c3-l1": "- m1-c3 的四要素提示与结构化输出；\n- unified diff 的基本格式。",
"ai-auto-m4-c4-l1": "- m3-c2 的 confidence/evidence 设计（同源思想）；\n- m1-c3 的结构化输出。",
}

MD = {}
for cid, t in THEMES.items():
    lid = cid + "-l1"
    MD[lid] = build_md(lib.orig_content(lid), GOALS[lid], PREREQS[lid],
                       t["why"], t["intuition"], t["code"], t["expected"],
                       t["cerr"], t["miscon"], t["connection"], t["summary"], t["ref"])

if len(sys.argv) > 1 and sys.argv[1] == "verify":
    lib.verify_codes(THEMES, GOALS)
else:
    for cid in THEMES:
        lib.patch_lesson(cid + "-l1", MD[cid + "-l1"])
    finish(lib)
