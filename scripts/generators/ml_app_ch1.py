# -*- coding: utf-8 -*-
"""
Chapter 1: 提示词工程与结构化输出 (Prompt Engineering & Structured Outputs)
Course: ml-llm-applications
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_1():
    # ── Lesson 1.1 ──
    l1_text = """### 学习目标
学完本节，你应该能够：
1. 掌握上下文学习（In-Context Learning, ICL）的运行机制与隐式梯度更新假说；
2. 掌握从 Zero-shot（零样本）、Few-shot（少样本）到思维链（Chain-of-Thought, CoT）的提示词范式演进；
3. 理解 CoT 如何通过将复杂的单步映射分解为离散的多步逻辑推理路径，显著突破模型计算瓶颈；
4. 掌握自我一致性（Self-Consistency）多数表决机制与纯 Python 投票算法实现；
5. 掌握系统提示词（System Prompt）、角色设定与结构化防越狱防御设计。

### 前置知识
- 语言模型自回归生成概率；
- 贪心搜索与采样策略（Temperature, Top-p）。

### 问题背景与 ML 用途
在传统机器学习中，要让模型学会一个新任务，必须准备标注数据集并执行反向传播更新模型参数。
- **大模型时代的提示工程革命**：GPT-3 的横空出世证明了：**无需调整神经网络的任何一个参数权重，仅通过设计输入给模型的文本提示（Prompt），模型就能展现出前所未有的任务泛化能力**；
- 提示词工程绝非简单的“写作文小窍门”，而是一门基于认知逻辑、注意力流控制与自回归概率引导的严格技术；
- 当面对复杂数学推理、多步逻辑推演与符号规划任务时，直接要求模型给出答案往往导致严重的“快思考（System 1）”幻觉；通过 **思维链（CoT）** 和 **自我一致性采样（Self-Consistency）**，可以诱导模型进入深思熟虑的“慢思考（System 2）”模式，使推理准确率成倍跃升。

### 直觉理解
- **打草稿与心算（CoT 的直觉）**：
  - 想象让你心算一个复杂的数学题：“一个农场有 35 头动物，有鸡也有兔，共有 94 只脚，求鸡兔各几只？”
  - 如果监考老师强迫你在听到题目后的 0.1 秒内直接报出答案（标准 Zero-shot），你的大脑大概率只能凭感觉乱猜一个数字；
  - 但如果老师给你一张草稿纸，允许你一步一步写下推演：“假设全是鸡，应该有 $35 \\times 2 = 70$ 只脚；少了 $94 - 70 = 24$ 只脚；每把一只鸡换成兔增加 2 只脚，所以兔子有 $24 / 2 = 12$ 只；鸡有 $35 - 12 = 23$ 只”（CoT 过程）。
  - **大模型也是如此**：每生成一个思考步骤的 Token，这个 Token 就变成了后续自回归生成的注意力上文，从而为最终结论提供了充足的计算中间状态（Computation Workspace）！

### 核心概念与符号对照表
| 提示词范式 | 形式特征 | 额外计算开销 | 核心作用与适用场景 |
| --- | --- | --- | --- |
| **Zero-shot** | 仅给出任务说明与待测输入 | 无额外 Token | 简单翻译、分类、常识问答 |
| **Few-shot (ICL)** | 提供若干个格式对齐的输入-输出正例 | 消耗输入 Token 窗口 | 规范输出格式、诱发小众或专业领域表达 |
| **Zero-shot-CoT** | 添加启发引导词：`"Let's think step by step"` | 增加推理思维链 Token | 零门槛激发多步算术与因果逻辑推导 |
| **Few-shot-CoT** | 示例中显式包含人工编写的中间推导步骤 | 消耗上下文长度 | 高难度数学竞赛题、多跳逻辑证明 |
| **Self-Consistency** | 在高温下并行采样 $M$ 条推理链并投票 | 计算量放大 $M$ 倍 | 消除单条 CoT 偶然随机计算失误 |

