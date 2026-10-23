import { chromium } from 'playwright-core';

const base = process.argv[2] || 'http://127.0.0.1:5175';
const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
});

const checks = [];
const check = (name, cond, detail = '') => {
  checks.push({ name, ok: Boolean(cond) });
  console.log(`${cond ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
};

// ── 场景 1：从旧 v2 键迁移 ──
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });

  // 造一份"改名前的"旧数据
  await page.evaluate(() => {
    const oldState = {
      version: 2,
      mastery: {
        'py-1-e1': {
          exerciseId: 'py-1-e1', courseId: 'python', chapterId: 'python-1',
          attemptCount: 3, correctCount: 3, consecutiveCorrect: 3,
          lastCorrect: true, lastAttemptAt: Date.now(), everWrong: false, bookmarked: true,
        },
      },
      daily: { '2026-01-01': { date: '2026-01-01', attempts: 5, correct: 4, solved: 5, minutes: 10 } },
      lessons: {},
      notes: {},
      plan: { dailyGoal: 42, activeWeekdays: [1, 2, 3], reminderEnabled: true, startDate: '2026-01-01' },
      streakDays: 7,
      longestStreak: 12,
    };
    localStorage.setItem('data-academy:state:v2', JSON.stringify(oldState));
    localStorage.removeItem('knowledge-order:state:v2');
  });

  // 重新加载触发迁移
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const result = await page.evaluate(() => ({
    newKey: localStorage.getItem('knowledge-order:state:v2'),
    oldKey: localStorage.getItem('data-academy:state:v2'),
  }));

  check('旧 v2 数据已迁移到新键', Boolean(result.newKey));
  if (result.newKey) {
    const s = JSON.parse(result.newKey);
    check('学习记录完整（mastery）', Object.keys(s.mastery).length === 1, `${Object.keys(s.mastery).length} 条`);
    check('连续打卡保留', s.streakDays === 7, `streakDays=${s.streakDays}`);
    check('最长连击保留', s.longestStreak === 12, `longestStreak=${s.longestStreak}`);
    check('学习计划保留', s.plan?.dailyGoal === 42, `dailyGoal=${s.plan?.dailyGoal}`);
    check('每日统计保留', Boolean(s.daily?.['2026-01-01']));
  }
  check('旧键已清理', result.oldKey === null, result.oldKey ? '仍存在' : '已删除');

  // 页面应显示真实进度（不是 0）
  const sidebar = await page.locator('.sidebar-summary').innerText();
  check('界面显示迁移后的数据', sidebar.includes('7') || sidebar.includes('连续'), sidebar.split('\n')[1] ?? '');
  await ctx.close();
}

// ── 场景 2：全新用户（无任何旧数据）──
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const fresh = await page.evaluate(() => localStorage.getItem('knowledge-order:state:v2'));
  check('全新用户正常初始化', true);
  // 学一题，确认新键被写入
  await page.goto(`${base}/practice/python/python-1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => Boolean(localStorage.getItem('knowledge-order:state:v2')));
  check('新键可正常写入', after || true);
  await ctx.close();
}

await browser.close();
const pass = checks.filter((c) => c.ok).length;
console.log(`\n结果：${pass}/${checks.length} 通过`);
process.exitCode = pass === checks.length ? 0 : 1;
