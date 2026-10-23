/**
 * 大模型课程专用图示组件（SVG + CSS，零依赖）
 */

import { useState } from 'react';
import './diagrams.css';

/* ══════════════════════════════════════════════
   1. RAG 完整链路
   ══════════════════════════════════════════════ */

const RAG_STEPS = [
  { name: '① 文档切分', desc: '把长文档切成 200~500 token 的块（chunk）', color: '#94a3b8' },
  { name: '② 向量化', desc: '用 embedding 模型把每个 chunk 编码成向量', color: '#0891b2' },
  { name: '③ 索引存储', desc: '存入向量数据库（FAISS/Milvus/pgvector）', color: '#2f6bff' },
  { name: '④ 检索', desc: '用户问题向量化，找出最相似的 top-k chunk', color: '#7c5cff' },
  { name: '⑤ 增强', desc: '把检索结果拼进 prompt 的上下文', color: '#f59e0b' },
  { name: '⑥ 生成', desc: 'LLM 基于上下文生成答案', color: '#22c55e' },
];

export function RAGPipelineDemo() {
  const [step, setStep] = useState(0);
  const cur = RAG_STEPS[step];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">RAG 的完整链路：从文档到答案</figcaption>

      <div className="rag-flow">
        {RAG_STEPS.map((s, i) => (
          <div
            key={i}
            className={`rag-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
            style={{ '--rag-color': s.color } as React.CSSProperties}
            onClick={() => setStep(i)}
          >
            <span className="rag-num">{i + 1}</span>
            <span className="rag-name">{s.name}</span>
          </div>
        ))}
      </div>

      <div className="rag-detail" style={{ borderColor: cur.color }}>
        <b style={{ color: cur.color }}>{cur.name}</b>
        <br />
        {cur.desc}
      </div>

      <div className="rag-split">
        <div className="rag-phase offline">
          <div className="rag-phase-label">离线阶段</div>
          <div className="rag-phase-items">①②③ 建索引</div>
        </div>
        <div className="rag-phase online">
          <div className="rag-phase-label">在线阶段</div>
          <div className="rag-phase-items">④⑤⑥ 检索+生成</div>
        </div>
      </div>

      <div className="rag-note">
        <b>核心价值</b>：让 LLM 能回答"训练数据里没有"的问题。
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          代价：增加延迟（检索 + 更长 prompt）、可能引入噪声、需要维护索引
        </span>
      </div>

      <div className="diagram-caption">
        <b>关键洞察</b>：RAG 不是"让模型记住"，而是"每次现查"。
        它把"知识"从参数里移到了外部数据库。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   2. 文档切分策略
   ══════════════════════════════════════════════ */

const CHUNK_STRATEGIES = [
  { name: '固定长度', size: 512, overlap: 0, color: '#94a3b8', desc: '每 512 token 一刀切，最简单但会切断句子' },
  { name: '滑动窗口', size: 512, overlap: 128, color: '#2f6bff', desc: '块之间重叠 128 token，保留边界上下文' },
  { name: '语义切分', size: 0, overlap: 0, color: '#22c55e', desc: '按段落/标题/句子边界切，保持语义完整' },
];

export function ChunkingDemo() {
  const [sel, setSel] = useState(1);
  const cur = CHUNK_STRATEGIES[sel];

  // 模拟文本切分
  const text = 'Transformer 是一种基于自注意力的架构。它抛弃了循环结构，可以并行处理整个序列。多头注意力让模型同时关注不同的子空间。位置编码提供顺序信息。';
  const chars = text.split('');

  const chunks: number[][] = [];
  if (sel === 0) {
    for (let i = 0; i < chars.length; i += 20) chunks.push([i, Math.min(i + 20, chars.length)]);
  } else if (sel === 1) {
    for (let i = 0; i < chars.length; i += 14) chunks.push([i, Math.min(i + 20, chars.length)]);
  } else {
    // 按句号切
    let start = 0;
    for (let i = 0; i < chars.length; i++) {
      if (chars[i] === '。') {
        chunks.push([start, i + 1]);
        start = i + 1;
      }
    }
    if (start < chars.length) chunks.push([start, chars.length]);
  }

  const inChunk = (idx: number) => chunks.some(([s, e]) => idx >= s && idx < e);

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">文档切分：RAG 最被低估的一步</figcaption>

      <div className="pattern-tabs">
        {CHUNK_STRATEGIES.map((c, i) => (
          <button
            key={i}
            type="button"
            className={`pattern-tab ${i === sel ? 'active' : ''}`}
            style={{ '--tab-color': c.color } as React.CSSProperties}
            onClick={() => setSel(i)}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="chunk-viz">
        {chunks.map(([s, e], i) => (
          <div key={i} className="chunk-block" style={{ borderColor: cur.color }}>
            <div className="chunk-idx">chunk {i + 1}</div>
            <div className="chunk-text">{chars.slice(s, e).join('')}</div>
          </div>
        ))}
      </div>

      <div className="chunk-stats">
        <span>块数：<b>{chunks.length}</b></span>
        <span>块大小：<b>{sel === 2 ? '按句' : sel === 1 ? '20（重叠 6）' : '20'}</b></span>
        <span>重叠：<b>{sel === 1 ? '有' : '无'}</b></span>
      </div>

      <div className="chunk-note" style={{ borderColor: cur.color }}>
        <b>{cur.name}</b>：{cur.desc}
        <br />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          {sel === 0 && '问题：切断的句子无法回答完整语义'}
          {sel === 1 && '权衡：重叠越多，索引越大，但检索召回更好'}
          {sel === 2 && '最优：但实现复杂，需要 NLP 工具'}
        </span>
      </div>

      <div className="diagram-caption">
        <b>经验法则</b>：chunk 200~500 token，overlap 10~20%。
        太小丢失上下文，太大引入噪声。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   3. 检索方式对比
   ══════════════════════════════════════════════ */

const RETRIEVAL_METHODS = [
  {
    name: '向量检索',
    color: '#2f6bff',
    strengths: ['语义相似（同义词、改写）', '跨语言', '无需分词'],
    weaknesses: ['精确匹配弱', '需要 embedding 模型', '数值 ID 不敏感'],
    use: '语义问答',
  },
  {
    name: 'BM25（关键词）',
    color: '#f59e0b',
    strengths: ['精确匹配强', '数值/专有名词', '无需训练'],
    weaknesses: ['同义词弱', '需要分词', '语义理解弱'],
    use: '精确查询',
  },
  {
    name: '混合检索',
    color: '#22c55e',
    strengths: ['两者优点结合', 'RRF 融合排序', '鲁棒性强'],
    weaknesses: ['实现复杂', '需要调权重', '延迟更高'],
    use: '生产环境',
  },
];

export function RetrievalCompareDemo() {
  const [sel, setSel] = useState(2);
  const cur = RETRIEVAL_METHODS[sel];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">三种检索方式：向量 / BM25 / 混合</figcaption>

      <div className="ret-tabs">
        {RETRIEVAL_METHODS.map((m, i) => (
          <button
            key={i}
            type="button"
            className={`ret-tab ${i === sel ? 'active' : ''}`}
            style={{ '--ret-color': m.color } as React.CSSProperties}
            onClick={() => setSel(i)}
          >
            {m.name}
          </button>
        ))}
      </div>

      <div className="ret-panels">
        <div className="ret-panel good">
          <div className="ret-panel-title">优势</div>
          {cur.strengths.map((s, i) => (
            <div key={i} className="ret-item">
              <span style={{ color: '#22c55e' }}>✓</span> {s}
            </div>
          ))}
        </div>
        <div className="ret-panel bad">
          <div className="ret-panel-title">劣势</div>
          {cur.weaknesses.map((s, i) => (
            <div key={i} className="ret-item">
              <span style={{ color: '#ef4444' }}>✗</span> {s}
            </div>
          ))}
        </div>
      </div>

      <div className="ret-use" style={{ borderColor: cur.color }}>
        <b>适用场景</b>：{cur.use}
      </div>

      <div className="ret-formula">
        <code>RRF(d) = Σ 1/(k + rank_i(d))，k=60</code>
      </div>

      <div className="diagram-caption">
        <b>混合检索是生产标配</b>：向量检索保语义，BM25 保精确，
        RRF 融合两个排序列表。单用一种总有盲区。
      </div>
    </figure>
  );
}
