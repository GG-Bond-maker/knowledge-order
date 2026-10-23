/**
 * 章节难度评估与分级出题。
 *
 * 设计思路：用户希望"根据章节难度进行不同程度的巩固"。
 * 这里提供两层能力：
 *  1. 章节难度画像：由题目难度均值、题型构成、知识点数量综合计算，
 *     让学习者一眼看出这一章是"入门 / 进阶 / 挑战"，并推荐应做题量。
 *  2. 分层练习模式：把每章习题按难度分成三个档位
 *     - 基础巩固（difficulty 1~2）：打牢概念
 *     - 进阶训练（difficulty 3）：综合运用
 *     - 挑战拔高（difficulty 4~5）：深度理解与实战
 *     用户可按档位筛选，也可以走"难度递进"模式（先易后难，做完一档自动进入下一档）。
 */

import type { Chapter, Exercise } from '../types';

export type TierKey = 'basic' | 'advanced' | 'challenge';

export interface Tier {
  key: TierKey;
  label: string;
  shortLabel: string;
  desc: string;
  /** 建议完成比例（占该档题量），用于计算推荐题量 */
  ratio: number;
  color: string;
}

export const TIERS: Tier[] = [
  {
    key: 'basic',
    label: '基础巩固',
    shortLabel: '基础',
    desc: '难度 1~2：概念辨析、语法细节、易错点。全部应做对。',
    ratio: 1,
    color: '#16a34a',
  },
  {
    key: 'advanced',
    label: '进阶训练',
    shortLabel: '进阶',
    desc: '难度 3：多个知识点综合运用，贴近真实工作场景。',
    ratio: 0.8,
    color: '#d97706',
  },
  {
    key: 'challenge',
    label: '挑战拔高',
    shortLabel: '挑战',
    desc: '难度 4~5：复杂逻辑、性能优化、方案设计类题目。',
    ratio: 0.6,
    color: '#dc2626',
  },
];

export function tierOf(e: Exercise): TierKey {
  if (e.difficulty <= 2) return 'basic';
  if (e.difficulty === 3) return 'advanced';
  return 'challenge';
}

export interface ChapterDifficulty {
  /** 综合难度 1~5（一位小数） */
  score: number;
  /** 难度标签 */
  level: '入门' | '进阶' | '挑战';
  levelColor: string;
  /** 各档题目数 */
  counts: Record<TierKey, number>;
  /** 建议完成题量（按各档比例加权） */
  recommended: number;
  /** 题目总数 */
  total: number;
}

/**
 * 计算章节难度画像。
 *
 * 综合评分 = 题目难度均值（70%）+ 知识点广度加成（20%）+ 高阶题占比加成（10%）
 */
export function chapterDifficulty(chapter: Chapter): ChapterDifficulty {
  const exs = chapter.exercises;
  const total = exs.length;
  const counts: Record<TierKey, number> = { basic: 0, advanced: 0, challenge: 0 };
  exs.forEach((e) => {
    counts[tierOf(e)] += 1;
  });

  if (!total) {
    return { score: 1, level: '入门', levelColor: '#16a34a', counts, recommended: 0, total: 0 };
  }

  const meanDiff = exs.reduce((s, e) => s + e.difficulty, 0) / total;
  // 知识点广度：小节越多，覆盖越广（5 节以上视为满）
  const lessonBreadth = Math.min(1, chapter.lessons.length / 5);
  // 高阶题占比
  const highRatio = (counts.advanced * 0.6 + counts.challenge * 1) / total;

  const raw = meanDiff * 0.7 + (1.5 + lessonBreadth * 2) * 0.2 + (1 + highRatio * 3) * 0.1;
  const score = Math.max(1, Math.min(5, Math.round(raw * 10) / 10));

  const level: ChapterDifficulty['level'] = score < 2.4 ? '入门' : score < 3.3 ? '进阶' : '挑战';
  const levelColor = level === '入门' ? '#16a34a' : level === '进阶' ? '#d97706' : '#dc2626';

  const recommended = Math.min(
    total,
    Math.round(
      counts.basic * TIERS[0].ratio + counts.advanced * TIERS[1].ratio + counts.challenge * TIERS[2].ratio,
    ),
  );

  return { score, level, levelColor, counts, recommended, total };
}

/**
 * 难度递进排序：档位优先（基础 → 进阶 → 挑战），档位内按 difficulty 升序，
 * 同难度保持原始顺序（稳定）。
 */
export function orderByTier(exercises: Exercise[]): Exercise[] {
  const weight: Record<TierKey, number> = { basic: 0, advanced: 1, challenge: 2 };
  return exercises
    .map((e, i) => ({ e, i }))
    .sort((a, b) => {
      const t = weight[tierOf(a.e)] - weight[tierOf(b.e)];
      if (t !== 0) return t;
      if (a.e.difficulty !== b.e.difficulty) return a.e.difficulty - b.e.difficulty;
      return a.i - b.i;
    })
    .map((x) => x.e);
}
