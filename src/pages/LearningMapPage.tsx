/**
 * 地铁图式学习路径：把某个学科下的子课程按依赖关系画成一张地图。
 *
 * 数据来源：
 *  - 大模型学科：COURSE_SERIES 中 domainId='ai' 的 9 门子课程
 *  - 数据挖掘学科：domainId='mining' 的 5 门子课程
 *
 * 每门子课程是一个「站点」，显示进度环与题量；
 * 前置课程未完成时站点灰显；用 SVG 曲线连接成「地铁线路」。
 */

import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCourses, courseStats } from '../content';
import { mineSeriesByDomain, seriesByGroup } from '../content/series';
import { useContent } from '../store/contentStore';
import { chapterProgress } from '../store/studyState';
import type { Course } from '../types';
import './learning-map.css';

interface Station {
  seriesId: string;
  course?: Course;
  title: string;
  icon: string;
  color: string;
  x: number;
  y: number;
  done: number;
  total: number;
  ratio: number;
  locked: boolean;
  lockedBy: string[];
  goal: string;
  hours: number;
}

/** 各学科的地铁图布局（百分比坐标） */
const LAYOUTS: Record<string, Record<string, { x: number; y: number }>> = {
  // 大模型：地基(左) → 进阶(中) → 应用(右)
  ai: {
    'deep-learning': { x: 5, y: 42 },
    'llm-a1': { x: 10, y: 22 },
    'llm-a2': { x: 10, y: 62 },
    'llm-a3': { x: 30, y: 42 },
    'llm-a4': { x: 47, y: 16 },
    'llm-a5': { x: 47, y: 70 },
    'llm-b1': { x: 64, y: 60 },
    'llm-b2': { x: 83, y: 24 },
    'llm-b3': { x: 83, y: 78 },
    'llm-b4': { x: 64, y: 18 },
  },
  // AI 自动化：基础(左) → 进阶(中) → 应用(右)
  'ai-auto': {
    'ai-auto-m1': { x: 12, y: 30 },
    'ai-auto-m2': { x: 12, y: 72 },
    'ai-auto-m3': { x: 42, y: 22 },
    'ai-auto-m4': { x: 42, y: 70 },
    'ai-auto-m5': { x: 76, y: 46 },
  },
  // 数据挖掘：基础(左) → 进阶(中) → 应用(右)
  mining: {
    'mining-prep': { x: 12, y: 26 },
    'mining-freq': { x: 12, y: 70 },
    'mining-cluster': { x: 40, y: 20 },
    'mining-recsys': { x: 40, y: 68 },
    'mining-graph': { x: 76, y: 44 },
  },
  // 量化交易：基础(左) → 核心策略(中) → 实战(右)
  quant: {
    'quant-market': { x: 8, y: 24 },
    'quant-math': { x: 8, y: 72 },
    'quant-python': { x: 26, y: 24 },
    'quant-data': { x: 26, y: 72 },
    'quant-strategy': { x: 46, y: 24 },
    'quant-backtest': { x: 46, y: 72 },
    'quant-portfolio': { x: 66, y: 24 },
    'quant-ml': { x: 66, y: 72 },
    'quant-live': { x: 86, y: 32 },
    'quant-project': { x: 86, y: 70 },
  },
  // 论文导读：基础(左) → 进阶(中) → 应用(右)
  paper: {
    'paper-foundation': { x: 10, y: 26 },
    'paper-vision': { x: 10, y: 72 },
    'paper-transformer': { x: 36, y: 26 },
    'paper-reasoning': { x: 36, y: 72 },
    'paper-training': { x: 72, y: 26 },
    'paper-theory': { x: 72, y: 72 },
  },
  // AI 原生软件工程：基础 → 工具与协作(上/下双排) → 组织级工程 → 收官
  'ai-native': {
    'cs146s-w1': { x: 7, y: 26 },
    'cs146s-w2': { x: 17, y: 72 },
    'cs146s-w3': { x: 26, y: 26 },
    'cs146s-w4': { x: 36, y: 72 },
    'cs146s-w5': { x: 45, y: 26 },
    'cs146s-w6': { x: 55, y: 72 },
    'cs146s-w7': { x: 63, y: 26 },
    'cs146s-w8': { x: 74, y: 72 },
    'cs146s-w9': { x: 80, y: 26 },
    'cs146s-w10': { x: 92, y: 26 },
    'cs146s-final': { x: 92, y: 72 },
  },
};

