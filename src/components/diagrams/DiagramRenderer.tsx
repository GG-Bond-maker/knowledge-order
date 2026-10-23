/**
 * 交互式图示组件库
 *
 * 全部基于内联 SVG + CSS，零额外依赖，支持深浅色主题。
 * 在 Lesson 的 content 中通过自定义标记调用：
 *
 *   <Diagram type="arch" name="transformer-block" />
 *   <TensorFlow steps="(1,3,4)|(1,3,1)|broadcast" />
 *   <Heatmap name="attention-4x4" />
 *   <Slider name="softmax-temperature" />
 *
 * 内容渲染层会把这些标签替换成对应组件。
 */

import { useMemo, useState } from 'react';
import { SelfAttentionDemo, AttentionMathDemo, PositionalEncodingDemo, ActivationCompareDemo,
  FeatureEngineeringDemo, ThreeConditionsDemo, AlexNetArchDemo, ParamDistributionDemo,
  MDLTradeoffDemo, AICvsBICDemo, PolynomialMDLDemo,
  RNNUnrollDemo, VanishingGradientDemo, CharRNNTextDemo, TemperatureSamplingDemo,
  RNNvsLSTMDemo, LSTMCellDemo, ParamCompareDemo,
  DropoutInRNNDemo, LayerNormDemo, DropoutVariantsDemo,
  EntropyComplexityDemo, CompressionComplexityDemo, EncoderCompareDemo,
  WeightNoiseDemo, VariationalInferenceDemo,
  CoffeeModelCompareDemo, UniversalIntelligenceDemo, BenchmarkLimitationsDemo,
  DegradationDemo, ResidualBlockDemo, GradientFlowDemo, BottleneckCompareDemo,
  ShortcutTransformDemo, PreActDemo, DepthScalabilityDemo,
  ReceptiveFieldDemo, DilationVisualDemo, ExponentialGrowthDemo, ASPPDemo,
  FixedVectorBottleneckDemo, AlignmentDemo, BahdanauMathDemo, AttentionHeatmapDemo,
  TransformerArchDemo, ScaledDotProductDemo, MaskDemo, MultiHeadDemo,
  PositionalEncodingDemo2, EncoderDecoderDemo,
  NTMArchDemo, ContentAddressingDemo, LocationAddressingDemo, WriteOperationDemo,
  PointerProblemDemo, PointerMechanismDemo,
  RelationalTaskDemo, RelationNetworkDemo, SumAggregationDemo,
  LSTMMemoryLimitDemo, RMCArchDemo, MultiHeadMemoryDemo,
  MoleculeGraphDemo, MessagePassingDemo, PermutationInvarianceDemo, ReadoutDemo,
  ScalingLawDemo, LogLogDemo, ComputeAllocationDemo, ChinchillaDemo,
  PipelineBubbleDemo, PipelineScheduleDemo, RecomputeDemo,
  PolicyUpdateDemo, PPOClipDemo, ClipEffectDemo, GAEDemo,
  CTCDemo, CTCAlignmentDemo, CTCLossDemo, DeepSpeechArchDemo,
  PosteriorCollapseDemo, VLAEArchDemo,
  RewardHackingDemo, PreferenceLearningDemo, RLHFArchDemo, KLRegularizationDemo,
  SetOrderDemo, RandomShuffleDemo, ReadProcessWriteDemo,
  ConvDemo, OutputSizeDemo, ParamCountDemo, Im2colDemo, ReceptiveFieldDemo2,
  CoffeeSimulationDemo, RandomnessDemo, BubbleRatioDemo, BradleyTerryDemo,
  ResNetArchDemo, PreActArchDemo } from './PaperDiagrams';
import { RpaLayers, DocPipeline, ConfidenceRouting, WorkflowCanvas, PermissionMatrix,
  EvalLevels, TrajectoryEval, CostAttribution, DefenseLayers,
  CodeGenLevels, TestRepairLoop, MutationDemo, ReviewDimensions, FalsePositiveTradeoff, MapReduceSummary } from './AiAutoDiagrams';
import { ReactLoopDemo, MultiAgentTopology, StateMachineDemo, TokenFlow, AutomationSpectrum, ToolCallFlow, WorkflowPatterns, TraceWaterfall, InjectionAttack, AI_AUTO_DIAGRAMS } from './AiAutoDiagrams';
import { AprioriLattice, KMeansStep, PageRankFlow, MatrixHeat, PcaProjection, AnomalyScatter, MINING_DIAGRAMS } from './MiningDiagrams';
import { JoinDiagram, IndexDiagram, PivotDiagram, LrCurve, Flowchart, TreeView, DATA_DIAGRAMS } from './DataDiagrams';
import { OrderBookDepth, CandlestickAnatomy, TradeMatchingFlow, EquityDrawdownChart, PurgedCvTimeline, QUANT_DIAGRAMS } from './QuantDiagrams';
import { NeuronAnatomy, XorProblemVisualizer, BackpropCircuit, MlpTensorVisualizer, OptimizerTrajectoryVisualizer, RegularizationVisualizer, ConvKernelVisualizer, ResNetBlockVisualizer, RnnBpttVisualizer, LstmCellVisualizer, VaeLatentVisualizer, DiffusionFlowVisualizer, AttentionHeatmapVisualizer, TransformerBlockVisualizer, DEEP_LEARNING_DIAGRAMS } from './DeepLearningDiagrams';
import { VectorizationDemo, BroadcastDemo, ResampleDemo, RollingWindowDemo, MACDDemo, RSIDemo, VolumePriceDemo, VwapDemo, UnderwaterDemo,
  CompoundInterestDemo, FatTailDemo, CorrelationDemo, EfficientFrontierDemo, RiskParityDemo, VarCvarDemo } from './QuantDiagrams';
import { RAGPipelineDemo, ChunkingDemo, RetrievalCompareDemo } from './LlmDiagrams';
import { ComplexityGrowthDemo, TwoPointerDemo, BinarySearchDemo, LinkedListDemo, MonotonicStackDemo, HashTableDemo } from './AlgoDiagrams';
import { PythonMemoryDemo, PandasIndexDemo, MissingValueDemo, SqlJoinDemo, ChartTypeDemo, ABTestDemo, ExcelRefDemo, MetricTreeDemo } from './DataAnalysisDiagrams';
import { ImputeStrategyDemo, NormalizationDemo, FPTreeDemo, DBSCANDemo, CollaborativeFilteringDemo, StreamSketchDemo } from './MiningExtraDiagrams';
import {
  MdsArchDemo,
  KimballStarDemo,
  DbtLayersDemo,
  DbtMaterializationDemo,
  IncrementalWindowDemo,
  AirflowArchDemo,
  TaskLifecycleDemo,
  XComPassingDemo,
  TriggerRulesDemo,
  DataIntervalDemo,
  IdempotencyDemo,
  DynamicMappingDemo,
  AirflowDbtCosmosDemo,
  ScdType2Demo,
  DbtTestingDemo,
  SlimCiDemo,
  SemanticLayerDemo,
  DagStructureDemo,
  ExecutorCompareDemo,
  SlaMonitoringDemo,
} from './DataEngineeringDiagrams';
import './diagrams.css';

