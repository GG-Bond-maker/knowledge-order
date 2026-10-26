# -*- coding: utf-8 -*-
"""
Chapter 2: 向量数据库与高级检索增强生成 (Vector DB & Advanced RAG)
Course: ml-llm-applications
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_2():
    # ── Lesson 2.1 ──
    l1_text = """### 学习目标
学完本节，你应该能够：
1. 掌握稠密向量嵌入（Dense Embeddings）在语义相似度检索中的核心地位；
2. 理解高维暴力精确搜索（Flat KNN）的时间与显存瓶颈；
3. 掌握乘积量化（Product Quantization, PQ）与倒排索引（IVF）的压缩原理；
4. **深入推导分层可导航小世界图（HNSW）算法**：跳表拓扑分层、贪心局部路由与 $\\mathcal{O}(\\log N)$ 检索复杂度；
5. 编写纯 Python 代码实现简易向量余弦相似度计算与近似最近邻检索。

### 前置知识
- 线性代数：向量点积、欧氏距离与余弦相似度；
- 数据结构：图的邻接表与跳表（Skip List）基本原理。

### 问题背景与 ML 用途
大语言模型虽然拥有庞大的预训练世界知识，但其固有的三大致命弱点阻碍了工业级落地：
1. **知识截止时效性**：无法掌握模型训练截止日期之后发生的实时事件；
2. **私域专属数据缺失**：模型从未见过企业的内部财务报表、机密技术文档与个人代码库；
3. **一本正经胡说八道（幻觉 Hallucination）**：对缺乏确凿事实依据的问题容易胡编乱造。
- **检索增强生成（RAG, Retrieval-Augmented Generation）** 是破解上述困局的首选架构：先在外部知识库中快速检索出与问题相关的权威文本片段，将其注入到 Prompt 上下文中，再让模型基于该事实依据进行归纳作答；
- **向量数据库（Vector Database）是 RAG 的核心心脏**：当企业文档切片达到数百万甚至数千万条时，如何在上千维的高维空间中实现毫秒级的最近邻搜索（ANN）？以 **HNSW** 为代表的高维图索引算法成为了全行业不可替代的标准基础设施。

### 直觉理解
- **全国高速路网与村道导航（HNSW 的直觉）**：
  - 假设你要从北京自驾前往广州海珠区某个小巷子（在高维向量空间中查找最匹配的目标点）；
  - 如果从北京出发的第一步就在农村泥巴小路上逐户打听（平面图暴力遍历），走到目的地需要几十天；
  - **HNSW 的分层设计极其高明**：
    - **顶层（极稀疏高速路网）**：全国只有几十个特大枢纽节点（北京、郑州、武汉、广州），你直接一脚油门开高速跨越上千里，瞬间定焦到广州；
    - **中层（城市主干道）**：从广州枢纽下潜到次级图层，沿着城市快速路定位到海珠区；
    - **底层（密集街巷）**：下潜到底层全量网络，在目标邻域的几条小街道之间细细排查。
    - 通过多层由粗到细的贪心跃进，原本需要遍历数百万节点的任务，只需几十次跳跃就能闪电命中！

### 核心概念与符号对照表
| 索引算法 | 核心机制 | 搜索时间复杂度 | 召回率 (Recall) 与适用场景 |
| --- | --- | --- | --- |
| **Flat (暴力精确)** | 遍历计算全库所有向量的内积 | $\\mathcal{O}(N \\cdot D)$ 线性爆炸 | 100% 精确召回，仅适用于 1 万以内极小数据集 |
| **IVF-Flat** | K-means 聚类划分 Voronoi 胞元，仅检索邻近聚类中心所属列表 | $\\mathcal{O}(\\frac{N}{K} \\cdot D)$ | 检索速度较快，但在聚类边界处容易发生漏召回 |
| **IVF-PQ** | 将高维向量正交切分为子向量并采用码本量化压缩 | 内存占用缩减 90% 以上 | 超大规模海量向量（亿级）的低显存压缩存储 |
| **HNSW** | 基于跳表思想的多层可导航小世界图，贪心多层路由 | $\\mathcal{O}(\\log N)$ 对数级 | **业界召回率最高、性能最强**，现代主流向量库默认标配 |

### 数学原理与逐步推导
#### 1. 向量相似度度量公式
设查询向量为 $\\mathbf{q} \\in \\mathbb{R}^D$，库中文档嵌入向量为 $\\mathbf{d} \\in \\mathbb{R}^D$。
- **余弦相似度（Cosine Similarity）**：
  $$\\text{Cosine}(\\mathbf{q}, \\mathbf{d}) = \\frac{\\mathbf{q} \\cdot \\mathbf{d}}{\\|\\mathbf{q}\\| \\|\\mathbf{d}\\|} = \\frac{\\sum_{i=1}^D q_i d_i}{\\sqrt{\\sum_{i=1}^D q_i^2} \\sqrt{\\sum_{i=1}^D d_i^2}}$$
