import { chromium } from 'playwright-core';

const base = process.argv[2] || 'http://127.0.0.1:5175';
const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1680, height: 1050 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

const checks = [];
const check = (name, cond, detail = '') => {
  checks.push({ name, ok: Boolean(cond) });
  console.log(`${cond ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
};

// 1. 首页
await page.goto(`${base}/`, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForSelector('.course-card');
const cards = await page.locator('.course-card').count();
check('首页 6 张课程卡片', cards === 6, `${cards} 张`);
const hero = await page.locator('.hero-sub').innerText();
check('首页显示最新习题总数', /89[0-9]|9[0-9][0-9]/.test(hero), hero.replace(/\s+/g, ' ').slice(0, 70));
await page.screenshot({ path: 'qa/30-home-final.png' });

// 2. 导航栏「首页大屏」按钮
const navBtn = page.locator('.nav-dashboard');
const topBtn = page.locator('.btn-dashboard');
check('侧边栏「首页大屏」按钮存在', (await navBtn.count()) > 0);
check('顶栏「首页大屏」按钮存在', (await topBtn.count()) > 0);

// 3. 点击进入大屏
await navBtn.first().click();
await page.waitForURL('**/dashboard', { timeout: 15000 });
await page.waitForSelector('.dash-root');
await page.waitForTimeout(2000);
check('大屏页面渲染', (await page.locator('.dash-kpi').count()) === 8, '8 个 KPI');
check('大屏图表渲染', (await page.locator('canvas').count()) >= 6, `${await page.locator('canvas').count()} 个 canvas`);
await page.screenshot({ path: 'qa/31-dashboard-final.png' });

// 4. 课程页显示难度标签
await page.goto(`${base}/course/python`, { waitUntil: 'networkidle' });
await page.waitForSelector('.chapter-card');
const chapters = await page.locator('.chapter-card').count();
check('Python 课程 6 章', chapters === 6, `${chapters} 章`);
const diffBadges = await page.locator('.chapter-card .badge').filter({ hasText: /入门|进阶|挑战/ }).count();
check('章节显示难度标签', diffBadges === 6, `${diffBadges} 个难度标签`);
await page.screenshot({ path: 'qa/32-course-difficulty.png' });

// 5. 练习页的难度分级面板
await page.goto(`${base}/practice/python/python-1`, { waitUntil: 'networkidle' });
await page.waitForSelector('.diff-panel');
check('练习页显示章节难度面板', (await page.locator('.diff-badge').count()) > 0);
const tierTabs = await page.locator('.tier-tab').count();
check('难度档位标签（全部+3档）', tierTabs === 4, `${tierTabs} 个`);
const dotsAll = await page.locator('.exercise-dot').count();
// 点击"进阶训练"
await page.locator('.tier-tab').nth(2).click();
await page.waitForTimeout(600);
const dotsAdv = await page.locator('.exercise-dot').count();
check('切换难度档位后题量变化', dotsAdv > 0 && dotsAdv < dotsAll, `全部 ${dotsAll} → 进阶 ${dotsAdv}`);
// 难度递进模式
await page.locator('button:has-text("难度递进模式")').click();
await page.waitForTimeout(600);
check('难度递进模式可开启', (await page.locator('button:has-text("难度递进中")').count()) > 0);
await page.screenshot({ path: 'qa/33-practice-difficulty.png' });

// 6. 各课程章节规模
const courseIds = ['python', 'pandas', 'sql', 'excel', 'viz', 'methodology'];
const sizes = [];
for (const id of courseIds) {
  await page.goto(`${base}/course/${id}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.chapter-card');
  const n = await page.locator('.chapter-card').count();
  const topics = await page.locator('.chapter-card .badge').filter({ hasText: /习题/ }).allInnerTexts();
  const total = topics.reduce((s, t) => s + (parseInt(t.replace(/\D/g, ''), 10) || 0), 0);
  sizes.push(`${id}: ${n}章/${total}题`);
}
check('各课程均有内容', sizes.every((s) => !s.endsWith('/0题')), sizes.join(' | '));

// 7. 无运行时错误
check('无 JS 运行时错误', errors.length === 0, errors.slice(0, 2).join(' | '));

await browser.close();
const pass = checks.filter((c) => c.ok).length;
console.log(`\n结果：${pass}/${checks.length} 通过`);
process.exitCode = pass === checks.length ? 0 : 1;
