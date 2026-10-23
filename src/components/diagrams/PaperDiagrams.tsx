/**
 * 论文导读专用图示组件（SVG + CSS，零依赖）
 *
 * 用法：
 *   <SelfAttentionDemo />
 *   <AttentionMathDemo />
 *   <PositionalEncodingDemo />
 */

import { useEffect, useMemo, useState } from 'react';
import { Fragment } from 'react';
import './diagrams.css';

/* ══════════════════════════════════════════════
   1. 自注意力矩阵可视化
   ══════════════════════════════════════════════ */

const WORDS = ['小猫', '坐在', '垫子上', '它', '很困'];

/** 模拟注意力权重（行=Query，列=Key） */
const ATTENTION = [
  [0.62, 0.18, 0.12, 0.05, 0.03],
  [0.28, 0.42, 0.22, 0.05, 0.03],
  [0.22, 0.26, 0.44, 0.05, 0.03],
  [0.71, 0.06, 0.04, 0.14, 0.05],
  [0.12, 0.05, 0.04, 0.29, 0.50],
];

export function SelfAttentionDemo() {
  const [hoverRow, setHoverRow] = useState<number | null>(null);
  const [selectedRow, setSelectedRow] = useState(3);

  const activeRow = hoverRow ?? selectedRow;

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">
        自注意力：每个词"看"所有词，得到加权混合
      </figcaption>

      <div className="attn-demo">
        <div className="attn-grid-wrap">
          {/* 列标签（Key） */}
          <div className="attn-col-labels">
            {WORDS.map((w, i) => (
              <div
                key={i}
                className={`attn-label ${activeRow !== null && ATTENTION[activeRow][i] > 0.3 ? 'hot' : ''}`}
              >
                {w}
              </div>
            ))}
          </div>

          {/* 矩阵本体 */}
          <div className="attn-matrix">
            {ATTENTION.map((row, i) => (
              <div
                key={i}
                className={`attn-row ${i === activeRow ? 'active' : ''}`}
                onMouseEnter={() => setHoverRow(i)}
                onMouseLeave={() => setHoverRow(null)}
                onClick={() => setSelectedRow(i)}
              >
                <div className="attn-row-label">{WORDS[i]}</div>
                {row.map((v, j) => (
                  <div
                    key={j}
                    className="attn-cell"
                    style={{
                      background: `rgba(99, 102, 241, ${v * 1.6})`,
                      color: v > 0.35 ? '#fff' : 'var(--text-3)',
                    }}
                    title={`${WORDS[i]} → ${WORDS[j]}: ${v.toFixed(2)}`}
                  >
                    {v.toFixed(2)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="attn-explain">
          <div className="attn-explain-title">
            当前行：<b style={{ color: '#6366f1' }}>{WORDS[activeRow]}</b>
          </div>
          <div className="attn-explain-body">
            {activeRow === 3 ? (
              <>
                <b>「它」</b>把 <b>{(ATTENTION[3][0] * 100).toFixed(0)}%</b> 的注意力放在
                <b>「小猫」</b>上 —— 模型学到了<b>指代关系</b>。
                <br />
                这就是自注意力的价值：<b>它能自动发现词与词之间的语义关联</b>，
                而不需要人工标注。
              </>
            ) : activeRow === 4 ? (
              <>
                <b>「很困」</b>主要关注<b>「它」</b>（{(ATTENTION[4][3] * 100).toFixed(0)}%）
                和自身（{(ATTENTION[4][4] * 100).toFixed(0)}%）——
                它在描述"谁困"，所以需要先找到主语。
              </>
            ) : (
              <>
                <b>「{WORDS[activeRow]}」</b>的注意力分布：
                {WORDS.map((w, j) =>
                  ATTENTION[activeRow][j] > 0.15 ? (
                    <span key={j} style={{ marginLeft: 6 }}>
                      {w} {(ATTENTION[activeRow][j] * 100).toFixed(0)}%
                    </span>
                  ) : null,
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="diagram-caption">
        每一行是一个 <b>Query</b>（"我在找什么"），每一列是一个 <b>Key</b>（"我能提供什么"）。
        每行权重之和为 1。<b>鼠标悬停查看不同词的注意力分布</b>。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   2. 注意力计算步骤动画
   ══════════════════════════════════════════════ */

const STEPS = [
  {
    name: '① QK^T',
    desc: '每个 Query 与每个 Key 做点积，得到相似度矩阵',
    formula: 'scores = Q @ K.T',
    color: '#6366f1',
    shape: 'n × n',
  },
  {
    name: '② 缩放',
    desc: '除以 √d_k，把方差拉回 1，防止 softmax 饱和',
    formula: 'scores = scores / √d_k',
    color: '#f59e0b',
    shape: 'n × n',
  },
  {
    name: '③ 掩码',
    desc: '解码器需要屏蔽未来位置（设为 -1e9）',
    formula: 'scores = where(mask, scores, -1e9)',
    color: '#ef4444',
    shape: 'n × n',
  },
  {
    name: '④ softmax',
    desc: '每行归一化成概率分布（和为 1）',
    formula: 'weights = softmax(scores)',
    color: '#7c5cff',
    shape: 'n × n',
  },
  {
    name: '⑤ 加权求和',
    desc: '用权重对 Value 加权混合',
    formula: 'output = weights @ V',
    color: '#22c55e',
    shape: 'n × d_v',
  },
];

export function AttentionMathDemo() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return undefined;
    const t = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 2400);
    return () => clearInterval(t);
  }, [playing]);

  const cur = STEPS[step];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">缩放点积注意力的五个计算步骤</figcaption>

      <div className="attn-steps">
        {STEPS.map((s, i) => (
          <div
            key={i}
            className={`attn-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
            style={{ '--step-color': s.color } as React.CSSProperties}
            onClick={() => { setStep(i); setPlaying(false); }}
          >
            <span className="attn-step-name">{s.name}</span>
            <span className="attn-step-shape">{s.shape}</span>
          </div>
        ))}
      </div>

      <div className="attn-step-detail" style={{ borderColor: cur.color }}>
        <div className="attn-step-formula">
          <code style={{ color: cur.color }}>{cur.formula}</code>
        </div>
        <div className="attn-step-desc">{cur.desc}</div>
      </div>

      <div className="attn-controls">
        <button type="button" className="apriori-play-btn" onClick={() => setPlaying((p) => !p)}>
          {playing ? '⏸ 暂停' : '▶ 播放'}
        </button>
      </div>

      <div className="diagram-caption">
        输入 <code>Q: n×d_k</code>，<code>K: n×d_k</code>，<code>V: n×d_v</code>。
        最终输出 <code>n×d_v</code> —— 形状与 V 相同，但每个位置都融合了全局信息。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   3. 位置编码可视化
   ══════════════════════════════════════════════ */

export function PositionalEncodingDemo() {
  const [dimCount, setDimCount] = useState(4);
  const maxPos = 32;

  // 生成位置编码（与论文公式一致）
  const encodings = useMemo(() => {
    const pe: number[][] = [];
    for (let pos = 0; pos < maxPos; pos++) {
      const row: number[] = [];
      for (let i = 0; i < dimCount; i++) {
        const divTerm = Math.pow(10000, (2 * Math.floor(i / 2)) / (dimCount * 2));
        const angle = pos / divTerm;
        row.push(i % 2 === 0 ? Math.sin(angle) : Math.cos(angle));
      }
      pe.push(row);
    }
    return pe;
  }, [dimCount]);

  const COLORS = ['#6366f1', '#f59e0b', '#22c55e', '#ec4899', '#0891b2', '#7c5cff'];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">正弦位置编码：每个位置有独特的"指纹"</figcaption>

      <div className="pos-controls">
        <label>
          维度数
          <input
            type="range" min="2" max="6" step="2" value={dimCount}
            onChange={(e) => setDimCount(parseInt(e.target.value, 10))}
          />
          <b>{dimCount}</b>
        </label>
      </div>

      <svg viewBox={`0 0 ${maxPos * 14 + 20} 120`} className="pos-svg" role="img" aria-label="位置编码">
        {/* 零线 */}
        <line x1="10" y1="60" x2={maxPos * 14 + 10} y2="60" stroke="#e2e8f0" strokeWidth="1" />

        {Array.from({ length: dimCount }).map((_, i) => {
          const color = COLORS[i % COLORS.length];
          const points = encodings
            .map((row, pos) => `${10 + pos * 14},${60 - row[i] * 45}`)
            .join(' ');
          return (
            <g key={i}>
              <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              {encodings.map((row, pos) => (
                <circle
                  key={pos}
                  cx={10 + pos * 14}
                  cy={60 - row[i] * 45}
                  r="1.8"
                  fill={color}
                />
              ))}
            </g>
          );
        })}
      </svg>

      <div className="pos-legend">
        {Array.from({ length: dimCount }).map((_, i) => (
          <span key={i} className="pos-legend-item">
            <span className="pos-dot" style={{ background: COLORS[i % COLORS.length] }} />
            dim {i} ({i % 2 === 0 ? 'sin' : 'cos'})
          </span>
        ))}
      </div>

      <div className="diagram-caption">
        <b>低维变化慢</b>（编码大范围位置），<b>高维变化快</b>（编码精细位置）。
        多个频率叠加 → 每个位置有独一无二的编码。
        <br />
        关键性质：<b>任意位置之间的相对距离可由编码线性推导</b>，所以模型能理解"隔了几个词"。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   4. 激活函数对比
   ══════════════════════════════════════════════ */

const ACTIVATIONS = [
  {
    name: 'Sigmoid',
    color: '#ef4444',
    formula: 'f(x) = 1/(1+e⁻ˣ)',
    gradMax: 0.25,
    problem: '梯度最大只有 0.25，深层连乘后趋近 0',
    fn: (x: number) => 1 / (1 + Math.exp(-x)),
    grad: (x: number) => {
      const s = 1 / (1 + Math.exp(-x));
      return s * (1 - s);
    },
  },
  {
    name: 'Tanh',
    color: '#f59e0b',
    formula: 'f(x) = tanh(x)',
    gradMax: 1.0,
    problem: '梯度最大 1，但两端饱和后仍会衰减',
    fn: (x: number) => Math.tanh(x),
    grad: (x: number) => 1 - Math.tanh(x) ** 2,
  },
  {
    name: 'ReLU',
    color: '#22c55e',
    formula: 'f(x) = max(0, x)',
    gradMax: 1.0,
    problem: 'x>0 时梯度恒为 1，不衰减；但负区可能"神经元死亡"',
    fn: (x: number) => Math.max(0, x),
    grad: (x: number) => (x > 0 ? 1 : 0),
  },
];

export function ActivationCompareDemo() {
  const [sel, setSel] = useState(2);
  const cur = ACTIVATIONS[sel];

  const W = 300;
  const H = 140;
  const xRange = [-5, 5];
  const toX = (x: number) => ((x - xRange[0]) / (xRange[1] - xRange[0])) * W;
  const toY = (y: number) => H / 2 - y * (H / 2.6);

  const path = (f: (x: number) => number) => {
    const pts: string[] = [];
    for (let i = 0; i <= 100; i++) {
      const x = xRange[0] + ((xRange[1] - xRange[0]) * i) / 100;
      pts.push(`${toX(x).toFixed(1)},${toY(f(x)).toFixed(1)}`);
    }
    return `M${pts.join(' L')}`;
  };

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">激活函数对比：梯度是否衰减决定了能堆多深</figcaption>

      <div className="pattern-tabs">
        {ACTIVATIONS.map((a, i) => (
          <button
            key={a.name}
            type="button"
            className={`pattern-tab ${i === sel ? 'active' : ''}`}
            style={{ '--tab-color': a.color } as React.CSSProperties}
            onClick={() => setSel(i)}
          >
            {a.name}
          </button>
        ))}
      </div>

      <svg viewBox={`-10 -10 ${W + 20} ${H + 20}`} className="activation-svg" role="img" aria-label={cur.name}>
        {/* 坐标轴 */}
        <line x1={toX(0)} y1="0" x2={toX(0)} y2={H} stroke="#e2e8f0" strokeWidth="1" />
        <line x1="0" y1={toY(0)} x2={W} y2={toY(0)} stroke="#e2e8f0" strokeWidth="1" />

        {/* 函数曲线 */}
        <path d={path(cur.fn)} fill="none" stroke={cur.color} strokeWidth="2.5" strokeLinecap="round" />

        {/* 导数曲线（虚线） */}
        <path
          d={path(cur.grad)}
          fill="none"
          stroke={cur.color}
          strokeWidth="1.5"
          strokeDasharray="4 3"
          opacity="0.55"
        />
      </svg>

      <div className="activation-legend">
        <span><span className="pos-dot" style={{ background: cur.color }} /> 函数</span>
        <span><span className="pos-dot" style={{ background: cur.color, opacity: 0.5 }} /> 导数</span>
      </div>

      <div className="activation-info" style={{ borderColor: cur.color }}>
        <div className="activation-formula"><code style={{ color: cur.color }}>{cur.formula}</code></div>
        <div className="activation-grad">
          最大梯度：<b style={{ color: cur.color }}>{cur.gradMax}</b>
          {cur.gradMax < 1 && (
            <span style={{ marginLeft: 8, color: '#ef4444' }}>
              → 10 层后衰减到 {(cur.gradMax ** 10).toExponential(1)}
            </span>
          )}
          {cur.gradMax === 1 && cur.name === 'ReLU' && (
            <span style={{ marginLeft: 8, color: '#22c55e' }}>→ 10 层后仍是 1.0</span>
          )}
        </div>
        <div className="activation-problem">{cur.problem}</div>
      </div>

      <div className="diagram-caption">
        <b>这就是为什么 AlexNet 用 ReLU 能训到 8 层，而 ResNet 能训到 152 层</b>——
        梯度不衰减是深层网络的前提。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   5. 特征工程天花板
   ══════════════════════════════════════════════ */

const HANDCRAFTED = [
  { name: 'SIFT', what: '尺度不变关键点', year: 1999, level: '边缘/角点', color: '#94a3b8' },
  { name: 'HOG', what: '梯度方向直方图', year: 2005, level: '轮廓', color: '#94a3b8' },
  { name: 'LBP', what: '局部二值模式', year: 1994, level: '纹理', color: '#94a3b8' },
];

const LEARNED = [
  { name: '第 1 层', what: '边缘、颜色斑块', color: '#22c55e' },
  { name: '第 2 层', what: '角点、纹理、形状', color: '#0891b2' },
  { name: '第 3 层', what: '物体部件（轮子/眼睛）', color: '#f59e0b' },
  { name: '第 4-5 层', what: '完整物体、场景', color: '#ec4899' },
];

export function FeatureEngineeringDemo() {
  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">特征工程的天花板：人只能想到低级特征</figcaption>

      <div className="fe-compare">
        <div className="fe-side">
          <div className="fe-title" style={{ color: '#94a3b8' }}>
            传统方法（人设计）
          </div>
          {HANDCRAFTED.map((f) => (
            <div key={f.name} className="fe-item" style={{ borderColor: f.color }}>
              <div className="fe-item-head">
                <b>{f.name}</b>
                <span className="fe-year">{f.year}</span>
              </div>
              <div className="fe-what">{f.what}</div>
              <div className="fe-level">层级：{f.level}</div>
            </div>
          ))}
          <div className="fe-ceiling">
            ⚠️ 天花板：无法表达"猫的耳朵"这种高级概念
          </div>
        </div>

        <div className="fe-arrow">→</div>

        <div className="fe-side">
          <div className="fe-title" style={{ color: '#22c55e' }}>
            AlexNet（自己学）
          </div>
          {LEARNED.map((f) => (
            <div key={f.name} className="fe-item" style={{ borderColor: f.color }}>
              <div className="fe-item-head">
                <b style={{ color: f.color }}>{f.name}</b>
              </div>
              <div className="fe-what">{f.what}</div>
            </div>
          ))}
          <div className="fe-breakthrough">
            ✨ 突破：第 3 层之后人根本设计不出来
          </div>
        </div>
      </div>

      <div className="diagram-caption">
        传统方法中，<b>人只能想到边缘、角点、纹理这些低级特征</b>。
        AlexNet 让 CNN 自己学到"物体部件"这种高级概念——
        <b>这就是端到端学习的威力</b>。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   6. 三个条件
   ══════════════════════════════════════════════ */

const CONDITIONS = [
  {
    name: '数据',
    icon: '📊',
    detail: 'ImageNet 120 万张',
    why: '6000 万参数在 9000 张图上严重过拟合',
    color: '#0891b2',
  },
  {
    name: '算力',
    icon: '⚡',
    detail: 'GTX 580 ×2 + CUDA',
    why: '训练从数月降到 5~6 天',
    color: '#f59e0b',
  },
  {
    name: '算法',
    icon: '🧮',
    detail: 'ReLU + Dropout',
    why: 'ReLU 解决梯度消失，8 层才能训',
    color: '#22c55e',
  },
];

export function ThreeConditionsDemo() {
  const [hover, setHover] = useState<number | null>(null);

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">为什么是 2012 年：三个条件缺一不可</figcaption>

      <div className="cond-row">
        {CONDITIONS.map((c, i) => (
          <div
            key={c.name}
            className={`cond-card ${hover === i ? 'hover' : ''}`}
            style={{ borderColor: c.color }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <div className="cond-icon">{c.icon}</div>
            <div className="cond-name" style={{ color: c.color }}>{c.name}</div>
            <div className="cond-detail">{c.detail}</div>
            <div className="cond-why">{c.why}</div>
          </div>
        ))}
      </div>

      <div className="cond-venn">
        <svg viewBox="0 0 240 90" className="venn-svg" role="img" aria-label="三条件交汇">
          <circle cx="90" cy="45" r="38" fill="rgba(8,145,178,0.15)" stroke="#0891b2" strokeWidth="1.5" />
          <circle cx="150" cy="45" r="38" fill="rgba(245,158,11,0.15)" stroke="#f59e0b" strokeWidth="1.5" />
          <circle cx="120" cy="25" r="38" fill="rgba(34,197,94,0.15)" stroke="#22c55e" strokeWidth="1.5" />
          <text x="120" y="46" textAnchor="middle" fontSize="7" fontWeight="700" fill="#1e293b">
            AlexNet
          </text>
          <text x="120" y="55" textAnchor="middle" fontSize="5.5" fill="#64748b">
            2012
          </text>
        </svg>
      </div>

      <div className="diagram-caption">
        <b>缺任何一个都不行</b>：缺数据→过拟合；缺算力→训不动；缺 ReLU→梯度消失。
        2010 年之前三者都不具备，所以更早做不出来。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   7. AlexNet 架构图
   ══════════════════════════════════════════════ */

const ALEX_LAYERS = [
  { name: 'Input', spec: '224×224×3', size: '224', color: '#64748b' },
  { name: 'Conv1', spec: '96×11×11 s4', size: '55', color: '#2f6bff' },
  { name: 'Pool1', spec: '3×3 s2', size: '27', color: '#7c5cff' },
  { name: 'Conv2', spec: '256×5×5', size: '27', color: '#2f6bff' },
  { name: 'Pool2', spec: '3×3 s2', size: '13', color: '#7c5cff' },
  { name: 'Conv3-5', spec: '384/384/256×3×3', size: '13', color: '#2f6bff' },
  { name: 'Pool3', spec: '3×3 s2', size: '6', color: '#7c5cff' },
  { name: 'FC1-2', spec: '4096+4096', size: '—', color: '#f59e0b' },
  { name: 'FC3', spec: '1000', size: '—', color: '#22c55e' },
];

export function AlexNetArchDemo() {
  const [sel, setSel] = useState(1);

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">AlexNet 结构：8 层（5 卷积 + 3 全连接）</figcaption>

      <div className="alex-arch">
        {ALEX_LAYERS.map((l, i) => (
          <div
            key={l.name}
            className={`alex-layer ${i === sel ? 'active' : ''}`}
            style={{ '--alex-color': l.color } as React.CSSProperties}
            onClick={() => setSel(i)}
          >
            <div className="alex-box" style={{ borderColor: l.color, background: `${l.color}12` }}>
              <div className="alex-name" style={{ color: l.color }}>{l.name}</div>
              <div className="alex-spec">{l.spec}</div>
            </div>
            <div className="alex-size">{l.size}</div>
          </div>
        ))}
      </div>

      <div className="alex-detail">
        当前：<b style={{ color: ALEX_LAYERS[sel].color }}>{ALEX_LAYERS[sel].name}</b>
        {' — '}
        {ALEX_LAYERS[sel].spec}
        {ALEX_LAYERS[sel].size !== '—' && `，空间尺寸 ${ALEX_LAYERS[sel].size}×${ALEX_LAYERS[sel].size}`}
      </div>

      <div className="diagram-caption">
        蓝色是卷积（提特征），紫色是池化（降尺寸），橙色是巨大的全连接层，
        绿色是输出。<b>注意 6×6×256 = 9216 之后接 4096——这一层就有 3775 万参数。</b>
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   8. 参数量分布
   ══════════════════════════════════════════════ */

const PARAM_DATA = [
  { name: 'Conv1', params: 34944, color: '#2f6bff' },
  { name: 'Conv2', params: 614656, color: '#2f6bff' },
  { name: 'Conv3', params: 885120, color: '#2f6bff' },
  { name: 'Conv4', params: 1327488, color: '#2f6bff' },
  { name: 'Conv5', params: 884992, color: '#2f6bff' },
  { name: 'FC1', params: 37752832, color: '#ef4444' },
  { name: 'FC2', params: 16781312, color: '#f59e0b' },
  { name: 'FC3', params: 4097000, color: '#22c55e' },
];

export function ParamDistributionDemo() {
  const total = PARAM_DATA.reduce((s, d) => s + d.params, 0);
  const convTotal = PARAM_DATA.filter((d) => d.name.startsWith('Conv')).reduce((s, d) => s + d.params, 0);

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">参数量分布：96% 在全连接层</figcaption>

      <div className="param-bars">
        {PARAM_DATA.map((d) => {
          const pct = (d.params / total) * 100;
          return (
            <div key={d.name} className="param-row">
              <div className="param-name">{d.name}</div>
              <div className="param-track">
                <div
                  className="param-fill"
                  style={{
                    width: `${Math.max(pct, 0.5)}%`,
                    background: d.color,
                  }}
                />
              </div>
              <div className="param-val" style={{ color: d.color }}>
                {(d.params / 1e6).toFixed(2)}M
              </div>
              <div className="param-pct">{pct.toFixed(1)}%</div>
            </div>
          );
        })}
      </div>

      <div className="param-summary">
        <span>卷积层合计：<b style={{ color: '#2f6bff' }}>{(convTotal / 1e6).toFixed(2)}M</b>（{(convTotal / total * 100).toFixed(1)}%）</span>
        <span>全连接层合计：<b style={{ color: '#ef4444' }}>{((total - convTotal) / 1e6).toFixed(2)}M</b>（{((total - convTotal) / total * 100).toFixed(1)}%）</span>
      </div>

      <div className="diagram-caption">
        <b>FC1 一层（3775 万）比所有卷积层加起来（约 406 万）多 9 倍。</b>
        这带来三个问题：参数易过拟合、丢失空间信息、限制输入尺寸。
        <b>这就是 ResNet 用 GAP 替代全连接层的动机。</b>
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   9. MDL 权衡
   ══════════════════════════════════════════════ */

const MDL_MODELS = [
  { degree: 0, name: '常数', modelBits: 32, dataBits: 420, color: '#94a3b8' },
  { degree: 1, name: '直线', modelBits: 64, dataBits: 180, color: '#22c55e' },
  { degree: 2, name: '二次', modelBits: 96, dataBits: 165, color: '#0891b2' },
  { degree: 3, name: '三次', modelBits: 128, dataBits: 160, color: '#f59e0b' },
  { degree: 5, name: '五次', modelBits: 192, dataBits: 155, color: '#ef4444' },
  { degree: 7, name: '七次', modelBits: 256, dataBits: 152, color: '#7f1d1d' },
];

export function MDLTradeoffDemo() {
  const [sel, setSel] = useState(1);
  const maxTotal = Math.max(...MDL_MODELS.map((m) => m.modelBits + m.dataBits));
  const best = MDL_MODELS.reduce((a, b) =>
    a.modelBits + a.dataBits < b.modelBits + b.dataBits ? a : b,
  );

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">MDL 的权衡：模型长度 + 数据长度 = 总长度</figcaption>

      <div className="mdl-chart">
        {MDL_MODELS.map((m, i) => {
          const total = m.modelBits + m.dataBits;
          const isBest = m.degree === best.degree;
          return (
            <div
              key={m.degree}
              className={`mdl-row ${i === sel ? 'active' : ''} ${isBest ? 'best' : ''}`}
              onClick={() => setSel(i)}
            >
              <div className="mdl-name">
                {m.name}
                {isBest && <span className="mdl-badge">最优</span>}
              </div>
              <div className="mdl-bar-track">
                <div
                  className="mdl-bar-model"
                  style={{ width: `${(m.modelBits / maxTotal) * 100}%`, background: '#7c5cff' }}
                  title={`模型 ${m.modelBits} 比特`}
                />
                <div
                  className="mdl-bar-data"
                  style={{ width: `${(m.dataBits / maxTotal) * 100}%`, background: m.color }}
                  title={`数据 ${m.dataBits} 比特`}
                />
              </div>
              <div className="mdl-total" style={{ color: isBest ? '#22c55e' : 'var(--text-2)' }}>
                {total}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mdl-legend">
        <span><span className="pos-dot" style={{ background: '#7c5cff' }} /> 模型长度 L(模型)</span>
        <span><span className="pos-dot" style={{ background: '#22c55e' }} /> 数据长度 L(数据|模型)</span>
      </div>

      <div className="mdl-detail">
        当前：<b>{MDL_MODELS[sel].name}</b> —
        模型 {MDL_MODELS[sel].modelBits} + 数据 {MDL_MODELS[sel].dataBits} =
        <b style={{ color: MDL_MODELS[sel].color }}> {MDL_MODELS[sel].modelBits + MDL_MODELS[sel].dataBits} 比特</b>
      </div>

      <div className="diagram-caption">
        阶数升高 → <b style={{ color: '#7c5cff' }}>模型部分变长</b>（参数更多），
        但<b style={{ color: '#22c55e' }}>数据部分变短</b>（拟合更好）。
        <b>直线（1 阶）总长度最小</b>——这正是 MDL 自动选择的结果。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   10. AIC vs BIC
   ══════════════════════════════════════════════ */

export function AICvsBICDemo() {
  const [n, setN] = useState(30);
  const lnN = Math.log(n);

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">AIC vs BIC：惩罚系数的差异</figcaption>

      <div className="pos-controls">
        <label>
          样本数 n
          <input
            type="range" min="10" max="1000" step="10" value={n}
            onChange={(e) => setN(parseInt(e.target.value, 10))}
          />
          <b>{n}</b>
        </label>
      </div>

      <div className="aic-bic-bars">
        <div className="ab-row">
          <span className="ab-label">AIC 惩罚</span>
          <div className="ab-track">
            <div style={{ width: `${Math.min((2 / Math.max(lnN, 2)) * 100, 100)}%`, background: '#2f6bff' }} />
          </div>
          <span className="ab-val" style={{ color: '#2f6bff' }}>2k</span>
        </div>
        <div className="ab-row">
          <span className="ab-label">BIC 惩罚</span>
          <div className="ab-track">
            <div style={{ width: '100%', background: '#f59e0b' }} />
          </div>
          <span className="ab-val" style={{ color: '#f59e0b' }}>{lnN.toFixed(2)}k</span>
        </div>
      </div>

      <div className="aic-bic-note">
        {lnN > 2 ? (
          <>
            ln({n}) = <b>{lnN.toFixed(2)}</b> &gt; 2，
            <b style={{ color: '#f59e0b' }}> BIC 惩罚更重</b> → 更偏向简单模型
          </>
        ) : (
          <>
            ln({n}) = <b>{lnN.toFixed(2)}</b> &lt; 2，
            <b style={{ color: '#2f6bff' }}> AIC 惩罚更重</b>（小样本时 BIC 反而宽松）
          </>
        )}
      </div>

      <div className="diagram-caption">
        <b>AIC 惩罚 2k</b>（固定），<b>BIC 惩罚 k·ln(n)</b>（随样本增长）。
        当 n &gt; 8 时 ln(n) &gt; 2，BIC 更保守。
        <b>AIC 适合预测，BIC 适合识别真实模型</b>。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   11. 多项式 MDL 选择
   ══════════════════════════════════════════════ */

export function PolynomialMDLDemo() {
  const [degree, setDegree] = useState(1);

  // 模拟 20 个点
  const points = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    const seed = (n: number) => {
      const x = Math.sin(n * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };
    for (let i = 0; i < 20; i++) {
      const x = (i / 19) * 5;
      const noise = (seed(i + 1) - 0.5) * 1.0;
      pts.push({ x, y: 2 * x + 1 + noise });
    }
    return pts;
  }, []);

  // 简化的多项式拟合（最小二乘）
  const fitCurve = (deg: number) => {
    const n = points.length;
    const A: number[][] = [];
    const b: number[] = [];
    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j <= deg; j++) row.push(Math.pow(points[i].x, j));
      A.push(row);
      b.push(points[i].y);
    }
    // 正规方程 (A^T A)^-1 A^T b
    const AT = A[0].map((_, j) => A.map((row) => row[j]));
    const ATA = AT.map((r1) => A[0].map((_, j) => r1.reduce((s, v, k) => s + v * A[k][j], 0)));
    const ATb = AT.map((r) => r.reduce((s, v, k) => s + v * b[k], 0));

    // 高斯消元
    const m = ATA.length;
    const aug = ATA.map((row, i) => [...row, ATb[i]]);
    for (let i = 0; i < m; i++) {
      let piv = i;
      for (let k = i + 1; k < m; k++) if (Math.abs(aug[k][i]) > Math.abs(aug[piv][i])) piv = k;
      [aug[i], aug[piv]] = [aug[piv], aug[i]];
      if (Math.abs(aug[i][i]) < 1e-12) continue;
      for (let k = i + 1; k < m; k++) {
        const f = aug[k][i] / aug[i][i];
        for (let j = i; j <= m; j++) aug[k][j] -= f * aug[i][j];
      }
    }
    const coeffs = new Array(m).fill(0);
    for (let i = m - 1; i >= 0; i--) {
      let s = aug[i][m];
      for (let j = i + 1; j < m; j++) s -= aug[i][j] * coeffs[j];
      coeffs[i] = Math.abs(aug[i][i]) > 1e-12 ? s / aug[i][i] : 0;
    }
    return coeffs;
  };

  const coeffs = useMemo(() => fitCurve(degree), [degree, points]);
  const W = 340;
  const H = 200;
  const toX = (x: number) => (x / 5) * (W - 30) + 20;
  const toY = (y: number) => H - 25 - ((y - -2) / 16) * (H - 40);

  const curvePath = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 100; i++) {
      const x = (i / 100) * 5;
      const y = coeffs.reduce((s, c, j) => s + c * Math.pow(x, j), 0);
      pts.push(`${toX(x).toFixed(1)},${toY(y).toFixed(1)}`);
    }
    return `M${pts.join(' L')}`;
  }, [coeffs]);

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">拖动阶数看 MDL 如何权衡（真实模型是直线）</figcaption>

      <div className="pos-controls">
        <label>
          多项式阶数
          <input
            type="range" min="0" max="7" step="1" value={degree}
            onChange={(e) => setDegree(parseInt(e.target.value, 10))}
          />
          <b>{degree}</b>
        </label>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="poly-svg" role="img" aria-label="多项式拟合">
        <line x1="20" y1={H - 25} x2={W - 10} y2={H - 25} stroke="#e2e8f0" strokeWidth="1" />
        <line x1="20" y1="15" x2="20" y2={H - 25} stroke="#e2e8f0" strokeWidth="1" />
        <path d={curvePath} fill="none" stroke={degree <= 2 ? '#22c55e' : '#ef4444'} strokeWidth="2.2" />
        {points.map((p, i) => (
          <circle key={i} cx={toX(p.x)} cy={toY(p.y)} r="2.8" fill="#2f6bff" opacity="0.75" />
        ))}
      </svg>

      <div className="poly-note" style={{ borderColor: degree <= 2 ? '#22c55e' : '#ef4444' }}>
        {degree === 0 && '常数模型：模型最短（32 比特），但残差很大，数据部分很长'}
        {degree === 1 && '✓ 直线：真实模型，MDL 总长度最小'}
        {degree === 2 && '二次：略优于直线拟合，但模型多 32 比特'}
        {degree >= 3 && `⚠ ${degree} 次：完美穿过所有点（残差≈0），但模型描述需要 ${(degree + 1) * 32} 比特，总长度反而更大`}
      </div>

      <div className="diagram-caption">
        <b>高阶模型"记住"了噪声</b>——曲线开始剧烈抖动。
        MDL 通过惩罚模型长度自动拒绝这种过拟合。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   12. RNN 展开图
   ══════════════════════════════════════════════ */

const RNN_STEPS = 5;

export function RNNUnrollDemo() {
  const [sel, setSel] = useState(2);

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">RNN 沿时间展开：隐藏状态在时间步之间传递</figcaption>

      <div className="rnn-unroll">
        <svg viewBox="0 0 400 150" className="rnn-svg" role="img" aria-label="RNN 展开">
          <defs>
            <marker id="rnn-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
            </marker>
          </defs>

          {Array.from({ length: RNN_STEPS }).map((_, i) => {
            const cx = 45 + i * 75;
            const isActive = i === sel;
            const isPast = i < sel;
            return (
              <g key={i}>
                {/* 输入 */}
                <rect
                  x={cx - 16} y={112} width="32" height="20" rx="3"
                  fill={isActive ? '#2f6bff' : '#2f6bff18'}
                  stroke="#2f6bff" strokeWidth="1.3"
                />
                <text x={cx} y={125} textAnchor="middle" fontSize="7"
                  fill={isActive ? '#fff' : '#2f6bff'} fontWeight="600">x{i + 1}</text>

                {/* 箭头 输入->隐藏 */}
                <line x1={cx} y1={112} x2={cx} y2={92} stroke="#94a3b8" strokeWidth="1.2" markerEnd="url(#rnn-arrow)" />

                {/* 隐藏状态 */}
                <circle
                  cx={cx} cy={72} r="17"
                  fill={isActive ? '#7c5cff' : isPast ? '#7c5cff30' : '#7c5cff14'}
                  stroke="#7c5cff" strokeWidth={isActive ? 2.2 : 1.3}
                  style={{ transition: 'all 0.3s' }}
                />
                <text x={cx} y={75} textAnchor="middle" fontSize="8"
                  fill={isActive ? '#fff' : '#7c5cff'} fontWeight="700">h{i + 1}</text>

                {/* 箭头 隐藏->隐藏 */}
                {i < RNN_STEPS - 1 && (
                  <line
                    x1={cx + 17} y1={72} x2={cx + 58} y2={72}
                    stroke={i < sel ? '#7c5cff' : '#cbd5e1'}
                    strokeWidth={i < sel ? 2 : 1.2}
                    markerEnd="url(#rnn-arrow)"
                  />
                )}

                {/* 箭头 隐藏->输出 */}
                <line x1={cx} y1={55} x2={cx} y2={38} stroke="#94a3b8" strokeWidth="1.2" markerEnd="url(#rnn-arrow)" />

                {/* 输出 */}
                <rect
                  x={cx - 15} y={16} width="30" height="20" rx="3"
                  fill={isActive ? '#22c55e' : '#22c55e18'}
                  stroke="#22c55e" strokeWidth="1.3"
                />
                <text x={cx} y={29} textAnchor="middle" fontSize="6.5"
                  fill={isActive ? '#fff' : '#22c55e'} fontWeight="600">y{i + 1}</text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="rnn-legend">
        <span><span className="pos-dot" style={{ background: '#2f6bff' }} /> 输入 x</span>
        <span><span className="pos-dot" style={{ background: '#7c5cff' }} /> 隐藏 h（记忆）</span>
        <span><span className="pos-dot" style={{ background: '#22c55e' }} /> 输出 y</span>
      </div>

      <div className="rnn-detail">
        {sel > 0 ? (
          <>
            <b style={{ color: '#7c5cff' }}>h{sel + 1}</b> = tanh(
            <b style={{ color: '#2f6bff' }}>Wxh·x{sel + 1}</b> +
            <b style={{ color: '#7c5cff' }}>Whh·h{sel}</b> + bh)
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              注意：<b>W_hh 在所有时间步共享</b>——这是参数量与序列长度无关的原因，也是梯度连乘的根源。
            </span>
          </>
        ) : (
          <>
            <b style={{ color: '#7c5cff' }}>h1</b> = tanh(
            <b style={{ color: '#2f6bff' }}>Wxh·x1</b> + bh)
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              第一步没有历史，h0 通常初始化为零向量。
            </span>
          </>
        )}
      </div>

      <div className="diagram-caption">
        点击任意时间步查看公式。横向的紫色箭头就是"循环"——
        <b>同一个 W_hh 被重复使用</b>，这让 RNN 能处理任意长度，但也让梯度必须连乘。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   13. 梯度消失演示
   ══════════════════════════════════════════════ */

export function VanishingGradientDemo() {
  const [decay, setDecay] = useState(0.25);

  const steps = Array.from({ length: 50 }, (_, i) => i + 1);
  const values = steps.map((t) => Math.pow(decay, t));
  const logMax = Math.log10(Math.max(...values));
  const logMin = -30;

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">梯度消失：沿时间步连乘的指数衰减</figcaption>

      <div className="pos-controls">
        <label>
          每步衰减系数
          <input
            type="range" min="0.1" max="0.95" step="0.05" value={decay}
            onChange={(e) => setDecay(parseFloat(e.target.value))}
          />
          <b>{decay.toFixed(2)}</b>
        </label>
      </div>

      <div className="vg-chart">
        <svg viewBox="0 0 400 140" className="vg-svg" role="img" aria-label="梯度衰减">
          {/* 网格 */}
          {[0, -10, -20, -30].map((lg, i) => {
            const y = 10 + (i / 3) * 110;
            return (
              <g key={lg}>
                <line x1="35" y1={y} x2="390" y2={y} stroke="#e2e8f0" strokeWidth="0.8" />
                <text x="30" y={y + 3} textAnchor="end" fontSize="7" fill="#94a3b8">1e{lg}</text>
              </g>
            );
          })}

          {/* 曲线 */}
          <path
            d={steps
              .map((t, i) => {
                const lg = Math.max(Math.log10(values[i]), logMin);
                const y = 10 + ((0 - lg) / 30) * 110;
                const x = 35 + (i / 49) * 355;
                return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(' ')}
            fill="none"
            stroke={decay < 0.5 ? '#ef4444' : decay < 0.8 ? '#f59e0b' : '#22c55e'}
            strokeWidth="2.2"
          />
        </svg>
      </div>

      <div className="vg-stats">
        <span>第 10 步：<b>{(Math.pow(decay, 10)).toExponential(2)}</b></span>
        <span>第 30 步：<b>{(Math.pow(decay, 30)).toExponential(2)}</b></span>
        <span>第 50 步：<b>{(Math.pow(decay, 50)).toExponential(2)}</b></span>
      </div>

      <div className="vg-note" style={{ borderColor: decay < 0.5 ? '#ef4444' : '#22c55e' }}>
        {decay <= 0.3 && '典型 RNN（tanh 导数 ~0.25）：20 步后梯度已到 1e-12，完全消失。学不到长距离依赖。'}
        {decay > 0.3 && decay <= 0.7 && '中等衰减：仍会消失，但慢一些。梯度裁剪能防爆炸，但防不了消失。'}
        {decay > 0.7 && decay <= 0.9 && '较强保持：需要正交初始化等技巧才可能达到。'}
        {decay > 0.9 && '接近 LSTM 的遗忘门（f≈0.95）：梯度能传很远。这就是 LSTM 能学 100+ 步的原因。'}
      </div>

      <div className="diagram-caption">
        <b>梯度 = 连乘衰减系数^T</b>。RNN 每步乘 tanh 导数（≤1），50 步后指数级衰减。
        <b>LSTM 通过细胞状态把每步的乘数变成遗忘门 f≈1</b>，实现"梯度高速公路"。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   14. 字符级 RNN 文本生成演示
   ══════════════════════════════════════════════ */

const TRAINING_STAGES = [
  {
    epoch: 1,
    label: '初期',
    text: 'hhXaKj bXUv nNlLk jhGfD sAqW',
    desc: '随机字符，只学到字符频率',
    color: '#ef4444',
  },
  {
    epoch: 4,
    label: '中期',
    text: 'The meaning of life is to be a good person',
    desc: '出现单词、空格、大写，但语法不通',
    color: '#f59e0b',
  },
  {
    epoch: 50,
    label: '后期',
    text: 'The meaning of life is not to be found in the world, but in the way we live it.',
    desc: '完整句子、正确语法、连贯语义',
    color: '#22c55e',
  },
];

const STRUCTURED = [
  {
    name: '莎士比亚',
    color: '#7c5cff',
    text: `KING RICHARD III:
I have been so far from home, my lord,
And yet I know not how to speak to thee.`,
    learned: '角色名大写 + 冒号 + 韵文格式',
  },
  {
    name: 'C 代码',
    color: '#0891b2',
    text: `static int format_type(int type, const char *name)
{
    if (type == 0) return 0;
    return -1;
}`,
    learned: '缩进 + 括号配对 + 分号',
  },
  {
    name: 'LaTeX',
    color: '#22c55e',
    text: `\\begin{itemize}
\\item The first item
\\end{itemize}`,
    learned: '环境配对 + 反斜杠命令',
  },
];

export function CharRNNTextDemo() {
  const [tab, setTab] = useState(0);

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">字符级 RNN 学到了什么：从随机字符到结构化文本</figcaption>

      <div className="crnn-stages">
        {TRAINING_STAGES.map((s, i) => (
          <div
            key={i}
            className={`crnn-stage ${i === tab ? 'active' : ''}`}
            style={{ '--stage-c': s.color } as React.CSSProperties}
            onClick={() => setTab(i)}
          >
            <div className="crnn-stage-head">
              <span className="crnn-epoch">epoch {s.epoch}</span>
              <span className="crnn-label" style={{ color: s.color }}>{s.label}</span>
            </div>
            <div className="crnn-text">{s.text}</div>
            <div className="crnn-desc">{s.desc}</div>
          </div>
        ))}
      </div>

      <div className="crnn-divider">训练不同语料，学到不同结构</div>

      <div className="crnn-structured">
        {STRUCTURED.map((s) => (
          <div key={s.name} className="crnn-corpus" style={{ borderColor: s.color }}>
            <div className="crnn-corpus-name" style={{ color: s.color }}>{s.name}</div>
            <pre className="crnn-code">{s.text}</pre>
            <div className="crnn-learned">学到：{s.learned}</div>
          </div>
        ))}
      </div>

      <div className="diagram-caption">
        <b>这些结构都是模型自己发现的</b>——没有人告诉它"冒号后应换行"或"括号要配对"。
        预测下一个字符这个任务，<b>迫使</b>模型学会所有这些规律。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   15. 温度采样演示
   ══════════════════════════════════════════════ */

const TEMP_LOGITS = [3.0, 2.5, 2.0, 1.5, 1.0, 0.5, 0.0];
const TEMP_CHARS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

export function TemperatureSamplingDemo() {
  const [temp, setTemp] = useState(1.0);

  const probs = useMemo(() => {
    const scaled = TEMP_LOGITS.map((l) => l / Math.max(temp, 0.01));
    const maxS = Math.max(...scaled);
    const exps = scaled.map((s) => Math.exp(s - maxS));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map((e) => e / sum);
  }, [temp]);

  const entropy = -probs.reduce((s, p) => s + (p > 0 ? p * Math.log2(p) : 0), 0);
  const maxP = Math.max(...probs);

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">温度采样：控制生成文本的"保守 vs 创意"</figcaption>

      <div className="pos-controls">
        <label>
          温度 T
          <input
            type="range" min="0.1" max="2.0" step="0.05" value={temp}
            onChange={(e) => setTemp(parseFloat(e.target.value))}
          />
          <b>{temp.toFixed(2)}</b>
        </label>
      </div>

      <div className="temp-bars">
        {TEMP_CHARS.map((c, i) => (
          <div key={c} className="temp-bar-col">
            <div className="temp-bar-track">
              <div
                className="temp-bar-fill"
                style={{
                  height: `${probs[i] * 100}%`,
                  background: i === 0 ? '#22c55e' : '#2f6bff',
                  opacity: 0.85,
                }}
              />
            </div>
            <div className="temp-bar-prob">{(probs[i] * 100).toFixed(1)}%</div>
            <div className="temp-bar-char">{c}</div>
          </div>
        ))}
      </div>

      <div className="temp-stats">
        <span>最大概率：<b style={{ color: '#22c55e' }}>{(maxP * 100).toFixed(1)}%</b></span>
        <span>熵：<b style={{ color: '#7c5cff' }}>{entropy.toFixed(2)} 比特</b></span>
      </div>

      <div className="temp-note" style={{ borderColor: temp < 0.5 ? '#2f6bff' : temp < 1.3 ? '#22c55e' : '#f59e0b' }}>
        {temp < 0.5 && 'T 很低：概率集中在最高项 → 输出确定但呆板，容易重复'}
        {temp >= 0.5 && temp < 0.9 && 'T 偏低：适合事实性任务（代码、数学），输出稳定'}
        {temp >= 0.9 && temp <= 1.2 && 'T ≈ 1：原始分布，平衡状态（多数场景的默认）'}
        {temp > 1.2 && 'T 偏高：分布变平 → 更有创意，但也更容易出错（拼写、事实）'}
      </div>

      <div className="diagram-caption">
        <b>温度不改变排序</b>，只改变概率差距。所以"最可能的字符"在任何 T 下都相同，
        但 T 越大，低概率字符被选中的机会越大。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   16. RNN vs LSTM 梯度对比
   ══════════════════════════════════════════════ */

export function RNNvsLSTMDemo() {
  const [steps, setSteps] = useState(50);

  const rnnGrad = Math.pow(0.25, steps);
  const lstmGrad = Math.pow(0.99, steps);

  const W = 340;
  const H = 130;
  const maxSteps = 200;

  const toX = (t: number) => 40 + (t / maxSteps) * (W - 50);
  const toY = (g: number) => {
    const lg = Math.max(Math.log10(g), -35);
    return 10 + ((-lg) / 35) * (H - 25);
  };

  const makePath = (decay: number) => {
    const pts: string[] = [];
    for (let t = 1; t <= maxSteps; t += 2) {
      pts.push(`${toX(t).toFixed(1)},${toY(Math.pow(decay, t)).toFixed(1)}`);
    }
    return `M${pts.join(' L')}`;
  };

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">梯度高速公路：RNN 的乘法衰减 vs LSTM 的加法直通</figcaption>

      <div className="pos-controls">
        <label>
          时间步
          <input
            type="range" min="1" max="200" step="1" value={steps}
            onChange={(e) => setSteps(parseInt(e.target.value, 10))}
          />
          <b>{steps}</b>
        </label>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="lstm-grad-svg" role="img" aria-label="梯度对比">
        {/* 网格 */}
        {[0, -10, -20, -30].map((lg, i) => {
          const y = 10 + (i / 3) * (H - 25);
          return (
            <g key={lg}>
              <line x1="38" y1={y} x2={W - 8} y2={y} stroke="#e2e8f0" strokeWidth="0.7" />
              <text x="34" y={y + 3} textAnchor="end" fontSize="6.5" fill="#94a3b8">1e{lg}</text>
            </g>
          );
        })}

        <path d={makePath(0.25)} fill="none" stroke="#ef4444" strokeWidth="2" />
        <path d={makePath(0.99)} fill="none" stroke="#22c55e" strokeWidth="2" />

        {/* 当前点 */}
        <circle cx={toX(steps)} cy={toY(rnnGrad)} r="3.5" fill="#ef4444" />
        <circle cx={toX(steps)} cy={toY(lstmGrad)} r="3.5" fill="#22c55e" />
      </svg>

      <div className="lstm-grad-legend">
        <span><span className="pos-dot" style={{ background: '#ef4444' }} /> RNN（每步 ×0.25）</span>
        <span><span className="pos-dot" style={{ background: '#22c55e' }} /> LSTM（每步 ×f=0.99）</span>
      </div>

      <div className="lstm-grad-stats">
        <span style={{ color: '#ef4444' }}>RNN：{rnnGrad.toExponential(2)}</span>
        <span style={{ color: '#22c55e' }}>LSTM：{lstmGrad.toExponential(2)}</span>
        <span>差距：<b>{(lstmGrad / Math.max(rnnGrad, 1e-300)).toExponential(1)} 倍</b></span>
      </div>

      <div className="diagram-caption">
        <b>RNN 是乘法</b>（{'h_t = W·h_{t-1}'}，梯度乘 W 和 tanh'），<b>LSTM 是加法</b>
        （{'c_t = f_t⊙c_{t-1} + ...'}，梯度乘 f_t）。
        f_t≈1 时梯度无损——这就是"梯度高速公路"。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   17. LSTM 单元结构
   ══════════════════════════════════════════════ */

const LSTM_GATES = [
  {
    key: 'forget',
    name: '遗忘门 f',
    formula: 'f = σ(W_f·[h,x] + b_f)',
    role: '决定丢弃多少旧记忆',
    color: '#ef4444',
    example: '读到新主语时，忘掉旧主语的性别',
  },
  {
    key: 'input',
    name: '输入门 i',
    formula: 'i = σ(W_i·[h,x] + b_i)',
    role: '决定写入多少新信息',
    color: '#2f6bff',
    example: '决定这个新词是否值得记住',
  },
  {
    key: 'candidate',
    name: '候选值 g',
    formula: 'g = tanh(W_g·[h,x] + b_g)',
    role: '提供新信息的内容（-1~1）',
    color: '#f59e0b',
    example: '新信息具体是什么（如"阳性、单数"）',
  },
  {
    key: 'output',
    name: '输出门 o',
    formula: 'o = σ(W_o·[h,x] + b_o)',
    role: '决定输出细胞状态的多少',
    color: '#22c55e',
    example: '当前任务需要哪部分记忆',
  },
];

export function LSTMCellDemo() {
  const [sel, setSel] = useState(0);
  const cur = LSTM_GATES[sel];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">LSTM 单元：三个门 + 一个细胞状态</figcaption>

      <svg viewBox="0 0 360 170" className="lstm-cell-svg" role="img" aria-label="LSTM 单元">
        <defs>
          <marker id="lstm-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
          </marker>
        </defs>

        {/* 细胞状态传送带 */}
        <line x1="20" y1="30" x2="340" y2="30" stroke="#7c5cff" strokeWidth="3" opacity="0.3" />
        <text x="24" y="22" fontSize="8" fill="#7c5cff" fontWeight="700">c_t-1</text>
        <text x="320" y="22" fontSize="8" fill="#7c5cff" fontWeight="700">c_t</text>

        {/* 遗忘门 */}
        <g opacity={sel === 0 ? 1 : 0.4}>
          <circle cx="70" cy="30" r="11" fill={sel === 0 ? '#ef4444' : '#ef444420'} stroke="#ef4444" strokeWidth={sel === 0 ? 2 : 1.2} />
          <text x="70" y="33" textAnchor="middle" fontSize="7" fill={sel === 0 ? '#fff' : '#ef4444'} fontWeight="700">×</text>
          <text x="70" y="52" textAnchor="middle" fontSize="6.5" fill="#ef4444">f_t</text>
        </g>

        {/* 输入门 + 候选 */}
        <g opacity={sel === 1 || sel === 2 ? 1 : 0.4}>
          <circle cx="150" cy="30" r="11" fill={sel === 1 || sel === 2 ? '#2f6bff' : '#2f6bff20'} stroke="#2f6bff" strokeWidth={sel === 1 || sel === 2 ? 2 : 1.2} />
          <text x="150" y="33" textAnchor="middle" fontSize="7" fill={sel === 1 || sel === 2 ? '#fff' : '#2f6bff'} fontWeight="700">+</text>
          <text x="150" y="52" textAnchor="middle" fontSize="6.5" fill="#2f6bff">i_t ⊙ g_t</text>
        </g>

        {/* 输出门 */}
        <g opacity={sel === 3 ? 1 : 0.4}>
          <circle cx="260" cy="95" r="11" fill={sel === 3 ? '#22c55e' : '#22c55e20'} stroke="#22c55e" strokeWidth={sel === 3 ? 2 : 1.2} />
          <text x="260" y="98" textAnchor="middle" fontSize="7" fill={sel === 3 ? '#fff' : '#22c55e'} fontWeight="700">×</text>
          <text x="260" y="117" textAnchor="middle" fontSize="6.5" fill="#22c55e">o_t</text>
        </g>

        {/* tanh(c_t) */}
        <rect x="225" y="78" width="24" height="16" rx="3" fill="#7c5cff18" stroke="#7c5cff" strokeWidth="1.2" />
        <text x="237" y="89" textAnchor="middle" fontSize="6" fill="#7c5cff">tanh</text>

        {/* h_t 输出 */}
        <line x1="272" y1="95" x2="330" y2="95" stroke="#94a3b8" strokeWidth="1.2" markerEnd="url(#lstm-arrow)" />
        <text x="334" y="98" fontSize="7.5" fill="#22c55e" fontWeight="700">h_t</text>

        {/* 输入 x_t 和 h_t-1 */}
        <rect x="20" y="130" width="30" height="18" rx="3" fill="#2f6bff18" stroke="#2f6bff" strokeWidth="1.2" />
        <text x="35" y="142" textAnchor="middle" fontSize="7" fill="#2f6bff">x_t</text>
        <rect x="60" y="130" width="34" height="18" rx="3" fill="#7c5cff18" stroke="#7c5cff" strokeWidth="1.2" />
        <text x="77" y="142" textAnchor="middle" fontSize="6.5" fill="#7c5cff">h_t-1</text>

        {/* 连接到门的虚线 */}
        <line x1="35" y1="130" x2="70" y2="42" stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="2 2" />
        <line x1="77" y1="130" x2="150" y2="42" stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="2 2" />
        <line x1="150" y1="30" x2="260" y2="84" stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="2 2" />
      </svg>

      <div className="lstm-gates">
        {LSTM_GATES.map((g, i) => (
          <button
            key={g.key}
            type="button"
            className={`lstm-gate-btn ${i === sel ? 'active' : ''}`}
            style={{ '--gate-c': g.color } as React.CSSProperties}
            onClick={() => setSel(i)}
          >
            {g.name}
          </button>
        ))}
      </div>

      <div className="lstm-gate-detail" style={{ borderColor: cur.color }}>
        <div className="lstm-gate-formula"><code style={{ color: cur.color }}>{cur.formula}</code></div>
        <div className="lstm-gate-role"><b>作用</b>：{cur.role}</div>
        <div className="lstm-gate-example"><b>例子</b>：{cur.example}</div>
      </div>

      <div className="diagram-caption">
        <b>紫色横线是细胞状态</b>——贯穿所有时间步的"传送带"。
        梯度沿它传播时只乘遗忘门 f_t（可≈1），实现无损传播。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   18. LSTM 参数对比
   ══════════════════════════════════════════════ */

export function ParamCompareDemo() {
  const configs = [
    { v: 1000, h: 128 },
    { v: 10000, h: 512 },
    { v: 50000, h: 1024 },
  ];

  const calc = (v: number, h: number) => {
    const rnn = h * v + h * h + h + v * h + v;
    const lstm = 4 * (h * (h + v) + h) + (v * h + v);
    return { rnn, lstm, ratio: lstm / rnn };
  };

  const fmt = (n: number) => {
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return String(n);
  };

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">LSTM 参数约为 RNN 的 4 倍：用参数换表达能力</figcaption>

      <div className="param-compare">
        {configs.map((c) => {
          const { rnn, lstm, ratio } = calc(c.v, c.h);
          return (
            <div key={`${c.v}-${c.h}`} className="pc-row">
              <div className="pc-label">V={c.v.toLocaleString()}, H={c.h}</div>
              <div className="pc-bars">
                <div className="pc-bar-wrap">
                  <div className="pc-bar" style={{ width: `${(rnn / lstm) * 100}%`, background: '#2f6bff' }} />
                  <span className="pc-val">RNN {fmt(rnn)}</span>
                </div>
                <div className="pc-bar-wrap">
                  <div className="pc-bar" style={{ width: '100%', background: '#7c5cff' }} />
                  <span className="pc-val">LSTM {fmt(lstm)}</span>
                </div>
              </div>
              <div className="pc-ratio">{ratio.toFixed(1)}×</div>
            </div>
          );
        })}
      </div>

      <div className="pc-note">
        参数量对比：RNN = <code>H(H+V+1) + V(H+1)</code>，
        LSTM = <code>4H(H+V+1) + V(H+1)</code>。
        4 倍来自 <b>四组门</b>（f/i/g/o 各一组权重）。
      </div>

      <div className="diagram-caption">
        <b>代价</b>：训练更慢、显存更大。
        <b>收益</b>：能学 100+ 步的长距离依赖。
        这是典型的"用参数换表达能力"。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   19. Dropout 在 RNN 上的陷阱
   ══════════════════════════════════════════════ */

const RNN_DROPOUT_STEPS = 4;

export function DropoutInRNNDemo() {
  const [mode, setMode] = useState<'naive' | 'variational'>('naive');

  // 固定的 mask 模式（模拟）
  const naiveMasks = [
    [1, 0, 1, 1],
    [1, 1, 0, 1],
    [0, 1, 1, 1],
    [1, 1, 1, 0],
  ];
  const variationalMask = [1, 0, 1, 1];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">为什么普通 Dropout 在 RNN 上失效</figcaption>

      <div className="pattern-tabs">
        <button
          type="button"
          className={`pattern-tab ${mode === 'naive' ? 'active' : ''}`}
          style={{ '--tab-color': '#ef4444' } as React.CSSProperties}
          onClick={() => setMode('naive')}
        >
          普通 Dropout（每步重采样）
        </button>
        <button
          type="button"
          className={`pattern-tab ${mode === 'variational' ? 'active' : ''}`}
          style={{ '--tab-color': '#22c55e' } as React.CSSProperties}
          onClick={() => setMode('variational')}
        >
          变分 Dropout（共用 mask）
        </button>
      </div>

      <div className="dropout-rnn">
        {Array.from({ length: RNN_DROPOUT_STEPS }).map((_, t) => {
          const mask = mode === 'naive' ? naiveMasks[t] : variationalMask;
          return (
            <div key={t} className="dropout-step">
              <div className="dropout-step-label">t={t + 1}</div>
              <div className="dropout-cells">
                {mask.map((v, i) => (
                  <div
                    key={i}
                    className={`dropout-cell ${v ? 'kept' : 'dropped'}`}
                    title={v ? '保留' : '丢弃'}
                  >
                    {v ? 'h' : '0'}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="dropout-note" style={{ borderColor: mode === 'naive' ? '#ef4444' : '#22c55e' }}>
        {mode === 'naive' ? (
          <>
            <b style={{ color: '#ef4444' }}>问题：每步丢弃的维度不同</b>
            <br />
            第 1 步丢弃维度 2，第 2 步丢弃维度 3……信息在时间上被随机切断。
            <br />
            <b>记忆变成了噪声</b>——LSTM 学不到连贯的长期依赖。
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              论文实测：困惑度从 114.5 <b>升到</b> 118.2（变差）
            </span>
          </>
        ) : (
          <>
            <b style={{ color: '#22c55e' }}>正确：整条序列共用同一 mask</b>
            <br />
            维度 2 在所有时间步都被丢弃——信息通道保持一致。
            <br />
            模型学会用剩余维度补偿，学到更鲁棒的表示。
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              论文实测：困惑度从 114.5 <b>降到</b> 92.4（降低 19%）
            </span>
          </>
        )}
      </div>

      <div className="diagram-caption">
        论文的核心建议：<b>Dropout 加在垂直方向（层间），不加在水平方向（时间步间）</b>。
        循环连接上的 Dropout 会破坏记忆传递。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   20. LayerNorm 演示
   ══════════════════════════════════════════════ */

export function LayerNormDemo() {
  const [useNorm, setUseNorm] = useState(true);

  const raw = [12.5, 8.3, 15.1, 6.7, 11.2, 9.8];
  const mean = raw.reduce((a, b) => a + b, 0) / raw.length;
  const variance = raw.reduce((s, v) => s + (v - mean) ** 2, 0) / raw.length;
  const std = Math.sqrt(variance);
  const normalized = raw.map((v) => (v - mean) / (std + 1e-5));

  const display = useNorm ? normalized : raw;
  const maxAbs = Math.max(...display.map(Math.abs));

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">LayerNorm：沿特征维归一化，不依赖 batch</figcaption>

      <div className="pattern-tabs">
        <button
          type="button"
          className={`pattern-tab ${!useNorm ? 'active' : ''}`}
          style={{ '--tab-color': '#94a3b8' } as React.CSSProperties}
          onClick={() => setUseNorm(false)}
        >
          原始输入
        </button>
        <button
          type="button"
          className={`pattern-tab ${useNorm ? 'active' : ''}`}
          style={{ '--tab-color': '#22c55e' } as React.CSSProperties}
          onClick={() => setUseNorm(true)}
        >
          LayerNorm 后
        </button>
      </div>

      <div className="ln-bars">
        {display.map((v, i) => (
          <div key={i} className="ln-bar-col">
            <div className="ln-bar-track">
              <div
                className="ln-bar-fill"
                style={{
                  height: `${(Math.abs(v) / maxAbs) * 100}%`,
                  background: v >= 0 ? '#22c55e' : '#ef4444',
                  position: 'absolute',
                  bottom: v >= 0 ? '50%' : 'auto',
                  top: v < 0 ? '50%' : 'auto',
                }}
              />
            </div>
            <div className="ln-bar-val">{v.toFixed(2)}</div>
          </div>
        ))}
      </div>

      <div className="ln-stats">
        <span>均值：<b>{useNorm ? '0.00' : mean.toFixed(2)}</b></span>
        <span>标准差：<b>{useNorm ? '1.00' : std.toFixed(2)}</b></span>
      </div>

      <div className="ln-formula">
        <code>y = γ ⊙ (x - μ) / √(σ² + ε) + β</code>
      </div>

      <div className="diagram-caption">
        <b>沿特征维归一化</b>（axis=-1），每个样本独立计算，不依赖 batch 大小。
        所以变长序列、小 batch 都能用——这是它比 BatchNorm 更适合 RNN 的原因。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   21. Dropout 四种变体对比
   ══════════════════════════════════════════════ */

const DROPOUT_VARIANTS = [
  {
    key: 'standard',
    name: '标准 Dropout',
    shape: '逐元素',
    mask: '(N, ...) 同输入',
    use: '全连接层',
    color: '#2f6bff',
    demo: [
      [1, 0, 1, 1, 0, 1],
      [1, 1, 0, 1, 1, 0],
      [0, 1, 1, 0, 1, 1],
    ],
    note: '随机丢弃单个元素，相邻信息仍可恢复',
  },
  {
    key: 'dropout2d',
    name: 'Dropout2D',
    shape: '整通道',
    mask: '(N, C, 1, 1)',
    use: '卷积层',
    color: '#7c5cff',
    demo: [
      [1, 1, 0, 0, 1, 1],
      [1, 1, 0, 0, 1, 1],
      [1, 1, 0, 0, 1, 1],
    ],
    note: '整个通道一起丢弃 = 真正去掉某个特征',
  },
  {
    key: 'dropout1d',
    name: 'Dropout1D',
    shape: '整时间步',
    mask: '(N, T, 1)',
    use: '序列 / Embedding',
    color: '#f59e0b',
    demo: [
      [1, 1, 1, 1, 1, 1],
      [0, 0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1, 1],
    ],
    note: '整个时间步的特征一起丢弃，保留特征完整性',
  },
  {
    key: 'alpha',
    name: 'AlphaDropout',
    shape: '置为 α′',
    mask: '同输入',
    use: 'SELU 自归一化网络',
    color: '#22c55e',
    demo: [
      [1, -1, 1, 1, -1, 1],
      [1, 1, -1, 1, 1, -1],
      [-1, 1, 1, -1, 1, 1],
    ],
    note: '丢弃时置为负饱和值 α′≈-1.758，保持均值/方差',
  },
];

export function DropoutVariantsDemo() {
  const [sel, setSel] = useState(0);
  const cur = DROPOUT_VARIANTS[sel];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">Dropout 的四种变体：丢弃的粒度不同</figcaption>

      <div className="pattern-tabs">
        {DROPOUT_VARIANTS.map((v, i) => (
          <button
            key={v.key}
            type="button"
            className={`pattern-tab ${i === sel ? 'active' : ''}`}
            style={{ '--tab-color': v.color } as React.CSSProperties}
            onClick={() => setSel(i)}
          >
            {v.name}
          </button>
        ))}
      </div>

      <div className="dv-grid">
        {cur.demo.map((row, r) => (
          <div key={r} className="dv-row">
            {row.map((v, c) => (
              <div
                key={c}
                className={`dv-cell ${v === 0 ? 'dropped' : v < 0 ? 'alpha' : 'kept'}`}
                style={{
                  borderColor: cur.color,
                  background: v === 0
                    ? 'rgba(239,68,68,0.12)'
                    : v < 0
                      ? 'rgba(34,197,94,0.18)'
                      : `${cur.color}18`,
                  color: v === 0 ? '#b91c1c' : cur.color,
                }}
              >
                {v === 0 ? '0' : v < 0 ? "α'" : 'h'}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="dv-info" style={{ borderColor: cur.color }}>
        <div className="dv-row-info">
          <span className="dv-k">丢弃粒度</span>
          <span className="dv-v">{cur.shape}</span>
        </div>
        <div className="dv-row-info">
          <span className="dv-k">mask 形状</span>
          <span className="dv-v"><code>{cur.mask}</code></span>
        </div>
        <div className="dv-row-info">
          <span className="dv-k">适用层</span>
          <span className="dv-v">{cur.use}</span>
        </div>
        <div className="dv-note">{cur.note}</div>
      </div>

      <div className="diagram-caption">
        <b>为什么卷积层用 Dropout2D</b>：卷积层中相邻像素高度相关，逐元素丢弃后邻居仍有信息，
        正则化效果弱。<b>整通道丢弃才能真正去掉某个特征。</b>
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   22. 熵 vs 复杂度
   ══════════════════════════════════════════════ */

const EC_STAGES = [
  { name: '分离', entropy: 15, complexity: 10, color: '#94a3b8', desc: '牛奶和咖啡分开——有序但简单' },
  { name: '螺旋', entropy: 50, complexity: 85, color: '#2f6bff', desc: '出现螺旋图案——结构最复杂' },
  { name: '半混', entropy: 75, complexity: 55, color: '#f59e0b', desc: '逐渐混合——结构开始消失' },
  { name: '均匀', entropy: 100, complexity: 8, color: '#22c55e', desc: '完全混合——无序但简单' },
];

export function EntropyComplexityDemo() {
  const [sel, setSel] = useState(1);
  const cur = EC_STAGES[sel];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">熵与复杂度：两个不同的量</figcaption>

      <div className="ec-track">
        {EC_STAGES.map((s, i) => (
          <button
            key={s.name}
            type="button"
            className={`ec-stage ${i === sel ? 'active' : ''}`}
            style={{ '--ec-color': s.color } as React.CSSProperties}
            onClick={() => setSel(i)}
          >
            <div className="ec-dot" style={{ background: s.color }} />
            <div className="ec-name">{s.name}</div>
          </button>
        ))}
        <div className="ec-line" />
      </div>

      <div className="ec-chart">
        <div className="ec-row">
          <span className="ec-label">熵</span>
          <div className="ec-bar-track">
            <div className="ec-bar" style={{ width: `${cur.entropy}%`, background: '#ef4444' }} />
          </div>
          <span className="ec-val" style={{ color: '#ef4444' }}>{cur.entropy}%</span>
        </div>
        <div className="ec-row">
          <span className="ec-label">复杂度</span>
          <div className="ec-bar-track">
            <div className="ec-bar" style={{ width: `${cur.complexity}%`, background: cur.color }} />
          </div>
          <span className="ec-val" style={{ color: cur.color }}>{cur.complexity}%</span>
        </div>
      </div>

      <div className="ec-note" style={{ borderColor: cur.color }}>{cur.desc}</div>

      <div className="diagram-caption">
        <b>熵单调递增</b>（分离→均匀），但<b>复杂度先升后降</b>（分离→螺旋→均匀）。
        <b>均匀混合熵最高但复杂度最低</b>——这就是"复杂"是稀缺状态的原因。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   23. 压缩复杂度
   ══════════════════════════════════════════════ */

const COMPRESSION_CASES = [
  {
    name: '纯随机',
    raw: 95,
    shuffled: 95,
    color: '#94a3b8',
    desc: '无法压缩；打乱后也无法压缩 → 复杂度 ≈ 0',
  },
  {
    name: '均匀混合',
    raw: 20,
    shuffled: 20,
    color: '#22c55e',
    desc: '可压缩（统计规律）；打乱后一样 → 复杂度 ≈ 0',
  },
  {
    name: '螺旋图案',
    raw: 45,
    shuffled: 95,
    color: '#2f6bff',
    desc: '有结构（可压缩）；打乱后不可压缩 → 复杂度大',
  },
];

export function CompressionComplexityDemo() {
  const [sel, setSel] = useState(2);
  const cur = COMPRESSION_CASES[sel];
  const complexity = cur.shuffled - cur.raw;

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">用压缩率测量复杂度：C = gzip(打乱) − gzip(原始)</figcaption>

      <div className="pattern-tabs">
        {COMPRESSION_CASES.map((c, i) => (
          <button
            key={c.name}
            type="button"
            className={`pattern-tab ${i === sel ? 'active' : ''}`}
            style={{ '--tab-color': c.color } as React.CSSProperties}
            onClick={() => setSel(i)}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="cc-bars">
        <div className="cc-row">
          <span className="cc-label">gzip(原始)</span>
          <div className="cc-track">
            <div style={{ width: `${cur.raw}%`, background: cur.color }} />
          </div>
          <span className="cc-val">{cur.raw}</span>
        </div>
        <div className="cc-row">
          <span className="cc-label">gzip(打乱)</span>
          <div className="cc-track">
            <div style={{ width: `${cur.shuffled}%`, background: '#94a3b8' }} />
          </div>
          <span className="cc-val">{cur.shuffled}</span>
        </div>
        <div className="cc-result" style={{ borderColor: cur.color }}>
          复杂度 = {cur.shuffled} − {cur.raw} = <b style={{ color: cur.color }}>{complexity}</b>
        </div>
      </div>

      <div className="cc-note">{cur.desc}</div>

      <div className="diagram-caption">
        <b>打乱消除结构但保留统计特性</b>。如果原图有结构（可压缩），打乱后不可压缩 → 差值大。
        这是柯尔莫哥洛夫复杂度的实用近似。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   24. 编码器对比
   ══════════════════════════════════════════════ */

const ENCODERS = [
  {
    name: 'Huffman',
    color: '#2f6bff',
    principle: '变长前缀码：高频符号用短码',
    entropy: 1.85,
    actual: 1.95,
    note: '整数比特，与熵差最多 1 比特',
  },
  {
    name: '算术编码',
    color: '#22c55e',
    principle: '映射到 [0,1) 区间，可编码分数比特',
    entropy: 1.85,
    actual: 1.85,
    note: '接近理论极限，但实现复杂',
  },
  {
    name: 'LZ / gzip',
    color: '#f59e0b',
    principle: '找重复子串，用引用替代',
    entropy: 1.85,
    actual: 2.10,
    note: '适合长文本，对结构敏感',
  },
];

export function EncoderCompareDemo() {
  const [sel, setSel] = useState(0);
  const cur = ENCODERS[sel];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">三种编码器：与理论熵的差距</figcaption>

      <div className="pattern-tabs">
        {ENCODERS.map((e, i) => (
          <button
            key={e.name}
            type="button"
            className={`pattern-tab ${i === sel ? 'active' : ''}`}
            style={{ '--tab-color': e.color } as React.CSSProperties}
            onClick={() => setSel(i)}
          >
            {e.name}
          </button>
        ))}
      </div>

      <div className="enc-chart">
        <div className="enc-bar-group">
          <div className="enc-bar-col">
            <div className="enc-bar-track">
              <div style={{ height: `${(cur.entropy / 2.5) * 100}%`, background: '#7c5cff' }} />
            </div>
            <span className="enc-bar-val">{cur.entropy}</span>
            <span className="enc-bar-name">理论熵</span>
          </div>
          <div className="enc-bar-col">
            <div className="enc-bar-track">
              <div style={{ height: `${(cur.actual / 2.5) * 100}%`, background: cur.color }} />
            </div>
            <span className="enc-bar-val" style={{ color: cur.color }}>{cur.actual}</span>
            <span className="enc-bar-name">{cur.name}</span>
          </div>
        </div>
        <div className="enc-gap">
          差距：<b style={{ color: cur.color }}>+{(cur.actual - cur.entropy).toFixed(2)}</b> 比特/符号
        </div>
      </div>

      <div className="enc-info" style={{ borderColor: cur.color }}>
        <div><b>原理</b>：{cur.principle}</div>
        <div style={{ marginTop: 4, color: 'var(--text-3)' }}>{cur.note}</div>
      </div>

      <div className="diagram-caption">
        <b>K(x) ≤ 编码器长度 + O(1)</b>。编码器给出上界，算术编码最接近理论极限。
        Huffman 的整数约束让它最多浪费 1 比特/符号。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   25. 权重噪声与描述长度
   ══════════════════════════════════════════════ */

export function WeightNoiseDemo() {
  const [sigma, setSigma] = useState(0.1);

  const bitsPerWeight = -Math.log2(Math.max(sigma, 1e-6));
  const nWeights = 1000;
  const totalBits = bitsPerWeight * nWeights;

  // 模拟权重分布
  const samples = useMemo(() => {
    const rng = (i: number) => {
      const x = Math.sin(i * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };
    const pts: number[] = [];
    for (let i = 0; i < 200; i++) {
      // Box-Muller
      const u1 = Math.max(rng(i * 2), 1e-10);
      const u2 = rng(i * 2 + 1);
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      pts.push(z * sigma);
    }
    return pts;
  }, [sigma]);

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">权重噪声 = 精度控制：σ 决定描述长度</figcaption>

      <div className="pos-controls">
        <label>
          σ（权重精度）
          <input
            type="range" min="0.01" max="1.0" step="0.01" value={sigma}
            onChange={(e) => setSigma(parseFloat(e.target.value))}
          />
          <b>{sigma.toFixed(2)}</b>
        </label>
      </div>

      <div className="wn-histogram">
        {samples.map((v, i) => {
          const h = Math.min(Math.abs(v) / (sigma * 3), 1) * 100;
          return (
            <div
              key={i}
              className="wn-bar"
              style={{
                height: `${Math.max(h, 2)}%`,
                background: v >= 0 ? '#2f6bff' : '#f59e0b',
                opacity: 0.7,
              }}
            />
          );
        })}
      </div>

      <div className="wn-stats">
        <span>每权重：<b style={{ color: '#7c5cff' }}>{bitsPerWeight.toFixed(2)}</b> 比特</span>
        <span>1000 权重：<b>{totalBits.toFixed(0)}</b> 比特</span>
        <span>对比 float32：<b>32000</b> 比特</span>
      </div>

      <div className="wn-note" style={{ borderColor: sigma < 0.2 ? '#ef4444' : sigma < 0.5 ? '#f59e0b' : '#22c55e' }}>
        {sigma < 0.2 && 'σ 小 → 权重精确 → 描述长（惩罚重），但拟合好'}
        {sigma >= 0.2 && sigma < 0.5 && 'σ 适中 → MDL 的最优区间（拟合与复杂度的平衡）'}
        {sigma >= 0.5 && 'σ 大 → 权重模糊 → 描述短（惩罚轻），但拟合差'}
      </div>

      <div className="diagram-caption">
        <b>L(模型) = -Σ log₂(σ)</b>。σ 越小，描述越长。
        训练时在"描述长度"与"拟合误差"之间找平衡——这就是 MDL 的自动正则化。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   26. 变分推断
   ══════════════════════════════════════════════ */

export function VariationalInferenceDemo() {
  const [sel, setSel] = useState(0);

  const steps = [
    {
      name: 'Hinton 1993',
      color: '#2f6bff',
      formula: 'L = L_data − Σ log(σ)',
      parts: ['L_data：预测误差', '-Σlog(σ)：权重描述长度'],
      note: '给权重加噪声，惩罚精度',
    },
    {
      name: '变分推断',
      color: '#7c5cff',
      formula: '−ELBO = −E_q[log P(D|w)] + KL(q‖P)',
      parts: ['−E_q[log P(D|w)]：负对数似然', 'KL(q‖P)：后验与先验的距离'],
      note: 'Hinton 的损失就是负 ELBO',
    },
    {
      name: 'VAE 2013',
      color: '#22c55e',
      formula: 'L = 重建误差 + KL(q(z|x)‖P(z))',
      parts: ['重建误差：解码器输出', 'KL：隐变量分布的正则'],
      note: '同一公式，用于生成模型',
    },
  ];

  const cur = steps[sel];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">Hinton 的 MDL = 变分推断 = VAE 的损失</figcaption>

      <div className="pattern-tabs">
        {steps.map((s, i) => (
          <button
            key={s.name}
            type="button"
            className={`pattern-tab ${i === sel ? 'active' : ''}`}
            style={{ '--tab-color': s.color } as React.CSSProperties}
            onClick={() => setSel(i)}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="vi-formula" style={{ borderColor: cur.color }}>
        <code style={{ color: cur.color }}>{cur.formula}</code>
      </div>

      <div className="vi-parts">
        {cur.parts.map((p, i) => (
          <div key={i} className="vi-part" style={{ borderColor: cur.color }}>
            <span className="vi-num" style={{ background: cur.color }}>{i + 1}</span>
            {p}
          </div>
        ))}
      </div>

      <div className="vi-note">{cur.note}</div>

      <div className="diagram-caption">
        <b>三个公式本质相同</b>：拟合项 + 复杂度惩罚。
        Hinton 在 1993 年就写出了变分推断的目标函数——比 VAE 早 20 年。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   27. 两种混合模型对比
   ══════════════════════════════════════════════ */

export function CoffeeModelCompareDemo() {
  const [mode, setMode] = useState<'non' | 'inter'>('inter');

  // 模拟两种模型的网格
  const grid = useMemo(() => {
    const size = 20;
    const g: number[][] = [];
    const rng = (i: number) => {
      const x = Math.sin(i * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };

    for (let r = 0; r < size; r++) {
      const row: number[] = [];
      for (let c = 0; c < size; c++) {
        if (mode === 'non') {
          // 非相互作用：纯随机（模拟充分混合后）
          row.push(rng(r * size + c) > 0.5 ? 1 : 0);
        } else {
          // 相互作用：有团簇结构
          const base = c < size / 2 ? 0 : 1;
          const noise = rng(r * size + c);
          // 80% 保持基础色，20% 噪声 -> 形成不规则边界
          row.push(noise < 0.8 ? base : 1 - base);
        }
      }
      g.push(row);
    }
    return g;
  }, [mode]);

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">两种混合模型：粒子是否"感知"彼此</figcaption>

      <div className="pattern-tabs">
        <button
          type="button"
          className={`pattern-tab ${mode === 'non' ? 'active' : ''}`}
          style={{ '--tab-color': '#94a3b8' } as React.CSSProperties}
          onClick={() => setMode('non')}
        >
          非相互作用（理想气体）
        </button>
        <button
          type="button"
          className={`pattern-tab ${mode === 'inter' ? 'active' : ''}`}
          style={{ '--tab-color': '#2f6bff' } as React.CSSProperties}
          onClick={() => setMode('inter')}
        >
          相互作用（有聚集）
        </button>
      </div>

      <div className="coffee-grid">
        {grid.map((row, r) => (
          <div key={r} className="coffee-row">
            {row.map((v, c) => (
              <div
                key={c}
                className="coffee-cell"
                style={{ background: v ? '#f8fafc' : '#1e293b' }}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="coffee-info" style={{ borderColor: mode === 'non' ? '#94a3b8' : '#2f6bff' }}>
        {mode === 'non' ? (
          <>
            <b style={{ color: '#94a3b8' }}>非相互作用</b>
            <br />
            每个粒子独立随机游走，无视邻居。
            <br />
            <b>结果</b>：只形成"模糊的边界"，没有结构 → 复杂度单调递减
          </>
        ) : (
          <>
            <b style={{ color: '#2f6bff' }}>相互作用</b>
            <br />
            粒子倾向与同色邻居聚集。
            <br />
            <b>结果</b>：形成团簇和条纹 → 复杂度先升后降（倒 U 型）
          </>
        )}
      </div>

      <div className="diagram-caption">
        <b>"复杂度先升后降"只在相互作用模型中成立。</b>
        这是 Aaronson 等人通过对照实验发现的关键结论——
        不是所有封闭系统都符合"第一定律"。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   28. 通用智能度量
   ══════════════════════════════════════════════ */

const UIM_ENVS = [
  { name: '恒定奖励', K: 2, weight: 0.25, color: '#22c55e' },
  { name: '序列记忆', K: 5, weight: 0.03125, color: '#0891b2' },
  { name: '简单推理', K: 8, weight: 0.0039, color: '#f59e0b' },
  { name: '网格寻路', K: 12, weight: 0.00024, color: '#ef4444' },
  { name: '复杂策略', K: 20, weight: 0.000001, color: '#7f1d1d' },
];

export function UniversalIntelligenceDemo() {
  const [sel, setSel] = useState(0);
  const cur = UIM_ENVS[sel];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">通用智能 U(pi)：按环境复杂度加权</figcaption>

      <div className="uim-list">
        {UIM_ENVS.map((e, i) => (
          <button
            key={e.name}
            type="button"
            className={`uim-row ${i === sel ? 'active' : ''}`}
            onClick={() => setSel(i)}
          >
            <span className="uim-name">{e.name}</span>
            <span className="uim-k" style={{ color: e.color }}>K={e.K}</span>
            <div className="uim-bar-track">
              <div
                className="uim-bar"
                style={{
                  width: `${Math.max((e.weight / 0.25) * 100, 0.5)}%`,
                  background: e.color,
                }}
              />
            </div>
            <span className="uim-weight">{e.weight < 0.001 ? e.weight.toExponential(1) : e.weight.toFixed(4)}</span>
          </button>
        ))}
      </div>

      <div className="uim-detail" style={{ borderColor: cur.color }}>
        <div className="uim-formula">
          <code>U(pi) = Sum_mu 2^(-K(mu)) * V_mu(pi)</code>
        </div>
        <div className="uim-cur">
          当前：<b style={{ color: cur.color }}>{cur.name}</b>（K={cur.K}）→ 权重 = 2^(-{cur.K}) = {cur.weight < 0.001 ? cur.weight.toExponential(2) : cur.weight.toFixed(4)}
        </div>
      </div>

      <div className="uim-note">
        <b>奥卡姆剃刀</b>：简单环境（K 小）权重大，复杂环境权重小。
        K=2 占 88% 的权重，K=20 几乎为 0。
      </div>

      <div className="diagram-caption">
        所以 U 主要由<b>基础能力</b>决定：在简单任务上做不好，智能分数会很低。
        这体现了"通用性"是智能的核心——<b>而不是"在某个难任务上很强"</b>。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   29. 基准测试的局限
   ══════════════════════════════════════════════ */

const BENCHMARKS = [
  { name: 'MMLU', desc: '多学科知识', n: 57, tests: '知识记忆', blind: '无法测推理', color: '#2f6bff' },
  { name: 'HumanEval', desc: '代码生成', n: 164, tests: '编程能力', blind: '无法测其他', color: '#22c55e' },
  { name: 'GSM8K', desc: '数学应用题', n: 1319, tests: '数学推理', blind: '无法测语言', color: '#f59e0b' },
  { name: 'ARC', desc: '抽象推理', n: 800, tests: '模式识别', blind: '无法测知识', color: '#7c5cff' },
  { name: 'GAIA', desc: '通用助手', n: 466, tests: '多步任务', blind: '范围有限', color: '#ec4899' },
];

export function BenchmarkLimitationsDemo() {
  const [sel, setSel] = useState(0);
  const cur = BENCHMARKS[sel];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">标准基准 ≠ 通用智能：每个基准都有盲点</figcaption>

      <div className="bench-grid">
        {BENCHMARKS.map((b, i) => (
          <button
            key={b.name}
            type="button"
            className={`bench-card ${i === sel ? 'active' : ''}`}
            style={{ '--bench-color': b.color } as React.CSSProperties}
            onClick={() => setSel(i)}
          >
            <div className="bench-name" style={{ color: b.color }}>{b.name}</div>
            <div className="bench-desc">{b.desc}</div>
            <div className="bench-n">{b.n} 题</div>
          </button>
        ))}
      </div>

      <div className="bench-detail" style={{ borderColor: cur.color }}>
        <div className="bench-row">
          <span className="bench-k">测什么</span>
          <span className="bench-v" style={{ color: cur.color }}>{cur.tests}</span>
        </div>
        <div className="bench-row">
          <span className="bench-k">盲点</span>
          <span className="bench-v" style={{ color: '#ef4444' }}>{cur.blind}</span>
        </div>
      </div>

      <div className="bench-problems">
        <div className="bp-title">三个根本问题</div>
        <div className="bp-item">
          <b>① 任务选择主观</b>
          <span>为什么选 MMLU 而不是别的？Υ(π) 要求"所有环境"</span>
        </div>
        <div className="bp-item">
          <b>② 数据污染</b>
          <span>训练数据可能包含测试题，高分不代表真会</span>
        </div>
        <div className="bp-item">
          <b>③ Goodhart 定律</b>
          <span>一旦某指标成为目标，它就不再是好指标</span>
        </div>
      </div>

      <div className="diagram-caption">
        现代基准追求"广泛覆盖"（ARC、GAIA），正是向 Υ(π) 精神靠拢。
        但<b>没有任何有限基准等价于"所有环境"</b>——这是 Legg-Hutter 定义不可实现的根本原因。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   30. 退化问题
   ══════════════════════════════════════════════ */

const DEGRADATION = [
  { depth: 20, trainErr: 5.2, testErr: 7.1, color: '#22c55e' },
  { depth: 32, trainErr: 6.8, testErr: 8.4, color: '#f59e0b' },
  { depth: 44, trainErr: 9.1, testErr: 10.8, color: '#ef4444' },
  { depth: 56, trainErr: 12.5, testErr: 14.2, color: '#7f1d1d' },
];

export function DegradationDemo() {
  const [sel, setSel] = useState(0);
  const cur = DEGRADATION[sel];
  const maxErr = Math.max(...DEGRADATION.map((d) => d.testErr));

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">退化问题：网络越深，训练误差反而越高</figcaption>

      <div className="degr-chart">
        {DEGRADATION.map((d, i) => (
          <div
            key={d.depth}
            className={`degr-col ${i === sel ? 'active' : ''}`}
            onClick={() => setSel(i)}
          >
            <div className="degr-bars">
              <div
                className="degr-bar train"
                style={{ height: `${(d.trainErr / maxErr) * 100}%` }}
                title={`训练误差 ${d.trainErr}%`}
              />
              <div
                className="degr-bar test"
                style={{ height: `${(d.testErr / maxErr) * 100}%`, background: d.color }}
                title={`测试误差 ${d.testErr}%`}
              />
            </div>
            <div className="degr-depth">{d.depth} 层</div>
          </div>
        ))}
      </div>

      <div className="degr-legend">
        <span><span className="pos-dot" style={{ background: '#94a3b8' }} /> 训练误差</span>
        <span><span className="pos-dot" style={{ background: '#ef4444' }} /> 测试误差</span>
      </div>

      <div className="degr-note" style={{ borderColor: cur.color }}>
        <b>{cur.depth} 层</b>：训练误差 <b style={{ color: '#ef4444' }}>{cur.trainErr}%</b>，
        测试误差 <b>{cur.testErr}%</b>
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          {cur.depth <= 20
            ? '浅层网络：训练误差低，这是正常的'
            : '⚠️ 训练误差也在升高——这不是过拟合，是"退化"'}
        </span>
      </div>

      <div className="diagram-caption">
        <b>关键区分</b>：过拟合 = 训练误差低 + 测试误差高；
        <b>退化 = 训练误差本身就高</b>。
        深层网络连训练集都学不好——这是"优化问题"而非"泛化问题"。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   31. 残差块结构
   ══════════════════════════════════════════════ */

export function ResidualBlockDemo() {
  const [mode, setMode] = useState<'plain' | 'residual'>('residual');

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">普通层 vs 残差层：学什么更容易</figcaption>

      <div className="pattern-tabs">
        <button
          type="button"
          className={`pattern-tab ${mode === 'plain' ? 'active' : ''}`}
          style={{ '--tab-color': '#94a3b8' } as React.CSSProperties}
          onClick={() => setMode('plain')}
        >
          普通层（学 H(x)）
        </button>
        <button
          type="button"
          className={`pattern-tab ${mode === 'residual' ? 'active' : ''}`}
          style={{ '--tab-color': '#2f6bff' } as React.CSSProperties}
          onClick={() => setMode('residual')}
        >
          残差层（学 F(x) = H(x) − x）
        </button>
      </div>

      <svg viewBox="0 0 320 150" className="resblock-svg" role="img" aria-label="残差块">
        <defs>
          <marker id="rb-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
          </marker>
        </defs>

        {/* 输入 */}
        <circle cx="30" cy="75" r="14" fill="#2f6bff18" stroke="#2f6bff" strokeWidth="1.5" />
        <text x="30" y="78" textAnchor="middle" fontSize="8" fill="#2f6bff" fontWeight="700">x</text>

        {/* 主路径 */}
        <line x1="44" y1="75" x2="90" y2="75" stroke="#94a3b8" strokeWidth="1.3" markerEnd="url(#rb-arrow)" />

        <rect x="90" y="55" width="90" height="40" rx="6"
          fill={mode === 'plain' ? '#94a3b818' : '#2f6bff18'}
          stroke={mode === 'plain' ? '#94a3b8' : '#2f6bff'} strokeWidth="1.5" />
        <text x="135" y="72" textAnchor="middle" fontSize="8.5"
          fill={mode === 'plain' ? '#64748b' : '#2f6bff'} fontWeight="700">
          {mode === 'plain' ? 'H(x)' : 'F(x)'}
        </text>
        <text x="135" y="84" textAnchor="middle" fontSize="6.5" fill="#94a3b8">
          {mode === 'plain' ? '直接学目标' : '学残差'}
        </text>

        <line x1="180" y1="75" x2="230" y2="75" stroke="#94a3b8" strokeWidth="1.3" markerEnd="url(#rb-arrow)" />

        {/* 加法节点（仅残差）*/}
        {mode === 'residual' && (
          <>
            <circle cx="250" cy="75" r="12" fill="#22c55e18" stroke="#22c55e" strokeWidth="1.5" />
            <text x="250" y="79" textAnchor="middle" fontSize="11" fill="#22c55e" fontWeight="700">+</text>
            {/* 捷径 */}
            <path d="M30 61 L30 25 L250 25 L250 63" fill="none" stroke="#7c5cff" strokeWidth="1.8" strokeDasharray="5 3" markerEnd="url(#rb-arrow)" />
            <text x="140" y="20" textAnchor="middle" fontSize="7.5" fill="#7c5cff" fontWeight="600">identity（恒等捷径）</text>
            <line x1="262" y1="75" x2="295" y2="75" stroke="#94a3b8" strokeWidth="1.3" markerEnd="url(#rb-arrow)" />
          </>
        )}
        {mode === 'plain' && (
          <line x1="180" y1="75" x2="295" y2="75" stroke="#94a3b8" strokeWidth="1.3" markerEnd="url(#rb-arrow)" />
        )}

        <text x="303" y="78" fontSize="8" fill="#22c55e" fontWeight="700">y</text>
      </svg>

      <div className="resblock-info" style={{ borderColor: mode === 'plain' ? '#94a3b8' : '#2f6bff' }}>
        {mode === 'plain' ? (
          <>
            <b>要学恒等映射 H(x) = x</b>
            <br />
            需要权重恰好是单位矩阵——这很难精确学到
            <br />
            <span style={{ color: '#ef4444' }}>→ 深层网络学不好，出现退化</span>
          </>
        ) : (
          <>
            <b>要学 F(x) = 0（当目标是恒等映射时）</b>
            <br />
            只需把权重置为 0——这非常容易
            <br />
            <span style={{ color: '#22c55e' }}>→ 深层网络至少不会比浅层差</span>
          </>
        )}
      </div>

      <div className="diagram-caption">
        <b>把"学恒等映射"变成"学零"</b>——这是残差连接的全部智慧。
        而且 ∂y/∂x = ∂F/∂x + 1，那个 <b>+1</b> 让梯度直通。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   32. 梯度流动对比
   ══════════════════════════════════════════════ */

export function GradientFlowDemo() {
  const [depth, setDepth] = useState(50);

  const plainGrad = Math.pow(0.9, depth);
  const resGrad = 1 + Math.pow(0.9, depth);

  const W = 340;
  const H = 120;
  const toX = (d: number) => 40 + (d / 100) * (W - 50);
  const toY = (g: number) => {
    const lg = Math.max(Math.log10(g), -6);
    return 10 + ((-lg) / 6) * (H - 25);
  };

  const makePath = (fn: (d: number) => number) => {
    const pts: string[] = [];
    for (let d = 0; d <= 100; d += 2) {
      pts.push(`${toX(d).toFixed(1)},${toY(fn(d)).toFixed(1)}`);
    }
    return `M${pts.join(' L')}`;
  };

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">梯度流动：普通网络的指数衰减 vs 残差的常数项</figcaption>

      <div className="pos-controls">
        <label>
          网络深度
          <input type="range" min="1" max="100" step="1" value={depth}
            onChange={(e) => setDepth(parseInt(e.target.value, 10))} />
          <b>{depth}</b>
        </label>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="gradflow-svg" role="img" aria-label="梯度流动">
        {[0, -2, -4, -6].map((lg, i) => {
          const y = 10 + (i / 3) * (H - 25);
          return (
            <g key={lg}>
              <line x1="38" y1={y} x2={W - 8} y2={y} stroke="#e2e8f0" strokeWidth="0.7" />
              <text x="34" y={y + 3} textAnchor="end" fontSize="6.5" fill="#94a3b8">1e{lg}</text>
            </g>
          );
        })}

        <path d={makePath((d) => Math.pow(0.9, d))} fill="none" stroke="#ef4444" strokeWidth="2" />
        <path d={makePath((d) => 1 + Math.pow(0.9, d))} fill="none" stroke="#22c55e" strokeWidth="2" />

        <circle cx={toX(depth)} cy={toY(plainGrad)} r="3.5" fill="#ef4444" />
        <circle cx={toX(depth)} cy={toY(resGrad)} r="3.5" fill="#22c55e" />
      </svg>

      <div className="gradflow-legend">
        <span><span className="pos-dot" style={{ background: '#ef4444' }} /> 普通网络（连乘 0.9）</span>
        <span><span className="pos-dot" style={{ background: '#22c55e' }} /> 残差网络（1 + 连乘）</span>
      </div>

      <div className="gradflow-stats">
        <span style={{ color: '#ef4444' }}>普通：{plainGrad.toExponential(2)}</span>
        <span style={{ color: '#22c55e' }}>残差：{resGrad.toFixed(3)}</span>
        <span>差距：<b>{(resGrad / Math.max(plainGrad, 1e-300)).toExponential(1)} 倍</b></span>
      </div>

      <div className="diagram-caption">
        <b>∂y/∂x = ∂F/∂x + 1</b>。即使 ∂F/∂x 衰减到 0，梯度仍有 <b>1</b> 通过。
        这就是 ResNet 能训练 152 层（甚至 1000 层）的原因。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   33. Bottleneck 对比
   ══════════════════════════════════════════════ */

const BLOCK_COMPARE = [
  {
    name: 'BasicBlock',
    structure: ['Conv3×3', 'Conv3×3'],
    inOut: 'c → c',
    params: '18c²',
    paramsNum: 18,
    color: '#94a3b8',
    use: 'ResNet-18/34',
  },
  {
    name: 'Bottleneck',
    structure: ['Conv1×1 (降维)', 'Conv3×3', 'Conv1×1 (升维)'],
    inOut: 'c → 4c',
    params: '1.81c²',
    paramsNum: 1.81,
    color: '#2f6bff',
    use: 'ResNet-50/101/152',
  },
];

export function BottleneckCompareDemo() {
  const [sel, setSel] = useState(1);
  const cur = BLOCK_COMPARE[sel];
  const maxParams = 18;

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">BasicBlock vs Bottleneck：参数效率的差异</figcaption>

      <div className="pattern-tabs">
        {BLOCK_COMPARE.map((b, i) => (
          <button
            key={b.name}
            type="button"
            className={`pattern-tab ${i === sel ? 'active' : ''}`}
            style={{ '--tab-color': b.color } as React.CSSProperties}
            onClick={() => setSel(i)}
          >
            {b.name}
          </button>
        ))}
      </div>

      <div className="block-structure">
        {cur.structure.map((s, i) => (
          <div key={i} className="block-layer" style={{ borderColor: cur.color, background: `${cur.color}12` }}>
            {s}
          </div>
        ))}
      </div>

      <div className="block-stats">
        <div className="bs-row">
          <span className="bs-k">输入输出</span>
          <span className="bs-v">{cur.inOut}</span>
        </div>
        <div className="bs-row">
          <span className="bs-k">参数量</span>
          <span className="bs-v" style={{ color: cur.color, fontWeight: 700 }}>{cur.params}</span>
        </div>
        <div className="bs-row">
          <span className="bs-k">用于</span>
          <span className="bs-v">{cur.use}</span>
        </div>
      </div>

      <div className="block-bars">
        {BLOCK_COMPARE.map((b) => (
          <div key={b.name} className="bb-row">
            <span className="bb-name">{b.name}</span>
            <div className="bb-track">
              <div style={{ width: `${(b.paramsNum / maxParams) * 100}%`, background: b.color }} />
            </div>
            <span className="bb-val" style={{ color: b.color }}>{b.params}</span>
          </div>
        ))}
      </div>

      <div className="diagram-caption">
        <b>Bottleneck 参数少 10 倍，输出通道却多 4 倍。</b>
        因为 1×1 先降到 c/4，3×3 只在低维上做。
        这就是 ResNet-50（25M 参数）比 VGG-16（138M 参数）错误率还低的原因。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   34. 捷径上的变换实验
   ══════════════════════════════════════════════ */

const SHORTCUT_VARIANTS = [
  { name: '纯恒等', err: 5.71, color: '#22c55e', note: '不添加任何操作' },
  { name: '缩放 ×0.5', err: 5.95, color: '#0891b2', note: '梯度被衰减一半' },
  { name: '1×1 卷积', err: 6.12, color: '#f59e0b', note: '引入额外参数' },
  { name: 'Dropout', err: 6.35, color: '#ec4899', note: '随机破坏梯度' },
  { name: 'ReLU（原版）', err: 6.61, color: '#ef4444', note: '截断负值' },
];

export function ShortcutTransformDemo() {
  const [sel, setSel] = useState(0);
  const cur = SHORTCUT_VARIANTS[sel];
  const maxErr = Math.max(...SHORTCUT_VARIANTS.map((v) => v.err));

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">捷径上的变换实验：任何操作都损害性能</figcaption>

      <div className="sc-chart">
        {SHORTCUT_VARIANTS.map((v, i) => (
          <div
            key={v.name}
            className={`sc-row ${i === sel ? 'active' : ''}`}
            onClick={() => setSel(i)}
          >
            <span className="sc-name">{v.name}</span>
            <div className="sc-track">
              <div style={{ width: `${(v.err / maxErr) * 100}%`, background: v.color }} />
            </div>
            <span className="sc-val" style={{ color: v.color }}>{v.err}%</span>
          </div>
        ))}
      </div>

      <div className="sc-note" style={{ borderColor: cur.color }}>
        <b style={{ color: cur.color }}>{cur.name}</b>：{cur.note}
        {sel === 0 && <span style={{ color: '#22c55e' }}> ← 错误率最低</span>}
        {sel === 4 && <span style={{ color: '#ef4444' }}> ← 原版 ResNet 的做法，但非最优</span>}
      </div>

      <div className="diagram-caption">
        论文测试了 6 种捷径变换，<b>纯恒等效果最好</b>。
        原版 ResNet 加法后有 ReLU，这就是它不"纯净"的原因。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   35. 预激活结构
   ══════════════════════════════════════════════ */

export function PreActDemo() {
  const [mode, setMode] = useState<'post' | 'pre'>('pre');

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">原版（Post-act）vs 预激活（Pre-act）</figcaption>

      <div className="pattern-tabs">
        <button
          type="button"
          className={`pattern-tab ${mode === 'post' ? 'active' : ''}`}
          style={{ '--tab-color': '#ef4444' } as React.CSSProperties}
          onClick={() => setMode('post')}
        >
          原版 Post-act
        </button>
        <button
          type="button"
          className={`pattern-tab ${mode === 'pre' ? 'active' : ''}`}
          style={{ '--tab-color': '#22c55e' } as React.CSSProperties}
          onClick={() => setMode('pre')}
        >
          预激活 Pre-act
        </button>
      </div>

      <div className="preact-diagram">
        {/* 输入 */}
        <div className="pd-input">x</div>

        {/* 主路径 */}
        <div className="pd-main">
          {mode === 'post' ? (
            <>
              <div className="pd-op">Conv</div>
              <div className="pd-op">BN</div>
              <div className="pd-op relu">ReLU</div>
              <div className="pd-op">Conv</div>
              <div className="pd-op">BN</div>
            </>
          ) : (
            <>
              <div className="pd-op bn">BN</div>
              <div className="pd-op relu">ReLU</div>
              <div className="pd-op">Conv</div>
              <div className="pd-op bn">BN</div>
              <div className="pd-op relu">ReLU</div>
              <div className="pd-op">Conv</div>
            </>
          )}
        </div>

        {/* 加法 */}
        <div className="pd-add">+</div>

        {/* 加法后的操作 */}
        {mode === 'post' ? (
          <div className="pd-after bad">
            ReLU
            <span className="pd-warn">⚠ 截断负值</span>
          </div>
        ) : (
          <div className="pd-after good">
            无操作
            <span className="pd-ok">✓ 纯净捷径</span>
          </div>
        )}

        <div className="pd-output">y</div>
      </div>

      <div className="pd-note" style={{ borderColor: mode === 'post' ? '#ef4444' : '#22c55e' }}>
        {mode === 'post' ? (
          <>
            <b style={{ color: '#ef4444' }}>y = ReLU(F(x) + x)</b>
            <br />
            加法后的 ReLU 会截断负值 → 梯度可能变 0
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              深层累积后信号严重衰减
            </span>
          </>
        ) : (
          <>
            <b style={{ color: '#22c55e' }}>y = F(BN(ReLU(x))) + x</b>
            <br />
            加法后无任何操作 → 捷径纯净
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              ∂y/∂x = ∂F/∂x + 1，那个 +1 永不截断
            </span>
          </>
        )}
      </div>

      <div className="diagram-caption">
        <b>预激活把 BN/ReLU 全部移到卷积前</b>，让最后的加法成为纯净的恒等映射。
        代价是网络最后要补一个 BN+ReLU。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   36. 深度可扩展性
   ══════════════════════════════════════════════ */

const DEPTH_DATA = [
  { depth: 110, post: 6.61, pre: 5.71 },
  { depth: 164, post: 5.71, pre: 5.46 },
  { depth: 1001, post: null, pre: 4.92 },
];

export function DepthScalabilityDemo() {
  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">深度可扩展性：预激活能到 1001 层</figcaption>

      <div className="ds-table">
        <div className="ds-head">
          <span>深度</span>
          <span>原版 Post-act</span>
          <span>预激活 Pre-act</span>
        </div>
        {DEPTH_DATA.map((d) => (
          <div key={d.depth} className="ds-row">
            <span className="ds-depth">{d.depth}</span>
            <span className="ds-post">
              {d.post !== null ? `${d.post}%` : '无法训练 ✗'}
            </span>
            <span className="ds-pre">{d.pre}%</span>
          </div>
        ))}
      </div>

      <div className="ds-bars">
        {DEPTH_DATA.map((d) => (
          <div key={d.depth} className="ds-bar-group">
            <div className="ds-bar-label">{d.depth} 层</div>
            <div className="ds-bar-row">
              <span className="ds-bar-tag">原版</span>
              <div className="ds-bar-track">
                {d.post !== null ? (
                  <div style={{ width: `${(d.post / 7) * 100}%`, background: '#ef4444' }} />
                ) : (
                  <div style={{ width: '100%', background: '#7f1d1d', opacity: 0.4 }} />
                )}
              </div>
              <span className="ds-bar-val">{d.post !== null ? `${d.post}%` : '✗'}</span>
            </div>
            <div className="ds-bar-row">
              <span className="ds-bar-tag">预激活</span>
              <div className="ds-bar-track">
                <div style={{ width: `${(d.pre / 7) * 100}%`, background: '#22c55e' }} />
              </div>
              <span className="ds-bar-val">{d.pre}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="diagram-caption">
        <b>同等层数下预激活都更好</b>，而且原版在 1001 层时<b>完全无法训练</b>。
        这就是"恒等映射必须纯净"的实验证据。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   37. 感受野 vs 分辨率
   ══════════════════════════════════════════════ */

const RF_APPROACHES = [
  {
    name: '池化下采样（FCN）',
    color: '#ef4444',
    resolution: '1/4（丢失）',
    rf: '大',
    params: '无额外',
    note: '感受野够了，但分辨率丢失，上采样只能插值',
  },
  {
    name: '空洞卷积',
    color: '#22c55e',
    resolution: '1（保持）',
    rf: '大',
    params: '不变',
    note: '感受野和分辨率兼得，参数量不增加',
  },
  {
    name: '堆叠标准卷积',
    color: '#f59e0b',
    resolution: '1（保持）',
    rf: '小',
    params: '大量增加',
    note: '要 255 感受野需 127 层，参数爆炸',
  },
];

export function ReceptiveFieldDemo() {
  const [sel, setSel] = useState(1);
  const cur = RF_APPROACHES[sel];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">分辨率与感受野的两难：三种方案对比</figcaption>

      <div className="rf-tabs">
        {RF_APPROACHES.map((a, i) => (
          <button
            key={a.name}
            type="button"
            className={`rf-tab ${i === sel ? 'active' : ''}`}
            style={{ '--rf-color': a.color } as React.CSSProperties}
            onClick={() => setSel(i)}
          >
            {a.name}
          </button>
        ))}
      </div>

      <div className="rf-compare">
        <div className="rf-item">
          <span className="rf-k">分辨率</span>
          <span className="rf-v" style={{ color: cur.resolution.includes('丢失') ? '#ef4444' : '#22c55e' }}>
            {cur.resolution}
          </span>
        </div>
        <div className="rf-item">
          <span className="rf-k">感受野</span>
          <span className="rf-v">{cur.rf}</span>
        </div>
        <div className="rf-item">
          <span className="rf-k">参数量</span>
          <span className="rf-v" style={{ color: cur.params.includes('爆炸') ? '#ef4444' : '#22c55e' }}>
            {cur.params}
          </span>
        </div>
      </div>

      <div className="rf-note" style={{ borderColor: cur.color }}>{cur.note}</div>

      <div className="diagram-caption">
        <b>核心矛盾</b>：要感受野必须下采样，但下采样丢分辨率。
        <b>空洞卷积</b>给出了第三条路——在核里插空洞，既扩大感受野又保持分辨率。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   38. 空洞可视化
   ══════════════════════════════════════════════ */

export function DilationVisualDemo() {
  const [dilation, setDilation] = useState(2);
  const size = Math.min((3 - 1) * dilation + 1, 15);
  const center = Math.floor(size / 2);

  // 生成采样位置
  const sampled = new Set<number>();
  for (let i = -1; i <= 1; i++) {
    sampled.add(center + i * dilation);
  }

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">空洞卷积：核元素之间插入空洞</figcaption>

      <div className="pos-controls">
        <label>
          dilation
          <input
            type="range" min="1" max="5" step="1" value={dilation}
            onChange={(e) => setDilation(parseInt(e.target.value, 10))}
          />
          <b>{dilation}</b>
        </label>
      </div>

      <div className="dil-grid-wrap">
        <div
          className="dil-grid"
          style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
        >
          {Array.from({ length: size * size }).map((_, idx) => {
            const r = Math.floor(idx / size);
            const c = idx % size;
            const isCenter = r === center && c === center;
            const isSampled = sampled.has(r) && sampled.has(c);
            return (
              <div
                key={idx}
                className={`dil-cell ${isSampled ? 'sampled' : ''} ${isCenter ? 'center' : ''}`}
              >
                {isSampled ? '■' : ''}
              </div>
            );
          })}
        </div>
      </div>

      <div className="dil-stats">
        <span>核大小：<b>3×3</b></span>
        <span>参数量：<b>9</b></span>
        <span>感受野：<b style={{ color: '#2f6bff' }}>{size}×{size}</b></span>
      </div>

      <div className="dil-note">
        dilation={dilation} 时，9 个采样点分布在 <b>{size}×{size}</b> 的区域里。
        <b>参数量始终是 9</b>，但感受野随 dilation 线性增长。
      </div>

      <div className="diagram-caption">
        公式：<b>RF = (k−1) × d + 1</b>。k=3、d=5 时 RF=11。
        这就是"不增加参数却扩大感受野"的原理。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   39. 指数增长
   ══════════════════════════════════════════════ */

const EXP_DATA = [
  { layer: 1, d: 1, rf: 3 },
  { layer: 2, d: 2, rf: 7 },
  { layer: 3, d: 4, rf: 15 },
  { layer: 4, d: 8, rf: 31 },
  { layer: 5, d: 16, rf: 63 },
  { layer: 6, d: 32, rf: 127 },
  { layer: 7, d: 64, rf: 255 },
];

export function ExponentialGrowthDemo() {
  const [layers, setLayers] = useState(7);
  const cur = EXP_DATA[layers - 1];
  const maxRf = 255;

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">指数增长的感受野：7 层达 255×255</figcaption>

      <div className="pos-controls">
        <label>
          层数
          <input
            type="range" min="1" max="7" step="1" value={layers}
            onChange={(e) => setLayers(parseInt(e.target.value, 10))}
          />
          <b>{layers}</b>
        </label>
      </div>

      <div className="exp-chart">
        {EXP_DATA.map((d) => (
          <div key={d.layer} className={`exp-row ${d.layer <= layers ? 'active' : ''}`}>
            <span className="exp-layer">L{d.layer}</span>
            <span className="exp-d">d={d.d}</span>
            <div className="exp-track">
              <div
                className="exp-fill"
                style={{
                  width: d.layer <= layers ? `${(d.rf / maxRf) * 100}%` : '0%',
                  background: d.layer <= layers ? '#2f6bff' : 'transparent',
                }}
              />
            </div>
            <span className="exp-rf" style={{ color: d.layer <= layers ? '#2f6bff' : 'var(--text-3)' }}>
              {d.layer <= layers ? d.rf : '—'}
            </span>
          </div>
        ))}
      </div>

      <div className="exp-summary">
        <div className="es-item">
          <span className="es-k">{layers} 层后</span>
          <span className="es-v" style={{ color: '#2f6bff' }}>感受野 {cur.rf}×{cur.rf}</span>
        </div>
        <div className="es-item">
          <span className="es-k">参数量</span>
          <span className="es-v">{layers * 9}（每通道）</span>
        </div>
        <div className="es-item">
          <span className="es-k">对比标准卷积</span>
          <span className="es-v" style={{ color: '#ef4444' }}>
            需 {Math.ceil((cur.rf - 1) / 2)} 层
          </span>
        </div>
      </div>

      <div className="diagram-caption">
        <b>dilation 序列 1,2,4,8,16,32,64</b> 让感受野指数增长，参数量只线性增长。
        7 层 = 63 参数，达到 255 感受野；标准卷积要 127 层 = 1143 参数。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   40. ASPP 多尺度
   ══════════════════════════════════════════════ */

const ASPP_BRANCHES = [
  { d: 1, rf: 3, scale: '细节/边缘', color: '#94a3b8' },
  { d: 6, rf: 13, scale: '小物体', color: '#0891b2' },
  { d: 12, rf: 25, scale: '中物体', color: '#2f6bff' },
  { d: 18, rf: 37, scale: '大物体', color: '#7c5cff' },
  { d: 0, rf: 0, scale: '全局上下文', color: '#22c55e' },
];

export function ASPPDemo() {
  const [sel, setSel] = useState(2);
  const cur = ASPP_BRANCHES[sel];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">ASPP：并行多尺度，捕获不同大小的物体</figcaption>

      <div className="aspp-diagram">
        <div className="aspp-input">输入特征图</div>
        <div className="aspp-branches">
          {ASPP_BRANCHES.map((b, i) => (
            <button
              key={i}
              type="button"
              className={`aspp-branch ${i === sel ? 'active' : ''}`}
              style={{ '--aspp-color': b.color } as React.CSSProperties}
              onClick={() => setSel(i)}
            >
              <span className="ab-d">{b.d === 0 ? 'GAP' : `d=${b.d}`}</span>
              <span className="ab-rf">{b.d === 0 ? '全局' : `RF ${b.rf}`}</span>
            </button>
          ))}
        </div>
        <div className="aspp-concat">Concat</div>
        <div className="aspp-project">Conv 1×1</div>
        <div className="aspp-output">输出</div>
      </div>

      <div className="aspp-detail" style={{ borderColor: cur.color }}>
        <div className="ad-row">
          <span className="ad-k">分支</span>
          <span className="ad-v" style={{ color: cur.color }}>
            {cur.d === 0 ? 'GAP（全局平均池化）' : `dilation = ${cur.d}`}
          </span>
        </div>
        <div className="ad-row">
          <span className="ad-k">感受野</span>
          <span className="ad-v">{cur.d === 0 ? '整张图' : `${cur.rf}×${cur.rf}`}</span>
        </div>
        <div className="ad-row">
          <span className="ad-k">捕获</span>
          <span className="ad-v">{cur.scale}</span>
        </div>
      </div>

      <div className="diagram-caption">
        <b>单个 dilation 只能看一个尺度</b>：d=1 只看到细节不知道"这是车"，
        d=18 看大范围但边界模糊。
        <b>ASPP 并行所有尺度再 concat</b>，既准确又精细。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   41. 固定向量瓶颈
   ══════════════════════════════════════════════ */

const BOTTLENECK_DATA = [
  { len: 5, bleu: 32, color: '#22c55e' },
  { len: 10, bleu: 28, color: '#84cc16' },
  { len: 20, bleu: 21, color: '#f59e0b' },
  { len: 30, bleu: 14, color: '#f97316' },
  { len: 50, bleu: 7, color: '#ef4444' },
];

export function FixedVectorBottleneckDemo() {
  const [sel, setSel] = useState(2);
  const cur = BOTTLENECK_DATA[sel];
  const maxBleu = 32;

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">固定向量瓶颈：句子越长，翻译质量越差</figcaption>

      <div className="bv-chart">
        {BOTTLENECK_DATA.map((d, i) => (
          <div
            key={d.len}
            className={`bv-col ${i === sel ? 'active' : ''}`}
            onClick={() => setSel(i)}
          >
            <div className="bv-bar-wrap">
              <div className="bv-bar" style={{ height: `${(d.bleu / maxBleu) * 100}%`, background: d.color }} />
            </div>
            <div className="bv-len">{d.len} 词</div>
          </div>
        ))}
      </div>

      <div className="bv-detail" style={{ borderColor: cur.color }}>
        <b>{cur.len} 词句子</b>：BLEU = <b style={{ color: cur.color }}>{cur.bleu}</b>
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          {cur.len <= 10
            ? '短句：信息能塞进固定向量，效果不错'
            : cur.len <= 20
              ? '中句：开始丢失信息，性能下降'
              : '长句：大量信息被压缩丢弃，性能急剧下降'}
        </span>
      </div>

      <div className="diagram-caption">
        <b>信息瓶颈</b>：向量维度固定（如 1000），句子越长每词分到的容量越少。
        类比：把 500 页书压缩成一页摘要——细节必然丢失。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   42. 对齐演示
   ══════════════════════════════════════════════ */

const ALIGN_SRC = ['The', 'cat', 'sat', 'on', 'the', 'mat'];
const ALIGN_TRG = ['Le', 'chat', 'etait', 'sur', 'le', 'tapis'];

export function AlignmentDemo() {
  const [trgIdx, setTrgIdx] = useState(1);

  // 模拟注意力权重（近似对角）
  const weights = ALIGN_TRG.map((_, t) =>
    ALIGN_SRC.map((_, i) => {
      const dist = Math.abs(i - t);
      return Math.exp(-dist * 1.8);
    })
  ).map((row) => {
    const sum = row.reduce((a, b) => a + b, 0);
    return row.map((v) => v / sum);
  });

  const cur = weights[trgIdx];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">动态对齐：翻译每个词时关注源句的不同位置</figcaption>

      <div className="align-src">
        {ALIGN_SRC.map((w, i) => (
          <div
            key={i}
            className="align-word"
            style={{
              opacity: 0.25 + cur[i] * 2.5,
              transform: `scale(${0.85 + cur[i] * 0.9})`,
              borderColor: cur[i] > 0.3 ? '#2f6bff' : 'var(--border)',
              background: cur[i] > 0.3 ? 'rgba(47,107,255,0.12)' : 'var(--bg-soft)',
            }}
          >
            {w}
            <span className="align-w">{(cur[i] * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>

      <div className="align-arrow">↓ 注意力权重 ↓</div>

      <div className="align-trg">
        {ALIGN_TRG.map((w, t) => (
          <button
            key={t}
            type="button"
            className={`align-tword ${t === trgIdx ? 'active' : ''}`}
            onClick={() => setTrgIdx(t)}
          >
            {w}
          </button>
        ))}
      </div>

      <div className="align-note">
        正在生成 <b style={{ color: '#2f6bff' }}>{ALIGN_TRG[trgIdx]}</b>，
        最关注源词 <b style={{ color: '#2f6bff' }}>{ALIGN_SRC[cur.indexOf(Math.max(...cur))]}</b>
        （权重 {(Math.max(...cur) * 100).toFixed(0)}%）
      </div>

      <div className="diagram-caption">
        <b>没有人告诉模型 "cat" 对应 "chat"</b>——对齐是训练中自动学出来的。
        这就是论文标题 "Jointly Learning to Align and Translate" 的含义。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   43. 注意力数学
   ══════════════════════════════════════════════ */

export function BahdanauMathDemo() {
  const [step, setStep] = useState(0);

  const scores = [0.8, 3.2, 1.1, 0.3, 1.6];
  const maxScore = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - maxScore));
  const sumExp = exps.reduce((a, b) => a + b, 0);
  const weights = exps.map((e) => e / sumExp);

  const steps = [
    {
      name: '① 打分',
      formula: 'e_i = vᵀ · tanh(W_s·s + W_h·h_i)',
      content: (
        <div className="am-scores">
          {scores.map((s, i) => (
            <div key={i} className="am-score-item">
              <span className="am-idx">h{i + 1}</span>
              <span className="am-val" style={{ color: '#7c5cff' }}>{s.toFixed(2)}</span>
            </div>
          ))}
        </div>
      ),
      note: '给每个源词位置打一个"相关度"分数',
    },
    {
      name: '② Softmax',
      formula: 'α_i = exp(e_i) / Σ exp(e_j)',
      content: (
        <div className="am-scores">
          {weights.map((w, i) => (
            <div key={i} className="am-score-item">
              <span className="am-idx">α{i + 1}</span>
              <span className="am-val" style={{ color: '#22c55e' }}>{(w * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      ),
      note: '归一化成概率分布，和为 1',
    },
    {
      name: '③ 加权聚合',
      formula: 'c = Σ α_i · h_i',
      content: (
        <div className="am-bars">
          {weights.map((w, i) => (
            <div key={i} className="am-bar-col">
              <div className="am-bar-track">
                <div className="am-bar-fill" style={{ height: `${w * 100}%`, background: '#2f6bff' }} />
              </div>
              <span className="am-bar-label">h{i + 1}</span>
            </div>
          ))}
        </div>
      ),
      note: '按权重混合所有源词信息，得到上下文向量 c',
    },
  ];

  const cur = steps[step];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">注意力的三步计算</figcaption>

      <div className="pattern-tabs">
        {steps.map((s, i) => (
          <button
            key={i}
            type="button"
            className={`pattern-tab ${i === step ? 'active' : ''}`}
            style={{ '--tab-color': '#2f6bff' } as React.CSSProperties}
            onClick={() => setStep(i)}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="am-formula"><code>{cur.formula}</code></div>

      <div className="am-content">{cur.content}</div>

      <div className="am-note">{cur.note}</div>

      <div className="diagram-caption">
        三步：<b>打分 → softmax → 加权聚合</b>。
        这就是注意力的全部——Transformer 用的是同一套逻辑，只是打分函数换成点积。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   44. 注意力热力图
   ══════════════════════════════════════════════ */

export function AttentionHeatmapDemo() {
  const [offset, setOffset] = useState(0);

  const src = ['The', 'cat', 'sat', 'on', 'the', 'mat'];
  const trg = ['Le', 'chat', 'etait', 'sur', 'le', 'tapis'];

  // 生成对齐矩阵
  const matrix = trg.map((_, t) => {
    const row = src.map((_, i) => {
      const target = Math.min(t + offset, src.length - 1);
      const dist = Math.abs(i - target);
      return Math.exp(-dist * 1.5);
    });
    const sum = row.reduce((a, b) => a + b, 0);
    return row.map((v) => v / sum);
  });

  const maxVal = Math.max(...matrix.flat());

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">注意力热力图：颜色越深，关注度越高</figcaption>

      <div className="pos-controls">
        <label>
          对齐偏移
          <input
            type="range" min="-3" max="3" step="1" value={offset}
            onChange={(e) => setOffset(parseInt(e.target.value, 10))}
          />
          <b>{offset > 0 ? '+' : ''}{offset}</b>
        </label>
      </div>

      <div className="hm-wrap">
        <div className="hm-corner" />
        {src.map((w, i) => (
          <div key={i} className="hm-src-label">{w}</div>
        ))}

        {matrix.map((row, t) => (
          <Fragment key={t}>
            <div className="hm-trg-label">{trg[t]}</div>
            {row.map((v, i) => (
              <div
                key={i}
                className="hm-cell"
                style={{
                  background: `rgba(47,107,255,${(v / maxVal) * 0.85})`,
                  color: v / maxVal > 0.5 ? '#fff' : 'var(--text-3)',
                }}
                title={`${trg[t]} → ${src[i]}: ${(v * 100).toFixed(1)}%`}
              >
                {(v * 100).toFixed(0)}
              </div>
            ))}
          </Fragment>
        ))}
      </div>

      <div className="hm-note">
        偏移 <b>{offset > 0 ? '+' : ''}{offset}</b> 表示目标词 t 主要关注源词 t{offset >= 0 ? '+' : ''}{offset}。
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          {offset === 0
            ? '偏移 0：近似对角线——语序相同（如英语→法语）'
            : offset > 0
              ? '正偏移：目标词关注更靠后的源词（如动词后置语言）'
              : '负偏移：目标词关注更靠前的源词（如宾语前置语言）'}
        </span>
      </div>

      <div className="diagram-caption">
        真实模型的注意力矩阵通常不是完美对角线，而是<b>有噪声的软对齐</b>——
        这说明模型学会了"结合上下文判断对应关系"。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   45. Transformer 整体架构
   ══════════════════════════════════════════════ */

export function TransformerArchDemo() {
  const [sel, setSel] = useState<'encoder' | 'decoder'>('encoder');
  const isEnc = sel === 'encoder';

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">Transformer 整体架构：编码器与解码器</figcaption>

      <div className="pattern-tabs">
        <button
          type="button"
          className={`pattern-tab ${isEnc ? 'active' : ''}`}
          style={{ '--tab-color': '#2f6bff' } as React.CSSProperties}
          onClick={() => setSel('encoder')}
        >
          Encoder（可看全句）
        </button>
        <button
          type="button"
          className={`pattern-tab ${!isEnc ? 'active' : ''}`}
          style={{ '--tab-color': '#22c55e' } as React.CSSProperties}
          onClick={() => setSel('decoder')}
        >
          Decoder（自回归生成）
        </button>
      </div>

      <div className="tarch">
        <div className="tarch-input">{isEnc ? '源句' : '目标句（已生成部分）'}</div>
        <div className="tarch-arrow">↓</div>
        <div className="tarch-box small">Embedding + Positional Encoding</div>
        <div className="tarch-arrow">↓</div>

        {isEnc ? (
          <>
            <div className="tarch-layer" style={{ borderColor: '#2f6bff' }}>
              <div className="tl-title">Encoder Layer × 6</div>
              <div className="tl-sub" style={{ borderColor: '#7c5cff' }}>Multi-Head Self-Attention</div>
              <div className="tl-note">+ Add &amp; Norm</div>
              <div className="tl-sub" style={{ borderColor: '#f59e0b' }}>Feed Forward (2048)</div>
              <div className="tl-note">+ Add &amp; Norm</div>
            </div>
            <div className="tarch-arrow">↓</div>
            <div className="tarch-output" style={{ borderColor: '#2f6bff', color: '#2f6bff' }}>memory (B, T_src, 512)</div>
          </>
        ) : (
          <>
            <div className="tarch-layer" style={{ borderColor: '#22c55e' }}>
              <div className="tl-title">Decoder Layer × 6</div>
              <div className="tl-sub" style={{ borderColor: '#7c5cff' }}>Masked Self-Attention</div>
              <div className="tl-note">causal mask，不看未来</div>
              <div className="tl-sub" style={{ borderColor: '#2f6bff' }}>Cross-Attention</div>
              <div className="tl-note">Q 来自 decoder，K/V 来自 encoder</div>
              <div className="tl-sub" style={{ borderColor: '#f59e0b' }}>Feed Forward</div>
            </div>
            <div className="tarch-arrow">↓</div>
            <div className="tarch-box small">Linear → Softmax</div>
            <div className="tarch-arrow">↓</div>
            <div className="tarch-output" style={{ borderColor: '#22c55e', color: '#15803d' }}>下一个词的概率</div>
          </>
        )}
      </div>

      <div className="tarch-note">
        {isEnc ? (
          <>
            <b>Encoder 是双向的</b>——每个位置都能看到整句。
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              输出 memory 会传给 decoder 的每一层
            </span>
          </>
        ) : (
          <>
            <b>Decoder 是单向的</b>——每个位置只能看到已生成的词。
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              交叉注意力是"翻译发生的地方"
            </span>
          </>
        )}
      </div>

      <div className="diagram-caption">
        编码器理解源句，解码器逐词生成译文。
        <b>交叉注意力</b>让解码器每步查询源句的相关部分。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   46. 缩放点积
   ══════════════════════════════════════════════ */

export function ScaledDotProductDemo() {
  const [dModel, setDModel] = useState(64);
  const [sel, setSel] = useState(0);

  const dk = dModel / 8;
  const rawStd = Math.sqrt(dk);

  // 模拟 softmax 饱和
  const scores = [rawStd * 2, rawStd, 0, -rawStd, -rawStd * 2];
  const maxS = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - maxS));
  const sumE = exps.reduce((a, b) => a + b, 0);
  const probs = exps.map((e) => e / sumE);

  const scaledScores = scores.map((s) => s / Math.sqrt(dk));
  const maxSS = Math.max(...scaledScores);
  const expsS = scaledScores.map((s) => Math.exp(s - maxSS));
  const sumES = expsS.reduce((a, b) => a + b, 0);
  const probsS = expsS.map((e) => e / sumES);

  const tabs = ['不缩放（原始点积）', '除以 √d_k'];
  const curProbs = sel === 0 ? probs : probsS;

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">为什么除以 √d_k：防止 softmax 饱和</figcaption>

      <div className="pos-controls">
        <label>
          d_k
          <input
            type="range" min="8" max="512" step="8" value={dk}
            onChange={(e) => setDModel(parseInt(e.target.value, 10) * 8)}
          />
          <b>{dk}</b>
        </label>
      </div>

      <div className="pattern-tabs">
        {tabs.map((t, i) => (
          <button
            key={t}
            type="button"
            className={`pattern-tab ${i === sel ? 'active' : ''}`}
            style={{ '--tab-color': i === 0 ? '#ef4444' : '#22c55e' } as React.CSSProperties}
            onClick={() => setSel(i)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="sdp-stats">
        <span>点积标准差：<b style={{ color: '#ef4444' }}>{rawStd.toFixed(2)}</b></span>
        <span>缩放后标准差：<b style={{ color: '#22c55e' }}>{(rawStd / Math.sqrt(dk)).toFixed(2)}</b></span>
        <span>最大权重：<b style={{ color: sel === 0 ? '#ef4444' : '#22c55e' }}>{(Math.max(...curProbs) * 100).toFixed(1)}%</b></span>
      </div>

      <div className="sdp-bars">
        {curProbs.map((p, i) => (
          <div key={i} className="sdp-col">
            <div className="sdp-track">
              <div
                className="sdp-fill"
                style={{
                  height: `${p * 100}%`,
                  background: sel === 0 ? '#ef4444' : '#22c55e',
                }}
              />
            </div>
            <span className="sdp-val">{(p * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>

      <div className="sdp-note" style={{ borderColor: sel === 0 ? '#ef4444' : '#22c55e' }}>
        {sel === 0 ? (
          <>
            <b style={{ color: '#ef4444' }}>不缩放</b>：d_k={dk} 时点积标准差 {rawStd.toFixed(1)}，
            softmax 输出接近 one-hot（最大 {(Math.max(...probs) * 100).toFixed(0)}%）
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              → 梯度接近 0，训练停滞
            </span>
          </>
        ) : (
          <>
            <b style={{ color: '#22c55e' }}>除以 √d_k</b>：标准差归一到 1，
            softmax 输出更平缓（最大 {(Math.max(...probsS) * 100).toFixed(0)}%）
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              → 梯度保持，训练正常
            </span>
          </>
        )}
      </div>

      <div className="diagram-caption">
        <b>Var(q·k) = d_k</b>。d_k=512 时标准差约 22.6，点积可能达 ±60，
        softmax 饱和。除以 <b>√d_k</b> 把方差归一到 1。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   47. Mask 演示
   ══════════════════════════════════════════════ */

export function MaskDemo() {
  const [mode, setMode] = useState<'causal' | 'padding'>('causal');
  const size = 6;

  // causal mask
  const causal = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => c <= r)
  );

  // padding mask（最后两个位置是 pad）
  const padPositions = [4, 5];
  const padding = Array.from({ length: size }, () =>
    Array.from({ length: size }, (_, c) => !padPositions.includes(c))
  );

  const mask = mode === 'causal' ? causal : padding;

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">两种 mask：causal（不看未来）与 padding（忽略填充）</figcaption>

      <div className="pattern-tabs">
        <button
          type="button"
          className={`pattern-tab ${mode === 'causal' ? 'active' : ''}`}
          style={{ '--tab-color': '#7c5cff' } as React.CSSProperties}
          onClick={() => setMode('causal')}
        >
          Causal Mask
        </button>
        <button
          type="button"
          className={`pattern-tab ${mode === 'padding' ? 'active' : ''}`}
          style={{ '--tab-color': '#f59e0b' } as React.CSSProperties}
          onClick={() => setMode('padding')}
        >
          Padding Mask
        </button>
      </div>

      <div className="mask-grid">
        <div className="mask-corner" />
        {Array.from({ length: size }).map((_, c) => (
          <div key={c} className="mask-head">
            {mode === 'padding' && padPositions.includes(c) ? 'pad' : c}
          </div>
        ))}
        {mask.map((row, r) => (
          <Fragment key={r}>
            <div className="mask-head">{r}</div>
            {row.map((v, c) => (
              <div
                key={c}
                className={`mask-cell ${v ? 'visible' : 'blocked'}`}
              >
                {v ? '✓' : '✗'}
              </div>
            ))}
          </Fragment>
        ))}
      </div>

      <div className="mask-note" style={{ borderColor: mode === 'causal' ? '#7c5cff' : '#f59e0b' }}>
        {mode === 'causal' ? (
          <>
            <b style={{ color: '#7c5cff' }}>Causal mask</b>：位置 i 只能看到 0..i（下三角）。
            <br />
            保证自回归生成不"偷看"未来。形状 (B, 1, T, T)。
          </>
        ) : (
          <>
            <b style={{ color: '#f59e0b' }}>Padding mask</b>：所有位置都不关注 pad（位置 4、5）。
            <br />
            形状 (B, 1, 1, T)，广播到所有 query 位置。
          </>
        )}
      </div>

      <div className="diagram-caption">
        实现：<code>scores.masked_fill(mask == 0, -1e9)</code>。
        用 <b>-1e9 而非 -inf</b>，防止整行都是 -inf 时 softmax 产生 nan。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   48. 多头注意力
   ══════════════════════════════════════════════ */

export function MultiHeadDemo() {
  const [sel, setSel] = useState(0);

  const heads = [
    { name: '头 1', focus: '相邻词（局部语法）', pattern: [0.5, 0.3, 0.1, 0.05, 0.05] },
    { name: '头 2', focus: '句首（全局上下文）', pattern: [0.7, 0.1, 0.1, 0.05, 0.05] },
    { name: '头 3', focus: '动词（句法依赖）', pattern: [0.05, 0.6, 0.2, 0.1, 0.05] },
    { name: '头 4', focus: '指代（coreference）', pattern: [0.1, 0.05, 0.05, 0.7, 0.1] },
  ];

  const cur = heads[sel];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">多头注意力：不同的头关注不同的关系</figcaption>

      <div className="mh-heads">
        {heads.map((h, i) => (
          <button
            key={i}
            type="button"
            className={`mh-head ${i === sel ? 'active' : ''}`}
            onClick={() => setSel(i)}
          >
            <span className="mh-name">{h.name}</span>
            <span className="mh-focus">{h.focus}</span>
          </button>
        ))}
      </div>

      <div className="mh-viz">
        <div className="mh-label">注意力分布</div>
        <div className="mh-bars">
          {cur.pattern.map((p, i) => (
            <div key={i} className="mh-col">
              <div className="mh-track">
                <div className="mh-fill" style={{ height: `${p * 100}%` }} />
              </div>
              <span className="mh-pos">{i}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mh-info">
        <div className="mh-row">
          <span className="mh-k">参数量</span>
          <span className="mh-v">与单头相同（d_model = h × d_k）</span>
        </div>
        <div className="mh-row">
          <span className="mh-k">总维度</span>
          <span className="mh-v">合并后仍是 d_model（不扩容）</span>
        </div>
        <div className="mh-row">
          <span className="mh-k">作用</span>
          <span className="mh-v">{cur.focus}</span>
        </div>
      </div>

      <div className="diagram-caption">
        <b>多头是"分工"不是"扩容"</b>——参数量不变，但并行多个相似度空间，
        表达能力更强。类比：八个人用不同标准判断相关性，综合更全面。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   49. 位置编码（Transformer 版）
   ══════════════════════════════════════════════ */

export function PositionalEncodingDemo2() {
  const [pos, setPos] = useState(5);
  const dModel = 16;

  const encoding = Array.from({ length: dModel }, (_, i) => {
    const divTerm = Math.exp(-Math.log(10000) * (2 * Math.floor(i / 2)) / dModel);
    return i % 2 === 0
      ? Math.sin(pos * divTerm)
      : Math.cos(pos * divTerm);
  });

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">正弦位置编码：每个位置有独特模式</figcaption>

      <div className="pos-controls">
        <label>
          位置 pos
          <input
            type="range" min="0" max="50" step="1" value={pos}
            onChange={(e) => setPos(parseInt(e.target.value, 10))}
          />
          <b>{pos}</b>
        </label>
      </div>

      <div className="pe2-bars">
        {encoding.map((v, i) => (
          <div key={i} className="pe2-col">
            <div className="pe2-track">
              <div
                className="pe2-fill"
                style={{
                  height: `${Math.abs(v) * 100}%`,
                  background: v >= 0 ? '#2f6bff' : '#ef4444',
                  position: 'absolute',
                  bottom: v >= 0 ? '50%' : 'auto',
                  top: v < 0 ? '50%' : 'auto',
                }}
              />
            </div>
            <span className="pe2-dim">{i}</span>
          </div>
        ))}
      </div>

      <div className="pe2-note">
        <div><b>偶数维</b>：sin(pos / 10000^(2i/d))</div>
        <div><b>奇数维</b>：cos(pos / 10000^(2i/d))</div>
        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-3)' }}>
          低维变化快（高频），高维变化慢（低频）——组合起来唯一标识每个位置
        </div>
      </div>

      <div className="diagram-caption">
        为什么用 sin/cos：<b>值域有界</b>（不覆盖词嵌入）、<b>位置唯一</b>、
        <b>相对位置可表达</b>（PE(pos+k) 是 PE(pos) 的线性变换）。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   50. 编码器解码器结构
   ══════════════════════════════════════════════ */

export function EncoderDecoderDemo() {
  const [sel, setSel] = useState(0);

  const layers = [
    {
      name: 'Encoder Layer',
      color: '#2f6bff',
      subs: [
        { name: 'Multi-Head Self-Attention', detail: 'Q=K=V=x，无 mask（可看全句）' },
        { name: 'Add & Norm', detail: '残差 + LayerNorm' },
        { name: 'Feed Forward', detail: 'Linear(512→2048)→ReLU→Linear(2048→512)' },
        { name: 'Add & Norm', detail: '残差 + LayerNorm' },
      ],
    },
    {
      name: 'Decoder Layer',
      color: '#22c55e',
      subs: [
        { name: 'Masked Self-Attention', detail: 'Q=K=V=x，causal mask（不看未来）' },
        { name: 'Add & Norm', detail: '残差 + LayerNorm' },
        { name: 'Cross-Attention', detail: 'Q 来自 decoder，K/V 来自 encoder memory' },
        { name: 'Add & Norm', detail: '残差 + LayerNorm' },
        { name: 'Feed Forward', detail: '同 encoder' },
        { name: 'Add & Norm', detail: '残差 + LayerNorm' },
      ],
    },
  ];

  const cur = layers[sel];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">Encoder Layer 与 Decoder Layer 的子层结构</figcaption>

      <div className="pattern-tabs">
        {layers.map((l, i) => (
          <button
            key={l.name}
            type="button"
            className={`pattern-tab ${i === sel ? 'active' : ''}`}
            style={{ '--tab-color': l.color } as React.CSSProperties}
            onClick={() => setSel(i)}
          >
            {l.name}
          </button>
        ))}
      </div>

      <div className="ed-layers">
        {cur.subs.map((s, i) => (
          <div key={i} className="ed-sub" style={{ borderColor: cur.color }}>
            <span className="ed-num" style={{ background: cur.color }}>{i + 1}</span>
            <div className="ed-content">
              <div className="ed-name">{s.name}</div>
              <div className="ed-detail">{s.detail}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="ed-note" style={{ borderColor: cur.color }}>
        {sel === 0 ? (
          <>
            <b>Encoder 有 2 个子层</b>：自注意力 + 前馈。
            <br />
            每个子层后都有残差连接和 LayerNorm。
          </>
        ) : (
          <>
            <b>Decoder 有 3 个子层</b>：掩码自注意力 + 交叉注意力 + 前馈。
            <br />
            <b>交叉注意力是"翻译发生的地方"</b>——解码器每步查询源句。
          </>
        )}
      </div>

      <div className="diagram-caption">
        交叉注意力的形状：Q 是 (B, T_tgt, d)，K/V 是 (B, T_src, d)，
        分数矩阵是 <b>(B, h, T_tgt, T_src)</b>——两个维度不同！
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   51. NTM 架构
   ══════════════════════════════════════════════ */

export function NTMArchDemo() {
  const [step, setStep] = useState(0);

  const steps = [
    { name: '控制器读输入', desc: '控制器（RNN）接收当前输入 x_t 和上一步读出的 r_{t-1}' },
    { name: '发出寻址参数', desc: '控制器输出 key、β、g、shift、γ 等参数' },
    { name: '计算位置权重', desc: '内容寻址 + 位置寻址 → 得到软权重 w_t' },
    { name: '读 + 写记忆', desc: 'r_t = w·M（读），M 更新（写）' },
    { name: '输出', desc: '控制器结合 r_t 产生输出 y_t' },
  ];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">NTM 架构：控制器 + 外部记忆 + 可微读写</figcaption>

      <div className="ntm-arch">
        <div className="ntm-ctrl" style={{ opacity: step >= 0 ? 1 : 0.4 }}>
          <div className="ntm-box-label">控制器（RNN）</div>
          <div className="ntm-ctrl-io">
            <span className="ntm-io">x_t</span>
            <span className="ntm-io">r_{'{'}t-1{'}'}</span>
          </div>
        </div>

        <div className="ntm-arrows">
          <div className={`ntm-arrow ${step >= 1 ? 'active' : ''}`}>
            <span>读写参数 →</span>
          </div>
          <div className={`ntm-arrow ${step >= 3 ? 'active' : ''}`}>
            <span>← 读出 r_t</span>
          </div>
        </div>

        <div className="ntm-mem" style={{ opacity: step >= 2 ? 1 : 0.4 }}>
          <div className="ntm-box-label">记忆矩阵 M (N×W)</div>
          <div className="ntm-mem-grid">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className="ntm-slot"
                style={{
                  opacity: step >= 2 ? 0.3 + ((i * 37) % 70) / 100 : 0.15,
                  background: step >= 3 && i % 5 === 0 ? '#2f6bff' : '#7c5cff',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="ntm-steps">
        {steps.map((s, i) => (
          <button
            key={i}
            type="button"
            className={`ntm-step ${i === step ? 'active' : ''}`}
            onClick={() => setStep(i)}
          >
            <span className="ntm-step-num">{i + 1}</span>
            <span className="ntm-step-name">{s.name}</span>
          </button>
        ))}
      </div>

      <div className="ntm-note">
        <b>{steps[step].name}</b>：{steps[step].desc}
      </div>

      <div className="diagram-caption">
        <b>记忆与计算分离</b>——控制器负责"想什么"，记忆负责"记什么"。
        所有操作都是矩阵运算，可端到端训练。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   52. 内容寻址
   ══════════════════════════════════════════════ */

const NTM_MEMORY = [
  { id: 0, vec: [0.9, 0.1, 0.2], label: '猫' },
  { id: 1, vec: [0.1, 0.9, 0.2], label: '狗' },
  { id: 2, vec: [0.2, 0.1, 0.9], label: '鸟' },
  { id: 3, vec: [0.85, 0.15, 0.25], label: '猫2' },
  { id: 4, vec: [0.1, 0.2, 0.85], label: '鸟2' },
];

export function ContentAddressingDemo() {
  const [target, setTarget] = useState(0);
  const [beta, setBeta] = useState(10);

  const key = NTM_MEMORY[target].vec;

  // 余弦相似度
  const sims = NTM_MEMORY.map((m) => {
    const dot = m.vec.reduce((a, b, i) => a + b * key[i], 0);
    const nk = Math.sqrt(key.reduce((a, b) => a + b * b, 0));
    const nm = Math.sqrt(m.vec.reduce((a, b) => a + b * b, 0));
    return dot / (nk * nm + 1e-8);
  });

  // softmax
  const maxS = Math.max(...sims.map((s) => s * beta));
  const exps = sims.map((s) => Math.exp(s * beta - maxS));
  const sumE = exps.reduce((a, b) => a + b, 0);
  const weights = exps.map((e) => e / sumE);

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">内容寻址：按 key 相似度分配权重</figcaption>

      <div className="ca-controls">
        <label>
          查询 key
          <div className="ca-key-btns">
            {NTM_MEMORY.map((m, i) => (
              <button
                key={i}
                type="button"
                className={`ca-key-btn ${i === target ? 'active' : ''}`}
                onClick={() => setTarget(i)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </label>
      </div>

      <div className="pos-controls">
        <label>
          β（锐度）
          <input type="range" min="1" max="30" step="1" value={beta}
            onChange={(e) => setBeta(parseInt(e.target.value, 10))} />
          <b>{beta}</b>
        </label>
      </div>

      <div className="ca-rows">
        {NTM_MEMORY.map((m, i) => (
          <div key={i} className="ca-row">
            <span className="ca-slot">槽位{m.id}</span>
            <span className="ca-label">{m.label}</span>
            <div className="ca-track">
              <div className="ca-fill" style={{ width: `${weights[i] * 100}%` }} />
            </div>
            <span className="ca-sim">sim={sims[i].toFixed(3)}</span>
            <span className="ca-w" style={{ color: weights[i] > 0.3 ? '#2f6bff' : 'var(--text-3)' }}>
              {(weights[i] * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      <div className="ca-note">
        查询 <b style={{ color: '#2f6bff' }}>{NTM_MEMORY[target].label}</b>，
        权重最大的是 <b style={{ color: '#2f6bff' }}>
          槽位{weights.indexOf(Math.max(...weights))}
        </b>（{(Math.max(...weights) * 100).toFixed(1)}%）
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          {beta < 5
            ? 'β 小：权重平缓，读出的向量是多个槽位的混合'
            : beta < 15
              ? 'β 中：权重较集中'
              : 'β 大：权重接近 one-hot，精确匹配'}
        </span>
      </div>

      <div className="diagram-caption">
        <b>K = cos(key, M[i])</b>，然后 <b>w = softmax(β·K)</b>。
        余弦相似度只看方向不看长度——适合"按内容查找"。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   53. 位置寻址
   ══════════════════════════════════════════════ */

export function LocationAddressingDemo() {
  const [gate, setGate] = useState(0.5);
  const [shiftDir, setShiftDir] = useState(1);
  const [gamma, setGamma] = useState(1);

  const N = 8;
  const prevPos = 2;
  const contentPos = 5;

  // ① 插值
  const wG = Array.from({ length: N }, (_, i) => {
    const fromPrev = i === prevPos ? 1 - gate : 0;
    const fromContent = i === contentPos ? gate : 0;
    return fromPrev + fromContent;
  });

  // ② 移位
  const shifted = Array.from({ length: N }, (_, i) => {
    const src = (i - shiftDir + N) % N;
    return wG[src];
  });

  // ③ 锐化
  const powed = shifted.map((v) => Math.pow(v, gamma));
  const sumPow = powed.reduce((a, b) => a + b, 0);
  const final = powed.map((v) => v / (sumPow + 1e-10));

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">位置寻址三步：插值 → 移位 → 锐化</figcaption>

      <div className="la-controls">
        <label>
          插值门控 g
          <input type="range" min="0" max="1" step="0.05" value={gate}
            onChange={(e) => setGate(parseFloat(e.target.value))} />
          <b>{gate.toFixed(2)}</b>
        </label>
        <label>
          锐化 γ
          <input type="range" min="1" max="5" step="0.5" value={gamma}
            onChange={(e) => setGamma(parseFloat(e.target.value))} />
          <b>{gamma.toFixed(1)}</b>
        </label>
      </div>

      <div className="pattern-tabs">
        <button
          type="button"
          className={`pattern-tab ${shiftDir === 0 ? 'active' : ''}`}
          style={{ '--tab-color': '#94a3b8' } as React.CSSProperties}
          onClick={() => setShiftDir(0)}
        >
          不移位
        </button>
        <button
          type="button"
          className={`pattern-tab ${shiftDir === 1 ? 'active' : ''}`}
          style={{ '--tab-color': '#2f6bff' } as React.CSSProperties}
          onClick={() => setShiftDir(1)}
        >
          向前 1 格
        </button>
        <button
          type="button"
          className={`pattern-tab ${shiftDir === -1 ? 'active' : ''}`}
          style={{ '--tab-color': '#f59e0b' } as React.CSSProperties}
          onClick={() => setShiftDir(-1)}
        >
          向后 1 格
        </button>
      </div>

      <div className="la-stage">
        <div className="la-stage-label">① 插值后（位置{prevPos}与{contentPos}混合）</div>
        <div className="la-bars">
          {wG.map((v, i) => (
            <div key={i} className="la-col">
              <div className="la-track">
                <div className="la-fill" style={{ height: `${v * 100}%`, background: '#94a3b8' }} />
              </div>
              <span className="la-pos">{i}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="la-stage">
        <div className="la-stage-label">② 移位后</div>
        <div className="la-bars">
          {shifted.map((v, i) => (
            <div key={i} className="la-col">
              <div className="la-track">
                <div className="la-fill" style={{ height: `${v * 100}%`, background: '#f59e0b' }} />
              </div>
              <span className="la-pos">{i}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="la-stage">
        <div className="la-stage-label">③ 锐化后（γ={gamma}）</div>
        <div className="la-bars">
          {final.map((v, i) => (
            <div key={i} className="la-col">
              <div className="la-track">
                <div className="la-fill" style={{ height: `${v * 100}%`, background: '#2f6bff' }} />
              </div>
              <span className="la-pos">{i}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="la-note">
        最终峰值在位置 <b style={{ color: '#2f6bff' }}>{final.indexOf(Math.max(...final))}</b>
        （权重 {(Math.max(...final) * 100).toFixed(1)}%）
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          g=1 用内容寻址，g=0 沿用上一步位置。γ 越大越聚焦。
        </span>
      </div>

      <div className="diagram-caption">
        <b>位置寻址让 NTM 能"移动"</b>——排序、遍历都需要它。
        内容寻址只能"找到像的"，不能表达"下一个"。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   54. 写操作
   ══════════════════════════════════════════════ */

export function WriteOperationDemo() {
  const [weight, setWeight] = useState(1.0);
  const [erase, setErase] = useState(1.0);

  const before = [0.8, 0.6, 0.4];
  const add = [0.2, 0.9, 0.5];

  // 擦除 + 添加
  const erased = before.map((v) => v * (1 - weight * erase));
  const after = erased.map((v, i) => v + weight * add[i]);

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">写操作：擦除 + 添加，全程可微</figcaption>

      <div className="la-controls">
        <label>
          写入权重 w
          <input type="range" min="0" max="1" step="0.05" value={weight}
            onChange={(e) => setWeight(parseFloat(e.target.value))} />
          <b>{weight.toFixed(2)}</b>
        </label>
        <label>
          擦除强度 e
          <input type="range" min="0" max="1" step="0.05" value={erase}
            onChange={(e) => setErase(parseFloat(e.target.value))} />
          <b>{erase.toFixed(2)}</b>
        </label>
      </div>

      <div className="wo-stage">
        <div className="wo-row">
          <span className="wo-label">写入前 M</span>
          <div className="wo-cells">
            {before.map((v, i) => (
              <div key={i} className="wo-cell" style={{ opacity: 0.3 + v * 0.7 }}>
                {v.toFixed(2)}
              </div>
            ))}
          </div>
        </div>

        <div className="wo-arrow">↓ ① 擦除：M × (1 − w·e)</div>

        <div className="wo-row">
          <span className="wo-label">擦除后</span>
          <div className="wo-cells">
            {erased.map((v, i) => (
              <div key={i} className="wo-cell erased" style={{ opacity: 0.3 + v * 0.7 }}>
                {v.toFixed(2)}
              </div>
            ))}
          </div>
        </div>

        <div className="wo-arrow">↓ ② 添加：+ w·a（a = [{add.join(', ')}]）</div>

        <div className="wo-row">
          <span className="wo-label">写入后 M</span>
          <div className="wo-cells">
            {after.map((v, i) => (
              <div key={i} className="wo-cell final" style={{ opacity: 0.3 + Math.min(v, 1) * 0.7 }}>
                {v.toFixed(2)}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="wo-note">
        w={weight.toFixed(2)}、e={erase.toFixed(2)}：
        {weight < 0.1
          ? '几乎不写（保持原值）'
          : weight > 0.9 && erase > 0.9
            ? '完全覆盖（先清零再写入）'
            : weight > 0.9 && erase < 0.1
              ? '纯累加（在原值上加）'
              : '部分写入（按比例混合）'}
      </div>

      <div className="diagram-caption">
        <b>关键：不是"直接赋值"，而是"按权重部分写入"</b>。
        这样 w 是连续的，梯度可以流回控制器——这是可微的核心。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   55. 指针问题
   ══════════════════════════════════════════════ */

export function PointerProblemDemo() {
  const [task, setTask] = useState<'convex' | 'tsp' | 'sort'>('convex');

  // 固定的点集
  const points = [
    { x: 20, y: 70 }, { x: 60, y: 25 }, { x: 110, y: 55 },
    { x: 150, y: 20 }, { x: 190, y: 75 }, { x: 80, y: 95 },
    { x: 130, y: 90 }, { x: 45, y: 50 },
  ];

  const hullIdx = [1, 3, 4, 6, 5, 0];
  const tspOrder = [0, 7, 1, 3, 4, 6, 5];

  const sortValues = [0.7, 0.2, 0.9, 0.4, 0.6, 0.1, 0.8, 0.3];
  const sortOrder = sortValues
    .map((v, i) => ({ v, i }))
    .sort((a, b) => a.v - b.v)
    .map((d) => d.i);

  const tasks = [
    { key: 'convex' as const, name: '凸包', desc: '输出凸包顶点的索引' },
    { key: 'tsp' as const, name: 'TSP', desc: '输出访问城市的顺序' },
    { key: 'sort' as const, name: '排序', desc: '输出排序后的索引' },
  ];

  const order = task === 'convex' ? hullIdx : task === 'tsp' ? tspOrder : sortOrder;

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">三类"输出是输入位置"的问题</figcaption>

      <div className="pattern-tabs">
        {tasks.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`pattern-tab ${task === t.key ? 'active' : ''}`}
            style={{ '--tab-color': '#f59e0b' } as React.CSSProperties}
            onClick={() => setTask(t.key)}
          >
            {t.name}
          </button>
        ))}
      </div>

      {task === 'sort' ? (
        <div className="pp-sort">
          {sortValues.map((v, i) => (
            <div key={i} className="pp-sort-item">
              <div className="pp-sort-bar" style={{ height: `${v * 100}%` }} />
              <span className="pp-sort-idx">{i}</span>
            </div>
          ))}
        </div>
      ) : (
        <svg viewBox="0 0 210 115" className="pp-svg" role="img" aria-label={task}>
          {/* 连线 */}
          {order.map((idx, k) => {
            const next = order[(k + 1) % order.length];
            if (task === 'convex' && k === order.length - 1) return null;
            if (task === 'tsp' && k === order.length - 1) return null;
            const a = points[idx];
            const b = points[next];
            return (
              <line
                key={k}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke="#f59e0b" strokeWidth="1.8" opacity="0.7"
              />
            );
          })}
          {/* 点 */}
          {points.map((p, i) => {
            const inOrder = order.includes(i);
            const orderPos = order.indexOf(i);
            return (
              <g key={i}>
                <circle
                  cx={p.x} cy={p.y} r={inOrder ? 6 : 4}
                  fill={inOrder ? '#f59e0b' : '#94a3b8'}
                  stroke="#fff" strokeWidth="1.5"
                />
                <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize="6" fill="#64748b">
                  {i}
                </text>
                {inOrder && orderPos >= 0 && (
                  <text x={p.x + 8} y={p.y + 3} fontSize="6" fill="#f59e0b" fontWeight="700">
                    {orderPos + 1}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}

      <div className="pp-output">
        <span className="pp-out-label">输出（索引序列）</span>
        <div className="pp-out-seq">
          {order.map((idx, k) => (
            <span key={k} className="pp-out-item">{idx}</span>
          ))}
        </div>
      </div>

      <div className="pp-note">
        {task === 'convex' && '凸包：输出凸包顶点的索引（子集，长度不固定）'}
        {task === 'tsp' && 'TSP：输出访问顺序（排列，长度 = n）'}
        {task === 'sort' && '排序：输出从小到大的索引（排列，长度 = n）'}
      </div>

      <div className="diagram-caption">
        共同点：<b>输出是输入的位置</b>，空间大小随 n 变化（子集 2^n、排列 n!）。
        传统 seq2seq 的固定词表无法表达。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   56. 指针机制
   ══════════════════════════════════════════════ */

export function PointerMechanismDemo() {
  const [mode, setMode] = useState<'standard' | 'pointer'>('pointer');

  const inputs = ['The', 'cat', 'sat', 'on', 'mat'];
  const weights = [0.05, 0.62, 0.18, 0.05, 0.10];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">标准注意力 vs 指针：用权重还是用加权和</figcaption>

      <div className="pattern-tabs">
        <button
          type="button"
          className={`pattern-tab ${mode === 'standard' ? 'active' : ''}`}
          style={{ '--tab-color': '#2f6bff' } as React.CSSProperties}
          onClick={() => setMode('standard')}
        >
          标准注意力（加权求和）
        </button>
        <button
          type="button"
          className={`pattern-tab ${mode === 'pointer' ? 'active' : ''}`}
          style={{ '--tab-color': '#f59e0b' } as React.CSSProperties}
          onClick={() => setMode('pointer')}
        >
          指针（直接用权重）
        </button>
      </div>

      <div className="pm-inputs">
        {inputs.map((w, i) => (
          <div key={i} className="pm-input">
            <span className="pm-word">{w}</span>
            <div className="pm-bar-track">
              <div
                className="pm-bar-fill"
                style={{ height: `${weights[i] * 100}%`, background: mode === 'pointer' ? '#f59e0b' : '#2f6bff' }}
              />
            </div>
            <span className="pm-w">{(weights[i] * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>

      <div className="pm-result" style={{ borderColor: mode === 'pointer' ? '#f59e0b' : '#2f6bff' }}>
        {mode === 'standard' ? (
          <>
            <div className="pm-r-label">输出（上下文向量，维度 H）</div>
            <div className="pm-r-value">
              c = 0.05·h₁ + 0.62·h₂ + 0.18·h₃ + 0.05·h₄ + 0.10·h₅
            </div>
            <div className="pm-r-note">维度固定为 H，无法知道"选了哪个"</div>
          </>
        ) : (
          <>
            <div className="pm-r-label">输出（位置分布，维度 n=5）</div>
            <div className="pm-r-value">
              y = argmax([0.05, <b style={{ color: '#f59e0b' }}>0.62</b>, 0.18, 0.05, 0.10]) = <b style={{ color: '#f59e0b' }}>1</b>
            </div>
            <div className="pm-r-note">维度 = 输入长度，直接指向"第 2 个词"</div>
          </>
        )}
      </div>

      <div className="diagram-caption">
        <b>同样的注意力权重，不同的用法</b>：
        标准注意力用来"取信息"，指针用来"选位置"。
        输出维度从 H 变成 n，这就是指针网络的全部改动。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   57. 关系推理任务
   ══════════════════════════════════════════════ */

const CLEVR_OBJECTS = [
  { id: 0, color: '#ef4444', shape: 'circle', size: 1, label: '红球' },
  { id: 1, color: '#2f6bff', shape: 'square', size: 2, label: '蓝方' },
  { id: 2, color: '#ef4444', shape: 'square', size: 2, label: '红方' },
  { id: 3, color: '#2f6bff', shape: 'circle', size: 1, label: '蓝球' },
];

export function RelationalTaskDemo() {
  const [q, setQ] = useState(0);

  const questions = [
    { text: '有多少个红色物体？', answer: '2', explain: '红球 + 红方' },
    { text: '红色物体和蓝色物体一样多吗？', answer: '是', explain: '各 2 个' },
    { text: '球的数量比方块多吗？', answer: '否', explain: '球 2 个，方块 2 个' },
    { text: '红色球和蓝色方块是同一个形状吗？', answer: '否', explain: '球 vs 方块' },
  ];

  const cur = questions[q];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">关系推理任务：需要两两比较</figcaption>

      <div className="rt-scene">
        {CLEVR_OBJECTS.map((o) => (
          <div key={o.id} className="rt-obj" style={{ opacity: 0.95 }}>
            {o.shape === 'circle' ? (
              <div
                className="rt-shape circle"
                style={{ background: o.color, width: 26 + o.size * 10, height: 26 + o.size * 10 }}
              />
            ) : (
              <div
                className="rt-shape square"
                style={{ background: o.color, width: 26 + o.size * 10, height: 26 + o.size * 10 }}
              />
            )}
            <span className="rt-label">{o.label}</span>
          </div>
        ))}
      </div>

      <div className="rt-questions">
        {questions.map((item, i) => (
          <button
            key={i}
            type="button"
            className={`rt-q ${i === q ? 'active' : ''}`}
            onClick={() => setQ(i)}
          >
            {item.text}
          </button>
        ))}
      </div>

      <div className="rt-answer">
        <div className="rt-a-row">
          <span className="rt-a-k">答案</span>
          <span className="rt-a-v">{cur.answer}</span>
        </div>
        <div className="rt-a-explain">{cur.explain}</div>
      </div>

      <div className="rt-note">
        <b>关键能力：两两比较</b>——不是只看单个物体，而是比较任意两个物体的属性。
        标准 CNN 缺少这个机制。
      </div>

      <div className="diagram-caption">
        Relation Network 在 CLEVR 上准确率 <b>95.5%</b>，
        而 CNN+LSTM 只有 <b>68.5%</b>（人类 92.6%）。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   58. Relation Network 结构
   ══════════════════════════════════════════════ */

export function RelationNetworkDemo() {
  const [stage, setStage] = useState(0);

  const stages = [
    { name: '① 物体表示', desc: 'o_1, ..., o_n 每个是 d 维向量' },
    { name: '② 两两配对', desc: '所有 (i,j) 组合，共 n² 对，每对拼接成 2d 维' },
    { name: '③ g_θ 算关系', desc: '每对通过 MLP，得到 rel_dim 维关系向量' },
    { name: '④ 求和聚合', desc: '所有关系向量相加，得到单个 rel_dim 向量' },
    { name: '⑤ f_φ 输出', desc: '聚合向量通过 MLP，得到答案' },
  ];

  const n = 4;
  const objColors = ['#ef4444', '#2f6bff', '#22c55e', '#f59e0b'];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">Relation Network：两阶段结构</figcaption>

      <div className="rn-flow">
        {/* 物体 */}
        <div className={`rn-stage ${stage >= 0 ? 'active' : ''}`}>
          <div className="rn-stage-label">物体表示</div>
          <div className="rn-objects">
            {Array.from({ length: n }).map((_, i) => (
              <div key={i} className="rn-obj" style={{ background: objColors[i] }}>
                o{i + 1}
              </div>
            ))}
          </div>
        </div>

        <div className="rn-arrow">↓</div>

        {/* 配对 */}
        <div className={`rn-stage ${stage >= 1 ? 'active' : ''}`}>
          <div className="rn-stage-label">两两配对（n² = {n * n} 对）</div>
          <div className="rn-pairs">
            {Array.from({ length: n * n }).map((_, i) => {
              const a = Math.floor(i / n);
              const b = i % n;
              return (
                <div key={i} className="rn-pair">
                  <span style={{ background: objColors[a] }}>o{a + 1}</span>
                  <span style={{ background: objColors[b] }}>o{b + 1}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rn-arrow">↓</div>

        {/* g_theta */}
        <div className={`rn-stage ${stage >= 2 ? 'active' : ''}`}>
          <div className="rn-stage-label">g_θ（共享 MLP）</div>
          <div className="rn-mlp">MLP → rel_dim</div>
        </div>

        <div className="rn-arrow">↓</div>

        {/* 求和 */}
        <div className={`rn-stage ${stage >= 3 ? 'active' : ''}`}>
          <div className="rn-stage-label">求和聚合</div>
          <div className="rn-sum">Σ</div>
        </div>

        <div className="rn-arrow">↓</div>

        {/* f_phi */}
        <div className={`rn-stage ${stage >= 4 ? 'active' : ''}`}>
          <div className="rn-stage-label">f_φ（MLP）</div>
          <div className="rn-mlp out">→ 答案</div>
        </div>
      </div>

      <div className="rn-steps">
        {stages.map((s, i) => (
          <button
            key={i}
            type="button"
            className={`rn-step ${i === stage ? 'active' : ''}`}
            onClick={() => setStage(i)}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="rn-note">
        <b>{stages[stage].name}</b>：{stages[stage].desc}
      </div>

      <div className="diagram-caption">
        <b>RN(O) = f_φ(Σ_ij g_θ(o_i, o_j))</b>。
        两个 MLP + 一个求和，就能做关系推理——极简但有效。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   59. 求和聚合
   ══════════════════════════════════════════════ */

export function SumAggregationDemo() {
  const [mode, setMode] = useState<'sum' | 'mean'>('sum');
  const [nRed, setNRed] = useState(2);

  const nBlue = 4 - nRed;

  // 模拟：红物体贡献的"红色分量"
  const redContribution = 1.0;
  const sumValue = nRed * redContribution;
  const meanValue = sumValue / (nRed + nBlue);

  const displayValue = mode === 'sum' ? sumValue : meanValue;

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">求和保留数量信息，平均抹平</figcaption>

      <div className="pos-controls">
        <label>
          红物体数量
          <input type="range" min="0" max="4" step="1" value={nRed}
            onChange={(e) => setNRed(parseInt(e.target.value, 10))} />
          <b>{nRed}</b>
        </label>
      </div>

      <div className="pattern-tabs">
        <button
          type="button"
          className={`pattern-tab ${mode === 'sum' ? 'active' : ''}`}
          style={{ '--tab-color': '#22c55e' } as React.CSSProperties}
          onClick={() => setMode('sum')}
        >
          sum（论文用的）
        </button>
        <button
          type="button"
          className={`pattern-tab ${mode === 'mean' ? 'active' : ''}`}
          style={{ '--tab-color': '#ef4444' } as React.CSSProperties}
          onClick={() => setMode('mean')}
        >
          mean
        </button>
      </div>

      <div className="sa-scene">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="sa-obj"
            style={{
              background: i < nRed ? '#ef4444' : '#2f6bff',
              opacity: 0.9,
            }}
          />
        ))}
      </div>

      <div className="sa-bars">
        {[0, 1, 2, 3, 4].map((k) => {
          const v = mode === 'sum' ? k * redContribution : k * redContribution / 4;
          const isCur = k === nRed;
          return (
            <div key={k} className="sa-col">
              <div className="sa-track">
                <div
                  className="sa-fill"
                  style={{
                    height: `${Math.min((v / 4) * 100, 100)}%`,
                    background: isCur ? (mode === 'sum' ? '#22c55e' : '#ef4444') : '#94a3b8',
                    opacity: isCur ? 1 : 0.4,
                  }}
                />
              </div>
              <span className="sa-k">{k}</span>
            </div>
          );
        })}
      </div>

      <div className="sa-result" style={{ borderColor: mode === 'sum' ? '#22c55e' : '#ef4444' }}>
        当前 {nRed} 个红物体：
        <b style={{ color: mode === 'sum' ? '#22c55e' : '#ef4444' }}>
          {mode === 'sum' ? 'sum' : 'mean'} = {displayValue.toFixed(2)}
        </b>
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          {mode === 'sum'
            ? '红物体越多，值越大 → f_φ 能"数"出来'
            : '值被归一化 → 无法区分 1 个和 4 个'}
        </span>
      </div>

      <div className="diagram-caption">
        <b>sum 是唯一同时满足"保留数量"和"维度固定"的聚合方式</b>。
        CLEVR 有大量计数问题，所以论文必须用 sum。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   60. LSTM 记忆局限
   ══════════════════════════════════════════════ */

export function LSTMMemoryLimitDemo() {
  const [mode, setMode] = useState<'lstm' | 'rmc'>('rmc');

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">LSTM 的扁平记忆 vs RMC 的结构化记忆</figcaption>

      <div className="pattern-tabs">
        <button
          type="button"
          className={`pattern-tab ${mode === 'lstm' ? 'active' : ''}`}
          style={{ '--tab-color': '#ef4444' } as React.CSSProperties}
          onClick={() => setMode('lstm')}
        >
          LSTM（扁平向量）
        </button>
        <button
          type="button"
          className={`pattern-tab ${mode === 'rmc' ? 'active' : ''}`}
          style={{ '--tab-color': '#22c55e' } as React.CSSProperties}
          onClick={() => setMode('rmc')}
        >
          RMC（矩阵 + 交互）
        </button>
      </div>

      {mode === 'lstm' ? (
        <div className="lml-flat">
          <div className="lml-vector">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="lml-cell" style={{ opacity: 0.4 + (i % 3) * 0.25 }}>
                c{i}
              </div>
            ))}
          </div>
          <div className="lml-note bad">
            <b>问题</b>：所有维度排成一排，<b>没有结构</b>。
            <br />
            物1 的位置和物2 的位置混在一起，无法显式建模"它们的关系"。
          </div>
        </div>
      ) : (
        <div className="lml-matrix">
          <div className="lml-slots">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="lml-slot">
                <div className="lml-slot-label">槽位 {i}</div>
                <div className="lml-slot-cells">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="lml-sc" style={{ opacity: 0.4 + ((i + j) % 3) * 0.25 }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="lml-links">
            {[[0, 1], [0, 2], [1, 2], [1, 3], [2, 3], [0, 3]].map(([a, b], i) => (
              <span key={i} className="lml-link">槽{a} ⇄ 槽{b}</span>
            ))}
          </div>
          <div className="lml-note good">
            <b>优势</b>：每个槽位可以"专门"记一个实体，
            <b>槽位之间用注意力交流</b>——能显式建模关系。
          </div>
        </div>
      )}

      <div className="diagram-caption">
        <b>记忆不应该是一个扁平向量，应该有结构、能交互</b>。
        这是 RMC 的核心洞察，也是图神经网络、记忆增强网络的共同思想。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   61. RMC 架构
   ══════════════════════════════════════════════ */

export function RMCArchDemo() {
  const [step, setStep] = useState(0);

  const steps = [
    { name: '① 输入注入', desc: 'x_t 投影后拼接到每个记忆槽位' },
    { name: '② 多头自注意力', desc: '槽位之间互相 attend（核心）' },
    { name: '③ 门控混合', desc: 'gate 控制"用注意力结果"还是"用新输入"' },
    { name: '④ 残差 + LayerNorm', desc: '保留旧记忆 + 归一化' },
    { name: '⑤ 前馈 + 残差 + LN', desc: '同 Transformer 层' },
  ];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">RMC 一步更新：本质是一个 Transformer 层</figcaption>

      <div className="rmc-flow">
        <div className={`rmc-box ${step >= 0 ? 'active' : ''}`}>
          <div className="rmc-title">输入 x_t</div>
        </div>
        <div className="rmc-arrow">↓</div>
        <div className={`rmc-box ${step >= 0 ? 'active' : ''}`}>
          <div className="rmc-title">投影 + 拼接</div>
          <div className="rmc-sub">M_in[i] = [M[i] ; W·x_t]</div>
        </div>
        <div className="rmc-arrow">↓</div>
        <div className={`rmc-box attn ${step >= 1 ? 'active' : ''}`}>
          <div className="rmc-title">多头自注意力</div>
          <div className="rmc-sub">每个槽位 attend 所有槽位</div>
        </div>
        <div className="rmc-arrow">↓</div>
        <div className={`rmc-box gate ${step >= 2 ? 'active' : ''}`}>
          <div className="rmc-title">门控混合</div>
          <div className="rmc-sub">mixed = g⊙attn + (1−g)⊙x</div>
        </div>
        <div className="rmc-arrow">↓</div>
        <div className={`rmc-box ${step >= 3 ? 'active' : ''}`}>
          <div className="rmc-title">残差 + LayerNorm</div>
        </div>
        <div className="rmc-arrow">↓</div>
        <div className={`rmc-box ${step >= 4 ? 'active' : ''}`}>
          <div className="rmc-title">前馈 + 残差 + LN</div>
        </div>
        <div className="rmc-arrow">↓</div>
        <div className={`rmc-box out ${step >= 4 ? 'active' : ''}`}>
          <div className="rmc-title">新记忆 M_t</div>
        </div>
      </div>

      <div className="rmc-steps">
        {steps.map((s, i) => (
          <button
            key={i}
            type="button"
            className={`rmc-step ${i === step ? 'active' : ''}`}
            onClick={() => setStep(i)}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="rmc-note">
        <b>{steps[step].name}</b>：{steps[step].desc}
      </div>

      <div className="diagram-caption">
        <b>RMC ≈ RNN + Transformer 层</b>：每个时间步用注意力更新记忆矩阵。
        复杂度 O(T·N²)，N 是固定槽位数——这是长序列的优势。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   62. 多头记忆
   ══════════════════════════════════════════════ */

const MEMORY_HEADS = [
  { name: '头 1', focus: '相邻槽位', pattern: 'local' },
  { name: '头 2', focus: '相似内容', pattern: 'content' },
  { name: '头 3', focus: '全局平均', pattern: 'global' },
  { name: '头 4', focus: '自我关注', pattern: 'self' },
];

export function MultiHeadMemoryDemo() {
  const [sel, setSel] = useState(0);
  const N = 6;
  const cur = MEMORY_HEADS[sel];

  const getWeights = (pattern: string, i: number) => {
    const row = Array(N).fill(0);
    if (pattern === 'local') {
      row[i] = 0.6;
      if (i > 0) row[i - 1] = 0.3;
      if (i < N - 1) row[i + 1] = 0.1;
    } else if (pattern === 'content') {
      // 槽位 0,2,4 相似；1,3,5 相似
      const group = i % 2;
      for (let j = 0; j < N; j++) {
        if (j % 2 === group) row[j] = 1 / 3;
      }
    } else if (pattern === 'global') {
      for (let j = 0; j < N; j++) row[j] = 1 / N;
    } else {
      row[i] = 1;
    }
    const s = row.reduce((a, b) => a + b, 0);
    return row.map((v) => v / s);
  };

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">多头让不同的"关系类型"并行建模</figcaption>

      <div className="mhm-heads">
        {MEMORY_HEADS.map((h, i) => (
          <button
            key={i}
            type="button"
            className={`mhm-head ${i === sel ? 'active' : ''}`}
            onClick={() => setSel(i)}
          >
            <span className="mhm-name">{h.name}</span>
            <span className="mhm-focus">{h.focus}</span>
          </button>
        ))}
      </div>

      <div className="mhm-matrix">
        <div className="mhm-corner" />
        {Array.from({ length: N }).map((_, j) => (
          <div key={j} className="mhm-head-label">{j}</div>
        ))}
        {Array.from({ length: N }).map((_, i) => (
          <Fragment key={i}>
            <div className="mhm-row-label">{i}</div>
            {getWeights(cur.pattern, i).map((v, j) => (
              <div
                key={j}
                className="mhm-cell"
                style={{
                  background: `rgba(34,197,94,${v * 2.5})`,
                  color: v > 0.3 ? '#fff' : 'var(--text-3)',
                }}
              >
                {(v * 100).toFixed(0)}
              </div>
            ))}
          </Fragment>
        ))}
      </div>

      <div className="mhm-note">
        <b>{cur.name}</b> 学到的模式：<b style={{ color: '#22c55e' }}>{cur.focus}</b>
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          {cur.pattern === 'local' && '关注相邻槽位——建模局部关系'}
          {cur.pattern === 'content' && '关注内容相似的槽位——建模同类实体'}
          {cur.pattern === 'global' && '均匀分配——提供全局上下文'}
          {cur.pattern === 'self' && '只关注自己——保留自身信息'}
        </span>
      </div>

      <div className="diagram-caption">
        <b>单个头只能学一种关系</b>。多头并行，就能同时建模局部、内容、全局等多种关系。
        论文消融：1 头较差，<b>4 头最好</b>，8 头反而下降。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   63. 分子图
   ══════════════════════════════════════════════ */

const MOLECULES = [
  { name: '水 H₂O', atoms: [{ x: 60, y: 40, e: 'O', c: '#ef4444' }, { x: 30, y: 70, e: 'H', c: '#94a3b8' }, { x: 90, y: 70, e: 'H', c: '#94a3b8' }], bonds: [[0, 1], [0, 2]] },
  { name: '甲醇 CH₃OH', atoms: [{ x: 50, y: 50, e: 'C', c: '#64748b' }, { x: 90, y: 50, e: 'O', c: '#ef4444' }, { x: 30, y: 25, e: 'H', c: '#94a3b8' }, { x: 30, y: 75, e: 'H', c: '#94a3b8' }, { x: 50, y: 20, e: 'H', c: '#94a3b8' }], bonds: [[0, 1], [0, 2], [0, 3], [0, 4]] },
  { name: '苯环 C₆H₆', atoms: Array.from({ length: 6 }, (_, i) => {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    return { x: 60 + Math.cos(angle) * 35, y: 50 + Math.sin(angle) * 35, e: 'C', c: '#64748b' };
  }), bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]] },
];

export function MoleculeGraphDemo() {
  const [sel, setSel] = useState(1);
  const mol = MOLECULES[sel];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">分子就是图：原子 = 节点，化学键 = 边</figcaption>

      <div className="pattern-tabs">
        {MOLECULES.map((m, i) => (
          <button
            key={i}
            type="button"
            className={`pattern-tab ${i === sel ? 'active' : ''}`}
            style={{ '--tab-color': '#2f6bff' } as React.CSSProperties}
            onClick={() => setSel(i)}
          >
            {m.name}
          </button>
        ))}
      </div>

      <svg viewBox="0 0 120 100" className="mol-svg" role="img" aria-label={mol.name}>
        {mol.bonds.map(([a, b], i) => (
          <line
            key={i}
            x1={mol.atoms[a].x} y1={mol.atoms[a].y}
            x2={mol.atoms[b].x} y2={mol.atoms[b].y}
            stroke="#94a3b8" strokeWidth="2"
          />
        ))}
        {mol.atoms.map((a, i) => (
          <g key={i}>
            <circle cx={a.x} cy={a.y} r="9" fill={a.c} stroke="#fff" strokeWidth="1.5" />
            <text x={a.x} y={a.y + 3} textAnchor="middle" fontSize="8" fill="#fff" fontWeight="700">
              {a.e}
            </text>
          </g>
        ))}
      </svg>

      <div className="mol-stats">
        <span>节点（原子）：<b>{mol.atoms.length}</b></span>
        <span>边（键）：<b>{mol.bonds.length}</b></span>
        <span>度数：<b>{mol.atoms.map((_, i) => mol.bonds.filter((b) => b.includes(i)).length).join(', ')}</b></span>
      </div>

      <div className="mol-note">
        图数据的特点：<b>节点无自然顺序</b>、<b>邻居数可变</b>、<b>节点数可变</b>。
        所以 CNN（需固定邻域）和 RNN（需序列顺序）都不适用。
      </div>

      <div className="diagram-caption">
        MPNN 在 QM9 数据集（13 万分子）上预测量子化学性质，
        <b>接近化学精度</b>而速度比 DFT 快 10⁶ 倍。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   64. 消息传递
   ══════════════════════════════════════════════ */

export function MessagePassingDemo() {
  const [step, setStep] = useState(0);

  // 5 个节点的链状图：0-1-2-3-4
  const nodes = [
    { x: 20, y: 50 }, { x: 50, y: 50 }, { x: 80, y: 50 },
    { x: 110, y: 50 }, { x: 140, y: 50 },
  ];
  const edges = [[0, 1], [1, 2], [2, 3], [3, 4]];

  // 中心节点 2 的邻居
  const center = 2;
  const neighbors = [1, 3];

  const steps = [
    { name: '① 消息计算', desc: '对每条边算 m_vw = M(h_v, h_w, e_vw)' },
    { name: '② 聚合', desc: 'm_v = Σ m_wv（置换不变的求和）' },
    { name: '③ 更新', desc: "h_v' = U(h_v, m_v)" },
    { name: '重复 T 轮', desc: '信息传播 T 跳' },
  ];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">消息传递三阶段（以节点 2 为例）</figcaption>

      <svg viewBox="0 0 160 100" className="mp-svg" role="img" aria-label="消息传递">
        {edges.map(([a, b], i) => {
          const active = step >= 1 && (a === center || b === center);
          return (
            <line
              key={i}
              x1={nodes[a].x} y1={nodes[a].y}
              x2={nodes[b].x} y2={nodes[b].y}
              stroke={active ? '#2f6bff' : '#cbd5e1'}
              strokeWidth={active ? 3 : 2}
              strokeDasharray={step === 0 && (a === center || b === center) ? '4 3' : '0'}
            />
          );
        })}
        {nodes.map((n, i) => {
          const isCenter = i === center;
          const isNeighbor = neighbors.includes(i);
          const active = isCenter || (step >= 1 && isNeighbor);
          return (
            <g key={i}>
              <circle
                cx={n.x} cy={n.y} r={isCenter ? 13 : 10}
                fill={isCenter ? '#2f6bff' : active ? '#7c5cff' : '#94a3b8'}
                stroke="#fff" strokeWidth="2"
                opacity={active ? 1 : 0.5}
              />
              <text x={n.x} y={n.y + 3} textAnchor="middle" fontSize="9" fill="#fff" fontWeight="700">
                {i}
              </text>
            </g>
          );
        })}
        {/* 消息箭头 */}
        {step === 0 && neighbors.map((nb, i) => (
          <text
            key={i}
            x={(nodes[nb].x + nodes[center].x) / 2}
            y={nodes[center].y - 12}
            textAnchor="middle"
            fontSize="7"
            fill="#2f6bff"
            fontWeight="700"
          >
            m{i + 1}
          </text>
        ))}
      </svg>

      <div className="mp-steps">
        {steps.map((s, i) => (
          <button
            key={i}
            type="button"
            className={`mp-step ${i === step ? 'active' : ''}`}
            onClick={() => setStep(i)}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="mp-note">
        <b>{steps[step].name}</b>：{steps[step].desc}
        {step === 1 && (
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-3)' }}>
            节点 2 的邻居是 1 和 3 → m₂ = m₁₂ + m₃₂
            <br />
            <b>求和保证置换不变</b>：m₁₂ + m₃₂ = m₃₂ + m₁₂
          </div>
        )}
        {step === 3 && (
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-3)' }}>
            1 轮 = 1 跳，T 轮 = T 跳。
            但层数多了会"过平滑"（节点表示趋同），实际用 2~4 层。
          </div>
        )}
      </div>

      <div className="diagram-caption">
        <b>m_vw = M(h_v, h_w, e_vw) → m_v = Σ m_wv → h_v' = U(h_v, m_v)</b>。
        这三步就是所有 GNN 的核心。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   65. 置换不变性
   ══════════════════════════════════════════════ */

export function PermutationInvarianceDemo() {
  const [mode, setMode] = useState<'concat' | 'sum'>('sum');
  const [perm, setPerm] = useState(false);

  const messages = [
    { id: 0, v: [1, 2], color: '#ef4444' },
    { id: 1, v: [3, 4], color: '#22c55e' },
    { id: 2, v: [5, 6], color: '#2f6bff' },
  ];

  const order = perm ? [2, 0, 1] : [0, 1, 2];
  const ordered = order.map((i) => messages[i]);

  const result = mode === 'sum'
    ? ordered.reduce((acc, m) => acc.map((v, i) => v + m.v[i]), [0, 0])
    : ordered.flatMap((m) => m.v);

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">为什么聚合必须置换不变：concat vs sum</figcaption>

      <div className="pattern-tabs">
        <button
          type="button"
          className={`pattern-tab ${mode === 'concat' ? 'active' : ''}`}
          style={{ '--tab-color': '#ef4444' } as React.CSSProperties}
          onClick={() => setMode('concat')}
        >
          concat（错误）
        </button>
        <button
          type="button"
          className={`pattern-tab ${mode === 'sum' ? 'active' : ''}`}
          style={{ '--tab-color': '#22c55e' } as React.CSSProperties}
          onClick={() => setMode('sum')}
        >
          sum（正确）
        </button>
      </div>

      <div className="pi-controls">
        <button
          type="button"
          className={`pi-perm-btn ${!perm ? 'active' : ''}`}
          onClick={() => setPerm(false)}
        >
          原始顺序 [0,1,2]
        </button>
        <button
          type="button"
          className={`pi-perm-btn ${perm ? 'active' : ''}`}
          onClick={() => setPerm(true)}
        >
          打乱顺序 [2,0,1]
        </button>
      </div>

      <div className="pi-messages">
        {ordered.map((m, i) => (
          <div key={i} className="pi-msg" style={{ borderColor: m.color }}>
            <span className="pi-msg-id" style={{ background: m.color }}>m{m.id}</span>
            <span className="pi-msg-v">[{m.v.join(', ')}]</span>
          </div>
        ))}
      </div>

      <div className="pi-result" style={{ borderColor: mode === 'sum' ? '#22c55e' : '#ef4444' }}>
        <div className="pi-r-label">{mode === 'sum' ? 'Σ 求和' : 'concat 拼接'}</div>
        <div className="pi-r-value" style={{ color: mode === 'sum' ? '#22c55e' : '#ef4444' }}>
          [{result.join(', ')}]
        </div>
      </div>

      <div className="pi-verdict" style={{ borderColor: mode === 'sum' ? '#22c55e' : '#ef4444' }}>
        {mode === 'sum' ? (
          <>
            <b style={{ color: '#22c55e' }}>✓ 置换不变</b>
            <br />
            [1,2]+[3,4]+[5,6] = [9,12]
            <br />
            [5,6]+[1,2]+[3,4] = [9,12]　<b>相同！</b>
          </>
        ) : (
          <>
            <b style={{ color: '#ef4444' }}>✗ 顺序敏感</b>
            <br />
            concat → [1,2,3,4,5,6]
            <br />
            concat → [5,6,1,2,3,4]　<b>不同！</b>
          </>
        )}
      </div>

      <div className="diagram-caption">
        <b>图没有邻居的自然顺序</b>。用 concat 会让同一个图产生不同结果。
        sum/mean/max/attention 都置换不变——这是 GNN 的核心设计原则。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   66. Readout
   ══════════════════════════════════════════════ */

export function ReadoutDemo() {
  const [mode, setMode] = useState<'sum' | 'set2set'>('set2set');
  const [iter, setIter] = useState(1);

  const nodeFeatures = [
    [1.0, 0.2], [0.3, 0.9], [0.8, 0.5], [0.2, 0.7], [0.9, 0.1],
  ];

  // 模拟注意力权重（随迭代变化）
  const getWeights = (t: number) => {
    const raw = nodeFeatures.map((f, i) => {
      const phase = Math.sin(i * 1.7 + t * 2.1);
      return Math.exp(phase * 1.5);
    });
    const s = raw.reduce((a, b) => a + b, 0);
    return raw.map((v) => v / s);
  };

  const weights = getWeights(iter);

  const sumResult = nodeFeatures[0].map((_, d) =>
    nodeFeatures.reduce((acc, f) => acc + f[d], 0)
  );

  const set2setResult = nodeFeatures[0].map((_, d) =>
    nodeFeatures.reduce((acc, f, i) => acc + weights[i] * f[d], 0)
  );

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">Readout：从节点表示到图表示</figcaption>

      <div className="pattern-tabs">
        <button
          type="button"
          className={`pattern-tab ${mode === 'sum' ? 'active' : ''}`}
          style={{ '--tab-color': '#94a3b8' } as React.CSSProperties}
          onClick={() => setMode('sum')}
        >
          简单 sum
        </button>
        <button
          type="button"
          className={`pattern-tab ${mode === 'set2set' ? 'active' : ''}`}
          style={{ '--tab-color': '#22c55e' } as React.CSSProperties}
          onClick={() => setMode('set2set')}
        >
          Set2Set（注意力）
        </button>
      </div>

      {mode === 'set2set' && (
        <div className="pos-controls">
          <label>
            读取迭代 t
            <input type="range" min="1" max="4" step="1" value={iter}
              onChange={(e) => setIter(parseInt(e.target.value, 10))} />
            <b>{iter}</b>
          </label>
        </div>
      )}

      <div className="ro-nodes">
        {nodeFeatures.map((f, i) => (
          <div key={i} className="ro-node">
            <div className="ro-node-label">节点 {i}</div>
            <div className="ro-node-vec">[{f.join(', ')}]</div>
            {mode === 'set2set' && (
              <div className="ro-weight" style={{ opacity: 0.3 + weights[i] * 2 }}>
                α={(weights[i] * 100).toFixed(0)}%
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="ro-result" style={{ borderColor: mode === 'sum' ? '#94a3b8' : '#22c55e' }}>
        <div className="ro-r-label">{mode === 'sum' ? 'Σ 求和（无权重）' : `第 ${iter} 次注意力读取`}</div>
        <div className="ro-r-value" style={{ color: mode === 'sum' ? 'var(--text-2)' : '#22c55e' }}>
          [{(mode === 'sum' ? sumResult : set2setResult).map((v) => v.toFixed(2)).join(', ')}]
        </div>
      </div>

      <div className="ro-note">
        {mode === 'sum' ? (
          <>
            <b>简单 sum</b>：所有节点等权相加。
            <br />
            <span style={{ color: 'var(--text-3)', fontSize: 11 }}>
              问题：不同图可能得到相同的和，丢失结构信息
            </span>
          </>
        ) : (
          <>
            <b>Set2Set</b>：用注意力反复查询节点集合，每次关注不同方面。
            <br />
            <span style={{ color: 'var(--text-3)', fontSize: 11 }}>
              t=1 看"整体"，t=2 看"还有什么没读到"，多次拼接表达力更强
            </span>
          </>
        )}
      </div>

      <div className="diagram-caption">
        <b>readout 把 N 个节点表示聚合成 1 个图表示</b>。
        Set2Set 用 LSTM + 注意力多次读取，比简单 sum 表达能力强。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   67. Scaling Law 曲线
   ══════════════════════════════════════════════ */

const L_INF = 1.69;
const N_C = 8.8e13;
const ALPHA_N = 0.076;
const D_C = 5.4e13;
const ALPHA_D = 0.095;

function scalingLoss(N: number, D: number) {
  return L_INF + Math.pow(N_C / N, ALPHA_N) + Math.pow(D_C / D, ALPHA_D);
}

export function ScalingLawDemo() {
  const [dim, setDim] = useState<'N' | 'D'>('N');
  const fixedN = 1.75e11;
  const fixedD = 3e11;

  const points = dim === 'N'
    ? [1e7, 3e7, 1e8, 3e8, 1e9, 3e9, 1e10, 3e10, 1e11, 3e11, 1e12].map((N) => ({
        x: N, y: scalingLoss(N, fixedD),
      }))
    : [1e9, 3e9, 1e10, 3e10, 1e11, 3e11, 1e12, 3e12, 1e13].map((D) => ({
        x: D, y: scalingLoss(fixedN, D),
      }));

  const W = 340, H = 140;
  const logXs = points.map((p) => Math.log10(p.x));
  const minX = Math.min(...logXs), maxX = Math.max(...logXs);
  const minY = 1.69, maxY = Math.max(...points.map((p) => p.y));
  const toX = (x: number) => 40 + ((Math.log10(x) - minX) / (maxX - minX)) * (W - 55);
  const toY = (y: number) => 15 + ((maxY - y) / (maxY - minY)) * (H - 30);

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.x).toFixed(1)},${toY(p.y).toFixed(1)}`).join(' ');

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">Scaling Law：损失随规模平滑下降</figcaption>

      <div className="pattern-tabs">
        <button
          type="button"
          className={`pattern-tab ${dim === 'N' ? 'active' : ''}`}
          style={{ '--tab-color': '#2f6bff' } as React.CSSProperties}
          onClick={() => setDim('N')}
        >
          改变参数量
        </button>
        <button
          type="button"
          className={`pattern-tab ${dim === 'D' ? 'active' : ''}`}
          style={{ '--tab-color': '#22c55e' } as React.CSSProperties}
          onClick={() => setDim('D')}
        >
          改变数据量
        </button>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="scaling-svg" role="img" aria-label="scaling law">
        {/* 网格 */}
        {[2.0, 2.5, 3.0, 3.5].map((y) => (
          <g key={y}>
            <line x1="38" y1={toY(y)} x2={W - 12} y2={toY(y)} stroke="#e2e8f0" strokeWidth="0.7" />
            <text x="34" y={toY(y) + 3} textAnchor="end" fontSize="6.5" fill="#94a3b8">{y}</text>
          </g>
        ))}
        {/* L_inf 线 */}
        <line x1="38" y1={toY(L_INF)} x2={W - 12} y2={toY(L_INF)} stroke="#ef4444" strokeWidth="1" strokeDasharray="4 3" />
        <text x={W - 14} y={toY(L_INF) - 3} textAnchor="end" fontSize="6" fill="#ef4444">L∞</text>

        <path d={path} fill="none" stroke={dim === 'N' ? '#2f6bff' : '#22c55e'} strokeWidth="2.2" />
        {points.map((p, i) => (
          <circle key={i} cx={toX(p.x)} cy={toY(p.y)} r="2.5" fill={dim === 'N' ? '#2f6bff' : '#22c55e'} />
        ))}
      </svg>

      <div className="scaling-stats">
        <span>{dim === 'N' ? '数据固定' : '参数固定'}：<b>{(dim === 'N' ? fixedD : fixedN).toExponential(1)}</b></span>
        <span>L∞：<b style={{ color: '#ef4444' }}>{L_INF}</b></span>
        <span>指数：<b>{dim === 'N' ? ALPHA_N : ALPHA_D}</b></span>
      </div>

      <div className="scaling-note">
        <b>10 倍规模只换来约 17% 的超额损失降低</b>。
        但曲线是平滑的——所以可以用小模型外推到大模型。
      </div>

      <div className="diagram-caption">
        <b>L = L∞ + (N_c/N)^α_N + (D_c/D)^α_D</b>。
        双对数坐标下是直线，斜率 = -α。这是大模型规划的数学基础。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   68. 双对数直线
   ══════════════════════════════════════════════ */

export function LogLogDemo() {
  const Ns = [1e7, 1e8, 1e9, 1e10, 1e11, 1e12];
  const D = 1e13;

  const excess = Ns.map((N) => ({
    x: Math.log10(N),
    y: Math.log10(Math.pow(N_C / N, ALPHA_N)),
  }));

  const W = 320, H = 130;
  const minX = Math.min(...excess.map((p) => p.x));
  const maxX = Math.max(...excess.map((p) => p.x));
  const minY = Math.min(...excess.map((p) => p.y));
  const maxY = Math.max(...excess.map((p) => p.y));
  const toX = (x: number) => 40 + ((x - minX) / (maxX - minX)) * (W - 55);
  const toY = (y: number) => 12 + ((maxY - y) / (maxY - minY)) * (H - 25);

  const path = excess.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.x).toFixed(1)},${toY(p.y).toFixed(1)}`).join(' ');

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">双对数坐标下是直线：这就是可外推的原因</figcaption>

      <svg viewBox={`0 0 ${W} ${H}`} className="loglog-svg" role="img" aria-label="log-log">
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const y = 12 + (i / 5) * (H - 25);
          return (
            <g key={i}>
              <line x1="38" y1={y} x2={W - 12} y2={y} stroke="#e2e8f0" strokeWidth="0.7" />
            </g>
          );
        })}

        <path d={path} fill="none" stroke="#2f6bff" strokeWidth="2.2" />
        {excess.map((p, i) => (
          <circle key={i} cx={toX(p.x)} cy={toY(p.y)} r="3" fill="#2f6bff" />
        ))}

        {/* 斜率标注 */}
        <text x={W / 2} y={H - 3} textAnchor="middle" fontSize="7" fill="#64748b">
          log₁₀(N)
        </text>
      </svg>

      <div className="loglog-formula">
        <code>log(L − L∞) = −α·log(N) + const</code>
      </div>

      <div className="loglog-note">
        斜率 = <b>−α = −0.076</b>。只要在小规模上拟合出这条直线，
        就能外推预测大模型的损失。
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          这就是为什么 OpenAI 能在训练前就预测 GPT-3 的性能
        </span>
      </div>

      <div className="diagram-caption">
        <b>前提</b>：必须扣除 L∞（否则不是直线），且假设幂律在整个区间成立。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   69. 计算分配
   ══════════════════════════════════════════════ */

export function ComputeAllocationDemo() {
  const [C, setC] = useState(1e22);

  // Kaplan
  const N_k = 0.5 * Math.pow(C / 1e19, 0.73) * 1e8;
  const D_k = C / (6 * N_k);
  // Chinchilla
  const N_c = Math.sqrt(C / 120);
  const D_c = 20 * N_c;

  const lossK = scalingLoss(N_k, D_k);
  const lossC = scalingLoss(N_c, D_c);

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">计算预算分配：Kaplan vs Chinchilla</figcaption>

      <div className="pos-controls">
        <label>
          计算量 log₁₀(C)
          <input type="range" min="19" max="24" step="0.5" value={Math.log10(C)}
            onChange={(e) => setC(Math.pow(10, parseFloat(e.target.value)))} />
          <b>{Math.log10(C).toFixed(1)}</b>
        </label>
      </div>

      <div className="alloc-compare">
        <div className="alloc-card" style={{ borderColor: '#f59e0b' }}>
          <div className="alloc-title" style={{ color: '#f59e0b' }}>Kaplan (2020)</div>
          <div className="alloc-row">
            <span className="alloc-k">参数 N</span>
            <span className="alloc-v">{N_k.toExponential(2)}</span>
          </div>
          <div className="alloc-row">
            <span className="alloc-k">数据 D</span>
            <span className="alloc-v">{D_k.toExponential(2)}</span>
          </div>
          <div className="alloc-row">
            <span className="alloc-k">D/N</span>
            <span className="alloc-v">{(D_k / N_k).toFixed(1)}</span>
          </div>
          <div className="alloc-loss" style={{ color: '#f59e0b' }}>{lossK.toFixed(4)}</div>
        </div>

        <div className="alloc-card" style={{ borderColor: '#22c55e' }}>
          <div className="alloc-title" style={{ color: '#22c55e' }}>Chinchilla (2022)</div>
          <div className="alloc-row">
            <span className="alloc-k">参数 N</span>
            <span className="alloc-v">{N_c.toExponential(2)}</span>
          </div>
          <div className="alloc-row">
            <span className="alloc-k">数据 D</span>
            <span className="alloc-v">{D_c.toExponential(2)}</span>
          </div>
          <div className="alloc-row">
            <span className="alloc-k">D/N</span>
            <span className="alloc-v">{(D_c / N_c).toFixed(1)}</span>
          </div>
          <div className="alloc-loss" style={{ color: '#22c55e' }}>{lossC.toFixed(4)}</div>
        </div>
      </div>

      <div className="alloc-note" style={{ borderColor: lossC < lossK ? '#22c55e' : '#f59e0b' }}>
        {lossC < lossK ? (
          <>
            <b style={{ color: '#22c55e' }}>Chinchilla 更优</b>
            （损失低 {(lossK - lossC).toFixed(4)}）
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              经验法则：每个参数配 20 个 token
            </span>
          </>
        ) : (
          <>
            <b style={{ color: '#f59e0b' }}>此计算量下 Kaplan 略优</b>
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              但 Chinchilla 的结论基于更严谨的实验
            </span>
          </>
        )}
      </div>

      <div className="diagram-caption">
        <b>Kaplan</b>：N ∝ C^0.73（参数优先）。
        <b>Chinchilla</b>：N ∝ D ∝ C^0.5（等比例），D ≈ 20N。
        后者修正了前者的实验设计缺陷。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   70. Chinchilla
   ══════════════════════════════════════════════ */

const MODEL_CASES = [
  { name: 'GPT-3', N: 175, D: 300, color: '#ef4444' },
  { name: 'Chinchilla', N: 70, D: 1400, color: '#22c55e' },
  { name: 'LLaMA-1', N: 65, D: 1400, color: '#2f6bff' },
  { name: 'LLaMA-2', N: 70, D: 2000, color: '#7c5cff' },
];

export function ChinchillaDemo() {
  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">Chinchilla 修正：每个参数配 20 个 token</figcaption>

      <div className="chz-bars">
        {MODEL_CASES.map((m) => {
          const ratio = m.D / m.N;
          return (
            <div key={m.name} className="chz-row">
              <span className="chz-name">{m.name}</span>
              <div className="chz-track">
                <div
                  className="chz-fill"
                  style={{ width: `${Math.min((ratio / 30) * 100, 100)}%`, background: m.color }}
                />
              </div>
              <span className="chz-ratio" style={{ color: m.color }}>{ratio.toFixed(1)}</span>
            </div>
          );
        })}
      </div>

      <div className="chz-target">
        <span className="chz-target-label">推荐比例</span>
        <span className="chz-target-val">D/N = 20</span>
      </div>

      <div className="chz-detail">
        <div className="chz-item">
          <span className="chz-k">GPT-3</span>
          <span className="chz-v">175B 参数，300B token（D/N=1.7）→ <b style={{ color: '#ef4444' }}>训练不足</b></span>
        </div>
        <div className="chz-item">
          <span className="chz-k">Chinchilla</span>
          <span className="chz-v">70B 参数，1.4T token（D/N=20）→ <b style={{ color: '#22c55e' }}>同等效果</b></span>
        </div>
      </div>

      <div className="chz-note">
        <b>用 1/2.5 的参数达到 GPT-3 的效果</b>——这就是"训练不足"的代价。
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          Kaplan 的错误来自实验设计（固定步数、允许数据重复），不是数学错误
        </span>
      </div>

      <div className="diagram-caption">
        现代大模型（LLaMA 系列）都遵循 Chinchilla 的 20:1 比例。
        这让训练更高效——用更少的参数达到同样的效果。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   71. 流水线气泡
   ══════════════════════════════════════════════ */

export function PipelineBubbleDemo() {
  const [mode, setMode] = useState<'naive' | 'gpipe'>('gpipe');
  const K = 4;
  const M = mode === 'naive' ? 1 : 8;
  const T = M + K - 1;

  const busy = Array.from({ length: K }, (_, k) =>
    Array.from({ length: T }, (_, t) => {
      const m = t - k;
      return m >= 0 && m < M ? m : -1;
    })
  );

  const busyCount = busy.flat().filter((v) => v >= 0).length;
  const util = busyCount / (K * T);

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">流水线调度：朴素模型并行 vs GPipe</figcaption>

      <div className="pattern-tabs">
        <button
          type="button"
          className={`pattern-tab ${mode === 'naive' ? 'active' : ''}`}
          style={{ '--tab-color': '#ef4444' } as React.CSSProperties}
          onClick={() => setMode('naive')}
        >
          朴素（M=1）
        </button>
        <button
          type="button"
          className={`pattern-tab ${mode === 'gpipe' ? 'active' : ''}`}
          style={{ '--tab-color': '#22c55e' } as React.CSSProperties}
          onClick={() => setMode('gpipe')}
        >
          GPipe（M=8）
        </button>
      </div>

      <div className="pb-grid" style={{ gridTemplateColumns: `44px repeat(${T}, 1fr)` }}>
        <div className="pb-corner" />
        {Array.from({ length: T }).map((_, t) => (
          <div key={t} className="pb-time">{t}</div>
        ))}
        {busy.map((row, k) => (
          <Fragment key={k}>
            <div className="pb-label">GPU{k}</div>
            {row.map((m, t) => (
              <div
                key={t}
                className={`pb-cell ${m >= 0 ? 'busy' : 'idle'}`}
                title={m >= 0 ? `micro-batch ${m}` : '空闲'}
              >
                {m >= 0 ? m : ''}
              </div>
            ))}
          </Fragment>
        ))}
      </div>

      <div className="pb-stats">
        <span>总时间：<b>{T}</b></span>
        <span>利用率：<b style={{ color: util > 0.7 ? '#22c55e' : '#ef4444' }}>{(util * 100).toFixed(0)}%</b></span>
        <span>气泡：<b style={{ color: '#ef4444' }}>{((1 - util) * 100).toFixed(0)}%</b></span>
      </div>

      <div className="pb-note" style={{ borderColor: mode === 'gpipe' ? '#22c55e' : '#ef4444' }}>
        {mode === 'naive' ? (
          <>
            <b style={{ color: '#ef4444' }}>朴素模型并行</b>：只有 1 个 micro-batch，
            同一时刻只有 1 个 GPU 在工作。
            <br />
            利用率仅 {(util * 100).toFixed(0)}%（理论值 1/K = 25%）。
          </>
        ) : (
          <>
            <b style={{ color: '#22c55e' }}>GPipe</b>：8 个 micro-batch 重叠执行，
            中间阶段所有 GPU 都在工作。
            <br />
            利用率提升到 {(util * 100).toFixed(0)}%。
          </>
        )}
      </div>

      <div className="diagram-caption">
        <b>气泡比例 = (K−1)/(M+K−1)</b>。K=4、M=8 时气泡 27%；
        M=128 时只有 2.3%。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   72. 流水线调度
   ══════════════════════════════════════════════ */

export function PipelineScheduleDemo() {
  const [K, setK] = useState(4);
  const [M, setM] = useState(8);

  const T = M + K - 1;
  const util = M / T;

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">交互式：调整 K 和 M 看流水线效率</figcaption>

      <div className="la-controls">
        <label>
          流水线级数 K
          <input type="range" min="2" max="8" step="1" value={K}
            onChange={(e) => setK(parseInt(e.target.value, 10))} />
          <b>{K}</b>
        </label>
        <label>
          micro-batch 数 M
          <input type="range" min="1" max="32" step="1" value={M}
            onChange={(e) => setM(parseInt(e.target.value, 10))} />
          <b>{M}</b>
        </label>
      </div>

      <div className="ps-bars">
        <div className="ps-row">
          <span className="ps-label">理想</span>
          <div className="ps-track">
            <div style={{ width: '100%', background: '#94a3b8' }} />
          </div>
          <span className="ps-val">{M}</span>
        </div>
        <div className="ps-row">
          <span className="ps-label">实际</span>
          <div className="ps-track">
            <div style={{ width: '100%', background: '#2f6bff' }} />
          </div>
          <span className="ps-val">{T}</span>
        </div>
      </div>

      <div className="ps-stats">
        <span>气泡：<b style={{ color: '#ef4444' }}>{K - 1}</b> 单位</span>
        <span>效率：<b style={{ color: util > 0.8 ? '#22c55e' : util > 0.6 ? '#f59e0b' : '#ef4444' }}>
          {(util * 100).toFixed(1)}%
        </b></span>
        <span>加速比：<b>{((M * K) / T).toFixed(2)}×</b>（理论 K={K}）</span>
      </div>

      <div className="ps-note">
        {util > 0.9
          ? '✓ 效率很高——M 足够大，气泡可忽略'
          : util > 0.7
            ? '△ 效率尚可——可以再增大 M'
            : '✗ 效率低——M 太小，气泡占比大'}
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          但 M 太大会让每个 micro-batch 太小，BatchNorm 统计不准
        </span>
      </div>

      <div className="diagram-caption">
        <b>M ≈ 4K ~ 8K 是实践中的常见选择</b>。
        K=4、M=32 时效率 91%，已经不错。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   73. 重计算
   ══════════════════════════════════════════════ */

export function RecomputeDemo() {
  const [N, setN] = useState(100);
  const g = Math.max(1, Math.floor(Math.sqrt(N)));

  const normal = N;
  const recompute = Math.ceil(N / g) + g;
  const saving = 1 - recompute / normal;

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">重计算：用计算换显存</figcaption>

      <div className="pos-controls">
        <label>
          层数 N
          <input type="range" min="10" max="500" step="10" value={N}
            onChange={(e) => setN(parseInt(e.target.value, 10))} />
          <b>{N}</b>
        </label>
      </div>

      <div className="rc-diagram">
        <div className="rc-row">
          <span className="rc-label">不重计算</span>
          <div className="rc-blocks">
            {Array.from({ length: Math.min(N, 40) }).map((_, i) => (
              <div key={i} className="rc-block normal" />
            ))}
          </div>
          <span className="rc-count">{normal}A</span>
        </div>
        <div className="rc-row">
          <span className="rc-label">重计算</span>
          <div className="rc-blocks">
            {Array.from({ length: Math.min(Math.ceil(N / g), 20) }).map((_, i) => (
              <div key={i} className="rc-block boundary" />
            ))}
            {Array.from({ length: Math.min(g, 20) }).map((_, i) => (
              <div key={`g${i}`} className="rc-block recompute" />
            ))}
          </div>
          <span className="rc-count">{recompute}A</span>
        </div>
      </div>

      <div className="rc-legend">
        <span><span className="rc-dot boundary" /> 保存的边界</span>
        <span><span className="rc-dot recompute" /> 反向时重算</span>
      </div>

      <div className="rc-stats">
        <span>分组大小 g = <b>√N = {g}</b></span>
        <span>显存：<b>{normal}A → {recompute}A</b></span>
        <span>节省：<b style={{ color: '#22c55e' }}>{(saving * 100).toFixed(1)}%</b></span>
        <span>计算代价：<b style={{ color: '#ef4444' }}>+33%</b></span>
      </div>

      <div className="rc-note">
        <b>原理</b>：前向只保存每组的边界激活，反向时从边界重算组内各层。
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          最优分组 g = √N，显存从 O(N) 降到 O(√N)
        </span>
      </div>

      <div className="diagram-caption">
        <b>代价 +33% 计算</b>（多一次前向：正常 1前向+1反向=3，重计算 2前向+1反向=4）。
        这是训练大模型的必用技巧。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   74. 策略更新
   ══════════════════════════════════════════════ */

export function PolicyUpdateDemo() {
  const [stepSize, setStepSize] = useState(1);

  // 模拟：策略参数 θ，性能是倒 U 型
  const perf = (theta: number) => Math.exp(-Math.pow(theta - 2, 2) / 2);
  const current = 0.5;
  const next = current + stepSize * 0.5;

  const currentPerf = perf(current);
  const nextPerf = perf(next);

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">策略更新步长：太小慢，太大崩</figcaption>

      <div className="pos-controls">
        <label>
          更新步长
          <input type="range" min="0.2" max="4" step="0.2" value={stepSize}
            onChange={(e) => setStepSize(parseFloat(e.target.value))} />
          <b>{stepSize.toFixed(1)}</b>
        </label>
      </div>

      <div className="pu-chart">
        {[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4].map((t) => {
          const p = perf(t);
          const isCur = Math.abs(t - current) < 0.25;
          const isNext = Math.abs(t - next) < 0.25;
          return (
            <div key={t} className="pu-col">
              <div className="pu-track">
                <div
                  className="pu-fill"
                  style={{
                    height: `${p * 100}%`,
                    background: isNext ? (nextPerf < currentPerf ? '#ef4444' : '#22c55e') : isCur ? '#2f6bff' : '#94a3b8',
                    opacity: isCur || isNext ? 1 : 0.4,
                  }}
                />
              </div>
              <span className="pu-t">{t.toFixed(1)}</span>
            </div>
          );
        })}
      </div>

      <div className="pu-stats">
        <span>当前 θ：<b>{current.toFixed(1)}</b>（性能 {currentPerf.toFixed(3)}）</span>
        <span>更新后：<b>{next.toFixed(1)}</b>（性能 {nextPerf.toFixed(3)}）</span>
      </div>

      <div className="pu-note" style={{ borderColor: nextPerf >= currentPerf ? '#22c55e' : '#ef4444' }}>
        {stepSize < 0.8 ? (
          <>
            <b style={{ color: '#f59e0b' }}>步长太小</b>：学习很慢，但很安全。
            需要更多迭代才能到达最优。
          </>
        ) : stepSize < 2.5 ? (
          <>
            <b style={{ color: '#22c55e' }}>步长适中</b>：稳定地提升性能。
            这就是 PPO 想要的效果。
          </>
        ) : (
          <>
            <b style={{ color: '#ef4444' }}>步长太大</b>：性能反而下降！
            这就是"策略崩溃"——PPO 的 clip 要防止的情况。
          </>
        )}
      </div>

      <div className="diagram-caption">
        <b>PPO 的 clip 就是"自动调步长"</b>：更新小时正常学习，
        更新大时梯度消失（不再推），避免崩掉。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   75. PPO Clip
   ══════════════════════════════════════════════ */

export function PPOClipDemo() {
  const [adv, setAdv] = useState(1);
  const eps = 0.2;

  const ratios = [0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6];

  const computeSurr = (r: number) => {
    const surr1 = r * adv;
    const clipped = Math.min(Math.max(r, 1 - eps), 1 + eps);
    const surr2 = clipped * adv;
    return { surr1, surr2, min: Math.min(surr1, surr2), clipped: Math.abs(surr1 - surr2) > 1e-6 };
  };

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">PPO 的 clip：只截断过度更新</figcaption>

      <div className="pos-controls">
        <label>
          优势 A
          <input type="range" min="-2" max="2" step="0.5" value={adv}
            onChange={(e) => setAdv(parseFloat(e.target.value))} />
          <b>{adv.toFixed(1)}</b>
        </label>
      </div>

      <div className="pc2-table">
        <div className="pc2-head">
          <span>ratio</span>
          <span>r·A</span>
          <span>clip(r)·A</span>
          <span>min</span>
          <span>裁剪</span>
        </div>
        {ratios.map((r) => {
          const s = computeSurr(r);
          return (
            <div key={r} className={`pc2-row ${s.clipped ? 'clipped' : ''}`}>
              <span className="pc2-r">{r.toFixed(1)}</span>
              <span>{s.surr1.toFixed(2)}</span>
              <span>{s.surr2.toFixed(2)}</span>
              <span className="pc2-min" style={{ color: s.clipped ? '#ef4444' : '#22c55e' }}>
                {s.min.toFixed(2)}
              </span>
              <span className="pc2-clip">{s.clipped ? '✂ 截断' : '—'}</span>
            </div>
          );
        })}
      </div>

      <div className="pc2-note" style={{ borderColor: adv > 0 ? '#22c55e' : adv < 0 ? '#ef4444' : '#94a3b8' }}>
        {adv > 0 ? (
          <>
            <b style={{ color: '#22c55e' }}>A &gt; 0（好动作）</b>：想提高概率。
            <br />
            但 ratio &gt; 1.2 时被截断——<b>不再继续推高</b>，防止过拟合这批数据。
          </>
        ) : adv < 0 ? (
          <>
            <b style={{ color: '#ef4444' }}>A &lt; 0（坏动作）</b>：想降低概率。
            <br />
            但 ratio &lt; 0.8 时被截断——<b>不再继续压低</b>。
          </>
        ) : (
          <>
            <b>A = 0</b>：这个动作不好不坏，没有梯度。
          </>
        )}
      </div>

      <div className="diagram-caption">
        <b>L^CLIP = E[min(r·A, clip(r,1−ε,1+ε)·A)]</b>，ε=0.2。
        绿色是正常区间，红色是被截断的过度更新。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   76. Clip 效果
   ══════════════════════════════════════════════ */

export function ClipEffectDemo() {
  const eps = 0.2;

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">clip 让目标函数分段：区间内线性，区间外平坦</figcaption>

      <svg viewBox="0 0 340 150" className="clip-svg" role="img" aria-label="clip 曲线">
        {/* 坐标轴 */}
        <line x1="40" y1="125" x2="320" y2="125" stroke="#cbd5e1" strokeWidth="1" />
        <line x1="180" y1="15" x2="180" y2="130" stroke="#cbd5e1" strokeWidth="1" />
        <text x="320" y="140" textAnchor="end" fontSize="7" fill="#94a3b8">ratio</text>

        {/* 正常区间 */}
        <rect
          x={180 - 60} y="15" width="120" height="110"
          fill="rgba(34,197,94,0.08)" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 2"
        />
        <text x="180" y="25" textAnchor="middle" fontSize="6.5" fill="#15803d" fontWeight="700">
          正常区间 [0.8, 1.2]
        </text>

        {/* 曲线：A>0 时 */}
        <path d="M40,110 L120,70 L180,50 L240,50 L320,50" fill="none" stroke="#2f6bff" strokeWidth="2.2" />
        <text x="280" y="42" fontSize="7" fill="#2f6bff" fontWeight="700">A &gt; 0</text>

        {/* 曲线：A<0 时 */}
        <path d="M40,50 L120,50 L180,70 L240,110 L320,110" fill="none" stroke="#ef4444" strokeWidth="2.2" />
        <text x="280" y="102" fontSize="7" fill="#ef4444" fontWeight="700">A &lt; 0</text>

        {/* 标注 */}
        <text x="60" y="118" fontSize="6" fill="#94a3b8">0.4</text>
        <text x="175" y="118" fontSize="6" fill="#94a3b8">1.0</text>
        <text x="285" y="118" fontSize="6" fill="#94a3b8">1.6</text>
      </svg>

      <div className="clip-note">
        <b>蓝线（A&gt;0）</b>：ratio 超过 1.2 后变成水平——不再推高。
        <br />
        <b>红线（A&lt;0）</b>：ratio 低于 0.8 后变成水平——不再压低。
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          绿色区间内是线性（正常学习），外面是平坦（无梯度）
        </span>
      </div>

      <div className="diagram-caption">
        <b>这就是"软约束"</b>：不需要解约束优化，只要让梯度在过度区域消失。
        比 TRPO 的二阶优化简单得多。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   77. GAE
   ══════════════════════════════════════════════ */

export function GAEDemo() {
  const [lam, setLam] = useState(0.95);

  const rewards = [1.0, 0.5, 2.0, 0.3, 1.5];
  const values = [0.8, 0.6, 1.8, 0.4, 1.2, 0.0];
  const gamma = 0.99;

  // 计算 GAE
  const advantages: number[] = new Array(rewards.length).fill(0);
  let gae = 0;
  for (let t = rewards.length - 1; t >= 0; t--) {
    const delta = rewards[t] + gamma * values[t + 1] - values[t];
    gae = delta + gamma * lam * gae;
    advantages[t] = gae;
  }

  // 对比：单步 TD（lam=0）
  const tdAdv = rewards.map((r, t) => r + gamma * values[t + 1] - values[t]);

  // 蒙特卡洛（lam=1）
  const mcAdv = rewards.map((_, t) => {
    let sum = 0;
    for (let k = t; k < rewards.length; k++) {
      sum += Math.pow(gamma, k - t) * rewards[k];
    }
    return sum - values[t];
  });

  const maxAbs = Math.max(...advantages.map(Math.abs), ...tdAdv.map(Math.abs), ...mcAdv.map(Math.abs));

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">GAE：在偏差与方差之间插值</figcaption>

      <div className="pos-controls">
        <label>
          λ（GAE 参数）
          <input type="range" min="0" max="1" step="0.05" value={lam}
            onChange={(e) => setLam(parseFloat(e.target.value))} />
          <b>{lam.toFixed(2)}</b>
        </label>
      </div>

      <div className="gae-bars">
        {advantages.map((a, t) => (
          <div key={t} className="gae-group">
            <div className="gae-label">t={t}</div>
            <div className="gae-bar-row">
              <div className="gae-track">
                <div
                  className="gae-fill"
                  style={{
                    height: `${(Math.abs(a) / maxAbs) * 100}%`,
                    background: a >= 0 ? '#2f6bff' : '#ef4444',
                  }}
                />
              </div>
              <span className="gae-val">{a.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="gae-compare">
        <div className="gae-cmp-item">
          <span className="gae-cmp-k">λ=0（单步 TD）</span>
          <span className="gae-cmp-v">[{tdAdv.map((v) => v.toFixed(2)).join(', ')}]</span>
        </div>
        <div className="gae-cmp-item">
          <span className="gae-cmp-k">λ=1（蒙特卡洛）</span>
          <span className="gae-cmp-v">[{mcAdv.map((v) => v.toFixed(2)).join(', ')}]</span>
        </div>
        <div className="gae-cmp-item highlight">
          <span className="gae-cmp-k">当前 λ={lam.toFixed(2)}</span>
          <span className="gae-cmp-v">[{advantages.map((v) => v.toFixed(2)).join(', ')}]</span>
        </div>
      </div>

      <div className="gae-note">
        {lam < 0.2
          ? '接近单步 TD：偏差大（依赖 V 的准确性），方差小'
          : lam > 0.8
            ? '接近蒙特卡洛：无偏但方差大'
            : '平衡点：偏差和方差都适中'}
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          PPO 默认 λ=0.95
        </span>
      </div>

      <div className="diagram-caption">
        <b>A_t = δ_t + γλ·A_{'{'}t+1{'}'}</b>，其中 δ_t = r_t + γV(s_{'{'}t+1{'}'}) − V(s_t)。
        λ 控制"看多远"。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   78. CTC 折叠
   ══════════════════════════════════════════════ */

const CTC_PATHS = [
  { path: [0, 0, 1, 1, 0, 2, 2, 0], desc: '标准情况' },
  { path: [1, 1, 1, 2, 2, 2], desc: '无 blank' },
  { path: [0, 1, 0, 1, 0], desc: '相同字符被分隔' },
  { path: [1, 1, 2, 2, 1, 1], desc: '重复字符连续' },
];

const CTC_CHARS = ['-', '你', '好'];

export function CTCDemo() {
  const [sel, setSel] = useState(0);
  const cur = CTC_PATHS[sel];

  const collapse = (path: number[]) => {
    const out: number[] = [];
    let prev: number | null = null;
    for (const p of path) {
      if (p !== prev && p !== 0) out.push(p);
      prev = p;
    }
    return out;
  };

  const result = collapse(cur.path);

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">CTC 折叠：合并重复 + 删除 blank</figcaption>

      <div className="ctc-cases">
        {CTC_PATHS.map((c, i) => (
          <button
            key={i}
            type="button"
            className={`ctc-case ${i === sel ? 'active' : ''}`}
            onClick={() => setSel(i)}
          >
            {c.desc}
          </button>
        ))}
      </div>

      <div className="ctc-stage">
        <div className="ctc-label">帧级输出（blank=0）</div>
        <div className="ctc-frames">
          {cur.path.map((p, i) => (
            <div
              key={i}
              className={`ctc-frame ${p === 0 ? 'blank' : 'char'}`}
            >
              {CTC_CHARS[p]}
            </div>
          ))}
        </div>
      </div>

      <div className="ctc-arrow">↓ 合并相邻重复</div>

      <div className="ctc-stage">
        <div className="ctc-frames">
          {(() => {
            const merged: number[] = [];
            let prev: number | null = null;
            for (const p of cur.path) {
              if (p !== prev) merged.push(p);
              prev = p;
            }
            return merged.map((p, i) => (
              <div key={i} className={`ctc-frame ${p === 0 ? 'blank' : 'char'}`}>
                {CTC_CHARS[p]}
              </div>
            ));
          })()}
        </div>
      </div>

      <div className="ctc-arrow">↓ 删除 blank</div>

      <div className="ctc-result">
        {result.length > 0 ? (
          result.map((p, i) => (
            <span key={i} className="ctc-out">{CTC_CHARS[p]}</span>
          ))
        ) : (
          <span className="ctc-empty">（空序列）</span>
        )}
      </div>

      <div className="ctc-note">
        <b>关键</b>：blank 让"重复字符"和"两个相同字符"可区分。
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          [0,1,0,1,0] → 你 你（blank 分隔，保留两个）
          &nbsp;|&nbsp;
          [1,1,1] → 你（连续重复，合并成一个）
        </span>
      </div>

      <div className="diagram-caption">
        <b>CTC 损失 = 所有合法对齐的概率之和</b>。
        用前向算法（动态规划）计算，复杂度 O(T×S)。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   79. CTC 对齐
   ══════════════════════════════════════════════ */

const ALIGNMENTS = [
  { path: [1, 1, 0, 2, 2], valid: true },
  { path: [1, 0, 0, 2, 0], valid: true },
  { path: [0, 1, 2, 2, 0], valid: true },
  { path: [1, 0, 2, 0, 0], valid: true },
  { path: [0, 1, 0, 2, 0], valid: true },
  { path: [1, 2, 1, 2, 0], valid: false },
];

export function CTCAlignmentDemo() {
  const collapse = (path: number[]) => {
    const out: number[] = [];
    let prev: number | null = null;
    for (const p of path) {
      if (p !== prev && p !== 0) out.push(p);
      prev = p;
    }
    return out;
  };

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">一个输出对应多种对齐：CTC 对它们求和</figcaption>

      <div className="cta-target">
        <span className="cta-label">目标输出</span>
        <span className="cta-out">你 好</span>
      </div>

      <div className="cta-list">
        {ALIGNMENTS.map((a, i) => {
          const collapsed = collapse(a.path);
          const ok = collapsed.length === 2 && collapsed[0] === 1 && collapsed[1] === 2;
          return (
            <div key={i} className={`cta-row ${ok ? 'valid' : 'invalid'}`}>
              <span className="cta-idx">#{i + 1}</span>
              <div className="cta-frames">
                {a.path.map((p, j) => (
                  <div key={j} className={`ctc-frame small ${p === 0 ? 'blank' : 'char'}`}>
                    {CTC_CHARS[p]}
                  </div>
                ))}
              </div>
              <span className="cta-arrow">→</span>
              <span className="cta-result">
                {collapsed.length > 0 ? collapsed.map((p) => CTC_CHARS[p]).join(' ') : '（空）'}
              </span>
              <span className="cta-verdict">{ok ? '✓' : '✗'}</span>
            </div>
          );
        })}
      </div>

      <div className="cta-note">
        <b>P(你好|x) = Σ P(对齐|x)</b>
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          前 5 个折叠后都是"你 好"，它们的概率要相加；
          第 6 个折叠成"你 好 你 好"，不算
        </span>
      </div>

      <div className="diagram-caption">
        <b>这就是 CTC 的"免费对齐"</b>：不需要标注哪帧对应哪个字符，
        所有对齐自动被考虑。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   80. CTC 损失
   ══════════════════════════════════════════════ */

export function CTCLossDemo() {
  const [t, setT] = useState(4);

  // 扩展序列：- y1 - y2 -
  const extended = [0, 1, 0, 2, 0];
  const L = extended.length;

  // 模拟 alpha 递推（简化：每步转移概率固定）
  const alpha: number[][] = [];
  for (let i = 0; i < t; i++) {
    const row: number[] = [];
    for (let s = 0; s < L; s++) {
      if (i === 0) {
        row.push(s <= 1 ? 1 : 0);
      } else {
        let val = alpha[i - 1][s];
        if (s >= 1) val += alpha[i - 1][s - 1];
        if (s >= 2 && extended[s] !== 0 && extended[s] !== extended[s - 2]) {
          val += alpha[i - 1][s - 2];
        }
        row.push(val);
      }
    }
    alpha.push(row);
  }

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">CTC 前向算法：在扩展序列上做动态规划</figcaption>

      <div className="pos-controls">
        <label>
          时间步 t
          <input type="range" min="1" max="6" step="1" value={t}
            onChange={(e) => setT(parseInt(e.target.value, 10))} />
          <b>{t}</b>
        </label>
      </div>

      <div className="ctcl-grid">
        <div className="ctcl-corner" />
        {extended.map((e, s) => (
          <div key={s} className={`ctcl-head ${e === 0 ? 'blank' : 'char'}`}>
            {CTC_CHARS[e]}
          </div>
        ))}
        {alpha.map((row, i) => (
          <Fragment key={i}>
            <div className="ctcl-tlabel">t={i}</div>
            {row.map((v, s) => {
              const isLast = i === alpha.length - 1;
              return (
                <div
                  key={s}
                  className={`ctcl-cell ${isLast && v > 0 ? 'active' : ''}`}
                  style={{ opacity: v > 0 ? 0.25 + Math.min(v / 10, 0.75) : 0.08 }}
                >
                  {v > 0 ? v : ''}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>

      <div className="ctcl-formula">
        <code>α[t][s] = (α[t−1][s] + α[t−1][s−1] + α[t−1][s−2]) × p(y_s|x_t)</code>
      </div>

      <div className="ctcl-note">
        <b>三项来源</b>：留在原地（重复字符）、前进一步、跳过 blank。
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          跳过 blank 的条件：当前不是 blank 且与 s−2 的字符不同
        </span>
      </div>

      <div className="diagram-caption">
        <b>复杂度 O(T×S)</b>，而非暴力枚举的 O(C^T)。
        这是 CTC 能实际使用的关键。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   81. DS2 架构
   ══════════════════════════════════════════════ */

export function DeepSpeechArchDemo() {
  const [stage, setStage] = useState(0);

  const stages = [
    { name: '音频波形', desc: '1D 信号，16000 采样/秒', color: '#94a3b8' },
    { name: '频谱图', desc: '80 Mel × T 帧（20ms 窗，10ms 步）', color: '#0891b2' },
    { name: '卷积层', desc: '2-3 层 Conv，提取局部声学特征，下采样 4 倍', color: '#2f6bff' },
    { name: 'BiGRU', desc: '3-7 层双向 GRU，建模时序依赖', color: '#7c5cff' },
    { name: 'FC + Softmax', desc: '输出字符 + blank 的概率', color: '#f59e0b' },
    { name: 'CTC 损失', desc: '对齐未知时的训练目标', color: '#22c55e' },
  ];

  const cur = stages[stage];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">Deep Speech 2 架构：端到端语音识别</figcaption>

      <div className="ds2-flow">
        {stages.map((s, i) => (
          <div
            key={i}
            className={`ds2-stage ${i === stage ? 'active' : ''}`}
            style={{ borderColor: i === stage ? s.color : 'var(--border)' }}
            onClick={() => setStage(i)}
          >
            <span className="ds2-num" style={{ background: i === stage ? s.color : 'var(--border)' }}>
              {i + 1}
            </span>
            <span className="ds2-name">{s.name}</span>
          </div>
        ))}
      </div>

      <div className="ds2-note" style={{ borderColor: cur.color }}>
        <b>{cur.name}</b>：{cur.desc}
      </div>

      <div className="ds2-dims">
        <div className="ds2-dim">
          <span className="ds2-dk">输入</span>
          <span className="ds2-dv">(B, 1, 80, 200)</span>
        </div>
        <div className="ds2-dim">
          <span className="ds2-dk">卷积后</span>
          <span className="ds2-dv">(B, 32, 20, 50)</span>
        </div>
        <div className="ds2-dim">
          <span className="ds2-dk">转序列</span>
          <span className="ds2-dv">(B, 50, 640)</span>
        </div>
        <div className="ds2-dim">
          <span className="ds2-dk">输出</span>
          <span className="ds2-dv">(B, 50, 29)</span>
        </div>
      </div>

      <div className="diagram-caption">
        <b>关键</b>：Conv 下采样减少序列长度（200→50），RNN 建模时序，
        CTC 处理对齐。中英文共用同一架构，只换输出字符集。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   82. 后验坍塌
   ══════════════════════════════════════════════ */

export function PosteriorCollapseDemo() {
  const [collapsed, setCollapsed] = useState(false);

  const latentDims = collapsed
    ? [0.001, 0.002, 0.0005, 0.001, 0.0008, 0.001, 0.0006, 0.001]
    : [2.1, 0.8, 1.5, 0.02, 1.9, 0.01, 1.2, 0.005];

  const active = latentDims.filter((v) => v > 0.01).length;

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">后验坍塌：隐变量被"浪费"</figcaption>

      <div className="pattern-tabs">
        <button
          type="button"
          className={`pattern-tab ${!collapsed ? 'active' : ''}`}
          style={{ '--tab-color': '#22c55e' } as React.CSSProperties}
          onClick={() => setCollapsed(false)}
        >
          正常训练
        </button>
        <button
          type="button"
          className={`pattern-tab ${collapsed ? 'active' : ''}`}
          style={{ '--tab-color': '#ef4444' } as React.CSSProperties}
          onClick={() => setCollapsed(true)}
        >
          后验坍塌
        </button>
      </div>

      <div className="pc3-bars">
        {latentDims.map((v, i) => (
          <div key={i} className="pc3-col">
            <div className="pc3-track">
              <div
                className="pc3-fill"
                style={{
                  height: `${Math.min(v / 2.5, 1) * 100}%`,
                  background: v > 0.01 ? '#22c55e' : '#ef4444',
                }}
              />
            </div>
            <span className="pc3-idx">z{i}</span>
            <span className="pc3-val" style={{ color: v > 0.01 ? '#15803d' : '#b91c1c' }}>
              {v.toFixed(3)}
            </span>
          </div>
        ))}
      </div>

      <div className="pc3-stats">
        <span>活跃维度：<b style={{ color: active > 4 ? '#22c55e' : '#ef4444' }}>{active}/8</b></span>
        <span>总 KL：<b>{latentDims.reduce((a, b) => a + b, 0).toFixed(2)}</b></span>
      </div>

      <div className="pc3-note" style={{ borderColor: collapsed ? '#ef4444' : '#22c55e' }}>
        {collapsed ? (
          <>
            <b style={{ color: '#ef4444' }}>后验坍塌</b>：所有维度 KL ≈ 0，
            q(z|x) ≈ p(z)。<b>z 完全不携带信息</b>，模型退化成自回归。
          </>
        ) : (
          <>
            <b style={{ color: '#22c55e' }}>正常</b>：部分维度活跃（KL 大），
            部分坍塌（KL 小）。这是常见情况——不是所有维度都有用。
          </>
        )}
      </div>

      <div className="diagram-caption">
        <b>检测方法</b>：看每个维度的 KL(q(z|x)||p(z))。
        接近 0 说明该维度被忽略。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   83. VLAE 架构
   ══════════════════════════════════════════════ */

export function VLAEArchDemo() {
  const [rf, setRf] = useState(5);
  const imgSize = 28;

  const coverage = Math.min((rf * rf) / (imgSize * imgSize), 1);

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">限制感受野：迫使 z 编码全局信息</figcaption>

      <div className="pos-controls">
        <label>
          Encoder 感受野
          <input type="range" min="3" max="27" step="2" value={rf}
            onChange={(e) => setRf(parseInt(e.target.value, 10))} />
          <b>{rf}×{rf}</b>
        </label>
      </div>

      <div className="vle-viz">
        <div className="vle-image">
          {Array.from({ length: 14 }).map((_, r) => (
            <div key={r} className="vle-row">
              {Array.from({ length: 14 }).map((_, c) => {
                const cx = 7, cy = 7;
                const half = Math.floor((rf / 2) * (14 / imgSize));
                const inRf = Math.abs(r - cy) <= half && Math.abs(c - cx) <= half;
                return (
                  <div
                    key={c}
                    className={`vle-px ${inRf ? 'in-rf' : ''}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="vle-legend">
          <span><span className="vle-dot in" /> 感受野内（z 可见）</span>
          <span><span className="vle-dot out" /> 感受野外</span>
        </div>
      </div>

      <div className="vle-stats">
        <span>覆盖率：<b style={{ color: coverage < 0.2 ? '#22c55e' : '#ef4444' }}>{(coverage * 100).toFixed(0)}%</b></span>
        <span>能否独立重建？<b style={{ color: coverage < 0.5 ? '#22c55e' : '#ef4444' }}>{coverage < 0.5 ? '否' : '是'}</b></span>
      </div>

      <div className="vle-note" style={{ borderColor: coverage < 0.3 ? '#22c55e' : '#f59e0b' }}>
        {coverage < 0.1 ? (
          <>
            <b style={{ color: '#22c55e' }}>感受野很小</b>：z 只能看到局部，
            无法独立重建全图 → <b>必须编码全局语义</b>（如"这是数字几"）
          </>
        ) : coverage < 0.4 ? (
          <>
            <b style={{ color: '#f59e0b' }}>感受野适中</b>：z 能编码部分全局信息，
            但仍有足够约束。
          </>
        ) : (
          <>
            <b style={{ color: '#ef4444' }}>感受野太大</b>：z 能独立重建 →
            倾向编码局部细节 → 容易后验坍塌
          </>
        )}
      </div>

      <div className="diagram-caption">
        <b>关键</b>：不是"削弱" encoder，而是"引导"——
        局部信息不够重建，z 就必须编码能推断全局的东西。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   84. Reward Hacking
   ══════════════════════════════════════════════ */

export function RewardHackingDemo() {
  const [mode, setMode] = useState<'designed' | 'actual'>('designed');

  // 模拟：设计的奖励 vs 实际目标
  const positions = [0, 1, 2, 3, 4, 5];
  const designedReward = positions.map((p) => Math.max(0, 5 - Math.abs(p - 2)));
  const actualGoal = positions.map((p) => Math.exp(-Math.pow(p - 2, 2) / 2) * 5);

  const bestDesigned = positions[designedReward.indexOf(Math.max(...designedReward))];
  const bestActual = positions[actualGoal.indexOf(Math.max(...actualGoal))];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">Reward Hacking：优化"设计的奖励"会偏离"真实目标"</figcaption>

      <div className="pattern-tabs">
        <button
          type="button"
          className={`pattern-tab ${mode === 'designed' ? 'active' : ''}`}
          style={{ '--tab-color': '#ef4444' } as React.CSSProperties}
          onClick={() => setMode('designed')}
        >
          设计的奖励
        </button>
        <button
          type="button"
          className={`pattern-tab ${mode === 'actual' ? 'active' : ''}`}
          style={{ '--tab-color': '#22c55e' } as React.CSSProperties}
          onClick={() => setMode('actual')}
        >
          真实目标
        </button>
      </div>

      <div className="rh-bars">
        {positions.map((p, i) => {
          const val = mode === 'designed' ? designedReward[i] : actualGoal[i];
          const isBest = mode === 'designed' ? p === bestDesigned : p === bestActual;
          return (
            <div key={p} className="rh-col">
              <div className="rh-track">
                <div
                  className="rh-fill"
                  style={{
                    height: `${(val / 5) * 100}%`,
                    background: isBest ? (mode === 'designed' ? '#ef4444' : '#22c55e') : '#94a3b8',
                    opacity: isBest ? 1 : 0.45,
                  }}
                />
              </div>
              <span className="rh-pos">{p}</span>
              {isBest && <span className="rh-best">最优</span>}
            </div>
          );
        })}
      </div>

      <div className="rh-stats">
        <span>设计奖励最优位置：<b style={{ color: '#ef4444' }}>{bestDesigned}</b></span>
        <span>真实目标最优位置：<b style={{ color: '#22c55e' }}>{bestActual}</b></span>
      </div>

      <div className="rh-note" style={{ borderColor: bestDesigned !== bestActual ? '#ef4444' : '#22c55e' }}>
        {bestDesigned !== bestActual ? (
          <>
            <b style={{ color: '#ef4444' }}>不一致！</b>
            优化设计奖励会让 agent 跑到位置 {bestDesigned}，
            但真实最优在位置 {bestActual}。
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              这就是 reward hacking：agent 找到奖励函数的漏洞
            </span>
          </>
        ) : (
          <>
            <b style={{ color: '#22c55e' }}>一致</b>：设计奖励与真实目标吻合。
          </>
        )}
      </div>

      <div className="diagram-caption">
        <b>经典例子</b>：训练"清理房间"，奖励 = 垃圾数量减少。
        结果：机器人把垃圾藏起来（数量确实减少了，但房间没变干净）。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   85. 偏好学习
   ══════════════════════════════════════════════ */

export function PreferenceLearningDemo() {
  const [diff, setDiff] = useState(1.5);

  const prob = 1 / (1 + Math.exp(-diff));

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">Bradley-Terry：偏好概率 = σ(奖励差)</figcaption>

      <div className="pos-controls">
        <label>
          奖励差 r(A) − r(B)
          <input type="range" min="-4" max="4" step="0.25" value={diff}
            onChange={(e) => setDiff(parseFloat(e.target.value))} />
          <b>{diff.toFixed(2)}</b>
        </label>
      </div>

      <div className="pl-viz">
        <div className="pl-side" style={{ opacity: 0.3 + prob * 0.7 }}>
          <div className="pl-label">片段 A</div>
          <div className="pl-reward">r(A) = {(diff > 0 ? diff : 0).toFixed(1)}</div>
        </div>
        <div className="pl-vs">
          <div className="pl-prob" style={{ color: prob > 0.5 ? '#22c55e' : '#ef4444' }}>
            {(prob * 100).toFixed(1)}%
          </div>
          <div className="pl-prob-label">人类选 A 的概率</div>
        </div>
        <div className="pl-side" style={{ opacity: 0.3 + (1 - prob) * 0.7 }}>
          <div className="pl-label">片段 B</div>
          <div className="pl-reward">r(B) = {(diff < 0 ? -diff : 0).toFixed(1)}</div>
        </div>
      </div>

      <div className="pl-formula">
        <code>P(A ≻ B) = σ(r(A) − r(B)) = 1 / (1 + e^&#123;−(r(A)−r(B))&#125;)</code>
      </div>

      <div className="pl-note">
        {Math.abs(diff) < 0.1 ? (
          <>
            <b>奖励相等</b>：人类五五开（50%）——无法判断哪个更好。
          </>
        ) : diff > 0 ? (
          <>
            <b style={{ color: '#22c55e' }}>A 更好</b>：差值 {diff.toFixed(1)}，
            人类有 {(prob * 100).toFixed(1)}% 概率选 A。
          </>
        ) : (
          <>
            <b style={{ color: '#ef4444' }}>B 更好</b>：人类有 {((1 - prob) * 100).toFixed(1)}% 概率选 B。
          </>
        )}
      </div>

      <div className="diagram-caption">
        <b>训练目标</b>：让 r(A) − r(B) 在人类选 A 时变大，选 B 时变小。
        这就是奖励模型的损失函数。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   86. RLHF 架构
   ══════════════════════════════════════════════ */

export function RLHFArchDemo() {
  const [stage, setStage] = useState(0);

  const stages = [
    {
      name: '① SFT',
      title: '监督微调',
      desc: '用人类示范数据微调基础模型，学会"回答的格式"',
      color: '#94a3b8',
    },
    {
      name: '② 奖励模型',
      title: '从偏好学习奖励',
      desc: '人类两两比较回答，用 Bradley-Terry 训练 r_θ',
      color: '#f59e0b',
    },
    {
      name: '③ PPO',
      title: '强化学习微调',
      desc: '用 r_θ 打分，PPO 优化策略，加 KL 惩罚',
      color: '#22c55e',
    },
  ];

  const cur = stages[stage];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">RLHF 三阶段：SFT → 奖励模型 → PPO</figcaption>

      <div className="rhf-flow">
        {stages.map((s, i) => (
          <div
            key={i}
            className={`rhf-stage ${i === stage ? 'active' : ''}`}
            style={{ borderColor: i === stage ? s.color : 'var(--border)' }}
            onClick={() => setStage(i)}
          >
            <div className="rhf-name" style={{ color: i === stage ? s.color : 'var(--text-3)' }}>
              {s.name}
            </div>
            <div className="rhf-title">{s.title}</div>
          </div>
        ))}
      </div>

      <div className="rhf-detail" style={{ borderColor: cur.color }}>
        <b style={{ color: cur.color }}>{cur.name} {cur.title}</b>
        <br />
        {cur.desc}
      </div>

      <div className="rhf-models">
        <div className="rhf-model">
          <span className="rhf-mk">Actor</span>
          <span className="rhf-mv">被训练的策略 π_θ</span>
        </div>
        <div className="rhf-model">
          <span className="rhf-mk">Critic</span>
          <span className="rhf-mv">价值函数 V</span>
        </div>
        <div className="rhf-model">
          <span className="rhf-mk">Reward</span>
          <span className="rhf-mv">奖励模型 r_θ（冻结）</span>
        </div>
        <div className="rhf-model">
          <span className="rhf-mk">Reference</span>
          <span className="rhf-mv">参考模型 π_ref（冻结，算 KL）</span>
        </div>
      </div>

      <div className="diagram-caption">
        <b>PPO 阶段需要 4 个模型</b>——这就是 RLHF 训练显存开销大的原因。
        后续的 DPO/GRPO 都在试图减少这个数量。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   87. KL 正则化
   ══════════════════════════════════════════════ */

export function KLRegularizationDemo() {
  const [beta, setBeta] = useState(0.1);

  // 模拟：RM 分数随偏离度先增后减，KL 惩罚单调增
  const deviations = [0, 1, 2, 3, 4, 5];
  const rmScore = deviations.map((d) => 3 * Math.exp(-Math.pow(d - 4, 2) / 4) + d * 0.3);
  const klPenalty = deviations.map((d) => beta * d * d * 0.5);
  const objective = rmScore.map((r, i) => r - klPenalty[i]);

  const bestIdx = objective.indexOf(Math.max(...objective));
  const bestDev = deviations[bestIdx];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">KL 惩罚：在"高奖励"和"别跑太远"之间平衡</figcaption>

      <div className="pos-controls">
        <label>
          β（KL 惩罚系数）
          <input type="range" min="0" max="0.5" step="0.02" value={beta}
            onChange={(e) => setBeta(parseFloat(e.target.value))} />
          <b>{beta.toFixed(2)}</b>
        </label>
      </div>

      <div className="kl-bars">
        {deviations.map((d, i) => (
          <div key={d} className="kl-group">
            <div className="kl-label">d={d}</div>
            <div className="kl-bars-row">
              <div className="kl-bar-wrap">
                <div className="kl-bar rm" style={{ height: `${(rmScore[i] / 5) * 100}%` }} />
                <span className="kl-tag">RM</span>
              </div>
              <div className="kl-bar-wrap">
                <div className="kl-bar kl" style={{ height: `${(klPenalty[i] / 5) * 100}%` }} />
                <span className="kl-tag">KL</span>
              </div>
              <div className="kl-bar-wrap">
                <div
                  className={`kl-bar obj ${i === bestIdx ? 'best' : ''}`}
                  style={{ height: `${(Math.max(objective[i], 0) / 5) * 100}%` }}
                />
                <span className="kl-tag">总</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="kl-stats">
        <span>最优偏离度：<b style={{ color: '#22c55e' }}>d={bestDev}</b></span>
        <span>β 越大，越倾向 d=0（不偏离）</span>
      </div>

      <div className="kl-note" style={{ borderColor: beta > 0.3 ? '#f59e0b' : '#22c55e' }}>
        {beta === 0 ? (
          <>
            <b style={{ color: '#ef4444' }}>β=0</b>：无约束。策略会跑到 RM 分数最高的地方（d=4），
            但那里可能是 RM 的盲点（reward hacking）。
          </>
        ) : beta > 0.3 ? (
          <>
            <b style={{ color: '#f59e0b' }}>β 太大</b>：几乎不敢偏离（d=0），
            学不到新东西。
          </>
        ) : (
          <>
            <b style={{ color: '#22c55e' }}>β 适中</b>：在 d={bestDev} 取得平衡——
            既提高了 RM 分数，又没有偏离太远。
          </>
        )}
      </div>

      <div className="diagram-caption">
        <b>reward = r_θ(x,y) − β·KL(π‖π_ref)</b>。
        KL 惩罚像"弹力绳"——可以往前走，但不能走太远。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   88. 集合顺序
   ══════════════════════════════════════════════ */

const SET_ITEMS = [
  { id: 'A', x: 30, y: 30 },
  { id: 'B', x: 90, y: 20 },
  { id: 'C', x: 60, y: 70 },
  { id: 'D', x: 120, y: 65 },
];

export function SetOrderDemo() {
  const [perm, setPerm] = useState(0);

  const perms = [
    [0, 1, 2, 3],
    [3, 2, 1, 0],
    [1, 3, 0, 2],
  ];

  const order = perms[perm];
  const ordered = order.map((i) => SET_ITEMS[i]);

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">集合无序，但 RNN 按顺序读入</figcaption>

      <div className="so-controls">
        {perms.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`so-btn ${i === perm ? 'active' : ''}`}
            onClick={() => setPerm(i)}
          >
            顺序 {i + 1}
          </button>
        ))}
      </div>

      <svg viewBox="0 0 150 90" className="so-svg" role="img" aria-label="集合">
        {ordered.map((item, idx) => (
          <g key={item.id}>
            <circle cx={item.x} cy={item.y} r="13" fill="#2f6bff" opacity="0.85" />
            <text x={item.x} y={item.y + 4} textAnchor="middle" fontSize="10" fill="#fff" fontWeight="700">
              {item.id}
            </text>
            <text x={item.x} y={item.y - 17} textAnchor="middle" fontSize="7" fill="#94a3b8">
              #{idx + 1}
            </text>
          </g>
        ))}
      </svg>

      <div className="so-sequence">
        <span className="so-seq-label">RNN 读入顺序：</span>
        {ordered.map((item, i) => (
          <span key={i} className="so-seq-item">{item.id}</span>
        ))}
      </div>

      <div className="so-note">
        <b>同一个集合</b>（{'{'}A, B, C, D{'}'}），三种不同的读入顺序。
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          集合本身不变，但 RNN 的隐藏状态会不同 → 输出可能不同（错误）
        </span>
      </div>

      <div className="diagram-caption">
        <b>矛盾</b>：集合无序，RNN 有序。
        解法：随机排序训练 + 求和聚合（保证置换不变）。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   89. 随机排序
   ══════════════════════════════════════════════ */

export function RandomShuffleDemo() {
  const [mode, setMode] = useState<'fixed' | 'shuffle'>('shuffle');

  const epochs = [1, 2, 3, 4];
  const fixedOrders = [
    [0, 1, 2, 3],
    [0, 1, 2, 3],
    [0, 1, 2, 3],
    [0, 1, 2, 3],
  ];
  const shuffleOrders = [
    [0, 1, 2, 3],
    [2, 0, 3, 1],
    [3, 1, 0, 2],
    [1, 3, 2, 0],
  ];

  const orders = mode === 'fixed' ? fixedOrders : shuffleOrders;

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">随机排序训练：让模型见过多种排列</figcaption>

      <div className="pattern-tabs">
        <button
          type="button"
          className={`pattern-tab ${mode === 'fixed' ? 'active' : ''}`}
          style={{ '--tab-color': '#ef4444' } as React.CSSProperties}
          onClick={() => setMode('fixed')}
        >
          固定顺序
        </button>
        <button
          type="button"
          className={`pattern-tab ${mode === 'shuffle' ? 'active' : ''}`}
          style={{ '--tab-color': '#22c55e' } as React.CSSProperties}
          onClick={() => setMode('shuffle')}
        >
          随机排序
        </button>
      </div>

      <div className="rs-epochs">
        {epochs.map((e, i) => (
          <div key={e} className="rs-epoch">
            <span className="rs-label">epoch {e}</span>
            <div className="rs-items">
              {orders[i].map((item, j) => (
                <span key={j} className="rs-item" style={{ background: `hsl(${item * 70 + 200}, 65%, 55%)` }}>
                  {String.fromCharCode(65 + item)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rs-note" style={{ borderColor: mode === 'shuffle' ? '#22c55e' : '#ef4444' }}>
        {mode === 'fixed' ? (
          <>
            <b style={{ color: '#ef4444' }}>固定顺序</b>：模型只见过一种排列。
            <br />
            测试时换顺序 → 性能下降（模型过拟合到特定排列）。
          </>
        ) : (
          <>
            <b style={{ color: '#22c55e' }}>随机排序</b>：每个 epoch 用不同排列。
            <br />
            模型被迫学到"顺序无关"的表示 → 测试时稳定。
          </>
        )}
      </div>

      <div className="diagram-caption">
        <b>这本质上是数据增强</b>：同一个集合的 N! 种排列都是"同一个样本"。
        代价是需要更多训练步数。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   90. Read-Process-Write
   ══════════════════════════════════════════════ */

export function ReadProcessWriteDemo() {
  const [stage, setStage] = useState(0);

  const stages = [
    { name: 'Read', desc: '每个元素独立编码，然后求和聚合（置换不变）', color: '#2f6bff', order: '顺序无关 ✓' },
    { name: 'Process', desc: '在固定表示上用 RNN 迭代（无输入顺序）', color: '#7c5cff', order: '顺序无关 ✓' },
    { name: 'Write', desc: '解码输出序列（输出有顺序，这是正确的）', color: '#22c55e', order: '顺序有关 ✓' },
  ];

  const cur = stages[stage];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">Read-Process-Write：输入无序，输出有序</figcaption>

      <div className="rpw-flow">
        {stages.map((s, i) => (
          <div
            key={i}
            className={`rpw-stage ${i === stage ? 'active' : ''}`}
            style={{ borderColor: i === stage ? s.color : 'var(--border)' }}
            onClick={() => setStage(i)}
          >
            <div className="rpw-name" style={{ color: i === stage ? s.color : 'var(--text-3)' }}>
              {s.name}
            </div>
            <div className="rpw-order">{s.order}</div>
          </div>
        ))}
      </div>

      <div className="rpw-detail" style={{ borderColor: cur.color }}>
        <b style={{ color: cur.color }}>{cur.name}</b>
        <br />
        {cur.desc}
      </div>

      <div className="rpw-math">
        {stage === 0 && <code>s = Σ_i φ(x_i)</code>}
        {stage === 1 && <code>s⁽ᵗ⁺¹⁾ = RNN(s⁽ᵗ⁾)</code>}
        {stage === 2 && <code>y₁, y₂, ... = Decoder(s⁽ᵀ⁾)</code>}
      </div>

      <div className="diagram-caption">
        <b>关键洞察</b>：集合任务需要"输入顺序无关，输出顺序有关"。
        RPW 的三阶段正好对应。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   91. 卷积演示
   ══════════════════════════════════════════════ */

const CONV_INPUT = [
  [1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10],
  [11, 12, 13, 14, 15],
  [16, 17, 18, 19, 20],
  [21, 22, 23, 24, 25],
];

export function ConvDemo() {
  const [pos, setPos] = useState(0);

  const kernel = [[1, 0, -1], [1, 0, -1], [1, 0, -1]];

  const positions = [
    [0, 0], [0, 1], [0, 2],
    [1, 0], [1, 1], [1, 2],
    [2, 0], [2, 1], [2, 2],
  ];

  const [r, c] = positions[pos];

  let sum = 0;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      sum += CONV_INPUT[r + i][c + j] * kernel[i][j];
    }
  }

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">卷积：滑动窗口的乘加</figcaption>

      <div className="cv-grids">
        <div>
          <div className="cv-label">输入 5×5</div>
          <div className="cv-grid">
            {CONV_INPUT.map((row, i) =>
              row.map((v, j) => {
                const inWin = i >= r && i < r + 3 && j >= c && j < c + 3;
                return (
                  <div key={`${i}-${j}`} className={`cv-cell ${inWin ? 'in-win' : ''}`}>
                    {v}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="cv-op">✳</div>

        <div>
          <div className="cv-label">卷积核 3×3</div>
          <div className="cv-grid small">
            {kernel.map((row, i) =>
              row.map((v, j) => (
                <div key={`${i}-${j}`} className={`cv-cell k ${v === 0 ? 'zero' : v > 0 ? 'pos' : 'neg'}`}>
                  {v}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="cv-op">=</div>

        <div>
          <div className="cv-label">输出 3×3</div>
          <div className="cv-grid small">
            {positions.map((p, idx) => {
              let s = 0;
              for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                  s += CONV_INPUT[p[0] + i][p[1] + j] * kernel[i][j];
                }
              }
              return (
                <div key={idx} className={`cv-cell out ${idx === pos ? 'active' : ''}`}>
                  {s}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="cv-pos-btns">
        {positions.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`cv-pos-btn ${i === pos ? 'active' : ''}`}
            onClick={() => setPos(i)}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="cv-calc">
        <span className="cv-calc-label">当前计算：</span>
        <span className="cv-calc-val">
          位置({r},{c}) = Σ 窗口×核 = <b>{sum}</b>
        </span>
      </div>

      <div className="diagram-caption">
        <b>卷积 = 滑动窗口的乘加</b>。参数量 = k²·C_in·C_out + C_out，<b>与输入尺寸无关</b>。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   92. 输出尺寸
   ══════════════════════════════════════════════ */

export function OutputSizeDemo() {
  const [H, setH] = useState(32);
  const [k, setK] = useState(3);
  const [pad, setPad] = useState(1);
  const [stride, setStride] = useState(1);

  const Hout = Math.floor((H + 2 * pad - k) / stride) + 1;
  const valid = Hout > 0;

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">输出尺寸计算器</figcaption>

      <div className="os-controls">
        <label>
          输入 H
          <input type="range" min="8" max="128" step="8" value={H}
            onChange={(e) => setH(parseInt(e.target.value, 10))} />
          <b>{H}</b>
        </label>
        <label>
          kernel
          <input type="range" min="1" max="9" step="2" value={k}
            onChange={(e) => setK(parseInt(e.target.value, 10))} />
          <b>{k}</b>
        </label>
        <label>
          pad
          <input type="range" min="0" max="4" step="1" value={pad}
            onChange={(e) => setPad(parseInt(e.target.value, 10))} />
          <b>{pad}</b>
        </label>
        <label>
          stride
          <input type="range" min="1" max="4" step="1" value={stride}
            onChange={(e) => setStride(parseInt(e.target.value, 10))} />
          <b>{stride}</b>
        </label>
      </div>

      <div className="os-formula">
        <code>H_out = floor(({H} + 2×{pad} − {k}) / {stride}) + 1 = {valid ? Hout : '无效'}</code>
      </div>

      <div className="os-viz">
        <div className="os-row">
          <span className="os-label">输入</span>
          <div className="os-bar" style={{ width: '100%', background: '#94a3b8' }}>
            {H}
          </div>
        </div>
        <div className="os-row">
          <span className="os-label">+pad</span>
          <div className="os-bar" style={{ width: `${((H + 2 * pad) / 128) * 100}%`, background: '#2f6bff' }}>
            {H + 2 * pad}
          </div>
        </div>
        <div className="os-row">
          <span className="os-label">输出</span>
          <div
            className="os-bar"
            style={{
              width: valid ? `${(Hout / 128) * 100}%` : '2%',
              background: valid ? '#22c55e' : '#ef4444',
            }}
          >
            {valid ? Hout : '✗'}
          </div>
        </div>
      </div>

      <div className="os-note" style={{ borderColor: valid ? '#22c55e' : '#ef4444' }}>
        {!valid ? (
          <><b style={{ color: '#ef4444' }}>无效配置</b>：kernel 大于有效输入（H + 2·pad）</>
        ) : Hout === H ? (
          <><b style={{ color: '#22c55e' }}>same padding</b>：输出尺寸 = 输入尺寸（{H}）</>
        ) : Hout < H ? (
          <><b style={{ color: '#2f6bff' }}>下采样</b>：输出 {Hout} &lt; 输入 {H}（缩小 {(H / Hout).toFixed(1)} 倍）</>
        ) : (
          <><b style={{ color: '#f59e0b' }}>上采样</b>：输出 {Hout} &gt; 输入 {H}</>
        )}
      </div>

      <div className="diagram-caption">
        <b>same padding 规则</b>：pad = (k−1)/2，要求 k 为奇数。
        k=3 → pad=1；k=5 → pad=2；k=7 → pad=3。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   93. 参数量
   ══════════════════════════════════════════════ */

const PARAM_CONFIGS = [
  { name: '3×3, 3→64', k: 3, cin: 3, cout: 64 },
  { name: '3×3, 64→128', k: 3, cin: 64, cout: 128 },
  { name: '3×3, 128→256', k: 3, cin: 128, cout: 256 },
  { name: '1×1, 256→64', k: 1, cin: 256, cout: 64 },
  { name: '7×7, 3→64', k: 7, cin: 3, cout: 64 },
];

export function ParamCountDemo() {
  const [sel, setSel] = useState(0);
  const cur = PARAM_CONFIGS[sel];
  const params = (cur.k * cur.k * cur.cin + 1) * cur.cout;

  const maxParams = Math.max(...PARAM_CONFIGS.map((c) => (c.k * c.k * c.cin + 1) * c.cout));

  // 对比 FC
  const fcParams = cur.cin * 32 * 32 * cur.cout;

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">参数量：与输入尺寸无关（参数共享）</figcaption>

      <div className="pc4-list">
        {PARAM_CONFIGS.map((c, i) => {
          const p = (c.k * c.k * c.cin + 1) * c.cout;
          return (
            <button
              key={i}
              type="button"
              className={`pc4-item ${i === sel ? 'active' : ''}`}
              onClick={() => setSel(i)}
            >
              <span className="pc4-name">{c.name}</span>
              <div className="pc4-track">
                <div style={{ width: `${(p / maxParams) * 100}%`, background: i === sel ? '#2f6bff' : '#94a3b8' }} />
              </div>
              <span className="pc4-val">{p.toLocaleString()}</span>
            </button>
          );
        })}
      </div>

      <div className="pc4-formula">
        <code>({cur.k}² × {cur.cin} + 1) × {cur.cout} = {params.toLocaleString()}</code>
      </div>

      <div className="pc4-compare">
        <div className="pc4-row">
          <span className="pc4-k">Conv 参数量</span>
          <span className="pc4-v" style={{ color: '#22c55e' }}>{params.toLocaleString()}</span>
        </div>
        <div className="pc4-row">
          <span className="pc4-k">等价全连接</span>
          <span className="pc4-v" style={{ color: '#ef4444' }}>{fcParams.toLocaleString()}</span>
        </div>
        <div className="pc4-row">
          <span className="pc4-k">省了</span>
          <span className="pc4-v" style={{ color: '#2f6bff' }}>{(fcParams / params).toFixed(0)} 倍</span>
        </div>
      </div>

      <div className="pc4-note">
        <b>关键</b>：Conv 的参数量只依赖 (k, C_in, C_out)，<b>与输入 H、W 无关</b>。
        同一个核在整张图上滑动——这就是参数共享。
      </div>

      <div className="diagram-caption">
        <b>1×1 卷积的威力</b>：256→64 只需 {(1 * 1 * 256 + 1) * 64} 参数，
        而 3×3 要 {((3 * 3 * 256 + 1) * 64).toLocaleString()}——省 9 倍。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   94. im2col
   ══════════════════════════════════════════════ */

export function Im2colDemo() {
  const [step, setStep] = useState(0);

  const steps = [
    { name: '① 原图', desc: '输入 (C, H, W)' },
    { name: '② 展开窗口', desc: '每个卷积窗口展平成一列' },
    { name: '③ 拼成矩阵', desc: '所有列拼成 cols (C·k², H_out·W_out)' },
    { name: '④ 矩阵乘', desc: 'w_flat (C_out, C·k²) @ cols → 输出' },
  ];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">im2col：把卷积变成矩阵乘</figcaption>

      <div className="i2c-steps">
        {steps.map((s, i) => (
          <button
            key={i}
            type="button"
            className={`i2c-step ${i === step ? 'active' : ''}`}
            onClick={() => setStep(i)}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="i2c-viz">
        {step === 0 && (
          <div className="i2c-box">
            <div className="i2c-label">输入 (3, 5, 5)</div>
            <div className="i2c-grid">
              {Array.from({ length: 25 }).map((_, i) => (
                <div key={i} className="i2c-cell" style={{ opacity: 0.3 + ((i * 17) % 70) / 100 }} />
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="i2c-box">
            <div className="i2c-label">滑动窗口（3×3）</div>
            <div className="i2c-grid">
              {Array.from({ length: 25 }).map((_, i) => {
                const r = Math.floor(i / 5), c = i % 5;
                const inWin = r < 3 && c < 3;
                return (
                  <div
                    key={i}
                    className="i2c-cell"
                    style={{
                      background: inWin ? '#2f6bff' : 'var(--bg-soft)',
                      opacity: inWin ? 0.9 : 0.3,
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="i2c-matrix">
            <div className="i2c-mat-label">cols (27, 9)</div>
            <div className="i2c-mat">
              {Array.from({ length: 27 * 9 }).map((_, i) => (
                <div
                  key={i}
                  className="i2c-mcell"
                  style={{ opacity: 0.2 + ((i * 13) % 60) / 100 }}
                />
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="i2c-gemm">
            <div className="i2c-gemm-row">
              <div className="i2c-gemm-box">w_flat<br /><small>(64, 27)</small></div>
              <span className="i2c-gemm-op">@</span>
              <div className="i2c-gemm-box">cols<br /><small>(27, 9)</small></div>
              <span className="i2c-gemm-op">=</span>
              <div className="i2c-gemm-box result">out<br /><small>(64, 9)</small></div>
            </div>
          </div>
        )}
      </div>

      <div className="i2c-note">
        <b>{steps[step].name}</b>：{steps[step].desc}
        {step === 3 && (
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-3)' }}>
            用 BLAS/cuBLAS 加速，比 Python 循环快 10~100 倍
          </div>
        )}
      </div>

      <div className="diagram-caption">
        <b>代价</b>：cols 的内存是原图的 k² 倍（3×3 时 9 倍）。
        实际框架：小 kernel 用 im2col，大 kernel 用 FFT/Winograd。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   95. 感受野（CS231n 版）
   ══════════════════════════════════════════════ */

export function ReceptiveFieldDemo2() {
  const [layers, setLayers] = useState(3);
  const [stride, setStride] = useState(1);

  // RF = 1 + Σ (k-1) × Π s
  let rf = 1;
  let strideProd = 1;
  for (let i = 0; i < layers; i++) {
    rf += (3 - 1) * strideProd;
    strideProd *= stride;
  }

  const layerData = Array.from({ length: layers }, (_, i) => {
    let r = 1, sp = 1;
    for (let j = 0; j <= i; j++) {
      r += 2 * sp;
      sp *= stride;
    }
    return r;
  });

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">感受野累积：stride 会指数放大</figcaption>

      <div className="la-controls">
        <label>
          层数
          <input type="range" min="1" max="6" step="1" value={layers}
            onChange={(e) => setLayers(parseInt(e.target.value, 10))} />
          <b>{layers}</b>
        </label>
        <label>
          stride
          <input type="range" min="1" max="3" step="1" value={stride}
            onChange={(e) => setStride(parseInt(e.target.value, 10))} />
          <b>{stride}</b>
        </label>
      </div>

      <div className="rf2-bars">
        {layerData.map((r, i) => (
          <div key={i} className="rf2-col">
            <div className="rf2-track">
              <div
                className="rf2-fill"
                style={{ height: `${Math.min((r / 40) * 100, 100)}%` }}
              />
            </div>
            <span className="rf2-layer">L{i + 1}</span>
            <span className="rf2-val">{r}</span>
          </div>
        ))}
      </div>

      <div className="rf2-stats">
        <span>{layers} 层 3×3，stride={stride}：</span>
        <span>感受野 = <b style={{ color: '#2f6bff' }}>{rf}×{rf}</b></span>
        <span>对比 stride=1：<b>{1 + 2 * layers}</b></span>
      </div>

      <div className="rf2-note">
        {stride === 1 ? (
          <>
            <b>stride=1</b>：感受野线性增长（每层 +2）。
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              6 层才 13×13——扩大感受野很慢
            </span>
          </>
        ) : (
          <>
            <b style={{ color: '#f59e0b' }}>stride={stride}</b>：感受野指数增长！
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {layers} 层就到 {rf}×{rf}——但分辨率也下降了
            </span>
          </>
        )}
      </div>

      <div className="diagram-caption">
        <b>公式</b>：RF_l = RF_{'{'}l−1{'}'} + (k−1) × Π_{'{'}i&lt;l{'}'} s_i。
        stride 放大后续层的贡献——这就是为什么下采样能快速扩大感受野。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   96. 咖啡混合模拟
   ══════════════════════════════════════════════ */

export function CoffeeSimulationDemo() {
  const [step, setStep] = useState(0);

  // 模拟混合过程：0=分离, 1=开始混合, 2=螺旋, 3=接近均匀, 4=均匀
  const stages = [
    { name: '初始', entropy: 15, complexity: 12, color: '#94a3b8' },
    { name: '初期', entropy: 40, complexity: 45, color: '#0891b2' },
    { name: '中期', entropy: 65, complexity: 88, color: '#2f6bff' },
    { name: '后期', entropy: 85, complexity: 50, color: '#f59e0b' },
    { name: '均匀', entropy: 100, complexity: 10, color: '#22c55e' },
  ];

  const cur = stages[step];

  // 生成网格（按阶段模拟）
  const size = 16;
  const grid = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => {
      if (step === 0) return c < size / 2 ? 0 : 1;
      if (step === 4) {
        const v = Math.sin(r * 12.9898 + c * 78.233) * 43758.5453;
        return v - Math.floor(v) > 0.5 ? 1 : 0;
      }
      // 中间阶段：混合但有结构
      const base = c < size / 2 ? 0 : 1;
      const noise = Math.sin(r * 1.7 + c * 2.3 + step * 3) * 0.5 + 0.5;
      const mix = Math.min(step / 4, 1);
      const rnd = Math.sin(r * 12.9898 + c * 78.233) * 43758.5453;
      const rand = rnd - Math.floor(rnd);
      return rand < mix ? 1 - base : base;
    })
  );

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">咖啡混合：复杂度先升后降，熵单调上升</figcaption>

      <div className="cs-grid-wrap">
        <div className="cs-grid">
          {grid.map((row, r) => (
            <div key={r} className="cs-row">
              {row.map((v, c) => (
                <div
                  key={c}
                  className="cs-cell"
                  style={{ background: v ? '#f8fafc' : '#1e293b' }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="cs-stages">
        {stages.map((s, i) => (
          <button
            key={i}
            type="button"
            className={`cs-stage ${i === step ? 'active' : ''}`}
            onClick={() => setStep(i)}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="cs-metrics">
        <div className="cs-metric">
          <span className="cs-mk">熵</span>
          <div className="cs-track">
            <div style={{ width: `${cur.entropy}%`, background: '#ef4444' }} />
          </div>
          <span className="cs-mv" style={{ color: '#ef4444' }}>{cur.entropy}%</span>
        </div>
        <div className="cs-metric">
          <span className="cs-mk">复杂度</span>
          <div className="cs-track">
            <div style={{ width: `${cur.complexity}%`, background: cur.color }} />
          </div>
          <span className="cs-mv" style={{ color: cur.color }}>{cur.complexity}%</span>
        </div>
      </div>

      <div className="cs-note">
        <b>熵</b>：单调上升（15% → 100%）——热力学第二定律
        <br />
        <b>复杂度</b>：先升后降（12% → 88% → 10%）——倒 U 型
      </div>

      <div className="diagram-caption">
        <b>中期最复杂</b>：螺旋/条纹结构出现。均匀混合虽然熵最高，但结构消失、复杂度最低。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   97. 随机性演示
   ══════════════════════════════════════════════ */

const RANDOM_CASES = [
  { name: '全 0', bits: '0000000000000000', compressed: 12, note: '高度可压缩' },
  { name: '交替 01', bits: '0101010101010101', compressed: 14, note: '高度可压缩' },
  { name: '递增', bits: '0123012301230123', compressed: 20, note: '可压缩' },
  { name: '随机', bits: '1101001010110010', compressed: 62, note: '几乎不可压缩' },
];

export function RandomnessDemo() {
  const [sel, setSel] = useState(3);
  const cur = RANDOM_CASES[sel];
  const ratio = cur.compressed / 64;

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">随机性 = 不可压缩性</figcaption>

      <div className="rd-cases">
        {RANDOM_CASES.map((c, i) => (
          <button
            key={i}
            type="button"
            className={`rd-case ${i === sel ? 'active' : ''}`}
            onClick={() => setSel(i)}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="rd-bits">
        {cur.bits.split('').map((b, i) => (
          <div key={i} className={`rd-bit ${b === '1' ? 'one' : 'zero'}`}>{b}</div>
        ))}
      </div>

      <div className="rd-stats">
        <span>原始长度：<b>64 bit</b></span>
        <span>压缩后：<b style={{ color: ratio > 0.7 ? '#ef4444' : '#22c55e' }}>{cur.compressed} bit</b></span>
        <span>压缩率：<b>{(ratio * 100).toFixed(0)}%</b></span>
      </div>

      <div className="rd-note" style={{ borderColor: ratio > 0.7 ? '#ef4444' : '#22c55e' }}>
        <b>{cur.name}</b>：{cur.note}
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          {ratio > 0.7
            ? '压缩率接近 1 → K(x) ≈ |x| → 算法随机'
            : `压缩率 ${(ratio * 100).toFixed(0)}% → K(x) << |x| → 有规律`}
        </span>
      </div>

      <div className="diagram-caption">
        <b>K(x) ≈ |x|</b> 表示无法压缩（随机）；
        <b>{'K(x) << |x|'}</b> 表示有规律（可压缩）。gzip 长度是 K(x) 的上界近似。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   98. 气泡比例
   ══════════════════════════════════════════════ */

export function BubbleRatioDemo() {
  const [K, setK] = useState(4);

  const Ms = [4, 8, 16, 32, 64, 128];
  const data = Ms.map((M) => ({
    M,
    bubble: (K - 1) / (M + K - 1),
    efficiency: M / (M + K - 1),
  }));

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">气泡比例 = (K−1)/(M+K−1)：M 越大气泡越小</figcaption>

      <div className="pos-controls">
        <label>
          流水线级数 K
          <input type="range" min="2" max="8" step="1" value={K}
            onChange={(e) => setK(parseInt(e.target.value, 10))} />
          <b>{K}</b>
        </label>
      </div>

      <div className="br-bars">
        {data.map((d) => (
          <div key={d.M} className="br-col">
            <div className="br-track">
              <div
                className="br-fill"
                style={{
                  height: `${d.efficiency * 100}%`,
                  background: d.efficiency > 0.9 ? '#22c55e' : d.efficiency > 0.7 ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>
            <span className="br-m">M={d.M}</span>
            <span className="br-val" style={{ color: d.efficiency > 0.9 ? '#15803d' : 'var(--text-3)' }}>
              {(d.efficiency * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>

      <div className="br-table">
        <div className="br-head">
          <span>M</span>
          <span>总时间</span>
          <span>气泡比例</span>
          <span>效率</span>
        </div>
        {data.map((d) => (
          <div key={d.M} className="br-row">
            <span>{d.M}</span>
            <span>{d.M + K - 1}</span>
            <span style={{ color: d.bubble > 0.2 ? '#ef4444' : '#22c55e' }}>
              {(d.bubble * 100).toFixed(1)}%
            </span>
            <span style={{ color: '#22c55e' }}>{(d.efficiency * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>

      <div className="br-note">
        <b>M 大 → 气泡小、效率高</b>。但 M 太大会让每个 micro-batch 太小，
        导致 BatchNorm 统计不准。<b>实践：M ≈ 4K ~ 8K</b>。
      </div>

      <div className="diagram-caption">
        K={K}、M=32 时效率 {(32 / (32 + K - 1) * 100).toFixed(0)}%；
        M=128 时 {(128 / (128 + K - 1) * 100).toFixed(0)}%。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   99. Bradley-Terry
   ══════════════════════════════════════════════ */

export function BradleyTerryDemo() {
  const [diff, setDiff] = useState(1.0);

  const prob = 1 / (1 + Math.exp(-diff));

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">Bradley-Terry：偏好概率 = σ(奖励差)</figcaption>

      <div className="pos-controls">
        <label>
          r(A) − r(B)
          <input type="range" min="-5" max="5" step="0.25" value={diff}
            onChange={(e) => setDiff(parseFloat(e.target.value))} />
          <b>{diff.toFixed(2)}</b>
        </label>
      </div>

      <div className="bt-curve">
        <svg viewBox="0 0 320 120" className="bt-svg" role="img" aria-label="sigmoid">
          <line x1="30" y1="100" x2="310" y2="100" stroke="#cbd5e1" strokeWidth="1" />
          <line x1="170" y1="10" x2="170" y2="105" stroke="#cbd5e1" strokeWidth="1" />
          <text x="310" y="113" textAnchor="end" fontSize="7" fill="#94a3b8">r(A)−r(B)</text>
          <text x="175" y="18" fontSize="7" fill="#94a3b8">P=1</text>
          <text x="175" y="98" fontSize="7" fill="#94a3b8">P=0</text>

          <path
            d={Array.from({ length: 61 }, (_, i) => {
              const d = -5 + (i / 60) * 10;
              const p = 1 / (1 + Math.exp(-d));
              const x = 30 + ((d + 5) / 10) * 280;
              const y = 100 - p * 85;
              return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
            }).join(' ')}
            fill="none"
            stroke="#2f6bff"
            strokeWidth="2.2"
          />

          <circle
            cx={30 + ((diff + 5) / 10) * 280}
            cy={100 - prob * 85}
            r="4.5"
            fill="#22c55e"
          />
        </svg>
      </div>

      <div className="bt-stats">
        <span>差值：<b>{diff.toFixed(2)}</b></span>
        <span>P(A 更好)：<b style={{ color: prob > 0.5 ? '#22c55e' : '#ef4444' }}>{(prob * 100).toFixed(1)}%</b></span>
      </div>

      <div className="bt-formula">
        <code>P(A ≻ B) = σ(r(A) − r(B)) = 1 / (1 + e^&#123;−(r(A)−r(B))&#125;)</code>
      </div>

      <div className="bt-note">
        {Math.abs(diff) < 0.1
          ? '奖励相等 → 五五开（50%），无法判断哪个更好'
          : diff > 0
            ? `A 更好：差值 ${diff.toFixed(2)} → 人类有 ${(prob * 100).toFixed(1)}% 概率选 A`
            : `B 更好：人类有 ${((1 - prob) * 100).toFixed(1)}% 概率选 B`}
      </div>

      <div className="diagram-caption">
        <b>只看差值</b>——奖励的绝对尺度无关（r 和 r+c 等价）。
        训练目标：让 r(A)−r(B) 在人类选 A 时变大。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   100. ResNet 架构
   ══════════════════════════════════════════════ */

const RESNET_STAGES = [
  { name: 'Stem', detail: 'Conv 7×7, 64, s=2 + MaxPool', out: '112→56', blocks: 0 },
  { name: 'Stage 1', detail: 'Bottleneck × 3', out: '56×56', blocks: 3 },
  { name: 'Stage 2', detail: 'Bottleneck × 4, s=2', out: '28×28', blocks: 4 },
  { name: 'Stage 3', detail: 'Bottleneck × 6, s=2', out: '14×14', blocks: 6 },
  { name: 'Stage 4', detail: 'Bottleneck × 3, s=2', out: '7×7', blocks: 3 },
  { name: 'Head', detail: 'GAP + FC', out: '1×1', blocks: 0 },
];

export function ResNetArchDemo() {
  const [sel, setSel] = useState(2);
  const cur = RESNET_STAGES[sel];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">ResNet-50 完整架构</figcaption>

      <div className="ra-flow">
        {RESNET_STAGES.map((s, i) => (
          <div
            key={i}
            className={`ra-stage ${i === sel ? 'active' : ''}`}
            onClick={() => setSel(i)}
          >
            <div className="ra-name">{s.name}</div>
            <div className="ra-out">{s.out}</div>
            {s.blocks > 0 && <div className="ra-blocks">×{s.blocks}</div>}
          </div>
        ))}
      </div>

      <div className="ra-detail">
        <b>{cur.name}</b>：{cur.detail}
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          输出尺寸：{cur.out}
          {cur.blocks > 0 && ` · ${cur.blocks} 个 Bottleneck 块`}
        </span>
      </div>

      <div className="ra-summary">
        <div className="ra-item">
          <span className="ra-k">总层数</span>
          <span className="ra-v">50</span>
        </div>
        <div className="ra-item">
          <span className="ra-k">参数量</span>
          <span className="ra-v">25.6M</span>
        </div>
        <div className="ra-item">
          <span className="ra-k">Top-5 错误率</span>
          <span className="ra-v" style={{ color: '#22c55e' }}>5.25%</span>
        </div>
        <div className="ra-item">
          <span className="ra-k">对比 VGG-16</span>
          <span className="ra-v" style={{ color: '#2f6bff' }}>参数少 5 倍</span>
        </div>
      </div>

      <div className="ra-note">
        <b>关键设计</b>：Bottleneck（1×1 降维 → 3×3 → 1×1 升维）+ GAP 替代全连接。
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          这让 ResNet-50 参数比 VGG-16 少 5 倍，但错误率低 2 个点
        </span>
      </div>

      <div className="diagram-caption">
        <b>4 个 stage 逐级下采样</b>（56→28→14→7），通道逐级翻倍（256→512→1024→2048）。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   101. 预激活架构对比
   ══════════════════════════════════════════════ */

export function PreActArchDemo() {
  const [mode, setMode] = useState<'post' | 'pre'>('pre');

  const postLayers = ['Conv 7×7', 'MaxPool', 'Conv-BN-ReLU ×N', '(+x) → ReLU', 'GAP', 'FC'];
  const preLayers = ['Conv 7×7', 'MaxPool', 'BN-ReLU-Conv ×N', '(+x)', 'BN → ReLU', 'GAP', 'FC'];

  const layers = mode === 'post' ? postLayers : preLayers;

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">原版 vs 预激活：完整架构对比</figcaption>

      <div className="pattern-tabs">
        <button
          type="button"
          className={`pattern-tab ${mode === 'post' ? 'active' : ''}`}
          style={{ '--tab-color': '#ef4444' } as React.CSSProperties}
          onClick={() => setMode('post')}
        >
          原版 ResNet
        </button>
        <button
          type="button"
          className={`pattern-tab ${mode === 'pre' ? 'active' : ''}`}
          style={{ '--tab-color': '#22c55e' } as React.CSSProperties}
          onClick={() => setMode('pre')}
        >
          ResNet v2（预激活）
        </button>
      </div>

      <div className="pa-flow">
        {layers.map((l, i) => {
          const isKey = l.includes('(+x)');
          const isFix = l.includes('BN → ReLU');
          return (
            <div
              key={i}
              className={`pa-layer ${isKey ? 'key' : ''} ${isFix ? 'fix' : ''}`}
              style={{
                borderColor: isKey ? (mode === 'post' ? '#ef4444' : '#22c55e') : isFix ? '#7c5cff' : 'var(--border)',
              }}
            >
              {l}
              {isKey && mode === 'post' && <span className="pa-warn">⚠ 后接 ReLU 截断</span>}
              {isKey && mode === 'pre' && <span className="pa-ok">✓ 纯净捷径</span>}
              {isFix && <span className="pa-ok">✓ 补上最后的激活</span>}
            </div>
          );
        })}
      </div>

      <div className="pa-note" style={{ borderColor: mode === 'post' ? '#ef4444' : '#22c55e' }}>
        {mode === 'post' ? (
          <>
            <b style={{ color: '#ef4444' }}>原版</b>：加法后有 ReLU，
            <b>截断负梯度</b>。深层累积后信号严重衰减，1000 层时无法训练。
          </>
        ) : (
          <>
            <b style={{ color: '#22c55e' }}>预激活</b>：BN/ReLU 全部前置，
            <b>加法后无操作</b>。梯度永远有 +1，可训练 1001 层。
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              代价：网络最后要补一个 BN+ReLU（因为激活都移到前面了）
            </span>
          </>
        )}
      </div>

      <div className="diagram-caption">
        <b>实验结果</b>：110 层 6.61% → 5.71%；164 层 5.71% → 5.46%；
        <b>1001 层原版无法训练，预激活 4.92%</b>。
      </div>
    </figure>
  );
}
