/**
 * 轻量 Markdown 渲染器（零依赖）。
 *
 * 支持：标题、段落、无序/有序列表、行内代码、加粗/斜体/删除线、
 * 代码块（含语言标记）、表格、引用块、分割线、行内链接、换行。
 * 输出 React 节点（不走 dangerouslySetInnerHTML，天然防 XSS）。
 */

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { DiagramRenderer, type DiagramKind } from './diagrams/DiagramRenderer';
import './markdown.css';

interface MdProps {
  text: string;
  className?: string;
}

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'code'; lang?: string; code: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'table'; header: string[]; rows: string[][] }
  | { type: 'hr' }
  | { type: 'math'; math: string }
  | { type: 'diagram'; kind: DiagramKind; name?: string; steps?: string; note?: string };

function renderKatex(math: string, displayMode: boolean): string {
  try {
    return katex.renderToString(math.trim(), {
      displayMode,
      throwOnError: false,
    });
  } catch {
    return math;
  }
}

/**
 * 解析图示标签：
 *   <Diagram type="arch" name="transformer-block" />
 *   <TensorFlow steps="(1,3,4)|(1,3,1)|broadcast" />
 *   <Heatmap name="attention-4x4" />
 *   <Slider name="softmax-temperature" />
 */
function parseDiagramTag(line: string): Block | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('<') || !trimmed.endsWith('/>')) return null;

  const tagMatch = trimmed.match(/^<(\w+)\s+([\s\S]*?)\s*\/>$/);
  if (!tagMatch) return null;

  const [, tag, attrStr] = tagMatch;
  const attrs: Record<string, string> = {};
  const attrPattern = /(\w+)\s*=\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = attrPattern.exec(attrStr)) !== null) {
    attrs[m[1]] = m[2];
  }

  if (tag === 'Diagram') {
    const kind = (attrs.type ?? '') as DiagramKind;
    if (!['arch', 'tensor', 'heatmap', 'slider', 'join', 'index', 'pivot', 'lr', 'flow', 'tree', 'apriori', 'kmeans', 'pagerank', 'matrix', 'pca', 'anomaly', 'react', 'token', 'spectrum', 'toolflow', 'patterns', 'trace', 'injection', 'multiagent', 'statemachine', 'rpalayers', 'docpipeline', 'confrouting', 'workflowcanvas', 'permmatrix', 'evallevels', 'trajectory', 'costattr', 'defense', 'codegenlevels', 'testrepair', 'mutation', 'reviewdims', 'fptradeoff', 'mapreduce', 'selfattn', 'attnmath', 'posenc', 'activation', 'feateng', 'threecond', 'alexnet', 'paramdist', 'mdltrade', 'aicbic', 'polymdl', 'rnnunroll', 'vanishgrad', 'charrnn', 'tempprobe', 'rnnvslstm', 'lstmcell', 'paramcmp', 'dropoutrnn', 'layernorm', 'dropoutvar', 'entcomp', 'compcplx', 'encoders', 'weightnoise', 'vardemo', 'coffeemodel', 'uim', 'benchlimits', 'degradation', 'resblock', 'gradflow', 'bottleneck', 'shortcut', 'preact', 'depthscale', 'receptivefield', 'dilationvis', 'expgrowth', 'aspp', 'bottleneck2', 'alignment', 'attnmath', 'heatmap', 'tarch', 'sdp', 'maskdemo', 'multihead', 'posenc2', 'encdec', 'ntmarch', 'contentaddr', 'locaddr', 'writeop', 'ptrproblem', 'ptrmech', 'reltask', 'relnet', 'sumagg', 'lstmlimit', 'rmcarch', 'mhmemory', 'molgraph', 'msgpass', 'permvar', 'readout', 'scalinglaw', 'loglog', 'computealloc', 'chinchilla', 'pipebubble', 'pipesched', 'recompute', 'policyupdate', 'ppoclip', 'clipeffect', 'gae', 'ctc', 'ctcalign', 'ctcloss', 'ds2arch', 'postcollapse', 'vlaearch', 'rewardhack', 'preflearn', 'rlhfarch', 'klreg', 'setorder', 'rsshuffle', 'rpw', 'convdemo', 'outsize', 'paramcount', 'im2col', 'rf2', 'coffeesim', 'randomness', 'bubbleratio', 'bradleyterry', 'resnetarch', 'preactarch', 'vecspeed', 'broadcast', 'resample', 'rolling', 'macd', 'rsi', 'volumeprice', 'vwap', 'underwater', 'compound', 'fattail', 'correlation', 'frontier', 'riskparity', 'varcvar', 'ragpipe', 'chunking', 'retrieval', 'cxgrowth', 'twopointer', 'binsearch', 'linkedlist', 'monostack', 'hashtable', 'pymemory', 'pdindex', 'missing', 'sqljoin', 'charttype', 'abtest', 'excelref', 'metrictree', 'impute', 'normscale', 'fptree', 'dbscan', 'cf', 'streamsketch', 'orderbook', 'candlestick', 'matchingflow', 'equitycurve', 'purgedcv', 'neuron', 'xor', 'backprop', 'mlpshape', 'optimizer', 'regularizer', 'conv2d', 'resnet', 'rnn-bptt', 'lstm-cell', 'vae-latent', 'diffusion-flow', 'attention-heatmap', 'transformer-arch', 'mds-arch', 'kimball-star', 'dbt-layers', 'dbt-materialization', 'incremental-window', 'airflow-arch', 'task-lifecycle', 'xcom-passing', 'trigger-rules', 'data-interval', 'idempotency', 'dynamic-mapping', 'airflow-dbt-cosmos', 'scd-type2', 'dbt-testing', 'slim-ci', 'semantic-layer', 'dag-structure', 'executor-compare', 'sla-monitoring', 'bahdanau', 'attnheatmap', 'agentloop', 'contextwindow', 'mcphandshake', 'specflow', 'autonomyladder', 'permmodes', 'reviewpipe', 'factoryloop'].includes(kind)) return null;
    return { type: 'diagram', kind, name: attrs.name ?? attrs.kind, steps: attrs.steps, note: attrs.note };
  }
  if (tag === 'TensorFlow') {
    return { type: 'diagram', kind: 'tensor', steps: attrs.steps, note: attrs.note };
  }
  if (tag === 'Heatmap') {
    return { type: 'diagram', kind: 'heatmap', name: attrs.name };
  }
  if (tag === 'Slider') {
    return { type: 'diagram', kind: 'slider', name: attrs.name };
  }
  if (tag === 'JoinDiagram') {
    return { type: 'diagram', kind: 'join', name: attrs.kind ?? 'inner' };
  }
  if (tag === 'IndexDiagram') {
    return { type: 'diagram', kind: 'index', name: attrs.kind ?? 'loc' };
  }
  if (tag === 'PivotDiagram') {
    return { type: 'diagram', kind: 'pivot', name: 'default' };
  }
  if (tag === 'LrCurve') {
    return { type: 'diagram', kind: 'lr', name: attrs.name ?? 'cosine' };
  }
  if (tag === 'Flowchart') {
    return { type: 'diagram', kind: 'flow', name: attrs.name };
  }
  if (tag === 'TreeView') {
    return { type: 'diagram', kind: 'tree', name: attrs.name };
  }
  if (tag === 'AprioriLattice') {
    return { type: 'diagram', kind: 'apriori', name: 'default' };
  }
  if (tag === 'KMeansStep') {
    return { type: 'diagram', kind: 'kmeans', name: attrs.name ?? 'default' };
  }
  if (tag === 'PageRankFlow') {
    return { type: 'diagram', kind: 'pagerank', name: 'default' };
  }
  if (tag === 'MatrixHeat') {
    return { type: 'diagram', kind: 'matrix', name: attrs.name ?? 'default' };
  }
  if (tag === 'PcaProjection') {
    return { type: 'diagram', kind: 'pca', name: 'default' };
  }
  if (tag === 'AnomalyScatter') {
    return { type: 'diagram', kind: 'anomaly', name: 'default' };
  }
  if (tag === 'ReactLoopDemo') {
    return { type: 'diagram', kind: 'react', name: 'default' };
  }
  if (tag === 'TokenFlow') {
    return { type: 'diagram', kind: 'token', name: 'default' };
  }
  if (tag === 'AutomationSpectrum') {
    return { type: 'diagram', kind: 'spectrum', name: 'default' };
  }
  if (tag === 'ToolCallFlow') {
    return { type: 'diagram', kind: 'toolflow', name: 'default' };
  }
  if (tag === 'WorkflowPatterns') {
    return { type: 'diagram', kind: 'patterns', name: 'default' };
  }
  if (tag === 'TraceWaterfall') {
    return { type: 'diagram', kind: 'trace', name: 'default' };
  }
  if (tag === 'InjectionAttack') {
    return { type: 'diagram', kind: 'injection', name: 'default' };
  }
  if (tag === 'MultiAgentTopology') {
    return { type: 'diagram', kind: 'multiagent', name: 'default' };
  }
  if (tag === 'StateMachineDemo') {
    return { type: 'diagram', kind: 'statemachine', name: 'default' };
  }
  if (tag === 'RpaLayers') {
    return { type: 'diagram', kind: 'rpalayers', name: 'default' };
  }
  if (tag === 'DocPipeline') {
    return { type: 'diagram', kind: 'docpipeline', name: 'default' };
  }
  if (tag === 'ConfidenceRouting') {
    return { type: 'diagram', kind: 'confrouting', name: 'default' };
  }
  if (tag === 'WorkflowCanvas') {
    return { type: 'diagram', kind: 'workflowcanvas', name: 'default' };
  }
  if (tag === 'PermissionMatrix') {
    return { type: 'diagram', kind: 'permmatrix', name: 'default' };
  }
  if (tag === 'EvalLevels') {
    return { type: 'diagram', kind: 'evallevels', name: 'default' };
  }
  if (tag === 'TrajectoryEval') {
    return { type: 'diagram', kind: 'trajectory', name: 'default' };
  }
  if (tag === 'CostAttribution') {
    return { type: 'diagram', kind: 'costattr', name: 'default' };
  }
  if (tag === 'DefenseLayers') {
    return { type: 'diagram', kind: 'defense', name: 'default' };
  }
  if (tag === 'CodeGenLevels') {
    return { type: 'diagram', kind: 'codegenlevels', name: 'default' };
  }
  if (tag === 'TestRepairLoop') {
    return { type: 'diagram', kind: 'testrepair', name: 'default' };
  }
  if (tag === 'MutationDemo') {
    return { type: 'diagram', kind: 'mutation', name: 'default' };
  }
  if (tag === 'ReviewDimensions') {
    return { type: 'diagram', kind: 'reviewdims', name: 'default' };
  }
  if (tag === 'FalsePositiveTradeoff') {
    return { type: 'diagram', kind: 'fptradeoff', name: 'default' };
  }
  if (tag === 'MapReduceSummary') {
    return { type: 'diagram', kind: 'mapreduce', name: 'default' };
  }
  if (tag === 'SelfAttentionDemo') {
    return { type: 'diagram', kind: 'selfattn', name: 'default' };
  }
  if (tag === 'AttentionMathDemo') {
    return { type: 'diagram', kind: 'attnmath', name: 'default' };
  }
  if (tag === 'PositionalEncodingDemo') {
    return { type: 'diagram', kind: 'posenc', name: 'default' };
  }
  if (tag === 'ActivationCompareDemo') {
    return { type: 'diagram', kind: 'activation', name: 'default' };
  }
  if (tag === 'FeatureEngineeringDemo') {
    return { type: 'diagram', kind: 'feateng', name: 'default' };
  }
  if (tag === 'ThreeConditionsDemo') {
    return { type: 'diagram', kind: 'threecond', name: 'default' };
  }
  if (tag === 'AlexNetArchDemo') {
    return { type: 'diagram', kind: 'alexnet', name: 'default' };
  }
  if (tag === 'ParamDistributionDemo') {
    return { type: 'diagram', kind: 'paramdist', name: 'default' };
  }
  if (tag === 'MDLTradeoffDemo') {
    return { type: 'diagram', kind: 'mdltrade', name: 'default' };
  }
  if (tag === 'AICvsBICDemo') {
    return { type: 'diagram', kind: 'aicbic', name: 'default' };
  }
  if (tag === 'PolynomialMDLDemo') {
    return { type: 'diagram', kind: 'polymdl', name: 'default' };
  }
  if (tag === 'RNNUnrollDemo') {
    return { type: 'diagram', kind: 'rnnunroll', name: 'default' };
  }
  if (tag === 'VanishingGradientDemo') {
    return { type: 'diagram', kind: 'vanishgrad', name: 'default' };
  }
  if (tag === 'CharRNNTextDemo') {
    return { type: 'diagram', kind: 'charrnn', name: 'default' };
  }
  if (tag === 'TemperatureSamplingDemo') {
    return { type: 'diagram', kind: 'tempprobe', name: 'default' };
  }
  if (tag === 'RNNvsLSTMDemo') {
    return { type: 'diagram', kind: 'rnnvslstm', name: 'default' };
  }
  if (tag === 'LSTMCellDemo') {
    return { type: 'diagram', kind: 'lstmcell', name: 'default' };
  }
  if (tag === 'ParamCompareDemo') {
    return { type: 'diagram', kind: 'paramcmp', name: 'default' };
  }
  if (tag === 'DropoutInRNNDemo') {
    return { type: 'diagram', kind: 'dropoutrnn', name: 'default' };
  }
  if (tag === 'LayerNormDemo') {
    return { type: 'diagram', kind: 'layernorm', name: 'default' };
  }
  if (tag === 'DropoutVariantsDemo') {
    return { type: 'diagram', kind: 'dropoutvar', name: 'default' };
  }
  if (tag === 'EntropyComplexityDemo') {
    return { type: 'diagram', kind: 'entcomp', name: 'default' };
  }
  if (tag === 'CompressionComplexityDemo') {
    return { type: 'diagram', kind: 'compcplx', name: 'default' };
  }
  if (tag === 'EncoderCompareDemo') {
    return { type: 'diagram', kind: 'encoders', name: 'default' };
  }
  if (tag === 'WeightNoiseDemo') {
    return { type: 'diagram', kind: 'weightnoise', name: 'default' };
  }
  if (tag === 'VariationalInferenceDemo') {
    return { type: 'diagram', kind: 'vardemo', name: 'default' };
  }
  if (tag === 'CoffeeModelCompareDemo') {
    return { type: 'diagram', kind: 'coffeemodel', name: 'default' };
  }
  if (tag === 'UniversalIntelligenceDemo') {
    return { type: 'diagram', kind: 'uim', name: 'default' };
  }
  if (tag === 'BenchmarkLimitationsDemo') {
    return { type: 'diagram', kind: 'benchlimits', name: 'default' };
  }
  if (tag === 'DegradationDemo') {
    return { type: 'diagram', kind: 'degradation', name: 'default' };
  }
  if (tag === 'ResidualBlockDemo') {
    return { type: 'diagram', kind: 'resblock', name: 'default' };
  }
  if (tag === 'GradientFlowDemo') {
    return { type: 'diagram', kind: 'gradflow', name: 'default' };
  }
  if (tag === 'BottleneckCompareDemo') {
    return { type: 'diagram', kind: 'bottleneck', name: 'default' };
  }
  if (tag === 'ShortcutTransformDemo') {
    return { type: 'diagram', kind: 'shortcut', name: 'default' };
  }
  if (tag === 'PreActDemo') {
    return { type: 'diagram', kind: 'preact', name: 'default' };
  }
  if (tag === 'DepthScalabilityDemo') {
    return { type: 'diagram', kind: 'depthscale', name: 'default' };
  }
  if (tag === 'ReceptiveFieldDemo') {
    return { type: 'diagram', kind: 'receptivefield', name: 'default' };
  }
  if (tag === 'DilationVisualDemo') {
    return { type: 'diagram', kind: 'dilationvis', name: 'default' };
  }
  if (tag === 'ExponentialGrowthDemo') {
    return { type: 'diagram', kind: 'expgrowth', name: 'default' };
  }
  if (tag === 'ASPPDemo') {
    return { type: 'diagram', kind: 'aspp', name: 'default' };
  }
  if (tag === 'FixedVectorBottleneckDemo') {
    return { type: 'diagram', kind: 'bottleneck2', name: 'default' };
  }
  if (tag === 'AlignmentDemo') {
    return { type: 'diagram', kind: 'alignment', name: 'default' };
  }
  if (tag === 'AttentionMathDemo') {
    return { type: 'diagram', kind: 'attnmath', name: 'default' };
  }
  if (tag === 'AttentionHeatmapDemo') {
    return { type: 'diagram', kind: 'attnheatmap', name: 'default' };
  }
  if (tag === 'BahdanauMathDemo') {
    return { type: 'diagram', kind: 'bahdanau', name: 'default' };
  }
  if (tag === 'TransformerArchDemo') {
    return { type: 'diagram', kind: 'tarch', name: 'default' };
  }
  if (tag === 'ScaledDotProductDemo') {
    return { type: 'diagram', kind: 'sdp', name: 'default' };
  }
  if (tag === 'MaskDemo') {
    return { type: 'diagram', kind: 'maskdemo', name: 'default' };
  }
  if (tag === 'MultiHeadDemo') {
    return { type: 'diagram', kind: 'multihead', name: 'default' };
  }
  if (tag === 'PositionalEncodingDemo2') {
    return { type: 'diagram', kind: 'posenc2', name: 'default' };
  }
  if (tag === 'EncoderDecoderDemo') {
    return { type: 'diagram', kind: 'encdec', name: 'default' };
  }
  if (tag === 'NTMArchDemo') {
    return { type: 'diagram', kind: 'ntmarch', name: 'default' };
  }
  if (tag === 'ContentAddressingDemo') {
    return { type: 'diagram', kind: 'contentaddr', name: 'default' };
  }
  if (tag === 'LocationAddressingDemo') {
    return { type: 'diagram', kind: 'locaddr', name: 'default' };
  }
  if (tag === 'WriteOperationDemo') {
    return { type: 'diagram', kind: 'writeop', name: 'default' };
  }
  if (tag === 'PointerProblemDemo') {
    return { type: 'diagram', kind: 'ptrproblem', name: 'default' };
  }
  if (tag === 'PointerMechanismDemo') {
    return { type: 'diagram', kind: 'ptrmech', name: 'default' };
  }
  if (tag === 'RelationalTaskDemo') {
    return { type: 'diagram', kind: 'reltask', name: 'default' };
  }
  if (tag === 'RelationNetworkDemo') {
    return { type: 'diagram', kind: 'relnet', name: 'default' };
  }
  if (tag === 'SumAggregationDemo') {
    return { type: 'diagram', kind: 'sumagg', name: 'default' };
  }
  if (tag === 'LSTMMemoryLimitDemo') {
    return { type: 'diagram', kind: 'lstmlimit', name: 'default' };
  }
  if (tag === 'RMCArchDemo') {
    return { type: 'diagram', kind: 'rmcarch', name: 'default' };
  }
  if (tag === 'MultiHeadMemoryDemo') {
    return { type: 'diagram', kind: 'mhmemory', name: 'default' };
  }
  if (tag === 'MoleculeGraphDemo') {
    return { type: 'diagram', kind: 'molgraph', name: 'default' };
  }
  if (tag === 'MessagePassingDemo') {
    return { type: 'diagram', kind: 'msgpass', name: 'default' };
  }
  if (tag === 'PermutationInvarianceDemo') {
    return { type: 'diagram', kind: 'permvar', name: 'default' };
  }
  if (tag === 'ReadoutDemo') {
    return { type: 'diagram', kind: 'readout', name: 'default' };
  }
  if (tag === 'ScalingLawDemo') {
    return { type: 'diagram', kind: 'scalinglaw', name: 'default' };
  }
  if (tag === 'LogLogDemo') {
    return { type: 'diagram', kind: 'loglog', name: 'default' };
  }
  if (tag === 'ComputeAllocationDemo') {
    return { type: 'diagram', kind: 'computealloc', name: 'default' };
  }
  if (tag === 'ChinchillaDemo') {
    return { type: 'diagram', kind: 'chinchilla', name: 'default' };
  }
  if (tag === 'PipelineBubbleDemo') {
    return { type: 'diagram', kind: 'pipebubble', name: 'default' };
  }
  if (tag === 'PipelineScheduleDemo') {
    return { type: 'diagram', kind: 'pipesched', name: 'default' };
  }
  if (tag === 'RecomputeDemo') {
    return { type: 'diagram', kind: 'recompute', name: 'default' };
  }
  if (tag === 'PolicyUpdateDemo') {
    return { type: 'diagram', kind: 'policyupdate', name: 'default' };
  }
  if (tag === 'PPOClipDemo') {
    return { type: 'diagram', kind: 'ppoclip', name: 'default' };
  }
  if (tag === 'ClipEffectDemo') {
    return { type: 'diagram', kind: 'clipeffect', name: 'default' };
  }
  if (tag === 'GAEDemo') {
    return { type: 'diagram', kind: 'gae', name: 'default' };
  }
  if (tag === 'CTCDemo') {
    return { type: 'diagram', kind: 'ctc', name: 'default' };
  }
  if (tag === 'CTCAlignmentDemo') {
    return { type: 'diagram', kind: 'ctcalign', name: 'default' };
  }
  if (tag === 'CTCLossDemo') {
    return { type: 'diagram', kind: 'ctcloss', name: 'default' };
  }
  if (tag === 'DeepSpeechArchDemo') {
    return { type: 'diagram', kind: 'ds2arch', name: 'default' };
  }
  if (tag === 'PosteriorCollapseDemo') {
    return { type: 'diagram', kind: 'postcollapse', name: 'default' };
  }
  if (tag === 'VLAEArchDemo') {
    return { type: 'diagram', kind: 'vlaearch', name: 'default' };
  }
  if (tag === 'RewardHackingDemo') {
    return { type: 'diagram', kind: 'rewardhack', name: 'default' };
  }
  if (tag === 'PreferenceLearningDemo') {
    return { type: 'diagram', kind: 'preflearn', name: 'default' };
  }
  if (tag === 'RLHFArchDemo') {
    return { type: 'diagram', kind: 'rlhfarch', name: 'default' };
  }
  if (tag === 'KLRegularizationDemo') {
    return { type: 'diagram', kind: 'klreg', name: 'default' };
  }
  if (tag === 'SetOrderDemo') {
    return { type: 'diagram', kind: 'setorder', name: 'default' };
  }
  if (tag === 'RandomShuffleDemo') {
    return { type: 'diagram', kind: 'rsshuffle', name: 'default' };
  }
  if (tag === 'ReadProcessWriteDemo') {
    return { type: 'diagram', kind: 'rpw', name: 'default' };
  }
  if (tag === 'ConvDemo') {
    return { type: 'diagram', kind: 'convdemo', name: 'default' };
  }
  if (tag === 'OutputSizeDemo') {
    return { type: 'diagram', kind: 'outsize', name: 'default' };
  }
  if (tag === 'ParamCountDemo') {
    return { type: 'diagram', kind: 'paramcount', name: 'default' };
  }
  if (tag === 'Im2colDemo') {
    return { type: 'diagram', kind: 'im2col', name: 'default' };
  }
  if (tag === 'ReceptiveFieldDemo2') {
    return { type: 'diagram', kind: 'rf2', name: 'default' };
  }
  if (tag === 'CoffeeSimulationDemo') {
    return { type: 'diagram', kind: 'coffeesim', name: 'default' };
  }
  if (tag === 'RandomnessDemo') {
    return { type: 'diagram', kind: 'randomness', name: 'default' };
  }
  if (tag === 'BubbleRatioDemo') {
    return { type: 'diagram', kind: 'bubbleratio', name: 'default' };
  }
  if (tag === 'BradleyTerryDemo') {
    return { type: 'diagram', kind: 'bradleyterry', name: 'default' };
  }
  if (tag === 'ResNetArchDemo') {
    return { type: 'diagram', kind: 'resnetarch', name: 'default' };
  }
  if (tag === 'PreActArchDemo') {
    return { type: 'diagram', kind: 'preactarch', name: 'default' };
  }
  if (tag === 'VectorizationDemo') {
    return { type: 'diagram', kind: 'vecspeed', name: 'default' };
  }
  if (tag === 'BroadcastDemo') {
    return { type: 'diagram', kind: 'broadcast', name: 'default' };
  }
  if (tag === 'ResampleDemo') {
    return { type: 'diagram', kind: 'resample', name: 'default' };
  }
  if (tag === 'RollingWindowDemo') {
    return { type: 'diagram', kind: 'rolling', name: 'default' };
  }
  if (tag === 'MACDDemo') {
    return { type: 'diagram', kind: 'macd', name: 'default' };
  }
  if (tag === 'RSIDemo') {
    return { type: 'diagram', kind: 'rsi', name: 'default' };
  }
  if (tag === 'VolumePriceDemo') {
    return { type: 'diagram', kind: 'volumeprice', name: 'default' };
  }
  if (tag === 'VwapDemo') {
    return { type: 'diagram', kind: 'vwap', name: 'default' };
  }
  if (tag === 'UnderwaterDemo') {
    return { type: 'diagram', kind: 'underwater', name: 'default' };
  }
  if (tag === 'CompoundInterestDemo') {
    return { type: 'diagram', kind: 'compound', name: 'default' };
  }
  if (tag === 'FatTailDemo') {
    return { type: 'diagram', kind: 'fattail', name: 'default' };
  }
  if (tag === 'CorrelationDemo') {
    return { type: 'diagram', kind: 'correlation', name: 'default' };
  }
  if (tag === 'EfficientFrontierDemo') {
    return { type: 'diagram', kind: 'frontier', name: 'default' };
  }
  if (tag === 'RiskParityDemo') {
    return { type: 'diagram', kind: 'riskparity', name: 'default' };
  }
  if (tag === 'VarCvarDemo') {
    return { type: 'diagram', kind: 'varcvar', name: 'default' };
  }
  if (tag === 'RAGPipelineDemo') {
    return { type: 'diagram', kind: 'ragpipe', name: 'default' };
  }
  if (tag === 'ChunkingDemo') {
    return { type: 'diagram', kind: 'chunking', name: 'default' };
  }
  if (tag === 'RetrievalCompareDemo') {
    return { type: 'diagram', kind: 'retrieval', name: 'default' };
  }
  if (tag === 'ComplexityGrowthDemo') {
    return { type: 'diagram', kind: 'cxgrowth', name: 'default' };
  }
  if (tag === 'TwoPointerDemo') {
    return { type: 'diagram', kind: 'twopointer', name: 'default' };
  }
  if (tag === 'BinarySearchDemo') {
    return { type: 'diagram', kind: 'binsearch', name: 'default' };
  }
  if (tag === 'LinkedListDemo') {
    return { type: 'diagram', kind: 'linkedlist', name: 'default' };
  }
  if (tag === 'MonotonicStackDemo') {
    return { type: 'diagram', kind: 'monostack', name: 'default' };
  }
  if (tag === 'HashTableDemo') {
    return { type: 'diagram', kind: 'hashtable', name: 'default' };
  }
  if (tag === 'PythonMemoryDemo') {
    return { type: 'diagram', kind: 'pymemory', name: 'default' };
  }
  if (tag === 'PandasIndexDemo') {
    return { type: 'diagram', kind: 'pdindex', name: 'default' };
  }
  if (tag === 'MissingValueDemo') {
    return { type: 'diagram', kind: 'missing', name: 'default' };
  }
  if (tag === 'SqlJoinDemo') {
    return { type: 'diagram', kind: 'sqljoin', name: 'default' };
  }
  if (tag === 'ChartTypeDemo') {
    return { type: 'diagram', kind: 'charttype', name: 'default' };
  }
  if (tag === 'ABTestDemo') {
    return { type: 'diagram', kind: 'abtest', name: 'default' };
  }
  if (tag === 'ExcelRefDemo') {
    return { type: 'diagram', kind: 'excelref', name: 'default' };
  }
  if (tag === 'MetricTreeDemo') {
    return { type: 'diagram', kind: 'metrictree', name: 'default' };
  }
  if (tag === 'ImputeStrategyDemo') {
    return { type: 'diagram', kind: 'impute', name: 'default' };
  }
  if (tag === 'NormalizationDemo') {
    return { type: 'diagram', kind: 'normscale', name: 'default' };
  }
  if (tag === 'FPTreeDemo') {
    return { type: 'diagram', kind: 'fptree', name: 'default' };
  }
  if (tag === 'DBSCANDemo') {
    return { type: 'diagram', kind: 'dbscan', name: 'default' };
  }
  if (tag === 'CollaborativeFilteringDemo') {
    return { type: 'diagram', kind: 'cf', name: 'default' };
  }
  if (tag === 'BackpropCircuit') {
    return { type: 'diagram', kind: 'backprop', name: 'default' };
  }
  if (tag === 'OptimizerTrajectoryVisualizer') {
    return { type: 'diagram', kind: 'optimizer', name: 'default' };
  }
  if (tag === 'StreamSketchDemo') {
    return { type: 'diagram', kind: 'streamsketch', name: 'default' };
  }
  if (tag === 'MdsArchDemo') {
    return { type: 'diagram', kind: 'mds-arch', name: 'default' };
  }
  if (tag === 'KimballStarDemo') {
    return { type: 'diagram', kind: 'kimball-star', name: 'default' };
  }
  if (tag === 'DbtLayersDemo') {
    return { type: 'diagram', kind: 'dbt-layers', name: 'default' };
  }
  if (tag === 'DbtMaterializationDemo') {
    return { type: 'diagram', kind: 'dbt-materialization', name: 'default' };
  }
  if (tag === 'IncrementalWindowDemo') {
    return { type: 'diagram', kind: 'incremental-window', name: 'default' };
  }
  if (tag === 'AirflowArchDemo') {
    return { type: 'diagram', kind: 'airflow-arch', name: 'default' };
  }
  if (tag === 'TaskLifecycleDemo') {
    return { type: 'diagram', kind: 'task-lifecycle', name: 'default' };
  }
  if (tag === 'XComPassingDemo') {
    return { type: 'diagram', kind: 'xcom-passing', name: 'default' };
  }
  if (tag === 'TriggerRulesDemo') {
    return { type: 'diagram', kind: 'trigger-rules', name: 'default' };
  }
  if (tag === 'DataIntervalDemo') {
    return { type: 'diagram', kind: 'data-interval', name: 'default' };
  }
  if (tag === 'IdempotencyDemo') {
    return { type: 'diagram', kind: 'idempotency', name: 'default' };
  }
  if (tag === 'DynamicMappingDemo') {
    return { type: 'diagram', kind: 'dynamic-mapping', name: 'default' };
  }
  if (tag === 'AirflowDbtCosmosDemo') {
    return { type: 'diagram', kind: 'airflow-dbt-cosmos', name: 'default' };
  }
  if (tag === 'ScdType2Demo') {
    return { type: 'diagram', kind: 'scd-type2', name: 'default' };
  }
  if (tag === 'DbtTestingDemo') {
    return { type: 'diagram', kind: 'dbt-testing', name: 'default' };
  }
  if (tag === 'SlimCiDemo') {
    return { type: 'diagram', kind: 'slim-ci', name: 'default' };
  }
  if (tag === 'SemanticLayerDemo') {
    return { type: 'diagram', kind: 'semantic-layer', name: 'default' };
  }
  if (tag === 'DagStructureDemo') {
    return { type: 'diagram', kind: 'dag-structure', name: 'default' };
  }
  if (tag === 'ExecutorCompareDemo') {
    return { type: 'diagram', kind: 'executor-compare', name: 'default' };
  }
  if (tag === 'SlaMonitoringDemo') {
    return { type: 'diagram', kind: 'sla-monitoring', name: 'default' };
  }
  return null;
}

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  const flushParagraph = (buf: string[]) => {
    if (buf.length) blocks.push({ type: 'paragraph', text: buf.join('\n') });
  };

  while (i < lines.length) {
    const line = lines[i];

    // 图示标签（优先于其他块）
    const diagram = parseDiagramTag(line);
    if (diagram) {
      blocks.push(diagram);
      i += 1;
      continue;
    }

    // 独立公式块 $$ ... $$
    const trimmed = line.trim();
    if (trimmed.startsWith('$$')) {
      if (trimmed.endsWith('$$') && trimmed.length > 2) {
        const math = trimmed.slice(2, -2).trim();
        blocks.push({ type: 'math', math });
        i += 1;
        continue;
      }
      const mathLines: string[] = [];
      const firstLine = trimmed.slice(2).trim();
      if (firstLine) mathLines.push(firstLine);
      i += 1;
      while (i < lines.length && !lines[i].trim().endsWith('$$')) {
        mathLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) {
        const lastLine = lines[i].trim().replace(/\$\$$/, '').trim();
        if (lastLine) mathLines.push(lastLine);
        i += 1;
      }
      blocks.push({ type: 'math', math: mathLines.join('\n') });
      continue;
    }

    // 代码块
    const fence = line.match(/^\s*(```|~~~)(.*)$/);
    if (fence) {
      const marker = fence[1];
      const lang = fence[2].trim() || undefined;
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith(marker)) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1; // 跳过结束围栏
      blocks.push({ type: 'code', lang, code: codeLines.join('\n') });
      continue;
    }

    if (!line.trim()) {
      i += 1;
      continue;
    }

    // 标题
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
      i += 1;
      continue;
    }

    // 分割线
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ type: 'hr' });
      i += 1;
      continue;
    }

    // 引用
    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      blocks.push({ type: 'quote', text: buf.join('\n') });
      continue;
    }

    // 表格
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1])) {
      const splitRow = (l: string) =>
        l
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          // 先把转义的 \| 替换成占位符，避免被当作列分隔符
          .replace(/\\\|/g, '\u0000PIPE\u0000')
          .split('|')
          .map((c) => c.trim().replace(/\u0000PIPE\u0000/g, '|'));
      const header = splitRow(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      blocks.push({ type: 'table', header, rows });
      continue;
    }

    // 列表
    const listMatch = line.match(/^\s*([-*+]|\d+[.)])\s+/);
    if (listMatch) {
      const ordered = /^\d/.test(listMatch[1]);
      const items: string[] = [];
      const startI = i;
      while (i < lines.length) {
        const cur = lines[i];
        if (!cur.trim()) break;

        const isIndented = /^( {2,}|\t)/.test(cur);
        if (isIndented && items.length > 0) {
          items[items.length - 1] += `\n${cur.trim()}`;
          i += 1;
          continue;
        }

        // 注意：这里必须与上面的 listMatch 一致（允许缩进），
        // 否则遇到「缩进的有序列表」时内外正则不匹配 -> i 不前进 -> 死循环
        const m = cur.match(/^\s*([-*+]|\d+[.)])\s+(.*)$/);
        if (m && /^\d/.test(m[1]) === ordered) {
          items.push(m[2]);
          i += 1;
        } else {
          break;
        }
      }
      // 安全阀：确保至少消费一行，杜绝任何形式的死循环
      if (i === startI) i += 1;
      if (items.length) blocks.push({ type: 'list', ordered, items });
      continue;
    }

    // 段落
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*(```|~~~)/.test(lines[i]) &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i]) &&
      !/^\s*([-*+]|\d+[.)])\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith('$$') &&
      // 图示标签必须独立成块，不能被吞进段落
      !parseDiagramTag(lines[i])
    ) {
      buf.push(lines[i]);
      i += 1;
    }
    flushParagraph(buf);
  }
  return blocks;
}

