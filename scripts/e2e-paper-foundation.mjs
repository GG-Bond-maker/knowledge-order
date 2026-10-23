import { chromium } from 'playwright-core';
const base = process.argv[2] || 'http://127.0.0.1:5175';
const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1680, height: 1400 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const checks = [];
const check = (n, ok, d = '') => { checks.push(ok); console.log(`${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`); };

await page.goto(`${base}/course/paper-foundation/chapter/paper-foundation-c1`, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(3000);

const body = await page.evaluate(() => document.body.innerText);
check('章节打开', body.includes('RNN') || body.includes('字符级'));
check('论文信息', body.includes('Karpathy') || body.includes('Unreasonable'));
check('字符级任务', body.includes('下一个字符'));
check('BPTT', body.includes('BPTT') || body.includes('沿时间'));
check('梯度消失', body.includes('梯度消失'));
check('温度采样', body.includes('温度'));
check('LSTM 对比', body.includes('LSTM'));

const blocks = await page.locator('.diagram-block').count();
check('图示块', blocks >= 3, `${blocks} 个`);
for (const [sel, name] of [
  ['.rnn-svg', 'RNN 展开图'],
  ['.vg-svg', '梯度消失图'],
  ['.crnn-stages', '文本生成阶段'],
  ['.temp-bars', '温度采样'],
]) {
  const n = await page.locator(sel).count();
  check(`图示：${name}`, n > 0, `${n}`);
}

// 交互：点击 RNN 时间步
const rnnSteps = page.locator('.rnn-svg circle');
if (await rnnSteps.count() > 0) {
  await rnnSteps.nth(3).click({ force: true });
  await page.waitForTimeout(500);
  const detail = await page.locator('.rnn-detail').innerText();
  check('RNN 时间步交互', detail.includes('tanh'), detail.slice(0, 35));
}

// 交互：温度滑块
const tempSlider = page.locator('.temp-bars').locator('xpath=preceding-sibling::*[1]//input[@type="range"]');
if (await tempSlider.count() > 0) {
  await tempSlider.fill('0.2');
  await page.waitForTimeout(500);
  const note = await page.locator('.temp-note').innerText();
  check('温度滑块交互', note.includes('呆板') || note.includes('确定'), note.slice(0, 35));
}

const demos = await page.locator('.demo-box').count();
check('代码 demo', demos >= 3, `${demos} 个`);
check('无 JS 错误', errors.length === 0, errors.slice(0, 2).join(' | '));

await page.locator('.crnn-stages').scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
await page.screenshot({ path: 'qa/170-paper-foundation.png' });
await browser.close();
const pass = checks.filter(Boolean).length;
console.log(`\n结果：${pass}/${checks.length} 通过`);
process.exitCode = pass === checks.length ? 0 : 1;
