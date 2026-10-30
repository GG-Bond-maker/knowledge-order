/**
 * Transformer 与大语言模型 · 专用交互图
 *
 *   BpeMergeDemo         BPE 逐轮合并过程（对应 ml-tf-l1-2）
 *   TokenizerCompareDemo WordPiece / Unigram / SentencePiece 策略对比（对应 ml-tf-l1-3）
 *   PositionEncodingDemo 可学习 vs 相对位置编码（对应 ml-tf-l3-2，原本无图）
 *   RopeRotationDemo     RoPE 旋转与相对位置性质（对应 ml-tf-l3-3，原本无图）
 *   PplDecodeDemo        困惑度与解码采样策略（对应 ml-tf-l5-3）
 */

import { useState, useMemo } from 'react';

/* ────────────────────────────────────────────────────────────
 *  1. BPE 合并过程
 * ──────────────────────────────────────────────────────────── */

export function BpeMergeDemo() {
  const [merges, setMerges] = useState(3);

  // 语料：low / lower / newest / widest（经典 BPE 教学语料）
  const corpus = ['low', 'lower', 'newest', 'widest'];

  // BPE 模拟：从字符开始，逐轮合并最高频相邻对
  const steps = useMemo(() => {
    let words = corpus.map((w) => w.split(''));
    const vocabHistory: { pair: string; count: number; after: string[][] }[] = [];
    for (let step = 0; step < 10; step++) {
      // 统计相邻对频率
      const counter = new Map<string, number>();
      for (const w of words) {
        for (let i = 0; i < w.length - 1; i++) {
          const pair = w[i] + '+' + w[i + 1];
          counter.set(pair, (counter.get(pair) || 0) + 1);
        }
      }
      if (counter.size === 0) break;
      // 取最高频
      let best = '';
      let bestN = 0;
      counter.forEach((n, p) => {
        if (n > bestN || (n === bestN && p < best)) { bestN = n; best = p; }
      });
      if (bestN < 2) break; // 不再有重复对
      const [a, b] = best.split('+');
      // 应用合并
      words = words.map((w) => {
        const out: string[] = [];
        let i = 0;
        while (i < w.length) {
          if (i < w.length - 1 && w[i] === a && w[i + 1] === b) {
            out.push(a + b);
            i += 2;
          } else {
            out.push(w[i]);
            i += 1;
          }
        }
        return out;
      });
      vocabHistory.push({ pair: best.replace('+', ' + '), count: bestN, after: words.map((w) => [...w]) });
    }
    return vocabHistory;
  }, []);

  const shown = steps.slice(0, merges);
  const cur = shown.length ? shown[shown.length - 1].after : corpus.map((w) => w.split(''));

  // 词表大小：初始字符集 + 已合并数
  const baseChars = new Set<string>();
  corpus.forEach((w) => w.split('').forEach((c) => baseChars.add(c)));
  const vocabSize = baseChars.size + shown.length;

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '880px', margin: '1.5rem auto' }}>
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
          🧩 BPE 逐轮合并：从字符到子词
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
          语料：low / lower / newest / widest。每一轮找出<b>出现频率最高的相邻字符对</b>并合并成一个新 token。
          拖动滑杆看合并如何逐步把常见片段粘成整词。
        </p>
      </div>

      <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', marginBottom: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {cur.map((w, i) => (
            <div key={`w${i}`} style={{ background: '#fff', borderRadius: '6px', padding: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '4px' }}>{corpus[i]}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                {w.map((tok, j) => (
                  <span key={`t${j}`} style={{
                    padding: '3px 7px', borderRadius: '4px', fontSize: '0.82rem',
                    fontFamily: 'ui-monospace, monospace', fontWeight: 600,
                    background: tok.length > 1 ? '#dbeafe' : '#f1f5f9',
                    color: tok.length > 1 ? '#1d4ed8' : '#475569',
                    border: tok.length > 1 ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                  }}>
                    {tok}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.76rem' }}>
        <div style={{ fontWeight: 600, marginBottom: '6px', color: '#475569' }}>合并历史</div>
        {shown.length === 0 ? (
          <div style={{ color: '#94a3b8' }}>尚未合并（全部是单个字符）</div>
        ) : (
          shown.map((s, i) => (
            <div key={`mh${i}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0', borderBottom: i < shown.length - 1 ? '1px dashed #e2e8f0' : 'none' }}>
              <span style={{ color: '#94a3b8', width: '28px' }}>#{i + 1}</span>
              <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: '#1d4ed8' }}>{s.pair}</span>
              <span style={{ color: '#64748b' }}>→</span>
              <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: '#047857' }}>{s.pair.replace(' + ', '')}</span>
              <span style={{ color: '#94a3b8', marginLeft: 'auto' }}>出现 {s.count} 次</span>
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
        <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.7rem', color: '#1d4ed8' }}>合并轮数</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1d4ed8' }}>{shown.length}</div>
        </div>
        <div style={{ background: '#ecfdf5', padding: '10px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.7rem', color: '#047857' }}>当前词表大小</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#047857' }}>{vocabSize}</div>
          <div style={{ fontSize: '0.62rem', color: '#10b981' }}>{baseChars.size} 基础字符 + {shown.length} 合并</div>
        </div>
        <div style={{ background: '#fffbeb', padding: '10px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.7rem', color: '#b45309' }}>总 token 数</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#b45309' }}>
            {cur.reduce((s, w) => s + w.length, 0)}
          </div>
          <div style={{ fontSize: '0.62rem', color: '#f59e0b' }}>越少 = 压缩率越高</div>
        </div>
      </div>

      <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
        <label style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
          <span>合并轮数</span><strong>{merges}</strong>
        </label>
        <input type="range" min={0} max={Math.max(steps.length, 1)} step={1} value={merges}
               onChange={(e) => setMerges(parseInt(e.target.value))} style={{ width: '100%' }} />
      </div>

      <div style={{ marginTop: '10px', fontSize: '0.76rem', lineHeight: 1.6, color: '#475569', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px' }}>
        <b>BPE 的取舍</b>：合并越多 → 词表越大、单 token 承载越多字符、序列越短。
        但词表过大会让 Embedding 与输出 softmax 变贵（vocab × d 参数），且低频子词训练不足。
        现代模型一般词表 32k（GPT-2）到 152k（Qwen3）。
        注意 <b>BPE 是无损可逆的</b>：token 拼回去就是原文，不需要 UNK。
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 *  2. 分词策略对比
 * ──────────────────────────────────────────────────────────── */

export function TokenizerCompareDemo() {
  const [scheme, setScheme] = useState<'bpe' | 'wordpiece' | 'unigram'>('bpe');

  const samples = [
    { word: 'unbelievable', note: '常见词根 + 后缀' },
    { word: 'tokenization', note: '规则派生前缀' },
    { word: 'machinelearning', note: '无空格复合词' },
    { word: '机器学习', note: '中文（不同切分）' },
  ];

  // 三种方案在这几个词上的典型切分
  const splits: Record<string, string[][]> = {
    bpe: [
      ['un', 'believ', 'able'],
      ['token', 'ization'],
      ['machine', 'learning'],
      ['机器', '学习'],
    ],
    wordpiece: [
      ['un', '##believ', '##able'],
      ['token', '##ization'],
      ['machine', '##learning'],
      ['机', '##器', '##学', '##习'],
    ],
    unigram: [
      ['unbeliev', 'able'],
      ['tokeniz', 'ation'],
      ['machine', 'learn', 'ing'],
      ['机器学', '习'],
    ],
  };

  const desc: Record<string, { title: string; how: string; pro: string; con: string }> = {
    bpe: {
      title: 'BPE（GPT / LLaMA / Qwen）',
      how: '自底向上：从字符开始，反复合并最高频相邻对。纯频率驱动，不看概率模型。',
      pro: '简单高效、无损、可处理任意新词（退化为字符）。',
      con: '合并是贪心的，可能切出不语义的片段（如 believ）。',
    },
    wordpiece: {
      title: 'WordPiece（BERT）',
      how: '与 BPE 类似，但合并准则用「似然提升」而非频率：选让语料概率增加最多的对。',
      pro: '切分更贴近语言模型视角，后续子词用 ## 标记。',
      con: '需要概率模型，计算略重；## 前缀增加了序列长度。',
    },
    unigram: {
      title: 'Unigram LM（T5 / ALBERT）',
      how: '自顶向下：先备一个超大候选集，用 EM 算法反复删除「删掉后语料似然损失最小」的 token。',
      pro: '能给出多个切分方案并选概率最高的，天然支持子词正则化。',
      con: '训练更慢（EM 迭代），推理时需要 Viterbi 搜索。',
    },
  };
  const cur = desc[scheme];

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '880px', margin: '1.5rem auto' }}>
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
          🔤 三种子词分词方案对比：BPE / WordPiece / Unigram
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
          同一个词在三种方案下会被切成不同片段。注意 <b>WordPiece 用 ## 标记「非首个子词」</b>，
          而 Unigram 倾向切出更少、更长的块。
        </p>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        {([['bpe', 'BPE'], ['wordpiece', 'WordPiece'], ['unigram', 'Unigram LM']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setScheme(k)}
            style={{
              flex: 1, padding: '8px', borderRadius: '6px',
              border: `1px solid ${scheme === k ? '#2f6bff' : '#cbd5e1'}`,
              background: scheme === k ? '#2f6bff' : '#fff',
              color: scheme === k ? '#fff' : '#475569',
              cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
            }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gap: '8px', marginBottom: '14px' }}>
        {samples.map((s, i) => (
          <div key={`s${i}`} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 130px', gap: '12px', alignItems: 'center', background: '#f8fafc', padding: '9px 12px', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a', fontFamily: 'ui-monospace, monospace' }}>
              {s.word}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {(splits[scheme][i] || []).map((tok, j) => (
                <span key={`tk${j}`} style={{
                  padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem',
                  fontFamily: 'ui-monospace, monospace', fontWeight: 600,
                  background: j === 0 ? '#dbeafe' : '#e0e7ff',
                  color: j === 0 ? '#1d4ed8' : '#4338ca',
                  border: `1px solid ${j === 0 ? '#93c5fd' : '#a5b4fc'}`,
                }}>
                  {tok}
                </span>
              ))}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
              {(splits[scheme][i] || []).length} token
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1d4ed8', marginBottom: '6px' }}>
            {cur.title}
          </div>
          <div style={{ fontSize: '0.75rem', lineHeight: 1.7, color: '#334155' }}>
            <b>怎么做</b>：{cur.how}
          </div>
        </div>
        <div style={{ display: 'grid', gap: '8px' }}>
          <div style={{ background: '#ecfdf5', padding: '9px 12px', borderRadius: '8px', fontSize: '0.74rem', lineHeight: 1.6, color: '#065f46' }}>
            <b>优点</b>：{cur.pro}
          </div>
          <div style={{ background: '#fffbeb', padding: '9px 12px', borderRadius: '8px', fontSize: '0.74rem', lineHeight: 1.6, color: '#92400e' }}>
            <b>代价</b>：{cur.con}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '10px', fontSize: '0.76rem', lineHeight: 1.6, color: '#475569', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px' }}>
        <b>SentencePiece 是另一层概念</b>：它是一个<b>工具库</b>，不是切分算法——BPE 和 Unigram 都能在它里面实现。
        它最大的贡献是把空格也当成普通符号处理（用 ▁ 表示），因此不需要预分词，能直接吃原始文本，
        对中文、日文这类没有空格的语种特别友好。
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 *  3. 位置编码：可学习 vs 相对
 * ──────────────────────────────────────────────────────────── */

export function PositionEncodingDemo() {
  const [scheme, setScheme] = useState<'learned' | 'relative' | 'sinusoidal'>('learned');
  const [len, setLen] = useState(512); // 训练长度
  const [testPos, setTestPos] = useState(600); // 测试位置（超出训练长度）

  // 三种方案在「超出训练长度」时的行为
  const behavior = {
    learned: {
      title: '可学习绝对位置',
      train: 'pos_embedding 是 [max_len, d] 的可训练矩阵',
      extra: '❌ 无参数可查 → 越界位置无定义',
      params: `${len} × d 个参数`,
      note: 'GPT-2 用这种。外推必须靠插值（把表按比例缩放）或继续训练。',
      canExtrapolate: false,
    },
    relative: {
      title: '相对位置编码',
      train: '只看 |i−j| 的相对距离，用一组共享的相对偏置',
      extra: '✅ 距离有界，超出训练长度的相对距离可复用最近的桶',
      params: '固定数量的相对桶（如 32 个）',
      note: 'T5 的 relative position bias、DeBERTa 的 disentangled attention 都属于这一类。',
      canExtrapolate: true,
    },
    sinusoidal: {
      title: '正弦绝对位置',
      train: 'sin/cos 函数生成，无参数',
      extra: '✅ 数学上可算任意位置，但模型没在那些位置训练过',
      params: '0 个参数',
      note: '原始 Transformer 用这种。能算出数值，但「见过」才有效——这是它和 RoPE 的关键差别。',
      canExtrapolate: true,
    },
  };
  const cur = behavior[scheme];

  // 可视化：位置 → 编码相似度
  const W = 380;
  const H = 150;
  const maxPos = Math.max(len, testPos) + 50;
  const gx = (p: number) => (p / maxPos) * W;

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '880px', margin: '1.5rem auto' }}>
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
          📍 位置编码：绝对 vs 相对，以及「外推」到底难在哪
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
          训练长度 {len}，但推理时要处理到位置 {testPos}。
          切换方案看它能否处理这些「没见过的位置」——这是长上下文能力的核心。
        </p>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        {([['learned', '可学习绝对'], ['sinusoidal', '正弦绝对'], ['relative', '相对位置']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setScheme(k)}
            style={{
              flex: 1, padding: '8px', borderRadius: '6px',
              border: `1px solid ${scheme === k ? '#2f6bff' : '#cbd5e1'}`,
              background: scheme === k ? '#2f6bff' : '#fff',
              color: scheme === k ? '#fff' : '#475569',
              cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
            }}>
            {label}
          </button>
        ))}
      </div>

      <svg viewBox={`0 0 ${W + 20} ${H}`} style={{ width: '100%', background: '#fbfcff', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '12px' }}>
        {/* 训练覆盖区 */}
        <rect x={10} y={30} width={gx(len)} height={H - 60} fill="rgba(47,107,255,0.08)" />
        {/* 外推区 */}
        <rect x={10 + gx(len)} y={30} width={Math.max(0, gx(maxPos) - gx(len))} height={H - 60}
              fill={cur.canExtrapolate ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.10)'} />

        <line x1={10} y1={H - 30} x2={W + 10} y2={H - 30} stroke="#cbd5e1" />
        {/* 训练边界 */}
        <line x1={10 + gx(len)} y1={20} x2={10 + gx(len)} y2={H - 25} stroke="#2f6bff" strokeWidth={1.8} strokeDasharray="5,3" />
        <text x={10 + gx(len) + 4} y={26} fontSize={9} fill="#1d4ed8" fontWeight={700}>训练长度 {len}</text>

        {/* 测试位置标记 */}
        <line x1={10 + gx(testPos)} y1={35} x2={10 + gx(testPos)} y2={H - 25}
              stroke={cur.canExtrapolate ? '#10b981' : '#ef4444'} strokeWidth={2.2} />
        <text x={10 + gx(testPos) + 4} y={H - 34} fontSize={9}
              fill={cur.canExtrapolate ? '#047857' : '#dc2626'} fontWeight={700}>
          测试位置 {testPos}
        </text>

        <text x={14} y={H - 34} fontSize={8} fill="#64748b">已训练区间</text>
        <text x={10 + gx(len) + 6} y={H - 12} fontSize={8} fill={cur.canExtrapolate ? '#047857' : '#dc2626'}>
          {cur.canExtrapolate ? '✅ 该方案可处理' : '❌ 该方案无定义'}
        </text>
      </svg>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', fontSize: '0.75rem', lineHeight: 1.8 }}>
          <div style={{ fontWeight: 700, marginBottom: '4px', color: '#0f172a' }}>{cur.title}</div>
          <div><span style={{ color: '#64748b' }}>训练方式：</span>{cur.train}</div>
          <div><span style={{ color: '#64748b' }}>参数量：</span>{cur.params}</div>
        </div>
        <div style={{ background: cur.canExtrapolate ? '#ecfdf5' : '#fef2f2', padding: '12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '4px' }}>超出训练长度</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: cur.canExtrapolate ? '#047857' : '#dc2626' }}>
            {cur.extra}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '6px', lineHeight: 1.6 }}>
            {cur.note}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
        <div>
          <label style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
            <span>训练长度</span><strong>{len}</strong>
          </label>
          <input type="range" min={128} max={1024} step={64} value={len}
                 onChange={(e) => setLen(parseInt(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
            <span>测试位置</span><strong>{testPos}</strong>
          </label>
          <input type="range" min={100} max={1200} step={50} value={testPos}
                 onChange={(e) => setTestPos(parseInt(e.target.value))} style={{ width: '100%' }} />
        </div>
      </div>

      <div style={{ marginTop: '10px', fontSize: '0.76rem', lineHeight: 1.6, color: '#475569', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px' }}>
        <b>为什么「能算出来」不等于「有效」</b>：正弦编码在数学上可以算位置 10000，
        但如果训练时最长只见过 512，模型从未学过「位置 10000 附近应该怎么关注」。
        这就是为什么单纯换位置编码不够，<b>长上下文必须配套继续训练</b>。
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 *  4. RoPE 旋转
 * ──────────────────────────────────────────────────────────── */

export function RopeRotationDemo() {
  const [theta, setTheta] = useState(30); // 旋转角度（每步）
  const [posI, setPosI] = useState(3); // 位置 i
  const [posJ, setPosJ] = useState(7); // 位置 j

  // RoPE：对位置 m 的向量旋转 m·θ
  const rad = (d: number) => (d * Math.PI) / 180;
  const angI = posI * theta;
  const angJ = posJ * theta;

  // 单位向量旋转后的结果
  const rot = (a: number): [number, number] => [Math.cos(rad(a)), Math.sin(rad(a))];
  const [ix, iy] = rot(angI);
  const [jx, jy] = rot(angJ);

  // 内积：cos(angI − angJ) = cos((i−j)θ) —— 只依赖相对距离
  const dot = ix * jx + iy * jy;
  const expected = Math.cos(rad(angI - angJ));
  const relDist = posJ - posI;

  const OX = 190;
  const OY = 165;
  const S = 90;
  const px = (x: number) => OX + x * S;
  const py = (y: number) => OY - y * S;

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '880px', margin: '1.5rem auto' }}>
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
          🌀 RoPE 旋转位置编码：为什么内积只依赖相对距离
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
          RoPE 把位置 m 的向量旋转 m·θ 角度。两个位置的内积 = cos((i−j)θ)，
          <b>只和「距离」有关，与「绝对位置」无关</b>——这是它支持长文本外推的数学基础。
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '16px', alignItems: 'start' }}>
        <svg viewBox="0 0 380 340" style={{ width: '100%', background: '#fbfcff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <line x1={12} y1={OY} x2={368} y2={OY} stroke="#e2e8f0" />
          <line x1={OX} y1={12} x2={OX} y2={328} stroke="#e2e8f0" />
          {/* 单位圆 */}
          <circle cx={px(0)} cy={py(0)} r={S} fill="none" stroke="#e2e8f0" strokeDasharray="3,3" />

          {/* 位置 i 的向量 */}
          <line x1={px(0)} y1={py(0)} x2={px(ix)} y2={py(iy)} stroke="#2f6bff" strokeWidth={2.6} />
          <circle cx={px(ix)} cy={py(iy)} r={5} fill="#2f6bff" />
          <text x={px(ix * 1.12)} y={py(iy * 1.12)} fontSize={10} fill="#1d4ed8" fontWeight={700}>
            位置 {posI}
          </text>

          {/* 位置 j 的向量 */}
          <line x1={px(0)} y1={py(0)} x2={px(jx)} y2={py(jy)} stroke="#f59e0b" strokeWidth={2.6} />
          <circle cx={px(jx)} cy={py(jy)} r={5} fill="#f59e0b" />
          <text x={px(jx * 1.12)} y={py(jy * 1.12)} fontSize={10} fill="#b45309" fontWeight={700}>
            位置 {posJ}
          </text>

          {/* 夹角弧线 */}
          <path d={`M ${px(0.28 * Math.cos(rad(angI)))},${py(0.28 * Math.sin(rad(angI)))}
                     A ${0.28 * S},${0.28 * S} 0 ${angJ - angI > 180 ? 1 : 0},0
                     ${px(0.28 * Math.cos(rad(angJ)))},${py(0.28 * Math.sin(rad(angJ)))}`}
                fill="none" stroke="#7c5cff" strokeWidth={1.6} />
          <text x={px(0.42 * Math.cos(rad((angI + angJ) / 2)))}
                y={py(0.42 * Math.sin(rad((angI + angJ) / 2)))}
                fontSize={9} fill="#6d28d9" textAnchor="middle" fontWeight={700}>
            Δ={(posJ - posI) * theta}°
          </text>
        </svg>

        <div>
          <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px', fontSize: '0.75rem', lineHeight: 1.9 }}>
            <div style={{ color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>旋转公式</div>
            <div style={{ fontFamily: 'ui-monospace, monospace' }}>
              q' = R(mθ)·q<br />
              k' = R(nθ)·k
            </div>
          </div>

          <div style={{ background: '#ecfdf5', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '2px' }}>
              内积 ⟨q', k'⟩
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#047857' }}>
              {dot.toFixed(4)}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#10b981', marginTop: '3px' }}>
              = cos((i−j)θ) = cos({relDist}×{theta}°) = {expected.toFixed(4)}
            </div>
          </div>

          <div style={{ background: '#eff6ff', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px', fontSize: '0.74rem', lineHeight: 1.8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>相对距离 i−j</span><strong>{relDist}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>夹角差</span>
              <strong>{(relDist * theta).toFixed(0)}°</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>是否只依赖距离</span>
              <strong style={{ color: '#047857' }}>✅ 是</strong>
            </div>
          </div>

          <div style={{ fontSize: '0.73rem', lineHeight: 1.6, color: '#475569', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
            <b>试试把两个位置同时平移</b>（拖动让 i、j 各加同样多）：内积不变。
            这就是「相对位置」的严格含义——只有相对距离影响注意力分数。
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
        {[
          ['每步旋转 θ', theta, setTheta, 5, 90, 1],
          ['位置 i', posI, setPosI, 0, 20, 1],
          ['位置 j', posJ, setPosJ, 0, 20, 1],
        ].map(([label, val, setter, min, max, step], i) => (
          <div key={i}>
            <label style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
              <span>{label as string}</span><strong>{val as number}</strong>
            </label>
            <input type="range" min={min as number} max={max as number} step={step as number}
                   value={val as number}
                   onChange={(e) => (setter as (v: number) => void)(parseFloat(e.target.value))}
                   style={{ width: '100%' }} />
          </div>
        ))}
      </div>

      <div style={{ marginTop: '10px', fontSize: '0.76rem', lineHeight: 1.6, color: '#475569', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px' }}>
        <b>RoPE 的三个好处</b>：① 无额外参数（只做旋转）；② 不改变向量范数（||q'|| = ||q||，保长度）；
        ③ 天然内建相对位置性质。<b>长文本外推的常用手法</b>：调大基频 θ（把 10000 提到 1e6）、
        位置插值（把位置按比例压缩到训练范围内）、NTK-aware 缩放、YaRN——都是在「不重训」的前提下
        让模型「以为」位置还在训练范围内。
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 *  5. 困惑度与解码策略
 * ──────────────────────────────────────────────────────────── */

export function PplDecodeDemo() {
  const [temp, setTemp] = useState(1.0);
  const [topP, setTopP] = useState(0.9);
  const [topK, setTopK] = useState(0); // 0 = 关闭

  // 一个词表上的人工 logits（模拟模型输出）
  const logits = [2.4, 1.9, 1.5, 1.1, 0.8, 0.4, 0.1, -0.3, -0.8, -1.4];
  const words = ['the', 'a', 'this', 'that', 'his', 'her', 'one', 'some', 'any', 'none'];

  // 温度缩放
  const scaled = logits.map((l) => l / Math.max(0.05, temp));
  // softmax
  const maxS = Math.max(...scaled);
  const exps = scaled.map((s) => Math.exp(s - maxS));
  const sumExp = exps.reduce((a, b) => a + b, 0);
  let probs = exps.map((e) => e / sumExp);

  // top-k 截断
  if (topK > 0) {
    const idx = probs.map((p, i) => ({ p, i })).sort((a, b) => b.p - a.p);
    const keep = new Set(idx.slice(0, topK).map((x) => x.i));
    probs = probs.map((p, i) => (keep.has(i) ? p : 0));
    const s2 = probs.reduce((a, b) => a + b, 0);
    probs = probs.map((p) => p / s2);
  }
  // top-p（核采样）截断
  const sortedIdx = probs.map((p, i) => ({ p, i })).sort((a, b) => b.p - a.p);
  let cum = 0;
  const keepP = new Set<number>();
  for (const { p, i } of sortedIdx) {
    if (cum >= topP) break;
    keepP.add(i);
    cum += p;
  }
  probs = probs.map((p, i) => (keepP.has(i) ? p : 0));
  const s3 = probs.reduce((a, b) => a + b, 0);
  probs = probs.map((p) => p / s3);

  // 困惑度 PPL = exp(cross-entropy)。这里演示「均匀分布下 PPL = 词表大小」
  const vocabSize = words.length;
  // 当前分布的有效候选数（perplexity）
  const entropy = -probs.reduce((s, p) => (p > 0 ? s + p * Math.log(p) : s), 0);
  const ppl = Math.exp(entropy);
  const activeCount = probs.filter((p) => p > 1e-9).length;

  const W = 380;
  const maxP = Math.max(...probs, 0.01);

  return (
    <div className="quant-diagram-card" style={{ maxWidth: '880px', margin: '1.5rem auto' }}>
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #0f172a)' }}>
          🎲 解码采样：温度、top-k、top-p 如何改变分布
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
          同一组 logits，三种旋钮产生截然不同的候选分布。
          <b>困惑度（PPL）</b>在这里的含义是「平均有多少个等概率候选」——温度越高、截断越松，PPL 越大。
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 250px', gap: '16px', alignItems: 'start' }}>
        <div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>
            每个候选词的概率
          </div>
          <svg viewBox={`0 0 ${W} ${words.length * 26 + 20}`} style={{ width: '100%', background: '#fbfcff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            {probs.map((p, i) => {
              const bw = (p / maxP) * (W - 120);
              const active = p > 1e-9;
              return (
                <g key={`pd${i}`}>
                  <text x={8} y={i * 26 + 20} fontSize={10} fill="#475569" fontFamily="ui-monospace, monospace">
                    {words[i]}
                  </text>
                  <rect x={54} y={i * 26 + 10} width={Math.max(active ? 1.5 : 0, bw)} height={14} rx={2}
                        fill={active ? (i === 0 ? '#2f6bff' : '#93c5fd') : '#f1f5f9'} />
                  <text x={Math.max(58 + bw, 62)} y={i * 26 + 21} fontSize={9}
                        fill={active ? '#334155' : '#cbd5e1'} fontFamily="ui-monospace, monospace">
                    {(p * 100).toFixed(1)}%
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div>
          <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px', fontSize: '0.75rem', lineHeight: 1.9 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>有效候选数</span><strong>{activeCount} / {vocabSize}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>困惑度 PPL</span>
              <strong style={{ color: ppl > 6 ? '#dc2626' : '#047857' }}>{ppl.toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>最大概率</span><strong>{(Math.max(...probs) * 100).toFixed(1)}%</strong>
            </div>
          </div>

          <div style={{ background: ppl > 6 ? '#fef2f2' : '#ecfdf5', padding: '10px 12px', borderRadius: '8px', marginBottom: '10px' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '3px' }}>生成质量预测</div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: ppl > 6 ? '#dc2626' : '#047857' }}>
              {temp < 0.4 ? '🥶 过于确定（可能重复）' : ppl > 6 ? '🔥 过于随机（可能跑题）' : '✅ 平衡'}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px', lineHeight: 1.5 }}>
              PPL 可理解为「平均从几个词里随机选」
            </div>
          </div>

          <div style={{ fontSize: '0.73rem', lineHeight: 1.6, color: '#475569', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
            <b>PPL 的严格定义</b>：PPL = exp(−(1/N)Σ log P(wᵢ))。
            均匀分布时 PPL = 词表大小；完美模型 PPL = 1。
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
        <div>
          <label style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
            <span>温度 T</span><strong>{temp.toFixed(2)}</strong>
          </label>
          <input type="range" min={0.1} max={2} step={0.05} value={temp}
                 onChange={(e) => setTemp(parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
            <span>top-k（0 = 关闭）</span><strong>{topK || '关'}</strong>
          </label>
          <input type="range" min={0} max={10} step={1} value={topK}
                 onChange={(e) => setTopK(parseInt(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
            <span>top-p（核采样）</span><strong>{topP.toFixed(2)}</strong>
          </label>
          <input type="range" min={0.1} max={1} step={0.05} value={topP}
                 onChange={(e) => setTopP(parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
      </div>

      <div style={{ marginTop: '10px', fontSize: '0.76rem', lineHeight: 1.6, color: '#475569', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px' }}>
        <b>三种旋钮的区别</b>：<b>温度</b>改的是分布的「平坦度」（所有词一起变）；
        <b>top-k</b> 固定保留前 k 个（不管概率大小）；<b>top-p</b> 保留累积概率达到 p 的最小集合
        （更自适应——分布尖锐时保留少、平坦时保留多）。
        推理任务常用 T=0（贪心）或极低温度，就是为了避免格式崩坏。
      </div>
    </div>
  );
}
