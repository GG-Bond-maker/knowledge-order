/**
 * 深度学习核心交互式教学图解组件
 *
 * 包含：
 * 1. NeuronAnatomy (<Diagram type="neuron" />)：人工神经元解剖与动态信号流转图
 * 2. XorProblemVisualizer (<Diagram type="xor" />)：异或危机与线性可分性决策面交互可视化
 */

import { useState, useMemo } from 'react';

/* ══════════════════════════════════════════════════════════════════
   1. 人工神经元解剖与动态计算图 (NeuronAnatomy)
   ══════════════════════════════════════════════════════════════════ */

type ActivationType = 'step' | 'sigmoid' | 'tanh' | 'relu' | 'gelu';

export function NeuronAnatomy() {
  const [x1, setX1] = useState(1.0);
  const [x2, setX2] = useState(-0.5);
  const [w1, setW1] = useState(1.5);
  const [w2, setW2] = useState(2.0);
  const [bias, setBias] = useState(-0.2);
  const [actType, setActType] = useState<ActivationType>('relu');

  // 计算净输入 z
  const z = useMemo(() => {
    return x1 * w1 + x2 * w2 + bias;
  }, [x1, x2, w1, w2, bias]);

  // 计算激活输出 a
  const a = useMemo(() => {
    switch (actType) {
      case 'step':
        return z >= 0 ? 1 : 0;
      case 'sigmoid':
        return 1 / (1 + Math.exp(-z));
      case 'tanh':
        return Math.tanh(z);
      case 'relu':
        return Math.max(0, z);
      case 'gelu':
        // 近似 GELU: 0.5 * z * (1 + tanh(sqrt(2/pi) * (z + 0.044715 * z^3)))
        const inner = Math.sqrt(2 / Math.PI) * (z + 0.044715 * Math.pow(z, 3));
        return 0.5 * z * (1 + Math.tanh(inner));
      default:
        return z;
    }
  }, [z, actType]);

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '820px', margin: '1.5rem auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
            🔬 人工神经元（Neuron）解剖与信号流转模拟器
          </h4>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
            调节输入、突触权重与偏置，观察线性累加值 $z$ 与激活输出 $a = f(z)$ 的实时变换
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['step', 'sigmoid', 'tanh', 'relu', 'gelu'] as ActivationType[]).map((t) => (
            <button
              key={t}
              onClick={() => setActType(t)}
              style={{
                padding: '4px 10px',
                fontSize: '0.78rem',
                borderRadius: '6px',
                border: actType === t ? '1.5px solid #6366f1' : '1px solid var(--border-color, #cbd5e1)',
                background: actType === t ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-card, #ffffff)',
                color: actType === t ? '#6366f1' : 'var(--text-main, #334155)',
                fontWeight: actType === t ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* SVG 神经元流向主体 */}
      <div style={{ background: 'var(--bg-subtle, #f8fafc)', borderRadius: '10px', padding: '16px', border: '1px solid var(--border-color, #e2e8f0)' }}>
        <svg viewBox="0 0 760 260" style={{ width: '100%', height: 'auto', display: 'block' }}>
          <defs>
            <marker id="arrow-dl" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#6366f1" />
            </marker>
            <marker id="arrow-bias" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
            </marker>
            <linearGradient id="somaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
            <linearGradient id="actGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
          </defs>

          {/* 阶段背景标签 */}
          <rect x="20" y="10" width="130" height="24" rx="4" fill="rgba(148, 163, 184, 0.15)" />
          <text x="85" y="26" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="600">
            树突 (Dendrites / 输入)
          </text>

          <rect x="270" y="10" width="220" height="24" rx="4" fill="rgba(99, 102, 241, 0.15)" />
          <text x="380" y="26" textAnchor="middle" fill="#4f46e5" fontSize="11" fontWeight="600">
            细胞核 (Soma / 线性求和与偏置)
          </text>

          <rect x="610" y="10" width="130" height="24" rx="4" fill="rgba(34, 197, 94, 0.15)" />
          <text x="675" y="26" textAnchor="middle" fill="#15803d" fontSize="11" fontWeight="600">
            轴突 (Axon / 输出)
          </text>

          {/* 输入节点 x1 */}
          <circle cx="85" cy="80" r="26" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2" />
          <text x="85" y="78" textAnchor="middle" fill="#1e293b" fontSize="13" fontWeight="bold">x₁</text>
          <text x="85" y="93" textAnchor="middle" fill="#64748b" fontSize="11">{x1.toFixed(1)}</text>

          {/* 输入节点 x2 */}
          <circle cx="85" cy="180" r="26" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2" />
          <text x="85" y="178" textAnchor="middle" fill="#1e293b" fontSize="13" fontWeight="bold">x₂</text>
          <text x="85" y="193" textAnchor="middle" fill="#64748b" fontSize="11">{x2.toFixed(1)}</text>

          {/* 权重连线与突触标注 w1 */}
          <line x1="111" y1="80" x2="315" y2="125" stroke="#6366f1" strokeWidth="2.5" markerEnd="url(#arrow-dl)" />
          <rect x="180" y="80" width="70" height="22" rx="4" fill="#ffffff" stroke="#c7d2fe" strokeWidth="1" />
          <text x="215" y="95" textAnchor="middle" fill="#4338ca" fontSize="11" fontWeight="600">w₁ = {w1.toFixed(1)}</text>

          {/* 权重连线与突触标注 w2 */}
          <line x1="111" y1="180" x2="315" y2="135" stroke="#6366f1" strokeWidth="2.5" markerEnd="url(#arrow-dl)" />
          <rect x="180" y="158" width="70" height="22" rx="4" fill="#ffffff" stroke="#c7d2fe" strokeWidth="1" />
          <text x="215" y="173" textAnchor="middle" fill="#4338ca" fontSize="11" fontWeight="600">w₂ = {w2.toFixed(1)}</text>

          {/* 偏置 Bias (升降机从上方注入) */}
          <line x1="380" y1="45" x2="380" y2="85" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="3,3" markerEnd="url(#arrow-bias)" />
          <rect x="335" y="42" width="90" height="22" rx="4" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1" />
          <text x="380" y="57" textAnchor="middle" fill="#b45309" fontSize="11" fontWeight="bold">偏置 b = {bias.toFixed(1)}</text>

          {/* 细胞核主体 (求和节点 Sigma) */}
          <circle cx="360" cy="130" r="42" fill="url(#somaGrad)" filter="drop-shadow(0 4px 6px rgba(79, 70, 229, 0.25))" />
          <text x="360" y="125" textAnchor="middle" fill="#ffffff" fontSize="22" fontWeight="bold">∑</text>
          <text x="360" y="146" textAnchor="middle" fill="#e0e7ff" fontSize="11" fontWeight="600">z = {z.toFixed(2)}</text>

          {/* 连接求和到激活函数 */}
          <line x1="402" y1="130" x2="475" y2="130" stroke="#6366f1" strokeWidth="2.5" markerEnd="url(#arrow-dl)" />

          {/* 激活函数节点 f(z) */}
          <rect x="480" y="95" width="75" height="70" rx="8" fill="url(#actGrad)" filter="drop-shadow(0 4px 6px rgba(2, 132, 199, 0.25))" />
          <text x="517" y="125" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="bold">f(z)</text>
          <text x="517" y="145" textAnchor="middle" fill="#e0f2fe" fontSize="11">{actType.toUpperCase()}</text>

          {/* 激活输出到轴突 */}
          <line x1="555" y1="130" x2="635" y2="130" stroke="#22c55e" strokeWidth="3" markerEnd="url(#arrow-dl)" />

          {/* 输出节点 a */}
          <circle cx="675" cy="130" r="34" fill="#dcfce7" stroke="#16a34a" strokeWidth="2.5" />
          <text x="675" y="124" textAnchor="middle" fill="#15803d" fontSize="14" fontWeight="bold">输出 a</text>
          <text x="675" y="143" textAnchor="middle" fill="#166534" fontSize="12" fontWeight="bold">{a.toFixed(3)}</text>
        </svg>

        {/* 动态计算公式看板 */}
        <div style={{
          marginTop: '12px',
          padding: '10px 14px',
          background: 'var(--bg-card, #ffffff)',
          borderRadius: '8px',
          border: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          fontSize: '0.86rem',
          fontFamily: 'monospace'
        }}>
          <div>
            <span style={{ color: '#64748b' }}>净输入 z = </span>
            <span>({w1.toFixed(1)} × {x1.toFixed(1)}) + ({w2.toFixed(1)} × {x2.toFixed(1)}) + ({bias.toFixed(1)}) = </span>
            <strong style={{ color: '#4f46e5' }}>{z.toFixed(2)}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>激活输出 a = {actType}({z.toFixed(2)}) = </span>
            <strong style={{ color: '#16a34a' }}>{a.toFixed(4)}</strong>
          </div>
        </div>

        {/* 交互滑块控制器 */}
        <div style={{
          marginTop: '14px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '12px',
          fontSize: '0.8rem',
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', color: '#475569' }}>输入 x₁: <strong>{x1.toFixed(1)}</strong></label>
            <input type="range" min="-2.0" max="2.0" step="0.1" value={x1} onChange={(e) => setX1(parseFloat(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', color: '#475569' }}>输入 x₂: <strong>{x2.toFixed(1)}</strong></label>
            <input type="range" min="-2.0" max="2.0" step="0.1" value={x2} onChange={(e) => setX2(parseFloat(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', color: '#4338ca' }}>权重 w₁: <strong>{w1.toFixed(1)}</strong></label>
            <input type="range" min="-3.0" max="3.0" step="0.1" value={w1} onChange={(e) => setW1(parseFloat(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', color: '#4338ca' }}>权重 w₂: <strong>{w2.toFixed(1)}</strong></label>
            <input type="range" min="-3.0" max="3.0" step="0.1" value={w2} onChange={(e) => setW2(parseFloat(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', color: '#b45309' }}>偏置 b: <strong>{bias.toFixed(1)}</strong></label>
            <input type="range" min="-3.0" max="3.0" step="0.1" value={bias} onChange={(e) => setBias(parseFloat(e.target.value))} style={{ width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   2. 异或危机与线性可分性决策面 (XorProblemVisualizer)
   ══════════════════════════════════════════════════════════════════ */

type GateType = 'AND' | 'OR' | 'XOR';

export function XorProblemVisualizer() {
  const [gate, setGate] = useState<GateType>('XOR');
  const [showMlpFold, setShowMlpFold] = useState(false);

  // 4 个经典数据点与标签
  const points = useMemo(() => {
    switch (gate) {
      case 'AND':
        return [
          { x: 0, y: 0, label: 0 },
          { x: 0, y: 1, label: 0 },
          { x: 1, y: 0, label: 0 },
          { x: 1, y: 1, label: 1 },
        ];
      case 'OR':
        return [
          { x: 0, y: 0, label: 0 },
          { x: 0, y: 1, label: 1 },
          { x: 1, y: 0, label: 1 },
          { x: 1, y: 1, label: 1 },
        ];
      case 'XOR':
        return [
          { x: 0, y: 0, label: 0 },
          { x: 0, y: 1, label: 1 },
          { x: 1, y: 0, label: 1 },
          { x: 1, y: 1, label: 0 },
        ];
    }
  }, [gate]);

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '820px', margin: '1.5rem auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
            ⚖️ 逻辑门决策面与 1969 年明斯基「异或（XOR）危机」
          </h4>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
            单层感知机只能画出一条平直超平面。切换逻辑门，亲身体验为什么单层网络在异或门前彻底失效！
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {(['AND', 'OR', 'XOR'] as GateType[]).map((g) => (
            <button
              key={g}
              onClick={() => {
                setGate(g);
                if (g !== 'XOR') setShowMlpFold(false);
              }}
              style={{
                padding: '5px 12px',
                fontSize: '0.82rem',
                borderRadius: '6px',
                border: gate === g ? '1.5px solid #0284c7' : '1px solid var(--border-color, #cbd5e1)',
                background: gate === g ? 'rgba(2, 132, 199, 0.15)' : 'var(--bg-card, #ffffff)',
                color: gate === g ? '#0284c7' : 'var(--text-main, #334155)',
                fontWeight: gate === g ? 'bold' : 'normal',
                cursor: 'pointer',
              }}
            >
              {g} 门
            </button>
          ))}
          {gate === 'XOR' && (
            <button
              onClick={() => setShowMlpFold(!showMlpFold)}
              style={{
                padding: '5px 12px',
                fontSize: '0.82rem',
                borderRadius: '6px',
                border: '1.5px solid #8b5cf6',
                background: showMlpFold ? '#8b5cf6' : 'rgba(139, 92, 246, 0.1)',
                color: showMlpFold ? '#ffffff' : '#7c3aed',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              {showMlpFold ? '✓ 空间折叠 (2层MLP破局)' : '点击注入隐层破局 (MLP)'}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 380px) 1fr', gap: '16px', background: 'var(--bg-subtle, #f8fafc)', borderRadius: '10px', padding: '16px', border: '1px solid var(--border-color, #e2e8f0)' }}>
        {/* 2D 平面绘制 */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '10px', position: 'relative' }}>
          <svg viewBox="-30 -30 360 360" style={{ width: '100%', height: 'auto', display: 'block' }}>
            {/* 网格与坐标轴 */}
            <line x1="0" y1="280" x2="280" y2="280" stroke="#94a3b8" strokeWidth="2" />
            <line x1="0" y1="280" x2="0" y2="0" stroke="#94a3b8" strokeWidth="2" />

            <text x="275" y="300" textAnchor="end" fill="#64748b" fontSize="12">x₁</text>
            <text x="-12" y="12" textAnchor="start" fill="#64748b" fontSize="12">x₂</text>

            <line x1="0" y1="60" x2="280" y2="60" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
            <line x1="220" y1="280" x2="220" y2="0" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />

            <text x="-8" y="284" textAnchor="end" fill="#94a3b8" fontSize="11">0</text>
            <text x="-8" y="64" textAnchor="end" fill="#94a3b8" fontSize="11">1</text>
            <text x="220" y="298" textAnchor="middle" fill="#94a3b8" fontSize="11">1</text>

            {/* 决策超平面 Line */}
            {gate === 'AND' && (
              <g>
                <line x1="120" y1="0" x2="280" y2="160" stroke="#0284c7" strokeWidth="3" strokeDasharray="4,4" />
                <text x="210" y="70" fill="#0284c7" fontSize="11" fontWeight="bold">x₁ + x₂ - 1.5 = 0</text>
                <polygon points="120,0 280,0 280,160" fill="rgba(34, 197, 94, 0.12)" />
              </g>
            )}

            {gate === 'OR' && (
              <g>
                <line x1="0" y1="180" x2="180" y2="0" stroke="#0284c7" strokeWidth="3" strokeDasharray="4,4" />
                <text x="110" y="75" fill="#0284c7" fontSize="11" fontWeight="bold">x₁ + x₂ - 0.5 = 0</text>
                <polygon points="0,0 0,180 180,0" fill="rgba(239, 68, 68, 0.08)" />
              </g>
            )}

            {gate === 'XOR' && !showMlpFold && (
              <g>
                {/* 无法切分的旋转虚线示意 */}
                <line x1="0" y1="40" x2="260" y2="300" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="5,5" />
                <line x1="20" y1="300" x2="280" y2="40" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="5,5" />
                <rect x="50" y="125" width="180" height="34" rx="6" fill="#fef2f2" stroke="#f87171" strokeWidth="1" />
                <text x="140" y="146" textAnchor="middle" fill="#dc2626" fontSize="12" fontWeight="bold">
                  ❌ 任何单条直线均无法隔离对角点!
                </text>
              </g>
            )}

            {gate === 'XOR' && showMlpFold && (
              <g>
                {/* 两条直线围出非线性区域 */}
                <line x1="0" y1="180" x2="180" y2="0" stroke="#8b5cf6" strokeWidth="3" />
                <line x1="120" y1="280" x2="280" y2="120" stroke="#8b5cf6" strokeWidth="3" />
                <polygon points="0,180 180,0 280,120 120,280" fill="rgba(139, 92, 246, 0.18)" />
                <text x="140" y="150" textAnchor="middle" fill="#6d28d9" fontSize="12" fontWeight="bold">
                  ✓ 两层 MLP 形成凸区域切分!
                </text>
              </g>
            )}

            {/* 绘制 4 个真值表数据点 */}
            {points.map((pt, idx) => {
              // 映射坐标: (0,0) -> (0, 280), (1,1) -> (220, 60)
              const cx = pt.x === 0 ? 0 : 220;
              const cy = pt.y === 0 ? 280 : 60;
              const isPositive = pt.label === 1;
              return (
                <g key={idx}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r="14"
                    fill={isPositive ? '#22c55e' : '#ef4444'}
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.15))"
                  />
                  <text x={cx} y={cy + 4} textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">
                    {pt.label}
                  </text>
                  <text x={cx + (pt.x === 0 ? -16 : 16)} y={cy + (pt.y === 0 ? 16 : -16)} textAnchor="middle" fill="#475569" fontSize="10">
                    ({pt.x},{pt.y})
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* 右侧原理解释卡片 */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>{gate === 'XOR' ? '🧩' : '💡'}</span>
              <strong style={{ fontSize: '1rem', color: '#1e293b' }}>
                {gate} 门的线性可分性（Linear Separability）分析
              </strong>
            </div>
            <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse', marginBottom: '12px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '4px 8px', textAlign: 'center' }}>输入 x₁</th>
                  <th style={{ padding: '4px 8px', textAlign: 'center' }}>输入 x₂</th>
                  <th style={{ padding: '4px 8px', textAlign: 'center' }}>目标 y</th>
                  <th style={{ padding: '4px 8px', textAlign: 'left' }}>类别颜色</th>
                </tr>
              </thead>
              <tbody>
                {points.map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '4px 8px', textAlign: 'center' }}>{p.x}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'center' }}>{p.y}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 'bold' }}>{p.label}</td>
                    <td style={{ padding: '4px 8px' }}>
                      <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: p.label === 1 ? '#22c55e' : '#ef4444', marginRight: '6px' }} />
                      {p.label === 1 ? '正类 (+1)' : '负类 (0)'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ fontSize: '0.84rem', lineHeight: '1.5', color: '#334155' }}>
              {gate === 'AND' && (
                <p style={{ margin: 0 }}>
                  <strong>与门可分</strong>：只有 (1,1) 为正类，其余 3 个点皆为负类。画一条斜线 $x_1 + x_2 - 1.5 = 0$ 即可完美将它们切开。单层感知机轻松胜任！
                </p>
              )}
              {gate === 'OR' && (
                <p style={{ margin: 0 }}>
                  <strong>或门可分</strong>：只有 (0,0) 为负类，其余 3 个点皆为正类。直线 $x_1 + x_2 - 0.5 = 0$ 同样一刀两断。
                </p>
              )}
              {gate === 'XOR' && !showMlpFold && (
                <p style={{ margin: 0, color: '#b91c1c' }}>
                  <strong>致命的异或危机（1969）</strong>：(0,1) 与 (1,0) 是一类，(0,0) 与 (1,1) 是另一类。它们在几何上呈现<strong>交叉对角分布</strong>。任何一把平直的剪刀（线性方程 $w_1 x_1 + w_2 x_2 + b = 0$）都不可能同时把两个绿点与两个红点分在两侧！
                </p>
              )}
              {gate === 'XOR' && showMlpFold && (
                <p style={{ margin: 0, color: '#6d28d9' }}>
                  <strong>多层网络破局之道</strong>：引入包含 2 个神经元的隐藏层。第一个隐层神经元先计算与非门（NAND），第二个隐层神经元计算或门（OR），最后输出层进行与门（AND）汇总。相当于用两把剪刀围出一个空间通道，或者将坐标系进行非线性弯曲，将不可分转化为可分！
                </p>
              )}
            </div>
          </div>

          <div style={{ marginTop: '12px', fontSize: '0.78rem', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
            💡 启示：正是异或危机的解决，促使人工神经网络从单层感知机进化为多层感知机（MLP），为现代深度学习奠定了第一块奠基石。
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   3. 计算图与反向传播局部梯度流转器 (BackpropCircuit)
   ══════════════════════════════════════════════════════════════════ */

export function BackpropCircuit() {
  const [x, setX] = useState(2.0);
  const [y, setY] = useState(-3.0);
  const [z, setZ] = useState(-4.0);
  const [target, setTarget] = useState(1.0);
  const [viewMode, setViewMode] = useState<'forward' | 'backward'>('backward');
  const [selectedGate, setSelectedGate] = useState<'add' | 'mul' | 'loss' | null>('mul');

  // 前向值
  const q = x + y;
  const f = q * z;
  const diff = f - target;
  const loss = 0.5 * diff * diff;

  // 反向梯度
  const gradLoss = 1.0;
  const gradF = diff; // dLoss/df = f - target
  const gradQ = gradF * z; // dLoss/dq = dLoss/df * z
  const gradZ = gradF * q; // dLoss/dz = dLoss/df * q
  const gradX = gradQ * 1.0; // dLoss/dx = dLoss/dq * 1
  const gradY = gradQ * 1.0; // dLoss/dy = dLoss/dq * 1

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '840px', margin: '1.5rem auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
            ⚡ 计算图（Computational Graph）与反向传播局部梯度流
          </h4>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
            基于 Andrej Karpathy micrograd 思想：电路门拆解、局部导数与反向梯度级联传递
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setViewMode('forward')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: '1px solid #10b981',
              background: viewMode === 'forward' ? '#10b981' : '#f0fdf4',
              color: viewMode === 'forward' ? '#fff' : '#047857',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.82rem',
            }}
          >
            ➡️ 前向信号流 (Forward)
          </button>
          <button
            onClick={() => setViewMode('backward')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: '1px solid #f97316',
              background: viewMode === 'backward' ? '#f97316' : '#fff7ed',
              color: viewMode === 'backward' ? '#fff' : '#c2410c',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.82rem',
            }}
          >
            ⬅️ 反向梯度流 (Backward)
          </button>
        </div>
      </div>

      {/* 参数滑块 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px' }}>
        <div>
          <label style={{ fontSize: '0.78rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
            <span>输入 x</span>
            <strong style={{ color: '#2563eb' }}>{x.toFixed(1)}</strong>
          </label>
          <input type="range" min="-5" max="5" step="0.5" value={x} onChange={(e) => setX(parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.78rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
            <span>输入 y</span>
            <strong style={{ color: '#2563eb' }}>{y.toFixed(1)}</strong>
          </label>
          <input type="range" min="-5" max="5" step="0.5" value={y} onChange={(e) => setY(parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.78rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
            <span>输入 z</span>
            <strong style={{ color: '#0891b2' }}>{z.toFixed(1)}</strong>
          </label>
          <input type="range" min="-5" max="5" step="0.5" value={z} onChange={(e) => setZ(parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.78rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
            <span>目标值 y*</span>
            <strong style={{ color: '#7c5cff' }}>{target.toFixed(1)}</strong>
          </label>
          <input type="range" min="-5" max="5" step="0.5" value={target} onChange={(e) => setTarget(parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
      </div>

      {/* SVG 电路图 */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
        <svg viewBox="0 0 760 260" style={{ width: '100%', height: 'auto', display: 'block' }}>
          <defs>
            <marker id="arrow-forward" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#10b981" />
            </marker>
            <marker id="arrow-backward" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#f97316" />
            </marker>
          </defs>

          {/* 连线与流动通道 */}
          {/* x -> (+) */}
          <path d="M 70 70 L 170 70 L 170 95" fill="none" stroke={viewMode === 'forward' ? '#10b981' : '#cbd5e1'} strokeWidth="2.5" markerEnd={viewMode === 'forward' ? 'url(#arrow-forward)' : undefined} />
          {/* y -> (+) */}
          <path d="M 70 120 L 170 120 L 170 95" fill="none" stroke={viewMode === 'forward' ? '#10b981' : '#cbd5e1'} strokeWidth="2.5" markerEnd={viewMode === 'forward' ? 'url(#arrow-forward)' : undefined} />

          {/* (+) -> (×) */}
          <path d="M 210 95 L 340 95 L 340 125" fill="none" stroke={viewMode === 'forward' ? '#10b981' : '#cbd5e1'} strokeWidth="2.5" markerEnd={viewMode === 'forward' ? 'url(#arrow-forward)' : undefined} />
          {/* z -> (×) */}
          <path d="M 70 185 L 340 185 L 340 135" fill="none" stroke={viewMode === 'forward' ? '#10b981' : '#cbd5e1'} strokeWidth="2.5" markerEnd={viewMode === 'forward' ? 'url(#arrow-forward)' : undefined} />

          {/* (×) -> (Loss) */}
          <path d="M 380 130 L 490 130" fill="none" stroke={viewMode === 'forward' ? '#10b981' : '#cbd5e1'} strokeWidth="2.5" markerEnd={viewMode === 'forward' ? 'url(#arrow-forward)' : undefined} />
          {/* target -> (Loss) */}
          <path d="M 440 60 L 515 60 L 515 105" fill="none" stroke={viewMode === 'forward' ? '#10b981' : '#cbd5e1'} strokeWidth="2" strokeDasharray="4 4" />

          {/* (Loss) -> Loss输出 */}
          <path d="M 545 130 L 670 130" fill="none" stroke={viewMode === 'forward' ? '#10b981' : '#cbd5e1'} strokeWidth="2.5" markerEnd={viewMode === 'forward' ? 'url(#arrow-forward)' : undefined} />

          {/* 反向虚线流动 (仅在 backward 模式下点亮) */}
          {viewMode === 'backward' && (
            <g stroke="#f97316" strokeWidth="2.5" fill="none">
              <path d="M 670 145 L 550 145" strokeDasharray="4 4" markerEnd="url(#arrow-backward)" />
              <path d="M 490 145 L 385 145" strokeDasharray="4 4" markerEnd="url(#arrow-backward)" />
              <path d="M 340 145 L 340 200 L 75 200" strokeDasharray="4 4" markerEnd="url(#arrow-backward)" />
              <path d="M 340 110 L 340 80 L 215 80" strokeDasharray="4 4" markerEnd="url(#arrow-backward)" />
              <path d="M 170 80 L 170 55 L 75 55" strokeDasharray="4 4" markerEnd="url(#arrow-backward)" />
              <path d="M 170 110 L 170 135 L 75 135" strokeDasharray="4 4" markerEnd="url(#arrow-backward)" />
            </g>
          )}

          {/* 节点 1：输入 x */}
          <g transform="translate(20, 50)">
            <rect width="50" height="38" rx="6" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1.5" />
            <text x="25" y="18" textAnchor="middle" fontSize="12" fill="#1e3a8a" fontWeight="600">x</text>
            <text x="25" y="32" textAnchor="middle" fontSize="11" fill="#2563eb" fontWeight="700">{x.toFixed(1)}</text>
            {viewMode === 'backward' && (
              <g transform="translate(0, 42)">
                <rect width="64" height="20" rx="4" fill="#fff7ed" stroke="#f97316" strokeWidth="1.2" />
                <text x="32" y="14" textAnchor="middle" fontSize="10.5" fill="#c2410c" fontWeight="700">∂L/∂x={gradX.toFixed(1)}</text>
              </g>
            )}
          </g>

          {/* 节点 2：输入 y */}
          <g transform="translate(20, 105)">
            <rect width="50" height="38" rx="6" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1.5" />
            <text x="25" y="18" textAnchor="middle" fontSize="12" fill="#1e3a8a" fontWeight="600">y</text>
            <text x="25" y="32" textAnchor="middle" fontSize="11" fill="#2563eb" fontWeight="700">{y.toFixed(1)}</text>
            {viewMode === 'backward' && (
              <g transform="translate(0, 42)">
                <rect width="64" height="20" rx="4" fill="#fff7ed" stroke="#f97316" strokeWidth="1.2" />
                <text x="32" y="14" textAnchor="middle" fontSize="10.5" fill="#c2410c" fontWeight="700">∂L/∂y={gradY.toFixed(1)}</text>
              </g>
            )}
          </g>

          {/* 节点 3：加法门 (+) */}
          <g
            transform="translate(170, 75)"
            onClick={() => setSelectedGate('add')}
            style={{ cursor: 'pointer' }}
          >
            <circle cx="20" cy="20" r="22" fill={selectedGate === 'add' ? '#dbeafe' : '#f1f5f9'} stroke={selectedGate === 'add' ? '#2563eb' : '#64748b'} strokeWidth={selectedGate === 'add' ? '3' : '2'} />
            <text x="20" y="26" textAnchor="middle" fontSize="20" fill="#0f172a" fontWeight="700">+</text>
            <text x="20" y="-4" textAnchor="middle" fontSize="11" fill="#475569" fontWeight="600">加法门</text>
            {/* 前向值 q */}
            <g transform="translate(26, 26)">
              <rect width="56" height="20" rx="4" fill="#ecfdf5" stroke="#10b981" strokeWidth="1.2" />
              <text x="28" y="14" textAnchor="middle" fontSize="10.5" fill="#047857" fontWeight="700">q={q.toFixed(1)}</text>
            </g>
            {viewMode === 'backward' && (
              <g transform="translate(26, -22)">
                <rect width="66" height="20" rx="4" fill="#fff7ed" stroke="#f97316" strokeWidth="1.2" />
                <text x="33" y="14" textAnchor="middle" fontSize="10.5" fill="#c2410c" fontWeight="700">∂L/∂q={gradQ.toFixed(1)}</text>
              </g>
            )}
          </g>

          {/* 节点 4：输入 z */}
          <g transform="translate(20, 170)">
            <rect width="50" height="38" rx="6" fill="#ecfeff" stroke="#0891b2" strokeWidth="1.5" />
            <text x="25" y="18" textAnchor="middle" fontSize="12" fill="#155e75" fontWeight="600">z</text>
            <text x="25" y="32" textAnchor="middle" fontSize="11" fill="#0891b2" fontWeight="700">{z.toFixed(1)}</text>
            {viewMode === 'backward' && (
              <g transform="translate(0, 42)">
                <rect width="64" height="20" rx="4" fill="#fff7ed" stroke="#f97316" strokeWidth="1.2" />
                <text x="32" y="14" textAnchor="middle" fontSize="10.5" fill="#c2410c" fontWeight="700">∂L/∂z={gradZ.toFixed(1)}</text>
              </g>
            )}
          </g>

          {/* 节点 5：乘法门 (×) */}
          <g
            transform="translate(340, 110)"
            onClick={() => setSelectedGate('mul')}
            style={{ cursor: 'pointer' }}
          >
            <circle cx="20" cy="20" r="24" fill={selectedGate === 'mul' ? '#fed7aa' : '#f1f5f9'} stroke={selectedGate === 'mul' ? '#ea580c' : '#64748b'} strokeWidth={selectedGate === 'mul' ? '3' : '2'} />
            <text x="20" y="27" textAnchor="middle" fontSize="20" fill="#0f172a" fontWeight="700">×</text>
            <text x="20" y="-6" textAnchor="middle" fontSize="11" fill="#475569" fontWeight="600">乘法门</text>
            {/* 前向值 f */}
            <g transform="translate(28, 28)">
              <rect width="56" height="20" rx="4" fill="#ecfdf5" stroke="#10b981" strokeWidth="1.2" />
              <text x="28" y="14" textAnchor="middle" fontSize="10.5" fill="#047857" fontWeight="700">f={f.toFixed(1)}</text>
            </g>
            {viewMode === 'backward' && (
              <g transform="translate(28, -22)">
                <rect width="66" height="20" rx="4" fill="#fff7ed" stroke="#f97316" strokeWidth="1.2" />
                <text x="33" y="14" textAnchor="middle" fontSize="10.5" fill="#c2410c" fontWeight="700">∂L/∂f={gradF.toFixed(1)}</text>
              </g>
            )}
          </g>

          {/* 目标值 y* */}
          <g transform="translate(380, 42)">
            <rect width="60" height="32" rx="4" fill="#faf5ff" stroke="#a855f7" strokeWidth="1.2" strokeDasharray="3 3" />
            <text x="30" y="15" textAnchor="middle" fontSize="11" fill="#6b21a8">目标 y*</text>
            <text x="30" y="28" textAnchor="middle" fontSize="10.5" fill="#7c5cff" fontWeight="700">{target.toFixed(1)}</text>
          </g>

          {/* 节点 6：损失门 (Loss) */}
          <g
            transform="translate(490, 110)"
            onClick={() => setSelectedGate('loss')}
            style={{ cursor: 'pointer' }}
          >
            <rect width="52" height="40" rx="8" fill={selectedGate === 'loss' ? '#fee2e2' : '#f8fafc'} stroke={selectedGate === 'loss' ? '#dc2626' : '#64748b'} strokeWidth={selectedGate === 'loss' ? '3' : '2'} />
            <text x="26" y="24" textAnchor="middle" fontSize="14" fill="#0f172a" fontWeight="700">MSE</text>
            <text x="26" y="-6" textAnchor="middle" fontSize="11" fill="#475569" fontWeight="600">损失节点</text>
          </g>

          {/* 损失标量输出 */}
          <g transform="translate(640, 108)">
            <rect width="78" height="44" rx="8" fill="#fef2f2" stroke="#ef4444" strokeWidth="1.8" />
            <text x="39" y="19" textAnchor="middle" fontSize="12" fill="#991b1b" fontWeight="600">损失 Loss</text>
            <text x="39" y="36" textAnchor="middle" fontSize="13" fill="#dc2626" fontWeight="800">{loss.toFixed(2)}</text>
            {viewMode === 'backward' && (
              <g transform="translate(8, 48)">
                <rect width="62" height="18" rx="4" fill="#fff7ed" stroke="#f97316" strokeWidth="1" />
                <text x="31" y="13" textAnchor="middle" fontSize="10" fill="#c2410c" fontWeight="700">∂L/∂L=1.0</text>
              </g>
            )}
          </g>
        </svg>
      </div>

      {/* 门电路交互说明弹窗 */}
      <div style={{ marginTop: '12px', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '1.2rem' }}>💡</span>
          <strong style={{ fontSize: '0.92rem', color: '#1e293b' }}>
            {selectedGate === 'add' && '加法门（Addition Gate）物理特性剖析'}
            {selectedGate === 'mul' && '乘法门（Multiplication Gate）物理特性剖析'}
            {selectedGate === 'loss' && '损失节点（Loss Gate）物理特性剖析'}
          </strong>
        </div>

        {selectedGate === 'add' && (
          <div style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.6 }}>
            <p style={{ margin: '0 0 4px' }}>
              <strong>梯度特性：梯度分配器（Gradient Distributor）</strong>。因为 q = x + y，其局部导数 ∂q/∂x = 1、∂q/∂y = 1。
            </p>
            <p style={{ margin: 0 }}>
              根据链式法则，下游梯度 ∂L/∂x = (∂L/∂q) × 1 = <strong>{gradQ.toFixed(1)}</strong>，∂L/∂y = <strong>{gradQ.toFixed(1)}</strong>。
              加法门<strong>绝不改变梯度的数值与方向</strong>，而是原汁原味地将上游梯度 100% 分流复制给所有输入分支！
            </p>
          </div>
        )}

        {selectedGate === 'mul' && (
          <div style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.6 }}>
            <p style={{ margin: '0 0 4px' }}>
              <strong>梯度特性：梯度交换器（Gradient Switcher / Scaler）</strong>。因为 f = q × z，其局部导数 ∂f/∂q = z = <strong>{z.toFixed(1)}</strong>，∂f/∂z = q = <strong>{q.toFixed(1)}</strong>。
            </p>
            <p style={{ margin: 0 }}>
              上游梯度 ∂L/∂f = <strong>{gradF.toFixed(1)}</strong> 流经乘法门时，会<strong>交换乘以对方输入的前向值</strong>：
              ∂L/∂q = (∂L/∂f) · z = <strong>{gradQ.toFixed(1)}</strong>，
              ∂L/∂z = (∂L/∂f) · q = <strong>{gradZ.toFixed(1)}</strong>。对方的前向数值越大，反向分配给自己的责任与梯度就越强！
            </p>
          </div>
        )}

        {selectedGate === 'loss' && (
          <div style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.6 }}>
            <p style={{ margin: '0 0 4px' }}>
              <strong>梯度特性：误差引擎（Gradient Origin）</strong>。损失函数 L = 0.5 × (f - y*)^2 是整个反向传播梯度的源头，其导数为 ∂L/∂f = (f - y*) = <strong>{gradF.toFixed(1)}</strong>。
            </p>
            <p style={{ margin: 0 }}>
              预测值 f 偏离真实目标 y* 的方向和距离，直接决定了初始驱动力的正负和强弱。所有浅层参数的更新方向，本质上都是在对冲这个初始误差信号！
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   4. 多层感知机张量形状与矩阵微积分可视化 (MlpTensorVisualizer)
   ══════════════════════════════════════════════════════════════════ */

export function MlpTensorVisualizer() {
  const [b, setB] = useState<number>(4);
  const [din, setDin] = useState<number>(3);
  const [dhidden, setDhidden] = useState<number>(4);
  const [dout, setDout] = useState<number>(2);
  const [tab, setTab] = useState<'forward' | 'backward'>('forward');

  // 参数量统计
  const w1Params = din * dhidden;
  const b1Params = dhidden;
  const w2Params = dhidden * dout;
  const b2Params = dout;
  const totalParams = w1Params + b1Params + w2Params + b2Params;

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '840px', margin: '1.5rem auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
            📐 多层感知机（MLP）张量形状追踪与矩阵求导法则
          </h4>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
            彻底告别标量推导与 Shape Mismatch：动态观察批处理矩阵乘法与优雅的矩阵求导转置对称性
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setTab('forward')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: '1px solid #3b82f6',
              background: tab === 'forward' ? '#3b82f6' : '#eff6ff',
              color: tab === 'forward' ? '#fff' : '#1d4ed8',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.82rem',
            }}
          >
            前向传播张量链
          </button>
          <button
            onClick={() => setTab('backward')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: '1px solid #8b5cf6',
              background: tab === 'backward' ? '#8b5cf6' : '#f5f3ff',
              color: tab === 'backward' ? '#fff' : '#6d28d9',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.82rem',
            }}
          >
            反向矩阵微积分法则
          </button>
        </div>
      </div>

      {/* 控制器 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.82rem', color: '#475569' }}>Batch 批大小 (B):</span>
          <select value={b} onChange={(e) => setB(Number(e.target.value))} style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
            <option value={1}>1 (单样本)</option>
            <option value={4}>4 (Mini-batch)</option>
            <option value={16}>16</option>
            <option value={32}>32</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.82rem', color: '#475569' }}>输入维度 (D_in):</span>
          <select value={din} onChange={(e) => setDin(Number(e.target.value))} style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
            <option value={2}>2 (平面特征)</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
            <option value={8}>8</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.82rem', color: '#475569' }}>隐层神经元数 (D_hidden):</span>
          <select value={dhidden} onChange={(e) => setDhidden(Number(e.target.value))} style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
            <option value={4}>4</option>
            <option value={8}>8</option>
            <option value={16}>16</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.82rem', color: '#475569' }}>输出分类数 (D_out):</span>
          <select value={dout} onChange={(e) => setDout(Number(e.target.value))} style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
            <option value={1}>1 (二分类)</option>
            <option value={2}>2</option>
            <option value={3}>3 (多分类)</option>
          </select>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.82rem', color: '#64748b' }}>
          网络总参数量：<strong style={{ color: '#0f172a' }}>{totalParams}</strong> 个 float32
        </div>
      </div>

      {tab === 'forward' ? (
        <div>
          {/* 前向传播流动卡片 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* 隐藏层 1 */}
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, color: '#166534', fontSize: '0.9rem' }}>第 1 层：隐藏层（Hidden Layer 1）</span>
                <span style={{ fontSize: '0.78rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px' }}>
                  参数：W₁ ({din}×{dhidden}) + b₁ ({dhidden}) = {w1Params + b1Params}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '0.86rem' }}>
                <div style={{ background: '#ffffff', padding: '6px 12px', borderRadius: '6px', border: '1px solid #bbf7d0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#65a30d' }}>输入特征矩阵 X</div>
                  <strong>({b} × {din})</strong>
                </div>
                <span style={{ color: '#15803d', fontWeight: 700 }}>×</span>
                <div style={{ background: '#ffffff', padding: '6px 12px', borderRadius: '6px', border: '1px solid #bbf7d0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#65a30d' }}>权重矩阵 W₁</div>
                  <strong>({din} × {dhidden})</strong>
                </div>
                <span style={{ color: '#15803d', fontWeight: 700 }}>+</span>
                <div style={{ background: '#ffffff', padding: '6px 12px', borderRadius: '6px', border: '1px solid #bbf7d0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#65a30d' }}>偏置向量 b₁ (广播)</div>
                  <strong>(1 × {dhidden})</strong>
                </div>
                <span style={{ color: '#15803d', fontWeight: 700 }}>=</span>
                <div style={{ background: '#dcfce7', padding: '6px 12px', borderRadius: '6px', border: '1px solid #86efac' }}>
                  <div style={{ fontSize: '0.72rem', color: '#166534' }}>未激活净输入 Z₁</div>
                  <strong>({b} × {dhidden})</strong>
                </div>
                <span style={{ color: '#15803d', fontWeight: 700 }}>──ReLU──▶</span>
                <div style={{ background: '#16a34a', color: '#ffffff', padding: '6px 12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>隐层激活 A₁</div>
                  <strong>({b} × {dhidden})</strong>
                </div>
              </div>
            </div>

            {/* 输出层 */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.9rem' }}>第 2 层：输出层（Output Layer 2）</span>
                <span style={{ fontSize: '0.78rem', background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '12px' }}>
                  参数：W₂ ({dhidden}×{dout}) + b₂ ({dout}) = {w2Params + b2Params}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '0.86rem' }}>
                <div style={{ background: '#ffffff', padding: '6px 12px', borderRadius: '6px', border: '1px solid #93c5fd', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#3b82f6' }}>上一层激活 A₁</div>
                  <strong>({b} × {dhidden})</strong>
                </div>
                <span style={{ color: '#2563eb', fontWeight: 700 }}>×</span>
                <div style={{ background: '#ffffff', padding: '6px 12px', borderRadius: '6px', border: '1px solid #93c5fd', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#3b82f6' }}>权重矩阵 W₂</div>
                  <strong>({dhidden} × {dout})</strong>
                </div>
                <span style={{ color: '#2563eb', fontWeight: 700 }}>+</span>
                <div style={{ background: '#ffffff', padding: '6px 12px', borderRadius: '6px', border: '1px solid #93c5fd', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#3b82f6' }}>偏置向量 b₂ (广播)</div>
                  <strong>(1 × {dout})</strong>
                </div>
                <span style={{ color: '#2563eb', fontWeight: 700 }}>=</span>
                <div style={{ background: '#2563eb', color: '#ffffff', padding: '6px 12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>网络最终输出 Z₂ / Ŷ</div>
                  <strong>({b} × {dout})</strong>
                </div>
                <span style={{ color: '#2563eb', fontWeight: 700 }}>──MSE/CE──▶</span>
                <div style={{ background: '#dc2626', color: '#ffffff', padding: '6px 12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>标量损失 Loss</div>
                  <strong>标量 (1)</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* 反向传播矩阵推导公式与张量契合 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '12px' }}>
            <div style={{ background: '#fdf4ff', border: '1px solid #f0abfc', borderRadius: '8px', padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span style={{ color: '#a21caf', fontWeight: 700, fontSize: '0.88rem' }}>1. 权重梯度矩阵求导（转置对齐法）</span>
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#701a75', background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #fae8ff', marginBottom: '6px' }}>
                ∂L/∂W₂ = A₁ᵀ × δ₂
              </div>
              <div style={{ fontSize: '0.8rem', color: '#86198f' }}>
                • 维度推导：({dhidden} × {b}) × ({b} × {dout}) = <strong>({dhidden} × {dout})</strong><br />
                • 直觉：由于 A₁ 的行是样本，δ₂ 的行也是样本，A₁ 转置让每个神经元在所有 {b} 个样本上的输入激活与反向误差一一相乘并求和！完美契合 W₂ 的形状！
              </div>
            </div>

            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span style={{ color: '#b45309', fontWeight: 700, fontSize: '0.88rem' }}>2. 偏置梯度求导（广播对偶沿 Batch 轴求和）</span>
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#78350f', background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #fef3c7', marginBottom: '6px' }}>
                ∂L/∂b₂ = ∑(i=1..B) δ₂[i] = 1ᵀ × δ₂
              </div>
              <div style={{ fontSize: '0.8rem', color: '#92400e' }}>
                • 维度推导：沿 Batch 轴求和：({b} × {dout}) ──sum(axis=0)──▶ <strong>(1 × {dout})</strong><br />
                • 直觉：前向传播时偏置 b₂ 被广播复制加到了每个样本上；根据多元链式法则，偏置反向收到的梯度必然是全部 {b} 个样本误差的累加和！
              </div>
            </div>

            <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span style={{ color: '#6d28d9', fontWeight: 700, fontSize: '0.88rem' }}>3. 误差逆流回隐层（投影穿透法）</span>
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#4c1d95', background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #ede9fe', marginBottom: '6px' }}>
                ∂L/∂A₁ = δ₂ × W₂ᵀ
              </div>
              <div style={{ fontSize: '0.8rem', color: '#5b21b6' }}>
                • 维度推导：({b} × {dout}) × ({dout} × {dhidden}) = <strong>({b} × {dhidden})</strong><br />
                • 直觉：W₂ 将隐层特征映射到输出层；反向时用 W₂ 的转置将输出误差重新投影回各个隐藏神经元，恢复与 A₁ 相同的形状。
              </div>
            </div>

            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span style={{ color: '#047857', fontWeight: 700, fontSize: '0.88rem' }}>4. 激活函数掩码与浅层参数梯度</span>
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#064e3b', background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1fae5', marginBottom: '6px' }}>
                δ₁ = (∂L/∂A₁) ⊙ (Z₁ &gt; 0),  ∂L/∂W₁ = Xᵀ × δ₁
              </div>
              <div style={{ fontSize: '0.8rem', color: '#065f46' }}>
                • 维度推导：Xᵀ ({din} × {b}) × δ₁ ({b} × {dhidden}) = <strong>({din} × {dhidden})</strong><br />
                • 直觉：逐元素乘以 ReLU 门控掩码，再将原始输入 X 转置与隐层误差 δ₁ 相乘，完成整个 MLP 浅层权重梯度的闭环计算！
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   5. 损失景观与优化器轨迹对比模拟器 (OptimizerTrajectoryVisualizer)
   ══════════════════════════════════════════════════════════════════ */

export function OptimizerTrajectoryVisualizer() {
  const [lr, setLr] = useState(0.2);
  const [momentumBeta, setMomentumBeta] = useState(0.85);
  const [showAll, setShowAll] = useState(true);
  const [selectedOpt, setSelectedOpt] = useState<'sgd' | 'momentum' | 'adam'>('momentum');

  // 起点：(-4.0, 3.2)
  // 目标损失函数：f(x, y) = 0.1 * x^2 + 2.0 * y^2
  // 病态条件数：20:1 (y 轴陡峭，x 轴平缓狭长峡谷)
  const computeTrajectory = (type: 'sgd' | 'momentum' | 'adam', steps = 25) => {
    let px = -4.2;
    let py = 3.2;
    let vx = 0;
    let vy = 0;
    let mx = 0;
    let my = 0;
    let sx = 0;
    let sy = 0;
    const path: { x: number; y: number; loss: number }[] = [{ x: px, y: py, loss: 0.1 * px * px + 2.0 * py * py }];

    for (let t = 1; t <= steps; t++) {
      const gx = 0.2 * px;
      const gy = 4.0 * py;

      if (type === 'sgd') {
        px = px - lr * gx;
        py = py - lr * gy;
      } else if (type === 'momentum') {
        vx = momentumBeta * vx + lr * gx;
        vy = momentumBeta * vy + lr * gy;
        px = px - vx;
        py = py - vy;
      } else if (type === 'adam') {
        const beta1 = 0.9;
        const beta2 = 0.99;
        const eps = 1e-8;
        mx = beta1 * mx + (1 - beta1) * gx;
        my = beta1 * my + (1 - beta1) * gy;
        sx = beta2 * sx + (1 - beta2) * (gx * gx);
        sy = beta2 * sy + (1 - beta2) * (gy * gy);
        const mHatX = mx / (1 - Math.pow(beta1, t));
        const mHatY = my / (1 - Math.pow(beta1, t));
        const sHatX = sx / (1 - Math.pow(beta2, t));
        const sHatY = sy / (1 - Math.pow(beta2, t));
        px = px - (lr / (Math.sqrt(sHatX) + eps)) * mHatX;
        py = py - (lr / (Math.sqrt(sHatY) + eps)) * mHatY;
      }

      // 防止数值爆炸
      px = Math.max(-5, Math.min(5, px));
      py = Math.max(-4, Math.min(4, py));
      path.push({ x: px, y: py, loss: 0.1 * px * px + 2.0 * py * py });
    }
    return path;
  };

  const sgdPath = useMemo(() => computeTrajectory('sgd'), [lr]);
  const momPath = useMemo(() => computeTrajectory('momentum'), [lr, momentumBeta]);
  const adamPath = useMemo(() => computeTrajectory('adam'), [lr]);

  // 坐标映射到 SVG 画布 (720 x 320)
  const mapX = (x: number) => 360 + x * 72;
  const mapY = (y: number) => 160 - y * 42;

  const toSvgPolyline = (pts: { x: number; y: number }[]) => {
    return pts.map((p) => `${mapX(p.x)},${mapY(p.y)}`).join(' ');
  };

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '840px', margin: '1.5rem auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
            🏔️ 损失景观（Loss Landscape）与三大优化器寻优轨迹模拟
          </h4>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
            目标函数：f(x, y) = 0.1x² + 2.0y²（典型病态狭长峡谷，y 方向曲率是 x 方向的 20 倍）
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setShowAll(!showAll)}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: '1px solid #7c5cff',
              background: showAll ? '#7c5cff' : '#f5f3ff',
              color: showAll ? '#fff' : '#6d28d9',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.82rem',
            }}
          >
            {showAll ? '🌟 正在同屏对比三者' : '🎯 单一优化器观察'}
          </button>
        </div>
      </div>

      {/* 参数控制器 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px' }}>
        <div>
          <label style={{ fontSize: '0.78rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
            <span>学习率 η (Learning Rate)</span>
            <strong style={{ color: '#2563eb' }}>{lr.toFixed(2)}</strong>
          </label>
          <input type="range" min="0.05" max="0.45" step="0.02" value={lr} onChange={(e) => setLr(parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.78rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
            <span>动量系数 β (Momentum)</span>
            <strong style={{ color: '#0891b2' }}>{momentumBeta.toFixed(2)}</strong>
          </label>
          <input type="range" min="0.5" max="0.95" step="0.05" value={momentumBeta} onChange={(e) => setMomentumBeta(parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
        {!showAll && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.82rem', color: '#475569' }}>选择查看：</span>
            <select value={selectedOpt} onChange={(e) => setSelectedOpt(e.target.value as any)} style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
              <option value="sgd">Vanilla SGD (标准梯度下降)</option>
              <option value="momentum">SGD + Momentum (动量加速)</option>
              <option value="adam">Adam (自适应矩估计)</option>
            </select>
          </div>
        )}
      </div>

      {/* SVG 画布 */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
        <svg viewBox="0 0 720 320" style={{ width: '100%', height: 'auto', display: 'block' }}>
          {/* 椭圆等高线：0.1 x^2 + 2 y^2 = C */}
          {[0.2, 0.8, 1.8, 3.2, 5.0, 7.5, 11.0, 16.0].map((c, i) => {
            const rx = Math.sqrt(c / 0.1) * 72;
            const ry = Math.sqrt(c / 2.0) * 42;
            return (
              <g key={i}>
                <ellipse cx="360" cy="160" rx={rx} ry={ry} fill="none" stroke="#e2e8f0" strokeWidth="1.2" strokeDasharray="3 3" />
                <text x={360 + rx} y="156" fontSize="9" fill="#94a3b8">
                  L={c.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* 坐标轴 */}
          <line x1="20" y1="160" x2="700" y2="160" stroke="#cbd5e1" strokeWidth="1" />
          <line x1="360" y1="20" x2="360" y2="300" stroke="#cbd5e1" strokeWidth="1" />
          <text x="690" y="174" fontSize="11" fill="#64748b" fontWeight="600">x</text>
          <text x="368" y="32" fontSize="11" fill="#64748b" fontWeight="600">y (陡峭)</text>

          {/* 极小值全局最优目标点 (0, 0) */}
          <circle cx="360" cy="160" r="5" fill="#10b981" />
          <text x="360" y="180" textAnchor="middle" fontSize="11" fill="#047857" fontWeight="700">全局极小 (0,0)</text>

          {/* 轨迹 1：Vanilla SGD (红色) */}
          {(showAll || selectedOpt === 'sgd') && (
            <g>
              <polyline points={toSvgPolyline(sgdPath)} fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              {sgdPath.map((p, i) => (
                <circle key={i} cx={mapX(p.x)} cy={mapY(p.y)} r={i === 0 ? 5 : i === sgdPath.length - 1 ? 4 : 2} fill="#ef4444" />
              ))}
            </g>
          )}

          {/* 轨迹 2：Momentum (蓝色) */}
          {(showAll || selectedOpt === 'momentum') && (
            <g>
              <polyline points={toSvgPolyline(momPath)} fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              {momPath.map((p, i) => (
                <circle key={i} cx={mapX(p.x)} cy={mapY(p.y)} r={i === 0 ? 5 : i === momPath.length - 1 ? 4 : 2} fill="#3b82f6" />
              ))}
            </g>
          )}

          {/* 轨迹 3：Adam (紫色) */}
          {(showAll || selectedOpt === 'adam') && (
            <g>
              <polyline points={toSvgPolyline(adamPath)} fill="none" stroke="#8b5cf6" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              {adamPath.map((p, i) => (
                <circle key={i} cx={mapX(p.x)} cy={mapY(p.y)} r={i === 0 ? 5 : i === adamPath.length - 1 ? 4 : 2.5} fill="#8b5cf6" />
              ))}
            </g>
          )}

          {/* 起点标注 */}
          <circle cx={mapX(-4.2)} cy={mapY(3.2)} r="6" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
          <text x={mapX(-4.2) - 10} y={mapY(3.2) - 10} fontSize="11" fill="#b45309" fontWeight="700">起点</text>
        </svg>

        {/* 右上角图例与当前状态 */}
        <div style={{ position: 'absolute', top: '10px', right: '12px', background: 'rgba(255,255,255,0.92)', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.78rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ width: '12px', height: '3px', background: '#ef4444', display: 'inline-block' }} />
            <span style={{ color: '#991b1b', fontWeight: 600 }}>Vanilla SGD</span>
            <span style={{ color: '#64748b' }}>终点 L={sgdPath[sgdPath.length - 1].loss.toFixed(3)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ width: '12px', height: '3px', background: '#3b82f6', display: 'inline-block' }} />
            <span style={{ color: '#1e40af', fontWeight: 600 }}>SGD + Momentum</span>
            <span style={{ color: '#64748b' }}>终点 L={momPath[momPath.length - 1].loss.toFixed(3)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '3px', background: '#8b5cf6', display: 'inline-block' }} />
            <span style={{ color: '#6d28d9', fontWeight: 700 }}>Adam (自适应)</span>
            <span style={{ color: '#16a34a', fontWeight: 700 }}>终点 L={adamPath[adamPath.length - 1].loss.toFixed(3)}</span>
          </div>
        </div>
      </div>

      {/* 轨迹剖析与物理直觉 */}
      <div style={{ marginTop: '12px', background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.83rem', color: '#475569', lineHeight: 1.6 }}>
        <p style={{ margin: '0 0 6px' }}>
          <strong>💡 物理直觉解析：</strong>
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '8px' }}>
          <div style={{ background: '#fff5f5', padding: '8px 10px', borderRadius: '6px', border: '1px solid #fed7d7' }}>
            <strong style={{ color: '#c53030' }}>🔴 Vanilla SGD 的峡谷折线困局：</strong><br />
            在 y 轴（峭壁）受到 4.0 倍大梯度的猛烈推击，在峭壁两边剧烈“之字形”震荡翻滚；而在平缓的 x 轴方向推进极其缓慢，无法有效前进。
          </div>
          <div style={{ background: '#eff6ff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
            <strong style={{ color: '#2b6cb0' }}>🔵 Momentum 的物理惯性熨平：</strong><br />
            利用滚铁球的惯性（EMA 累加历史速度）。y 轴上一上一下的正负震荡分量被相互抵消平抑，而沿 x 轴的同向分量持续加速，直接顺着峡谷呼啸直冲！
          </div>
          <div style={{ background: '#faf5ff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e9d8fd' }}>
            <strong style={{ color: '#6b46c1' }}>🟣 Adam 的自适应维度均衡：</strong><br />
            二阶矩除以 √v_t，自动将 y 轴的大梯度缩小，并将 x 轴的微弱梯度放大；配合一阶动量引导，轨迹近乎一条直线笔直刺向全局中心 (0,0)！
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   6. 现代正则化与归一化对比演练器 (RegularizationVisualizer)
   ══════════════════════════════════════════════════════════════════ */

export function RegularizationVisualizer() {
  const [activeTab, setActiveTab] = useState<'dropout' | 'norm'>('dropout');
  const [dropProb, setDropProb] = useState(0.4);
  const [maskSeed, setMaskSeed] = useState(1);
  const [normType, setNormType] = useState<'bn' | 'ln' | 'rmsnorm'>('ln');

  // 生成伪随机 mask (6 个隐层神经元)
  const hiddenMask = useMemo(() => {
    // 依据 seed 和 dropProb 生成稳定的 6 个布尔值
    return [0, 1, 2, 3, 4, 5].map((i) => {
      const val = (Math.sin(maskSeed * 13.37 + i * 7.19) + 1) / 2;
      return val >= dropProb; // true 为保留，false 为休眠
    });
  }, [dropProb, maskSeed]);

  const activeCount = hiddenMask.filter(Boolean).length;
  const scaleFactor = (1 / (1 - dropProb)).toFixed(2);

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '840px', margin: '1.5rem auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
            🛡️ 深度学习正则化与归一化动态演练器
          </h4>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
            直观理解 Inverted Dropout 隐式模型集成与 BatchNorm vs LayerNorm 张量切片机理
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setActiveTab('dropout')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: '1px solid #10b981',
              background: activeTab === 'dropout' ? '#10b981' : '#f0fdf4',
              color: activeTab === 'dropout' ? '#fff' : '#047857',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.82rem',
            }}
          >
            🎲 Dropout 神经元休眠演示
          </button>
          <button
            onClick={() => setActiveTab('norm')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: '1px solid #3b82f6',
              background: activeTab === 'norm' ? '#3b82f6' : '#eff6ff',
              color: activeTab === 'norm' ? '#fff' : '#1d4ed8',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.82rem',
            }}
          >
            📊 BatchNorm vs LayerNorm 切片对比
          </button>
        </div>
      </div>

      {activeTab === 'dropout' ? (
        <div>
          {/* 控制条 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', alignItems: 'center' }}>
            <div style={{ flex: '1', minWidth: '200px' }}>
              <label style={{ fontSize: '0.78rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                <span>丢弃概率 p_drop (Dropout Rate):</span>
                <strong style={{ color: '#ef4444' }}>{(dropProb * 100).toFixed(0)}%</strong>
              </label>
              <input type="range" min="0.1" max="0.7" step="0.1" value={dropProb} onChange={(e) => setDropProb(parseFloat(e.target.value))} style={{ width: '100%' }} />
            </div>
            <button
              onClick={() => setMaskSeed((s) => s + 1)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid #10b981',
                background: '#10b981',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.82rem',
              }}
            >
              🎲 重新采样休眠掩码 (Next Mask)
            </button>
            <div style={{ fontSize: '0.82rem', color: '#475569' }}>
              存活神经元：<strong style={{ color: '#16a34a' }}>{activeCount} / 6</strong> (反向缩放因子：<strong style={{ color: '#2563eb' }}>×{scaleFactor}</strong>)
            </div>
          </div>

          {/* 神经网络连线与休眠可视化 */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', position: 'relative' }}>
            <svg viewBox="0 0 700 240" style={{ width: '100%', height: 'auto', display: 'block' }}>
              {/* 输入层 (4 个节点) x=100 */}
              {[30, 80, 130, 180].map((y, i) => (
                <g key={'in-' + i}>
                  <circle cx="100" cy={y} r="14" fill="#eff6ff" stroke="#3b82f6" strokeWidth="2" />
                  <text x="100" y={y + 4} textAnchor="middle" fontSize="10.5" fill="#1e40af" fontWeight="600">x{i + 1}</text>
                </g>
              ))}

              {/* 隐藏层 (6 个节点) x=350 */}
              {[20, 56, 92, 128, 164, 200].map((y, i) => {
                const isActive = hiddenMask[i];
                return (
                  <g key={'hid-' + i} opacity={isActive ? 1.0 : 0.28}>
                    {/* 连接线：输入层到隐藏层 */}
                    {[30, 80, 130, 180].map((iny, ini) => (
                      <line key={ini} x1="114" y1={iny} x2="334" y2={y} stroke={isActive ? '#94a3b8' : '#e2e8f0'} strokeWidth={isActive ? '1' : '0.5'} strokeDasharray={isActive ? undefined : '2 2'} />
                    ))}
                    {/* 节点本体 */}
                    <circle cx="350" cy={y} r="15" fill={isActive ? '#ecfdf5' : '#f1f5f9'} stroke={isActive ? '#10b981' : '#94a3b8'} strokeWidth={isActive ? '2.5' : '1.5'} />
                    {isActive ? (
                      <text x="350" y={y + 4} textAnchor="middle" fontSize="10.5" fill="#047857" fontWeight="700">h{i + 1}</text>
                    ) : (
                      <text x="350" y={y + 4} textAnchor="middle" fontSize="13" fill="#ef4444" fontWeight="800">×</text>
                    )}
                    {/* 缩放因子标注 */}
                    {isActive && (
                      <text x="375" y={y + 3} fontSize="9" fill="#2563eb" fontWeight="600">×{scaleFactor}</text>
                    )}
                  </g>
                );
              })}

              {/* 输出层 (2 个节点) x=600 */}
              {[70, 150].map((y, i) => (
                <g key={'out-' + i}>
                  {/* 连接线：隐藏层到输出层 */}
                  {[20, 56, 92, 128, 164, 200].map((hy, hi) => {
                    const isHActive = hiddenMask[hi];
                    return (
                      <line key={hi} x1="366" y1={hy} x2="584" y2={y} stroke={isHActive ? '#10b981' : '#f1f5f9'} strokeWidth={isHActive ? '1.2' : '0.5'} opacity={isHActive ? 0.7 : 0.15} />
                    );
                  })}
                  <circle cx="600" cy={y} r="16" fill="#fdf4ff" stroke="#a855f7" strokeWidth="2.5" />
                  <text x="600" y={y + 4} textAnchor="middle" fontSize="11" fill="#7e22ce" fontWeight="700">y{i + 1}</text>
                </g>
              ))}

              {/* 顶部层标题 */}
              <text x="100" y="10" textAnchor="middle" fontSize="11" fill="#64748b" fontWeight="700">输入层 (Inputs)</text>
              <text x="350" y="10" textAnchor="middle" fontSize="11" fill="#10b981" fontWeight="700">Dropout 隐层 (2⁶ 种可能子网络)</text>
              <text x="600" y="10" textAnchor="middle" fontSize="11" fill="#a855f7" fontWeight="700">输出层 (Outputs)</text>
            </svg>
          </div>

          <div style={{ marginTop: '12px', background: '#f0fdf4', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.82rem', color: '#166534', lineHeight: 1.5 }}>
            <strong>💡 Inverted Dropout（反向丢弃）设计精髓：</strong>
            在训练阶段随机屏蔽部分神经元，并在激活值上直接乘上放大系数 <strong>1/(1 - p)</strong>。这样在<strong>推理测试（Inference）阶段</strong>，模型无需进行任何缩放变换或代码改动，模型结构完全恢复原生状态，实现零推理性能损耗！
          </div>
        </div>
      ) : (
        <div>
          {/* 归一化对比 */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            <button
              onClick={() => setNormType('bn')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid #f59e0b',
                background: normType === 'bn' ? '#f59e0b' : '#fffbeb',
                color: normType === 'bn' ? '#fff' : '#b45309',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.84rem',
              }}
            >
              Batch Normalization (批归一化 · 视觉主流)
            </button>
            <button
              onClick={() => setNormType('ln')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid #3b82f6',
                background: normType === 'ln' ? '#3b82f6' : '#eff6ff',
                color: normType === 'ln' ? '#fff' : '#1d4ed8',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.84rem',
              }}
            >
              Layer Normalization (层归一化 · Transformer标配)
            </button>
            <button
              onClick={() => setNormType('rmsnorm')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid #8b5cf6',
                background: normType === 'rmsnorm' ? '#8b5cf6' : '#f5f3ff',
                color: normType === 'rmsnorm' ? '#fff' : '#6d28d9',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.84rem',
              }}
            >
              RMSNorm (LLaMA/DeepSeek 极速演化版)
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div>
              <h5 style={{ margin: '0 0 8px', fontSize: '0.94rem', color: '#0f172a' }}>
                {normType === 'bn' && '📌 BatchNorm 的切片维度：跨样本垂直切片'}
                {normType === 'ln' && '📌 LayerNorm 的切片维度：单样本水平切片'}
                {normType === 'rmsnorm' && '📌 RMSNorm 的切片维度：无偏置单样本均方根'}
              </h5>
              <p style={{ margin: '0 0 10px', fontSize: '0.82rem', color: '#475569', lineHeight: 1.6 }}>
                {normType === 'bn' && '沿着 Batch 批次维度（样本轴）进行统计计算。对于每一个特征通道 c，计算批次内所有 B 个样本的均值与方差。'}
                {normType === 'ln' && '沿着 Feature 特征维度进行统计计算。每个样本是完全独立的宇宙，计算单个样本当前时刻所有隐藏维度的均值与方差。'}
                {normType === 'rmsnorm' && '基于一个精妙发现：LayerNorm 的成功 99% 归功于方差缩放，减去均值几乎无额外收益。直接用均方根 RMS(x) 进行归一化，省掉均值计算，推理提速 20%！'}
              </p>

              <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '0.82rem', color: '#1e293b' }}>
                {normType === 'bn' && 'μ_c = (1/B) ∑_{i=1}^B x_{i, c}\nσ²_c = (1/B) ∑_{i=1}^B (x_{i, c} - μ_c)²\nx̂ = (x - μ_c) / √(σ²_c + ε)'}
                {normType === 'ln' && 'μ_i = (1/D) ∑_{j=1}^D x_{i, j}\nσ²_i = (1/D) ∑_{j=1}^D (x_{i, j} - μ_i)²\nx̂ = (x - μ_i) / √(σ²_i + ε)'}
                {normType === 'rmsnorm' && 'RMS(x) = √((1/D) ∑_{j=1}^D x_j² + ε)\nx̂ = x / RMS(x)\ny = γ ⊙ x̂ (省掉加偏置 β)'}
              </div>
            </div>

            <div style={{ background: '#ffffff', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#334155' }}>
              <strong style={{ color: '#0f172a' }}>核心对比决策表：</strong>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ padding: '6px', textAlign: 'left' }}>维度</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>BatchNorm</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>LayerNorm / RMSNorm</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px', fontWeight: 600 }}>统计范围</td>
                    <td style={{ padding: '6px', color: '#d97706' }}>跨 Batch 样本</td>
                    <td style={{ padding: '6px', color: '#2563eb' }}>单样本内独立</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px', fontWeight: 600 }}>对 Batch Size 依赖</td>
                    <td style={{ padding: '6px', color: '#dc2626' }}>强依赖（B 小时崩溃）</td>
                    <td style={{ padding: '6px', color: '#16a34a' }}>完全无关（B=1 亦稳定）</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px', fontWeight: 600 }}>序列变长适应性</td>
                    <td style={{ padding: '6px', color: '#dc2626' }}>极差（Pad 导致统计失真）</td>
                    <td style={{ padding: '6px', color: '#16a34a' }}>完美（每个 Token 独立）</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px', fontWeight: 600 }}>统治领域</td>
                    <td style={{ padding: '6px' }}>传统 CNN 图像识别</td>
                    <td style={{ padding: '6px', fontWeight: 700, color: '#7c5cff' }}>Transformer / LLM 统一标配</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   7. 卷积特征提取与滑动窗口交互模拟器 (ConvKernelVisualizer)
   ══════════════════════════════════════════════════════════════════ */

export function ConvKernelVisualizer() {
  const [pattern, setPattern] = useState<'vert' | 'horiz' | 'cross'>('vert');
  const [kernelType, setKernelType] = useState<'sobel_v' | 'sobel_h' | 'sharpen' | 'blur'>('sobel_v');
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number }>({ r: 0, c: 0 });

  // 5x5 输入图像模式
  const patterns: Record<'vert' | 'horiz' | 'cross', number[][]> = {
    vert: [
      [10, 10, 80, 80, 80],
      [10, 10, 80, 80, 80],
      [10, 10, 80, 80, 80],
      [10, 10, 80, 80, 80],
      [10, 10, 80, 80, 80],
    ],
    horiz: [
      [10, 10, 10, 10, 10],
      [10, 10, 10, 10, 10],
      [80, 80, 80, 80, 80],
      [80, 80, 80, 80, 80],
      [80, 80, 80, 80, 80],
    ],
    cross: [
      [10, 10, 80, 10, 10],
      [10, 10, 80, 10, 10],
      [80, 80, 80, 80, 80],
      [10, 10, 80, 10, 10],
      [10, 10, 80, 10, 10],
    ],
  };

  // 3x3 卷积核算子
  const kernels: Record<'sobel_v' | 'sobel_h' | 'sharpen' | 'blur', number[][]> = {
    sobel_v: [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1],
    ],
    sobel_h: [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1],
    ],
    sharpen: [
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0],
    ],
    blur: [
      [1 / 9, 1 / 9, 1 / 9],
      [1 / 9, 1 / 9, 1 / 9],
      [1 / 9, 1 / 9, 1 / 9],
    ],
  };

  const image = patterns[pattern];
  const kernel = kernels[kernelType];

  // 卷积计算 (5x5, k=3, p=0, s=1 -> 3x3 输出)
  const output: number[][] = [];
  for (let r = 0; r < 3; r++) {
    const row: number[] = [];
    for (let c = 0; c < 3; c++) {
      let sum = 0;
      for (let kr = 0; kr < 3; kr++) {
        for (let kc = 0; kc < 3; kc++) {
          sum += image[r + kr][c + kc] * kernel[kr][kc];
        }
      }
      row.push(Math.round(sum));
    }
    output.push(row);
  }

  // 当前选中单元格对应的卷积展开相乘明细
  const calculationDetails = useMemo(() => {
    const r = selectedCell.r;
    const c = selectedCell.c;
    const terms: string[] = [];
    let total = 0;
    for (let kr = 0; kr < 3; kr++) {
      for (let kc = 0; kc < 3; kc++) {
        const pVal = image[r + kr][c + kc];
        const kVal = kernel[kr][kc];
        const prod = pVal * kVal;
        total += prod;
        if (Math.abs(kVal) > 0.001) {
          terms.push(`(${pVal} × ${kVal >= 0 ? kVal.toFixed(kVal < 1 && kVal > 0 ? 2 : 0) : kVal})`);
        }
      }
    }
    return { terms, total: Math.round(total) };
  }, [selectedCell, image, kernel]);

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '840px', margin: '1.5rem auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
            🔍 2D 卷积特征提取与局部感受野滑动窗口模拟器
          </h4>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
            移动鼠标悬停在输出特征图各点，实时高亮输入图像对应的局部 3×3 感受野并展开代数计算
          </p>
        </div>
      </div>

      {/* 控制器 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.82rem', color: '#475569' }}>测试图像模式：</span>
          <select value={pattern} onChange={(e) => setPattern(e.target.value as any)} style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
            <option value="vert">垂直明暗分界（Vertical Edge）</option>
            <option value="horiz">水平明暗分界（Horizontal Edge）</option>
            <option value="cross">十字交叉亮线（Crossroads）</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.82rem', color: '#475569' }}>卷积核算子：</span>
          <select value={kernelType} onChange={(e) => setKernelType(e.target.value as any)} style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
            <option value="sobel_v">Sobel 垂直边缘检测核 ([-1, 0, 1])</option>
            <option value="sobel_h">Sobel 水平边缘检测核 ([-1, -2, -1]^T)</option>
            <option value="sharpen">Laplacian 图像锐化算子</option>
            <option value="blur">Box Blur 均值平滑模糊</option>
          </select>
        </div>
      </div>

      {/* 视觉对比区域：输入图像 + 卷积核 + 输出特征图 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'center', background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        {/* 1. 输入图像 5x5 */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: '8px' }}>
            输入特征图 X (5 × 5)
          </div>
          <div style={{ display: 'inline-grid', gridTemplateColumns: 'repeat(5, 34px)', gridTemplateRows: 'repeat(5, 34px)', gap: '2px', background: '#e2e8f0', padding: '4px', borderRadius: '6px' }}>
            {image.map((row, r) =>
              row.map((val, c) => {
                const inReceptiveField =
                  r >= selectedCell.r &&
                  r < selectedCell.r + 3 &&
                  c >= selectedCell.c &&
                  c < selectedCell.c + 3;
                return (
                  <div
                    key={`${r}-${c}`}
                    style={{
                      background: `rgb(${val * 2.8 + 20}, ${val * 2.8 + 20}, ${val * 2.8 + 20})`,
                      color: val > 50 ? '#0f172a' : '#f8fafc',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '3px',
                      border: inReceptiveField ? '2.5px solid #f97316' : '1px solid rgba(0,0,0,0.1)',
                      boxShadow: inReceptiveField ? '0 0 8px rgba(249, 115, 22, 0.6)' : undefined,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {val}
                  </div>
                );
              })
            )}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#f97316', marginTop: '6px', fontWeight: 600 }}>
            橙框：当前输出像素的局部感受野
          </div>
        </div>

        {/* 2. 卷积核 3x3 */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#6d28d9', marginBottom: '8px' }}>
            卷积核 Filter W (3 × 3)
          </div>
          <div style={{ display: 'inline-grid', gridTemplateColumns: 'repeat(3, 36px)', gridTemplateRows: 'repeat(3, 36px)', gap: '3px', background: '#ede9fe', padding: '4px', borderRadius: '6px' }}>
            {kernel.map((row, r) =>
              row.map((val, c) => (
                <div
                  key={`k-${r}-${c}`}
                  style={{
                    background: '#ffffff',
                    color: val > 0 ? '#15803d' : val < 0 ? '#b91c1c' : '#64748b',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    border: '1px solid #c4b5fd',
                  }}
                >
                  {val >= 0 ? (val < 1 && val > 0 ? val.toFixed(1) : val) : val}
                </div>
              ))
            )}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#6d28d9', marginTop: '6px' }}>
            共享权重（Weight Sharing）
          </div>
        </div>

        {/* 3. 输出特征图 3x3 */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#047857', marginBottom: '8px' }}>
            输出特征图 Out (3 × 3)
          </div>
          <div style={{ display: 'inline-grid', gridTemplateColumns: 'repeat(3, 42px)', gridTemplateRows: 'repeat(3, 42px)', gap: '3px', background: '#dcfce7', padding: '4px', borderRadius: '6px' }}>
            {output.map((row, r) =>
              row.map((val, c) => {
                const isSelected = selectedCell.r === r && selectedCell.c === c;
                return (
                  <div
                    key={`out-${r}-${c}`}
                    onMouseEnter={() => setSelectedCell({ r, c })}
                    onClick={() => setSelectedCell({ r, c })}
                    style={{
                      background: isSelected ? '#10b981' : '#ffffff',
                      color: isSelected ? '#ffffff' : Math.abs(val) > 100 ? '#047857' : '#334155',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      border: isSelected ? '2px solid #047857' : '1px solid #86efac',
                      boxShadow: isSelected ? '0 0 8px rgba(16, 185, 129, 0.5)' : undefined,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {val}
                  </div>
                );
              })
            )}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#047857', marginTop: '6px' }}>
            点击任意格子查看局部卷积计算
          </div>
        </div>
      </div>

      {/* 底部展开计算公式 */}
      <div style={{ marginTop: '12px', background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontWeight: 700, color: '#0f172a' }}>
            当前输出像素 Out[{selectedCell.r}, {selectedCell.c}] 卷积内积计算：
          </span>
          <strong style={{ color: '#047857', fontSize: '0.94rem' }}>= {calculationDetails.total}</strong>
        </div>
        <div style={{ fontFamily: 'monospace', color: '#64748b', wordBreak: 'break-all' }}>
          Out[{selectedCell.r}, {selectedCell.c}] = {calculationDetails.terms.slice(0, 6).join(' + ')}
          {calculationDetails.terms.length > 6 ? ' + ...' : ''} = {calculationDetails.total}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   8. 深度残差块与梯度高速公路剖析器 (ResNetBlockVisualizer)
   ══════════════════════════════════════════════════════════════════ */

export function ResNetBlockVisualizer() {
  const [hasShortcut, setHasShortcut] = useState(true);
  const [flowMode, setFlowMode] = useState<'forward' | 'backward'>('backward');

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '840px', margin: '1.5rem auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
            🚀 ResNet 残差块（Residual Block）与梯度高速公路剖析
          </h4>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
            何恺明团队 2015 破局之作：通过恒等跳跃连接（Skip Connection）建立梯度无损直达通道
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setHasShortcut(!hasShortcut)}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: hasShortcut ? '1px solid #10b981' : '1px solid #ef4444',
              background: hasShortcut ? '#ecfdf5' : '#fef2f2',
              color: hasShortcut ? '#047857' : '#b91c1c',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.82rem',
            }}
          >
            {hasShortcut ? '✓ 已开启残差连接 (ResNet)' : '✗ 断开残差 (Plain Net)'}
          </button>
          <button
            onClick={() => setFlowMode(flowMode === 'forward' ? 'backward' : 'forward')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: '1px solid #7c5cff',
              background: flowMode === 'backward' ? '#7c5cff' : '#f5f3ff',
              color: flowMode === 'backward' ? '#fff' : '#6d28d9',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.82rem',
            }}
          >
            {flowMode === 'forward' ? '➡️ 前向信号流' : '⬅️ 反向梯度流'}
          </button>
        </div>
      </div>

      {/* SVG 架构图 */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', position: 'relative' }}>
        <svg viewBox="0 0 740 240" style={{ width: '100%', height: 'auto', display: 'block' }}>
          <defs>
            <marker id="res-arrow-fwd" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#10b981" />
            </marker>
            <marker id="res-arrow-bwd" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#f97316" />
            </marker>
          </defs>

          {/* 输入节点 x */}
          <g transform="translate(40, 100)">
            <rect width="60" height="40" rx="8" fill="#eff6ff" stroke="#3b82f6" strokeWidth="2" />
            <text x="30" y="24" textAnchor="middle" fontSize="13" fill="#1e40af" fontWeight="700">输入 x</text>
          </g>

          {/* 主分支：残差卷积路径 F(x) */}
          {/* x -> Conv1 */}
          <line x1="100" y1="120" x2="160" y2="120" stroke={flowMode === 'forward' ? '#10b981' : '#cbd5e1'} strokeWidth="2.5" markerEnd={flowMode === 'forward' ? 'url(#res-arrow-fwd)' : undefined} />
          {/* Conv 1 */}
          <g transform="translate(160, 95)">
            <rect width="90" height="50" rx="6" fill="#f8fafc" stroke="#64748b" strokeWidth="1.5" />
            <text x="45" y="22" textAnchor="middle" fontSize="11" fill="#334155" fontWeight="600">Weight Layer</text>
            <text x="45" y="38" textAnchor="middle" fontSize="10" fill="#64748b">Conv 3×3 + BN</text>
          </g>
          {/* Conv1 -> ReLU */}
          <line x1="250" y1="120" x2="290" y2="120" stroke={flowMode === 'forward' ? '#10b981' : '#cbd5e1'} strokeWidth="2.5" markerEnd={flowMode === 'forward' ? 'url(#res-arrow-fwd)' : undefined} />
          {/* ReLU 1 */}
          <g transform="translate(290, 100)">
            <rect width="50" height="40" rx="6" fill="#ecfdf5" stroke="#10b981" strokeWidth="1.5" />
            <text x="25" y="24" textAnchor="middle" fontSize="11" fill="#047857" fontWeight="700">ReLU</text>
          </g>
          {/* ReLU -> Conv2 */}
          <line x1="340" y1="120" x2="380" y2="120" stroke={flowMode === 'forward' ? '#10b981' : '#cbd5e1'} strokeWidth="2.5" markerEnd={flowMode === 'forward' ? 'url(#res-arrow-fwd)' : undefined} />
          {/* Conv 2 */}
          <g transform="translate(380, 95)">
            <rect width="90" height="50" rx="6" fill="#f8fafc" stroke="#64748b" strokeWidth="1.5" />
            <text x="45" y="22" textAnchor="middle" fontSize="11" fill="#334155" fontWeight="600">Weight Layer</text>
            <text x="45" y="38" textAnchor="middle" fontSize="10" fill="#64748b">Conv 3×3 + BN</text>
          </g>
          {/* Conv2 -> ⊕ */}
          <line x1="470" y1="120" x2="525" y2="120" stroke={flowMode === 'forward' ? '#10b981' : '#cbd5e1'} strokeWidth="2.5" markerEnd={flowMode === 'forward' ? 'url(#res-arrow-fwd)' : undefined} />

          {/* 恒等跳跃连接 Shortcut (如果开启) */}
          {hasShortcut && (
            <g>
              {/* 前向流动路径 */}
              <path
                d="M 125 120 L 125 40 L 545 40 L 545 95"
                fill="none"
                stroke={flowMode === 'forward' ? '#10b981' : '#94a3b8'}
                strokeWidth={flowMode === 'forward' ? '3' : '2'}
                markerEnd={flowMode === 'forward' ? 'url(#res-arrow-fwd)' : undefined}
              />
              <text x="335" y="30" textAnchor="middle" fontSize="11" fill="#15803d" fontWeight="700">
                恒等映射跳跃连接 Identity Shortcut x (无参数零开销)
              </text>

              {/* 反向梯度高速公路 (如果处于 backward 模式) */}
              {flowMode === 'backward' && (
                <g>
                  <path
                    d="M 545 95 L 545 40 L 125 40 L 125 120"
                    fill="none"
                    stroke="#16a34a"
                    strokeWidth="3.5"
                    strokeDasharray="5 3"
                    markerEnd="url(#res-arrow-bwd)"
                  />
                  <rect x="220" y="48" width="230" height="22" rx="4" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.2" />
                  <text x="335" y="63" textAnchor="middle" fontSize="11" fill="#166534" fontWeight="800">
                    ⚡ 梯度高速公路：∂L/∂y × 1.0 (无损直达)
                  </text>
                </g>
              )}
            </g>
          )}

          {/* 相加节点 ⊕ */}
          <g transform="translate(525, 100)">
            <circle cx="20" cy="20" r="20" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2.5" />
            <text x="20" y="27" textAnchor="middle" fontSize="22" fill="#b45309" fontWeight="800">⊕</text>
            <text x="20" y="-6" textAnchor="middle" fontSize="10.5" fill="#78350f" fontWeight="600">F(x) + x</text>
          </g>

          {/* ⊕ -> Final ReLU */}
          <line x1="565" y1="120" x2="600" y2="120" stroke={flowMode === 'forward' ? '#10b981' : '#cbd5e1'} strokeWidth="2.5" markerEnd={flowMode === 'forward' ? 'url(#res-arrow-fwd)' : undefined} />
          {/* Final ReLU */}
          <g transform="translate(600, 100)">
            <rect width="45" height="40" rx="6" fill="#ecfdf5" stroke="#10b981" strokeWidth="1.5" />
            <text x="22" y="24" textAnchor="middle" fontSize="11" fill="#047857" fontWeight="700">ReLU</text>
          </g>

          {/* 输出 y */}
          <line x1="645" y1="120" x2="675" y2="120" stroke={flowMode === 'forward' ? '#10b981' : '#cbd5e1'} strokeWidth="2.5" />
          <g transform="translate(675, 100)">
            <rect width="50" height="40" rx="8" fill="#fdf4ff" stroke="#a855f7" strokeWidth="2" />
            <text x="25" y="24" textAnchor="middle" fontSize="12" fill="#7e22ce" fontWeight="700">输出 y</text>
          </g>

          {/* 反向模式下残差卷积路径上的微弱梯度 */}
          {flowMode === 'backward' && (
            <g stroke="#f97316" strokeWidth="2" fill="none">
              <path d="M 525 130 L 470 130" strokeDasharray="3 3" markerEnd="url(#res-arrow-bwd)" />
              <path d="M 380 130 L 340 130" strokeDasharray="3 3" markerEnd="url(#res-arrow-bwd)" />
              <path d="M 290 130 L 250 130" strokeDasharray="3 3" markerEnd="url(#res-arrow-bwd)" />
              <path d="M 160 130 L 105 130" strokeDasharray="3 3" markerEnd="url(#res-arrow-bwd)" />
            </g>
          )}
        </svg>
      </div>

      {/* 底部数学推导核心面板 */}
      <div style={{ marginTop: '12px', background: hasShortcut ? '#f0fdf4' : '#fff5f5', padding: '12px 16px', borderRadius: '8px', border: hasShortcut ? '1px solid #86efac' : '1px solid #feb2b2' }}>
        {hasShortcut ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '1.2rem' }}>🎉</span>
              <strong style={{ color: '#166534', fontSize: '0.92rem' }}>
                ResNet 反向传播数学公式：∂L/∂x_l = ∂L/∂x_L · (1 + ∂F/∂x_l)
              </strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.83rem', color: '#14532d', lineHeight: 1.6 }}>
              注意到括号中**恒等于 1 的关键常数项**！即使中间的残差路径权重极小或者激活处于饱和区（导致 ∂F/∂x 趋近于 0），括号里的 1 依然能确保上游梯度 <strong>∂L/∂x_L 被 100% 毫无损耗地直接复制传回底层 x_l</strong>。
              这就是何恺明团队能够将网络深度一举推至 152 层甚至 1000 层的根本数学魔法！
            </p>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '1.2rem' }}>⚠️</span>
              <strong style={{ color: '#991b1b', fontSize: '0.92rem' }}>
                传统直筒网络（Plain Net）困境：∂L/∂x_l = ∂L/∂x_L · ∏_{'{'}i=l{'}'}^{'{'}L-1{'}'} W_i
              </strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.83rem', color: '#7f1d1d', lineHeight: 1.6 }}>
              在没有 Skip Connection 的直筒网络中，反向梯度必须艰难地穿过每一层权重矩阵与激活函数的连乘。当层数达到 20 层以上时，梯度在连乘中呈指数级衰减至 0（退化困境），导致浅层参数完全停止更新，深层网络训练集误差不降反升！
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   9. RNN 时序展开与时间反向传播 (BPTT) 可视化器 (RnnBpttVisualizer)
   ══════════════════════════════════════════════════════════════════ */

export function RnnBpttVisualizer() {
  const [viewMode, setViewMode] = useState<'forward' | 'bptt'>('bptt');
  const [spectralRadius, setSpectralRadius] = useState<number>(0.85);

  // 模拟长程时序反向传播中梯度的逐级衰减/爆炸比例
  // 每步有效衰减率 = 谱半径 * 激活导数均值(~0.8)
  const effectiveRatio = spectralRadius * 0.8;
  const steps = [1, 2, 4, 8, 12, 16, 20];
  const gradientDeltas = steps.map((s) => ({
    step: s,
    norm: Math.pow(effectiveRatio, s),
  }));

  const getGradientColor = (norm: number) => {
    if (norm < 0.01) return '#ef4444'; // 严重弥散
    if (norm < 0.2) return '#f59e0b'; // 明显衰减
    if (norm <= 3.0) return '#10b981'; // 健康区间
    return '#dc2626'; // 梯度爆炸
  };

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '840px', margin: '1.5rem auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
            🔄 RNN 时序展开与时间反向传播（BPTT）动力学
          </h4>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
            剖析隐藏状态递归连乘机制与梯度在时间轴上的指数级衰减/爆炸病灶
          </p>
        </div>

        {/* 模式切换 */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setViewMode('forward')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: viewMode === 'forward' ? '2px solid #3b82f6' : '1px solid #cbd5e1',
              background: viewMode === 'forward' ? '#eff6ff' : '#ffffff',
              color: viewMode === 'forward' ? '#1d4ed8' : '#64748b',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            ⏩ 前向展开计算
          </button>
          <button
            onClick={() => setViewMode('bptt')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: viewMode === 'bptt' ? '2px solid #ef4444' : '1px solid #cbd5e1',
              background: viewMode === 'bptt' ? '#fef2f2' : '#ffffff',
              color: viewMode === 'bptt' ? '#b91c1c' : '#64748b',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            ⏪ BPTT 梯度逆流与消失
          </button>
        </div>
      </div>

      {/* 参数调控面板 */}
      <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ flex: '1 1 300px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
              <span style={{ fontWeight: 600, color: '#334155' }}>
                隐藏层循环权重谱半径 / 特征值模长 ρ(W_hh)：
              </span>
              <strong style={{ color: spectralRadius > 1.2 ? '#dc2626' : spectralRadius < 0.8 ? '#ea580c' : '#059669', fontSize: '0.92rem' }}>
                {spectralRadius.toFixed(2)} {spectralRadius > 1.25 ? '⚠️ (爆炸危险)' : spectralRadius < 0.75 ? '❄️ (严重弥散)' : '✅ (中等平衡)'}
              </strong>
            </div>
            <input
              type="range"
              min="0.40"
              max="1.35"
              step="0.05"
              value={spectralRadius}
              onChange={(e) => setSpectralRadius(parseFloat(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>

          <div style={{ fontSize: '0.82rem', color: '#475569', background: '#ffffff', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
            <span>单步有效梯度乘子: </span>
            <strong style={{ color: effectiveRatio >= 1.0 ? '#dc2626' : '#2563eb' }}>{effectiveRatio.toFixed(3)}</strong>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '4px' }}>(含 tanh′ 导数衰减)</span>
          </div>
        </div>
      </div>

      {/* SVG 展开计算图 */}
      <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '16px 8px', overflowX: 'auto' }}>
        <svg viewBox="0 0 760 260" style={{ width: '100%', minWidth: '660px', height: 'auto', display: 'block' }}>
          <defs>
            <marker id="arrow-fwd" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#3b82f6" />
            </marker>
            <marker id="arrow-bwd" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#ef4444" />
            </marker>
            <marker id="arrow-green" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#10b981" />
            </marker>
          </defs>

          {/* 时间轴标签 */}
          <text x="30" y="20" fontSize="11" fill="#94a3b8" fontWeight="700">时序推进轴 t →</text>
          <line x1="115" y1="16" x2="720" y2="16" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4 4" />

          {/* 3 个典型时序步：t-1, t, t+1 */}
          {[
            { idx: 't-1', cx: 160, token: '"The"', target: '"cat"' },
            { idx: 't', cx: 380, token: '"cat"', target: '"sat"' },
            { idx: 't+1', cx: 600, token: '"sat"', target: '"on"' },
          ].map((item) => (
            <g key={item.idx}>
              {/* 输入节点 x_t */}
              <g transform={`translate(${item.cx - 45}, 205)`} style={{ cursor: 'pointer' }}>
                <rect width="90" height="36" rx="6" fill="#f8fafc" stroke="#64748b" strokeWidth="1.5" />
                <text x="45" y="16" textAnchor="middle" fontSize="11" fill="#475569" fontWeight="600">输入 x_{item.idx}</text>
                <text x="45" y="30" textAnchor="middle" fontSize="10" fill="#2563eb" fontWeight="700">{item.token}</text>
              </g>

              {/* 输入到隐藏层连线 */}
              {viewMode === 'forward' ? (
                <line x1={item.cx} y1="205" x2={item.cx} y2="158" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrow-fwd)" />
              ) : (
                <line x1={item.cx} y1="158" x2={item.cx} y2="205" stroke="#f87171" strokeWidth="1.5" strokeDasharray="3 3" />
              )}
              <text x={item.cx + 8} y="185" fontSize="9.5" fill="#64748b" fontFamily="monospace">W_xh</text>

              {/* 隐藏状态节点 h_t */}
              <g transform={`translate(${item.cx - 50}, 110)`} style={{ cursor: 'pointer' }}>
                <rect
                  width="100"
                  height="44"
                  rx="8"
                  fill="#eff6ff"
                  stroke="#2563eb"
                  strokeWidth="2"
                />
                <text x="50" y="18" textAnchor="middle" fontSize="11.5" fill="#1e40af" fontWeight="700">隐藏层 h_{item.idx}</text>
                <text x="50" y="34" textAnchor="middle" fontSize="9.5" fill="#3b82f6" fontFamily="monospace">tanh(a_{item.idx})</text>
              </g>

              {/* 隐藏层到输出层连线 */}
              {viewMode === 'forward' ? (
                <line x1={item.cx} y1="110" x2={item.cx} y2="68" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrow-green)" />
              ) : (
                <line x1={item.cx} y1="68" x2={item.cx} y2="110" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrow-bwd)" />
              )}
              <text x={item.cx + 8} y="92" fontSize="9.5" fill="#64748b" fontFamily="monospace">W_hy</text>

              {/* 输出与损失节点 y_t / L_t */}
              <g transform={`translate(${item.cx - 45}, 28)`}>
                <rect width="90" height="36" rx="6" fill="#fef2f2" stroke="#ef4444" strokeWidth="1.5" />
                <text x="45" y="15" textAnchor="middle" fontSize="10.5" fill="#991b1b" fontWeight="600">输出 y_{item.idx}</text>
                <text x="45" y="29" textAnchor="middle" fontSize="10" fill="#b91c1c" fontWeight="700">损失 L_{item.idx}</text>
              </g>
            </g>
          ))}

          {/* 循环权重水平连线：前向或反向 */}
          {viewMode === 'forward' ? (
            <>
              <line x1="210" y1="132" x2="325" y2="132" stroke="#3b82f6" strokeWidth="2.5" markerEnd="url(#arrow-fwd)" />
              <rect x="245" y="116" width="55" height="18" rx="4" fill="#eff6ff" stroke="#93c5fd" />
              <text x="272" y="129" textAnchor="middle" fontSize="10" fill="#1d4ed8" fontWeight="700" fontFamily="monospace">W_hh</text>

              <line x1="430" y1="132" x2="545" y2="132" stroke="#3b82f6" strokeWidth="2.5" markerEnd="url(#arrow-fwd)" />
              <rect x="465" y="116" width="55" height="18" rx="4" fill="#eff6ff" stroke="#93c5fd" />
              <text x="492" y="129" textAnchor="middle" fontSize="10" fill="#1d4ed8" fontWeight="700" fontFamily="monospace">W_hh</text>
            </>
          ) : (
            <>
              {/* BPTT 反向红流：h_{t+1} -> h_t -> h_{t-1} */}
              <line x1="550" y1="132" x2="435" y2="132" stroke="#ef4444" strokeWidth="3" markerEnd="url(#arrow-bwd)" />
              <g transform="translate(450, 116)" style={{ cursor: 'pointer' }}>
                <rect width="78" height="20" rx="4" fill="#fee2e2" stroke="#ef4444" strokeWidth="1.5" />
                <text x="39" y="14" textAnchor="middle" fontSize="9.5" fill="#991b1b" fontWeight="700" fontFamily="monospace">× (W_hh^T·J)</text>
              </g>

              <line x1="330" y1="132" x2="215" y2="132" stroke="#ef4444" strokeWidth="2" strokeDasharray={effectiveRatio < 0.6 ? '4 3' : undefined} markerEnd="url(#arrow-bwd)" />
              <g transform="translate(230, 116)" style={{ cursor: 'pointer' }}>
                <rect width="78" height="20" rx="4" fill="#fee2e2" stroke="#ef4444" strokeWidth="1.5" />
                <text x="39" y="14" textAnchor="middle" fontSize="9.5" fill="#991b1b" fontWeight="700" fontFamily="monospace">× (W_hh^T·J)</text>
              </g>

              <line x1="110" y1="132" x2="30" y2="132" stroke="#ef4444" strokeWidth="1" strokeDasharray="3 3" markerEnd="url(#arrow-bwd)" />
              <text x="60" y="126" textAnchor="middle" fontSize="9" fill="#dc2626">... 衰减至 0</text>
            </>
          )}
        </svg>
      </div>

      {/* 梯度衰减趋势条形图 */}
      <div style={{ marginTop: '16px', background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <strong style={{ fontSize: '0.88rem', color: '#1e293b' }}>
            📊 梯度逆流回传衰减/暴涨模拟：∂L_T / ∂h_(T-k) 相对幅度追踪
          </strong>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            理论公式：||∂h_T / ∂h_(T-k)|| ≈ [ρ(W_hh) · 0.8]^k
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', alignItems: 'end', height: '110px', paddingTop: '10px', paddingBottom: '4px' }}>
          {gradientDeltas.map((g) => {
            const clampedNorm = Math.min(Math.max(g.norm, 0.0001), 4.0);
            const heightPercent = Math.min(100, Math.round((clampedNorm / 1.5) * 80));
            const barColor = getGradientColor(g.norm);

            return (
              <div key={g.step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: barColor, marginBottom: '4px' }}>
                  {g.norm > 99 ? '>99' : g.norm < 0.001 ? '<0.001' : g.norm.toFixed(3)}
                </span>
                <div
                  style={{
                    width: '70%',
                    height: `${Math.max(6, heightPercent)}%`,
                    background: barColor,
                    borderRadius: '4px 4px 0 0',
                    transition: 'all 0.2s ease',
                  }}
                />
                <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                  k={g.step}步
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 核心原理解析说明卡 */}
      <div style={{ marginTop: '12px', background: '#eff6ff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '0.84rem', color: '#1e3a8a', lineHeight: 1.6 }}>
        <strong style={{ display: 'block', marginBottom: '4px', color: '#1d4ed8' }}>
          💡 为什么标准 RNN 会在时间轴上必然丧失长程依赖记忆？
        </strong>
        时间反向传播（BPTT）时，第 T 步损失对第 1 步隐藏状态的偏导包含雅可比矩阵连乘：
        <span style={{ fontFamily: 'monospace', background: '#dbeafe', padding: '2px 6px', borderRadius: '4px', margin: '0 4px', fontWeight: 600 }}>
          ∂h_T / ∂h_1 = ∏_(j=2)^T diag(1 - tanh²(a_j)) · W_hh^T
        </span>
        若权重矩阵特征值模长小于 1 且 tanh 导数恒 ≤ 1，梯度在跨越 10~20 个时间步后将呈指数级塌陷至 0（梯度消失），网络完全无法根据句首信息预测句尾；反之若特征值模长持续大于 1，则梯度呈指数级暴涨引发 NaN（梯度爆炸）。
        这正是 Hochreiter & Schmidhuber 在 1997 年发明 <strong>LSTM 门控传送带</strong> 的最根本动力！
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   10. 门控记忆细胞解剖：LSTM 与 GRU 内部电路模拟器 (LstmCellVisualizer)
   ══════════════════════════════════════════════════════════════════ */

export function LstmCellVisualizer() {
  const [modelType, setModelType] = useState<'lstm' | 'gru'>('lstm');
  
  // LSTM 门控参数交互状态
  const [forgetGate, setForgetGate] = useState<number>(0.85); // f_t
  const [inputGate, setInputGate] = useState<number>(0.65);  // i_t
  const [candidateC, setCandidateC] = useState<number>(0.80); // ~C_t
  const [prevC, setPrevC] = useState<number>(0.50);          // C_{t-1}
  const [outputGate, setOutputGate] = useState<number>(0.90); // o_t

  // GRU 门控参数交互状态
  const [resetGate, setResetGate] = useState<number>(0.80);  // r_t
  const [updateGate, setUpdateGate] = useState<number>(0.40); // z_t
  const [prevH, setPrevH] = useState<number>(0.60);          // h_{t-1}
  const [candidateH, setCandidateH] = useState<number>(0.85); // ~h_t

  // 当前选中高亮的门控组件
  const [selectedGate, setSelectedGate] = useState<'forget' | 'input' | 'candidate' | 'output' | 'conveyor' | 'gru_update' | 'gru_reset'>('conveyor');

  // LSTM 动态计算
  const lstmRetainedC = forgetGate * prevC;
  const lstmInjectedC = inputGate * candidateC;
  const lstmNextC = lstmRetainedC + lstmInjectedC;
  const lstmTanhC = Math.tanh(lstmNextC);
  const lstmNextH = outputGate * lstmTanhC;

  // GRU 动态计算
  const gruBlendedH = (1 - updateGate) * prevH + updateGate * candidateH;

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '840px', margin: '1.5rem auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
            🧬 门控记忆细胞解剖：{modelType === 'lstm' ? 'LSTM 三门一态传送带' : 'GRU 双门合一轻量架构'}
          </h4>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
            {modelType === 'lstm'
              ? 'Hochreiter & Schmidhuber (1997)：用“线性加法传送带”击碎梯度消失神话'
              : 'Cho et al. (2014)：合并不二状态，参数减少 25% 的工业利刃'}
          </p>
        </div>

        {/* 架构切换 Tab */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => { setModelType('lstm'); setSelectedGate('conveyor'); }}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: modelType === 'lstm' ? '2px solid #059669' : '1px solid #cbd5e1',
              background: modelType === 'lstm' ? '#ecfdf5' : '#ffffff',
              color: modelType === 'lstm' ? '#047857' : '#64748b',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            🌟 LSTM (标准三门)
          </button>
          <button
            onClick={() => { setModelType('gru'); setSelectedGate('gru_update'); }}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: modelType === 'gru' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
              background: modelType === 'gru' ? '#f5f3ff' : '#ffffff',
              color: modelType === 'gru' ? '#6d28d9' : '#64748b',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            ⚡ GRU (精简双门)
          </button>
        </div>
      </div>

      {/* 滑块参数调节区 */}
      <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
        {modelType === 'lstm' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '2px' }}>
                <span style={{ fontWeight: 600, color: '#334155' }}>遗忘门 f_t (保留历史比例)：</span>
                <strong style={{ color: '#ea580c' }}>{(forgetGate * 100).toFixed(0)}%</strong>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={forgetGate}
                onChange={(e) => setForgetGate(parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '2px' }}>
                <span style={{ fontWeight: 600, color: '#334155' }}>输入门 i_t (写入新知权重)：</span>
                <strong style={{ color: '#2563eb' }}>{(inputGate * 100).toFixed(0)}%</strong>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={inputGate}
                onChange={(e) => setInputGate(parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '2px' }}>
                <span style={{ fontWeight: 600, color: '#334155' }}>候选知识 ~C_t：</span>
                <strong style={{ color: '#059669' }}>{candidateC.toFixed(2)}</strong>
              </div>
              <input
                type="range"
                min="-1.0"
                max="1.0"
                step="0.05"
                value={candidateC}
                onChange={(e) => setCandidateC(parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '2px' }}>
                <span style={{ fontWeight: 600, color: '#334155' }}>输出门 o_t (曝光过滤)：</span>
                <strong style={{ color: '#9333ea' }}>{(outputGate * 100).toFixed(0)}%</strong>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={outputGate}
                onChange={(e) => setOutputGate(parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '2px' }}>
                <span style={{ fontWeight: 600, color: '#334155' }}>更新门 z_t (新旧平衡)：</span>
                <strong style={{ color: '#7c3aed' }}>{(updateGate * 100).toFixed(0)}% 新知识</strong>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={updateGate}
                onChange={(e) => setUpdateGate(parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '2px' }}>
                <span style={{ fontWeight: 600, color: '#334155' }}>重置门 r_t (过去抑制率)：</span>
                <strong style={{ color: '#dc2626' }}>{(resetGate * 100).toFixed(0)}% 保留</strong>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={resetGate}
                onChange={(e) => setResetGate(parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 动态电路 SVG */}
      <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '16px 8px', overflowX: 'auto' }}>
        {modelType === 'lstm' ? (
          <svg viewBox="0 0 760 300" style={{ width: '100%', minWidth: '660px', height: 'auto', display: 'block' }}>
            <defs>
              <marker id="arrow-lstm" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#64748b" />
              </marker>
              <marker id="arrow-orange" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#ea580c" />
              </marker>
              <marker id="arrow-blue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#2563eb" />
              </marker>
              <marker id="arrow-gold" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#d97706" />
              </marker>
            </defs>

            {/* 顶部长程记忆传送带：C_{t-1} -> (*) -> (+) -> C_t */}
            <g onClick={() => setSelectedGate('conveyor')} style={{ cursor: 'pointer' }}>
              {/* 高速公路背景带 */}
              <rect x="40" y="35" width="680" height="30" rx="6" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
              <text x="55" y="54" fontSize="11.5" fill="#b45309" fontWeight="800">C_{'{'}t-1{'}'} (细胞传送带)</text>

              {/* 乘法遗忘算子 (*) */}
              <circle cx="240" cy="50" r="14" fill="#fed7aa" stroke="#ea580c" strokeWidth="2" />
              <text x="240" y="55" textAnchor="middle" fontSize="16" fill="#c2410c" fontWeight="bold">×</text>

              {/* 加法写入算子 (+) */}
              <circle cx="450" cy="50" r="14" fill="#bbf7d0" stroke="#16a34a" strokeWidth="2" />
              <text x="450" y="55" textAnchor="middle" fontSize="18" fill="#15803d" fontWeight="bold">+</text>

              {/* 终点 C_t */}
              <line x1="464" y1="50" x2="670" y2="50" stroke="#d97706" strokeWidth="3" markerEnd="url(#arrow-gold)" />
              <text x="685" y="54" fontSize="12" fill="#b45309" fontWeight="800">C_t = {lstmNextC.toFixed(2)}</text>
            </g>

            {/* 底部输入分支 [h_{t-1}, x_t] */}
            <g transform="translate(50, 240)">
              <rect width="110" height="34" rx="6" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />
              <text x="55" y="21" textAnchor="middle" fontSize="11" fill="#334155" fontWeight="700">[h_{'{'}t-1{'}'}, x_t]</text>
            </g>
            <line x1="160" y1="257" x2="660" y2="257" stroke="#94a3b8" strokeWidth="2" />

            {/* 门 1：遗忘门 f_t */}
            <g transform="translate(210, 160)" onClick={() => setSelectedGate('forget')} style={{ cursor: 'pointer' }}>
              <rect
                width="60"
                height="44"
                rx="6"
                fill={selectedGate === 'forget' ? '#ffedd5' : '#fff7ed'}
                stroke="#ea580c"
                strokeWidth={selectedGate === 'forget' ? 2.5 : 1.5}
              />
              <text x="30" y="20" textAnchor="middle" fontSize="12" fill="#c2410c" fontWeight="700">σ (f_t)</text>
              <text x="30" y="35" textAnchor="middle" fontSize="10" fill="#ea580c" fontWeight="800">{(forgetGate * 100).toFixed(0)}%</text>
            </g>
            <line x1="240" y1="257" x2="240" y2="204" stroke="#94a3b8" strokeWidth="1.5" />
            <line x1="240" y1="160" x2="240" y2="64" stroke="#ea580c" strokeWidth="2.5" markerEnd="url(#arrow-orange)" />

            {/* 门 2：输入门 i_t */}
            <g transform="translate(350, 160)" onClick={() => setSelectedGate('input')} style={{ cursor: 'pointer' }}>
              <rect
                width="60"
                height="44"
                rx="6"
                fill={selectedGate === 'input' ? '#dbeafe' : '#eff6ff'}
                stroke="#2563eb"
                strokeWidth={selectedGate === 'input' ? 2.5 : 1.5}
              />
              <text x="30" y="20" textAnchor="middle" fontSize="12" fill="#1d4ed8" fontWeight="700">σ (i_t)</text>
              <text x="30" y="35" textAnchor="middle" fontSize="10" fill="#2563eb" fontWeight="800">{(inputGate * 100).toFixed(0)}%</text>
            </g>
            <line x1="380" y1="257" x2="380" y2="204" stroke="#94a3b8" strokeWidth="1.5" />

            {/* 候选状态 ~C_t */}
            <g transform="translate(440, 160)" onClick={() => setSelectedGate('candidate')} style={{ cursor: 'pointer' }}>
              <rect
                width="64"
                height="44"
                rx="6"
                fill={selectedGate === 'candidate' ? '#dcfce7' : '#f0fdf4'}
                stroke="#16a34a"
                strokeWidth={selectedGate === 'candidate' ? 2.5 : 1.5}
              />
              <text x="32" y="20" textAnchor="middle" fontSize="11.5" fill="#15803d" fontWeight="700">tanh (~C_t)</text>
              <text x="32" y="35" textAnchor="middle" fontSize="10" fill="#16a34a" fontWeight="800">{candidateC.toFixed(2)}</text>
            </g>
            <line x1="472" y1="257" x2="472" y2="204" stroke="#94a3b8" strokeWidth="1.5" />

            {/* 输入门与候选状态相乘 (*) */}
            <circle cx="415" cy="115" r="11" fill="#e0e7ff" stroke="#4338ca" strokeWidth="1.5" />
            <text x="415" y="119" textAnchor="middle" fontSize="14" fill="#3730a3" fontWeight="bold">×</text>
            <line x1="380" y1="160" x2="407" y2="123" stroke="#2563eb" strokeWidth="2" />
            <line x1="472" y1="160" x2="423" y2="123" stroke="#16a34a" strokeWidth="2" />
            <line x1="415" y1="104" x2="444" y2="62" stroke="#4338ca" strokeWidth="2" markerEnd="url(#arrow-lstm)" />

            {/* 门 3：输出门 o_t */}
            <g transform="translate(560, 160)" onClick={() => setSelectedGate('output')} style={{ cursor: 'pointer' }}>
              <rect
                width="60"
                height="44"
                rx="6"
                fill={selectedGate === 'output' ? '#f3e8ff' : '#faf5ff'}
                stroke="#9333ea"
                strokeWidth={selectedGate === 'output' ? 2.5 : 1.5}
              />
              <text x="30" y="20" textAnchor="middle" fontSize="12" fill="#7e22ce" fontWeight="700">σ (o_t)</text>
              <text x="30" y="35" textAnchor="middle" fontSize="10" fill="#9333ea" fontWeight="800">{(outputGate * 100).toFixed(0)}%</text>
            </g>
            <line x1="590" y1="257" x2="590" y2="204" stroke="#94a3b8" strokeWidth="1.5" />

            {/* 细胞状态送入 tanh 并与输出门相乘得到 h_t */}
            <path d="M 510,65 L 510,115 L 610,115" fill="none" stroke="#d97706" strokeWidth="2" />
            <circle cx="630" cy="115" r="11" fill="#fae8ff" stroke="#a855f7" strokeWidth="1.5" />
            <text x="630" y="119" textAnchor="middle" fontSize="14" fill="#7e22ce" fontWeight="bold">×</text>
            <line x1="590" y1="160" x2="622" y2="123" stroke="#9333ea" strokeWidth="2" />

            {/* 输出隐藏状态 h_t */}
            <line x1="641" y1="115" x2="710" y2="115" stroke="#7e22ce" strokeWidth="2.5" markerEnd="url(#arrow-lstm)" />
            <text x="715" y="119" fontSize="11.5" fill="#6b21a8" fontWeight="800">h_t = {lstmNextH.toFixed(2)}</text>
          </svg>
        ) : (
          <svg viewBox="0 0 760 260" style={{ width: '100%', minWidth: '660px', height: 'auto', display: 'block' }}>
            <defs>
              <marker id="arrow-gru" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#7c3aed" />
              </marker>
            </defs>

            {/* GRU 双门架构示意 */}
            <rect x="50" y="40" width="660" height="180" rx="10" fill="#faf5ff" stroke="#c084fc" strokeWidth="1.5" />
            <text x="70" y="65" fontSize="12" fill="#6b21a8" fontWeight="700">GRU 紧凑内部结构：合并隐藏状态 h 与细胞状态 C</text>

            {/* 重置门 r_t */}
            <g transform="translate(150, 100)" onClick={() => setSelectedGate('gru_reset')} style={{ cursor: 'pointer' }}>
              <rect width="80" height="44" rx="6" fill="#fee2e2" stroke="#ef4444" strokeWidth="1.5" />
              <text x="40" y="20" textAnchor="middle" fontSize="12" fill="#991b1b" fontWeight="700">重置门 r_t</text>
              <text x="40" y="35" textAnchor="middle" fontSize="10" fill="#dc2626" fontWeight="800">{(resetGate * 100).toFixed(0)}%</text>
            </g>

            {/* 更新门 z_t */}
            <g transform="translate(300, 100)" onClick={() => setSelectedGate('gru_update')} style={{ cursor: 'pointer' }}>
              <rect width="80" height="44" rx="6" fill="#ede9fe" stroke="#7c3aed" strokeWidth="1.5" />
              <text x="40" y="20" textAnchor="middle" fontSize="12" fill="#5b21b6" fontWeight="700">更新门 z_t</text>
              <text x="40" y="35" textAnchor="middle" fontSize="10" fill="#7c3aed" fontWeight="800">{(updateGate * 100).toFixed(0)}%</text>
            </g>

            {/* 凸显凸组合公式 */}
            <g transform="translate(450, 95)">
              <rect width="230" height="55" rx="8" fill="#ffffff" stroke="#a855f7" strokeWidth="2" />
              <text x="115" y="24" textAnchor="middle" fontSize="11" fill="#6b21a8" fontWeight="700">
                凸组合状态插值：
              </text>
              <text x="115" y="43" textAnchor="middle" fontSize="12" fill="#4c1d95" fontWeight="800" fontFamily="monospace">
                h_t = (1 - z_t)·h_{'{'}t-1{'}'} + z_t·~h_t
              </text>
            </g>

            {/* 连线与结果 */}
            <line x1="230" y1="122" x2="300" y2="122" stroke="#94a3b8" strokeWidth="1.5" />
            <line x1="380" y1="122" x2="450" y2="122" stroke="#7c3aed" strokeWidth="2" markerEnd="url(#arrow-gru)" />
          </svg>
        )}
      </div>

      {/* 实时状态输出与数学解读卡 */}
      <div style={{ marginTop: '14px', background: '#f8fafc', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>
            {modelType === 'lstm' ? '💡 为什么线性加法传送带 ∂C_t / ∂C_{t-1} = f_t 能击溃梯度消失？' : '⚡ GRU 架构优势：参数精简 25% 与计算提速'}
          </strong>
          {modelType === 'lstm' ? (
            <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#059669', background: '#ecfdf5', padding: '3px 8px', borderRadius: '4px', border: '1px solid #a7f3d0' }}>
              当前单步记忆导数 ∂C_t/∂C_{'{'}t-1{'}'} = {forgetGate.toFixed(2)}
            </span>
          ) : (
            <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#7c3aed', background: '#f5f3ff', padding: '3px 8px', borderRadius: '4px', border: '1px solid #ddd6fe' }}>
              输出隐藏状态 h_t = {gruBlendedH.toFixed(2)}
            </span>
          )}
        </div>

        {modelType === 'lstm' ? (
          <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569', lineHeight: 1.6 }}>
            在标准 RNN 中，隐藏状态间通过非线性权重矩阵逐层映射（<span style={{ fontFamily: 'monospace' }}>h_t = tanh(W·h + ...)</span>），导致反向梯度必须反复连乘非线性雅可比矩阵；而在 LSTM 中，记忆细胞状态遵循纯加法运算（<span style={{ fontFamily: 'monospace' }}>C_t = f_t ⊙ C_{'{'}t-1{'}'} + i_t ⊙ ~C_t</span>）。
            这意味着只要遗忘门 <span style={{ fontFamily: 'monospace' }}>f_t ≈ 1.0</span>，梯度的直通偏导数就恒等于 1，信号可以毫无衰减地在时间轴上自由回传数百步，彻底解决了长短程依赖割裂的困境！
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569', lineHeight: 1.6 }}>
            GRU（2014）将 LSTM 的细胞状态 C_t 与隐藏状态 h_t 强行合二为一，并把输入门与遗忘门整合为互补的“更新门 z_t”（保留历史权重为 1-z_t，注入新知识权重为 z_t）。
            相比 LSTM 的 4 组参数矩阵，GRU 仅需 3 组矩阵，参数量减少约 25%，在中小规模时序任务中训练更快且几乎不损失表征能力。
          </p>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   11. 变分自编码器（VAE）隐空间流形与重参数化技巧可视化器 (VaeLatentVisualizer)
   ══════════════════════════════════════════════════════════════════ */

export function VaeLatentVisualizer() {
  const [modelType, setModelType] = useState<'vae' | 'ae'>('vae');
  const [mu, setMu] = useState<number>(0.2);
  const [logvar, setLogvar] = useState<number>(-0.4); // std ≈ 0.82
  const [eps, setEps] = useState<number>(0.75);

  const std = Math.exp(0.5 * logvar);
  const z = mu + std * eps;
  // KL Divergence = -0.5 * (1 + logvar - mu^2 - exp(logvar))
  const klDivergence = -0.5 * (1.0 + logvar - mu * mu - Math.exp(logvar));

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '840px', margin: '1.5rem auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
            🧬 {modelType === 'vae' ? '变分自编码器（VAE）隐空间高斯流形与重参数化' : '传统自编码器（AE）确定性瓶颈与离散断裂'}
          </h4>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
            {modelType === 'vae'
              ? 'Kingma & Welling (2013)：通过 KL 散度先验约束与 Reparameterization Trick 实现连续平滑生成'
              : '传统 AE 缺乏概率先验：隐空间呈现孤立离散聚类，空隙处随机采样产生崩溃乱码'}
          </p>
        </div>

        {/* 模型切换 */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setModelType('vae')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: modelType === 'vae' ? '2px solid #8b5cf6' : '1px solid #cbd5e1',
              background: modelType === 'vae' ? '#f5f3ff' : '#ffffff',
              color: modelType === 'vae' ? '#7c3aed' : '#64748b',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            🌌 VAE (概率正态先验)
          </button>
          <button
            onClick={() => setModelType('ae')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: modelType === 'ae' ? '2px solid #64748b' : '1px solid #cbd5e1',
              background: modelType === 'ae' ? '#f1f5f9' : '#ffffff',
              color: modelType === 'ae' ? '#334155' : '#64748b',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            🧱 传统 AE (确定性压缩)
          </button>
        </div>
      </div>

      {/* 参数调控面板 */}
      {modelType === 'vae' && (
        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '2px' }}>
                <span style={{ fontWeight: 600, color: '#334155' }}>均值向量 μ：</span>
                <strong style={{ color: '#2563eb' }}>{mu.toFixed(2)}</strong>
              </div>
              <input
                type="range"
                min="-2.0"
                max="2.0"
                step="0.05"
                value={mu}
                onChange={(e) => setMu(parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '2px' }}>
                <span style={{ fontWeight: 600, color: '#334155' }}>对数方差 log(σ²) (标准差 σ = {std.toFixed(2)})：</span>
                <strong style={{ color: '#ea580c' }}>{logvar.toFixed(2)}</strong>
              </div>
              <input
                type="range"
                min="-2.0"
                max="1.5"
                step="0.05"
                value={logvar}
                onChange={(e) => setLogvar(parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '2px' }}>
                <span style={{ fontWeight: 600, color: '#334155' }}>外生独立标准正态噪声 ε ~ N(0, 1)：</span>
                <strong style={{ color: '#059669' }}>{eps.toFixed(2)}</strong>
              </div>
              <input
                type="range"
                min="-2.0"
                max="2.0"
                step="0.05"
                value={eps}
                onChange={(e) => setEps(parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* SVG 架构与计算流图 */}
      <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '16px 8px', overflowX: 'auto' }}>
        {modelType === 'vae' ? (
          <svg viewBox="0 0 760 270" style={{ width: '100%', minWidth: '660px', height: 'auto', display: 'block' }}>
            <defs>
              <marker id="arrow-vae" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#7c3aed" />
              </marker>
              <marker id="arrow-blue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#2563eb" />
              </marker>
              <marker id="arrow-green" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#059669" />
              </marker>
            </defs>

            {/* 输入 x */}
            <g transform="translate(30, 105)">
              <rect width="65" height="50" rx="8" fill="#f8fafc" stroke="#64748b" strokeWidth="2" />
              <text x="32" y="24" textAnchor="middle" fontSize="12" fill="#334155" fontWeight="700">原始输入</text>
              <text x="32" y="40" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="monospace">x</text>
            </g>
            <line x1="95" y1="130" x2="140" y2="130" stroke="#64748b" strokeWidth="2" markerEnd="url(#arrow-blue)" />

            {/* 编码器 q_phi(z|x) */}
            <g transform="translate(140, 85)">
              <path d="M 0,0 L 90,20 L 90,70 L 0,90 Z" fill="#eff6ff" stroke="#3b82f6" strokeWidth="2" />
              <text x="45" y="44" textAnchor="middle" fontSize="12" fill="#1d4ed8" fontWeight="700">编码器</text>
              <text x="45" y="60" textAnchor="middle" fontSize="10" fill="#3b82f6" fontFamily="monospace">q_φ(z|x)</text>
            </g>

            {/* 分支 1：均值 μ */}
            <line x1="230" y1="110" x2="280" y2="70" stroke="#3b82f6" strokeWidth="2" />
            <g transform="translate(280, 50)">
              <rect width="80" height="38" rx="6" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.5" />
              <text x="40" y="18" textAnchor="middle" fontSize="11" fill="#1e40af" fontWeight="700">均值 μ</text>
              <text x="40" y="32" textAnchor="middle" fontSize="11" fill="#2563eb" fontWeight="800">{mu.toFixed(2)}</text>
            </g>

            {/* 分支 2：对数方差 log(σ²) */}
            <line x1="230" y1="150" x2="280" y2="190" stroke="#3b82f6" strokeWidth="2" />
            <g transform="translate(280, 172)">
              <rect width="80" height="38" rx="6" fill="#ffedd5" stroke="#ea580c" strokeWidth="1.5" />
              <text x="40" y="18" textAnchor="middle" fontSize="11" fill="#c2410c" fontWeight="700">标准差 σ</text>
              <text x="40" y="32" textAnchor="middle" fontSize="11" fill="#ea580c" fontWeight="800">{std.toFixed(2)}</text>
            </g>

            {/* 外生噪声输入 ε */}
            <g transform="translate(280, 115)">
              <circle cx="20" cy="18" r="14" fill="#ecfdf5" stroke="#10b981" strokeWidth="1.5" />
              <text x="20" y="22" textAnchor="middle" fontSize="12" fill="#047857" fontWeight="bold">ε</text>
              <text x="44" y="22" fontSize="9.5" fill="#059669">~N(0, 1)</text>
            </g>

            {/* 重参数化操作框：z = μ + σ ⊙ ε */}
            <g transform="translate(400, 75)">
              <rect width="130" height="110" rx="8" fill="#faf5ff" stroke="#a855f7" strokeWidth="2" strokeDasharray="4 4" />
              <text x="65" y="20" textAnchor="middle" fontSize="10.5" fill="#7c3aed" fontWeight="700">重参数化技巧</text>

              {/* 乘法算子 σ * ε */}
              <circle cx="45" cy="50" r="11" fill="#ede9fe" stroke="#7c3aed" strokeWidth="1.5" />
              <text x="45" y="54" textAnchor="middle" fontSize="13" fill="#6d28d9" fontWeight="bold">×</text>

              {/* 加法算子 μ + (σ*ε) */}
              <circle cx="95" cy="50" r="11" fill="#ede9fe" stroke="#7c3aed" strokeWidth="1.5" />
              <text x="95" y="54" textAnchor="middle" fontSize="14" fill="#6d28d9" fontWeight="bold">+</text>

              <line x1="56" y1="50" x2="84" y2="50" stroke="#7c3aed" strokeWidth="1.5" />
              <text x="65" y="92" textAnchor="middle" fontSize="11" fill="#5b21b6" fontWeight="800">z = {z.toFixed(2)}</text>
            </g>

            {/* 连线连入重参数化节点 */}
            <line x1="360" y1="69" x2="480" y2="69" stroke="#2563eb" strokeWidth="1.5" />
            <line x1="480" y1="69" x2="495" y2="40" stroke="#2563eb" strokeWidth="1.5" />
            <line x1="360" y1="191" x2="435" y2="191" stroke="#ea580c" strokeWidth="1.5" />
            <line x1="435" y1="191" x2="445" y2="61" stroke="#ea580c" strokeWidth="1.5" />
            <line x1="320" y1="133" x2="435" y2="133" stroke="#10b981" strokeWidth="1.5" />
            <line x1="435" y1="133" x2="445" y2="61" stroke="#10b981" strokeWidth="1.5" />

            {/* 解码器 p_theta(x|z) */}
            <line x1="530" y1="130" x2="560" y2="130" stroke="#7c3aed" strokeWidth="2.5" markerEnd="url(#arrow-vae)" />
            <g transform="translate(560, 85)">
              <path d="M 0,20 L 90,0 L 90,90 L 0,70 Z" fill="#fdf4ff" stroke="#c084fc" strokeWidth="2" />
              <text x="45" y="44" textAnchor="middle" fontSize="12" fill="#7e22ce" fontWeight="700">解码器</text>
              <text x="45" y="60" textAnchor="middle" fontSize="10" fill="#a855f7" fontFamily="monospace">p_θ(x|z)</text>
            </g>

            {/* 输出重构 x_hat */}
            <line x1="650" y1="130" x2="685" y2="130" stroke="#c084fc" strokeWidth="2" markerEnd="url(#arrow-vae)" />
            <g transform="translate(685, 105)">
              <rect width="65" height="50" rx="8" fill="#faf5ff" stroke="#a855f7" strokeWidth="2" />
              <text x="32" y="24" textAnchor="middle" fontSize="12" fill="#6b21a8" fontWeight="700">重构输出</text>
              <text x="32" y="40" textAnchor="middle" fontSize="11" fill="#7e22ce" fontFamily="monospace">x̂</text>
            </g>
          </svg>
        ) : (
          <svg viewBox="0 0 760 210" style={{ width: '100%', minWidth: '660px', height: 'auto', display: 'block' }}>
            {/* 传统 AE 架构 */}
            <rect x="50" y="30" width="660" height="150" rx="10" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
            <text x="70" y="55" fontSize="12" fill="#334155" fontWeight="700">传统自编码器（Autoencoder）：确定性瓶颈与离散过拟合</text>

            <g transform="translate(90, 80)">
              <rect width="70" height="44" rx="6" fill="#ffffff" stroke="#64748b" strokeWidth="1.5" />
              <text x="35" y="26" textAnchor="middle" fontSize="12" fill="#334155" fontWeight="700">输入 x</text>
            </g>

            <line x1="160" y1="102" x2="230" y2="102" stroke="#64748b" strokeWidth="2" />
            <g transform="translate(230, 70)">
              <rect width="100" height="64" rx="8" fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
              <text x="50" y="36" textAnchor="middle" fontSize="12" fill="#1e293b" fontWeight="700">确定性编码器</text>
            </g>

            <line x1="330" y1="102" x2="400" y2="102" stroke="#64748b" strokeWidth="2" />
            <g transform="translate(400, 75)">
              <rect width="90" height="54" rx="8" fill="#fee2e2" stroke="#ef4444" strokeWidth="2" />
              <text x="45" y="24" textAnchor="middle" fontSize="11" fill="#991b1b" fontWeight="700">确定性瓶颈 z</text>
              <text x="45" y="42" textAnchor="middle" fontSize="10" fill="#dc2626">无正态先验约束</text>
            </g>

            <line x1="490" y1="102" x2="560" y2="102" stroke="#64748b" strokeWidth="2" />
            <g transform="translate(560, 70)">
              <rect width="100" height="64" rx="8" fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
              <text x="50" y="36" textAnchor="middle" fontSize="12" fill="#1e293b" fontWeight="700">确定性解码器</text>
            </g>
          </svg>
        )}
      </div>

      {/* 实时动态数学量化分析 */}
      <div style={{ marginTop: '14px', background: '#f8fafc', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>
            {modelType === 'vae' ? '📊 VAE 损失平衡：证据下界（ELBO）两极制衡' : '⚠️ 为什么传统 AE 无法充当真正的“生成模型”？'}
          </strong>
          {modelType === 'vae' && (
            <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#7c3aed', background: '#f5f3ff', padding: '3px 8px', borderRadius: '4px', border: '1px solid #ddd6fe' }}>
              当前正则化惩罚 D_KL(q||p) = {klDivergence.toFixed(3)}
            </span>
          )}
        </div>

        {modelType === 'vae' ? (
          <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569', lineHeight: 1.6 }}>
            VAE 的核心突破在于<strong>重参数化技巧（Reparameterization Trick）</strong>：直接从随机变量采样的操作不可微（无法反向传播求导），因此将随机性隔离到外部独立标准正态噪声 <span style={{ fontFamily: 'monospace' }}>ε ~ N(0, 1)</span> 中，网络只需学习均值 <span style={{ fontFamily: 'monospace' }}>μ</span> 与方差 <span style={{ fontFamily: 'monospace' }}>σ</span>，通过仿射变换 <span style={{ fontFamily: 'monospace' }}>z = μ + σ ⊙ ε</span> 构建隐变量，使端到端梯度求导无阻畅通！
            同时，KL 散度强行将隐空间拉向标准正态分布，彻底消除了隐空间的断裂空白，确保在任意坐标采样都能解码出高质量生成图像。
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569', lineHeight: 1.6 }}>
            传统自编码器虽然能高效压缩数据，但其隐空间完全未经概率分布先验规约，训练样本被映射为高维空间中孤立分散的点聚类（Clustered Islands）。两团数据点之间的广阔“空白荒漠”从未被解码器学习过，一旦从这些缝隙中随机采样隐向量，解码器只能输出完全不可理解的混沌噪点。
          </p>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   12. 扩散模型前向加噪与逆向 U-Net 去噪雕刻流 (DiffusionFlowVisualizer)
   ══════════════════════════════════════════════════════════════════ */

export function DiffusionFlowVisualizer() {
  const [stepT, setStepT] = useState<number>(300); // 0 ~ 1000
  const [viewMode, setViewMode] = useState<'forward' | 'reverse'>('reverse');
  const [cfgScale, setCfgScale] = useState<number>(7.5); // Classifier-free guidance scale

  // 模拟余弦/线性方差调度
  // alpha_bar_t 从 1.0 (t=0) 逐渐衰减至接近 0.0 (t=1000)
  const ratio = stepT / 1000.0;
  const alphaBar = Math.cos(((ratio + 0.008) / 1.008) * (Math.PI / 2)) ** 2;
  const signalWeight = Math.sqrt(alphaBar);
  const noiseWeight = Math.sqrt(1.0 - alphaBar);
  const snr = alphaBar / Math.max(1.0 - alphaBar, 1e-5);

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '840px', margin: '1.5rem auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
            🌊 现代扩散模型（DDPM）：前向布朗加噪与逆向 U-Net 去噪雕塑
          </h4>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
            Ho et al. (2020)：从非平衡热力学到文本生成艺术（Stable Diffusion / Midjourney 的数学引擎）
          </p>
        </div>

        {/* 模式切换 */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setViewMode('forward')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: viewMode === 'forward' ? '2px solid #ea580c' : '1px solid #cbd5e1',
              background: viewMode === 'forward' ? '#fff7ed' : '#ffffff',
              color: viewMode === 'forward' ? '#c2410c' : '#64748b',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            ⏩ 前向加噪（一步闭式采样）
          </button>
          <button
            onClick={() => setViewMode('reverse')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: viewMode === 'reverse' ? '2px solid #059669' : '1px solid #cbd5e1',
              background: viewMode === 'reverse' ? '#ecfdf5' : '#ffffff',
              color: viewMode === 'reverse' ? '#047857' : '#64748b',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            ⏪ 逆向去噪（U-Net 噪声预测雕刻）
          </button>
        </div>
      </div>

      {/* 滑块参数调节区 */}
      <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: '4px' }}>
              <span style={{ fontWeight: 600, color: '#334155' }}>
                扩散时间步 t：
              </span>
              <strong style={{ color: stepT > 750 ? '#dc2626' : stepT > 300 ? '#ea580c' : '#059669' }}>
                t = {stepT} / 1000 {stepT === 0 ? '(清晰原图)' : stepT === 1000 ? '(纯高斯白噪)' : ''}
              </strong>
            </div>
            <input
              type="range"
              min="0"
              max="1000"
              step="20"
              value={stepT}
              onChange={(e) => setStepT(parseInt(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: '4px' }}>
              <span style={{ fontWeight: 600, color: '#334155' }}>
                无分类器引导缩放因子（CFG Scale w）：
              </span>
              <strong style={{ color: '#7c3aed' }}>
                w = {cfgScale.toFixed(1)} {cfgScale > 9 ? '⚠️(过饱和)' : cfgScale < 3 ? '☁️(贴合弱)' : '✨(理想)'}
              </strong>
            </div>
            <input
              type="range"
              min="1.0"
              max="12.0"
              step="0.5"
              value={cfgScale}
              onChange={(e) => setCfgScale(parseFloat(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>
        </div>
      </div>

      {/* 5 阶段演化流水线示意图 */}
      <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '16px 8px', overflowX: 'auto' }}>
        <svg viewBox="0 0 760 210" style={{ width: '100%', minWidth: '660px', height: 'auto', display: 'block' }}>
          {/* 时间轴进度箭头 */}
          {viewMode === 'forward' ? (
            <>
              <line x1="80" y1="20" x2="680" y2="20" stroke="#ea580c" strokeWidth="2.5" markerEnd="url(#arrow-orange)" />
              <text x="380" y="14" textAnchor="middle" fontSize="10.5" fill="#c2410c" fontWeight="700">前向扩散时间流 t →（不可逆信息衰减与热力学熵增）</text>
            </>
          ) : (
            <>
              <line x1="680" y1="20" x2="80" y2="20" stroke="#059669" strokeWidth="2.5" markerEnd="url(#arrow-green)" />
              <text x="380" y="14" textAnchor="middle" fontSize="10.5" fill="#047857" fontWeight="700">逆向去噪时间流 ← t（神经网络逐级预测并剥离噪声）</text>
            </>
          )}

          {/* 5 个关键时间步切片展示 */}
          {[
            { t: 0, cx: 80, label: 'x_0 (原图)', desc: '100% 信号', noisePct: 0 },
            { t: 250, cx: 230, label: 'x_250', desc: '微量噪点', noisePct: 25 },
            { t: 500, cx: 380, label: 'x_500', desc: '半信半噪', noisePct: 50 },
            { t: 750, cx: 530, label: 'x_750', desc: '重度强噪', noisePct: 75 },
            { t: 1000, cx: 680, label: 'x_T (纯噪)', desc: 'N(0, I) 纯白噪', noisePct: 100 },
          ].map((item) => {
            const isClosest = Math.abs(stepT - item.t) < 130;
            return (
              <g key={item.t} onClick={() => setStepT(item.t)} style={{ cursor: 'pointer' }}>
                {/* 样本方块示意 */}
                <rect
                  x={item.cx - 40}
                  y={45}
                  width="80"
                  height="80"
                  rx="8"
                  fill={item.noisePct === 0 ? '#ecfdf5' : item.noisePct === 100 ? '#f1f5f9' : '#fff7ed'}
                  stroke={isClosest ? '#7c3aed' : item.noisePct === 0 ? '#10b981' : item.noisePct === 100 ? '#94a3b8' : '#f97316'}
                  strokeWidth={isClosest ? 3 : 1.5}
                />

                {/* 内部噪声纹理示意 */}
                {item.noisePct > 0 && item.noisePct < 100 && (
                  <path
                    d={`M ${item.cx - 30},65 Q ${item.cx},${60 + item.noisePct / 4} ${item.cx + 30},70 T ${item.cx + 20},105`}
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth={item.noisePct / 20}
                    strokeDasharray="3 3"
                  />
                )}
                {item.noisePct === 100 && (
                  <text x={item.cx} y="90" textAnchor="middle" fontSize="20" fill="#94a3b8">❄️</text>
                )}
                {item.noisePct === 0 && (
                  <text x={item.cx} y="90" textAnchor="middle" fontSize="22" fill="#10b981">🖼️</text>
                )}

                <text x={item.cx} y="145" textAnchor="middle" fontSize="11" fill="#1e293b" fontWeight="700">
                  {item.label}
                </text>
                <text x={item.cx} y="160" textAnchor="middle" fontSize="9.5" fill="#64748b">
                  {item.desc}
                </text>
              </g>
            );
          })}

          {/* 当前选定时间步指示箭头 */}
          <line
            x1={80 + (stepT / 1000) * 600}
            y1={175}
            x2={80 + (stepT / 1000) * 600}
            y2={135}
            stroke="#7c3aed"
            strokeWidth="2.5"
            markerEnd="url(#arrow-vae)"
          />
          <text
            x={80 + (stepT / 1000) * 600}
            y={192}
            textAnchor="middle"
            fontSize="11"
            fill="#7c3aed"
            fontWeight="800"
          >
            当前 t={stepT}
          </text>
        </svg>
      </div>

      {/* 实时公式与信噪比仪表盘 */}
      <div style={{ marginTop: '14px', background: '#f8fafc', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>
            {viewMode === 'forward' ? '⚡ 一步闭式加噪公式：x_t = √(ᾱ_t)·x_0 + √(1 - ᾱ_t)·ε' : '🎯 U-Net 预测目标：ε_θ(x_t, t) ≈ ε（直接预测所加噪声）'}
          </strong>
          <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#047857', background: '#ecfdf5', padding: '3px 8px', borderRadius: '4px', border: '1px solid #a7f3d0' }}>
            信噪比 SNR(t) = {snr > 99 ? '>99' : snr < 0.01 ? '<0.01' : snr.toFixed(2)}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginBottom: '8px', fontSize: '0.82rem' }}>
          <div style={{ background: '#ffffff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <span style={{ color: '#64748b' }}>累积衰减 ᾱ_t：</span>
            <strong style={{ color: '#2563eb' }}>{alphaBar.toFixed(4)}</strong>
          </div>
          <div style={{ background: '#ffffff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <span style={{ color: '#64748b' }}>信号权重 √(ᾱ_t)：</span>
            <strong style={{ color: '#059669' }}>{(signalWeight * 100).toFixed(1)}%</strong>
          </div>
          <div style={{ background: '#ffffff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <span style={{ color: '#64748b' }}>噪声权重 √(1 - ᾱ_t)：</span>
            <strong style={{ color: '#dc2626' }}>{(noiseWeight * 100).toFixed(1)}%</strong>
          </div>
        </div>

        <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569', lineHeight: 1.6 }}>
          在 DDPM 中，前向加噪过程完全不需要训练神经网络，利用高斯分布的保真再生性，可以从 <span style={{ fontFamily: 'monospace' }}>x_0</span> 一步直接闭式采样任意步状态 <span style={{ fontFamily: 'monospace' }}>x_t</span>；
          而在逆向生成时，U-Net 的训练目标被精妙简化为：<strong>给定任意时间步 t 的含噪状态 x_t，预测出构建它时注入的那份高斯噪声 ε</strong>。配合 CFG 引导公式 <span style={{ fontFamily: 'monospace' }}>ε̃ = ε(x_t, ∅) + w·[ε(x_t, c) - ε(x_t, ∅)]</span>，模型即可在文本语义条件引导下，将混沌的白噪声如米开朗基罗雕刻大理石般逐级塑造成高保真写实杰作！
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   13. 缩放点积注意力与自注意力热力图可视化器 (AttentionHeatmapVisualizer)
   ══════════════════════════════════════════════════════════════════ */

export function AttentionHeatmapVisualizer() {
  const [dK, setDK] = useState<number>(64);
  const [isCausal, setIsCausal] = useState<boolean>(true);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number }>({ r: 2, c: 1 });

  const tokens = ['The', 'cat', 'sat', 'on'];
  
  // 模拟的 Q, K 投影相似度原始点积得分矩阵
  const rawDotProducts = [
    [2.8, 1.2, 0.4, 0.1],
    [1.5, 4.2, 2.1, 0.8],
    [0.6, 3.8, 3.5, 1.9],
    [0.2, 1.1, 2.4, 3.1],
  ];

  // 缩放计算：除以 sqrt(dK)
  const scaleFactor = Math.sqrt(dK);
  const scaledScores = rawDotProducts.map((row, r) =>
    row.map((score, c) => {
      if (isCausal && c > r) return -Infinity; // 因果掩码
      return score / (scaleFactor / 8.0); // 归一化缩放
    })
  );

  // Softmax 归一化
  const attentionWeights = scaledScores.map((row) => {
    const validScores = row.filter((s) => s !== -Infinity);
    const maxVal = Math.max(...validScores);
    const expRow = row.map((s) => (s === -Infinity ? 0 : Math.exp(s - maxVal)));
    const sumExp = expRow.reduce((acc, val) => acc + val, 0);
    return expRow.map((val) => (sumExp === 0 ? 0 : val / sumExp));
  });

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '840px', margin: '1.5rem auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
            🎯 缩放点积自注意力（Scaled Dot-Product Attention）热力图
          </h4>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
            Vaswani et al. (2017)：Attention(Q, K, V) = softmax(QK^T / √d_k) · V 核心机制解剖
          </p>
        </div>

        {/* 掩码模式切换 */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setIsCausal(true)}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: isCausal ? '2px solid #7c3aed' : '1px solid #cbd5e1',
              background: isCausal ? '#f5f3ff' : '#ffffff',
              color: isCausal ? '#6d28d9' : '#64748b',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            🔒 因果掩码（Causal Decoder）
          </button>
          <button
            onClick={() => setIsCausal(false)}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: !isCausal ? '2px solid #0284c7' : '1px solid #cbd5e1',
              background: !isCausal ? '#f0f9ff' : '#ffffff',
              color: !isCausal ? '#0369a1' : '#64748b',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            🌐 全双向（Bidirectional Encoder）
          </button>
        </div>
      </div>

      {/* 缩放因子滑块调节 */}
      <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ flex: '1 1 300px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
              <span style={{ fontWeight: 600, color: '#334155' }}>
                Query / Key 投影维度 d_k（缩放因子 √d_k = {Math.sqrt(dK).toFixed(1)}）：
              </span>
              <strong style={{ color: dK > 128 ? '#ea580c' : '#2563eb' }}>
                d_k = {dK}
              </strong>
            </div>
            <input
              type="range"
              min="4"
              max="256"
              step="4"
              value={dK}
              onChange={(e) => setDK(parseInt(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>

          <div style={{ fontSize: '0.8rem', color: '#475569', background: '#ffffff', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
            <span>Softmax 锐度: </span>
            <strong style={{ color: dK <= 16 ? '#dc2626' : '#059669' }}>
              {dK <= 16 ? '尖锐（极化）' : dK >= 128 ? '平滑（分散）' : '健康均衡'}
            </strong>
          </div>
        </div>
      </div>

      {/* 注意力矩阵网格 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px', alignItems: 'center', background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        {/* 左侧 Query 标签 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'right', paddingRight: '8px' }}>
          <div style={{ height: '24px', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Query \ Key</div>
          {tokens.map((t, idx) => (
            <div key={`q-${t}`} style={{ height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontSize: '0.85rem', fontWeight: 700, color: selectedCell.r === idx ? '#7c3aed' : '#334155' }}>
              [{idx}] "{t}"
            </div>
          ))}
        </div>

        {/* 顶部 Key 标签与热力图格子 */}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '6px' }}>
            {tokens.map((t, idx) => (
              <div key={`k-${t}`} style={{ textAlign: 'center', fontSize: '0.82rem', fontWeight: 700, color: selectedCell.c === idx ? '#7c3aed' : '#64748b' }}>
                [{idx}] "{t}"
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {attentionWeights.map((row, r) =>
              row.map((w, c) => {
                const isSelected = selectedCell.r === r && selectedCell.c === c;
                const isMasked = isCausal && c > r;
                const alpha = Math.min(1.0, Math.max(0.05, w));

                return (
                  <div
                    key={`cell-${r}-${c}`}
                    onClick={() => !isMasked && setSelectedCell({ r, c })}
                    style={{
                      height: '42px',
                      background: isMasked
                        ? '#f1f5f9'
                        : isSelected
                        ? '#7c3aed'
                        : `rgba(124, 58, 237, ${alpha})`,
                      color: isMasked ? '#94a3b8' : isSelected || alpha > 0.4 ? '#ffffff' : '#1e1b4b',
                      borderRadius: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: isMasked ? 'not-allowed' : 'pointer',
                      border: isSelected ? '2px solid #4c1d95' : '1px solid #e2e8f0',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isMasked ? (
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>-∞ (屏蔽)</span>
                    ) : (
                      <span>{(w * 100).toFixed(1)}%</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 实时公式与机理解析 */}
      <div style={{ marginTop: '12px', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.84rem', color: '#475569', lineHeight: 1.6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <strong style={{ color: '#0f172a' }}>
            💡 当前焦点关联：Query "{tokens[selectedCell.r]}" 对 Key "{tokens[selectedCell.c]}"
          </strong>
          <span style={{ fontFamily: 'monospace', color: '#7c3aed', background: '#f5f3ff', padding: '2px 8px', borderRadius: '4px', border: '1px solid #ddd6fe', fontWeight: 700 }}>
            Attention Weight = {(attentionWeights[selectedCell.r][selectedCell.c] * 100).toFixed(1)}%
          </span>
        </div>
        <p style={{ margin: 0 }}>
          <strong>为什么必须除以 √d_k？</strong> 当维度 d_k 很大时，两个随机正态独立向量的内积方差为 d_k。如果不进行缩放，点积数值将随维度增长而急剧扩散，使得 Softmax 函数被推入两端导数极小的梯度饱和区（输出极化为 One-hot），导致反向传播梯度彻底消失！除以 √d_k 强行将内积方差拉回稳定常数 1.0，保障了深层多头注意力的健康更新。
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   14. 现代 Pre-LN Transformer 结构块剖析器 (TransformerBlockVisualizer)
   ══════════════════════════════════════════════════════════════════ */

export function TransformerBlockVisualizer() {
  const [normType, setNormType] = useState<'pre' | 'post'>('pre');
  const [selectedSublayer, setSelectedSublayer] = useState<'attn' | 'ffn' | 'norm'>('attn');

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '840px', margin: '1.5rem auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
            🏗️ 现代 Transformer Block 结构与残差数据流
          </h4>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
            {normType === 'pre'
              ? '现代标准 Pre-LN（LLaMA/GPT-3/DeepSeek）：归一化置于残差分支内部，支持千亿参数极度稳定深层训练'
              : '经典 Post-LN（Vaswani 2017）：归一化置于残差相加之后，深层梯度易发散，必须严苛 Warmup 预热'}
          </p>
        </div>

        {/* 架构切换 */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setNormType('pre')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: normType === 'pre' ? '2px solid #059669' : '1px solid #cbd5e1',
              background: normType === 'pre' ? '#ecfdf5' : '#ffffff',
              color: normType === 'pre' ? '#047857' : '#64748b',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            🌟 Pre-LN (现代标准)
          </button>
          <button
            onClick={() => setNormType('post')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: normType === 'post' ? '2px solid #ea580c' : '1px solid #cbd5e1',
              background: normType === 'post' ? '#fff7ed' : '#ffffff',
              color: normType === 'post' ? '#c2410c' : '#64748b',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            📜 Post-LN (经典 2017)
          </button>
        </div>
      </div>

      {/* SVG 架构图 */}
      <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '16px 8px', overflowX: 'auto' }}>
        <svg viewBox="0 0 760 310" style={{ width: '100%', minWidth: '660px', height: 'auto', display: 'block' }}>
          <defs>
            <marker id="arrow-tr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#3b82f6" />
            </marker>
            <marker id="arrow-gold" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#f59e0b" />
            </marker>
          </defs>

          {/* 输入 x */}
          <g transform="translate(60, 130)">
            <rect width="80" height="44" rx="8" fill="#f8fafc" stroke="#64748b" strokeWidth="2" />
            <text x="40" y="22" textAnchor="middle" fontSize="12" fill="#334155" fontWeight="700">输入序列 x</text>
            <text x="40" y="37" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="monospace">[B, T, d_model]</text>
          </g>

          {/* 子层 1：注意力层与残差 */}
          {/* 主分支：Norm -> MHA */}
          <line x1="140" y1="152" x2="190" y2="152" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrow-tr)" />

          <g transform="translate(190, 126)" onClick={() => setSelectedSublayer('norm')} style={{ cursor: 'pointer' }}>
            <rect width="70" height="52" rx="6" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1.5" />
            <text x="35" y="24" textAnchor="middle" fontSize="11" fill="#1e40af" fontWeight="700">{normType === 'pre' ? 'RMSNorm' : 'MHA'}</text>
            <text x="35" y="40" textAnchor="middle" fontSize="9.5" fill="#3b82f6">{normType === 'pre' ? '归一化' : '多头注意力'}</text>
          </g>

          <line x1="260" y1="152" x2="295" y2="152" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrow-tr)" />

          <g transform="translate(295, 126)" onClick={() => setSelectedSublayer('attn')} style={{ cursor: 'pointer' }}>
            <rect width="105" height="52" rx="6" fill="#f5f3ff" stroke="#7c3aed" strokeWidth="2" />
            <text x="52" y="24" textAnchor="middle" fontSize="11.5" fill="#5b21b6" fontWeight="700">{normType === 'pre' ? '多头自注意力' : 'RMSNorm'}</text>
            <text x="52" y="40" textAnchor="middle" fontSize="9.5" fill="#7c3aed">MHA(Q, K, V)</text>
          </g>

          {/* 残差直通跳连 1 */}
          <path d="M 160,152 L 160,85 L 435,85 L 435,138" fill="none" stroke="#f59e0b" strokeWidth="2.5" markerEnd="url(#arrow-gold)" />
          <rect x="260" y="73" width="75" height="22" rx="4" fill="#fef3c7" stroke="#f59e0b" />
          <text x="297" y="88" textAnchor="middle" fontSize="10" fill="#b45309" fontWeight="700">残差高速公路</text>

          {/* 加法算子 1 */}
          <circle cx="435" cy="152" r="14" fill="#fef3c7" stroke="#d97706" strokeWidth="2" />
          <text x="435" y="157" textAnchor="middle" fontSize="16" fill="#b45309" fontWeight="bold">+</text>
          <line x1="400" y1="152" x2="421" y2="152" stroke="#3b82f6" strokeWidth="2" />

          {/* 子层 2：前馈网络 (FFN) 与残差 */}
          <line x1="449" y1="152" x2="480" y2="152" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrow-tr)" />

          <g transform="translate(480, 126)" onClick={() => setSelectedSublayer('norm')} style={{ cursor: 'pointer' }}>
            <rect width="65" height="52" rx="6" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1.5" />
            <text x="32" y="24" textAnchor="middle" fontSize="11" fill="#1e40af" fontWeight="700">{normType === 'pre' ? 'RMSNorm' : 'FFN'}</text>
            <text x="32" y="40" textAnchor="middle" fontSize="9.5" fill="#3b82f6">{normType === 'pre' ? '归一化' : '前馈网络'}</text>
          </g>

          <line x1="545" y1="152" x2="575" y2="152" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrow-tr)" />

          <g transform="translate(575, 126)" onClick={() => setSelectedSublayer('ffn')} style={{ cursor: 'pointer' }}>
            <rect width="85" height="52" rx="6" fill="#ecfdf5" stroke="#10b981" strokeWidth="2" />
            <text x="42" y="24" textAnchor="middle" fontSize="11.5" fill="#065f46" fontWeight="700">{normType === 'pre' ? 'FFN 网络' : 'RMSNorm'}</text>
            <text x="42" y="40" textAnchor="middle" fontSize="9.5" fill="#059669">SwiGLU / MLP</text>
          </g>

          {/* 残差直通跳连 2 */}
          <path d="M 460,152 L 460,220 L 690,220 L 690,166" fill="none" stroke="#f59e0b" strokeWidth="2.5" markerEnd="url(#arrow-gold)" />

          {/* 加法算子 2 */}
          <circle cx="690" cy="152" r="14" fill="#fef3c7" stroke="#d97706" strokeWidth="2" />
          <text x="690" y="157" textAnchor="middle" fontSize="16" fill="#b45309" fontWeight="bold">+</text>
          <line x1="660" y1="152" x2="676" y2="152" stroke="#3b82f6" strokeWidth="2" />

          {/* 终点输出 */}
          <line x1="704" y1="152" x2="735" y2="152" stroke="#3b82f6" strokeWidth="2.5" markerEnd="url(#arrow-tr)" />
        </svg>
      </div>

      {/* 核心原理解析卡 */}
      <div style={{ marginTop: '14px', background: '#f8fafc', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <strong style={{ display: 'block', fontSize: '0.92rem', color: '#0f172a', marginBottom: '6px' }}>
          💡 为什么现代主流大模型（LLaMA、DeepSeek、GPT-3）全面转向 Pre-LN？
        </strong>
        <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569', lineHeight: 1.6 }}>
          在原始 2017 Transformer 的 <strong>Post-LN</strong> 设计中，LayerNorm 位于残差相加之后（<span style={{ fontFamily: 'monospace' }}>x = Norm(x + Sublayer(x))</span>），导致主干路径上的梯度必须穿透 LayerNorm 的反向导数，使得深层反向传播梯度极其容易剧烈爆炸或衰减，训练初期必须经过极其脆弱漫长的 Warmup；
          而在 <strong>Pre-LN</strong> 架构中（<span style={{ fontFamily: 'monospace' }}>x = x + Sublayer(Norm(x))</span>），残差连接构筑了一条没有任何非线性阻隔的真正“无损恒等超导通道（Identity Highway）”，反向梯度可以 100% 直达底层，使得千亿级参数模型无需繁琐调参即可极其稳定地收敛！
        </p>
      </div>
    </div>
  );
}

export const DEEP_LEARNING_DIAGRAMS = {
  neuron: ['neuron'],
  xor: ['xor'],
  backprop: ['backprop'],
  mlpshape: ['mlpshape'],
  optimizer: ['optimizer'],
  regularizer: ['regularizer'],
  conv2d: ['conv2d'],
  resnet: ['resnet'],
  'rnn-bptt': ['rnn-bptt'],
  'lstm-cell': ['lstm-cell'],
  'vae-latent': ['vae-latent'],
  'diffusion-flow': ['diffusion-flow'],
  'attention-heatmap': ['attention-heatmap'],
  'transformer-arch': ['transformer-arch'],
};