/** 线路连接关系 */
const LINKS: Record<string, [string, string][]> = {
  ai: [
    ['deep-learning', 'llm-a1'],
    ['deep-learning', 'llm-a2'],
    ['llm-a1', 'llm-a3'],
    ['llm-a2', 'llm-a3'],
    ['llm-a3', 'llm-a4'],
    ['llm-a3', 'llm-b1'],
    ['llm-a1', 'llm-a5'],
    ['llm-a3', 'llm-b4'],
    ['llm-b1', 'llm-b2'],
    ['llm-a3', 'llm-b2'],
    ['llm-b1', 'llm-b3'],
    ['llm-b2', 'llm-b3'],
  ],
  'ai-auto': [
    ['ai-auto-m1', 'ai-auto-m3'],
    ['ai-auto-m1', 'ai-auto-m4'],
    ['ai-auto-m2', 'ai-auto-m3'],
    ['ai-auto-m2', 'ai-auto-m4'],
    ['ai-auto-m3', 'ai-auto-m5'],
    ['ai-auto-m4', 'ai-auto-m5'],
  ],
  mining: [
    ['mining-prep', 'mining-cluster'],
    ['mining-prep', 'mining-recsys'],
    ['mining-freq', 'mining-cluster'],
    ['mining-freq', 'mining-recsys'],
    ['mining-cluster', 'mining-graph'],
    ['mining-recsys', 'mining-graph'],
  ],
  quant: [
    ['quant-market', 'quant-python'],
    ['quant-math', 'quant-data'],
    ['quant-python', 'quant-data'],
    ['quant-data', 'quant-strategy'],
    ['quant-strategy', 'quant-backtest'],
    ['quant-backtest', 'quant-portfolio'],
    ['quant-strategy', 'quant-ml'],
    ['quant-portfolio', 'quant-live'],
    ['quant-ml', 'quant-project'],
    ['quant-live', 'quant-project'],
  ],
  paper: [
    // 基础 → 进阶
    ['paper-foundation', 'paper-transformer'],
    ['paper-foundation', 'paper-reasoning'],
    ['paper-vision', 'paper-transformer'],
    ['paper-vision', 'paper-reasoning'],
    // 进阶 → 应用
    ['paper-transformer', 'paper-training'],
    ['paper-transformer', 'paper-theory'],
    ['paper-reasoning', 'paper-training'],
    ['paper-reasoning', 'paper-theory'],
    // 进阶内部互连
    ['paper-transformer', 'paper-reasoning'],
  ],
  'ai-native': [
    // 官方周序主线（prerequisites 链）
    ['cs146s-w1', 'cs146s-w2'],
    ['cs146s-w2', 'cs146s-w3'],
    ['cs146s-w3', 'cs146s-w4'],
    ['cs146s-w4', 'cs146s-w5'],
    ['cs146s-w5', 'cs146s-w6'],
    ['cs146s-w6', 'cs146s-w7'],
    ['cs146s-w7', 'cs146s-w8'],
    ['cs146s-w8', 'cs146s-w9'],
    ['cs146s-w9', 'cs146s-w10'],
    ['cs146s-w10', 'cs146s-final'],
    // 换乘线：上下文工程(W3) 直通安全(W6) —— 投毒失效是注入威胁的机制基础
    ['cs146s-w3', 'cs146s-w6'],
  ],
};

/** 各学科地图的展示信息 */
const MAP_META: Record<
  string,
  { title: string; icon: string; badge: string; desc: string; entry: string; groups: string[] }
