import type { Chapter } from '../../../types';

/* ============================================================
 *  CS146S Fall 2026 · Week 1（续）：l4 失效模式与上下文窗口、l5 实验课
 *  来源：官方大纲 Week 1 + "How Long Contexts Fail"（官方指定阅读）+
 *        Chroma "Context Rot" 研究 + "Lost in the Middle"（arXiv:2407.03158）
 *        + 官方作业 week1（LLM Prompting Playground 主题锚点）
 *  原创：框架、示例、图示、全部习题
 * ============================================================ */

export const cs146sW1ExtraChapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'cs146s-w1b',
    title: 'Week 1（续）· 失效模式与提示词实验',
    goal: '识别 LLM 的四类长上下文失效模式并掌握检测手段；把前三节的知识收拢为一次可量化、可复现的提示词实验（对应官方作业 LLM Prompting Playground）。',
    lessons: [
      /* ─────────────────────────── l4 ─────────────────────────── */
      {
        id: 'cs146s-w1-l4',
        title: '失效模式与上下文窗口：长文本为什么会让 AI 变笨',
        difficulty: 3,
        content: `
### 学习目标

学完本节，你应该能够：
1. 说出 LLM 长上下文的四类失效模式（干扰、冲突、混淆、投毒），并为每类各举一个 Agent 开发中的真实例子；
2. 计算一个任务的上下文预算，并在"塞不下"时选择正确的策略（截断/压缩/外部化检索）；
3. 区分"模型错误"与"工程错误"——前者换模型，后者改上下文架构；误诊会浪费数周。

### 前置知识

- l2：上下文窗口、KV Cache、概率输出；
- l3：五要素提示词（本节的核心论点是：**上下文质量 > 提示词技巧**）。

### 问题背景

模型厂商的窗口从 8K 卷到 1M，营销话术是"能塞下一整个代码库"。于是很多团队真的把整个仓库塞进去——然后发现：**塞得下 ≠ 用得上**。官方 Week 3 指定阅读《How Long Contexts Fail》给出过一个惊人数据：**上下文冲突（context clash）可以让模型性能下降 39%**——同一窗口里两段互相矛盾的指令，模型不会抗议，而是默默变得平庸。

对 Agent 开发者，这是每天的日常：Agent 的窗口里同时有系统提示、工具定义、几十个文件、几百轮工具输出。不理解失效模式，你会把"架构问题"误诊为"模型太笨"，然后陷入无止境的换模型循环。

### 直觉理解

**把上下文窗口想成一张会议桌。** 窗口大 = 桌子大，能坐下更多人。但是：

- 人越多，每个人的发言越难被听见（**干扰**，distraction）；
- 两个与会者观点相反时，会议不吵不闹，而是集体变得犹豫（**冲突**，clash）；
- 桌上坐了 100 个人，你记不住中间那 50 个说过什么——只对开头和结尾的人印象深（**混淆**，lost in the middle）；
- 混进来一个闹事者，整桌人都会被他带偏（**投毒**，poisoning，Week 6 的提示词注入正是利用这一点）。

桌子越大，问题不会消失，只是换了形式。**上下文工程的任务不是"找更大的桌子"，而是"决定谁有资格上桌"。**

### 核心概念与原理详解

## 四类失效模式

| 模式 | 机制 | Agent 场景实例 | 检测手段 |
| --- | --- | --- | --- |
| **干扰 Distraction** | 无关内容稀释关键信息的注意力权重 | 50 个文件里 47 个与任务无关，关键约束被淹没 | 剪枝实验：删掉无关文件重测，指标回升即确诊 |
| **冲突 Clash** | 窗口内指令互相矛盾，模型输出向"平均值"漂移 | 旧版规范残留在历史里，新 system 说用方案 B，历史里全是方案 A 的讨论 | 全文搜索矛盾指令；对比"干净重放"与"带历史重放"的输出差 |
| **混淆 Lost-in-the-middle** | 注意力呈 U 形：开头与结尾强，中部弱 | 关键约束写在第 30 个文件（窗口中部），模型视而不见 | 把关键内容移到首尾重测——位置敏感性实验 |
| **投毒 Poisoning** | 恶意/错误内容劫持后续行为 | 工具抓回的网页里有"忽略之前指令"的注入载荷 | 沙箱重放 + 输出审计（Week 6 完整展开） |

## 概率视角：为什么干扰是必然的

注意力机制计算每个 token 对其他 token 的关联权重。设窗口内有 n 个 token，关键指令的注意力份额近似被摊薄。这解释了一个实验事实：**长上下文下的"大海捞针"（needle in a haystack）检索准确率普遍高于真实任务表现**——因为捞针只需要"找到"，而真实任务需要"找到 + 排除干扰 + 综合推理"。拿捞针测试当质量证明，是评估设计里的经典陷阱。

## 上下文预算工程

ContextBudget 图解：

<Diagram type="contextwindow" />

预算分配三原则：

1. **给关键约束预留首尾位置**（对抗 lost-in-the-middle）；
2. **无关即删除**：窗口里每个 token 都在花两种钱（API 成本 + 注意力稀释），"可能有用"不构成上桌资格；
3. **超预算时的决策顺序**：先截断（丢最旧的工具输出）→ 再压缩（把历史总结成摘要）→ 最后外部化（关键事实写入文件/数据库，用时检索）。

## 错误诊断树

\`\`\`text
Agent 输出错
├─ 换到干净的最小上下文重放，仍然错？
│   └─ 是 → 模型能力不足（考虑换模型/拆任务）
│   └─ 否 → 工程错误，继续分诊 ↓
├─ 窗口里有没有互相矛盾的指令？（冲突）
├─ 关键约束是否在窗口中部？（位置问题）
├─ 有没有大段与任务无关的内容？（干扰）
└─ 外部工具结果是否可疑？（投毒）
\`\`\`

**这棵树是 Week 3"上下文工程"的总纲**：每一支都对应一种具体的上下文架构改造。

### 完整案例

场景：一个代码审查 Agent 在小仓库上表现良好，搬到大仓库后"总是忘记必须检查许可证头"这条规则。

1. **症状**：20 个文件的小项目，规则遵守率 100%；200 个文件的项目，遵守率约 40%；
2. **诊断**：按错误诊断树走——最小上下文重放正常（排除模型问题）；规则写在 system 中段（位置问题嫌疑）；窗口里塞了 8 万 token 的文件内容（干扰嫌疑）；
3. **修复**：三步——① 把"必须检查许可证头"移到 system 的**末尾**（对齐 U 形注意力的强区）；② 文件内容按与任务的相似度排序，只保留 top-10；③ 每个文件前加一行"文件用途摘要"代替全文（压缩）；
4. **验证**：修复后遵守率 40% → 96%。

**教训**：规则没变、模型没换，变的只是上下文架构——这类"免费的性能提升"藏在这门课最值钱的一章（Week 3）里。

### 代码实践

下面的演示在浏览器内模拟"干扰对检索准确率的影响"：构造一个可控的小型注意力模拟，观察干扰 token 数量增长时，关键信息命中率的衰减曲线。这是教学模拟（真实注意力要 GPU），但趋势与真实实验一致。

### 常见误区与安全风险

- **误区一："窗口够大就不用管上下文了。"** 四类失效模式随窗口内容增长而恶化，与窗口上限无关。窗口大小是"放得下"，上下文工程是"用得上"。
- **误区二："模型知道自己的知识截止日期。"** 模型无法可靠自知训练边界——过期知识表现为自信的错误。时效敏感内容必须外部注入。
- **误区三："评估用大海捞针就够了。"** 捞针测"找到"，真实任务考"排除干扰后综合"。两者相关但不等价，用捞针通过来论证生产可用是评估陷阱。
- **安全提示**：投毒模式的现实形态就是提示词注入。凡是从外部世界（网页、邮件、issue、第三方包的 README）进入窗口的内容，都按不可信数据处理。Week 6 的 Copilot RCE CVE 案例会展示这条链路的完整利用过程。

### 知识关联：承上启下

- 承上：l2 的注意力机制是四类失效的物理基础；l3 的"上下文是最高权重要素"在本节升级为可操作的架构方法；
- 启下：Week 2 的 Agent 循环每一轮都在做上下文决策（工具输出进不进窗口、留多长）；Week 3 的规范驱动开发是对"冲突"模式的根本解法（单一事实源）；Week 6 对"投毒"展开攻防。

### 动手实验

1. 运行下方"干扰衰减模拟器"，记录干扰数从 0 → 200 时关键信息命中率的变化；
2. 打开下方 contextwindow 交互图，把"对话轮数"拉到超预算区间，观察系统给出的三种策略提示，并说出你在自己项目里会先选哪种、为什么。

### 本节总结

1. 四类失效：干扰（无关稀释）、冲突（矛盾漂移，可致 39% 性能下降）、混淆（中部盲区）、投毒（恶意劫持）；
2. 塞得下 ≠ 用得上：窗口是会议桌，上下文工程决定谁上桌、坐哪、说多少；
3. 预算三原则：约束放首尾、无关即删除、超限按"截断→压缩→外部化"决策；
4. 先诊断后换模型：最小上下文重放是区分"模型错误"与"工程错误"的第一刀。

### 参考资料与延伸阅读

- 《How Long Contexts Fail》（官方 Week 3 指定阅读）——四失效模式与 39% 冲突数据：对应"核心概念"模块；
- Chroma《Context Rot》研究（2025）——干扰随 token 增长的实证：对应"概率视角"；
- Liu et al.《Lost in the Middle: How Language Models Use Long Contexts》（arXiv:2407.03158）——U 形注意力曲线：对应"混淆"模式与位置策略；
- Anthropic《Building effective agents》与 Claude Code 最佳实践（官方 Week 4 指定阅读）——上下文架构的工程版：对应"预算工程"；
- 本节失效模式表、诊断树、ContextBudget 图、干扰模拟器均为自主设计的原创教学内容。

### 本节习题导引

单选/fill 题校准四类模式的辨认；code 题让你实现一个"上下文预算分配器"；open 题给一个真实诊断场景，要求你走完整个错误诊断树。
`,
        tips: [
          { kind: 'pitfall', text: '换模型前先做"最小上下文重放"——把工程问题误诊为模型问题，是最贵的错误（多花数周与数十倍成本）。' },
          { kind: 'performance', text: '关键约束放 system 首尾两处各一遍，是对抗 lost-in-the-middle 零成本的手段。' },
          { kind: 'interview', text: '"长窗口模型是不是就不需要 RAG 了？"——用四失效模式回答：窗口解决放得下，RAG 解决上桌资格，两者正交。' },
        ],
        demos: [
          {
            title: '干扰衰减模拟器（教学模拟）',
            lang: 'python',
            code: `import random

def attention_hit_rate(n_distractor, trials=2000):
    # 教学模拟: 每个干扰 token 以固定概率分走注意力权重,
    # 关键 token 的有效注意力 ∝ 1/(1 + k*n_distractor)
    k = 0.004          # 干扰强度系数(教学用)
    hits = 0
    for _ in range(trials):
        strength = 1.0 / (1.0 + k * n_distractor)
        if random.random() < strength * 0.95:
            hits += 1
    return hits / trials

random.seed(7)
print("干扰数 -> 关键信息命中率")
for n in (0, 20, 80, 160, 240):
    print(f"{n:>4} -> {attention_hit_rate(n):.2%}")

# 观察点: 命中率随干扰单调衰减 —— 与 Context Rot 的实证趋势一致
# 真实模型的衰减更非线性, 但"无关内容必然稀释注意力"的方向相同`,
          },
        ],
      },

      /* ─────────────────────────── l5 ─────────────────────────── */
      {
        id: 'cs146s-w1-l5',
        title: '实验课：LLM Prompting Playground（官方作业同构）',
        difficulty: 3,
        content: `
### 学习目标

学完本节，你应该能够：
1. 设计一个完整的提示词实验：定义任务、固定测试集、选择指标、控制变量，写出实验协议（protocol）；
2. 实现一个无 API 依赖的评估器（evaluator），对模型输出做规则化打分并输出汇总报告；
3. 用数据回答一个具体的提示词问题（如"few-shot 对格式遵守率的提升有多大"），并指出实验结论的适用边界。

### 前置知识

- l3 的迭代工作法（本节是其完整工程化）；
- l4 的失效模式（实验设计要避免"单样本靠感觉"与"大海捞针陷阱"）；
- Python 函数与字典基础。

### 问题背景

官方 Week 1 的作业是 **LLM Prompting Playground**：构建一个可量化、可复现提示词效果的实验场。为什么第一周就做这个？因为它是整门课的元技能——Week 6 你要用同样的方法评估"AI 生成的测试套件抓到多少真 bug"，Week 9 你要用它评估"运维 Agent 的事件响应质量"。

没有实验框架的提示词调优长这样："我觉得这个版本好一点"——三个字里两个是错的。本节把"我觉得"变成"我测得"。

### 直觉理解

**把提示词实验想成药物临床试验。**

- 提示词版本 = 药物；
- 测试集 = 受试者队列（要有代表性、含疑难病例）；
- 指标 = 疗效指标（治愈率/格式遵守率）；
- 控制变量 + 固定随机种子 = 对照组设计；
- "样本量 1 就下结论" = "我二舅吃了说好"——笑话，但每天都在提示词调优里发生。

临床思维的核心是**先写协议再做实验**：任务、队列、指标、变量、判定规则全部先落纸面，防止"看到结果再编指标"（这是实验中最常见的自我欺骗）。

### 核心概念与原理详解

## 实验协议五件套

| 件 | 内容 | 反例 |
| --- | --- | --- |
| 任务定义 | 输入类型 + 期望产物 + 判定标准 | "让 AI 写好代码"（"好"无法判定） |
| 测试集 | 10-30 个固定输入，含边界样本；存成文件进 git | 每次随手想 3 个例子 |
| 指标 | 主指标 1 个（通过率）+ 辅指标（格式完整率/平均长度） | 只看"感觉输出质量" |
| 变量 | 每次只动一个（提示词/温度/模型三选一） | 同时换了提示词又换了模型 |
| 记录 | 每次运行记：版本号、参数、各指标、日期 | 结论写在聊天记录里第二天就找不到了 |

## 指标设计：能自动判就不人工判

| 指标 | 判定方式 | 适用 |
| --- | --- | --- |
| 格式遵守率 | 正则/JSON 解析 | 结构化输出任务 |
| 精确匹配 | 字符串相等 | 短答案抽取 |
| 关键要素覆盖 | 关键词/字段核对 | 摘要、审查清单 |
| 单元测试通过率 | 跑测试 | 代码生成任务（最硬的指标） |
| 人工评分 | 1-5 分 rubric | 仅用于自动指标测不了的维度 |

**指标三忌**：忌"综合感觉分"（不可复现）；忌指标与目标错位（想测正确性却只测了长度）；忌看结果后再挑指标（协议先行就是为了防这个）。

## 可复现性三件套

1. **temperature=0**（或固定值）+ 随机种子；
2. **固定测试集**（版本化，不改动——改了就是新实验）；
3. **记录模型版本号**（同 API 不同版本的模型行为会漂移——这是 Week 6"AI 输出回归"问题的种子）。

## 实验的适用边界（critical thinking 必答项）

每个实验结论都要回答：换模型版本还成立吗？换任务领域还成立吗？测试集是不是过拟合了提示词？（提示词在自家测试集上 100%，只说明"我们合作默契"，不代表通用能力。）本节的 code 习题会要求你在报告里强制输出"适用边界"一节。

### 完整案例

实验问题：**few-shot 示例对"工单抽取"格式遵守率的提升是多少？**

1. **协议**：任务=从工单文本抽取 JSON {date, amount, category}；测试集=15 条（12 常规 + 3 边界：无日期/含两个金额/类别口语化）；主指标=格式遵守率（JSON 可解析 + 三字段齐全）；变量=有无 2 个 few-shot 示例；温度=0。
2. **模拟运行**（本节 demo 里有完整可运行代码）：无示例 73% → 有示例 93%；
3. **分析**：提升主要来自"边界样本"（无示例时 3 条边界全挂；有示例时挂 1 条）——few-shot 的价值集中在边界的示范，不在常规样本；
4. **适用边界**：结论在"本测试集 + 本模型版本"内成立；few-shot 示例需要随工单形态演化维护（l3 的"示例审计"）。

注意第 3 步：**分组分析比总分更有洞察**——总分告诉你"有没有效"，分组告诉你"为什么有效"。

### 代码实践

演示是一个完整可运行的最小实验框架：内置模拟模型（确定性伪随机）、评估器、分组汇总。你将在此框架上完成本节 code 习题。

### 常见误区与安全风险

- **误区一：样本量 1 下结论。** 温度>0 时单次输出只是采样的一次抽签。至少 5 次/样本点，报告均值与波动。
- **误区二：测试集与提示词共同演化。** 每修一个 case 就把该 case 加进测试集并只对它优化——测试集失去代表性，变成"应试教育"。正确做法：修完重跑**全量**，看有没有退步（这正是 Week 7"AI 输出回归"的预演）。
- **误区三：把 Playground 结论当普适定律。** 所有结论带适用边界；跨任务/跨模型迁移前要重测。
- **安全提示**：实验数据里可能包含真实工单/代码（敏感数据）。实验资产进 git 前**先脱敏**——Playground 本身就该有脱敏步骤，这周就养成习惯。

### 知识关联：承上启下

- 承上：l3 给了方法（迭代工作法），l4 给了陷阱（评估误区），本节收拢为可执行的工程框架；
- 启下：Week 2 的 MCP 工具调用会需要一个"工具输出正确性"的评估器（本框架直接复用）；Week 6 的"AI 生成测试套件评估"与 Week 7 的"审查质量评估"是本框架的两个升级版；项目 D 的验收流水线里，本节的 evaluator 是第一块积木。

### 动手实验

1. 运行下方最小实验框架，然后完成两件事：① 把 few-shot 示例数从 2 改成 0/1/2，绘制格式遵守率曲线；② 在报告里写出该结论的适用边界（不少于 2 条）；
2. 把这个框架的思路套用到你自己的一个真实提示词上：写协议（五件套）、攒 10 条测试集、跑一轮、写结论。

### 本节总结

1. 提示词实验 = 临床试验思维：协议先行、队列固定、指标自动、变量唯一；
2. 指标三忌：感觉分、指标错位、事后挑指标；
3. 可复现三件套：固定温度/种子、固定测试集、记录模型版本；
4. 分组分析找"为什么"，适用边界防"过度迁移"；
5. 这个框架是全课程的元技能——后续每一周的评估都是它的变体。

### 参考资料与延伸阅读

- 官方作业仓库 week1（LLM Prompting Playground 的 assignment.md 与 writeup.md）——本节实验协议与作业要求同构，具体作业实现请以官方仓库为准；
- Google《Prompt Engineering Overview》——官方推荐的参数与评估基线：对应"可复现三件套"；
- l3/l4 的官方指定阅读在本实验中作为被检验的对象（few-shot 假设、上下文位置假设）；
- 本节实验协议表、模拟框架、完整案例均为自主设计的原创教学内容。

### 本节习题导引

fill 题检查协议五件套；code 题要求你补全实验框架的核心函数（评测器 + 分组汇总）；open 题给你一份"问题实验报告"，要求你按本节标准做审计并给出修正。
`,
        tips: [
          { kind: 'pitfall', text: '每修一个 case 就只对它优化 = 测试集变成应试教育。修完必须重跑全量看回归。' },
          { kind: 'performance', text: '评估器先写"格式判分"再写"内容判分"——格式坏了内容分毫无意义，早失败（fail fast）省一半调试时间。' },
          { kind: 'note', text: '把协议存成 protocol.md 与测试集一起进 git：三个月后回看实验，唯一可信的就是这份文件。' },
        ],
        demos: [
          {
            title: '最小提示词实验框架（模拟模型 + 评估器）',
            lang: 'python',
            code: `import json, random, re

# ── 1. 模拟模型: 确定性伪随机, 模拟"有无 few-shot"的行为差异 ──
def fake_model(ticket: str, few_shot: bool, seed: int) -> str:
    rng = random.Random((hash(ticket) & 0xFFFF) ^ (seed * 31) ^ (not few_shot))
    fields = {}
    m = re.search(r"20\\d\\d-\\d\\d-\\d\\d", ticket)
    fields["date"] = m.group(0) if m and (few_shot or rng.random() < 0.85) else None
    m2 = re.search(r"(\\d+(?:\\.\\d+)?)\\s*元", ticket)
    fields["amount"] = m2.group(1) if m2 and (few_shot or rng.random() < 0.7) else None
    fields["category"] = "refund" if ("退" in ticket or "换" in ticket) else "other"
    if fields["date"] is None or fields["amount"] is None:
        if rng.random() < (0.15 if few_shot else 0.45):
            return "抱歉, 我无法解析这张工单。"      # 非格式化输出
    return json.dumps(fields, ensure_ascii=False)

# ── 2. 评估器: 格式优先, fail fast ──
def evaluate(output: str) -> bool:
    try:
        data = json.loads(output)
    except (json.JSONDecodeError, ValueError):
        return False
    return all(k in data and data[k] is not None for k in ("date", "amount", "category"))

# ── 3. 固定测试集(12 常规 + 3 边界) ──
TESTSET = [
    "10月3日退款 199元", "2026-09-12 申请退 88.5元", "换货订单 45元 9月1日",
    "9.30 付了 1200元 想退货", "2026-08-08 支付 66元", "退款 33元 于 2026-10-01",
    "8月15日 250 元商品有瑕疵要换", "2026-07-19 买贵了退差价 20元", "10月10日 99元 重复扣款",
    "2026-06-30 会员费 199 元申请退款", "9月9日 9.9元 误购", "2026-10-23 退货 599元",
    "我想退掉上周那个东西", "付了两笔钱 好像都挺贵", "客服你好 说一下发货",
]

def run_experiment(seed: int = 42):
    for label, fs in (("zero-shot", False), ("few-shot", True)):
        ok = sum(evaluate(fake_model(t, fs, seed)) for t in TESTSET)
        print(f"{label:<9} 格式遵守率: {ok}/{len(TESTSET)} = {ok/len(TESTSET):.0%}")

run_experiment()
run_experiment(seed=7)   # 换种子验证稳定性

# 观察点: few-shot 提升主要来自边界样本; 换种子结论方向不变才可信`,
          },
        ],
      },
    ],
    exercises: [
      /* ───────── l4 习题（8 题）───────── */
      {
        id: 'cs146s-w1-l4-e1', type: 'multiple', difficulty: 2, relatedLessonId: 'cs146s-w1-l4', tags: ['K', 'context'],
        question: '四类长上下文失效模式包括下列哪些？',
        options: [
          { value: 'a', text: '干扰（无关内容稀释关键信息）' },
          { value: 'b', text: '冲突（窗口内指令矛盾导致输出漂移）' },
          { value: 'c', text: '混淆（窗口中部内容被忽视）' },
          { value: 'd', text: '缓存击穿（KV Cache 未命中）' },
        ],
        answer: ['a', 'b', 'c'],
        explanation: '第四类是投毒（poisoning，恶意内容劫持）。缓存击穿是性能问题不是失效模式——这是本节最典型的混淆项。',
      },
      {
        id: 'cs146s-w1-l4-e2', type: 'single', difficulty: 2, relatedLessonId: 'cs146s-w1-l4', tags: ['U', 'context'],
        question: '官方阅读提到上下文冲突最坏可导致约 39% 的性能下降。它的机制是？',
        options: [
          { value: 'a', text: '模型检测到矛盾后拒绝回答' },
          { value: 'b', text: '窗口内指令互相矛盾，模型输出向矛盾双方"平均"漂移，且不会主动抗议' },
          { value: 'c', text: 'token 超限后系统截断了前半段' },
          { value: 'd', text: '温度过高导致输出随机化' },
        ],
        answer: 'b',
        explanation: '冲突的可怕之处在于"静默"：不报错、不抗议，只是默默变平庸。这也是为什么冲突要靠"全文搜索矛盾指令"主动检测。',
      },
      {
        id: 'cs146s-w1-l4-e3', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-w1-l4', tags: ['K', 'context'],
        question: '注意力呈 U 形分布：窗口______与______的内容被关注最强，______部容易被忽视（lost in the middle）。',
        blanks: [['开头', '首部', '起始'], ['结尾', '末尾', '尾部'], ['中', '中间', '中部']],
        explanation: '对策：关键约束放 system 首尾两处各一遍；重要文件放窗口头尾，摘要类内容放中间。',
      },
      {
        id: 'cs146s-w1-l4-e4', type: 'single', difficulty: 3, relatedLessonId: 'cs146s-w1-l4', tags: ['U', 'diagnosis'],
        question: 'Agent 在大仓库上总是违反"必须跑测试"规则。你做了最小上下文重放，模型遵守良好。下一步最该检查的是？',
        options: [
          { value: 'a', text: '立即换更强的模型' },
          { value: 'b', text: '检查大仓库会话里该规则是否与其他指令冲突、是否位于窗口中部、是否被无关内容淹没' },
          { value: 'c', text: '把 temperature 调到 0' },
          { value: 'd', text: '把规则重复 20 遍' },
        ],
        answer: 'b',
        explanation: '最小重放正常 = 工程错误而非模型错误，按诊断树依次查冲突→位置→干扰。d 的"重复 20 遍"会加剧 token 占用与干扰，可能让情况更糟。',
      },
      {
        id: 'cs146s-w1-l4-e5', type: 'code', difficulty: 3, relatedLessonId: 'cs146s-w1-l4', tags: ['D', 'context'],
        question: '实现 `budget_context(items: list[dict], budget: int)`：每个 item 有 {name, tokens, priority}（priority 小者更重要），要求：优先装入高优先级（priority 升序）item；超出 budget 时跳过并记录到 dropped；返回 (装入列表, dropped 列表)。装入顺序必须保持 priority 升序（模拟"重要内容放前面"）。',
        lang: 'python',
        starterCode: `def budget_context(items, budget):
    # items: [{"name": str, "tokens": int, "priority": int}, ...]
    # 返回 (packed, dropped): packed 按 priority 升序, 累计 token 不超 budget
    pass

items = [
    {"name": "system", "tokens": 800, "priority": 1},
    {"name": "tools", "tokens": 1500, "priority": 2},
    {"name": "file_a", "tokens": 3000, "priority": 5},
    {"name": "file_b", "tokens": 9000, "priority": 9},
]
packed, dropped = budget_context(items, 6000)
print([p["name"] for p in packed], [d["name"] for d in dropped])`,
        expectedOutput: "['system', 'tools', 'file_a'] ['file_b']",
        tests: `items = [
    {"name": "system", "tokens": 800, "priority": 1},
    {"name": "tools", "tokens": 1500, "priority": 2},
    {"name": "file_a", "tokens": 3000, "priority": 5},
    {"name": "file_b", "tokens": 9000, "priority": 9},
]
packed, dropped = budget_context(items, 6000)
assert [p["name"] for p in packed] == ["system", "tools", "file_a"]
assert [d["name"] for d in dropped] == ["file_b"]
assert sum(p["tokens"] for p in packed) <= 6000
p2, d2 = budget_context(items, 10**9)
assert len(d2) == 0 and len(p2) == 4, "预算充足时全部装入"
p3, d3 = budget_context([], 100)
assert p3 == [] and d3 == [], "空输入"
p4, d4 = budget_context([{"name": "x", "tokens": 500, "priority": 1}], 100)
assert [p["name"] for p in p4] == [] and [d["name"] for d in d4] == ["x"], "单项超预算"`,
        allowedModules: [],
        explanation: '排序后贪心装填即可。注意"跳过并继续尝试更小的"与"跳过后终止"两种贪心的差别——本实现按"跳过超支项、继续看后面更小的项"处理（题目期望如此），这也是压缩策略"先丢大的"的雏形。',
        answer: `def budget_context(items, budget):
    packed, dropped = [], []
    used = 0
    for it in sorted(items, key=lambda x: x["priority"]):
        if used + it["tokens"] <= budget:
            packed.append(it)
            used += it["tokens"]
        else:
            dropped.append(it)
    return packed, dropped`,
      },
      {
        id: 'cs146s-w1-l4-e6', type: 'judge', difficulty: 3, relatedLessonId: 'cs146s-w1-l4', tags: ['U', 'eval'],
        question: '"大海捞针"测试通过率 99%，说明该模型在真实长上下文任务上也有 99% 的可靠度。',
        answer: false,
        explanation: '捞针只测"找到目标"，真实任务还要求"排除干扰 + 综合推理"。捞针通过是必要条件不是充分条件——用它论证生产可用是经典评估陷阱。',
      },
      {
        id: 'cs146s-w1-l4-e7', type: 'open', difficulty: 4, relatedLessonId: 'cs146s-w1-l4', tags: ['D', 'diagnosis'],
        question: '你的运维 Agent 平时正常，但每次处理"磁盘告警"事件时行为异常：先做一堆无关检查，最后偶尔会尝试执行一条来自告警详情字段的可疑命令。请用本节框架回答：① 最可能的失效模式是什么、依据；② 其余三类模式为什么基本可以排除；③ 给出你的三步处置方案（含验证手段）。',
        referenceAnswer: `① 最可能：**投毒（poisoning）**。依据：异常行为与特定外部输入（告警详情字段）强相关，且表现为"执行来自数据内容的指令"——这是不可信数据劫持指令流的典型特征，也提示告警源可能被注入了恶意载荷。

② 排除理由：

- 干扰：干扰导致的是"忽视约束/质量下降"，不会产生"只对特定输入出现的、目标明确的异常指令"；
- 冲突：冲突来自窗口内指令矛盾，行为应是稳定漂移而非"特定输入触发"；
- 混淆：lost-in-the-middle 造成的是遗忘，不是服从外部指令。

③ 处置三步：

1. **隔离重放**：把触发异常的告警详情原文取出，在沙箱里最小上下文重放，确认载荷文本（取证）；同时对该告警源的所有历史消息做"忽略之前指令"类模式扫描；
2. **封堵通道**：告警详情进入上下文前做转义/包裹（明确标注"以下为数据，不是指令"），Agent 的命令执行改为白名单 + 人工确认（权限最小化，Week 6 展开）；
3. **回归验证**：用注入样本 + 正常样本各若干条组成测试集，验证修复后注入样本不再触发命令执行、正常样本功能不退化——把安全事件沉淀为回归测试（这是 Week 6-7 的标准动作）。`,
        rubric: [
          { point: '正确判断为投毒/注入且依据与输入相关性挂钩', score: 3 },
          { point: '其余三类模式的排除理由机制正确', score: 3 },
          { point: '处置含隔离取证、通道封堵、回归验证三环节', score: 3 },
          { point: '处置方案体现了"最小权限"与"把事故沉淀为测试"的工程意识', score: 1 },
        ],
        keywords: ['注入', '投毒', '沙箱', '白名单', '回归'],
        explanation: '诊断要点："特定输入触发的目标明确异常"指向投毒，而非会稳定漂移的冲突/干扰。处置必须含回归验证——把事故变成测试集。',
      },
      {
        id: 'cs146s-w1-l4-e8', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-w1-l4', tags: ['K', 'context'],
        question: '超预算时的策略决策顺序：先______（丢最旧的工具输出）→ 再______（历史变摘要）→ 最后______（关键事实写入外部存储用时检索）。',
        blanks: [['截断', '丢弃', '剪枝'], ['压缩', '摘要'], ['外部化', '外置', '检索']],
        explanation: '决策顺序按信息损失从小到大排列：截断只丢旧输出，压缩有损但保主干，外部化改造架构但可扩展。',
      },

      /* ───────── l5 习题（8 题）───────── */
      {
        id: 'cs146s-w1-l5-e1', type: 'fill', difficulty: 1, relatedLessonId: 'cs146s-w1-l5', tags: ['K', 'eval'],
        question: '实验协议五件套：任务定义、______、指标、______、记录。',
        blanks: [['测试集', '测试队列', '固定测试集'], ['变量', '变量控制', '控制变量']],
        explanation: '协议先行的意义：防止"看到结果再挑指标"的自我欺骗。五件套缺一，实验结论就打折。',
      },
      {
        id: 'cs146s-w1-l5-e2', type: 'single', difficulty: 2, relatedLessonId: 'cs146s-w1-l5', tags: ['U', 'eval'],
        question: '任务是"从文本抽取 JSON 字段供程序使用"。下列主指标选择最合理的是？',
        options: [
          { value: 'a', text: '输出长度是否超过 100 字' },
          { value: 'b', text: 'JSON 可解析 + 必需字段齐全率' },
          { value: 'c', text: '输出的"感觉专业度"人工评分' },
          { value: 'd', text: '响应延迟的毫秒数' },
        ],
        answer: 'b',
        explanation: '指标与目标对齐：下游是程序 → 硬指标是可解析与字段完整。a/d 是无关维度，c 不可复现且测不出机器可读性。',
      },
      {
        id: 'cs146s-w1-l5-e3', type: 'judge', difficulty: 2, relatedLessonId: 'cs146s-w1-l5', tags: ['U', 'eval'],
        question: '为了快速验证想法，可以每次只测 1 个样本，因为单样本结果也能反映提示词好坏。',
        answer: false,
        explanation: '温度>0 时单次输出是采样的一次抽签；即使温度 0，单样本也无法覆盖边界情况。最低 5-30 个固定样本（含边界），看通过率而非个例。',
      },
      {
        id: 'cs146s-w1-l5-e4', type: 'multiple', difficulty: 3, relatedLessonId: 'cs146s-w1-l5', tags: ['U', 'eval'],
        question: '可复现性三件套包括？',
        options: [
          { value: 'a', text: '固定 temperature（常用 0）与随机种子' },
          { value: 'b', text: '测试集版本化且中途不修改' },
          { value: 'c', text: '记录实验时使用的模型版本号' },
          { value: 'd', text: '每次实验换一批新样本防止过拟合' },
        ],
        answer: ['a', 'b', 'c'],
        explanation: 'd 看似高级实则错误：实验内部换样本 = 变量失控。防过拟合的手段是"适用边界声明 + 定期用全新保留集复验"，不是实验中途换队列。',
      },
      {
        id: 'cs146s-w1-l5-e5', type: 'code', difficulty: 4, relatedLessonId: 'cs146s-w1-l5', tags: ['D', 'eval'],
        question: '补全实验框架的三个函数：`parse_json(output)`（失败返回 None）；`evaluate(output, required)`（返回 (格式合规 bool, 缺失字段数)）；`ab_report(results_a: list[bool], results_b: list[bool])`（返回两组通过率与差值，保留两位小数）。',
        lang: 'python',
        starterCode: `import json

def parse_json(output):
    # 合法 JSON -> dict; 失败 -> None
    pass

def evaluate(output, required):
    # 返回 (格式合规, 缺失字段数); 非 dict 输出视为格式不合规、全缺失
    pass

def ab_report(results_a, results_b):
    # 输入为布尔列表, 返回 (rate_a, rate_b, delta) 全部两位小数
    pass

print(evaluate('{"date": "2026-01-01"}', ["date", "amount"]))
print(ab_report([1,1,0,1,0,1], [1,1,1,1,1,0]))`,
        expectedOutput: '(False, 1)\n(0.67, 0.83, 0.17)',
        tests: `assert parse_json('{"a": 1}') == {"a": 1}
assert parse_json("not json") is None
assert evaluate('{"date": "x", "amount": 5}', ["date", "amount"]) == (True, 0)
assert evaluate('{"date": "x"}', ["date", "amount"]) == (False, 1)
assert evaluate("普通文本", ["a", "b"]) == (False, 2)
r = ab_report([1,1,0,1,0,1], [1,1,1,1,1,0])
assert r == (0.67, 0.83, 0.17), f"got {r}"
assert ab_report([], []) == (0.0, 0.0, 0.0), "空列表边界"`,
        allowedModules: ['json'],
        explanation: '三个函数覆盖了评估器的三层：解析层（宽容失败）、判分层（格式与内容分开）、汇总层（率与差值）。空列表返回 (0.0,0.0,0.0) 而不是报错——评估器必须对自己的输入负责。',
        answer: `import json

def parse_json(output):
    try:
        return json.loads(output)
    except (json.JSONDecodeError, ValueError):
        return None

def evaluate(output, required):
    data = parse_json(output)
    if not isinstance(data, dict):
        return (False, len(required))
    missing = sum(1 for k in required if k not in data or data[k] is None)
    return (missing == 0, missing)

def ab_report(results_a, results_b):
    raw_a = sum(results_a) / len(results_a) if results_a else 0.0
    raw_b = sum(results_b) / len(results_b) if results_b else 0.0
    return (round(raw_a, 2), round(raw_b, 2), round(raw_b - raw_a, 2))`,
      },
      {
        id: 'cs146s-w1-l5-e6', type: 'single', difficulty: 4, relatedLessonId: 'cs146s-w1-l5', tags: ['U', 'eval'],
        question: '实验发现：提示词 V2 在测试集 A 上通过率 100%，V1 只有 60%。团队据此全量上线 V2。三周后线上问题频发。最可能的根因是？',
        options: [
          { value: 'a', text: '模型版本在两周内被供应商更新了' },
          { value: 'b', text: 'V2 是在测试集 A 的历史失败样本上迭代出来的——测试集与提示词共同演化，A 已失去代表性（过拟合）' },
          { value: 'c', text: 'temperature 忘了固定' },
          { value: 'd', text: '测试集 A 太大导致过拟合' },
        ],
        answer: 'b',
        explanation: '"修哪个 case 只对哪个 case 优化"会让测试集逐步变成提示词的共谋。防线：失败样本进集后重跑全量看回归 + 保留一个从不参与调优的"封存集"定期复验。a 是真实存在的风险（模型漂移）但题干三周内问题频发更指向 b。',
      },
      {
        id: 'cs146s-w1-l5-e7', type: 'open', difficulty: 4, relatedLessonId: 'cs146s-w1-l5', tags: ['D', 'eval'],
        question: '下面是一份问题实验报告："我们测了新提示词，感觉好多了。试了 3 个例子，2 个更好 1 个差不多，温度用的是默认值，模型是网上找的某个版本。结论：新提示词有效，已上线。"请按本节标准审计：至少指出 4 处违反点（对应协议五件套与可复现三件套），并给这份报告重写一个合规版本（只写协议与记录部分）。',
        referenceAnswer: `审计（违反点）：

| # | 违反点 | 对应条款 |
| --- | --- | --- |
| 1 | "感觉好多了" —— 无客观指标 | 指标：必须可自动判定 |
| 2 | 只试 3 个例子且是临时想的 —— 队列不固定、无边界样本、样本量不足 | 测试集：10-30 条固定 + 边界 |
| 3 | 1 个"差不多"就下结论 —— 无通过率与波动度量 | 指标：报告率，不是个例印象 |
| 4 | "温度默认值" —— 未固定，不可复现 | 可复现三件套之温度 |
| 5 | "网上找的某个版本" —— 模型版本未知，结论不可追溯 | 可复现三件套之版本号 |
| 6 | "已上线" 但无变量控制记录 —— 若同时改了其他东西（模型/参数），因果不明 | 变量：单次只动一个 |

合规重写：

> **协议**：任务=从退款工单抽取 {date, amount, category}；测试集=15 条固定样本（12 常规+3 边界，文件 testset_v1.json，已脱敏入库）；主指标=JSON 可解析且三字段齐全的比率；变量=提示词 V1→V2（仅此一项，temperature=0，模型=gpt-4.1-2025-04-14，种子=42）；记录=results.csv 记录每次运行的版本/参数/通过率/日期。
> **记录（示例行）**：2026-10-24 | V1 | 11/15=73% | V2 | 14/15=93% | 提升来自边界样本 2/3 → 3/3。
> **适用边界**：本测试集+该模型版本内成立；上线后保留封存集 20 条，每周复验防漂移。`,
        rubric: [
          { point: '指出至少 4 处违反点且每处能对应到协议/可复现条款', score: 4 },
          { point: '重写版本五件套齐全（任务/测试集/指标/变量/记录）', score: 3 },
          { point: '重写版本含可复现三件套（温度种子/固定集/模型版本）', score: 2 },
          { point: '有适用边界或封存集意识', score: 1 },
        ],
        keywords: ['指标', '测试集', '温度', '版本', '变量'],
        explanation: '审计类练习的检查法：拿着协议五件套与可复现三件套逐项打勾，缺一项就列为一个违反点——检查表思维比自由发挥可靠。',
      },
      {
        id: 'cs146s-w1-l5-e8', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-w1-l5', tags: ['K', 'eval'],
        question: '评估器的设计顺序：先写______判分（格式坏了直接判负），再写______判分——fail fast 能省一半调试时间。',
        blanks: [['格式', '结构'], ['内容', '语义']],
        explanation: '与代码评审的顺序一致：先看能不能跑（格式），再看对不对（内容）。格式层的失败信息也最容易被自动修复（如重试一次带格式提醒）。',
      },
    ],
  },
];
