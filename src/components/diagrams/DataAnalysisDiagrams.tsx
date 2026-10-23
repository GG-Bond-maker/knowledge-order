/**
 * 数据分析课程专用图示组件（SVG + CSS，零依赖）
 */

import { useState, useMemo } from 'react';
import './diagrams.css';

/* ══════════════════════════════════════════════
   1. Python 内存模型
   ══════════════════════════════════════════════ */

export function PythonMemoryDemo() {
  const [step, setStep] = useState(0);

  const steps = [
    { code: 'a = [1, 2, 3]', varA: 'obj_1', varB: null, note: '创建列表对象 obj_1，a 指向它' },
    { code: 'b = a', varA: 'obj_1', varB: 'obj_1', note: 'b 也指向同一个对象（不是复制！）' },
    { code: 'b.append(4)', varA: 'obj_1', varB: 'obj_1', note: '修改 b 会影响 a——它们指向同一对象' },
    { code: 'b = b + [5]', varA: 'obj_1', varB: 'obj_2', note: 'b 指向新对象 obj_2，a 不变' },
  ];

  const cur = steps[step];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">Python 变量是指针，不是盒子</figcaption>

      <div className="pm-vars">
        <div className="pm-var">
          <span className="pm-name">a</span>
          <span className="pm-arrow">→</span>
          <span className="pm-obj" style={{ borderColor: cur.varA === 'obj_1' ? '#2f6bff' : '#94a3b8' }}>
            {cur.varA}
          </span>
        </div>
        <div className="pm-var">
          <span className="pm-name">b</span>
          <span className="pm-arrow">→</span>
          <span className="pm-obj" style={{ borderColor: cur.varB === 'obj_1' ? '#2f6bff' : cur.varB === 'obj_2' ? '#22c55e' : '#94a3b8' }}>
            {cur.varB ?? '（未定义）'}
          </span>
        </div>
      </div>

      <div className="pm-objects">
        <div className={`pm-obj-box ${cur.varA === 'obj_1' || cur.varB === 'obj_1' ? 'active' : ''}`}>
          <div className="pm-obj-name">obj_1</div>
          <div className="pm-obj-val">[1, 2, 3{step >= 2 ? ', 4' : ''}]</div>
          <div className="pm-refcount">
            引用计数：{(cur.varA === 'obj_1' ? 1 : 0) + (cur.varB === 'obj_1' ? 1 : 0)}
          </div>
        </div>
        {step >= 3 && (
          <div className={`pm-obj-box ${cur.varB === 'obj_2' ? 'active green' : ''}`}>
            <div className="pm-obj-name">obj_2</div>
            <div className="pm-obj-val">[1, 2, 3, 4, 5]</div>
            <div className="pm-refcount">引用计数：1</div>
          </div>
        )}
      </div>

      <div className="pm-code">
        <code>{cur.code}</code>
      </div>

      <div className="pos-controls">
        <label>
          执行步骤
          <input type="range" min="0" max={steps.length - 1} step="1" value={step}
            onChange={(e) => setStep(parseInt(e.target.value, 10))} />
          <b>{step + 1}/{steps.length}</b>
        </label>
      </div>

      <div className="pm-note" style={{ borderColor: step >= 2 && step < 3 ? '#ef4444' : '#22c55e' }}>
        {cur.note}
      </div>

      <div className="diagram-caption">
        <b>关键</b>：`b = a` 不复制，只增加一个引用。
        要真正复制用 <code>b = a.copy()</code> 或 <code>b = list(a)</code>。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   2. pandas 索引
   ══════════════════════════════════════════════ */

export function PandasIndexDemo() {
  const [mode, setMode] = useState<'loc' | 'iloc'>('loc');

  const df = [
    { idx: 'a', name: 'Alice', age: 25, city: '北京' },
    { idx: 'b', name: 'Bob', age: 30, city: '上海' },
    { idx: 'c', name: 'Carol', age: 28, city: '广州' },
    { idx: 'd', name: 'Dave', age: 35, city: '深圳' },
  ];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">loc 与 iloc：标签索引 vs 位置索引</figcaption>

      <div className="pattern-tabs">
        <button
          type="button"
          className={`pattern-tab ${mode === 'loc' ? 'active' : ''}`}
          style={{ '--tab-color': '#2f6bff' } as React.CSSProperties}
          onClick={() => setMode('loc')}
        >
          .loc（按标签）
        </button>
        <button
          type="button"
          className={`pattern-tab ${mode === 'iloc' ? 'active' : ''}`}
          style={{ '--tab-color': '#22c55e' } as React.CSSProperties}
          onClick={() => setMode('iloc')}
        >
          .iloc（按位置）
        </button>
      </div>

      <div className="pid-table">
        <div className="pid-head">
          <span className="pid-idx">index</span>
          <span>name</span><span>age</span><span>city</span>
        </div>
        {df.map((r, i) => (
          <div key={r.idx} className={`pid-row ${i === 1 ? 'highlight' : ''}`}>
            <span className="pid-idx" style={{ color: mode === 'loc' ? '#2f6bff' : '#22c55e', fontWeight: 700 }}>
              {mode === 'loc' ? r.idx : i}
            </span>
            <span>{r.name}</span><span>{r.age}</span><span>{r.city}</span>
          </div>
        ))}
      </div>

      <div className="pid-code">
        {mode === 'loc' ? (
          <>
            <div><code>df.loc['b']</code> → Bob 这行（按 <b>标签</b>）</div>
            <div><code>df.loc['a':'c']</code> → a,b,c 三行（<b>含右端点</b>）</div>
          </>
        ) : (
          <>
            <div><code>df.iloc[1]</code> → Bob 这行（按 <b>位置</b>）</div>
            <div><code>df.iloc[0:2]</code> → 前 2 行（<b>不含右端点</b>）</div>
          </>
        )}
      </div>

      <div className="pid-note" style={{ borderColor: mode === 'loc' ? '#2f6bff' : '#22c55e' }}>
        {mode === 'loc' ? (
          <>
            <b style={{ color: '#2f6bff' }}>loc 用标签</b>，且切片<b>包含右端点</b>。
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              这是 pandas 的历史遗留——loc 切片是"闭区间"
            </span>
          </>
        ) : (
          <>
            <b style={{ color: '#22c55e' }}>iloc 用位置</b>，切片<b>不含右端点</b>（和 Python 列表一致）。
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              这是最容易搞混的地方：loc 含右，iloc 不含右
            </span>
          </>
        )}
      </div>

      <div className="diagram-caption">
        <b>记忆口诀</b>：<b>l</b>oc = <b>l</b>abel（标签），<b>i</b>loc = <b>i</b>nteger（整数位置）。
        切片时 loc 含右，iloc 不含右。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   3. 缺失值处理
   ══════════════════════════════════════════════ */

const MISSING_DATA = [
  { name: 'Alice', age: 25, score: 88 },
  { name: 'Bob', age: null, score: 92 },
  { name: 'Carol', age: 28, score: null },
  { name: 'Dave', age: null, score: 79 },
  { name: 'Eve', age: 32, score: 95 },
];

const STRATEGIES = [
  { name: '删除', color: '#ef4444', desc: 'dropna() —— 丢弃含缺失的行', result: 2 },
  { name: '均值填充', color: '#2f6bff', desc: 'fillna(df.mean()) —— 用列均值', result: 5 },
  { name: '前向填充', color: '#f59e0b', desc: 'ffill() —— 用上一行的值', result: 5 },
  { name: '插值', color: '#22c55e', desc: 'interpolate() —— 线性插值', result: 5 },
];

export function MissingValueDemo() {
  const [sel, setSel] = useState(0);
  const cur = STRATEGIES[sel];

  const ages = MISSING_DATA.map((d) => d.age).filter((v): v is number => v !== null);
  const avgAge = ages.reduce((a, b) => a + b, 0) / ages.length;

  const filled = useMemo(() => {
    if (sel === 0) return MISSING_DATA.filter((d) => d.age !== null && d.score !== null);
    if (sel === 1) {
      return MISSING_DATA.map((d) => ({
        ...d,
        age: d.age ?? Math.round(avgAge),
        score: d.score ?? 88,
      }));
    }
    if (sel === 2) {
      let lastAge: number | null = null;
      let lastScore: number | null = null;
      return MISSING_DATA.map((d) => {
        if (d.age !== null) lastAge = d.age;
        if (d.score !== null) lastScore = d.score;
        return { name: d.name, age: d.age ?? lastAge, score: d.score ?? lastScore };
      });
    }
    // 插值
    return MISSING_DATA.map((d, i) => {
      let age = d.age;
      let score = d.score;
      if (age === null) {
        const prev = MISSING_DATA.slice(0, i).reverse().find((x) => x.age !== null)?.age ?? null;
        const next = MISSING_DATA.slice(i + 1).find((x) => x.age !== null)?.age ?? null;
        age = prev !== null && next !== null ? Math.round((prev + next) / 2) : (prev ?? next);
      }
      if (score === null) {
        const prev = MISSING_DATA.slice(0, i).reverse().find((x) => x.score !== null)?.score ?? null;
        const next = MISSING_DATA.slice(i + 1).find((x) => x.score !== null)?.score ?? null;
        score = prev !== null && next !== null ? Math.round((prev + next) / 2) : (prev ?? next);
      }
      return { name: d.name, age, score };
    });
  }, [sel, avgAge]);

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">缺失值处理：四种策略的取舍</figcaption>

      <div className="mv-tabs">
        {STRATEGIES.map((s, i) => (
          <button
            key={s.name}
            type="button"
            className={`mv-tab ${i === sel ? 'active' : ''}`}
            style={{ '--mv-color': s.color } as React.CSSProperties}
            onClick={() => setSel(i)}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="mv-table">
        <div className="mv-head">
          <span>name</span><span>age</span><span>score</span><span>状态</span>
        </div>
        {MISSING_DATA.map((r, i) => {
          const f = filled[i];
          const dropped = sel === 0 && (r.age === null || r.score === null);
          if (dropped) return null;
          const ageChanged = r.age === null;
          const scoreChanged = r.score === null;
          return (
            <div key={r.name} className="mv-row">
              <span>{r.name}</span>
              <span style={{ color: ageChanged ? cur.color : 'var(--text-2)', fontWeight: ageChanged ? 700 : 400 }}>
                {f?.age ?? '-'}
              </span>
              <span style={{ color: scoreChanged ? cur.color : 'var(--text-2)', fontWeight: scoreChanged ? 700 : 400 }}>
                {f?.score ?? '-'}
              </span>
              <span style={{ fontSize: 9, color: ageChanged || scoreChanged ? cur.color : 'var(--text-3)' }}>
                {ageChanged || scoreChanged ? '已填充' : '原始'}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mv-stats">
        <span>剩余行数：<b style={{ color: cur.color }}>{filled.length}/{MISSING_DATA.length}</b></span>
        <span>数据损失：<b style={{ color: filled.length < 5 ? '#ef4444' : '#22c55e' }}>
          {((1 - filled.length / 5) * 100).toFixed(0)}%
        </b></span>
      </div>

      <div className="mv-note" style={{ borderColor: cur.color }}>
        <b style={{ color: cur.color }}>{cur.name}</b>：{cur.desc}
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          {sel === 0 && '简单，但丢数据。缺失超过 20% 时慎用'}
          {sel === 1 && '保留所有行，但会缩小方差（低估波动）'}
          {sel === 2 && '适合时间序列，但会延续错误值'}
          {sel === 3 && '较合理，但假设了线性趋势'}
        </span>
      </div>

      <div className="diagram-caption">
        <b>没有万能方法</b>：要看缺失机制（随机缺失？系统缺失？）和业务含义。
        均值填充会破坏分布，删除会丢样本。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   4. SQL JOIN 类型
   ══════════════════════════════════════════════ */

const TABLE_A = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }, { id: 3, name: 'Carol' }];
const TABLE_B = [{ id: 2, dept: '研发' }, { id: 3, dept: '产品' }, { id: 4, dept: '运营' }];

const JOIN_TYPES = [
  { name: 'INNER JOIN', color: '#2f6bff', desc: '只保留两表都有的 id' },
  { name: 'LEFT JOIN', color: '#22c55e', desc: '保留左表全部，右表缺失为 NULL' },
  { name: 'RIGHT JOIN', color: '#f59e0b', desc: '保留右表全部，左表缺失为 NULL' },
  { name: 'FULL JOIN', color: '#7c5cff', desc: '保留两表全部，缺失为 NULL' },
];

export function SqlJoinDemo() {
  const [sel, setSel] = useState(0);
  const cur = JOIN_TYPES[sel];

  const result = useMemo(() => {
    const rows: { id: number; name: string | null; dept: string | null }[] = [];
    if (sel === 0) {
      for (const a of TABLE_A) {
        const b = TABLE_B.find((x) => x.id === a.id);
        if (b) rows.push({ id: a.id, name: a.name, dept: b.dept });
      }
    } else if (sel === 1) {
      for (const a of TABLE_A) {
        const b = TABLE_B.find((x) => x.id === a.id);
        rows.push({ id: a.id, name: a.name, dept: b?.dept ?? null });
      }
    } else if (sel === 2) {
      for (const b of TABLE_B) {
        const a = TABLE_A.find((x) => x.id === b.id);
        rows.push({ id: b.id, name: a?.name ?? null, dept: b.dept });
      }
    } else {
      const ids = new Set([...TABLE_A.map((x) => x.id), ...TABLE_B.map((x) => x.id)]);
      for (const id of [...ids].sort()) {
        const a = TABLE_A.find((x) => x.id === id);
        const b = TABLE_B.find((x) => x.id === id);
        rows.push({ id, name: a?.name ?? null, dept: b?.dept ?? null });
      }
    }
    return rows;
  }, [sel]);

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">四种 JOIN：集合运算的语义</figcaption>

      <div className="sj-tabs">
        {JOIN_TYPES.map((j, i) => (
          <button
            key={j.name}
            type="button"
            className={`sj-tab ${i === sel ? 'active' : ''}`}
            style={{ '--sj-color': j.color } as React.CSSProperties}
            onClick={() => setSel(i)}
          >
            {j.name}
          </button>
        ))}
      </div>

      <div className="sj-tables">
        <div className="sj-table">
          <div className="sj-table-title">表 A（用户）</div>
          {TABLE_A.map((r) => (
            <div key={r.id} className="sj-row">
              <span className="sj-id">{r.id}</span><span>{r.name}</span>
            </div>
          ))}
        </div>
        <div className="sj-table">
          <div className="sj-table-title">表 B（部门）</div>
          {TABLE_B.map((r) => (
            <div key={r.id} className="sj-row">
              <span className="sj-id">{r.id}</span><span>{r.dept}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="sj-result-title" style={{ color: cur.color }}>结果（{result.length} 行）</div>
      <div className="sj-result">
        <div className="sj-rhead"><span>id</span><span>name</span><span>dept</span></div>
        {result.map((r, i) => (
          <div key={i} className="sj-rrow">
            <span>{r.id}</span>
            <span style={{ color: r.name === null ? '#ef4444' : 'var(--text-2)' }}>
              {r.name ?? 'NULL'}
            </span>
            <span style={{ color: r.dept === null ? '#ef4444' : 'var(--text-2)' }}>
              {r.dept ?? 'NULL'}
            </span>
          </div>
        ))}
      </div>

      <div className="sj-note" style={{ borderColor: cur.color }}>
        <b style={{ color: cur.color }}>{cur.name}</b>：{cur.desc}
      </div>

      <div className="diagram-caption">
        <b>实战提醒</b>：LEFT JOIN 后用 WHERE 过滤右表字段，
        会意外变成 INNER JOIN——条件要写在 ON 里。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   5. 图表类型选择
   ══════════════════════════════════════════════ */

const CHART_GUIDE = [
  { purpose: '比较大小', charts: ['柱状图', '条形图'], color: '#2f6bff', avoid: '饼图（超过 5 类难比较）' },
  { purpose: '看趋势', charts: ['折线图', '面积图'], color: '#22c55e', avoid: '柱状图（时间点太多会拥挤）' },
  { purpose: '看分布', charts: ['直方图', '箱线图', '小提琴图'], color: '#f59e0b', avoid: '饼图（完全不适用）' },
  { purpose: '看关系', charts: ['散点图', '气泡图'], color: '#7c5cff', avoid: '双 Y 轴（易误导）' },
  { purpose: '看构成', charts: ['堆叠柱状图', '饼图（≤5类）'], color: '#ec4899', avoid: '3D 饼图' },
];

export function ChartTypeDemo() {
  const [sel, setSel] = useState(0);
  const cur = CHART_GUIDE[sel];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">按分析目的选图表</figcaption>

      <div className="ct-tabs">
        {CHART_GUIDE.map((g, i) => (
          <button
            key={g.purpose}
            type="button"
            className={`ct-tab ${i === sel ? 'active' : ''}`}
            style={{ '--ct-color': g.color } as React.CSSProperties}
            onClick={() => setSel(i)}
          >
            {g.purpose}
          </button>
        ))}
      </div>

      <div className="ct-recommend" style={{ borderColor: cur.color }}>
        <div className="ct-rec-title" style={{ color: cur.color }}>推荐图表</div>
        <div className="ct-rec-list">
          {cur.charts.map((c) => (
            <span key={c} className="ct-rec-item" style={{ background: `${cur.color}20`, color: cur.color, borderColor: cur.color }}>
              {c}
            </span>
          ))}
        </div>
      </div>

      <div className="ct-avoid">
        <span className="ct-avoid-icon">⚠</span>
        <span><b>避免</b>：{cur.avoid}</span>
      </div>

      <div className="ct-table">
        <div className="ct-thead"><span>目的</span><span>推荐</span></div>
        {CHART_GUIDE.map((g, i) => (
          <div key={g.purpose} className={`ct-trow ${i === sel ? 'active' : ''}`} onClick={() => setSel(i)}>
            <span style={{ color: g.color, fontWeight: 700 }}>{g.purpose}</span>
            <span>{g.charts.join('、')}</span>
          </div>
        ))}
      </div>

      <div className="diagram-caption">
        <b>选图三步</b>：① 明确分析目的 ② 看数据类型（类别/数值/时间）
        ③ 避开常见误用（3D、双 Y 轴、饼图过多分类）。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   6. A/B 实验
   ══════════════════════════════════════════════ */

export function ABTestDemo() {
  const [lift, setLift] = useState(5);
  const [n, setN] = useState(1000);

  // 模拟：对照组转化率 10%，实验组 10%*(1+lift%)
  const pControl = 0.10;
  const pTreat = 0.10 * (1 + lift / 100);

  // 标准误
  const seControl = Math.sqrt(pControl * (1 - pControl) / n);
  const seTreat = Math.sqrt(pTreat * (1 - pTreat) / n);
  const seDiff = Math.sqrt(seControl ** 2 + seTreat ** 2);
  const diff = pTreat - pControl;
  const z = seDiff > 0 ? diff / seDiff : 0;

  // 双尾 p 值（近似）
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));
  const significant = pValue < 0.05;

  function normalCdf(x: number) {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - p : p;
  }

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">A/B 实验：提升多少才算显著？</figcaption>

      <div className="la-controls">
        <label>
          相对提升
          <input type="range" min="0" max="30" step="1" value={lift}
            onChange={(e) => setLift(parseInt(e.target.value, 10))} />
          <b>{lift}%</b>
        </label>
        <label>
          每组样本量
          <input type="range" min="100" max="20000" step="100" value={n}
            onChange={(e) => setN(parseInt(e.target.value, 10))} />
          <b>{n.toLocaleString()}</b>
        </label>
      </div>

      <div className="ab-groups">
        <div className="ab-group control">
          <div className="ab-label">对照组</div>
          <div className="ab-rate">{(pControl * 100).toFixed(2)}%</div>
          <div className="ab-n">n={n.toLocaleString()}</div>
        </div>
        <div className="ab-vs">vs</div>
        <div className="ab-group treat" style={{ borderColor: significant ? '#22c55e' : '#94a3b8' }}>
          <div className="ab-label">实验组</div>
          <div className="ab-rate" style={{ color: significant ? '#22c55e' : 'var(--text-2)' }}>
            {(pTreat * 100).toFixed(2)}%
          </div>
          <div className="ab-n">n={n.toLocaleString()}</div>
        </div>
      </div>

      <div className="ab-stats">
        <span>绝对差异：<b>{(diff * 100).toFixed(2)} pp</b></span>
        <span>z 值：<b>{z.toFixed(2)}</b></span>
        <span>p 值：<b style={{ color: significant ? '#22c55e' : '#ef4444' }}>{pValue.toFixed(4)}</b></span>
      </div>

      <div className="ab-verdict" style={{ borderColor: significant ? '#22c55e' : '#ef4444' }}>
        {significant ? (
          <>
            <b style={{ color: '#22c55e' }}>✓ 显著（p &lt; 0.05）</b>：可以上线
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              但仍要检查：是否有辛普森悖论、是否只影响某个子群体
            </span>
          </>
        ) : (
          <>
            <b style={{ color: '#ef4444' }}>✗ 不显著（p ≥ 0.05）</b>：不能断定有效
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              可能原因：样本量不足、效应太小、方差太大
            </span>
          </>
        )}
      </div>

      <div className="ab-power">
        <b>样本量估算</b>：要检测 {lift}% 的相对提升（基线 10%），
        每组约需 <b>{Math.ceil(16 * pControl * (1 - pControl) / Math.pow(diff || 0.001, 2)).toLocaleString()}</b> 个样本
      </div>

      <div className="diagram-caption">
        <b>核心公式</b>：z = (p₁−p₂) / √(p₁(1−p₁)/n₁ + p₂(1−p₂)/n₂)。
        |z| &gt; 1.96 时 p &lt; 0.05（双尾）。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   7. Excel 引用方式
   ══════════════════════════════════════════════ */

export function ExcelRefDemo() {
  const [mode, setMode] = useState<'relative' | 'absolute'>('absolute');

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">相对引用 vs 绝对引用：$ 的作用</figcaption>

      <div className="pattern-tabs">
        <button
          type="button"
          className={`pattern-tab ${mode === 'relative' ? 'active' : ''}`}
          style={{ '--tab-color': '#ef4444' } as React.CSSProperties}
          onClick={() => setMode('relative')}
        >
          A1（相对引用）
        </button>
        <button
          type="button"
          className={`pattern-tab ${mode === 'absolute' ? 'active' : ''}`}
          style={{ '--tab-color': '#22c55e' } as React.CSSProperties}
          onClick={() => setMode('absolute')}
        >
          $A$1（绝对引用）
        </button>
      </div>

      <div className="er-scenario">
        <div className="er-title">场景：B 列乘 A 列，公式在 C1</div>
        <div className="er-grid">
          <div className="er-head"><span></span><span>A</span><span>B</span><span>C</span></div>
          {[1, 2, 3].map((r) => (
            <div key={r} className="er-row">
              <span className="er-rn">{r}</span>
              <span className="er-cell a">{r * 10}</span>
              <span className="er-cell b">{r}</span>
              <span className={`er-cell c ${r === 1 ? 'formula' : ''}`}>
                {r === 1 ? (mode === 'absolute' ? '=A1*$B$1' : '=A1*B1') : '?'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="er-result">
        {mode === 'relative' ? (
          <>
            <div className="er-res-title" style={{ color: '#ef4444' }}>向下拖拽后（相对引用）</div>
            <div className="er-res-body">
              C1: =A1*B1 → 10×1 = <b>10</b><br />
              C2: =A2*B2 → 20×2 = <b>40</b> ← 引用跟着动了<br />
              C3: =A3*B3 → 30×3 = <b>90</b>
            </div>
            <div className="er-verdict bad">
              ⚠ 如果本意是"都乘 B1"，这里就错了
            </div>
          </>
        ) : (
          <>
            <div className="er-res-title" style={{ color: '#22c55e' }}>向下拖拽后（绝对引用）</div>
            <div className="er-res-body">
              C1: =A1*$B$1 → 10×1 = <b>10</b><br />
              C2: =A2*$B$1 → 20×1 = <b>20</b> ← B1 锁住了<br />
              C3: =A3*$B$1 → 30×1 = <b>30</b>
            </div>
            <div className="er-verdict good">
              ✓ $B$1 始终指向 B1，符合本意
            </div>
          </>
        )}
      </div>

      <div className="er-table">
        <div className="er-thead"><span>写法</span><span>含义</span><span>拖拽时</span></div>
        <div className="er-trow"><span style={{ fontFamily: 'var(--font-mono)' }}>A1</span><span>相对</span><span>行列都变</span></div>
        <div className="er-trow"><span style={{ fontFamily: 'var(--font-mono)' }}>$A1</span><span>列绝对</span><span>列不变行变</span></div>
        <div className="er-trow"><span style={{ fontFamily: 'var(--font-mono)' }}>A$1</span><span>行绝对</span><span>行不变列变</span></div>
        <div className="er-trow"><span style={{ fontFamily: 'var(--font-mono)' }}>$A$1</span><span>完全绝对</span><span>都不变</span></div>
      </div>

      <div className="diagram-caption">
        <b>按 F4 循环切换</b>：A1 → $A$1 → A$1 → $A1。
        记住：<b>$ 在谁前面，谁就不变</b>。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   8. 指标体系（北极星）
   ══════════════════════════════════════════════ */

const METRIC_TREE = {
  name: '北极星指标',
  value: '月活用户数（MAU）',
  color: '#ef4444',
  children: [
    {
      name: '新增用户',
      value: '新注册数',
      color: '#2f6bff',
      children: [
        { name: '渠道 A', value: '投放', color: '#7c5cff' },
        { name: '渠道 B', value: '自然流量', color: '#7c5cff' },
      ],
    },
    {
      name: '留存用户',
      value: '次月留存',
      color: '#22c55e',
      children: [
        { name: '7 日留存', value: '活跃度', color: '#0891b2' },
        { name: '30 日留存', value: '忠诚度', color: '#0891b2' },
      ],
    },
    {
      name: '召回用户',
      value: '流失召回',
      color: '#f59e0b',
      children: [
        { name: 'Push 触达', value: '推送', color: '#ec4899' },
        { name: '活动召回', value: '运营', color: '#ec4899' },
      ],
    },
  ],
};

export function MetricTreeDemo() {
  const [sel, setSel] = useState<string | null>(null);

  const allNodes: { name: string; value: string; color: string; level: number }[] = [];
  allNodes.push({ name: METRIC_TREE.name, value: METRIC_TREE.value, color: METRIC_TREE.color, level: 0 });
  for (const c of METRIC_TREE.children) {
    allNodes.push({ name: c.name, value: c.value, color: c.color, level: 1 });
    for (const g of c.children) {
      allNodes.push({ name: g.name, value: g.value, color: g.color, level: 2 });
    }
  }

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">指标体系：从北极星到可执行指标</figcaption>

      <div className="mt-tree">
        {/* 第 0 层 */}
        <div className="mt-level">
          <div
            className={`mt-node l0 ${sel === METRIC_TREE.name ? 'active' : ''}`}
            style={{ borderColor: METRIC_TREE.color, background: `${METRIC_TREE.color}15` }}
            onClick={() => setSel(METRIC_TREE.name)}
          >
            <div className="mt-name" style={{ color: METRIC_TREE.color }}>{METRIC_TREE.name}</div>
            <div className="mt-value">{METRIC_TREE.value}</div>
          </div>
        </div>

        <div className="mt-connector" />

        {/* 第 1 层 */}
        <div className="mt-level row">
          {METRIC_TREE.children.map((c) => (
            <div
              key={c.name}
              className={`mt-node l1 ${sel === c.name ? 'active' : ''}`}
              style={{ borderColor: c.color, background: `${c.color}12` }}
              onClick={() => setSel(c.name)}
            >
              <div className="mt-name" style={{ color: c.color }}>{c.name}</div>
              <div className="mt-value">{c.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-connector" />

        {/* 第 2 层 */}
        <div className="mt-level row wrap">
          {METRIC_TREE.children.flatMap((c) =>
            c.children.map((g) => (
              <div
                key={g.name}
                className={`mt-node l2 ${sel === g.name ? 'active' : ''}`}
                style={{ borderColor: g.color }}
                onClick={() => setSel(g.name)}
              >
                <div className="mt-name" style={{ color: g.color }}>{g.name}</div>
                <div className="mt-value">{g.value}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-legend">
        <span><span className="mt-dot" style={{ background: '#ef4444' }} /> 北极星（1 个）</span>
        <span><span className="mt-dot" style={{ background: '#2f6bff' }} /> 一级指标（3~5 个）</span>
        <span><span className="mt-dot" style={{ background: '#7c5cff' }} /> 二级指标（可执行）</span>
      </div>

      <div className="mt-note">
        {sel ? (
          <>
            <b>选中</b>：{allNodes.find((n) => n.name === sel)?.name}
            （{allNodes.find((n) => n.name === sel)?.value}）
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              层级 {allNodes.find((n) => n.name === sel)?.level === 0 ? '北极星' : allNodes.find((n) => n.name === sel)?.level === 1 ? '一级' : '二级'}
            </span>
          </>
        ) : (
          <>
            <b>点击任意节点</b>查看详情
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              好的指标体系：北极星 1 个、一级 3~5 个、二级可执行
            </span>
          </>
        )}
      </div>

      <div className="diagram-caption">
        <b>为什么要拆解</b>：北极星指标（如 MAU）不能直接操作。
        必须拆到"能做的动作"（如优化渠道 A 的转化率）。
      </div>
    </figure>
  );
}
