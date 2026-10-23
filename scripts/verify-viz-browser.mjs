/**
 * 在真实浏览器（Pyodide + matplotlib）中校验可视化课程的编程题。
 * 做法：执行 starterCode 的数据准备部分（去掉占位/输出行）→ 执行参考解法 answer → 执行 tests。
 */
import { chromium } from 'playwright-core';
import { build } from 'esbuild';
import { mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = join(root, '.tmp-viz');
mkdirSync(tmp, { recursive: true });
const outFile = join(tmp, 'content.mjs');
await build({ entryPoints: [join(root, 'src/content/index.ts')], bundle: true, format: 'esm', platform: 'node', outfile: outFile, logLevel: 'error' });
const { COURSES } = await import(pathToFileURL(outFile).href);
rmSync(tmp, { recursive: true, force: true });

const vizCourse = COURSES.find((c) => c.id === 'viz');
const codeExercises = [];
for (const ch of vizCourse.chapters) for (const e of ch.exercises) if (e.type === 'code') codeExercises.push(e);

/** 提取数据准备：保留 import 与赋值语句，丢弃占位、纯输出行 */
function dataPrep(starter) {
  const out = [];
  for (const line of starter.split('\n')) {
    const s = line.trim();
    if (!s) continue;
    if (s.startsWith('#')) continue;
    if (s.includes('___')) continue;
    if (/^(fig|ax|axes)\s*=/.test(s)) continue; // 占位赋值如 fig, axes = None, None
    if (/^print\(/.test(s)) continue;
    if (/^[A-Za-z_][\w.\[\]"' ]*$/.test(s)) continue; // 裸表达式
    out.push(line);
  }
  return out.join('\n');
}

/** 判分器的真实做法：把 starterCode 的占位（___ 或 xxx = None）替换成参考解法 */
function buildUserCode(starter, answer) {
  if (!answer) return starter;
  // 若 starter 的"最后一行表达式 + 占位赋值"结构简单，直接用 answer 覆盖占位区域
  const lines = starter.split('\n');
  const keep = lines.filter((l) => {
    const s = l.trim();
    if (!s || s.startsWith('#')) return true;
    if (s.includes('___')) return false;
    if (/^(fig|ax|axes)\s*=\s*None/.test(s)) return false;
    if (/^[A-Za-z_]\w*\s*=\s*None\s*$/.test(s)) return false;
    return true;
  });
  return `${keep.join('\n')}\n${answer}`;
}

const base = process.argv[2] || 'http://127.0.0.1:5175';
const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
});
const page = await browser.newPage();
await page.goto(`${base}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });

const cases = codeExercises.map((e) => ({
  id: e.id,
  prep: '',
  answer: buildUserCode(e.starterCode, e.answer ?? ''),
  tests: e.tests,
}));

console.log(`共 ${cases.length} 道可视化编程题，开始加载 Pyodide…`);
const results = await page.evaluate(async ({ cases }) => {
  const mod = await import('/src/engine/pyodideRunner.ts');
  try {
    await mod.preloadPython();
  } catch (e) {
    return [{ id: 'preload', ok: false, err: String(e).slice(0, 400) }];
  }
  const py = await mod.getPyodide();
  const out = [];
  for (const c of cases) {
    const code = `
import io, contextlib, json as _json, ast as _ast
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
ns = {"__name__": "__main__"}
_buf = io.StringIO()
try:
    with contextlib.redirect_stdout(_buf):
        _src = ${JSON.stringify(c.answer)}
        _tree = _ast.parse(_src)
        _body = _tree.body
        _last = None
        if _body and isinstance(_body[-1], _ast.Expr):
            _last = _body[-1]
            _body = _body[:-1]
        exec(compile(_ast.Module(body=_body, type_ignores=[]), "<user>", "exec"), ns)
        ns["out"] = eval(compile(_ast.Expression(_last.value), "<user>", "eval"), ns) if _last is not None else None
        exec(${JSON.stringify(c.tests)}, ns)
    plt.close("all")
    _r = {"ok": True, "err": None}
except Exception as e:
    plt.close("all")
    _r = {"ok": False, "err": type(e).__name__ + ": " + str(e)[:300]}
_json.dumps(_r)
`;
    try {
      const raw = await py.runPythonAsync(code);
      const parsed = JSON.parse(raw);
      out.push({ id: c.id, ok: parsed.ok, err: parsed.err });
    } catch (e) {
      out.push({ id: c.id, ok: false, err: String(e).slice(0, 300) });
    }
  }
  return out;
}, { cases });

await browser.close();

const pass = results.filter((r) => r.ok);
console.log(`可视化编程题：${pass.length}/${results.length} 通过（真实 Pyodide + matplotlib）`);
results.filter((r) => !r.ok).forEach((r) => console.log(`  ✗ ${r.id}: ${r.err}`));
process.exitCode = pass.length === results.length ? 0 : 1;
