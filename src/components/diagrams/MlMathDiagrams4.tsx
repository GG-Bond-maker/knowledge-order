/**
 * 机器学习数学基础 · 专用交互图（第四批，收官）
 *
 *   MatrixTransformDemo   矩阵作为线性变换：旋转/伸缩/秩亏（对应 l1-2）
 *   DirectionalDerivDemo  偏导、方向导数与最速下降方向（对应 l3-1）
 *   ChainRuleGraphDemo    计算图与链式法则的逐节点回传（对应 l3-3）
 *   DistributionFamilyDemo 常见分布族形态与参数影响（对应 l4-2）
 *   LLNCLTDemo            大数定律与中心极限定理（对应 l4-3）
 *   MleMapDemo            MLE 与 MAP：先验如何拉偏估计（对应 l5-2）
 *   ConvexityDemo         凸集凸函数、割线与一阶条件（对应 l6-1）
 *   GdConvergenceDemo     步长、条件数与收敛速率（对应 l6-2）
 */

import { useState, useMemo } from 'react';

/* ────────────────────────────────────────────────────────────
 *  1. 矩阵作为线性变换
 * ──────────────────────────────────────────────────────────── */

export function MatrixTransformDemo() {
  const [a, setA] = useState(1.4);
  const [b, setB] = useState(0.6);
  const [c, setC] = useState(0.2);
  const [d, setD] = useState(1.1);

  // 单位正方形的四个角 + 基向量
  const corners: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const apply = (x: number, y: number): [number, number] => [a * x + b * y, c * x + d * y];
  const mapped = corners.map(([x, y]) => apply(x, y));
  const poly = mapped.map(([x, y]) => `${x},${y}`).join(' ');

  const det = a * d - b * c;
  const rank = Math.abs(det) < 0.05 ? 1 : 2;
  const trace = a + d;

  // 2x2 特征值
  const disc = trace * trace / 4 - det;
  const l1 = disc >= 0 ? trace / 2 + Math.sqrt(disc) : NaN;
  const l2 = disc >= 0 ? trace / 2 - Math.sqrt(disc) : NaN;

  const OX = 200;
  const OY = 185;
  const S = 70;
  const px = (x: number) => OX + x * S;
  const py = (y: number) => OY - y * S;

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '880px', margin: '1.5rem auto' }}>
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
          🔄 矩阵即线性变换：单位方格被怎样拉伸、旋转、压扁
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
          灰色是原始单位方格，蓝色是变换后的像。<b>行列式 = 面积缩放倍数</b>；
          把行列式调到 0（矩阵奇异），方格被压成一条线——秩从 2 降到 1，信息丢失。
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 250px', gap: '16px', alignItems: 'start' }}>
        <svg viewBox="0 0 400 370" style={{ width: '100%', background: '#fbfcff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          {[-2, -1, 1, 2].map((i) => (
            <g key={`mg${i}`}>
              <line x1={px(i)} y1={10} x2={px(i)} y2={360} stroke="#eef2f7" />
              <line x1={10} y1={py(i)} x2={390} y2={py(i)} stroke="#eef2f7" />
            </g>
          ))}
          <line x1={12} y1={OY} x2={388} y2={OY} stroke="#cbd5e1" />
          <line x1={OX} y1={12} x2={OX} y2={358} stroke="#cbd5e1" />

          {/* 原始单位方格 */}
          <polygon points={corners.map(([x, y]) => `${px(x)},${py(y)}`).join(' ')}
                   fill="rgba(148,163,184,0.15)" stroke="#94a3b8" strokeWidth={1.4} strokeDasharray="4,3" />

          {/* 变换后的像 */}
          <polygon points={mapped.map(([x, y]) => `${px(x)},${py(y)}`).join(' ')}
                   fill="rgba(47,107,255,0.16)" stroke="#2f6bff" strokeWidth={2.2} />

          {/* 基向量（变换后） */}
          <line x1={OX} y1={OY} x2={px(a)} y2={py(c)} stroke="#ef4444" strokeWidth={2.4} />
          <circle cx={px(a)} cy={py(c)} r={3.5} fill="#ef4444" />
          <text x={px(a) + 6} y={py(c) + 4} fontSize={10} fill="#dc2626" fontWeight={700}>M·e₁</text>

          <line x1={OX} y1={OY} x2={px(b)} y2={py(d)} stroke="#10b981" strokeWidth={2.4} />
          <circle cx={px(b)} cy={py(d)} r={3.5} fill="#10b981" />
          <text x={px(b) + 6} y={py(d) - 6} fontSize={10} fill="#047857" fontWeight={700}>M·e₂</text>

          {/* 原始基向量（淡） */}
          <line x1={OX} y1={OY} x2={px(1)} y2={py(0)} stroke="#fca5a5" strokeWidth={1.2} strokeDasharray="3,2" />
          <line x1={OX} y1={OY} x2={px(0)} y2={py(1)} stroke="#6ee7b7" strokeWidth={1.2} strokeDasharray="3,2" />
        </svg>

        <div>
          <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px', fontFamily: 'ui-monospace, monospace', fontSize: '0.78rem', lineHeight: 1.7 }}>
            <div style={{ color: '#64748b', fontFamily: 'inherit' }}>M =</div>
            <div>[ {a.toFixed(2)}  {b.toFixed(2)} ]</div>
            <div>[ {c.toFixed(2)}  {d.toFixed(2)} ]</div>
          </div>

          <div style={{ background: rank === 2 ? '#eff6ff' : '#fef2f2', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '3px' }}>行列式 det(M) = ad − bc</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: rank === 2 ? '#1d4ed8' : '#dc2626' }}>
              {det.toFixed(3)}
            </div>
            <div style={{ fontSize: '0.72rem', marginTop: '3px', color: rank === 2 ? '#3b82f6' : '#ef4444', fontWeight: 600 }}>
              {rank === 2
                ? `面积缩放 ${Math.abs(det).toFixed(2)}×${det < 0 ? '（含翻转）' : ''}`
                : '⚠️ 奇异矩阵：被压成一条线，秩 = 1'}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px', fontSize: '0.75rem', lineHeight: 1.8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>秩 rank</span><strong>{rank}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>迹 tr(M)</span><strong>{trace.toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>特征值</span>
              <strong style={{ fontSize: '0.72rem' }}>
                {isNaN(l1) ? '复根（旋转）' : `${l1.toFixed(2)}, ${l2.toFixed(2)}`}
              </strong>
            </div>
          </div>

          <div style={{ fontSize: '0.74rem', lineHeight: 1.6, color: '#475569', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
            det(M) = λ₁λ₂：面积缩放等于两个特征方向伸缩倍数的乘积。
            真正的「旋转」矩阵 det=1（保面积）但有复特征值——此时没有实特征向量，任何一个方向都被拧转。
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
        {[
          ['a (M₁₁)', a, setA],
          ['b (M₁₂)', b, setB],
          ['c (M₂₁)', c, setC],
          ['d (M₂₂)', d, setD],
        ].map(([label, val, setter], i) => (
          <div key={i}>
            <label style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
              <span>{label as string}</span><strong>{(val as number).toFixed(2)}</strong>
            </label>
            <input type="range" min={-2} max={2.5} step={0.05} value={val as number}
                   onChange={(e) => (setter as (v: number) => void)(parseFloat(e.target.value))}
                   style={{ width: '100%' }} />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
        {[
          ['单位阵', [1, 0, 0, 1]],
          ['旋转 45°', [0.707, -0.707, 0.707, 0.707]],
          ['纯拉伸', [2, 0, 0, 0.5]],
          ['奇异（秩1）', [1, 0, 1, 0]],
        ].map(([label, vals], i) => (
          <button key={i}
            onClick={() => { const v = vals as number[]; setA(v[0]); setB(v[1]); setC(v[2]); setD(v[3]); }}
            style={{ flex: '1 1 auto', padding: '6px 10px', borderRadius: '6px', border: '1px solid #2f6bff', background: '#eff6ff', color: '#1d4ed8', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
            {label as string}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 *  2. 方向导数与最速下降
 * ──────────────────────────────────────────────────────────── */

export function DirectionalDerivDemo() {
  const [angle, setAngle] = useState(40);
  const [ax, setAx] = useState(1.5); // f(x,y)=0.5(ax·x² + ay·y²) 的曲率
  const [ay, setAy] = useState(3.0);
  const [ptx, setPtx] = useState(-1.0);
  const [pty, setPty] = useState(1.0);

  // 梯度 ∇f = (ax·x, ay·y)
  const gx = ax * ptx;
  const gy = ay * pty;
  const gnorm = Math.hypot(gx, gy);

  // 方向导数 D_u f = ∇f · u
  const rad = (angle * Math.PI) / 180;
  const ux = Math.cos(rad);
  const uy = Math.sin(rad);
  const dirDeriv = gx * ux + gy * uy;
  const cosWithGrad = gnorm > 1e-9 ? dirDeriv / gnorm : 0;

  const OX = 200;
  const OY = 175;
  const S = 58;
  const px = (x: number) => OX + x * S;
  const py = (y: number) => OY - y * S;

  // 等高线
  const levels = [0.3, 0.7, 1.2, 1.9, 2.8, 3.9];

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '880px', margin: '1.5rem auto' }}>
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
          🧭 方向导数与最速下降：梯度指向增长最快的方向
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
          拖动「方向角」，红色箭头是梯度 ∇f，蓝色箭头是你选的方向 u。
          方向导数 = ∇f·u = |∇f|cosθ，<b>只有 u 与梯度同向时取到最大值</b>——这就是「最速下降 = 负梯度」的完整证明。
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 250px', gap: '16px', alignItems: 'start' }}>
        <svg viewBox="0 0 400 350" style={{ width: '100%', background: '#fbfcff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <line x1={12} y1={OY} x2={388} y2={OY} stroke="#e2e8f0" />
          <line x1={OX} y1={12} x2={OX} y2={338} stroke="#e2e8f0" />

          {/* 等高线椭圆 */}
          {levels.map((lvl, i) => {
            const rx = Math.sqrt((2 * lvl) / ax) * S;
            const ry = Math.sqrt((2 * lvl) / ay) * S;
            return <ellipse key={`dc${i}`} cx={px(0)} cy={py(0)} rx={rx} ry={ry}
                            fill="none" stroke="#dbeafe" strokeWidth={1.2} />;
          })}

          {/* 梯度方向线（沿梯度的射线，示意「等高线法向」） */}
          {gnorm > 1e-6 && (
            <line x1={px(ptx)} y1={py(pty)}
                  x2={px(ptx + (gx / gnorm) * 1.1)} y2={py(pty + (gy / gnorm) * 1.1)}
                  stroke="#f87171" strokeWidth={1} strokeDasharray="3,2" />
          )}

          {/* 梯度箭头 */}
          {gnorm > 1e-6 && (
            <>
              <line x1={px(ptx)} y1={py(pty)}
                    x2={px(ptx + (gx / gnorm) * 0.85)} y2={py(pty + (gy / gnorm) * 0.85)}
                    stroke="#ef4444" strokeWidth={2.6} />
              <circle cx={px(ptx + (gx / gnorm) * 0.85)} cy={py(pty + (gy / gnorm) * 0.85)} r={3.5} fill="#ef4444" />
              <text x={px(ptx + (gx / gnorm) * 0.9)} y={py(pty + (gy / gnorm) * 0.9) - 6}
                    fontSize={10} fill="#dc2626" fontWeight={700}>∇f</text>
            </>
          )}

          {/* 方向 u 箭头 */}
          <line x1={px(ptx)} y1={py(pty)} x2={px(ptx + ux * 0.85)} y2={py(pty + uy * 0.85)}
                stroke="#2f6bff" strokeWidth={2.6} />
          <circle cx={px(ptx + ux * 0.85)} cy={py(pty + uy * 0.85)} r={3.5} fill="#2f6bff" />
          <text x={px(ptx + ux * 0.9)} y={py(pty + uy * 0.9) + 12}
                fontSize={10} fill="#1d4ed8" fontWeight={700}>u</text>

          {/* 探针点 */}
          <circle cx={px(ptx)} cy={py(pty)} r={5} fill="#7c5cff" stroke="#fff" strokeWidth={1.5} />
        </svg>

        <div>
          <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '2px' }}>方向导数 D_u f = ∇f·u</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: dirDeriv >= 0 ? '#047857' : '#dc2626' }}>
              {dirDeriv >= 0 ? '+' : ''}{dirDeriv.toFixed(3)}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '3px' }}>
              = |∇f|cosθ = {gnorm.toFixed(2)} × {cosWithGrad.toFixed(2)}
            </div>
          </div>

          <div style={{ background: '#eff6ff', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px', fontSize: '0.75rem', lineHeight: 1.8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>梯度模长 |∇f|</span><strong>{gnorm.toFixed(3)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>与梯度夹角</span>
              <strong>{(Math.acos(Math.max(-1, Math.min(1, cosWithGrad))) * 180 / Math.PI).toFixed(1)}°</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>是否最速方向</span>
              <strong style={{ color: Math.abs(cosWithGrad - 1) < 0.02 ? '#047857' : '#b45309' }}>
                {Math.abs(cosWithGrad - 1) < 0.02 ? '✅ 是' : '否'}
              </strong>
            </div>
          </div>

          <div style={{ fontSize: '0.74rem', lineHeight: 1.6, color: '#475569', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
            证明要点：对任意单位向量 u，D_u f = ∇f·u = |∇f||u|cosθ = |∇f|cosθ。
            因为 cosθ ≤ 1，最大值只在 θ=0（u 与 ∇f 同向）时取到。所以「上升最快 = 梯度方向」，
            「下降最快 = 负梯度方向」。<b>注意梯度方向垂直于等高线</b>（图上红虚线与椭圆正交）。
          </div>

          <button
            onClick={() => {
              const target = (Math.atan2(gy, gx) * 180) / Math.PI;
              setAngle(Math.round(((target % 360) + 360) % 360));
            }}
            style={{ width: '100%', marginTop: '10px', padding: '7px', borderRadius: '6px', border: '1px solid #ef4444', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
          >
            把 u 对齐到梯度（看向导最大）
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginTop: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
        {[
          ['方向角 θ', angle, setAngle, 0, 360, 1],
          ['曲率 aₓ', ax, setAx, 0.5, 4, 0.1],
          ['曲率 a_y', ay, setAy, 0.5, 4, 0.1],
          ['点的 x', ptx, setPtx, -2, 2, 0.1],
          ['点的 y', pty, setPty, -2, 2, 0.1],
        ].map(([label, val, setter, min, max, step], i) => (
          <div key={i}>
            <label style={{ fontSize: '0.7rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
              <span>{label as string}</span><strong>{(val as number).toFixed(i === 0 ? 0 : 2)}</strong>
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
 *  3. 计算图与链式法则
 * ──────────────────────────────────────────────────────────── */

export function ChainRuleGraphDemo() {
  const [x, setX] = useState(2);
  const [y, setY] = useState(-3);
  const [z, setZ] = useState(-1); // z 是中间变量：a = x*y, b = a + z...
  const [sel, setSel] = useState<'a' | 'b' | 'c'>('c');

  // 计算图：
  //   a = x * y
  //   b = a + z
  //   c = b²   （最终输出 L = c）
  const A = x * y;
  const B = A + z;
  const C = B * B;

  // 反向：dC/dB = 2B；dB/dA = 1，dB/dz = 1；dA/dx = y，dA/dy = x
  const dCdB = 2 * B;
  const dBdA = 1;
  const dBdz = 1;
  const dAdx = y;
  const dAdy = x;

  // 链式累积
  const dCdx = dCdB * dBdA * dAdx;
  const dCdy = dCdB * dBdA * dAdy;
  const dCdz = dCdB * dBdz;

  const nodes = [
    { id: 'x', label: 'x', val: x, grad: dCdx, op: '输入' },
    { id: 'y', label: 'y', val: y, grad: dCdy, op: '输入' },
    { id: 'z', label: 'z', val: z, grad: dCdz, op: '输入' },
    { id: 'a', label: 'a = x·y', val: A, grad: dCdB * dBdA, op: '×' },
    { id: 'b', label: 'b = a+z', val: B, grad: dCdB, op: '+' },
    { id: 'c', label: 'L = b²', val: C, grad: 1, op: '平方' },
  ];

  const nodePos: Record<string, [number, number]> = {
    x: [80, 55], y: [80, 155], z: [80, 255],
    a: [245, 105], b: [385, 175], c: [500, 175],
  };

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '900px', margin: '1.5rem auto' }}>
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
          🔗 计算图与链式法则：梯度如何逐节点回传
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
          前向：a=x·y → b=a+z → L=b²。反向：从 L 开始，每个节点把「上游梯度 × 本地偏导」传给下游。
          点任意变量看它的梯度如何被一条链乘出来。
        </p>
      </div>

      <svg viewBox="0 0 580 310" style={{ width: '100%', background: '#fbfcff', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '12px' }}>
        <defs>
          <marker id="crArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
          </marker>
          <marker id="crArrowB" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
          </marker>
        </defs>

        {/* 前向边 */}
        {[['x', 'a'], ['y', 'a'], ['a', 'b'], ['z', 'b'], ['b', 'c']].map(([f, t], i) => {
          const [x1, y1] = nodePos[f];
          const [x2, y2] = nodePos[t];
          return <line key={`fe${i}`} x1={x1 + 42} y1={y1} x2={x2 - 42} y2={y2}
                       stroke="#cbd5e1" strokeWidth={1.6} markerEnd="url(#crArrow)" />;
        })}

        {/* 反向边（红色虚线，反向） */}
        {[['b', 'a'], ['a', 'x'], ['a', 'y'], ['b', 'z']].map(([f, t], i) => {
          const [x1, y1] = nodePos[f];
          const [x2, y2] = nodePos[t];
          return <line key={`be${i}`} x1={x1 - 42} y1={y1 + 16} x2={x2 + 42} y2={y2 + 16}
                       stroke="#fca5a5" strokeWidth={1.3} strokeDasharray="4,3" markerEnd="url(#crArrowB)" />;
        })}

        {/* 节点 */}
        {nodes.map((n) => {
          const [cx, cy] = nodePos[n.id];
          const isSel = (n.id === 'c' && sel === 'c') || (n.id === 'b' && sel === 'b') || (n.id === 'a' && sel === 'a');
          return (
            <g key={n.id} onClick={() => setSel(n.id as 'a' | 'b' | 'c')} style={{ cursor: 'pointer' }}>
              <rect x={cx - 42} y={cy - 19} width={84} height={38} rx={6}
                    fill={isSel ? 'rgba(47,107,255,0.12)' : '#fff'}
                    stroke={isSel ? '#2f6bff' : '#cbd5e1'} strokeWidth={isSel ? 2 : 1.3} />
              <text x={cx} y={cy - 5} fontSize={10} textAnchor="middle" fill="#0f172a" fontWeight={600}>
                {n.label}
              </text>
              <text x={cx} y={cy + 10} fontSize={8.5} textAnchor="middle" fill="#64748b" fontFamily="ui-monospace, monospace">
                {n.val.toFixed(2)} | ∂={n.grad.toFixed(1)}
              </text>
            </g>
          );
        })}

        <text x={12} y={20} fontSize={9} fill="#94a3b8">前向 →（灰实线）　反向 ←（红虚线）</text>
      </svg>

      <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', marginBottom: '12px' }}>
        <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>
          链式展开（每个变量的梯度 = 沿途局部偏导的连乘）
        </div>
        <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.76rem', lineHeight: 2.0, color: '#334155' }}>
          <div>∂L/∂b = 2b = 2×({B.toFixed(2)}) = <b>{dCdB.toFixed(3)}</b></div>
          <div>∂L/∂a = ∂L/∂b · ∂b/∂a = {dCdB.toFixed(3)} × {dBdA} = <b>{(dCdB * dBdA).toFixed(3)}</b></div>
          <div>∂L/∂z = ∂L/∂b · ∂b/∂z = {dCdB.toFixed(3)} × {dBdz} = <b>{dCdz.toFixed(3)}</b></div>
          <div>∂L/∂x = ∂L/∂b · ∂b/∂a · ∂a/∂x = {dCdB.toFixed(2)}×{dBdA}×({dAdx.toFixed(2)}) = <b style={{ color: '#dc2626' }}>{dCdx.toFixed(3)}</b></div>
          <div>∂L/∂y = ∂L/∂b · ∂b/∂a · ∂a/∂y = {dCdB.toFixed(2)}×{dBdA}×({dAdy.toFixed(2)}) = <b style={{ color: '#dc2626' }}>{dCdy.toFixed(3)}</b></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
        {[
          ['x', x, setX], ['y', y, setY], ['z', z, setZ],
        ].map(([label, val, setter], i) => (
          <div key={i}>
            <label style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
              <span>{label as string}</span><strong>{(val as number).toFixed(1)}</strong>
            </label>
            <input type="range" min={-4} max={4} step={0.5} value={val as number}
                   onChange={(e) => (setter as (v: number) => void)(parseFloat(e.target.value))}
                   style={{ width: '100%' }} />
          </div>
        ))}
      </div>

      <div style={{ marginTop: '10px', fontSize: '0.76rem', lineHeight: 1.6, color: '#475569', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px' }}>
        <b>反向传播的核心</b>：每个节点只需知道「本地偏导」（乘法节点的 ∂a/∂x = y，加法节点是 1，平方是 2b），
        上游传来的梯度乘上它再往下传。<b>这就是为什么深度学习框架只需为每个算子定义一次 backward</b>，
        任意复杂的网络都能自动求导。复杂度：反向与正向同阶（O(1) 次前向的开销）。
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 *  4. 常见分布族
 * ──────────────────────────────────────────────────────────── */

export function DistributionFamilyDemo() {
  const [kind, setKind] = useState<'normal' | 'laplace' | 'uniform' | 'exponential' | 'bernoulli'>('normal');
  const [p1, setP1] = useState(0);    // 均值 / 位置
  const [p2, setP2] = useState(1);    // 标准差 / 尺度

  const W = 380;
  const H = 210;
  const XMIN = -5;
  const XMAX = 5;
  const gx = (x: number) => ((x - XMIN) / (XMAX - XMIN)) * W + 10;
  const gy = (y: number) => H - 26 - y * 95;

  const pdf = (x: number): number => {
    switch (kind) {
      case 'normal': {
        const sd = Math.max(0.15, p2);
        return (1 / (sd * Math.sqrt(2 * Math.PI))) * Math.exp(-((x - p1) ** 2) / (2 * sd * sd));
      }
      case 'laplace': {
        const b = Math.max(0.15, p2);
        return (1 / (2 * b)) * Math.exp(-Math.abs(x - p1) / b);
      }
      case 'uniform': {
        const w = Math.max(0.3, p2) * 2;
        return Math.abs(x - p1) <= w / 2 ? 1 / w : 0;
      }
      case 'exponential': {
        const lam = Math.max(0.1, p2);
        return x >= 0 ? lam * Math.exp(-lam * x) : 0;
      }
      case 'bernoulli': {
        // 用两条竖线表示离散概率
        return 0;
      }
    }
  };

  const curve = useMemo(() => {
    if (kind === 'bernoulli') return '';
    const pts: string[] = [];
    const gap = Math.abs(1 / Math.max(0.1, p2) * 5) > 3 ? 0.35 : 0.06;
    let prevY = -1;
    for (let i = 0; i <= 240; i++) {
      const x = XMIN + ((XMAX - XMIN) * i) / 240;
      const y = pdf(x);
      if (prevY >= 0 && Math.abs(y - prevY) > 2.5) {
        pts.push(`L${gx(x - gap).toFixed(1)},${gy(prevY).toFixed(1)}`);
      }
      pts.push(`${i === 0 ? 'M' : 'L'}${gx(x).toFixed(1)},${gy(y).toFixed(1)}`);
      prevY = y;
    }
    return pts.join(' ');
  }, [kind, p1, p2]);

  const info: Record<string, { name: string; formula: string; mean: string; varS: string; note: string }> = {
    normal: {
      name: '正态分布 N(μ, σ²)',
      formula: 'f(x) = 1/(σ√(2π))·exp(−(x−μ)²/(2σ²))',
      mean: `μ = ${p1.toFixed(1)}`,
      varS: `σ² = ${(p2 * p2).toFixed(2)}`,
      note: '指数族成员；最小二乘等价于「高斯噪声下的 MLE」。尾部按 e^(−x²) 衰减，极薄。',
    },
    laplace: {
      name: '拉普拉斯分布 Laplace(μ, b)',
      formula: 'f(x) = 1/(2b)·exp(−|x−μ|/b)',
      mean: `μ = ${p1.toFixed(1)}`,
      varS: `2b² = ${(2 * p2 * p2).toFixed(2)}`,
      note: '尖峰厚尾。L1 回归等价于「拉普拉斯噪声下的 MLE」——这就是 L1 对异常值稳健的原因。',
    },
    uniform: {
      name: '均匀分布 U(a, b)',
      formula: 'f(x) = 1/(b−a)，在 [a,b] 内',
      mean: `中点 = ${p1.toFixed(1)}`,
      varS: `(b−a)²/12`,
      note: '最大熵分布在「已知区间」这个约束下就是均匀分布。常用于初始化（Xavier/He）。',
    },
    exponential: {
      name: '指数分布 Exp(λ)',
      formula: 'f(x) = λ·exp(−λx)，x ≥ 0',
      mean: `1/λ = ${(1 / Math.max(0.1, p2)).toFixed(2)}`,
      varS: `1/λ² = ${(1 / (p2 * p2)).toFixed(2)}`,
      note: '无记忆性；是泊松过程的间隔分布。也是「已知均值」约束下的最大熵分布。',
    },
    bernoulli: {
      name: '伯努利分布 Bernoulli(p)',
      formula: 'P(X=1) = p，P(X=0) = 1−p',
      mean: `p = ${(Math.min(0.95, Math.max(0.05, p2 / 2))).toFixed(2)}`,
      varS: 'p(1−p)',
      note: '二分类的似然；交叉熵损失就是它的负对数似然。',
    },
  };
  const cur = info[kind];
  const bernP = Math.min(0.95, Math.max(0.05, p2 / 2));

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '880px', margin: '1.5rem auto' }}>
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
          📈 常见分布族：形状、参数与它们对应的损失函数
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
          切换分布类型并调参数。注意<b>尾部厚薄</b>：正态尾部极薄（对异常值敏感），
          拉普拉斯尖峰厚尾（稳健）——这直接决定了「用 MSE 还是 MAE」。
        </p>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {([['normal', '正态'], ['laplace', '拉普拉斯'], ['uniform', '均匀'], ['exponential', '指数'], ['bernoulli', '伯努利']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setKind(k)}
            style={{
              flex: '1 1 auto', padding: '7px 10px', borderRadius: '6px',
              border: `1px solid ${kind === k ? '#2f6bff' : '#cbd5e1'}`,
              background: kind === k ? '#2f6bff' : '#fff',
              color: kind === k ? '#fff' : '#475569',
              cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
            }}>
            {label}
          </button>
        ))}
      </div>

      <svg viewBox={`0 0 ${W + 20} ${H}`} style={{ width: '100%', background: '#fbfcff', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '12px' }}>
        <line x1={10} y1={H - 26} x2={W + 10} y2={H - 26} stroke="#cbd5e1" />
        {[-4, -2, 0, 2, 4].map((t) => (
          <g key={`dt${t}`}>
            <line x1={gx(t)} y1={H - 26} x2={gx(t)} y2={H - 22} stroke="#94a3b8" />
            <text x={gx(t)} y={H - 12} fontSize={8} fill="#94a3b8" textAnchor="middle">{t}</text>
          </g>
        ))}

        {kind === 'bernoulli' ? (
          <>
            {[{ x: 0, p: 1 - bernP, label: '0' }, { x: 1, p: bernP, label: '1' }].map((b, i) => (
              <g key={`br${i}`}>
                <line x1={gx(b.x)} y1={H - 26} x2={gx(b.x)} y2={gy(b.p)} stroke="#2f6bff" strokeWidth={8} strokeLinecap="round" />
                <text x={gx(b.x) + 12} y={gy(b.p) + 4} fontSize={10} fill="#1d4ed8" fontWeight={700}>
                  {b.p.toFixed(2)}
                </text>
                <text x={gx(b.x)} y={H - 34} fontSize={9} fill="#64748b" textAnchor="middle">{b.label}</text>
              </g>
            ))}
            <line x1={gx(0.5)} y1={H - 26} x2={gx(0.5)} y2={20} stroke="#e2e8f0" strokeDasharray="3,3" />
          </>
        ) : (
          <path d={curve} fill="none" stroke="#2f6bff" strokeWidth={2.4} />
        )}
        <text x={12} y={18} fontSize={9} fill="#64748b">{cur.name}</text>
      </svg>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '0.75rem', lineHeight: 1.8 }}>
          <div style={{ fontFamily: 'ui-monospace, monospace', color: '#334155', marginBottom: '6px' }}>{cur.formula}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>期望</span><strong>{cur.mean}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>方差</span><strong>{cur.varS}</strong>
          </div>
        </div>
        <div style={{ background: '#eff6ff', padding: '10px 12px', borderRadius: '8px', fontSize: '0.75rem', lineHeight: 1.7, color: '#334155' }}>
          {cur.note}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
        <div>
          <label style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
            <span>{kind === 'bernoulli' ? '（离散，无位置）' : '位置 / 均值 μ'}</span>
            <strong>{p1.toFixed(1)}</strong>
          </label>
          <input type="range" min={-3} max={3} step={0.2} value={p1}
                 onChange={(e) => setP1(parseFloat(e.target.value))}
                 disabled={kind === 'bernoulli'}
                 style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
            <span>{kind === 'bernoulli' ? '概率参数（×2）' : '尺度 / 标准差 σ'}</span>
            <strong>{p2.toFixed(2)}</strong>
          </label>
          <input type="range" min={0.2} max={2.5} step={0.05} value={p2}
                 onChange={(e) => setP2(parseFloat(e.target.value))}
                 style={{ width: '100%' }} />
        </div>
      </div>
    </div>
  );
}
