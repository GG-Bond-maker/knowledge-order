import type { Chapter } from '../../../types';
import { quantXquantC1Chapters } from './c1';
import { quantXquantC2Chapters } from './c2';
import { quantXquantC3Chapters } from './c3';
import { quantXquantC4Chapters } from './c4';
import { quantXquantC5Chapters } from './c5';
import { quantXquantC6Chapters } from './c6';
import { quantXquantC7Chapters } from './c7';
import { quantXquantC10Chapters } from './c10';
import { quantXquantC8Chapters } from './c8';
import { quantXquantC9Chapters } from './c9';

/**
 * 量化入门：从投资想法到可验证实验
 *
 * 10 章结构（设计规格见 docs/xquant-design.md）：
 *  c1 研究工作台：把想法写成可验收的 spec
 *  c2 跑通第一个策略：从定投到样本外崩塌
 *  c3 先选买什么：标的池与 ETF
 *  c4 决定各买多少：三种分法
 *  c5 决定何时买卖：再平衡、止损、止盈
 *  c6 给策略做体检：四个视角
 *  c7 别高兴太早：防止过拟合
 *  c8 从理想到现实：执行交易
 *  c9 策略跑起来以后：监控、诊断、迭代
 *  c10 持续寻找机会：因子研究入门
 */
export const quantXquantChapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  ...quantXquantC1Chapters,
  ...quantXquantC2Chapters,
  ...quantXquantC3Chapters,
  ...quantXquantC4Chapters,
  ...quantXquantC5Chapters,
  ...quantXquantC6Chapters,
  ...quantXquantC7Chapters,
  ...quantXquantC8Chapters,
  ...quantXquantC9Chapters,
  ...quantXquantC10Chapters,
];
