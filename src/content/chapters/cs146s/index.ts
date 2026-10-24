import type { Chapter } from '../../../types';
import { cs146sW1Chapters } from './w1';
import { cs146sW1ExtraChapters } from './w1b';
import { cs146sW6Chapters } from './w6';
import { cs146sW6ExtraChapters } from './w6b';

/**
 * CS146S Fall 2026 — The Modern Software Developer
 * 章节聚合：每个文件对应官方大纲的一周（或毕业项目章）。
 * 设计规格见 docs/cs146s-design.md。
 * 注意：章节顺序 = 官方周序（w1-w10 → final），由聚合顺序决定。
 */
export const cs146sChapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  ...cs146sW1Chapters,
  ...cs146sW1ExtraChapters,
  ...cs146sW6Chapters,
  ...cs146sW6ExtraChapters,
];
