/**
 * 网络爬虫课程的固定内容契约。
 * 章节、知识点、难度、题量与图解名称以已批准设计稿为准。
 */

export const WEB_CRAWLING_COURSE_ID = 'web-crawling';

export const WEB_CRAWLING_COURSE = {
  id: 'web-crawling',
  title: '网络爬虫：从静态页面到可监控的增量采集系统',
  domainId: 'crawling',
  estimatedHours: 72,
  chapterCount: 12,
  lessonCount: 36,
  exerciseCount: 349,
  seriesId: null,
};

export const WEB_CRAWLING_HEADINGS = [
  '学习目标',
  '前置知识',
  '问题背景',
  '直觉理解',
  '核心概念与原理详解',
  '逐步推导与计算',
  '图示与机制图解',
  '完整案例',
  '代码实践',
  '常见误区与安全风险',
  '与其他知识点的关联',
  '本节总结',
  '参考资料与延伸阅读',
  '动手实验',
];

export const WEB_CRAWLING_DIAGRAM_REGISTRY = {
  'crawl-http-journey': ['overview', 'failure'],
  'crawl-pipeline': ['overview', 'static', 'api', 'incremental'],
  'crawl-dom-tree': ['basic', 'selectors'],
  'crawl-canonicalize': ['default'],
  'crawl-frontier': ['bfs', 'priority'],
  'crawl-robots': ['default'],
  'crawl-rate-limit': ['tokens', 'backoff'],
  'crawl-render-timeline': ['ssr', 'csr', 'playwright'],
  'crawl-recrawl': ['default'],
  'crawl-distributed': ['overview', 'failure'],
  'crawl-compliance': ['consent', 'ssrf'],
  'crawl-bloom': ['bloom', 'simhash'],
};

const chapter = (number, title, goal, lessons) => {
  const id = `web-crawling-c${String(number).padStart(2, '0')}`;
  return {
    id,
    title,
    goal,
    lessons: lessons.map(([lessonNumber, lessonTitle, difficulty, exerciseCount]) => ({
      id: `${id}-l${String(lessonNumber).padStart(2, '0')}`,
      title: lessonTitle,
      difficulty,
      exerciseCount,
    })),
    exerciseCount: lessons.reduce((sum, lesson) => sum + lesson[3], 0),
  };
};

