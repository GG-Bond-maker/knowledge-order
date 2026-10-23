/**
 * 数据挖掘课程补充图示组件（SVG + CSS，零依赖）
 */

import { useState, useMemo } from 'react';
import './diagrams.css';

/* ══════════════════════════════════════════════
   1. 缺失值填补策略
   ══════════════════════════════════════════════ */

const MV_ROWS = [
  { id: 1, age: 25, income: 8000, city: '北京' },
  { id: 2, age: null, income: 12000, city: '上海' },
  { id: 3, age: 35, income: null, city: '广州' },
  { id: 4, age: null, income: null, city: '深圳' },
  { id: 5, age: 42, income: 15000, city: '北京' },
  { id: 6, age: 31, income: 9000, city: null },
];

const MV_STRATEGIES = [
  { name: '删除行', color: '#ef4444', desc: 'complete case —— 只保留完整行' },
  { name: '均值填充', color: '#2f6bff', desc: '用该列均值填补数值缺失' },
  { name: '中位数填充', color: '#f59e0b', desc: '对偏态分布更稳健' },
  { name: '众数填充', color: '#22c55e', desc: '类别变量用众数' },
  { name: '标记+填充', color: '#7c5cff', desc: '填充同时增加"是否缺失"标记列' },
];

export function ImputeStrategyDemo() {
  const [sel, setSel] = useState(1);
  const cur = MV_STRATEGIES[sel];

  const stats = useMemo(() => {
    const ages = MV_ROWS.map((r) => r.age).filter((v): v is number => v !== null);
    const incomes = MV_ROWS.map((r) => r.income).filter((v): v is number => v !== null);
    const cities = MV_ROWS.map((r) => r.city).filter((v): v is string => v !== null);
    const meanAge = ages.reduce((a, b) => a + b, 0) / ages.length;
    const meanInc = incomes.reduce((a, b) => a + b, 0) / incomes.length;
    const sortedAge = [...ages].sort((a, b) => a - b);
    const medianAge = sortedAge[Math.floor(sortedAge.length / 2)];
    const cityCount: Record<string, number> = {};
    for (const c of cities) cityCount[c] = (cityCount[c] ?? 0) + 1;
    const modeCity = Object.entries(cityCount).sort((a, b) => b[1] - a[1])[0][0];
    return { meanAge, meanInc, medianAge, modeCity };
  }, []);

  const filled = useMemo(() => {
    if (sel === 0) return MV_ROWS.filter((r) => r.age !== null && r.income !== null && r.city !== null);
    return MV_ROWS.map((r) => {
      const missing = r.age === null || r.income === null || r.city === null;
      let age = r.age, income = r.income, city = r.city;
      if (sel === 1) {
        age = age ?? Math.round(stats.meanAge);
        income = income ?? Math.round(stats.meanInc);
        city = city ?? stats.modeCity;
      } else if (sel === 2) {
        age = age ?? stats.medianAge;
        income = income ?? Math.round(stats.meanInc);
        city = city ?? stats.modeCity;
      } else if (sel === 3 || sel === 4) {
        age = age ?? Math.round(stats.meanAge);
        income = income ?? Math.round(stats.meanInc);
        city = city ?? stats.modeCity;
      }
      return { ...r, age, income, city, wasMissing: missing };
    });
  }, [sel, stats]);

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">缺失值填补：五种策略的取舍</figcaption>

      <div className="im-tabs">
        {MV_STRATEGIES.map((s, i) => (
          <button
            key={s.name}
            type="button"
            className={`im-tab ${i === sel ? 'active' : ''}`}
            style={{ '--im-color': s.color } as React.CSSProperties}
            onClick={() => setSel(i)}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="im-table">
        <div className="im-head">
          <span>id</span><span>age</span><span>income</span><span>city</span>
          {sel === 4 && <span>age_miss</span>}
        </div>
        {filled.map((r, i) => {
          const orig = MV_ROWS.find((x) => x.id === r.id)!;
          const ageM = orig.age === null;
          const incM = orig.income === null;
          const cityM = orig.city === null;
          return (
            <div key={r.id} className="im-row">
              <span>{r.id}</span>
              <span style={{ color: ageM ? cur.color : 'var(--text-2)', fontWeight: ageM ? 700 : 400 }}>
                {r.age}{ageM && sel !== 0 ? ' *' : ''}
              </span>
              <span style={{ color: incM ? cur.color : 'var(--text-2)', fontWeight: incM ? 700 : 400 }}>
                {r.income}{incM && sel !== 0 ? ' *' : ''}
              </span>
              <span style={{ color: cityM ? cur.color : 'var(--text-2)', fontWeight: cityM ? 700 : 400 }}>
                {r.city}{cityM && sel !== 0 ? ' *' : ''}
              </span>
              {sel === 4 && (
                <span style={{ color: ageM ? '#7c5cff' : 'var(--text-3)' }}>
                  {ageM ? 1 : 0}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="im-stats">
        <span>剩余行数：<b style={{ color: cur.color }}>{filled.length}/{MV_ROWS.length}</b></span>
        <span>数据损失：<b style={{ color: filled.length < 6 ? '#ef4444' : '#22c55e' }}>
          {((1 - filled.length / 6) * 100).toFixed(0)}%
        </b></span>
      </div>

      <div className="im-note" style={{ borderColor: cur.color }}>
        <b style={{ color: cur.color }}>{cur.name}</b>：{cur.desc}
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          {sel === 0 && '最简单，但丢弃 33% 的数据——如果缺失非随机，会引入偏差'}
          {sel === 1 && '保留所有行，但会压缩方差、削弱相关性'}
          {sel === 2 && '对偏态/离群值更稳健（age 有离群值时中位数更好）'}
          {sel === 3 && '类别变量不能用均值，必须用众数或单独一类'}
          {sel === 4 && '★ 推荐：填充 + 标记，让模型知道"这里原本是缺失的"'}
        </span>
      </div>

      <div className="diagram-caption">
        <b>关键问题</b>：缺失是随机的（MCAR/MAR）还是系统性的（MNAR）？
        系统性缺失不能简单填充，要分析缺失原因。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   2. 归一化对比
   ══════════════════════════════════════════════ */

const NORM_DATA = [10, 20, 30, 40, 50, 1000];

const NORM_METHODS = [
  { name: 'Min-Max', color: '#2f6bff', fn: (x: number, d: number[]) => (x - Math.min(...d)) / (Math.max(...d) - Math.min(...d)) },
  { name: 'Z-Score', color: '#22c55e', fn: (x: number, d: number[]) => {
    const m = d.reduce((a, b) => a + b, 0) / d.length;
    const s = Math.sqrt(d.reduce((a, b) => a + (b - m) ** 2, 0) / d.length);
    return (x - m) / s;
  }},
  { name: 'Robust', color: '#f59e0b', fn: (x: number, d: number[]) => {
    const sorted = [...d].sort((a, b) => a - b);
    const med = sorted[Math.floor(sorted.length / 2)];
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    return (x - med) / (q3 - q1 || 1);
  }},
  { name: 'Log', color: '#7c5cff', fn: (x: number) => Math.log1p(x) },
];

export function NormalizationDemo() {
  const [sel, setSel] = useState(1);
  const cur = NORM_METHODS[sel];

  const transformed = NORM_DATA.map((x) => cur.fn(x, NORM_DATA));
  const maxAbs = Math.max(...transformed.map(Math.abs));

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">归一化：让不同量纲的特征可比</figcaption>

      <div className="nm-tabs">
        {NORM_METHODS.map((m, i) => (
          <button
            key={m.name}
            type="button"
            className={`nm-tab ${i === sel ? 'active' : ''}`}
            style={{ '--nm-color': m.color } as React.CSSProperties}
            onClick={() => setSel(i)}
          >
            {m.name}
          </button>
        ))}
      </div>

      <div className="nm-compare">
        <div className="nm-side">
          <div className="nm-side-title">原始数据</div>
          {NORM_DATA.map((v, i) => (
            <div key={i} className="nm-bar-row">
              <span className="nm-idx">{i + 1}</span>
              <div className="nm-track">
                <div style={{ width: `${(v / 1000) * 100}%`, background: '#94a3b8' }} />
              </div>
              <span className="nm-val">{v}</span>
            </div>
          ))}
        </div>

        <div className="nm-arrow">→</div>

        <div className="nm-side">
          <div className="nm-side-title" style={{ color: cur.color }}>{cur.name}</div>
          {transformed.map((v, i) => (
            <div key={i} className="nm-bar-row">
              <span className="nm-idx">{i + 1}</span>
              <div className="nm-track">
                <div
                  style={{
                    width: `${(Math.abs(v) / maxAbs) * 100}%`,
                    background: v < 0 ? '#ef4444' : cur.color,
                  }}
                />
              </div>
              <span className="nm-val">{v.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="nm-note" style={{ borderColor: cur.color }}>
        <b style={{ color: cur.color }}>{cur.name}</b>：
        {sel === 0 && '把数据压到 [0,1]。缺点：受离群值影响极大（1000 把其他值压扁）'}
        {sel === 1 && '均值 0、标准差 1。缺点：同样受离群值影响'}
        {sel === 2 && '用中位数和四分位距，对离群值稳健。缺点：不保证固定范围'}
        {sel === 3 && '取对数压缩长尾。适合收入、价格等右偏数据'}
      </div>

      <div className="nm-table">
        <div className="nm-thead"><span>方法</span><span>输出范围</span><span>抗离群</span><span>适用</span></div>
        <div className="nm-trow"><span style={{ color: '#2f6bff' }}>Min-Max</span><span>[0,1]</span><span style={{ color: '#ef4444' }}>差</span><span>神经网络</span></div>
        <div className="nm-trow"><span style={{ color: '#22c55e' }}>Z-Score</span><span>约 [-3,3]</span><span style={{ color: '#ef4444' }}>差</span><span>线性模型、SVM</span></div>
        <div className="nm-trow"><span style={{ color: '#f59e0b' }}>Robust</span><span>不定</span><span style={{ color: '#22c55e' }}>好</span><span>有离群值</span></div>
        <div className="nm-trow"><span style={{ color: '#7c5cff' }}>Log</span><span>压缩长尾</span><span style={{ color: '#22c55e' }}>好</span><span>右偏分布</span></div>
      </div>

      <div className="diagram-caption">
        <b>重要</b>：归一化参数（min/max/mean/std）必须<b>只在训练集上拟合</b>，
        再应用到测试集——否则就是数据泄漏。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   3. FP-Tree 结构
   ══════════════════════════════════════════════ */

const FP_TRANSACTIONS = [
  ['牛奶', '面包', '尿布'],
  ['可乐', '面包', '尿布', '啤酒'],
  ['牛奶', '尿布', '啤酒', '鸡蛋'],
  ['面包', '牛奶', '尿布', '啤酒'],
  ['面包', '牛奶', '尿布', '可乐'],
];

export function FPTreeDemo() {
  const [step, setStep] = useState(0);

  // 简化：统计频繁项（min_sup=3）
  const freq = useMemo(() => {
    const cnt: Record<string, number> = {};
    for (const t of FP_TRANSACTIONS) for (const i of t) cnt[i] = (cnt[i] ?? 0) + 1;
    return Object.entries(cnt)
      .filter(([, c]) => c >= 3)
      .sort((a, b) => b[1] - a[1]);
  }, []);

  const steps = [
    { name: '① 扫描事务', desc: '统计每个商品的出现次数' },
    { name: '② 筛选频繁项', desc: '保留出现 ≥3 次的项，按次数降序排列' },
    { name: '③ 排序事务', desc: '每条事务按频繁项顺序重排，丢弃非频繁项' },
    { name: '④ 构建 FP-Tree', desc: '相同前缀共享路径，压缩存储' },
    { name: '⑤ 挖掘条件模式基', desc: '从叶节点向上找路径，递归挖掘' },
  ];

  const sortedTx = FP_TRANSACTIONS.map((t) => {
    const order = freq.map(([k]) => k);
    return order.filter((k) => t.includes(k));
  });

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">FP-Growth：不产生候选集的高效挖掘</figcaption>

      <div className="fp-steps">
        {steps.map((s, i) => (
          <button
            key={i}
            type="button"
            className={`fp-step ${i === step ? 'active' : ''}`}
            onClick={() => setStep(i)}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="fp-detail">
        <b>{steps[step].name}</b>：{steps[step].desc}
      </div>

      {step === 0 && (
        <div className="fp-tx-list">
          {FP_TRANSACTIONS.map((t, i) => (
            <div key={i} className="fp-tx">
              <span className="fp-tx-id">T{i + 1}</span>
              {t.map((item) => <span key={item} className="fp-item">{item}</span>)}
            </div>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="fp-freq">
          {freq.map(([item, cnt]) => (
            <div key={item} className="fp-freq-row">
              <span className="fp-freq-item">{item}</span>
              <div className="fp-freq-track">
                <div style={{ width: `${(cnt / 5) * 100}%`, background: '#2f6bff' }} />
              </div>
              <span className="fp-freq-cnt">{cnt}</span>
            </div>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="fp-tx-list">
          {sortedTx.map((t, i) => (
            <div key={i} className="fp-tx">
              <span className="fp-tx-id">T{i + 1}</span>
              {t.map((item) => <span key={item} className="fp-item sorted">{item}</span>)}
              {t.length === 0 && <span className="fp-empty">（无频繁项）</span>}
            </div>
          ))}
        </div>
      )}

      {step >= 3 && (
        <div className="fp-tree">
          <div className="fp-tree-root">null</div>
          <div className="fp-tree-level">
            {freq.slice(0, 3).map(([item, cnt]) => (
              <div key={item} className="fp-tree-node">
                <div className="fp-node-val">{item}</div>
                <div className="fp-node-cnt">:{cnt}</div>
                <div className="fp-tree-children">
                  {freq.slice(0, 2).map(([c2, c2n]) => (
                    <div key={c2} className="fp-tree-node child">
                      <div className="fp-node-val">{c2}</div>
                      <div className="fp-node-cnt">:{Math.min(c2n, cnt)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="fp-note">
        <b>FP-Growth 的核心优势</b>：只扫描数据库 2 次，不产生候选集。
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          Apriori 每轮都要扫描数据库 + 生成候选集，在稠密数据上会爆炸
        </span>
      </div>

      <div className="diagram-caption">
        <b>对比</b>：Apriori 是"广度优先 + 剪枝"，FP-Growth 是"压缩树 + 分治"。
        后者通常快一个数量级。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   4. DBSCAN 密度聚类
   ══════════════════════════════════════════════ */

const DBSCAN_POINTS = [
  { x: 30, y: 40, type: 'core' },
  { x: 45, y: 55, type: 'core' },
  { x: 25, y: 60, type: 'core' },
  { x: 55, y: 35, type: 'core' },
  { x: 70, y: 50, type: 'core' },
  { x: 85, y: 65, type: 'core' },
  { x: 90, y: 40, type: 'core' },
  { x: 60, y: 75, type: 'border' },
  { x: 120, y: 30, type: 'noise' },
  { x: 140, y: 80, type: 'noise' },
];

export function DBSCANDemo() {
  const [eps, setEps] = useState(22);
  const [minPts, setMinPts] = useState(3);

  // 简化：计算每个点的邻居数
  const points = useMemo(() => {
    return DBSCAN_POINTS.map((p) => {
      const neighbors = DBSCAN_POINTS.filter(
        (q) => Math.sqrt((p.x - q.x) ** 2 + (p.y - q.y) ** 2) <= eps
      ).length;
      let type: string;
      if (neighbors >= minPts) type = 'core';
      else if (neighbors > 1) type = 'border';
      else type = 'noise';
      return { ...p, neighbors, type };
    });
  }, [eps, minPts]);

  const coreCount = points.filter((p) => p.type === 'core').length;
  const borderCount = points.filter((p) => p.type === 'border').length;
  const noiseCount = points.filter((p) => p.type === 'noise').length;

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">DBSCAN：按密度聚类，自动识别噪声</figcaption>

      <div className="la-controls">
        <label>
          邻域半径 eps
          <input type="range" min="10" max="50" step="2" value={eps}
            onChange={(e) => setEps(parseInt(e.target.value, 10))} />
          <b>{eps}</b>
        </label>
        <label>
          最小点数 minPts
          <input type="range" min="2" max="6" step="1" value={minPts}
            onChange={(e) => setMinPts(parseInt(e.target.value, 10))} />
          <b>{minPts}</b>
        </label>
      </div>

      <svg viewBox="0 0 170 100" className="db-svg" role="img" aria-label="DBSCAN">
        {points.map((p, i) => {
          if (p.type !== 'core') return null;
          return <circle key={`c${i}`} cx={p.x} cy={p.y} r={eps / 2} fill="#2f6bff" opacity="0.08" />;
        })}
        {points.map((p, i) => {
          const color = p.type === 'core' ? '#2f6bff' : p.type === 'border' ? '#f59e0b' : '#ef4444';
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={p.type === 'noise' ? 3 : 4} fill={color} />
              {p.type === 'noise' && (
                <text x={p.x} y={p.y - 7} textAnchor="middle" fontSize="6" fill="#ef4444">噪声</text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="db-legend">
        <span><span className="db-dot" style={{ background: '#2f6bff' }} /> 核心点（{coreCount}）</span>
        <span><span className="db-dot" style={{ background: '#f59e0b' }} /> 边界点（{borderCount}）</span>
        <span><span className="db-dot" style={{ background: '#ef4444' }} /> 噪声点（{noiseCount}）</span>
      </div>

      <div className="db-note">
        <b>三类点</b>：
        <br />
        · <b style={{ color: '#2f6bff' }}>核心点</b>：邻域内点数 ≥ minPts
        <br />
        · <b style={{ color: '#f59e0b' }}>边界点</b>：在核心点邻域内，但自己不是核心点
        <br />
        · <b style={{ color: '#ef4444' }}>噪声点</b>：既不是核心也不是边界
      </div>

      <div className="db-compare">
        <div className="db-row"><span className="db-k">K-Means</span><span className="db-v">需要指定 K，假设球形簇，对噪声敏感</span></div>
        <div className="db-row"><span className="db-k">DBSCAN</span><span className="db-v">自动发现簇数，任意形状，能识别噪声</span></div>
        <div className="db-row"><span className="db-k">难点</span><span className="db-v">eps 和 minPts 难调；密度差异大时效果差</span></div>
      </div>

      <div className="diagram-caption">
        <b>调参经验</b>：eps 用 k-距离图的拐点；minPts 一般取维度数 + 1 或 2×维度。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   5. 协同过滤
   ══════════════════════════════════════════════ */

const CF_USERS = ['用户A', '用户B', '用户C', '用户D'];
const CF_ITEMS = ['物品1', '物品2', '物品3', '物品4', '物品5'];
const CF_MATRIX = [
  [5, 4, null, 1, 2],
  [4, 5, 2, null, 1],
  [1, 1, 5, 4, null],
  [null, 2, 4, 5, 4],
];

export function CollaborativeFilteringDemo() {
  const [mode, setMode] = useState<'user' | 'item'>('user');
  const [selIdx, setSelIdx] = useState(0);

  const selName = mode === 'user' ? CF_USERS[selIdx] : CF_ITEMS[selIdx];

  // 计算相似度（余弦，只算共同评分）
  const similarities = useMemo(() => {
    if (mode === 'user') {
      const target = CF_MATRIX[selIdx];
      return CF_MATRIX.map((row, i) => {
        let dot = 0, n1 = 0, n2 = 0;
        for (let j = 0; j < CF_ITEMS.length; j++) {
          if (target[j] !== null && row[j] !== null) {
            dot += target[j]! * row[j]!;
            n1 += target[j]! ** 2;
            n2 += row[j]! ** 2;
          }
        }
        const sim = n1 && n2 ? dot / Math.sqrt(n1 * n2) : 0;
        return { name: CF_USERS[i], sim, idx: i };
      });
    }
    // item-based
    const targetCol = CF_MATRIX.map((r) => r[selIdx]);
    return CF_ITEMS.map((name, j) => {
      const col = CF_MATRIX.map((r) => r[j]);
      let dot = 0, n1 = 0, n2 = 0;
      for (let i = 0; i < CF_USERS.length; i++) {
        if (targetCol[i] !== null && col[i] !== null) {
          dot += targetCol[i]! * col[i]!;
          n1 += targetCol[i]! ** 2;
          n2 += col[i]! ** 2;
        }
      }
      const sim = n1 && n2 ? dot / Math.sqrt(n1 * n2) : 0;
      return { name, sim, idx: j };
    });
  }, [mode, selIdx]);

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">协同过滤：User-CF 与 Item-CF</figcaption>

      <div className="pattern-tabs">
        <button
          type="button"
          className={`pattern-tab ${mode === 'user' ? 'active' : ''}`}
          style={{ '--tab-color': '#2f6bff' } as React.CSSProperties}
          onClick={() => setMode('user')}
        >
          基于用户（User-CF）
        </button>
        <button
          type="button"
          className={`pattern-tab ${mode === 'item' ? 'active' : ''}`}
          style={{ '--tab-color': '#22c55e' } as React.CSSProperties}
          onClick={() => setMode('item')}
        >
          基于物品（Item-CF）
        </button>
      </div>

      <div className="pos-controls">
        <label>
          选择{mode === 'user' ? '用户' : '物品'}
          <input type="range" min="0" max={mode === 'user' ? 3 : 4} step="1" value={selIdx}
            onChange={(e) => setSelIdx(parseInt(e.target.value, 10))} />
          <b>{selName}</b>
        </label>
      </div>

      <div className="cf-matrix">
        <div className="cf-head">
          <span></span>
          {CF_ITEMS.map((it) => (
            <span key={it} className={mode === 'item' && it === selName ? 'hl' : ''}>{it}</span>
          ))}
        </div>
        {CF_MATRIX.map((row, i) => (
          <div key={i} className="cf-row">
            <span className={`cf-uname ${mode === 'user' && CF_USERS[i] === selName ? 'hl' : ''}`}>
              {CF_USERS[i]}
            </span>
            {row.map((v, j) => {
              const isTarget = (mode === 'user' && i === selIdx) || (mode === 'item' && j === selIdx);
              return (
                <span
                  key={j}
                  className={`cf-cell ${v === null ? 'empty' : ''} ${isTarget ? 'target' : ''}`}
                  style={{
                    background: v === null ? undefined : `rgba(47,107,255,${0.1 + (v / 5) * 0.5})`,
                  }}
                >
                  {v ?? '?'}
                </span>
              );
            })}
          </div>
        ))}
      </div>

      <div className="cf-sims">
        <div className="cf-sims-title">与 {selName} 的相似度</div>
        {similarities
          .filter((s) => s.name !== selName)
          .sort((a, b) => b.sim - a.sim)
          .slice(0, 3)
          .map((s) => (
            <div key={s.name} className="cf-sim-row">
              <span className="cf-sim-name">{s.name}</span>
              <div className="cf-sim-track">
                <div style={{ width: `${Math.abs(s.sim) * 100}%`, background: s.sim > 0 ? '#22c55e' : '#ef4444' }} />
              </div>
              <span className="cf-sim-val">{s.sim.toFixed(2)}</span>
            </div>
          ))}
      </div>

      <div className="cf-note">
        {mode === 'user' ? (
          <>
            <b style={{ color: '#2f6bff' }}>User-CF</b>：找相似用户，推荐他们喜欢的物品。
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              缺点：用户数大时计算慢；用户兴趣会漂移
            </span>
          </>
        ) : (
          <>
            <b style={{ color: '#22c55e' }}>Item-CF</b>：找相似物品，推荐给喜欢该物品的用户。
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              优点：物品数相对稳定，可离线计算相似度矩阵——工业界更常用
            </span>
          </>
        )}
      </div>

      <div className="diagram-caption">
        <b>冷启动问题</b>：新用户/新物品没有评分记录，协同过滤完全失效。
        需要内容特征或热门兜底。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   6. 数据流概要结构
   ══════════════════════════════════════════════ */

export function StreamSketchDemo() {
  const [mode, setMode] = useState<'count' | 'bloom' | 'cms'>('cms');
  const [items] = useState(['apple', 'banana', 'apple', 'cherry', 'apple', 'banana', 'date', 'apple', 'cherry', 'elderberry']);

  // Count-Min Sketch（宽度 4，深度 3）
  const cms = useMemo(() => {
    const W = 4, D = 3;
    const table = Array.from({ length: D }, () => Array(W).fill(0));
    for (const item of items) {
      for (let d = 0; d < D; d++) {
        let h = 0;
        for (let i = 0; i < item.length; i++) h = (h * (31 + d * 7) + item.charCodeAt(i)) % W;
        table[d][h]++;
      }
    }
    return table;
  }, [items]);

  // Bloom Filter（8 bit）
  const bloom = useMemo(() => {
    const bits = Array(8).fill(0);
    for (const item of items) {
      for (const seed of [1, 3]) {
        let h = 0;
        for (let i = 0; i < item.length; i++) h = (h * 31 + item.charCodeAt(i) * seed) % 8;
        bits[h] = 1;
      }
    }
    return bits;
  }, [items]);

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">数据流挖掘：用概要结构压缩无限数据</figcaption>

      <div className="ss-tabs">
        {[
          { k: 'cms', n: 'Count-Min Sketch', d: '估算频次' },
          { k: 'bloom', n: 'Bloom Filter', d: '判断存在' },
          { k: 'count', n: 'Misra-Gries', d: '找频繁项' },
        ].map((t) => (
          <button
            key={t.k}
            type="button"
            className={`ss-tab ${mode === t.k ? 'active' : ''}`}
            onClick={() => setMode(t.k as typeof mode)}
          >
            <div className="ss-tab-name">{t.n}</div>
            <div className="ss-tab-desc">{t.d}</div>
          </button>
        ))}
      </div>

      {mode === 'cms' && (
        <>
          <div className="ss-table-title">Count-Min Sketch（3 行 × 4 列）</div>
          <div className="cms-table">
            {cms.map((row, d) => (
              <div key={d} className="cms-row">
                <span className="cms-h">h{d + 1}</span>
                {row.map((v, i) => (
                  <span key={i} className="cms-cell" style={{ background: `rgba(47,107,255,${Math.min(v / 5, 1) * 0.6})` }}>
                    {v}
                  </span>
                ))}
              </div>
            ))}
          </div>
          <div className="ss-note">
            <b>原理</b>：每个元素用 d 个哈希函数映射到 d 个桶，计数 +1。
            <br />
            查询时取 <b>d 个桶的最小值</b>（所以只会高估，不会低估）。
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              空间从 O(不同元素数) 降到 O(d×w)，用可控误差换巨大空间节省
            </span>
          </div>
        </>
      )}

      {mode === 'bloom' && (
        <>
          <div className="ss-table-title">Bloom Filter（8 bit 位数组）</div>
          <div className="bf-bits">
            {bloom.map((b, i) => (
              <div key={i} className={`bf-bit ${b ? 'set' : ''}`}>
                <span className="bf-idx">{i}</span>
                <span className="bf-val">{b}</span>
              </div>
            ))}
          </div>
          <div className="ss-note">
            <b>原理</b>：每个元素用 k 个哈希函数把 k 个 bit 置 1。
            <br />
            查询：如果所有 k 个 bit 都是 1 → "可能存在"；任一为 0 → "一定不存在"。
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              ★ 只会假阳性（误判存在），不会假阴性——这是它的关键保证
            </span>
          </div>
        </>
      )}

      {mode === 'count' && (
        <>
          <div className="ss-table-title">Misra-Gries：找超过 n/k 的频繁项</div>
          <div className="mg-list">
            {['apple', 'banana', 'cherry'].map((item, i) => {
              const cnt = items.filter((x) => x === item).length;
              return (
                <div key={item} className="mg-row">
                  <span className="mg-item">{item}</span>
                  <div className="mg-track">
                    <div style={{ width: `${(cnt / items.length) * 100}%`, background: '#22c55e' }} />
                  </div>
                  <span className="mg-cnt">{cnt} 次</span>
                </div>
              );
            })}
          </div>
          <div className="ss-note">
            <b>原理</b>：维护 k-1 个计数器。新元素若已在表中则 +1；
            否则若表未满则加入；表满时所有计数器 -1（抵消）。
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              保证：真实频次 ≥ 报告频次，且误差 ≤ n/k
            </span>
          </div>
        </>
      )}

      <div className="ss-compare">
        <div className="ss-row"><span className="ss-k">传统做法</span><span className="ss-v">存所有元素 → O(n) 空间，数据流无限时不可行</span></div>
        <div className="ss-row"><span className="ss-k">概要结构</span><span className="ss-v">O(1) 或 O(log n) 空间，用近似换可行</span></div>
        <div className="ss-row"><span className="ss-k">应用</span><span className="ss-v">网络流量监控、去重、热点检测、数据库查询优化</span></div>
      </div>

      <div className="diagram-caption">
        <b>核心思想</b>：数据流只能扫一次且无法存储全部。
        概要结构接受"近似答案"，换取"单次扫描 + 固定内存"。
      </div>
    </figure>
  );
}
