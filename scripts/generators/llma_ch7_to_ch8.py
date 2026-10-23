# -*- coding: utf-8 -*-

"""

Python 大模型应用开发 - 章节 7 至 8 生成模块

包含：

  第 7 章：LlamaIndex 知识库索引与查询引擎实战

  第 8 章：贯穿式工业级实战：企业级智能文档 RAG 问答引擎

"""



CHAPTER_7 = {

    "id": "llma-c7",

    "courseId": "python-llm-applications",

    "order": 7,

    "title": "LlamaIndex 知识库索引与查询引擎实战",

    "goal": "掌握 LlamaIndex 数据连接、Document 与 Node 核心抽象；深刻理解 VectorStoreIndex、SummaryIndex 与 TreeIndex 多层次索引架构；掌握 QueryEngine 查询引擎与 Refine、Compact 响应合成模式；熟练运用 RAG Triad（忠实度、答案相关性、上下文纯净度）建立量化自动化评估闭环。",

    "lessons": [

        {

            "id": "llma-l7-1",

            "title": "LlamaIndex 数据摄取模型与多层次索引架构",

            "difficulty": 1,

            "content": """### 学习目标与先修要求



- **先修要求**：了解数据结构树与图、文档解析与分块概念。

- **能力目标**：

  1. 理解 LlamaIndex 相比 LangChain 更专注于数据接入、结构化组织与深度检索的架构定位；

  2. 深刻掌握 Document 与 Node 原子数据模型及其父子、前后邻接指针关系；

  3. 掌握 VectorStoreIndex、SummaryIndex 与 TreeIndex 的构建逻辑与场景选型。



---



### 一、LlamaIndex 的核心定位：专注数据结构化与高效检索



如果说 **LangChain** 的核心使命是成为“大模型应用的通用操作系统与工作流编排胶水”，那么 **LlamaIndex**（原 GPT Index）从诞生的第一天起，定位就极其垂直且深刻：**将外部私有、非结构化或半结构化数据，转化为适合大模型高效检索与推理的专用数据结构**。



```

┌────────────────────────────────────────────────────────┐

│  Data Connectors (数据读取层: SimpleDirectoryReader)    │ -> 摄取 PDF, Word, Markdown, SQL, Notion

├────────────────────────────────────────────────────────┤

│  Data Structure (文档原子切分: Document -> Node)        │ -> 建立父子文档关系、前后邻居双向指针

├────────────────────────────────────────────────────────┤

│  Indices (索引组织层: Vector / Summary / Tree / Table)  │ -> 构建向量索引、汇总摘要索引、层级树形索引

├────────────────────────────────────────────────────────┤

│  Query Engine (检索与合成层: Retriever + Synthesizer)  │ -> 检索召回、后置处理过滤、多样化响应合成

└────────────────────────────────────────────────────────┘

```



---



### 二、Document 与 Node：原子数据模型



在 LlamaIndex 中，数据抽象具有清晰的层级：

1. **`Document`**：代表整个物理文档（如一份 50 页的《员工手册.pdf》）。它持有全量文本、全局元数据（文件名、创建时间、作者、哈希校验值）；

2. **`Node`**：文档切片（Chunk）后的基本单元。**Node 是具备拓扑关系感知的智能切片**：

   - 每个 Node 内部不仅包含正文文本和独立元数据；

   - 内部包含 `relationships` 字典，记录其**父文档 ID (`PARENT`)**、**前一个切片 ID (`PREVIOUS`)** 以及 **后一个切片 ID (`NEXT`)**；

   - **工程价值**：当向量检索命中某一个短小的 Node 时，系统能够顺着指针立即扩展读取其前后的相邻上下文（Window Replacement 机制），彻底解决了“小块检索精度高但上下文不足，大块上下文足但检索精度差”的两难困境！



---



### 三、多层次索引（Indices）架构对比



#### 1. 向量存储索引（VectorStoreIndex）

最常用的标准索引。将所有 Nodes 进行向量化并存入向量库。查询时通过 Embedding 余弦相似度召回 Top-K 相关节点。适用于事实问答与特定问题检索。



#### 2. 汇总摘要索引（SummaryIndex / ListIndex）

将所有 Nodes 串联为一个序列列表。查询时不依赖向量相似度，而是全量遍历或全量加载所有节点。

**适用场景**：全局归纳总结任务（例如：“请用 500 字总结整份财报的核心财务亮点”）。



#### 3. 树形层级索引（TreeIndex）

自底向上逐层聚合的二叉树或多叉树结构：

- **叶子节点**：切分后的原始文档片段；

- **父节点**：由大模型自动对叶子节点进行摘要浓缩生成的总结；

- **根节点**：覆盖整篇文档的最高层总括；

- **查询路由**：从根节点自顶向下判断应该进入哪一个分支，大幅减少长文本全局检索时的 Token 消耗。

""",

            "tips": [

                {

                    "kind": "tip",

                    "text": "使用 HierarchicalNodeParser（层次化切分）配合 AutoMergingRetriever 是 LlamaIndex 的王牌模式：检索时用 128 Token 的小叶子块精确定位，组装 Prompt 时自动向上合并为 512 Token 的大父块。"

                },

                {

                    "kind": "note",

                    "text": "如果任务是宏观总结全文，千万不要用 VectorStoreIndex（它只会抽取出几段碎片）；应当选用 SummaryIndex 或 TreeIndex。"

                }

            ],

            "demos": [

                {

                    "title": "纯 Python 实现 Document-Node 原子数据模型与前后邻接指针链表结构",

                    "lang": "python",

                    "code": """# 纯 Python 实现 LlamaIndex 核心 Document-Node 关系感知数据模型

from typing import List, Dict, Optional



class SimpleDocument:

    '''高级文档封装'''

    def __init__(self, doc_id: str, text: str, metadata: dict = None):

        self.doc_id = doc_id

        self.text = text

        self.metadata = metadata or {}



class SimpleNode:

    '''具备父子与前后拓扑指针关系的智能文本块'''

    def __init__(self, node_id: str, text: str, parent_doc_id: str, metadata: dict = None):

        self.node_id = node_id

        self.text = text

        self.parent_doc_id = parent_doc_id

        self.metadata = metadata or {}

        # 关系拓扑字典

        self.prev_node_id: Optional[str] = None

        self.next_node_id: Optional[str] = None



class DocumentParser:

    @staticmethod

    def parse_to_nodes(doc: SimpleDocument, chunk_size: int = 40) -> List[SimpleNode]:

        raw_text = doc.text.strip()

        chunks = [raw_text[i:i+chunk_size] for i in range(0, len(raw_text), chunk_size)]

        

        nodes: List[SimpleNode] = []

        for idx, piece in enumerate(chunks):

            node_id = f"{doc.doc_id}_node_{idx}"

            node = SimpleNode(

                node_id=node_id,

                text=piece,

                parent_doc_id=doc.doc_id,

                metadata={**doc.metadata, "chunk_index": idx}

            )

            nodes.append(node)

            

        # 构建双向链表邻居指针

        for i in range(len(nodes)):

            if i > 0:

                nodes[i].prev_node_id = nodes[i-1].node_id

            if i < len(nodes) - 1:

                nodes[i].next_node_id = nodes[i+1].node_id

                

        return nodes



# 1. 模拟摄取一篇文档

doc = SimpleDocument(

    doc_id="tech_spec_001",

    text="高可用微服务架构指南：第一部分服务网关负责鉴权限流。第二部分业务服务采用容器化部署。第三部分监控告警全面接入 Prometheus。",

    metadata={"author": "架构委员会", "version": "1.0"}

)



# 2. 切分并建立关系

nodes = DocumentParser.parse_to_nodes(doc, chunk_size=28)



print(f"=== 成功生成 {len(nodes)} 个具备关系感知的 Nodes ===")

for n in nodes:

    print(f"Node: {n.node_id}")

    print(f"  内容: '{n.text}'")

    print(f"  前驱指针: {n.prev_node_id} | 后继指针: {n.next_node_id}")

    print(f"  所属父文档: {n.parent_doc_id}")



# 验证双向指针正确性

assert nodes[0].prev_node_id is None

assert nodes[0].next_node_id == nodes[1].node_id

assert nodes[1].prev_node_id == nodes[0].node_id

print("\\n[OK] Document-Node 拓扑模型验证通过！")

"""

                }

            ]

        },

        {

            "id": "llma-l7-2",

            "title": "查询引擎 (QueryEngine)、响应合成与 RAG 评估闭环 (Evaluation)",

            "difficulty": 2,

            "content": """### 学习目标与先修要求



- **先修要求**：掌握大模型 Prompt 提示生成机制、评估指标（Precision / Recall）。

- **能力目标**：

  1. 掌握 LlamaIndex 查询引擎的核心执行管道（检索 -> 过滤 -> 响应合成）；

  2. 深入辨析 **Compact** 与 **Refine** 响应合成模式的技术机理与性能取舍；

  3. 掌握 **RAG Triad（检索评估三元组）**：忠实度（Faithfulness）、答案相关性（Answer Relevance）与上下文相关性（Context Relevance）的自动化评测工程。



---



### 一、查询引擎核心管道与响应合成（Response Synthesis）



当检索器（Retriever）召回了 Top-K 个 Node 后，如何利用大模型把这些碎片拼接成一篇通顺、严谨的回答？LlamaIndex 提供了多种**响应合成（Response Synthesizer）**模式：



```

                检索召回的 N 个相关文本块 [Node 1, Node 2, ..., Node N]

                                   │

         ┌─────────────────────────┴─────────────────────────┐

         ▼                                                   ▼

【Compact 模式 (紧凑单次生成)】                       【Refine 模式 (迭代循环精炼)】

- 尽可能将多个 Node 合并在单个 Prompt                - Step 1: LLM(Node 1) -> 生成初始回答 A1

- 一次请求大模型生成最终答案                        - Step 2: LLM(Node 2 + A1) -> 润色修正为 A2

- 【特点】: 速度最快，Token 成本最低                 - ...

- 【适用】: 绝大多数标准事实问答                      - 【特点】: 深度推导，精度极高，但延迟与成本高

```



#### 四大合成模式剖析：

1. **`compact`（默认推荐）**：紧凑模式。充分利用当前大模型的最大上下文窗口，尽可能打包所有 Node 一次性提问。速度快、成本低，是 90% 生产场景的首选；

2. **`refine`**：精炼迭代模式。先用第 1 个 Node 生成初始答案，再将初始答案与第 2 个 Node 一起喂给模型：“根据新的背景知识，请对之前的答案进行补充或纠错”。循环直至处理完所有 Node。虽然精度最高，但耗时呈线性增加；

3. **`tree_summarize`**：递归树形汇总模式。自底向上两两分组浓缩摘要，直至得到根部最终答案；

4. **`accumulate`**：对每个 Node 分别生成一个独立小答案，最后做列表拼接。



---



### 二、RAG 评估三元组（The RAG Triad - TruLens / LlamaIndex）



很多企业在做 RAG 时只看肉眼 demo，上线后面对用户真实提问频频翻车。**必须建立自动化的持续评估体系**。业内公认的 RAG 评估黄金三元组包含：



```

                     ┌────────────────────────────────┐

                     │          用户提问 (Query)       │

                     └───────┬────────────────┬───────┘

                             │                │

            Context Relevance│                │Answer Relevance

            (上下文相关度)    │                │(答案相关度)

                             ▼                ▼

       ┌───────────────────────────┐    ┌───────────────────────────┐

       │   召回上下文 (Context)    ├───>│     最终回答 (Response)   │

       └───────────────────────────┘    └───────────────────────────┘

                             ▲                │

                             └────────────────┘

                                Faithfulness

                                (忠实度 / 幻觉率)

```



1. **忠实度（Faithfulness / Groundedness）**：

   - 衡量：最终回答中的每一个事实论断，是否能从检索到的 Context 中直接推导出来？

   - 目的：**严密监控事实性幻觉（Hallucination）**。若回答包含 Context 中未提及的内容，忠实度扣分；

2. **答案相关性（Answer Relevance）**：

   - 衡量：最终回答是否真正回答了用户提问的痛点，是否存在答非所问或车轱辘话；

3. **上下文相关性（Context Relevance）**：

   - 衡量：检索器召回的 Nodes 是不是都是有价值的信息，是否夹杂了过多无关噪音（低噪声意味着高检索精度）。

""",

            "tips": [

                {

                    "kind": "tip",

                    "text": "使用大模型作为裁判（LLM-as-a-Judge）对 Faithfulness 进行打分是业内最主流的高性价比自动化回归评估方案。"

                },

                {

                    "kind": "warning",

                    "text": "在低延迟在线客服系统里，严禁盲目使用 refine 模式，因为多次串行 LLM 调用会导致首字等待时间（TTFT）超过 5~10 秒。"

                }

            ],

            "demos": [

                {

                    "title": "纯 Python 实现 Refine 响应迭代精炼器与 Faithfulness 忠实度自动检测器",

                    "lang": "python",

                    "code": """# 纯 Python 实现 Refine 迭代精炼模式与忠实度 (Faithfulness) 校验模拟

from typing import List



class MockRefineSynthesizer:

    '''模拟 LlamaIndex Refine 迭代精炼响应合成'''

    def synthesize(self, query: str, nodes: List[str]) -> str:

        if not nodes:

            return "抱歉，未检索到相关内容。"

            

        # 1. 基于首个 Node 生成初始基线答案

        current_answer = f"根据初步资料：{nodes[0]}。"

        print(f"  [Step 1 初始回答]: {current_answer}")

        

        # 2. 依次利用后续 Node 进行逐轮迭代更新 (Refine)

        for i, extra_node in enumerate(nodes[1:], start=2):

            # 模拟模型根据新信息补充答案

            current_answer += f" 结合后续更新：{extra_node}。"

            print(f"  [Step {i} Refine 补充]: {current_answer}")

            

        return current_answer



class FaithfulnessEvaluator:

    '''模拟 RAG Triad 之忠实度评测器 (检查回答中的实体是否来源于上下文)'''

    @staticmethod

    def evaluate(context: str, response: str, key_facts: List[str]) -> tuple[float, list[str]]:

        unsupported = []

        for fact in key_facts:

            # 如果回答中提到了该事实，但在上下文 context 中完全不存在，判定为幻觉

            if fact in response and fact not in context:

                unsupported.append(fact)

                

        if not key_facts:

            return 1.0, []

        score = round((len(key_facts) - len(unsupported)) / len(key_facts), 2)

        return score, unsupported



# 模拟检索出的 2 个 Nodes

retrieved_nodes = [

    "公司成立于 2020 年，主营新能源智能底盘业务",

    "2023 年公司完成 B 轮融资，领投方为红杉资本"

]

full_context = " ".join(retrieved_nodes)



# 1. 运行 Refine 合成

print("=== 启动 Refine 迭代合成流程 ===")

synthesizer = MockRefineSynthesizer()

final_res = synthesizer.synthesize("介绍该公司的基本发展历程", retrieved_nodes)

print(f"\\n最终整合答案: {final_res}")



# 2. 忠实度评测

print("\\n=== 启动 Faithfulness 忠实度检测 ===")

# 案例 A: 忠实答案

score_a, unsupp_a = FaithfulnessEvaluator.evaluate(

    full_context,

    final_res,

    key_facts=["2020 年", "新能源智能底盘", "B 轮融资"]

)

print(f"用例 A (真实推导) 忠实度得分: {score_a * 100:.0f}%, 未支持断言: {unsupp_a}")

assert score_a == 1.0



# 案例 B: 存在幻觉的回答 (虚构了上市)

hallucinated_res = final_res + " 并于 2024 年在纳斯达克成功敲钟上市。"

score_b, unsupp_b = FaithfulnessEvaluator.evaluate(

    full_context,

    hallucinated_res,

    key_facts=["2020 年", "纳斯达克成功敲钟上市"]

)

print(f"用例 B (包含幻觉) 忠实度得分: {score_b * 100:.0f}%, 抓出幻觉事实: {unsupp_b}")

assert score_b < 1.0

assert "纳斯达克成功敲钟上市" in unsupp_b



print("\\n[OK] Refine 响应合成与忠实度校验算法验证通过！")

"""

                }

            ]

        }

    ],

    "exercises": [

        {

            "id": "llma-ex-49",

            "type": "single",

            "difficulty": 1,

            "question": "在 LlamaIndex 的核心数据模型中，关于 Document 与 Node 的区别，下列描述最准确的是哪一项？",

            "options": [

                {"value": "A", "label": "Document 代表一个物理文件或整篇文档，而 Node 是文档经过切片后具备关系指针（如父文档、前后邻居）的原子单元"},

                {"value": "B", "label": "Document 只能存储图片，Node 只能存储纯数字"},

                {"value": "C", "label": "两者没有任何区别，纯粹是同一对象的两个别名"},

                {"value": "D", "label": "Node 是整个 Python 项目的根目录，Document 是子模块"}

            ],

            "answer": "A",

            "explanation": "在 LlamaIndex 中，Document 是物理文件或数据源的高层封装；Node 是由 Document 分割而成的原子文本块，Node 内部持有指向父文档、前驱和后继切片的双向拓扑指针。",

            "tags": ["LlamaIndex", "Document", "Node"]

        },

        {

            "id": "llma-ex-50",

            "type": "single",

            "difficulty": 2,

            "question": "在 LlamaIndex 的响应合成模式中，Refine 模式的工作原理是怎样的？",

            "options": [

                {"value": "A", "label": "把所有节点压缩在一行文本里一次性发送给模型"},

                {"value": "B", "label": "先使用第 1 个节点生成初始答案，随后依次将其与后续节点一起送入模型进行迭代修正和增量补充，直至遍历完全部节点"},

                {"value": "C", "label": "对每个节点随机删除一半字符以节省 Token"},

                {"value": "D", "label": "直接跳过大模型，纯靠正则表达式提取"}

            ],

            "answer": "B",

            "explanation": "Refine 模式采用串行迭代精炼流程：利用第 1 个 Node 生成基线回答，之后逐个结合后续 Node，让模型针对新信息对上一步答案进行更新（Update/Refine），生成的质量极高，但耗时随节点数线性增长。",

            "tags": ["Refine", "响应合成", "LlamaIndex"]

        },

        {

            "id": "llma-ex-51",

            "type": "single",

            "difficulty": 2,

            "question": "在衡量企业级 RAG 问答质量的 RAG Triad（三元组评估体系）中，忠实度（Faithfulness / Groundedness）专门用于检测什么？",

            "options": [

                {"value": "A", "label": "检测网络请求的 HTTP 状态码是否为 200"},

                {"value": "B", "label": "检测大模型生成的最终答案中的各项断言，是否完全忠实于检索到的参考上下文（Context），以此严密拦截事实性幻觉"},

                {"value": "C", "label": "检测用户的提问是否符合国家语言规范"},

                {"value": "D", "label": "检测 Python 解释器的运行版本"}

            ],

            "answer": "B",

            "explanation": "Faithfulness（忠实度 / 真实归因性）核心度量模型回答是否完全基于检索到的上下文证据支持。任何未在 Context 中出现但被模型臆想出的事实，都会被认定为幻觉并扣减忠实度得分。",

            "tags": ["Faithfulness", "RAG Triad", "幻觉评估"]

        },

        {

            "id": "llma-ex-52",

            "type": "judge",

            "difficulty": 1,

            "question": "在 LlamaIndex 中，HierarchicalNodeParser（层次化节点切分）的设计初衷是：使用较小粒度的切片保证向量相似度检索的命中准确率，而在组装送入大模型 Prompt 时自动合并为其对应的大父节点以提供充沛上下文。",

            "options": [

                {"value": "true", "label": "正确"},

                {"value": "false", "label": "错误"}

            ],

            "answer": "true",

            "explanation": "这是解决 RAG“切分粒度两难困境”的经典高级技巧：检索时小 Chunk 向量更纯粹、匹配度最高；送给大模型生成时自动合并为其父级大 Chunk（Parent Document Retrieval），保证上下文连贯完整。",

            "tags": ["层次化切分", "AutoMerging", "最佳实践"]

        },

        {

            "id": "llma-ex-53",

            "type": "fill",

            "difficulty": 2,

            "question": "在 LlamaIndex 查询引擎生命周期中，位于检索器（Retriever）召回之后、送入响应合成器之前，负责对候选节点执行去重、元数据过滤或 Cross-Encoder 重排的组件类型统称为 _________。",

            "blanks": [["NodePostprocessor", "NodePostProcessor"]],

            "explanation": "NodePostprocessor（节点后置处理器）专门用于在候选节点送给大模型合成前，进行动态过滤（如相似度阈值过滤、关键词过滤、时间衰减）或基于 Rerank 模型重新打分排序。",

            "tags": ["NodePostprocessor", "后置处理", "架构设计"]

        },

        {

            "id": "llma-ex-54",

            "type": "multiple",

            "difficulty": 2,

            "question": "关于 LlamaIndex 中 SummaryIndex（列表/汇总索引）与 TreeIndex（树形索引）的适用场景，下列说法正确的有哪些？",

            "options": [

                {"value": "A", "label": "当需要对超长年报或技术白皮书进行全局宏观总结时，SummaryIndex 能够遍历全量文本片段避免漏掉章节"},

                {"value": "B", "label": "TreeIndex 适合自顶向下层级路由检索，能够通过多级摘要逐层导航到特定子树分支"},

                {"value": "C", "label": "查找某个精确设备零部件价格的极速事实问答，应该首选 VectorStoreIndex 而非 TreeIndex"},

                {"value": "D", "label": "SummaryIndex 强制要求必须安装 GPU 显卡才能运行"}

            ],

            "answer": ["A", "B", "C"],

            "explanation": "SummaryIndex 适用于宏观全文总结；TreeIndex 适用于层级树状导航；精确事实问答首选向量索引 VectorStoreIndex。选项 D 纯属捏造。",

            "tags": ["SummaryIndex", "TreeIndex", "索引选型"]

        },

        {

            "id": "llma-ex-55",

            "type": "multiple",

            "difficulty": 2,

            "question": "在企业级 RAG 问答落地项目中，导致最终回答质量低下（如产生事实性错误、车轱辘话或答非所问）的根本原因通常包括哪些？",

            "options": [

                {"value": "A", "label": "检索召回率不足（Retrieval Recall Failure）：真正包含答案的关键文档压根没有被检索出来"},

                {"value": "B", "label": "上下文噪声过多（Context Noise）：检索器带出了大量不相关的杂质，干扰了大模型生成"},

                {"value": "C", "label": "格式截断或丢失（Format Truncation）：切分阶段暴力截断了包含答案的连续句子或关键表格"},

                {"value": "D", "label": "知识库中的文档字数超过了 10 个字"}

            ],

            "answer": ["A", "B", "C"],

            "explanation": "导致 RAG 失败的三大元凶是：检索漏召回（未找到）、噪声过载（注意力稀释）、切片损伤（表格或长句被生硬截断）。选项 D 无稽之谈。",

            "tags": ["故障排查", "RAG 痛点", "质量优化"]

        },

        {

            "id": "llma-ex-56",

            "type": "code",

            "difficulty": 3,

            "question": "请编写一个名为 `compact_synthesizer` 的文本响应合成函数。要求：接受三个参数：用户问题 `query` (str)、检索召回的文本片段列表 `contexts` (list[str])，以及单次最大允许的上下文字符预算 `max_chars` (int)；如果 contexts 为空，直接返回 '未检索到相关内容'；否则按顺序尽量将片段追加合并进 context 字符串中（各片段之间用换行隔开），保证合并后的 context 长度不超过 max_chars；最后返回组装完成的 Prompt 字符串格式：`[参考知识]\\n{merged_context}\\n\\n[用户提问]\\n{query}`。",

            "setupCode": "",

            "answer": "def compact_synthesizer(query: str, contexts: list[str], max_chars: int) -> str:\n    if not contexts:\n        return '未检索到相关内容'\n    \n    merged_pieces = []\n    current_len = 0\n    for c in contexts:\n        c_clean = c.strip()\n        if not c_clean:\n            continue\n        # 考虑换行符占 1 个字符\n        added_len = len(c_clean) + (1 if merged_pieces else 0)\n        if current_len + added_len <= max_chars:\n            merged_pieces.append(c_clean)\n            current_len += added_len\n        else:\n            # 超出预算停止容纳\n            break\n            \n    if not merged_pieces:\n        merged_context = contexts[0][:max_chars]\n    else:\n        merged_context = '\\n'.join(merged_pieces)\n        \n    return f\"[参考知识]\\n{merged_context}\\n\\n[用户提问]\\n{query}\"\n",

            "tests": "# 测试用例 1: 预算充足，容纳所有块\nctxs = ['知识点A: Python 协程', '知识点B: 事件循环']\nres1 = compact_synthesizer('协程原理是什么？', ctxs, max_chars=100)\nassert '知识点A: Python 协程' in res1\nassert '知识点B: 事件循环' in res1\nassert '[用户提问]\\n协程原理是什么？' in res1\n\n# 测试用例 2: 预算有限，截断第 2 个块\nres2 = compact_synthesizer('问题', ctxs, max_chars=20)\nassert '知识点A: Python 协程' in res2\nassert '知识点B: 事件循环' not in res2\n\n# 测试用例 3: 空输入测试\nassert compact_synthesizer('问题', [], max_chars=100) == '未检索到相关内容'\n\nprint('compact_synthesizer test cases passed!')\n",

            "explanation": "实现紧凑型响应合成器（Compact Synthesizer），在字符预算 max_chars 限制内按序尽可能容纳更多上下文片段，超过预算时提前截断并组装 Prompt。",
            "tags": ["Compact 合成", "上下文预算", "编程实战"]

        }

    ]

}



