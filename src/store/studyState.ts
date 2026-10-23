/**
 * 学习状态存储：localStorage 持久化 + 订阅式更新。
 *
 * 设计：单一 AppState 对象、版本号迁移、按天聚合统计，
 * 所有写入都经过这里，组件通过 useStudyState() 订阅。
 */

import { useCallback, useState, useSyncExternalStore } from 'react';
import type { AppState, CourseId, DailyStat, Exercise, LessonProgress, Note, StudyPlan } from '../types';
import { scheduleFirst, scheduleNext } from './reviewScheduler';

const STATE_VERSION = 2;

export function todayStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 默认学习计划 */
export function defaultPlan(): StudyPlan {
  return {
    dailyGoal: 20,
    activeWeekdays: [1, 2, 3, 4, 5, 6, 0],
    reminderEnabled: false,
    startDate: todayStr(),
  };
}

function emptyState(): AppState {
  return {
    version: STATE_VERSION,
    mastery: {},
    daily: {},
    lessons: {},
    notes: {},
    plan: defaultPlan(),
    streakDays: 0,
    longestStreak: 0,
  };
}

/** 当前存储键（知序学院） */
const STORAGE_KEY = 'knowledge-order:state:v2';

/** 历史存储键（改名前的「数析学院」），用于一次性迁移 */
const LEGACY_KEYS = {
  v2: 'data-academy:state:v2',
  v1: 'data-academy:state:v1',
} as const;

function loadState(): AppState {
  try {
    // 1) 优先读新键
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed && parsed.version === STATE_VERSION) {
        return { ...emptyState(), ...parsed, notes: parsed.notes ?? {}, plan: { ...defaultPlan(), ...(parsed.plan ?? {}) } };
      }
    }

    // 2) 从旧 v2 键迁移（仅改名，结构不变）
    const legacyV2 = localStorage.getItem(LEGACY_KEYS.v2);
    if (legacyV2) {
      const old = JSON.parse(legacyV2) as AppState;
      if (old && old.version === STATE_VERSION) {
        const migrated = { ...emptyState(), ...old, notes: old.notes ?? {}, plan: { ...defaultPlan(), ...(old.plan ?? {}) } };
        // 写入新键并清理旧键，避免下次重复迁移
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        localStorage.removeItem(LEGACY_KEYS.v2);
        return migrated;
      }
    }

    // 3) 从旧 v1 键迁移（结构较老，需要补 notes / plan 字段）
    const legacyV1 = localStorage.getItem(LEGACY_KEYS.v1);
    if (legacyV1) {
      const old = JSON.parse(legacyV1) as Partial<AppState>;
      const migrated: AppState = {
        ...emptyState(),
        mastery: old.mastery ?? {},
        daily: old.daily ?? {},
        lessons: old.lessons ?? {},
        streakDays: old.streakDays ?? 0,
        longestStreak: old.longestStreak ?? 0,
        lastActiveDate: old.lastActiveDate,
        favoriteCourse: old.favoriteCourse,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      localStorage.removeItem(LEGACY_KEYS.v1);
      return migrated;
    }

    return emptyState();
  } catch {
    return emptyState();
  }
}

let state: AppState = loadState();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 存储已满或被禁用：静默降级为内存态
  }
}

function commit(next: AppState) {
  state = next;
  persist();
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getState(): AppState {
  return state;
}

export function useStudyState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}

/** 连续打卡：与 lastActiveDate 相差 1 天则 +1，同日不变，其他重置为 1 */
function touchStreak(s: AppState, date: string): AppState {
  if (s.lastActiveDate === date) return s;
  let streak = 1;
  if (s.lastActiveDate) {
    const d1 = new Date(`${s.lastActiveDate}T00:00:00`);
    const d2 = new Date(`${date}T00:00:00`);
    const diff = Math.round((d2.getTime() - d1.getTime()) / 86400000);
    if (diff === 1) streak = s.streakDays + 1;
  }
  return {
    ...s,
    lastActiveDate: date,
    streakDays: streak,
    longestStreak: Math.max(s.longestStreak, streak),
  };
}