> = {
  ai: {
    title: '深度学习与大模型学习地图',
    icon: '🗺️',
    badge: '10 门课程 · 依次解锁',
    desc: '从深度学习基石到大模型前沿架构，知识层层递进。这张图把 10 门课程按依赖关系串成一条路线——',
    entry: 'deep-learning',
    groups: ['地基', '进阶', '应用'],
  },
  'ai-auto': {
    title: 'AI 自动化学习地图',
    icon: '⚡',
    badge: '5 条线路 · 依次解锁',
    desc: 'AI 自动化的核心是「让模型可靠地完成任务」。这张图把 5 门子课程按依赖关系串成一条路线——',
    entry: 'ai-auto-m1',
    groups: ['基础', '进阶', '应用'],

  },
  mining: {
    title: '数据挖掘学习地图',
    icon: '⛏️',
    badge: '5 条线路 · 依次解锁',
    desc: '数据挖掘的核心是「从数据里找模式」。这张图把 5 门子课程按依赖关系串成一条路线——',
    entry: 'mining-prep',
    groups: ['基础', '进阶', '应用'],

  },
  quant: {
    title: '量化交易学习地图',
    icon: '📈',
    badge: '10 条线路 · 循序渐进',
    desc: '从市场机制与金融数理出发，打牢数据与策略底座，最终贯通组合风控与实盘系统——',
    entry: 'quant-market',
    groups: ['基础', '进阶', '实战'],

  },
  paper: {
    title: 'AI 论文导读学习地图',
    icon: '📚',
    badge: '6 条线路 · 30 篇经典论文',
    desc: '从 30 篇奠定现代 AI 的经典论文中提炼主线。这张图把 6 个系列按依赖关系串成一条路线——',
    entry: 'paper-foundation',
    groups: ['基础', '进阶', '应用'],
  },
  'ai-native': {
    title: 'AI 原生软件工程学习地图',
    icon: '🧑‍💻',
    badge: '11 门课程 · 官方 10 周 + 毕业项目',
    desc: 'Stanford CS146S Fall 2026 同构路线：从 LLM 基础到 Agent 工具链与规范驱动开发，再到组织级的安全、审查与运维，最终建成 Software Factory——',
    entry: 'cs146s-w1',
    groups: ['基础', '工具与协作', '组织级工程', '收官'],
  },
};

