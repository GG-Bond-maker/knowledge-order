/**
 * 机器学习数学基础 · 专用交互图（第二批）
 *
 *   NormBallDemo       L1 / L2 / L∞ 单位球与稀疏解的几何来源（对应 l1-3）
 *   HessianCurvatureDemo 曲率、条件数与二阶泰勒展开 / 鞍点识别（对应 l3-2）
 *   SamplingDistributionDemo 抽样分布、自由度与贝塞尔校正（对应 l5-1）
 */

import { useState, useMemo } from 'react';

/* ────────────────────────────────────────────────────────────
 *  1. 范数单位球：L1 的尖角如何产生稀疏解
 * ──────────────────────────────────────────────────────────── */

export function NormBallDemo() {
  const [p, setP] = useState(1); // 1 = L1, 2 = L2, 0 = L∞（用 0 代表 max，便于滑杆）
  const [lossAngle, setLossAngle] = useState(42); // 损失函数梯度方向
  const [scale, setScale] = useState(1.6); // 等高线大小

  const normP = p === 0 ? Infinity : p;
  const label = p === 0 ? 'L∞（切比雪夫）' : p === 1 ? 'L1（曼哈顿）' : p === 2 ? 'L2（欧氏）' : `L${p}`;

  // 单位球边界点：|x|^p + |y|^p = 1
  const boundary = useMemo(() => {
    const pts: [number, number][] = [];
    const N = 240;
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2;
      const c = Math.cos(t);
      const s = Math.sin(t);
      if (normP === Infinity) {
        // 正方形：按角度取到边界
        const m = Math.max(Math.abs(c), Math.abs(s));
        pts.push([c / m, s / m]);
      } else {
        // |x|^p + |y|^p = 1 → r = 1 / (|cos|^p + |sin|^p)^(1/p)
        const denom = Math.pow(Math.pow(Math.abs(c), normP) + Math.pow(Math.abs(s), normP), 1 / normP);
        if (denom < 1e-9) continue;
        pts.push([c / denom, s / denom]);
      }
    }
    return pts;
  }, [normP]);

  const path = boundary.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(4)},${y.toFixed(4)}`).join(' ') + ' Z';

  // 损失等高线（一组同心圆，中心在 lossAngle 方向的远处）
  const cx = Math.cos((lossAngle * Math.PI) / 180) * scale;
  const cy = Math.sin((lossAngle * Math.PI) / 180) * scale;

  // 约束最优解：从中心沿着「指向原点」的方向走到单位球边界
  // 对 L1 特殊处理：解往往落在坐标轴上的顶点
  const solve = (): [number, number] => {
    if (p === 1) {
      // L1 球是菱形，最优解常在 4 个顶点之一
      const cands: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      let best = cands[0];
      let bd = Infinity;
      for (const c of cands) {
        const d = (c[0] - cx) ** 2 + (c[1] - cy) ** 2;
        if (d < bd) { bd = d; best = c; }
      }
      return best;
    }
    if (normP === Infinity) {
      // 正方形边界上离中心最近的点
      const m = Math.max(Math.abs(cx), Math.abs(cy));
      return [cx / m, cy / m];
    }
    // Lp 一般情形：数值上沿射线找边界
    const r = Math.hypot(cx, cy) || 1;
    const ux = cx / r;
    const uy = cy / r;
    const denom = Math.pow(Math.pow(Math.abs(ux), normP) + Math.pow(Math.abs(uy), normP), 1 / normP);
    return [ux / denom, uy / denom];
  };
  const [sx, sy] = solve();
  const isSparse = p === 1 || p === 0;

  const OX = 210;
  const OY = 190;
  const S = 62;
  const px = (x: number) => OX + x * S;
  const py = (y: number) => OY - y * S;

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '880px', margin: '1.5rem auto' }}>
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
          🔷 范数单位球：L1 的尖角如何产生稀疏解
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
          拖动滑杆改变范数 p，观察「球」的形状。<b>L1 的菱形有尖角落在坐标轴上</b>——损失圆最早接触的正是这些顶点，
          所以 L1 正则化的解在某些维度上<b>恰好为零</b>，这就是 Lasso 能做特征选择的原因。
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 250px', gap: '16px', alignItems: 'start' }}>
        <svg viewBox="0 0 420 380" style={{ width: '100%', background: '#fbfcff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          {[-2, -1, 1, 2].map((i) => (
            <g key={`ng${i}`}>
              <line x1={px(i)} y1={10} x2={px(i)} y2={370} stroke="#eef2f7" />
              <line x1={10} y1={py(i)} x2={410} y2={py(i)} stroke="#eef2f7" />
            </g>
          ))}
          <line x1={12} y1={OY} x2={408} y2={OY} stroke="#cbd5e1" />
          <line x1={OX} y1={12} x2={OX} y2={368} stroke="#cbd5e1" />

          {/* 范数单位球（先画，让等高线叠在上面） */}
          <path d={path} transform={`translate(${OX},${OY}) scale(${S},${-S})`}
                fill="rgba(47,107,255,0.06)" stroke="#2f6bff" strokeWidth={2.2} />

          {/* 损失等高线（同心圆） */}
          {[0.45, 0.8, 1.15, 1.5, 1.85].map((r, i) => (
            <circle key={`lc${i}`} cx={px(cx)} cy={py(cy)} r={r * S}
                    fill="none" stroke="#fbbf24" strokeWidth={1.3} opacity={0.9} />
          ))}
          <circle cx={px(cx)} cy={py(cy)} r={3} fill="#f59e0b" />
          <text x={px(cx) + 7} y={py(cy) - 7} fontSize={9} fill="#b45309" fontWeight={600}>
            无约束最优
          </text>

          {/* 约束最优解 */}
          <line x1={px(cx)} y1={py(cy)} x2={px(sx)} y2={py(sy)}
                stroke="#10b981" strokeWidth={1.4} strokeDasharray="4,3" />
          <circle cx={px(sx)} cy={py(sy)} r={5.5} fill="#10b981" stroke="#fff" strokeWidth={1.5} />
          <text x={px(sx) + 9} y={py(sy) + 4} fontSize={10} fontWeight={700} fill="#047857">
            约束最优
          </text>

          {/* 坐标轴标注：稀疏性 */}
          {p === 1 && [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([vx, vy], i) => (
            <circle key={`v${i}`} cx={px(vx)} cy={py(vy)} r={3.5}
                    fill="none" stroke="#ef4444" strokeWidth={1.6} />
          ))}
          {p === 1 && (
            <text x={px(0) - 10} y={py(1.42)} fontSize={9} fill="#dc2626" fontWeight={600} textAnchor="middle">
              顶点：一个坐标为 0
            </text>
          )}
        </svg>

        <div>
          <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px', fontSize: '0.76rem', lineHeight: 1.7 }}>
            <div style={{ fontWeight: 700, marginBottom: '4px' }}>{label}</div>
            <div style={{ fontFamily: 'ui-monospace, monospace', color: '#475569' }}>
              {p === 1 ? '‖x‖₁ = |x₁| + |x₂|'
                : p === 2 ? '‖x‖₂ = √(x₁² + x₂²)'
                : p === 0 ? '‖x‖∞ = max(|x₁|, |x₂|)'
                : `‖x‖${p} = (Σ|xᵢ|^${p})^(1/${p})`}
            </div>
          </div>

          <div style={{ background: isSparse ? '#ecfdf5' : '#eff6ff', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '3px' }}>约束最优解</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: isSparse ? '#047857' : '#1d4ed8' }}>
              ({sx.toFixed(2)}, {sy.toFixed(2)})
            </div>
            <div style={{ fontSize: '0.72rem', marginTop: '4px', color: isSparse ? '#047857' : '#3b82f6', fontWeight: 600 }}>
              {p === 1 ? '✅ 有一个坐标为 0 → 稀疏！' : p === 0 ? '✅ 边界上常有坐标为极值' : '❌ 两个坐标都非零 → 不稀疏'}
            </div>
          </div>

          <div style={{ fontSize: '0.74rem', lineHeight: 1.6, color: '#475569', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
            几何本质：约束优化的解出现在<b>等高线与约束边界的切点</b>。
            L1 球的边界在坐标轴上「有棱角」，切点极易落在顶点上 → 部分权重被压成 0。
            L2 球处处光滑，切点一般不在坐标轴上 → 权重只是变小，不会归零。
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
        <div>
          <label style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
            <span>范数阶 p</span><strong>{p === 0 ? '∞' : p}</strong>
          </label>
          <input type="range" min={0} max={4} step={1} value={p}
                 onChange={(e) => setP(parseInt(e.target.value))} style={{ width: '100%' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#94a3b8' }}>
            <span>L∞</span><span>L1</span><span>L2</span><span>L4</span>
          </div>
        </div>
        <div>
          <label style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
            <span>损失中心角度</span><strong>{lossAngle}°</strong>
          </label>
          <input type="range" min={0} max={90} step={1} value={lossAngle}
                 onChange={(e) => setLossAngle(parseInt(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
            <span>损失中心距离</span><strong>{scale.toFixed(1)}</strong>
          </label>
          <input type="range" min={0.8} max={2.6} step={0.1} value={scale}
                 onChange={(e) => setScale(parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 *  2. 黑塞矩阵、曲率与条件数
 * ──────────────────────────────────────────────────────────── */

export function HessianCurvatureDemo() {
  // 二次函数 f(x,y) = 0.5*(a*x² + c*y²)，黑塞 = diag(a, c)
  const [a, setA] = useState(1);
  const [c, setC] = useState(8);
  const [lr, setLr] = useState(0.06);
  const [startX, setStartX] = useState(-1.8);
  const [startY, setStartY] = useState(1.6);
  const [mode, setMode] = useState<'gd' | 'newton'>('gd');

  // 梯度下降轨迹
  const traj = useMemo(() => {
    const pts: [number, number][] = [[startX, startY]];
    let x = startX;
    let y = startY;
    for (let i = 0; i < 30; i++) {
      const gx = a * x;
      const gy = c * y;
      if (mode === 'gd') {
        x = x - lr * gx;
        y = y - lr * gy;
      } else {
        // 牛顿法：H⁻¹ g，H = diag(a,c)
        x = x - gx / a;
        y = y - gy / c;
      }
      pts.push([x, y]);
      if (Math.abs(x) < 1e-4 && Math.abs(y) < 1e-4) break;
    }
    return pts;
  }, [a, c, lr, startX, startY, mode]);

  const cond = Math.max(a, c) / Math.min(a, c);
  const eigen = [a, c]; // [λx(a), λy(c)]，与 x/y 轴一一对应

  const OX = 200;
  const OY = 175;
  const S = 62;
  const px = (x: number) => OX + x * S;
  const py = (y: number) => OY - y * S;

  const trajPath = traj.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${px(x).toFixed(1)},${py(y).toFixed(1)}`).join(' ');

  // 鞍点检测：一个特征值为正、一个为负
  const isSaddle = (a > 0 && c < 0) || (a < 0 && c > 0);
  const isConvex = a > 0 && c > 0;

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '880px', margin: '1.5rem auto' }}>
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
          🌀 黑塞矩阵与曲率：为什么梯度下降会「之字形」震荡
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
          目标 f = ½(a·x² + c·y²)，黑塞矩阵 H = diag(a, c) 的两个特征值给出两个方向的曲率。
          <b>条件数 = λmax/λmin</b> 越大，等高线越扁，梯度下降的锯齿越严重。
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 250px', gap: '16px', alignItems: 'start' }}>
        <svg viewBox="0 0 400 350" style={{ width: '100%', background: '#fbfcff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <line x1={12} y1={OY} x2={388} y2={OY} stroke="#cbd5e1" />
          <line x1={OX} y1={12} x2={OX} y2={338} stroke="#cbd5e1" />

          {/* 等高线（椭圆）：a x² + c y² = const */}
          {[0.4, 0.9, 1.6, 2.5, 3.6, 5.0].map((lvl, i) => {
            const rx = Math.sqrt((2 * lvl) / Math.abs(a || 0.001));
            const ry = Math.sqrt((2 * lvl) / Math.abs(c || 0.001));
            return (
              <ellipse key={`ec${i}`} cx={px(0)} cy={py(0)} rx={rx * S} ry={ry * S}
                       fill="none" stroke="#dbeafe" strokeWidth={1.2} />
            );
          })}

          {/* 坐标轴方向上的曲率标注 */}
          <line x1={px(0)} y1={py(0)} x2={px(2.4)} y2={py(0)} stroke="#f59e0b" strokeWidth={1.5} opacity={0.5} />
          <line x1={px(0)} y1={py(0)} x2={px(0)} y2={py(2.4)} stroke="#ef4444" strokeWidth={1.5} opacity={0.5} />
          <text x={px(2.45)} y={py(0) + 4} fontSize={9} fill="#b45309">λx={a.toFixed(1)}</text>
          <text x={px(0) + 5} y={py(2.4)} fontSize={9} fill="#dc2626">λy={c.toFixed(1)}</text>

          {/* 轨迹 */}
          <path d={trajPath} fill="none" stroke="#7c5cff" strokeWidth={1.8} opacity={0.85} />
          {traj.map(([x, y], i) => (
            <circle key={`tp${i}`} cx={px(x)} cy={py(y)} r={i === 0 ? 4.5 : 2.4}
                    fill={i === 0 ? '#ef4444' : '#7c5cff'} />
          ))}

          {/* 最优点 */}
          <circle cx={px(0)} cy={py(0)} r={4} fill="#10b981" />
        </svg>

        <div>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
            <button onClick={() => setMode('gd')}
              style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid #7c5cff', background: mode === 'gd' ? '#7c5cff' : '#f5f3ff', color: mode === 'gd' ? '#fff' : '#6d28d9', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
              梯度下降
            </button>
            <button onClick={() => setMode('newton')}
              style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid #10b981', background: mode === 'newton' ? '#10b981' : '#ecfdf5', color: mode === 'newton' ? '#fff' : '#047857', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
              牛顿法
            </button>
          </div>

          <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px', fontSize: '0.75rem', lineHeight: 1.7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>迭代步数</span>
              <strong>{traj.length - 1}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>最终误差</span>
              <strong style={{ color: traj.length > 20 ? '#dc2626' : '#047857' }}>
                {Math.hypot(traj[traj.length - 1][0], traj[traj.length - 1][1]).toFixed(4)}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>条件数 κ</span>
              <strong style={{ color: cond > 5 ? '#dc2626' : '#047857' }}>{cond.toFixed(2)}</strong>
            </div>
          </div>

          <div style={{ background: isSaddle ? '#fef2f2' : isConvex ? '#ecfdf5' : '#fffbeb', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '3px' }}>驻点类型（由黑塞特征值判定）</div>
            <div style={{ fontSize: '0.98rem', fontWeight: 700, color: isSaddle ? '#dc2626' : isConvex ? '#047857' : '#b45309' }}>
              {isSaddle ? '🐴 鞍点（一正一负）' : isConvex ? '✅ 局部极小（全正）' : '🔺 局部极大（全负）'}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px', lineHeight: 1.5 }}>
              H 正定 → 极小；H 负定 → 极大；不定 → 鞍点
            </div>
          </div>

          <div style={{ fontSize: '0.74rem', lineHeight: 1.6, color: '#475569', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
            <b>牛顿法</b>用 H⁻¹ 缩放梯度，把椭圆的等高线「校正成圆」，所以一步到位（二次函数）。
            代价是要算黑塞矩阵并求逆——高维时不可行，于是有了拟牛顿法与 Adam 这类近似方案。
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginTop: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
        {[
          ['λ₁ (a)', a, setA, -3, 10, 0.5],
          ['λ₂ (c)', c, setC, -3, 10, 0.5],
          ['学习率', lr, setLr, 0.01, 0.3, 0.01],
          ['起点 x', startX, setStartX, -2.6, 2.6, 0.1],
          ['起点 y', startY, setStartY, -2.4, 2.4, 0.1],
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
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 *  3. 抽样分布与贝塞尔校正
 * ──────────────────────────────────────────────────────────── */

export function SamplingDistributionDemo() {
  const [n, setN] = useState(5); // 样本量
  const [useBessel, setUseBessel] = useState(true); // 是否用 n-1
  const [trueStd, setTrueStd] = useState(1.0);

  // 理论期望（解析解，消除蒙特卡洛噪声——面板数字永远准确）
  // 标准公式：c4(n) = sqrt(2/(n-1)) * Γ(n/2)/Γ((n-1)/2)
  //   除以 n-1 时 E[ŝ] = σ·c4(n)      → 只差一个「小样本修正」，n→∞ 时 c4→1
  //   除以 n   时 E[ŝ] = σ·c4(n)·√((n-1)/n) → 系统性低估
  const gamma = (z: number): number => {
    const g = 7;
    const C = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
    z -= 1;
    let x = C[0];
    for (let i = 1; i < g + 2; i++) x += C[i] / (z + i);
    const t = z + g + 0.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
  };
  const c4 = (m: number) => (m < 2 ? 1 : Math.sqrt(2 / (m - 1)) * (gamma(m / 2) / gamma((m - 1) / 2)));

  const theoreticalAvg = useMemo(() => {
    if (n < 2) return trueStd;
    return useBessel
      ? trueStd * c4(n)                              // 除以 n-1
      : trueStd * c4(n) * Math.sqrt((n - 1) / n);    // 除以 n
  }, [n, useBessel, trueStd]);

  // 用确定性伪随机生成 M 次抽样的样本方差估计（便于 SSR 稳定）
  const M = 800;
  const stats = useMemo(() => {
    // mulberry32：质量足够好的确定性伪随机（保证 SSR 一致）
    let seed = 0x9e3779b9;
    const rand = () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    // Box-Muller 生成正态
    const normal = () => {
      const u1 = Math.max(rand(), 1e-9);
      const u2 = rand();
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    };

    const ests: number[] = [];
    for (let k = 0; k < M; k++) {
      const sample: number[] = [];
      for (let i = 0; i < n; i++) sample.push(normal() * trueStd);
      const mean = sample.reduce((s, v) => s + v, 0) / n;
      const ss = sample.reduce((s, v) => s + (v - mean) ** 2, 0);
      const denom = useBessel ? n - 1 : n;
      ests.push(Math.sqrt(ss / denom));
    }
    const avg = ests.reduce((s, v) => s + v, 0) / M;
    // 分位数（用于画直方图）
    const sorted = [...ests].sort((x, y) => x - y);
    const hist: number[] = new Array(24).fill(0);
    const lo = sorted[0];
    const hi = sorted[sorted.length - 1];
    for (const v of ests) {
      const idx = Math.min(23, Math.floor(((v - lo) / (hi - lo || 1)) * 24));
      hist[idx]++;
    }
    return { ests, avg, hist, lo, hi, q05: sorted[Math.floor(M * 0.05)], q95: sorted[Math.floor(M * 0.95)] };
  }, [n, useBessel, trueStd]);

  const bias = theoreticalAvg - trueStd;
  const biasPct = (bias / trueStd) * 100;

  const W = 360;
  const H = 150;
  const maxH = Math.max(...stats.hist, 1);

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '880px', margin: '1.5rem auto' }}>
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
          📊 贝塞尔校正：为什么「样本方差」要除以 n−1 而不是 n
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
          对标准正态总体重复抽样 800 次。<b>除以 n 的样本方差系统性低估 σ²</b>（样本均值「吃掉」一个自由度）；<b>除以 n−1 后 E[s²]=σ² 严格无偏</b>。注意：无偏的是方差，标准差 s 的期望仍略小于 σ（差 c₄ 因子）。
        </p>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        <button onClick={() => setUseBessel(true)}
          style={{ flex: 1, padding: '7px', borderRadius: '6px', border: '1px solid #10b981', background: useBessel ? '#10b981' : '#ecfdf5', color: useBessel ? '#fff' : '#047857', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
          除以 n−1（贝塞尔校正，无偏）
        </button>
        <button onClick={() => setUseBessel(false)}
          style={{ flex: 1, padding: '7px', borderRadius: '6px', border: '1px solid #ef4444', background: !useBessel ? '#ef4444' : '#fef2f2', color: !useBessel ? '#fff' : '#dc2626', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
          除以 n（有偏估计）
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: '16px', alignItems: 'start' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', background: '#fbfcff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          {/* 直方图 */}
          {stats.hist.map((h, i) => {
            const bw = W / 24;
            const bh = (h / maxH) * (H - 30);
            return (
              <rect key={`hb${i}`} x={i * bw + 1} y={H - 20 - bh} width={bw - 2} height={bh}
                    fill={useBessel ? '#a7f3d0' : '#fecaca'} stroke={useBessel ? '#10b981' : '#ef4444'} strokeWidth={0.8} />
            );
          })}
          {/* 真实值参考线 */}
          <line x1={((trueStd - stats.lo) / (stats.hi - stats.lo || 1)) * W} y1={8}
                x2={((trueStd - stats.lo) / (stats.hi - stats.lo || 1)) * W} y2={H - 18}
                stroke="#2f6bff" strokeWidth={2} strokeDasharray="4,3" />
          <text x={((trueStd - stats.lo) / (stats.hi - stats.lo || 1)) * W + 4} y={16} fontSize={9} fill="#2f6bff" fontWeight={700}>
            真实 σ = {trueStd.toFixed(2)}
          </text>
          {/* 估计均值参考线 */}
          <line x1={((stats.avg - stats.lo) / (stats.hi - stats.lo || 1)) * W} y1={8}
                x2={((stats.avg - stats.lo) / (stats.hi - stats.lo || 1)) * W} y2={H - 18}
                stroke={useBessel ? '#047857' : '#dc2626'} strokeWidth={2} />
          <text x={((stats.avg - stats.lo) / (stats.hi - stats.lo || 1)) * W - 4} y={H - 6} fontSize={9}
                fill={useBessel ? '#047857' : '#dc2626'} textAnchor="end" fontWeight={700}>
            理论均值 {theoreticalAvg.toFixed(3)}
          </text>
          <line x1={10} y1={H - 20} x2={W - 10} y2={H - 20} stroke="#cbd5e1" />
          <text x={6} y={H - 8} fontSize={8} fill="#94a3b8">{stats.lo.toFixed(2)}</text>
          <text x={W - 6} y={H - 8} fontSize={8} fill="#94a3b8" textAnchor="end">{stats.hi.toFixed(2)}</text>
        </svg>

        <div>
          <div style={{ background: useBessel ? '#ecfdf5' : '#fef2f2', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '3px' }}>偏差 = E[s] − σ（注意是标准差）</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: useBessel ? '#047857' : '#dc2626' }}>
              {bias >= 0 ? '+' : ''}{bias.toFixed(4)}
            </div>
            <div style={{ fontSize: '0.72rem', color: useBessel ? '#059669' : '#ef4444', marginTop: '3px', fontWeight: 600 }}>
              {useBessel
                ? `✅ E[s²] = σ² 严格无偏；但 E[s] = c₄·σ ≈ ${(c4(n) * 100).toFixed(1)}% σ（标准差仍有偏）`
                : `❌ E[s²] 低估 ${(100 * (1 - (n - 1) / n)).toFixed(1)}% → 系统性偏差`}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px', fontSize: '0.75rem', lineHeight: 1.9 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>样本量 n</span><strong>{n}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>自由度</span><strong>{n - 1}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>理论 E[s]</span><strong>{theoreticalAvg.toFixed(3)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>c₄(n) 修正因子</span><strong>{c4(n).toFixed(4)}</strong>
            </div>
          </div>

          <div style={{ fontSize: '0.74rem', lineHeight: 1.6, color: '#475569', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
            自由度损失的原因：计算样本方差前要先估计均值 x̄，而 Σ(xᵢ−x̄)=0 是一个<b>恒成立的约束</b>——
            知道 n−1 个偏差就能推出最后一个。所以只有 n−1 份「独立的信息」，分母必须是 n−1。
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
        <div>
          <label style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
            <span>样本量 n</span><strong>{n}</strong>
          </label>
          <input type="range" min={2} max={40} step={1} value={n}
                 onChange={(e) => setN(parseInt(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
            <span>真实 σ</span><strong>{trueStd.toFixed(2)}</strong>
          </label>
          <input type="range" min={0.5} max={2} step={0.1} value={trueStd}
                 onChange={(e) => setTrueStd(parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
      </div>

      <div style={{ marginTop: '10px', fontSize: '0.74rem', color: '#64748b', textAlign: 'center' }}>
        把 n 调到 2 看看偏差有多大（n=2 时除以 n 会低估约 20%），再把 n 调到 40 看偏差如何收敛。
      </div>
    </div>
  );
}
