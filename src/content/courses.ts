import type { Chapter, Course } from '../types';
import { pythonChapters } from './chapters/python';
import { pandasChapters } from './chapters/pandas';
import { sqlChapters } from './chapters/sql';
import { excelChapters } from './chapters/excel';
import { vizChapters } from './chapters/viz';
import { methodologyChapters } from './chapters/methodology';
import { algoChapters } from './chapters/algo';
import { llm_a1Chapters } from './chapters/llm-a1';
import { llm_a2Chapters } from './chapters/llm-a2';
import { llm_a3Chapters } from './chapters/llm-a3';
import { llm_a4Chapters } from './chapters/llm-a4';
import { llm_b1Chapters } from './chapters/llm-b1';
import { llm_b2Chapters } from './chapters/llm-b2';
import { llm_b3Chapters } from './chapters/llm-b3';
import { llmA5Chapters } from './chapters/llm-a5';
import { llmB4Chapters1 } from './chapters/llm-b4a';
import { paperChapters } from './chapters/paper-transformer';
import { paperTransformerChapters2 } from './chapters/paper-transformer2';
import { paperTransformerChapters3 } from './chapters/paper-transformer3';
import { paperVisionChapters } from './chapters/paper-vision';
import { paperVisionChapters2 } from './chapters/paper-vision2';
import { paperVisionChapters3 } from './chapters/paper-vision3';
import { paperVisionChapters4 } from './chapters/paper-vision4';
import { paperVisionChapters5 } from './chapters/paper-vision5';
import { paperTheoryChapters } from './chapters/paper-theory';
import { paperTheoryChapters2 } from './chapters/paper-theory2';
import { paperTheoryChapters3 } from './chapters/paper-theory3';
import { paperTheoryChapters4 } from './chapters/paper-theory4';
import { paperTheoryChapters5 } from './chapters/paper-theory5';
import { paperReasoningChapters } from './chapters/paper-reasoning';
import { paperReasoningChapters2 } from './chapters/paper-reasoning2';
import { paperReasoningChapters3 } from './chapters/paper-reasoning3';
import { paperReasoningChapters4 } from './chapters/paper-reasoning4';
import { paperReasoningChapters5 } from './chapters/paper-reasoning5';
import { paperReasoningChapters6 } from './chapters/paper-reasoning6';
import { paperTrainingChapters } from './chapters/paper-training';
import { paperTrainingChapters2 } from './chapters/paper-training2';
import { paperTrainingChapters3 } from './chapters/paper-training3';
import { paperTrainingChapters4 } from './chapters/paper-training4';
import { paperTrainingChapters5 } from './chapters/paper-training5';
import { paperTrainingChapters6 } from './chapters/paper-training6';
import { paperFoundationChapters } from './chapters/paper-foundation';
import { paperFoundationChapters2 } from './chapters/paper-foundation2';
import { paperFoundationChapters3 } from './chapters/paper-foundation3';
import { aiAutoM1Chapters } from './chapters/ai-auto-m1';
import { aiAutoM1Chapters2 } from './chapters/ai-auto-m1b';
import { aiAutoM5Chapters } from './chapters/ai-auto-m5';
import { aiAutoM4Chapters } from './chapters/ai-auto-m4';
import { aiAutoM4Chapters2 } from './chapters/ai-auto-m4b';
import { aiAutoM3Chapters } from './chapters/ai-auto-m3';
import { aiAutoM3Chapters2 } from './chapters/ai-auto-m3b';
import { aiAutoM3Chapters3 } from './chapters/ai-auto-m3c';
import { aiAutoM2Chapters } from './chapters/ai-auto-m2';
import { aiAutoM2Chapters2 } from './chapters/ai-auto-m2b';
import { aiAutoM2Chapters3 } from './chapters/ai-auto-m2c';
import { miningPrepChapters } from './chapters/mining-prep';
import { miningPrepChapters2 } from './chapters/mining-prep2';
import { miningFreqChapters } from './chapters/mining-freq';
import { miningFreqChapters2 } from './chapters/mining-freq2';
import { miningClusterChapters } from './chapters/mining-cluster';
import { miningClusterChapters2 } from './chapters/mining-cluster2';
import { miningRecsysChapters } from './chapters/mining-recsys';
import { miningRecsysChapters2 } from './chapters/mining-recsys2';
import { miningGraphChapters } from './chapters/mining-graph';
import { miningGraphChapters2 } from './chapters/mining-graph2';
import { llmB4Chapters2 } from './chapters/llm-b4b';
import { llmA5Chapters2 } from './chapters/llm-a5-extra';
import { quantMarketChapters } from './chapters/quant/quant-market';
import { quantMathChapters } from './chapters/quant/quant-math';
import { quantPythonChapters } from './chapters/quant/quant-python';
import { quantDataChapters } from './chapters/quant/quant-data';
import { quantStrategyChapters } from './chapters/quant/quant-strategy';
import { quantBacktestChapters } from './chapters/quant/quant-backtest';
import { quantPortfolioChapters } from './chapters/quant/quant-portfolio';
import { quantMlChapters } from './chapters/quant/quant-ml';
import { quantLiveChapters } from './chapters/quant/quant-live';
import { quantProjectChapters } from './chapters/quant/quant-project';
import { deepLearningChapters } from './chapters/deep-learning';
import { cs146sWeeks } from './chapters/cs146s';

function build(meta: Omit<Course, 'chapters'>, chapters: Omit<Chapter, 'courseId' | 'order'>[]): Course {
  return {
    ...meta,
    chapters: chapters.map((ch, i) => ({ ...ch, courseId: meta.id, order: i + 1 })),
  };
}

export const pythonCourse = build(
  {
    id: 'python',
    domainId: 'data',
    title: 'Python 数据分析基础',
    subtitle: '从零到能写干净的数据处理脚本',
    description:
      '面向零基础或"会一点但不成体系"的同学：讲透变量、数据类型、控制流、函数、容器、文件读写与异常处理，并把每一节的知识点直接落到数据处理场景上。学完后你能独立编写数据清洗脚本、读懂别人的分析代码。',
    icon: '🐍',
    color: '#3776ab',
    prerequisites: [],
    targetAudience: '零基础 / 编程基础薄弱的数据分析学习者',
    estimatedHours: 12,
  },
  pythonChapters,
);

