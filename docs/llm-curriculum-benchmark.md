# 大模型课程知识点覆盖面对比基准报告

> 评估对象：知序学院「大模型」学科，7 门子课程 / 37 章
> 基准来源：Hugging Face LLM Course、Hugging Face Agents Course、Stanford CS336、Stanford CS224N (Winter 2026)、Karpathy "Neural Networks: Zero to Hero"、Anthropic "Building effective agents"、RAG 综述 (arXiv 2312.10997)、vLLM / PagedAttention (arXiv 2309.06180)、LoRA / QLoRA / DPO 论文
> 生成时间：2026-10-20

---

## 0. 调研方法与可信度声明

### 0.1 抓取状态

| # | 来源 | 结果 | 说明 |
|---|------|------|------|
| 1 | Hugging Face LLM Course | ⚠️ **页面抓取失败，改用仓库源文件** | `huggingface.co` 直连失败（国内网络）；改用 `raw.githubusercontent.com/huggingface/course/main/chapters/en/_toctree.yml` 拿到**官方目录树原文**，内容等价且更完整（含全部子节标题） |
| 2 | Hugging Face Agents Course | ⚠️ **同上** | 改用 `.../agents-course/main/units/en/_toctree.yml`，拿到全部 Unit 0–4 与 Bonus Unit 1–3 目录 |
| 3 | Stanford CS336 | ✅ 抓取成功 | `cs336.stanford.edu`（Spring 2026），19 次 lecture 全部标题 + 5 个 Assignment 说明 |
| 4 | Stanford CS224N | ✅ 抓取成功 | `web.stanford.edu/class/cs224n`（Winter 2026），完整 schedule 表 |
| 5 | Karpathy Zero to Hero | ✅ 抓取成功 | `karpathy.ai/zero-to-hero.html`，8 个视频标题与简介 |
| 6 | Anthropic "Building effective agents" | ✅ 抓取成功 | 全文（含 Appendix 2 工具提示工程） |
| 6b | OpenAI Prompt Engineering / Function Calling 指南 | ❌ **403 Cloudflare 拦截** | 未重试；按已知知识补全并标注 |
| 7 | RAG 综述 arXiv 2312.10997 | ✅ 抓取成功 | 摘要页 + HTML 全文目录（8 大节、全部子节标题） |
| 8 | vLLM / PagedAttention | ✅ 抓取成功 | arXiv 摘要 + `vllm.ai` 首页（PagedAttention / 连续批处理 / 生态工具） |
| 9 | LoRA / QLoRA / DPO | ✅ 抓取成功 | arXiv 2106.09685 / 2305.14314 / 2305.18290 摘要 |

**图例**：✅ = 本次抓到真实页面；⚠️ = 抓取失败但通过官方仓库源文件等价获取；❌ = 未获取，内容为已知知识。

**本报告未使用推测的部分**：第 1 节所有课程 topic 列表，除标注「（据已知知识）」者外，均来自真实页面原文。

### 0.2 「我的课程」评估依据

不是只看章节目录。已直接读取 `knowledge-order/content-data/courses/llm-a1..b3.json`，提取：

- 37 章 / 85 个课节标题
- 全量正文、tips（interview / pitfall / performance / leak 四类）、demos、exercises

并对 120+ 个技术关键词做了**大小写敏感**的全语料检索，逐条核对上下文，区分「真正讲了」与「只出现一次名词」。**所有 ✅/⚠️/❌ 判定均有检索证据支撑**。判定标准：

- ✅ 覆盖：有独立课节，或正文有专门小节展开（含公式/代码/取舍分析）
- ⚠️ 部分覆盖：仅作为名词在正文/tips/习题里提过一句，无展开；或只覆盖了该主题的一半
- ❌ 缺失：全语料 0 命中

### 0.3 一个重要提醒

平台的**实际内容深度远超章节目录的暗示**。例如 A1 目录只有「可解释性」一章 1 个课节，但正文含头部分工、剪枝冗余、注意力热力图；B3「KV Cache 与显存优化」1 个课节内含完整显存公式、PagedAttention 原理、前缀缓存、FP8 量化。**因此本报告低报了平台的实际覆盖面**——反过来也说明：目录结构本身传递的信息量不足，这本身是个产品问题（见 §4.4）。

---

## 1. 各权威课程的知识点清单

### 1.1 Hugging Face LLM Course ✅（源文件等价获取）

12 章，完整目录树：

| 章 | 标题 | 子主题（原文） |
|---|---|---|
| 0 | Setup | Introduction |
| 1 | **Transformer models** | Introduction / NLP and LLMs / Transformers, what can they do / How do Transformers work / How 🤗 Transformers solve tasks / **Transformer Architectures** / quiz / **Inference with LLMs** / **Bias and limitations** / Summary |
| 2 | **Using 🤗 Transformers** | Behind the pipeline / Models / **Tokenizers** / Handling multiple sequences / Putting it all together / **Optimized Inference Deployment** |
| 3 | **Fine-tuning a pretrained model** | Processing the data / Fine-tuning with Trainer API / A full training loop / **Understanding Learning Curves** |
| 4 | Sharing models and tokenizers | The HF Hub / Using pretrained models / Sharing pretrained models / **Building a model card** |
| 5 | The 🤗 Datasets library | Datasets not on Hub / Slice and dice / Big data / Creating your own dataset / **Semantic search with FAISS** |
| 6 | **The 🤗 Tokenizers library** | Training a new tokenizer from an old one / Fast tokenizers' special powers / **Normalization and pre-tokenization** / **BPE** / **WordPiece** / **Unigram** / Building a tokenizer block by block |
| 7 | Classical NLP tasks | Token classification / Fine-tuning a masked LM / Translation / Summarization / **Training a causal LM from scratch** / QA / Mastering LLMs |
| 8 | How to ask for help | Errors / Forums / **Debugging the training pipeline** / Good issue |
| 9 | Building and sharing demos | Gradio: Interface / Blocks / Hub integration / Advanced features |
| 10 | Curate high-quality datasets | Argilla: setup / load / **Annotate your dataset** / use annotated dataset |
| 11 | **Fine-tune LLMs** | **Chat Templates** / SFTTrainer / **LoRA** / Evaluation |
| 12 | **Build Reasoning Models**（新增） | **RL on LLMs** / **DeepSeek R1 "Aha Moment"** / **GRPO in DeepSeekMath** / **Implementing GRPO in TRL** / Fine-tune with GRPO / Unsloth |

> 注：第 12 章是较新的增量，说明 HF 已经把「推理模型 / GRPO」纳入主线——这是本平台完全没有覆盖的方向。

### 1.2 Hugging Face Agents Course ✅（源文件等价获取）

| Unit | 标题 | 子主题 |
|---|---|---|
| 0 | Welcome | Onboarding / Discord |
| 1 | **Introduction to Agents** | What is an Agent / What are LLMs / **Messages and Special Tokens** / **What are Tools** / **Thought-Action-Observation Cycle** / **Thought, Internal Reasoning and the Re-Act Approach** / **Actions** / **Observations** / Dummy Agent Library / First agent with smolagents |
| 2.1 | **smolagents framework** | **Code agents** / **Tool-calling agents（code vs JSON）** / Tools / **Retrieval agents** / **Multi-Agent Systems** / **Vision and Browser agents** |
| 2.2 | **LlamaIndex** | LlamaHub / Components / Tools / Agents / **Agentic Workflows** |
| 2.3 | **LangGraph** | When to use / **Building blocks（graph/state）** / First graph / **Document analysis agent** |
| 3 | **Use Case: Agentic RAG** | **Agentic RAG** / RAG tool for guest stories / Integrating tools / Gala agent |
| 4 | **Final Project** | **What is GAIA** / Hands-on / Certificate |
| Bonus 1 | **Fine-tuning for Function-calling** | What is Function Calling / **Fine-tune model for function-calling** |
| Bonus 2 | **Agent Observability and Evaluation** | **What is agent observability and evaluation** / Monitoring and evaluating agents |
| Bonus 3 | Agents in Games | SOTA LLMs in games / From LLM to Agents / Pokémon battle agent |

### 1.3 Stanford CS336: Language Modeling from Scratch ✅

19 次 lecture + 5 个 Assignment：

| # | Lecture | 关键知识点 |
|---|---|---|
| 1 | Overview, **tokenization** | 分词算法、词表、BPE 实现 |
| 2 | **PyTorch (einops), resource accounting** | **FLOPs / 显存 / 算术强度** 三本账 |
| 3 | **Architectures, hyperparameters** | 架构设计与超参选择 |
| 4 | **Attention alternatives and mixture of experts** | 线性/稀疏注意力、**MoE** |
| 5 | **GPUs, TPUs** | 硬件体系、内存层次 |
| 6 | **Kernels, Triton** | **手写 kernel、FlashAttention2 实现** |
| 7 | **Parallelism** | 数据/张量/流水线并行 |
| 8 | **Parallelism** | 并行续 |
| 9 | **Scaling laws** | 缩放定律拟合 |
| 10 | **Inference** | 推理系统 |
| 11 | **Scaling laws** | 缩放定律续 |
| 12 | **Evaluation** | 评测方法论 |
| 13 | **Data (sources, datasets)** | 数据来源、数据集 |
| 14 | **Data (filtering, deduplication, mixing, synthetic data)** | **过滤 / 去重 / 配比 / 合成数据** |
| 15 | **Mid/post-training (SFT/RLHF)** | 后训练 |
| 16 | **Post-training - RLVR** | **可验证奖励强化学习** |
| 17 | **Alignment - multimodality** | 多模态对齐 |
| 18 | Guest: Daniel Selsam | — |
| 19 | Guest: Dan Fu | — |

