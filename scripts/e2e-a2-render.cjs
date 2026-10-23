const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const kws = [
    '惊喜度', '交叉熵', '困惑度', 'KV Cache', '会议纪要',
    '链式法则', '账单', '梯度消失', 'Xavier', '传话游戏',
    '小批量', '蒙眼下山', '等比数列', '一阶矩', '二阶矩', '老司机', '1412.6980',
  ];
  let fail = 0;
  for (const ch of ['llm-a2-c1', 'llm-a2-c2', 'llm-a2-c3', 'llm-a2-c4']) {
    await page.goto(`http://127.0.0.1:5173/course/llm-a2/chapter/${ch}`, {
      waitUntil: 'networkidle',
      timeout: 90000,
    });
    const body = await page.locator('body').innerText();
    const katex = await page.locator('.katex').count();
    console.log(`${ch} | 字数 ${body.length} | KaTeX ${katex}`);
  }
  // 关键词全课抽查（访问 c1 + c2 两章足够覆盖）
  await page.goto('http://127.0.0.1:5173/course/llm-a2/chapter/llm-a2-c2', { waitUntil: 'networkidle' });
  const body2 = await page.locator('body').innerText();
  await page.goto('http://127.0.0.1:5173/course/llm-a2/chapter/llm-a2-c4', { waitUntil: 'networkidle' });
  const body4 = await page.locator('body').innerText();
  const all = body2 + body4;
  for (const kw of ['链式法则', 'Xavier', '传话游戏', '一阶矩', '老司机', '1412.6980']) {
    const ok = all.includes(kw);
    if (!ok) fail += 1;
    console.log(`  ${ok ? '✓' : '✗ MISSING'}: ${kw}`);
  }
  console.log(errors.length === 0 ? '✓ 无 JS 错误' : '✗ ' + errors[0]);
  await browser.close();
  process.exit(fail || errors.length ? 1 : 0);
})();
