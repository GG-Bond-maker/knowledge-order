const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const kws = {
    'stats-foundations-c3': ['样本空间', '频率表', '灵敏度', '阳性预测值', '患病率'],
    'stats-foundations-c4': ['重心', '转动惯量', '35/12', '组合数', '0.2461', '双重身份', '递推'],
  };
  let fail = 0;
  for (const ch of Object.keys(kws)) {
    await page.goto(`http://127.0.0.1:5173/course/stats-foundations/chapter/${ch}`, {
      waitUntil: 'networkidle',
      timeout: 90000,
    });
    const body = await page.locator('body').innerText();
    const katex = await page.locator('.katex').count();
    console.log(`${ch} | 字数 ${body.length} | KaTeX ${katex}`);
    for (const kw of kws[ch]) {
      const ok = body.includes(kw);
      if (!ok) fail += 1;
      console.log(`  ${ok ? '✓' : '✗ MISSING'}: ${kw}`);
    }
  }
  console.log(errors.length === 0 ? '✓ 无 JS 错误' : '✗ ' + errors[0]);
  await browser.close();
  process.exit(fail || errors.length ? 1 : 0);
})();
