/**
 * XQuant 入门课（量化第 0 站）专用交互图示组件
 *
 * 8 个原创图示，全部由 SVG + 内联样式构成，零图形依赖，可在深浅色页面内直接渲染：
 *   1. SpecFourDemo    —— spec 四段骨架（上下文/任务描述/任务要求/验收标准），点选看「好例子 vs 坏例子」
 *   2. DoJudgeDemo     —— 做/看/疑 三环节循环 × 四阶段（确定候选/制定规则/执行交易/评估归因）条带
 *   3. ParamSawDemo    —— 参数扫描曲线对照：锯齿型 vs 山峰/高原型，滑杆调「相邻参数差异」
 *   4. IsoosDemo       —— 样本内 vs 样本外散点（全部落在 y=x 下方），滑杆调「参数组合数」
 *   5. CostStepsDemo   —— 四层成本台阶：无成本 → +佣金 → +印花税 → +滑点
 *   6. ExecSlipDemo    —— 执行滑点直方图（右尾很长）+ 分标的箱线图，「均值视角 / 尾部视角」
 *   7. Monitor3Demo    —— 净值 / 滚动夏普 / 相对基准 三仪表共用时间轴，可拖时间游标
 *   8. IcWaveDemo      —— 因子 IC 柱状图 + 60 日滚动均值，可切「全部 / 高波动 / 低波动」
 *
 * 数据口径（重要）：
 *   - 所有数值均为**内联写死的合成/示意数据，用于教学对照，非真实行情**。
 *   - 不 fetch、不 import 外部数据、不使用随机数：每次渲染结果完全一致，方便课上逐帧对照。
 *   - 量级参考了公开教学案例的真实结论（例如 IS 夏普 1.2 → OOS 0.2 的衰减、
 *     IC 均值 −0.02 ~ +0.02、四层成本侵蚀约 5.7 个百分点），但具体点位为示意值。
 *
 * 交互一律为「点击 / 拖拽 / 滑杆」，不使用定时器，避免打断课堂讲解节奏。
 */

import { useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import './diagrams.css';

/* ────────────────────────── 共用常量与工具 ────────────────────────── */

/** 统一 SVG 视口：640×300，宽度 100%、高度自适应（响应式要求） */
const X_SVG: CSSProperties = { width: '100%', height: 'auto', display: 'block' };

/** 语义色：正向 / 负向 / 警示 / 主色 */
const C = {
  pos: '#16a34a',
  neg: '#dc2626',
  warn: '#f59e0b',
  main: '#10b981',
  blue: '#2f6bff',
  purple: '#7c5cff',
  cyan: '#0891b2',
  ink: '#0f172a',
  sub: '#64748b',
  faint: '#94a3b8',
  line: '#cbd5e1',
  grid: '#eef2f7',
  panel: '#f8fafc',
} as const;

const MONO = 'var(--font-mono, ui-monospace, SFMono-Regular, monospace)';

/** 说明卡（颜色随选中项变化） */
const noteCard = (color: string): CSSProperties => ({
  marginTop: 10,
  padding: '10px 14px',
  borderRadius: 10,
  border: `1px solid ${color}55`,
  background: `${color}0f`,
  fontSize: 12.5,
  lineHeight: 1.75,
});

/** 折线路径（点集 → SVG path d） */
const linePath = (pts: Array<{ x: number; y: number }>): string =>
  pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

/** 数值夹取 */
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/**
 * 两位小数格式化：把「负零」收敛成 0.00。
 * 合成数据里滑点均值的浮点结果可能落在 −1e-17，直接 toFixed 会显示成刺眼的 "-0.00%"。
 */
const fmt2 = (v: number): string => (Math.abs(v) < 0.005 ? '0.00' : v.toFixed(2));

/** 线性比例尺 */
const scaleOf = (d0: number, d1: number, r0: number, r1: number) => (v: number) =>
  r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

/* ══════════════════════════════════════════════════════════════
   1. spec 四段骨架：点选任意一段，右侧对照「好例子 / 坏例子」
   ══════════════════════════════════════════════════════════════ */

type SpecSegment = {
  key: string;
  name: string;
  en: string;
  color: string;
  /** 这一段到底在回答什么问题 */
  role: string;
  /** 好例子：可直接抄的写法 */
  good: string;
  /** 坏例子：具体、常见、能一眼看出问题 */
  bad: string;
  /** 坏在哪：为什么 AI 会因此敷衍 */
  badWhy: string;
};

const SPEC_SEGMENTS: SpecSegment[] = [
  {
    key: 'context',
    name: '上下文',
    en: 'Context',
    color: C.cyan,
    role: '交代「在什么世界里干活」：标的池、数据区间、资金量、交易约束。',
    good:
      '标的池：沪深300ETF / 纳指100ETF / 黄金ETF；数据 2015-01-01 ~ 2025-12-31 日频前复权；初始资金 10 万元人民币；只做多、不加杠杆、不做空。',
    bad: '用 ETF 数据做个策略看看。',
    badWhy: '没给标的池和数据区间，AI 只能自己猜。猜出来的结果你既无法判断对错，也无法复现——下一轮对话它可能换一套猜测。',
  },
  {
    key: 'task',
    name: '任务描述',
    en: 'Task',
    color: C.blue,
    role: '说清「要产出什么」：输入、输出、粒度、字段、文件名。',
    good:
      '写一个回测函数：每月最后一个交易日按 20 日动量排名取前 2 名等权持有，次日开盘调仓；返回日频净值序列与成交明细表（日期 / 代码 / 股数 / 成交价）。',
    bad: '帮我写个能赚钱的量化策略。',
    badWhy: '「能赚钱」不是可交付物：产出可能是代码、可能是一张曲线、可能是一段解释。验收时你连「交没交」都说不清。',
  },
  {
    key: 'require',
    name: '任务要求',
    en: 'Constraints',
    color: C.warn,
    role: '写明「不许做什么」与「必须满足什么」：工具、性能、可复现、边界条件。',
    good:
      '只用 pandas / numpy；禁止未来函数（信号必须 shift(1) 后再成交）；权重和恒为 1；单次回测 < 5 秒；随机过程固定种子；不读写本机以外的路径。',
    bad: '代码写好看点、高效点，尽量专业。',
    badWhy: '「好看」「高效」「专业」没有度量单位，AI 交任何东西都能自称满足。约束不量化，等于没约束。',
  },
  {
    key: 'accept',
    name: '验收标准',
    en: 'Acceptance',
    color: C.pos,
    role: '写成「可以判真假的句子」，每一条都能用一行代码或一眼核对通过与否。',
    good:
      'AC1 净值序列覆盖 2015-01-01 起全部交易日（2610 行）；AC2 成交表 ≥ 180 笔且每笔含日期 / 代码 / 股数 / 成交价；AC3 断言 |Σ权重 − 1| < 1e-6 通过；AC4 输出「策略 / 基准 / 超额」三行指标表；AC5 同一输入跑两遍结果逐行相同。',
    bad: '画一张图，让我看看效果。',
    badWhy: '「一张图」既没规定内容也没规定范围：AI 随手画一条漂亮曲线就算交差，你没法指着它说「这条验收没过」。',
  },
];

export function SpecFourDemo() {
  const [sel, setSel] = useState(3); // 默认停在「验收标准」——它是四段的落点
  const cur = SPEC_SEGMENTS[sel];

  return (
    <figure className="diagram-block interactive">
      <figcaption className="diagram-title">
        spec 四段骨架：点一段，看「好例子 vs 坏例子」
        <span className="interactive-badge">可交互</span>
      </figcaption>

      <div className="diagram-desc">
        给 AI 派活时，spec 只写四段就够：<b>上下文</b>（在哪干活）、<b>任务描述</b>（交什么）、
        <b>任务要求</b>（什么不许做）、<b>验收标准</b>（怎么算过）。点击左侧任意一段，看它写成什么样会出事。
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'stretch' }}>
        {/* 左：四段骨架（竖排，像一张表的四行） */}
        <div style={{ flex: '1 1 170px', minWidth: 168, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {SPEC_SEGMENTS.map((s, i) => {
            const active = i === sel;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSel(i)}
                aria-pressed={active}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: `1.5px solid ${active ? s.color : '#dbe3ef'}`,
                  background: active ? `${s.color}12` : '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.22s ease',
                  transform: active ? 'translateX(4px)' : 'none',
                  boxShadow: active ? `0 2px 10px ${s.color}26` : 'none',
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    background: active ? s.color : `${s.color}22`,
                    color: active ? '#fff' : s.color,
                    fontSize: 11,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: active ? s.color : '#334155' }}>{s.name}</span>
                  <span style={{ fontSize: 10.5, color: C.faint, fontFamily: MONO }}>{s.en}</span>
                </span>
              </button>
            );
          })}

          <div
            style={{
              marginTop: 2,
              padding: '8px 11px',
              borderRadius: 9,
              background: C.panel,
              border: '1px dashed #dbe3ef',
              fontSize: 11.5,
              color: C.sub,
              lineHeight: 1.6,
            }}
          >
            四段齐全 ≠ 四段合格。
            <br />
            只有第 4 段能写成「判真假」的句子，前 3 段才有意义。
          </div>
        </div>

        {/* 右：好例子 / 坏例子 对照 */}
        <div style={{ flex: '2 1 340px', minWidth: 280, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ ...noteCard(cur.color), marginTop: 0 }}>
            <b style={{ color: cur.color }}>
              {cur.name}（{cur.en}）
            </b>
            <div style={{ color: '#334155' }}>{cur.role}</div>
          </div>

          <div
            style={{
              padding: '10px 13px',
              borderRadius: 10,
              border: `1px solid ${C.pos}55`,
              background: `${C.pos}0a`,
            }}
          >
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.pos, marginBottom: 4 }}>✓ 好例子（可执行、可复现）</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.72, color: '#1e293b', fontFamily: MONO }}>{cur.good}</div>
          </div>

          <div
            style={{
              padding: '10px 13px',
              borderRadius: 10,
              border: `1px solid ${C.neg}55`,
              background: `${C.neg}0a`,
            }}
          >
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.neg, marginBottom: 4 }}>✗ 坏例子（AI 一定会敷衍）</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.72, color: '#1e293b', fontFamily: MONO }}>「{cur.bad}」</div>
            <div style={{ fontSize: 12, lineHeight: 1.65, color: C.sub, marginTop: 6, borderTop: `1px dashed ${C.neg}33`, paddingTop: 6 }}>
              坏在哪：{cur.badWhy}
            </div>
          </div>
        </div>
      </div>

      <div className="diagram-caption">
        <b>能验收的标准才能约束 AI。</b>
        上下文、任务、要求写得再漂亮，只要验收标准还停在「画一张图让我看看」，
        AI 就有无穷多种「已完成」可以交给你——你剩下的只有争论，没有核对。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════════════════════
   2. 做 / 看 / 疑 三环节循环 + 四阶段条带
   ══════════════════════════════════════════════════════════════ */

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