### 数学原理与逐步推导
#### 1. 上下文学习（ICL）与贝叶斯推断
设预训练语言模型参数为 $\\theta$。在少样本学习中，输入包含 $k$ 个示例对 $(x_1, y_1), \\dots, (x_k, y_k)$ 以及待测输入 $x_{k+1}$。
模型预测下一个目标标签 $y_{k+1}$ 的条件概率为：
$$P(y_{k+1} \\mid x_{k+1}, \\mathcal{D}_{\\text{context}}) = \\int P(y_{k+1} \\mid x_{k+1}, T) P(T \\mid \\mathcal{D}_{\\text{context}}) dT$$
其中 $T$ 代表潜变量任务概念（Latent Concept）。ICL 并不更新参数 $\\theta$，而是**利用前序示例在多层自注意力机制中隐式完成任务概念的贝叶斯后验收敛**。

#### 2. 自我一致性（Self-Consistency）数学公式
设针对同一个复杂推理问题 $Q$，设置采样温度 $T > 0$ 并行采样生成 $M$ 条包含完整思维链的候选路径：
$$\\{(C_1, A_1), (C_2, A_2), \\dots, (C_M, A_M)\\}$$
其中 $C_m$ 为第 $m$ 条思维推导链，$A_m$ 为该链条最终得出的答案。
通过边际化消除中间推导路径 $C$，在最终答案空间 $\\mathcal{A}$ 上进行多数多数投票（Majority Voting）：
$$A^* = \\arg\\max_{a \\in \\mathcal{A}} \\sum_{m=1}^M \\mathbb{I}(A_m = a)$$
由于大模型在逻辑推导中的正确路径往往在语义上高度收敛，而错误计算往往在长尾方向上随机离散，多数表决能有效消除单次采样的计算疏漏。

### 常见认知误区与避坑指南
1. **误以为 CoT 在任何任务上都能提升表现**：在简单的记忆性问答（如“李白的出生年份是什么？”）或纯代码格式转换中，强加 CoT 不仅毫无必要，还会徒增 Token 消耗与延迟，甚至在长篇大论中引入新的幻觉。CoT 专为**多步逻辑、数学推理和符号规划**任务而生。
2. **以为 Few-shot 示例的顺序完全无所谓**：Lu 等人（2021）的实证研究表明，大模型对 Few-shot 示例的呈现顺序极其敏感（Prompt Order Sensitivity），仅仅调整 3 个示例的前后排列次序，分类准确率在某些模型上甚至会出现从 50% 到 90% 的剧烈波动！通常应将最相关、最核心的示例放置在靠近末尾的位置（利用近因效应 Recency Bias）。

### 工业级工程实践
- **XML 标签隔离法（System Prompt Architecture）**：在设计工业级 Prompt 时，强烈推荐使用 `<system>`, `<context>`, `<rules>`, `<user_input>` 等伪 XML 标签将不同语义块明确隔离。这样不仅能极大提升模型对指令的遵循度，还能有效防御**提示词注入攻击（Prompt Injection）**。
- **动态 Few-shot 检索召回（Dynamic RAG for Few-shot）**：在面对拥有上万个细分类别的企业级任务时，绝不能在 Prompt 里硬塞所有类别的示例。应当把成千上万个高质量历史案例存入向量库，在用户输入时动态检索最相似的 3~5 个示例拼装进 Prompt 中，实现自适应上下文学习。

### 拓展阅读与学术文献
1. **Wei et al. (2022)**: *Chain-of-Thought Prompting Elicits Reasoning in Large Language Models* (NeurIPS 2022) — 思维链开山之作。
2. **Wang et al. (2022)**: *Self-Consistency Improves Chain of Thought Reasoning in Language Models* (ICLR 2023)。
3. **Kojima et al. (2022)**: *Large Language Models are Zero-Shot Reasoners* — 发现 "Let's think step by step" 零样本思维链。"""

    l1_code = """from collections import Counter
import re