export interface SubmitArgs {
  exercise: Exercise;
  courseId: CourseId;
  chapterId: string;
  correct: boolean;
  score: number;
  durationMs: number;
  answer: unknown;
}

/** 记录一次作答（会同时更新连续打卡、当日统计与复习调度） */
export function recordAttempt(args: SubmitArgs): void {
  const { exercise, correct, durationMs, answer, courseId, chapterId } = args;
  const now = Date.now();
  const date = todayStr();
  const prev = state.mastery[exercise.id];

  // 复习调度：先判断本次是否为“到期复习”
  const wasDue = prev?.nextReviewAt !== undefined && prev.nextReviewAt <= now;
  const schedule =
    prev?.nextReviewAt === undefined
      ? // 首次进入队列：只有答对才排复习
        correct
        ? scheduleFirst(prev?.reviewCount ?? 0)
        : { stage: -1, nextReviewAt: undefined as number | undefined, reviewCount: prev?.reviewCount ?? 0 }
      : scheduleNext(prev.reviewStage ?? -1, correct, prev.reviewCount ?? 0);

  const mastery = {
    exerciseId: exercise.id,
    courseId,
    chapterId,
    attemptCount: (prev?.attemptCount ?? 0) + 1,
    correctCount: (prev?.correctCount ?? 0) + (correct ? 1 : 0),
    consecutiveCorrect: correct ? (prev?.consecutiveCorrect ?? 0) + 1 : 0,
    lastCorrect: correct,
    lastAttemptAt: now,
    everWrong: (prev?.everWrong ?? false) || !correct,
    bookmarked: prev?.bookmarked ?? false,
    reviewStage: schedule.stage,
    nextReviewAt: schedule.nextReviewAt,
    reviewCount: schedule.reviewCount,
  };

  const daily: DailyStat = state.daily[date] ?? { date, attempts: 0, correct: 0, solved: 0, minutes: 0, reviews: 0 };
  const sameDay = prev ? new Date(prev.lastAttemptAt).toDateString() === new Date(now).toDateString() : false;
  const nextDaily: DailyStat = {
    ...daily,
    attempts: daily.attempts + 1,
    correct: daily.correct + (correct ? 1 : 0),
    solved: daily.solved + (sameDay ? 0 : 1),
    minutes: Math.round((daily.minutes + Math.min(durationMs, 10 * 60_000) / 60_000) * 10) / 10,
    reviews: (daily.reviews ?? 0) + (wasDue ? 1 : 0),
  };

  commit(
    touchStreak(
      {
        ...state,
        mastery: { ...state.mastery, [exercise.id]: mastery },
        daily: { ...state.daily, [date]: nextDaily },
      },
      date,
    ),
  );
}

export function toggleBookmark(exerciseId: string, courseId: CourseId, chapterId: string): void {
  const prev = state.mastery[exerciseId];
  const mastery = prev
    ? { ...prev, bookmarked: !prev.bookmarked }
    : {
        exerciseId,
        courseId,
        chapterId,
        attemptCount: 0,
        correctCount: 0,
        consecutiveCorrect: 0,
        lastCorrect: false,
        lastAttemptAt: 0,
        everWrong: false,
        bookmarked: true,
      };
  commit({ ...state, mastery: { ...state.mastery, [exerciseId]: mastery } });
}

export function markLessonRead(lesson: LessonProgress): void {
  const prev = state.lessons[lesson.lessonId];
  if (prev?.read) return;
  commit({
    ...state,
    lessons: { ...state.lessons, [lesson.lessonId]: { ...lesson, read: true, readAt: Date.now() } },
  });
}

/** 批量将某章的所有小节标记为已读 */
export function markChapterLessonsRead(courseId: CourseId, chapterId: string, lessonIds: string[]): void {
  const now = Date.now();
  const nextLessons = { ...state.lessons };
  let changed = false;
  for (const lid of lessonIds) {
    if (!nextLessons[lid]?.read) {
      nextLessons[lid] = { lessonId: lid, courseId, chapterId, read: true, readAt: now };
      changed = true;
    }
  }
  if (changed) {
    commit({ ...state, lessons: nextLessons });
  }
}

