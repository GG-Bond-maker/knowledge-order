/**
 * SQL 题判分可行性自检。
 *
 * 在真实 SQLite 上执行每道题的 referenceSql，确认：
 * 1. SQL 语法正确、能返回结果集；
 * 2. 若结果为空，题面是否已声明"可为空"（避免用户答对却被判错）。
 *
 * 说明：编程题的判分校验在浏览器端完成（Pyodide 环境与线上一致），
 * 见 scripts/verify-viz-browser.mjs 与 `npm run e2e`。
 *
 * 用法：node scripts/verify-judging.mjs
 */
import { build } from 'esbuild';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = join(root, '.tmp-verify');
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

const datasetsText = readFileSync(join(root, 'src/engine/datasets.ts'), 'utf8');
const initSql = datasetsText.match(/export const RETAIL_INIT_SQL = `([\s\S]*?)`;/)[1];

const sqlExercises = [];
for (const c of COURSES) {
  for (const ch of c.chapters) {
    for (const e of ch.exercises) if (e.type === 'sql') sqlExercises.push(e);
  }
}

const casesFile = join(tmp, 'sql_cases.json');
writeFileSync(
  casesFile,
  JSON.stringify(
    {
      init: initSql,
      cases: sqlExercises.map((e) => ({
        id: e.id,
        sql: e.referenceSql,
        allowEmpty: /为空|空结果|可能为空|返回空/.test(e.question + (e.explanation ?? '')),
      })),
    },
    null,
    2,
  ),
  'utf8',
);

const py = join(tmp, 'check_sql.py');
writeFileSync(
  py,
  `import json, sqlite3, sys
data = json.load(open(sys.argv[1], encoding='utf-8'))
fails = []
empty_ok = 0
for case in data['cases']:
    con = sqlite3.connect(':memory:')
    try:
        con.executescript(data['init'])
        cur = con.execute(case['sql'])
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description] if cur.description else []
        if not cols:
            fails.append([case['id'], '没有返回结果集'])
        elif len(rows) == 0:
            if case['allowEmpty']:
                empty_ok += 1
            else:
                fails.append([case['id'], '结果集为空且题干未声明可空'])
    except Exception as e:
        fails.append([case['id'], f'{type(e).__name__}: {e}'])
    finally:
        con.close()
print(json.dumps({'total': len(data['cases']), 'fails': fails, 'emptyOk': empty_ok}, ensure_ascii=False))
`,
  'utf8',
);

const python =
  process.env.VERIFY_PYTHON || 'C:\\Users\\HY\\.dsh\\dsh-runtimes\\dsh-primary-runtime\\dependencies\\python\\python.exe';
const out = await new Promise((resolve) => {
  const p = spawn(python, [py, casesFile], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
  });
  let o = '';
  let e = '';
  p.stdout.on('data', (d) => (o += d));
  p.stderr.on('data', (d) => (e += d));
  p.on('close', () => resolve({ o, e }));
});

let parsed;
try {
  parsed = JSON.parse(out.o.trim());
} catch {
  console.error('SQL 自检失败：', out.o.slice(0, 500), out.e.slice(0, 800));
  rmSync(tmp, { recursive: true, force: true });
  process.exit(1);
}

console.log(
  `SQL 参考查询：${parsed.total - parsed.fails.length}/${parsed.total} 通过（其中 ${parsed.emptyOk} 题为设计上的空结果）`,
);
parsed.fails.forEach(([id, msg]) => console.log(`  ✗ ${id}: ${msg}`));

rmSync(tmp, { recursive: true, force: true });
if (parsed.fails.length) process.exitCode = 1;
