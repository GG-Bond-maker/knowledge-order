import { Link, useParams } from 'react-router-dom';
import { findCourse, courseStats } from '../content';
import { chapterDifficulty } from '../content/difficulty';
import { chapterProgress, useStudyState } from '../store/studyState';
import { TYPE_META } from '../components/ExerciseRunner';
import { NotFoundPage } from './NotFoundPage';

export function CoursePage() {
  const { courseId } = useParams();
  const course = findCourse(courseId);
  const state = useStudyState();

  if (!course) return <NotFoundPage />;

  const stats = courseStats(course);
  const totalDone = course.chapters.reduce((s, ch) => s + chapterProgress(ch).done, 0);

  return (
    <div>
      <div className="course-hero" style={{ ['--card-color' as string]: course.color }}>
        <div className="row" style={{ gap: 16 }}>
          <div className="course-icon" style={{ width: 56, height: 56, fontSize: 28, background: `${course.color}18` }}>
            {course.icon}
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

      <div className="chapter-list">
        {course.chapters.map((ch, idx) => {
          const p = chapterProgress(ch);
          const diff = chapterDifficulty(ch);
          const typeCount = ch.exercises.reduce<Record<string, number>>((acc, e) => {
            acc[e.type] = (acc[e.type] ?? 0) + 1;
            return acc;
          }, {});
          const readCount = ch.lessons.filter((l) => state.lessons[l.id]?.read).length;
          return (
            <div key={ch.id} className="panel chapter-card">
              <div className="chapter-order" style={{ color: course.color, borderColor: `${course.color}44` }}>
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
                      color: diff.levelColor,
                      border: `1px solid ${diff.levelColor}40`,
                    }}
                    title={`综合难度 ${diff.score}/5`}
                  >
                    {diff.level}
                  </span>
                  {p.ratio === 1 && <span className="badge badge-green">已完成</span>}
                </div>
                <div className="chapter-goal">{ch.goal}</div>
                <div className="row-wrap" style={{ gap: 6, marginTop: 8 }}>
                  <span className="badge">
                    知识点 {ch.lessons.length} 节{readCount ? ` · 已读 ${readCount}` : ''}
                  </span>
                  <span className="badge">习题 {ch.exercises.length} 道</span>
                  {Object.entries(typeCount).map(([t, n]) => (
                    <span key={t} className="badge" style={{ background: `${TYPE_META[t as keyof typeof TYPE_META].color}12`, color: TYPE_META[t as keyof typeof TYPE_META].color }}>
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
                    📖 学习
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