export function resetProgress(): void {
  commit({ ...emptyState(), plan: state.plan });
}

export function exportState(): string {
  return JSON.stringify(state, null, 2);
}

export function importState(json: string): void {
  const parsed = JSON.parse(json) as AppState;
  if (!parsed || typeof parsed !== 'object' || !parsed.mastery) throw new Error('文件格式不正确');
  commit({
    ...emptyState(),
    ...parsed,
    notes: parsed.notes ?? {},
    plan: { ...defaultPlan(), ...(parsed.plan ?? {}) },
    version: STATE_VERSION,
  });
}

/* ─────────────────── 笔记 ─────────────────── */

export interface UpsertNoteArgs {
  targetType: Note['targetType'];
  targetId: string;
  courseId: CourseId;
  chapterId: string;
  targetTitle: string;
  content: string;
  color?: string;
}

/** 新建或更新笔记（同一 targetId 只保留一条） */
export function upsertNote(args: UpsertNoteArgs): string {
  const now = Date.now();
  const existing = Object.values(state.notes).find(
    (n) => n.targetId === args.targetId && n.targetType === args.targetType,
  );
  const id = existing?.id ?? `note_${now}_${Math.random().toString(36).slice(2, 7)}`;
  const note: Note = {
    id,
    ...args,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  commit({ ...state, notes: { ...state.notes, [id]: note } });
  return id;
}

export function deleteNote(noteId: string): void {
  const next = { ...state.notes };
  delete next[noteId];
  commit({ ...state, notes: next });
}

export function getNoteFor(targetType: Note['targetType'], targetId: string): Note | undefined {
  return Object.values(state.notes).find((n) => n.targetType === targetType && n.targetId === targetId);
}

/* ─────────────────── 学习计划 ─────────────────── */

export function updatePlan(patch: Partial<StudyPlan>): void {
  commit({ ...state, plan: { ...state.plan, ...patch } });
}

/* ─────────────────── 派生指标（读取当前快照） ─────────────────── */

/** 单题掌握度：连续答对 ≥2 次视为"已掌握" */
export function isMastered(exerciseId: string): boolean {
  const m = state.mastery[exerciseId];
  return Boolean(m && m.consecutiveCorrect >= 2);
}

/** 单题是否已答对（章节进度的判定标准） */
export function isSolved(exerciseId: string): boolean {
  return Boolean(state.mastery[exerciseId]?.lastCorrect);
}

export function chapterProgress(chapter: { exercises: { id: string }[] }): { done: number; total: number; ratio: number } {
  const total = chapter.exercises.length;
  const done = chapter.exercises.filter((e) => isSolved(e.id)).length;
  return { done, total, ratio: total ? done / total : 0 };
}

/** 近 N 天的学习统计（含空白日，便于画折线） */
export function recentDays(n: number): DailyStat[] {
  const out: DailyStat[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = todayStr(d);
    out.push(state.daily[key] ?? { date: key, attempts: 0, correct: 0, solved: 0, minutes: 0 });
  }
  return out;
}

export function overallAccuracy(s: AppState = state): number {
  let a = 0;
  let c = 0;
  Object.values(s.daily).forEach((d) => {
    a += d.attempts;
    c += d.correct;
  });
  return a ? c / a : 0;
}

export function totalAttempts(s: AppState = state): number {
  return Object.values(s.daily).reduce((x, d) => x + d.attempts, 0);
}

/** 草稿保存（代码编辑器内容、填空草稿），与主状态分离 */
export function useLocalDraft<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (v: T) => {
      setValue(v);
      try {
        localStorage.setItem(key, JSON.stringify(v));
      } catch {
        /* ignore */
      }
    },
    [key],
  );
  return [value, set];
}
