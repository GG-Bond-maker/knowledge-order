/**
 * 数据类图示组件：SQL JOIN、Pandas 索引、透视表结构
 *
 * 用法（在 Lesson content 中单独占一行）：
 *   <JoinDiagram kind="inner" />
 *   <IndexDiagram kind="loc" />
 *   <PivotDiagram />
 *   <LrCurve name="cosine" />
 *   <Flowchart name="sql-order" />
 *   <TreeView name="recursion" />
 */

import { useMemo, useState } from 'react';
import './diagrams.css';

/* ══════════════════════════════════════════════
   1. SQL JOIN 对比图
   ══════════════════════════════════════════════ */

interface JoinSpec {
  title: string;
  /** 左表行 */
  left: { id: string; val: string }[];
  /** 右表行 */
  right: { id: string; val: string }[];
  /** 结果行 */
  result: { left: string; right: string; note?: string }[];
  desc: string;
  /** 韦恩图左侧填充比例 */
  venn: 'left' | 'right' | 'both' | 'all' | 'leftOnly' | 'rightOnly';
}

const JOIN_SPECS: Record<string, JoinSpec> = {
  inner: {
    title: 'INNER JOIN（内连接）——只保留两边都匹配的行',
    left: [
      { id: '1', val: '张三' },
      { id: '2', val: '李四' },
      { id: '3', val: '王五' },
    ],
    right: [
      { id: '2', val: '订单A' },
      { id: '3', val: '订单B' },
      { id: '4', val: '订单C' },
    ],
    result: [
      { left: '2 李四', right: '2 订单A' },
      { left: '3 王五', right: '3 订单B' },
    ],
    desc: '左表的 1、右表的 4 都因找不到匹配而被丢弃。结果行数 ≤ min(左, 右)。',
    venn: 'both',
  },
  left: {
    title: 'LEFT JOIN（左连接）——保留左表全部行，右表缺失补 NULL',
    left: [
      { id: '1', val: '张三' },
      { id: '2', val: '李四' },
      { id: '3', val: '王五' },
    ],
    right: [
      { id: '2', val: '订单A' },
      { id: '3', val: '订单B' },
      { id: '4', val: '订单C' },
    ],
    result: [
      { left: '1 张三', right: 'NULL', note: '右表无匹配' },
      { left: '2 李四', right: '2 订单A' },
      { left: '3 王五', right: '3 订单B' },
    ],
    desc: '左表 3 行全部保留；张三没有订单，右表字段为 NULL。这是"找出没有订单的用户"的标准写法。',
    venn: 'left',
  },
  right: {
    title: 'RIGHT JOIN（右连接）——保留右表全部行',
    left: [
      { id: '1', val: '张三' },
      { id: '2', val: '李四' },
      { id: '3', val: '王五' },
    ],
    right: [
      { id: '2', val: '订单A' },
      { id: '3', val: '订单B' },
      { id: '4', val: '订单C' },
    ],
    result: [
      { left: '2 李四', right: '2 订单A' },
      { left: '3 王五', right: '3 订单B' },
      { left: 'NULL', right: '4 订单C', note: '左表无匹配' },
    ],
    desc: '右表 3 行全部保留；订单C 找不到用户。实际项目里通常用 LEFT JOIN 反转表顺序来替代。',
    venn: 'right',
  },
  full: {
    title: 'FULL OUTER JOIN（全外连接）——两边都保留',
    left: [
      { id: '1', val: '张三' },
      { id: '2', val: '李四' },
      { id: '3', val: '王五' },
    ],
    right: [
      { id: '2', val: '订单A' },
      { id: '3', val: '订单B' },
      { id: '4', val: '订单C' },
    ],
    result: [
      { left: '1 张三', right: 'NULL', note: '仅左表' },
      { left: '2 李四', right: '2 订单A' },
      { left: '3 王五', right: '3 订单B' },
      { left: 'NULL', right: '4 订单C', note: '仅右表' },
    ],
    desc: '左表 3 行 + 右表 3 行 = 4 行结果。注意 SQLite 不支持 FULL OUTER JOIN，需用 LEFT JOIN UNION RIGHT JOIN 模拟。',
    venn: 'all',
  },
};

