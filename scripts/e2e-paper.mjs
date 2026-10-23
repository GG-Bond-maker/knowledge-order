import { chromium } from 'playwright-core';
const base = process.argv[2] || 'http://127.0.0.1:5175';
const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1680, height: 1200 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const checks = [];
const check = (n, ok, d = '') => { checks.push(ok); console.log(`${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`); };

// 1. 侧边栏有论文导读分组
await page.goto(`${base}/`, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForSelector('.course-card', { timeout: 30000 });
const heads = await page.locator('.nav-group-head').allInnerTexts();
check('侧边栏含论文导读', heads.some(h => h.includes('论文导读')), heads.map(h => h.split('\n').filter(Boolean).slice(-1)[0] ?? '').join(' | '));

// 2. 章节能打开
await page.goto(`${base}/course/paper-transformer/chapter/paper-transformer-c1`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2500);
const body = await page.evaluate(() => document.body.innerText);
check('章节能打开', body.includes('Attention') || body.includes('注意力'), body.slice(0, 40).replace(/\n/g,' '));
check('含论文信息表', body.includes('1706.03762') || body.includes('Vaswani'));
check('含 RNN 瓶颈', body.includes('RNN'));
check('含缩放说明', body.includes('√d_k') || body.includes('sqrt'));
check('含多头注意力', body.includes('多头'));
check('含位置编码', body.includes('位置编码'));

// 3. 图示渲染
const diagrams = await page.locator('.diagram-block').count();
check('图示渲染', diagrams >= 3, `${diagrams} 个图示块`);
const attnGrid = await page.locator('.attn-matrix').count();
check('自注意力矩阵图', attnGrid > 0, `${attnGrid}`);
const attnSteps = await page.locator('.attn-steps').count();
check('计算步骤图', attnSteps > 0, `${attnSteps}`);
const posSvg = await page.locator('.pos-svg').count();
check('位置编码图', posSvg > 0, `${posSvg}`);

// 4. 交互：点击注意力行
if (attnGrid > 0) {
  const rows = page.locator('.attn-row');
  const n = await rows.count();
  check('注意力矩阵行数（5 词）', n === 5, `${n} 行`);
  if (n > 0) {
    await rows.nth(1).click();
    await page.waitForTimeout(400);
    const explain = await page.locator('.attn-explain-body').innerText();
    check('点击行有解释', explain.length > 10, explain.slice(0, 30));
  }
}

// 5. 代码 demo
const demos = await page.locator('.demo-box').count();
check('代码 demo 渲染', demos > 0, `${demos} 个`);

// 6. 练习页
await page.goto(`${base}/practice/paper-transformer/paper-transformer-c1`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const pbody = await page.evaluate(() => document.body.innerText);
check('练习页可访问', pbody.includes('Attention') || pbody.includes('注意力'));

check('无 JS 错误', errors.length === 0, errors.slice(0, 2).join(' | '));

await page.screenshot({ path: 'qa/140-paper-attention.png' });
await browser.close();
const pass = checks.filter(Boolean).length;
console.log(`\n结果：${pass}/${checks.length} 通过`);
process.exitCode = pass === checks.length ? 0 : 1;
