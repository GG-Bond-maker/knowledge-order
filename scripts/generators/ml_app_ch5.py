# -*- coding: utf-8 -*-
"""
Chapter 5: 智能体（Agent）系统与工业综合 Capstone (AI Agents & Production Capstone)
Course: ml-llm-applications
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_5():
    # ── Lesson 5.1 ──
    l1_text = """### 学习目标
学完本节，你应该能够：
1. 理解自主智能体（Autonomous AI Agent）的四层核心架构：目标、规划思考、记忆系统与工具执行；
2. 掌握 **ReAct 范式（Reasoning + Acting, Yao et al., 2022）** 的交替推演闭环机理；
3. 深入掌握 **函数调用（Function Calling / Tool Use）** 的底层协议、JSON Schema 工具定义与调度交互时序；
4. 掌握多智能体协作（Multi-Agent Collaboration）与反射自修正（Reflection / Self-Correction）工程设计；
5. 编写纯 Python 代码实现简易 ReAct 智能体循环执行器。

### 前置知识
- 提示词工程（Prompt Engineering）与思维链（CoT）；
- 结构化输出（JSON Schema）与受限解码。

### 问题背景与 ML 用途
大语言模型虽然文采斐然、通晓古今，但本质上只是一个封闭在神经网络参数内部的“纯文本生成器”。
- **单体大模型的生理残缺**：
  1. **没有手脚**：无法直接查询今天的实时天气、无法向企业数据库执行 SQL、无法发送邮件、无法操作操作系统文件；
  2. **算术能力脆弱**：直接心算 10 位数相乘或开根号极易犯错；
- **智能体（AI Agent）赋予模型手脚与触角**：通过为大模型赋予**调用外部工具（Tool / API）**的能力，模型从一个被动的“聊天复读机”蜕变为了一个能够自主感知环境、拆解目标、规划步骤、调用工具并根据返回结果持续自我纠错的“数字员工（Digital Worker）”；
- **ReAct 框架**将语言模型的思考（Thought）与行动（Action）有机缠绕，成为了现代所有智能体系统（如 LangChain、AutoGPT、Devin）的核心设计模式。

### 直觉理解
- **侦探破案现场（ReAct 范式的直觉）**：
  - 想象一个大侦探在调查一起悬案，如果他只在脑子里纯空想（只有 Reasoning / CoT），他很快就会产生离谱的主观臆想；如果他像无头苍蝇一样乱闯乱撞乱翻抽屉（只有 Acting），效率极其低下；
  - **ReAct 侦探的操作手册**：
    - **Step 1 思考（Thought）**：“嫌疑人声称案发时在商场购物，我需要验证他的不在场证明”；
    - **Step 2 行动（Action）**：调用工具 `CheckSurveillanceVideo(location="Mall", time="19:00")`；
    - **Step 3 观察（Observation）**：监控录像返回结果：“该时段商场监控画面中未见该嫌疑人”；
    - **Step 4 再次思考（Thought）**：“嫌疑人说谎了！我需要下一步调查他的手机基站定位数据”...
  - 思考指导行动，行动验证思考，环环相扣直至破案！

### 核心概念与符号对照表
| 阶段 / 组件 | 角色定位 | 输入 / 输出内容 | 核心工程保障 |
| --- | --- | --- | --- |
| **Thought (思考)** | 内部认知规划 | 分析当前目标与已获取的外部信息，制定下一步策略 | 避免盲目调用工具，保持逻辑长程一致性 |
| **Action (行动)** | 外部工具调用 | 选择工具名称与格式化的参数 JSON 字典 | 严格遵循 Function Calling 协议，格式防崩溃 |
| **Observation (观察)** | 环境事实反馈 | 外部 API、代码解释器或数据库返回的真实文本 | 作为全新上下文注回模型，消除幻觉 |
| **Finish (终结)** | 任务交付 | 输出面向用户的最终结构化答案 | 满足停止条件，跳出 ReAct 循环 |

### 交互时序图解：ReAct 闭环循环
```
用户输入 Query ──► [ 大模型 Core ]
                         │
                         ▼ 生成 Thought (规划下一步行动)
                   [ Action: 工具名 + 参数 JSON ]
                         │
                         ▼ 拦截并交给宿主 Python 程序执行
                   [ 外部工具 (搜索/计算器/数据库) ]
                         │
                         ▼ 返回执行结果
                   [ Observation: 真实数据 ]
                         │
                         ▼ 作为对话历史追加送回
                    [ 大模型 Core ] ──► (若达成目标) ──► 最终回答 (Finish)
                         │ (若未达成)
                         └──► 循环进行下一轮 Thought/Action
```

