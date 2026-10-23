/**
 * 试点渲染验证：打开升级后的 quant-math 章节页，
 * 检查 KaTeX 公式、表格、代码块、Demo 与交互组件真实渲染。
 *
 * 用法：node scripts/e2e-pilot-render.mjs [base]
 * 需先启动 pnpm run dev:all
 */
import { chromium } from 'playwright-core';

const base = process.argv[2] || 'http://127.0.0.1:5173';
const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

const check = (name, cond, detail = '') => {
  console.log(`${cond ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!cond) process.exitCode = 1;
};

const chapters = [
  {
    id: 'quant-math-c1',
    kw: ['实际年利率', '连续复利', '对数收益率', '10832.87', '学习目标', '常见误区', '参考资料'],
    title: '第 1 章 资金时间价值',
  },
  {
    id: 'quant-math-c2',
    kw: ['斯皮尔曼', '肯德尔', '一致对', '0.943', '醉汉与狗'.replace('醉汉与狗', '秩相关'), '皮尔逊看直线'],
    title: '第 2 章 统计推断',
  },
  {
    id: 'quant-math-c3',
    kw: ['弱平稳', '单位根', 'Dickey', '协整', '醉汉', 'Engle', '17,600', '半衰期'],
    title: '第 3 章 时间序列',
  },
];

for (const ch of chapters) {
  await page.goto(`${base}/course/quant-math/chapter/${ch.id}`, {
    waitUntil: 'networkidle',
    timeout: 90000,
  });
  const body = await page.locator('body').innerText();
  check(`${ch.title} 页面打开`, body.length > 3000, `正文 ${body.length} 字`);
  for (const k of ch.kw) check(`  含「${k}」`, body.includes(k));

  const katex = await page.locator('.katex').count();
  check('  KaTeX 公式已渲染', katex > 5, `${katex} 个公式节点`);
  const tables = await page.locator('table').count();
  check('  表格渲染', tables >= 2, `${tables} 个表格`);
  const pre = await page.locator('pre').count();
  check('  代码块渲染', pre >= 1, `${pre} 个 pre 块`);
  // KaTeX 报错检测（渲染失败的原始 $$ 文本）
  const rawDollar = body.includes('$FV =') || body.includes('\\frac{r}{m}');
  check('  无未渲染的原始 LaTeX', !rawDollar);
}

await page.screenshot({ path: 'qa/pilot-c3-render.png', fullPage: false });

// 首页仍正常
await page.goto(`${base}/`, { waitUntil: 'networkidle', timeout: 60000 });
const cards = await page.locator('.course-card').count();
check('首页课程卡片正常', cards >= 6, `${cards} 门`);

check('无页面 JS 错误', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
console.log(process.exitCode ? '渲染验证存在失败项' : '渲染验证全部通过');
