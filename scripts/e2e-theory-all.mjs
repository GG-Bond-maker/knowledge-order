import { chromium } from 'playwright-core';
const base = process.argv[2] || 'http://127.0.0.1:5175';
const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1680, height: 1400 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const checks = [];
const check = (n, ok, d = '') => { checks.push(ok); console.log(`${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`); };

const chapters = [
  ['paper-theory-c1', 'MDL', '.mdl-chart'],
  ['paper-theory-c2', 'MDL 网络', '.diagram-block'],
  ['paper-theory-c3', 'Complexodynamics', '.ec-track'],
  ['paper-theory-c4', '柯尔莫哥洛夫', '.diagram-block'],
];

for (const [id, name, sel] of chapters) {
  await page.goto(`${base}/course/paper-theory/chapter/${id}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);
  const blocks = await page.locator('.diagram-block').count();
  const target = await page.locator(sel).count();
  const demos = await page.locator('.demo-box').count();
  check(`${id} ${name}`, blocks > 0 && target > 0, `${blocks} 图示，${demos} demo`);
}

check('无 JS 错误', errors.length === 0, errors.slice(0, 2).join(' | '));
await browser.close();
const pass = checks.filter(Boolean).length;
console.log(`\n结果：${pass}/${checks.length} 通过`);
process.exitCode = pass === checks.length ? 0 : 1;
