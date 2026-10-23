/**
 * 数据挖掘专用图示组件（SVG + CSS 动画，零依赖）
 *
 * 用法（在 Lesson content 中单独占一行）：
 *   <AprioriLattice />
 *   <KMeansStep name="k3" />
 *   <PageRankFlow />
 *   <MatrixHeat name="user-item" />
 *   <PcaProjection />
 *   <RecommenderViz />
 *   <AnomalyScatter />
 */

import { useEffect, useMemo, useState } from 'react';
import './diagrams.css';

/* ══════════════════════════════════════════════
   1. Apriori 逐层搜索动画
   ══════════════════════════════════════════════ */

const APRIORI_LEVELS = [
  { level: 1, items: ['{面包}', '{牛奶}', '{啤酒}', '{尿布}', '{可乐}'], minSupport: 3, kept: 5, note: '候选 1-项集：统计单项频次，全部 ≥ 最小支持度 3' },
  { level: 2, items: ['{面包,牛奶}', '{面包,啤酒}', '{牛奶,啤酒}', '{啤酒,尿布}', '{面包,可乐}'], minSupport: 3, kept: 2, note: '候选 2-项集：只保留 {面包,牛奶} 与 {啤酒,尿布}（出现 3 次）' },
  { level: 3, items: ['{面包,牛奶,啤酒}'], minSupport: 3, kept: 0, note: '候选 3-项集：任何子集必须也频繁，此候选只有 1 次 → 剪枝终止' },
];

export function AprioriLattice() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return undefined;
    const t = setInterval(() => setStep((s) => (s + 1) % APRIORI_LEVELS.length), 2600);
    return () => clearInterval(t);
  }, [playing]);

  const cur = APRIORI_LEVELS[step];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">Apriori 逐层搜索：候选集 → 计数 → 剪枝</figcaption>
      <div className="apriori-controls">
        {APRIORI_LEVELS.map((l, i) => (
          <button
            key={l.level}
            type="button"
            className={`apriori-step-btn ${i === step ? 'active' : ''}`}
            onClick={() => {
              setStep(i);
              setPlaying(false);
            }}
          >
            第 {l.level} 层
          </button>
        ))}
        <button type="button" className="apriori-play-btn" onClick={() => setPlaying((p) => !p)}>
          {playing ? '⏸ 暂停' : '▶ 播放'}
        </button>
      </div>

      <div className="apriori-stage">
        {cur.items.map((item, i) => {
          const isKept = i < cur.kept;
          return (
            <div
              key={item}
              className={`apriori-chip ${isKept ? 'kept' : 'pruned'} ${i === cur.kept ? 'boundary' : ''}`}
              style={{ animationDelay: `${i * 120}ms` }}
            >
              {item}
            </div>
          );
        })}
      </div>

      <div className="apriori-progress">
        {APRIORI_LEVELS.map((l, i) => (
          <div key={l.level} className={`apriori-bar ${i <= step ? 'on' : ''}`} />
        ))}
      </div>

      <div className="diagram-caption">{cur.note}</div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   2. K-Means 迭代动画
   ══════════════════════════════════════════════ */

type Pt = { x: number; y: number; c: number };

const KM_POINTS: Pt[] = [
  { x: 28, y: 30, c: 0 }, { x: 38, y: 22, c: 0 }, { x: 22, y: 44, c: 0 },
  { x: 45, y: 40, c: 0 }, { x: 32, y: 52, c: 0 },
  { x: 72, y: 28, c: 1 }, { x: 82, y: 38, c: 1 }, { x: 68, y: 44, c: 1 },
  { x: 88, y: 26, c: 1 }, { x: 78, y: 52, c: 1 },
  { x: 50, y: 78, c: 2 }, { x: 62, y: 72, c: 2 }, { x: 42, y: 86, c: 2 },
  { x: 70, y: 84, c: 2 }, { x: 55, y: 92, c: 2 },
];

const KM_CENTROIDS = [
  { x: 33, y: 33.6 }, { x: 77.6, y: 37.6 }, { x: 55.8, y: 82.4 },
];

const KM_COLORS = ['#2f6bff', '#22c55e', '#f59e0b'];