### Python 代码实现与实验验证
下面的代码展示一个微型纯 Python ReAct 智能体循环执行器，模拟多步计算与外部状态感知。"""

    l1_code = """import json
import re

# 1. 模拟外部工具箱 (Tools)
def tool_calculator(expression):
    \"\"\"简易安全数学计算器工具\"\"\"
    try:
        # 仅允许基本数学符号
        if not re.match(r'^[\d\+\-\*\/\s\(\)\.]+$', expression):
            return "错误: 包含非法字符"
        return str(eval(expression))
    except Exception as e:
        return f"计算错误: {e}"

def tool_database_lookup(user_name):
    \"\"\"模拟企业数据库查询工具\"\"\"
    mock_db = {"Alice": "已购买专业版 VIP，积分 1200", "Bob": "免费试用用户，积分 50"}
    return mock_db.get(user_name, "未找到该用户记录")

TOOLS_REGISTRY = {
    "calculator": tool_calculator,
    "db_lookup": tool_database_lookup
}

# 2. 模拟 LLM 根据当前对话历史生成的 ReAct 文本
def mock_llm_step(history):
    \"\"\"模拟大模型基于历史进行的下一步生成\"\"\"
    if "Observation:" not in history:
        # 第 1 步: 模型先查数据库
        return 'Thought: 用户询问 Alice 的积分是否足以兑换一件价值 800 积分的奖品，并询问兑换后剩余多少。我需要先查询 Alice 的当前积分。\\nAction: db_lookup("Alice")'
    elif "Action: calculator" not in history:
        # 第 2 步: 看到数据库返回后，模型决定调用计算器做减法
        return "Thought: 数据库显示 Alice 当前有 1200 积分，足以兑换 800 积分的奖品。现在需要计算 1200 - 800 的剩余积分。\\nAction: calculator(1200 - 800)"
    else:
        # 第 3 步: 看到计算器结果后，输出最终回答
        return "Thought: 所有信息均已齐备，现在给出最终明确答复。\\nFinal Answer: Alice 的积分完全足够兑换（当前 1200 积分，超过所需的 800 积分）。兑换完成后，她的剩余积分将精确为 400 积分。"

# 3. 运行 ReAct 智能体循环执行器
def run_agent_loop(query, max_steps=5):
    trajectory = f"User Query: {query}\\n"
    
    for step in range(1, max_steps + 1):
        llm_response = mock_llm_step(trajectory)
        trajectory += llm_response + "\\n"
        
        # 检查是否达成最终目标
        if "Final Answer:" in llm_response:
            final_ans = llm_response.split("Final Answer:")[-1].strip()
            return final_ans, trajectory
            
        # 解析 Action: tool_name(args)
        match = re.search(r'Action:\s*(\w+)\((.*?)\)', llm_response)
        if match:
            t_name = match.group(1)
            t_arg = match.group(2).strip().strip('"').strip("'")
            
            tool_fn = TOOLS_REGISTRY.get(t_name)
            if tool_fn:
                obs = tool_fn(t_arg)
            else:
                obs = f"错误: 未知工具 {t_name}"
                
            trajectory += f"Observation: {obs}\\n"
            
    return "超时未完成", trajectory

final_output, full_log = run_agent_loop("Alice 的积分够不够换 800 积分的礼物，换完剩多少？")
print("=== ReAct 智能体执行全轨迹 ===")
print(full_log)
print("最终交付结果:", final_output)

assert "400" in final_output and "足够" in final_output
assert "Observation: 已购买专业版 VIP，积分 1200" in full_log
print("测试通过：ReAct 闭环规划、工具调用与观测反馈执行器运行成功！")"""

    l1_tips = [
        tip("构建 Agent 系统必须设定硬性的 max_steps 最大轮数上限，防止工具调用失败时模型陷入无限死亡循环死锁。", "pitfall"),
    ]

    # ── Lesson 5.2 ──
    l2_text = """### 学习目标
