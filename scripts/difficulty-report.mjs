/**
 * 章节难度与题量分布报告：按章节列出题量、难度分级、知识点数。
 * 用法：node scripts/difficulty-report.mjs
 */
import { build } from 'esbuild';
import { mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = join(root, '.tmp-diff');
mkdirSync(tmp, { recursive: true });
await build({
  entryPoints: [join(root, 'src/content/index.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: join(tmp, 'content.mjs'),
  logLevel: 'error',
  define: { 'import.meta.env': '{}' },
});
const { COURSES } = await import(pathToFileURL(join(tmp, 'content.mjs')).href);

const width = (s) => [...String(s)].reduce((w, c) => w + (c.charCodeAt(0) > 255 ? 2 : 1), 0);
const pad = (s, n, right = false) => {
  const gap = Math.max(0, n - width(s));
  return right ? ' '.repeat(gap) + s : s + ' '.repeat(gap);
};

let grand = 0;
for (const c of COURSES) {
  console.log(`\n【${c.title}】`);
  console.log(pad('章节', 30) + pad('知识点', 8, true) + pad('题量', 6, true) + pad('基础', 6, true) + pad('进阶', 6, true) + pad('挑战', 6, true) + '   难度均值');
  for (const ch of c.chapters) {
    const exs = ch.exercises;
    const basic = exs.filter((e) => e.difficulty <= 2).length;
    const adv = exs.filter((e) => e.difficulty === 3).length;
    const chal = exs.filter((e) => e.difficulty >= 4).length;
    const mean = exs.length ? (exs.reduce((s, e) => s + e.difficulty, 0) / exs.length).toFixed(2) : '-';
    grand += exs.length;
    console.log(
      pad(ch.title.slice(0, 14), 30) +
        pad(String(ch.lessons.length), 8, true) +
        pad(String(exs.length), 6, true) +
        pad(String(basic), 6, true) +
        pad(String(adv), 6, true) +
        pad(String(chal), 6, true) +
        `   ${mean}`,
    );
  }
}
console.log(`\n总计 ${grand} 道习题`);
rmSync(tmp, { recursive: true, force: true });
