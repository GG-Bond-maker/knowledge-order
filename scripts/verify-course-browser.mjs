/**
 * 编程题判分校验（稳健版）：
 *
 * 只有两种可验证的情况：
 *   A. 题目提供了 answer 字段（约定为"完整可运行代码"，含数据准备）→ 直接执行 answer + tests；
 *   B. 题目没有 answer，但 starterCode 不含 `___`（如 viz 的 `fig, ax = None, None` 占位）
 *      且 explanation 有代码块 → 用 explanation 第一块作为解法。
 *
 * 其余情况（explanation 只是片段）标记为 skipped，不判失败。
 * 重点：确保"有完整参考解法的题目"都能被真实判分器判为通过。
 *
 * 用法：node scripts/verify-course-browser.mjs <courseId> [baseUrl]
 */
import { chromium } from 'playwright-core';
import { build } from 'esbuild';
import { mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const courseId = process.argv[2] || 'viz';
const base = process.argv[3] || 'http://127.0.0.1:5175';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = join(root, '.tmp-verify-course');
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

const course = COURSES.find((c) => c.id === courseId);
if (!course) {
  console.error(`未找到课程 ${courseId}`);
  process.exit(1);
}
const codeExercises = [];
for (const ch of course.chapters) for (const e of ch.exercises) if (e.type === 'code') codeExercises.push(e);
console.log(`课程「${course.title}」共有 ${codeExercises.length} 道编程题`);

const cases = [];
let skipped = 0;
for (const e of codeExercises) {
  const hasAnswer = typeof e.answer === 'string' && e.answer.trim().length > 0;
  const starter = e.starterCode ?? '';
  const blocks = [...(e.explanation ?? '').matchAll(/```python\s*\n([\s\S]*?)```/g)].map((m) => m[1]);

  let code = null;
  /** 候选代码列表：依次尝试，任一通过即视为通过 */
  const variants = [];
  if (hasAnswer) {
    let ans = e.answer;

    // 若 tests 引用 out，而 answer 最后一行是赋值，则追加该变量作为表达式
    if (/\bout\b/.test(e.tests)) {
      const lastLine = ans.split('\n').filter((l) => l.trim()).pop() ?? '';
      const isExpr = !/=/.test(lastLine) && /^[A-Za-z_][\w.\[\]()'"\s]*$/.test(lastLine.trim());
      if (!isExpr) {
        const m = lastLine.match(/^(\s*)([A-Za-z_]\w*)\s*=/);
        if (m) ans = `${ans}\n${m[2]}`;
      }
    }

    // 候选 1：answer 作为完整代码
    variants.push(ans);

    // 候选 2：starter 环境（不含 ___ 的行）+ answer
    // 注意：即使 answer 里含 def，也可能依赖 starter 中的数据（如 viz/pandas 的题），
    // 所以这里不做 ansDefinesFunc 过滤——两种拼法都试，任一通过即算通过。
    const starterDataLines = starter
      .split('\n')
      .filter((l) => {
        const tt = l.trim();
        if (!tt || tt.startsWith('#')) return false;
        if (tt.includes('___')) return false;
        return true;
      })
      .join('\n');
    if (starterDataLines.trim()) {
      variants.push(`${starterDataLines}\n${ans}`);
    }

    code = variants[0];
  } else if (!starter.includes('___') && blocks.length) {
    // viz 风格：starterCode 是数据 + 占位赋值，答案在 explanation
    code = `${starter.replace(/^\s*(fig|ax|axes)\s*=\s*None.*$/gm, '')}\n${blocks[0]}`;
    variants.push(code);
  }

  if (!code) {
    skipped += 1;
    continue;
  }
  cases.push({ id: e.id, code, variants, tests: e.tests, setup: e.setupCode ?? '' });
}

console.log(`可验证 ${cases.length} 道（${skipped} 道因参考解法为片段而跳过静态校验）`);

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
});
const page = await browser.newPage();
await page.goto(`${base}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });

const results = await page.evaluate(async ({ cases }) => {
  const mod = await import('/src/engine/pyodideRunner.ts');
  try {
    await mod.preloadPython();
  } catch (e) {
    return [{ id: 'preload', passed: false, error: String(e).slice(0, 400) }];
  }
  const out = [];
  for (const c of cases) {
    const variants = c.variants && c.variants.length ? c.variants : [c.code];
    let last = null;
    let ok = false;
    // 判断是否需要走本地后端（torch / gym 等 Pyodide 不支持的包）
    const probe = `${c.setup ?? ''}\n${c.code ?? ''}\n${c.tests ?? ''}`;
    const needsBackend = /(?:^|\n)\s*(?:import|from)\s+(torch|torchvision|torchaudio|gym|gymnasium|transformers|tensorflow)\b/.test(probe);

    for (const code of variants) {
      try {
        if (needsBackend) {
          // 本地后端判分：setup + code + tests 一起执行，退出码 0 即通过
          const script = [c.setup ?? '', code, c.tests ?? ''].filter(Boolean).join('\n\n');
          const res = await fetch('http://127.0.0.1:3001/api/python/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: script, timeoutMs: 60000 }),
          });
          const data = await res.json();
          last = { passed: data.ok, error: data.ok ? null : (data.stderr || data.error || '').slice(0, 400) };
          if (data.ok) { ok = true; break; }
        } else {
          const r = await mod.judgePython(code, c.tests, { setupCode: c.setup });
          last = r;
          if (r.passed) {
            ok = true;
            break;
          }
        }
      } catch (e) {
        last = { passed: false, error: String(e).slice(0, 300) };
      }
    }
    out.push({ id: c.id, passed: ok, error: last?.error ?? null, details: last?.details });
  }
  return out;
}, { cases });

await browser.close();

const pass = results.filter((r) => r.passed);
console.log(`判分验证：${pass.length}/${results.length} 通过`);
results
  .filter((r) => !r.passed)
  .forEach((r) => {
    const failedDetail = (r.details ?? []).find((d) => !d.passed);
    console.log(`  ✗ ${r.id}: ${(r.error ?? failedDetail?.actual ?? '未知错误').toString().slice(0, 200)}`);
  });
process.exitCode = pass.length === results.length ? 0 : 1;