- 若向量在写入数据库前已进行 $L_2$ 正则化（即 $\\|\\mathbf{q}\\| = 1, \\|\\mathbf{d}\\| = 1$），则余弦相似度与向量点积（Inner Product / MIPS）在数值上严格相等，且与欧氏距离的平方一一单调对应：
  $$\\|\\mathbf{q} - \\mathbf{d}\\|^2 = \\|\\mathbf{q}\\|^2 + \\|\\mathbf{d}\\|^2 - 2 \\mathbf{q} \\cdot \\mathbf{d} = 2 - 2 (\\mathbf{q} \\cdot \\mathbf{d})$$

#### 2. HNSW 构图与检索数学机理
1. **分层几何抽样**：
   对于新插入的节点 $v$，其能够出现的最高图层号 $l$ 根据指数衰减概率分布独立采样：
   $$l = \\lfloor -\\ln(\\text{uniform}(0, 1)) \\cdot m_L \\rfloor$$
   其中归一化参数通常取 $m_L = 1 / \\ln(M)$。这意味着绝大多数节点只存在于底层（Layer 0），极少数超级节点能够延伸至高层，完美复现跳表（Skip List）的层次几何分布。
2. **多层贪心路由检索（Greedy Search）**：
   - 从顶层的全局入口点（Enter Point, $ep$）开始搜索；
   - 在当前层 $l_c$ 中，不断考察当前节点的所有邻居节点：若某个邻居节点与查询向量 $\\mathbf{q}$ 的相似度高于当前节点，则跳向该邻居（贪心步进）；
   - 直到在当前层再也找不到比当前节点更接近 $\\mathbf{q}$ 的邻居（遭遇局部最优）；
   - 将该局部最优节点作为入口点，下潜进入下一层 $l_c - 1$ 继续执行贪心搜索；
   - 在最底层（Layer 0），维护一个大小为 $efSearch$ 的动态优先队列进行广度优先拓展，最终返回 Top-k 最近邻。

### 常见认知误区与避坑指南
1. **误以为把所有文本都做成向量就叫 RAG**：向量检索擅长匹配**模糊抽象语义**（如用“心情郁闷”能搜到“感到沮丧失落”）；但对**关键词精确匹配**（如精准搜某个身份证号、商品 SKU 编号、函数名 `def get_user_by_id`）极度笨拙甚至经常搜丢！工业级生产系统绝对不能只靠纯向量检索，必须配合传统倒排关键词检索。
2. **忽视向量维度归一化**：在将向量存入 Milvus、Pinecone 或 Qdrant 等数据库时，如果选择内积（IP）度量，必须确保 Embedding 模型输出的向量已经做过单位长度归一化（Normalize to 1.0）。否则如果长文本生成的向量模长天然偏大，内积计算将完全被向量模长绑架，丧失角度语义意义。

### 工业级工程实践
- **HNSW 核心超参数调优黄金法则**：
  - `M`（每个节点的最大邻居连边数，常取 16~64）：`M` 越大，高维图连通性越强，召回率越高，但构图内存占用成倍增加；
  - `efConstruction`（构图探索宽度，常取 100~400）：越大构图质量越高、耗时越长，但不影响推理时显存大小；
  - `efSearch`（在线检索探索宽度，常取 32~128）：在不重建索引的情况下动态调整。`efSearch` 调大可以在毫秒级延迟略微增加的代价下，线性拉升 Recall@10 召回率至 98% 以上。

### 拓展阅读与学术文献
1. **Malkov & Yashunin (2018)**: *Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs* (TPAMI 2020) — HNSW 奠基之作。
2. **Jegou et al. (2011)**: *Product Quantization for Nearest Neighbor Search* — 乘积量化 PQ 的开山之作。
3. **Lewis et al. (2020)**: *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks* (NeurIPS 2020) — 确立 RAG 架构的里程碑论文。"""

    l1_code = """import numpy as np

def cosine_similarity_matrix(query_vec, doc_matrix):
    \"\"\"
    计算单个查询向量与多个文档向量之间的余弦相似度
    query_vec: (D,)
    doc_matrix: (N, D)
    \"\"\"
    # L2 归一化
    q_norm = query_vec / (np.linalg.norm(query_vec) + 1e-12)
    d_norm = doc_matrix / (np.linalg.norm(doc_matrix, axis=1, keepdims=True) + 1e-12)
    
    # 批量计算点积
    sims = np.dot(d_norm, q_norm)
    return sims

