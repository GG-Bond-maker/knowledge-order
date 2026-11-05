import { Link, useParams } from 'react-router-dom';
import { findCourse, courseStats } from '../content';
import { chapterDifficulty } from '../content/difficulty';
import { chapterProgress, useStudyState } from '../store/studyState';
import { useContent } from '../store/contentStore';
import { TYPE_META } from '../components/ExerciseRunner';
import { CourseIcon } from '../components/CourseIcon';
import { NotFoundPage } from './NotFoundPage';
import './guppy-project.css';

export function CoursePage() {
  useContent();
  const { courseId } = useParams();
  const course = findCourse(courseId);
  const state = useStudyState();

  if (!course) return <NotFoundPage />;

  const stats = courseStats(course);
  const totalDone = course.chapters.reduce((s, ch) => s + chapterProgress(ch).done, 0);
  const totalRead = course.chapters.reduce(
    (sum, ch) => sum + ch.lessons.filter((lesson) => state.lessons[lesson.id]?.read).length,
    0,
  );
  const allCourseRead = course.chapters.every((ch) => ch.lessons.every((lesson) => state.lessons[lesson.id]?.read));
  const allCourseDone = totalDone >= stats.exercises && allCourseRead;
  const nextChapter =
    course.chapters.find((ch) => {
      const progress = chapterProgress(ch);
      const hasUnread = ch.lessons.some((lesson) => !state.lessons[lesson.id]?.read);
      return progress.ratio < 1 || hasUnread;
    }) ?? course.chapters[0];
  const nextChapterIndex = course.chapters.findIndex((ch) => ch.id === nextChapter.id);
  const nextChapterProgress = chapterProgress(nextChapter);
  const autoGradedCount = stats.exercises - (stats.byType.open ?? 0);
  const runnableCount = (stats.byType.code ?? 0) + (stats.byType.sql ?? 0);

  return (
    <div>
      <div className="course-hero" style={{ ['--card-color' as string]: course.color }}>
        <div className="row" style={{ gap: 16 }}>
          <div className="course-icon" style={{ width: 56, height: 56, fontSize: 28, background: `${course.color}18`, overflow: 'hidden' }}>
            <CourseIcon icon={course.icon} courseId={course.id} color={course.color} size={30} />
          </div>
          <div>
            <h1 className="course-title">{course.title}</h1>
            <div className="muted">{course.subtitle}</div>
          </div>
        </div>
        <p className="course-intro">{course.description}</p>
        <div className="row-wrap" style={{ gap: 10 }}>
          <span className="badge badge-blue">
            {course.chapters.length} 章 · {stats.lessons} 个知识点
          </span>
          <span className="badge">{stats.exercises} 道习题</span>
          <span className="badge">
            面向：{course.targetAudience}
          </span>
          <span className="badge">预计 {course.estimatedHours} 小时</span>
          {course.prerequisites.length > 0 && (
            <span className="badge badge-orange">
              前置：{course.prerequisites.map((p) => findCourse(p)?.title ?? p).join('、')}
            </span>
          )}
        </div>
        <div className="progress-outer" style={{ marginTop: 16 }}>
          <div className="progress-inner" style={{ width: `${(totalDone / Math.max(stats.exercises, 1)) * 100}%`, background: course.color }} />
        </div>
        <div className="muted" style={{ marginTop: 6 }}>
          课程进度：{totalDone} / {stats.exercises} 题已答对（{Math.round((totalDone / Math.max(stats.exercises, 1)) * 100)}%）
        </div>
      </div>

      <section
        className="course-next-step"
        aria-labelledby="course-next-title"
        style={{
          ['--course-accent' as string]: course.color,
          ['--course-accent-soft' as string]: `${course.color}18`,
        }}
      >
        <div className="course-next-main">
          <div className="course-next-kicker">
            {allCourseDone ? '课程已完成 · 进入巩固' : totalDone + totalRead > 0 ? '推荐下一步' : '从这里开始'}
          </div>
          <h2 id="course-next-title">
            {allCourseDone
              ? '用间隔复习把已掌握的内容留在长期记忆里'
              : `第 ${nextChapterIndex + 1} 章 · ${nextChapter.title}`}
          </h2>
          <p>
            {allCourseDone
              ? `本课程 ${stats.lessons} 个知识点与 ${stats.exercises} 道习题均已完成。下一步不再是继续刷新内容，而是按间隔复习与错题记录回访薄弱位置。`
              : nextChapter.goal}
          </p>
          <div className="course-next-actions">
            <Link
              to={allCourseDone ? '/spaced-review' : `/course/${course.id}/chapter/${nextChapter.id}`}
              className="btn btn-primary"
            >
              {allCourseDone ? '进入间隔复习' : totalDone + totalRead > 0 ? '继续这一章' : '从第一章开始'}
            </Link>
            {!allCourseDone && (
              <Link to={`/practice/${course.id}/${nextChapter.id}`} className="btn">
                先做本章题（{nextChapter.exercises.length} 道）
              </Link>
            )}
          </div>
          <div className="course-prereq-line">
            <span>先修检查</span>
            {course.prerequisites.length > 0 ? (
              <div>
                {course.prerequisites.map((prerequisiteId) => {
                  const prerequisite = findCourse(prerequisiteId);
                  return prerequisite ? (
                    <Link key={prerequisiteId} to={`/course/${prerequisite.id}`}>
                      {prerequisite.title}
                    </Link>
                  ) : (
                    <span key={prerequisiteId}>{prerequisiteId}</span>
                  );
                })}
              </div>
            ) : (
              <p>无硬性前置，按章节顺序学习即可。</p>
            )}
          </div>
        </div>

        <div className="course-loop-wrap">
          <div className="course-loop-head">
            <span>学习闭环</span>
            <small>
              当前 {totalRead}/{stats.lessons} 节已读 · {totalDone}/{stats.exercises} 题已掌握
            </small>
          </div>
          <ol className="course-loop-list">
            <li>
              <span className="course-loop-num">01</span>
              <div>
                <b>读：建立因果链</b>
                <p>本章 {nextChapter.lessons.length} 个知识点，先弄清每一步解决什么问题，再记公式。</p>
              </div>
            </li>
            <li>
              <span className="course-loop-num">02</span>
              <div>
                <b>练：让错误暴露出来</b>
                <p>
                  本章 {nextChapter.exercises.length} 道分层题，当前已掌握 {nextChapterProgress.done}/
                  {nextChapterProgress.total} 道。
                </p>
              </div>
            </li>
            <li>
              <span className="course-loop-num">03</span>
              <div>
                <b>验：把知识迁移到新问题</b>
                <p>
                  {runnableCount > 0
                    ? `全课 ${autoGradedCount} 道自动判分题，其中 ${runnableCount} 道可运行代码/SQL 任务。`
                    : `全课 ${autoGradedCount} 道自动判分题；开放题按评分点自评，错题自动进入复习。`}
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {course.id === 'llm-a1' && (
        <section className="guppy-course-entry" aria-labelledby="guppy-course-entry-title">
          <div className="guppy-course-entry-copy">
            <h2 id="guppy-course-entry-title">GuppyLM：把 8.7M 参数的小鱼跑通</h2>
            <p>八个任务串起 BPE、Transformer、训练、生成与 ONNX 部署。每一项都带源码、真实结果和验收证据。</p>
            <div className="guppy-course-entry-badges">
              <span>08 个任务</span>
              <span>真实源码</span>
              <span>可复现实验</span>
            </div>
          </div>
          <Link to="/project/guppylm" className="guppy-course-entry-link">
            进入核心项目工作台
          </Link>
        </section>
      )}

      <div className="chapter-list">
        {course.chapters.map((ch, idx) => {
          const p = chapterProgress(ch);
          const diff = chapterDifficulty(ch);
          const typeCount = ch.exercises.reduce<Record<string, number>>((acc, e) => {
            acc[e.type] = (acc[e.type] ?? 0) + 1;
            return acc;
          }, {});
          const readCount = ch.lessons.filter((l) => state.lessons[l.id]?.read).length;
          const isRecommendedNext = !allCourseDone && ch.id === nextChapter.id;
          return (
            <div
              key={ch.id}
              className={`panel chapter-card${isRecommendedNext ? ' chapter-card--next' : ''}`}
              style={
                isRecommendedNext
                  ? {
                      ['--course-accent' as string]: course.color,
                      borderColor: `${course.color}55`,
                      boxShadow: `0 8px 26px ${course.color}12`,
                    }
                  : undefined
              }
            >
              <div
                className="chapter-order"
                style={{
                  color: '#354156',
                  background: `${course.color}0f`,
                  borderColor: `${course.color}55`,
                }}
              >
                {String(idx + 1).padStart(2, '0')}
              </div>
              <div className="chapter-main">
                <div className="row">
                  <Link to={`/course/${course.id}/chapter/${ch.id}`} className="chapter-title">
                    {ch.title}
                  </Link>
                  <span
                    className="badge"
                    style={{
                      background: `${diff.levelColor}16`,
                      color: '#354156',
                      border: `1px solid ${diff.levelColor}55`,
                    }}
                    title={`综合难度 ${diff.score}/5`}
                  >
                    {diff.level}
                  </span>
                  {isRecommendedNext && (
                    <span
                      className="badge"
                      style={{
                        background: `${course.color}12`,
                        color: '#354156',
                        border: `1px solid ${course.color}55`,
                      }}
                    >
                      推荐下一步
                    </span>
                  )}
                  {p.ratio === 1 && <span className="badge badge-green">已完成</span>}
                </div>
                <div className="chapter-goal">{ch.goal}</div>
                <div className="row-wrap" style={{ gap: 6, marginTop: 8 }}>
                  <span className="badge">
                    知识点 {ch.lessons.length} 节{readCount ? ` · 已读 ${readCount}` : ''}
                  </span>
                  <span className="badge">习题 {ch.exercises.length} 道</span>
                  {Object.entries(typeCount).map(([t, n]) => (
                    <span key={t} className="badge" style={{ background: `${TYPE_META[t as keyof typeof TYPE_META].color}12`, color: '#354156', border: `1px solid ${TYPE_META[t as keyof typeof TYPE_META].color}38` }}>
                      {TYPE_META[t as keyof typeof TYPE_META].label} {n}
                    </span>
                  ))}
                </div>
              </div>
              <div className="chapter-side">
                <div className="chapter-progress-text">
                  <b>{p.done}</b>/{p.total}
                </div>
                <div className="progress-outer" style={{ width: 110 }}>
                  <div className="progress-inner" style={{ width: `${p.ratio * 100}%`, background: course.color }} />
                </div>
                <div className="row" style={{ marginTop: 12 }}>
                  <Link to={`/course/${course.id}/chapter/${ch.id}`} className="btn btn-sm">
                    {isRecommendedNext ? '继续学习' : '进入章节'}
                  </Link>
                  <Link to={`/practice/${course.id}/${ch.id}`} className="btn btn-sm btn-primary">
                    开始练习
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
