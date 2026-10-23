/**
 * 量化课程专用图示组件（SVG + CSS，零依赖）
 *
 * 原有：OrderBookDepth / CandlestickAnatomy / TradeMatchingFlow /
 *       EquityDrawdownChart / PurgedCvTimeline
 * 新增：VectorizationDemo / BroadcastDemo / ResampleDemo /
 *       RollingWindowDemo / MACDDemo / RSIDemo
 */

import { useState } from 'react';
import './diagrams.css';

/* ══════════════════════════════════════════════
   1. 订单簿深度
   ══════════════════════════════════════════════ */

const BIDS = [
  { price: 99.9, qty: 1200 },
  { price: 99.8, qty: 2400 },
  { price: 99.7, qty: 800 },
  { price: 99.6, qty: 3100 },
  { price: 99.5, qty: 1800 },
];
const ASKS = [
  { price: 100.1, qty: 900 },
  { price: 100.2, qty: 2100 },
  { price: 100.3, qty: 1500 },
  { price: 100.4, qty: 2800 },
  { price: 100.5, qty: 1100 },
];

export function OrderBookDepth() {
  const [sel, setSel] = useState(2);
  const maxQty = Math.max(...BIDS.map((b) => b.qty), ...ASKS.map((a) => a.qty));

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">订单簿（Order Book）：买卖双方的价格与挂单量</figcaption>

      <div className="ob-wrap">
        <div className="ob-side bids">
          <div className="ob-head">买盘（Bid）</div>
          {BIDS.map((b, i) => (
            <div
              key={b.price}
              className={`ob-row ${i === sel ? 'active' : ''}`}
              onClick={() => setSel(i)}
            >
              <div className="ob-bar" style={{ width: `${(b.qty / maxQty) * 100}%`, background: 'rgba(34,197,94,0.25)' }} />
              <span className="ob-price" style={{ color: '#22c55e' }}>{b.price.toFixed(1)}</span>
              <span className="ob-qty">{b.qty.toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div className="ob-spread">
          <div className="ob-spread-label">价差</div>
          <div className="ob-spread-val">0.2</div>
          <div className="ob-mid">
            <div className="ob-mid-label">中间价</div>
            <div className="ob-mid-val">100.0</div>
          </div>
        </div>

        <div className="ob-side asks">
          <div className="ob-head">卖盘（Ask）</div>
          {ASKS.map((a, i) => (
            <div
              key={a.price}
              className={`ob-row ${i === sel ? 'active' : ''}`}
              onClick={() => setSel(i)}
            >
              <div className="ob-bar" style={{ width: `${(a.qty / maxQty) * 100}%`, background: 'rgba(239,68,68,0.25)' }} />
              <span className="ob-price" style={{ color: '#ef4444' }}>{a.price.toFixed(1)}</span>
              <span className="ob-qty">{a.qty.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="ob-note">
        <b>买一</b>：99.9（1200 手）　<b>卖一</b>：100.1（900 手）
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          价差 = 卖一 − 买一 = 0.2。价差越小，流动性越好。
        </span>
      </div>

      <div className="diagram-caption">
        <b>关键概念</b>：订单簿是限价单的集合。市价单会"吃掉"对手盘，导致价格滑动（slippage）。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   2. K 线解剖
   ══════════════════════════════════════════════ */

const CANDLES = [
  { o: 100, h: 108, l: 97, c: 106 },
  { o: 106, h: 110, l: 103, c: 104 },
  { o: 104, h: 107, l: 99, c: 100 },
  { o: 100, h: 105, l: 98, c: 104 },
  { o: 104, h: 112, l: 103, c: 111 },
];

export function CandlestickAnatomy() {
  const [sel, setSel] = useState(0);
  const c = CANDLES[sel];
  const isUp = c.c >= c.o;

  const min = 95, max = 114;
  const toY = (v: number) => 10 + ((max - v) / (max - min)) * 100;

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">K 线解剖：开、高、低、收</figcaption>

      <div className="ca-chart">
        <svg viewBox="0 0 200 120" className="ca-svg" role="img" aria-label="K线">
          {CANDLES.map((cd, i) => {
            const x = 25 + i * 35;
            const up = cd.c >= cd.o;
            const color = up ? '#22c55e' : '#ef4444';
            const bodyTop = toY(Math.max(cd.o, cd.c));
            const bodyBot = toY(Math.min(cd.o, cd.c));
            return (
              <g key={i} opacity={i === sel ? 1 : 0.4} onClick={() => setSel(i)} style={{ cursor: 'pointer' }}>
                <line x1={x} y1={toY(cd.h)} x2={x} y2={toY(cd.l)} stroke={color} strokeWidth="1.5" />
                <rect
                  x={x - 6}
                  y={bodyTop}
                  width="12"
                  height={Math.max(bodyBot - bodyTop, 2)}
                  fill={up ? 'none' : color}
                  stroke={color}
                  strokeWidth="1.5"
                  rx="1"
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="ca-legend">
        <span><span className="ca-dot up" /> 阳线（收 &gt; 开）</span>
        <span><span className="ca-dot down" /> 阴线（收 &lt; 开）</span>
      </div>

      <div className="ca-detail">
        <div className="ca-row"><span className="ca-k">开盘 Open</span><span className="ca-v">{c.o}</span></div>
        <div className="ca-row"><span className="ca-k">最高 High</span><span className="ca-v" style={{ color: '#22c55e' }}>{c.h}</span></div>
        <div className="ca-row"><span className="ca-k">最低 Low</span><span className="ca-v" style={{ color: '#ef4444' }}>{c.l}</span></div>
        <div className="ca-row"><span className="ca-k">收盘 Close</span><span className="ca-v">{c.c}</span></div>
        <div className="ca-row"><span className="ca-k">实体</span><span className="ca-v">{Math.abs(c.c - c.o).toFixed(1)}</span></div>
        <div className="ca-row"><span className="ca-k">上影线</span><span className="ca-v">{(c.h - Math.max(c.o, c.c)).toFixed(1)}</span></div>
        <div className="ca-row"><span className="ca-k">下影线</span><span className="ca-v">{(Math.min(c.o, c.c) - c.l).toFixed(1)}</span></div>
      </div>

      <div className="ca-note">
        第 {sel + 1} 根是 <b style={{ color: isUp ? '#22c55e' : '#ef4444' }}>{isUp ? '阳线' : '阴线'}</b>
        （{isUp ? '收盘高于开盘，多方占优' : '收盘低于开盘，空方占优'}）
      </div>

      <div className="diagram-caption">
        <b>实体</b>：开盘到收盘的价格区间。<b>影线</b>：最高/最低价。
        上影线长说明高位有抛压，下影线长说明低位有支撑。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   3. 撮合流程
   ══════════════════════════════════════════════ */

const MATCH_STEPS = [
  { name: '① 提交订单', desc: '交易者提交限价单或市价单到交易所' },
  { name: '② 订单路由', desc: '交易所检查订单合法性（资金、持仓、价格限制）' },
  { name: '③ 价格优先', desc: '买单选最高价，卖单选最低价' },
  { name: '④ 时间优先', desc: '同价位按到达时间排序（FIFO）' },
  { name: '⑤ 撮合成交', desc: '买卖双方价格匹配，成交并更新订单簿' },
];

export function TradeMatchingFlow() {
  const [step, setStep] = useState(0);

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">交易所撮合流程：价格优先、时间优先</figcaption>

      <div className="tm-flow">
        {MATCH_STEPS.map((s, i) => (
          <div
            key={i}
            className={`tm-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
            onClick={() => setStep(i)}
          >
            <span className="tm-num">{i + 1}</span>
            <span className="tm-name">{s.name}</span>
          </div>
        ))}
      </div>

      <div className="tm-detail">
        <b>{MATCH_STEPS[step].name}</b>
        <br />
        {MATCH_STEPS[step].desc}
      </div>

      <div className="tm-example">
        <div className="tm-ex-title">例子：限价单撮合</div>
        <div className="tm-ex-body">
          <div className="tm-ex-row">
            <span className="tm-ex-k">买盘</span>
            <span className="tm-ex-v">100.1 × 500（最早）</span>
          </div>
          <div className="tm-ex-row">
            <span className="tm-ex-k">卖单</span>
            <span className="tm-ex-v">100.0 × 300</span>
          </div>
          <div className="tm-ex-row">
            <span className="tm-ex-k">结果</span>
            <span className="tm-ex-v" style={{ color: '#22c55e' }}>
              成交 300 手 @ 100.1（按买盘价格）
            </span>
          </div>
        </div>
      </div>

      <div className="diagram-caption">
        <b>价格优先</b>：买方出价高的先成交，卖方要价低的先成交。
        <b>时间优先</b>：同价位先到先成交。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   4. 净值与回撤
   ══════════════════════════════════════════════ */

export function EquityDrawdownChart() {
  const [sel, setSel] = useState(0);

  const curves = [
    {
      name: '稳健策略',
      color: '#22c55e',
      nav: [100, 102, 101, 104, 106, 105, 108, 110, 109, 112],
    },
    {
      name: '激进策略',
      color: '#f59e0b',
      nav: [100, 108, 95, 112, 90, 120, 85, 130, 95, 140],
    },
    {
      name: '失效策略',
      color: '#ef4444',
      nav: [100, 95, 88, 80, 72, 65, 58, 50, 45, 40],
    },
  ];

  const cur = curves[sel];

  let peak = cur.nav[0];
  const drawdowns = cur.nav.map((v) => {
    peak = Math.max(peak, v);
    return ((v - peak) / peak) * 100;
  });
  const maxDD = Math.min(...drawdowns);

  const minNav = Math.min(...cur.nav), maxNav = Math.max(...cur.nav);
  const toY = (v: number) => 90 - ((v - minNav) / (maxNav - minNav || 1)) * 75;

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">净值曲线与回撤：风险的另一面</figcaption>

      <div className="ed-tabs">
        {curves.map((c, i) => (
          <button
            key={c.name}
            type="button"
            className={`ed-tab ${i === sel ? 'active' : ''}`}
            style={{ '--ed-color': c.color } as React.CSSProperties}
            onClick={() => setSel(i)}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="ed-chart">
        <svg viewBox="0 0 320 110" className="ed-svg" role="img" aria-label="净值曲线">
          <path
            d={cur.nav.map((v, i) => {
              const x = 15 + (i / (cur.nav.length - 1)) * 290;
              return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${toY(v).toFixed(1)}`;
            }).join(' ')}
            fill="none"
            stroke={cur.color}
            strokeWidth="2.2"
          />
          {drawdowns.map((dd, i) => {
            if (dd >= -0.5) return null;
            const x = 15 + (i / (cur.nav.length - 1)) * 290;
            return (
              <line
                key={i}
                x1={x} y1={toY(cur.nav[i])}
                x2={x} y2={90}
                stroke="#ef4444"
                strokeWidth="1"
                opacity="0.3"
                strokeDasharray="2 2"
              />
            );
          })}
        </svg>
      </div>

      <div className="ed-stats">
        <span>最终净值：<b style={{ color: cur.color }}>{cur.nav[cur.nav.length - 1]}</b></span>
        <span>最大回撤：<b style={{ color: '#ef4444' }}>{maxDD.toFixed(1)}%</b></span>
        <span>总收益：<b style={{ color: cur.color }}>{((cur.nav[cur.nav.length - 1] / 100 - 1) * 100).toFixed(0)}%</b></span>
      </div>

      <div className="ed-note" style={{ borderColor: cur.color }}>
        {sel === 0 && (
          <>
            <b style={{ color: '#22c55e' }}>稳健</b>：收益不高但回撤小（{maxDD.toFixed(1)}%）。
            夏普比率高，适合大资金。
          </>
        )}
        {sel === 1 && (
          <>
            <b style={{ color: '#f59e0b' }}>激进</b>：波动大，回撤深（{maxDD.toFixed(1)}%）。
            收益高但可能撑不住。
          </>
        )}
        {sel === 2 && (
          <>
            <b style={{ color: '#ef4444' }}>失效</b>：持续下跌，最大回撤 {maxDD.toFixed(1)}%。
            这种策略必须止损。
          </>
        )}
      </div>

      <div className="diagram-caption">
        <b>最大回撤</b> = max(1 − 当前净值/历史最高净值)。这是评估策略风险最直观的指标。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   5. Purged K-Fold CV
   ══════════════════════════════════════════════ */

export function PurgedCvTimeline() {
  const [mode, setMode] = useState<'normal' | 'purged'>('normal');

  const n = 20;
  const folds = 5;
  const foldSize = n / folds;

  const normalMask = (i: number, fold: number) => {
    const start = fold * foldSize;
    const end = start + foldSize;
    if (i >= start && i < end) return 'test';
    return 'train';
  };

  const purgedMask = (i: number, fold: number) => {
    const start = fold * foldSize;
    const end = start + foldSize;
    if (i >= start && i < end) return 'test';
    if ((i >= start - 1 && i < start) || (i >= end && i < end + 1)) return 'purged';
    return 'train';
  };

  const [fold, setFold] = useState(0);

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">Purged K-Fold：防止时间序列的信息泄漏</figcaption>

      <div className="pattern-tabs">
        <button
          type="button"
          className={`pattern-tab ${mode === 'normal' ? 'active' : ''}`}
          style={{ '--tab-color': '#ef4444' } as React.CSSProperties}
          onClick={() => setMode('normal')}
        >
          普通 K-Fold（泄漏）
        </button>
        <button
          type="button"
          className={`pattern-tab ${mode === 'purged' ? 'active' : ''}`}
          style={{ '--tab-color': '#22c55e' } as React.CSSProperties}
          onClick={() => setMode('purged')}
        >
          Purged（正确）
        </button>
      </div>

      <div className="pos-controls">
        <label>
          第几折
          <input type="range" min="0" max={folds - 1} step="1" value={fold}
            onChange={(e) => setFold(parseInt(e.target.value, 10))} />
          <b>{fold + 1}/{folds}</b>
        </label>
      </div>

      <div className="pcv-timeline">
        {Array.from({ length: n }).map((_, i) => {
          const m = mode === 'normal' ? normalMask(i, fold) : purgedMask(i, fold);
          return (
            <div
              key={i}
              className={`pcv-cell ${m}`}
              title={`t=${i}: ${m === 'test' ? '测试' : m === 'purged' ? '剔除' : '训练'}`}
            >
              {i}
            </div>
          );
        })}
      </div>

      <div className="pcv-legend">
        <span><span className="pcv-dot train" /> 训练</span>
        <span><span className="pcv-dot test" /> 测试</span>
        <span><span className="pcv-dot purged" /> 剔除（隔离带）</span>
      </div>

      <div className="pcv-note" style={{ borderColor: mode === 'purged' ? '#22c55e' : '#ef4444' }}>
        {mode === 'normal' ? (
          <>
            <b style={{ color: '#ef4444' }}>问题</b>：训练集紧邻测试集。
            <br />
            如果标签是"未来 N 天收益"，训练集的最后 N 天标签用到了测试期的数据
            → <b>信息泄漏</b> → 回测虚高。
          </>
        ) : (
          <>
            <b style={{ color: '#22c55e' }}>正确</b>：测试集前后各剔除 1 个（隔离带）。
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              实际应剔除"标签窗口长度"（如预测 5 日收益就剔除 5 天）
            </span>
          </>
        )}
      </div>

      <div className="diagram-caption">
        <b>时间序列不能随机划分</b>——必须按时间顺序，且要处理标签重叠。
        否则回测结果不可信。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   6. 向量化加速
   ══════════════════════════════════════════════ */

const VEC_DATA = [
  { n: 1000, py: 0.12, np: 0.001 },
  { n: 10000, py: 1.2, np: 0.002 },
  { n: 100000, py: 12.5, np: 0.012 },
  { n: 1000000, py: 128, np: 0.12 },
  { n: 10000000, py: 1320, np: 1.25 },
];

export function VectorizationDemo() {
  const [sel, setSel] = useState(2);
  const cur = VEC_DATA[sel];
  const speedup = cur.py / cur.np;

  const fmt = (v: number) => (v < 1 ? `${(v * 1000).toFixed(0)} μs` : `${v} ms`);

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">向量化加速：数据量越大，差距越明显</figcaption>

      <div className="vec-table">
        <div className="vec-head">
          <span>数据量</span>
          <span>Python 循环</span>
          <span>NumPy</span>
          <span>加速比</span>
        </div>
        {VEC_DATA.map((d, i) => (
          <button
            key={d.n}
            type="button"
            className={`vec-row ${i === sel ? 'active' : ''}`}
            onClick={() => setSel(i)}
          >
            <span>{d.n.toLocaleString()}</span>
            <span style={{ color: '#ef4444' }}>{fmt(d.py)}</span>
            <span style={{ color: '#22c55e' }}>{fmt(d.np)}</span>
            <span style={{ color: '#2f6bff', fontWeight: 700 }}>{(d.py / d.np).toFixed(0)}×</span>
          </button>
        ))}
      </div>

      <div className="vec-bars">
        <div className="vec-bar-row">
          <span className="vec-label">Python</span>
          <div className="vec-track">
            <div style={{ width: '100%', background: '#ef4444' }} />
          </div>
          <span className="vec-val">{fmt(cur.py)}</span>
        </div>
        <div className="vec-bar-row">
          <span className="vec-label">NumPy</span>
          <div className="vec-track">
            <div style={{ width: `${Math.max((cur.np / cur.py) * 100, 1.5)}%`, background: '#22c55e' }} />
          </div>
          <span className="vec-val">{fmt(cur.np)}</span>
        </div>
      </div>

      <div className="vec-note">
        <b>{cur.n.toLocaleString()} 次运算</b>：Python <b style={{ color: '#ef4444' }}>{fmt(cur.py)}</b>，
        NumPy <b style={{ color: '#22c55e' }}>{fmt(cur.np)}</b>，加速 <b>{speedup.toFixed(0)} 倍</b>
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          差距随数据量放大——回测 10 年日线 × 500 只股票就是 125 万次运算
        </span>
      </div>

      <div className="diagram-caption">
        <b>为什么差这么多</b>：Python 每次循环要做类型检查、装箱、动态分派；
        NumPy 在连续内存上跑 C 循环 + SIMD 指令。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   7. 广播机制
   ══════════════════════════════════════════════ */

export function BroadcastDemo() {
  const [mode, setMode] = useState<'ok' | 'bad'>('ok');

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">广播机制：形状不同也能算</figcaption>

      <div className="pattern-tabs">
        <button
          type="button"
          className={`pattern-tab ${mode === 'ok' ? 'active' : ''}`}
          style={{ '--tab-color': '#22c55e' } as React.CSSProperties}
          onClick={() => setMode('ok')}
        >
          ✅ 合法广播
        </button>
        <button
          type="button"
          className={`pattern-tab ${mode === 'bad' ? 'active' : ''}`}
          style={{ '--tab-color': '#ef4444' } as React.CSSProperties}
          onClick={() => setMode('bad')}
        >
          ❌ 非法广播
        </button>
      </div>

      {mode === 'ok' ? (
        <div className="bc-viz">
          <div className="bc-op-row">
            <div className="bc-shape">
              <div className="bc-dim">2500</div>
              <div className="bc-dim">500</div>
              <div className="bc-tag">returns</div>
            </div>
            <span className="bc-op">−</span>
            <div className="bc-shape small">
              <div className="bc-dim one">1</div>
              <div className="bc-dim">500</div>
              <div className="bc-tag">rf</div>
            </div>
            <span className="bc-op">=</span>
            <div className="bc-shape result">
              <div className="bc-dim">2500</div>
              <div className="bc-dim">500</div>
              <div className="bc-tag">excess</div>
            </div>
          </div>

          <div className="bc-rule">
            <b>从右往左对齐</b>：<br />
            第 2 维：500 vs 500 ✅ 相等<br />
            第 1 维：2500 vs <b style={{ color: '#22c55e' }}>1</b> ✅ 1 可扩展
          </div>
        </div>
      ) : (
        <div className="bc-viz">
          <div className="bc-op-row">
            <div className="bc-shape">
              <div className="bc-dim">2500</div>
              <div className="bc-dim">500</div>
              <div className="bc-tag">returns</div>
            </div>
            <span className="bc-op">−</span>
            <div className="bc-shape small bad">
              <div className="bc-dim bad">2500</div>
              <div className="bc-tag">rf</div>
            </div>
            <span className="bc-op">=</span>
            <div className="bc-shape result bad">
              <div className="bc-dim">?</div>
              <div className="bc-tag">报错</div>
            </div>
          </div>

          <div className="bc-rule bad">
            <b>从右往左对齐</b>：<br />
            第 1 维：500 vs <b style={{ color: '#ef4444' }}>2500</b> ❌ 不相等也不是 1<br />
            <span style={{ color: '#ef4444', fontSize: 10.5 }}>
              ValueError: operands could not be broadcast
            </span>
          </div>

          <div className="bc-fix">
            <b>修复</b>：显式改成列向量
            <br />
            <code>returns - rf.reshape(-1, 1)</code>
            <br />
            <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
              rf 变成 (2500, 1)，与 (2500, 500) 广播
            </span>
          </div>
        </div>
      )}

      <div className="diagram-caption">
        <b>广播不复制数据</b>——只是把 stride 设成 0，"假装"扩展。所以几乎不耗内存。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   8. 时间序列重采样
   ══════════════════════════════════════════════ */

const RESAMPLE_DATA = [
  { label: '日线', n: 2500, bar: 100, rule: 'D' },
  { label: '周线', n: 500, bar: 60, rule: 'W' },
  { label: '月线', n: 120, bar: 35, rule: 'M' },
  { label: '季线', n: 40, bar: 18, rule: 'Q' },
  { label: '年线', n: 10, bar: 8, rule: 'Y' },
];

export function ResampleDemo() {
  const [sel, setSel] = useState(0);
  const cur = RESAMPLE_DATA[sel];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">时间序列重采样：从日线到年线</figcaption>

      <div className="rs2-tabs">
        {RESAMPLE_DATA.map((d, i) => (
          <button
            key={d.label}
            type="button"
            className={`rs2-tab ${i === sel ? 'active' : ''}`}
            onClick={() => setSel(i)}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="rs2-bars">
        {RESAMPLE_DATA.map((d, i) => (
          <div key={d.label} className="rs2-col">
            <div className="rs2-track">
              <div
                className="rs2-fill"
                style={{
                  height: `${d.bar}%`,
                  background: i === sel ? '#2f6bff' : '#94a3b8',
                  opacity: i === sel ? 1 : 0.4,
                }}
              />
            </div>
            <span className="rs2-label">{d.label}</span>
            <span className="rs2-n">{d.n}</span>
          </div>
        ))}
      </div>

      <div className="rs2-note">
        <b>{cur.label}</b>：10 年数据约 <b>{cur.n}</b> 根 K 线
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          {sel === 0
            ? '信息最全，但噪声大'
            : sel === 1
              ? '过滤噪声，适合中线'
              : sel === 2
                ? '看趋势，适合长线'
                : sel === 3
                  ? '看大周期'
                  : '只看长期趋势'}
        </span>
      </div>

      <div className="rs2-code">
        <code>{`df.resample('${cur.rule}').agg({
    'open': 'first', 'high': 'max',
    'low': 'min', 'close': 'last',
    'volume': 'sum'
})`}</code>
      </div>

      <div className="diagram-caption">
        <b>重采样规则</b>：open 取第一、close 取最后、high 取最大、low 取最小、volume 求和。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   9. 移动窗口
   ══════════════════════════════════════════════ */

export function RollingWindowDemo() {
  const [window, setWindow] = useState(5);
  const [posRaw, setPos] = useState(10);

  const n = 30;
  const pos = Math.max(posRaw, window);
  const prices = Array.from({ length: n }, (_, i) =>
    100 + Math.sin(i * 0.4) * 8 + Math.sin(i * 1.1) * 3
  );

  const slice = prices.slice(Math.max(0, pos - window + 1), pos + 1);
  const ma = slice.reduce((a, b) => a + b, 0) / slice.length;

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">移动窗口：rolling(window).mean()</figcaption>

      <div className="la-controls">
        <label>
          窗口大小
          <input type="range" min="2" max="15" step="1" value={window}
            onChange={(e) => setWindow(parseInt(e.target.value, 10))} />
          <b>{window}</b>
        </label>
        <label>
          当前位置
          <input type="range" min="2" max={n - 1} step="1" value={pos}
            onChange={(e) => setPos(parseInt(e.target.value, 10))} />
          <b>{pos}</b>
        </label>
      </div>

      <div className="rw-chart">
        {prices.map((p, i) => {
          const h = ((p - 85) / 30) * 100;
          const inWin = i > pos - window && i <= pos;
          return (
            <div key={i} className="rw-col">
              <div className="rw-track">
                <div
                  className="rw-fill"
                  style={{
                    height: `${Math.max(h, 5)}%`,
                    background: inWin ? '#2f6bff' : i === pos ? '#22c55e' : '#94a3b8',
                    opacity: inWin || i === pos ? 1 : 0.3,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="rw-stats">
        <span>窗口：<b>{window}</b> 根</span>
        <span>当前 MA：<b style={{ color: '#22c55e' }}>{ma.toFixed(2)}</b></span>
        <span>当前价格：<b>{prices[pos].toFixed(2)}</b></span>
      </div>

      <div className="rw-code">
        <code>{`df['MA${window}'] = df['close'].rolling(${window}).mean()`}</code>
      </div>

      <div className="rw-note">
        <b>蓝色</b>是窗口内数据，<b>绿色</b>是当前位置。
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          窗口越大，MA 越平滑但越滞后——这是所有均线的固有权衡
        </span>
      </div>

      <div className="diagram-caption">
        <b>rolling 是向量化的</b>——底层用滑动窗口的累加/累减，O(N) 而非 O(N×window)。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   10. MACD
   ══════════════════════════════════════════════ */

export function MACDDemo() {
  const [emaFast, setEmaFast] = useState(12);
  const [emaSlow, setEmaSlow] = useState(26);

  const n = 60;
  const prices = Array.from({ length: n }, (_, i) =>
    100 + Math.sin(i * 0.25) * 12 + Math.sin(i * 0.7) * 4 + i * 0.3
  );

  const ema = (data: number[], period: number) => {
    const k = 2 / (period + 1);
    const out: number[] = [];
    let prev = data[0];
    for (const p of data) {
      prev = p * k + prev * (1 - k);
      out.push(prev);
    }
    return out;
  };

  const fast = ema(prices, emaFast);
  const slow = ema(prices, emaSlow);
  const dif = fast.map((v, i) => v - slow[i]);
  const dea = ema(dif, 9);

  const maxAbs = Math.max(...dif.map(Math.abs), ...dea.map(Math.abs), 0.01);

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">MACD：快慢 EMA 的差</figcaption>

      <div className="la-controls">
        <label>
          快线 EMA
          <input type="range" min="5" max="20" step="1" value={emaFast}
            onChange={(e) => setEmaFast(parseInt(e.target.value, 10))} />
          <b>{emaFast}</b>
        </label>
        <label>
          慢线 EMA
          <input type="range" min="20" max="60" step="2" value={emaSlow}
            onChange={(e) => setEmaSlow(parseInt(e.target.value, 10))} />
          <b>{emaSlow}</b>
        </label>
      </div>

      <div className="macd-chart">
        <svg viewBox="0 0 320 100" className="macd-svg" role="img" aria-label="MACD">
          <line x1="10" y1="50" x2="310" y2="50" stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="3 2" />
          <path
            d={dif.map((v, i) => {
              const x = 10 + (i / (n - 1)) * 300;
              const y = 50 - (v / maxAbs) * 40;
              return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
            }).join(' ')}
            fill="none" stroke="#2f6bff" strokeWidth="1.8"
          />
          <path
            d={dea.map((v, i) => {
              const x = 10 + (i / (n - 1)) * 300;
              const y = 50 - (v / maxAbs) * 40;
              return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
            }).join(' ')}
            fill="none" stroke="#f59e0b" strokeWidth="1.5"
          />
        </svg>
      </div>

      <div className="macd-legend">
        <span><span className="pos-dot" style={{ background: '#2f6bff' }} /> DIF（快慢 EMA 差）</span>
        <span><span className="pos-dot" style={{ background: '#f59e0b' }} /> DEA（DIF 的 9 日 EMA）</span>
      </div>

      <div className="macd-formula">
        <code>DIF = EMA({emaFast}) − EMA({emaSlow})　|　DEA = EMA(DIF, 9)</code>
      </div>

      <div className="macd-note">
        <b>金叉</b>：DIF 上穿 DEA（买入信号）　<b>死叉</b>：DIF 下穿 DEA（卖出信号）
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          当前 DIF={dif[n - 1].toFixed(2)}，DEA={dea[n - 1].toFixed(2)}，
          {dif[n - 1] > dea[n - 1] ? ' DIF 在 DEA 上方（多头）' : ' DIF 在 DEA 下方（空头）'}
        </span>
      </div>

      <div className="diagram-caption">
        <b>纯向量化实现</b>：EMA 用 <code>ewm(span=n).mean()</code>，一行搞定，不需要 for 循环。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   11. RSI
   ══════════════════════════════════════════════ */

export function RSIDemo() {
  const [period, setPeriod] = useState(14);

  const n = 50;
  const prices = Array.from({ length: n }, (_, i) =>
    100 + Math.sin(i * 0.35) * 10 + Math.sin(i * 0.9) * 3
  );

  const gains: number[] = [0];
  const losses: number[] = [0];
  for (let i = 1; i < n; i++) {
    const d = prices[i] - prices[i - 1];
    gains.push(Math.max(d, 0));
    losses.push(Math.max(-d, 0));
  }

  const sliceG = gains.slice(-period);
  const sliceL = losses.slice(-period);
  const avgGain = sliceG.reduce((a, b) => a + b, 0) / period;
  const avgLoss = sliceL.reduce((a, b) => a + b, 0) / period;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">RSI：相对强弱指标（0-100）</figcaption>

      <div className="pos-controls">
        <label>
          周期
          <input type="range" min="6" max="24" step="1" value={period}
            onChange={(e) => setPeriod(parseInt(e.target.value, 10))} />
          <b>{period}</b>
        </label>
      </div>

      <div className="rsi-gauge">
        <div className="rsi-track">
          <div className="rsi-zone under">超卖</div>
          <div className="rsi-zone mid">中性</div>
          <div className="rsi-zone over">超买</div>
          <div className="rsi-marker" style={{ left: `${Math.min(Math.max(rsi, 1), 99)}%` }}>
            <div className="rsi-marker-val">{rsi.toFixed(1)}</div>
          </div>
        </div>
        <div className="rsi-scale">
          <span>0</span><span>30</span><span>70</span><span>100</span>
        </div>
      </div>

      <div className="rsi-stats">
        <span>平均涨幅：<b style={{ color: '#22c55e' }}>{avgGain.toFixed(2)}</b></span>
        <span>平均跌幅：<b style={{ color: '#ef4444' }}>{avgLoss.toFixed(2)}</b></span>
        <span>RS = {rs.toFixed(2)}</span>
      </div>

      <div className="rsi-formula">
        <code>RS = 平均涨幅 / 平均跌幅　|　RSI = 100 − 100/(1+RS)</code>
      </div>

      <div className="rsi-note">
        {rsi > 70 ? (
          <><b style={{ color: '#ef4444' }}>超买区（RSI &gt; 70）</b>：可能回调，考虑卖出</>
        ) : rsi < 30 ? (
          <><b style={{ color: '#22c55e' }}>超卖区（RSI &lt; 30）</b>：可能反弹，考虑买入</>
        ) : (
          <><b style={{ color: '#f59e0b' }}>中性区（30~70）</b>：无明显信号</>
        )}
      </div>

      <div className="diagram-caption">
        <b>注意</b>：RSI 是滞后指标——它基于历史涨幅，不预测未来。超买可以更超买。
      </div>
    </figure>
  );
}


/* ══════════════════════════════════════════════
   12. 量价关系
   ══════════════════════════════════════════════ */

const VP_CASES = [
  { price: '↑', volume: '↑', name: '量增价涨', color: '#22c55e', desc: '健康上涨，趋势可延续', action: '持有/加仓' },
  { price: '↑', volume: '↓', name: '量缩价涨', color: '#f59e0b', desc: '无量空涨，跟风衰竭', action: '警惕/减仓' },
  { price: '↓', volume: '↑', name: '放量下跌', color: '#ef4444', desc: '恐慌抛售，主力出货', action: '观望/止损' },
  { price: '↓', volume: '↓', name: '缩量下跌', color: '#0891b2', desc: '无人接盘，可能见底', action: '等待企稳' },
];

export function VolumePriceDemo() {
  const [sel, setSel] = useState(0);
  const cur = VP_CASES[sel];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">量价关系的四种组合</figcaption>

      <div className="vp-grid">
        {VP_CASES.map((c, i) => (
          <button
            key={i}
            type="button"
            className={`vp-card ${i === sel ? 'active' : ''}`}
            style={{ '--vp-color': c.color } as React.CSSProperties}
            onClick={() => setSel(i)}
          >
            <div className="vp-symbols">
              <span className="vp-price" style={{ color: c.color }}>价{c.price}</span>
              <span className="vp-vol" style={{ color: c.color }}>量{c.volume}</span>
            </div>
            <div className="vp-name">{c.name}</div>
          </button>
        ))}
      </div>

      <div className="vp-detail" style={{ borderColor: cur.color }}>
        <div className="vp-row">
          <span className="vp-k">组合</span>
          <span className="vp-v" style={{ color: cur.color }}>价{cur.price} 量{cur.volume} → {cur.name}</span>
        </div>
        <div className="vp-row">
          <span className="vp-k">含义</span>
          <span className="vp-v">{cur.desc}</span>
        </div>
        <div className="vp-row">
          <span className="vp-k">建议</span>
          <span className="vp-v" style={{ color: cur.color, fontWeight: 700 }}>{cur.action}</span>
        </div>
      </div>

      <div className="vp-note">
        <b>核心逻辑</b>：成交量代表"分歧程度"。
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          价涨量增 = 多方有资金支持；价涨量缩 = 上涨乏力；价跌量增 = 恐慌出逃
        </span>
      </div>

      <div className="diagram-caption">
        <b>注意</b>：这是概率性经验规律，不是必然。单一指标不可靠，需结合趋势/位置判断。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   13. VWAP 走势
   ══════════════════════════════════════════════ */

export function VwapDemo() {
  const [showVwap, setShowVwap] = useState(true);

  const n = 48;   // 4 小时，5 分钟一根
  const prices = Array.from({ length: n }, (_, i) =>
    10 + Math.sin(i * 0.25) * 0.15 + Math.sin(i * 0.7) * 0.06 + i * 0.002
  );
  const volumes = Array.from({ length: n }, (_, i) =>
    1000 + Math.abs(Math.sin(i * 0.4)) * 2000 + (i < 6 ? 3000 : 0)
  );

  // 计算 VWAP
  let cumPV = 0, cumV = 0;
  const vwap = prices.map((p, i) => {
    cumPV += p * volumes[i];
    cumV += volumes[i];
    return cumPV / cumV;
  });

  const minP = Math.min(...prices, ...vwap) - 0.05;
  const maxP = Math.max(...prices, ...vwap) + 0.05;
  const toY = (v: number) => 90 - ((v - minP) / (maxP - minP)) * 75;

  const above = prices[n - 1] > vwap[n - 1];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">VWAP：成交量加权平均价（日内基准）</figcaption>

      <div className="pattern-tabs">
        <button
          type="button"
          className={`pattern-tab ${showVwap ? 'active' : ''}`}
          style={{ '--tab-color': '#f59e0b' } as React.CSSProperties}
          onClick={() => setShowVwap(true)}
        >
          显示 VWAP
        </button>
        <button
          type="button"
          className={`pattern-tab ${!showVwap ? 'active' : ''}`}
          style={{ '--tab-color': '#94a3b8' } as React.CSSProperties}
          onClick={() => setShowVwap(false)}
        >
          只看价格
        </button>
      </div>

      <div className="vwap-chart">
        <svg viewBox="0 0 340 110" className="vwap-svg" role="img" aria-label="VWAP">
          {/* 成交量柱（底部） */}
          {volumes.map((v, i) => {
            const x = 15 + (i / (n - 1)) * 310;
            const h = (v / 6000) * 18;
            return (
              <rect
                key={i}
                x={x - 1.5}
                y={105 - h}
                width="3"
                height={h}
                fill="#94a3b8"
                opacity="0.3"
              />
            );
          })}
          {/* 价格线 */}
          <path
            d={prices.map((p, i) => {
              const x = 15 + (i / (n - 1)) * 310;
              return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${toY(p).toFixed(1)}`;
            }).join(' ')}
            fill="none"
            stroke="#2f6bff"
            strokeWidth="1.8"
          />
          {/* VWAP 线 */}
          {showVwap && (
            <path
              d={vwap.map((v, i) => {
                const x = 15 + (i / (n - 1)) * 310;
                return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${toY(v).toFixed(1)}`;
              }).join(' ')}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="4 2"
            />
          )}
        </svg>
      </div>

      <div className="vwap-legend">
        <span><span className="pos-dot" style={{ background: '#2f6bff' }} /> 价格</span>
        {showVwap && <span><span className="pos-dot" style={{ background: '#f59e0b' }} /> VWAP</span>}
        <span><span className="pos-dot" style={{ background: '#94a3b8' }} /> 成交量</span>
      </div>

      <div className="vwap-stats">
        <span>现价：<b style={{ color: '#2f6bff' }}>{prices[n - 1].toFixed(3)}</b></span>
        <span>VWAP：<b style={{ color: '#f59e0b' }}>{vwap[n - 1].toFixed(3)}</b></span>
        <span>
          位置：<b style={{ color: above ? '#22c55e' : '#ef4444' }}>
            {above ? '现价 > VWAP（多头）' : '现价 < VWAP（空头）'}
          </b>
        </span>
      </div>

      <div className="vwap-note" style={{ borderColor: above ? '#22c55e' : '#ef4444' }}>
        {above ? (
          <>
            <b style={{ color: '#22c55e' }}>现价高于 VWAP</b>：日内买入者整体盈利，盘面偏多。
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              但这也意味着"获利盘"可能随时了结
            </span>
          </>
        ) : (
          <>
            <b style={{ color: '#ef4444' }}>现价低于 VWAP</b>：日内追高者被套，盘面承压。
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              但这也意味着"解套压力"在上方
            </span>
          </>
        )}
      </div>

      <div className="diagram-caption">
        <b>VWAP 是累计值</b>——越到收盘越难改变（分母变大）。
        机构用它评估执行质量，但不能用它预测价格。
      </div>
    </figure>
  );
}


/* ══════════════════════════════════════════════
   14. 水下曲线
   ══════════════════════════════════════════════ */

const UW_CURVES = [
  {
    name: 'V 型（快速恢复）',
    color: '#22c55e',
    nav: [1.00, 1.05, 1.10, 0.88, 0.92, 1.02, 1.12, 1.15],
  },
  {
    name: 'L 型（长期低迷）',
    color: '#ef4444',
    nav: [1.00, 1.05, 1.10, 0.92, 0.90, 0.88, 0.91, 0.95],
  },
  {
    name: '阶梯型（震荡下行）',
    color: '#f59e0b',
    nav: [1.00, 1.08, 0.95, 1.03, 0.90, 0.98, 0.85, 0.92],
  },
];

export function UnderwaterDemo() {
  const [sel, setSel] = useState(0);
  const cur = UW_CURVES[sel];

  // 计算 HWM 和回撤
  let peak = cur.nav[0];
  const drawdowns = cur.nav.map((v) => {
    peak = Math.max(peak, v);
    return (v - peak) / peak * 100;
  });
  const mdd = Math.min(...drawdowns);

  const n = cur.nav.length;
  const minNav = Math.min(...cur.nav), maxNav = Math.max(...cur.nav);
  const toY = (v: number) => 12 + ((maxNav - v) / (maxNav - minNav || 1)) * 42;
  const toYDd = (d: number) => 62 + (Math.abs(d) / Math.max(Math.abs(mdd), 1)) * 38;

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">水下曲线：回撤的深度与宽度</figcaption>

      <div className="uw-tabs">
        {UW_CURVES.map((c, i) => (
          <button
            key={c.name}
            type="button"
            className={`uw-tab ${i === sel ? 'active' : ''}`}
            style={{ '--uw-color': c.color } as React.CSSProperties}
            onClick={() => setSel(i)}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="uw-chart">
        <svg viewBox="0 0 340 110" className="uw-svg" role="img" aria-label="水下曲线">
          {/* 净值曲线（上半） */}
          <path
            d={cur.nav.map((v, i) => {
              const x = 15 + (i / (n - 1)) * 310;
              return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${toY(v).toFixed(1)}`;
            }).join(' ')}
            fill="none"
            stroke={cur.color}
            strokeWidth="2"
          />
          {/* 回撤区域（下半） */}
          <line x1="15" y1="60" x2="325" y2="60" stroke="#cbd5e1" strokeWidth="0.8" />
          <path
            d={`M15,60 ` + drawdowns.map((d, i) => {
              const x = 15 + (i / (n - 1)) * 310;
              return `L${x.toFixed(1)},${toYDd(d).toFixed(1)}`;
            }).join(' ') + ` L325,60 Z`}
            fill={cur.color}
            opacity="0.25"
          />
          <path
            d={drawdowns.map((d, i) => {
              const x = 15 + (i / (n - 1)) * 310;
              return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${toYDd(d).toFixed(1)}`;
            }).join(' ')}
            fill="none"
            stroke={cur.color}
            strokeWidth="1.5"
          />
        </svg>
      </div>

      <div className="uw-legend">
        <span><span className="pos-dot" style={{ background: cur.color }} /> 净值（上）</span>
        <span><span className="pos-dot" style={{ background: cur.color, opacity: 0.4 }} /> 回撤（下）</span>
      </div>

      <div className="uw-stats">
        <span>最大回撤：<b style={{ color: '#ef4444' }}>{mdd.toFixed(1)}%</b></span>
        <span>最终净值：<b style={{ color: cur.color }}>{cur.nav[n - 1].toFixed(2)}</b></span>
        <span>回撤深度：<b>{Math.abs(mdd).toFixed(0)}%</b></span>
      </div>

      <div className="uw-note" style={{ borderColor: cur.color }}>
        {sel === 0 && (
          <>
            <b style={{ color: '#22c55e' }}>V 型</b>：回撤 {Math.abs(mdd).toFixed(0)}%，
            但快速恢复并创新高。<b>可接受</b>——只要策略逻辑没坏。
          </>
        )}
        {sel === 1 && (
          <>
            <b style={{ color: '#ef4444' }}>L 型</b>：回撤 {Math.abs(mdd).toFixed(0)}%，
            长期无法恢复。<b>危险</b>——实盘中投资者会赎回。
          </>
        )}
        {sel === 2 && (
          <>
            <b style={{ color: '#f59e0b' }}>阶梯型</b>：反复回撤，
            每次都没创新高。<b>警惕</b>——可能是策略失效。
          </>
        )}
      </div>

      <div className="diagram-caption">
        <b>深度</b>决定"亏多少"，<b>宽度</b>决定"熬多久"。
        实盘中最难受的不是深度，而是宽度——长期看不到希望。
      </div>
    </figure>
  );
}


/* ══════════════════════════════════════════════
   15. 复利曲线
   ══════════════════════════════════════════════ */

export function CompoundInterestDemo() {
  const [rate, setRate] = useState(0.10);
  const [years, setYears] = useState(20);

  const simple = Array.from({ length: years + 1 }, (_, i) => 1 + rate * i);
  const compound = Array.from({ length: years + 1 }, (_, i) => Math.pow(1 + rate, i));
  const continuous = Array.from({ length: years + 1 }, (_, i) => Math.exp(rate * i));

  const maxV = Math.max(...compound, ...continuous);
  const toY = (v: number) => 88 - (v / maxV) * 72;

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">单利 vs 复利 vs 连续复利</figcaption>

      <div className="la-controls">
        <label>
          年化收益率
          <input type="range" min="0.02" max="0.30" step="0.01" value={rate}
            onChange={(e) => setRate(parseFloat(e.target.value))} />
          <b>{(rate * 100).toFixed(0)}%</b>
        </label>
        <label>
          年数
          <input type="range" min="5" max="40" step="1" value={years}
            onChange={(e) => setYears(parseInt(e.target.value, 10))} />
          <b>{years}</b>
        </label>
      </div>

      <div className="ci-chart">
        <svg viewBox="0 0 340 100" className="ci-svg" role="img" aria-label="复利">
          <path
            d={simple.map((v, i) => {
              const x = 15 + (i / years) * 310;
              return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${toY(v).toFixed(1)}`;
            }).join(' ')}
            fill="none" stroke="#94a3b8" strokeWidth="1.5"
          />
          <path
            d={compound.map((v, i) => {
              const x = 15 + (i / years) * 310;
              return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${toY(v).toFixed(1)}`;
            }).join(' ')}
            fill="none" stroke="#2f6bff" strokeWidth="2"
          />
          <path
            d={continuous.map((v, i) => {
              const x = 15 + (i / years) * 310;
              return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${toY(v).toFixed(1)}`;
            }).join(' ')}
            fill="none" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4 2"
          />
        </svg>
      </div>

      <div className="ci-legend">
        <span><span className="pos-dot" style={{ background: '#94a3b8' }} /> 单利</span>
        <span><span className="pos-dot" style={{ background: '#2f6bff' }} /> 复利</span>
        <span><span className="pos-dot" style={{ background: '#22c55e' }} /> 连续复利</span>
      </div>

      <div className="ci-stats">
        <span>单利终值：<b style={{ color: '#94a3b8' }}>{simple[years].toFixed(2)}</b></span>
        <span>复利终值：<b style={{ color: '#2f6bff' }}>{compound[years].toFixed(2)}</b></span>
        <span>连续复利：<b style={{ color: '#22c55e' }}>{continuous[years].toFixed(2)}</b></span>
      </div>

      <div className="ci-note">
        <b>{years} 年后</b>：单利 {simple[years].toFixed(2)} 倍，
        复利 <b style={{ color: '#2f6bff' }}>{compound[years].toFixed(2)} 倍</b>，
        差距 <b>{((compound[years] - simple[years]) / simple[years] * 100).toFixed(0)}%</b>
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          连续复利 e^(rt) 是理论上限——实际中不存在，但用于定价模型
        </span>
      </div>

      <div className="diagram-caption">
        <b>复利的本质</b>：收益再投资。时间越长，指数效应越明显——这就是"时间的朋友"。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   16. 收益分布（尖峰厚尾）
   ══════════════════════════════════════════════ */

export function FatTailDemo() {
  const [tail, setTail] = useState(3);

  // 生成正态分布和厚尾分布的对比
  const n = 120;
  const normal = Array.from({ length: n }, (_, i) => {
    const x = (i - n / 2) / (n / 8);
    return Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
  });
  const fatTail = Array.from({ length: n }, (_, i) => {
    const x = (i - n / 2) / (n / 8);
    // t 分布（厚尾）
    const df = Math.max(10 - tail, 1);
    return Math.pow(1 + x * x / df, -(df + 1) / 2);
  });

  const maxY = Math.max(...fatTail, ...normal);
  const toY = (v: number) => 88 - (v / maxY) * 72;

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">正态分布 vs 金融收益的尖峰厚尾</figcaption>

      <div className="pos-controls">
        <label>
          厚尾程度
          <input type="range" min="1" max="8" step="1" value={tail}
            onChange={(e) => setTail(parseInt(e.target.value, 10))} />
          <b>{tail}</b>
        </label>
      </div>

      <div className="ft-chart">
        <svg viewBox="0 0 340 100" className="ft-svg" role="img" aria-label="分布对比">
          <path
            d={normal.map((v, i) => {
              const x = 15 + (i / (n - 1)) * 310;
              return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${toY(v).toFixed(1)}`;
            }).join(' ')}
            fill="none" stroke="#94a3b8" strokeWidth="1.8"
          />
          <path
            d={fatTail.map((v, i) => {
              const x = 15 + (i / (n - 1)) * 310;
              return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${toY(v).toFixed(1)}`;
            }).join(' ')}
            fill="none" stroke="#ef4444" strokeWidth="2"
          />
        </svg>
      </div>

      <div className="ft-legend">
        <span><span className="pos-dot" style={{ background: '#94a3b8' }} /> 正态分布</span>
        <span><span className="pos-dot" style={{ background: '#ef4444' }} /> 金融收益（厚尾）</span>
      </div>

      <div className="ft-compare">
        <div className="ft-row">
          <span className="ft-k">峰度</span>
          <span className="ft-v">正态 = 3，<b style={{ color: '#ef4444' }}>金融 ≈ 5~10</b></span>
        </div>
        <div className="ft-row">
          <span className="ft-k">极端事件</span>
          <span className="ft-v">正态预测"百年一遇"，实际<b style={{ color: '#ef4444' }}>几年一次</b></span>
        </div>
        <div className="ft-row">
          <span className="ft-k">后果</span>
          <span className="ft-v">用正态算 VaR 会<b style={{ color: '#ef4444' }}>严重低估风险</b></span>
        </div>
      </div>

      <div className="ft-note">
        <b>尖峰厚尾（Leptokurtic）</b>：中间更尖、尾部更厚。
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          这意味着"小波动更常见，大波动也更常见"——与正态假设相反
        </span>
      </div>

      <div className="diagram-caption">
        <b>实战教训</b>：不要用正态分布假设做风险管理。
        应该用历史模拟、t 分布或极值理论。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   17. 相关系数对比
   ══════════════════════════════════════════════ */

const CORR_CASES = [
  { name: '线性正相关', pearson: 0.95, spearman: 0.95, kendall: 0.82, color: '#22c55e' },
  { name: '单调非线性', pearson: 0.62, spearman: 0.98, kendall: 0.90, color: '#2f6bff' },
  { name: '有离群点', pearson: 0.78, spearman: 0.45, kendall: 0.33, color: '#f59e0b' },
  { name: '无关系', pearson: 0.05, spearman: 0.03, kendall: 0.02, color: '#94a3b8' },
];

export function CorrelationDemo() {
  const [sel, setSel] = useState(1);
  const cur = CORR_CASES[sel];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">三种相关系数：Pearson / Spearman / Kendall</figcaption>

      <div className="corr-tabs">
        {CORR_CASES.map((c, i) => (
          <button
            key={i}
            type="button"
            className={`corr-tab ${i === sel ? 'active' : ''}`}
            style={{ '--corr-color': c.color } as React.CSSProperties}
            onClick={() => setSel(i)}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="corr-bars">
        {[
          { name: 'Pearson', val: cur.pearson, note: '线性相关' },
          { name: 'Spearman', val: cur.spearman, note: '秩相关' },
          { name: 'Kendall', val: cur.kendall, note: '一致性' },
        ].map((d) => (
          <div key={d.name} className="corr-row">
            <span className="corr-name">{d.name}</span>
            <div className="corr-track">
              <div style={{ width: `${Math.abs(d.val) * 100}%`, background: cur.color }} />
            </div>
            <span className="corr-val" style={{ color: cur.color }}>{d.val.toFixed(2)}</span>
            <span className="corr-note">{d.note}</span>
          </div>
        ))}
      </div>

      <div className="corr-note" style={{ borderColor: cur.color }}>
        <b>{cur.name}</b>：
        {sel === 0 && '线性关系时三者接近。Pearson 最常用，但要求线性+正态。'}
        {sel === 1 && '单调非线性时，Pearson 低估（0.62），Spearman 准确（0.98）——秩相关只看顺序。'}
        {sel === 2 && '有离群点时，Pearson 被拉高（0.78），Spearman/Kendall 更稳健（0.45/0.33）。'}
        {sel === 3 && '无关系时，三者都接近 0。'}
      </div>

      <div className="corr-table">
        <div className="corr-thead">
          <span>系数</span><span>衡量</span><span>稳健性</span><span>适用</span>
        </div>
        <div className="corr-trow">
          <span style={{ color: '#2f6bff' }}>Pearson</span><span>线性相关</span><span>低（受离群点影响）</span><span>正态、线性</span>
        </div>
        <div className="corr-trow">
          <span style={{ color: '#22c55e' }}>Spearman</span><span>单调关系</span><span>中</span><span>非线性、有序</span>
        </div>
        <div className="corr-trow">
          <span style={{ color: '#f59e0b' }}>Kendall</span><span>一致性</span><span>高</span><span>小样本、有序</span>
        </div>
      </div>

      <div className="diagram-caption">
        <b>量化中的选择</b>：因子相关性用 Spearman（Rank IC），
        风险管理用 Pearson（协方差矩阵），小样本用 Kendall。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   18. 有效前沿
   ══════════════════════════════════════════════ */

export function EfficientFrontierDemo() {
  const [riskAversion, setRiskAversion] = useState(2);

  // 模拟有效前沿（双资产）
  const points = Array.from({ length: 50 }, (_, i) => {
    const w = i / 49;   // 风险资产权重
    const ret = 0.03 + w * 0.09;          // 3% ~ 12%
    const risk = 0.05 + Math.sqrt(w) * 0.15;  // 5% ~ 20%
    return { w, ret, risk };
  });

  // 切点组合（最大夏普）
  const rf = 0.02;
  const tangency = points.reduce((best, p) =>
    (p.ret - rf) / p.risk > (best.ret - rf) / best.risk ? p : best
  );

  // 效用最大化点
  const optimal = points.reduce((best, p) => {
    const u = p.ret - 0.5 * riskAversion * p.risk * p.risk;
    const bu = best.ret - 0.5 * riskAversion * best.risk * best.risk;
    return u > bu ? p : best;
  });

  const maxRisk = 0.25, maxRet = 0.15;
  const toX = (r: number) => 30 + (r / maxRisk) * 280;
  const toY = (r: number) => 88 - (r / maxRet) * 72;

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">马科维茨有效前沿：风险与收益的权衡</figcaption>

      <div className="pos-controls">
        <label>
          风险厌恶系数
          <input type="range" min="1" max="8" step="0.5" value={riskAversion}
            onChange={(e) => setRiskAversion(parseFloat(e.target.value))} />
          <b>{riskAversion.toFixed(1)}</b>
        </label>
      </div>

      <div className="ef-chart">
        <svg viewBox="0 0 340 100" className="ef-svg" role="img" aria-label="有效前沿">
          {/* 坐标轴 */}
          <line x1="30" y1="88" x2="320" y2="88" stroke="#cbd5e1" strokeWidth="1" />
          <line x1="30" y1="12" x2="30" y2="88" stroke="#cbd5e1" strokeWidth="1" />
          <text x="320" y="97" textAnchor="end" fontSize="6.5" fill="#94a3b8">风险 σ</text>
          <text x="34" y="18" fontSize="6.5" fill="#94a3b8">收益 μ</text>

          {/* 有效前沿 */}
          <path
            d={points.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.risk).toFixed(1)},${toY(p.ret).toFixed(1)}`).join(' ')}
            fill="none" stroke="#2f6bff" strokeWidth="2"
          />

          {/* 无风险利率 */}
          <circle cx={toX(0)} cy={toY(rf)} r="3" fill="#94a3b8" />
          <text x={toX(0) + 5} y={toY(rf) - 4} fontSize="6" fill="#94a3b8">Rf</text>

          {/* 切点组合 */}
          <circle cx={toX(tangency.risk)} cy={toY(tangency.ret)} r="4" fill="#22c55e" />
          <text x={toX(tangency.risk) + 6} y={toY(tangency.ret)} fontSize="6" fill="#22c55e" fontWeight="700">切点</text>

          {/* 最优组合 */}
          <circle cx={toX(optimal.risk)} cy={toY(optimal.ret)} r="4" fill="#ef4444" />
          <text x={toX(optimal.risk) + 6} y={toY(optimal.ret) + 8} fontSize="6" fill="#ef4444" fontWeight="700">最优</text>
        </svg>
      </div>

      <div className="ef-stats">
        <span>切点组合：σ=<b style={{ color: '#22c55e' }}>{(tangency.risk * 100).toFixed(1)}%</b>，
          μ=<b style={{ color: '#22c55e' }}>{(tangency.ret * 100).toFixed(1)}%</b></span>
        <span>最优组合：σ=<b style={{ color: '#ef4444' }}>{(optimal.risk * 100).toFixed(1)}%</b>，
          μ=<b style={{ color: '#ef4444' }}>{(optimal.ret * 100).toFixed(1)}%</b></span>
      </div>

      <div className="ef-note">
        <b>有效前沿</b>：给定风险下收益最高的组合集合。
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          风险厌恶越高，最优组合越靠近左下（低风险低收益）
        </span>
      </div>

      <div className="ef-formula">
        <code>max μᵀw − (λ/2)·wᵀΣw　s.t. Σw = 1</code>
      </div>

      <div className="diagram-caption">
        <b>切点组合</b>是夏普比率最大的点——所有理性投资者都会持有它（+ 无风险资产）。
        这就是"两基金分离定理"。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   19. 风险平价
   ══════════════════════════════════════════════ */

const RP_ASSETS = [
  { name: '股票', vol: 0.20, color: '#ef4444' },
  { name: '债券', vol: 0.05, color: '#22c55e' },
  { name: '黄金', vol: 0.15, color: '#f59e0b' },
  { name: '商品', vol: 0.18, color: '#7c5cff' },
];

export function RiskParityDemo() {
  const [mode, setMode] = useState<'equal' | 'risk'>('risk');

  // 等权 vs 风险平价
  const totalVol = RP_ASSETS.reduce((s, a) => s + a.vol, 0);
  const weights = mode === 'equal'
    ? RP_ASSETS.map(() => 1 / RP_ASSETS.length)
    : RP_ASSETS.map((a) => (1 / a.vol) / RP_ASSETS.reduce((s, x) => s + 1 / x.vol, 0));

  // 风险贡献
  const portfolioVol = Math.sqrt(
    RP_ASSETS.reduce((s, a, i) => s + Math.pow(weights[i] * a.vol, 2), 0)
  );
  const riskContrib = RP_ASSETS.map((a, i) =>
    Math.pow(weights[i] * a.vol, 2) / Math.pow(portfolioVol, 2)
  );

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">等权 vs 风险平价：风险贡献的差异</figcaption>

      <div className="pattern-tabs">
        <button
          type="button"
          className={`pattern-tab ${mode === 'equal' ? 'active' : ''}`}
          style={{ '--tab-color': '#ef4444' } as React.CSSProperties}
          onClick={() => setMode('equal')}
        >
          等权（60/40 思维）
        </button>
        <button
          type="button"
          className={`pattern-tab ${mode === 'risk' ? 'active' : ''}`}
          style={{ '--tab-color': '#22c55e' } as React.CSSProperties}
          onClick={() => setMode('risk')}
        >
          风险平价
        </button>
      </div>

      <div className="rp-table">
        <div className="rp-head">
          <span>资产</span><span>波动率</span><span>权重</span><span>风险贡献</span>
        </div>
        {RP_ASSETS.map((a, i) => (
          <div key={a.name} className="rp-row">
            <span style={{ color: a.color, fontWeight: 700 }}>{a.name}</span>
            <span>{(a.vol * 100).toFixed(0)}%</span>
            <span>{(weights[i] * 100).toFixed(1)}%</span>
            <div className="rp-bar-wrap">
              <div className="rp-bar" style={{ width: `${riskContrib[i] * 100}%`, background: a.color }} />
              <span className="rp-pct">{(riskContrib[i] * 100).toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="rp-stats">
        <span>组合波动率：<b>{((portfolioVol) * 100).toFixed(1)}%</b></span>
        <span>最大风险贡献：<b style={{ color: '#ef4444' }}>{(Math.max(...riskContrib) * 100).toFixed(1)}%</b></span>
      </div>

      <div className="rp-note" style={{ borderColor: mode === 'risk' ? '#22c55e' : '#ef4444' }}>
        {mode === 'equal' ? (
          <>
            <b style={{ color: '#ef4444' }}>等权的问题</b>：股票波动 20%，债券只有 5%，
            但权重都是 25%。
            <br />
            → <b>股票贡献了 {(riskContrib[0] * 100).toFixed(0)}% 的风险</b>，
            债券只贡献 {(riskContrib[1] * 100).toFixed(0)}%。
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              这就是"60/40 组合"的伪均衡——看似分散，实际是股票主导
            </span>
          </>
        ) : (
          <>
            <b style={{ color: '#22c55e' }}>风险平价</b>：按波动率倒数分配权重，
            让每个资产的风险贡献相等。
            <br />
            → 债券权重 <b>{(weights[1] * 100).toFixed(0)}%</b>，
            股票只有 <b>{(weights[0] * 100).toFixed(0)}%</b>。
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              这就是"全天候策略"的核心——真正的风险分散
            </span>
          </>
        )}
      </div>

      <div className="diagram-caption">
        <b>风险平价的数学</b>：w_i ∝ 1/σ_i。低波动资产获得高权重，高波动资产获得低权重。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   20. VaR vs CVaR
   ══════════════════════════════════════════════ */

export function VarCvarDemo() {
  const [conf, setConf] = useState(95);

  // 模拟收益分布（正态）
  const n = 100;
  const returns = Array.from({ length: n }, (_, i) => {
    // Box-Muller
    const u1 = (i + 1) / (n + 1);
    const u2 = ((i * 7) % n) / n;
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z * 0.02;
  }).sort((a, b) => a - b);

  const idx = Math.floor((1 - conf / 100) * n);
  const varValue = returns[idx];
  const cvarValue = returns.slice(0, idx + 1).reduce((a, b) => a + b, 0) / (idx + 1);

  const minR = returns[0], maxR = returns[n - 1];
  const toY = (v: number) => 88 - ((v - minR) / (maxR - minR)) * 72;
  const toX = (i: number) => 15 + (i / (n - 1)) * 310;

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">VaR 与 CVaR：两种风险度量</figcaption>

      <div className="pos-controls">
        <label>
          置信水平
          <input type="range" min="90" max="99" step="1" value={conf}
            onChange={(e) => setConf(parseInt(e.target.value, 10))} />
          <b>{conf}%</b>
        </label>
      </div>

      <div className="vc-chart">
        <svg viewBox="0 0 340 100" className="vc-svg" role="img" aria-label="VaR/CVaR">
          {/* 尾部区域 */}
          <rect
            x={toX(0)} y={12}
            width={toX(idx) - toX(0)} height={76}
            fill="#ef4444" opacity="0.12"
          />
          {/* 收益分布 */}
          {returns.map((r, i) => {
            const h = Math.abs(r - 0) * 400;
            return (
              <line
                key={i}
                x1={toX(i)} y1={88}
                x2={toX(i)} y2={88 - Math.max(h, 2)}
                stroke={i <= idx ? '#ef4444' : '#94a3b8'}
                strokeWidth="1.5"
                opacity={i <= idx ? 0.9 : 0.5}
              />
            );
          })}
          {/* VaR 线 */}
          <line
            x1={toX(idx)} y1={12} x2={toX(idx)} y2={88}
            stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 2"
          />
          <text x={toX(idx) + 3} y={20} fontSize="6" fill="#ef4444" fontWeight="700">VaR</text>
        </svg>
      </div>

      <div className="vc-stats">
        <span>VaR({conf}%)：<b style={{ color: '#f59e0b' }}>{(varValue * 100).toFixed(2)}%</b></span>
        <span>CVaR({conf}%)：<b style={{ color: '#ef4444' }}>{(cvarValue * 100).toFixed(2)}%</b></span>
        <span>尾部样本：<b>{idx + 1} 个</b></span>
      </div>

      <div className="vc-note">
        <b>VaR</b>：有 {conf}% 的把握，损失不超过 {(varValue * 100).toFixed(2)}%
        <br />
        <b>CVaR</b>（期望损失）：如果真跌破了 VaR，平均亏 {(cvarValue * 100).toFixed(2)}%
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          CVaR 更保守（|CVaR| ≥ |VaR|），且是<b>一致性风险度量</b>
        </span>
      </div>

      <div className="vc-compare">
        <div className="vc-row">
          <span className="vc-k">VaR 的缺陷</span>
          <span className="vc-v">不满足次可加性（分散化可能增加 VaR）</span>
        </div>
        <div className="vc-row">
          <span className="vc-k">CVaR 的优势</span>
          <span className="vc-v">一致性度量 + 考虑尾部形状</span>
        </div>
        <div className="vc-row">
          <span className="vc-k">巴塞尔协议</span>
          <span className="vc-v">已从 VaR 转向 <b>CVaR（ES）</b></span>
        </div>
      </div>

      <div className="diagram-caption">
        <b>关键区别</b>：VaR 只说"门槛在哪"，CVaR 说"过了门槛会亏多少"。
        后者更能反映尾部风险。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   注册表
   ══════════════════════════════════════════════ */

export const QUANT_DIAGRAMS = {
  orderbook: OrderBookDepth,
  candlestick: CandlestickAnatomy,
  tradematch: TradeMatchingFlow,
  drawdown: EquityDrawdownChart,
  purgedcv: PurgedCvTimeline,
  vecspeed: VectorizationDemo,
  broadcast: BroadcastDemo,
  resample: ResampleDemo,
  rolling: RollingWindowDemo,
  macd: MACDDemo,
  rsi: RSIDemo,
  volumeprice: VolumePriceDemo,
  vwap: VwapDemo,
  underwater: UnderwaterDemo,
  compound: CompoundInterestDemo,
  fattail: FatTailDemo,
  correlation: CorrelationDemo,
  frontier: EfficientFrontierDemo,
  riskparity: RiskParityDemo,
  varcvar: VarCvarDemo,
};
