import type { Chapter } from '../../types';
import ch1 from './sql/ch1';
import ch2 from './sql/ch2';
import ch3 from './sql/ch3';
import ch4 from './sql/ch4';
import ch5 from './sql/ch5';
import ch6 from './sql/ch6';
import { sqlExtra } from './sql/extra';
import { sqlExtra2 } from './sql/extra2';

const base: Omit<Chapter, 'courseId' | 'order'>[] = [ch1, ch2, ch3, ch4, ch5, ch6];

/** 所有扩展包按 chapterId 汇总 */
const EXTRAS = [...sqlExtra, ...sqlExtra2];

/**
 * SQL 课程：6 章。
 * 执行引擎为浏览器内的 SQLite（sql.js），练习数据集见 engine/datasets.ts。
 * 每章的补充知识点与分级练习从 extra.ts / extra2.ts 合并进来。
 */
export const sqlChapters: Omit<Chapter, 'courseId' | 'order'>[] = base.map((ch) => {
  const parts = EXTRAS.filter((e) => e.chapterId === ch.id);
  if (!parts.length) return ch;
  return {
    ...ch,
    lessons: [...ch.lessons, ...parts.flatMap((p) => p.lessons ?? [])],
    exercises: [...ch.exercises, ...parts.flatMap((p) => p.exercises)],
  };
});
