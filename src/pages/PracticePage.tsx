/**
 * 练习页：习题导航 + 作答 + 进度保存。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { findChapter, findCourse } from '../content';
import { ExerciseRunner, TYPE_META } from '../components/ExerciseRunner';
import { NotePanel } from '../components/NotePanel';
import { recordAttempt, toggleBookmark, useStudyState } from '../store/studyState';
import type { JudgeResult } from '../types';
import { chapterDifficulty, orderByTier, tierOf, TIERS, type TierKey } from '../content/difficulty';
import { NotFoundPage } from './NotFoundPage';

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'todo', label: '未完成' },
  { key: 'wrong', label: '错题' },
  { key: 'bookmark', label: '收藏' },
] as const;

export function PracticePage() {
  const { courseId, chapterId } = useParams();
  const course = findCourse(courseId);
  const chapter = courseId && chapterId ? findChapter(courseId, chapterId) : undefined;
  const state = useStudyState();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all');
  /** 难度档位：all = 不过滤；其余三档按难度筛选 */
  const [tier, setTier] = useState<'all' | TierKey>('all');
  /** 难度递进模式：按 基础 → 进阶 → 挑战 顺序出题 */
  const [ladder, setLadder] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [sessionResult, setSessionResult] = useState<Record<string, JudgeResult>>({});
  const [startTime] = useState(() => Date.now());
  const [finished, setFinished] = useState(false);

  const profile = useMemo(() => (chapter ? chapterDifficulty(chapter) : null), [chapter]);

  const visible = useMemo(() => {
    if (!chapter) return [];
    let list = chapter.exercises.filter((e) => {
      const m = state.mastery[e.id];
      if (filter === 'todo') return !m?.lastCorrect;
      if (filter === 'wrong') return Boolean(m?.everWrong && !m.lastCorrect);
      if (filter === 'bookmark') return Boolean(m?.bookmarked);
      return true;
    });
    if (tier !== 'all') list = list.filter((e) => tierOf(e) === tier);
    if (ladder) list = orderByTier(list);
    return list;
  }, [chapter, filter, tier, ladder, state.mastery]);

  useEffect(() => {
    setCursor(0);
  }, [filter, tier, ladder, chapterId]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [cursor]);

  const current = visible[Math.min(cursor, Math.max(visible.length - 1, 0))];

  const onJudged = useCallback(
    (result: JudgeResult, answer: unknown, durationMs: number) => {
      if (!chapter || !course || !current) return;
      recordAttempt({
        exercise: current,
        courseId: course.id,
        chapterId: chapter.id,
        correct: result.correct,
        score: result.score,
        durationMs,
        answer,
      });
      setSessionResult((prev) => ({ ...prev, [current.id]: result }));
    },
    [chapter, course, current],
  );

  if (!course || !chapter) return <NotFoundPage />;

  const solved = chapter.exercises.filter((e) => state.mastery[e.id]?.lastCorrect).length;
  const rate = chapter.exercises.length ? solved / chapter.exercises.length : 0;
  const correctCount = Object.values(sessionResult).filter((r) => r.correct).length;
  const wrongCount = Object.values(sessionResult).filter((r) => !r.correct).length;
  const allDone = solved === chapter.exercises.length;

  if (finished) {
    const minutes = Math.max(1, Math.round((Date.now() - startTime) / 60000));
    return (
      <div className="panel panel-pad" style={{ maxWidth: 720, margin: '40px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>{allDone ? '🎉' : '📋'}</div>
        <h2 style={{ margin: '10px 0' }}>{allDone ? '本章全部掌握！' : '本次练习结束'}</h2>
        <div className="result-grid">
          <div>
            <div className="stat-value">{sessionResult ? Object.keys(sessionResult).length : 0}</div>
            <div className="stat-label">本次作答</div>
          </div>
          <div>
            <div className="stat-value" style={{ color: 'var(--success)' }}>
              {correctCount}
            </div>
            <div className="stat-label">答对</div>
          </div>
          <div>
            <div className="stat-value" style={{ color: 'var(--danger)' }}>
              {wrongCount}
            </div>
            <div className="stat-label">答错</div>
          </div>
          <div>
            <div className="stat-value">{solved}</div>
            <div className="stat-label">本章已掌握 / {chapter.exercises.length}</div>
          </div>
          <div>
            <div className="stat-value">{minutes}</div>
            <div className="stat-label">用时（分钟）</div>
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => setFinished(false)}>
            ← 继续练习
          </button>
          <Link className="btn" to={`/review`}>
            查看错题本
          </Link>
          <Link className="btn btn-primary" to={`/course/${course.id}`}>
            返回课程
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="practice-head">
        <div>
          <Link to={`/course/${course.id}`} className="muted" style={{ fontSize: 12 }}>
            ← {course.title}
          </Link>
          <h1 className="practice-title">
            练习：{chapter.title}
          </h1>
        </div>
        <div className="row">
          <span className="badge badge-blue">
            已掌握 {solved}/{chapter.exercises.length}
          </span>
          <span className="badge">
            本次正确 {correctCount} · 错误 {wrongCount}
          </span>
          <button className="btn btn-sm" onClick={() => setFinished(true)}>
            结束本次练习
          </button>
        </div>
      </div>

      <div className="progress-outer" style={{ marginBottom: 16 }}>
        <div className="progress-inner" style={{ width: `${rate * 100}%`, background: 'var(--primary)' }} />
      </div>

      {/* 章节难度画像 + 分层出题 */}
      {profile && (
        <div className="diff-panel">
          <div className="diff-head">
            <div className="diff-badge" style={{ background: `${profile.levelColor}16`, color: profile.levelColor, borderColor: `${profile.levelColor}44` }}>
              <span className="diff-badge-label">本章难度</span>
              <span className="diff-badge-level">{profile.level}</span>
              <span className="diff-badge-score">{profile.score} / 5</span>
            </div>
            <div className="diff-meta">
              <span>
                共 <b>{profile.total}</b> 题 · 建议完成 <b>{profile.recommended}</b> 题
              </span>
              <span className="muted">
                基础 {profile.counts.basic} · 进阶 {profile.counts.advanced} · 挑战 {profile.counts.challenge}
              </span>
            </div>
            <div className="spacer" />
            <button
              className={`btn btn-sm ${ladder ? 'btn-primary' : ''}`}
              onClick={() => setLadder((v) => !v)}
              title="按 基础 → 进阶 → 挑战 的顺序递进出题"
            >
              {ladder ? '✓ 难度递进中' : '📈 难度递进模式'}
            </button>
          </div>

          <div className="tier-tabs">
            <button
              className={`tier-tab ${tier === 'all' ? 'active' : ''}`}
              onClick={() => setTier('all')}
              style={{ ['--tier-color' as string]: '#64748b' }}
            >
              <span className="tier-tab-title">全部难度</span>
              <span className="tier-tab-count">{profile.total} 题</span>
            </button>
            {TIERS.map((t) => {
              const n = profile.counts[t.key];
              const done = chapter.exercises.filter((e) => tierOf(e) === t.key && state.mastery[e.id]?.lastCorrect).length;
              return (
                <button
                  key={t.key}
                  className={`tier-tab ${tier === t.key ? 'active' : ''}`}
                  onClick={() => setTier(t.key)}
                  style={{ ['--tier-color' as string]: t.color }}
                  title={t.desc}
                  disabled={n === 0}
                >
                  <span className="tier-tab-title">{t.label}</span>
                  <span className="tier-tab-count">
                    {done}/{n} 题
                  </span>
                  <span className="tier-tab-bar">
                    <i style={{ width: `${n ? (done / n) * 100 : 0}%`, background: t.color }} />
                  </span>
                </button>
              );
            })}
          </div>
          {tier !== 'all' && (
            <div className="diff-tip">{TIERS.find((t) => t.key === tier)?.desc}</div>
          )}
        </div>
      )}

      <div className="practice-layout">
        <div className="practice-side">
          <div className="filter-tabs">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`filter-tab ${filter === f.key ? 'active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="exercise-nav">
            {visible.map((e, i) => {
              const m = state.mastery[e.id];
              let cls = 'exercise-dot';
              if (m?.lastCorrect) cls += ' solved';
              else if (m?.everWrong) cls += ' wrong';
              if (e.id === current?.id) cls += ' active';
              return (
                <button
                  key={e.id}
                  className={cls}
                  onClick={() => setCursor(i)}
                  title={`${TYPE_META[e.type].label} · 难度 ${e.difficulty}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          {visible.length === 0 && <div className="muted" style={{ padding: 12 }}>该分类下没有题目 🎉</div>}

          <div className="side-note">
            <div className="out-value-label">图例</div>
            <div className="legend-row">
              <span className="exercise-dot solved" style={{ width: 22, height: 22, fontSize: 10 }}>
                ✓
              </span>
              已答对
            </div>
            <div className="legend-row">
              <span className="exercise-dot wrong" style={{ width: 22, height: 22, fontSize: 10 }}>
                !
              </span>
              待复习
            </div>
            <div className="legend-row">
              <span className="exercise-dot" style={{ width: 22, height: 22, fontSize: 10 }} />
              未作答
            </div>
            <p className="muted" style={{ marginTop: 10, fontSize: 11.5 }}>
              连续答对 2 次视为"真正掌握"，错题会自动进入错题本。
            </p>
          </div>
        </div>

        <div className="panel practice-main">
          {current ? (
            <>
              <ExerciseRunner
                key={current.id}
                exercise={current}
                index={visible.indexOf(current)}
                total={visible.length}
                onJudged={onJudged}
                onNext={() => setCursor((c) => Math.min(c + 1, visible.length - 1))}
                onPrev={() => setCursor((c) => Math.max(c - 1, 0))}
                isLast={cursor >= visible.length - 1}
              />
              <div className="practice-actions">
                <button
                  className={`btn btn-sm ${state.mastery[current.id]?.bookmarked ? 'btn-success' : ''}`}
                  onClick={() => toggleBookmark(current.id, course.id, chapter.id)}
                >
                  {state.mastery[current.id]?.bookmarked ? '★ 已收藏' : '☆ 收藏本题'}
                </button>
                {state.mastery[current.id] && (
                  <span className="muted">
                    历史作答 {state.mastery[current.id].attemptCount} 次 · 答对 {state.mastery[current.id].correctCount} 次 ·
                    连续答对 {state.mastery[current.id].consecutiveCorrect}
                    {state.mastery[current.id].nextReviewAt
                      ? ` · 下次复习 ${new Date(state.mastery[current.id].nextReviewAt!).toLocaleDateString('zh-CN')}`
                      : ''}
                  </span>
                )}
              </div>
              <div style={{ marginTop: 14 }}>
                <NotePanel
                  targetType="exercise"
                  targetId={current.id}
                  courseId={course.id}
                  chapterId={chapter.id}
                  targetTitle={`第 ${cursor + 1} 题`}
                />
              </div>
            </>
          ) : (
            <div className="loading-block">没有符合条件的题目</div>
          )}
        </div>
      </div>
    </div>
  );
}