/* ══════════════════════════════════════════════
   1. 架构图：SVG 流程图，节点可 hover/点击高亮
   ══════════════════════════════════════════════ */

export interface ArchNode {
  id: string;
  label: string;
  /** 横向位置（0~1），纵向按数组顺序自动排布 */
  x?: number;
  desc?: string;
  color?: string;
  /** 是否为残差路径上的节点 */
  residual?: boolean;
}

export interface ArchDiagramSpec {
  title?: string;
  nodes: ArchNode[];
  /** 连线：from → to */
  edges: { from: string; to: string; label?: string; dashed?: boolean; curve?: 'left' | 'right' }[];
}

const ARCH_SPECS: Record<string, ArchDiagramSpec> = {
  'transformer-block': {
    title: 'Transformer Block 数据流',
    nodes: [
      { id: 'in', label: '输入 x', color: '#94a3b8' },
      { id: 'norm1', label: 'LayerNorm', color: '#38bdf8' },
      { id: 'mha', label: '多头自注意力', color: '#7c5cff', desc: '每个 token 与其他 token 交互，交换上下文信息' },
      { id: 'add1', label: '残差相加', color: '#f59e0b', residual: true, desc: 'x = x + Attention(Norm(x))' },
      { id: 'norm2', label: 'LayerNorm', color: '#38bdf8' },
      { id: 'ffn', label: 'FFN 前馈网络', color: '#22c55e', desc: '逐 token 独立计算，不跨 token 交互' },
      { id: 'add2', label: '残差相加', color: '#f59e0b', residual: true, desc: 'x = x + FFN(Norm(x))' },
      { id: 'out', label: '输出 x', color: '#94a3b8' },
    ],
    edges: [
      { from: 'in', to: 'norm1' },
      { from: 'norm1', to: 'mha' },
      { from: 'mha', to: 'add1' },
      { from: 'add1', to: 'norm2' },
      { from: 'norm2', to: 'ffn' },
      { from: 'ffn', to: 'add2' },
      { from: 'add2', to: 'out' },
      { from: 'in', to: 'add1', label: '残差', dashed: true, curve: 'left' },
      { from: 'add1', to: 'add2', label: '残差', dashed: true, curve: 'left' },
    ],
  },
  'self-attention': {
    title: '自注意力：Q / K / V 三角关系',
    nodes: [
      { id: 'x', label: '输入 X', color: '#94a3b8' },
      { id: 'q', label: 'Q 查询', color: '#2f6bff', desc: '「我在找什么」——当前 token 想获取的信息' },
      { id: 'k', label: 'K 键', color: '#22c55e', desc: '「我有什么」——每个 token 提供的索引' },
      { id: 'v', label: 'V 值', color: '#f59e0b', desc: '「我贡献什么」——实际被加权求和的内容' },
      { id: 'score', label: 'QKᵀ / √d', color: '#ec4899', desc: '点积衡量相关性，除以 √d 防止梯度消失' },
      { id: 'soft', label: 'softmax', color: '#7c5cff', desc: '把分数变成概率，每行和为 1' },
      { id: 'out', label: '加权求和 V', color: '#0891b2', desc: 'Attention(Q,K,V) = softmax(QKᵀ/√d)·V' },
    ],
    edges: [
      { from: 'x', to: 'q' },
      { from: 'x', to: 'k' },
      { from: 'x', to: 'v' },
      { from: 'q', to: 'score' },
      { from: 'k', to: 'score' },
      { from: 'score', to: 'soft' },
      { from: 'soft', to: 'out' },
      { from: 'v', to: 'out', dashed: true },
    ],
  },
  'llama-assembly': {
    title: 'LLaMA 相对 GPT-2 的零件替换',
    nodes: [
      { id: 'gpt', label: 'GPT-2 Block', color: '#94a3b8' },
      { id: 'n1', label: 'LayerNorm → RMSNorm', color: '#22c55e', desc: '去掉减均值与 β，只保留缩放，参数减半' },
      { id: 'n2', label: 'GELU → SwiGLU', color: '#f59e0b', desc: '门控激活，同等效果下参数量需重算' },
      { id: 'n3', label: '绝对位置 → RoPE', color: '#7c5cff', desc: '用旋转实现相对位置，支持长度外推' },
      { id: 'n4', label: 'MHA → GQA', color: '#ec4899', desc: '多个 Query 头共享一组 KV，KV Cache 大幅减少' },
      { id: 'llama', label: 'LLaMA Block', color: '#22c55e' },
    ],
    edges: [
      { from: 'gpt', to: 'n1' },
      { from: 'n1', to: 'n2' },
      { from: 'n2', to: 'n3' },
      { from: 'n3', to: 'n4' },
      { from: 'n4', to: 'llama' },
    ],
  },
  'moe-routing': {
    title: 'MoE：稀疏专家路由',
    nodes: [
      { id: 'token', label: '输入 token', color: '#94a3b8' },
      { id: 'gate', label: 'Gating 路由器', color: '#ec4899', desc: '对每个 token 计算各专家得分（通常 Top-1 或 Top-2）' },
      { id: 'e1', label: '专家 1', color: '#2f6bff' },
      { id: 'e2', label: '专家 2', color: '#22c55e' },
      { id: 'e3', label: '专家 3', color: '#f59e0b' },
      { id: 'e4', label: '专家 4 · 未被选中', color: '#cbd5e1', desc: '其余专家不参与计算——这就是「稀疏」' },
      { id: 'merge', label: '加权合并', color: '#0891b2' },
    ],
    edges: [
      { from: 'token', to: 'gate' },
      { from: 'gate', to: 'e1' },
      { from: 'gate', to: 'e2' },
      { from: 'gate', to: 'e3' },
      { from: 'gate', to: 'e4', dashed: true },
      { from: 'e1', to: 'merge' },
      { from: 'e2', to: 'merge' },
      { from: 'e3', to: 'merge' },
    ],
  },
  'rag-pipeline': {
    title: 'RAG 完整链路',
    nodes: [
      { id: 'doc', label: '文档', color: '#94a3b8' },
      { id: 'chunk', label: '① 切分 Chunking', color: '#2f6bff', desc: '按段落/语义切块，通常 200~1000 token，重叠 10%~20%' },
      { id: 'embed', label: '② 向量化 Embedding', color: '#7c5cff', desc: '把文本变成向量，语义相近的向量距离更近' },
      { id: 'store', label: '③ 向量库', color: '#0891b2' },
      { id: 'ret', label: '④ 检索 Retrieval', color: '#22c55e', desc: '向量 + BM25 混合召回 Top-50' },
      { id: 'rerank', label: '⑤ 重排 Rerank', color: '#f59e0b', desc: '交叉编码器精排取 Top-5' },
      { id: 'gen', label: '⑥ 生成', color: '#ec4899', desc: '把资料拼进提示词，要求基于资料作答并给出来源' },
    ],
    edges: [
      { from: 'doc', to: 'chunk' },
      { from: 'chunk', to: 'embed' },
      { from: 'embed', to: 'store' },
      { from: 'store', to: 'ret' },
      { from: 'ret', to: 'rerank' },
      { from: 'rerank', to: 'gen' },
    ],
  },
  'react-loop': {
    title: 'ReAct 循环',
    nodes: [
      { id: 'q', label: '用户问题', color: '#94a3b8' },
      { id: 'thought', label: 'Thought 思考', color: '#7c5cff', desc: '推理当前状态，决定下一步做什么' },
      { id: 'action', label: 'Action 行动', color: '#2f6bff', desc: '调用工具，由你的代码真正执行' },
      { id: 'obs', label: 'Observation 观察', color: '#22c55e', desc: '工具返回结果，回灌给模型' },
      { id: 'done', label: 'finish 完成', color: '#f59e0b' },
    ],
    edges: [
      { from: 'q', to: 'thought' },
      { from: 'thought', to: 'action' },
      { from: 'action', to: 'obs' },
      { from: 'obs', to: 'thought', label: '循环', dashed: true },
      { from: 'thought', to: 'done', label: '判断完成', dashed: true },
    ],
  },
  'kv-cache': {
    title: 'KV Cache：只算新 token',
    nodes: [
      { id: 's1', label: '第 1 步：算 1 个 token', color: '#22c55e' },
      { id: 's2', label: '第 2 步：复用缓存 + 算 1 个', color: '#38bdf8' },
      { id: 's3', label: '第 3 步：复用缓存 + 算 1 个', color: '#38bdf8' },
      { id: 'sn', label: '第 n 步：复用缓存 + 算 1 个', color: '#38bdf8' },
      { id: 'cmp', label: '总量 O(n²) → O(n)', color: '#f59e0b', desc: '无缓存时第 t 步要重算 t 个 token；有缓存只需算 1 个' },
    ],
    edges: [
      { from: 's1', to: 's2' },
      { from: 's2', to: 's3' },
      { from: 's3', to: 'sn' },
      { from: 'sn', to: 'cmp' },
    ],
  },
};

