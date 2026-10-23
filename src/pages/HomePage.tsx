import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { getCourses, courseStats, siteStats, coursesByDomain } from '../content';
import { useContent } from '../store/contentStore';
import { chapterProgress, recentDays, useStudyState } from '../store/studyState';
import { TYPE_META } from '../components/ExerciseRunner';

export function HomePage() {
  const state = useStudyState();
  const { courses, status, source } = useContent();
  const stats = useMemo(() => siteStats(), [courses, status]);
  const days = useMemo(() => recentDays(7), [state]);

  const courseList = useMemo(() => getCourses(), [courses, status]);
  const grouped = useMemo(() => coursesByDomain(), [courses, status]);
  const domainMap = useMemo(
    () => Object.fromEntries(useContent().domains.map((d) => [d.id, d])),
    [courses, status],
  );

  const mastered = Object.values(state.mastery).filter((m) => m.lastCorrect).length;
  const weekAttempts = days.reduce((s, d) => s + d.attempts, 0);
  const weekCorrect = days.reduce((s, d) => s + d.correct, 0);

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-badge">📚 系统化课程 + 在线判分 · 不依赖视频</div>
          <h1 className="hero-title">
            用练习学会任何知识，
            <br />
            而不是看完就忘。
          </h1>
          <p className="hero-sub">
            {courseList.length} 门课程 · {stats.chapters} 个章节 · {stats.lessons} 个知识点 ·{' '}
            {stats.exercises} 道带自动判分的习题。
            每题都在浏览器内真实运行 Python / SQLite，提交即得到逐项反馈。
          </p>
          <div className="hero-actions">
            <Link to="/course/python" className="btn btn-primary btn-lg">
              从 Python 开始 →
            </Link>
            <Link to="/review" className="btn btn-lg">
              ⏰ 今日复习
            </Link>
            <Link to="/admin" className="btn btn-lg">
              ✏️ 内容管理
            </Link>
          </div>
          <div className="hero-stats">
            <div>
              <div className="stat-value">{(mastered / Math.max(stats.exercises, 1) * 100).toFixed(0)}%</div>
              <div className="stat-label">已掌握习题（{mastered}/{stats.exercises}）</div>
            </div>
            <div>
              <div className="stat-value">{state.streakDays}</div>
              <div className="stat-label">连续学习天数</div>
            </div>
            <div>
              <div className="stat-value">{weekAttempts}</div>
              <div className="stat-label">近 7 天作答次数</div>
            </div>
            <div>
              <div className="stat-value">{weekAttempts ? `${Math.round((weekCorrect / weekAttempts) * 100)}%` : '—'}</div>
              <div className="stat-label">近 7 天正确率</div>
            </div>
          </div>
          {source === 'builtin' && (
            <div className="content-hint">
              ⚠️ 当前使用内置内容（后端未连接）。启动 <code>npm run server</code> 后可使用内容管理与动态课程。
            </div>
          )}
        </div>
      </section>

      {grouped.map(({ domainId, courses: list }) => {
        const domain = domainMap[domainId];
        return (
          <section key={domainId} style={{ marginTop: 28 }}>
            <div className="row" style={{ marginBottom: 14 }}>
              <h2 className="section-title" style={{ fontSize: 18, margin: 0 }}>
                {domain?.icon ?? '📁'} {domain?.title ?? domainId}
              </h2>
              <span className="muted">{domain?.description}</span>
              <span className="badge">{list.length} 门课程</span>
            </div>

            <div className="course-grid">
              {list.map((course) => {
                const s = courseStats(course);
                const done = course.chapters.reduce((acc, ch) => acc + chapterProgress(ch).done, 0);
                const ratio = s.exercises ? done / s.exercises : 0;
                return (
                  <Link
                    key={course.id}
                    to={`/course/${course.id}`}
                    className="course-card"
                    style={{ ['--card-color' as string]: course.color, ['--card-soft' as string]: `${course.color}14` }}
                  >
                    <div className="row">
                      <div className="course-icon">{course.icon}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{course.title}</div>
                        <div className="muted">{course.subtitle}</div>
                      </div>
                    </div>
                    <p className="course-desc">{course.description}</p>
                    <div className="row" style={{ marginTop: 'auto' }}>
                      <span className="badge">
                        {course.chapters.length} 章 · {s.lessons} 节
                      </span>
                      <span className="badge badge-blue">{s.exercises} 题</span>
                      <span className="badge">约 {course.estimatedHours} 小时</span>
                      <div className="spacer" />
                      <span className="muted">{Math.round(ratio * 100)}%</span>
                    </div>
                    <div className="course-progress">
                      <div style={{ width: `${ratio * 100}%`, background: course.color }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      <section className="home-grid" style={{ marginTop: 32 }}>
        <div className="panel panel-pad">
          <h2 className="section-title">✨ 这个平台和看视频有什么不同</h2>
          <ul className="feature-list">
            <li>
              <b>知识点写得细</b>：每个小节讲清楚"是什么、为什么、易错点"，而不是只念一遍语法。
            </li>
            <li>
              <b>7 种题型</b>：单选、多选、判断、填空、编程、SQL、简答案例分析，避免"只做选择题假会"。
            </li>
            <li>
              <b>代码真跑</b>：Pyodide 在浏览器里运行真实 Python + pandas；SQL 题在真实 SQLite 上执行并比对结果集。
            </li>
            <li>
              <b>艾宾浩斯复习</b>：按遗忘曲线自动安排复习，1/2/4/7/15/30/60/120 天间隔，答错回退。
            </li>
            <li>
              <b>内容自己录</b>：通过「内容管理」后台随时新增课程、章节、知识点与习题，数据存本地文件。
            </li>
          </ul>
        </div>

        <div className="panel panel-pad">
          <h2 className="section-title">🧩 题型分布</h2>
          <div className="type-bars">
            {Object.entries(TYPE_META).map(([key, meta]) => {
              const n = stats.byType[key] ?? 0;
              const pct = stats.exercises ? (n / stats.exercises) * 100 : 0;
              return (
                <div key={key} className="type-bar-row">
                  <span className="type-bar-label">
                    {meta.icon} {meta.label}
                  </span>
                  <div className="type-bar">
                    <div style={{ width: `${pct}%`, background: meta.color }} />
                  </div>
                  <span className="type-bar-num">{n}</span>
                </div>
              );
            })}
          </div>
          <p className="muted" style={{ marginTop: 14 }}>
            共 {stats.exercises} 道题。建议每学完一节立即做对应习题，隔 3 天再重做错题——连续答对 2 次才算掌握。
          </p>
        </div>
      </section>
    </div>
  );
}
