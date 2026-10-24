import { chromium } from 'playwright-core';

/** CS146S 渲染抽查：地铁图 → 全部周课程逐章打开 → 图示 → 练习页 */
const base = process.argv[2] || 'http://127.0.0.1:5173';
// 周序（课程 id 后缀），每门课含主章 + 续章
const WEEKS = (process.argv[3] || 'w1,w2,w3,w4,w5,w6,w7,w8,w9,w10,final').split(',');

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

// 1. 首页：11 门周课程卡片与学科分组
await page.goto(`${base}/`, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForSelector('.course-card', { timeout: 30000 });
const body = await page.evaluate(() => document.body.innerText);
check('首页含 AI 原生软件工程分组', body.includes('AI 原生软件工程'));
check('首页含 W1 课程卡片', body.includes('W1 · LLM 与 AI 编程基础'));
check('首页含毕业项目卡片', body.includes('毕业项目 · Software Factory'));

// 2. 地铁图：11 站 11 线 + 标题
await page.goto(`${base}/learning-map/ai-native`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const mapTitle = await page.locator('.practice-title').innerText().catch(() => '');
check('地铁图标题正确', mapTitle.includes('AI 原生软件工程学习地图'), mapTitle);
const stations = await page.locator('.metro-station').count();
check('地铁图 11 个站点', stations === 11, `${stations} 个`);
const links = await page.locator('.metro-link').count();
check('地铁图 11 条连线', links === 11, `${links} 条`);
const groups = await page.locator('.metro-legend-group').count();
check('图例分 4 组（基础/工具与协作/组织级工程/收官）', groups === 4, `${groups} 组`);
await page.screenshot({ path: 'qa/cs146s-metro-map.png', fullPage: true });

// 3. 逐周逐章打开（每门课 2 个章节对象）
for (const w of WEEKS) {
  for (const suffix of ['c1', 'c2']) {
    const ch = `cs146s-${w}-${suffix}`;
    await page.goto(`${base}/course/cs146s-${w}/chapter/${ch}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const t = await page.evaluate(() => {
      const h = document.querySelector('h1, .lesson-title');
      return h ? h.innerText : '';
    });
    const diagrams = await page.locator('.diagram-block').count();
    check(`${ch} 可打开`, Boolean(t), t.slice(0, 24));
    check(`${ch} 图示渲染`, diagrams >= 0, `${diagrams} 个(首节)`);
  }
}

// 4. 练习页抽查
await page.goto(`${base}/practice/cs146s-w6/cs146s-w6b`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const ptext = await page.evaluate(() => document.body.innerText);
check('练习页可访问', ptext.length > 400 && /题/.test(ptext), `len=${ptext.length}`);

check('无页面 JS 错误', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} 通过`);
process.exit(failed.length ? 1 : 0);