export function ArchDiagram({ name }: { name: string }) {
  const spec = ARCH_SPECS[name];
  const [active, setActive] = useState<string | null>(null);

  if (!spec) return <div className="diagram-missing">未找到架构图：{name}</div>;

  const nodes = spec.nodes;
  const rowH = 62;
  const width = 560;
  const height = nodes.length * rowH + 30;
  const cx = 200;

  const pos = new Map(nodes.map((n, i) => [n.id, { x: cx, y: 26 + i * rowH }]));

  return (
    <figure className="diagram-block">
      {spec.title && <figcaption className="diagram-title">{spec.title}</figcaption>}
      <svg viewBox={`0 0 ${width} ${height}`} className="diagram-svg" role="img" aria-label={spec.title}>
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="currentColor" opacity="0.55" />
          </marker>
        </defs>

        {/* 连线先画，避免覆盖节点 */}
        {spec.edges.map((e, i) => {
          const a = pos.get(e.from);
          const b = pos.get(e.to);
          if (!a || !b) return null;
          const isDashed = e.dashed;
          if (isDashed && e.curve === 'left') {
            // 残差旁路：从左侧绕行
            const x = cx - 150;
            return (
              <g key={i} className="diagram-edge dashed">
                <path
                  d={`M ${a.x - 62} ${a.y} L ${x} ${a.y} L ${x} ${b.y} L ${b.x - 62} ${b.y}`}
                  strokeDasharray="5 4"
                  markerEnd="url(#arrow)"
                />
                {e.label && (
                  <text x={x + 6} y={(a.y + b.y) / 2} className="diagram-edge-label">
                    {e.label}
                  </text>
                )}
              </g>
            );
          }
          return (
            <g key={i} className={`diagram-edge ${isDashed ? 'dashed' : ''}`}>
              <line
                x1={a.x}
                y1={a.y + 17}
                x2={b.x}
                y2={b.y - 17}
                strokeDasharray={isDashed ? '5 4' : undefined}
                markerEnd="url(#arrow)"
              />
              {e.label && (
                <text x={a.x + 10} y={(a.y + b.y) / 2 + 4} className="diagram-edge-label">
                  {e.label}
                </text>
              )}
            </g>
          );
        })}

        {/* 节点 */}
        {nodes.map((n) => {
          const p = pos.get(n.id)!;
          const isActive = active === n.id;
          return (
            <g
              key={n.id}
              className={`diagram-node ${isActive ? 'active' : ''}`}
              transform={`translate(${p.x - 62}, ${p.y - 17})`}
              onMouseEnter={() => n.desc && setActive(n.id)}
              onMouseLeave={() => setActive(null)}
              style={{ cursor: n.desc ? 'pointer' : 'default' }}
            >
              <rect width="124" height="34" rx="8" fill={n.color ?? '#64748b'} opacity={isActive ? 1 : 0.14} />
              <rect
                width="124"
                height="34"
                rx="8"
                fill="none"
                stroke={n.color ?? '#64748b'}
                strokeWidth={isActive ? 2.5 : 1.5}
                opacity={isActive ? 1 : 0.6}
              />
              <text x="62" y="22" textAnchor="middle" className="diagram-node-label" fill={n.color ?? '#475569'}>
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="diagram-caption">
        {active ? nodes.find((n) => n.id === active)?.desc : '把鼠标移到节点上查看说明'}
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   2. 张量形状流：彩色方块 + 箭头标注
   ══════════════════════════════════════════════ */

export function TensorFlow({ steps, note }: { steps: string; note?: string }) {
  const items = steps.split('|').map((s) => s.trim()).filter(Boolean);
  const palette = ['#2f6bff', '#7c5cff', '#0891b2', '#22c55e', '#f59e0b', '#ec4899', '#64748b'];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">张量形状变换</figcaption>
      <div className="tensor-flow">
        {items.map((s, i) => {
          const isOp = /^(broadcast|sum|mean|softmax|reshape|transpose|view|matmul|concat)/i.test(s);
          return (
            <div key={i} className="tensor-flow-item">
              <span
                className={`tensor-chip ${isOp ? 'op' : ''}`}
                style={isOp ? undefined : { borderColor: palette[i % palette.length], color: palette[i % palette.length] }}
              >
                {s}
              </span>
              {i < items.length - 1 && <span className="tensor-arrow">→</span>}
            </div>
          );
        })}
      </div>
      {note && <div className="diagram-caption">{note}</div>}
    </figure>
  );
}

/* ══════════════════════════════════════════════
   3. 热力图：注意力权重矩阵
   ══════════════════════════════════════════════ */

const HEATMAP_DATA: Record<string, { tokens: string[]; matrix: number[][] }> = {
  'attention-4x4': {
    tokens: ['猫', '吃', '鱼', '。'],
    matrix: [
      [0.55, 0.30, 0.10, 0.05],
      [0.20, 0.25, 0.50, 0.05],
      [0.40, 0.35, 0.20, 0.05],
      [0.15, 0.15, 0.30, 0.40],
    ],
  },
  'attention-causal': {
    tokens: ['The', 'cat', 'sat', 'on'],
    matrix: [
      [1.0, 0, 0, 0],
      [0.35, 0.65, 0, 0],
      [0.2, 0.35, 0.45, 0],
      [0.15, 0.25, 0.3, 0.3],
    ],
  },
};

export function Heatmap({ name }: { name: string }) {
  const data = HEATMAP_DATA[name];
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);
  if (!data) return <div className="diagram-missing">未找到热力图：{name}</div>;

  const n = data.tokens.length;
  const cell = 46;
  const labelW = 56;
  const w = labelW + n * cell;
  const h = labelW + n * cell;

  const colorFor = (v: number) => {
    // 从浅蓝到深蓝
    const t = Math.max(0, Math.min(1, v));
    const r = Math.round(239 - t * 200);
    const g = Math.round(246 - t * 140);
    const b = Math.round(255 - t * 40);
    return `rgb(${r},${g},${b})`;
  };

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">
        注意力权重矩阵（行 = 查询 token，列 = 被关注 token）
      </figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} className="diagram-svg" role="img" aria-label="注意力热力图">
        {data.tokens.map((t, i) => (
          <text key={`r${i}`} x={labelW - 10} y={labelW + i * cell + cell / 2 + 5} textAnchor="end" className="heatmap-label">
            {t}
          </text>
        ))}
        {data.tokens.map((t, j) => (
          <text key={`c${j}`} x={labelW + j * cell + cell / 2} y={labelW - 10} textAnchor="middle" className="heatmap-label">
            {t}
          </text>
        ))}
        {data.matrix.map((row, r) =>
          row.map((v, c) => {
            const isHover = hover?.r === r && hover?.c === c;
            return (
              <g key={`${r}-${c}`} onMouseEnter={() => setHover({ r, c })} onMouseLeave={() => setHover(null)}>
                <rect
                  x={labelW + c * cell}
                  y={labelW + r * cell}
                  width={cell - 3}
                  height={cell - 3}
                  rx="5"
                  fill={v === 0 ? '#f8fafc' : colorFor(v)}
                  stroke={isHover ? '#2f6bff' : 'transparent'}
                  strokeWidth="2"
                />
                <text
                  x={labelW + c * cell + (cell - 3) / 2}
                  y={labelW + r * cell + (cell - 3) / 2 + 4}
                  textAnchor="middle"
                  className="heatmap-value"
                  fill={v > 0.5 ? '#fff' : '#334155'}
                >
                  {v === 0 ? '—' : v.toFixed(2)}
                </text>
              </g>
            );
          }),
        )}
      </svg>
      <div className="diagram-caption">
        {hover
          ? `查询「${data.tokens[hover.r]}」对「${data.tokens[hover.c]}」的注意力权重 = ${data.matrix[hover.r][hover.c]}`
          : '把鼠标移到格子上查看具体权重；每行之和为 1（因果掩码行除外）'}
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   4. 参数滑块：实时计算演示
   ══════════════════════════════════════════════ */

interface SliderSpec {
  title: string;
  desc?: string;
  controls: { key: string; label: string; min: number; max: number; step: number; value: number; unit?: string }[];
  /** 根据参数计算结果与可视化数据 */
  compute: (v: Record<string, number>) => {
    text: string;
    bars?: { label: string; value: number }[];
    extra?: string;
  };
}

const SLIDER_SPECS: Record<string, SliderSpec> = {
  'softmax-temperature': {
    title: '温度对概率分布的影响',
    desc: '把 logits 除以温度 T 后做 softmax。T 越小分布越尖锐，越大越平坦。',
    controls: [
      { key: 'T', label: '温度 T', min: 0.1, max: 3, step: 0.1, value: 1.0 },
    ],
    compute: ({ T }) => {
      const logits = [3.0, 2.0, 1.5, 1.0, 0.2];
      const tokens = ['好', '不错', '热', '冷', '糟糕'];
      const scaled = logits.map((l) => l / T);
      const max = Math.max(...scaled);
      const exps = scaled.map((s) => Math.exp(s - max));
      const sum = exps.reduce((a, b) => a + b, 0);
      const probs = exps.map((e) => e / sum);
      const ppl = Math.exp(-probs.reduce((s, p, i) => s + p * Math.log(p + 1e-12), 0));
      return {
        text: `最大概率 ${(Math.max(...probs) * 100).toFixed(1)}%　分布熵对应困惑度 ${ppl.toFixed(2)}`,
        bars: probs.map((p, i) => ({ label: tokens[i], value: p })),
        extra: T < 0.5 ? '温度很低：几乎等价于贪心解码，输出高度确定但可能重复。' : T > 1.5 ? '温度很高：分布接近均匀，输出发散，可能出现不通顺的句子。' : '温度适中：兼顾确定性与多样性，适合通用对话。',
      };
    },
  },
  rmsnorm: {
    title: 'LayerNorm vs RMSNorm 手算',
    desc: '拖动滑块改变向量数值，实时对比两种归一化的输出。',
    controls: [
      { key: 'a', label: 'x₁', min: -5, max: 5, step: 0.5, value: 1 },
      { key: 'b', label: 'x₂', min: -5, max: 5, step: 0.5, value: 2 },
      { key: 'c', label: 'x₃', min: -5, max: 5, step: 0.5, value: 3 },
      { key: 'd', label: 'x₄', min: -5, max: 5, step: 0.5, value: 4 },
    ],
    compute: ({ a, b, c, d }) => {
      const x = [a, b, c, d];
      const mean = x.reduce((s, v) => s + v, 0) / 4;
      const variance = x.reduce((s, v) => s + (v - mean) ** 2, 0) / 4;
      const std = Math.sqrt(variance + 1e-6);
      const ln = x.map((v) => (v - mean) / std);
      const ms = x.reduce((s, v) => s + v * v, 0) / 4;
      const rms = Math.sqrt(ms + 1e-6);
      const rn = x.map((v) => v / rms);
      return {
        text: `LayerNorm 均值 μ=${mean.toFixed(2)}，标准差 σ=${std.toFixed(3)}；RMSNorm 均方根 RMS=${rms.toFixed(3)}`,
        bars: [
          { label: '原始 x', value: Math.max(...x.map(Math.abs)) },
          { label: 'LN[0]', value: Math.abs(ln[0]) },
          { label: 'RMSN[0]', value: Math.abs(rn[0]) },
        ],
        extra: `LayerNorm 输出 ≈ [${ln.map((v) => v.toFixed(2)).join(', ')}]\nRMSNorm 输出 ≈ [${rn.map((v) => v.toFixed(2)).join(', ')}]\n\n注意：LayerNorm 结果均值必为 0、方差为 1；RMSNorm 不减均值，所以向量整体"正偏"会被保留——这正是它省掉一半计算的原因。`,
      };
    },
  },
  'kv-cache-budget': {
    title: 'KV Cache 显存估算',
    desc: '调整层数、序列长度与 KV 头数，看看长上下文推理到底吃掉多少显存。',
    controls: [
      { key: 'layers', label: '层数', min: 8, max: 80, step: 4, value: 32 },
      { key: 'seq', label: '序列长度', min: 512, max: 32768, step: 512, value: 4096 },
      { key: 'kvHeads', label: 'KV 头数', min: 1, max: 32, step: 1, value: 32 },
    ],
    compute: ({ layers, seq, kvHeads }) => {
      const headDim = 128;
      const bytes = 2;
      const gb = (2 * layers * seq * kvHeads * headDim * bytes) / 1024 ** 3;
      const mha = (2 * layers * seq * 32 * headDim * bytes) / 1024 ** 3;
      return {
        text: `KV Cache ≈ ${gb.toFixed(2)} GB（单请求）`,
        bars: [
          { label: '当前配置', value: gb },
          { label: 'MHA(32头)', value: mha },
        ],
        extra: `公式：2 × 层数 × 序列长度 × KV头数 × 头维度 × 精度字节 / 1024³\n\n头维度按 ${headDim}、fp16（2 字节）计算。\n把 KV 头数从 32 降到 8（GQA），显存直接降到 ${(gb / 4).toFixed(2)} GB——这就是长上下文模型普遍采用 GQA 的原因。`,
      };
    },
  },
};

export function Slider({ name }: { name: string }) {
  const spec = SLIDER_SPECS[name];
  const initial = useMemo(
    () => Object.fromEntries((spec?.controls ?? []).map((c) => [c.key, c.value])),
    [spec],
  );
  const [values, setValues] = useState<Record<string, number>>(initial);

  if (!spec) return <div className="diagram-missing">未找到交互演示：{name}</div>;

  const result = spec.compute(values);
  const maxBar = Math.max(0.0001, ...(result.bars ?? []).map((b) => b.value));

  return (
    <figure className="diagram-block interactive">
      <figcaption className="diagram-title">
        <span className="interactive-badge">可交互</span>
        {spec.title}
      </figcaption>
      {spec.desc && <div className="diagram-desc">{spec.desc}</div>}

      <div className="slider-controls">
        {spec.controls.map((c) => (
          <label key={c.key} className="slider-row">
            <span className="slider-label">
              {c.label}
              <b>
                {values[c.key]}
                {c.unit ?? ''}
              </b>
            </span>
            <input
              type="range"
              min={c.min}
              max={c.max}
              step={c.step}
              value={values[c.key]}
              onChange={(e) => setValues((v) => ({ ...v, [c.key]: Number(e.target.value) }))}
            />
          </label>
        ))}
      </div>

      <div className="slider-output">{result.text}</div>

      {result.bars && (
        <div className="slider-bars">
          {result.bars.map((b) => (
            <div key={b.label} className="slider-bar-row">
              <span className="slider-bar-label">{b.label}</span>
              <div className="slider-bar">
                <div style={{ width: `${(b.value / maxBar) * 100}%` }} />
              </div>
              <span className="slider-bar-value">{b.value.toFixed(b.value < 10 ? 3 : 2)}</span>
            </div>
          ))}
        </div>
      )}

      {result.extra && <pre className="slider-extra">{result.extra}</pre>}
    </figure>
  );
}

/* ══════════════════════════════════════════════
   5. 统一入口：根据类型渲染
   ══════════════════════════════════════════════ */

export type DiagramKind =
  | 'arch'
  | 'tensor'
  | 'heatmap'
  | 'slider'
  | 'join'
  | 'index'
  | 'pivot'
  | 'lr'
  | 'flow'
  | 'tree'
  | 'apriori'
  | 'kmeans'
  | 'pagerank'
  | 'matrix'
  | 'pca'
  | 'anomaly'
  | 'react'
  | 'token'
  | 'spectrum'
  | 'toolflow'
  | 'patterns'
  | 'trace'
  | 'injection'
  | 'multiagent'
  | 'statemachine'
  | 'rpalayers'
  | 'docpipeline'
  | 'confrouting'
  | 'workflowcanvas'
  | 'permmatrix'
  | 'evallevels'
  | 'trajectory'
  | 'costattr'
  | 'defense'
  | 'codegenlevels'
  | 'testrepair'
  | 'mutation'
  | 'reviewdims'
  | 'fptradeoff'
  | 'mapreduce'
  | 'orderbook'
  | 'candlestick'
  | 'matchingflow'
  | 'equitycurve'
  | 'purgedcv'
  | 'neuron'
  | 'xor'
  | 'backprop'
  | 'mlpshape'
  | 'optimizer'
  | 'regularizer'
  | 'conv2d'
  | 'resnet'
  | 'rnn-bptt'
  | 'lstm-cell'
  | 'vae-latent'
  | 'diffusion-flow'
  | 'attention-heatmap'
  | 'transformer-arch'
  | 'selfattn'
  | 'attnmath'
  | 'posenc'
  | 'activation'
  | 'feateng'
  | 'threecond'
  | 'alexnet'
  | 'paramdist'
  | 'mdltrade'
  | 'aicbic'
  | 'polymdl'
  | 'rnnunroll'
  | 'vanishgrad'
  | 'charrnn'
  | 'tempprobe'
  | 'rnnvslstm'
  | 'lstmcell'
  | 'paramcmp'
  | 'dropoutrnn'
  | 'layernorm'
  | 'dropoutvar'
  | 'entcomp'
  | 'compcplx'
  | 'encoders'
  | 'weightnoise'
  | 'vardemo'
  | 'coffeemodel'
  | 'uim'
  | 'benchlimits'
  | 'degradation'
  | 'resblock'
  | 'gradflow'
  | 'bottleneck'
  | 'shortcut'
  | 'preact'
  | 'depthscale'
  | 'receptivefield'
  | 'dilationvis'
  | 'expgrowth'
  | 'aspp'
  | 'bottleneck2'
  | 'alignment'
  | 'bahdanau'
  | 'attnheatmap'
  | 'tarch'
  | 'sdp'
  | 'maskdemo'
  | 'multihead'
  | 'posenc2'
  | 'encdec'
  | 'ntmarch'
  | 'contentaddr'
  | 'locaddr'
  | 'writeop'
  | 'ptrproblem'
  | 'ptrmech'
  | 'reltask'
  | 'relnet'
  | 'sumagg'
  | 'lstmlimit'
  | 'rmcarch'
  | 'mhmemory'
  | 'molgraph'
  | 'msgpass'
  | 'permvar'
  | 'readout'
  | 'scalinglaw'
  | 'loglog'
  | 'computealloc'
  | 'chinchilla'
  | 'pipebubble'
  | 'pipesched'
  | 'recompute'
  | 'policyupdate'
  | 'ppoclip'
  | 'clipeffect'
  | 'gae'
  | 'ctc'
  | 'ctcalign'
  | 'ctcloss'
  | 'ds2arch'
  | 'postcollapse'
  | 'vlaearch'
  | 'rewardhack'
  | 'preflearn'
  | 'rlhfarch'
  | 'klreg'
  | 'setorder'
  | 'rsshuffle'
  | 'rpw'
  | 'convdemo'
  | 'outsize'
  | 'paramcount'
  | 'im2col'
  | 'rf2'
  | 'coffeesim'
  | 'randomness'
  | 'bubbleratio'
  | 'bradleyterry'
  | 'resnetarch'
  | 'preactarch'
  | 'vecspeed'
  | 'broadcast'
  | 'resample'
  | 'rolling'
  | 'macd'
  | 'rsi'
  | 'volumeprice'
  | 'vwap'
  | 'underwater'
  | 'compound'
  | 'fattail'
  | 'correlation'
  | 'frontier'
  | 'riskparity'
  | 'varcvar'
  | 'ragpipe'
  | 'chunking'
  | 'retrieval'
  | 'cxgrowth'
  | 'twopointer'
  | 'binsearch'
  | 'linkedlist'
  | 'monostack'
  | 'hashtable'
  | 'pymemory'
  | 'pdindex'
  | 'missing'
  | 'sqljoin'
  | 'charttype'
  | 'abtest'
  | 'excelref'
  | 'metrictree'
  | 'impute'
  | 'normscale'
  | 'fptree'
  | 'dbscan'
  | 'cf'
  | 'streamsketch'
  | 'mds-arch'
  | 'kimball-star'
  | 'dbt-layers'
  | 'dbt-materialization'
  | 'incremental-window'
  | 'airflow-arch'
  | 'task-lifecycle'
  | 'xcom-passing'
  | 'trigger-rules'
  | 'data-interval'
  | 'idempotency'
  | 'dynamic-mapping'
  | 'airflow-dbt-cosmos'
  | 'scd-type2'
  | 'dbt-testing'
  | 'slim-ci'
  | 'semantic-layer'
  | 'dag-structure'
  | 'executor-compare'
  | 'sla-monitoring';

export function DiagramRenderer({ kind, name, steps, note }: { kind: DiagramKind; name?: string; steps?: string; note?: string }) {
  switch (kind) {
    case 'arch':
      return <ArchDiagram name={name ?? ''} />;
    case 'tensor':
      return <TensorFlow steps={steps ?? ''} note={note} />;
    case 'heatmap':
      return <Heatmap name={name ?? ''} />;
    case 'slider':
      return <Slider name={name ?? ''} />;
    case 'join':
      return <JoinDiagram kind={name ?? 'inner'} />;
    case 'index':
      return <IndexDiagram kind={name ?? 'loc'} />;
    case 'pivot':
      return <PivotDiagram />;
    case 'lr':
      return <LrCurve name={name ?? 'cosine'} />;
    case 'flow':
      return <Flowchart name={name ?? ''} />;
    case 'tree':
      return <TreeView name={name ?? ''} />;
    case 'apriori':
      return <AprioriLattice />;
    case 'kmeans':
      return <KMeansStep />;
    case 'pagerank':
      return <PageRankFlow />;
    case 'matrix':
      return <MatrixHeat />;
    case 'pca':
      return <PcaProjection />;
    case 'anomaly':
      return <AnomalyScatter />;
    case 'react':
      return <ReactLoopDemo />;
    case 'token':
      return <TokenFlow />;
    case 'spectrum':
      return <AutomationSpectrum />;
    case 'toolflow':
      return <ToolCallFlow />;
    case 'patterns':
      return <WorkflowPatterns />;
    case 'trace':
      return <TraceWaterfall />;
    case 'injection':
      return <InjectionAttack />;
    case 'multiagent':
      return <MultiAgentTopology />;
    case 'statemachine':
      return <StateMachineDemo />;
    case 'rpalayers':
      return <RpaLayers />;
    case 'docpipeline':
      return <DocPipeline />;
    case 'confrouting':
      return <ConfidenceRouting />;
    case 'workflowcanvas':
      return <WorkflowCanvas />;
    case 'permmatrix':
      return <PermissionMatrix />;
    case 'evallevels':
      return <EvalLevels />;
    case 'trajectory':
      return <TrajectoryEval />;
    case 'costattr':
      return <CostAttribution />;
    case 'defense':
      return <DefenseLayers />;
    case 'codegenlevels':
      return <CodeGenLevels />;
    case 'testrepair':
      return <TestRepairLoop />;
    case 'mutation':
      return <MutationDemo />;
    case 'reviewdims':
      return <ReviewDimensions />;
    case 'fptradeoff':
      return <FalsePositiveTradeoff />;
    case 'mapreduce':
      return <MapReduceSummary />;
    case 'selfattn':
      return <SelfAttentionDemo />;
    case 'attnmath':
      return <BahdanauMathDemo />;
    case 'posenc':
      return <PositionalEncodingDemo />;
    case 'activation':
      return <ActivationCompareDemo />;
    case 'feateng':
      return <FeatureEngineeringDemo />;
    case 'threecond':
      return <ThreeConditionsDemo />;
    case 'alexnet':
      return <AlexNetArchDemo />;
    case 'paramdist':
      return <ParamDistributionDemo />;
    case 'mdltrade':
      return <MDLTradeoffDemo />;
    case 'aicbic':
      return <AICvsBICDemo />;
    case 'polymdl':
      return <PolynomialMDLDemo />;
    case 'rnnunroll':
      return <RNNUnrollDemo />;
    case 'vanishgrad':
      return <VanishingGradientDemo />;
    case 'charrnn':
      return <CharRNNTextDemo />;
    case 'tempprobe':
      return <TemperatureSamplingDemo />;
    case 'rnnvslstm':
      return <RNNvsLSTMDemo />;
    case 'lstmcell':
      return <LSTMCellDemo />;
    case 'paramcmp':
      return <ParamCompareDemo />;
    case 'dropoutrnn':
      return <DropoutInRNNDemo />;
    case 'layernorm':
      return <LayerNormDemo />;
    case 'dropoutvar':
      return <DropoutVariantsDemo />;
    case 'entcomp':
      return <EntropyComplexityDemo />;
    case 'compcplx':
      return <CompressionComplexityDemo />;
    case 'encoders':
      return <EncoderCompareDemo />;
    case 'weightnoise':
      return <WeightNoiseDemo />;
    case 'vardemo':
      return <VariationalInferenceDemo />;
    case 'coffeemodel':
      return <CoffeeModelCompareDemo />;
    case 'uim':
      return <UniversalIntelligenceDemo />;
    case 'benchlimits':
      return <BenchmarkLimitationsDemo />;
    case 'degradation':
      return <DegradationDemo />;
    case 'resblock':
      return <ResidualBlockDemo />;
    case 'gradflow':
      return <GradientFlowDemo />;
    case 'bottleneck':
      return <BottleneckCompareDemo />;
    case 'shortcut':
      return <ShortcutTransformDemo />;
    case 'preact':
      return <PreActDemo />;
    case 'depthscale':
      return <DepthScalabilityDemo />;
    case 'receptivefield':
      return <ReceptiveFieldDemo />;
    case 'dilationvis':
      return <DilationVisualDemo />;
    case 'expgrowth':
      return <ExponentialGrowthDemo />;
    case 'aspp':
      return <ASPPDemo />;
    case 'bottleneck2':
      return <FixedVectorBottleneckDemo />;
    case 'alignment':
      return <AlignmentDemo />;
    case 'bahdanau':
      return <BahdanauMathDemo />;
    case 'attnheatmap':
      return <AttentionHeatmapDemo />;
    case 'tarch':
      return <TransformerArchDemo />;
    case 'sdp':
      return <ScaledDotProductDemo />;
    case 'maskdemo':
      return <MaskDemo />;
    case 'multihead':
      return <MultiHeadDemo />;
    case 'posenc2':
      return <PositionalEncodingDemo2 />;
    case 'encdec':
      return <EncoderDecoderDemo />;
    case 'ntmarch':
      return <NTMArchDemo />;
    case 'contentaddr':
      return <ContentAddressingDemo />;
    case 'locaddr':
      return <LocationAddressingDemo />;
    case 'writeop':
      return <WriteOperationDemo />;
    case 'ptrproblem':
      return <PointerProblemDemo />;
    case 'ptrmech':
      return <PointerMechanismDemo />;
    case 'reltask':
      return <RelationalTaskDemo />;
    case 'relnet':
      return <RelationNetworkDemo />;
    case 'sumagg':
      return <SumAggregationDemo />;
    case 'lstmlimit':
      return <LSTMMemoryLimitDemo />;
    case 'rmcarch':
      return <RMCArchDemo />;
    case 'mhmemory':
      return <MultiHeadMemoryDemo />;
    case 'molgraph':
      return <MoleculeGraphDemo />;
    case 'msgpass':
      return <MessagePassingDemo />;
    case 'permvar':
      return <PermutationInvarianceDemo />;
    case 'readout':
      return <ReadoutDemo />;
    case 'scalinglaw':
      return <ScalingLawDemo />;
    case 'loglog':
      return <LogLogDemo />;
    case 'computealloc':
      return <ComputeAllocationDemo />;
    case 'chinchilla':
      return <ChinchillaDemo />;
    case 'pipebubble':
      return <PipelineBubbleDemo />;
    case 'pipesched':
      return <PipelineScheduleDemo />;
    case 'recompute':
      return <RecomputeDemo />;
    case 'policyupdate':
      return <PolicyUpdateDemo />;
    case 'ppoclip':
      return <PPOClipDemo />;
    case 'clipeffect':
      return <ClipEffectDemo />;
    case 'gae':
      return <GAEDemo />;
    case 'ctc':
      return <CTCDemo />;
    case 'ctcalign':
      return <CTCAlignmentDemo />;
    case 'ctcloss':
      return <CTCLossDemo />;
    case 'ds2arch':
      return <DeepSpeechArchDemo />;
    case 'postcollapse':
      return <PosteriorCollapseDemo />;
    case 'vlaearch':
      return <VLAEArchDemo />;
    case 'rewardhack':
      return <RewardHackingDemo />;
    case 'preflearn':
      return <PreferenceLearningDemo />;
    case 'rlhfarch':
      return <RLHFArchDemo />;
    case 'klreg':
      return <KLRegularizationDemo />;
    case 'setorder':
      return <SetOrderDemo />;
    case 'rsshuffle':
      return <RandomShuffleDemo />;
    case 'rpw':
      return <ReadProcessWriteDemo />;
    case 'convdemo':
      return <ConvDemo />;
    case 'outsize':
      return <OutputSizeDemo />;
    case 'paramcount':
      return <ParamCountDemo />;
    case 'im2col':
      return <Im2colDemo />;
    case 'rf2':
      return <ReceptiveFieldDemo2 />;
    case 'coffeesim':
      return <CoffeeSimulationDemo />;
    case 'randomness':
      return <RandomnessDemo />;
    case 'bubbleratio':
      return <BubbleRatioDemo />;
    case 'bradleyterry':
      return <BradleyTerryDemo />;
    case 'resnetarch':
      return <ResNetArchDemo />;
    case 'preactarch':
      return <PreActArchDemo />;
    case 'vecspeed':
      return <VectorizationDemo />;
    case 'broadcast':
      return <BroadcastDemo />;
    case 'resample':
      return <ResampleDemo />;
    case 'rolling':
      return <RollingWindowDemo />;
    case 'macd':
      return <MACDDemo />;
    case 'rsi':
      return <RSIDemo />;
    case 'volumeprice':
      return <VolumePriceDemo />;
    case 'vwap':
      return <VwapDemo />;
    case 'underwater':
      return <UnderwaterDemo />;
    case 'compound':
      return <CompoundInterestDemo />;
    case 'fattail':
      return <FatTailDemo />;
    case 'correlation':
      return <CorrelationDemo />;
    case 'frontier':
      return <EfficientFrontierDemo />;
    case 'riskparity':
      return <RiskParityDemo />;
    case 'varcvar':
      return <VarCvarDemo />;
    case 'ragpipe':
      return <RAGPipelineDemo />;
    case 'chunking':
      return <ChunkingDemo />;
    case 'retrieval':
      return <RetrievalCompareDemo />;
    case 'cxgrowth':
      return <ComplexityGrowthDemo />;
    case 'twopointer':
      return <TwoPointerDemo />;
    case 'binsearch':
      return <BinarySearchDemo />;
    case 'linkedlist':
      return <LinkedListDemo />;
    case 'monostack':
      return <MonotonicStackDemo />;
    case 'hashtable':
      return <HashTableDemo />;
    case 'pymemory':
      return <PythonMemoryDemo />;
    case 'pdindex':
      return <PandasIndexDemo />;
    case 'missing':
      return <MissingValueDemo />;
    case 'sqljoin':
      return <SqlJoinDemo />;
    case 'charttype':
      return <ChartTypeDemo />;
    case 'abtest':
      return <ABTestDemo />;
    case 'excelref':
      return <ExcelRefDemo />;
    case 'metrictree':
      return <MetricTreeDemo />;
    case 'impute':
      return <ImputeStrategyDemo />;
    case 'normscale':
      return <NormalizationDemo />;
    case 'fptree':
      return <FPTreeDemo />;
    case 'dbscan':
      return <DBSCANDemo />;
    case 'cf':
      return <CollaborativeFilteringDemo />;
    case 'streamsketch':
      return <StreamSketchDemo />;
    case 'mds-arch':
      return <MdsArchDemo />;
    case 'kimball-star':
      return <KimballStarDemo />;
    case 'dbt-layers':
      return <DbtLayersDemo />;
    case 'dbt-materialization':
      return <DbtMaterializationDemo />;
    case 'incremental-window':
      return <IncrementalWindowDemo />;
    case 'airflow-arch':
      return <AirflowArchDemo />;
    case 'task-lifecycle':
      return <TaskLifecycleDemo />;
    case 'xcom-passing':
      return <XComPassingDemo />;
    case 'trigger-rules':
      return <TriggerRulesDemo />;
    case 'data-interval':
      return <DataIntervalDemo />;
    case 'idempotency':
      return <IdempotencyDemo />;
    case 'dynamic-mapping':
      return <DynamicMappingDemo />;
    case 'airflow-dbt-cosmos':
      return <AirflowDbtCosmosDemo />;
    case 'scd-type2':
      return <ScdType2Demo />;
    case 'dbt-testing':
      return <DbtTestingDemo />;
    case 'slim-ci':
      return <SlimCiDemo />;
    case 'semantic-layer':
      return <SemanticLayerDemo />;
    case 'dag-structure':
      return <DagStructureDemo />;
    case 'executor-compare':
      return <ExecutorCompareDemo />;
    case 'sla-monitoring':
      return <SlaMonitoringDemo />;

    case 'orderbook':
      return <OrderBookDepth />;
    case 'candlestick':
      return <CandlestickAnatomy />;
    case 'matchingflow':
      return <TradeMatchingFlow />;
    case 'equitycurve':
      return <EquityDrawdownChart />;
    case 'purgedcv':
      return <PurgedCvTimeline />;
    case 'neuron':
      return <NeuronAnatomy />;
    case 'xor':
      return <XorProblemVisualizer />;
    case 'backprop':
      return <BackpropCircuit />;
    case 'mlpshape':
      return <MlpTensorVisualizer />;
    case 'optimizer':
      return <OptimizerTrajectoryVisualizer />;
    case 'regularizer':
      return <RegularizationVisualizer />;
    case 'conv2d':
      return <ConvKernelVisualizer />;
    case 'resnet':
      return <ResNetBlockVisualizer />;
    case 'rnn-bptt':
      return <RnnBpttVisualizer />;
    case 'lstm-cell':
      return <LstmCellVisualizer />;
    case 'vae-latent':
      return <VaeLatentVisualizer />;
    case 'diffusion-flow':
      return <DiffusionFlowVisualizer />;
    case 'attention-heatmap':
      return <AttentionHeatmapVisualizer />;
    case 'transformer-arch':
      return <TransformerBlockVisualizer />;

    default:
      return null;
  }
}

/** 供内容校验使用：已注册的图示名称 */
export const REGISTERED_DIAGRAMS = {
  arch: Object.keys(ARCH_SPECS),
  heatmap: Object.keys(HEATMAP_DATA),
  slider: Object.keys(SLIDER_SPECS),
  join: DATA_DIAGRAMS.join,
  index: DATA_DIAGRAMS.index,
  flow: DATA_DIAGRAMS.flow,
  tree: DATA_DIAGRAMS.tree,
  lr: DATA_DIAGRAMS.lr,
  apriori: MINING_DIAGRAMS.apriori,
  kmeans: MINING_DIAGRAMS.kmeans,
  pagerank: MINING_DIAGRAMS.pagerank,
  matrix: MINING_DIAGRAMS.matrix,
  pca: MINING_DIAGRAMS.pca,
  anomaly: MINING_DIAGRAMS.anomaly,
  react: AI_AUTO_DIAGRAMS.react,
  token: AI_AUTO_DIAGRAMS.token,
  spectrum: AI_AUTO_DIAGRAMS.spectrum,
  toolflow: AI_AUTO_DIAGRAMS.toolflow,
  patterns: AI_AUTO_DIAGRAMS.patterns,
  trace: AI_AUTO_DIAGRAMS.trace,
  injection: AI_AUTO_DIAGRAMS.injection,
  orderbook: ['orderbook'],
  candlestick: ['candlestick'],
  matchingflow: ['matchingflow'],
  equitycurve: ['equitycurve'],
  purgedcv: ['purgedcv'],
  neuron: ['neuron'],
  xor: ['xor'],
  backprop: ['backprop'],
  mlpshape: ['mlpshape'],
  optimizer: ['optimizer'],
  regularizer: ['regularizer'],
  conv2d: ['conv2d'],
  resnet: ['resnet'],
  'rnn-bptt': ['rnn-bptt'],
  'lstm-cell': ['lstm-cell'],
  'vae-latent': ['vae-latent'],
  'diffusion-flow': ['diffusion-flow'],
  'attention-heatmap': ['attention-heatmap'],
  'transformer-arch': ['transformer-arch'],
  'mds-arch': ['mds-arch'],
  'kimball-star': ['kimball-star'],
  'dbt-layers': ['dbt-layers'],
  'dbt-materialization': ['dbt-materialization'],
  'incremental-window': ['incremental-window'],
  'airflow-arch': ['airflow-arch'],
  'task-lifecycle': ['task-lifecycle'],
  'xcom-passing': ['xcom-passing'],
  'trigger-rules': ['trigger-rules'],
  'data-interval': ['data-interval'],
  'idempotency': ['idempotency'],
  'dynamic-mapping': ['dynamic-mapping'],
  'airflow-dbt-cosmos': ['airflow-dbt-cosmos'],
  'scd-type2': ['scd-type2'],
  'dbt-testing': ['dbt-testing'],
  'slim-ci': ['slim-ci'],
  'semantic-layer': ['semantic-layer'],
  'dag-structure': ['dag-structure'],
  'executor-compare': ['executor-compare'],
  'sla-monitoring': ['sla-monitoring'],
};
