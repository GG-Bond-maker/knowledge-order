/**
 * 下载 Pyodide 的额外包（matplotlib 及其依赖）到 public/pyodide/，实现完全离线可用。
 *
 * 从 node_modules/pyodide/pyodide-lock.json 读取文件清单与 sha256，
 * 依次尝试 jsDelivr / npmmirror，校验 sha256 后落盘。
 *
 * 用法：node scripts/download-pyodide-packages.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public', 'pyodide');
mkdirSync(publicDir, { recursive: true });

const lock = JSON.parse(readFileSync(join(root, 'node_modules', 'pyodide', 'pyodide-lock.json'), 'utf8'));
const VERSION = '0.29.5';
const BASES = [
  `https://cdn.jsdelivr.net/pyodide/v${VERSION}/full/`,
  `https://fastly.jsdelivr.net/pyodide/v${VERSION}/full/`,
  `https://npmmirror.com/mirrors/pyodide/v${VERSION}/full/`,
];

/** 目标包及其依赖闭包 */
const TARGETS = ['matplotlib', 'numpy', 'pandas'];

function resolveClosure(names, packages) {
  const seen = new Set();
  const order = [];
  const visit = (n) => {
    if (seen.has(n)) return;
    seen.add(n);
    const pkg = packages[n];
    if (!pkg) {
      console.warn(`  依赖未在 lock 中找到：${n}`);
      return;
    }
    for (const dep of pkg.depends ?? []) visit(dep);
    order.push(n);
  };
  names.forEach(visit);
  return order;
}

const pkgs = lock.packages;
const needed = resolveClosure(TARGETS, pkgs);
console.log('需要下载的包：', needed.join(', '));

async function fetchWithTimeout(url, timeoutMs = 120000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

let ok = 0;
let failed = 0;
for (const name of needed) {
  const pkg = pkgs[name];
  const fileName = pkg.file_name;
  const dest = join(publicDir, fileName);
  if (existsSync(dest)) {
    const existing = readFileSync(dest);
    if (createHash('sha256').update(existing).digest('hex') === pkg.sha256) {
      console.log(`✓ 已存在 ${fileName}`);
      ok += 1;
      continue;
    }
  }
  let saved = false;
  for (const base of BASES) {
    try {
      const buf = await fetchWithTimeout(`${base}${fileName}`);
      const sha = createHash('sha256').update(buf).digest('hex');
      if (sha !== pkg.sha256) {
        console.warn(`  ${base} 校验失败（${sha.slice(0, 12)} ≠ ${pkg.sha256.slice(0, 12)}）`);
        continue;
      }
      writeFileSync(dest, buf);
      console.log(`✓ 下载 ${fileName}（${(buf.length / 1024).toFixed(0)} KB）`);
      ok += 1;
      saved = true;
      break;
    } catch (e) {
      console.warn(`  ${base} 失败：${e.message}`);
    }
  }
  if (!saved) {
    console.error(`✗ 无法下载 ${fileName}`);
    failed += 1;
  }
}

console.log(`\n完成：成功 ${ok}，失败 ${failed}`);
if (failed > 0) {
  console.log('提示：缺失的包会在运行时自动从 CDN 加载（需联网）。');
  process.exitCode = 1;
}