CHAPTER_8 = {

    "id": "llma-c8",

    "courseId": "python-llm-applications",

    "order": 8,

    "title": "贯穿式工业级实战：企业级智能文档 RAG 问答引擎",

    "goal": "串联全课程高阶技能，从零纯手写搭建一个生产级企业知识库 RAG 问答引擎：涵盖多源文本预处理、层次化元数据切块、BM25 + 向量双路混合检索、RRF 倒数排名融合、安全阈值置信度拒答、段落级引用溯源（Citation）与自动化测试矩阵回归验证。",

    "lessons": [

        {

            "id": "llma-l8-1",

            "title": "企业级 RAG 全链路工程架构设计与拒答溯源机制",

            "difficulty": 1,

            "content": """### 学习目标与先修要求



- **先修要求**：熟练掌握前 7 章内容（API 调度、结构化验证、安全提示词、切块、向量、混合检索、评估）。

- **能力目标**：

  1. 掌握企业级 RAG 系统的完整端到端架构拓扑与数据流动闭环；

  2. 深刻掌握大模型“严格拒答机制（Refusal Fallback）”的设定逻辑，彻底终结幻觉风险；

  3. 掌握段落级引用溯源（Source Citation & Attribution）的设计与抽取规范。



---



### 一、生产级企业 RAG 系统的全链路架构全景图



一个能够经受住真实商业生产考验的 RAG 知识库系统，绝不是“把文本存进向量库再做个搜索”那么简单。它是一条具备**多重防卫、多路融合与闭环校验**的综合流水线：



```

                    ┌────────────────────────────────┐

                    │      非结构化文档 / 手册入库    │

                    └───────────────┬────────────────┘

                                    ▼

                    ┌────────────────────────────────┐

                    │  智能清洗分块 + 结构化元数据注入│

                    └───────────────┬────────────────┘

                                    ▼

                ┌───────────────────┴───────────────────┐

                ▼                                       ▼

     [建立 BM25 稀疏倒排索引]                [计算 Embedding 存入向量索引]

                │                                       │

                └───────────────────┬───────────────────┘

                                    │

                                    ▼

                    ┌────────────────────────────────┐

                    │         用户在线提问 Query      │

                    └───────────────┬────────────────┘

                                    ▼

                    ┌────────────────────────────────┐

                    │  查询意图解析与关键词扩展规范   │

                    └───────────────┬────────────────┘

                                    ▼

                    ┌────────────────────────────────┐

                    │  双路混合并行检索 + RRF 倒数融合 │

                    └───────────────┬────────────────┘

                                    ▼

                    ┌────────────────────────────────┐

                    │  相关性置信度过滤 (阈值门禁)   │

                    └───────┬────────────────┬───────┘

                            │                │

                      [低于安全阈值]    [高于安全阈值]

                            │                │

                            ▼                ▼

                     【优雅标准拒答】  【组装引用 Prompt】

                    ("知识库中未收录...")      │

                                              ▼

                                       【大模型安全生成】

                                              │

                                              ▼

                                       【输出带 [Doc X] 引用来源】

```



---



### 二、真实业务第一天条：严格置信度过滤与优雅拒答



在严肃企业场景（法律合规、医疗诊断、金融理财、企业内部规章）中，**“胡说八道”的代价远高于“承认不知道”**。

大语言模型的天性是取悦用户，即使在上下文中找不到任何事实，它也倾向于利用自己的预训练通识强行编造一个看似合理的答案。



#### 生产级拒答防御机制：

1. **检索层置信度硬截断（Retrieval Confidence Gate）**：

   - 如果 RRF 融合后排名第一的候选文档，其原始相似度得分（或 BM25 词频匹配度）低于预设安全阈值（例如余弦相似度 < 0.65 或关键词命中数为 0）；

   - **系统直接在检索层截断，不调用大模型**！直接向前端返回统一友好的拒答模板：

     > *"抱歉，在现有企业知识库中未检索到与您的问题直接相关的内容。为了保证信息的严谨性，建议您联系相关业务负责人人工确认。"*

   - **收益**：不仅 100% 杜绝了事实幻觉，还直接节约了该次大模型生成的 Token 费用与网络延迟！

2. **提示词层硬约束（Prompt Guardrail）**：

   - 在 Prompt 中明确规定：“你的所有推导必须且仅能来自提供的 `<context>` 标签内容。若文档未直接涉及，请明确说明无法回答，禁止使用你自身的外部记忆猜测。”



---



### 三、精准引用溯源（Source Citation Attribution）



为了赢得用户信任并支持审计复核，现代企业 RAG 系统生成的每一条结论都必须**指名道姓、标明出处**。

- **引用标记格式**：在 Prompt 中指令模型在引用某篇文档时，在句子末尾追加 `[参考: 文档编号]`（如 `[Doc 1]`）；

- **后端溯源抽取**：后端解析出回答中的所有 `[Doc i]` 标签，对应返回该文档的具体元数据（源文件名、作者、章节名、原文片段）。前端界面将 `[Doc 1]` 渲染为可点击的小气泡，用户点击即可弹窗高亮查看知识库原始出处！

""",

            "tips": [

                {

                    "kind": "tip",

                    "text": "对于拒答阈值，建议从 0.60 逐渐向上调优，并在真实业务日志中统计拒答率（Refusal Rate）与用户纠错率以取得最佳平衡。"

                },

                {

                    "kind": "note",

                    "text": "在引用溯源时，不要让大模型直接输出源文件的完整长路径，这样容易导致模型因微小笔误拼写错路径；应给文档编简短代号（Doc 1, Doc 2），由代码在外部做准确映射。"

                }

            ],

            "demos": [

                {

                    "title": "带置信度门禁截断与段落级溯源引用的生产级 RAG 生成引擎实战",

                    "lang": "python",

                    "code": """# 纯 Python 演示生产级 RAG 检索置信度门禁、优雅拒答与引用溯源提取流水线
from typing import Dict, List, Any

class ProductionRAGEngine:
    '''工业级知识库问答引擎核心骨架'''
    def __init__(self, confidence_threshold: float = 0.5):
        self.confidence_threshold = confidence_threshold
        self.knowledge_base = [
            {"id": "doc_101", "title": "差旅报销制度.pdf", "text": "国内差旅住宿标准：一线城市每人每天不超过 500 元，凭发票实报实销。"},
            {"id": "doc_102", "title": "考勤打卡规范.pdf", "text": "弹性工时制度：核心工作时间为 10:00 至 16:00，全天需打卡满 8 小时。"}
        ]

    def mock_retrieve(self, query: str) -> List[Dict[str, Any]]:
        results = []
        domain_terms = ["差旅", "住宿", "标准", "报销", "工时", "打卡", "弹性"]
        matched_terms = [t for t in domain_terms if t in query]
        for doc in self.knowledge_base:
            if not matched_terms:
                score = 0.0
            else:
                hit_count = sum(1 for t in matched_terms if t in doc["text"])
                score = round(hit_count / len(matched_terms), 2)
            results.append({**doc, "score": score})
        results.sort(key=lambda x: x["score"], reverse=True)
        return results

    def query(self, user_question: str) -> Dict[str, Any]:
        ranked_docs = self.mock_retrieve(user_question)
        top_doc = ranked_docs[0]
        
        if top_doc["score"] < self.confidence_threshold:
            return {
                "answer": "抱歉，在现有企业知识库中未检索到与您的问题直接相关的内容。为了保证严谨性，建议您咨询 HR 部门人工确认。",
                "is_refused": True,
                "confidence_score": top_doc["score"],
                "citations": []
            }
            
        valid_docs = [d for d in ranked_docs if d["score"] >= self.confidence_threshold]
        context_parts = []
        doc_map = {}
        for idx, doc in enumerate(valid_docs, start=1):
            tag = f"[Doc {idx}]"
            doc_map[tag] = {"doc_id": doc["id"], "title": doc["title"], "snippet": doc["text"]}
            context_parts.append(f"{tag} ({doc['title']}): {doc['text']}")
            
        simulated_llm_answer = (
            "根据规定，一线城市的国内差旅住宿报销上限为每天 500 元，需要凭合法发票实报实销 [Doc 1]。"
        )
        
        citations = []
        for tag in doc_map:
            if tag in simulated_llm_answer:
                citations.append(doc_map[tag])
                
        return {
            "answer": simulated_llm_answer,
            "is_refused": False,
            "confidence_score": top_doc["score"],
            "citations": citations
        }

engine = ProductionRAGEngine(confidence_threshold=0.5)

print("=== 场景 1: 提问知识库明确覆盖的问题 ===")
res1 = engine.query("国内差旅住宿标准是多少？")
print(f"回答内容: {res1['answer']}")
print(f"置信度得分: {res1['confidence_score']}")
print(f"引用出处溯源: {res1['citations']}")
assert res1['is_refused'] is False
assert len(res1['citations']) > 0

print()
print("=== 场景 2: 提问知识库未收录的问题 (超纲) ===")
res2 = engine.query("公司是否给研发人员免费发放量子计算机？")
print(f"回答内容: {res2['answer']}")
print(f"是否安全拒答: {res2['is_refused']}")
assert res2['is_refused'] is True
assert len(res2['citations']) == 0

print()
print("[OK] 生产级门禁与引用溯源流水线验证通过！")
"""

                }

            ]

        },

        {

            "id": "llma-l8-2",

            "title": "知识库全流程端到端组装与自动化回归评估",

            "difficulty": 2,

            "content": """### 学习目标与先修要求



- **先修要求**：掌握面向对象类设计、单元测试编写与断言验证。

- **能力目标**：

  1. 完成模块化解耦的企业级 RAG 系统端到端纯 Python 组装；

  2. 搭建黄金回归评测集（Golden QA Dataset）并建立自动化打分基线；

  3. 掌握生产级性能调优技巧（向量索引预热、LRU 缓存与动态重排）。



---



### 一、企业级 RAG 系统的模块化工程落地



在规范的 Python 工业工程中，一个健康的 RAG 系统应拆分为四大清晰职责模块：



```

                    ┌──────────────────────────────────────────┐

                    │  1. DocumentLoader & ChunkingPreprocessor│ -> 负责文本提取、递归分块与元数据组装

                    ├──────────────────────────────────────────┤

                    │  2. HybridKnowledgeIndex (BM25 + Vector) │ -> 负责双路索引存储与高效向量化

                    ├──────────────────────────────────────────┤

                    │  3. RRF_RerankPipeline                  │ -> 负责多路召回融合与排序精挑

                    ├──────────────────────────────────────────┤

                    │  4. PromptSynthesis & GuardrailEngine   │ -> 负责门禁判断、Prompt 渲染与溯源校验

                    └──────────────────────────────────────────┘

```



---



### 二、黄金评测集（Golden QA Dataset）与自动化回归



在软件持续迭代中，当我们调整了切分大小（如 500 变 300）、更换了 Embedding 模型或修改了 System Prompt 时，**如何证明系统改动是“变好了”而不是“修了一个旧 bug 搞出五个新 bug”**？

答案是构建固化的**自动化回归黄金基准测试集**：



```json

[

  {

    "id": "qa_case_001",

    "question": "公司弹性打卡的最晚到岗时间是几点？",

    "expected_answer_keywords": ["10:00", "核心工作时间"],

    "expected_source_doc": "考勤打卡规范.pdf",

    "should_refuse": false

  },

  {

    "id": "qa_case_002",

    "question": "如何申请去月球基地的出差火箭票？",

    "expected_answer_keywords": [],

    "expected_source_doc": null,

    "should_refuse": true

  }

]

```

在 CI/CD 流水线中，每次提交代码自动运行全量基准用例，计算**准确率（Accuracy）**、**忠实度（Faithfulness）**与**安全拒答率（Safe Refusal Rate）**，只有综合得分超过阈值时才允许发布生产！

""",

            "tips": [

                {

                    "kind": "tip",

                    "text": "对于高频出现的常见问题（FAQ），可以在检索层前置挂载一层 Redis LRU 向量缓存，将常见问题的响应延迟从 2 秒降低到 5 毫秒！"

                },

                {

                    "kind": "note",

                    "text": "黄金评测集应当由产品经理、业务专家与工程师共同维护，并从生产真实脱敏的用户反馈工单中持续抽取长尾疑难 Case 补充。"

                }

            ],

            "demos": [

                {

                    "title": "端到端企业级 RAG 知识库系统组装与黄金数据集自动化回归测试套件",

                    "lang": "python",

                    "code": """# 纯 Python 实现端到端 RAG 引擎组装与 Golden QA 数据集自动化回归测试套件
from typing import List, Dict, Any

class EndToEndRAGSystem:
    '''端到端企业级 RAG 问答知识库核心引擎'''
    def __init__(self, corpus: List[Dict[str, str]], threshold: float = 0.3):
        self.corpus = corpus
        self.threshold = threshold

    def _hybrid_search(self, query: str) -> List[tuple[Dict[str, str], float]]:
        domain_terms = ["主板", "保修", "质保", "配件", "换新", "升级", "快照"]
        q_terms = [t for t in domain_terms if t in query]
        scored = []
        for doc in self.corpus:
            if not q_terms:
                score = 0.0
            else:
                hit = sum(1 for t in q_terms if t in doc["text"])
                score = round(hit / len(q_terms), 3)
            scored.append((doc, score))
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored

    def answer_question(self, question: str) -> Dict[str, Any]:
        scored_docs = self._hybrid_search(question)
        best_doc, best_score = scored_docs[0]
        
        if best_score < self.threshold:
            return {
                "answer": "知识库中未检索到相关内容，请咨询人工负责人。",
                "refused": True,
                "score": best_score,
                "source": None
            }
            
        return {
            "answer": f"根据规定：{best_doc['text']} [参考来源: {best_doc['title']}]",
            "refused": False,
            "score": best_score,
            "source": best_doc["title"]
        }

docs_repo = [
    {"title": "设备保修条款", "text": "核心主板享受 3 年官方质保，外设配件享受 1 年免费换新。"},
    {"title": "软件升级说明", "text": "系统支持 OTA 无线升级，重大版本更新前会自动创建本地快照。"}
]

engine = EndToEndRAGSystem(corpus=docs_repo, threshold=0.25)

golden_test_cases = [
    {
        "case_name": "主板保修期测试",
        "question": "主板保修几年？",
        "expected_keywords": ["3 年", "质保"],
        "expected_refused": False,
        "expected_source": "设备保修条款"
    },
    {
        "case_name": "超纲问题安全拒答测试",
        "question": "食堂今天中午吃什么菜？",
        "expected_keywords": [],
        "expected_refused": True,
        "expected_source": None
    }
]

print("=== 启动端到端 RAG 黄金数据集自动化回归测试 ===")
passed_count = 0
for case in golden_test_cases:
    res = engine.answer_question(case["question"])
    assert res["refused"] == case["expected_refused"]
    if not case["expected_refused"]:
        for kw in case["expected_keywords"]:
            assert kw in res["answer"]
        assert res["source"] == case["expected_source"]
    passed_count += 1

print()
print(f"[OK] 自动化回归完成：{passed_count}/{len(golden_test_cases)} 全部通过！")
"""

                }

            ]

        }

    ],

    "exercises": [

        {

            "id": "llma-ex-57",

            "type": "single",

            "difficulty": 1,

            "question": "在企业级严肃业务（如金融、法律、规章）RAG 系统中，设置严格的置信度阈值并在匹配度不足时主动“优雅拒答”，其最核心的业务价值是什么？",

            "options": [

                {"value": "A", "label": "为了故意激怒用户"},

                {"value": "B", "label": "在缺乏确凿事实证据时及时制止模型基于通识自信编造答案（事实性幻觉），杜绝合规与法律风险并降低无效 API 成本"},

                {"value": "C", "label": "为了让服务器 CPU 温度保持在绝对零度"},

                {"value": "D", "label": "没有任何价值，所有提问都应该强制胡乱回答"}

            ],

            "answer": "B",

            "explanation": "在严肃商业场景中，“知之为知之，不知为不知”至关重要。严密门禁和拒答策略能防止模型在缺乏上下文证据时编造虚假信息，守护数据真实性与法律合规底线。",

            "tags": ["置信度门禁", "优雅拒答", "企业级 RAG"]

        },

        {

            "id": "llma-ex-58",

            "type": "single",

            "difficulty": 1,

            "question": "在 RAG 系统的回答生成中，要求模型在事实论断末尾附加 [Doc X] 等引用标记（Citation Attribution）的主要目的不包括哪一项？",

            "options": [

                {"value": "A", "label": "支持用户一键溯源并核验原始知识出处，增强回答的透明度与信任感"},

                {"value": "B", "label": "方便后端审计复核问答逻辑是否忠实于企业规章"},

                {"value": "C", "label": "能够将底层数据库的所有管理员密码明文展示给前端普通用户"},

                {"value": "D", "label": "降低业务人员定位原始规章制度变更的工作量"}

            ],

            "answer": "C",

            "explanation": "引用溯源的核心价值是可解释性、可验证性与增强用户信任。选项 C 是严重的安全泄露漏洞，绝不是引用的目的。",

            "tags": ["引用溯源", "Citation", "合规审计"]

        },

        {

            "id": "llma-ex-59",

            "type": "single",

            "difficulty": 2,

            "question": "在高级 RAG 架构中，检索前往往会执行一步“查询改写与扩展（Query Rewriting / Expansion）”，这步操作的主要动机是什么？",

            "options": [

                {"value": "A", "label": "把用户的提问直接改成固定的 'Hello'"},

                {"value": "B", "label": "用户原始提问通常简短、口语化或包含代词（如'那它怎么退款'），通过改写补全上下文指代和同义关键词，能显著提升检索召回精度"},

                {"value": "C", "label": "为了故意拖延网络响应时间"},

                {"value": "D", "label": "自动删除用户账号"}

            ],

            "answer": "B",

            "explanation": "真实用户的提问往往很短，或者在多轮对话中充满隐式指代（如“这个怎么报销”、“它有什么限制”）。Query Rewriting 利用轻量大模型将模糊代词还原为完整实体并补充行业同义词，从而大幅改善向量和 BM25 检索命中率。",

            "tags": ["Query Rewriting", "查询扩展", "RAG 进阶"]

        },

        {

            "id": "llma-ex-60",

            "type": "judge",

            "difficulty": 1,

            "question": "在面向企业内部员工规章的 RAG 知识库中，宁可让系统在检索证据不足时明确告知'未检索到相关内容并建议人工确认'，也绝不能让大模型自由发挥给出看似顺畅但毫无事实依据的幻觉回答。",

            "options": [

                {"value": "true", "label": "正确"},

                {"value": "false", "label": "错误"}

            ],

            "answer": "true",

            "explanation": "企业知识库的生命线在于准确性与可信度。一旦用户发现系统自信地给出了与公司实际规章完全相反的虚假答案，该系统的信誉将彻底破产。",

            "tags": ["企业合规", "事实幻觉", "核心原则"]

        },

        {

            "id": "llma-ex-61",

            "type": "fill",

            "difficulty": 2,

            "question": "在 RAG 系统的版本迭代与上线前，用于衡量系统是否发生精度倒退并固化历史典型 Case 的基准评测数据集，在软件工程中通常被称为 _________ Dataset（黄金测试集）。",

            "blanks": [["Golden", "golden"]],

            "explanation": "Golden Dataset（黄金数据集）包含真实业务提问、预期参考回答、预期来源文档及边界拒答用例，是研发与发布前自动化回归测试的基准铁律。",

            "tags": ["Golden Dataset", "基准评测", "软件工程"]

        },

        {

            "id": "llma-ex-62",

            "type": "multiple",

            "difficulty": 2,

            "question": "在长周期运行的企业级 RAG 系统中，为了防止知识库内容过时失效（Knowledge Staleness），推荐的生命周期管理方案包括哪些？",

            "options": [

                {"value": "A", "label": "在文档元数据中记录更新时间戳（last_updated）与失效日期（expiry_date），支持时间衰减或硬过期过滤"},

                {"value": "B", "label": "对所有切片计算哈希值（Doc Hash），文件内容未变时跳过重复嵌入计算，内容变更时增量更新"},

                {"value": "C", "label": "建立旧版本文档软删除（Soft Delete）与归档机制，避免历史作废规章干扰最新版检索"},

                {"value": "D", "label": "禁止任何人对知识库文件做任何编辑或更新"}

            ],

            "answer": ["A", "B", "C"],

            "explanation": "企业知识库是动态演化的。通过哈希去重增量入库、时间戳元数据过滤、以及旧版本归档软删除，能保证知识库的时效性与新鲜度。选项 D 违反现实业务常理。",

            "tags": ["生命周期管理", "知识更新", "增量同步"]

        },

        {

            "id": "llma-ex-63",

            "type": "multiple",

            "difficulty": 2,

            "question": "构建高质量的企业级 RAG 黄金测试集（Golden QA Dataset）时，测试样本应当全面覆盖哪些典型场景？",

            "options": [

                {"value": "A", "label": "正向标准事实问答用例（能在单一文档切片内找到明确答案）"},

                {"value": "B", "label": "跨文档多步综合推导用例（需要结合两篇以上文档才能完整回答）"},

                {"value": "C", "label": "超纲或无关提问负例（检验系统能否准确识别并执行安全拒答）"},

                {"value": "D", "label": "包含提示词注入攻击意图的对抗性用例（检验系统安全防御与隔离有效性）"}

            ],

            "answer": ["A", "B", "C", "D"],

            "explanation": "完整的黄金测试集必须兼备广度与深度：既要有单一事实与多跳综合（Multi-hop）正例，也要有越界超纲负例（拒答测试）以及对抗注入攻击测试（安全防御测试）。",

            "tags": ["Golden Dataset", "测试用例设计", "全覆盖"]

        },

        {

            "id": "llma-ex-64",

            "type": "code",

            "difficulty": 3,

            "question": "请编写一个名为 `production_rag_router` 的安全问答路由函数。要求：接受三个参数：用户问题 `question` (str)、检索出的相关文档列表 `docs`（每个文档为字典格式 `{'id': str, 'text': str, 'score': float}`），以及最小置信度阈值 `min_score` (float)；如果 docs 为空，或者 docs 中所有文档的 score 都严格小于 min_score，则返回字典 `{'status': 'REFUSED', 'output': '知识库中未检索到相关内容。', 'source_ids': []}`；否则，挑选所有 score >= min_score 的文档，提取其 id 列表，并返回字典 `{'status': 'ANSWERED', 'output': f'根据资料，解答如下：{docs[0][\"text\"]} [来源: {docs[0][\"id\"]}]', 'source_ids': 符合阈值的doc_id列表}`。",

            "setupCode": "",

            "answer": "def production_rag_router(question: str, docs: list[dict], min_score: float) -> dict:\n    valid_docs = [d for d in docs if d.get('score', 0.0) >= min_score]\n    if not valid_docs:\n        return {\n            'status': 'REFUSED',\n            'output': '知识库中未检索到相关内容。',\n            'source_ids': []\n        }\n    \n    # 挑选得分最高的合格文档\n    valid_docs.sort(key=lambda x: x.get('score', 0.0), reverse=True)\n    top_doc = valid_docs[0]\n    source_ids = [d['id'] for d in valid_docs]\n    \n    return {\n        'status': 'ANSWERED',\n        'output': f\"根据资料，解答如下：{top_doc['text']} [来源: {top_doc['id']}]\",\n        'source_ids': source_ids\n    }\n",

            "tests": "# 测试用例 1: 正常命中高分文档\ndoc_list = [\n    {'id': 'DOC-1', 'text': '退货周期为 7 天。', 'score': 0.85},\n    {'id': 'DOC-2', 'text': '快递费自理。', 'score': 0.60}\n]\nres1 = production_rag_router('退货时间？', doc_list, min_score=0.7)\nassert res1['status'] == 'ANSWERED'\nassert res1['source_ids'] == ['DOC-1']\nassert 'DOC-1' in res1['output']\n\n# 测试用例 2: 所有文档低于阈值触发安全拒答\nres2 = production_rag_router('去火星多少钱？', doc_list, min_score=0.90)\nassert res2['status'] == 'REFUSED'\nassert res2['output'] == '知识库中未检索到相关内容。'\nassert res2['source_ids'] == []\n\n# 测试用例 3: 空文档列表\nres3 = production_rag_router('测试', [], min_score=0.5)\nassert res3['status'] == 'REFUSED'\nassert res3['source_ids'] == []\n\nprint('production_rag_router test cases passed!')\n",

            "explanation": "过滤所有得分大于等于 min_score 的有效候选文档并降序排序；如果合格列表为空则触发安全拒答，否则提取 top 文档内容并输出带来源引用的回答。",
            "tags": ["安全路由", "置信度门禁", "编程实战"]

        }

    ]

}
