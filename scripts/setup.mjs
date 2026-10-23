/**
 * 一键初始化脚本
 *
 *   pnpm run setup
 *
 * 依次完成：
 *   1. 检查 Node 版本是否满足 package.json 的 engines
 *   2. 检查包管理器（应为 pnpm）
 *   3. 安装依赖（pnpm install）
 *   4. 准备离线运行时资源（Pyodide + sql.js）
 *   5. 同步课程内容到 content-data/
 *   6. 运行内容体检
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const isWin = process.platform === 'win32';

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const log = {
  step: (n, total, msg) => console.log(`\n${C.cyan}${C.bold}[${n}/${total}]${C.reset} ${C.bold}${msg}${C.reset}`),
  ok: (msg) => console.log(`  ${C.green}✓${C.reset} ${msg}`),
  warn: (msg) => console.log(`  ${C.yellow}!${C.reset} ${msg}`),
  err: (msg) => console.log(`  ${C.red}✗${C.reset} ${msg}`),
  info: (msg) => console.log(`  ${C.dim}${msg}${C.reset}`),
};

function run(cmd) {
  execSync(cmd, { cwd: root, stdio: 'inherit', shell: isWin });
}

function runQuiet(cmd) {
  return execSync(cmd, { cwd: root, encoding: 'utf8', shell: isWin }).trim();
}

const TOTAL = 6;
let hasError = false;

// ────────────────────────────────────────────
log.step(1, TOTAL, '检查 Node 版本');

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const required = pkg.engines?.node ?? '>=20.19.0';
const current = process.versions.node;
const minVer = required.replace(/[>=^~]/g, '').split('.')[0];

if (Number(current.split('.')[0]) < Number(minVer)) {
  log.err(`当前 Node ${current}，要求 ${required}`);
  log.info('建议用 nvm-windows 或 fnm 安装：nvm install 24.10.0 && nvm use 24.10.0');
  hasError = true;
} else {
  log.ok(`Node ${current}（要求 ${required}）`);
}

// ────────────────────────────────────────────
log.step(2, TOTAL, '检查包管理器');

let pmVersion = '';
try {
  pmVersion = runQuiet('pnpm -v');
  log.ok(`pnpm ${pmVersion}（packageManager: ${pkg.packageManager ?? '未声明'}）`);
} catch {
  log.err('未找到 pnpm');
  log.info('安装：npm install -g pnpm');
  hasError = true;
}

if (hasError) {
  console.log(`\n${C.red}${C.bold}初始化中止：请先解决上面的问题。${C.reset}\n`);
  process.exit(1);
}

// ────────────────────────────────────────────
log.step(3, TOTAL, '安装依赖');
try {
  run('pnpm install');
  log.ok('依赖安装完成');
} catch {
  log.err('依赖安装失败');
  process.exit(1);
}

// ────────────────────────────────────────────
log.step(4, TOTAL, '准备离线运行时资源（Pyodide + sql.js）');
const pyodideDir = join(root, 'public', 'pyodide');
const hasRuntime = existsSync(pyodideDir) && existsSync(join(pyodideDir, 'pyodide.mjs'));
if (hasRuntime) {
  log.ok('运行时资源已存在，跳过下载');
} else {
  try {
    run('pnpm run runtime');
    log.ok('运行时资源准备完成');
  } catch {
    log.warn('运行时资源准备失败（离线代码执行将不可用，其余功能正常）');
  }
}

// ────────────────────────────────────────────
log.step(5, TOTAL, '同步课程内容到 content-data/');
try {
  run('node scripts/sync-content.mjs');
  log.ok('内容同步完成');
} catch {
  log.warn('内容同步失败（可手动执行 pnpm run sync）');
}

// ────────────────────────────────────────────
log.step(6, TOTAL, '内容体检');
try {
  run('node scripts/content-audit.mjs');
} catch {
  // content-audit 在发现问题时会返回非零，这里不视为致命错误
  log.warn('内容体检发现问题，请查看上面的输出');
}

// ────────────────────────────────────────────
console.log(`\n${C.green}${C.bold}══ 初始化完成 ══${C.reset}`);
console.log(`
${C.bold}启动开发环境${C.reset}
  ${C.cyan}pnpm run dev:all${C.reset}      同时启动后端(3001) + 前端(5173)
  ${C.cyan}pnpm run server${C.reset}       仅启动内容服务
  ${C.cyan}pnpm run dev${C.reset}          仅启动前端（/api 代理到 3001）

${C.bold}构建与部署${C.reset}
  ${C.cyan}pnpm run build${C.reset}        生产构建到 dist/
  ${C.cyan}pnpm run start${C.reset}        后端托管 dist/ + API

${C.bold}质量检查${C.reset}
  ${C.cyan}pnpm run typecheck${C.reset}    类型检查
  ${C.cyan}pnpm run audit${C.reset}        内容体检
  ${C.cyan}pnpm run format${C.reset}       格式化代码

${C.dim}环境已隔离在项目内的 node_modules/，删除该目录即可完全重置。${C.reset}
`);
