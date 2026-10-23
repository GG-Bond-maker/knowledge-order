/**
 * 学习统计：打卡热力图、每日作答与正确率、各课程掌握度、题型正确率。
 */

import { useMemo, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { getCourses, courseStats } from '../content';
import { useContent, apiExportContent, apiImportContent } from '../store/contentStore';
import {
  exportState,
  importState,
  overallAccuracy,
  recentDays,
  resetProgress,
  useStudyState,
  todayStr,
} from '../store/studyState';
import { TYPE_META } from '../components/ExerciseRunner';

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

export function StatsPage() {
  const state = useStudyState();
  const content = useContent();
  const days30 = useMemo(() => recentDays(30), [state]);
  const heatDays = useMemo(() => lastNDays(140), []);
  const fileRef = useRef<HTMLInputElement>(null);

  const totalAttempts = Object.values(state.daily).reduce((s, d) => s + d.attempts, 0);
  const totalCorrect = Object.values(state.daily).reduce((s, d) => s + d.correct, 0);
  const totalMinutes = Object.values(state.daily).reduce((s, d) => s + d.minutes, 0);
  const mastered = Object.values(state.mastery).filter((m) => m.consecutiveCorrect >= 2).length;
  const activeDays = Object.values(state.daily).filter((d) => d.attempts > 0).length;

  // 每日作答 / 正确率
  const dailyOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['作答次数', '正确率(%)'], bottom: 0 },
    grid: { left: 44, right: 48, top: 24, bottom: 44 },
    xAxis: { type: 'category', data: days30.map((d) => d.date.slice(5)), axisLabel: { fontSize: 10 } },
    yAxis: [
      { type: 'value', name: '次数', nameTextStyle: { fontSize: 11 } },
      { type: 'value', name: '正确率%', max: 100, nameTextStyle: { fontSize: 11 } },
    ],
    series: [
      {
        name: '作答次数',
        type: 'bar',
        data: days30.map((d) => d.attempts),
        itemStyle: { color: '#2f6bff', borderRadius: [3, 3, 0, 0] },
      },
      {
        name: '正确率(%)',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        connectNulls: true,
        data: days30.map((d) => (d.attempts ? Math.round((d.correct / d.attempts) * 100) : null)),
        itemStyle: { color: '#f59e0b' },
        lineStyle: { width: 2.5 },
      },
    ],
  };

  // 打卡热力图（按周排列）
  const heatData = heatDays.map((d) => {
    const stat = state.daily[d];
    return [d, stat?.attempts ?? 0];
  });
  const heatMax = Math.max(1, ...heatData.map((x) => x[1] as number));
  const heatOption = {
    tooltip: {
      formatter: (p: { value: [string, number] }) => `${p.value[0]}<br/>作答 ${p.value[1]} 次`,
    },
    visualMap: {
      min: 0,
      max: heatMax,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      text: ['多', '少'],
      inRange: { color: ['#e9eef8', '#a9c1ff', '#5b8bff', '#2f6bff', '#1b46c0'] },
      textStyle: { fontSize: 10 },
    },
    calendar: {
      top: 30,
      left: 40,
      right: 20,
      range: [heatDays[0], heatDays[heatDays.length - 1]],
      cellSize: ['auto', 16],
      splitLine: { show: false },
      itemStyle: { borderWidth: 2, borderColor: '#f5f7fb', color: '#f0f3f9' },
      yearLabel: { show: false },
      dayLabel: { nameMap: ['日', '一', '二', '三', '四', '五', '六'], fontSize: 10 },
      monthLabel: { fontSize: 10 },
    },
    series: [{ type: 'heatmap', coordinateSystem: 'calendar', data: heatData }],
  };

  // 课程掌握度
  const courseList = getCourses();
  const courseProgress = courseList.map((c) => {
    const s = courseStats(c);
    const done = c.chapters.reduce(
      (acc, ch) => acc + ch.exercises.filter((e) => state.mastery[e.id]?.lastCorrect).length,
      0,
    );
    return { name: c.title, total: s.exercises, done, pct: s.exercises ? Math.round((done / s.exercises) * 100) : 0, color: c.color };
  });
  const courseOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 130, right: 40, top: 10, bottom: 24 },
    xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
    yAxis: { type: 'category', data: courseProgress.map((c) => c.name), axisLabel: { fontSize: 11 } },
    series: [
      {
        type: 'bar',
        barWidth: 14,
        data: courseProgress.map((c) => ({
          value: c.pct,
          itemStyle: { color: c.color, borderRadius: [0, 7, 7, 0] },
        })),
        label: { show: true, position: 'right', formatter: (p: { value: number }) => `${p.value}%`, fontSize: 11 },
      },
    ],
  };

  // 各题型正确率
  const typeStats = Object.entries(TYPE_META).map(([key, meta]) => {
    const items = Object.values(state.mastery).filter((m) => {
      const course = courseList.find((c) => c.id === m.courseId);
      const ch = course?.chapters.find((x) => x.id === m.chapterId);
      return ch?.exercises.some((e) => e.id === m.exerciseId && e.type === key);
    });
    const attempts = items.reduce((s, m) => s + m.attemptCount, 0);
    const correct = items.reduce((s, m) => s + m.correctCount, 0);
    return {
      name: meta.label,
      value: attempts ? Math.round((correct / attempts) * 100) : 0,
      count: items.length,
    };
  });
  const typeOption = {
    tooltip: {},
    radar: {
      indicator: Object.entries(TYPE_META).map(([, m]) => ({ name: m.label, max: 100 })),
      radius: '62%',
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: typeStats.map((t) => t.value || 0),
            name: '正确率 %',
            areaStyle: { color: 'rgba(47,107,255,0.22)' },
            lineStyle: { color: '#2f6bff' },
            itemStyle: { color: '#2f6bff' },
          },
        ],
      },
    ],
  };

  const onExport = async () => {
    // 完整备份：学习记录 + 笔记 + 计划 + 课程内容（若后端可用）
    let content: unknown = null;
    try {
      content = await apiExportContent();
    } catch {
      content = null;
    }
    const backup = {
      kind: 'learning-academy-backup',
      version: 2,
      exportedAt: new Date().toISOString(),
      state: JSON.parse(exportState()),
      content,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `learning-academy-backup-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onImport = (file: File) => {
    file.text().then(async (text) => {
      try {
        const parsed = JSON.parse(text);
        if (parsed.kind === 'learning-academy-backup') {
          importState(JSON.stringify(parsed.state));
          if (parsed.content?.courses?.length) {
            const ok = window.confirm(
              `备份中包含 ${parsed.content.courses.length} 门课程内容。是否一并导入（会覆盖同 id 的课程，导入前会自动备份）？`,
            );
            if (ok) {
              const r = await apiImportContent(parsed.content);
              alert(`学习记录已恢复；课程导入 ${r.imported} 门${r.failed?.length ? `，失败 ${r.failed.length} 门` : ''}`);
              return;
            }
          }
          alert('学习记录已恢复');
          return;
        }
        importState(text);
        alert('导入成功');
      } catch (e) {
        alert(`导入失败：${e instanceof Error ? e.message : String(e)}`);
      }
    });
  };

  return (
    <div>
      <div className="row" style={{ marginBottom: 4 }}>
        <h1 className="practice-title" style={{ margin: 0 }}>
          学习统计
        </h1>
        <div className="spacer" />
        <button className="btn btn-sm" onClick={onExport}>
          ⬇ 导出进度
        </button>
        <button className="btn btn-sm" onClick={() => fileRef.current?.click()}>
          ⬆ 导入进度
        </button>
        <button
          className="btn btn-sm"
          onClick={() => {
            if (confirm('确定要清空全部学习记录吗？此操作不可撤销。')) resetProgress();
          }}
        >
          清空记录
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImport(f);
            e.target.value = '';
          }}
        />
      </div>
      <p className="section-desc">进度保存在本机浏览器中（localStorage）。换设备时可用"导出/导入进度"迁移。</p>

      <div className="stat-grid">
        <div className="panel stat-card">
          <div className="stat-value">{totalAttempts}</div>
          <div className="stat-label">累计作答</div>
        </div>
        <div className="panel stat-card">
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            {totalAttempts ? `${Math.round(overallAccuracy(state) * 100)}%` : '—'}
          </div>
          <div className="stat-label">总正确率（{totalCorrect} 次答对）</div>
        </div>
        <div className="panel stat-card">
          <div className="stat-value">{state.streakDays}</div>
          <div className="stat-label">当前连续打卡（最长 {state.longestStreak} 天）</div>
        </div>
        <div className="panel stat-card">
          <div className="stat-value">{mastered}</div>
          <div className="stat-label">已掌握题目（连续答对 ≥2）</div>
        </div>
        <div className="panel stat-card">
          <div className="stat-value">{activeDays}</div>
          <div className="stat-label">有学习记录的天数</div>
        </div>
        <div className="panel stat-card">
          <div className="stat-value">{Math.round(totalMinutes)}</div>
          <div className="stat-label">累计练习时长（分钟）</div>
        </div>
      </div>

      <div className="panel panel-pad" style={{ marginTop: 18 }}>
        <h2 className="section-title">近 30 天作答与正确率</h2>
        <ReactECharts option={dailyOption} style={{ height: 280 }} notMerge />
      </div>

      <div className="panel panel-pad" style={{ marginTop: 18 }}>
        <h2 className="section-title">学习打卡热力图（近 20 周）</h2>
        <ReactECharts option={heatOption} style={{ height: 210 }} notMerge />
      </div>

      <div className="stats-two-col">
        <div className="panel panel-pad">
          <h2 className="section-title">各课程掌握度</h2>
          <p className="section-desc">按"已答对过的题 / 总题数"计算</p>
          <ReactECharts option={courseOption} style={{ height: 220 }} notMerge />
        </div>
        <div className="panel panel-pad">
          <h2 className="section-title">各题型正确率</h2>
          <p className="section-desc">找出薄弱环节，针对性复习</p>
          <ReactECharts option={typeOption} style={{ height: 280 }} notMerge />
        </div>
      </div>
    </div>
  );
}
