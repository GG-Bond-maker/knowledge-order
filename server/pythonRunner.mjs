/**
 * Python 执行服务（本地后端）
 *
 * 用途：运行需要 PyTorch / gym / scipy 等重型依赖的代码。
 * 浏览器端的 Pyodide 无法运行这些包，所以交给本地 Python 解释器。
 *
 * 安全说明：
 * - 本服务**仅用于本地个人使用**，不对外暴露
 * - 默认只监听 127.0.0.1
 * - 有超时、输出大小、并发数三重限制
 * - 不提供任意文件系统访问（工作目录限制在临时目录）
 *
 * 执行流程：
 *   1. 检查解释器可用性
 *   2. 写入临时文件
 *   3. spawn 子进程执行（带超时）
 *   4. 收集 stdout / stderr / 生成的图片
 *   5. 清理临时目录
 */

import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/** 执行配置 */
const CONFIG = {
  /** 默认超时（毫秒）。训练类代码需要更久 */
  defaultTimeoutMs: 30_000,
  /** 最大超时（防止请求方传超大值） */
  maxTimeoutMs: 120_000,
  /** stdout / stderr 各自最大字节数（超出截断） */
  maxOutputBytes: 256 * 1024,
  /** 同时执行的最大任务数 */
  maxConcurrent: 2,
  /** 最大图片数（matplotlib 可能生成多张） */
  maxImages: 8,
  /** 单张图片最大字节（base64 前） */
  maxImageBytes: 3 * 1024 * 1024,
};

/** 正在执行的任务数 */
let running = 0;

/** 解释器缓存（避免每次探测） */
let interpreterCache = null;

/**
 * 定位可用的 Python 解释器。
 *
 * 优先级：
 *   1. 环境变量 KNOWLEDGE_ORDER_PYTHON
 *   2. 项目内 .venv-pytorch/Scripts/python.exe
 *   3. 项目内 .venv/Scripts/python.exe
 *   4. 系统 python
 */
export function resolveInterpreter(projectRoot) {
  if (interpreterCache !== null) return interpreterCache;

  const candidates = [];
  if (process.env.KNOWLEDGE_ORDER_PYTHON) {
    candidates.push(process.env.KNOWLEDGE_ORDER_PYTHON);
  }
  if (projectRoot) {
    candidates.push(join(projectRoot, '.venv-pytorch', 'Scripts', 'python.exe'));
    candidates.push(join(projectRoot, '.venv-pytorch', 'bin', 'python'));
    candidates.push(join(projectRoot, '.venv', 'Scripts', 'python.exe'));
    candidates.push(join(projectRoot, '.venv', 'bin', 'python'));
  }
  candidates.push('python');

  for (const c of candidates) {
    if (c === 'python' || existsSync(c)) {
      interpreterCache = c;
      return c;
    }
  }
  interpreterCache = null;
  return null;
}

/** 探测解释器能力（版本 + 关键包） */
export function probeInterpreter(interpreter, timeoutMs = 10_000) {
  return new Promise((resolvePromise) => {
    if (!interpreter) {
      resolvePromise({ ok: false, error: '未找到 Python 解释器' });
      return;
    }

    const script = `
import json, sys
info = {"version": sys.version.split()[0], "executable": sys.executable, "packages": {}}
for name in ["numpy", "scipy", "matplotlib", "torch", "torchvision", "gymnasium", "pandas", "PIL"]:
    try:
        mod = __import__(name)
        info["packages"][name] = getattr(mod, "__version__", "unknown")
    except Exception:
        info["packages"][name] = None
print(json.dumps(info))
`;

    const child = spawn(interpreter, ['-c', script], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: timeoutMs,
      windowsHide: true,
    });

    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { err += d.toString(); });

    child.on('error', (e) => {
      resolvePromise({ ok: false, error: e.message });
    });

    child.on('close', (code) => {
      if (code !== 0) {
        resolvePromise({ ok: false, error: err.slice(0, 500) || `退出码 ${code}` });
        return;
      }
      try {
        const info = JSON.parse(out.trim().split('\n').pop());
        resolvePromise({ ok: true, ...info });
      } catch (e) {
        resolvePromise({ ok: false, error: `解析失败: ${e.message}` });
      }
    });
  });
}

/**
 * 执行 Python 代码。
 *
 * @param {string} interpreter 解释器路径
 * @param {string} code        用户代码
 * @param {object} options     { timeoutMs, setupCode, workDir }
 * @returns {Promise<{ok, stdout, stderr, images, error, durationMs}>}
 */
