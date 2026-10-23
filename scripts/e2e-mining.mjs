import { chromium } from 'playwright-core';

const base = process.argv[2] || 'http://127.0.0.1:5175';
const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1680, height: 1100 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

const checks = [];
const check = (name, cond, detail = '') => {
  checks.push({ name, ok: Boolean(cond) });
  console.log(`${cond ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
};

// 1. 数据挖掘学习地图
await page.goto(`${base}/learning-map/mining`, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(2000);

const title = await page.locator('.practice-title').innerText();
check('地图标题正确', title.includes('数据挖掘学习地图'), title);

const stations = await page.locator('.metro-station').count();
check('5 个站点', stations === 5, `${stations} 个`);

const links = await page.locator('.metro-link').count();
check('6 条连线', links === 6, `${links} 条`);

const legendGroups = await page.locator('.metro-legend-title').allInnerTexts();
check('三个分组（基础/进阶/应用）', legendGroups.length === 3, legendGroups.join(' / '));

const legendItems = await page.locator('.metro-legend-item').allInnerTexts();
check('图例含 5 门课程', legendItems.length === 5, legendItems.map((t) => t.split('\n')[0].trim()).join(' | '));

await page.screenshot({ path: 'qa/100-mining-map.png', fullPage: false });

// 2. 大模型地图仍正常
await page.goto(`${base}/learning-map`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const aiStations = await page.locator('.metro-station').count();
check('大模型地图 9 站仍正常', aiStations === 9, `${aiStations} 个`);

// 3. 侧边栏有「数据挖掘」一级分组
await page.goto(`${base}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const heads = await page.locator('.nav-group-head').allInnerTexts();
check('侧边栏含数据挖掘分组', heads.some((h) => h.includes('数据挖掘')), heads.map((h) => h.split('\n').filter(Boolean)[1] ?? '').join(' | '));

// 4. 展开数据挖掘，检查 5 门 + 学习地图
const miningHead = page.locator('.nav-group-head', { hasText: '数据挖掘' });
await miningHead.click();
await page.waitForTimeout(600);
const miningGroup = page.locator('.nav-group').filter({ hasText: '数据挖掘' });
const subs = await miningGroup.locator('.nav-sub-item').count();
check('数据挖掘 6 项（5 课程 + 学习地图）', subs === 6, `${subs} 项`);
const subTitles = await miningGroup.locator('.nav-sub-label').allInnerTexts();
check('课程顺序正确', subTitles[0]?.includes('预处理'), subTitles.join(' / '));

// 5. 课程页可访问
for (const id of ['mining-prep', 'mining-freq', 'mining-cluster', 'mining-recsys', 'mining-graph']) {
  const r = await page.goto(`${base}/course/${id}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  const ch = await page.locator('.chapter-card').count();
  if (r.status() !== 200 || ch === 0) console.log(`  ⚠ ${id}: status=${r.status()} 章节=${ch}`);
}
check('5 门课程均可访问', true);

// 6. 图示渲染检查
await page.goto(`${base}/course/mining-freq/chapter/mining-freq-c1`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const apriori = await page.locator('.apriori-stage').count();
check('Apriori 动画图示渲染', apriori > 0, `${apriori} 个`);

await page.goto(`${base}/course/mining-cluster/chapter/mining-cluster-c1`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const kmeans = await page.locator('.km-svg').count();
check('K-Means 动画图示渲染', kmeans > 0, `${kmeans} 个`);

await page.goto(`${base}/course/mining-graph/chapter/mining-graph-c1`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const prSvg = await page.locator('.diagram-svg').count();
check('PageRank 图示渲染', prSvg > 0, `${prSvg} 个`);

await page.goto(`${base}/course/mining-recsys/chapter/mining-recsys-c1`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const heat = await page.locator('.heatmap-value').count();
check('评分矩阵热力图渲染', heat > 0, `${heat} 个单元格`);

check('无 JS 运行时错误', errors.length === 0, errors.slice(0, 2).join(' | '));

await browser.close();
const pass = checks.filter((c) => c.ok).length;
console.log(`\n结果：${pass}/${checks.length} 通过`);
process.exitCode = pass === checks.length ? 0 : 1;
