const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const targets = [
    {
      url: 'http://127.0.0.1:5173/course/python/chapter/python-1',
      kws: ['名字标签', '精度陷阱', 'IEEE 754', 'math.isclose', 'Decimal', '银行家舍入', 'is 是'],
    },
    {
      url: 'http://127.0.0.1:5173/course/python/chapter/python-2',
      kws: ['动态数组', '电话簿', '去重袋', '留存率', 'dict.fromkeys', 'O(1)'],
    },
    {
      url: 'http://127.0.0.1:5173/course/llm-a1/chapter/llm-a1-c2',
      kws: [
        '图书馆软检索',
        '多专家会诊',
        '座位牌',
        'RMSNorm',
        '旋转求差角',
        '键值记忆',
        '1910.07467',
        '参数账',
      ],
    },
  ];
  let fail = 0;
  for (const t of targets) {
    await page.goto(t.url, { waitUntil: 'networkidle', timeout: 90000 });
    const body = await page.locator('body').innerText();
    const katex = await page.locator('.katex').count();
    const tables = await page.locator('table').count();
    console.log(`${t.url.split('/').pop()} | 字数 ${body.length} | KaTeX ${katex} | 表格 ${tables}`);
    for (const kw of t.kws) {
      const ok = body.includes(kw);
      if (!ok) fail += 1;
      console.log(`  ${ok ? '✓' : '✗ MISSING'}: ${kw}`);
    }
  }
  const ok = errors.length === 0;
  console.log(`${ok ? '✓' : '✗'} 无 JS 错误 ${ok ? '' : errors.slice(0, 2).join('|')}`);
  await browser.close();
  process.exit(fail || !ok ? 1 : 0);
})();
