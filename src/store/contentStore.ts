/**
 * 内容加载层：优先从后端 API 拉取（支持后台录入），
 * 拉取失败时回退到内置的 TypeScript 内容，保证离线也能用。
 *
 * 使用方式：应用启动时调用 loadContent()，之后所有页面通过
 * useContent() 或同步的 COURSES/COURSE_MAP 访问。
 */

import { useSyncExternalStore } from 'react';
import type { Course, CourseId, Chapter, Exercise, Lesson, Domain } from '../types';
import { COURSES as BUILTIN_COURSES } from '../content';

export interface ContentState {
  status: 'loading' | 'ready' | 'fallback';
  domains: Domain[];
  courses: Course[];
  error?: string;
  /** 内容来源说明，用于界面提示 */
  source: 'api' | 'builtin';
}

const DEFAULT_DOMAINS: Domain[] = [
  { id: 'data', title: '数据分析', description: 'Python、Pandas、SQL、Excel、可视化与方法论', icon: '📊', color: '#2f6bff', order: 1 },
  {
    id: 'python-track',
    title: 'Python',
    description: '从零基础入门、核心数据结构与现代数据清洗，到工程实践、大模型应用与自主 Agent 开发',
    icon: '🐍',
    color: '#0ea5e9',
    order: 2,
  },
  {
    id: 'data-engineering',
    title: '数据工程与分析工程',
    description: 'dbt 现代数仓转换、Apache Airflow 调度编排、维度建模与生产数据管道',
    icon: '🛠️',
    color: '#0284c7',
    order: 3,
  },
  {
    id: 'ml',
    title: '机器学习',
    description: '从数理基础、数据工程到经典算法、深度学习与现代大语言模型的高质量自包含课程体系',
    icon: '🧠',
    color: '#4f46e5',
    order: 4,
  },
  {
    id: 'paper',
    title: '人工智能基础-论文导读',
    description: '30 篇奠定现代 AI 的经典论文，配可运行代码与交互图示',
    icon: '📚',
    color: '#6366f1',
    order: 5,
  },
  {
    id: 'mining',
    title: '数据挖掘',
    description: '频繁模式、聚类降维、推荐系统、图挖掘与异常检测',
    icon: '⛏️',
    color: '#f59e0b',
    order: 6,
  },
  {
    id: 'ai-auto',
    title: 'AI 自动化',
    description: '用 LLM 与 Agent 自动化业务流程、软件开发与文档处理',
    icon: '⚡',
    color: '#f97316',
    order: 7,
  },
  { id: 'coding', title: '编程开发', description: '算法与数据结构、工程实践', icon: '💻', color: '#7c5cff', order: 8 },
  { id: 'ai', title: '人工智能', description: 'LLM、Transformer 与 AI Agent', icon: '🤖', color: '#0891b2', order: 9 },
  {
    id: 'quant',
    title: '量化交易',
    description: '财务报表、市场机制、金融数理、策略研究、风险管理与实盘系统',
    icon: '📈',
    color: '#10b981',
    order: 10,
  },
  {
    id: 'ai-native',
    title: 'AI 原生软件工程',
    description: 'Stanford CS146S：编程智能体、MCP、规范驱动开发与 AI 代码验证流水线',
    icon: '🧑‍💻',
    color: '#8C1515',
    order: 11,
  },
];