export const pandasCourse = build(
  {
    id: 'pandas',
    domainId: 'data',
    title: 'Pandas 数据处理',
    subtitle: '数据分析师的核心武器',
    description:
      '系统讲解 Series / DataFrame 的数据结构、索引与切片、缺失值处理、分组聚合、表连接、透视表、时间序列与性能优化。每章都基于真实零售数据练习，覆盖实际分析工作中 90% 以上的操作。',
    icon: '🐼',
    color: '#150458',
    prerequisites: ['python'],
    targetAudience: '已掌握 Python 基础，需要做清洗与分析的初学者',
    estimatedHours: 16,
  },
  pandasChapters,
);

export const sqlCourse = build(
  {
    id: 'sql',
    domainId: 'data',
    title: 'SQL 数据库查询',
    subtitle: '从 SELECT 到窗口函数',
    description:
      '以 SQLite 为执行引擎（语法通用 MySQL/PostgreSQL），覆盖查询、筛选、聚合、多表连接、子查询、窗口函数与查询优化。所有练习都在浏览器内的真实数据库上执行，提交即得到结果集比对反馈。',
    icon: '🗄️',
    color: '#e11d48',
    prerequisites: [],
    targetAudience: '需要取数、做业务分析的同学',
    estimatedHours: 14,
  },
  sqlChapters,
);

export const excelCourse = build(
  {
    id: 'excel',
    domainId: 'data',
    title: 'Excel 数据处理与分析',
    subtitle: '函数、透视表、Power Query',
    description:
      '覆盖数据分析工作中真正高频的 Excel 技能：查找引用、条件统计、文本清洗、日期计算、数据透视表、Power Query 与 Power Pivot、图表与条件格式。配套答案为公式与操作步骤，可对照自己的 Excel 逐项验证。',
    icon: '📊',
    color: '#217346',
    prerequisites: [],
    targetAudience: '职场人士 / 需要做报表与业务分析的同学',
    estimatedHours: 10,
  },
  excelChapters,
);

export const vizCourse = build(
  {
    id: 'viz',
    domainId: 'data',
    title: '数据可视化',
    subtitle: 'Matplotlib & Seaborn 实战',
    description:
      '讲解图表选择原则与统计图形设计，并用 Matplotlib / Seaborn 在浏览器中实时绘图。覆盖分布、对比、关系、时间趋势、多变量与误导性图表识别，学完能独立做出一份专业级 EDA 报告图表。',
    icon: '📈',
    color: '#f59e0b',
    prerequisites: ['python', 'pandas'],
    targetAudience: '需要输出分析报告图表的同学',
    estimatedHours: 10,
  },
  vizChapters,
);

export const methodologyCourse = build(
  {
    id: 'methodology',
    domainId: 'data',
    title: '数据分析方法论',
    subtitle: '从业务问题到结论落地',
    description:
      '数据分析不只是跑代码。本课程讲清楚：如何拆解业务问题、搭建指标体系、设计分析框架、做 AB 实验、规避常见统计陷阱、做归因分析与撰写分析报告。适合准备面试与工作中的实战提升。',
    icon: '🧭',
    color: '#0891b2',
    prerequisites: [],
    targetAudience: '想建立分析思维、准备求职面试的同学',
    estimatedHours: 8,
  },
  methodologyChapters,
);

/* ─────────────── 编程开发学科 ─────────────── */

export const algoCourse = build(
  {
    id: 'algo',
    domainId: 'coding',
    title: '算法与数据结构',
    subtitle: '从复杂度分析到动态规划',
    description:
      '系统覆盖复杂度分析、数组与双指针、链表栈队列、哈希与排序、树与图、回溯分治、动态规划与贪心。每章配套大量编程题，在浏览器内真实运行判分，并强调面试高频考点与复杂度分析。',
    icon: '🧮',
    color: '#7c5cff',
    prerequisites: ['python'],
    targetAudience: '准备技术面试、想打牢算法基础的开发者',
    estimatedHours: 30,
  },
  algoChapters,
);

/* ─────────────── 人工智能学科 · 大模型系列 ───────────────
 *
 * 组织参考 nano-ai.tech《大模型学习地铁图》：
 *   地基（A1 从零手写 / A2 训练原理）→ 进阶（A3 LLaMA / A4 MoE）
 *   → 应用（B1 RAG / B2 Agent / B3 部署）
 */

export const deepLearningCourse = build(
  {
    id: 'deep-learning',
    domainId: 'ai',
    seriesId: 'deep-learning',
    title: '深度学习',
    subtitle: '神经网络基石、动力学优化与现代生成模型',
    description:
      '参考 Stanford CS231n/CS224n、MIT 6.S191 及《Deep Learning》（花书）与《动手学深度学习》，从生物神经元与感知机破冰，深入多层感知机与反向传播机制，精通现代优化器与正则化武器库，掌握 CNN 视觉感知、RNN/LSTM 序列建模、现代生成模型（VAE/GAN/Diffusion）与 Transformer 注意力演进，为大模型与前沿 AI 奠定最坚实的基石。',
    icon: '🧠',
    color: '#6366f1',
    prerequisites: ['python'],
    targetAudience: '人工智能与大模型学习者、零基础计算机与数学跨专业自学者',
    estimatedHours: 24,
  },
  deepLearningChapters,
);

export const llmA1Course = build(
  {
    id: 'llm-a1',
    domainId: 'ai',
    seriesId: 'llm-a1',
    title: '从零手写大模型',
    subtitle: '一个零件一个零件把 GPT 搭出来',
    description:
      '从「一段文本怎么变成向量」开始，逐层拆解：分词器 → 嵌入层 → 位置编码 → 自注意力 → 多头注意力 → 残差连接 → LayerNorm → FFN → Transformer Block → 堆叠 → 加载权重 → 文本生成 → 可解释性。每一层都用纯 numpy 亲手实现并跑通，学完你会真正明白 GPT 内部在算什么。',
    icon: '🌱',
    color: '#22c55e',
    prerequisites: ['deep-learning'],
    targetAudience: '想真正理解 Transformer 内部机制，而不是只会调 API 的开发者',
    estimatedHours: 20,
  },
  llm_a1Chapters,
);

