/**
 * 通过 esbuild 打包课程内容模块，再在 Node 中 require 执行，得到真实的结构统计。
 * 用法：node scripts/content-audit.mjs
 */
import { build } from 'esbuild';
import { mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, '.tmp-audit');
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, 'content.mjs');

await build({
  entryPoints: [join(root, 'src/content/index.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: outFile,
  logLevel: 'error',
  define: { 'import.meta.env': '{}' },
  external: [],
});

const mod = await import(pathToFileURL(outFile).href);
const { COURSES, validateContent } = mod;

const TYPE_LABEL = {
  single: '单选',
  multiple: '多选',
  judge: '判断',
  fill: '填空',
  code: '编程',
  sql: 'SQL',
  open: '简答',
};

let totalCh = 0;
let totalLesson = 0;
let totalEx = 0;
const grandTypes = {};
const rows = [];

for (const c of COURSES) {
  const types = {};
  let lessons = 0;
  let exercises = 0;
  for (const ch of c.chapters) {
    lessons += ch.lessons.length;
    exercises += ch.exercises.length;
    for (const e of ch.exercises) types[e.type] = (types[e.type] ?? 0) + 1;
  }
  Object.entries(types).forEach(([k, v]) => (grandTypes[k] = (grandTypes[k] ?? 0) + v));
  totalCh += c.chapters.length;
  totalLesson += lessons;
  totalEx += exercises;
  rows.push({ title: c.title, chapters: c.chapters.length, lessons, exercises, types });
}

const pad = (s, n, right = false) => {
  // 中文按 2 个宽度计算
  const width = (str) => [...str].reduce((w, ch) => w + (ch.charCodeAt(0) > 255 ? 2 : 1), 0);
  const gap = Math.max(0, n - width(s));
  return right ? ' '.repeat(gap) + s : s + ' '.repeat(gap);
};

console.log('\n课程规模统计');
console.log('─'.repeat(96));
console.log(pad('课程', 22) + pad('章节', 6, true) + pad('知识点', 8, true) + pad('习题', 6, true) + '   题型分布');
for (const r of rows) {
  const dist = Object.entries(r.types)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${TYPE_LABEL[k] ?? k}${v}`)
    .join(' · ');
  console.log(
    pad(r.title, 22) + pad(String(r.chapters), 6, true) + pad(String(r.lessons), 8, true) + pad(String(r.exercises), 6, true) + '   ' + dist,
  );
}
console.log('─'.repeat(96));
console.log(
  `合计：${COURSES.length} 门课程 · ${totalCh} 章 · ${totalLesson} 个知识点 · ${totalEx} 道习题`,
);
console.log(
  '题型合计：' + Object.entries(grandTypes).map(([k, v]) => `${TYPE_LABEL[k] ?? k} ${v}`).join(' · '),
);

const errors = validateContent();
console.log('');
if (errors.length) {
  console.log(`⚠ 内容校验发现 ${errors.length} 个问题：`);
  errors.slice(0, 30).forEach((e) => console.log('  - ' + e));
  process.exitCode = 1;
} else {
  console.log('✓ 内容校验通过（id 唯一、必填字段齐全）');
}

// 额外体检：每题是否有解析、选择题答案是否在选项中
const issues = [];
for (const c of COURSES) {
  for (const ch of c.chapters) {
    for (const e of ch.exercises) {
      if (!e.explanation) issues.push(`${e.id} 缺少 explanation`);
      if (e.type === 'single' && !e.options.some((o) => o.value === e.answer)) issues.push(`${e.id} 单选答案不在选项中`);
      if (e.type === 'multiple') {
        const bad = e.answer.filter((a) => !e.options.some((o) => o.value === a));
        if (bad.length) issues.push(`${e.id} 多选答案 ${bad.join(',')} 不在选项中`);
        if (!e.answer.length) issues.push(`${e.id} 多选答案为空`);
      }
      if (e.type === 'fill' && (!e.blanks || !e.blanks.length)) issues.push(`${e.id} 填空缺少答案`);
      if (e.type === 'code' && !e.tests) issues.push(`${e.id} 编程题缺少测试`);
      if (e.type === 'sql' && !e.referenceSql) issues.push(`${e.id} SQL 题缺少参考查询`);
    }
  }
}
if (issues.length) {
  console.log(`\n⚠ 题目体检发现 ${issues.length} 个问题：`);
  issues.slice(0, 30).forEach((i) => console.log('  - ' + i));
} else {
  console.log('✓ 题目体检通过（解析齐全、答案合法）');
}

rmSync(outDir, { recursive: true, force: true });