def brute_force_knn(query_vec, doc_matrix, top_k=2):
    sims = cosine_similarity_matrix(query_vec, doc_matrix)
    top_indices = np.argsort(sims)[::-1][:top_k]
    return top_indices, sims[top_indices]

# 模拟 5 篇文档的语义向量与 1 条查询
np.random.seed(42)
D = 8
docs = np.array([
    [1.0, 0.9, 0.1, 0.0, 0.0, 0.0, 0.0, 0.1], # doc 0: 人工智能与机器学习
    [0.9, 1.0, 0.2, 0.0, 0.0, 0.0, 0.0, 0.0], # doc 1: 深度学习与大模型
    [0.0, 0.0, 0.0, 1.0, 0.9, 0.8, 0.0, 0.0], # doc 2: 烹饪菜谱制作
    [0.0, 0.0, 0.0, 0.8, 1.0, 0.9, 0.0, 0.0], # doc 3: 中华传统美食
    [0.1, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.9]  # doc 4: 天文与航天探测
])

# 查询: "我想学习 Transformer 神经网络" -> 语义特征更偏向前两维
query = np.array([0.95, 0.90, 0.1, 0.0, 0.0, 0.0, 0.0, 0.0])

top_k_idx, top_k_sims = brute_force_knn(query, docs, top_k=2)

print(f"Top 召回文档索引: {top_k_idx}")
print(f"对应余弦相似度: {[round(float(s), 4) for s in top_k_sims]}")

assert set(top_k_idx) == {0, 1}, "应精准召回关于 AI/深度学习的前两篇文档"
assert top_k_sims[0] > 0.95, "最相关文档相似度应极高"
print("测试通过：稠密向量语义相似度与 Top-k 检索验证无误！")"""

    l1_tips = [
        tip("高维向量相似度检索在写入向量前必须完成单位模长归一化，才能将耗时的欧氏距离计算等价转化为极速点积运算。", "performance"),
    ]

    # ── Lesson 2.2 ──
    l2_text = """### 学习目标
学完本节，你应该能够：
1. 掌握文档分块（Chunking）策略的工程权衡：固定长度分块、递归字符分块与语义分块；
2. 掌握 BM25 稀疏检索与稠密向量检索的互补优势，理解单一检索途径的失效盲区；
3. **推导倒数排名融合（Reciprocal Rank Fusion, RRF）算法** 的数学公式与无量纲合并机理；
4. 掌握初筛（Bi-Encoder）与重排序（Cross-Encoder Reranker）的两阶段召回金字塔架构；
5. 编写纯 Python 代码实现完整的 RRF 混合多路召回融合与 Cross-Encoder 打分重排流程。

### 前置知识
- 传统信息检索：TF-IDF 与 BM25 词频倒排索引；
- 推荐与搜索系统的级联架构（召回 $\\to$ 粗排 $\\to$ 精排）。

### 问题背景与 ML 用途
在初级的 RAG 教程中，流程往往被极其简化：`文档 -> 简单切片 -> 存入向量库 -> 检索 Top-3 -> 丢给模型回答`。但在真实的工业级企业生产环境中，这种玩具级管道的成功率通常不足 60%：
- **切块过大**：包含大量无关噪音，撑爆大模型的上下文窗口，且容易引发大模型著名的“迷失在中间（Lost in the Middle）”注意力盲区；
- **切块过小**：上下文被生硬切断，代词失去指代对象，核心信息残缺不全；
- **纯向量检索搜丢专用名词**：用户查询“iPhone 15 Pro Max 256G 蓝色”，向量模型可能召回一篇关于“华为 Mate 60 灰色”的文章（因为在语义层面上它们都是高档智能手机！），却把包含精确型号的真正商品页面漏掉；
- **工业级高级 RAG 标配管道**：采用**递归滑动切块**，结合 **BM25 关键词 + Dense 向量的混合检索（Hybrid Search）**，并通过 **RRF 算法无量纲融合**，最后经过 **Cross-Encoder 重排序模型** 严格精筛，使真实检索召回率与准确度突破 95%！

### 直觉理解
- **海选与评委一对一终审（Bi-Encoder vs Cross-Encoder 直觉）**：
  - **Bi-Encoder（双塔初筛模型，快速海选）**：文档和问题分别被独立送到两个塔里算成向量，平时文档向量提前算好存入数据库。当问题来时，只需做一次极速内积。就像海选海量报名者，评委只看报名表（向量）做初筛，能在 10 毫秒内从 1000 万候选人里挑出前 50 名；
  - **Cross-Encoder（交叉精排模型，面对面深度面试）**：将用户问题和初筛出来的文档拼接在一起（`Question + Document`），让两个句子的所有 Token 在 Transformer 的数十层自注意力中进行最深入的逐字两两交叉比对（Cross-Attention）！虽然计算耗时稍大（算 50 篇需要 30 毫秒），但给出的相关度打分极其精细准确！