export const llmA2Course = build(
  {
    id: 'llm-a2',
    domainId: 'ai',
    seriesId: 'llm-a2',
    title: '大模型训练原理',
    subtitle: '模型到底是怎么学会的',
    description:
      '讲清楚训练的完整闭环：损失函数（交叉熵与困惑度）、反向传播（链式法则与计算图）、梯度下降（学习率与收敛）、Adam 优化器（动量与自适应步长）、学习率调度（warmup 与余弦衰减）。配套纯 numpy 手写梯度与优化器的编程题。',
    icon: '🔥',
    color: '#f59e0b',
    prerequisites: ['deep-learning', 'llm-a1'],
    targetAudience: '想理解训练过程、调参原理与常见训练故障的开发者',
    estimatedHours: 14,
  },
  llm_a2Chapters,
);

export const llmA3Course = build(
  {
    id: 'llm-a3',
    domainId: 'ai',
    seriesId: 'llm-a3',
    title: '从 GPT-2 到 LLaMA',
    subtitle: '一次换一个零件的架构演进与 MLA 革新',
    description:
      '从 GPT-2 到现代 LLaMA 与 DeepSeek-V3：LayerNorm → RMSNorm（省掉减均值）、GELU → SwiGLU（门控激活）、绝对位置 → RoPE（旋转位置编码）、MHA → GQA（分组查询注意力），再到巅峰之作 MLA（多头潜在注意力）的低秩潜在压缩、解耦 RoPE 与推理期矩阵吸收技术。',
    icon: '🚀',
    color: '#7c5cff',
    prerequisites: ['llm-a1'],
    targetAudience: '想读懂 LLaMA/Qwen/DeepSeek 等开源模型代码结构的工程师',
    estimatedHours: 18,
  },
  llm_a3Chapters,
);

export const llmA4Course = build(
  {
    id: 'llm-a4',
    domainId: 'ai',
    seriesId: 'llm-a4',
    title: 'MoE 论文研读',
    subtitle: '稀疏专家混合：从 Switch Transformer 到 DeepSeek-V3',
    description:
      '系统研读 MoE 演进：Switch Transformer 的 Top-1 路由与容量因子、Mixtral 的 Top-2 与 SwiGLU 专家、DeepSeek-MoE 细粒度专家切分与共享专家机制，以及 DeepSeek-V3 的无辅助损失动态偏置与设备受限路由。理解现代开源 MoE 为什么能做到「参数巨大但推理极快」。',
    icon: '🧩',
    color: '#ec4899',
    prerequisites: ['llm-a1'],
    targetAudience: '想理解前沿大模型架构、准备读论文的工程师',
    estimatedHours: 14,
  },
  llm_a4Chapters,
);

export const llmB1Course = build(
  {
    id: 'llm-b1',
    domainId: 'ai',
    seriesId: 'llm-b1',
    title: 'RAG 检索增强生成',
    subtitle: '把外部知识接进模型',
    description:
      '覆盖 RAG 完整链路：文档切分策略、向量化与向量库、向量/BM25 混合检索与 RRF 融合、交叉编码器重排、提示组装，以及忠实度/相关性等评估指标与幻觉治理。',
    icon: '📚',
    color: '#0891b2',
    prerequisites: ['llm-a1'],
    targetAudience: '要为企业知识库、文档问答搭建 RAG 系统的工程师',
    estimatedHours: 14,
  },
  llm_b1Chapters,
);

export const llmB2Course = build(
  {
    id: 'llm-b2',
    domainId: 'ai',
    seriesId: 'llm-b2',
    title: 'AI Agent 工程',
    subtitle: '让模型自主行动',
    description:
      '从提示工程到 Agent 工程：零样本/少样本/CoT、结构化输出与提示注入防护、ReAct 循环、Function Calling 工具设计、记忆体系（短期/工作/长期）、规划与反思（Reflexion）、多智能体协作、以及 Agent 评估与可观测性。',
    icon: '🛠️',
    color: '#2f6bff',
    prerequisites: ['llm-a1'],
    targetAudience: '要构建可靠 Agent 应用的工程师与产品经理',
    estimatedHours: 18,
  },
  llm_b2Chapters,
);

export const llmB3Course = build(
  {
    id: 'llm-b3',
    domainId: 'ai',
    seriesId: 'llm-b3',
    title: '推理与部署工程',
    subtitle: '把模型真正跑起来',
    description:
      '覆盖推理性能与工程落地：采样策略与温度、KV Cache 与显存估算、GQA/MQA、连续批处理、量化、投机解码、vLLM 核心机制，以及 LoRA/QLoRA 微调、SFT 数据构造、RLHF 与 DPO、成本与延迟优化、上线监控。',
    icon: '⚙️',
    color: '#64748b',
    prerequisites: ['llm-a1'],
    targetAudience: '要把模型部署到生产、关注成本与延迟的工程师',
    estimatedHours: 16,
  },
  llm_b3Chapters,
);


/** 数据工程与语料构建（A5） */
export const llmA5Course = build(
  {
    id: 'llm-a5',
    domainId: 'ai',
    seriesId: 'llm-a5',
    title: '数据工程与语料构建',
    subtitle: '决定模型上限的隐形支柱',
    description:
      '预训练语料从哪里来、怎么洗、怎么去重、怎么配比：六大来源与定位、七道清洗流水线、启发式规则与质量分类器、MinHash/LSH 模糊去重、课程学习与退火、合成数据的风险。参考 Stanford CS336 的 Data 讲座与 FineWeb/RefinedWeb 数据论文。',
    icon: '🗄️',
    color: '#0ea5e9',
    prerequisites: ['llm-a1'],
    targetAudience: '要做预训练、领域模型或数据质量优化的工程师',
    estimatedHours: 12,
  },
  [...llmA5Chapters, ...llmA5Chapters2],
);


