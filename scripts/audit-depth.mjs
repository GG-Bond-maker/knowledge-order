/**
 * 内容深度盘点：逐课程/章节统计知识点数量、正文长度、图示数量、题型分布。
 * 用于与权威课程大纲对比。
 */
import { build } from 'esbuild';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const tmp = join(root, '.tmp-audit-deep');
mkdirSync(tmp, { recursive: true });
const outFile = join(tmp, 'c.mjs');
await build({
  entryPoints: [join(root, 'src/content/index.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: outFile,
  logLevel: 'error',
  define: { 'import.meta.env': '{}' },
});
const { COURSES } = await import(pathToFileURL(outFile).href);
rmSync(tmp, { recursive: true, force: true });

const DIAGRAM_RE = /<(Diagram|TensorFlow|Heatmap|Slider|JoinDiagram|IndexDiagram|PivotDiagram|LrCurve|Flowchart|TreeView)\b[^>]*\/>/g;

const lines = [];
let grand = { lessons: 0, chars: 0, diagrams: 0, exercises: 0 };

for (const c of COURSES) {
  const chLines = [];
  let lTotal = 0;
  let chTotal = 0;
  let dTotal = 0;
  let eTotal = 0;

  for (const ch of c.chapters) {
    let chars = 0;
    let diags = 0;
    for (const l of ch.lessons) {
      chars += l.content.length;
      diags += (l.content.match(DIAGRAM_RE) ?? []).length;
      // demos / tips 也算正文配套
      for (const d of l.demos ?? []) chars += d.code.length;
      for (const t of l.tips ?? []) chars += t.text.length;
    }
    const ex = ch.exercises.length;
    lTotal += ch.lessons.length;
    chTotal += chars;
    dTotal += diags;
    eTotal += ex;
    chLines.push({
      id: ch.id,
      title: ch.title,
      lessons: ch.lessons.length,
      chars,
      avgChars: ch.lessons.length ? Math.round(chars / ch.lessons.length) : 0,
      diagrams: diags,
      exercises: ex,
      // 图示覆盖率：有多少比例的知识点带图
      diagramCoverage: ch.lessons.length ? Math.round((diags / ch.lessons.length) * 100) : 0,
    });
  }

  grand.lessons += lTotal;
  grand.chars += chTotal;
  grand.diagrams += dTotal;
  grand.exercises += eTotal;

  lines.push(`\n${'='.repeat(90)}`);
  lines.push(`【${c.title}】 id=${c.id} | ${c.chapters.length} 章 | ${lTotal} 知识点 | ${eTotal} 习题 | 图示 ${dTotal} 个`);
  lines.push(`  正文总字数 ${chTotal}，平均每知识点 ${lTotal ? Math.round(chTotal / lTotal) : 0} 字`);
  lines.push(`${'-'.repeat(90)}`);
  lines.push(`  ${'章节'.padEnd(30)} ${'知识点'.padStart(6)} ${'字数'.padStart(8)} ${'均字'.padStart(7)} ${'图示'.padStart(5)} ${'覆盖率'.padStart(7)} ${'习题'.padStart(5)}`);
  for (const ch of chLines) {
    const t = ch.title.length > 26 ? `${ch.title.slice(0, 26)}…` : ch.title;
    lines.push(
      `  ${t.padEnd(30)} ${String(ch.lessons).padStart(6)} ${String(ch.chars).padStart(8)} ${String(ch.avgChars).padStart(7)} ${String(ch.diagrams).padStart(5)} ${String(ch.diagramCoverage + '%').padStart(7)} ${String(ch.exercises).padStart(5)}`,
    );
  }
}

lines.unshift(`总计：${COURSES.length} 门 / ${grand.lessons} 知识点 / ${grand.chars} 字 / ${grand.diagrams} 图示 / ${grand.exercises} 习题`);

const report = lines.join('\n');
writeFileSync('qa-content-depth.txt', report, 'utf8');
console.log(report);