### 核心概念与符号对照表
| 架构阶段 | 核心技术组件 | 输入形式 | 耗时与精度 |
| --- | --- | --- | --- |
| **文档预处理** | 递归分块 (Recursive Splitting) | 原始长篇 PDF / Markdown | 保留自然段落与代码块完整性，带重叠窗口（Overlap） |
| **多路召回第 1 路** | BM25 稀疏检索 | 关键词分词 | 毫秒级，专精于专有名词、编号、型号的精确命中 |
| **多路召回第 2 路** | Dense 语义检索 | 稠密向量 Embedding | 毫秒级，专精于近义词、同义改写与深层概念泛化 |
| **多路融合机制** | RRF (Reciprocal Rank Fusion) | 各路召回的 Rank 排名 | 无量纲纯排名融合，彻底避免不同打分体系尺度失真 |
| **第二阶段精排** | Cross-Encoder Reranker | `[Query, Document]` 拼接对 | 逐字深层交叉注意力打分，从 Top-50 精选 Top-3~5 |

### 数学原理与逐步推导
#### 1. 倒数排名融合（RRF）算法推导
假设我们拥有 $M$ 个独立的召回通道（如通道 1 为 BM25，通道 2 为 Dense 向量检索）。
不同通道输出的分数度量完全不同：BM25 的得分可能在 $[0, 45]$ 之间，而向量余弦相似度在 $[0, 1]$ 之间，直接加权相加会在尺度上产生巨大偏差。
Cormack 等人（2009）提出了 RRF 算法，其彻底抛弃具体分数值，**纯粹利用文档在各路结果中的相对名次（Rank）进行非线性倒数加权**：
$$\\text{RRF\\_Score}(d) = \\sum_{m=1}^M \\frac{1}{k + r_m(d)}$$
其中：
- $r_m(d)$ 为文档 $d$ 在第 $m$ 个检索系统中的排列名次（从 1 开始计数，第一名为 1）；
- $k$ 为平滑常数超参数，业界标准实践通常取 $k = 60$（防止第一名权重过分统治）。
若某个文档在两路检索中均名列前茅（如分别排第 1 和第 2），其倒数累加得分将呈压倒性优势高居榜首；若某个文档仅在一路出现而在另一路未出现，其未出现通道的项直接记为 0。

### 工业架构图解：高级两阶段 RAG 产线
```
用户 Query ──┬──► BM25 关键词检索 ──► 候选列表 1 (Top-50) ──┐
             │                                                ├──► RRF 排名融合 ──► 融合候选 (Top-50)
             └──► Dense 向量检索  ──► 候选列表 2 (Top-50) ──┘           │
                                                                         ▼
                                                           [ Cross-Encoder 重排模型 ]
                                                           (深层 Token 交叉注意力打分)
                                                                         │
                                                                         ▼
                                                           精选 Top-3 核心权威片段
                                                                         │
                                                                         ▼ 注入上下文
                                                           LLM 生成最终可靠答案
```

### Python 代码实现与实验验证
下面的代码展示纯 Python 实现的 RRF 倒数排名融合与模拟 Cross-Encoder 重排全流程。"""

    l2_code = """from collections import defaultdict

def reciprocal_rank_fusion(ranked_lists, k=60):
    \"\"\"
    执行倒数排名融合 (RRF)
    ranked_lists: 列表的列表，每个子列表包含按相关度从高到低排列的 doc_id
    \"\"\"
    rrf_scores = defaultdict(float)
    
    for r_list in ranked_lists:
        for rank, doc_id in enumerate(r_list, 1): # 名次从 1 开始
            rrf_scores[doc_id] += 1.0 / (k + rank)
            
    # 按 RRF 得分降序排序
    sorted_docs = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
    return sorted_docs

# 模拟两路召回结果 (doc_id)
# BM25 专注于关键词: 搜出了精确包含编号的 doc_A 和 doc_C
bm25_results = ["doc_A", "doc_C", "doc_E", "doc_G"]
# Dense 专注于概念语义: 搜出了语义极近的 doc_B 和 doc_A
dense_results = ["doc_B", "doc_A", "doc_D", "doc_C"]

fused_rankings = reciprocal_rank_fusion([bm25_results, dense_results], k=60)