/** 后训练与推理模型（B4） */
export const llmB4Course = build(
  {
    id: 'llm-b4',
    domainId: 'ai',
    seriesId: 'llm-b4',
    title: '后训练与推理模型',
    subtitle: '从 SFT 到 GRPO 与 DeepSeek-R1：让模型学会思考',
    description:
      '预训练之后的完整后训练跃迁：SFT 监督微调与损失掩码、偏好对齐（RLHF/DPO）、推理强化学习（RLVR 规则验证与 GRPO 组内无 Critic 策略优化）、DeepSeek-R1-Zero 思考链与 Aha Moment 涌现、四阶段工业级对齐流水线，以及 80 万条长思考链小模型蒸馏。',
    icon: '🎯',
    color: '#ef4444',
    prerequisites: ['llm-a2'],
    targetAudience: '要做模型微调、对齐与推理能力提升的工程师',
    estimatedHours: 18,
  },
  [...llmB4Chapters1, ...llmB4Chapters2],
);

/* ═══════════════════ 数据挖掘系列（CS246 体系）═══════════════════ */

export const miningPrepCourse = build(
  {
    id: 'mining-prep',
    domainId: 'mining',
    seriesId: 'mining-prep',
    title: '数据预处理与特征工程',
    subtitle: '把原始数据变成模型能用的样子',
    description:
      '数据挖掘的第一步也是最容易被低估的一步：缺失值三种机制（MCAR/MAR/MNAR）与填补策略、异常值检测（IQR/距离/模型）、数据规范化与离散化、特征构造与选择、类别不平衡与数据泄漏防范。',
    icon: '🧹',
    color: '#0ea5e9',
    prerequisites: [],
    targetAudience: '要做数据挖掘与机器学习项目的分析师与工程师',
    estimatedHours: 12,
  },
  [...miningPrepChapters, ...miningPrepChapters2],
);

export const miningFreqCourse = build(
  {
    id: 'mining-freq',
    domainId: 'mining',
    seriesId: 'mining-freq',
    title: '频繁模式与关联规则',
    subtitle: '从购物篮里挖出啤酒与尿布',
    description:
      '关联规则挖掘的完整体系：支持度/置信度/提升度三指标、Apriori 的反单调性与逐层剪枝、FP-Growth 的树结构、规则评估与冗余消除、序列模式与 PrefixSpan。',
    icon: '🔗',
    color: '#f59e0b',
    prerequisites: [],
    targetAudience: '做零售、电商、推荐与用户行为分析的工程师',
    estimatedHours: 14,
  },
  [...miningFreqChapters, ...miningFreqChapters2],
);

export const miningClusterCourse = build(
  {
    id: 'mining-cluster',
    domainId: 'mining',
    seriesId: 'mining-cluster',
    title: '聚类与降维',
    subtitle: '没有标签时如何发现结构',
    description:
      '无监督学习的核心方法：K-Means 的迭代与收敛、层次聚类与密度聚类（DBSCAN）、PCA/SVD 降维原理、t-SNE 与 UMAP 的可视化取舍、聚类评估指标。',
    icon: '🎯',
    color: '#7c5cff',
    prerequisites: ['mining-prep'],
    targetAudience: '做用户分群、异常分析、数据探索的分析师',
    estimatedHours: 16,
  },
  [...miningClusterChapters, ...miningClusterChapters2],
);

export const miningRecsysCourse = build(
  {
    id: 'mining-recsys',
    domainId: 'mining',
    seriesId: 'mining-recsys',
    title: '推荐系统',
    subtitle: '预测用户想要什么',
    description:
      '从协同过滤到矩阵分解：User-CF 与 Item-CF、皮尔逊相似度、隐式反馈建模、SVD++ 与 ALS、内容推荐与混合策略、冷启动与马太效应、离线与在线评估体系。',
    icon: '🎁',
    color: '#ec4899',
    prerequisites: ['mining-cluster'],
    targetAudience: '要做推荐、搜索、广告排序的算法工程师',
    estimatedHours: 18,
  },
  [...miningRecsysChapters, ...miningRecsysChapters2],
);

export const miningGraphCourse = build(
  {
    id: 'mining-graph',
    domainId: 'mining',
    seriesId: 'mining-graph',
    title: '图挖掘与异常检测',
    subtitle: '在关系与流数据里找模式',
    description:
      '图与流的挖掘方法：PageRank 与图中心性、社区发现（Louvain/标签传播）、异常检测（统计/距离/孤立森林/自编码器）、数据流挖掘（窗口模型、Misra-Gries、Count-Min）。',
    icon: '🕸️',
    color: '#22c55e',
    prerequisites: ['mining-cluster'],
    targetAudience: '做风控、社交网络分析、实时监控的工程师',
    estimatedHours: 15,
  },
  [...miningGraphChapters, ...miningGraphChapters2],
);


/* ═══════════════════ AI 自动化系列 ═══════════════════ */

export const aiAutoM1Course = build(
  {
    id: 'ai-auto-m1',
    domainId: 'ai-auto',
    seriesId: 'ai-auto-m1',
    title: 'AI 自动化基础',
    subtitle: '什么能自动化，LLM 能做什么',
    description:
      '从零建立 LLM 与自动化的认知：自动化的三个层次与成本结构、token 与自回归生成、幻觉的根源、提示工程四要素、从脚本到 Agent 的演进路线。适合完全没有 LLM 基础的学员。',
    icon: '🧭',
    color: '#0ea5e9',
    prerequisites: [],
    targetAudience: '想用 AI 自动化工作但还没有 LLM 基础的人',
    estimatedHours: 10,
  },
  [...aiAutoM1Chapters, ...aiAutoM1Chapters2],
);

export const aiAutoM2Course = build(
  {
    id: 'ai-auto-m2',
    domainId: 'ai-auto',
    seriesId: 'ai-auto-m2',
    title: 'Agent 架构与工作流',
    subtitle: 'Agent 的心跳：思考、行动、观察',
    description:
      '技术核心：ReAct 循环与轨迹、工具调用与 ACI 设计、五种工作流模式、多 Agent 协作、状态管理与检查点。学完能自己设计并实现一个可靠的 Agent。',
    icon: '🔄',
    color: '#f59e0b',
    prerequisites: ['ai-auto-m1'],
    targetAudience: '要亲手实现 Agent 的开发者',
    estimatedHours: 18,
  },
  [...aiAutoM2Chapters, ...aiAutoM2Chapters2, ...aiAutoM2Chapters3],
);