学完本节，你应该能够：
1. 掌握企业级生产 RAG + Agent 系统的全栈端到端顶层拓扑架构；
2. 完整贯通从长文本解析、递归字符滑动分块（Chunking）、轻量级倒排词频与语义索引建立；
3. 掌握智能体意图路由器（Intent Router）对用户请求的分类派发机理；
4. 掌握多路召回融合、事实证据标定（Evidence Attribution）与严格拒答兜底；
5. **独立编写并运行一个完整自包含、企业级质量的 Capstone 生产级问答管道**。

### 前置知识
- 课程前序所有知识：分词、向量相似度、BM25、RRF 融合、ReAct 循环与受限输出。

### 工业综合项目 Capstone 架构设计
本实战将整合本课程所有前沿技术，构建一套高度模块化、高鲁棒性的**企业级知识库问答与智能工具调度管道**：
1. **数据与索引层**：
   - 载入非结构化企业长文档；
   - 采用具有重叠窗口（Overlap）的递归字符分块算法将其拆解为知识切片；
   - 构建双通道索引：基于关键词分词的轻量级 BM25 词频索引 + 基于稠密向量的语义索引；
2. **意图路由智能体（Router Agent）**：
   - 分析用户 Query：
     - 若为礼貌问候/闲聊：直接调用生成头快速响应；
     - 若为数学计算需求：路由派发至数值计算工具；
     - 若为专业私域知识咨询：触发高级双路 RAG 检索管线；
3. **高级检索与融合管线**：
   - 并行执行关键词召回与语义余弦召回；
   - 采用 RRF 算法进行无量纲排名融合，精选 Top-2 权威片段；
4. **生成与事实证据标定层**：
   - 注入检索材料与严格拒答规则；
   - 自动生成带有证据引用标记（`[Doc ID]`）的高质量结构化答复。

### 架构全景流水线
```
           ┌────────────────────── 用户输入 Query ──────────────────────┐
           │                                                            │
           ▼                                                            ▼
     [ 意图路由分类器 ]                                      [ 工具库: 计算器等 ]
           │                                                            │
           ├─► 闲聊模式 ──► 快速流式回复                                │
           ├─► 工具模式 ──► 调度外部 API ────────────────────────────────┘
           └─► 知识库模式
                 │
                 ▼
           [ 多路并行召回 ]
             ├─► 关键词倒排检索 (BM25)
             └─► 稠密语义检索 (Dense Cosine)
                 │
                 ▼
           [ RRF 排名加权融合 (k=60) ] ──► 筛出 Top 权威片段
                 │
                 ▼
           [ 证据约束生成器 (带拒答与 [Doc X] 引用角标) ]
                 │
                 ▼
           交付最终企业级合规答案
```

### Python 代码实现与实验验证
下面的代码从零实现了一套完整自包含的企业级 RAG + Agent Capstone 系统，并用三个不同场景（闲聊、精确数学、知识库问答）进行全面验证。"""

    l2_code = """import re
import hashlib
from collections import defaultdict, Counter
import numpy as np

# ── 1. 中文多粒度分词与递归字符滑动分块器 ──
def extract_tokens(text):
    clean = re.sub(r'[^\\w\\u4e00-\\u9fa5]', '', text.lower())
    tokens = set(clean)
    for i in range(len(clean) - 1):
        tokens.add(clean[i:i+2])
    return tokens

def recursive_chunk_text(text, chunk_size=60, chunk_overlap=15):
    paragraphs = [p.strip() for p in text.split('\\n') if p.strip()]
    chunks = []
    current_chunk = ""
    
    for p in paragraphs:
        if len(current_chunk) + len(p) <= chunk_size:
            current_chunk += (" " + p if current_chunk else p)
        else:
            if current_chunk:
                chunks.append(current_chunk)
                # 保持 overlap 滑动窗口
                current_chunk = current_chunk[-chunk_overlap:] + " " + p
            else:
                chunks.append(p[:chunk_size])
                current_chunk = p[chunk_size - chunk_overlap:]
    if current_chunk:
        chunks.append(current_chunk)
    return chunks

