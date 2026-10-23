# -*- coding: utf-8 -*-
"""
Python 大模型应用开发 - 章节 4 至 6 生成模块
包含：
  第 4 章：知识切片与高维向量嵌入数学本质
  第 5 章：向量检索、混合检索与重排算法
  第 6 章：LangChain 0.3+ 核心抽象与 LCEL 链式编排
"""

CHAPTER_4 = {
    "id": "llma-c4",
    "courseId": "python-llm-applications",
    "order": 4,
    "title": "知识切片与高维向量嵌入数学本质",
    "goal": "掌握长文档在 RAG 系统中的分块（Chunking）策略与元数据标记工程；深入理解向量嵌入（Embeddings）高维几何空间分布、余弦相似度与点积的数学推导；掌握 MTEB 国际基准榜单选型依据与工业级向量预处理流水线。",
    "lessons": [
        {
            "id": "llma-l4-1",
            "title": "文档预处理、切块算法 (Chunking) 与元数据设计",
            "difficulty": 1,
            "content": """### 学习目标与先修要求

- **先修要求**：掌握 Python 字符串切片与正则，理解长文本在模型处理中的延迟与成本痛点。
- **能力目标**：
  1. 理解长文本直接全量塞给大模型导致的“迷失在中间”（Lost in the Middle）与注意力稀释现象；
  2. 熟练掌握固定块、滑动窗口重叠（Chunk Overlap）、递归字符切分（Recursive Splitter）与语义切分；
  3. 掌握生产级文档元数据（Metadata）设计规范，为后续过滤与精准引用提供支撑。

---

### 一、为什么不能把整个长文档直接喂给模型？

很多初学者容易产生误解：“既然现在大模型上下文窗口（Context Window）已经支持 128K 甚至 1M Token，为什么还需要大费周章地把文档切碎做 RAG？”
在工业实践中，将超长文档全量塞入 Prompt 存在三大致命缺陷：

```
                ┌───────────────────────────────────────────┐
                │          10 万字企业规章 / 技术手册        │
                └─────────────────────┬─────────────────────┘
                                      ▼
      ┌───────────────────────────────────────────────────────────────┐
      │  痛点 1: 极度昂贵的 Token 成本与不可接受的首字延迟 (TTFT)     │
      │  痛点 2: 迷失在中间 (Lost in the Middle 效应) - 关注首尾忽略中段│
      │  痛点 3: 引入大量无关业务背景噪音，显著诱发模型产生事实性幻觉 │
      └───────────────────────────────────────────────────────────────┘
```

#### 迷失在中间（Lost in the Middle - Liu et al., Stanford 2023）：
研究表明，Transformer 的自注意力机制在长序列场景下，对位于提示词**最头部（Primacy Bias）**和**最尾部（Recency Bias）**的内容具有极高的检索和遵从能力；而隐藏在长上下文**中段（20%~80% 区域）**的关键信息，召回准确率会出现断崖式下跌！
**RAG 切片的核心使命**：将长文档切解为语义高度内聚的小文本块，仅把与用户问题最匹配的 3~5 个精纯片段精准提供给大模型。

---

### 二、主流文本切块（Chunking）策略对比

#### 1. 固定长度切块（Fixed-size Chunking）
简单粗暴地按固定字符数（如每 500 字一截断）。
**致命缺陷**：极易在句子、单词甚至一个完整的数值中间硬生生切断（例如把 `"售价：10000 元"` 切成前一块结尾 `"售价：10"` 与后一块开头 `"000 元"`），造成严重语义损坏。

#### 2. 滑动窗口带重叠切块（Chunk Overlap）
在相邻的文本块之间保留固定重叠步长（例如 `chunk_size=500`, `chunk_overlap=100`）。
**核心价值**：确保任何跨越切分边界的短语或事实断言，至少能完整出现在其中一个块内，避免上下文因边界断裂而丢失。

#### 3. 递归字符切分器（RecursiveCharacterTextSplitter）
业界最推崇的标准方案（LangChain 核心实现）。定义一组具有语义优先级的字符分隔符列表：
`separators = ["\n\n", "\n", "。", "！", "？", "；", " ", ""]`
- **优先在段落边界 `\n\n` 处切分**；
- 若段落过大超出 `chunk_size`，降级在换行符 `\n` 或中文句号处切分；
- 只有在长句仍超标时，才最终降级到单词空格或单个字符切分。
该策略最大限度保证了切分后每一个块内部自然语法的完整性。

#### 4. 语义切分（Semantic Chunking）
通过滑动计算相邻句子之间的 Embedding 向量余弦距离。当距离出现突变（超过设定的百分位阈值，如 90% 突变）时，判定为话题转换，就地执行语义断句。

---

### 三、生产级元数据（Metadata）设计规范

切片绝不仅是提取纯文本，**没有元数据的 Chunk 在生产环境中是灾难性的**。元数据字段设计规范建议包含：

```json
{
  "chunk_id": "doc_hr_policy_v2_chunk_014",
  "parent_doc_id": "doc_hr_policy_v2",
  "text": "员工年度带薪年假在入职满一年后生效，基础年假为 5 个工作日...",
  "metadata": {
    "source_file": "2026年度人力资源手册.pdf",
    "page_number": 12,
    "section_hierarchy": ["第一章 考勤管理", "第二节 休假规范"],
    "department": "HR",
    "last_updated": "2026-01-15",
    "chunk_index": 14,
    "token_count": 186
  }
}
```
**元数据价值**：支持后续向量数据库的“元数据预过滤”（例如：“只在 `department == 'HR'` 且 `year >= 2026` 的文档中检索”），大幅缩小搜索空间并消除过时信息干扰。
""",
            "tips": [
                {
                    "kind": "tip",
                    "text": "对于常见技术问答，建议将 chunk_size 设置在 300~600 Token 之间，chunk_overlap 保持在 10%~20%（约 50~100 Token）。"
                },
                {
                    "kind": "warning",
                    "text": "分块过小（如 < 100 Token）会导致碎片化缺乏上下文；分块过大（如 > 2000 Token）会导致向量表征模糊，显著降低检索匹配精度。"
                }
            ],
            "demos": [
                {
                    "title": "带优先级分隔符与滑动窗口重叠的纯 Python 递归分块器实战",
                    "lang": "python",
                    "code": """# 纯 Python 实现工业级递归文本分块器 (Recursive Text Splitter)
from typing import List, Dict, Any

class LightweightRecursiveSplitter:
    def __init__(self, chunk_size: int = 120, chunk_overlap: int = 30, separators: List[str] = None):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = separators or ["\\n\\n", "\\n", "。", "！", "？", " "]

    def split_text(self, text: str) -> List[str]:
        return self._split(text, self.separators)

    def _split(self, text: str, separators: List[str]) -> List[str]:
        if len(text) <= self.chunk_size:
            return [text] if text.strip() else []

        # 挑选当前最优分隔符
        chosen_sep = ""
        for sep in separators:
            if sep in text:
                chosen_sep = sep
                break

        # 如果没有分隔符可用，强制按字符切分
        if not chosen_sep:
            return [text[i:i+self.chunk_size] for i in range(0, len(text), self.chunk_size - self.chunk_overlap)]

        splits = text.split(chosen_sep)
        chunks = []
        current_chunk = ""

        remaining_seps = separators[separators.index(chosen_sep) + 1:] if chosen_sep in separators else []

        for piece in splits:
            candidate = f"{current_chunk}{chosen_sep}{piece}" if current_chunk else piece
            if len(candidate) <= self.chunk_size:
                current_chunk = candidate
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                # 若单段过长，降级递归切分
                if len(piece) > self.chunk_size and remaining_seps:
                    sub_chunks = self._split(piece, remaining_seps)
                    chunks.extend(sub_chunks)
                    current_chunk = ""
                else:
                    current_chunk = piece

        if current_chunk:
            chunks.append(current_chunk.strip())

        return [c for c in chunks if c]

# 测试长文本文档
raw_document = '''
第一章：基础架构总览。
分布式大模型推理框架由调度器、批处理引擎与张量并行核心三大组件构成。

第二章：性能优化细则。
高吞吐场景下推荐采用连续批处理（Continuous Batching）技术。通过显存按需分配（PagedAttention），系统能够显著降低碎片浪费。实测吞吐提升 3 到 5 倍。
'''

splitter = LightweightRecursiveSplitter(chunk_size=90, chunk_overlap=20)
result_chunks = splitter.split_text(raw_document)

print(f"=== 成功切分为 {len(result_chunks)} 个文本块 ===")
for i, c in enumerate(result_chunks, 1):
    print(f"\\n[Chunk {i}] (长度: {len(c)} 字符):\\n{c}")

assert len(result_chunks) >= 2
print("\\n✓ 递归文本切分器运行正常！")
"""
                }
            ]
        },
        {
            "id": "llma-l4-2",
            "title": "向量嵌入 (Vector Embeddings) 数学几何空间与模型选型",
            "difficulty": 2,
            "content": """### 学习目标与先修要求

- **先修要求**：了解线性代数基础（向量点积、L2 范数）、高维几何直觉。
- **能力目标**：
  1. 理解文本嵌入（Text Embeddings）将非结构化语义映射为稠密连续高维向量的本质；
  2. 深刻掌握点积、欧氏距离与余弦相似度的数学公式及 L2 归一化等价推导；
  3. 掌握 MTEB 国际评测基准核心指标，能根据业务场景进行最优 Embedding 模型选型。

---

### 一、向量嵌入（Embeddings）的数学本质

计算机无法直接对文字做代数几何运算。**向量嵌入**利用深度表征网络（如 BERT、RoBERTa 或专门的双塔对比学习模型），将任意长度的一段文本映射为一个固定维度的连续稠密向量 $\\mathbf{v} \\in \\mathbb{R}^d$（例如 $d = 1536$ 或 $d = 768$）：

$$\\text{Embed}(\\text{text}) = [v_1, v_2, \\dots, v_d]$$

#### 语义相似度与空间距离：
在训练过程中，模型通过**对比学习损失函数（Contrastive Loss / InfoNCE）**，拉近语义相关文本对（如“怎样重置密码”与“忘记登录凭证如何找回”）在高维空间中的几何距离，推远无关文本对。

---

### 二、三大核心几何相似度量度公式深度辨析

假设存在两个 $d$ 维文本向量 $\\mathbf{u}$ 与 $\\mathbf{v}$：

#### 1. 欧氏距离（Euclidean / L2 Distance）
两个向量终点之间的直线物理几何距离：

$$D_{\\text{L2}}(\\mathbf{u}, \\mathbf{v}) = \\|\\mathbf{u} - \\mathbf{v}\\|_2 = \\sqrt{\\sum_{i=1}^d (u_i - v_i)^2}$$

- 距离越小（接近 0），说明两者越相似；
- **缺点**：易受向量绝对模长影响，若一篇长文档向量整体数值较大，会导致欧氏距离失真。

#### 2. 点积（Dot Product / Inner Product）

$$\\mathbf{u} \\cdot \\mathbf{v} = \\sum_{i=1}^d u_i v_i$$

- 计算极度高效，只需对应元素相乘再累加，非常适合 CPU/GPU SIMD 向量化指令加速。

#### 3. 余弦相似度（Cosine Similarity）
衡量两个高维向量之间夹角 $\\theta$ 的余弦值：

$$\\cos(\\theta) = \\frac{\\mathbf{u} \\cdot \\mathbf{v}}{\\|\\mathbf{u}\\|_2 \\|\\mathbf{v}\\|_2} = \\frac{\\sum u_i v_i}{\\sqrt{\\sum u_i^2} \\sqrt{\\sum v_i^2}}$$

- 取值范围在 $[-1, 1]$ 之间。完全同向时为 1.0，正交无关时为 0.0，反向时为 -1.0。
- **优点**：完全消除了文本长度/向量绝对模长对相似度的干扰，只关注方向语义一致性。

#### 4. 工业级核心加速秘诀：L2 归一化 (Unit Normalization)
如果我们在向向量数据库写入前，对每一个向量执行 L2 归一化，即让其模长为 1（$\\hat{\\mathbf{u}} = \\frac{\\mathbf{u}}{\\|\\mathbf{u}\\|_2}$）：

$$\\cos(\\theta) = \\hat{\\mathbf{u}} \\cdot \\hat{\\mathbf{v}}$$

同时，归一化向量的欧氏距离与余弦相似度满足精确恒等式：

$$\\|\\hat{\\mathbf{u}} - \\hat{\\mathbf{v}}\\|_2^2 = \\|\\hat{\\mathbf{u}}\\|^2 + \\|\\hat{\\mathbf{v}}\\|^2 - 2 (\\hat{\\mathbf{u}} \\cdot \\hat{\\mathbf{v}}) = 2 - 2 \\cos(\\theta)$$

**工程结论**：**经过 L2 归一化后，余弦相似度在数学上严格等价于点积！**
这也是为什么所有高性能向量数据库（Milvus、Chroma、Qdrant）在入库时都推荐默认归一化，从而将耗时的除法与开根号运算退化为秒级硬件点积！

---

### 三、MTEB 国际评测体系与模型选型指南

选型切忌只看宣传，应依据权威的 **MTEB (Massive Text Embedding Benchmark)** 榜单。评测核心关注三大指标：
1. **Retrieval (NDCG@10)**：RAG 检索场景最重要的指标，衡量在召回的前 10 个候选中相关文档的排序质量；
2. **STS (Semantic Textual Similarity)**：衡量语义相似度打分的细粒度区分能力；
3. **多语言与中文适配能力**：英文优异的模型（如早期开源模型）在处理中文专业术语时可能效果极差。
- **主流选型推荐**：
  - **OpenAI `text-embedding-3-small` / `large`**：云端托管免运维，支持动态缩减维度（MRL, Matryoshka Representation Learning）；
  - **BGE 系列（BAAI / 智源研究院开源）**：开源界顶尖，中文与多语言检索霸榜，支持本地私有化部署；
  - **Qwen-Embedding / Cohere embed-v3**：跨语言检索与带指令检索强悍。
""",
            "tips": [
                {
                    "kind": "tip",
                    "text": "使用 OpenAI text-embedding-3 系列时，支持通过 dimensions 参数将 1536 维压缩至 512 维，可在仅损失约 1%~2% 精度的前提下节约 60% 以上的向量存储和检索算力！"
                },
                {
                    "kind": "note",
                    "text": "向量嵌入只表征文本的语义拓扑分布，完全无法直接还原原始自然语言文本（单向不可逆映射）。"
                }
            ],
            "demos": [
                {
                    "title": "向量 L2 归一化、余弦相似度计算与 Top-K 最近邻检索纯 Python 实现",
                    "lang": "python",
                    "code": """# 纯 Python 实现向量 L2 归一化、余弦相似度及 Top-K 检索
import math

def l2_normalize(vector: list[float]) -> list[float]:
    \"\"\"对向量进行 L2 归一化使模长为 1.0\"\"\"
    norm = math.sqrt(sum(x * x for x in vector))
    if norm < 1e-9:
        return [0.0] * len(vector)
    return [round(x / norm, 6) for x in vector]

def dot_product(v1: list[float], v2: list[float]) -> float:
    \"\"\"计算两个向量的点积\"\"\"
    return sum(a * b for a, b in zip(v1, v2))

def cosine_similarity(v1: list[float], v2: list[float]) -> float:
    \"\"\"直接计算余弦相似度\"\"\"
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 < 1e-9 or norm2 < 1e-9:
        return 0.0
    return sum(a * b for a, b in zip(v1, v2)) / (norm1 * norm2)

# 模拟 3 篇文档的 4 维语义向量及 1 个查询向量
mock_docs = {
    "Doc1 (关于 Python 异步协程)": [0.8, 0.6, 0.1, 0.0],
    "Doc2 (关于 Python 多线程与 GIL)": [0.75, 0.65, 0.05, 0.1],
    "Doc3 (关于烘焙巧克力的烹饪菜谱)": [-0.1, 0.0, 0.9, 0.8]
}

# 用户查询: "Python 怎么写高并发异步程序？"
mock_query = [0.85, 0.55, 0.0, 0.0]

print("=== 1. 余弦相似度计算结果 ===")
scores = {}
for name, doc_vec in mock_docs.items():
    sim = cosine_similarity(mock_query, doc_vec)
    scores[name] = round(sim, 4)
    print(f"  {name:30s} -> 相似度: {sim:.4f}")

# 验证 Doc1 最相关，Doc3 最无关
best_match = max(scores, key=scores.get)
assert "Doc1" in best_match
assert scores["Doc3 (关于烘焙巧克力的烹饪菜谱)"] < 0.1

print("\\n=== 2. 验证 L2 归一化后点积严格等于余弦相似度 ===")
norm_q = l2_normalize(mock_query)
norm_d1 = l2_normalize(mock_docs["Doc1 (关于 Python 异步协程)"])
dot_sim = dot_product(norm_q, norm_d1)
print(f"归一化后点积计算结果: {dot_sim:.4f}")
print(f"原始余弦相似度计算:   {scores['Doc1 (关于 Python 异步协程)']:.4f}")
assert abs(dot_sim - scores["Doc1 (关于 Python 异步协程)"]) < 1e-3

print("\\n✓ 向量高维几何相似度算法校验通过！")
"""
                }
            ]
        }
    ],
    "exercises": [
        {
            "id": "llma-ex-25",
            "type": "single",
            "difficulty": 1,
            "question": "在 RAG 系统的文本分块工程中，RecursiveCharacterTextSplitter（递归字符切分器）相比于简单固定长度切分的核心优势是什么？",
            "options": [
                {"value": "A", "label": "递归分块能自动将所有文档翻译成英文"},
                {"value": "B", "label": "优先在段落（\\n\\n）、换行、句号等自然语义边界处切分，最大限度保持句子和语法的语义完整性"},
                {"value": "C", "label": "完全不需要消耗任何 CPU 资源"},
                {"value": "D", "label": "能够将长文本无损压缩到 1 个字节"}
            ],
            "answer": "B",
            "explanation": "递归字符切分器采用由大到小的语义分隔符优先级阶梯（\\n\\n -> \\n -> 句号 -> 空格），优先在自然语义停顿处分块，仅在单个句子仍然超长时才递归下潜细分，有效避免了硬性截断单词或数据。",
            "tags": ["Chunking", "文本切分", "RecursiveSplitter"]
        },
        {
            "id": "llma-ex-26",
            "type": "single",
            "difficulty": 2,
            "question": "在向量数学与高性能向量检索中，当向量经过 L2 归一化（模长为 1.0）之后，余弦相似度在计算上与下列哪种度量完全等价？",
            "options": [
                {"value": "A", "label": "汉明距离（Hamming Distance）"},
                {"value": "B", "label": "点积（Dot Product / 内积）"},
                {"value": "C", "label": "曼哈顿距离（L1 Distance）"},
                {"value": "D", "label": "Jaccard 相似系数"}
            ],
            "answer": "B",
            "explanation": "余弦相似度公式为 dot(u, v) / (||u|| * ||v||)。当两个向量均完成 L2 归一化使 ||u|| = ||v|| = 1.0 时，分母恒等于 1，余弦相似度在数学和数值上完全等价于点积运算，可利用硬件指令极大提速。",
            "tags": ["向量数学", "余弦相似度", "点积"]
        },
        {
            "id": "llma-ex-27",
            "type": "single",
            "difficulty": 1,
            "question": "在长上下文大模型研究中，所谓的“迷失在中间”（Lost in the Middle 效应）指的是什么现象？",
            "options": [
                {"value": "A", "label": "模型在生成中途会随机崩溃丢失网络连接"},
                {"value": "B", "label": "模型对置于长 Prompt 首部与尾部的信息注意力感知极强，而对隐藏在上下文中间部分的关键事实召回准确率显著下降"},
                {"value": "C", "label": "所有的 Token 计数在中途都会归零"},
                {"value": "D", "label": "提示词必须严格限制在 50 个字以内"}
            ],
            "answer": "B",
            "explanation": "Stanford 研究人员（Liu et al., 2023）在论文中证实，大模型由于首尾位置注意力偏置（Primacy & Recency Bias），当输入上下文很长时，对处于中间 20%~80% 区域的关键信息的检索提取能力明显弱于两端。",
            "tags": ["Lost in the Middle", "长上下文", "RAG 原理"]
        },
        {
            "id": "llma-ex-28",
            "type": "judge",
            "difficulty": 1,
            "question": "在文本切块时设置适当的重叠步长（Chunk Overlap，如保留 10%~20% 的跨块字符），能有效防止重要事实或短语被切分边界割裂而导致上下文语义丢失。",
            "options": [
                {"value": "true", "label": "正确"},
                {"value": "false", "label": "错误"}
            ],
            "answer": "true",
            "explanation": "Chunk Overlap 让相邻的切片在头尾保持一定的滑动重叠，保证即使关键短语恰好跨越分块分界线，也至少能在前后某一个完整块中完整呈现，避免语义断层。",
            "tags": ["Chunk Overlap", "分块策略", "工程实践"]
        },
        {
            "id": "llma-ex-29",
            "type": "fill",
            "difficulty": 2,
            "question": "国际学术界与工业界最通用的评测大规模文本向量嵌入模型综合性能（涵盖检索、分类、聚类、STS等任务）的公开基准榜单名称缩写是 _________。",
            "blanks": [["MTEB", "mteb"]],
            "explanation": "MTEB（Massive Text Embedding Benchmark，由 Hugging Face 团队及学术界联合主导）是目前衡量 Embedding 模型质量最权威的国际基准测试平台。",
            "tags": ["MTEB", "Embedding", "基准评测"]
        },
        {
            "id": "llma-ex-30",
            "type": "multiple",
            "difficulty": 2,
            "question": "在企业落地选型与部署文本 Embedding 模型时，架构师应当综合权衡的关键技术指标包括哪些？",
            "options": [
                {"value": "A", "label": "MTEB 榜单上的检索指标（Retrieval NDCG@10）表现"},
                {"value": "B", "label": "模型输出的向量维度（如 512 vs 1536 维）对向量数据库内存存储与检索延迟的影响"},
                {"value": "C", "label": "对业务所涉及语言（特别是中文及多语言混合）的语义表征能力"},
                {"value": "D", "label": "向量的各个维度数值必须全都是正整数"}
            ],
            "answer": ["A", "B", "C"],
            "explanation": "选项 D 错误。稠密 Embedding 向量通常是浮点数（float32 或量化后的 int8/fp16），包含负数是高维空间对称表征的正常现象。选型核心权衡在于检索精度、向量维度（内存与速度开销）以及语言领域适配性。",
            "tags": ["Embedding 选型", "架构设计", "MTEB"]
        },
        {
            "id": "llma-ex-31",
            "type": "multiple",
            "difficulty": 2,
            "question": "在 RAG 系统中，为切分后的每一个文本块（Chunk）附加丰富的元数据（Metadata），其核心工程价值包括哪些？",
            "options": [
                {"value": "A", "label": "能够在向量检索前或检索时进行精确的条件过滤（如按时间、部门、文档类型预过滤）"},
                {"value": "B", "label": "在最终大模型生成回答时，能够精准向用户呈现来源文档、章节及页码溯源（Citation）"},
                {"value": "C", "label": "支持根据父文档 ID 快速回溯完整上下文（Parent-Child Document 机制）"},
                {"value": "D", "label": "元数据能让切片的纯文本自动扩容 100 倍"}
            ],
            "answer": ["A", "B", "C"],
            "explanation": "元数据对于生产级 RAG 不可或缺：它支持结构化混合过滤、回答引用溯源（增强事实可信度）以及父子块上下文回溯。选项 D 纯属荒谬捏造。",
            "tags": ["元数据", "Metadata", "溯源引用"]
        },
        {
            "id": "llma-ex-32",
            "type": "code",
            "difficulty": 3,
            "question": "请编写一个名为 `sliding_window_chunker` 的函数。要求：接受一段文本 `text`、每个切块字符数 `chunk_size`（正整数）与重叠字符数 `chunk_overlap`（必须满足 0 <= chunk_overlap < chunk_size）；按滑动窗口生成切块列表；每个切块以字典形式返回：`{'index': 块编号从0开始, 'text': 切块文本, 'start': 在原文本中的起始索引, 'end': 结束索引}`；要求忽略末尾空字符串。",
            "setupCode": "",
            "answer": "def sliding_window_chunker(text: str, chunk_size: int, chunk_overlap: int) -> list[dict]:\n    if chunk_overlap >= chunk_size or chunk_overlap < 0:\n        raise ValueError('chunk_overlap 必须小于 chunk_size 且大于等于 0')\n    step = chunk_size - chunk_overlap\n    chunks = []\n    idx = 0\n    start = 0\n    while start < len(text):\n        end = min(start + chunk_size, len(text))\n        piece = text[start:end]\n        if piece:\n            chunks.append({\n                'index': idx,\n                'text': piece,\n                'start': start,\n                'end': end\n            })\n            idx += 1\n        if end == len(text):\n            break\n        start += step\n    return chunks\n",
            "tests": "# 测试用例 1: 基础切分与重叠\ntxt = 'ABCDEFGHIJKLMN'\nres = sliding_window_chunker(txt, chunk_size=5, chunk_overlap=2)\n# step = 3\n# Chunk 0: 0..5 ('ABCDE')\n# Chunk 1: 3..8 ('DEFGH')\n# Chunk 2: 6..11 ('GHIJK')\n# Chunk 3: 9..14 ('JKLMN')\nassert len(res) == 4\nassert res[0]['text'] == 'ABCDE'\nassert res[0]['start'] == 0 and res[0]['end'] == 5\nassert res[1]['text'] == 'DEFGH'\nassert res[3]['text'] == 'JKLMN'\n\n# 测试用例 2: 非法重叠抛异常\ntry:\n    sliding_window_chunker('test', chunk_size=5, chunk_overlap=5)\n    assert False, 'Should fail when overlap >= size'\nexcept ValueError:\n    pass\n\nprint('sliding_window_chunker test cases passed!')\n",
            "explanation": "基于滑动窗口步长 step = chunk_size - chunk_overlap 进行切片循环，收集每个分块的切片内容及其起始和终止字符索引。",
            "tags": ["滑动窗口", "Chunking", "编程实战"]
        }
    ]
}

