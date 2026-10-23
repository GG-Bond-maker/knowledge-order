#!/usr/bin/env node
/**
 * 全站健康检查：遍历所有课程的所有章节，验证页面能正常渲染。
 *
 * 用法：node scripts/health-check-all.mjs [baseUrl] [--course=xxx]
 */

import { chromium } from 'playwright-core';
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.argv[2] || 'http://127.0.0.1:5175';
const onlyCourse = (process.argv.find((a) => a.startsWith('--course=')) || '').split('=')[1];

const COURSE_DIR = 'content-data/courses';
const files = readdirSync(COURSE_DIR).filter((f) => f.endsWith('.json'));

// 读取所有课程
const courses = [];
for (const f of files) {
  const d = JSON.parse(readFileSync(join(COURSE_DIR, f), 'utf8'));
  if (onlyCourse && d.id !== onlyCourse) continue;
  courses.push({
    id: d.id,
    title: d.title,
    domainId: d.domainId,
    chapters: (d.chapters || []).map((c) => ({ id: c.id, title: c.title, exercises: (c.exercises || []).length })),
  });
}

console.log(`准备检查 ${courses.length} 门课程，共 ${courses.reduce((s, c) => s + c.chapters.length, 0)} 章\n`);

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });

const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 200)));
page.on('console', (m) => {
  if (m.type() === 'error') {
    const t = m.text();
    // 忽略资源 404（如 favicon）
    if (!/Failed to load resource/.test(t)) consoleErrors.push(t.slice(0, 200));
  }
});

const results = [];
let done = 0;
const total = courses.reduce((s, c) => s + c.chapters.length, 0);
const startedAt = Date.now();

for (const course of courses) {
  const courseResult = { id: course.id, title: course.title, chapters: [], ok: true };

  for (const ch of course.chapters) {
    pageErrors.length = 0;
    consoleErrors.length = 0;

    const url = `${BASE}/course/${course.id}/chapter/${ch.id}`;
    let status = 'ok';
    let detail = '';

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(1400);

      const info = await Promise.race([
        page.evaluate(() => ({
          textLen: document.body.innerText.length,
          diagrams: document.querySelectorAll('.diagram-block').length,
          demos: document.querySelectorAll('.demo-box').length,
          exercises: document.querySelectorAll('[class*="exercise"]').length,
          // 注意：不能只用裸 "404" 判断——论文 arXiv 编号（如 2404.16130）会误判
          hasError: /页面不存在|未找到该章节|Something went wrong|加载失败|Chapter not found/.test(document.body.innerText),
        })),
        new Promise((_, rej) => setTimeout(() => rej(new Error('evaluate timeout')), 8000)),
      ]);

      if (info.hasError) {
        status = 'error';
        detail = '页面显示错误文案';
      } else if (info.textLen < 200) {
        status = 'error';
        detail = `文本过少 (${info.textLen})`;
      } else {
        detail = `${info.textLen} 字符, ${info.diagrams} 图示, ${info.demos} demo`;
      }

      if (pageErrors.length > 0) {
        status = 'error';
        detail += ` | JS错误: ${pageErrors[0]}`;
      }
    } catch (e) {
      status = 'error';
      detail = String(e.message || e).slice(0, 120);
    }

    if (status !== 'ok') courseResult.ok = false;
    courseResult.chapters.push({ id: ch.id, title: ch.title, status, detail, exercises: ch.exercises });

    done += 1;
    const mark = status === 'ok' ? '✓' : '✗';
    const pct = ((done / total) * 100).toFixed(0);
    console.log(`[${pct}%] ${mark} ${course.id}/${ch.id}${status !== 'ok' ? ' — ' + detail : ''}`);
  }

  results.push(courseResult);
}

await browser.close();

// 汇总
const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
const failed = results.filter((c) => !c.ok);
const totalChapters = results.reduce((s, c) => s + c.chapters.length, 0);
const okChapters = results.reduce((s, c) => s + c.chapters.filter((x) => x.status === 'ok').length, 0);

console.log('\n' + '='.repeat(70));
console.log('健康检查汇总');
console.log('='.repeat(70));
console.log(`课程：${results.length} 门（${results.length - failed.length} 正常 / ${failed.length} 有问题）`);
console.log(`章节：${totalChapters} 章（${okChapters} 正常 / ${totalChapters - okChapters} 有问题）`);
console.log(`耗时：${elapsed}s`);

if (failed.length) {
  console.log('\n有问题的课程：');
  for (const c of failed) {
    console.log(`\n  ${c.id} (${c.title})`);
    for (const ch of c.chapters.filter((x) => x.status !== 'ok')) {
      console.log(`    ✗ ${ch.id}: ${ch.detail}`);
    }
  }
}

// 保存报告
mkdirSync('qa', { recursive: true });
const report = {
  timestamp: new Date().toISOString(),
  base: BASE,
  summary: { courses: results.length, failedCourses: failed.length, chapters: totalChapters, okChapters, elapsedSec: Number(elapsed) },
  results,
};
writeFileSync('qa/health-check.json', JSON.stringify(report, null, 2));
console.log('\n报告已保存到 qa/health-check.json');

process.exitCode = failed.length === 0 ? 0 : 1;