def self_consistency_voting(sample_outputs):
    \"\"\"
    从模型采样的多条思维链输出中提取最终答案并执行多数多数投票
    \"\"\"
    extracted_answers = []
    
    for text in sample_outputs:
        # 正则提取形如 '答案是: 12' 或 'The answer is 12' 的数值结论
        match = re.search(r'(?:答案是|The answer is|####)\s*[:：]?\s*([0-9]+(?:\.[0-9]+)?)', text, re.I)
        if match:
            extracted_answers.append(match.group(1))
        else:
            extracted_answers.append(None)
            
    # 统计有效答案
    valid_answers = [a for a in extracted_answers if a is not None]
    if not valid_answers:
        return None, 0.0
        
    counts = Counter(valid_answers)
    most_common_answer, highest_count = counts.most_common(1)[0]
    confidence = highest_count / len(sample_outputs)
    
    return most_common_answer, confidence

# 模拟大模型在 temperature=0.7 采样 5 次鸡兔同笼题的输出
mock_llm_samples = [
    "首先设鸡有x只，兔有y只。x+y=35, 2x+4y=94。解得 y=12, x=23。答案是: 12",
    "假设全是鸡，有70只脚。少了24只，每只兔差2只脚，24/2=12。答案是: 12",
    "根据方程推算，兔子的数量应该等于 94/4 = 23.5，大约是 14。答案是: 14", # 错误推理路径
    "兔子的脚是4，鸡的脚是2。容易算得兔子有12只。The answer is: 12",
    "设全是兔子则有140只脚，多了46只脚，46/2=23只鸡，兔子为35-23=12。答案是: 12"
]

final_ans, conf = self_consistency_voting(mock_llm_samples)
print(f"自我一致性多数投票最终胜出答案: {final_ans}")
print(f"置信度 (得票率): {conf * 100:.1f}%")

assert final_ans == "12"
assert conf == 0.8
print("测试通过：自我一致性多数投票逻辑完全正确！")"""

    l1_tips = [
        tip("对于多步数学与逻辑任务，优先采用思维链（CoT）与自我一致性采样（Self-Consistency），能大幅度降低快思考幻觉。", "note"),
    ]

    # ── Lesson 1.2 ──
    l2_text = """### 学习目标
学完本节，你应该能够：
1. 掌握为什么让大语言模型输出非受限自由文本是工业级系统集成的脆弱瓶颈；
2. 掌握使用 JSON Schema 与 Pydantic 对大模型输出进行确定性类型强约束的基本原理；
3. **深入掌握受限生成解码（Constrained Decoding）底层机制**：基于上下文无关文法（CFG）与前缀状态机在解码时动态构建 Token 掩码；
4. 理解受限生成如何实现 100% 格式合规且零额外重试开销；
5. 编写纯 Python 代码模拟受限解码中的 Token 状态机屏蔽算法。

### 前置知识
- 编译原理基础：有限状态自动机（FSM）与上下文无关文法（CFG）；
- 语言模型自回归生成：Logits 与软概率。

