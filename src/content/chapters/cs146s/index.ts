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
import { cs146sW6ExtraChapters } from './w6b';
import { cs146sW7Chapters } from './w7';
import { cs146sW7ExtraChapters } from './w7b';
import { cs146sW8Chapters } from './w8';
import { cs146sW8ExtraChapters } from './w8b';
import { cs146sW9Chapters } from './w9';
import { cs146sW9ExtraChapters } from './w9b';
import { cs146sW10Chapters } from './w10';
import { cs146sW10ExtraChapters } from './w10b';
import { cs146sFinalChapters } from './final';
import { cs146sFinalExtraChapters } from './finalb';

/**
 * CS146S Fall 2026 — The Modern Software Developer
 *
 * 内容按官方周序生产（w1-w10 + final），每「周」两份章节文件。
 * 课程层按周拆为 11 门子课程（courses.ts 的 cs146s-w*），一门 = 一个地铁图站点，
 * 与 quant/llm/ai-auto 的「一门子课程一个站点」惯例一致。
 * 设计规格见 docs/cs146s-design.md。
 */
export const cs146sWeeks: Record<string, Omit<Chapter, 'courseId' | 'order'>[]> = {
  w1: [...cs146sW1Chapters, ...cs146sW1ExtraChapters],
  w2: [...cs146sW2Chapters, ...cs146sW2ExtraChapters],
  w3: [...cs146sW3Chapters, ...cs146sW3ExtraChapters],
  w4: [...cs146sW4Chapters, ...cs146sW4ExtraChapters],
  w5: [...cs146sW5Chapters, ...cs146sW5ExtraChapters],
  w6: [...cs146sW6Chapters, ...cs146sW6ExtraChapters],
  w7: [...cs146sW7Chapters, ...cs146sW7ExtraChapters],
  w8: [...cs146sW8Chapters, ...cs146sW8ExtraChapters],
  w9: [...cs146sW9Chapters, ...cs146sW9ExtraChapters],
  w10: [...cs146sW10Chapters, ...cs146sW10ExtraChapters],
  final: [...cs146sFinalChapters, ...cs146sFinalExtraChapters],
};
