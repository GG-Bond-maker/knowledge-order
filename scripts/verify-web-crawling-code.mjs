import { build } from 'esbuild';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const chapterArg = process.argv.find((arg) => arg.startsWith('--chapter='));
const chapterSuffix = chapterArg?.split('=')[1];
if (chapterSuffix && !/^c\d{2}$/.test(chapterSuffix)) {
  console.error('用法：node scripts/verify-web-crawling-code.mjs [--chapter=c01]');
  process.exit(2);
}

const tmp = join(root, '.tmp-web-crawling-code');
mkdirSync(tmp, { recursive: true });
const bundle = join(tmp, 'content.mjs');

await build({
  entryPoints: [join(root, 'src/content/index.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: bundle,
  logLevel: 'error',
  define: { 'import.meta.env': '{}' },
});

const { COURSES } = await import(`${pathToFileURL(bundle).href}?t=${Date.now()}`);
const course = COURSES.find((item) => item.id === 'web-crawling');
if (!course) {
  console.error('找不到 web-crawling 课程');
  process.exit(1);
}

const cases = [];
for (const chapter of course.chapters) {
  if (chapterSuffix && chapter.id !== `web-crawling-${chapterSuffix}`) continue;
  for (const exercise of chapter.exercises ?? []) {
    if (exercise.type !== 'code' || !exercise.answer || !exercise.tests) continue;
    cases.push({
      id: exercise.id,
      setup: exercise.setupCode ?? '',
      answer: exercise.answer,
      tests: exercise.tests,
    });
  }
}

if (!cases.length) {
  console.error(`没有找到${chapterSuffix ? ` ${chapterSuffix}` : ''} 的可执行编程题`);
  process.exit(1);
}

const casesFile = join(tmp, 'cases.json');
const runnerFile = join(tmp, 'runner.py');
writeFileSync(casesFile, JSON.stringify(cases), 'utf8');
writeFileSync(
  runnerFile,
  `import json
import sys
import traceback

cases = json.load(open(sys.argv[1], encoding="utf-8"))
failures = []
for case in cases:
    namespace = {"__name__": "__exercise__"}
    try:
        if case["setup"]:
            exec(compile(case["setup"], case["id"] + "/setup", "exec"), namespace)
        exec(compile(case["answer"], case["id"] + "/answer", "exec"), namespace)
        exec(compile(case["tests"], case["id"] + "/tests", "exec"), namespace)
    except Exception:
        failures.append({"id": case["id"], "error": traceback.format_exc(limit=3)})

print(json.dumps({"total": len(cases), "failures": failures}, ensure_ascii=False))
`,
  'utf8',
);

const configuredPython = process.env.VERIFY_PYTHON;
const bundledPython =
  'C:\\Users\\HY\\.dsh\\dsh-runtimes\\dsh-primary-runtime\\dependencies\\python\\python.exe';
const python = configuredPython || (process.platform === 'win32' ? 'python' : 'python3');
const result = spawnSync(python, [runnerFile, casesFile], {
  encoding: 'utf8',
  env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
});

if (result.error && !configuredPython) {
  const fallback = spawnSync(bundledPython, [runnerFile, casesFile], {
    encoding: 'utf8',
    env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
  });
  Object.assign(result, fallback);
}

let report;
try {
  report = JSON.parse((result.stdout ?? '').trim());
} catch {
  console.error(result.error ?? result.stderr ?? result.stdout ?? 'Python 执行失败');
  rmSync(tmp, { recursive: true, force: true });
  process.exit(1);
}

for (const failure of report.failures) {
  console.error(`✗ ${failure.id}\n${failure.error}`);
}
console.log(
  `编程题参考解：${report.total - report.failures.length}/${report.total} 通过${
    chapterSuffix ? `（${chapterSuffix}）` : ''
  }`,
);
rmSync(tmp, { recursive: true, force: true });
if (report.failures.length) process.exitCode = 1;