Assignment：**A1 Basics**（tokenizer + 架构 + 优化器 + 训一个小 LM）、**A2 Systems**（profiling + Triton FlashAttention2 + 分布式省显存训练）、**A3 Scaling**（拟合 scaling law）、**A4 Data**（Common Crawl → 过滤 + 去重）、**A5 Alignment & Reasoning RL**（SFT + RL 做数学推理；可选 Part 2：**DPO 等安全对齐**）。

> CS336 是本报告中最「全栈」的基准：**从 tokenizer 到 kernel 到并行到数据到对齐，一条龙**。它的 A2/A4 两个作业（系统优化、数据工程）正是本平台最大的空白。

### 1.4 Stanford CS224N (Winter 2026) ✅

19 次 lecture schedule：

| 周 | Lecture | 关键知识点 |
|---|---|---|
| 1 | History of NLP | 历史脉络 |
| 1 | **Word Vectors** | word2vec / GloVe / 负采样 / 词向量评测 |
| 2 | **Backpropagation and NN Basics** | 矩阵微积分、反向传播 |
| 2 | **Language Models and RNNs** | LM、RNN、**梯度消失** |
| 3 | **Transformers** | self-attention、LayerNorm、Image/Music Transformer |
| 3 | Final Projects: Practical Tips | 项目方法论 |
| 4 | **Pretraining (Scaling, Systems, Data)** | **缩放 + 系统 + 数据**三合一 |
| 4 | **Post-training (RLHF, SFT, DPO)** | 指令微调、RLHF、DPO |
| 5 | **Efficient Adaptation (Prompting + PEFT)** | **Prompting / CoT / LoRA / Adapter / Lottery Ticket** |
| 5 | **Agents, Tool Use, and RAG** | **ReAct / Toolformer / RAG 原始论文** |
| 6 | **Benchmarking and Evaluation** | **MMLU / HELM / AlpacaEval / 基准方法论** |
| 6 | **Reasoning 1** | **CoT / Self-Consistency / DeepSeek-R1 / DAPO** |
| 7 | **Reasoning 2** | **PRM (Let's Verify Step by Step) / 投机解码 / test-time compute scaling / RoPE** |
| 7 | Guest: **Tokenization and Multilinguality** | **BPE / 多语言 / 分词成本公平性** |
| 8 | Guest: **Interpretability**（Been Kim） | 概念发现、agentic interpretability |
| 8 | **Social and Broader Impacts of NLP (Risks)** | **社会影响、风险、伦理** |
| 9 | Guest: **Multimodality**（Luke Zettlemoyer） | **Chameleon / Transfusion / MoT / 多模态 scaling law** |
| 9 | Guest: **Tinker and LoRA Without Regret**（John Schulman） | LoRA 实践 |
| 10 | **Open Questions in NLP 2026** | 前沿开放问题 |

### 1.5 Karpathy "Neural Networks: Zero to Hero" ✅

| # | 视频 | 关键知识点 |
|---|---|---|
| 1 | **micrograd**（2h25m） | **从零实现反向传播**、计算图、标量 autograd |
| 2 | **makemore**（1h57m） | bigram 字符级 LM、torch.Tensor、**NLL 损失**、采样、训练/评估框架 |
| 3 | **makemore 2: MLP**（1h15m） | MLP LM、**学习率调参、超参、train/dev/test、过拟合/欠拟合** |
| 4 | **makemore 3: Activations & Gradients, BatchNorm**（1h55m） | **激活/梯度统计、初始化尺度、诊断可视化、BatchNorm** |
| 5 | **makemore 4: Becoming a Backprop Ninja**（1h55m） | **手推 cross-entropy / linear / tanh / batchnorm / embedding 梯度** |
| 6 | **makemore 5: WaveNet**（56m） | 层次化结构、因果膨胀卷积 |
| 7 | **Let's build GPT**（1h56m） | **完整 GPT**：self-attention、multi-head、残差、LayerNorm、FFN、训练 |
| 8 | **Let's build the GPT Tokenizer**（2h13m） | **从零实现 BPE**、encode/decode、**tokenization 的种种怪问题** |

### 1.6 Anthropic "Building effective agents" ✅

- **Agent 的定义与边界**：workflow（预定义代码路径）vs agent（LLM 自主决定流程）
- **何时不该用 agent**：先找最简单方案；agent 用延迟与成本换性能
- **框架取舍**：先用 LLM API 直连，框架会遮蔽 prompt/response 难调试
- **Building block: Augmented LLM**（retrieval + tools + memory）
- **5 种 workflow 模式**：
  1. **Prompt chaining**（含 gate 检查点）
  2. **Routing**（分类后分流，如简单问题给 Haiku、难问题给 Sonnet）
  3. **Parallelization**（**Sectioning** 分段并行 / **Voting** 多次投票）
  4. **Orchestrator-workers**（中央 LLM 动态拆解、委派、汇总）
  5. **Evaluator-optimizer**（生成 + 评估反馈循环）
- **Autonomous agent**：环境 ground truth、检查点人工介入、**停止条件（最大迭代数）**
- **三类应用**：客户支持、**coding agent（SWE-bench Verified）**、**computer use**
- **Appendix 2: Prompt engineering your tools**（**ACI**）：token 预算让模型先思考、格式贴近自然文本、避免格式开销、poka-yoke 参数设计、**工具描述要像给 junior 的 docstring**、用 workbench 反复测试
- **三原则**：保持简单、保持透明（显式展示规划步骤）、精心设计 ACI

### 1.7 OpenAI Prompt Engineering / Function Calling ❌（据已知知识）

> 抓取被 Cloudflare 403 拦截，未重试。以下为已知知识，标注为推测。

- **Prompt engineering 六策略**：写清晰指令（含分隔符、指定步骤、指定输出长度/格式）、提供参考文本（让模型引用、引用即引用）、**把复杂任务拆成子任务**、给模型"思考时间"（**让模型先推理再结论**、隐藏推理过程）、**使用外部工具**（检索、代码执行）、**系统性地测试变更**（参考标准答案评测）
- **战术细节**：few-shot 示例、**temperature 与 top_p 的取舍（只调其一）**、logprobs 观察置信度、**减少幻觉（明确"不知道"是允许的、要求引用）**、**减少偏见（让模型输出多种视角）**
- **Function calling 流程**：`tools` schema 定义（name / description / parameters JSON Schema / required / enum）→ 模型返回 `tool_calls`（含 `arguments` JSON 字符串）→ 本地执行 → 以 `role: tool` + `tool_call_id` 回填 → 模型整合；**`tool_choice`（auto / none / required / 指定函数）**、**并行工具调用（parallel_tool_calls）**、结构化输出（`response_format: json_schema` / strict mode）
- **Structured Outputs**：JSON Schema 严格模式，约束解码保证 schema 合法

### 1.8 RAG 综述 arXiv 2312.10997 ✅

三大范式 + 三大支柱，完整子节：

**范式（§II）**
- **Naive RAG**：Indexing → Retrieval → Generation（Retrieve-Read）；三大缺陷：检索精度/召回不足、生成幻觉/不相关/毒性、增强断裂/冗余/风格不一致
- **Advanced RAG**：**Pre-retrieval**（数据粒度、索引结构优化、**元数据附加**、对齐优化、**混合检索**、**query rewriting / transformation / expansion**）+ **Post-retrieval**（**rerank**、**context compression**）
- **Modular RAG**：新模块 —— **Search**（搜索引擎/数据库/知识图谱）、**RAG-Fusion**（多查询 + 并行向量检索 + 重排）、**Memory**、**Routing**、**Predict**、**Task Adapter**；新模式 —— **Rewrite-Retrieve-Read**、Generate-Read、Recite-Read、**HyDE**、**DSP**、**ITER-RETGEN**、**FLARE**、**Self-RAG**
- **RAG vs Fine-tuning**：四象限（外部知识需求 × 模型适配需求）、RAG 优于无监督微调记忆新知识

**检索（§III）**
- 检索源：**数据结构**（文本/半结构化/知识图谱/向量）、**检索粒度**（Token / Phrase / Sentence / Proposition / Chunk / Item）
- **索引优化**：**Chunking Strategy**（固定/语义/递归/滑动窗口）、**Metadata Attachments**、**Structural Index**（树/图索引，如 RAPTOR）
- **Query 优化**：**Query Expansion**、**Query Transformation**（改写）、**Query Routing**
- **Embedding**：**混合检索（keyword + semantic + vector）**、**微调 embedding 模型**
- **Adapter**：训练式检索适配器

**生成（§IV）**
- **Context Curation**：**Reranking**、**Context Selection / Compression**
- **LLM Fine-tuning**：为 RAG 微调生成器（如 RA-DIT）

**增强过程（§V）**
- **Iterative Retrieval**（ITER-RETGEN）、**Recursive Retrieval**（IRCoT、ToC）、**Adaptive Retrieval**（FLARE、Self-RAG、SKR）

**评估（§VI）**
- 下游任务 26 类、数据集近 50 个
- **评估目标三层**：**Retrieval**（命中率/召回/MRR/NDCG）、**Generation**（忠实度 Faithfulness、答案相关性、上下文相关性）、**End-to-End**
- **质量分数**（上下文相关性、答案忠实度、答案相关性、噪声鲁棒性）+ **必备能力**（噪声鲁棒性、负样本拒绝、信息整合、反事实鲁棒性）
- 基准与工具：**RGB、RECALL、RAGAS、ARES、TruLens** 等

**未来（§VII）**：**RAG vs 长上下文**、**RAG 鲁棒性**、**混合方法（RAG + FT）**、**RAG 的 scaling law**、**生产级 RAG**、**多模态 RAG**

### 1.9 vLLM / PagedAttention ✅

- **核心问题**：KV cache 巨大且动态增长；现有系统因**内存碎片**与**冗余复制**浪费 60%–80%
- **PagedAttention**：借鉴 OS 虚拟内存与分页；KV cache 切成固定大小 block，**逻辑块 → 物理块的非连续映射表**
- **收益**：KV cache 浪费近零；**块级共享**（parallel sampling / beam search 共享前缀）；吞吐提升 **2–4×**
- **衍生机制**：**continuous batching**（请求完成即退出、新请求立即加入）、抢占/换出（recomputation vs swap）、**prefix caching / radix cache**、chunked prefill
- **生态**（vllm.ai 首页）：LLM Compressor（量化）、**Speculators（投机解码）**、Semantic Router（路由）、GuideLLM（性能评测）、Production Stack、AIBrix
- **配套能力**：OpenAI 兼容 API、张量并行、多硬件后端（CUDA/ROCm/Ascend/TPU/CPU）

### 1.10 LoRA / QLoRA / DPO / RLHF ✅

**LoRA（2106.09685）**：冻结预训练权重 + 注入**秩分解矩阵** A∈R^{r×k}、B∈R^{d×r}；可训练参数降 **10,000×**，显存降 3×；**无额外推理延迟**（可合并回 W）；秩亏缺（rank-deficiency）实证分析

**QLoRA（2305.14314）**：三项创新 —— **4-bit NormalFloat (NF4)**（对正态权重信息论最优）、**双重量化**（量化量化常数）、**分页优化器**（应对显存尖峰）；65B 单卡 48GB 可训；**结论：小规模高质量数据即可 SOTA；GPT-4 评测可替代人工；现有 chatbot benchmark 不可信**

**DPO（2305.18290）**：重新参数化奖励 → KL 约束下最优策略**闭式解** → 用**简单分类损失**直接解 RLHF；无需奖励模型、无需训练中采样、稳定；在情感控制上超过 PPO-based RLHF

**RLHF 标准流程**（由上述论文共同确立）：SFT → **奖励建模（Bradley-Terry）** → **PPO 优化（含 KL 惩罚防 reward hacking）**

---

## 2. 对比矩阵

> 判定基于对 `llm-a1..b3.json` 全语料的检索与上下文核对。
> ✅ 覆盖 ｜ ⚠️ 部分覆盖 ｜ ❌ 缺失
> 「依据」列写明证据：有独立课节的标课节号，只有一句的标「仅提及」。

### 2.1 基础架构（Transformer / 注意力 / 位置编码）

| 知识点 | 权威课程 | 覆盖 | 依据 / 缺口说明 |
|---|---|---|---|
| Tokenization 概念与粒度权衡 | HF ch1/6, Karpathy 8, CS336 L1, CS224N guest | ✅ | A1-c1「从文本到 token」 |
| **BPE 从零实现** | Karpathy 8, HF ch6, CS336 L1 | ⚠️ | A1 讲了 BPE/SentencePiece/WordPiece/Unigram 概念，但无「从零实现 BPE」的课节与代码 demo；Karpathy 用 2h13m 专讲 |
| WordPiece / Unigram | HF ch6 | ✅ | A1 正文覆盖 |
| 词表设计 / OOV / 多语言分词 | HF ch6, CS224N guest | ⚠️ | A1 有「词表、OOV 与 token 成本预算」，但**无多语言/中文分词效率**（CS224N 专讲「Do All Languages Cost the Same」） |
| Embedding 查表 / one-hot → dense | Karpathy 2, HF ch1 | ✅ | A1-c3 |
| 正弦位置编码推导 | CS224N L5, CS336 L3 | ✅ | A1-c3 |
| 可学习位置编码 | CS224N L5 | ✅ | A1-c3 |
| **RoPE 完整推导（复数视角/相对性）** | CS224N L13, CS336 L3 | ✅ | A3-c3，含复数视角与相对位置完整推导，**深度超过基准** |
| **RoPE 外推：PI / NTK / YaRN** | CS224N L13（仅 RoPE 论文） | ✅ | A3-c3 专节；基准课程普遍不覆盖，**本平台更强** |
| ALiBi | （基准少提） | ✅ | A1 提及 |
| 自注意力 QKV / 缩放点积 | 全部 | ✅ | A1-c4，含 sqrt(d_k) 方差推导 |
| 因果掩码 | Karpathy 7, CS336 L3 | ✅ | A1-c4，含三种错误实现的反例 |
| 多头注意力 | 全部 | ✅ | A1-c5 |
| **MQA / GQA** | CS336 L3/L4, LLaMA 系 | ✅ | A1-c5 + A3-c4，含显存公式与分组选择 |
| **MLA（DeepSeek 低秩压缩）** | （前沿，基准少） | ⚠️ | A3 仅在 tip 中一句话对比 GQA vs MLA，**无结构讲解** |
| 残差连接 / 梯度直通 | Karpathy 7, CS336 L3 | ✅ | A1-c6 |
| LayerNorm / RMSNorm / Pre-LN vs Post-LN | CS224N L5, CS336 L3 | ✅ | A1-c6 + A3-c1，含 Pre/Post-LN 失效分析 |
| FFN / GELU / SwiGLU / 8/3 d_ff | CS336 L3, LLaMA | ✅ | A1-c7 + A3-c2 |
| Transformer Block / Stack | Karpathy 7 | ✅ | A1-c8/c9 |
| **权重加载与 shape 对齐** | HF ch2「Models」 | ✅ | A1-c10 |
| **KV Cache 原理与显存公式** | CS336 L10, vLLM | ✅ | A2 采样章 + A3-c4 + B3-c2，**重复 3 次**（见 §4） |
| **FlashAttention（分块 + 在线 softmax）** | CS336 L6（手写 Triton）, CS224N | ⚠️ | 4 门课都提到原理（A1/A3/B3/A2），但**无 kernel 级实现**；CS336 A2 要求自己写 Triton FlashAttention2 |
| **注意力替代方案：线性/稀疏/滑窗/Mamba/SSM** | CS336 L4 | ⚠️ | A1 长上下文题中列举（线性注意力、Mamba、滑窗、Longformer），**仅罗列无展开** |
| **硬件体系：GPU/TPU、内存层次、算术强度** | CS336 L5, L2 | ❌ | 全语料无 GPU 体系/TPU/算术强度/roofline |
| **FLOPs / 显存 / MFU 三本账** | CS336 L2 | ⚠️ | 有 KV Cache 显存公式、训练显存账本（B3 习题），但**无 FLOPs 估算、无 MFU、无算术强度** |

### 2.2 训练

| 知识点 | 权威课程 | 覆盖 | 依据 / 缺口说明 |
|---|---|---|---|
| 下一 token 预测 / 交叉熵 / NLL | Karpathy 2, CS224N L4 | ✅ | A2-c1 |
| **Scaling Law（Kaplan / Chinchilla）** | CS336 L9/L11, CS224N L7 | ⚠️ | A2-c1 有 Chinchilla 1:20 结论与幂律；A1-c9 有「层宽协同」经验；**但无 scaling law 拟合方法/loss 预测/计算最优分配**，CS336 用 2 次 lecture + 1 个作业 |
| 反向传播 / 计算图 / 链式法则 | Karpathy 1, CS224N L3 | ✅ | A2-c2 |
| **手推梯度（backprop ninja）** | Karpathy 5（1h55m） | ⚠️ | A2 讲链式法则与梯度消失，**无「不用 autograd 手推整个 MLP 梯度」的实操** |
| 梯度消失 / 爆炸 / 梯度裁剪 | Karpathy 4, CS224N L4 | ✅ | A2-c2 |
| SGD / Momentum / RMSProp | Karpathy 3 | ✅ | A2-c3 |
| Adam / AdamW | Karpathy（todo）, 全部 | ✅ | A2-c4 |
| 学习率调度 / warmup / cosine | Karpathy 3, CS336 L3 | ✅ | A2-c5 |
| **权重初始化（Xavier/Kaiming/残差缩放）** | Karpathy 4, CS336 L3 | ⚠️ | A1-c9 有残差初始化缩放，**无系统初始化理论** |
| **BatchNorm 及其诊断** | Karpathy 4（整讲） | ❌ | 全语料无 BatchNorm 专节（仅 LayerNorm 对比表提一句） |
| **混合精度（fp16/bf16、loss scaling）** | CS336 L2, HF | ⚠️ | **仅 3 处 tip/习题**提到（A1 LayerNorm 用 fp32、BF16 字节数），**无独立课节**讲 loss scaling、master weights、bf16 vs fp16 取舍 |
| **分布式训练：DP / DDP** | CS336 L7/L8 | ❌ | 0 命中 |
| **张量并行（TP）** | CS336 L7/L8, vLLM | ⚠️ | B3 习题参考答案提「张量并行拆到 2 张卡」，**正文无展开** |
| **流水线并行（PP）** | CS336 L7/L8 | ⚠️ | 关键词命中 1 次（B3），无展开 |
| **ZeRO / FSDP** | CS336 L7/L8 | ⚠️ | B3 正文一句「必须配合 ZeRO/FSDP」，**无分片策略/通信量分析** |
| **序列并行（Ulysses/Ring Attention）** | CS336 L7 | ⚠️ | A1 长上下文题列举，无展开 |
| **梯度检查点（activation checkpointing）** | CS336 L2 | ✅ | A1/A2/B3 均有，含「FFN 是主要对象」的工程判断 |
| **训练稳定性 / loss spike / 数值溢出** | CS336 L3, Karpathy 4 | ✅ | A1 Pre/Post-LN 习题含完整排查清单 |
| **继续预训练（continued pretraining）** | CS336 L15, 实践 | ⚠️ | 仅作为「不推荐选项」被提及（B3 选型题、A1 长上下文），**无方法论** |
| **合成数据（synthetic data）** | CS336 L14 | ⚠️ | B3 一处提及，无展开 |

### 2.3 数据工程

| 知识点 | 权威课程 | 覆盖 | 依据 / 缺口说明 |
|---|---|---|---|
| **数据来源（Common Crawl / 网页/代码/书籍）** | CS336 L13, CS224N L7 | ❌ | 0 命中 Common Crawl；无数据源版图 |
| **数据清洗 / 抽取（HTML→text、boilerplate 去除）** | CS336 L13/L14 | ❌ | 「数据清洗」仅 1 次提及（B1 上下文），无方法 |
| **去重（精确 / MinHash-LSH / 语义）** | CS336 L14（作业 A4 核心） | ⚠️ | MinHash 1 次（B3）、「去重」4 次，**均为技巧级提及，无 MinHash/LSH 算法讲解、无去重实验** |
| **数据配比 / 混采权重（mixing）** | CS336 L14 | ❌ | 「数据配比」仅 1 次（A3 一句），无方法 |
| **数据质量过滤（分类器 / 启发式 / 去毒）** | CS336 L14 | ❌ | 无 |
| **Tokenizer 训练（在自有语料上训词表）** | HF ch6, CS336 L1 | ⚠️ | A2 有「tokenizer 训练」1 次、A1 讲 WordPiece/Unigram 算法，**无「在自己的语料上训一个 tokenizer 并评估压缩率」的实操** |
| **数据污染 / 测试集泄漏检测** | CS224N L11, CS336 L12 | ✅ | B3 习题 e8 专门实现 5-gram 覆盖率泄漏检测，**优于多数基准** |
| **长文本数据构造（长上下文继续训练）** | CS336 L14 | ⚠️ | A1 长上下文清单提「继续训练 + 数据长度覆盖」，无展开 |
| **指令数据构造（格式 / 质量 / 多样性）** | HF ch11, CS336 L15 | ✅ | B3-c1-l3「指令微调数据：构造、格式与质量控制」 |
| **数据标注工具链（Argilla 等）** | HF ch10 | ❌ | 无 |
| **Chat Template / 特殊 token** | HF ch11, Agents Unit1 | ✅ | B3 提及 + A1 分词 |

### 2.4 微调与对齐

| 知识点 | 权威课程 | 覆盖 | 依据 / 缺口说明 |
|---|---|---|---|
| SFT / 指令微调 | HF ch11, CS336 L15, CS224N L8 | ✅ | B3-c1-l3，含**损失掩码 -100** 的代码题，很扎实 |
| **全参微调 vs LoRA vs QLoRA 显存账本** | HF ch11, CS224N L9 | ✅ | B3-c1-l2，含 12/16 字节每参数推导与三道代码题，**超过多数基准** |
| LoRA 原理（低秩、alpha/r、B 初始化为 0） | HF ch11, CS224N L9 | ✅ | B3 完整 |
| QLoRA（NF4 / 双重量化 / 分页优化器） | QLoRA 论文 | ✅ | B3 完整 |
| **其他 PEFT：Adapter / Prefix-Tuning / IA³ / DoRA** | CS224N L9（PEFT 全景） | ⚠️ | 仅 LoRA/QLoRA；CS224N 还讲 Adapter、Lottery Ticket、Prompt Tuning |
| **RLHF 三阶段（SFT→RM→PPO）+ KL 惩罚** | CS336 L15, CS224N L8 | ✅ | B3-c1-l4，含 Bradley-Terry 公式与 reward hacking |
| **DPO 闭式解推导与工程** | CS224N L8, CS336 A5 | ✅ | B3-c1-l4 + 代码题，**深度优于多数基准** |
| **RLVR / 可验证奖励（数学、代码）** | CS336 L16, CS224N L12 | ⚠️ | B3 一处「可验证奖励」提及，**无展开**；CS336 有整讲 + 作业 |
| **GRPO / DeepSeek-R1 的 "Aha Moment"** | HF ch12（整章）, CS224N L12 | ❌ | GRPO 0 命中；R1 0 命中。**这是当前最热的后训练方法，HF 已设整章** |
| **PRM / 过程奖励模型（Let's Verify Step by Step）** | CS224N L13 | ❌ | 0 命中 |
| **Constitutional AI / RLAIF** | （Anthropic 系） | ❌ | 0 命中 |
| **对齐税 / 过度拒答 / 安全-有用性权衡** | CS224N L16 | ❌ | 0 命中 |
| **奖励模型训练细节（偏好数据、长度偏差）** | CS336 L15, QLoRA 论文 | ⚠️ | B3 有长度偏差/风格偏差/Cohen kappa，**但无 RM 训练实操** |

### 2.5 推理与部署

| 知识点 | 权威课程 | 覆盖 | 依据 / 缺口说明 |
|---|---|---|---|
| KV Cache 原理 / 显存公式 | CS336 L10, vLLM | ✅ | A2/A3/B3 三处，含公式与手算题 |
| **PagedAttention（分页 / 块表 / 共享）** | vLLM 论文 | ✅ | B3-c2 + A1/A2，含碎片率 60%→<4% 数据 |
| **Continuous Batching** | vLLM, CS336 L10 | ✅ | B3-c3，含静态 vs 连续批处理的代码 demo |
| **Prefix Caching / Radix Cache** | vLLM | ✅ | B3 + A3，含「系统提示共享」场景 |
| **Chunked Prefill** | vLLM | ⚠️ | 1 次提及（B3），无展开 |
| **投机解码（Speculative Decoding）** | CS224N L13, vLLM Speculators | ⚠️ | A2/B3 各 1–2 处，**有原理但无 draft/verify 流程与接受率分析** |
| **量化：INT8 / INT4 / GPTQ / AWQ / FP8** | CS336, vLLM | ⚠️ | 有 GPTQ/AWQ/INT8/INT4/FP8 名词与「显存÷2/÷4」，**无量化原理（per-channel/per-group、校准、误差传播）** |
| **KV Cache 量化** | vLLM | ⚠️ | A3/B3 提及 fp8/int8 KV，无展开 |
| **TTFT / TPOT / P50/P95/P99 / 吞吐** | vLLM, CS336 L12 | ✅ | B3-c3/c4，含分位数代码题，**优于多数基准** |
| **前缀树/调度公平性（长短请求混跑）** | vLLM | ⚠️ | A3 风险提示提「短请求被饿死」，无调度算法 |
| **vLLM / TensorRT-LLM / SGLang 选型** | vLLM 生态 | ⚠️ | vLLM/TensorRT 提及，SGLang 0 命中；无引擎对比 |
| **推理引擎底层：kernel / CUDA graph / Triton** | CS336 L6 | ❌ | 无 |
| 模型路由 / 语义缓存 / 成本优化 | Anthropic, vLLM Semantic Router | ✅ | B3-c4，含五层成本优化与路由代码题 |
| 上线监控 / 灰度 / 回滚 | （工程实践） | ✅ | B3-c1-l5，指标齐全，**优于多数基准** |
| **长上下文推理优化（滑窗 / 分层注意力）** | CS336 L4 | ⚠️ | A1/B3 列举，无系统方案 |

### 2.6 RAG

| 知识点 | 权威课程 | 覆盖 | 依据 / 缺口说明 |
|---|---|---|---|
| RAG 基础链路（索引→检索→生成） | RAG 综述 §II-A | ✅ | B1-c1 |
| **文档切分策略（固定/递归/语义/结构感知）** | RAG 综述 §III-B1 | ✅ | B1-c2 独立一章，含代码/表格/页眉页脚处理，**优于多数基准** |
| **元数据附加 / 结构索引** | RAG 综述 §III-B2/B3 | ⚠️ | 有元数据提及，**无结构索引（树/图，RAPTOR 类）** |
| 向量检索 / 余弦 / 内积 | RAG 综述 §III-A | ✅ | B1-c3 |
| BM25 / 稀疏检索 | RAG 综述 §III-D1 | ✅ | B1-c3 |
| **混合检索 + RRF 融合** | RAG 综述 §III-D1 | ✅ | B1-c3，含 RRF，**优于多数基准** |
| **Rerank / 交叉编码器** | RAG 综述 §IV-A1 | ✅ | B1-c3 |
| **Context 压缩 / 选择** | RAG 综述 §IV-A2 | ⚠️ | 提「上下文瘦身」，**无专门压缩方法（LLMLingua 类）** |
| **Query 改写 / 扩展 / 路由** | RAG 综述 §III-C | ⚠️ | 有 query 改写（B1），**无 query routing、无 multi-query/RAG-Fusion 展开** |
| **HyDE** | RAG 综述 §II-C2 | ⚠️ | 1 次关键词命中，无展开 |
| **Self-RAG / FLARE / 自适应检索** | RAG 综述 §V-C | ❌ | Self-RAG 0 命中，FLARE 0 命中 |
| **Agentic RAG** | HF Agents Unit3（整单元） | ❌ | 0 命中 |
| **GraphRAG / 知识图谱检索** | RAG 综述 §III-A1 | ❌ | GraphRAG 0 命中 |
| **多模态 RAG** | RAG 综述 §VII-F | ❌ | 无 |
| **RAG 评估（忠实度/相关性/上下文精度）** | RAG 综述 §VI | ✅ | B1-c4 + RAGAS 提及，**指标体系完整** |
| **RAG vs 长上下文 vs 微调 的取舍** | RAG 综述 §VII-A, §II-D | ⚠️ | B3 有「微调 vs RAG」选型题，**无长上下文对比** |
| **生产级 RAG（增量索引、权限、多租户）** | RAG 综述 §VII-E | ⚠️ | 有「换 embedding 必须重建索引」的坑，无系统方案 |

### 2.7 Agent

| 知识点 | 权威课程 | 覆盖 | 依据 / 缺口说明 |
|---|---|---|---|
| Agent 定义（感知-规划-行动-观察） | HF Agents U1, Anthropic | ✅ | B2-c2 |
| ReAct（Thought-Action-Observation 循环） | HF Agents U1 整单元, CS224N L10 | ✅ | B2-c2，含执行器与停止条件 |
| **Function Calling（schema / 参数 / 错误处理）** | HF Agents Bonus1, OpenAI 指南 | ✅ | B2-c2，含 schema 与容错，**优于多数基准** |
| **工具设计 ACI 原则（poka-yoke、docstring 式描述）** | Anthropic Appendix 2 | ⚠️ | 有工具设计课节，**但无 ACI 的「给 junior 写 docstring」「poka-yoke 参数」等具体原则** |
| **结构化输出 / 约束解码** | OpenAI Structured Outputs | ✅ | B2-c1，含结构化输出与约束解码（B3 也提） |
| **提示注入防护** | OWASP / 实践 | ✅ | B2-c1 专节，**多数基准不覆盖，本平台更强** |
| 提示工程技术谱系（zero/few-shot/CoT） | OpenAI, CS224N L9 | ✅ | B2-c1 |
| **CoT / Self-Consistency / ToT** | CS224N L12 | ⚠️ | CoT 有；**Self-Consistency、Tree-of-Thoughts 无** |
| **Workflow 编排模式（chaining/routing/parallelization/orchestrator-workers/evaluator-optimizer）** | Anthropic 全文核心 | ❌ | B2 的「工作流」是泛指，**Anthropic 五种模式的任何一种都未成体系讲解**；这是本报告最明确的缺失之一 |
| **多智能体协作** | HF Agents U2.1 | ✅ | B2-c2 课节「规划、反思与多智能体协作」 |
| **Reflexion / 反思** | HF Agents, 论文 | ⚠️ | 提及 Reflexion，无展开 |
| 记忆体系（短期/工作/长期） | HF Agents, Anthropic | ✅ | B2-c3 整章三层记忆 |
| **上下文工程 / 压缩 / 遗忘策略** | Anthropic, HF | ✅ | B2-c3，**优于多数基准** |
| **MCP（Model Context Protocol）** | Anthropic 全文核心 | ❌ | 0 命中。Anthropic 明确把 MCP 作为工具生态的标准接入方式 |
| **Browser / Computer Use / Vision Agent** | HF Agents U2.1 | ❌ | 「浏览器」「计算机使用」0 命中 |
| **Agent 框架（LangGraph / LlamaIndex / smolagents）** | HF Agents U2 整单元 | ❌ | 三框架全 0 命中。平台讲原理是对的，但**缺「用现成框架搭一个」的落地环节** |
| **Code Agent vs Tool-calling Agent** | HF Agents U2.1 | ❌ | 0 命中 |
| Agent 评估（结果/轨迹/组件三层） | HF Agents Bonus2, Anthropic | ✅ | B2-c4，**三层评估框架优于多数基准** |
| **Agent 可观测性（trace / span / OpenTelemetry）** | HF Agents Bonus2 | ⚠️ | 有「可观测性」概念，**无 trace/span/工具链（LangSmith、OpenTelemetry）** |
| **GAIA / SWE-bench / WebArena 等 Agent 基准** | HF Agents U4, Anthropic | ❌ | GAIA 0 命中，SWE-bench 0 命中 |

### 2.8 评估

| 知识点 | 权威课程 | 覆盖 | 依据 / 缺口说明 |
|---|---|---|---|
| 评测三层（能力/任务/安全） | CS224N L11 | ✅ | B3-c1-l5，**框架清晰** |
| 通用基准（MMLU / GSM8K / HumanEval / C-Eval / CMMLU） | CS224N L11, CS336 L12 | ✅ | B3 列举完整 |
| **HELM / 多维度评测框架** | CS224N L11 | ❌ | HELM 0 命中 |
| **AlpacaEval / LLM Arena / Elo** | CS224N L11 | ❌ | 三者全 0 命中 |
| **LLM-as-a-Judge（位置/长度偏差、交换校正、kappa）** | CS224N L11, QLoRA 论文 | ✅ | B3 含位置交换代码题与 kappa，**优于多数基准** |
| **pass@k / BLEU / ROUGE / BERTScore / 困惑度** | CS224N L11 | ⚠️ | 有 BERTScore、语义相似度；**pass@k、BLEU/ROUGE、PPL 无系统讲解** |
| **评测数据污染检测** | CS336 L12, CS224N L11 | ✅ | B3 有 5-gram 泄漏检测代码题 |
| **统计显著性 / 置信区间 / 方差** | CS224N L11 | ❌ | 无 |
| RAG 评估（忠实度/相关性） | RAG 综述 §VI | ✅ | B1-c4 |
| Agent 评估（轨迹级） | HF Agents Bonus2 | ✅ | B2-c4 |
| **基准饱和 / Goodhart / 基准设计方法论** | CS224N L11（Ruder 文） | ⚠️ | 有「基准分高不等于业务好用」，无方法论展开 |

### 2.9 多模态

| 知识点 | 权威课程 | 覆盖 | 依据 / 缺口说明 |
|---|---|---|---|
| **视觉语言模型（VLM）架构** | CS224N L17, CS336 L17 | ❌ | 「多模态」「视觉」「VLM」「图像」全 0 命中 |
| **CLIP / 对比学习对齐** | CS224N L17 | ❌ | CLIP 0 命中 |
| **视觉指令微调 / LLaVA 类** | CS224N L17 | ❌ | 0 命中 |
| **统一多模态生成（Chameleon / Transfusion / MoT）** | CS224N L17 | ❌ | 0 命中 |
| **语音（ASR / TTS / 音频 LLM）** | （基准较少） | ❌ | 「语音」仅在 A1/A3 出现 2 次，非教学内容 |
| **多模态 RAG** | RAG 综述 §VII-F | ❌ | 0 命中 |

> **整节缺失**。CS224N 有专门 guest lecture，CS336 有 L17，HF 有 Vision Agent——本平台 7 门课 0 覆盖。

### 2.10 安全与对齐

| 知识点 | 权威课程 | 覆盖 | 依据 / 缺口说明 |
|---|---|---|---|
| **越狱（jailbreak）** | CS224N L16, 实践 | ⚠️ | 1 次提及（B3 红队集），无攻防方法 |
| **红队测试方法论** | CS224N L16, CS336 A5 | ⚠️ | 1 次提及，无流程/工具/用例设计 |
| **提示注入（Prompt Injection）** | B2 已覆盖 | ✅ | B2-c1 专节，**优于多数基准** |
| **内容安全 / 有害内容分类** | 实践 | ❌ | 「内容安全」「内容审核」0 命中 |
| **偏见与公平性** | HF ch1「Bias and limitations」, CS224N L16 | ❌ | 「偏见」0 命中（A1-c1 提到「偏见与局限」在 HF 目录中，平台无对应章节） |
| **隐私 / PII / 版权 / 数据合规** | HF ch1, CS224N L16 | ❌ | PII / 版权 / 许可证 全 0；「隐私」2 次（B2/B3 一句带过） |
| **Constitutional AI / 安全对齐** | CS336 A5 Part2 | ❌ | 0 命中 |
| **对齐税 / 过度拒答** | CS224N L16 | ❌ | 0 命中 |
| **模型卡 / 透明度文档** | HF ch4「Building a model card」 | ❌ | 模型卡 0 命中 |
| **社会影响 / 伦理 / 双重用途** | CS224N L16 整讲 | ❌ | 0 覆盖 |

---

## 3. 关键缺口清单（按重要性排序）

> **确认缺失** = 全语料 0 命中或仅 1 句提及且无展开，已逐一核验。
> **推测缺失** = 关键词有命中但怀疑内容不足，需人工复核。

### G1. 分布式训练与大规模训练系统 【确认缺失】— P0

- **缺什么**：数据并行 / DDP、张量并行（TP）、流水线并行（PP）、ZeRO 三阶段与 FSDP 分片、序列并行（Ulysses / Ring Attention）、通信量分析、3D 并行组合
- **哪些权威课程有**：CS336 **L7 + L8 两次整讲**（并含 Assignment 2「build a memory-efficient distributed version」）；CS224N L7「Pretraining (Scaling, Systems, Data)」；vLLM 生产文档（TP）
- **为什么重要**：这是「从能训一个模型」到「能训一个 7B/70B 模型」的分水岭。本平台 A2 只讲到 Adam + 学习率调度，读者学完**无法理解为什么 7B 全参微调需要 8 张卡**——而 B3 反而在习题里默认读者懂 ZeRO/FSDP。知识链条在此断裂。面试中「ZeRO 1/2/3 分别切什么」是高频题。
- **建议补在**：**A2 新增 2 章**（《分布式训练：数据/张量/流水线并行》《ZeRO 与 FSDP 显存分片实战》），或独立为 A2.5

### G2. 混合精度与训练数值稳定性 【确认缺失，仅技巧级提及】— P0

- **缺什么**：fp16 vs bf16 vs fp32 的取舍、**loss scaling（静态/动态）**、master weights、混合精度下的算子白名单（LayerNorm/softmax 用 fp32）、梯度溢出检测、bf16 为何取代 fp16
- **哪些权威课程有**：CS336 L2「resource accounting」；Karpathy makemore 3 讲激活/梯度统计与数值诊断；HF 各训练章节
- **为什么重要**：平台**只有 3 处零散 tip**（LayerNorm 用 fp32、BF16 字节数），但没有任何一课讲「开启混合精度后 loss 变 NaN 怎么办」。这是训练实操第一大坑。A1 的 Pre/Post-LN 习题甚至把「混合精度下 LayerNorm 用 fp16 溢出」写进了排查清单，说明作者知道这个知识点，却**没有对应的课节承载它**。
- **建议补在**：**A2 新增 1 章**《混合精度训练与数值稳定性》，并与 A1-c6 的 LayerNorm 数值细节合并

### G3. 数据工程（清洗 / 去重 / 配比 / 过滤）【确认缺失】— P0

- **缺什么**：数据源版图（Common Crawl / 代码 / 书籍 / 百科 / 合成）、HTML→text 抽取与 boilerplate 去除、**MinHash + LSH 近邻去重**、语义去重、质量分类器与启发式过滤、**数据配比与混采权重**、去毒与 PII 清洗
- **哪些权威课程有**：CS336 **L13 + L14 两次整讲** + **Assignment 4 全流程作业**（Common Crawl → 过滤 → 去重 → 训模型验证）；CS224N L7；HF ch10（Argilla 标注）ch5（Datasets）
- **为什么重要**：CS336 把「数据」与「架构」「系统」「scaling」并列为四大支柱，并给了整周作业。业界共识是「数据决定上限，模型只是逼近它」。本平台 37 章里**数据工程占 0 章**——MinHash 只在 B3 出现 1 次，数据配比只在 A3 出现 1 次。这是覆盖面最刺眼的空洞。
- **建议补在**：**新增子课程 A5《数据工程》3–4 章**，或 A2 末尾加 2 章

### G4. 推理模型 / RLVR / GRPO 后训练 【确认缺失】— P0

- **缺什么**：RLVR（可验证奖励强化学习）、**GRPO**（Group Relative Policy Optimization）、DeepSeek-R1 的 "Aha Moment"、PRM（过程奖励模型）与「Let's Verify Step by Step」、test-time compute scaling、推理蒸馏
- **哪些权威课程有**：**HF LLM Course 第 12 章「Build Reasoning Models」整章**（RL on LLMs / R1 Aha Moment / GRPO in DeepSeekMath / TRL 实现 / Unsloth 实操）；CS336 **L16「Post-training - RLVR」整讲**；CS224N **L12 + L13 两次「Reasoning」整讲**（含 R1、DAPO、PRM、test-time scaling）
- **为什么重要**：这是 2025–2026 年**后训练的主线**。三门权威课程全部把它列为独立单元，HF 甚至专设一章。本平台 B3 只有「可验证奖励」4 个字。读者学完 B3 会以为对齐 = RLHF + DPO，完全错过 o1/R1 之后的技术范式。
- **建议补在**：**B3 拆分**，新增独立子课程《推理模型与后训练新范式》2–3 章

### G5. Agent 工作流编排模式（Anthropic 五模式）【确认缺失】— P0

- **缺什么**：**Prompt chaining（含 gate）**、**Routing**、**Parallelization（Sectioning / Voting）**、**Orchestrator-workers**、**Evaluator-optimizer**、以及「何时不该用 Agent」的决策树、workflow vs agent 的架构区分
- **哪些权威课程有**：Anthropic "Building effective agents" —— 这是**该文的全部核心内容**，五个模式各配图、适用场景、反例；HF Agents U2.2/U2.3 用 LlamaIndex Workflows 与 LangGraph 落地
- **为什么重要**：B2 的「工作流」是泛指（「编排」「工作流」共 13 次命中但无体系）。Anthropic 的核心论点是「**大多数生产系统应该是 workflow 而不是 agent**」，平台缺失这一层，会让读者默认「Agent = 自主循环」，做出又贵又不稳的系统。
- **建议补在**：**B2 新增 1 章**《Agentic 系统设计模式：5 种工作流 + 何时用 Agent》

### G6. 多模态（视觉 / 语音）【确认缺失】— P0

- **缺什么**：VLM 架构（ViT + projector + LLM）、**CLIP 对比学习对齐**、视觉指令微调（LLaVA 类）、统一多模态生成（Chameleon / Transfusion / Mixture-of-Transformers）、多模态 scaling law、语音（ASR/TTS/音频 LLM）、多模态 RAG
- **哪些权威课程有**：CS224N **L17 整讲 + guest lecture（Luke Zettlemoyer）**；CS336 **L17「Alignment - multimodality」**；HF Agents U2.1「Vision and Browser agents」；RAG 综述 §VII-F「Multi-modal RAG」
- **为什么重要**：**整节 0 命中**（「多模态」「视觉」「VLM」「图像」「CLIP」全为 0）。2026 年主流模型全部多模态，岗位 JD 普遍要求。这是 10 个主题分类中**唯一整类完全空白**的。
- **建议补在**：**新增子课程 C1《多模态大模型》3–4 章**

### G7. 安全、对齐与社会影响【确认缺失】— P1

- **缺什么**：越狱攻防、红队方法论与用例设计、内容安全分类器、**偏见与公平性**、**隐私/PII/版权/许可**、Constitutional AI、对齐税与过度拒答、模型卡与透明度文档、双重用途与社会影响
- **哪些权威课程有**：CS224N **L16「Social and Broader Impacts of NLP (Risks)」整讲**；HF ch1「Bias and limitations」、ch4「Building a model card」；CS336 A5 Part2「safety alignment / DPO」
- **为什么重要**：平台只有 B3 的「越狱、注入、敏感内容的红队集」一句，且**提示注入防护**做得不错（B2 专节，是亮点），但安全整体是「一个 tip」的量级。企业落地时合规审查会直接卡在这里。
- **建议补在**：**B3 扩 1 章**《安全对齐与合规》，或独立子课程

### G8. Scaling Law 的方法论（拟合与预测）【部分覆盖】— P1

- **缺什么**：scaling law 的**拟合方法**（在小模型上拟合、外推到大模型）、计算最优分配（Chinchilla 的 N:D 推导）、loss 预测、数据受限下的 scaling、推理侧 scaling
- **哪些权威课程有**：CS336 **L9 + L11 两次整讲** + **Assignment 3「Query a training API to fit a scaling law」**；CS224N L7
- **为什么重要**：平台有 Chinchilla「1:20」的结论（A2），但没有「怎么自己拟合一条」。CS336 认为这是**可以在面试/立项中直接用的能力**（「给我 100 万预算，该训多大模型、用多少数据」）。
- **建议补在**：**A2 新增 1 章**《Scaling Law：从拟合到预算决策》

### G9. FlashAttention 与 kernel 级优化 【部分覆盖】— P1

- **缺什么**：FlashAttention 的分块 + 在线 softmax **实现**（Triton）、CUDA graph、算子融合、roofline 与算术强度、profiling 工具
- **哪些权威课程有**：CS336 **L6 整讲「Kernels, Triton」+ L2「算术强度」+ Assignment 2（自己写 Triton FlashAttention2）**；CS224N L5 提及
- **为什么重要**：平台 4 门课都提到 FlashAttention 原理（正确且清晰），但停在「知道它省显存」。CS336 的要求是「写出来」。对课程平台而言，**原理级已足够**，但如果目标是「能改推理引擎」，这层缺失会成为天花板。
- **建议补在**：B3 可选加 1 章《算子与 kernel 优化入门》，或作为进阶选修

### G10. RAG 前沿范式（Self-RAG / Agentic RAG / GraphRAG）【确认缺失】— P1

- **缺什么**：**Self-RAG**（自反思检索）、**FLARE**（主动检索）、**Agentic RAG**（把检索作为 Agent 的工具）、**GraphRAG**（知识图谱 + 社区摘要）、RAPTOR（树索引）、多模态 RAG
- **哪些权威课程有**：RAG 综述 §II-C2/§V-C 系统梳理；**HF Agents Unit 3 整单元「Agentic RAG」**；CS224N L10
- **为什么重要**：B1 的「基础 / 切分 / 检索 / 评估」四章是**2023 年的 Naive+Advanced RAG 框架**，扎实但停在那一代。RAG 综述本身已把「Modular RAG / 自适应检索」列为主流演进方向。
- **建议补在**：**B1 新增 1–2 章**《高级 RAG 范式：自适应检索与 Agentic RAG》

### G11. 量化原理（而非量化名词）【部分覆盖】— P1

- **缺什么**：per-tensor / per-channel / per-group 量化粒度、**校准（calibration）**、对称/非对称、GPTQ 的 Hessian 近似、AWQ 的激活感知、SmoothQuant 的离群值迁移、量化误差传播与评估
- **哪些权威课程有**：CS336 L2（数值精度）；vLLM「LLM Compressor」生态；QLoRA（NF4 信息论最优设计）
- **为什么重要**：平台有 GPTQ/AWQ/INT4/FP8 的名词与「显存÷2/÷4」结论，但**没有量化是怎么做的**。QLoRA 的 NF4 讲得不错（B3），说明有能力讲深，只是通用量化没讲。
- **建议补在**：**B3 新增 1 章**《量化：从 INT8 到 FP4》

### G12. Agent 工程落地：MCP / 框架 / 可观测性 / 基准 【部分缺失】— P1

- **缺什么**：**MCP（Model Context Protocol）**、LangGraph / LlamaIndex / smolagents 实操、**Code Agent vs Tool-calling Agent**、Browser / Computer Use Agent、**Agent 可观测性（trace/span、LangSmith、OpenTelemetry）**、GAIA / SWE-bench / WebArena 基准
- **哪些权威课程有**：HF Agents U2（三大框架整单元）、U2.1（code/vision agent）、Bonus 2（observability）、U4（GAIA）；Anthropic（MCP、computer use、SWE-bench）
- **为什么重要**：平台 B2 的**原理层很扎实**（ReAct、Function Calling、记忆三层、评估三层，均优于多数基准），但**工程落地层全空**——MCP/框架/可观测性/基准 均 0 命中。这会让读者「懂原理但搭不出来」。
- **建议补在**：**B2 新增 1 章**《Agent 工程落地：MCP、框架与可观测性》

### G13. 评测体系完整性（HELM / Arena / pass@k / 显著性）【部分缺失】— P2

- **缺什么**：HELM 多维评测框架、**Chatbot Arena 与 Elo/Bradley-Terry 排名**、AlpacaEval、**pass@k**、BLEU/ROUGE/METEOR、困惑度、**统计显著性与置信区间**、基准饱和与 Goodhart's law
- **哪些权威课程有**：CS224N **L11「Benchmarking and Evaluation」整讲**（含 MMLU/HELM/AlpacaEval 原始论文）
- **为什么重要**：平台 B3 的评测课节（三层结构 + LLM 裁判 + 泄漏检测）**质量很高**，但基准清单偏少（有 MMLU/GSM8K/HumanEval/C-Eval/CMMLU，缺 HELM/Arena/pass@k），且无统计显著性。
- **建议补在**：**B3-c1-l5 扩写**，或新增 1 章《评测方法论进阶》

### G14. 中文/多语言能力与分词公平性 【推测缺失】— P2

- **缺什么**：中文分词的 token 效率（同样内容中文 token 数为何更多）、多语言词表设计、跨语言迁移、「Do All Languages Cost the Same?」的 API 计费公平性问题
- **哪些权威课程有**：CS224N **L14 guest「Tokenization and Multilinguality」整讲**
- **为什么重要**：平台是**中文平台**，读者 100% 会遇到中文 token 成本问题（A1 提到「token 成本预算」但没接到中文）。这是**差异化优势点**，却完全没做。
- **建议补在**：**A1-c1 扩写**或 B3 成本章加一节

### G15. BatchNorm 与深度学习基础诊断 【确认缺失】— P2

- **缺什么**：BatchNorm 原理、激活/梯度统计诊断、初始化尺度、训练曲线判读、学习率 finder
- **哪些权威课程有**：Karpathy **makemore 3 整讲（1h55m）**、makemore 2（超参与 train/dev/test）
- **为什么重要**：平台从 Transformer 起步，跳过了「深度网络为什么不稳」的前置。A1-c6 讲 LayerNorm 时直接用对比表带过 BatchNorm，能应付，但缺少 Karpathy 那种「看激活分布判断网络健康」的诊断手感。
- **建议补在**：A1-c6 或 A2-c2 补充一节，或作为先修材料

### G16. 手推梯度（backprop ninja）实操 【部分覆盖】— P2

- **缺什么**：不用 autograd，手推 cross-entropy / linear / tanh / batchnorm / embedding 的梯度
- **哪些权威课程有**：Karpathy **makemore 4 整讲（1h55m）**；CS224N A2「calculating tensor derivatives」
- **为什么重要**：A2 讲了链式法则与计算图（概念正确），但没做「手推整个 MLP」的硬功夫。平台以「从零手写」为卖点（A1），这一环缺失与定位不符。
- **建议补在**：**A2-c2 扩写为 2 节**，加一个「手推两层 MLP 全梯度」的实操

---

## 4. 过度覆盖 / 冗余检查

### 4.1 明确冗余：KV Cache 讲了 3 遍

| 位置 | 次数 | 内容 |
|---|---|---|
| A2-c1「预训练目标与损失函数」下的课节「KV Cache 与推理加速」 | 21 处 | 原理 + 显存公式 + MQA/GQA/量化/PagedAttention/连续批处理总表 |
| A3-c4「GQA」课节 | 88 处 | KV Cache 显存公式与瓶颈分析（作为 GQA 动机） |
| B3-c2「KV Cache 与显存优化」整章 | 46 处 | 原理 + 公式 + MQA/GQA + PagedAttention + 前缀缓存 |

**问题**：
1. **A2 放在「损失函数」章下是位置错误**——KV Cache 属于推理优化，与「下一 token 预测 / 交叉熵 / 采样策略」无逻辑关系，读者在学损失函数时被塞进推理系统知识。
2. A2 与 B3 的内容**高度重复**（都讲了显存公式、MQA/GQA 表、PagedAttention、连续批处理）。
3. A3 的版本是合理的（GQA 需要 KV Cache 作动机），可保留。

**建议**：A2-c1 下的「KV Cache 与推理加速」课节**删除或降级为「延伸阅读」链接**，内容归并到 B3-c2；A2-c1 保留「采样策略（温度/Top-K/Top-P）」即可。

**证据**：`llm-a2.json` 中 `KV Cache` 命中 21 次，且课节标题直接挂在「预训练目标与损失函数」章下。

### 4.2 明确冗余：采样策略讲了 2 遍

| 位置 | 「温度/Top-P/top_p」命中 |
|---|---|
| A1-c11「文本生成：从 logits 到自然语言」 | 40 处 |
| A2-c1「预训练目标与损失函数」下「采样策略」课节 | 45 处 |

**问题**：同一内容（温度、Top-K、Top-P、重复惩罚）在 A1 与 A2 各讲一遍，且 A1-c11 的「生成循环与解码策略全实现」显然是**更合适的主场**（有代码、有 logits 上下文）。

**建议**：A2-c1 的「采样策略」课节**合并进 A1-c11**；A2-c1 聚焦「预训练目标 / 交叉熵 / 困惑度 / scaling law」。

### 4.3 章节结构问题：A1 有「目录不代表内容」的塌缩

- **A1-c8「Transformer Block」只有 1 个课节**（「Block 的两种接法：Pre-LN 与 Post-LN」），而 c6 已经详细讲过 Pre-LN/Post-LN —— **本课节内容与 c6 重复**。
- **A1-c9「Transformer Stack」只有 1 个课节**（「堆叠 N 层：参数量、计算量与层级分工」）
- **A1-c10「加载预训练权重」1 个课节**、**c11「文本生成」1 个课节**、**c12「可解释性」1 个课节**

12 章的课程里有 **5 章各只有 1 个课节**，而 c1–c7 每章 3–4 个课节。这造成两个问题：
1. **后半段学习体验断层**——前 7 章节奏均匀，后 5 章每章「一屏讲完」，与「12 章」的体量承诺不符。
2. **c8 与 c6 重复**（Pre-LN/Post-LN 讲两次）。

**建议**：c8/c9 合并为「Block 与 Stack：组装与堆叠」2 节；c10（权重加载）扩为 2 节（含 HF `from_pretrained` 的 key 映射、shape 不匹配排查）；c12（可解释性）值得扩为 2–3 节（注意力可视化 / 探针 / 激活修补 / 稀疏自编码器），因为这是平台少有的差异化章节。

### 4.4 内容质量问题：目录信息量不足（已核实的「隐藏内容」）

以下内容**在正文里真实存在且质量不错，但目录完全看不出来**：

| 藏在哪 | 实际内容 | 目录显示 |
|---|---|---|
| A1-c4 正文 | FlashAttention 分块 + 在线 softmax 原理 | 「自注意力机制」 |
| A1 长上下文习题参考答案 | PI / NTK / YaRN / Ulysses / Ring Attention / RULER / LongBench / needle-in-a-haystack / lost-in-the-middle | 不可见 |
| A3-c4 | MLA 与 GQA 对比（tip 中） | 不可见 |
| B1-c3 | RRF 融合、交叉编码器重排 | 「检索策略」 |
| B3-c1-l5 | 五层成本优化、TTFT/TPOT/P95、灰度回滚 | 「评测、成本与上线监控」 |
| B3-c1-e8 | 5-gram 数据泄漏检测实现 | 不可见 |

**这不是内容缺失，是产品问题**：学员/评审者看目录会严重低估课程深度。**建议**：把上述内容提升为显式课节，或在章节 goal 里写清「本章覆盖 X/Y/Z」。

### 4.5 「有但过时」风险评估

| 内容 | 位置 | 风险 | 说明 |
|---|---|---|---|
| RAG 四章框架 | B1 | ⚠️ 中 | 框架是 Naive + Advanced RAG（2023 代），缺 Modular/Agentic/Self-RAG。**内容没错，是覆盖代际落后**，不是过时 |
| 「LLaMA」作为终点 | A3 | ⚠️ 低 | 2026 年 LLaMA 仍是主流架构范式，RMSNorm/SwiGLU/RoPE/GQA 仍是标配。**不过时** |
| 未涉及 MoE 主流化 | A4 仅 3 章 | ⚠️ 中 | MoE 已从「论文研读」变成 DeepSeek/Qwen/Kimi 的**默认架构**，3 章偏薄，且无 MoE 的分布式训练与服务（专家并行） |
| 无 GPT-4o/Claude/Gemini 级系统卡讨论 | 全局 | ⚠️ 低 | 属产品评测范畴，非课程必需 |
| 「提示工程」占 B2 一章 | B2-c1 | ⚠️ 低 | 在 2026 年，提示工程已**部分被结构化输出/函数调用/推理模型吸收**。该章含 ReAct 与注入防护，仍有价值，但「技术谱系」一节可能显得碎 |

### 4.6 细枝末节（可考虑压缩）

| 内容 | 位置 | 判断 |
|---|---|---|
| 「词表、OOV 与 token 成本预算」 | A1-c1 | 有价值（接成本），但「OOV」在 BPE 时代已近乎伪问题，可压缩 |
| ALiBi | A1 提及 | 已被 RoPE 全面取代，一句话带过即可（现状即是如此，合格） |
| 正弦位置编码的完整三角恒等式推导 | A1-c3 / A3-c3 | 教学价值有，但**推导了两遍**（A1-c3 与 A3-c3 都讲正弦/可学习/RoPE 三者取舍）。A3-c3 应从「绝对位置编码的问题」切入，不重复推导正弦 |
| BatchNorm 对比 LayerNorm 的大表 | A1-c6 | 合理（解释为何 NLP 不用 BN），保留 |

---

## 5. 优先级建议

### P0 — 必须补（不做则课程体系有结构性硬伤）

1. **分布式训练**（G1）：A2 新增 2 章 —— DDP/TP/PP/序列并行 + ZeRO/FSDP 显存分片。**理由**：B3 已默认读者懂 ZeRO/FSDP，知识链断裂；CS336 用 2 讲 + 1 作业。
2. **混合精度与数值稳定性**（G2）：A2 新增 1 章 —— fp16/bf16、loss scaling、master weights、溢出排查。**理由**：训练第一大坑，目前只有 3 处零散 tip。
3. **数据工程**（G3）：新增子课程 A5（3–4 章）—— 数据源、清洗、MinHash 去重、质量过滤、数据配比。**理由**：37 章中 0 章数据工程；CS336 列为四大支柱之一并配整周作业。
4. **推理模型 / RLVR / GRPO**（G4）：B3 拆出新子课程（2–3 章）—— RLVR、GRPO、R1、PRM、test-time scaling。**理由**：HF 专设第 12 章、CS336 L16、CS224N L12+L13 三处独立成讲；平台只有 4 个字。
5. **Agent 工作流五模式**（G5）：B2 新增 1 章 —— chaining/routing/parallelization/orchestrator-workers/evaluator-optimizer + 何时不用 Agent。**理由**：Anthropic 全文核心，B2 原理强但缺这层会误导架构选型。
6. **多模态**（G6）：新增子课程 C1（3–4 章）—— VLM 架构、CLIP、视觉指令微调、统一多模态生成、语音。**理由**：十大主题中**唯一整类 0 覆盖**。
7. **修正 KV Cache 三处重复**（§4.1）：删除 A2-c1 下的 KV Cache 课节，内容归并 B3。**理由**：位置错误 + 内容重复，且侵占「损失函数」章的篇幅。
8. **安全与合规基础**（G7）：B3 扩 1 章 —— 越狱攻防、红队方法、偏见公平、PII/版权、模型卡。**理由**：企业落地的合规闸门；CS224N 有整讲。

### P1 — 建议补（显著提升体系完整度）

1. **Scaling Law 方法论**（G8）：A2 新增 1 章 —— 拟合、外推、计算最优分配、预算决策。CS336 用 2 讲 + 1 作业。
2. **Agent 工程落地**（G12）：B2 新增 1 章 —— MCP、LangGraph/LlamaIndex 实操、Code Agent、trace/span 可观测性、GAIA/SWE-bench。补上「懂原理但搭不出来」的断层。
3. **高级 RAG 范式**（G10）：B1 新增 1–2 章 —— Self-RAG、FLARE、Agentic RAG、GraphRAG、RAPTOR。
4. **量化原理**（G11）：B3 新增 1 章 —— 量化粒度、校准、GPTQ/AWQ/SmoothQuant 原理、误差评估。
5. **FlashAttention 实现**（G9）：B3 可选 1 章 —— Triton 分块 + 在线 softmax 动手实现、算术强度与 roofline。
6. **A1 后半段结构重整**（§4.3）：合并 c8/c9，扩写 c10/c12，消除 Pre-LN/Post-LN 重复。
7. **评测体系补全**（G13）：B3-c1-l5 扩写 —— HELM、Arena/Elo、pass@k、BLEU/ROUGE、统计显著性。
8. **中文分词与多语言成本**（G14）：A1-c1 扩写一节 —— 中文 token 效率、API 计费公平性。**这是中文平台的差异化优势点**。

### P2 — 可选（锦上添花 / 进阶选修）

1. **BatchNorm 与训练诊断**（G15）：A1-c6 或 A2-c2 补一节 —— 激活/梯度分布诊断、初始化尺度、学习率 finder。
2. **手推梯度实操**（G16）：A2-c2 扩为 2 节 —— 不用 autograd 手推两层 MLP 全梯度。
3. **其他 PEFT 方法**：B3 补一节 —— Adapter、Prefix-Tuning、IA³、DoRA，与 LoRA 对比选型。
4. **CoT 进阶**：B2 补一节 —— Self-Consistency、Tree-of-Thoughts、ReAct 与 CoT 的边界。
5. **长上下文系统方案**：B3 补一节 —— 滑窗/分层注意力、序列并行、RULER/LongBench 评测闭环。
6. **MoE 扩写**：A4 从 3 章扩到 4–5 章 —— 补专家并行（EP）、MoE 服务化、DeepSeek 的细粒度专家与共享专家。
7. **评测数据污染**：B3 已有 5-gram 检测，可补「语义级污染检测」与「基准泄漏的行业案例」。
8. **模型合并与剪枝**：B3 或 A3 补一节 —— 模型 soup、SLERP、结构化剪枝、蒸馏到小模型。
9. **数据标注工具链**：A5（新增数据课）内含 —— Argilla/Label Studio、标注一致性（Cohen kappa 已在 B3 出现，可复用）。
10. **开源生态与模型卡**：B3 或 C1 补一节 —— HF Hub、模型卡撰写、许可证（Apache/MIT/Llama License）差异。

---

## 6. 一页纸结论

**覆盖良好的部分（优于多数基准，不必改）**：

- **A1 架构主线**：从 token 到 GPT 的完整手写路径，含 sqrt(d_k) 方差推导、因果掩码三种错误实现、Pre/Post-LN 失效分析 —— 深度接近 Karpathy + CS336
- **A3 现代架构**：RoPE 的复数视角与相对性推导、PI/NTK/YaRN 外推、GQA 显存账本 —— **超过多数基准课程**
- **B3 微调与工程**：LoRA/QLoRA 显存账本（12/16 字节每参数 + 三道代码题）、SFT 损失掩码、DPO 公式与代码、TTFT/TPOT 分位监控 —— 工程颗粒度很细
- **B1 切分与检索**：切分独立成章 + RRF 融合 + 交叉编码器重排 —— 比多数「RAG 科普」扎实
- **B2 原理层**：ReAct 执行器、Function Calling 容错、三层记忆、Agent 三层评估、提示注入防护 —— 优于多数基准（提示注入防护是稀缺亮点）
- **B3 评测**：三层评测结构 + LLM 裁判位置偏差校正 + 5-gram 泄漏检测 —— 质量高于基准平均

**结构性硬伤（P0）**：

1. **训练系统整块缺失**：分布式 + 混合精度 = 0 章（而 B3 已默认读者懂）
2. **数据工程整块缺失**：37 章里 0 章
3. **多模态整类缺失**：十大主题中唯一 0 覆盖
4. **推理模型/GRPO 缺失**：三门权威课程全部独立成讲
5. **Agent 工作流模式缺失**：Anthropic 全文核心
6. **KV Cache 讲 3 遍**：A2 位置错误 + 与 B3 重复

**一句话**：这个平台的**「模型内部」很强（架构、微调、推理优化），「模型外部」很弱（数据、分布式、多模态、安全）**。它更像一门优秀的「Transformer 与后训练」课，而不是一门完整的「大模型工程」课。补齐 P0 六项后，覆盖面可从约 **60%** 提升到约 **80%**（口径见附录 A）。

---

## 附录 A：判定统计

| 主题分类 | 知识点数 | ✅ | ⚠️ | ❌ | 加权覆盖率（✅ + 0.5×⚠️） |
|---|---|---|---|---|---|
| 2.1 基础架构 | 25 | 18 | 6 | 1 | 84% |
| 2.2 训练 | 20 | 8 | 10 | 2 | 65% |
| 2.3 数据工程 | 11 | 3 | 3 | 5 | 41% |
| 2.4 微调与对齐 | 13 | 6 | 3 | 4 | 58% |
| 2.5 推理与部署 | 15 | 7 | 7 | 1 | 70% |
| 2.6 RAG | 17 | 7 | 6 | 4 | 59% |
| 2.7 Agent | 20 | 10 | 4 | 6 | 60% |
| 2.8 评估 | 11 | 6 | 2 | 3 | 64% |
| 2.9 多模态 | 6 | 0 | 0 | 6 | 0% |
| 2.10 安全与对齐 | 10 | 1 | 2 | 7 | 20% |
| **合计** | **148** | **66** | **43** | **39** | **59.1%** |

> 注：合计为 §2 各表逐行计数所得（148 个细项，已用脚本核对），加权覆盖率 = (66 + 0.5×43) / 148 ≈ **59.1%**。
> 若只补 P0 六项（分布式训练 2 章、混合精度 1 章、数据工程 4 章、推理模型 3 章、Agent 工作流 1 章、多模态 4 章），按同类知识点增量估算，覆盖率可升至约 **78%–82%**。

## 附录 B：抓取失败项与推测声明

| 来源 | 状态 | 处理 |
|---|---|---|
| `huggingface.co/learn/llm-course` 页面 | ❌ 直连失败 | ✅ 改用 GitHub 官方 `_toctree.yml` 源文件，**内容等价，非推测** |
| `huggingface.co/learn/agents-course` 页面 | ❌ 直连失败 | ✅ 同上，改用 `_toctree.yml`，**非推测** |
| OpenAI Prompt Engineering 指南 | ❌ Cloudflare 403 | ⚠️ **§1.7 标注「据已知知识」**，非本次抓取 |
| OpenAI Function Calling 指南 | ❌ 未单独抓取 | ⚠️ 合并在 §1.7，**据已知知识** |
| HF 各章节正文（非目录） | ❌ 未抓取 | 仅使用目录标题，**未推测正文内容**；各章子主题均来自 `_toctree.yml` 原文 |
| CS336 lecture slides 具体内容 | ❌ 未逐份抓取 | 仅用 lecture 标题 + Assignment 描述，**未推测 slide 内容** |

**未使用推测的部分**：第 1 节中 CS336 / CS224N / Karpathy / Anthropic / RAG 综述 / vLLM / LoRA·QLoRA·DPO 的全部内容，均来自本次抓取的页面原文。第 1.7 节（OpenAI）是唯一标注为已知知识的部分。

**本报告对「我的课程」的所有判定**，均基于 `content-data/courses/llm-*.json` 的全文检索与上下文核对，**无一处基于目录猜测**。
