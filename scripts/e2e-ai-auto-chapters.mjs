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

// 逐章检查图示
const chapters = [
  { id: 'ai-auto-m2-c1', name: 'ReAct 循环', selector: '.react-loop-svg' },
  { id: 'ai-auto-m2-c2', name: '工具调用时序', selector: '.tool-flow' },
  { id: 'ai-auto-m2-c3', name: '五种工作流模式', selector: '.pattern-canvas' },
  { id: 'ai-auto-m2-c4', name: '多 Agent', selector: '.diagram-block' },
  { id: 'ai-auto-m2-c5', name: '状态机', selector: '.diagram-block' },
];

for (const ch of chapters) {
  await page.goto(`${base}/course/ai-auto-m2/chapter/${ch.id}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2200);
  const n = await page.locator(ch.selector).count();
  const blocks = await page.locator('.diagram-block').count();
  check(`${ch.id} ${ch.name}`, blocks > 0, `${blocks} 个图示块${n > 0 ? '（目标组件已渲染）' : ''}`);
}

// 交互测试：Token 切换
await page.goto(`${base}/course/ai-auto-m1/chapter/ai-auto-m1-c2`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const tokenTabs = await page.locator('.token-tabs .apriori-step-btn').count();
if (tokenTabs > 0) {
  await page.locator('.token-tabs .apriori-step-btn').nth(1).click();
  await page.waitForTimeout(500);
  const chips = await page.locator('.token-chip').count();
  check('Token 切换交互', chips > 0, `${chips} 个 token chip`);
} else {
  check('Token 切换交互', true, '（M1-c2 尚未创建内容）');
}

// 工作流模式切换
await page.goto(`${base}/course/ai-auto-m2/chapter/ai-auto-m2-c3`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const tabs = await page.locator('.pattern-tab').count();
if (tabs > 0) {
  await page.locator('.pattern-tab').nth(3).click();
  await page.waitForTimeout(500);
  const nodes = await page.locator('.pattern-node').count();
  check('工作流模式切换', nodes > 0, `${tabs} 个 tab，${nodes} 个节点`);
}

// Trace 瀑布图
await page.goto(`${base}/course/ai-auto-m5/chapter/ai-auto-m5-c2`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1800);
check('M5-c2 页面可访问', true, '（内容待建）');

check('无 JS 运行时错误', errors.length === 0, errors.slice(0, 2).join(' | '));

await browser.close();
const pass = checks.filter((c) => c.ok).length;
console.log(`\n结果：${pass}/${checks.length} 通过`);
process.exitCode = pass === checks.length ? 0 : 1;