export async function runPython(interpreter, code, options = {}) {
  const timeoutMs = Math.min(
    options.timeoutMs ?? CONFIG.defaultTimeoutMs,
    CONFIG.maxTimeoutMs,
  );

  if (!interpreter) {
    return { ok: false, error: '未找到 Python 解释器，请先创建 .venv-pytorch 并安装依赖', stdout: '', stderr: '', images: [], durationMs: 0 };
  }

  if (running >= CONFIG.maxConcurrent) {
    return { ok: false, error: `并发任务已达上限（${CONFIG.maxConcurrent}），请稍后再试`, stdout: '', stderr: '', images: [], durationMs: 0 };
  }

  running += 1;
  const startedAt = Date.now();
  let workDir = null;

  try {
    workDir = mkdtempSync(join(tmpdir(), 'ko-pyrun-'));

    // torch 的 dynamo/inductor 需要可写缓存目录。
    // 沙箱下系统临时目录可能不可写，退回到项目内的固定目录。
    let torchCacheDir;
    try {
      torchCacheDir = join(process.cwd(), '.cache-torch');
      mkdirSync(torchCacheDir, { recursive: true });
    } catch {
      torchCacheDir = workDir;
    }

    // matplotlib 使用非交互后端（可选：未安装时不影响其他代码）
    const header = [
      'import os',
      'try:',
      '    import matplotlib',
      "    matplotlib.use('Agg')",
      'except ImportError:',
      '    pass',
      `os.chdir(${JSON.stringify(workDir)})`,
    ].join('\n');

    const setup = options.setupCode ? `\n${options.setupCode}\n` : '\n';
    const scriptPath = join(workDir, 'main.py');
    writeFileSync(scriptPath, `${header}\n${setup}${code}\n`, 'utf8');

    const result = await new Promise((resolvePromise) => {
      const child = spawn(interpreter, [scriptPath], {
        cwd: workDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
        env: {
          ...process.env,
          MPLBACKEND: 'Agg',
          PYTHONIOENCODING: 'utf-8',
          // torch 2.14 的 _dynamo 在导入时解析缓存目录，
          // 若默认临时目录不可写/被清理会导致 torch.optim 初始化失败。
          // 显式指向本次任务的工作目录，确保可写且随任务清理。
          // 注意：workDir 在部分沙箱环境下不可写（torch._dynamo 建缓存会失败），
          // 因此 torch/triton 缓存指向项目内可写目录；TMPDIR 仍指向 workDir
          // 以保证用户脚本产生的临时文件随任务清理。
          TORCHINDUCTOR_CACHE_DIR: torchCacheDir,
          TRITON_CACHE_DIR: torchCacheDir,
          TMPDIR: workDir,
          TEMP: workDir,
          TMP: workDir,
        },
      });

      let stdout = '';
      let stderr = '';
      let stdoutTruncated = false;
      let stderrTruncated = false;
      let killedByTimeout = false;

      const timer = setTimeout(() => {
        killedByTimeout = true;
        try { child.kill('SIGKILL'); } catch { /* ignore */ }
      }, timeoutMs);

      child.stdout.on('data', (chunk) => {
        if (stdout.length >= CONFIG.maxOutputBytes) { stdoutTruncated = true; return; }
        stdout += chunk.toString('utf8');
      });
      child.stderr.on('data', (chunk) => {
        if (stderr.length >= CONFIG.maxOutputBytes) { stderrTruncated = true; return; }
        stderr += chunk.toString('utf8');
      });

      child.on('error', (e) => {
        clearTimeout(timer);
        resolvePromise({ ok: false, stdout, stderr, error: e.message, killedByTimeout });
      });

      child.on('close', (exitCode) => {
        clearTimeout(timer);
        if (killedByTimeout) {
          resolvePromise({
            ok: false,
            stdout: stdout.slice(0, CONFIG.maxOutputBytes),
            stderr,
            error: `执行超时（${timeoutMs}ms），进程已终止`,
            killedByTimeout: true,
          });
          return;
        }
        resolvePromise({
          ok: exitCode === 0,
          stdout: stdout.slice(0, CONFIG.maxOutputBytes),
          stderr: stderr.slice(0, CONFIG.maxOutputBytes),
          error: exitCode === 0 ? null : `退出码 ${exitCode}`,
          stdoutTruncated,
          stderrTruncated,
        });
      });
    });

    // 收集 matplotlib 生成的图片
    const images = [];
    try {
      const files = readdirSync(workDir).filter((f) => /\.(png|jpg|jpeg|svg)$/i.test(f)).sort();
      for (const f of files.slice(0, CONFIG.maxImages)) {
        const buf = readFileSync(join(workDir, f));
        if (buf.length > CONFIG.maxImageBytes) continue;
        const ext = f.split('.').pop().toLowerCase();
        const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
        images.push({ name: f, dataUrl: `data:${mime};base64,${buf.toString('base64')}` });
      }
    } catch { /* 无图片 */ }

    return {
      ...result,
      images,
      durationMs: Date.now() - startedAt,
    };
  } catch (e) {
    return {
      ok: false,
      stdout: '',
      stderr: '',
      images: [],
      error: e instanceof Error ? e.message : String(e),
      durationMs: Date.now() - startedAt,
    };
  } finally {
    running -= 1;
    if (workDir) {
      try { rmSync(workDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  }
}

/** 当前并发状态（供健康检查用） */
export function getRunnerStatus() {
  return { running, maxConcurrent: CONFIG.maxConcurrent };
}
