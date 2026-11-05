import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  ATTENTION_CONFIG,
  ATTENTION_TOKENS,
  MASKED_SCORE,
  buildAttentionTrace,
  type AttentionHead,
  type AttentionTrace,
  type Matrix,
} from './attentionMath';
import './AttentionWorkbench.css';

const STEP_META = [
  {
    title: '固定输入 X',
    short: '输入',
    operation: '4 个 token 各对应一个 4 维向量。两个头共享同一份输入。',
    formula: 'X ∈ R^(T×d_model) = R^(4×4)',
  },
  {
    title: '投影出 Q / K / V',
    short: '投影',
    operation: '当前头用三组固定投影把 X 映射到 2 维查询、键和值空间。',
    formula: 'Q = XWq,  K = XWk,  V = XWv',
  },
  {
    title: '计算原始点积分数',
    short: '打分',
    operation: '每个查询与每个键做点积。行是查询 token，列是被读取的 token。',
    formula: 'S = QKᵀ',
  },
  {
    title: '除以 √d_head',
    short: '缩放',
    operation: '当前头的 d_head = 2，因此所有分数统一除以 √2。',
    formula: 'S_scaled = S / √d_head',
  },
  {
    title: '加入因果掩码',
    short: '掩码',
    operation: '位置 i 只允许读取 j ≤ i。未来位置在 softmax 前替换为 -1e9。',
    formula: 'S_masked[i,j] = j > i ? -1e9 : S_scaled[i,j]',
  },
  {
    title: '逐行做稳定 softmax',
    short: 'softmax',
    operation: '每行先减去该行最大值，再取指数并归一化，得到注意力权重。',
    formula: 'A[i,:] = softmax(S_masked[i,:])',
  },
  {
    title: '用权重混合 V',
    short: '输出',
    operation: '每个查询按权重对所有 Value 加权求和，得到该头在当前 token 的上下文向量。',
    formula: 'O = AV',
  },
] as const;

const LAST_STEP = STEP_META.length - 1;

function formatNumber(value: number, digits = 3): string {
  if (value === MASKED_SCORE) return '−1e9';
  if (Math.abs(value) < 0.0005) return (0).toFixed(digits);
  return value.toFixed(digits);
}

function matrixMaxAbs(matrix: Matrix): number {
  return Math.max(0.000001, ...matrix.flat().map((value) => (value === MASKED_SCORE ? 0 : Math.abs(value))));
}

interface MatrixTableProps {
  title: string;
  matrix: Matrix;
  rowLabels: readonly string[];
  columnLabels: readonly string[];
  caption: string;
  tone?: 'plain' | 'heat' | 'attention' | 'masked';
  digits?: number;
  compact?: boolean;
  cornerLabel?: string;
}

