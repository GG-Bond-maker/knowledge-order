/**
 * 网络爬虫课程专用内容检查器。
 *
 * 用法：
 *   node scripts/check-web-crawling.mjs
 *   node scripts/check-web-crawling.mjs --chapter c01
 */
import { build } from 'esbuild';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  WEB_CRAWLING_CHAPTERS,
  WEB_CRAWLING_COURSE,
  WEB_CRAWLING_DIAGRAM_REGISTRY,
  WEB_CRAWLING_HEADINGS,
} from './web-crawling-spec.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tempDir = join(root, '.tmp-web-crawling-check');
const outFile = join(tempDir, 'content.mjs');
mkdirSync(tempDir, { recursive: true });

await build({
  entryPoints: [join(root, 'src/content/index.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: outFile,
  logLevel: 'error',
  define: { 'import.meta.env': '{}' },
});

const { COURSES } = await import(`${pathToFileURL(outFile).href}?t=${Date.now()}`);
rmSync(tempDir, { recursive: true, force: true });

const failures = [];
const fail = (id, message) => failures.push({ id, message });
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const args = process.argv.slice(2);
const chapterArgIndex = args.indexOf('--chapter');
const requestedChapter = chapterArgIndex >= 0 ? args[chapterArgIndex + 1] : null;
if (chapterArgIndex >= 0 && !requestedChapter) {
  console.error('用法：node scripts/check-web-crawling.mjs [--chapter cNN]');
  process.exit(1);
}

const requestedId = requestedChapter
  ? requestedChapter.startsWith('web-crawling-')
    ? requestedChapter
    : `web-crawling-${requestedChapter}`
  : null;
const selectedSpecs = requestedId
  ? WEB_CRAWLING_CHAPTERS.filter((chapter) => chapter.id === requestedId)
  : WEB_CRAWLING_CHAPTERS;
if (requestedId && selectedSpecs.length === 0) {
  fail(requestedId, '契约中不存在该章节');
}

const course = COURSES.find((item) => item.id === WEB_CRAWLING_COURSE.id);
if (!course) {
  fail(WEB_CRAWLING_COURSE.id, '课程不存在');
} else {
  if (course.domainId !== WEB_CRAWLING_COURSE.domainId) {
    fail(course.id, `domainId 应为 ${WEB_CRAWLING_COURSE.domainId}，实际为 ${course.domainId}`);
  }
  if (course.chapters.length !== WEB_CRAWLING_COURSE.chapterCount) {
    fail(course.id, `应有 ${WEB_CRAWLING_COURSE.chapterCount} 章，实际为 ${course.chapters.length}`);
  }
  if (course.estimatedHours !== WEB_CRAWLING_COURSE.estimatedHours) {
    fail(course.id, `应有 ${WEB_CRAWLING_COURSE.estimatedHours} 小时，实际为 ${course.estimatedHours}`);
  }
  if (course.seriesId) fail(course.id, `不应有 seriesId，实际为 ${course.seriesId}`);
  if (course.title !== WEB_CRAWLING_COURSE.title) {
    fail(course.id, '课程标题与契约不一致');
  }
}

const STANDARD_LIBRARY_ROOTS = new Set([
  '__future__',
  'abc',
  'argparse',
  'array',
  'bisect',
  'calendar',
  'collections',
  'contextlib',
  'copy',
  'csv',
  'dataclasses',
  'datetime',
  'decimal',
  'enum',
  'functools',
  'hashlib',
  'heapq',
  'html',
  'io',
  'ipaddress',
  'itertools',
  'json',
  'logging',
  'math',
  'operator',
  'os',
  'pathlib',
  'pprint',
  'queue',
  'random',
  're',
  'shlex',
  'sqlite3',
  'statistics',
  'string',
  'tempfile',
  'textwrap',
  'threading',
  'time',
  'traceback',
  'types',
  'typing',
  'unittest',
  'urllib',
  'uuid',
  'warnings',
  'xml',
]);
const BLOCKED_PATTERNS = [
  /(?:^|\n)\s*(?:import|from)\s+requests\b/i,
  /\brequests\.(?:get|post|put|patch|delete|head|request|session)\b/i,
  /(?:^|\n)\s*(?:import|from)\s+bs4\b|(?:^|\n)\s*from\s+bs4\b|\bbeautifulsoup\s*\(/i,
  /(?:^|\n)\s*(?:import|from)\s+(?:lxml|scrapy|selenium|playwright)\b/i,
  /\burlopen\s*\(/i,
];

function importedRoots(code) {
  const roots = new Set();
  for (const match of code.matchAll(/^\s*import\s+([A-Za-z_][\w.]*)/gm)) {
    roots.add(match[1].split('.')[0]);
  }
  for (const match of code.matchAll(/^\s*from\s+([A-Za-z_][\w.]*)\s+import\b/gm)) {
    roots.add(match[1].split('.')[0]);
  }
  return [...roots];
}

function checkExecutableCode(id, code) {
  if (!isNonEmptyString(code)) return;
  for (const pattern of BLOCKED_PATTERNS) {
    const match = code.match(pattern);
    if (match) {
      fail(id, `可执行代码含禁用依赖或调用「${match[0]}」`);
    }
  }
  for (const moduleName of importedRoots(code)) {
    if (!STANDARD_LIBRARY_ROOTS.has(moduleName)) {
      fail(id, `可执行代码导入非标准库模块「${moduleName}」`);
    }
  }
}

function countUrls(text) {
  return [...text.matchAll(/https?:\/\/[^\s)\]>]+/g)].length;
}

function extractReferenceSection(content) {
  const heading = WEB_CRAWLING_HEADINGS[12];
  const start = content.indexOf(`## ${heading}`);
  if (start < 0) return '';
  const body = content.slice(start + heading.length + 3);
  const next = body.search(/^##\s+/m);
  return next >= 0 ? body.slice(0, next) : body;
}

function parseDiagramTags(content) {
  const tags = [];
  for (const match of content.matchAll(/<Diagram\b([^>]*)\/>/g)) {
    const attrs = {};
    for (const attr of match[1].matchAll(/(\w+)\s*=\s*"([^"]*)"/g)) attrs[attr[1]] = attr[2];
    tags.push(attrs);
  }
  return tags;
}

const seenIds = new Map();
const registerId = (id, kind) => {
  if (!isNonEmptyString(id)) {
    fail(kind, '存在空 ID');
    return;
  }
  if (seenIds.has(id)) {
    fail(id, `ID 重复：${seenIds.get(id)} 与 ${kind}`);
  } else {
    seenIds.set(id, kind);
  }
};

const tableRows = [];
for (const spec of selectedSpecs) {
  const actual = course?.chapters.find((item) => item.id === spec.id);
  if (!actual) {
    fail(spec.id, '章节缺失');
    tableRows.push({ id: spec.id, title: spec.title, lessons: '0/3', exercises: `0/${spec.exerciseCount}`, diagrams: 0, minChars: 0, ok: false });
    continue;
  }

  registerId(actual.id, 'chapter');
  if (actual.title !== spec.title) fail(actual.id, `章节标题应为「${spec.title}」`);
  if (actual.goal !== spec.goal) fail(actual.id, '章节目标与契约不一致');
  if (actual.lessons.length !== spec.lessons.length) {
    fail(actual.id, `应有 ${spec.lessons.length} 个知识点，实际为 ${actual.lessons.length}`);
  }
  if (actual.exercises.length !== spec.exerciseCount) {
    fail(actual.id, `应有 ${spec.exerciseCount} 道习题，实际为 ${actual.exercises.length}`);
  }

  const lessonIds = new Set(actual.lessons.map((lesson) => lesson.id));
  let diagramCount = 0;
  let minimumChars = Number.POSITIVE_INFINITY;
  actual.lessons.forEach((lesson, index) => {
    registerId(lesson.id, 'lesson');
    const expected = spec.lessons[index];
    if (!expected || lesson.id !== expected.id) {
      fail(lesson.id ?? `${actual.id}-lesson-${index + 1}`, `知识点 ID 应为「${expected?.id ?? '契约未定义'}」`);
      return;
    }
    if (lesson.title !== expected.title) {
      fail(lesson.id, `知识点标题应为「${expected.title}」`);
    }
    if (lesson.difficulty !== expected.difficulty) {
      fail(lesson.id, `难度应为 ${expected.difficulty}，实际为 ${lesson.difficulty}`);
    }
    const content = isNonEmptyString(lesson.content) ? lesson.content : '';
    minimumChars = Math.min(minimumChars, content.length);
    const minimum = expected.difficulty === 4 ? 5000 : 4000;
    if (content.length < minimum) {
      fail(lesson.id, `正文 ${content.length} 字符，低于难度 ${expected.difficulty} 要求的 ${minimum}`);
    }
    for (const heading of WEB_CRAWLING_HEADINGS) {
      if (!new RegExp(`^## ${heading}$`, 'm').test(content)) {
        fail(lesson.id, `缺少二级标题「## ${heading}」`);
      }
    }
    if (!Array.isArray(lesson.tips) || lesson.tips.length < 3) {
      fail(lesson.id, `tips 至少 3 条，实际为 ${lesson.tips?.length ?? 0}`);
    }
    const diagrams = parseDiagramTags(content);
    diagramCount += diagrams.length;
    const hasTable =
      /^\|.+\|\s*$/m.test(content) &&
      /^\|(?:\s*:?-{3,}:?\s*\|)+\s*$/m.test(content);
    if (!diagrams.length && !hasTable) {
      fail(lesson.id, '缺少视觉锚点：至少一个 <Diagram> 或 Markdown 表格');
    }
    if (!/```[\s\S]*?```/.test(content) && !(lesson.demos?.length > 0)) {
      fail(lesson.id, '缺少代码块或 demos');
    }
    for (const diagram of diagrams) {
      const allowedNames = WEB_CRAWLING_DIAGRAM_REGISTRY[diagram.type];
      if (!allowedNames) {
        fail(lesson.id, `未注册的图解类型「${diagram.type ?? ''}」`);
      } else if (!diagram.name) {
        fail(lesson.id, `图解「${diagram.type}」缺少 name`);
      } else if (!allowedNames.includes(diagram.name)) {
        fail(lesson.id, `图解「${diagram.type}」不支持变体「${diagram.name}」`);
      }
    }
    const referenceSection = extractReferenceSection(content);
    if (countUrls(referenceSection) < 2) {
      fail(lesson.id, '参考资料与延伸阅读至少需要 2 个 URL');
    }
    for (const demo of lesson.demos ?? []) {
      registerId(`${lesson.id}-demo`, 'demo');
      checkExecutableCode(`${lesson.id}-demo`, demo.code);
    }
  });

  const exerciseIds = new Set();
  for (const exercise of actual.exercises) {
    registerId(exercise.id, 'exercise');
    if (exerciseIds.has(exercise.id)) fail(exercise.id, '同章习题 ID 重复');
    exerciseIds.add(exercise.id);
    if (!isNonEmptyString(exercise.explanation)) fail(exercise.id, '缺少 explanation');
    if (!isNonEmptyString(exercise.relatedLessonId)) {
      fail(exercise.id, '缺少 relatedLessonId');
    } else if (!lessonIds.has(exercise.relatedLessonId)) {
      fail(exercise.id, `relatedLessonId「${exercise.relatedLessonId}」不属于本章知识点`);
    }
    if (exercise.type === 'sql') fail(exercise.id, '本课程禁止 SQL 题');
    if (exercise.type === 'single') {
      if (!exercise.options?.some((option) => option.value === exercise.answer)) {
        fail(exercise.id, '单选答案不在选项中');
      }
    }
    if (exercise.type === 'multiple') {
      if (!Array.isArray(exercise.answer) || exercise.answer.length === 0) {
        fail(exercise.id, '多选答案为空');
      } else {
        for (const answer of exercise.answer) {
          if (!exercise.options?.some((option) => option.value === answer)) {
            fail(exercise.id, `多选答案「${answer}」不在选项中`);
          }
        }
      }
    }
    if (exercise.type === 'fill') {
      if (!Array.isArray(exercise.blanks) || exercise.blanks.length === 0) {
        fail(exercise.id, '填空缺少 blanks');
      } else if (exercise.blanks.some((blank) => !Array.isArray(blank) || blank.length === 0)) {
        fail(exercise.id, '填空存在空白答案组');
      }
    }
    if (exercise.type === 'code') {
      for (const key of ['starterCode', 'expectedOutput', 'tests', 'answer']) {
        if (!isNonEmptyString(exercise[key])) fail(exercise.id, `代码题缺少 ${key}`);
      }
      for (const key of ['starterCode', 'expectedOutput', 'tests', 'answer', 'setupCode']) {
        checkExecutableCode(exercise.id, exercise[key]);
      }
    }
    if (exercise.type === 'open') {
      if (!isNonEmptyString(exercise.referenceAnswer)) fail(exercise.id, '简答题缺少 referenceAnswer');
      if (!Array.isArray(exercise.rubric) || exercise.rubric.length === 0) {
        fail(exercise.id, '简答题 rubric 不能为空');
      }
    }
  }

  for (const expected of spec.lessons) {
    const count = actual.exercises.filter((item) => item.relatedLessonId === expected.id).length;
    if (count !== expected.exerciseCount) {
      fail(expected.id, `关联习题应为 ${expected.exerciseCount} 道，实际为 ${count}`);
    }
  }

  const chapterFailures = failures.filter(
    (item) => item.id === actual.id || [...lessonIds].includes(item.id) || exerciseIds.has(item.id),
  );
  tableRows.push({
    id: actual.id.replace('web-crawling-', ''),
    title: actual.title,
    lessons: `${actual.lessons.length}/${spec.lessons.length}`,
    exercises: `${actual.exercises.length}/${spec.exerciseCount}`,
    diagrams: diagramCount,
    minChars: Number.isFinite(minimumChars) ? minimumChars : 0,
    ok: chapterFailures.length === 0,
  });
}

const width = (text) =>
  [...String(text)].reduce((sum, char) => sum + (char.charCodeAt(0) > 255 ? 2 : 1), 0);
const pad = (text, target) => String(text) + ' '.repeat(Math.max(0, target - width(text)));

console.log('\n网络爬虫课程检查');
console.log('─'.repeat(82));
console.log(`${pad('章', 7)}${pad('知识点', 10)}${pad('习题', 12)}${pad('图解', 7)}${pad('最短正文', 11)}状态  章节`);
for (const row of tableRows) {
  console.log(
    `${pad(row.id, 7)}${pad(row.lessons, 10)}${pad(row.exercises, 12)}${pad(row.diagrams, 7)}${pad(row.minChars, 11)}${row.ok ? '✓' : '✗'}     ${row.title}`,
  );
}
console.log('─'.repeat(82));

if (failures.length) {
  console.log(`\n发现 ${failures.length} 个问题：`);
  for (const item of failures) console.log(`- ${item.id}: ${item.message}`);
  console.log('');
  process.exitCode = 1;
} else {
  console.log(
    `\n✓ ${selectedSpecs.length} 章 · ${selectedSpecs.reduce((sum, item) => sum + item.lessons.length, 0)} 个知识点 · ${selectedSpecs.reduce((sum, item) => sum + item.exerciseCount, 0)} 道习题全部通过契约检查`,
  );
}
