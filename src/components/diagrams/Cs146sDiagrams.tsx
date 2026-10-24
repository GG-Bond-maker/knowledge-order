/**
 * Stanford CS146S 课程专用交互图示组件（SVG + 内联样式，零图形依赖）
 *
 * 用途：为 CS146S（AI 时代的软件工程）课程提供 8 个交互图，覆盖
 * Coding Agent 的运行时与工程化主题：
 *   1. AgentLoopDemo      —— Agent 感知→规划→执行→反馈循环
 *   2. ContextBudgetDemo  —— 上下文窗口 token 预算堆叠
 *   3. McpHandshakeDemo   —— MCP Host/Client/Server 握手时序
 *   4. SpecFlowDemo       —— PRD→Spec→Plan→Tasks→Execute→Verify 流
 *   5. AutonomyLadderDemo —— 自治等级 L0-L4 阶梯
 *   6. PermissionModesDemo—— 权限模式与沙箱边界矩阵
 *   7. ReviewPipelineDemo —— AI 代码验收五站流水线
 *   8. FactoryLoopDemo    —— Software Factory 闭环
 *
 * 来源：原创组件，为本仓库 CS146S 课程内容专门设计。
 */

import { useState } from 'react';
import type { CSSProperties } from 'react';
import './diagrams.css';

/* ─── 共用小工具：极坐标与圆弧路径（循环类图示复用） ─── */

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