export const aiAutoM3Course = build(
  {
    id: 'ai-auto-m3',
    domainId: 'ai-auto',
    seriesId: 'ai-auto-m3',
    title: '业务流程自动化',
    subtitle: '把 AI 接进真实业务',
    description:
      'RPA 基础与脆弱性、AI 增强的三类能力、文档理解流水线、可视化工作流平台（n8n/Zapier）的取舍、企业级落地（权限/审计/异常/合规）。',
    icon: '🏭',
    color: '#7c5cff',
    prerequisites: ['ai-auto-m2'],
    targetAudience: '要把 AI 落到业务系统里的工程师与产品经理',
    estimatedHours: 16,
  },
  [...aiAutoM3Chapters, ...aiAutoM3Chapters2, ...aiAutoM3Chapters3],
);

export const aiAutoM4Course = build(
  {
    id: 'ai-auto-m4',
    domainId: 'ai-auto',
    seriesId: 'ai-auto-m4',
    title: '代码与文档自动化',
    subtitle: '两个最高价值的场景',
    description:
      '代码生成的三个层次、生成-测试-修复循环、SWE-bench 评估、自动化测试与变异测试、代码审查自动化、文档分类抽取摘要与长文档 map-reduce。',
    icon: '⚙️',
    color: '#ec4899',
    prerequisites: ['ai-auto-m2'],
    targetAudience: '做研发效率工具与文档自动化的工程师',
    estimatedHours: 16,
  },
  [...aiAutoM4Chapters, ...aiAutoM4Chapters2],
);

export const aiAutoM5Course = build(
  {
    id: 'ai-auto-m5',
    domainId: 'ai-auto',
    seriesId: 'ai-auto-m5',
    title: '评估、安全与运维',
    subtitle: '从能跑到敢上线',
    description:
      'Agent 三层评估体系与评估集设计、轨迹评估、可观测性（trace/span/成本归因）、提示注入防御、权限隔离、人工检查点与红队测试。',
    icon: '🛡️',
    color: '#22c55e',
    prerequisites: ['ai-auto-m2'],
    targetAudience: '要把 Agent 推上生产环境的工程师',
    estimatedHours: 12,
  },
  aiAutoM5Chapters,
);


/* ═══════════════════ 论文导读系列 ═══════════════════ */

export const paperTransformerCourse = build(
  {
    id: 'paper-transformer',
    domainId: 'paper',
    seriesId: 'paper-transformer',
    title: 'Transformer 家族',
    subtitle: 'Attention Is All You Need',
    description:
      '从「Attention Is All You Need」出发，理解注意力机制为何能取代循环：缩放点积注意力的五步计算、多头注意力的分工、位置编码的必要性，以及长上下文的工程解法。配套纯 numpy 可运行代码与交互图示。',
    icon: '🔀',
    color: '#7c5cff',
    prerequisites: [],
    targetAudience: '想真正读懂 Transformer 论文的人',
    estimatedHours: 6,
  },
  [...paperChapters, ...paperTransformerChapters2, ...paperTransformerChapters3],
);

export const paperVisionCourse = build(
  {
    id: 'paper-vision',
    domainId: 'paper',
    seriesId: 'paper-vision',
    title: '视觉架构',
    subtitle: 'AlexNet 与 ResNet',
    description:
      '从 AlexNet 引爆深度学习，到 ResNet 用残差连接突破深度极限。理解端到端学习、ReLU、Dropout、数据增强、BatchNorm、残差连接等关键技术，配套可运行的 PyTorch 代码与交互图示。',
    icon: '👁️',
    color: '#0891b2',
    prerequisites: [],
    targetAudience: '想理解 CNN 演进脉络的人',
    estimatedHours: 6,
  },
  [...paperVisionChapters, ...paperVisionChapters2, ...paperVisionChapters3, ...paperVisionChapters4, ...paperVisionChapters5],
);

export const paperTheoryCourse = build(
  {
    id: 'paper-theory',
    domainId: 'paper',
    seriesId: 'paper-theory',
    title: '理论与复杂度',
    subtitle: 'MDL 与柯尔莫哥洛夫复杂度',
    description:
      '从信息论视角理解"学习"：最小描述长度（MDL）如何把奥卡姆剃刀变成可计算的量、为什么噪声不可压缩、柯尔莫哥洛夫复杂度如何定义"随机"、以及"压缩即智能"假说的数学基础。纯 numpy，全部可在浏览器内运行。',
    icon: '📐',
    color: '#22c55e',
    prerequisites: [],
    targetAudience: '想理解学习理论底层的人',
    estimatedHours: 8,
  },
  [...paperTheoryChapters, ...paperTheoryChapters2, ...paperTheoryChapters3, ...paperTheoryChapters4, ...paperTheoryChapters5],
);

export const paperFoundationCourse = build(
  {
    id: 'paper-foundation',
    domainId: 'paper',
    seriesId: 'paper-foundation',
    title: '基础与表征',
    subtitle: 'RNN 的惊人有效性',
    description:
      '从字符级语言模型出发，理解 RNN 如何自发学到语法、拼写与格式，深入梯度消失的数学根源（BPTT 连乘），掌握梯度裁剪、正交初始化、温度采样等实用技巧，以及从 RNN 到 LSTM 的演进逻辑。纯 numpy，可在浏览器内运行。',
    icon: '🧱',
    color: '#6366f1',
    prerequisites: [],
    targetAudience: '想理解序列建模起点的人',
    estimatedHours: 8,
  },
  [...paperFoundationChapters, ...paperFoundationChapters2, ...paperFoundationChapters3],
);

export const paperReasoningCourse = build(
  {
    id: 'paper-reasoning',
    domainId: 'paper',
    seriesId: 'paper-reasoning',
    title: '记忆与推理',
    subtitle: 'NTM 与结构化推理',
    description:
      '从神经图灵机（NTM）出发，理解如何给神经网络接上可微的外部记忆：内容寻址、位置寻址、可微读写。再延伸到指针网络、关系推理、关系 RNN 与消息传递——让网络具备结构化推理能力。配套可运行的 PyTorch 代码与交互图示。',
    icon: '🧠',
    color: '#f59e0b',
    prerequisites: [],
    targetAudience: '想理解"记忆"与"推理"如何被神经网络实现的人',
    estimatedHours: 8,
  },
  [...paperReasoningChapters, ...paperReasoningChapters2, ...paperReasoningChapters3, ...paperReasoningChapters4, ...paperReasoningChapters5, ...paperReasoningChapters6],
);

