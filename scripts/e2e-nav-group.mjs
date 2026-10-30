import { chromium } from 'playwright-core';

const base = process.argv[2] || 'http://127.0.0.1:5175';
const expectedGroups = [
  '数据分析',
  'Python',
  '数据工程与分析工程',
  '机器学习',
  '人工智能基础-论文导读',
  '数据挖掘',
  'AI 自动化',
  '量化交易',
  'AI 原生软件工程',
  '人工智能 · 大模型',
];
const expectedDataCourses = [
  'Python 数据分析基础',
  'Pandas 数据处理',
  'SQL 数据库查询',
  'Excel 数据处理与分析',
  '数据可视化',
  '数据分析方法论',
  '概率统计：从直觉到推断',
  '因果推断：从问题到可信识别',
];
const expectedLlmItems = [
  '学习地图',
  '深度学习',
  '从零手写大模型',
  '大模型训练原理',
  '从 GPT-2 到 LLaMA',
  'MoE 论文研读',
  '数据工程与语料构建',
  'RAG 检索增强生成',
  'AI Agent 工程',
  '后训练与推理模型',
  '推理与部署工程',
];
const expectedLlmGroups = ['地基', '进阶', '应用'];

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1680, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

const checks = [];
const check = (name, cond, detail = '') => {
  checks.push({ name, ok: Boolean(cond) });
  console.log(`${cond ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
};

const sameItems = (actual, expected) =>
  actual.length === expected.length && actual.every((item, index) => item === expected[index]);
const groupByTitle = (title) =>
  page
    .locator('.nav-group')
    .filter({
      has: page.locator('.nav-group-title', { hasText: new RegExp(`^${title}$`) }),
    })
    .first();

await page.goto(`${base}/`, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForSelector('.sidebar-nav', { timeout: 30000 });

// 1. 一级导航分组完整，且不再依赖固定索引定位
const groupTitles = await page.locator('.nav-group-title').allInnerTexts();
check('一级导航分组与当前课程域完整一致', sameItems(groupTitles, expectedGroups), groupTitles.join(' | '));
check('包含「数据分析」', groupTitles.includes('数据分析'));
check('包含「数据挖掘」', groupTitles.includes('数据挖掘'));
check('包含「人工智能 · 大模型」', groupTitles.includes('人工智能 · 大模型'));

// 2. 侧边栏不再平铺数据分析课程
const flatItems = await page.locator('.sidebar-nav > .nav-item').allInnerTexts();
const hasFlatData = flatItems.some(
  (text) => text.includes('Python 数据分析') || text.includes('Pandas') || text.includes('SQL 数据库'),
);
check(
  '数据分析课程不再平铺在侧边栏',
  !hasFlatData,
  `平铺项: ${flatItems
    .map((text) => text.split('\n')[1] ?? '')
    .filter(Boolean)
    .join(', ')}`,
);

// 3. 按标题展开「数据分析」，校验完整课程清单
const dataGroup = groupByTitle('数据分析');
await dataGroup.locator('.nav-group-head').click();
await page.waitForTimeout(300);
const dataTitles = await dataGroup.locator('.nav-sub-label').allInnerTexts();
check('数据分析展开后课程清单完整', sameItems(dataTitles, expectedDataCourses), dataTitles.join(' / '));
for (const required of ['Python', 'Pandas', 'SQL', 'Excel', '可视化', '方法论']) {
  check(
    `包含 ${required}`,
    dataTitles.some((title) => title.includes(required)),
  );
}

// 4. 按标题展开「人工智能 · 大模型」，校验课程与三级分组
const llmGroup = groupByTitle('人工智能 · 大模型');
await llmGroup.locator('.nav-group-head').click();
await page.waitForTimeout(300);
const llmMapTitles = await llmGroup.locator('.nav-sub-map').allInnerTexts();
const llmCourseTitles = await llmGroup.locator('.nav-sub-label').allInnerTexts();
const llmItems = [...llmMapTitles.map((text) => text.split('\n')[0].trim()), ...llmCourseTitles];
const llmGroups = await llmGroup.locator('.nav-sub-group-title').allInnerTexts();
check('大模型展开后学习地图与课程清单完整', sameItems(llmItems, expectedLlmItems), llmItems.join(' / '));
check('大模型三级分组仍在', sameItems(llmGroups, expectedLlmGroups), llmGroups.join(' / '));

await page.screenshot({
  path: 'qa/90-nav-data.png',
  clip: { x: 0, y: 0, width: 300, height: 1080 },
});

// 5. 点击数据分析子课程能正常跳转
await dataGroup.locator('.nav-sub-item').first().click();
await page.waitForTimeout(1000);
const url = page.url();
check('点击子课程可跳转', url.includes('/course/'), url.replace(base, ''));
const chapterCards = await page.locator('.chapter-card').count();
check('课程页正常渲染', chapterCards > 0, `${chapterCards} 章`);

// 6. 刷新课程页，验证默认展开与高亮不是上一次点击残留的本地状态
await page.reload({ waitUntil: 'networkidle', timeout: 90000 });
await page.waitForSelector('.sidebar-nav', { timeout: 30000 });
const dataGroupAfter = groupByTitle('数据分析');
const headClass = await dataGroupAfter.locator('.nav-group-head').getAttribute('class');
const groupClass = await dataGroupAfter.getAttribute('class');
const subsVisible = await dataGroupAfter.locator('.nav-sub-label').count();
check(
  '数据分析分组刷新后自动展开并高亮',
  (headClass ?? '').includes('active') &&
    (groupClass ?? '').split(/\s+/).includes('open') &&
    subsVisible === expectedDataCourses.length,
  `class=${groupClass ?? ''}; head=${headClass ?? ''}; ${subsVisible} 项`,
);

// 7. 算法等其它课程仍在顶层
const otherTop = await page.locator('.sidebar-nav > .nav-item').allInnerTexts();
check(
  '算法课程仍在顶层平铺',
  otherTop.some((text) => text.includes('算法')),
  otherTop
    .map((text) => text.split('\n')[1] ?? '')
    .filter(Boolean)
    .join(', '),
);

check('无 JS 运行时错误', errors.length === 0, errors.slice(0, 2).join(' | '));

await browser.close();
const pass = checks.filter((item) => item.ok).length;
console.log(`\n结果：${pass}/${checks.length} 通过`);
process.exitCode = pass === checks.length ? 0 : 1;