CHAPTER_5 = {
    "id": "llma-c5",
    "courseId": "python-llm-applications",
    "order": 5,
    "title": "向量检索、混合检索与重排算法",
    "goal": "掌握近似最近邻检索（ANN）与 HNSW 图索引原理；深刻理解纯稠密向量检索的语义盲区；熟练掌握 BM25 稀疏检索与 Embedding 稠密检索的混合系统架构；掌握倒数排名融合（RRF）与 Cross-Encoder 二阶段重排（Rerank）工业级检索漏斗模型。",
    "lessons": [
        {
            "id": "llma-l5-1",
            "title": "近似最近邻检索 (ANN) 与纯向量检索的阿喀琉斯之踵",
            "difficulty": 1,
            "content": """### 学习目标与先修要求

- **先修要求**：了解基础数据结构（图、哈希表）、算法时间复杂度（大 O 表示法）。
- **能力目标**：
  1. 理解百万/亿级向量规模下暴力精确检索（Flat Index）的算力瓶颈与 ANN 核心权衡；
  2. 搞清 HNSW（Hierarchical Navigable Small World）分层小世界图的跳跃与贪婪搜索机理；
  3. 洞悉纯稠密向量检索在工业业务场景下的三大致命软肋（阿喀琉斯之踵）。

---

### 一、暴力检索 (Flat) 的瓶颈与 ANN 近似最近邻

如果知识库中有 $N$ 个向量，每个向量维度为 $d$：
- **精确最近邻（KNN / Flat Index）**：必须遍历计算用户查询与每一个向量的相似度并排序，时间复杂度为 $O(N \\cdot d)$。当 $N = 1000$ 时速度飞快（< 1ms）；当 $N = 10^7$（千万级）时，单次检索耗时数秒甚至数分钟，完全无法满足在线交互需求。
- **近似最近邻（ANN, Approximate Nearest Neighbors）**：通过牺牲极微小的绝对召回精度（如容忍 99% 的准确率），将查询时间复杂度骤降至 **$O(\\log N)$**！

```
                     [高层 Layer 2]: 稀疏节点 ───快速大步跨越───>
                     [中层 Layer 1]: 适度节点 ──────中等步长────>
                     [底层 Layer 0]: 全量密集节点 ──局部微调收敛──> 最终最近邻
```

#### HNSW（分层导航小世界图 - Malkov & Yashunin, 2020）：
目前工业界最顶尖的通用内存 ANN 算法。其灵感来源于跳跃表（SkipList）结合“六度人脉小世界网络”：
1. **多层图结构**：自顶向下构建多层图。顶层节点稀疏，用于快速跨越超大空间距离；越往下层节点越密集；
2. **贪婪路由（Greedy Routing）**：在每一层从入口节点出发，贪婪游走到当前邻居中距离目标最近的节点，直至无法更近时下潜进入下一层继续游走；
3. **性能表现**：毫秒级完成千万级向量亚对数时间召回，召回率高达 95%~99%。

---

### 二、纯稠密向量检索的致命痛点（阿喀琉斯之踵）

虽然向量检索在处理抽象意图、语义联想（如搜索“电脑屏幕太亮眼睛疼”匹配到“护眼滤蓝光设置”）上表现卓越，但在以下三类真实商业场景中，**纯稠密向量检索极易出现严重翻车**：

#### 1. 精确型号与专有名词失真
- 用户搜索：`"iPhone 15 Pro Max 256G"`
- 纯向量 Embedding 会将上下文聚合为一个模糊的“苹果高配手机”概念，检索出的 Top 结果可能混杂了 `"iPhone 14 Pro Max 256G"` 或 `"iPhone 15 Pro 512G"`。因为在几何空间中，这些词的余弦相似度可能高达 0.96，模型无法理解 `"14"` 与 `"15"` 的一字之差在商业上是两款完全不同的产品！

#### 2. 精确错误代码与系统参数匹配
- 用户搜索报错码：`"ERR_503_GATEWAY_TIMEOUT_V2"`
- 纯向量模型从未见过这个生僻的内部宏定义，分词切碎后向量距离完全发散，检索命中率极低。

#### 3. 人名、工号与产品唯一编号
- 用户搜索：`"员工工号 E-90821 考勤记录"`
- 纯向量检索完全无法区分 `"E-90821"` 与 `"E-90822"`，极易造成数据权限泄露或错乱。
""",
            "tips": [
                {
                    "kind": "pitfall",
                    "text": "千万不要在纯向量知识库中盲目检索精确身份证号、订单流水号或数据库主键，这属于典型的“拿大炮打蚊子还打不中”。"
                },
                {
                    "kind": "note",
                    "text": "主流向量数据库（如 Chroma、Qdrant、Milvus）底层均已默认集成 HNSW 索引以支持毫秒级向量相似度查询。"
                }
            ],
            "demos": [
                {
                    "title": "纯 Python 模拟 HNSW 分层图跳跃游走与 Flat 暴力检索效率比对",
                    "lang": "python",
                    "code": """# 纯 Python 演示小世界分层跳跃图 (HNSW 原型) 与暴力 Flat 遍历效率比对
import math

# 模拟 1 维数值坐标高维投影空间的简化小世界图
class SimpleNavigableGraph:
    def __init__(self):
        # 顶层稀疏跳跃层
        self.top_layer = {0: [50], 50: [0, 100], 100: [50]}
        # 底层全量致密邻接表
        self.bottom_layer = {i: [max(0, i-10), min(100, i+10)] for i in range(0, 101, 10)}

    def search(self, target: float) -> tuple[int, int]:
        \"\"\"自顶向下贪婪游走 (返回最近邻节点和比较步数)\"\"\"
        steps = 0
        curr = 0 # 顶层入口
        
        # 1. 顶层大步跳跃
        for next_node in self.top_layer[curr]:
            steps += 1
            if abs(next_node - target) < abs(curr - target):
                curr = next_node
                
        # 2. 下潜到底层密集层微调
        while True:
            better_found = False
            for neighbor in self.bottom_layer.get(curr, []):
                steps += 1
                if abs(neighbor - target) < abs(curr - target):
                    curr = neighbor
                    better_found = True
                    break
            if not better_found:
                break
                
        return curr, steps

graph = SimpleNavigableGraph()
target_query = 78.5

# 1. HNSW 分层图搜索
best_node, steps_hnsw = graph.search(target_query)
print(f"=== HNSW 图游走检索目标 {target_query} ===")
print(f"  命中最近邻节点: {best_node} (仅花费 {steps_hnsw} 次步进比较)")

# 2. 暴力 Flat 遍历
flat_nodes = list(range(0, 101, 10))
best_flat = min(flat_nodes, key=lambda x: abs(x - target_query))
steps_flat = len(flat_nodes)
print(f"=== 暴力 Flat 全遍历 ===")
print(f"  命中最近邻节点: {best_flat} (必须进行 {steps_flat} 次完整比较)")

assert best_node == best_flat == 80
assert steps_hnsw < steps_flat
print("\\n✓ HNSW 分层图游走效率优势验证成功！")
"""
                }
            ]
        },
        {
            "id": "llma-l5-2",
            "title": "混合检索 (Hybrid Search) 与重排 (Rerank) 算法",
            "difficulty": 2,
            "content": """### 学习目标与先修要求

- **先修要求**：了解 TF-IDF 词频统计基础、双塔模型与交叉编码器概念。
- **能力目标**：
  1. 掌握 BM25 稀疏检索（关键词匹配）算法的数学公式及词频饱和度机制；
  2. 精通倒数排名融合（Reciprocal Rank Fusion, RRF）多路召回无参数融合算法；
  3. 掌握“初检召回 Top-100 -> Cross-Encoder 重排 Top-5”的工业级漏斗架构。

---

### 一、混合检索 (Hybrid Search)：稀疏 + 稠密双剑合璧

为彻底化解纯稠密向量检索的局限，现代生产级 RAG 普遍采用**混合检索（Hybrid Search）**架构：

```
                             用户输入 Query
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
   [稀疏检索: 关键词 BM25]                   [稠密检索: 语义向量 HNSW]
              │                                         │
       返回 Top-50 结果                          返回 Top-50 结果
              │                                         │
              └────────────────────┬────────────────────┘
                                   ▼
                   [倒数排名融合: RRF (Reciprocal Rank Fusion)]
                                   ▼
                           合并初筛 Top-20 候选
                                   ▼
                   [二阶段交叉编码重排: Cross-Encoder Rerank]
                                   ▼
                          最终精选 Top-3 注入 LLM
```

#### BM25（Best Matching 25）算法核心精髓：
BM25 是传统信息检索界历经数十年检验的经典算法。给定查询 $Q$（包含关键词 $q_1, \\dots, q_n$）和文档 $D$：

$$\\text{Score}(D, Q) = \\sum_{i=1}^n \\text{IDF}(q_i) \\cdot \\frac{f(q_i, D) \\cdot (k_1 + 1)}{f(q_i, D) + k_1 \\cdot \\left(1 - b + b \\cdot \\frac{|D|}{\\text{avgdl}}\\right)}$$

- **$\\text{IDF}(q_i)$（逆文档频率）**：衡量词的稀有程度。像“的”、“在”这类通用词 IDF 接近 0；而型号代码“ERR_503” IDF 极高；
- **词频饱和度（Term Saturation）**：由参数 $k_1$（通常取 1.2~2.0）控制。当一个词在文档中出现 5 次后，即便再出现 50 次，分数也不会无限线性放大，有效防止作弊堆砌关键词；
- **文档长度惩罚**：由参数 $b$（通常取 0.75）控制，防止长文档仅凭字数多占便宜。

---

### 二、倒数排名融合（Reciprocal Rank Fusion, RRF）

当我们要合并 BM25 召回的列表（分数范围可能是 $0 \\sim 35.8$）和向量检索列表（余弦相似度 $0.6 \\sim 0.9$）时，**绝对不能直接把原始分数相加**，因为两者的量纲和概率分布完全不同！
**RRF 算法（Cormack et al., 2009）**巧妙地抛弃了不可比的分数绝对值，**仅依赖排名位置（Rank）**进行公平融合：

$$RRF(d) = \\sum_{m \\in M} \\frac{1}{k + r_m(d)}$$

- $M$：检索通道集合（如 BM25 通道与向量通道）；
- $r_m(d)$：文档 $d$ 在第 $m$ 个通道中的排名（从 1 开始）；
- $k$：平滑常数（工业界通常取经验值 **$k = 60$**），防止排第一名的文档权重过大倾轧其他通道。
- **优点**：无需任何人工调参或模型训练，极其稳定鲁棒。

---

### 三、二阶段重排（Rerank / Cross-Encoder）

- **双塔模型（Bi-Encoder - 前置向量）**：Query 和 Doc 是分别独立编码成向量的，两者之间没有 Token 级别的交叉自注意力（Cross-Attention），因而适合快速检索，但细微语义互动较弱；
- **交叉编码器（Cross-Encoder - 重排模型）**：将 `[CLS] Query [SEP] Document [EOS]` 拼接为单条长文本送入 BERT/RoBERTa，让两者的每个词充分进行跨文本自注意力交互，打分精度极高！
- **漏斗策略**：因为 Cross-Encoder 算力开销大，故不能用于全库搜索。生产环境先用“混合检索”从百万库中粗筛出 Top-50，再用 Reranker 模型对这 50 个候选精打细算重排，选出最优质的 Top-3 注入 Prompt。
""",
            "tips": [
                {
                    "kind": "tip",
                    "text": "开源界首选 Reranker 包括 BAAI 的 bge-reranker-large 与 bge-reranker-v2-m3，商业 API 可选用 Cohere Rerank。"
                },
                {
                    "kind": "note",
                    "text": "在 RRF 计算中，常数 k 取 60 是经过大量基准评测验证的黄金值，若发现某一个通道权重不足，可以引入加权 RRF。"
                }
            ],
            "demos": [
                {
                    "title": "BM25 关键词匹配 + 稠密向量模拟 + RRF 倒数排名融合算法全流程实现",
                    "lang": "python",
                    "code": """# 纯 Python 实现混合检索与倒数排名融合 (RRF) 算法
from collections import defaultdict
import math

class SimpleBM25:
    \"\"\"轻量内存 BM25 检索原型\"\"\"
    def __init__(self, corpus: list[str]):
        self.corpus = corpus
        self.doc_tokens = [doc.lower().split() for doc in corpus]
        self.doc_count = len(corpus)
        self.avg_dl = sum(len(d) for d in self.doc_tokens) / self.doc_count
        self.k1 = 1.5
        self.b = 0.75
        self.idf = self._calc_idf()

    def _calc_idf(self) -> dict[str, float]:
        df = defaultdict(int)
        for d in self.doc_tokens:
            for w in set(d):
                df[w] += 1
        return {w: math.log(1 + (self.doc_count - n + 0.5) / (n + 0.5)) for w, n in df.items()}

    def search(self, query: str) -> list[tuple[int, float]]:
        q_tokens = query.lower().split()
        scores = []
        for i, doc in enumerate(self.doc_tokens):
            score = 0.0
            dl = len(doc)
            for w in q_tokens:
                if w in self.idf:
                    tf = doc.count(w)
                    denom = tf + self.k1 * (1 - self.b + self.b * (dl / self.avg_dl))
                    score += self.idf[w] * (tf * (self.k1 + 1)) / denom
            scores.append((i, round(score, 4)))
        scores.sort(key=lambda x: x[1], reverse=True)
        return scores

def reciprocal_rank_fusion(rankings: list[list[int]], k: int = 60) -> list[tuple[int, float]]:
    \"\"\"倒数排名融合 (RRF) 算法\"\"\"
    rrf_scores = defaultdict(float)
    for rank_list in rankings:
        for rank, doc_id in enumerate(rank_list, start=1):
            rrf_scores[doc_id] += 1.0 / (k + rank)
            
    sorted_results = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
    return [(doc_id, round(score, 6)) for doc_id, score in sorted_results]

# 模拟 4 篇文档库
corpus = [
    "Python 性能调优指南，深入剖析 GIL 与多进程池",                     # Doc 0
    "iPhone 15 Pro 硬件参数与芯片能效比评估",                             # Doc 1
    "iPhone 14 Pro Max 详细技术规格说明",                                 # Doc 2
    "企业级 Python 后端架构设计模式实战"                                  # Doc 3
]

# 模拟用户查询: "iPhone 15 Pro 参数"
bm25 = SimpleBM25(corpus)
bm25_res = bm25.search("iPhone 15 Pro")
bm25_ranked_ids = [doc_id for doc_id, _ in bm25_res]
print("BM25 稀疏检索排名:", bm25_ranked_ids)

# 模拟向量检索由于语义模糊把 Doc 2 排在了第一位
mock_vector_ranked_ids = [2, 1, 0, 3]
print("向量稠密检索排名:", mock_vector_ranked_ids)

# 执行 RRF 融合
final_rrf = reciprocal_rank_fusion([bm25_ranked_ids, mock_vector_ranked_ids], k=60)
print("\\n=== RRF 多路融合最终排序结果 ===")
for doc_id, score in final_rrf:
    print(f"  Doc {doc_id}: '{corpus[doc_id][:25]}...' -> RRF得分: {score:.6f}")

# 验证 Doc 1 (iPhone 15 Pro) 凭借双路均衡高排名获得第一名
assert final_rrf[0][0] == 1, "准确型号文档应通过 RRF 最终胜出"
print("\\n✓ 混合检索与 RRF 融合算法验证通过！")
"""
                }
            ]
        }
    ],
    "exercises": [
        {
            "id": "llma-ex-33",
            "type": "single",
            "difficulty": 1,
            "question": "在向量数据库中，HNSW（分层导航小世界图）算法相比于传统暴力 Flat 检索的最关键优势体现在哪里？",
            "options": [
                {"value": "A", "label": "完全不需要任何内存开销"},
                {"value": "B", "label": "通过多层图跳跃路由与贪婪局部游走，将海量向量检索的时间复杂度从 O(N) 降低至近似 O(log N)"},
                {"value": "C", "label": "能够自动修正原始文本中的语法错误"},
                {"value": "D", "label": "检索出的余弦相似度恒等于 1.0"}
            ],
            "answer": "B",
            "explanation": "HNSW 借鉴了跳跃表多层索引思想与小世界网络的高聚类短路径特性，上层大步跳跃定位局部邻域，底层密集图微调收敛，在大规模数据集下将查询时间复杂度优化为接近 O(log N)。",
            "tags": ["HNSW", "ANN", "向量检索"]
        },
        {
            "id": "llma-ex-34",
            "type": "single",
            "difficulty": 1,
            "question": "在企业级 RAG 系统中，为什么强烈推荐引入 BM25 稀疏检索来补充纯稠密向量检索？",
            "options": [
                {"value": "A", "label": "因为 BM25 可以自动替换掉昂贵的大模型"},
                {"value": "B", "label": "纯向量检索在精确专有名词、错误代码、设备具体型号（如 iPhone 15 vs 14）上极易因语义泛化而漏召回，BM25 凭借关键词字面匹配能完美弥补这一缺陷"},
                {"value": "C", "label": "BM25 是专门用于音频和视频特征识别的"},
                {"value": "D", "label": "没有任何好处，纯粹是为了增加系统代码行数"}
            ],
            "answer": "B",
            "explanation": "稠密 Embedding 将文本映射为全局模糊语义，对微小字符差异不敏感；BM25 基于精确词频和逆文档频率（IDF），对生僻报错码、工号与产品具体型号具有极致的精确命中能力，两者互为最强补充。",
            "tags": ["混合检索", "BM25", "语义鸿沟"]
        },
        {
            "id": "llma-ex-35",
            "type": "single",
            "difficulty": 2,
            "question": "在倒数排名融合（RRF, Reciprocal Rank Fusion）算法中，公式 RRF(d) = sum(1 / (k + rank)) 相比直接将多个检索通道的分数加权求和，最大的优势是什么？",
            "options": [
                {"value": "A", "label": "计算量翻倍提升"},
                {"value": "B", "label": "完全摆脱了不同检索算法（如 BM25 浮点分与余弦相似度）分数绝对值不可比、量纲差异巨大的困扰，只依赖位置排序，鲁棒性极高"},
                {"value": "C", "label": "只保留排在第一名的一篇文档，将其余文档全部丢弃"},
                {"value": "D", "label": "需要训练一个上百亿参数的深度学习网络才能运行"}
            ],
            "answer": "B",
            "explanation": "不同检索通道（如 BM25、Dense Vector、Splade）给出的绝对打分尺度和分布完全不同，做分数归一化往往极易受极值扭曲。RRF 完全基于文档在各自候选列表中的排名（Rank）进行倒数折算，具备天然的跨模态融合稳健性。",
            "tags": ["RRF", "多路召回", "融合算法"]
        },
        {
            "id": "llma-ex-36",
            "type": "judge",
            "difficulty": 1,
            "question": "交叉编码器（Cross-Encoder / Reranker）将 Query 与 Document 拼接后共同输入模型进行全注意力交互，其打分精度通常显著优于分别独立编码的双塔向量模型（Bi-Encoder）。",
            "options": [
                {"value": "true", "label": "正确"},
                {"value": "false", "label": "错误"}
            ],
            "answer": "true",
            "explanation": "Cross-Encoder 允许 Query 中的每个词和 Document 中的每个词在 Transformer 所有自注意力层之间深度交叉交互，捕捉极其微妙的语义依存关系，因此精度远高于双塔独立向量编码模型。",
            "tags": ["Cross-Encoder", "Reranker", "注意力机制"]
        },
        {
            "id": "llma-ex-37",
            "type": "fill",
            "difficulty": 2,
            "question": "在 BM25 检索算法中，用于衡量一个关键词在整个语料库中稀有程度的核心统计指标的英文缩写是 _________。",
            "blanks": [["IDF", "idf"]],
            "explanation": "IDF（Inverse Document Frequency，逆文档频率）用来惩罚随处可见的常见词并奖励罕见稀有的专有名词或关键词。",
            "tags": ["BM25", "IDF", "信息检索"]
        },
        {
            "id": "llma-ex-38",
            "type": "multiple",
            "difficulty": 2,
            "question": "在生产环境中，下列哪些业务场景是纯稠密向量检索（Dense Retrieval）极易出现错误召回或漏召回的重灾区？",
            "options": [
                {"value": "A", "label": "特定异常堆栈代码（如 NullPointerException_Code_4021）精确排查"},
                {"value": "B", "label": "只有一字之差但属于完全不同代际的硬件商品型号（如 RTX 4080 vs RTX 4090）"},
                {"value": "C", "label": "用户员工工号、身份证后四位或物流单号的精确匹配"},
                {"value": "D", "label": "模糊情感倾向与同义词联想（如把'不愉快'匹配到'很失望'）"}
            ],
            "answer": ["A", "B", "C"],
            "explanation": "选项 D 恰恰是纯稠密向量检索最擅长的语义抽象场景。而 A、B、C 属于专有名词、生僻标识符与精确编号匹配，纯向量模型极易因距离泛化而失真。",
            "tags": ["向量盲区", "业务痛点", "混合检索"]
        },
        {
            "id": "llma-ex-39",
            "type": "multiple",
            "difficulty": 2,
            "question": "关于工业级两阶段检索架构（混合检索召回 + Cross-Encoder 重排）的设计原则，下列说法正确的有哪些？",
            "options": [
                {"value": "A", "label": "第一阶段通过 BM25 + Vector 混合检索，兼顾召回的广度与速度（如召回 Top-50）"},
                {"value": "B", "label": "第二阶段通过 Cross-Encoder Reranker 精准重排，从 50 个候选中精挑细选出 Top-3~5 注入上下文"},
                {"value": "C", "label": "由于 Cross-Encoder 算力消耗高、速度慢，因此严禁对千万级全量库直接使用 Cross-Encoder 全表计算"},
                {"value": "D", "label": "第二阶段重排必须由人类专家手工逐行打分"}
            ],
            "answer": ["A", "B", "C"],
            "explanation": "两阶段漏斗架构是兼顾万级毫秒性能与高精度的标准工业设计：前置轻量混合召回保障 Coverage，后置重排模型负责 Precision。选项 D 人工逐行打分无法实现在线实时系统。",
            "tags": ["两阶段检索", "Rerank", "架构漏斗"]
        },
        {
            "id": "llma-ex-40",
            "type": "code",
            "difficulty": 3,
            "question": "请编写一个名为 `combine_rankings_rrf` 的多路召回融合函数。要求：接受一个嵌套列表 `ranked_lists`（内层每个列表表示一路检索结果按相关性从高到低排列的文档 ID 列表）以及常数 `k`（默认 60）；使用倒数排名融合算法累加每篇文档的得分（排名从 1 开始）；最终按得分从高到低返回元组列表 `[(doc_id, score), ...]`，得分保留 5 位小数。",
            "setupCode": "from collections import defaultdict\n",
            "answer": "def combine_rankings_rrf(ranked_lists: list[list[str]], k: int = 60) -> list[tuple[str, float]]:\n    scores = defaultdict(float)\n    for r_list in ranked_lists:\n        for rank, doc_id in enumerate(r_list, start=1):\n            scores[doc_id] += 1.0 / (k + rank)\n            \n    sorted_items = sorted(scores.items(), key=lambda x: x[1], reverse=True)\n    return [(doc_id, round(score, 5)) for doc_id, score in sorted_items]\n",
            "tests": "# 测试用例 1: 两路列表融合\nlist_a = ['doc1', 'doc2', 'doc3']\nlist_b = ['doc2', 'doc1', 'doc4']\n# 对于 k=60:\n# doc1: 1/61 + 1/62 = 0.016393 + 0.016129 = 0.03252\n# doc2: 1/62 + 1/61 = 0.03252\n# doc3: 1/63 = 0.01587\n# doc4: 1/63 = 0.01587\n\nres = combine_rankings_rrf([list_a, list_b], k=60)\nassert len(res) == 4\n# doc1 与 doc2 应在前两位\ntop_two = {res[0][0], res[1][0]}\nassert top_two == {'doc1', 'doc2'}\nassert res[0][1] == res[1][1] == 0.03252\n\n# 测试用例 2: 空输入安全返回\nassert combine_rankings_rrf([]) == []\n\nprint('combine_rankings_rrf test cases passed!')\n",
            "explanation": "倒数排名融合算法（RRF）遍历每路召回列表，对于列表中排在第 rank 位（从 1 开始）的文档累加 1.0 / (k + rank) 分数，最后按总得分降序排列。",
            "tags": ["RRF", "算法实现", "编程实战"]
        }
    ]
}

