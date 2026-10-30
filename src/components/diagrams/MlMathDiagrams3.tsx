/**
 * 机器学习数学基础 · 专用交互图（第三批）
 *
 *   PcaVarianceDemo      PCA 方差解释率、碎石图与投影（对应 l2-3）
 *   BayesUpdateDemo      先验 → 似然 → 后验的贝叶斯更新（对应 l4-1）
 *   HypothesisTestDemo   两类错误、α/β 与功效、p 值判据（对应 l5-3）
 */

import { useState, useMemo } from 'react';

/* ────────────────────────────────────────────────────────────
 *  1. PCA：方差解释率、碎石图与投影
 * ──────────────────────────────────────────────────────────── */

export function PcaVarianceDemo() {
  const [spread, setSpread] = useState(2.6); // 主轴方向的标准差
  const [minor, setMinor] = useState(0.75); // 次轴方向的标准差
  const [theta, setTheta] = useState(32); // 主轴旋转角
  const [nComp, setNComp] = useState(1); // 保留几个主成分

  const rad = (d: number) => (d * Math.PI) / 180;
  const th = rad(theta);
  const cos = Math.cos(th);
  const sin = Math.sin(th);

  // 特征值（协方差矩阵的对角化结果）
  const l1 = spread * spread;
  const l2 = minor * minor;
  const totalVar = l1 + l2;
  const ratio1 = l1 / totalVar;
  const ratio2 = l2 / totalVar;

  // 确定性点云：沿两轴生成 + 确定性抖动
  const points = useMemo(() => {
    const pts: [number, number][] = [];
    const N = 90;
    for (let i = 0; i < N; i++) {
      // 用三角函数做确定性「伪随机」，保证 SSR 一致
      const u = Math.sin(i * 12.9898) * 0.5 + Math.sin(i * 78.233) * 0.5;
      const v = Math.cos(i * 4.1414) * 0.5 + Math.cos(i * 39.425) * 0.5;
      // 在主轴/次轴坐标系里的采样
      const along = u * spread * 1.5;
      const across = v * minor * 1.5;
      // 旋转回原坐标
      pts.push([along * cos - across * sin, along * sin + across * cos]);
    }
    return pts;
  }, [spread, minor, cos, sin]);

  const OX = 200;
  const OY = 175;
  const S = 34;
  const px = (x: number) => OX + x * S;
  const py = (y: number) => OY - y * S;

  // 投影到前 k 个主成分上（重构）
  const project = (x: number, y: number) => {
    // 主轴方向单位向量
    const u1 = [cos, sin];
    const u2 = [-sin, cos];
    const c1 = x * u1[0] + y * u1[1];
    const c2 = x * u2[0] + y * u2[1];
    let rx = nComp >= 1 ? c1 * u1[0] : 0;
    let ry = nComp >= 1 ? c1 * u1[1] : 0;
    if (nComp >= 2) {
      rx += c2 * u2[0];
      ry += c2 * u2[1];
    }
    return [rx, ry] as [number, number];
  };

  const keptVar = nComp >= 2 ? 1 : ratio1;
  // 碎石图数据
  const scree = [
    { label: 'PC1', ratio: ratio1, eig: l1 },
    { label: 'PC2', ratio: ratio2, eig: l2 },
  ];

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '900px', margin: '1.5rem auto' }}>
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
          📉 PCA：主成分方向、方差解释率与碎石图
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
          拖动「主轴离散度」和「旋转角」，观察点云形状与两个主成分的方差占比如何变化。
          只保留 PC1（红色轴）时，所有点被投影到这条直线上——这就是降维。
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
        {/* 左：点云 + 主成分轴 */}
        <div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>
            原始点云与主成分方向（保留 {nComp} 个）
          </div>
          <svg viewBox="0 0 400 350" style={{ width: '100%', background: '#fbfcff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <line x1={12} y1={OY} x2={388} y2={OY} stroke="#e2e8f0" />
            <line x1={OX} y1={12} x2={OX} y2={338} stroke="#e2e8f0" />

            {/* 投影辅助线：点 → 其在 PC1 上的投影 */}
            {nComp === 1 && points.map(([x, y], i) => {
              const [rx, ry] = project(x, y);
              return (
                <line key={`pl${i}`} x1={px(x)} y1={py(y)} x2={px(rx)} y2={py(ry)}
                      stroke="#cbd5e1" strokeWidth={0.6} opacity={0.6} />
              );
            })}

            {/* 投影后的点（在 PC1 直线上） */}
            {nComp === 1 && points.map(([x, y], i) => {
              const [rx, ry] = project(x, y);
              return <circle key={`pp${i}`} cx={px(rx)} cy={py(ry)} r={2.2} fill="#ef4444" opacity={0.85} />;
            })}

            {/* 原始点 */}
            {points.map(([x, y], i) => (
              <circle key={`pt${i}`} cx={px(x)} cy={py(y)} r={2.6} fill="#2f6bff" opacity={nComp === 1 ? 0.42 : 0.75} />
            ))}

            {/* PC1 轴（红色） */}
            <line x1={px(-cos * 3.2)} y1={py(-sin * 3.2)} x2={px(cos * 3.2)} y2={py(sin * 3.2)}
                  stroke="#ef4444" strokeWidth={2.4} />
            <text x={px(cos * 3.35)} y={py(sin * 3.35)} fontSize={10} fill="#dc2626" fontWeight={700}>
              PC1 ({ratio1 * 100 > 50 ? '主' : '次'}, {(ratio1 * 100).toFixed(1)}%)
            </text>

            {/* PC2 轴（绿色，仅保留 2 个时显示） */}
            {nComp >= 2 && (
              <>
                <line x1={px(sin * 2.6)} y1={py(-cos * 2.6)} x2={px(-sin * 2.6)} y2={py(cos * 2.6)}
                      stroke="#10b981" strokeWidth={2.4} />
                <text x={px(-sin * 2.75)} y={py(cos * 2.75)} fontSize={10} fill="#047857" fontWeight={700}>
                  PC2 ({(ratio2 * 100).toFixed(1)}%)
                </text>
              </>
            )}
          </svg>
        </div>

        {/* 右：碎石图 */}
        <div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>
            碎石图（Scree Plot）：每个主成分解释的方差
          </div>
          <svg viewBox="0 0 320 200" style={{ width: '100%', background: '#fbfcff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            {/* 轴 */}
            <line x1={40} y1={170} x2={300} y2={170} stroke="#cbd5e1" />
            <line x1={40} y1={20} x2={40} y2={170} stroke="#cbd5e1" />
            <text x={20} y={26} fontSize={8} fill="#94a3b8">100%</text>
            <text x={24} y={174} fontSize={8} fill="#94a3b8">0%</text>

            {scree.map((s, i) => {
              const barW = 70;
              const x = 80 + i * 110;
              const h = s.ratio * 145;
              const kept = i < nComp;
              return (
                <g key={`sc${i}`}>
                  <rect x={x} y={170 - h} width={barW} height={h}
                        fill={kept ? (i === 0 ? '#fecaca' : '#a7f3d0') : '#f1f5f9'}
                        stroke={kept ? (i === 0 ? '#ef4444' : '#10b981') : '#cbd5e1'}
                        strokeWidth={1.5} rx={3} />
                  <text x={x + barW / 2} y={170 - h - 6} fontSize={10} textAnchor="middle"
                        fontWeight={700} fill={kept ? (i === 0 ? '#dc2626' : '#047857') : '#94a3b8'}>
                    {(s.ratio * 100).toFixed(1)}%
                  </text>
                  <text x={x + barW / 2} y={184} fontSize={9} textAnchor="middle" fill="#64748b">{s.label}</text>
                  <text x={x + barW / 2} y={196} fontSize={8} textAnchor="middle" fill="#94a3b8">
                    λ={s.eig.toFixed(2)}
                  </text>
                  {kept && (
                    <text x={x + barW / 2} y={170 - h / 2} fontSize={9} textAnchor="middle" fill="#fff" fontWeight={700}>
                      保留
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          <div style={{ marginTop: '10px', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
              <span style={{ color: '#64748b' }}>保留方差</span>
              <strong style={{ color: keptVar > 0.9 ? '#047857' : '#b45309' }}>{(keptVar * 100).toFixed(1)}%</strong>
            </div>
            <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${keptVar * 100}%`, background: keptVar > 0.9 ? '#10b981' : '#f59e0b', transition: 'width .2s' }} />
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '6px', lineHeight: 1.5 }}>
              总方差 tr(Σ) = λ₁ + λ₂ = {totalVar.toFixed(3)}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        <button onClick={() => setNComp(1)}
          style={{ flex: 1, padding: '7px', borderRadius: '6px', border: '1px solid #ef4444', background: nComp === 1 ? '#ef4444' : '#fef2f2', color: nComp === 1 ? '#fff' : '#dc2626', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
          只保留 PC1（降维到 1 维）
        </button>
        <button onClick={() => setNComp(2)}
          style={{ flex: 1, padding: '7px', borderRadius: '6px', border: '1px solid #10b981', background: nComp === 2 ? '#10b981' : '#ecfdf5', color: nComp === 2 ? '#fff' : '#047857', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
          保留 PC1+PC2（无信息损失）
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
        {[
          ['主轴离散度 σ₁', spread, setSpread, 0.5, 4, 0.1],
          ['次轴离散度 σ₂', minor, setMinor, 0.2, 3, 0.05],
          ['主轴旋转角', theta, setTheta, 0, 180, 1],
        ].map(([label, val, setter, min, max, step], i) => (
          <div key={i}>
            <label style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
              <span>{label as string}</span><strong>{(val as number).toFixed(i === 2 ? 0 : 2)}</strong>
            </label>
            <input type="range" min={min as number} max={max as number} step={step as number}
                   value={val as number}
                   onChange={(e) => (setter as (v: number) => void)(parseFloat(e.target.value))}
                   style={{ width: '100%' }} />
          </div>
        ))}
      </div>

      <div style={{ marginTop: '10px', fontSize: '0.76rem', lineHeight: 1.6, color: '#475569', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px' }}>
        <b>PCA 的本质</b>：找到让投影后方差最大的正交方向。这等价于对协方差矩阵做特征分解 Σ = QΛQᵀ，
        最大特征值对应的特征向量就是 PC1。方差解释率 = λᵢ / Σλⱼ。
        「碎石图」看的是各主成分的方差大小——拐点之后通常就是噪声。
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 *  2. 贝叶斯更新：先验 → 似然 → 后验
 * ──────────────────────────────────────────────────────────── */

export function BayesUpdateDemo() {
  // 经典模型：疾病检测。先验患病率 p(D)，灵敏度 TPR，特异度 TNR
  const [prevalence, setPrevalence] = useState(1); // 患病率 %
  const [tpr, setTpr] = useState(99); // 灵敏度 %
  const [fpr, setFpr] = useState(5); // 假阳性率 % = 1 - 特异度
  const [positive, setPositive] = useState(true); // 检测结果

  const pD = prevalence / 100;
  const pTgivenD = tpr / 100;
  const pTgivenNotD = fpr / 100;

  // 全概率：P(T+) = P(T+|D)P(D) + P(T+|¬D)P(¬D)
  const pT = pTgivenD * pD + pTgivenNotD * (1 - pD);
  // 后验 P(D|T+)
  const posterior = pT > 0 ? (pTgivenD * pD) / pT : 0;
  // 阴性时的后验
  const pTn = (1 - pTgivenD) * pD + (1 - pTgivenNotD) * (1 - pD);
  const posteriorNeg = pTn > 0 ? ((1 - pTgivenD) * pD) / pTn : 0;

  const shown = positive ? posterior : posteriorNeg;

  /** 给定患病率（%），算检测阳性后的后验（用当前灵敏度/假阳性率）*/
  const posteriorAt = (prevPct: number) => {
    const p = prevPct / 100;
    const denom = pTgivenD * p + pTgivenNotD * (1 - p);
    return denom > 0 ? ((pTgivenD * p) / denom) * 100 : 0;
  };

  // 1000 人的自然频数视角
  const N = 1000;
  const nD = Math.round(N * pD);
  const nNotD = N - nD;
  const truePos = Math.round(nD * pTgivenD);
  const falsePos = Math.round(nNotD * pTgivenNotD);
  const allPos = truePos + falsePos;

  const W = 340;
  // 频数方块图
  const cols = 40;
  const rows = 25;
  const cellSize = 8;

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '900px', margin: '1.5rem auto' }}>
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
          🎲 贝叶斯更新：为什么「检测阳性」不等于「真患病」
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
          先验（患病率）× 似然（检测准确率）→ 后验。当<b>基础患病率很低</b>时，即使检测非常准，
          阳性结果里也大多是假阳性——这就是贝叶斯推断最反直觉的结论。
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '16px', alignItems: 'start' }}>
        <div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>
            自然频数视角：1000 人中检测阳性者 {allPos} 名
          </div>
          {/* 频数方块 */}
          <svg viewBox={`0 0 ${cols * cellSize + 4} ${rows * cellSize + 4}`}
               style={{ width: '100%', background: '#fbfcff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            {Array.from({ length: rows }).map((_, r) =>
              Array.from({ length: cols }).map((__, c) => {
                const idx = r * cols + c;
                if (idx >= N) return null;
                // 前 nD 个是患病者
                const isDiseased = idx < nD;
                // 患病者中前 truePos 个检测阳性；非患病者中前 falsePos 个假阳性
                let positive = false;
                if (isDiseased) positive = idx < truePos;
                else positive = idx - nD < falsePos;
                let fill = '#e2e8f0';
                if (isDiseased && positive) fill = '#dc2626';   // 真阳性
                else if (isDiseased) fill = '#fca5a5';          // 假阴性
                else if (positive) fill = '#fbbf24';            // 假阳性
                return (
                  <rect key={`fc${idx}`} x={c * cellSize + 2} y={r * cellSize + 2}
                        width={cellSize - 1.5} height={cellSize - 1.5} rx={1} fill={fill} />
                );
              })
            )}
          </svg>
          <div style={{ display: 'flex', gap: '14px', marginTop: '8px', fontSize: '0.72rem', flexWrap: 'wrap' }}>
            {[
              ['#dc2626', `真阳性 ${truePos}`],
              ['#fca5a5', `假阴性 ${nD - truePos}`],
              ['#fbbf24', `假阳性 ${falsePos}`],
              ['#e2e8f0', `真阴性 ${nNotD - falsePos}`],
            ].map(([c, t], i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
                <span style={{ width: 10, height: 10, background: c as string, borderRadius: 2, display: 'inline-block' }} />
                {t}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '10px' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '2px' }}>
              后验 P(患病 | 检测{positive ? '阳性' : '阴性'})
            </div>
            <div style={{ fontSize: '1.7rem', fontWeight: 700, color: shown > 0.5 ? '#dc2626' : '#047857' }}>
              {(shown * 100).toFixed(1)}%
            </div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px', lineHeight: 1.5 }}>
              也就是：阳性者中真正患病的比例
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px', fontSize: '0.74rem', lineHeight: 1.85, fontFamily: 'ui-monospace, monospace' }}>
            <div style={{ color: '#64748b', fontFamily: 'inherit', marginBottom: '4px' }}>贝叶斯公式</div>
            <div>P(D|T) = </div>
            <div style={{ paddingLeft: '10px' }}>
              P(T|D)·P(D)
            </div>
            <div style={{ borderTop: '1px solid #cbd5e1', paddingLeft: '10px' }}>
              P(T|D)P(D) + P(T|¬D)P(¬D)
            </div>
            <div style={{ marginTop: '6px', color: '#2f6bff' }}>
              = {pTgivenD.toFixed(3)}×{pD.toFixed(3)} / {pT.toFixed(5)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => setPositive(true)}
              style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid #dc2626', background: positive ? '#dc2626' : '#fef2f2', color: positive ? '#fff' : '#dc2626', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
              检测阳性
            </button>
            <button onClick={() => setPositive(false)}
              style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid #10b981', background: !positive ? '#10b981' : '#ecfdf5', color: !positive ? '#fff' : '#047857', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
              检测阴性
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
        {[
          ['基础患病率（先验）', prevalence, setPrevalence, 0.1, 30, 0.1, '%'],
          ['灵敏度 P(T+|D)', tpr, setTpr, 50, 100, 1, '%'],
          ['假阳性率 P(T+|¬D)', fpr, setFpr, 0.5, 30, 0.5, '%'],
        ].map(([label, val, setter, min, max, step, unit], i) => (
          <div key={i}>
            <label style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
              <span>{label as string}</span><strong>{(val as number).toFixed(1)}{unit as string}</strong>
            </label>
            <input type="range" min={min as number} max={max as number} step={step as number}
                   value={val as number}
                   onChange={(e) => (setter as (v: number) => void)(parseFloat(e.target.value))}
                   style={{ width: '100%' }} />
          </div>
        ))}
      </div>

      <div style={{ marginTop: '10px', fontSize: '0.76rem', lineHeight: 1.6, color: '#475569', background: '#fff7ed', padding: '10px 12px', borderRadius: '8px', border: '1px solid #fed7aa' }}>
        <b>试一下</b>：把「基础患病率」从 1% 拖到 30%，观察后验如何从
        {' '}<b>{posteriorAt(prevalence).toFixed(1)}%</b> 跳到 <b>{posteriorAt(30).toFixed(1)}%</b>
        （其余参数不变：灵敏度 {tpr}%、假阳性率 {fpr}%）。
        健康人基数越大，同样 5% 的假阳性率就会制造越多的假阳性——<b>先验的量级决定了后验的量级</b>，
        这是贝叶斯推断最反直觉也最重要的一课。
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 *  3. 假设检验：两类错误、α/β 与功效
 * ──────────────────────────────────────────────────────────── */

export function HypothesisTestDemo() {
  const [effect, setEffect] = useState(0.5); // 真实效应量（以 σ 为单位）
  const [alpha, setAlpha] = useState(5); // 显著性水平 %
  const [n, setN] = useState(30); // 每组样本量

  const se = 1 / Math.sqrt(n); // 标准误（σ=1）
  const critical = 1.959963985; // 双侧 α=5% 的 z 临界值（近似）
  // 更精确：按 alpha 求双侧 z 临界值（正态分位数近似）
  const zCritical = useMemo(() => {
    // Acklam 近似逆正态 CDF
    const invNorm = (p: number): number => {
      const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687,
        138.357751867269, -30.66479806614716, 2.506628277459239];
      const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866,
        66.80131188771972, -13.28068155288572];
      const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838,
        -2.549732539343734, 4.374664141464968, 2.938163982698783];
      const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
      const pl = 0.02425;
      if (p < pl) {
        const q = Math.sqrt(-2 * Math.log(p));
        return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
               ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
      }
      if (p > 1 - pl) {
        const q = Math.sqrt(-2 * Math.log(1 - p));
        return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
                ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
      }
      const q = p - 0.5;
      const r = q * q;
      return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
             (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    };
    return invNorm(1 - alpha / 200);
  }, [alpha]);

  // 正态密度
  const normPdf = (x: number, mu: number, sd: number) =>
    (1 / (sd * Math.sqrt(2 * Math.PI))) * Math.exp(-((x - mu) ** 2) / (2 * sd * sd));

  // 标准正态 CDF（用于算 β）
  const normCdf = (z: number) => {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    const val = 1 - (Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI)) * poly;
    return z >= 0 ? val : 1 - val;
  };

  // H0: μ=0, H1: μ=effect（以 σ 为单位，标准化后 se=1/√n）
  // 拒绝域：|x̄| > zCrit * se
  const rejectUpper = zCritical * se;
  // 功效：P(拒绝 H0 | H1 为真)
  const power = useMemo(() => {
    const z = (rejectUpper - effect) / se;
    return 1 - normCdf(z); // 单侧近似（效应为正向）
  }, [rejectUpper, effect, se]);
  const beta = 1 - power;

  // 画图范围
  const XMIN = -1.2;
  const XMAX = 1.6;
  const W = 400;
  const H = 220;
  const gx = (x: number) => ((x - XMIN) / (XMAX - XMIN)) * W;
  const gy = (y: number) => H - 24 - y * 175;

  const curve = (mu: number) => {
    const pts: string[] = [];
    const steps = 120;
    for (let i = 0; i <= steps; i++) {
      const x = XMIN + ((XMAX - XMIN) * i) / steps;
      pts.push(`${i === 0 ? 'M' : 'L'}${gx(x).toFixed(1)},${gy(normPdf(x, mu, se)).toFixed(1)}`);
    }
    return pts.join(' ');
  };

  // α 区域（H0 曲线下、临界值右侧）
  const alphaArea = () => {
    const pts: string[] = [`M${gx(rejectUpper).toFixed(1)},${(H - 20).toFixed(1)}`];
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const x = rejectUpper + ((XMAX - rejectUpper) * i) / steps;
      pts.push(`L${gx(x).toFixed(1)},${gy(normPdf(x, 0, se)).toFixed(1)}`);
    }
    pts.push(`L${gx(XMAX).toFixed(1)},${(H - 20).toFixed(1)} Z`);
    return pts.join(' ');
  };
  // β 区域（H1 曲线下、临界值左侧）
  const betaArea = () => {
    const pts: string[] = [`M${gx(XMIN).toFixed(1)},${(H - 20).toFixed(1)}`];
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const x = XMIN + ((rejectUpper - XMIN) * i) / steps;
      pts.push(`L${gx(x).toFixed(1)},${gy(normPdf(x, effect, se)).toFixed(1)}`);
    }
    pts.push(`L${gx(rejectUpper).toFixed(1)},${(H - 20).toFixed(1)} Z`);
    return pts.join(' ');
  };

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '900px', margin: '1.5rem auto' }}>
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
          ⚖️ 假设检验：两类错误、α 与统计功效
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
          蓝色是 H₀（无效应）下的抽样分布，橙色是 H₁（有真实效应）下的分布。
          <b>红色面积 = α</b>（假阳性，冤枉好人），<b>橙黄面积 = β</b>（假阴性，漏掉真效应）。
          增大样本量或效应量，两个分布分开，β 缩小。
        </p>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', background: '#fbfcff', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '12px' }}>
        {/* 基线 */}
        <line x1={0} y1={H - 20} x2={W} y2={H - 20} stroke="#cbd5e1" />

        {/* β 区域 */}
        <path d={betaArea()} fill="rgba(251,191,36,0.35)" stroke="none" />
        {/* α 区域 */}
        <path d={alphaArea()} fill="rgba(239,68,68,0.35)" stroke="none" />

        {/* H0 曲线 */}
        <path d={curve(0)} fill="none" stroke="#2f6bff" strokeWidth={2.2} />
        {/* H1 曲线 */}
        <path d={curve(effect)} fill="none" stroke="#f59e0b" strokeWidth={2.2} />

        {/* 临界线 */}
        <line x1={gx(rejectUpper)} y1={8} x2={gx(rejectUpper)} y2={H - 20}
              stroke="#dc2626" strokeWidth={1.6} strokeDasharray="5,3" />
        <text x={gx(rejectUpper) + 5} y={16} fontSize={9} fill="#dc2626" fontWeight={700}>
          临界值 {rejectUpper.toFixed(3)}
        </text>

        {/* 轴刻度 */}
        {[-1, -0.5, 0, 0.5, 1, 1.5].map((t) => (
          <g key={`tk${t}`}>
            <line x1={gx(t)} y1={H - 20} x2={gx(t)} y2={H - 16} stroke="#94a3b8" />
            <text x={gx(t)} y={H - 6} fontSize={8} fill="#94a3b8" textAnchor="middle">{t}</text>
          </g>
        ))}

        <text x={gx(0)} y={gy(normPdf(0, 0, se)) - 8} fontSize={10} fill="#2f6bff" textAnchor="middle" fontWeight={700}>H₀</text>
        <text x={gx(effect)} y={gy(normPdf(effect, effect, se)) - 8} fontSize={10} fill="#b45309" textAnchor="middle" fontWeight={700}>H₁</text>
      </svg>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
        <div style={{ background: '#fef2f2', padding: '10px 12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.72rem', color: '#dc2626' }}>α（假阳性率）</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#dc2626' }}>{alpha.toFixed(1)}%</div>
          <div style={{ fontSize: '0.66rem', color: '#f87171' }}>你设定的显著性水平</div>
        </div>
        <div style={{ background: '#fffbeb', padding: '10px 12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.72rem', color: '#b45309' }}>β（假阴性率）</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#b45309' }}>{(beta * 100).toFixed(1)}%</div>
          <div style={{ fontSize: '0.66rem', color: '#fbbf24' }}>漏掉真效应的概率</div>
        </div>
        <div style={{ background: '#ecfdf5', padding: '10px 12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.72rem', color: '#047857' }}>功效 1−β</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#047857' }}>{(power * 100).toFixed(1)}%</div>
          <div style={{ fontSize: '0.66rem', color: '#10b981' }}>
            {power > 0.8 ? '✅ 达到常用标准 (80%)' : '⚠️ 低于 80%，样本不足'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
        {[
          ['真实效应量 d', effect, setEffect, 0, 1.2, 0.05],
          ['显著性水平 α', alpha, setAlpha, 0.5, 20, 0.5],
          ['每组样本量 n', n, setN, 5, 200, 5],
        ].map(([label, val, setter, min, max, step], i) => (
          <div key={i}>
            <label style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
              <span>{label as string}</span><strong>{(val as number).toFixed(i === 2 ? 0 : 2)}</strong>
            </label>
            <input type="range" min={min as number} max={max as number} step={step as number}
                   value={val as number}
                   onChange={(e) => (setter as (v: number) => void)(parseFloat(e.target.value))}
                   style={{ width: '100%' }} />
          </div>
        ))}
      </div>

      <div style={{ marginTop: '10px', fontSize: '0.76rem', lineHeight: 1.6, color: '#475569', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px' }}>
        <b>α 与 β 的权衡</b>：降低 α（更严格）会让临界值右移，β 随之上升——除非增大样本量让分布变窄。
        这就是「为什么小样本的 A/B 测试容易得出『无显著差异』」：不是效应不存在，而是<b>功效不够</b>。
        当前设定下每组需要 n={n} 才能有 {(power * 100).toFixed(0)}% 的把握检出效应 d={effect.toFixed(2)}。
      </div>
    </div>
  );
}
