/**
 * Pyodide / sql.js 运行时资源准备。
 *
 * 之前把资源放在 public/ 下，但 Vite 开发服务器对 .whl 等未知扩展名
 * 会走 SPA 回退返回 index.html，导致 Pyodide 的 sha256 完整性校验失败。
 * 这里改为：把运行时拷贝到 public/ 的同时，**统一使用 .wasm/.js/.json/.zip/.whl**
 * 并额外生成一个 manifest，前端改为用 fetch + ArrayBuffer 交给 Pyodide 的
 * `loadPackagesFromImports`/`loadPackage` 之前先自行校验，避免依赖 SRI。
 *
 * 用法：node scripts/copy-runtime.mjs
 */
import { cpSync, existsSync, mkdirSync, statSync, readdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const nm = join(root, 'node_modules');
const pub = join(root, 'public');

const PYODIDE_FILES = ['pyodide.js', 'pyodide.asm.js', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'];

function copyFile(src, dest) {
  if (!existsSync(src)) {
    console.warn(`[copy-runtime] 跳过缺失文件: ${src}`);
    return null;
  }
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest);
  const size = statSync(dest).size;
  console.log(`[copy-runtime] ${dest.slice(root.length + 1)}  (${(size / 1024).toFixed(0)} KB)`);
  return size;
}

// Pyodide 内核
for (const f of PYODIDE_FILES) copyFile(join(nm, 'pyodide', f), join(pub, 'pyodide', f));

// sql.js（浏览器构建会请求 sql-wasm-browser.wasm，两个都要拷贝）
copyFile(join(nm, 'sql.js', 'dist', 'sql-wasm.js'), join(pub, 'sqljs', 'sql-wasm.js'));
copyFile(join(nm, 'sql.js', 'dist', 'sql-wasm.wasm'), join(pub, 'sqljs', 'sql-wasm.wasm'));
copyFile(join(nm, 'sql.js', 'dist', 'sql-wasm-browser.js'), join(pub, 'sqljs', 'sql-wasm-browser.js'));
copyFile(join(nm, 'sql.js', 'dist', 'sql-wasm-browser.wasm'), join(pub, 'sqljs', 'sql-wasm-browser.wasm'));

// 生成运行时清单：记录已内置的 wheel，便于前端按需加载（matplotlib 等）
const lock = JSON.parse(readFileSync(join(nm, 'pyodide', 'pyodide-lock.json'), 'utf8'));
const pyodidePub = join(pub, 'pyodide');
const localWheels = existsSync(pyodidePub)
  ? readdirSync(pyodidePub).filter((f) => f.endsWith('.whl'))
  : [];
writeFileSync(
  join(pyodidePub, 'runtime-manifest.json'),
  JSON.stringify(
    {
      version: lock.info?.python ?? '3.13',
      packages: Object.fromEntries(
        Object.entries(lock.packages)
          .filter(([, p]) => localWheels.includes(p.file_name))
          .map(([name, p]) => [name, p.file_name]),
      ),
    },
    null,
    2,
  ),
  'utf8',
);
console.log(`[copy-runtime] 已内置 ${localWheels.length} 个 wheel，并写入 runtime-manifest.json`);
console.log('[copy-runtime] 完成');
