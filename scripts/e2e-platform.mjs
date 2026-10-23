import { chromium } from 'playwright-core';

const base = process.argv[2] || 'http://127.0.0.1:5175';
const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

const checks = [];
const check = (name, cond, detail = '') => {
  checks.push({ name, ok: Boolean(cond) });
  console.log(`${cond ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
};

// 1. 首页：动态加载 + 学科分组
await page.goto(`${base}/`, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForSelector('.course-card', { timeout: 30000 });
const cards = await page.locator('.course-card').count();
check('首页从后端加载课程', cards >= 6, `${cards} 门课程`);
const domainHeads = await page.locator('.section-title').allInnerTexts();
const hasDomain = domainHeads.some((t) => t.includes('数据分析') || t.includes('编程开发') || t.includes('人工智能'));
check('首页按学科分组', hasDomain, domainHeads.filter((t) => /数据分析|编程|人工智能/.test(t)).join(' / '));
await page.screenshot({ path: 'qa/40-home-multi.png' });

// 2. 新导航项
check('侧边栏「今日复习」', (await page.locator('a[href="/spaced-review"]').count()) > 0);
check('侧边栏「学习计划与笔记」', (await page.locator('a[href="/plan"]').count()) > 0);
check('侧边栏「内容管理」', (await page.locator('a[href="/admin"]').count()) > 0);

// 3. 复习页
await page.goto(`${base}/spaced-review`, { waitUntil: 'networkidle' });
await page.waitForSelector('.review-hero', { timeout: 20000 });
check('复习页渲染', (await page.locator('.review-stat').count()) === 4, '4 个统计卡片');
check('复习负荷预测', (await page.locator('.load-bar-col').count()) === 7, '7 天预测');
await page.screenshot({ path: 'qa/41-spaced-review.png' });

// 4. 学习计划页
await page.goto(`${base}/plan`, { waitUntil: 'networkidle' });
await page.waitForSelector('.plan-grid');
check('计划页渲染', (await page.locator('.plan-card').count()) >= 4, `${await page.locator('.plan-card').count()} 个卡片`);
check('学习日选择器', (await page.locator('.weekday-btn').count()) === 7, '7 天');
// 修改目标并验证持久化
const goalInput = page.locator('.plan-card input[type="number"]').first();
await goalInput.fill('15');
await page.waitForTimeout(600);
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('data-academy:state:v2') || '{}')?.plan?.dailyGoal);
check('学习计划持久化', stored === 15, `dailyGoal=${stored}`);
await page.screenshot({ path: 'qa/42-plan.png' });

// 5. 内容管理后台
await page.goto(`${base}/admin`, { waitUntil: 'networkidle' });
await page.waitForSelector('.admin-layout', { timeout: 20000 });
check('内容管理页渲染', true);
const backendBadge = await page.locator('.badge').filter({ hasText: '已连接后端' }).count();
check('后台检测到后端连接', backendBadge > 0);
const adminCourses = await page.locator('.admin-course-item').count();
check('后台课程列表', adminCourses >= 6, `${adminCourses} 门`);
// 切换到章节页签
await page.locator('button:has-text("章节与习题")').click();
await page.waitForTimeout(500);
const accordions = await page.locator('.chapter-accordion').count();
check('章节编辑器', accordions > 0, `${accordions} 章`);
await page.screenshot({ path: 'qa/43-admin.png' });

// 6. 知识点笔记
await page.goto(`${base}/course/python/chapter/python-1`, { waitUntil: 'networkidle' });
await page.waitForSelector('.note-panel', { timeout: 20000 });
check('知识点笔记面板', (await page.locator('.note-panel').count()) > 0);
await page.locator('.note-head').click();
await page.waitForTimeout(300);
await page.locator('.note-textarea').fill('这是我在测试时写的一条笔记：变量是标签不是盒子。');
await page.locator('button:has-text("保存笔记")').click();
await page.waitForTimeout(700);
const noteSaved = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('data-academy:state:v2') || '{}').notes || {}).length);
check('笔记保存成功', noteSaved > 0, `${noteSaved} 条笔记`);
await page.screenshot({ path: 'qa/44-note.png' });

// 7. 无运行时错误
check('无 JS 运行时错误', errors.length === 0, errors.slice(0, 2).join(' | '));

await browser.close();
const pass = checks.filter((c) => c.ok).length;
console.log(`\n结果：${pass}/${checks.length} 通过`);
process.exitCode = pass === checks.length ? 0 : 1;
