/**
 * 算法课程专用图示组件（SVG + CSS，零依赖）
 */

import { useState, useMemo } from 'react';
import './diagrams.css';

/* ══════════════════════════════════════════════
   1. 复杂度增长曲线
   ══════════════════════════════════════════════ */

const COMPLEXITIES = [
  { name: 'O(1)', fn: () => 1, color: '#22c55e', label: '常数' },
  { name: 'O(log n)', fn: (n: number) => Math.log2(n), color: '#0891b2', label: '对数' },
  { name: 'O(n)', fn: (n: number) => n, color: '#2f6bff', label: '线性' },
  { name: 'O(n log n)', fn: (n: number) => n * Math.log2(n), color: '#7c5cff', label: '线性对数' },
  { name: 'O(n²)', fn: (n: number) => n * n, color: '#f59e0b', label: '平方' },
  { name: 'O(2ⁿ)', fn: (n: number) => Math.pow(2, n), color: '#ef4444', label: '指数' },
];

export function ComplexityGrowthDemo() {
  const [n, setN] = useState(16);
  const [sel, setSel] = useState(3);

  const maxN = 32;
  const W = 340, H = 150;
  const toX = (v: number) => 42 + (v / maxN) * (W - 55);
  const toY = (v: number) => {
    const log = Math.log10(Math.max(v, 1));
    return H - 22 - (log / 10) * (H - 40);
  };

  const cur = COMPLEXITIES[sel];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">时间复杂度：数据量增大时，不同复杂度的差距</figcaption>

      <div className="pos-controls">
        <label>
          数据量 n
          <input type="range" min="1" max={maxN} step="1" value={n}
            onChange={(e) => setN(parseInt(e.target.value, 10))} />
          <b>{n}</b>
        </label>
      </div>

      <div className="cx-tabs">
        {COMPLEXITIES.map((c, i) => (
          <button
            key={c.name}
            type="button"
            className={`cx-tab ${i === sel ? 'active' : ''}`}
            style={{ '--cx-color': c.color } as React.CSSProperties}
            onClick={() => setSel(i)}
          >
            {c.name}
          </button>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="cx-svg" role="img" aria-label="复杂度曲线">
        {[0, 2, 4, 6, 8].map((lg) => (
          <g key={lg}>
            <line x1="40" y1={toY(Math.pow(10, lg))} x2={W - 12} y2={toY(Math.pow(10, lg))}
              stroke="#e2e8f0" strokeWidth="0.7" />
            <text x="36" y={toY(Math.pow(10, lg)) + 3} textAnchor="end" fontSize="6" fill="#94a3b8">
              1e{lg}
            </text>
          </g>
        ))}
        {COMPLEXITIES.map((c, i) => {
          const pts: string[] = [];
          for (let x = 1; x <= maxN; x += 0.5) {
            const y = c.fn(x);
            if (y > 1e9) break;
            pts.push(`${toX(x).toFixed(1)},${toY(y).toFixed(1)}`);
          }
          return (
            <path
              key={c.name}
              d={`M${pts.join(' L')}`}
              fill="none"
              stroke={c.color}
              strokeWidth={i === sel ? 2.5 : 1.2}
              opacity={i === sel ? 1 : 0.35}
            />
          );
        })}
        {/* 当前 n 的竖线 */}
        <line x1={toX(n)} y1="12" x2={toX(n)} y2={H - 22} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 2" />
      </svg>

      <div className="cx-table">
        <div className="cx-head">
          <span>复杂度</span><span>类型</span><span>n={n} 时操作数</span>
        </div>
        {COMPLEXITIES.map((c, i) => {
          const v = c.fn(n);
          return (
            <div key={c.name} className={`cx-row ${i === sel ? 'active' : ''}`} onClick={() => setSel(i)}>
              <span style={{ color: c.color, fontWeight: 700 }}>{c.name}</span>
              <span>{c.label}</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>
                {v >= 1e6 ? v.toExponential(2) : v.toFixed(v < 10 ? 1 : 0)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="cx-note" style={{ borderColor: cur.color }}>
        <b style={{ color: cur.color }}>{cur.name}</b>（{cur.label}）：n={n} 时需要约
        <b> {cur.fn(n) >= 1e6 ? cur.fn(n).toExponential(2) : cur.fn(n).toFixed(0)} </b>次操作
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          {n <= 10 ? '小数据量时差距不明显' : n <= 24 ? '差距开始显现' : '差距急剧扩大——这就是算法优化的价值'}
        </span>
      </div>

      <div className="diagram-caption">
        <b>大 O 关注增长趋势</b>，不是精确次数。n 足够大时，低阶项和常数都可忽略。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   2. 双指针可视化
   ══════════════════════════════════════════════ */

export function TwoPointerDemo() {
  const [mode, setMode] = useState<'collide' | 'window'>('collide');
  const [left, setLeft] = useState(0);
  const [right, setRight] = useState(7);

  const arr = [2, 7, 11, 15, 3, 6, 8, 1];
  const target = 17;

  const sum = arr[left] + arr[right];

  // 滑动窗口
  const [winStart, setWinStart] = useState(0);
  const [winSize, setWinSize] = useState(3);
  const winSum = arr.slice(winStart, winStart + winSize).reduce((a, b) => a + b, 0);

  const step = (dir: 'left' | 'right') => {
    if (dir === 'left' && left < right - 1) setLeft(left + 1);
    if (dir === 'right' && right > left + 1) setRight(right - 1);
  };

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">双指针：对撞指针与滑动窗口</figcaption>

      <div className="pattern-tabs">
        <button
          type="button"
          className={`pattern-tab ${mode === 'collide' ? 'active' : ''}`}
          style={{ '--tab-color': '#2f6bff' } as React.CSSProperties}
          onClick={() => setMode('collide')}
        >
          对撞指针（两数之和）
        </button>
        <button
          type="button"
          className={`pattern-tab ${mode === 'window' ? 'active' : ''}`}
          style={{ '--tab-color': '#22c55e' } as React.CSSProperties}
          onClick={() => setMode('window')}
        >
          滑动窗口（子数组和）
        </button>
      </div>

      {mode === 'collide' ? (
        <>
          <div className="tp-array">
            {arr.map((v, i) => {
              const isL = i === left;
              const isR = i === right;
              const inRange = i >= left && i <= right;
              return (
                <div
                  key={i}
                  className={`tp-cell ${isL ? 'left' : ''} ${isR ? 'right' : ''} ${!inRange ? 'out' : ''}`}
                >
                  <span className="tp-val">{v}</span>
                  <span className="tp-idx">{i}</span>
                  {isL && <span className="tp-tag l">L</span>}
                  {isR && <span className="tp-tag r">R</span>}
                </div>
              );
            })}
          </div>

          <div className="tp-info">
            <span>arr[{left}] + arr[{right}] = {arr[left]} + {arr[right]} = <b style={{ color: sum === target ? '#22c55e' : sum < target ? '#2f6bff' : '#ef4444' }}>{sum}</b></span>
            <span>目标：<b>{target}</b></span>
          </div>

          <div className="tp-actions">
            <button type="button" className="tp-btn" onClick={() => step('left')}>L 右移 →</button>
            <button type="button" className="tp-btn" onClick={() => step('right')}>← R 左移</button>
            <button type="button" className="tp-btn reset" onClick={() => { setLeft(0); setRight(7); }}>重置</button>
          </div>

          <div className="tp-hint" style={{ borderColor: sum === target ? '#22c55e' : sum < target ? '#2f6bff' : '#ef4444' }}>
            {sum === target ? (
              <><b style={{ color: '#22c55e' }}>✓ 找到了！</b> arr[{left}]+arr[{right}]={target}</>
            ) : sum < target ? (
              <><b style={{ color: '#2f6bff' }}>和太小</b> → 左指针右移（增大和）</>
            ) : (
              <><b style={{ color: '#ef4444' }}>和太大</b> → 右指针左移（减小和）</>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="tp-array">
            {arr.map((v, i) => {
              const inWin = i >= winStart && i < winStart + winSize;
              return (
                <div key={i} className={`tp-cell ${inWin ? 'inwin' : 'out'}`}>
                  <span className="tp-val">{v}</span>
                  <span className="tp-idx">{i}</span>
                </div>
              );
            })}
          </div>

          <div className="la-controls">
            <label>
              窗口起点
              <input type="range" min="0" max={arr.length - winSize} step="1" value={winStart}
                onChange={(e) => setWinStart(parseInt(e.target.value, 10))} />
              <b>{winStart}</b>
            </label>
            <label>
              窗口大小
              <input type="range" min="1" max="5" step="1" value={winSize}
                onChange={(e) => { setWinSize(parseInt(e.target.value, 10)); setWinStart(0); }} />
              <b>{winSize}</b>
            </label>
          </div>

          <div className="tp-info">
            <span>窗口 [{winStart}, {winStart + winSize - 1}]</span>
            <span>窗口和：<b style={{ color: '#22c55e' }}>{winSum}</b></span>
          </div>

          <div className="tp-hint" style={{ borderColor: '#22c55e' }}>
            <b style={{ color: '#22c55e' }}>滑动窗口</b>：固定窗口大小，每次只加新元素、减旧元素，
            避免重复求和 → O(n) 而非 O(n×k)
          </div>
        </>
      )}

      <div className="diagram-caption">
        <b>双指针的核心</b>：利用数据的有序性或单调性，把 O(n²) 的暴力枚举降到 O(n)。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   3. 二分查找
   ══════════════════════════════════════════════ */

export function BinarySearchDemo() {
  const arr = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const [target, setTarget] = useState(13);
  const [lo, setLo] = useState(0);
  const [hi, setHi] = useState(arr.length - 1);
  const [found, setFound] = useState<number | null>(null);

  const mid = Math.floor((lo + hi) / 2);

  const stepOnce = () => {
    if (found !== null || lo > hi) return;
    if (arr[mid] === target) {
      setFound(mid);
    } else if (arr[mid] < target) {
      setLo(mid + 1);
    } else {
      setHi(mid - 1);
    }
  };

  const reset = () => { setLo(0); setHi(arr.length - 1); setFound(null); };

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">二分查找：每次排除一半</figcaption>

      <div className="pos-controls">
        <label>
          目标值
          <input type="range" min="1" max="19" step="2" value={target}
            onChange={(e) => { setTarget(parseInt(e.target.value, 10)); reset(); }} />
          <b>{target}</b>
        </label>
      </div>

      <div className="bs-array">
        {arr.map((v, i) => {
          const inRange = i >= lo && i <= hi;
          const isMid = i === mid && inRange;
          const isFound = i === found;
          return (
            <div
              key={i}
              className={`bs-cell ${!inRange ? 'dead' : ''} ${isMid ? 'mid' : ''} ${isFound ? 'found' : ''}`}
            >
              <span className="bs-val">{v}</span>
              <span className="bs-idx">{i}</span>
            </div>
          );
        })}
      </div>

      <div className="bs-range">
        <span>lo=<b>{lo}</b></span>
        <span>mid=<b style={{ color: '#f59e0b' }}>{lo <= hi ? mid : '-'}</b></span>
        <span>hi=<b>{hi}</b></span>
        <span>剩余 <b>{Math.max(hi - lo + 1, 0)}</b> 个</span>
      </div>

      <div className="bs-actions">
        <button type="button" className="tp-btn" onClick={stepOnce} disabled={found !== null || lo > hi}>
          下一步 →
        </button>
        <button type="button" className="tp-btn reset" onClick={reset}>重置</button>
      </div>

      <div className="bs-hint" style={{ borderColor: found !== null ? '#22c55e' : lo > hi ? '#ef4444' : '#f59e0b' }}>
        {found !== null ? (
          <><b style={{ color: '#22c55e' }}>✓ 找到 target={target} 在索引 {found}</b></>
        ) : lo > hi ? (
          <><b style={{ color: '#ef4444' }}>✗ 未找到</b>（lo &gt; hi，区间为空）</>
        ) : arr[mid] < target ? (
          <>arr[{mid}]={arr[mid]} &lt; {target} → <b>lo = mid+1 = {mid + 1}</b>（去右半区）</>
        ) : arr[mid] > target ? (
          <>arr[{mid}]={arr[mid]} &gt; {target} → <b>hi = mid-1 = {mid - 1}</b>（去左半区）</>
        ) : (
          <>arr[{mid}]={arr[mid]} = {target} → 找到了！</>
        )}
      </div>

      <div className="bs-complexity">
        <b>复杂度</b>：每次排除一半 → O(log n)。10 个元素最多 4 次，100 万个最多 20 次。
      </div>

      <div className="diagram-caption">
        <b>二分的前提</b>：数组必须有序。无序数组要先排序（O(n log n)），
        只在多次查询时才划算。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   4. 链表操作
   ══════════════════════════════════════════════ */

export function LinkedListDemo() {
  const [vals, setVals] = useState([1, 2, 3, 4, 5]);
  const [op, setOp] = useState<'insert' | 'delete' | 'reverse'>('reverse');
  const [pos, setPos] = useState(2);

  const doOp = () => {
    if (op === 'insert') {
      const next = [...vals];
      next.splice(pos, 0, 99);
      setVals(next);
    } else if (op === 'delete') {
      if (vals.length > 1) {
        const next = [...vals];
        next.splice(pos, 1);
        setVals(next);
      }
    } else {
      setVals([...vals].reverse());
    }
  };

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">链表：节点与指针</figcaption>

      <div className="ll-list">
        {vals.map((v, i) => (
          <div key={i} className="ll-node-wrap">
            <div className={`ll-node ${i === pos ? 'active' : ''}`}>
              <div className="ll-val">{v}</div>
              <div className="ll-next">→</div>
            </div>
            {i < vals.length - 1 && <div className="ll-arrow">→</div>}
          </div>
        ))}
        <div className="ll-null">null</div>
      </div>

      <div className="ll-controls">
        <div className="ll-ops">
          {(['insert', 'delete', 'reverse'] as const).map((o) => (
            <button
              key={o}
              type="button"
              className={`ll-op-btn ${op === o ? 'active' : ''}`}
              onClick={() => setOp(o)}
            >
              {o === 'insert' ? '插入' : o === 'delete' ? '删除' : '反转'}
            </button>
          ))}
        </div>
        {op !== 'reverse' && (
          <label>
            位置
            <input type="range" min="0" max={Math.max(vals.length - 1, 0)} step="1" value={pos}
              onChange={(e) => setPos(parseInt(e.target.value, 10))} />
            <b>{pos}</b>
          </label>
        )}
      </div>

      <div className="ll-actions">
        <button type="button" className="tp-btn" onClick={doOp}>
          执行 {op === 'insert' ? '插入 99' : op === 'delete' ? '删除' : '反转'}
        </button>
        <button type="button" className="tp-btn reset" onClick={() => { setVals([1, 2, 3, 4, 5]); setPos(2); }}>
          重置
        </button>
      </div>

      <div className="ll-table">
        <div className="ll-thead"><span>操作</span><span>数组</span><span>链表</span></div>
        <div className="ll-trow"><span>按下标访问</span><span style={{ color: '#22c55e' }}>O(1)</span><span style={{ color: '#ef4444' }}>O(n)</span></div>
        <div className="ll-trow"><span>头部插入</span><span style={{ color: '#ef4444' }}>O(n)</span><span style={{ color: '#22c55e' }}>O(1)</span></div>
        <div className="ll-trow"><span>已知节点删除</span><span style={{ color: '#ef4444' }}>O(n)</span><span style={{ color: '#22c55e' }}>O(1)</span></div>
        <div className="ll-trow"><span>查找</span><span>O(n)</span><span>O(n)</span></div>
      </div>

      <div className="diagram-caption">
        <b>链表 vs 数组</b>：链表牺牲随机访问（O(n)）换取插入删除（O(1)）。
        选择取决于访问模式。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   5. 单调栈
   ══════════════════════════════════════════════ */

export function MonotonicStackDemo() {
  const heights = [2, 1, 5, 6, 2, 3];
  const [step, setStep] = useState(0);

  // 预计算每一步的栈状态
  const history = useMemo(() => {
    const h: { i: number; stack: number[]; action: string; area: number }[] = [];
    const stack: number[] = [];
    let maxArea = 0;
    for (let i = 0; i <= heights.length; i++) {
      const cur = i < heights.length ? heights[i] : 0;
      let action = '';
      while (stack.length && heights[stack[stack.length - 1]] > cur) {
        const idx = stack.pop()!;
        const width = stack.length ? i - stack[stack.length - 1] - 1 : i;
        const area = heights[idx] * width;
        maxArea = Math.max(maxArea, area);
        action = `弹出 h[${idx}]=${heights[idx]}，宽度 ${width}，面积 ${area}`;
      }
      if (i < heights.length) stack.push(i);
      h.push({ i, stack: [...stack], action, area: maxArea });
    }
    return h;
  }, []);

  const cur = history[Math.min(step, history.length - 1)];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">单调栈：柱状图中的最大矩形</figcaption>

      <div className="ms-bars">
        {heights.map((h, i) => (
          <div key={i} className="ms-bar-col">
            <div className="ms-bar" style={{ height: `${(h / 7) * 100}%` }}>
              <span className="ms-h">{h}</span>
            </div>
            <span className={`ms-idx ${cur.stack.includes(i) ? 'in' : ''}`}>{i}</span>
          </div>
        ))}
      </div>

      <div className="pos-controls">
        <label>
          步骤
          <input type="range" min="0" max={history.length - 1} step="1" value={step}
            onChange={(e) => setStep(parseInt(e.target.value, 10))} />
          <b>{step + 1}/{history.length}</b>
        </label>
      </div>

      <div className="ms-state">
        <div className="ms-row">
          <span className="ms-k">当前 i</span>
          <span className="ms-v">{cur.i < heights.length ? `${cur.i}（h=${heights[cur.i]}）` : '结束哨兵'}</span>
        </div>
        <div className="ms-row">
          <span className="ms-k">栈内容</span>
          <span className="ms-v" style={{ fontFamily: 'var(--font-mono)' }}>
            [{cur.stack.join(', ')}]
          </span>
        </div>
        <div className="ms-row">
          <span className="ms-k">本步动作</span>
          <span className="ms-v" style={{ color: cur.action ? '#f59e0b' : 'var(--text-3)' }}>
            {cur.action || '压栈，无弹出'}
          </span>
        </div>
        <div className="ms-row">
          <span className="ms-k">最大面积</span>
          <span className="ms-v" style={{ color: '#22c55e', fontWeight: 700 }}>{cur.area}</span>
        </div>
      </div>

      <div className="ms-note">
        <b>单调栈的核心</b>：栈内元素保持单调递增。
        当遇到更矮的柱子时，说明栈顶柱子的"右边界"确定，可以计算面积。
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          时间复杂度 O(n)：每个元素最多入栈出栈各一次
        </span>
      </div>

      <div className="diagram-caption">
        <b>适用场景</b>：找"左边/右边第一个更大/更小的元素"。
        单调栈把 O(n²) 降到 O(n)。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   6. 哈希表原理
   ══════════════════════════════════════════════ */

export function HashTableDemo() {
  const [key, setKey] = useState('apple');
  const size = 8;

  const hash = useMemo(() => {
    let h = 0;
    for (let i = 0; i < key.length; i++) {
      h = (h * 31 + key.charCodeAt(i)) % size;
    }
    return h;
  }, [key]);

  const buckets = useMemo(() => {
    const b: { key: string; hash: number }[][] = Array.from({ length: size }, () => []);
    const words = ['apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape'];
    for (const w of words) {
      let h = 0;
      for (let i = 0; i < w.length; i++) h = (h * 31 + w.charCodeAt(i)) % size;
      b[h].push({ key: w, hash: h });
    }
    return b;
  }, []);

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">哈希表：key → hash → bucket</figcaption>

      <div className="ht-input">
        <label>
          输入 key
          <input type="text" value={key} onChange={(e) => setKey(e.target.value.slice(0, 12))} />
        </label>
        <div className="ht-calc">
          <span className="ht-formula">hash(" {key} ") = </span>
          <span className="ht-result">{hash}</span>
        </div>
      </div>

      <div className="ht-buckets">
        {buckets.map((bucket, i) => (
          <div key={i} className={`ht-bucket ${i === hash ? 'active' : ''}`}>
            <div className="ht-bucket-idx">{i}</div>
            <div className="ht-bucket-items">
              {bucket.length === 0 ? (
                <span className="ht-empty">空</span>
              ) : (
                bucket.map((item) => (
                  <span
                    key={item.key}
                    className={`ht-item ${item.key === key ? 'target' : ''}`}
                  >
                    {item.key}
                  </span>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="ht-note" style={{ borderColor: buckets[hash].length > 1 ? '#f59e0b' : '#22c55e' }}>
        {buckets[hash].length > 1 ? (
          <>
            <b style={{ color: '#f59e0b' }}>⚠ 哈希冲突</b>：桶 {hash} 中有 {buckets[hash].length} 个 key，
            需要链表或开放寻址解决。
          </>
        ) : (
          <>
            <b style={{ color: '#22c55e' }}>✓ 无冲突</b>：桶 {hash} 中
            {buckets[hash].length === 0 ? '为空' : `只有 "${buckets[hash][0].key}"`}
          </>
        )}
      </div>

      <div className="ht-table">
        <div className="ht-thead"><span>操作</span><span>平均</span><span>最坏</span></div>
        <div className="ht-trow"><span>查找</span><span style={{ color: '#22c55e' }}>O(1)</span><span style={{ color: '#ef4444' }}>O(n)</span></div>
        <div className="ht-trow"><span>插入</span><span style={{ color: '#22c55e' }}>O(1)</span><span style={{ color: '#ef4444' }}>O(n)</span></div>
        <div className="ht-trow"><span>删除</span><span style={{ color: '#22c55e' }}>O(1)</span><span style={{ color: '#ef4444' }}>O(n)</span></div>
      </div>

      <div className="diagram-caption">
        <b>为什么平均 O(1)</b>：好的哈希函数让 key 均匀分布，每个桶平均只有 O(1) 个元素。
        <b>最坏 O(n)</b>：所有 key 撞到同一个桶（如刻意构造）。
      </div>
    </figure>
  );
}
