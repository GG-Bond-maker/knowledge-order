import { chromium } from 'playwright-core';
const base = process.argv[2] || 'http://127.0.0.1:5175';
const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1680, height: 1200 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const checks = [];
const check = (n, ok, d = '') => { checks.push(ok); console.log(`${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`); };

await page.goto(`${base}/course/ai-auto-m3/chapter/ai-auto-m3-c5`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2500);

const body = await page.evaluate(() => document.body.innerText);
check('页面可访问', body.includes('案例库') || body.includes('企业案例'), body.slice(0, 50).replace(/\n/g, ' '));
check('含案例 1（RPA 规模化）', body.includes('RPA') && body.includes('财务共享'));
check('含案例 2（发票 OCR）', body.includes('95%') || body.includes('准确率'));
check('含案例 5（流程挖掘）', body.includes('流程挖掘'));
check('含案例 6（多 Agent）', body.includes('多 Agent') || body.includes('多Agent'));
check('含来源标注', body.includes('arXiv') || body.includes('来源'));
check('含诚信声明', body.includes('诚信') || body.includes('不确定性') || body.includes('待核实'));

// 代码 demo 渲染
const codeBlocks = await page.locator('.cm-editor, .demo-box').count();
check('代码 demo 渲染', codeBlocks > 0, `${codeBlocks} 个代码块`);

// 侧边栏有 5 章
const lessons = await page.locator('.chapter-toc a, .lesson-nav a, .toc-chapter-title').count();
check('章节列表渲染', lessons > 0, `${lessons} 项`);

check('无 JS 错误', errors.length === 0, errors.slice(0, 2).join(' | '));

await page.screenshot({ path: 'qa/130-m3-c5-cases.png' });
await browser.close();
const pass = checks.filter(Boolean).length;
console.log(`\n结果：${pass}/${checks.length} 通过`);
process.exitCode = pass === checks.length ? 0 : 1;
