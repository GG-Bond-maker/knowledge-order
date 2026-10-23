/**
 * 章节学习页：支持整章在一个界面平铺连读（默认）或单节聚焦阅读，左侧提供带滚动监听的目录导航。
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { findChapter, findCourse } from '../content';
import { Markdown } from '../components/Markdown';
import { DemoBox, TipBox } from '../components/LessonView';
import { NotePanel } from '../components/NotePanel';
import { chapterProgress, markLessonRead, markChapterLessonsRead, useStudyState } from '../store/studyState';
import { NotFoundPage } from './NotFoundPage';

export function ChapterPage() {
  const { courseId, chapterId } = useParams();
  const course = findCourse(courseId);
  const chapter = courseId && chapterId ? findChapter(courseId, chapterId) : undefined;
  const state = useStudyState();
  const [activeId, setActiveId] = useState<string | null>(null);

  // 默认阅读模式：'all'（整章平铺连读在一个界面），支持切换为 'single'（单节聚焦）
  const [mode, setMode] = useState<'all' | 'single'>(() => {
    const saved = localStorage.getItem('chapter_view_mode');
    return saved === 'single' ? 'single' : 'all';
  });

  const handleModeChange = (newMode: 'all' | 'single') => {
    setMode(newMode);
    localStorage.setItem('chapter_view_mode', newMode);
    if (newMode === 'single') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (chapter && chapter.lessons.length) {
      setActiveId(chapter.lessons[0].id);
    }
    window.scrollTo({ top: 0 });
  }, [chapterId, chapter]);

  // 整章连读模式下的滚动监听（Scroll Spy）
  useEffect(() => {
    if (mode !== 'all' || !chapter || !chapter.lessons.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) {
          setActiveId(visible.target.id);
        }
      },
      {
        rootMargin: '-80px 0px -55% 0px',
        threshold: 0.05,
      },
    );

    chapter.lessons.forEach((l) => {
      const el = document.getElementById(l.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [chapter, mode]);

  const active = useMemo(
    () => chapter?.lessons.find((l) => l.id === activeId) ?? chapter?.lessons[0],
    [chapter, activeId],
  );

  if (!course || !chapter || !active) return <NotFoundPage />;

  const idx = course.chapters.findIndex((c) => c.id === chapter.id);
  const prev = course.chapters[idx - 1];
  const next = course.chapters[idx + 1];
  const p = chapterProgress(chapter);
  const activeIdx = chapter.lessons.findIndex((l) => l.id === active.id);
  const readLessonsCount = chapter.lessons.filter((l) => Boolean(state.lessons[l.id]?.read)).length;
  const allLessonsRead = readLessonsCount === chapter.lessons.length;

  const scrollToLesson = (lessonId: string) => {
    setActiveId(lessonId);
    if (mode === 'all') {
      const el = document.getElementById(lessonId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleMarkAllRead = () => {
    markChapterLessonsRead(
      course.id,
      chapter.id,
      chapter.lessons.map((l) => l.id),
    );
  };

  return (
    <div className="chapter-layout">
      {/* 左侧悬浮目录 */}
      <aside className="chapter-toc">
        <div className="toc-head">
          <Link to={`/course/${course.id}`} className="muted" style={{ fontSize: 12 }}>
            ← {course.title}
          </Link>
          <div className="toc-chapter-title">
            第 {idx + 1} 章 · {chapter.title}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            阅读：{readLessonsCount}/{chapter.lessons.length} 节 · 练习：已答对 {p.done}/{p.total} 题
          </div>
        </div>

        {/* 模式切换器 */}
        <div className="toc-mode-toggle">
          <button
            className={`toc-mode-btn ${mode === 'all' ? 'active' : ''}`}
            onClick={() => handleModeChange('all')}
            title="将本章所有知识点连贯平铺在一个界面中直接滚动阅读"
          >
            📑 整章连读 (单页)
          </button>
          <button
            className={`toc-mode-btn ${mode === 'single' ? 'active' : ''}`}
            onClick={() => handleModeChange('single')}
            title="每次只看一个小节，点击按钮切换下一节"
          >
            📄 单节聚焦
          </button>
        </div>

        <div className="toc-list">
          {chapter.lessons.map((l, i) => (
            <button
              key={l.id}
              className={`toc-item ${l.id === active.id ? 'active' : ''}`}
              onClick={() => scrollToLesson(l.id)}
            >
              <span className="toc-num">{i + 1}</span>
              <span className="toc-name">{l.title}</span>
              {state.lessons[l.id]?.read && <span className="toc-check">✓</span>}
            </button>
          ))}
        </div>

        <div style={{ padding: '8px 12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleMarkAllRead}
            disabled={allLessonsRead}
            style={{ width: '100%', fontSize: 12 }}
          >
            {allLessonsRead ? '✓ 本章已全部学习' : '✓ 标记全章已读'}
          </button>
          <Link
            to={`/practice/${course.id}/${chapter.id}`}
            className="btn btn-primary btn-sm"
            style={{ width: '100%', textAlign: 'center' }}
          >
            ✏️ 做本章 {chapter.exercises.length} 道练习
          </Link>
        </div>
      </aside>

      {/* 右侧核心内容区 */}
      <div className="chapter-main-container">
        {mode === 'all' ? (
          /* ═══ 模式一：整章在一个界面平铺连读（无需点击下一节） ═══ */
          <div className="chapter-continuous-view">
            {/* 章节顶部导航与概览横幅 */}
            <div className="chapter-header-banner">
              <div className="chapter-banner-top">
                <span className="badge badge-blue">
                  第 {idx + 1} 章 / 共 {course.chapters.length} 章
                </span>
                <div className="chapter-banner-actions">
                  <button
                    className={`btn btn-sm ${allLessonsRead ? 'btn-success' : 'btn-ghost'}`}
                    onClick={handleMarkAllRead}
                    disabled={allLessonsRead}
                  >
                    {allLessonsRead ? '✓ 本章已全部学习' : '✓ 标记本章全部已读'}
                  </button>
                  <Link to={`/practice/${course.id}/${chapter.id}`} className="btn btn-primary btn-sm">
                    ✏️ 做练习 ({chapter.exercises.length} 题)
                  </Link>
                </div>
              </div>

              <h1 className="chapter-main-title">{chapter.title}</h1>
              <p className="chapter-main-goal">{chapter.goal}</p>

              <div className="chapter-progress-bar-wrap">
                <div className="progress-outer" style={{ height: 6, flex: 1 }}>
                  <div
                    className="progress-inner"
                    style={{
                      width: `${(readLessonsCount / chapter.lessons.length) * 100}%`,
                      background: course.color || 'var(--primary)',
                    }}
                  />
                </div>
                <span className="muted" style={{ fontSize: 12, flexShrink: 0 }}>
                  已学 {readLessonsCount} / {chapter.lessons.length} 节 ({Math.round((readLessonsCount / chapter.lessons.length) * 100)}%)
                </span>
              </div>
            </div>

            {/* 本章所有小节流式平铺渲染 */}
            <div className="chapter-lessons-flow">
              {chapter.lessons.map((lesson, lessonIdx) => {
                const isLessonRead = Boolean(state.lessons[lesson.id]?.read);
                const diff = lesson.difficulty ?? 1;
                return (
                  <section key={lesson.id} id={lesson.id} className="lesson-section-card">
                    <div className="lesson-section-head">
                      <div className="lesson-section-title-wrap">
                        <span className="lesson-section-badge">
                          {idx + 1}.{lessonIdx + 1}
                        </span>
                        <h2 className="lesson-section-title">{lesson.title}</h2>
                        <span
                          className="badge"
                          style={{
                            fontSize: 11.5,
                            background:
                              diff <= 1
                                ? '#e0f2fe'
                                : diff === 2
                                ? '#dcfce7'
                                : diff === 3
                                ? '#fef3c7'
                                : '#fee2e2',
                            color:
                              diff <= 1
                                ? '#0369a1'
                                : diff === 2
                                ? '#15803d'
                                : diff === 3
                                ? '#b45309'
                                : '#b91c1c',
                          }}
                        >
                          {diff <= 1
                            ? '基础'
                            : diff === 2
                            ? '入门'
                            : diff === 3
                            ? '进阶'
                            : '挑战'}
                        </span>
                      </div>

                      <button
                        className={`btn btn-sm ${isLessonRead ? 'btn-success' : 'btn-ghost'}`}
                        onClick={() =>
                          markLessonRead({
                            lessonId: lesson.id,
                            courseId: course.id,
                            chapterId: chapter.id,
                            read: true,
                          })
                        }
                      >
                        {isLessonRead ? '✓ 已学习' : '标记已学'}
                      </button>
                    </div>

                    <div className="lesson-body">
                      <Markdown text={lesson.content} />

                      {lesson.tips?.map((t, i) => (
                        <TipBox key={i} tip={t} />
                      ))}

                      {lesson.demos?.map((d, i) => (
                        <DemoBox key={`${lesson.id}-demo-${i}`} demo={d} />
                      ))}
                    </div>

                    <NotePanel
                      targetType="lesson"
                      targetId={lesson.id}
                      courseId={course.id}
                      chapterId={chapter.id}
                      targetTitle={lesson.title}
                    />
                  </section>
                );
              })}
            </div>

            {/* 本章学完提示横幅 */}
            <div className="chapter-complete-card">
              <div className="complete-card-left">
                <div className="complete-card-icon">🎉</div>
                <div>
                  <div className="complete-card-title">第 {idx + 1} 章全章知识点已阅读完毕</div>
                  <div className="complete-card-desc">
                    本章共 {chapter.lessons.length} 个知识点，趁热打铁，通过 {chapter.exercises.length} 道阶梯式习题巩固强化所学！
                  </div>
                </div>
              </div>
              <Link to={`/practice/${course.id}/${chapter.id}`} className="btn btn-primary">
                ✏️ 开始本章练习 ({chapter.exercises.length} 题) →
              </Link>
            </div>

            {/* 跨章跳转导航 */}
            <div className="chapter-footer" style={{ marginTop: 20 }}>
              {prev ? (
                <Link to={`/course/${course.id}/chapter/${prev.id}`} className="btn">
                  ← 上一章：{prev.title}
                </Link>
              ) : (
                <span />
              )}
              {next ? (
                <Link to={`/course/${course.id}/chapter/${next.id}`} className="btn btn-primary">
                  下一章：{next.title} →
                </Link>
              ) : (
                <span />
              )}
            </div>
          </div>
        ) : (
          /* ═══ 模式二：单节聚焦阅读（传统逐节切换） ═══ */
          <div className="chapter-content">
            <div className="lesson-head">
              <div>
                <h1 className="lesson-title">{active.title}</h1>
                <div className="muted">
                  第 {idx + 1} 章 · 小节 {activeIdx + 1}/{chapter.lessons.length}
                </div>
              </div>
              <button
                className={`btn ${Boolean(state.lessons[active.id]?.read) ? 'btn-success' : ''}`}
                onClick={() =>
                  markLessonRead({ lessonId: active.id, courseId: course.id, chapterId: chapter.id, read: true })
                }
                disabled={Boolean(state.lessons[active.id]?.read)}
              >
                {Boolean(state.lessons[active.id]?.read) ? '✓ 已学习' : '标记为已学习'}
              </button>
            </div>

            <div className="lesson-body">
              <Markdown text={active.content} />

              {active.tips?.map((t, i) => (
                <TipBox key={i} tip={t} />
              ))}

              {active.demos?.map((d, i) => (
                <DemoBox key={`${active.id}-demo-${i}`} demo={d} />
              ))}
            </div>

            <div className="lesson-nav">
              {activeIdx > 0 ? (
                <button className="btn" onClick={() => setActiveId(chapter.lessons[activeIdx - 1].id)}>
                  ← 上一节：{chapter.lessons[activeIdx - 1].title}
                </button>
              ) : (
                <span />
              )}
              {activeIdx < chapter.lessons.length - 1 ? (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    if (!Boolean(state.lessons[active.id]?.read)) {
                      markLessonRead({ lessonId: active.id, courseId: course.id, chapterId: chapter.id, read: true });
                    }
                    setActiveId(chapter.lessons[activeIdx + 1].id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  下一节：{chapter.lessons[activeIdx + 1].title} →
                </button>
              ) : (
                <Link
                  to={`/practice/${course.id}/${chapter.id}`}
                  className="btn btn-primary"
                  onClick={() => {
                    if (!Boolean(state.lessons[active.id]?.read)) {
                      markLessonRead({ lessonId: active.id, courseId: course.id, chapterId: chapter.id, read: true });
                    }
                  }}
                >
                  学完了，去做练习 →
                </Link>
              )}
            </div>

            <NotePanel
              targetType="lesson"
              targetId={active.id}
              courseId={course.id}
              chapterId={chapter.id}
              targetTitle={active.title}
            />

            <div className="chapter-footer">
              {prev ? (
                <Link to={`/course/${course.id}/chapter/${prev.id}`} className="btn btn-sm">
                  ← {prev.title}
                </Link>
              ) : (
                <span />
              )}
              {next ? (
                <Link to={`/course/${course.id}/chapter/${next.id}`} className="btn btn-sm">
                  {next.title} →
                </Link>
              ) : (
                <span />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