let state: ContentState = {
  status: 'loading',
  domains: DEFAULT_DOMAINS,
  courses: [],
  source: 'builtin',
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function getSnapshot(): ContentState {
  return state;
}

export function useContent(): ContentState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** 同步读取（用于非 React 的工具函数） */
export function getContent(): ContentState {
  return state;
}

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

/** 从后端加载内容；失败则回退内置 */
export async function loadContent(force = false): Promise<ContentState> {
  if (!force && state.status === 'ready') return state;
  try {
    const [domainsRes, listRes] = await Promise.all([
      fetch(`${API_BASE}/domains`),
      fetch(`${API_BASE}/courses`),
    ]);
    if (!domainsRes.ok || !listRes.ok) throw new Error(`API ${domainsRes.status}/${listRes.status}`);
    const domains = (await domainsRes.json()) as Domain[];
    const list = (await listRes.json()) as { id: string; broken?: boolean }[];
    const ids = list.filter((c) => !c.broken).map((c) => c.id);
    // 并行拉取每门课程的完整内容
    const courses = (
      await Promise.all(
        ids.map(async (id) => {
          const r = await fetch(`${API_BASE}/courses/${id}`);
          if (!r.ok) return null;
          return (await r.json()) as Course;
        }),
      )
    ).filter(Boolean) as Course[];

    if (!courses.length) throw new Error('后端没有可用课程');

    state = {
      status: 'ready',
      domains: domains.length ? domains.sort((a, b) => a.order - b.order) : DEFAULT_DOMAINS,
      courses: courses.sort((a, b) => {
        const da = state.domains.findIndex((d) => d.id === (a.domainId ?? 'data'));
        const db = state.domains.findIndex((d) => d.id === (b.domainId ?? 'data'));
        return da - db;
      }),
      source: 'api',
    };
    emit();
    return state;
  } catch (e) {
    console.warn('[content] 后端未就绪，使用内置内容：', e instanceof Error ? e.message : e);
    state = {
      status: 'fallback',
      domains: DEFAULT_DOMAINS,
      courses: BUILTIN_COURSES,
      error: e instanceof Error ? e.message : String(e),
      source: 'builtin',
    };
    emit();
    return state;
  }
}

/** 重新加载（后台保存内容后调用） */
export function reloadContent(): Promise<ContentState> {
  return loadContent(true);
}

/* ─────────────────── 同步查询工具 ─────────────────── */

export function getCourses(): Course[] {
  return state.courses;
}

export function findCourseSync(id: string | undefined): Course | undefined {
  return id ? state.courses.find((c) => c.id === id) : undefined;
}

export function findChapterSync(courseId: string, chapterId: string): Chapter | undefined {
  return findCourseSync(courseId)?.chapters.find((c) => c.id === chapterId);
}

export function findLessonSync(lessonId: string):
  | { course: Course; chapter: Chapter; lesson: Lesson }
  | undefined {
  for (const course of state.courses) {
    for (const chapter of course.chapters) {
      const lesson = chapter.lessons.find((l) => l.id === lessonId);
      if (lesson) return { course, chapter, lesson };
    }
  }
  return undefined;
}

export function findExerciseSync(exerciseId: string):
  | { course: Course; chapter: Chapter; exercise: Exercise }
  | undefined {
  for (const course of state.courses) {
    for (const chapter of course.chapters) {
      const exercise = chapter.exercises.find((e) => e.id === exerciseId);
      if (exercise) return { course, chapter, exercise };
    }
  }
  return undefined;
}

export function courseStatsSync(course: Course) {
  const byType: Record<string, number> = {};
  let lessons = 0;
  let exercises = 0;
  for (const ch of course.chapters) {
    lessons += ch.lessons.length;
    exercises += ch.exercises.length;
    for (const ex of ch.exercises) byType[ex.type] = (byType[ex.type] ?? 0) + 1;
  }
  return { lessons, exercises, byType };
}

/* ─────────────────── 后台写入 API ─────────────────── */

async function jsonFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.details?.length ? data.details.join('；') : data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export async function apiListCourses() {
  return jsonFetch(`${API_BASE}/courses`);
}

export async function apiGetCourse(id: string): Promise<Course> {
  return jsonFetch(`${API_BASE}/courses/${id}`);
}

export async function apiSaveCourse(course: Course): Promise<Course> {
  const data = await jsonFetch(`${API_BASE}/courses/${course.id}`, {
    method: 'PUT',
    body: JSON.stringify(course),
  });
  await reloadContent();
  return data.course as Course;
}

export async function apiCreateCourse(course: Course): Promise<Course> {
  const data = await jsonFetch(`${API_BASE}/courses`, {
    method: 'POST',
    body: JSON.stringify(course),
  });
  await reloadContent();
  return data.course as Course;
}

export async function apiDeleteCourse(id: string): Promise<void> {
  await jsonFetch(`${API_BASE}/courses/${id}`, { method: 'DELETE' });
  await reloadContent();
}

export async function apiSaveDomains(domains: Domain[]): Promise<void> {
  await jsonFetch(`${API_BASE}/domains`, { method: 'PUT', body: JSON.stringify(domains) });
  await reloadContent();
}

export async function apiExportContent() {
  return jsonFetch(`${API_BASE}/export`);
}

export async function apiImportContent(payload: unknown) {
  const data = await jsonFetch(`${API_BASE}/import`, { method: 'POST', body: JSON.stringify(payload) });
  await reloadContent();
  return data;
}

export type { CourseId };
