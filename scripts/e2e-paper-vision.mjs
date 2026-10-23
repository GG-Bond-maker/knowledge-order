import { chromium } from 'playwright-core';
const base = process.argv[2] || 'http://127.0.0.1:5175';
const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1680, height: 1400 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const checks = [];
const check = (n, ok, d = '') => { checks.push(ok); console.log(`${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`); };

await page.goto(`${base}/course/paper-vision/chapter/paper-vision-c1`, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(3000);

const body = await page.evaluate(() => document.body.innerText);
check('章节打开', body.includes('AlexNet'));
check('论文信息', body.includes('1207.0580') || body.includes('Krizhevsky'));
check('三个条件', body.includes('数据') && body.includes('算力') && body.includes('算法'));
check('端到端学习', body.includes('端到端'));
check('参数分布', body.includes('96%') || body.includes('全连接'));
check('五个技巧', body.includes('ReLU') && body.includes('Dropout') && body.includes('数据增强'));
check('LRN 已淘汰', body.includes('LRN'));
check('输出公式', body.includes('padding') || body.includes('stride'));

// 图示
const blocks = await page.locator('.diagram-block').count();
check('图示块', blocks >= 4, `${blocks} 个`);
for (const [sel, name] of [
  ['.fe-compare', '特征工程对比'],
  ['.cond-row', '三条件'],
  ['.alex-arch', 'AlexNet 架构'],
  ['.param-bars', '参数分布'],
  ['.activation-svg', '激活函数对比'],
]) {
  const n = await page.locator(sel).count();
  check(`图示：${name}`, n > 0, `${n}`);
}

// 交互
const alexLayers = await page.locator('.alex-layer').count();
if (alexLayers > 0) {
  await page.locator('.alex-layer').nth(5).click();
  await page.waitForTimeout(400);
  const detail = await page.locator('.alex-detail').innerText();
  check('AlexNet 层点击交互', detail.length > 5, detail.slice(0, 30));
}

// 代码 demo
const demos = await page.locator('.demo-box').count();
check('代码 demo', demos >= 3, `${demos} 个`);

check('无 JS 错误', errors.length === 0, errors.slice(0, 2).join(' | '));

await page.locator('.param-bars').scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
await page.screenshot({ path: 'qa/150-paper-vision.png' });
await browser.close();
const pass = checks.filter(Boolean).length;
console.log(`\n结果：${pass}/${checks.length} 通过`);
process.exitCode = pass === checks.length ? 0 : 1;
