import { chromium } from 'playwright-core';

const base = process.argv[2] || 'http://127.0.0.1:5175';
const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1680, height: 1100 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

const checks = [];
const check = (name, cond, detail = '') => {
  checks.push({ name, ok: Boolean(cond) });
  console.log(`${cond ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
};

// 1. 首页出现 AI 自动化学科
await page.goto(`${base}/`, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForSelector('.course-card', { timeout: 30000 });
const cards = await page.locator('.course-card').count();
check('首页课程数（26 门）', cards >= 26, `${cards} 门`);

// 2. 侧边栏有 AI 自动化分组
const heads = await page.locator('.nav-group-head').allInnerTexts();
check('侧边栏含 AI 自动化分组', heads.some((h) => h.includes('AI 自动化')), heads.map((h) => h.split('\n').filter(Boolean)[1] ?? '').join(' | '));

// 3. AI 自动化学习地图
await page.goto(`${base}/learning-map/ai-auto`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const title = await page.locator('.practice-title').innerText();
check('地图标题正确', title.includes('AI 自动化学习地图'), title);
const stations = await page.locator('.metro-station').count();
check('5 个站点', stations === 5, `${stations} 个`);
const links = await page.locator('.metro-link').count();
check('6 条连线', links === 6, `${links} 条`);
await page.screenshot({ path: 'qa/110-ai-auto-map.png' });

// 4. 样板章页面
await page.goto(`${base}/course/ai-auto-m2/chapter/ai-auto-m2-c1`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
const lessonTitle = await page.locator('h1, .lesson-title').first().innerText();
check('章节能正常打开', Boolean(lessonTitle), lessonTitle.slice(0, 40));

// 5. 图示渲染
const diagramBlocks = await page.locator('.diagram-block').count();
check('图示渲染', diagramBlocks > 0, `${diagramBlocks} 个`);
const reactSvg = await page.locator('.react-loop-svg').count();
check('ReAct 循环动画渲染', reactSvg > 0, `${reactSvg} 个`);
await page.screenshot({ path: 'qa/111-ai-auto-react.png' });

// 6. 交互：点击 ReAct 步骤
if (reactSvg > 0) {
  const steps = page.locator('.react-step');
  const n = await steps.count();
  check('ReAct 步骤列表（5 步）', n === 5, `${n} 步`);
  if (n > 0) {
    await steps.nth(2).click();
    await page.waitForTimeout(600);
    const active = await page.locator('.react-step.active').count();
    check('点击步骤可切换', active === 1, `${active} 个激活`);
  }
}

// 7. 题目区域
await page.goto(`${base}/practice/ai-auto-m2/ai-auto-m2-c1`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const bodyText = await page.evaluate(() => document.body.innerText);
check('题目页可访问', bodyText.includes('ReAct') || bodyText.includes('思考'), bodyText.slice(0, 40));

check('无 JS 运行时错误', errors.length === 0, errors.slice(0, 2).join(' | '));

await browser.close();
const pass = checks.filter((c) => c.ok).length;
console.log(`\n结果：${pass}/${checks.length} 通过`);
process.exitCode = pass === checks.length ? 0 : 1;