export function KMeansStep() {
  const [iter, setIter] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIter((i) => (i + 1) % 4), 2200);
    return () => clearInterval(t);
  }, []);

  // 迭代 0-1：显示初始随机质心；2+：显示收敛后的质心
  const showCentroids = iter >= 1;
  const shuffle = iter === 0;

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">K-Means 迭代：分配样本 → 更新质心 → 直到收敛</figcaption>
      <svg viewBox="0 0 110 110" className="diagram-svg km-svg" role="img" aria-label="K-Means 迭代过程">
        {/* 网格 */}
        {[20, 40, 60, 80, 100].map((g) => (
          <g key={g}>
            <line x1={g} y1="5" x2={g} y2="105" stroke="#eef2f7" strokeWidth="0.5" />
            <line x1="5" y1={g} x2="105" y2={g} stroke="#eef2f7" strokeWidth="0.5" />
          </g>
        ))}

        {/* 样本点 */}
        {KM_POINTS.map((p, i) => {
          const color = showCentroids ? KM_COLORS[p.c] : '#94a3b8';
          return (
            <circle
              key={i}
              cx={shuffle ? p.x + (i % 3) - 1 : p.x}
              cy={p.y}
              r="3.2"
              fill={color}
              opacity={showCentroids ? 0.85 : 0.5}
              style={{ transition: 'all 0.9s ease' }}
            />
          );
        })}

        {/* 质心 */}
        {showCentroids &&
          KM_CENTROIDS.map((c, i) => (
            <g key={i} style={{ transition: 'all 0.9s ease' }}>
              <circle cx={c.x} cy={c.y} r="5" fill="none" stroke={KM_COLORS[i]} strokeWidth="1.8" />
              <circle cx={c.x} cy={c.y} r="1.8" fill={KM_COLORS[i]} />
              <text x={c.x} y={c.y + 9} textAnchor="middle" className="diagram-edge-label" fill={KM_COLORS[i]}>
                μ{i + 1}
              </text>
            </g>
          ))}
      </svg>
      <div className="diagram-caption">
        {iter === 0 && '① 随机初始化 3 个质心（灰色表示尚未分配颜色）'}
        {iter === 1 && '② 把每个点分配给最近的质心，得到三个簇'}
        {iter === 2 && '③ 重新计算每个簇的均值作为新质心'}
        {iter === 3 && '④ 质心不再移动 → 收敛。注意 K-Means 只能找到局部最优'}
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   3. PageRank 传播动画
   ══════════════════════════════════════════════ */

const PR_NODES = [
  { id: 'A', x: 55, y: 20, rank: 0.37 },
  { id: 'B', x: 90, y: 55, rank: 0.32 },
  { id: 'C', x: 70, y: 90, rank: 0.20 },
  { id: 'D', x: 25, y: 70, rank: 0.11 },
];

const PR_EDGES = [
  ['A', 'B'], ['A', 'C'], ['B', 'C'], ['C', 'A'], ['D', 'C'], ['D', 'A'],
];