export const WEB_CRAWLING_CHAPTERS = [
  chapter(
    1,
    '从网页到数据：爬虫是什么',
    '建立浏览器、HTTP、HTML、DOM 与抽取器之间的正确心智模型，完成第一次离线解析，并理解采集边界。',
    [
      [1, '网页、浏览器与数据采集：建立正确心智模型', 2, 8],
      [2, '第一个离线解析实验：从 HTML 字符串到结构化数据', 2, 8],
      [3, '能抓什么、不该抓什么：范围、伦理与法律边界', 2, 8],
    ],
  ),
  chapter(
    2,
    'HTTP、URL 与网络请求',
    '读懂 URL 与一次 HTTP 请求的生命周期，根据状态码、响应头、编码和超时定位采集故障。',
    [
      [1, 'URL 解剖与请求生命周期', 2, 8],
      [2, 'HTTP 报文、状态码与响应头', 3, 10],
      [3, '会话、编码、超时与重试', 3, 10],
    ],
  ),
  chapter(
    3,
    'HTML、DOM 与页面结构',
    '从页面外观转向 DOM 结构，使用稳定定位方式抽取字段，并处理不完整或相互冲突的 HTML。',
    [
      [1, 'DOM 树：网页结构的骨架', 2, 8],
      [2, 'CSS 选择器与 XPath：定位目标字段', 3, 10],
      [3, '结构化数据、表格与容错解析', 3, 10],
    ],
  ),
  chapter(
    4,
    '静态页面抽取',
    '掌握解析器选择，完成列表页到详情页的字段抽取，并交付第一个可测试的静态采集项目。',
    [
      [1, 'BeautifulSoup 与 lxml：解析器怎么选', 2, 8],
      [2, '列表页到详情页：完整字段抽取', 3, 10],
      [3, '项目 1：本地静态目录采集器', 4, 13],
    ],
  ),
  chapter(
    5,
    '链接发现、URL 规范化与 Frontier',
    '理解 URL 等价与抓取顺序，构建带范围、深度和去重约束的待访问队列。',
    [
      [1, '链接发现与 URL 规范化', 2, 8],
      [2, 'Frontier：BFS、优先级队列与抓取顺序', 3, 10],
      [3, '抓取陷阱、去重与深度控制', 3, 10],
    ],
  ),
  chapter(
    6,
    'robots.txt、礼貌抓取与限速',
    '正确解释 robots.txt，并把每主机限速、并发、退避和可观测指标落实到采集策略中。',
    [
      [1, 'robots.txt 的正确定位：协议不是法律授权', 2, 8],
      [2, '限速、并发与 token bucket', 3, 10],
      [3, '退避、重试与可观测性', 3, 10],
    ],
  ),
  chapter(
    7,
    '单机爬虫架构与可恢复性',
    '把采集函数组织成状态清晰的流水线，用持久化、检查点和幂等写入实现断点续抓。',
    [
      [1, '采集流水线与任务状态机', 2, 8],
      [2, '持久化、断点续抓与幂等', 3, 10],
      [3, '项目 2：分页 JSON/API 采集器', 4, 13],
    ],
  ),
  chapter(
    8,
    'JavaScript 渲染页面',
    '判断何时需要浏览器，并用 Playwright 的条件等待和有限滚动稳定采集动态页面。',
    [
      [1, 'SSR、CSR 与何时需要浏览器', 2, 8],
      [2, 'Playwright：等待条件、懒加载与无限滚动', 3, 10],
      [3, '项目 3：动态页面采集器', 4, 13],
    ],
  ),
  chapter(
    9,
    '数据质量、存储与模式',
    '用数据契约、质量指标、可追溯存储和隐私最小化，让采集结果能够被信任和复用。',
    [
      [1, 'Schema、字段校验与数据契约', 2, 8],
      [2, '存储格式、去重与数据血缘', 2, 8],
      [3, '数据质量检查与隐私最小化', 3, 10],
    ],
  ),
  chapter(
    10,
    '增量采集与变更检测',
    '使用条件请求、内容指纹、版本记录和重抓调度，识别变化、近似重复与删除。',
    [
      [1, '条件请求：ETag 与 Last-Modified', 2, 8],
      [2, '内容哈希、SimHash 与近似重复', 3, 10],
      [3, '重抓调度、删除检测与版本记录', 3, 10],
    ],
  ),
  chapter(
    11,
    '分布式采集、监控与档案',
    '理解多 worker、中心队列、集中去重、租约与监控，并完成礼貌型聚焦爬虫项目。',
    [
      [1, '多 worker、队列与分片', 3, 10],
      [2, '集中去重、限速与故障恢复', 3, 10],
      [3, '项目 4：礼貌型聚焦爬虫', 4, 13],
    ],
  ),
  chapter(
    12,
    '合规、安全与毕业项目',
    '把授权、隐私、SSRF 与系统安全纳入采集设计，并完成可恢复、可监控的增量采集项目。',
    [
      [1, '合规决策树与隐私边界', 3, 10],
      [2, 'SSRF、恶意 HTML 与采集系统安全', 3, 10],
      [3, '项目 5：增量采集毕业项目', 4, 13],
    ],
  ),
];

if (
  WEB_CRAWLING_CHAPTERS.length !== WEB_CRAWLING_COURSE.chapterCount ||
  WEB_CRAWLING_CHAPTERS.reduce((sum, item) => sum + item.lessons.length, 0) !==
    WEB_CRAWLING_COURSE.lessonCount ||
  WEB_CRAWLING_CHAPTERS.reduce((sum, item) => sum + item.exerciseCount, 0) !==
    WEB_CRAWLING_COURSE.exerciseCount
) {
  throw new Error('网络爬虫课程契约自相矛盾：章节、知识点或题量总和不一致');
}
