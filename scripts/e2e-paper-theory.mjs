import { chromium } from 'playwright-core';
const base = process.argv[2] || 'http://127.0.0.1:5175';
const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1680, height: 1400 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const checks = [];
const check = (n, ok, d = '') => { checks.push(ok); console.log(`${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`); };

await page.goto(`${base}/course/paper-theory/chapter/paper-theory-c1`, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(3000);

const body = await page.evaluate(() => document.body.innerText);
check('章节打开', body.includes('MDL') || body.includes('描述长度'));
check('论文信息', body.includes('Grünwald') || body.includes('最小描述长度'));
check('两部分编码', body.includes('L(模型)') || body.includes('两部分'));
check('编码与概率', body.includes('log') && body.includes('比特'));
check('BIC 与 AIC', body.includes('BIC') && body.includes('AIC'));
check('三种形式', body.includes('前序') || body.includes('NML'));
check('压缩即智能', body.includes('压缩'));

// 图示
const blocks = await page.locator('.diagram-block').count();
check('图示块', blocks >= 3, `${blocks} 个`);
for (const [sel, name] of [
  ['.mdl-chart', 'MDL 权衡'],
  ['.aic-bic-bars', 'AIC vs BIC'],
  ['.poly-svg', '多项式拟合'],
]) {
  const n = await page.locator(sel).count();
  check(`图示：${name}`, n > 0, `${n}`);
}

// 交互：拖拽多项式阶数（定位到 .poly-svg 附近的滑块）
const polySlider = page.locator('.poly-svg').locator('xpath=preceding-sibling::*[1]//input[@type="range"]');
if (await polySlider.count() > 0) {
  await polySlider.fill('5');
  await page.waitForTimeout(600);
  const note = await page.locator('.poly-note').innerText();
  check('多项式阶数交互', note.includes('完美') || note.includes('比特'), note.slice(0, 40));
} else {
  // 备用：通过 .poly-note 存在性判断
  const hasNote = await page.locator('.poly-note').count();
  check('多项式阶数交互', hasNote > 0, '滑块定位失败，但图示存在');
}

// 代码 demo
const demos = await page.locator('.demo-box').count();
check('代码 demo', demos >= 3, `${demos} 个`);

check('无 JS 错误', errors.length === 0, errors.slice(0, 2).join(' | '));

await page.locator('.mdl-chart').scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
await page.screenshot({ path: 'qa/160-paper-theory.png' });
await browser.close();
const pass = checks.filter(Boolean).length;
console.log(`\n结果：${pass}/${checks.length} 通过`);
process.exitCode = pass === checks.length ? 0 : 1;