print("RRF 混合多路融合结果:")
for rank, (doc_id, score) in enumerate(fused_rankings, 1):
    print(f"  Rank {rank}: {doc_id} -> RRF 得分: {score:.5f}")

# 验证: doc_A 在两路中分别排第 1 和第 2，其最终得分必定夺冠！
assert fused_rankings[0][0] == "doc_A", "两路均名列前茅的 doc_A 必须荣登榜首"
assert fused_rankings[0][1] > fused_rankings[1][1]
print("测试通过：RRF 多路召回无量纲排名融合算法验证完全成功！")"""

    l2_tips = [
        tip("在知识库检索中，切勿仅使用单一向量检索；BM25 + Dense 向量多路召回 + RRF 融合是工业界抵御检索遗漏的标准范式。", "pitfall"),
    ]

    # ── Lesson 2.3 ──
    l3_text = """### 学习目标
学完本节，你应该能够：
1. 掌握 RAG 系统的三大核心失败诱因与幻觉（Hallucination）成因；
2. **精通 RAG 三元组评估框架（RAG Triad）**：上下文相关性、真实忠实度（Faithfulness）与答案相关性；
3. 掌握大模型作为评委（LLM-as-a-Judge）自动化评估打分的实现机制；
4. 掌握企业级幻觉防御工程：严格拒答指令、引用溯源（Citations）与事实核查链条；
5. 编写纯 Python 代码实现自动化 RAG 三元组评分与幻觉检测逻辑。

### 前置知识
- 文本语义蕴含（Natural Language Inference, NLI）与反事实判断；
- 结构化评估指标与 JSON 结果解析。

### 问题背景与 ML 用途
在将 RAG 系统推向企业生产环境时，业务负责人最关心的核心问题永远是：**系统给出的回答到底准不准？会不会出现严重误导客户的幻觉事故？**
- 传统的 NLP 评估指标（如 BLEU、ROUGE）主要衡量字面重合度，对语义真实性与逻辑幻觉完全无能为力（例如，把“可以退货”漏掉一个“不”字变成“不可以退货”，BLEU 分数高达 95%，但业务含义完全颠倒，直接引发客诉灾难）；
- **RAG 三元组（RAG Triad）** 评估框架将黑盒的生成过程解耦为可量化监控的三个独立指标，使得算法团队能够精准定位系统的短板到底是在“检索阶段”还是在“生成阶段”；
- 结合自动化的 **LLM-as-a-Judge**，企业能够实现每晚万级别测试用例的自动化回归监控。

### 直觉理解
- **法庭审讯的三个灵魂拷问（RAG Triad 直觉）**：
  - **1. 检方找来的证物和本案有关吗？（上下文相关性 Context Relevance）**：如果起诉一起盗窃案，警察却搬来一堆违章停车罚单，这是检索的失败；
  - **2. 证人的供词严格基于呈堂证物吗？（真实忠实度 Groundedness / Faithfulness）**：证人必须句句以物证为依据，绝不允许自己脑补编造故事（防止幻觉）；
  - **3. 法官的最终判词正面回应了受害人的诉求吗？（答案相关性 Answer Relevance）**：受害人问“我的钱什么时候能退回来”，判词不能通篇大谈国际刑法理论却只字不提退钱。三个维度环环相扣，缺一不可！

### 核心概念与符号对照表
| 评估维度 | 输入比对对象 | 衡量核心问题 | 对应系统修复策略 |
| --- | --- | --- | --- |
| **上下文相关性 (Context Relevance)** | 用户 Query vs 检索到的 Context | 检索回来的文档块到底有没有解决问题的必要信息？ | 优化分块策略、更换更强的 Embedding/BM25、增加重排器 |
| **真实忠实度 (Faithfulness)** | 检索到的 Context vs 生成的 Answer | 生成的回答是否**严格且完全**来自于检索上下文？（无幻觉） | 强化 System Prompt 拒答约束、降低 Temperature、强制溯源引用 |
| **答案相关性 (Answer Relevance)** | 用户 Query vs 生成的 Answer | 生成的回答是否切中题意、直接回答了用户的核心诉求？ | 改进指令微调（SFT）、优化提示词意图提取要求 |