/** 行内解析：`代码`、$$公式$$、$公式$、**粗体**、*斜体*、~~删除~~、[链接](url) */
function parseInline(rawText: string, keyPrefix = ''): ReactNode[] {
  // 解码常用 HTML 实体（用于表格内转义 | 等场景）
  const text = rawText
    .replace(/&#124;/g, '|')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
  const nodes: ReactNode[] = [];
  const pattern =
    /(`[^`]+`)|(\$\$[^\$]+\$\$)|(\$\S(?:[^$\n]*?\S)?\$|\$[^$\s\n]\$)|(\*\*(?!\s)((?:[^*\n]|\*(?!\*))+?)(?<!\s)\*\*)|((?<!\*)\*(?!\s|\*)([^*\n]+?)(?<!\s|\*)\*(?!\*))|(~~[^~]+~~)|(\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;

  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyPrefix}i${k}`;
    k += 1;
    if (tok.startsWith('`')) {
      nodes.push(<code key={key}>{tok.slice(1, -1)}</code>);
    } else if (tok.startsWith('$$') && tok.endsWith('$$')) {
      const math = tok.slice(2, -2);
      nodes.push(
        <span
          key={key}
          className="katex-display-wrapper"
          dangerouslySetInnerHTML={{ __html: renderKatex(math, true) }}
        />,
      );
    } else if (tok.startsWith('$') && tok.endsWith('$')) {
      const math = tok.slice(1, -1);
      nodes.push(
        <span
          key={key}
          className="katex-inline"
          dangerouslySetInnerHTML={{ __html: renderKatex(math, false) }}
        />,
      );
    } else if (tok.startsWith('**') && tok.endsWith('**')) {
      nodes.push(<strong key={key}>{parseInline(tok.slice(2, -2), `${key}-`)}</strong>);
    } else if (tok.startsWith('*') && tok.endsWith('*')) {
      nodes.push(<em key={key}>{parseInline(tok.slice(1, -1), `${key}-`)}</em>);
    } else if (tok.startsWith('~~')) {
      nodes.push(<del key={key}>{tok.slice(2, -2)}</del>);
    } else if (tok.startsWith('[')) {
      const mm = tok.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (mm) {
        nodes.push(
          <a key={key} href={mm[2]} target="_blank" rel="noreferrer">
            {mm[1]}
          </a>,
        );
      } else nodes.push(tok);
    } else {
      nodes.push(tok);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function renderInlineWithBreaks(text: string, keyPrefix = ''): ReactNode {
  const parts = text.split('\n');
  return parts.map((p, idx) => (
    <span key={`${keyPrefix}l${idx}`}>
      {idx > 0 && <br />}
      {parseInline(p, `${keyPrefix}${idx}-`)}
    </span>
  ));
}

function renderListItem(itemText: string, keyPrefix: string): ReactNode {
  const lines = itemText.split('\n');
  if (lines.length === 1) {
    return renderInlineWithBreaks(lines[0], keyPrefix);
  }

  const hasSubBullets = lines.some((l, idx) => idx > 0 && /^\s*([-*+]|\d+[.)])\s+/.test(l));
  if (!hasSubBullets) {
    return renderInlineWithBreaks(itemText, keyPrefix);
  }

  const elements: ReactNode[] = [];
  let topLines: string[] = [];
  let subBullets: string[] = [];
  let subOrdered = false;

  const flushSub = () => {
    if (subBullets.length > 0) {
      const SubTag = subOrdered ? 'ol' : 'ul';
      elements.push(
        <SubTag key={`${keyPrefix}-sub-${elements.length}`} className="md-sublist">
          {subBullets.map((sub, sIdx) => (
            <li key={`${keyPrefix}-s-${sIdx}`}>
              {renderInlineWithBreaks(sub, `${keyPrefix}-s-${sIdx}-`)}
            </li>
          ))}
        </SubTag>,
      );
      subBullets = [];
    }
  };

  const flushTop = () => {
    if (topLines.length > 0) {
      elements.push(
        <div key={`${keyPrefix}-top-${elements.length}`} className="md-item-top">
          {renderInlineWithBreaks(topLines.join('\n'), `${keyPrefix}-top-`)}
        </div>,
      );
      topLines = [];
    }
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const l = lines[idx];
    const m = l.match(/^\s*([-*+]|\d+[.)])\s+(.*)$/);
    if (m) {
      flushTop();
      const ord = /^\d/.test(m[1]);
      if (subBullets.length > 0 && ord !== subOrdered) {
        flushSub();
      }
      subOrdered = ord;
      subBullets.push(m[2]);
    } else if (subBullets.length > 0) {
      subBullets[subBullets.length - 1] += `\n${l.trim()}`;
    } else {
      topLines.push(l);
    }
  }

  flushTop();
  flushSub();
  return elements;
}

export function Markdown({ text, className }: MdProps) {
  const nodes = useMemo(() => {
    const blocks = parseBlocks(text);
    return blocks.map((b, idx) => {
      const key = `b${idx}`;
      switch (b.type) {
        case 'heading': {
          const Tag = (`h${Math.min(b.level, 6)}`) as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
          return <Tag key={key}>{parseInline(b.text, key)}</Tag>;
        }
        case 'paragraph':
          return <p key={key}>{renderInlineWithBreaks(b.text, key)}</p>;
        case 'code':
          return (
            <pre key={key} data-lang={b.lang}>
              <code>{b.code}</code>
            </pre>
          );
        case 'list':
          return b.ordered ? (
            <ol key={key}>
              {b.items.map((it, j) => (
                <li key={j}>{renderListItem(it, `${key}-${j}`)}</li>
              ))}
            </ol>
          ) : (
            <ul key={key}>
              {b.items.map((it, j) => (
                <li key={j}>{renderListItem(it, `${key}-${j}`)}</li>
              ))}
            </ul>
          );
        case 'quote':
          return <blockquote key={key}>{renderInlineWithBreaks(b.text, key)}</blockquote>;
        case 'table':
          return (
            <table key={key}>
              <thead>
                <tr>
                  {b.header.map((h, j) => (
                    <th key={j}>{parseInline(h, `${key}-h${j}`)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r, j) => (
                  <tr key={j}>
                    {b.header.map((_, c) => (
                      <td key={c}>{parseInline(r[c] ?? '', `${key}-${j}-${c}`)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        case 'hr':
          return <hr key={key} />;
        case 'math':
          return (
            <div
              key={key}
              className="katex-block"
              dangerouslySetInnerHTML={{ __html: renderKatex(b.math, true) }}
            />
          );
        case 'diagram':
          return (
            <DiagramRenderer key={key} kind={b.kind} name={b.name} steps={b.steps} note={b.note} />
          );
        default:
          return null;
      }
    });
  }, [text]);

  return <div className={`prose ${className ?? ''}`}>{nodes}</div>;
}