# ── 2. 轻量级双路检索器 (BM25 + Dense) ──
class HybridVectorStore:
    def __init__(self):
        self.doc_chunks = []
        self.inverted_index = defaultdict(set)
        self.doc_vectors = []
        
    def add_documents(self, text, doc_prefix):
        chunks = recursive_chunk_text(text)
        start_idx = len(self.doc_chunks)
        for i, c in enumerate(chunks):
            cid = f"{doc_prefix}_chunk_{i}"
            self.doc_chunks.append({"id": cid, "content": c})
            # 建立多粒度分词倒排索引
            tokens = extract_tokens(c)
            for t in tokens:
                self.inverted_index[t].add(start_idx + i)
            # 确定性语义伪嵌入 (基于 MD5 种子，跨运行环境绝对一致)
            h = int(hashlib.md5(c.encode('utf-8')).hexdigest()[:8], 16)
            np.random.seed(h % (2**31))
            vec = np.random.randn(8)
            vec = vec / np.linalg.norm(vec)
            self.doc_vectors.append(vec)
            
    def search(self, query, top_k=2):
        q_tokens = extract_tokens(query)
        # 1. 关键词倒排打分
        bm25_scores = defaultdict(int)
        for t in q_tokens:
            for didx in self.inverted_index.get(t, []):
                bm25_scores[didx] += 1
        sorted_kw = [self.doc_chunks[idx]["id"] for idx, _ in sorted(bm25_scores.items(), key=lambda x: x[1], reverse=True)]
        
        # 2. 语义检索 (基于查询向量)
        qh = int(hashlib.md5(query.encode('utf-8')).hexdigest()[:8], 16)
        np.random.seed(qh % (2**31))
        q_vec = np.random.randn(8)
        q_vec = q_vec / np.linalg.norm(q_vec)
        dense_sims = [np.dot(q_vec, d_vec) for d_vec in self.doc_vectors]
        sorted_dense = [self.doc_chunks[idx]["id"] for idx in np.argsort(dense_sims)[::-1]]
        
        # 3. RRF 融合
        rrf = defaultdict(float)
        for lst in [sorted_kw[:10], sorted_dense[:10]]:
            for rank, cid in enumerate(lst, 1):
                rrf[cid] += 1.0 / (60 + rank)
                
        fused = sorted(rrf.items(), key=lambda x: x[1], reverse=True)[:top_k]
        chunk_map = {c["id"]: c["content"] for c in self.doc_chunks}
        return [(cid, chunk_map[cid]) for cid, _ in fused]

# ── 3. 智能体意图路由与生成执行器 ──
class EnterpriseRAGAgent:
    def __init__(self, vector_store):
        self.vs = vector_store
        
    def route_intent(self, query):
        q_lower = query.lower()
        if any(w in q_lower for w in ["你好", "hello", "hi", "早安"]):
            return "CHITCHAT"
        if any(op in q_lower for op in ["+", "-", "*", "/", "计算", "等于多少"]):
            return "CALCULATOR"
        return "KNOWLEDGE_RAG"
        
    def handle_query(self, query):
        intent = self.route_intent(query)
        
        if intent == "CHITCHAT":
            return "您好！我是知序学院的企业级 AI 知识库智能体助手，请问有什么可以帮您？"
            
        elif intent == "CALCULATOR":
            math_expr = re.sub(r'[^\\d\\+\\-\\*/\\(\\)\\.]', '', query)
            try:
                ans = eval(math_expr)
                return f"[工具调用] 数学计算器执行 '{math_expr}' 结果为: {ans}"
            except Exception:
                return "抱歉，计算表达式不合法。"
                
        else: # KNOWLEDGE_RAG
            retrieved = self.vs.search(query, top_k=2)
            if not retrieved:
                return "抱歉，知识库中未检索到相关内容。"
                
            # 组装带证据引用的结构化回答
            context_str = "\\n".join([f"[{cid}]: {txt}" for cid, txt in retrieved])
            answer = f"根据企业权威知识库检索材料：\\n{context_str}"
            return answer

# ── 4. 生产综合测试 ──
vstore = HybridVectorStore()
doc_text = \"\"\"
知序学院（knowledge-order）是一所致力于建设世界一流计算机科学与人工智能教材的学院。
学院下设机器学习主目录，包含 8 门相互贯通的核心大学级教材。
学员毕业后颁发专业技术徽章，且所有代码示例均保证 100% 独立可运行。
\"\"\"
vstore.add_documents(doc_text, "DOC_ML")

agent = EnterpriseRAGAgent(vstore)

# 测试场景 1: 闲聊问候
resp_chat = agent.handle_query("你好啊！")
print("场景 1 (闲聊):", resp_chat)

# 测试场景 2: 数学计算工具
resp_calc = agent.handle_query("请帮我计算 (100 * 4) + 25")
print("场景 2 (计算):", resp_calc)

