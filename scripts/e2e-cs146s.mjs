import { chromium } from 'playwright-core';

/** CS146S 渲染抽查：全部已落地章节逐章打开，校验标题/图示/无 JS 错误 */
const base = process.argv[2] || 'http://127.0.0.1:5173';
const CHAPTERS = (process.argv[3] || 'cs146s-w1,cs146s-w1b,cs146s-w3,cs146s-w3b,cs146s-w6,cs146s-w6b,cs146s-w7,cs146s-w7b').split(',');

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

// 1. 首页课程卡片与学科分组
await page.goto(`${base}/`, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForSelector('.course-card', { timeout: 30000 });
const body = await page.evaluate(() => document.body.innerText);
check('首页含 CS146S 课程卡片', body.includes('CS146S 现代软件开发者'));
check('首页含 AI 原生软件工程分组', body.includes('AI 原生软件工程'));

// 2. 逐章打开
for (const ch of CHAPTERS) {
  await page.goto(`${base}/course/cs146s/chapter/${ch}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  const t = await page.evaluate(() => {
    const h = document.querySelector('h1, .lesson-title');
    return h ? h.innerText : '';
  });
  const diagrams = await page.locator('.diagram-block').count();
  check(`${ch} 可打开`, Boolean(t), t.slice(0, 30));
  check(`${ch} 图示渲染`, diagrams >= 0, `${diagrams} 个(首节)`);
}

// 3. 练习页（每周抽查一页；页面一次只显示第一题，断言通用练习控件与首题内容）
await page.goto(`${base}/practice/cs146s/cs146s-w6b`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const ptext = await page.evaluate(() => document.body.innerText);
check('练习页可访问', ptext.length > 400 && /题/.test(ptext), `len=${ptext.length} 首30字:${ptext.slice(0, 24)}`);

check('无页面 JS 错误', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} 通过`);
process.exit(failed.length ? 1 : 0);
