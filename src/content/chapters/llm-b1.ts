import type { Chapter } from '../../types';
import { llmB1Extra2 } from './llm-b1-extra2';
import { llmB1Extra } from './llm-b1-extra';

/** 《RAG 检索增强生成》章节 */
export const llm_b1Chapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'llm-b1-c1',
    title: 'RAG 检索增强生成',
    goal: '掌握 RAG 的完整链路（切分、向量化、检索、重排、生成），理解各环节的常见问题与优化手段。',
    lessons: [
      {
        id: 'llm-b1-c1-l1',
        title: 'RAG 的完整链路与文档切分',
        content: `
### 学习目标

学完本节，你应该能够：
1. 画出 RAG 五阶段链路并说明每阶段的输入输出；
2. 对比五种切分策略，写出 size/overlap 的经验区间；
3. 用 embedding 相似度完成一次迷你检索并解释余弦/内积/欧氏的取舍。

### 前置知识

- llm-a1 的 embedding 概念；
- 无其他硬前置。

### 问题背景

大模型的知识冻结在训练时点、还会一本正经地胡说；企业私有知识更是模型从未见过的。RAG 用『检索外部知识库再生成』同时解决时效、幻觉与私有数据三个问题——但链条上任何一环（切分/检索/生成）掉链子，整套系统就变成『带引用的胡说』。

### 直觉理解

RAG 像开卷考试：模型是考生，向量库是允许携带的资料册。切分是把教材撕成卡片（撕坏了就找不回答案）；embedding 是给每张卡片做语义指纹；检索是按指纹找卡片；生成是『只准照着卡片作答』。评估就是抽查：找没找到（Recall@K）、答得有没有出处（忠实度）、不知道时会不会承认（拒答）。

### 核心概念与原理详解

## 为什么需要 RAG

大模型的知识**固定于训练时点**，且容易"一本正经地胡说"（幻觉）。RAG（Retrieval-Augmented Generation）通过**检索外部知识库**，把相关内容放入上下文再生成。

**优点**：

1. 知识可实时更新（改文档即可，无需重训）；
2. 可引用来源，便于核查；
3. 降低幻觉率；
4. 可处理私有数据。

## RAG 的五个阶段

\`\`\`
① 切分（Chunking） → ② 向量化（Embedding） → ③ 存储（Vector DB）
                                    ↓
⑥ 生成（Generation） ← ⑤ 重排（Rerank） ← ④ 检索（Retrieval）
\`\`\`

<Diagram type="arch" name="rag-pipeline" />

## ① 文档切分（Chunking）：最容易被低估的一步

**为什么要切分**：上下文窗口有限，且检索粒度太粗会引入无关内容。

**切分策略对比**：

| 策略 | 说明 | 优缺点 |
| --- | --- | --- |
| 固定长度 | 每 N 个字符/token 一段 | 简单，但会切断语义 |
| 按段落/句子 | 按自然边界切 | 语义完整，长度不均 |
| 递归切分 | 优先按段落，过长再按句子 | **最常用** |
| 语义切分 | 用 embedding 判断语义断点 | 效果好但成本高 |
| 父子切分 | 小块用于检索，大块用于生成 | 兼顾精度与上下文 |

**关键参数**：

- **chunk size**：常见 200~1000 token。太小则语义不完整，太大则噪声多；
- **chunk overlap**：相邻块重叠 10%~20%，避免边界信息丢失。

\`\`\`python
def chunk_by_chars(text, size=500, overlap=50):
    chunks = []
    start = 0
    while start < len(text):
        end = start + size
        chunks.append(text[start:end])
        start = end - overlap
    return chunks
\`\`\`

## ②③ 向量化与向量数据库

用 embedding 模型把文本变成向量，语义相近的向量距离更近。

**相似度度量**：

- **余弦相似度**：看方向，最常用；
- **内积**：看方向与长度；
- **欧氏距离**：看绝对距离。

\`\`\`python
import numpy as np

def cosine_sim(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))
\`\`\`

**常用向量数据库**：FAISS（本地/高效）、Chroma（轻量）、Milvus/Qdrant/Weaviate（生产级）、pgvector（PostgreSQL 扩展）。

## ④ 检索：不止向量检索

| 方式 | 优点 | 缺点 |
| --- | --- | --- |
| 向量检索（dense） | 理解语义，同义词友好 | 精确匹配弱（如型号、编号） |
| 关键词检索（BM25/sparse） | 精确匹配强 | 不懂语义 |
| **混合检索（Hybrid）** | 兼顾两者 | 需要融合分数 |

**融合方法**：RRF（Reciprocal Rank Fusion）——按排名而非分数融合：

\`\`\`
score = Σ 1 / (k + rank_i)
\`\`\`

## ⑤ 重排（Rerank）

向量召回通常取 Top-50~100，再用**交叉编码器（Cross-Encoder）**精排取 Top-5~10。

**区别**：

- **双塔（Bi-Encoder）**：query 与 doc 分别编码，可预先建索引，快但精度略低；
- **交叉编码器（Cross-Encoder）**：query 与 doc 拼接后一起编码，精度高但慢，只能用于重排小候选集。

## ⑥ 生成：把检索结果拼进提示

\`\`\`
请根据以下资料回答问题，如果资料中没有答案，请明确说明。

[资料 1] ...
[资料 2] ...

问题：...
\`\`\`

**要点**：
1. 明确要求"基于资料回答、无答案时说明"；
2. 要求给出来源编号；
3. 控制资料总长度，避免超上下文。

<RAGPipelineDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
np.set_printoptions(precision=3, suppress=True)
docs = ["退货政策：签收后 7 天内可无理由退货，需保留吊牌。", "发货时效：现货 48 小时内发出。",
        "会员权益：每年两次免费清洗服务。", "退款流程：退货签收后 3 个工作日原路退回。"]
def embed(t, dim=32):
    v = np.zeros(dim)
    for ch in t: v[ord(ch) % dim] += 1
    return v / (np.linalg.norm(v) + 1e-9)
M = np.array([embed(d) for d in docs])
q = embed("7 天无理由退货怎么操作")
sims = M @ q
top = sims.argsort()[::-1][:2]
print("检索 Top-2:", [f"doc{i}({sims[i]:.2f})" for i in top])
answer = "签收后 7 天内可无理由退货，需保留吊牌；退款在退货签收后 3 个工作日原路退回。"
claims = [("7 天内可无理由退货", "无理由退货"), ("退款 3 个工作日原路退回", "3 个工作日"), ("客服全年无休", "客服全年")]
ctx = docs[top[0]] + docs[top[1]]
faith = [key in ctx for _, key in claims]
print("论断支撑检查:", [(c, f) for (c, _), f in zip(claims, faith)], f"忠实度={np.mean(faith):.2f}")
# Recall@2 / MRR
rel = {0, 3}
rank_hits = [i for i in np.argsort(-sims) if i in rel]
print(f"Recall@2={len(rank_hits[:2])/len(rel):.2f} | MRR={np.mean([1/(list(np.argsort(-sims)).index(r)+1) for r in rel]):.2f}")\`\`\`

预期输出（实测）：迷你 RAG：查询『7 天无理由退货怎么操作』检索 Top-2 = doc0(0.75)/doc3(0.60)，Recall@2=1.00、MRR=0.75；论断支撑：『7 天内可无理由退货』与『退款 3 个工作日原路退回』有依据、『客服全年无休』无依据 → 忠实度=0.67（暴露无出处论断）。

**常见错误**：切分把答案拦腰截断且无 overlap，检索命中了却拼不出答案；把 top-10 全塞进上下文，噪声淹没证据导致忠实度下降；评估只看『回答顺不顺』不建评估集，改一版切分参数全凭感觉。

### 常见误区

1. **『RAG 等于向量数据库』**——检索只是五阶段之一，切分质量与生成约束同样决定成败；\\n2. **『召回越多越好』**——top-k 过大引入噪声并稀释注意力，工业界常 top-3~5 + 重排；\\n3. **『RAG 能消灭幻觉』**——它显著降低事实幻觉，但引用幻觉与逻辑幻觉仍在，必须配合忠实度评估与拒答设计。

### 知识关联

- **向前**：llm-b2 的 Agent 把 RAG 当作一种工具调用；
- **向后**：c2/c3/c4 逐环深挖本章流程，c5/c6 给出自适应与图谱化两条进阶路线；
- **平行**：llm-a5 的语料清洗与本章切分共享 MinHash/质量过滤工具箱。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 五阶段 | 切分→向量化→存储→检索→重排→生成 |
| 切分 | 递归切分最常用，size 200~1000 tok，overlap 10%~20% |
| 相似度 | 余弦最常用；父-子块兼顾精度与上下文 |
| 评估 | 检索层 Recall@K/MRR + 生成层忠实度/相关性（RAGAS）|
| 失败模式 | 答非所问/编造细节/该拒不拒 → 分别对症 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Lewis et al. (2020) arXiv:2005.11401《RAG》、Asai et al. (2023) arXiv:2310.11511《Self-RAG》、Edge et al. (2024) arXiv:2404.16130《GraphRAG》与 RAGAS 评估框架文档相应章节）
`,
        tips: [
          {
            kind: 'interview',
            text: '"RAG 的完整链路"要能说出六步：切分 → 向量化 → 存储 → 检索 → 重排 → 生成，并指出切分与检索是最影响效果的两个环节。',
          },
          {
            kind: 'pitfall',
            text: 'chunk 过大是常见错误：检索精度下降、上下文被无关内容占满。先用 300~500 token + 10% overlap 作为起点，再按评估调整。',
          },
          {
            kind: 'leak',
            text: '纯向量检索对专有名词、编号、代码标识符效果差。加入 BM25 混合检索通常能明显提升召回率。',
          },
        ],
        demos: [
          {
            title: '余弦相似度检索（numpy 模拟）',
            lang: 'python',
            code: `import numpy as np

rng = np.random.default_rng(0)

# 模拟 5 个文档块的 embedding（真实场景由 embedding 模型生成）
docs = {
    "Python 列表推导式": rng.normal(1.0, 0.1, 8),
    "SQL 的 GROUP BY 分组": rng.normal(-1.0, 0.1, 8),
    "Transformer 自注意力机制": rng.normal(2.0, 0.1, 8),
    "pandas 缺失值处理": rng.normal(1.1, 0.1, 8),
    "Excel 数据透视表": rng.normal(-2.0, 0.1, 8),
}

def cosine(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

query = rng.normal(1.05, 0.1, 8)   # 查询向量
scores = {name: cosine(query, vec) for name, vec in docs.items()}
ranked = sorted(scores.items(), key=lambda kv: -kv[1])

print("检索结果（Top-3）:")
for name, s in ranked[:3]:
    print(f"  {s:.4f}  {name}")`,
          },
          {
            title: 'RRF 融合两路检索结果',
            lang: 'python',
            code: `def rrf_fusion(rankings, k=60):
    """rankings: 多个检索结果列表（每个是文档 id 列表，按相关性降序）"""
    scores = {}
    for rank_list in rankings:
        for rank, doc in enumerate(rank_list, start=1):
            scores[doc] = scores.get(doc, 0) + 1 / (k + rank)
    return sorted(scores.items(), key=lambda kv: -kv[1])

vector_results = ["doc3", "doc1", "doc5", "doc2"]
bm25_results = ["doc1", "doc2", "doc9", "doc3"]

fused = rrf_fusion([vector_results, bm25_results])
print("向量检索:", vector_results)
print("BM25  :", bm25_results)
print("\\nRRF 融合后:")
for doc, score in fused:
    print(f"  {doc}: {score:.5f}")`,
          },
        ],
      },
      {
        id: 'llm-b1-c1-l2',
        title: 'RAG 评估：忠实度、相关性与幻觉',
        content: `
### 学习目标

学完本节，你应该能够：
1. 列出检索层四指标（Recall@K/Precision@K/MRR/NDCG）的口径；
2. 解释忠实度/答案相关性/上下文精确/上下文召回（RAGAS）的评估方式；
3. 按五类失败模式给出对策并设计含『无法回答』类的评估集。

### 前置知识

- 「RAG 的完整链路与文档切分」（c1-l1）。

### 问题背景

大模型的知识冻结在训练时点、还会一本正经地胡说；企业私有知识更是模型从未见过的。RAG 用『检索外部知识库再生成』同时解决时效、幻觉与私有数据三个问题——但链条上任何一环（切分/检索/生成）掉链子，整套系统就变成『带引用的胡说』。

### 直觉理解

RAG 像开卷考试：模型是考生，向量库是允许携带的资料册。切分是把教材撕成卡片（撕坏了就找不回答案）；embedding 是给每张卡片做语义指纹；检索是按指纹找卡片；生成是『只准照着卡片作答』。评估就是抽查：找没找到（Recall@K）、答得有没有出处（忠实度）、不知道时会不会承认（拒答）。

### 核心概念与原理详解

## 为什么 RAG 必须评估

RAG 系统"看起来能用"不代表可靠。没有评估，就无法判断改动是提升还是倒退。

## RAG 评估的三个层次

**1. 检索质量（Retrieval）**

| 指标 | 含义 |
| --- | --- |
| Recall@K | 前 K 个结果中是否包含正确答案所在文档 |
| Precision@K | 前 K 个结果中相关文档的比例 |
| MRR | 第一个正确结果的排名倒数均值 |
| NDCG | 考虑位置的排序质量 |

**2. 生成质量（Generation）**

| 指标 | 含义 | 评估方式 |
| --- | --- | --- |
| **忠实度（Faithfulness）** | 回答是否有资料支撑、无编造 | 用 LLM 判断每个论断能否在资料中找到依据 |
| **答案相关性（Answer Relevancy）** | 回答是否切题 | LLM 判断 |
| **上下文召回（Context Recall）** | 资料是否覆盖了回答所需信息 | 与标准答案对比 |
| **上下文精确（Context Precision）** | 检索到的资料是否都有用 | LLM 判断 |

这些构成了 RAGAS 等评估框架的核心指标体系。

**3. 端到端**

- 人工打分（准确、有帮助、无幻觉）；
- A/B 测试（用户满意度、任务完成率）。

## 构建评估集的实用方法

1. **从真实问题出发**：收集 50~200 个真实用户问题；
2. **标注标准答案与依据文档**；
3. **覆盖类型**：简单事实、需要多文档综合、无法回答（应说不知道）、易混淆概念；
4. **版本化**：每次改 prompt / 切分策略 / 模型，都跑一遍评估集。

**"无法回答"类样本尤其重要**——它能暴露模型是否在编造。

## 常见失败模式与对策

| 现象 | 根因 | 对策 |
| --- | --- | --- |
| 答非所问 | 检索未召回相关内容 | 改切分、加混合检索、加同义词、调 embedding |
| 编造细节 | 提示未约束"仅依据资料" | 加约束 + 要求引用 + 降低温度 |
| 综合多个文档出错 | 上下文过长、信息冲突 | 重排取 Top-K、明确冲突处理规则 |
| 该说不知道时乱答 | 缺少拒答训练 | 提示中给出拒答示例（few-shot）|
| 回答太长太啰嗦 | 未限制格式 | 明确长度与结构要求 |

## 幻觉的类型

1. **事实幻觉**：编造不存在的事实（人名、数字、日期）；
2. **引用幻觉**：编造不存在的来源；
3. **逻辑幻觉**：推理链条错误但看似合理。

**RAG 能显著降低事实幻觉**（因为提供了依据），但**不能完全消除**——
模型仍可能曲解资料或过度推断。所以提示中必须要求"仅依据资料"并"标注不确定"。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
np.set_printoptions(precision=3, suppress=True)
docs = ["退货政策：签收后 7 天内可无理由退货，需保留吊牌。", "发货时效：现货 48 小时内发出。",
        "会员权益：每年两次免费清洗服务。", "退款流程：退货签收后 3 个工作日原路退回。"]
def embed(t, dim=32):
    v = np.zeros(dim)
    for ch in t: v[ord(ch) % dim] += 1
    return v / (np.linalg.norm(v) + 1e-9)
M = np.array([embed(d) for d in docs])
q = embed("7 天无理由退货怎么操作")
sims = M @ q
top = sims.argsort()[::-1][:2]
print("检索 Top-2:", [f"doc{i}({sims[i]:.2f})" for i in top])
answer = "签收后 7 天内可无理由退货，需保留吊牌；退款在退货签收后 3 个工作日原路退回。"
claims = [("7 天内可无理由退货", "无理由退货"), ("退款 3 个工作日原路退回", "3 个工作日"), ("客服全年无休", "客服全年")]
ctx = docs[top[0]] + docs[top[1]]
faith = [key in ctx for _, key in claims]
print("论断支撑检查:", [(c, f) for (c, _), f in zip(claims, faith)], f"忠实度={np.mean(faith):.2f}")
# Recall@2 / MRR
rel = {0, 3}
rank_hits = [i for i in np.argsort(-sims) if i in rel]
print(f"Recall@2={len(rank_hits[:2])/len(rel):.2f} | MRR={np.mean([1/(list(np.argsort(-sims)).index(r)+1) for r in rel]):.2f}")\`\`\`

预期输出（实测）：迷你 RAG：查询『7 天无理由退货怎么操作』检索 Top-2 = doc0(0.75)/doc3(0.60)，Recall@2=1.00、MRR=0.75；论断支撑：『7 天内可无理由退货』与『退款 3 个工作日原路退回』有依据、『客服全年无休』无依据 → 忠实度=0.67（暴露无出处论断）。

**常见错误**：切分把答案拦腰截断且无 overlap，检索命中了却拼不出答案；把 top-10 全塞进上下文，噪声淹没证据导致忠实度下降；评估只看『回答顺不顺』不建评估集，改一版切分参数全凭感觉。

### 常见误区

1. **『RAG 等于向量数据库』**——检索只是五阶段之一，切分质量与生成约束同样决定成败；\\n2. **『召回越多越好』**——top-k 过大引入噪声并稀释注意力，工业界常 top-3~5 + 重排；\\n3. **『RAG 能消灭幻觉』**——它显著降低事实幻觉，但引用幻觉与逻辑幻觉仍在，必须配合忠实度评估与拒答设计。

### 知识关联

- **向前**：llm-b2 的 Agent 把 RAG 当作一种工具调用；
- **向后**：c2/c3/c4 逐环深挖本章流程，c5/c6 给出自适应与图谱化两条进阶路线；
- **平行**：llm-a5 的语料清洗与本章切分共享 MinHash/质量过滤工具箱。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 五阶段 | 切分→向量化→存储→检索→重排→生成 |
| 切分 | 递归切分最常用，size 200~1000 tok，overlap 10%~20% |
| 相似度 | 余弦最常用；父-子块兼顾精度与上下文 |
| 评估 | 检索层 Recall@K/MRR + 生成层忠实度/相关性（RAGAS）|
| 失败模式 | 答非所问/编造细节/该拒不拒 → 分别对症 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Lewis et al. (2020) arXiv:2005.11401《RAG》、Asai et al. (2023) arXiv:2310.11511《Self-RAG》、Edge et al. (2024) arXiv:2404.16130《GraphRAG》与 RAGAS 评估框架文档相应章节）
`,
        tips: [
          {
            kind: 'interview',
            text: '"如何评估 RAG"的答题框架：分检索与生成两层，检索看 Recall@K/Precision，生成看忠实度/相关性，最后端到端人工评估。',
          },
          {
            kind: 'leak',
            text: '评估集中一定要包含"知识库中没有答案"的问题。模型在这些问题上是否老实说"不知道"，是判断幻觉的关键。',
          },
          {
            kind: 'pitfall',
            text: '只优化召回率而忽略忠诚度，会导致"检索到了但回答编造"。两者必须同时评估。',
          },
        ],
        demos: [
          {
            title: '计算 Recall@K 与 MRR',
            lang: 'python',
            code: `def recall_at_k(retrieved, relevant, k):
    topk = set(retrieved[:k])
    return len(topk & set(relevant)) / len(relevant) if relevant else 0.0

def mrr(retrieved, relevant):
    for i, doc in enumerate(retrieved, start=1):
        if doc in relevant:
            return 1.0 / i
    return 0.0

# 两个查询的检索结果
cases = [
    ("查询1", ["d3", "d1", "d5", "d2"], ["d1", "d2"]),
    ("查询2", ["d7", "d1", "d3"], ["d1"]),
]

for name, retrieved, relevant in cases:
    print(f"{name}: 检索={retrieved}, 相关={relevant}")
    for k in (1, 3, 5):
        print(f"   Recall@{k} = {recall_at_k(retrieved, relevant, k):.2f}")
    print(f"   MRR = {mrr(retrieved, relevant):.3f}\\n")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-b1-c1-e1',
        relatedLessonId: 'llm-b1-c1-l1',
        type: 'single',
        difficulty: 1,
        question: 'RAG（检索增强生成）的核心思路是？',
        options: [
          { value: 'A', text: '重新训练模型以更新知识' },
          { value: 'B', text: '先用检索找到相关资料，再让模型基于资料生成回答' },
          { value: 'C', text: '用更小的模型提升速度' },
          { value: 'D', text: '增加模型的参数数量' },
        ],
        answer: 'B',
        explanation:
          'RAG 不改变模型参数，而是在生成前检索外部知识注入上下文。优点是知识可实时更新、可溯源、降低幻觉。',
        tags: ['RAG'],
      },
      {
        id: 'llm-b1-c1-e2',
        relatedLessonId: 'llm-b1-c1-l1',
        type: 'judge',
        difficulty: 2,
        question: 'RAG 中 chunk 越大，检索效果一定越好。',
        answer: false,
        explanation:
          'chunk 过大会让单个块包含过多无关信息，检索精度下降，且会挤占上下文。chunk 过小则语义不完整。需要根据评估调优，常见 200~1000 token + 10%~20% overlap。',
        tags: ['RAG', '切分'],
      },
      {
        id: 'llm-b1-c1-e3',
        relatedLessonId: 'llm-b1-c1-l1',
        type: 'single',
        difficulty: 2,
        question: '下列哪项不是 RAG 相比纯微调的优势？',
        options: [
          { value: 'A', text: '知识可实时更新' },
          { value: 'B', text: '可以给出引用来源' },
          { value: 'C', text: '可以学习全新的推理能力' },
          { value: 'D', text: '无需重新训练模型' },
        ],
        answer: 'C',
        explanation:
          'RAG 提供的是**知识**，不能提升模型的**推理能力**。需要新的行为/能力时应使用微调。两者常结合使用。',
        tags: ['RAG'],
      },
      {
        id: 'llm-b1-c1-e4',
        relatedLessonId: 'llm-b1-c1-l1',
        type: 'multiple',
        difficulty: 2,
        question: 'RAG 效果不佳时，可能的原因有？（多选）',
        options: [
          { value: 'A', text: '文档切分不合理，导致语义被切断' },
          { value: 'B', text: '检索只用了向量，专有名词召回差' },
          { value: 'C', text: '提示中没有约束"只依据资料回答"' },
          { value: 'D', text: '模型的参数量不够大' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'A、B、C 都是 RAG 系统的典型故障点。D 不一定——很多 RAG 问题与模型规模无关，而是链路设计问题。',
        tags: ['RAG', '排障'],
      },
      {
        id: 'llm-b1-c1-e5',
        relatedLessonId: 'llm-b1-c1-l2',
        type: 'fill',
        difficulty: 2,
        question: 'RAG 评估中，衡量"回答是否能被检索到的资料支撑、没有编造"的指标叫 ___ 度。',
        blanks: [['忠实', 'faithfulness', 'Faithfulness']],
        explanation:
          '忠实度（Faithfulness）是 RAG 最重要的生成侧指标，衡量回答的每个论断能否在检索到的上下文中找到依据。',
        tags: ['RAG', '评估'],
      },
      {
        id: 'llm-b1-c1-e6',
        relatedLessonId: 'llm-b1-c1-l1',
        type: 'code',
        difficulty: 2,
        question:
          '实现 `cosine_similarity(a, b)`：用 numpy 计算两个向量的余弦相似度（保留 6 位小数）。\n\n注意处理零向量的情况（返回 0.0）。',
        starterCode: `import numpy as np

def cosine_similarity(a, b):
    ___

out = cosine_similarity(np.array([1.0, 0.0]), np.array([0.0, 1.0]))
`,
        setupCode: '',
        expectedOutput: '0.0',
        tests: `assert out == 0.0, f"正交向量相似度应为 0，实际 {out}"
assert abs(cosine_similarity(np.array([1.0, 2.0]), np.array([2.0, 4.0])) - 1.0) < 1e-6, "同方向向量应为 1"
assert abs(cosine_similarity(np.array([1.0, 0.0]), np.array([-1.0, 0.0])) + 1.0) < 1e-6, "反向向量应为 -1"
assert cosine_similarity(np.zeros(3), np.array([1.0, 2.0, 3.0])) == 0.0, "零向量应返回 0"
`,
        answer: `import numpy as np

def cosine_similarity(a, b):
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    na = np.linalg.norm(a)
    nb = np.linalg.norm(b)
    if na == 0 or nb == 0:
        return 0.0
    return round(float(np.dot(a, b) / (na * nb)), 6)

cosine_similarity(np.array([1.0, 0.0]), np.array([0.0, 1.0]))`,
        explanation:
          '```python\nna, nb = np.linalg.norm(a), np.linalg.norm(b)\nif na == 0 or nb == 0:\n    return 0.0\nreturn round(float(np.dot(a, b) / (na * nb)), 6)\n```\n\n余弦相似度 = 内积 / 模长乘积，取值 [-1, 1]。**零向量必须特判**，否则会除零得到 NaN。',
        tags: ['编程', '向量检索'],
      },
      {
        id: 'llm-b1-c1-e7',
        relatedLessonId: 'llm-b1-c1-l1',
        type: 'code',
        difficulty: 3,
        question:
          '实现 `retrieve(query_vec, docs, k)`：给定查询向量与 `{doc_name: vector}` 字典，返回相似度最高的 k 个文档名列表（按相似度降序）。',
        starterCode: `import numpy as np

def retrieve(query_vec, docs, k=2):
    ___

q = np.array([1.0, 0.0])
docs = {
    "A": np.array([1.0, 0.0]),
    "B": np.array([0.0, 1.0]),
    "C": np.array([0.9, 0.1]),
}
out = retrieve(q, docs, 2)
`,
        setupCode: '',
        expectedOutput: "['A', 'C']",
        tests: `assert out == ["A", "C"], f"应返回 ['A','C']，实际 {out}"
assert retrieve(q, docs, 1) == ["A"]
assert retrieve(q, docs, 10) == ["A", "C", "B"], "k 超过数量时返回全部"
assert retrieve(q, {}, 3) == [], "空文档库应返回空列表"
`,
        answer: `import numpy as np

def retrieve(query_vec, docs, k=2):
    if not docs:
        return []
    def cos(v):
        nv = np.linalg.norm(v)
        nq = np.linalg.norm(query_vec)
        if nv == 0 or nq == 0:
            return 0.0
        return float(np.dot(query_vec, v) / (nq * nv))
    scored = sorted(docs.items(), key=lambda kv: -cos(kv[1]))
    return [name for name, _ in scored[:k]]

q = np.array([1.0, 0.0])
docs = {
    "A": np.array([1.0, 0.0]),
    "B": np.array([0.0, 1.0]),
    "C": np.array([0.9, 0.1]),
}
retrieve(q, docs, 2)`,
        explanation:
          '```python\nscored = sorted(docs.items(), key=lambda kv: -cos(kv[1]))\nreturn [name for name, _ in scored[:k]]\n```\n\n`sorted(key=-score)` 实现降序。A 与查询完全同向（相似度 1），C 接近（约 0.994），B 正交（0），因此 Top-2 是 A、C。',
        tags: ['编程', '检索'],
      },
      {
        id: 'llm-b1-c1-e8',
        relatedLessonId: 'llm-b1-c1-l1',
        type: 'single',
        difficulty: 3,
        question: '为什么 RAG 中常需要「重排（Rerank）」这一步？',
        options: [
          { value: 'A', text: '向量检索不够快' },
          { value: 'B', text: '双塔检索精度有限，用交叉编码器对小候选集精排可提升相关性' },
          { value: 'C', text: '重排可以减少 token 消耗' },
          { value: 'D', text: '重排可以训练模型' },
        ],
        answer: 'B',
        explanation:
          '向量检索（双塔）为了速度牺牲了 query 与 doc 的交互建模；交叉编码器把两者拼一起编码，精度更高但慢，因此只用于对 Top-50 候选做精排。',
        tags: ['RAG', '重排'],
      },
      {
        id: 'llm-b1-c1-e9',
        relatedLessonId: 'llm-b1-c1-l2',
        type: 'multiple',
        difficulty: 3,
        question: '关于混合检索（Hybrid Search），下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '结合了向量检索的语义理解与 BM25 的精确匹配' },
          { value: 'B', text: 'RRF 按排名而非原始分数融合，避免不同分数尺度问题' },
          { value: 'C', text: '对专有名词、型号编号这类查询尤其有效' },
          { value: 'D', text: '混合检索一定比单一检索快' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          '混合检索要跑两路再融合，通常**更慢**而非更快（D 错误），但召回质量更高。RRF 的价值正是绕开"两路分数不可比"的问题。',
        tags: ['混合检索'],
      },
      {
        id: 'llm-b1-c1-e10',
        relatedLessonId: 'llm-b1-c1-l1',
        type: 'code',
        difficulty: 3,
        question:
          '实现 `chunk_text(text, size, overlap)`：按固定长度切分文本，相邻块重叠 `overlap` 个字符。\n\n返回列表；若文本为空返回空列表。',
        starterCode: `def chunk_text(text, size=10, overlap=3):
    ___

out = chunk_text("abcdefghijklmnopqrstuvwxyz", 10, 3)
`,
        setupCode: '',
        expectedOutput: '首块为前 10 个字符',
        tests: `assert len(out) > 1, "应切出多个块"
assert out[0] == "abcdefghij", f"首块应为 abcdefghij，实际 {out[0]}"
assert out[1].startswith("hij"), f"第二块应重叠 'hij'，实际 {out[1]}"
assert chunk_text("", 10, 3) == [], "空文本应返回 []"
assert chunk_text("short", 10, 3) == ["short"], "短文本应只有一个块"
`,
        answer: `def chunk_text(text, size=10, overlap=3):
    if not text:
        return []
    if overlap >= size:
        overlap = size - 1
    chunks = []
    start = 0
    while start < len(text):
        end = start + size
        chunks.append(text[start:end])
        if end >= len(text):
            break
        start = end - overlap
    return chunks

chunk_text("abcdefghijklmnopqrstuvwxyz", 10, 3)`,
        explanation:
          '```python\nstart = 0\nwhile start < len(text):\n    end = start + size\n    chunks.append(text[start:end])\n    if end >= len(text):\n        break\n    start = end - overlap\nreturn chunks\n```\n\n**注意两个边界**：① 最后一块可能不足 size，需要 break 防止无限循环；② `overlap >= size` 会导致 `start` 不前进（死循环），必须校正。',
        tags: ['编程', '切分'],
      },
      {
        id: 'llm-b1-c1-e11',
        relatedLessonId: 'llm-b1-c1-l2',
        type: 'judge',
        difficulty: 3,
        question: 'RAG 可以从根本上消除大模型的幻觉问题。',
        answer: false,
        explanation:
          'RAG 能显著降低事实幻觉（提供依据），但不能完全消除——模型仍可能曲解资料、过度推断或编造引用。需要配合提示约束、引用要求与评估监控。',
        tags: ['RAG', '幻觉'],
      },
      {
        id: 'llm-b1-c1-e12',
        relatedLessonId: 'llm-b1-c1-l2',
        type: 'fill',
        difficulty: 3,
        question: '融合向量检索与关键词检索的排名时，常用的算法是 RRF，即 Reciprocal Rank ___。',
        blanks: [['Fusion', 'fusion', '融合']],
        explanation:
          'RRF（Reciprocal Rank Fusion）按 1/(k+rank) 累加各路的排名，避免直接合并不同量纲的分数。',
        tags: ['混合检索'],
      },
      {
        id: 'llm-b1-c1-e13',
        relatedLessonId: 'llm-b1-c1-l2',
        type: 'open',
        difficulty: 4,
        question:
          '某公司的 RAG 助手上线后，用户反馈"经常答非所问"。请系统地分析可能的问题点，并给出对应的排查与优化方案。',
        referenceAnswer: `按 RAG 链路逐环节排查：

**1. 切分环节**
- 现象：语义被切断、块过小或过大。
- 排查：抽取若干失败案例，检查命中文档块的内容是否完整。
- 优化：改为按段落/标题的递归切分；chunk size 调到 300~500 token，overlap 10%~20%。

**2. 向量化与索引**
- 现象：同义表达检索不到（如"怎么退款" vs "退换货政策"）。
- 排查：用一组同义问题测试 Recall@K。
- 优化：更换/微调 embedding 模型；加入同义词扩展；对领域术语建立词典。

**3. 检索策略**
- 现象：专有名词、产品型号、代码标识符匹配差。
- 优化：加入 BM25 混合检索 + RRF 融合；适当增加 Top-K。

**4. 重排**
- 现象：Top-K 中相关文档排名靠后，模型被噪声干扰。
- 优化：引入 Cross-Encoder 重排，取 Top-5。

**5. 生成提示**
- 现象：资料正确但回答跑题。
- 优化：明确"仅依据资料回答"、"资料不足时说明"；要求引用来源编号；降低温度。

**6. 上下文组织**
- 现象：资料太多互相冲突或淹没关键信息。
- 优化：限制资料总长度，按相关性排序，明确冲突处理规则。

**7. 评估体系**
- 建立 50~200 条真实问题的评估集，包含"无答案"类样本；
- 分别计算 Recall@K（检索）与忠实度/相关性（生成），定位瓶颈在哪个环节；
- 每次调整后回归测试，避免"改好了 A、弄坏了 B"。`,
        rubric: [
          { point: '按链路系统性排查（切分/检索/重排/提示/上下文）', score: 3 },
          { point: '指出切分不合理与向量检索对专有名词的局限', score: 2 },
          { point: '提出混合检索 + 重排的优化', score: 1 },
          { point: '建立评估集并分层评估（检索指标 + 生成指标）', score: 2 },
        ],
        keywords: ['切分', '召回', '混合检索', '重排', '忠实度', '评估集'],
        explanation:
          '这道题考察"系统性排障"能力。能按链路逐段排查，并用评估指标定位瓶颈，是资深 RAG 工程师的标志。',
        tags: ['RAG', '排障'],
      },
    ],
  },
  ...llmB1Extra,
  ...llmB1Extra2,
];