function MatrixTable({
  title,
  matrix,
  rowLabels,
  columnLabels,
  caption,
  tone = 'plain',
  digits = 3,
  compact = false,
  cornerLabel = '行 ＼ 列',
}: MatrixTableProps) {
  const maxAbs = matrixMaxAbs(matrix);

  return (
    <div className="aw-matrix-block">
      <div className="aw-matrix-title">
        <span>{title}</span>
        <code>
          {matrix.length}×{matrix[0]?.length ?? 0}
        </code>
      </div>
      <div className="aw-matrix-scroll">
        <table className={`aw-matrix aw-matrix--${tone}${compact ? ' aw-matrix--compact' : ''}`}>
          <caption className="aw-sr-only">{caption}</caption>
          <thead>
            <tr>
              <th scope="col" className="aw-corner">
                {cornerLabel}
              </th>
              {columnLabels.map((label, index) => (
                <th scope="col" key={`${label}-${index}`}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, rowIndex) => (
              <tr key={`${rowLabels[rowIndex] ?? 'row'}-${rowIndex}`}>
                <th scope="row">{rowLabels[rowIndex] ?? rowIndex}</th>
                {row.map((value, columnIndex) => {
                  const isMasked = tone === 'masked' && columnIndex > rowIndex && value === MASKED_SCORE;
                  const ratio = Math.min(1, Math.abs(value) / maxAbs);
                  const background =
                    tone === 'plain'
                      ? undefined
                      : isMasked
                        ? undefined
                        : `rgba(47, 107, 255, ${0.04 + ratio * (tone === 'attention' ? 0.28 : 0.18)})`;
                  const style: CSSProperties | undefined = background ? { background } : undefined;
                  const displayValue = formatNumber(value, digits);
                  const cellDescription = `第 ${rowIndex + 1} 行、第 ${columnIndex + 1} 列，值 ${displayValue}`;

                  return (
                    <td
                      key={`${rowIndex}-${columnIndex}`}
                      className={isMasked ? 'aw-cell--masked' : undefined}
                      style={style}
                      title={
                        isMasked
                          ? '未来位置：softmax 前替换为 -1e9'
                          : `${rowLabels[rowIndex]} → ${columnLabels[columnIndex]}：${displayValue}`
                      }
                    >
                      <span aria-label={cellDescription}>{displayValue}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function rankName(trace: AttentionTrace, row: number, column: number): string {
  return `${trace.tokens[row]} → ${trace.tokens[column]}`;
}

function StepPrompt({ trace, step }: { trace: AttentionTrace; step: number }) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(false);
  }, [step, trace.head]);

  const prompt = useMemo(() => {
    switch (step) {
      case 0:
        return {
          question: '输入 X 的形状是 [4,4]。这里的 4 分别代表什么？',
          answer: '第一个 4 是 4 个 token 的位置数；第二个 4 是 d_model。两个注意力头会各自从这 4 维中读取 2 维。',
        };
      case 1:
        return {
          question: `当前头投影后，Q、K、V 各是什么形状？`,
          answer: `都是 [4,2]。4 行对应 4 个 token，2 列是当前头的 d_head；另一个头保持相同形状并行计算。`,
        };
      case 2:
        return {
          question: '原始分数矩阵中，当前最大值出现在哪个 token 对？',
          answer: `当前最大值为 ${formatNumber(trace.maxRaw.value)}，位于 ${rankName(
            trace,
            trace.maxRaw.row,
            trace.maxRaw.column,
          )}。注意这一步还没有屏蔽未来位置。`,
        };
      case 3:
        return {
          question: '除以 √2 会改变这些分数的相对排序吗？',
          answer: '不会。除以同一个正数只改变量级，不改变排序；它让 softmax 的输入尺度更稳定。',
        };
      case 4:
        return {
          question: `掩码后，${trace.maskedCount} 个未来格子在最终权重中应占多少？`,
          answer: `严格为 0。它们先被替换为 -1e9，softmax 的指数项会下溢为 0；剩余 ${trace.visibleCount} 个可见位置重新归一化到每行和为 1。`,
        };
      case 5:
        return {
          question: '检查第一行和最后一行，注意力分别能看见哪些 token？',
          answer: `第一行只能看见「${trace.tokens[0]}」，权重为 1；最后一行能看见全部 4 个 token，权重分别为 ${trace.weights[3]
            .map((value) => value.toFixed(3))
            .join('、')}。`,
        };
      default:
        return {
          question: '输出为什么还是 [4,2]，而不是 [4,4]？',
          answer:
            '这是单个头的输出：每个位置对 V 做加权和，特征维仍是 d_head=2。另一个头独立算出 [4,2]，两个头拼接后才回到 4 维。',
        };
    }
  }, [step, trace]);

  return (
    <div className="aw-predict">
      <div className="aw-inspector-label">先预测，再看数</div>
      <p>{prompt.question}</p>
      <button
        type="button"
        className="aw-text-button"
        onClick={() => setRevealed((value) => !value)}
        aria-expanded={revealed}
      >
        {revealed ? '收起核对' : '查看核对'}
      </button>
      {revealed && (
        <div className="aw-predict-answer" role="status">
          {prompt.answer}
        </div>
      )}
    </div>
  );
}

function StepVisual({ trace, step }: { trace: AttentionTrace; step: number }) {
  const tokenLabels = trace.tokens;
  const dimensions = ['d0', 'd1', 'd2', 'd3'];
  const headDimensions = ['d0', 'd1'];

  if (step === 0) {
    return (
      <>
        <MatrixTable
          title="输入 X"
          matrix={trace.input}
          rowLabels={tokenLabels}
          columnLabels={dimensions}
          caption="4 个 token 的 4 维输入矩阵 X"
          cornerLabel="token ＼ d"
        />
        <div className="aw-token-strip" aria-label="位置与 token 对照">
          {trace.tokens.map((token, index) => (
            <span key={token} className="aw-token-chip">
              <small>pos {index}</small>
              {token}
            </span>
          ))}
        </div>
      </>
    );
  }

  if (step === 1) {
    return (
      <div className="aw-tensor-grid">
        <MatrixTable
          title={`Q · head ${trace.head}`}
          matrix={trace.q}
          rowLabels={tokenLabels}
          columnLabels={headDimensions}
          caption={`当前头在 4 个位置上的 Query 矩阵，形状 4 乘 2`}
          compact
          cornerLabel="token ＼ d"
        />
        <MatrixTable
          title={`K · head ${trace.head}`}
          matrix={trace.k}
          rowLabels={tokenLabels}
          columnLabels={headDimensions}
          caption={`当前头在 4 个位置上的 Key 矩阵，形状 4 乘 2`}
          compact
          cornerLabel="token ＼ d"
        />
        <MatrixTable
          title={`V · head ${trace.head}`}
          matrix={trace.v}
          rowLabels={tokenLabels}
          columnLabels={headDimensions}
          caption={`当前头在 4 个位置上的 Value 矩阵，形状 4 乘 2`}
          compact
          cornerLabel="token ＼ d"
        />
      </div>
    );
  }

  if (step === 2) {
    return (
      <>
        <MatrixTable
          title="原始点积分数 S"
          matrix={trace.rawScores}
          rowLabels={tokenLabels}
          columnLabels={tokenLabels}
          caption="未缩放、未掩码的 Query-Key 点积分数矩阵"
          tone="heat"
          cornerLabel="Q ＼ K"
        />
        <p className="aw-annotation">这一格尚未屏蔽未来：右上三角仍参与计算。下一步先缩放，再处理因果性。</p>
      </>
    );
  }

  if (step === 3) {
    return (
      <>
        <MatrixTable
          title="缩放分数 S / √2"
          matrix={trace.scaledScores}
          rowLabels={tokenLabels}
          columnLabels={tokenLabels}
          caption="除以根号二后的点积分数矩阵"
          tone="heat"
          cornerLabel="Q ＼ K"
        />
        <p className="aw-annotation">分数整体变小，但排序不变。这里只除以当前头的维度 2，而不是整个模型的 4。</p>
      </>
    );
  }

  if (step === 4) {
    return (
      <>
        <MatrixTable
          title="因果掩码后的分数"
          matrix={trace.maskedScores}
          rowLabels={tokenLabels}
          columnLabels={tokenLabels}
          caption="加入因果掩码后的分数矩阵，未来位置为负十亿"
          tone="masked"
          cornerLabel="Q ＼ K"
        />
        <p className="aw-annotation">
          <span className="aw-inline-key aw-inline-key--masked">斜纹格</span>
          表示未来位置，softmax 之后必须精确为 0。
        </p>
      </>
    );
  }

  if (step === 5) {
    return (
      <>
        <MatrixTable
          title="注意力权重 A"
          matrix={trace.weights}
          rowLabels={tokenLabels}
          columnLabels={tokenLabels}
          caption="逐行 softmax 后的注意力权重矩阵"
          tone="attention"
          digits={4}
          cornerLabel="Q ＼ K"
        />
        <div className="aw-row-sum-strip" aria-label="注意力矩阵每行的权重和">
          {trace.rowSums.map((sum, index) => (
            <span key={index}>
              <small>{trace.tokens[index]} 行</small>Σ = {sum.toFixed(6)}
            </span>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="aw-pair-grid">
        <MatrixTable
          title={`输出 O · head ${trace.head}`}
          matrix={trace.output}
          rowLabels={tokenLabels}
          columnLabels={headDimensions}
          caption="当前注意力头的上下文输出矩阵"
          compact
          cornerLabel="token ＼ d"
        />
        <MatrixTable
          title={`V · head ${trace.head}`}
          matrix={trace.v}
          rowLabels={tokenLabels}
          columnLabels={headDimensions}
          caption="用于加权混合的 Value 矩阵"
          compact
          cornerLabel="token ＼ d"
        />
      </div>
      <p className="aw-annotation">
        每一行输出都位于同一行 V 的凸包内；行权重非负且和为 1。多头最终会
        <code>concat(O0, O1)</code>，再把 4 维送回输出投影。
      </p>
    </>
  );
}

function StepChecks({ trace, step }: { trace: AttentionTrace; step: number }) {
  const checks = useMemo(() => {
    switch (step) {
      case 0:
        return [
          ['输入形状', '[4,4]'],
          ['token 数', '4'],
          ['并行头数', '2'],
        ];
      case 1:
        return [
          ['Q / K / V', '各 [4,2]'],
          ['当前头', `head ${trace.head}`],
          ['投影参数', '3 × 4×2'],
        ];
      case 2:
        return [
          ['原始标准差', trace.rawStd.toFixed(3)],
          ['最大分数', formatNumber(trace.maxRaw.value)],
          ['最高位置', rankName(trace, trace.maxRaw.row, trace.maxRaw.column)],
        ];
      case 3:
        return [
          ['缩放标准差', trace.scaledStd.toFixed(3)],
          ['缩放因子', `√2 ≈ ${Math.sqrt(trace.headDim).toFixed(3)}`],
          ['排序变化', '无'],
        ];
      case 4:
        return [
          ['有效位置', `${trace.visibleCount} 格`],
          ['被屏蔽', `${trace.maskedCount} 格`],
          ['未来分数', '−1e9'],
        ];
      case 5:
        return [
          ['行和最大误差', trace.maxRowSumError.toExponential(1)],
          ['未来总权重', trace.futureWeight.toFixed(6)],
          ['最大单元权重', Math.max(...trace.weights.flat()).toFixed(4)],
        ];
      default:
        return [
          ['输出形状', '[4,2]'],
          ['权重形状', '[4,4]'],
          ['拼接后', '[4,4]'],
        ];
    }
  }, [step, trace]);

  return (
    <div className="aw-check-block">
      <div className="aw-inspector-label">本步核对</div>
      <dl className="aw-check-list">
        {checks.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function AttentionWorkbench() {
  const [head, setHead] = useState<AttentionHead>(0);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 4>(2);
  const [reduceMotion, setReduceMotion] = useState(false);

  const trace = useMemo(() => buildAttentionTrace(head), [head]);
  const meta = STEP_META[step];

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      setReduceMotion(query.matches);
      if (query.matches) setPlaying(false);
    };
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    if (!playing || reduceMotion) return;
    if (step >= LAST_STEP) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setStep((current) => Math.min(LAST_STEP, current + 1));
    }, 2100 / speed);
    return () => window.clearTimeout(timer);
  }, [playing, reduceMotion, speed, step]);

  const goToStep = (nextStep: number) => {
    setStep(Math.max(0, Math.min(LAST_STEP, nextStep)));
    setPlaying(false);
  };

  const togglePlayback = () => {
    if (reduceMotion) return;
    if (playing) {
      setPlaying(false);
      return;
    }
    if (step === LAST_STEP) setStep(0);
    setPlaying(true);
  };

  const reset = () => {
    setStep(0);
    setHead(0);
    setPlaying(false);
  };

  const sourceTables = [
    {
      title: 'Wq（已放大 4×）',
      matrix: trace.qProjection,
      caption: '当前头的 Query 固定投影权重',
    },
    {
      title: 'Wk（已放大 4×）',
      matrix: trace.kProjection,
      caption: '当前头的 Key 固定投影权重',
    },
    {
      title: 'Wv',
      matrix: trace.vProjection,
      caption: '当前头的 Value 固定投影权重',
    },
  ];

  return (
    <section className="attention-workbench" aria-labelledby="attention-workbench-title">
      <header className="aw-header">
        <div className="aw-heading">
          <div className="aw-eyebrow">
            <span className="aw-eyebrow-dot" aria-hidden="true" />
            数值实验台 · 单步可核对
          </div>
          <h2 id="attention-workbench-title">把缩放点积注意力真实算一遍</h2>
          <p>
            固定输入、固定投影，所有数字沿同一条前向链重算。你可以随时停下、回退，并检查每一行是否仍然满足注意力约束。
          </p>
        </div>
        <div className="aw-config" aria-label="固定实验配置">
          <span>B = {ATTENTION_CONFIG.batch}</span>
          <span>T = {ATTENTION_CONFIG.sequenceLength}</span>
          <span>d_model = {ATTENTION_CONFIG.modelDim}</span>
          <span>heads = {ATTENTION_CONFIG.heads}</span>
          <span>d_head = {ATTENTION_CONFIG.headDim}</span>
          <span className="aw-config-real">真实计算</span>
        </div>
      </header>

      <div className="aw-scope">
        <span className="aw-scope-label">边界</span>
        <p>
          <strong>真实计算</strong>指矩阵、softmax、掩码与输出均由代码现算；
          <strong>教学假设</strong>指输入和投影是为手算刻意缩小的固定值，不代表预训练模型的真实分布。
        </p>
      </div>

      <div className="aw-head-row">
        <div className="aw-head-switch" role="group" aria-label="选择注意力头">
          <button
            type="button"
            aria-pressed={head === 0}
            className={head === 0 ? 'active' : undefined}
            onClick={() => {
              setHead(0);
              setPlaying(false);
            }}
          >
            头 0 <small>d0–d1</small>
          </button>
          <button
            type="button"
            aria-pressed={head === 1}
            className={head === 1 ? 'active' : undefined}
            onClick={() => {
              setHead(1);
              setPlaying(false);
            }}
          >
            头 1 <small>d2–d3</small>
          </button>
        </div>
        <p>两个头并行计算；这里一次展开一个 d_head = 2 的切片，最终拼接回 4 维。</p>
      </div>

      <nav className="aw-step-tabs" aria-label="注意力计算步骤">
        {STEP_META.map((item, index) => (
          <button
            type="button"
            key={item.short}
            className={`aw-step-tab${index === step ? ' active' : ''}${index < step ? ' done' : ''}`}
            onClick={() => goToStep(index)}
            aria-current={index === step ? 'step' : undefined}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{item.short}</strong>
          </button>
        ))}
      </nav>

      <div className="aw-stage">
        <div className="aw-canvas">
          <div className="aw-canvas-head">
            <span className="aw-step-number">{String(step + 1).padStart(2, '0')}</span>
            <div>
              <h3>{meta.title}</h3>
              <p>{meta.operation}</p>
            </div>
          </div>
          <StepVisual trace={trace} step={step} />
          <p className="aw-scroll-hint">矩阵区域可横向滑动，查看全部列。</p>
          <div className="aw-shape-flow" aria-label="注意力形状流">
            <span className="active">X [4,4]</span>
            <i aria-hidden="true">→</i>
            <span>Q/K/V [4,2]</span>
            <i aria-hidden="true">→</i>
            <span>A [4,4]</span>
            <i aria-hidden="true">→</i>
            <span>O [4,2]</span>
          </div>
        </div>

        <aside className="aw-inspector" aria-label="当前步骤的解释与核对">
          <div className="aw-formula-block">
            <div className="aw-inspector-label">本步公式</div>
            <code>{meta.formula}</code>
          </div>
          <StepChecks trace={trace} step={step} />
          <StepPrompt trace={trace} step={step} />
        </aside>
      </div>

      <div className="aw-transport">
        <div className="aw-transport-buttons">
          <button type="button" className="aw-btn" onClick={reset}>
            重置
          </button>
          <button type="button" className="aw-btn" onClick={() => goToStep(step - 1)} disabled={step === 0}>
            上一步
          </button>
          <button
            type="button"
            className="aw-btn aw-btn--primary"
            onClick={togglePlayback}
            disabled={reduceMotion}
            title={reduceMotion ? '系统已启用减少动态效果，请使用上一步 / 下一步' : undefined}
          >
            {playing ? '暂停' : step === LAST_STEP ? '从头播放' : '播放'}
          </button>
          <button type="button" className="aw-btn" onClick={() => goToStep(step + 1)} disabled={step === LAST_STEP}>
            下一步
          </button>
        </div>

        <div className="aw-playback">
          <span className="aw-playback-count">
            步骤 <strong>{step + 1}</strong> / {STEP_META.length}
          </span>
          <div className="aw-speed" role="group" aria-label="播放速度">
            <span>速度</span>
            {([1, 2, 4] as const).map((value) => (
              <button
                type="button"
                key={value}
                className={speed === value ? 'active' : undefined}
                onClick={() => setSpeed(value)}
                aria-pressed={speed === value}
              >
                {value}×
              </button>
            ))}
          </div>
          {reduceMotion && <span className="aw-motion-note">已启用手动模式</span>}
        </div>
      </div>

      <div className="aw-progress-track" aria-hidden="true">
        <span style={{ width: `${((step + 1) / STEP_META.length) * 100}%` }} />
      </div>

      <details className="aw-source">
        <summary>查看固定输入与投影参数，按同一链手算复核</summary>
        <div className="aw-source-body">
          <p>
            X 为页面顶部的 4×4 输入；下面三张表是当前头的固定投影。计算顺序严格为
            <code>X → Q/K/V → QKᵀ → ÷√2 → mask → softmax → AV</code>。
          </p>
          <div className="aw-tensor-grid">
            {sourceTables.map((table) => (
              <MatrixTable
                key={table.title}
                title={table.title}
                matrix={table.matrix}
                rowLabels={['d0', 'd1', 'd2', 'd3']}
                columnLabels={['out0', 'out1']}
                caption={table.caption}
                compact
                cornerLabel="in ＼ out"
              />
            ))}
          </div>
        </div>
      </details>

      <footer className="aw-footer">
        <span>当前核对：每行 ΣA = 1，未来位置 A = 0，输出保持 [T, d_head]。</span>
        <span>固定输入 {ATTENTION_TOKENS.length} token · 无随机数</span>
      </footer>
    </section>
  );
}