export const paperTrainingCourse = build(
  {
    id: 'paper-training',
    domainId: 'paper',
    seriesId: 'paper-training',
    title: '训练与规模',
    subtitle: 'Scaling Laws 与大规模训练',
    description:
      '从 Scaling Laws 出发，理解损失为何是规模的幂律函数、如何用 6ND 规划算力、Chinchilla 如何修正最优分配。再延伸到 GPipe 流水线并行、Deep Speech 2 的端到端训练、PPO 与 RLHF。配套可运行的 PyTorch 代码与交互图示。',
    icon: '⚙️',
    color: '#ec4899',
    prerequisites: [],
    targetAudience: '想理解大模型如何"训好训大"的人',
    estimatedHours: 8,
  },
  [...paperTrainingChapters, ...paperTrainingChapters2, ...paperTrainingChapters3, ...paperTrainingChapters4, ...paperTrainingChapters5, ...paperTrainingChapters6],
);

/** 论文导读系列 */
export const PAPER_COURSES = [
  paperFoundationCourse,
  paperTransformerCourse,
  paperVisionCourse,
  paperTheoryCourse,
  paperReasoningCourse,
  paperTrainingCourse,
];

/** AI 自动化系列（5 门子课程） */
export const AI_AUTO_COURSES = [
  aiAutoM1Course,
  aiAutoM2Course,
  aiAutoM3Course,
  aiAutoM4Course,
  aiAutoM5Course,
];

/** 数据挖掘系列（5 门子课程） */
export const MINING_COURSES = [
  miningPrepCourse,
  miningFreqCourse,
  miningClusterCourse,
  miningRecsysCourse,
  miningGraphCourse,
];

/** 大模型系列（9 门子课程），供首页与导航使用 */
export const LLM_COURSES = [
  deepLearningCourse,
  llmA1Course,
  llmA2Course,
  llmA3Course,
  llmA4Course,
  llmB1Course,
  llmB2Course,
  llmB3Course,
  llmA5Course,
  llmB4Course,
];

/* ══════════════════════════════════════════════════════════════════
   量化交易系列课程（10 门子课程）
   ══════════════════════════════════════════════════════════════════ */

export const quantMarketCourse = build(
  {
    id: 'quant-market',
    domainId: 'quant',
    seriesId: 'quant-market',
    title: '股票市场与投资基础',
    subtitle: '微观结构、双向拍卖撮合与订单簿动力学',
    description:
      '以 MIT 15.401 与 Larry Harris《Trading and Exchanges》为核心依据，系统讲解股票本质、限价单/市价单委托撮合、订单簿深度与滑点、离散与对数收益率的数学本质，为量化策略奠定坚实的底层微观基础。',
    icon: '📊',
    color: '#3b82f6',
    prerequisites: [],
    targetAudience: '量化交易初学者、金融工程与计算机专业学生',
    estimatedHours: 10,
  },
  quantMarketChapters,
);

export const quantMathCourse = build(
  {
    id: 'quant-math',
    domainId: 'quant',
    seriesId: 'quant-math',
    title: '金融数学与概率统计',
    subtitle: '厚尾分布、统计推断与时间序列平稳协整',
    description:
      '参考 MIT 18.S096 与 Ruey S. Tsay《Analysis of Financial Time Series》，透彻讲解连续复利、收益率厚尾与尖峰偏度检验（Jarque-Bera）、弱平稳性检验（ADF）及配对交易的数学基石——协整（Cointegration）。',
    icon: '📐',
    color: '#6366f1',
    prerequisites: ['quant-market'],
    targetAudience: '希望掌握量化金融数理底层的研究者',
    estimatedHours: 14,
  },
  quantMathChapters,
);

export const quantPythonCourse = build(
  {
    id: 'quant-python',
    domainId: 'quant',
    seriesId: 'quant-python',
    title: 'Python 量化编程',
    subtitle: 'NumPy 矩阵向量化加速与 Pandas 金融时序',
    description:
      '参考 UC Berkeley 数据科学体系与《Python for Finance》，彻底摒弃低效的 Python for 循环，掌握 NumPy 底层矩阵广播、Pandas DatetimeIndex 时间窗口操作、布林带等经典指标的高效向量化实现。',
    icon: '🐍',
    color: '#06b6d4',
    prerequisites: ['quant-market'],
    targetAudience: '需要掌握高性能金融数据处理的量化程序员',
    estimatedHours: 12,
  },
  quantPythonChapters,
);

export const quantDataCourse = build(
  {
    id: 'quant-data',
    domainId: 'quant',
    seriesId: 'quant-data',
    title: '金融数据获取与处理',
    subtitle: '除权除息复权算法、交易日历与四大致命偏差',
    description:
      '严格推导送股、转增与分红派息的除权基准价公式与前/后复权算法；深入剖析量化研究中导致回测虚假暴赚的四大致命偏差：幸存者偏差、前视偏差、时间戳偏差与样本选择偏差，建立清洗治理规范。',
    icon: '🗄️',
    color: '#0ea5e9',
    prerequisites: ['quant-python'],
    targetAudience: '负责量化底层数据清洗与特征构建的研发人员',
    estimatedHours: 12,
  },
  quantDataChapters,
);

export const quantStrategyCourse = build(
  {
    id: 'quant-strategy',
    domainId: 'quant',
    seriesId: 'quant-strategy',
    title: '量化策略与因子研究',
    subtitle: '趋势动量、海龟法则与多因子 Alpha 体系',
    description:
      '精讲海龟交易法则的唐奇安通道与 ATR 动态仓位管理；基于 Grinold & Kahn 主动管理基本定律（IR = IC * sqrt(BR)），系统讲解多因子 Alpha 体系：去极值、行业市值中性化、单因子 IC/Rank IC/IR 与多空分层单调性分析。',
    icon: '⚡',
    color: '#f59e0b',
    prerequisites: ['quant-data'],
    targetAudience: '量化策略研究员、Alpha 因子挖掘工程师',
    estimatedHours: 16,
  },
  quantStrategyChapters,
);