CHAPTER_6 = {
    "id": "llma-c6",
    "courseId": "python-llm-applications",
    "order": 6,
    "title": "LangChain 0.3+ 核心抽象与 LCEL 链式编排",
    "goal": "掌握 LangChain 0.3+ 现代模块化解耦体系与 Runnable 统一接口；深入理解 LCEL 链式调用表达式底层魔术方法与管道运算符；掌握提示词模板、模型包装器与输出解析器流式装配；熟练实现滑动窗口与摘要记忆等多轮会话状态管理架构。",
    "lessons": [
        {
            "id": "llma-l6-1",
            "title": "LangChain 架构解耦演进与 Runnable 统一接口协议",
            "difficulty": 1,
            "content": """### 学习目标与先修要求

- **先修要求**：掌握 Python 类继承、特殊双下划线（Dunder）运算符重载、协程异步编程。
- **能力目标**：
  1. 理解 LangChain 从早期臃肿混乱的 0.1 版本演化至 0.2/0.3 彻底解耦现代架构的动因；
  2. 精通 **Runnable 协议** 的五大核心统一接口（`invoke`, `batch`, `stream`, `ainvoke`, `astream`）；
  3. 深入理解 LangChain Expression Language (LCEL) 管道操作符 `|` 的底层 Python 语言机制。

---

### 一、LangChain 的版本阵痛与 0.3+ 模块化解耦

早期 LangChain（0.0.x ~ 0.1.x）因抽象过度膨胀、黑盒多层嵌套、隐式类继承（如 `LLMChain`、`ConversationChain`）以及依赖冲突繁重而饱受社区诟病。
从 **0.2 和 0.3 版本**开始，LangChain 完成了彻底的架构重构，确立了清晰的生态拆分原则：

```
┌────────────────────────────────────────────────────────┐
│  langchain-core (超轻量核心基石，仅定义基础接口与协议)  │ -> 无冗余依赖，定义 Runnable / Message / BaseChatModel
├────────────────────────────────────────────────────────┤
│  langchain-community (第三方开源社区插件集合)          │ -> 社区贡献的各类向量库、文档加载器、工具集
├────────────────────────────────────────────────────────┤
│  独立厂商官方包 (langchain-openai, langchain-anthropic) │ -> 服务商独立维护的优选轻量 SDK 封装
├────────────────────────────────────────────────────────┤
│  langgraph (高阶循环图与 Agent 工作流编排引擎)        │ -> 专注于持久化状态图与复杂多智能体协同
└────────────────────────────────────────────────────────┘
```

---

### 二、Runnable 统一接口生命周期

所有参与链条编排的组件（提示词模板、模型、解析器、检索器、自定义函数），在底层都必须实现统一的 **`Runnable` 抽象基类**。该协议规定了标准化方法矩阵：

| 调用方式 | 同步方法 (Sync) | 异步方法 (Async) | 适用场景 |
| :--- | :--- | :--- | :--- |
| **单次执行** | `runnable.invoke(input)` | `runnable.ainvoke(input)` | 标准单次问答交互 |
| **并发批处理** | `runnable.batch(inputs)` | `runnable.abatch(inputs)` | 离线批量数据提取、多并发高吞吐处理 |
| **流式传输** | `runnable.stream(input)` | `runnable.astream(input)` | 前端打字机效果、实时 token 下发 |
| **细粒度事件流** | - | `runnable.astream_events(...)`| 实时监听链内部每个节点的中间输出 |

#### 统一协议的工程价值：
无论链内部是由多少个复杂节点拼装而成，整个链对象本身依然是一个标准的 `Runnable`。这意味着**积木可以无限嵌套组合**，外层调用者无需关心内部实现细节！

---

### 三、LCEL（LangChain Expression Language）管道底层机理

在 LCEL 中，最为人称道的语法莫过于 Unix 管道式的优雅组合：

```python
chain = prompt_template | chat_model | StrOutputParser()
```

#### Python 语法底层秘密揭晓：
该语法绝不是黑魔法，而是依赖 Python 的**双下划线运算符重载（Dunder Method `__or__` 与 `__ror__`）**：

```python
class Runnable:
    def __or__(self, other):
        # 当执行 self | other 时自动触发
        return RunnableSequence(first=self, second=other)
```

通过这一运算符重载，链条各组件在初始化阶段仅仅构建了一张声明式执行图（Execution Graph）。在真正调用 `invoke` 时，数据从左到右依次流经每个节点，且天然具备异步感知、类型校验、日志追踪与自动并发调度！
""",
            "tips": [
                {
                    "kind": "tip",
                    "text": "在将纯 Python 自定义函数集成进 LCEL 链时，只需使用 `RunnableLambda(my_func)` 包装，即可使其立刻具备统一的 invoke、batch 与 ainvoke 能力。"
                },
                {
                    "kind": "warning",
                    "text": "弃用旧版经典的 `LLMChain(llm=..., prompt=...)`！官方早已将其全面废弃，现行标准写法一律采用 LCEL 声明式管道：`prompt | model | parser`。"
                }
            ],
            "demos": [
                {
                    "title": "从零纯 Python 手写轻量级 Runnable 协议与管道操作符 | 调度引擎",
                    "lang": "python",
                    "code": """# 纯 Python 演示 LCEL 管道操作符 | 底层实现与链式执行调度
from typing import Callable, Any

class LightweightRunnable:
    \"\"\"工业级 Runnable 协议极简底层实现\"\"\"
    def invoke(self, input_data: Any) -> Any:
        raise NotImplementedError

    def __or__(self, other: "LightweightRunnable") -> "RunnableSequence":
        \"\"\"重载 | 运算符，将两个 Runnable 串联为序列\"\"\"
        return RunnableSequence(first=self, second=other)

class RunnableFunc(LightweightRunnable):
    \"\"\"包装任意普通函数为具备管道能力的 Runnable\"\"\"
    def __init__(self, func: Callable[[Any], Any]):
        self.func = func

    def invoke(self, input_data: Any) -> Any:
        return self.func(input_data)

class RunnableSequence(LightweightRunnable):
    \"\"\"顺序执行的有向无环数据流水线\"\"\"
    def __init__(self, first: LightweightRunnable, second: LightweightRunnable):
        self.first = first
        self.second = second

    def invoke(self, input_data: Any) -> Any:
        # 第一节点的输出作为第二节点的输入
        intermediate = self.first.invoke(input_data)
        return self.second.invoke(intermediate)

# 1. 定义三个微处理环节
step1_format = RunnableFunc(lambda x: f"用户提问：{x['topic']}，目标受众：{x['audience']}")
step2_mock_llm = RunnableFunc(lambda prompt: f"[AI 生成内容] 根据 '{prompt}'，生成结构化专业解答。")
step3_uppercase = RunnableFunc(lambda raw_text: raw_text.replace("专业解答", "★深度专家级解答★"))

# 2. 利用 | 运算符构建 LCEL 链
modern_chain = step1_format | step2_mock_llm | step3_uppercase

# 3. 执行调用
payload = {"topic": "异步协程架构", "audience": "架构师"}
final_output = modern_chain.invoke(payload)

print("=== LCEL 管道执行结果 ===")
print(final_output)
assert "★深度专家级解答★" in final_output
assert "异步协程架构" in final_output
print("\\n✓ 纯 Python 手写管道运算符重载与调度链路测试通过！")
"""
                }
            ]
        },
        {
            "id": "llma-l6-2",
            "title": "提示词链、解析器与会话记忆架构",
            "difficulty": 2,
            "content": """### 学习目标与先修要求

- **先修要求**：了解多轮对话上下文、状态存储介质（内存/Redis）。
- **能力目标**：
  1. 掌握 `ChatPromptTemplate` 动态消息组合与参数绑定；
  2. 熟练运用 `StrOutputParser`、`JsonOutputParser` 完成端到端干净提取；
  3. 掌握大模型多轮会话状态管理架构：滑动窗口记忆、Token 边界截断与滚动摘要记忆。

---

### 一、提示词模板与输出解析器流式装配

在标准的 LCEL 链路中，输入通常为一个 `dict` 变量集合，最终期望输出一个解析好的纯字符串或 Python 业务对象：

```
       用户输入字典: {"query": "如何配置 CORS?", "lang": "Python"}
                           │
                           ▼
              ┌───────────────────────────┐
              │    ChatPromptTemplate     │ (将参数格式化为 BaseMessage 消息列表)
              └────────────┬──────────────┘
                           │
                           ▼
              ┌───────────────────────────┐
              │    ChatModel (如 OpenAI)  │ (模型生成原始 AIMessage 对象)
              └────────────┬──────────────┘
                           │
                           ▼
              ┌───────────────────────────┐
              │    StrOutputParser        │ (抽取 AIMessage.content 纯文本)
              └───────────────────────────┘
```

#### 常见解析器选型：
1. **`StrOutputParser`**：最轻量，直接提取大模型返回消息的 `content` 字符串，过滤底层元数据；
2. **`JsonOutputParser`**：内部预置了 JSON 提取指令与 Schema 格式化逻辑，自动将模型的 JSON 字符串文本反序列化为 Python 字典；
3. **`PydanticOutputParser`**：结合 Pydantic 模型，不仅反序列化，还执行完整的类型校验与错误截获。

---

### 二、多轮会话状态管理（Memory）架构实战

大模型 API 本身是**完全无状态（Stateless）**的。要让模型具备连续多轮对话的“记忆”能力，必须在客户端/后端服务层维护历史会话记录（Chat History），并在每次新请求时将历史组装进上下文。

```
            ┌──────────────────────────────────────────────┐
            │   用户新提问: "那它在 Linux 上该怎么安装？"   │
            └──────────────────────┬───────────────────────┘
                                   │
                                   ▼
        ┌──────────────────────────────────────────────────────┐
        │  记忆管理器 (Memory Manager - 查询 Redis / PostgreSQL) │
        │  - 历史轮次 1: User("请问 Docker 是什么？")           │
        │  - 历史轮次 1: AI("Docker 是一种容器化技术...")       │
        └──────────────────────────┬───────────────────────────┘
                                   ▼
            ┌──────────────────────────────────────────────┐
            │ 动态组装为包含完整多轮历史的 Messages 列表传递给模型 │
            └──────────────────────────────────────────────┘
```

#### 三种核心记忆管理策略对比：

1. **滑动窗口记忆（Window Buffer Memory）**：
   - 仅保留最近的 $K$ 轮（如最近 5 轮）对话，丢弃过早的历史。
   - **优点**：简单高效；**缺点**：较早前聊过的核心前置事实会被遗忘。
2. **Token 限制截断记忆（Summary / Token Buffer）**：
   - 设定严格的 Token 上限（如不超过 2000 Token），自底向上逐轮容纳对话，超出阈值时从最旧的一轮开始剔除。
3. **滚动摘要记忆（Conversation Summary Memory）**：
   - 当历史过长时，后台调用轻量小模型对早期历史进行归纳提炼，输出一段浓缩摘要（Summary），后续 Prompt 结构为：`[系统摘要] + [最近 2 轮原汁原味对话] + [当前提问]`，兼顾长周期事实记忆与低 Token 消耗。
""",
            "tips": [
                {
                    "kind": "tip",
                    "text": "在生产环境中，千万不要把所有用户的会话历史都保存在单台服务器的 Python 进程内存中，必须接入 Redis 或数据库持久化，防止服务重启会话丢失。"
                },
                {
                    "kind": "note",
                    "text": "使用 LCEL 构建多轮对话时，在 PromptTemplate 中使用 `MessagesPlaceholder(variable_name='history')` 可以优雅声明历史消息注入插槽。"
                }
            ],
            "demos": [
                {
                    "title": "带滑动窗口记忆与历史组装的多轮会话链纯 Python 实现",
                    "lang": "python",
                    "code": """# 纯 Python 实现多轮对话滑动窗口记忆管理与链式组装
from typing import List, Dict

class SlidingWindowMemory:
    \"\"\"固定窗口大小 (K 轮) 的多轮会话记忆管理器\"\"\"
    def __init__(self, max_turns: int = 2):
        self.max_turns = max_turns
        self.history: List[Dict[str, str]] = []

    def add_user_message(self, content: str):
        self.history.append({"role": "user", "content": content})
        self._truncate()

    def add_ai_message(self, content: str):
        self.history.append({"role": "assistant", "content": content})
        self._truncate()

    def _truncate(self):
        # 每轮包含 1 条 user 和 1 条 assistant，即 2 条消息
        max_messages = self.max_turns * 2
        if len(self.history) > max_messages:
            # 丢弃最老的一轮
            self.history = self.history[-max_messages:]

    def get_messages(self) -> List[Dict[str, str]]:
        return list(self.history)

class SimpleChatChain:
    def __init__(self, system_prompt: str, memory: SlidingWindowMemory):
        self.system_prompt = system_prompt
        self.memory = memory

    def chat(self, user_input: str) -> str:
        # 1. 组装完整上下文
        messages = [{"role": "system", "content": self.system_prompt}]
        messages.extend(self.memory.get_messages())
        messages.append({"role": "user", "content": user_input})

        # 2. 模拟大模型根据上下文作答
        if "我刚才提到了谁" in user_input:
            history_text = " ".join([m['content'] for m in self.memory.get_messages()])
            reply = f"根据记忆，你在历史中提到了: {history_text}"
        else:
            reply = f"已收到关于 '{user_input}' 的提问，解答完毕。"

        # 3. 写入记忆
        self.memory.add_user_message(user_input)
        self.memory.add_ai_message(reply)
        return reply

memory = SlidingWindowMemory(max_turns=2)
bot = SimpleChatChain(system_prompt="你是一位智能助手。", memory=memory)

print("=== 开始多轮会话交互 ===")
r1 = bot.chat("我想了解深度学习专家 Hinton 的成就")
print("轮次 1 回答:", r1)

r2 = bot.chat("他曾经获得过图灵奖对吗？")
print("轮次 2 回答:", r2)

# 第 3 轮：检验滑动窗口内是否还保留第一轮信息
r3 = bot.chat("我刚才提到了谁？")
print("轮次 3 回答:", r3)
assert "Hinton" in r3

# 第 4 轮：继续对话，使得第 1 轮消息被滑出窗口
bot.chat("那下一代计算架构是什么？")
bot.chat("量子计算进展如何？")
r5 = bot.chat("我刚才提到了谁？")
print("轮次 5 回答 (最老轮次已滑出):", r5)
assert "Hinton" not in r5, "超出 max_turns=2 的旧记忆应已被正常滑出窗口丢弃"

print("\\n✓ 滑动窗口多轮对话记忆管理逻辑验证通过！")
"""
                }
            ]
        }
    ],
    "exercises": [
        {
            "id": "llma-ex-41",
            "type": "single",
            "difficulty": 1,
            "question": "在 LangChain Expression Language (LCEL) 中，表达式 `chain = prompt | model | parser` 能够在 Python 语言中被成功解析执行，主要依赖了哪一个特殊的魔法重载方法（Dunder Method）？",
            "options": [
                {"value": "A", "label": "__add__ 与 __radd__"},
                {"value": "B", "label": "__or__ 与 __ror__"},
                {"value": "C", "label": "__getitem__"},
                {"value": "D", "label": "__call__"}
            ],
            "answer": "B",
            "explanation": "LCEL 巧妙地重载了 Python 的按位或运算符（Bitwise OR operator）对应的魔术方法 `__or__`（以及右侧反向调用的 `__ror__`），将各组件串联构建成一个具备拓扑执行流的 RunnableSequence 序列。",
            "tags": ["LCEL", "运算符重载", "LangChain 底层"]
        },
        {
            "id": "llma-ex-42",
            "type": "single",
            "difficulty": 1,
            "question": "LangChain 从 0.2/0.3 版本开始将原有的单体项目拆解为 langchain-core、langchain-community 等独立包，其主要的设计架构动机是什么？",
            "options": [
                {"value": "A", "label": "为了让安装包体积变得尽可能巨大"},
                {"value": "B", "label": "解耦基础协议接口与庞杂的第三方外部依赖，提升核心运行稳定性与依赖解析效率"},
                {"value": "C", "label": "完全放弃 Python，改用 Rust 重写全部业务逻辑"},
                {"value": "D", "label": "禁止开发者使用任何开源模型"}
            ],
            "answer": "B",
            "explanation": "早期单体设计导致开发者只要安装 LangChain 就会拉取上百个臃肿的第三方库，造成频繁的依赖版本冲突。拆分后，langchain-core 仅包含纯粹的 Runnable 抽象与基类，零冗余第三方依赖，极大提升了生产级可靠性。",
            "tags": ["架构演进", "langchain-core", "模块化"]
        },
        {
            "id": "llma-ex-43",
            "type": "single",
            "difficulty": 2,
            "question": "在 LangChain 的 Runnable 统一规范中，如果需要对链条内部发生的各个子节点事件进行细粒度、低延迟的异步流式监听（例如实时监听检索器何时完成、模型何时吐字），应当调用哪个官方方法？",
            "options": [
                {"value": "A", "label": "runnable.invoke()"},
                {"value": "B", "label": "runnable.astream_events()"},
                {"value": "C", "label": "runnable.batch()"},
                {"value": "D", "label": "runnable.to_json()"}
            ],
            "answer": "B",
            "explanation": "在 LangChain 现代体系中，`astream_events(version='v2')` 是用于实时消费链内部流式事件的最高阶标准方法。它能捕获从 on_chat_model_stream 到 on_retriever_end 的每一个事件脉冲。",
            "tags": ["Runnable", "astream_events", "流式事件"]
        },
        {
            "id": "llma-ex-44",
            "type": "judge",
            "difficulty": 1,
            "question": "大语言模型（如 GPT-4、DeepSeek）的 API 本身是完全无状态（Stateless）的，若要实现多轮连续对话，后端必须自行在每次请求中将历史会话记录一并拼接进上下文中传入。",
            "options": [
                {"value": "true", "label": "正确"},
                {"value": "false", "label": "错误"}
            ],
            "answer": "true",
            "explanation": "所有主流的大语言模型 HTTP API 均遵循无状态架构，服务端不会自动为你保持上下文指针。客户端或应用层必须负责维护会话历史并在请求时动态组装 messages 列表。",
            "tags": ["无状态 API", "会话记忆", "架构本质"]
        },
        {
            "id": "llma-ex-45",
            "type": "fill",
            "difficulty": 2,
            "question": "在 LangChain 中，用于把 ChatModel 生成的原始 AIMessage 对象中的纯文本字符串内容提取出来的核心基础输出解析器类名是 _________。",
            "blanks": [["StrOutputParser"]],
            "explanation": "StrOutputParser 是最经典且最常用的解析器，它实现 Runnable 接口，接收 AIMessage / BaseMessage 并将其 `.content` 字段以纯字符串形式输出。",
            "tags": ["StrOutputParser", "输出解析器", "LangChain"]
        },
        {
            "id": "llma-ex-46",
            "type": "multiple",
            "difficulty": 2,
            "question": "相比于传统编写多重嵌套函数调用的方式，使用 LCEL（LangChain 表达式语言）构建流水线具备哪些工程优势？",
            "options": [
                {"value": "A", "label": "开箱即用原生支持同步、异步（async/await）、批处理（batch）与流式（stream）调用"},
                {"value": "B", "label": "天然支持并发优化，能够在依赖图独立节点间自动执行并行调度"},
                {"value": "C", "label": "统一对接 LangSmith 等追踪与可观测性平台，便于生产监控与链路排查"},
                {"value": "D", "label": "能够自动替公司免除大模型 API 的调用计费"}
            ],
            "answer": ["A", "B", "C"],
            "explanation": "LCEL 规范统一了接口生命周期，提供自动流式支持、异步并发与全链路追踪集成（LangSmith/OpenTelemetry）。选项 D 纯属天方夜谭。",
            "tags": ["LCEL", "工程优势", "可观测性"]
        },
        {
            "id": "llma-ex-47",
            "type": "multiple",
            "difficulty": 2,
            "question": "在设计长对话会话记忆架构时，为了避免历史记录过长导致超出上下文窗口或 Token 费用激增，常见的工程管理手段包括哪些？",
            "options": [
                {"value": "A", "label": "滑动窗口截断（Sliding Window）：只保留最近的 K 轮对话"},
                {"value": "B", "label": "Token 预算截断（Token Buffer）：统计历史 Token 消耗，自底向上保留不超过上限的消息"},
                {"value": "C", "label": "滚动摘要生成（Conversation Summary）：后台调用轻量小模型对较早前的历史做浓缩摘要保留"},
                {"value": "D", "label": "将所有历史对话中的汉字随机删除一半"}
            ],
            "answer": ["A", "B", "C"],
            "explanation": "控制长对话历史的三大主流模式即为滑动窗口（按轮数）、Token 阈值控制（按字数）与滚动摘要压缩（按语义）。选项 D 会破坏语义连贯性。",
            "tags": ["Memory 管理", "多轮对话", "最佳实践"]
        },
        {
            "id": "llma-ex-48",
            "type": "code",
            "difficulty": 3,
            "question": "请编写一个名为 `SimpleRunnablePipeline` 的轻量管道调度类。要求：构造函数接收一个处理函数列表 `functions`；实现 `__or__(self, other)` 运算符重载，使得 `pipeline | next_func` 或 `pipeline1 | pipeline2` 能够返回包含两者所有处理函数的全新 `SimpleRunnablePipeline` 对象；实现 `invoke(self, data)` 方法：将输入 `data` 顺次通过内部的所有函数，并返回最终处理结果。",
            "setupCode": "",
            "answer": "class SimpleRunnablePipeline:\n    def __init__(self, functions=None):\n        self.functions = list(functions) if functions else []\n\n    def __or__(self, other):\n        if isinstance(other, SimpleRunnablePipeline):\n            return SimpleRunnablePipeline(self.functions + other.functions)\n        elif callable(other):\n            return SimpleRunnablePipeline(self.functions + [other])\n        else:\n            raise TypeError('管道右侧必须为 SimpleRunnablePipeline 或可调用对象')\n\n    def invoke(self, data):\n        current = data\n        for f in self.functions:\n            current = f(current)\n        return current\n",
            "tests": "# 测试用例 1: 管道与函数串联\np1 = SimpleRunnablePipeline([lambda x: x + 10])\np2 = p1 | (lambda x: x * 2) | (lambda x: f'Result: {x}')\n\nassert p2.invoke(5) == 'Result: 30'  # (5 + 10) * 2 = 30\nassert p1.invoke(5) == 15            # 原管道不受影响 (不变性)\n\n# 测试用例 2: 两个 Pipeline 相互串联\npA = SimpleRunnablePipeline([str.strip, str.lower])\npB = SimpleRunnablePipeline([lambda s: s.replace('world', 'python')])\np_combined = pA | pB\n\nassert p_combined.invoke('  Hello WORLD!  ') == 'hello python!'\n\nprint('SimpleRunnablePipeline test cases passed!')\n",
            "explanation": "在自定义管道类中重载 __or__ 运算符，将右侧的处理函数或管道对象追加并生成新的管道序列，在 invoke 时自左向右流水线传递数据。",
            "tags": ["管道重载", "LCEL", "编程实战"]
        }
    ]
}
