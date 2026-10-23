import { chromium } from 'playwright-core';
const base = process.argv[2] || 'http://127.0.0.1:5175';
const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1680, height: 1100 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const checks = [];
const check = (n, ok, d = '') => { checks.push(ok); console.log(`${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`); };

for (const [id, name, sel] of [
  ['ai-auto-m3-c1', 'RPA 三层结构', '.rpa-layers'],
  ['ai-auto-m3-c2', '文档流水线', '.doc-pipeline'],
  ['ai-auto-m3-c3', '工作流画布', '.topology-svg'],
  ['ai-auto-m3-c4', '权限矩阵', '.perm-table'],
]) {
  await page.goto(`${base}/course/ai-auto-m3/chapter/${id}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2200);
  const blocks = await page.locator('.diagram-block').count();
  const target = await page.locator(sel).count();
  check(`${id} ${name}`, blocks > 0 && target > 0, `${blocks} 图示块，目标组件 ${target}`);
}

// 交互测试
await page.goto(`${base}/course/ai-auto-m3/chapter/ai-auto-m3-c2`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const slider = await page.locator('.conf-slider').count();
if (slider > 0) {
  await page.locator('.conf-slider').fill('0.99');
  await page.waitForTimeout(400);
  const result = await page.locator('.conf-result').innerText();
  check('置信度滑块交互', result.includes('全自动'), result.trim().slice(0, 30));
}

check('无 JS 错误', errors.length === 0, errors.slice(0, 2).join(' | '));
await browser.close();
const pass = checks.filter(Boolean).length;
console.log(`\n结果：${pass}/${checks.length} 通过`);
process.exitCode = pass === checks.length ? 0 : 1;