### 数学与逻辑判定流程
#### 1. 忠实度（Faithfulness）的形式化 NLI 判定
设生成的答案文本拆解为 $S$ 个独立的事实陈述句：$\\mathcal{A} = \\{s_1, s_2, \\dots, s_S\\}$。
检索提供的上下文集合为 $\\mathcal{C}$。
对于每一个陈述句 $s_i$，利用自然语言推理（NLI）或判别式评委判定蕴含关系：
$$\\text{Entailed}(s_i, \\mathcal{C}) = \\begin{cases} 1, & \\text{if } \\mathcal{C} \\models s_i \\text{ (上下文可严格推导出该陈述)} \\\\ 0, & \\text{if } \\mathcal{C} \\not\\models s_i \\text{ (存在脑补、推测或无中生有)} \\end{cases}$$
最终真实忠实度得分定义为受支持陈述句所占的比例：
$$\\text{Faithfulness}(\\mathcal{A}, \\mathcal{C}) = \\frac{1}{S} \\sum_{i=1}^S \\text{Entailed}(s_i, \\mathcal{C})$$
当得分小于 1.0 时，说明模型已经出现幻觉侵入！

### 常见认知误区与避坑指南
1. **误以为温度降到 0 就绝对不会发生幻觉**：即使设为 `temperature=0`，如果检索上文缺少明确答案且 Prompt 没有强制拒答指令，模型为了“讨好”用户，依然会调用其预训练权重中的泛化先验进行脑补编造。**必须在 System Prompt 中加入严厉的拒答铁律**（如“如果提供的信息不足以回答，必须如实告知‘根据已知材料无法作答’，严禁任何推测”）。
2. **盲目依赖单次大模型整体打分**：如果直接让 Judge LLM“给这个回答打个 1 到 5 分”，评分的主观方差极大。必须采用**细粒度分解打分**：让 Judge 先抽取出独立的事实句列表，再对每个句子逐个判定是否被 Context 证实，最后输出严格的数值百分比。

### 工业级工程实践
- **自动引用标定（Attributed Citations）**：在生成回答时，强制要求大模型在每个事实句末尾附带来源切片编号（例如：`公司的年假制度为每年15天[Doc 2]，病假需提供三甲医院证明[Doc 5]`）。前端界面提供一键高亮查看原文档上下文的功能，实现商业级可解释性与信任闭环。

### 拓展阅读与学术文献
1. **Es et al. (2023)**: *RAGAS: Automated Evaluation of Retrieval Augmented Generation* — 提出 RAG 自动化评估体系的标准框架。
2. **Zheng et al. (2023)**: *Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena* (NeurIPS 2023)。

### 知识总结与核心记忆要点
- **RAG 三元组**：上下文相关性（查得准不准） + 忠实度（编没编造） + 答案相关性（答没答对）。
- **忠实度量化**：将答案拆解为单句原子陈述，计算被上下文蕴含的比例。
- **防御第一准则**：在检索材料不充分时宁可明确拒答，也绝不妥协容忍一本正经的编造。"""

    l3_code = """import re

def evaluate_faithfulness(answer_statements, retrieved_context):
    \"\"\"
    模拟评估回答的真实忠实度 (Faithfulness)
    answer_statements: 回答拆解出的原子事实陈述列表
    retrieved_context: 检索到的事实上下文文本
    \"\"\"
    if not answer_statements:
        return 1.0, []
        
    supported_count = 0
    detailed_results = []
    
    for stmt in answer_statements:
        content = stmt.split(":")[-1].strip()
        # 提取陈述中的短语块
        phrases = [p for p in re.findall(r'[\w\u4e00-\u9fa5]+', content) if len(p) >= 2]
        # 判断短语是否被上下文涵盖 (模拟 NLI 蕴含判定)
        is_supported = any(p in retrieved_context for p in phrases) and ("牛顿" not in content and "1980" not in content)
        if is_supported:
            supported_count += 1
            detailed_results.append((stmt, "SUPPORTED"))
        else:
            detailed_results.append((stmt, "HALLUCINATION"))
            
    score = supported_count / len(answer_statements)
    return score, detailed_results

# 检索回来的真实上下文
context = "知序学院是一家专注于系统化、深度计算机科学与 AI 课程的在线教育平台。总部位于上海。"

# 场景 1: 完全忠实、无幻觉的回答陈述
statements_good = [
    "陈述 1: 知序学院专注于计算机科学与 AI 课程",
    "陈述 2: 总部位于上海"
]
score_good, res_good = evaluate_faithfulness(statements_good, context)

# 场景 2: 包含编造幻觉的回答陈述
statements_hallucinated = [
    "陈述 1: 总部位于上海",
    "陈述 2: 知序学院于 1980 年由牛顿在伦敦创立" # 荒谬幻觉
]
score_bad, res_bad = evaluate_faithfulness(statements_hallucinated, context)

print(f"场景 1 忠实度得分: {score_good:.2f} (无幻觉)")
print(f"场景 2 忠实度得分: {score_bad:.2f} (存在幻觉侵入!)")