export function PageRankFlow() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setPhase((p) => (p + 1) % 3), 2000);
    return () => clearInterval(t);
  }, []);

  const posOf = (id: string) => PR_NODES.find((n) => n.id === id)!;
  const maxRank = Math.max(...PR_NODES.map((n) => n.rank));

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">PageRank：随机游走者的权重传播</figcaption>
      <svg viewBox="0 0 120 110" className="diagram-svg" role="img" aria-label="PageRank 权重传播">
        <defs>
          <marker id="pr-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
          </marker>
        </defs>

        {/* 边 */}
        {PR_EDGES.map(([from, to], i) => {
          const a = posOf(from);
          const b = posOf(to);
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy);
          const r = 9;
          return (
            <line
              key={`${from}-${to}`}
              x1={a.x + (dx / len) * r}
              y1={a.y + (dy / len) * r}
              x2={b.x - (dx / len) * r}
              y2={b.y - (dy / len) * r}
              stroke={phase > 0 ? '#2f6bff' : '#cbd5e1'}
              strokeWidth={phase > 1 ? 2 : 1.2}
              markerEnd="url(#pr-arrow)"
              opacity={0.75}
              style={{ transition: 'all 0.8s ease', animationDelay: `${i * 80}ms` }}
            />
          );
        })}

        {/* 节点：半径随 rank 变化 */}
        {PR_NODES.map((n) => {
          const r = 5 + (n.rank / maxRank) * 5;
          return (
            <g key={n.id}>
              <circle
                cx={n.x}
                cy={n.y}
                r={r}
                fill="rgba(47,107,255,0.15)"
                stroke="#2f6bff"
                strokeWidth="1.8"
                style={{ transition: 'all 0.9s ease' }}
              />
              <text x={n.x} y={n.y + 3.5} textAnchor="middle" className="diagram-node-label" fill="#1d4ed8" style={{ fontSize: 9 }}>
                {n.id}
              </text>
              <text x={n.x} y={n.y + r + 8} textAnchor="middle" className="diagram-edge-label" fill="#64748b">
                {n.rank.toFixed(2)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="diagram-caption">
        {phase === 0 && '① 初始：所有节点 rank 相同，均匀分配'}
        {phase === 1 && '② 一个节点的 rank 平均分给它指向的节点'}
        {phase === 2 && '③ 反复迭代直到收敛。C 只被指向、指针少 → rank 最高（被重要节点推荐更重要）'}
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   4. 用户-物品矩阵热力图
   ══════════════════════════════════════════════ */

const MATRIX_DATA = [
  [5, 4, 0, 0, 1],
  [4, 5, 0, 1, 0],
  [0, 0, 5, 4, 0],
  [0, 1, 4, 5, 0],
  [1, 0, 0, 0, 5],
];
const MATRIX_USERS = ['用户1', '用户2', '用户3', '用户4', '用户5'];
const MATRIX_ITEMS = ['物品A', '物品B', '物品C', '物品D', '物品E'];

export function MatrixHeat() {
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">用户-物品评分矩阵：稀疏性（空白=未评分）</figcaption>
      <svg viewBox="0 0 150 130" className="diagram-svg" role="img" aria-label="用户物品评分矩阵">
        {MATRIX_ITEMS.map((it, j) => (
          <text key={it} x={22 + j * 24 + 12} y={12} textAnchor="middle" className="diagram-edge-label" style={{ fontSize: 8.5 }}>
            {it}
          </text>
        ))}
        {MATRIX_DATA.map((row, i) => (
          <g key={i}>
            <text x={18} y={22 + i * 21 + 13} textAnchor="end" className="diagram-edge-label" style={{ fontSize: 8.5 }}>
              {MATRIX_USERS[i]}
            </text>
            {row.map((v, j) => {
              const isHover = hover?.r === i && hover?.c === j;
              const intensity = v === 0 ? 0 : (v / 5) * 0.75;
              return (
                <g
                  key={j}
                  onMouseEnter={() => setHover({ r: i, c: j })}
                  onMouseLeave={() => setHover(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x={22 + j * 24}
                    y={22 + i * 21}
                    width={22}
                    height={19}
                    rx="3"
                    fill={v === 0 ? '#f8fafc' : `rgba(47,107,255,${intensity})`}
                    stroke={isHover ? '#1d4ed8' : '#e2e8f0'}
                    strokeWidth={isHover ? 1.6 : 0.8}
                  />
                  {v > 0 && (
                    <text
                      x={22 + j * 24 + 11}
                      y={22 + i * 21 + 13}
                      textAnchor="middle"
                      className="heatmap-value"
                      fill={intensity > 0.4 ? '#fff' : '#1d4ed8'}
                      style={{ fontSize: 9 }}
                    >
                      {v}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        ))}
      </svg>
      <div className="diagram-caption">
        {hover
          ? `${MATRIX_USERS[hover.r]} 对 ${MATRIX_ITEMS[hover.c]} 的评分：${
              MATRIX_DATA[hover.r][hover.c] === 0 ? '未评分（需要预测）' : `${MATRIX_DATA[hover.r][hover.c]} 分`
            }`
          : '空白格是未评分项——推荐系统的任务就是预测它们。用户1/2 口味相近，用户3/4 口味相近，这就是协同过滤的依据。'}
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   5. PCA 投影示意
   ══════════════════════════════════════════════ */

export function PcaProjection() {
  const points = useMemo(
    () => [
      { x: 30, y: 60 }, { x: 38, y: 55 }, { x: 45, y: 50 }, { x: 52, y: 44 },
      { x: 60, y: 40 }, { x: 68, y: 34 }, { x: 75, y: 28 }, { x: 50, y: 58 },
      { x: 58, y: 48 }, { x: 65, y: 42 },
    ],
    [],
  );

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">PCA：把数据投影到方差最大的方向</figcaption>
      <svg viewBox="0 0 110 90" className="diagram-svg" role="img" aria-label="PCA 投影">
        {/* 主成分方向 */}
        <line x1="20" y1="72" x2="90" y2="20" stroke="#ef4444" strokeWidth="1.6" strokeDasharray="3 2" />
        <text x="88" y="16" textAnchor="end" className="diagram-edge-label" fill="#ef4444">
          PC1（方差最大）
        </text>
        {/* 次成分 */}
        <line x1="45" y1="20" x2="72" y2="70" stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="2 2" />
        <text x="74" y="74" className="diagram-edge-label" fill="#94a3b8">
          PC2
        </text>
        {/* 数据点与投影 */}
        {points.map((p, i) => {
          // 投影到 PC1（方向向量 (70,-52) 归一化）
          const dx = 70;
          const dy = -52;
          const len2 = dx * dx + dy * dy;
          const t = ((p.x - 20) * dx + (p.y - 72) * dy) / len2;
          const px = 20 + t * dx;
          const py = 72 + t * dy;
          return (
            <g key={i}>
              <line x1={p.x} y1={p.y} x2={px} y2={py} stroke="#cbd5e1" strokeWidth="0.6" strokeDasharray="1.5 1.5" />
              <circle cx={p.x} cy={p.y} r="2.4" fill="#2f6bff" opacity="0.8" />
              <circle cx={px} cy={py} r="1.6" fill="#ef4444" opacity="0.7" />
            </g>
          );
        })}
      </svg>
      <div className="diagram-caption">
        蓝点是原始二维数据，红点是投影到 PC1 后的一维坐标。PCA 找的是让投影后方差最大（信息损失最小）的方向——
        这就是「降维但保留主要信息」的几何含义。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   6. 异常检测散点
   ══════════════════════════════════════════════ */

export function AnomalyScatter() {
  const normal = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    let seed = 7;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let i = 0; i < 45; i += 1) {
      pts.push({ x: 35 + (rnd() - 0.5) * 40, y: 55 + (rnd() - 0.5) * 40 });
    }
    return pts;
  }, []);

  const anomalies = [
    { x: 85, y: 20 }, { x: 15, y: 25 }, { x: 90, y: 78 },
  ];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">异常检测：远离主群体的点</figcaption>
      <svg viewBox="0 0 110 90" className="diagram-svg" role="img" aria-label="异常检测散点图">
        {/* 正常点的密度椭圆 */}
        <ellipse cx="38" cy="55" rx="26" ry="24" fill="rgba(47,107,255,0.06)" stroke="#2f6bff" strokeWidth="1" strokeDasharray="2 2" />
        <text x="38" y="82" textAnchor="middle" className="diagram-edge-label" fill="#2f6bff">
          正常样本聚集区
        </text>

        {normal.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.9" fill="#2f6bff" opacity="0.55" />
        ))}

        {anomalies.map((p, i) => (
          <g key={`a${i}`}>
            <circle cx={p.x} cy={p.y} r="7" fill="none" stroke="#ef4444" strokeWidth="0.8" opacity="0.5" />
            <circle cx={p.x} cy={p.y} r="2.8" fill="#ef4444">
              <animate attributeName="r" values="2.8;3.6;2.8" dur="1.8s" repeatCount="indefinite" />
            </circle>
          </g>
        ))}
      </svg>
      <div className="diagram-caption">
        红点是异常样本。检测思路：建模正常样本的分布（密度、距离、重构误差），
        偏离太远的判为异常。注意异常的定义依赖业务——有些"异常"其实是值得关注的机会。
      </div>
    </figure>
  );
}

/** 数据挖掘图示的注册表（供内容校验使用） */
export const MINING_DIAGRAMS = {
  apriori: ['default'],
  kmeans: ['default'],
  pagerank: ['default'],
  matrix: ['default'],
  pca: ['default'],
  anomaly: ['default'],
};
