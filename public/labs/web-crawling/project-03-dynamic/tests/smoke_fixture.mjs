import { chromium } from 'playwright-core';

const base = process.env.FIXTURE_URL ?? 'http://127.0.0.1:18080/';
const executablePath =
  process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext();
const page = await context.newPage();

try {
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 5000 });
  await page.locator('[data-app-state="ready"]').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('article[data-item-id]').first().waitFor({ state: 'visible', timeout: 5000 });

  const list = page.locator('[data-role="item-list"]');
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const previous = await page.locator('article[data-item-id]').count();
    if (previous >= 9) break;
    await list.evaluate((element) => element.scrollTo(0, element.scrollHeight));
    await page.waitForFunction(
      (previous) => document.querySelectorAll('article[data-item-id]').length > previous,
      previous,
      { timeout: 5000 },
    );
  }

  await page.locator('[data-batch-marker="3"]').waitFor({ state: 'attached', timeout: 5000 });
  const rows = await page.locator('article[data-item-id]').evaluateAll((nodes) =>
    nodes.map((node) => ({
      id: node.dataset.itemId,
      title: node.querySelector('h2').textContent.trim(),
      batch: Number(node.dataset.batch),
    })),
  );
  const ids = rows.map((row) => row.id);
  if (rows.length !== 9 || new Set(ids).size !== 9) {
    throw new Error(`expected 9 unique rows, got ${rows.length}/${new Set(ids).size}`);
  }
  if (ids[0] !== 'D001' || ids.at(-1) !== 'D009') {
    throw new Error(`unexpected id order: ${ids.join(',')}`);
  }
  console.log(`fixture smoke: 9 unique rows, batches=${[...new Set(rows.map((row) => row.batch))]}`);
} finally {
  await context.close();
  await browser.close();
}
