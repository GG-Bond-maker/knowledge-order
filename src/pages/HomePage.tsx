import { Link, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { getCourses, courseStats, siteStats } from '../content';
import { useContent } from '../store/contentStore';
import { chapterProgress, recentDays, useStudyState } from '../store/studyState';
import { dueExerciseIds } from '../store/reviewScheduler';
import { TYPE_META } from '../components/ExerciseRunner';
import { CourseIcon } from '../components/CourseIcon';

/** 学科分类切换标签 */
const DOMAIN_TABS = [
  { id: 'all', label: '全部学科', icon: '🌌' },
  { id: 'ml', label: '机器学习', icon: '🧠' },
  { id: 'python-track', label: 'Python 现代开发', icon: '🐍' },
  { id: 'ai', label: '人工智能 · 大模型', icon: '🤖' },
  { id: 'data-engineering', label: '数据工程与管道', icon: '🛠️' },
  { id: 'ai-native', label: 'AI Native 软件工程', icon: '💻' },
  { id: 'data', label: '数据分析与方法', icon: '📊' },
  { id: 'mining', label: '数据挖掘与算法', icon: '⛏️' },
  { id: 'quant', label: '量化金融工程', icon: '📈' },
  { id: 'coding', label: '核心算法', icon: '⚡' },
];

export function HomePage() {
  const navigate = useNavigate();
  const state = useStudyState();
  const { courses, status, source, domains } = useContent();

  const [activeDomain, setActiveDomain] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const stats = useMemo(() => siteStats(), [courses, status]);
  const days = useMemo(() => recentDays(7), [state]);
  const courseList = useMemo(() => getCourses(), [courses, status]);

  const domainMap = useMemo(
    () => Object.fromEntries(domains.map((d) => [d.id, d])),
    [domains],
  );

  // 核心指标计算
  const mastered = useMemo(
    () => Object.values(state.mastery).filter((m) => m.lastCorrect).length,
    [state.mastery],
  );
  const masteryRate = useMemo(
    () => (stats.exercises > 0 ? (mastered / stats.exercises) * 100 : 0),
    [mastered, stats.exercises],
  );

  const dueCount = useMemo(() => dueExerciseIds(state.mastery).length, [state.mastery]);
  const wrongCount = useMemo(
    () => Object.values(state.mastery).filter((m) => m.everWrong && !m.lastCorrect).length,
    [state.mastery],
  );

  const weekAttempts = useMemo(() => days.reduce((s, d) => s + d.attempts, 0), [days]);
  const weekCorrect = useMemo(() => days.reduce((s, d) => s + d.correct, 0), [days]);
  const weekAccuracy = useMemo(
    () => (weekAttempts > 0 ? Math.round((weekCorrect / weekAttempts) * 100) : 0),
    [weekAttempts, weekCorrect],
  );

  // 计算最大单日作答次数（用于微图表相对高度计算）
  const maxDayAttempts = useMemo(
    () => Math.max(10, ...days.map((d) => d.attempts)),
    [days],
  );

  // 上次研习进度推断
  const recentResume = useMemo(() => {
    const readLessons = Object.values(state.lessons).filter((l) => l.read);
    if (readLessons.length === 0) return null;

    const sorted = [...readLessons].sort((a, b) => {
      const tA = a.readAt ?? 0;
      const tB = b.readAt ?? 0;
      return tB - tA;
    });

    const latest = sorted[0];
    const course = courseList.find((c) => c.id === latest.courseId);
    if (!course) return null;

    const chapter = course.chapters.find((ch) => ch.id === latest.chapterId) ?? course.chapters[0];
    const p = chapterProgress(chapter);
    const chapterIdx = course.chapters.findIndex((ch) => ch.id === chapter.id);

    return {
      course,
      chapter,
      chapterIdx: chapterIdx >= 0 ? chapterIdx + 1 : 1,
      progress: p,
    };
  }, [state.lessons, courseList]);

  // 课程搜索与学科分类过滤
  const filteredCourses = useMemo(() => {
    return courseList.filter((course) => {
      const cDomain = course.domainId ?? 'data';

      // 学科过滤
      if (activeDomain !== 'all') {
        if (activeDomain === 'ai') {
          // 大模型系列与 ai 域归并
          if (cDomain !== 'ai' && !course.seriesId) return false;
        } else if (cDomain !== activeDomain) {
          return false;
        }
      }

      // 关键词检索
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        course.title.toLowerCase().includes(q) ||
        course.subtitle?.toLowerCase().includes(q) ||
        course.description?.toLowerCase().includes(q) ||
        course.id.toLowerCase().includes(q)
      );
    });
  }, [courseList, activeDomain, searchQuery]);

  // 时间问候语
  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 6) return '夜深了，注意护眼休息';
    if (hour < 12) return '早上好，开启专注研习';
    if (hour < 18) return '下午好，继续稳步提升';
    return '晚上好，复盘今日认知';
  }, []);

  return (
    <div className="dark-dashboard" role="main">
      {/* ─────────── 1. 顶部欢迎横幅与快捷行动 ─────────── */}
      <section className="dash-hero-banner" aria-label="仪表板主概览">
        <div className="dash-hero-content">
          <div className="dash-badge-row">
            <span className="dash-chip dash-chip-live">
              <span className="live-dot" aria-hidden="true" />
              <span>WebAssembly 沙箱已就绪</span>
            </span>
            <span className="dash-chip">
              <span>📚 52 门体系化研习课程</span>
            </span>
            {dueCount > 0 ? (
              <span className="dash-chip dash-chip-due">
                <span>⏰ 今日待复习 {dueCount} 题</span>
              </span>
            ) : (
              <span className="dash-chip">
                <span>✨ 今日艾宾浩斯复盘已达标</span>
              </span>
            )}
          </div>

          <h1 className="dash-hero-title">
            {greetingText}，<span className="brand-gradient">知序探索者</span>
          </h1>
          <p className="dash-hero-desc">
            全站共构建 <strong>{stats.chapters}</strong> 个严谨章节、<strong>{stats.lessons}</strong> 个细分知识点与{' '}
            <strong>{stats.exercises}</strong> 道真实在线可运行习题。不依赖被动网课视频，纯靠文字推导、SVG 交互动图与真实代码沙箱，建立可迁移的硬核工程能力。
          </p>
        </div>

        <div className="dash-hero-actions">
          <button
            className="db-btn db-btn-primary"
            onClick={() => {
              if (recentResume) {
                navigate(`/course/${recentResume.course.id}/chapter/${recentResume.chapter.id}`);
              } else {
                navigate('/course/python-foundations-data');
              }
            }}
            aria-label={recentResume ? `继续研习 ${recentResume.course.title}` : '开始 Python 基础学习'}
          >
            <span>{recentResume ? '▶ 继续上次研习' : '🚀 从 Python 基础起航'}</span>
          </button>
          <Link to="/learning-map" className="db-btn db-btn-outline" aria-label="查看全学科学习地图">
            <span>🗺️ 查看全学科地铁图</span>
          </Link>
          <Link to="/spaced-review" className="db-btn db-btn-outline" aria-label="进入艾宾浩斯复盘">
            <span>⏰ 艾宾浩斯复盘</span>
          </Link>
        </div>
      </section>

      {/* ─────────── 2. 核心指标 Bento KPI 网格 ─────────── */}
      <section className="dash-kpi-grid" aria-label="核心学习指标">
        {/* KPI 1: 题库全真掌握度 */}
        <div className="dash-kpi-card" style={{ ['--kpi-accent' as string]: '#6366f1' }}>
          <div className="dash-kpi-head">
            <span className="dash-kpi-title">题库掌握度</span>
            <div className="dash-kpi-icon" aria-hidden="true">🎯</div>
          </div>
          <div className="dash-kpi-value-row">
            <span className="dash-kpi-value">{masteryRate.toFixed(1)}%</span>
            <span className="dash-kpi-unit">({mastered}/{stats.exercises} 题)</span>
          </div>
          <div className="dash-kpi-progress">
            <div
              className="dash-kpi-progress-bar"
              style={{ width: `${Math.min(100, Math.max(0, masteryRate))}%` }}
              role="progressbar"
              aria-valuenow={Math.round(masteryRate)}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <div className="dash-kpi-footer">
            <span>连续答对 2 次即判定完全掌握</span>
            <span style={{ color: '#818cf8', fontWeight: 600 }}>双向判题</span>
          </div>
        </div>

        {/* KPI 2: 连续学力天数 */}
        <div className="dash-kpi-card" style={{ ['--kpi-accent' as string]: '#f59e0b' }}>
          <div className="dash-kpi-head">
            <span className="dash-kpi-title">连续打卡学力</span>
            <div
              className="dash-kpi-icon"
              style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}
              aria-hidden="true"
            >
              🔥
            </div>
          </div>
          <div className="dash-kpi-value-row">
            <span className="dash-kpi-value">{state.streakDays}</span>
            <span className="dash-kpi-unit">天连击</span>
          </div>
          <div className="dash-kpi-progress">
            <div
              className="dash-kpi-progress-bar"
              style={{
                width: `${Math.min(100, (state.streakDays / Math.max(state.longestStreak, 7)) * 100)}%`,
                background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
              }}
            />
          </div>
          <div className="dash-kpi-footer">
            <span>历史最高连续：<strong>{state.longestStreak}</strong> 天</span>
            <span style={{ color: '#fbbf24' }}>神经突触强化</span>
          </div>
        </div>

        {/* KPI 3: 近 7 天作答负荷与微图表 */}
        <div className="dash-kpi-card" style={{ ['--kpi-accent' as string]: '#10b981' }}>
          <div className="dash-kpi-head">
            <span className="dash-kpi-title">近 7 日作答负荷</span>
            <div
              className="dash-kpi-icon"
              style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}
              aria-hidden="true"
            >
              📊
            </div>
          </div>
          <div className="dash-kpi-value-row">
            <span className="dash-kpi-value">{weekAttempts}</span>
            <span className="dash-kpi-unit">次 · 正确率 {weekAccuracy}%</span>
          </div>
          {/* 近 7 日作答微图表 */}
          <div className="dash-days-chart" aria-label="近 7 日作答次数分布">
            {days.map((day) => {
              const heightPct = Math.round((day.attempts / maxDayAttempts) * 100);
              const label = day.date.slice(5); // MM-DD
              return (
                <div key={day.date} className="dash-day-col" title={`${day.date}: ${day.attempts} 次作答，正确率 ${day.attempts ? Math.round((day.correct / day.attempts) * 100) : 0}%`}>
                  <div className="dash-day-bar-wrap">
                    <div
                      className="dash-day-bar-fill"
                      style={{
                        height: `${Math.max(day.attempts > 0 ? 15 : 0, heightPct)}%`,
                        background:
                          day.attempts === 0
                            ? 'transparent'
                            : day.correct / day.attempts >= 0.8
                            ? 'linear-gradient(180deg, #34d399 0%, #059669 100%)'
                            : 'linear-gradient(180deg, #818cf8 0%, #4f46e5 100%)',
                      }}
                    />
                  </div>
                  <span className="dash-day-name">{label}</span>
                </div>
              );
            })}
          </div>
          <div className="dash-kpi-footer" style={{ marginTop: 6 }}>
            <span>近 7 天累计作答 {weekAttempts} 题</span>
            <span style={{ color: '#34d399' }}>准确率 {weekAccuracy}%</span>
          </div>
        </div>

        {/* KPI 4: 知识网络全貌 */}
        <div className="dash-kpi-card" style={{ ['--kpi-accent' as string]: '#38bdf8' }}>
          <div className="dash-kpi-head">
            <span className="dash-kpi-title">知识工程网络</span>
            <div
              className="dash-kpi-icon"
              style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}
              aria-hidden="true"
            >
              🌐
            </div>
          </div>
          <div className="dash-kpi-value-row">
            <span className="dash-kpi-value">{courseList.length}</span>
            <span className="dash-kpi-unit">门课程 · 7 大学科</span>
          </div>
          <div className="dash-kpi-progress">
            <div
              className="dash-kpi-progress-bar"
              style={{ width: '100%', background: 'linear-gradient(90deg, #0284c7, #38bdf8)' }}
            />
          </div>
          <div className="dash-kpi-footer">
            <span>覆盖 Python、大模型、数据工程、量化</span>
            <Link to="/learning-map" style={{ color: '#38bdf8', fontWeight: 600 }}>
              地铁路线图 →
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────── 3. 智能恢复卡片 (Resume Learning Hero) ─────────── */}
      <section className="dash-resume-card" aria-label="智能继续研习">
        <div className="dash-resume-left">
          <div className="dash-resume-icon" aria-hidden="true">
            {recentResume ? (
              <CourseIcon
                icon={recentResume.course.icon}
                courseId={recentResume.course.id}
                color={recentResume.course.color}
                size={28}
              />
            ) : (
              '🚀'
            )}
          </div>
          <div className="dash-resume-meta">
            <div className="dash-resume-label">
              {recentResume ? '上次学习记录' : '🎯 推荐研习首发航线'}
            </div>
            <h2 className="dash-resume-title">
              {recentResume
                ? `${recentResume.course.title} · 第 ${recentResume.chapterIdx} 章 ${recentResume.chapter.title}`
                : 'Python 基础与数据处理 (零基础全景硬核教程)'}
            </h2>
            <div className="dash-resume-sub">
              {recentResume ? (
                <span>
                  本章已掌握 {recentResume.progress.done} / {recentResume.progress.total} 道习题 ({Math.round(recentResume.progress.ratio * 100)}%)
                </span>
              ) : (
                <span>从 Python 解释器执行模型、变量堆指针到 NumPy/Pandas 真实业务全流程清洗</span>
              )}
            </div>
          </div>
        </div>

        <div className="dash-resume-actions">
          {recentResume ? (
            <>
              <Link
                to={`/course/${recentResume.course.id}/chapter/${recentResume.chapter.id}`}
                className="db-btn db-btn-primary"
                aria-label={`继续学习 ${recentResume.chapter.title}`}
              >
                <span>▶ 继续第 {recentResume.chapterIdx} 章：{recentResume.chapter.title}</span>
              </Link>
              <Link
                to={`/practice/${recentResume.course.id}/${recentResume.chapter.id}`}
                className="db-btn db-btn-outline"
                aria-label="做本章练习"
              >
                <span>✏️ 做本章练习 ({recentResume.chapter.exercises.length} 题)</span>
              </Link>
            </>
          ) : (
            <Link
              to="/course/python-foundations-data"
              className="db-btn db-btn-primary"
              aria-label="从 Python 基础开始"
            >
              <span>🚀 开启 Python 基础研习之旅 →</span>
            </Link>
          )}
        </div>
      </section>

      {/* ─────────── 4. 艾宾浩斯待办与错题预警 ─────────── */}
      {(dueCount > 0 || wrongCount > 0) && (
        <aside className="dash-alert-strip" aria-label="艾宾浩斯复盘提醒">
          <div className="dash-alert-strip-left">
            <span style={{ fontSize: 20 }} aria-hidden="true">⏰</span>
            <div>
              今日有 <strong>{dueCount}</strong> 道题目到达艾宾浩斯遗忘临界点
              {wrongCount > 0 && <>，错题本尚有 <strong>{wrongCount}</strong> 道弱项待攻克</>}。
              建议趁热打铁，在认知退化前完成闭环强化。
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {dueCount > 0 && (
              <Link to="/spaced-review" className="db-btn db-btn-primary" style={{ minHeight: 34, padding: '6px 14px', fontSize: 13 }}>
                立即复习 ({dueCount} 题)
              </Link>
            )}
            {wrongCount > 0 && (
              <Link to="/review" className="db-btn db-btn-outline" style={{ minHeight: 34, padding: '6px 14px', fontSize: 13 }}>
                刷错题本 ({wrongCount})
              </Link>
            )}
          </div>
        </aside>
      )}

      {/* ─────────── 5. 课程全景大厅与多维检索 ─────────── */}
      <section aria-label="全景课程分类与导航">
        <div className="dash-catalog-header">
          <div className="dash-catalog-title-wrap">
            <h2 className="dash-catalog-title">课程研习中心</h2>
            <span className="dash-catalog-count">
              共呈现 <strong>{filteredCourses.length}</strong> 门专业课程
            </span>
          </div>

          {/* 实时搜索框 */}
          <div className="dash-search-box">
            <span className="dash-search-icon" aria-hidden="true">🔍</span>
            <input
              type="text"
              className="dash-search-input"
              placeholder="搜索课程、技术栈（如：Airflow, Agent, Pandas, RAG）..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="搜索全站课程"
            />
          </div>
        </div>

        {/* 学科分类 Tab 栏 */}
        <div className="dash-domain-tabs" role="tablist" aria-label="学科分类筛选">
          {DOMAIN_TABS.map((tab) => {
            const isActive = activeDomain === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                className={`dash-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => setActiveDomain(tab.id)}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Bento 课程卡片栅格 */}
        <div className="dash-courses-grid">
          {filteredCourses.map((course) => {
            const s = courseStats(course);
            const done = course.chapters.reduce(
              (acc, ch) => acc + chapterProgress(ch).done,
              0,
            );
            const ratio = s.exercises ? done / s.exercises : 0;
            const domainInfo = domainMap[course.domainId ?? 'data'];

            return (
              <article
                key={course.id}
                className="dash-course-card"
                style={{
                  ['--course-border-color' as string]: `${course.color || '#6366f1'}44`,
                  ['--course-soft-bg' as string]: `${course.color || '#6366f1'}18`,
                  ['--course-accent' as string]: course.color || '#818cf8',
                }}
              >
                <div className="dash-course-card-top">
                  <div className="dash-course-icon-badge" aria-hidden="true">
                    <CourseIcon
                      icon={course.icon}
                      courseId={course.id}
                      color={course.color}
                      size={24}
                    />
                  </div>
                  <div className="dash-course-title-wrap">
                    <h3 className="dash-course-title" title={course.title}>
                      {course.title}
                    </h3>
                    <div className="dash-course-sub">
                      {domainInfo?.title ?? '知序核心课程'} · {course.subtitle || '深度工程实战'}
                    </div>
                  </div>
                </div>

                <p className="dash-course-desc">{course.description}</p>

                <div className="dash-course-tags">
                  <span className="dash-tag">
                    📚 {course.chapters.length} 章 · {s.lessons} 节
                  </span>
                  <span className="dash-tag dash-tag-blue">
                    🧩 {s.exercises} 题真跑
                  </span>
                  <span className="dash-tag">
                    ⏱️ 约 {course.estimatedHours} 小时
                  </span>
                </div>

                <div className="dash-course-progress-row">
                  <span>掌握进度 ({done}/{s.exercises})</span>
                  <span style={{ color: course.color || '#818cf8', fontWeight: 700 }}>
                    {Math.round(ratio * 100)}%
                  </span>
                </div>

                <div className="dash-course-progress-track">
                  <div
                    className="dash-course-progress-fill"
                    style={{
                      width: `${ratio * 100}%`,
                      background: course.color || 'var(--db-primary)',
                    }}
                  />
                </div>

                <div className="dash-course-card-actions">
                  <Link
                    to={`/course/${course.id}`}
                    className="db-btn db-btn-primary"
                    aria-label={`进入 ${course.title} 研习`}
                  >
                    <span>📖 研读课程</span>
                  </Link>
                  {course.chapters[0] && (
                    <Link
                      to={`/practice/${course.id}/${course.chapters[0].id}`}
                      className="db-btn db-btn-outline"
                      aria-label={`做 ${course.title} 练习`}
                    >
                      <span>✏️ 做练习</span>
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {filteredCourses.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--db-text-muted)' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--db-text-heading)' }}>未找到匹配的课程</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>尝试清空搜索关键词或切换至「全部学科」标签</div>
            <button
              className="db-btn db-btn-outline"
              style={{ marginTop: 16 }}
              onClick={() => {
                setSearchQuery('');
                setActiveDomain('all');
              }}
            >
              清空搜索与重置筛选
            </button>
          </div>
        )}
      </section>

      {/* ─────────── 6. 底部双栏：题型矩阵分布与教学哲学 ─────────── */}
      <section className="dash-bottom-grid" aria-label="全景题型与教学支持体系">
        {/* 左栏：7 大题型全量判分分布 */}
        <div className="dash-bottom-card">
          <h2 className="dash-card-title">
            <span aria-hidden="true">🧩</span>
            <span>全站 7 大题型全真自动判分体系</span>
          </h2>
          <div className="dash-type-bars">
            {Object.entries(TYPE_META).map(([key, meta]) => {
              const n = stats.byType[key] ?? 0;
              const pct = stats.exercises ? (n / stats.exercises) * 100 : 0;
              return (
                <div key={key} className="dash-type-row">
                  <div className="dash-type-label">
                    <span aria-hidden="true">{meta.icon}</span>
                    <span>{meta.label}</span>
                  </div>
                  <div className="dash-type-track">
                    <div
                      className="dash-type-fill"
                      style={{
                        width: `${pct}%`,
                        background: meta.color || '#6366f1',
                      }}
                      role="progressbar"
                      aria-valuenow={Math.round(pct)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                  <span className="dash-type-num">{n} 题</span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 16, fontSize: 12.5, color: 'var(--db-text-muted)', lineHeight: 1.6 }}>
            全站共 <strong>{stats.exercises}</strong> 道阶梯式习题。涵盖单选、多选、判断、填空、Pyodide 浏览器真实 Python 代码沙箱、SQLite 真实 SQL 执行及生产级案例分析。
          </div>
        </div>

        {/* 右栏：知序学院 4 大硬核研习支柱 */}
        <div className="dash-bottom-card">
          <h2 className="dash-card-title">
            <span aria-hidden="true">🛡️</span>
            <span>知序学院工程级自主研习公约</span>
          </h2>
          <div className="dash-features-list">
            <div className="dash-feature-item">
              <div className="dash-feature-icon" style={{ color: '#818cf8' }} aria-hidden="true">📖</div>
              <div className="dash-feature-text">
                <strong>文字教材与严密推导优先</strong>：拒绝被动看视频消磨时间。每个知识点讲透“底层原理、为什么需要、工业陷阱与排查技巧”，自主掌控深阅读节奏。
              </div>
            </div>
            <div className="dash-feature-item">
              <div className="dash-feature-icon" style={{ color: '#34d399' }} aria-hidden="true">⚡</div>
              <div className="dash-feature-text">
                <strong>WebAssembly 全真代码沙箱</strong>：内置 Pyodide CPython 3.12 与 SQLite WASM 运行时，无需配置繁琐本地环境，浏览器端毫秒级本地真实执行。
              </div>
            </div>
            <div className="dash-feature-item">
              <div className="dash-feature-icon" style={{ color: '#38bdf8' }} aria-hidden="true">🎨</div>
              <div className="dash-feature-text">
                <strong>26+ 原生 SVG 交互动态图解</strong>：包含 ReAct 决策循环、Token 向量投影、LangGraph 状态画布等动态可操纵动画，化抽象认知为直观感知。
              </div>
            </div>
            <div className="dash-feature-item">
              <div className="dash-feature-icon" style={{ color: '#fbbf24' }} aria-hidden="true">🧠</div>
              <div className="dash-feature-text">
                <strong>艾宾浩斯自适应记忆调度</strong>：结合间隔重复算法，在 1/2/4/7/15/30 天记忆临界点自动推送复习，做错自动回退，确保知识真正内化。
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
