import type { Chapter } from '../../../types';
import { webCrawlingChapters01 } from './c01';
import { webCrawlingChapters02 } from './c02';
import { webCrawlingChapters03 } from './c03';
import { webCrawlingChapters04 } from './c04';
import { webCrawlingChapters05 } from './c05';
import { webCrawlingChapters06 } from './c06';
import { webCrawlingChapters07 } from './c07';
import { webCrawlingChapters08 } from './c08';
import { webCrawlingChapters09 } from './c09';
import { webCrawlingChapters10 } from './c10';
import { webCrawlingChapters11 } from './c11';
import { webCrawlingChapters12 } from './c12';

export const webCrawlingChapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  ...webCrawlingChapters01,
  ...webCrawlingChapters02,
  ...webCrawlingChapters03,
  ...webCrawlingChapters04,
  ...webCrawlingChapters05,
  ...webCrawlingChapters06,
  ...webCrawlingChapters07,
  ...webCrawlingChapters08,
  ...webCrawlingChapters09,
  ...webCrawlingChapters10,
  ...webCrawlingChapters11,
  ...webCrawlingChapters12,
];
