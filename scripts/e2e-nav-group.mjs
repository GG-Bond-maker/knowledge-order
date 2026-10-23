import { chromium } from 'playwright-core';

const base = process.argv[2] || 'http://127.0.0.1:5175';
const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1680, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

const checks = [];
const check = (name, cond, detail = '') => {
  checks.push({ name, ok: Boolean(cond) });
  console.log(`${cond ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
};

await page.goto(`${base}/`, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForSelector('.sidebar-nav', { timeout: 30000 });

// 1. 一级导航有两个分组
const heads = await page.locator('.nav-group-head').allInnerTexts();
check('一级导航数量 = 3（数据分析 + 数据挖掘 + 大模型）', heads.length === 3, heads.map((h) => h.replace(/\s+/g, ' ').trim()).join(' | '));
check('包含「数据分析」', heads.some((h) => h.includes('数据分析')));
check('包含「大模型」', heads.some((h) => h.includes('大模型')));
check('包含「数据挖掘」', heads.some((h) => h.includes('数据挖掘')));

// 2. 侧边栏不再平铺数据分析课程
const flatItems = await page.locator('.sidebar-nav > .nav-item').allInnerTexts();
const hasFlatData = flatItems.some((t) => t.includes('Python 数据分析') || t.includes('Pandas') || t.includes('SQL 数据库'));
check('数据分析课程不再平铺在侧边栏', !hasFlatData, `平铺项: ${flatItems.map((t) => t.split('\n')[1] ?? '').filter(Boolean).join(', ')}`);

// 3. 展开「数据分析」
const dataHead = page.locator('.nav-group-head', { hasText: '数据分析' });
await dataHead.click();
await page.waitForTimeout(500);
const dataGroup = page.locator('.nav-group').nth(0);
const dataSubs = await dataGroup.locator('.nav-sub-item').allInnerTexts();
check('数据分析展开后有 6 门子课程', dataSubs.length === 6, dataSubs.map((t) => t.split('\n')[0]).join(' / '));
const titles = dataSubs.map((t) => t.split('\n')[0]);
check('包含 Python', titles.some((t) => t.includes('Python')));
check('包含 Pandas', titles.some((t) => t.includes('Pandas')));
check('包含 SQL', titles.some((t) => t.includes('SQL')));
check('包含 Excel', titles.some((t) => t.includes('Excel')));
check('包含 可视化', titles.some((t) => t.includes('可视化')));
check('包含 方法论', titles.some((t) => t.includes('方法论')));

// 4. 展开「大模型」验证分组仍然正常
const llmHead = page.locator('.nav-group-head', { hasText: '大模型' });
await llmHead.click();
await page.waitForTimeout(500);
const llmGroup = page.locator('.nav-group').nth(2);
const llmSubs = await llmGroup.locator('.nav-sub-item').count();
const llmGroups = await llmGroup.locator('.nav-sub-group-title').allInnerTexts();
check('大模型展开后 10 项（9 课程 + 学习地图）', llmSubs === 10, `${llmSubs} 项`);
check('大模型三级分组仍在', llmGroups.length === 3, llmGroups.join(' / '));

await page.screenshot({ path: 'qa/90-nav-data.png', clip: { x: 0, y: 0, width: 300, height: 1080 } });

// 5. 点击数据分析子课程能正常跳转
await dataGroup.locator('.nav-sub-item').first().click();
await page.waitForTimeout(1500);
const url = page.url();
check('点击子课程可跳转', url.includes('/course/'), url.replace(base, ''));
const chapterCards = await page.locator('.chapter-card').count();
check('课程页正常渲染', chapterCards > 0, `${chapterCards} 章`);

// 6. 进入数据分析课程时，该分组应自动展开 + 高亮
const dataHeadAfter = page.locator('.nav-group-head', { hasText: '数据分析' });
const headClass = await dataHeadAfter.getAttribute('class');
check('数据分析分组高亮', (headClass ?? '').includes('active'), headClass ?? '');
const subsVisible = await page.locator('.nav-group').nth(0).locator('.nav-sub-item').count();
check('数据分析分组自动展开', subsVisible === 6, `${subsVisible} 项`);

// 7. 算法等其它课程仍在顶层
const otherTop = await page.locator('.sidebar-nav > .nav-item').allInnerTexts();
check('算法课程仍在顶层平铺', otherTop.some((t) => t.includes('算法')), otherTop.map((t) => (t.split('\n')[1] ?? '')).filter(Boolean).join(', '));

check('无 JS 运行时错误', errors.length === 0, errors.slice(0, 2).join(' | '));

await browser.close();
const pass = checks.filter((c) => c.ok).length;
console.log(`\n结果：${pass}/${checks.length} 通过`);
process.exitCode = pass === checks.length ? 0 : 1;
