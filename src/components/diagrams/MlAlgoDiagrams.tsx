/**
 * 经典机器学习算法 · 专用交互图
 *
 *   KnnCurseDemo        kNN 决策边界 + 维数灾难（对应 ml-algo-l2-1）
 *   NaiveBayesDemo      朴素贝叶斯：条件独立假设与拉普拉斯平滑（对应 ml-algo-l2-2）
 *   DecisionTreeSplitDemo 决策树分裂：信息增益 / 基尼不纯度（对应 ml-algo-l3-1）
 *   SvmMarginDemo       SVM 最大间隔、支持向量与软间隔（对应 ml-algo-l3-2）
 *   KernelTrickDemo     核技巧：低维不可分 → 高维可分（对应 ml-algo-l3-3）
 */

import { useState, useMemo } from 'react';

/* ────────────────────────────────────────────────────────────
 *  1. kNN 与维数灾难
 * ──────────────────────────────────────────────────────────── */

export function KnnCurseDemo() {
  const [k, setK] = useState(3);
  const [dim, setDim] = useState(2);
  const [probe, setProbe] = useState<[number, number]>([0.2, 0.3]);

  // 确定性点集：两类螺旋/簇
  const points = useMemo(() => {
    const pts: { x: number; y: number; label: 0 | 1 }[] = [];
    let seed = 20240101;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    // 类别 0：左下高斯团
    for (let i = 0; i < 28; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 0.85;
      pts.push({ x: -0.9 + Math.cos(a) * r, y: -0.7 + Math.sin(a) * r, label: 0 });
    }
    // 类别 1：右上高斯团
    for (let i = 0; i < 28; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 0.85;
      pts.push({ x: 0.9 + Math.cos(a) * r, y: 0.7 + Math.sin(a) * r, label: 1 });
    }
    return pts;
  }, []);

  // 到探针的距离（维度越高，「最近/最远」差距越小）
  const dists = useMemo(() => {
    return points.map((p) => {
      // 把二维点嵌入 dim 维：额外维度用确定性小扰动
      let d2 = (p.x - probe[0]) ** 2 + (p.y - probe[1]) ** 2;
      for (let j = 2; j < dim; j++) {
        const extra = Math.sin((p.x * 12.9898 + p.y * 78.233 + j * 4.1414)) * 0.6;
        const extraProbe = Math.sin(j * 3.7) * 0.6;
        d2 += (extra - extraProbe) ** 2;
      }
      return { ...p, d: Math.sqrt(d2) };
    }).sort((a, b) => a.d - b.d);
  }, [points, probe, dim]);

  const neighbors = dists.slice(0, k);
  const votes0 = neighbors.filter((n) => n.label === 0).length;
  const votes1 = neighbors.filter((n) => n.label === 1).length;
  const pred: 0 | 1 = votes1 > votes0 ? 1 : 0;

  // 维数灾难的量化：最近邻距离 / 最远距离 的比值
  const nearest = dists[0].d;
  const farthest = dists[dists.length - 1].d;
  const ratio = farthest > 1e-9 ? nearest / farthest : 1;
  // 在 d 维单位超立方体中，覆盖比例为 p 需要的边长 = p^(1/d)
  const sideForHalf = Math.pow(0.5, 1 / dim);

  const OX = 190;
  const OY = 165;
  const S = 78;
  const px = (x: number) => OX + x * S;
  const py = (y: number) => OY - y * S;

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '900px', margin: '1.5rem auto' }}>
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
          🎯 kNN 与维数灾难：为什么高维空间里「近邻」不再近
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
          拖动紫色探针看 k 个最近邻投票。把维度从 2 调到 40，观察右侧两个指标：
          <b>「最近/最远距离比」趋近 1</b>——所有点都变得一样远，kNN 的「局部性」假设失效。
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 250px', gap: '16px', alignItems: 'start' }}>
        <svg viewBox="0 0 380 330" style={{ width: '100%', background: '#fbfcff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <line x1={10} y1={OY} x2={370} y2={OY} stroke="#e2e8f0" />
          <line x1={OX} y1={10} x2={OX} y2={320} stroke="#e2e8f0" />

          {/* 邻域圆（半径 = 第 k 近邻距离） */}
          {neighbors.length > 0 && (
            <circle cx={px(probe[0])} cy={py(probe[1])} r={neighbors[neighbors.length - 1].d * S}
                    fill="rgba(47,107,255,0.06)" stroke="#2f6bff" strokeWidth={1.4} strokeDasharray="4,3" />
          )}

          {/* 连线到 k 个近邻 */}
          {neighbors.map((n, i) => (
            <line key={`nl${i}`} x1={px(probe[0])} y1={py(probe[1])} x2={px(n.x)} y2={py(n.y)}
                  stroke="#94a3b8" strokeWidth={1} />
          ))}

          {/* 样本点 */}
          {points.map((p, i) => {
            const isNeighbor = neighbors.some((n) => n.x === p.x && n.y === p.y);
            return <circle key={`kp${i}`} cx={px(p.x)} cy={py(p.y)} r={isNeighbor ? 5 : 3.6}
                           fill={p.label === 0 ? '#2f6bff' : '#f59e0b'}
                           stroke={isNeighbor ? '#0f172a' : 'none'} strokeWidth={isNeighbor ? 1.4 : 0}
                           opacity={isNeighbor ? 1 : 0.75} />;
          })}

          {/* 探针 */}
          <circle cx={px(probe[0])} cy={py(probe[1])} r={6} fill="#7c5cff" stroke="#fff" strokeWidth={2} />
          <text x={px(probe[0]) + 9} y={py(probe[1]) - 7} fontSize={10} fill="#6d28d9" fontWeight={700}>?</text>
        </svg>

        <div>
          <div style={{ background: pred === 0 ? '#eff6ff' : '#fffbeb', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '3px' }}>
              k={k} 投票结果
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: pred === 0 ? '#1d4ed8' : '#b45309' }}>
              {pred === 0 ? '🔵 类别 A' : '🟠 类别 B'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '3px' }}>
              A: {votes0} 票 / B: {votes1} 票
            </div>
          </div>

          <div style={{ background: ratio > 0.5 ? '#fef2f2' : '#ecfdf5', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '3px' }}>
              最近距离 / 最远距离
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: ratio > 0.5 ? '#dc2626' : '#047857' }}>
              {ratio.toFixed(3)}
            </div>
            <div style={{ fontSize: '0.7rem', marginTop: '3px', color: ratio > 0.5 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
              {ratio > 0.5 ? '⚠️ 所有点几乎等距，局部性失效' : '✅ 仍有明显的「近」与「远」'}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px', fontSize: '0.75rem', lineHeight: 1.8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>维度 d</span><strong>{dim}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>最近邻距离</span><strong>{nearest.toFixed(3)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>覆盖一半体积所需边长</span>
              <strong>{sideForHalf.toFixed(3)}</strong>
            </div>
          </div>

          <div style={{ fontSize: '0.73rem', lineHeight: 1.6, color: '#475569', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
            极端例子：在 d=100 的单位超立方体中，要覆盖一半体积需要边长
            <b> 0.5^(1/100) ≈ 0.993</b>——即几乎要撑满整个空间。这就是「维数灾难」：
            高维下样本极度稀疏，任何「基于距离」的方法都会退化。
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
        {[
          ['k（近邻数）', k, setK, 1, 15, 1],
          ['维度 d', dim, setDim, 2, 40, 1],
          ['探针 x', probe[0], (v: number) => setProbe([v, probe[1]]), -1.6, 1.6, 0.1],
          ['探针 y', probe[1], (v: number) => setProbe([probe[0], v]), -1.3, 1.3, 0.1],
        ].map(([label, val, setter, min, max, step], i) => (
          <div key={i}>
            <label style={{ fontSize: '0.71rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
              <span>{label as string}</span><strong>{(val as number).toFixed(i < 2 ? 0 : 1)}</strong>
            </label>
            <input type="range" min={min as number} max={max as number} step={step as number}
                   value={val as number}
                   onChange={(e) => (setter as (v: number) => void)(parseFloat(e.target.value))}
                   style={{ width: '100%' }} />
          </div>
        ))}
      </div>

      <div style={{ marginTop: '10px', fontSize: '0.76rem', lineHeight: 1.6, color: '#475569', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px' }}>
        <b>k 的作用</b>：k=1 时决策边界极度 jagged（过拟合，对噪声敏感）；k 增大边界平滑（欠拟合）。
        实践常用奇数 k 避免平票，并用交叉验证选择。
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 *  2. 朴素贝叶斯与拉普拉斯平滑
 * ──────────────────────────────────────────────────────────── */

export function NaiveBayesDemo() {
  // 垃圾邮件分类：两个词（"免费"、"会议"）
  const [alpha, setAlpha] = useState(1); // 拉普拉斯平滑强度
  const [priorSpam, setPriorSpam] = useState(0.4); // 先验 P(垃圾)
  // 训练统计（固定）
  const stat = {
    spam: { n: 60, free: 48, meeting: 3 },   // 垃圾邮件 60 封，"免费"出现 48 封，"会议"3 封
    ham: { n: 90, free: 9, meeting: 72 },    // 正常邮件 90 封
  };

  // 词条件概率（带平滑）
  const pFreeGivenSpam = (stat.spam.free + alpha) / (stat.spam.n + 2 * alpha);
  const pMeetingGivenSpam = (stat.spam.meeting + alpha) / (stat.spam.n + 2 * alpha);
  const pFreeGivenHam = (stat.ham.free + alpha) / (stat.ham.n + 2 * alpha);
  const pMeetingGivenHam = (stat.ham.meeting + alpha) / (stat.ham.n + 2 * alpha);

  // 观测：邮件含"免费"但不含"会议"
  const pSpam = priorSpam;
  const pHam = 1 - priorSpam;
  const scoreSpam = pSpam * pFreeGivenSpam * (1 - pMeetingGivenSpam);
  const scoreHam = pHam * pFreeGivenHam * (1 - pMeetingGivenHam);
  const norm = scoreSpam + scoreHam;
  const postSpam = norm > 0 ? scoreSpam / norm : 0;

  // 无平滑（alpha=0）时的零概率演示
  const rawSpam = stat.spam.meeting / stat.spam.n;
  const rawHam = stat.ham.free / stat.ham.n;

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '900px', margin: '1.5rem auto' }}>
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
          📧 朴素贝叶斯：条件独立假设 + 拉普拉斯平滑
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
          用两个词（"免费" / "会议"）分类垃圾邮件。拖动平滑系数 α：
          <b>α=0 时任何未出现过的词都会让概率归零，整个后验变成 0</b>——这就是必须平滑的原因。
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
        {/* 条件概率表 */}
        <div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>
            条件概率 P(词 | 类别)（α = {alpha.toFixed(1)}）
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', border: '1px solid #e2e8f0' }}>词</th>
                <th style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>P(词|垃圾)</th>
                <th style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>P(词|正常)</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['免费', pFreeGivenSpam, pFreeGivenHam],
                ['会议', pMeetingGivenSpam, pMeetingGivenHam],
              ].map(([w, ps, ph], i) => (
                <tr key={i}>
                  <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', fontWeight: 600 }}>{w as string}</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#dc2626' }}>
                    {(ps as number).toFixed(3)}
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#047857' }}>
                    {(ph as number).toFixed(3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '6px', lineHeight: 1.6 }}>
            平滑公式：P(w|c) = (count(w,c) + α) / (N_c + α·|V|)，|V|=2
          </div>
        </div>

        {/* 后验 */}
        <div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>
            观测：邮件含"免费"、不含"会议"
          </div>
          <div style={{ background: postSpam > 0.5 ? '#fef2f2' : '#ecfdf5', padding: '12px', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '3px' }}>后验 P(垃圾 | 观测)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: postSpam > 0.5 ? '#dc2626' : '#047857' }}>
              {(postSpam * 100).toFixed(1)}%
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>
              判为{postSpam > 0.5 ? '垃圾邮件' : '正常邮件'}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginTop: '10px', fontSize: '0.73rem', fontFamily: 'ui-monospace, monospace', lineHeight: 1.8 }}>
            <div style={{ color: '#64748b', fontFamily: 'inherit' }}>分子（垃圾）：</div>
            <div>{pSpam.toFixed(2)} × {pFreeGivenSpam.toFixed(3)} × {(1 - pMeetingGivenSpam).toFixed(3)}</div>
            <div>= {scoreSpam.toExponential(2)}</div>
            <div style={{ color: '#64748b', fontFamily: 'inherit', marginTop: '6px' }}>分子（正常）：</div>
            <div>{pHam.toFixed(2)} × {pFreeGivenHam.toFixed(3)} × {(1 - pMeetingGivenHam).toFixed(3)}</div>
            <div>= {scoreHam.toExponential(2)}</div>
          </div>
        </div>
      </div>

      {/* 零概率演示 */}
      <div style={{ background: alpha < 0.05 ? '#fef2f2' : '#f8fafc', padding: '10px 14px', borderRadius: '8px', marginBottom: '12px', border: alpha < 0.05 ? '1px solid #fecaca' : '1px solid #e2e8f0' }}>
        <div style={{ fontSize: '0.76rem', color: '#475569', lineHeight: 1.7 }}>
          {alpha < 0.05 ? (
            <span style={{ color: '#dc2626', fontWeight: 600 }}>
              ⚠️ α=0（无平滑）：训练集中垃圾邮件里"会议"只出现 {stat.spam.meeting} 次（概率 {rawSpam.toFixed(3)}）。
              如果测试邮件的某个词在训练集里从未出现，P(词|类)=0 会让<b>整个连乘积归零</b>——
              无论其他证据多强，后验都是 0。这就是「零概率灾难」。
            </span>
          ) : (
            <span>
              ✅ 平滑生效：给每个词计数加上 α 的虚拟样本，避免零概率。
              α=1 即「拉普拉斯平滑」（加一平滑）；α&lt;1 是 Lidstone 平滑。
              <b>α 越大，概率越向均匀分布拉平（先验越强）</b>。
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
        <div>
          <label style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
            <span>平滑系数 α（0 = 不平滑）</span><strong>{alpha.toFixed(2)}</strong>
          </label>
          <input type="range" min={0} max={3} step={0.1} value={alpha}
                 onChange={(e) => setAlpha(parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
            <span>先验 P(垃圾)</span><strong>{(priorSpam * 100).toFixed(0)}%</strong>
          </label>
          <input type="range" min={0.05} max={0.95} step={0.05} value={priorSpam}
                 onChange={(e) => setPriorSpam(parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
      </div>

      <div style={{ marginTop: '10px', fontSize: '0.76rem', lineHeight: 1.6, color: '#475569', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px' }}>
        <b>「朴素」在哪里</b>：它假设给定类别后各特征<b>条件独立</b>——P(免费,会议|垃圾) = P(免费|垃圾)·P(会议|垃圾)。
        这个假设在现实中几乎从不成立（词之间有强关联），但分类效果出奇地好。
        原因：分类只需要<b>后验的相对大小</b>，而独立性假设带来的偏差对两个类别是系统性的，往往相互抵消。
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 *  3. 决策树分裂：信息增益与基尼
 * ──────────────────────────────────────────────────────────── */

export function DecisionTreeSplitDemo() {
  const [threshold, setThreshold] = useState(4.5);
  const [criterion, setCriterion] = useState<'gini' | 'entropy'>('gini');

  // 一维数据集：特征 x，标签 y（0/1）
  const data: [number, 0 | 1][] = [
    [1.0, 0], [1.5, 0], [2.0, 0], [2.6, 0], [3.1, 0], [3.6, 0],
    [4.1, 0], [4.8, 1], [5.2, 1], [5.7, 1], [6.3, 1], [7.0, 1], [7.8, 1], [8.5, 1],
  ];

  const left = data.filter(([x]) => x <= threshold);
  const right = data.filter(([x]) => x > threshold);

  const impurity = (labels: (0 | 1)[]): number => {
    if (labels.length === 0) return 0;
    const p1 = labels.filter((l) => l === 1).length / labels.length;
    const p0 = 1 - p1;
    if (criterion === 'gini') return 1 - p0 * p0 - p1 * p1;
    // entropy
    const h = (p: number) => (p > 0 ? -p * Math.log2(p) : 0);
    return h(p0) + h(p1);
  };

  const allLabels = data.map(([, y]) => y);
  const parentImp = impurity(allLabels);
  const leftImp = impurity(left.map(([, y]) => y));
  const rightImp = impurity(right.map(([, y]) => y));
  const n = data.length;
  const weightedChild = (left.length / n) * leftImp + (right.length / n) * rightImp;
  const gain = parentImp - weightedChild;

  // 扫描所有可能阈值，找最优
  const best = useMemo(() => {
    let bestT = threshold;
    let bestScore = -Infinity;
    for (let t = 0.5; t <= 9.5; t += 0.1) {
      const L = data.filter(([x]) => x <= t);
      const R = data.filter(([x]) => x > t);
      if (L.length === 0 || R.length === 0) continue;
      const score = parentImp - ((L.length / n) * impurity(L.map(([, y]) => y)) + (R.length / n) * impurity(R.map(([, y]) => y)));
      if (score > bestScore) { bestScore = score; bestT = t; }
    }
    return { t: bestT, score: bestScore };
  }, [criterion]);

  const W = 400;
  const H = 130;
  const XMIN = 0.5;
  const XMAX = 9.5;
  const gx = (x: number) => ((x - XMIN) / (XMAX - XMIN)) * (W - 40) + 20;

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '900px', margin: '1.5rem auto' }}>
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
          🌳 决策树分裂：信息增益与基尼不纯度
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
          一维数据、两类标签。拖动阈值看左右子节点的不纯度如何变化。
          <b>最优阈值就是让加权子不纯度最低（即增益最大）的那个</b>。
        </p>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        <button onClick={() => setCriterion('gini')}
          style={{ flex: 1, padding: '7px', borderRadius: '6px', border: '1px solid #2f6bff', background: criterion === 'gini' ? '#2f6bff' : '#eff6ff', color: criterion === 'gini' ? '#fff' : '#1d4ed8', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
          基尼不纯度（CART）
        </button>
        <button onClick={() => setCriterion('entropy')}
          style={{ flex: 1, padding: '7px', borderRadius: '6px', border: '1px solid #7c5cff', background: criterion === 'entropy' ? '#7c5cff' : '#f5f3ff', color: criterion === 'entropy' ? '#fff' : '#6d28d9', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
          信息熵（ID3/C4.5）
        </button>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', background: '#fbfcff', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '12px' }}>
        {/* 基线 */}
        <line x1={20} y1={95} x2={W - 20} y2={95} stroke="#cbd5e1" />

        {/* 样本点：两类画在不同高度 */}
        {data.map(([x, y], i) => (
          <circle key={`dp${i}`} cx={gx(x)} cy={y === 0 ? 78 : 108} r={6}
                  fill={y === 0 ? '#2f6bff' : '#f59e0b'} opacity={0.85} />
        ))}

        {/* 阈值线 */}
        <line x1={gx(threshold)} y1={20} x2={gx(threshold)} y2={120} stroke="#ef4444" strokeWidth={2.2} strokeDasharray="5,3" />
        <text x={gx(threshold) + 5} y={30} fontSize={9} fill="#dc2626" fontWeight={700}>
          x ≤ {threshold.toFixed(1)}
        </text>

        {/* 最优阈值标记 */}
        <line x1={gx(best.t)} y1={120} x2={gx(best.t)} y2={128} stroke="#10b981" strokeWidth={2.5} />
        <text x={gx(best.t)} y={H - 4} fontSize={8} fill="#047857" textAnchor="middle" fontWeight={700}>
          最优 {best.t.toFixed(1)}
        </text>

        <text x={20} y={16} fontSize={9} fill="#64748b">🔵 类 A　🟠 类 B　（x 轴为特征值）</text>
      </svg>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '12px' }}>
        <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>父节点不纯度</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{parentImp.toFixed(3)}</div>
          <div style={{ fontSize: '0.64rem', color: '#94a3b8' }}>{n} 个样本</div>
        </div>
        <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.7rem', color: '#1d4ed8' }}>左节点不纯度</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1d4ed8' }}>{leftImp.toFixed(3)}</div>
          <div style={{ fontSize: '0.64rem', color: '#93c5fd' }}>{left.length} 个样本</div>
        </div>
        <div style={{ background: '#fffbeb', padding: '10px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.7rem', color: '#b45309' }}>右节点不纯度</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#b45309' }}>{rightImp.toFixed(3)}</div>
          <div style={{ fontSize: '0.64rem', color: '#fbbf24' }}>{right.length} 个样本</div>
        </div>
        <div style={{ background: gain > best.score - 0.01 ? '#ecfdf5' : '#f8fafc', padding: '10px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.7rem', color: gain > best.score - 0.01 ? '#047857' : '#64748b' }}>
            信息增益
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: gain > best.score - 0.01 ? '#047857' : '#334155' }}>
            {gain.toFixed(3)}
          </div>
          <div style={{ fontSize: '0.64rem', color: '#94a3b8' }}>
            {gain > best.score - 0.01 ? '✅ 当前已最优' : `最优 ${best.score.toFixed(3)}`}
          </div>
        </div>
      </div>

      <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.75rem', lineHeight: 1.9, fontFamily: 'ui-monospace, monospace' }}>
        <div style={{ color: '#64748b', fontFamily: 'inherit', marginBottom: '4px' }}>
          {criterion === 'gini' ? '基尼：G = 1 − Σpᵢ²' : '熵：H = −Σpᵢ log₂pᵢ'}
        </div>
        <div>
          增益 = {parentImp.toFixed(3)} − ({left.length}/{n} × {leftImp.toFixed(3)} + {right.length}/{n} × {rightImp.toFixed(3)})
        </div>
        <div style={{ color: '#2f6bff' }}> = {gain.toFixed(4)}</div>
      </div>

      <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', marginBottom: '10px' }}>
        <label style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
          <span>分裂阈值</span><strong>x ≤ {threshold.toFixed(1)}</strong>
        </label>
        <input type="range" min={1} max={9} step={0.1} value={threshold}
               onChange={(e) => setThreshold(parseFloat(e.target.value))} style={{ width: '100%' }} />
      </div>

      <div style={{ fontSize: '0.76rem', lineHeight: 1.6, color: '#475569', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px' }}>
        <b>三种准则的关系</b>：基尼（CART 用）计算更快，只需平方；熵（ID3/C4.5 用）含 log，略慢但更「信息论」。
        两者在多数数据上给出几乎相同的分裂点。C4.5 额外引入<b>信息增益率</b>来惩罚「取值过多的特征」
        （否则像「ID 号」这种唯一特征会有极高的信息增益，但毫无泛化价值）。
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 *  4. SVM 最大间隔
 * ──────────────────────────────────────────────────────────── */

export function SvmMarginDemo() {
  const [angle, setAngle] = useState(-35); // 决策边界角度
  const [offset, setOffset] = useState(0); // 偏置
  const [C, setC] = useState(1); // 软间隔惩罚

  // 两类点（近似线性可分，但有一个离群点）
  const data: { x: number; y: number; label: -1 | 1; outlier?: boolean }[] = [
    { x: -1.0, y: -0.7, label: -1 }, { x: -0.6, y: -1.1, label: -1 },
    { x: -1.2, y: -0.2, label: -1 }, { x: -0.3, y: -0.5, label: -1 },
    { x: -0.9, y: -1.3, label: -1 },
    { x: 0.9, y: 0.8, label: 1 }, { x: 0.6, y: 1.1, label: 1 },
    { x: 1.2, y: 0.4, label: 1 }, { x: 0.4, y: 0.6, label: 1 },
    { x: 1.1, y: 1.2, label: 1 },
    // 离群点：被分错的一侧
    { x: -0.2, y: 1.4, label: 1, outlier: true },
  ];

  // 决策边界：w·x + b = 0，用角度定义法向量
  const rad = (angle * Math.PI) / 180;
  const wx = Math.cos(rad);
  const wy = Math.sin(rad);
  const b = offset;

  const margin = (p: { x: number; y: number }) => wx * p.x + wy * p.y + b;
  // 几何间隔 = |w·x+b| / ||w||，这里 ||w||=1，所以就是 |margin|
  const margins = data.map((p) => ({ ...p, m: margin(p), dist: Math.abs(margin(p)), correct: Math.sign(margin(p)) === p.label }));

  const nCorrect = margins.filter((m) => m.correct).length;
  const totalMargin = margins.filter((m) => m.correct).reduce((s, m) => s + m.dist, 0);
  // 支持向量：距离最近的几个正确分类点
  const sorted = [...margins].filter((m) => m.correct).sort((a, b2) => a.dist - b2.dist);
  const support = sorted.slice(0, 3);
  const minDist = sorted.length ? sorted[0].dist : 0;

  const OX = 190;
  const OY = 165;
  const S = 72;
  const px = (x: number) => OX + x * S;
  const py = (y: number) => OY - y * S;

  // 画边界线（经过 -b/w 的法线方向）
  const lineLen = 2.6;
  const perpX = -wy;
  const perpY = wx;
  // 边界上一点
  const bx0 = -b * wx;
  const by0 = -b * wy;

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '900px', margin: '1.5rem auto' }}>
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
          ⚔️ 支持向量机：最大间隔与软间隔
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
          拖动角度和偏置调整决策边界（红色实线），绿色虚线是间隔边界。
          <b>SVM 的目标是让两条虚线之间的「街道」尽可能宽</b>——而决定街道宽度的只有那几个贴着边界的<b>支持向量</b>。
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 250px', gap: '16px', alignItems: 'start' }}>
        <svg viewBox="0 0 380 330" style={{ width: '100%', background: '#fbfcff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <line x1={10} y1={OY} x2={370} y2={OY} stroke="#e2e8f0" />
          <line x1={OX} y1={10} x2={OX} y2={320} stroke="#e2e8f0" />

          {/* 间隔边界：沿法向量 w 方向各平移 ±minDist，与决策边界严格平行 */}
          {[-1, 1].map((sign, si) => {
            const offX = bx0 + wx * minDist * sign;
            const offY = by0 + wy * minDist * sign;
            return (
              <line key={`mb${si}`}
                    x1={px(offX + perpX * lineLen)} y1={py(offY + perpY * lineLen)}
                    x2={px(offX - perpX * lineLen)} y2={py(offY - perpY * lineLen)}
                    stroke="#10b981" strokeWidth={1.3} strokeDasharray="5,3" opacity={0.85} />
            );
          })}

          {/* 决策边界 */}
          <line x1={px(bx0 + perpX * lineLen)} y1={py(by0 + perpY * lineLen)}
                x2={px(bx0 - perpX * lineLen)} y2={py(by0 - perpY * lineLen)}
                stroke="#ef4444" strokeWidth={2.4} />

          {/* 法向量 w */}
          <line x1={px(bx0)} y1={py(by0)} x2={px(bx0 + wx * 0.8)} y2={py(by0 + wy * 0.8)}
                stroke="#7c5cff" strokeWidth={2} />
          <text x={px(bx0 + wx * 0.85)} y={py(by0 + wy * 0.85)} fontSize={9} fill="#6d28d9" fontWeight={700}>w</text>

          {/* 数据点 */}
          {margins.map((p, i) => (
            <g key={`sp${i}`}>
              <circle cx={px(p.x)} cy={py(p.y)} r={p.outlier ? 6.5 : 5}
                      fill={p.label === 1 ? '#f59e0b' : '#2f6bff'}
                      stroke={p.outlier ? '#dc2626' : '#fff'} strokeWidth={p.outlier ? 2 : 1.2}
                      opacity={support.some((s) => s.x === p.x && s.y === p.y) ? 1 : 0.55} />
              {p.outlier && (
                <text x={px(p.x) + 9} y={py(p.y) - 6} fontSize={8} fill="#dc2626" fontWeight={700}>离群</text>
              )}
            </g>
          ))}

          {/* 支持向量标注 */}
          {support.map((p, i) => (
            <circle key={`sv${i}`} cx={px(p.x)} cy={py(p.y)} r={9}
                    fill="none" stroke="#10b981" strokeWidth={1.6} />
          ))}
        </svg>

        <div>
          <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '3px' }}>街道宽度（2×最小间隔）</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#047857' }}>
              {(minDist * 2).toFixed(3)}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '3px' }}>
              最小几何间隔 = {minDist.toFixed(3)}
            </div>
          </div>

          <div style={{ background: nCorrect === data.length ? '#ecfdf5' : '#fffbeb', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '3px' }}>分类正确率</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: nCorrect === data.length ? '#047857' : '#b45309' }}>
              {nCorrect} / {data.length}
            </div>
            <div style={{ fontSize: '0.68rem', marginTop: '3px', color: nCorrect === data.length ? '#10b981' : '#f59e0b' }}>
              {nCorrect === data.length ? '✅ 全部正确（硬间隔可行）' : '⚠️ 有误分类 → 需要软间隔'}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px', fontSize: '0.75rem', lineHeight: 1.8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>支持向量数</span><strong>{support.length}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>间隔之和</span><strong>{totalMargin.toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>软间隔 C</span><strong>{C.toFixed(1)}</strong>
            </div>
          </div>

          <div style={{ fontSize: '0.73rem', lineHeight: 1.6, color: '#475569', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
            <b>只有支持向量起作用</b>：把它们移走，边界会变；其他点怎么挪都不影响。
            这就是为什么 SVM 的解是稀疏的（大多数样本的 αᵢ = 0），也是核技巧能生效的前提。
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
        {[
          ['边界角度', angle, setAngle, -90, 90, 1],
          ['偏置 b', offset, setOffset, -0.8, 0.8, 0.05],
          ['软间隔惩罚 C', C, setC, 0.1, 10, 0.1],
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

      <div style={{ marginTop: '10px', fontSize: '0.76rem', lineHeight: 1.6, color: '#475569', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px' }}>
        <b>硬间隔 vs 软间隔</b>：硬间隔要求所有点都分类正确且满足 margin ≥ 1，数据有离群点时就无解。
        软间隔引入松弛变量 ξᵢ，目标变成 min ½‖w‖² + C·Σξᵢ——
        <b>C 越大越不容忍误分类（窄街道、过拟合风险）；C 越小越宽容（宽街道、更稳健）</b>。
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 *  5. 核技巧
 * ──────────────────────────────────────────────────────────── */

export function KernelTrickDemo() {
  const [gamma, setGamma] = useState(1.2);
  const [show3d, setShow3d] = useState(false);

  // 一维同心圆数据（二维平面上线性不可分）
  const points = useMemo(() => {
    const pts: { x: number; y: number; label: -1 | 1 }[] = [];
    const N = 22;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      // 内圈（标签 +1）
      pts.push({ x: Math.cos(a) * 0.55, y: Math.sin(a) * 0.55, label: 1 });
      // 外圈（标签 -1）
      pts.push({ x: Math.cos(a + 0.15) * 1.35, y: Math.sin(a + 0.15) * 1.35, label: -1 });
    }
    return pts;
  }, []);

  // RBF 核映射后的「高度」：z = exp(-γ·r²)
  const zOf = (x: number, y: number) => Math.exp(-gamma * (x * x + y * y));

  const OX = 190;
  const OY = 175;
  const S = 72;
  const px = (x: number) => OX + x * S;
  const py = (y: number) => OY - y * S;

  // 三维视图：等距投影
  const proj = (x: number, y: number, z: number): [number, number] => {
    const iso = 0.5;
    const sx = x - y * 0.5;
    const sy = z - (x + y) * iso * 0.35;
    return [195 + sx * 62, 210 - sy * 62];
  };

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '900px', margin: '1.5rem auto' }}>
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
          🌀 核技巧：低维不可分，高维一刀切开
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
          同心圆数据在二维平面上<b>无法用直线分开</b>。但用 RBF 核把每个点映射到「离圆心越近、z 越高」的曲面后，
          一个水平平面就能切开。切换视图对比二维与三维。
        </p>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        <button onClick={() => setShow3d(false)}
          style={{ flex: 1, padding: '7px', borderRadius: '6px', border: '1px solid #2f6bff', background: !show3d ? '#2f6bff' : '#eff6ff', color: !show3d ? '#fff' : '#1d4ed8', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
          原始二维空间（线性不可分）
        </button>
        <button onClick={() => setShow3d(true)}
          style={{ flex: 1, padding: '7px', borderRadius: '6px', border: '1px solid #10b981', background: show3d ? '#10b981' : '#ecfdf5', color: show3d ? '#fff' : '#047857', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
          核映射后三维空间（可分）
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: '16px', alignItems: 'start' }}>
        {!show3d ? (
          <svg viewBox="0 0 380 300" style={{ width: '100%', background: '#fbfcff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <line x1={10} y1={OY} x2={370} y2={OY} stroke="#e2e8f0" />
            <line x1={OX} y1={10} x2={OX} y2={290} stroke="#e2e8f0" />
            {/* 圆（提示不可分） */}
            <circle cx={px(0)} cy={py(0)} r={1.05 * S} fill="none" stroke="#fca5a5" strokeWidth={1.2} strokeDasharray="4,3" />
            {points.map((p, i) => (
              <circle key={`p2${i}`} cx={px(p.x)} cy={py(p.y)} r={4.5}
                      fill={p.label === 1 ? '#2f6bff' : '#f59e0b'} opacity={0.85} />
            ))}
            <text x={12} y={20} fontSize={9} fill="#64748b">
              内圈 🔵 vs 外圈 🟠：任何直线都切不开
            </text>
          </svg>
        ) : (
          <svg viewBox="0 0 380 300" style={{ width: '100%', background: '#fbfcff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            {/* 地面网格 */}
            {[-1.5, -0.5, 0.5, 1.5].map((v, i) => {
              const [x1, y1] = proj(v, -1.5, 0);
              const [x2, y2] = proj(v, 1.5, 0);
              const [x3, y3] = proj(-1.5, v, 0);
              const [x4, y4] = proj(1.5, v, 0);
              return (
                <g key={`gg${i}`}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#eef2f7" />
                  <line x1={x3} y1={y3} x2={x4} y2={y4} stroke="#eef2f7" />
                </g>
              );
            })}

            {/* 分裂平面 z = 0.5 */}
            {(() => {
              const corners = [[-1.6, -1.6], [1.6, -1.6], [1.6, 1.6], [-1.6, 1.6]].map(([x, y]) => proj(x, y, 0.5));
              return <polygon points={corners.map(([a, b]) => `${a},${b}`).join(' ')}
                              fill="rgba(16,185,129,0.14)" stroke="#10b981" strokeWidth={1.6} strokeDasharray="5,3" />;
            })()}

            {/* 映射后的点（按 z 高度画） */}
            {points.map((p, i) => {
              const z = zOf(p.x, p.y);
              const [sxp, syp] = proj(p.x, p.y, z);
              // 垂线到底面
              const [bx, by] = proj(p.x, p.y, 0);
              return (
                <g key={`p3${i}`}>
                  <line x1={sxp} y1={syp} x2={bx} y2={by} stroke="#cbd5e1" strokeWidth={0.6} strokeDasharray="2,2" />
                  <circle cx={sxp} cy={syp} r={4.2} fill={p.label === 1 ? '#2f6bff' : '#f59e0b'} opacity={0.9} />
                </g>
              );
            })}

            {/* 轴标注 */}
            <text x={12} y={20} fontSize={9} fill="#64748b">
              z = exp(−γ·r²)：内圈被抬高到平面之上，外圈留在下方
            </text>
            <text x={12} y={288} fontSize={8} fill="#94a3b8">绿色虚线 = 分离平面 z = 0.5</text>
          </svg>
        )}

        <div>
          <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px', fontSize: '0.75rem', lineHeight: 1.8 }}>
            <div style={{ color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>RBF 核</div>
            <div style={{ fontFamily: 'ui-monospace, monospace' }}>
              K(x,x') = exp(−γ‖x−x'‖²)
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px', fontSize: '0.75rem', lineHeight: 1.8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>内圈 z（r≈0.55）</span>
              <strong style={{ color: '#1d4ed8' }}>{zOf(0, 0.55).toFixed(3)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>外圈 z（r≈1.35）</span>
              <strong style={{ color: '#b45309' }}>{zOf(0, 1.35).toFixed(3)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>分离阈值</span>
              <strong>0.500</strong>
            </div>
          </div>

          <div style={{ background: zOf(0, 0.55) > 0.5 && zOf(0, 1.35) < 0.5 ? '#ecfdf5' : '#fffbeb', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '3px' }}>当前 γ 下能否分开</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: zOf(0, 0.55) > 0.5 && zOf(0, 1.35) < 0.5 ? '#047857' : '#b45309' }}>
              {zOf(0, 0.55) > 0.5 && zOf(0, 1.35) < 0.5 ? '✅ 可以（0.5 处一刀切开）' : '⚠️ 需要调整 γ'}
            </div>
          </div>

          <div style={{ fontSize: '0.73rem', lineHeight: 1.6, color: '#475569', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
            <b>γ 的作用</b>：γ 越大，核函数衰减越快 → 每个样本的「影响半径」越小 → 决策边界越复杂（过拟合风险）。
            γ 太小则近似线性（欠拟合）。
          </div>
        </div>
      </div>

      <div style={{ marginTop: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
        <label style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
          <span>RBF 核参数 γ</span><strong>{gamma.toFixed(2)}</strong>
        </label>
        <input type="range" min={0.2} max={4} step={0.1} value={gamma}
               onChange={(e) => setGamma(parseFloat(e.target.value))} style={{ width: '100%' }} />
      </div>

      <div style={{ marginTop: '10px', fontSize: '0.76rem', lineHeight: 1.6, color: '#475569', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px' }}>
        <b>「核技巧」到底省了什么</b>：它并不真的把数据映射到高维再计算——那样维度可能无穷大（RBF 核就是）。
        真正的做法是在<b>对偶形式</b>里发现：SVM 的优化只需要样本间的内积 ⟨xᵢ,xⱼ⟩。
        把内积替换成 K(xᵢ,xⱼ) 就等价于在高维空间做 SVM，<b>而计算量完全不变</b>。
      </div>
    </div>
  );
}
