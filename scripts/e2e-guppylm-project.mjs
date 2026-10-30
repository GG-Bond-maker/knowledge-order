import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const base = process.argv[2] || 'http://127.0.0.1:5175';
const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
await page
  .context()
  .grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(base).origin })
  .catch(() => {});
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

const checks = [];
const check = (name, condition, detail = '') => {
  checks.push({ name, ok: Boolean(condition) });
  console.log(`${condition ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const taskTitles = [
  '认识项目',
  '理解训练数据',
  '训练分词器',
  '阅读 Transformer',
  '理解训练过程',
  '运行模型推理',
  '导出并部署模型',
  '完成拓展实验',
];

const taskVisuals = {
  1: 'guppy-pipeline',
  2: 'guppy-data-leak',
  3: 'guppy-tokenizer-diagram',
  4: 'guppy-transformer-diagram',
  5: 'guppy-schedule-figure',
  6: 'guppy-sampling-matrix',
  7: 'guppy-deployment-chain',
  8: 'guppy-experiment-panel',
};

const sectionTestIds = [
  'guppy-section-principle',
  'guppy-section-source',
  'guppy-section-experiment',
  'guppy-section-thinking',
  'guppy-section-extension',
  'guppy-section-acceptance',
];

mkdirSync('qa', { recursive: true });

await page.goto(`${base}/project/guppylm`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(800);
const hasProject = (await page.locator('[data-testid="guppy-project"]').count()) === 1;
check('项目页路由可访问', hasProject, page.url());
check(
  '首次进入保留项目封面位置',
  (await page.evaluate(() => window.scrollY)) === 0,
  `scrollY=${await page.evaluate(() => window.scrollY)}`,
);
const primaryButtonColor = await page
  .locator('.guppy-button-primary')
  .evaluate((element) => getComputedStyle(element).color);
check('主按钮文字对比色正确', primaryButtonColor === 'rgb(255, 255, 255)', primaryButtonColor);
check('页面只有单一主内容地标', (await page.locator('main').count()) === 1);

if (hasProject) {
  const navButtons = page.locator('[data-testid="guppy-task-nav"] button');
  check('任务导航包含 8 项', (await navButtons.count()) === 8, `${await navButtons.count()} 项`);

  const navText = (await navButtons.allInnerTexts()).join('\n');
  for (const title of taskTitles) {
    check(`导航包含「${title}」`, navText.includes(title));
  }

  check('默认进入任务 1', (await page.locator('[data-testid="guppy-task-title"]').innerText()).includes('认识项目'));
  check('默认 URL 带 task=1', page.url().includes('task=1'), page.url().replace(base, ''));
  check('任务 1 流水线图', (await page.getByTestId('guppy-pipeline').count()) > 0);
  await page.screenshot({ path: 'qa/guppylm-desktop-task1.png', fullPage: true });

  for (let task = 1; task <= 8; task += 1) {
    if (task > 1) {
      await navButtons.nth(task - 1).click();
      await page.waitForTimeout(250);
    }

    check(`任务 ${task} URL 正确`, page.url().includes(`task=${task}`), page.url().replace(base, ''));
    check(
      `任务 ${task} 标题正确`,
      (await page.locator('[data-testid="guppy-task-title"]').innerText()).includes(taskTitles[task - 1]),
    );
    check(`任务 ${task} 视觉组件存在`, (await page.getByTestId(taskVisuals[task]).count()) > 0, taskVisuals[task]);

    for (const testId of sectionTestIds) {
      check(`任务 ${task} 包含 ${testId}`, (await page.getByTestId(testId).count()) === 1);
    }

    const svgs = page.locator('[data-testid="guppy-visual"] svg[role="img"]');
    const svgCount = await svgs.count();
    let accessibleSvg = true;
    for (let i = 0; i < svgCount; i += 1) {
      const svg = svgs.nth(i);
      const labelledBy = await svg.getAttribute('aria-labelledby');
      if (!labelledBy) {
        accessibleSvg = false;
        break;
      }
      const ids = labelledBy.split(/\s+/);
      for (const id of ids) {
        if ((await page.locator(`[id="${id}"]`).count()) === 0) {
          accessibleSvg = false;
          break;
        }
      }
      if (!accessibleSvg) break;
    }
    check(`任务 ${task} SVG 可访问`, accessibleSvg, `${svgCount} 个 SVG`);
  }

  await navButtons.nth(1).click();
  await page.waitForTimeout(250);
  check(
    '切换任务后聚焦新标题',
    await page.evaluate(() => document.activeElement?.getAttribute('data-testid') === 'guppy-task-title'),
  );
  const task2Text = await page.locator('[data-testid="guppy-project"]').innerText();
  check('任务 2 显示 77.3% 泄漏率', task2Text.includes('77.3%'));
  check('任务 2 显示 2,320 个重叠样本', task2Text.includes('2,320'));
  check('任务 2 数据泄漏图存在', (await page.getByTestId('guppy-data-leak').count()) > 0);
  await page.screenshot({ path: 'qa/guppylm-desktop-task2.png', fullPage: true });

  await navButtons.nth(2).click();
  await page.waitForTimeout(250);
  const task3Text = await page.locator('[data-testid="guppy-project"]').innerText();
  check('任务 3 显示实际词表 2,418', task3Text.includes('2,418'));
  check('任务 3 显示配置词表 4,096', task3Text.includes('4,096'));
  const tokenizerPanel = page.getByTestId('guppy-tokenizer-diagram');
  const presetButtons = tokenizerPanel.locator('.guppy-preset-row button');
  check('分词器包含 3 个预设', (await presetButtons.count()) === 3, `${await presetButtons.count()} 个`);
  check('分词器默认选中 hi guppy', (await presetButtons.nth(0).getAttribute('aria-pressed')) === 'true');
  await presetButtons.nth(1).click();
  check(
    '分词器可切换到完整 ChatML',
    (await presetButtons.nth(1).getAttribute('aria-pressed')) === 'true' &&
      (await tokenizerPanel.textContent()).includes('10 个 token'),
  );
  await presetButtons.nth(2).click();
  check(
    '分词器可切换到特殊 token',
    (await presetButtons.nth(2).getAttribute('aria-pressed')) === 'true' &&
      (await tokenizerPanel.textContent()).includes('控制消息开始'),
  );

  await navButtons.nth(3).click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'qa/guppylm-desktop-task4.png', fullPage: true });

  await navButtons.nth(7).click();
  await page.waitForTimeout(250);
  const experimentPanel = page.getByTestId('guppy-experiment-panel');
  const experimentButtons = experimentPanel.locator('.guppy-bar-row button');
  check('实验面板包含 6 个参数方案', (await experimentButtons.count()) === 6, `${await experimentButtons.count()} 个`);
  await experimentButtons.nth(2).click();
  check(
    '实验面板可切换到 8 层',
    (await experimentButtons.nth(2).getAttribute('aria-pressed')) === 'true' &&
      (await experimentPanel.innerText()).includes('n_layers=8'),
  );
  await experimentButtons.nth(5).click();
  check(
    '实验面板可切换到序列 256',
    (await experimentButtons.nth(5).getAttribute('aria-pressed')) === 'true' &&
      (await experimentPanel.innerText()).includes('max_seq_len=256'),
  );

  const firstCopyButton = page.locator('.guppy-copy').first();
  await firstCopyButton.click();
  await page.waitForTimeout(100);
  check('代码复制按钮显示成功反馈', (await firstCopyButton.innerText()).includes('已复制'));
  await page.waitForTimeout(1600);
  check('代码复制按钮恢复默认文案', (await firstCopyButton.innerText()).includes('复制代码'));

  await navButtons.nth(1).click();
  await page.waitForTimeout(250);
  const acceptance = page.getByTestId('guppy-acceptance-2-1');
  if ((await acceptance.count()) === 1) {
    await acceptance.check();
    await page.waitForTimeout(150);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(250);
    check('验收进度刷新后保留', await page.getByTestId('guppy-acceptance-2-1').isChecked());
  } else {
    check('验收进度刷新后保留', false, '缺少 guppy-acceptance-2-1');
  }

  await page.goto(`${base}/course/llm-a1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('.course-hero', { timeout: 30000 });
  check('A1 课程页包含项目入口', (await page.locator('a[href="/project/guppylm"]').count()) > 0);

  await page.goto(`${base}/course/llm-a2`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('.course-hero', { timeout: 30000 });
  check('其他课程不误挂 GuppyLM 入口', (await page.locator('a[href="/project/guppylm"]').count()) === 0);

  await page.goto(`${base}/project/guppylm?task=999`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForSelector('[data-testid="guppy-project"]', { timeout: 30000 });
  await page.waitForFunction(() => new URL(window.location.href).searchParams.get('task') === '1');
  check(
    '非法 task 参数回退到任务 1',
    (await page.locator('[data-testid="guppy-task-title"]').innerText()).includes('认识项目'),
  );

  await page.goto(`${base}/project/guppylm?task=7`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('[data-testid="guppy-project"]', { timeout: 30000 });
  await page.waitForTimeout(250);
  check(
    '直接打开 task=7',
    (await page.locator('[data-testid="guppy-task-title"]').innerText()).includes('导出并部署模型'),
  );
  check('任务 7 部署链存在', (await page.getByTestId('guppy-deployment-chain').count()) > 0);
  check(
    '深链接任务聚焦任务标题',
    await page.evaluate(() => document.activeElement?.getAttribute('data-testid') === 'guppy-task-title'),
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/project/guppylm?task=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('[data-testid="guppy-project"]', { timeout: 30000 });
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  check('移动端无页面级横向溢出', overflow.scrollWidth <= overflow.innerWidth + 1, JSON.stringify(overflow));
  await page.screenshot({ path: 'qa/guppylm-mobile-task1.png', fullPage: true });

  await page.goto(`${base}/project/guppylm?task=2`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('[data-testid="guppy-project"]', { timeout: 30000 });
  await page.screenshot({ path: 'qa/guppylm-mobile-task2.png', fullPage: true });

  check('无 JS 运行时错误', errors.length === 0, errors.slice(0, 2).join(' | '));
}

await browser.close();
const pass = checks.filter((item) => item.ok).length;
console.log(`\n结果：${pass}/${checks.length} 通过`);
process.exitCode = pass === checks.length && checks.length > 0 ? 0 : 1;