export const quantBacktestCourse = build(
  {
    id: 'quant-backtest',
    domainId: 'quant',
    seriesId: 'quant-backtest',
    title: '策略回测与绩效评估',
    subtitle: '事件驱动回测引擎、夏普比率与过拟合检验',
    description:
      '对比向量化回测与事件驱动回测引擎架构；严格推导年化收益率、最大回撤（MDD）、夏普比率（Sharpe）、索提诺比率（Sortino）与卡玛比率（Calmar）；基于 Bailey et al. (2014) 权威框架检验回测过拟合与数据窥探偏差。',
    icon: '🧪',
    color: '#ec4899',
    prerequisites: ['quant-strategy'],
    targetAudience: '策略评估、回测架构与量化风控人员',
    estimatedHours: 14,
  },
  quantBacktestChapters,
);

export const quantPortfolioCourse = build(
  {
    id: 'quant-portfolio',
    domainId: 'quant',
    seriesId: 'quant-portfolio',
    title: '投资组合与风险管理',
    subtitle: '马科维茨有效前沿、风险平价与 VaR/CVaR',
    description:
      '推导 Markowitz 均值-方差有效前沿二次规划；掌握桥水全天候策略背后的风险平价（Risk Parity / ERC）；依据巴塞尔协议 III 与现代风险测度公理，系统掌握参数法、历史模拟法在险价值（VaR）与条件在险价值（CVaR/Expected Shortfall）。',
    icon: '🛡️',
    color: '#8b5cf6',
    prerequisites: ['quant-backtest'],
    targetAudience: '投资组合经理、量化资产配置与风险管理专家',
    estimatedHours: 16,
  },
  quantPortfolioChapters,
);

export const quantMlCourse = build(
  {
    id: 'quant-ml',
    domainId: 'quant',
    seriesId: 'quant-ml',
    title: '机器学习与量化交易',
    subtitle: '三重屏障法、Purged K-Fold 与特征重要性',
    description:
      '基于 Marcos Lopez de Prado 权威著作《Advances in Financial Machine Learning》，讲透金融时序预测的特殊性：三重屏障动态标签化（Triple Barrier Method）、Purged & Embargoed K-Fold 防时序泄漏交叉验证、MDA 置换特征重要性评估。',
    icon: '🤖',
    color: '#14b8a6',
    prerequisites: ['quant-portfolio'],
    targetAudience: '金融机器学习工程师、AI 量化前沿研究员',
    estimatedHours: 18,
  },
  quantMlChapters,
);

export const quantLiveCourse = build(
  {
    id: 'quant-live',
    domainId: 'quant',
    seriesId: 'quant-live',
    title: '实盘交易系统',
    subtitle: '异步架构、TWAP/VWAP 算法执行与事前硬风控',
    description:
      '剖析机构级量化交易系统工程：行情网关、策略引擎、OMS 持仓轧差与 EMS 算法执行分层解耦；掌握 Almgren-Chriss 最优拆单算法（TWAP/VWAP）；构建包括防乌龙指、自成交限制、单日账户熔断在内的纳秒级事前硬风控防火墙。',
    icon: '⚙️',
    color: '#f97316',
    prerequisites: ['quant-backtest'],
    targetAudience: '量化交易开发工程师（C++/Python）、实盘运维人员',
    estimatedHours: 16,
  },
  quantLiveChapters,
);

export const quantProjectCourse = build(
  {
    id: 'quant-project',
    domainId: 'quant',
    seriesId: 'quant-project',
    title: '量化研究项目实战',
    subtitle: '端到端多因子实战、投委会报告与模拟跟踪',
    description:
      '融会贯通全套量化课程体系：遵循 MIT Sloan 与 UC Berkeley MFE 实践规范，完成从投资假设立项、全市场点时数据清洗、多因子 Alpha 挖掘与中性化、二次规划组合优化、严谨扣费回测、到机构级投委会立项答辩与模拟盘跟踪的完整大项目。',
    icon: '🏆',
    color: '#10b981',
    prerequisites: ['quant-ml', 'quant-live'],
    targetAudience: '准备冲击顶级量化对冲基金、券商自营的求职者与进阶交易员',
    estimatedHours: 20,
  },
  quantProjectChapters,
);

/** 量化交易系列（10 门子课程） */
export const QUANT_COURSES = [
  quantMarketCourse,
  quantMathCourse,
  quantPythonCourse,
  quantDataCourse,
  quantStrategyCourse,
  quantBacktestCourse,
  quantPortfolioCourse,
  quantMlCourse,
  quantLiveCourse,
  quantProjectCourse,
];
/* ─────────────── AI 原生软件工程 · CS146S 系列（11 门周课程） ───────────────
 *
 * 结构依据 Stanford CS146S Fall 2026 官方大纲（themodernsoftware.dev），
 * 内容为参照大纲自主编写的教材级扩展，来源与规格见 docs/cs146s-design.md。
 * 每门子课程对应官方一周（或毕业项目），一门 = 学习地图的一个站点，
 * 与 quant/llm/ai-auto 的拆分惯例一致；prerequisites 链式解锁。
 */

interface Cs146sWeekMeta {
  key: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  prerequisites: string[];
  estimatedHours: number;
}

