import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
// 直接访问首页，确认基础应用正常
await page.goto('http://127.0.0.1:5175/', { timeout: 20000 }).catch(() => {});
await new Promise(r => setTimeout(r, 3000));
try {
  const ok = await Promise.race([
    page.evaluate(() => document.body.innerText.length),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000)),
  ]);
  console.log('首页正常, 文本:', ok);
} catch (e) { console.log('首页也卡:', e.message); }
await browser.close();
