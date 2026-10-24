/**
 * 全局布局：左侧课程导航 + 顶部状态栏。
 */

import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { getCourses, siteStats } from '../content';
import { useContent } from '../store/contentStore';
import { dueExerciseIds } from '../store/reviewScheduler';
import { chapterProgress, useStudyState } from '../store/studyState';
import { PyodideStatus } from './PyodideStatus';
import { DomainNavGroup } from './DomainNavGroup';

export function AppLayout() {
  const state = useStudyState();
  const location = useLocation();
  const navigate = useNavigate();
  const { courses, status, domains } = useContent();
  const courseList = useMemo(() => getCourses(), [courses, status]);

  /** 各学科内部的课程展示顺序 */
  const DOMAIN_COURSE_ORDER: Record<string, string[]> = {
    data: ['python', 'pandas', 'sql', 'excel', 'viz', 'methodology', 'stats-foundations', 'causal-inference'],
    'python-track': [
      'python-foundations-data',
      'python-engineering-practices',
      'python-llm-applications',
      'python-agent-development',
    ],
    'data-engineering': ['dbt-analytics-engineering', 'airflow-data-engineering'],
    mining: ['mining-prep', 'mining-freq', 'mining-cluster', 'mining-recsys', 'mining-graph'],
    'ai-auto': ['ai-auto-m1', 'ai-auto-m2', 'ai-auto-m3', 'ai-auto-m4', 'ai-auto-m5'],
    coding: ['algo'],
    quant: [
      'financial-statements',
      'quant-market',
      'quant-math',
      'quant-python',
      'quant-data',
      'quant-strategy',
      'quant-backtest',
      'quant-portfolio',
      'quant-ml',
      'quant-live',
      'quant-project',
    ],
  };

  /**
   * 通用学科分组：任何有课程的学科都渲染成一个可折叠的一级菜单。
   *
   * 注意：只有「人工智能」学科下的 series 课程会走单独的大模型导航，
   * 其他学科（如数据挖掘）即使课程带 seriesId，也归入该学科分组，
   * 并由 useSeriesSubgroups 在分组内部按系列再分层。
   */
  const domainGroups = useMemo(() => {
    const list = domains
      .map((d) => {
        const courses = courseList
          .filter((c) => {
            if ((c.domainId ?? 'data') !== d.id) return false;
            // 大模型系列由独立导航渲染，避免重复
            if (d.id === 'ai' && c.seriesId) return false;
            return true;
          })
          .slice()
          .sort((a, b) => {
            const order = DOMAIN_COURSE_ORDER[d.id] ?? [];
            const ia = order.indexOf(a.id);
            const ib = order.indexOf(b.id);
            return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
          });
        return { domain: d, courses };
      })
      .filter((g) => g.courses.length > 0)
      .sort((a, b) => a.domain.order - b.domain.order);
    return list;
  }, [domains, courseList]);

  /** 大模型系列：ai 学科下带 seriesId 的课程 */
  const llmCourses = useMemo(
    () => courseList.filter((c) => c.seriesId && (c.domainId ?? 'data') === 'ai'),
    [courseList],
  );

  // 大模型组是否应展开：只在本组课程页 或 「大模型学习地图」时展开
  // 注意：不能简单用 includes('/learning-map')，否则其他学科的路线图也会展开本组
  const isLlmActive =
    llmCourses.some(
      (c) => location.pathname.includes(`/course/${c.id}`) || location.pathname.includes(`/practice/${c.id}`),
    ) ||
    location.pathname === '/learning-map' ||
    location.pathname === '/learning-map/ai';
  const dueCount = useMemo(() => dueExerciseIds(state.mastery).length, [state.mastery]);
  const stats = useMemo(() => siteStats(), [courses, status]);

  const solvedCount = useMemo(
    () => Object.values(state.mastery).filter((m) => m.lastCorrect).length,
    [state.mastery],
  );
  const bookmarks = useMemo(
    () => Object.values(state.mastery).filter((m) => m.bookmarked).length,
    [state.mastery],
  );
  const wrongCount = useMemo(
    () => Object.values(state.mastery).filter((m) => m.everWrong && !m.lastCorrect).length,
    [state.mastery],
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/" className="sidebar-brand" style={{ textDecoration: 'none' }}>
          <div className="logo">ZX</div>
          <div>
            <div className="name">知序学院</div>
            <div className="sub">KNOWLEDGE ORDER</div>
          </div>
        </Link>

        <nav className="sidebar-nav">
          <div className="sidebar-section-title">学习</div>
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-item nav-dashboard ${isActive ? 'active' : ''}`}
          >
            <span className="emoji">🖥️</span>
            <span>首页大屏</span>
            <span className="nav-tag-live">LIVE</span>
          </NavLink>
          <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="emoji">🏠</span>
            <span>课程主页</span>
          </NavLink>
          {/* 各学科：一级导航，下挂该学科的全部课程（通用渲染，新增学科无需改代码） */}
          {domainGroups.map(({ domain, courses: groupCourses }) => {
            // 本组是否处于活跃状态：课程页 / 练习页 / 该学科的学习地图
            const active =
              groupCourses.some(
                (c) =>
                  location.pathname.includes(`/course/${c.id}`) || location.pathname.includes(`/practice/${c.id}`),
              ) ||
              // 该学科有学习地图时，访问对应路线图也视为活跃（展开该组）
              location.pathname === `/learning-map/${domain.id}`;
            // 单门课程的学科直接平铺（如算法），避免多一层点击；
            // 但「论文导读」即使只有 1 门课也走分组，以显示学科名
            if (groupCourses.length === 1 && domain.id !== 'paper' && domain.id !== 'data-engineering') {
              const c = groupCourses[0];
              const total = c.chapters.reduce((s, ch) => s + ch.exercises.length, 0);
              const done = c.chapters.reduce((s, ch) => s + chapterProgress(ch).done, 0);
              return (
                <NavLink key={c.id} to={`/course/${c.id}`} className={`nav-item ${active ? 'active' : ''}`}>
                  <span className="emoji">{c.icon}</span>
                  <span>{c.title}</span>
                  <span className="progress-mini">
                    {done}/{total}
                  </span>
                </NavLink>
              );
            }
            return (
              <DomainNavGroup
                key={domain.id}
                title={domain.title}
                icon={domain.icon}
                courses={groupCourses}
                pathname={location.pathname}
                defaultOpen={active}
                // 数据挖掘走得也是「系列 + 学习地图」的结构
                useSeriesSubgroups={domain.id === 'mining' || domain.id === 'ai-auto' || domain.id === 'quant' || domain.id === 'paper' || domain.id === 'ai-native'}
                extraLink={
                  domain.id === 'mining'
                    ? { to: '/learning-map/mining', label: '学习地图', tag: '路线', color: '#f59e0b' }
                    : domain.id === 'ai-auto'
                      ? { to: '/learning-map/ai-auto', label: '学习地图', tag: '路线', color: '#f97316' }
                      : domain.id === 'quant'
                        ? { to: '/learning-map/quant', label: '学习地图', tag: '路线', color: '#10b981' }
                        : domain.id === 'paper'
                          ? { to: '/learning-map/paper', label: '学习地图', tag: '路线', color: '#6366f1' }
                          : domain.id === 'ai-native'
                            ? { to: '/learning-map/ai-native', label: '学习地图', tag: '路线', color: '#8C1515' }
                            : undefined
                }
              />
            );
          })}

          {/* 大模型：一级导航，下挂 9 门子课程（按地基/进阶/应用分组） */}
          <DomainNavGroup
            title="人工智能 · 大模型"
            icon="🤖"
            courses={llmCourses}
            pathname={location.pathname}
            defaultOpen={isLlmActive}
            useSeriesSubgroups
            extraLink={{ to: '/learning-map', label: '学习地图', tag: '路线', color: '#7c5cff' }}
          />

          <div className="sidebar-section-title">复盘与计划</div>
          <NavLink to="/spaced-review" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="emoji">⏰</span>
            <span>今日复习</span>
            {dueCount > 0 && <span className="nav-badge-due">{dueCount}</span>}
          </NavLink>
          <NavLink to="/review" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="emoji">🔁</span>
            <span>错题本与收藏</span>
            <span className="progress-mini">{wrongCount + bookmarks}</span>
          </NavLink>
          <NavLink to="/plan" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="emoji">📅</span>
            <span>学习计划与笔记</span>
            <span className="progress-mini">{Object.keys(state.notes).length}</span>
          </NavLink>
          <NavLink to="/stats" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="emoji">📊</span>
            <span>学习统计</span>
          </NavLink>

          <div className="sidebar-section-title">管理</div>
          <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="emoji">✏️</span>
            <span>内容管理</span>
            <span className="progress-mini">{courseList.length} 门</span>
          </NavLink>

          <div className="sidebar-section-title">概览</div>
          <div className="sidebar-summary">
            <div>
              <strong>{solvedCount}</strong> / {stats.exercises} 题已掌握
            </div>
            <div>
              连续打卡 <strong>{state.streakDays}</strong> 天 · 最长 {state.longestStreak} 天
            </div>
            <div>
              课程 {courseList.length} 门 · 章节 {stats.chapters} 个 · 知识点 {stats.lessons} 节
            </div>
          </div>
        </nav>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-title">个人学习平台 · Learning Academy</div>
          <div className="topbar-right">
            <span className="badge badge-blue">🔥 连续 {state.streakDays} 天</span>
            <PyodideStatus />
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/spaced-review')}>
              ⏰ 复习{dueCount > 0 ? ` (${dueCount})` : ''}
            </button>
            <button className="btn btn-sm btn-dashboard" onClick={() => navigate('/dashboard')} title="打开学习数据大屏">
              🖥️ 首页大屏
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/stats')}>
              📈 统计
            </button>
          </div>
        </header>
        <main className={`content ${location.pathname === '/dashboard' ? 'content-wide' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
