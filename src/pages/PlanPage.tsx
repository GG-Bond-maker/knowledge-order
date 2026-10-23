/**
 * 学习计划页：设定每日目标、学习日、提醒，并查看达成情况。
 */

import { useMemo } from 'react';
import { recentDays, updatePlan, useStudyState, todayStr } from '../store/studyState';
import { todayReviewStats } from '../store/reviewScheduler';
import { NotesList } from '../components/NotePanel';

const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

export function PlanPage() {
  const state = useStudyState();
  const plan = state.plan;
  const days = useMemo(() => recentDays(14), [state]);
  const today = state.daily[todayStr()];
  const reviewStats = useMemo(() => todayReviewStats(state.mastery), [state.mastery]);

  const todaySolved = today?.solved ?? 0;
  const goalPct = Math.min(100, Math.round((todaySolved / Math.max(plan.dailyGoal, 1)) * 100));

  // 近 14 天达成率（只统计计划内的学习日）
  const plannedDays = days.filter((d) => plan.activeWeekdays.includes(new Date(`${d.date}T00:00:00`).getDay()));
  const metDays = plannedDays.filter((d) => d.solved >= plan.dailyGoal).length;
  const completionRate = plannedDays.length ? metDays / plannedDays.length : 0;

  const weekTotal = days.slice(-7).reduce((s, d) => s + d.solved, 0);
  const notes = Object.values(state.notes).sort((a, b) => b.updatedAt - a.updatedAt);

  const ringColor =
    goalPct >= 100 ? 'conic-gradient(#16a34a 0turn, #16a34a 1turn)' : `conic-gradient(#2f6bff 0turn, #2f6bff ${goalPct / 100}turn, #e6eaf2 ${goalPct / 100}turn, #e6eaf2 1turn)`;

  return (
    <div>
      <h1 className="practice-title">📅 学习计划</h1>
      <p className="section-desc">设定每日目标与学习日，查看计划达成情况与复习负荷。</p>

      <div className="plan-grid" style={{ marginBottom: 18 }}>
        <div className="plan-card">
          <div className="plan-card-title">🎯 今日目标</div>
          <div className="goal-ring-wrap">
            <div className="goal-ring" style={{ background: ringColor }}>
              <div className="goal-ring-inner">{goalPct}%</div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>
                {todaySolved} <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>/ {plan.dailyGoal} 题</span>
              </div>
              <div className="muted" style={{ marginTop: 4 }}>
                {goalPct >= 100 ? '🎉 今日目标已达成' : `还差 ${plan.dailyGoal - todaySolved} 题`}
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                今日复习：{reviewStats.reviewedToday}/{reviewStats.due + reviewStats.reviewedToday} 题
              </div>
            </div>
          </div>
        </div>

        <div className="plan-card">
          <div className="plan-card-title">⚙️ 每日目标</div>
          <div className="plan-row">
            <span>每天做多少题</span>
            <input
              className="plan-input"
              type="number"
              min={1}
              max={500}
              value={plan.dailyGoal}
              onChange={(e) => updatePlan({ dailyGoal: Math.max(1, Number(e.target.value) || 1) })}
              style={{ width: 100 }}
            />
          </div>
          <div className="plan-row">
            <span>提醒时间</span>
            <input
              className="plan-input"
              type="time"
              value={plan.reminderTime ?? ''}
              onChange={(e) => updatePlan({ reminderTime: e.target.value })}
              style={{ width: 130 }}
            />
          </div>
          <div className="plan-row">
            <span>开启提醒</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={plan.reminderEnabled}
                onChange={(e) => updatePlan({ reminderEnabled: e.target.checked })}
              />
              <span className="muted">页面内提示</span>
            </label>
          </div>
        </div>

        <div className="plan-card">
          <div className="plan-card-title">📆 学习日</div>
          <div className="weekday-picker">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <button
                key={d}
                className={`weekday-btn ${plan.activeWeekdays.includes(d) ? 'on' : ''}`}
                onClick={() => {
                  const has = plan.activeWeekdays.includes(d);
                  const next = has ? plan.activeWeekdays.filter((x) => x !== d) : [...plan.activeWeekdays, d];
                  updatePlan({ activeWeekdays: next.length ? next : [d] });
                }}
              >
                {WEEKDAY_NAMES[d]}
              </button>
            ))}
          </div>
          <div className="muted" style={{ marginTop: 12 }}>
            近 14 天计划达成率：<b>{Math.round(completionRate * 100)}%</b>（{metDays}/{plannedDays.length} 天）
          </div>
          <div className="muted" style={{ marginTop: 4 }}>
            近 7 天完成 {weekTotal} 题
          </div>
        </div>

        <div className="plan-card">
          <div className="plan-card-title">🔥 连续打卡</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 34, fontWeight: 800, color: 'var(--warning)' }}>{state.streakDays}</span>
            <span className="muted">天 · 最长 {state.longestStreak} 天</span>
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 12, flexWrap: 'wrap' }}>
            {days.map((d) => {
              const met = d.solved >= plan.dailyGoal;
              const active = plan.activeWeekdays.includes(new Date(`${d.date}T00:00:00`).getDay());
              return (
                <span
                  key={d.date}
                  title={`${d.date}：${d.solved} 题`}
                  style={{
                    width: 18,
                    height: 26,
                    borderRadius: 4,
                    background: met ? 'var(--success)' : d.solved > 0 ? '#a7d7b5' : active ? '#eef1f7' : '#f8fafc',
                    border: active ? 'none' : '1px dashed #d5dbe8',
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="panel panel-pad">
        <h2 className="section-title">📝 我的笔记（{notes.length}）</h2>
        <NotesList notes={notes} />
      </div>
    </div>
  );
}
