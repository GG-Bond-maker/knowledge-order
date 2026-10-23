import { chromium } from 'playwright-core';
const base = process.argv[2] || 'http://127.0.0.1:5175';
const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1680, height: 1100 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const checks = [];
const check = (n, ok, d = '') => { checks.push(ok); console.log(`${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`); };

const chapters = [
  ['ai-auto-m4-c1', '代码生成', '.diagram-block'],
  ['ai-auto-m4-c2', '自动化测试', '.diagram-block'],
  ['ai-auto-m4-c3', '代码审查', '.diagram-block'],
  ['ai-auto-m4-c4', '文档处理', '.diagram-block'],
  ['ai-auto-m5-c1', '评估体系', '.eval-levels'],
  ['ai-auto-m5-c2', '可观测性', '.trace-chart'],
  ['ai-auto-m5-c3', '安全护栏', '.defense-layers'],
];

for (const [id, name, sel] of chapters) {
  const course = id.split('-').slice(0, 3).join('-');
  await page.goto(`${base}/course/${course}/chapter/${id}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2200);
  const blocks = await page.locator('.diagram-block').count();
  const target = await page.locator(sel).count();
  check(`${id} ${name}`, blocks > 0, `${blocks} 图示块${target > 0 ? '，目标组件已渲染' : ''}`);
}

// 交互：评估层切换
await page.goto(`${base}/course/ai-auto-m5/chapter/ai-auto-m5-c1`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const levels = await page.locator('.eval-level').count();
if (levels > 0) {
  await page.locator('.eval-level').nth(2).click();
  await page.waitForTimeout(500);
  const detail = await page.locator('.eval-detail').innerText();
  check('评估层切换交互', detail.includes('轨迹') || detail.includes('过程'), detail.slice(0, 25));
}

check('无 JS 错误', errors.length === 0, errors.slice(0, 2).join(' | '));
await browser.close();
const pass = checks.filter(Boolean).length;
console.log(`\n结果：${pass}/${checks.length} 通过`);
process.exitCode = pass === checks.length ? 0 : 1;
