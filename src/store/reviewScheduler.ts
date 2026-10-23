/**
 * 艾宾浩斯遗忘曲线 · 间隔重复调度（Spaced Repetition）
 *
 * 原理：新学的内容遗忘最快，需要在"即将遗忘"时复习。
 * 每次答对后按预设间隔推迟下次复习；答错则回退到更早的阶段。
 *
 * 间隔表基于艾宾浩斯曲线的经典取值（单位：天）：
 *   1 → 2 → 4 → 7 → 15 → 30 → 60 → 120
 * 答错时回退 2 个阶段（最少回到第 1 阶段），确保薄弱点更频繁出现。
 */

import type { ExerciseMastery } from '../types';
import { todayStr } from './studyState';

/** 复习间隔（天） */
export const REVIEW_INTERVALS = [1, 2, 4, 7, 15, 30, 60, 120];

/** 一天毫秒数 */
const DAY_MS = 24 * 60 * 60 * 1000;

/** 阶段中文描述 */
export const STAGE_LABELS = REVIEW_INTERVALS.map((d) => `${d} 天`);

export interface ReviewSchedule {
  /** 当前阶段索引（0 起），-1 表示未进入复习队列 */
  stage: number;
  /** 下次复习时间戳 */
  nextReviewAt: number;
  /** 累计复习次数 */
  reviewCount: number;
}

/**
 * 首次答对后进入复习队列：安排在 1 天后复习。
 */
export function scheduleFirst(reviewCount = 0): ReviewSchedule {
  const now = Date.now();
  return {
    stage: 0,
    nextReviewAt: now + REVIEW_INTERVALS[0] * DAY_MS,
    reviewCount,
  };
}

/**
 * 复习后更新调度。
 * @param current 当前阶段（-1 表示尚未在队列中）
 * @param correct 本次是否答对
 */
export function scheduleNext(current: number, correct: boolean, reviewCount = 0): ReviewSchedule {
  const now = Date.now();
  const base = current < 0 ? 0 : current;

  if (correct) {
    const nextStage = Math.min(base + 1, REVIEW_INTERVALS.length - 1);
    // 已到最长间隔，视为“已牢固掌握”，仍保留队列但间隔最长
    return {
      stage: nextStage,
      nextReviewAt: now + REVIEW_INTERVALS[nextStage] * DAY_MS,
      reviewCount: reviewCount + 1,
    };
  }

  // 答错：回退 2 个阶段（最少到 1 天）
  const backStage = Math.max(0, base - 2);
  return {
    stage: backStage,
    nextReviewAt: now + REVIEW_INTERVALS[backStage] * DAY_MS,
    reviewCount: reviewCount + 1,
  };
}

/** 是否已到复习时间 */
export function isDue(m: ExerciseMastery | undefined, now = Date.now()): boolean {
  if (!m) return false;
  if (m.nextReviewAt === undefined) return false;
  return m.nextReviewAt <= now;
}

/** 是否已“毕业”（到达最长间隔阶段且答对） */
export function isGraduated(m: ExerciseMastery | undefined): boolean {
  if (!m) return false;
  return (m.reviewStage ?? -1) >= REVIEW_INTERVALS.length - 1;
}

/** 计算逾期天数（用于排序） */
export function overdueDays(m: ExerciseMastery, now = Date.now()): number {
  if (m.nextReviewAt === undefined) return 0;
  return Math.max(0, Math.floor((now - m.nextReviewAt) / DAY_MS));
}

/**
 * 从 mastery 中筛出今天需要复习的题目 id，按“逾期最久优先”排序。
 */
export function dueExerciseIds(mastery: Record<string, ExerciseMastery>, now = Date.now()): string[] {
  return Object.values(mastery)
    .filter((m) => isDue(m, now))
    .sort((a, b) => (a.nextReviewAt ?? 0) - (b.nextReviewAt ?? 0))
    .map((m) => m.exerciseId);
}

/**
 * 未来 7 天的复习负荷预测（每天应复习的题数）。
 */
export function upcomingLoad(mastery: Record<string, ExerciseMastery>, days = 7): { date: string; count: number }[] {
  const out: { date: string; count: number }[] = [];
  const now = Date.now();
  for (let i = 0; i < days; i += 1) {
    const dayStart = now + i * DAY_MS;
    const dayEnd = dayStart + DAY_MS;
    const d = new Date(now + i * DAY_MS);
    const count = Object.values(mastery).filter((m) => {
      const t = m.nextReviewAt;
      if (t === undefined) return false;
      return i === 0 ? t < dayEnd : t >= dayStart && t < dayEnd;
    }).length;
    out.push({ date: i === 0 ? '今天' : i === 1 ? '明天' : `${d.getMonth() + 1}/${d.getDate()}`, count });
  }
  return out;
}

/** 今日复习完成率所需的数据 */
export function todayReviewStats(mastery: Record<string, ExerciseMastery>) {
  const now = Date.now();
  const todayKey = todayStr();
  const due = Object.values(mastery).filter((m) => isDue(m, now)).length;
  const reviewedToday = Object.values(mastery).filter((m) => {
    if (!m.lastAttemptAt) return false;
    if (todayStr(new Date(m.lastAttemptAt)) !== todayKey) return false;
    return (m.reviewCount ?? 0) > 0;
  }).length;
  return { due, reviewedToday };
}