# 测试场景 3: 知识库专业问答
resp_rag = agent.handle_query("知序学院的机器学习目录有多少门课程？")
print("场景 3 (RAG问答):\\n", resp_rag)

assert "您好" in resp_chat
assert "425" in resp_calc
assert "8 门" in resp_rag and "[DOC_ML" in resp_rag
print("\\n[SUCCESS] 测试通过：企业级端到端 RAG + Agent 综合 Capstone 系统验证完全成功！")"""

    l2_tips = [
        tip("企业级 RAG 生产上线必须包含：意图路由、双路检索、RRF 融合、带编号的原文引用溯源与闲聊兜底分支。", "note"),
    ]

    lessons = [
        lesson("ml-app-l5-1", "ReAct 范式、工具调用与多智能体协作", l1_text, 2, l1_tips, [demo(code=l1_code, title="ReAct 循环执行器与工具调用闭环验证")]),
        lesson("ml-app-l5-2", "工业综合实战：企业级端到端 RAG + Agent 知识库问答系统", l2_text, 3, l2_tips, [demo(code=l2_code, title="端到端企业级 RAG + Agent 全流程 Capstone 落地实战")]),
    ]

    exercises = [
        single_choice(
            ex_id="ml-app-c5-ex1",
            question="在 ReAct（Reasoning + Acting）智能体框架中，模型交替生成 Thought（思考）与 Action（行动）的核心优势是什么？",
            options=[
                {"value": "A", "text": "思考能够有效指导和修正行动规划，而外部行动的观察反馈（Observation）能够实时纠正纯思考推理中容易发生的幻觉"},
                {"value": "B", "text": "使模型能够自动免除使用任何 GPU 显存"},
                {"value": "C", "text": "使所有外部 API 调用都不需要网络连接"},
                {"value": "D", "text": "强制模型必须一次性把所有工具一次全部调用完毕"},
            ],
            answer="A",
            explanation="ReAct 框架实现了思考与行动的共生互补：内部思考为长远规划提供指引，外部行动结果作为客观事实注回上下文，彻底斩断了单一推理的凭空臆测与单一行动的盲目试错。",
            difficulty=2,
            related_lesson_id="ml-app-l5-1",
            tags=["ReAct", "Agent架构", "工具调用", "规划思考"],
        ),
        multiple_choice(
            ex_id="ml-app-c5-ex2",
            question="关于构建企业级生产 RAG + Agent 知识库系统的工程实践，下列做法合理的有：",
            options=[
                {"value": "A", "text": "设置意图路由器（Intent Router），将闲聊、工具调用与知识库检索在入口处清晰分流"},
                {"value": "B", "text": "采用滑动重叠窗口（Overlap）的递归分块算法，尽量保护段落与语义上下文的完整性"},
                {"value": "C", "text": "在生成回答时强制模型在断言末尾附加证据切片编号（如 [Doc 1]），实现引用溯源可解释性"},
                {"value": "D", "text": "当检索资料不足时，要求大模型必须依靠自身想象力自由发挥编造出满意答案以讨好用户"},
            ],
            answer=["A", "B", "C"],
            explanation="A、B、C 均为企业级高质量 RAG 系统的核心黄金准则。D 选项严重错误，资料不足时应严格触发拒答规则，坚决杜绝无依据的虚假编造。",
            difficulty=2,
            related_lesson_id="ml-app-l5-2",
            tags=["企业级RAG", "意图路由", "引用溯源", "工程最佳实践"],
        ),
        judge(
            ex_id="ml-app-c5-ex3",
            question="在 Function Calling（工具调用）流程中，大模型本身会直接在远端服务器上执行实际的 Python 代码或数据库写入操作。",
            answer=False,
            explanation="错误。大模型只负责理解意图并生成包含工具名称与调用参数的结构化文本（如 JSON）；实际的代码运行、API 发送与数据库写入是由外层的宿主程序（如 Python 后端服务）安全拦截并执行的。",
            difficulty=1,
            related_lesson_id="ml-app-l5-1",
            tags=["FunctionCalling", "执行安全", "Agent交互"],
        ),
        fill(
            ex_id="ml-app-c5-ex4",
            question="在智能体执行循环中，外部工具执行后返回给模型的客观数据结果被称为____。（填对应英文单词，如 Observation 或 Thought）",
            blanks=[["Observation"]],
            explanation="ReAct 范式中工具返回的结果被称为 Observation（观察/观测）。",
            difficulty=1,
            related_lesson_id="ml-app-l5-1",
            tags=["Observation", "ReAct", "智能体术语"],
        ),
        open_ex(
            ex_id="ml-app-c5-ex5",
            question="系统阐述一个成熟的企业级 RAG 知识库问答系统从文档上传入库到最终交付答案的完整端到端生命周期包括哪些关键模块？",
            reference_answer="完整端到端生命周期关键模块：\n1. 数据摄取与清洗：解析各类多模态与非结构化文档（PDF、Markdown、Office 等），去除乱码格式；\n2. 结构感知分块（Chunking）：利用递归字符与重叠窗口保留段落完整语义，避免关键信息断裂；\n3. 双通道混合索引：生成 Dense 稠密向量写入向量数据库（如 HNSW 索引），同时建立倒排词频稀疏索引（BM25）；\n4. 意图路由与改写（Query Transformation）：对用户问题进行补全改写，过滤闲聊并路由至对应知识库；\n5. 多路混合检索与 RRF 融合：并行召回并基于排名倒数做无量纲加权合并；\n6. 跨注意力重排（Cross-Encoder Reranking）：对初筛候选做深度逐字精排，过滤不相干噪声片段；\n7. 证据约束生成与溯源对齐：严格基于上下文生成答案，标注引用编号 [Doc ID]，遇资料不足明确拒答。",
            explanation="系统覆盖数据切分、混合索引、意图路由、RRF 融合、重排以及严格事实约束生成的全栈工程生命周期。",
            rubric=[
                {"points": 5, "description": "涵盖数据清洗、递归分块与 Dense+BM25 双通道索引"},
                {"points": 5, "description": "涵盖意图路由、多路召回、RRF 融合、重排与带引用严格约束生成"},
            ],
            difficulty=4,
            related_lesson_id="ml-app-l5-2",
            tags=["RAG全生命周期", "系统架构", "工程Capstone"],
        ),
        # ── Code Exercise 5 ──
        {
            "id": "ml-app-c5-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】实现智能体工具调用解析器：\n编写函数 `parse_agent_action(model_output)`：\n1. 输入 `model_output` 包含形如 `Action: tool_name(param)` 的指令；\n2. 若匹配成功，提取工具名 `tool_name` 与去除首尾引号后的参数字符串 `param`，返回元组 `(tool_name, param)`；\n3. 若未匹配到合法 Action，返回 `None`。\n\n最后一行请以 `Action: search(\"机器学习\")` 测试调用。",
            "starterCode": "from typing import Optional, Tuple\nimport re\n\ndef parse_agent_action(model_output: str) -> Optional[Tuple[str, str]]:\n    \"\"\"解析智能体生成的 Action 指令\"\"\"\n    # 请在此实现\n    ___\n\nres = parse_agent_action('Thought: 需要搜索\\nAction: search(\"机器学习\")')\nprint(res)\n",
            "setupCode": "",
            "expectedOutput": "('search', '机器学习')",
            "answer": "from typing import Optional, Tuple\nimport re\n\ndef parse_agent_action(model_output: str) -> Optional[Tuple[str, str]]:\n    m = re.search(r'Action:\\s*(\\w+)\\((.*?)\\)', model_output)\n    if m:\n        t_name = m.group(1)\n        t_arg = m.group(2).strip().strip('\"').strip(\"'\")\n        return (t_name, t_arg)\n    return None\n\nres = parse_agent_action('Thought: 需要搜索\\nAction: search(\"机器学习\")')\nprint(res)\n",
            "tests": "assert parse_agent_action(\"纯思考无动作\") is None\nassert parse_agent_action(\"Action: calc(1+1)\") == (\"calc\", \"1+1\")\n",
            "explanation": "利用正则表达式匹配 Action 标识符及括号内的工具名称与调用参数，并进行空白与引号剥离清洗。",
            "tags": ["Agent解析", "正则提取", "工具协议", "算法实战"],
            "related_lesson_id": "ml-app-l5-1",
        },
    ]

    return chapter(
        chapter_id="ml-app-c5",
        course_id="ml-llm-applications",
        order=5,
        title="智能体（Agent）系统与工业综合 Capstone",
        goal="系统掌握 ReAct 闭环规划范式、Function Calling 协议，构建端到端工业级 RAG + Agent 综合知识库系统。",
        lessons=lessons,
        exercises=exercises,
    )