/** 从 a1 顺时针画到 a2 的圆弧（环形箭头） */
const arcPath = (cx: number, cy: number, r: number, a1: number, a2: number) => {
  const p1 = polar(cx, cy, r, a1);
  const p2 = polar(cx, cy, r, a2);
  return `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${r} ${r} 0 0 1 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
};

type LoopStage = {
  key: string;
  name: string;
  en: string;
  color: string;
  angle: number;
  question: string;
  /** 这一环节最典型的失败模式 */
  failures: Array<{ title: string; detail: string }>;
  /** 自查一句 */
  check: string;
};

const DO_JUDGE_STEPS: LoopStage[] = [
  {
    key: 'do',
    name: '做',
    en: 'Do',
    color: C.blue,
    angle: -90,
    question: '把想法写成可以跑的规则与代码——这一步决定后面所有数字有意义没意义。',
    failures: [
      { title: '规则写不清', detail: '「跌多了就买」没有阈值、没有窗口、没有标的范围。同样的描述，两个人写出两套完全不同的代码。' },
      { title: '规则无法执行', detail: '用了未来数据（当日收盘信号当日成交）、要求当天全部成交、需要买不存在的标的——回测能跑，实盘跑不了。' },
      { title: '口径偷偷换', detail: '问「动量窗口」时今天用 20 日、明天换成 40 日，两次结果不可比，却当成同一实验在比较。' },
    ],
    check: '自查：把规则读给一个不懂量化的人，他能写出同一段代码吗？',
  },
  {
    key: 'look',
    name: '看',
    en: 'Look',
    color: C.warn,
    angle: 30,
    question: '看指标、看曲线、看分段——不是找「好看的数字」，而是找「不该出现的形状」。',
    failures: [
      { title: '只看收益不看风险', detail: '累计 +118% 很诱人，但最大回撤 −30%、恢复用了 14 个月，中途你很可能已经放弃策略。' },
      { title: '只看总分不看分段', detail: '全期夏普 1.17 掩盖了 2022 年那 6 段深水区：总分好看不代表任何一年都拿得住。' },
      { title: '只看策略不看基准', detail: '不自带基准的收益曲线毫无信息量——同期沪深300 +60% 时，你的 +40% 其实是跑输。' },
    ],
    check: '自查：这个数字背后，最坏的那一段长什么样？',
  },
  {
    key: 'doubt',
    name: '疑',
    en: 'Doubt',
    color: C.neg,
    angle: 150,
    question: '怀疑结论本身：这是规律，还是我在 490 组里挑出来的巧合？',
    failures: [
      { title: '把巧合当规律', detail: '扫了 490 组参数挑出样本内最优，样本外衰减 −1.02——那不是「找到了」，那是「挑中了」。' },
      { title: '只试一次就下结论', detail: '换一种数据切法（滚动 / 锚定 / 交叉验证）结论就翻转，说明原来的「稳定」只是切法的产物。' },
      { title: '事后改标准', detail: '看到结果不好，回头把阈值从 1.0 调到 0.8 让它「通过」。标准必须事前锁定，否则永远无法被推翻。' },
    ],
    check: '自查：如果我必须用这条结论去下真钱，我最怕哪一个反例？',
  },
];

/** 四阶段：每个阶段标注它与哪些环节强相关 */
const FOUR_STAGES = [
  { name: '确定候选', detail: '标的池：各国宽基 ETF / 黄金 / 商品', links: [0] },
  { name: '制定规则', detail: '权重与买卖：等权 / 风险平价 / 动量排名', links: [0] },
  { name: '执行交易', detail: '取整、成交价、成本层叠', links: [0, 1] },
  { name: '评估归因', detail: '基准、分段、回撤、IS/OOS、IC', links: [1, 2] },
];

export function DoJudgeDemo() {
  const [sel, setSel] = useState(0);
  const cur = DO_JUDGE_STEPS[sel];

  const cx = 138;
  const cy = 166;
  const R = 74;

  return (
    <figure className="diagram-block interactive">
      <figcaption className="diagram-title">
        学习地图：做 / 看 / 疑 的循环 × 四个阶段
        <span className="interactive-badge">可交互</span>
      </figcaption>

      <div className="diagram-desc">
        四阶段是「工作流」，做 / 看 / 疑 是「在每一阶段里反复转的三步」。
        点环上的任一环节，看它最常坏在哪。
      </div>

      <svg viewBox="0 0 640 300" style={X_SVG} role="img" aria-label="做看疑循环与四阶段">
        <defs>
          <marker id="xq-loop-arrow" markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill={C.line} />
          </marker>
        </defs>

        {/* 三段环形箭头 */}
        {DO_JUDGE_STEPS.map((s, i) => {
          const next = DO_JUDGE_STEPS[(i + 1) % DO_JUDGE_STEPS.length];
          let a2 = next.angle - 26;
          if (a2 <= s.angle + 26) a2 += 360;
          const active = i === sel;
          return (
            <path
              key={`arc-${s.key}`}
              d={arcPath(cx, cy, R, s.angle + 26, a2)}
              fill="none"
              stroke={active ? s.color : '#dbe3ef'}
              strokeWidth={active ? 2.6 : 1.8}
              markerEnd="url(#xq-loop-arrow)"
              style={{ transition: 'stroke 0.35s, stroke-width 0.35s' }}
            />
          );
        })}

        {/* 三个环节节点 */}
        {DO_JUDGE_STEPS.map((s, i) => {
          const p = polar(cx, cy, R, s.angle);
          const active = i === sel;
          return (
            <g
              key={s.key}
              onClick={() => setSel(i)}
              style={{ cursor: 'pointer' }}
              role="button"
              aria-label={`环节 ${s.name}`}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={active ? 33 : 28}
                fill={active ? s.color : `${s.color}16`}
                stroke={s.color}
                strokeWidth={active ? 2.6 : 1.5}
                style={{ transition: 'all 0.3s ease' }}
              />
              <text x={p.x} y={p.y - 1} textAnchor="middle" fontSize={14} fontWeight={700} fill={active ? '#fff' : s.color}>
                {s.name}
              </text>
              <text x={p.x} y={p.y + 14} textAnchor="middle" fontSize={10.5} fill={active ? '#ffffffcc' : C.faint}>
                {s.en}
              </text>
            </g>
          );
        })}

        {/* 中央：循环本体 */}
        <circle cx={cx} cy={cy} r={40} fill="#fff" stroke="#dbe3ef" strokeWidth={1.4} strokeDasharray="5 3" />
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize={13} fontWeight={700} fill={C.purple}>
          循环
        </text>
        <text x={cx} y={cy + 15} textAnchor="middle" fontSize={10.5} fill={C.faint}>
          每阶段都转一轮
        </text>

        {/* 右侧：四阶段条带 */}
        <text x={320} y={30} fontSize={12} fontWeight={700} fill={C.sub}>
          四个阶段（工作流）
        </text>
        {FOUR_STAGES.map((st, i) => {
          const y = 42 + i * 57;
          const hot = st.links.includes(sel);
          return (
            <g key={st.name}>
              <rect
                x={320}
                y={y}
                width={292}
                height={46}
                rx={9}
                fill={hot ? `${cur.color}12` : '#fff'}
                stroke={hot ? cur.color : '#e2e8f0'}
                strokeWidth={hot ? 1.8 : 1.2}
                style={{ transition: 'all 0.3s ease' }}
              />
              <rect x={320} y={y} width={4} height={46} rx={2} fill={hot ? cur.color : '#e2e8f0'} style={{ transition: 'all 0.3s' }} />
              <text x={334} y={y + 20} fontSize={12.5} fontWeight={700} fill={hot ? cur.color : '#475569'}>
                {i + 1}. {st.name}
              </text>
              <text x={334} y={y + 36} fontSize={10.5} fill={C.faint}>
                {st.detail}
              </text>
              {hot && (
                <text x={602} y={y + 20} textAnchor="end" fontSize={10} fontWeight={700} fill={cur.color}>
                  ● {cur.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div style={{ ...noteCard(cur.color), marginTop: 6 }}>
        <b style={{ color: cur.color }}>
          {cur.name}（{cur.en}）· {cur.question}
        </b>
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {cur.failures.map((f) => (
            <div
              key={f.title}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                background: '#fff',
                border: `1px solid ${cur.color}33`,
                fontSize: 12,
                lineHeight: 1.65,
                color: '#334155',
              }}
            >
              <b style={{ color: cur.color }}>✗ {f.title}</b>：{f.detail}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 7, fontSize: 12, color: C.sub }}>{cur.check}</div>
      </div>

      <div className="diagram-caption">
        三个环节里，<b>疑</b>最容易被跳过，却最值钱：
        做和看都能靠工具补齐，只有「这是规律还是巧合」必须由你自己问出来。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════════════════════
   3. 参数敏感性：锯齿型 vs 山峰 / 高原型
   ══════════════════════════════════════════════════════════════ */

/** 参数网格：动量窗口 5 → 62 日（20 个点，步长 3） */
const SAW_X_LABELS = ['5', '8', '11', '14', '17', '20', '23', '26', '29', '32', '35', '38', '41', '44', '47', '50', '53', '56', '59', '62'];

/** 锯齿型曲线「基线」：真实的参数扫描曲线整体平缓、略有下坡（示意值） */
const SAW_BASE = [0.95, 0.93, 0.9, 0.92, 0.88, 0.86, 0.89, 0.84, 0.82, 0.85, 0.8, 0.83, 0.79, 0.81, 0.77, 0.8, 0.76, 0.78, 0.74, 0.77];

/** 相邻两点的固定「跳动方向 + 强度」（写死的伪噪声，非随机数） */
const SAW_JITTER = [1.0, -0.85, -1.0, 0.9, -0.7, 1.0, -1.0, 0.75, -1.0, 0.95, -0.65, 1.0, -0.9, -1.0, 0.8, -1.0, 1.0, -0.7, 0.9, -1.0];

/**
 * 山峰 / 高原型曲线：教科书里想象的那种平滑单峰（示意值）。
 * 刻意把跨度设计成和「默认档位的锯齿曲线」几乎一样（≈0.77），
 * 这样两组数的对比才是公平的：**极差相近，平滑度差一个数量级**。
 */
const MOUNTAIN_CURVE = [0.5, 0.53, 0.57, 0.62, 0.68, 0.74, 0.81, 0.88, 0.95, 1.02, 1.09, 1.16, 1.22, 1.27, 1.25, 1.2, 1.12, 1.02, 0.9, 0.77];

export function ParamSawDemo() {
  const [jitterPct, setJitterPct] = useState(55); // 滑杆：相邻参数差异（%）
  // 振幅 0.03 → 0.48：即使拉到 0，曲线也是「缓坡 + 微跳」，不会变成一条假想的平滑山峰
  const amp = 0.03 + (jitterPct / 100) * 0.45;

  const saw = useMemo(() => SAW_BASE.map((b, i) => b + amp * SAW_JITTER[i]), [amp]);
  const sawRange = useMemo(() => Math.max(...saw) - Math.min(...saw), [saw]);
  const sawMaxJump = useMemo(() => {
    let m = 0;
    for (let i = 1; i < saw.length; i++) m = Math.max(m, Math.abs(saw[i] - saw[i - 1]));
    return m;
  }, [saw]);
  const sawBestIdx = useMemo(() => saw.reduce((bi, v, i) => (v > saw[bi] ? i : bi), 0), [saw]);
  const mountainRange = useMemo(() => Math.max(...MOUNTAIN_CURVE) - Math.min(...MOUNTAIN_CURVE), []);
  const mountainMaxJump = useMemo(() => {
    let m = 0;
    for (let i = 1; i < MOUNTAIN_CURVE.length; i++) m = Math.max(m, Math.abs(MOUNTAIN_CURVE[i] - MOUNTAIN_CURVE[i - 1]));
    return m;
  }, []);

  /* 绘图区与比例尺 */
  const X0 = 62;
  const X1 = 604;
  const Y0 = 44; // 顶部（值大）
  const Y1 = 236; // 底部（值小）
  const V_MIN = 0.2;
  const V_MAX = 1.45;
  const toX = (i: number) => X0 + (i / (SAW_X_LABELS.length - 1)) * (X1 - X0);
  const toY = scaleOf(V_MIN, V_MAX, Y1, Y0);

  const sawPts = saw.map((v, i) => ({ x: toX(i), y: toY(v) }));
  const mtnPts = MOUNTAIN_CURVE.map((v, i) => ({ x: toX(i), y: toY(v) }));

  return (
    <figure className="diagram-block interactive">
      <figcaption className="diagram-title">
        参数扫描曲线：真实的「锯齿」与想象的「山峰」
        <span className="interactive-badge">可交互</span>
      </figcaption>

      <div className="diagram-desc">
        横轴是同一个策略的<b>动量窗口</b>（5 → 62 日，步长 3），纵轴是简化夏普。
        拖滑杆改变「相邻参数的差异」——真实扫描的相邻点会剧烈跳动，所以你挑中的那个「最优」很可能只是碰巧。
      </div>

      <svg viewBox="0 0 640 300" style={X_SVG} role="img" aria-label="参数扫描曲线对比">
        {/* 网格与坐标轴 */}
        {[0.4, 0.8, 1.2].map((v) => (
          <g key={`grid-${v}`}>
            <line x1={X0} y1={toY(v)} x2={X1} y2={toY(v)} stroke={C.grid} strokeWidth={1.2} />
            <text x={X0 - 8} y={toY(v) + 4} textAnchor="end" fontSize={10.5} fill={C.faint} fontFamily={MONO}>
              {v.toFixed(1)}
            </text>
          </g>
        ))}
        <line x1={X0} y1={Y1} x2={X1} y2={Y1} stroke={C.line} strokeWidth={1.2} />
        <line x1={X0} y1={Y0} x2={X0} y2={Y1} stroke={C.line} strokeWidth={1.2} />
        <text x={X0 - 8} y={Y0 - 10} textAnchor="end" fontSize={10.5} fill={C.sub} fontWeight={700}>
          夏普
        </text>
        <text x={X1} y={Y1 + 30} textAnchor="end" fontSize={10.5} fill={C.sub}>
          动量窗口（交易日）
        </text>

        {/* 横轴刻度（每 3 个点标一次，避免拥挤） */}
        {SAW_X_LABELS.map((lb, i) =>
          i % 3 === 0 ? (
            <text key={`xl-${lb}`} x={toX(i)} y={Y1 + 15} textAnchor="middle" fontSize={10} fill={C.faint} fontFamily={MONO}>
              {lb}
            </text>
          ) : null,
        )}

        {/* 山峰 / 高原型（灰，作参照） */}
        <path d={linePath(mtnPts)} fill="none" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="5 3" />
        {mtnPts.map((p, i) => (
          <circle key={`m-${i}`} cx={p.x} cy={p.y} r={2.6} fill="#cbd5e1" />
        ))}

        {/* 锯齿型（主色） */}
        <path d={linePath(sawPts)} fill="none" stroke={C.main} strokeWidth={2.2} />
        {sawPts.map((p, i) => (
          <circle
            key={`s-${i}`}
            cx={p.x}
            cy={p.y}
            r={i === sawBestIdx ? 4.6 : 2.8}
            fill={i === sawBestIdx ? C.neg : C.main}
            stroke={i === sawBestIdx ? '#fff' : 'none'}
            strokeWidth={1.5}
          />
        ))}

        {/* 样本内最优标注 */}
        <line
          x1={sawPts[sawBestIdx].x}
          y1={sawPts[sawBestIdx].y}
          x2={sawPts[sawBestIdx].x}
          y2={Y1}
          stroke={C.neg}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <text
          x={clamp(sawPts[sawBestIdx].x + 8, X0, X1 - 130)}
          y={Math.max(sawPts[sawBestIdx].y - 10, Y0 + 10)}
          fontSize={11}
          fontWeight={700}
          fill={C.neg}
        >
          「最优」窗口 {SAW_X_LABELS[sawBestIdx]}
        </text>

        {/* 极差可视：右侧双向括号，标签写在括号顶端外侧（那里是折线碰不到的留白） */}
        <g>
          <line x1={X1 - 6} y1={toY(Math.max(...saw))} x2={X1 - 6} y2={toY(Math.min(...saw))} stroke={C.main} strokeWidth={1.4} />
          <line x1={X1 - 10} y1={toY(Math.max(...saw))} x2={X1 - 2} y2={toY(Math.max(...saw))} stroke={C.main} strokeWidth={1.4} />
          <line x1={X1 - 10} y1={toY(Math.min(...saw))} x2={X1 - 2} y2={toY(Math.min(...saw))} stroke={C.main} strokeWidth={1.4} />
          <text x={X1 - 10} y={toY(Math.max(...saw)) - 8} textAnchor="end" fontSize={10.5} fontWeight={700} fill={C.main}>
            极差 {sawRange.toFixed(2)}
          </text>
        </g>

        {/* 图例 */}
        <g>
          <line x1={X0 + 4} y1={Y0 - 12} x2={X0 + 26} y2={Y0 - 12} stroke={C.main} strokeWidth={2.4} />
          <text x={X0 + 32} y={Y0 - 8} fontSize={11} fill={C.sub}>
            锯齿型（真实扫描）
          </text>
          <line x1={X0 + 152} y1={Y0 - 12} x2={X0 + 174} y2={Y0 - 12} stroke="#cbd5e1" strokeWidth={2} strokeDasharray="5 3" />
          <text x={X0 + 180} y={Y0 - 8} fontSize={11} fill={C.faint}>
            山峰 / 高原型（教科书想象）
          </text>
        </g>
      </svg>

      <div className="slider-row" style={{ marginTop: 12, maxWidth: 460 }}>
        <div className="slider-label">
          相邻参数差异（越大越像真实扫描）
          <b>{jitterPct}%</b>
        </div>
        <input type="range" min={0} max={100} step={1} value={jitterPct} onChange={(e) => setJitterPct(Number(e.target.value))} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))',
          gap: 8,
          marginTop: 10,
        }}
      >
        {[
          { k: '锯齿型极差', v: sawRange.toFixed(2), color: C.main, t: '最高点 − 最低点' },
          { k: '锯齿型最大相邻跳变', v: sawMaxJump.toFixed(2), color: C.neg, t: '相邻两个窗口差多少' },
          { k: '山峰型极差', v: mountainRange.toFixed(2), color: C.faint, t: '整体才抬升这么多' },
          { k: '山峰型最大相邻跳变', v: mountainMaxJump.toFixed(2), color: C.faint, t: '平滑，几乎不跳' },
        ].map((s) => (
          <div
            key={s.k}
            style={{
              padding: '8px 11px',
              borderRadius: 9,
              background: '#fff',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontSize: 11, color: C.sub }}>{s.k}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: s.color, fontFamily: MONO, lineHeight: 1.3 }}>{s.v}</div>
            <div style={{ fontSize: 10, color: C.faint }}>{s.t}</div>
          </div>
        ))}
      </div>

      <div className="diagram-caption">
        真实的参数扫描曲线是<b>锯齿</b>，不是山峰：把窗口从 20 挪到 23，夏普就可能掉一大截。
        所以「样本内最优参数」往往只是那一格噪声恰好朝上——它旁边那一格没有任何优势，
        <b>样本外自然也就不灵</b>。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════════════════════
   4. 样本内 vs 样本外：点全在对角线下方
   ══════════════════════════════════════════════════════════════ */

/**
 * 12 组参数落点的样本内夏普（写死，均值 = 1.218 ≈ 1.22）。
 * 与 ISOOS_LEVELS 顶档（衰减 1.02）配合，正好复现教学口径：
 * **样本内 1.22 → 样本外 0.20，平均衰减 −1.02**。
 */
const ISOOS_IS = [0.88, 0.96, 1.02, 1.08, 1.14, 1.2, 1.26, 1.32, 1.38, 1.42, 1.46, 1.5];

/** 固定的横向抖动（决定「越试越散」的方向，非随机数） */
const ISOOS_JITTER = [-1, 0.6, -0.3, 1, -0.7, 0.2, 0.9, -0.4, 0.5, -0.9, 0.1, -0.2];

/** 参数组合数档位：试得越多，平均衰减越大、越分散 */
const ISOOS_LEVELS = [
  { k: 1, label: '1 组（没调参）', decay: 0.06, spread: 0.03, note: '只看一组参数时，样本外几乎不掉——因为没得挑。' },
  { k: 6, label: '6 组', decay: 0.28, spread: 0.08, note: '开始挑了：样本外比样本内低约 0.28。' },
  { k: 24, label: '24 组', decay: 0.55, spread: 0.13, note: '挑 24 组已经能挑出明显的「幸运儿」。' },
  { k: 120, label: '120 组', decay: 0.78, spread: 0.18, note: '衰减接近 1 个夏普点，样本外开始出现负值。' },
  { k: 490, label: '490 组（参数暴力扫描）', decay: 1.02, spread: 0.22, note: '样本内冠军 1.22 → 样本外 0.20，这就是「挑中了」的代价。' },
];

export function IsoosDemo() {
  const [lv, setLv] = useState(4);
  const cur = ISOOS_LEVELS[lv];

  const pts = useMemo(
    () =>
      ISOOS_IS.map((is, i) => ({
        is,
        oos: is - cur.decay + cur.spread * ISOOS_JITTER[i],
      })),
    [cur],
  );

  const meanIs = useMemo(() => pts.reduce((s, p) => s + p.is, 0) / pts.length, [pts]);
  const meanOos = useMemo(() => pts.reduce((s, p) => s + p.oos, 0) / pts.length, [pts]);
  const decayAvg = meanOos - meanIs;
  const negRatio = pts.filter((p) => p.oos < 0).length / pts.length;

  /* 散点区：IS 0.5~1.55 → px，OOS −1.0~1.55 → py（对角线因此是真正的 45° 等值线） */
  const PX0 = 66;
  const PX1 = 386;
  const PY0 = 46; // 顶部（OOS 大）
  const PY1 = 250; // 底部（OOS 小）
  const IS_MIN = 0.45;
  const IS_MAX = 1.55;
  const OOS_MIN = -1.0;
  const OOS_MAX = 1.55;
  const toPx = scaleOf(IS_MIN, IS_MAX, PX0, PX1);
  const toPy = scaleOf(OOS_MIN, OOS_MAX, PY1, PY0);

  /* 右侧衰减条：0 → −1.15 */
  const BX0 = 452;
  const BX1 = 606;
  const barX = scaleOf(0, 1.15, BX0, BX1);

  return (
    <figure className="diagram-block interactive">
      <figcaption className="diagram-title">
        样本内 vs 样本外：所有点都掉到 y = x 下方
        <span className="interactive-badge">可交互</span>
      </figcaption>

      <div className="diagram-desc">
        每个点是一组参数：横轴是它在<b>样本内</b>（调参用的那段数据）的夏普，纵轴是同一条规则在<b>样本外</b>的夏普。
        对角线意味着「一模一样好」——现实中点几乎全在线下。拖动滑杆增加试过的参数组合数，看它们怎样整体下坠、越摊越散。
      </div>

      <svg viewBox="0 0 640 300" style={X_SVG} role="img" aria-label="样本内外夏普散点">
        {/* 网格 */}
        {[0.5, 0.8, 1.1, 1.4].map((v) => (
          <line key={`gx-${v}`} x1={toPx(v)} y1={PY0} x2={toPx(v)} y2={PY1} stroke={C.grid} strokeWidth={1.2} />
        ))}
        {[-0.8, -0.4, 0, 0.4, 0.8, 1.2].map((v) => (
          <line key={`gy-${v}`} x1={PX0} y1={toPy(v)} x2={PX1} y2={toPy(v)} stroke={C.grid} strokeWidth={1.2} />
        ))}

        {/* 零线 */}
        <line x1={PX0} y1={toPy(0)} x2={PX1} y2={toPy(0)} stroke={C.neg} strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
        <text x={PX0 + 4} y={toPy(0) - 5} fontSize={9.5} fill={C.neg}>
          样本外 = 0
        </text>

        {/* 对角线 y = x */}
        <line x1={toPx(0.5)} y1={toPy(0.5)} x2={toPx(1.45)} y2={toPy(1.45)} stroke="#94a3b8" strokeWidth={1.4} strokeDasharray="6 4" />
        <text x={toPx(1.28)} y={toPy(1.34)} fontSize={10} fill="#64748b" textAnchor="end">
          y = x（一模一样好）
        </text>

        {/* 轴 */}
        <line x1={PX0} y1={PY1} x2={PX1} y2={PY1} stroke={C.line} strokeWidth={1.2} />
        <line x1={PX0} y1={PY0} x2={PX0} y2={PY1} stroke={C.line} strokeWidth={1.2} />
        <text x={(PX0 + PX1) / 2} y={PY1 + 26} textAnchor="middle" fontSize={11} fill={C.sub} fontWeight={700}>
          样本内夏普（调参用的数据）
        </text>
        <text x={PX0 - 10} y={PY0 + 2} textAnchor="end" fontSize={10.5} fill={C.sub} fontWeight={700}>
          样本外
        </text>

        {/* 点之间连细线：同一组参数的掉落 */}
        {pts.map((p, i) => (
          <line key={`ln-${i}`} x1={toPx(p.is)} y1={toPy(p.is)} x2={toPx(p.is)} y2={toPy(p.oos)} stroke={`${C.neg}33`} strokeWidth={1} />
        ))}

        {/* 散点 */}
        {pts.map((p, i) => (
          <circle key={`pt-${i}`} cx={toPx(p.is)} cy={toPy(p.oos)} r={4} fill={p.oos < 0 ? C.neg : C.blue} opacity={0.85}>
            <title>{`IS ${p.is.toFixed(2)} / OOS ${p.oos.toFixed(2)}`}</title>
          </circle>
        ))}

        {/* 均值点 */}
        <g>
          <circle cx={toPx(meanIs)} cy={toPy(meanIs)} r={5} fill="#fff" stroke="#94a3b8" strokeWidth={2} />
          <circle cx={toPx(meanIs)} cy={toPy(meanOos)} r={5} fill="#fff" stroke={C.neg} strokeWidth={2.2} />
          <line
            x1={toPx(meanIs)}
            y1={toPy(meanIs)}
            x2={toPx(meanIs)}
            y2={toPy(meanOos)}
            stroke={C.neg}
            strokeWidth={1.6}
            strokeDasharray="3 2"
          />
          <text x={toPx(meanIs) + 9} y={(toPy(meanIs) + toPy(meanOos)) / 2} fontSize={10.5} fontWeight={700} fill={C.neg}>
            均值衰减 {decayAvg.toFixed(2)}
          </text>
        </g>

        {/* 右侧：不同试法的平均衰减 */}
        <text x={BX0 - 22} y={38} fontSize={11.5} fontWeight={700} fill={C.sub}>
          试得越多，衰减越大
        </text>
        {ISOOS_LEVELS.map((l, i) => {
          const active = i === lv;
          const y = 52 + i * 38;
          return (
            <g key={l.k} onClick={() => setLv(i)} style={{ cursor: 'pointer' }}>
              <text x={BX0 - 8} y={y + 12} textAnchor="end" fontSize={10} fill={active ? C.neg : C.faint} fontWeight={active ? 700 : 400} fontFamily={MONO}>
                {l.k}
              </text>
              <rect x={BX0} y={y} width={BX1 - BX0} height={17} rx={4} fill="#eef2f7" />
              <rect
                x={BX0}
                y={y}
                width={Math.max(2, barX(l.decay) - BX0)}
                height={17}
                rx={4}
                fill={active ? C.neg : `${C.neg}55`}
                style={{ transition: 'fill 0.25s' }}
              />
              <text x={barX(l.decay) + 5} y={y + 12} fontSize={9.5} fill={active ? C.neg : C.faint} fontWeight={active ? 700 : 400} fontFamily={MONO}>
                −{l.decay.toFixed(2)}
              </text>
            </g>
          );
        })}
        <text x={BX0} y={252} fontSize={10} fill={C.faint}>
          ↑ 参数组合数 / 平均衰减（夏普点）
        </text>
      </svg>

      <div className="slider-row" style={{ marginTop: 12, maxWidth: 460 }}>
        <div className="slider-label">
          参数组合数（你试了多少组）
          <b>{cur.label}</b>
        </div>
        <input type="range" min={0} max={ISOOS_LEVELS.length - 1} step={1} value={lv} onChange={(e) => setLv(Number(e.target.value))} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginTop: 10 }}>
        {[
          { k: '样本内均值', v: meanIs.toFixed(2), color: C.blue },
          { k: '样本外均值', v: meanOos.toFixed(2), color: meanOos < 0.5 ? C.neg : C.pos },
          { k: '平均衰减', v: decayAvg.toFixed(2), color: C.neg },
          { k: '样本外为负的比例', v: `${Math.round(negRatio * 100)}%`, color: negRatio > 0.3 ? C.neg : C.warn },
        ].map((s) => (
          <div key={s.k} style={{ padding: '8px 11px', borderRadius: 9, background: '#fff', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, color: C.sub }}>{s.k}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: s.color, fontFamily: MONO }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{ ...noteCard(C.neg), marginTop: 10 }}>
        <b style={{ color: C.neg }}>当前档位：{cur.label}</b>
        <div style={{ color: '#334155' }}>{cur.note}</div>
        <div style={{ marginTop: 4, color: C.sub }}>
          这就是「<b>试得越多，样本外的平均衰减越大</b>」：参数扫描的过程本身，就是在给自己的成绩单加杠杆。
        </div>
      </div>

      <div className="diagram-caption">
        样本内成绩不算数。真正的顺序是：先在样本内找到候选，再到<b>完全没参与调参</b>的样本外验证；
        如果样本外掉到零附近，那不是运气差，而是「你一直在对噪声调参」这件事终于露出来了。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════════════════════
   5. 四层成本台阶：无成本 → +佣金 → +印花税 → +滑点
   ══════════════════════════════════════════════════════════════ */

type CostLayer = {
  key: string;
  name: string;
  color: string;
  /** 叠加本层之后的累计收益（%） */
  cum: number;
  /** 叠加本层之后的简化夏普 */
  sharpe: number;
  rate: string;
  /** 本层吃掉多少个百分点 */
  eats: number;
  detail: string;
};

const COST_LAYERS: CostLayer[] = [
  {
    key: 'none',
    name: '无成本（理想）',
    color: '#94a3b8',
    cum: 82.44,
    sharpe: 1.15,
    rate: '0 bps',
    eats: 0,
    detail: '回测里最常被默认的第一个假设：想买就按收盘价买到、想卖就按收盘价卖掉，一分钱不付。它只存在于纸面。',
  },
  {
    key: 'commission',
    name: '+ 佣金',
    color: C.cyan,
    cum: 80.92,
    sharpe: 1.13,
    rate: '万一（0.01%），买卖双边',
    eats: 1.52,
    detail: '佣金比例很低，但它按笔收：184 笔交易持续累积，最终吃掉 1.52 个百分点。低频策略的佣金优势就是这么来的。',
  },
  {
    key: 'stamp',
    name: '+ 印花税',
    color: C.warn,
    cum: 80.0,
    sharpe: 1.12,
    rate: '卖出 0.05%（A 股单边）',
    eats: 0.92,
    detail: '只在卖出时收，但卖出必然发生：0.92 个百分点。它和佣金不同——你无法靠「少交易」完全躲掉，只能靠「少换手」。',
  },
  {
    key: 'slip',
    name: '+ 滑点',
    color: C.neg,
    cum: 76.72,
    sharpe: 1.09,
    rate: '买卖各约 5 bps 市场冲击',
    eats: 3.28,
    detail: '四层里最贵的一层：3.28 个百分点，比佣金 + 印花税加起来还多一倍。滑点不体现在费率表上，只体现在你的成交价里。',
  },
];

export function CostStepsDemo() {
  const [sel, setSel] = useState(0);
  const cur = COST_LAYERS[sel];
  const totalErosion = COST_LAYERS[0].cum - COST_LAYERS[COST_LAYERS.length - 1].cum;

  /* 绘图区：累计收益 74 ~ 85（%） */
  const X0 = 74;
  const X1 = 604;
  const Y0 = 48;
  const Y1 = 238;
  const toY = scaleOf(74, 85, Y1, Y0);
  const stepW = (X1 - X0) / COST_LAYERS.length;

  return (
    <figure className="diagram-block interactive">
      <figcaption className="diagram-title">
        四层成本台阶：每加一层，累计收益下一级
        <span className="interactive-badge">可交互</span>
      </figcaption>

      <div className="diagram-desc">
        同一条策略、同样的 184 笔交易，只改「收不收成本」：累计收益从 <b>82.44%</b> 一路降到 <b>76.72%</b>。
        点击任意台阶，看这一层的典型费率与它吃掉多少收益。
      </div>

      <svg viewBox="0 0 640 300" style={X_SVG} role="img" aria-label="四层成本台阶">
        {/* 网格 */}
        {[75, 78, 81, 84].map((v) => (
          <g key={`cg-${v}`}>
            <line x1={X0} y1={toY(v)} x2={X1} y2={toY(v)} stroke={C.grid} strokeWidth={1.2} />
            <text x={X0 - 8} y={toY(v) + 4} textAnchor="end" fontSize={10} fill={C.faint} fontFamily={MONO}>
              {v}%
            </text>
          </g>
        ))}
        <line x1={X0} y1={Y1} x2={X1} y2={Y1} stroke={C.line} strokeWidth={1.2} />
        <text x={X0 - 8} y={Y0 - 12} textAnchor="end" fontSize={10.5} fontWeight={700} fill={C.sub}>
          累计收益
        </text>

        {/* 台阶 */}
        {COST_LAYERS.map((l, i) => {
          const x = X0 + i * stepW;
          const active = i === sel;
          const yTop = toY(l.cum);
          const nextY = i < COST_LAYERS.length - 1 ? toY(COST_LAYERS[i + 1].cum) : Y1;
          return (
            <g key={l.key} onClick={() => setSel(i)} style={{ cursor: 'pointer' }}>
              {/* 台阶面 */}
              <rect
                x={x + 2}
                y={yTop}
                width={stepW - 4}
                height={Y1 - yTop}
                rx={5}
                fill={active ? `${l.color}1f` : `${l.color}0d`}
                stroke={active ? l.color : 'transparent'}
                strokeWidth={1.6}
                style={{ transition: 'all 0.25s' }}
              />
              {/* 台阶顶边 */}
              <line x1={x + 2} y1={yTop} x2={x + stepW - 2} y2={yTop} stroke={l.color} strokeWidth={active ? 4 : 2.6} />
              {/* 落差竖线 */}
              {i < COST_LAYERS.length - 1 && (
                <line
                  x1={x + stepW}
                  y1={yTop}
                  x2={x + stepW}
                  y2={nextY}
                  stroke={l.color}
                  strokeWidth={1.6}
                  strokeDasharray="4 3"
                />
              )}
              {/* 数值 */}
              <text x={x + stepW / 2} y={yTop - 10} textAnchor="middle" fontSize={12.5} fontWeight={700} fill={l.color} fontFamily={MONO}>
                {l.cum.toFixed(2)}%
              </text>
              <text x={x + stepW / 2} y={yTop - 25} textAnchor="middle" fontSize={10} fill={C.faint} fontFamily={MONO}>
                夏普 {l.sharpe.toFixed(2)}
              </text>
              {/* 层名 */}
              <text x={x + stepW / 2} y={Y1 + 17} textAnchor="middle" fontSize={11} fontWeight={active ? 700 : 500} fill={active ? l.color : C.sub}>
                {l.name}
              </text>
              {/* 吃掉多少 */}
              {l.eats > 0 && (
                <text x={x + stepW / 2} y={Y1 + 32} textAnchor="middle" fontSize={10} fill={C.neg} fontFamily={MONO}>
                  −{l.eats.toFixed(2)} pp
                </text>
              )}
            </g>
          );
        })}

        {/* 总侵蚀标注 */}
        <g>
          <line x1={X1 + 1} y1={toY(COST_LAYERS[0].cum)} x2={X1 + 1} y2={toY(COST_LAYERS[3].cum)} stroke={C.neg} strokeWidth={1.4} />
          <text x={X1 - 2} y={(toY(COST_LAYERS[0].cum) + toY(COST_LAYERS[3].cum)) / 2 - 6} textAnchor="end" fontSize={10.5} fontWeight={700} fill={C.neg}>
            侵蚀 {totalErosion.toFixed(2)} pp
          </text>
        </g>
      </svg>

      <div style={{ ...noteCard(cur.color), marginTop: 4 }}>
        <b style={{ color: cur.color }}>
          {cur.name} · 累计 {cur.cum.toFixed(2)}% · 夏普 {cur.sharpe.toFixed(2)}
        </b>
        <div style={{ marginTop: 3 }}>
          典型费率：<code style={{ fontFamily: MONO, background: '#fff', padding: '1px 6px', borderRadius: 4 }}>{cur.rate}</code>
          {cur.eats > 0 ? (
            <>
              {' '}
              · 这一层吃掉 <b style={{ color: C.neg }}>{cur.eats.toFixed(2)} 个百分点</b>
            </>
          ) : (
            ' · 基准层'
          )}
        </div>
        <div style={{ color: '#334155' }}>{cur.detail}</div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
        {COST_LAYERS.map((l, i) => (
          <button
            key={l.key}
            type="button"
            onClick={() => setSel(i)}
            className={`pattern-tab ${i === sel ? 'active' : ''}`}
            style={{ '--tab-color': l.color } as CSSProperties}
          >
            {l.name}
          </button>
        ))}
      </div>

      <div className="diagram-caption">
        成本不是「扣一点点」，而是<b>按笔、按边、按成交价</b>三层叠加：佣金 1.52 + 印花税 0.92 + 滑点 3.28 ≈ 5.72 个百分点。
        回测看起来 82%，扣完现实只剩 77%——先扣成本再谈策略好坏，顺序不能反。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════════════════════
   6. 执行滑点：均值无害、尾部致命
   ══════════════════════════════════════════════════════════════ */

/**
 * 50 笔成交的滑点（%，正数 = 买贵 / 卖便宜；写死的合成样本，非真实行情）。
 * 构造口径：36 笔小幅负值（−0.23 ~ −0.83）+ 8 笔小幅正值 + 6 笔长尾，
 * 使**均值 ≈ 0.00%**（看起来完全无害），而 6 笔右尾累计约 15 个百分点、中位数却有 −0.33%
 * ——这正是「均值无害、尾部致命」的教学落点。
 */
const SLIP_VALUES = [
  -0.23, -0.23, -0.24, -0.24, -0.25, -0.26, -0.27, -0.28, -0.29, -0.3, -0.32, -0.33, -0.35, -0.36, -0.38, -0.39, -0.41, -0.43,
  -0.44, -0.46, -0.48, -0.5, -0.52, -0.54, -0.56, -0.58, -0.6, -0.63, -0.65, -0.67, -0.69, -0.72, -0.74, -0.77, -0.79, -0.83,
  0.05, 0.08, 0.12, 0.16, 0.21, 0.27, 0.34, 0.42, 0.72, 1.05, 1.48, 2.05, 3.1, 6.68,
];

/**
 * 直方图分箱边界：先等宽（−0.9 ~ 0.5，看清主体），再逐级加宽（0.5 以上让 6 笔长尾各自成格）。
 * TAIL_BIN 是第一个「滑点 > 0.5%」的箱序号，尾部视角从这里开始染色。
 */
const SLIP_EDGES = [-0.9, -0.7, -0.5, -0.3, -0.1, 0.1, 0.5, 1.0, 1.5, 2.5, 4.0, 7.0];
const TAIL_BIN = 6;

/** 分标的箱线统计（三只 ETF + 一个长尾标的） */
const SLIP_BOXES = [
  { name: '沪深300ETF', min: -0.42, q1: -0.11, med: 0.04, q3: 0.33, max: 1.18, color: C.blue },
  { name: '纳指100ETF', min: -0.58, q1: -0.26, med: -0.06, q3: 0.41, max: 2.1, color: C.cyan },
  { name: '黄金ETF', min: -0.38, q1: -0.12, med: 0.17, q3: 0.52, max: 2.8, color: C.warn },
  { name: 'SPY', min: -0.42, q1: -0.08, med: 0.22, q3: 0.61, max: 6.68, color: C.neg },
];

export function ExecSlipDemo() {
  const [view, setView] = useState<'mean' | 'tail'>('mean');

  const stats = useMemo(() => {
    const n = SLIP_VALUES.length;
    const sum = SLIP_VALUES.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const sorted = [...SLIP_VALUES].sort((a, b) => a - b);
    const median = (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
    const over05 = SLIP_VALUES.filter((v) => v > 0.5).length;
    const tailSum = SLIP_VALUES.filter((v) => v > 0.5).reduce((a, b) => a + b, 0);
    const bins = new Array(SLIP_EDGES.length - 1).fill(0) as number[];
    for (const v of SLIP_VALUES) {
      for (let i = 0; i < bins.length; i++) {
        if (v >= SLIP_EDGES[i] && v < SLIP_EDGES[i + 1]) {
          bins[i] += 1;
          break;
        }
      }
    }
    return { n, mean, median, over05, tailSum, bins, max: sorted[n - 1] };
  }, []);

  const maxCount = Math.max(...stats.bins);

  /**
   * 左：直方图区，采用**分段压缩轴**：
   *   −0.9% ~ +0.6% 用 68% 的宽度正常展开（主体看得清），
   *   +0.6% ~ +7% 只占剩余 32%（长尾不把主体压扁）。
   * 这是厚尾分布的常规画法：轴在尾部被压缩，会明确标注。
   */
  const HX0 = 62;
  const HX1 = 330;
  const HY0 = 62;
  const HY1 = 232;
  const KINK = 0.6;
  const KINK_PX = HX0 + (HX1 - HX0) * 0.68;
  const histX = (v: number): number =>
    v <= KINK
      ? scaleOf(SLIP_EDGES[0], KINK, HX0, KINK_PX)(v)
      : scaleOf(KINK, SLIP_EDGES[SLIP_EDGES.length - 1], KINK_PX, HX1)(v);
  const countH = (c: number) => (c / maxCount) * (HY1 - HY0);
  /** 尾部起点（滑点 > 0.5%）在像素上的位置 */
  const tailPx = histX(SLIP_EDGES[TAIL_BIN]);

  /* 右：箱线图区（横轴 −0.6 ~ 2.8，超出的极值单独标注） */
  const BX0 = 400;
  const BX1 = 606;
  const boxToX = scaleOf(-0.6, 2.8, BX0, BX1);

  return (
    <figure className="diagram-block interactive">
      <figcaption className="diagram-title">
        执行滑点：均值看起来无害，右尾才是真话
        <span className="interactive-badge">可交互</span>
      </figcaption>

      <div className="diagram-desc">
        左图是 50 笔成交的滑点分布：绝大多数落在 ±0.5% 以内，均值几乎为零；但右侧拖着一条长尾。
        右图按标的分组，看这条尾巴究竟长在谁身上。切换视角读同一张图。
      </div>

      <div className="pattern-tabs" style={{ marginBottom: 8 }}>
        <button
          type="button"
          className={`pattern-tab ${view === 'mean' ? 'active' : ''}`}
          style={{ '--tab-color': C.main } as CSSProperties}
          onClick={() => setView('mean')}
        >
          均值视角
        </button>
        <button
          type="button"
          className={`pattern-tab ${view === 'tail' ? 'active' : ''}`}
          style={{ '--tab-color': C.neg } as CSSProperties}
          onClick={() => setView('tail')}
        >
          尾部视角
        </button>
      </div>

      <svg viewBox="0 0 640 300" style={X_SVG} role="img" aria-label="滑点直方图与分标的箱线图">
        {/* ── 左：直方图 ── */}
        <text x={HX0} y={38} fontSize={11.5} fontWeight={700} fill={C.sub}>
          滑点直方图（{stats.n} 笔）
        </text>

        {view === 'tail' && (
          <rect x={tailPx} y={HY0 - 6} width={HX1 - tailPx} height={HY1 - HY0 + 6} fill={`${C.neg}0d`} />
        )}

        {stats.bins.map((c, i) => {
          const xa = histX(SLIP_EDGES[i]);
          const xb = histX(SLIP_EDGES[i + 1]);
          const h = countH(c);
          const isTail = i >= TAIL_BIN;
          const tailHot = view === 'tail' && isTail;
          return (
            <g key={`bin-${i}`}>
              <rect
                x={xa + 1}
                y={HY1 - h}
                width={Math.max(1.5, xb - xa - 2)}
                height={Math.max(1, h)}
                rx={2}
                fill={tailHot ? C.neg : isTail ? `${C.neg}88` : `${C.blue}bb`}
                style={{ transition: 'fill 0.25s' }}
              >
                <title>{`${SLIP_EDGES[i].toFixed(2)}% ~ ${SLIP_EDGES[i + 1].toFixed(2)}%：${c} 笔`}</title>
              </rect>
            </g>
          );
        })}

        <line x1={HX0} y1={HY1} x2={HX1} y2={HY1} stroke={C.line} strokeWidth={1.2} />
        {/* 轴刻度（分段轴：+0.6% 之后被压缩） */}
        {([[-0.9, 'start'], [-0.45, 'middle'], [0, 'middle'], [0.6, 'middle'], [7, 'end']] as Array<[number, string]>).map(
          ([tick, anchor]) => (
            <text
              key={`tick-${tick}`}
              x={histX(tick)}
              y={HY1 + 15}
              textAnchor={anchor as 'start' | 'middle' | 'end'}
              fontSize={9.5}
              fill={C.faint}
              fontFamily={MONO}
            >
              {tick > 0 ? '+' : ''}
              {tick}%
            </text>
          ),
        )}
        {/* 压缩轴的断点标记：让人一眼知道这里之后刻度被压过 */}
        <line x1={KINK_PX} y1={HY1} x2={KINK_PX} y2={HY1 + 5} stroke={C.faint} strokeWidth={1} />
        <text x={HX0} y={HY1 + 29} fontSize={9.5} fill={C.faint}>
          滑点（%）· 尾部已压缩
        </text>

        {/* 均值 / 中位数参考线 */}
        {view === 'mean' ? (
          <g>
            <line
              x1={histX(stats.mean)}
              y1={HY0 - 6}
              x2={histX(stats.mean)}
              y2={HY1}
              stroke={C.main}
              strokeWidth={1.8}
              strokeDasharray="4 3"
            />
            <text x={histX(stats.mean)} y={HY0 - 12} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={C.main}>
              均值 {stats.mean >= 0 ? '+' : ''}
              {fmt2(stats.mean)}%
            </text>
            <text x={HX1} y={HY1 + 29} textAnchor="end" fontSize={9.5} fill={C.faint}>
              中位数 {fmt2(stats.median)}%
            </text>
          </g>
        ) : (
          <g>
            <line x1={tailPx} y1={HY0 - 6} x2={tailPx} y2={HY1} stroke={C.neg} strokeWidth={1.8} strokeDasharray="4 3" />
            <text x={tailPx + 5} y={HY0 - 10} fontSize={10.5} fontWeight={700} fill={C.neg}>
              &gt; 0.5% 的尾巴：{stats.over05} 笔
            </text>
            <text x={HX1} y={HY1 + 29} textAnchor="end" fontSize={9.5} fill={C.neg} fontFamily={MONO}>
              最贵一笔 +{stats.max.toFixed(2)}%
            </text>
          </g>
        )}

        {/* ── 右：分标的箱线图 ── */}
        <text x={BX0} y={38} fontSize={11.5} fontWeight={700} fill={C.sub}>
          分标的箱线图（横轴 −0.6% ~ 2.8%）
        </text>

        {SLIP_BOXES.map((b, i) => {
          const y = 66 + i * 44;
          const active = view === 'tail' && b.max > 2;
          const xMin = boxToX(b.min);
          const xQ1 = boxToX(b.q1);
          const xMed = boxToX(b.med);
          const xQ3 = boxToX(b.q3);
          const xMax = boxToX(Math.min(b.max, 2.8));
          const clipped = b.max > 2.8;
          return (
            <g key={b.name}>
              <text x={BX0 - 8} y={y + 15} textAnchor="end" fontSize={10.5} fill={active ? C.neg : C.sub} fontWeight={active ? 700 : 400}>
                {b.name}
              </text>
              <line x1={xMin} y1={y + 10} x2={xMax} y2={y + 10} stroke={active ? C.neg : '#cbd5e1'} strokeWidth={1.4} />
              <line x1={xMin} y1={y + 4} x2={xMin} y2={y + 16} stroke={active ? C.neg : '#cbd5e1'} strokeWidth={1.4} />
              {!clipped && <line x1={xMax} y1={y + 4} x2={xMax} y2={y + 16} stroke={active ? C.neg : '#cbd5e1'} strokeWidth={1.4} />}
              {clipped && (
                <g>
                  <path d={`M${xMax},${y + 4} l6,-4 l0,8 z`} fill={C.neg} />
                  <text x={xMax + 9} y={y + 8} fontSize={9} fontWeight={700} fill={C.neg} fontFamily={MONO}>
                    +{b.max.toFixed(2)}%
                  </text>
                </g>
              )}
              <rect
                x={xQ1}
                y={y + 1}
                width={Math.max(2, xQ3 - xQ1)}
                height={18}
                rx={3}
                fill={active ? `${C.neg}33` : `${b.color}22`}
                stroke={active ? C.neg : b.color}
                strokeWidth={1.4}
              />
              <line x1={xMed} y1={y + 1} x2={xMed} y2={y + 19} stroke={active ? C.neg : b.color} strokeWidth={2.4} />
            </g>
          );
        })}
        <text x={BX0} y={252} fontSize={9.5} fill={C.faint}>
          箱体 = 25%~75% 分位，粗线 = 中位数，须 = 最小/最大
        </text>
      </svg>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
        <div
          style={{
            ...noteCard(view === 'mean' ? C.main : C.neg),
            marginTop: 0,
            flex: '1 1 260px',
          }}
        >
          {view === 'mean' ? (
            <>
              <b style={{ color: C.main }}>均值视角：一切正常</b>
              <div style={{ color: '#334155' }}>
                均值 {stats.mean >= 0 ? '+' : ''}
                {fmt2(stats.mean)}%、中位数 {fmt2(stats.median)}%——几乎没有偏离。
                如果你只看这一行数字，会得出「执行没问题，可以继续」的结论。
              </div>
            </>
          ) : (
            <>
              <b style={{ color: C.neg }}>尾部视角：危险都在这一侧</b>
              <div style={{ color: '#334155' }}>
                {stats.over05} / {stats.n} 笔（{Math.round((stats.over05 / stats.n) * 100)}%）滑点超过 0.5%，
                累计吞掉 {stats.tailSum.toFixed(2)} 个百分点；最贵一笔 <b>+{stats.max.toFixed(2)}%</b>——单笔就抵掉半年的超额。
              </div>
            </>
          )}
        </div>
        <div
          style={{
            flex: '1 1 240px',
            padding: '10px 14px',
            borderRadius: 10,
            background: '#fff',
            border: '1px solid #e2e8f0',
            fontSize: 12,
            color: C.sub,
            lineHeight: 1.7,
          }}
        >
          <b style={{ color: C.ink }}>一张图读两遍</b>
          <br />
          均值告诉你「平均而言没事」，尾部告诉你「平均而言会没事的那次是什么样」。
          <br />
          执行报告必须同时给这两个视角，否则等于没有报告。
        </div>
      </div>

      <div className="diagram-caption">
        <b>均值无害、尾部致命。</b>
        6 笔 +0.7% 以上的滑点就能吃掉 {stats.tailSum.toFixed(1)} 个百分点，而同一批成交的均值只有{' '}
        {fmt2(stats.mean)}%、中位数 {fmt2(stats.median)}%——平均值把这条尾巴抹平了。
        所以执行质量只看直方图右尾与分标的箱线图，不看平均值。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════════════════════
   7. 监控三仪表：净值 / 滚动夏普 / 相对基准（共用时间轴）
   ══════════════════════════════════════════════════════════════ */

/** 每个点 = 1 周（5 个交易日）；共 60 周 ≈ 300 个交易日 */
const MON_NAV = [
  1.0, 1.008, 1.015, 1.011, 1.022, 1.031, 1.028, 1.04, 1.052, 1.061, 1.058, 1.07, 1.084, 1.093, 1.087, 1.099, 1.112, 1.124,
  1.118, 1.13, 1.143, 1.151, 1.139, 1.126, 1.118, 1.109, 1.121, 1.134, 1.147, 1.158, 1.171, 1.183, 1.176, 1.188, 1.199, 1.211,
  1.223, 1.216, 1.228, 1.24, 1.251, 1.244, 1.256, 1.263, 1.259, 1.248, 1.236, 1.229, 1.241, 1.253, 1.266, 1.278, 1.271, 1.283,
  1.295, 1.307, 1.3, 1.312, 1.324, 1.336,
];

const MON_SHARPE = [
  0.82, 0.9, 1.05, 1.12, 1.24, 1.31, 1.18, 1.26, 1.35, 1.42, 1.3, 1.38, 1.46, 1.52, 1.44, 1.5, 1.58, 1.62, 1.51, 1.56, 1.48,
  1.36, 0.24, -0.18, -0.42, -0.61, -0.55, -0.33, -0.09, 0.31, 0.58, 0.72, 0.64, 0.78, 0.86, 0.94, 1.02, 0.96, 1.08, 1.15, 1.22,
  1.14, 1.2, 1.1, 0.42, -0.12, -0.28, -0.06, 0.22, 0.48, 0.66, 0.78, 0.7, 0.82, 0.9, 0.98, 0.92, 1.04, 1.12, 1.19,
];

/** 相对基准（累计超额，百分点） */
const MON_REL = [
  0.2, 0.6, 1.1, 0.8, 1.4, 1.9, 1.6, 2.2, 2.8, 3.3, 2.9, 3.5, 4.1, 4.6, 4.0, 4.5, 5.1, 5.6, 5.0, 5.5, 6.0, 5.6, 4.2, 2.8,
  1.6, 0.7, 1.4, 2.6, 3.8, 4.6, 5.4, 6.1, 5.7, 6.4, 7.0, 7.6, 8.2, 7.8, 8.4, 9.0, 9.5, 9.1, 9.6, 9.9, 9.4, 8.2, 7.1, 6.6,
  7.3, 8.0, 8.7, 9.3, 8.9, 9.5, 10.1, 10.6, 10.2, 10.8, 11.3, 11.8,
];

const MON_N = MON_NAV.length;
const DAYS_PER_POINT = 5;
const DANGER_MIN_DAYS = 20;

type DangerZone = { start: number; end: number; days: number; meanSharpe: number; flagged: boolean };

const buildDangerZones = (series: number[]): DangerZone[] => {
  const zones: DangerZone[] = [];
  let start = -1;
  for (let i = 0; i <= series.length; i++) {
    const neg = i < series.length ? series[i] < 0 : false;
    if (neg && start < 0) {
      start = i;
    } else if (!neg && start >= 0) {
      const slice = series.slice(start, i);
      const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
      const days = slice.length * DAYS_PER_POINT;
      zones.push({ start, end: i - 1, days, meanSharpe: mean, flagged: days >= DANGER_MIN_DAYS });
      start = -1;
    }
  }
  return zones;
};

const MON_ZONES = buildDangerZones(MON_SHARPE);
const MON_FLAGGED = MON_ZONES.filter((z) => z.flagged);

const ALERT_SPEC = [
  { k: '触发条件', v: '63 日滚动夏普 < 0，且连续持续 ≥ 20 个交易日（不是单日跌破）' },
  { k: '频率', v: '每月例行检查一次；三指标（夏普 / 回撤 / 相对基准）同时恶化时立即触发' },
  { k: '阈值', v: 'sharpe_threshold = 0.0，min_days = 20 —— 事前锁定，不因结果难看而事后放宽' },
  { k: '输出形态', v: '逐段打印「起止日期 / 持续天数 / 区间均值」，并在仪表盘上标红，进 ExperimentLog' },
];

export function Monitor3Demo() {
  const [cursor, setCursor] = useState(25);
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const X0 = 58;
  const X1 = 612;
  const NAV_TOP = 30;
  const NAV_BOT = 94;
  const SH_TOP = 114;
  const SH_BOT = 172;
  const REL_TOP = 192;
  const REL_BOT = 250;

  const navMin = 0.98;
  const navMax = 1.36;
  const shMin = -0.8;
  const shMax = 1.8;
  const relMin = -1;
  const relMax = 13;

  const toX = (i: number) => X0 + (i / (MON_N - 1)) * (X1 - X0);
  const navToY = scaleOf(navMin, navMax, NAV_BOT, NAV_TOP);
  const shToY = scaleOf(shMin, shMax, SH_BOT, SH_TOP);
  const relToY = scaleOf(relMin, relMax, REL_BOT, REL_TOP);

  const navPath = useMemo(() => linePath(MON_NAV.map((v, i) => ({ x: toX(i), y: navToY(v) }))), [navToY]);
  const shPath = useMemo(() => linePath(MON_SHARPE.map((v, i) => ({ x: toX(i), y: shToY(v) }))), [shToY]);
  const relPath = useMemo(() => linePath(MON_REL.map((v, i) => ({ x: toX(i), y: relToY(v) }))), [relToY]);

  const idxFromPointer = (clientX: number): number => {
    const el = svgRef.current;
    if (!el) return cursor;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return cursor;
    const vbX = ((clientX - rect.left) / rect.width) * 640;
    const ratio = (vbX - X0) / (X1 - X0);
    return clamp(Math.round(ratio * (MON_N - 1)), 0, MON_N - 1);
  };

  const inDanger = MON_FLAGGED.some((z) => cursor >= z.start && cursor <= z.end);

  return (
    <figure className="diagram-block interactive">
      <figcaption className="diagram-title">
        监控三仪表：净值 / 滚动夏普 / 相对基准（共用一条时间轴）
        <span className="interactive-badge">可交互</span>
      </figcaption>

      <div className="diagram-desc">
        三个指标画在同一条时间轴上，才能一眼看出「它们是否同时在恶化」。
        拖动图上的竖线游标（或直接点击）读取任意一周的三个数值；红色区间是「滚动夏普 &lt; 0 且 ≥ 20 个交易日」的危险区。
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 640 300"
        style={{ ...X_SVG, cursor: dragging ? 'grabbing' : 'crosshair', touchAction: 'none' }}
        role="img"
        aria-label="三指标监控仪表盘"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
          setCursor(idxFromPointer(e.clientX));
        }}
        onPointerMove={(e) => {
          if (dragging) setCursor(idxFromPointer(e.clientX));
        }}
        onPointerUp={(e) => {
          e.currentTarget.releasePointerCapture(e.pointerId);
          setDragging(false);
        }}
        onPointerCancel={() => setDragging(false)}
      >
        {/* 危险区（贯穿三条子图） */}
        {MON_FLAGGED.map((z) => (
          <g key={`zone-${z.start}`}>
            <rect
              x={toX(z.start)}
              y={NAV_TOP - 6}
              width={Math.max(2, toX(z.end) - toX(z.start))}
              height={REL_BOT - NAV_TOP + 10}
              fill={`${C.neg}14`}
            />
            {/* 标签放在夏普子图顶部：该时段夏普为负（曲线在下方），这里必然留白，也不会与游标手柄打架 */}
            <text x={(toX(z.start) + toX(z.end)) / 2} y={SH_TOP + 11} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={C.neg}>
              ⚠ {z.days} 个交易日
            </text>
          </g>
        ))}

        {/* 子图 1：净值 */}
        <text x={X0} y={NAV_TOP - 2} fontSize={11} fontWeight={700} fill={C.sub}>
          净值
        </text>
        <line x1={X0} y1={NAV_BOT} x2={X1} y2={NAV_BOT} stroke={C.grid} strokeWidth={1.2} />
        <text x={X0 - 6} y={NAV_TOP + 4} textAnchor="end" fontSize={9.5} fill={C.faint} fontFamily={MONO}>
          {navMax.toFixed(2)}
        </text>
        <text x={X0 - 6} y={NAV_BOT + 2} textAnchor="end" fontSize={9.5} fill={C.faint} fontFamily={MONO}>
          {navMin.toFixed(2)}
        </text>
        <path d={navPath} fill="none" stroke={C.main} strokeWidth={2} />
        <circle cx={toX(cursor)} cy={navToY(MON_NAV[cursor])} r={3.6} fill={C.main} stroke="#fff" strokeWidth={1.4} />

        {/* 子图 2：滚动夏普（含 0 与 1 参考线） */}
        <text x={X0} y={SH_TOP - 2} fontSize={11} fontWeight={700} fill={C.sub}>
          滚动夏普（63 日）
        </text>
        <line x1={X0} y1={SH_BOT} x2={X1} y2={SH_BOT} stroke={C.grid} strokeWidth={1.2} />
        <line x1={X0} y1={shToY(1)} x2={X1} y2={shToY(1)} stroke={`${C.pos}66`} strokeWidth={1.2} strokeDasharray="5 4" />
        <text x={X1} y={shToY(1) - 4} textAnchor="end" fontSize={9} fill={C.pos}>
          夏普 = 1
        </text>
        <line x1={X0} y1={shToY(0)} x2={X1} y2={shToY(0)} stroke={C.neg} strokeWidth={1.4} />
        <text x={X0 - 6} y={shToY(0) + 3} textAnchor="end" fontSize={9.5} fontWeight={700} fill={C.neg} fontFamily={MONO}>
          0
        </text>
        <text x={X0 - 6} y={shToY(1.6) + 3} textAnchor="end" fontSize={9.5} fill={C.faint} fontFamily={MONO}>
          1.6
        </text>
        <path d={shPath} fill="none" stroke={C.purple} strokeWidth={2} />
        {MON_SHARPE.map((v, i) =>
          v < 0 ? <circle key={`neg-${i}`} cx={toX(i)} cy={shToY(v)} r={2.4} fill={C.neg} /> : null,
        )}
        <circle cx={toX(cursor)} cy={shToY(MON_SHARPE[cursor])} r={3.8} fill={C.purple} stroke="#fff" strokeWidth={1.4} />

        {/* 子图 3：相对基准 */}
        <text x={X0} y={REL_TOP - 2} fontSize={11} fontWeight={700} fill={C.sub}>
          相对沪深300（累计超额，pp）
        </text>
        <line x1={X0} y1={REL_BOT} x2={X1} y2={REL_BOT} stroke={C.grid} strokeWidth={1.2} />
        <line x1={X0} y1={relToY(0)} x2={X1} y2={relToY(0)} stroke={C.line} strokeWidth={1.2} strokeDasharray="4 4" />
        <path d={relPath} fill="none" stroke={C.blue} strokeWidth={2} />
        <circle cx={toX(cursor)} cy={relToY(MON_REL[cursor])} r={3.6} fill={C.blue} stroke="#fff" strokeWidth={1.4} />

        {/* 时间游标 */}
        <line x1={toX(cursor)} y1={NAV_TOP - 8} x2={toX(cursor)} y2={REL_BOT + 4} stroke={C.ink} strokeWidth={1.4} opacity={0.75} />
        <circle cx={toX(cursor)} cy={NAV_TOP - 12} r={4.5} fill={C.ink} />

        {/* 横轴刻度 */}
        <line x1={X0} y1={REL_BOT} x2={X1} y2={REL_BOT} stroke={C.line} strokeWidth={1.2} />
        {[0, 12, 24, 36, 48, 60].map((w) => (
          <text key={`wk-${w}`} x={toX(Math.min(w, MON_N - 1))} y={REL_BOT + 14} textAnchor="middle" fontSize={9} fill={C.faint} fontFamily={MONO}>
            第 {w} 周
          </text>
        ))}
        <text x={X1} y={REL_BOT + 26} textAnchor="end" fontSize={9} fill={C.faint}>
          每点 = 1 周（5 个交易日）
        </text>
      </svg>

      {/* 游标读数 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 8,
          marginTop: 10,
        }}
      >
        {[
          { k: `第 ${cursor} 周（≈ 第 ${cursor * DAYS_PER_POINT} 个交易日）`, v: '', color: C.ink },
          { k: '净值', v: MON_NAV[cursor].toFixed(3), color: C.main },
          { k: '滚动夏普', v: MON_SHARPE[cursor].toFixed(2), color: MON_SHARPE[cursor] < 0 ? C.neg : C.purple },
          { k: '超额', v: `${MON_REL[cursor] >= 0 ? '+' : ''}${MON_REL[cursor].toFixed(1)} pp`, color: C.blue },
        ].map((s) => (
          <div key={s.k} style={{ padding: '7px 11px', borderRadius: 9, background: '#fff', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 10.5, color: C.sub }}>{s.k}</div>
            {s.v && <div style={{ fontSize: 16, fontWeight: 700, color: s.color, fontFamily: MONO }}>{s.v}</div>}
          </div>
        ))}
      </div>

      {inDanger && (
        <div
          style={{
            marginTop: 8,
            padding: '8px 12px',
            borderRadius: 9,
            background: `${C.neg}12`,
            border: `1px solid ${C.neg}44`,
            fontSize: 12,
            color: '#b91c1c',
            fontWeight: 600,
          }}
        >
          ⚠ 游标落在危险区内：滚动夏普已连续为负 ≥ 20 个交易日——此时才值得中断日常、进入诊断三问（执行 → 市场 → 策略）。
        </div>
      )}

      {/* 检出段落（告警的「输出形态」示例） */}
      <div
        style={{
          marginTop: 10,
          padding: '9px 13px',
          borderRadius: 9,
          background: '#0f172a',
          color: '#cbd5e1',
          fontFamily: MONO,
          fontSize: 11.5,
          lineHeight: 1.85,
          overflowX: 'auto',
        }}
      >
        <div style={{ color: '#94a3b8' }}>▸ 告警扫描结果（滚动夏普 &lt; 0 且 ≥ 20 个交易日）</div>
        {MON_FLAGGED.map((z) => (
          <div key={`out-${z.start}`} style={{ color: '#fca5a5' }}>
            第 {z.start}–{z.end} 周 · {z.days} 个交易日 · 区间均值 {z.meanSharpe.toFixed(2)} · 已告警
          </div>
        ))}
        {MON_ZONES.filter((z) => !z.flagged).map((z) => (
          <div key={`out-short-${z.start}`} style={{ color: '#64748b' }}>
            第 {z.start}–{z.end} 周 · {z.days} 个交易日（&lt; 20）· 不告警 —— 只是正常波动
          </div>
        ))}
      </div>

      {/* 告警四要素 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginTop: 10 }}>
        {ALERT_SPEC.map((a) => (
          <div key={a.k} style={{ padding: '8px 11px', borderRadius: 9, background: C.panel, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.warn, marginBottom: 2 }}>{a.k}</div>
            <div style={{ fontSize: 11.5, color: '#334155', lineHeight: 1.6 }}>{a.v}</div>
          </div>
        ))}
      </div>

      <div className="diagram-caption">
        三指标同时恶化才是危险区。<b>短暂跌破 0 不算事</b>——第 45–47 周也低于 0，但只持续 15 个交易日，
        按事前锁定的阈值不该打断你的日常；反之，红色区间才值得启动诊断。
        告警的价值不在于「能报警」，而在于<b>阈值是事前写死的</b>。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════════════════════
   8. 因子 IC：柱状图 + 60 日滚动均值 + 分组切换
   ══════════════════════════════════════════════════════════════ */

/**
 * IC 基础波形（每点 = 1 周，60 点 = 300 个交易日）。
 * 离线构造为「均值 0、标准差 0.13、正负各半」的固定序列——不是随机数，每次渲染完全一致。
 * 再叠加分组偏移得到三组标的池的 IC（全池 −0.019 / 高波动 −0.035 / 低波动 −0.005），
 * 量级对齐教学口径「IC 均值 −0.02 ~ +0.02」。
 */
const IC_BASE = [
  0.094, -0.145, 0.045, 0.168, -0.096, -0.212, 0.134, 0.018, -0.118, 0.188,
  -0.059, -0.167, 0.079, 0.222, -0.128, 0.03, -0.199, 0.116, 0.003, -0.081,
  0.161, -0.229, 0.064, 0.124, -0.106, 0.042, -0.153, 0.18, -0.037, -0.125,
  0.143, 0.025, -0.182, 0.084, 0.2, -0.071, -0.133, 0.06, 0.151, -0.049,
  -0.209, 0.104, 0.013, -0.098, 0.173, -0.16, 0.037, 0.114, -0.088, 0.195,
  -0.111, -0.19, 0.074, 0.131, -0.066, 0.01, -0.17, 0.099, 0.178, -0.079,
];
/** 三组标的池的均值偏移（写死；对应「动量在高波动资产上更差」） */
const IC_GROUPS = [
  { key: 'all', name: '全部标的', offset: -0.019, color: C.blue, note: '25 只 ETF 全池：动量 IC 均值为负，但幅度有限——说明「动量」在这套池子里几乎没有截面预测力。' },
  { key: 'high', name: '高波动组', offset: -0.035, color: C.neg, note: '高波动资产上更差：暴涨暴跌把排名打乱，动量信号更容易在反转处被你「接飞刀」。' },
  { key: 'low', name: '低波动组', offset: -0.005, color: C.pos, note: '低波动组几乎为 0：同一个因子，在不同资产上的结论可以完全不同——这就是分组 IC 的意义。' },
];

/** 滚动均值窗口：12 个周点 = 60 个交易日 */
const IC_ROLL = 12;

export function IcWaveDemo() {
  const [gk, setGk] = useState(0);
  const group = IC_GROUPS[gk];

  const ic = useMemo(() => IC_BASE.map((v) => v + group.offset), [group]);

  const stats = useMemo(() => {
    const n = ic.length;
    const mean = ic.reduce((a, b) => a + b, 0) / n;
    const variance = ic.reduce((a, b) => a + (b - mean) * (b - mean), 0) / n;
    const sd = Math.sqrt(variance);
    const posRatio = ic.filter((v) => v > 0).length / n;
    const roll: Array<number | null> = ic.map((_, i) => {
      if (i < IC_ROLL - 1) return null;
      const win = ic.slice(i - IC_ROLL + 1, i + 1);
      return win.reduce((a, b) => a + b, 0) / win.length;
    });
    return { mean, sd, icir: mean / sd, posRatio, roll };
  }, [ic]);

  /* 绘图区 */
  const X0 = 56;
  const X1 = 596;
  const Y_TOP = 52;
  const Y_BOT = 232;
  const V_MIN = -0.4;
  const V_MAX = 0.25;
  const n = ic.length;
  const toX = (i: number) => X0 + ((i + 0.5) / n) * (X1 - X0);
  const toY = scaleOf(V_MIN, V_MAX, Y_BOT, Y_TOP);
  const barW = Math.max(2, (X1 - X0) / n - 1.6);

  const rollPts = stats.roll
    .map((v, i) => (v === null ? null : { x: toX(i), y: toY(v) }))
    .filter((p): p is { x: number; y: number } => p !== null);

  return (
    <figure className="diagram-block interactive">
      <figcaption className="diagram-title">
        因子 IC：柱子围着零乱跳，均值在零的下方
        <span className="interactive-badge">可交互</span>
      </figcaption>

      <div className="diagram-desc">
        每根柱子是一个周期的 <b>IC</b>（因子排名与下期收益排名的相关，−1 ~ +1）。柱子正负乱跳是常态；
        真正要读的是<b>滚动均值线</b>和均值虚线——单根柱子说明不了任何事。
        切换标的池，看均值线怎么移动。
      </div>

      <div className="pattern-tabs" style={{ marginBottom: 8 }}>
        {IC_GROUPS.map((g, i) => (
          <button
            key={g.key}
            type="button"
            className={`pattern-tab ${i === gk ? 'active' : ''}`}
            style={{ '--tab-color': g.color } as CSSProperties}
            onClick={() => setGk(i)}
          >
            {g.name}
          </button>
        ))}
      </div>

      <svg viewBox="0 0 640 300" style={X_SVG} role="img" aria-label="IC 柱状图与滚动均值">
        {/* 网格 */}
        {[0.2, 0.1, -0.1, -0.2, -0.3].map((v) => (
          <line key={`icg-${v}`} x1={X0} y1={toY(v)} x2={X1} y2={toY(v)} stroke={C.grid} strokeWidth={1.1} />
        ))}
        <line x1={X0} y1={Y_BOT + 6} x2={X1} y2={Y_BOT + 6} stroke={C.line} strokeWidth={1} />

        {/* 零轴 */}
        <line x1={X0} y1={toY(0)} x2={X1} y2={toY(0)} stroke="#94a3b8" strokeWidth={1.3} />
        <text x={X0 - 6} y={toY(0) + 3} textAnchor="end" fontSize={9.5} fill={C.sub} fontFamily={MONO} fontWeight={700}>
          0
        </text>
        <text x={X0 - 6} y={toY(0.2) + 3} textAnchor="end" fontSize={9} fill={C.faint} fontFamily={MONO}>
          +0.2
        </text>
        <text x={X0 - 6} y={toY(-0.2) + 3} textAnchor="end" fontSize={9} fill={C.faint} fontFamily={MONO}>
          −0.2
        </text>
        <text x={X0 - 6} y={toY(-0.3) + 3} textAnchor="end" fontSize={9} fill={C.faint} fontFamily={MONO}>
          −0.3
        </text>

        {/* 柱子 */}
        {ic.map((v, i) => {
          const pos = v >= 0;
          const y0 = toY(0);
          const y1 = toY(v);
          return (
            <rect
              key={`bar-${i}`}
              x={toX(i) - barW / 2}
              y={Math.min(y0, y1)}
              width={barW}
              height={Math.max(1, Math.abs(y1 - y0))}
              rx={1.2}
              fill={pos ? C.pos : C.neg}
              opacity={0.72}
            >
              <title>{`第 ${i + 1} 周 IC ${v >= 0 ? '+' : ''}${v.toFixed(3)}`}</title>
            </rect>
          );
        })}

        {/* 滚动均值线 */}
        <path d={linePath(rollPts)} fill="none" stroke={C.warn} strokeWidth={2.2} />

        {/* 均值虚线 */}
        <line
          x1={X0}
          y1={toY(stats.mean)}
          x2={X1}
          y2={toY(stats.mean)}
          stroke={C.neg}
          strokeWidth={1.6}
          strokeDasharray="7 4"
        />


        {/* 图例 */}
        <g>
          <rect x={X0} y={24} width={9} height={9} rx={2} fill={C.pos} opacity={0.72} />
          <text x={X0 + 13} y={32} fontSize={10} fill={C.sub}>
            IC &gt; 0
          </text>
          <rect x={X0 + 62} y={24} width={9} height={9} rx={2} fill={C.neg} opacity={0.72} />
          <text x={X0 + 75} y={32} fontSize={10} fill={C.sub}>
            IC &lt; 0
          </text>
          <line x1={X0 + 124} y1={28.5} x2={X0 + 148} y2={28.5} stroke={C.warn} strokeWidth={2.2} />
          <text x={X0 + 154} y={32} fontSize={10} fill={C.sub}>
            60 日滚动均值（12 周窗口）
          </text>
          <line x1={X0 + 302} y1={28.5} x2={X0 + 326} y2={28.5} stroke={C.neg} strokeWidth={1.6} strokeDasharray="7 4" />
          <text x={X0 + 332} y={32} fontSize={10} fill={C.sub}>
            全期均值{' '}
            <tspan fontFamily={MONO} fontWeight={700} fill={C.neg}>
              {stats.mean >= 0 ? '+' : ''}
              {stats.mean.toFixed(3)}
            </tspan>
          </text>
        </g>

        <text x={(X0 + X1) / 2} y={Y_BOT + 22} textAnchor="middle" fontSize={9.5} fill={C.faint}>
          每点 = 1 周（5 个交易日）· 共 60 周
        </text>
      </svg>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))', gap: 8, marginTop: 10 }}>
        {[
          { k: 'IC 均值', v: `${stats.mean >= 0 ? '+' : ''}${stats.mean.toFixed(3)}`, color: stats.mean < 0 ? C.neg : C.pos },
          { k: 'IC 标准差', v: stats.sd.toFixed(3), color: C.sub },
          { k: 'ICIR（均值/标准差）', v: stats.icir.toFixed(3), color: stats.icir < 0 ? C.neg : C.pos },
          { k: 'IC > 0 占比', v: `${Math.round(stats.posRatio * 100)}%`, color: C.warn },
        ].map((s) => (
          <div key={s.k} style={{ padding: '8px 11px', borderRadius: 9, background: '#fff', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 10.5, color: C.sub }}>{s.k}</div>
            <div style={{ fontSize: 15.5, fontWeight: 700, color: s.color, fontFamily: MONO }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{ ...noteCard(group.color), marginTop: 10 }}>
        <b style={{ color: group.color }}>{group.name}</b>
        <div style={{ color: '#334155' }}>{group.note}</div>
        <div style={{ marginTop: 4, color: C.sub }}>
          判定口径：|IC| &gt; 0.03 才有参考价值，&gt; 0.05 算不错，&gt; 0.1 非常强（罕见）。
          当前 IC 均值绝对值约 {Math.abs(stats.mean).toFixed(3)}，属于「接近噪声」区间——
          <b>回测有效 ≠ 因子有效</b>。
        </div>
      </div>

      <div className="diagram-caption">
        因子 IC 的正确读法：<b>单根柱子没有信息，滚动均值才有</b>。
        全池均值略低于零、高波动组更低、低波动组几乎为零——同一个动量因子，在「买什么」这件事上
        给出的答案并不一致；这也正是「把因子弱点翻译成策略规则」的起点。
      </div>
    </figure>
  );
}