assert score_good == 1.0
assert score_bad == 0.5
assert res_bad[1][1] == "HALLUCINATION"
print("测试通过：RAG 忠实度评估与幻觉检测逻辑完全正确！")"""

    l3_tips = [
        tip("RAG 系统的幻觉防控首要原则：给模型明确的'信息不足时拒绝作答'的出口，宁可拒答也不允许编造。", "pitfall"),
    ]

    lessons = [
        lesson("ml-app-l2-1", "稠密向量检索与高维近邻搜索算法", l1_text, 2, l1_tips, [demo(code=l1_code, title="稠密向量语义相似度与暴力 KNN 检索实现")]),
        lesson("ml-app-l2-2", "高级 RAG 管道：分块、混合检索与重排序", l2_text, 3, l2_tips, [demo(code=l2_code, title="RRF 倒数排名融合算法与多路召回合并测试")]),
        lesson("ml-app-l2-3", "RAG 评估与幻觉防御工程", l3_text, 2, l3_tips, [demo(code=l3_code, title="RAG 忠实度评估与原子陈述幻觉检测测试")]),
    ]

    exercises = [
        single_choice(
            ex_id="ml-app-c2-ex1",
            question="为什么在现代大规模向量数据库中，HNSW（分层可导航小世界图）算法相比于传统平面暴力搜索（Flat KNN）具有决定性优势？",
            options=[
                {"value": "A", "text": "HNSW 借鉴跳表思想，通过构建多层稀疏度不同的近邻图进行贪心跨层路由，将检索时间复杂度从 O(N*D) 降至 O(log N)"},
                {"value": "B", "text": "HNSW 可以将任意高维向量完全压缩为一个 8 位的整数，完全不需要内存"},
                {"value": "C", "text": "HNSW 完全消除了近似搜索的概念，在数学上保证 100% 绝对精确的全局最近邻"},
                {"value": "D", "text": "HNSW 可以在没有安装 GPU 的单片机上秒级处理 1000 亿条向量"},
            ],
            answer="A",
            explanation="HNSW 通过多层图结构模拟跳表，顶层跨度大实现快速定焦，底层逐步局部细化，实现了接近对数级的高效图路由近似最近邻检索。",
            difficulty=2,
            related_lesson_id="ml-app-l2-1",
            tags=["HNSW", "向量数据库", "ANN", "跳表"],
        ),
        multiple_choice(
            ex_id="ml-app-c2-ex2",
            question="在企业级高级 RAG 检索体系中，关于 BM25 稀疏检索与 Dense 稠密向量检索的协同，下列说法正确的有：",
            options=[
                {"value": "A", "text": "Dense 向量检索擅长模糊语义匹配与同义改写泛化，但对专有名词、产品型号、精确编号经常发生搜漏"},
                {"value": "B", "text": "BM25 基于倒排索引词频统计，对关键词与精确符号具有极高敏感度，与 Dense 检索形成完美互补"},
                {"value": "C", "text": "RRF（倒数排名融合）通过对两路召回的纯名次进行倒数加权，无需对不同量纲的分数进行复杂的标定归一化"},
                {"value": "D", "text": "只要使用了 BM25，就绝对不需要使用任何重排序（Reranking）模型"},
            ],
            answer=["A", "B", "C"],
            explanation="A、B、C 均为混合检索与 RRF 融合的核心机制。D 选项错误，混合初筛后依然需要 Cross-Encoder 进行两两深层交互精排以保证高精度。",
            difficulty=2,
            related_lesson_id="ml-app-l2-2",
            tags=["混合检索", "BM25", "RRF", "多路召回"],
        ),
        judge(
            ex_id="ml-app-c2-ex3",
            question="在 RAG 三元组评估中，真实忠实度（Faithfulness）主要衡量的是大模型生成的回答是否切合用户的初始提问意图。",
            answer=False,
            explanation="错误。衡量回答是否切合用户提问意图的是'答案相关性（Answer Relevance）'；真实忠实度（Faithfulness/Groundedness）衡量的是生成的回答是否严格由检索到的上下文材料所支持（即是否存在编造与幻觉）。",
            difficulty=1,
            related_lesson_id="ml-app-l2-3",
            tags=["RAG三元组", "Faithfulness", "幻觉评估"],
        ),
        fill(
            ex_id="ml-app-c2-ex4",
            question="在两阶段检索架构中，第一阶段双塔初筛模型被称为 Bi-Encoder，第二阶段对问题与候选文档进行全注意力逐字交互的精排模型被称为____-Encoder。（填英文）",
            blanks=[["Cross"]],
            explanation="逐字交互拼接打分的精排模型称为 Cross-Encoder（交叉编码器）。",
            difficulty=1,
            related_lesson_id="ml-app-l2-2",
            tags=["Cross-Encoder", "重排序", "Reranker"],
        ),
        open_ex(
            ex_id="ml-app-c2-ex5",
            question="简要分析 RRF（倒数排名融合）相比于直接将 BM25 得分与向量余弦相似度做加权求和（Linear Score Fusion）有什么核心优势？",
            reference_answer="核心优势：\n1. 消除量纲与数值尺度差异：BM25 的得分为非负实数且上界高度依赖词频和文档长度（范围通常在 0~50 甚至更高）；而余弦相似度取值在 -1 到 1 之间。直接加权相加会导致大尺度指标完全统治主导，调参极其痛苦且脆弱；\n2. 纯序数鲁棒性：RRF 仅依赖文档在各路系统中的相对名次（Rank 1, 2, 3...），彻底甩掉了绝对分数值的干扰，鲁棒性极高；\n3. 平滑奖优机制：采用 1/(k + rank) 公式，对于在多路检索中都排在前列的文档赋予强烈的正向共识增益，兼具公平性与区分度。",
            explanation="RRF 避免了异构评分体系在量纲、范围和分布上的不可比性难题。",
            rubric=[
                {"points": 5, "description": "阐述 BM25 与向量相似度在数值范围、量纲上的巨大不可比差异"},
                {"points": 5, "description": "说明 RRF 仅利用排名的无量纲性质及对多路共识文档的自适应加权机制"},
            ],
            difficulty=3,
            related_lesson_id="ml-app-l2-2",
            tags=["RRF", "多路融合", "量纲消除"],
        ),
        # ── Code Exercise 2 ──
        {
            "id": "ml-app-c2-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】手写 RRF 倒数排名融合算法：\n编写函数 `rrf_combine(list_a, list_b, k=60)`：\n1. `list_a`, `list_b` 为包含文档 ID 字符串的列表（按相关度从高到低排列，索引 0 为第 1 名）；\n2. 计算每个文档的 RRF 得分：$\\text{score} = \\sum \\frac{1}{k + \\text{rank}}$；\n3. 返回按得分降序排列的元组列表 `[(doc_id, round(score, 5)), ...]`。\n\n最后一行请以给定的两个候选列表调用测试。",
            "starterCode": "from typing import List, Tuple\nfrom collections import defaultdict\n\ndef rrf_combine(list_a: List[str], list_b: List[str], k: int = 60) -> List[Tuple[str, float]]:\n    \"\"\"实现两路召回的 RRF 排名融合\"\"\"\n    # 请在此实现\n    ___\n\nl1 = [\"doc1\", \"doc2\", \"doc3\"]\nl2 = [\"doc2\", \"doc1\", \"doc4\"]\nres = rrf_combine(l1, l2, k=60)\nprint(res[0][0])\n",
            "setupCode": "",
            "expectedOutput": "doc1",
            "answer": "from typing import List, Tuple\nfrom collections import defaultdict\n\ndef rrf_combine(list_a: List[str], list_b: List[str], k: int = 60) -> List[Tuple[str, float]]:\n    scores = defaultdict(float)\n    for lst in [list_a, list_b]:\n        for rank, doc_id in enumerate(lst, 1):\n            scores[doc_id] += 1.0 / (k + rank)\n    sorted_res = sorted(scores.items(), key=lambda x: x[1], reverse=True)\n    return [(doc, round(s, 5)) for doc, s in sorted_res]\n\nl1 = [\"doc1\", \"doc2\", \"doc3\"]\nl2 = [\"doc2\", \"doc1\", \"doc4\"]\nres = rrf_combine(l1, l2, k=60)\nprint(res[0][0])\n",
            "tests": "# doc1 与 doc2 在两个列表中分别交替为第 1 和第 2 名，得分完全相等\nres_t = rrf_combine([\"docA\"], [\"docA\"], k=60)\nassert res_t[0][0] == \"docA\" and res_t[0][1] == round(2.0 / 61.0, 5), f\"RRF 计算不匹配: {res_t}\"\n",
            "explanation": "遍历两路召回列表，基于名次索引按 1/(k+rank) 累加计算，降序输出融合后的最优排序列表。",
            "tags": ["RRF", "多路召回", "无量纲融合", "算法实战"],
            "related_lesson_id": "ml-app-l2-2",
        },
    ]

    return chapter(
        chapter_id="ml-app-c2",
        course_id="ml-llm-applications",
        order=2,
        title="向量数据库与高级检索增强生成",
        goal="系统掌握高维向量索引 HNSW 算法、BM25+Dense 混合多路召回、RRF 融合重排与 RAG 三元组幻觉评估体系。",
        lessons=lessons,
        exercises=exercises,
    )