### 问题背景与 ML 用途
在企业级软件系统或后端微服务中，大语言模型通常只是整个调用链路中的一个环节。下游业务代码（如数据库 SQL 执行、支付接口、CRM 系统）需要的是**严格结构化的强类型数据（如合法的 JSON 字典、Pydantic 对象）**，而不是飘忽不定的自然语言散文。
- **传统方式的脆弱崩溃**：在 Prompt 里苦苦哀求模型“请严格输出合法的 JSON，不要输出任何开场白和多余标记”，但模型依然可能冷不防地输出：`"好的，这是为您生成的 JSON:\n```json\n{..."`，导致下游 `json.loads()` 直接崩溃报错；
- **更致命的隐蔽错误**：字段类型错位（将整型输出为字符串）、漏掉必填键（Key Missing）、括号未闭合等；
- **受限生成（Constrained Decoding）是现代 LLM 系统的终极护城河**：它不依赖模型的“自觉性”，而是在推理生成的每个时间步，通过文法状态机计算当前唯一合法的 Token 集合，将所有非法 Token 的 Logits 暴力置为 $-\\infty$！从底层物理上彻底保证输出 100% 严格符合 JSON Schema！

### 直觉理解
- **拼写填字游戏的硬字模（受限解码直觉）**：
  - 想象一个打字员在电脑前输入，如果任由他敲键盘，他可能打出任何错别字；
  - 现在我们给键盘装上一个电子锁（文法状态机）：当他刚刚敲下 `{"age": ` 时，电子锁立刻物理锁死键盘上的所有英文字母和标点符号，**只激活数字键 0-9**！打完数字敲逗号后，键盘又只允许输入双引号 `"`。打字员哪怕闭着眼睛乱按，敲出来的也必定是一个完美合法的 JSON！

### 核心概念与符号对照表
| 约束技术范式 | 实现层级 | 失败率 | 额外延迟开销 |
| --- | --- | --- | --- |
| **纯 Prompt 恳求** | 语义层 | 很高 (5%~15% 解析失败) | 遇到失败需昂贵重试 |
| **Output Fixer / 重试** | 应用层 | 中等 (依赖正则截取与二次修复) | 多次 API 调用往返延迟 |
| **JSON Mode (API 级)** | 解码器层 | 较低 (保证合法 JSON，但不保证字段类型) | 几乎零额外开销 |
| **文法受限解码 (Grammar-guided)** | Logits 概率掩码层 | **严格 0% 语法失败** (数学级 100% 保证) | 仅需极微小的状态转移计算 |

### 数学原理与逐步推导
设在自回归解码时间步 $t$，模型生成的未归一化 logits 为 $\\mathbf{z}_t \\in \\mathbb{R}^{|V|}$。
系统维护一个由目标 JSON Schema 或正则表达式编译而成的确定性有限状态自动机（DFA）：
$$\\mathcal{M} = (Q, \\Sigma, \\delta, q_0, F)$$
其中当前状态为 $q_t$。
1. **计算合法 Token 集合**：
   遍历词表中所有候选词 $w \\in \\mathcal{V}$。若词 $w$ 的字符序列能够使自动机从当前状态 $q_t$ 发生合法的转移，则 $w$ 属于合法集合：
   $$\\mathcal{V}_{\\text{valid}}(q_t) = \\{ w \\in \\mathcal{V} \\mid \\delta^*(q_t, w) \\neq \\text{ERROR} \\}$$
2. **Logits 动态掩码（Masking）**：
   在送入 Softmax 计算之前，对所有非法候选词施加绝对负无穷惩罚：
   $$\\tilde{z}_{t, w} = \\begin{cases} z_{t, w}, & \\text{if } w \\in \\mathcal{V}_{\\text{valid}}(q_t) \\\\ -\\infty, & \\text{if } w \\notin \\mathcal{V}_{\\text{valid}}(q_t) \\end{cases}$$
3. **采样与状态转移**：
   计算带有掩码的条件概率分布：
   $$P(w \\mid x_{<t}) = \\text{softmax}(\\tilde{\\mathbf{z}}_t)$$
   无论采用贪心还是采样，选出的下一个词 $w_t$ 必定属于 $\\mathcal{V}_{\\text{valid}}(q_t)$。随后状态机更新：$q_{t+1} = \\delta^*(q_t, w_t)$。
   **数学保证**：生成的完整序列必定是该文法语言的一个合法句子，格式合规率达到绝对的 100%！

### 常见认知误区与避坑指南
1. **误以为受限解码会严重损害模型的智商和生成质量**：Willard & Louf（2023）在 Outlines 论文中通过大量基准测试证明：受限解码完全不改变合法 Token 之间的相对概率排序，模型不仅不会变笨，反而因为彻底避免了格式格式探索上的无效分支，在信息抽取、实体链接等结构化任务上的准确率全面反超自由生成！
2. **以为受限解码每次都要实时重新解析 Schema**：在现代高性能引擎（如 Outlines、SGLang、Guidance）中，JSON Schema 在服务启动时就被**离线预编译为高度紧凑的字节级索引前缀树（Trie / FSM）**。在线推理时每步查找有效掩码的耗时通常低于 1 微秒，远快于 GPU 矩阵乘法的耗时。

### 工业级工程实践
- **Pydantic 模型驱动开发**：在现代 Python 全栈 AI 应用中，推荐始终使用 Pydantic 定义数据契约：
  ```python
  class UserProfile(BaseModel):
      name: str
      age: int
      skills: list[str]
  ```
  通过 `UserProfile.model_json_schema()` 导出 Schema，直接灌给支持结构化输出的端点（如 OpenAI `response_format={"type": "json_schema", ...}` 或本地 vLLM 的 `guided_decoding`），彻底告别脆弱的后处理字符串拼接。

### 拓展阅读与学术文献
1. **Willard & Louf (2023)**: *Efficient Guided Generation for Large Language Models* (Outlines 论文) — 现代受限解码核心技术。
2. **Geng et al. (2023)**: *Grammar-Constrained Decoding for Structured NLP Tasks*.
3. **OpenAI Structured Outputs 官方工程技术指南 (2024)**。

### 知识总结与核心记忆要点
- **根本痛点**：自由文本的不确定性是企业级系统级联崩溃的罪魁祸首。
- **机制核心**：文法状态机在每个解码步实时拦截非法 Token，将 logits 强制刷为 $-\\infty$。
- **双重收益**：100% 格式合规性保证，同时彻底根除下游解析重试带来的高昂调用成本与延迟。"""

    l2_code = """import numpy as np

def constrained_decode_step(logits, current_state, state_transitions, vocab_map):
    \"\"\"
    模拟受限解码的单步 Logits 掩码过程
    \"\"\"
    valid_tokens = state_transitions.get(current_state, {})
    masked_logits = logits.copy()
    
    # 将不在合法转移表中的 token logits 置为 -1e9
    for token_str, token_id in vocab_map.items():
        if token_str not in valid_tokens:
            masked_logits[token_id] = -1e9
            
    # Softmax
    exp_l = np.exp(masked_logits - np.max(masked_logits))
    probs = exp_l / np.sum(exp_l)
    
    next_token_id = int(np.argmax(probs))
    # 反查字符串
    inv_vocab = {v: k for k, v in vocab_map.items()}
    chosen_str = inv_vocab[next_token_id]
    next_state = valid_tokens[chosen_str]
    
    return chosen_str, next_state

# 模拟微型词表
vocab = {"{": 0, "}": 1, '"name"': 2, ":": 3, '"Alice"': 4, "Hello": 5}
# 定义简单的状态转移机: 期望输出 {"name": "Alice"}
# State 0: 仅允许 '{' -> 进入 State 1
# State 1: 仅允许 '"name"' -> 进入 State 2
# State 2: 仅允许 ':' -> 进入 State 3
# State 3: 仅允许 '"Alice"' -> 进入 State 4
# State 4: 仅允许 '}' -> 结束
fsm = {
    0: {"{": 1},
    1: {'"name"': 2},
    2: {":": 3},
    3: {'"Alice"': 4},
    4: {"}": 5}
}

# 即使模型原始 logits 极其偏向输出无意义的 "Hello" (token_id=5)
mock_logits = np.array([0.0, 0.0, 0.0, 0.0, 0.0, 10.0]) # "Hello" 得分高达 10

state = 0
generated_tokens = []
while state in fsm:
    tok, state = constrained_decode_step(mock_logits, state, fsm, vocab)
    generated_tokens.append(tok)

result_str = "".join(generated_tokens)
print("即使原始最高得分是 'Hello'，受限解码强制生成的字符串:")
print(result_str)

assert result_str == '{"name":"Alice"}'
print("测试通过：状态机受限解码成功过滤所有非法 token，100% 保证结构语法合法！")"""

    l2_tips = [
        tip("在工业生产中，严禁仅依靠自然语言提示词保证 JSON 格式；必须在后端接口使用受限解码（如 JSON Schema 强制校验）。", "pitfall"),
    ]

    lessons = [
        lesson("ml-app-l1-1", "提示词范式演进与推理激发", l1_text, 2, l1_tips, [demo(code=l1_code, title="自我一致性多数表决提取与置信度计算")]),
        lesson("ml-app-l1-2", "结构化输出保证与受限生成解码", l2_text, 3, l2_tips, [demo(code=l2_code, title="有限状态机受限解码与非法 Token 屏蔽模拟")]),
    ]

    exercises = [
        single_choice(
            ex_id="ml-app-c1-ex1",
            question="为什么在面对复杂多步推理（如复杂数学推导、符号逻辑规划）任务时，思维链（Chain-of-Thought, CoT）能够显著提升大模型的准确率？",
            options=[
                {"value": "A", "text": "CoT 在每个时间步通过反向传播临时修改了模型的权重参数"},
                {"value": "B", "text": "CoT 将原本黑盒单步映射分解为多个离散思考步骤，每个中间 Token 都成为后续计算的显式注意力工作空间（Workspace）"},
                {"value": "C", "text": "CoT 强制要求模型向外部数据库发起多次 SQL 查询以获取真实数据"},
                {"value": "D", "text": "CoT 将神经网络的特征向量维度临时翻倍以增强表征容量"},
            ],
            answer="B",
            explanation="CoT 将复杂推理拆解为中间显式推导步骤。由于 Transformer 是自回归生成的，每个生成的中间步骤 Token 都会作为后续计算的上文注意力依赖，提供了充足的思考工作空间，避免了模型在单步输出时发生快思考幻觉。",
            difficulty=2,
            related_lesson_id="ml-app-l1-1",
            tags=["CoT", "思维链", "工作空间", "提示工程"],
        ),
        multiple_choice(
            ex_id="ml-app-c1-ex2",
            question="关于受限生成解码（Constrained Decoding / Guided Generation），下列说法正确的有：",
            options=[
                {"value": "A", "text": "它在每个解码时间步，利用预编译的文法有限状态机（FSM）动态计算当前合法的 Token 集合"},
                {"value": "B", "text": "通过对所有非法 Token 的未归一化 logits 强制注入 -\\infty，从底层物理上 100% 保证输出满足 JSON Schema"},
                {"value": "C", "text": "相比于事后解析重试，受限生成在生成过程中完全避免了因格式错误导致的昂贵重复调用"},
                {"value": "D", "text": "受限生成只适用于贪心搜索，在温度采样（Temperature > 0）时无法使用"},
            ],
            answer=["A", "B", "C"],
            explanation="A、B、C 均为受限生成的机制与优势。D 选项错误，受限生成只是在计算 Softmax 之前对 logits 做掩码，其后续可以无缝搭配贪心、温度采样或 Top-p 采样。",
            difficulty=2,
            related_lesson_id="ml-app-l1-2",
            tags=["受限生成", "JSONSchema", "FSM", "结构化输出"],
        ),
        judge(
            ex_id="ml-app-c1-ex3",
            question="在设计 Few-shot 提示词时，示例的先后呈现顺序对模型的最终输出表现没有任何影响，模型会完全等权重对待所有示例。",
            answer=False,
            explanation="错误。研究表明大语言模型存在显著的提示顺序敏感性（Prompt Order Sensitivity），示例排列顺序的不同甚至会导致准确率产生几十个百分点的剧烈波动。",
            difficulty=1,
            related_lesson_id="ml-app-l1-1",
            tags=["Few-shot", "顺序敏感性", "ICL"],
        ),
        fill(
            ex_id="ml-app-c1-ex4",
            question="受限生成技术通常将 JSON Schema 或正则表达式预编译为有限状态____机（填'自动'或'图灵'），用于指导每步 Token 的合法性判断。",
            blanks=[["自动"]],
            explanation="编译原理中用于正则与文法受限匹配的数据结构是有限状态自动机（FSM/DFA）。",
            difficulty=1,
            related_lesson_id="ml-app-l1-2",
            tags=["FSM", "自动机", "受限解码"],
        ),
        open_ex(
            ex_id="ml-app-c1-ex5",
            question="分析自我一致性（Self-Consistency）提示策略为什么能显著超越普通的单次贪心思维链（Greedy CoT）？",
            reference_answer="原理解析：\n1. 单次贪心 CoT 具有偶发性缺陷：如果模型在多步推演的长链条中，由于前序某一步的局部最优选择偶然犯了一个细微的算术失误，后续所有推导将发生不可逆的级联偏差；\n2. 自我一致性在较高温度下采样多条独立的思维路径：虽然中间推导过程千差万别，但在复杂逻辑中，正确的推导终点往往是唯一且高度收敛的；\n3. 错误的计算路径通常在长尾概率空间中发散随机分布；通过边际化多数表决，能够极大概率筛选出一致性最高的正确结论，具备强健的抗噪容错能力。",
            explanation="多路径探索结合多数表决消除单次采样的随机推导脆弱性。",
            rubric=[
                {"points": 5, "description": "阐明单次贪心思维链在长推导中容易发生单点偶然失误级联偏差"},
                {"points": 5, "description": "说明多条路径中正确答案语义收敛而错误答案离散发散的统计表决机理"},
            ],
            difficulty=3,
            related_lesson_id="ml-app-l1-1",
            tags=["自我一致性", "多数表决", "CoT优化"],
        ),
        # ── Code Exercise 1 ──
        {
            "id": "ml-app-c1-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】实现自我一致性多数投票算法：\n编写函数 `majority_vote_answers(candidates)`：\n1. `candidates`：字符串列表，每个字符串代表模型生成的一段文本，末尾形如 `答案: X`（X 为一个整数）；\n2. 使用正则表达式提取每个候选项中的最终数字字符串；\n3. 统计出现频次最高者作为最终胜出答案；\n4. 返回元组 `(winner_str, confidence_float)`，其中置信度为最高票数占总有效票的比例，四舍五入保留 2 位小数。\n\n最后一行请以给定的候选项调用测试。",
            "starterCode": "from typing import List, Tuple\nimport re\nfrom collections import Counter\n\ndef majority_vote_answers(candidates: List[str]) -> Tuple[str, float]:\n    \"\"\"从多条思维链中提取数字答案并执行多数投票\"\"\"\n    # 请在此实现\n    ___\n\nsamples = [\n    \"计算过程很长，答案: 42\",\n    \"逐步推导如下，答案: 42\",\n    \"算错了，答案: 10\",\n    \"严格证明，答案: 42\"\n]\nres = majority_vote_answers(samples)\nprint(res)\n",
            "setupCode": "",
            "expectedOutput": "('42', 0.75)",
            "answer": "from typing import List, Tuple\nimport re\nfrom collections import Counter\n\ndef majority_vote_answers(candidates: List[str]) -> Tuple[str, float]:\n    extracted = []\n    for c in candidates:\n        m = re.search(r'答案:\s*(\d+)', c)\n        if m:\n            extracted.append(m.group(1))\n    if not extracted:\n        return (\"\", 0.0)\n    counts = Counter(extracted)\n    winner, count = counts.most_common(1)[0]\n    conf = round(count / len(extracted), 2)\n    return (winner, conf)\n\nsamples = [\n    \"计算过程很长，答案: 42\",\n    \"逐步推导如下，答案: 42\",\n    \"算错了，答案: 10\",\n    \"严格证明，答案: 42\"\n]\nres = majority_vote_answers(samples)\nprint(res)\n",
            "tests": "t_samples = [\"答案: 5\", \"答案: 5\", \"答案: 6\"]\nw, c = majority_vote_answers(t_samples)\nassert w == '5' and c == 0.67, f\"投票结果不匹配: {w}, {c}\"\n",
            "explanation": "利用正则提取各思维链末尾的标记答案，使用 Counter 进行频次统计并计算胜出者所占得票比例。",
            "tags": ["多数投票", "自我一致性", "正则提取", "算法实战"],
            "related_lesson_id": "ml-app-l1-1",
        },
    ]

    return chapter(
        chapter_id="ml-app-c1",
        course_id="ml-llm-applications",
        order=1,
        title="提示词工程与结构化输出",
        goal="系统掌握上下文学习、思维链、自我一致性推理激发机制，掌握文法受限解码与工业级结构化输出保障。",
        lessons=lessons,
        exercises=exercises,
    )
