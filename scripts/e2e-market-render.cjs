const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const page = await browser.newPage();
  const kws = {
    'quant-market-c2': ['OHLCV', '有损', 'Dollar Bar', '信息驱动'],
    'quant-market-c3': ['印花税', '证券市场线', '维持担保比例', '轧空', 'GameStop'],
  };
  let fail = 0;
  for (const ch of Object.keys(kws)) {
    await page.goto(`http://127.0.0.1:5173/course/quant-market/chapter/${ch}`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });
    const body = await page.locator('body').innerText();
    const katex = await page.locator('.katex').count();
    const tables = await page.locator('table').count();
    console.log(`${ch} | 字数: ${body.length} | KaTeX: ${katex} | 表格: ${tables}`);
    for (const kw of kws[ch]) {
      const ok = body.includes(kw);
      if (!ok) fail += 1;
      console.log(`  ${ok ? '✓' : '✗ MISSING'}: ${kw}`);
    }
  }
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
