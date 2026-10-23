import { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { findSeries } from '../content/series';
import { chapterProgress } from '../store/studyState';
import type { Course } from '../types';
import './llm-nav.css';

export interface DomainNavGroupProps {
  /** 分组标题，如「数据分析」「大模型」 */
  title: string;
  /** 分组图标 emoji */
  icon: string;
  /** 该分组下的课程 */
  courses: Course[];
  /** 当前路由 */
  pathname: string;
  /** 默认展开 */
  defaultOpen?: boolean;
  /**
   * 是否按 series 分组展示（用于「大模型」这种有子系列的情况）。
   * 为 false 时按课程顺序平铺。
   */
  useSeriesSubgroups?: boolean;
  /** 可选的额外顶部链接（如「学习地图」） */
  extraLink?: { to: string; label: string; tag?: string; color?: string };
  /** 匹配该分组内课程的路由前缀，用于判断整组高亮 */
  activeMatch?: (pathname: string, course: Course) => boolean;
}

/**
 * 学科分组导航：一个可展开的一级菜单，下挂若干课程。
 *
 * - 「数据分析」：6 门课程平铺（无子系列）
 * - 「大模型」：7 门课程按 地基 / 进阶 / 应用 三组展示
 */
export function DomainNavGroup({
  title,
  icon,
  courses,
  pathname,
  defaultOpen = false,
  useSeriesSubgroups = false,
  extraLink,
  activeMatch,
}: DomainNavGroupProps) {
  const [open, setOpen] = useState(defaultOpen);

  const totalDone = courses.reduce(
    (acc, c) => acc + c.chapters.reduce((s, ch) => s + chapterProgress(ch).done, 0),
    0,
  );
  const totalAll = courses.reduce(
    (acc, c) => acc + c.chapters.reduce((s, ch) => s + ch.exercises.length, 0),
    0,
  );

  const isCourseActive = (c: Course) =>
    activeMatch
      ? activeMatch(pathname, c)
      : pathname.includes(`/course/${c.id}`) || pathname.includes(`/practice/${c.id}`);

  const anyActive = courses.some(isCourseActive) || Boolean(extraLink && pathname.includes(extraLink.to));

  /** 按子系列分组（仅 useSeriesSubgroups 时使用） */
  const groups = useMemo(() => {
    if (!useSeriesSubgroups) return null;
    const KNOWN_ORDER = ['地基', '基础', '进阶', '应用'];
    const map = new Map<string, { course: Course; series: NonNullable<ReturnType<typeof findSeries>> }[]>();
    for (const c of courses) {
      const series = findSeries(c.seriesId);
      if (!series) continue;
      if (!map.has(series.group)) map.set(series.group, []);
      map.get(series.group)!.push({ course: c, series });
    }
    for (const list of map.values()) list.sort((a, b) => a.series.order - b.series.order);
    // 已知分组按语义顺序在前，未知分组按出现顺序追加
    const known = KNOWN_ORDER.filter((g) => map.has(g));
    const rest = [...map.keys()].filter((g) => !KNOWN_ORDER.includes(g));
    return [...known, ...rest].map((g) => ({ group: g, items: map.get(g)! }));
  }, [courses, useSeriesSubgroups]);

  const renderCourse = (c: Course, color?: string) => {
    const done = c.chapters.reduce((s, ch) => s + chapterProgress(ch).done, 0);
    const all = c.chapters.reduce((s, ch) => s + ch.exercises.length, 0);
    return (
      <NavLink
        key={c.id}
        to={`/course/${c.id}`}
        className={`nav-sub-item ${isCourseActive(c) ? 'active' : ''}`}
      >
        <span className="nav-sub-dot" style={{ background: color ?? c.color }} />
        <span className="nav-sub-label">{c.title}</span>
        <span className="progress-mini">{done}/{all || '—'}</span>
      </NavLink>
    );
  };

  return (
    <div className={`nav-group ${open ? 'open' : ''}`}>
      <button
        type="button"
        className={`nav-item nav-group-head ${anyActive ? 'active' : ''}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="emoji">{icon}</span>
        <span className="nav-group-title">{title}</span>
        <span className="progress-mini">
          {totalDone}/{totalAll}
        </span>
        <span className={`nav-caret ${open ? 'open' : ''}`}>▸</span>
      </button>

      {open && (
        <div className="nav-group-body">
          {extraLink && (
            <NavLink
              to={extraLink.to}
              className={({ isActive }) => `nav-sub-item nav-sub-map ${isActive ? 'active' : ''}`}
            >
              <span className="nav-sub-dot" style={{ background: extraLink.color ?? '#7c5cff' }} />
              <span>{extraLink.label}</span>
              {extraLink.tag && <span className="nav-sub-tag">{extraLink.tag}</span>}
            </NavLink>
          )}

          {groups
            ? groups.map(({ group, items }) => (
                <div key={group} className="nav-sub-group">
                  <div className="nav-sub-group-title">{group}</div>
                  {items.map(({ course, series }) => renderCourse(course, series.color))}
                </div>
              ))
            : courses.map((c) => renderCourse(c))}
        </div>
      )}
    </div>
  );
}
