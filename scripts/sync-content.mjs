/**
 * 把内置课程（TypeScript 数据）同步到 content-data/courses/，
 * 使它们纳入后端文件持久化（后台可编辑）。
 *
 * 用法：node scripts/sync-content.mjs
 *
 * 注意：这会覆盖 content-data/courses/ 中同 id 的课程文件。
 * 若你已在后台修改过内置课程，请先在后台「导出」备份。
 */
import { build } from 'esbuild';
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = join(root, '.tmp-sync');
mkdirSync(tmp, { recursive: true });
const outFile = join(tmp, 'content.mjs');

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

const coursesDir = join(root, 'content-data', 'courses');
mkdirSync(coursesDir, { recursive: true });

// 读取既有文件的 createdAt，保留时间戳
function existingCreatedAt(id) {
  const f = join(coursesDir, `${id}.json`);
  if (!existsSync(f)) return null;
  try {
    return JSON.parse(readFileSync(f, 'utf8')).createdAt ?? null;
  } catch {
    return null;
  }
}

let n = 0;
let skipped = 0;
for (const c of COURSES) {
  // 空课程也同步（保留占位，让学科分组与路线图能显示）
  // 但只同步有 seriesId 的骨架课程，避免无意义的空文件
  if (!c.chapters?.length && !c.seriesId) {
    console.log(`跳过 ${c.id}（暂无章节内容且非系列课程）`);
    skipped += 1;
    continue;
  }
  const now = Date.now();
  const course = {
    id: c.id,
    title: c.title,
    subtitle: c.subtitle,
    description: c.description,
    icon: c.icon,
    color: c.color,
    domainId: c.domainId ?? 'data',
    seriesId: c.seriesId,
    prerequisites: c.prerequisites ?? [],
    targetAudience: c.targetAudience,
    estimatedHours: c.estimatedHours,
    source: 'builtin',
    chapters: c.chapters.map((ch, i) => ({
      id: ch.id,
      order: i + 1,
      title: ch.title,
      goal: ch.goal,
      lessons: ch.lessons,
      exercises: ch.exercises,
    })),
    createdAt: existingCreatedAt(c.id) ?? now,
    updatedAt: now,
  };
  writeFileSync(join(coursesDir, `${c.id}.json`), JSON.stringify(course, null, 2), 'utf8');
  const lessons = course.chapters.reduce((s, x) => s + x.lessons.length, 0);
  const exs = course.chapters.reduce((s, x) => s + x.exercises.length, 0);
  console.log(`✓ ${c.id}.json — ${course.chapters.length} 章 / ${lessons} 知识点 / ${exs} 习题`);
  n += 1;
}
console.log(`\n共同步 ${n} 门课程到 content-data/courses/`);
if (skipped) console.log(`跳过 ${skipped} 门空课程`);
