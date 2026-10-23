const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const page = await browser.newPage();
  const kws = {
    'stats-foundations-c3': ['相互独立', '完备事件组', '加权平均', '先验', '似然', '16.7%', '自然频数'],
    'stats-foundations-c5': ['经验法则', '68', '标准化', 'erf'],
    'stats-foundations-c7': ['平方根法则', '钟形化', 'Irwin'],
  };
  let fail = 0;
  for (const ch of Object.keys(kws)) {
    await page.goto(`http://127.0.0.1:5173/course/stats-foundations/chapter/${ch}`, {
      waitUntil: 'networkidle',
      timeout: 90000,
    });
    const body = await page.locator('body').innerText();
    const katex = await page.locator('.katex').count();
    console.log(`${ch} | 字数: ${body.length} | KaTeX: ${katex}`);
    for (const kw of kws[ch]) {
      const ok = body.includes(kw);
      if (!ok) fail += 1;
      console.log(`  ${ok ? '✓' : '✗ MISSING'}: ${kw}`);
    }
    const raw = body.includes('\\frac') || body.includes('\\sum');
    if (raw) { fail += 1; console.log('  ✗ 存在未渲染 LaTeX'); }
  }
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
