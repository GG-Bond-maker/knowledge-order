import type { Chapter } from '../../../types';
import { cs146sW1Chapters } from './w1';
import { cs146sW1ExtraChapters } from './w1b';

/**
 * CS146S Fall 2026 — The Modern Software Developer
 * 章节聚合：每个文件对应官方大纲的一周（或毕业项目章）。
 * 设计规格见 docs/cs146s-design.md。
 */
export const cs146sChapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  ...cs146sW1Chapters,
  ...cs146sW1ExtraChapters,
];
