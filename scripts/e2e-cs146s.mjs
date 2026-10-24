import { chromium } from 'playwright-core';

/** CS146S 渲染抽查：域分组 → 课程页 → 两个章节页 → 图示 → 练习 */
const base = process.argv[2] || 'http://127.0.0.1:5173';
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

// 1. 首页出现 CS146S 课程
await page.goto(`${base}/`, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForSelector('.course-card', { timeout: 30000 });
const body = await page.evaluate(() => document.body.innerText);
check('首页含 CS146S 课程卡片', body.includes('CS146S 现代软件开发者'));
check('首页含 AI 原生软件工程分组', body.includes('AI 原生软件工程'));

// 2. Week 1 章节页：小节文本与图示
await page.goto(`${base}/course/cs146s/chapter/cs146s-w1`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
const w1text = await page.evaluate(() => document.body.innerText);
check('w1 章节页可打开（含 l1 标题）', w1text.includes('范式转变'));
check('w1 含 l2/l3 小节入口', w1text.includes('Token') && w1text.includes('提示词'));
const w1diag = await page.locator('.diagram-block').count();
check('w1 交互图渲染（spectrum/token 等）', w1diag > 0, `${w1diag} 个`);
await page.screenshot({ path: 'qa/cs146s-w1-render.png' });

// 3. Week 1b 章节页：contextwindow 新组件
await page.goto(`${base}/course/cs146s/chapter/cs146s-w1b`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
const w1btext = await page.evaluate(() => document.body.innerText);
check('w1b 章节页可打开（含失效模式）', w1btext.includes('失效模式') || w1btext.includes('上下文窗口'));
check('w1b 含实验课小节', w1btext.includes('Playground') || w1btext.includes('实验'));
const w1bdiag = await page.locator('.diagram-block').count();
check('w1b contextwindow 图渲染', w1bdiag > 0, `${w1bdiag} 个`);
await page.screenshot({ path: 'qa/cs146s-w1b-render.png' });

// 4. 练习页
await page.goto(`${base}/practice/cs146s/cs146s-w1`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const ptext = await page.evaluate(() => document.body.innerText);
check('练习页可访问', ptext.includes('范式') || ptext.includes('LLM'), ptext.slice(0, 30));

check('无页面 JS 错误', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} 通过`);
process.exit(failed.length ? 1 : 0);
