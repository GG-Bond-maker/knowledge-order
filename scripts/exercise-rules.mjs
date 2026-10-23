/**
 * 题量-难度映射规则（内容创作规范）
 *
 * 每个知识点的题量由其难度决定：
 *   难度 1 → 6 题
 *   难度 2 → 8 题
 *   难度 3 → 10 题
 *   难度 4 → 13 题
 *   难度 5 → 16 题
 *
 * 题内难度分布呈金字塔：基础多、挑战少。
 * 例如难度 3 的 10 题：4 道难度2 + 4 道难度3 + 2 道难度4。
 *
 * 说明：本规则只用于新内容（数据挖掘系列），
 * 已有 16 门课程保持原状。
 */

/** 知识点难度 → 目标题量 */
export const EXERCISES_BY_DIFFICULTY = {
  1: 6,
  2: 8,
  3: 10,
  4: 13,
  5: 16,
};

/**
 * 知识点难度 → 题内难度分布（金字塔）
 * 键为题目难度，值为该难度题目的数量。
 */
export const QUESTION_MIX_BY_DIFFICULTY = {
  1: { 1: 3, 2: 3 }, // 6 题
  2: { 1: 2, 2: 4, 3: 2 }, // 8 题
  3: { 2: 4, 3: 4, 4: 2 }, // 10 题
  4: { 2: 3, 3: 5, 4: 4, 5: 1 }, // 13 题
  5: { 3: 5, 4: 6, 5: 5 }, // 16 题
};

/** 取某知识点难度对应的目标题量 */
export function targetCount(difficulty) {
  return EXERCISES_BY_DIFFICULTY[difficulty] ?? 10;
}

/** 取某知识点难度对应的题内难度分布 */
export function questionMix(difficulty) {
  return QUESTION_MIX_BY_DIFFICULTY[difficulty] ?? QUESTION_MIX_BY_DIFFICULTY[3];
}

/**
 * 题型分布参考（同样遵循金字塔：客观题多、主观题少）
 * 用于在同一难度内分配题型。
 */
export const TYPE_MIX = {
  1: { single: 2, judge: 2, fill: 1, code: 1 },
  2: { single: 2, judge: 2, fill: 1, multiple: 1, code: 2 },
  3: { single: 2, judge: 2, multiple: 1, fill: 1, code: 2, open: 2 },
  4: { single: 2, judge: 2, multiple: 2, fill: 1, code: 3, open: 3 },
  5: { single: 2, judge: 2, multiple: 2, fill: 2, code: 4, open: 4 },
};
