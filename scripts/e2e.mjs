/**
 * 浏览器端到端冒烟测试（使用本机 Chrome + playwright-core）。
 * 用法：node scripts/e2e.mjs [baseUrl]
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://127.0.0.1:5175';
const OUT = 'qa';
mkdirSync(OUT, { recursive: true });

const results = [];
function ok(name, detail = '') {
  results.push({ name, pass: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name, detail) {
  results.push({ name, pass: false, detail });
  console.log(`✗ ${name} — ${detail}`);
}

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR: ${e.message}`));

try {
  // 1. 首页
  await page.goto(`${base}/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('.hero-title', { timeout: 30000 });
  const courseCards = await page.locator('.course-card').count();
  courseCards === 6 ? ok('首页渲染 6 张课程卡片') : fail('首页课程卡片数量异常', `实际 ${courseCards}`);
  await page.screenshot({ path: `${OUT}/01-home.png`, fullPage: false });

  // 2. 课程页
  await page.goto(`${base}/course/python`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.chapter-card');
  const chapters = await page.locator('.chapter-card').count();
  chapters === 6 ? ok('Python 课程页显示 6 个章节') : fail('章节数异常', `实际 ${chapters}`);
  await page.screenshot({ path: `${OUT}/02-course.png`, fullPage: false });

  // 3. 章节学习页 + Markdown 渲染
  await page.goto(`${base}/course/python/chapter/python-1`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.lesson-title');
  const title = await page.locator('.lesson-title').innerText();
  ok('章节学习页打开', title);
  const codeBlocks = await page.locator('.prose pre').count();
  const tables = await page.locator('.prose table').count();
  codeBlocks > 0 ? ok('Markdown 代码块渲染', `${codeBlocks} 个`) : fail('Markdown 代码块未渲染', '0');
  tables > 0 ? ok('Markdown 表格渲染', `${tables} 个`) : fail('Markdown 表格未渲染', '0');
  const tips = await page.locator('.tip').count();
  tips > 0 ? ok('提示条渲染', `${tips} 个`) : fail('提示条未渲染', '0');
  const demos = await page.locator('.demo-box').count();
  demos > 0 ? ok('可运行演示组件渲染', `${demos} 个`) : fail('演示组件未渲染', '0');
  await page.screenshot({ path: `${OUT}/03-lesson.png`, fullPage: false });

  // 4. 运行一个 Python demo（验证 Pyodide）
  console.log('  … 运行 Python demo（首次需加载 Pyodide，约 10~30 秒）');
  const runBtn = page.locator('.demo-box').first().locator('button:has-text("运行")');
  await runBtn.click();
  await page.waitForSelector('.demo-box .out-root, .demo-box .console', { timeout: 180000 });
  const outText = await page.locator('.demo-box').first().locator('.out-root').innerText().catch(() => '');
  outText.includes('执行成功') ? ok('Pyodide 在线运行 Python 成功', outText.split('\n').slice(-1)[0]) : fail('Python demo 运行失败', outText.slice(0, 300));
  await page.screenshot({ path: `${OUT}/04-demo-run.png`, fullPage: false });

  // 5. 练习页：单选题
  await page.goto(`${base}/practice/python/python-1`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.ex-runner');
  const dots = await page.locator('.exercise-dot').count();
  dots >= 10 ? ok('练习页题目导航', `${dots} 题`) : fail('题目数量异常', `${dots}`);
  // 点击第一个选项
  await page.locator('.choice').first().click();
  await page.waitForSelector('.feedback', { timeout: 15000 });
  const fb = await page.locator('.feedback-head').innerText();
  ok('单选题提交后出现判分反馈', fb.replace(/\n/g, ' '));
  await page.screenshot({ path: `${OUT}/05-practice-single.png`, fullPage: false });

  // 6. 切到编程题（第 7 题 = py-1-e7 是 code）
  await page.goto(`${base}/practice/python/python-1`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.exercise-dot');
  // 通过 URL 无法直达题目，改用"下一题"切到编程题
  for (let i = 0; i < 6; i += 1) {
    await page.locator('.ex-foot button:has-text("下一题")').click({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(150);
  }
  const hasCodeEditor = await page.locator('.cm-host').count();
  hasCodeEditor > 0 ? ok('切换到编程题并显示代码编辑器') : fail('未进入编程题', `编辑器数 ${hasCodeEditor}`);
  await page.screenshot({ path: `${OUT}/06-code-question.png`, fullPage: false });

  // 7. 学习统计页
  await page.goto(`${base}/stats`, { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas', { timeout: 30000 });
  const canvases = await page.locator('canvas').count();
  canvases >= 3 ? ok('统计页 ECharts 图表渲染', `${canvases} 个 canvas`) : fail('图表未渲染', `${canvases}`);
  await page.screenshot({ path: `${OUT}/07-stats.png`, fullPage: false });

  // 8. 错题本
  await page.goto(`${base}/review`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.review-layout');
  ok('错题本页面可打开');
  await page.screenshot({ path: `${OUT}/08-review.png`, fullPage: false });

  // 9. 控制台错误检查
  const fatal = consoleErrors.filter((e) => !/favicon|404|Failed to load resource/i.test(e));
  fatal.length === 0 ? ok('无 JS 运行时错误') : fail('控制台存在错误', fatal.slice(0, 3).join(' | '));
} catch (e) {
  fail('测试异常中断', e instanceof Error ? e.message : String(e));
  await page.screenshot({ path: `${OUT}/error.png` }).catch(() => {});
} finally {
  await browser.close();
}

const passed = results.filter((r) => r.pass).length;
console.log(`\n结果：${passed}/${results.length} 通过`);
process.exitCode = passed === results.length ? 0 : 1;
