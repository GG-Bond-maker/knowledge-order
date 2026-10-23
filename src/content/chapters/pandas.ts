import type { Chapter } from '../../types';
import { ch1 } from './pandas/ch1';
import { ch2 } from './pandas/ch2';
import { ch3 } from './pandas/ch3';
import { ch4 } from './pandas/ch4';
import { ch5 } from './pandas/ch5';

/**
 * Pandas 课程：5 章
 * （1 数据结构与选取、2 索引与 loc/iloc、3 清洗与缺失值、
 *   4 时间序列与窗口计算、5 透视表与多表合并）。
 * 代码在浏览器内由 Pyodide 执行。
 */
export const pandasChapters: Omit<Chapter, 'courseId' | 'order'>[] = [ch1, ch2, ch3, ch4, ch5];
