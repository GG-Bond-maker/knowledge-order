/**
 * 首页大屏：全屏数据可视化仪表盘。
 *
 * 设计：深色科技风 + ECharts 动效，左侧为学习侧栏（导航与今日目标），
 * 右侧为 KPI 卡片 + 多维图表（进度柱状、学习曲线、热力图、题型雷达、连续打卡）。
 * 数据完全来自本地 localStorage 的学习记录，实时响应。
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { getCourses, courseStats, siteStats } from '../content';
import { useContent } from '../store/contentStore';
import {
  overallAccuracy,
  recentDays,
  todayStr,
  useStudyState,
} from '../store/studyState';
import { TYPE_META } from '../components/ExerciseRunner';
import { dueExerciseIds } from '../store/reviewScheduler';

/** 每秒刷新的时钟 */
function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

function lastNDays(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    out.push(todayStr(x));
  }
  return out;
}

/** 深色主题公共配置 */
const AXIS_STYLE = {
  axisLine: { lineStyle: { color: 'rgba(148,197,255,0.35)' } },
  axisLabel: { color: '#8fb8e6', fontSize: 10 },
  splitLine: { lineStyle: { color: 'rgba(148,197,255,0.12)' } },
};

export function DashboardPage() {
  const state = useStudyState();
  const content = useContent();
  const courseList = useMemo(() => getCourses(), [content]);
  const stats = useMemo(() => siteStats(), [content]);
  const navigate = useNavigate();
  const now = useClock();

  const courseProgress = useMemo(
    () =>
      courseList.map((c) => {
        const s = courseStats(c);
        const done = c.chapters.reduce(
          (acc, ch) => acc + ch.exercises.filter((e) => state.mastery[e.id]?.lastCorrect).length,
          0,
        );
        return { course: c, done, total: s.exercises, pct: s.exercises ? (done / s.exercises) * 100 : 0 };
      }),
    [state.mastery],
  );

  const totalDone = courseProgress.reduce((s, c) => s + c.done, 0);
  const totalPct = stats.exercises ? (totalDone / stats.exercises) * 100 : 0;

  const days30 = useMemo(() => recentDays(30), [state]);
  const today = state.daily[todayStr()];
  const todayAttempts = today?.attempts ?? 0;
  const dailyGoal = 20;

  const totalAttempts = Object.values(state.daily).reduce((s, d) => s + d.attempts, 0);
  const totalCorrect = Object.values(state.daily).reduce((s, d) => s + d.correct, 0);
  const mastered = Object.values(state.mastery).filter((m) => m.consecutiveCorrect >= 2).length;
  const bookmarks = Object.values(state.mastery).filter((m) => m.bookmarked).length;
  const dueToday = dueExerciseIds(state.mastery).length;
  const noteCount = Object.keys(state.notes ?? {}).length;
  const wrongPending = Object.values(state.mastery).filter((m) => m.everWrong && !m.lastCorrect).length;
  const activeDays = Object.values(state.daily).filter((d) => d.attempts > 0).length;
  const riskCount = Object.values(state.mastery).filter((m) => m.consecutiveCorrect < 2).length;
  const minutes = Object.values(state.daily).reduce((s, d) => s + d.minutes, 0);

  // ── 课程进度（横向柱状） ──
  const courseOption = {
    backgroundColor: 'transparent',
    grid: { left: 96, right: 46, top: 8, bottom: 8 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(10,26,48,0.94)',
      borderColor: 'rgba(79,172,254,0.4)',
      textStyle: { color: '#dff1ff', fontSize: 12 },
      formatter: (p: { name: string; value: number; data: { done: number; total: number } }[]) => {
        const d = p[0].data;
        return `${p[0].name}<br/>已掌握 ${d.done} / ${d.total} 题<br/>完成度 <b>${p[0].value.toFixed(1)}%</b>`;
      },
    },
    xAxis: { type: 'value', max: 100, ...AXIS_STYLE, axisLabel: { ...AXIS_STYLE.axisLabel, formatter: '{value}%' } },
    yAxis: {
      type: 'category',
      data: courseProgress.map((c) => c.course.title.slice(0, 6)),
      ...AXIS_STYLE,
      axisLabel: { ...AXIS_STYLE.axisLabel, color: '#bfe0ff', fontSize: 11 },
    },
    series: [
      {
        type: 'bar',
        barWidth: 13,
        showBackground: true,
        backgroundStyle: { color: 'rgba(148,197,255,0.08)', borderRadius: 7 },
        data: courseProgress.map((c) => ({
          value: Number(c.pct.toFixed(1)),
          done: c.done,
          total: c.total,
          itemStyle: {
            borderRadius: 7,
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: `${c.course.color}cc` },
                { offset: 1, color: '#4facfe' },
              ],
            },
          },
        })),
        label: {
          show: true,
          position: 'right',
          formatter: (p: { value: number }) => `${p.value}%`,
          color: '#bfe0ff',
          fontSize: 11,
          fontWeight: 600,
        },
      },
    ],
  };

  // ── 近 30 天学习曲线（面积折线） ──
  const trendOption = {
    backgroundColor: 'transparent',
    grid: { left: 40, right: 40, top: 34, bottom: 26 },
    legend: {
      data: ['作答次数', '正确率'],
      top: 0,
      textStyle: { color: '#8fb8e6', fontSize: 11 },
      itemWidth: 12,
      itemHeight: 8,
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(10,26,48,0.94)',
      borderColor: 'rgba(79,172,254,0.4)',
      textStyle: { color: '#dff1ff', fontSize: 12 },
    },
    xAxis: { type: 'category', boundaryGap: false, data: days30.map((d) => d.date.slice(5)), ...AXIS_STYLE, axisLabel: { ...AXIS_STYLE.axisLabel, fontSize: 9 } },
    yAxis: [
      { type: 'value', name: '次数', ...AXIS_STYLE, nameTextStyle: { color: '#8fb8e6', fontSize: 10 } },
      { type: 'value', name: '正确率%', max: 100, ...AXIS_STYLE, nameTextStyle: { color: '#8fb8e6', fontSize: 10 } },
    ],
    series: [
      {
        name: '作答次数',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        data: days30.map((d) => d.attempts),
        lineStyle: { width: 2.5, color: '#00eaff' },
        itemStyle: { color: '#00eaff' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(0,234,255,0.42)' },
              { offset: 1, color: 'rgba(0,234,255,0)' },
            ],
          },
        },
      },
      {
        name: '正确率',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbol: 'none',
        connectNulls: true,
        data: days30.map((d) => (d.attempts ? Math.round((d.correct / d.attempts) * 100) : null)),
        lineStyle: { width: 2, color: '#ffb547', type: 'dashed' },
        itemStyle: { color: '#ffb547' },
      },
    ],
  };

  // ── 题型雷达 ──
  const typeData = Object.entries(TYPE_META).map(([key, meta]) => {
    let attempts = 0;
    let correct = 0;
    for (const c of courseList) {
      for (const ch of c.chapters) {
        for (const e of ch.exercises) {
          if (e.type !== key) continue;
          const m = state.mastery[e.id];
          if (!m) continue;
          attempts += m.attemptCount;
          correct += m.correctCount;
        }
      }
    }
    return { name: meta.label, value: attempts ? Math.round((correct / attempts) * 100) : 0, attempts };
  });
  const radarOption = {
    backgroundColor: 'transparent',
    tooltip: {
      backgroundColor: 'rgba(10,26,48,0.94)',
      borderColor: 'rgba(79,172,254,0.4)',
      textStyle: { color: '#dff1ff', fontSize: 12 },
    },
    radar: {
      indicator: Object.entries(TYPE_META).map(([, m]) => ({ name: m.label, max: 100 })),
      radius: '64%',
      axisName: { color: '#8fb8e6', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(148,197,255,0.18)' } },
      splitArea: { areaStyle: { color: ['rgba(31,86,168,0.05)', 'rgba(31,86,168,0.12)'] } },
      axisLine: { lineStyle: { color: 'rgba(148,197,255,0.22)' } },
    },
    series: [
      {
        type: 'radar',
        symbolSize: 5,
        data: [
          {
            value: typeData.map((t) => t.value),
            name: '正确率',
            areaStyle: { color: 'rgba(0,234,255,0.22)' },
            lineStyle: { color: '#00eaff', width: 2 },
            itemStyle: { color: '#00eaff' },
          },
        ],
      },
    ],
  };

  // ── 近 15 周打卡热力图 ──
  const heatDays = lastNDays(105);
  const heatData = heatDays.map((d) => [d, state.daily[d]?.attempts ?? 0]);
  const heatMax = Math.max(10, ...heatData.map((x) => x[1] as number));
  const heatOption = {
    backgroundColor: 'transparent',
    tooltip: {
      backgroundColor: 'rgba(10,26,48,0.94)',
      borderColor: 'rgba(79,172,254,0.4)',
      textStyle: { color: '#dff1ff', fontSize: 12 },
      formatter: (p: { value: [string, number] }) => `${p.value[0]}<br/>作答 <b>${p.value[1]}</b> 次`,
    },
    visualMap: {
      min: 0,
      max: heatMax,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      itemWidth: 10,
      itemHeight: 60,
      text: ['多', '少'],
      textStyle: { color: '#8fb8e6', fontSize: 10 },
      inRange: { color: ['rgba(148,197,255,0.06)', '#1f5fa8', '#2f8fe0', '#00eaff'] },
    },
    calendar: {
      top: 26,
      left: 34,
      right: 12,
      range: [heatDays[0], heatDays[heatDays.length - 1]],
      cellSize: ['auto', 13],
      splitLine: { show: false },
      itemStyle: { borderWidth: 2, borderColor: 'rgba(6,20,38,0.9)', color: 'rgba(148,197,255,0.05)' },
      yearLabel: { show: false },
      dayLabel: { nameMap: WEEK, color: '#8fb8e6', fontSize: 10 },
      monthLabel: { color: '#8fb8e6', fontSize: 10 },
    },
    series: [{ type: 'heatmap', coordinateSystem: 'calendar', data: heatData }],
  };

  // ── 打卡连续天数（仪表盘） ──
  const streakOption = {
    backgroundColor: 'transparent',
    series: [
      {
        type: 'gauge',
        startAngle: 220,
        endAngle: -40,
        min: 0,
        max: Math.max(30, state.longestStreak, state.streakDays),
        radius: '92%',
        center: ['50%', '58%'],
        progress: { show: true, width: 10, roundCap: true, itemStyle: { color: '#00eaff' } },
        axisLine: { lineStyle: { width: 10, color: [[1, 'rgba(148,197,255,0.12)']] } },
        pointer: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        anchor: { show: false },
        title: { show: true, offsetCenter: [0, '58%'], color: '#8fb8e6', fontSize: 11 },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, '6%'],
          fontSize: 30,
          fontWeight: 800,
          color: '#ffffff',
          formatter: (v: number) => `${Math.round(v)}`,
        },
        data: [{ value: state.streakDays, name: `当前连续打卡（最长 ${state.longestStreak} 天）` }],
      },
    ],
  };

  // ── 今日目标环形 ──
  const goalPct = Math.min(100, Math.round((todayAttempts / dailyGoal) * 100));
  const goalOption = {
    backgroundColor: 'transparent',
    series: [
      {
        type: 'pie',
        radius: ['64%', '82%'],
        center: ['50%', '50%'],
        startAngle: 90,
        label: { show: false },
        emphasis: { scale: false },
        data: [
          {
            value: goalPct,
            itemStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 1,
                y2: 1,
                colorStops: [
                  { offset: 0, color: '#00eaff' },
                  { offset: 1, color: '#4facfe' },
                ],
              },
              borderRadius: 8,
            },
          },
          {
            value: 100 - goalPct,
            itemStyle: { color: 'rgba(148,197,255,0.1)' },
          },
        ],
      },
    ],
    graphic: [
      {
        type: 'text',
        left: 'center',
        top: '44%',
        style: {
          text: `${todayAttempts}/${dailyGoal}`,
          fill: '#ffffff',
          fontSize: 17,
          fontWeight: 800,
          textAlign: 'center',
        },
      },
    ],
  };

  const kpis = [
    { label: '已掌握习题', value: `${totalDone}`, unit: `/ ${stats.exercises}`, color: '#00eaff', icon: '🎯' },
    { label: '总正确率', value: totalAttempts ? `${Math.round(overallAccuracy(state) * 100)}` : '—', unit: '%', color: '#7cf58a', icon: '✅' },
    { label: '累计作答', value: `${totalAttempts}`, unit: '次', color: '#4facfe', icon: '📝' },
    { label: '今日待复习', value: `${dueToday}`, unit: '题', color: '#ff4d6d', icon: '⏰' },
    { label: '待复习错题', value: `${wrongPending}`, unit: '题', color: '#ff6b81', icon: '🔁' },
    { label: '连续打卡', value: `${state.streakDays}`, unit: '天', color: '#ffb547', icon: '🔥' },
    { label: '学习天数', value: `${activeDays}`, unit: '天', color: '#b47cff', icon: '📅' },
    { label: '我的笔记', value: `${noteCount}`, unit: '条', color: '#ff9ecd', icon: '📝' },
    { label: '练习时长', value: `${Math.round(minutes)}`, unit: '分钟', color: '#5ee7c6', icon: '⏱️' },
  ];

  return (
    <div className="dash-root">
      {/* 顶部标题栏 */}
      <header className="dash-header">
        <div className="dash-title-wrap">
          <div className="dash-logo">DA</div>
          <div>
            <h1 className="dash-title">知序学院 · 学习数据大屏</h1>
            <div className="dash-subtitle">KNOWLEDGE ORDER · LEARNING ANALYTICS DASHBOARD</div>
          </div>
        </div>
        <div className="dash-header-right">
          <div className="dash-clock">
            <span className="dash-clock-time">
              {now.toLocaleTimeString('zh-CN', { hour12: false })}
            </span>
            <span className="dash-clock-date">
              {now.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })} 星期{WEEK[now.getDay()]}
            </span>
          </div>
          <button className="dash-btn" onClick={() => navigate('/')}>
            ← 返回课程
          </button>
        </div>
      </header>

      {/* KPI 条 */}
      <section className="dash-kpis">
        {kpis.map((k) => (
          <div key={k.label} className="dash-kpi" style={{ ['--kpi-color' as string]: k.color }}>
            <div className="dash-kpi-icon">{k.icon}</div>
            <div className="dash-kpi-body">
              <div className="dash-kpi-value">
                {k.value}
                <span className="dash-kpi-unit">{k.unit}</span>
              </div>
              <div className="dash-kpi-label">{k.label}</div>
            </div>
          </div>
        ))}
      </section>

      {/* 主体网格 */}
      <section className="dash-grid">
        {/* 左列 */}
        <div className="dash-col">
          <div className="dash-panel">
            <div className="dash-panel-head">
              <span className="dash-panel-title">课程掌握度</span>
              <span className="dash-panel-tag">总进度 {totalPct.toFixed(1)}%</span>
            </div>
            <div className="dash-chart" style={{ height: 214 }}>
              <ReactECharts option={courseOption} style={{ height: '100%' }} notMerge />
            </div>
          </div>

          <div className="dash-panel">
            <div className="dash-panel-head">
              <span className="dash-panel-title">题型正确率</span>
              <span className="dash-panel-tag">雷达</span>
            </div>
            <div className="dash-chart" style={{ height: 214 }}>
              <ReactECharts option={radarOption} style={{ height: '100%' }} notMerge />
            </div>
          </div>

          <div className="dash-panel">
            <div className="dash-panel-head">
              <span className="dash-panel-title">今日目标</span>
              <span className="dash-panel-tag">{goalPct}%</span>
            </div>
            <div className="dash-chart" style={{ height: 150 }}>
              <ReactECharts option={goalOption} style={{ height: '100%' }} notMerge />
            </div>
            <div className="dash-goal-hint">
              {goalPct >= 100 ? '🎉 今日目标已达成！' : `再完成 ${dailyGoal - todayAttempts} 题达成今日目标`}
            </div>
          </div>
        </div>

        {/* 中列 */}
        <div className="dash-col dash-col-main">
          <div className="dash-panel dash-panel-lg">
            <div className="dash-panel-head">
              <span className="dash-panel-title">近 30 天学习趋势</span>
              <span className="dash-panel-tag">
                共 {totalAttempts} 次作答 · 答对 {totalCorrect} 次
              </span>
            </div>
            <div className="dash-chart" style={{ height: 232 }}>
              <ReactECharts option={trendOption} style={{ height: '100%' }} notMerge />
            </div>
          </div>

          <div className="dash-panel dash-panel-lg">
            <div className="dash-panel-head">
              <span className="dash-panel-title">打卡热力图（近 15 周）</span>
              <span className="dash-panel-tag">最长连续 {state.longestStreak} 天</span>
            </div>
            <div className="dash-chart" style={{ height: 186 }}>
              <ReactECharts option={heatOption} style={{ height: '100%' }} notMerge />
            </div>
          </div>

          <div className="dash-panel dash-panel-lg">
            <div className="dash-panel-head">
              <span className="dash-panel-title">快速继续</span>
              <span className="dash-panel-tag">点击直达</span>
            </div>
            <div className="dash-quick">
              {courseList.map((c) => {
                const p = courseProgress.find((x) => x.course.id === c.id)!;
                return (
                  <Link key={c.id} to={`/course/${c.id}`} className="dash-quick-item" style={{ ['--qc' as string]: c.color }}>
                    <span className="dash-quick-icon">{c.icon}</span>
                    <div className="dash-quick-body">
                      <div className="dash-quick-name">{c.title}</div>
                      <div className="dash-quick-bar">
                        <i style={{ width: `${p.pct}%`, background: c.color }} />
                      </div>
                    </div>
                    <span className="dash-quick-pct">{p.pct.toFixed(0)}%</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* 右列 */}
        <div className="dash-col">
          <div className="dash-panel">
            <div className="dash-panel-head">
              <span className="dash-panel-title">连续打卡</span>
              <span className="dash-panel-tag">🔥 坚持就是胜利</span>
            </div>
            <div className="dash-chart" style={{ height: 190 }}>
              <ReactECharts option={streakOption} style={{ height: '100%' }} notMerge />
            </div>
          </div>

          <div className="dash-panel">
            <div className="dash-panel-head">
              <span className="dash-panel-title">题库概览</span>
              <span className="dash-panel-tag">{stats.chapters} 章</span>
            </div>
            <ul className="dash-list">
              <li>
                <span>课程数</span>
                <b>{courseList.length}</b>
              </li>
              <li>
                <span>知识点</span>
                <b>{stats.lessons}</b>
              </li>
              <li>
                <span>习题总数</span>
                <b>{stats.exercises}</b>
              </li>
              <li>
                <span>已掌握</span>
                <b className="ok">{totalDone}</b>
              </li>
              <li>
                <span>待巩固（未连续答对 2 次）</span>
                <b className="warn">{riskCount}</b>
              </li>
              <li>
                <span>掌握率</span>
                <b>{totalPct.toFixed(1)}%</b>
              </li>
            </ul>
          </div>

          <div className="dash-panel">
            <div className="dash-panel-head">
              <span className="dash-panel-title">题型分布</span>
              <span className="dash-panel-tag">7 种题型</span>
            </div>
            <div className="dash-typelist">
              {Object.entries(TYPE_META).map(([key, meta]) => {
                const n = stats.byType[key] ?? 0;
                const pct = stats.exercises ? (n / stats.exercises) * 100 : 0;
                return (
                  <div key={key} className="dash-typerow">
                    <span className="dash-typename">
                      {meta.icon} {meta.label}
                    </span>
                    <div className="dash-typebar">
                      <i style={{ width: `${pct}%`, background: meta.color }} />
                    </div>
                    <span className="dash-typenum">{n}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="dash-panel dash-panel-accent">
            <div className="dash-panel-head">
              <span className="dash-panel-title">学习建议</span>
            </div>
            <p className="dash-advice">
              {wrongPending > 0
                ? `你有 ${wrongPending} 道错题待复习。建议先去「错题本」把错题重做一遍——连续答对 2 次才算真正掌握。`
                : totalDone === 0
                  ? '还没有开始练习。建议从「Python 数据分析基础」第 1 章入手，每学完一节立刻做对应习题。'
                  : '目前没有待复习的错题，保持节奏继续推进下一章吧！'}
            </p>
            <div className="dash-advice-actions">
              <Link to="/review" className="dash-btn dash-btn-primary">
                去错题本
              </Link>
              <Link to="/stats" className="dash-btn">
                详细统计
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="dash-footer">
        数据实时来自本地学习记录（localStorage） · 每完成一道题即时刷新 · {stats.exercises} 道习题 · {stats.lessons} 个知识点
      </footer>
    </div>
  );
}
