/**
 * 机器学习数学基础 · 专用交互图（第五批，收官）
 *
 *   LLNCLTDemo       大数定律与中心极限定理（对应 l4-3）
 *   MleMapDemo       MLE 与 MAP：先验如何拉偏估计（对应 l5-2）
 *   ConvexityDemo    凸集、凸函数与一阶/二阶条件（对应 l6-1）
 *   GdConvergenceDemo 步长、条件数与收敛速率（对应 l6-2）
 */

import { useState, useMemo } from 'react';

/* ────────────────────────────────────────────────────────────
 *  1. 大数定律与中心极限定理
 * ──────────────────────────────────────────────────────────── */

export function LLNCLTDemo() {
  const [n, setN] = useState(10); // 每次抽多少个样本求均值
  const [trials, setTrials] = useState(400); // 重复多少次
  const [dist, setDist] = useState<'uniform' | 'exponential' | 'bimodal'>('exponential');

  // 各总体的采样函数（确定性伪随机）
  const sampler = (rand: () => number): number => {
    switch (dist) {
      case 'uniform':
        return rand() * 2 - 1; // U(-1,1)，均值 0，方差 1/3
      case 'exponential':
        return -Math.log(Math.max(rand(), 1e-9)); // Exp(1)，均值 1，方差 1
      case 'bimodal':
        return rand() < 0.5 ? -2 + rand() * 0.4 : 2 + rand() * 0.4; // 双峰，均值 0
    }
  };
  const trueMean = dist === 'exponential' ? 1 : 0;
  const trueVar = dist === 'uniform' ? 1 / 3 : dist === 'exponential' ? 1 : 4.013344;

  const data = useMemo(() => {
    let seed = 0x1234567;
    const rand = () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const means: number[] = [];
    for (let k = 0; k < trials; k++) {
      let s = 0;
      for (let i = 0; i < n; i++) s += sampler(rand);
      means.push(s / n);
    }
    const avg = means.reduce((a, b) => a + b, 0) / means.length;
    const sorted = [...means].sort((a, b) => a - b);
    // 直方图
    const BINS = 28;
    const lo = sorted[0];
    const hi = sorted[sorted.length - 1];
    const hist = new Array(BINS).fill(0);
    for (const v of means) {
      const idx = Math.min(BINS - 1, Math.floor(((v - lo) / (hi - lo || 1)) * BINS));
      hist[idx]++;
    }
    return { means, avg, hist, lo, hi, std: Math.sqrt(trueVar / n) };
  }, [n, trials, dist]);

  const maxH = Math.max(...data.hist, 1);
  const W = 380;
  const H = 170;

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '880px', margin: '1.5rem auto' }}>
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
          📊 大数定律与中心极限定理：为什么均值会变成钟形
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--font-muted, #64748b)' }}>
          从<b>非正态</b>总体（均匀 / 指数 / 双峰）重复抽样求均值。样本量 n 增大时：
          均值向真实期望集中（大数定律），且分布趋于正态（中心极限定理）。
          注意左边选的是双峰总体——均值分布依然是钟形。
        </p>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        {([['uniform', '均匀 U(−1,1)'], ['exponential', '指数 Exp(1)'], ['bimodal', '双峰']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setDist(k)}
            style={{
              flex: 1, padding: '7px', borderRadius: '6px',
              border: `1px solid ${dist === k ? '#2f6bff' : '#cbd5e1'}`,
              background: dist === k ? '#2f6bff' : '#fff',
              color: dist === k ? '#fff' : '#475569',
              cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
            }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: '16px', alignItems: 'start' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', background: '#fbfcff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          {data.hist.map((h, i) => {
            const bw = W / 28;
            const bh = (h / maxH) * (H - 34);
            return <rect key={`lh${i}`} x={i * bw + 1} y={H - 24 - bh} width={bw - 2} height={bh}
                         fill="#93c5fd" stroke="#2f6bff" strokeWidth={0.8} />;
          })}
          {/* 真实均值 */}
          <line x1={((trueMean - data.lo) / (data.hi - data.lo || 1)) * W} y1={6}
                x2={((trueMean - data.lo) / (data.hi - data.lo || 1)) * W} y2={H - 22}
                stroke="#dc2626" strokeWidth={2} strokeDasharray="4,3" />
          <text x={((trueMean - data.lo) / (data.hi - data.lo || 1)) * W + 4} y={16}
                fontSize={9} fill="#dc2626" fontWeight={700}>真实 μ = {trueMean.toFixed(2)}</text>
          <line x1={10} y1={H - 24} x2={W - 10} y2={H - 24} stroke="#cbd5e1" />
          <text x={6} y={H - 10} fontSize={8} fill="#94a3b8">{data.lo.toFixed(2)}</text>
          <text x={W - 6} y={H - 10} fontSize={8} fill="#94a3b8" textAnchor="end">{data.hi.toFixed(2)}</text>
        </svg>

        <div>
          <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px', fontSize: '0.75rem', lineHeight: 1.85 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>样本量 n</span><strong>{n}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>重复次数</span><strong>{trials}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>理论 SE = σ/√n</span>
              <strong>{data.std.toFixed(3)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>实测均值</span>
              <strong style={{ color: Math.abs(data.avg - trueMean) < 0.15 ? '#047857' : '#b45309' }}>
                {data.avg.toFixed(3)}
              </strong>
            </div>
          </div>

          <div style={{ background: '#ecfdf5', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px', fontSize: '0.74rem', lineHeight: 1.6, color: '#065f46' }}>
            <b>大数定律</b>：n↑ 时 x̄ → μ（实测均值逼近真实值）。
          </div>
          <div style={{ background: '#eff6ff', padding: '10px 12px', borderRadius: '8px', fontSize: '0.74rem', lineHeight: 1.6, color: '#1e40af' }}>
            <b>中心极限定理</b>：√n(x̄−μ)/σ → N(0,1)，与总体分布无关。
            所以样本量越大，直方图越窄（SE ∝ 1/√n）且越像钟形。
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginTop: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
        <div>
          <label style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
            <span>每次抽样的样本量 n</span><strong>{n}</strong>
          </label>
          <input type="range" min={1} max={200} step={1} value={n}
                 onChange={(e) => setN(parseInt(e.target.value))} style={{ width: '100%' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#94a3b8' }}>
            <span>n=1（原始分布）</span><span>n=200（极窄）</span>
          </div>
        </div>
        <div>
          <label style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
            <span>重复次数</span><strong>{trials}</strong>
          </label>
          <input type="range" min={100} max={1200} step={100} value={trials}
                 onChange={(e) => setTrials(parseInt(e.target.value))} style={{ width: '100%' }} />
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 *  2. MLE 与 MAP
 * ──────────────────────────────────────────────────────────── */

export function MleMapDemo() {
  const [dataMean, setDataMean] = useState(1.2); // 观测数据的样本均值
  const [dataN, setDataN] = useState(5); // 样本量
  const [priorMu, setPriorMu] = useState(0); // 先验均值
  const [priorSigma, setPriorSigma] = useState(1.5); // 先验标准差
  const sigma = 1; // 已知观测噪声

  // 高斯先验 + 高斯似然 → 后验均值是加权平均
  // MAP: (n/σ² · x̄ + 1/τ² · μ0) / (n/σ² + 1/τ²)
  const likePrec = dataN / (sigma * sigma);
  const priorPrec = 1 / (priorSigma * priorSigma);
  const mapMu = (likePrec * dataMean + priorPrec * priorMu) / (likePrec + priorPrec);
  const mle = dataMean; // MLE 就是样本均值

  // 对数后验曲线（略去常数）
  const logPost = (mu: number) => {
    // 似然项：-n/(2σ²)(x̄-μ)²
    const lik = -likePrec / 2 * (dataMean - mu) ** 2;
    // 先验项
    const pri = -priorPrec / 2 * (mu - priorMu) ** 2;
    return lik + pri;
  };

  const W = 380;
  const H = 200;
  const XMIN = -4;
  const XMAX = 5;
  const gx = (x: number) => ((x - XMIN) / (XMAX - XMIN)) * W + 10;

  // 归一化曲线
  const { curve, yMin, yMax } = useMemo(() => {
    const vals: number[] = [];
    const pts: [number, number][] = [];
    for (let i = 0; i <= 200; i++) {
      const x = XMIN + ((XMAX - XMIN) * i) / 200;
      const y = logPost(x);
      vals.push(y);
      pts.push([x, y]);
    }
    const yMax = Math.max(...vals);
    const yMin = yMax - 6; // 只显示峰顶附近，便于看形状
    const path = pts.map(([x, y], i) =>
      `${i === 0 ? 'M' : 'L'}${gx(x).toFixed(1)},${(H - 24 - Math.max(0, (y - yMin) / (yMax - yMin)) * 130).toFixed(1)}`
    ).join(' ');
    return { curve: path, yMin, yMax };
  }, [dataMean, dataN, priorMu, priorSigma]);

  const gy = (y: number) => H - 24 - Math.max(0, (y - yMin) / (yMax - yMin)) * 130;

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '880px', margin: '1.5rem auto' }}>
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
          🎯 MLE 与 MAP：先验如何把估计「拉偏」
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
          蓝线是对数后验。MLE 只看数据（=样本均值），MAP 加上先验后被拉向先验均值。
          <b>样本量 n 越小，先验影响越强</b>；n → ∞ 时 MAP → MLE——这就是「数据多时先验无关紧要」。
        </p>
      </div>

      <svg viewBox={`0 0 ${W + 20} ${H}`} style={{ width: '100%', background: '#fbfcff', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '12px' }}>
        <line x1={10} y1={H - 24} x2={W + 10} y2={H - 24} stroke="#cbd5e1" />
        {[-3, -1, 0, 1, 3, 5].map((t) => (
          <g key={`mt${t}`}>
            <line x1={gx(t)} y1={H - 24} x2={gx(t)} y2={H - 20} stroke="#94a3b8" />
            <text x={gx(t)} y={H - 10} fontSize={8} fill="#94a3b8" textAnchor="middle">{t}</text>
          </g>
        ))}

        {/* 后验曲线 */}
        <path d={curve} fill="none" stroke="#2f6bff" strokeWidth={2.4} />

        {/* MLE 竖线 */}
        <line x1={gx(mle)} y1={20} x2={gx(mle)} y2={H - 24} stroke="#f59e0b" strokeWidth={1.8} strokeDasharray="5,3" />
        <text x={gx(mle) + 4} y={32} fontSize={9} fill="#b45309" fontWeight={700}>MLE {mle.toFixed(2)}</text>

        {/* MAP 竖线 */}
        <line x1={gx(mapMu)} y1={20} x2={gx(mapMu)} y2={H - 24} stroke="#10b981" strokeWidth={2.4} />
        <text x={gx(mapMu) + 4} y={48} fontSize={9} fill="#047857" fontWeight={700}>MAP {mapMu.toFixed(2)}</text>

        {/* 先验均值 */}
        <line x1={gx(priorMu)} y1={60} x2={gx(priorMu)} y2={H - 24} stroke="#a78bfa" strokeWidth={1.4} strokeDasharray="3,3" />
        <text x={gx(priorMu) + 4} y={62} fontSize={9} fill="#7c3aed">先验 μ₀ {priorMu.toFixed(1)}</text>
      </svg>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
        <div style={{ background: '#fffbeb', padding: '10px 12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.72rem', color: '#b45309' }}>MLE（只看数据）</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#b45309' }}>{mle.toFixed(3)}</div>
          <div style={{ fontSize: '0.66rem', color: '#fbbf24' }}>= 样本均值</div>
        </div>
        <div style={{ background: '#ecfdf5', padding: '10px 12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.72rem', color: '#047857' }}>MAP（数据 + 先验）</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#047857' }}>{mapMu.toFixed(3)}</div>
          <div style={{ fontSize: '0.66rem', color: '#10b981' }}>向先验收缩</div>
        </div>
        <div style={{ background: '#f5f3ff', padding: '10px 12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.72rem', color: '#6d28d9' }}>收缩量</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#6d28d9' }}>
            {(mle - mapMu).toFixed(3)}
          </div>
          <div style={{ fontSize: '0.66rem', color: '#a78bfa' }}>n 越小越明显</div>
        </div>
      </div>

      <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.76rem', fontFamily: 'ui-monospace, monospace', lineHeight: 1.9 }}>
        <div style={{ color: '#64748b', fontFamily: 'inherit', marginBottom: '4px' }}>MAP 的闭式解（高斯先验 + 高斯似然）</div>
        <div>μ_MAP = (n/σ²·x̄ + 1/τ²·μ₀) / (n/σ² + 1/τ²)</div>
        <div style={{ color: '#2f6bff' }}>
          = ({likePrec.toFixed(2)}×{dataMean.toFixed(2)} + {priorPrec.toFixed(2)}×{priorMu.toFixed(1)}) / ({likePrec.toFixed(2)} + {priorPrec.toFixed(2)})
        </div>
        <div style={{ color: '#64748b', fontFamily: 'inherit', fontSize: '0.72rem', marginTop: '4px' }}>
          即：精度加权平均。数据精度 n/σ² 与先验精度 1/τ² 谁大听谁的。
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
        {[
          ['样本均值 x̄', dataMean, setDataMean, -3, 4, 0.1],
          ['样本量 n', dataN, setDataN, 1, 100, 1],
          ['先验均值 μ₀', priorMu, setPriorMu, -3, 3, 0.1],
          ['先验标准差 τ', priorSigma, setPriorSigma, 0.2, 5, 0.1],
        ].map(([label, val, setter, min, max, step], i) => (
          <div key={i}>
            <label style={{ fontSize: '0.7rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
              <span>{label as string}</span><strong>{(val as number).toFixed(i === 1 ? 0 : 2)}</strong>
            </label>
            <input type="range" min={min as number} max={max as number} step={step as number}
                   value={val as number}
                   onChange={(e) => (setter as (v: number) => void)(parseFloat(e.target.value))}
                   style={{ width: '100%' }} />
          </div>
        ))}
      </div>

      <div style={{ marginTop: '10px', fontSize: '0.76rem', lineHeight: 1.6, color: '#475569', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px' }}>
        <b>为什么说「正则化 = 加先验」</b>：高斯先验下，−log P(μ) ∝ μ²/(2τ²)，正是 L2 正则项。
        所以 Ridge 回归 ⇔ 高斯先验的 MAP；Lasso ⇔ 拉普拉斯先验的 MAP。
        <b>把 τ 调小（先验很强），MAP 会紧紧贴着 μ₀ 不动</b>——这就是正则化过强的表现（欠拟合）。
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 *  3. 凸集与凸函数
 * ──────────────────────────────────────────────────────────── */

export function ConvexityDemo() {
  const [curvature, setCurvature] = useState(1); // 二次项系数（负=非凸）
  const [t, setT] = useState(0.5); // 割线上的插值参数 t
  const [x1, setX1] = useState(-1.6);
  const [x2, setX2] = useState(1.8);

  const f = (x: number) => (curvature / 2) * x * x + 0.25 * Math.sin(x * 3) * (curvature < 0.05 ? 1.2 : 0.15);
  const y1 = f(x1);
  const y2 = f(x2);
  // 割线上的点
  const chordY = (1 - t) * y1 + t * y2;
  const chordX = (1 - t) * x1 + t * x2;
  const funcY = f(chordX);
  // 凸性检验：f(tx1+(1-t)x2) <= t f(x1) + (1-t) f(x2)
  const isConvexPoint = funcY <= chordY + 1e-9;
  const gap = chordY - funcY; // 正值表示函数在割线下方 → 凸

  const W = 400;
  const H = 185;
  const XMIN = -2.4;
  const XMAX = 2.4;
  const YMIN = -0.35;
  const YMAX = 2.15;
  const gx = (x: number) => ((x - XMIN) / (XMAX - XMIN)) * W + 10;
  const gy = (y: number) => H - 26 - ((y - YMIN) / (YMAX - YMIN)) * (H - 42);

  const curve = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 200; i++) {
      const x = XMIN + ((XMAX - XMIN) * i) / 200;
      pts.push(`${i === 0 ? 'M' : 'L'}${gx(x).toFixed(1)},${gy(f(x)).toFixed(1)}`);
    }
    return pts.join(' ');
  }, [curvature]);

  // 二阶导（近似）判断是否整体凸
  const secondDeriv = curvature;
  const globallyConvex = secondDeriv > 0;

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '880px', margin: '1.5rem auto' }}>
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
          🏔️ 凸函数：割线永远在函数上方
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
          凸函数的定义是：<b>任意两点的连线段都在函数图像上方</b>（f(tx+(1−t)y) ≤ t f(x)+(1−t)f(y)）。
          拖动 t 看割线与曲线的间隙——间隙恒 ≥ 0 就是凸的。
        </p>
      </div>

      <svg viewBox={`0 0 ${W + 20} ${H}`} style={{ width: '100%', background: '#fbfcff', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '12px' }}>
        <line x1={10} y1={gy(0)} x2={W + 10} y2={gy(0)} stroke="#cbd5e1" />
        <line x1={gx(0)} y1={10} x2={gx(0)} y2={H - 20} stroke="#e2e8f0" />

        {/* 函数曲线 */}
        <path d={curve} fill="none" stroke="#2f6bff" strokeWidth={2.6} />

        {/* 割线 */}
        <line x1={gx(x1)} y1={gy(y1)} x2={gx(x2)} y2={gy(y2)} stroke="#f59e0b" strokeWidth={2} />

        {/* 两端点 */}
        <circle cx={gx(x1)} cy={gy(y1)} r={4.5} fill="#f59e0b" />
        <circle cx={gx(x2)} cy={gy(y2)} r={4.5} fill="#f59e0b" />

        {/* 割线上的点 */}
        <circle cx={gx(chordX)} cy={gy(chordY)} r={4} fill="#f59e0b" opacity={0.7} />
        {/* 函数上的点 */}
        <circle cx={gx(chordX)} cy={gy(funcY)} r={5} fill={isConvexPoint ? '#10b981' : '#ef4444'} stroke="#fff" strokeWidth={1.2} />

        {/* 垂直间隙 */}
        <line x1={gx(chordX)} y1={gy(chordY)} x2={gx(chordX)} y2={gy(funcY)}
              stroke={isConvexPoint ? '#10b981' : '#ef4444'} strokeWidth={2.4} strokeDasharray="3,2" />
        <text x={gx(chordX) + 8} y={(gy(chordY) + gy(funcY)) / 2}
              fontSize={9} fill={isConvexPoint ? '#047857' : '#dc2626'} fontWeight={700}>
          {gap >= 0 ? '间隙 ' + gap.toFixed(3) : '负间隙 ' + gap.toFixed(3)}
        </text>

        <text x={12} y={20} fontSize={9} fill="#64748b">蓝线 f(x)　橙线 割线　t = {t.toFixed(2)}</text>
      </svg>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
        <div style={{ background: globallyConvex ? '#ecfdf5' : '#fef2f2', padding: '10px 12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>f''(x) 二阶导</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: globallyConvex ? '#047857' : '#dc2626' }}>
            {secondDeriv.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.66rem', color: globallyConvex ? '#10b981' : '#ef4444' }}>
            {globallyConvex ? '≥ 0 → 凸函数' : '< 0 → 凹函数'}
          </div>
        </div>
        <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>割线值 t f(x₁)+(1−t)f(x₂)</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#b45309' }}>{chordY.toFixed(3)}</div>
        </div>
        <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>函数值 f(tx₁+(1−t)x₂)</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: isConvexPoint ? '#047857' : '#dc2626' }}>
            {funcY.toFixed(3)}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
        {[
          ['曲率 a（f=½ax²）', curvature, setCurvature, -1.5, 2.5, 0.1],
          ['插值参数 t', t, setT, 0, 1, 0.01],
          ['左端点 x₁', x1, setX1, -2.4, 0, 0.1],
          ['右端点 x₂', x2, setX2, 0, 2.4, 0.1],
        ].map(([label, val, setter, min, max, step], i) => (
          <div key={i}>
            <label style={{ fontSize: '0.7rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
              <span>{label as string}</span><strong>{(val as number).toFixed(2)}</strong>
            </label>
            <input type="range" min={min as number} max={max as number} step={step as number}
                   value={val as number}
                   onChange={(e) => (setter as (v: number) => void)(parseFloat(e.target.value))}
                   style={{ width: '100%' }} />
          </div>
        ))}
      </div>

      <div style={{ marginTop: '10px', fontSize: '0.76rem', lineHeight: 1.6, color: '#475569', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px' }}>
        <b>为什么凸性这么重要</b>：凸函数的<b>任何局部最小值都是全局最小值</b>，所以「梯度 = 0」就是收敛判据，不用担心掉进坏的局部最优。
        一阶条件：f(y) ≥ f(x) + ∇f(x)ᵀ(y−x)（函数永远在切线上方）；二阶条件：∇²f ⪰ 0。
        <b>把曲率调到负值</b>会看到割线跑到曲线下方——凸性被破坏，此时存在多个局部最优。
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 *  4. 梯度下降收敛性
 * ──────────────────────────────────────────────────────────── */

export function GdConvergenceDemo() {
  const [lr, setLr] = useState(0.1);
  const [cond, setCond] = useState(5); // 条件数
  const [opt, setOpt] = useState<'gd' | 'momentum' | 'adam'>('gd');

  // f = ½(λ1 x² + λ2 y²)，λ1=cond, λ2=1
  const l1 = cond;
  const l2 = 1;
  // 收敛条件：η < 2/λmax
  const lrMax = 2 / l1;
  const diverging = lr >= lrMax;

  const traj = useMemo(() => {
    const pts: [number, number][] = [[1.6, 1.2]];
    let x = 1.6;
    let y = 1.2;
    let vx = 0;
    let vy = 0;
    let mx = 0, my = 0, sx = 0, sy = 0;
    const beta1 = 0.9, beta2 = 0.999, eps = 1e-8;
    for (let i = 1; i <= 40; i++) {
      const gx = l1 * x;
      const gy = l2 * y;
      if (opt === 'gd') {
        x -= lr * gx;
        y -= lr * gy;
      } else if (opt === 'momentum') {
        vx = 0.9 * vx - lr * gx;
        vy = 0.9 * vy - lr * gy;
        x += vx;
        y += vy;
      } else {
        mx = beta1 * mx + (1 - beta1) * gx;
        my = beta1 * my + (1 - beta1) * gy;
        sx = beta2 * sx + (1 - beta2) * gx * gx;
        sy = beta2 * sy + (1 - beta2) * gy * gy;
        const mhx = mx / (1 - Math.pow(beta1, i));
        const mhy = my / (1 - Math.pow(beta1, i));
        const shx = sx / (1 - Math.pow(beta2, i));
        const shy = sy / (1 - Math.pow(beta2, i));
        x -= (lr * 3) * mhx / (Math.sqrt(shx) + eps);
        y -= (lr * 3) * mhy / (Math.sqrt(shy) + eps);
      }
      if (!isFinite(x) || !isFinite(y) || Math.abs(x) > 50 || Math.abs(y) > 50) {
        pts.push([Math.max(-3, Math.min(3, x)), Math.max(-3, Math.min(3, y))]);
        break;
      }
      pts.push([x, y]);
      if (Math.hypot(x, y) < 1e-3) break;
    }
    return pts;
  }, [lr, cond, opt]);

  const OX = 200;
  const OY = 160;
  const S = 62;
  const px = (x: number) => OX + Math.max(-2.9, Math.min(2.9, x)) * S;
  const py = (y: number) => OY - Math.max(-2.4, Math.min(2.4, y)) * S;

  const finalErr = (() => {
    const last = traj[traj.length - 1];
    return Math.hypot(last[0], last[1]);
  })();

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '880px', margin: '1.5rem auto' }}>
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
          ⚙️ 梯度下降收敛性：步长门槛与条件数的诅咒
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
          f = ½(λ₁x² + λ₂y²)。收敛条件是 <b>η &lt; 2/λmax</b>——把学习率推过这条线就会震荡发散。
          条件数 κ=λ₁/λ₂ 越大，等高线越扁，收敛越慢。切动量/Adam 看它们如何缓解。
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: '16px', alignItems: 'start' }}>
        <svg viewBox="0 0 400 320" style={{ width: '100%', background: '#fbfcff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <line x1={12} y1={OY} x2={388} y2={OY} stroke="#e2e8f0" />
          <line x1={OX} y1={12} x2={OX} y2={308} stroke="#e2e8f0" />

          {[0.3, 0.7, 1.2, 1.9, 2.8].map((lvl, i) => {
            const rx = Math.sqrt((2 * lvl) / l1) * S;
            const ry = Math.sqrt((2 * lvl) / l2) * S;
            return <ellipse key={`gc${i}`} cx={px(0)} cy={py(0)} rx={rx} ry={ry}
                            fill="none" stroke="#dbeafe" strokeWidth={1.2} />;
          })}

          <path d={traj.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${px(x).toFixed(1)},${py(y).toFixed(1)}`).join(' ')}
                fill="none" stroke={diverging ? '#ef4444' : '#7c5cff'} strokeWidth={1.8} opacity={0.85} />
          {traj.map(([x, y], i) => (
            <circle key={`gp${i}`} cx={px(x)} cy={py(y)} r={i === 0 ? 4.5 : 2.2}
                    fill={i === 0 ? '#f59e0b' : diverging ? '#ef4444' : '#7c5cff'} />
          ))}
          <circle cx={px(0)} cy={py(0)} r={4} fill="#10b981" />
        </svg>

        <div>
          <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
            {([['gd', 'GD'], ['momentum', '动量'], ['adam', 'Adam']] as const).map(([k, label]) => (
              <button key={k} onClick={() => setOpt(k)}
                style={{
                  flex: 1, padding: '6px 4px', borderRadius: '6px',
                  border: `1px solid ${opt === k ? '#7c5cff' : '#cbd5e1'}`,
                  background: opt === k ? '#7c5cff' : '#fff',
                  color: opt === k ? '#fff' : '#475569',
                  cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600,
                }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ background: diverging ? '#fef2f2' : '#ecfdf5', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '3px' }}>收敛判据 η &lt; 2/λmax</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: diverging ? '#dc2626' : '#047857' }}>
              {diverging ? '❌ 发散' : '✅ 收敛'}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px', lineHeight: 1.5 }}>
              η = {lr.toFixed(3)} vs 上限 {lrMax.toFixed(3)}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px', fontSize: '0.74rem', lineHeight: 1.85 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>条件数 κ</span><strong>{cond.toFixed(1)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>迭代步数</span><strong>{traj.length - 1}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>最终误差</span>
              <strong style={{ color: finalErr < 0.01 ? '#047857' : '#dc2626' }}>{finalErr.toFixed(4)}</strong>
            </div>
          </div>

          <div style={{ fontSize: '0.73rem', lineHeight: 1.6, color: '#475569', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
            梯度下降的收敛速率是 <b>O((1−1/κ)ᵏ)</b>——κ 越大越慢。κ=100 时理论上需要 ~500 步才能把误差降低 100 倍，
            而牛顿法只需 1 步（它用 H⁻¹ 消除了条件数）。
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
        <div>
          <label style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
            <span>学习率 η（红线 = 2/λmax）</span><strong>{lr.toFixed(3)}</strong>
          </label>
          <input type="range" min={0.01} max={1.8} step={0.01} value={lr}
                 onChange={(e) => setLr(parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
            <span>条件数 κ = λ₁/λ₂</span><strong>{cond.toFixed(1)}</strong>
          </label>
          <input type="range" min={1} max={60} step={1} value={cond}
                 onChange={(e) => setCond(parseInt(e.target.value))} style={{ width: '100%' }} />
        </div>
      </div>

      <div style={{ marginTop: '10px', fontSize: '0.76rem', lineHeight: 1.6, color: '#475569', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px' }}>
        <b>动量与 Adam 为什么有用</b>：动量沿一致方向累积速度，能「冲过」狭窄峡谷的锯齿；
        Adam 为每个参数单独缩放步长（除以梯度二阶矩的平方根），相当于自适应地把条件数拉平。
        但注意：<b>它们都改变不了「η 太大就发散」这个底线</b>——把学习率推到 2/λmax 以上，任何优化器都会炸。
      </div>
    </div>
  );
}
