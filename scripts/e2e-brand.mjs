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

await page.goto(`${base}/`, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForSelector('.sidebar-brand', { timeout: 30000 });

// 侧边栏品牌
const logo = await page.locator('.logo').first().innerText();
const name = await page.locator('.sidebar-brand .name').innerText();
const sub = await page.locator('.sidebar-brand .sub').innerText();
check('左上角图标字母 = ZX', logo.trim() === 'ZX', logo.trim());
check('中文名 = 知序学院', name.trim() === '知序学院', name.trim());
check('英文名 = KNOWLEDGE ORDER', sub.trim() === 'KNOWLEDGE ORDER', sub.trim());

// 浏览器标签页标题
const title = await page.title();
check('标签页标题含知序学院', title.includes('知序学院'), title);
check('标签页不再含"数析"', !title.includes('数析'), title);

// meta description
const desc = await page.locator('meta[name="description"]').getAttribute('content');
check('meta 描述已更新', desc.includes('知序学院') && desc.includes('大模型'), (desc ?? '').slice(0, 50) + '…');

// 大屏页品牌
await page.goto(`${base}/dashboard`, { waitUntil: 'networkidle' });
await page.waitForSelector('.dash-title', { timeout: 20000 });
const dashTitle = await page.locator('.dash-title').innerText();
const dashSub = await page.locator('.dash-subtitle').innerText();
check('大屏标题 = 知序学院', dashTitle.includes('知序学院'), dashTitle);
check('大屏副标题 = KNOWLEDGE ORDER', dashSub.includes('KNOWLEDGE ORDER'), dashSub);

// 页面中不应残留旧名
await page.goto(`${base}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const bodyText = await page.evaluate(() => document.body.innerText);
check('页面无"数析学院"残留', !bodyText.includes('数析学院'));
check('页面无"DATA ACADEMY"残留', !bodyText.includes('DATA ACADEMY'));

await page.screenshot({ path: 'qa/80-rebrand.png', clip: { x: 0, y: 0, width: 420, height: 120 } });
await page.goto(`${base}/dashboard`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.screenshot({ path: 'qa/81-dashboard-rebrand.png' });

check('无 JS 运行时错误', errors.length === 0, errors.slice(0, 2).join(' | '));

await browser.close();
const pass = checks.filter((c) => c.ok).length;
console.log(`\n结果：${pass}/${checks.length} 通过`);
process.exitCode = pass === checks.length ? 0 : 1;