export function LearningMapPage() {
  // 学科由路由参数决定：/learning-map 默认 ai，/learning-map/:domain 指定
  const { domain } = useParams<{ domain?: string }>();
  const domainId = domain && MAP_META[domain] ? domain : 'ai';
  const meta = MAP_META[domainId];

  const content = useContent();
  const courses = useMemo(() => getCourses(), [content]);

  const seriesList = useMemo(() => mineSeriesByDomain(domainId), [domainId]);

  const stations: Station[] = useMemo(() => {
    const bySeries = new Map(courses.filter((c) => c.seriesId).map((c) => [c.seriesId!, c]));
    const layout = LAYOUTS[domainId] ?? {};

    return seriesList.map((s) => {
      const course = bySeries.get(s.id);
      const pos = layout[s.id] ?? { x: 50, y: 50 };
      let done = 0;
      let total = 0;
      if (course) {
        for (const ch of course.chapters) {
          const p = chapterProgress(ch);
          done += p.done;
          total += p.total;
        }
      }
      // stage 1 的课程不锁，保证新用户能进第一站
      const isEntry = s.stage === 1;
      const prereqs = course?.prerequisites ?? [];
      const lockedBy = isEntry
        ? []
        : prereqs.filter((pid) => {
            const pc = courses.find((c) => c.id === pid);
            if (!pc || !pc.seriesId) return false;
            const st = courseStats(pc);
            const d = pc.chapters.reduce((acc, ch) => acc + chapterProgress(ch).done, 0);
            return d < st.exercises * 0.6;
          });

      return {
        seriesId: s.id,
        course,
        title: course?.title ?? s.title,
        icon: s.icon,
        color: s.color,
        x: pos.x,
        y: pos.y,
        done,
        total,
        ratio: total ? done / total : 0,
        locked: lockedBy.length > 0,
        lockedBy,
        goal: s.goal,
        hours: course?.estimatedHours ?? 0,
      };
    });
  }, [courses, seriesList, domainId]);

  const stationMap = useMemo(() => new Map(stations.map((s) => [s.seriesId, s])), [stations]);
  const links = LINKS[domainId] ?? [];

  return (
    <div className="learning-map-page">
      <div className="row" style={{ marginBottom: 6 }}>
        <h1 className="practice-title" style={{ margin: 0 }}>
          {meta.icon} {meta.title}
        </h1>
        <span className="badge badge-blue">{meta.badge}</span>
        <div className="spacer" />
        <Link to={`/course/${meta.entry}`} className="btn btn-sm btn-primary">
          从第一站开始 →
        </Link>
      </div>
      <p className="section-desc">
        {meta.desc}
        {domainId === 'ai' ? (
          <>
            <b>先打好地基（A1 从零手写 / A2 训练原理），再进入进阶（A3 LLaMA / A4 MoE / A5 数据工程），
            最后是应用（RAG / Agent / 部署 / 后训练）</b>。
          </>
        ) : domainId === 'ai-native' ? (
          <>
            <b>先用一周打好 LLM 与提示词地基（W1），再掌握 Agent 工具链（W2 解剖 / W3 上下文 / W4 协作 /
            W5 终端），转入组织级工程（W6 安全 / W7 审查 / W8 构建 / W9 运维），最后以 Software Factory
            毕业项目收官（对应官方占分 80% 的 Final Project）</b>。
          </>
        ) : domainId === 'mining' ? (
          <>
            <b>先打好基础（M1 预处理 / M2 频繁模式），再进入进阶（M3 聚类降维 / M4 推荐系统），
            最后到应用（M5 图挖掘与异常检测）</b>。
          </>
        ) : domainId === 'paper' ? (
          <>
            <b>先读基础（基础与表征 RNN/Attention / 视觉架构 AlexNet→ResNet），
            再进入进阶（Transformer 家族 / 记忆与推理 NTM/指针网络），
            最后是应用（训练与规模 Scaling Laws/RLHF / 理论与复杂度 MDL/柯尔莫哥洛夫）</b>。
            每条线路都配可运行代码与交互图示。
          </>
        ) : (
          <>
            <b>先建立认知（M1 基础 / M2 Agent 架构），再进入进阶（M3 业务流程 / M4 代码与文档），
            最后到生产化（M5 评估安全运维）</b>。
          </>
        )}
        前置课程完成 60% 后自动解锁下一站。
      </p>

      {/* 地铁图主体 */}
      <div className="metro-map">
        <svg className="metro-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#7c5cff" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>
          </defs>
          {links.map(([a, b], i) => {
            const sa = stationMap.get(a);
            const sb = stationMap.get(b);
            if (!sa || !sb) return null;
            const bothUnlocked = !sa.locked && !sb.locked;
            const active = sa.ratio > 0.6 || sb.ratio > 0.6;
            const mx = (sa.x + sb.x) / 2;
            const my = (sa.y + sb.y) / 2 - 8;
            return (
              <path
                key={i}
                d={`M ${sa.x} ${sa.y} Q ${mx} ${my} ${sb.x} ${sb.y}`}
                className={`metro-link ${bothUnlocked ? 'unlocked' : ''} ${active ? 'active' : ''}`}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>

        {stations.map((s) => (
          <MetroStation key={s.seriesId} station={s} />
        ))}
      </div>

      {/* 系列分组说明 */}
      <div className="metro-legend">
        {seriesByGroup(domainId).map(({ group, items }) => (
          <div key={group} className="metro-legend-group">
            <div className="metro-legend-title">{group}</div>
            <div className="metro-legend-items">
              {items.map((s) => {
                const st = stationMap.get(s.id);
                return (
                  <Link
                    key={s.id}
                    to={st?.course ? `/course/${st.course.id}` : '#'}
                    className="metro-legend-item"
                  >
                    <span className="metro-legend-dot" style={{ background: s.color }} />
                    <span>
                      {s.icon} {s.title}
                    </span>
                    {st && st.total > 0 && (
                      <span className="muted" style={{ fontSize: 11 }}>
                        {Math.round(st.ratio * 100)}%
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 学科切换 */}
      <div className="row" style={{ marginTop: 22, gap: 10 }}>
        <span className="muted" style={{ fontSize: 13 }}>
          其他学科地图：
        </span>
        {Object.entries(MAP_META)
          .filter(([id]) => id !== domainId)
          .map(([id, m]) => (
            <Link key={id} to={id === 'ai' ? '/learning-map' : `/learning-map/${id}`} className="btn btn-sm">
              {m.icon} {m.title}
            </Link>
          ))}
      </div>
    </div>
  );
}

function MetroStation({ station }: { station: Station }) {
  const { course, ratio, locked, lockedBy } = station;
  const pct = Math.round(ratio * 100);
  const circumference = 2 * Math.PI * 16;
  const dash = (pct / 100) * circumference;

  const inner = (
    <div className={`metro-station ${locked ? 'locked' : ''}`}>
      <div className="metro-ring">
        <svg viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="16" className="metro-ring-bg" />
          <circle
            cx="20"
            cy="20"
            r="16"
            className="metro-ring-fg"
            stroke={station.color}
            strokeDasharray={`${dash} ${circumference}`}
            transform="rotate(-90 20 20)"
          />
        </svg>
        <span className="metro-icon">{locked ? '🔒' : station.icon}</span>
      </div>
      <div className="metro-label">
        <div className="metro-label-title">{station.title}</div>
        <div className="metro-label-meta">
          {locked
            ? `需先完成：${lockedBy.join('、')}`
            : station.total > 0
              ? `${pct}% · ${station.done}/${station.total} 题`
              : '内容准备中'}
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="metro-station-wrap"
      style={{ left: `${station.x}%`, top: `${station.y}%` }}
      title={station.goal}
    >
      {course && !locked ? (
        <Link to={`/course/${course.id}`} className="metro-station-link">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </div>
  );
}
