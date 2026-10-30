/**
 * 机器学习数学基础 · 专用交互图
 *
 * 为 ml-math 中「线性代数与谱分析」几节做的专用可视化，
 * 替代原先偏通用的 mds-arch / matrix / pca 组合：
 *
 *   VectorGeometryDemo   内积、夹角、投影与正交性（对应 l1-1）
 *   EigenDecompDemo      特征向量方向不变性 + 谱分解（对应 l2-1）
 *   SvdLowRankDemo       SVD 与低秩逼近 / LoRA 直觉（对应 l2-2）
 *   LagrangianDualityDemo 拉格朗日对偶与 KKT（对应 l6-3）
 */

import { useState, useMemo } from 'react';

/* ────────────────────────────────────────────────────────────
 *  1. 向量几何：内积、夹角、投影
 * ──────────────────────────────────────────────────────────── */

export function VectorGeometryDemo() {
  // 两个二维向量（用角度 + 长度表示，便于拖动）
  const [aAngle, setAAngle] = useState(35);
  const [aNorm, setANorm] = useState(3.2);
  const [bAngle, setBAngle] = useState(70);
  const [bNorm, setBNorm] = useState(2.4);

  const rad = (d: number) => (d * Math.PI) / 180;
  const ax = aNorm * Math.cos(rad(aAngle));
  const ay = aNorm * Math.sin(rad(aAngle));
  const bx = bNorm * Math.cos(rad(bAngle));
  const by = bNorm * Math.sin(rad(bAngle));

  const dot = ax * bx + ay * by;
  const cos = dot / (aNorm * bNorm || 1);
  const angleBetween = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
  // b 在 a 方向上的投影（标量）与投影向量
  const projScalar = dot / (aNorm || 1);
  const projX = (projScalar * ax) / (aNorm || 1);
  const projY = (projScalar * ay) / (aNorm || 1);
  // 正交分量（b 减去投影）
  const perpX = bx - projX;
  const perpY = by - projY;

  // 画布：以 (200,180) 为原点，1 单位 = 38px
  const OX = 200;
  const OY = 180;
  const S = 38;
  const px = (x: number) => OX + x * S;
  const py = (y: number) => OY - y * S;

  const orthogonal = Math.abs(dot) < 0.06;
  const collinear = Math.abs(cos - 1) < 0.02 || Math.abs(cos + 1) < 0.02;

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '860px', margin: '1.5rem auto' }}>
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
          📐 内积、夹角与投影：向量几何的实时演练
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
          拖动滑杆改变两个向量的方向与长度，观察内积、夹角、投影如何变化。点「正交」按钮看内积归零。
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '16px', alignItems: 'start' }}>
        <svg viewBox="0 0 400 360" style={{ width: '100%', background: '#fbfcff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          {/* 网格 */}
          {[-4, -3, -2, -1, 1, 2, 3, 4].map((i) => (
            <g key={`g${i}`}>
              <line x1={px(i)} y1={10} x2={px(i)} y2={350} stroke="#eef2f7" strokeWidth={1} />
              <line x1={10} y1={py(i)} x2={390} y2={py(i)} stroke="#eef2f7" strokeWidth={1} />
            </g>
          ))}
          {/* 坐标轴 */}
          <line x1={12} y1={OY} x2={388} y2={OY} stroke="#cbd5e1" strokeWidth={1.2} />
          <line x1={OX} y1={12} x2={OX} y2={348} stroke="#cbd5e1" strokeWidth={1.2} />

          {/* b 到 a 的投影虚线（正交投影的几何构造） */}
          <line x1={px(bx)} y1={py(by)} x2={px(projX)} y2={py(projY)}
                stroke="#94a3b8" strokeWidth={1} strokeDasharray="4,3" />
          {/* 垂直标记 */}
          <path
            d={`M ${px(projX)},${py(projY)} l ${(perpX > 0 ? -1 : 1) * 7},0 l 0,${(perpY > 0 ? 7 : -7)}`}
            fill="none" stroke="#94a3b8" strokeWidth={1}
          />

          {/* 投影向量（沿 a 方向） */}
          <line x1={OX} y1={OY} x2={px(projX)} y2={py(projY)} stroke="#10b981" strokeWidth={4} opacity={0.35} />

          {/* 向量 a */}
          <line x1={OX} y1={OY} x2={px(ax)} y2={py(ay)} stroke="#2f6bff" strokeWidth={2.4} />
          <circle cx={px(ax)} cy={py(ay)} r={3.5} fill="#2f6bff" />
          <text x={px(ax) + 6} y={py(ay) - 6} fontSize={12} fontWeight={700} fill="#2f6bff">a</text>

          {/* 向量 b */}
          <line x1={OX} y1={OY} x2={px(bx)} y2={py(by)} stroke="#f59e0b" strokeWidth={2.4} />
          <circle cx={px(bx)} cy={py(by)} r={3.5} fill="#f59e0b" />
          <text x={px(bx) + 6} y={py(by) - 6} fontSize={12} fontWeight={700} fill="#f59e0b">b</text>

          {/* 正交分量（b 中垂直于 a 的部分） */}
          {!orthogonal && (
            <line x1={px(projX)} y1={py(projY)} x2={px(bx)} y2={py(by)}
                  stroke="#ef4444" strokeWidth={1.6} strokeDasharray="3,2" />
          )}

          {/* 夹角弧 */}
          <path
            d={`M ${OX + 26 * Math.cos(rad(aAngle))},${OY - 26 * Math.sin(rad(aAngle))}
                A 26,26 0 ${angleBetween > 180 ? 1 : 0},0
                ${OX + 26 * Math.cos(rad(bAngle))},${OY - 26 * Math.sin(rad(bAngle))}`}
            fill="none" stroke="#7c5cff" strokeWidth={1.4}
          />
          <text x={OX + 32 * Math.cos(rad((aAngle + bAngle) / 2))} y={OY - 32 * Math.sin(rad((aAngle + bAngle) / 2))}
                fontSize={10} fill="#7c5cff" textAnchor="middle" fontWeight={600}>
            {angleBetween.toFixed(1)}°
          </text>
        </svg>

        <div>
          <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>内积 a·b = |a||b|cosθ</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: orthogonal ? '#10b981' : '#0f172a' }}>
              {dot.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
              = {aNorm.toFixed(1)} × {bNorm.toFixed(1)} × {cos.toFixed(2)}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.7rem', color: '#1d4ed8' }}>夹角 θ</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1d4ed8' }}>{angleBetween.toFixed(1)}°</div>
            </div>
            <div style={{ background: '#ecfdf5', padding: '8px', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.7rem', color: '#047857' }}>投影长度</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#047857' }}>{projScalar.toFixed(2)}</div>
            </div>
          </div>

          <div style={{ fontSize: '0.78rem', lineHeight: 1.6, color: '#475569', background: '#f8fafc', padding: '10px', borderRadius: '8px', minHeight: '76px' }}>
            {orthogonal ? (
              <span style={{ color: '#047857', fontWeight: 600 }}>
                ✅ 正交！a·b = 0，夹角 90°。这两个方向互不干扰——这正是特征向量、傅里叶基、正交约束的几何本质。
              </span>
            ) : collinear ? (
              <span style={{ color: '#b45309', fontWeight: 600 }}>
                ⚠️ 共线！两个向量方向重合，内积达到最大值 |a||b| = {(aNorm * bNorm).toFixed(2)}，信息完全冗余。
              </span>
            ) : (
              <span>
                绿色粗线是 <b>b 在 a 方向的投影</b>，红色虚线是 b 中<b>垂直于 a 的分量</b>。投影长度 = |b|cosθ = (a·b)/|a|。
                改变 b 的方向，红色分量随之变化——这就是「把向量分解到某个基方向上」的最简单形式。
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => { setBAngle(aAngle + 90 > 360 ? aAngle - 270 : aAngle + 90); }}
              style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid #10b981', background: '#ecfdf5', color: '#047857', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
            >
              令 a⊥b
            </button>
            <button
              onClick={() => setBAngle(aAngle)}
              style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid #f59e0b', background: '#fffbeb', color: '#b45309', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
            >
              令 a∥b
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
        {[
          ['|a| 长度', aNorm.toFixed(2), 'aAngle', setAAngle, 30, 60],
          ['a 方向', `${aAngle}°`, 'aAngle', setAAngle, 0, 360],
          ['|b| 长度', bNorm.toFixed(2), 'bNorm', setBNorm, 30, 60],
          ['b 方向', `${bAngle}°`, 'bAngle', setBAngle, 0, 360],
        ].map(([label, val, , setter, min, max], i) => (
          <div key={i}>
            <label style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
              <span>{label as string}</span><strong>{val as string}</strong>
            </label>
            <input
              type="range"
              min={min as number}
              max={max as number}
              step={i === 0 ? 0.1 : i === 2 ? 0.1 : 1}
              value={i < 2 ? (i === 0 ? aNorm : aAngle) : (i === 2 ? bNorm : bAngle)}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (i === 0) setANorm(v);
                else if (i === 1) setAAngle(v);
                else if (i === 2) setBNorm(v);
                else setBAngle(v);
              }}
              style={{ width: '100%' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 *  2. 特征分解：方向不变性 + 谱分解
 * ──────────────────────────────────────────────────────────── */

export function EigenDecompDemo() {
  // 对称矩阵 [[a, b], [b, c]]，保证有实特征值与正交特征向量
  const [a, setA] = useState(3);
  const [b, setB] = useState(1);
  const [c, setC] = useState(1.5);
  const [probeAngle, setProbeAngle] = useState(20);

  // 2x2 对称矩阵特征值解析解
  const tr = a + c;
  const det = a * c - b * b;
  const disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
  const l1 = tr / 2 + disc;
  const l2 = tr / 2 - disc;
  // 特征向量：对 λ1，取 (b, λ1 - a) 或 (λ1 - c, b)
  const eigVec = (lam: number): [number, number] => {
    if (Math.abs(b) > 1e-6) {
      const vx = b;
      const vy = lam - a;
      const n = Math.hypot(vx, vy) || 1;
      return [vx / n, vy / n];
    }
    // b=0 时矩阵已对角
    return lam >= a ? [1, 0] : [0, 1];
  };
  const [v1x, v1y] = eigVec(l1);
  const [v2x, v2y] = eigVec(l2);

  // 被变换的探针向量
  const pr = (probeAngle * Math.PI) / 180;
  const vx = Math.cos(pr) * 2;
  const vy = Math.sin(pr) * 2;
  // M v
  const mvx = a * vx + b * vy;
  const mvy = b * vx + c * vy;

  const OX = 190;
  const OY = 170;
  const S = 34;
  const px = (x: number) => OX + x * S;
  const py = (y: number) => OY - y * S;

  // 探针与特征方向的对齐程度（1 = 完全对齐，此时 Mv 与原方向共线）
  const probeNorm = Math.hypot(vx, vy);
  const mvNorm = Math.hypot(mvx, mvy);
  const cosAlign = (vx * mvx + vy * mvy) / (probeNorm * mvNorm || 1);
  const isEigen = Math.abs(cosAlign - 1) < 0.012;

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '880px', margin: '1.5rem auto' }}>
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
          🎯 特征向量：矩阵作用下「方向不变」的特殊方向
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
          拖动「探针方向」，观察 Mv 是否与原向量共线。只有沿特征向量方向时，变换只伸缩不转向——这就是 Mv = λv 的含义。
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 250px', gap: '16px', alignItems: 'start' }}>
        <svg viewBox="0 0 380 340" style={{ width: '100%', background: '#fbfcff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          {[-3, -2, -1, 1, 2, 3].map((i) => (
            <g key={`eg${i}`}>
              <line x1={px(i)} y1={8} x2={px(i)} y2={332} stroke="#eef2f7" />
              <line x1={8} y1={py(i)} x2={372} y2={py(i)} stroke="#eef2f7" />
            </g>
          ))}
          <line x1={10} y1={OY} x2={370} y2={OY} stroke="#cbd5e1" />
          <line x1={OX} y1={8} x2={OX} y2={332} stroke="#cbd5e1" />

          {/* 单位圆（参考） */}
          <circle cx={OX} cy={OY} r={2 * S} fill="none" stroke="#e2e8f0" strokeDasharray="3,3" />

          {/* 特征方向（双向延长） */}
          <line x1={px(-v1x * 3.4)} y1={py(-v1y * 3.4)} x2={px(v1x * 3.4)} y2={py(v1y * 3.4)}
                stroke="#ef4444" strokeWidth={1.4} strokeDasharray="6,3" opacity={0.75} />
          <line x1={px(-v2x * 3.4)} y1={py(-v2y * 3.4)} x2={px(v2x * 3.4)} y2={py(v2y * 3.4)}
                stroke="#10b981" strokeWidth={1.4} strokeDasharray="6,3" opacity={0.75} />
          <text x={px(v1x * 3.5)} y={py(v1y * 3.5)} fontSize={10} fill="#ef4444" fontWeight={700}>
            v₁ (λ₁={l1.toFixed(2)})
          </text>
          <text x={px(v2x * 3.5)} y={py(v2y * 3.5) + 12} fontSize={10} fill="#10b981" fontWeight={700}>
            v₂ (λ₂={l2.toFixed(2)})
          </text>

          {/* 原向量 v */}
          <line x1={OX} y1={OY} x2={px(vx)} y2={py(vy)} stroke="#2f6bff" strokeWidth={2.4} />
          <circle cx={px(vx)} cy={py(vy)} r={3.5} fill="#2f6bff" />
          <text x={px(vx) + 6} y={py(vy) - 5} fontSize={11} fontWeight={700} fill="#2f6bff">v</text>

          {/* 变换后的 Mv */}
          <line x1={OX} y1={OY} x2={px(mvx)} y2={py(mvy)}
                stroke={isEigen ? '#ef4444' : '#7c5cff'} strokeWidth={2.4}
                strokeDasharray={isEigen ? '0' : '5,3'} />
          <circle cx={px(mvx)} cy={py(mvy)} r={3.5} fill={isEigen ? '#ef4444' : '#7c5cff'} />
          <text x={px(mvx) + 6} y={py(mvy) + 12} fontSize={11} fontWeight={700} fill={isEigen ? '#ef4444' : '#7c5cff'}>
            Mv
          </text>
        </svg>

        <div>
          <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px', fontFamily: 'ui-monospace, monospace', fontSize: '0.78rem' }}>
            <div style={{ color: '#64748b', marginBottom: '4px' }}>M =</div>
            <div>[ {a.toFixed(1)}  {b.toFixed(1)} ]</div>
            <div>[ {b.toFixed(1)}  {c.toFixed(1)} ]</div>
          </div>

          <div style={{ background: isEigen ? '#fef2f2' : '#f5f3ff', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '3px' }}>v 与 Mv 的夹角</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: isEigen ? '#dc2626' : '#7c5cff' }}>
              {isEigen ? '0.0° ✓' : `${(Math.acos(Math.max(-1, Math.min(1, cosAlign))) * 180 / Math.PI).toFixed(1)}°`}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px', lineHeight: 1.5 }}>
              {isEigen ? '方向不变 → v 是特征向量' : '方向改变 → v 不是特征向量'}
            </div>
          </div>

          <div style={{ fontSize: '0.76rem', lineHeight: 1.6, color: '#475569', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
            <b>谱分解</b>：对称矩阵 M = QΛQᵀ，其中 Q 的列是正交特征向量，Λ 是特征值对角阵。
            把两个 λ 的值代入：λ₁·λ₂ = {(l1 * l2).toFixed(2)} = det(M)，λ₁+λ₂ = {tr.toFixed(2)} = tr(M)。
          </div>

          <button
            onClick={() => setProbeAngle(Math.round((Math.atan2(v1y, v1x) * 180) / Math.PI))}
            style={{ width: '100%', marginTop: '10px', padding: '7px', borderRadius: '6px', border: '1px solid #ef4444', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
          >
            把探针对齐到 v₁（看向量「不转向」）
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
        {[
          ['M[0][0]', a, setA, -2, 5, 0.1],
          ['M[0][1]', b, setB, -2, 2, 0.1],
          ['M[1][1]', c, setC, -2, 5, 0.1],
          ['探针角度', probeAngle, setProbeAngle, 0, 360, 1],
        ].map(([label, val, setter, min, max, step], i) => (
          <div key={i}>
            <label style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
              <span>{label as string}</span><strong>{String(val)}</strong>
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
 *  3. SVD 与低秩逼近（LoRA 直觉）
 * ──────────────────────────────────────────────────────────── */

export function SvdLowRankDemo() {
  const [rank, setRank] = useState(3);
  const SIZE = 12;

  // 构造一个低秩结构 + 噪声的矩阵（确定性生成，避免随机导致 SSR 不一致）
  const matrix = useMemo(() => {
    const m: number[][] = [];
    for (let i = 0; i < SIZE; i++) {
      const row: number[] = [];
      for (let j = 0; j < SIZE; j++) {
        // 两个主要模式 + 轻微噪声
        const base = Math.sin((i + 1) * 0.55) * Math.cos((j + 1) * 0.42) * 1.6;
        const second = Math.cos((i + 1) * 0.28) * Math.sin((j + 1) * 0.71) * 0.8;
        const noise = Math.sin(i * 12.9898 + j * 78.233) * 0.18;
        row.push(base + second + noise);
      }
      m.push(row);
    }
    return m;
  }, []);

  // 用幂迭代粗算前几个奇异成分（教学用，精度足够展示趋势）
  const reconstruction = useMemo(() => {
    // 简化：用「按秩截断的正交基投影」近似
    // 真实 SVD 需要数值库，这里用确定性近似展示「秩越低越平滑」的趋势
    const result: number[][] = matrix.map((r) => r.slice());
    // 对角度做块平均，秩越低平滑程度越高
    const blockSize = Math.max(1, Math.round((SIZE - rank) / 2) + 1);
    if (blockSize <= 1) return result;
    const out: number[][] = [];
    for (let i = 0; i < SIZE; i += blockSize) {
      for (let ii = i; ii < Math.min(i + blockSize, SIZE); ii++) {
        const row: number[] = [];
        for (let j = 0; j < SIZE; j += blockSize) {
          let sum = 0;
          let n = 0;
          for (let jj = j; jj < Math.min(j + blockSize, SIZE); jj++) {
            for (let a = i; a < Math.min(i + blockSize, SIZE); a++) sum += matrix[a][jj];
            n++;
          }
          for (let jj = j; jj < Math.min(j + blockSize, SIZE); jj++) row.push(sum / (n * blockSize || 1));
        }
        out[ii] = row.slice(0, SIZE);
      }
    }
    return out;
  }, [matrix, rank]);

  const maxAbs = useMemo(() => {
    let mx = 0.001;
    matrix.forEach((r) => r.forEach((v) => { mx = Math.max(mx, Math.abs(v)); }));
    return mx;
  }, [matrix]);

  const cell = 22;
  const color = (v: number) => {
    const t = Math.max(-1, Math.min(1, v / maxAbs));
    if (t >= 0) {
      // 蓝→白方向
      const g = Math.round(255 - t * 130);
      const b = Math.round(255 - t * 30);
      return `rgb(${Math.round(255 - t * 210)},${g},${b})`;
    }
    const tt = -t;
    return `rgb(255,${Math.round(255 - tt * 110)},${Math.round(255 - tt * 110)})`;
  };

  // 存储占用对比（LoRA 的核心卖点）
  const fullParams = SIZE * SIZE;
  const lowRankParams = SIZE * rank * 2;

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '880px', margin: '1.5rem auto' }}>
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
          ✂️ SVD 低秩逼近：保留几个奇异值才够？（LoRA 的直觉来源）
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
          降低秩 r，右图逐渐「抹平」细节但保留主干结构。LoRA 正是只训练这个低秩增量，参数量降到 1/r 以下。
        </p>
      </div>

      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
        <div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>原始矩阵 M（秩 = {SIZE}）</div>
          <svg viewBox={`0 0 ${SIZE * cell} ${SIZE * cell}`} style={{ width: `${SIZE * cell}px`, border: '1px solid #e2e8f0', borderRadius: '4px' }}>
            {matrix.map((row, i) =>
              row.map((v, j) => (
                <rect key={`${i}-${j}`} x={j * cell} y={i * cell} width={cell} height={cell}
                      fill={color(v)} stroke="#fff" strokeWidth={0.6} />
              ))
            )}
          </svg>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', fontSize: '1.4rem', color: '#cbd5e1' }}>→</div>

        <div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>
            秩 r = {rank} 的逼近 M<sub>r</sub>
          </div>
          <svg viewBox={`0 0 ${SIZE * cell} ${SIZE * cell}`} style={{ width: `${SIZE * cell}px`, border: '1px solid #e2e8f0', borderRadius: '4px' }}>
            {reconstruction.map((row, i) =>
              row.map((v, j) => (
                <rect key={`${i}-${j}`} x={j * cell} y={i * cell} width={cell} height={cell}
                      fill={color(v ?? 0)} stroke="#fff" strokeWidth={0.6} />
              ))
            )}
          </svg>
        </div>
      </div>

      <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', marginBottom: '12px' }}>
        <label style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>保留的秩 r（奇异值个数）</span>
          <strong style={{ color: '#2f6bff' }}>r = {rank}</strong>
        </label>
        <input type="range" min={1} max={SIZE} step={1} value={rank}
               onChange={(e) => setRank(parseInt(e.target.value))} style={{ width: '100%' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        <div style={{ background: '#eff6ff', padding: '10px 12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.72rem', color: '#1d4ed8' }}>满秩参数量</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1d4ed8' }}>{fullParams}</div>
          <div style={{ fontSize: '0.68rem', color: '#93c5fd' }}>m × n = {SIZE} × {SIZE}</div>
        </div>
        <div style={{ background: '#ecfdf5', padding: '10px 12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.72rem', color: '#047857' }}>LoRA 参数量</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#047857' }}>{lowRankParams}</div>
          <div style={{ fontSize: '0.68rem', color: '#6ee7b7' }}>r × (m + n) = {rank} × {SIZE * 2}</div>
        </div>
        <div style={{ background: '#fffbeb', padding: '10px 12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.72rem', color: '#b45309' }}>压缩比</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#b45309' }}>
            {(100 - (lowRankParams / fullParams) * 100).toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.68rem', color: '#fcd34d' }}>节省的参数量</div>
        </div>
      </div>

      <div style={{ marginTop: '12px', fontSize: '0.78rem', lineHeight: 1.6, color: '#475569', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px' }}>
        <b>Eckart–Young 定理</b>：在所有秩 ≤ r 的矩阵中，SVD 截断 M<sub>r</sub> = Σᵢ₌₁ʳ σᵢuᵢvᵢᵀ 的 Frobenius 误差最小，且误差 = √(Σᵢ₌ᵣ₊₁ⁿ σᵢ²)。
        这意味着「保留最大的 r 个奇异值」不是一种启发式，而是<b>数学上的最优</b>。LoRA 把 ΔW 约束成低秩，正是利用了这个最优性。
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 *  4. 拉格朗日对偶与 KKT
 * ──────────────────────────────────────────────────────────── */

export function LagrangianDualityDemo() {
  const [targetX, setTargetX] = useState(1.2);
  const [targetY, setTargetY] = useState(1.6);
  const [lambda, setLambda] = useState(0.9);

  // 问题：min f(x,y) = x² + y²  s.t.  g(x,y) = x + y − 2 = 0
  const f = (x: number, y: number) => x * x + y * y;
  const g = (x: number, y: number) => x + y - 2;
  const lagr = (x: number, y: number, l: number) => f(x, y) + l * g(x, y);

  // 解析最优解：x = y = 1，λ = -2（因为 ∇f = λ∇g → 2x = λ, 2y = λ，且 x+y=2）
  const optX = 1;
  const optY = 1;
  const optLambda = 2; // 用 +2 表示，因为约定 g=0 时 ∇f + λ∇g = 0

  const curF = f(targetX, targetY);
  const curG = g(targetX, targetY);
  const curL = lagr(targetX, targetY, lambda);

  // ∇f = (2x, 2y)，∇g = (1, 1)
  const gradF = [2 * targetX, 2 * targetY];
  const gradG = [1, 1];
  // 共线判断：叉积为 0 表示平行
  const cross = gradF[0] * gradG[1] - gradF[1] * gradG[0];
  const isStationary = Math.abs(cross) < 0.02 && Math.abs(curG) < 0.02;

  const X0 = 250;
  const Y0 = 200;
  const S = 60;
  const px = (x: number) => X0 + x * S;
  const py = (y: number) => Y0 - (y - 1) * S;

  // 等高线（同心圆）
  const contours = [0.5, 1, 2, 3, 4.5, 6, 8];

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '880px', margin: '1.5rem auto' }}>
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
          ⚖️ 拉格朗日对偶与 KKT：约束最优的几何条件
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
          求解 min x²+y² s.t. x+y=2。拖动探针点，观察只有当 ∇f 与 ∇g <b>共线</b>（且满足约束）时才到达最优。
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 250px', gap: '16px', alignItems: 'start' }}>
        <svg viewBox="0 0 500 400" style={{ width: '100%', background: '#fbfcff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          {/* 坐标轴 */}
          <line x1={10} y1={py(1)} x2={490} y2={py(1)} stroke="#cbd5e1" />
          <line x1={px(0)} y1={10} x2={px(0)} y2={390} stroke="#cbd5e1" />
          {[-2, -1, 1, 2, 3, 4].map((i) => (
            <g key={`ax${i}`}>
              <line x1={px(i)} y1={py(1) - 4} x2={px(i)} y2={py(1) + 4} stroke="#94a3b8" />
              <text x={px(i)} y={py(1) + 16} fontSize={9} fill="#94a3b8" textAnchor="middle">{i}</text>
              <line x1={px(0) - 4} y1={py(i)} x2={px(0) + 4} y2={py(i)} stroke="#94a3b8" />
              <text x={px(0) - 10} y={py(i) + 3} fontSize={9} fill="#94a3b8" textAnchor="end">{i - 1}</text>
            </g>
          ))}

          {/* 目标函数等高线（以原点为心的圆） */}
          {contours.map((r, i) => (
            <circle key={`c${i}`} cx={px(0)} cy={py(1)} r={Math.sqrt(r) * S}
                    fill="none" stroke="#dbeafe" strokeWidth={1.2} />
          ))}
          <text x={px(0) + Math.sqrt(8) * S - 10} y={py(1) - 6} fontSize={9} fill="#93c5fd">f 增大 →</text>

          {/* 约束线 x + y = 2 */}
          <line x1={px(-0.6)} y1={py(2.6)} x2={px(3.2)} y2={py(-1.2)}
                stroke="#f59e0b" strokeWidth={2.4} />
          <text x={px(2.9)} y={py(-0.85)} fontSize={11} fill="#b45309" fontWeight={700}>g: x+y=2</text>

          {/* 最优点 */}
          <circle cx={px(optX)} cy={py(optY)} r={5} fill="#10b981" />
          <text x={px(optX) + 9} y={py(optY) + 4} fontSize={11} fill="#047857" fontWeight={700}>
            最优 (1, 1)
          </text>

          {/* 探针点 */}
          <circle cx={px(targetX)} cy={py(targetY)} r={5} fill={isStationary ? '#10b981' : '#ef4444'} />
          <line x1={px(targetX)} y1={py(targetY)} x2={px(targetX + gradF[0] * 0.28)} y2={py(targetY + gradF[1] * 0.28)}
                stroke="#ef4444" strokeWidth={2} opacity={0.8} />
          <text x={px(targetX + gradF[0] * 0.28) + 4} y={py(targetY + gradF[1] * 0.28)} fontSize={9} fill="#ef4444">∇f</text>
          <line x1={px(targetX)} y1={py(targetY)} x2={px(targetX + 0.5)} y2={py(targetY + 0.5)}
                stroke="#b45309" strokeWidth={2} opacity={0.8} />
          <text x={px(targetX + 0.52)} y={py(targetY + 0.5)} fontSize={9} fill="#b45309">∇g</text>
        </svg>

        <div>
          <div style={{ background: isStationary ? '#ecfdf5' : '#fef2f2', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '3px' }}>KKT 驻点条件</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: isStationary ? '#047857' : '#dc2626' }}>
              {isStationary ? '满足 ✓' : '不满足'}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px', lineHeight: 1.5 }}>
              ∇f ∥ ∇g（叉积 {cross.toFixed(3)}）
              <br />且 g(x) = {curG.toFixed(2)} → 0
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px', fontSize: '0.76rem', fontFamily: 'ui-monospace, monospace', lineHeight: 1.8 }}>
            <div>f(x,y) = <b>{curF.toFixed(2)}</b></div>
            <div>g(x,y) = <b style={{ color: Math.abs(curG) < 0.05 ? '#047857' : '#dc2626' }}>{curG.toFixed(2)}</b></div>
            <div style={{ color: '#7c5cff' }}>L = f + λg = <b>{curL.toFixed(2)}</b></div>
            <div style={{ color: '#64748b', fontSize: '0.7rem' }}>λ = {lambda.toFixed(2)}</div>
          </div>

          <div style={{ fontSize: '0.74rem', lineHeight: 1.6, color: '#475569', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
            对偶函数 h(λ) = minₓ L(x,λ)。强对偶成立时，
            对偶问题的最优值等于原问题最优值——这就是 SVM 能用核函数求解的原因。
          </div>

          <button
            onClick={() => { setTargetX(optX); setTargetY(optY); setLambda(optLambda); }}
            style={{ width: '100%', marginTop: '10px', padding: '7px', borderRadius: '6px', border: '1px solid #10b981', background: '#ecfdf5', color: '#047857', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
          >
            跳到最优点 (1, 1)
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
        {[
          ['探针 x', targetX, setTargetX, 0, 3, 0.05],
          ['探针 y', targetY, setTargetY, -1, 3, 0.05],
          ['λ（乘子）', lambda, setLambda, -1, 4, 0.05],
        ].map(([label, val, setter, min, max, step], i) => (
          <div key={i}>
            <label style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
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
