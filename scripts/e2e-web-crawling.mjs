import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const base = process.argv[2] || 'http://127.0.0.1:5175';
const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);
const executablePath = chromeCandidates.find((candidate) => existsSync(candidate));
if (!executablePath) {
  throw new Error('未找到 Chrome/Edge；请设置 CHROME_PATH');
}

const expectedHeadings = [
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
const chapterIds = Array.from(
  { length: 12 },
  (_, index) => `web-crawling-c${String(index + 1).padStart(2, '0')}`,
);

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
const checks = [];

page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() !== 'error') return;
  const location = message.location().url;
  const knownFavicon404 =
    location.endsWith('/favicon.ico') &&
    message.text().includes('the server responded with a status of 404');
  if (!knownFavicon404) errors.push(`console: ${message.text()} @ ${location}`);
});

const check = (name, ok, detail = '') => {
  checks.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const normalizedText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
const overflow = () =>
  page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
    viewport: window.innerWidth,
  }));

await page.goto(`${base}/course/web-crawling`, {
  waitUntil: 'networkidle',
  timeout: 120000,
});
await page.waitForSelector('.chapter-card', { timeout: 30000 });

const courseTitle = normalizedText(await page.locator('.course-title').innerText());
const chapterCards = await page.locator('.chapter-card').count();
const courseText = normalizedText(await page.locator('body').innerText());
const courseOverflow = await overflow();
check('课程标题正确', courseTitle === '网络爬虫：从静态页面到可监控的增量采集系统', courseTitle);
check('课程页显示 12 章', chapterCards === 12, `${chapterCards} 章`);
check('课程页显示 349 道习题', /349\s*道习题/.test(courseText));
check(
  '课程页 1440px 无整页横向溢出',
  courseOverflow.documentWidth <= courseOverflow.viewport + 1,
  JSON.stringify(courseOverflow),
);
await page.screenshot({ path: 'qa/91-web-crawling-course.png', fullPage: true });

for (const [index, chapterId] of chapterIds.entries()) {
  const url = `${base}/course/web-crawling/chapter/${chapterId}`;
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
    await page.waitForSelector('.lesson-section-card', { timeout: 30000 });

    const result = await page.evaluate((expected) => {
      const normalize = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
      const lessons = [...document.querySelectorAll('.lesson-section-card')];
      const diagrams = document.querySelectorAll('.lesson-body .diagram-block, .lesson-body .crawl-diagram').length;
      const missing = document.querySelectorAll(
        '.crawl-diagram-missing, .diagram-missing',
      ).length;
      const lessonChecks = lessons.map((lesson, lessonIndex) => {
        const body = lesson.querySelector('.lesson-body');
        const headings = body
          ? [...body.querySelectorAll('h2')].map((heading) => normalize(heading.textContent))
          : [];
        return {
          lessonIndex,
          title: normalize(lesson.querySelector('.lesson-section-title')?.textContent),
          hasVisual: Boolean(body?.querySelector('.diagram-block, .crawl-diagram, table')),
          hasCodeOrDemo: Boolean(body?.querySelector('pre, .demo-box')),
          missingHeadings: expected.filter((heading) => !headings.includes(heading)),
          headingCount: headings.length,
        };
      });
      return {
        lessons: lessons.length,
        diagrams,
        missing,
        lessonChecks,
        width: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        viewport: window.innerWidth,
      };
    }, expectedHeadings);

    const label = `第 ${index + 1} 章`;
    check(`${label} 有 3 节`, result.lessons === 3, `${result.lessons} 节`);
    check(`${label} 至少 1 张图解`, result.diagrams >= 1, `${result.diagrams} 张`);
    check(`${label} 无缺失图解`, result.missing === 0, `${result.missing} 个`);
    check(
      `${label} 1440px 无整页横向溢出`,
      result.width <= result.viewport + 1 && result.bodyWidth <= result.viewport + 1,
      `document=${result.width}, body=${result.bodyWidth}, viewport=${result.viewport}`,
    );

    result.lessonChecks.forEach((lesson) => {
      const lessonLabel = `${label} L${lesson.lessonIndex + 1}`;
      check(`${lessonLabel} 含 14 个教学模块`, lesson.missingHeadings.length === 0, lesson.missingHeadings.join('、'));
      check(`${lessonLabel} 有图解或结构化表格`, lesson.hasVisual);
      check(`${lessonLabel} 有代码块或 Demo`, lesson.hasCodeOrDemo);
    });

    if (chapterId === 'web-crawling-c01') {
      await page.screenshot({ path: 'qa/92-web-crawling-chapter.png', fullPage: true });
    }
  } catch (error) {
    check(`第 ${index + 1} 章可加载并完成检查`, false, String(error).slice(0, 300));
  }
}

await page.goto(`${base}/course/web-crawling/chapter/web-crawling-c01`, {
  waitUntil: 'networkidle',
  timeout: 120000,
});
await page.waitForSelector('.lesson-section-card', { timeout: 30000 });
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
const mobile = await page.evaluate(() => {
  const offenders = [...document.querySelectorAll('body *')]
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        tag: element.tagName,
        className: String(element.className).slice(0, 80),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        scrollWidth: element.scrollWidth,
      };
    })
    .filter((item) => item.right > window.innerWidth + 1 || item.width > window.innerWidth + 1)
    .sort((a, b) => b.right - a.right)
    .slice(0, 10);
  return {
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
    viewport: window.innerWidth,
    offenders,
  };
});
check(
  '长章节 390px 无整页横向溢出',
  mobile.documentWidth <= mobile.viewport + 1 && mobile.bodyWidth <= mobile.viewport + 1,
  JSON.stringify(mobile),
);
await page.screenshot({ path: 'qa/93-web-crawling-mobile.png', fullPage: true });

check('无浏览器运行时错误', errors.length === 0, errors.slice(0, 5).join(' | '));

await browser.close();
const passed = checks.filter((item) => item.ok).length;
console.log(`\n结果：${passed}/${checks.length} 通过`);
if (passed !== checks.length) process.exitCode = 1;
