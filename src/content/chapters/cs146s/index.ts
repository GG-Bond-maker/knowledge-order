import type { Chapter } from '../../../types';
import { cs146sW1Chapters } from './w1';
import { cs146sW1ExtraChapters } from './w1b';
import { cs146sW2Chapters } from './w2';
import { cs146sW2ExtraChapters } from './w2b';
import { cs146sW3Chapters } from './w3';
import { cs146sW3ExtraChapters } from './w3b';
import { cs146sW4Chapters } from './w4';
import { cs146sW4ExtraChapters } from './w4b';
import { cs146sW5Chapters } from './w5';
import { cs146sW5ExtraChapters } from './w5b';
import { cs146sW6Chapters } from './w6';
import { cs146sW8Chapters } from './w8';
import { cs146sW8ExtraChapters } from './w8b';
import { cs146sW9Chapters } from './w9';
import { cs146sW9ExtraChapters } from './w9b';
import { cs146sW6ExtraChapters } from './w6b';
import { cs146sW7Chapters } from './w7';
import { cs146sW7ExtraChapters } from './w7b';

/**
 * CS146S Fall 2026 — The Modern Software Developer
 * 章节聚合：每个文件对应官方大纲的一周（或毕业项目章）。
 * 设计规格见 docs/cs146s-design.md。
 * 注意：章节顺序 = 官方周序（w1-w10 → final），由聚合顺序决定。
 */
export const cs146sChapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  ...cs146sW1Chapters,
  ...cs146sW1ExtraChapters,
  ...cs146sW2Chapters,
  ...cs146sW2ExtraChapters,
  ...cs146sW3Chapters,
  ...cs146sW3ExtraChapters,
  ...cs146sW4Chapters,
  ...cs146sW4ExtraChapters,
  ...cs146sW5Chapters,
  ...cs146sW5ExtraChapters,
  ...cs146sW6Chapters,
  ...cs146sW6ExtraChapters,
  ...cs146sW7Chapters,
  ...cs146sW7ExtraChapters,
  ...cs146sW8Chapters,
  ...cs146sW8ExtraChapters,
  ...cs146sW9Chapters,
  ...cs146sW9ExtraChapters,
];
