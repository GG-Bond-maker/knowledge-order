/**
 * 一键启动：内容服务（3001）+ Vite 开发服务器（5173）。
 * 用法：node scripts/dev-all.mjs
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const isWin = process.platform === 'win32';

function run(name, cmd, args, color) {
  const p = spawn(cmd, args, {
    cwd: root,
    shell: isWin,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });
  const prefix = `\x1b[${color}m[${name}]\x1b[0m `;
  p.stdout.on('data', (d) => process.stdout.write(prefix + d.toString()));
  p.stderr.on('data', (d) => process.stderr.write(prefix + d.toString()));
  p.on('exit', (code) => console.log(`${prefix}退出，代码 ${code}`));
  return p;
}

console.log('启动内容服务与前端开发服务器…');
const server = run('server', 'node', ['server/index.mjs'], '36');
const vite = run('vite', 'node', ['node_modules/vite/bin/vite.js', '--configLoader', 'native'], '35');

const shutdown = () => {
  server.kill();
  vite.kill();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
