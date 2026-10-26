import type { Chapter } from '../../types';
import { algoExtra1 } from './algo-new';
import { algoExtra2 } from './algo-new2';
import { algoExtra3 } from './algo-new3';
import { algoExtra4 } from './algo-new4';

/**
 * 《算法与数据结构》课程。
 *
 * 章节由 algo-new*.ts 中的分片汇总而来，便于分多次编写与维护。
 * 每章 id 形如 algo-1、algo-2；小节 id 形如 algo-l-1-1；习题 id 形如 algo-1-e1。
 */
export const algoChapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  ...algoExtra1,
  ...algoExtra2,
  ...algoExtra3,
  ...algoExtra4,
];