export function JoinDiagram({ kind = 'inner' }: { kind?: string }) {
  const spec = JOIN_SPECS[kind];
  if (!spec) return <div className="diagram-missing">未找到 JOIN 图：{kind}</div>;

  const ROW_H = 34;
  const TBL_W = 130;
  const GAP = 56;
  const totalH = Math.max(spec.left.length, spec.right.length, spec.result.length) * ROW_H + 40;

  const renderTable = (rows: { id: string; val: string }[], x: number, label: string, color: string) => (
    <g>
      <text x={x + TBL_W / 2} y={16} textAnchor="middle" className="heatmap-label">
        {label}
      </text>
      {rows.map((r, i) => (
        <g key={r.id}>
          <rect
            x={x}
            y={24 + i * ROW_H}
            width={TBL_W}
            height={ROW_H - 4}
            rx="5"
            fill={`${color}14`}
            stroke={color}
            strokeWidth="1.2"
          />
          <text x={x + 10} y={24 + i * ROW_H + 20} className="heatmap-value" fill="#334155">
            {r.id} · {r.val}
          </text>
        </g>
      ))}
    </g>
  );

  // 韦恩图填充
  const vennCx = TBL_W * 2 + GAP + 70;
  const vennR = 26;
  const vennFill = (side: 'l' | 'r') => {
    const v = spec.venn;
    if (v === 'all') return true;
    if (side === 'l') return v === 'left' || v === 'leftOnly' || v === 'both';
    return v === 'right' || v === 'rightOnly' || v === 'both';
  };

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">{spec.title}</figcaption>
      <svg viewBox={`0 0 ${vennCx + 120} ${totalH + 20}`} className="diagram-svg" role="img" aria-label={spec.title}>
        {renderTable(spec.left, 0, '左表 customers', '#2f6bff')}
        {renderTable(spec.right, TBL_W + 60, '右表 orders', '#22c55e')}

        {/* 韦恩图 */}
        <g transform={`translate(${vennCx}, ${40})`}>
          <circle
            cx={-vennR / 2}
            cy={vennR / 2}
            r={vennR}
            fill={vennFill('l') ? 'rgba(47,107,255,0.28)' : 'none'}
            stroke="#2f6bff"
            strokeWidth="1.6"
          />
          <circle
            cx={vennR / 2}
            cy={vennR / 2}
            r={vennR}
            fill={vennFill('r') ? 'rgba(34,197,94,0.28)' : 'none'}
            stroke="#22c55e"
            strokeWidth="1.6"
          />
          <text x="0" y={vennR * 2 + 18} textAnchor="middle" className="diagram-edge-label">
            匹配范围
          </text>
        </g>

        {/* 结果表 */}
        <g transform={`translate(${vennCx + 60}, 0)`}>
          <text x={TBL_W / 2} y={16} textAnchor="middle" className="heatmap-label">
            结果 {spec.result.length} 行
          </text>
          {spec.result.map((r, i) => {
            const isNull = r.left.includes('NULL') || r.right.includes('NULL');
            return (
              <g key={i}>
                <rect
                  x={0}
                  y={24 + i * ROW_H}
                  width={TBL_W + 30}
                  height={ROW_H - 4}
                  rx="5"
                  fill={isNull ? '#fef3c7' : '#f0fdf4'}
                  stroke={isNull ? '#f59e0b' : '#22c55e'}
                  strokeWidth="1.2"
                />
                <text x={10} y={24 + i * ROW_H + 20} className="heatmap-value" fill="#334155">
                  {r.left} | {r.right}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="diagram-caption">{spec.desc}</div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   2. Pandas 索引机制图
   ══════════════════════════════════════════════ */

interface IndexSpec {
  title: string;
  desc: string;
  /** 表格数据 */
  data: string[][];
  index: string[];
  columns: string[];
  /** 高亮单元格 [row, col] */
  highlight: [number, number][];
  /** 标注文字 */
  marks: { text: string; row: number; col: number }[];
}

const INDEX_SPECS: Record<string, IndexSpec> = {
  loc: {
    title: 'df.loc[行标签, 列标签] —— 按"名字"取',
    desc: 'loc 用的是索引标签（可以是字符串、日期、甚至是自定义索引）。切片时**包含右端点**：[1:3] 会取到标签 3。',
    data: [
      ['张三', '88', '北京'],
      ['李四', '92', '上海'],
      ['王五', '55', '北京'],
      ['赵六', '60', '广州'],
    ],
    index: ['a', 'b', 'c', 'd'],
    columns: ['name', 'score', 'city'],
    highlight: [
      [0, 0],
      [1, 0],
    ],
    marks: [
      { text: 'df.loc["a":"b", "name"]', row: 1, col: 0 },
    ],
  },
  iloc: {
    title: 'df.iloc[行位置, 列位置] —— 按"位置"取',
    desc: 'iloc 用的是从 0 开始的整数位置。切片时**不包含右端点**：[0:2] 只取位置 0、1 两行——和 Python 列表切片一致。',
    data: [
      ['张三', '88', '北京'],
      ['李四', '92', '上海'],
      ['王五', '55', '北京'],
      ['赵六', '60', '广州'],
    ],
    index: ['a', 'b', 'c', 'd'],
    columns: ['name', 'score', 'city'],
    highlight: [
      [0, 0],
      [1, 0],
    ],
    marks: [
      { text: 'df.iloc[0:2, 0]', row: 1, col: 0 },
    ],
  },
  mask: {
    title: '布尔索引 df[条件] —— 按"真假"筛行',
    desc: '布尔索引先算出一个与原表等长的 True/False 序列，再按它为 True 的行筛选。可以用 & | ~ 组合多个条件，注意每个条件都要加括号。',
    data: [
      ['张三', '88', '北京'],
      ['李四', '92', '上海'],
      ['王五', '55', '北京'],
      ['赵六', '60', '广州'],
    ],
    index: ['a', 'b', 'c', 'd'],
    columns: ['name', 'score', 'city'],
    highlight: [
      [1, 1],
      [3, 1],
    ],
    marks: [{ text: 'df[df["score"] >= 60]', row: 3, col: 1 }],
  },
};

export function IndexDiagram({ kind = 'loc' }: { kind?: string }) {
  const spec = INDEX_SPECS[kind];
  if (!spec) return <div className="diagram-missing">未找到索引图：{kind}</div>;

  const CELL = 62;
  const ROW_H = 30;
  const LABEL_W = 44;
  const HEAD_H = 28;
  const w = LABEL_W + spec.columns.length * CELL;
  const h = HEAD_H + spec.data.length * ROW_H + 40;
  const hl = new Set(spec.highlight.map(([r, c]) => `${r}-${c}`));

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">{spec.title}</figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} className="diagram-svg" role="img" aria-label={spec.title}>
        {/* 列头 */}
        <text x={LABEL_W / 2} y={HEAD_H - 8} textAnchor="middle" className="diagram-edge-label">
          index
        </text>
        {spec.columns.map((c, j) => (
          <text key={c} x={LABEL_W + j * CELL + CELL / 2} y={HEAD_H - 8} textAnchor="middle" className="heatmap-label">
            {c}
          </text>
        ))}

        {/* 数据 */}
        {spec.data.map((row, i) => (
          <g key={i}>
            <text x={LABEL_W / 2} y={HEAD_H + i * ROW_H + 20} textAnchor="middle" className="heatmap-label" fill="#7c5cff">
              {spec.index[i]}
            </text>
            {row.map((v, j) => {
              const isHl = hl.has(`${i}-${j}`);
              return (
                <g key={j}>
                  <rect
                    x={LABEL_W + j * CELL + 2}
                    y={HEAD_H + i * ROW_H + 2}
                    width={CELL - 4}
                    height={ROW_H - 4}
                    rx="4"
                    fill={isHl ? 'rgba(47,107,255,0.18)' : '#f8fafc'}
                    stroke={isHl ? '#2f6bff' : '#e2e8f0'}
                    strokeWidth={isHl ? 1.8 : 1}
                  />
                  <text
                    x={LABEL_W + j * CELL + CELL / 2}
                    y={HEAD_H + i * ROW_H + 20}
                    textAnchor="middle"
                    className="heatmap-value"
                    fill={isHl ? '#1d4ed8' : '#64748b'}
                  >
                    {v}
                  </text>
                </g>
              );
            })}
          </g>
        ))}

        {/* 标注 */}
        {spec.marks.map((m, i) => (
          <text
            key={i}
            x={LABEL_W}
            y={HEAD_H + m.row * ROW_H + 46 + i * 16}
            className="diagram-edge-label"
            fill="#2f6bff"
            fontWeight="600"
          >
            {m.text}
          </text>
        ))}
      </svg>
      <div className="diagram-caption">{spec.desc}</div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   3. 透视表结构图
   ══════════════════════════════════════════════ */

export function PivotDiagram() {
  const source = [
    ['北京', 'A', '100'],
    ['北京', 'B', '200'],
    ['上海', 'A', '150'],
    ['上海', 'B', '50'],
    ['广州', 'A', '300'],
  ];
  const pivot = [
    ['city', 'A', 'B'],
    ['北京', '100', '200'],
    ['上海', '150', '50'],
    ['广州', '300', '0'],
  ];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">透视表：把「长表」的某列值展开成列</figcaption>
      <div className="pivot-viz">
        <div className="pivot-side">
          <div className="pivot-label">原始长表（5 行）</div>
          <table className="pivot-table">
            <thead>
              <tr>
                <th>city</th>
                <th>cat</th>
                <th>amt</th>
              </tr>
            </thead>
            <tbody>
              {source.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pivot-arrow">
          <div>index=city</div>
          <div>columns=cat</div>
          <div>values=amt</div>
          <span>⟹</span>
        </div>
        <div className="pivot-side">
          <div className="pivot-label">透视后宽表（3 行）</div>
          <table className="pivot-table pivot-result">
            <thead>
              <tr>
                {pivot[0].map((c, i) => (
                  <th key={i}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pivot.slice(1).map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j} className={c === '0' ? 'pivot-fill' : ''}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="diagram-caption">
        长表 5 行 → 宽表 3 行。广州没有 B 类商品，透视后补 <code>0</code>（
        <code>fill_value=0</code>）。这就是 <code>pivot_table</code> 做的事：把一列的唯一值变成新的列。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   4. 学习率曲线图
   ══════════════════════════════════════════════ */

const LR_PRESETS: Record<string, { title: string; desc: string; fn: (p: number) => number; color: string }> = {
  cosine: {
    title: '余弦衰减（大模型预训练最常用）',
    desc: 'warmup 阶段线性升到峰值，之后按余弦曲线平滑衰减到 min_lr。前期缓降、中期快降、后期趋平。',
    fn: (p) => {
      const warm = 0.08;
      if (p < warm) return p / warm;
      const t = (p - warm) / (1 - warm);
      return 0.1 + 0.9 * 0.5 * (1 + Math.cos(Math.PI * t));
    },
    color: '#2f6bff',
  },
  linear: {
    title: '线性衰减',
    desc: 'warmup 后匀速下降。实现最简单，T5/BERT 系列常用。',
    fn: (p) => {
      const warm = 0.08;
      if (p < warm) return p / warm;
      return 1 - (p - warm) / (1 - warm);
    },
    color: '#22c55e',
  },
  invsqrt: {
    title: '逆平方根衰减（原始 Transformer）',
    desc: '前期下降很快，后期极慢。Attention Is All You Need 用的就是这个变体。',
    fn: (p) => {
      const warm = 0.08;
      if (p < warm) return p / warm;
      const s = 1 / Math.sqrt(p);
      const s0 = 1 / Math.sqrt(warm);
      return s / s0;
    },
    color: '#f59e0b',
  },
  step: {
    title: '阶梯衰减（传统 CNN）',
    desc: '每隔固定步数学习率砍半。ResNet 时代的标准做法，Transformer 已少用。',
    fn: (p) => {
      if (p < 0.3) return 1;
      if (p < 0.6) return 0.5;
      if (p < 0.85) return 0.25;
      return 0.125;
    },
    color: '#ec4899',
  },
};

export function LrCurve({ name = 'cosine' }: { name?: string }) {
  const preset = LR_PRESETS[name];
  if (!preset) return <div className="diagram-missing">未找到学习率曲线：{name}</div>;

  const W = 560;
  const H = 200;
  const PAD_L = 44;
  const PAD_B = 28;
  const PAD_T = 14;
  const chartW = W - PAD_L - 16;
  const chartH = H - PAD_T - PAD_B;

  const points = useMemo(() => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 100; i += 1) {
      const p = i / 100;
      pts.push([PAD_L + p * chartW, PAD_T + (1 - preset.fn(p)) * chartH]);
    }
    return pts;
  }, [preset, chartW, chartH]);

  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">{preset.title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="diagram-svg" role="img" aria-label={preset.title}>
        {/* 网格 */}
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <g key={g}>
            <line
              x1={PAD_L}
              y1={PAD_T + (1 - g) * chartH}
              x2={PAD_L + chartW}
              y2={PAD_T + (1 - g) * chartH}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <text x={PAD_L - 8} y={PAD_T + (1 - g) * chartH + 4} textAnchor="end" className="diagram-edge-label">
              {(g * 100).toFixed(0)}%
            </text>
          </g>
        ))}
        {/* warmup 分区 */}
        <rect x={PAD_L} y={PAD_T} width={0.08 * chartW} height={chartH} fill="rgba(245,158,11,0.08)" />
        <text x={PAD_L + 0.04 * chartW} y={PAD_T + 12} textAnchor="middle" className="diagram-edge-label" fill="#b45309">
          warmup
        </text>
        {/* 曲线 */}
        <path d={path} fill="none" stroke={preset.color} strokeWidth="2.5" strokeLinecap="round" />
        {/* 轴 */}
        <line x1={PAD_L} y1={PAD_T + chartH} x2={PAD_L + chartW} y2={PAD_T + chartH} stroke="#94a3b8" />
        <text x={PAD_L + chartW / 2} y={H - 6} textAnchor="middle" className="diagram-edge-label">
          训练进度
        </text>
        <text x={12} y={PAD_T + chartH / 2} textAnchor="middle" className="diagram-edge-label" transform={`rotate(-90 12 ${PAD_T + chartH / 2})`}>
          学习率
        </text>
      </svg>
      <div className="diagram-caption">{preset.desc}</div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   5. 通用流程图
   ══════════════════════════════════════════════ */

interface FlowSpec {
  title: string;
  steps: { label: string; desc?: string; color?: string }[];
  note?: string;
  /** 横向还是纵向 */
  dir?: 'h' | 'v';
}

const FLOW_SPECS: Record<string, FlowSpec> = {
  'sql-order': {
    title: 'SQL 逻辑执行顺序（与书写顺序不同）',
    dir: 'h',
    steps: [
      { label: 'FROM / JOIN', desc: '先确定数据源与连接', color: '#94a3b8' },
      { label: 'WHERE', desc: '过滤行（此时不能用聚合结果）', color: '#38bdf8' },
      { label: 'GROUP BY', desc: '分组', color: '#7c5cff' },
      { label: 'HAVING', desc: '过滤组（可以用聚合）', color: '#ec4899' },
      { label: 'SELECT', desc: '选出列、计算表达式、窗口函数', color: '#f59e0b' },
      { label: 'ORDER BY', desc: '排序（可以用别名）', color: '#22c55e' },
      { label: 'LIMIT', desc: '截断', color: '#0891b2' },
    ],
    note: '这就是为什么 WHERE 里不能写聚合函数（那时还没分组），而 HAVING 可以；也是为什么 SELECT 的别名能在 ORDER BY 用、不能在 WHERE 用。',
  },
  'window-exec': {
    title: '窗口函数的执行位置',
    dir: 'v',
    steps: [
      { label: '① FROM / JOIN 产生基础行集', color: '#94a3b8' },
      { label: '② WHERE 过滤行', color: '#38bdf8' },
      { label: '③ GROUP BY 聚合（如果有）', color: '#7c5cff' },
      { label: '④ 窗口函数在此计算：分区 → 排序 → 逐行计算', color: '#ec4899', desc: '此时每一行都还在，窗口函数不减少行数' },
      { label: '⑤ SELECT 输出列', color: '#f59e0b' },
      { label: '⑥ ORDER BY / LIMIT', color: '#22c55e' },
    ],
    note: '关键：窗口函数不减少行数（与 GROUP BY 的本质区别），且它在 WHERE 之后执行——所以不能直接 WHERE rn = 1，必须套一层子查询或 CTE。',
  },
  'rag-advanced': {
    title: '高级 RAG：自适应检索的决策流',
    dir: 'v',
    steps: [
      { label: '用户提问', color: '#94a3b8' },
      { label: '① 是否需要检索？（Self-RAG 判定）', color: '#2f6bff' },
      { label: '② 检索召回 Top-K（向量 + BM25 混合）', color: '#7c5cff' },
      { label: '③ 重排 + 相关性打分', color: '#f59e0b' },
      { label: '④ 资料是否足够？（不足则改写查询重检索）', color: '#ec4899' },
      { label: '⑤ 生成回答 + 自检引用', color: '#22c55e' },
    ],
    note: 'Self-RAG / FLARE 的核心：把"检索"从固定流程变成可决策、可迭代的动作，而不是每次都盲目检索。',
  },
  'agent-patterns': {
    title: 'Agent 工作流五模式（Anthropic）',
    dir: 'v',
    steps: [
      { label: '① Prompt Chaining：把任务拆成固定串行步骤', color: '#2f6bff' },
      { label: '② Routing：先分类，再分派到专用处理器', color: '#7c5cff' },
      { label: '③ Parallelization：并行子任务 / 多投票', color: '#0891b2' },
      { label: '④ Orchestrator-Workers：动态拆解 + 分派 + 汇总', color: '#f59e0b' },
      { label: '⑤ Evaluator-Optimizer：生成 → 评审 → 迭代', color: '#ec4899' },
    ],
    note: '先问"能不能用固定工作流解决"，答案是不能时再用自主 Agent。大多数生产场景用 ①~⑤ 就够，不需要开放式 Agent。',
  },
};

export function Flowchart({ name }: { name: string }) {
  const spec = FLOW_SPECS[name];
  if (!spec) return <div className="diagram-missing">未找到流程图：{name}</div>;

  const isH = spec.dir === 'h';
  const NODE_W = isH ? 108 : 340;
  const NODE_H = isH ? 52 : 40;
  const GAP = isH ? 14 : 12;
  const n = spec.steps.length;
  const W = isH ? n * (NODE_W + GAP) + 10 : NODE_W + 20;
  const H = isH ? NODE_H + 60 : n * (NODE_H + GAP) + 20;

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">{spec.title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="diagram-svg" role="img" aria-label={spec.title}>
        {spec.steps.map((s, i) => {
          const x = isH ? 5 + i * (NODE_W + GAP) : 10;
          const y = isH ? 8 : 8 + i * (NODE_H + GAP);
          const color = s.color ?? '#64748b';
          return (
            <g key={i}>
              <rect x={x} y={y} width={NODE_W} height={NODE_H} rx="7" fill={`${color}14`} stroke={color} strokeWidth="1.4" />
              <text
                x={x + NODE_W / 2}
                y={y + (s.desc && isH ? 20 : NODE_H / 2 + 4)}
                textAnchor="middle"
                className="diagram-node-label"
                fill={color}
                style={{ fontSize: isH ? 10.5 : 11.5 }}
              >
                {s.label}
              </text>
              {s.desc && isH && (
                <text x={x + NODE_W / 2} y={y + 36} textAnchor="middle" className="diagram-edge-label" style={{ fontSize: 8.5 }}>
                  {s.desc}
                </text>
              )}
              {i < n - 1 && (
                <text
                  x={isH ? x + NODE_W + GAP / 2 : x + NODE_W / 2}
                  y={isH ? y + NODE_H / 2 + 6 : y + NODE_H + GAP / 2 + 4}
                  textAnchor="middle"
                  className="diagram-edge-label"
                  fill="#94a3b8"
                  fontWeight="700"
                >
                  {isH ? '→' : '↓'}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {spec.note && <div className="diagram-caption">{spec.note}</div>}
    </figure>
  );
}

/* ══════════════════════════════════════════════
   6. 树形结构图（递归树 / 二分 / 链表）
   ══════════════════════════════════════════════ */

interface TreeNode {
  id: string;
  label: string;
  children?: string[];
  color?: string;
}

interface TreeSpec {
  title: string;
  nodes: Record<string, TreeNode>;
  root: string;
  note?: string;
}

const TREE_SPECS: Record<string, TreeSpec> = {
  'fib-recursion': {
    title: '朴素递归斐波那契：重复子问题爆炸',
    root: 'fib5',
    nodes: {
      fib5: { id: 'fib5', label: 'fib(5)', children: ['fib4', 'fib3a'], color: '#2f6bff' },
      fib4: { id: 'fib4', label: 'fib(4)', children: ['fib3b', 'fib2a'], color: '#7c5cff' },
      fib3a: { id: 'fib3a', label: 'fib(3)', children: ['fib2b', 'fib1a'], color: '#ec4899' },
      fib3b: { id: 'fib3b', label: 'fib(3)', children: ['fib2c', 'fib1b'], color: '#ec4899' },
      fib2a: { id: 'fib2a', label: 'fib(2)', color: '#f59e0b' },
      fib2b: { id: 'fib2b', label: 'fib(2)', color: '#f59e0b' },
      fib2c: { id: 'fib2c', label: 'fib(2)', color: '#f59e0b' },
      fib1a: { id: 'fib1a', label: 'fib(1)', color: '#22c55e' },
      fib1b: { id: 'fib1b', label: 'fib(1)', color: '#22c55e' },
    },
    note: 'fib(3) 出现 2 次、fib(2) 出现 3 次——大量重复计算。这就是 O(2ⁿ) 的来源。加缓存（记忆化）后每个 n 只算一次，降到 O(n)。',
  },
  'binary-search': {
    title: '二分查找：每次排除一半',
    root: 'n8',
    nodes: {
      n8: { id: 'n8', label: '8 个元素', children: ['n4a', 'n4b'], color: '#2f6bff' },
      n4a: { id: 'n4a', label: '4 个（左半）', children: ['n2a', 'n2b'], color: '#7c5cff' },
      n4b: { id: 'n4b', label: '4 个（右半）', color: '#cbd5e1' },
      n2a: { id: 'n2a', label: '2 个', children: ['n1a'], color: '#f59e0b' },
      n2b: { id: 'n2b', label: '2 个', color: '#cbd5e1' },
      n1a: { id: 'n1a', label: '找到', color: '#22c55e' },
    },
    note: '灰色节点是"被排除"的分支。8 → 4 → 2 → 1，最多 log₂8 = 3 次比较。这就是二分查找 O(log n) 的直观来源。',
  },
};

export function TreeView({ name }: { name: string }) {
  const spec = TREE_SPECS[name];
  if (!spec) return <div className="diagram-missing">未找到树形图：{name}</div>;

  // 计算层级（BFS）与每个节点的位置
  const levels: string[][] = [];
  const queue: { id: string; depth: number }[] = [{ id: spec.root, depth: 0 }];
  const depthOf = new Map<string, number>();
  while (queue.length) {
    const { id, depth } = queue.shift()!;
    if (depthOf.has(id)) continue;
    depthOf.set(id, depth);
    if (!levels[depth]) levels[depth] = [];
    levels[depth].push(id);
    for (const c of spec.nodes[id]?.children ?? []) queue.push({ id: c, depth: depth + 1 });
  }

  const NODE_W = 92;
  const NODE_H = 30;
  const V_GAP = 54;
  const maxPerLevel = Math.max(...levels.map((l) => l.length));
  const W = Math.max(maxPerLevel * (NODE_W + 24) + 20, 320);
  const H = levels.length * V_GAP + 20;

  const pos = new Map<string, { x: number; y: number }>();
  levels.forEach((ids, d) => {
    const total = ids.length;
    const slotW = W / total;
    ids.forEach((id, i) => {
      pos.set(id, { x: slotW * i + slotW / 2, y: 20 + d * V_GAP });
    });
  });

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">{spec.title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="diagram-svg" role="img" aria-label={spec.title}>
        {/* 连线 */}
        {Object.values(spec.nodes).map((node) =>
          (node.children ?? []).map((cid) => {
            const a = pos.get(node.id);
            const b = pos.get(cid);
            if (!a || !b) return null;
            return (
              <line
                key={`${node.id}-${cid}`}
                x1={a.x}
                y1={a.y + NODE_H / 2}
                x2={b.x}
                y2={b.y - NODE_H / 2}
                stroke="#cbd5e1"
                strokeWidth="1.4"
              />
            );
          }),
        )}
        {/* 节点 */}
        {Object.values(spec.nodes).map((node) => {
          const p = pos.get(node.id);
          if (!p) return null;
          const color = node.color ?? '#64748b';
          return (
            <g key={node.id}>
              <rect
                x={p.x - NODE_W / 2}
                y={p.y - NODE_H / 2}
                width={NODE_W}
                height={NODE_H}
                rx="6"
                fill={`${color}18`}
                stroke={color}
                strokeWidth="1.4"
              />
              <text x={p.x} y={p.y + 4} textAnchor="middle" className="diagram-node-label" fill={color} style={{ fontSize: 10.5 }}>
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
      {spec.note && <div className="diagram-caption">{spec.note}</div>}
    </figure>
  );
}

/** 数据类图示的注册表（供校验使用） */
export const DATA_DIAGRAMS = {
  join: Object.keys(JOIN_SPECS),
  index: Object.keys(INDEX_SPECS),
  flow: Object.keys(FLOW_SPECS),
  tree: Object.keys(TREE_SPECS),
  lr: Object.keys(LR_PRESETS),
};