const CS146S_WEEKS: Cs146sWeekMeta[] = [
  {
    key: 'w1',
    title: 'W1 · LLM 与 AI 编程基础',
    subtitle: 'AI 原生范式、LLM 机制与提示词工程',
    description:
      '课程的起点：建立 AI 原生软件工程的全景心智地图（意图-上下文-验证三角），拆开 LLM 黑盒（token、采样、概率输出），掌握五要素提示词工程与可量化的实验方法，识别长上下文四类失效模式，并完成官方作业同构的 Prompting Playground 实验。',
    icon: '🌱',
    color: '#8C1515',
    prerequisites: ['python-engineering-practices'],
    estimatedHours: 4,
  },
  {
    key: 'w2',
    title: 'W2 · Coding Agent 解剖学',
    subtitle: '执行循环、工具调用与 MCP 协议',
    description:
      '拆开编程智能体的黑盒：感知-规划-执行-反馈的 ReAct 循环、工具 schema 与调用机制、MCP 三角色协议与握手时序，并从零实现最小 MCP Server（官方作业同构）；项目 C 完成带权限管控的 MCP 集成（静态白名单→动态确认→审计日志）。',
    icon: '🤖',
    color: '#6366f1',
    prerequisites: ['cs146s-w1'],
    estimatedHours: 5,
  },
  {
    key: 'w3',
    title: 'W3 · AI IDE 与上下文工程',
    subtitle: '规范驱动开发与上下文架构',
    description:
      '官方标注的"最重要一周"：把上下文当作可工程的资产——规范驱动开发四层产物（PRD→Spec→Plan→Tasks）、写给 Agent 的 PRD 与机器可判验收标准、项目级指令文件（AGENTS.md）与 IDE 上下文供给机制，长上下文失效的工程对策；项目 B 为真实仓库完成规格与自动验收。',
    icon: '📐',
    color: '#0891b2',
    prerequisites: ['cs146s-w2'],
    estimatedHours: 5,
  },
  {
    key: 'w4',
    title: 'W4 · Coding Agent 协作模式',
    subtitle: '自治等级、Agent Manager 与项目 A',
    description:
      '建立人机分工决策框架：L0-L4 自治光谱的选择矩阵与升降级信号、Agent Manager 工作法（任务卡、里程碑验收）、Anthropic 四阶段最佳实践精读、多 Agent 拓扑与上下文隔离；项目 A 用纯 Python 实现简化版 Coding Agent（FakeLLM+沙箱工具+预算熔断+trace）。',
    icon: '🤝',
    color: '#7c5cff',
    prerequisites: ['cs146s-w3'],
    estimatedHours: 5,
  },
  {
    key: 'w5',
    title: 'W5 · 现代终端与 Agent 自动化',
    subtitle: 'AI CLI、无头 Agent 与工作流固化',
    description:
      '把终端变成 Agent 时代的驾驶舱：CLI 在 Agent 工作流中的独特地位、幂等脚本设计、无头 Agent 与退出码协议、工作流固化的成熟度阶梯（命令→脚本→Makefile→CI），以及自动化脚本的安全边界（命令审查、两阶段执行）。',
    icon: '⌨️',
    color: '#0ea5e9',
    prerequisites: ['cs146s-w4'],
    estimatedHours: 3,
  },
  {
    key: 'w6',
    title: 'W6 · AI 测试与安全',
    subtitle: '三源威胁模型、注入攻防与项目 D',
    description:
      '官方"最硬核的一周"：AI 生成代码的三源威胁模型（模型缺陷/依赖链/提示注入）、五类高发漏洞与 Semgrep 数据的正确解读、提示词注入到 RCE 的完整链路与通道隔离三件套、变异测试评估 AI 测试套件、权限与沙箱；项目 D 搭建五站安全流水线。',
    icon: '🛡️',
    color: '#8C1515',
    prerequisites: ['cs146s-w5'],
    estimatedHours: 5,
  },
  {
    key: 'w7',
    title: 'W7 · 代码审查与调试支持',
    subtitle: '六维审查、AI 调试与文档债',
    description:
      '对 AI 生成代码"信任但核实"：六维审查框架与带宽经济学、三遍读法与红线清单、AI 辅助调试的角色分配（人裁决假设）、文档生成与漂移检测，并把审查维度固化为项目 D 的收口升级（六维结构化输出 + schema 门卫）。',
    icon: '🔍',
    color: '#f59e0b',
    prerequisites: ['cs146s-w6'],
    estimatedHours: 4,
  },
  {
    key: 'w8',
    title: 'W8 · 自动化应用构建',
    subtitle: 'AI 全栈生成、多栈选型与端到端验收',
    description:
      '从"能跑的原型"到"能用的应用"：AI 全栈生成的能力地图与鸿沟清单、设计系统约束下的 UI 生成（design tokens 校验）、多栈选型决策矩阵、E2E 端到端验收与语义选择器策略，以及把原型补上生产三件套（错误边界/埋点/配置分离）。',
    icon: '🏗️',
    color: '#10b981',
    prerequisites: ['cs146s-w7'],
    estimatedHours: 3,
  },
  {
    key: 'w9',
    title: 'W9 · 部署后运维与可观测性',
    subtitle: '三大信号、AI 成本漂移与事件响应',
    description:
      '让 AI 构建的软件可被运营：可观测性三支柱（logs/metrics/traces）、AI 系统特有的 token 成本画像与质量漂移监测、SLO 与错误预算的告警设计、事件响应生命周期与 Agent 辅助分诊（含注入载荷拦截），并搭建最小运维原型作为毕业项目的仪表盘积木。',
    icon: '📡',
    color: '#0284c7',
    prerequisites: ['cs146s-w8'],
    estimatedHours: 3,
  },
  {
    key: 'w10',
    title: 'W10 · AI 软件工程的未来',
    subtitle: '角色演化、范式展望与预测的纪律',
    description:
      '带着全课程方法论透视未来：从岗位到能力组合的角色演化、从辅助编码到软件工厂的三条范式主线、结构化预测工具（可证伪表述/基线率思维/Brier 校准），以及结课后的 90 天行动计划。',
    icon: '🔮',
    color: '#6366f1',
    prerequisites: ['cs146s-w9'],
    estimatedHours: 2,
  },
  {
    key: 'final',
    title: '毕业项目 · Software Factory',
    subtitle: '可持续执行、验证与度量的软件工厂原型（项目 E）',
    description:
      '对应官方占分 80% 的 Final Project：综合全课程能力构建自动化软件工厂——任务队列（工单=项目 B 的 Spec）、执行单元（项目 A 的 Agent）、验证层（项目 D 的流水线）、度量层（W9 的运维原型），含工单 schema、编排循环、熔断降级与三指标改进闭环的完整实施规格。',
    icon: '🏭',
    color: '#8C1515',
    prerequisites: ['cs146s-w10'],
    estimatedHours: 6,
  },
];

export const CS146S_COURSES: Course[] = CS146S_WEEKS.map((meta) =>
  build(
    {
      id: `cs146s-${meta.key}`,
      domainId: 'ai-native',
      seriesId: `cs146s-${meta.key}`,
      title: meta.title,
      subtitle: meta.subtitle,
      description: meta.description,
      icon: meta.icon,
      color: meta.color,
      prerequisites: meta.prerequisites,
      targetAudience: '已会 Python/Git、想系统掌握 AI 原生工作流的工程师与高年级学生',
      estimatedHours: meta.estimatedHours,
    },
    cs146sWeeks[meta.key] ?? [],
  ),
);
