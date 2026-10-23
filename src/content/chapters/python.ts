import type { Chapter } from '../../types';
import { ch1 } from './python/ch1';
import { ch2 } from './python/ch2';
import { ch3 } from './python/ch3';
import { ch4 } from './python/ch4';
import { ch5 } from './python/ch5';
import { ch6 } from './python/ch6';
import { pythonExtra } from './python/extra';
import { pythonExtra2 } from './python/extra2';
import { pythonExtra3 } from './python/extra3';

const base: Omit<Chapter, 'courseId' | 'order'>[] = [ch1, ch2, ch3, ch4, ch5, ch6];

/** 所有扩展包按 chapterId 汇总 */
const EXTRAS = [...pythonExtra, ...pythonExtra2, ...pythonExtra3];

/**
 * Python 数据分析基础课程：6 章。
 * 每章在小节与习题上合并 extra.ts / extra2.ts / extra3.ts 中的扩展内容
 * （补充知识点 + 按难度分级的更大题量练习）。
 */
export const pythonChapters: Omit<Chapter, 'courseId' | 'order'>[] = base.map((ch) => {
  const parts = EXTRAS.filter((e) => e.chapterId === ch.id);
  if (!parts.length) return ch;
  return {
    ...ch,
    lessons: [...ch.lessons, ...parts.flatMap((p) => p.lessons ?? [])],
    exercises: [...ch.exercises, ...parts.flatMap((p) => p.exercises)],
  };
});
