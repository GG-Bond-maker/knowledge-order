/**
 * 艾宾浩斯复习页：按遗忘曲线安排今日复习。
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { findExercise } from '../content';
import { ExerciseRunner } from '../components/ExerciseRunner';
import { recordAttempt, useStudyState } from '../store/studyState';
import {
  dueExerciseIds,
  isGraduated,
  overdueDays,
  REVIEW_INTERVALS,
  todayReviewStats,
  upcomingLoad,
} from '../store/reviewScheduler';
import type { JudgeResult } from '../types';

export function SpacedReviewPage() {
  const state = useStudyState();
  const [idx, setIdx] = useState(0);
  const [sessionDone, setSessionDone] = useState<Record<string, boolean>>({});

  const dueIds = useMemo(() => dueExerciseIds(state.mastery), [state.mastery]);
  const pending = dueIds.filter((id) => !sessionDone[id]);
  const currentId = pending[idx] ?? pending[0];
  const current = currentId ? findExercise(currentId) : undefined;

  const stats = useMemo(() => todayReviewStats(state.mastery), [state.mastery]);
  const load = useMemo(() => upcomingLoad(state.mastery, 7), [state.mastery]);

  const totalScheduled = Object.values(state.mastery).filter((m) => m.nextReviewAt !== undefined).length;
  const graduated = Object.values(state.mastery).filter((m) => isGraduated(m)).length;
  const avgStage =
    totalScheduled > 0
      ? Object.values(state.mastery)
          .filter((m) => (m.reviewStage ?? -1) >= 0)
          .reduce((s, m) => s + (m.reviewStage ?? 0), 0) / totalScheduled
      : 0;

  const onJudged = (result: JudgeResult, answer: unknown, durationMs: number) => {
    if (!current) return;
    recordAttempt({
      exercise: current.exercise,
      courseId: current.course.id,
      chapterId: current.chapter.id,
      correct: result.correct,
      score: result.score,
      durationMs,
      answer,
    });
    setSessionDone((prev) => ({ ...prev, [currentId]: true }));
    setIdx(0);
  };

  const maxLoad = Math.max(1, ...load.map((l) => l.count));

  return (
    <div>
      <div className="row" style={{ marginBottom: 6 }}>
        <h1 className="practice-title" style={{ margin: 0 }}>
          ⏰ 今日复习
        </h1>
        <span className="badge badge-blue">艾宾浩斯间隔重复</span>
        <div className="spacer" />
        <Link to="/review" className="btn btn-sm">
          📕 错题本
        </Link>
      </div>
      <p className="section-desc">
        按遗忘曲线（{REVIEW_INTERVALS.join(' / ')} 天）自动安排复习。答对进入下一阶段，答错回退 2 个阶段。
      </p>

      <div className="review-hero">
        <div className="review-stat" style={{ ['--rc' as string]: '#dc2626' }}>
          <div className="review-stat-value">{stats.due}</div>
          <div className="review-stat-label">今日待复习</div>
        </div>
        <div className="review-stat" style={{ ['--rc' as string]: '#16a34a' }}>
          <div className="review-stat-value">{stats.reviewedToday}</div>
          <div className="review-stat-label">今日已复习</div>
        </div>
        <div className="review-stat" style={{ ['--rc' as string]: '#2f6bff' }}>
          <div className="review-stat-value">{totalScheduled}</div>
          <div className="review-stat-label">复习队列总题数</div>
        </div>
        <div className="review-stat" style={{ ['--rc' as string]: '#7c3aed' }}>
          <div className="review-stat-value">{graduated}</div>
          <div className="review-stat-label">已牢固掌握（{REVIEW_INTERVALS.length}级毕业）</div>
        </div>
      </div>

      <div className="panel panel-pad" style={{ marginBottom: 18 }}>
        <div className="row" style={{ marginBottom: 6 }}>
          <h2 className="section-title" style={{ margin: 0 }}>
            未来 7 天复习负荷
          </h2>
          <span className="muted">平均复习阶段 {avgStage.toFixed(1)} / {REVIEW_INTERVALS.length - 1}</span>
        </div>
        <div className="load-bars">
          {load.map((l, i) => (
            <div key={l.date} className={`load-bar-col ${i === 0 ? 'today' : ''}`}>
              <span className="load-bar-num">{l.count}</span>
              <div className="load-bar" style={{ height: `${(l.count / maxLoad) * 100}%` }} />
              <span className="load-bar-label">{l.date}</span>
            </div>
          ))}
        </div>
      </div>

      {pending.length === 0 ? (
        <div className="panel panel-pad" style={{ textAlign: 'center', padding: 56 }}>
          <div style={{ fontSize: 44 }}>{dueIds.length > 0 ? '🎉' : '☕'}</div>
          <h2 style={{ margin: '12px 0 6px' }}>
            {dueIds.length > 0 ? '今日复习全部完成！' : '今天没有需要复习的题'}
          </h2>
          <p className="muted">
            {dueIds.length > 0
              ? `本次共完成 ${Object.keys(sessionDone).length} 道复习。`
              : '继续学习新内容，答对后会自动进入复习队列。'}
          </p>
          <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
            <Link to="/" className="btn btn-primary">
              去学习新内容
            </Link>
            <Link to="/stats" className="btn">
              查看学习统计
            </Link>
          </div>
        </div>
      ) : (
        <div className="practice-layout">
          <div className="practice-side">
            <div className="panel panel-pad" style={{ padding: 14 }}>
              <div className="out-value-label" style={{ marginBottom: 8 }}>
                待复习队列（{pending.length} 题）
              </div>
              <div className="exercise-nav">
                {pending.slice(0, 40).map((id, i) => {
                  const m = state.mastery[id];
                  return (
                    <button
                      key={id}
                      className={`exercise-dot ${i === idx ? 'active' : ''}`}
                      onClick={() => setIdx(i)}
                      title={`逾期 ${overdueDays(m)} 天 · 阶段 ${(m.reviewStage ?? 0) + 1}`}
                      style={{ width: 32, height: 32, fontSize: 11 }}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              {pending.length > 40 && <div className="muted" style={{ marginTop: 8 }}>还有 {pending.length - 40} 题…</div>}
            </div>

            {currentId && state.mastery[currentId] && (
              <div className="panel panel-pad" style={{ padding: 14 }}>
                <div className="out-value-label">当前题目复习进度</div>
                <div className="stage-track">
                  {REVIEW_INTERVALS.map((d, i) => (
                    <span
                      key={d}
                      className={`stage-dot ${i < (state.mastery[currentId].reviewStage ?? 0) ? 'done' : ''} ${
                        i === (state.mastery[currentId].reviewStage ?? 0) ? 'current' : ''
                      }`}
                      title={`阶段 ${i + 1}：${d} 天`}
                    />
                  ))}
                </div>
                <div className="muted" style={{ marginTop: 8 }}>
                  已复习 {state.mastery[currentId].reviewCount ?? 0} 次 · 逾期{' '}
                  {overdueDays(state.mastery[currentId])} 天
                </div>
              </div>
            )}
          </div>

          <div className="panel practice-main">
            {current ? (
              <>
                <div className="row" style={{ marginBottom: 10 }}>
                  <Link to={`/course/${current.course.id}`} className="muted">
                    {current.course.icon} {current.course.title} / {current.chapter.title}
                  </Link>
                  <div className="spacer" />
                  <span className="badge badge-orange">
                    第 {idx + 1} / {pending.length} 题
                  </span>
                </div>
                <ExerciseRunner
                  key={currentId}
                  exercise={current.exercise}
                  index={idx}
                  total={pending.length}
                  onJudged={onJudged}
                  onNext={() => setIdx((v) => Math.min(v + 1, pending.length - 1))}
                  onPrev={() => setIdx((v) => Math.max(v - 1, 0))}
                  isLast={idx >= pending.length - 1}
                />
              </>
            ) : (
              <div className="loading-block">正在加载题目…</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