/** 从角度 a1 顺时针画到角度 a2 的圆弧（用于环形箭头） */
const arcPath = (cx: number, cy: number, r: number, a1: number, a2: number) => {
  const p1 = polar(cx, cy, r, a1);
  const p2 = polar(cx, cy, r, a2);
  return `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${r} ${r} 0 0 1 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
};

/* 统一 SVG 尺寸：viewBox 640×300，宽度 100%，渲染高度固定 300px */
const CS_SVG_STYLE: CSSProperties = { width: '100%', height: 300, display: 'block' };

/* 通用阶段说明卡：颜色随当前阶段变化 */
const detailCard = (color: string): CSSProperties => ({
  marginTop: 12,
  padding: '10px 14px',
  borderRadius: 10,
  border: `1px solid ${color}55`,
  background: `${color}0f`,
  fontSize: 12.5,
  lineHeight: 1.7,
});

/* ══════════════════════════════════════════════
   1. Coding Agent 感知→规划→执行→反馈 循环
   ══════════════════════════════════════════════ */

const AGENT_LOOP_STEPS = [
  {
    label: '感知',
    en: 'Perceive',
    color: '#2f6bff',
    title: '读文件 / 收错误输出',
    detail: 'Agent 把仓库结构、相关源码、测试报错读进上下文——看不到的东西就无从规划。',
    log: 'read_file src/auth/limiter.ts → 96 行；read_file test.log → "expected 429, got 200"',
  },
  {
    label: '规划',
    en: 'Plan',
    color: '#7c5cff',
    title: '拆解任务',
    detail: '把"修好限流"拆成可执行的小步：定位计数逻辑 → 补锁定期分支 → 加回归测试。',
    log: 'plan: 1) 定位计数器重置逻辑  2) 锁定期直接返回 429  3) 补 AC1 回归用例',
  },
  {
    label: '执行',
    en: 'Act',
    color: '#f59e0b',
    title: '调工具 / 改代码',
    detail: '通过工具真正落盘：编辑文件、跑测试、执行命令——只有这一步会改变世界状态。',
    log: 'edit_file src/auth/limiter.ts (+12/-3)；bash pnpm vitest run auth → 1 failed',
  },
  {
    label: '反馈',
    en: 'Reflect',
    color: '#22c55e',
    title: '读结果进上下文',
    detail: '把执行结果（测试输出、diff、报错）读回上下文，决定继续修、换路还是收工。',
    log: 'observe: 锁定期分支未生效 → 判定回到规划，第 2 轮迭代',
  },
];

export function AgentLoopDemo() {
  const [step, setStep] = useState(0); // 当前阶段下标
  const [count, setCount] = useState(1); // 累计步数

  const advance = () => {
    setStep((s) => (s + 1) % AGENT_LOOP_STEPS.length);
    setCount((c) => c + 1);
  };
  const reset = () => {
    setStep(0);
    setCount(1);
  };

  const cur = AGENT_LOOP_STEPS[step];
  const cx = 320;
  const cy = 150;
  const R = 96;

  // 四个节点均匀分布：-90(上) 0(右) 90(下) 180(左)
  const nodes = AGENT_LOOP_STEPS.map((s, i) => ({ ...s, angle: -90 + i * 90 }));

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">Coding Agent 运行循环：感知 → 规划 → 执行 → 反馈</figcaption>

      <svg viewBox="0 0 640 300" style={CS_SVG_STYLE} role="img" aria-label="Agent 循环">
        <defs>
          <marker id="cs146s-loop-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="#cbd5e1" />
          </marker>
        </defs>

        {/* 四段循环弧线 */}
        {nodes.map((n, i) => {
          const a1 = n.angle + 26;
          let a2 = nodes[(i + 1) % nodes.length].angle - 26;
          if (a2 <= a1) a2 += 360;
          return (
            <path
              key={`arc-${n.label}`}
              d={arcPath(cx, cy, R, a1, a2)}
              fill="none"
              stroke={i === step ? n.color : '#cbd5e1'}
              strokeWidth={i === step ? 2.4 : 1.6}
              markerEnd="url(#cs146s-loop-arrow)"
              style={{ transition: 'stroke 0.4s' }}
            />
          );
        })}

        {/* 四个阶段节点 */}
        {nodes.map((n) => {
          const p = polar(cx, cy, R, n.angle);
          const active = n.label === cur.label;
          return (
            <g key={n.label}>
              <circle
                cx={p.x}
                cy={p.y}
                r={active ? 32 : 28}
                fill={active ? n.color : `${n.color}18`}
                stroke={n.color}
                strokeWidth={active ? 2.5 : 1.4}
                style={{ transition: 'all 0.4s ease' }}
              />
              <text x={p.x} y={p.y - 2} textAnchor="middle" fontSize={13} fontWeight={700} fill={active ? '#fff' : n.color}>
                {n.label}
              </text>
              <text x={p.x} y={p.y + 13} textAnchor="middle" fontSize={11} fill={active ? '#ffffffcc' : '#94a3b8'}>
                {n.en}
              </text>
            </g>
          );
        })}

        {/* 中央 LLM 节点 */}
        <circle cx={cx} cy={cy} r={44} fill="#fff" stroke="#c7d4ff" strokeWidth={1.5} strokeDasharray="5 3" />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={16} fontWeight={700} fill="#7c5cff">
          LLM
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize={12} fill="#94a3b8">
          Agent 内核
        </text>
      </svg>

      <div style={detailCard(cur.color)}>
        <b style={{ color: cur.color }}>
          {cur.label}（{cur.en}）· {cur.title}
        </b>
        <div>{cur.detail}</div>
        <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12, color: '#64748b', marginTop: 4 }}>
          trace ▸ {cur.log}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap', fontSize: 12.5 }}>
        <button type="button" className="apriori-play-btn" onClick={advance}>
          单步执行 ▸
        </button>
        <button type="button" className="apriori-step-btn" onClick={reset}>
          重置
        </button>
        <span style={{ color: '#64748b' }}>
          第 <b>{count}</b> 步 · 当前阶段：{cur.label}
        </span>
      </div>

      <div className="diagram-caption">
        循环的燃料是<b>上下文</b>：感知与反馈把真实世界读进来，规划与执行把决策写出去。
        Agent 卡住，多半是某一站的产物没有干净地回到上下文里。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   2. 上下文窗口预算堆叠
   ══════════════════════════════════════════════ */

const CTX_TOTAL = 200_000; // 200K token 预算

/* 不随对话轮数变化的固定开销 */
const CTX_FIXED = [
  { name: '系统提示', tokens: 2_000, color: '#7c5cff' },
  { name: '工具定义', tokens: 8_000, color: '#0891b2' },
  { name: '系统提示之外的指令', tokens: 3_000, color: '#2f6bff' },
  { name: '代码库文件', tokens: 30_000, color: '#64748b' },
];

const CTX_FMT = (n: number) => `${(n / 1000).toFixed(1)}K`;

export function ContextBudgetDemo() {
  const [rounds, setRounds] = useState(8);

  const history = rounds * 3_500; // 对话历史随轮数线性增长
  const output = 2_000 + rounds * 1_500; // 任务输出也随轮数累积
  const segs = [
    ...CTX_FIXED,
    { name: '对话历史', tokens: history, color: '#f59e0b' },
    { name: '任务输出', tokens: output, color: '#ec4899' },
  ];
  const used = segs.reduce((s, x) => s + x.tokens, 0);
  const remaining = Math.max(0, CTX_TOTAL - used);
  const remainPct = (remaining / CTX_TOTAL) * 100;
  const danger = remainPct < 10;
  // 超预算时按比例压缩各段，保证条形图不越界
  const scale = used > CTX_TOTAL ? CTX_TOTAL / used : 1;

  const BX = 24;
  const BW = 592;
  const BY = 130;
  const BH = 52;

  // 从左到右排布各段
  let acc = 0;
  const rects = segs.map((s) => {
    const w = ((s.tokens * scale) / CTX_TOTAL) * BW;
    const rect = { ...s, x: BX + acc, w };
    acc += w;
    return rect;
  });
  const remainW = (remaining / CTX_TOTAL) * BW;

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">上下文窗口预算：200K token 怎么花</figcaption>

      <svg viewBox="0 0 640 300" style={CS_SVG_STYLE} role="img" aria-label="上下文预算堆叠条">
        {/* 预算上限参考线 */}
        <text x={BX} y={BY - 34} fontSize={12.5} fill="#64748b">
          预算 200K · 已用 {CTX_FMT(used)} · 剩余 {CTX_FMT(remaining)}（{remainPct.toFixed(0)}%）
        </text>
        <text x={BX + BW} y={BY - 34} fontSize={12} textAnchor="end" fill={danger ? '#ef4444' : '#94a3b8'} fontWeight={danger ? 700 : 400}>
          {danger ? '⚠ 剩余不足 10%' : '余量健康'}
        </text>

        {/* 各分段 */}
        {rects.map((r) => (
          <g key={r.name}>
            <rect x={r.x} y={BY} width={Math.max(0, r.w - 1)} height={BH} fill={r.color} opacity={0.85} rx={3} />
            {r.w > 56 && (
              <text x={r.x + r.w / 2} y={BY - 10} textAnchor="middle" fontSize={12} fill={r.color} fontWeight={600}>
                {CTX_FMT(r.tokens * scale)}
              </text>
            )}
          </g>
        ))}

        {/* 剩余空间 */}
        <rect
          x={BX + acc}
          y={BY}
          width={Math.max(0, remainW - 1)}
          height={BH}
          fill={danger ? '#ef444414' : '#eef2f7'}
          stroke={danger ? '#ef4444' : '#cbd5e1'}
          strokeWidth={1.2}
          strokeDasharray="4 3"
          rx={3}
        />
        {remainW > 60 && (
          <text x={BX + acc + remainW / 2} y={BY + BH / 2 + 4} textAnchor="middle" fontSize={12} fill={danger ? '#ef4444' : '#94a3b8'}>
            可用余量
          </text>
        )}

        {/* 条形外框 */}
        <rect x={BX} y={BY} width={BW} height={BH} fill="none" stroke={danger ? '#ef4444' : '#cbd5e1'} strokeWidth={danger ? 2 : 1.2} rx={4} />

        {/* 压缩策略提示 */}
        {danger && (
          <text x={BX + BW / 2} y={BY + BH + 30} textAnchor="middle" fontSize={13} fontWeight={700} fill="#ef4444">
            ⚠ 触发压缩策略（compact / 外部化记忆）
          </text>
        )}
      </svg>

      {/* 图例：各项 token 明细 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 8, fontSize: 12 }}>
        {[...segs.map((s) => ({ ...s, v: s.tokens * scale })), { name: '可用余量', color: '#94a3b8', v: remaining }].map((s) => (
          <span key={s.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#475569' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, display: 'inline-block' }} />
            {s.name} · {CTX_FMT(s.v)}
          </span>
        ))}
      </div>

      <div className="slider-row" style={{ marginTop: 14, maxWidth: 420 }}>
        <div className="slider-label">
          对话轮数（每轮注入历史 + 输出）<b>{rounds} 轮</b>
        </div>
        <input type="range" min={0} max={40} value={rounds} onChange={(e) => setRounds(Number(e.target.value))} />
      </div>

      <div className="diagram-caption">
        固定开销（提示 + 工具 + 代码库）先吃掉 <b>43K</b>，越到任务后期，历史与输出越挤压"可用于思考"的空间——
        这就是<b>上下文工程</b>要解决的问题。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   3. MCP Host ↔ Client ↔ Server 握手时序
   ══════════════════════════════════════════════ */

const MCP_LANES = [
  { name: 'MCP Host', x: 110, color: '#64748b' },
  { name: 'MCP Client', x: 320, color: '#2f6bff' },
  { name: 'MCP Server', x: 530, color: '#7c5cff' },
];

const MCP_MESSAGES = [
  { label: 'initialize', from: 0, to: 1, color: '#2f6bff', desc: 'Host 启动会话：告诉 Client 要接入哪个 MCP Server，携带协议版本与进程信息。' },
  { label: 'capabilities', from: 1, to: 2, color: '#7c5cff', desc: 'Client 与 Server 完成握手：双方交换协议版本和能力清单（支持 resources / tools / prompts 中的哪些）。' },
  { label: 'tools/list', from: 1, to: 2, color: '#0891b2', desc: 'Client 拉取工具目录：Server 返回每个工具的名称、描述与参数 schema，Host 把它们注册成模型可调用的工具。' },
  { label: 'tools/call', from: 1, to: 2, color: '#f59e0b', desc: '模型决定调用某工具后，Client 按 schema 校验参数并发给 Server 真正执行（如查询数据库）。' },
  { label: 'result', from: 2, to: 1, color: '#22c55e', desc: 'Server 返回结构化结果与错误码，Client 把它作为工具结果写回对话上下文，供下一轮推理使用。' },
  { label: 'notification', from: 2, to: 1, color: '#ec4899', desc: 'Server 主动推送通知（如工具列表发生变化），Host 无需轮询即可感知更新。' },
];

export function McpHandshakeDemo() {
  const [step, setStep] = useState(0); // 已展示的消息数（0-6）
  const cur = step > 0 ? MCP_MESSAGES[step - 1] : null;

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">MCP 握手时序：Host ↔ Client ↔ Server</figcaption>

      <svg viewBox="0 0 640 300" style={CS_SVG_STYLE} role="img" aria-label="MCP 时序图">
        <defs>
          <marker id="cs146s-mcp-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="#94a3b8" />
          </marker>
        </defs>

        {/* 三条泳道 */}
        {MCP_LANES.map((l) => (
          <g key={l.name}>
            <rect x={l.x - 62} y={12} width={124} height={30} rx={8} fill={`${l.color}14`} stroke={l.color} strokeWidth={1.2} />
            <text x={l.x} y={32} textAnchor="middle" fontSize={13} fontWeight={700} fill={l.color}>
              {l.name}
            </text>
            <line x1={l.x} y1={46} x2={l.x} y2={290} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 4" />
          </g>
        ))}

        {/* 消息箭头：只显示已播放的 */}
        {MCP_MESSAGES.map((m, i) => {
          if (i >= step) return null;
          const y = 74 + i * 36;
          const x1 = MCP_LANES[m.from].x;
          const x2 = MCP_LANES[m.to].x;
          const isCur = i === step - 1;
          return (
            <g key={m.label} opacity={isCur ? 1 : 0.45}>
              <line x1={x1} y1={y} x2={x2} y2={y} stroke={m.color} strokeWidth={isCur ? 2.6 : 1.6} markerEnd="url(#cs146s-mcp-arrow)" />
              <text
                x={(x1 + x2) / 2}
                y={y - 7}
                textAnchor="middle"
                fontSize={12}
                fontWeight={isCur ? 700 : 400}
                fill={m.color}
                style={{ fontFamily: 'var(--font-mono, monospace)' }}
              >
                {m.label}
              </text>
            </g>
          );
        })}

        {step === 0 && (
          <text x={320} y={170} textAnchor="middle" fontSize={13} fill="#94a3b8">
            点击「播放」按序观察握手时序
          </text>
        )}
      </svg>

      <div style={detailCard(cur ? cur.color : '#64748b')}>
        {cur ? (
          <>
            <b style={{ color: cur.color, fontFamily: 'var(--font-mono, monospace)' }}>
              Step {step}/{MCP_MESSAGES.length} · {cur.label}
            </b>
            <div>{cur.desc}</div>
          </>
        ) : (
          <div style={{ color: '#64748b' }}>MCP 把"接工具"标准化成一次握手 + 一张工具清单——Host 换模型、Server 换实现，两边互不影响。</div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap', fontSize: 12.5 }}>
        <button type="button" className="apriori-play-btn" onClick={() => setStep((s) => Math.min(s + 1, MCP_MESSAGES.length))} disabled={step >= MCP_MESSAGES.length}>
          ▶ 播放下一步
        </button>
        <button type="button" className="apriori-step-btn" onClick={() => setStep(0)}>
          重置
        </button>
        <span style={{ color: '#64748b' }}>
          进度 {step} / {MCP_MESSAGES.length}
        </span>
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   4. PRD → Spec → Plan → Tasks → Execute → Verify 流
   ══════════════════════════════════════════════ */

const SPEC_STAGES = [
  {
    key: 'prd',
    name: 'PRD',
    artifact: '需求文档',
    color: '#64748b',
    brief: '产品视角：要解决什么问题、给谁用、怎么算成功。',
    snippet: `# PRD：登录接口限流
目标：暴力破解尝试超过阈值后自动锁定账号
成功指标：爆破成功率 < 0.1%，正常用户误伤率 < 0.01%
干系人：安全组（评审）/ 平台组（实现）`,
  },
  {
    key: 'spec',
    name: 'Spec',
    artifact: 'spec.md',
    color: '#2f6bff',
    brief: '工程契约：把需求翻译成可逐条验收的技术规格（AC 驱动）。',
    snippet: `# spec: login-rate-limit
## 验收标准（AC）
- AC1 连续 5 次失败后锁定账号 10 分钟
- AC2 锁定期间返回 429 + Retry-After 响应头
- AC3 成功登录清零失败计数
## 非目标
- 不引入验证码（另立任务）`,
  },
  {
    key: 'plan',
    name: 'Plan',
    artifact: 'plan.md',
    color: '#7c5cff',
    brief: '技术方案：改哪些模块、按什么顺序、风险与回滚方式。',
    snippet: `# plan
1. 用 Redis 哈希存"失败次数 + 锁定截止时间"
2. 中间件拦截 /login，先查锁再放行
3. 指标上报：锁定次数 / 误伤次数
风险：Redis 不可用 → 降级为单机内存计数并告警`,
  },
  {
    key: 'tasks',
    name: 'Tasks',
    artifact: 'tasks.md',
    color: '#0891b2',
    brief: '执行清单：小步提交，每项带依赖与完成勾选，Agent 按序认领。',
    snippet: `- [x] T1 建表与迁移（无依赖）
- [x] T2 限流中间件（依赖 T1）
- [ ] T3 覆盖 AC1-AC3 的测试（依赖 T2）
- [ ] T4 接入告警与指标（依赖 T2）`,
  },
  {
    key: 'execute',
    name: 'Execute',
    artifact: '代码 diff',
    color: '#f59e0b',
    brief: 'Agent 按任务逐项实现，人只在检查点介入审查。',
    snippet: `git diff --stat
 src/auth/limiter.ts    | 88 +++++++++
 src/auth/middleware.ts | 46 ++++
 tests/limiter.test.ts  | 54 ++++++
 3 files changed, 188 insertions(+)`,
  },
  {
    key: 'verify',
    name: 'Verify',
    artifact: '测试报告',
    color: '#22c55e',
    brief: '对照验收标准逐条核验，不过关就打回执行，过关才合并。',
    snippet: `pnpm vitest run → 24 passed
coverage: src/auth 91%
AC1 ✅  AC2 ✅  AC3 ✅
AI 审查：2 条评论（已解决）  人工复核：approved`,
  },
];

export function SpecFlowDemo() {
  const [sel, setSel] = useState(1); // 默认选中 Spec
  const cur = SPEC_STAGES[sel];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">规格驱动开发流：PRD → Spec → Plan → Tasks → Execute → Verify</figcaption>

      {/* 六个阶段节点 + 产物小卡 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px 2px' }}>
        {SPEC_STAGES.map((s, i) => {
          const active = i === sel;
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => setSel(i)}
                  style={{
                    border: `1.5px solid ${active ? s.color : '#dbe3ef'}`,
                    background: active ? `${s.color}14` : '#fff',
                    borderRadius: 10,
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 700,
                    color: active ? s.color : '#475569',
                    boxShadow: active ? `0 2px 8px ${s.color}33` : 'none',
                  }}
                >
                  {s.name}
                </button>
                <span
                  style={{
                    fontSize: 12,
                    color: active ? s.color : '#94a3b8',
                    border: `1px dashed ${active ? s.color : '#dbe3ef'}`,
                    borderRadius: 6,
                    padding: '1px 6px',
                    background: active ? `${s.color}0d` : 'transparent',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.artifact}
                </span>
              </div>
              {i < SPEC_STAGES.length - 1 && <span style={{ color: '#94a3b8', fontSize: 14, padding: '8px 3px 0' }}>→</span>}
            </div>
          );
        })}
      </div>

      {/* 左：阶段说明；右：产物示例片段 */}
      <div style={{ display: 'flex', gap: 12, marginTop: 14, alignItems: 'stretch', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px', ...detailCard(cur.color), marginTop: 0 }}>
          <b style={{ color: cur.color }}>
            {cur.name} · 产物：{cur.artifact}
          </b>
          <div>{cur.brief}</div>
        </div>
        <pre
          style={{
            flex: '2 1 300px',
            minWidth: 260,
            margin: 0,
            padding: '10px 14px',
            borderRadius: 10,
            background: '#0f172a',
            color: '#e2e8f0',
            fontSize: 12,
            lineHeight: 1.75,
            fontFamily: 'var(--font-mono, monospace)',
            overflowX: 'auto',
          }}
        >
          {cur.snippet}
        </pre>
      </div>

      <div className="diagram-caption">
        规格驱动的核心：<b>把"聪明"花在 Spec 上，把"勤奋"留给 Agent。</b>
        AC 写得越可验收，Execute 与 Verify 就越不需要人盯。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   5. 自治等级 L0-L4 阶梯
   ══════════════════════════════════════════════ */

const AUTONOMY_LEVELS = [
  { code: 'L0', name: '人工执行', tool: 'IDE 补全', human: '每行代码都由人写，AI 只做被动补全', risk: 1, riskLabel: '低', color: '#22c55e' },
  { code: 'L1', name: '内联聊天', tool: '内联聊天 / 单文件问答', human: '人逐条接受或拒绝 AI 建议（Tab / Esc）', risk: 2, riskLabel: '低-中', color: '#2f6bff' },
  { code: 'L2', name: '任务委托', tool: '任务委托 + diff 确认', human: '人审查 Agent 产出的 diff，确认后才应用', risk: 3, riskLabel: '中', color: '#f59e0b' },
  { code: 'L3', name: '后台多任务', tool: '多任务并行 + 检查点审批', human: '人在关键检查点审批，其余时间可以离场', risk: 4, riskLabel: '中-高', color: '#f97316' },
  { code: 'L4', name: '全自治', tool: '自主规划-执行-验证闭环', human: '只在事后抽查结果与指标（告警驱动）', risk: 5, riskLabel: '高', color: '#ef4444' },
];

export function AutonomyLadderDemo() {
  const [lvl, setLvl] = useState(2);
  const cur = AUTONOMY_LEVELS[lvl];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">自治等级阶梯：从 IDE 补全到全自治</figcaption>

      {/* 阶梯：高度随等级递增 */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 188, marginTop: 4 }}>
        {AUTONOMY_LEVELS.map((l, i) => {
          const active = i === lvl;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => setLvl(i)}
              style={{
                flex: 1,
                height: 62 + i * 31,
                border: `1.5px solid ${active ? l.color : '#dbe3ef'}`,
                background: active ? `${l.color}14` : '#fff',
                borderRadius: 10,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                paddingTop: 9,
                boxShadow: active ? `0 2px 10px ${l.color}33` : 'none',
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 13.5, color: active ? l.color : '#475569' }}>{l.code}</span>
              <span style={{ fontSize: 12, color: '#64748b' }}>{l.name}</span>
            </button>
          );
        })}
      </div>

      <div className="slider-row" style={{ marginTop: 14, maxWidth: 420 }}>
        <div className="slider-label">
          自治等级（拖动或点击台阶）<b>
            {cur.code} · {cur.name}
          </b>
        </div>
        <input type="range" min={0} max={4} value={lvl} onChange={(e) => setLvl(Number(e.target.value))} />
      </div>

      <div style={detailCard(cur.color)}>
        <div>
          <b style={{ color: cur.color }}>典型工具形态：</b>
          {cur.tool}
        </div>
        <div>
          <b style={{ color: cur.color }}>人类介入点：</b>
          {cur.human}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <b style={{ color: cur.color }}>风险等级：</b>
          <div style={{ flex: 1, maxWidth: 220, height: 8, borderRadius: 4, background: '#eef2f7', overflow: 'hidden' }}>
            <div style={{ width: `${cur.risk * 20}%`, height: '100%', background: cur.color, transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: 12.5, color: cur.color, fontWeight: 700 }}>{cur.riskLabel}</span>
        </div>
      </div>

      <div className="diagram-caption">
        等级每升一级，人的<b>审批带宽</b>就被压缩一次。升级的正确姿势：<b>先在低等级建立信任与护栏，再逐级放权</b>——
        而不是一上来就 L4。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   6. 权限模式与沙箱边界
   ══════════════════════════════════════════════ */

type PermActionKey = 'read' | 'write' | 'cmd' | 'net';

const PERM_ACTIONS: { key: PermActionKey; label: string }[] = [
  { key: 'read', label: '读文件' },
  { key: 'write', label: '写文件' },
  { key: 'cmd', label: '跑命令' },
  { key: 'net', label: '联网' },
];

const PERM_SYMBOL_COLOR: Record<string, string> = { '✓': '#22c55e', '⚠': '#f59e0b', '✗': '#cbd5e1' };

const PERM_MODES: { name: string; cn: string; color: string; matrix: Record<PermActionKey, string>; desc: string; incidents: string[] }[] = [
  {
    name: 'Read-only',
    cn: '只读',
    color: '#22c55e',
    matrix: { read: '✓', write: '✗', cmd: '✗', net: '✗' },
    desc: '最安全：适合代码调研、解释、评审类任务。',
    incidents: ['让 Agent 修 bug 却没给写权限——它只能输出补丁文本，人工粘贴时贴错位置，引入新 bug。'],
  },
  {
    name: 'Ask-to-edit',
    cn: '编辑前询问',
    color: '#2f6bff',
    matrix: { read: '✓', write: '⚠', cmd: '✗', net: '✗' },
    desc: '每次写盘前弹确认：默认安全，但依赖人真的在审。',
    incidents: ['确认弹窗太频繁，开发者养成"无脑回车"习惯，人工把关流形同虚设。'],
  },
  {
    name: 'Auto-edit',
    cn: '自动编辑',
    color: '#f59e0b',
    matrix: { read: '✓', write: '✓', cmd: '⚠', net: '⚠' },
    desc: '文件编辑自动通过；跑命令与联网仍需确认。',
    incidents: ['一次"顺手"的批量重构无人审查，20 个文件被改坏，靠 git revert 才恢复。'],
  },
  {
    name: 'YOLO',
    cn: '跳过所有确认',
    color: '#ef4444',
    matrix: { read: '✓', write: '✓', cmd: '✓', net: '✓' },
    desc: '危险：全部动作免确认，只适合一次性隔离沙箱。',
    incidents: ['Agent 执行 rm -rf 清理"临时目录"，删掉了未提交的本地改动；另一次 curl | bash 拉到了被投毒的脚本。'],
  },
];

export function PermissionModesDemo() {
  const [sel, setSel] = useState(1);
  const cur = PERM_MODES[sel];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">权限模式与沙箱边界：动作矩阵</figcaption>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {PERM_MODES.map((m, i) => {
          const active = i === sel;
          return (
            <button
              key={m.name}
              type="button"
              onClick={() => setSel(i)}
              style={{
                flex: '1 1 150px',
                border: `1.5px solid ${active ? m.color : '#dbe3ef'}`,
                borderTop: `3px solid ${m.color}`,
                background: active ? `${m.color}0d` : '#fff',
                borderRadius: 10,
                padding: '9px 12px',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: active ? `0 2px 10px ${m.color}30` : 'none',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, color: m.color, fontFamily: 'var(--font-mono, monospace)' }}>{m.name}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>{m.cn}</div>
              {PERM_ACTIONS.map((a) => (
                <div key={a.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '2px 0' }}>
                  <span style={{ color: '#475569' }}>{a.label}</span>
                  <span style={{ color: PERM_SYMBOL_COLOR[m.matrix[a.key]], fontWeight: 700 }}>{m.matrix[a.key]}</span>
                </div>
              ))}
            </button>
          );
        })}
      </div>

      <div style={detailCard(cur.color)}>
        <div>
          <b style={{ color: cur.color }}>{cur.name}</b>：{cur.desc}
        </div>
        <div style={{ marginTop: 4 }}>
          <b style={{ color: cur.color }}>⚠ 典型误用事故：</b>
          {cur.incidents[0]}
        </div>
      </div>

      <div className="diagram-caption">
        <b>最小权限原则：先给最少，按需升级。</b>✓ 允许 · ⚠ 需确认 · ✗ 禁止。
        权限是沙箱的边界——边界画在哪，事故就止步在哪。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   7. AI 代码验收流水线（五站门禁）
   ══════════════════════════════════════════════ */

const REVIEW_STATIONS = [
  {
    name: '单元测试',
    rate: 45,
    color: '#2f6bff',
    sample: `FAIL  src/auth/limiter.test.ts > AC1 连续5次失败后锁定
  expected: 429    received: 200
  → 锁定计时逻辑未生效（limiter.ts:58）`,
  },
  {
    name: '静态扫描',
    rate: 25,
    color: '#7c5cff',
    sample: `src/auth/login.ts:42  severity: ERROR  rule: sql-injection
  字符串拼接构造 SQL，建议改用参数化查询
  （Semgrep 风格 finding）`,
  },
  {
    name: '安全检查',
    rate: 10,
    color: '#0891b2',
    sample: `⚠ CVE-2026-1234  fastjson < 2.0.57  高危
  影响反序列化入口 /api/import
  建议：升级依赖并补回归测试`,
  },
  {
    name: 'AI 审查',
    rate: 15,
    color: '#f59e0b',
    sample: `comment#2（置信度 0.86）：
  错误路径未释放连接池，建议 try/finally 包裹；
  重试未设上限，可能放大故障。`,
  },
  {
    name: '人工复核',
    rate: 5,
    color: '#22c55e',
    sample: `approved with comments（@senior）
  只看机器答不了的判断题：
  "重试策略是否符合产品对可用性的承诺？"`,
  },
];

export function ReviewPipelineDemo() {
  const [sel, setSel] = useState(1);
  const cur = REVIEW_STATIONS[sel];

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">AI 代码验收流水线：五站门禁</figcaption>

      {/* 五站流水线 */}
      <div style={{ display: 'flex', alignItems: 'stretch', flexWrap: 'wrap', gap: 8 }}>
        {REVIEW_STATIONS.map((s, i) => {
          const active = i === sel;
          return (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', flex: '1 1 100px', minWidth: 96 }}>
              <button
                type="button"
                onClick={() => setSel(i)}
                style={{
                  flex: 1,
                  border: `1.5px solid ${active ? s.color : '#dbe3ef'}`,
                  background: active ? `${s.color}0f` : '#fff',
                  borderRadius: 10,
                  padding: '8px 10px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  boxShadow: active ? `0 2px 10px ${s.color}30` : 'none',
                }}
              >
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                  拦截率 {s.rate}%
                </div>
                <div style={{ height: 6, borderRadius: 3, background: '#eef2f7', overflow: 'hidden' }}>
                  <div style={{ width: `${s.rate}%`, height: '100%', background: s.color }} />
                </div>
                <div style={{ marginTop: 6, fontWeight: 700, fontSize: 13, color: active ? s.color : '#334155' }}>
                  {i + 1}. {s.name}
                </div>
              </button>
              {i < REVIEW_STATIONS.length - 1 && <span style={{ color: '#94a3b8', fontSize: 14, padding: '0 3px' }}>→</span>}
            </div>
          );
        })}
      </div>

      {/* 选中站的样例输出 */}
      <pre
        style={{
          margin: '12px 0 0',
          padding: '10px 14px',
          borderRadius: 10,
          border: `1px solid ${cur.color}55`,
          background: `${cur.color}0a`,
          fontSize: 12,
          lineHeight: 1.75,
          fontFamily: 'var(--font-mono, monospace)',
          color: '#334155',
          overflowX: 'auto',
        }}
      >
        {`[${cur.name} 样例输出]\n` + cur.sample}
      </pre>

      <div className="diagram-caption">
        🚧 <b>门禁规则：五站串行执行，任一站红灯即阻断合并。</b>
        拦截率为示意数据——注意它按成本左移排序：越便宜的站拦得越多，人力只花在机器答不了的地方。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   8. Software Factory 闭环
   ══════════════════════════════════════════════ */

const FACTORY_NODES = [
  { label: '任务队列', color: '#64748b', input: '产品需求、bug 报告、用户反馈', output: '结构化任务卡（含验收标准）', auto: '工单机器人自动分诊、去重、排优先级' },
  { label: '规划', color: '#2f6bff', input: '任务卡', output: 'spec + 技术方案', auto: 'LLM 起草 spec，人只审关键假设' },
  { label: '执行', color: '#7c5cff', input: 'spec + 技术方案', output: '代码 diff + 自测记录', auto: '编码 Agent 小步提交，CI 跑测试矩阵' },
  { label: '验证', color: '#f59e0b', input: '代码 diff', output: '测试 / 审查报告', auto: '单测 + 静态扫描 + AI 审查流水线' },
  { label: '报告/度量', color: '#22c55e', input: '整轮过程记录', output: '指标面板与改进项', auto: '仪表盘自动汇总，回流为下一轮任务' },
];

export function FactoryLoopDemo() {
  const [sel, setSel] = useState(0); // 点击选中的节点（看详情）
  const [pos, setPos] = useState(0); // 跑一轮时高亮的节点
  const [rounds, setRounds] = useState(0); // 已完成轮数

  const cur = FACTORY_NODES[sel];

  // 跑一轮：每点一次前进一步，走满 5 站记一轮
  const runStep = () => {
    if (pos >= FACTORY_NODES.length - 1) {
      setPos(0);
      setRounds((r) => r + 1);
    } else {
      setPos((p) => p + 1);
    }
  };

  const cx = 320;
  const cy = 150;
  const R = 96;
  const m = Math.min(rounds, 10); // 指标改良封顶，避免无限漂移
  const metrics = [
    { label: '一次通过率', value: `${55 + m * 3}%` },
    { label: '返工率', value: `${Math.max(8, 25 - m * 2)}%` },
    { label: '成本/轮', value: `$${Math.max(2, 4.2 - m * 0.15).toFixed(1)}` },
  ];

  // 五个节点均匀分布，从顶部开始
  const nodes = FACTORY_NODES.map((n, i) => ({ ...n, angle: -90 + i * 72 }));

  return (
    <figure className="diagram-block">
      <figcaption className="diagram-title">Software Factory 闭环：队列 → 规划 → 执行 → 验证 → 度量</figcaption>

      <svg viewBox="0 0 640 300" style={CS_SVG_STYLE} role="img" aria-label="Software Factory 闭环">
        <defs>
          <marker id="cs146s-factory-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="#cbd5e1" />
          </marker>
        </defs>

        {/* 五段循环弧线 */}
        {nodes.map((n, i) => {
          const a1 = n.angle + 24;
          let a2 = nodes[(i + 1) % nodes.length].angle - 24;
          if (a2 <= a1) a2 += 360;
          return (
            <path
              key={`arc-${n.label}`}
              d={arcPath(cx, cy, R, a1, a2)}
              fill="none"
              stroke={i === pos ? n.color : '#cbd5e1'}
              strokeWidth={i === pos ? 2.4 : 1.6}
              markerEnd="url(#cs146s-factory-arrow)"
              style={{ transition: 'stroke 0.4s' }}
            />
          );
        })}

        {/* 五个节点 */}
        {nodes.map((n) => {
          const p = polar(cx, cy, R, n.angle);
          const running = n.label === FACTORY_NODES[pos].label;
          const selected = n.label === cur.label;
          return (
            <g key={n.label} onClick={() => setSel(n.label === cur.label ? -1 : nodes.findIndex((x) => x.label === n.label))} style={{ cursor: 'pointer' }}>
              <circle
                cx={p.x}
                cy={p.y}
                r={running ? 32 : 29}
                fill={running ? n.color : `${n.color}16`}
                stroke={n.color}
                strokeWidth={selected ? 3 : 1.5}
                style={{ transition: 'all 0.4s ease' }}
              />
              <text x={p.x} y={p.y + 4.5} textAnchor="middle" fontSize={12.5} fontWeight={700} fill={running ? '#fff' : n.color}>
                {n.label}
              </text>
            </g>
          );
        })}

        {/* 中心度量指标 */}
        <circle cx={cx} cy={cy} r={58} fill="#f8faff" stroke="#c7d4ff" strokeWidth={1.5} />
        <text x={cx} y={cy - 26} textAnchor="middle" fontSize={12} fontWeight={700} fill="#475569">
          度量指标
        </text>
        {metrics.map((mt, i) => (
          <text key={mt.label} x={cx} y={cy - 4 + i * 19} textAnchor="middle" fontSize={11.5} fill="#64748b">
            {mt.label} <tspan fontWeight={700} fill="#2f6bff">{mt.value}</tspan>
          </text>
        ))}
      </svg>

      <div style={detailCard(cur.color)}>
        {sel >= 0 ? (
          <>
            <b style={{ color: cur.color }}>{cur.label}</b>
            <div>
              <b>输入：</b>
              {cur.input}
            </div>
            <div>
              <b>输出：</b>
              {cur.output}
            </div>
            <div>
              <b>自动化手段：</b>
              {cur.auto}
            </div>
          </>
        ) : (
          <div style={{ color: '#64748b' }}>点击环形上的任意节点，查看该阶段的输入 / 输出 / 自动化手段。</div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap', fontSize: 12.5 }}>
        <button type="button" className="apriori-play-btn" onClick={runStep}>
          跑一轮 ▸
        </button>
        <button
          type="button"
          className="apriori-step-btn"
          onClick={() => {
            setPos(0);
            setRounds(0);
          }}
        >
          重置
        </button>
        <span style={{ color: '#64748b' }}>
          已完成轮数 <b>{rounds}</b> · 本轮进度 {pos} / 5
        </span>
      </div>

      <div className="diagram-caption">
        闭环的价值在<b>度量回流</b>：报告站的指标变成下一轮的任务——一次通过率升、返工率降，工厂才算在"学习"，
        而不只是"运转"。
      </div>
    </figure>
  );
}
