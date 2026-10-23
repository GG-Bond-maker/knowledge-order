/**
 * 错题本与收藏：跨课程复习。
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { findExercise } from '../content';
import { ExerciseRunner } from '../components/ExerciseRunner';
import { recordAttempt, toggleBookmark, useStudyState } from '../store/studyState';
import type { JudgeResult } from '../types';

type Tab = 'wrong' | 'bookmarked';

export function ReviewPage() {
  const state = useStudyState();
  const [tab, setTab] = useState<Tab>('wrong');
  const [activeId, setActiveId] = useState<string | null>(null);

  const list = useMemo(() => {
    const items = Object.values(state.mastery).filter((m) =>
      tab === 'wrong' ? m.everWrong && !m.lastCorrect : m.bookmarked,
    );
    return items
      .map((m) => ({ m, found: findExercise(m.exerciseId) }))
      .filter((x) => x.found)
      .sort((a, b) => b.m.lastAttemptAt - a.m.lastAttemptAt);
  }, [state.mastery, tab]);

  const active = list.find((x) => x.m.exerciseId === activeId) ?? list[0];

  const onJudged = (result: JudgeResult, answer: unknown, durationMs: number) => {
    if (!active) return;
    recordAttempt({
      exercise: active.found!.exercise,
      courseId: active.found!.course.id,
      chapterId: active.found!.chapter.id,
      correct: result.correct,
      score: result.score,
      durationMs,
      answer,
    });
  };

  return (
    <div>
      <h1 className="practice-title">错题本与收藏</h1>
      <p className="section-desc">
        错题本收录"曾答错且尚未答对"的题；答对后会从错题本移出，但历史记录仍保留。收藏的题目可随时回看。
      </p>

      <div className="filter-tabs" style={{ marginBottom: 16 }}>
        <button className={`filter-tab ${tab === 'wrong' ? 'active' : ''}`} onClick={() => setTab('wrong')}>
          错题本（{Object.values(state.mastery).filter((m) => m.everWrong && !m.lastCorrect).length}）
        </button>
        <button
          className={`filter-tab ${tab === 'bookmarked' ? 'active' : ''}`}
          onClick={() => setTab('bookmarked')}
        >
          收藏（{Object.values(state.mastery).filter((m) => m.bookmarked).length}）
        </button>
      </div>

      <div className="review-layout">
        <div className="panel review-list">
          {list.length === 0 && (
            <div className="loading-block">
              {tab === 'wrong' ? '🎉 没有待复习的错题，继续保持！' : '还没有收藏题目，做题时点"☆ 收藏本题"即可加入。'}
            </div>
          )}
          {list.map(({ m, found }) => (
            <button
              key={m.exerciseId}
              className={`review-item ${active?.m.exerciseId === m.exerciseId ? 'active' : ''}`}
              onClick={() => setActiveId(m.exerciseId)}
            >
              <div className="row" style={{ gap: 6 }}>
                <span className="badge">{found!.course.icon}</span>
                <span className="review-course">{found!.chapter.title}</span>
              </div>
              <div className="review-q">{found!.exercise.question.replace(/[#*`>]/g, '').slice(0, 70)}…</div>
              <div className="muted" style={{ fontSize: 11.5 }}>
                答对 {m.correctCount}/{m.attemptCount}
                {m.lastAttemptAt ? ` · ${new Date(m.lastAttemptAt).toLocaleDateString('zh-CN')}` : ''}
              </div>
            </button>
          ))}
        </div>

        <div className="panel practice-main">
          {active ? (
            <>
              <div className="row" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
                <Link to={`/course/${active.found!.course.id}/chapter/${active.found!.chapter.id}`} className="muted">
                  {active.found!.course.title} / {active.found!.chapter.title}
                </Link>
                <div className="spacer" />
                <Link className="btn btn-sm" to={`/practice/${active.found!.course.id}/${active.found!.chapter.id}`}>
                  去原章节练习
                </Link>
                <button
                  className={`btn btn-sm ${active.m.bookmarked ? 'btn-success' : ''}`}
                  onClick={() =>
                    toggleBookmark(active.m.exerciseId, active.found!.course.id, active.found!.chapter.id)
                  }
                >
                  {active.m.bookmarked ? '★ 取消收藏' : '☆ 收藏'}
                </button>
              </div>
              <ExerciseRunner
                key={active.m.exerciseId}
                exercise={active.found!.exercise}
                index={list.indexOf(active)}
                total={list.length}
                onJudged={onJudged}
                onNext={() => setActiveId(list[Math.min(list.indexOf(active) + 1, list.length - 1)].m.exerciseId)}
                onPrev={() => setActiveId(list[Math.max(list.indexOf(active) - 1, 0)].m.exerciseId)}
                isLast={list.indexOf(active) >= list.length - 1}
              />
            </>
          ) : (
            <div className="loading-block">选择左侧的题目开始复习</div>
          )}
        </div>
      </div>
    </div>
  );
}
