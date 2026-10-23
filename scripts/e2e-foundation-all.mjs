import { chromium } from 'playwright-core';
const base = process.argv[2] || 'http://127.0.0.1:5175';
const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1680, height: 1400 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const checks = [];
const check = (n, ok, d = '') => { checks.push(ok); console.log(`${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`); };

const chapters = [
  ['paper-foundation-c1', 'RNN 惊人有效性', '.rnn-svg'],
  ['paper-foundation-c2', 'LSTM', '.lstm-cell-svg'],
  ['paper-foundation-c3', 'RNN 正则化', '.dropout-rnn'],
  ['paper-foundation-c4', 'Dropout', '.diagram-block'],
];

for (const [id, name, sel] of chapters) {
  await page.goto(`${base}/course/paper-foundation/chapter/${id}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);
  const blocks = await page.locator('.diagram-block').count();
  const target = await page.locator(sel).count();
  const demos = await page.locator('.demo-box').count();
  check(`${id} ${name}`, blocks > 0 && target > 0, `${blocks} 图示，${demos} demo`);
}

// LSTM 门交互
await page.goto(`${base}/course/paper-foundation/chapter/paper-foundation-c2`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const gateBtns = await page.locator('.lstm-gate-btn').count();
if (gateBtns > 0) {
  await page.locator('.lstm-gate-btn').nth(2).click();
  await page.waitForTimeout(400);
  const detail = await page.locator('.lstm-gate-detail').innerText();
  check('LSTM 门切换', detail.includes('tanh') || detail.includes('候选'), detail.slice(0, 30));
}

// LayerNorm 切换
await page.goto(`${base}/course/paper-foundation/chapter/paper-foundation-c3`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const lnTabs = await page.locator('.pattern-tab').count();
if (lnTabs > 0) {
  await page.locator('.pattern-tab').last().click();
  await page.waitForTimeout(400);
  const stats = await page.locator('.ln-stats').innerText();
  check('LayerNorm 切换', stats.includes('1.00') || stats.includes('0.00'), stats.replace(/\n/g, ' ').slice(0, 30));
}

check('无 JS 错误', errors.length === 0, errors.slice(0, 2).join(' | '));
await browser.close();
const pass = checks.filter(Boolean).length;
console.log(`\n结果：${pass}/${checks.length} 通过`);
process.exitCode = pass === checks.length ? 0 : 1;
