import { chromium } from 'playwright-core';

const base = process.argv[2] || 'http://127.0.0.1:5175';
const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1680, height: 1200 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

const checks = [];
const check = (name, cond, detail = '') => {
  checks.push({ name, ok: Boolean(cond) });
  console.log(`${cond ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
};

/** 打开某课程某章，遍历小节统计图示 */
async function scanChapter(course, chapter, expectAtLeast) {
  await page.goto(`${base}/course/${course}/chapter/${chapter}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1800);
  let maxBlocks = 0;
  let maxSvg = 0;
  let kinds = new Set();
  for (let i = 0; i < 6; i += 1) {
    const s = await page.evaluate(() => {
      const blocks = Array.from(document.querySelectorAll('.diagram-block'));
      const titles = blocks.map((b) => b.querySelector('.diagram-title')?.textContent ?? '');
      return { n: blocks.length, svg: document.querySelectorAll('.diagram-svg').length, titles };
    });
    if (s.n > maxBlocks) {
      maxBlocks = s.n;
      maxSvg = s.svg;
      s.titles.forEach((t) => t && kinds.add(t.slice(0, 24)));
    }
    const next = page.locator('a:has-text("下一节"), button:has-text("下一节")').first();
    if ((await next.count()) === 0) break;
    await next.click();
    await page.waitForTimeout(1000);
  }
  check(`${course}/${chapter} 图示渲染`, maxBlocks >= expectAtLeast, `${maxBlocks} 个图示块 / ${maxSvg} SVG`);
  if (kinds.size) console.log(`     类型: ${[...kinds].join(' | ')}`);
  return maxBlocks;
}

// 1. B1 RAG —— 应引用了 rag-pipeline
await scanChapter('llm-b1', 'llm-b1-c1', 1);

// 2. B2 Agent —— 应引用了 react-loop
await scanChapter('llm-b2', 'llm-b2-c2', 1);

// 3. SQL JOIN 图
const sqlN = await scanChapter('sql', 'sql-4', 1);

// 4. Pandas 索引图
const pdN = await scanChapter('pandas', 'pandas-2-2', 1);

// 5. 算法二分树
const algoN = await scanChapter('algo', 'algo-1', 1);
const algoN2 = await scanChapter('algo', 'algo-2', 1);

// 6. A2 学习率曲线
const a2N = await scanChapter('llm-a2', 'llm-a2-c5', 1);

// 7. Excel 透视表
const excelN = await scanChapter('excel', 'excel-4', 1);

// 8. 检查是否有"未找到图示"的报错渲染
const missing = await page.evaluate(() => document.querySelectorAll('.diagram-missing').length);
check('无"未找到图示"错误', missing === 0, `${missing} 处`);

// 9. 截图留档
await page.goto(`${base}/course/sql/chapter/sql-4`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await page.screenshot({ path: 'qa/95-sql-join.png' });
await page.goto(`${base}/course/pandas/chapter/pandas-2-2`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await page.screenshot({ path: 'qa/96-pandas-index.png' });
await page.goto(`${base}/course/llm-b1/chapter/llm-b1-c1`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await page.screenshot({ path: 'qa/97-rag-pipeline.png' });

check('无 JS 运行时错误', errors.length === 0, errors.slice(0, 2).join(' | '));

await browser.close();
const pass = checks.filter((c) => c.ok).length;
console.log(`\n结果：${pass}/${checks.length} 通过`);
process.exitCode = pass === checks.length ? 0 : 1;
